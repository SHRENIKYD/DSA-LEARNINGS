(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared little helpers for the visualizers ---------------- */
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function esc(s) { return H.esc(s); }
  function intOf(input, lo, hi, hint) {
    var s = String(input === undefined || input === null ? '' : input).trim();
    if (!/^-?\d+$/.test(s)) throw new Error(hint);
    var n = Number(s);
    if (n < lo || n > hi) throw new Error(hint);
    return n;
  }
  function intsOf(input, minN, maxN, lo, hi, hint) {
    var s = String(input === undefined || input === null ? '' : input).trim();
    if (!s) throw new Error(hint);
    var a = s.split(/[\s,]+/).map(Number);
    if (a.length < minN || a.length > maxN || a.some(function (x) { return isNaN(x) || x !== Math.floor(x) || x < lo || x > hi; })) throw new Error(hint);
    return a;
  }
  function out(text) {
    return { type: 'text', label: 'Console output', html: text ? '<code>' + esc(text).replace(/\n/g, '<br>') + '</code>' : '<span class="c-m">(nothing printed yet)</span>' };
  }
  /* Turns a list of steps into visualizer frames for a fixed code listing.
     step = { l: line | [lines], cls, v: {vars}, hv: {name: cls}, vl: 'vars label', st: [call stack], out: 'console', extra: [parts], narr } */
  function codeFrames(code, steps, label) {
    return steps.map(function (s) {
      var hl = {};
      [].concat(s.l === undefined ? [] : s.l).forEach(function (n) { hl[n] = s.cls || 'cur'; });
      var parts = [{ type: 'code', label: label || 'Code (highlighted line = running now)', lang: 'java', code: code, hl: hl }];
      if (s.v) parts.push({ type: 'vars', label: s.vl || 'Variables', vals: s.v, hl: s.hv || {} });
      if (s.st) parts.push({ type: 'stack', label: 'Call stack (top = running now)', items: s.st.slice(), hl: one(s.st.length - 1, 'cur') });
      if (s.out !== undefined) parts.push(out(s.out));
      (s.extra || []).forEach(function (p) { parts.push(p); });
      return { narr: s.narr, parts: parts };
    });
  }

  /* ======================================================================
     TOPIC 1 — Making decisions: if / else, ternary, switch & switch expressions
     ====================================================================== */
  topics.push({
    title: 'Decisions: if/else, the Ternary Operator, switch & Switch Expressions',
    analogy: `<p>Think of a <b>railway junction</b>. A train (your program) runs along one track until it reaches a switch point. A signal checks a question — <i>"Is the bridge open?"</i> — and the points send the train left or right. <code>if / else</code> is a junction with <b>two</b> tracks. An <code>else if</code> ladder is a row of junctions one after another. A <code>switch</code> is a <b>big sorting yard</b>: the train's number plate is read once and it is sent straight to platform 1, 2, 3 … or the "everything else" siding. The old-style switch has a quirk: unless a <b>barrier</b> (<code>break</code>) is down, the train keeps rolling into the next platforms too. The modern arrow switch (<code>-&gt;</code>) puts a barrier after every platform automatically.</p>`,
    explain: `<p>Every useful program has to <b>choose</b>: give a discount or not, print "Fizz" or the number, retry or give up. Java gives you three tools for choosing.</p>
<h4>1. if / else if / else — the everyday tool</h4>
<p>The thing inside the brackets must be a <b>boolean</b> (true/false). Unlike C, Java will <b>not</b> treat <code>0</code> as false or <code>1</code> as true, so <code>if (count)</code> does not compile — you must write <code>if (count != 0)</code>.</p>
<pre><code>if (score &gt;= 90)      grade = 'A';   // checked first
else if (score &gt;= 75) grade = 'B';   // only checked if the first was false
else                  grade = 'F';   // catches everything left</code></pre>
<p>Java checks the conditions <b>top to bottom</b> and runs only the <b>first</b> branch that is true. So the <b>order matters</b>: put the most specific test first.</p>
${H.table(['score', 'score ≥ 90?', 'score ≥ 75?', 'grade'], [['95', H.c('g', 'true → stop'), '(never checked)', 'A'], ['80', H.c('r', 'false'), H.c('g', 'true → stop'), 'B'], ['40', H.c('r', 'false'), H.c('r', 'false'), 'F (else)']])}
<h4>2. Combining conditions: &amp;&amp;, ||, !</h4>
<p><code>&amp;&amp;</code> (AND) and <code>||</code> (OR) are <b>short-circuit</b>: Java stops as soon as it knows the answer. In <code>if (arr != null &amp;&amp; arr.length &gt; 0)</code>, if <code>arr</code> is null the right side is <b>never run</b>, so no crash. The single <code>&amp;</code> and <code>|</code> on booleans always evaluate <b>both</b> sides — rarely what you want.</p>
<h4>3. The ternary operator — a one-line if/else that gives back a value</h4>
<pre><code>String label = (age &gt;= 18) ? "adult" : "minor";</code></pre>
<p>Read it as: <i>"Is age ≥ 18? If yes use "adult", otherwise use "minor"."</i> Use it for short choices of a <b>value</b>. Do not nest three ternaries deep — nobody can read that.</p>
<h4>4. switch — pick one of many fixed values</h4>
<p>When you compare <b>one</b> variable against many <b>constant</b> values, a <code>switch</code> is cleaner than a long ladder. It works on <code>int</code>, <code>char</code>, <code>byte</code>, <code>short</code>, their wrappers, <code>String</code> and <code>enum</code> (and, since Java 21, any object with type patterns). It does <b>not</b> work on <code>long</code>, <code>float</code>, <code>double</code> or <code>boolean</code>.</p>
<p><b>Old style (colon <code>case X:</code>)</b> — Java jumps to the matching label and then <b>keeps running downward</b> through the next labels (called <b>fall-through</b>) until it meets <code>break</code> or the end. Forgetting <code>break</code> is one of the most common Java bugs.</p>
<p><b>New style (arrow <code>case X -&gt;</code>, Java 14+)</b> — only the matching branch runs, no fall-through, several labels can share a branch (<code>case 1, 7 -&gt;</code>), and the whole switch can <b>produce a value</b> — a <b>switch expression</b>:</p>
<pre><code>String kind = switch (day) {
    case 1, 7 -&gt; "weekend";
    case 2, 3, 4, 5, 6 -&gt; "weekday";
    default -&gt; throw new IllegalArgumentException("bad day " + day);
};</code></pre>
<p>A switch <b>expression</b> must be <b>exhaustive</b> — every possible input must be covered — so for <code>int</code> or <code>String</code> you need a <code>default</code>. If a branch needs several statements, wrap them in <code>{ }</code> and hand back the value with <code>yield</code>.</p>
${H.table(['Feature', 'if / else', 'old switch ( : )', 'new switch ( -&gt; )'], [
  ['Tests', 'any boolean condition, ranges', 'equality with constants', 'equality with constants (+ patterns in 21)'],
  ['Fall-through', 'no', H.c('r', 'yes, until break'), H.c('g', 'never')],
  ['Gives back a value', 'no (ternary does)', 'no', H.c('g', 'yes (switch expression)')],
  ['Must cover all cases', 'no', 'no', 'yes, when used as an expression']
])}`,
    clues: [
      '"Return X if …, otherwise Y" with two outcomes → <code>if/else</code> or a ternary',
      '"Map each code / day / command / operator to …" with a fixed list of constants → <code>switch</code> (prefer the arrow form)',
      '"Ranges" like "score 90–100 is A, 75–89 is B" → an <code>if / else if</code> ladder (switch cannot test ranges on ints)',
      '"What does this print?" + a <code>switch</code> with missing <code>break</code> → it is a <b>fall-through</b> question',
      '"Avoid NullPointerException" / "list may be empty" → short-circuit guard <code>x != null &amp;&amp; …</code>',
      '"Make the compiler tell you when a new enum constant is added" → exhaustive switch expression with no <code>default</code>'
    ],
    code: [`
// Grade with an if / else-if ladder and a day name with a switch expression
public class Decisions {
    static char grade(int score) {
        if (score < 0 || score > 100) {            // guard clause: reject bad input first
            throw new IllegalArgumentException("score must be 0..100");
        } else if (score >= 90) {
            return 'A';
        } else if (score >= 75) {                  // we already know score < 90 here
            return 'B';
        } else if (score >= 50) {
            return 'C';
        }
        return 'F';                                 // everything that is left
    }

    static String dayType(int day) {
        return switch (day) {                       // switch EXPRESSION: produces a value
            case 1, 7 -> "weekend";                 // several labels share one branch
            case 2, 3, 4, 5, 6 -> {
                String base = "week";               // a block needs yield to give back a value
                yield base + "day";
            }
            default -> throw new IllegalArgumentException("day must be 1..7");
        };
    }

    public static void main(String[] args) {
        System.out.println(grade(95) + " " + grade(80) + " " + grade(40)); // A B F
        System.out.println(dayType(1) + " " + dayType(3));                 // weekend weekday
        int stock = 0;
        String msg = stock > 0 ? "in stock" : "sold out";                  // ternary
        System.out.println(msg);                                           // sold out
    }
}`, `
// Old-style switch: fall-through is sometimes used ON PURPOSE to group labels
public class OldSwitch {
    static int daysInMonth(int month, boolean leap) {
        int days;
        switch (month) {
            case 2:
                days = leap ? 29 : 28;
                break;                       // without this we would fall into "case 4"
            case 4: case 6: case 9: case 11:
                days = 30;
                break;
            default:
                days = 31;                   // 1, 3, 5, 7, 8, 10, 12
        }
        return days;
    }
    public static void main(String[] args) {
        System.out.println(daysInMonth(2, true) + " " + daysInMonth(4, false) + " " + daysInMonth(12, false)); // 29 30 31
    }
}`],
    codeTitle: ['if/else ladder, ternary and a switch expression', 'Old-style switch with deliberate grouping'],
    viz: [{
      title: 'Walk an if / else-if ladder',
      input: '82',
      inputLabel: 'score (0..100)',
      gen: function (input) {
        var s = intOf(input, 0, 100, 'Enter one whole number from 0 to 100, e.g. 82');
        var code = 'int score = ' + s + ';\nchar grade;\nif (score >= 90) {\n    grade = \'A\';\n} else if (score >= 75) {\n    grade = \'B\';\n} else if (score >= 50) {\n    grade = \'C\';\n} else {\n    grade = \'F\';\n}\nSystem.out.println(grade);';
        var tests = [[3, 90, 'A', 4], [5, 75, 'B', 6], [7, 50, 'C', 8]];
        var steps = [{ l: 1, v: { score: s }, hv: { score: 'ok' }, out: '', narr: 'Store <b>' + s + '</b> in <code>score</code>. Nothing is decided yet.' },
          { l: 2, v: { score: s, grade: '(not set)' }, out: '', narr: '<code>grade</code> is declared but has no value yet. Java will refuse to print it until every path assigns it — that is the <b>definite assignment</b> rule.' }];
        var g = null;
        for (var i = 0; i < tests.length && g === null; i++) {
          var t = tests[i], ok = s >= t[1];
          steps.push({ l: t[0], cls: ok ? 'ok' : 'bad', v: { score: s, grade: '(not set)', test: s + ' >= ' + t[1] + ' → ' + ok }, hv: { test: ok ? 'ok' : 'bad' }, out: '',
            narr: 'Check <code>score &gt;= ' + t[1] + '</code>: ' + s + ' ≥ ' + t[1] + ' is <b>' + ok + '</b>. ' + (ok ? 'Take this branch and skip every branch below it.' : 'Skip this branch and try the next <code>else if</code>.') });
          if (ok) { g = t[2]; steps.push({ l: t[3], v: { score: s, grade: "'" + g + "'" }, hv: { grade: 'ok' }, out: '', narr: 'Assign <code>grade = \'' + g + '\'</code>. The remaining conditions are <b>never evaluated</b> — first true branch wins.' }); }
        }
        if (g === null) { g = 'F'; steps.push({ l: 10, v: { score: s, grade: "'F'" }, hv: { grade: 'ok' }, out: '', narr: 'All tests were false, so the final <code>else</code> catches it: <code>grade = \'F\'</code>.' }); }
        steps.push({ l: 12, cls: 'ok', v: { score: s, grade: "'" + g + "'" }, out: g, narr: 'Print the grade: <b>' + g + '</b>. Exactly one branch ran — that is the promise of an if/else ladder.' });
        return codeFrames(code, steps);
      }
    }, {
      title: 'Old switch (fall-through) vs new arrow switch',
      input: '1',
      inputLabel: 'n (try 1, 2, 3 or 9)',
      gen: function (input) {
        var n = intOf(input, -99, 99, 'Enter a whole number, e.g. 1, 2, 3 or 9');
        var code = 'switch (n) {\n    case 1:\n        System.out.print("one ");\n    case 2:\n        System.out.print("two ");\n        break;\n    case 3:\n        System.out.print("three ");\n    default:\n        System.out.print("other ");\n}';
        var seq = [{ line: 2, label: 1 }, { line: 3, print: 'one ' }, { line: 4, label: 2 }, { line: 5, print: 'two ' }, { line: 6, brk: true }, { line: 7, label: 3 }, { line: 8, print: 'three ' }, { line: 9, label: 'default' }, { line: 10, print: 'other ' }];
        var start = -1;
        seq.forEach(function (x, i) { if (x.label === n) start = i; });
        var viaDefault = start < 0;
        if (viaDefault) start = 7;
        var printed = '', steps = [];
        steps.push({ l: 1, v: { n: n }, out: '', narr: 'Evaluate <code>n</code> once: it is <b>' + n + '</b>. Java now <b>jumps</b> straight to the matching label (it does not test the labels one by one like an if-ladder — javac builds a jump table or a sorted lookup).' });
        steps.push({ l: seq[start].line, cls: 'ok', v: { n: n }, out: '', narr: viaDefault ? 'No <code>case ' + n + '</code> exists, so execution jumps to <code>default:</code>.' : 'Jump to <code>case ' + n + ':</code>. A label is just an <b>entry point</b>, not a wall.' });
        for (var i = start + 1; i < seq.length; i++) {
          var x = seq[i];
          if (x.print) { printed += x.print; steps.push({ l: x.line, v: { n: n }, out: printed, narr: 'Run the print: output is now <code>' + esc(printed.trim()) + '</code>.' }); }
          else if (x.label !== undefined) steps.push({ l: x.line, cls: 'bad', v: { n: n }, out: printed, narr: '<span class="c-r">Fall-through!</span> We reached the label <code>' + (x.label === 'default' ? 'default' : 'case ' + x.label) + ':</code> but labels do not stop anything — execution keeps going into the next lines.' });
          else if (x.brk) { steps.push({ l: x.line, cls: 'ok', v: { n: n }, out: printed, narr: '<code>break</code> — leave the switch now. Final output: <code>' + esc(printed.trim()) + '</code>.' }); break; }
          if (i === seq.length - 1) steps.push({ l: 11, v: { n: n }, out: printed, narr: 'Reached the closing brace — the switch ends. Final output: <code>' + esc(printed.trim()) + '</code>.' });
        }
        var frames = codeFrames(code, steps, 'Old-style switch (colon labels)');
        var code2 = 'String w = switch (n) {\n    case 1 -> "one";\n    case 2 -> "two";\n    case 3 -> "three";\n    default -> "other";\n};\nSystem.out.print(w);';
        var line = n === 1 ? 2 : n === 2 ? 3 : n === 3 ? 4 : 5;
        var word = ['one', 'two', 'three'][n - 1] || 'other';
        frames = frames.concat(codeFrames(code2, [
          { l: 1, v: { n: n }, out: '', narr: 'Now the <b>arrow</b> version (Java 14+). Same jump to the matching label…' },
          { l: line, cls: 'ok', v: { n: n, w: '"' + word + '"' }, hv: { w: 'ok' }, out: '', narr: '…but an arrow branch runs <b>only itself</b>. No fall-through is possible, and the switch <b>produces a value</b> that we store in <code>w</code>.' },
          { l: 7, cls: 'ok', v: { n: n, w: '"' + word + '"' }, out: word, narr: 'Output: <code>' + word + '</code>. Compare with the old style: <code>' + esc(printed.trim()) + '</code>. ' + (printed.trim() === word ? 'Same here because a break (or the end) came right after.' : '<span class="c-r">Different — that difference is the fall-through bug.</span>') }
        ], 'New arrow switch expression'));
        return frames;
      }
    }],
    examples: [
      { title: 'The dangling else — the else belongs to the NEAREST if', html: `<p>Indentation lies; the compiler does not read it. Below, the <code>else</code> pairs with <code>if (b)</code>, not with <code>if (a)</code>. With <code>a = false</code> nothing prints at all.</p>
${H.table(['a', 'b', 'printed'], [['true', 'true', 'X'], ['true', 'false', 'Y'], ['false', 'any', H.c('r', '(nothing!)')]])}
<p><b>Fix:</b> always use braces <code>{ }</code>, even for one-line bodies. Most style guides (Google Java Style) require them.</p>`, code: `
boolean a = false, b = true;
if (a)
    if (b) System.out.println("X");
else                                   // looks like it belongs to "if (a)" ... it does NOT
    System.out.println("Y");
System.out.println("done");            // prints only: done` },
      { title: 'Predict the output: ternary type promotion', html: `<p>Both "arms" of a ternary are converted to <b>one common type</b>. If one arm is <code>int</code> and the other is <code>double</code>, the result is a <code>double</code> — even when the int arm is chosen.</p>
${H.table(['Expression', 'Prints', 'Why'], [['<code>true ? 1 : 2.0</code>', H.c('r', '1.0'), 'common type is double'], ['<code>true ? c : 0</code> (c = \'a\')', 'a', '0 is a constant that fits in char → type char'], ['<code>true ? c : i</code> (int i)', H.c('r', '97'), 'i is a variable int → type int, so the char becomes its code']])}`, code: `
char c = 'a';
int i = 0;
System.out.println(true ? 1 : 2.0);   // 1.0
System.out.println(true ? c : 0);     // a
System.out.println(true ? c : i);     // 97` },
      { title: 'Exhaustive enum switch — the compiler as a safety net', html: `<p>When a switch <b>expression</b> covers every enum constant you can leave out <code>default</code>. If someone later adds <code>BLINKING</code> to the enum, this method <b>stops compiling</b> until they handle it — a bug caught before it ships. With a <code>default</code> branch the new constant would silently fall into it.</p>`, code: `
enum Light { RED, YELLOW, GREEN }

class Traffic {
    static int waitSeconds(Light l) {
        return switch (l) {        // no default needed: all 3 constants covered
            case RED -> 30;
            case YELLOW -> 5;
            case GREEN -> 0;
        };
    }
    public static void main(String[] args) {
        System.out.println(waitSeconds(Light.YELLOW)); // 5
    }
}` },
      { title: 'switch on a String and the null trap', html: `<p>A String switch compares with <code>equals</code> (case-sensitive). If the String is <code>null</code>, a classic switch throws <code>NullPointerException</code> before any label is checked. Java 21 lets you add an explicit <code>case null -&gt;</code>; on older versions guard with <code>if (cmd == null)</code> first.</p>`, code: `
static String handle(String cmd) {
    if (cmd == null) return "no command";          // guard first (works on every Java version)
    return switch (cmd.toLowerCase()) {            // normalise case before comparing
        case "start", "run" -> "starting";
        case "stop" -> "stopping";
        default -> "unknown: " + cmd;
    };
}` }
    ],
    deepDive: `<p><b>How switch runs fast.</b> javac compiles an int switch into one of two bytecodes: <code>tableswitch</code> when the case values are dense (e.g. 1..7 — a direct array lookup, O(1)) or <code>lookupswitch</code> when they are sparse (e.g. 1, 1000, 50000 — a sorted key list searched with binary search, O(log k)). An if-ladder, by contrast, tests conditions one by one. In practice the JIT compiler can turn either into jump tables or branch trees, so choose by <b>readability</b>, not speed.</p>
<p><b>String switch under the hood.</b> javac switches on <code>s.hashCode()</code> first, then confirms with <code>equals()</code> (two strings can share a hash, e.g. <code>"Aa"</code> and <code>"BB"</code>). That is why a null String throws NPE — calling <code>hashCode()</code> on null. Enum switches use the constant's <code>ordinal()</code> via a small lookup array generated by the compiler.</p>
<p><b>Case labels must be compile-time constants</b>: literals, <code>static final</code> constants, or local <code>final int K = 3;</code> initialised with a constant. Duplicate labels are a compile error. You cannot mix <code>:</code> and <code>-&gt;</code> in the same switch.</p>
<p><b>Definite assignment.</b> Java tracks whether every path assigns a variable before it is read. In <code>char grade; if (s &gt; 50) grade = 'P'; System.out.println(grade);</code> the compiler errors: "variable grade might not have been initialized". Switch expressions help because the compiler proves exhaustiveness.</p>
<p><b>Java 21 pattern switch</b> (covered fully in the Modern Java module): <code>case Integer i when i &gt; 10 -&gt; …</code>, <code>case null -&gt;</code>, and exhaustive switches over <b>sealed</b> types. Real code bases on Java 8/11 cannot use these, so know both worlds.</p>
<p><b>Production reality.</b> Guard clauses (<code>if (bad) return/throw;</code> at the top) beat deep nesting; many teams forbid nested ternaries; static analysers (SpotBugs, Error Prone, Sonar) flag missing <code>break</code> as "fall-through" unless commented <code>// fall through</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write if-ladders and switches instantly, and IDE quick-fixes convert an old colon switch to an arrow switch in one click. The typing is free now; the <b>judgement</b> is not.</p>
<p><b>Use AI as a partner:</b> ask <code>"Convert this if-ladder to a Java 17 switch expression and list any behaviour change"</code> or <code>"Give me 6 boundary inputs (89, 90, 74, 75, -1, 101) for this grading method"</code>. Ask it to explain <b>why</b> a snippet prints what it prints, then check by running it.</p>
<p><b>Where AI goes wrong:</b> it mixes Java versions (uses Java 21 <code>case null</code> or patterns in a Java 11 project), drops a <code>break</code> when editing old-style switches, adds a lazy <code>default</code> that hides a missing enum constant, and gets ternary type promotion wrong in "predict the output" questions.</p>
<p><b>What you must still own:</b> tracing control flow in your head (interviews are whiteboard/no-IDE), knowing the fall-through rule cold, and choosing the construct that makes the code obviously correct to the next reader.</p>`,
    problems: [{
      title: 'Mini Calculator with a Switch Expression',
      level: 'Easy', tags: ['switch expression', 'exceptions', 'control flow'], companies: ['TCS', 'Infosys', 'Amazon'],
      statement: `<p>Write <code>static int calc(int a, char op, int b)</code> that supports <code>+ - * / %</code>. Division and remainder by zero must throw <code>ArithmeticException("divide by zero")</code>. Any other operator must throw <code>IllegalArgumentException</code>. Use a <b>switch expression</b>.</p>`,
      constraints: `−10<sup>4</sup> ≤ a, b ≤ 10<sup>4</sup>; op is any char`,
      example: `<p><code>calc(7, '/', 2)</code> → ${H.c('g', '3')} (integer division drops the fraction). <code>calc(-7, '%', 2)</code> → ${H.c('g', '-1')} (remainder keeps the sign of the left number). <code>calc(5, '/', 0)</code> → ${H.c('r', 'ArithmeticException')}. <code>calc(1, '^', 2)</code> → ${H.c('r', 'IllegalArgumentException')}.</p>`,
      brute: { why: `<p>An if/else-if ladder works, but it repeats <code>op ==</code> five times, is easy to break when someone forgets an <code>else</code>, and the compiler cannot help check that you returned a value in every path. It is not slower in any way that matters — it is just harder to read and maintain.</p>`, code: `
static int calcLadder(int a, char op, int b) {
    if (op == '+') return a + b;
    else if (op == '-') return a - b;
    else if (op == '*') return a * b;
    else if (op == '/') { if (b == 0) throw new ArithmeticException("divide by zero"); return a / b; }
    else if (op == '%') { if (b == 0) throw new ArithmeticException("divide by zero"); return a % b; }
    else throw new IllegalArgumentException("unknown operator: " + op);
}` },
      mcq: { q: 'Which switch form guarantees that only the matching branch runs and lets the switch return a value?', options: ['Old colon form with break', 'Arrow form (case X -&gt; …) used as an expression', 'A nested ternary', 'An if-ladder'], answer: 1, explain: 'Arrow branches never fall through, and a switch expression yields a value; the compiler also insists every input is covered (here via default).' },
      hints: [`<p>Hint 1: the operator is a single <code>char</code> — a perfect switch subject. Each operator maps to exactly one computation.</p>`, `<p>Hint 2: use <code>return switch (op) { case '+' -&gt; a + b; … };</code>. For <code>/</code> and <code>%</code> you need two statements (a check, then the result) so use a block with <code>yield</code>.</p>`, `<p>Hint 3: edge cases — b == 0 for both / and %; an unknown op goes to <code>default -&gt; throw …</code> (a throw is allowed as an arrow branch). Recipe: switch on op → compute → yield/throw.</p>`],
      solution: {
        approach: `<p>One switch expression. Simple operators are one-line arrow branches. Division and remainder share a helper check. <code>default</code> throws, which also makes the switch exhaustive.</p>`,
        code: `
class Calculator {
    static int calc(int a, char op, int b) {
        return switch (op) {
            case '+' -> a + b;
            case '-' -> a - b;
            case '*' -> a * b;
            case '/', '%' -> {
                if (b == 0) throw new ArithmeticException("divide by zero");
                yield op == '/' ? a / b : a % b;     // yield hands back the block's value
            }
            default -> throw new IllegalArgumentException("unknown operator: " + op);
        };
    }
    public static void main(String[] args) {
        System.out.println(calc(7, '/', 2));   // 3
        System.out.println(calc(-7, '%', 2));  // -1
        System.out.println(calc(6, '*', 7));   // 42
    }
}`,
        alt: [{ lang: 'python', code: `def calc(a, op, b):\n    match op:\n        case '+': return a + b\n        case '-': return a - b\n        case '*': return a * b\n        case '/' | '%':\n            if b == 0:\n                raise ZeroDivisionError("divide by zero")\n            q = abs(a) // abs(b) * (1 if (a >= 0) == (b >= 0) else -1)  # truncate like Java\n            return q if op == '/' else a - q * b\n        case _: raise ValueError("unknown operator: " + op)\n\nprint(calc(7, '/', 2), calc(-7, '%', 2))`, run: true, title: 'Python (match + Java-style truncation)' }],
        dry: { head: ['call', 'branch taken', 'result'], rows: [['calc(7, \'/\', 2)', "case '/', '%' block, b ≠ 0", '7 / 2 = 3'], ['calc(-7, \'%\', 2)', "case '/', '%' block", '-7 % 2 = -1'], ['calc(5, \'/\', 0)', "case '/', '%' block, b == 0", H.c('r', 'throws ArithmeticException')], ['calc(1, \'^\', 2)', 'default', H.c('r', 'throws IllegalArgumentException')]] },
        complexity: `<p>O(1) time and O(1) space — one jump and one arithmetic operation.</p>`,
        followUps: ['Support <code>long</code> results and detect overflow with <code>Math.addExact</code>.', 'Read expressions like "12 * 3" from a line of input and evaluate them.', 'Make <code>op</code> an enum with a method per constant — what are the trade-offs?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Loops: for, while, do-while, enhanced for
     ====================================================================== */
  topics.push({
    title: 'Loops: for, while, do-while and the Enhanced for-each',
    analogy: `<p>Loops are the instructions you give a friend helping you in the kitchen. <b>for</b>: <i>"Crack exactly 6 eggs"</i> — you know the count up front. <b>while</b>: <i>"Keep stirring while the sauce is runny"</i> — you check first, and if the sauce is already thick you never stir at all. <b>do-while</b>: <i>"Taste the soup, and keep adding salt while it is bland"</i> — you always taste <b>at least once</b> before deciding. <b>for-each</b>: <i>"Wash every plate in the rack"</i> — you do not care about plate numbers, you just visit each plate once.</p>`,
    explain: `<p>A loop repeats a block of code. Choosing the right one makes the code obviously correct.</p>
<h4>1. The classic for loop — when you know how many times</h4>
<pre><code>for (int i = 0; i &lt; 5; i++) {   // init ; condition ; update
    System.out.print(i + " ");    // body → prints 0 1 2 3 4
}</code></pre>
<p>The three parts run in a fixed order. Learn this order — "predict the output" questions are built on it:</p>
${H.table(['Step', 'What runs', 'How often'], [['1', '<b>init</b> <code>int i = 0</code>', 'once, at the very start'], ['2', '<b>condition</b> <code>i &lt; 5</code> — false? leave the loop', 'before <b>every</b> round'], ['3', '<b>body</b>', 'each round the condition was true'], ['4', '<b>update</b> <code>i++</code>, then go back to step 2', 'after every body']])}
<p>The variable <code>i</code> declared in the init lives <b>only inside the loop</b>. Any part can be left empty: <code>for (;;)</code> is a forever loop. You can have two variables: <code>for (int lo = 0, hi = n - 1; lo &lt; hi; lo++, hi--)</code> — the classic two-pointer loop.</p>
<h4>2. while — when you stop on a condition, not a count</h4>
<pre><code>int n = 4096, digits = 0;
while (n &gt; 0) {     // checked BEFORE each round
    n /= 10;
    digits++;
}                   // digits = 4</code></pre>
<p>If the condition is false at the start, the body runs <b>zero</b> times. Make sure something in the body moves you towards stopping, or you get an <b>infinite loop</b>.</p>
<h4>3. do-while — run once, then check</h4>
<pre><code>int choice;
do {
    choice = readMenuChoice();   // must show the menu at least once
} while (choice != 0);           // note the semicolon!</code></pre>
<p>Use it when the body must happen at least once: menus, "retry until success", counting digits where 0 still has one digit.</p>
<h4>4. Enhanced for (for-each) — visit every element</h4>
<pre><code>int[] prices = {120, 80, 45};
int total = 0;
for (int p : prices) total += p;   // read as "for each p in prices"</code></pre>
<p>Cleaner and impossible to get an index wrong. But: no index available, you cannot go backwards or skip, and assigning to <code>p</code> does <b>not</b> change the array (<code>p</code> is a copy).</p>
${H.table(['Situation', 'Best loop'], [['Known count, need the index', '<code>for (int i = 0; i &lt; n; i++)</code>'], ['Read every element, no index needed', '<code>for (int x : arr)</code>'], ['Stop when a condition changes (digits, Collatz, binary search)', '<code>while (cond)</code>'], ['Body must run at least once (menu, retry, digit count of 0)', '<code>do { … } while (cond);</code>'], ['Two ends moving inward', '<code>for (int l = 0, r = n - 1; l &lt; r; l++, r--)</code>']])}
<h4>5. Off-by-one — the #1 loop bug</h4>
<p>Arrays go from index <code>0</code> to <code>length - 1</code>. The loop <code>for (int i = 0; i &lt;= arr.length; i++)</code> runs one round too many and throws <code>ArrayIndexOutOfBoundsException</code>. Ask yourself two questions for every loop: <b>what is the first value?</b> and <b>what is the last value that runs?</b></p>`,
    clues: [
      '"for each element / every character / all pairs" → for or for-each; "all pairs i &lt; j" → nested for with <code>j = i + 1</code>',
      '"until the number becomes 1 / 0 / stable" or "repeat while…" → <code>while</code>',
      '"at least once", "show the menu then ask again", "retry until success" → <code>do-while</code>',
      'N ≤ 10<sup>5</sup> with a nested loop over all pairs → 10<sup>10</sup> steps is too slow; one loop (O(N)) or O(N log N) is expected',
      '"What does this print?" with <code>i++</code> inside a condition → trace the order: compare old value, then increment',
      '"Modify each element" → indexed for; for-each only reads (the loop variable is a copy)'
    ],
    code: [`
// Four loops computing useful things. Every loop's first and last value is commented.
public class Loops {
    public static void main(String[] args) {
        // 1) for: sum of 1..n   (i goes 1, 2, ..., n)
        int n = 5, sum = 0;
        for (int i = 1; i <= n; i++) sum += i;
        System.out.println("sum = " + sum);                 // 15

        // 2) while: count digits (stops on a condition, not a count)
        int x = 90210, digits = 0;
        while (x > 0) { x /= 10; digits++; }
        System.out.println("digits = " + digits);           // 5

        // 3) do-while: digit count that is also correct for 0
        int y = 0, d2 = 0;
        do { y /= 10; d2++; } while (y != 0);
        System.out.println("digits of 0 = " + d2);          // 1  (the while version would say 0)

        // 4) for-each: max of an array (reads only)
        int[] temps = {31, 28, 35, 30};
        int max = Integer.MIN_VALUE;
        for (int t : temps) if (t > max) max = t;
        System.out.println("max = " + max);                 // 35

        // 5) two variables in one for: reverse an array in place
        int[] a = {1, 2, 3, 4, 5};
        for (int lo = 0, hi = a.length - 1; lo < hi; lo++, hi--) {
            int tmp = a[lo]; a[lo] = a[hi]; a[hi] = tmp;
        }
        System.out.println(java.util.Arrays.toString(a));  // [5, 4, 3, 2, 1]

        // 6) nested loops: a small multiplication table (rows 1..3, cols 1..4)
        for (int r = 1; r <= 3; r++) {
            StringBuilder line = new StringBuilder();
            for (int c = 1; c <= 4; c++) line.append(r * c).append('\\t');
            System.out.println(line);
        }
    }
}`],
    codeTitle: ['All four loop kinds in one program'],
    viz: [{
      title: 'Inside a for loop: init → check → body → update',
      input: '4',
      inputLabel: 'n (1..8)',
      gen: function (input) {
        var n = intOf(input, 1, 8, 'Enter a whole number from 1 to 8');
        var code = 'int n = ' + n + ';\nint sum = 0;\nfor (int i = 1; i <= n; i++) {\n    sum += i;\n}\nSystem.out.println(sum);';
        var steps = [{ l: 1, v: { n: n }, out: '', narr: 'Set <code>n = ' + n + '</code>.' }, { l: 2, v: { n: n, sum: 0 }, hv: { sum: 'ok' }, out: '', narr: 'Start the running total at 0. (Starting at 0 matters — an uninitialised local will not even compile.)' },
          { l: 3, v: { n: n, sum: 0, i: 1 }, hv: { i: 'ok' }, out: '', narr: '<b>Init</b> runs exactly once: <code>i = 1</code>. The variable <code>i</code> exists only inside this loop.' }];
        var sum = 0;
        for (var i = 1; i <= n + 1; i++) {
          var ok = i <= n;
          steps.push({ l: 3, cls: ok ? 'ok' : 'bad', v: { n: n, sum: sum, i: i, 'i <= n': ok }, hv: { 'i <= n': ok ? 'ok' : 'bad' }, out: '', narr: '<b>Check</b> the condition: ' + i + ' ≤ ' + n + ' is <b>' + ok + '</b>. ' + (ok ? 'Run the body.' : 'False → leave the loop. Note the check ran <b>' + (n + 1) + '</b> times but the body only ' + n + ' times.') });
          if (!ok) break;
          sum += i;
          steps.push({ l: 4, v: { n: n, sum: sum, i: i }, hv: { sum: 'ok' }, out: '', narr: '<b>Body</b>: <code>sum += ' + i + '</code> → sum is now <b>' + sum + '</b>.' });
          steps.push({ l: 3, v: { n: n, sum: sum, i: i + 1 }, hv: { i: 'cur' }, out: '', narr: '<b>Update</b> <code>i++</code> runs <i>after</i> the body: i becomes ' + (i + 1) + '. Then back to the check.' });
        }
        steps.push({ l: 6, cls: 'ok', v: { n: n, sum: sum }, out: String(sum), narr: 'Print <b>' + sum + '</b>. Shortcut check: n(n+1)/2 = ' + n + '·' + (n + 1) + '/2 = ' + (n * (n + 1) / 2) + ' ✓. <code>i</code> is gone — it went out of scope when the loop ended.' });
        return codeFrames(code, steps);
      }
    }, {
      title: 'while vs do-while: counting the digits of a number',
      input: '0',
      inputLabel: 'n (0..999999) — try 0, then 507',
      gen: function (input) {
        var n0 = intOf(input, 0, 999999, 'Enter a whole number from 0 to 999999');
        var codeW = 'int n = ' + n0 + ', digits = 0;\nwhile (n > 0) {\n    n /= 10;\n    digits++;\n}\nSystem.out.println(digits);';
        var n = n0, d = 0, steps = [{ l: 1, v: { n: n, digits: 0 }, out: '', narr: '<b>while</b> version. It checks the condition <b>before</b> each round.' }];
        while (true) {
          var ok = n > 0;
          steps.push({ l: 2, cls: ok ? 'ok' : 'bad', v: { n: n, digits: d, 'n > 0': ok }, hv: { 'n > 0': ok ? 'ok' : 'bad' }, out: '', narr: 'Check <code>n &gt; 0</code> with n = ' + n + ': <b>' + ok + '</b>.' + (ok ? '' : (d === 0 ? ' <span class="c-r">The body never ran!</span>' : ' Leave the loop.')) });
          if (!ok) break;
          n = Math.floor(n / 10); d++;
          steps.push({ l: [3, 4], v: { n: n, digits: d }, hv: { n: 'cur', digits: 'ok' }, out: '', narr: 'Chop the last digit (<code>n /= 10</code> → ' + n + ') and count it (digits = ' + d + ').' });
        }
        steps.push({ l: 6, cls: n0 === 0 ? 'bad' : 'ok', v: { n: n, digits: d }, out: String(d), narr: 'while prints <b>' + d + '</b>.' + (n0 === 0 ? ' <span class="c-r">Wrong — the number 0 has 1 digit.</span>' : '') });
        var codeD = 'int n = ' + n0 + ', digits = 0;\ndo {\n    n /= 10;\n    digits++;\n} while (n > 0);\nSystem.out.println(digits);';
        var m = n0, e = 0, steps2 = [{ l: 1, v: { n: m, digits: 0 }, out: '', narr: 'Now the <b>do-while</b> version: the body runs first, the check comes after.' }];
        while (true) {
          m = Math.floor(m / 10); e++;
          steps2.push({ l: [3, 4], v: { n: m, digits: e }, hv: { digits: 'ok' }, out: '', narr: 'Body runs (no check yet): n = ' + m + ', digits = ' + e + '.' });
          var ok2 = m > 0;
          steps2.push({ l: 5, cls: ok2 ? 'ok' : 'bad', v: { n: m, digits: e, 'n > 0': ok2 }, out: '', narr: 'Now check <code>n &gt; 0</code>: <b>' + ok2 + '</b>. ' + (ok2 ? 'Go again.' : 'Stop.') });
          if (!ok2) break;
        }
        steps2.push({ l: 6, cls: 'ok', v: { n: m, digits: e }, out: String(e), narr: 'do-while prints <b>' + e + '</b>' + (n0 === 0 ? ' — correct, because the body is guaranteed to run once.' : ', the same as while for non-zero numbers.') });
        return codeFrames(codeW, steps, 'while (check first)').concat(codeFrames(codeD, steps2, 'do-while (body first)'));
      }
    }],
    examples: [
      { title: 'Predict the output: i++ inside the condition', html: `<p><code>i++ &lt; 3</code> compares the <b>old</b> value, then increments. Trace it:</p>
${H.table(['check', 'old i', 'compare', 'i after', 'prints'], [['1', '0', '0 &lt; 3 ✓', '1', '1'], ['2', '1', '1 &lt; 3 ✓', '2', '2'], ['3', '2', '2 &lt; 3 ✓', '3', '3'], ['4', '3', '3 &lt; 3 ✗', H.c('r', '4'), '—']])}
<p>Output: <code>1 2 3 | i=4</code>. The increment happens even on the failing check, so <code>i</code> ends at 4, not 3.</p>`, code: `
int i = 0;
while (i++ < 3) System.out.print(i + " ");
System.out.println("| i=" + i);   // 1 2 3 | i=4` },
      { title: 'for-each gives you a COPY of each element', html: `<p>Doubling via the loop variable changes only the local copy. To modify the array, use the index.</p>
${H.arr([1, 2, 3], { label: 'after for-each', hl: { 0: 'r', 1: 'r', 2: 'r' } })}${H.arr([2, 4, 6], { label: 'after indexed for', hl: { 0: 'g', 1: 'g', 2: 'g' } })}`, code: `
int[] a = {1, 2, 3};
for (int x : a) x *= 2;                          // changes the copy only
System.out.println(java.util.Arrays.toString(a)); // [1, 2, 3]
for (int i = 0; i < a.length; i++) a[i] *= 2;   // changes the array
System.out.println(java.util.Arrays.toString(a)); // [2, 4, 6]` },
      { title: 'Two loops that never end (and how to fix them)', html: `<p><b>(1) Floating-point counter:</b> <code>for (double d = 0; d != 1.0; d += 0.1)</code> — 0.1 cannot be stored exactly in binary, so <code>d</code> becomes 0.9999999999999999 and then 1.0999999999999999; it skips 1.0 and loops forever. <b>Fix:</b> count with an int and compute <code>d = i / 10.0</code>, or use <code>&lt;</code> instead of <code>!=</code>.</p>
<p><b>(2) Byte counter:</b> <code>for (byte b = 0; b &lt; 128; b++)</code> — a byte's maximum is 127; <code>b++</code> on 127 wraps to −128, which is still &lt; 128. Forever. <b>Fix:</b> use an int counter.</p>`, code: `
// Safe versions of both loops
for (int i = 0; i <= 10; i++) {
    double d = i / 10.0;            // 0.0, 0.1, ..., 1.0 computed fresh each time (no drift)
    if (i == 10) System.out.println("reached " + d);
}
int count = 0;
for (int b = 0; b < 128; b++) count++;  // int counter: ends at 128
System.out.println(count);              // 128` },
      { title: 'Nested loops: all pairs i &lt; j', html: `<p>To look at every unordered pair once, start the inner loop at <code>i + 1</code>. For n = 4 there are 4·3/2 = 6 pairs: (0,1) (0,2) (0,3) (1,2) (1,3) (2,3). This is O(n²) — fine for n = 1000 (≈ 500 000 pairs), too slow for n = 10<sup>5</sup> (≈ 5·10<sup>9</sup>).</p>`, code: `
int[] a = {3, 8, 1, 5};
int pairs = 0;
for (int i = 0; i < a.length; i++)
    for (int j = i + 1; j < a.length; j++)
        if (a[i] + a[j] == 9) { System.out.println(a[i] + "+" + a[j]); pairs++; }  // 8+1
System.out.println(pairs + " pair(s)");` }
    ],
    deepDive: `<p><b>All loops become jumps.</b> In bytecode there is no "for" or "while" — javac emits a condition test and a <code>goto</code> back. A <code>for</code> loop and the equivalent <code>while</code> compile to essentially the same instructions; <code>for(;;)</code> and <code>while(true)</code> are identical. So pick by readability.</p>
<p><b>for-each desugaring.</b> Over an array, <code>for (int x : arr)</code> becomes an indexed loop over a <b>hidden copy of the array reference</b> (so reassigning <code>arr</code> inside the loop does not change what is iterated). Over a collection it becomes <code>Iterator it = list.iterator(); while (it.hasNext()) …</code> — which is why removing from a list inside for-each throws <code>ConcurrentModificationException</code> (Collections module).</p>
<p><b>What the JIT does with your loop.</b> HotSpot's C2 compiler recognises "counted loops" (int index, constant stride, simple bound) and applies <b>range-check elimination</b> (proves <code>i</code> stays inside the array so the bounds check disappears), <b>loop unrolling</b> (does 4–8 rounds per jump) and sometimes <b>auto-vectorisation</b> (SIMD: adds 8 ints in one instruction). Loops with a <code>long</code> index or a weird update step historically got fewer optimisations — another reason to use <code>int i</code>.</p>
<p><b>Re-evaluated conditions.</b> The condition runs every round: <code>for (int i = 0; i &lt; s.length(); i++)</code> calls <code>length()</code> each time. That is cheap (a field read, usually inlined), but <code>i &lt; list.size()</code> on a list being modified, or <code>i &lt; expensiveCount()</code>, can be a real bug or cost — store it in a local first.</p>
<p><b>Complexity awareness.</b> One loop to n: O(n). Nested loops to n: O(n²). A loop that halves (<code>n /= 2</code>) or chops digits (<code>n /= 10</code>): O(log n). Online judges do roughly 10<sup>8</sup> simple steps per second — estimate before you code.</p>
<p><b>Infinite loops in production</b> do not crash; they burn 100% of a CPU core and hang a request thread. A thread dump (<code>jstack</code>) shows the thread stuck in the same method — covered in the JVM module.</p>`,
    aiEra: `<p><b>What AI changes:</b> nobody hand-types loop boilerplate any more — AI completes <code>for (int i = 0; i &lt; n; i++)</code> before you finish the bracket. That makes it <b>easier to accept a wrong bound</b> without thinking.</p>
<p><b>Use AI as a partner:</b> ask <code>"What are the first and last values of i in this loop, and how many times does the body run?"</code>, <code>"Rewrite this index loop as a for-each or a stream if it is clearer — explain the trade-off"</code>, or <code>"Generate edge inputs: empty array, one element, n = 0, max int"</code>.</p>
<p><b>Where AI goes wrong:</b> <code>&lt;=</code> vs <code>&lt;</code> slips, loops that mutate a list while iterating it, using a stream where a simple loop with early exit is clearer and faster, and nested loops that turn an O(n) task into O(n²) silently.</p>
<p><b>What you must still own:</b> counting iterations and estimating complexity in your head, spotting infinite loops, and tracing <code>i++</code>-style output questions on a whiteboard where no tool will run the code for you.</p>`,
    problems: [{
      title: 'Longest Collatz Chain Below N',
      level: 'Medium', tags: ['while loop', 'nested loops', 'long overflow', 'caching'], companies: ['Amazon', 'Goldman Sachs'],
      statement: `<p>The Collatz rule: if n is even, n → n/2; if odd, n → 3n + 1. Repeat until n = 1. The <b>steps</b> of n is how many moves it takes to reach 1 (steps(1) = 0). Given <code>N</code>, return the start value <code>s</code> with 1 ≤ s ≤ N that has the most steps (smallest s on ties).</p>`,
      constraints: `1 ≤ N ≤ 10<sup>6</sup>. Intermediate values exceed 2<sup>31</sup> − 1 for some starts below 10<sup>6</sup>, so use <code>long</code>.`,
      example: `<p>N = 10. steps: 1→0, 2→1, 3→7, 4→2, 5→5, 6→8, 7→16, 8→3, ${H.c('g', '9→19')}, 10→6. Answer <b>9</b> (19 steps: 9→28→14→7→22→…→1).</p>`,
      brute: { why: `<p>Simulate every start from scratch: an outer <code>for</code> over s and an inner <code>while</code> until 1. Correct, but chains overlap heavily — once 9 reaches 7 we already know 7 needs 16 more steps, yet we walk them again. About 10<sup>8</sup> moves for N = 10<sup>6</sup>.</p>`, code: `
static int longestBrute(int N) {
    int best = 1, bestSteps = 0;
    for (int s = 1; s <= N; s++) {
        long n = s;                      // long: 3n+1 can overflow int
        int steps = 0;
        while (n != 1) {
            n = (n % 2 == 0) ? n / 2 : 3 * n + 1;
            steps++;
        }
        if (steps > bestSteps) { bestSteps = steps; best = s; }
    }
    return best;
}` },
      mcq: { q: 'Why must the inner variable be a <code>long</code>?', options: ['Because steps can exceed 2<sup>31</sup>', 'Because 3n + 1 can exceed 2<sup>31</sup> − 1 for some starts below 10<sup>6</sup>', 'Because division by 2 needs a long', 'It does not need to be'], answer: 1, explain: 'Starts below 10<sup>6</sup> reach peaks above 5·10<sup>10</sup>; an int would silently overflow and the loop could even run forever.' },
      hints: [`<p>Hint 1: the chain of 9 passes through 7, whose answer you computed earlier. Reuse finished answers instead of re-walking them.</p>`, `<p>Hint 2: keep an <code>int[] cache</code> of size N + 1 where <code>cache[v]</code> = steps of v (0 = unknown, except cache[1] = 0). Walk forward only until you hit a value <code>&lt; s</code> — it is already cached.</p>`, `<p>Hint 3: values can go above N, so only use the cache when <code>n &lt; s</code> (always filled). Recipe: for s in 2..N: n = s, k = 0; while n ≥ s: step, k++; cache[s] = k + cache[(int) n]; track max.</p>`],
      solution: {
        approach: `<p>Process starts in increasing order. Every smaller start is already solved, so for start <code>s</code> we only walk until the value drops below <code>s</code>, then add the cached answer. The while loop is short on average, giving roughly O(N) total work in practice.</p>`,
        code: `
class Collatz {
    static int longest(int N) {
        int[] cache = new int[N + 1];            // cache[v] = steps for v (cache[1] = 0)
        int best = 1, bestSteps = 0;
        for (int s = 2; s <= N; s++) {
            long n = s;
            int k = 0;
            while (n >= s) {                     // stop as soon as we reach an already-solved value
                n = (n % 2 == 0) ? n / 2 : 3 * n + 1;
                k++;
            }
            cache[s] = k + cache[(int) n];       // n < s, so it is solved and fits in int
            if (cache[s] > bestSteps) { bestSteps = cache[s]; best = s; }
        }
        return best;
    }
    public static void main(String[] args) {
        System.out.println(longest(10));        // 9
        System.out.println(longest(1_000_000)); // 837799
    }
}`,
        alt: [{ lang: 'python', code: `def longest(N):\n    cache = [0] * (N + 1)\n    best, best_steps = 1, 0\n    for s in range(2, N + 1):\n        n, k = s, 0\n        while n >= s:\n            n = n // 2 if n % 2 == 0 else 3 * n + 1\n            k += 1\n        cache[s] = k + cache[n]\n        if cache[s] > best_steps:\n            best, best_steps = s, cache[s]\n    return best\n\nprint(longest(10), longest(10000))`, run: true }],
        dry: { head: ['s', 'walk until value < s', 'k', 'cache[s]', 'best'], rows: [['2', '2→1', '1', '1 + 0 = 1', '2 (1)'], ['3', '3→10→5→16→8→4→2', '6', '6 + cache[2] = 7', '3 (7)'], ['6', '6→3', '1', '1 + 7 = 8', '6 (8)'], ['7', '7→22→11→34→17→52→26→13→40→20→10→5', '11', '11 + cache[5]=5 → 16', '7 (16)'], ['9', '9→28→14→7', '3', '3 + 16 = 19', H.c('g', '9 (19)')]] },
        complexity: `<p>Time: close to O(N) in practice (each start walks only until it drops below itself); Space: O(N) for the cache. The brute force is about 10× slower for N = 10<sup>6</sup>.</p>`,
        followUps: ['Also cache values above <code>s</code> that are ≤ N — does it help?', 'Return the whole chain for the best start.', 'What happens if you use <code>int n</code> instead of <code>long n</code>? Try N = 10<sup>6</sup>.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — break, continue and labels
     ====================================================================== */
  topics.push({
    title: 'Jumping Out Early: break, continue and Labelled Loops',
    analogy: `<p>You are searching a building for your lost keys, floor by floor, room by room. <b>continue</b> is <i>"this room is locked — skip it, go to the next room"</i>. <b>break</b> is <i>"found them — stop searching this floor"</i>. But a plain break only gets you out of the <b>current floor</b>; you would still climb to the next floor and keep searching! A <b>labelled break</b> is shouting <i>"FOUND THEM — everybody leave the building!"</i>: one jump out of all the nested searches at once.</p>`,
    explain: `<p>Loops normally run until their condition becomes false. Three keywords let you change that from inside the body.</p>
<h4>1. break — leave the loop right now</h4>
<pre><code>for (int i = 0; i &lt; arr.length; i++) {
    if (arr[i] == target) { pos = i; break; }   // found: no need to look further
}</code></pre>
<p><code>break</code> exits the <b>innermost</b> loop (or <code>switch</code>) that contains it. Code after the loop continues normally.</p>
<h4>2. continue — skip the rest of THIS round</h4>
<pre><code>for (int i = 1; i &lt;= 10; i++) {
    if (i % 3 == 0) continue;   // skip multiples of 3
    sum += i;
}</code></pre>
<p>In a <code>for</code> loop, <code>continue</code> jumps to the <b>update</b> (<code>i++</code>) and then the check. In a <code>while</code> loop it jumps straight to the <b>check</b> — so if your increment is at the bottom of the body, <code>continue</code> skips it and you get an infinite loop:</p>
<pre><code>int i = 0;
while (i &lt; 10) {
    if (i % 2 == 0) continue;   // BUG: i never increases when it is even → loops forever
    i++;
}</code></pre>
<h4>3. Labels — naming a loop so you can break or continue IT</h4>
<pre><code>search:                                  // a label: any name followed by a colon
for (int r = 0; r &lt; grid.length; r++) {
    for (int c = 0; c &lt; grid[r].length; c++) {
        if (grid[r][c] == target) {
            found = true;
            break search;                // leaves BOTH loops
        }
    }
}</code></pre>
<p><code>continue outer;</code> abandons the inner loop and starts the <b>next round of the outer loop</b> — handy for "skip this whole row as soon as you see a bad cell".</p>
${H.table(['Statement', 'Where execution goes next'], [['<code>break;</code>', 'first statement after the innermost loop/switch'], ['<code>continue;</code>', 'update + condition of the innermost loop'], ['<code>break label;</code>', 'first statement after the labelled statement'], ['<code>continue label;</code>', 'update + condition of the labelled loop'], ['<code>return;</code>', 'out of the whole method (often the cleanest exit)']])}
<h4>4. The switch-inside-a-loop trap</h4>
<p>Inside an old-style <code>switch</code>, <code>break</code> leaves the <b>switch</b>, not the loop. <code>continue</code> has no meaning for a switch, so it applies to the surrounding <b>loop</b>. If you want to leave the loop from inside a switch, use a label or <code>return</code>.</p>
<h4>5. Good taste</h4>
<p>Java has no <code>goto</code> (the word is reserved but unused) — labels are its tame replacement. Use them sparingly; often the clearest version is to move the nested loops into a small method and <code>return</code> the answer.</p>`,
    clues: [
      '"find the first …", "stop as soon as …", "does any element …" → <code>break</code> (or <code>return</code>) for early exit',
      '"ignore / skip invalid entries, comments, blank lines" → <code>continue</code>',
      '"search a 2D grid / matrix and stop at the first match" → labelled <code>break</code> or a helper method with <code>return</code>',
      '"skip the rest of this row / this group when …" → <code>continue outer;</code>',
      'Output question with <code>switch</code> inside a <code>for</code> → remember: break hits the switch, continue hits the loop',
      '"while loop hangs / times out" + <code>continue</code> before the increment → infinite-loop bug'
    ],
    code: [`
public class EarlyExit {
    // 1) labelled break: find a value in a grid
    static int[] find(int[][] grid, int target) {
        int[] pos = {-1, -1};
        search:
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[r].length; c++) {
                if (grid[r][c] == target) {
                    pos[0] = r; pos[1] = c;
                    break search;            // jump past BOTH loops
                }
            }
        }
        return pos;
    }

    // 2) the same thing without a label: a helper method + return is often cleaner
    static int[] findWithReturn(int[][] grid, int target) {
        for (int r = 0; r < grid.length; r++)
            for (int c = 0; c < grid[r].length; c++)
                if (grid[r][c] == target) return new int[]{r, c};
        return new int[]{-1, -1};
    }

    // 3) continue outer: count rows that contain NO negative number
    static int cleanRows(int[][] grid) {
        int clean = 0;
        rows:
        for (int[] row : grid) {
            for (int v : row) {
                if (v < 0) continue rows;        // bad row: abandon it, go to the next row
            }
            clean++;                             // only reached if no negative was found
        }
        return clean;
    }

    public static void main(String[] args) {
        int[][] g = {{4, 9, 2}, {5, -1, 8}, {6, 0, 7}};
        System.out.println(java.util.Arrays.toString(find(g, 8)));            // [1, 2]
        System.out.println(java.util.Arrays.toString(findWithReturn(g, 42))); // [-1, -1]
        System.out.println(cleanRows(g));                                     // 2
    }
}`],
    codeTitle: ['Labelled break, return, and continue outer'],
    viz: [{
      title: 'Labelled break: leave both loops at the first match',
      input: '8',
      inputLabel: 'target to find in the 3×4 grid (try 8, then 42)',
      gen: function (input) {
        var t = intOf(input, -999, 999, 'Enter a whole number to search for, e.g. 8');
        var G = [[4, 9, 2, 7], [5, 1, 8, 3], [6, 0, 11, 10]];
        var code = 'boolean found = false;\nsearch:\nfor (int r = 0; r < 3; r++) {\n    for (int c = 0; c < 4; c++) {\n        if (grid[r][c] == target) {\n            found = true;\n            break search;\n        }\n    }\n}\nSystem.out.println(found);';
        var frames = [], visited = {};
        function gridPart(cur, cls) {
          var hl = {};
          Object.keys(visited).forEach(function (k) { hl[k] = 'done'; });
          if (cur) hl[cur] = cls;
          return { type: 'grid', label: 'grid (target = ' + t + ')', rowHead: ['r=0', 'r=1', 'r=2'], colHead: ['c=0', 'c=1', 'c=2', 'c=3'], rows: G.map(function (r) { return r.slice(); }), hl: hl };
        }
        frames = frames.concat(codeFrames(code, [{ l: [1, 2], v: { found: false, target: t }, narr: 'The label <code>search:</code> names the <b>outer</b> loop. It does nothing by itself — it is just a name we can jump out of.', extra: [gridPart(null)] }]));
        var checks = 0, hit = false;
        for (var r = 0; r < 3 && !hit; r++) {
          for (var c = 0; c < 4; c++) {
            checks++;
            var eq = G[r][c] === t, key = r + ',' + c;
            frames = frames.concat(codeFrames(code, [{ l: 5, cls: eq ? 'ok' : 'cur', v: { r: r, c: c, 'grid[r][c]': G[r][c], found: false, checks: checks }, hv: eq ? { 'grid[r][c]': 'ok' } : {}, narr: 'Check grid[' + r + '][' + c + '] = ' + G[r][c] + (eq ? ' — <b>match!</b>' : ' ≠ ' + t + ', keep going.'), extra: [gridPart(key, eq ? 'ok' : 'cur')] }]));
            visited[key] = 1;
            if (eq) {
              hit = true;
              frames = frames.concat(codeFrames(code, [{ l: [6, 7], cls: 'ok', v: { r: r, c: c, found: true, checks: checks }, hv: { found: 'ok' }, narr: '<code>break search;</code> jumps past the <b>outer</b> loop too. A plain <code>break</code> would only end the inner loop, and r would move on to the next row — ' + (12 - checks) + ' useless checks.', extra: [gridPart(key, 'sel')] }]));
              break;
            }
          }
        }
        frames = frames.concat(codeFrames(code, [{ l: 11, cls: hit ? 'ok' : 'bad', v: { found: hit, checks: checks }, hv: { found: hit ? 'ok' : 'bad' }, out: String(hit), narr: hit ? 'Done after <b>' + checks + '</b> of 12 checks. Early exit saved the rest.' : 'Both loops finished normally: all 12 cells checked, no match → <b>false</b>.', extra: [gridPart(null)] }]));
        return frames;
      }
    }, {
      title: 'break vs continue in one loop',
      input: '10',
      inputLabel: 'n (1..15)',
      gen: function (input) {
        var n = intOf(input, 1, 15, 'Enter a whole number from 1 to 15');
        var code = 'int sum = 0;\nfor (int i = 1; i <= ' + n + '; i++) {\n    if (i % 3 == 0) continue;\n    if (i > 7) break;\n    sum += i;\n}\nSystem.out.println(sum);';
        var steps = [{ l: 1, v: { sum: 0 }, out: '', narr: 'Rules: skip multiples of 3 (<code>continue</code>), stop entirely once i passes 7 (<code>break</code>).' }], sum = 0, used = [];
        for (var i = 1; i <= n; i++) {
          if (i % 3 === 0) { steps.push({ l: 3, cls: 'bad', v: { i: i, sum: sum }, out: '', narr: 'i = ' + i + ' is a multiple of 3 → <code>continue</code>: skip the rest of this round, go to <code>i++</code>.', extra: [{ type: 'set', label: 'added so far', items: used.slice() }] }); continue; }
          if (i > 7) { steps.push({ l: 4, cls: 'sel', v: { i: i, sum: sum }, out: '', narr: 'i = ' + i + ' &gt; 7 → <code>break</code>: the loop is over, even though i ≤ ' + n + '.', extra: [{ type: 'set', label: 'added so far', items: used.slice() }] }); break; }
          sum += i; used.push(i);
          steps.push({ l: 5, cls: 'ok', v: { i: i, sum: sum }, hv: { sum: 'ok' }, out: '', narr: 'Add ' + i + ' → sum = ' + sum + '.', extra: [{ type: 'set', label: 'added so far', items: used.slice(), hl: one(String(i), 'ok') }] });
        }
        steps.push({ l: 7, cls: 'ok', v: { sum: sum }, out: String(sum), narr: 'Printed <b>' + sum + '</b> = ' + (used.join(' + ') || '0') + '.' });
        return codeFrames(code, steps);
      }
    }],
    examples: [
      { title: 'Predict the output: switch inside a loop', html: `<p>Here <code>continue</code> skips the rest of the <b>loop</b> round, but <code>break</code> only leaves the <b>switch</b>:</p>
${H.table(['k', 'switch does', 'prints'], [['0', 'default → print', 'k0 after0'], ['1', H.c('r', 'continue → skip "after"'), '(nothing)'], ['2', 'break → leave switch only', 'after2'], ['3', 'default → print', 'k3 after3']])}
<p>Output: <code>k0 after0 after2 k3 after3</code></p>`, code: `
for (int k = 0; k < 4; k++) {
    switch (k) {
        case 1: continue;                       // applies to the for loop
        case 2: break;                          // applies to the switch
        default: System.out.print("k" + k + " ");
    }
    System.out.print("after" + k + " ");
}` },
      { title: 'Predict the output: continue outer and break outer', html: `<p>Trace with i = 1..3, j = 1..3: at j = 2 we abandon the row; at i = 3 we stop everything.</p>
${H.table(['i', 'j', 'action', 'printed'], [['1', '1', 'print', '11'], ['1', '2', 'continue outer', ''], ['2', '1', 'print', '21'], ['2', '2', 'continue outer', ''], ['3', '1', H.c('r', 'break outer'), '']])}
<p>Output: <code>11 21 end</code></p>`, code: `
outer:
for (int i = 1; i <= 3; i++) {
    for (int j = 1; j <= 3; j++) {
        if (j == 2) continue outer;
        if (i == 3) break outer;
        System.out.print(i + "" + j + " ");
    }
}
System.out.println("end");` },
      { title: 'Skip comments and blank lines while parsing', html: `<p>A config parser must ignore lines that are blank or start with <code>#</code>. <code>continue</code> keeps the main logic un-indented ("guard clauses inside loops").</p>`, code: `
String[] lines = {"# settings", "", "port=8080", "  ", "host=localhost"};
int settings = 0;
for (String line : lines) {
    if (line.isBlank() || line.startsWith("#")) continue;   // skip noise
    String[] kv = line.split("=", 2);
    System.out.println(kv[0] + " -> " + kv[1]);
    settings++;
}
System.out.println(settings + " settings");   // 2 settings` },
      { title: 'Labels on a plain block (rare but legal)', html: `<p>A label can name <b>any</b> statement, including a block <code>{ }</code>; <code>break label;</code> then jumps to the end of that block. You will almost never write this, but it appears in tricky interview questions. <code>continue</code> only works with loop labels.</p>`, code: `
int x = 5;
check: {
    if (x > 3) break check;          // jump to the end of the block
    System.out.println("small");     // skipped
}
System.out.println("after block");   // after block` }
    ],
    deepDive: `<p><b>Bytecode view.</b> <code>break</code>, <code>continue</code> and labels compile to plain <code>goto</code> instructions to fixed offsets — no runtime cost at all. Java just restricts <i>where</i> you can jump (only out of enclosing statements), which keeps code structured and lets the verifier and JIT reason about it.</p>
<p><b>Interaction with finally.</b> If a <code>break</code> or <code>continue</code> leaves a <code>try</code> block that has a <code>finally</code>, the finally block runs first (Exceptions module). A <code>break</code> inside a <code>finally</code> can even swallow an exception — a well-known anti-pattern.</p>
<p><b>Labels and scope.</b> A label's scope is the statement it labels; two sibling loops may reuse the same label name, but nested loops may not. Labels live in their own namespace, so a label named <code>count</code> does not clash with a variable <code>count</code>.</p>
<p><b>Switch expressions are stricter.</b> Inside a switch <i>expression</i> you cannot <code>break</code> or <code>continue</code> out of it to an enclosing loop — you must <code>yield</code> a value or throw. This is deliberate: an expression must always produce a value.</p>
<p><b>Design alternatives.</b> Deeply nested loops with labels are a code smell. Alternatives: extract a method and <code>return</code>; use a boolean flag in the outer loop's condition (<code>for (int r = 0; r &lt; n &amp;&amp; !found; r++)</code>); or use streams with <code>anyMatch</code>/<code>findFirst</code>, which short-circuit internally. Pick the one that reads like the problem statement.</p>
<p><b>Performance.</b> Early exit changes the <b>best/average</b> case, not the worst case: finding a value in an n×m grid is still O(n·m) when the value is missing. In interviews say both: "worst case O(n·m), but we stop at the first match".</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tools tend to produce either flag variables or labelled loops depending on the training example they echo. Refactoring tools can "extract method" in one click, making the helper-method-plus-return style essentially free.</p>
<p><b>Use AI as a partner:</b> <code>"Refactor this labelled-loop search into a helper method that returns early"</code>, <code>"Trace this nested loop with continue outer for i, j in 1..3 as a table"</code>, <code>"Does this while loop terminate for every input? Prove it or give a counterexample."</code></p>
<p><b>Where AI goes wrong:</b> confusing <code>break</code> inside a switch with breaking the loop, placing <code>continue</code> before the increment in a while loop (infinite loop), and claiming early exit improves worst-case Big-O.</p>
<p><b>What you must still own:</b> exact semantics of where each jump lands (a favourite "predict the output" theme), the termination argument for every loop you write, and the taste to pick a return over a tangle of labels.</p>`,
    problems: [{
      title: 'First Negative in a Matrix',
      level: 'Easy', tags: ['labelled break', '2D array', 'early exit'], companies: ['Infosys', 'Wipro', 'Accenture'],
      statement: `<p>Given an <code>int[][] grid</code> (rows may have different lengths), return the position <code>{row, col}</code> of the <b>first</b> negative number in row-major order (row by row, left to right). Return <code>{-1, -1}</code> if there is none. Stop scanning as soon as you find it.</p>`,
      constraints: `0 ≤ rows ≤ 1000, 0 ≤ row length ≤ 1000, values fit in int`,
      example: `<p>grid = {{3, 7}, {4, ${H.c('r', '-2')}, -9}, {-1}} → ${H.c('g', '{1, 1}')}. Row 0 has no negative; in row 1 the first negative is at column 1. The −9 and −1 come later, so they are never even looked at.</p>`,
      brute: { why: `<p>Scan every cell and remember the first negative you see. Correct, but it keeps scanning the whole grid after the answer is known — wasted work when the negative is near the top-left of a 1000×1000 grid (up to a million extra checks).</p>`, code: `
static int[] firstNegativeBrute(int[][] grid) {
    int[] ans = {-1, -1};
    for (int r = 0; r < grid.length; r++)
        for (int c = 0; c < grid[r].length; c++)
            if (grid[r][c] < 0 && ans[0] == -1) { ans[0] = r; ans[1] = c; }   // keeps looping after the find
    return ans;
}` },
      mcq: { q: 'Inside the inner loop you find the negative. Which statement leaves BOTH loops?', options: ['<code>break;</code>', '<code>continue;</code>', '<code>break scan;</code> where <code>scan:</code> labels the outer loop', '<code>continue scan;</code>'], answer: 2, explain: 'A plain break only ends the inner loop; a labelled break ends the labelled (outer) loop. continue scan would move to the next row instead of stopping.' },
      hints: [`<p>Hint 1: row-major order is just "outer loop over rows, inner loop over columns". The first hit in that order is the answer.</p>`, `<p>Hint 2: when you find it, you must leave two loops. Options: a labelled <code>break</code>, or put the loops in a method and <code>return</code> directly.</p>`, `<p>Hint 3: use <code>grid[r].length</code> (not <code>grid[0].length</code>) for jagged rows, and handle an empty grid (outer loop runs zero times). Recipe: label outer → loop rows → loop cols → if negative, record + break label.</p>`],
      solution: {
        approach: `<p>Nested loops in row-major order; on the first negative, record the position and <code>break scan;</code> to exit both loops at once. (Equivalent: <code>return new int[]{r, c};</code> from inside the loops.)</p>`,
        code: `
class FirstNegative {
    static int[] firstNegative(int[][] grid) {
        int[] ans = {-1, -1};
        scan:
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[r].length; c++) {     // grid[r].length handles jagged rows
                if (grid[r][c] < 0) {
                    ans[0] = r;
                    ans[1] = c;
                    break scan;                            // stop everything
                }
            }
        }
        return ans;
    }
    public static void main(String[] args) {
        int[][] g = {{3, 7}, {4, -2, -9}, {-1}};
        System.out.println(java.util.Arrays.toString(firstNegative(g)));             // [1, 1]
        System.out.println(java.util.Arrays.toString(firstNegative(new int[0][])));  // [-1, -1]
    }
}`,
        alt: [{ lang: 'python', code: `def first_negative(grid):\n    for r, row in enumerate(grid):\n        for c, v in enumerate(row):\n            if v < 0:\n                return [r, c]     # Python has no labels: return is the idiom\n    return [-1, -1]\n\nprint(first_negative([[3, 7], [4, -2, -9], [-1]]))`, run: true }],
        dry: { head: ['r', 'c', 'grid[r][c]', 'negative?', 'action'], rows: [['0', '0', '3', 'no', 'next'], ['0', '1', '7', 'no', 'row ends'], ['1', '0', '4', 'no', 'next'], ['1', '1', '-2', H.c('g', 'yes'), 'ans = {1, 1}, <b>break scan</b>']] },
        complexity: `<p>Worst case O(R·C) (no negative, or it is the last cell); best case O(1). Extra space O(1).</p>`,
        followUps: ['If every row is sorted ascending, how can you find the first negative of each row faster?', 'Return all negatives positions but stop scanning a row at its first negative (<code>continue scan</code>).']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Methods, the call stack and pass-by-value
     ====================================================================== */
  topics.push({
    title: 'Methods, the Call Stack and Why Java Is Always Pass-by-Value',
    analogy: `<p>A method is a <b>vending machine</b>: you put things in (arguments), it does its job, and something drops out (the return value). Now, how do you hand things over? Java <b>always hands over a photocopy</b>. If you give it a number, it gets a photocopy of the number — scribbling on the copy never changes your original. If you give it an object, you are handing over a photocopy of your <b>house address</b>, not the house. The method can walk to the address and repaint your front door (the change is real!), but if it scribbles a different address on its photocopy, your own address card is untouched.</p>`,
    explain: `<h4>1. Anatomy of a method</h4>
<pre><code>public static int add(int a, int b) {   // modifiers, return type, name, parameters
    return a + b;                         // body; return hands a value back
}</code></pre>
${H.table(['Part', 'Meaning'], [['<code>public</code>', 'who may call it (access modifier — Classes module)'], ['<code>static</code>', 'belongs to the class, callable without an object (<code>Math.max</code>)'], ['<code>int</code>', 'type of the value given back; <code>void</code> = nothing given back'], ['<code>add</code>', 'name: a verb in camelCase (<code>computeTotal</code>, <code>isValid</code>)'], ['<code>(int a, int b)</code>', '<b>parameters</b>: local variables filled by the caller\'s <b>arguments</b>']])}
<p>A non-void method must <code>return</code> a value on <b>every</b> path, or it does not compile. A <code>void</code> method may use a bare <code>return;</code> to leave early.</p>
<h4>2. The call stack — where method calls live</h4>
<p>Each call gets a fresh <b>stack frame</b>: a little box holding its parameters and local variables. Calling pushes a frame on top; returning pops it and the caller continues where it left off. Local variables vanish with their frame. Infinite recursion keeps pushing frames until the JVM throws <code>StackOverflowError</code>.</p>
<h4>3. Pass-by-value, precisely</h4>
<p>Java copies the <b>value of each argument</b> into the parameter. What is that value?</p>
${H.table(['Argument type', 'What gets copied', 'Can the method change the caller\'s thing?'], [
  ['primitive (<code>int</code>, <code>double</code>, …)', 'the number itself', H.c('r', 'No') + ' — it only has a copy'],
  ['reference (array, object)', 'the <b>reference</b> (the "address")', H.c('g', 'It can change the object\'s contents') + ' — both copies point to the same object'],
  ['reassigning the parameter <code>arr = new int[3]</code>', 'only the method\'s copy changes', H.c('r', 'No') + ' — the caller still points to the old object']
])}
<p>So the famous <code>swap(int a, int b)</code> cannot swap the caller's variables, but <code>swap(int[] arr, int i, int j)</code> can swap two elements <b>inside</b> the array. And because <code>String</code> is immutable, <code>s += "!"</code> inside a method builds a new String for the local copy — the caller's String is unchanged.</p>
<h4>4. Returning more than one value</h4>
<p>Java returns exactly one value. To give back two (say min and max), return a small array <code>new int[]{min, max}</code>, an object, or (Java 16+) a <b>record</b>: <code>record MinMax(int min, int max) {}</code>.</p>
<h4>5. Recursion in one paragraph</h4>
<p>A method may call itself. It needs a <b>base case</b> that stops, and each call must move towards it. <code>fact(n) = n * fact(n - 1)</code> with <code>fact(0) = 1</code> pushes n + 1 frames, then pops them while multiplying. Deep recursion (≈ 10 000+ frames with default settings) risks <code>StackOverflowError</code>, so prefer loops for long chains.</p>`,
    clues: [
      '"Why doesn\'t my swap method work?" / "Is Java pass-by-reference?" → always pass-by-value; references are copied',
      '"What does this print after calling modify(arr)?" → contents changed through the copy are visible; reassignment is not',
      '"Return two values from a method" → array, small class, or record',
      '"StackOverflowError" in the stack trace → recursion without (or never reaching) a base case, or recursion too deep',
      '"Method should not change the input array" → defensive copy: <code>arr.clone()</code> / <code>Arrays.copyOf</code>',
      '"missing return statement" compile error → some path does not return a value'
    ],
    code: [`
import java.util.Arrays;

public class PassByValue {
    static void tryToChange(int x, int[] arr, String s) {
        x = 100;                    // changes the LOCAL copy only
        arr[0] = 99;                // follows the copied reference → changes the SHARED array
        s = s + "!";                // builds a new String; only the local copy points to it
        arr = new int[]{7, 7};      // local copy now points elsewhere; caller unaffected
        arr[1] = 55;                // modifies the NEW array nobody else can see
    }

    static void brokenSwap(int a, int b) { int t = a; a = b; b = t; }          // swaps copies
    static void swap(int[] a, int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; } // works

    static int[] minMax(int[] a) {                   // return two values in an array
        int min = a[0], max = a[0];
        for (int v : a) { if (v < min) min = v; if (v > max) max = v; }
        return new int[]{min, max};
    }

    static long fact(int n) {                        // recursion: base case + smaller call
        if (n <= 1) return 1;
        return n * fact(n - 1);
    }

    public static void main(String[] args) {
        int n = 5;
        int[] data = {1, 2, 3};
        String word = "hi";
        tryToChange(n, data, word);
        System.out.println(n + " " + Arrays.toString(data) + " " + word);  // 5 [99, 2, 3] hi

        int p = 1, q = 2;
        brokenSwap(p, q);
        System.out.println(p + " " + q);                                    // 1 2
        swap(data, 0, 2);
        System.out.println(Arrays.toString(data));                          // [3, 2, 99]

        System.out.println(Arrays.toString(minMax(new int[]{4, -2, 9})));   // [-2, 9]
        System.out.println(fact(5));                                        // 120
    }
}`],
    codeTitle: ['Primitives vs references vs reassignment, plus returning two values and recursion'],
    viz: [{
      title: 'Stack frames and the heap during tweak(n, data)',
      input: '1 2 3',
      inputLabel: 'initial array (1..6 integers)',
      gen: function (input) {
        var a = intsOf(input, 1, 6, -999, 999, 'Enter 1 to 6 integers separated by spaces, e.g. 1 2 3');
        var A = a.slice(), B = null;
        var code = 'static void tweak(int x, int[] arr) {\n    x = 100;\n    arr[0] = 99;\n    arr = new int[]{7, 7};\n    arr[1] = 55;\n}\npublic static void main(String[] args) {\n    int n = 5;\n    int[] data = {' + a.join(', ') + '};\n    tweak(n, data);\n    System.out.println(n + " " + Arrays.toString(data));\n}';
        function heap(hlk) {
          var e = [['@A (data\'s array)', '[' + A.join(', ') + ']']];
          if (B) e.push(['@B (new array)', '[' + B.join(', ') + ']']);
          return { type: 'map', label: 'Heap (objects live here)', entries: e, hl: hlk ? one(hlk, 'ok') : {} };
        }
        function f(line, cls, st, mainV, tw, hk, narr, o) {
          var parts = [{ type: 'code', label: 'Code', lang: 'java', code: code, hl: one(line, cls || 'cur') },
            { type: 'stack', label: 'Call stack', items: st, hl: one(st.length - 1, 'cur') },
            { type: 'vars', label: 'main\'s frame', vals: mainV.v, hl: mainV.h || {} }];
          if (tw) parts.push({ type: 'vars', label: 'tweak\'s frame (copies!)', vals: tw.v, hl: tw.h || {} });
          parts.push(heap(hk));
          if (o !== undefined) parts.push(out(o));
          return { narr: narr, parts: parts };
        }
        var fr = [];
        fr.push(f(8, 'cur', ['main'], { v: { n: 5 }, h: { n: 'ok' } }, null, null, '<code>main</code> starts with its own stack frame. <code>n = 5</code> is a primitive: the number lives <b>inside the frame</b>.'));
        fr.push(f(9, 'cur', ['main'], { v: { n: 5, data: '→ @A' }, h: { data: 'ok' } }, null, '@A (data\'s array)', 'The array object is created on the <b>heap</b> at some address (call it @A). The variable <code>data</code> holds only the <b>reference</b> → @A.'));
        fr.push(f(10, 'cur', ['main', 'tweak'], { v: { n: 5, data: '→ @A' } }, { v: { x: 5, arr: '→ @A' }, h: { x: 'ok', arr: 'ok' } }, null, 'Call <code>tweak(n, data)</code>: a new frame is pushed. Java <b>copies the values</b>: x gets a copy of 5, arr gets a copy of the reference — both <code>data</code> and <code>arr</code> now point to the <b>same</b> array @A.'));
        fr.push(f(2, 'cur', ['main', 'tweak'], { v: { n: 5, data: '→ @A' }, h: { n: 'ok' } }, { v: { x: 100, arr: '→ @A' }, h: { x: 'bad' } }, null, '<code>x = 100</code> changes tweak\'s copy only. main\'s <code>n</code> is still <b>5</b>.'));
        A[0] = 99;
        fr.push(f(3, 'ok', ['main', 'tweak'], { v: { n: 5, data: '→ @A' } }, { v: { x: 100, arr: '→ @A' } }, '@A (data\'s array)', '<code>arr[0] = 99</code> follows the reference to @A and changes the <b>shared</b> object. main will see this change!'));
        B = [7, 7];
        fr.push(f(4, 'bad', ['main', 'tweak'], { v: { n: 5, data: '→ @A' }, h: { data: 'ok' } }, { v: { x: 100, arr: '→ @B' }, h: { arr: 'bad' } }, '@B (new array)', '<code>arr = new int[]{7, 7}</code> creates @B and points tweak\'s <b>copy</b> at it. main\'s <code>data</code> still points to @A — reassigning a parameter never reaches the caller.'));
        B[1] = 55;
        fr.push(f(5, 'cur', ['main', 'tweak'], { v: { n: 5, data: '→ @A' } }, { v: { x: 100, arr: '→ @B' } }, '@B (new array)', '<code>arr[1] = 55</code> changes @B, which nobody else knows about.'));
        fr.push(f(6, 'done', ['main'], { v: { n: 5, data: '→ @A' } }, null, null, 'tweak returns: its frame is <b>popped</b>, x and arr vanish. @B has no references left, so the garbage collector may reclaim it.'));
        fr.push(f(11, 'ok', ['main'], { v: { n: 5, data: '→ @A' }, h: { n: 'ok', data: 'ok' } }, null, '@A (data\'s array)', 'Printed: n is unchanged (primitive copy) but the array shows 99 (changed through the copied reference).', '5 [' + A.join(', ') + ']'));
        return fr;
      }
    }, {
      title: 'Recursion: frames pushed and popped for fact(n)',
      input: '4',
      inputLabel: 'n (0..7)',
      gen: function (input) {
        var n = intOf(input, 0, 7, 'Enter a whole number from 0 to 7');
        var code = 'static long fact(int n) {\n    if (n <= 1) return 1;\n    return n * fact(n - 1);\n}';
        var stack = ['main: fact(' + n + ')'], steps = [{ l: 1, st: ['main'], v: { n: n }, narr: '<code>main</code> calls <code>fact(' + n + ')</code>. Every call gets its <b>own</b> frame with its <b>own</b> <code>n</code> — they do not overwrite each other.' }];
        for (var k = n; k >= 1; k--) {
          stack.push('fact(' + k + ')');
          if (k > 1) steps.push({ l: 3, st: stack.slice(), v: { n: k }, narr: 'fact(' + k + '): not the base case, so it must wait for <code>fact(' + (k - 1) + ')</code>. A new frame is pushed; this one is paused mid-multiplication.' });
          else steps.push({ l: 2, cls: 'ok', st: stack.slice(), v: { n: k }, narr: 'fact(' + k + ') hits the <b>base case</b> and returns 1. Now the stack unwinds.' });
        }
        if (n === 0) { stack.push('fact(0)'); steps.push({ l: 2, cls: 'ok', st: stack.slice(), v: { n: 0 }, narr: 'fact(0) is the base case (n ≤ 1) → returns 1 straight away.' }); }
        var val = 1;
        for (var j = 2; j <= n; j++) {
          stack.pop();
          val *= j;
          steps.push({ l: 3, cls: 'ok', st: stack.slice(), v: { n: j, 'returned value': val }, hv: { 'returned value': 'ok' }, narr: 'Frame for fact(' + (j - 1) + ') popped; fact(' + j + ') resumes and computes ' + j + ' × ' + (val / j) + ' = <b>' + val + '</b>.' });
        }
        stack = ['main'];
        if (n <= 1) steps.push({ l: 2, cls: 'ok', st: ['main', 'fact(' + n + ')'], v: { n: n }, narr: 'For n ≤ 1 there is nothing to unwind: the base case answers immediately. Try n = 5 to watch the stack grow and shrink.' });
        steps.push({ l: 1, cls: 'done', st: stack, v: { result: val }, hv: { result: 'sel' }, out: String(val), narr: 'All fact frames are gone. main receives <b>' + val + '</b>. Max stack depth was ' + (Math.max(n, 1) + 1) + ' frames — each recursive call costs one frame.' });
        return codeFrames(code, steps);
      }
    }],
    examples: [
      { title: 'The swap that does not swap', html: `<p><code>brokenSwap(p, q)</code> receives copies 1 and 2, swaps the <b>copies</b>, then the frame is destroyed. p and q never changed. This is the single most common "Is Java pass-by-reference?" interview probe.</p>
${H.table(['frame', 'a', 'b'], [['on entry', '1', '2'], ['after swap', H.c('g', '2'), H.c('g', '1')], ['main after return', 'p = ' + H.c('r', '1'), 'q = ' + H.c('r', '2')]])}`, code: `
static void brokenSwap(int a, int b) { int t = a; a = b; b = t; }
static void demo() {
    int p = 1, q = 2;
    brokenSwap(p, q);
    System.out.println(p + " " + q);   // 1 2
}` },
      { title: 'A String parameter cannot be changed', html: `<p>Strings are immutable objects. <code>s += "!"</code> creates a <b>new</b> String and points the local copy at it. The caller's variable still points to the original "hi". Contrast with a <code>StringBuilder</code>, whose <code>append</code> changes the shared object.</p>`, code: `
static void shout(String s, StringBuilder sb) {
    s += "!";          // new String object, local copy only
    sb.append("!");    // mutates the shared object
}
static void demo() {
    String s = "hi";
    StringBuilder sb = new StringBuilder("hi");
    shout(s, sb);
    System.out.println(s + " " + sb);   // hi hi!
}` },
      { title: 'Returning two values with a record (Java 16+)', html: `<p>A record is a tiny immutable data class with a constructor, getters, <code>equals</code>, <code>hashCode</code> and <code>toString</code> generated for you. It is the cleanest way to return several named values. (Records are covered fully in Modern Java.)</p>`, code: `
record MinMax(int min, int max) {}

class Stats {
    static MinMax of(int[] a) {
        int mn = a[0], mx = a[0];
        for (int v : a) { mn = Math.min(mn, v); mx = Math.max(mx, v); }
        return new MinMax(mn, mx);
    }
    public static void main(String[] args) {
        MinMax r = of(new int[]{4, -2, 9});
        System.out.println(r.min() + " " + r.max() + " " + r);   // -2 9 MinMax[min=-2, max=9]
    }
}` },
      { title: 'Defensive copy: protect the caller\'s array', html: `<p>Because a method <b>can</b> modify an array it receives, a method that should not change its input must work on a copy. <code>sortedCopy</code> leaves the caller's array intact.</p>`, code: `
static int[] sortedCopy(int[] a) {
    int[] copy = java.util.Arrays.copyOf(a, a.length);  // or a.clone()
    java.util.Arrays.sort(copy);
    return copy;
}
static void demo() {
    int[] marks = {70, 40, 90};
    int[] s = sortedCopy(marks);
    System.out.println(java.util.Arrays.toString(marks) + " " + java.util.Arrays.toString(s)); // [70, 40, 90] [40, 70, 90]
}` }
    ],
    deepDive: `<p><b>What a frame really is.</b> In the JVM each frame has a <b>local variable array</b> (slot 0 is <code>this</code> for instance methods, then the parameters, then locals; <code>long</code>/<code>double</code> take two slots) and an <b>operand stack</b> used by bytecode like <code>iload</code>, <code>iadd</code>, <code>ireturn</code>. The compiler computes the maximum size of both, so frames are fixed-size and cheap to push.</p>
<p><b>Thread stacks.</b> Each thread has its own stack (default ~512 KB–1 MB on 64-bit Linux, set with <code>-Xss</code>). Objects live on the shared <b>heap</b>; only primitives and references live in frames. That is why a local <code>int</code> cannot be seen by other threads, but an object passed between threads can.</p>
<p><b>Why "pass-by-reference" is the wrong word.</b> In C++ <code>void f(int&amp; x)</code> passes a <b>reference to the caller's variable</b>, so <code>x = 5</code> changes the caller. Java has no way to do that. Java passes <b>references by value</b> — the <i>value</i> of a reference variable is copied. The JLS (§8.4.1) says parameters are initialised with the argument values. The test: can a method make the caller's variable point to a different object? In Java, never.</p>
<p><b>The JIT erases most call cost.</b> Small, hot methods are <b>inlined</b> by C2 (the call disappears; the body is pasted into the caller), so splitting code into well-named small methods costs essentially nothing. <b>Escape analysis</b> can even avoid allocating the <code>int[]{min, max}</code> on the heap if it never escapes.</p>
<p><b>No tail-call optimisation.</b> Java does not reuse frames for tail calls, so even "tail recursive" code can overflow. Convert deep recursion to a loop or an explicit stack (DFS on a 10<sup>6</sup>-node path graph is the classic victim).</p>
<p><b>Parameter hygiene in production.</b> Some teams mark parameters <code>final</code> to forbid reassignment; static analysers flag "parameter reassigned". Validate inputs at public method boundaries (<code>Objects.requireNonNull(arr, "arr")</code>) and fail fast.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write helper methods instantly and suggest extracting methods; you will spend more time <b>reviewing</b> method boundaries than typing them.</p>
<p><b>Use AI as a partner:</b> <code>"Draw the stack frames and heap for this call as ASCII"</code>, <code>"Does this method mutate its input? List every side effect."</code>, <code>"Convert this recursive DFS to an iterative one with an explicit stack."</code></p>
<p><b>Where AI goes wrong:</b> it sometimes says "objects are passed by reference in Java" (sloppy and wrong for interviews), forgets defensive copies so a utility method silently mutates caller data, and writes elegant recursion that overflows on large inputs.</p>
<p><b>What you must still own:</b> the precise pass-by-value explanation with a picture, spotting side effects during code review, and judging when recursion depth is safe.</p>`,
    problems: [{
      title: 'Min and Max in One Pass, Returned from One Method',
      level: 'Easy', tags: ['methods', 'return multiple values', 'single pass'], companies: ['Amazon', 'Cognizant'],
      statement: `<p>Write <code>static int[] minMax(int[] a)</code> that returns <code>{min, max}</code> of a non-empty array using <b>one pass</b>, and do <b>not</b> modify the input. Then explain why <code>void minMax(int[] a, int min, int max)</code> ("fill in my two variables") cannot work in Java.</p>`,
      constraints: `1 ≤ a.length ≤ 10<sup>6</sup>; values fit in int`,
      example: `<p>a = [4, -2, 9, 0] → ${H.c('g', '{-2, 9}')}. The array stays [4, -2, 9, 0] after the call.</p>`,
      brute: { why: `<p>Sort a copy and read the two ends: correct and does not touch the input, but sorting is O(n log n) and allocates a full copy, when a single O(n) scan suffices. Another "brute" mistake is to sort the caller's array directly — a nasty side effect.</p>`, code: `
static int[] minMaxBySort(int[] a) {
    int[] c = java.util.Arrays.copyOf(a, a.length);   // copy so we do not mutate the caller
    java.util.Arrays.sort(c);                          // O(n log n)
    return new int[]{c[0], c[c.length - 1]};
}` },
      mcq: { q: '<code>static void fill(int min, int max) { min = 1; max = 9; }</code> is called as <code>fill(lo, hi)</code>. After the call…', options: ['lo = 1, hi = 9', 'lo and hi are unchanged', 'It does not compile', 'Only lo changes'], answer: 1, explain: 'Primitives are copied into the parameters; assigning to the copies never affects lo and hi.' },
      hints: [`<p>Hint 1: one loop can update both answers — compare each value against the current min <b>and</b> the current max.</p>`, `<p>Hint 2: Java returns one value, but an <code>int[]</code> of length 2 (or a record) <i>is</i> one value that carries two numbers.</p>`, `<p>Hint 3: start both min and max at <code>a[0]</code> (not 0 — the array might be all negative). Recipe: mn = mx = a[0]; for v in a: update; return {mn, mx}.</p>`],
      solution: {
        approach: `<p>Initialise both trackers with the first element, scan once, return them packed in a new array. The input is only read, never written, so no defensive copy is needed.</p>`,
        code: `
class MinMaxDemo {
    static int[] minMax(int[] a) {
        if (a == null || a.length == 0) throw new IllegalArgumentException("need at least one element");
        int mn = a[0], mx = a[0];               // NOT 0: the array could be all negative
        for (int i = 1; i < a.length; i++) {
            if (a[i] < mn) mn = a[i];
            else if (a[i] > mx) mx = a[i];      // a value can't be both new min and new max
        }
        return new int[]{mn, mx};
    }
    public static void main(String[] args) {
        int[] a = {4, -2, 9, 0};
        System.out.println(java.util.Arrays.toString(minMax(a)));  // [-2, 9]
        System.out.println(java.util.Arrays.toString(a));          // [4, -2, 9, 0] unchanged
    }
}`,
        alt: [{ lang: 'python', code: `def min_max(a):\n    mn = mx = a[0]\n    for v in a[1:]:\n        if v < mn: mn = v\n        elif v > mx: mx = v\n    return mn, mx          # Python returns a tuple\n\nprint(min_max([4, -2, 9, 0]))`, run: true }],
        dry: { head: ['i', 'a[i]', 'mn', 'mx'], rows: [['start', '4', '4', '4'], ['1', '-2', H.c('g', '-2'), '4'], ['2', '9', '-2', H.c('g', '9')], ['3', '0', '-2', '9']] },
        complexity: `<p>O(n) time, O(1) extra space (the 2-element result). About 1.5n comparisons in the worst case thanks to the <code>else if</code>; the pairwise trick reduces it to ⌈3n/2⌉ − 2.</p>`,
        followUps: ['Return a record <code>MinMax(int min, int max)</code> instead — why is it nicer for callers?', 'Implement the pairwise comparison trick (compare elements in pairs first).', 'Also return the indexes of min and max.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — Method overloading and varargs
     ====================================================================== */
  topics.push({
    title: 'Method Overloading and Varargs (int... args)',
    analogy: `<p>Think of a <b>coffee shop counter</b> with several baristas, each specialising in one kind of order: one handles "a coffee", one handles "a coffee + a muffin", one handles "a big group order of any size". You just shout <i>"order!"</i> and the manager (the <b>compiler</b>) looks at <b>what you are holding</b> and sends you to the best-matching barista. That is <b>overloading</b>: one name, several methods, chosen by the arguments. The "any size group order" barista is <b>varargs</b> — the fallback who accepts zero, one or a hundred items, and is only used when nobody more specific fits.</p>`,
    explain: `<h4>1. Overloading = same name, different parameter lists</h4>
<pre><code>static int    area(int side)                 { return side * side; }       // square
static int    area(int w, int h)             { return w * h; }             // rectangle
static double area(double radius)            { return Math.PI * radius * radius; } // circle</code></pre>
<p>Methods may share a name if their <b>parameter lists differ</b> in number, types or order of types. The <b>return type alone is not enough</b>: <code>int f()</code> and <code>long f()</code> cannot coexist — at a call <code>f();</code> the compiler could not tell which one you meant. Parameter <i>names</i> do not count either.</p>
<p>The <code>println</code> you use daily is overloaded about ten times (<code>println(int)</code>, <code>println(char)</code>, <code>println(String)</code>, <code>println(Object)</code>, …) — that is how <code>println('a')</code> prints <code>a</code> but <code>println('a' + 1)</code> prints <code>98</code>.</p>
<h4>2. How the compiler picks — three phases</h4>
<p>The choice is made at <b>compile time</b> from the <b>declared (static) types</b> of the arguments. The compiler tries three phases and stops at the first phase that finds a match:</p>
${H.table(['Phase', 'Allowed conversions', 'Example: f(5) with f(long) and f(Integer)'], [
  ['1. strict', 'exact match or <b>widening</b> (int→long→float→double, char→int, subclass→superclass)', H.c('g', 'f(long) chosen here')],
  ['2. loose', 'phase 1 + <b>boxing/unboxing</b> (int↔Integer)', 'f(Integer) would only be tried if phase 1 failed'],
  ['3. varargs', 'phase 2 + <b>variable arity</b> expansion (int... soaks up any number of ints)', 'last resort']])}
<p>Inside a phase, if several methods match, the <b>most specific</b> wins (the one whose parameter types could be passed to the others: <code>f(int)</code> beats <code>f(long)</code>, <code>f(String)</code> beats <code>f(Object)</code>). If no single most-specific method exists, you get a compile error: <i>"reference to f is ambiguous"</i>.</p>
<p>Memory hook: <b>Widening beats Boxing beats Varargs</b> — "<b>W</b>ise <b>B</b>aristas <b>V</b>ary".</p>
<h4>3. Varargs — "zero or more arguments"</h4>
<pre><code>static int sum(int... nums) {          // nums is an int[] inside the method
    int total = 0;
    for (int n : nums) total += n;
    return total;
}
sum();            // 0      (nums is an empty array, not null)
sum(4);           // 4
sum(1, 2, 3);     // 6
sum(new int[]{5, 5}); // 10 (you can pass an array directly)</code></pre>
<p>Rules: only <b>one</b> varargs parameter, and it must be <b>last</b> (<code>format(String fmt, Object... args)</code>). Each call quietly allocates an array. Calling with no arguments gives an <b>empty</b> array — so if your method needs at least one value, say so in the signature: <code>max(int first, int... rest)</code>.</p>
<h4>4. Overloading vs overriding (preview)</h4>
${H.table(['', 'Overloading', 'Overriding (OOP module)'], [['Where', 'same class (or inherited)', 'subclass redefines a superclass method'], ['Signature', 'different parameters', 'same parameters'], ['Decided', H.c('b', 'compile time') + ' (static types)', H.c('p', 'run time') + ' (actual object)']])}`,
    clues: [
      '"Which method is called?" with <code>int</code>, <code>long</code>, <code>Integer</code>, <code>Object</code>, <code>int...</code> overloads → apply Widening → Boxing → Varargs, then most specific',
      '"Pass null to an overloaded method" → most specific reference type, or an ambiguity compile error',
      '"Accept any number of arguments", "like printf / String.format / List.of" → varargs',
      '"Method must receive at least one value" → <code>(int first, int... rest)</code> signature',
      '"Can we overload by return type?" → no; parameters must differ',
      '"Compile-time vs run-time polymorphism" → overloading vs overriding'
    ],
    code: [`
public class Overloads {
    static String f(long x)    { return "long"; }
    static String f(Integer x) { return "Integer"; }
    static String f(Object x)  { return "Object"; }
    static String f(int... x)  { return "int..."; }

    // Varargs with a required first argument: max() with zero args will not compile
    static int max(int first, int... rest) {
        int best = first;
        for (int v : rest) if (v > best) best = v;
        return best;
    }

    public static void main(String[] args) {
        System.out.println(f(5));                  // long     (phase 1: int widens to long)
        System.out.println(f('a'));                // long     (char widens to long)
        System.out.println(f(5.0));                // Object   (phase 2: double boxes to Double → Object)
        System.out.println(f(Integer.valueOf(5))); // Integer  (phase 1: exact match, more specific than Object)
        System.out.println(f());                   // int...   (only varargs accepts zero arguments)
        System.out.println(f(1, 2));               // int...   (only varargs accepts two)

        System.out.println(max(3));                // 3
        System.out.println(max(3, 9, 4));          // 9

        System.out.println('a');                   // a   -> println(char)
        System.out.println('a' + 1);               // 98  -> char + int is int -> println(int)
        System.out.println((char) ('a' + 1));      // b   -> cast back -> println(char)
    }
}`],
    codeTitle: ['Overload resolution in action and a safe varargs signature'],
    viz: [{
      title: 'Overload resolution: which f(...) gets called?',
      input: '5',
      inputLabel: "argument(s): try 5 · 5L · 'a' · (short) 3 · 5.0 · 5.0f · Integer.valueOf(5) · null · (empty) · 1, 2",
      gen: function (input) {
        var raw = String(input === undefined || input === null ? '' : input).trim();
        var key = raw.replace(/\s+/g, '');
        var A = {
          '5': { t: 'int', p1: 'f(long)', p1set: ['f(long)'] },
          '5L': { t: 'long', p1: 'f(long)', p1set: ['f(long)'] },
          "'a'": { t: 'char', p1: 'f(long)', p1set: ['f(long)'] },
          '(short)3': { t: 'short', p1: 'f(long)', p1set: ['f(long)'] },
          '5.0': { t: 'double', p2: 'f(Object)', p2set: ['f(Object)'] },
          '5.0f': { t: 'float', p2: 'f(Object)', p2set: ['f(Object)'] },
          'Integer.valueOf(5)': { t: 'Integer', p1: 'f(Integer)', p1set: ['f(Integer)', 'f(Object)'] },
          'null': { t: 'null type', amb: true, p1set: ['f(Integer)', 'f(Object)', 'f(int...)'] },
          '': { t: '(no arguments)', p3: 'f(int...)' },
          '1,2': { t: 'int, int', p3: 'f(int...)' }
        };
        var a = A[key];
        if (!a) throw new Error("Pick one of: 5, 5L, 'a', (short) 3, 5.0, 5.0f, Integer.valueOf(5), null, 1, 2 — or leave empty");
        var cands = ['f(long)', 'f(Integer)', 'f(Object)', 'f(int...)'];
        var code = 'static String f(long x)    { return "long"; }\nstatic String f(Integer x) { return "Integer"; }\nstatic String f(Object x)  { return "Object"; }\nstatic String f(int... x)  { return "int..."; }\n\nf(' + raw + ');';
        function check1(c, t) {
          if (t === '(no arguments)' || t === 'int, int') return c === 'f(int...)' ? 'needs varargs expansion ✗ (phase 3)' : 'wrong number of args ✗';
          if (c === 'f(long)') {
            if (t === 'long') return 'exact match ✓';
            if (t === 'int' || t === 'char' || t === 'short') return 'widening ' + t + ' → long ✓';
            if (t === 'double' || t === 'float') return t + ' → long would be narrowing ✗';
            if (t === 'Integer') return 'needs unboxing ✗ (phase 2 only)';
            return 'null cannot become a primitive ✗';
          }
          if (c === 'f(Integer)') {
            if (t === 'Integer') return 'exact match ✓';
            if (t === 'null type') return 'null fits any reference type ✓';
            if (t === 'int') return 'needs boxing ✗ (phase 2 only)';
            return t + ' could only box to its own wrapper, never Integer ✗';
          }
          if (c === 'f(Object)') {
            if (t === 'Integer') return 'Integer is-an Object (widening reference) ✓';
            if (t === 'null type') return 'null fits any reference type ✓';
            return 'needs boxing first ✗ (phase 2 only)';
          }
          if (t === 'null type') return 'treated as f(int[] x): null fits int[] ✓';
          return 'treated as f(int[] x): ' + t + ' is not an int[] ✗';
        }
        function table(phase, chosen, set, note) {
          var rows = cands.map(function (c) {
            var ok = set && set.indexOf(c) >= 0;
            return [c, phase === 1 ? check1(c, a.t) : note(c), ok ? (chosen === c ? 'CHOSEN' : 'applicable') : '—'];
          });
          var hl = {};
          cands.forEach(function (c, i) { if (set && set.indexOf(c) >= 0) hl[i] = chosen === c ? 'sel' : 'ok'; });
          return { type: 'table', label: 'Phase ' + phase + ' candidates', columns: ['method', 'check', 'result'], rows: rows, hl: hl };
        }
        var fr = [];
        fr.push({ narr: 'The call is <code>f(' + esc(raw) + ')</code>. The compiler first works out the <b>static type</b> of the argument: <b>' + esc(a.t) + '</b>. It decides now, at compile time — nothing is decided at run time.', parts: [{ type: 'code', label: 'Four overloads + the call', lang: 'java', code: code, hl: one(6, 'cur') }, { type: 'vars', label: 'argument', vals: { expression: raw || '(none)', 'static type': a.t } }] });
        fr.push({ narr: '<b>Phase 1 (strict)</b>: only exact matches and widening — no boxing, no varargs expansion. A varargs method is still considered here, but only as if its parameter were a plain <code>int[]</code>.', parts: [table(1, a.p1, a.p1set || [], null)] });
        if (a.p1) {
          fr.push({ narr: (a.p1set.length > 1 ? 'Several methods are applicable in phase 1, so the compiler picks the <b>most specific</b>: <code>Integer</code> can be passed where <code>Object</code> is expected but not vice versa → ' : 'Exactly one method matches in phase 1 → ') + '<b>' + a.p1 + '</b>. Phases 2 and 3 are <b>never tried</b> — that is why widening beats boxing.', parts: [table(1, a.p1, a.p1set, null), { type: 'code', label: 'Result', lang: 'java', code: code, hl: one(cands.indexOf(a.p1) + 1, 'ok') }] });
          fr.push({ narr: 'Prints <code>' + a.p1.replace('f(', '').replace(')', '') + '</code>. Rule of thumb: <b>W</b>idening → <b>B</b>oxing → <b>V</b>arargs, and inside a phase the most specific wins.', parts: [out(a.p1.replace('f(', '').replace(')', ''))] });
        } else if (a.amb) {
          fr.push({ narr: 'Three methods match in phase 1. Most specific? <code>Integer</code> and <code>int[]</code> are both more specific than <code>Object</code>, but neither is a subtype of the other.', parts: [table(1, null, a.p1set, null)] });
          fr.push({ narr: '<span class="c-r">Compile error: "reference to f is ambiguous — both f(Integer) and f(int...) match".</span> Fix it by casting: <code>f((Integer) null)</code> or <code>f((Object) null)</code>.', parts: [{ type: 'code', label: 'Result', lang: 'java', code: code, hl: { 2: 'bad', 4: 'bad', 6: 'bad' } }, out('error: reference to f is ambiguous')] });
        } else if (a.p2) {
          fr.push({ narr: 'Phase 1 found nothing. <b>Phase 2 (loose)</b> also allows boxing: ' + a.t + ' boxes to ' + (a.t === 'double' ? 'Double' : 'Float') + ', which is an Object. It is not an Integer, so f(Integer) still fails.', parts: [table(2, a.p2, a.p2set, function (c) { return c === 'f(Object)' ? 'box to ' + (a.t === 'double' ? 'Double' : 'Float') + ' → Object ✓' : c === 'f(Integer)' ? (a.t === 'double' ? 'Double' : 'Float') + ' is not an Integer ✗' : c === 'f(long)' ? 'narrowing still not allowed ✗' : 'not an int[] ✗'; })] });
          fr.push({ narr: 'Chosen: <b>f(Object)</b>. Prints <code>Object</code>. Phase 3 (varargs) is not needed.', parts: [{ type: 'code', label: 'Result', lang: 'java', code: code, hl: one(3, 'ok') }, out('Object')] });
        } else {
          fr.push({ narr: 'Phase 1 and phase 2 find nothing: every fixed-arity method needs exactly one argument, and you passed ' + (key === '' ? 'zero' : 'two') + '.', parts: [table(2, null, [], function (c) { return c === 'f(int...)' ? 'needs varargs expansion ✗ (phase 3)' : 'wrong number of args ✗'; })] });
          fr.push({ narr: '<b>Phase 3 (varargs)</b>: <code>f(int... x)</code> packs the arguments into a new array: ' + (key === '' ? '<code>new int[0]</code>' : '<code>new int[]{1, 2}</code>') + '. Chosen!', parts: [table(3, 'f(int...)', ['f(int...)'], function (c) { return c === 'f(int...)' ? 'pack into int[] ✓' : '—'; }), { type: 'code', label: 'Result', lang: 'java', code: code, hl: one(4, 'ok') }] });
          fr.push({ narr: 'Prints <code>int...</code>. Varargs is the last resort — any fixed-arity match in phases 1–2 would have won.', parts: [out('int...')] });
        }
        return fr;
      }
    }],
    examples: [
      { title: 'null and String vs Object', html: `<p><code>p(null)</code> with <code>p(String)</code> and <code>p(Object)</code> calls <b>p(String)</b>: both accept null, String is more specific. Add a third overload <code>p(Integer)</code> and the same call no longer compiles — String and Integer are unrelated, so it is <b>ambiguous</b>.</p>`, code: `
static void p(String s) { System.out.println("String"); }
static void p(Object o) { System.out.println("Object"); }
static void demo() {
    p(null);            // String  (most specific)
    p((Object) null);   // Object  (cast changes the static type)
    Object o = "hi";
    p(o);               // Object! static type decides, not the runtime String
}` },
      { title: 'Widening beats boxing — even across types', html: `<p>With <code>m(int)</code> and <code>m(Long)</code>, calling <code>m(b)</code> for a <code>byte b</code> picks <b>m(int)</b> (byte widens to int). Java never does <b>widening then boxing</b> (byte → long → Long is not allowed), but boxing then widening reference is fine (int → Integer → Object).</p>
${H.table(['Argument', 'm(int)', 'm(Long)', 'chosen'], [['byte', 'widen ✓', 'byte→Long ✗', 'm(int)'], ['int', 'exact ✓', 'int→Long ✗ (would need int→long→Long)', 'm(int)'], ['long', '✗ narrowing', 'box ✓ (phase 2)', 'm(Long)']])}`, code: `
static void m(int x)  { System.out.println("m int"); }
static void m(Long x) { System.out.println("m Long"); }
static void demo() {
    byte b = 1;
    m(b);      // m int
    m(5L);     // m Long (phase 2: long boxes to Long)
}` },
      { title: 'Fixed arity always beats varargs', html: `<p><code>h(1, 2)</code> with <code>h(int, int)</code> and <code>h(int...)</code> calls the fixed version (phase 1). <code>h(1)</code> and <code>h()</code> can only use varargs. This is why <code>List.of</code> has overloads for 0–10 elements plus a varargs fallback: the common small calls avoid the hidden array allocation.</p>`, code: `
static void h(int a, int b) { System.out.println("h fixed"); }
static void h(int... a)     { System.out.println("h varargs, length " + a.length); }
static void demo() {
    h(1, 2);   // h fixed
    h(1);      // h varargs, length 1
    h();       // h varargs, length 0
}` },
      { title: 'Varargs gotcha: Arrays.asList with a primitive array', html: `<p><code>Arrays.asList(T... a)</code> is generic. A generic type cannot be a primitive, so passing an <code>int[]</code> makes <b>T = int[]</b> and you get a list with <b>one element</b> (the whole array). Use <code>Integer[]</code> or <code>Arrays.stream(arr).boxed().toList()</code>.</p>`, code: `
int[] prim = {1, 2, 3};
Integer[] boxed = {1, 2, 3};
System.out.println(java.util.Arrays.asList(prim).size());    // 1  (List<int[]>)
System.out.println(java.util.Arrays.asList(boxed).size());   // 3  (List<Integer>)
System.out.println(java.util.Arrays.stream(prim).boxed().toList()); // [1, 2, 3]` }
    ],
    deepDive: `<p><b>The real rules (JLS §15.12.2).</b> The compiler first collects <b>potentially applicable</b> methods (right name, right arity — a varargs method of arity n accepts ≥ n − 1 arguments). Phase 1 tests "strict invocation" (identity, widening primitive, widening reference). Phase 2 adds boxing/unboxing ("loose invocation"). Phase 3 allows variable-arity invocation. In phases 1–2 a varargs method participates only as if its last parameter were a plain array — which is why <code>f(null)</code> can match <code>f(int...)</code> and become ambiguous with <code>f(Integer)</code>.</p>
<p><b>Why this order?</b> Backward compatibility. Boxing and varargs arrived in Java 5. If they had been allowed in phase 1, existing Java 1.4 code like <code>list.remove(int)</code> vs <code>remove(Object)</code> could suddenly have changed meaning. The phases guarantee old calls resolve exactly as before.</p>
<p><b>The famous <code>List.remove</code> trap.</b> <code>List&lt;Integer&gt; list</code>: <code>list.remove(1)</code> calls <code>remove(int index)</code> (phase 1, exact) and removes the element at position 1, not the value 1. Use <code>list.remove(Integer.valueOf(1))</code> to remove by value.</p>
<p><b>Varargs internals.</b> <code>int... x</code> compiles to an <code>int[]</code> parameter with the <code>ACC_VARARGS</code> flag; each call site does <code>new int[]{…}</code>. In hot loops that allocation matters (the JIT's escape analysis often removes it, but not always). Generic varargs (<code>T...</code>) create a <code>T[]</code> that is really an <code>Object[]</code> after erasure — "possible heap pollution" warnings, silenced with <code>@SafeVarargs</code> only when the method does not store or expose the array (Generics module).</p>
<p><b>Overloading and inheritance.</b> A subclass can add overloads of an inherited method name. Because overload resolution uses static types, <code>Animal a = new Dog(); a.speak(x)</code> chooses among methods visible on <code>Animal</code>, then overriding picks the Dog body at runtime — a two-step dance interviewers love.</p>
<p><b>API design advice</b> (Effective Java, Item 52): avoid overloads with the same number of parameters whose types are related (boxing or subtypes) — callers get surprised. Prefer distinct names like <code>writeInt</code>/<code>writeLong</code>, or static factory names (<code>ofSeconds</code>, <code>ofMillis</code>).</p>`,
    aiEra: `<p><b>What AI changes:</b> IDEs and AI assistants show you which overload a call binds to (hover / "go to declaration"), so in real work you rarely compute it by hand. But interviews and code reviews of tricky APIs still test the rules.</p>
<p><b>Use AI as a partner:</b> <code>"For each call below, which overload is chosen and in which JLS phase?"</code> — then verify by compiling; ask <code>"Suggest clearer names instead of these overloads"</code>, or <code>"Find calls to List.remove that might remove by index by mistake."</code></p>
<p><b>Where AI goes wrong:</b> it often claims boxing happens before widening, forgets that a varargs method participates in phases 1–2 as an array (missing the null ambiguity), and generates overload sets that are ambiguous for <code>null</code> or lambdas.</p>
<p><b>What you must still own:</b> the W-B-V order plus "most specific" reasoning, recognising that overloading is static (compile-time), and designing APIs that do not need a language lawyer to call correctly.</p>`,
    problems: [{
      title: 'A Safe Varargs max()',
      level: 'Easy', tags: ['varargs', 'overloading', 'API design'], companies: ['Google', 'Microsoft'],
      statement: `<p>Design a static method that returns the maximum of <b>one or more</b> ints, callable as <code>max(7)</code>, <code>max(3, 9)</code>, <code>max(5, 1, 8, 2)</code> or with an existing array. Calling it with <b>no arguments must be a compile error</b>, not a runtime crash. Also explain which method <code>max(3, 9)</code> binds to if you additionally declare <code>max(int a, int b)</code>.</p>`,
      constraints: `Any number of int arguments ≥ 1; values fit in int`,
      example: `<p><code>max(5, 1, 8, 2)</code> → ${H.c('g', '8')}. <code>max(7)</code> → ${H.c('g', '7')}. <code>max()</code> → ${H.c('r', 'does not compile')}.</p>`,
      brute: { why: `<p>The obvious signature <code>max(int... nums)</code> accepts zero arguments, so <code>max()</code> compiles and you must decide at runtime what to do (throw? return MIN_VALUE?). The bug is found by a user in production instead of by the compiler.</p>`, code: `
static int maxAll(int... nums) {
    if (nums.length == 0) throw new IllegalArgumentException("need at least one number"); // runtime check
    int best = nums[0];
    for (int v : nums) if (v > best) best = v;
    return best;
}` },
      mcq: { q: 'You declare both <code>max(int a, int b)</code> and <code>max(int first, int... rest)</code>. Which runs for <code>max(3, 9)</code>?', options: ['max(int first, int... rest)', 'max(int a, int b)', 'Compile error: ambiguous', 'Whichever was declared first'], answer: 1, explain: 'Phase 1 (no varargs expansion) already finds max(int, int), so the varargs version is never considered.' },
      hints: [`<p>Hint 1: the compiler can enforce "at least one" if the first value is a separate, ordinary parameter.</p>`, `<p>Hint 2: signature <code>static int max(int first, int... rest)</code>. Inside, <code>rest</code> is an <code>int[]</code> (possibly empty, never null for normal calls).</p>`, `<p>Hint 3: start <code>best = first</code>, loop over rest. To accept an existing array <code>arr</code>, call <code>max(arr[0], Arrays.copyOfRange(arr, 1, arr.length))</code> or add an overload <code>max(int[] arr)</code>.</p>`],
      solution: {
        approach: `<p>Split the arguments into a mandatory first value and an optional varargs tail. The compiler rejects <code>max()</code> because no overload accepts zero arguments. Two-argument calls can be given a fast fixed-arity overload (no array allocation) which wins in phase 1.</p>`,
        code: `
class SafeMax {
    static int max(int a, int b) {               // fast path: no hidden array
        return a >= b ? a : b;
    }
    static int max(int first, int... rest) {     // one or more
        int best = first;
        for (int v : rest) if (v > best) best = v;
        return best;
    }
    public static void main(String[] args) {
        System.out.println(max(7));              // 7  -> varargs with rest = {}
        System.out.println(max(3, 9));           // 9  -> max(int, int), phase 1
        System.out.println(max(5, 1, 8, 2));     // 8  -> varargs with rest = {1, 8, 2}
        int[] arr = {4, 12, 6};
        System.out.println(max(arr[0], java.util.Arrays.copyOfRange(arr, 1, arr.length))); // 12
        // max();  // does not compile: no method accepts zero arguments
    }
}`,
        alt: [{ lang: 'python', code: `def max_of(first, *rest):\n    best = first\n    for v in rest:\n        if v > best:\n            best = v\n    return best\n\nprint(max_of(7), max_of(3, 9), max_of(5, 1, 8, 2))`, run: true }],
        dry: { head: ['call', 'phase', 'method', 'rest', 'result'], rows: [['max(7)', '3 (varargs)', 'max(int, int...)', '{}', '7'], ['max(3, 9)', '1 (strict)', 'max(int, int)', '—', '9'], ['max(5, 1, 8, 2)', '3 (varargs)', 'max(int, int...)', '{1, 8, 2}', '8']] },
        complexity: `<p>O(k) time for k arguments, plus one array allocation of size k − 1 per varargs call; the two-argument overload allocates nothing.</p>`,
        followUps: ['Write a generic <code>&lt;T extends Comparable&lt;T&gt;&gt; T max(T first, T... rest)</code> — what warning appears and why?', 'Why does <code>Math.max</code> only take two arguments?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — 1D and 2D arrays
     ====================================================================== */
  topics.push({
    title: '1D Arrays, 2D Arrays and Jagged Arrays',
    analogy: `<p>A 1D array is a <b>row of numbered post-office boxes</b>: fixed number of boxes, numbered from 0, each holding one item of the same kind. You get to a box instantly by its number. A 2D array is a <b>building of floors</b>: the building has a list of floors, and each floor is its own row of boxes. In Java the floors do not even need to be the same length — a <b>jagged</b> array is a building where floor 0 has 3 boxes, floor 1 has 1 box and floor 2 has 4. And the variable holding an array is not the boxes themselves, it is the <b>street address</b> of the building — copy the address and two people can now visit the same boxes.</p>`,
    explain: `<h4>1. Creating a 1D array</h4>
<pre><code>int[] marks = new int[5];            // 5 boxes, all 0
int[] primes = {2, 3, 5, 7};         // literal: size 4, filled
String[] names = new String[3];      // 3 boxes, all null
marks[0] = 90;                       // write
int first = primes[0];               // read → 2
int n = primes.length;               // 4  (a field, no brackets!)</code></pre>
<p>Facts to know cold:</p>
<ul><li>Size is <b>fixed</b> when created. Need to grow? Make a bigger array and copy (or use <code>ArrayList</code>).</li>
<li>Indexes run <b>0 … length − 1</b>. Anything else throws <code>ArrayIndexOutOfBoundsException</code> at runtime.</li>
<li>New arrays are filled with <b>default values</b>:</li></ul>
${H.table(['Element type', 'Default'], [['<code>int</code>, <code>long</code>, <code>short</code>, <code>byte</code>', '0'], ['<code>double</code>, <code>float</code>', '0.0'], ['<code>boolean</code>', 'false'], ['<code>char</code>', '\'\\u0000\' (character code 0)'], ['any object (<code>String</code>, <code>Integer</code>, arrays…)', 'null']])}
<h4>2. Arrays are objects — the variable holds a reference</h4>
<pre><code>int[] a = {1, 2, 3};
int[] b = a;          // b points to the SAME array (an alias)
b[0] = 42;            // a[0] is now 42 too
int[] c = a.clone();  // c is a NEW array with copied values
c[1] = -1;            // a is not affected</code></pre>
<p><code>a == b</code> compares <b>addresses</b>, not contents. To compare contents use <code>Arrays.equals(a, c)</code>. To print contents use <code>Arrays.toString(a)</code> — printing <code>a</code> directly gives something like <code>[I@1b6d3586</code> (type code + hash).</p>
<h4>3. 2D arrays = arrays of arrays</h4>
<pre><code>int[][] grid = new int[3][4];          // 3 rows, each an int[4]
grid[1][2] = 7;                        // row 1, column 2
int rows = grid.length;                // 3
int cols = grid[0].length;             // 4
int[][] m = {{1, 2, 3}, {4, 5, 6}};    // literal

for (int r = 0; r &lt; grid.length; r++)          // row-major traversal
    for (int c = 0; c &lt; grid[r].length; c++)
        System.out.print(grid[r][c] + " ");</code></pre>
<h4>4. Jagged arrays — rows of different lengths</h4>
<pre><code>int[][] tri = new int[3][];   // 3 rows, each row is null for now
tri[0] = new int[1];
tri[1] = new int[2];
tri[2] = new int[3];          // a triangle: perfect for Pascal's triangle</code></pre>
<p>That is why the safe inner bound is always <code>grid[r].length</code>, not <code>grid[0].length</code>.</p>
<h4>5. Everyday patterns</h4>
${H.table(['Task', 'Pattern'], [['Sum / max / count', 'one loop with an accumulator'], ['Reverse in place', 'two indexes moving inward, swap'], ['Shift / rotate', 'reverse tricks or a copy (see Arrays topic)'], ['Neighbours in a grid', 'direction arrays <code>int[] dr = {-1, 1, 0, 0}, dc = {0, 0, -1, 1};</code> + bounds check'], ['Matrix transpose', '<code>t[c][r] = m[r][c]</code>']])}`,
    clues: [
      '"Given an array of N integers…" with N ≤ 10<sup>6</sup> → a primitive <code>int[]</code> (fast, compact) rather than a <code>List&lt;Integer&gt;</code>',
      '"grid", "matrix", "board", "image", "m × n" → 2D array with <code>[row][col]</code> and direction arrays for neighbours',
      '"rows can have different lengths", "triangle" → jagged array, use <code>grid[r].length</code>',
      '"in place", "O(1) extra space" → modify the given array, do not allocate a copy',
      '"Why did changing b also change a?" → aliasing: both variables reference the same array',
      '"print the array" output looks like <code>[I@…</code> → you forgot <code>Arrays.toString</code>'
    ],
    code: [`
import java.util.Arrays;

public class ArraysBasics {
    public static void main(String[] args) {
        // ---- 1D ----
        int[] a = new int[4];                 // [0, 0, 0, 0]
        for (int i = 0; i < a.length; i++) a[i] = i * i;
        System.out.println(Arrays.toString(a));          // [0, 1, 4, 9]

        int[] alias = a;                      // same object
        int[] copy = a.clone();               // new object, same values
        alias[0] = 100;
        System.out.println(a[0] + " " + copy[0]);        // 100 0
        System.out.println((a == alias) + " " + (a == copy) + " " + Arrays.equals(alias, a)); // true false true

        // ---- 2D (rectangular) ----
        int[][] grid = new int[3][4];
        for (int r = 0; r < grid.length; r++)
            for (int c = 0; c < grid[r].length; c++)
                grid[r][c] = r * 10 + c;
        System.out.println(Arrays.deepToString(grid));   // [[0, 1, 2, 3], [10, 11, 12, 13], [20, 21, 22, 23]]

        // ---- neighbours with direction arrays ----
        int[] dr = {-1, 1, 0, 0}, dc = {0, 0, -1, 1};
        int r0 = 0, c0 = 0, sum = 0;
        for (int d = 0; d < 4; d++) {
            int nr = r0 + dr[d], nc = c0 + dc[d];
            if (nr < 0 || nr >= grid.length || nc < 0 || nc >= grid[nr].length) continue; // off the board
            sum += grid[nr][nc];
        }
        System.out.println("neighbour sum of (0,0) = " + sum);  // 10 + 1 = 11

        // ---- jagged ----
        int[][] tri = new int[4][];
        for (int r = 0; r < tri.length; r++) {
            tri[r] = new int[r + 1];
            Arrays.fill(tri[r], r + 1);
        }
        System.out.println(Arrays.deepToString(tri));    // [[1], [2, 2], [3, 3, 3], [4, 4, 4, 4]]
    }
}`],
    codeTitle: ['1D, 2D, neighbours and jagged arrays'],
    viz: [{
      title: 'Alias vs clone: who sees the change?',
      input: '1 2 3',
      inputLabel: 'array values (2..6 integers)',
      gen: function (input) {
        var v = intsOf(input, 2, 6, -999, 999, 'Enter 2 to 6 integers separated by spaces, e.g. 1 2 3');
        var A = v.slice(), C = null;
        var code = 'int[] a = {' + v.join(', ') + '};\nint[] b = a;\nint[] c = a.clone();\nb[0] = 42;\nc[1] = -1;\nSystem.out.println(a[0] + " " + a[1] + " " + c[0]);';
        function heap(hk, idx) {
          var parts = [{ type: 'array', label: '@A — the array that a and b point to', values: A.slice(), hl: hk === 'A' ? one(idx, 'ok') : {}, showIdx: true }];
          if (C) parts.push({ type: 'array', label: '@C — the clone', values: C.slice(), hl: hk === 'C' ? one(idx, 'ok') : {}, showIdx: true });
          return parts;
        }
        var steps = [];
        steps.push({ l: 1, v: { a: '→ @A' }, hv: { a: 'ok' }, extra: heap(null), narr: 'An array object is created on the heap (call it @A). The variable <code>a</code> only stores its <b>address</b>.' });
        steps.push({ l: 2, v: { a: '→ @A', b: '→ @A' }, hv: { b: 'bad' }, extra: heap(null), narr: '<code>b = a</code> copies the <b>address</b>, not the boxes. Now a and b are two names for the <b>same</b> array (an alias). No new array was made.' });
        C = A.slice();
        steps.push({ l: 3, v: { a: '→ @A', b: '→ @A', c: '→ @C' }, hv: { c: 'ok' }, extra: heap(null), narr: '<code>a.clone()</code> makes a <b>new</b> array @C with the same values. For an int[] this is a full independent copy.' });
        A[0] = 42;
        steps.push({ l: 4, v: { a: '→ @A', b: '→ @A', c: '→ @C' }, extra: heap('A', 0), narr: '<code>b[0] = 42</code> writes into @A — so <code>a[0]</code> is now 42 as well. The clone @C still has ' + v[0] + '.' });
        C[1] = -1;
        steps.push({ l: 5, v: { a: '→ @A', b: '→ @A', c: '→ @C' }, extra: heap('C', 1), narr: '<code>c[1] = -1</code> changes only the clone. @A is untouched.' });
        steps.push({ l: 6, cls: 'ok', v: { 'a[0]': A[0], 'a[1]': A[1], 'c[0]': C[0] }, out: A[0] + ' ' + A[1] + ' ' + C[0], extra: heap(null), narr: 'Result: a sees the change made through b (same object) but not the change made to c (different object). <code>a == b</code> is true, <code>a == c</code> is false, <code>Arrays.equals(a, c)</code> compares contents.' });
        return codeFrames(code, steps);
      }
    }, {
      title: 'Building a jagged 2D array row by row',
      input: '3 1 4',
      inputLabel: 'row lengths (1..5 numbers, each 1..6)',
      gen: function (input) {
        var L = intsOf(input, 1, 5, 1, 6, 'Enter 1 to 5 row lengths between 1 and 6, e.g. 3 1 4');
        var R = L.length, W = Math.max.apply(null, L);
        var code = 'int[][] g = new int[' + R + '][];\nfor (int r = 0; r < g.length; r++) {\n    g[r] = new int[len[r]];\n    for (int c = 0; c < g[r].length; c++)\n        g[r][c] = r * 10 + c;\n}';
        var rows = [], refs = [];
        for (var i = 0; i < R; i++) { rows.push(null); refs.push('null'); }
        function gridP(hk) {
          return { type: 'grid', label: 'the rows (· = no box exists)', rowHead: L.map(function (x, i) { return 'g[' + i + ']'; }), colHead: Array.apply(null, Array(W)).map(function (x, i) { return 'c=' + i; }),
            rows: rows.map(function (r) { var o = []; for (var j = 0; j < W; j++) o.push(r && j < r.length ? r[j] : '·'); return o; }), hl: hk || {} };
        }
        function refP(hi) { return { type: 'array', label: 'g itself: an array of ' + R + ' references', values: refs.slice(), hl: hi === undefined ? {} : one(hi, 'ok'), showIdx: true }; }
        var steps = [{ l: 1, v: { 'g.length': R }, narr: '<code>new int[' + R + '][]</code> creates only the <b>outer</b> array: ' + R + ' slots, each holding a reference that is still <b>null</b>. No rows exist yet — <code>g[0][0]</code> now would throw NullPointerException.', extra: [refP(), gridP()] }];
        for (var r = 0; r < R; r++) {
          rows[r] = []; for (var k = 0; k < L[r]; k++) rows[r].push(0);
          refs[r] = '→ int[' + L[r] + ']';
          steps.push({ l: 3, v: { r: r, 'len[r]': L[r] }, hv: { 'len[r]': 'ok' }, narr: 'Create row ' + r + ' with <b>' + L[r] + '</b> boxes (all 0) and store its reference in <code>g[' + r + ']</code>. Rows are separate objects, so their lengths can differ.', extra: [refP(r), gridP()] });
          for (var c = 0; c < L[r]; c++) {
            rows[r][c] = r * 10 + c;
            if (c === L[r] - 1 || L[r] <= 2) {
              var h = {}; for (var q = 0; q <= c; q++) h[r + ',' + q] = q === c ? 'cur' : 'ok';
              steps.push({ l: 5, v: { r: r, c: c, 'g[r].length': L[r], 'g[r][c]': r * 10 + c }, hv: { 'g[r][c]': 'ok' }, narr: 'Fill row ' + r + ' up to c = ' + c + '. The inner loop stops at <code>g[r].length</code> = ' + L[r] + ' — using <code>g[0].length</code> here would ' + (L[r] < L[0] ? '<span class="c-r">overflow this shorter row</span>' : (L[r] > L[0] ? '<span class="c-r">miss the extra cells of this longer row</span>' : 'happen to work only because the lengths match')) + '.', extra: [refP(r), gridP(h)] });
            }
          }
        }
        var tot = L.reduce(function (s, x) { return s + x; }, 0);
        steps.push({ l: 6, cls: 'ok', v: { rows: R, 'total boxes': tot }, hv: { 'total boxes': 'sel' }, narr: 'Done: ' + R + ' row objects + 1 outer array = ' + (R + 1) + ' separate objects holding ' + tot + ' ints. A rectangular <code>new int[' + R + '][' + W + ']</code> would hold ' + R * W + ' ints.', extra: [refP(), gridP()] });
        return codeFrames(code, steps);
      }
    }],
    examples: [
      { title: 'Printing an array: the [I@… surprise', html: `<p>Arrays do not override <code>toString()</code>, so printing one shows its type code (<code>[I</code> = array of int) and a hash. Use <code>Arrays.toString</code> for 1D and <code>Arrays.deepToString</code> for 2D.</p>
${H.table(['Code', 'Prints'], [['<code>System.out.println(a)</code>', H.c('r', '[I@6d06d69c') + ' (hash varies)'], ['<code>Arrays.toString(a)</code>', H.c('g', '[1, 2, 3]')], ['<code>Arrays.toString(grid)</code>', H.c('r', '[[I@…, [I@…]')], ['<code>Arrays.deepToString(grid)</code>', H.c('g', '[[1, 2], [3, 4]]')]])}`, code: `
int[] a = {1, 2, 3};
int[][] grid = {{1, 2}, {3, 4}};
System.out.println(java.util.Arrays.toString(a));         // [1, 2, 3]
System.out.println(java.util.Arrays.deepToString(grid));  // [[1, 2], [3, 4]]
char[] word = {'h', 'i'};
System.out.println(word);   // hi  <- special case: println(char[]) prints the characters` },
      { title: 'clone() of a 2D array is SHALLOW', html: `<p><code>grid.clone()</code> copies the <b>outer</b> array of references only. Both grids share the same row objects, so changing <code>copy[0][0]</code> also changes <code>grid[0][0]</code>. For a deep copy, clone each row.</p>
${H.table(['', 'outer array', 'row objects'], [['grid.clone()', 'new', H.c('r', 'shared')], ['row-by-row clone', 'new', H.c('g', 'new')]])}`, code: `
int[][] grid = {{1, 2}, {3, 4}};
int[][] shallow = grid.clone();
shallow[0][0] = 99;
System.out.println(grid[0][0]);                 // 99  (row shared!)

int[][] deep = new int[grid.length][];
for (int r = 0; r < grid.length; r++) deep[r] = grid[r].clone();
deep[1][1] = -5;
System.out.println(grid[1][1]);                 // 4   (independent)` },
      { title: 'Array covariance and ArrayStoreException', html: `<p>Java lets a <code>String[]</code> be used where an <code>Object[]</code> is expected (arrays are <b>covariant</b>). The array still remembers it is really a <code>String[]</code>, so storing an Integer fails <b>at runtime</b> with <code>ArrayStoreException</code>. Generic lists (<code>List&lt;String&gt;</code>) catch this at compile time instead — one reason collections are preferred in APIs.</p>`, code: `
Object[] objs = new String[2];      // compiles: String[] is-an Object[]
objs[0] = "fine";
try {
    objs[1] = 42;                   // runtime check fails
} catch (ArrayStoreException e) {
    System.out.println("ArrayStoreException: " + e.getMessage());  // java.lang.Integer
}` },
      { title: 'Default values and the null row', html: `<p><code>new boolean[3]</code> is all false, <code>new String[2]</code> is all null, and <code>new int[2][]</code> has two <b>null rows</b>. Reading <code>g[0].length</code> before creating the row throws <code>NullPointerException</code>.</p>`, code: `
boolean[] seen = new boolean[3];
String[] names = new String[2];
int[][] g = new int[2][];
System.out.println(seen[1] + " " + names[0] + " " + g[0]);   // false null null
g[0] = new int[]{5, 6};
System.out.println(g[0].length);                              // 2` }
    ],
    deepDive: `<p><b>Memory layout.</b> A HotSpot array object has a header (mark word + class pointer, 12 bytes with compressed class pointers) plus a 4-byte <code>length</code>, then the elements packed contiguously: an <code>int[1000]</code> is about 4 016 bytes. An <code>Integer[1000]</code> is 1000 <b>references</b> (4 bytes each with compressed oops) pointing to 1000 separate Integer objects of 16 bytes each — roughly 5× the memory and much worse cache behaviour. That is why competitive programmers and performance-sensitive code prefer primitive arrays.</p>
<p><b>2D arrays are not one block.</b> <code>new int[1000][1000]</code> is 1 outer array + 1000 separate row arrays. Rows are usually allocated near each other, but nothing guarantees it. Traversing <b>row by row</b> (<code>grid[r][c]</code> with c in the inner loop) walks memory sequentially and is cache-friendly; traversing column by column jumps between rows and can be several times slower for big grids. For maximum speed some code uses a flat <code>int[rows * cols]</code> with index <code>r * cols + c</code>.</p>
<p><b>Bounds checks.</b> Every <code>a[i]</code> is checked against <code>length</code> — this is Java's memory safety (no buffer overflows like C). The JIT removes the check when it can prove <code>0 ≤ i &lt; length</code> for a whole loop (range-check elimination), so the safety is nearly free in simple loops.</p>
<p><b>Limits.</b> Array length is an <code>int</code>, so the maximum is about 2<sup>31</sup> − 1 elements (in practice a few less, ~<code>Integer.MAX_VALUE − 8</code>, due to header space). A negative size throws <code>NegativeArraySizeException</code>. Allocation zeroes memory, so <code>new int[n]</code> is O(n), not O(1).</p>
<p><b>Declaration quirks.</b> <code>int[] a, b;</code> declares two arrays; <code>int a[], b;</code> declares an array and an int; <code>int[] a, b[];</code> declares an int[] and an int[][]. Always write the brackets next to the type.</p>
<p><b>Array vs ArrayList.</b> Arrays: fixed size, primitives allowed, fastest. <code>ArrayList</code>: grows automatically, objects only (boxing), richer API. Use arrays for known-size numeric work and grids; lists everywhere else (Collections module).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes grid traversals, direction arrays and matrix helpers flawlessly most of the time, and can generate test matrices in seconds.</p>
<p><b>Use AI as a partner:</b> <code>"Generate 5 tricky matrices for my rotate function: 1×1, 2×2, 3×3 with negatives, and a non-square one (should be rejected)"</code>, <code>"Is this copy deep or shallow? Draw the references."</code>, <code>"Rewrite this column-major loop to be cache-friendly."</code></p>
<p><b>Where AI goes wrong:</b> using <code>grid[0].length</code> on jagged input, treating <code>clone()</code> of a 2D array as a deep copy, confusing <code>[r][c]</code> with <code>[x][y]</code> (x is the column!), and off-by-one bounds checks in neighbour loops.</p>
<p><b>What you must still own:</b> the reference picture (alias vs copy, shallow vs deep), index arithmetic for rotations and transposes, and explaining memory/cost differences between <code>int[]</code> and <code>List&lt;Integer&gt;</code>.</p>`,
    problems: [{
      title: 'Rotate a Square Matrix 90° Clockwise In Place',
      level: 'Medium', tags: ['2D array', 'in place', 'transpose'], companies: ['Amazon', 'Microsoft', 'Apple'],
      statement: `<p>Given an n × n <code>int[][] m</code>, rotate it 90° clockwise <b>in place</b> (do not allocate another n × n matrix).</p>`,
      constraints: `1 ≤ n ≤ 1000; values fit in int`,
      example: `<p>${H.table(['before', 'after'], [['[1, 2, 3]<br>[4, 5, 6]<br>[7, 8, 9]', H.c('g', '[7, 4, 1]<br>[8, 5, 2]<br>[9, 6, 3]')]])} The first <b>column</b> read bottom-up (7, 4, 1) becomes the first <b>row</b>.</p>`,
      brute: { why: `<p>Build a new matrix with <code>rot[c][n - 1 - r] = m[r][c]</code> and copy it back. Easy to get right, but it uses O(n²) extra memory — 4 MB for n = 1000 — and breaks the "in place" requirement.</p>`, code: `
static void rotateWithCopy(int[][] m) {
    int n = m.length;
    int[][] rot = new int[n][n];
    for (int r = 0; r < n; r++)
        for (int c = 0; c < n; c++)
            rot[c][n - 1 - r] = m[r][c];      // where does (r, c) land after rotation?
    for (int r = 0; r < n; r++) m[r] = rot[r]; // reuse the new rows
}` },
      mcq: { q: 'Which two in-place steps rotate a square matrix 90° clockwise?', options: ['Reverse each row, then reverse the row order', 'Transpose, then reverse each row', 'Transpose, then reverse the row order', 'Reverse each column, then transpose twice'], answer: 1, explain: 'Transpose turns rows into columns; reversing each row then mirrors left↔right, which is exactly a clockwise quarter turn. (Transpose + reverse row order gives counter-clockwise.)' },
      hints: [`<p>Hint 1: a rotation is two mirror flips. Which flips? Try it on paper with the 3 × 3 example.</p>`, `<p>Hint 2: transpose = swap <code>m[r][c]</code> with <code>m[c][r]</code> for <b>c &gt; r only</b> (swapping every pair twice undoes it). Then reverse each row with two pointers.</p>`, `<p>Hint 3: edge cases: n = 1 (nothing changes). Recipe: for r in 0..n-1, for c in r+1..n-1 swap(m[r][c], m[c][r]); then for each row, lo = 0, hi = n-1, swap while lo &lt; hi.</p>`],
      solution: {
        approach: `<p>Clockwise rotation = <b>transpose</b> (mirror over the main diagonal) followed by <b>reversing each row</b> (mirror left↔right). Both steps swap elements in place using one temp variable.</p>`,
        code: `
class RotateMatrix {
    static void rotate(int[][] m) {
        int n = m.length;
        // 1) transpose: swap across the main diagonal (only the upper triangle, c > r)
        for (int r = 0; r < n; r++) {
            for (int c = r + 1; c < n; c++) {
                int t = m[r][c];
                m[r][c] = m[c][r];
                m[c][r] = t;
            }
        }
        // 2) reverse every row
        for (int[] row : m) {                       // for-each gives the row REFERENCE, so swaps stick
            for (int lo = 0, hi = n - 1; lo < hi; lo++, hi--) {
                int t = row[lo]; row[lo] = row[hi]; row[hi] = t;
            }
        }
    }
    public static void main(String[] args) {
        int[][] m = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
        rotate(m);
        System.out.println(java.util.Arrays.deepToString(m));  // [[7, 4, 1], [8, 5, 2], [9, 6, 3]]
    }
}`,
        alt: [{ lang: 'python', code: `def rotate(m):\n    n = len(m)\n    for r in range(n):\n        for c in range(r + 1, n):\n            m[r][c], m[c][r] = m[c][r], m[r][c]\n    for row in m:\n        row.reverse()\n\nm = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]\nrotate(m)\nprint(m)`, run: true }],
        dry: { head: ['step', 'row 0', 'row 1', 'row 2'], rows: [['start', '1 2 3', '4 5 6', '7 8 9'], ['after transpose', '1 4 7', '2 5 8', '3 6 9'], ['reverse row 0', H.c('g', '7 4 1'), '2 5 8', '3 6 9'], ['reverse rows 1, 2', '7 4 1', H.c('g', '8 5 2'), H.c('g', '9 6 3')]] },
        complexity: `<p>Time O(n²) — every cell is touched a constant number of times (optimal, since every cell moves). Extra space O(1).</p>`,
        followUps: ['Rotate counter-clockwise (transpose + reverse the column order / row order).', 'Do it in one pass by rotating 4 cells at a time, layer by layer.', 'Rotate a non-square m × n matrix (needs a new n × m array — why?).']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — The java.util.Arrays toolbox
     ====================================================================== */
  topics.push({
    title: 'The java.util.Arrays Toolbox (sort, binarySearch, fill, copyOf, equals, asList…)',
    analogy: `<p>Arrays are plain wooden shelves; <code>java.util.Arrays</code> is the <b>toolbox hanging next to them</b>. Instead of building your own sorter, label printer, photocopier or measuring tape every time, you grab the tested tool: <code>sort</code> (the sorter), <code>toString</code> (the label printer), <code>copyOf</code> (the photocopier), <code>equals</code> (compare two shelves box by box), <code>fill</code> (the paint roller), and <code>binarySearch</code> (the "guess the middle" game for a <b>sorted</b> shelf). The tools are static methods — you never create an <code>Arrays</code> object, you just call <code>Arrays.sort(shelf)</code>.</p>`,
    explain: `<p>Import once with <code>import java.util.Arrays;</code>. Everything is a <b>static</b> method with versions for every primitive type and for objects.</p>
${H.table(['Method', 'What it does', 'Example → result'], [
  ['<code>toString(a)</code>', 'readable text of a 1D array', '<code>[3, 1, 2]</code>'],
  ['<code>deepToString(g)</code>', 'readable text of nested arrays', '<code>[[1, 2], [3]]</code>'],
  ['<code>sort(a)</code>', 'ascending, in place', '[3, 1, 2] → [1, 2, 3]'],
  ['<code>sort(a, from, to)</code>', 'sort only indexes from..to−1', 'sort(a, 1, 3)'],
  ['<code>sort(objs, comparator)</code>', 'custom order — <b>objects only</b>', 'sort(words, Comparator.reverseOrder())'],
  ['<code>binarySearch(a, key)</code>', 'index of key in a <b>sorted</b> array; if absent: <code>−(insertionPoint) − 1</code>', 'binarySearch([1,3,5,7], 4) → −3'],
  ['<code>fill(a, v)</code>', 'set every element to v', 'fill(dp, -1)'],
  ['<code>copyOf(a, newLen)</code>', 'new array, truncated or padded with defaults', 'copyOf([1,2], 4) → [1, 2, 0, 0]'],
  ['<code>copyOfRange(a, from, to)</code>', 'new array of a[from..to−1]', 'copyOfRange([5,6,7,8], 1, 3) → [6, 7]'],
  ['<code>equals(a, b)</code> / <code>deepEquals</code>', 'same length and same elements?', 'true / false'],
  ['<code>hashCode(a)</code>', 'content-based hash (a.hashCode() is identity-based)', 'useful for map keys'],
  ['<code>asList(T...)</code>', 'fixed-size List view <b>backed by</b> the array', 'set() writes through, add() throws'],
  ['<code>stream(a)</code>', 'IntStream / Stream over the array', 'stream(a).sum()'],
  ['<code>setAll(a, i -&gt; …)</code>', 'fill using the index', 'setAll(a, i -&gt; i * i)'],
  ['<code>mismatch(a, b)</code> (Java 9+)', 'first differing index or −1', 'mismatch([1,2,3],[1,9,3]) → 1'],
  ['<code>System.arraycopy(src, sp, dst, dp, len)</code>', 'fast bulk copy into an existing array (not in Arrays, but a sibling tool)', 'shift elements']])}
<h4>Five rules that save you in interviews</h4>
<ol><li><b>binarySearch needs a sorted array.</b> On unsorted input the result is meaningless (no exception!). With duplicates it returns <i>some</i> matching index, not necessarily the first.</li>
<li><b>The negative result is useful:</b> if <code>i &lt; 0</code>, the key would be inserted at <code>-(i + 1)</code>. Example: binarySearch([1, 3, 5, 7], 4) = −3 → insertion point 2.</li>
<li><b>No comparator for primitives.</b> <code>Arrays.sort(intArray, Collections.reverseOrder())</code> does not compile. To sort an int[] descending: sort ascending then reverse, or use <code>Integer[]</code>.</li>
<li><b>copyOf / copyOfRange / clone are shallow</b> for object and 2D arrays (they copy references).</li>
<li><b>asList is a view, not a copy:</b> it cannot grow, and changes flow both ways. Wrap it — <code>new ArrayList&lt;&gt;(Arrays.asList(arr))</code> — when you need a normal list.</li></ol>`,
    clues: [
      '"sorted array" + "find / insert position / count less than x" → <code>Arrays.binarySearch</code> or your own lower-bound search',
      '"anagram", "same elements in any order", "permutation" → sort copies + <code>Arrays.equals</code> (or counting)',
      '"initialise the DP table with -1 / infinity" → <code>Arrays.fill</code> (row by row for 2D)',
      '"sort by second column / by length / descending" → objects or <code>int[][]</code> with <code>Arrays.sort(arr, comparator)</code>',
      '"subarray copy", "grow the array" → <code>Arrays.copyOfRange</code> / <code>Arrays.copyOf</code>',
      '"Why does add() throw UnsupportedOperationException?" → the list came from <code>Arrays.asList</code> (or <code>List.of</code>)'
    ],
    code: [`
import java.util.*;

public class ArraysToolbox {
    public static void main(String[] args) {
        int[] a = {5, 3, 9, 1, 7};
        Arrays.sort(a);                                        // [1, 3, 5, 7, 9]
        System.out.println(Arrays.toString(a));

        System.out.println(Arrays.binarySearch(a, 7));         // 3
        int pos = Arrays.binarySearch(a, 4);                   // -3
        System.out.println(pos + " -> insert at " + (-pos - 1)); // -3 -> insert at 2

        int[] bigger = Arrays.copyOf(a, 7);                    // [1, 3, 5, 7, 9, 0, 0]
        int[] middle = Arrays.copyOfRange(a, 1, 4);            // [3, 5, 7]
        System.out.println(Arrays.toString(bigger) + " " + Arrays.toString(middle));

        int[] dp = new int[5];
        Arrays.fill(dp, -1);                                   // [-1, -1, -1, -1, -1]
        int[] sq = new int[5];
        Arrays.setAll(sq, i -> i * i);                         // [0, 1, 4, 9, 16]
        System.out.println(Arrays.toString(dp) + " " + Arrays.toString(sq));

        int[] x = {1, 2, 3}, y = {1, 2, 3};
        System.out.println((x == y) + " " + Arrays.equals(x, y)); // false true
        System.out.println(Arrays.mismatch(x, new int[]{1, 9, 3})); // 1

        // descending order for primitives: sort, then reverse in place
        int[] d = {4, 1, 3};
        Arrays.sort(d);
        for (int lo = 0, hi = d.length - 1; lo < hi; lo++, hi--) { int t = d[lo]; d[lo] = d[hi]; d[hi] = t; }
        System.out.println(Arrays.toString(d));                // [4, 3, 1]

        // descending for objects: a comparator works
        Integer[] boxed = {4, 1, 3};
        Arrays.sort(boxed, Collections.reverseOrder());        // [4, 3, 1]
        System.out.println(Arrays.toString(boxed));

        // sort intervals by start, then by end (2D int array with a comparator)
        int[][] intervals = {{5, 6}, {1, 9}, {1, 3}};
        Arrays.sort(intervals, (p, q) -> p[0] != q[0] ? Integer.compare(p[0], q[0]) : Integer.compare(p[1], q[1]));
        System.out.println(Arrays.deepToString(intervals));    // [[1, 3], [1, 9], [5, 6]]

        System.out.println(Arrays.stream(a).sum());            // 25
    }
}`],
    codeTitle: ['A tour of the most-used Arrays methods'],
    viz: [{
      title: 'Arrays.binarySearch step by step (and the negative answer)',
      input: '1 3 5 7 9 11 13 | 8',
      inputLabel: 'sorted array | key',
      gen: function (input) {
        var s = String(input === undefined || input === null ? '' : input);
        var bits = s.split('|');
        if (bits.length !== 2) throw new Error('Format: sorted numbers | key   e.g. 1 3 5 7 9 | 6');
        var a = intsOf(bits[0], 1, 16, -9999, 9999, 'Use 1 to 16 integers before the |, e.g. 1 3 5 7 9 | 6');
        var key = intOf(bits[1], -9999, 9999, 'The key after | must be one integer');
        for (var i = 1; i < a.length; i++) if (a[i] < a[i - 1]) throw new Error('binarySearch needs a SORTED array — Java would not complain, it would just return garbage. Please sort it first.');
        var code = 'int lo = 0, hi = a.length - 1;\nwhile (lo <= hi) {\n    int mid = (lo + hi) >>> 1;\n    if (a[mid] < key) lo = mid + 1;\n    else if (a[mid] > key) hi = mid - 1;\n    else return mid;            // found\n}\nreturn -(lo + 1);               // not found';
        var lo = 0, hi = a.length - 1, fr = [], step = 0;
        function arrP(ptr, hl, range) { return { type: 'array', label: 'a (sorted), key = ' + key, values: a.slice(), ptr: ptr, hl: hl, range: range, showIdx: true }; }
        fr = fr.concat(codeFrames(code, [{ l: 1, v: { key: key, lo: lo, hi: hi }, narr: 'Search space is the whole array: indexes ' + lo + '..' + hi + '. Each step will throw away half of it.', extra: [arrP(one(0, 'lo'), {}, [lo, hi])] }]));
        while (lo <= hi) {
          step++;
          var mid = (lo + hi) >>> 1, ptr = {};
          ptr[lo] = 'lo'; ptr[hi] = lo === hi ? ['lo', 'hi'] : 'hi'; if (mid !== lo && mid !== hi) ptr[mid] = 'mid'; else ptr[mid] = [].concat(ptr[mid], 'mid');
          if (a[mid] === key) {
            fr = fr.concat(codeFrames(code, [{ l: 6, cls: 'ok', v: { lo: lo, hi: hi, mid: mid, 'a[mid]': a[mid], steps: step }, hv: { mid: 'ok' }, out: 'returns ' + mid, narr: 'a[' + mid + '] = ' + a[mid] + ' equals the key → return <b>' + mid + '</b> after ' + step + ' step(s). A linear scan could need up to ' + a.length + '.', extra: [arrP(ptr, one(mid, 'sel'), [lo, hi])] }]));
            return fr;
          }
          var less = a[mid] < key;
          fr = fr.concat(codeFrames(code, [{ l: less ? 4 : 5, v: { lo: lo, hi: hi, mid: mid, 'a[mid]': a[mid], steps: step }, hv: { mid: 'cur' }, narr: 'mid = (' + lo + ' + ' + hi + ') &gt;&gt;&gt; 1 = ' + mid + '. a[mid] = ' + a[mid] + (less ? ' &lt; ' + key + ' → the key can only be to the <b>right</b>: lo = ' + (mid + 1) + '.' : ' &gt; ' + key + ' → the key can only be to the <b>left</b>: hi = ' + (mid - 1) + '.'), extra: [arrP(ptr, one(mid, 'cur'), [lo, hi])] }]));
          if (less) lo = mid + 1; else hi = mid - 1;
        }
        var res = -(lo + 1), pp = {};
        if (lo < a.length) pp[lo] = 'insert here'; else pp[a.length - 1] = 'insert after';
        fr = fr.concat(codeFrames(code, [{ l: 8, cls: 'bad', v: { lo: lo, hi: hi, result: res }, hv: { result: 'sel' }, out: 'returns ' + res, narr: 'lo (' + lo + ') passed hi (' + hi + '): the key is not present. <code>lo</code> is exactly where it would be inserted to keep the array sorted, so Java returns −(' + lo + ' + 1) = <b>' + res + '</b>. Decode it with <code>-(res + 1)</code> = ' + lo + '. The "+1" makes sure a missing key never returns 0 (which would look like "found at index 0").', extra: [arrP(pp, {}, null)] }]));
        return fr;
      }
    }, {
      title: 'Arrays.asList is a window onto the array',
      gen: function () {
        var arr = ['a', 'b', 'c'];
        var code = 'String[] arr = {"a", "b", "c"};\nList<String> view = Arrays.asList(arr);\nview.set(0, "z");\narr[2] = "q";\nview.add("d");            // throws!\nList<String> real = new ArrayList<>(view);\nreal.add("d");';
        function P(listItems, arrHl, listHl, real) {
          var p = [{ type: 'array', label: 'String[] arr (the real storage)', values: arr.slice(), hl: arrHl || {}, showIdx: true }, { type: 'array', label: 'view = Arrays.asList(arr) (same boxes!)', values: listItems || arr.slice(), hl: listHl || {}, showIdx: true }];
          if (real) p.push({ type: 'array', label: 'real = new ArrayList<>(view) (own copy, can grow)', values: real, hl: one(real.length - 1, 'ok'), showIdx: true });
          return p;
        }
        var steps = [];
        steps.push({ l: [1, 2], extra: P(), narr: '<code>Arrays.asList(arr)</code> does <b>not</b> copy. It wraps the array in a fixed-size List — reading the list reads the array.' });
        arr[0] = 'z';
        steps.push({ l: 3, cls: 'ok', extra: P(null, one(0, 'ok'), one(0, 'ok')), narr: '<code>view.set(0, "z")</code> writes <b>through</b> to the array: arr[0] is now "z" too.' });
        arr[2] = 'q';
        steps.push({ l: 4, cls: 'ok', extra: P(null, one(2, 'ok'), one(2, 'ok')), narr: 'And the other way: <code>arr[2] = "q"</code> is instantly visible through the list.' });
        steps.push({ l: 5, cls: 'bad', out: 'java.lang.UnsupportedOperationException', extra: P(null, {}, {}), narr: '<span class="c-r"><code>view.add("d")</code> throws UnsupportedOperationException</span> — an array cannot grow, so a view of it cannot either. Same for <code>remove</code>.' });
        steps.push({ l: [6, 7], cls: 'ok', extra: P(null, {}, {}, arr.concat(['d'])), narr: 'Need a normal list? Copy it: <code>new ArrayList&lt;&gt;(view)</code> owns its own storage, can grow, and no longer affects the array. (<code>List.of(...)</code> is different again: fully immutable and rejects nulls.)' });
        return codeFrames(code, steps);
      }
    }],
    examples: [
      { title: 'binarySearch on unsorted data or with duplicates', html: `<p>On <code>[5, 1, 4]</code> searching 5 returns <b>−4</b> ("not found") even though 5 is at index 0 — binary search assumes sorted order and quietly gives garbage. With duplicates <code>[2, 2, 2, 2]</code> searching 2 returns <b>some</b> index (here 1), not necessarily the first. For "first occurrence" or "count of x", write your own lower-bound loop (DSA Binary Search module).</p>`, code: `
int[] unsorted = {5, 1, 4};
System.out.println(java.util.Arrays.binarySearch(unsorted, 5));   // -4 (wrong! 5 is at index 0)
int[] dup = {2, 2, 2, 2};
System.out.println(java.util.Arrays.binarySearch(dup, 2));        // 1 (some match, not the first)` },
      { title: 'The Arrays.fill 2D trap', html: `<p><code>Arrays.fill(grid, new int[3])</code> creates <b>one</b> row and stores the same reference in every slot — change one row and all rows change. Fill <b>each row</b> instead.</p>
${H.table(['Code', 'Rows are…'], [['<code>Arrays.fill(g, new int[3])</code>', H.c('r', 'one shared object')], ['<code>for (int[] row : g) Arrays.fill(row, -1)</code>', H.c('g', 'separate, all -1')]])}`, code: `
int[][] g = new int[3][];
java.util.Arrays.fill(g, new int[3]);     // every slot -> the SAME row
g[0][0] = 7;
System.out.println(g[2][0]);              // 7  (surprise)

int[][] dp = new int[3][3];
for (int[] row : dp) java.util.Arrays.fill(row, -1);   // correct way
dp[0][0] = 0;
System.out.println(java.util.Arrays.deepToString(dp)); // [[0, -1, -1], [-1, -1, -1], [-1, -1, -1]]` },
      { title: 'Sorting objects: stable and with comparators', html: `<p>For objects, <code>Arrays.sort</code> is <b>stable</b> (equal elements keep their original order). Sort words by length and words of the same length stay in input order — perfect for multi-key sorting done in passes.</p>`, code: `
String[] words = {"pear", "fig", "apple", "kiwi", "date"};
java.util.Arrays.sort(words, java.util.Comparator.comparingInt(String::length));
System.out.println(java.util.Arrays.toString(words));  // [fig, pear, kiwi, date, apple] (stable for 4-letter words)
java.util.Arrays.sort(words);                           // natural (alphabetical) order
System.out.println(java.util.Arrays.toString(words));  // [apple, date, fig, kiwi, pear]` },
      { title: 'System.arraycopy to shift elements (insert into a sorted array)', html: `<p>To insert 4 into the sorted prefix [1, 3, 5, 7] stored in a bigger array: find the insertion point with binarySearch, shift the tail one place right with <code>System.arraycopy</code> (it handles overlapping ranges correctly), then drop the value in.</p>`, code: `
int[] a = {1, 3, 5, 7, 0};                  // 4 used slots + 1 spare
int used = 4, key = 4;
int idx = java.util.Arrays.binarySearch(a, 0, used, key);
int ins = idx >= 0 ? idx : -(idx + 1);      // 2
System.arraycopy(a, ins, a, ins + 1, used - ins);  // shift [5, 7] right
a[ins] = key;
System.out.println(java.util.Arrays.toString(a));  // [1, 3, 4, 5, 7]` }
    ],
    deepDive: `<p><b>Which algorithm does sort use?</b> For primitive arrays, <code>Arrays.sort</code> uses <b>Dual-Pivot Quicksort</b> (Yaroslavskiy, since Java 7) with insertion sort for tiny ranges; since JDK 14 it also falls back to heapsort when recursion gets too deep, so the worst case is O(n log n). It is <b>not stable</b> — irrelevant for primitives since equal ints are indistinguishable. For object arrays it uses <b>TimSort</b> (a merge-sort/insertion-sort hybrid from Python): <b>stable</b>, O(n log n) worst case, close to O(n) on nearly sorted data, but needs up to n/2 extra references of memory.</p>
<p><b>parallelSort</b> splits big arrays (≥ 8 192 elements) across the common ForkJoinPool. It helps for millions of elements on multi-core machines, but competes with your other parallel work — measure before using it in a server.</p>
<p><b>Comparator pitfalls.</b> Never write <code>(a, b) -&gt; a - b</code> for ints: it overflows when a and b have opposite signs and large magnitudes (e.g. <code>Integer.MIN_VALUE - 1</code>). Use <code>Integer.compare(a, b)</code>. TimSort may throw "Comparison method violates its general contract!" if your comparator is inconsistent.</p>
<p><b>binarySearch's (lo + hi) &gt;&gt;&gt; 1.</b> The classic <code>(lo + hi) / 2</code> overflows when lo + hi &gt; 2<sup>31</sup> − 1 — a bug that lived in the JDK (and most textbooks) until 2006. The unsigned shift <code>&gt;&gt;&gt; 1</code> treats the overflowed sum as unsigned and gives the right midpoint.</p>
<p><b>copyOf and arraycopy</b> are JVM intrinsics: they compile to highly optimised memory-move instructions, far faster than a hand-written loop for large arrays. <code>Arrays.equals</code> and <code>mismatch</code> are vectorised in modern JDKs.</p>
<p><b>asList internals.</b> It returns <code>java.util.Arrays$ArrayList</code> (a private class, <i>not</i> <code>java.util.ArrayList</code>) that wraps your array directly; <code>set</code> is supported, structural changes are not. <code>List.of</code> returns an immutable list that rejects nulls and copies the data. Knowing these three (asList, List.of, new ArrayList) is a common interview probe.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI will happily reach for the right Arrays method — and also for streams like <code>Arrays.stream(a).boxed().sorted(Comparator.reverseOrder())</code> where a sort plus reverse is simpler and faster.</p>
<p><b>Use AI as a partner:</b> <code>"Which Arrays methods allocate a new array and which work in place?"</code>, <code>"Replace my hand-written copy loops with Arrays/System.arraycopy where it is clearer"</code>, <code>"Write a comparator for int[] intervals by start then end without overflow."</code></p>
<p><b>Where AI goes wrong:</b> calling binarySearch on unsorted data, using <code>a - b</code> comparators, trying <code>Arrays.sort(int[], Collections.reverseOrder())</code> (does not compile), and calling <code>add</code> on an <code>Arrays.asList</code> result.</p>
<p><b>What you must still own:</b> knowing the cost of each call (sort is O(n log n), copyOf is O(n), asList is O(1) because it does not copy), the preconditions (sorted for binarySearch), and the shallow-copy semantics.</p>`,
    problems: [{
      title: 'Are Two Arrays Permutations of Each Other?',
      level: 'Easy', tags: ['Arrays.sort', 'Arrays.equals', 'defensive copy'], companies: ['Amazon', 'Adobe'],
      statement: `<p>Return true if int arrays <code>a</code> and <code>b</code> contain exactly the same values with the same counts (in any order). Do <b>not</b> modify the inputs.</p>`,
      constraints: `0 ≤ length ≤ 10<sup>5</sup>; values fit in int`,
      example: `<p>a = [3, 1, 2, 1], b = [1, 2, 1, 3] → ${H.c('g', 'true')}. a = [1, 1, 2], b = [1, 2, 2] → ${H.c('r', 'false')} (counts of 1 and 2 differ).</p>`,
      brute: { why: `<p>For each element of a, scan b for an unused equal element and mark it used. Correct, but O(n²): 10<sup>10</sup> steps for n = 10<sup>5</sup>.</p>`, code: `
static boolean isPermBrute(int[] a, int[] b) {
    if (a.length != b.length) return false;
    boolean[] used = new boolean[b.length];
    for (int x : a) {
        boolean matched = false;
        for (int j = 0; j < b.length; j++) {
            if (!used[j] && b[j] == x) { used[j] = true; matched = true; break; }
        }
        if (!matched) return false;
    }
    return true;
}` },
      mcq: { q: 'Why sort <b>copies</b> instead of the input arrays?', options: ['Arrays.sort cannot sort parameters', 'Sorting the inputs would silently change the caller\'s data (a side effect)', 'Copies sort faster', 'Arrays.equals needs copies'], answer: 1, explain: 'Arrays are passed by reference value, so sorting a parameter rearranges the caller\'s array. Callers rarely expect that.' },
      hints: [`<p>Hint 1: if two arrays hold the same multiset of values, their <b>sorted</b> versions are identical.</p>`, `<p>Hint 2: <code>Arrays.copyOf</code> (or <code>clone</code>) → <code>Arrays.sort</code> both → <code>Arrays.equals</code>.</p>`, `<p>Hint 3: check lengths first (cheap early exit). Empty vs empty → true. Recipe: length check → copy → sort → equals.</p>`],
      solution: {
        approach: `<p>Different lengths → false immediately. Otherwise sort clones of both arrays and compare them element by element with <code>Arrays.equals</code>.</p>`,
        code: `
import java.util.Arrays;

class Permutation {
    static boolean isPermutation(int[] a, int[] b) {
        if (a.length != b.length) return false;   // cheap early exit
        int[] x = a.clone(), y = b.clone();       // protect the caller's arrays
        Arrays.sort(x);
        Arrays.sort(y);
        return Arrays.equals(x, y);
    }
    public static void main(String[] args) {
        System.out.println(isPermutation(new int[]{3, 1, 2, 1}, new int[]{1, 2, 1, 3})); // true
        System.out.println(isPermutation(new int[]{1, 1, 2}, new int[]{1, 2, 2}));       // false
        System.out.println(isPermutation(new int[]{}, new int[]{}));                     // true
    }
}`,
        alt: [{ lang: 'python', code: `def is_permutation(a, b):\n    return len(a) == len(b) and sorted(a) == sorted(b)\n\nprint(is_permutation([3, 1, 2, 1], [1, 2, 1, 3]), is_permutation([1, 1, 2], [1, 2, 2]))`, run: true }],
        dry: { head: ['step', 'x', 'y', 'result'], rows: [['clone', '[3, 1, 2, 1]', '[1, 2, 1, 3]', '—'], ['sort', '[1, 1, 2, 3]', '[1, 1, 2, 3]', '—'], ['equals', 'index by index', 'all match', H.c('g', 'true')]] },
        complexity: `<p>Time O(n log n) for the two sorts; space O(n) for the copies. With a HashMap of counts (or a count array for small value ranges) it becomes O(n) time.</p>`,
        followUps: ['Solve it in O(n) when values are in 0..1000 (count array).', 'Do the same for two Strings — "is t an anagram of s?"']
      }
    }]
  });

  /* ======================================================================
     TOPIC 8 — Everyday String methods
     ====================================================================== */
  topics.push({
    title: 'String Basics: The Everyday Methods (and Their Traps)',
    analogy: `<p>A Java <code>String</code> is a <b>printed train ticket</b>. You can read any character on it, measure it, look for a station name, or cut out a piece — but you can <b>never change the ink</b>. Every "change" (uppercase it, replace a word, trim spaces) makes the ticket office <b>print a brand-new ticket</b> and hand it to you; the old one is untouched. If you do not keep the new ticket (assign it to a variable), it is thrown away. Seats on the ticket are numbered from 0, and when you ask for "seats 2 to 5" you get 2, 3, 4 — the end number is where you <b>stop</b>, not included.</p>`,
    explain: `<h4>1. Reading a String</h4>
${H.arr(['h', 'e', 'l', 'l', 'o'], { label: 's = "hello"' })}
${H.table(['Call', 'Result', 'Note'], [
  ['<code>s.length()</code>', '5', 'a <b>method</b> (arrays use the <code>.length</code> field)'],
  ['<code>s.charAt(1)</code>', "'e'", 'returns a <code>char</code>; index 5 → StringIndexOutOfBoundsException'],
  ['<code>s.indexOf(\'l\')</code>', '2', 'first position; <b>−1</b> if absent'],
  ['<code>s.lastIndexOf(\'l\')</code>', '3', 'last position'],
  ['<code>s.indexOf("lo")</code>', '3', 'works with Strings too'],
  ['<code>s.contains("ell")</code>', 'true', ''],
  ['<code>s.startsWith("he")</code> / <code>endsWith("lo")</code>', 'true / true', ''],
  ['<code>s.substring(1, 4)</code>', '"ell"', 'from index 1 up to <b>but not including</b> 4 → length 4 − 1 = 3'],
  ['<code>s.substring(2)</code>', '"llo"', 'from 2 to the end'],
  ['<code>s.isEmpty()</code> / <code>"  ".isBlank()</code>', 'false / true', 'isBlank (Java 11) ignores whitespace']])}
<h4>2. "Changing" a String (always returns a NEW String)</h4>
${H.table(['Call', 'Result'], [
  ['<code>" Hi ".trim()</code> / <code>.strip()</code>', '"Hi" (strip is Unicode-aware, Java 11)'],
  ['<code>"Hi".toUpperCase()</code> / <code>toLowerCase()</code>', '"HI" / "hi"'],
  ['<code>"a-b-c".replace("-", "+")</code>', '"a+b+c" (literal text, all occurrences)'],
  ['<code>"a1b22".replaceAll("[0-9]+", "#")</code>', '"a#b#" (<b>regex</b>)'],
  ['<code>"ab".repeat(3)</code>', '"ababab" (Java 11)'],
  ['<code>String.join("-", "a", "b", "c")</code>', '"a-b-c"'],
  ['<code>"a,b,c".split(",")</code>', '["a", "b", "c"] (<b>regex</b> delimiter!)']])}
<p>Because Strings are <b>immutable</b>, <code>s.toUpperCase();</code> on its own line does nothing useful — you must write <code>s = s.toUpperCase();</code>.</p>
<h4>3. Comparing Strings</h4>
<ul><li><code>a.equals(b)</code> — same characters? <b>Always use this</b> for content. <code>a == b</code> asks "same object?" and can be false for equal text (full story in the Strings Deep Dive module).</li>
<li><code>a.equalsIgnoreCase(b)</code> — ignores case.</li>
<li><code>a.compareTo(b)</code> — dictionary order: negative if a comes first, 0 if equal, positive if after. It returns the <b>difference of the first differing chars</b> (<code>"abc".compareTo("abd")</code> = −1), or the length difference if one is a prefix (<code>"apple".compareTo("app")</code> = 2). Uppercase letters sort <b>before</b> lowercase (<code>"B".compareTo("a")</code> = 66 − 97 = −31).</li></ul>
<h4>4. Chars, numbers and Strings</h4>
${H.table(['Expression', 'Result', 'Why'], [
  ['<code>1 + 2 + "3"</code>', '"33"', 'left to right: 1 + 2 = 3 (int), then "3" + "3"'],
  ['<code>"1" + 2 + 3</code>', '"123"', 'once a String appears, + means concatenate'],
  ["<code>'a' + 'b'</code>", '195', 'char + char is int addition (97 + 98)'],
  ["<code>\"\" + 'a' + 'b'</code>", '"ab"', 'start with a String to concatenate'],
  ["<code>(char) ('a' + 2)</code>", "'c'", 'char arithmetic, cast back'],
  ["<code>'7' - '0'</code>", '7', 'digit char → its numeric value'],
  ['<code>Integer.parseInt("42")</code> / <code>String.valueOf(42)</code>', '42 / "42"', 'String ↔ number']])}
<p>The <code>Character</code> class helps when walking a String: <code>isDigit</code>, <code>isLetter</code>, <code>isLetterOrDigit</code>, <code>isWhitespace</code>, <code>toLowerCase</code>. And <code>c - 'a'</code> turns a lowercase letter into 0..25 — the index into an <code>int[26]</code> frequency table.</p>
<h4>5. Building Strings in a loop</h4>
<p><code>result += piece</code> inside a loop creates a new String every round, copying everything so far: O(n²) for n pieces. Use a <code>StringBuilder</code> (<code>sb.append(piece)</code>, then <code>sb.toString()</code>) — covered in depth in the Strings Deep Dive module.</p>`,
    clues: [
      '"substring", "prefix", "suffix", "extract the part between …" → <code>indexOf</code> + <code>substring(begin, end)</code> with end exclusive',
      '"ignore case", "case-insensitive" → <code>equalsIgnoreCase</code> or normalise once with <code>toLowerCase(Locale.ROOT)</code>',
      '"words separated by one or more spaces", "leading/trailing spaces" → <code>strip()</code> + <code>split("\\\\s+")</code>',
      '"count each letter", "only lowercase a–z" → <code>int[26]</code> with <code>c - \'a\'</code>',
      '"split on . or |" → regex special characters, escape them: <code>split("\\\\.")</code>, or use <code>Pattern.quote</code>',
      '"build the answer string character by character" → StringBuilder, not <code>+=</code>'
    ],
    code: [`
import java.util.Arrays;

public class StringBasics {
    public static void main(String[] args) {
        String s = "Hello, World";
        System.out.println(s.length());                  // 12
        System.out.println(s.charAt(7));                 // W
        System.out.println(s.indexOf('o') + " " + s.lastIndexOf('o') + " " + s.indexOf('z')); // 4 8 -1
        System.out.println(s.substring(7));              // World
        System.out.println(s.substring(0, 5));           // Hello
        int comma = s.indexOf(',');
        System.out.println(s.substring(comma + 2));      // World  (text after ", ")

        String shout = s.toUpperCase();                  // new String; s unchanged
        System.out.println(shout + " / " + s);           // HELLO, WORLD / Hello, World

        String messy = "   spaced   out   ";
        System.out.println("[" + messy.strip() + "]");                    // [spaced   out]
        System.out.println(Arrays.toString(messy.strip().split("\\\\s+"))); // [spaced, out]

        System.out.println(String.join("|", "a", "b", "c") + " " + "ab".repeat(3)); // a|b|c ababab
        System.out.println("x.y.z".split("\\\\.").length + " " + "x.y.z".split(".").length);  // 3 0  ('.' is regex "any char")

        System.out.println("apple".equals("apple") + " " + "Apple".equalsIgnoreCase("APPLE")); // true true
        System.out.println("abc".compareTo("abd") + " " + "apple".compareTo("app"));         // -1 2

        // letter frequencies with an int[26]
        int[] freq = new int[26];
        for (char c : "banana".toCharArray()) freq[c - 'a']++;
        System.out.println("a=" + freq[0] + " b=" + freq[1] + " n=" + freq['n' - 'a']);      // a=3 b=1 n=2

        // digits of a String to an int sum
        int digitSum = 0;
        for (int i = 0; i < "4096".length(); i++) digitSum += "4096".charAt(i) - '0';
        System.out.println(digitSum);                    // 19

        System.out.println(1 + 2 + "3" + 1 + 2);         // 3312
    }
}`],
    codeTitle: ['Everyday String methods with their results'],
    viz: [{
      title: 'String explorer: indexes, indexOf, substring and immutability',
      input: 'hello world',
      inputLabel: 'any text (1..24 characters)',
      gen: function (input) {
        var s = String(input === undefined || input === null ? '' : input);
        if (s.length < 1 || s.length > 24 || /[\n\r"\\]/.test(s)) throw new Error('Type 1 to 24 characters (no quotes, backslashes or line breaks), e.g. hello world');
        var n = s.length, cells = s.split('').map(function (ch) { return ch === ' ' ? '␣' : ch; });
        var cnt = {}, best = s[0];
        s.split('').forEach(function (ch) { if (ch !== ' ') { cnt[ch] = (cnt[ch] || 0) + 1; if (cnt[ch] > (cnt[best] || 0) || best === ' ') best = ch; } });
        var c = best, fi = s.indexOf(c), li = s.lastIndexOf(c);
        var b = Math.min(1, n - 1), e = Math.min(n, b + 3), sub = s.substring(b, e), up = s.toUpperCase();
        var code = 'String s = "' + s + '";\nint n = s.length();\nchar last = s.charAt(n - 1);\nint i = s.indexOf(\'' + c + '\');\nint j = s.lastIndexOf(\'' + c + '\');\nString mid = s.substring(' + b + ', ' + e + ');\nint k = s.indexOf(\'#\');\ns.toUpperCase();\nString up = s.toUpperCase();';
        function A(hl, ptr, range, lbl) { return { type: 'array', label: lbl || 's', values: cells.slice(), hl: hl || {}, ptr: ptr || {}, range: range, showIdx: true }; }
        var steps = [];
        steps.push({ l: 1, v: { s: '"' + s + '"' }, extra: [A()], narr: 'A String is a fixed sequence of chars numbered from <b>0</b>. Spaces are characters too (shown as ␣).' });
        steps.push({ l: 2, v: { n: n }, hv: { n: 'ok' }, extra: [A({}, one(n - 1, 'n-1'))], narr: '<code>length()</code> = <b>' + n + '</b>, so valid indexes are 0..' + (n - 1) + '. <code>charAt(' + n + ')</code> would throw StringIndexOutOfBoundsException.' });
        steps.push({ l: 3, v: { n: n, last: "'" + s[n - 1] + "'" }, hv: { last: 'ok' }, extra: [A(one(n - 1, 'ok'), one(n - 1, 'n-1'))], narr: 'The last character is at <b>n − 1</b> = ' + (n - 1) + ': <code>\'' + esc(s[n - 1]) + '\'</code>. Using <code>charAt(n)</code> is the classic off-by-one.' });
        steps.push({ l: 4, v: { i: fi }, hv: { i: 'ok' }, extra: [A(one(fi, 'ok'), one(fi, 'i'))], narr: '<code>indexOf(\'' + esc(c) + '\')</code> scans left to right and stops at the <b>first</b> match: index <b>' + fi + '</b>.' });
        steps.push({ l: 5, v: { i: fi, j: li }, hv: { j: 'ok' }, extra: [A((function () { var h = {}; h[fi] = 'ok'; h[li] = 'sel'; return h; })(), (function () { var p = {}; p[fi] = 'i'; p[li] = fi === li ? ['i', 'j'] : 'j'; return p; })())], narr: '<code>lastIndexOf(\'' + esc(c) + '\')</code> scans from the right: index <b>' + li + '</b>.' + (fi === li ? ' Same as indexOf — the char appears once.' : '') });
        var rh = {}; for (var q = b; q < e; q++) rh[q] = 'win';
        var pp = {}; pp[b] = 'begin'; if (e < n) pp[e] = 'end (excluded)';
        steps.push({ l: 6, v: { mid: '"' + sub + '"', 'mid.length()': sub.length }, hv: { mid: 'ok' }, extra: [A(rh, pp)], narr: '<code>substring(' + b + ', ' + e + ')</code> copies indexes ' + b + '..' + (e - 1) + ' — the end index <b>' + e + '</b> is <b>excluded</b>. Length = end − begin = ' + (e - b) + '. Result: <code>"' + esc(sub) + '"</code>.' });
        var k = s.indexOf('#');
        steps.push({ l: 7, cls: k < 0 ? 'bad' : 'ok', v: { k: k }, hv: { k: k < 0 ? 'bad' : 'ok' }, extra: [A()], narr: k < 0 ? 'No <code>#</code> in the text → <code>indexOf</code> returns <b>−1</b>. Always check for −1 before using the result in <code>substring</code>, or you get an exception.' : '<code>#</code> found at ' + k + '.' });
        steps.push({ l: 8, cls: 'bad', v: { s: '"' + s + '"' }, hv: { s: 'bad' }, extra: [A()], narr: '<code>s.toUpperCase();</code> builds a new String "' + esc(up) + '"… and throws it away because nothing stores it. <b>s is unchanged</b> — Strings are immutable.' });
        steps.push({ l: 9, cls: 'ok', v: { s: '"' + s + '"', up: '"' + up + '"' }, hv: { up: 'ok' }, extra: [A(), { type: 'array', label: 'up (a different object)', values: up.split('').map(function (ch) { return ch === ' ' ? '␣' : ch; }), showIdx: false }], narr: 'Storing the result keeps the new String. Two separate objects now exist: the original and the uppercase copy.' });
        return codeFrames(code, steps);
      }
    }, {
      title: 'How split(",") really behaves',
      input: 'a,b,,c,,',
      inputLabel: 'text to split on commas (up to 30 chars)',
      gen: function (input) {
        var s = String(input === undefined || input === null ? '' : input);
        if (s.length > 30 || /[\n\r"\\]/.test(s)) throw new Error('Up to 30 characters, no quotes/backslashes/line breaks, e.g. a,b,,c,,');
        var code = 'String s = "' + s + '";\nString[] parts = s.split(",");\nSystem.out.println(parts.length);';
        var raw = s.split(','), steps = [];
        var cells = s.length ? s.split('').map(function (ch) { return ch === ' ' ? '␣' : ch; }) : ['(empty)'];
        var commaHl = {}; s.split('').forEach(function (ch, i) { if (ch === ',') commaHl[i] = 'r'; });
        var commaParts = {}; Object.keys(commaHl).forEach(function (k) { commaParts[k] = 'bad'; });
        steps.push({ l: 1, v: { 's.length()': s.length }, extra: [{ type: 'array', label: 's (commas in red)', values: cells, hl: commaParts, showIdx: true }], narr: 'The delimiter <code>","</code> is actually a <b>regular expression</b>. A comma has no special meaning in regex, so it matches literal commas. (A dot <code>"."</code> would match <i>every</i> character!)' });
        steps.push({ l: 2, v: { 'raw pieces': raw.length }, extra: [{ type: 'array', label: 'cut at every comma (before clean-up)', values: raw.map(function (x) { return x === '' ? '""' : x; }), hl: (function () { var h = {}; raw.forEach(function (x, i) { if (x === '') h[i] = 'cur'; }); return h; })(), showIdx: true }], narr: 'Step 1: cut at every comma. Two commas in a row (or a comma at either end) produce an <b>empty string</b> "" between them.' });
        var res = raw.slice();
        if (s === '') res = [''];
        else { while (res.length && res[res.length - 1] === '') res.pop(); }
        var removed = s === '' ? 0 : raw.length - res.length;
        steps.push({ l: 2, cls: removed ? 'bad' : 'ok', v: { 'trailing empties removed': removed, 'parts.length': res.length }, hv: { 'trailing empties removed': removed ? 'bad' : '' }, extra: [{ type: 'array', label: 'parts (final)', values: res.length ? res.map(function (x) { return x === '' ? '""' : x; }) : ['(empty array)'], hl: (function () { var h = {}; res.forEach(function (x, i) { if (x === '') h[i] = 'cur'; }); return h; })(), showIdx: res.length > 0 }],
          narr: s === '' ? 'Special case: splitting an <b>empty</b> String gives an array with <b>one</b> empty string <code>[""]</code>, not an empty array.' : 'Step 2: with the default limit (0), Java <b>removes trailing empty strings</b> — ' + removed + ' removed. Leading and middle empties are <b>kept</b>.' + (res.length === 0 ? ' Every piece was empty, so the result is an empty array.' : '') });
        steps.push({ l: 3, cls: 'ok', v: { 'parts.length': res.length }, hv: { 'parts.length': 'sel' }, out: String(res.length), narr: 'Prints <b>' + res.length + '</b>. Want to keep trailing empties (e.g. CSV with blank last columns)? Use <code>s.split(",", -1)</code> → ' + (s === '' ? 1 : raw.length) + ' parts.' });
        return codeFrames(code, steps);
      }
    }],
    examples: [
      { title: 'Predict the output: + with chars, ints and Strings', html: `<p>Java evaluates <code>+</code> left to right. Until a String shows up, chars and ints are <b>added as numbers</b>.</p>
${H.table(['Expression', 'Step by step', 'Prints'], [["<code>'J' + 'a'</code>", '74 + 97', '171'], ["<code>\"\" + 'J' + 'a'</code>", '"J" then "Ja"', 'Ja'], ['<code>1 + 2 + "3" + 1 + 2</code>', '3 → "33" → "331" → "3312"', '3312'], ['<code>"Java".charAt(0) + "Java".charAt(1)</code>', "'J' + 'a' = 74 + 97", H.c('r', '171')]])}`, code: `
System.out.println('J' + 'a');                              // 171
System.out.println("" + 'J' + 'a');                         // Ja
System.out.println(1 + 2 + "3" + 1 + 2);                    // 3312
System.out.println("Java".charAt(0) + "Java".charAt(1));    // 171
System.out.println("" + "Java".charAt(0) + "Java".charAt(1)); // Ja` },
      { title: 'split surprises: regex characters and empty pieces', html: `<p><code>split</code> takes a <b>regex</b>. <code>"."</code> means "any character", so every char is a delimiter and all pieces are empty → trailing empties removed → length 0. <code>"|"</code> means "empty OR empty" and splits between every char. Escape with <code>"\\\\."</code> or <code>"\\\\|"</code>, or use <code>Pattern.quote(".")</code>.</p>
${H.table(['Call', 'Result'], [['<code>"a.b".split(".")</code>', H.c('r', '[] (length 0)')], ['<code>"a.b".split("\\\\.")</code>', H.c('g', '[a, b]')], ['<code>",a,b".split(",")</code>', '["", a, b] — leading empty kept'], ['<code>"a,b,,".split(",")</code>', '[a, b] — trailing empties dropped'], ['<code>"a,b,,".split(",", -1)</code>', '[a, b, "", ""]'], ['<code>"a,b,c".split(",", 2)</code>', '[a, "b,c"] — at most 2 pieces']])}`, code: `
System.out.println("a.b".split(".").length);                                 // 0
System.out.println(java.util.Arrays.toString("a.b".split("\\\\.")));          // [a, b]
System.out.println(java.util.Arrays.toString("a,b,,".split(",", -1)));       // [a, b, , ]
System.out.println(java.util.Arrays.toString("a,b,c".split(",", 2)));        // [a, b,c]
System.out.println(java.util.Arrays.toString("a.b".split(java.util.regex.Pattern.quote(".")))); // [a, b]` },
      { title: 'Extract the domain from an email', html: `<p>Combine <code>indexOf</code>, <code>lastIndexOf</code> and <code>substring</code>, and <b>always check for −1</b>. For <code>"asha@mail.example.com"</code>: @ is at 4, so the domain is <code>substring(5)</code> = "mail.example.com", and the top-level domain is after the last dot.</p>`, code: `
static String domain(String email) {
    int at = email.indexOf('@');
    if (at < 0 || at != email.lastIndexOf('@') || at == email.length() - 1)
        throw new IllegalArgumentException("not a simple email: " + email);
    return email.substring(at + 1);
}
static String tld(String email) {
    String d = domain(email);
    return d.substring(d.lastIndexOf('.') + 1);   // lastIndexOf = -1 -> substring(0) = whole domain
}` },
      { title: 'Case-insensitive compare the safe way', html: `<p><code>toLowerCase()</code> uses the JVM's default <b>locale</b>. On a Turkish machine <code>"TITLE".toLowerCase()</code> gives "tıtle" (dotless ı), so <code>.equals("title")</code> fails! Use <code>equalsIgnoreCase</code> for comparisons, or <code>toLowerCase(Locale.ROOT)</code> for machine-readable text like keywords, file extensions and HTTP headers.</p>`, code: `
String ext = "PHOTO.JPG";
boolean isJpg = ext.toLowerCase(java.util.Locale.ROOT).endsWith(".jpg");   // locale-proof
boolean same = "TITLE".equalsIgnoreCase("title");
System.out.println(isJpg + " " + same);   // true true` }
    ],
    deepDive: `<p><b>What is inside a String?</b> Since Java 9 (<b>compact strings</b>, JEP 254) a String holds a <code>byte[]</code> plus a <code>coder</code> flag: LATIN1 (1 byte per char) when every character fits in ISO-8859-1, otherwise UTF16 (2 bytes per char). English text uses half the memory it did in Java 8. The hash code is computed lazily and cached in a field, which is why Strings make fast HashMap keys.</p>
<p><b>char is UTF-16, not "a character".</b> <code>length()</code> counts UTF-16 <b>code units</b>. Emoji and many rare scripts need two units (a surrogate pair): <code>"😀".length()</code> is 2, and <code>charAt(0)</code> returns half an emoji. Use <code>codePointCount</code>, <code>codePoints()</code> or <code>Character.toChars</code> when handling user-generated text; reversing a String char by char can corrupt emoji.</p>
<p><b>substring copies (since 7u6).</b> Old Java shared the parent's <code>char[]</code>, so a tiny substring could keep a huge string alive (a memory leak). Modern Java copies, so <code>substring</code> is O(length of result).</p>
<p><b>Concatenation under the hood.</b> Since Java 9, <code>a + b + c</code> compiles to an <code>invokedynamic</code> call to <code>StringConcatFactory</code>, which sizes the result once. But <code>s += x</code> in a loop still creates n intermediate Strings — O(n²) characters copied. A <code>StringBuilder</code> amortises growth to O(n).</p>
<p><b>split performance.</b> <code>String.split</code> has a fast path for a single non-regex character (like <code>","</code>) that avoids the regex engine; otherwise it compiles a <code>Pattern</code> <b>every call</b>. In a hot loop, precompile: <code>private static final Pattern WS = Pattern.compile("\\\\s+");</code> and use <code>WS.split(line)</code>.</p>
<p><b>trim vs strip.</b> <code>trim()</code> removes chars ≤ U+0020 (ASCII control + space); <code>strip()</code> removes all Unicode whitespace (e.g. U+2003 em space, U+3000 ideographic space). <code>isBlank()</code> uses the Unicode definition too. Prefer strip/isBlank in new code.</p>
<p><b>Text blocks and formatting</b> (Java 15+): <code>"""…"""</code> for multi-line strings and <code>"%s scored %d".formatted(name, score)</code> — covered in Modern Java.</p>`,
    aiEra: `<p><b>What AI changes:</b> string manipulation is where AI saves the most typing — parsing, formatting, and regexes come out instantly. It also means bugs hide in code that "looks right".</p>
<p><b>Use AI as a partner:</b> <code>"Explain this regex piece by piece and give 5 strings it should and should not match"</code>, <code>"What does split return here for empty input, trailing commas and consecutive delimiters?"</code>, <code>"Make this string code Unicode/emoji-safe."</code></p>
<p><b>Where AI goes wrong:</b> unescaped regex in <code>split(".")</code> or <code>split("|")</code>, assuming <code>split</code> keeps trailing empty fields, using <code>==</code> for String comparison, off-by-one <code>substring</code> ends, <code>toLowerCase()</code> without a locale, and <code>+=</code> in loops on big inputs.</p>
<p><b>What you must still own:</b> exact semantics of indexOf/substring/split on edge cases (empty string, not found = −1, end exclusive), the immutability mental model, and the + evaluation order — all favourite predict-the-output material.</p>`,
    problems: [{
      title: 'Valid Palindrome (Ignore Case and Punctuation)',
      level: 'Easy', tags: ['String', 'two pointers', 'Character methods'], companies: ['Meta', 'Microsoft', 'Amazon'],
      statement: `<p>A phrase is a palindrome if, after converting letters to lowercase and removing every character that is not a letter or digit, it reads the same forwards and backwards. Return true if <code>s</code> is a palindrome. Use O(1) extra space.</p>`,
      constraints: `1 ≤ s.length() ≤ 2·10<sup>5</sup>; printable ASCII`,
      example: `<p>"Race, car" → cleaned "racecar" → ${H.c('g', 'true')}. "ab, A" → cleaned "aba" → ${H.c('g', 'true')} (the comma and space are ignored, "A" becomes "a"). "hello" → ${H.c('r', 'false')}.</p>`,
      brute: { why: `<p>Build a cleaned copy with <code>+=</code> in a loop, then build its reverse the same way and compare. Correct, but every <code>+=</code> copies the whole string so far: O(n²) time for 2·10<sup>5</sup> characters (≈ 2·10<sup>10</sup> char copies), plus O(n) extra memory.</p>`, code: `
static boolean isPalBrute(String s) {
    String clean = "";
    for (char c : s.toCharArray())
        if (Character.isLetterOrDigit(c)) clean += Character.toLowerCase(c);   // O(n) copy each time
    String rev = "";
    for (int i = clean.length() - 1; i >= 0; i--) rev += clean.charAt(i);
    return clean.equals(rev);
}` },
      mcq: { q: 'The left pointer sits on <code>\',\'</code>. What should the loop do?', options: ['Return false', 'Skip it: move the left pointer right without comparing', 'Compare it with the right character anyway', 'Restart from the beginning'], answer: 1, explain: 'Non-alphanumeric characters are ignored entirely, so a pointer that lands on one simply moves on.' },
      hints: [`<p>Hint 1: you never need the cleaned string — compare characters from both ends of the <b>original</b> string, skipping junk.</p>`, `<p>Hint 2: two indexes <code>i = 0</code>, <code>j = n − 1</code>. Skip with <code>while (i &lt; j &amp;&amp; !Character.isLetterOrDigit(s.charAt(i))) i++;</code> and the same for j.</p>`, `<p>Hint 3: compare <code>Character.toLowerCase</code> of both; mismatch → false. Strings with no letters at all (",,") are palindromes. Recipe: skip, skip, compare, move both, repeat while i &lt; j.</p>`],
      solution: {
        approach: `<p>Two pointers walking inwards over the original string. Each pointer skips characters that are not letters/digits; the two current characters are compared case-insensitively. No new strings are built.</p>`,
        code: `
class Palindrome {
    static boolean isPalindrome(String s) {
        int i = 0, j = s.length() - 1;
        while (i < j) {
            while (i < j && !Character.isLetterOrDigit(s.charAt(i))) i++;   // skip junk on the left
            while (i < j && !Character.isLetterOrDigit(s.charAt(j))) j--;   // skip junk on the right
            if (Character.toLowerCase(s.charAt(i)) != Character.toLowerCase(s.charAt(j))) return false;
            i++;
            j--;
        }
        return true;
    }
    public static void main(String[] args) {
        System.out.println(isPalindrome("Race, car"));                       // true
        System.out.println(isPalindrome("A man, a plan, a canal: Panama")); // true
        System.out.println(isPalindrome("hello"));                           // false
        System.out.println(isPalindrome(",,"));                              // true
    }
}`,
        alt: [{ lang: 'python', code: `def is_palindrome(s):\n    i, j = 0, len(s) - 1\n    while i < j:\n        while i < j and not s[i].isalnum(): i += 1\n        while i < j and not s[j].isalnum(): j -= 1\n        if s[i].lower() != s[j].lower():\n            return False\n        i, j = i + 1, j - 1\n    return True\n\nprint(is_palindrome("Race, car"), is_palindrome("hello"))`, run: true }],
        dry: { head: ['i', 's[i]', 'j', 's[j]', 'action'], rows: [['0', 'R', '8', 'r', 'r == r ✓, move both'], ['1', 'a', '7', 'a', 'match, move both'], ['2', 'c', '6', 'c', 'match, move both'], ['3', 'e', '5', '␣', 'skip j → 4 (,) → skip → 3'], ['3', 'e', '3', 'e', 'i == j → loop ends → ' + H.c('g', 'true')]] },
        complexity: `<p>O(n) time — each pointer moves at most n steps in total; O(1) extra space.</p>`,
        followUps: ['Allow deleting at most one character (LeetCode "Valid Palindrome II").', 'Make it Unicode-correct using <code>codePointAt</code> and <code>Character.isLetterOrDigit(int)</code>.']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'FizzBuzz with a Switch Expression',
    level: 'Easy', tags: ['switch expression', 'loops', 'classic'], companies: ['Every company', 'TCS', 'Bloomberg'],
    statement: `<p>Return a <code>List&lt;String&gt;</code> for 1..n where multiples of 3 become "Fizz", multiples of 5 become "Buzz", multiples of both become "FizzBuzz", and other numbers become their decimal text. Write the decision as <b>one switch expression</b> instead of an if-ladder.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>4</sup>`,
    example: `<p>n = 15 → [1, 2, ${H.c('y', 'Fizz')}, 4, ${H.c('b', 'Buzz')}, Fizz, 7, 8, Fizz, Buzz, 11, Fizz, 13, 14, ${H.c('g', 'FizzBuzz')}]. 15 is divisible by 3 <b>and</b> 5, so it must be checked as "both", not just "by 3".</p>`,
    brute: { why: `<p>The usual if-ladder works, but the order is fragile: if you test <code>i % 3 == 0</code> before <code>i % 15 == 0</code>, 15 prints "Fizz". It also repeats the modulo work. Not slow — just easy to get wrong.</p>`, code: `
static List<String> fizzBuzzLadder(int n) {
    List<String> out = new ArrayList<>();
    for (int i = 1; i <= n; i++) {
        if (i % 15 == 0) out.add("FizzBuzz");      // must come FIRST
        else if (i % 3 == 0) out.add("Fizz");
        else if (i % 5 == 0) out.add("Buzz");
        else out.add(String.valueOf(i));
    }
    return out;
}` },
    mcq: { q: 'How can two independent yes/no facts (divisible by 3? by 5?) drive ONE switch?', options: ['switch on a boolean', 'Combine them into one int code: (by3 ? 1 : 0) + (by5 ? 2 : 0) → values 0..3', 'Use two nested switches only', 'It is impossible'], answer: 1, explain: 'Java cannot switch on boolean, but you can pack two bits into an int 0..3 and switch on that — each case is one of the four combinations.' },
    hints: [`<p>Hint 1: there are exactly four situations: neither, only 3, only 5, both.</p>`, `<p>Hint 2: encode them as a number: <code>int code = (i % 3 == 0 ? 1 : 0) + (i % 5 == 0 ? 2 : 0);</code> → 0, 1, 2 or 3.</p>`, `<p>Hint 3: <code>out.add(switch (code) { case 1 -&gt; "Fizz"; case 2 -&gt; "Buzz"; case 3 -&gt; "FizzBuzz"; default -&gt; String.valueOf(i); });</code></p>`],
    solution: {
      approach: `<p>Pack the two divisibility facts into a 2-bit code and switch on it. Each combination is spelled out exactly once, so the order bug is impossible.</p>`,
      code: `
class FizzBuzz {
    static List<String> fizzBuzz(int n) {
        List<String> out = new ArrayList<>(n);
        for (int i = 1; i <= n; i++) {
            int code = (i % 3 == 0 ? 1 : 0) + (i % 5 == 0 ? 2 : 0);   // bit 0 = by 3, bit 1 = by 5
            out.add(switch (code) {
                case 1 -> "Fizz";
                case 2 -> "Buzz";
                case 3 -> "FizzBuzz";
                default -> String.valueOf(i);
            });
        }
        return out;
    }
    public static void main(String[] args) {
        System.out.println(fizzBuzz(15));
    }
}`,
      dry: { head: ['i', 'i%3==0', 'i%5==0', 'code', 'output'], rows: [['3', 'yes', 'no', '1', 'Fizz'], ['5', 'no', 'yes', '2', 'Buzz'], ['7', 'no', 'no', '0', '7'], ['15', 'yes', 'yes', '3', 'FizzBuzz']] },
      complexity: `<p>O(n) time, O(n) space for the output list.</p>`,
      followUps: ['Add "Bazz" for multiples of 7 — how does the code grow?', 'Make the rules data-driven (a list of divisor → word pairs).']
    }
  });

  practice.push({
    title: 'Predict the Output: char, int, String and the Ternary',
    level: 'Easy', tags: ['predict the output', 'char arithmetic', 'ternary', 'concatenation'], companies: ['Infosys', 'Capgemini', 'Oracle'],
    statement: `<p>What does this program print, line by line? Explain each line.</p>
<pre><code>char c = 'A';
int i = 1;
System.out.println(c + i);
System.out.println((char) (c + i));
System.out.println("" + c + i);
System.out.println(c + i + "");
System.out.println(false ? i : c);
System.out.println(true ? 'x' : 0);</code></pre>`,
    constraints: `'A' has code 65, 'x' has code 120`,
    example: `<p>Line 1 is ${H.c('g', '66')}: <code>char + int</code> is numeric addition (65 + 1). Work out the other five the same way.</p>`,
    brute: { why: `<p>Guessing from "what it looks like" (A1, B, A1, A1, A, x) gets three lines wrong. If you are allowed to run code, the debugging approach is to print the <b>type</b> as well — but in an interview you must know the rules: + is evaluated left to right, char + int is int, and a ternary's two arms are converted to one common type.</p>`, code: `
char c = 'A';
int i = 1;
Object o1 = c + i;            // boxing reveals the static type of the expression
Object o5 = false ? i : c;
System.out.println(o1 + " is " + o1.getClass().getSimpleName());   // 66 is Integer
System.out.println(o5 + " is " + o5.getClass().getSimpleName());   // 65 is Integer` },
    mcq: { q: '<code>false ? i : c</code> (int i, char c = \'A\') prints…', options: ['A', '65', '1', 'Compile error'], answer: 1, explain: 'i is an int <b>variable</b> (not a constant), so both arms become int; the char arm is chosen and printed as its number 65.' },
    hints: [`<p>Hint 1: <code>+</code> is evaluated <b>left to right</b>; it means string concatenation only once one side is already a String.</p>`, `<p>Hint 2: <code>char + int</code> → int. A cast <code>(char)</code> turns a number back into a character.</p>`, `<p>Hint 3: ternary typing: if one arm is char and the other an int <b>constant</b> that fits in a char (like 0), the type is char; if the other arm is an int <b>variable</b>, the type is int.</p>`],
    solution: {
      approach: `<p>Apply three rules: left-to-right +, numeric promotion of char, and ternary common-type rules.</p>`,
      code: `
char c = 'A';
int i = 1;
System.out.println(c + i);            // 66   char + int = int
System.out.println((char) (c + i));   // B    66 cast back to char
System.out.println("" + c + i);       // A1   "" + 'A' = "A", then "A" + 1 = "A1"
System.out.println(c + i + "");       // 66   65 + 1 = 66 first, then "66"
System.out.println(false ? i : c);    // 65   arms int and char (variable) → int
System.out.println(true ? 'x' : 0);   // x    0 is a constant fitting in char → char`,
      dry: { head: ['line', 'expression', 'type', 'prints'], rows: [['1', 'c + i', 'int', '66'], ['2', '(char)(c + i)', 'char', 'B'], ['3', '"" + c + i', 'String', 'A1'], ['4', 'c + i + ""', 'String', '66'], ['5', 'false ? i : c', 'int', '65'], ['6', "true ? 'x' : 0", 'char', 'x']] },
      complexity: `<p>Not an algorithm question — the "cost" is knowing the rules. Each line is O(1).</p>`,
      followUps: ['What does <code>System.out.println(\'a\' + \'b\' + "c")</code> print? (195c)', 'What is <code>char d = \'A\'; d += 1;</code> — does it compile? (Yes: compound assignment casts; d becomes \'B\'.)']
    }
  });

  practice.push({
    title: 'Second Largest Distinct Value in One Pass',
    level: 'Easy', tags: ['arrays', 'single pass', 'loops'], companies: ['Amazon', 'Flipkart', 'Zoho'],
    statement: `<p>Given an array of non-negative ints, return the second largest <b>distinct</b> value, or −1 if it does not exist. Use one pass and O(1) extra space.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>6</sup>; 0 ≤ a[i] ≤ 10<sup>9</sup>`,
    example: `<p>[12, 35, 1, 10, 34, 1] → ${H.c('g', '34')}. [10, 10, 10] → ${H.c('r', '-1')} (only one distinct value). [5, 9] → 5.</p>`,
    brute: { why: `<p>Sort a copy and walk from the end to the first value smaller than the max: O(n log n) time and O(n) extra memory, for a problem one scan can solve.</p>`, code: `
static int secondLargestSort(int[] a) {
    int[] c = a.clone();
    Arrays.sort(c);
    for (int i = c.length - 2; i >= 0; i--)
        if (c[i] != c[c.length - 1]) return c[i];
    return -1;
}` },
    mcq: { q: 'You see a value equal to the current largest. What should happen?', options: ['Make it the second largest', 'Ignore it (duplicates are not distinct)', 'Reset both trackers', 'Return immediately'], answer: 1, explain: 'The question asks for distinct values; a repeat of the max is not a new candidate for second place.' },
    hints: [`<p>Hint 1: keep two trackers, <code>first</code> and <code>second</code>, both starting at −1 (valid because values are non-negative).</p>`, `<p>Hint 2: if x &gt; first: second = first, first = x. Else if x &lt; first and x &gt; second: second = x.</p>`, `<p>Hint 3: the strict <code>x &lt; first</code> check is what skips duplicates of the max. All equal → second stays −1.</p>`],
    solution: {
      approach: `<p>One scan with two trackers. A new maximum pushes the old one down to second place; a value strictly between second and first replaces second.</p>`,
      code: `
class SecondLargest {
    static int secondLargest(int[] a) {
        int first = -1, second = -1;
        for (int x : a) {
            if (x > first) {
                second = first;     // old champion becomes runner-up
                first = x;
            } else if (x < first && x > second) {
                second = x;         // new runner-up (strictly smaller than first)
            }
        }
        return second;
    }
    public static void main(String[] args) {
        System.out.println(secondLargest(new int[]{12, 35, 1, 10, 34, 1}));  // 34
        System.out.println(secondLargest(new int[]{10, 10, 10}));            // -1
    }
}`,
      dry: { head: ['x', 'first', 'second'], rows: [['12', '12', '-1'], ['35', '35', '12'], ['1', '35', '12'], ['10', '35', '12'], ['34', '35', H.c('g', '34')], ['1', '35', '34']] },
      complexity: `<p>O(n) time, O(1) space.</p>`,
      followUps: ['Allow negative values (use <code>long</code> sentinels or a boolean "found" flag).', 'Return the k-th largest distinct value for small k.']
    }
  });

  practice.push({
    title: 'Count Vowels, Consonants, Digits and Spaces',
    level: 'Easy', tags: ['String', 'switch', 'Character'], companies: ['Wipro', 'HCL', 'Cognizant'],
    statement: `<p>Return <code>int[]{vowels, consonants, digits, spaces}</code> for a String. Letters are counted case-insensitively (a, e, i, o, u are vowels; other English letters are consonants). Other symbols are ignored.</p>`,
    constraints: `0 ≤ s.length() ≤ 10<sup>5</sup>; ASCII text`,
    example: `<p>"Hello World 42" → vowels e, o, o = ${H.c('g', '3')}; consonants H, l, l, W, r, l, d = ${H.c('b', '7')}; digits 4, 2 = ${H.c('y', '2')}; spaces = 2 → <b>[3, 7, 2, 2]</b>.</p>`,
    brute: { why: `<p>Calling <code>"aeiouAEIOU".contains(String.valueOf(c))</code> for every char creates a new String per character and scans the vowel list each time — fine for short text, wasteful for 10<sup>5</sup> characters, and still needs separate checks for digits and spaces.</p>`, code: `
static int[] countBrute(String s) {
    int v = 0, c = 0, d = 0, sp = 0;
    for (int i = 0; i < s.length(); i++) {
        String ch = String.valueOf(s.charAt(i));          // a new String every iteration
        if ("aeiouAEIOU".contains(ch)) v++;
        else if (ch.matches("[a-zA-Z]")) c++;             // regex per character: slow
        else if (ch.matches("[0-9]")) d++;
        else if (ch.equals(" ")) sp++;
    }
    return new int[]{v, c, d, sp};
}` },
    mcq: { q: 'Which is the cleanest way to test "is this char a vowel" once lower-cased?', options: ['A chain of five == comparisons with ||', 'A switch with <code>case \'a\', \'e\', \'i\', \'o\', \'u\' -&gt;</code>', 'A regex', 'A HashSet&lt;String&gt;'], answer: 1, explain: 'A switch on char with grouped labels reads clearly and compiles to a fast jump; no objects are created.' },
    hints: [`<p>Hint 1: lower-case each char once (<code>Character.toLowerCase(c)</code>) so you only list five vowels.</p>`, `<p>Hint 2: a switch handles vowels; in <code>default</code> use <code>Character.isLetter</code>, <code>isDigit</code>, <code>c == ' '</code>.</p>`, `<p>Hint 3: careful: <code>Character.isLetter</code> is true for non-English letters too (é, ß). The statement says ASCII, but check <code>ch &gt;= 'a' &amp;&amp; ch &lt;= 'z'</code> to be strict.</p>`],
    solution: {
      approach: `<p>One loop over the chars, one switch on the lower-cased char. Vowel labels are grouped; everything else is classified in <code>default</code>.</p>`,
      code: `
class CharCounter {
    static int[] count(String s) {
        int vowels = 0, consonants = 0, digits = 0, spaces = 0;
        for (int i = 0; i < s.length(); i++) {
            char ch = Character.toLowerCase(s.charAt(i));
            switch (ch) {
                case 'a', 'e', 'i', 'o', 'u' -> vowels++;
                case ' ' -> spaces++;
                default -> {
                    if (ch >= 'a' && ch <= 'z') consonants++;
                    else if (ch >= '0' && ch <= '9') digits++;
                    // anything else (punctuation) is ignored
                }
            }
        }
        return new int[]{vowels, consonants, digits, spaces};
    }
    public static void main(String[] args) {
        System.out.println(Arrays.toString(count("Hello World 42")));  // [3, 7, 2, 2]
    }
}`,
      dry: { head: ['char', 'lower', 'branch', 'counts [v, c, d, s]'], rows: [['H', 'h', 'consonant', '[0, 1, 0, 0]'], ['e', 'e', 'vowel', '[1, 1, 0, 0]'], ['␣', '␣', 'space', '…'], ['4', '4', 'digit', '…'], ['end', '', '', H.c('g', '[3, 7, 2, 2]')]] },
      complexity: `<p>O(n) time, O(1) space.</p>`,
      followUps: ['Also return the most frequent letter (int[26] counts).', 'Handle full Unicode letters with <code>Character.isLetter</code> and code points.']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Predict the Output: The Pass-by-Value Puzzle',
    level: 'Medium', tags: ['predict the output', 'pass-by-value', 'references', 'immutability'], companies: ['Goldman Sachs', 'Morgan Stanley', 'Oracle'],
    statement: `<p>What does this print? Explain each of the four values.</p>
<pre><code>static void change(int[] a, int b, StringBuilder sb, String s) {
    a[0]++;
    b++;
    sb.append("!");
    s += "!";
    a = new int[]{100};
    a[0]++;
}
// in main:
int[] arr = {1};
int n = 1;
StringBuilder sb = new StringBuilder("hi");
String s = "hi";
change(arr, n, sb, s);
System.out.println(arr[0] + " " + n + " " + sb + " " + s);</code></pre>`,
    constraints: `Standard Java semantics; no threads involved`,
    example: `<p>The answer has four parts. Hint for the first: <code>a[0]++</code> happens <b>before</b> <code>a</code> is reassigned, while it still points at the caller's array.</p>`,
    brute: { why: `<p>"Objects are passed by reference, so everything changes" gives <code>101 2 hi! hi!</code> — wrong on three of four values. "Everything is a copy, nothing changes" gives <code>1 1 hi hi</code> — wrong on two. You need the precise rule: the <b>reference</b> is copied.</p>`, code: `
class PuzzleTrace {
    static void change(int[] a, int b, StringBuilder sb, String s) {
        a[0]++;               System.out.println("a[0] in method = " + a[0]);
        b++;                  System.out.println("b in method = " + b);
        sb.append("!");       System.out.println("sb in method = " + sb);
        s += "!";             System.out.println("s in method = " + s);
        a = new int[]{100};
        a[0]++;               System.out.println("new a[0] = " + a[0]);
    }
    public static void main(String[] args) {
        int[] arr = {1};
        change(arr, 1, new StringBuilder("hi"), "hi");   // trace prints show what each copy sees
        System.out.println("caller's arr[0] = " + arr[0]);
    }
}` },
    mcq: { q: 'After <code>a = new int[]{100}</code> inside the method, what does the caller\'s <code>arr</code> point to?', options: ['The new array {100}', 'Still the original array (now {2})', 'null', 'It depends on the JVM'], answer: 1, explain: 'Reassigning a parameter changes only the method\'s copy of the reference. The caller\'s variable is untouched.' },
    hints: [`<p>Hint 1: draw two boxes for every parameter: the caller's variable and the method's copy. Arrows for references.</p>`, `<p>Hint 2: <code>a[0]++</code> and <code>sb.append</code> go <b>through</b> the arrow to the shared object. <code>b++</code>, <code>s += "!"</code> and <code>a = new …</code> only change the method's own box.</p>`, `<p>Hint 3: String is immutable: <code>s += "!"</code> builds a new String and points the copy at it. The last <code>a[0]++</code> changes the new array nobody else sees.</p>`],
    solution: {
      approach: `<p>Java copies every argument's value. For the array and the StringBuilder, the copied value is a reference to the caller's object, so mutations through it are visible. Primitive <code>b</code>, the String reassignment, and the array reassignment only affect the method's copies.</p>`,
      code: `
class Puzzle {
    static void change(int[] a, int b, StringBuilder sb, String s) {
        a[0]++;               // caller's array: 1 -> 2  (visible)
        b++;                  // copy of n: 1 -> 2      (invisible)
        sb.append("!");       // caller's builder: "hi!" (visible)
        s += "!";             // new String for the copy (invisible)
        a = new int[]{100};   // copy now points elsewhere
        a[0]++;               // new array: 101         (invisible)
    }
    public static void main(String[] args) {
        int[] arr = {1};
        int n = 1;
        StringBuilder sb = new StringBuilder("hi");
        String s = "hi";
        change(arr, n, sb, s);
        System.out.println(arr[0] + " " + n + " " + sb + " " + s);   // 2 1 hi! hi
    }
}`,
      dry: { head: ['statement', 'arr (caller)', 'n', 'sb', 's'], rows: [['before call', '{1}', '1', 'hi', 'hi'], ['a[0]++', H.c('g', '{2}'), '1', 'hi', 'hi'], ['b++', '{2}', '1', 'hi', 'hi'], ['sb.append("!")', '{2}', '1', H.c('g', 'hi!'), 'hi'], ['s += "!"', '{2}', '1', 'hi!', 'hi'], ['a = new …; a[0]++', '{2}', '1', 'hi!', 'hi']] },
      complexity: `<p>O(1). The output is <b>2 1 hi! hi</b>.</p>`,
      followUps: ['How would you let a method "return" a changed int to the caller? (return it, or use an int[1] / AtomicInteger holder)', 'What if <code>change</code> did <code>sb = new StringBuilder("bye")</code> before appending?']
    }
  });

  practice.push({
    title: 'Spiral Order of a Matrix',
    level: 'Medium', tags: ['2D array', 'boundaries', 'simulation'], companies: ['Microsoft', 'Amazon', 'Apple'],
    statement: `<p>Given an m × n matrix, return all elements in <b>clockwise spiral order</b>, starting at the top-left corner.</p>`,
    constraints: `1 ≤ m, n ≤ 100; matrix is rectangular`,
    example: `<p>[[1, 2, 3], [4, 5, 6], [7, 8, 9]] → ${H.c('g', '[1, 2, 3, 6, 9, 8, 7, 4, 5]')}. Go right along the top row, down the right column, left along the bottom, up the left column, then repeat one layer in.</p>`,
    brute: { why: `<p>Walk with a direction vector and a <code>visited[][]</code> matrix, turning right whenever the next cell is outside or already visited. Correct and intuitive, but needs O(m·n) extra memory for visited and more bounds checks per step.</p>`, code: `
static List<Integer> spiralVisited(int[][] m) {
    int R = m.length, C = m[0].length;
    boolean[][] seen = new boolean[R][C];
    int[] dr = {0, 1, 0, -1}, dc = {1, 0, -1, 0};      // right, down, left, up
    List<Integer> out = new ArrayList<>();
    int r = 0, c = 0, d = 0;
    for (int k = 0; k < R * C; k++) {
        out.add(m[r][c]);
        seen[r][c] = true;
        int nr = r + dr[d], nc = c + dc[d];
        if (nr < 0 || nr >= R || nc < 0 || nc >= C || seen[nr][nc]) {
            d = (d + 1) % 4;                            // turn right
            nr = r + dr[d]; nc = c + dc[d];
        }
        r = nr; c = nc;
    }
    return out;
}` },
    mcq: { q: 'With four boundaries top, bottom, left, right — when does the loop stop?', options: ['When top == bottom', 'When top &gt; bottom or left &gt; right', 'After m + n steps', 'When the output has m elements'], answer: 1, explain: 'Each finished side shrinks a boundary. Once the boundaries cross, there is no unvisited layer left.' },
    hints: [`<p>Hint 1: keep four walls: <code>top = 0, bottom = m − 1, left = 0, right = n − 1</code>. Each side you walk shrinks one wall.</p>`, `<p>Hint 2: right along top (then top++), down along right (right--), left along bottom (bottom--), up along left (left++).</p>`, `<p>Hint 3: for a single remaining row or column, the "left along bottom" and "up along left" legs would repeat cells — guard them with <code>if (top &lt;= bottom)</code> and <code>if (left &lt;= right)</code>.</p>`],
    solution: {
      approach: `<p>Peel the matrix layer by layer using four shrinking boundaries. Guards on the third and fourth legs prevent double-counting when only one row or column remains.</p>`,
      code: `
class Spiral {
    static List<Integer> spiral(int[][] m) {
        List<Integer> out = new ArrayList<>();
        int top = 0, bottom = m.length - 1, left = 0, right = m[0].length - 1;
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) out.add(m[top][c]);      // → along the top
            top++;
            for (int r = top; r <= bottom; r++) out.add(m[r][right]);    // ↓ down the right side
            right--;
            if (top <= bottom) {                                         // a row is still left
                for (int c = right; c >= left; c--) out.add(m[bottom][c]); // ← along the bottom
                bottom--;
            }
            if (left <= right) {                                         // a column is still left
                for (int r = bottom; r >= top; r--) out.add(m[r][left]);   // ↑ up the left side
                left++;
            }
        }
        return out;
    }
    public static void main(String[] args) {
        System.out.println(spiral(new int[][]{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}}));   // [1, 2, 3, 6, 9, 8, 7, 4, 5]
        System.out.println(spiral(new int[][]{{1, 2, 3, 4}, {5, 6, 7, 8}}));        // [1, 2, 3, 4, 8, 7, 6, 5]
    }
}`,
      dry: { head: ['leg', 'cells', 'walls after (t, b, l, r)'], rows: [['→ top', '1 2 3', '1, 2, 0, 2'], ['↓ right', '6 9', '1, 2, 0, 1'], ['← bottom', '8 7', '1, 1, 0, 1'], ['↑ left', '4', '1, 1, 1, 1'], ['→ top (then ↓ is empty)', '5', '2, 1, 1, 0 → stop']] },
      complexity: `<p>O(m·n) time (each cell added once), O(1) extra space besides the output.</p>`,
      followUps: ['Generate an n × n matrix filled 1..n² in spiral order.', 'Return the spiral counter-clockwise.']
    }
  });

  practice.push({
    title: "Pascal's Triangle as a Jagged Array",
    level: 'Medium', tags: ['jagged array', 'nested loops', 'overflow'], companies: ['Google', 'Adobe'],
    statement: `<p>Return the first <code>n</code> rows of Pascal's triangle as an <code>int[][]</code> where row i has exactly i + 1 elements. Each row starts and ends with 1; every inner element is the sum of the two elements above it.</p>`,
    constraints: `1 ≤ n ≤ 30 (all values fit in int)`,
    example: `<p>n = 5 → [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, ${H.c('g', '4')}, 6, 4, 1]] — the green 4 = 1 + 3 from the row above.</p>`,
    brute: { why: `<p>Compute every entry independently with C(i, j) = i! / (j!(i − j)!). It recomputes factorials over and over, and factorials overflow <code>long</code> beyond 20!, so rows past 20 come out wrong even though the entries themselves are small.</p>`, code: `
static long fact(int k) { long f = 1; for (int i = 2; i <= k; i++) f *= i; return f; }   // overflows for k > 20
static int[][] pascalFactorial(int n) {
    int[][] t = new int[n][];
    for (int i = 0; i < n; i++) {
        t[i] = new int[i + 1];
        for (int j = 0; j <= i; j++) t[i][j] = (int) (fact(i) / (fact(j) * fact(i - j)));
    }
    return t;
}` },
    mcq: { q: 'How should you allocate the triangle?', options: ['new int[n][n] and ignore the extra cells', 'new int[n][] then t[i] = new int[i + 1] for each row', 'An int[] of size n²', 'An ArrayList only'], answer: 1, explain: 'A jagged array stores exactly the needed cells, and t[i].length tells each row\'s size naturally.' },
    hints: [`<p>Hint 1: each row only depends on the previous row — build top-down.</p>`, `<p>Hint 2: <code>t[i] = new int[i + 1]; t[i][0] = t[i][i] = 1;</code></p>`, `<p>Hint 3: inner loop <code>for (int j = 1; j &lt; i; j++) t[i][j] = t[i - 1][j - 1] + t[i - 1][j];</code>. Row 0 has a single 1 — the inner loop runs zero times.</p>`],
    solution: {
      approach: `<p>Allocate a jagged array, set the two border 1s of each row, and fill inner cells from the row above. Only additions — no overflow for n ≤ 30 (max entry C(29,14) = 77 558 760).</p>`,
      code: `
class Pascal {
    static int[][] generate(int n) {
        int[][] t = new int[n][];
        for (int i = 0; i < n; i++) {
            t[i] = new int[i + 1];
            t[i][0] = 1;
            t[i][i] = 1;
            for (int j = 1; j < i; j++) t[i][j] = t[i - 1][j - 1] + t[i - 1][j];
        }
        return t;
    }
    public static void main(String[] args) {
        System.out.println(Arrays.deepToString(generate(5)));  // [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, 4, 6, 4, 1]]
    }
}`,
      dry: { head: ['i', 'row created', 'inner cells', 'row'], rows: [['0', 'int[1]', '—', '[1]'], ['1', 'int[2]', '—', '[1, 1]'], ['2', 'int[3]', 't[2][1] = 1 + 1', '[1, 2, 1]'], ['3', 'int[4]', '1+2, 2+1', '[1, 3, 3, 1]']] },
      complexity: `<p>O(n²) time and space — exactly the number of cells in the output.</p>`,
      followUps: ['Return only row k using O(k) memory (update one array from right to left).', 'Print the triangle centred with String.repeat for the padding.']
    }
  });

  practice.push({
    title: 'Rotate an Array Right by k (In Place)',
    level: 'Medium', tags: ['arrays', 'reverse trick', 'modulo'], companies: ['Microsoft', 'Amazon', 'Bloomberg'],
    statement: `<p>Rotate <code>int[] a</code> to the right by k steps in place: every element moves k positions right, wrapping around. Use O(1) extra space.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup>; 0 ≤ k ≤ 10<sup>9</sup>`,
    example: `<p>a = [1, 2, 3, 4, 5, 6, 7], k = 3 → ${H.c('g', '[5, 6, 7, 1, 2, 3, 4]')}. k = 10 is the same as k = 3 (10 % 7).</p>`,
    brute: { why: `<p>Rotate by one position k times: each single rotation shifts all n elements, so O(n·k) — with k up to 10<sup>9</sup> that never finishes. Even after <code>k %= n</code> it is O(n²) in the worst case.</p>`, code: `
static void rotateSlow(int[] a, int k) {
    k %= a.length;
    for (int step = 0; step < k; step++) {
        int last = a[a.length - 1];
        for (int i = a.length - 1; i > 0; i--) a[i] = a[i - 1];   // shift everything right by one
        a[0] = last;
    }
}` },
    mcq: { q: 'Which three reversals rotate right by k?', options: ['Reverse first k, reverse rest, reverse all', 'Reverse all, reverse first k, reverse the remaining n − k', 'Reverse all three times', 'Reverse last k only'], answer: 1, explain: 'Reversing everything puts the last k elements in front (backwards); reversing each part fixes their internal order.' },
    hints: [`<p>Hint 1: first reduce <code>k %= n</code> — rotating by n changes nothing.</p>`, `<p>Hint 2: [1 2 3 4 5 6 7] reversed is [7 6 5 4 3 2 1]. The first 3 are the elements that must end up in front, just backwards.</p>`, `<p>Hint 3: write a helper <code>reverse(a, lo, hi)</code> with two pointers. Recipe: reverse(0, n−1); reverse(0, k−1); reverse(k, n−1).</p>`],
    solution: {
      approach: `<p>Three in-place reversals with one helper. Each element is swapped at most twice, so it is linear and needs no extra array.</p>`,
      code: `
class RotateArray {
    static void rotate(int[] a, int k) {
        int n = a.length;
        k %= n;                       // k can be huge
        reverse(a, 0, n - 1);         // [7 6 5 4 3 2 1]
        reverse(a, 0, k - 1);         // [5 6 7 | 4 3 2 1]
        reverse(a, k, n - 1);         // [5 6 7 | 1 2 3 4]
    }
    static void reverse(int[] a, int lo, int hi) {
        while (lo < hi) {
            int t = a[lo]; a[lo] = a[hi]; a[hi] = t;
            lo++; hi--;
        }
    }
    public static void main(String[] args) {
        int[] a = {1, 2, 3, 4, 5, 6, 7};
        rotate(a, 10);
        System.out.println(Arrays.toString(a));   // [5, 6, 7, 1, 2, 3, 4]
    }
}`,
      alt: [{ lang: 'python', code: `def rotate(a, k):\n    n = len(a)\n    k %= n\n    a[:] = a[-k:] + a[:-k] if k else a\n\na = [1, 2, 3, 4, 5, 6, 7]\nrotate(a, 10)\nprint(a)`, run: true }],
      dry: { head: ['step', 'array'], rows: [['start (k = 10 % 7 = 3)', '[1, 2, 3, 4, 5, 6, 7]'], ['reverse all', '[7, 6, 5, 4, 3, 2, 1]'], ['reverse 0..2', '[5, 6, 7, 4, 3, 2, 1]'], ['reverse 3..6', H.c('g', '[5, 6, 7, 1, 2, 3, 4]')]] },
      complexity: `<p>O(n) time, O(1) extra space. (A copy-based version with <code>System.arraycopy</code> is also O(n) but uses O(n) memory.)</p>`,
      followUps: ['Rotate left by k.', 'Do it with the "cyclic replacements" method (gcd(n, k) cycles).']
    }
  });

  practice.push({
    title: 'Reverse the Words in a Sentence',
    level: 'Medium', tags: ['String', 'split', 'StringBuilder'], companies: ['Microsoft', 'Amazon', 'Walmart'],
    statement: `<p>Given a sentence that may have leading, trailing and multiple spaces between words, return the words in <b>reverse order</b> separated by exactly one space, with no leading or trailing spaces.</p>`,
    constraints: `1 ≤ s.length() ≤ 10<sup>4</sup>; at least one word; words are runs of non-space characters`,
    example: `<p>"␣␣the sky␣␣is blue␣" → ${H.c('g', '"blue is sky the"')}. The extra spaces vanish; each word keeps its own letters in order.</p>`,
    brute: { why: `<p>Scan characters by hand and glue each word in front of the result with <code>result = word + " " + result</code>. Each prepend copies the whole result so far: O(n²) characters copied for long inputs, and it is easy to leave stray spaces.</p>`, code: `
static String reverseWordsSlow(String s) {
    String result = "", word = "";
    for (int i = 0; i <= s.length(); i++) {
        char c = i < s.length() ? s.charAt(i) : ' ';    // treat the end like a space
        if (c != ' ') word += c;                         // O(len) copy each time
        else if (!word.isEmpty()) {
            result = result.isEmpty() ? word : word + " " + result;
            word = "";
        }
    }
    return result;
}` },
    mcq: { q: 'Why <code>split("\\\\s+")</code> on the <b>stripped</b> string rather than <code>split(" ")</code>?', options: ['split(" ") is slower', 'split(" ") produces empty strings between consecutive spaces (and a leading empty string)', 'split(" ") removes words', 'There is no difference'], answer: 1, explain: '"a  b".split(" ") gives [a, "", b]. "\\s+" treats any run of whitespace as one separator; stripping first avoids a leading empty piece.' },
    hints: [`<p>Hint 1: three steps: tidy the ends, cut into words, glue them back in reverse.</p>`, `<p>Hint 2: <code>String[] w = s.strip().split("\\\\s+");</code></p>`, `<p>Hint 3: loop from the last word to the first, appending to a StringBuilder with a space between (not after the last). Or reverse the array and use <code>String.join(" ", w)</code>.</p>`],
    solution: {
      approach: `<p>Strip, split on whitespace runs, then build the answer backwards with a StringBuilder (O(n) total).</p>`,
      code: `
class ReverseWords {
    static String reverseWords(String s) {
        String[] words = s.strip().split("\\\\s+");
        StringBuilder sb = new StringBuilder(s.length());
        for (int i = words.length - 1; i >= 0; i--) {
            sb.append(words[i]);
            if (i > 0) sb.append(' ');          // single space between words, none at the end
        }
        return sb.toString();
    }
    public static void main(String[] args) {
        System.out.println("[" + reverseWords("  the sky  is blue ") + "]");   // [blue is sky the]
        System.out.println("[" + reverseWords("hello") + "]");                 // [hello]
    }
}`,
      alt: [{ lang: 'python', code: `def reverse_words(s):\n    return " ".join(reversed(s.split()))\n\nprint("[" + reverse_words("  the sky  is blue ") + "]")`, run: true }],
      dry: { head: ['step', 'value'], rows: [['strip', '"the sky  is blue"'], ['split("\\\\s+")', '[the, sky, is, blue]'], ['append from the end', 'blue → blue is → blue is sky → blue is sky the']] },
      complexity: `<p>O(n) time and O(n) space.</p>`,
      followUps: ['Do it in place on a <code>char[]</code>: reverse the whole array, then reverse each word.', 'Keep the original spacing between words.']
    }
  });

  practice.push({
    title: 'Predict the Output: Labels, continue and switch in Loops',
    level: 'Medium', tags: ['predict the output', 'labels', 'break', 'continue', 'switch'], companies: ['Infosys', 'Accenture', 'SAP'],
    statement: `<p>What do these two snippets print?</p>
<pre><code>// Snippet A
outer:
for (int i = 1; i &lt;= 3; i++) {
    for (int j = 1; j &lt;= 3; j++) {
        if (j == 2) continue outer;
        if (i == 3) break outer;
        System.out.print(i + "" + j + " ");
    }
}
System.out.println("end");

// Snippet B
for (int k = 0; k &lt; 4; k++) {
    switch (k) {
        case 1: continue;
        case 2: break;
        default: System.out.print("k" + k + " ");
    }
    System.out.print("after" + k + " ");
}</code></pre>`,
    constraints: `Standard Java semantics`,
    example: `<p>In snippet A the very first print is <code>11</code> (i = 1, j = 1: neither condition is true). Now continue the trace.</p>`,
    brute: { why: `<p>Treating <code>continue outer</code> like a plain <code>continue</code> (only skipping one j) predicts "11 13 21 23 end"; treating <code>break</code> inside the switch as leaving the loop predicts "k0 after0" only. Both are wrong. Tracing with a table of (i, j) and the jump target of each statement avoids it.</p>`, code: `
// Instrumented trace for snippet A: log every decision
outer:
for (int i = 1; i <= 3; i++) {
    for (int j = 1; j <= 3; j++) {
        System.out.print("[i=" + i + ",j=" + j + "] ");
        if (j == 2) { System.out.print("continue-outer "); continue outer; }
        if (i == 3) { System.out.print("break-outer "); break outer; }
        System.out.print(i + "" + j + " ");
    }
}
System.out.println("end");` },
    mcq: { q: 'In snippet B, what does <code>break</code> in <code>case 2</code> leave?', options: ['The for loop', 'The switch only', 'The method', 'Nothing — it is ignored'], answer: 1, explain: 'break exits the innermost enclosing switch or loop; here that is the switch, so "after2" is still printed.' },
    hints: [`<p>Hint 1: <code>continue outer</code> abandons the <b>whole inner loop</b> and jumps to <code>i++</code> of the outer loop.</p>`, `<p>Hint 2: in snippet A, j never reaches 3 (j == 2 always jumps), and at i = 3 the first iteration breaks out before printing.</p>`, `<p>Hint 3: in snippet B, <code>continue</code> inside a switch belongs to the loop (skips "after1"); <code>break</code> belongs to the switch. Tabulate k = 0..3.</p>`],
    solution: {
      approach: `<p>Track exactly where each jump lands. A: prints 11 and 21, then breaks at i = 3. B: k = 1 skips the rest of the loop body; k = 2 only leaves the switch.</p>`,
      code: `
outer:
for (int i = 1; i <= 3; i++) {
    for (int j = 1; j <= 3; j++) {
        if (j == 2) continue outer;
        if (i == 3) break outer;
        System.out.print(i + "" + j + " ");
    }
}
System.out.println("end");                       // A: 11 21 end

for (int k = 0; k < 4; k++) {
    switch (k) {
        case 1: continue;
        case 2: break;
        default: System.out.print("k" + k + " ");
    }
    System.out.print("after" + k + " ");
}
System.out.println();                            // B: k0 after0 after2 k3 after3`,
      dry: { head: ['snippet', 'state', 'event', 'printed so far'], rows: [['A', 'i=1, j=1', 'print', '11'], ['A', 'i=1, j=2', 'continue outer', '11'], ['A', 'i=2, j=1', 'print', '11 21'], ['A', 'i=3, j=1', 'break outer', '11 21 end'], ['B', 'k=1', 'continue (loop)', 'k0 after0'], ['B', 'k=2', 'break (switch)', 'k0 after0 after2']] },
      complexity: `<p>O(1) — a tracing exercise. Answers: <b>A → "11 21 end"</b>, <b>B → "k0 after0 after2 k3 after3"</b>.</p>`,
      followUps: ['Rewrite snippet B with an arrow switch — can you still use <code>continue</code> inside it? (Yes in a switch statement with arrows; not inside a switch expression.)', 'Rewrite snippet A without labels.']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Predict the Output: The Overload Resolution Gauntlet',
    level: 'Hard', tags: ['predict the output', 'overloading', 'varargs', 'boxing'], companies: ['Oracle', 'Goldman Sachs', 'JP Morgan'],
    statement: `<p>Given these overloads, what does each call print?</p>
<pre><code>static String m(int x)     { return "int"; }
static String m(long x)    { return "long"; }
static String m(Integer x) { return "Integer"; }
static String m(Object x)  { return "Object"; }
static String m(int... x)  { return "int..."; }

m((byte) 1);  m('c');  m(1L);  m(1.5f);
m(Integer.valueOf(1));  m();  m(1, 2);  m(new int[]{1});</code></pre>
<p>Bonus: does <code>m(null)</code> compile?</p>`,
    constraints: `Java 21 compiler rules (JLS §15.12.2)`,
    example: `<p><code>m((byte) 1)</code> → ${H.c('g', 'int')}: in phase 1 both m(int) and m(long) accept a byte by widening; m(int) is more specific because an int can be passed to m(long) but not the reverse.</p>`,
    brute: { why: `<p>Guessing "closest looking type" fails on <code>m(1.5f)</code> (people say long or int), <code>m(new int[]{1})</code> (people say Object) and <code>m(null)</code>. The reliable method is mechanical: phase 1 (widening only) → phase 2 (+boxing) → phase 3 (+varargs), then "most specific" among the survivors.</p>`, code: `
class OverloadProbe {
    static String m(int x)     { return "int"; }
    static String m(long x)    { return "long"; }
    static String m(Integer x) { return "Integer"; }
    static String m(Object x)  { return "Object"; }
    static String m(int... x)  { return "int..."; }
    public static void main(String[] args) {
        // When you CAN run code: print each call next to its argument type
        Object[][] calls = { {"(byte) 1", m((byte) 1)}, {"'c'", m('c')}, {"1.5f", m(1.5f)} };
        for (Object[] c : calls) System.out.println(c[0] + " -> " + c[1]);
    }
}` },
    mcq: { q: 'Why does <code>m(1.5f)</code> print "Object"?', options: ['float widens to long', 'Phase 1 fails (float → int/long is narrowing), phase 2 boxes to Float, and Float is an Object', 'Varargs accepts any number', 'Object is always the fallback'], answer: 1, explain: 'No primitive overload accepts a float without narrowing; in phase 2 boxing makes a Float, which only m(Object) accepts.' },
    hints: [`<p>Hint 1: phase 1 allows only identity and widening. byte and char widen to int and long; float widens only to double.</p>`, `<p>Hint 2: in phases 1–2 the varargs method behaves like <code>m(int[] x)</code>, so <code>m(new int[]{1})</code> matches it exactly — and int[] is more specific than Object.</p>`, `<p>Hint 3: <code>m()</code> and <code>m(1, 2)</code> have the wrong arity for every fixed method, so only phase 3 (varargs) can serve them. <code>m(null)</code>: Integer, Object and int[] all accept null; Integer vs int[] — neither is more specific → ambiguous.</p>`],
    solution: {
      approach: `<p>Apply the three phases and the most-specific rule to each call. Results: int, int, long, Object, Integer, int..., int..., int...; and <code>m(null)</code> is a compile error ("reference to m is ambiguous").</p>`,
      code: `
class Overload {
    static String m(int x)     { return "int"; }
    static String m(long x)    { return "long"; }
    static String m(Integer x) { return "Integer"; }
    static String m(Object x)  { return "Object"; }
    static String m(int... x)  { return "int..."; }
    public static void main(String[] args) {
        System.out.println(m((byte) 1));           // int      phase 1: byte→int, int more specific than long
        System.out.println(m('c'));                // int      phase 1: char→int
        System.out.println(m(1L));                 // long     phase 1: exact
        System.out.println(m(1.5f));               // Object   phase 2: float→Float→Object
        System.out.println(m(Integer.valueOf(1))); // Integer  phase 1: exact, more specific than Object
        System.out.println(m());                   // int...   phase 3 only
        System.out.println(m(1, 2));               // int...   phase 3 only
        System.out.println(m(new int[]{1}));       // int...   phase 1: int[] matches int... as an array
        // m(null);  // compile error: reference to m is ambiguous (m(Integer) and m(int...))
    }
}`,
      dry: { head: ['call', 'phase that succeeds', 'candidates there', 'winner'], rows: [['m((byte) 1)', '1', 'int, long', 'int'], ["m('c')", '1', 'int, long', 'int'], ['m(1L)', '1', 'long', 'long'], ['m(1.5f)', '2', 'Object', 'Object'], ['m(Integer.valueOf(1))', '1', 'Integer, Object', 'Integer'], ['m()', '3', 'int...', 'int...'], ['m(new int[]{1})', '1', 'Object, int...', 'int...'], ['m(null)', '1', 'Integer, Object, int...', H.c('r', 'ambiguous')]] },
      complexity: `<p>Compile-time reasoning only; nothing happens at runtime to choose the overload.</p>`,
      followUps: ['Add <code>m(double x)</code>: which calls change? (m(1.5f) → double; long/int calls unchanged)', 'Remove <code>m(int x)</code>: what does <code>m(\'c\')</code> print now? (long)']
    }
  });

  practice.push({
    title: 'Implement split(char) Without Regex — Matching Java Semantics',
    level: 'Hard', tags: ['String', 'parsing', 'edge cases', 'indexOf'], companies: ['Google', 'Uber', 'Atlassian'],
    statement: `<p>Write <code>static String[] splitChar(String s, char d)</code> that returns exactly what <code>s.split(String.valueOf(d))</code> returns for a non-regex-special delimiter: cut at every occurrence of <code>d</code>, keep leading and middle empty pieces, <b>drop trailing empty pieces</b>, and return <code>[""]</code> for the empty string. Do not use any regex or <code>split</code>.</p>`,
    constraints: `0 ≤ s.length() ≤ 10<sup>6</sup>; d is a letter, digit, comma, semicolon or space`,
    example: `<p>${H.table(['s', 'result'], [['"a,b,,c,,"', '[a, b, "", c]'], ['",a"', '["", a]'], ['",,,"', H.c('y', '[] (empty array)')], ['""', H.c('y', '[""] (one empty string)')], ['"abc"', '[abc]']])}</p>`,
    brute: { why: `<p>Repeatedly find the next delimiter and chop the front off with <code>s = s.substring(idx + 1)</code>. Every chop copies the rest of the string, so a string with many delimiters costs O(n²) character copies — about 10<sup>12</sup> for n = 10<sup>6</sup>. (It also tends to get the trailing-empty rule wrong.)</p>`, code: `
static String[] splitSlow(String s, char d) {
    List<String> parts = new ArrayList<>();
    String rest = s;
    int idx;
    while ((idx = rest.indexOf(d)) >= 0) {
        parts.add(rest.substring(0, idx));
        rest = rest.substring(idx + 1);          // copies the remainder every time: O(n) each
    }
    parts.add(rest);
    int end = parts.size();
    while (end > 0 && parts.get(end - 1).isEmpty()) end--;
    if (s.isEmpty()) return new String[]{""};
    return parts.subList(0, end).toArray(new String[0]);
}` },
    mcq: { q: 'What does <code>",,,".split(",")</code> return?', options: ['[ "", "", "", "" ]', '[ "" ]', 'An empty array (length 0)', 'null'], answer: 2, explain: 'Cutting gives four empty pieces; all of them are trailing empties, and the default limit 0 removes trailing empties → length 0. Only the special case of an empty input returns [""].' },
    hints: [`<p>Hint 1: one left-to-right scan with a <code>start</code> index. At each delimiter, the piece is <code>s.substring(start, i)</code>; then <code>start = i + 1</code>. After the loop add the last piece <code>s.substring(start)</code>.</p>`, `<p>Hint 2: then drop trailing empty pieces: shrink an <code>end</code> counter while the last kept piece is empty.</p>`, `<p>Hint 3: special case first: empty input → <code>new String[]{""}</code>. Verify your version against the real <code>split</code> on: "", ",", ",a", "a,", "a,,b", ",,,".</p>`],
    solution: {
      approach: `<p>Single scan collecting pieces (each substring copied once → O(n) total), then trim trailing empties, with the empty-input special case. A test loop compares against <code>String.split</code>.</p>`,
      code: `
class SplitChar {
    static String[] splitChar(String s, char d) {
        if (s.isEmpty()) return new String[]{""};          // Java's special case
        List<String> parts = new ArrayList<>();
        int start = 0;
        for (int i = 0; i < s.length(); i++) {
            if (s.charAt(i) == d) {
                parts.add(s.substring(start, i));           // may be "" for consecutive delimiters
                start = i + 1;
            }
        }
        parts.add(s.substring(start));                      // last piece (may be "")
        int end = parts.size();
        while (end > 0 && parts.get(end - 1).isEmpty()) end--;   // drop TRAILING empties only
        return parts.subList(0, end).toArray(new String[0]);
    }
    public static void main(String[] args) {
        String[] tests = {"a,b,,c,,", ",a", ",,,", "", "abc", "a,", ",", "a,,b"};
        for (String t : tests) {
            String[] mine = splitChar(t, ',');
            String[] real = t.split(",");
            System.out.println("\\"" + t + "\\" -> " + Arrays.toString(mine) + "  same as split: " + Arrays.equals(mine, real));
        }
    }
}`,
      dry: { head: ['i', 's[i]', 'action', 'parts'], rows: [['1', ',', 'add "a", start = 2', '[a]'], ['3', ',', 'add "b", start = 4', '[a, b]'], ['4', ',', 'add "", start = 5', '[a, b, ""]'], ['6', ',', 'add "c", start = 7', '[a, b, "", c]'], ['7', ',', 'add "", start = 8', '[a, b, "", c, ""]'], ['end', '', 'add "" then trim 2 trailing', H.c('g', '[a, b, "", c]')]] },
      complexity: `<p>O(n) time (each character examined once, each piece copied once); O(n) space for the pieces.</p>`,
      followUps: ['Support the <code>limit</code> parameter: positive (at most limit pieces, last keeps the rest), negative (keep trailing empties).', 'Split on a multi-character delimiter like "::" using <code>indexOf(String, from)</code>.']
    }
  });

  practice.push({
    title: "Game of Life: Next Generation In Place",
    level: 'Hard', tags: ['2D array', 'neighbours', 'in place', 'bit tricks'], companies: ['Google', 'Dropbox', 'Snap'],
    statement: `<p>A board of cells is 1 (alive) or 0 (dead). Each cell looks at its 8 neighbours. A live cell with 2 or 3 live neighbours survives; otherwise it dies. A dead cell with exactly 3 live neighbours becomes alive. All cells update <b>simultaneously</b>. Update the board in place, using O(1) extra memory.</p>`,
    constraints: `1 ≤ rows, cols ≤ 50`,
    example: `<p>${H.table(['before', 'after'], [['0 1 0<br>0 0 1<br>1 1 1<br>0 0 0', '0 0 0<br>1 0 1<br>0 1 1<br>0 1 0']])} The cell at (1, 0) was dead with exactly 3 live neighbours (0,1), (2,0), (2,1) → it is ${H.c('g', 'born')}.</p>`,
    brute: { why: `<p>Copy the board, read neighbours from the copy and write into the original. Simple and correct (simultaneous update is preserved) but uses O(rows · cols) extra memory. Updating the original <b>without</b> a copy is the classic bug: cells already updated pollute their neighbours' counts.</p>`, code: `
static void lifeWithCopy(int[][] b) {
    int R = b.length, C = b[0].length;
    int[][] old = new int[R][];
    for (int r = 0; r < R; r++) old[r] = b[r].clone();        // deep copy, row by row
    for (int r = 0; r < R; r++)
        for (int c = 0; c < C; c++) {
            int live = 0;
            for (int dr = -1; dr <= 1; dr++)
                for (int dc = -1; dc <= 1; dc++) {
                    if (dr == 0 && dc == 0) continue;
                    int nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < R && nc >= 0 && nc < C) live += old[nr][nc];
                }
            b[r][c] = (old[r][c] == 1 && (live == 2 || live == 3)) || (old[r][c] == 0 && live == 3) ? 1 : 0;
        }
}` },
    mcq: { q: 'How can one int cell remember both its OLD and NEW state?', options: ['Use negative numbers only', 'Bit 0 = current state, bit 1 = next state; read with <code>&amp; 1</code>, finish with <code>&gt;&gt;= 1</code>', 'Store the new state in a String', 'It cannot; a copy is required'], answer: 1, explain: 'Values 0..3 encode (next, current). Neighbour counting reads only bit 0, so pending updates do not interfere; a final shift moves next into place.' },
    hints: [`<p>Hint 1: the problem is that writing new values early corrupts neighbour counts. Keep the old value readable while storing the new one.</p>`, `<p>Hint 2: cells only hold 0 or 1, so bit 1 is free. Set <code>b[r][c] |= 2</code> when the cell will be alive next round; count neighbours with <code>b[nr][nc] &amp; 1</code>.</p>`, `<p>Hint 3: neighbours via two loops <code>dr, dc ∈ {-1, 0, 1}</code> skipping (0, 0), with bounds checks. Second pass: <code>b[r][c] &gt;&gt;= 1</code>.</p>`],
    solution: {
      approach: `<p>Two passes. Pass 1 computes each cell's next state from bit 0 of its neighbours and stores it in bit 1. Pass 2 shifts every cell right by one, making the next state current.</p>`,
      code: `
class Life {
    static void gameOfLife(int[][] b) {
        int R = b.length, C = b[0].length;
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                int live = 0;
                for (int dr = -1; dr <= 1; dr++) {
                    for (int dc = -1; dc <= 1; dc++) {
                        if (dr == 0 && dc == 0) continue;               // skip the cell itself
                        int nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < R && nc >= 0 && nc < C) live += b[nr][nc] & 1; // OLD state only
                    }
                }
                boolean alive = (b[r][c] & 1) == 1;
                if ((alive && (live == 2 || live == 3)) || (!alive && live == 3)) b[r][c] |= 2;  // next = alive
            }
        }
        for (int[] row : b)
            for (int c = 0; c < C; c++) row[c] >>= 1;                   // next becomes current
    }
    public static void main(String[] args) {
        int[][] b = {{0, 1, 0}, {0, 0, 1}, {1, 1, 1}, {0, 0, 0}};
        gameOfLife(b);
        System.out.println(Arrays.deepToString(b));   // [[0, 0, 0], [1, 0, 1], [0, 1, 1], [0, 1, 0]]
    }
}`,
      dry: { head: ['cell', 'old', 'live neighbours', 'rule', 'new'], rows: [['(0,1)', '1', '1', 'under-population', '0'], ['(1,0)', '0', '3', 'birth', H.c('g', '1')], ['(1,2)', '1', '3', 'survives', '1'], ['(2,1)', '1', '3', 'survives', '1'], ['(3,1)', '0', '3', 'birth', H.c('g', '1')]] },
      complexity: `<p>O(R·C·8) = O(R·C) time; O(1) extra space.</p>`,
      followUps: ['Make the board wrap around (a torus) using modulo for neighbours.', 'The board is infinite and sparse: store live cells in a <code>HashSet</code> of coordinates.']
    }
  });

  practice.push({
    title: 'Run-Length Encoding and Decoding',
    level: 'Hard', tags: ['String', 'StringBuilder', 'parsing', 'validation'], companies: ['Amazon', 'Bloomberg', 'Cisco'],
    statement: `<p>Implement <code>encode</code>: replace each run of the same letter with the letter followed by the run length ("aaabccdddd" → "a3b1c2d4"). Implement <code>decode</code> to reverse it, supporting multi-digit counts ("x12") and throwing <code>IllegalArgumentException</code> for malformed input (starts with a digit, or a letter with no count). Input text contains letters only.</p>`,
    constraints: `0 ≤ length ≤ 10<sup>5</sup>; decoded output ≤ 10<sup>6</sup> characters`,
    example: `<p>encode("aaabccdddd") = ${H.c('g', '"a3b1c2d4"')}; encode("xxxxxxxxxxxx") = "x12"; decode("a3b1c2d4") = "aaabccdddd"; decode("3a") → ${H.c('r', 'IllegalArgumentException')}; decode("ab2") → ${H.c('r', 'IllegalArgumentException')} (a has no count).</p>`,
    brute: { why: `<p>Building results with <code>+=</code> copies the whole output for every run: O(n²) for long inputs. Decoding by assuming counts are a single digit (<code>t.charAt(i + 1) - '0'</code>) breaks on "x12". Both are classic interview pitfalls.</p>`, code: `
static String encodeSlow(String s) {
    String out = "";
    for (int i = 0; i < s.length(); ) {
        int j = i;
        while (j < s.length() && s.charAt(j) == s.charAt(i)) j++;
        out += s.charAt(i) + "" + (j - i);           // copies out each time
        i = j;
    }
    return out;
}
static String decodeSingleDigit(String t) {           // WRONG for counts >= 10
    String out = "";
    for (int i = 0; i + 1 < t.length(); i += 2)
        out += String.valueOf(t.charAt(i)).repeat(t.charAt(i + 1) - '0');
    return out;
}` },
    mcq: { q: 'Decoding "x12": how do you read a number that has several digits?', options: ['Read one digit only', 'count = count * 10 + (digit − \'0\') while the next char is a digit', 'Integer.parseInt of the whole string', 'Count the digits and multiply'], answer: 1, explain: 'Accumulating digit by digit builds 1, then 1·10 + 2 = 12, and stops at the next letter.' },
    hints: [`<p>Hint 1 (encode): find each run with two pointers i (start) and j (first index after the run). The run length is j − i.</p>`, `<p>Hint 2 (decode): read a letter, then loop over following digits accumulating <code>count = count * 10 + d</code>. Zero digits read → malformed.</p>`, `<p>Hint 3: use StringBuilder for both directions; <code>String.valueOf(ch).repeat(count)</code> or a loop of appends. Empty input → empty output.</p>`],
    solution: {
      approach: `<p>Encode: scan runs with two pointers and append letter + length to a StringBuilder. Decode: a small parser — expect a letter, then one or more digits, append the letter count times; anything else throws.</p>`,
      code: `
class RunLength {
    static String encode(String s) {
        StringBuilder sb = new StringBuilder();
        int i = 0;
        while (i < s.length()) {
            char ch = s.charAt(i);
            int j = i;
            while (j < s.length() && s.charAt(j) == ch) j++;   // j = first index after the run
            sb.append(ch).append(j - i);
            i = j;
        }
        return sb.toString();
    }

    static String decode(String t) {
        StringBuilder sb = new StringBuilder();
        int i = 0;
        while (i < t.length()) {
            char ch = t.charAt(i++);
            if (!Character.isLetter(ch)) throw new IllegalArgumentException("expected a letter at index " + (i - 1));
            int count = 0, digitsStart = i;
            while (i < t.length() && Character.isDigit(t.charAt(i))) {
                count = count * 10 + (t.charAt(i) - '0');   // multi-digit counts
                i++;
            }
            if (i == digitsStart) throw new IllegalArgumentException("missing count after '" + ch + "'");
            for (int k = 0; k < count; k++) sb.append(ch);
        }
        return sb.toString();
    }

    public static void main(String[] args) {
        String e = encode("aaabccdddd");
        System.out.println(e + " " + decode(e));              // a3b1c2d4 aaabccdddd
        System.out.println(encode("xxxxxxxxxxxx"));            // x12
        System.out.println(decode("x12").length());            // 12
        try { decode("ab2"); } catch (IllegalArgumentException ex) { System.out.println(ex.getMessage()); } // missing count after 'a'
    }
}`,
      dry: { head: ['phase', 'i', 'j / count', 'output so far'], rows: [['encode', '0', 'j = 3 (aaa)', 'a3'], ['encode', '3', 'j = 4 (b)', 'a3b1'], ['encode', '4', 'j = 6 (cc)', 'a3b1c2'], ['encode', '6', 'j = 10 (dddd)', 'a3b1c2d4'], ['decode "x12"', '1', 'count = 1 → 12', 'x × 12']] },
      complexity: `<p>Encode O(n); decode O(n + output length); both use O(output) space.</p>`,
      followUps: ['Only encode runs longer than 1 ("aaab" → "a3b"); how does decode change?', 'Encode digits in the input too (needs an escape scheme).']
    }
  });

  practice.push({
    title: 'Predict the Output: Loop, Increment and Overflow Traps',
    level: 'Hard', tags: ['predict the output', 'loops', 'overflow', 'increment'], companies: ['Oracle', 'SAP', 'Qualcomm'],
    statement: `<p>What does this print? Six lines.</p>
<pre><code>int i = 0;
while (i++ &lt; 3) System.out.print(i + " ");
System.out.println("| i=" + i);

int k = 5;
do { k -= 2; } while (k &gt; 0);
System.out.println(k);

int count = 0;
for (int j = 0; j &lt; 10; j += 3) count++;
System.out.println(count);

short s = Short.MAX_VALUE;
s++;
System.out.println(s);

int x = 10;
x += x++ + ++x;
System.out.println(x);

int bad = 0;
for (int t = 0; t &lt; 3; t++) bad += Integer.MAX_VALUE;
System.out.println(bad);</code></pre>`,
    constraints: `Short.MAX_VALUE = 32767; Integer.MAX_VALUE = 2147483647`,
    example: `<p>Line 2: k goes 5 → 3 → 1 → ${H.c('g', '-1')}; the check <code>k &gt; 0</code> happens after each subtraction, so the loop stops only once k is −1.</p>`,
    brute: { why: `<p>Intuition says "1 2 3 | i=3", "1", "3", "32768", "22" and "6442450941". Five of those six are wrong. Each line hides one rule: post-increment in a condition, do-while checks last, a stride loop counts its starting value, small-type overflow, compound assignment saving the old left value, and silent int overflow.</p>`, code: `
// When you can run code: print intermediate values to see each rule
int bad = 0;
for (int t = 0; t < 3; t++) {
    bad += Integer.MAX_VALUE;
    System.out.println("after t=" + t + ": " + bad);   // 2147483647, -2, 2147483645
}
long good = 0;
for (int t = 0; t < 3; t++) good += Integer.MAX_VALUE;
System.out.println("with long: " + good);              // 6442450941` },
    mcq: { q: '<code>int x = 10; x += x++ + ++x;</code> — what is x?', options: ['22', '23', '32', '33'], answer: 2, explain: 'x += e means x = x + e with the OLD x (10) saved first. e = x++ (10, x becomes 11) + ++x (12) = 22. So x = 10 + 22 = 32.' },
    hints: [`<p>Hint 1: <code>i++ &lt; 3</code> compares the old value and still increments on the final failing check.</p>`, `<p>Hint 2: <code>for (j = 0; j &lt; 10; j += 3)</code> runs for j = 0, 3, 6, 9. A short at 32767 plus one wraps to −32768 (and <code>s++</code> compiles because it includes a cast).</p>`, `<p>Hint 3: int overflow wraps modulo 2<sup>32</sup>: MAX + MAX = −2, then −2 + MAX = 2147483645. For <code>x += …</code>, the left x is read <b>before</b> the right side runs.</p>`],
    solution: {
      approach: `<p>Trace each line with its rule. Output:<br><code>1 2 3 | i=4</code><br><code>-1</code><br><code>4</code><br><code>-32768</code><br><code>32</code><br><code>2147483645</code></p>`,
      code: `
int i = 0;
while (i++ < 3) System.out.print(i + " ");
System.out.println("| i=" + i);            // 1 2 3 | i=4

int k = 5;
do { k -= 2; } while (k > 0);
System.out.println(k);                     // -1

int count = 0;
for (int j = 0; j < 10; j += 3) count++;
System.out.println(count);                 // 4  (j = 0, 3, 6, 9)

short s = Short.MAX_VALUE;
s++;                                       // s = (short) (s + 1)
System.out.println(s);                     // -32768

int x = 10;
x += x++ + ++x;                            // x = 10 + (10 + 12)
System.out.println(x);                     // 32

int bad = 0;
for (int t = 0; t < 3; t++) bad += Integer.MAX_VALUE;
System.out.println(bad);                   // 2147483645 (wrapped twice)`,
      dry: { head: ['line', 'key rule', 'answer'], rows: [['1', 'post-increment in condition', '1 2 3 | i=4'], ['2', 'do-while checks after the body', '-1'], ['3', 'stride loop: 0, 3, 6, 9', '4'], ['4', 'short overflow wraps', '-32768'], ['5', 'compound assignment saves old x', '32'], ['6', 'int overflow mod 2<sup>32</sup>', '2147483645']] },
      complexity: `<p>All O(1). The skill tested is precise evaluation order and fixed-width arithmetic.</p>`,
      followUps: ['Use <code>Math.addExact</code> to make line 6 throw instead of wrapping.', 'What does <code>for (byte b = 0; b &lt; 128; b++)</code> do? (infinite loop)']
    }
  });

  registerModule({
    id: 'java02',
    title: 'Control Flow, Methods, Arrays & String Basics',
    lang: 'java',
    intro: `<p>Module 1 taught you the <b>atoms</b> of Java — types, operators, the JVM. This module teaches you the <b>molecules</b>: how a program <b>decides</b> (<code>if</code>, <code>switch</code> and the modern switch expression), how it <b>repeats</b> (<code>for</code>, <code>while</code>, <code>do-while</code>, for-each), how it <b>escapes</b> loops early (<code>break</code>, <code>continue</code>, labels), how it is split into <b>methods</b> (and why Java is <i>always</i> pass-by-value), how one name can mean many methods (<b>overloading</b>, <b>varargs</b>), how data is stored in <b>1D and 2D arrays</b>, the time-saving <code>java.util.Arrays</code> toolbox, and the everyday <b>String</b> methods.</p>
<p>These are exactly the topics behind the "<b>What does this code print?</b>" questions that service companies and product companies alike love to ask, and they are the raw material of every coding round. Every topic has an analogy first, a step-by-step visualizer of the code running line by line, worked examples, predict-the-output traps, a deep dive into what the JVM really does, and a section on working alongside AI tools.</p>`,
    goals: [
      'Trace any if/else ladder, ternary, old-style switch (with fall-through) or switch expression by hand and predict its output',
      'Pick the right loop (for, while, do-while, for-each) and use break, continue and labelled break/continue correctly in nested loops',
      'Explain with a call-stack picture why Java is always pass-by-value, including what happens when you pass an array or object',
      'Predict which overloaded method the compiler picks (widening → boxing → varargs) and write safe varargs methods',
      'Create, traverse, copy and print 1D, 2D and jagged arrays, and use Arrays.sort, binarySearch, fill, copyOf, equals, asList correctly',
      'Use the core String methods (length, charAt, substring, indexOf, split, strip, equals, compareTo, join, repeat) without off-by-one or regex surprises'
    ],
    prereqs: `Java 1 (JDK, JRE, JVM &amp; Java Basics): you can compile and run a class with <code>main</code>, and you know primitive types, casting, operators and integer overflow.`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
