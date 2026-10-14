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
        steps.push({ l: 1, v: { n: n }, out: '', narr: 'Evaluate <code>n</code> once: it is <b>' + n + '</b>. Java now <b>jumps</b> straight to the matching label (it does not test the labels one by one like an if-ladder — it uses a jump table).' });
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
