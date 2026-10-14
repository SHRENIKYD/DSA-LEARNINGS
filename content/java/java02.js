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
