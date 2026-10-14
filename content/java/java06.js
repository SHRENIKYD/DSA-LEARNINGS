(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared little helpers for the visualizers ---------------- */
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function esc(s) { return H.esc(String(s)); }
  function out(lines) {
    return { type: 'text', label: 'Console output', html: lines && lines.length ? '<code>' + lines.map(esc).join('<br>') + '</code>' : '<span class="c-m">(nothing printed yet)</span>' };
  }
  function note(html, label) { return { type: 'text', label: label || 'What is going on', html: html }; }
  /* step = { l: line | [lines], cls, v: {vars}, hv, st: [stack], o: [console lines], extra: [parts], narr } */
  function codeFrames(code, steps, label) {
    return steps.map(function (s) {
      var hl = {};
      [].concat(s.l === undefined ? [] : s.l).forEach(function (n) { hl[n] = s.cls || 'cur'; });
      var parts = [{ type: 'code', label: label || 'Code (highlighted line = running now)', lang: 'java', code: code, hl: hl }];
      if (s.v) parts.push({ type: 'vars', label: s.vl || 'Variables', vals: s.v, hl: s.hv || {} });
      if (s.st) parts.push({ type: 'stack', label: 'Call stack (top = running now)', items: s.st.slice(), hl: s.sh || one(s.st.length - 1, 'cur') });
      if (s.o !== undefined) parts.push(out(s.o));
      (s.extra || []).forEach(function (p) { parts.push(p); });
      return { narr: s.narr, parts: parts };
    });
  }

  /* ======================================================================
     TOPIC 1 — The exception family tree; checked vs unchecked
     ====================================================================== */
  var FAMILY = {
    Throwable: { p: null, x: 50, y: 5 },
    Error: { p: 'Throwable', x: 24, y: 18 },
    Exception: { p: 'Throwable', x: 72, y: 18 },
    VirtualMachineError: { p: 'Error', x: 14, y: 31 },
    AssertionError: { p: 'Error', x: 39.5, y: 31 },
    RuntimeException: { p: 'Exception', x: 63, y: 31 },
    IOException: { p: 'Exception', x: 89, y: 31 },
    OutOfMemoryError: { p: 'VirtualMachineError', x: 13, y: 44 },
    NullPointerException: { p: 'RuntimeException', x: 47, y: 44 },
    FileNotFoundException: { p: 'IOException', x: 84, y: 44 },
    StackOverflowError: { p: 'VirtualMachineError', x: 15, y: 57 },
    IllegalArgumentException: { p: 'RuntimeException', x: 51, y: 57 },
    NumberFormatException: { p: 'IllegalArgumentException', x: 51, y: 70 }
  };
  function familyGraph(hl, ehl) {
    var nodes = [], edges = [];
    Object.keys(FAMILY).forEach(function (k) {
      nodes.push({ id: k, label: k, x: FAMILY[k].x, y: FAMILY[k].y, shape: 'box' });
      if (FAMILY[k].p) edges.push([k, FAMILY[k].p]);
    });
    return { type: 'graph', label: 'extends (arrow points to the parent class)', directed: true, height: 76, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {} };
  }

  topics.push({
    title: 'The Exception Family Tree: Throwable, Error, Exception — Checked vs Unchecked',
    analogy: `<p>Think of the problems that can happen on a <b>road trip in a rental car</b>.</p>
<ul>
<li><b>Error</b> — the engine catches fire. There is nothing sensible you can do on the roadside; the trip is over. (In Java: <code>OutOfMemoryError</code>, <code>StackOverflowError</code>.)</li>
<li><b>Checked exception</b> — things the rental company <i>knows</i> can happen to any careful driver: "the mountain pass may be closed by snow". Before they hand you the keys they make you <b>sign a form</b> saying you have a plan B. The Java compiler is that rental clerk: it will not let your code compile until you either handle the problem or write it on the form (<code>throws</code>). (In Java: <code>IOException</code>, <code>SQLException</code>, <code>InterruptedException</code>.)</li>
<li><b>Unchecked exception</b> — <b>driver mistakes</b>: you forgot to fill fuel, you took a wrong turn. Nobody makes you sign a form for these; the fix is to <b>drive better</b> (fix the bug). (In Java: <code>NullPointerException</code>, <code>IllegalArgumentException</code>, <code>ArrayIndexOutOfBoundsException</code>.)</li>
</ul>`,
    explain: `<p>An <b>exception</b> is an <b>object</b> that describes something that went wrong. When Java hits a problem it <b>throws</b> that object: normal execution stops, and the object travels back up through the methods that were called, until some code <b>catches</b> it. If nobody catches it, the thread dies and you see a stack trace.</p>
<h4>1. The family tree</h4>
<p>Everything you can <code>throw</code> must extend <code>java.lang.Throwable</code>. It has exactly two children, and the split matters:</p>
${H.table(['Branch', 'Meaning', 'Should you catch it?', 'Examples'], [
  ['<b>Error</b>', 'The JVM itself is in trouble', H.c('r', 'Almost never'), '<code>OutOfMemoryError</code>, <code>StackOverflowError</code>, <code>NoClassDefFoundError</code>, <code>ExceptionInInitializerError</code>'],
  ['<b>Exception</b> (not Runtime)', 'A problem outside your control that a careful program should plan for', H.c('g', 'Yes — or declare it'), '<code>IOException</code>, <code>FileNotFoundException</code>, <code>SQLException</code>, <code>InterruptedException</code>, <code>TimeoutException</code>'],
  ['<b>RuntimeException</b>', 'A programming mistake or broken rule', 'Usually no — fix the bug; catch only at a boundary', '<code>NullPointerException</code>, <code>IllegalArgumentException</code>, <code>IllegalStateException</code>, <code>ArithmeticException</code>, <code>ClassCastException</code>, <code>IndexOutOfBoundsException</code>']
])}
<h4>2. Checked vs unchecked — one simple rule</h4>
<p><b>Unchecked</b> = <code>RuntimeException</code> and its children, plus <code>Error</code> and its children. <b>Checked</b> = <b>everything else</b> that extends <code>Throwable</code>. "Checked" means the <b>compiler checks</b> that you dealt with it. That is the whole difference — at run time the JVM treats all of them the same.</p>
<h4>3. The "handle or declare" rule</h4>
<p>If code inside a method can throw a checked exception, the compiler insists you do <b>one</b> of two things:</p>
<ol>
<li><b>Handle it</b> — wrap it in <code>try { … } catch (IOException e) { … }</code>, or</li>
<li><b>Declare it</b> — add <code>throws IOException</code> to the method signature, which passes the duty to your caller.</li>
</ol>
<p>Forget both and you get the famous compile error <code>unreported exception java.io.IOException; must be caught or declared to be thrown</code>.</p>
<h4>4. throw vs throws — two different words</h4>
${H.table(['Keyword', 'Where', 'What it does'], [['<code>throw</code>', 'inside a method body', 'Actually throws one exception object right now: <code>throw new IllegalArgumentException("age &lt; 0");</code>'], ['<code>throws</code>', 'in the method signature', 'A promise/warning: "calling me may throw these": <code>void load() throws IOException</code>']])}
<h4>5. Which kind should YOUR code throw?</h4>
<ul>
<li>The <b>caller made a mistake</b> (null argument, negative size, calling <code>next()</code> on an empty iterator) → <b>unchecked</b> (<code>IllegalArgumentException</code>, <code>IllegalStateException</code>, <code>NoSuchElementException</code>).</li>
<li>Something <b>outside the program</b> failed and a reasonable caller can <b>recover</b> (retry, ask the user for another file) → <b>checked</b> is acceptable.</li>
<li>Most modern libraries and frameworks (Spring, Hibernate, Kotlin-friendly APIs) lean towards <b>unchecked</b>, because checked exceptions do not play well with lambdas and streams. You will see this trade-off in interviews.</li>
</ul>`,
    clues: [
      '"What is the difference between checked and unchecked exceptions?" — the answer is the compiler\'s handle-or-declare rule',
      '"Should you catch OutOfMemoryError / Throwable?" → Error branch, almost never',
      'Compile error text <code>unreported exception … must be caught or declared to be thrown</code> → checked exception not handled',
      '"Difference between throw and throws" → statement vs method-signature declaration',
      '"Overriding method throws a broader exception — does it compile?" → checked exceptions can only narrow in overrides',
      '"Design an API: what should happen if the argument is invalid?" → unchecked IllegalArgumentException, fail fast',
      'Lambda inside <code>stream().map(...)</code> calls a method that throws IOException → checked exceptions fight with functional interfaces'
    ],
    code: [`
import java.nio.file.*;

class ExceptionBasics {
    // CHECKED: the compiler forces every caller to handle or declare IOException.
    static String firstLine(Path p) throws IOException {          // "throws" = warning label
        try (BufferedReader r = Files.newBufferedReader(p)) {
            return r.readLine();
        }
    }

    // UNCHECKED: a guard against a caller's bug. Nobody is forced to catch it.
    static int percent(int part, int total) {
        if (total <= 0) {
            throw new IllegalArgumentException("total must be > 0, was " + total); // "throw" = do it now
        }
        return part * 100 / total;
    }

    public static void main(String[] args) {
        try {
            System.out.println(firstLine(Path.of("does-not-exist.txt")));
        } catch (NoSuchFileException e) {          // most specific first
            System.out.println("No such file: " + e.getFile());
        } catch (IOException e) {                  // then the general one
            System.out.println("Other I/O problem: " + e);
        }
        System.out.println(percent(1, 4));          // 25
        System.out.println(percent(1, 0));          // throws -> stack trace, program ends
    }
}`],
    codeTitle: ['Checked vs unchecked in one program'],
    viz: {
      title: 'Walk up the family tree: is it checked?',
      input: 'FileNotFoundException',
      inputLabel: 'Exception class (e.g. NumberFormatException, StackOverflowError, IOException)',
      gen: function (input) {
        var name = String(input || '').trim();
        var key = Object.keys(FAMILY).filter(function (k) { return k.toLowerCase() === name.toLowerCase(); })[0];
        if (!key) throw new Error('Type one of: ' + Object.keys(FAMILY).join(', '));
        var path = [], k = key;
        while (k) { path.push(k); k = FAMILY[k].p; }
        var frames = [];
        frames.push({ narr: 'Every throwable class has exactly one parent. To decide whether <b>' + key + '</b> is checked, we climb from it to <b>Throwable</b> and watch for two special ancestors: <b>RuntimeException</b> and <b>Error</b>.', parts: [familyGraph(one(key, 'cur'))] });
        var hl = {}, ehl = {}, unchecked = null;
        path.forEach(function (n, i) {
          hl = {}; path.slice(0, i).forEach(function (q) { hl[q] = 'done'; });
          hl[n] = (n === 'RuntimeException' || n === 'Error') ? 'bad' : 'cur';
          if (i > 0) ehl[path[i - 1] + '-' + n] = 'ok';
          if (!unchecked && (n === 'RuntimeException' || n === 'Error')) unchecked = n;
          var msg = i === 0 ? 'Start at <b>' + n + '</b>.' : 'Its parent is <b>' + n + '</b>.';
          if (n === 'RuntimeException') msg += ' <span class="c-r">Found RuntimeException</span> → everything below it is <b>unchecked</b>: the compiler will not force anyone to catch it.';
          else if (n === 'Error') msg += ' <span class="c-r">Found Error</span> → unchecked, and it means the JVM itself is in trouble. Do not catch it in normal code.';
          else if (n === 'Exception') msg += ' Plain <b>Exception</b> — still could be checked, keep climbing.';
          else if (n === 'Throwable') msg += ' Reached the root. Only <code>Throwable</code> subclasses can be thrown.';
          frames.push({ narr: msg, parts: [familyGraph(hl, JSON.parse(JSON.stringify(ehl))), { type: 'stack', label: 'Ancestors visited (bottom = start)', items: path.slice(0, i + 1), hl: one(i, 'cur') }] });
        });
        var verdict = unchecked ? 'UNCHECKED (extends ' + unchecked + ')' : 'CHECKED';
        var fin = {}; path.forEach(function (q) { fin[q] = 'sel'; });
        frames.push({ narr: 'Verdict: <b>' + key + '</b> is <b>' + verdict + '</b>.', parts: [familyGraph(fin), { type: 'vars', label: 'Result', vals: { 'class': key, 'kind': verdict, 'compiler forces handle-or-declare?': unchecked ? 'no' : 'YES' }, hl: { kind: unchecked ? 'bad' : 'ok' } }] });
        var codeLine = unchecked
          ? 'void f() {\n    throw new ' + key + '(' + (key === 'StackOverflowError' || key === 'OutOfMemoryError' ? '' : '"oops"') + ');   // compiles: no throws needed\n}'
          : 'void f() {\n    throw new ' + key + '("oops");   // COMPILE ERROR: unreported exception\n}\nvoid g() throws ' + key + ' {\n    throw new ' + key + '("oops");   // OK: declared\n}';
        frames.push({ narr: unchecked ? 'Because it is unchecked, a method may throw it <b>without</b> a <code>throws</code> clause. Callers may still catch it if they want.' : 'Because it is checked, a method that throws it must either catch it or <b>declare</b> it with <code>throws</code> — otherwise javac refuses to compile.', parts: [{ type: 'code', label: 'What the compiler says', lang: 'java', code: codeLine, hl: unchecked ? { 2: 'ok' } : { 2: 'bad', 5: 'ok' } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Quick sort-out: which of these are checked?',
        html: `${H.table(['Exception', 'Parent chain (short)', 'Kind'], [
          ['<code>FileNotFoundException</code>', 'IOException → Exception', H.c('g', 'checked')],
          ['<code>InterruptedException</code>', 'Exception', H.c('g', 'checked')],
          ['<code>NumberFormatException</code>', 'IllegalArgumentException → RuntimeException', H.c('r', 'unchecked')],
          ['<code>ConcurrentModificationException</code>', 'RuntimeException', H.c('r', 'unchecked')],
          ['<code>UncheckedIOException</code>', 'RuntimeException (wraps an IOException)', H.c('r', 'unchecked')],
          ['<code>StackOverflowError</code>', 'VirtualMachineError → Error', H.c('r', 'unchecked (Error)')],
          ['<code>CloneNotSupportedException</code>', 'Exception', H.c('g', 'checked')],
          ['<code>Exception</code> itself', 'Throwable', H.c('g', 'checked')]
        ])}<p>Trick: <code>Exception</code> itself is checked, but its child <code>RuntimeException</code> is not. Memorise the two "escape hatches": <b>RuntimeException</b> and <b>Error</b>.</p>`
      },
      {
        title: 'Two compile errors interviewers love',
        html: `<p><b>(a) Unreported checked exception</b></p>
<pre><code>void read() {
    new FileReader("a.txt");   // error: unreported exception FileNotFoundException;
}                              //        must be caught or declared to be thrown</code></pre>
<p><b>(b) Catching a checked exception that can never happen</b></p>
<pre><code>try {
    int x = 5 / 1;
} catch (IOException e) { }   // error: exception IOException is never thrown in body of try</code></pre>
<p>Rule (b) only applies to <b>checked</b> exceptions. <code>catch (Exception e)</code>, <code>catch (Throwable t)</code> and any unchecked type are always allowed, because the compiler cannot prove they never happen.</p>`
      },
      {
        title: 'Overriding: you may throw less, never more (checked)',
        html: `<pre><code>class Reader1 { void read() throws IOException { } }

class A extends Reader1 { void read() throws FileNotFoundException { } } // OK: narrower
class B extends Reader1 { void read() { } }                               // OK: throws nothing
class C extends Reader1 { void read() throws IllegalStateException { } } // OK: unchecked is free
class D extends Reader1 { void read() throws Exception { } }              // ERROR: broader checked</code></pre>
<p>Why? Code written as <code>Reader1 r = new D(); try { r.read(); } catch (IOException e) {}</code> only prepared for <code>IOException</code>. If <code>D</code> could throw a plain <code>Exception</code>, the compiler's promise to that caller would be broken. This is the <b>Liskov substitution principle</b> applied to exceptions.</p>`
      },
      {
        title: 'Expert trick: "checked" is only a compiler idea (sneaky throw)',
        html: `<p>The JVM does not know about checked exceptions — only <code>javac</code> does. Using generics, a checked exception can be thrown without any <code>throws</code> clause. Libraries like Lombok's <code>@SneakyThrows</code> use exactly this. It works, but it surprises callers, so treat it as a curiosity, not a habit.</p>`,
        code: `
class Sneaky {
    @SuppressWarnings("unchecked")
    static <E extends Throwable> void sneakyThrow(Throwable t) throws E {
        throw (E) t;                      // the cast is erased: no check happens at run time
    }

    static void noThrowsClause() {        // look: no "throws IOException"!
        Sneaky.<RuntimeException>sneakyThrow(new IOException("checked, but sneaked out"));
    }

    public static void main(String[] args) {
        try {
            noThrowsClause();
        } catch (Exception e) {
            System.out.println(e.getClass().getSimpleName() + ": " + e.getMessage());
            // IOException: checked, but sneaked out
        }
    }
}`
      }
    ],
    deepDive: `<h4>What a Throwable object carries</h4>
<p>Every <code>Throwable</code> stores four things: a <b>message</b> (<code>getMessage()</code>), an optional <b>cause</b> (<code>getCause()</code>, the exception it wraps), a <b>stack trace</b> (an array of <code>StackTraceElement</code> captured by <code>fillInStackTrace()</code> in the constructor — i.e. where the object was <b>created</b>, not where it was thrown) and a list of <b>suppressed</b> exceptions (filled by try-with-resources). Capturing the stack trace walks every frame of the thread and is the expensive part of creating an exception.</p>
<h4>Checked-ness lives only in javac</h4>
<p>At the bytecode level there is no difference between checked and unchecked: the <code>athrow</code> instruction throws any <code>Throwable</code>, and the <code>Exceptions</code> attribute that records a method's <code>throws</code> clause is <b>never verified</b> by the JVM. That is why Kotlin, Scala and Groovy (which have no checked exceptions) can call Java freely, and why the deprecated <code>Class.newInstance()</code> could leak a checked exception from a constructor.</p>
<h4>The Error sub-family</h4>
<ul><li><code>StackOverflowError</code> — recursion too deep for the thread's stack (typically 1 MB per thread on 64-bit systems, set with <code>-Xss</code>).</li>
<li><code>OutOfMemoryError</code> — its message tells you which area ran out: "Java heap space", "Metaspace", "GC overhead limit exceeded", "unable to create native thread", "Direct buffer memory".</li>
<li><code>ExceptionInInitializerError</code> — a <code>static</code> initializer threw; the class becomes unusable and every later use gives <code>NoClassDefFoundError</code>. A classic production puzzle.</li>
<li><code>AssertionError</code> — from <code>assert</code> (disabled unless you run with <code>-ea</code>).</li></ul>
<h4>The great debate</h4>
<p>Checked exceptions were a Java experiment no later mainstream language copied (C#'s designers rejected them explicitly). Arguments for: the type system documents failure modes. Arguments against: they leak implementation details through every layer (<code>throws SQLException</code> on a UI method), they encourage empty catch blocks, and they do not compose with lambdas (<code>Function.apply</code> cannot throw <code>IOException</code>). Java itself added <code>UncheckedIOException</code> (Java 8) to cross that gap. A balanced 2026 answer: use checked exceptions sparingly for truly recoverable, expected conditions at a clear boundary; use unchecked for programming errors; and never use either for normal control flow.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants generate try/catch boilerplate instantly, so knowing <i>syntax</i> is worth little. What matters is <b>judgement</b>: which exceptions are bugs and which are recoverable conditions.</p>
<p><b>Where AI goes wrong:</b> (1) "fixing" a compile error by adding <code>throws Exception</code> to <code>main</code> and every method above it — this compiles, but destroys the information about what can actually fail; (2) wrapping everything in <code>catch (Exception e) { e.printStackTrace(); }</code>, which hides bugs; (3) catching <code>Throwable</code> or <code>OutOfMemoryError</code> to "be safe".</p>
<p><b>Use AI as a partner:</b> ask <i>"List every checked exception this method can throw and who should handle each one"</i> or <i>"Is this exception a caller bug or an environmental failure?"</i>. Then decide the policy yourself.</p>
<p><b>What you must still own:</b> drawing the hierarchy from memory, the handle-or-declare rule, the overriding rule, and explaining in an interview why you chose checked or unchecked for a given API.</p>`,
    problems: [{
      title: 'Classify Any Throwable and Print Its Ancestry',
      level: 'Easy', tags: ['exception hierarchy', 'instanceof', 'reflection'], companies: ['TCS', 'Infosys', 'Accenture'],
      statement: `<p>Write <code>static String describe(Throwable t)</code> that returns the kind and the parent chain of the exception's class, for example <code>"CHECKED: FileNotFoundException -&gt; IOException -&gt; Exception -&gt; Throwable"</code>. The kind is <code>ERROR</code> if it is an <code>Error</code>, <code>UNCHECKED</code> if it is a <code>RuntimeException</code>, otherwise <code>CHECKED</code>. It must work for <b>any</b> class, including custom ones you have never seen.</p>`,
      constraints: `<code>t</code> is non-null. Use simple class names in the chain.`,
      example: `<p><code>describe(new NumberFormatException())</code> → ${H.c('r', '"UNCHECKED: NumberFormatException -&gt; IllegalArgumentException -&gt; RuntimeException -&gt; Exception -&gt; Throwable"')}<br><code>describe(new InterruptedException())</code> → ${H.c('g', '"CHECKED: InterruptedException -&gt; Exception -&gt; Throwable"')}<br>Why: the kind depends only on whether <code>RuntimeException</code> or <code>Error</code> appears among the ancestors.</p>`,
      brute: {
        why: `<p>A big hard-coded <code>switch</code> on the class name works only for the names you typed in. A brand-new <code>class PaymentDeclinedException extends Exception</code> falls into the default branch and gets the wrong answer — the rule is about <b>ancestry</b>, not names.</p>`,
        code: `
static String kindByName(Throwable t) {
    return switch (t.getClass().getSimpleName()) {
        case "NullPointerException", "IllegalArgumentException", "NumberFormatException" -> "UNCHECKED";
        case "OutOfMemoryError", "StackOverflowError" -> "ERROR";
        default -> "CHECKED";            // wrong for every unchecked class not listed!
    };
}`
      },
      mcq: { q: 'Which single test correctly identifies every unchecked <code>Exception</code>?', options: ['<code>t instanceof Exception</code>', '<code>t instanceof RuntimeException</code>', '<code>t.getClass().getSimpleName().endsWith("Exception")</code>', '<code>t.getCause() == null</code>'], answer: 1, explain: 'Among Exceptions, exactly those that extend RuntimeException are unchecked. instanceof checks the whole ancestry, so custom subclasses are covered.' },
      hints: [
        `<p>Hint 1: <code>instanceof</code> already looks at the whole ancestry, so <code>t instanceof RuntimeException</code> is true for <code>NumberFormatException</code> too. Check <code>Error</code> first, then <code>RuntimeException</code>.</p>`,
        `<p>Hint 2: for the chain, start with <code>Class&lt;?&gt; c = t.getClass()</code> and repeatedly call <code>c.getSuperclass()</code>, appending <code>getSimpleName()</code>, until you have added <code>Throwable</code>.</p>`,
        `<p>Hint 3: use a <code>StringJoiner(" -&gt; ")</code> to avoid a trailing arrow. Stop when <code>c == Throwable.class</code> after adding it. Recipe: kind = Error? ERROR : Runtime? UNCHECKED : CHECKED; chain = walk superclasses; return kind + ": " + chain.</p>`
      ],
      solution: {
        approach: `<p>Decide the kind with two <code>instanceof</code> checks (they test the full ancestry). Build the chain by walking <code>getSuperclass()</code> from the runtime class up to <code>Throwable</code>.</p>`,
        code: `
class Describe {
    static String describe(Throwable t) {
        String kind = (t instanceof Error) ? "ERROR"
                    : (t instanceof RuntimeException) ? "UNCHECKED"
                    : "CHECKED";
        StringJoiner chain = new StringJoiner(" -> ");
        for (Class<?> c = t.getClass(); c != null; c = c.getSuperclass()) {
            chain.add(c.getSimpleName());
            if (c == Throwable.class) break;       // do not continue to Object
        }
        return kind + ": " + chain;
    }

    static class PaymentDeclinedException extends Exception { }   // a custom checked type

    public static void main(String[] args) {
        System.out.println(describe(new NumberFormatException()));
        System.out.println(describe(new FileNotFoundException()));
        System.out.println(describe(new StackOverflowError()));
        System.out.println(describe(new PaymentDeclinedException()));
    }
}`,
        dry: { head: ['input', 'instanceof Error?', 'instanceof Runtime?', 'chain built'], rows: [
          ['NumberFormatException', 'no', H.c('r', 'yes → UNCHECKED'), 'NumberFormat → IllegalArgument → Runtime → Exception → Throwable'],
          ['FileNotFoundException', 'no', 'no → ' + H.c('g', 'CHECKED'), 'FileNotFound → IOException → Exception → Throwable'],
          ['StackOverflowError', H.c('r', 'yes → ERROR'), '—', 'StackOverflowError → VirtualMachineError → Error → Throwable'],
          ['PaymentDeclinedException', 'no', 'no → ' + H.c('g', 'CHECKED'), 'PaymentDeclined → Exception → Throwable']
        ] },
        complexity: `<p>O(d) time and space, where d is the depth of the class hierarchy (rarely more than 6).</p>`,
        followUps: ['Also list the interfaces each class implements.', 'Return the nearest common ancestor of two exception classes (useful for multi-catch).', 'Why does <code>getSuperclass()</code> of <code>Throwable</code> return <code>Object</code>?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — try / catch / finally and propagation through call frames
     ====================================================================== */
  function propagationFrames(input) {
    var NAMES = ['main', 'a', 'b', 'c'];
    var toks = String(input || '').trim().toLowerCase().split(/[\s,]+/);
    var thrower = toks[0], catcher = toks[1] || 'none';
    var ti = NAMES.indexOf(thrower), ci = NAMES.indexOf(catcher);
    if (ti < 1) throw new Error('Format: "<thrower> <catcher>", thrower is a, b or c; catcher is main, a, b, c or none. Example: c a');
    if (catcher !== 'none' && ci < 0) throw new Error('Catcher must be main, a, b, c or none');
    if (ci > ti) throw new Error('The catcher must be the thrower itself or one of its callers (main → a → b → c)');
    var L = [], at = {};
    function add(s, key) { L.push(s); if (key) at[key] = L.length; }
    for (var i = 0; i <= ti; i++) {
      var m = NAMES[i];
      add(i === 0 ? 'public static void main(String[] args) {' : 'static void ' + m + '() {', m + ':head');
      add('    try {');
      add('        System.out.println("' + m + ': start");', m + ':start');
      if (i < ti) {
        add('        ' + NAMES[i + 1] + '();', m + ':call');
        add('        System.out.println("' + m + ': after call");', m + ':after');
      } else {
        add('        Integer.parseInt("abc");   // throws NumberFormatException', m + ':throw');
      }
      if (catcher === m) {
        add('    } catch (NumberFormatException e) {', m + ':catch');
        add('        System.out.println("' + m + ': caught " + e.getMessage());', m + ':caught');
      }
      add('    } finally {', m + ':fin');
      add('        System.out.println("' + m + ': finally");', m + ':finp');
      add('    }');
      add('    System.out.println("' + m + ': end");', m + ':end');
      add('}');
      if (i < ti) add('');
    }
    var code = L.join('\n');
    var frames = [], stack = [], o = [], exc = '—', mode = 'normal';
    function snap(lines, cls, narr, extra) {
      var hl = {};
      [].concat(lines).forEach(function (k) { hl[at[k]] = cls || 'cur'; });
      var sh = {}; if (stack.length) sh[stack.length - 1] = mode === 'unwinding' ? 'bad' : 'cur';
      var parts = [
        { type: 'code', label: 'Program (generated from your input)', lang: 'java', code: code, hl: hl },
        { type: 'stack', label: 'Call stack (top = running now)', items: stack.slice(), hl: sh },
        { type: 'vars', label: 'Exception in flight', vals: { exception: exc, mode: mode }, hl: { exception: exc === '—' ? '' : 'bad', mode: mode === 'unwinding' ? 'bad' : (mode === 'caught' ? 'ok' : '') } },
        out(o.slice())
      ];
      (extra || []).forEach(function (p) { parts.push(p); });
      frames.push({ narr: narr, parts: parts });
    }
    for (i = 0; i <= ti; i++) {
      m = NAMES[i];
      stack.push(m + '()');
      snap(m + ':head', 'cur', i === 0 ? 'The JVM calls <b>main</b>. A new <b>stack frame</b> (a box holding this call\'s local variables) is pushed.' : '<b>' + NAMES[i - 1] + '</b> calls <b>' + m + '()</b>: a new frame is pushed on top. The caller waits, frozen at its call line.');
      o.push(m + ': start');
      snap(m + ':start', 'cur', 'Inside the <code>try</code> of <b>' + m + '</b>: print "' + m + ': start".');
    }
    var tm = NAMES[ti];
    exc = 'NumberFormatException: For input string: "abc"';
    mode = 'unwinding';
    snap(tm + ':throw', 'bad', '<span class="c-r">Boom!</span> <code>parseInt("abc")</code> creates a <b>NumberFormatException</b> object (recording the stack trace right now) and throws it. Normal execution stops; the JVM starts looking for a matching <code>catch</code>, starting in the current frame.');
    for (var j = ti; j >= 0; j--) {
      m = NAMES[j];
      if (catcher === m) {
        mode = 'caught';
        snap(m + ':catch', 'ok', '<b>' + m + '</b> has <code>catch (NumberFormatException e)</code> around the line that failed — a match! The exception stops travelling here. ' + (j < ti ? 'The frames above were already removed.' : ''));
        o.push(m + ': caught For input string: "abc"');
        snap(m + ':caught', 'ok', 'The catch block runs. The exception is now <b>handled</b>; the program is back to normal.');
        exc = '—'; mode = 'normal';
        o.push(m + ': finally');
        snap([m + ':fin', m + ':finp'], 'cur', '<code>finally</code> runs next — it runs after the catch block, too.');
        o.push(m + ': end');
        snap(m + ':end', 'ok', 'Because the exception was handled, code <b>after</b> the try statement runs normally: "' + m + ': end".');
        stack.pop();
        for (var k = j - 1; k >= 0; k--) {
          var p = NAMES[k];
          o.push(p + ': after call');
          snap(p + ':after', 'ok', '<b>' + NAMES[k + 1] + '</b> returned normally, so <b>' + p + '</b> simply continues with the next line — it never knows anything went wrong below it.');
          o.push(p + ': finally'); o.push(p + ': end');
          snap([p + ':fin', p + ':finp', p + ':end'], 'cur', 'finally, then the rest of <b>' + p + '</b>, then it returns.');
          stack.pop();
        }
        snap(NAMES[0] + ':end', 'done', '<span class="c-g">Program finished normally.</span> Read the console top to bottom: every <code>finally</code> ran exactly once, and the catch happened in <b>' + catcher + '</b>.');
        return frames;
      }
      o.push(m + ': finally');
      snap([m + ':fin', m + ':finp'], 'bad', '<b>' + m + '</b> has no matching catch, but it has a <code>finally</code>, so that runs <b>while the exception is still flying</b>. Clean-up always happens.');
      snap(m + ':end', 'done', 'The rest of <b>' + m + '</b> (including "' + m + ': end"' + (j < ti ? ' and "' + m + ': after call"' : '') + ') is <b>skipped</b>. Its frame is popped and the exception moves to the caller.');
      stack.pop();
    }
    o.push('Exception in thread "main" java.lang.NumberFormatException: For input string: "abc"');
    for (j = ti; j >= 0; j--) o.push('    at Demo.' + NAMES[j] + '(Demo.java)');
    snap(NAMES[0] + ':head', 'bad', '<span class="c-r">Nobody caught it.</span> The stack is empty, so the thread dies. The default handler prints the stack trace: the <b>top</b> line is where it was thrown, each line below is a caller. The JVM exits with status 1.');
    return frames;
  }

  var FINALLY_PUZZLES = {
    '1': { code: 'static int f() {\n    int x = 1;\n    try {\n        return x;      // the VALUE 1 is copied into a hidden slot now\n    } finally {\n        x = 2;         // changes x, not the copied value\n    }\n}\n// System.out.println(f());', steps: [
      { l: 2, v: { x: 1, 'hidden return slot': '—' }, narr: '<code>x</code> starts at 1.' },
      { l: 4, v: { x: 1, 'hidden return slot': 1 }, hv: { 'hidden return slot': 'ok' }, narr: '<code>return x;</code> evaluates <code>x</code> <b>now</b> and stores the value 1 in a hidden slot. But before leaving, Java must run <code>finally</code>.' },
      { l: 6, v: { x: 2, 'hidden return slot': 1 }, hv: { x: 'cur' }, narr: 'finally sets <code>x = 2</code>. It changes the local variable only; the hidden slot still holds 1 (ints are copied by value).' },
      { l: 8, v: { x: 2, 'returned': 1 }, hv: { returned: 'sel' }, o: ['1'], narr: 'The method returns the saved value: prints <b>1</b>, not 2.' }
    ] },
    '2': { code: 'static int g() {\n    try {\n        throw new RuntimeException("lost!");\n    } finally {\n        return 42;     // a return in finally wins over everything\n    }\n}\n// System.out.println(g());', steps: [
      { l: 2, v: { 'in flight': '—' }, narr: 'Enter the try block.' },
      { l: 3, cls: 'bad', v: { 'in flight': 'RuntimeException("lost!")' }, hv: { 'in flight': 'bad' }, narr: 'An exception is thrown. Before it can leave the method, <code>finally</code> must run.' },
      { l: 5, v: { 'in flight': 'DISCARDED', 'returned': 42 }, hv: { 'in flight': 'bad', returned: 'sel' }, narr: '<code>return 42</code> inside finally <b>completes the method abruptly with a new reason</b>. The old exception is silently thrown away — no log, no trace.' },
      { l: 8, v: { 'returned': 42 }, hv: { returned: 'sel' }, o: ['42'], narr: 'Prints <b>42</b>. This is why a <code>return</code> (or <code>throw</code>) inside finally is a serious code smell: it swallows real errors.' }
    ] },
    '3': { code: 'static StringBuilder h() {\n    StringBuilder sb = new StringBuilder("try");\n    try {\n        return sb;               // saves the REFERENCE (an arrow to the object)\n    } finally {\n        sb.append("+finally");   // mutates the SAME object\n    }\n}\n// System.out.println(h());', steps: [
      { l: 2, v: { sb: '→ #1 "try"' }, narr: '<code>sb</code> holds a reference (arrow) to object #1 with text "try".' },
      { l: 4, v: { sb: '→ #1 "try"', 'hidden return slot': '→ #1' }, hv: { 'hidden return slot': 'ok' }, narr: 'return saves a copy of the <b>reference</b> — another arrow to the same object #1.' },
      { l: 6, v: { sb: '→ #1 "try+finally"', 'hidden return slot': '→ #1' }, hv: { sb: 'cur' }, narr: 'finally appends to object #1. Both arrows point to it, so the change is visible to the caller.' },
      { l: 9, v: { returned: '"try+finally"' }, hv: { returned: 'sel' }, o: ['try+finally'], narr: 'Prints <b>try+finally</b>. Rule: finally cannot change a returned primitive, but it can mutate a returned object.' }
    ] },
    '4': { code: 'public static void main(String[] args) {\n    try {\n        System.out.println("in try");\n        System.exit(0);           // JVM starts shutting down\n    } finally {\n        System.out.println("in finally");\n    }\n}', steps: [
      { l: 2, o: [], narr: 'Enter the try block.' },
      { l: 3, o: ['in try'], narr: 'Print "in try".' },
      { l: 4, cls: 'bad', o: ['in try'], narr: '<code>System.exit(0)</code> starts JVM shutdown. It <b>never returns</b>, so control never leaves the try block normally or by exception.' },
      { l: 6, cls: 'done', o: ['in try'], narr: '"in finally" is <b>never printed</b>. The cases where finally does not run: <code>System.exit</code>/<code>Runtime.halt</code>, the JVM crashing or being killed (<code>kill -9</code>), power loss, an infinite loop or deadlock in try, or a daemon thread still running when the JVM exits.' }
    ] }
  };

  topics.push({
    title: 'try / catch / finally and How Exceptions Travel Up the Call Stack',
    analogy: `<p>Picture an <b>office with a chain of managers</b>: the CEO asks a director, who asks a manager, who asks an intern to file a report. The intern finds the printer on fire. The intern cannot fix that, so the problem goes back <b>up</b> the chain — manager, director, CEO — until someone who <b>knows how to handle fires</b> deals with it. Everyone the problem passes through stops what they were doing.</p>
<p>And <code>finally</code>? It is the <b>hotel checkout rule</b>: whether your trip was great or a disaster, you hand back the room key on your way out. No matter how you leave a <code>try</code> block — normally, by <code>return</code>, or by an exception — the <code>finally</code> block runs.</p>`,
    explain: `<h4>1. The shape</h4>
<pre><code>try {
    risky();                         // code that might throw
} catch (FileNotFoundException e) {  // most specific first
    useDefaults();
} catch (IOException e) {            // then more general
    log(e);
} finally {
    cleanUp();                       // ALWAYS runs (almost — see below)
}</code></pre>
<p>You need a <code>try</code> plus at least one <code>catch</code> <b>or</b> a <code>finally</code> (or resources — next topic).</p>
<h4>2. Which blocks run? Three cases</h4>
${H.table(['What happens in try', 'Blocks that run', 'Code after the try statement'], [
  ['No exception', 'try (all) → finally', H.c('g', 'runs')],
  ['Exception, a catch matches', 'try (up to the throw) → that catch → finally', H.c('g', 'runs')],
  ['Exception, no catch matches', 'try (up to the throw) → finally → exception leaves the method', H.c('r', 'skipped')]
])}
<p>Only the <b>first</b> matching catch runs. Java checks them <b>top to bottom</b> using <code>instanceof</code>. That is why a general catch above a specific one is a <b>compile error</b> ("exception FileNotFoundException has already been caught").</p>
<h4>3. Propagation — the exception climbs the call stack</h4>
<p>Every method call pushes a <b>frame</b> on the call stack. When an exception is thrown, the JVM looks for a matching catch in the current method. If none, it runs that method's <code>finally</code>, <b>pops</b> the frame (the method ends abruptly) and repeats in the caller. This is called <b>stack unwinding</b>. If it unwinds past <code>main</code>, the thread dies and the default handler prints the stack trace.</p>
<h4>4. Multi-catch and rethrow</h4>
<pre><code>catch (NumberFormatException | ArithmeticException e) { … }  // one block, two types</code></pre>
<p>The types in a multi-catch must not be parent and child (that would be redundant — compile error), and <code>e</code> is implicitly <code>final</code>. You can also catch, add context, and <b>rethrow</b> — <code>throw e;</code> or better <code>throw new ServiceException("loading order 42", e);</code>.</p>
<h4>5. finally traps (favourite output questions)</h4>
<ul>
<li>A <code>return</code> value is computed <b>before</b> finally runs; changing a primitive in finally does not change what is returned.</li>
<li>A <code>return</code> or <code>throw</code> <b>inside</b> finally overrides whatever was happening — even an exception, which is silently lost.</li>
<li>finally does <b>not</b> run if the JVM stops: <code>System.exit()</code>, a crash, <code>kill -9</code>.</li>
</ul>
<h4>6. Reading a stack trace</h4>
<pre><code>Exception in thread "main" java.lang.NumberFormatException: For input string: "abc"
    at java.base/java.lang.Integer.parseInt(Integer.java:661)
    at Demo.c(Demo.java:14)     ← YOUR code that triggered it (first line in your package)
    at Demo.b(Demo.java:9)
    at Demo.main(Demo.java:4)
Caused by: …                     ← the original, deeper problem (read the LAST "Caused by" first)</code></pre>`,
    clues: [
      '"What will this code print?" with try/catch/finally and return statements → trace the hidden return slot',
      '"Does finally always execute?" → yes, except System.exit, halt, JVM crash, infinite loop, daemon threads at exit',
      'Compile error <code>exception X has already been caught</code> → catch blocks ordered general-before-specific',
      '"What happens if an exception is not caught?" → stack unwinding, finally blocks run, thread dies, stack trace',
      '"Can we have try without catch?" → yes, try-finally or try-with-resources',
      '"Return in finally" / "exception in finally" → original exception is lost',
      'Multi-catch <code>catch (A | B e)</code> questions → A and B must be unrelated, e is final'
    ],
    code: [`
class Propagation {
    static void c() {
        System.out.println("c: start");
        Integer.parseInt("abc");                 // throws NumberFormatException
        System.out.println("c: never printed");
    }
    static void b() {
        try {
            c();
        } finally {
            System.out.println("b: finally");    // runs while the exception passes through
        }
        System.out.println("b: never printed");  // skipped: b ends abruptly
    }
    static void a() {
        try {
            b();
        } catch (NumberFormatException e) {      // first matching catch up the stack
            System.out.println("a: caught " + e.getMessage());
        } finally {
            System.out.println("a: finally");
        }
        System.out.println("a: end");            // runs: the exception was handled
    }
    public static void main(String[] args) {
        a();
        System.out.println("main: end");
    }
}
/* Output:
c: start
b: finally
a: caught For input string: "abc"
a: finally
a: end
main: end
*/`],
    codeTitle: ['Propagation with finally blocks on the way'],
    viz: [{
      title: 'Exception propagation through call frames',
      input: 'c a',
      inputLabel: 'thrower catcher — thrower: a|b|c, catcher: main|a|b|c|none (e.g. "c a", "b b", "c none")',
      gen: propagationFrames
    }, {
      title: 'finally puzzles: what is really returned?',
      input: '1',
      inputLabel: 'Puzzle number 1–4 (1: int return, 2: return in finally, 3: StringBuilder, 4: System.exit)',
      gen: function (input) {
        var k = String(input || '').trim();
        var pz = FINALLY_PUZZLES[k];
        if (!pz) throw new Error('Enter 1, 2, 3 or 4');
        return codeFrames(pz.code, pz.steps.map(function (s) { var c = Object.assign({}, s); if (c.o === undefined) c.o = []; return c; }), 'Puzzle ' + k);
      }
    }],
    examples: [
      {
        title: 'Catch order: specific before general',
        html: `<pre><code>try { new FileReader("x.txt"); }
catch (IOException e)           { }   // catches FileNotFoundException too…
catch (FileNotFoundException e) { }   // ERROR: exception FileNotFoundException has already been caught</code></pre>
<p>Swap them and it compiles. Think of catch blocks as <b>sieves stacked from finest to coarsest</b>: put the fine sieve on top or the coarse one catches everything first.</p>`
      },
      {
        title: 'Predict the output: exceptions inside catch and finally',
        html: `<p>An exception thrown <b>inside a catch block</b> is not caught by the sibling catch blocks of the same try — it leaves the statement (after finally runs). Trace it:</p>`,
        code: `
class CatchThrows {
    public static void main(String[] args) {
        try {
            try {
                System.out.println("1");
                throw new IllegalStateException("first");
            } catch (IllegalStateException e) {
                System.out.println("2 " + e.getMessage());
                throw new IllegalArgumentException("second");   // new exception from the catch
            } catch (IllegalArgumentException e) {
                System.out.println("never: siblings do not catch it");
            } finally {
                System.out.println("3 finally");
            }
        } catch (RuntimeException outer) {
            System.out.println("4 outer caught " + outer.getMessage());
        }
    }
}
// Output: 1 / 2 first / 3 finally / 4 outer caught second`
      },
      {
        title: 'Multi-catch and precise rethrow',
        html: `<p>Since Java 7 the compiler is smart about rethrowing: if you catch <code>Exception e</code> and rethrow the <b>unchanged, effectively final</b> <code>e</code>, the method only needs to declare the checked exceptions the try block can <b>actually</b> throw.</p>`,
        code: `
class Rethrow {
    static void parseOrDivide(String s, int d) {
        try {
            System.out.println(Integer.parseInt(s) / d);
        } catch (NumberFormatException | ArithmeticException e) {   // two unrelated types, one handler
            System.out.println("bad input: " + e.getClass().getSimpleName());
        }
    }

    static void load(String name) throws IOException {   // NOT "throws Exception" — precise rethrow
        try {
            if (name.isEmpty()) throw new FileNotFoundException("empty name");
            System.out.println("loaded " + name);
        } catch (Exception e) {
            System.out.println("logging: " + e.getMessage());
            throw e;                                      // compiler knows e can only be an IOException here
        }
    }

    public static void main(String[] args) throws IOException {
        parseOrDivide("12", 0);   // bad input: ArithmeticException
        parseOrDivide("x", 3);    // bad input: NumberFormatException
        load("orders.csv");       // loaded orders.csv
    }
}`
      },
      {
        title: 'The silent killer: an exception from finally hides the real one',
        html: `<p>If the try block throws exception A and then <code>finally</code> throws exception B, the caller only sees <b>B</b>; A is gone forever. This often happens with old-style <code>finally { stream.close(); }</code> — the real error (say, a corrupt file) is replaced by a meaningless "stream closed" error. Try-with-resources (next topic) fixes this by keeping A as the main exception and attaching B as <b>suppressed</b>.</p>`,
        code: `
class FinallyMasks {
    public static void main(String[] args) {
        try {
            try {
                throw new IllegalStateException("A: the real problem");
            } finally {
                throw new RuntimeException("B: cleanup failed");   // replaces A
            }
        } catch (RuntimeException e) {
            System.out.println(e.getMessage());                    // B: cleanup failed
            System.out.println(e.getSuppressed().length);          // 0 — A is lost
        }
    }
}`
      }
    ],
    deepDive: `<h4>How the JVM implements catch: the exception table</h4>
<p>Compiled bytecode has no "try" instruction. Each method carries an <b>exception table</b>: rows of <code>from, to, target, type</code>. When an exception is thrown at bytecode offset <i>pc</i>, the JVM scans the rows in order and jumps to <code>target</code> of the first row where <code>from ≤ pc &lt; to</code> and the exception is an instance of <code>type</code>. No row matches → the frame is popped and the search repeats in the caller at its call site. Because the table is only consulted when something is thrown, a <code>try</code> block costs <b>nothing</b> on the normal path.</p>
<h4>How finally is compiled</h4>
<p>Modern javac <b>copies the finally code</b> into every exit path: after the try body, after each catch, and into a catch-all handler (type <code>any</code>) that runs finally and rethrows. (Old compilers used <code>jsr/ret</code> subroutines, banned in class files since Java 7.) That is why huge finally blocks bloat bytecode, and why a <code>return</code> in finally can override everything — in each copy, the return comes last.</p>
<h4>The cost of exceptions</h4>
<p>Throwing itself is cheap; <b>creating</b> the exception is not, because the constructor calls <code>fillInStackTrace()</code>, which walks every frame. Deep stacks (Spring apps often have 100+ frames) make this measurable — microseconds per exception. HotSpot even has <code>-XX:+OmitStackTraceInFastThrow</code> (on by default): if the same implicit exception (NPE, ArithmeticException, AIOOBE) is thrown very often from compiled code, it reuses a pre-built exception <b>without a stack trace</b>. If production logs show <code>java.lang.NullPointerException</code> with no trace, that is why — search for the first occurrence.</p>
<h4>Helpful NullPointerExceptions (Java 14+, on by default since 15)</h4>
<p>Messages like <code>Cannot invoke "String.length()" because "user.name" is null</code> are computed lazily from bytecode when <code>getMessage()</code> is called, so they cost nothing unless printed.</p>
<h4>Uncaught exceptions and threads</h4>
<p>When an exception escapes a thread's <code>run()</code>, the JVM calls the thread's <code>UncaughtExceptionHandler</code> (or the thread group's, or the default set via <code>Thread.setDefaultUncaughtExceptionHandler</code>). Only that thread dies; the JVM exits when no non-daemon threads remain. For tasks submitted to an <code>ExecutorService</code>, the exception is captured inside the <code>Future</code> and is <b>invisible</b> until you call <code>get()</code> — a classic "my task silently failed" bug.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant can explain a 200-line stack trace in seconds — paste it and ask <i>"Which frame is in my code, what is the root cause, and which Caused-by matters?"</i>. Use that, but learn the reading order yourself (last "Caused by", first frame from your package) so you can verify the answer.</p>
<p><b>Where AI goes wrong:</b> it happily writes <code>return</code> inside <code>finally</code>, or "cleans up" code by merging catch blocks in the wrong order. It also tends to invent output for tricky try/finally puzzles — models often say "2" for puzzle 1 above. Always trace with the <b>hidden return slot</b> rule or run the code.</p>
<p><b>Prompt that works:</b> <i>"Write 5 predict-the-output puzzles about try/catch/finally with return statements, then hide the answers"</i> — a great self-test generator. Then check answers with <code>jshell</code>.</p>
<p><b>What you must still own:</b> the three-case table, stack unwinding, why finally can mask exceptions, and the cases where finally does not run.</p>`,
    problems: [{
      title: 'Sum the Valid Numbers, Count the Bad Ones',
      level: 'Easy', tags: ['try-catch', 'NumberFormatException', 'parsing'], companies: ['Amazon', 'Wipro', 'Capgemini'],
      statement: `<p>You receive raw text tokens from a form, e.g. <code>["12", " 7", "x9", "", "-3", "2147483648"]</code>. Write <code>static Result sumValid(String[] tokens)</code> returning a record <code>Result(long sum, int invalid)</code>: the sum of every token that is a valid <code>int</code> after trimming spaces, and how many tokens were invalid. A single bad token must <b>not</b> stop the processing of the rest. A <code>null</code> token counts as invalid.</p>`,
      constraints: `0 ≤ tokens.length ≤ 10<sup>5</sup>; each valid value fits in <code>int</code>, the sum may not.`,
      example: `<p>Input <code>["12", " 7", "x9", "", "-3", "2147483648"]</code> → ${H.c('g', 'Result[sum=16, invalid=3]')}. 12 + 7 + (−3) = 16; ${H.c('r', '"x9"')} has a letter, ${H.c('r', '""')} is empty, ${H.c('r', '"2147483648"')} is one more than <code>Integer.MAX_VALUE</code> — all three make <code>parseInt</code> throw <code>NumberFormatException</code>.</p>`,
      brute: {
        why: `<p>Wrapping the <b>whole loop</b> in one try/catch looks tidy, but the first bad token jumps out of the loop and every later token is lost. The catch must be <b>inside</b> the loop, around just the risky call. (Pre-validating with a hand-written regex is the other naive path — it is easy to get wrong for signs, spaces and overflow.)</p>`,
        code: `
static long sumBroken(String[] tokens) {
    long sum = 0;
    try {
        for (String t : tokens) sum += Integer.parseInt(t.trim());
    } catch (NumberFormatException e) {
        // first bad token ends everything: "-3" after "x9" is never added
    }
    return sum;
}`
      },
      mcq: { q: 'Where should the <code>try</code> go so that one bad token does not stop the rest?', options: ['Around the whole for-loop', 'Inside the loop, around <code>parseInt</code> only', 'In <code>main</code>', 'No try needed — parseInt returns 0 for bad input'], answer: 1, explain: 'The scope of try decides how much work an exception skips. Narrow scope = only that token is skipped.' },
      hints: [
        `<p>Hint 1: an exception skips everything from the throw to the matching catch. Put the try/catch around the smallest risky piece — one <code>parseInt</code> call.</p>`,
        `<p>Hint 2: catch <code>NumberFormatException</code> specifically (not <code>Exception</code>), increment the invalid counter, and continue. Handle <code>null</code> before calling <code>trim()</code>, or it becomes an NPE.</p>`,
        `<p>Hint 3: use a <code>long</code> accumulator — 10<sup>5</sup> values near 2<sup>31</sup> overflow an int. Recipe: for each token → null? invalid++ : try { sum += parseInt(trim) } catch (NFE) { invalid++ }.</p>`
      ],
      solution: {
        approach: `<p>Loop once. For each token, try to parse it inside a narrow try/catch. A <code>NumberFormatException</code> only increments the counter for that token. <code>Integer.parseInt</code> already rejects empty strings, letters and out-of-range values, so we do not need our own validation.</p>`,
        code: `
class SumValid {
    record Result(long sum, int invalid) { }

    static Result sumValid(String[] tokens) {
        long sum = 0;
        int invalid = 0;
        for (String t : tokens) {
            if (t == null) { invalid++; continue; }           // avoid NPE on trim()
            try {
                sum += Integer.parseInt(t.trim());            // the only risky call
            } catch (NumberFormatException e) {               // specific, expected failure
                invalid++;
            }
        }
        return new Result(sum, invalid);
    }

    public static void main(String[] args) {
        System.out.println(sumValid(new String[]{"12", " 7", "x9", "", "-3", "2147483648"}));
        // Result[sum=16, invalid=3]
    }
}`,
        alt: [{ lang: 'python', code: `def sum_valid(tokens):\n    total, invalid = 0, 0\n    for t in tokens:\n        try:\n            v = int(t.strip())\n            if not -2**31 <= v < 2**31:\n                raise ValueError("out of int range")\n            total += v\n        except (ValueError, AttributeError):   # AttributeError: None has no strip\n            invalid += 1\n    return total, invalid\n\nprint(sum_valid(["12", " 7", "x9", "", "-3", "2147483648"]))`, run: true }],
        dry: { head: ['token', 'parseInt result', 'sum', 'invalid'], rows: [
          ['"12"', '12', '12', '0'], ['" 7"', '7 (after trim)', '19', '0'], ['"x9"', H.c('r', 'NumberFormatException'), '19', '1'],
          ['""', H.c('r', 'NumberFormatException'), '19', '2'], ['"-3"', '-3', '16', '2'], ['"2147483648"', H.c('r', 'NumberFormatException (overflow)'), '16', '3']
        ] },
        complexity: `<p>O(N · L) time for N tokens of length L, O(1) extra space. Exceptions are only created for bad tokens; if most tokens are bad and performance matters, pre-check with a cheap character scan to avoid paying for stack traces.</p>`,
        followUps: ['Also return the indexes of the bad tokens.', 'Accept underscores like "1_000" as valid.', 'Rewrite with streams — where does the try/catch go now?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — try-with-resources, AutoCloseable, suppressed exceptions
     ====================================================================== */
  function twrFrames(input) {
    var toks = String(input || '').trim().split(/[\s,]+/).filter(Boolean);
    var bodyThrows = false, res = [];
    toks.forEach(function (t) {
      if (/^body!$/i.test(t)) { bodyThrows = true; return; }
      var m = /^([A-Za-z][A-Za-z0-9]{0,9})(\*?)$/.exec(t);
      if (!m) throw new Error('Tokens: resource names like In Out Log, add * if its close() throws, and BODY! if the body throws. Example: In Out* Log BODY!');
      res.push({ name: m[1], bad: m[2] === '*' });
    });
    if (!res.length || res.length > 5) throw new Error('Give 1 to 5 resources, e.g. "In Out* Log BODY!"');
    var L = [], at = {};
    function add(s, key) { L.push(s); if (key) at[key] = L.length; }
    res.forEach(function (r, i) {
      var v = r.name.charAt(0).toLowerCase() + r.name.slice(1);
      var pre = i === 0 ? 'try (' : '     ';
      var post = i === res.length - 1 ? ') {' : ';';
      add(pre + 'Res ' + v + ' = new Res("' + r.name + '")' + post + (r.bad ? '   // its close() throws' : ''), 'open' + i);
    });
    add('    System.out.println("body runs");', 'body');
    if (bodyThrows) add('    throw new IllegalStateException("body failed");', 'throw');
    add('}   // <- resources are closed HERE, in reverse order', 'close');
    add('catch (Exception e) {', 'catch');
    add('    System.out.println("caught: " + e.getMessage());', 'caught');
    add('    for (Throwable s : e.getSuppressed())', 'sup');
    add('        System.out.println("  suppressed: " + s.getMessage());', 'supp');
    add('} finally {', 'fin');
    add('    System.out.println("finally");', 'finp');
    add('}');
    var code = L.join('\n');
    var frames = [], open = [], o = [], primary = '—', sup = [];
    function snap(keys, cls, narr) {
      var hl = {};
      [].concat(keys).forEach(function (k) { hl[at[k]] = cls || 'cur'; });
      frames.push({ narr: narr, parts: [
        { type: 'code', label: 'try-with-resources (Res prints "open X" / "close X")', lang: 'java', code: code, hl: hl },
        { type: 'stack', label: 'Open resources (top = opened last = closed first)', items: open.slice(), hl: open.length ? one(open.length - 1, 'cur') : {} },
        { type: 'vars', label: 'Exception state', vals: { primary: primary, suppressed: sup.length ? '[' + sup.join(', ') + ']' : '[]' }, hl: { primary: primary === '—' ? '' : 'bad', suppressed: sup.length ? 'bad' : '' } },
        out(o.slice())
      ] });
    }
    res.forEach(function (r, i) {
      open.push(r.name); o.push('open ' + r.name);
      snap('open' + i, 'ok', 'Resource <b>' + r.name + '</b> is created and becomes "open". Resources are initialised <b>left to right / top to bottom</b>.' + (i === 0 ? ' If a later constructor throws, the ones already opened are still closed.' : ''));
    });
    o.push('body runs');
    snap('body', 'cur', 'All resources are open, so the body runs.');
    if (bodyThrows) {
      primary = '"body failed"';
      snap('throw', 'bad', '<span class="c-r">The body throws.</span> Before any catch or finally of this statement runs, Java first <b>closes every open resource</b>.');
    } else {
      snap('close', 'ok', 'The body finished normally. Now the automatic clean-up starts.');
    }
    for (var i = res.length - 1; i >= 0; i--) {
      var r = res[i];
      o.push('close ' + r.name);
      var msg = 'Closing <b>' + r.name + '</b> (reverse order: last opened, first closed — like a stack). ';
      if (r.bad) {
        if (primary === '—') { primary = '"close ' + r.name + ' failed"'; msg += '<span class="c-r">Its close() throws.</span> There is no exception yet, so this one becomes the <b>primary</b> exception.'; }
        else { sup.push('close ' + r.name + ' failed'); msg += '<span class="c-r">Its close() throws</span>, but a primary exception already exists, so this one is <b>attached as suppressed</b> (<code>primary.addSuppressed(...)</code>) instead of replacing it. Nothing is lost.'; }
      } else msg += 'close() succeeds.';
      msg += ' Closing continues with the remaining resources no matter what.';
      open.pop();
      snap('close', r.bad ? 'bad' : 'ok', msg);
    }
    if (primary !== '—') {
      o.push('caught: ' + primary.replace(/"/g, ''));
      snap(['catch', 'caught'], 'ok', 'All resources are closed. <b>Now</b> the catch block runs with the primary exception — notice the resources are already closed when you are inside catch.');
      if (sup.length) {
        sup.forEach(function (s) { o.push('  suppressed: ' + s); });
        snap(['sup', 'supp'], 'ok', '<code>getSuppressed()</code> returns the close() failures that happened while handling the primary one, so your logs show the whole story.');
      } else {
        snap(['sup', 'supp'], 'done', 'No suppressed exceptions this time — <code>getSuppressed()</code> is an empty array.');
      }
    } else {
      snap(['catch', 'caught'], 'done', 'No exception at all, so the catch block is skipped.');
    }
    o.push('finally');
    snap(['fin', 'finp'], 'cur', 'finally runs last of all — after the resources are closed and after catch.');
    snap([], 'done', 'Done. Order to remember: <b>open (in order) → body → close (reverse) → catch → finally</b>.');
    return frames;
  }

  topics.push({
    title: 'try-with-resources, AutoCloseable and Suppressed Exceptions',
    analogy: `<p>You borrow three books from a library: first a dictionary, then an atlas, then a novel, stacked in your arms. When you return them, you hand back the <b>top one first</b> — novel, atlas, dictionary: <b>reverse order</b>. If the atlas turns out to be damaged while you are already filling in a lost-card report, the librarian does not throw your first report away; she <b>staples a note</b> about the atlas to it. Try-with-resources is that librarian: it returns everything you borrowed, in reverse order, and staples secondary problems to the main one as <b>suppressed</b> exceptions.</p>`,
    explain: `<h4>1. The problem: resources must be closed</h4>
<p>Files, sockets, database connections and many other objects hold <b>operating-system resources</b> (file descriptors, network ports, DB sessions). The garbage collector frees memory, but it does <b>not</b> promptly close these. Forget to close them and the program eventually fails with <code>Too many open files</code> or a drained connection pool.</p>
<h4>2. The old way (before Java 7) — easy to get wrong</h4>
<pre><code>BufferedReader r = null;
try {
    r = new BufferedReader(new FileReader("a.txt"));
    return r.readLine();
} finally {
    if (r != null) r.close();   // close() can throw too — and then it HIDES the real error
}</code></pre>
<h4>3. The new way: try-with-resources (TWR)</h4>
<pre><code>try (BufferedReader r = Files.newBufferedReader(Path.of("a.txt"))) {
    return r.readLine();
}   // r.close() is called automatically, even on return or exception</code></pre>
<p>Any object whose class implements <code>java.lang.AutoCloseable</code> (one method: <code>void close() throws Exception</code>) can go in the brackets. <code>java.io.Closeable</code> is the older I/O version: it extends AutoCloseable, narrows the exception to <code>IOException</code>, and promises that calling <code>close()</code> twice is harmless.</p>
<h4>4. The exact order (memorise it)</h4>
${H.table(['Step', 'What happens'], [
  ['1', 'Resources are created <b>in the order written</b>'],
  ['2', 'The body runs'],
  ['3', 'Resources are closed in <b>reverse</b> order — always, even if the body threw or returned'],
  ['4', 'Then the <code>catch</code> blocks (if an exception is in flight) — resources are <b>already closed</b> here'],
  ['5', 'Then <code>finally</code>']
])}
<h4>5. Suppressed exceptions</h4>
<p>If the body throws exception A and then a <code>close()</code> throws B, Java keeps <b>A</b> as the exception you catch and calls <code>A.addSuppressed(B)</code>. You can read B later with <code>A.getSuppressed()</code>. If the body did <b>not</b> throw, an exception from close() becomes the main one. This fixes the "finally hides the real error" bug from the previous topic.</p>
<h4>6. Handy details</h4>
<ul>
<li>Several resources: separate with <code>;</code>. Each one is final inside the block.</li>
<li><b>Java 9+</b>: an existing <i>effectively final</i> variable can be used directly: <code>try (reader; writer) { … }</code>.</li>
<li>If a resource expression evaluates to <code>null</code>, TWR simply skips closing it (no NPE).</li>
<li>A TWR statement can have zero catch blocks and no finally — the resource is still closed.</li>
<li>Common AutoCloseables: all streams/readers/writers, <code>Scanner</code>, JDBC <code>Connection/Statement/ResultSet</code>, <code>Files.lines/list/walk</code> streams, <code>ExecutorService</code> (since Java 19 — <code>close()</code> waits for tasks to finish), <code>HttpClient</code> (Java 21).</li>
</ul>`,
    clues: [
      '"How do you make sure a file/connection is always closed?" → try-with-resources',
      '"In what order are resources closed?" → reverse of declaration order',
      '"What are suppressed exceptions?" → close() failures attached to the primary exception',
      '"Difference between AutoCloseable and Closeable" → exception type and idempotent close',
      '"Too many open files" / "connection pool exhausted" in a bug report → resource leak, missing TWR',
      '"Is the resource still open inside the catch block?" → no, closed before catch runs',
      'Output question with a custom class implementing AutoCloseable that prints in close() → reverse order + catch after close'
    ],
    code: [`
class Res implements AutoCloseable {
    private final String name;
    private final boolean failOnClose;

    Res(String name, boolean failOnClose) {
        this.name = name;
        this.failOnClose = failOnClose;
        System.out.println("open " + name);
    }

    @Override
    public void close() {                        // narrowed: throws nothing checked
        System.out.println("close " + name);
        if (failOnClose) throw new IllegalStateException("close " + name + " failed");
    }
}

class TwrDemo {
    public static void main(String[] args) {
        try (Res in = new Res("In", false);
             Res out = new Res("Out", true);      // its close() will throw
             Res log = new Res("Log", false)) {
            System.out.println("body runs");
            throw new IllegalStateException("body failed");
        } catch (Exception e) {
            System.out.println("caught: " + e.getMessage());
            for (Throwable s : e.getSuppressed()) {
                System.out.println("  suppressed: " + s.getMessage());
            }
        } finally {
            System.out.println("finally");
        }
    }
}
/* Output:
open In
open Out
open Log
body runs
close Log
close Out
close In
caught: body failed
  suppressed: close Out failed
finally
*/`],
    codeTitle: ['A resource that announces itself + the full ordering'],
    viz: {
      title: 'try-with-resources: open, body, close in reverse, catch, finally',
      input: 'In Out* Log BODY!',
      inputLabel: 'Resources in order (add * if close() throws), plus BODY! if the body throws',
      gen: twrFrames
    },
    examples: [
      {
        title: 'Reading a file the right way (and the Java 9 short form)',
        html: `<p>Both readers below are closed automatically. In the second method the reader is created elsewhere (for example passed in) and just listed in the brackets — allowed because it is effectively final.</p>`,
        code: `
import java.nio.file.*;
import java.nio.charset.StandardCharsets;

class ReadFirstLine {
    static String firstLine(Path p) throws IOException {
        try (BufferedReader r = Files.newBufferedReader(p, StandardCharsets.UTF_8)) {
            return r.readLine();                 // close() still runs after the return value is computed
        }
    }

    static int countLines(BufferedReader reader) throws IOException {
        try (reader) {                           // Java 9+: existing effectively-final variable
            int n = 0;
            while (reader.readLine() != null) n++;
            return n;
        }
    }

    public static void main(String[] args) throws IOException {
        System.out.println(countLines(new BufferedReader(new StringReader("a\\nb\\nc"))));   // 3
    }
}`
      },
      {
        title: 'Close failure with NO body failure becomes the main exception',
        html: `${H.table(['Body', 'close()', 'What you catch', 'getSuppressed()'], [
          ['ok', 'ok', 'nothing', '—'],
          ['ok', H.c('r', 'throws B'), H.c('r', 'B'), '[]'],
          [H.c('r', 'throws A'), 'ok', H.c('r', 'A'), '[]'],
          [H.c('r', 'throws A'), H.c('r', 'throws B'), H.c('r', 'A'), '[B]']
        ])}<p>This four-row table answers most TWR interview questions. Compare with plain <code>finally { close(); }</code>, where row 4 gives you <b>B</b> and loses A.</p>`
      },
      {
        title: 'The hidden leak in nested constructors',
        html: `<p><code>try (BufferedReader r = new BufferedReader(new FileReader(f)))</code> registers only the <b>outer</b> object as a resource. If the <code>BufferedReader</code> constructor threw (rare, e.g. OutOfMemoryError allocating its buffer), the inner <code>FileReader</code> would never be closed. The bullet-proof style declares <b>each</b> layer separately — closing the outer one also closes the inner one, and <code>Closeable.close()</code> is safe to call twice.</p>`,
        code: `
class SafeLayers {
    static String read(File f) throws IOException {
        try (FileReader fr = new FileReader(f);              // closed even if the next line fails
             BufferedReader br = new BufferedReader(fr)) {
            return br.readLine();
        }
    }
}`
      },
      {
        title: 'Locks are not AutoCloseable — but you can adapt them',
        html: `<p><code>ReentrantLock</code> does not implement AutoCloseable, so the standard pattern is <code>lock.lock(); try { … } finally { lock.unlock(); }</code>. Because AutoCloseable is a functional interface (one abstract method), you can make a tiny adapter with a lambda when it reads better.</p>`,
        code: `
class LockAsResource {
    static AutoCloseable acquire(Lock lock) {
        lock.lock();
        return lock::unlock;                    // AutoCloseable via method reference
    }

    public static void main(String[] args) throws Exception {
        Lock lock = new ReentrantLock();
        try (AutoCloseable held = acquire(lock)) {
            System.out.println("in critical section, held by me: " + ((ReentrantLock) lock).isHeldByCurrentThread());
        }
        System.out.println("released: " + !((ReentrantLock) lock).isLocked());
    }
}`
      }
    ],
    deepDive: `<h4>What javac generates</h4>
<p>TWR is pure syntax sugar. For one resource, javac produces roughly:</p>
<pre><code>final Res r = new Res();
Throwable primary = null;
try {
    body();
} catch (Throwable t) {
    primary = t;
    throw t;
} finally {
    if (r != null) {
        if (primary != null) {
            try { r.close(); } catch (Throwable x) { primary.addSuppressed(x); }
        } else {
            r.close();
        }
    }
}</code></pre>
<p>Several resources are desugared as <b>nested</b> TWR statements, which is exactly why they close in reverse order. Since JDK 11 javac emits this more compactly, but the semantics are unchanged.</p>
<h4>Suppression rules</h4>
<ul><li><code>addSuppressed(this)</code> throws <code>IllegalArgumentException</code> ("Self-suppression not permitted") — a subtle bug if close() rethrows the same exception instance.</li>
<li>An exception created with the protected constructor <code>Throwable(msg, cause, enableSuppression=false, writableStackTrace)</code> silently ignores <code>addSuppressed</code>. The JVM uses this for its pre-allocated OutOfMemoryError.</li>
<li><code>printStackTrace()</code> prints suppressed exceptions with a <code>Suppressed:</code> prefix, indented, so they are visible in logs.</li></ul>
<h4>Writing a good close()</h4>
<p>Make it <b>idempotent</b> (second call does nothing), make it <b>not throw</b> where possible, release resources in reverse order of acquisition, and narrow the <code>throws</code> clause (<code>close()</code> declaring <code>throws Exception</code> forces every user to catch Exception). Never rely on <code>finalize()</code> — it was deprecated for removal in Java 18 (JEP 421). For a safety net when users forget to close, use <code>java.lang.ref.Cleaner</code>, as the JDK's own classes do, but still document that close() is mandatory.</p>
<h4>Production reality</h4>
<p>Leaks show up as rising file-descriptor counts (<code>ls /proc/&lt;pid&gt;/fd | wc -l</code>, <code>lsof -p</code>) or pool metrics (HikariCP's <code>leakDetectionThreshold</code> logs where a connection was borrowed and never returned). Static analysers (SpotBugs <code>OBL_UNSATISFIED_OBLIGATION</code>, IntelliJ "resource opened but not safely closed", Error Prone <code>MustBeClosedChecker</code>) catch most of them at build time.</p>`,
    aiEra: `<p><b>What AI changes:</b> current assistants almost always produce TWR for files — the textbook leak is rarer in generated code. The leaks that remain are subtle: a <code>Stream&lt;String&gt;</code> from <code>Files.lines</code> returned from a method without being closed, a JDBC <code>ResultSet</code> passed out of a helper, an <code>InputStream</code> from an HTTP response that is never consumed and closed.</p>
<p><b>Where AI goes wrong:</b> it sometimes closes a resource the method does not <b>own</b> (closing <code>System.out</code> or a stream passed in by the caller), or writes close() that throws and breaks the suppression story. Ownership is a design decision: "who opens it, closes it".</p>
<p><b>Use AI as a partner:</b> <i>"Find every AutoCloseable created in this file and tell me who owns and closes each one"</i> is a great review prompt. Ask it to predict TWR output, then verify with the four-row table above.</p>
<p><b>What you must still own:</b> the ordering (open → body → close reverse → catch → finally), suppressed exceptions, and the ownership rule.</p>`,
    problems: [{
      title: 'Copy a Stream with a Buffer (and a File with Two Resources)',
      level: 'Medium', tags: ['try-with-resources', 'InputStream', 'buffer'], companies: ['Google', 'Microsoft', 'Oracle'],
      statement: `<p>Write <code>static long copy(InputStream in, OutputStream out) throws IOException</code> that copies <b>all</b> bytes using an 8 KB buffer and returns the number of bytes copied. It must <b>not</b> close the streams (the caller owns them). Then write <code>static long copyFile(Path src, Path dst)</code> that opens both files with try-with-resources and calls <code>copy</code>.</p>`,
      constraints: `Files may be bigger than memory (several GB), so you cannot read everything at once. <code>read(buf)</code> may return fewer bytes than the buffer size even before the end.`,
      example: `<p>A 20,000-byte input with an 8,192-byte buffer: reads return ${H.c('b', '8192')}, ${H.c('b', '8192')}, ${H.c('b', '3616')}, then ${H.c('r', '-1')} (end of stream). Total copied = ${H.c('g', '20000')}. Note the last write must use the count 3616, not the buffer length.</p>`,
      brute: {
        why: `<p>Reading and writing <b>one byte at a time</b> works but makes one method call (and, for unbuffered file streams, one system call) per byte — 20 million calls for a 20 MB file. Another naive version, <code>Files.readAllBytes</code>, loads the whole file into memory and fails with OutOfMemoryError on large files.</p>`,
        code: `
static long copySlow(InputStream in, OutputStream out) throws IOException {
    long n = 0;
    int b;
    while ((b = in.read()) != -1) {   // one call per byte
        out.write(b);
        n++;
    }
    return n;
}`
      },
      mcq: { q: 'After <code>int n = in.read(buf);</code> returns 3616 on the last chunk, what must you write?', options: ['<code>out.write(buf)</code>', '<code>out.write(buf, 0, n)</code>', '<code>out.write(buf, 0, buf.length)</code>', 'Nothing until the buffer is full'], answer: 1, explain: 'Only the first n bytes of the buffer are new data; the rest are stale bytes from the previous read.' },
      hints: [
        `<p>Hint 1: loop "read a chunk, write that chunk" until <code>read</code> returns −1. The return value is how many bytes were actually read this time.</p>`,
        `<p>Hint 2: <code>byte[] buf = new byte[8192]; int n; while ((n = in.read(buf)) != -1) { out.write(buf, 0, n); total += n; }</code>. Use a <code>long</code> total — files can exceed 2 GB.</p>`,
        `<p>Hint 3: in copyFile, put <b>both</b> streams in one TWR header: <code>try (InputStream in = Files.newInputStream(src); OutputStream out = Files.newOutputStream(dst))</code>. They close in reverse: out first (flushing data), then in. Do not close in <code>copy</code> — whoever opens a stream closes it.</p>`
      ],
      solution: {
        approach: `<p>A fixed 8 KB buffer gives constant memory. The loop condition both reads and tests for end of stream. copyFile owns both streams, so it opens them in one try-with-resources header; even if writing fails halfway, both files are closed. (In real code, <code>in.transferTo(out)</code> since Java 9 or <code>Files.copy</code> does the same job.)</p>`,
        code: `
import java.nio.file.*;

class StreamCopy {
    static long copy(InputStream in, OutputStream out) throws IOException {
        byte[] buf = new byte[8192];             // 8 KB: matches typical OS page/buffer sizes
        long total = 0;                          // long: files can be larger than 2 GB
        int n;
        while ((n = in.read(buf)) != -1) {       // n = bytes actually read this time (may be < 8192)
            out.write(buf, 0, n);                // write ONLY the fresh bytes
            total += n;
        }
        return total;                            // caller owns the streams: we do not close them
    }

    static long copyFile(Path src, Path dst) throws IOException {
        try (InputStream in = Files.newInputStream(src);
             OutputStream out = Files.newOutputStream(dst)) {   // CREATE + TRUNCATE_EXISTING by default
            return copy(in, out);
        }                                        // out closed first (flushes), then in
    }

    public static void main(String[] args) throws IOException {
        byte[] data = new byte[20_000];
        ByteArrayOutputStream sink = new ByteArrayOutputStream();
        System.out.println(copy(new ByteArrayInputStream(data), sink));   // 20000
        System.out.println(sink.size());                                   // 20000
    }
}`,
        dry: { head: ['iteration', 'read() returns', 'written', 'total'], rows: [
          ['1', '8192', 'buf[0..8191]', '8192'], ['2', '8192', 'buf[0..8191]', '16384'], ['3', '3616', 'buf[0..3615]', '20000'], ['4', H.c('r', '-1'), '— (loop ends)', H.c('g', '20000')]
        ] },
        complexity: `<p>O(N) time for N bytes with about N / 8192 read and write calls; O(1) extra memory (one 8 KB buffer) no matter how large the file is.</p>`,
        followUps: ['Report progress every 1 MB through a callback.', 'Make copyFile atomic: copy to a temp file, then move it into place.', 'Compare with <code>FileChannel.transferTo</code> — why can it be faster (zero-copy)?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Custom exceptions, chaining, translation & best practices
     ====================================================================== */
  function layerGraph(hl, ehl, tags) {
    return { type: 'graph', label: 'Layers of a web app (request → , ← response / exception)', directed: true, height: 30, nodes: [
      { id: 'C', label: 'Client', x: 9, y: 14, shape: 'box' },
      { id: 'W', label: 'Controller', x: 31, y: 14, shape: 'box' },
      { id: 'S', label: 'Service', x: 52, y: 14, shape: 'box' },
      { id: 'R', label: 'Repository', x: 72, y: 14, shape: 'box' },
      { id: 'D', label: 'Database', x: 92, y: 14, shape: 'box' }
    ], edges: [['C', 'W'], ['W', 'S'], ['S', 'R'], ['R', 'D']], hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
  }
  function translationFrames(input) {
    var sc = String(input || '').trim().toLowerCase();
    if (['ok', 'missing', 'dbdown', 'badinput'].indexOf(sc) < 0) throw new Error('Choose a scenario: ok, missing, dbdown or badinput');
    var frames = [], chain = [];
    function f(narr, hl, ehl, tags, vals, extra) {
      var parts = [layerGraph(hl, ehl, tags), { type: 'stack', label: 'Exception chain (top = what the caller sees; lower = "Caused by")', items: chain.slice(), hl: chain.length ? one(chain.length - 1, 'bad') : {} }];
      if (vals) parts.push({ type: 'vars', label: 'Request', vals: vals });
      (extra || []).forEach(function (p) { parts.push(p); });
      frames.push({ narr: narr, parts: parts });
    }
    var id = sc === 'badinput' ? -1 : 42;
    f('Client sends <code>GET /orders/' + id + '</code>.', { C: 'cur' }, { 'C-W': 'cur' }, {}, { orderId: id });
    if (sc === 'badinput') {
      chain.push('IllegalArgumentException: orderId must be positive, was -1');
      f('The <b>Controller</b> validates input at the edge and <b>fails fast</b>: <code>if (id &lt;= 0) throw new IllegalArgumentException(...)</code>. No point bothering the database with nonsense.', { W: 'bad' }, { 'C-W': 'done' }, { W: 'validate' }, { orderId: id });
      f('A global exception handler maps <code>IllegalArgumentException</code> → <b>400 Bad Request</b> with a clear message. It is the caller\'s mistake, so we tell them how to fix it.', { W: 'cur', C: 'ok' }, { 'C-W': 'ok' }, { C: '400' }, { orderId: id, status: '400 Bad Request' });
      f('Lesson: argument checks belong at the boundary, use standard unchecked exceptions, and map them to a client error code.', { C: 'sel' }, {}, { C: '400' }, { orderId: id, status: '400 Bad Request' });
      return frames;
    }
    f('The Controller calls <code>orderService.find(42)</code>.', { W: 'cur' }, { 'C-W': 'done', 'W-S': 'cur' }, {}, { orderId: id });
    f('The Service asks the Repository, which runs a SQL query against the Database.', { S: 'cur', R: 'cur' }, { 'W-S': 'done', 'S-R': 'cur', 'R-D': 'cur' }, {}, { orderId: id });
    if (sc === 'ok') {
      f('Database returns a row; Repository maps it to an <code>Order</code> object.', { D: 'ok', R: 'ok' }, { 'R-D': 'ok' }, {}, { orderId: id, result: 'Order#42' });
      f('Service and Controller pass it up. No exceptions on the happy path — and the try blocks cost nothing.', { S: 'ok', W: 'ok' }, { 'S-R': 'ok', 'W-S': 'ok' }, {}, { orderId: id, result: 'Order#42' });
      f('Client receives <b>200 OK</b> with JSON.', { C: 'sel' }, { 'C-W': 'ok' }, { C: '200' }, { orderId: id, status: '200 OK' });
      f('Try the other scenarios (missing, dbdown, badinput) to watch exceptions travel back.', { C: 'sel' }, {}, { C: '200' }, { orderId: id, status: '200 OK' });
      return frames;
    }
    if (sc === 'missing') {
      f('The query returns <b>no row</b>. That is not a failure of the database — the Repository returns <code>Optional.empty()</code>. Absence is a normal answer, not an exception, at this layer.', { D: 'ok', R: 'cur' }, { 'R-D': 'ok' }, { R: 'empty' }, { orderId: id });
      chain.push('OrderNotFoundException: order 42 not found');
      f('The <b>Service</b> knows the business rule "you asked for a specific order, it must exist" and throws a <b>custom, domain-specific</b> exception carrying the id: <code>orElseThrow(() -&gt; new OrderNotFoundException(42))</code>.', { S: 'bad' }, { 'S-R': 'ok' }, { S: 'throw' }, { orderId: id });
      f('The exception travels up through the Controller unchanged (it is unchecked, so no throws clauses everywhere).', { W: 'bad' }, { 'W-S': 'bad' }, {}, { orderId: id });
      f('The global handler maps <code>OrderNotFoundException</code> → <b>404 Not Found</b> using the <code>orderId</code> field, not by parsing the message text.', { W: 'cur', C: 'ok' }, { 'C-W': 'bad' }, { C: '404' }, { orderId: id, status: '404 Not Found' });
      f('Lesson: a custom exception with <b>fields</b> (orderId) lets handlers make decisions safely. Log it at INFO/WARN — it is an expected business outcome, not an outage.', { C: 'sel' }, {}, { C: '404' }, { orderId: id, status: '404 Not Found' });
      return frames;
    }
    chain.push('SQLException: Connection refused (db-1:5432)');
    f('<span class="c-r">The database is down.</span> The JDBC driver throws <code>SQLException</code> — a <b>checked</b>, low-level, vendor-specific exception.', { D: 'bad' }, { 'R-D': 'bad' }, { D: 'down' }, { orderId: id });
    chain.unshift('DataAccessException: findOrder(42) failed');
    f('The <b>Repository translates</b> it: <code>throw new DataAccessException("findOrder(42) failed", e)</code>. The new exception speaks the language of our app, is unchecked, and <b>keeps the original as its cause</b> (the stack now shows a "Caused by").', { R: 'bad' }, { 'R-D': 'bad', 'S-R': 'bad' }, { R: 'wrap' }, { orderId: id });
    f('The Service has nothing useful to add, so it does <b>not</b> catch it. No log-and-rethrow (that would print the same error twice).', { S: 'bad' }, { 'S-R': 'bad', 'W-S': 'bad' }, {}, { orderId: id });
    f('The global handler logs it <b>once</b>, at ERROR, with the full chain, and returns <b>503 Service Unavailable</b> (or 500). The client gets a safe generic message — never the SQL text or stack trace.', { W: 'cur', C: 'bad' }, { 'C-W': 'bad' }, { C: '503' }, { orderId: id, status: '503' });
    f('Reading the log, an engineer looks at the <b>bottom</b> of the chain: the root cause is the refused connection. Translation added context without losing the truth.', { D: 'sel' }, {}, { C: '503', D: 'root cause' }, { orderId: id, status: '503' });
    return frames;
  }

  topics.push({
    title: 'Custom Exceptions, Chaining, Translation and Best Practices',
    analogy: `<p>When your family doctor sends you to a specialist, she writes a <b>referral letter</b> in the specialist's language — "suspected fracture of the left wrist" — instead of forwarding your own words "my hand hurts after football". But she <b>staples the original X-ray</b> to the letter. The specialist gets a clear, domain-level message <i>and</i> the raw evidence.</p>
<p>That is <b>exception translation with chaining</b>: a layer catches a low-level exception (<code>SQLException</code>), throws a new one that makes sense at its level (<code>OrderRepositoryException</code>), and passes the original as the <b>cause</b>. Throwing away the X-ray (dropping the cause) is malpractice.</p>`,
    explain: `<h4>1. Writing a custom exception</h4>
<p>A custom exception is just a class that extends <code>Exception</code> (checked) or <code>RuntimeException</code> (unchecked). Give it the standard constructors and, ideally, <b>fields</b> that carry useful data:</p>
<pre><code>public class InsufficientFundsException extends Exception {        // checked: caller can recover
    private final long shortBy;
    public InsufficientFundsException(String msg, long shortBy) {
        super(msg);
        this.shortBy = shortBy;
    }
    public long getShortBy() { return shortBy; }
}</code></pre>
<h4>2. When is a custom exception worth it?</h4>
<ul>
<li><b>Yes</b> — when callers need to <b>react differently</b> to it (show "top up your wallet", return 404, retry), or when it carries data (amount, id, error code).</li>
<li><b>No</b> — when a standard one already says it: <code>IllegalArgumentException</code> (bad argument), <code>IllegalStateException</code> (wrong time to call this), <code>NullPointerException</code> (via <code>Objects.requireNonNull</code>), <code>UnsupportedOperationException</code>, <code>NoSuchElementException</code>, <code>IndexOutOfBoundsException</code>.</li>
</ul>
<h4>3. Chaining: always keep the cause</h4>
<pre><code>catch (SQLException e) {
    throw new DataAccessException("loading order " + id, e);   // e becomes getCause()
}</code></pre>
<p>The stack trace then shows <code>Caused by: java.sql.SQLException: …</code>. Without <code>e</code> you lose the real reason — the number-one exception mistake in code reviews.</p>
<h4>4. Best-practice checklist (interview gold)</h4>
${H.table(['Do', 'Don\'t'], [
  ['Catch the most <b>specific</b> type you can handle', '<code>catch (Exception e)</code> deep inside business logic'],
  ['Handle it, or let it propagate', H.c('r', 'Swallow it: <code>catch (IOException e) { }</code>')],
  ['Log <b>once</b>, at the boundary (global handler)', 'Log and rethrow at every layer (the same error logged 5 times)'],
  ['Wrap with context and the cause', '<code>throw new RuntimeException(e.getMessage())</code> — cause lost'],
  ['Fail fast: validate arguments at the start', 'Let bad data travel deep and fail mysteriously later'],
  ['Clean up with try-with-resources', 'Manual close in finally'],
  ['Restore the interrupt flag after <code>InterruptedException</code>', 'Catch and ignore InterruptedException'],
  ['Use <code>Optional</code> or a result for normal "not found"', 'Use exceptions for normal control flow (loop exits, lookups)'],
  ['Document with <code>@throws</code> in Javadoc', 'Declare <code>throws Exception</code> everywhere']
])}
<h4>5. Checked or unchecked for your custom exception?</h4>
<p>Ask: <i>"Can a typical caller do something sensible about this right here?"</i> If yes and it is part of the contract (insufficient funds, file chosen by the user is missing) → checked is reasonable. If it is a bug, a broken invariant or an infrastructure outage the caller cannot fix → unchecked. Many teams simply make their whole hierarchy unchecked under one base class like <code>AppException</code>, and map subclasses to HTTP status codes in one place.</p>`,
    clues: [
      '"How do you create a custom exception?" → extend Exception/RuntimeException, constructors with message + cause, fields',
      '"What is exception chaining / wrapping?" → new exception with the original as cause',
      '"Exception handling best practices" → specific catch, no swallowing, log once, fail fast, no control flow',
      'Code review snippet with an empty catch block or <code>e.printStackTrace()</code> → swallowed exception smell',
      '"How should the service layer report a missing order?" → custom domain exception mapped to 404, or Optional',
      '"How do you handle InterruptedException?" → restore the flag or propagate',
      '"Should a repository leak SQLException to the controller?" → translate at layer boundaries'
    ],
    code: [`
class AppException extends RuntimeException {                 // base of our unchecked hierarchy
    AppException(String message) { super(message); }
    AppException(String message, Throwable cause) { super(message, cause); }
}

class OrderNotFoundException extends AppException {           // carries data, not just text
    private final long orderId;
    OrderNotFoundException(long orderId) {
        super("order " + orderId + " not found");
        this.orderId = orderId;
    }
    long orderId() { return orderId; }
}

class DataAccessException extends AppException {
    DataAccessException(String message, Throwable cause) { super(message, cause); }
}

class OrderService {
    private final Map<Long, String> db = new HashMap<>(Map.of(1L, "Book", 2L, "Pen"));
    private boolean dbDown;

    Optional<String> findRow(long id) throws IOException {     // low level: "absence" is normal
        if (dbDown) throw new IOException("connection refused");
        return Optional.ofNullable(db.get(id));
    }

    String getOrder(long id) {
        if (id <= 0) throw new IllegalArgumentException("id must be positive, was " + id); // fail fast
        try {
            return findRow(id).orElseThrow(() -> new OrderNotFoundException(id));
        } catch (IOException e) {
            throw new DataAccessException("getOrder(" + id + ") failed", e);   // translate + keep cause
        }
    }

    public static void main(String[] args) {
        OrderService s = new OrderService();
        System.out.println(s.getOrder(1));                       // Book
        try {
            s.getOrder(9);
        } catch (OrderNotFoundException e) {
            System.out.println("404 for order " + e.orderId());   // 404 for order 9
        }
        s.dbDown = true;
        try {
            s.getOrder(1);
        } catch (AppException e) {
            System.out.println(e.getMessage() + " <- caused by " + e.getCause().getMessage());
        }
    }
}`],
    codeTitle: ['A small, realistic exception hierarchy with translation'],
    viz: {
      title: 'Exception translation across layers',
      input: 'dbdown',
      inputLabel: 'Scenario: ok | missing | dbdown | badinput',
      gen: translationFrames
    },
    examples: [
      {
        title: 'Swallowed exception: the bug that hides other bugs',
        html: `<p>Before: the config fails to load, the code silently continues with <code>null</code>, and an NPE appears 300 lines later with no hint of the real cause. After: fail fast with context and the cause attached.</p>`,
        code: `
import java.nio.file.*;

class ConfigLoader {
    // BAD: swallows the real error
    static String loadBad(Path p) {
        try {
            return Files.readString(p);
        } catch (IOException e) {
            return null;                         // caller gets null; nobody knows why
        }
    }

    // GOOD: translate, add context, keep the cause
    static String loadGood(Path p) {
        try {
            return Files.readString(p);
        } catch (IOException e) {
            throw new UncheckedIOException("cannot load config from " + p.toAbsolutePath(), e);
        }
    }
}`
      },
      {
        title: 'Reading a chained stack trace',
        html: `<pre><code>DataAccessException: getOrder(1) failed
    at OrderService.getOrder(OrderService.java:31)
    at OrderService.main(OrderService.java:44)
Caused by: java.io.IOException: connection refused
    at OrderService.findRow(OrderService.java:24)
    ... 2 more</code></pre>
<p>The top line tells you <b>what the app was trying to do</b>; the last "Caused by" tells you <b>why it failed</b>. "... 2 more" means those frames are identical to the ones above — Java trims the duplicates.</p>`
      },
      {
        title: 'InterruptedException: never just swallow it',
        html: `<p>Interruption is how one thread politely asks another to stop. Catching <code>InterruptedException</code> <b>clears</b> the thread's interrupt flag, so if you cannot rethrow it, set the flag again so code higher up still sees the request.</p>`,
        code: `
class Sleeper {
    static boolean pause(long ms) {
        try {
            Thread.sleep(ms);
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();     // restore the flag: "someone asked us to stop"
            return false;
        }
    }

    public static void main(String[] args) {
        Thread.currentThread().interrupt();          // simulate a stop request
        System.out.println(pause(1000));             // false (sleep fails immediately)
        System.out.println(Thread.currentThread().isInterrupted());   // true: flag preserved
    }
}`
      },
      {
        title: 'Fail fast with the standard toolbox',
        html: `<p>Validate at the top of public methods with one-liners. They throw standard unchecked exceptions with clear messages, before any state is changed.</p>`,
        code: `
class Account {
    private long balance;
    private boolean closed;

    void withdraw(String currency, long amount) {
        Objects.requireNonNull(currency, "currency");                       // NPE with a name
        if (amount <= 0) throw new IllegalArgumentException("amount must be > 0: " + amount);
        if (closed) throw new IllegalStateException("account is closed");   // wrong time to call
        if (amount > balance) throw new IllegalStateException("insufficient funds: balance " + balance);
        balance -= amount;
    }

    public static void main(String[] args) {
        Account a = new Account();
        a.balance = 100;
        try { a.withdraw("INR", -5); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
        a.withdraw("INR", 40);
        System.out.println(a.balance);   // 60
    }
}`
      }
    ],
    deepDive: `<h4>Designing an exception hierarchy</h4>
<p>A common production layout: one unchecked base (<code>AppException</code>) with an <b>error code</b> enum, subclasses grouped by how they should be handled — <code>ClientException</code> (4xx: validation, not found, conflict) and <code>ServerException</code> (5xx: dependency down, timeout). A single global handler (Spring's <code>@RestControllerAdvice</code>, a gRPC interceptor, a servlet filter) maps them to status codes and problem-detail JSON (RFC 9457). With Java 17+ you can make the base <code>sealed</code> and use pattern-matching <code>switch</code> so the compiler checks you mapped every kind.</p>
<h4>Cost and lightweight exceptions</h4>
<p>Creating an exception captures the stack (<code>fillInStackTrace</code>), costing roughly 1–50 µs depending on depth. For exceptions used as high-frequency signals (parsers, validation of millions of rows), you can use the protected constructor <code>super(msg, null, false, false)</code> to disable stack traces and suppression, or override <code>fillInStackTrace()</code> to return <code>this</code>. Better still: do not use exceptions for expected outcomes at all — return <code>Optional</code>, a boolean, or a result object.</p>
<h4>Exceptions are Serializable</h4>
<p><code>Throwable</code> implements <code>Serializable</code>, so custom exceptions technically need a <code>serialVersionUID</code> (RMI and some frameworks send exceptions across the wire). Keep fields serializable or mark them <code>transient</code>. Keep exceptions <b>immutable</b> — they may be shared across threads and logged later.</p>
<h4>Logging the right way</h4>
<p>Pass the exception as the last argument (<code>log.error("charge failed for order {}", id, e)</code>) so the logger prints the full chain; <code>log.error("failed: " + e)</code> prints only the toString. Never put secrets or personal data in exception messages — they end up in logs, error trackers and sometimes HTTP responses (OWASP: information exposure through error messages).</p>
<h4>Errors at boundaries: threads, async, streams</h4>
<p>Exceptions do not cross thread boundaries by themselves. <code>Future.get()</code> wraps them in <code>ExecutionException</code>; <code>CompletableFuture.join()</code> wraps in <code>CompletionException</code>; unwrap with <code>getCause()</code>. Lambdas in streams cannot throw checked exceptions, so wrap them (<code>UncheckedIOException</code>) inside the lambda and unwrap outside.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating an exception class with four constructors is now a one-second task. The valuable skill is <b>exception design</b>: which failures deserve their own type, what data they carry, where translation happens, where logging happens, and how they map to API responses.</p>
<p><b>Where AI goes wrong:</b> it loves <code>catch (Exception e) { log.error(e.getMessage()); throw new RuntimeException(e.getMessage()); }</code> — loses the cause, logs twice, and catches bugs it should not. It also invents a new custom exception for every method, creating dozens of types nobody handles differently.</p>
<p><b>Use AI as a partner:</b> <i>"Review this module's error handling: list swallowed exceptions, lost causes, double logging, and catch blocks that are too broad"</i> — assistants are good at this mechanical audit. For AI-agent tooling (MCP servers, tool calls), turn exceptions into <b>clear, structured error messages</b> the model can act on ("order 42 not found; valid ids are positive integers") rather than raw stack traces.</p>
<p><b>What you must still own:</b> the checked-vs-unchecked decision, the "translate at the boundary, log once" architecture, and explaining it crisply in a design interview.</p>`,
    problems: [{
      title: 'Retry an I/O Task and Keep the Failure History',
      level: 'Medium', tags: ['custom exception', 'chaining', 'suppressed', 'functional interface'], companies: ['Amazon', 'Uber', 'Flipkart'],
      statement: `<p>Write <code>static &lt;T&gt; T retry(IoTask&lt;T&gt; task, int maxAttempts)</code>, where <code>IoTask&lt;T&gt;</code> is a functional interface with <code>T run() throws IOException</code>. Retry only on <code>IOException</code>; any other exception must propagate immediately. If every attempt fails, throw your own unchecked <code>RetryExhaustedException</code> whose <b>cause</b> is the last failure and whose <b>suppressed</b> list holds the earlier failures, in order.</p>`,
      constraints: `1 ≤ maxAttempts ≤ 10; reject other values with <code>IllegalArgumentException</code>. No sleeping needed.`,
      example: `<p>A task that fails with ${H.c('r', 'IOException("timeout #1")')}, ${H.c('r', '"timeout #2"')}, then succeeds → returns ${H.c('g', '"OK on attempt 3"')}.<br>With maxAttempts = 2 instead → throws <code>RetryExhaustedException("failed after 2 attempts")</code>, cause = timeout #2, suppressed = [timeout #1]. Nothing is lost: the full history is in one exception.</p>`,
      brute: {
        why: `<p>The naive version catches <code>Exception</code> (so it also retries real bugs like NPE), and at the end throws <code>new RuntimeException("failed")</code> — no cause, no history. In production you would see "failed" with no idea whether it was a timeout, DNS or a permission problem.</p>`,
        code: `
interface IoTask0<T> { T run() throws IOException; }

static <T> T retryNaive(IoTask0<T> task, int maxAttempts) {
    for (int i = 0; i < maxAttempts; i++) {
        try {
            return task.run();
        } catch (Exception e) {               // too broad: retries bugs too
            // history thrown away
        }
    }
    throw new RuntimeException("failed");     // no cause!
}`
      },
      mcq: { q: 'Where should the earlier failures go so that <code>printStackTrace()</code> shows them all?', options: ['Concatenate their messages into the new message', 'Pass the last one as cause and add earlier ones with <code>addSuppressed</code>', 'Log each one and drop them', 'Store them in a static list'], answer: 1, explain: 'cause = the most relevant failure; suppressed = the extra ones. Both are printed by printStackTrace and by logging frameworks.' },
      hints: [
        `<p>Hint 1: catching only <code>IOException</code> automatically lets every other exception propagate — no extra code needed. Keep a <code>List&lt;IOException&gt;</code> of failures.</p>`,
        `<p>Hint 2: the custom exception needs a <code>(String message, Throwable cause)</code> constructor that calls <code>super(message, cause)</code>. After the loop, build it with the last failure as cause.</p>`,
        `<p>Hint 3: add failures 0 … size−2 with <code>addSuppressed</code>. Validate maxAttempts first. Recipe: for attempt in 1..max → try return task.run() catch IOException → remember; after loop → build + throw.</p>`
      ],
      solution: {
        approach: `<p>Loop up to maxAttempts; return on the first success. Catch only <code>IOException</code> and remember it. After the loop, create a custom unchecked exception with the last failure as its cause and the others as suppressed exceptions, so a single log line shows the complete story.</p>`,
        code: `
class Retry {
    static class RetryExhaustedException extends RuntimeException {
        RetryExhaustedException(String message, Throwable cause) { super(message, cause); }
    }

    @FunctionalInterface
    interface IoTask<T> { T run() throws IOException; }

    static <T> T retry(IoTask<T> task, int maxAttempts) {
        if (maxAttempts < 1 || maxAttempts > 10)
            throw new IllegalArgumentException("maxAttempts must be 1..10, was " + maxAttempts);
        List<IOException> failures = new ArrayList<>();
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return task.run();                         // success: done
            } catch (IOException e) {                      // only I/O problems are retried
                failures.add(e);
            }
        }
        IOException last = failures.get(failures.size() - 1);
        RetryExhaustedException ex = new RetryExhaustedException("failed after " + maxAttempts + " attempts", last);
        for (int i = 0; i < failures.size() - 1; i++) ex.addSuppressed(failures.get(i));
        throw ex;
    }

    public static void main(String[] args) {
        int[] calls = {0};
        IoTask<String> flaky = () -> {
            calls[0]++;
            if (calls[0] < 3) throw new IOException("timeout #" + calls[0]);
            return "OK on attempt " + calls[0];
        };
        System.out.println(retry(flaky, 5));               // OK on attempt 3

        calls[0] = 0;
        try {
            retry(flaky, 2);
        } catch (RetryExhaustedException e) {
            System.out.println(e.getMessage() + ", cause=" + e.getCause().getMessage()
                + ", suppressed=" + e.getSuppressed().length);   // failed after 2 attempts, cause=timeout #2, suppressed=1
        }
    }
}`,
        dry: { head: ['attempt', 'task.run()', 'failures list', 'action'], rows: [
          ['1', H.c('r', 'IOException timeout #1'), '[#1]', 'retry'],
          ['2', H.c('r', 'IOException timeout #2'), '[#1, #2]', 'retry (if max ≥ 3)'],
          ['3', H.c('g', 'returns "OK on attempt 3"'), '[#1, #2]', 'return result'],
          ['(max = 2) after loop', '—', '[#1, #2]', 'throw RetryExhausted(cause #2, suppressed [#1])']
        ] },
        complexity: `<p>O(maxAttempts) calls and O(maxAttempts) memory for the failure list.</p>`,
        followUps: ['Add exponential backoff with jitter (and handle InterruptedException correctly while sleeping).', 'Retry only on specific IOException subclasses (e.g. <code>SocketTimeoutException</code>), never on <code>FileNotFoundException</code>.', 'Make it generic over the exception type: <code>&lt;T, E extends Exception&gt;</code>.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — java.io vs java.nio: streams, readers, charsets, buffers
     ====================================================================== */
  function utf8Bytes(ch) {
    var enc = encodeURIComponent(ch), bytes = [];
    if (enc.charAt(0) !== '%') { for (var i = 0; i < enc.length; i++) bytes.push(enc.charCodeAt(i)); return bytes; }
    enc.split('%').slice(1).forEach(function (h) { bytes.push(parseInt(h, 16)); });
    return bytes;
  }
  function hex(b) { return (b < 16 ? '0' : '') + b.toString(16).toUpperCase(); }
  function ioChain(hl, ehl) {
    return { type: 'graph', label: 'java.io decorator chain (each box wraps the one to its left)', directed: true, height: 22, nodes: [
      { id: 'F', label: 'file on disk', x: 9, y: 10, shape: 'box' },
      { id: 'I', label: 'FileInputStream', x: 32, y: 10, shape: 'box' },
      { id: 'R', label: 'InputStreamReader(UTF-8)', x: 63, y: 10, shape: 'box' },
      { id: 'B', label: 'BufferedReader', x: 90, y: 10, shape: 'box' }
    ], edges: [['F', 'I', 'bytes'], ['I', 'R', 'bytes'], ['R', 'B', 'chars']], hl: hl || {}, ehl: ehl || {} };
  }
  function decodeFrames(input) {
    var s = String(input === undefined ? '' : input);
    var chars = Array.from(s);
    if (!chars.length || chars.length > 10) throw new Error('Type 1 to 10 characters, e.g. héllo☕');
    var frames = [], bytes = [], owner = [];
    frames.push({ narr: 'Files store <b>bytes</b>, programs think in <b>characters</b>. A <b>charset</b> is the dictionary between them. In java.io, <code>InputStream</code>/<code>OutputStream</code> move bytes and <code>Reader</code>/<code>Writer</code> move chars; <code>InputStreamReader</code> is the bridge that uses a charset.', parts: [ioChain({ R: 'cur' }), { type: 'array', label: 'Your text (characters)', values: chars }] });
    chars.forEach(function (c, i) {
      var b = utf8Bytes(c);
      b.forEach(function (x) { bytes.push(x); owner.push(i); });
      var hlB = {}; for (var k = bytes.length - b.length; k < bytes.length; k++) hlB[k] = 'ok';
      frames.push({ narr: 'Encode <b>' + esc(c) + '</b> (U+' + c.codePointAt(0).toString(16).toUpperCase() + ') in UTF-8 → <b>' + b.length + ' byte' + (b.length > 1 ? 's' : '') + '</b>: ' + b.map(hex).join(' ') + '. ' + (b.length === 1 ? 'Plain ASCII stays 1 byte.' : b.length === 4 ? 'Characters outside the BMP (emoji) take 4 bytes — and 2 Java <code>char</code>s.' : 'Non-ASCII letters need ' + b.length + ' bytes.'), parts: [
        { type: 'array', label: 'Characters', values: chars, hl: one(i, 'cur') },
        { type: 'array', label: 'Bytes written to the file (hex)', values: bytes.map(hex), hl: hlB }
      ] });
    });
    frames.push({ narr: 'The file now holds <b>' + bytes.length + ' bytes</b> for <b>' + chars.length + ' characters</b>' + (s.length !== chars.length ? ' (and Java\'s <code>String.length()</code> says ' + s.length + ' because emoji use two <code>char</code>s)' : '') + '. <code>File.length()</code> / <code>Files.size()</code> count bytes, not characters.', parts: [
      { type: 'array', label: 'Bytes on disk', values: bytes.map(hex) },
      { type: 'vars', label: 'Counts', vals: { characters: chars.length, 'String.length()': s.length, 'UTF-8 bytes': bytes.length } }
    ] });
    frames.push({ narr: 'Reading back with the <b>same</b> charset (UTF-8): the reader groups the bytes correctly and you get your text back exactly.', parts: [ioChain({ F: 'ok', I: 'ok', R: 'ok', B: 'ok' }, { 'F-I': 'ok', 'I-R': 'ok', 'R-B': 'ok' }), { type: 'array', label: 'Decoded with UTF-8', values: chars, hl: (function () { var h = {}; chars.forEach(function (_, i) { h[i] = 'ok'; }); return h; })() }] });
    var latin = bytes.map(function (b) { return b >= 0x80 && b < 0xA0 ? '\\x' + hex(b) : String.fromCharCode(b); });
    var bad = {}; bytes.forEach(function (b, i) { if (b >= 0x80) bad[i] = 'bad'; });
    frames.push({ narr: Object.keys(bad).length ? '<span class="c-r">Reading with the WRONG charset</span> (ISO-8859-1, one byte = one char): every multi-byte character turns into garbage like <b>Ã©</b>. This is called <b>mojibake</b>. Before Java 18 the default charset depended on the OS (Windows often used Cp1252), so <code>new FileReader(f)</code> could corrupt text on one machine and not on another.' : 'Your text is pure ASCII, so even the wrong charset (ISO-8859-1) decodes it correctly — ASCII is the same in almost every charset. Try <b>héllo☕</b> to see what goes wrong.', parts: [{ type: 'array', label: 'Decoded with ISO-8859-1', values: latin, hl: bad }, { type: 'array', label: 'Bytes', values: bytes.map(hex), hl: bad }] });
    frames.push({ narr: 'Rule: <b>always name the charset</b> — <code>Files.newBufferedReader(p, UTF_8)</code>, <code>new InputStreamReader(in, UTF_8)</code>. Since <b>Java 18 (JEP 400)</b> the default is UTF-8 everywhere, but explicit is still clearer and safe on old JVMs.', parts: [{ type: 'code', label: 'Safe', lang: 'java', code: 'try (BufferedReader r = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {\n    String line = r.readLine();\n}', hl: { 1: 'ok' } }] });
    return frames;
  }
  function byteBufferFrames(input) {
    var ops = String(input || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
    if (!ops.length || ops.length > 20) throw new Error('Comma-separated ops (max 20): put X, get, flip, clear, compact, rewind');
    var CAP = 8, buf = [], pos = 0, lim = CAP, frames = [], got = [];
    for (var i = 0; i < CAP; i++) buf.push('·');
    function snap(narr, cls, extraHl) {
      var hl = {}, ptr = {};
      for (var i = pos; i < lim && i < CAP; i++) hl[i] = 'win';
      if (extraHl !== undefined) hl[extraHl] = cls || 'cur';
      if (pos < CAP) ptr[pos] = 'pos';
      if (lim < CAP) ptr[lim] = ptr[lim] ? ['pos', 'lim'] : 'lim';
      frames.push({ narr: narr, parts: [
        { type: 'array', label: 'ByteBuffer (capacity ' + CAP + '; blue = between position and limit)', values: buf.slice(), hl: hl, ptr: ptr, showIdx: true },
        { type: 'vars', label: 'Buffer state', vals: { position: pos, limit: lim, capacity: CAP, remaining: lim - pos } },
        { type: 'array', label: 'Values read so far', values: got.length ? got.slice() : ['—'] }
      ] });
    }
    snap('A new <code>ByteBuffer.allocate(8)</code> is in <b>write mode</b>: position 0, limit = capacity. The blue region is where you may <b>put</b>.');
    for (i = 0; i < ops.length; i++) {
      var op = ops[i], m = /^put\s+(\S{1,3})$/i.exec(op), lo = op.toLowerCase();
      if (m) {
        if (pos >= lim) { snap('<span class="c-r">BufferOverflowException</span>: position (' + pos + ') reached limit (' + lim + '). There is no room — you forgot to <code>clear()</code> or <code>compact()</code>.', 'bad'); return frames; }
        buf[pos] = m[1]; pos++;
        snap('<code>put(' + esc(m[1]) + ')</code> writes at position ' + (pos - 1) + ' and moves position forward to ' + pos + '.', 'ok', pos - 1);
      } else if (lo === 'get') {
        if (pos >= lim) { snap('<span class="c-r">BufferUnderflowException</span>: nothing left between position and limit. Did you forget <code>flip()</code> after writing?', 'bad'); return frames; }
        got.push(buf[pos]); pos++;
        snap('<code>get()</code> reads <b>' + esc(buf[pos - 1]) + '</b> at index ' + (pos - 1) + ' and advances position to ' + pos + '.', 'sel', pos - 1);
      } else if (lo === 'flip') {
        lim = pos; pos = 0;
        snap('<code>flip()</code>: limit = old position (' + lim + '), position = 0. Write mode → <b>read mode</b>: now the blue region is exactly the data you wrote. Forgetting flip is the #1 NIO bug.');
      } else if (lo === 'clear') {
        pos = 0; lim = CAP;
        snap('<code>clear()</code>: position = 0, limit = capacity. Back to write mode. The old bytes are <b>not erased</b>, just considered free.');
      } else if (lo === 'rewind') {
        pos = 0;
        snap('<code>rewind()</code>: position = 0, limit unchanged — read the same data again.');
      } else if (lo === 'compact') {
        var rest = buf.slice(pos, lim);
        for (var k = 0; k < rest.length; k++) buf[k] = rest[k];
        pos = rest.length; lim = CAP;
        snap('<code>compact()</code>: the ' + rest.length + ' unread byte(s) are copied to the front, position = ' + pos + ', limit = capacity. Back in write mode <b>without losing unread data</b> — ideal for partial network reads.');
      } else throw new Error('Unknown op "' + op + '". Use: put X, get, flip, clear, compact, rewind');
    }
    snap('Done. The life cycle of every NIO buffer: <b>put … → flip → get … → clear/compact → put …</b>');
    return frames;
  }

  topics.push({
    title: 'java.io vs java.nio: Streams, Readers, Charsets, Buffers and Channels',
    analogy: `<p><b>java.io</b> is a <b>garden hose</b>. Water (bytes) flows in one direction, one drop after another, and you stand there holding it until it is done (blocking). You can screw <b>attachments</b> on the end — a filter (buffering), a sprinkler that turns water into spray (bytes into characters) — that is the <b>decorator pattern</b>.</p>
<p><b>java.nio</b> is a <b>delivery depot</b>. Goods move in <b>crates</b> (buffers) along <b>two-way roads</b> (channels), and one <b>dispatcher</b> (a selector) can watch a hundred roads at once and only send a truck where something is ready. And <b>NIO.2</b> (<code>Path</code> + <code>Files</code>, Java 7) is a friendly, modern <b>file clerk</b> who does the common jobs — read, write, copy, move, walk folders — in one call and gives you a clear reason when something fails.</p>`,
    explain: `<h4>1. java.io (Java 1.0): four abstract base classes</h4>
${H.table(['', 'Input', 'Output'], [
  ['<b>Bytes</b> (images, zip, any binary)', '<code>InputStream</code>', '<code>OutputStream</code>'],
  ['<b>Characters</b> (text)', '<code>Reader</code>', '<code>Writer</code>']
])}
<p>Concrete classes either <b>connect to a source</b> (<code>FileInputStream</code>, <code>ByteArrayInputStream</code>, <code>StringReader</code>, socket streams) or <b>wrap another stream</b> to add a feature (<code>BufferedInputStream</code>, <code>BufferedReader</code>, <code>DataInputStream</code>, <code>ObjectInputStream</code>, <code>GZIPInputStream</code>, <code>PrintWriter</code>). The <b>bridges</b> <code>InputStreamReader</code>/<code>OutputStreamWriter</code> turn bytes into chars using a <b>charset</b>.</p>
<pre><code>new BufferedReader(new InputStreamReader(new FileInputStream("a.txt"), UTF_8))
//  ^ adds buffering + readLine   ^ bytes → chars           ^ reads bytes from the file</code></pre>
<h4>2. java.nio (Java 1.4): buffers, channels, selectors</h4>
<ul>
<li><b>Buffer</b> — a fixed-size box of primitive values with <code>position</code>, <code>limit</code>, <code>capacity</code>. You <code>put</code>, then <code>flip()</code>, then <code>get</code> (see the visualizer).</li>
<li><b>Channel</b> — a two-way connection to a file or socket that reads into / writes from buffers (<code>FileChannel</code>, <code>SocketChannel</code>).</li>
<li><b>Selector</b> — lets <b>one thread</b> watch many non-blocking socket channels. This is the engine under Netty, Tomcat NIO and most high-performance Java servers.</li>
</ul>
<h4>3. NIO.2 (Java 7): Path and Files — what you should use for files today</h4>
<p><code>Path.of("data", "orders.csv")</code> (Java 11; <code>Paths.get</code> before) describes a location. The <code>Files</code> class has static helpers for nearly everything: <code>readString</code>, <code>readAllLines</code>, <code>lines</code>, <code>newBufferedReader</code>, <code>writeString</code>, <code>write</code>, <code>copy</code>, <code>move</code>, <code>delete</code>, <code>exists</code>, <code>size</code>, <code>createDirectories</code>, <code>list</code>, <code>walk</code>, <code>mismatch</code>.</p>
<h4>4. Side-by-side</h4>
${H.table(['', 'java.io', 'java.nio'], [
  ['Model', 'Stream: one byte/char after another', 'Buffer + channel: blocks of data'],
  ['Direction', 'One-way (input OR output)', 'Channels can be two-way'],
  ['Blocking', 'Always blocking', 'Blocking or non-blocking (sockets) + selectors'],
  ['Files API', '<code>java.io.File</code>: vague errors (<code>delete()</code> returns false)', '<code>Path</code>/<code>Files</code>: precise exceptions, symlinks, attributes, walking'],
  ['Best for', 'Simple sequential reading/writing, wrapping, legacy APIs', 'File management, big files, memory mapping, many network connections']
])}
<h4>5. Charsets — the silent bug</h4>
<p>A file contains bytes; text needs a charset to decode them. "é" is 1 byte in ISO-8859-1 but 2 bytes in UTF-8. Decode with the wrong one and you get <b>mojibake</b> ("hÃ©llo"). Since <b>Java 18</b> the default charset is UTF-8 on every OS (JEP 400); before that it was the platform's (often Cp1252 on Windows). Always pass <code>StandardCharsets.UTF_8</code> explicitly.</p>`,
    clues: [
      '"Difference between java.io and java.nio" → streams vs buffers/channels, blocking vs non-blocking, File vs Path',
      '"Byte streams vs character streams" → InputStream/OutputStream vs Reader/Writer, bridge with a charset',
      'Text shows up as <code>Ã©</code> or <code>?</code> → charset mismatch (mojibake)',
      '"Which design pattern does java.io use?" → Decorator (BufferedReader wraps InputStreamReader wraps FileInputStream)',
      '"How does one thread handle 10,000 connections?" → NIO Selector / non-blocking channels (or, in Java 21, virtual threads)',
      '"File vs Path" → Path/Files give precise exceptions and modern operations',
      '"What does flip() do?" → limit = position, position = 0 (write mode → read mode)'
    ],
    code: [`
import java.nio.*;
import java.nio.channels.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;

class ThreeWays {
    // 1) Classic java.io: byte source -> bytes-to-chars bridge -> buffering (decorator chain)
    static long countLinesIo(File f) throws IOException {
        try (BufferedReader r = new BufferedReader(
                new InputStreamReader(new FileInputStream(f), StandardCharsets.UTF_8))) {
            long n = 0;
            while (r.readLine() != null) n++;
            return n;
        }
    }

    // 2) NIO.2: Path + Files, a lazy Stream of lines (must be closed!)
    static long countLinesNio2(Path p) throws IOException {
        try (Stream<String> lines = Files.lines(p, StandardCharsets.UTF_8)) {
            return lines.count();
        }
    }

    // 3) NIO channel + buffer: count newline bytes in 64 KB blocks
    static long countNewlinesChannel(Path p) throws IOException {
        try (FileChannel ch = FileChannel.open(p, StandardOpenOption.READ)) {
            ByteBuffer buf = ByteBuffer.allocate(64 * 1024);
            long n = 0;
            while (ch.read(buf) != -1) {         // channel fills the buffer (write mode)
                buf.flip();                      // switch to read mode
                while (buf.hasRemaining()) {
                    if (buf.get() == '\\n') n++;
                }
                buf.clear();                     // ready to be filled again
            }
            return n;
        }
    }

    public static void main(String[] args) throws IOException {
        Path tmp = Files.createTempFile("demo", ".txt");
        Files.writeString(tmp, "one\\ntwo\\nthree\\n", StandardCharsets.UTF_8);
        System.out.println(countLinesIo(tmp.toFile()));        // 3
        System.out.println(countLinesNio2(tmp));               // 3
        System.out.println(countNewlinesChannel(tmp));         // 3
        Files.delete(tmp);
    }
}`],
    codeTitle: ['The same job three ways: java.io, NIO.2 Files, NIO channel'],
    viz: [{
      title: 'Bytes ↔ characters: UTF-8 and mojibake',
      input: 'héllo☕',
      inputLabel: 'Text to write and read back (1–10 characters)',
      gen: decodeFrames
    }, {
      title: 'ByteBuffer: position, limit, flip, compact',
      input: 'put A, put B, put C, flip, get, get, compact, put D, flip, get, get',
      inputLabel: 'Ops: put X, get, flip, clear, compact, rewind (comma separated)',
      gen: byteBufferFrames
    }],
    examples: [
      {
        title: 'Mojibake in three lines',
        html: `<p>Encode with UTF-8, decode with ISO-8859-1: each of the two bytes of "é" becomes its own (wrong) character.</p>`,
        code: `
import java.nio.charset.StandardCharsets;

class Mojibake {
    public static void main(String[] args) {
        byte[] bytes = "héllo".getBytes(StandardCharsets.UTF_8);
        System.out.println(bytes.length);                                         // 6 (é = 2 bytes)
        System.out.println(new String(bytes, StandardCharsets.ISO_8859_1));       // hÃ©llo
        System.out.println(new String(bytes, StandardCharsets.UTF_8));            // héllo
        System.out.println("😀".length() + " chars, " + "😀".codePointCount(0, 2) + " code point");   // 2 chars, 1 code point
    }
}`
      },
      {
        title: 'java.io.File vs java.nio.file.Files: errors that explain themselves',
        html: `${H.table(['Task', 'java.io.File', 'java.nio.file.Files'], [
          ['delete', '<code>f.delete()</code> → <code>false</code> (why? no idea)', '<code>Files.delete(p)</code> → <code>NoSuchFileException</code>, <code>DirectoryNotEmptyException</code>, <code>AccessDeniedException</code>'],
          ['rename/move', '<code>renameTo</code> → boolean, platform-dependent', '<code>Files.move(src, dst, ATOMIC_MOVE, REPLACE_EXISTING)</code>'],
          ['read all text', 'manual loop', '<code>Files.readString(p)</code>'],
          ['symlinks, permissions', 'mostly unsupported', '<code>Files.isSymbolicLink</code>, <code>getPosixFilePermissions</code>, <code>LinkOption.NOFOLLOW_LINKS</code>'],
          ['convert', '<code>f.toPath()</code>', '<code>p.toFile()</code>']
        ])}`,
        code: `
import java.nio.file.*;

class DeleteDemo {
    public static void main(String[] args) {
        System.out.println(new File("nope.txt").delete());       // false — silent
        try {
            Files.delete(Path.of("nope.txt"));
        } catch (NoSuchFileException e) {
            System.out.println("no such file: " + e.getFile());   // precise reason
        } catch (IOException e) {
            System.out.println("other: " + e);
        }
    }
}`
      },
      {
        title: 'ByteBuffer by hand: why flip() matters',
        html: `<p>Without <code>flip()</code>, position is already at the end of the written data, so reading returns nothing (or garbage after it). The visualizer above animates exactly this.</p>`,
        code: `
import java.nio.ByteBuffer;

class FlipDemo {
    public static void main(String[] args) {
        ByteBuffer b = ByteBuffer.allocate(8);
        b.put((byte) 'H').put((byte) 'i');                          // position = 2, limit = 8
        System.out.println(b.position() + " " + b.limit());          // 2 8
        b.flip();                                                     // limit = 2, position = 0
        System.out.println(b.position() + " " + b.limit());          // 0 2
        while (b.hasRemaining()) System.out.print((char) b.get());   // Hi
        System.out.println();
    }
}`
      },
      {
        title: 'Zero-copy file copy with FileChannel.transferTo',
        html: `<p><code>transferTo</code> lets the operating system move bytes directly from one file (or the page cache) to another or to a socket (Linux <code>sendfile</code>), without copying them through the Java heap. Kafka uses this trick to serve data to consumers. It may transfer fewer bytes than asked, so loop.</p>`,
        code: `
import java.nio.channels.FileChannel;
import java.nio.file.*;

class ZeroCopy {
    static void copy(Path src, Path dst) throws IOException {
        try (FileChannel in = FileChannel.open(src, StandardOpenOption.READ);
             FileChannel out = FileChannel.open(dst, StandardOpenOption.CREATE,
                     StandardOpenOption.WRITE, StandardOpenOption.TRUNCATE_EXISTING)) {
            long pos = 0, size = in.size();
            while (pos < size) {
                pos += in.transferTo(pos, size - pos, out);   // may move fewer bytes than requested
            }
        }
    }
}`
      }
    ],
    deepDive: `<h4>Blocking, non-blocking and virtual threads</h4>
<p>Classic java.io is <b>blocking</b>: <code>read()</code> parks the thread until data arrives. With one platform thread per connection (about 1 MB of stack each), 10,000 slow clients means 10,000 threads — the C10K problem. NIO solved it with non-blocking channels and a <code>Selector</code> (epoll on Linux, kqueue on macOS): a few threads handle thousands of sockets, at the cost of callback-style code. <b>Java 21 virtual threads</b> change the trade-off again: blocking calls on a virtual thread <b>unmount</b> it from its carrier thread, so simple blocking java.io-style code scales like NIO. (Watch for pinning: before Java 24, blocking inside <code>synchronized</code> pinned the carrier; JEP 491 in Java 24 removed most of that.)</p>
<h4>Heap vs direct buffers, memory-mapped files</h4>
<p><code>ByteBuffer.allocate</code> lives on the Java heap; <code>allocateDirect</code> lives in native memory, so the OS can read/write it without an extra copy (good for long-lived I/O buffers, but slower to allocate and limited by <code>-XX:MaxDirectMemorySize</code> — "OutOfMemoryError: Direct buffer memory"). <code>FileChannel.map</code> returns a <code>MappedByteBuffer</code>: the file appears as memory and the OS pages it in on demand — great for random access to huge files, limited to 2 GB per mapping. Java 22's Foreign Function &amp; Memory API (<code>MemorySegment</code>, <code>Arena</code>) lifts that limit and gives deterministic unmapping.</p>
<h4>Why buffering matters so much</h4>
<p>An unbuffered <code>FileInputStream.read()</code> is a JNI call plus a system call <b>per byte</b>. <code>BufferedInputStream</code>/<code>BufferedReader</code> read 8 KB (8192 bytes/chars) at once and serve later calls from memory — often a 100× speed-up. <code>System.out</code> is a <code>PrintStream</code> that is synchronized and flushes on newline in many setups, which is why competitive programmers wrap output in a <code>PrintWriter</code>/<code>BufferedWriter</code>.</p>
<h4>Decoding details</h4>
<p>A <code>CharsetDecoder</code> works on buffers and must handle a multi-byte character split across two reads — <code>InputStreamReader</code> does this for you; hand-written <code>new String(chunk, UTF_8)</code> per chunk does <b>not</b> and corrupts characters at chunk boundaries. Java <code>char</code> is a UTF-16 code unit; characters above U+FFFF (emoji) are two chars (a surrogate pair), so <code>length()</code> ≠ number of characters. Since Java 9, Strings store Latin-1 text in 1 byte per char internally (compact strings), independent of file encoding.</p>`,
    aiEra: `<p><b>What AI changes:</b> nobody needs to memorise the decorator chain any more — an assistant writes it instantly. But AI often produces <b>outdated I/O</b>: <code>new FileReader(file)</code> without a charset, <code>java.io.File</code> APIs, <code>Scanner</code> for big files, manual byte loops instead of <code>Files.copy</code>/<code>transferTo</code>. Ask explicitly for "Java 21, NIO.2, explicit UTF-8".</p>
<p><b>Where AI goes wrong:</b> decoding chunks with <code>new String(bytes, 0, n, UTF_8)</code> (breaks multi-byte chars at boundaries), forgetting <code>flip()</code> in NIO code, reusing a buffer without <code>clear()</code>, and building a Selector event loop when virtual threads would be simpler.</p>
<p><b>Use AI as a partner:</b> <i>"Explain what each wrapper in this stream chain adds, and what happens if the file is not UTF-8"</i>, or <i>"Convert this java.io.File code to Path/Files and list behaviour differences"</i>.</p>
<p><b>What you must still own:</b> bytes vs chars, the charset rule, the buffer state machine (position/limit/flip), and the blocking vs non-blocking vs virtual-thread trade-off for an interview design question.</p>`,
    problems: [{
      title: 'Count UTF-8 Bytes Without Encoding the String',
      level: 'Medium', tags: ['charset', 'UTF-8', 'code points', 'strings'], companies: ['Google', 'Atlassian', 'Twitter'],
      statement: `<p>A messaging API limits messages to <b>N bytes in UTF-8</b>. Write <code>static int utf8Length(String s)</code> that returns how many bytes <code>s</code> takes in UTF-8, <b>without</b> calling <code>getBytes</code> (which would allocate a copy of a possibly huge string). Assume <code>s</code> contains only valid characters (no lone surrogates).</p>`,
      constraints: `0 ≤ s.length() ≤ 10<sup>7</sup>. UTF-8 sizes: code point &lt; 0x80 → 1 byte, &lt; 0x800 → 2, &lt; 0x10000 → 3, else 4.`,
      example: `<p><code>"héllo☕"</code> → h=${H.c('g', '1')} é=${H.c('b', '2')} l=1 l=1 o=1 ☕(U+2615)=${H.c('y', '3')} → <b>9</b>.<br><code>"😀"</code> → ${H.c('p', '4')} bytes, even though <code>length()</code> is 2 (a surrogate pair is ONE code point).</p>`,
      brute: {
        why: `<p><code>s.getBytes(UTF_8).length</code> is correct but allocates a whole new byte array (up to 3× the string) just to read its length — for a 10 M-char string that is 30 MB of garbage per call. The other naive answer, <code>s.length()</code>, counts UTF-16 chars, not bytes, and is simply wrong for non-ASCII text.</p>`,
        code: `
static int utf8LengthBrute(String s) {
    return s.getBytes(java.nio.charset.StandardCharsets.UTF_8).length;   // allocates a full copy
}`
      },
      mcq: { q: 'Why must you iterate by <b>code point</b> rather than by <code>char</code>?', options: ['chars are slower', 'An emoji is two chars (a surrogate pair) but one 4-byte UTF-8 sequence; counting chars would give 3 + 3 = 6', 'UTF-8 has no emoji', 'charAt throws for emoji'], answer: 1, explain: 'Each lone surrogate would be counted as a 3-byte character; together they form one code point that UTF-8 encodes in 4 bytes.' },
      hints: [
        `<p>Hint 1: UTF-8 size depends only on the numeric value of each <b>code point</b>: 1, 2, 3 or 4 bytes using the thresholds 0x80, 0x800, 0x10000.</p>`,
        `<p>Hint 2: use <code>s.codePointAt(i)</code> and advance <code>i</code> by <code>Character.charCount(cp)</code> (1 or 2), or simply <code>s.codePoints()</code> as an <code>IntStream</code>.</p>`,
        `<p>Hint 3: sum with an <code>int</code> (10<sup>7</sup> × 4 &lt; 2<sup>31</sup>). Edge cases: empty string → 0; a lone surrogate would be encoded by Java as '?' (1 byte), so the problem excludes it. Recipe: total = Σ size(cp).</p>`
      ],
      solution: {
        approach: `<p>Walk the string by code point and add 1, 2, 3 or 4 according to the value. No allocation, one pass.</p>`,
        code: `
class Utf8Len {
    static int utf8Length(String s) {
        int bytes = 0;
        for (int i = 0; i < s.length(); ) {
            int cp = s.codePointAt(i);                   // joins a surrogate pair into one value
            bytes += cp < 0x80 ? 1                        // ASCII
                   : cp < 0x800 ? 2                       // Latin, Greek, Cyrillic, Hebrew, Arabic…
                   : cp < 0x10000 ? 3                     // rest of the BMP: CJK, symbols like ☕
                   : 4;                                   // emoji and other supplementary characters
            i += Character.charCount(cp);                 // 2 for a surrogate pair, else 1
        }
        return bytes;
    }

    public static void main(String[] args) {
        System.out.println(utf8Length("héllo\\u2615"));     // 9
        System.out.println(utf8Length("\\uD83D\\uDE00"));   // 4 (😀)
        System.out.println(utf8Length(""));                  // 0
    }
}`,
        alt: [{ lang: 'python', code: `def utf8_length(s):\n    total = 0\n    for ch in s:            # Python iterates by code point already\n        cp = ord(ch)\n        total += 1 if cp < 0x80 else 2 if cp < 0x800 else 3 if cp < 0x10000 else 4\n    return total\n\nprint(utf8_length("h\\u00e9llo\\u2615"), len("h\\u00e9llo\\u2615".encode("utf-8")))`, run: true }],
        dry: { head: ['i', 'code point', 'UTF-8 bytes', 'running total'], rows: [
          ['0', "'h' U+0068", '1', '1'], ['1', "'é' U+00E9", '2', '3'], ['2,3,4', "'l','l','o'", '1 each', '6'], ['5', "'☕' U+2615", '3', H.c('g', '9')]
        ] },
        complexity: `<p>O(n) time, O(1) extra memory — versus O(n) extra memory for <code>getBytes</code>.</p>`,
        followUps: ['Truncate a string to at most N UTF-8 bytes without cutting a character in half.', 'Handle lone surrogates exactly like <code>getBytes</code> does (replacement "?").', 'Why can <code>new String(chunk, UTF_8)</code> per 8 KB chunk corrupt text?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — Reading and writing files in practice
     ====================================================================== */
  function bufferedReaderFrames(input) {
    var raw = String(input === undefined ? '' : input);
    if (!raw.length || raw.length > 48) throw new Error('Type 1–48 characters; use | for a line break, e.g. hi there|line two|end');
    var file = raw.split('').map(function (c) { return c === '|' ? '⏎' : c; });
    var BS = 8, buf = [], bpos = 0, fpos = 0, reads = 0, lines = [], frames = [], cur = '';
    function snap(narr, fhl, bhl) {
      var bv = buf.length ? buf.slice() : ['(empty)'];
      while (bv.length < BS && buf.length) bv.push('·');
      frames.push({ narr: narr, parts: [
        { type: 'array', label: 'File on disk (⏎ = newline)', values: file, hl: fhl || {}, showIdx: true },
        { type: 'array', label: 'BufferedReader\'s internal buffer (size ' + BS + ')', values: bv, hl: bhl || {}, ptr: buf.length && bpos < buf.length ? one(bpos, 'next') : {} },
        { type: 'vars', label: 'Counters', vals: { 'disk reads (buffered)': reads, 'disk reads if unbuffered': fpos, 'line being built': '"' + cur + '"' }, hl: { 'disk reads (buffered)': 'ok' } },
        { type: 'stack', label: 'Lines returned by readLine()', items: lines.length ? lines.map(function (l) { return '"' + l + '"'; }) : ['(none yet)'] }
      ] });
    }
    snap('A <code>BufferedReader</code> starts with an empty buffer. Each <code>readLine()</code> takes chars from the buffer; only when the buffer is empty does it go to the disk — and then it grabs a whole block.');
    function refill() {
      buf = file.slice(fpos, fpos + BS); bpos = 0;
      var fh = {}; for (var i = fpos; i < fpos + buf.length; i++) fh[i] = 'win';
      fpos += buf.length; reads++;
      var bh = {}; buf.forEach(function (_, i) { bh[i] = 'ok'; });
      snap('Buffer empty → <b>one</b> disk read fetches the next ' + buf.length + ' chars at once (real size: 8192). Disk reads so far: <b>' + reads + '</b>.', fh, bh);
    }
    var guard = 0;
    while (guard++ < 200) {
      if (bpos >= buf.length) {
        if (fpos >= file.length) break;
        refill();
      }
      var c = buf[bpos];
      if (c === '⏎') {
        lines.push(cur);
        var bh2 = {}; bh2[bpos] = 'sel';
        bpos++;
        var done = cur; cur = '';
        snap('Found ⏎ → <code>readLine()</code> returns <b>"' + esc(done) + '"</b> (the newline itself is <b>not</b> included). No disk access was needed for this part.', {}, bh2);
      } else {
        cur += c; bpos++;
      }
    }
    if (cur.length) {
      lines.push(cur);
      var last = cur; cur = '';
      snap('End of file reached with text left over: the last line <b>"' + esc(last) + '"</b> is returned even without a trailing newline.', {}, {});
    }
    snap('Next <code>readLine()</code> returns <b>null</b>: end of file. That is the loop condition <code>while ((line = r.readLine()) != null)</code>.', {}, {});
    snap('Result: <b>' + reads + '</b> disk reads with buffering vs <b>' + file.length + '</b> one-char reads without it. With the real 8192-char buffer, a 1 MB file needs about 128 reads instead of a million.', {}, {});
    return frames;
  }

  topics.push({
    title: 'Reading and Writing Files in Practice: Recipes, Buffering, Encoding, Safety',
    analogy: `<p>Imagine copying notes from a <b>library book</b> that you cannot take home. Walking to the shelf for <b>every single word</b> would take all day. Instead you <b>photocopy a whole page</b> (a buffer), sit at your desk, and copy from it; you only walk back when the page is used up. Writing works the same way: you jot sentences in a <b>notepad</b> and transfer them to the official ledger in batches — <b>flush</b> is "transfer now", and <b>close</b> is "transfer whatever is left and hand back the ledger".</p>`,
    explain: `<h4>1. Pick the recipe by file size and shape</h4>
${H.table(['Job', 'Best call (Java 11+)', 'Watch out'], [
  ['Small text file → one String', '<code>Files.readString(path)</code>', 'Whole file in memory; UTF-8 by default'],
  ['Small text file → list of lines', '<code>Files.readAllLines(path)</code>', 'Whole file in memory'],
  ['Big text file, line by line', '<code>try (BufferedReader r = Files.newBufferedReader(path))</code> or <code>try (Stream&lt;String&gt; s = Files.lines(path))</code>', H.c('r', 'Files.lines MUST be closed (TWR)')],
  ['Binary file', '<code>Files.readAllBytes</code> (small) / <code>Files.newInputStream</code> (big)', 'readAllBytes max ~2 GB (array limit)'],
  ['Write text', '<code>Files.writeString(path, text)</code>', 'Default: CREATE + TRUNCATE_EXISTING (overwrites!)'],
  ['Append', '<code>Files.writeString(path, text, CREATE, APPEND)</code>', 'Not atomic across processes'],
  ['Many lines', '<code>try (BufferedWriter w = Files.newBufferedWriter(path))</code> + <code>w.write(..); w.newLine();</code>', 'Data sits in the buffer until flush/close'],
  ['List a folder / walk a tree', '<code>Files.list(dir)</code> / <code>Files.walk(dir)</code> in TWR', 'Streams hold open directory handles'],
  ['Read keyboard input', '<code>BufferedReader(new InputStreamReader(System.in))</code> or <code>Scanner</code>', 'Scanner is convenient but slow (regex)']
])}
<h4>2. Buffering: the single biggest performance lever</h4>
<p>Unbuffered streams talk to the OS for every <code>read()</code>/<code>write()</code> call. Buffered ones collect 8 KB at a time. The visualizer shows the difference. <code>Files.newBufferedReader/Writer</code> are already buffered.</p>
<h4>3. flush vs close</h4>
<p>A <code>BufferedWriter</code> keeps your text in memory until the buffer fills. <code>flush()</code> pushes it to the OS now (the stream stays open). <code>close()</code> flushes and releases the file. If your program ends without close (or crashes), the last chunk is <b>lost</b> — a classic "my output file is empty" bug. TWR solves it.</p>
<h4>4. Paths</h4>
<p>A relative path like <code>Path.of("data.csv")</code> is resolved against the <b>working directory</b> (<code>System.getProperty("user.dir")</code>) — where the JVM was started, not where the class file lives. In a packaged app, read bundled files with <code>getClass().getResourceAsStream("/data.csv")</code> instead.</p>
<h4>5. Safe writing</h4>
<ul>
<li><b>Check-then-act is racy</b>: <code>if (!Files.exists(p)) Files.createFile(p)</code> can fail if another process creates it in between. Just call <code>createFile</code> and catch <code>FileAlreadyExistsException</code>.</li>
<li><b>Atomic replace</b>: write to a temp file in the same folder, then <code>Files.move(tmp, target, ATOMIC_MOVE, REPLACE_EXISTING)</code>. Readers see either the old file or the new one — never half a file.</li>
<li><b>PrintWriter swallows errors</b>: its print methods never throw; call <code>checkError()</code>, or use <code>BufferedWriter</code> which throws <code>IOException</code>.</li>
</ul>`,
    clues: [
      '"Read a 10 GB log file and count errors" → stream it line by line (BufferedReader / Files.lines in TWR), never readAllLines',
      '"Why is my output file empty?" → writer not flushed/closed',
      '"BufferedReader vs Scanner" → buffer size, speed, regex parsing, exceptions',
      '"How do you write a file so readers never see a partial file?" → temp file + atomic move',
      '"Relative path not found when running from IDE vs jar" → working directory vs classpath resources',
      '"Files.exists then create" in a code review → TOCTOU race',
      '"Read the last N lines" / "merge sorted files" / "word frequency of a huge file" → streaming + small in-memory structure'
    ],
    code: [`
import java.nio.charset.StandardCharsets;
import java.nio.file.*;

class FileRecipes {
    public static void main(String[] args) throws IOException {
        Path dir = Files.createTempDirectory("recipes");
        Path log = dir.resolve("app.log");

        // WRITE: whole text at once (creates or overwrites)
        Files.writeString(log, "INFO start\\nERROR disk full\\n", StandardCharsets.UTF_8);

        // APPEND: add to the end, create if missing
        Files.writeString(log, "WARN slow\\nERROR timeout\\n", StandardCharsets.UTF_8,
                StandardOpenOption.CREATE, StandardOpenOption.APPEND);

        // READ small file
        System.out.println(Files.readAllLines(log).size());           // 4

        // READ big file lazily — the stream holds the file open, so close it
        try (Stream<String> lines = Files.lines(log)) {
            System.out.println(lines.filter(l -> l.startsWith("ERROR")).count());   // 2
        }

        // WRITE many lines efficiently
        Path report = dir.resolve("report.txt");
        try (BufferedWriter w = Files.newBufferedWriter(report, StandardCharsets.UTF_8)) {
            for (int i = 1; i <= 3; i++) {
                w.write("row " + i);
                w.newLine();                                            // OS-specific line separator
            }
        }                                                               // close() flushes the buffer
        System.out.println(Files.readString(report).strip());

        // CLEAN UP: walk the tree, deepest paths first, delete
        try (Stream<Path> all = Files.walk(dir)) {
            all.sorted(Comparator.reverseOrder()).forEach(p -> p.toFile().delete());
        }
    }
}`],
    codeTitle: ['The everyday file recipes in one program'],
    viz: {
      title: 'Inside BufferedReader.readLine(): fewer trips to the disk',
      input: 'hi there|line two|end',
      inputLabel: 'File content (use | for newline, max 48 chars)',
      gen: bufferedReaderFrames
    },
    examples: [
      {
        title: 'Count ERROR lines in a huge file with constant memory',
        html: `<p>Both versions read one line at a time and keep only a counter in memory, so a 50 GB file is fine. <code>readAllLines</code> here would throw <code>OutOfMemoryError</code>.</p>`,
        code: `
import java.nio.file.*;

class CountErrors {
    static long withReader(Path p) throws IOException {
        long n = 0;
        try (BufferedReader r = Files.newBufferedReader(p)) {
            String line;
            while ((line = r.readLine()) != null) {      // null = end of file
                if (line.contains("ERROR")) n++;
            }
        }
        return n;
    }

    static long withStream(Path p) throws IOException {
        try (Stream<String> lines = Files.lines(p)) {    // lazy: reads as the stream is consumed
            return lines.filter(l -> l.contains("ERROR")).count();
        }
    }
}`
      },
      {
        title: 'Atomic save: never leave a half-written file',
        html: `<p>If the process crashes in the middle of <code>Files.writeString(target, …)</code>, the target is truncated and half-written. Writing to a sibling temp file and then renaming makes the switch all-or-nothing on local file systems.</p>`,
        code: `
import java.nio.charset.StandardCharsets;
import java.nio.file.*;

class AtomicSave {
    static void save(Path target, String content) throws IOException {
        Path dir = target.toAbsolutePath().getParent();
        Path tmp = Files.createTempFile(dir, ".tmp-", ".part");     // same folder = same file system
        try {
            Files.writeString(tmp, content, StandardCharsets.UTF_8);
            Files.move(tmp, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } finally {
            Files.deleteIfExists(tmp);                               // no-op after a successful move
        }
    }
}`
      },
      {
        title: 'PrintWriter never throws — check it',
        html: `<p><code>PrintWriter</code> and <code>PrintStream</code> (that is what <code>System.out</code> is) catch their own <code>IOException</code>s and just set an internal flag. If the disk fills up, your program keeps "writing" happily. Call <code>checkError()</code> (it also flushes) before trusting the result.</p>`,
        code: `
class PrintWriterCheck {
    public static void main(String[] args) {
        StringWriter sink = new StringWriter();
        try (PrintWriter pw = new PrintWriter(sink)) {
            pw.printf("%-6s|%5d%n", "apples", 42);
            pw.println("done");
            if (pw.checkError()) {                      // true if any write failed
                System.out.println("write failed!");
            }
        }
        System.out.print(sink);                         // apples|   42  /  done
    }
}`
      },
      {
        title: 'Fast console input for coding rounds',
        html: `<p><code>Scanner</code> parses with regular expressions and a small 1 KB buffer — fine for 1,000 numbers, too slow for 10<sup>6</sup>. Read lines with <code>BufferedReader</code> and split, or use <code>StreamTokenizer</code>. Write output to a <code>PrintWriter</code> wrapped around a <code>BufferedWriter</code> and flush once at the end.</p>`,
        code: `
class FastIO {
    public static void main(String[] args) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
        PrintWriter out = new PrintWriter(new BufferedWriter(new OutputStreamWriter(System.out)));
        String first = in.readLine();
        int n = first == null ? 0 : Integer.parseInt(first.trim());
        long sum = 0;
        for (int i = 0; i < n; i++) {
            String line = in.readLine();
            if (line == null) break;
            StringTokenizer st = new StringTokenizer(line);
            while (st.hasMoreTokens()) sum += Long.parseLong(st.nextToken());
        }
        out.println(sum);
        out.flush();                                     // without this, nothing may appear
    }
}`
      },
      {
        title: 'Walk a folder tree and total the size of .java files',
        html: `<p><code>Files.walk</code> returns a lazy stream of every path under a folder (depth-first). It holds directory handles open, so it goes in TWR. A file you cannot read makes the stream throw <code>UncheckedIOException</code> — for error-tolerant walking, use <code>Files.walkFileTree</code> (see the Hard practice problem).</p>`,
        code: `
import java.nio.file.*;

class JavaSize {
    static long totalJavaBytes(Path root) throws IOException {
        try (Stream<Path> paths = Files.walk(root)) {
            return paths.filter(Files::isRegularFile)
                        .filter(p -> p.toString().endsWith(".java"))
                        .mapToLong(p -> {
                            try {
                                return Files.size(p);
                            } catch (IOException e) {
                                throw new UncheckedIOException(e);     // lambdas cannot throw checked
                            }
                        })
                        .sum();
        }
    }
}`
      }
    ],
    deepDive: `<h4>From write() to the disk platter</h4>
<p>Your bytes travel: Java buffer → <code>write</code> system call → the OS <b>page cache</b> (RAM) → eventually the disk. <code>flush()</code> only gets them as far as the page cache; a power cut can still lose them. For real durability call <code>FileChannel.force(true)</code> (fsync) or open with <code>StandardOpenOption.SYNC</code>/<code>DSYNC</code> — databases and message logs do this, at a big latency cost (milliseconds per fsync on SSDs). For atomic replace to survive power loss you must also fsync the <b>directory</b> after the rename.</p>
<h4>Memory and limits</h4>
<p><code>readAllBytes</code>/<code>readString</code> are limited by the maximum array size (about 2 GB) and by heap. <code>Files.lines</code> reads lazily through a <code>BufferedReader</code>; since Java 9 it can split efficiently for <code>parallel()</code> on UTF-8/ISO-8859-1/US-ASCII files by memory-mapping the file — though parallel I/O rarely helps unless per-line work is heavy. <code>BufferedReader.readLine</code> builds a new String per line; for extreme throughput (multi-GB/s) people use <code>FileChannel</code> + manual byte parsing or memory-mapped files.</p>
<h4>Concurrency and locking</h4>
<p>Two processes appending to the same file with <code>APPEND</code> get atomic appends only for small writes on local POSIX file systems — not guaranteed on network file systems. <code>FileChannel.lock()</code> gives <b>advisory</b> locks between processes (other programs may ignore them). On Windows an open file usually cannot be deleted or renamed; on Linux it can (the data stays until the last handle closes) — a common cause of "disk full but no big files" mysteries: a deleted log still held open by a JVM.</p>
<h4>Watching and walking</h4>
<p><code>WatchService</code> notifies you of create/modify/delete events in a folder (inotify on Linux; polling on macOS in the JDK). <code>Files.walkFileTree</code> with a <code>FileVisitor</code> gives fine control: skip subtrees, handle <code>visitFileFailed</code> errors, and do not follow symlinks unless you ask (<code>FileVisitOption.FOLLOW_LINKS</code>, with cycle detection).</p>
<h4>Security</h4>
<p>Never build paths from user input without normalising and checking: <code>base.resolve(userName).normalize().startsWith(base)</code> blocks <b>path traversal</b> (<code>../../etc/passwd</code>). Create temp files with <code>Files.createTempFile</code> (random names, restrictive permissions on POSIX) rather than predictable names.</p>`,
    aiEra: `<p><b>What AI changes:</b> file boilerplate is now free — "read this CSV and sum column 3" takes seconds. Your value is in the <b>non-functional</b> parts the assistant skips: encoding, memory on huge inputs, partial-write safety, error handling per line, and path security.</p>
<p><b>Where AI goes wrong:</b> <code>Files.readAllLines</code> on a "log file" of unknown size; <code>Files.lines(...)</code> without TWR (file handle leak); writing directly to the target file; <code>new FileWriter(f)</code> without charset; and trusting user-supplied file names (path traversal). Generated code also often mixes <code>java.io.File</code> and <code>Path</code> randomly.</p>
<p><b>Use AI as a partner:</b> <i>"This must handle a 20 GB file, non-UTF-8 lines and a crash mid-write — review it"</i> forces the assistant to think about the hard parts. Ask it to generate nasty test files (empty file, no trailing newline, CRLF endings, BOM, invalid bytes).</p>
<p><b>What you must still own:</b> choosing the right recipe for the file size, flush/close semantics, atomic writes, and explaining the page-cache/fsync durability story in a backend interview.</p>`,
    problems: [{
      title: 'Log Level Counter That Survives Bad Lines',
      level: 'Medium', tags: ['BufferedReader', 'parsing', 'TreeMap', 'try-with-resources'], companies: ['Amazon', 'Splunk', 'Datadog'],
      statement: `<p>Each log line looks like <code>2026-10-14T10:00:01 ERROR payment failed</code>: a timestamp, a space, a level (<code>DEBUG</code>, <code>INFO</code>, <code>WARN</code>, <code>ERROR</code>), a space, then the message. Write <code>static Map&lt;String, Integer&gt; countLevels(BufferedReader r)</code> returning counts per level in alphabetical order, plus a <code>MALFORMED</code> count for lines that do not match (blank lines are ignored). Also write <code>countLevels(Path p)</code> that opens the file safely and delegates.</p>`,
      constraints: `The file can be 20 GB — stream it. Lines may have extra spaces inside the message. Levels are case-sensitive.`,
      example: `<p>Lines: ${H.c('g', '"t1 INFO up"')}, ${H.c('r', '"t2 ERROR db down"')}, ${H.c('y', '"garbage"')}, ${H.c('m', '""')}, ${H.c('r', '"t3 ERROR retry failed again"')}, ${H.c('y', '"t4 FATAL x"')} → <code>{ERROR=2, INFO=1, MALFORMED=2}</code>. "garbage" has no level; FATAL is not a known level; the blank line is skipped.</p>`,
      brute: {
        why: `<p><code>Files.readAllLines(p)</code> then a loop: simple, but it loads 20 GB into memory → OutOfMemoryError. And <code>line.split(" ")[1]</code> without checks throws <code>ArrayIndexOutOfBoundsException</code> on the first short line, killing the whole job.</p>`,
        code: `
static Map<String, Integer> countBrute(java.nio.file.Path p) throws IOException {
    Map<String, Integer> m = new TreeMap<>();
    for (String line : java.nio.file.Files.readAllLines(p)) {    // whole file in memory
        String level = line.split(" ")[1];                       // crashes on "garbage"
        m.merge(level, 1, Integer::sum);
    }
    return m;
}`
      },
      mcq: { q: 'One bad line in a 20 GB file should…', options: ['abort the whole run with an exception', 'be counted as MALFORMED while processing continues', 'be silently ignored without any trace', 'trigger reading the file again'], answer: 1, explain: 'Robust batch processing isolates per-record failures and reports them; it neither crashes nor hides them.' },
      hints: [
        `<p>Hint 1: stream with <code>while ((line = r.readLine()) != null)</code> — memory stays O(number of levels), not O(file).</p>`,
        `<p>Hint 2: <code>line.split(" ", 3)</code> splits into at most 3 parts: timestamp, level, rest of message (spaces inside the message are kept). Check the part count and that the level is in a <code>Set.of("DEBUG","INFO","WARN","ERROR")</code>.</p>`,
        `<p>Hint 3: use <code>TreeMap</code> for alphabetical order and <code>merge(key, 1, Integer::sum)</code>. Skip <code>line.isBlank()</code>. The Path version: <code>try (BufferedReader r = Files.newBufferedReader(p)) { return countLevels(r); }</code>.</p>`
      ],
      solution: {
        approach: `<p>Split the job: a pure function over any <code>BufferedReader</code> (easy to test with a <code>StringReader</code>) and a thin wrapper that owns the file. Each line is validated; malformed lines are counted, never fatal.</p>`,
        code: `
import java.nio.file.*;

class LogLevels {
    private static final Set<String> LEVELS = Set.of("DEBUG", "INFO", "WARN", "ERROR");

    static Map<String, Integer> countLevels(BufferedReader r) throws IOException {
        Map<String, Integer> counts = new TreeMap<>();            // alphabetical keys
        String line;
        while ((line = r.readLine()) != null) {                    // O(1) memory per line
            if (line.isBlank()) continue;
            String[] parts = line.split(" ", 3);                   // timestamp, level, message
            String key = (parts.length >= 2 && LEVELS.contains(parts[1])) ? parts[1] : "MALFORMED";
            counts.merge(key, 1, Integer::sum);
        }
        return counts;
    }

    static Map<String, Integer> countLevels(Path p) throws IOException {
        try (BufferedReader r = Files.newBufferedReader(p)) {      // we opened it, we close it
            return countLevels(r);
        }
    }

    public static void main(String[] args) throws IOException {
        String text = "t1 INFO up\\nt2 ERROR db down\\ngarbage\\n\\nt3 ERROR retry failed again\\nt4 FATAL x\\n";
        System.out.println(countLevels(new BufferedReader(new StringReader(text))));
        // {ERROR=2, INFO=1, MALFORMED=2}
    }
}`,
        dry: { head: ['line', 'split(" ", 3)', 'key', 'counts'], rows: [
          ['"t1 INFO up"', '[t1, INFO, up]', 'INFO', '{INFO=1}'],
          ['"t2 ERROR db down"', '[t2, ERROR, db down]', 'ERROR', '{ERROR=1, INFO=1}'],
          ['"garbage"', '[garbage]', H.c('y', 'MALFORMED'), '{ERROR=1, INFO=1, MALFORMED=1}'],
          ['""', '—', 'skipped', 'unchanged'],
          ['"t3 ERROR retry failed again"', '[t3, ERROR, retry failed again]', 'ERROR', '{ERROR=2, INFO=1, MALFORMED=1}'],
          ['"t4 FATAL x"', '[t4, FATAL, x]', H.c('y', 'MALFORMED'), H.c('g', '{ERROR=2, INFO=1, MALFORMED=2}')]
        ] },
        complexity: `<p>O(total characters) time; O(L) memory for L distinct levels (constant here) plus one line at a time.</p>`,
        followUps: ['Also keep the first 5 malformed line numbers for the report.', 'Count per level per hour using the timestamp.', 'Make it handle gzip-compressed logs (<code>GZIPInputStream</code>) with the same method.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — Serialization basics
     ====================================================================== */
  function serialFrames(input) {
    var specs = String(input || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
    if (!specs.length || specs.length > 6) throw new Error('Give 1–6 fields like: name=Asha, password=s3cret transient, age=30, count=7 static');
    var fields = specs.map(function (s) {
      var m = /^([A-Za-z_]\w{0,11})\s*=\s*([^\s]{1,12})(?:\s+(transient|static))?$/.exec(s);
      if (!m) throw new Error('Bad field "' + s + '". Format: name=value, optionally followed by " transient" or " static"');
      var num = /^-?\d+$/.test(m[2]);
      return { name: m[1], val: m[2], mod: m[3] || '', num: num, def: num ? '0' : 'null' };
    });
    var frames = [], stream = [], rows0 = fields.map(function (f) { return [(f.mod ? f.mod + ' ' : '') + f.name, f.num ? f.val : '"' + f.val + '"']; });
    frames.push({ narr: 'A <code>User</code> object lives in memory. Its class <code>implements Serializable</code> (a marker interface with no methods — it just says "I agree to be turned into bytes").', parts: [{ type: 'table', label: 'User object in memory (JVM #1)', columns: ['field', 'value'], rows: rows0 }] });
    stream.push('AC ED 00 05'); stream.push('class User, UID=1');
    frames.push({ narr: '<code>out.writeObject(user)</code> starts the stream with a magic number <b>AC ED</b> and version <b>00 05</b>, then a <b>class descriptor</b>: the class name, its <b>serialVersionUID</b> and the list of fields that will be written.', parts: [{ type: 'table', label: 'User object', columns: ['field', 'value'], rows: rows0 }, { type: 'queue', label: 'Byte stream (front = first written)', items: stream.slice(), hl: { 0: 'ok', 1: 'ok' }, frontLabel: 'start', backLabel: 'end' }] });
    fields.forEach(function (f, i) {
      var hl = {}; hl[i] = f.mod ? 'bad' : 'cur';
      var narr;
      if (f.mod === 'transient') narr = '<b>' + f.name + '</b> is <code>transient</code> → <span class="c-r">skipped</span>. Use transient for secrets, caches, and fields whose type is not serializable (threads, sockets, loggers).';
      else if (f.mod === 'static') narr = '<b>' + f.name + '</b> is <code>static</code> → <span class="c-r">skipped</span>. Static fields belong to the class, not to the object, so they are never part of an object\'s serialized state.';
      else { stream.push(f.name + '=' + f.val); narr = '<b>' + f.name + '</b> is a normal instance field → its value is written. (If it were a reference to another object, that whole object would be written too, recursively.)'; }
      var qh = {}; if (!f.mod) qh[stream.length - 1] = 'ok';
      frames.push({ narr: narr, parts: [{ type: 'table', label: 'User object', columns: ['field', 'value'], rows: rows0, hl: hl }, { type: 'queue', label: 'Byte stream', items: stream.slice(), hl: qh, frontLabel: 'start', backLabel: 'end' }] });
    });
    frames.push({ narr: 'The bytes can now go to a file, a socket or a cache. Later — maybe in a different JVM — <code>in.readObject()</code> reads them back. First check: does the class on this side have the <b>same serialVersionUID</b>? Yes (1 = 1), so continue. A mismatch throws <code>InvalidClassException</code>.', parts: [{ type: 'queue', label: 'Byte stream being read', items: stream.slice(), hl: { 1: 'cur' }, frontLabel: 'start', backLabel: 'end' }, { type: 'vars', label: 'Class check', vals: { 'UID in stream': 1, 'UID of local class': 1, result: 'compatible' }, hl: { result: 'ok' } }] });
    var rows = fields.map(function (f) { return [(f.mod ? f.mod + ' ' : '') + f.name, f.mod === 'static' ? '(class value)' : f.def]; });
    frames.push({ narr: 'The JVM allocates a new User <b>without calling its constructor</b> (it calls only the no-arg constructor of the first <i>non</i>-serializable superclass, here <code>Object</code>). All fields start at their defaults: 0, false, null.', parts: [{ type: 'table', label: 'New User object (JVM #2) — fresh, nothing set', columns: ['field', 'value'], rows: rows.map(function (r) { return r.slice(); }) }] });
    var hlr = {};
    fields.forEach(function (f, i) {
      if (f.mod) return;
      rows[i][1] = f.num ? f.val : '"' + f.val + '"';
      hlr = {}; hlr[i] = 'ok';
      frames.push({ narr: 'Restore <b>' + f.name + '</b> from the stream by writing the field directly (reflection-like), not through a setter.', parts: [{ type: 'table', label: 'New User object (JVM #2)', columns: ['field', 'value'], rows: rows.map(function (r) { return r.slice(); }), hl: hlr }] });
    });
    var cmp = fields.map(function (f, i) { return [(f.mod ? f.mod + ' ' : '') + f.name, rows0[i][1], f.mod === 'static' ? 'whatever the class holds in JVM #2' : rows[i][1]]; });
    var hlc = {}; fields.forEach(function (f, i) { if (f.mod) hlc[i] = 'bad'; });
    frames.push({ narr: 'Compare before and after: normal fields survived; <b>transient</b> fields came back as defaults (re-initialise them in <code>readObject</code> if needed); <b>static</b> fields were never in the stream at all.', parts: [{ type: 'table', label: 'Before vs after', columns: ['field', 'original', 'deserialized'], rows: cmp, hl: hlc }] });
    return frames;
  }

  topics.push({
    title: 'Serialization Basics: Serializable, transient, serialVersionUID and the Security Story',
    analogy: `<p>Think of <b>flat-pack furniture</b>. The factory takes a finished wardrobe apart into a <b>flat box</b> with an instruction sheet (that is <b>serialization</b>: object → bytes). At your home you rebuild it (deserialization: bytes → object). Some parts are marked <b>"not shipped — buy locally"</b> (the glass shelves): they arrive missing, and you add them yourself — those are <code>transient</code> fields. The <b>model number</b> on the box is the <code>serialVersionUID</code>: if your instruction sheet is for a different model, the assembler refuses to start (<code>InvalidClassException</code>). And never assemble a box a stranger left on your doorstep — it might be built to explode (deserialization attacks).</p>`,
    explain: `<h4>1. What and why</h4>
<p><b>Serialization</b> turns an object (and everything it references) into a stream of bytes; <b>deserialization</b> rebuilds it. Uses: saving state to a file, sending objects over a network (RMI, old app servers), caching in a session, deep-copying.</p>
<h4>2. The basic recipe</h4>
<pre><code>class User implements Serializable {             // marker interface: no methods
    private static final long serialVersionUID = 1L;
    String name;
    transient String password;                   // NOT written
}

try (ObjectOutputStream out = new ObjectOutputStream(Files.newOutputStream(path))) {
    out.writeObject(user);
}
try (ObjectInputStream in = new ObjectInputStream(Files.newInputStream(path))) {
    User u = (User) in.readObject();             // may throw ClassNotFoundException
}</code></pre>
<h4>3. The rules you are asked about</h4>
${H.table(['Rule', 'What it means'], [
  ['Must implement <code>Serializable</code>', 'Otherwise <code>NotSerializableException</code> — also if <b>any field</b> refers to a non-serializable object'],
  ['<code>transient</code> fields are skipped', 'They come back as 0 / false / null'],
  ['<code>static</code> fields are skipped', 'They belong to the class, not the object'],
  ['Constructor is <b>not</b> called', 'For the serializable class; the first non-serializable superclass needs an accessible no-arg constructor, which <b>is</b> called'],
  ['Whole object graph is saved', 'Referenced objects too; shared references and cycles are preserved (each object written once)'],
  ['<code>serialVersionUID</code>', 'Version stamp; if missing, Java computes one from the class shape — any small change (new method!) breaks old data. Always declare it.'],
  ['Custom hooks', '<code>private void writeObject(ObjectOutputStream)</code>, <code>private void readObject(ObjectInputStream)</code>, <code>readResolve()</code> (e.g. keep singletons single)']
])}
<h4>4. Danger: never deserialize untrusted data</h4>
<p><code>readObject</code> can instantiate <b>any</b> serializable class on the classpath and run its hooks. Attackers chain such hooks ("gadget chains") to execute code — the 2015 Apache Commons Collections bug hit WebLogic, JBoss, Jenkins and more. If you must, install an <b>allow-list filter</b> (<code>ObjectInputFilter</code>, Java 9+; context-specific filter factories in Java 17).</p>
<h4>5. What to use in 2026</h4>
<p>For data that leaves your process, prefer explicit formats: <b>JSON</b> (Jackson, Gson), <b>Protocol Buffers</b>/<b>Avro</b> (schemas, versioning, compact), or records with a JSON mapper. Java serialization is mostly legacy, but interviews still ask about it and old systems still use it.</p>`,
    clues: [
      '"What is serialization? What does transient do?" → object ↔ bytes; transient fields skipped',
      '"What is serialVersionUID and what happens if it changes?" → version check, InvalidClassException',
      '"Is the constructor called during deserialization?" → no for serializable classes; yes for the first non-serializable parent\'s no-arg constructor',
      '"NotSerializableException" in a stack trace → some field\'s type does not implement Serializable',
      '"Are static fields serialized?" → no',
      '"Why is Java deserialization a security risk?" → gadget chains, use filters / avoid',
      '"How to deep copy an object graph?" → copy constructors, or serialization round-trip (slow but generic)'
    ],
    code: [`
import java.nio.file.*;

class Address implements Serializable {
    private static final long serialVersionUID = 1L;
    final String city;
    Address(String city) { this.city = city; }
}

class User implements Serializable {
    private static final long serialVersionUID = 1L;  // declare it: stable across class edits
    static int created = 0;                           // static: NOT serialized
    final String name;
    final Address address;                            // referenced object is serialized too
    transient String password;                        // transient: NOT serialized

    User(String name, Address address, String password) {
        this.name = name;
        this.address = address;
        this.password = password;
        created++;
        System.out.println("constructor called for " + name);
    }
}

class SaveLoad {
    public static void main(String[] args) throws IOException, ClassNotFoundException {
        Path file = Files.createTempFile("user", ".ser");
        User original = new User("Asha", new Address("Pune"), "s3cret");

        try (ObjectOutputStream out = new ObjectOutputStream(Files.newOutputStream(file))) {
            out.writeObject(original);
        }
        try (ObjectInputStream in = new ObjectInputStream(Files.newInputStream(file))) {
            User copy = (User) in.readObject();                 // constructor NOT called
            System.out.println(copy.name + " " + copy.address.city + " " + copy.password);
            // Asha Pune null
            System.out.println(copy != original);                // true: a brand-new object
        }
        Files.delete(file);
    }
}`],
    codeTitle: ['Save and load an object graph'],
    viz: {
      title: 'writeObject → bytes → readObject, field by field',
      input: 'name=Asha, password=s3cret transient, age=30, count=7 static',
      inputLabel: 'Fields: name=value, add " transient" or " static" (comma separated)',
      gen: serialFrames
    },
    examples: [
      {
        title: 'Shared references and cycles survive',
        html: `<p>Serialization writes each object <b>once</b> and uses back-references (handles) after that. Two fields pointing to the same list still point to one list after reading, and a cycle (a node that points to itself) does not cause infinite recursion.</p>`,
        code: `
class SharedRefs {
    static class Box implements Serializable {
        private static final long serialVersionUID = 1L;
        List<String> a = new ArrayList<>();
        List<String> b;          // will point to the same list as a
        Box self;                // a cycle
    }

    public static void main(String[] args) throws Exception {
        Box box = new Box();
        box.b = box.a;
        box.self = box;
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(bytes)) { out.writeObject(box); }
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(bytes.toByteArray()))) {
            Box copy = (Box) in.readObject();
            System.out.println(copy.a == copy.b);      // true: sharing preserved
            System.out.println(copy.self == copy);     // true: cycle preserved
            System.out.println(copy != box);           // true: new objects
        }
    }
}`
      },
      {
        title: 'NotSerializableException: one bad field ruins it',
        html: `<p>The class is Serializable, but a field holds a <code>Thread</code> (not serializable). Writing fails at run time — the compiler cannot help. Fix: mark the field <code>transient</code> and re-create it after reading, or replace it with a serializable value.</p>`,
        code: `
class BadField {
    static class Job implements Serializable {
        private static final long serialVersionUID = 1L;
        String id = "job-1";
        Thread worker = new Thread(() -> { });    // Thread is NOT Serializable
    }

    public static void main(String[] args) throws IOException {
        try (ObjectOutputStream out = new ObjectOutputStream(new ByteArrayOutputStream())) {
            out.writeObject(new Job());
        } catch (NotSerializableException e) {
            System.out.println("not serializable: " + e.getMessage());   // java.lang.Thread
        }
    }
}`
      },
      {
        title: 'The serialVersionUID story',
        html: `${H.table(['Situation', 'Result'], [
          ['UID declared, you add a new field', H.c('g', 'Works') + ': old data reads, new field gets its default'],
          ['UID declared, you remove a field', H.c('g', 'Works') + ': the stream value is ignored'],
          ['UID declared, you change a field\'s type (int → String)', H.c('r', 'InvalidClassException') + ' (incompatible change)'],
          ['No UID declared, you add a harmless method', H.c('r', 'InvalidClassException') + ': the computed UID changed'],
          ['You bump the UID on purpose', H.c('r', 'InvalidClassException') + ' for all old data — a deliberate "version break"']
        ])}<p>Moral: always declare <code>private static final long serialVersionUID = 1L;</code> and change it only when you want old data rejected.</p>`
      },
      {
        title: 'Allow-list filter before reading anything you did not write',
        html: `<p>An <code>ObjectInputFilter</code> is checked for every class in the stream (and for limits like depth and array size). Anything not allowed is rejected with <code>InvalidClassException</code> <b>before</b> it is instantiated. The pattern syntax: allowed packages/classes separated by <code>;</code>, <code>!*</code> rejects everything else.</p>`,
        code: `
class SafeRead {
    static Object readTrusted(byte[] data) throws IOException, ClassNotFoundException {
        ObjectInputFilter filter = ObjectInputFilter.Config.createFilter(
            "maxdepth=10;maxarray=10000;java.base/java.util.*;java.base/java.lang.*;!*");
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(data))) {
            in.setObjectInputFilter(filter);           // must be set before the first readObject
            return in.readObject();
        }
    }

    public static void main(String[] args) throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(bytes)) {
            out.writeObject(new ArrayList<>(List.of("a", "b")));
        }
        System.out.println(readTrusted(bytes.toByteArray()));   // [a, b]
    }
}`
      }
    ],
    deepDive: `<h4>The stream format</h4>
<p>A Java serialization stream starts with <code>AC ED 00 05</code> (magic + version — you can spot serialized data in network captures by the base64 prefix <code>rO0AB</code>). Then come type codes (<code>TC_OBJECT</code>, <code>TC_CLASSDESC</code>, <code>TC_STRING</code>, <code>TC_REFERENCE</code>…). Each new object gets a <b>handle</b>; later references write only the handle, which is how sharing and cycles survive. Side effect: an <code>ObjectOutputStream</code> remembers every object it wrote, so writing the <b>same</b> object again after modifying it sends only a back-reference (stale data!) — call <code>out.reset()</code> or use <code>writeUnshared</code>. Long-lived streams also leak memory through that handle table.</p>
<h4>How objects are rebuilt</h4>
<p>Deserialization allocates the object via a JVM-internal mechanism that skips the serializable classes' constructors, so <b>invariants enforced in constructors are not checked</b>. An attacker (or a corrupted file) can produce an object with <code>age = -5</code> or a <code>final</code> list that is shared with the outside. Defence: a private <code>readObject</code> that calls <code>in.defaultReadObject()</code>, then validates and makes defensive copies, or the <b>serialization proxy pattern</b> (Effective Java item 90): <code>writeReplace</code> returns a small proxy whose <code>readResolve</code> calls the real constructor. <b>Records</b> (Java 16+) are deserialized through their <b>canonical constructor</b>, so their validation always runs — one reason records are the preferred shape for serializable data today.</p>
<h4>Externalizable</h4>
<p><code>Externalizable</code> gives you full control (<code>writeExternal</code>/<code>readExternal</code>) and requires a public no-arg constructor, which <b>is</b> called. Faster and more compact, but you maintain the format by hand.</p>
<h4>Security history</h4>
<p>Gadget-chain attacks (ysoserial) made Java deserialization one of the most exploited vulnerability classes of the 2010s. Responses: JEP 290 (Java 9, backported to 8u121) added <code>ObjectInputFilter</code> and the <code>jdk.serialFilter</code> system property; JEP 415 (Java 17) added per-context filter factories. Oracle's architects have called serialization a "horrible mistake" and long-term plans aim to replace it with explicit, record-based serialization. Practical rule: never call <code>readObject</code> on bytes from the network, cookies or user uploads.</p>
<h4>Performance</h4>
<p>Java serialization is slow (reflection, class descriptors) and verbose compared with Protobuf, Kryo or JSON with a fast library. Deep-copy by serialization is convenient but can be 10–100× slower than a copy constructor; use it in tests or rare admin paths, not in hot loops.</p>`,
    aiEra: `<p><b>What AI changes:</b> you rarely hand-write serialization code now; assistants generate Jackson DTOs, Protobuf schemas and mappers. The knowledge that still pays off is <b>what can go wrong</b>: version compatibility, invariants bypassed on read, and security.</p>
<p><b>Where AI goes wrong:</b> suggesting <code>implements Serializable</code> as a quick fix for a framework error, forgetting <code>serialVersionUID</code>, proposing deep copy by serialization in performance-critical code, and — most dangerously — writing <code>ObjectInputStream.readObject()</code> on request bodies or Redis values without a filter. Security scanners (and reviewers) flag this; you should too.</p>
<p><b>Use AI as a partner:</b> <i>"Find every place this codebase deserializes data and tell me whether the source is trusted"</i>, or <i>"Convert this Serializable class to a record + JSON with a version field"</i>.</p>
<p><b>What you must still own:</b> transient/static rules, the constructor rule, serialVersionUID behaviour, and a crisp explanation of why deserializing untrusted data is dangerous and what to use instead.</p>`,
    problems: [{
      title: 'Deep Copy an Object Graph via Serialization',
      level: 'Medium', tags: ['serialization', 'deep copy', 'generics', 'ObjectOutputStream'], companies: ['Goldman Sachs', 'Morgan Stanley', 'Oracle'],
      statement: `<p>Write a generic <code>static &lt;T extends Serializable&gt; T deepCopy(T obj)</code> that returns a completely independent copy of <code>obj</code> and everything it references, by serializing to an in-memory byte array and reading it back. Wrap any checked exception in an <code>IllegalStateException</code> with the cause attached. Demonstrate that changing the original's nested list does not affect the copy.</p>`,
      constraints: `Every object in the graph must be Serializable. Use in-memory streams only (no files).`,
      example: `<p><code>Team t = new Team("core", ["asha", "ben"])</code>; <code>Team c = deepCopy(t)</code>; then <code>t.members.add("chen")</code>. Now ${H.c('b', 't.members = [asha, ben, chen]')} but ${H.c('g', 'c.members = [asha, ben]')} — the copy has its <b>own</b> list. A shallow <code>clone()</code> would have printed chen in both.</p>`,
      brute: {
        why: `<p><code>Object.clone()</code> (via <code>Cloneable</code>) copies field values one level deep: the copy's <code>members</code> field points to the <b>same</b> ArrayList as the original. Mutating one mutates "both". Writing per-class copy constructors fixes it, but you must write and maintain one for every class in the graph.</p>`,
        code: `
class ShallowTeam implements Cloneable {
    String name;
    List<String> members = new ArrayList<>();

    @Override
    public ShallowTeam clone() {
        try {
            return (ShallowTeam) super.clone();     // copies the REFERENCE to members
        } catch (CloneNotSupportedException e) {
            throw new AssertionError(e);            // cannot happen: we implement Cloneable
        }
    }
}`
      },
      mcq: { q: 'Why does the serialization round-trip produce a <b>deep</b> copy?', options: ['ObjectInputStream calls clone() on each field', 'writeObject writes every reachable object, and readObject allocates new objects for all of them', 'Serialization only copies primitives', 'Because of serialVersionUID'], answer: 1, explain: 'The entire reachable graph is written to bytes; reading creates a fresh object for each one (preserving sharing inside the graph).' },
      hints: [
        `<p>Hint 1: <code>ByteArrayOutputStream</code> is a stream that writes into memory; <code>toByteArray()</code> gives you the bytes for a <code>ByteArrayInputStream</code>.</p>`,
        `<p>Hint 2: wrap them with <code>ObjectOutputStream</code>/<code>ObjectInputStream</code> in try-with-resources. Close (or flush) the output stream <b>before</b> calling <code>toByteArray()</code>, or the last block of data may still be in its buffer.</p>`,
        `<p>Hint 3: <code>readObject()</code> returns <code>Object</code> — cast to <code>T</code> with <code>@SuppressWarnings("unchecked")</code>. Catch <code>IOException | ClassNotFoundException</code> and rethrow as <code>IllegalStateException("deep copy failed", e)</code>.</p>`
      ],
      solution: {
        approach: `<p>Serialize into a byte array, close the writer (which flushes), then deserialize from that byte array. Every reachable object is recreated, so the copy shares nothing with the original — but sharing <i>inside</i> the graph is preserved.</p>`,
        code: `
class DeepCopy {
    static class Team implements Serializable {
        private static final long serialVersionUID = 1L;
        final String name;
        final List<String> members;
        Team(String name, List<String> members) { this.name = name; this.members = new ArrayList<>(members); }
    }

    static <T extends Serializable> T deepCopy(T obj) {
        try {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (ObjectOutputStream out = new ObjectOutputStream(bytes)) {
                out.writeObject(obj);
            }                                                   // closed = fully flushed
            try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(bytes.toByteArray()))) {
                @SuppressWarnings("unchecked")
                T copy = (T) in.readObject();
                return copy;
            }
        } catch (IOException | ClassNotFoundException e) {
            throw new IllegalStateException("deep copy failed", e);   // keep the cause
        }
    }

    public static void main(String[] args) {
        Team t = new Team("core", List.of("asha", "ben"));
        Team c = deepCopy(t);
        t.members.add("chen");
        System.out.println(t.members);   // [asha, ben, chen]
        System.out.println(c.members);   // [asha, ben]
        System.out.println(c.name.equals(t.name) && c != t);   // true
    }
}`,
        dry: { head: ['step', 'original t', 'copy c', 'shared?'], rows: [
          ['new Team', 'members → list#1 [asha, ben]', '—', '—'],
          ['writeObject(t)', 'bytes: Team, "core", ArrayList[asha, ben]', '—', '—'],
          ['readObject()', 'unchanged', 'members → list#2 [asha, ben]', H.c('g', 'no: list#1 ≠ list#2')],
          ['t.members.add("chen")', '[asha, ben, chen]', '[asha, ben]', H.c('g', 'copy unaffected')]
        ] },
        complexity: `<p>O(size of the object graph) time and memory for the byte array — but with a large constant (reflection, class descriptors). Fine for tests and rare operations; use copy constructors in hot paths.</p>`,
        followUps: ['Make the copy fail fast with a clear message when some field is not Serializable.', 'Measure it against a hand-written copy constructor with JMH.', 'How would you deep-copy a graph with cycles WITHOUT serialization? (identity map of original → copy)']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Predict the Output: The Order of try, catch and finally',
    level: 'Easy', tags: ['predict output', 'try-catch-finally', 'return'], companies: ['TCS', 'Infosys', 'Cognizant', 'Amazon'],
    statement: `<p>What does this program print? Trace it by hand before running it.</p>
<pre><code>class Order {
    static String trace = "";
    static int f(int x) {
        try {
            trace += "T";
            if (x == 0) throw new ArithmeticException("zero");
            trace += "t";
            return 10 / x;
        } catch (ArithmeticException e) {
            trace += "C";
            return -1;
        } finally {
            trace += "F";
        }
    }
    public static void main(String[] args) {
        int a = f(2);
        int b = f(0);
        System.out.println(a + " " + b + " " + trace);
    }
}</code></pre>`,
    constraints: `Write the exact single output line.`,
    example: `<p>Answer: ${H.c('g', '5 -1 TtFTCF')}. Call f(2): ${H.c('b', 'T')}, ${H.c('b', 't')}, return value 5 is computed, then finally adds ${H.c('y', 'F')}. Call f(0): ${H.c('b', 'T')}, throw → catch adds ${H.c('r', 'C')}, return value −1 computed, finally adds ${H.c('y', 'F')}.</p>`,
    brute: {
      why: `<p>Guessing from intuition fails here: people forget that <code>finally</code> runs even after <code>return</code>, or think it runs <b>before</b> the return expression is evaluated. If unsure, instrument the code — print every step — and compare with your mental model.</p>`,
      code: `
class OrderInstrumented {
    static int f(int x) {
        try {
            System.out.println("try start, x=" + x);
            if (x == 0) throw new ArithmeticException("zero");
            int r = 10 / x;
            System.out.println("try returning " + r);
            return r;
        } catch (ArithmeticException e) {
            System.out.println("catch returning -1");
            return -1;
        } finally {
            System.out.println("finally");
        }
    }
    public static void main(String[] args) { f(2); f(0); }
}`
    },
    mcq: { q: 'When <code>return 10 / x;</code> runs inside try, when is <code>10 / x</code> evaluated relative to finally?', options: ['After finally', 'Before finally; the value is saved, finally runs, then the method returns', 'finally is skipped on return', 'At the same time'], answer: 1, explain: 'The return expression is evaluated first and stored; then finally runs; then the stored value is returned (unless finally itself returns or throws).' },
    hints: [
      `<p>Hint 1: trace each call separately and keep a running string. f(2) never throws — which blocks run when there is no exception?</p>`,
      `<p>Hint 2: for f(0), the throw jumps straight to catch, skipping <code>trace += "t"</code>. Does finally still run after the catch's return? Yes.</p>`,
      `<p>Hint 3: the print happens after both calls, so <code>trace</code> contains both calls' letters in order: (T t F)(T C F).</p>`
    ],
    solution: {
      approach: `<p>Apply the three-case rule. No exception: try → finally. Exception caught: try (partial) → catch → finally. Return values are computed before finally and are not changed by it.</p>`,
      code: `
class Order {
    static String trace = "";
    static int f(int x) {
        try {
            trace += "T";
            if (x == 0) throw new ArithmeticException("zero");
            trace += "t";
            return 10 / x;            // 5 computed and saved, then finally runs
        } catch (ArithmeticException e) {
            trace += "C";
            return -1;                // -1 saved, then finally runs
        } finally {
            trace += "F";             // runs in both cases
        }
    }
    public static void main(String[] args) {
        int a = f(2);
        int b = f(0);
        System.out.println(a + " " + b + " " + trace);   // 5 -1 TtFTCF
    }
}`,
      dry: { head: ['call', 'blocks run', 'trace after', 'returned'], rows: [['f(2)', 'try (T, t) → finally (F)', 'TtF', '5'], ['f(0)', 'try (T) → catch (C) → finally (F)', 'TtFTCF', '-1']] },
      complexity: `<p>O(1). The skill is the evaluation order, not the cost.</p>`,
      followUps: ['What if finally also did <code>return 0;</code>?', 'What if the catch were for <code>IllegalStateException</code> instead?', 'Replace <code>trace</code> with a local variable and return it — what changes?']
    }
  });

  practice.push({
    title: 'Predict the Output: return in finally and the Vanishing Exception',
    level: 'Easy', tags: ['predict output', 'finally', 'swallowed exception'], companies: ['Oracle', 'SAP', 'Capgemini'],
    statement: `<p>What does this print, and does the program crash?</p>
<pre><code>class Vanish {
    static int count = 0;
    static int risky() {
        try {
            count++;
            throw new IllegalStateException("bug");
        } catch (IllegalStateException e) {
            count += 10;
            throw new RuntimeException("from catch");
        } finally {
            count += 100;
            return count;
        }
    }
    public static void main(String[] args) {
        System.out.println(risky());
        System.out.println(risky());
    }
}</code></pre>`,
    constraints: `Give both output lines and say whether any exception reaches main.`,
    example: `<p>Output: ${H.c('g', '111')} then ${H.c('g', '222')}. No crash: the <code>RuntimeException("from catch")</code> is ${H.c('r', 'discarded')} by the <code>return</code> in finally. count goes 0 → 1 → 11 → 111, then 112 → 122 → 222.</p>`,
    brute: {
      why: `<p>The tempting answer is "it crashes with RuntimeException: from catch". That ignores the rule that <code>return</code> inside finally replaces whatever reason the block was exiting for — including a pending exception. Rewriting it without the finally-return shows what the author probably meant.</p>`,
      code: `
class VanishFixed {
    static int count = 0;
    static int risky() {
        try {
            count++;
            throw new IllegalStateException("bug");
        } catch (IllegalStateException e) {
            count += 10;
            throw new RuntimeException("from catch", e);   // now it really propagates
        } finally {
            count += 100;                                  // no return here
        }
    }
    public static void main(String[] args) {
        try { risky(); } catch (RuntimeException e) { System.out.println(e.getMessage() + " count=" + count); }
    }
}`
    },
    mcq: { q: 'What happens to an exception that is in flight when <code>finally</code> executes <code>return</code>?', options: ['It is rethrown after the return', 'It is added as suppressed', 'It is silently discarded', 'It becomes the cause of a new exception'], answer: 2, explain: 'A finally block that completes abruptly (return/throw/break) replaces the original completion reason. The exception is lost with no trace.' },
    hints: [
      `<p>Hint 1: follow <code>count</code> carefully — it is static, so the second call continues from the first call's value.</p>`,
      `<p>Hint 2: the catch throws a new exception, but before it can leave the method, finally runs. What does finally do?</p>`,
      `<p>Hint 3: <code>return</code> in finally ends the method normally with that value; the pending exception is forgotten. So both calls print a number.</p>`
    ],
    solution: {
      approach: `<p>Trace count: +1 in try, +10 in catch, +100 in finally, then finally returns it. The exception thrown in catch is dropped by the finally's return. Lesson: never return (or throw) from finally — static analysers flag it ("finally block does not complete normally").</p>`,
      code: `
class Vanish {
    static int count = 0;
    static int risky() {
        try {
            count++;                                      // 1   | 112
            throw new IllegalStateException("bug");
        } catch (IllegalStateException e) {
            count += 10;                                  // 11  | 122
            throw new RuntimeException("from catch");     // pending...
        } finally {
            count += 100;                                 // 111 | 222
            return count;                                 // ...and discarded here
        }
    }
    public static void main(String[] args) {
        System.out.println(risky());   // 111
        System.out.println(risky());   // 222
    }
}`,
      dry: { head: ['call', 'after try', 'after catch', 'after finally', 'result'], rows: [['1st', '1', '11 (throws)', '111', 'returns 111, exception lost'], ['2nd', '112', '122 (throws)', '222', 'returns 222, exception lost']] },
      complexity: `<p>O(1).</p>`,
      followUps: ['What if finally contained <code>throw new IllegalArgumentException()</code> instead of return?', 'How does try-with-resources avoid losing exceptions?', 'Which compiler lint flag warns about this? (<code>-Xlint:finally</code>)']
    }
  });

  practice.push({
    title: 'Custom Checked Exception: Validate a Registration Age',
    level: 'Easy', tags: ['custom exception', 'checked', 'chaining'], companies: ['Infosys', 'Accenture', 'HCL'],
    statement: `<p>Create a checked <code>InvalidAgeException</code> that stores the rejected input text. Write <code>static int parseAge(String text) throws InvalidAgeException</code>: it trims the text, parses it as an int, and accepts 0 to 150. Non-numbers must throw <code>InvalidAgeException</code> <b>with the NumberFormatException as cause</b>; out-of-range values throw it without a cause. Write a <code>main</code> that tries several inputs and prints either the age or the error message.</p>`,
    constraints: `<code>text</code> may be null (treat as invalid). Message format: <code>invalid age: '&lt;text&gt;'</code> plus a reason.`,
    example: `<p><code>" 42 "</code> → ${H.c('g', '42')}; <code>"abc"</code> → ${H.c('r', "invalid age: 'abc' (not a number)")}, <code>getCause()</code> is the NumberFormatException; <code>"200"</code> → ${H.c('r', "invalid age: '200' (must be 0..150)")}; <code>null</code> → ${H.c('r', "invalid age: 'null' (missing)")}.</p>`,
    brute: {
      why: `<p>Returning a magic value like <code>-1</code> for "invalid" forces every caller to remember to check it, carries no reason, and mixes errors with data. Callers forget, and −1 ends up stored in the database as somebody's age.</p>`,
      code: `
static int parseAgeMagic(String text) {
    try {
        int age = Integer.parseInt(text.trim());
        return (age < 0 || age > 150) ? -1 : age;   // -1 means "bad"... hopefully everyone remembers
    } catch (NumberFormatException e) {
        return -1;                                    // reason lost
    }
}`
    },
    mcq: { q: 'Why make <code>InvalidAgeException</code> checked here?', options: ['Checked exceptions are faster', 'Bad user input is an expected, recoverable situation the caller should handle (re-ask the user)', 'Unchecked exceptions cannot have fields', 'The compiler requires it'], answer: 1, explain: 'Validation of external input is a classic case where the caller can do something sensible, so making it part of the method contract is reasonable.' },
    hints: [
      `<p>Hint 1: <code>class InvalidAgeException extends Exception</code> with constructors <code>(String text, String reason)</code> and <code>(String text, String reason, Throwable cause)</code> that build the message and call <code>super(message, cause)</code>.</p>`,
      `<p>Hint 2: check null first, then <code>try { age = Integer.parseInt(text.trim()); } catch (NumberFormatException e) { throw new InvalidAgeException(text, "not a number", e); }</code>.</p>`,
      `<p>Hint 3: after parsing, check the range and throw without a cause. In main, loop over test inputs with a try/catch inside the loop.</p>`
    ],
    solution: {
      approach: `<p>A small checked exception with a data field and two constructors. Parsing errors are <b>translated</b> into the domain exception with the original as cause; range errors are created directly.</p>`,
      code: `
class AgeParser {
    static class InvalidAgeException extends Exception {
        private static final long serialVersionUID = 1L;
        private final String input;

        InvalidAgeException(String input, String reason) { this(input, reason, null); }
        InvalidAgeException(String input, String reason, Throwable cause) {
            super("invalid age: '" + input + "' (" + reason + ")", cause);
            this.input = input;
        }
        String input() { return input; }
    }

    static int parseAge(String text) throws InvalidAgeException {
        if (text == null) throw new InvalidAgeException(null, "missing");
        int age;
        try {
            age = Integer.parseInt(text.trim());
        } catch (NumberFormatException e) {
            throw new InvalidAgeException(text, "not a number", e);       // keep the cause
        }
        if (age < 0 || age > 150) throw new InvalidAgeException(text, "must be 0..150");
        return age;
    }

    public static void main(String[] args) {
        for (String s : new String[]{" 42 ", "abc", "200", null}) {
            try {
                System.out.println("ok " + parseAge(s));
            } catch (InvalidAgeException e) {
                System.out.println(e.getMessage() + (e.getCause() != null ? " cause=" + e.getCause().getClass().getSimpleName() : ""));
            }
        }
    }
}`,
      dry: { head: ['input', 'parse', 'range', 'outcome'], rows: [['" 42 "', '42', 'ok', H.c('g', 'ok 42')], ['"abc"', H.c('r', 'NFE'), '—', "invalid age: 'abc' (not a number) cause=NumberFormatException"], ['"200"', '200', H.c('r', 'out'), "invalid age: '200' (must be 0..150)"], ['null', '—', '—', "invalid age: 'null' (missing)"]] },
      complexity: `<p>O(L) for a string of length L.</p>`,
      followUps: ['Make it unchecked instead — what changes for callers?', 'Collect all errors of a form (name, age, email) into one exception.', 'Add an error code enum for i18n messages.']
    }
  });

  practice.push({
    title: 'wc: Count Lines, Words and Characters from a Reader',
    level: 'Easy', tags: ['BufferedReader', 'Reader', 'streaming', 'try-with-resources'], companies: ['Microsoft', 'Red Hat', 'Zoho'],
    statement: `<p>Implement a mini Unix <code>wc</code>: <code>static long[] wc(Reader in) throws IOException</code> returns <code>{lines, words, chars}</code>. A line is counted for every line returned by <code>readLine</code>; words are maximal runs of non-whitespace; chars counts characters <b>excluding</b> line terminators. Also add <code>wc(Path)</code> that opens the file with UTF-8 and closes it.</p>`,
    constraints: `Input can be gigabytes — stream it. Empty input → {0, 0, 0}.`,
    example: `<p>Text <code>"hello world\\n\\n  java  io \\n"</code> → lines ${H.c('g', '3')} ("hello world", "", "  java  io "), words ${H.c('g', '4')}, chars ${H.c('g', '22')} (11 + 0 + 11).</p>`,
    brute: {
      why: `<p><code>Files.readString(p)</code> + <code>split("\\\\s+")</code> loads the whole file and builds a giant array of words. It also gets the edge cases wrong: splitting a string with leading spaces gives an empty first element, so "  java" counts 2 words.</p>`,
      code: `
static long[] wcBrute(String all) {
    long lines = all.lines().count();
    long words = all.split("\\\\s+").length;                // "  java".split -> ["", "java"]: wrong
    long chars = all.replace("\\n", "").length();
    return new long[]{lines, words, chars};
}`
    },
    mcq: { q: 'Why wrap the Reader in a <code>BufferedReader</code>?', options: ['To get readLine() and read big blocks at once instead of one char per call', 'To convert bytes to chars', 'To make it thread-safe', 'Because Reader is abstract'], answer: 0, explain: 'BufferedReader adds an 8 KB buffer and the readLine() convenience. Converting bytes to chars is InputStreamReader\'s job.' },
    hints: [
      `<p>Hint 1: <code>BufferedReader br = (in instanceof BufferedReader b) ? b : new BufferedReader(in);</code> then loop with <code>readLine()</code>.</p>`,
      `<p>Hint 2: per line: lines++, chars += line.length(); count words by scanning chars and counting positions where a non-space follows a space (or the line start).</p>`,
      `<p>Hint 3: the Path version owns the file: <code>try (Reader r = Files.newBufferedReader(p, UTF_8)) { return wc(r); }</code>. The Reader version must not close what it did not open.</p>`
    ],
    solution: {
      approach: `<p>Stream line by line. Words are counted by detecting the start of each non-whitespace run, which handles leading, trailing and repeated spaces without creating arrays.</p>`,
      code: `
import java.nio.charset.StandardCharsets;
import java.nio.file.*;

class Wc {
    static long[] wc(Reader in) throws IOException {
        BufferedReader br = (in instanceof BufferedReader b) ? b : new BufferedReader(in);
        long lines = 0, words = 0, chars = 0;
        String line;
        while ((line = br.readLine()) != null) {
            lines++;
            chars += line.length();
            boolean inWord = false;
            for (int i = 0; i < line.length(); i++) {
                boolean space = Character.isWhitespace(line.charAt(i));
                if (!space && !inWord) words++;          // a new word starts here
                inWord = !space;
            }
        }
        return new long[]{lines, words, chars};
    }

    static long[] wc(Path p) throws IOException {
        try (Reader r = Files.newBufferedReader(p, StandardCharsets.UTF_8)) {
            return wc(r);
        }
    }

    public static void main(String[] args) throws IOException {
        System.out.println(Arrays.toString(wc(new StringReader("hello world\\n\\n  java  io \\n"))));   // [3, 4, 22]
    }
}`,
      dry: { head: ['line', 'lines', 'words +', 'chars +'], rows: [['"hello world"', '1', '2', '11'], ['""', '2', '0', '0'], ['"  java  io "', '3', '2', '11'], ['end (null)', H.c('g', '3'), H.c('g', '4'), H.c('g', '22')]] },
      complexity: `<p>O(total characters) time, O(longest line) memory.</p>`,
      followUps: ['Count bytes too (like <code>wc -c</code>) — why does it differ from chars?', 'Handle multiple files and print a total line.', 'Make words Unicode-aware (non-breaking space, ideographic space).']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'CSV Score Loader with a Line-Numbered Error Report',
    level: 'Medium', tags: ['BufferedReader', 'validation', 'records', 'error collection'], companies: ['Amazon', 'Walmart', 'Zoho'],
    statement: `<p>Each line of a CSV has the form <code>name,score</code>. Write <code>static Report load(BufferedReader r) throws IOException</code> that returns a record <code>Report(Map&lt;String,Integer&gt; scores, List&lt;String&gt; errors)</code>. Valid lines go into <code>scores</code> (keep insertion order; if a name repeats, keep the <b>highest</b> score). Each invalid line adds an error like <code>"line 3: score 'abc' is not a number"</code>. The first line is a header and must be skipped. Blank lines are ignored.</p>`,
    constraints: `Rules: exactly 2 fields; name non-blank after trim; score an int in 0..100. Up to 10<sup>6</sup> lines.`,
    example: `<p>Input:<br><code>name,score</code><br><code>asha,91</code><br><code>ben,abc</code><br><code>chen,105</code><br><code>asha,95</code><br><code>dev</code><br>→ scores ${H.c('g', '{asha=95}')}; errors ${H.c('r', "[line 3: score 'abc' is not a number, line 4: score 105 out of range, line 6: expected 2 fields but got 1]")}.</p>`,
    brute: {
      why: `<p>Throwing on the first bad line gives the user one error per run — fix, rerun, next error… for a file with 500 bad rows that is 500 runs. Collect <b>all</b> problems in one pass and report them together (with line numbers, so they can be found).</p>`,
      code: `
static Map<String, Integer> loadStrict(BufferedReader r) throws IOException {
    Map<String, Integer> m = new LinkedHashMap<>();
    r.readLine();                                         // header
    String line;
    while ((line = r.readLine()) != null) {
        String[] f = line.split(",");
        m.put(f[0], Integer.parseInt(f[1].trim()));       // first bad line kills the whole load
    }
    return m;
}`
    },
    mcq: { q: 'What is the most useful behaviour for a batch import of user-provided rows?', options: ['Abort on the first bad row', 'Skip bad rows silently', 'Import the good rows and return a list of every bad row with its line number', 'Retry the bad rows'], answer: 2, explain: 'Users can fix everything at once; nothing is hidden. (Whether to import good rows when some are bad is a business decision — "all-or-nothing" is also valid, but still report all errors.)' },
    hints: [
      `<p>Hint 1: keep your own <code>lineNo</code> counter (or use <code>LineNumberReader</code>). Increment it for every line, including the header and blanks, so numbers match what the user sees in an editor.</p>`,
      `<p>Hint 2: <code>line.split(",", -1)</code> keeps trailing empty fields so <code>"x,"</code> is 2 fields. Parse inside a small try/catch around <code>Integer.parseInt</code> only.</p>`,
      `<p>Hint 3: <code>scores.merge(name, score, Math::max)</code> keeps the highest. Use <code>LinkedHashMap</code> for insertion order. Return <code>new Report(scores, errors)</code>.</p>`
    ],
    solution: {
      approach: `<p>Single streaming pass. Every rule check either records an error with the line number and <code>continue</code>s, or the row is merged into the map. Exceptions are used only for the one place the JDK forces it (<code>parseInt</code>), with the narrowest possible try.</p>`,
      code: `
class ScoreLoader {
    record Report(Map<String, Integer> scores, List<String> errors) { }

    static Report load(BufferedReader r) throws IOException {
        Map<String, Integer> scores = new LinkedHashMap<>();
        List<String> errors = new ArrayList<>();
        String line;
        int lineNo = 0;
        while ((line = r.readLine()) != null) {
            lineNo++;
            if (lineNo == 1 || line.isBlank()) continue;          // header / blank
            String[] f = line.split(",", -1);
            if (f.length != 2) { errors.add("line " + lineNo + ": expected 2 fields but got " + f.length); continue; }
            String name = f[0].trim();
            if (name.isEmpty()) { errors.add("line " + lineNo + ": name is blank"); continue; }
            int score;
            try {
                score = Integer.parseInt(f[1].trim());
            } catch (NumberFormatException e) {
                errors.add("line " + lineNo + ": score '" + f[1].trim() + "' is not a number");
                continue;
            }
            if (score < 0 || score > 100) { errors.add("line " + lineNo + ": score " + score + " out of range"); continue; }
            scores.merge(name, score, Math::max);                  // keep the highest
        }
        return new Report(scores, errors);
    }

    public static void main(String[] args) throws IOException {
        String csv = "name,score\\nasha,91\\nben,abc\\nchen,105\\nasha,95\\ndev\\n";
        System.out.println(load(new BufferedReader(new StringReader(csv))));
    }
}`,
      dry: { head: ['line #', 'text', 'check', 'result'], rows: [['1', 'name,score', 'header', 'skip'], ['2', 'asha,91', 'ok', '{asha=91}'], ['3', 'ben,abc', H.c('r', 'NFE'), 'error'], ['4', 'chen,105', H.c('r', 'range'), 'error'], ['5', 'asha,95', 'ok, merge max', '{asha=95}'], ['6', 'dev', H.c('r', '1 field'), 'error']] },
      complexity: `<p>O(total characters) time; O(distinct names + errors) memory. Cap the error list (say 1,000) for huge files.</p>`,
      followUps: ['Support quoted fields with commas inside (<code>"Smith, J",88</code>).', 'Make it all-or-nothing: throw one exception listing every error if any exist.', 'Process the file in parallel chunks — what breaks with line numbers?']
    }
  });

  practice.push({
    title: 'Predict the Output: Two Failing close() Calls in try-with-resources',
    level: 'Medium', tags: ['predict output', 'try-with-resources', 'suppressed'], companies: ['Google', 'Oracle', 'JPMorgan'],
    statement: `<p>Predict every line of output.</p>
<pre><code>class R implements AutoCloseable {
    final String n;
    R(String n) { this.n = n; System.out.println("open " + n); }
    public void close() { System.out.println("close " + n); throw new IllegalStateException(n); }
}
class Main {
    public static void main(String[] args) {
        try (R a = new R("A"); R b = new R("B")) {
            System.out.println("body");
            throw new RuntimeException("X");
        } catch (Exception e) {
            System.out.println("caught " + e.getMessage());
            for (Throwable s : e.getSuppressed()) System.out.println("suppressed " + s.getMessage());
        } finally {
            System.out.println("finally");
        }
    }
}</code></pre>`,
    constraints: `Give every printed line, in order (there are 9).`,
    example: `<p>${H.c('b', 'open A')}, ${H.c('b', 'open B')}, body, ${H.c('y', 'close B')}, ${H.c('y', 'close A')}, ${H.c('r', 'caught X')}, suppressed B, suppressed A, and last of all ${H.c('g', 'finally')}.</p>`,
    brute: {
      why: `<p>Common wrong answers: closing in declaration order (A then B), printing "caught" before the closes, or reporting B (the last close failure) as the caught exception. The rules: close reverse → catch → finally; the body's exception stays primary; close failures are suppressed in the order they happened.</p>`,
      code: `
class OldStyle {
    // What the same logic looks like without TWR — and why it LOSES X:
    static void run() {
        AutoCloseable a = null;
        try {
            a = () -> { throw new IllegalStateException("A"); };
            throw new RuntimeException("X");
        } finally {
            try { if (a != null) a.close(); } catch (Exception e) { throw new RuntimeException(e); }  // replaces X
        }
    }
}`
    },
    mcq: { q: 'Which exception does the catch block receive?', options: ['A (closed last)', 'B (closed first)', 'X (thrown by the body)', 'A wrapper containing all three'], answer: 2, explain: 'The body\'s exception is primary. B and A are attached as suppressed, in the order the closes ran: B first, then A.' },
    hints: [
      `<p>Hint 1: resources open in declaration order and close in reverse order — before catch runs.</p>`,
      `<p>Hint 2: the body throws X first, so X is the primary exception. Each failing close calls <code>X.addSuppressed(...)</code>.</p>`,
      `<p>Hint 3: suppressed order = order of the failing closes: B, then A. finally prints last.</p>`
    ],
    solution: {
      approach: `<p>Apply the TWR order: open A, open B, body (throws X), close B (suppressed B), close A (suppressed A), catch X, finally.</p>`,
      code: `
class R implements AutoCloseable {
    final String n;
    R(String n) { this.n = n; System.out.println("open " + n); }
    public void close() { System.out.println("close " + n); throw new IllegalStateException(n); }
}

class TwrPredict {
    public static void main(String[] args) {
        try (R a = new R("A"); R b = new R("B")) {
            System.out.println("body");
            throw new RuntimeException("X");
        } catch (Exception e) {
            System.out.println("caught " + e.getMessage());
            for (Throwable s : e.getSuppressed()) System.out.println("suppressed " + s.getMessage());
        } finally {
            System.out.println("finally");
        }
    }
}
/* open A / open B / body / close B / close A / caught X / suppressed B / suppressed A / finally */`,
      dry: { head: ['step', 'printed', 'primary', 'suppressed'], rows: [['open', 'open A, open B', '—', '[]'], ['body', 'body', 'X', '[]'], ['close B', 'close B', 'X', '[B]'], ['close A', 'close A', 'X', '[B, A]'], ['catch + finally', 'caught X, suppressed B, suppressed A, finally', 'handled', '—']] },
      complexity: `<p>O(number of resources).</p>`,
      followUps: ['What if the body did NOT throw? (caught B, suppressed A)', 'What if R\'s constructor for B threw? (A is still closed)', 'What does <code>e.printStackTrace()</code> show for this case?']
    }
  });

  practice.push({
    title: 'Call Checked-Exception Methods Inside Streams',
    level: 'Medium', tags: ['lambdas', 'UncheckedIOException', 'functional interface', 'streams'], companies: ['Netflix', 'Atlassian', 'LinkedIn'],
    statement: `<p><code>files.stream().map(p -&gt; Files.size(p))</code> does not compile: <code>Function.apply</code> cannot throw <code>IOException</code>. Write a functional interface <code>IoFunction&lt;T,R&gt;</code> and an adapter <code>static &lt;T,R&gt; Function&lt;T,R&gt; unchecked(IoFunction&lt;T,R&gt; f)</code> that wraps <code>IOException</code> in <code>UncheckedIOException</code>. Then write <code>static long totalSize(List&lt;Path&gt; files) throws IOException</code> that uses it and <b>converts back</b> to the checked <code>IOException</code> at the method boundary.</p>`,
    constraints: `Do not catch or wrap unchecked exceptions; do not lose the original IOException (subclass and message must survive).`,
    example: `<p>Files of 10 and 32 bytes → ${H.c('g', '42')}. If one path is missing → <code>totalSize</code> throws ${H.c('r', 'NoSuchFileException')} (the original subclass, unwrapped), not an UncheckedIOException.</p>`,
    brute: {
      why: `<p>Writing a try/catch inside every lambda is noisy and often ends with <code>return 0L;</code> in the catch — silently treating missing files as empty. Others "fix" it with <code>catch (Exception e) { throw new RuntimeException(e); }</code>, which hides the type and makes callers catch RuntimeException.</p>`,
      code: `
static long totalSizeNoisy(List<java.nio.file.Path> files) {
    return files.stream().mapToLong(p -> {
        try {
            return java.nio.file.Files.size(p);
        } catch (IOException e) {
            return 0L;                      // bug: a missing file counts as 0 bytes
        }
    }).sum();
}`
    },
    mcq: { q: 'Why convert <code>UncheckedIOException</code> back to <code>IOException</code> at the method boundary?', options: ['UncheckedIOException is slower', 'So callers keep a precise, checked contract (and the original subclass like NoSuchFileException)', 'Streams require it', 'To add a stack trace'], answer: 1, explain: 'The wrapper is an implementation detail of using lambdas. getCause() returns the original IOException, which you rethrow.' },
    hints: [
      `<p>Hint 1: <code>@FunctionalInterface interface IoFunction&lt;T,R&gt; { R apply(T t) throws IOException; }</code>.</p>`,
      `<p>Hint 2: <code>unchecked(f)</code> returns <code>t -&gt; { try { return f.apply(t); } catch (IOException e) { throw new UncheckedIOException(e); } }</code>.</p>`,
      `<p>Hint 3: in totalSize, wrap the whole stream pipeline in <code>try { … } catch (UncheckedIOException e) { throw e.getCause(); }</code> — <code>getCause()</code> is typed as <code>IOException</code>.</p>`
    ],
    solution: {
      approach: `<p>Adapter pattern: a throwing functional interface + a converter to <code>Function</code>. The checked exception travels through the stream as an <code>UncheckedIOException</code> and is unwrapped at the boundary, preserving the exact original exception.</p>`,
      code: `
import java.nio.file.*;

class StreamsAndIo {
    @FunctionalInterface
    interface IoFunction<T, R> { R apply(T t) throws IOException; }

    static <T, R> Function<T, R> unchecked(IoFunction<T, R> f) {
        return t -> {
            try {
                return f.apply(t);
            } catch (IOException e) {
                throw new UncheckedIOException(e);          // tunnel through the lambda
            }
        };
    }

    static long totalSize(List<Path> files) throws IOException {
        try {
            return files.stream()
                        .map(unchecked(Files::size))         // Files.size throws IOException
                        .mapToLong(Long::longValue)
                        .sum();
        } catch (UncheckedIOException e) {
            throw e.getCause();                              // original NoSuchFileException etc.
        }
    }

    public static void main(String[] args) throws IOException {
        Path a = Files.createTempFile("a", ".txt"), b = Files.createTempFile("b", ".txt");
        Files.writeString(a, "0123456789");
        Files.write(b, new byte[32]);
        System.out.println(totalSize(List.of(a, b)));          // 42
        try {
            totalSize(List.of(a, Path.of("missing.bin")));
        } catch (NoSuchFileException e) {
            System.out.println("missing: " + e.getFile());
        }
        Files.delete(a);
        Files.delete(b);
    }
}`,
      dry: { head: ['element', 'Files.size', 'in stream', 'outcome'], rows: [['a', '10', '10L', 'sum 10'], ['b', '32', '32L', H.c('g', 'sum 42')], ['missing.bin', H.c('r', 'NoSuchFileException'), 'UncheckedIOException(cause)', 'unwrapped → caller catches NoSuchFileException']] },
      complexity: `<p>O(n) file-size calls; no extra memory beyond the stream.</p>`,
      followUps: ['Generalise to any checked exception type <code>E</code> with a generic sneaky-throw.', 'Collect all failures instead of stopping at the first.', 'How do parallel streams change which exception you see?']
    }
  });

  practice.push({
    title: 'Tail: The Last N Lines of a Huge File',
    level: 'Medium', tags: ['ArrayDeque', 'streaming', 'BufferedReader'], companies: ['Amazon', 'Google', 'Bloomberg'],
    statement: `<p>Implement <code>static List&lt;String&gt; tail(BufferedReader r, int n) throws IOException</code> returning the last <code>n</code> lines in original order, like <code>tail -n</code>. The file may be far larger than memory, but <code>n</code> is small.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>4</sup>; file up to 100 GB; reject negative n with IllegalArgumentException.`,
    example: `<p>Lines a, b, c, d, e with n = 2 → ${H.c('g', '[d, e]')}. With n = 10 → all five lines. With n = 0 → []. The deque never holds more than n lines: after "c" it holds [b, c], after "e" it holds [d, e].</p>`,
    brute: {
      why: `<p><code>Files.readAllLines</code> then <code>subList(size - n, size)</code> is correct but needs the whole 100 GB file in memory. Reading the file twice (count lines, then skip) needs only O(n) memory but doubles the I/O.</p>`,
      code: `
static List<String> tailBrute(java.nio.file.Path p, int n) throws IOException {
    List<String> all = java.nio.file.Files.readAllLines(p);   // entire file in memory
    return all.subList(Math.max(0, all.size() - n), all.size());
}`
    },
    mcq: { q: 'Which structure gives O(1) "drop the oldest, add the newest"?', options: ['ArrayList (remove(0))', 'ArrayDeque (pollFirst + addLast)', 'TreeMap', 'String concatenation'], answer: 1, explain: 'ArrayDeque is a circular array: both ends are O(1). ArrayList.remove(0) shifts all elements: O(n).' },
    hints: [
      `<p>Hint 1: you only ever need the latest n lines seen so far — a sliding window over the stream.</p>`,
      `<p>Hint 2: <code>ArrayDeque&lt;String&gt;</code>: for each line, <code>addLast(line)</code>; if size &gt; n, <code>pollFirst()</code>.</p>`,
      `<p>Hint 3: handle n = 0 (return empty immediately, but still a valid call) and negative n (throw). Return <code>new ArrayList&lt;&gt;(deque)</code>.</p>`
    ],
    solution: {
      approach: `<p>Stream once, keep a bounded deque as a sliding window. Memory is O(n · line length) regardless of file size. (A further optimisation for files on disk: seek near the end with <code>RandomAccessFile</code>/<code>FileChannel</code> and scan backwards for newlines — O(n) I/O instead of reading the whole file.)</p>`,
      code: `
class Tail {
    static List<String> tail(BufferedReader r, int n) throws IOException {
        if (n < 0) throw new IllegalArgumentException("n must be >= 0, was " + n);
        if (n == 0) return List.of();
        ArrayDeque<String> window = new ArrayDeque<>(n + 1);
        String line;
        while ((line = r.readLine()) != null) {
            window.addLast(line);
            if (window.size() > n) window.pollFirst();       // forget the oldest line
        }
        return new ArrayList<>(window);
    }

    public static void main(String[] args) throws IOException {
        System.out.println(tail(new BufferedReader(new StringReader("a\\nb\\nc\\nd\\ne")), 2));   // [d, e]
        System.out.println(tail(new BufferedReader(new StringReader("a\\nb")), 10));            // [a, b]
    }
}`,
      dry: { head: ['line read', 'after addLast', 'size > 2?', 'window'], rows: [['a', '[a]', 'no', '[a]'], ['b', '[a, b]', 'no', '[a, b]'], ['c', '[a, b, c]', 'yes → poll a', '[b, c]'], ['d', '[b, c, d]', 'yes → poll b', '[c, d]'], ['e', '[c, d, e]', 'yes → poll c', H.c('g', '[d, e]')]] },
      complexity: `<p>O(total size) time to read; O(n) lines of memory.</p>`,
      followUps: ['Implement the seek-from-the-end version with RandomAccessFile.', 'Implement <code>tail -f</code> (follow new lines) with WatchService or polling.', 'What about a UTF-16 file when scanning backwards?']
    }
  });

  practice.push({
    title: 'Binary Records with DataOutputStream and a Truncation Check',
    level: 'Medium', tags: ['DataOutputStream', 'EOFException', 'binary format', 'custom exception'], companies: ['Bloomberg', 'Citadel', 'Uber'],
    statement: `<p>Design a tiny binary file format for products <code>record Product(int id, String name, double price)</code>: a 4-byte magic number <code>0xCAFE0001</code>, a 4-byte count, then each record as <code>int</code>, <code>writeUTF</code> string, <code>double</code>. Write <code>write(OutputStream, List&lt;Product&gt;)</code> and <code>read(InputStream)</code>. If the magic is wrong or the file ends early, <code>read</code> must throw a custom <code>CorruptFileException</code> (checked, extends IOException) with a clear message and the cause.</p>`,
    constraints: `Up to 10<sup>6</sup> records; names up to 100 chars. Do not close the streams passed in.`,
    example: `<p>Writing [Product(1,"pen",9.5), Product(2,"ink",3.0)] produces 4 + 4 + (4+2+3+8) × 2 = ${H.c('b', '42 bytes')}. Reading them back returns an equal list. Cutting the file to 30 bytes → ${H.c('r', 'CorruptFileException: truncated at record 2 of 2')}.</p>`,
    brute: {
      why: `<p>Writing text with <code>toString()</code> and parsing it back with <code>split</code> breaks as soon as a name contains a comma, loses double precision if formatted, and cannot tell a truncated file from a short one. Without a count or magic number, a half-written file reads as "fewer records" — silent data loss.</p>`,
      code: `
static void writeText(PrintWriter out, List<String[]> rows) {
    for (String[] r : rows) out.println(String.join(",", r));   // "Pen, blue" breaks parsing
}`
    },
    mcq: { q: 'What does <code>DataInputStream.readInt()</code> do if only 2 bytes are left?', options: ['Returns -1', 'Returns a partial value', 'Throws EOFException', 'Blocks forever'], answer: 2, explain: 'The readXxx methods of DataInputStream throw EOFException when the stream ends before the full value is read — perfect for detecting truncation.' },
    hints: [
      `<p>Hint 1: wrap with <code>new DataOutputStream(new BufferedOutputStream(out))</code>, write magic, count, then fields in a fixed order; <code>flush()</code> at the end (do not close — you do not own <code>out</code>).</p>`,
      `<p>Hint 2: read in exactly the same order. Check the magic first. Keep a loop index so the error can say which record failed.</p>`,
      `<p>Hint 3: catch <code>EOFException</code> around the record loop and rethrow <code>new CorruptFileException("truncated at record " + (i + 1) + " of " + count, e)</code>. Validate count ≥ 0.</p>`
    ],
    solution: {
      approach: `<p>A self-describing header (magic + count) lets the reader detect wrong files and truncation. <code>DataOutputStream</code> writes big-endian primitives and length-prefixed modified-UTF-8 strings; <code>DataInputStream</code> reads them back and throws <code>EOFException</code> on early end, which we translate into a domain exception with context.</p>`,
      code: `
class ProductFile {
    record Product(int id, String name, double price) { }

    static class CorruptFileException extends IOException {
        private static final long serialVersionUID = 1L;
        CorruptFileException(String msg, Throwable cause) { super(msg, cause); }
    }

    static final int MAGIC = 0xCAFE0001;

    static void write(OutputStream os, List<Product> items) throws IOException {
        DataOutputStream out = new DataOutputStream(new BufferedOutputStream(os));
        out.writeInt(MAGIC);
        out.writeInt(items.size());
        for (Product p : items) {
            out.writeInt(p.id());
            out.writeUTF(p.name());          // 2-byte length + modified UTF-8 bytes
            out.writeDouble(p.price());      // 8 bytes, exact
        }
        out.flush();                          // push buffered bytes; caller owns os
    }

    static List<Product> read(InputStream is) throws IOException {
        DataInputStream in = new DataInputStream(new BufferedInputStream(is));
        int magic, count;
        try {
            magic = in.readInt();
            count = in.readInt();
        } catch (EOFException e) {
            throw new CorruptFileException("file too short for header", e);
        }
        if (magic != MAGIC) throw new CorruptFileException("bad magic 0x" + Integer.toHexString(magic), null);
        if (count < 0) throw new CorruptFileException("negative count " + count, null);
        List<Product> items = new ArrayList<>(Math.min(count, 1 << 16));
        for (int i = 0; i < count; i++) {
            try {
                items.add(new Product(in.readInt(), in.readUTF(), in.readDouble()));
            } catch (EOFException e) {
                throw new CorruptFileException("truncated at record " + (i + 1) + " of " + count, e);
            }
        }
        return items;
    }

    public static void main(String[] args) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        write(bytes, List.of(new Product(1, "pen", 9.5), new Product(2, "ink", 3.0)));
        byte[] data = bytes.toByteArray();
        System.out.println(data.length);                                          // 42
        System.out.println(read(new ByteArrayInputStream(data)));
        try {
            read(new ByteArrayInputStream(Arrays.copyOf(data, 30)));
        } catch (CorruptFileException e) {
            System.out.println(e.getMessage());                                   // truncated at record 2 of 2
        }
    }
}`,
      dry: { head: ['bytes', 'field', 'value'], rows: [['0–3', 'magic', 'CA FE 00 01'], ['4–7', 'count', '2'], ['8–24', 'record 1', 'id 1, "pen" (2+3 bytes), 9.5 (8 bytes)'], ['25–41', 'record 2', 'id 2, "ink", 3.0'], ['cut at 30', 'record 2', H.c('r', 'readUTF hits EOF → CorruptFileException')]] },
      complexity: `<p>O(total bytes) for both directions; memory O(records) for the returned list (stream them via a callback for huge files).</p>`,
      followUps: ['Add a CRC32 checksum at the end to detect corruption, not just truncation.', 'Add a version number so the format can evolve.', 'Why is <code>writeUTF</code> limited to 65,535 bytes, and how would you store longer strings?']
    }
  });

  practice.push({
    title: 'A Connection Pool Whose Leases Close Themselves',
    level: 'Medium', tags: ['AutoCloseable', 'idempotent close', 'resource management', 'design'], companies: ['Microsoft', 'Salesforce', 'PayPal'],
    statement: `<p>Build <code>class Pool</code> with a fixed number of connection ids (1..size). <code>Lease lease()</code> hands out a free id and throws <code>IllegalStateException("pool exhausted")</code> when none is free. <code>Lease</code> implements <code>AutoCloseable</code>: <code>close()</code> returns the id to the pool. Closing twice must be harmless (idempotent) and must not return the id twice. Using a closed lease (<code>id()</code>) must throw <code>IllegalStateException</code>. Show that try-with-resources returns connections even when the body throws.</p>`,
    constraints: `Single-threaded is fine (mention what changes for multi-threaded use). 1 ≤ size ≤ 100.`,
    example: `<p>Pool(2): lease → id 1, lease → id 2, third lease → ${H.c('r', 'pool exhausted')}. Inside <code>try (Lease l = pool.lease()) { throw … }</code> the id is ${H.c('g', 'returned')} anyway; afterwards <code>pool.available()</code> is back to 2. Calling <code>close()</code> again leaves it at 2, not 3.</p>`,
    brute: {
      why: `<p>A plain <code>int acquire()</code> / <code>void release(int)</code> API relies on every caller remembering <code>release</code> in a finally block. One forgotten path (an early return, an exception) leaks a connection forever, and double release silently corrupts the pool by adding the same id twice.</p>`,
      code: `
class ManualPool {
    private final Deque<Integer> free = new ArrayDeque<>(List.of(1, 2));
    int acquire() { return free.pop(); }               // NoSuchElementException when empty
    void release(int id) { free.push(id); }             // double release = duplicate id!
}`
    },
    mcq: { q: 'Why should <code>close()</code> be idempotent?', options: ['It is faster', 'Resources are often closed by several layers (TWR plus a wrapper); a second close must not corrupt state', 'The compiler requires it', 'To allow re-opening'], answer: 1, explain: 'Closeable explicitly documents that closing an already-closed stream has no effect. Wrappers close what they wrap, so double-close is common.' },
    hints: [
      `<p>Hint 1: keep free ids in an <code>ArrayDeque&lt;Integer&gt;</code>. <code>lease()</code> pops one or throws when empty.</p>`,
      `<p>Hint 2: <code>Lease</code> is an inner class with the id and a <code>boolean closed</code>. <code>close()</code>: if already closed, return; else mark closed and push the id back.</p>`,
      `<p>Hint 3: <code>id()</code> checks <code>closed</code> and throws <code>IllegalStateException("lease closed")</code>. For multi-threading, make lease/close synchronized or use a <code>Semaphore</code> + concurrent queue.</p>`
    ],
    solution: {
      approach: `<p>Turn "remember to release" into "release is automatic": the pool hands out an AutoCloseable lease object. try-with-resources guarantees close on every exit path; the closed flag makes close idempotent and guards use-after-close.</p>`,
      code: `
class Pool {
    private final ArrayDeque<Integer> free = new ArrayDeque<>();

    Pool(int size) {
        if (size < 1 || size > 100) throw new IllegalArgumentException("size 1..100");
        for (int i = 1; i <= size; i++) free.addLast(i);
    }

    int available() { return free.size(); }

    Lease lease() {
        Integer id = free.pollFirst();
        if (id == null) throw new IllegalStateException("pool exhausted");
        return new Lease(id);
    }

    final class Lease implements AutoCloseable {
        private final int id;
        private boolean closed;

        private Lease(int id) { this.id = id; }

        int id() {
            if (closed) throw new IllegalStateException("lease closed");
            return id;
        }

        @Override
        public void close() {                     // no checked exception: easy to use in TWR
            if (closed) return;                   // idempotent
            closed = true;
            free.addFirst(id);
        }
    }

    public static void main(String[] args) {
        Pool pool = new Pool(2);
        try (Lease l = pool.lease()) {
            System.out.println("using " + l.id() + ", available " + pool.available());   // using 1, available 1
            throw new IllegalStateException("query failed");
        } catch (IllegalStateException e) {
            System.out.println(e.getMessage() + ", available " + pool.available());     // query failed, available 2
        }
        Lease a = pool.lease(), b = pool.lease();
        try { pool.lease(); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }  // pool exhausted
        a.close(); a.close();                                                             // second close ignored
        b.close();
        System.out.println(pool.available());                                             // 2
    }
}`,
      dry: { head: ['action', 'free ids', 'note'], rows: [['new Pool(2)', '[1, 2]', ''], ['TWR lease', '[2]', 'l.id() = 1'], ['body throws → close', '[1, 2]', H.c('g', 'returned before catch')], ['lease a, b', '[]', 'third lease → exhausted'], ['a.close() twice, b.close()', '[2, 1]', H.c('g', 'size 2, no duplicate')]] },
      complexity: `<p>O(1) per lease and close.</p>`,
      followUps: ['Make it thread-safe and make lease() wait up to a timeout instead of failing.', 'Add leak detection: log a stack trace if a lease is not closed within 30 s (HikariCP-style).', 'Use a <code>Cleaner</code> as a safety net for leases that become unreachable without close.']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Merge K Sorted Files Without Leaking a Single Handle',
    level: 'Hard', tags: ['k-way merge', 'PriorityQueue', 'resource safety', 'external sort'], companies: ['Google', 'Amazon', 'Snowflake', 'Databricks'],
    statement: `<p>You have K text files, each with integers sorted ascending, one per line (the output of the "sort chunks" phase of an external sort). Write <code>static void merge(List&lt;Path&gt; inputs, Path output) throws IOException</code> that writes all numbers in ascending order to <code>output</code>. Memory must be O(K), not O(total). <b>Every</b> reader must be closed even if opening the 7th file fails or a line is not a number; a bad line must produce an <code>IOException</code> naming the file and line number.</p>`,
    constraints: `1 ≤ K ≤ 1000 files; total size can be 500 GB; numbers fit in long.`,
    example: `<p>Files: ${H.c('b', '[1, 4, 9]')}, ${H.c('y', '[2, 3, 10]')}, ${H.c('p', '[5]')} → output ${H.c('g', '1 2 3 4 5 9 10')}. The heap holds at most one "head" per file: initially {1, 2, 5}; pop 1, push 4 from the same file → {2, 4, 5}; and so on.</p>`,
    brute: {
      why: `<p>Reading all files into one list and sorting is O(N log N) time but O(N) memory — impossible at 500 GB. A second naive approach scans all K heads to find the minimum each step: O(N·K) time. And opening readers in a loop with no cleanup leaks every already-open file when one fails to open.</p>`,
      code: `
static List<Long> mergeBrute(List<java.nio.file.Path> inputs) throws IOException {
    List<Long> all = new ArrayList<>();
    for (java.nio.file.Path p : inputs)
        for (String s : java.nio.file.Files.readAllLines(p)) all.add(Long.parseLong(s.trim()));
    Collections.sort(all);                     // O(N) memory: impossible for 500 GB
    return all;
}`
    },
    mcq: { q: 'How do you guarantee that K readers opened in a loop are all closed, even if opening reader #7 throws?', options: ['One try-with-resources per reader, nested K deep', 'Register each reader in a list as soon as it is opened, and close them all in finally (collecting suppressed exceptions)', 'Rely on the garbage collector', 'Close them at the end of the method'], answer: 1, explain: 'TWR needs a fixed number of resources. For a dynamic number, track them in a collection and close all in a finally block (or a Closer helper), never stopping at the first close failure.' },
    hints: [
      `<p>Hint 1: the classic k-way merge: a min-heap of (value, readerIndex). Pop the smallest, write it, read the next line from the same reader and push it.</p>`,
      `<p>Hint 2: open readers one by one, adding each to a <code>List&lt;BufferedReader&gt;</code> immediately. Put the whole algorithm in <code>try { … } finally { closeAll(readers, primary) }</code>, where closeAll closes every reader and attaches failures as suppressed.</p>`,
      `<p>Hint 3: wrap parsing in a helper that catches <code>NumberFormatException</code> and throws <code>new IOException(file + ":" + lineNo + " not a number", e)</code>. Track line numbers per reader in an <code>int[]</code>. The writer goes in its own TWR.</p>`
    ],
    solution: {
      approach: `<p>Min-heap of size ≤ K gives O(N log K) time and O(K) memory. Resource safety: readers are registered the moment they open, and a finally block closes all of them, keeping the first exception as primary and adding the rest as suppressed — the same contract as try-with-resources, but for a dynamic count.</p>`,
      code: `
import java.nio.file.*;

class KWayMerge {
    record Head(long value, int src) { }

    static void merge(List<Path> inputs, Path output) throws IOException {
        List<BufferedReader> readers = new ArrayList<>();
        Throwable primary = null;
        try {
            for (Path p : inputs) readers.add(Files.newBufferedReader(p));   // registered immediately
            int[] lineNo = new int[readers.size()];
            PriorityQueue<Head> heap = new PriorityQueue<>(Comparator.comparingLong(Head::value));
            for (int i = 0; i < readers.size(); i++) push(heap, readers, inputs, lineNo, i);
            try (BufferedWriter out = Files.newBufferedWriter(output)) {
                while (!heap.isEmpty()) {
                    Head h = heap.poll();
                    out.write(Long.toString(h.value()));
                    out.newLine();
                    push(heap, readers, inputs, lineNo, h.src());               // refill from the same file
                }
            }
        } catch (IOException | RuntimeException | Error e) {
            primary = e;
            throw e;
        } finally {
            closeAll(readers, primary);
        }
    }

    private static void push(PriorityQueue<Head> heap, List<BufferedReader> rs, List<Path> paths,
                             int[] lineNo, int i) throws IOException {
        String line;
        while ((line = rs.get(i).readLine()) != null) {
            lineNo[i]++;
            if (line.isBlank()) continue;
            try {
                heap.add(new Head(Long.parseLong(line.trim()), i));
            } catch (NumberFormatException e) {
                throw new IOException(paths.get(i) + ":" + lineNo[i] + " is not a number: '" + line + "'", e);
            }
            return;
        }
    }

    private static void closeAll(List<BufferedReader> readers, Throwable primary) throws IOException {
        IOException first = null;
        for (int i = readers.size() - 1; i >= 0; i--) {          // reverse order, like TWR
            try {
                readers.get(i).close();
            } catch (IOException e) {
                if (primary != null) primary.addSuppressed(e);
                else if (first == null) first = e;
                else first.addSuppressed(e);
            }
        }
        if (first != null) throw first;
    }

    public static void main(String[] args) throws IOException {
        Path dir = Files.createTempDirectory("merge");
        Path a = Files.writeString(dir.resolve("a.txt"), "1\\n4\\n9\\n");
        Path b = Files.writeString(dir.resolve("b.txt"), "2\\n3\\n10\\n");
        Path c = Files.writeString(dir.resolve("c.txt"), "5\\n");
        Path out = dir.resolve("out.txt");
        merge(List.of(a, b, c), out);
        System.out.println(Files.readAllLines(out));             // [1, 2, 3, 4, 5, 9, 10]
    }
}`,
      dry: { head: ['step', 'heap (value@file)', 'written', 'refill from'], rows: [['init', '{1@a, 2@b, 5@c}', '', ''], ['1', '{2@b, 4@a, 5@c}', '1', 'a → 4'], ['2', '{3@b, 4@a, 5@c}', '2', 'b → 3'], ['3', '{4@a, 5@c, 10@b}', '3', 'b → 10'], ['4', '{5@c, 9@a, 10@b}', '4', 'a → 9'], ['5', '{9@a, 10@b}', '5', 'c → (end)'], ['6–7', '{}', '9, 10', H.c('g', 'done; all readers closed')]] },
      complexity: `<p>O(N log K) time for N numbers, O(K) memory (one head + one 8 KB buffer per file). With K = 1000 that is about 8 MB of buffers — choose K and buffer size together.</p>`,
      followUps: ['Implement the first phase too: split a huge file into sorted chunks that fit in memory.', 'Remove duplicates while merging.', 'What if K exceeds the OS open-file limit (ulimit -n)? (multi-pass merge)']
    }
  });

  practice.push({
    title: 'Build a Closer: Close Any Number of Resources Like try-with-resources',
    level: 'Hard', tags: ['AutoCloseable', 'suppressed', 'API design', 'generics'], companies: ['Google', 'Meta', 'Stripe'],
    statement: `<p>try-with-resources needs the resources written in the header. Build <code>final class Closer implements AutoCloseable</code> for a <b>dynamic</b> number of resources: <code>&lt;C extends AutoCloseable&gt; C register(C c)</code> returns its argument; <code>close()</code> closes everything in <b>reverse registration order</b>, continues after failures, throws the <b>first</b> failure with all later failures attached as suppressed, and is idempotent. Registering after close must close the new resource immediately and throw <code>IllegalStateException</code>.</p>`,
    constraints: `close() of a resource may throw any Exception; Errors (like OutOfMemoryError) must not be swallowed either. Single-threaded.`,
    example: `<p>Register A, B (close throws "B"), C (close throws "C"). <code>closer.close()</code> closes ${H.c('b', 'C, B, A')}; throws ${H.c('r', 'C')} with suppressed ${H.c('y', '[B]')}. A second <code>close()</code> does nothing.</p>`,
    brute: {
      why: `<p>A simple loop <code>for (r : list) r.close();</code> stops at the first failure — every later resource leaks — and closes in the wrong order (dependencies like "writer wraps stream" need reverse order). Catching and ignoring failures hides real problems.</p>`,
      code: `
static void closeAllNaive(List<AutoCloseable> list) throws Exception {
    for (AutoCloseable c : list) c.close();     // first failure leaks the rest; wrong order
}`
    },
    mcq: { q: 'Resource 3 of 5 throws in close(). What should a correct closer do?', options: ['Stop and rethrow immediately', 'Remember the exception, keep closing 2 and 1, then throw it (with later failures as suppressed)', 'Retry closing 3', 'Ignore it'], answer: 1, explain: 'Every resource deserves a close attempt. The first failure is the most informative; later ones are attached so nothing is lost.' },
    hints: [
      `<p>Hint 1: store resources in an <code>ArrayDeque</code> and use <code>push</code>/<code>pop</code> — popping gives reverse order for free.</p>`,
      `<p>Hint 2: in close(), loop while the deque is not empty; catch <code>Throwable t</code> around each close; keep <code>first</code>; for later ones call <code>first.addSuppressed(t)</code>. Set a <code>closed</code> flag first for idempotency.</p>`,
      `<p>Hint 3: at the end rethrow <code>first</code> preserving its type: if it is an Exception throw it (close() declares <code>throws Exception</code>), if an Error throw it as Error. In register-after-close, close the argument (attaching any failure) before throwing IllegalStateException.</p>`
    ],
    solution: {
      approach: `<p>A stack of resources plus the exact suppression contract of try-with-resources. Catching <code>Throwable</code> is justified here because we always rethrow it — nothing is swallowed, we just make sure every resource gets its close attempt first.</p>`,
      code: `
final class Closer implements AutoCloseable {
    private final ArrayDeque<AutoCloseable> stack = new ArrayDeque<>();
    private boolean closed;

    <C extends AutoCloseable> C register(C c) {
        if (c == null) return null;                       // like TWR: null resources are ignored
        if (closed) {
            IllegalStateException ise = new IllegalStateException("closer already closed");
            try { c.close(); } catch (Throwable t) { ise.addSuppressed(t); }
            throw ise;
        }
        stack.push(c);
        return c;
    }

    @Override
    public void close() throws Exception {
        if (closed) return;                               // idempotent
        closed = true;
        Throwable first = null;
        while (!stack.isEmpty()) {
            AutoCloseable c = stack.pop();                // most recently registered first
            try {
                c.close();
            } catch (Throwable t) {
                if (first == null) first = t;
                else if (first != t) first.addSuppressed(t);   // avoid self-suppression
            }
        }
        if (first instanceof Exception e) throw e;
        if (first instanceof Error err) throw err;
        if (first != null) throw new IllegalStateException(first);   // exotic Throwable subclass
    }

    public static void main(String[] args) {
        try (Closer closer = new Closer()) {
            closer.register(() -> System.out.println("close A"));
            closer.register(() -> { System.out.println("close B"); throw new IOException("B"); });
            closer.register(() -> { System.out.println("close C"); throw new IllegalStateException("C"); });
            System.out.println("working");
        } catch (Exception e) {
            System.out.println("caught " + e.getMessage() + ", suppressed " + e.getSuppressed().length);
        }
        // working / close C / close B / close A / caught C, suppressed 1
    }
}`,
      dry: { head: ['pop', 'close() result', 'first', 'suppressed'], rows: [['C', H.c('r', 'throws C'), 'C', '[]'], ['B', H.c('r', 'throws B'), 'C', '[B]'], ['A', 'ok', 'C', '[B]'], ['end', '—', H.c('r', 'throw C'), '[B]']] },
      complexity: `<p>O(n) for n registered resources; O(n) memory.</p>`,
      followUps: ['Make it thread-safe for concurrent register calls.', 'Add <code>rethrow(Throwable)</code> like Guava\'s Closer so a primary exception from the body takes precedence.', 'Compare with Spring\'s <code>DisposableBean</code> ordering and JUnit 5\'s <code>AutoClose</code>.']
    }
  });

  practice.push({
    title: 'Directory Report That Survives Unreadable Folders',
    level: 'Hard', tags: ['walkFileTree', 'FileVisitor', 'error tolerance', 'NIO.2'], companies: ['Dropbox', 'Microsoft', 'Box'],
    statement: `<p>Write <code>static Report scan(Path root) throws IOException</code> returning a record <code>Report(long files, long bytes, Path largest, List&lt;String&gt; failures)</code> for everything under <code>root</code>. Requirements: do <b>not</b> follow symbolic links; skip any directory named <code>.git</code> or <code>node_modules</code> entirely; if a file or folder cannot be read (permission denied, deleted during the scan), record <code>"&lt;path&gt;: &lt;ExceptionSimpleName&gt;"</code> in failures and <b>continue</b>. Only a failure on <code>root</code> itself should throw.</p>`,
    constraints: `Trees with 10<sup>6</sup>+ entries; constant memory apart from the failures list.`,
    example: `<p>root/ has a.txt (10 B), src/B.java (300 B), .git/ (ignored, 5,000 files), secret/ (no permission). → ${H.c('g', 'files=2, bytes=310, largest=root/src/B.java')}, failures = ${H.c('r', '["root/secret: AccessDeniedException"]')}.</p>`,
    brute: {
      why: `<p><code>Files.walk(root)</code> is lovely until the first unreadable folder: it throws <code>UncheckedIOException</code> from inside the stream and the whole scan dies, with no partial result. It also walks into <code>.git</code> and <code>node_modules</code> (often 90% of all files) because a stream filter cannot prune a subtree — it still visits everything below.</p>`,
      code: `
static long countBrute(java.nio.file.Path root) throws IOException {
    try (Stream<java.nio.file.Path> s = java.nio.file.Files.walk(root)) {
        return s.filter(java.nio.file.Files::isRegularFile)
                .filter(p -> !p.toString().contains(".git"))   // still descends into .git!
                .count();                                      // one AccessDenied kills everything
    }
}`
    },
    mcq: { q: 'Which FileVisitor return value skips everything inside a directory?', options: ['CONTINUE', 'SKIP_SIBLINGS', 'SKIP_SUBTREE (returned from preVisitDirectory)', 'TERMINATE'], answer: 2, explain: 'Returning SKIP_SUBTREE from preVisitDirectory prevents the walker from opening that directory at all — real pruning, unlike filtering a stream.' },
    hints: [
      `<p>Hint 1: <code>Files.walkFileTree(root, visitor)</code> with a <code>SimpleFileVisitor&lt;Path&gt;</code>. By default it does not follow symlinks (no <code>FOLLOW_LINKS</code> option).</p>`,
      `<p>Hint 2: override <code>preVisitDirectory</code> (return SKIP_SUBTREE for ignored names, but never for root), <code>visitFile</code> (count, add <code>attrs.size()</code>, track largest), and <code>visitFileFailed</code> (record and return CONTINUE).</p>`,
      `<p>Hint 3: <code>postVisitDirectory(dir, exc)</code> receives an exception if listing the directory failed midway — record it too. For root failures, check <code>Files.isDirectory(root)</code> and let <code>visitFileFailed</code> rethrow when <code>file.equals(root)</code>.</p>`
    ],
    solution: {
      approach: `<p>The visitor API gives a callback per event and lets each failure be handled locally: record and continue. Pruning happens in <code>preVisitDirectory</code>, so ignored trees are never opened. File sizes come free from the <code>BasicFileAttributes</code> the walker already read.</p>`,
      code: `
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;

class DirReport {
    record Report(long files, long bytes, Path largest, List<String> failures) { }

    private static final Set<String> IGNORED = Set.of(".git", "node_modules");

    static Report scan(Path root) throws IOException {
        long[] files = {0}, bytes = {0}, maxSize = {-1};
        Path[] largest = {null};
        List<String> failures = new ArrayList<>();

        Files.walkFileTree(root, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
                Path name = dir.getFileName();
                if (!dir.equals(root) && name != null && IGNORED.contains(name.toString()))
                    return FileVisitResult.SKIP_SUBTREE;                 // never opened
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
                if (attrs.isRegularFile()) {
                    files[0]++;
                    bytes[0] += attrs.size();
                    if (attrs.size() > maxSize[0]) { maxSize[0] = attrs.size(); largest[0] = file; }
                }
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFileFailed(Path file, IOException exc) throws IOException {
                if (file.equals(root)) throw exc;                        // cannot even start
                failures.add(file + ": " + exc.getClass().getSimpleName());
                return FileVisitResult.CONTINUE;                         // keep going
            }

            @Override
            public FileVisitResult postVisitDirectory(Path dir, IOException exc) {
                if (exc != null) failures.add(dir + ": " + exc.getClass().getSimpleName());
                return FileVisitResult.CONTINUE;
            }
        });
        return new Report(files[0], bytes[0], largest[0], failures);
    }

    public static void main(String[] args) throws IOException {
        Path root = Files.createTempDirectory("scan");
        Files.writeString(root.resolve("a.txt"), "0123456789");
        Files.createDirectories(root.resolve("src"));
        Files.write(root.resolve("src").resolve("B.java"), new byte[300]);
        Files.createDirectories(root.resolve(".git"));
        Files.writeString(root.resolve(".git").resolve("HEAD"), "ref: main");
        Report r = scan(root);
        System.out.println(r.files() + " files, " + r.bytes() + " bytes, largest " + r.largest().getFileName());
        // 2 files, 310 bytes, largest B.java
    }
}`,
      dry: { head: ['event', 'path', 'action', 'files / bytes'], rows: [['preVisit', 'root', 'CONTINUE', '0 / 0'], ['visitFile', 'a.txt (10)', 'count', '1 / 10'], ['preVisit', '.git', H.c('y', 'SKIP_SUBTREE'), '1 / 10'], ['preVisit', 'src', 'CONTINUE', '1 / 10'], ['visitFile', 'B.java (300)', 'count, new largest', '2 / 310'], ['visitFileFailed', 'secret', H.c('r', 'record AccessDenied, CONTINUE'), H.c('g', '2 / 310')]] },
      complexity: `<p>O(number of visited entries) time; O(depth) memory for the walker plus the failures list (cap it for huge trees).</p>`,
      followUps: ['Also report the 10 largest files (bounded min-heap).', 'Find duplicate files: group by size first, then hash only same-size files.', 'Follow symlinks safely — how does the JDK detect cycles (<code>FileSystemLoopException</code>)?']
    }
  });

  practice.push({
    title: 'Serializable Range That Cannot Be Forged',
    level: 'Hard', tags: ['serialization', 'readObject', 'invariants', 'security', 'records'], companies: ['Oracle', 'Goldman Sachs', 'Visa'],
    statement: `<p>A class <code>Range</code> with two <code>int</code> fields <code>lo</code> and <code>hi</code> promises <code>lo ≤ hi</code>; the constructor checks it. Because deserialization does <b>not</b> call the constructor, a tampered byte stream can create <code>Range(lo=9, hi=1)</code>. (1) Demonstrate the attack by swapping bytes in the serialized form. (2) Fix it with a private <code>readObject</code> that validates and throws <code>InvalidObjectException</code>. (3) Show the modern alternative: a <code>record</code>, whose canonical constructor runs during deserialization.</p>`,
    constraints: `Use only java.io. The class has no custom writeObject, so its two int fields are the last 8 bytes of the stream (primitive fields are written sorted by name: hi, then lo).`,
    example: `<p>Serialize <code>new Range(1, 9)</code>; the last 8 bytes are ${H.c('b', '00 00 00 09')} (hi) ${H.c('b', '00 00 00 01')} (lo). Swap the two 4-byte groups → stream now says hi = 1, lo = 9. Unprotected class: readObject returns ${H.c('r', 'Range[lo=9, hi=1]')} — the invariant is broken. Protected class: ${H.c('g', 'InvalidObjectException: lo > hi')}.</p>`,
    brute: {
      why: `<p>Trusting that "the constructor validates, so every object is valid" is exactly the flaw. Serialization is a <b>hidden constructor</b>: it fills fields directly. Any check that lives only in the constructor is skipped when reading from bytes.</p>`,
      code: `
class NaiveRange implements Serializable {
    private static final long serialVersionUID = 1L;
    final int lo, hi;
    NaiveRange(int lo, int hi) {
        if (lo > hi) throw new IllegalArgumentException("lo > hi");
        this.lo = lo;
        this.hi = hi;                     // validated here... but readObject never comes here
    }
}`
    },
    mcq: { q: 'During deserialization of a record, which code runs?', options: ['No constructor at all', 'The canonical constructor, with the values from the stream', 'The no-arg constructor', 'readObject only'], answer: 1, explain: 'Records are serialized as their components and deserialized by calling the canonical constructor — so compact-constructor validation always runs.' },
    hints: [
      `<p>Hint 1: serialize into a <code>ByteArrayOutputStream</code>, take <code>toByteArray()</code>, and swap bytes <code>[n-8 .. n-5]</code> with <code>[n-4 .. n-1]</code>.</p>`,
      `<p>Hint 2: the fix: <code>private void readObject(ObjectInputStream in) throws IOException, ClassNotFoundException { in.defaultReadObject(); if (lo &gt; hi) throw new InvalidObjectException("lo &gt; hi"); }</code>. Final fields are fine: defaultReadObject sets them.</p>`,
      `<p>Hint 3: for the record version, validate in the compact constructor: <code>record RangeR(int lo, int hi) implements Serializable { RangeR { if (lo &gt; hi) throw new IllegalArgumentException(); } }</code>. Tampered data then fails inside readObject with the constructor's exception wrapped in InvalidObjectException.</p>`
    ],
    solution: {
      approach: `<p>Treat <code>readObject</code> like a public constructor: read the default fields, then re-check every invariant (and defensively copy any mutable fields). Prefer records for serializable value types: their deserialization goes through the canonical constructor, so validation cannot be bypassed.</p>`,
      code: `
class SafeRange implements Serializable {
    private static final long serialVersionUID = 1L;
    final int lo, hi;

    SafeRange(int lo, int hi) {
        if (lo > hi) throw new IllegalArgumentException("lo > hi");
        this.lo = lo;
        this.hi = hi;
    }

    private void readObject(ObjectInputStream in) throws IOException, ClassNotFoundException {
        in.defaultReadObject();                                   // fills lo and hi (even though final)
        if (lo > hi) throw new InvalidObjectException("lo > hi: " + lo + " > " + hi);
    }

    @Override
    public String toString() { return "Range[lo=" + lo + ", hi=" + hi + "]"; }
}

record RangeRecord(int lo, int hi) implements Serializable {
    RangeRecord {                                                 // compact canonical constructor
        if (lo > hi) throw new IllegalArgumentException("lo > hi");
    }
}

class ForgeDemo {
    static byte[] serialize(Object o) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(b)) { out.writeObject(o); }
        return b.toByteArray();
    }

    static byte[] swapLastTwoInts(byte[] data) {
        byte[] d = data.clone();
        int n = d.length;
        for (int i = 0; i < 4; i++) {                             // swap [n-8..n-5] with [n-4..n-1]
            byte t = d[n - 8 + i];
            d[n - 8 + i] = d[n - 4 + i];
            d[n - 4 + i] = t;
        }
        return d;
    }

    static Object deserialize(byte[] data) throws IOException, ClassNotFoundException {
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(data))) {
            return in.readObject();
        }
    }

    public static void main(String[] args) throws Exception {
        byte[] forged = swapLastTwoInts(serialize(new SafeRange(1, 9)));
        try {
            System.out.println(deserialize(forged));
        } catch (InvalidObjectException e) {
            System.out.println("rejected: " + e.getMessage());     // rejected: lo > hi: 9 > 1
        }
        byte[] forgedRecord = swapLastTwoInts(serialize(new RangeRecord(1, 9)));
        try {
            System.out.println(deserialize(forgedRecord));
        } catch (InvalidObjectException e) {
            System.out.println("record rejected: " + e.getMessage());
        }
    }
}`,
      dry: { head: ['step', 'stream says', 'SafeRange', 'NaiveRange'], rows: [['serialize Range(1,9)', 'hi=9, lo=1', '—', '—'], ['swap last 8 bytes', 'hi=1, lo=9', '—', '—'], ['readObject', 'fields filled directly', H.c('g', 'readObject re-checks → InvalidObjectException'), H.c('r', 'Range[lo=9, hi=1] — invariant broken')]] },
      complexity: `<p>O(size of stream). The validation adds O(1) per object.</p>`,
      followUps: ['Add a mutable <code>Date</code> field: why do you also need a defensive copy in readObject?', 'Implement the serialization proxy pattern (writeReplace/readResolve) for the class.', 'Write an <code>ObjectInputFilter</code> that only allows <code>SafeRange</code>.']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'Which of these is a <b>checked</b> exception?', options: ['<code>NumberFormatException</code>', '<code>InterruptedException</code>', '<code>ConcurrentModificationException</code>', '<code>StackOverflowError</code>'], answer: 1, explain: 'InterruptedException extends Exception directly. NumberFormatException and ConcurrentModificationException extend RuntimeException; StackOverflowError is an Error. All three of those are unchecked.' },
    { q: 'An overridden method in the parent declares <code>throws IOException</code>. Which override does <b>not</b> compile?', options: ['<code>void m() throws FileNotFoundException</code>', '<code>void m()</code>', '<code>void m() throws IllegalStateException</code>', '<code>void m() throws Exception</code>'], answer: 3, explain: 'An override may throw fewer or narrower checked exceptions, and any unchecked ones — never a broader checked exception like Exception.' },
    { q: 'What does <code>static int f() { int x = 1; try { return x; } finally { x = 5; } }</code> return?', options: ['1', '5', '6', 'Compile error'], answer: 0, explain: 'The return value 1 is evaluated and saved before finally runs; changing the local x afterwards does not affect it.' },
    { q: 'In <code>try (A a = new A(); B b = new B()) { … } catch (Exception e) { … }</code>, what is the order?', options: ['open A, open B, body, catch, close B, close A', 'open A, open B, body, close B, close A, catch', 'open A, open B, body, close A, close B, catch', 'open B, open A, body, close A, close B, catch'], answer: 1, explain: 'Resources open in declaration order and close in reverse order, and closing happens before any catch or finally of that statement runs.' },
    { q: 'The try-with-resources body throws X and then <code>close()</code> throws Y. What does the catch block see?', options: ['Y, with X suppressed', 'X, with Y in <code>getSuppressed()</code>', 'Only Y', 'An exception with both as causes'], answer: 1, explain: 'The body\'s exception stays primary; the close failure is attached with addSuppressed. Plain finally { close(); } would have lost X.' },
    { q: 'Which statement about <code>finally</code> is FALSE?', options: ['It runs after a return in try', 'It runs when an exception propagates out of try', 'It runs after System.exit(0) is called in try', 'A return inside finally discards a pending exception'], answer: 2, explain: 'System.exit starts JVM shutdown and never returns, so the finally block is not executed.' },
    { q: 'Which line correctly reads text with an explicit charset using NIO.2?', options: ['<code>new FileReader("a.txt")</code>', '<code>Files.newBufferedReader(Path.of("a.txt"), StandardCharsets.UTF_8)</code>', '<code>new BufferedInputStream(new File("a.txt"))</code>', '<code>Files.readAllBytes("a.txt")</code>'], answer: 1, explain: 'newBufferedReader takes a Path and a Charset and returns a buffered Reader. FileReader uses the default charset (UTF-8 only since Java 18); the other two do not compile.' },
    { q: 'After writing 3 bytes into a fresh <code>ByteBuffer.allocate(8)</code> and calling <code>flip()</code>, what are position and limit?', options: ['position 3, limit 8', 'position 0, limit 3', 'position 0, limit 8', 'position 3, limit 3'], answer: 1, explain: 'flip sets limit to the current position (3) and position to 0, switching the buffer from write mode to read mode.' },
    { q: 'Why must <code>Files.lines(path)</code> be used inside try-with-resources?', options: ['It is slow otherwise', 'The returned Stream keeps the file open until it is closed', 'It loads the whole file', 'Streams cannot be reused'], answer: 1, explain: 'Files.lines, Files.list and Files.walk return streams backed by open file/directory handles. Stream implements AutoCloseable; closing it releases the handle.' },
    { q: 'Which field is written by default Java serialization?', options: ['<code>static int count</code>', '<code>transient String token</code>', '<code>private final String name</code>', 'None of them'], answer: 2, explain: 'Instance fields — private and final included — are serialized. static fields belong to the class and transient fields are explicitly skipped.' },
    { q: 'During deserialization of <code>class User implements Serializable</code> (direct subclass of Object), which constructor runs?', options: ['User\'s no-arg constructor', 'User\'s canonical constructor', 'Only Object\'s no-arg constructor', 'All of User\'s constructors'], answer: 2, explain: 'The JVM runs the no-arg constructor of the first non-serializable superclass (here Object) and fills User\'s fields directly, skipping User\'s constructors. Records are the exception: their canonical constructor runs.' },
    { q: 'What is the main danger of calling <code>readObject()</code> on bytes received from the network?', options: ['It is slow', 'It may instantiate arbitrary classes and run their hooks (gadget chains), leading to remote code execution', 'It leaks memory', 'It ignores serialVersionUID'], answer: 1, explain: 'Untrusted deserialization is a well-known RCE vector. Avoid it, or use ObjectInputFilter allow-lists; prefer JSON or Protobuf for external data.' },
    { q: 'Inside a multi-catch <code>catch (IOException | SQLException e)</code>, which statement is true?', options: ['You may reassign e', 'e is implicitly final', 'IOException and SQLException must share a subclass', 'Only one type is allowed per catch'], answer: 1, explain: 'A multi-catch parameter is implicitly final. Its alternatives must not be subclasses of each other.' }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { q: 'What is the difference between checked and unchecked exceptions? When would you use each?', level: 'B',
      a: `<p><b>Checked</b> exceptions are subclasses of <code>Exception</code> that are not <code>RuntimeException</code>s; the compiler enforces <b>handle or declare</b>. <b>Unchecked</b> ones are <code>RuntimeException</code> and <code>Error</code> subclasses, with no compile-time requirement. I use unchecked exceptions for programming errors and broken contracts (<code>IllegalArgumentException</code>, <code>IllegalStateException</code>, NPE) and for infrastructure failures the immediate caller cannot fix. I use checked exceptions sparingly, for expected, recoverable conditions that are part of an API's contract (e.g. <code>InsufficientFundsException</code>, a user-chosen file that is missing). The distinction exists only in javac — the JVM treats them the same.</p>`,
      followUps: ['Why do many modern frameworks prefer unchecked exceptions?', 'How do checked exceptions interact with lambdas?', 'Is <code>Exception</code> itself checked?'] },
    { q: 'Explain the exception hierarchy in Java.', level: 'B',
      a: `<p><code>Throwable</code> is the root of everything throwable. It has two branches: <code>Error</code> — serious JVM-level problems you generally should not catch (<code>OutOfMemoryError</code>, <code>StackOverflowError</code>, <code>NoClassDefFoundError</code>) — and <code>Exception</code>. Under Exception sits <code>RuntimeException</code> (unchecked: NPE, IllegalArgument, IllegalState, ArithmeticException, ClassCastException, IndexOutOfBounds, ConcurrentModification) and all other checked exceptions (<code>IOException</code> and its children like <code>FileNotFoundException</code>, <code>SQLException</code>, <code>InterruptedException</code>, <code>ClassNotFoundException</code>). Every Throwable carries a message, an optional cause, a stack trace and a list of suppressed exceptions.</p>`,
      followUps: ['Why should you not catch Throwable?', 'What is NoClassDefFoundError vs ClassNotFoundException?', 'When does ExceptionInInitializerError occur?'] },
    { q: 'Does finally always execute? Walk through the tricky cases.', level: 'I',
      a: `<p>It runs on normal completion, on <code>return</code>, <code>break</code>/<code>continue</code>, and when an exception (caught or not) leaves the try or catch. It does <b>not</b> run if the JVM stops: <code>System.exit()</code>, <code>Runtime.halt()</code>, a crash, <code>kill -9</code>, power loss; nor if the try never finishes (infinite loop, deadlock) or a daemon thread is still inside try when the JVM exits. Tricky semantics: the return value is computed before finally, so changing a returned primitive in finally has no effect (but mutating a returned object does); and a <code>return</code>/<code>throw</code> inside finally overrides the original outcome, silently discarding any pending exception.</p>`,
      followUps: ['What does javac generate for finally?', 'What happens if finally throws while another exception is in flight?', 'Why is return in finally flagged by linters?'] },
    { q: 'What is try-with-resources and what problems does it solve?', level: 'B',
      a: `<p>Java 7's <code>try (Res r = …) { }</code> automatically calls <code>close()</code> on every declared <code>AutoCloseable</code> when the block exits — normally, by return, or by exception. Resources close in <b>reverse</b> order of declaration, <b>before</b> catch and finally run. It solves three problems of manual <code>finally { close(); }</code>: forgetting to close, verbose null checks and nested try blocks, and — most importantly — <b>exception masking</b>: if both the body and close() throw, the body's exception stays primary and the close failure is attached as a <b>suppressed</b> exception instead of replacing it. Java 9 also allows effectively final variables: <code>try (reader) { }</code>.</p>`,
      followUps: ['AutoCloseable vs Closeable?', 'What happens if a resource is null?', 'How would you handle a dynamic number of resources?'] },
    { q: 'How do you design custom exceptions for an application?', level: 'I',
      a: `<p>I create custom exceptions only when callers need to <b>react differently</b> or need extra data; otherwise standard ones (IllegalArgument, IllegalState, NoSuchElement, UnsupportedOperation) are clearer. Typically one unchecked base (<code>AppException</code>) with an error code, and subclasses grouped by handling — client errors (not found, validation, conflict) vs server errors (dependency failure, timeout). Each has <code>(message)</code> and <code>(message, cause)</code> constructors, immutable fields for context (ids, amounts), a <code>serialVersionUID</code>, and no sensitive data in messages. A single global handler maps them to HTTP status / problem-details responses and logs each failure once. With Java 17+, a sealed hierarchy plus pattern-matching switch lets the compiler check the mapping is exhaustive.</p>`,
      followUps: ['Checked or unchecked for InsufficientFunds?', 'How do you avoid exception explosion (a class per method)?', 'How do you map exceptions to HTTP codes?'] },
    { q: 'What is exception chaining and why does it matter?', level: 'I',
      a: `<p>Chaining means creating a higher-level exception that keeps the lower-level one as its <b>cause</b>: <code>throw new DataAccessException("loading order 42", sqlEx)</code>. It allows <b>exception translation</b> at layer boundaries — the repository does not leak <code>SQLException</code> to the controller — without losing the root cause, which appears as "Caused by:" in stack traces. Without the cause, logs show only the generic wrapper and debugging becomes guesswork. Related tools: <code>getCause()</code>, <code>initCause()</code> for legacy exceptions without a cause constructor, and suppressed exceptions for secondary failures. When reading a chained trace, start from the last "Caused by" for the root cause and the top for what the app was doing.</p>`,
      followUps: ['Difference between cause and suppressed?', 'What does "... 12 more" mean in a stack trace?', 'How do ExecutionException and CompletionException relate to chaining?'] },
    { q: 'List exception-handling anti-patterns you look for in code review.', level: 'I',
      a: `<p>(1) <b>Swallowing</b>: empty catch blocks or <code>catch (Exception e) { e.printStackTrace(); }</code> then continuing with bad state. (2) <b>Catching too broadly</b> — <code>Exception</code>/<code>Throwable</code> deep in business logic. (3) <b>Losing the cause</b>: <code>new RuntimeException(e.getMessage())</code>. (4) <b>Log and rethrow</b> at every layer → duplicate log entries. (5) <b>Exceptions as control flow</b> (loop exits, normal "not found"). (6) <b>return/throw in finally</b>. (7) Ignoring <b>InterruptedException</b> without restoring the flag. (8) Manual close in finally instead of try-with-resources. (9) <code>throws Exception</code> on every signature. (10) Leaking internal details or secrets in messages returned to clients.</p>`,
      followUps: ['When is catching Exception acceptable?', 'Where should logging happen?', 'How do you enforce these rules automatically?'] },
    { q: 'How should you handle InterruptedException?', level: 'A',
      a: `<p>Interruption is a cooperative cancellation request. When a blocking method (<code>sleep</code>, <code>wait</code>, <code>join</code>, <code>BlockingQueue.take</code>) throws <code>InterruptedException</code>, it has <b>cleared</b> the thread's interrupt flag. The best option is to <b>propagate</b> it (declare <code>throws InterruptedException</code>). If you cannot (e.g. inside <code>Runnable.run</code>), <b>restore the flag</b> with <code>Thread.currentThread().interrupt()</code> and exit promptly, so code higher up — such as an executor shutting down — sees the request. Never swallow it silently: that makes threads impossible to stop and causes hangs on shutdown. Wrapping it in a RuntimeException without restoring the flag is also a bug.</p>`,
      followUps: ['How does ExecutorService.shutdownNow use interruption?', 'Do virtual threads change interruption semantics?', 'What is Thread.interrupted() vs isInterrupted()?'] },
    { q: 'Compare java.io and java.nio. Which would you use for a new project?', level: 'I',
      a: `<p><b>java.io</b> is stream-oriented and blocking: <code>InputStream/OutputStream</code> for bytes, <code>Reader/Writer</code> for chars, composed with decorators (BufferedReader around InputStreamReader around FileInputStream). <b>java.nio</b> (1.4) adds buffers, channels (two-way, can be non-blocking), selectors for multiplexing many sockets on few threads, memory-mapped files and zero-copy <code>transferTo</code>. <b>NIO.2</b> (Java 7) adds <code>Path</code> and <code>Files</code> with precise exceptions, symlinks, attributes, tree walking and WatchService. For a new project: <code>Path</code>/<code>Files</code> for all file operations, buffered readers/writers for sequential text, channels for very large or random-access files. For network servers, frameworks (Netty) use NIO; with Java 21 virtual threads, simple blocking code is often enough.</p>`,
      followUps: ['What problem does a Selector solve?', 'Heap vs direct ByteBuffer?', 'Why is java.io.File considered legacy?'] },
    { q: 'How would you process a 50 GB log file in Java?', level: 'A',
      a: `<p>Stream it — never <code>readAllLines</code>. Use <code>Files.newBufferedReader(path, UTF_8)</code> (or <code>Files.lines</code> in try-with-resources) and process line by line, keeping only aggregates (counters, top-K heaps, HyperLogLog for distinct counts) in memory. Handle bad lines per record (count/report them) instead of failing the run. Choose the charset explicitly and decide what to do with malformed input (<code>CharsetDecoder</code> with REPLACE vs REPORT). For speed: bigger buffers, avoid regex per line, parse bytes directly from a <code>FileChannel</code> or memory-mapped segments, and split the file at newline boundaries to process chunks in parallel. If it is gzip, wrap in <code>GZIPInputStream</code>. If it is recurring work, consider tools built for it (a log pipeline, Spark, DuckDB).</p>`,
      followUps: ['How would you find the top 10 IPs?', 'How do you split the file for parallel processing safely?', 'How would you tail it in real time?'] },
    { q: 'What is serialVersionUID and what happens if you do not declare it?', level: 'I',
      a: `<p>It is a version stamp written into the serialized stream. On reading, the JVM compares it with the local class's UID; a mismatch throws <code>InvalidClassException</code>. If you do not declare it, Java <b>computes</b> one from the class's structure (name, interfaces, fields, methods, modifiers). Almost any change — even adding a method, or compiling with a different compiler that generates different synthetic members — changes the computed value, so previously saved data can no longer be read. Declaring <code>private static final long serialVersionUID = 1L;</code> keeps compatibility for compatible changes (adding/removing fields), and you bump it deliberately only to reject old data.</p>`,
      followUps: ['Which class changes are incompatible even with a fixed UID?', 'Do records need a serialVersionUID?', 'Do exceptions need one?'] },
    { q: 'Explain the role of transient, and how to restore transient state after deserialization.', level: 'I',
      a: `<p><code>transient</code> marks instance fields that default serialization must skip: secrets (passwords, tokens), derived caches, and objects that are not serializable or meaningless in another JVM (threads, sockets, loggers, locks). After deserialization they hold default values (null, 0, false). To restore them, implement <code>private void readObject(ObjectInputStream in)</code>: call <code>in.defaultReadObject()</code>, then recompute or re-create the transient fields (e.g. rebuild a cache, create a new lock). Note that <code>final transient</code> fields cannot be reassigned there without reflection, so make such fields non-final or use the serialization proxy pattern. <code>static</code> fields are never serialized regardless of transient.</p>`,
      followUps: ['What is readResolve used for?', 'How does Externalizable differ?', 'Why are loggers usually static?'] },
    { q: 'Why is Java deserialization considered dangerous, and what are the mitigations?', level: 'A',
      a: `<p><code>ObjectInputStream.readObject</code> will instantiate any serializable class on the classpath named in the stream and invoke its <code>readObject</code>/<code>readResolve</code>/related hooks before your code ever sees the object. Attackers chain such hooks in common libraries ("gadget chains", e.g. Apache Commons Collections in 2015) to execute arbitrary commands — remote code execution from a single request. Mitigations: never deserialize untrusted data; if you must, use <code>ObjectInputFilter</code> allow-lists with limits on depth, references and array sizes (JEP 290; per-context filter factories in Java 17, JEP 415; or the <code>jdk.serialFilter</code> property); validate invariants in readObject; prefer data formats like JSON or Protobuf with explicit schemas and mapping to records; keep vulnerable libraries patched.</p>`,
      followUps: ['What does an allow-list filter pattern look like?', 'Are JSON libraries immune? (polymorphic typing pitfalls)', 'How do records reduce the risk?'] },
    { q: 'How do exceptions behave across threads, executors and CompletableFuture?', level: 'E',
      a: `<p>Exceptions never cross thread boundaries by themselves. An exception escaping <code>Thread.run</code> goes to the thread's <code>UncaughtExceptionHandler</code> and kills only that thread. With <code>ExecutorService.submit</code>, the exception is captured in the <code>Future</code> and surfaces only when you call <code>get()</code>, wrapped in <code>ExecutionException</code> — if nobody calls get, the failure is silent (a classic bug); <code>execute()</code> instead routes it to the uncaught handler. <code>CompletableFuture</code> stores the exception; <code>join()</code> wraps it in <code>CompletionException</code>, <code>get()</code> in ExecutionException; handle it in the pipeline with <code>exceptionally</code>, <code>handle</code> or <code>whenComplete</code>, and unwrap with <code>getCause()</code>. With structured concurrency (preview in recent JDKs), subtask failures propagate to the parent scope, which makes this much safer.</p>`,
      followUps: ['How do you log failures of fire-and-forget tasks?', 'What does exceptionally return?', 'How do you cancel sibling tasks when one fails?'] }
  );

  /* ======================================================================
     MODULE
     ====================================================================== */
  registerModule({
    id: 'java06',
    title: 'Exceptions, Files & I/O',
    lang: 'java',
    intro: `<p>Real programs fail: files go missing, disks fill up, networks time out, users type "abc" where a number belongs. This module teaches you how Java <b>reports</b> failure (the <code>Throwable</code> family tree, checked vs unchecked), how it <b>travels</b> (stack unwinding through call frames, <code>try/catch/finally</code>), how to <b>clean up</b> safely (<code>try-with-resources</code> and suppressed exceptions), and how to <b>design</b> your own exceptions like a senior engineer (chaining, translation between layers, logging once, failing fast).</p>
<p>Then we move to the outside world: <b>java.io vs java.nio</b> (streams, readers, charsets, buffers, channels), practical recipes for <b>reading and writing files</b> of any size without leaks or corruption, and <b>serialization</b> — including why deserializing untrusted data is one of the most dangerous things a Java program can do.</p>
<p>Every topic starts with an everyday analogy, then a step-by-step visualizer (watch an exception climb the call stack, resources close in reverse order, bytes turn into characters, a ByteBuffer flip), worked examples, "predict the output" traps that interviewers love, an expert deep dive, and an AI-era section on what to delegate and what you must still own.</p>`,
    goals: [
      'Draw the exception hierarchy from memory and classify any exception as checked, unchecked or Error — and explain the handle-or-declare rule and the overriding rule',
      'Predict the exact output of any try/catch/finally program, including return-in-finally, exceptions thrown from catch, and System.exit cases',
      'Trace exception propagation through call frames and read a chained stack trace (top frame, "Caused by", "Suppressed")',
      'Use try-with-resources correctly — closing order, suppressed exceptions, custom AutoCloseable classes with idempotent close()',
      'Design custom exceptions and an error-handling strategy: translation at layer boundaries, chaining, logging once, fail-fast validation',
      'Choose between java.io and java.nio/NIO.2, always handle charsets explicitly, and explain buffers (position/limit/flip)',
      'Read and write files of any size safely: streaming, buffering, flush vs close, atomic writes, directory walking with error tolerance',
      'Explain Java serialization (Serializable, transient, serialVersionUID, constructor rules) and its security risks and modern alternatives'
    ],
    prereqs: `Java 3 (Classes, Objects, Constructors) and Java 4 (OOP Pillars — inheritance and overriding), Java 5 (Strings, wrapper classes). Helpful: Java 2 (methods and the call stack).`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
