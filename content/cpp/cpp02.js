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
