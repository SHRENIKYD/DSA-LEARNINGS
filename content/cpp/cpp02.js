(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw; // R`...` keeps C++ backslashes like "\n" exactly as written

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
  /* step = { l: line | [lines], cls, v: {vars}, hv: {name: cls}, vl, st: [call stack], out, extra: [parts], narr } */
  function codeFrames(code, steps, label) {
    return steps.map(function (s) {
      var hl = {};
      [].concat(s.l === undefined ? [] : s.l).forEach(function (n) { hl[n] = s.cls || 'cur'; });
      var parts = [{ type: 'code', label: label || 'Code (highlighted line = running now)', lang: 'cpp', code: code, hl: hl }];
      if (s.v) parts.push({ type: 'vars', label: s.vl || 'Variables', vals: s.v, hl: s.hv || {} });
      if (s.st) parts.push({ type: 'stack', label: 'Call stack (top = running now)', items: s.st.slice(), hl: one(s.st.length - 1, 'cur') });
      if (s.out !== undefined) parts.push(out(s.out));
      (s.extra || []).forEach(function (p) { parts.push(p); });
      return { narr: s.narr, parts: parts };
    });
  }

  /* ======================================================================
     TOPIC 1 — Making decisions: if / else, ternary, switch
     ====================================================================== */
  topics.push({
    title: 'Decisions: if/else, Logical Operators, the Ternary & switch',
    analogy: `<p>Picture a <b>railway junction</b>. Your program is a train running down one track. At a junction a signal asks one yes/no question — <i>"Is the bridge open?"</i> — and the points send the train left or right. <code>if / else</code> is a two-way junction. An <code>else if</code> ladder is a row of junctions, one after another: the train takes the <b>first</b> turn whose signal is green and ignores the rest. A <code>switch</code> is a <b>sorting yard</b>: the number plate of the train is read once and it is sent straight to platform 1, 2, 3… or to the "everything else" siding (<code>default</code>). The quirk: unless a barrier (<code>break</code>) is down, the train keeps rolling into the next platforms too.</p>`,
    explain: `<p>Every real program has to <b>choose</b>: give a discount or not, print "Fizz" or the number, retry or give up. C++ gives you four tools for choosing.</p>
<h4>1. if / else if / else — the everyday tool</h4>
<pre><code>if (score &gt;= 90)      grade = 'A';   // checked first
else if (score &gt;= 75) grade = 'B';   // checked only if the first was false
else                  grade = 'F';   // catches everything left over</code></pre>
<p>C++ checks the conditions <b>top to bottom</b> and runs only the <b>first</b> branch that is true. So <b>order matters</b>: put the strictest test first. If you wrote <code>score &gt;= 75</code> first, a 95 would get a B.</p>
${H.table(['score', 'score ≥ 90?', 'score ≥ 75?', 'grade'], [['95', H.c('g', 'true → stop'), '(never checked)', 'A'], ['80', H.c('r', 'false'), H.c('g', 'true → stop'), 'B'], ['40', H.c('r', 'false'), H.c('r', 'false'), 'F (else)']])}
<h4>2. What counts as "true" in C++?</h4>
<p>This is a big difference from Java. In C++ a condition does not have to be a <code>bool</code>. Any number works: <b>0 means false, everything else means true</b>. A pointer that is <code>nullptr</code> is false. So <code>if (count)</code> means "if count is not zero". Handy — but it also lets a classic bug compile:</p>
<pre><code>if (x = 5) { ... }   // ASSIGNS 5 to x, then tests 5 → always true!
if (x == 5) { ... }  // compares — this is what you meant</code></pre>
<p>Turn on warnings (<code>-Wall</code>) and the compiler will shout about the first line.</p>
<h4>3. Combining conditions: &amp;&amp;, ||, !</h4>
<p><code>&amp;&amp;</code> (AND) and <code>||</code> (OR) are <b>short-circuit</b>: C++ stops as soon as it knows the answer. In <code>if (i &lt; n &amp;&amp; a[i] &gt; 0)</code>, when <code>i</code> is out of range the right side is <b>never run</b>, so you never read past the end of the array. Order your checks: the "safety" check goes on the left.</p>
${H.table(['expression', 'left side', 'right side evaluated?', 'result'], [['false &amp;&amp; X', 'false', H.c('r', 'no (skipped)'), 'false'], ['true &amp;&amp; X', 'true', H.c('g', 'yes'), 'X'], ['true || X', 'true', H.c('r', 'no (skipped)'), 'true'], ['false || X', 'false', H.c('g', 'yes'), 'X']])}
<h4>4. The ternary operator — a one-line if/else that gives back a value</h4>
<pre><code>string label = (age &gt;= 18) ? "adult" : "minor";</code></pre>
<p>Read it as: <i>"Is age ≥ 18? If yes use "adult", otherwise use "minor"."</i> Use it to pick a <b>value</b>. Do not nest three of them — nobody can read that.</p>
<h4>5. switch — pick one of many fixed values</h4>
<p>When you compare <b>one</b> integer-like value (<code>int</code>, <code>char</code>, <code>enum</code>, <code>long</code>…) against many <b>constant</b> values, <code>switch</code> is cleaner than a long ladder. It does <b>not</b> work on <code>std::string</code> or <code>double</code>.</p>
<p>C++ jumps to the matching <code>case</code> label and then <b>keeps running downward</b> through the following labels — called <b>fall-through</b> — until it meets <code>break</code> or the closing brace. Forgetting <code>break</code> is one of the most common beginner bugs. If you fall through on purpose, write <code>[[fallthrough]];</code> so readers (and the compiler) know it was deliberate.</p>
<h4>6. if with an initializer (C++17)</h4>
<pre><code>if (int r = n % 3; r == 0) cout &lt;&lt; "divisible";
else                       cout &lt;&lt; "remainder " &lt;&lt; r;   // r is visible here too</code></pre>
<p>The variable <code>r</code> lives only inside the if/else — it cannot leak out and be misused later. You will see this a lot with maps: <code>if (auto it = m.find(k); it != m.end())</code>.</p>`,
    clues: [
      '"classify", "categorize", "grade", "bucket" a value into ranges → an <b>if / else if</b> ladder with the strictest test first',
      '"menu option 1/2/3", "command letter", "day number", "enum state" → <b>switch</b> on an integer/char/enum',
      '"choose between two values" in one expression (min, abs, label) → the <b>ternary</b> <code>?:</code>',
      '"check bounds before reading", "avoid division by zero", "pointer may be null" → put the guard on the <b>left of &amp;&amp;</b> (short-circuit)',
      'Output-prediction question with <code>if (x = 0)</code> or a <code>switch</code> without <code>break</code> → they are testing assignment-vs-compare and <b>fall-through</b>',
      'Comparing a negative <code>int</code> with <code>v.size()</code> → they are testing the <b>signed/unsigned</b> conversion trap'
    ],
    code: [R`#include <bits/stdc++.h>
using namespace std;

// Classify a score into a letter grade. Order matters: strictest test first.
char gradeOf(int score) {
    if (score >= 90)      return 'A';
    else if (score >= 80) return 'B';
    else if (score >= 70) return 'C';
    else if (score >= 60) return 'D';
    else                  return 'F';
}

int main() {
    int score;
    cin >> score;

    // Guard first: short-circuit keeps the second test from running on bad input.
    if (score < 0 || score > 100) {
        cout << "invalid score\n";
        return 1;
    }

    char g = gradeOf(score);
    // Ternary: pick a value in one line.
    string verdict = (g == 'F') ? "fail" : "pass";

    switch (g) {                       // switch works on char / int / enum
        case 'A': cout << "Excellent! "; break;
        case 'B':                      // empty case: shares the code below
        case 'C': cout << "Good. ";     break;
        default:  cout << "Keep going. ";
    }
    cout << g << " (" << verdict << ")\n";

    // C++17 if-with-initializer: r exists only inside this if/else.
    if (int r = score % 10; r >= 7) cout << "almost the next grade\n";
    else                            cout << "last digit " << r << "\n";
}`],
    codeTitle: ['Grades: if/else ladder, ternary, switch, if-with-initializer'],
    viz: [{
      title: 'Walk an if / else-if ladder',
      input: '73',
      inputLabel: 'score (0-100)',
      gen: function (input) {
        var s = intOf(input, 0, 100, 'Enter one whole number from 0 to 100');
        var code = 'int score = ' + s + ';\nchar grade;\nif (score >= 90)      grade = \'A\';\nelse if (score >= 80) grade = \'B\';\nelse if (score >= 70) grade = \'C\';\nelse if (score >= 60) grade = \'D\';\nelse                  grade = \'F\';\ncout << grade;';
        var tests = [[90, 'A', 3], [80, 'B', 4], [70, 'C', 5], [60, 'D', 6]];
        var steps = [{ l: 1, v: { score: s, grade: '?' }, hv: { score: 'ok' }, out: '', narr: 'Create <b>score = ' + s + '</b>. <code>grade</code> is declared but has no value yet.' }];
        var grade = 'F', checks = [];
        for (var k = 0; k < tests.length; k++) {
          var t = tests[k], ok = s >= t[0];
          checks.push([String(s) + ' >= ' + t[0], ok ? 'true' : 'false']);
          steps.push({ l: t[2], cls: ok ? 'ok' : 'bad', v: { score: s, grade: ok ? t[1] : '?' }, hv: ok ? { grade: 'ok' } : {}, out: '',
            extra: [{ type: 'table', label: 'Conditions checked so far', columns: ['test', 'result'], rows: checks.map(function (c) { return c.slice(); }), hl: one(checks.length - 1, ok ? 'sel' : 'cur') }],
            narr: 'Is <b>' + s + ' ≥ ' + t[0] + '</b>? ' + (ok ? '<span class="c-g">Yes</span> → run this branch: grade = \'' + t[1] + '\'. Every later <code>else</code> is <b>skipped</b> — only the first true branch runs.' : '<span class="c-r">No</span> → skip this branch and fall to the next <code>else if</code>.') });
          if (ok) { grade = t[1]; break; }
        }
        if (grade === 'F') steps.push({ l: 7, cls: 'ok', v: { score: s, grade: 'F' }, hv: { grade: 'ok' }, out: '', narr: 'Every test was false, so the final <code>else</code> catches it: grade = \'F\'. An <code>else</code> has no condition — it is the "everything else" bucket.' });
        steps.push({ l: 8, v: { score: s, grade: grade }, out: grade, narr: 'Print the grade: <b>' + grade + '</b>. We checked ' + checks.length + ' condition(s). Try 95 (1 check) or 12 (4 checks + else).' });
        return codeFrames(code, steps);
      }
    }, {
      title: 'switch fall-through: what happens without break',
      input: '2',
      inputLabel: 'day (1-5)',
      gen: function (input) {
        var d = intOf(input, 1, 5, 'Enter a day number from 1 to 5');
        var code = 'switch (day) {\n  case 1: cout << "Mon ";      // no break!\n  case 2: cout << "Tue ";      // no break!\n  case 3: cout << "Wed "; break;\n  case 4: cout << "Thu "; break;\n  default: cout << "? ";\n}\ncout << "end";';
        var steps = [{ l: 1, v: { day: d }, out: '', narr: 'Read <code>day</code> once (= <b>' + d + '</b>) and <b>jump</b> straight to the matching <code>case</code> label. No ladder of comparisons is needed — compilers often build a jump table.' }];
        var o = '';
        var lines = { 1: [2, 'Mon '], 2: [3, 'Tue '], 3: [4, 'Wed '], 4: [5, 'Thu '], 5: [6, '? '] };
        var start = d;
        if (d === 5) { steps.push({ l: 6, v: { day: d }, out: '', narr: 'No <code>case 5</code> exists, so control jumps to <code>default</code>.' }); }
        for (var k = start; k <= 5; k++) {
          var ln = lines[k];
          o += ln[1];
          var brk = (k === 3 || k === 4 || k === 5);
          steps.push({ l: ln[0], cls: k === start ? 'ok' : 'bad', v: { day: d }, out: o, narr: (k === start ? 'Land on this label and print <b>"' + ln[1].trim() + '"</b>.' : '<span class="c-r">Fall-through!</span> There was no <code>break</code> above, so execution simply keeps going into this label and prints <b>"' + ln[1].trim() + '"</b> even though day is not ' + k + '.') + (brk ? ' This line ends with <code>break</code> → leave the switch.' : ' No <code>break</code> here…') });
          if (brk) break;
        }
        steps.push({ l: 8, v: { day: d }, out: o + 'end', narr: 'After the switch: print "end". Final output: <b>' + esc(o + 'end') + '</b>. Fix: add <code>break;</code> after every case (or <code>[[fallthrough]];</code> if it is on purpose).' });
        return codeFrames(code, steps);
      }
    }],
    examples: [
      { title: 'Predict the output: = instead of ==', html: `<p>What does this print?</p><p><b>Answer:</b> many people guess "no 5". Read carefully: <code>x = 0</code> stores 0 in x and the whole expression has the value 0, which is <b>false</b>, so the <code>else</code> runs: it prints <b>no 0</b>. Change it to <code>x = 7</code> and it prints <b>yes 7</b> regardless of what x was. Lesson: <code>=</code> assigns, <code>==</code> compares. Some people write <code>if (0 == x)</code> ("Yoda style") so the typo <code>0 = x</code> fails to compile; nowadays <code>-Wall</code> warnings do the same job.</p>`, code: R`int x = 5;
if (x = 0) cout << "yes " << x;
else       cout << "no " << x;     // prints: no 0` },
      { title: 'Short-circuit as a safety guard', html: `<p>We want the first index where <code>a[i]</code> is negative, without ever reading past the end. Because <code>&amp;&amp;</code> stops at the first false, <code>i &lt; n</code> protects <code>a[i]</code>. Swap the two tests and on the last step you read <code>a[n]</code> — <b>undefined behaviour</b> (it may "work", crash, or print garbage).</p>`, code: R`vector<int> a = {4, 7, 1};
int n = a.size(), i = 0;
while (i < n && a[i] >= 0) ++i;     // safe: a[i] read only when i < n
cout << (i == n ? "none" : "found") << "\n";   // prints: none` },
      { title: 'Predict the output: dangling else', html: `<p>An <code>else</code> always attaches to the <b>nearest</b> unmatched <code>if</code>, no matter how you indent it. Here the <code>else</code> belongs to <code>if (b)</code>, not to <code>if (a)</code>. With a = false nothing prints at all! Always use braces <code>{ }</code> when you nest ifs.</p>`, code: R`bool a = false, b = true;
if (a)
    if (b) cout << "A and B";
else
    cout << "not A";    // looks like it belongs to if(a) ... it doesn't. Prints nothing.` },
      { title: 'The signed/unsigned comparison trap', html: `<p><code>v.size()</code> returns an <b>unsigned</b> number (<code>size_t</code>). When you compare the <code>int</code> -1 with it, C++ converts -1 to unsigned, which becomes a <b>huge</b> number (18446744073709551615 on 64-bit). So <code>-1 &lt; v.size()</code> is <b>false</b>! Fix: cast the size, <code>(int)v.size()</code>, or use C++20 <code>std::ssize(v)</code>, or <code>std::cmp_less(-1, v.size())</code>.</p>`, code: R`vector<int> v = {1, 2, 3};
int k = -1;
if (k < v.size()) cout << "smaller\n";              // NOT printed (surprise!)
if (k < (int)v.size()) cout << "smaller (fixed)\n"; // printed
if (cmp_less(k, v.size())) cout << "smaller (C++20)\n";` },
      { title: 'Chained comparison does not mean what maths means', html: `<p>In maths <code>1 &lt; x &lt; 5</code> checks a range. In C++ <code>1 &lt; x &lt; 5</code> means <code>(1 &lt; x) &lt; 5</code>: the first part is a bool (0 or 1), and both 0 and 1 are less than 5, so it is <b>always true</b>. With x = 100 it still prints "in range". Write <code>1 &lt; x &amp;&amp; x &lt; 5</code>.</p>`, code: R`int x = 100;
if (1 < x < 5) cout << "in range?!\n";          // always true
if (1 < x && x < 5) cout << "really in range\n"; // correct` }
    ],
    deepDive: `<p><b>How the CPU sees an if.</b> The compiler turns <code>if</code> into a <b>compare</b> instruction followed by a <b>conditional jump</b>. Modern CPUs run far ahead of the current instruction and must <b>guess</b> which way each jump goes (branch prediction). A correct guess is nearly free; a wrong guess throws away ~15–20 cycles of work. That is why a loop over <i>sorted</i> data with an <code>if</code> inside can run several times faster than the same loop over random data. When both branches are cheap, compilers often remove the jump entirely with a <code>cmov</code> (conditional move) — typical for ternaries like <code>m = a &lt; b ? a : b</code>. C++20 lets you hint with <code>[[likely]]</code> / <code>[[unlikely]]</code>, but measure before you sprinkle them.</p>
<p><b>How switch is compiled.</b> For dense case values (1,2,3,4…) the compiler builds a <b>jump table</b>: an array of addresses indexed by the value, so choosing among 50 cases costs the same as among 2. For sparse values (1, 1000, 50000) it builds a binary search of comparisons. Either way you get at least the speed of an if-ladder, which is one reason to prefer <code>switch</code> for enums and menu codes. A <code>switch</code> on an <code>enum class</code> with no <code>default</code> lets <code>-Wswitch</code> warn you when someone adds a new enum value and forgets to handle it — a real production safety net.</p>
<p><b>Edge cases worth knowing.</b> (1) You cannot <b>declare and initialise</b> a variable directly under a <code>case</code> label that later labels can jump past — wrap the case body in braces <code>{ }</code>. (2) Floating-point equality: <code>0.1 + 0.2 == 0.3</code> is <b>false</b>; compare with a tolerance, <code>fabs(a - b) &lt; 1e-9</code>. (3) <code>if constexpr</code> (C++17) chooses a branch at <b>compile time</b> and discards the other — used in templates (module A). (4) The comma operator: <code>if (a, b)</code> tests only <code>b</code>. (5) Since C++20, <code>std::cmp_less</code> and friends compare signed and unsigned numbers safely.</p>`,
    aiEra: `<p><b>What AI changes:</b> Copilot-style tools will happily autocomplete an entire <code>if / else if</code> ladder or a <code>switch</code> for you, so typing branches is no longer the hard part. The hard part is <b>getting the order and the boundaries right</b> (is 90 an A or a B? is 0 a valid input?) and spotting the classic C++ traps that AI-generated code still contains: <code>=</code> vs <code>==</code>, missing <code>break</code>, and comparing <code>int</code> with <code>size()</code>.</p>
<p><b>Use AI as a partner:</b> ask <i>"List every boundary value I should test for this grading function and the expected output for each"</i> — then run them. Ask it to <i>"rewrite this 8-branch ladder as a table lookup or switch and explain which is clearer"</i>. Ask it to explain a <code>-Wall</code> warning in plain English.</p>
<p><b>Where AI goes wrong:</b> it often writes overlapping conditions (<code>score &gt; 80</code> then <code>score &gt;= 80</code>), silently drops the <code>default</code> case, or "fixes" a fall-through that was intentional. <b>What you must still own:</b> reading a branch structure and predicting its output by hand in an interview — exactly what output-prediction questions test — and compiling with <code>-Wall -Wextra</code> so the compiler, not luck, catches the traps.</p>`,
    problems: [{
      title: 'Leap Year Checker',
      level: 'Easy', tags: ['if-else', 'logical operators', 'modulo'], companies: ['TCS', 'Infosys', 'Amazon'],
      statement: `<p>Write <code>bool isLeap(int year)</code>. A year is a leap year if it is divisible by <b>4</b>, <b>except</b> years divisible by <b>100</b>, which are leap years <b>only</b> if they are also divisible by <b>400</b>. Then, for each year read from input, print <code>LEAP</code> or <code>NOT LEAP</code>.</p>`,
      constraints: `1 ≤ year ≤ 10<sup>9</sup>; up to 10<sup>5</sup> years in the input.`,
      example: `<p>Input: <code>2024 1900 2000 2023</code></p><p>Output: ${H.c('g', 'LEAP')} ${H.c('r', 'NOT LEAP')} ${H.c('g', 'LEAP')} ${H.c('r', 'NOT LEAP')}</p><p><b>Why:</b> 2024 % 4 == 0 and not a century → leap. 1900 is a century and 1900 % 400 = 300 → not leap. 2000 % 400 == 0 → leap. 2023 % 4 = 3 → not leap.</p>`,
      brute: {
        why: `<p>A first attempt usually nests ifs three levels deep. It works, but it is long, easy to get wrong (people forget the 400 rule or put the tests in the wrong order) and hard to read in an interview. There is no speed problem — every version is O(1) — the "waste" here is <b>clarity</b>, and nested ifs are where off-by-one rule bugs hide.</p>`,
        code: R`bool isLeap(int year) {
    if (year % 4 == 0) {
        if (year % 100 == 0) {
            if (year % 400 == 0) return true;   // century divisible by 400
            else return false;                  // ordinary century
        } else {
            return true;                        // divisible by 4, not a century
        }
    } else {
        return false;                           // not divisible by 4
    }
}

int main() {
    int y;
    while (cin >> y) cout << (isLeap(y) ? "LEAP" : "NOT LEAP") << "\n";
}`
      },
      mcq: { q: 'Which single boolean expression is correct for a leap year?', options: ['<code>y % 4 == 0 || y % 400 == 0</code>', '<code>(y % 4 == 0 &amp;&amp; y % 100 != 0) || y % 400 == 0</code>', '<code>y % 4 == 0 &amp;&amp; y % 100 != 0 &amp;&amp; y % 400 == 0</code>', '<code>y % 100 != 0 || y % 4 == 0</code>'], answer: 1, explain: 'Leap if "divisible by 4 but not a century" OR "divisible by 400". Option 1 calls 1900 a leap year; option 3 can never be true for 2000; option 4 calls 2023 a leap year.' },
      hints: [`<p>Hint 1: Say the rule in words with AND / OR: "(divisible by 4 AND not divisible by 100) OR divisible by 400". That sentence <i>is</i> the code.</p>`, `<p>Hint 2: "divisible by k" in C++ is <code>year % k == 0</code>; "not divisible" is <code>year % k != 0</code>. Combine with <code>&amp;&amp;</code> and <code>||</code> and add brackets so the grouping is obvious.</p>`, `<p>Hint 3: Test the four corner cases: an ordinary leap year (2024), an ordinary non-leap (2023), a century (1900) and a 400-multiple (2000). Use the ternary to choose the printed word. Read with <code>while (cin &gt;&gt; y)</code> so it stops at end of input.</p>`],
      solution: {
        approach: `<p>Translate the English rule directly into one boolean expression. <code>&amp;&amp;</code> binds tighter than <code>||</code>, but add brackets anyway for the reader. The ternary picks which word to print. Fast I/O lines make 10<sup>5</sup> reads instant.</p>`,
        code: R`#include <bits/stdc++.h>
using namespace std;

// Leap if (divisible by 4 and not a century) or divisible by 400.
bool isLeap(int year) {
    return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int y;
    while (cin >> y) {
        cout << (isLeap(y) ? "LEAP" : "NOT LEAP") << '\n';
    }
    return 0;
}`,
        dry: { head: ['year', 'y%4==0', 'y%100!=0', 'y%400==0', 'result'], rows: [['2024', 'true', 'true', 'false', H.c('g', 'LEAP')], ['1900', 'true', 'false', 'false', H.c('r', 'NOT LEAP')], ['2000', 'true', 'false', 'true', H.c('g', 'LEAP')], ['2023', 'false', '(skipped)', 'false', H.c('r', 'NOT LEAP')]] },
        complexity: `<p>O(1) time and O(1) space per year; O(Q) for Q years. Note the short-circuit: for 2023 the <code>y % 100</code> test is never evaluated because the left side of <code>&amp;&amp;</code> was already false.</p>`,
        followUps: ['Return the number of days in a given month of a given year using a <code>switch</code>.', 'Count leap years between years A and B in O(1) using the formula ⌊y/4⌋ − ⌊y/100⌋ + ⌊y/400⌋.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Loops: for, while, do-while, range-for, break/continue
     ====================================================================== */
  topics.push({
    title: 'Loops: for, while, do-while, Range-for, break & continue',
    analogy: `<p>Think about running <b>laps</b> on a track. A <code>for</code> loop is "run exactly 10 laps": you know the count up front and keep a lap counter. A <code>while</code> loop is "keep running <i>while</i> you still have energy": you check before every lap and might run zero laps. A <code>do-while</code> loop is "run one lap, <i>then</i> ask if you want another": you always run at least once — like tasting the soup before deciding whether it needs more salt. A <b>range-for</b> is a teacher handing back exam papers: "for each student in the class…" — no counter needed. <code>break</code> is leaving the track early; <code>continue</code> is skipping the rest of this lap and starting the next one.</p>`,
    explain: `<p>A loop repeats a block of code. Every loop has the same three ingredients — get them right and loops stop being scary:</p>
${H.table(['ingredient', 'question it answers', 'in <code>for (int i = 0; i &lt; n; ++i)</code>'], [['start', 'where do I begin?', '<code>int i = 0</code>'], ['condition', 'should I do another round?', '<code>i &lt; n</code> (checked <b>before</b> every round)'], ['step', 'how do I move toward the end?', '<code>++i</code> (runs <b>after</b> every round)']])}
<h4>1. for — when you know how many times</h4>
<pre><code>for (int i = 0; i &lt; 5; ++i) cout &lt;&lt; i &lt;&lt; ' ';   // 0 1 2 3 4</code></pre>
<p>The order is: start → check → body → step → check → body → step … → check fails → leave. With <code>i &lt; 5</code> the body runs for 0,1,2,3,4 — <b>five</b> times. Writing <code>i &lt;= 5</code> by mistake runs six times: the famous <b>off-by-one</b> bug. Rule of thumb: <b>start at 0, use <code>&lt; n</code></b> for arrays of size n.</p>
<h4>2. while — when you do not know how many times</h4>
<pre><code>int n = 4096, digits = 0;
while (n &gt; 0) { n /= 10; ++digits; }    // keep chopping digits until none left</code></pre>
<p>The condition is checked <b>first</b>; if it is false at the start, the body runs <b>zero</b> times. Something inside the body <b>must</b> move toward making the condition false, or you get an <b>infinite loop</b>.</p>
<h4>3. do-while — run at least once</h4>
<pre><code>int choice;
do {
    cout &lt;&lt; "Enter 1-3: ";
    cin &gt;&gt; choice;
} while (choice &lt; 1 || choice &gt; 3);     // note the semicolon!</code></pre>
<p>Perfect for menus and "ask until the input is valid" — you must ask at least once anyway.</p>
<h4>4. range-based for — "for each element"</h4>
<pre><code>vector&lt;int&gt; v = {3, 1, 4};
for (int x : v)        cout &lt;&lt; x;     // x is a COPY of each element
for (int&amp; x : v)       x *= 2;        // x is the REAL element → v becomes {6, 2, 8}
for (const auto&amp; s : names) cout &lt;&lt; s; // read-only, no copying of big strings</code></pre>
<p>Use <code>const auto&amp;</code> to read big things (strings, vectors), <code>auto&amp;</code> to modify, and plain <code>auto</code> for small things like <code>int</code>.</p>
<h4>5. break and continue</h4>
<p><code>break</code> leaves the <b>innermost</b> loop immediately. <code>continue</code> skips the rest of the current round and jumps to the step/condition. In a <code>for</code> loop, <code>continue</code> still runs <code>++i</code>; in a <code>while</code> loop it does <b>not</b> — if your increment is at the bottom of a while body, <code>continue</code> can skip it and loop forever.</p>
<h4>6. Nested loops</h4>
<p>A loop inside a loop: for every round of the outer loop, the inner loop runs completely. Two nested loops over n items do about n × n = n² rounds — fine for n = 1,000 (10<sup>6</sup>), far too slow for n = 10<sup>5</sup> (10<sup>10</sup>). This is the first place where "how many times does this run?" becomes the interview question.</p>
<h4>7. The unsigned trap when counting down</h4>
<p><code>v.size()</code> is <b>unsigned</b> (<code>size_t</code>), and an unsigned number can never be below 0 — subtracting 1 from 0 wraps to about 1.8 × 10<sup>19</sup>. So <code>for (size_t i = n - 1; i &gt;= 0; --i)</code> <b>never ends</b>, and if the vector is empty, <code>v.size() - 1</code> is already huge. Count down with a signed <code>int</code>: <code>for (int i = (int)v.size() - 1; i &gt;= 0; --i)</code>.</p>`,
    clues: [
      '"for each element / every character / all pairs" → <b>for</b> or <b>range-for</b>; "all pairs (i, j)" → nested loops, O(n²)',
      '"until", "repeat while", "keep dividing by 10", "digits of a number" → <b>while</b> loop with a condition, not a counter',
      '"ask until valid", "menu", "at least once" → <b>do-while</b>',
      '"stop at the first …", "find any" → <b>break</b>; "skip invalid / skip duplicates" → <b>continue</b>',
      'N ≤ 10<sup>3</sup> → nested O(N²) loops are fine; N ≤ 10<sup>5</sup> → you need a single pass (or N log N)',
      'Output question with <code>size_t</code> / <code>unsigned</code> counting down to 0 → infinite-loop / wrap-around trap'
    ],
    code: [R`#include <bits/stdc++.h>
using namespace std;

int main() {
    // 1) for: known count. Sum of 1..n.
    int n = 10;
    long long total = 0;
    for (int i = 1; i <= n; ++i) total += i;      // 1 + 2 + ... + 10
    cout << "sum 1.." << n << " = " << total << "\n";   // 55

    // 2) while: unknown count. Digit sum of a number.
    int num = 4096, digitSum = 0;
    while (num > 0) {
        digitSum += num % 10;   // take the last digit
        num /= 10;              // drop the last digit
    }
    cout << "digit sum = " << digitSum << "\n";   // 4+0+9+6 = 19

    // 3) range-for with a reference: modify every element in place.
    vector<int> v = {3, 1, 4, 1, 5};
    for (int& x : v) x *= 2;                       // v = 6 2 8 2 10
    for (int x : v) cout << x << ' ';
    cout << "\n";

    // 4) break / continue: print odd numbers below 20, stop at the first > 12.
    for (int i = 0; i < 20; ++i) {
        if (i % 2 == 0) continue;    // skip even numbers (++i still runs)
        if (i > 12) break;           // leave the loop entirely
        cout << i << ' ';            // 1 3 5 7 9 11
    }
    cout << "\n";

    // 5) counting down safely: use a signed int, not size_t.
    for (int i = (int)v.size() - 1; i >= 0; --i) cout << v[i] << ' ';
    cout << "\n";

    // 6) nested loops: a multiplication table (n*n work).
    for (int r = 1; r <= 3; ++r) {
        for (int c = 1; c <= 3; ++c) cout << setw(3) << r * c;
        cout << "\n";
    }
}`],
    codeTitle: ['All loop shapes in one program'],
    viz: [{
      title: 'Trace a while loop: digit sum',
      input: '4096',
      inputLabel: 'a positive number (up to 9 digits)',
      gen: function (input) {
        var n0 = intOf(input, 1, 999999999, 'Enter a whole number from 1 to 999999999');
        var code = 'int n = ' + n0 + ', sum = 0;\nwhile (n > 0) {\n    int d = n % 10;   // last digit\n    sum += d;\n    n /= 10;          // drop last digit\n}\ncout << sum;';
        var n = n0, sum = 0, round = 0, steps = [];
        var hist = [];
        steps.push({ l: 1, v: { n: n, sum: 0, round: 0 }, hv: { n: 'ok', sum: 'ok' }, out: '', narr: 'Start: <b>n = ' + n0 + '</b>, <b>sum = 0</b>. The loop does not know in advance how many digits there are — that is why we use <code>while</code>, not a counter.' });
        while (n > 0) {
          round++;
          steps.push({ l: 2, cls: 'ok', v: { n: n, sum: sum, round: round }, out: '', extra: hist.length ? [{ type: 'table', label: 'Rounds so far', columns: ['round', 'd', 'sum', 'n after'], rows: hist.map(function (r) { return r.slice(); }) }] : [], narr: 'Check <code>n &gt; 0</code>: ' + n + ' &gt; 0 is <span class="c-g">true</span> → do round ' + round + '.' });
          var d = n % 10;
          steps.push({ l: 3, v: { n: n, d: d, sum: sum, round: round }, hv: { d: 'ok' }, out: '', narr: '<code>n % 10</code> = remainder after dividing by 10 = the <b>last digit</b> = <b>' + d + '</b>.' });
          sum += d;
          steps.push({ l: 4, v: { n: n, d: d, sum: sum, round: round }, hv: { sum: 'ok' }, out: '', narr: 'Add it: sum = ' + (sum - d) + ' + ' + d + ' = <b>' + sum + '</b>.' });
          var nn = Math.floor(n / 10);
          hist.push([round, d, sum, nn]);
          steps.push({ l: 5, v: { n: nn, d: d, sum: sum, round: round }, hv: { n: 'cur' }, out: '', extra: [{ type: 'table', label: 'Rounds so far', columns: ['round', 'd', 'sum', 'n after'], rows: hist.map(function (r) { return r.slice(); }), hl: one(hist.length - 1, 'sel') }], narr: '<code>n /= 10</code>: integer division throws away the last digit: ' + n + ' → <b>' + nn + '</b>. This is the step that moves the loop toward its end.' });
          n = nn;
        }
        steps.push({ l: 2, cls: 'bad', v: { n: n, sum: sum, round: round }, out: '', narr: 'Check <code>n &gt; 0</code>: 0 &gt; 0 is <span class="c-r">false</span> → leave the loop. It ran exactly <b>' + round + '</b> times — once per digit.' });
        steps.push({ l: 7, v: { n: n, sum: sum }, hv: { sum: 'sel' }, out: String(sum), narr: 'Print <b>' + sum + '</b>. Cost: O(number of digits) = O(log<sub>10</sub> n).' });
        return codeFrames(code, steps);
      }
    }, {
      title: 'Nested loops: build a star triangle',
      input: '4',
      inputLabel: 'rows (1-6)',
      gen: function (input) {
        var rows = intOf(input, 1, 6, 'Enter rows from 1 to 6');
        var code = 'for (int i = 1; i <= rows; ++i) {\n    for (int j = 1; j <= i; ++j)\n        cout << \'*\';\n    cout << \'\\n\';\n}';
        var grid = [], frames = [], total = 0;
        for (var r = 0; r < rows; r++) { var row = []; for (var c = 0; c < rows; c++) row.push(''); grid.push(row); }
        function snap() { return grid.map(function (rw) { return rw.slice(); }); }
        frames.push({ narr: 'Outer loop picks the <b>row</b> <code>i</code>; inner loop prints <b>i</b> stars in that row. Total stars = 1 + 2 + … + ' + rows + ' = <b>' + (rows * (rows + 1) / 2) + '</b>.', parts: [
          { type: 'code', lang: 'cpp', code: code, hl: { 1: 'cur' } }, { type: 'vars', vals: { rows: rows, i: '-', j: '-', stars: 0 } }, { type: 'grid', label: 'Screen', rows: snap(), rowHead: grid.map(function (_, k) { return 'i=' + (k + 1); }) }] });
        for (var i = 1; i <= rows; i++) {
          frames.push({ narr: 'Outer loop: <b>i = ' + i + '</b> (' + i + ' ≤ ' + rows + '). The inner loop will now run from j = 1 to j = ' + i + '.', parts: [
            { type: 'code', lang: 'cpp', code: code, hl: { 1: 'cur' } }, { type: 'vars', vals: { rows: rows, i: i, j: '-', stars: total }, hl: { i: 'ok' } }, { type: 'grid', label: 'Screen', rows: snap(), rowHead: grid.map(function (_, k) { return 'i=' + (k + 1); }) }] });
          for (var j = 1; j <= i; j++) {
            grid[i - 1][j - 1] = '*'; total++;
            var h = {}; h[(i - 1) + ',' + (j - 1)] = 'cur';
            frames.push({ narr: 'Inner loop: j = ' + j + ' ≤ ' + i + ' → print one <b>*</b> (star #' + total + ').', parts: [
              { type: 'code', lang: 'cpp', code: code, hl: { 2: 'cur', 3: 'ok' } }, { type: 'vars', vals: { rows: rows, i: i, j: j, stars: total }, hl: { j: 'ok', stars: 'ok' } }, { type: 'grid', label: 'Screen', rows: snap(), rowHead: grid.map(function (_, k) { return 'i=' + (k + 1); }), hl: h }] });
          }
          frames.push({ narr: 'j = ' + (i + 1) + ' &gt; ' + i + ' → inner loop ends. Print a newline and go back to the outer loop (<code>++i</code>).', parts: [
            { type: 'code', lang: 'cpp', code: code, hl: { 4: 'cur' } }, { type: 'vars', vals: { rows: rows, i: i, j: i + 1, stars: total } }, { type: 'grid', label: 'Screen', rows: snap(), rowHead: grid.map(function (_, k) { return 'i=' + (k + 1); }) }] });
        }
        frames.push({ narr: 'i = ' + (rows + 1) + ' &gt; ' + rows + ' → outer loop ends. Inner body ran <b>' + total + '</b> times ≈ n²/2. That "≈ n²" is what makes nested loops slow for big n.', parts: [
          { type: 'code', lang: 'cpp', code: code, hl: { 5: 'done' } }, { type: 'vars', vals: { rows: rows, stars: total }, hl: { stars: 'sel' } }, { type: 'grid', label: 'Screen', rows: snap(), rowHead: grid.map(function (_, k) { return 'i=' + (k + 1); }) }] });
        return frames;
      }
    }, {
      title: 'Predict the output: size_t counting down',
      gen: function () {
        var code = 'vector<int> v = {7, 8, 9};\nfor (size_t i = v.size() - 1; i >= 0; --i)\n    cout << v[i] << \' \';';
        var big = '18446744073709551615';
        return codeFrames(code, [
          { l: 1, v: { 'v.size()': 3 }, out: '', narr: 'We want to print the vector backwards: 9 8 7. Looks innocent…' },
          { l: 2, v: { i: 2, 'i >= 0': 'true' }, out: '', narr: '<code>i</code> is <b>size_t</b> (unsigned, 64-bit). Start at 3 − 1 = <b>2</b>. 2 ≥ 0 → true.' },
          { l: 3, v: { i: 2 }, out: '9 ', narr: 'Print v[2] = 9.' },
          { l: 3, v: { i: 1 }, out: '9 8 ', narr: '--i → 1. 1 ≥ 0 → true. Print v[1] = 8.' },
          { l: 3, v: { i: 0 }, out: '9 8 7 ', narr: '--i → 0. 0 ≥ 0 → true. Print v[0] = 7. So far so good.' },
          { l: 2, cls: 'bad', v: { i: big, 'i >= 0': 'true (!)' }, hv: { i: 'bad' }, out: '9 8 7 ', narr: '<span class="c-r">--i on 0 wraps around</span> to 2<sup>64</sup> − 1 = ' + big + '. An unsigned number is <b>always</b> ≥ 0, so the condition is <b>always true</b>.' },
          { l: 3, cls: 'bad', v: { i: big }, hv: { i: 'bad' }, out: '9 8 7 ??? (crash or garbage)', narr: 'Now <code>v[' + big + ']</code> reads far outside the vector: <b>undefined behaviour</b> — usually a segmentation fault. Fix: <code>for (int i = (int)v.size() - 1; i &gt;= 0; --i)</code>, or <code>for (size_t i = v.size(); i-- &gt; 0; )</code>, or iterate with <code>rbegin()/rend()</code>.' }
        ]);
      }
    }],
    examples: [
      { title: 'Predict the output: continue in a for loop', html: `<p><code>continue</code> skips the print for multiples of 3 but the <code>++i</code> step still runs. Output: <b>1 2 4 5 7</b>. Then <code>break</code> fires when i reaches 8, before it is printed.</p>`, code: R`for (int i = 1; i < 10; ++i) {
    if (i % 3 == 0) continue;   // skip 3 and 6
    if (i == 8) break;          // stop completely at 8
    cout << i << ' ';
}
// prints: 1 2 4 5 7` },
      { title: 'do-while runs once even when the condition is false', html: `<p>The condition <code>n &lt; 0</code> is false from the start. A <code>while</code> loop would print nothing; the <code>do-while</code> prints <b>10</b> once because the check happens <b>after</b> the body. Remember the semicolon after <code>while (...)</code>.</p>`, code: R`int n = 10;
do {
    cout << n << "\n";   // runs once: prints 10
} while (n < 0);

while (n < 0) cout << "never\n";   // runs zero times` },
      { title: 'Range-for: copy vs reference', html: `<p>The first loop doubles <b>copies</b> — the vector is unchanged. The second uses <code>int&amp;</code>, so <code>x</code> is another name for the real element and the vector changes. Output: <b>1 2 3</b> then <b>2 4 6</b>. Copying in a range-for is a classic "why did nothing change?" bug, and for <code>vector&lt;string&gt;</code> it is also slow.</p>`, code: R`vector<int> v = {1, 2, 3};
for (int x : v) x *= 2;          // changes copies only
for (int x : v) cout << x << ' '; // 1 2 3
cout << "\n";
for (int& x : v) x *= 2;         // changes the real elements
for (int x : v) cout << x << ' '; // 2 4 6` },
      { title: 'A while loop that forgets its step', html: `<p>In the buggy version the only <code>++i</code> sits at the bottom, and <code>continue</code> jumps over it when i is even: i stays 0 forever → <b>infinite loop</b>. The code below shows the fix — step <i>before</i> <code>continue</code> — and prints <b>5</b>. In a <code>for</code> loop the step lives in the header and always runs, which is one reason <code>for</code> is safer for counting.</p>`, code: R`int i = 0, odd = 0;
while (i < 10) {
    if (i % 2 == 0) { ++i; continue; }   // FIX: step before continue (without ++i here it never ends)
    ++odd;
    ++i;
}
cout << odd << "\n";   // 5` },
      { title: 'Two loop variables: two pointers from both ends', html: `<p>A <code>for</code> header can hold several variables separated by commas. Here <code>i</code> walks forward and <code>j</code> walks backward until they meet — the basis of reversing and palindrome checks. Output: <b>5 4 3 2 1</b>.</p>`, code: R`vector<int> a = {1, 2, 3, 4, 5};
for (int i = 0, j = (int)a.size() - 1; i < j; ++i, --j)
    swap(a[i], a[j]);
for (int x : a) cout << x << ' ';   // 5 4 3 2 1` }
    ],
    deepDive: `<p><b>Loop invariants — how to prove a loop correct.</b> An invariant is a sentence that is true before every round. For the digit-sum loop: "<i>sum</i> + digit-sum(<i>n</i>) equals the digit sum of the original number". It is true at the start (sum = 0), each round keeps it true (we move one digit from n into sum), and when n = 0 it tells us sum is the answer. Interviewers love it when you state the invariant out loud — it shows you understand <i>why</i> the loop works, not just that it seems to.</p>
<p><b>What the compiler does.</b> At <code>-O2</code> GCC/Clang <b>hoist</b> work that does not change out of the loop, <b>unroll</b> small loops, and <b>vectorise</b> simple ones (process 4–8 ints per instruction with SIMD). They can only do this if the loop is simple: a known trip count, no function calls with side effects, no aliasing doubts. A plain <code>for (int i = 0; i &lt; n; ++i) s += a[i];</code> is very fast; the same loop calling <code>v.size()</code> in the condition is also fine (it inlines), but a loop with <code>cout</code> inside is slow because of I/O, not because of the loop.</p>
<p><b>Infinite loops are UB in C++ (sometimes).</b> In C++, a loop with no observable side effects (no I/O, no volatile, no atomics) that never ends is undefined behaviour — the optimiser is allowed to assume every such loop terminates and may delete it. (C++26 carves out an exception for trivially empty loops like <code>while (true) {}</code>.) That is why "<code>while (1) {}</code> to wait" is a bad idea — use proper waiting. <b>Floating-point counters</b> are another trap: <code>for (double x = 0; x != 1.0; x += 0.1)</code> never ends because 0.1 cannot be stored exactly; count with integers and compute the double.</p>
<p><b>Signed overflow in counters.</b> <code>int</code> overflow is undefined behaviour, which lets the compiler assume <code>i + 1 &gt; i</code> always. If a loop multiplies until a value exceeds a limit (<code>while (p * 2 &lt;= n)</code>), use <code>long long</code> so the multiplication cannot overflow first.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants write loops instantly, including range-for and STL algorithm versions. What they do not reliably do is check the <b>boundaries</b>: off-by-one (<code>&lt;=</code> vs <code>&lt;</code>), empty input, counting down with <code>size_t</code>, and nested loops that are O(n²) when n is 10<sup>5</sup>. Those are exactly the bugs interviewers plant in output-prediction questions.</p>
<p><b>Use AI as a partner:</b> paste your loop and ask <i>"What happens when the vector is empty? When n = 1? When n is the maximum?"</i>. Ask <i>"State the loop invariant for this loop"</i> and check whether it matches your understanding. Ask it to convert a raw loop into <code>std::accumulate</code>/<code>std::ranges</code> and compare readability.</p>
<p><b>Where AI goes wrong:</b> it mixes <code>int</code> and <code>size_t</code> freely (compiler warnings it never saw), puts the increment after a <code>continue</code> in a while loop, and sometimes "optimises" a loop into a formula that overflows. <b>What you must still own:</b> tracing a loop by hand with a variable table (the skill the visualizers above train), counting how many times a nested loop runs, and recognising from the constraints whether a loop shape is fast enough.</p>`,
    problems: [{
      title: 'Reverse the Digits of an Integer (with Overflow Check)',
      level: 'Medium', tags: ['while loop', 'modulo', 'overflow'], companies: ['Amazon', 'Bloomberg', 'Apple', 'Adobe'],
      statement: `<p>Given a 32-bit signed integer <code>x</code>, return <code>x</code> with its digits reversed. If reversing makes the value go outside the 32-bit range [−2<sup>31</sup>, 2<sup>31</sup> − 1], return <b>0</b>. Assume you may not store 64-bit integers (an interview twist), so you must detect overflow <b>before</b> it happens.</p>`,
      constraints: `−2<sup>31</sup> ≤ x ≤ 2<sup>31</sup> − 1`,
      example: `<p><code>x = 123</code> → ${H.c('g', '321')}; <code>x = -120</code> → ${H.c('g', '-21')} (the trailing 0 becomes a leading 0 and disappears); <code>x = 1534236469</code> → ${H.c('r', '0')} because 9646324351 &gt; 2147483647.</p>`,
      brute: {
        why: `<p>Convert to a string, reverse it, convert back with <code>stoll</code>, then range-check. It works, but it allocates a string, needs special handling for the minus sign, and it quietly uses a 64-bit integer — which the interviewer said you may not. The real lesson of this problem is the <b>digit-popping loop</b> and checking overflow <b>before</b> the multiply.</p>`,
        code: R`int reverseBrute(int x) {
    string s = to_string(x);
    bool neg = false;
    if (s[0] == '-') { neg = true; s = s.substr(1); }
    reverse(s.begin(), s.end());
    long long r = stoll(s);            // uses 64-bit: not allowed in the twist
    if (neg) r = -r;
    if (r < INT_MIN || r > INT_MAX) return 0;
    return (int)r;
}`
      },
      mcq: { q: 'Before doing <code>rev = rev * 10 + d</code>, when do we know it will overflow (positive side)?', options: ['When <code>rev &gt; INT_MAX</code>', 'When <code>rev &gt; INT_MAX / 10</code>, or <code>rev == INT_MAX / 10</code> and <code>d &gt; 7</code>', 'When <code>d &gt; 7</code>', 'Never — int arithmetic wraps safely'], answer: 1, explain: 'INT_MAX = 2147483647. If rev already exceeds 214748364, multiplying by 10 overflows. If rev equals 214748364 the last digit may be at most 7. Signed overflow is undefined behaviour, so we must check first.' },
      hints: [`<p>Hint 1: <code>x % 10</code> gives the last digit and <code>x / 10</code> removes it. Pushing a digit onto the back of <code>rev</code> is <code>rev = rev * 10 + d</code>. Loop while <code>x != 0</code>.</p>`, `<p>Hint 2: In C++ <code>%</code> and <code>/</code> keep the sign of x for negatives (−123 % 10 = −3, −123 / 10 = −12), so the same loop works for negative numbers with no special case.</p>`, `<p>Hint 3: Overflow check before pushing: positive side <code>rev &gt; INT_MAX/10 || (rev == INT_MAX/10 &amp;&amp; d &gt; 7)</code>; negative side <code>rev &lt; INT_MIN/10 || (rev == INT_MIN/10 &amp;&amp; d &lt; -8)</code>. If either is true, return 0.</p>`],
      solution: {
        approach: `<p>Pop digits from the right of <code>x</code> and push them onto the right of <code>rev</code>. The loop runs once per digit (at most 10). Because signed overflow is undefined behaviour, we compare against <code>INT_MAX / 10</code> and <code>INT_MIN / 10</code> <b>before</b> multiplying. C++ integer division truncates toward zero, so negative numbers need no special handling.</p>`,
        code: R`#include <bits/stdc++.h>
using namespace std;

int reverseDigits(int x) {
    int rev = 0;
    while (x != 0) {
        int d = x % 10;          // last digit (negative if x is negative)
        x /= 10;                 // drop it
        // Check BEFORE rev * 10 + d can overflow (signed overflow is UB).
        if (rev > INT_MAX / 10 || (rev == INT_MAX / 10 && d > 7)) return 0;
        if (rev < INT_MIN / 10 || (rev == INT_MIN / 10 && d < -8)) return 0;
        rev = rev * 10 + d;      // push digit onto the right
    }
    return rev;
}

int main() {
    for (int x : {123, -120, 0, 1534236469, INT_MIN})
        cout << x << " -> " << reverseDigits(x) << "\n";
    // 123 -> 321, -120 -> -21, 0 -> 0, 1534236469 -> 0, INT_MIN -> 0
}`,
        dry: { head: ['round', 'x before', 'd = x % 10', 'x after', 'rev'], rows: [['1', '-120', '0', '-12', '0'], ['2', '-12', '-2', '-1', '-2'], ['3', '-1', '-1', '0', '-21'], ['end', '0', '—', '—', H.c('g', '-21')]] },
        complexity: `<p>Time O(d) where d = number of digits ≤ 10, so O(1). Space O(1). No strings, no 64-bit values.</p>`,
        followUps: ['Check whether an integer is a palindrome without converting it to a string (reverse only half of it).', 'Reverse a <code>long long</code> — what changes in the overflow test?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — Functions and the call stack
     ====================================================================== */
  topics.push({
    title: 'Functions, Return Values & the Call Stack',
    analogy: `<p>A function is a <b>kitchen helper with a recipe card</b>. You say "make me a sandwich with <i>bread</i> and <i>cheese</i>" (the <b>arguments</b>). The helper takes the ingredients to their own little <b>workbench</b>, follows the recipe, and hands back one finished sandwich (the <b>return value</b>). When the helper needs another helper ("I need someone to toast this"), a new workbench is set up <b>on top</b> of theirs. Workbenches are always removed from the top: the newest one finishes first. That pile of workbenches is the <b>call stack</b>, and each workbench is a <b>stack frame</b> holding that call's parameters and local variables.</p>`,
    explain: `<p>A function packages a piece of work under a name so you can <b>reuse</b> it, <b>test</b> it on its own, and <b>read</b> your program as a story ("read input, solve, print") instead of one giant <code>main</code>.</p>
<h4>1. Anatomy of a function</h4>
<pre><code>int maxOf(int a, int b) {     // return type, name, parameter list
    return a &gt; b ? a : b;     // body; 'return' hands a value back and exits
}
int m = maxOf(3, 9);          // call with arguments 3 and 9 → m = 9</code></pre>
${H.table(['word', 'meaning', 'example'], [['parameter', 'the variable in the definition', '<code>int a</code>'], ['argument', 'the actual value passed at the call', '<code>3</code>'], ['return type', 'what kind of value comes back', '<code>int</code>; <code>void</code> = nothing'], ['signature', 'name + parameter types (not the return type)', '<code>maxOf(int, int)</code>']])}
<h4>2. Declare before you use</h4>
<p>C++ reads your file <b>top to bottom</b>. If <code>main</code> calls <code>helper()</code> and <code>helper</code> is defined <i>below</i> <code>main</code>, the compiler has not heard of it yet → error. Fix it with a <b>declaration</b> (also called a <b>prototype</b>) near the top: <code>int helper(int x);</code> — a promise "this function exists, here is its shape". The <b>definition</b> (with the body) can then come later, or in another <code>.cpp</code> file — this is exactly how header files work (Module 1).</p>
<h4>3. return</h4>
<p><code>return</code> does two things: it gives back a value and it <b>leaves the function immediately</b>. A <code>void</code> function can use a bare <code>return;</code> to exit early. A non-<code>void</code> function that reaches its closing brace without returning is <b>undefined behaviour</b> (except <code>main</code>, which returns 0 automatically). Need two results? Return a <code>pair</code> or a small <code>struct</code> and unpack it with <b>structured bindings</b>: <code>auto [lo, hi] = minMax(v);</code></p>
<h4>4. The call stack</h4>
<p>Every call creates a <b>frame</b> on the stack containing: the parameters (copies of the arguments, unless they are references), the local variables, and the <b>return address</b> (where to continue in the caller). When the function returns, its frame is thrown away — which is why local variables "disappear" and why you must never return a reference or pointer to a local.</p>
${H.table(['moment', 'stack (top is right)'], [['in main', 'main'], ['main calls f', 'main → f'], ['f calls g', 'main → f → g'], ['g returns', 'main → f'], ['f returns', 'main']])}
<h4>5. Recursion</h4>
<p>A function that calls itself. Every recursive function needs a <b>base case</b> (stop here) and a <b>recursive case</b> that moves toward the base case. Each call gets its own frame with its own copy of <code>n</code>. Too many nested calls (say a million) uses up the stack (typically 1–8 MB) → <b>stack overflow</b> crash. For deep problems prefer a loop.</p>
<h4>6. Small but useful extras</h4>
<ul><li><code>static</code> local variable: created once, keeps its value between calls (e.g. counting how many times a function ran).</li><li><code>[[nodiscard]]</code> on a function makes the compiler warn if a caller ignores the return value — great for error codes.</li><li><code>auto</code> return type lets the compiler deduce it from the <code>return</code> statement.</li><li><code>inline</code> today means "may be defined in several files" (for headers), not "please inline" — the optimiser decides that by itself.</li></ul>`,
    clues: [
      '"write a helper / utility function", "reuse this logic" → define a function with a clear signature and return value',
      '"recursive", "define in terms of a smaller version", "factorial, power, Fibonacci, tree depth" → base case + recursive case; draw the call stack',
      'N up to 10<sup>6</sup> recursion depth → risk of <b>stack overflow</b>; convert to a loop',
      '"return two values" (min and max, quotient and remainder) → return a <code>pair</code>/<code>struct</code> + structured bindings',
      'Output question where a function prints and also returns a value, or modifies a global/static → trace the call order on the stack',
      '"undefined reference" / "was not declared in this scope" error question → declaration vs definition'
    ],
    code: [R`#include <bits/stdc++.h>
using namespace std;

// Declarations (prototypes): promise these exist, bodies come later.
long long factorial(int n);
pair<int, int> minMax(const vector<int>& v);

// [[nodiscard]]: warn if the caller ignores the result.
[[nodiscard]] bool isPrime(int n) {
    if (n < 2) return false;               // early return
    for (int d = 2; 1LL * d * d <= n; ++d)
        if (n % d == 0) return false;      // leave the function at once
    return true;
}

void greet(const string& name) {           // void: returns nothing
    if (name.empty()) return;              // bare return to exit early
    cout << "Hi, " << name << "!\n";
}

int callCount() {
    static int calls = 0;                  // created once, survives between calls
    return ++calls;
}

int main() {
    greet("Asha");
    cout << boolalpha << isPrime(97) << "\n";      // true
    cout << factorial(10) << "\n";                  // 3628800

    auto [lo, hi] = minMax({4, 9, 1, 7});           // structured bindings (C++17)
    cout << lo << " " << hi << "\n";                // 1 9

    callCount(); callCount();
    cout << "called " << callCount() << " times\n"; // called 3 times
}

// Definitions can come after main because of the declarations above.
long long factorial(int n) {
    if (n <= 1) return 1;                  // base case
    return n * factorial(n - 1);           // recursive case: smaller problem
}

pair<int, int> minMax(const vector<int>& v) {
    int lo = v[0], hi = v[0];
    for (int x : v) { lo = min(lo, x); hi = max(hi, x); }
    return {lo, hi};                       // return two values at once
}`],
    codeTitle: ['Declarations, early return, static locals, recursion, returning two values'],
    viz: [{
      title: 'One call: frames, copies and the return value',
      input: '3 4',
      inputLabel: 'a b (two small integers)',
      gen: function (input) {
        var ab = intsOf(input, 2, 2, -999, 999, 'Enter two integers, e.g. 3 4');
        var a = ab[0], b = ab[1], s = a + b;
        var code = 'int add(int x, int y) {\n    int s = x + y;\n    return s;\n}\nint main() {\n    int a = ' + a + ', b = ' + b + ';\n    int c = add(a, b);\n    cout << c;\n}';
        return codeFrames(code, [
          { l: 5, st: ['main'], v: {}, vl: 'main frame', out: '', narr: 'The program starts in <code>main</code>. The OS creates the first <b>stack frame</b> for it.' },
          { l: 6, st: ['main  a=' + a + ' b=' + b], v: { a: a, b: b }, hv: { a: 'ok', b: 'ok' }, vl: 'main frame', out: '', narr: 'Local variables <b>a</b> and <b>b</b> live inside main\'s frame.' },
          { l: 7, st: ['main  a=' + a + ' b=' + b, 'add  x=' + a + ' y=' + b], v: { x: a, y: b }, hv: { x: 'ok', y: 'ok' }, vl: 'add frame (new)', out: '', narr: 'Call <code>add(a, b)</code>: a <b>new frame</b> is pushed on top. Parameters <b>x</b> and <b>y</b> are <b>copies</b> of a and b (pass by value). The return address "continue at line 7 in main" is stored too.' },
          { l: 2, st: ['main  a=' + a + ' b=' + b, 'add  x=' + a + ' y=' + b + ' s=' + s], v: { x: a, y: b, s: s }, hv: { s: 'ok' }, vl: 'add frame', out: '', narr: 'Inside add: local <b>s = ' + a + ' + ' + b + ' = ' + s + '</b>. This s belongs to add\'s frame only.' },
          { l: 3, cls: 'ok', st: ['main  a=' + a + ' b=' + b, 'add  returns ' + s], v: { 'return value': s }, hv: { 'return value': 'sel' }, vl: 'add frame', out: '', narr: '<code>return s;</code> copies the value ' + s + ' out (in practice into a CPU register) and the function ends.' },
          { l: 7, st: ['main  a=' + a + ' b=' + b + ' c=' + s], v: { a: a, b: b, c: s }, hv: { c: 'ok' }, vl: 'main frame', out: '', narr: 'add\'s frame is <b>popped</b> — x, y and s no longer exist. Back in main, <b>c = ' + s + '</b>.' },
          { l: 8, st: ['main  a=' + a + ' b=' + b + ' c=' + s], v: { a: a, b: b, c: s }, vl: 'main frame', out: String(s), narr: 'Print ' + s + '. Note: a and b were never changed by add — it only ever saw copies.' }
        ]);
      }
    }, {
      title: 'Recursion: factorial frames grow and shrink',
      input: '4',
      inputLabel: 'n (1-7)',
      gen: function (input) {
        var n = intOf(input, 1, 7, 'Enter n from 1 to 7');
        var code = 'long long fact(int n) {\n    if (n <= 1) return 1;        // base case\n    return n * fact(n - 1);      // recursive case\n}\nint main() {\n    cout << fact(' + n + ');\n}';
        var steps = [], st = ['main'];
        steps.push({ l: 6, st: st, v: {}, out: '', narr: 'main calls <code>fact(' + n + ')</code>.' });
        for (var k = n; k >= 1; k--) {
          st = st.concat(['fact(n=' + k + ')']);
          if (k > 1) {
            steps.push({ l: 2, cls: 'bad', st: st, v: { n: k, 'n <= 1': 'false' }, out: '', narr: 'New frame for <b>fact(' + k + ')</b> with its <b>own</b> n = ' + k + '. Base case? ' + k + ' ≤ 1 is false.' });
            steps.push({ l: 3, st: st, v: { n: k, waiting: k + ' * fact(' + (k - 1) + ')' }, out: '', narr: 'It needs fact(' + (k - 1) + ') first, so it <b>pauses</b> here (frame stays on the stack) and makes another call.' });
          } else {
            steps.push({ l: 2, cls: 'ok', st: st, v: { n: 1, 'n <= 1': 'true' }, hv: { 'n <= 1': 'ok' }, out: '', narr: '<b>Base case reached</b>: fact(1) returns 1 without calling again. The stack is at its deepest: ' + (st.length) + ' frames.' });
          }
        }
        var val = 1;
        for (var k2 = 2; k2 <= n; k2++) {
          st = st.slice(0, st.length - 1);
          var prev = val; val = val * k2;
          var s2 = st.slice(); s2[s2.length - 1] = 'fact(n=' + k2 + ') = ' + k2 + '*' + prev;
          steps.push({ l: 3, cls: 'ok', st: s2, v: { n: k2, 'fact(n-1)': prev, result: val }, hv: { result: 'ok' }, out: '', narr: 'Top frame popped; fact(' + k2 + ') resumes with the answer ' + prev + ' and computes ' + k2 + ' × ' + prev + ' = <b>' + val + '</b>.' });
        }
        st = ['main'];
        steps.push({ l: 6, st: st, v: { answer: val }, hv: { answer: 'sel' }, out: String(val), narr: 'All fact frames are gone; main prints <b>' + val + '</b>. Max depth was ' + (n + 1) + ' frames → recursion uses O(n) stack memory.' });
        return codeFrames(code, steps);
      }
    }],
    examples: [
      { title: 'Declaration needed: calling a function defined later', html: `<p>Without the prototype on line 1, <code>main</code> would fail with "<i>'square' was not declared in this scope</i>". The declaration tells the compiler the function's shape; the definition after <code>main</code> supplies the body. In real projects declarations live in <code>.h</code> files.</p>`, code: R`int square(int x);          // declaration (prototype)

int main() {
    cout << square(7) << "\n";   // 49 — OK, compiler knows the signature
}

int square(int x) {         // definition
    return x * x;
}` },
      { title: 'Predict the output: argument evaluation order', html: `<p>What does <code>show(tick(), tick())</code> print? The C++ standard says the order in which <b>function arguments</b> are evaluated is <b>unspecified</b>. GCC usually evaluates right-to-left and prints <b>2 1</b>; Clang usually prints <b>1 2</b>. The right interview answer: "it is unspecified — never write code that depends on it". (By contrast, since C++17 a chain like <code>cout &lt;&lt; tick() &lt;&lt; tick()</code> <b>is</b> evaluated left to right.)</p>`, code: R`int counter = 0;
int tick() { return ++counter; }
void show(int a, int b) { cout << a << " " << b << "\n"; }

int main() {
    show(tick(), tick());        // "2 1" or "1 2": unspecified!
    cout << tick() << " " << tick() << "\n";   // C++17: always "3 4"
}` },
      { title: 'Missing return is undefined behaviour', html: `<p>When <code>n</code> is negative, <code>sign()</code> falls off the end without returning — <b>undefined behaviour</b>. It compiles (with a warning under <code>-Wall</code>: "control reaches end of non-void function") and might return garbage, 0, or crash. Fix: make sure every path returns.</p>`, code: R`int signBad(int n) {
    if (n > 0) return 1;
    if (n == 0) return 0;
    // n < 0: no return here → undefined behaviour!
}

int signGood(int n) {
    if (n > 0) return 1;
    if (n == 0) return 0;
    return -1;              // every path now returns
}` },
      { title: 'Returning two values with a struct', html: `<p>A function returns one thing, but that thing can be a <code>struct</code> or <code>pair</code>. Structured bindings unpack it into named variables. Clearer than "out parameters", and the compiler avoids the copy (return value optimisation). Output: <b>17 / 5 = 3 remainder 2</b>.</p>`, code: R`struct DivResult { int quotient, remainder; };

DivResult divide(int a, int b) {
    return {a / b, a % b};
}

int main() {
    auto [q, r] = divide(17, 5);
    cout << "17 / 5 = " << q << " remainder " << r << "\n";
}` },
      { title: 'Recursion depth and stack overflow', html: `<p><code>sumTo(n)</code> recursively adds 1..n. For n = 1,000 it is fine. For n = 10,000,000 each frame costs ~32–48 bytes, so ~400 MB of stack is needed — far more than the usual 8 MB → <b>segmentation fault (stack overflow)</b>. The loop version uses O(1) stack. (Compilers may turn some recursion into a loop with tail-call optimisation at <code>-O2</code>, but C++ never guarantees it.)</p>`, code: R`long long sumTo(int n) {               // O(n) stack frames
    if (n == 0) return 0;
    return n + sumTo(n - 1);
}

long long sumToLoop(int n) {           // O(1) stack
    long long s = 0;
    for (int i = 1; i <= n; ++i) s += i;
    return s;
}` }
    ],
    deepDive: `<p><b>What a frame really contains.</b> On x86-64 Linux (the System V ABI) the first six integer/pointer arguments are passed in <b>registers</b> (rdi, rsi, rdx, rcx, r8, r9), not on the stack, and small return values come back in <b>rax</b>. The <code>call</code> instruction pushes the return address; the function then moves the stack pointer down to make room for its locals. Returning pops all of it in one instruction. That is why function calls are cheap (a few nanoseconds) and why the optimiser can <b>inline</b> small functions — copy the body into the caller — making the call cost zero. Write small, clear functions; at <code>-O2</code> you rarely pay for them.</p>
<p><b>Stack vs heap memory.</b> The stack is small (Linux main thread: 8 MB by default, threads often 1–8 MB; Windows: 1 MB) but extremely fast — allocation is just moving a pointer. That is why a huge local array like <code>int a[10000000];</code> inside <code>main</code> crashes, while the same array as a <b>global</b> or inside a <code>vector</code> (heap) is fine. Competitive programmers declare big arrays globally for this reason.</p>
<p><b>Return value optimisation.</b> When you <code>return</code> a local object (a vector, a string, a struct), C++17 <b>guarantees</b> no copy in the "return a temporary" case (<code>return vector&lt;int&gt;(n);</code>) and compilers almost always elide the copy for named locals (NRVO); otherwise it is <b>moved</b>, which for a vector is just copying three pointers. So returning a big vector by value is the modern, efficient style — no need for output parameters.</p>
<p><b>Undefined behaviour you can create with functions:</b> returning a reference/pointer to a local (it dies with the frame), falling off the end of a non-void function, unbounded recursion, and relying on unspecified argument evaluation order. All compile; all are interview favourites.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI is very good at extracting a helper function from a long <code>main</code>, suggesting names, and generating unit tests for a function. That makes the old advice — "small functions, one job each" — easier than ever to follow. You can ask for a function plus five test cases in one prompt.</p>
<p><b>Use AI as a partner:</b> <i>"Split this 80-line main into well-named functions; keep behaviour identical; list each function's inputs and outputs."</i> Or <i>"Draw the call stack for fib(4) as a table"</i> and compare with your own drawing. Ask it to convert a recursive solution to an iterative one when the depth could be 10<sup>6</sup>.</p>
<p><b>Where AI goes wrong:</b> it sometimes returns a reference to a local, forgets a <code>return</code> on one path, writes recursive solutions that blow the stack for the stated constraints, and produces functions whose names lie about what they do. <b>What you must still own:</b> drawing frames by hand (interviewers ask "what is on the stack at this moment?"), choosing the signature (value vs reference, which you will learn next), and judging recursion depth from the constraints.</p>`,
    problems: [{
      title: 'Fast Power (Binary Exponentiation) with Recursion',
      level: 'Medium', tags: ['recursion', 'call stack', 'math', 'modulo'], companies: ['Google', 'Microsoft', 'Codeforces classic'],
      statement: `<p>Write <code>long long power(long long base, long long exp, long long mod)</code> that returns base<sup>exp</sup> mod <code>mod</code>. The exponent can be as large as 10<sup>18</sup>, so a loop that multiplies <code>exp</code> times is far too slow.</p>`,
      constraints: `0 ≤ base ≤ 10<sup>9</sup>, 0 ≤ exp ≤ 10<sup>18</sup>, 1 ≤ mod ≤ 10<sup>9</sup> + 7`,
      example: `<p><code>power(2, 10, 1000)</code> → 1024 mod 1000 = ${H.c('g', '24')}. <code>power(3, 0, 7)</code> → ${H.c('g', '1')} (anything to the power 0 is 1). <code>power(2, 10<sup>18</sup>, 10<sup>9</sup>+7)</code> must answer in microseconds.</p>`,
      brute: {
        why: `<p>Multiply <code>base</code> into the result <code>exp</code> times. That is O(exp) — with exp = 10<sup>18</sup> it would take centuries. The wasted work: we recompute the same products again and again instead of reusing x<sup>k</sup> to get x<sup>2k</sup> in one multiplication.</p>`,
        code: R`long long powerSlow(long long base, long long exp, long long mod) {
    long long result = 1 % mod;
    base %= mod;
    for (long long i = 0; i < exp; ++i)      // exp iterations: way too many
        result = result * base % mod;
    return result;
}`
      },
      mcq: { q: 'How do you get x<sup>10</sup> from x<sup>5</sup> with one multiplication?', options: ['x<sup>5</sup> + x<sup>5</sup>', 'x<sup>5</sup> × x<sup>5</sup>', 'x<sup>5</sup> × x', 'You cannot'], answer: 1, explain: 'x^(2k) = x^k × x^k. Halving the exponent each time means only about log₂(exp) calls: 10¹⁸ needs ~60 calls.' },
      hints: [`<p>Hint 1: x<sup>e</sup> = (x<sup>e/2</sup>)<sup>2</sup> when e is even, and x · (x<sup>e/2</sup>)<sup>2</sup> when e is odd (with integer division). Compute x<sup>e/2</sup> <b>once</b> and square it.</p>`, `<p>Hint 2: The base case is e = 0 → return 1 % mod (so mod = 1 gives 0). Each call halves e, so the recursion depth is about log₂ e ≤ 60 — no risk of stack overflow.</p>`, `<p>Hint 3: Take <code>% mod</code> after every multiplication. With mod ≤ 10<sup>9</sup>+7 each product is &lt; 10<sup>18</sup>·1.0…, which fits in <code>long long</code> (max ≈ 9.2 × 10<sup>18</sup>). Reduce <code>base %= mod</code> first.</p>`],
      solution: {
        approach: `<p>Divide and conquer: compute <code>half = power(base, exp / 2)</code> once, square it, and multiply by one extra <code>base</code> if <code>exp</code> is odd. Each call halves the exponent, so there are only ⌊log₂ exp⌋ + 1 calls stacked at most. This is the recursion pattern "solve a half-size problem once, combine" — the same idea as merge sort and binary search.</p>`,
        code: R`#include <bits/stdc++.h>
using namespace std;

long long power(long long base, long long exp, long long mod) {
    if (exp == 0) return 1 % mod;                 // base case
    long long half = power(base, exp / 2, mod);   // ONE recursive call
    long long result = half * half % mod;         // x^(2k) = (x^k)^2
    if (exp % 2 == 1)                             // odd exponent: one extra x
        result = result * (base % mod) % mod;
    return result;
}

int main() {
    cout << power(2, 10, 1000) << "\n";                       // 24
    cout << power(3, 0, 7) << "\n";                           // 1
    cout << power(2, 1000000000000000000LL, 1000000007) << "\n";
}`,
        alt: [R`// Iterative version: walk the bits of exp from low to high, O(1) stack.
long long powerIter(long long base, long long exp, long long mod) {
    long long result = 1 % mod;
    base %= mod;
    while (exp > 0) {
        if (exp & 1) result = result * base % mod;   // this bit is set
        base = base * base % mod;                    // x, x^2, x^4, x^8, ...
        exp >>= 1;
    }
    return result;
}`],
        dry: { head: ['call (stack depth)', 'exp', 'half returned', 'result = half² (· base if odd)'], rows: [['power(2,10) d=1', '10', '32 (from 2^5)', '32·32 = 1024 % 1000 = <b>24</b>'], ['power(2,5) d=2', '5', '4 (from 2^2)', '4·4·2 = <b>32</b>'], ['power(2,2) d=3', '2', '2 (from 2^1)', '2·2 = <b>4</b>'], ['power(2,1) d=4', '1', '1 (from 2^0)', '1·1·2 = <b>2</b>'], ['power(2,0) d=5', '0', '—', 'base case <b>1</b>']] },
        complexity: `<p>Time O(log exp) multiplications (~60 for 10<sup>18</sup>). Space O(log exp) stack frames for the recursive version, O(1) for the iterative one.</p>`,
        followUps: ['Compute the n-th Fibonacci number mod 10<sup>9</sup>+7 for n = 10<sup>18</sup> using the same idea on 2×2 matrices.', 'Why would <code>half * half</code> overflow if <code>mod</code> were 10<sup>18</sup>, and how does <code>__int128</code> fix it?']
      }
    }]
  });

  registerModule({
    id: 'cpp02',
    title: 'Control Flow, Functions, Arrays & Strings',
    lang: 'cpp',
    intro: `<p>Module 1 taught you how a C++ program is built and how to read and print values. Now you learn to make it <b>do work</b>: choose between paths (<code>if</code>, <code>switch</code>), repeat things (<code>for</code>, <code>while</code>), split work into <b>functions</b>, decide whether a function gets a <b>copy</b> or the <b>original</b> (pass by value vs by reference), use <b>default arguments</b> and <b>overloading</b>, store many values in <b>C arrays, <code>std::array</code> and <code>std::vector</code></b>, and handle text with <b><code>std::string</code></b>.</p>
<p>These are the building blocks of every coding-interview answer in C++. Interviewers also love <b>"predict the output"</b> questions on exactly this material — a missing <code>break</code>, an <code>unsigned</code> loop that never ends, a <code>swap</code> that swaps nothing, a <code>sizeof</code> that suddenly says 8. Every topic below starts with an everyday analogy, then shows the idea working step by step in a visualizer (watch the loop variables change, the call-stack frames grow and shrink, a reference arrow point at the original, a vector move to a bigger buffer), then goes deep into what the compiler and CPU really do, and ends with how to work with AI tools on it.</p>`,
    goals: [
      'Write correct <code>if / else if</code> ladders, <code>switch</code> statements (with and without fall-through) and ternaries, and predict their output by hand',
      'Choose the right loop (<code>for</code>, <code>while</code>, <code>do-while</code>, range-for), avoid off-by-one and unsigned-underflow bugs, and trace loops with a variable table',
      'Explain the call stack and draw the frames for a recursive function; write functions with clear signatures and return values',
      'Pick pass-by-value, pass-by-reference or pass-by-const-reference for every parameter and justify it in an interview',
      'Use default arguments and overloading correctly and explain how the compiler resolves an overloaded call (exact match → promotion → conversion)',
      'Compare C arrays, <code>std::array</code> and <code>std::vector</code>; explain size vs capacity, geometric growth, amortised O(1) <code>push_back</code> and iterator invalidation',
      'Manipulate <code>std::string</code> confidently: indexing, <code>substr</code>, <code>find</code>/<code>npos</code>, <code>getline</code>, char arithmetic, conversions, and the O(n²) concatenation trap'
    ],
    prereqs: `C++ 1 (Compilation Model, Syntax, Types &amp; I/O): you can compile and run a program, know <code>int</code>/<code>long long</code>/<code>double</code>/<code>char</code>/<code>bool</code>, signed vs unsigned, and <code>cin</code>/<code>cout</code>. No pointers needed yet — they come in C++ 3.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
