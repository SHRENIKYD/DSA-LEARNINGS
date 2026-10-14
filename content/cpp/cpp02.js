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

  /* ======================================================================
     TOPIC 4 — Pass by value, by reference, by const reference
     ====================================================================== */
  function passGraph(aLabel, xLabel, mode, hl, ehl) {
    var edges = mode === 'value' ? [['a', 'x', 'copied']] : mode === 'ref' ? [['x', 'a', 'refers to']] : [];
    return { type: 'graph', label: 'Memory: main\'s frame (left) vs the function\'s frame (right)', directed: true, height: 50,
      nodes: [{ id: 'a', label: aLabel, x: 20, y: 25, shape: 'box', w: 26 }, { id: 'x', label: xLabel, x: 78, y: 25, shape: 'box', w: 30 }],
      edges: edges, hl: hl || {}, ehl: ehl || {} };
  }
  topics.push({
    title: 'Pass by Value vs Reference vs const Reference',
    analogy: `<p>You want a friend to check your essay. <b>Pass by value</b> = you hand them a <b>photocopy</b>. They can scribble all over it; your original is untouched — but photocopying a 500-page book takes time. <b>Pass by reference</b> = you hand them your <b>original</b>. No copying, and any change they make is a change to <i>your</i> essay. <b>Pass by const reference</b> = you let them read the original <b>through a glass case</b>: no copying, and they physically cannot write on it. Choosing between these three is one of the most common C++ interview questions.</p>`,
    explain: `<p>When you call a function, C++ has to decide what the parameter <b>is</b>: a brand-new copy of the argument, or another name for the argument itself.</p>
<h4>1. Pass by value — the function gets a copy</h4>
<pre><code>void bump(int x) { x += 10; }     // x is a COPY
int a = 5;  bump(a);              // a is still 5</code></pre>
<p>Safe (the caller's variable cannot change) and perfect for small types: <code>int</code>, <code>double</code>, <code>char</code>, <code>bool</code>, pointers, <code>string_view</code>. But copying a <code>vector&lt;int&gt;</code> of a million elements copies 4 MB <b>every call</b>.</p>
<h4>2. Pass by reference — the function gets the original</h4>
<pre><code>void bump(int&amp; x) { x += 10; }    // x is ANOTHER NAME for the argument
int a = 5;  bump(a);              // a is now 15</code></pre>
<p>A <b>reference</b> (<code>int&amp;</code>) is an <b>alias</b>: a second name for an existing variable. It must be bound when created and can never be re-pointed at something else. Use it when the function is <b>supposed</b> to change the caller's variable (<code>swap</code>, filling a result, sorting in place). You cannot pass a literal or a temporary to a plain <code>int&amp;</code>: <code>bump(5)</code> does not compile — there is no variable to change.</p>
<h4>3. Pass by const reference — the original, read-only</h4>
<pre><code>long long sum(const vector&lt;int&gt;&amp; v) {   // no copy, cannot modify
    long long s = 0;
    for (int x : v) s += x;
    return s;
}</code></pre>
<p>The everyday choice for <b>big inputs you only read</b>: strings, vectors, maps, your own structs. It also accepts temporaries and literals: <code>sum({1, 2, 3})</code> and <code>print("hi")</code> with <code>const string&amp;</code> both work.</p>
<h4>The decision table (memorise this)</h4>
${H.table(['you want to…', 'small type (int, double, char)', 'big type (string, vector, struct)'], [['only read it', 'by value <code>int x</code>', 'by const ref <code>const vector&lt;int&gt;&amp; v</code>'], ['change the caller\'s variable', 'by ref <code>int&amp; x</code>', 'by ref <code>vector&lt;int&gt;&amp; v</code>'], ['get your own copy to modify locally', 'by value', 'by value (then it can be moved in — module A)'], ['produce a result', 'return it', 'return it (no copy thanks to RVO/move)']])}
<h4>4. What about pointers?</h4>
<p>You can also pass an address: <code>void bump(int* p) { *p += 10; }</code> called as <code>bump(&amp;a)</code>. It works like a reference but can be <code>nullptr</code> and needs <code>*</code> to reach the value. Modern C++ prefers references unless "nothing" is a valid input. Pointers get their own module next (C++ 3).</p>
<h4>5. Range-for is the same decision</h4>
<p><code>for (auto x : v)</code> copies each element, <code>for (auto&amp; x : v)</code> lets you modify, <code>for (const auto&amp; x : v)</code> reads without copying. Same three choices, same rule.</p>`,
    clues: [
      '"modify the array / string in place", "swap", "fill the result into" → pass by <b>non-const reference</b>',
      '"given a large vector / string / matrix" that you only read → <b>const reference</b> (a by-value vector param in a recursive function = TLE/MLE)',
      'Output question: a function changes its parameter and the caller prints the original → it was <b>by value</b>, nothing changed',
      'Recursion on a big vector (DFS, backtracking) → pass the vector by <b>reference</b>, otherwise each call copies it: O(n) per call',
      '"Why does <code>f(5)</code> not compile?" → a literal cannot bind to a non-const <code>int&amp;</code>',
      '"returns a reference" + local variable → <b>dangling reference</b> bug'
    ],
    code: [R`#include <bits/stdc++.h>
using namespace std;

void byValue(int x)       { x += 10; }   // works on a copy
void byRef(int& x)        { x += 10; }   // works on the caller's variable
int  readOnly(const int& x) { return x * 2; }   // legal, but for int just use 'int x'

// Big input, read only -> const reference: no copy, no accidental modification.
long long total(const vector<int>& v) {
    long long s = 0;
    for (int x : v) s += x;
    return s;
}

// Output through a reference parameter: the caller's vector is changed.
void appendSquares(vector<int>& out, int n) {
    for (int i = 1; i <= n; ++i) out.push_back(i * i);
}

void mySwap(int& a, int& b) {      // the classic reference example
    int t = a;
    a = b;
    b = t;
}

int main() {
    int a = 5;
    byValue(a);  cout << a << "\n";    // 5  (copy changed, not a)
    byRef(a);    cout << a << "\n";    // 15 (a itself changed)
    cout << readOnly(21) << "\n";      // 42: const& accepts a literal

    vector<int> v;
    appendSquares(v, 4);               // v = 1 4 9 16
    cout << total(v) << "\n";          // 30
    cout << total({10, 20}) << "\n";   // 30: const& binds to a temporary

    int p = 3, q = 8;
    mySwap(p, q);
    cout << p << " " << q << "\n";     // 8 3

    // Range-for follows the same rule.
    vector<string> names = {"ana", "bo"};
    for (auto& s : names) s[0] = toupper(s[0]);   // modify in place
    for (const auto& s : names) cout << s << " "; // read without copying
    cout << "\n";                                  // Ana Bo
}`],
    codeTitle: ['Value, reference and const reference side by side'],
    viz: [{
      title: 'Copy vs alias: who really changes?',
      input: '5',
      inputLabel: 'starting value of a',
      gen: function (input) {
        var a0 = intOf(input, -999, 999, 'Enter an integer from -999 to 999');
        var code = 'void bumpV(int x)  { x += 10; }   // by value\nvoid bumpR(int& x) { x += 10; }   // by reference\nint main() {\n    int a = ' + a0 + ';\n    bumpV(a);\n    bumpR(a);\n    cout << a;\n}';
        var a1 = a0 + 10;
        function F(l, narr, g, st, vars, outp, cls) {
          var hl = {}; hl[l] = cls || 'cur';
          return { narr: narr, parts: [{ type: 'code', lang: 'cpp', code: code, hl: hl }, g, { type: 'stack', label: 'Call stack', items: st, hl: one(st.length - 1, 'cur') }, { type: 'vars', label: 'Values', vals: vars }, out(outp)] };
        }
        return [
          F(4, 'main creates <b>a = ' + a0 + '</b> in its own frame.', passGraph('main: a = ' + a0, '(no function yet)', 'none', { a: 'ok' }), ['main'], { a: a0 }, ''),
          F(5, '<b>By value:</b> calling <code>bumpV(a)</code> makes a <b>new variable x</b> in bumpV\'s frame and <b>copies</b> ' + a0 + ' into it. Two separate boxes now.', passGraph('main: a = ' + a0, 'bumpV: x = ' + a0, 'value', { x: 'cur' }, { 'a-x': 'ok' }), ['main', 'bumpV(x)'], { a: a0, x: a0 }, ''),
          F(1, '<code>x += 10</code> changes <b>only the copy</b>: x = ' + a1 + '. Look — a is still ' + a0 + '.', passGraph('main: a = ' + a0, 'bumpV: x = ' + a1, 'value', { x: 'ok', a: 'done' }), ['main', 'bumpV(x)'], { a: a0, x: a1 }, ''),
          F(5, 'bumpV returns, its frame is destroyed and the copy x disappears. <span class="c-r">The change is lost.</span> a = ' + a0 + '.', passGraph('main: a = ' + a0, '(x destroyed)', 'none', { x: 'bad' }), ['main'], { a: a0 }, '', 'done'),
          F(6, '<b>By reference:</b> calling <code>bumpR(a)</code> does <b>not</b> make a new int. x is just a <b>second name</b> for a — the arrow shows x refers to a.', passGraph('main: a = ' + a0, 'bumpR: x (alias of a)', 'ref', { x: 'cur', a: 'cur' }, { 'x-a': 'sel' }), ['main', 'bumpR(x&)'], { a: a0, 'x (= a)': a0 }, ''),
          F(2, '<code>x += 10</code> writes <b>through</b> the alias straight into main\'s a: a = <b>' + a1 + '</b>.', passGraph('main: a = ' + a1, 'bumpR: x (alias of a)', 'ref', { a: 'ok' }, { 'x-a': 'ok' }), ['main', 'bumpR(x&)'], { a: a1, 'x (= a)': a1 }, '', 'ok'),
          F(6, 'bumpR returns. The name x is gone, but the change stays because it was made to a itself.', passGraph('main: a = ' + a1, '(alias x gone)', 'none', { a: 'ok' }), ['main'], { a: a1 }, ''),
          F(7, 'Print a → <b>' + a1 + '</b>. Only the reference version had an effect. Under the hood a reference parameter is passed as the variable\'s <b>address</b>, so it costs 8 bytes no matter how big the object is.', passGraph('main: a = ' + a1, '—', 'none', { a: 'sel' }), ['main'], { a: a1 }, String(a1))
        ];
      }
    }, {
      title: 'Swap: by value fails, by reference works',
      input: '3 8',
      inputLabel: 'p q',
      gen: function (input) {
        var pq = intsOf(input, 2, 2, -999, 999, 'Enter two integers, e.g. 3 8');
        var p = pq[0], q = pq[1];
        function G(l1, l2, l3, l4, mode, hl, ehl) {
          var edges = mode === 'value' ? [['p', 'a', 'copy'], ['q', 'b', 'copy']] : mode === 'ref' ? [['a', 'p', 'alias'], ['b', 'q', 'alias']] : [];
          return { type: 'graph', label: 'main (left) and swap\'s parameters (right)', directed: true, height: 60,
            nodes: [{ id: 'p', label: l1, x: 18, y: 15, shape: 'box', w: 22 }, { id: 'q', label: l2, x: 18, y: 45, shape: 'box', w: 22 }, { id: 'a', label: l3, x: 78, y: 15, shape: 'box', w: 26 }, { id: 'b', label: l4, x: 78, y: 45, shape: 'box', w: 26 }],
            edges: edges, hl: hl || {}, ehl: ehl || {} };
        }
        var code = 'void swapV(int a, int b)   { int t = a; a = b; b = t; }\nvoid swapR(int& a, int& b) { int t = a; a = b; b = t; }\n// main: int p = ' + p + ', q = ' + q + ';\nswapV(p, q);  cout << p << " " << q << "\\n";\nswapR(p, q);  cout << p << " " << q << "\\n";';
        function F(l, narr, g, o) { var hl = {}; hl[l] = 'cur'; return { narr: narr, parts: [{ type: 'code', lang: 'cpp', code: code, hl: hl }, g, out(o)] }; }
        var o1 = p + ' ' + q + '\n';
        return [
          F(3, 'main has p = ' + p + ' and q = ' + q + '.', G('p = ' + p, 'q = ' + q, '—', '—', 'none'), ''),
          F(4, 'swapV(p, q): a and b are <b>copies</b>.', G('p = ' + p, 'q = ' + q, 'a = ' + p, 'b = ' + q, 'value', { a: 'cur', b: 'cur' }, { 'p-a': 'ok', 'q-b': 'ok' }), ''),
          F(1, 'Inside swapV the copies are swapped: a = ' + q + ', b = ' + p + '. p and q do not know anything happened.', G('p = ' + p, 'q = ' + q, 'a = ' + q, 'b = ' + p, 'value', { a: 'ok', b: 'ok', p: 'done', q: 'done' }), ''),
          F(4, 'swapV returns; copies vanish. Print: <b>' + p + ' ' + q + '</b> — <span class="c-r">unchanged</span>.', G('p = ' + p, 'q = ' + q, '(gone)', '(gone)', 'none', { a: 'bad', b: 'bad' }), o1),
          F(5, 'swapR(p, q): a and b are <b>aliases</b> of p and q.', G('p = ' + p, 'q = ' + q, 'a → p', 'b → q', 'ref', { a: 'cur', b: 'cur' }, { 'a-p': 'sel', 'b-q': 'sel' }), o1),
          F(2, 'Swapping through the aliases swaps the real variables: p = ' + q + ', q = ' + p + '.', G('p = ' + q, 'q = ' + p, 'a → p', 'b → q', 'ref', { p: 'ok', q: 'ok' }, { 'a-p': 'ok', 'b-q': 'ok' }), o1),
          F(5, 'Print: <b>' + q + ' ' + p + '</b> — swapped. (In real code just call <code>std::swap(p, q)</code>.)', G('p = ' + q, 'q = ' + p, '—', '—', 'none', { p: 'sel', q: 'sel' }), o1 + q + ' ' + p)
        ];
      }
    }, {
      title: 'Cost of passing a vector: value vs const&',
      input: '1000000',
      inputLabel: 'vector size n',
      gen: function (input) {
        var n = intOf(input, 1, 100000000, 'Enter n from 1 to 100000000');
        var bytes = n * 4, calls = 1000;
        function mb(x) { return (x / 1048576).toFixed(x >= 1048576 ? 1 : 4) + ' MB'; }
        return [
          { narr: 'A <code>vector&lt;int&gt;</code> with n = ' + n + ' elements holds <b>' + mb(bytes) + '</b> of data on the heap.', parts: [{ type: 'vars', vals: { n: n, 'bytes of data': bytes } }, { type: 'code', lang: 'cpp', code: 'long long sumV(vector<int> v);          // by value\nlong long sumR(const vector<int>& v);   // by const reference', hl: {} }] },
          { narr: '<b>By value</b>: every call allocates a new buffer and copies all ' + n + ' ints (O(n) time and memory) before the function even starts.', parts: [{ type: 'bars', label: 'bytes copied per call', values: [bytes, 8], texts: [mb(bytes), '8 B'], idxLabels: ['by value', 'const ref'], hl: { 0: 'bad' } }] },
          { narr: '<b>By const reference</b>: only an address (8 bytes on 64-bit) is passed. Cost is O(1) regardless of n.', parts: [{ type: 'bars', label: 'bytes copied per call', values: [bytes, 8], texts: [mb(bytes), '8 B'], idxLabels: ['by value', 'const ref'], hl: { 1: 'ok' } }] },
          { narr: 'Call it ' + calls + ' times (e.g. inside a loop or recursion): by value copies <b>' + mb(bytes * calls) + '</b> in total; const&amp; copies 8 KB. This is a real cause of TLE/MLE in DFS and backtracking solutions.', parts: [{ type: 'bars', label: 'total bytes over ' + calls + ' calls', values: [bytes * calls, 8 * calls], texts: [mb(bytes * calls), '8 KB'], idxLabels: ['by value', 'const ref'], hl: { 0: 'bad', 1: 'ok' } }, { type: 'text', html: '<b>Rule:</b> big + read-only → <code>const T&amp;</code>. Big + must modify → <code>T&amp;</code>. Small → by value.' }] }
        ];
      }
    }],
    examples: [
      { title: 'Predict the output: modifying a vector parameter', html: `<p><code>clearV</code> gets a copy, so the caller's vector keeps its 3 elements; <code>clearR</code> gets the real vector and empties it. Output: <b>3 0</b>.</p>`, code: R`void clearV(vector<int> v)  { v.clear(); }
void clearR(vector<int>& v) { v.clear(); }

int main() {
    vector<int> a = {1, 2, 3};
    clearV(a); cout << a.size() << " ";   // 3
    clearR(a); cout << a.size() << "\n";  // 0
}` },
      { title: 'A reference cannot be re-seated', html: `<p><code>r</code> is bound to <code>a</code> forever. The line <code>r = b;</code> does <b>not</b> make r refer to b — it <b>assigns b's value into a</b>. Output: <b>20 20 20</b>. Interviewers use this to check you understand that a reference is an alias, not a pointer.</p>`, code: R`int a = 10, b = 20;
int& r = a;     // r is another name for a
r = b;          // means a = b; r still refers to a
cout << a << " " << b << " " << r << "\n";   // 20 20 20` },
      { title: 'Literals and temporaries need const&amp;', html: `<p>A non-const reference must refer to a real, changeable variable, so <code>shout("hey")</code> with a <code>string&amp;</code> parameter does not compile (the string is a temporary). With <code>const string&amp;</code> it compiles and no extra copy of an existing string is made. This is why read-only parameters should be <code>const&amp;</code>: they accept everything.</p>`, code: R`void shoutRef(string& s)        { cout << s << "!\n"; }
void shoutConst(const string& s) { cout << s << "!\n"; }

int main() {
    string w = "hello";
    shoutRef(w);         // OK: w is a variable
    // shoutRef("hey");  // ERROR: cannot bind non-const reference to a temporary
    shoutConst("hey");   // OK: const& binds to the temporary string
}` },
      { title: 'Dangling reference: returning a local by reference', html: `<p><code>bad()</code> returns a reference to <code>local</code>, which is destroyed when the function's frame is popped. Using the result is <b>undefined behaviour</b> — it may print 42, garbage, or crash. GCC warns: "reference to local variable returned". Return <b>by value</b> instead; it is cheap.</p>`, code: R`int& bad() {
    int local = 42;
    return local;        // DANGER: local dies when bad() returns
}
int good() {
    int local = 42;
    return local;        // returns a copy: always fine
}` },
      { title: 'Recursion: pass the big container by reference', html: `<p>Generating all subsets with backtracking: if <code>cur</code> were passed by value, every one of the 2<sup>n</sup> calls would copy it. Passing by reference and undoing the change (<code>pop_back</code>) after the recursive call keeps one shared vector. Output for {1,2}: <b>{} {2} {1} {1 2}</b>.</p>`, code: R`void subsets(const vector<int>& a, int i, vector<int>& cur) {
    if (i == (int)a.size()) {
        cout << "{";
        for (size_t k = 0; k < cur.size(); ++k) cout << (k ? " " : "") << cur[k];
        cout << "} ";
        return;
    }
    subsets(a, i + 1, cur);          // skip a[i]
    cur.push_back(a[i]);             // take a[i]
    subsets(a, i + 1, cur);
    cur.pop_back();                  // undo: shared vector stays correct
}

int main() {
    vector<int> a = {1, 2}, cur;
    subsets(a, 0, cur);
}` }
    ],
    deepDive: `<p><b>How references are implemented.</b> The standard says a reference is an alias and may not even occupy storage. In practice, when a reference is a <b>function parameter</b>, the compiler passes the <b>address</b> of the argument (8 bytes on 64-bit) and every use dereferences it. So <code>const int&amp;</code> for an <code>int</code> is actually <b>slower</b> than plain <code>int</code>: an extra memory load, and the optimiser must worry that the referenced int changes behind its back (<b>aliasing</b>). Rule of thumb: pass by value anything up to ~16 bytes that is cheap to copy (ints, doubles, pointers, <code>string_view</code>, <code>span</code>, small structs like a 2D point); pass by <code>const&amp;</code> anything that owns heap memory (<code>string</code>, <code>vector</code>, <code>map</code>).</p>
<p><b>Aliasing surprises.</b> With references two names can refer to the same object: <code>void addTwice(int&amp; a, const int&amp; b) { a += b; a += b; }</code> called as <code>addTwice(x, x)</code> with x = 1 gives 4, not 3, because b changes when a does. Similar bugs appear in <code>v.push_back(v[0])</code>-style code (handled correctly by the standard library, but not necessarily by your own containers).</p>
<p><b>The "sink" parameter idiom.</b> When a function will <b>store</b> its argument (e.g. a constructor saving a name), modern C++ passes <b>by value and moves</b>: <code>Person(string n) : name(std::move(n)) {}</code>. Callers passing a temporary pay zero copies; callers passing an lvalue pay exactly one. You will see this in Module A (move semantics).</p>
<p><b>C++ vs Java/Python.</b> Java passes everything by value, but object variables hold references, so a method can mutate an object but never rebind the caller's variable. Python is similar ("pass by object reference"). C++ is the only one of the three where <code>void f(vector&lt;int&gt; v)</code> really <b>deep-copies</b> the whole container — a frequent performance shock for people coming from those languages.</p>`,
    aiEra: `<p><b>What AI changes:</b> linters and AI reviewers (clang-tidy's <code>performance-unnecessary-value-param</code>, Copilot reviews) now flag "this vector is passed by value but only read — use <code>const&amp;</code>" automatically. You no longer need to hunt for these by eye in a large codebase.</p>
<p><b>Use AI as a partner:</b> ask <i>"For each parameter in this file, should it be value, const&amp;, or &amp;? Explain each choice in one line."</i> Then check its reasoning against the decision table above — and ask it to explain the aliasing risk in any function that takes two references of the same type.</p>
<p><b>Where AI goes wrong:</b> it often over-applies <code>const&amp;</code> to <code>int</code> and <code>double</code> (slower, not faster), returns references to locals in "optimised" rewrites, and changes a by-value parameter to a reference without noticing the function modified its local copy — silently changing the caller's data. <b>What you must still own:</b> explaining in an interview <i>why</i> a choice is right, predicting the output of value-vs-reference trick questions, and spotting when a reference rewrite changed behaviour.</p>`,
    problems: [{
      title: 'Min, Max and Average in One Pass (Reference Out-Parameters)',
      level: 'Easy', tags: ['pass by reference', 'const reference', 'functions'], companies: ['Microsoft', 'Qualcomm', 'Samsung'],
      statement: `<p>Write a function that receives a <b>non-empty</b> vector of integers and gives back its minimum, maximum and average (as a <code>double</code>) to the caller. The vector may have up to 10<sup>6</sup> elements and the function may be called many times, so it must <b>not copy</b> the vector and must look at each element only once. Show both styles: <b>reference out-parameters</b> and <b>returning a struct</b>.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>6</sup>, |a[i]| ≤ 10<sup>9</sup> (the sum needs <code>long long</code>).`,
      example: `<p>Input ${H.arr([4, -2, 9, 1])} → min ${H.c('g', '-2')}, max ${H.c('g', '9')}, average ${H.c('g', '3')} because (4 − 2 + 9 + 1) / 4 = 12 / 4 = 3.</p>`,
      brute: {
        why: `<p>Three separate functions, each taking the vector <b>by value</b>: three full copies (3 × 4 MB for n = 10<sup>6</sup>) and three passes over the data. It also sums into an <code>int</code>, which overflows when values reach 10<sup>9</sup>. Correct for small inputs, wasteful and fragile for large ones.</p>`,
        code: R`int minOf(vector<int> v) { int m = v[0]; for (int x : v) m = min(m, x); return m; }   // copy #1
int maxOf(vector<int> v) { int m = v[0]; for (int x : v) m = max(m, x); return m; }   // copy #2
double avgOf(vector<int> v) {                                                       // copy #3
    int s = 0;                       // int overflows for large values
    for (int x : v) s += x;
    return (double)s / v.size();
}`
      },
      mcq: { q: 'Which signature reads the vector without copying it and lets the function hand three results back?', options: ['<code>void stats(vector&lt;int&gt; v, int mn, int mx, double avg)</code>', '<code>void stats(const vector&lt;int&gt;&amp; v, int&amp; mn, int&amp; mx, double&amp; avg)</code>', '<code>void stats(vector&lt;int&gt;&amp; v, const int&amp; mn, const int&amp; mx, const double&amp; avg)</code>', '<code>void stats(const vector&lt;int&gt; v, int mn, int mx, double avg)</code>'], answer: 1, explain: 'Input: const reference (no copy, read-only). Outputs: non-const references so writes reach the caller. Option 3 has it backwards — the outputs are const and cannot be written.' },
      hints: [`<p>Hint 1: The input is big and read-only → <code>const vector&lt;int&gt;&amp;</code>. The outputs must change the caller's variables → <code>int&amp;</code> / <code>double&amp;</code>.</p>`, `<p>Hint 2: Start min and max at <code>v[0]</code> (not 0 — the numbers can all be negative), then one loop updates min, max and a <code>long long</code> sum together.</p>`, `<p>Hint 3: Compute the average as <code>(double)sum / v.size()</code> — cast <b>before</b> dividing or you get integer division. Modern alternative: return a <code>struct Stats { int mn, mx; double avg; }</code> and unpack with <code>auto [mn, mx, avg] = ...</code>.</p>`],
      solution: {
        approach: `<p>One pass with a <code>const&amp;</code> input (zero copies) and reference outputs. The struct-returning version is the more modern style: the signature documents the results, and return value optimisation makes it free. Both are O(n) with a single pass.</p>`,
        code: R`#include <bits/stdc++.h>
using namespace std;

// Style 1: reference out-parameters.
void stats(const vector<int>& v, int& mn, int& mx, double& avg) {
    mn = mx = v[0];                   // never start at 0: values may be negative
    long long sum = 0;                // 10^6 * 10^9 needs 64 bits
    for (int x : v) {                 // const& input: no copy of the vector
        if (x < mn) mn = x;
        if (x > mx) mx = x;
        sum += x;
    }
    avg = (double)sum / v.size();     // cast first: avoid integer division
}

// Style 2 (preferred today): return a struct.
struct Stats { int mn, mx; double avg; };

Stats statsOf(const vector<int>& v) {
    Stats s{v[0], v[0], 0.0};
    long long sum = 0;
    for (int x : v) { s.mn = min(s.mn, x); s.mx = max(s.mx, x); sum += x; }
    s.avg = (double)sum / v.size();
    return s;
}

int main() {
    vector<int> a = {4, -2, 9, 1};
    int lo, hi; double av;
    stats(a, lo, hi, av);
    cout << lo << " " << hi << " " << av << "\n";      // -2 9 3

    auto [mn, mx, avg] = statsOf(a);                    // structured bindings
    cout << mn << " " << mx << " " << avg << "\n";      // -2 9 3
}`,
        dry: { head: ['x', 'mn', 'mx', 'sum'], rows: [['(start)', '4', '4', '0'], ['4', '4', '4', '4'], ['-2', H.c('g', '-2'), '4', '2'], ['9', '-2', H.c('g', '9'), '11'], ['1', '-2', '9', '12 → avg 12/4 = <b>3</b>']] },
        complexity: `<p>Time O(n), one pass. Extra space O(1) — the vector is never copied. The brute force used O(n) extra memory per call and three passes.</p>`,
        followUps: ['Also return the index of the first minimum.', 'Make it work for an empty vector by returning <code>std::optional&lt;Stats&gt;</code>.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — Default arguments and function overloading
     ====================================================================== */
  function literalType(s) {
    s = String(s).trim();
    if (/^-?\d+$/.test(s)) return 'int';
    if (/^-?\d+[lL]$/.test(s)) return 'long';
    if (/^-?(\d+\.\d*|\.\d+)([eE]-?\d+)?[fF]$/.test(s)) return 'float';
    if (/^-?(\d+\.\d*|\.\d+)([eE]-?\d+)?$/.test(s)) return 'double';
    if (/^'.'$/.test(s)) return 'char';
    if (s === 'true' || s === 'false') return 'bool';
    if (/^".*"$/.test(s)) return 'const char*';
    throw new Error('Enter a C++ literal: 42, 42L, 3.5, 3.5f, \'a\', true or "hi"');
  }
  topics.push({
    title: 'Default Arguments & Function Overloading',
    analogy: `<p><b>Default arguments</b> are a coffee shop's standard order: "a coffee" means <i>medium, with milk</i> unless you say otherwise. You only mention the parts you want to change — but you can only skip from the <b>end</b> of the list ("medium, no milk" works; "skip the size, but no milk" is confusing). <b>Overloading</b> is like the word <i>"play"</i>: "play the guitar", "play football", "play a video". Same word, different action, and you know which one from <b>what follows it</b>. The C++ compiler picks among same-named functions the same way — by looking at the <b>types of the arguments</b>.</p>`,
    explain: `<h4>1. Default arguments</h4>
<pre><code>void greet(const string&amp; name, const string&amp; word = "Hello", int times = 1);

greet("Ana");              // greet("Ana", "Hello", 1)
greet("Ana", "Hi");        // greet("Ana", "Hi", 1)
greet("Ana", "Hi", 3);     // nothing defaulted</code></pre>
<p>The compiler simply <b>fills in the missing arguments at the call site</b>. Three rules:</p>
<ul><li><b>Trailing only.</b> Once a parameter has a default, every parameter after it needs one too. <code>void f(int a = 1, int b);</code> is an error — there is no way to skip <code>a</code> but give <code>b</code>.</li><li><b>Say it once.</b> Put the default in the <b>declaration</b> (usually the header) and <b>not</b> again in the definition. Repeating it is a compile error ("default argument given for parameter 2").</li><li><b>You cannot skip the middle.</b> <code>greet("Ana", , 3)</code> is not C++. If you need that, use overloads or pass a small options struct with designated initialisers (C++20): <code>draw({.width = 3, .dashed = true})</code>.</li></ul>
<h4>2. Overloading — same name, different parameter lists</h4>
<pre><code>int    area(int side)               { return side * side; }       // square
int    area(int w, int h)           { return w * h; }             // rectangle
double area(double r)               { return 3.14159 * r * r; }   // circle</code></pre>
<p>Overloads must differ in the <b>number</b> or <b>types</b> of parameters. They <b>cannot</b> differ only in the return type: <code>int f();</code> and <code>double f();</code> together are an error, because a call <code>f()</code> would give the compiler no way to choose.</p>
<h4>3. How the compiler chooses (overload resolution)</h4>
<p>For a call, the compiler collects all functions with that name, throws out those that cannot accept the arguments, then ranks the rest by how much each argument has to be "bent" to fit:</p>
${H.table(['rank', 'kind of match', 'example (argument → parameter)'], [[H.c('g', '1 (best)'), 'exact match (incl. adding const, array→pointer)', '<code>int → int</code>, <code>int → const int&amp;</code>'], [H.c('b', '2'), 'promotion (small → its "natural" bigger type)', '<code>char/short/bool → int</code>, <code>float → double</code>'], [H.c('y', '3'), 'standard conversion', '<code>int → double</code>, <code>double → int</code>, <code>long → int</code>, pointer → <code>bool</code>'], [H.c('r', '4 (worst)'), 'user-defined conversion', '<code>const char* → std::string</code>']])}
<p>The best rank wins. If two candidates tie at the best rank → <b>ambiguous call</b>, compile error. Example: with only <code>f(int)</code> and <code>f(double)</code>, the call <code>f(5L)</code> (a <code>long</code>) needs a conversion to <i>either</i> → ambiguous.</p>
<h4>4. Overloads vs default arguments</h4>
<p>Use a <b>default argument</b> when the behaviour is the same and only a value changes (<code>print(v, sep = " ")</code>). Use <b>overloads</b> when the work is genuinely different for different types (area of a circle vs a rectangle). Do not mix them carelessly: <code>void f(int);</code> plus <code>void f(int, int = 0);</code> makes <code>f(1)</code> ambiguous.</p>`,
    clues: [
      '"optional parameter", "if not given, use …", "with a sensible default" → <b>default argument</b> (trailing, declared once)',
      '"the same operation for int, double and string", "print any of these types" → <b>overloading</b> (later: templates)',
      'Output question with <code>f(\'A\')</code>, <code>f(3.5f)</code> or <code>f("hi")</code> and several overloads → work through the <b>exact → promotion → conversion → user-defined</b> ranking',
      '"call of overloaded … is ambiguous" in an error message → two candidates tie; add an exact overload or cast the argument',
      '"Can functions be overloaded by return type?" → <b>No</b>; only the parameter list counts',
      '"Why is the default value in the header but not the .cpp?" → defaults are applied at the call site, which only sees the declaration'
    ],
    code: [R`#include <bits/stdc++.h>
using namespace std;

// ---- default arguments: declared once, trailing only ----
void printVec(const vector<int>& v, const string& sep = " ", bool newline = true);

// ---- overloads: same name, different parameter lists ----
void show(int x)            { cout << "int: " << x << "\n"; }
void show(double x)         { cout << "double: " << x << "\n"; }
void show(const string& s)  { cout << "string: " << s << "\n"; }
void show(int a, int b)     { cout << "pair: " << a << "," << b << "\n"; }

int main() {
    vector<int> v = {1, 2, 3};
    printVec(v);              // 1 2 3      (sep=" ", newline=true)
    printVec(v, ", ");        // 1, 2, 3
    printVec(v, "-", false);  // 1-2-3      (no newline)
    cout << "\n";

    show(42);                 // int: 42          exact match
    show(4.2);                // double: 4.2      exact match
    show(string("hey"));      // string: hey      exact match
    show(7, 8);               // pair: 7,8        chosen by argument COUNT
    show('A');                // int: 65          char -> int is a PROMOTION
    show(2.5f);               // double: 2.5      float -> double is a PROMOTION
    // show(5L);              // ERROR: ambiguous, long -> int and long -> double are both conversions
}

// Definition: do NOT repeat the default values here.
void printVec(const vector<int>& v, const string& sep, bool newline) {
    for (size_t i = 0; i < v.size(); ++i) cout << (i ? sep : "") << v[i];
    if (newline) cout << "\n";
}`],
    codeTitle: ['Default arguments and overload resolution in action'],
    viz: [{
      title: 'Overload resolution: which show() gets called?',
      input: '\'A\'',
      inputLabel: 'argument literal: 42, 42L, 3.5, 3.5f, \'A\', true, "hi"',
      gen: function (input) {
        var t = literalType(input);
        var lit = String(input).trim();
        var code = 'void show(int x);              // candidate 1\nvoid show(double x);           // candidate 2\nvoid show(const string& s);    // candidate 3\n\nshow(' + lit + ');';
        var R1 = { exact: [1, 'exact match'], promo: [2, 'promotion'], conv: [3, 'standard conversion'], user: [4, 'user-defined conversion'], none: [9, 'not viable'] };
        var table = {
          'int': ['exact', 'conv', 'none'], 'long': ['conv', 'conv', 'none'], 'double': ['conv', 'exact', 'none'], 'float': ['conv', 'promo', 'none'],
          'char': ['promo', 'conv', 'none'], 'bool': ['promo', 'conv', 'none'], 'const char*': ['none', 'none', 'user']
        }[t];
        var names = ['show(int)', 'show(double)', 'show(const string&)'];
        var why = {
          'int': ['int → int', 'int → double', 'no conversion from int to string'],
          'long': ['long → int (narrowing)', 'long → double', 'no conversion'],
          'double': ['double → int (drops decimals)', 'double → double', 'no conversion'],
          'float': ['float → int', 'float → double', 'no conversion'],
          'char': ['char → int', 'char → double', 'no conversion from char to string'],
          'bool': ['bool → int', 'bool → double', 'no conversion'],
          'const char*': ['pointer → int: not allowed', 'pointer → double: not allowed', 'string has a constructor taking const char*']
        }[t];
        var rows = [], frames = [];
        function tbl(hl) { return { type: 'table', label: 'Candidates for show(' + esc(lit) + ')', columns: ['candidate', 'conversion needed', 'rank'], rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }; }
        frames.push({ narr: 'Step 1 — work out the argument\'s type: <code>' + esc(lit) + '</code> is a <b>' + t + '</b>. Step 2 — collect every function named <code>show</code> visible here: 3 candidates.', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 5: 'cur' } }, { type: 'vars', vals: { argument: lit, type: t } }] });
        for (var k = 0; k < 3; k++) {
          var r = R1[table[k]];
          rows.push([names[k], why[k], r[0] === 9 ? '✗ ' + r[1] : r[0] + ' — ' + r[1]]);
          var hl = {}; hl[k] = r[0] === 9 ? 'bad' : 'cur';
          var codeHl = {}; codeHl[k + 1] = r[0] === 9 ? 'bad' : 'cur';
          frames.push({ narr: 'Check <b>' + names[k].replace('&', '&amp;') + '</b>: ' + why[k] + ' → ' + (r[0] === 9 ? '<span class="c-r">not viable</span>, thrown out.' : 'rank <b>' + r[0] + '</b> (' + r[1] + ').'), parts: [{ type: 'code', lang: 'cpp', code: code, hl: codeHl }, tbl(hl)] });
        }
        var best = 9, winners = [];
        for (var k2 = 0; k2 < 3; k2++) { var rk = R1[table[k2]][0]; if (rk < best) { best = rk; winners = [k2]; } else if (rk === best && rk !== 9) winners.push(k2); }
        if (winners.length === 1) {
          var whl = {}; whl[winners[0]] = 'sel';
          var ch = {}; ch[winners[0] + 1] = 'ok'; ch[5] = 'ok';
          frames.push({ narr: 'Best rank is <b>' + best + '</b> and only one candidate has it → the compiler calls <b>' + names[winners[0]].replace('&', '&amp;') + '</b>.' + (t === 'char' ? ' Surprise for many: a char goes to <code>int</code> (prints 65 for \'A\'), not to string.' : '') + (t === 'const char*' ? ' Careful: if a <code>show(bool)</code> overload existed, it would win — pointer → bool is a standard conversion (rank 3), better than user-defined (rank 4)!' : ''), parts: [{ type: 'code', lang: 'cpp', code: code, hl: ch }, tbl(whl)] });
        } else {
          var bhl = {}; winners.forEach(function (w) { bhl[w] = 'bad'; });
          frames.push({ narr: '<span class="c-r">Tie!</span> ' + winners.length + ' candidates share the best rank ' + best + ' → <b>error: call of overloaded show(' + t + ') is ambiguous</b>. Fix: cast (<code>show((int)x)</code>) or add an exact <code>show(' + t + ')</code> overload.', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 5: 'bad' } }, tbl(bhl)] });
        }
        return frames;
      }
    }, {
      title: 'Default arguments are filled in at the call site',
      input: 'Ana, Hi',
      inputLabel: '1 to 3 arguments: name[, word[, times]]',
      gen: function (input) {
        var parts = String(input || '').split(',').map(function (x) { return x.trim(); }).filter(function (x) { return x.length; });
        if (parts.length < 1 || parts.length > 3) throw new Error('Give 1 to 3 comma-separated values, e.g. Ana, Hi, 2');
        if (parts.some(function (p) { return p.length > 12 || /[<>&"]/.test(p); })) throw new Error('Keep each value short and without < > & or quotes');
        if (parts.length === 3 && !/^[1-4]$/.test(parts[2])) throw new Error('times must be a number from 1 to 4');
        var name = parts[0], word = parts.length > 1 ? parts[1] : 'Hello', times = parts.length > 2 ? Number(parts[2]) : 1;
        var call = 'greet("' + name + '"' + (parts.length > 1 ? ', "' + parts[1] + '"' : '') + (parts.length > 2 ? ', ' + parts[2] : '') + ');';
        var code = 'void greet(const string& name,\n           const string& word = "Hello",\n           int times = 1) {\n    for (int i = 0; i < times; ++i)\n        cout << word << ", " << name << "!\\n";\n}\n// in main:\n' + call;
        var frames = [];
        frames.push({ narr: 'You wrote <code>' + esc(call) + '</code> with <b>' + parts.length + '</b> argument(s). The function has 3 parameters.', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 8: 'cur' } }, { type: 'table', label: 'Parameter filling', columns: ['parameter', 'value', 'came from'], rows: [['name', '?', ''], ['word', '?', ''], ['times', '?', '']] }] });
        var rows = [['name', '"' + name + '"', 'your argument']];
        frames.push({ narr: 'Arguments fill parameters <b>left to right</b>: name = "' + esc(name) + '".', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 1: 'ok' } }, { type: 'table', label: 'Parameter filling', columns: ['parameter', 'value', 'came from'], rows: rows.concat([['word', '?', ''], ['times', '?', '']]), hl: { 0: 'sel' } }] });
        rows.push(['word', '"' + word + '"', parts.length > 1 ? 'your argument' : 'DEFAULT']);
        frames.push({ narr: parts.length > 1 ? 'word = "' + esc(word) + '" from your second argument.' : 'No second argument → the compiler <b>inserts the default</b> "Hello" right here at the call site, as if you had typed it.', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 2: parts.length > 1 ? 'ok' : 'sel' } }, { type: 'table', label: 'Parameter filling', columns: ['parameter', 'value', 'came from'], rows: rows.concat([['times', '?', '']]), hl: { 1: parts.length > 1 ? 'sel' : 'cur' } }] });
        rows.push(['times', String(times), parts.length > 2 ? 'your argument' : 'DEFAULT']);
        frames.push({ narr: parts.length > 2 ? 'times = ' + times + ' from your third argument.' : 'No third argument → default <b>times = 1</b> is inserted.', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 3: parts.length > 2 ? 'ok' : 'sel' } }, { type: 'table', label: 'Parameter filling', columns: ['parameter', 'value', 'came from'], rows: rows.map(function (r) { return r.slice(); }), hl: { 2: parts.length > 2 ? 'sel' : 'cur' } }] });
        var o = '';
        for (var i = 0; i < times; i++) {
          o += word + ', ' + name + '!\n';
          frames.push({ narr: 'Loop round i = ' + i + ': print the greeting.', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 4: 'cur', 5: 'ok' } }, { type: 'vars', vals: { name: name, word: word, times: times, i: i } }, out(o)] });
        }
        frames.push({ narr: 'Done. The actual call compiled was <code>greet("' + esc(name) + '", "' + esc(word) + '", ' + times + ')</code>. Defaults cost nothing at run time — they are just text the compiler fills in.', parts: [{ type: 'table', label: 'Final call', columns: ['parameter', 'value', 'came from'], rows: rows }, out(o)] });
        return frames;
      }
    }],
    examples: [
      { title: 'Predict the output: char and float arguments', html: `<p><code>'A' + 1</code> is an <code>int</code> (66), so the first call picks <code>f(int)</code>. <code>'A'</code> alone is a <code>char</code>, which <b>promotes</b> to int → also <code>f(int)</code>. <code>1.5f</code> is a float, which <b>promotes</b> to double → <code>f(double)</code>. Output: <b>int 66 / int 65 / double 1.5</b>.</p>`, code: R`void f(int x)    { cout << "int " << x << "\n"; }
void f(double x) { cout << "double " << x << "\n"; }

int main() {
    f('A' + 1);   // int 66
    f('A');       // int 65   (char -> int promotion)
    f(1.5f);      // double 1.5 (float -> double promotion)
}` },
      { title: 'The famous trap: a string literal picks bool', html: `<p><code>"hello"</code> is a <code>const char*</code>. Converting a pointer to <code>bool</code> is a <b>standard conversion</b>; converting it to <code>std::string</code> is a <b>user-defined conversion</b>, which ranks worse. So <code>log("hello")</code> calls the <b>bool</b> version and prints <b>bool: 1</b>. Fix: add a <code>log(const char*)</code> overload, or pass <code>"hello"s</code> / <code>string("hello")</code>.</p>`, code: R`void logIt(bool b)            { cout << "bool: " << b << "\n"; }
void logIt(const string& s)   { cout << "string: " << s << "\n"; }

int main() {
    logIt("hello");               // bool: 1  (!)
    logIt(string("hello"));       // string: hello
    using namespace std::string_literals;
    logIt("hello"s);              // string: hello
}` },
      { title: 'Default argument rules that cause compile errors', html: `<p>Defaults must be at the end, and a default is given only once — in the first declaration the caller sees. Both commented lines would fail to compile. Default values can be any expression, even a function call; they are evaluated <b>at each call</b>, so <code>stamp()</code> gets a fresh counter value each time: output <b>1 2 7</b>.</p>`, code: R`// void bad(int a = 1, int b);          // ERROR: b needs a default too
int counter = 0;
int nextId() { return ++counter; }

void stamp(int id = nextId());           // default evaluated at EACH call
// void stamp(int id = nextId()) { }     // ERROR: default repeated in definition

void stamp(int id) { cout << id << " "; }

int main() {
    stamp(); stamp(); stamp(7);          // 1 2 7
}` },
      { title: 'Overload + default argument = ambiguity', html: `<p>Both <code>area(int)</code> and <code>area(int, int = 1)</code> can be called with one argument, both as exact matches → <b>ambiguous</b>. Pick one design: either keep only the defaulted version, or drop the default. The two-argument call is fine.</p>`, code: R`int area(int side)            { return side * side; }
int area(int w, int h = 1)    { return w * h; }

int main() {
    cout << area(3, 4) << "\n";   // 12: only the 2-parameter version fits
    // cout << area(3);           // ERROR: call of overloaded 'area(int)' is ambiguous
}` },
      { title: 'Return type alone cannot overload', html: `<p>The compiler identifies a function by its name and parameter types, so these two declarations clash: "functions that differ only in their return type cannot be overloaded". If you need different result types, give the functions different names or different parameters (or, later, use templates).</p>`, code: R`int    parse(const string& s) { return stoi(s); }
// double parse(const string& s) { return stod(s); }   // ERROR: differs only by return type
double parseDouble(const string& s) { return stod(s); } // fix: a different name` }
    ],
    deepDive: `<p><b>Name mangling — how overloads coexist.</b> The linker only understands plain symbol names, so the compiler encodes the parameter types into each function's symbol: with GCC/Clang (Itanium ABI) <code>show(int)</code> becomes <code>_Z4showi</code>, <code>show(double)</code> becomes <code>_Z4showd</code>, and <code>show(const std::string&amp;)</code> becomes a longer <code>_Z4showRKNSt7__cxx1112basic_string…</code>. Run <code>nm a.out | c++filt</code> to see them demangled. The return type is not part of a normal function's mangled name — another way to see why you cannot overload on it. <code>extern "C"</code> turns mangling off (needed to call C++ from C or Python's ctypes), which is also why C functions cannot be overloaded.</p>
<p><b>The full overload-resolution algorithm.</b> (1) <b>Name lookup</b> finds candidates — including ones found by <b>argument-dependent lookup</b> (ADL) in the namespaces of the argument types; this is how <code>cout &lt;&lt; s</code> finds <code>std::operator&lt;&lt;</code>. (2) Keep the <b>viable</b> ones (right number of arguments counting defaults, each argument convertible). (3) Pick the one that is <b>at least as good for every argument and strictly better for one</b>. With several arguments it is easy to get ambiguity: <code>f(int, double)</code> vs <code>f(double, int)</code> called with <code>f(1, 1)</code> is ambiguous. A non-template is preferred over a template when they tie.</p>
<p><b>Defaults are static.</b> Default arguments belong to the <b>declaration the caller sees</b>, not to the function. Consequences: different translation units could (illegally but silently) see different defaults; and for <b>virtual</b> functions the default comes from the <b>static</b> type of the pointer, not from the overriding function — a classic advanced trap you will meet in the OOP modules. Changing a default in a library header is an API change: callers must recompile to pick it up.</p>
<p><b>Overloads vs templates.</b> If the bodies of your overloads are identical except for the type, that is a template waiting to happen (<code>template &lt;class T&gt; T maxOf(T a, T b)</code>) — covered in module A. If the bodies differ, overloading is the right tool.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tools generate overload sets and default parameters readily, and can explain a scary "call of overloaded … is ambiguous" error in plain words. Asking <i>"which overload does this call pick and why?"</i> usually gets a correct answer for simple cases.</p>
<p><b>Use AI as a partner:</b> paste an overload set and ask <i>"For each of these 6 calls, which overload is chosen and what conversion rank applies?"</i> — then verify with the compiler (add a print in each overload). Ask it to propose whether a design should use overloading, default arguments, a template, or an options struct.</p>
<p><b>Where AI goes wrong:</b> the subtle rankings — <code>const char*</code> → <code>bool</code> beating <code>std::string</code>, <code>0</code> vs <code>nullptr</code> with pointer overloads, and ambiguities that appear only when a default argument is added. Models also sometimes "fix" an ambiguity with a cast that silently changes which function runs. <b>What you must still own:</b> the exact → promotion → conversion → user-defined ladder, the "defaults trailing and declared once" rules, and the judgement of when a new overload makes an API confusing.</p>`,
    problems: [{
      title: 'Overloaded area() with a Default Unit',
      level: 'Easy', tags: ['overloading', 'default arguments', 'functions'], companies: ['Infosys', 'Wipro', 'Cisco'],
      statement: `<p>Write an overload set named <code>area</code>: <code>area(double r)</code> for a circle, <code>area(double w, double h)</code> for a rectangle, and <code>area(double a, double b, double c)</code> for a triangle with three sides (Heron's formula; return −1 if the sides cannot form a triangle). Add a <code>describe(double value, const string&amp; unit = "cm")</code> function that prints the value with 2 decimals and the unit squared. Read queries like <code>C 2</code>, <code>R 3 4</code>, <code>T 3 4 5</code> and print the answers.</p>`,
      constraints: `Up to 10<sup>4</sup> queries; all lengths are positive and ≤ 10<sup>4</sup>.`,
      example: `<p>Input:</p><pre>C 2\nR 3 4\nT 3 4 5\nT 1 2 10</pre><p>Output: ${H.c('g', '12.57 cm^2')}, ${H.c('g', '12.00 cm^2')}, ${H.c('g', '6.00 cm^2')}, ${H.c('r', 'invalid triangle')}. Why: π·2² ≈ 12.566; 3·4 = 12; a 3-4-5 triangle has semi-perimeter 6 and area √(6·3·2·1) = 6; 1 + 2 &lt; 10 so no triangle exists.</p>`,
      brute: {
        why: `<p>One function with a shape <b>string</b> and a vector of numbers, plus an if-ladder on the string. It works, but every caller must remember magic strings ("circle" vs "Circle"), the compiler cannot check the number of values, and a typo becomes a run-time bug instead of a compile-time error. Overloading moves that checking to the compiler.</p>`,
        code: R`double areaOf(const string& shape, const vector<double>& v) {
    if (shape == "circle") return 3.141592653589793 * v[0] * v[0];
    else if (shape == "rect") return v[0] * v[1];
    else if (shape == "tri") {
        double s = (v[0] + v[1] + v[2]) / 2;
        return sqrt(s * (s - v[0]) * (s - v[1]) * (s - v[2]));
    }
    return -1;    // unknown shape string: only discovered at run time
}`
      },
      mcq: { q: 'Which call is ambiguous if you add <code>double area(double w, double h = 1.0)</code> to the set?', options: ['<code>area(2.0, 3.0)</code>', '<code>area(2.0)</code>', '<code>area(1.0, 2.0, 3.0)</code>', 'None of them'], answer: 1, explain: 'area(2.0) would match both area(double) and area(double, double = 1.0) exactly → ambiguous. Two-argument and three-argument calls are still unique.' },
      hints: [`<p>Hint 1: Three functions with the same name and 1, 2 and 3 <code>double</code> parameters. The compiler picks by the <b>number</b> of arguments — no strings needed.</p>`, `<p>Hint 2: Heron: s = (a + b + c) / 2, area = √(s(s − a)(s − b)(s − c)). Check the triangle inequality first: every side must be shorter than the sum of the other two.</p>`, `<p>Hint 3: Put the default <code>unit = "cm"</code> only in the declaration of <code>describe</code>. Use <code>fixed &lt;&lt; setprecision(2)</code> for two decimals. Use a <code>switch</code> on the query letter to decide which overload to call.</p>`],
      solution: {
        approach: `<p>Overloads make each shape a separately type-checked function; the query letter is read once and a <code>switch</code> calls the right overload. The output helper uses a default argument for the unit so that most callers do not have to mention it. All work is O(1) per query.</p>`,
        code: R`#include <bits/stdc++.h>
using namespace std;

const double PI = acos(-1.0);

double area(double r)                     { return PI * r * r; }        // circle
double area(double w, double h)           { return w * h; }             // rectangle
double area(double a, double b, double c) {                             // triangle
    if (a + b <= c || a + c <= b || b + c <= a) return -1;              // impossible
    double s = (a + b + c) / 2;
    return sqrt(s * (s - a) * (s - b) * (s - c));                       // Heron
}

void describe(double value, const string& unit = "cm");   // default declared once

int main() {
    char kind;
    while (cin >> kind) {
        double x, y, z;
        switch (kind) {
            case 'C': cin >> x;           describe(area(x));       break;
            case 'R': cin >> x >> y;      describe(area(x, y));    break;
            case 'T': cin >> x >> y >> z; describe(area(x, y, z)); break;
            default:  cout << "unknown shape\n";
        }
    }
}

void describe(double value, const string& unit) {         // no default repeated
    if (value < 0) { cout << "invalid triangle\n"; return; }
    cout << fixed << setprecision(2) << value << " " << unit << "^2\n";
}`,
        dry: { head: ['query', 'overload chosen', 'computation', 'printed'], rows: [['C 2', 'area(double)', 'π·4 = 12.566', '12.57 cm^2'], ['R 3 4', 'area(double,double)', '3·4 = 12', '12.00 cm^2'], ['T 3 4 5', 'area(double,double,double)', 's=6, √(6·3·2·1)=6', '6.00 cm^2'], ['T 1 2 10', 'area(double,double,double)', '1+2 ≤ 10 → −1', H.c('r', 'invalid triangle')]] },
        complexity: `<p>O(1) time and space per query. Overload resolution happens at <b>compile time</b>, so choosing the right function costs nothing at run time.</p>`,
        followUps: ['Add <code>area(int side)</code> for a square — which calls change behaviour, and why is <code>area(2)</code> now different from <code>area(2.0)</code>?', 'Replace the overloads with a <code>std::variant&lt;Circle, Rect, Tri&gt;</code> and <code>std::visit</code> (module A).']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — C arrays vs std::array vs std::vector
     ====================================================================== */
  topics.push({
    title: 'C Arrays vs std::array vs std::vector (Size, Capacity & Growth)',
    analogy: `<p>A <b>C array</b> is an <b>egg carton glued to the shelf</b>: a fixed number of slots, side by side, and nothing written on it says how many slots it has — you must remember. Hand it to someone and they only get told "the carton starts here" (it <b>decays</b> to a pointer). A <b><code>std::array</code></b> is the same carton with the size <b>printed on the lid</b>: still fixed, but it knows its size and can be copied like a normal value. A <b><code>std::vector</code></b> is a <b>family that moves house</b>: it rents a flat with some spare rooms (<b>capacity</b>). When every room is full and a new baby arrives, it rents a flat about <b>twice as big</b>, moves everyone over, and gives the old flat back. Moving is expensive, but because the new flat is twice as big it happens rarely — so on average each new arrival is cheap.</p>`,
    explain: `<p>All three store elements <b>contiguously</b> — one right after another in memory — which is why <code>a[i]</code> is O(1): address of element i = start + i × size-of-one-element. They differ in <b>who knows the size</b> and <b>whether it can change</b>.</p>
${H.table(['', 'C array <code>int a[5]</code>', '<code>std::array&lt;int,5&gt;</code>', '<code>std::vector&lt;int&gt;</code>'], [['size fixed at', 'compile time', 'compile time', H.c('g', 'run time, can grow/shrink')], ['knows its size?', H.c('r', 'no (decays to pointer)'), H.c('g', '<code>.size()</code>'), H.c('g', '<code>.size()</code>')], ['copy with <code>=</code>', H.c('r', 'not allowed'), H.c('g', 'yes'), H.c('g', 'yes (deep copy)')], ['bounds-checked access', 'no', '<code>.at(i)</code>', '<code>.at(i)</code>'], ['lives', 'stack (if local)', 'stack (if local)', 'small header on stack, elements on the <b>heap</b>'], ['use it for', 'legacy / C APIs', 'small fixed sizes (e.g. 26 letters, 4 directions)', H.c('g', 'almost everything else')]])}
<h4>1. C arrays</h4>
<pre><code>int a[5] = {1, 2, 3};               // {1, 2, 3, 0, 0}: the rest become 0
int n = sizeof(a) / sizeof(a[0]);   // 20 / 4 = 5 — works ONLY where a is declared
int m = std::size(a);               // C++17: clearer, same result</code></pre>
<p>When you pass a C array to a function, it <b>decays</b> to a pointer to its first element. Inside the function <code>sizeof(arr)</code> gives the size of a <b>pointer</b> (8), not the array — so you must also pass the length. There is <b>no bounds check</b>: <code>a[10]</code> compiles and is undefined behaviour.</p>
<h4>2. std::array — a C array that behaves like a value</h4>
<pre><code>array&lt;int, 3&gt; b = {7, 8, 9};
array&lt;int, 3&gt; c = b;          // real copy
cout &lt;&lt; b.size() &lt;&lt; (b == c); // 3 1  — it knows its size and can be compared</code></pre>
<h4>3. std::vector — the default container</h4>
<pre><code>vector&lt;int&gt; v;              // empty
vector&lt;int&gt; w(5);           // five zeros
vector&lt;int&gt; z(5, -1);       // five -1s
vector&lt;int&gt; u = {3, 1, 4};  // from a list
v.push_back(10);            // add at the end: amortised O(1)
v.pop_back();               // remove the last: O(1)
v.size(); v.empty(); v.back(); v.front(); v.clear();</code></pre>
<p><b>Size vs capacity.</b> <code>size()</code> is how many elements you have. <code>capacity()</code> is how many fit before the vector must move to a bigger buffer. When <code>push_back</code> finds size == capacity, the vector allocates a bigger block (GCC/Clang: <b>×2</b>; MSVC: ×1.5), copies or moves every element across, and frees the old block. Because the size doubles, the total copying over n pushes is less than 2n → <b>amortised O(1)</b> per push.</p>
<p><b><code>reserve(n)</code></b> grabs capacity up front (no reallocations up to n) without changing the size. <b><code>resize(n)</code></b> changes the <b>size</b>, creating zero-valued elements. Mixing them up is a classic bug: after <code>v.reserve(5)</code>, <code>v[0] = 1</code> is still out of bounds because size is 0.</p>
<p><b>Invalidation.</b> When a vector reallocates, every pointer, reference and iterator into its old buffer becomes <b>dangling</b>. Never keep <code>int&amp; first = v[0];</code> across a <code>push_back</code>.</p>
<h4>4. 2D grids</h4>
<pre><code>int R = 3, C = 4;
vector&lt;vector&lt;int&gt;&gt; g(R, vector&lt;int&gt;(C, 0));   // 3 rows × 4 columns of 0
g[1][2] = 7;                                      // row 1, column 2</code></pre>`,
    clues: [
      '"array of size N" with N known only at run time → <b><code>vector</code></b> (C arrays need a compile-time size; VLAs are not standard C++)',
      '"fixed small table" (26 letters, 10 digits, 4 directions) → <b><code>std::array</code></b> or a C array',
      '"grid / matrix / board of R × C" → <code>vector&lt;vector&lt;int&gt;&gt; g(R, vector&lt;int&gt;(C))</code>; row-major loops',
      '"append n items" efficiently → <code>reserve(n)</code> then <code>push_back</code>; explain amortised O(1)',
      'Output question with <code>sizeof(arr)</code> inside a function → <b>array-to-pointer decay</b> (prints 8)',
      'N ≤ 10<sup>7</sup> ints locally → stack overflow risk; use a global or a <code>vector</code> (heap)'
    ],
    code: [R`#include <bits/stdc++.h>
using namespace std;

// C array parameter: really 'int* a' — the size must be passed separately.
long long sumC(const int a[], int n) {
    long long s = 0;
    for (int i = 0; i < n; ++i) s += a[i];
    return s;
}

// std::array keeps its size in the type.
int sumArr(const array<int, 4>& a) {
    int s = 0;
    for (int x : a) s += x;
    return s;
}

int main() {
    // ---- C array ----
    int c[5] = {1, 2, 3};                       // 1 2 3 0 0
    cout << sizeof(c) / sizeof(c[0]) << " " << size(c) << "\n";   // 5 5
    cout << sumC(c, 5) << "\n";                 // 6

    // ---- std::array ----
    array<int, 4> dirs = {1, 0, -1, 0};
    array<int, 4> copyDirs = dirs;              // real copy (a C array can't do this)
    cout << dirs.size() << " " << (dirs == copyDirs) << " " << sumArr(dirs) << "\n";  // 4 1 0

    // ---- std::vector: size vs capacity ----
    vector<int> v;
    for (int i = 1; i <= 9; ++i) {
        v.push_back(i * 10);
        cout << "size=" << v.size() << " cap=" << v.capacity() << "\n";  // cap: 1 2 4 4 8 8 8 8 16 (GCC)
    }

    vector<int> r;
    r.reserve(100);                             // capacity 100, size still 0
    cout << r.size() << " " << r.capacity() << "\n";   // 0 100

    vector<int> z;
    z.resize(3);                                // size 3: {0, 0, 0}
    z[2] = 5;                                   // OK: index 2 exists
    cout << z.size() << " " << z[2] << "\n";    // 3 5

    try {
        cout << z.at(10) << "\n";               // at() checks the index...
    } catch (const out_of_range& e) {
        cout << "caught out_of_range\n";        // ...and throws instead of UB
    }

    // ---- 2D grid ----
    int R = 3, C = 4;
    vector<vector<int>> g(R, vector<int>(C, 0));
    for (int i = 0; i < R; ++i)
        for (int j = 0; j < C; ++j)
            g[i][j] = i * C + j;                // row-major numbering 0..11
    cout << g[2][3] << "\n";                    // 11
}`],
    codeTitle: ['The three array types side by side, plus size/capacity and 2D grids'],
    viz: [{
      title: 'vector growth: push_back, reallocate, copy',
      input: '9',
      inputLabel: 'number of push_back calls (1-17)',
      gen: function (input) {
        var n = intOf(input, 1, 17, 'Enter a number of pushes from 1 to 17');
        var data = [], cap = 0, copies = 0, frames = [];
        function buf(vals, capacity, hl, label) {
          var cells = []; for (var i = 0; i < capacity; i++) cells.push(i < vals.length ? vals[i] : '·');
          return { type: 'array', label: label, values: cells.length ? cells : ['(no buffer)'], hl: hl || {} };
        }
        frames.push({ narr: 'An empty <code>vector&lt;int&gt;</code>: size 0, capacity 0, no heap buffer yet. The vector object itself is just 3 pointers (begin, end, end-of-capacity) = 24 bytes.', parts: [buf([], 0, {}, 'heap buffer'), { type: 'vars', vals: { size: 0, capacity: 0, 'elements copied so far': 0 } }] });
        for (var k = 1; k <= n; k++) {
          var val = k * 10;
          if (data.length === cap) {
            var oldCap = cap, newCap = cap === 0 ? 1 : cap * 2;
            if (oldCap > 0) {
              var bh = {}; for (var q = 0; q < oldCap; q++) bh[q] = 'bad';
              frames.push({ narr: '<code>push_back(' + val + ')</code>: size ' + data.length + ' == capacity ' + oldCap + ' → <span class="c-r">no room!</span> The vector must reallocate.', parts: [buf(data, oldCap, bh, 'old buffer (full)'), { type: 'vars', vals: { size: data.length, capacity: oldCap, 'elements copied so far': copies }, hl: { capacity: 'bad' } }] });
            }
            var ch = {}; for (var q2 = 0; q2 < data.length; q2++) ch[q2] = 'done';
            copies += data.length;
            frames.push({ narr: 'Allocate a new buffer of capacity <b>' + newCap + '</b>' + (oldCap ? ' (double)' : '') + ', copy/move the ' + data.length + ' old element(s) across, free the old buffer. Any pointer or reference into the old buffer is now <b>dangling</b>.', parts: [buf(data, newCap, ch, 'new buffer'), { type: 'vars', vals: { size: data.length, capacity: newCap, 'elements copied so far': copies }, hl: { capacity: 'ok', 'elements copied so far': data.length ? 'cur' : '' } }] });
            cap = newCap;
          }
          data.push(val);
          var nh = {}; nh[data.length - 1] = 'ok';
          frames.push({ narr: 'Write <b>' + val + '</b> into slot ' + (data.length - 1) + '. size = ' + data.length + ', capacity = ' + cap + '.' + (data.length < cap ? ' ' + (cap - data.length) + ' spare slot(s): the next push is O(1) with no copying.' : ''), parts: [buf(data, cap, nh, 'heap buffer'), { type: 'vars', vals: { size: data.length, capacity: cap, 'elements copied so far': copies }, hl: { size: 'ok' } }, { type: 'bars', label: 'total copies vs pushes', values: [copies, data.length], texts: [String(copies), String(data.length)], idxLabels: ['copies', 'pushes'] }] });
        }
        frames.push({ narr: 'After ' + n + ' pushes: ' + copies + ' element copies in total — always fewer than 2 × pushes = ' + (2 * n) + '. That is why <code>push_back</code> is <b>amortised O(1)</b>. Calling <code>v.reserve(' + n + ')</code> first would make it 0 copies.', parts: [buf(data, cap, {}, 'final buffer'), { type: 'vars', vals: { size: data.length, capacity: cap, copies: copies, '2n': 2 * n }, hl: { copies: 'sel' } }] });
        return frames;
      }
    }, {
      title: 'Array decay: why sizeof changes inside a function',
      gen: function () {
        var code = 'void f(int arr[]) {               // really: int* arr\n    cout << sizeof(arr);           // size of a POINTER\n}\nint main() {\n    int a[5] = {1, 2, 3, 4, 5};\n    cout << sizeof(a) << " ";      // whole array\n    f(a);\n}';
        function G(hl, ehl, edges) {
          return { type: 'graph', label: 'What each function can see', directed: true, height: 55,
            nodes: [{ id: 'A', label: 'main: a = [1 2 3 4 5] (20 bytes)', x: 30, y: 15, shape: 'box', w: 52 }, { id: 'P', label: 'f: arr = address of a[0] (8 bytes)', x: 70, y: 42, shape: 'box', w: 52 }],
            edges: edges || [], hl: hl || {}, ehl: ehl || {} };
        }
        return [
          { narr: 'main declares <code>int a[5]</code>: five ints side by side = 5 × 4 = <b>20 bytes</b>. The compiler knows the full type <code>int[5]</code> here.', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 5: 'cur' } }, G({ A: 'ok' }), out('')] },
          { narr: '<code>sizeof(a)</code> in main = <b>20</b>. Dividing by <code>sizeof(a[0])</code> (4) gives the length 5.', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 6: 'cur' } }, G({ A: 'sel' }), out('20 ')] },
          { narr: 'Calling <code>f(a)</code>: the array <b>decays</b> — only the address of a[0] is passed. The parameter <code>int arr[]</code> is secretly <code>int* arr</code>; the length is lost.', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 7: 'cur', 1: 'cur' } }, G({ P: 'cur' }, { 'P-A': 'ok' }, [['P', 'A', 'points to a[0]']]), out('20 ')] },
          { narr: 'Inside f, <code>sizeof(arr)</code> = size of a pointer = <b>8</b> on a 64-bit machine. Output: <b>20 8</b>. GCC even warns: "sizeof on array function parameter will return size of int*". Fix: pass the length, use <code>std::array</code>/<code>vector</code>, or <code>std::span</code> (C++20).', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 2: 'bad' } }, G({ P: 'bad' }, { 'P-A': 'ok' }, [['P', 'A', 'points to a[0]']]), out('20 8')] }
        ];
      }
    }, {
      title: '2D vector: row-major traversal of a grid',
      input: '3 4',
      inputLabel: 'rows cols (each 1-6)',
      gen: function (input) {
        var rc = intsOf(input, 2, 2, 1, 6, 'Enter rows and cols from 1 to 6, e.g. 3 4');
        var R0 = rc[0], C0 = rc[1], g = [], frames = [];
        for (var i = 0; i < R0; i++) { var row = []; for (var j = 0; j < C0; j++) row.push(0); g.push(row); }
        function snap() { return g.map(function (r) { return r.slice(); }); }
        var colHead = [], rowHead = [];
        for (var j2 = 0; j2 < C0; j2++) colHead.push('j=' + j2);
        for (var i2 = 0; i2 < R0; i2++) rowHead.push('i=' + i2);
        var code = 'vector<vector<int>> g(R, vector<int>(C, 0));\nfor (int i = 0; i < R; ++i)\n    for (int j = 0; j < C; ++j)\n        g[i][j] = i * C + j;';
        frames.push({ narr: '<code>vector&lt;vector&lt;int&gt;&gt; g(' + R0 + ', vector&lt;int&gt;(' + C0 + ', 0))</code>: ' + R0 + ' rows, each its own vector of ' + C0 + ' zeros.', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 1: 'cur' } }, { type: 'grid', label: 'g', rows: snap(), rowHead: rowHead, colHead: colHead }] });
        var cnt = 0;
        for (var a = 0; a < R0; a++) for (var b = 0; b < C0; b++) {
          g[a][b] = a * C0 + b; cnt++;
          if (cnt > 14 && !(a === R0 - 1 && b === C0 - 1)) continue;
          var h = {}; h[a + ',' + b] = 'cur';
          frames.push({ narr: 'i = ' + a + ', j = ' + b + ': <code>g[' + a + '][' + b + '] = ' + a + '×' + C0 + ' + ' + b + ' = ' + (a * C0 + b) + '</code>. The inner loop walks across a row; this "row-major" order matches memory layout, so it is cache-friendly.', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 4: 'cur' } }, { type: 'vars', vals: { i: a, j: b }, hl: { j: 'cur' } }, { type: 'grid', label: 'g', rows: snap(), rowHead: rowHead, colHead: colHead, hl: h }] });
        }
        frames.push({ narr: 'Done: ' + (R0 * C0) + ' cells filled (O(R × C)). Each row is a separate heap block; for speed-critical code a single <code>vector&lt;int&gt;(R*C)</code> indexed by <code>i*C + j</code> keeps everything in one block.', parts: [{ type: 'grid', label: 'g', rows: snap(), rowHead: rowHead, colHead: colHead }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Predict the output: reserve vs resize', html: `<p><code>reserve</code> changes only the capacity; the size stays 0, so <code>a.size()</code> prints <b>0</b>. <code>resize</code> creates real elements (zeros), so <code>b.size()</code> prints <b>4</b> and <code>b[3]</code> is valid. Writing <code>a[0] = 1</code> after only a reserve is undefined behaviour — use <code>push_back</code>.</p>`, code: R`vector<int> a, b;
a.reserve(4);
b.resize(4);
cout << a.size() << " " << a.capacity() << "\n";   // 0 4  (capacity at least 4)
cout << b.size() << " " << b[3] << "\n";           // 4 0` },
      { title: 'Reference invalidated by push_back', html: `<p><code>first</code> refers to the element inside the current buffer. When the next <code>push_back</code> finds no room, the vector moves to a new buffer and frees the old one, so <code>first</code> now refers to freed memory: <b>undefined behaviour</b>. AddressSanitizer reports it as "heap-use-after-free". Fix: store an <b>index</b> (<code>size_t idx = 0;</code>) or <code>reserve</code> enough first.</p>`, code: R`vector<int> v = {1, 2};          // size 2, capacity 2
int& first = v[0];
v.push_back(3);                   // reallocates: old buffer freed
// cout << first;                 // UB: dangling reference
size_t idx = 0;                   // safe alternative: indices survive reallocation
cout << v[idx] << "\n";           // 1` },
      { title: 'C arrays cannot be assigned or compared by value', html: `<p><code>b = a</code> does not compile for C arrays, and <code>a == b</code> compares <b>addresses</b> (after decay), which is false even when contents match. <code>std::array</code> fixes both: assignment copies, <code>==</code> compares element by element. Output: <b>0 1</b>.</p>`, code: R`int a[3] = {1, 2, 3}, b[3] = {1, 2, 3};
// b = a;                                // ERROR: arrays are not assignable
cout << (a == b) << " ";                 // 0: compares addresses (deprecated in C++20)
array<int, 3> x = {1, 2, 3}, y = {1, 2, 3};
cout << (x == y) << "\n";                // 1: compares contents` },
      { title: 'Counting with a fixed-size array', html: `<p>When the "keys" are small integers — letters, digits, ages 0–150 — a fixed array is the fastest map. Here <code>cnt[c - 'a']</code> turns a letter into an index 0–25. For "banana" the output is <b>a=3 b=1 n=2</b>. This pattern appears in anagram, frequency and "first unique character" questions.</p>`, code: R`string s = "banana";
array<int, 26> cnt{};                 // {} zero-initialises all 26 counters
for (char c : s) cnt[c - 'a']++;
for (int i = 0; i < 26; ++i)
    if (cnt[i]) cout << char('a' + i) << "=" << cnt[i] << " ";
cout << "\n";` },
      { title: 'Big arrays: stack vs heap', html: `<p>A local <code>int big[10000000];</code> needs 40 MB of <b>stack</b>, but the default stack is about 8 MB → crash before main does anything useful. A <b>global</b> array lives in static memory, and a <code>vector</code> keeps its elements on the <b>heap</b>, so both are fine. This is why competitive programmers declare big arrays globally or use vectors.</p>`, code: R`const int N = 10000000;
int globalBig[N];                       // OK: static storage, zero-initialised

int main() {
    // int localBig[N];                 // likely stack overflow (40 MB on the stack)
    vector<int> heapBig(N);             // OK: 40 MB on the heap
    globalBig[0] = heapBig[0] = 1;
    cout << globalBig[0] + heapBig[0] << "\n";   // 2
}` }
    ],
    deepDive: `<p><b>Why doubling gives amortised O(1).</b> Suppose we push n = 2<sup>k</sup> elements. Reallocations copy 1 + 2 + 4 + … + 2<sup>k−1</sup> = 2<sup>k</sup> − 1 &lt; n elements in total, plus n writes for the pushes themselves: fewer than 2n operations, so O(1) per push on average. If the vector grew by a <b>constant</b> (+10 each time) instead, the copies would be 10 + 20 + 30 + … ≈ n²/20 → O(n) per push. Any growth <b>factor</b> &gt; 1 works; 1.5 (MSVC, folly) lets freed blocks be reused by later growth, 2 (libstdc++, libc++) does fewer reallocations. Individual pushes are still occasionally O(n) — a latency spike that matters in real-time code, where you <code>reserve</code> up front.</p>
<p><b>Copy or move during reallocation?</b> For elements like <code>std::string</code>, the vector <b>moves</b> them to the new buffer (just pointer swaps) — but only if the type's move constructor is <code>noexcept</code>; otherwise it copies, to keep the strong exception guarantee. This is a real reason to mark your own move constructors <code>noexcept</code> (module A).</p>
<p><b>Memory layout.</b> A vector object is three pointers (begin, end, end-of-storage) — 24 bytes — no matter how many elements it holds; the elements sit in one heap block. <code>vector&lt;vector&lt;int&gt;&gt;</code> is a vector of such headers, each pointing at its own block, so rows are <b>not</b> contiguous with each other. Iterating <code>g[i][j]</code> with j in the inner loop is cache-friendly; with i in the inner loop it jumps between blocks and can be several times slower on big grids. <code>shrink_to_fit()</code> asks (non-bindingly) to drop spare capacity; <code>clear()</code> keeps the capacity.</p>
<p><b><code>vector&lt;bool&gt;</code> is special:</b> it packs bits, so <code>v[i]</code> returns a proxy object, not a <code>bool&amp;</code>, and <code>auto&amp; b = v[0]</code> does not compile. Use <code>vector&lt;char&gt;</code> or <code>bitset</code> when that matters. <b>Bounds:</b> <code>operator[]</code> is unchecked for speed; build debug runs with <code>-D_GLIBCXX_ASSERTIONS</code> or <code>-fsanitize=address</code> to catch out-of-range access, and C++26 adds standardised "hardened" checks.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tools default to <code>vector</code> for everything, which is usually the right call, and they write the 2D-vector boilerplate instantly. They are also good at explaining a sanitizer report like "heap-use-after-free" and pointing at the <code>push_back</code> that caused it.</p>
<p><b>Use AI as a partner:</b> ask <i>"Where in this function could a vector reallocation invalidate an iterator or reference?"</i>, or <i>"Should this be a C array, std::array, vector or span? Explain."</i>. Ask it to add <code>reserve</code> calls where the final size is known and to measure the difference with a quick benchmark.</p>
<p><b>Where AI goes wrong:</b> it writes <code>for (size_t i = v.size() - 1; i &gt;= 0; --i)</code>, uses <code>sizeof(arr)</code> on decayed parameters, confuses <code>reserve</code> with <code>resize</code>, and sometimes holds an iterator across <code>push_back</code> inside a loop — code that passes small tests and crashes on big ones. <b>What you must still own:</b> the size/capacity model, the amortised-O(1) argument (a favourite interview question), the invalidation rules, and the stack-vs-heap judgement for big arrays.</p>`,
    problems: [{
      title: 'Rotate an Array Right by k (In Place)',
      level: 'Medium', tags: ['vector', 'reverse', 'in-place', 'modulo'], companies: ['Microsoft', 'Amazon', 'Meta', 'Oracle'],
      statement: `<p>Given a <code>vector&lt;int&gt;&amp; nums</code>, rotate it to the <b>right</b> by <code>k</code> steps, in place, using O(1) extra memory. Each step moves the last element to the front. <code>k</code> may be larger than the length.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>5</sup>, 0 ≤ k ≤ 10<sup>9</sup>, |nums[i]| ≤ 2<sup>31</sup> − 1`,
      example: `<p>${H.arr([1, 2, 3, 4, 5, 6, 7])} with k = 3 → ${H.arr([5, 6, 7, 1, 2, 3, 4], { hl: { 0: 'g', 1: 'g', 2: 'g' } })}</p><p><b>Why:</b> the last 3 elements (5, 6, 7) wrap around to the front; everything else shifts right by 3. With k = 10 the answer is the same as k = 10 % 7 = 3.</p>`,
      brute: {
        why: `<p>Rotate by one step, k times: save the last element, shift everything right by one, put it at the front. Each step is O(n), so the total is O(n·k) — with n = 10<sup>5</sup> and k = 10<sup>9</sup> that is hopeless. Even after reducing k to k % n it can be 10<sup>10</sup>. The waste: each element moves one slot at a time instead of jumping straight to its final position.</p>`,
        code: R`void rotateBrute(vector<int>& nums, long long k) {
    int n = nums.size();
    k %= n;                                   // at least avoid full cycles
    for (long long step = 0; step < k; ++step) {
        int last = nums[n - 1];
        for (int i = n - 1; i > 0; --i)       // shift right by one: O(n)
            nums[i] = nums[i - 1];
        nums[0] = last;
    }
}`
      },
      mcq: { q: 'Reversing the whole array, then the first k, then the rest, gives a right rotation by k. What is the first reversal of [1,2,3,4,5,6,7]?', options: ['[7,6,5,4,3,2,1]', '[3,2,1,7,6,5,4]', '[5,6,7,1,2,3,4]', '[4,3,2,1,7,6,5]'], answer: 0, explain: 'Step 1 reverses everything → [7,6,5,4,3,2,1]. Then reverse the first k = 3 → [5,6,7,4,3,2,1], then the remaining 4 → [5,6,7,1,2,3,4].' },
      hints: [`<p>Hint 1: First replace k by <code>k % n</code> — rotating by n changes nothing. Then notice the answer is "the last k elements" followed by "the first n − k elements", each in its original order.</p>`, `<p>Hint 2: Reversing the whole array puts the last k elements at the front — but backwards. Reverse those k again to fix their order, and reverse the remaining n − k to fix theirs.</p>`, `<p>Hint 3: Write a helper <code>reverseRange(nums, lo, hi)</code> with two indices swapping toward the middle (pass <code>nums</code> by <b>reference</b>!). Call it three times: (0, n−1), (0, k−1), (k, n−1). Handle k = 0.</p>`],
      solution: {
        approach: `<p>The <b>three-reversal trick</b>. Reverse all n elements, then the first k, then the last n − k. Every element is swapped a constant number of times → O(n) time, O(1) extra space. The helper takes the vector by <b>reference</b> so it modifies the caller's data; passing by value would rotate a copy and leave <code>nums</code> unchanged.</p>`,
        code: R`#include <bits/stdc++.h>
using namespace std;

// Reverse nums[lo..hi] in place with two indices moving toward each other.
void reverseRange(vector<int>& nums, int lo, int hi) {
    while (lo < hi) {
        swap(nums[lo], nums[hi]);
        ++lo;
        --hi;
    }
}

void rotateRight(vector<int>& nums, long long k) {
    int n = nums.size();
    k %= n;                          // k may exceed n
    if (k == 0) return;
    reverseRange(nums, 0, n - 1);    // [7 6 5 4 3 2 1]
    reverseRange(nums, 0, k - 1);    // [5 6 7 | 4 3 2 1]
    reverseRange(nums, k, n - 1);    // [5 6 7 | 1 2 3 4]
}

int main() {
    vector<int> a = {1, 2, 3, 4, 5, 6, 7};
    rotateRight(a, 3);
    for (int x : a) cout << x << ' ';     // 5 6 7 1 2 3 4
    cout << "\n";
}`,
        alt: [R`// Extra-memory version (O(n) space): each element jumps straight to its final slot.
void rotateCopy(vector<int>& nums, long long k) {
    int n = nums.size();
    vector<int> res(n);
    for (int i = 0; i < n; ++i) res[(i + k) % n] = nums[i];
    nums = res;                      // copy back into the caller's vector
}`, R`// Standard library one-liner: std::rotate makes nums[n-k] the new first element.
void rotateStd(vector<int>& nums, long long k) {
    int n = nums.size();
    k %= n;
    rotate(nums.begin(), nums.begin() + (n - k), nums.end());
}`],
        dry: { head: ['step', 'range reversed', 'array after'], rows: [['start', '—', '1 2 3 4 5 6 7'], ['1', '0..6 (all)', '7 6 5 4 3 2 1'], ['2', '0..2 (first k=3)', H.c('g', '5 6 7') + ' 4 3 2 1'], ['3', '3..6 (rest)', H.c('g', '5 6 7 1 2 3 4')]] },
        complexity: `<p>Time O(n): about n swaps in total. Extra space O(1). The brute force was O(n·k).</p>`,
        followUps: ['Rotate left by k instead — which reversal order changes?', 'Rotate a string in place by k characters using the same helper on a <code>string&amp;</code>.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — std::string basics
     ====================================================================== */
  topics.push({
    title: 'std::string Basics: Indexing, find/substr, getline & Char Arithmetic',
    analogy: `<p>A <code>std::string</code> is a <b>train of letter carriages</b> with a smart engine at the front that always knows how many carriages there are (<code>size()</code>), can add carriages at the back (<code>+=</code>), cut out a section (<code>erase</code>), or build a copy of a few carriages (<code>substr</code>). The old C-style string (<code>char*</code>) is a train <b>without</b> that engine: to know where it ends you must walk along it until you hit a special empty "stop" carriage, the <code>'\\0'</code> character. Each carriage holds one <b>char</b> — really a small number (a code like 97 for <code>'a'</code>), which is why you can do maths on letters.</p>`,
    explain: `<h4>1. Creating and inspecting</h4>
<pre><code>string s = "hello";          // from a literal
string t(3, 'x');            // "xxx"
string e;                    // "" (empty)
s.size();  s.length();       // 5 (same thing)
s.empty();                   // false
s[0];      s.at(0);          // 'h' — at() checks bounds and throws
s.front(); s.back();         // 'h', 'o'</code></pre>
<p>Indices start at 0 and go to <code>size() - 1</code>, just like a vector — a string <i>is</i> basically a <code>vector&lt;char&gt;</code> with text helpers.</p>
<h4>2. Building and changing</h4>
${H.table(['operation', 'example (s = "hello")', 'result'], [['append', '<code>s += " world";</code>', '"hello world"'], ['push one char', '<code>s.push_back(\'!\');</code>', '"hello!"'], ['concatenate', '<code>s + "!" + s</code>', '"hello!hello"'], ['substring', '<code>s.substr(1, 3)</code> (start, <b>length</b>)', '"ell"'], ['find', '<code>s.find("ll")</code>', '2 (or <code>string::npos</code> if absent)'], ['erase', '<code>s.erase(1, 2);</code> (start, length)', '"hlo"'], ['insert', '<code>s.insert(0, "oh ");</code>', '"oh hello"'], ['replace', '<code>s.replace(0, 1, "J");</code>', '"Jello"'], ['compare', '<code>s == "hello"</code>, <code>s &lt; "help"</code>', 'true, true (dictionary order)']])}
<p><b>Watch out:</b> <code>substr(pos, len)</code> takes a <b>length</b>, not an end index (Java's <code>substring(begin, end)</code> is different!). And <code>find</code> returns <code>string::npos</code> (the biggest <code>size_t</code>) when nothing is found — always compare with <code>npos</code>, never with -1 stored in an <code>int</code>.</p>
<h4>3. Characters are small numbers</h4>
<p>A <code>char</code> stores a code: <code>'a'</code> = 97, <code>'b'</code> = 98 … <code>'A'</code> = 65, <code>'0'</code> = 48. Letters and digits are consecutive, so:</p>
${H.table(['you want', 'write', 'example'], [['digit char → number', '<code>c - \'0\'</code>', '\'7\' − \'0\' = 7'], ['letter → index 0..25', '<code>c - \'a\'</code>', '\'d\' − \'a\' = 3'], ['index → letter', '<code>char(\'a\' + i)</code>', 'i = 2 → \'c\''], ['upper/lower', '<code>toupper(c)</code>, <code>tolower(c)</code>', '\'q\' → \'Q\''], ['tests', '<code>isdigit</code>, <code>isalpha</code>, <code>isalnum</code>, <code>isspace</code>', 'from &lt;cctype&gt;']])}
<h4>4. Reading text: cin &gt;&gt; vs getline</h4>
<p><code>cin &gt;&gt; s</code> reads <b>one word</b> — it skips leading spaces and stops at the next whitespace. <code>getline(cin, s)</code> reads a <b>whole line</b> including spaces. Mixing them has a famous trap: after <code>cin &gt;&gt; n</code>, the Enter key's <code>'\\n'</code> is still waiting, so the next <code>getline</code> returns an <b>empty</b> line. Fix: <code>getline(cin &gt;&gt; ws, s)</code> or <code>cin.ignore()</code> first.</p>
<h4>5. Converting numbers and text</h4>
<pre><code>int n = stoi("42");            // string → int (throws invalid_argument on "abc")
long long b = stoll("9000000000");
double d = stod("3.5");
string s = to_string(123);     // int → "123"</code></pre>
<h4>6. Literal pitfalls</h4>
<p><code>"abc"</code> is <b>not</b> a <code>std::string</code>: it is a C array of 4 chars (<code>'a','b','c','\\0'</code>). So <code>"abc" + "def"</code> does not compile (you cannot add two arrays), and <code>"abc" + 1</code> compiles but means "pointer to the second char" → <code>"bc"</code>! Make one side a real string: <code>string("abc") + "def"</code> or <code>"abc"s + "def"</code> (with <code>using namespace std::string_literals;</code>).</p>`,
    clues: [
      '"palindrome", "reverse", "compare from both ends" → two indices on a <code>string</code>, O(1) extra space',
      '"count characters / anagram / first unique letter" → <code>array&lt;int, 26&gt;</code> indexed by <code>c - \'a\'</code>',
      '"read a full line / sentence with spaces" → <code>getline</code> (and <code>cin &gt;&gt; ws</code> after a number)',
      '"digits of a big number given as a string" → <code>c - \'0\'</code>, process right to left',
      '"build the answer string character by character" → <code>s += c</code> or <code>push_back</code> (amortised O(1)), never <code>s = s + c</code> (O(n) each)',
      '"find a substring / split on a delimiter" → <code>find</code> + <code>substr</code> (check <code>npos</code>), or <code>stringstream</code> for whitespace splitting'
    ],
    code: [R`#include <bits/stdc++.h>
using namespace std;

int main() {
    string s = "Hello, World";
    cout << s.size() << " " << s[0] << " " << s.back() << "\n";   // 12 H d

    // find + substr: split "key=value"
    string kv = "lang=cpp";
    size_t eq = kv.find('=');
    if (eq != string::npos) {                     // always check npos
        string key = kv.substr(0, eq);            // "lang"   (start, LENGTH)
        string val = kv.substr(eq + 1);           // "cpp"    (to the end)
        cout << key << " -> " << val << "\n";
    }

    // modify in place
    s.replace(0, 5, "Howdy");                     // "Howdy, World"
    s.erase(s.find(','), 1);                      // "Howdy World"
    s += '!';                                     // "Howdy World!"
    cout << s << "\n";

    // char arithmetic: sum the digits in a string, uppercase the letters
    string mixed = "a1b2c3";
    int digitSum = 0;
    string upper;
    for (char c : mixed) {
        if (isdigit((unsigned char)c)) digitSum += c - '0';   // '7' - '0' == 7
        else upper += (char)toupper((unsigned char)c);
    }
    cout << digitSum << " " << upper << "\n";     // 6 ABC

    // conversions
    int n = stoi("250");
    string back = to_string(n * 2);               // "500"
    cout << back << " has " << back.size() << " chars\n";

    // comparison is dictionary (lexicographic) order, char by char
    cout << boolalpha << (string("apple") < "banana") << " "
         << (string("10") < "9") << "\n";         // true true ('1' < '9')

    // reading: a number, then a full line
    int age;
    string fullName;
    if (cin >> age) {
        getline(cin >> ws, fullName);             // ws eats the leftover '\n'
        cout << fullName << " is " << age << "\n";
    }
}`],
    codeTitle: ['Everyday string operations'],
    viz: [{
      title: 'Two pointers on a string: valid palindrome',
      input: 'A man, a plan, a canal: Panama',
      inputLabel: 'text (up to 30 characters)',
      gen: function (input) {
        var s = String(input === undefined || input === null ? '' : input);
        if (!s.length || s.length > 30) throw new Error('Enter 1 to 30 characters of text');
        var chars = s.split('').map(function (c) { return c === ' ' ? '␣' : c; });
        var code = 'int i = 0, j = (int)s.size() - 1;\nwhile (i < j) {\n    if (!isalnum(s[i])) { ++i; continue; }\n    if (!isalnum(s[j])) { --j; continue; }\n    if (tolower(s[i]) != tolower(s[j])) return false;\n    ++i; --j;\n}\nreturn true;';
        var frames = [], i = 0, j = s.length - 1, done = {};
        function isAl(c) { return /[A-Za-z0-9]/.test(c); }
        function F(line, cls, narr, extraHl) {
          var hl = {}; Object.keys(done).forEach(function (k) { hl[k] = 'done'; });
          if (extraHl) Object.keys(extraHl).forEach(function (k) { hl[k] = extraHl[k]; });
          var ptr = {}; if (i === j && i >= 0 && i < s.length) ptr[i] = ['i', 'j']; else { if (i >= 0 && i < s.length) ptr[i] = 'i'; if (j >= 0 && j < s.length) ptr[j] = 'j'; }
          var ch = {}; ch[line] = cls || 'cur';
          frames.push({ narr: narr, parts: [{ type: 'array', label: 's', values: chars.slice(), hl: hl, ptr: ptr }, { type: 'code', lang: 'cpp', code: code, hl: ch }, { type: 'vars', vals: { i: i, j: j, 's[i]': i < s.length ? s[i] : '-', 's[j]': j >= 0 ? s[j] : '-' } }] });
        }
        F(1, 'cur', 'Put <b>i</b> at the first character and <b>j</b> at the last. We compare from both ends toward the middle — no reversed copy needed.');
        var steps = 0, result = true;
        while (i < j && steps < 60) {
          steps++;
          if (!isAl(s[i])) { var h1 = {}; h1[i] = 'bad'; F(3, 'bad', '<code>s[i]</code> = "' + esc(s[i] === ' ' ? 'space' : s[i]) + '" is not a letter or digit → skip it (<code>++i</code>).', h1); done[i] = 1; i++; continue; }
          if (!isAl(s[j])) { var h2 = {}; h2[j] = 'bad'; F(4, 'bad', '<code>s[j]</code> = "' + esc(s[j] === ' ' ? 'space' : s[j]) + '" is not a letter or digit → skip it (<code>--j</code>).', h2); done[j] = 1; j--; continue; }
          var a = s[i].toLowerCase(), b = s[j].toLowerCase();
          var hm = {}; hm[i] = a === b ? 'ok' : 'bad'; hm[j] = a === b ? 'ok' : 'bad';
          if (a !== b) { F(5, 'bad', 'Compare lowercase: "' + esc(a) + '" vs "' + esc(b) + '" → <span class="c-r">different</span>. Not a palindrome: <b>return false</b>.', hm); result = false; break; }
          F(5, 'ok', 'Compare lowercase: "' + esc(a) + '" == "' + esc(b) + '" <span class="c-g">match</span>. Move both pointers inward.', hm);
          done[i] = 1; done[j] = 1; i++; j--;
        }
        if (result) F(8, 'ok', 'Pointers met or crossed (i ≥ j) with no mismatch → <b>return true</b>: it is a palindrome. Each character was looked at once: O(n) time, O(1) extra space.');
        return frames;
      }
    }, {
      title: 'String operations step by step',
      gen: function () {
        var code = 'string s = "hello world";\nsize_t p = s.find("world");   // 6\nstring w = s.substr(p, 3);     // "wor"\ns.erase(0, 6);                 // "world"\ns.insert(0, "big ");           // "big world"\ns[0] = toupper(s[0]);          // "Big world"\ns += "!";                      // "Big world!"';
        function arr(str, hl) { return { type: 'array', label: 's (each box = one char)', values: str.split('').map(function (c) { return c === ' ' ? '␣' : c; }), hl: hl || {} }; }
        function rng(a, b, c) { var h = {}; for (var k = a; k < b; k++) h[k] = c; return h; }
        return [
          { narr: 'A string is a row of chars with indices 0..size−1. "hello world" has 11 chars (the space counts).', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 1: 'cur' } }, arr('hello world'), { type: 'vars', vals: { 's.size()': 11 } }] },
          { narr: '<code>find("world")</code> scans for the first position where "world" starts: index <b>6</b>. If absent it would return <code>string::npos</code>.', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 2: 'cur' } }, arr('hello world', rng(6, 11, 'win')), { type: 'vars', vals: { p: 6 }, hl: { p: 'ok' } }] },
          { narr: '<code>substr(6, 3)</code> copies <b>3 chars starting at 6</b> into a new string "wor". The second argument is a <b>length</b>, not an end index.', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 3: 'cur' } }, arr('hello world', rng(6, 9, 'ok')), { type: 'vars', vals: { p: 6, w: '"wor"' }, hl: { w: 'ok' } }] },
          { narr: '<code>erase(0, 6)</code> removes 6 chars from index 0 ("hello "). Everything after shifts left — O(n) work.', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 4: 'cur' } }, arr('hello world', rng(0, 6, 'bad')), { type: 'vars', vals: { 's after': '"world"' } }] },
          { narr: 'Now s = "world".', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 4: 'ok' } }, arr('world'), { type: 'vars', vals: { 's.size()': 5 } }] },
          { narr: '<code>insert(0, "big ")</code> puts 4 chars in front; the old chars shift right.', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 5: 'cur' } }, arr('big world', rng(0, 4, 'ok')), { type: 'vars', vals: { 's.size()': 9 } }] },
          { narr: '<code>s[0] = toupper(s[0])</code>: a char is a number, \'b\' (98) becomes \'B\' (66).', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 6: 'cur' } }, arr('Big world', { 0: 'ok' }), { type: 'vars', vals: { "'b'": 98, "'B'": 66 } }] },
          { narr: '<code>s += "!"</code> appends at the end — amortised O(1) per char, like <code>vector::push_back</code>. Final: "Big world!".', parts: [{ type: 'code', lang: 'cpp', code: code, hl: { 7: 'cur' } }, arr('Big world!', { 9: 'ok' }), { type: 'vars', vals: { s: '"Big world!"', 's.size()': 10 }, hl: { s: 'sel' } }] }
        ];
      }
    }, {
      title: 'Why s = s + c is slow but s += c is fast',
      input: '10000',
      inputLabel: 'number of characters to append (n)',
      gen: function (input) {
        var n = intOf(input, 1, 10000000, 'Enter n from 1 to 10000000');
        var slow = n * (n + 1) / 2, fast = 2 * n;
        function fmt(x) { return x >= 1e9 ? (x / 1e9).toFixed(1) + 'e9' : x >= 1e6 ? (x / 1e6).toFixed(1) + 'e6' : String(Math.round(x)); }
        return [
          { narr: 'Goal: build a string of n = ' + n + ' characters, one char at a time.', parts: [{ type: 'code', lang: 'cpp', code: 'string a, b;\nfor (int i = 0; i < n; ++i) a = a + \'x\';   // version 1\nfor (int i = 0; i < n; ++i) b += \'x\';      // version 2', hl: {} }] },
          { narr: '<b>Version 1</b>: <code>a + \'x\'</code> builds a <b>brand-new</b> string (copying all i existing chars) and then assigns it to a. Round i copies about i chars → 1 + 2 + … + n = n(n+1)/2 ≈ <b>' + fmt(slow) + '</b> char copies: O(n²).', parts: [{ type: 'code', lang: 'cpp', code: 'string a, b;\nfor (int i = 0; i < n; ++i) a = a + \'x\';   // version 1\nfor (int i = 0; i < n; ++i) b += \'x\';      // version 2', hl: { 2: 'bad' } }, { type: 'bars', label: 'chars copied', values: [slow, 0], texts: [fmt(slow), '?'], idxLabels: ['a = a + c', 's += c'], hl: { 0: 'bad' } }] },
          { narr: '<b>Version 2</b>: <code>b += \'x\'</code> writes into spare capacity in place. Occasionally the buffer doubles (like a vector), so the total is under 2n ≈ <b>' + fmt(fast) + '</b> char copies: amortised O(1) per append, O(n) total.', parts: [{ type: 'code', lang: 'cpp', code: 'string a, b;\nfor (int i = 0; i < n; ++i) a = a + \'x\';   // version 1\nfor (int i = 0; i < n; ++i) b += \'x\';      // version 2', hl: { 3: 'ok' } }, { type: 'bars', label: 'chars copied', values: [slow, fast], texts: [fmt(slow), fmt(fast)], idxLabels: ['a = a + c', 's += c'], hl: { 0: 'bad', 1: 'ok' } }] },
          { narr: 'Ratio ≈ <b>' + fmt(slow / fast) + '×</b> more work for version 1. With n = 10<sup>5</sup> that is ~5·10<sup>9</sup> copies — a Time Limit Exceeded. (Optimisers sometimes rescue simple cases, but never rely on it.)', parts: [{ type: 'bars', label: 'chars copied', values: [slow, fast], texts: [fmt(slow), fmt(fast)], idxLabels: ['a = a + c', 's += c'], hl: { 1: 'sel' } }, { type: 'text', html: '<b>Rule:</b> grow strings with <code>+=</code>, <code>push_back</code> or <code>append</code>; call <code>reserve(n)</code> if you know the final size.' }] }
        ];
      }
    }],
    examples: [
      { title: 'Predict the output: the getline trap', html: `<p>Input is <code>21</code> on one line and <code>Ada Lovelace</code> on the next. <code>cin &gt;&gt; age</code> reads 21 but leaves the <code>'\\n'</code> in the buffer. The first <code>getline</code> reads up to that newline → an <b>empty</b> string. So the first print is <b>[]</b>. The <code>ws</code> version skips whitespace first and prints <b>[Ada Lovelace]</b>.</p>`, code: R`int age;
string name;
cin >> age;                    // input: "21\nAda Lovelace\n"
getline(cin, name);            // reads "" — the leftover newline!
cout << "[" << name << "]\n";  // []
getline(cin >> ws, name);      // skip whitespace, then read the line
cout << "[" << name << "]\n";  // [Ada Lovelace]` },
      { title: 'npos and the int trap', html: `<p><code>find</code> returns <code>size_t</code>. Storing it in an <code>int</code> and testing <code>&gt;= 0</code> is wrong: <code>npos</code> converted to <code>int</code> becomes −1 on typical platforms, but the clean, portable test is <code>pos != string::npos</code> with <code>pos</code> kept as <code>size_t</code>. C++23 adds <code>s.contains("x")</code> for a plain yes/no.</p>`, code: R`string s = "banana";
size_t pos = s.find("nan");
if (pos != string::npos) cout << "found at " << pos << "\n";   // found at 2
if (s.find("xyz") == string::npos) cout << "not found\n";

// count all occurrences of "an": restart the search after each hit
int count = 0;
for (size_t p = s.find("an"); p != string::npos; p = s.find("an", p + 1)) ++count;
cout << count << "\n";   // 2` },
      { title: 'Predict the output: string literal arithmetic', html: `<p><code>"hello" + 1</code> does not append "1": the literal decays to a pointer and <code>+ 1</code> moves it one char forward, so it prints <b>ello</b>. <code>string("hello") + '1'</code> really appends and prints <b>hello1</b>. And <code>to_string(1)</code> is the way to append a number: <b>hello1</b> again.</p>`, code: R`cout << "hello" + 1 << "\n";              // ello   (pointer arithmetic!)
cout << string("hello") + '1' << "\n";    // hello1
cout << string("hello") + to_string(1) << "\n";   // hello1
// cout << "a" + "b";                     // ERROR: cannot add two pointers` },
      { title: 'Lexicographic comparison surprises', html: `<p>Strings compare <b>character by character</b> using char codes, like a dictionary. <code>"10" &lt; "9"</code> is true because '1' (49) &lt; '9' (57). Uppercase letters (65–90) come <b>before</b> lowercase (97–122), so <code>"Zebra" &lt; "apple"</code> is true. A shorter string that is a prefix comes first: <code>"app" &lt; "apple"</code>. To compare numbers stored as strings, compare lengths first (after removing leading zeros).</p>`, code: R`cout << boolalpha
     << (string("10") < "9") << " "        // true
     << (string("Zebra") < "apple") << " " // true
     << (string("app") < "apple") << "\n"; // true` },
      { title: 'Reverse each word in a sentence', html: `<p>Combine the tools: <code>stringstream</code> splits on whitespace, <code>reverse</code> works on a string because a string has iterators like a vector, and <code>+=</code> builds the answer. "I love cpp" → <b>I evol ppc</b>.</p>`, code: R`string line = "I love cpp", word, result;
stringstream ss(line);
while (ss >> word) {
    reverse(word.begin(), word.end());
    if (!result.empty()) result += ' ';
    result += word;
}
cout << result << "\n";   // I evol ppc` }
    ],
    deepDive: `<p><b>Small String Optimisation (SSO).</b> A <code>std::string</code> object is 32 bytes in libstdc++ (24 in libc++). Short strings — up to 15 chars in libstdc++, 22 in libc++ — are stored <b>inside the object itself</b>, with no heap allocation at all. Longer strings allocate a heap buffer and grow geometrically like a vector. That is why creating millions of short strings is surprisingly cheap, and why <code>sizeof(string)</code> has nothing to do with the text length. A consequence: moving a short string is a copy of the bytes, and <code>swap</code> of two SSO strings cannot just exchange pointers.</p>
<p><b>Null terminator and C interop.</b> <code>s.c_str()</code> (and since C++11 <code>s.data()</code>) returns a pointer to a <code>'\\0'</code>-terminated array, so you can pass it to C functions like <code>printf("%s", s.c_str())</code>. A <code>std::string</code> may also contain <code>'\\0'</code> characters in the middle — its length is stored, not discovered by scanning, so <code>size()</code> is O(1) while C's <code>strlen</code> is O(n).</p>
<p><b>Bytes, not letters.</b> <code>std::string</code> stores <b>bytes</b>. With UTF-8 text, <code>"é"</code> is 2 bytes and an emoji is 4, so <code>size()</code>, <code>s[i]</code> and <code>reverse</code> work on bytes and can split a character in half. Interview problems almost always use ASCII; production code dealing with user text needs a Unicode-aware library (ICU) for case-folding, normalisation and "characters". Also pass <code>(unsigned char)c</code> to <code>isalpha</code>/<code>toupper</code>: calling them with a negative <code>char</code> (non-ASCII byte) is undefined behaviour.</p>
<p><b>Costs to remember:</b> <code>substr</code> allocates and copies (O(len)); <code>find</code> is O(n·m) in the worst case for a pattern of length m (fine in practice); <code>==</code> and <code>&lt;</code> are O(min length); <code>erase</code>/<code>insert</code> in the middle shift the tail (O(n)). <b><code>std::string_view</code></b> (C++17) is a non-owning (pointer, length) window into existing text: <code>substr</code> on a view is O(1) with no allocation, which makes parsers much faster — but a view into a temporary string dangles as soon as that temporary dies.</p>`,
    aiEra: `<p><b>What AI changes:</b> string-manipulation boilerplate — splitting, trimming, joining, parsing "key=value" — is exactly what AI completes best. It is also handy for writing regexes and explaining them. That frees you to think about the algorithm (two pointers, counting array, sliding window) rather than API names.</p>
<p><b>Use AI as a partner:</b> ask <i>"What inputs would break this parser? Give me 10 nasty test strings (empty, only spaces, trailing delimiter, non-ASCII)"</i>. Ask it to rewrite O(n²) <code>s = s + c</code> loops or repeated <code>substr</code> calls into <code>+=</code>/<code>string_view</code> versions and explain the complexity change.</p>
<p><b>Where AI goes wrong:</b> it mixes up <code>substr(pos, len)</code> with Java's <code>(begin, end)</code>, compares <code>find(...)</code> with <code>-1</code> or <code>&gt;= 0</code>, forgets the <code>getline</code>-after-<code>cin</code> newline, and passes plain <code>char</code> to <code>toupper</code>. It may also suggest <code>string_view</code> parameters that end up pointing at temporaries. <b>What you must still own:</b> character arithmetic, the npos contract, the cost of each operation, and the habit of testing with empty and one-character strings.</p>`,
    problems: [{
      title: 'Valid Palindrome (Ignore Case and Non-Alphanumerics)',
      level: 'Easy', tags: ['string', 'two pointers', 'cctype'], companies: ['Meta', 'Microsoft', 'Amazon', 'Apple'],
      statement: `<p>Given a string <code>s</code>, return <code>true</code> if it reads the same forwards and backwards after converting all uppercase letters to lowercase and removing every character that is not a letter or a digit.</p>`,
      constraints: `1 ≤ |s| ≤ 2 · 10<sup>5</sup>; s consists of printable ASCII characters.`,
      example: `<p><code>"A man, a plan, a canal: Panama"</code> → ${H.c('g', 'true')} (cleaned: "amanaplanacanalpanama"). <code>"race a car"</code> → ${H.c('r', 'false')} (cleaned "raceacar": 'e' vs 'a' at positions 3 and 4 differ). <code>" "</code> → ${H.c('g', 'true')} (cleaned string is empty, which is a palindrome).</p>`,
      brute: {
        why: `<p>Build a cleaned lowercase copy, build a reversed copy of that, and compare the two. Correct and O(n) time — but it allocates <b>two</b> extra strings of up to 2·10<sup>5</sup> chars. Interviewers then ask "can you do it with O(1) extra space?" — the waste is the copies.</p>`,
        code: R`bool isPalBrute(const string& s) {
    string clean;
    for (char c : s)
        if (isalnum((unsigned char)c)) clean += (char)tolower((unsigned char)c);
    string rev(clean.rbegin(), clean.rend());   // reversed copy
    return clean == rev;
}`
      },
      mcq: { q: 'In the two-pointer version, what should happen when <code>s[i]</code> is a comma?', options: ['Return false', 'Move i forward and check again, without moving j', 'Move both i and j', 'Replace it with a space'], answer: 1, explain: 'A non-alphanumeric character is ignored: skip it on its own side only. Moving j too would skip a character that still needs to be compared.' },
      hints: [`<p>Hint 1: You do not need a cleaned copy. Put <code>i</code> at the start and <code>j</code> at the end; compare and move inward, just like checking a palindrome number.</p>`, `<p>Hint 2: Before comparing, advance <code>i</code> while <code>s[i]</code> is not alphanumeric, and retreat <code>j</code> while <code>s[j]</code> is not — always keeping <code>i &lt; j</code>. Compare <code>tolower</code> of both.</p>`, `<p>Hint 3: Use <code>isalnum((unsigned char)c)</code>. Take <code>s</code> by <code>const string&amp;</code> (no copy). An empty or all-punctuation string must return true — the loop simply never finds a mismatch.</p>`],
      solution: {
        approach: `<p>Two indices walk toward each other, each skipping characters that do not count. At every step compare the lowercase versions; any mismatch means "not a palindrome". Every character is visited at most once, and no copies are made: the input is read through a <code>const&amp;</code>.</p>`,
        code: R`#include <bits/stdc++.h>
using namespace std;

bool isPalindrome(const string& s) {
    int i = 0, j = (int)s.size() - 1;
    while (i < j) {
        if (!isalnum((unsigned char)s[i])) { ++i; continue; }   // skip on the left
        if (!isalnum((unsigned char)s[j])) { --j; continue; }   // skip on the right
        if (tolower((unsigned char)s[i]) != tolower((unsigned char)s[j]))
            return false;                                        // mismatch
        ++i;
        --j;
    }
    return true;                                                 // met in the middle
}

int main() {
    cout << boolalpha
         << isPalindrome("A man, a plan, a canal: Panama") << " "   // true
         << isPalindrome("race a car") << " "                       // false
         << isPalindrome(" ") << "\n";                              // true
}`,
        dry: { head: ['i', 'j', 's[i]', 's[j]', 'action'], rows: [['0', '8', 'r', 'r', 'match → i=1, j=7'], ['1', '7', 'a', 'a', 'match → i=2, j=6'], ['2', '6', 'c', 'c', 'match → i=3, j=5'], ['3', '5', 'e', 'a', H.c('r', 'mismatch → return false')]] },
        complexity: `<p>Time O(n): each index moves at most n times in total. Extra space O(1). (Dry run above is for "race a car".)</p>`,
        followUps: ['Valid Palindrome II: may you delete at most one character to make it a palindrome?', 'Return the longest palindromic prefix of the cleaned string.']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Swap Two Numbers via References (Fix the Broken swap)',
    level: 'Easy', tags: ['pass by reference', 'functions', 'predict the output'], companies: ['TCS', 'Accenture', 'Capgemini'],
    statement: `<p>A teammate wrote <code>void swapNums(int a, int b)</code> and is confused that <code>main</code> still prints the original values. Explain the bug, fix the function so it really swaps the caller's variables, and then write <code>void swapEnds(vector&lt;int&gt;&amp; v)</code> that swaps the first and last elements of a vector (do nothing if it has fewer than 2 elements). Read two integers and a vector, apply both functions, print the results.</p>`,
    constraints: `|a|, |b| ≤ 10<sup>9</sup>; 0 ≤ vector size ≤ 10<sup>5</sup>.`,
    example: `<p>Input: <code>3 8</code> and vector ${H.arr([1, 2, 3, 4])}</p><p>Output: <code>8 3</code> and ${H.arr([4, 2, 3, 1], { hl: { 0: 'g', 3: 'g' } })}</p><p><b>Why:</b> with reference parameters the function's <code>a</code> and <code>b</code> are other names for main's variables, so the swap is visible after the call.</p>`,
    brute: {
      why: `<p>The original code takes <code>a</code> and <code>b</code> <b>by value</b>: it swaps two private copies that are destroyed when the function returns. The program prints <b>3 8</b> — nothing happened. All the work inside the function is wasted because it never touches the caller's data.</p>`,
      code: R`void swapNums(int a, int b) {    // BUG: a and b are copies
    int t = a;
    a = b;
    b = t;                        // swaps the copies only
}

int main() {
    int x = 3, y = 8;
    swapNums(x, y);
    cout << x << " " << y << "\n";   // 3 8  (unchanged!)
}`
    },
    mcq: { q: 'What is the smallest change that makes <code>swapNums</code> work?', options: ['Add <code>return a, b;</code>', 'Change the parameters to <code>int&amp; a, int&amp; b</code>', 'Make <code>t</code> a global variable', 'Call it as <code>swapNums(&amp;x, &amp;y)</code> without other changes'], answer: 1, explain: 'Reference parameters make a and b aliases of x and y. Option 4 would need pointer parameters (int*) and dereferencing inside.' },
    hints: [`<p>Hint 1: Draw the two stack frames. In the broken version main's x, y and the function's a, b are four different boxes. You need a and b to <i>be</i> x and y.</p>`, `<p>Hint 2: Add <code>&amp;</code> to the parameter types: <code>void swapNums(int&amp; a, int&amp; b)</code>. No change is needed at the call site. The vector version also needs <code>vector&lt;int&gt;&amp;</code>.</p>`, `<p>Hint 3: For <code>swapEnds</code>, guard <code>if (v.size() &lt; 2) return;</code> first, then swap <code>v[0]</code> and <code>v.back()</code> (or <code>v[v.size() - 1]</code>). In real code, <code>std::swap</code> already does this.</p>`],
    solution: {
      approach: `<p>Pass by <b>reference</b> so the function works on the caller's variables. The vector must also be passed by non-const reference — by value it would swap the ends of a copy. Guard against vectors with fewer than two elements before touching <code>v.back()</code>.</p>`,
      code: R`#include <bits/stdc++.h>
using namespace std;

void swapNums(int& a, int& b) {      // references: a IS x, b IS y
    int t = a;
    a = b;
    b = t;
}

void swapEnds(vector<int>& v) {      // must be a reference to change the caller's vector
    if (v.size() < 2) return;        // nothing to swap (and v.back() would be UB on empty)
    swapNums(v[0], v.back());        // v[0] and v.back() are ints we can bind to int&
}

int main() {
    int x, y;
    cin >> x >> y;
    swapNums(x, y);
    cout << x << " " << y << "\n";

    int n;
    cin >> n;
    vector<int> v(n);
    for (int& e : v) cin >> e;       // read straight into the elements
    swapEnds(v);
    for (int e : v) cout << e << ' ';
    cout << "\n";
}`,
      dry: { head: ['step', 'x', 'y', 'a (alias)', 'b (alias)', 't'], rows: [['call', '3', '8', '→ x', '→ y', '—'], ['t = a', '3', '8', '→ x', '→ y', '3'], ['a = b', '8', '8', '→ x', '→ y', '3'], ['b = t', '8', '3', '→ x', '→ y', '3']] },
      complexity: `<p>O(1) time and space for each swap; reading the vector is O(n).</p>`,
      followUps: ['Swap without a temporary using <code>a ^= b; b ^= a; a ^= b;</code> — why does it fail when a and b refer to the same variable?', 'Write the pointer version <code>void swapPtr(int* a, int* b)</code> and compare the call syntax.']
    }
  });

  practice.push({
    title: 'Count Vowels, Consonants, Digits and Spaces in a Line',
    level: 'Easy', tags: ['string', 'getline', 'switch', 'cctype'], companies: ['Infosys', 'Cognizant', 'Zoho'],
    statement: `<p>Read <b>one full line</b> of text (it may contain spaces and punctuation). Print four counts: vowels (a, e, i, o, u in either case), consonants (other letters), digits, and spaces. Use a <code>switch</code> to recognise the vowels.</p>`,
    constraints: `1 ≤ line length ≤ 10<sup>6</sup>; ASCII text.`,
    example: `<p>Input: <code>Hello World 2026!</code></p><p>Output: ${H.c('g', 'vowels=3 consonants=7 digits=4 spaces=2')}</p><p><b>Why:</b> vowels e, o, o; consonants H, l, l, W, r, l, d; digits 2, 0, 2, 6; two spaces; '!' is none of these.</p>`,
    brute: {
      why: `<p>A naive version reads with <code>cin &gt;&gt; s</code>, which stops at the first space — so it only ever sees "Hello" and the counts are wrong. Another common naive check tests vowels with 10 separate <code>||</code> comparisons, or calls <code>s.find(c)</code> on a "aeiouAEIOU" string for every char — correct but noisy. The real fixes are <code>getline</code> and a clean classification.</p>`,
      code: R`int main() {
    string s;
    cin >> s;                    // BUG: reads only up to the first space
    int v = 0, c = 0, d = 0, sp = 0;
    for (char ch : s) {
        if (ch == 'a' || ch == 'e' || ch == 'i' || ch == 'o' || ch == 'u' ||
            ch == 'A' || ch == 'E' || ch == 'I' || ch == 'O' || ch == 'U') v++;
        else if (isalpha((unsigned char)ch)) c++;
        else if (isdigit((unsigned char)ch)) d++;
        else if (ch == ' ') sp++;          // never true: cin >> never stores spaces
    }
    cout << v << " " << c << " " << d << " " << sp << "\n";
}`
    },
    mcq: { q: 'Why does <code>cin &gt;&gt; s</code> never count any spaces?', options: ['Spaces are not chars', '<code>&gt;&gt;</code> stops reading at whitespace, so spaces never enter s', 'Strings cannot hold spaces', 'Because of the switch'], answer: 1, explain: 'The >> operator skips leading whitespace and stops at the next whitespace. getline reads up to the newline and keeps spaces.' },
    hints: [`<p>Hint 1: Use <code>getline(cin, line)</code> so the whole line (with spaces) is in the string.</p>`, `<p>Hint 2: Lower-case the char once (<code>tolower</code>), then <code>switch</code> on it with <code>case 'a': case 'e': case 'i': case 'o': case 'u':</code> sharing one body (intentional fall-through between empty cases).</p>`, `<p>Hint 3: In the <code>default:</code> branch decide between consonant (<code>isalpha</code>), digit (<code>isdigit</code>) and space (<code>== ' '</code>). Cast to <code>unsigned char</code> before calling the &lt;cctype&gt; functions.</p>`],
    solution: {
      approach: `<p>Read the whole line with <code>getline</code>. For each character, normalise to lowercase and use a <code>switch</code>: stacked empty <code>case</code> labels for the five vowels share one counter increment, and <code>default</code> classifies the rest with &lt;cctype&gt; tests.</p>`,
      code: R`#include <bits/stdc++.h>
using namespace std;

int main() {
    string line;
    getline(cin, line);                       // keeps spaces
    int vowels = 0, consonants = 0, digits = 0, spaces = 0;
    for (char raw : line) {
        unsigned char ch = (unsigned char)raw;
        switch (tolower(ch)) {
            case 'a': case 'e': case 'i': case 'o': case 'u':
                ++vowels;                     // all five labels share this line
                break;
            default:
                if (isalpha(ch))      ++consonants;
                else if (isdigit(ch)) ++digits;
                else if (ch == ' ')   ++spaces;
        }
    }
    cout << "vowels=" << vowels << " consonants=" << consonants
         << " digits=" << digits << " spaces=" << spaces << "\n";
}`,
      complexity: `<p>O(n) time for a line of n characters, O(1) extra space besides the line itself.</p>`,
      followUps: ['Also print the most frequent letter using an <code>array&lt;int, 26&gt;</code>.', 'Count words: a word starts where a non-space follows a space (or the line start).']
    }
  });

  practice.push({
    title: 'Second Largest Distinct Element',
    level: 'Easy', tags: ['array', 'single pass', 'edge cases'], companies: ['Amazon', 'Flipkart', 'Paytm'],
    statement: `<p>Given a vector of integers, return the second largest <b>distinct</b> value, or −1 if it does not exist (fewer than two distinct values). Do it in a <b>single pass</b> without sorting.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>6</sup>; 0 ≤ a[i] ≤ 10<sup>9</sup>.`,
    example: `<p>${H.arr([12, 35, 1, 10, 35, 34], { hl: { 1: 'g', 4: 'g', 5: 'y' } })} → ${H.c('g', '34')} (35 is the largest, appearing twice; the next distinct value is 34). ${H.arr([7, 7, 7])} → ${H.c('r', '-1')} (only one distinct value).</p>`,
    brute: {
      why: `<p>Sort descending, then walk until a value differs from the first. Correct, but O(n log n) and it modifies (or copies) the input. Taking the vector <b>by value</b> to sort a copy also costs O(n) extra memory. One pass with two variables is enough.</p>`,
      code: R`int secondLargestBrute(vector<int> a) {          // copy, so we can sort it
    sort(a.begin(), a.end(), greater<int>());    // O(n log n)
    for (size_t i = 1; i < a.size(); ++i)
        if (a[i] != a[0]) return a[i];
    return -1;
}`
    },
    mcq: { q: 'Scanning left to right with <code>first</code> and <code>second</code>, what happens when x == first?', options: ['second = first', 'first = x', 'Nothing — a duplicate of the max must not become the second largest', 'Return -1'], answer: 2, explain: 'We want distinct values, so a repeat of the maximum is ignored. Only x > first (shift first down into second) or first > x > second (new second) change anything.' },
    hints: [`<p>Hint 1: Keep two variables: <code>first</code> (largest so far) and <code>second</code> (largest value strictly smaller than first). Start both at −1 (all inputs are ≥ 0).</p>`, `<p>Hint 2: For each x: if <code>x &gt; first</code> → second = first, first = x. Else if <code>x &lt; first &amp;&amp; x &gt; second</code> → second = x. Equal to first → ignore.</p>`, `<p>Hint 3: Pass the vector by <code>const vector&lt;int&gt;&amp;</code> so nothing is copied. Test with [7,7,7], [5], [1,2] and [2,1].</p>`],
    solution: {
      approach: `<p>One pass, two trackers. The <code>x &lt; first</code> condition is what enforces "distinct": a second copy of the max never becomes the runner-up. Because values are non-negative, −1 works as the "not found" sentinel.</p>`,
      code: R`#include <bits/stdc++.h>
using namespace std;

int secondLargest(const vector<int>& a) {
    int first = -1, second = -1;
    for (int x : a) {
        if (x > first) {               // new maximum: old max becomes runner-up
            second = first;
            first = x;
        } else if (x < first && x > second) {
            second = x;                // new runner-up (strictly below the max)
        }                              // x == first: duplicate max, ignore
    }
    return second;
}

int main() {
    cout << secondLargest({12, 35, 1, 10, 35, 34}) << "\n";   // 34
    cout << secondLargest({7, 7, 7}) << "\n";                 // -1
    cout << secondLargest({2, 1}) << "\n";                    // 1
}`,
      dry: { head: ['x', 'first', 'second', 'why'], rows: [['12', '12', '-1', 'x &gt; first'], ['35', '35', '12', 'x &gt; first: shift'], ['1', '35', '12', 'no change'], ['10', '35', '12', 'no change'], ['35', '35', '12', 'equal to first: ignore'], ['34', '35', H.c('g', '34'), 'first &gt; x &gt; second']] },
      complexity: `<p>O(n) time, O(1) extra space, no copy of the input.</p>`,
      followUps: ['Return the k-th largest distinct value for small k.', 'What changes if values can be negative? (Use <code>LLONG_MIN</code> or an <code>optional</code> as the sentinel.)']
    }
  });

  practice.push({
    title: 'Move Zeroes to the End (Stable, In Place)',
    level: 'Easy', tags: ['vector', 'two pointers', 'in-place'], companies: ['Meta', 'Bloomberg', 'Apple'],
    statement: `<p>Given a <code>vector&lt;int&gt;&amp; nums</code>, move all zeros to the end while keeping the relative order of the non-zero elements. Do it <b>in place</b> (modify the caller's vector, no second vector).</p>`,
    constraints: `1 ≤ n ≤ 10<sup>4</sup>; −2<sup>31</sup> ≤ nums[i] ≤ 2<sup>31</sup> − 1`,
    example: `<p>${H.arr([0, 1, 0, 3, 12], { hl: { 0: 'r', 2: 'r' } })} → ${H.arr([1, 3, 12, 0, 0], { hl: { 3: 'r', 4: 'r' } })}. The non-zeros 1, 3, 12 keep their order.</p>`,
    brute: {
      why: `<p>Every time you see a zero, <code>erase</code> it and <code>push_back</code> a zero. Each <code>erase</code> shifts the whole tail left (O(n)), so with many zeros it is O(n²). It is also easy to skip an element when two zeros are adjacent, because the index must not advance after an erase.</p>`,
      code: R`void moveZeroesBrute(vector<int>& nums) {
    int n = nums.size();
    int i = 0, checked = 0;
    while (checked < n) {
        if (nums[i] == 0) {
            nums.erase(nums.begin() + i);   // O(n) shift
            nums.push_back(0);
        } else {
            ++i;                             // only advance when nothing was erased
        }
        ++checked;
    }
}`
    },
    mcq: { q: 'With a write index <code>w</code>, what do we do for each non-zero x?', options: ['nums[w++] = x', 'nums.push_back(x)', 'swap(x, nums.back())', 'erase x'], answer: 0, explain: 'Non-zeros are packed to the front in their original order with a write pointer; afterwards positions w..n-1 are filled with zeros.' },
    hints: [`<p>Hint 1: Think of a "write" index <code>w</code> that marks where the next non-zero belongs. A "read" index scans every element.</p>`, `<p>Hint 2: For every non-zero value, copy it to <code>nums[w]</code> and increment w. Since w ≤ read index, you never overwrite something you have not read yet.</p>`, `<p>Hint 3: After the scan, fill <code>nums[w..n-1]</code> with 0. Or use <code>swap(nums[w++], nums[r])</code> to do it in one pass. Remember the parameter must be <code>vector&lt;int&gt;&amp;</code>.</p>`],
    solution: {
      approach: `<p>Two indices on the same vector: <code>r</code> reads every element, <code>w</code> writes the next non-zero. Swapping instead of copying moves zeros backward automatically, so one pass is enough. Stability holds because non-zeros are written in the order they are read.</p>`,
      code: R`#include <bits/stdc++.h>
using namespace std;

void moveZeroes(vector<int>& nums) {
    int w = 0;                                  // next slot for a non-zero
    for (int r = 0; r < (int)nums.size(); ++r)
        if (nums[r] != 0) swap(nums[w++], nums[r]);
}

int main() {
    vector<int> a = {0, 1, 0, 3, 12};
    moveZeroes(a);
    for (int x : a) cout << x << ' ';           // 1 3 12 0 0
    cout << "\n";
}`,
      dry: { head: ['r', 'nums[r]', 'action', 'w after', 'array'], rows: [['0', '0', 'skip', '0', '0 1 0 3 12'], ['1', '1', 'swap(0,1)', '1', '1 0 0 3 12'], ['2', '0', 'skip', '1', '1 0 0 3 12'], ['3', '3', 'swap(1,3)', '2', '1 3 0 0 12'], ['4', '12', 'swap(2,4)', '3', H.c('g', '1 3 12 0 0')]] },
      complexity: `<p>O(n) time, O(1) extra space, each element read once.</p>`,
      followUps: ['Remove all occurrences of a value and return the new length (LeetCode 27).', 'Do the same with <code>std::stable_partition</code> or <code>remove</code> + <code>fill</code>.']
    }
  });

  practice.push({
    title: 'Armstrong Numbers in a Range',
    level: 'Easy', tags: ['loops', 'functions', 'digits', 'integer power'], companies: ['TCS', 'Wipro', 'HCL'],
    statement: `<p>An <b>Armstrong</b> (narcissistic) number with k digits equals the sum of its digits each raised to the power k. Example: 153 = 1³ + 5³ + 3³. Write helper functions <code>countDigits(n)</code>, <code>ipow(base, exp)</code> and <code>isArmstrong(n)</code>, then print all Armstrong numbers in [L, R].</p>`,
    constraints: `1 ≤ L ≤ R ≤ 10<sup>6</sup>`,
    example: `<p>Input: <code>100 1000</code> → Output: ${H.c('g', '153 370 371 407')}. Why 370: 3³ + 7³ + 0³ = 27 + 343 + 0 = 370.</p>`,
    brute: {
      why: `<p>The usual first attempt uses <code>pow()</code> from &lt;cmath&gt;, which works in <b>double</b>. <code>pow(5, 3)</code> may come back as 124.99999…, and converting to <code>int</code> truncates it to 124 — on some compilers/platforms the program then misses 153. It also recounts digits with a <code>to_string</code> call per number. The fix is an exact integer power helper.</p>`,
      code: R`bool isArmstrongBrute(int n) {
    int k = to_string(n).size();             // allocates a string per number
    int sum = 0, t = n;
    while (t > 0) {
        sum += (int)pow(t % 10, k);          // double maths: 124.9999 -> 124 risk
        t /= 10;
    }
    return sum == n;
}`
    },
    mcq: { q: 'Why is <code>(int)pow(5, 3)</code> risky?', options: ['pow only accepts doubles and might return 124.999… which truncates to 124', 'pow is not in C++', 'It overflows', 'It is always exact'], answer: 0, explain: 'pow works in floating point. Exact results are not guaranteed for every library, and the int cast truncates instead of rounding. Integer loops are exact.' },
    hints: [`<p>Hint 1: Split the job into small functions: count digits with a <code>while (n &gt; 0) { n /= 10; ++k; }</code> loop; raise to a power with a <code>for</code> loop multiplying k times.</p>`, `<p>Hint 2: In <code>isArmstrong</code>, compute k once, then peel digits with <code>% 10</code> and <code>/ 10</code>, summing <code>ipow(d, k)</code> into a <code>long long</code>.</p>`, `<p>Hint 3: Loop n from L to R and print the ones that pass. Each check is O(digits²) — at most 7 × 7 multiplications — so 10<sup>6</sup> numbers is quick.</p>`],
    solution: {
      approach: `<p>Three tiny functions, each with one job, make the main loop read like the definition. The integer power is exact, and the sum is a <code>long long</code> for safety. Functions take <code>int</code> by value — cheap and safe.</p>`,
      code: R`#include <bits/stdc++.h>
using namespace std;

int countDigits(int n) {
    int k = 0;
    do { ++k; n /= 10; } while (n > 0);   // do-while: 0 still has 1 digit
    return k;
}

long long ipow(long long base, int exp) {  // exact integer power
    long long r = 1;
    for (int i = 0; i < exp; ++i) r *= base;
    return r;
}

bool isArmstrong(int n) {
    int k = countDigits(n);
    long long sum = 0;
    for (int t = n; t > 0; t /= 10) sum += ipow(t % 10, k);
    return sum == n;
}

int main() {
    int L, R;
    cin >> L >> R;
    for (int n = L; n <= R; ++n)
        if (isArmstrong(n)) cout << n << ' ';
    cout << "\n";
}`,
      dry: { head: ['n', 'k', 'digit terms', 'sum', 'Armstrong?'], rows: [['153', '3', '1 + 125 + 27', '153', H.c('g', 'yes')], ['154', '3', '1 + 125 + 64', '190', H.c('r', 'no')], ['370', '3', '27 + 343 + 0', '370', H.c('g', 'yes')]] },
      complexity: `<p>O((R − L + 1) · d²) with d ≤ 7 digits: effectively O(R − L). O(1) extra space.</p>`,
      followUps: ['Precompute d<sup>k</sup> for d = 0..9 once per k to make each check O(d).', 'Why does <code>countDigits</code> use do-while instead of while?']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Reverse the Words in a String',
    level: 'Medium', tags: ['string', 'two pointers', 'in-place'], companies: ['Microsoft', 'Amazon', 'Goldman Sachs'],
    statement: `<p>Given a string <code>s</code>, return the words in reverse order, separated by a <b>single</b> space. The input may have leading, trailing or multiple spaces between words; the output must not. Follow-up: do it in place with O(1) extra space.</p>`,
    constraints: `1 ≤ |s| ≤ 10<sup>4</sup>; s contains English letters, digits and spaces; at least one word.`,
    example: `<p><code>"  the sky   is blue "</code> → ${H.c('g', '"blue is sky the"')}. The extra spaces vanish and the word order flips; letters inside each word keep their order.</p>`,
    brute: {
      why: `<p>Split into a <code>vector&lt;string&gt;</code> with <code>stringstream</code>, then join in reverse. Clean and O(n) — but it allocates a string per word plus the vector. Interviewers then ask for the in-place version. A worse brute force builds the answer with <code>ans = word + " " + ans</code>, which copies the whole answer for every word: O(n²).</p>`,
      code: R`string reverseWordsBrute(const string& s) {
    stringstream ss(s);
    string w, ans;
    while (ss >> w)
        ans = ans.empty() ? w : w + " " + ans;   // copies ans every time: O(n^2)
    return ans;
}`
    },
    mcq: { q: 'Reversing the whole string and then reversing each word gives…', options: ['the original string', 'the words in reverse order, each spelled correctly', 'every word spelled backwards', 'a palindrome'], answer: 1, explain: '"the sky" → reverse all → "yks eht" → reverse each word → "sky the". Two reversals of each word cancel out its letter order, the outer reversal flips the word order.' },
    hints: [`<p>Hint 1: Reverse the entire string. The words are now in the right order but each word is spelled backwards.</p>`, `<p>Hint 2: Walk through the string with a read index and a write index: skip spaces, copy one word to the write position (adding one space before it if it is not the first word), then reverse that just-written word in place.</p>`, `<p>Hint 3: At the end <code>resize</code> the string to the write index to cut off leftover characters. Take <code>s</code> by value (you need a modifiable copy anyway) or by reference if in-place modification of the caller's string is allowed.</p>`],
    solution: {
      approach: `<p>Reverse everything, then compact words to the front one by one while reversing each word back. The write index never passes the read index, so we can overwrite safely. Finally shrink the string to the written length. All work is on one string — O(1) extra space.</p>`,
      code: R`#include <bits/stdc++.h>
using namespace std;

string reverseWords(string s) {            // by value: we return the modified copy
    reverse(s.begin(), s.end());           // words in order, letters backwards
    int n = s.size(), w = 0;
    for (int r = 0; r < n; ) {
        if (s[r] == ' ') { ++r; continue; }        // skip spaces
        if (w > 0) s[w++] = ' ';                   // single separator
        int start = w;
        while (r < n && s[r] != ' ') s[w++] = s[r++];   // copy one word
        reverse(s.begin() + start, s.begin() + w);      // fix its spelling
    }
    s.resize(w);                           // cut leftover characters
    return s;
}

int main() {
    cout << "[" << reverseWords("  the sky   is blue ") << "]\n";   // [blue is sky the]
}`,
      complexity: `<p>O(n) time: each character is copied and reversed a constant number of times. O(1) extra space beyond the string being returned.</p>`,
      followUps: ['Reverse the letters of each word but keep word order.', 'Rotate a sentence left by k words using the same reversal trick.']
    }
  });

  practice.push({
    title: 'Spiral Order of a Matrix',
    level: 'Medium', tags: ['2D vector', 'loops', 'boundaries'], companies: ['Microsoft', 'Amazon', 'Apple', 'Uber'],
    statement: `<p>Given an <code>m × n</code> matrix as <code>vector&lt;vector&lt;int&gt;&gt;</code>, return all elements in <b>spiral order</b>: across the top row left to right, down the right column, back along the bottom row right to left, up the left column, then repeat on the inner rectangle.</p>`,
    constraints: `1 ≤ m, n ≤ 100; |matrix[i][j]| ≤ 100`,
    example: `<p>Matrix <code>[[1,2,3],[4,5,6],[7,8,9]]</code> → ${H.c('g', '1 2 3 6 9 8 7 4 5')}. Top row 1 2 3, right column 6 9, bottom row backwards 8 7, left column upward 4, then the centre 5.</p>`,
    brute: {
      why: `<p>Simulate a walker that turns right whenever the next cell is outside the grid or already visited, using a separate <code>visited</code> grid. It works, but needs O(m·n) extra memory and careful direction arithmetic. Shrinking four boundaries needs no extra grid.</p>`,
      code: R`vector<int> spiralBrute(const vector<vector<int>>& g) {
    int m = g.size(), n = g[0].size();
    vector<vector<bool>> seen(m, vector<bool>(n, false));    // extra O(m*n)
    int dr[4] = {0, 1, 0, -1}, dc[4] = {1, 0, -1, 0};
    vector<int> out;
    int r = 0, c = 0, d = 0;
    for (int k = 0; k < m * n; ++k) {
        out.push_back(g[r][c]);
        seen[r][c] = true;
        int nr = r + dr[d], nc = c + dc[d];
        if (nr < 0 || nr >= m || nc < 0 || nc >= n || seen[nr][nc]) {
            d = (d + 1) % 4;                                  // turn right
            nr = r + dr[d]; nc = c + dc[d];
        }
        r = nr; c = nc;
    }
    return out;
}`
    },
    mcq: { q: 'Why check <code>top &lt;= bottom</code> again before walking the bottom row?', options: ['For speed', 'Because the top row walk may have used up the last remaining row, and we must not print it twice', 'It is never needed', 'To handle negative numbers'], answer: 1, explain: 'In a single remaining row (e.g. a 1×n matrix), after the top row is printed top > bottom; walking the "bottom" row would print the same elements again in reverse.' },
    hints: [`<p>Hint 1: Keep four boundaries: <code>top</code>, <code>bottom</code>, <code>left</code>, <code>right</code>. Each side you walk shrinks one boundary by 1.</p>`, `<p>Hint 2: Order: top row (left→right), then <code>++top</code>; right column (top→bottom), then <code>--right</code>; bottom row (right→left), then <code>--bottom</code>; left column (bottom→top), then <code>++left</code>.</p>`, `<p>Hint 3: Before the bottom-row and left-column walks, re-check <code>top &lt;= bottom</code> and <code>left &lt;= right</code> — otherwise single-row or single-column leftovers are printed twice. Take the matrix by <code>const&amp;</code>.</p>`],
    solution: {
      approach: `<p>Peel the matrix layer by layer with four shrinking boundaries. Each cell is visited exactly once. The two extra checks handle the moment the remaining area becomes a single row or column.</p>`,
      code: R`#include <bits/stdc++.h>
using namespace std;

vector<int> spiralOrder(const vector<vector<int>>& g) {
    vector<int> out;
    int top = 0, bottom = (int)g.size() - 1;
    int left = 0, right = (int)g[0].size() - 1;
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; ++c) out.push_back(g[top][c]);       // top row
        ++top;
        for (int r = top; r <= bottom; ++r) out.push_back(g[r][right]);     // right col
        --right;
        if (top <= bottom) {
            for (int c = right; c >= left; --c) out.push_back(g[bottom][c]); // bottom row
            --bottom;
        }
        if (left <= right) {
            for (int r = bottom; r >= top; --r) out.push_back(g[r][left]);   // left col
            ++left;
        }
    }
    return out;
}

int main() {
    vector<vector<int>> g = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
    for (int x : spiralOrder(g)) cout << x << ' ';   // 1 2 3 6 9 8 7 4 5
    cout << "\n";
}`,
      dry: { head: ['walk', 'cells', 'boundaries after'], rows: [['top row', '1 2 3', 'top=1'], ['right col', '6 9', 'right=1'], ['bottom row', '8 7', 'bottom=1'], ['left col', '4', 'left=1'], ['top row (inner)', '5', 'top=2 → loop ends']] },
      complexity: `<p>O(m·n) time (each cell once), O(1) extra space besides the output.</p>`,
      followUps: ['Generate an n×n matrix filled 1..n² in spiral order (Spiral Matrix II).', 'Print the matrix diagonally (zig-zag) instead.']
    }
  });

  practice.push({
    title: 'Rotate a Square Matrix 90° Clockwise In Place',
    level: 'Medium', tags: ['2D vector', 'in-place', 'transpose'], companies: ['Amazon', 'Microsoft', 'Apple', 'Nvidia'],
    statement: `<p>Rotate an <code>n × n</code> matrix (<code>vector&lt;vector&lt;int&gt;&gt;&amp;</code>) by 90 degrees clockwise, <b>in place</b> — do not allocate another matrix.</p>`,
    constraints: `1 ≤ n ≤ 20; |matrix[i][j]| ≤ 1000`,
    example: `<p><code>[[1,2,3],[4,5,6],[7,8,9]]</code> → ${H.c('g', '[[7,4,1],[8,5,2],[9,6,3]]')}. The first column read bottom-to-top (7, 4, 1) becomes the first row.</p>`,
    brute: {
      why: `<p>Allocate a second n × n matrix and place each element with <code>res[j][n-1-i] = g[i][j]</code>, then copy back. Simple and O(n²), but uses O(n²) extra memory — exactly what "in place" forbids.</p>`,
      code: R`void rotateBrute(vector<vector<int>>& g) {
    int n = g.size();
    vector<vector<int>> res(n, vector<int>(n));    // O(n^2) extra
    for (int i = 0; i < n; ++i)
        for (int j = 0; j < n; ++j)
            res[j][n - 1 - i] = g[i][j];
    g = res;
}`
    },
    mcq: { q: 'Which two in-place steps rotate a matrix 90° clockwise?', options: ['Reverse each row, then reverse the row order', 'Transpose, then reverse each row', 'Transpose twice', 'Reverse each column, then transpose the anti-diagonal twice'], answer: 1, explain: 'Transpose turns row i into column i; reversing each row then mirrors left-right, which together equals a clockwise rotation. (Reverse rows first then transpose also works.)' },
    hints: [`<p>Hint 1: Where does element (i, j) go? To (j, n−1−i). That is a transpose (i, j) → (j, i) followed by a horizontal mirror (j, i) → (j, n−1−i).</p>`, `<p>Hint 2: Transpose in place by swapping <code>g[i][j]</code> with <code>g[j][i]</code> only for <code>j &gt; i</code> — swapping every pair would swap twice and undo it.</p>`, `<p>Hint 3: Then <code>reverse(g[i].begin(), g[i].end())</code> for each row. Make sure the function takes the matrix by reference.</p>`],
    solution: {
      approach: `<p>Transpose (swap across the main diagonal, upper triangle only) and then reverse every row. Both steps are in place and touch each element a constant number of times.</p>`,
      code: R`#include <bits/stdc++.h>
using namespace std;

void rotate90(vector<vector<int>>& g) {
    int n = g.size();
    for (int i = 0; i < n; ++i)
        for (int j = i + 1; j < n; ++j)          // upper triangle only
            swap(g[i][j], g[j][i]);              // transpose
    for (auto& row : g)                          // auto&: modify the real rows
        reverse(row.begin(), row.end());         // mirror left-right
}

int main() {
    vector<vector<int>> g = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
    rotate90(g);
    for (const auto& row : g) {
        for (int x : row) cout << x << ' ';
        cout << "\n";
    }
    // 7 4 1 / 8 5 2 / 9 6 3
}`,
      dry: { head: ['stage', 'row 0', 'row 1', 'row 2'], rows: [['start', '1 2 3', '4 5 6', '7 8 9'], ['after transpose', '1 4 7', '2 5 8', '3 6 9'], ['after reversing rows', H.c('g', '7 4 1'), H.c('g', '8 5 2'), H.c('g', '9 6 3')]] },
      complexity: `<p>O(n²) time, O(1) extra space.</p>`,
      followUps: ['Rotate counter-clockwise (reverse rows first? or transpose then reverse columns?).', 'Rotate by layers with 4-way swaps instead of transpose + reverse.']
    }
  });

  practice.push({
    title: 'String Compression (Run-Length, In Place)',
    level: 'Medium', tags: ['string', 'two pointers', 'to_string'], companies: ['Amazon', 'Microsoft', 'Lyft'],
    statement: `<p>Given a <code>vector&lt;char&gt;&amp; chars</code>, compress it in place: each group of consecutive repeating characters becomes the character followed by the group length (only if the length is greater than 1). Lengths of 10 or more take several characters (e.g. "12" → '1','2'). Return the new length; the first that many characters of <code>chars</code> must hold the result.</p>`,
    constraints: `1 ≤ chars.size() ≤ 2000; chars[i] is a letter, digit or symbol.`,
    example: `<p><code>a a b b c c c</code> → length ${H.c('g', '6')}, chars start with <code>a 2 b 2 c 3</code>. <code>a b b b b b b b b b b b b</code> (one a, twelve b) → length ${H.c('g', '4')}: <code>a b 1 2</code>.</p>`,
    brute: {
      why: `<p>Build a separate <code>string</code> answer and copy it back. Correct, but it uses O(n) extra memory, and a common mistake in this version is appending the count with <code>ans += count</code> (an int!) — which appends the <b>char with that code</b>, not the digits. Use <code>to_string</code>.</p>`,
      code: R`int compressBrute(vector<char>& chars) {
    string ans;                                     // O(n) extra memory
    int n = chars.size();
    for (int i = 0; i < n; ) {
        int j = i;
        while (j < n && chars[j] == chars[i]) ++j;
        ans += chars[i];
        if (j - i > 1) ans += to_string(j - i);     // NOT ans += (j - i)
        i = j;
    }
    for (size_t k = 0; k < ans.size(); ++k) chars[k] = ans[k];
    return ans.size();
}`
    },
    mcq: { q: 'What does <code>s += 12;</code> append when s is a <code>std::string</code>?', options: ['"12"', 'the character with code 12 (a form-feed control char)', 'nothing — compile error', 'a space'], answer: 1, explain: 'The int converts to char, so s gets one char with code 12. To append digits use s += to_string(12).' },
    hints: [`<p>Hint 1: Use a read index <code>i</code> that jumps over a whole group (find <code>j</code>, the first index with a different char) and a write index <code>w</code>.</p>`, `<p>Hint 2: Write <code>chars[w++] = chars[i]</code>. If the group length <code>j − i</code> is greater than 1, write each character of <code>to_string(j − i)</code>.</p>`, `<p>Hint 3: The compressed form is never longer than the original, so <code>w</code> never overtakes <code>i</code> — writing in place is safe. Return <code>w</code>.</p>`],
    solution: {
      approach: `<p>Read-group / write pointer. Each group of length L is replaced by 1 + digits(L) ≤ L characters (for L ≥ 2), so the write pointer stays behind the read pointer and we can overwrite in place.</p>`,
      code: R`#include <bits/stdc++.h>
using namespace std;

int compress(vector<char>& chars) {
    int n = chars.size(), w = 0;
    for (int i = 0; i < n; ) {
        int j = i;
        while (j < n && chars[j] == chars[i]) ++j;   // end of this group
        chars[w++] = chars[i];                      // the character
        if (j - i > 1)
            for (char d : to_string(j - i)) chars[w++] = d;   // its count, digit by digit
        i = j;
    }
    return w;
}

int main() {
    vector<char> c = {'a', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b'};
    int len = compress(c);
    cout << len << ": ";
    for (int k = 0; k < len; ++k) cout << c[k];      // 4: ab12
    cout << "\n";
}`,
      dry: { head: ['group', 'length', 'written', 'w after'], rows: [['a', '1', 'a', '1'], ['b', '12', 'b, 1, 2', H.c('g', '4')]] },
      complexity: `<p>O(n) time, O(1) extra space (the <code>to_string</code> temp has at most 4 digits).</p>`,
      followUps: ['Decompress "a2b12" back into the original string.', 'Only compress if it actually saves space; otherwise return the original.']
    }
  });

  practice.push({
    title: 'Thousands Separators with Overloads and a Default Separator',
    level: 'Medium', tags: ['overloading', 'default arguments', 'string building', 'edge cases'], companies: ['Stripe', 'Bloomberg', 'Morgan Stanley'],
    statement: `<p>Write two overloads: <code>string withSep(long long n, char sep = ',')</code> and <code>string withSep(const string&amp; digits, char sep = ',')</code>. The first formats an integer (including negatives and <code>LLONG_MIN</code>) with a separator every 3 digits from the right. The second does the same for a string of digits of any length (an optional leading '-' allowed). Example uses: <code>withSep(1234567)</code> → "1,234,567"; <code>withSep(1234567, '.')</code> → "1.234.567".</p>`,
    constraints: `LLONG_MIN ≤ n ≤ LLONG_MAX; the digit string has length 1 to 10<sup>5</sup>.`,
    example: `<p><code>withSep(1234567)</code> → ${H.c('g', '"1,234,567"')}; <code>withSep(-1000, \'.\')</code> → ${H.c('g', '"-1.000"')}; <code>withSep(999)</code> → ${H.c('g', '"999"')}; <code>withSep(string("12345678901234567890"))</code> → ${H.c('g', '"12,345,678,901,234,567,890"')}.</p>`,
    brute: {
      why: `<p>Insert separators into the digit string from the right with <code>s.insert(pos, 1, sep)</code>. Every insert shifts the tail, so with 10<sup>5</sup> digits it is O(n²/3). Negating a negative <code>n</code> to handle the sign also overflows for <code>LLONG_MIN</code> (its positive value does not fit). Building the answer once with <code>+=</code> fixes speed; converting to a string <b>before</b> removing the sign fixes the overflow.</p>`,
      code: R`string withSepBrute(long long n) {
    bool neg = n < 0;
    if (neg) n = -n;                       // UB for LLONG_MIN!
    string s = to_string(n);
    for (int pos = (int)s.size() - 3; pos > 0; pos -= 3)
        s.insert(pos, 1, ',');             // O(n) shift per insert
    return neg ? "-" + s : s;
}`
    },
    mcq: { q: 'Given both overloads, which one does <code>withSep("12345")</code> call?', options: ['withSep(long long, char)', 'withSep(const string&amp;, char)', 'Ambiguous: compile error', 'Neither: compile error'], answer: 1, explain: 'A const char* cannot convert to long long at all, but it can convert to std::string through a user-defined conversion, so only the string overload is viable.' },
    hints: [`<p>Hint 1: Let the <code>long long</code> overload just call <code>to_string(n)</code> and forward to the string overload — one place to get the logic right, and <code>to_string(LLONG_MIN)</code> is safe because no negation happens.</p>`, `<p>Hint 2: In the string overload, peel off a leading '-'. Let L = number of digits. Walk the digits left to right; before digit i (i &gt; 0) add the separator when <code>(L − i) % 3 == 0</code>.</p>`, `<p>Hint 3: Write the default <code>char sep = ','</code> in each declaration exactly once. <code>reserve(L + L/3 + 1)</code> then <code>+=</code> builds the result in O(n).</p>`],
    solution: {
      approach: `<p>The string overload holds the logic; the integer overload converts and forwards. The separator goes before digit i whenever the number of digits remaining (L − i) is a multiple of 3. Building with <code>+=</code> into a reserved string is O(n). No arithmetic negation happens, so <code>LLONG_MIN</code> is safe.</p>`,
      code: R`#include <bits/stdc++.h>
using namespace std;

string withSep(const string& digits, char sep = ',') {
    string out;
    size_t start = 0;
    if (!digits.empty() && digits[0] == '-') { out += '-'; start = 1; }
    size_t L = digits.size() - start;
    out.reserve(digits.size() + L / 3);
    for (size_t i = 0; i < L; ++i) {
        if (i > 0 && (L - i) % 3 == 0) out += sep;   // group boundary from the right
        out += digits[start + i];
    }
    return out;
}

string withSep(long long n, char sep = ',') {
    return withSep(to_string(n), sep);    // to_string handles LLONG_MIN safely
}

int main() {
    cout << withSep(1234567) << "\n";                       // 1,234,567
    cout << withSep(-1000, '.') << "\n";                    // -1.000
    cout << withSep(999) << "\n";                           // 999
    cout << withSep(LLONG_MIN) << "\n";                     // -9,223,372,036,854,775,808
    cout << withSep(string("12345678901234567890")) << "\n";
}`,
      dry: { head: ['i', 'digit', 'L − i', 'separator before?', 'out'], rows: [['0', '1', '7', 'no (i = 0)', '1'], ['1', '2', '6', H.c('g', 'yes'), '1,2'], ['2', '3', '5', 'no', '1,23'], ['3', '4', '4', 'no', '1,234'], ['4', '5', '3', H.c('g', 'yes'), '1,234,5'], ['6', '7', '1', 'no', '1,234,567']] },
      complexity: `<p>O(L) time and O(L) output space. No O(n²) inserts and no overflow.</p>`,
      followUps: ['Add an overload for <code>double</code> that keeps 2 decimals: <code>withSep(1234.5)</code> → "1,234.50".', 'Support the Indian grouping style (1,23,45,678) with a <code>bool indian = false</code> default parameter.']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Multiply Two Big Numbers Given as Strings',
    level: 'Hard', tags: ['string', 'char arithmetic', 'vector', 'simulation'], companies: ['Meta', 'Twitter', 'Google', 'Amazon'],
    statement: `<p>Given two non-negative integers <code>a</code> and <code>b</code> as strings (possibly hundreds of digits), return their product as a string. You may not convert the inputs to built-in integer types (they would overflow) or use a big-integer library.</p>`,
    constraints: `1 ≤ |a|, |b| ≤ 200; digits only; no leading zeros except the number 0 itself.`,
    example: `<p><code>"123" × "456"</code> → ${H.c('g', '"56088"')}. <code>"0" × "52"</code> → ${H.c('g', '"0"')}. <code>"999" × "999"</code> → ${H.c('g', '"998001"')}.</p>`,
    brute: {
      why: `<p>Repeated addition: add <code>a</code> to a running total <code>b</code> times using string addition. With b up to 10<sup>200</sup> this never finishes. A slightly better brute force does grade-school multiplication but builds a full intermediate string for every digit of b and adds them — O(n·m) digits but with many temporary strings and an O(n) addition per row.</p>`,
      code: R`string addStrings(const string& x, const string& y) {
    string r;
    int i = (int)x.size() - 1, j = (int)y.size() - 1, carry = 0;
    while (i >= 0 || j >= 0 || carry) {
        int s = carry + (i >= 0 ? x[i--] - '0' : 0) + (j >= 0 ? y[j--] - '0' : 0);
        r += char('0' + s % 10);
        carry = s / 10;
    }
    reverse(r.begin(), r.end());
    return r;
}

string multiplyBrute(const string& a, const string& b) {
    string total = "0";
    for (int k = 0; k < stoi(b); ++k)     // only works for tiny b; hopeless otherwise
        total = addStrings(total, a);
    return total;
}`
    },
    mcq: { q: 'In grade-school multiplication with 0-based digits from the left, the product of a[i] and b[j] contributes to which result positions (length n + m)?', options: ['i * j', 'i + j and i + j + 1', 'n − i', 'only i + j + 2'], answer: 1, explain: 'The units part of a[i]·b[j] lands at i + j + 1 and the carry at i + j. A result of n + m digits is always enough.' },
    hints: [`<p>Hint 1: The product of an n-digit and an m-digit number has at most n + m digits. Use a <code>vector&lt;int&gt; res(n + m, 0)</code>.</p>`, `<p>Hint 2: For i from n−1 down to 0 and j from m−1 down to 0: <code>int mul = (a[i]-'0') * (b[j]-'0'); int sum = mul + res[i+j+1]; res[i+j+1] = sum % 10; res[i+j] += sum / 10;</code></p>`, `<p>Hint 3: Skip leading zeros when building the answer string with <code>+=</code>, and return "0" if everything was zero. Take inputs by <code>const string&amp;</code>.</p>`],
    solution: {
      approach: `<p>Grade-school multiplication into a fixed array of n + m digits. Each digit pair adds into position i + j + 1 and carries into i + j. Processing from the right means each carry is pushed left immediately. Characters become numbers with <code>c - '0'</code> and back with <code>'0' + d</code>.</p>`,
      code: R`#include <bits/stdc++.h>
using namespace std;

string multiply(const string& a, const string& b) {
    int n = a.size(), m = b.size();
    vector<int> res(n + m, 0);                       // enough digits for any product
    for (int i = n - 1; i >= 0; --i) {
        for (int j = m - 1; j >= 0; --j) {
            int mul = (a[i] - '0') * (b[j] - '0');
            int sum = mul + res[i + j + 1];
            res[i + j + 1] = sum % 10;               // units digit stays here
            res[i + j] += sum / 10;                  // carry moves one place left
        }
    }
    string out;
    for (int d : res)
        if (!(out.empty() && d == 0)) out += char('0' + d);   // skip leading zeros
    return out.empty() ? "0" : out;
}

int main() {
    cout << multiply("123", "456") << "\n";   // 56088
    cout << multiply("0", "52") << "\n";      // 0
    cout << multiply("999", "999") << "\n";   // 998001
}`,
      dry: { head: ['i, j (for "23" × "56")', 'a[i]·b[j]', 'sum = mul + res[i+j+1]', 'res (4 digits)'], rows: [['1, 1 (3·6)', '18', '18 + 0 = 18', '0 0 1 8'], ['1, 0 (3·5)', '15', '15 + 1 = 16', '0 1 6 8'], ['0, 1 (2·6)', '12', '12 + 6 = 18', '0 2 8 8'], ['0, 0 (2·5)', '10', '10 + 2 = 12', H.c('g', '1 2 8 8') + ' → "1288"']] },
        complexity: `<p>O(n·m) digit operations (40,000 for 200-digit inputs), O(n + m) extra space.</p>`,
      followUps: ['Add, subtract and compare big numbers stored as strings.', 'Karatsuba multiplication brings this to about O(n<sup>1.585</sup>) — when is it worth it?']
    }
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
