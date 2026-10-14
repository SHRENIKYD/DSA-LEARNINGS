(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ======================================================================
     TOPIC 1 — Java syntax for problem solving
     ====================================================================== */
  topics.push({
    title: 'Java Syntax for Problem Solving',
    analogy: `<p>A Java program is like a <b>recipe card</b>. The <b>class</b> is the recipe card's title, <code>main</code> is the line that says <i>"start cooking here"</i>, every statement is one step, and the semicolon <code>;</code> is the full stop at the end of each step. Variables are labelled <b>bowls</b>: each bowl has a fixed type (a soup bowl cannot hold a whole cake), and loops are instructions like <i>"stir 10 times"</i> or <i>"keep stirring until it thickens"</i>.</p>`,
    explain: `<p>In interviews and online judges you only need a <b>small, sharp subset</b> of Java. Learn these pieces until you can type them without thinking.</p>
<h4>1. The skeleton</h4>
<p>Every runnable Java file has a class and a <code>main</code> method. On LeetCode you instead fill in a method inside <code>class Solution</code> — no <code>main</code> needed.</p>
<h4>2. Variables and the four types you use 95% of the time</h4>
${H.table(['Type', 'Holds', 'Example', 'Use it for'], [
  ['<code>int</code>', 'whole numbers up to about ±2.1 billion', '<code>int n = 5;</code>', 'indexes, counts, most inputs'],
  ['<code>long</code>', 'whole numbers up to about ±9.2 × 10<sup>18</sup>', '<code>long sum = 0;</code>', 'sums, products, answers "mod 10<sup>9</sup>+7"'],
  ['<code>boolean</code>', '<code>true</code> / <code>false</code>', '<code>boolean found = false;</code>', 'flags, visited marks'],
  ['<code>char</code>', 'one character (really a small number)', '<code>char c = \'a\';</code>', 'string processing']
])}
<h4>3. Operators that trip beginners</h4>
${H.table(['Expression', 'Result', 'Why'], [
  ['<code>7 / 2</code>', H.c('r', '3'), 'int ÷ int throws away the fraction'],
  ['<code>7 / 2.0</code>', H.c('g', '3.5'), 'one side is a double, so the maths is done in double'],
  ['<code>7 % 3</code>', '1', 'remainder after division'],
  ['<code>-7 % 3</code>', H.c('r', '-1'), 'Java keeps the sign of the left number'],
  ['<code>Math.floorMod(-7, 3)</code>', H.c('g', '2'), 'the "maths class" remainder, always 0..2'],
  ['<code>x == y</code> vs <code>x = y</code>', 'compare vs assign', 'one equals sign changes x!']
])}
<h4>4. Decisions and loops</h4>
<ul><li><code>if / else if / else</code> — choose a path.</li>
<li><code>for (int i = 0; i &lt; n; i++)</code> — when you know how many times (walk an array).</li>
<li><code>while (n &gt; 0)</code> — when you stop on a condition (peel digits off a number).</li>
<li>Enhanced for <code>for (int x : arr)</code> — read every element, no index needed.</li>
<li><code>break</code> leaves the loop, <code>continue</code> skips to the next round.</li></ul>
<h4>5. Digit peeling — the first "algorithm" every coder learns</h4>
<p><code>n % 10</code> gives the <b>last digit</b>; <code>n / 10</code> <b>chops it off</b>. Repeat until <code>n</code> is 0. A number with 10 digits needs only 10 rounds, so this is <b>O(number of digits) = O(log₁₀ N)</b>.</p>
${H.table(['n', 'n % 10 (digit)', 'sum', 'n / 10'], [['4096', '6', '6', '409'], ['409', '9', '15', '40'], ['40', '0', '15', '4'], ['4', '4', H.c('g', '19'), '0 → stop']])}`,
    clues: [
      '"digits of a number", "reverse the number", "sum of digits" → peel with <code>% 10</code> and <code>/ 10</code>',
      '"The first line contains T, the number of test cases" → wrap your logic in <code>while (T-- &gt; 0)</code>',
      '"Return the result rounded down" → integer division already floors for non-negative numbers',
      '"Answer can be negative" + remainder → use <code>Math.floorMod</code> or <code>((a % m) + m) % m</code>',
      '"Simulate the process step by step" → a plain <code>while</code> loop with a clear stop condition',
      '"N ≤ 10<sup>9</sup>" but you only loop over its digits → at most 10 iterations, always fast'
    ],
    code: [String.raw`
// The skeleton you should be able to type with your eyes closed.
import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        int n = 4096;              // a whole number
        long total = 0;            // use long for sums that may grow large
        boolean isEven = n % 2 == 0;
        char grade = n > 1000 ? 'A' : 'B';   // ternary: condition ? ifTrue : ifFalse

        // for loop: we know the number of rounds
        for (int i = 1; i <= 5; i++) {
            total += i;            // same as total = total + i
        }

        // while loop: we stop on a condition (peel digits)
        int digitSum = 0, m = n;
        while (m > 0) {
            digitSum += m % 10;    // last digit
            m /= 10;               // drop last digit
        }

        // switch expression (Java 14+): neat multi-way choice
        String size = switch (String.valueOf(n).length()) {
            case 1, 2 -> "small";
            case 3, 4 -> "medium";
            default -> "large";
        };

        System.out.println(total + " " + isEven + " " + grade + " " + digitSum + " " + size);
        // prints: 15 true A 19 medium
    }
}`, String.raw`
// LeetCode style: no main, no input reading. You only fill the method.
class Solution {
    public int sumOfDigits(int n) {
        n = Math.abs(n);           // careful: Math.abs(Integer.MIN_VALUE) is still negative!
        int sum = 0;
        while (n > 0) {
            sum += n % 10;
            n /= 10;
        }
        return sum;
    }
}`],
    codeTitle: ['Full program skeleton (online-judge style)', 'Method-only skeleton (LeetCode style)'],
    viz: {
      title: 'Digit peeling: watch % 10 and / 10 at work',
      input: '4096',
      inputLabel: 'A non-negative whole number (up to 9 digits)',
      gen: function (input) {
        var s = String(input).trim();
        if (!/^\d{1,9}$/.test(s)) throw new Error('Enter a non-negative whole number with at most 9 digits, e.g. 4096');
        var n = parseInt(s, 10), sum = 0, frames = [];
        var CODE = 'int sum = 0;\nwhile (n > 0) {\n    int d = n % 10;\n    sum += d;\n    n /= 10;\n}\nreturn sum;';
        var digits = function (x) { return String(x).split(''); };
        frames.push({ narr: 'Start with <b>n = ' + n + '</b> and an empty bucket <b>sum = 0</b>. We will peel the <b>last</b> digit each round.', parts: [
          { type: 'array', label: 'digits of n', values: digits(n) },
          { type: 'vars', vals: { n: n, d: '-', sum: 0 } },
          { type: 'code', lang: 'java', code: CODE, hl: { 1: 'cur' } }
        ] });
        if (n === 0) {
          frames.push({ narr: 'n is already 0, so the loop condition <code>n &gt; 0</code> is false right away.', parts: [{ type: 'vars', vals: { n: 0, sum: 0 }, hl: { n: 'bad' } }, { type: 'code', lang: 'java', code: CODE, hl: { 2: 'bad' } }] });
          frames.push({ narr: 'We never entered the loop, so the answer is <b>0</b>. Zero is the classic edge case for digit loops!', parts: [{ type: 'vars', vals: { n: 0, sum: 0 }, hl: { sum: 'sel' } }, { type: 'code', lang: 'java', code: CODE, hl: { 7: 'ok' } }] });
          frames.push({ narr: 'Tip: if the question says "count the digits", 0 has <b>one</b> digit — handle it separately.', parts: [{ type: 'text', html: '<b>Edge case:</b> n = 0 → loop runs 0 times.' }] });
          return frames;
        }
        var round = 0;
        while (n > 0) {
          round++;
          var ds = digits(n), d = n % 10, hl = {};
          hl[ds.length - 1] = 'cur';
          frames.push({ narr: 'Round ' + round + ': <code>n % 10</code> = <b>' + d + '</b>. The remainder after dividing by 10 is always the last digit.', parts: [
            { type: 'array', label: 'digits of n', values: ds, hl: hl },
            { type: 'vars', vals: { n: n, d: d, sum: sum }, hl: { d: 'cur' } },
            { type: 'code', lang: 'java', code: CODE, hl: { 3: 'cur' } }
          ] });
          sum += d;
          frames.push({ narr: 'Add it: sum = ' + (sum - d) + ' + ' + d + ' = <b>' + sum + '</b>.', parts: [
            { type: 'array', label: 'digits of n', values: ds, hl: hl },
            { type: 'vars', vals: { n: n, d: d, sum: sum }, hl: { sum: 'ok' } },
            { type: 'code', lang: 'java', code: CODE, hl: { 4: 'ok' } }
          ] });
          var old = n;
          n = Math.floor(n / 10);
          var dh = {}; dh[ds.length - 1] = 'bad';
          frames.push({ narr: '<code>n /= 10</code>: ' + old + ' / 10 = <b>' + n + '</b>. Integer division throws the fraction away, which <b>drops the last digit</b>.', parts: [
            { type: 'array', label: 'digit being removed', values: ds, hl: dh },
            { type: 'vars', vals: { n: n, d: d, sum: sum }, hl: { n: 'cur' } },
            { type: 'code', lang: 'java', code: CODE, hl: { 5: 'cur' } }
          ] });
        }
        frames.push({ narr: 'n became 0, so <code>n &gt; 0</code> is false and the loop ends after <b>' + round + '</b> rounds (one per digit). Answer: <b>' + sum + '</b>.', parts: [
          { type: 'vars', vals: { n: 0, sum: sum, rounds: round }, hl: { sum: 'sel' } },
          { type: 'code', lang: 'java', code: CODE, hl: { 7: 'ok' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Integer division and remainder surprises', html: `<p>Predict each line before reading the comments. Most bugs in "average" and "middle index" questions come from these rules.</p>
${H.table(['Code', 'Prints', 'Lesson'], [['<code>5 / 2</code>', '2', 'fraction dropped'], ['<code>-5 / 2</code>', '-2', 'Java rounds <b>towards zero</b>, not down'], ['<code>-5 % 2</code>', '-1', 'sign follows the left operand'], ['<code>(5 + 2 - 1) / 2</code>', '3', 'ceiling division for positives: (a + b - 1) / b']])}`, code: String.raw`
System.out.println(5 / 2);                 // 2
System.out.println(-5 / 2);                // -2 (towards zero)
System.out.println(-5 % 2);                // -1
System.out.println(Math.floorMod(-5, 2));  // 1
System.out.println((5 + 2 - 1) / 2);       // 3 = ceil(5 / 2)
System.out.println(5 / 2.0);               // 2.5` },
      { title: 'Picking the right loop', html: `<p><b>for</b> when you can count the rounds, <b>while</b> when a condition decides, <b>for-each</b> when you only read values. Counting down is common too (reverse traversal), and a step of 2 visits every second index.</p>`, code: String.raw`
int[] a = {3, 8, 1, 9};
for (int i = 0; i < a.length; i++) System.out.print(a[i] + " ");      // 3 8 1 9
System.out.println();
for (int i = a.length - 1; i >= 0; i--) System.out.print(a[i] + " "); // 9 1 8 3
System.out.println();
for (int i = 0; i < a.length; i += 2) System.out.print(a[i] + " ");   // 3 1
System.out.println();
int x = 100, steps = 0;
while (x > 1) { x /= 2; steps++; }          // how many halvings to reach 1?
System.out.println(steps);                   // 6
for (int v : a) if (v > 5) System.out.print(v + " ");                 // 8 9` },
      { title: 'String + number: left to right!', html: `<p>Java evaluates <code>+</code> from left to right. Once a String appears, everything after it becomes text glueing. This matters when you print answers like <code>"Case " + i + 1</code>.</p>
${H.table(['Expression', 'Result'], [['<code>1 + 2 + "x"</code>', '"3x"'], ['<code>"x" + 1 + 2</code>', H.c('r', '"x12"')], ['<code>"x" + (1 + 2)</code>', H.c('g', '"x3"')], ['<code>\'a\' + 1</code>', '98 (char is a number)']])}`, code: String.raw`
int i = 4;
System.out.println("Case #" + i + 1);    // Case #41  (bug!)
System.out.println("Case #" + (i + 1));  // Case #5   (fixed)
System.out.println('a' + 1);             // 98
System.out.println((char) ('a' + 1));    // b` },
      { title: 'Labelled break: escaping two loops at once', html: `<p>When searching a grid, you often want to stop <b>both</b> loops as soon as you find the target. A label on the outer loop lets one <code>break</code> jump out of everything — cleaner than a flag variable.</p>`, code: String.raw`
int[][] grid = {{1, 2}, {3, 4}};
int target = 3, fr = -1, fc = -1;
search:
for (int r = 0; r < grid.length; r++) {
    for (int c = 0; c < grid[r].length; c++) {
        if (grid[r][c] == target) { fr = r; fc = c; break search; }
    }
}
System.out.println(fr + "," + fc);   // 1,0` }
    ],
    deepDive: `<h4>Compound assignment hides a cast</h4>
<p><code>int x = 10; x += 2.7;</code> compiles and leaves <code>x = 12</code>, because <code>x += y</code> really means <code>x = (int)(x + y)</code>. But <code>x = x + 2.7;</code> is a compile error. The same rule lets <code>byte b = 0; b += 1;</code> work while <code>b = b + 1;</code> fails (byte + int is int).</p>
<h4>Short-circuit evaluation is a safety tool</h4>
<p><code>if (i &lt; n &amp;&amp; a[i] == k)</code> never reads <code>a[n]</code> because <code>&amp;&amp;</code> stops as soon as the left side is false. Swap the order and you get <code>ArrayIndexOutOfBoundsException</code>. The single <code>&amp;</code> on booleans evaluates <b>both</b> sides — avoid it for guards.</p>
<h4>i++ vs ++i</h4>
<p>As a statement on its own they are identical. Inside an expression, <code>a[i++] = 5</code> writes to the old <code>i</code> then increments; <code>a[++i] = 5</code> increments first. Interviewers love <code>int i = 5; i = i++;</code> — the answer is still 5, because the old value is saved, <code>i</code> becomes 6, then the saved 5 is assigned back.</p>
<h4>Division rounding and negative numbers</h4>
<p>Java's <code>/</code> truncates toward zero, so binary-search midpoints and "floor of average" with negatives need <code>Math.floorDiv</code>. Remainder follows the dividend's sign: <code>a % m</code> lies in <code>(-m, m)</code>. Hash-bucket or circular-index code must normalise with <code>Math.floorMod</code>.</p>
<h4>Modern Java you may use (Java 21)</h4>
<ul><li><code>var list = new ArrayList&lt;Integer&gt;();</code> — local type inference, still statically typed.</li>
<li>Switch expressions with <code>-&gt;</code> and no fall-through.</li>
<li><code>record Point(int r, int c) {}</code> — instant immutable class with <code>equals</code>/<code>hashCode</code>, perfect as a map key.</li>
<li>Text blocks <code>"""..."""</code> for multi-line strings in tests.</li></ul>
<p>Performance note: the JVM starts by interpreting your code and compiles hot loops to machine code (JIT) after a few thousand iterations. That is why tiny benchmarks lie, and why judges usually allow Java a little more time than C++.</p>`,
    aiEra: `<p><b>What AI changes:</b> editors like Copilot, Cursor or Claude Code type the skeleton, imports and loops for you in a blink. Syntax is no longer the bottleneck at work.</p>
<p><b>Why you still drill it:</b> many interview rounds use a plain shared editor (CoderPad, HackerRank) with autocomplete switched off, and the interviewer watches you type. Fumbling <code>for</code> loops or <code>-5 % 2</code> costs you minutes and confidence.</p>
<p><b>Use AI as a coach, not a crutch:</b> ask <code>Give me 10 Java output-prediction puzzles about integer division, char arithmetic and string concatenation. Don't show answers until I reply.</code> Then explain each answer back in your own words.</p>
<p><b>Where AI goes wrong:</b> it sometimes mixes Python habits into Java (<code>len(a)</code>, <code>a.length()</code> on arrays instead of <code>a.length</code>), assumes <code>%</code> is always non-negative, or uses <code>Math.pow</code> (a double) for integer powers. Always read generated code line by line before trusting it.</p>`,
    problems: [{
      title: 'Add Digits Until One Digit Remains',
      level: 'Easy', tags: ['math', 'loops', 'digits'], companies: ['Adobe', 'Microsoft', 'Amazon'],
      statement: `<p>Given a non-negative integer <code>num</code>, repeatedly add all its digits until the result has only one digit, and return it.</p>`,
      constraints: `0 ≤ num ≤ 2<sup>31</sup> − 1`,
      example: `<p>Input: <code>num = 38</code> → Output: ${H.c('g', '2')}</p><p>Why: ${H.c('b', '3 + 8 = 11')}, then ${H.c('b', '1 + 1 = 2')}. 2 has a single digit, so we stop.</p>`,
      brute: { why: `<p>Simulate exactly what the statement says: peel digits to get a sum, and repeat while the number is ≥ 10. Each pass takes O(digits) and the number shrinks very fast (at most 10 digits → sum ≤ 90 → ≤ 18 → one digit), so this is already fast. It is the "obvious" answer you should write first.</p>`, code: String.raw`
class Solution {
    public int addDigits(int num) {
        while (num >= 10) {          // more than one digit?
            int sum = 0;
            while (num > 0) {        // peel every digit
                sum += num % 10;
                num /= 10;
            }
            num = sum;               // repeat with the digit sum
        }
        return num;
    }
}` },
      mcq: { q: 'Adding the digits of a number never changes its remainder when divided by…', options: ['9', '10', '2', '7'], answer: 0, explain: 'Because 10 ≡ 1 (mod 9), every power of 10 is ≡ 1, so a number and its digit sum leave the same remainder mod 9. That gives the O(1) "digital root" formula.' },
      hints: [`<p>Hint 1: Write the simulation first — inner loop sums digits, outer loop repeats while the number has 2+ digits.</p>`, `<p>Hint 2: Try a few inputs: 38 → 2, 18 → 9, 27 → 9, 10 → 1. Compare each answer with <code>num % 9</code>. Do you see the pattern?</p>`, `<p>Hint 3: Edge cases: 0 stays 0; multiples of 9 give 9, not 0. Recipe: if num == 0 return 0, else return 1 + (num − 1) % 9.</p>`],
      solution: {
        approach: `<p>The simulation is correct and fast. The math shortcut: a number and its digit sum have the same remainder mod 9 (since 10 leaves remainder 1 when divided by 9). So the final single digit is <code>num % 9</code>, except that a remainder of 0 means the answer is 9 (for non-zero numbers). The formula <code>1 + (num - 1) % 9</code> handles both cases in one line.</p>`,
        code: String.raw`
class Solution {
    public int addDigits(int num) {
        if (num == 0) return 0;          // the only number whose digital root is 0
        return 1 + (num - 1) % 9;        // maps multiples of 9 to 9, others to num % 9
    }
}`,
        alt: [{ lang: 'python', code: String.raw`
def add_digits(num):
    # simulation version, easy to trust
    while num >= 10:
        num = sum(int(c) for c in str(num))
    return num

print(add_digits(38), add_digits(0), add_digits(99))  # 2 0 9`, run: true }],
        dry: { head: ['num', 'digits summed', 'new num', 'one digit?'], rows: [['38', '3 + 8', '11', 'no'], ['11', '1 + 1', '2', H.c('g', 'yes → return 2')], ['formula', '1 + (38 − 1) % 9', '1 + 1 = 2', H.c('g', 'same answer')]] },
        complexity: `<p>Simulation: O(log N) total (each pass is O(digits), passes shrink instantly). Formula: O(1) time and space.</p>`,
        followUps: ['What if the number is given as a String with 10<sup>5</sup> digits? (Sum the chars once, then apply the formula.)', 'Return how many rounds of adding were needed.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Fast input / output
     ====================================================================== */
  topics.push({
    title: 'Fast Input/Output: Scanner vs BufferedReader',
    analogy: `<p>Imagine fetching 1,000,000 grocery items. <b>Scanner</b> is a polite shop assistant who walks to the warehouse for <b>one item at a time</b> and carefully reads every label with a magnifying glass (regular expressions). <b>BufferedReader</b> grabs a <b>whole trolley</b> (8,192 characters) per trip and lets you cut it into pieces yourself. Printing works the same way: calling <code>println</code> a million times is like posting a million separate letters; a <b>StringBuilder</b> or <b>PrintWriter</b> puts everything in one parcel and posts it once.</p>`,
    explain: `<p>On LeetCode you never read input — the judge calls your method. But <b>online assessments</b> (HackerRank, Codility, CodeChef/Codeforces-style rounds used by many companies) give you raw text on <b>standard input</b>. With 10<sup>6</sup> numbers, slow reading alone can cause <b>Time Limit Exceeded</b> even when your algorithm is perfect.</p>
<h4>The three ways to read</h4>
${H.table(['Tool', 'How it works', 'Speed for 10<sup>6</sup> ints', 'Use when'], [
  ['<code>Scanner</code>', 'regex-based parsing of each token', H.c('r', 'slow (often 0.5–1 s+)'), 'tiny inputs, quick experiments'],
  ['<code>BufferedReader</code> + <code>StringTokenizer</code>', 'reads big chunks, splits on spaces', H.c('g', 'fast (~0.1–0.2 s)'), 'default choice for judges'],
  ['<code>DataInputStream</code> custom reader', 'reads raw bytes, builds numbers by hand', H.c('g', 'fastest'), 'huge inputs (10<sup>7</sup> numbers)']
])}
<p><small>Times are rough, machine-dependent ballparks — the <b>ratio</b> is what matters.</small></p>
<h4>The two ways to write</h4>
<ul><li>Collect output in a <code>StringBuilder</code> and print once at the end, <b>or</b></li>
<li>Wrap output in <code>PrintWriter out = new PrintWriter(new BufferedWriter(new OutputStreamWriter(System.out)));</code> and call <code>out.flush()</code> at the end. <b>Forgetting flush = empty output = Wrong Answer.</b></li></ul>
<h4>How a tokenizer reads "3 \\n 10 20 \\n 30"</h4>
<p>BufferedReader hands you <b>whole lines</b>. StringTokenizer cuts a line into <b>tokens</b> (pieces between spaces). When the current line runs out of tokens, read the next line. <code>Integer.parseInt</code> turns the text <code>"20"</code> into the number 20.</p>
${H.table(['Call', 'Current line', 'Token returned', 'Value'], [['nextInt()', '"3"', '"3"', '3'], ['nextInt()', '"10 20"', '"10"', '10'], ['nextInt()', '"10 20"', '"20"', '20'], ['nextInt()', '"30"', '"30"', '30']])}
<h4>Common input shapes</h4>
<ul><li><b>T test cases</b>: read T, loop T times, reset per-test state inside the loop.</li>
<li><b>N then N numbers</b>: read N, allocate <code>int[n]</code>, fill it.</li>
<li><b>Grid of characters</b>: read each row with <code>readLine()</code> and call <code>toCharArray()</code>.</li>
<li><b>Unknown length / until EOF</b>: loop while <code>readLine()</code> is not <code>null</code>.</li></ul>`,
    clues: [
      '"The first line contains an integer T — the number of test cases" → fast reader + loop, reset state each test',
      '"N ≤ 10<sup>6</sup>" or "sum of N over all tests ≤ 2·10<sup>5</sup>" in an OA → BufferedReader/StringTokenizer, never Scanner',
      '"Print each answer on a new line" with Q up to 10<sup>5</sup> queries → StringBuilder or PrintWriter, never println in the loop',
      '"Read until end of file" → <code>while ((line = br.readLine()) != null)</code>',
      '"Time limit: 1 second" on HackerRank/Codeforces in Java → I/O speed matters',
      'LeetCode-style "implement the function" → no I/O at all; do not add a Scanner'
    ],
    code: [String.raw`
// Reusable fast reader: copy this into every online assessment.
import java.io.*;
import java.util.*;

public class Main {
    static class FastReader {
        private final BufferedReader br = new BufferedReader(new InputStreamReader(System.in), 1 << 16);
        private StringTokenizer st;

        String next() throws IOException {
            // Refill the tokenizer from the next line whenever it runs dry.
            while (st == null || !st.hasMoreTokens()) {
                String line = br.readLine();
                if (line == null) return null;          // end of input
                st = new StringTokenizer(line);
            }
            return st.nextToken();
        }
        int nextInt() throws IOException { return Integer.parseInt(next()); }
        long nextLong() throws IOException { return Long.parseLong(next()); }
        String nextLine() throws IOException { st = null; return br.readLine(); }
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader();
        PrintWriter out = new PrintWriter(new BufferedWriter(new OutputStreamWriter(System.out)));
        int t = in.nextInt();                  // number of test cases
        while (t-- > 0) {
            int n = in.nextInt();
            long sum = 0;                      // fresh state for EVERY test case
            for (int i = 0; i < n; i++) sum += in.nextInt();
            out.println(sum);                  // buffered, cheap
        }
        out.flush();                           // never forget this line
    }
}`, String.raw`
// Fastest option: read raw bytes yourself (handles negative numbers).
import java.io.*;

class ByteReader {
    private final DataInputStream in = new DataInputStream(new BufferedInputStream(System.in, 1 << 16));
    private final byte[] buf = new byte[1 << 16];
    private int len = 0, ptr = 0;

    private int read() throws IOException {
        if (ptr == len) { len = in.read(buf, 0, buf.length); ptr = 0; if (len <= 0) return -1; }
        return buf[ptr++];
    }
    int nextInt() throws IOException {
        int c = read();
        while (c != '-' && (c < '0' || c > '9')) c = read();   // skip spaces/newlines
        boolean neg = c == '-';
        if (neg) c = read();
        int x = 0;
        while (c >= '0' && c <= '9') { x = x * 10 + (c - '0'); c = read(); }
        return neg ? -x : x;
    }
}`],
    codeTitle: ['FastReader (BufferedReader + StringTokenizer) and PrintWriter', 'Byte-level reader for very large inputs'],
    viz: {
      title: 'How BufferedReader + StringTokenizer feed nextInt()',
      input: '3 | 10 20 | 30 40 50',
      inputLabel: 'Input lines separated by | (numbers separated by spaces)',
      gen: function (input) {
        var lines = String(input).split('|').map(function (s) { return s.trim(); });
        if (lines.length > 8) throw new Error('Use at most 8 lines');
        var toks = [];
        lines.forEach(function (l) { if (l) l.split(/\s+/).forEach(function (t) { toks.push(t); }); });
        if (!toks.length || toks.some(function (t) { return !/^-?\d{1,9}$/.test(t); })) throw new Error('Use whole numbers separated by spaces, lines separated by |, e.g. 3 | 10 20 | 30');
        if (toks.length > 20) throw new Error('Use at most 20 numbers');
        var frames = [], remaining = lines.slice(), cur = [], sum = 0, calls = 0, readLines = 0;
        frames.push({ narr: 'The judge has written all input into a stream. BufferedReader will pull a <b>whole line</b> at a time; StringTokenizer then cuts it at spaces.', parts: [
          { type: 'queue', label: 'Lines still in the input stream', items: remaining.slice(), frontLabel: 'next', backLabel: 'last' },
          { type: 'queue', label: 'Tokens in StringTokenizer', items: [] },
          { type: 'vars', vals: { 'nextInt() calls': 0, 'readLine() calls': 0, sum: 0 } }
        ] });
        while (remaining.length || cur.length) {
          if (!cur.length) {
            var line = remaining.shift();
            readLines++;
            cur = line ? line.split(/\s+/) : [];
            frames.push({ narr: 'Tokenizer is empty, so <code>br.readLine()</code> fetches <b>"' + line + '"</b> and a new StringTokenizer splits it into ' + cur.length + ' token(s). ' + (cur.length ? '' : 'An empty line gives no tokens — the loop simply reads the next line.'), parts: [
              { type: 'queue', label: 'Lines still in the input stream', items: remaining.slice() },
              { type: 'queue', label: 'Tokens in StringTokenizer', items: cur.slice(), hl: { 0: 'ok' } },
              { type: 'vars', vals: { 'nextInt() calls': calls, 'readLine() calls': readLines, sum: sum }, hl: { 'readLine() calls': 'cur' } }
            ] });
            continue;
          }
          var t = cur.shift();
          calls++;
          var v = parseInt(t, 10);
          sum += v;
          frames.push({ narr: '<code>nextInt()</code> #' + calls + ': take token <b>"' + t + '"</b>, <code>Integer.parseInt</code> turns the text into the number <b>' + v + '</b>. Running sum = ' + sum + '.', parts: [
            { type: 'queue', label: 'Lines still in the input stream', items: remaining.slice() },
            { type: 'queue', label: 'Tokens in StringTokenizer', items: cur.slice() },
            { type: 'vars', vals: { 'token': '"' + t + '"', 'value': v, 'nextInt() calls': calls, 'readLine() calls': readLines, sum: sum }, hl: { value: 'ok', sum: 'cur' } }
          ] });
        }
        frames.push({ narr: 'Done: <b>' + calls + '</b> numbers read with only <b>' + readLines + '</b> line reads. Scanner would have run a regex match for every single token — fine here, painful for 10<sup>6</sup> tokens.', parts: [
          { type: 'bars', label: 'Work per approach (illustrative units)', values: [calls * 5, readLines + calls], texts: ['Scanner ~' + (calls * 5), 'BR+ST ~' + (readLines + calls)], idxLabels: ['Scanner', 'BufferedReader'], hl: { 0: 'bad', 1: 'ok' } },
          { type: 'vars', vals: { sum: sum }, hl: { sum: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'The Scanner nextInt() + nextLine() trap', html: `<p>Input is <code>"3\\nhello world"</code>. After <code>nextInt()</code> reads 3, the newline is <b>still waiting</b>. The next <code>nextLine()</code> returns that empty leftover, not "hello world". Fix: call an extra <code>nextLine()</code> to eat the newline, or read every line with BufferedReader and parse it yourself.</p>`, code: String.raw`
Scanner sc = new Scanner("3\nhello world");
int n = sc.nextInt();          // 3
String rest = sc.nextLine();   // "" (leftover end of line 1!)
String text = sc.nextLine();   // "hello world"
System.out.println(n + " [" + rest + "] [" + text + "]");` },
      { title: 'Reading a character grid', html: `<p>Input: first line <code>R C</code>, then R rows like <code>#..#</code>. Read sizes with a tokenizer, then each row with <code>readLine()</code> and convert to <code>char[]</code> for O(1) access by <code>grid[r][c]</code>.</p>`, code: String.raw`
BufferedReader br = new BufferedReader(new StringReader("2 4\n#..#\n.##."));
StringTokenizer st = new StringTokenizer(br.readLine());
int rows = Integer.parseInt(st.nextToken()), cols = Integer.parseInt(st.nextToken());
char[][] grid = new char[rows][];
for (int r = 0; r < rows; r++) grid[r] = br.readLine().trim().toCharArray();
int hashes = 0;
for (char[] row : grid) for (char ch : row) if (ch == '#') hashes++;
System.out.println(rows + "x" + cols + " grid has " + hashes + " walls");   // 2x4 grid has 4 walls` },
      { title: 'Reading until end of input', html: `<p>Some problems never tell you how many lines come. <code>readLine()</code> returns <code>null</code> at end of input — use it as the loop guard. Skip blank lines defensively, because judges sometimes add a trailing newline.</p>`, code: String.raw`
BufferedReader br = new BufferedReader(new StringReader("5 7\n1 2\n\n10 20\n"));
StringBuilder sb = new StringBuilder();
String line;
while ((line = br.readLine()) != null) {
    line = line.trim();
    if (line.isEmpty()) continue;                 // ignore blank lines
    String[] p = line.split(" ");
    sb.append(Long.parseLong(p[0]) + Long.parseLong(p[1])).append('\n');
}
System.out.print(sb);                             // 12, 3, 30 on separate lines` },
      { title: 'Output: one parcel instead of a million letters', html: `<p>Printing 10<sup>5</sup> answers with <code>System.out.println</code> may flush to the operating system many times. Appending to a <code>StringBuilder</code> and printing once makes output practically free.</p>
${H.table(['Way', 'Flushes for 10<sup>5</sup> lines', 'Verdict'], [['println in loop', 'up to 10<sup>5</sup>', H.c('r', 'risky')], ['StringBuilder + one print', '1', H.c('g', 'fast')], ['PrintWriter + flush()', 'a few (buffer fills)', H.c('g', 'fast')]])}`, code: String.raw`
StringBuilder sb = new StringBuilder();
for (int q = 1; q <= 5; q++) sb.append(q * q).append('\n');
System.out.print(sb);   // 1 4 9 16 25, each on its own line` }
    ],
    deepDive: `<h4>Why Scanner is slow</h4>
<p><code>Scanner</code> wraps the input in a small (1024-char) buffer and uses <code>java.util.regex</code> to find each token and to validate it as an integer (it even supports locale-specific digit grouping). Every <code>nextInt()</code> therefore runs pattern matching, plus extra checks. <code>StringTokenizer</code> just scans for delimiter characters; <code>Integer.parseInt</code> is a tight digit loop.</p>
<h4>StringTokenizer vs String.split</h4>
<p><code>String.split(" ")</code> has a fast path for one-character, non-regex delimiters, so it is decent, but it allocates a whole <code>String[]</code> for each line. <code>split("\\s+")</code> is a real regex and slower. StringTokenizer is "legacy" in the docs but remains the competitive programmer's favourite for speed and simplicity.</p>
<h4>Output buffering details</h4>
<p><code>System.out</code> is a <code>PrintStream</code>. Writing through it many times can cause many small system calls. A <code>PrintWriter</code> over a <code>BufferedWriter</code> batches writes in memory and only talks to the OS when its buffer (8 KB default) fills, or on <code>flush()</code>/<code>close()</code>. If your program exits without flushing a PrintWriter, the buffered text is <b>lost</b>.</p>
<h4>Character decoding</h4>
<p><code>InputStreamReader</code> decodes bytes to UTF-16 chars, which costs time. The byte-level reader skips decoding entirely because judge input is plain ASCII digits. That is why it wins on 10<sup>7</sup>-number inputs.</p>
<h4>Production reality</h4>
<p>Real services do not parse stdin; they parse JSON/protobuf from the network with libraries like Jackson. But the same lesson applies: <b>batch I/O, avoid per-item system calls, stream large files instead of loading them</b> (<code>Files.lines</code>, buffered streams).</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant will happily generate a FastReader template, and many candidates now paste one from memory or a snippet manager. That is fine — the template is boilerplate.</p>
<p><b>What you must own:</b> recognising <i>when</i> I/O is the bottleneck (a correct O(N) solution that times out on a 10<sup>6</sup>-line input is a red flag), remembering to <code>flush()</code>, and resetting per-test-case state. AI-generated solutions commonly use <code>Scanner</code> by default and mix <code>nextInt()</code> with <code>nextLine()</code>, producing the classic empty-line bug.</p>
<p><b>Good prompt:</b> <code>Here is my Java solution that gets TLE on a 10^6-number input. Without changing the algorithm, point out any I/O bottlenecks.</code></p>
<p><b>Proctoring note:</b> many 2026 online assessments are proctored and disallow AI tools; keep your own template ready and practise typing it once so it feels automatic.</p>`,
    problems: [{
      title: 'Sum of a Huge Input',
      level: 'Easy', tags: ['fast io', 'long', 'online assessment'], companies: ['HackerRank OA', 'CodeChef', 'Goldman Sachs'],
      statement: `<p>The first line contains <code>N</code>. The second line contains <code>N</code> integers. Print their sum. The time limit is 1 second.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>6</sup>, −10<sup>9</sup> ≤ a<sub>i</sub> ≤ 10<sup>9</sup>`,
      example: `<p>Input:<br><code>4</code><br><code>1000000000 1000000000 1000000000 -7</code></p><p>Output: ${H.c('g', '2999999993')}</p><p>Why: the true sum is about 3·10<sup>9</sup>, which does ${H.c('r', 'not fit in int')} (max ≈ 2.1·10<sup>9</sup>). A <code>long</code> accumulator is required.</p>`,
      brute: { why: `<p>Scanner + <code>int</code> sum looks fine and passes tiny tests, but has <b>two</b> problems: (1) Scanner parses 10<sup>6</sup> tokens slowly — risky for a 1 s limit; (2) the <code>int</code> sum overflows and silently prints a wrong negative number.</p>`, code: String.raw`
import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int sum = 0;                    // BUG: overflows past ~2.1e9
        for (int i = 0; i < n; i++) sum += sc.nextInt();   // slow regex parsing
        System.out.println(sum);
    }
}` },
      mcq: { q: 'Your O(N) solution gets TLE on N = 10<sup>6</sup>. What is the most likely culprit?', options: ['Reading input with Scanner', 'Using a for loop instead of while', 'Declaring the array as int[]', 'Using long instead of int'], answer: 0, explain: 'The algorithm is already linear; the remaining cost is I/O. Scanner is several times slower than BufferedReader + StringTokenizer on large inputs.' },
      hints: [`<p>Hint 1: The algorithm is trivial — the challenge is reading 10<sup>6</sup> numbers fast and storing a sum that can reach 10<sup>15</sup>.</p>`, `<p>Hint 2: Use BufferedReader + StringTokenizer; refill the tokenizer with the next line if the numbers wrap across lines.</p>`, `<p>Hint 3: Use <code>long sum</code>. Recipe: read N → loop N times: sum += nextInt() → print sum. Max |sum| = 10<sup>6</sup> × 10<sup>9</sup> = 10<sup>15</sup>, safely inside long.</p>`],
      solution: {
        approach: `<p>Read with a buffered tokenizer (refilling from the next line whenever the current line is used up, so the program works even if numbers are split across lines), accumulate into a <code>long</code>, print once.</p>`,
        code: String.raw`
import java.io.*;
import java.util.*;

class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in), 1 << 16);
        StringTokenizer st = new StringTokenizer(br.readLine());
        int n = Integer.parseInt(st.nextToken());
        long sum = 0;                                   // up to 1e15 fits easily
        for (int i = 0; i < n; i++) {
            while (!st.hasMoreTokens()) st = new StringTokenizer(br.readLine());
            sum += Integer.parseInt(st.nextToken());
        }
        System.out.println(sum);
    }
}`,
        alt: [{ lang: 'python', code: String.raw`
import sys

def main():
    data = sys.stdin.buffer.read().split()   # read everything at once: fastest in Python
    n = int(data[0])
    print(sum(map(int, data[1:1 + n])))      # Python ints never overflow

if __name__ == "__main__":
    main()` }],
        dry: { head: ['step', 'token', 'sum (long)', 'sum if it were int'], rows: [['1', '1000000000', '1000000000', '1000000000'], ['2', '1000000000', '2000000000', '2000000000'], ['3', '1000000000', '3000000000', H.c('r', '-1294967296 (overflow!)')], ['4', '-7', H.c('g', '2999999993'), H.c('r', '-1294967303')]] },
        complexity: `<p>O(N) time, O(1) extra space (we never store the array). I/O dominates the running time.</p>`,
        followUps: ['Now print the prefix sum after every element (use a StringBuilder for output).', 'What if values are up to 10<sup>18</sup>? (Sum may exceed long → use BigInteger or Math.addExact to detect overflow.)']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — Primitive vs reference types, overflow, casting
     ====================================================================== */
  topics.push({
    title: 'Primitive vs Reference Types, Overflow & Casting',
    analogy: `<p>A <b>primitive</b> is <b>cash in your wallet</b>: the variable holds the actual value, and giving someone a copy gives them their own cash. A <b>reference</b> is a <b>house address on a sticky note</b>: the variable holds only the address. Copy the note and now two people know the same house — if one repaints the house, the other sees the new colour. And an <code>int</code> is like a <b>car odometer</b> with a fixed number of digits: drive past the maximum and it rolls over to the start — in Java's case, to a big <i>negative</i> number.</p>`,
    explain: `<h4>The 8 primitive types</h4>
${H.table(['Type', 'Size', 'Range (approx.)', 'Default in arrays/fields'], [
  ['<code>byte</code>', '8 bits', '−128 … 127', '0'],
  ['<code>short</code>', '16 bits', '−32,768 … 32,767', '0'],
  ['<code>int</code>', '32 bits', H.c('b', '−2.147 × 10<sup>9</sup> … 2.147 × 10<sup>9</sup>'), '0'],
  ['<code>long</code>', '64 bits', H.c('b', '−9.22 × 10<sup>18</sup> … 9.22 × 10<sup>18</sup>'), '0L'],
  ['<code>float</code>', '32 bits', '~7 decimal digits of precision', '0.0f'],
  ['<code>double</code>', '64 bits', '~15–16 decimal digits of precision', '0.0'],
  ['<code>char</code>', '16 bits', '0 … 65,535 (unsigned)', '\'\\u0000\''],
  ['<code>boolean</code>', '—', 'true / false', 'false']
])}
<p>Handy memory trick: <b>int ≈ 2 × 10<sup>9</sup></b>, <b>long ≈ 9 × 10<sup>18</sup></b>. If any value or intermediate result can pass 2 × 10<sup>9</sup>, use <code>long</code>.</p>
<h4>Reference types</h4>
<p>Everything else — <code>String</code>, arrays (<code>int[]</code>), <code>ArrayList</code>, your own classes, and the <b>wrapper classes</b> <code>Integer</code>, <code>Long</code>, <code>Character</code>, <code>Boolean</code> — is a reference type. The variable stores an <b>address</b> of an object (or <code>null</code>, meaning "no house").</p>
<h4>Overflow: the odometer rolls over</h4>
<p><code>Integer.MAX_VALUE + 1</code> becomes <code>Integer.MIN_VALUE</code> (−2,147,483,648). No error, no warning — just a wrong answer. The most common trap: <code>long x = a * b;</code> where <code>a</code> and <code>b</code> are <code>int</code>. The multiplication happens in <b>int first</b>, overflows, and only then gets widened. Fix: <code>long x = (long) a * b;</code> or <code>1L * a * b</code>.</p>
<h4>Casting</h4>
<ul><li><b>Widening</b> (int → long → double) is automatic and safe (int → double is exact).</li>
<li><b>Narrowing</b> (double → int, long → int) needs an explicit cast and can lose information: <code>(int) 3.99 == 3</code>, <code>(int) 3_000_000_000L</code> is negative garbage.</li>
<li><code>char</code> ↔ <code>int</code>: <code>'a' + 2 == 99</code>, <code>(char) ('a' + 2) == 'c'</code>, digit value is <code>c - '0'</code>.</li></ul>
<h4>Wrapper trap: == on Integer</h4>
<p><code>Integer a = 127, b = 127; a == b</code> is <b>true</b> (Java caches −128…127), but with 128 it is usually <b>false</b> — two different objects. Always compare wrappers with <code>.equals()</code> or unbox to <code>int</code> first.</p>`,
    clues: [
      '"a<sub>i</sub> ≤ 10<sup>9</sup>" and you <b>add</b> or <b>multiply</b> them → the result needs <code>long</code>',
      '"Return the answer modulo 10<sup>9</sup> + 7" → do multiplications in <code>long</code>, take % after each step',
      '"Values up to 10<sup>18</sup>" or "number has 100 digits" → long is not enough for products; use <code>BigInteger</code> or digit arrays',
      '"Answers within 10<sup>−6</sup> are accepted" → double is fine; otherwise prefer exact integer math',
      'Comparing values pulled out of a <code>List&lt;Integer&gt;</code> or <code>Map</code> → use <code>.equals</code> or unbox, never <code>==</code>',
      '"Reverse an integer; return 0 if it overflows" → you must detect overflow explicitly'
    ],
    code: [String.raw`
// Overflow and how to avoid it.
int a = 50_000, b = 50_000;                     // underscores are allowed in literals
long wrong = a * b;                             // int * int overflows BEFORE widening
long right = (long) a * b;                      // promote first, then multiply
System.out.println(wrong + " vs " + right);     // -1794967296 vs 2500000000

System.out.println(Integer.MAX_VALUE + 1);      // -2147483648 (rolls over)
System.out.println(Math.abs(Integer.MIN_VALUE));// -2147483648 (!) no positive twin exists

try {
    Math.multiplyExact(a, b);                   // throws instead of silently overflowing
} catch (ArithmeticException e) {
    System.out.println("overflow detected");
}

// Safe midpoint (classic binary-search bug when lo + hi > 2^31 - 1)
int lo = 2_000_000_000, hi = 2_100_000_000;
int mid = lo + (hi - lo) / 2;
System.out.println(mid);                        // 2050000000`, String.raw`
// Wrapper classes: == compares addresses, equals compares values.
Integer x = 127, y = 127;
Integer p = 128, q = 128;
System.out.println(x == y);          // true  (cached objects -128..127)
System.out.println(p == q);          // false (two different objects, usually)
System.out.println(p.equals(q));     // true  (compares the numbers)
System.out.println(p.intValue() == q.intValue()); // true

List<Integer> list = new ArrayList<>(List.of(1000, 1000));
System.out.println(list.get(0).equals(list.get(1)));  // true - the safe way

Integer maybe = null;
// int boom = maybe;                 // would throw NullPointerException while unboxing`],
    codeTitle: ['Overflow traps and fixes', 'Integer caching and equals'],
    viz: {
      title: 'Odometer rollover: watch a 32-bit int overflow',
      input: '2147483645 4',
      inputLabel: 'start value and number of +1 steps (e.g. 2147483645 4)',
      gen: function (input) {
        var p = String(input).trim().split(/[\s,]+/).map(Number);
        if (p.length !== 2 || p.some(isNaN)) throw new Error('Enter two numbers: start value and steps, e.g. 2147483645 4');
        var start = p[0], steps = p[1];
        if (start < -2147483648 || start > 2147483647 || Math.floor(start) !== start) throw new Error('Start must be a whole number in int range (-2147483648..2147483647)');
        if (steps < 1 || steps > 12 || Math.floor(steps) !== steps) throw new Error('Steps must be a whole number between 1 and 12');
        var frames = [], v = start | 0, exact = start;
        frames.push({ narr: 'An <code>int</code> is exactly <b>32 bits</b>. Bit 31 (leftmost) is the <b>sign bit</b>: 0 means non-negative, 1 means negative (two\'s complement). Start at <b>' + v + '</b>.', parts: [
          { type: 'bits', label: 'int x (32 bits)', value: v, width: 32, dec: v, hl: { 31: 'sel' } },
          { type: 'vars', vals: { 'int x': v, 'long y (true value)': exact } }
        ] });
        for (var s = 1; s <= steps; s++) {
          var before = v;
          v = (v + 1) | 0;
          exact += 1;
          var over = before === 2147483647;
          var hl = {}; hl[31] = over ? 'bad' : (v < 0 ? 'bad' : 'sel');
          if (!over) { var k = 0; while (k < 31 && ((v >>> k) & 1) === 0) { hl[k] = 'cur'; k++; } if (k < 31) hl[k] = 'ok'; }
          frames.push({ narr: over ? '<span class="c-r"><b>Overflow!</b></span> ' + before + ' + 1 should be ' + exact + ', but that needs 33 bits of range. The carry flips the sign bit, so the int becomes <b>' + v + '</b> (Integer.MIN_VALUE). No exception is thrown.' : 'x + 1: the lowest 0-bit becomes 1 and all 1-bits below it become 0 (just like 0999 + 1 = 1000). x = <b>' + v + '</b>' + (v !== exact ? ' — still wrong, because we already wrapped.' : '.'), parts: [
            { type: 'bits', label: 'int x (32 bits)', value: v, width: 32, dec: v, hl: hl },
            { type: 'vars', vals: { 'int x': v, 'long y (true value)': exact }, hl: { 'int x': v !== exact ? 'bad' : 'ok', 'long y (true value)': 'ok' } }
          ] });
        }
        frames.push({ narr: 'Lesson: the <code>long</code> kept the true value because it has 64 bits of room. Whenever a sum or product could pass ~2.1 × 10<sup>9</sup>, store it in a <b>long</b> — and promote <i>before</i> the arithmetic happens.', parts: [
          { type: 'table', label: 'int vs long after ' + steps + ' step(s)', columns: ['type', 'value', 'correct?'], rows: [['int', String(v), v === exact ? 'yes' : 'NO'], ['long', String(exact), 'yes']], hl: { 0: v === exact ? 'ok' : 'bad', 1: 'ok' } }
        ] });
        frames.push({ narr: 'Try the input <b>-2147483648 1</b> to see the bottom end, or <b>2147483647 1</b> for the most famous overflow in Java.', parts: [
          { type: 'text', html: 'Rule of thumb: <b>int ≈ ±2.1 × 10<sup>9</sup></b>, <b>long ≈ ±9.2 × 10<sup>18</sup></b>.' }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Sum of an array: int vs long', html: `<p>N = 10<sup>5</sup> values, each up to 10<sup>9</sup>. Maximum sum = 10<sup>14</sup>, far above int's 2.1 × 10<sup>9</sup>. The element type can stay <code>int</code> (each value fits); only the <b>accumulator</b> must be <code>long</code>.</p>`, code: String.raw`
int[] a = new int[100_000];
Arrays.fill(a, 1_000_000_000);
int badSum = 0;
long goodSum = 0;
for (int v : a) { badSum += v; goodSum += v; }
System.out.println(badSum);   // some meaningless number
System.out.println(goodSum);  // 100000000000000` },
      { title: 'Ceiling division without doubles', html: `<p>"How many boxes of size 3 to pack 10 items?" Answer ⌈10/3⌉ = 4. Avoid <code>Math.ceil(10 / 3)</code> — that computes integer 3 first and returns 3.0! For positive numbers use <code>(a + b - 1) / b</code>, or <code>Math.ceilDiv</code> (Java 18+).</p>
${H.table(['Expression', 'Result'], [['<code>Math.ceil(10 / 3)</code>', H.c('r', '3.0')], ['<code>Math.ceil(10 / 3.0)</code>', '4.0 (double)'], ['<code>(10 + 3 - 1) / 3</code>', H.c('g', '4')]])}`, code: String.raw`
int items = 10, size = 3;
System.out.println(Math.ceil(items / size));          // 3.0  (bug)
System.out.println((items + size - 1) / size);        // 4
System.out.println(Math.ceilDiv(items, size));        // 4 (Java 18+)` },
      { title: 'Doubles are approximate', html: `<p><code>0.1 + 0.2 == 0.3</code> is <b>false</b> in Java (and in every language using IEEE-754 doubles), because 0.1 has no exact binary form. Compare doubles with a tolerance, or better, keep money and counts in integers (cents, not dollars).</p>`, code: String.raw`
double s = 0.1 + 0.2;
System.out.println(s);                         // 0.30000000000000004
System.out.println(s == 0.3);                  // false
System.out.println(Math.abs(s - 0.3) < 1e-9);  // true
long cents = 10 + 20;                          // exact
System.out.println(cents == 30);               // true` },
      { title: 'char is secretly a number', html: `<p>Characters are stored as UTF-16 code numbers: <code>'a' = 97</code>, <code>'A' = 65</code>, <code>'0' = 48</code>. That is why <code>c - 'a'</code> gives a letter's position 0–25 and <code>c - '0'</code> gives a digit's value.</p>
${H.table(['char c', 'c - \'a\'', 'c - \'0\''], [['\'a\'', '0', '—'], ['\'d\'', '3', '—'], ['\'7\'', '—', '7']])}`, code: String.raw`
char c = 'd';
int pos = c - 'a';                 // 3
char next = (char) (c + 1);        // 'e'
int digit = '7' - '0';             // 7
char upper = (char) (c - 'a' + 'A'); // 'D'
System.out.println(pos + " " + next + " " + digit + " " + upper);` }
    ],
    deepDive: `<h4>Two's complement in one paragraph</h4>
<p>Java integers use <b>two's complement</b>: the top bit has weight −2<sup>31</sup> instead of +2<sup>31</sup>. So <code>0111…1</code> = 2,147,483,647 and adding 1 gives <code>1000…0</code> = −2,147,483,648. Negation is "flip all bits, add 1", which is why <code>-Integer.MIN_VALUE == Integer.MIN_VALUE</code> and <code>Math.abs</code> cannot fix it. Integer overflow in Java is <b>defined behaviour</b> (wraps), unlike C/C++ where signed overflow is undefined.</p>
<h4>Detecting overflow</h4>
<ul><li><code>Math.addExact</code>, <code>subtractExact</code>, <code>multiplyExact</code>, <code>toIntExact</code> throw <code>ArithmeticException</code>.</li>
<li>Before <code>x * 10 + d</code> on an int, check <code>x &gt; (Integer.MAX_VALUE - d) / 10</code>.</li>
<li>Or compute in <code>long</code> and compare against int bounds.</li></ul>
<h4>Promotion rules</h4>
<p>Arithmetic on <code>byte</code>, <code>short</code>, <code>char</code> is always promoted to at least <code>int</code>. If either side is long, the operation is long; if either is double, it is double. Integer literals are <code>int</code> unless suffixed with <code>L</code>: <code>long big = 3_000_000_000;</code> does not compile, <code>3_000_000_000L</code> does.</p>
<h4>Memory cost of boxing</h4>
<p>An <code>int</code> in an <code>int[]</code> costs 4 bytes. An <code>Integer</code> in an <code>ArrayList&lt;Integer&gt;</code> costs a 4–8 byte reference <b>plus</b> a ~16-byte object — 4–6× more memory and worse cache locality. For 10<sup>6</sup>+ numbers prefer primitive arrays. Boxing in hot loops (<code>Map&lt;Integer,Integer&gt;</code> counters) is a frequent hidden constant-factor cost.</p>
<h4>double precision limits</h4>
<p>A double has a 53-bit mantissa, so every integer up to 2<sup>53</sup> ≈ 9 × 10<sup>15</sup> is exact, but beyond that gaps appear. <code>(long) Math.pow(10, 18)</code> happens to be exact, but <code>Math.pow</code> for general integer powers can round — write an integer loop or fast exponentiation instead. <code>NaN != NaN</code>, and <code>Double.compare</code> handles −0.0 and NaN consistently for sorting.</p>
<h4>BigInteger</h4>
<p><code>java.math.BigInteger</code> handles arbitrary size but is immutable and much slower (every operation allocates). Use it for genuinely huge numbers (factorials, 100-digit inputs), not as a habit.</p>`,
    aiEra: `<p><b>What AI changes:</b> static analysers and AI reviewers now flag some overflow risks (e.g. <code>int * int</code> assigned to <code>long</code>). That is helpful at work, but in interviews the overflow bug is <i>yours</i> to catch.</p>
<p><b>Where AI goes wrong:</b> generated code frequently uses <code>int</code> for sums of large inputs, writes <code>long x = a * b</code> (still overflows), compares <code>Integer</code> objects with <code>==</code> (works in its tiny test because of the −128…127 cache, then fails in production), and reaches for <code>Math.pow</code> with integers.</p>
<p><b>Use AI well:</b> ask <code>List every place in this Java code where an int could overflow given values up to 1e9 and N up to 1e5</code>. Then verify each claim yourself by computing the worst-case value.</p>
<p><b>What you must still own:</b> reading constraints, computing the largest possible intermediate value, and choosing the type before you write the first line.</p>`,
    problems: [{
      title: 'Product of Array Modulo 10^9 + 7',
      level: 'Easy', tags: ['overflow', 'modular arithmetic', 'long'], companies: ['Amazon', 'Flipkart', 'Uber'],
      statement: `<p>Given an array <code>a</code> of positive integers, return the product of all elements modulo <code>1,000,000,007</code>.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, 1 ≤ a[i] ≤ 10<sup>9</sup>`,
      example: `<p>Input: <code>a = [100000, 100000, 3]</code> → Output: ${H.c('g', '999999797')}</p><p>Why: the true product is 3 × 10<sup>10</sup>. First 10<sup>10</sup> mod M = 999,999,937 (since 10<sup>10</sup> = 9 × 1,000,000,007 + 999,999,937). Then 999,999,937 × 3 = 2,999,999,811, and subtracting 2M leaves ${H.c('g', '999,999,797')}.</p>`,
      brute: { why: `<p>Multiply everything in an <code>int</code> (or even a <code>long</code>) and take the modulo only at the end. The product of 10<sup>5</sup> numbers of size 10<sup>9</sup> has ~900,000 digits, so any fixed-size type overflows almost immediately. BigInteger would be correct but painfully slow (each multiply grows the number).</p>`, code: String.raw`
class Solution {
    public int productMod(int[] a) {
        long p = 1;
        for (int v : a) p *= v;                 // overflows after 2-3 elements
        return (int) (p % 1_000_000_007L);      // garbage in, garbage out
    }
}` },
      mcq: { q: 'Both p and a[i] are below M = 10<sup>9</sup>+7. What is the largest possible value of p × a[i] before taking %?', options: ['About 10<sup>18</sup> — fits in long', 'About 10<sup>9</sup> — fits in int', 'About 10<sup>27</sup> — needs BigInteger', 'Exactly M'], answer: 0, explain: '(10<sup>9</sup>)·(10<sup>9</sup>) = 10<sup>18</sup> &lt; 9.22·10<sup>18</sup>, so a long holds it. That is exactly why the modulus is chosen around 10<sup>9</sup>.' },
      hints: [`<p>Hint 1: (x · y) mod M = ((x mod M) · (y mod M)) mod M. You can take the modulo after <b>every</b> multiplication without changing the final answer.</p>`, `<p>Hint 2: Keep the running product in a <code>long</code> and reduce it right away, so it always stays below M.</p>`, `<p>Hint 3: Edge: a[i] can be up to 10<sup>9</sup> which is already &lt; M, but reduce it anyway for safety. Recipe: p = 1; for v: p = p * (v % M) % M; return (int) p.</p>`],
      solution: {
        approach: `<p>Use the multiplication rule of modular arithmetic. After each step the product is in [0, M), and the next multiplication is at most ~10<sup>18</sup>, which fits a <code>long</code>. Never let the number grow beyond what one multiplication can produce.</p>`,
        code: String.raw`
class Solution {
    static final long MOD = 1_000_000_007L;

    public int productMod(int[] a) {
        long p = 1;
        for (int v : a) {
            p = p * (v % MOD) % MOD;   // p < MOD and v < MOD, so p * v < ~1.0e18 which fits in long
        }
        return (int) p;                // safe: p < MOD < Integer.MAX_VALUE
    }
}`,
        alt: [{ lang: 'python', code: String.raw`
MOD = 10**9 + 7

def product_mod(a):
    p = 1
    for v in a:
        p = p * v % MOD     # Python ints never overflow, but reducing keeps them small and fast
    return p

print(product_mod([100000, 100000, 3]))  # 999999797`, run: true }],
        dry: { head: ['v', 'p before', 'p × v', 'p after (% M)'], rows: [['100000', '1', '100000', '100000'], ['100000', '100000', '10000000000', '999999937'], ['3', '999999937', '2999999811', H.c('g', '999999797')]] },
        complexity: `<p>O(N) time, O(1) space. Each step is one multiply and one modulo on longs.</p>`,
        followUps: ['What if the modulus were around 10<sup>18</sup>? (p × v would overflow long → use Math.multiplyHigh, BigInteger, or "multiply by doubling".)', 'Return the product of every element except itself, modulo M, without division.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Memory: stack, heap and references
     ====================================================================== */
  topics.push({
    title: 'How Memory Works: Stack, Heap & References',
    analogy: `<p>Think of an office. Each <b>method call</b> gets its own <b>sticky-note pad</b> placed on top of a pile on your desk — that pile is the <b>stack</b>. Notes hold small things (numbers) or <b>addresses</b>. Big things (arrays, strings, objects) live in the <b>warehouse</b> — the <b>heap</b>. When a method finishes, its pad is torn off and thrown away. A <b>cleaner</b> (the <b>garbage collector</b>) walks the warehouse and removes boxes that no note anywhere points to.</p>`,
    explain: `<h4>Two memory areas</h4>
${H.table(['', 'Stack', 'Heap'], [
  ['What lives there', 'one <b>frame</b> per active method call: its parameters and local variables', 'every object created with <code>new</code>: arrays, Strings, lists, your classes'],
  ['Lifetime', 'frame disappears when the method returns', 'object lives while something still references it'],
  ['Size', 'small (often ~512 KB–1 MB per thread)', 'large (hundreds of MB, set by <code>-Xmx</code>)'],
  ['Failure', H.c('r', 'StackOverflowError') + ' (too-deep recursion)', H.c('r', 'OutOfMemoryError') + ' (too much data)']
])}
<h4>What a variable really holds</h4>
<ul><li><code>int x = 5;</code> → the frame holds the number <b>5</b> itself.</li>
<li><code>int[] a = {1, 2, 3};</code> → the array lives on the heap; the frame holds only its <b>address</b> (a reference).</li>
<li><code>int[] b = a;</code> → copies the <b>address</b>, not the array. Now <code>a</code> and <code>b</code> are two names (aliases) for <b>one</b> array. <code>b[0] = 99</code> is visible through <code>a</code>.</li></ul>
<h4>Java is always pass-by-value</h4>
<p>When you call a method, Java <b>copies</b> each argument into the new frame. For a primitive, the copy is the number — changes inside the method do not affect the caller. For a reference, the copy is the <b>address</b> — so the method can <b>change the object</b> the address points to (the caller sees it), but <b>re-pointing</b> the parameter to a new object does nothing to the caller's variable.</p>
${H.table(['Inside the method', 'Caller sees the change?'], [['<code>n++</code> on an int parameter', H.c('r', 'No')], ['<code>arr[i] = 7</code> on an array parameter', H.c('g', 'Yes — same object')], ['<code>arr = new int[3]</code>', H.c('r', 'No — only the local copy of the address changed')]])}
<h4>null and garbage collection</h4>
<p><code>null</code> means "this note has no address". Using it (<code>a.length</code>, <code>s.charAt(0)</code>) throws <code>NullPointerException</code>. When no reference to an object remains, it becomes <b>garbage</b> and the collector will reclaim it automatically — you never call <code>free</code> in Java.</p>
<h4>Why this matters in DSA</h4>
<ul><li>"Modify the array <b>in place</b>" works because the method receives the address of the caller's array.</li>
<li>Storing the <i>same</i> list object in your answer and then changing it (backtracking!) corrupts every saved copy — you must add <code>new ArrayList&lt;&gt;(path)</code>.</li>
<li>Deep recursion (10<sup>5</sup>+ levels) can overflow the stack — prefer iteration.</li></ul>`,
    clues: [
      '"Modify the array in-place" / "do not return anything" → mutate the object through the parameter; never reassign it',
      '"O(1) extra space" → no new arrays/lists proportional to N on the heap (a few variables are fine)',
      '"Return all subsets / paths" → add a <b>copy</b> (<code>new ArrayList&lt;&gt;(path)</code>), not the live list',
      '"Tree/linked list with up to 10<sup>5</sup> nodes, possibly a straight line" → recursion depth 10<sup>5</sup> may overflow the stack',
      '"Memory limit 256 MB" with N = 10<sup>7</sup> → estimate bytes: int[] = 4 B each, long[] = 8 B, boxed Integer ≈ 16–20 B',
      '"Clone the graph / deep copy the list" → you must allocate new objects, not copy references'
    ],
    code: [String.raw`
// Pass-by-value of primitives and of references.
class Demo {
    static void bump(int n) { n++; }                 // changes only the local copy
    static void fill(int[] arr) {
        arr[1] = 7;                                  // mutates the caller's array (same object)
        arr = new int[3];                            // re-points the LOCAL copy only
        arr[2] = 42;                                 // touches the new array, invisible to caller
    }
    public static void main(String[] args) {
        int x = 5;
        int[] a = {1, 2, 3};
        int[] b = a;                                 // alias: same array
        b[0] = 99;
        bump(x);
        fill(a);
        System.out.println(x + " " + Arrays.toString(a));   // 5 [99, 7, 3]
    }
}`, String.raw`
// Running deep recursion safely: give the thread a bigger stack (common CP trick).
class DeepRecursion {
    static int depth(int n) { return n == 0 ? 0 : 1 + depth(n - 1); }

    public static void main(String[] args) throws InterruptedException {
        Thread t = new Thread(null, () -> {
            System.out.println(depth(1_000_000));     // 1,000,000 frames
        }, "big-stack", 1L << 28);                    // 256 MB stack for this thread
        t.start();
        t.join();
    }
}`],
    codeTitle: ['Pass-by-value demo', 'Bigger stack for deep recursion'],
    viz: {
      title: 'Stack frames, heap objects and the arrows between them',
      gen: function () {
        var frames = [];
        var CODE = 'int x = 5;\nint[] a = {1, 2, 3};\nint[] b = a;\nb[0] = 99;\nbump(x);   // void bump(int n) { n++; }\nfill(a);   // arr[1]=7; arr=new int[3]; arr[2]=42;\na = null; b = null;';
        function snap(narr, line, stackFrames, heap, hlVar, hlObj, garbage) {
          var nodes = [], edges = [], hl = {}, tags = {}, ehl = {}, y = 6, items = [];
          stackFrames.forEach(function (f) {
            items.push(f.name);
            f.vars.forEach(function (v) {
              var id = f.name + '.' + v[0];
              var shown = v[1] && v[1].ref ? (v[1].ref === 'null' ? 'null' : '→') : v[1];
              nodes.push({ id: id, label: f.name + ': ' + v[0] + ' = ' + shown, x: 16, y: y, shape: 'box' });
              if (v[1] && v[1].ref && v[1].ref !== 'null') { edges.push([id, v[1].ref]); if (hlVar === id) ehl[id + '-' + v[1].ref] = 'cur'; }
              if (hlVar === id) hl[id] = 'cur';
              y += 9;
            });
          });
          var hy = 10;
          Object.keys(heap).forEach(function (k) {
            nodes.push({ id: k, label: k + ' int[] ' + JSON.stringify(heap[k]).replace(/,/g, ', '), x: 78, y: hy, shape: 'box' });
            if (hlObj === k) hl[k] = 'ok';
            if (garbage && garbage.indexOf(k) >= 0) { hl[k] = 'bad'; tags[k] = 'garbage'; }
            hy += 22;
          });
          var lh = {}; lh[line] = 'cur';
          frames.push({ narr: narr, parts: [
            { type: 'stack', label: 'Call stack (one frame per call)', items: items.length ? items : [], hl: (function () { var o = {}; o[items.length - 1] = 'cur'; return o; })() },
            { type: 'graph', label: 'Stack variables (left) → heap objects (right)', directed: true, height: Math.max(50, y + 4, hy), nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags },
            { type: 'code', lang: 'java', code: CODE, hl: lh }
          ] });
        }
        snap('<code>main</code> starts: Java pushes a <b>frame</b> for it on the stack. x is a primitive, so the number 5 lives <b>inside the frame</b>.', 1, [{ name: 'main', vars: [['x', 5]] }], {}, 'main.x');
        snap('<code>new int[]{1,2,3}</code> creates an array on the <b>heap</b> (call it #A). Variable <b>a</b> only stores its address — the arrow.', 2, [{ name: 'main', vars: [['x', 5], ['a', { ref: '#A' }]] }], { '#A': [1, 2, 3] }, 'main.a', '#A');
        snap('<code>int[] b = a</code> copies the <b>address</b>, not the array. Two arrows, one object: a and b are aliases.', 3, [{ name: 'main', vars: [['x', 5], ['a', { ref: '#A' }], ['b', { ref: '#A' }]] }], { '#A': [1, 2, 3] }, 'main.b');
        snap('<code>b[0] = 99</code> follows b\'s arrow and changes the shared array. Reading <code>a[0]</code> now also gives <b>99</b>.', 4, [{ name: 'main', vars: [['x', 5], ['a', { ref: '#A' }], ['b', { ref: '#A' }]] }], { '#A': [99, 2, 3] }, 'main.b', '#A');
        snap('Call <code>bump(x)</code>: a new frame is pushed. Java <b>copies</b> the value 5 into parameter n. n and x are separate boxes.', 5, [{ name: 'main', vars: [['x', 5], ['a', { ref: '#A' }], ['b', { ref: '#A' }]] }, { name: 'bump', vars: [['n', 5]] }], { '#A': [99, 2, 3] }, 'bump.n');
        snap('<code>n++</code> makes n = 6 — only the copy changes. main\'s x is still <b>5</b>.', 5, [{ name: 'main', vars: [['x', 5], ['a', { ref: '#A' }], ['b', { ref: '#A' }]] }, { name: 'bump', vars: [['n', 6]] }], { '#A': [99, 2, 3] }, 'bump.n');
        snap('bump returns: its frame is <b>popped</b> and n is gone forever. x = 5. This is why <code>swap(int a, int b)</code> can never work in Java.', 6, [{ name: 'main', vars: [['x', 5], ['a', { ref: '#A' }], ['b', { ref: '#A' }]] }], { '#A': [99, 2, 3] }, 'main.x');
        snap('Call <code>fill(a)</code>: the <b>address</b> stored in a is copied into parameter arr. Now three arrows point at #A.', 6, [{ name: 'main', vars: [['x', 5], ['a', { ref: '#A' }], ['b', { ref: '#A' }]] }, { name: 'fill', vars: [['arr', { ref: '#A' }]] }], { '#A': [99, 2, 3] }, 'fill.arr');
        snap('<code>arr[1] = 7</code> follows the arrow and edits #A. The caller <b>will</b> see this — same object.', 6, [{ name: 'main', vars: [['x', 5], ['a', { ref: '#A' }], ['b', { ref: '#A' }]] }, { name: 'fill', vars: [['arr', { ref: '#A' }]] }], { '#A': [99, 7, 3] }, 'fill.arr', '#A');
        snap('<code>arr = new int[3]</code> creates #B and re-points <b>only the local arr</b>. main\'s a and b still point at #A.', 6, [{ name: 'main', vars: [['x', 5], ['a', { ref: '#A' }], ['b', { ref: '#A' }]] }, { name: 'fill', vars: [['arr', { ref: '#B' }]] }], { '#A': [99, 7, 3], '#B': [0, 0, 0] }, 'fill.arr', '#B');
        snap('<code>arr[2] = 42</code> changes #B, which the caller cannot even reach.', 6, [{ name: 'main', vars: [['x', 5], ['a', { ref: '#A' }], ['b', { ref: '#A' }]] }, { name: 'fill', vars: [['arr', { ref: '#B' }]] }], { '#A': [99, 7, 3], '#B': [0, 0, 42] }, 'fill.arr', '#B');
        snap('fill returns and its frame is popped. Nobody points to #B any more → it is <b>garbage</b>; the GC will reclaim it. main sees a = [99, 7, 3].', 7, [{ name: 'main', vars: [['x', 5], ['a', { ref: '#A' }], ['b', { ref: '#A' }]] }], { '#A': [99, 7, 3], '#B': [0, 0, 42] }, 'main.a', null, ['#B']);
        snap('<code>a = null; b = null;</code> — the last arrows to #A are gone, so #A is garbage too. Calling <code>a.length</code> now would throw <b>NullPointerException</b>.', 7, [{ name: 'main', vars: [['x', 5], ['a', { ref: 'null' }], ['b', { ref: 'null' }]] }], { '#A': [99, 7, 3], '#B': [0, 0, 42] }, 'main.a', null, ['#A', '#B']);
        return frames;
      }
    },
    examples: [
      { title: 'Why swap(int, int) fails but swap(int[], i, j) works', html: `<p>The first version swaps two <b>copies</b> that die when the method returns. The second receives the array's address and swaps the real cells. This tiny helper appears in sorting, two-pointer and permutation code all the time.</p>`, code: String.raw`
class SwapDemo {
    static void swapBroken(int x, int y) { int t = x; x = y; y = t; }
    static void swap(int[] a, int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }
    public static void main(String[] args) {
        int p = 1, q = 2;
        swapBroken(p, q);
        System.out.println(p + " " + q);               // 1 2 (unchanged)
        int[] arr = {1, 2};
        swap(arr, 0, 1);
        System.out.println(Arrays.toString(arr));      // [2, 1]
    }
}` },
      { title: 'Alias vs copy vs deep copy', html: `<p><code>b = a</code> is an alias. <code>a.clone()</code> or <code>Arrays.copyOf</code> makes a new 1D array. For a <b>2D</b> array, <code>clone()</code> copies only the outer array of row addresses — rows are still shared (a <b>shallow</b> copy). Copy each row for a true deep copy.</p>
${H.table(['Operation', 'New outer array?', 'New rows?'], [['<code>int[][] g2 = g;</code>', 'no', 'no'], ['<code>g.clone()</code>', 'yes', H.c('r', 'no')], ['row-by-row <code>clone()</code>', 'yes', H.c('g', 'yes')]])}`, code: String.raw`
int[][] g = {{1, 2}, {3, 4}};
int[][] shallow = g.clone();
shallow[0][0] = 100;                       // also changes g[0][0]!
int[][] deep = new int[g.length][];
for (int r = 0; r < g.length; r++) deep[r] = g[r].clone();
deep[1][1] = -1;                           // g is untouched
System.out.println(g[0][0] + " " + g[1][1]);   // 100 4` },
      { title: 'Strings look like pass-by-value because they are immutable', html: `<p>Inside a method, <code>s += "!"</code> does <b>not</b> change the caller's String. Strings cannot be modified; <code>+=</code> builds a <b>new</b> String and re-points the local variable. If you want a method to modify text, pass a <code>StringBuilder</code> (which is mutable) or return the new String.</p>`, code: String.raw`
class StrDemo {
    static void shout(String s) { s += "!"; }                 // new object, local only
    static void shout(StringBuilder sb) { sb.append("!"); }   // mutates shared object
    public static void main(String[] args) {
        String s = "hi";
        shout(s);
        StringBuilder sb = new StringBuilder("hi");
        shout(sb);
        System.out.println(s + " " + sb);                   // hi hi!
    }
}` },
      { title: 'The live-list bug in backtracking', html: `<p>Adding <code>path</code> itself to the result stores the <b>address</b> of one list that keeps changing. At the end every entry shows the same (often empty) list. Always snapshot with <code>new ArrayList&lt;&gt;(path)</code>.</p>`, code: String.raw`
List<List<Integer>> bad = new ArrayList<>(), good = new ArrayList<>();
List<Integer> path = new ArrayList<>();
for (int i = 1; i <= 3; i++) {
    path.add(i);
    bad.add(path);                    // same object added three times
    good.add(new ArrayList<>(path));  // independent snapshot
}
path.clear();
System.out.println(bad);   // [[], [], []]
System.out.println(good);  // [[1], [1, 2], [1, 2, 3]]` }
    ],
    deepDive: `<h4>What really sits in a frame</h4>
<p>A JVM frame contains a <b>local-variable array</b> (parameters first), an <b>operand stack</b> for intermediate values, and a link back to the caller. Each frame is typically tens to a few hundred bytes, so a default 512 KB–1 MB thread stack fits roughly 10<sup>4</sup>–10<sup>5</sup> simple recursive calls. Judges (and LeetCode) do not guarantee more; recursion depth equal to N = 10<sup>5</sup>–10<sup>6</sup> is a real risk. Options: rewrite iteratively with an explicit <code>ArrayDeque</code>, or run the solver in a <code>Thread</code> with a large stack size (works on most judges; check rules).</p>
<h4>Object sizes (64-bit HotSpot, compressed references — typical)</h4>
${H.table(['Thing', 'Approx. bytes'], [['object header', '12 (padded to multiple of 8)'], ['<code>int[n]</code>', '16 + 4n'], ['<code>long[n]</code>', '16 + 8n'], ['<code>Integer</code>', '16'], ['<code>ArrayList&lt;Integer&gt;</code> with n items', '≈ 20n + overhead'], ['<code>String</code> of n ASCII chars', '≈ 40 + n']])}
<p>So 10<sup>7</sup> ints in an <code>int[]</code> ≈ 40 MB, but in an <code>ArrayList&lt;Integer&gt;</code> ≈ 200 MB — a 256 MB limit may fail.</p>
<h4>Allocation is cheap, GC is smart</h4>
<p>HotSpot allocates in per-thread buffers (TLABs) by simply bumping a pointer, so <code>new</code> costs a few nanoseconds. Most objects die young; a <b>generational</b> collector (G1 by default since Java 9; ZGC is an option for low pauses) cleans the young area cheaply. The JIT's <b>escape analysis</b> can even avoid heap allocation for objects that never leave a method.</p>
<h4>Pass-by-value, formally</h4>
<p>The Java Language Specification says argument values are copied into new parameter variables. There is no way to pass "a variable itself" (C++ <code>int&amp;</code>). If you need a method to update a caller's counter, return it, use a one-element array <code>int[] cnt = {0}</code>, a field, or an <code>AtomicInteger</code>.</p>
<h4>Memory leaks still happen</h4>
<p>GC frees only <b>unreachable</b> objects. A static <code>List</code> or cache that keeps growing holds references forever — the classic Java "leak". In DSA terms, clearing a static structure between test cases also prevents wrong answers from stale state.</p>`,
    aiEra: `<p><b>What AI changes:</b> you rarely debug raw memory any more; profilers and AI assistants can read a heap dump or a stack trace and point at the culprit quickly.</p>
<p><b>Where AI goes wrong:</b> it often writes recursive DFS for inputs where depth can reach 10<sup>5</sup>, adds <code>result.add(path)</code> without copying in backtracking, or claims "Java passes objects by reference" — which leads to wrong predictions about reassignment. These are exactly the bugs interviewers probe.</p>
<p><b>Use AI well:</b> paste a snippet and ask <code>Draw the stack frames and heap objects after each line, as a table</code>, then check it against your own drawing. Or ask it to produce tricky "what does this print?" aliasing puzzles.</p>
<p><b>What you must own:</b> the mental model of arrows. If you can draw stack-and-heap boxes for any snippet, you can predict linked-list, tree and backtracking behaviour without running code.</p>`,
    problems: [{
      title: 'Reverse an Array In Place',
      level: 'Easy', tags: ['arrays', 'two pointers', 'references'], companies: ['Infosys', 'TCS', 'Amazon'],
      statement: `<p>Write <code>void reverse(int[] a)</code> that reverses the array <b>in place</b>: after the call, the caller's array must hold the elements in reverse order. Use O(1) extra space.</p>`,
      constraints: `0 ≤ N ≤ 10<sup>6</sup>, −10<sup>9</sup> ≤ a[i] ≤ 10<sup>9</sup>`,
      example: `${H.arr([1, 2, 3, 4, 5], { label: 'before' })}${H.arr([5, 4, 3, 2, 1], { label: 'after', hl: { 0: 'g', 4: 'g', 1: 'b', 3: 'b', 2: 'y' } })}<p>Why: pairs (0,4) and (1,3) are swapped; the middle element (index 2) stays put.</p>`,
      brute: { why: `<p>Build a brand-new reversed array and then re-point the parameter to it: <code>a = rev;</code>. It even "works" when printed inside the method — but the <b>caller's</b> array is unchanged, because only the local copy of the address moved. Copying back element by element fixes correctness but uses O(N) extra memory.</p>`, code: String.raw`
class Solution {
    void reverse(int[] a) {
        int[] rev = new int[a.length];
        for (int i = 0; i < a.length; i++) rev[i] = a[a.length - 1 - i];
        a = rev;   // BUG: only the local reference changes; caller sees nothing
        // correct-but-wasteful fix: System.arraycopy(rev, 0, a, 0, a.length);
    }
}` },
      mcq: { q: 'Inside <code>reverse(int[] a)</code> you write <code>a = newArray;</code>. What does the caller see?', options: ['The original array, unchanged', 'The new array', 'null', 'A compile error'], answer: 0, explain: 'Java copied the address into a. Re-pointing the local copy does not touch the caller\'s variable. Only writes through the address (a[i] = …) are visible.' },
      hints: [`<p>Hint 1: The first and last elements trade places, then the second and second-to-last, and so on. You never need a second array.</p>`, `<p>Hint 2: Two indices: <code>i</code> from the left, <code>j</code> from the right. Swap <code>a[i]</code> and <code>a[j]</code> through the array reference, then move both inward.</p>`, `<p>Hint 3: Stop when <code>i &gt;= j</code> (handles odd length, length 0 and 1). Recipe: i = 0, j = n−1; while i &lt; j: swap(a, i, j); i++; j−−.</p>`],
      solution: {
        approach: `<p>Two pointers that walk toward each other, swapping through the array reference. Because every write goes through the address the caller gave us, the caller's array is reversed. Each element is moved once; only a temp variable is used.</p>`,
        code: String.raw`
class Solution {
    void reverse(int[] a) {
        int i = 0, j = a.length - 1;
        while (i < j) {
            int t = a[i];      // write THROUGH the reference, never reassign 'a'
            a[i] = a[j];
            a[j] = t;
            i++;
            j--;
        }
    }
}`,
        alt: [{ lang: 'python', code: String.raw`
def reverse(a):
    i, j = 0, len(a) - 1
    while i < j:
        a[i], a[j] = a[j], a[i]   # list is mutated in place; caller sees it
        i += 1
        j -= 1

nums = [1, 2, 3, 4, 5]
reverse(nums)
print(nums)  # [5, 4, 3, 2, 1]`, run: true }],
        dry: { head: ['i', 'j', 'swap', 'array after'], rows: [['0', '4', 'a[0] ↔ a[4]', '[5, 2, 3, 4, 1]'], ['1', '3', 'a[1] ↔ a[3]', '[5, 4, 3, 2, 1]'], ['2', '2', H.c('m', 'i ≥ j → stop'), H.c('g', '[5, 4, 3, 2, 1]')]] },
        complexity: `<p>O(N) time (N/2 swaps), O(1) extra space.</p>`,
        followUps: ['Reverse only the sub-range [l, r].', 'Rotate the array right by k using three reversals.', 'Reverse a String in Java (Strings are immutable — convert to char[] first).']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — Arrays and Strings basics
     ====================================================================== */
  topics.push({
    title: 'Arrays & Strings Basics',
    analogy: `<p>An <b>array</b> is a row of <b>numbered lockers</b> in a school corridor: all lockers are the same size, the row has a fixed length decided when it was built, and you can open locker #7 instantly without walking past the others. A Java <b>String</b> is a <b>printed sign</b>: you can read any letter, but to change one letter you must print a whole new sign. A <b>StringBuilder</b> is a <b>whiteboard</b> — write, erase and append freely, then "print" it once with <code>toString()</code>.</p>`,
    explain: `<h4>Arrays in 60 seconds</h4>
<ul><li>Create: <code>int[] a = new int[n];</code> (all zeros) or <code>int[] a = {4, 1, 7};</code></li>
<li>Default values: <code>0</code> for numbers, <code>false</code> for boolean, <code>'\\u0000'</code> for char, <code>null</code> for objects.</li>
<li>Length: <code>a.length</code> (a field — no brackets). Valid indexes: <b>0 … n − 1</b>. Index <code>n</code> → <code>ArrayIndexOutOfBoundsException</code>.</li>
<li>Access is <b>O(1)</b>: address of a[i] = start + i × size. That "jump straight there" power is why arrays are the backbone of DSA.</li>
<li>Size is fixed. Need to grow? Use <code>ArrayList&lt;Integer&gt;</code> (amortised O(1) add).</li></ul>
${H.arr([4, 1, 7, 3, 9], { label: 'int[] a', hl: { 2: 'y' }, ptr: { 2: 'a[2]' } })}
<h4>The Arrays utility class</h4>
${H.table(['Call', 'Does', 'Cost'], [
  ['<code>Arrays.toString(a)</code>', 'pretty print "[4, 1, 7]"', 'O(N)'],
  ['<code>Arrays.sort(a)</code>', 'sort ascending', 'O(N log N)'],
  ['<code>Arrays.fill(a, -1)</code>', 'set every cell', 'O(N)'],
  ['<code>Arrays.copyOfRange(a, l, r)</code>', 'new array of a[l..r−1]', 'O(r − l)'],
  ['<code>Arrays.equals(a, b)</code>', 'same length and same values?', 'O(N)']
])}
<h4>2D arrays (grids)</h4>
<p><code>int[][] g = new int[rows][cols];</code> — <code>g.length</code> is the number of rows, <code>g[0].length</code> the number of columns. A 2D array is really an <b>array of row arrays</b>. Visit the 4 neighbours of a cell with direction arrays <code>dr = {-1, 1, 0, 0}</code>, <code>dc = {0, 0, -1, 1}</code>.</p>
<h4>Strings in 60 seconds</h4>
${H.table(['Call', 'Example on s = "hello"', 'Note'], [
  ['<code>s.length()</code>', '5', 'method (with brackets!) — arrays use <code>.length</code>'],
  ['<code>s.charAt(1)</code>', '\'e\'', 'O(1)'],
  ['<code>s.substring(1, 4)</code>', '"ell"', 'end index is <b>exclusive</b>; O(length) copy'],
  ['<code>s.indexOf(\'l\')</code>', '2', '−1 if absent'],
  ['<code>s.toCharArray()</code>', '[h, e, l, l, o]', 'mutable copy you can sort or edit'],
  ['<code>s.equals(t)</code>', 'content compare', H.c('r', 'never use == for content')],
  ['<code>s.compareTo(t)</code>', 'negative / 0 / positive', 'dictionary order']
])}
<h4>The counting array trick</h4>
<p>When input is "lowercase English letters only", a letter <code>c</code> maps to index <code>c - 'a'</code> (0–25). An <code>int[26]</code> then counts letters in O(1) per character — faster and lighter than a HashMap.</p>`,
    clues: [
      '"String consists of lowercase English letters only" → <code>int[26]</code> counting with <code>c - \'a\'</code>',
      '"Grid", "matrix", "board of m × n cells" → 2D array + direction arrays for neighbours',
      '"Build the answer string" in a loop → <code>StringBuilder</code>, never <code>+=</code> in a loop',
      '"Compare two strings for equality" → <code>.equals</code>; "lexicographically smallest" → <code>compareTo</code>',
      '"1-indexed" in the statement → subtract 1 when storing, or allocate n + 1 cells',
      '"ASCII characters" (any printable) → <code>int[128]</code> or <code>int[256]</code> instead of 26'
    ],
    code: [String.raw`
// Array toolkit
int[] a = {5, 3, 8, 1};
System.out.println(a.length);                         // 4
Arrays.sort(a);                                       // [1, 3, 5, 8]
System.out.println(Arrays.toString(a));
int[] part = Arrays.copyOfRange(a, 1, 3);             // [3, 5]
int[] dp = new int[5];
Arrays.fill(dp, -1);                                  // [-1, -1, -1, -1, -1]

// 2D grid: count cells whose 4 neighbours are all smaller
int[][] g = {{1, 2, 1}, {2, 9, 2}, {1, 2, 1}};
int[] dr = {-1, 1, 0, 0}, dc = {0, 0, -1, 1};
int peaks = 0;
for (int r = 0; r < g.length; r++) {
    for (int c = 0; c < g[0].length; c++) {
        boolean peak = true;
        for (int d = 0; d < 4; d++) {
            int nr = r + dr[d], nc = c + dc[d];
            if (nr >= 0 && nr < g.length && nc >= 0 && nc < g[0].length && g[nr][nc] >= g[r][c]) peak = false;
        }
        if (peak) peaks++;
    }
}
System.out.println(Arrays.toString(part) + " " + peaks);   // [3, 5] 1`, String.raw`
// String toolkit
String s = "Hello, World";
System.out.println(s.length() + " " + s.charAt(4) + " " + s.substring(7));   // 12 o World
System.out.println(s.toLowerCase().indexOf("world"));                        // 7
String[] words = "the quick  brown".trim().split("\\s+");                   // split on runs of spaces
System.out.println(words.length + " " + String.join("-", words));           // 3 the-quick-brown

// Count letters with int[26]
int[] cnt = new int[26];
for (char ch : "banana".toCharArray()) cnt[ch - 'a']++;
System.out.println(cnt['a' - 'a'] + " " + cnt['n' - 'a']);                 // 3 2

// StringBuilder: the whiteboard
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 5; i++) sb.append(i).append(',');
sb.setLength(sb.length() - 1);              // drop trailing comma
sb.reverse();
System.out.println(sb.toString());          // 4,3,2,1,0

// Character helpers
char c = '7';
System.out.println(Character.isDigit(c) + " " + Character.isLetter('x') + " " + Character.toUpperCase('q'));`],
    codeTitle: ['Arrays and 2D grids', 'Strings, counting array and StringBuilder'],
    viz: {
      title: 'Counting letters with int[26] (are these two words anagrams?)',
      input: 'listen silent',
      inputLabel: 'Two lowercase words separated by a space (max 10 letters each)',
      gen: function (input) {
        var p = String(input).trim().toLowerCase().split(/\s+/);
        if (p.length !== 2 || !/^[a-z]{1,10}$/.test(p[0]) || !/^[a-z]{1,10}$/.test(p[1])) throw new Error('Enter two lowercase words (a-z, max 10 letters each) separated by a space, e.g. listen silent');
        var s = p[0], t = p[1], cnt = [], i, frames = [], L = [];
        for (i = 0; i < 26; i++) { cnt.push(0); L.push(String.fromCharCode(97 + i)); }
        var CODE = 'int[] cnt = new int[26];\nfor (char c : s.toCharArray()) cnt[c - \'a\']++;\nfor (char c : t.toCharArray()) cnt[c - \'a\']--;\nfor (int x : cnt) if (x != 0) return false;\nreturn true;';
        frames.push({ narr: 'One locker per letter: index 0 = \'a\', 1 = \'b\', … 25 = \'z\'. All start at 0. ' + (s.length !== t.length ? '<span class="c-y">(Lengths differ, so the real code could return false immediately — we will still count to show the idea.)</span>' : ''), parts: [
          { type: 'array', label: 'cnt[26]', values: cnt.slice(), idxLabels: L },
          { type: 'code', lang: 'java', code: CODE, hl: { 1: 'cur' } }
        ] });
        for (i = 0; i < s.length; i++) {
          var k = s.charCodeAt(i) - 97; cnt[k]++;
          var h = {}; h[k] = 'ok'; var sh = {}; sh[i] = 'cur';
          frames.push({ narr: 'First word: char <b>\'' + s[i] + '\'</b> → index <code>\'' + s[i] + '\' - \'a\'</code> = ' + k + '. Increment: cnt[' + k + '] = ' + cnt[k] + '.', parts: [
            { type: 'array', label: 'first word', values: s.split(''), hl: sh },
            { type: 'array', label: 'cnt[26]', values: cnt.slice(), idxLabels: L, hl: h },
            { type: 'code', lang: 'java', code: CODE, hl: { 2: 'cur' } }
          ] });
        }
        for (i = 0; i < t.length; i++) {
          var k2 = t.charCodeAt(i) - 97; cnt[k2]--;
          var h2 = {}; h2[k2] = cnt[k2] < 0 ? 'bad' : (cnt[k2] === 0 ? 'done' : 'cur'); var th = {}; th[i] = 'cur';
          frames.push({ narr: 'Second word: char <b>\'' + t[i] + '\'</b> → decrement cnt[' + k2 + '] to ' + cnt[k2] + '. ' + (cnt[k2] < 0 ? '<span class="c-r">Negative: the second word has more \'' + t[i] + '\'s than the first.</span>' : 'It cancels one copy from the first word.'), parts: [
            { type: 'array', label: 'second word', values: t.split(''), hl: th },
            { type: 'array', label: 'cnt[26]', values: cnt.slice(), idxLabels: L, hl: h2 },
            { type: 'code', lang: 'java', code: CODE, hl: { 3: 'cur' } }
          ] });
        }
        var bad = {}, ok = true;
        for (i = 0; i < 26; i++) if (cnt[i] !== 0) { bad[i] = 'bad'; ok = false; }
        frames.push({ narr: ok ? 'Every locker is back to <b>0</b>: each letter appeared equally often in both words → <span class="c-g"><b>anagrams</b></span>. Total work: one pass over each word + 26 checks = O(N).' : 'Some lockers are not 0 (red) → letter counts differ → <span class="c-r"><b>not anagrams</b></span>.', parts: [
          { type: 'array', label: 'cnt[26]', values: cnt.slice(), idxLabels: L, hl: bad },
          { type: 'code', lang: 'java', code: CODE, hl: ok ? { 5: 'ok' } : { 4: 'bad' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'String += in a loop is secretly O(N²)', html: `<p>Each <code>s += c</code> creates a <b>new</b> String and copies all previous characters. Building a 10<sup>5</sup>-char string that way copies about 1 + 2 + … + 10<sup>5</sup> ≈ 5 × 10<sup>9</sup> chars. StringBuilder appends into a growing buffer: total O(N).</p>
${H.table(['Length built', 'chars copied with +=', 'with StringBuilder'], [['10', '55', '≈ 10'], ['1,000', '≈ 500,000', '≈ 1,000'], ['100,000', H.c('r', '≈ 5,000,000,000'), H.c('g', '≈ 100,000')]])}`, code: String.raw`
int n = 20_000;
long t0 = System.nanoTime();
String s = "";
for (int i = 0; i < n; i++) s += 'x';                 // quadratic copying
long t1 = System.nanoTime();
StringBuilder sb = new StringBuilder();
for (int i = 0; i < n; i++) sb.append('x');           // linear
String fast = sb.toString();
long t2 = System.nanoTime();
System.out.println("+=: " + (t1 - t0) / 1_000_000 + " ms, StringBuilder: " + (t2 - t1) / 1_000_000 + " ms, same=" + s.equals(fast));` },
      { title: 'substring indexes: start inclusive, end exclusive', html: `<p><code>s.substring(i, j)</code> returns characters at positions i, i+1, …, j−1, so its length is <b>j − i</b>. To take k characters starting at i use <code>substring(i, i + k)</code>. Looping over all substrings uses <code>j</code> from <code>i + 1</code> to <code>n</code> inclusive.</p>
${H.arr(['c', 'o', 'd', 'e', 'r'], { label: 's', hl: { 1: 'b', 2: 'b', 3: 'b' } })}<p>${H.c('b', 's.substring(1, 4) = "ode"')} (indexes 1, 2, 3).</p>`, code: String.raw`
String s = "coder";
System.out.println(s.substring(1, 4));   // ode
System.out.println(s.substring(2));      // der  (to the end)
for (int i = 0; i < 2; i++)
    for (int j = i + 1; j <= 3; j++)
        System.out.print(s.substring(i, j) + " ");   // c co cod o od` },
      { title: 'Sorting descending and sorting 2D arrays', html: `<p><code>Arrays.sort(int[])</code> only sorts ascending. For descending, either sort and walk backwards, or use a boxed <code>Integer[]</code> with a comparator. Sorting intervals by start: <code>Arrays.sort(iv, (x, y) -&gt; Integer.compare(x[0], y[0]))</code>. Prefer <code>Integer.compare</code> over <code>x[0] - y[0]</code>, which can overflow.</p>`, code: String.raw`
Integer[] boxed = {5, 1, 4};
Arrays.sort(boxed, Collections.reverseOrder());
System.out.println(Arrays.toString(boxed));          // [5, 4, 1]

int[][] iv = {{5, 6}, {1, 3}, {2, 4}};
Arrays.sort(iv, (x, y) -> Integer.compare(x[0], y[0]));
System.out.println(Arrays.deepToString(iv));         // [[1, 3], [2, 4], [5, 6]]` },
      { title: 'Palindrome check with two indexes', html: `<p>A palindrome reads the same both ways ("racecar"). Compare <code>charAt(i)</code> with <code>charAt(n - 1 - i)</code> for the first half only. No new string, O(1) extra space — far better than building a reversed copy.</p>
${H.arr(['r', 'a', 'c', 'e', 'c', 'a', 'r'], { hl: { 0: 'g', 6: 'g', 1: 'b', 5: 'b', 2: 'p', 4: 'p', 3: 'y' } })}`, code: String.raw`
String w = "racecar";
boolean pal = true;
for (int i = 0, j = w.length() - 1; i < j; i++, j--) {
    if (w.charAt(i) != w.charAt(j)) { pal = false; break; }
}
System.out.println(pal);   // true` }
    ],
    deepDive: `<h4>How Java Strings are stored (Java 9+)</h4>
<p>Since Java 9, a String holds a <code>byte[]</code> plus a <b>coder</b> flag: <b>LATIN-1</b> (1 byte per char) when every character fits, otherwise <b>UTF-16</b> (2 bytes per char). This "compact strings" feature halves memory for typical ASCII text. A String also caches its <code>hashCode</code> after the first computation, which is why Strings are cheap repeated HashMap keys.</p>
<h4>substring copies (since 7u6)</h4>
<p>Old Java versions shared the parent's char array in <code>substring</code> (O(1), but leaked memory). Modern Java <b>copies</b>, so <code>substring</code> is O(length). Looping over all O(N²) substrings and creating each one is O(N³) total — a frequent hidden cost.</p>
<h4>The string pool and ==</h4>
<p>String <b>literals</b> are interned: <code>"ab" == "ab"</code> is true because both point to the same pooled object. Strings built at runtime (<code>new String("ab")</code>, <code>sb.toString()</code>, concatenation of variables) are new objects, so <code>==</code> is false even when contents match. Code that "works" with == on literals and breaks on input is a classic bug.</p>
<h4>Arrays.sort internals and the anti-quicksort trap</h4>
<p>For primitives, <code>Arrays.sort</code> uses <b>dual-pivot quicksort</b> (not stable, O(N log N) typical). Modern JDKs fall back to heapsort when recursion gets too deep, so worst-case blow-ups are largely mitigated, but on older judges carefully crafted inputs could force O(N²). Competitive programmers sometimes shuffle first or sort a <code>long[]</code>/boxed array. For objects (<code>Integer[]</code>, <code>int[][]</code>), Java uses <b>TimSort</b>: stable, O(N log N) worst case, very fast on partially sorted data.</p>
<h4>Unicode reality</h4>
<p>A Java <code>char</code> is a UTF-16 <b>code unit</b>, not a full character. Emoji like 😀 take <b>two</b> chars (a surrogate pair), so <code>"😀".length() == 2</code>. Use <code>s.codePoints()</code> when real Unicode text matters (production code); interview problems almost always restrict input to ASCII.</p>
<h4>Cache friendliness</h4>
<p>Arrays are contiguous, so scanning them uses the CPU cache beautifully. Iterating a 2D array <b>row by row</b> (<code>g[r][c]</code> with c in the inner loop) is noticeably faster than column by column, because each row is one contiguous block.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants instantly recall API details (<code>copyOfRange</code> bounds, <code>split</code> regex quirks), so memorising every method is less critical than knowing <b>what exists</b> and <b>what it costs</b>.</p>
<p><b>Where AI goes wrong:</b> it uses <code>s += ...</code> in loops, calls <code>substring</code> inside nested loops without noticing the O(N³), compares Strings with <code>==</code>, mixes up <code>.length</code> / <code>.length()</code> / <code>.size()</code>, and writes <code>split(".")</code> (a regex meaning "any char" — returns an empty array!).</p>
<p><b>Use AI well:</b> <code>Review this Java string-processing code only for hidden O(N^2) costs and API misuse.</code> Ask for edge cases: empty string, single char, all same chars, mixed case, spaces.</p>
<p><b>What you must own:</b> choosing the representation (char[] vs String vs StringBuilder vs int[26]) from the constraints, and reasoning about index boundaries without running code.</p>`,
    problems: [{
      title: 'Valid Anagram',
      level: 'Easy', tags: ['strings', 'counting array'], companies: ['Amazon', 'Bloomberg', 'Google', 'Meta'],
      statement: `<p>Given two strings <code>s</code> and <code>t</code>, return <code>true</code> if <code>t</code> is an anagram of <code>s</code> (same letters, same counts, any order), otherwise <code>false</code>.</p>`,
      constraints: `1 ≤ s.length, t.length ≤ 5 × 10<sup>4</sup>; s and t consist of lowercase English letters.`,
      example: `<p><code>s = "anagram", t = "nagaram"</code> → ${H.c('g', 'true')} (a×3, n×1, g×1, r×1, m×1 in both).</p><p><code>s = "rat", t = "car"</code> → ${H.c('r', 'false')} ('t' vs 'c').</p>`,
      brute: { why: `<p>For each character of <code>s</code>, search for it in a list of <code>t</code>'s characters and remove it. Each search/removal scans up to N characters, so the total is O(N²) ≈ 2.5 × 10<sup>9</sup> steps for N = 5 × 10<sup>4</sup> — too slow. The wasted work: we re-scan <code>t</code> again and again just to ask "how many of this letter are left?" — a question a counter answers in O(1).</p>`, code: String.raw`
class Solution {
    public boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;
        List<Character> pool = new ArrayList<>();
        for (char c : t.toCharArray()) pool.add(c);
        for (char c : s.toCharArray()) {
            if (!pool.remove(Character.valueOf(c))) return false;   // O(N) scan + shift
        }
        return true;
    }
}` },
      mcq: { q: 'Input is guaranteed to be lowercase English letters. Which structure counts letters most efficiently?', options: ['int[26] indexed by c - \'a\'', 'HashMap&lt;Character, Integer&gt;', 'Sorting both strings', 'A List&lt;Character&gt;'], answer: 0, explain: 'A fixed 26-cell array gives O(1) access with no hashing or boxing. HashMap works too but is slower; sorting is O(N log N).' },
      hints: [`<p>Hint 1: Two strings are anagrams exactly when every letter appears the same number of times in both. Order does not matter at all.</p>`, `<p>Hint 2: One <code>int[26]</code>: +1 for each letter of s, −1 for each letter of t. If they are anagrams, every cell returns to 0.</p>`, `<p>Hint 3: Early exit when lengths differ. Recipe: if lengths differ → false; for i: cnt[s[i]−'a']++, cnt[t[i]−'a']−−; return all cells == 0. Unicode follow-up → use a HashMap.</p>`],
      solution: {
        approach: `<p>Counting array. Different lengths can never be anagrams. Otherwise add counts for <code>s</code> and subtract for <code>t</code> in the same loop; any non-zero cell proves a mismatch.</p>`,
        code: String.raw`
class Solution {
    public boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;   // quick reject
        int[] cnt = new int[26];
        for (int i = 0; i < s.length(); i++) {
            cnt[s.charAt(i) - 'a']++;                  // letter from s: +1
            cnt[t.charAt(i) - 'a']--;                  // letter from t: -1
        }
        for (int c : cnt) if (c != 0) return false;   // any imbalance → not anagram
        return true;
    }
}`,
        alt: [{ lang: 'python', code: String.raw`
from collections import Counter

def is_anagram(s, t):
    return len(s) == len(t) and Counter(s) == Counter(t)

print(is_anagram("anagram", "nagaram"), is_anagram("rat", "car"))  # True False`, run: true }],
        dry: { head: ['i', 's[i]', 't[i]', 'changed cells'], rows: [['0', 'r', 'c', 'cnt[r] = 1, cnt[c] = −1'], ['1', 'a', 'a', 'cnt[a] = 0'], ['2', 't', 'r', 'cnt[t] = 1, cnt[r] = 0'], ['end', '', '', H.c('r', 'cnt[c] = −1, cnt[t] = 1 → false')]] },
        complexity: `<p>O(N) time, O(1) space (26 counters, independent of N).</p>`,
        followUps: ['What if inputs contain Unicode characters? (HashMap&lt;Integer,Integer&gt; over code points.)', 'Group a list of words into anagram families.', 'Find all start indexes in s where an anagram of p begins (sliding window + counts).']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — Methods
     ====================================================================== */
  topics.push({
    title: 'Methods: Breaking Problems into Small Functions',
    analogy: `<p>A method is a <b>kitchen appliance</b>. A blender has a clear job: put fruit in (<b>parameters</b>), press the button, get a smoothie out (<b>return value</b>). You do not care how the motor works each time you use it, and you can use the same blender for a hundred recipes. A good solution is a counter of small, well-labelled appliances — <code>isPrime</code>, <code>gcd</code>, <code>inBounds</code> — instead of one giant tangled machine.</p>`,
    explain: `<h4>Anatomy of a method</h4>
${H.table(['Part', 'In <code>static long power(int base, int exp)</code>', 'Meaning'], [
  ['modifiers', '<code>static</code>', 'belongs to the class; callable without creating an object'],
  ['return type', '<code>long</code>', 'what comes out (<code>void</code> = nothing)'],
  ['name', '<code>power</code>', 'a verb that says what it does'],
  ['parameters', '<code>int base, int exp</code>', 'inputs; each call gets fresh copies'],
  ['body', '<code>{ ... return result; }</code>', '<code>return</code> ends the method immediately']
])}
<h4>Why methods make you faster in interviews</h4>
<ul><li><b>Readability:</b> <code>if (inBounds(r, c) &amp;&amp; !seen[r][c])</code> reads like English; the interviewer follows you easily.</li>
<li><b>Testability:</b> you can check <code>isPalindrome("abba")</code> alone before trusting the full solution.</li>
<li><b>Reuse:</b> write <code>gcd</code> once, call it everywhere.</li>
<li><b>Early return:</b> <code>return false;</code> the moment you find a problem, instead of juggling flags.</li></ul>
<h4>Static vs instance</h4>
<p>In a judge program with <code>main</code>, make helpers <code>static</code> so <code>main</code> (which is static) can call them directly. On LeetCode your methods live inside <code>class Solution</code> and are instance methods; helpers you add there can be plain <code>private</code> methods.</p>
<h4>Overloading</h4>
<p>Several methods may share a name if their <b>parameter lists differ</b>: <code>max(int, int)</code> and <code>max(long, long)</code>. Java picks the best match at <b>compile time</b>. The return type alone cannot distinguish overloads.</p>
<h4>Methods calling methods — the call stack</h4>
<p>Every call pushes a new frame; <code>return</code> pops it and hands the value back to the caller, which continues exactly where it paused. A method may even call <b>itself</b> (recursion) as long as it has a <b>base case</b> that stops the chain — you will master this in the Recursion module.</p>
${H.table(['Call stack while computing isArmstrong(153)', ''], [['main', 'waiting for isArmstrong'], ['isArmstrong(153)', 'waiting for countDigits'], [H.c('y', 'countDigits(153)'), H.c('y', 'running → returns 3')]])}`,
    clues: [
      '"Implement the function <code>xyz(...)</code>" → that signature is your contract; add private helpers freely',
      'The same check appears in several places (bounds, validity, digit sum) → extract a helper method',
      '"For each of Q queries, answer…" → write <code>solve(query)</code> and call it in a loop; reset state inside',
      '"Return two values" (e.g. min and max) → return an <code>int[]</code> or a <code>record</code>',
      '"Defined recursively" (e.g. f(n) = f(n−1) + …) → a method that calls itself with a base case',
      'Interviewer says "assume a helper exists for X" → write its signature, explain its contract, implement later'
    ],
    code: [String.raw`
// A tiny helper library you will reuse across many problems.
class Helpers {
    // Greatest common divisor (Euclid): gcd(a, b) = gcd(b, a % b)
    static long gcd(long a, long b) {
        while (b != 0) { long t = a % b; a = b; b = t; }
        return Math.abs(a);
    }

    // Integer power without doubles (exact up to long range)
    static long power(long base, int exp) {
        long result = 1;
        for (int i = 0; i < exp; i++) result *= base;
        return result;
    }

    // Grid bounds check: makes neighbour loops readable
    static boolean inBounds(int r, int c, int rows, int cols) {
        return r >= 0 && r < rows && c >= 0 && c < cols;
    }

    // Early return keeps the logic flat
    static boolean isPrime(int n) {
        if (n < 2) return false;
        for (long d = 2; d * d <= n; d++) {
            if (n % d == 0) return false;     // found a divisor: stop now
        }
        return true;
    }

    // Overloading: same name, different parameter types
    static int max(int a, int b) { return a > b ? a : b; }
    static long max(long a, long b) { return a > b ? a : b; }

    public static void main(String[] args) {
        System.out.println(gcd(84, 36) + " " + power(3, 4) + " " + isPrime(97) + " "
                + inBounds(2, 3, 3, 3) + " " + max(4, 9) + " " + max(4L, 10_000_000_000L));
        // 12 81 true false 9 10000000000
    }
}`, String.raw`
// Returning several values: a record (Java 16+) is the cleanest way.
record MinMax(int min, int max) {}

class Stats {
    static MinMax minMax(int[] a) {
        int lo = Integer.MAX_VALUE, hi = Integer.MIN_VALUE;
        for (int v : a) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
        return new MinMax(lo, hi);
    }
    public static void main(String[] args) {
        MinMax r = minMax(new int[]{4, -2, 9, 7});
        System.out.println(r.min() + " " + r.max());   // -2 9
        System.out.println(r);                          // MinMax[min=-2, max=9]
    }
}`],
    codeTitle: ['Reusable helper methods', 'Returning multiple values with a record'],
    viz: {
      title: 'Call stack: isArmstrong(n) calling its helpers',
      input: '153',
      inputLabel: 'A positive number with 1 to 6 digits',
      gen: function (input) {
        var s = String(input).trim();
        if (!/^[1-9]\d{0,5}$/.test(s)) throw new Error('Enter a positive whole number with 1 to 6 digits, e.g. 153 or 9474');
        var n = parseInt(s, 10), frames = [], k = s.length;
        var CODE = 'static boolean isArmstrong(int n) {\n    int k = countDigits(n);\n    long sum = 0;\n    for (int m = n; m > 0; m /= 10)\n        sum += power(m % 10, k);\n    return sum == n;\n}';
        frames.push({ narr: '<code>main</code> calls <code>isArmstrong(' + n + ')</code>. Java pushes a new frame with its own copy of n. main is <b>paused</b>, waiting for a boolean.', parts: [
          { type: 'stack', label: 'Call stack', items: ['main', 'isArmstrong(n=' + n + ')'], hl: { 1: 'cur' } },
          { type: 'code', lang: 'java', code: CODE, hl: { 1: 'cur' } }
        ] });
        frames.push({ narr: 'First line calls the helper <code>countDigits(' + n + ')</code>: another frame on top. isArmstrong pauses mid-line.', parts: [
          { type: 'stack', label: 'Call stack', items: ['main', 'isArmstrong(n=' + n + ')', 'countDigits(' + n + ')'], hl: { 2: 'cur' } },
          { type: 'code', lang: 'java', code: CODE, hl: { 2: 'cur' } }
        ] });
        frames.push({ narr: 'countDigits finishes and <b>returns ' + k + '</b>. Its frame is popped; isArmstrong resumes and stores k = ' + k + '.', parts: [
          { type: 'stack', label: 'Call stack', items: ['main', 'isArmstrong(n=' + n + ')'], hl: { 1: 'ok' } },
          { type: 'vars', vals: { n: n, k: k, sum: 0 }, hl: { k: 'ok' } },
          { type: 'code', lang: 'java', code: CODE, hl: { 2: 'ok', 3: 'cur' } }
        ] });
        var sum = 0, m = n;
        while (m > 0) {
          var d = m % 10, pw = Math.pow(d, k);
          frames.push({ narr: 'Digit <b>' + d + '</b>: call <code>power(' + d + ', ' + k + ')</code>. A fresh frame computes ' + d + '<sup>' + k + '</sup> = ' + pw + ' and returns it.', parts: [
            { type: 'stack', label: 'Call stack', items: ['main', 'isArmstrong(n=' + n + ')', 'power(' + d + ', ' + k + ') → ' + pw], hl: { 2: 'cur' } },
            { type: 'vars', vals: { m: m, digit: d, k: k, sum: sum }, hl: { digit: 'cur' } },
            { type: 'code', lang: 'java', code: CODE, hl: { 5: 'cur' } }
          ] });
          sum += pw;
          m = Math.floor(m / 10);
          frames.push({ narr: 'power returned; its frame is gone. sum += ' + pw + ' → <b>' + sum + '</b>. Drop the digit: m = ' + m + '.', parts: [
            { type: 'stack', label: 'Call stack', items: ['main', 'isArmstrong(n=' + n + ')'], hl: { 1: 'cur' } },
            { type: 'vars', vals: { m: m, k: k, sum: sum }, hl: { sum: 'ok' } },
            { type: 'code', lang: 'java', code: CODE, hl: { 4: 'cur' } }
          ] });
        }
        var ans = sum === n;
        frames.push({ narr: 'Loop done. <code>return sum == n</code> → ' + sum + (ans ? ' == ' : ' ≠ ') + n + ' → <b>' + ans + '</b>. ' + (ans ? n + ' is an Armstrong number!' : n + ' is not an Armstrong number. Try 153, 370, 371, 407, 1634, 8208, 9474 or 54748.'), parts: [
          { type: 'stack', label: 'Call stack', items: ['main'], hl: { 0: ans ? 'ok' : 'bad' } },
          { type: 'vars', vals: { n: n, sum: sum, result: String(ans) }, hl: { result: ans ? 'sel' : 'bad' } },
          { type: 'code', lang: 'java', code: CODE, hl: { 6: ans ? 'ok' : 'bad' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Helper for grid neighbours', html: `<p>Counting land cells next to water appears in many grid problems. With an <code>inBounds</code> helper the neighbour loop shrinks to one readable line, and the edge-of-grid bugs live in exactly one place.</p>
${H.table(['grid', '', ''], [['1', '1', '0'], ['0', '1', '0'], ['0', '0', '0']])}<p>Land cells touching water (or the border) on any side: all 3.</p>`, code: String.raw`
class Coast {
    static int[] DR = {-1, 1, 0, 0}, DC = {0, 0, -1, 1};
    static boolean inBounds(int[][] g, int r, int c) { return r >= 0 && r < g.length && c >= 0 && c < g[0].length; }
    static boolean isCoast(int[][] g, int r, int c) {
        for (int d = 0; d < 4; d++) {
            int nr = r + DR[d], nc = c + DC[d];
            if (!inBounds(g, nr, nc) || g[nr][nc] == 0) return true;   // early return
        }
        return false;
    }
    public static void main(String[] args) {
        int[][] g = {{1, 1, 0}, {0, 1, 0}, {0, 0, 0}};
        int count = 0;
        for (int r = 0; r < 3; r++) for (int c = 0; c < 3; c++) if (g[r][c] == 1 && isCoast(g, r, c)) count++;
        System.out.println(count);   // 3
    }
}` },
      { title: 'Overload resolution surprises', html: `<p>Java chooses an overload at compile time in phases: <b>exact/widening</b> first, then <b>boxing</b>, then <b>varargs</b>. So <code>f(5)</code> prefers <code>f(long)</code> (widening) over <code>f(Integer)</code> (boxing).</p>
${H.table(['Call', 'Available', 'Chosen'], [['<code>f(5)</code>', 'f(long), f(Integer)', H.c('g', 'f(long)')], ['<code>f(5)</code>', 'f(Integer), f(int...)', H.c('g', 'f(Integer)')]])}`, code: String.raw`
class Over {
    static String f(long x) { return "long"; }
    static String f(Integer x) { return "Integer"; }
    static String g(Integer x) { return "Integer"; }
    static String g(int... x) { return "varargs"; }
    public static void main(String[] args) {
        System.out.println(f(5) + " " + g(5));   // long Integer
    }
}` },
      { title: 'Static state is not reset between test cases', html: `<p>LeetCode runs all test cases in the <b>same JVM</b>, creating a new <code>Solution</code> object per test but <b>keeping static fields</b>. A static counter that you forget to reset gives correct output on the first test and wrong output on later ones. Prefer local variables or instance fields, and reset any shared state at the start of each call.</p>`, code: String.raw`
class Solution {
    static int calls = 0;                 // shared across ALL test cases (danger)
    private int localCalls = 0;           // fresh for each new Solution object

    public int countSomething(int[] a) {
        calls = 0;                        // reset explicitly if you must use static
        for (int v : a) if (v > 0) { calls++; localCalls++; }
        return calls;
    }
}` },
      { title: 'A first recursive method', html: `<p><code>sumTo(n)</code> = n + sumTo(n − 1), with <b>base case</b> sumTo(0) = 0. Each call waits for the smaller one, so the stack grows to depth n, then unwinds adding numbers on the way back.</p>
${H.table(['call', 'returns'], [['sumTo(3)', '3 + sumTo(2) = 6'], ['sumTo(2)', '2 + sumTo(1) = 3'], ['sumTo(1)', '1 + sumTo(0) = 1'], ['sumTo(0)', H.c('g', '0 (base case)')]])}`, code: String.raw`
class Rec {
    static long sumTo(int n) {
        if (n == 0) return 0;          // base case stops the chain
        return n + sumTo(n - 1);       // smaller sub-problem
    }
    public static void main(String[] args) { System.out.println(sumTo(3) + " " + sumTo(1000)); }   // 6 500500
}` }
    ],
    deepDive: `<h4>Do helpers make code slower?</h4>
<p>Practically never. HotSpot's JIT <b>inlines</b> small methods (bytecode under ~35 bytes always; hot methods up to ~325 bytes), pasting their body into the caller. A clean <code>inBounds()</code> costs the same as the inline condition after warm-up. Readability wins.</p>
<h4>Overload resolution in detail</h4>
<p>The compiler finds all applicable methods in three phases: (1) without boxing or varargs, (2) allowing boxing/unboxing, (3) allowing varargs. Within a phase it picks the <b>most specific</b> signature; if two are equally specific the call is <b>ambiguous</b> (compile error). Overriding (runtime, by object type) is different from overloading (compile time, by declared argument types).</p>
<h4>Parameters are copies — and final is cheap documentation</h4>
<p>Marking parameters <code>final</code> prevents accidental reassignment and changes nothing at runtime. Since Java copies arguments, a method that must "return" several things should return an object/array/record rather than trying to modify primitive parameters.</p>
<h4>Recursion cost</h4>
<p>Each call costs a frame (tens of bytes) and a little time to push/pop. A method that recurses N times uses O(N) stack space even if it allocates nothing on the heap — always count recursion depth in your space complexity.</p>
<h4>Designing a good signature</h4>
<ul><li>Pass what the helper needs, not your whole world (<code>inBounds(r, c, rows, cols)</code> vs reading globals).</li>
<li>Return values instead of mutating globals when possible — easier to test and reason about.</li>
<li>Name with verbs/questions: <code>countDigits</code>, <code>isValid</code>, <code>buildGraph</code>.</li>
<li>In judge code, static fields for big shared arrays (e.g. adjacency lists) are fine, but re-initialise them per test case.</li></ul>
<h4>Varargs and generics</h4>
<p><code>static int sum(int... xs)</code> receives an <code>int[]</code>; each call allocates an array, so avoid varargs in hot inner loops. Generic helpers like <code>static &lt;T extends Comparable&lt;T&gt;&gt; T maxOf(List&lt;T&gt; xs)</code> work with any comparable type but box primitives.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI agents are great at "extract this block into a well-named method" refactors and at generating unit tests for small helpers. Decomposed code is also <b>easier for AI to review</b> — small pure functions get better suggestions than 200-line mains.</p>
<p><b>How to work alongside it:</b> write the top-level plan as method calls first (<code>parse(); build(); answer();</code>), then let an assistant draft individual helpers while you verify each against its contract. In interviews, narrate the same way: "I'll assume <code>isValid(r, c)</code> exists and come back to it."</p>
<p><b>Where AI goes wrong:</b> helpers that silently rely on static state, overloads with surprising resolution, and duplicated logic instead of reuse. It also tends to over-engineer (interfaces, factories) for a 30-line algorithm.</p>
<p><b>What you must own:</b> choosing the decomposition — which helpers make the algorithm obvious — and keeping each one small, correct and tested.</p>`,
    problems: [{
      title: 'Armstrong Numbers in a Range',
      level: 'Easy', tags: ['methods', 'math', 'digits'], companies: ['TCS', 'Wipro', 'Accenture', 'Cognizant'],
      statement: `<p>A number with <code>k</code> digits is an <b>Armstrong number</b> if the sum of each digit raised to the power <code>k</code> equals the number itself (e.g. 153 = 1³ + 5³ + 3³). Return all Armstrong numbers in the range <code>[lo, hi]</code>, in increasing order.</p>`,
      constraints: `1 ≤ lo ≤ hi ≤ 10<sup>6</sup>`,
      example: `<p><code>lo = 100, hi = 500</code> → ${H.c('g', '[153, 370, 371, 407]')}</p><p>Why 370: 3³ + 7³ + 0³ = 27 + 343 + 0 = ${H.c('g', '370')}. Why not 154: 1 + 125 + 64 = 190 ≠ 154.</p>`,
      brute: { why: `<p>One long loop body that converts each number to a String to count digits, then calls <code>Math.pow(digit, k)</code> (a <b>double</b>) for every digit and casts back. It works, but it is hard to read, allocates a String per number, recomputes the same small powers millions of times, and relies on double rounding being exact. Nothing is reusable or testable on its own.</p>`, code: String.raw`
class Solution {
    public List<Integer> armstrong(int lo, int hi) {
        List<Integer> out = new ArrayList<>();
        for (int n = lo; n <= hi; n++) {
            int k = String.valueOf(n).length();          // allocates a String every time
            int sum = 0, m = n;
            while (m > 0) {
                sum += (int) Math.pow(m % 10, k);        // double math for integer powers
                m /= 10;
            }
            if (sum == n) out.add(n);
        }
        return out;
    }
}` },
      mcq: { q: 'Why is <code>(int) Math.pow(d, k)</code> considered risky for integer powers in general?', options: ['It computes in double and can round below the true value for large results', 'It is a compile error', 'It only accepts positive bases', 'It always returns 0 for k &gt; 3'], answer: 0, explain: 'Math.pow returns a double. For small values it is exact, but large integer powers may not be representable exactly, and casting truncates. Integer loops or precomputed tables are exact.' },
      hints: [`<p>Hint 1: Split the job into tiny questions: "how many digits does n have?", "what is d<sup>k</sup>?", "is n Armstrong?". Each is a helper.</p>`, `<p>Hint 2: Only digits 0–9 are ever raised to a power, and k ≤ 7. Precompute <code>pow[k][d]</code> once with integer multiplication.</p>`, `<p>Hint 3: Remember 1-digit numbers are all Armstrong (d¹ = d). Recipe: build pow table → for n in [lo, hi]: k = countDigits(n); if digitPowerSum(n, k) == n add n.</p>`],
      solution: {
        approach: `<p>Decompose into helpers: <code>countDigits</code>, <code>digitPowerSum</code> and <code>isArmstrong</code>, with a precomputed table <code>POW[k][d] = d<sup>k</sup></code> built by integer multiplication. The main method becomes a two-line loop that reads like the problem statement.</p>`,
        code: String.raw`
class Solution {
    // POW[k][d] = d^k for k = 0..7, d = 0..9 (exact integers)
    private static final long[][] POW = new long[8][10];
    static {
        for (int d = 0; d <= 9; d++) {
            POW[0][d] = 1;
            for (int k = 1; k < 8; k++) POW[k][d] = POW[k - 1][d] * d;
        }
    }

    private static int countDigits(int n) {
        int k = 0;
        do { k++; n /= 10; } while (n > 0);   // do-while: 0 has one digit
        return k;
    }

    private static long digitPowerSum(int n, int k) {
        long sum = 0;
        for (int m = n; m > 0; m /= 10) sum += POW[k][m % 10];
        return sum;
    }

    private static boolean isArmstrong(int n) {
        return digitPowerSum(n, countDigits(n)) == n;
    }

    public List<Integer> armstrong(int lo, int hi) {
        List<Integer> out = new ArrayList<>();
        for (int n = lo; n <= hi; n++) if (isArmstrong(n)) out.add(n);
        return out;
    }
}`,
        alt: [{ lang: 'python', code: String.raw`
def is_armstrong(n):
    k = len(str(n))
    return sum(int(d) ** k for d in str(n)) == n

def armstrong(lo, hi):
    return [n for n in range(lo, hi + 1) if is_armstrong(n)]

print(armstrong(100, 500))  # [153, 370, 371, 407]`, run: true }],
        dry: { head: ['n', 'countDigits', 'digitPowerSum', 'Armstrong?'], rows: [['153', '3', '1 + 125 + 27 = 153', H.c('g', 'yes')], ['154', '3', '1 + 125 + 64 = 190', H.c('r', 'no')], ['370', '3', '27 + 343 + 0 = 370', H.c('g', 'yes')], ['407', '3', '64 + 0 + 343 = 407', H.c('g', 'yes')]] },
        complexity: `<p>O((hi − lo + 1) · D) time where D ≤ 7 digits; O(1) extra space besides the output (the table has 80 entries).</p>`,
        followUps: ['Count Armstrong numbers up to 10<sup>18</sup> (only 88 exist in base 10 overall — generate by digit multisets instead of scanning).', 'Write unit tests for each helper separately.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — Reading constraints
     ====================================================================== */
  topics.push({
    title: 'Reading Constraints: The Hidden Hint in Every Problem',
    analogy: `<p>Constraints are like the <b>size of the box</b> a gift comes in. A tiny box means jewellery, a long thin box means an umbrella, a huge box means furniture. Before opening anything, you already have a strong guess. In the same way, <b>N ≤ 20</b> whispers "try every subset", <b>N ≤ 10<sup>5</sup></b> says "you need about N log N", and <b>N ≤ 10<sup>18</sup></b> shouts "do not even loop to N — use math or halving". The problem setter is quietly telling you the intended solution.</p>`,
    explain: `<h4>The golden rule</h4>
<p>A typical judge runs roughly <b>10<sup>8</sup> simple operations per second</b> in Java (a rough rule of thumb: real speed depends on what each operation does). With a 1–2 second limit, aim for at most ~10<sup>8</sup> basic steps. So: plug the largest N into your complexity and compare against 10<sup>8</sup>.</p>
<h4>Constraint → allowed complexity (memorise this table)</h4>
${H.table(['Largest N', 'Max complexity that fits', 'Typical techniques'], [
  ['N ≤ 10–11', 'O(N!)', 'all permutations, brute-force backtracking'],
  ['N ≤ 20–25', 'O(2<sup>N</sup>) or O(2<sup>N</sup> · N)', 'all subsets, bitmasks, meet-in-the-middle (≤ 40)'],
  ['N ≤ 100–500', 'O(N<sup>3</sup>)', 'triple loops, Floyd-Warshall, interval DP'],
  ['N ≤ 2,000–5,000', 'O(N<sup>2</sup>)', 'all pairs, 2D DP, simple brute force'],
  ['N ≤ 10<sup>5</sup>–10<sup>6</sup>', 'O(N log N) or O(N)', 'sorting, binary search, heaps, hashing, two pointers, prefix sums'],
  ['N ≤ 10<sup>7</sup>–10<sup>8</sup>', 'O(N) with a small constant', 'single pass, sieve, counting arrays'],
  ['N ≤ 10<sup>9</sup>–10<sup>18</sup>', 'O(√N), O(log N) or O(1)', 'math formulas, binary search on answer, fast exponentiation']
])}
<h4>Value ranges choose your data types</h4>
<ul><li>Values ≤ 10<sup>9</sup>: each fits in <code>int</code>, but a <b>sum</b> of many, or a <b>product</b> of two, needs <code>long</code>.</li>
<li>Values ≤ 10<sup>18</sup>: fits in <code>long</code>, but products overflow → BigInteger or modular tricks.</li>
<li>Values ≤ 10<sup>6</sup>: small enough to use the <b>value as an array index</b> (counting arrays).</li>
<li>Values can be <b>negative</b>: sliding-window "shrink when sum too big" tricks may break; counting arrays need an offset.</li></ul>
<h4>Hidden multipliers</h4>
<ul><li><b>T test cases</b>: total work = T × per-test work — unless the statement says "sum of N over all test cases ≤ 2 · 10<sup>5</sup>", which bounds the total directly.</li>
<li><b>Q queries</b>: O(N) per query with N = Q = 10<sup>5</sup> is 10<sup>10</sup> → TLE; you need O(log N) or O(1) per query (preprocessing).</li>
<li><b>Strings</b>: <code>substring</code> or string comparison inside a loop adds a hidden factor of the string length.</li></ul>
<h4>Edge cases hide in constraints too</h4>
<p>"1 ≤ N" means the array is never empty, "0 ≤ N" means it can be. "a<sub>i</sub> may be negative" or "may contain duplicates" breaks many naive ideas. Read every inequality and ask "what is the smallest, largest, weirdest input allowed?"</p>
<h4>Quick log values</h4>
${H.table(['N', 'log₂ N', 'N log₂ N', 'N<sup>2</sup>'], [['10<sup>3</sup>', '≈ 10', '10<sup>4</sup>', '10<sup>6</sup>'], ['10<sup>5</sup>', '≈ 17', '1.7 × 10<sup>6</sup>', H.c('r', '10<sup>10</sup>')], ['10<sup>6</sup>', '≈ 20', '2 × 10<sup>7</sup>', H.c('r', '10<sup>12</sup>')], ['10<sup>9</sup>', '≈ 30', H.c('r', '3 × 10<sup>10</sup>'), H.c('r', '10<sup>18</sup>')]])}`,
    clues: [
      '"1 ≤ N ≤ 10<sup>5</sup>" → O(N log N) or better; an O(N<sup>2</sup>) double loop is 10<sup>10</sup> → TLE',
      '"N ≤ 20" → exponential is intended: subsets / bitmasks / backtracking',
      '"N ≤ 10<sup>18</sup>" or "N ≤ 10<sup>9</sup>" with a single number as input → O(log N) or O(√N) math',
      '"Sum of N over all test cases does not exceed 2·10<sup>5</sup>" → you may do O(N log N) per test without fear',
      '"0 ≤ a<sub>i</sub> ≤ 10<sup>6</sup>" → values can be array indexes (counting / bucket arrays)',
      '"Answer may be large, print it modulo 10<sup>9</sup>+7" → the count is astronomically big; you need a smart counting method, not enumeration',
      'No constraints given in an interview → <b>ask</b> "how large can N be?" — it shows maturity and picks your algorithm'
    ],
    code: [String.raw`
// A tiny "constraint calculator" you can reason through on paper.
class ConstraintCheck {
    static final double OPS_PER_SEC = 1e8;   // rough rule of thumb for Java

    static String verdict(double ops, double limitSec) {
        double secs = ops / OPS_PER_SEC;
        if (secs <= limitSec * 0.5) return "comfortable";
        if (secs <= limitSec) return "risky but maybe";
        return "TLE";
    }

    public static void main(String[] args) {
        double n = 1e5, logN = Math.log(n) / Math.log(2);
        System.out.println("N       : " + verdict(n, 1));             // comfortable
        System.out.println("N log N : " + verdict(n * logN, 1));      // comfortable
        System.out.println("N^2     : " + verdict(n * n, 1));         // TLE
        // Memory check: 1e7 ints = 4e7 bytes = ~38 MB (fits 256 MB)
        long bytes = 10_000_000L * Integer.BYTES;
        System.out.println(bytes / (1024 * 1024) + " MB");            // 38 MB
    }
}`],
    codeTitle: ['Estimating time and memory from constraints'],
    viz: {
      title: 'Plug in N: which complexities survive the 10^8 rule?',
      input: '100000',
      inputLabel: 'Largest N from the constraints (1 to 10^18)',
      gen: function (input) {
        var s = String(input).trim().replace(/_/g, '').toLowerCase();
        var n;
        var m = s.match(/^(\d+(?:\.\d+)?)e(\d+)$/);
        if (m) n = parseFloat(m[1]) * Math.pow(10, parseInt(m[2], 10));
        else if (/^\d+$/.test(s)) n = parseFloat(s);
        else throw new Error('Enter N as a whole number like 100000 or in e-notation like 1e5');
        if (!(n >= 1) || n > 1e18) throw new Error('N must be between 1 and 10^18');
        var LIMIT = 8; // log10(1e8)
        var lg = function (x) { return Math.log(x) / Math.LN10; };
        var log2n = Math.max(1, Math.log(n) / Math.LN2);
        var lnFact = 0, i;
        if (n <= 2000) { for (i = 2; i <= n; i++) lnFact += Math.log(i); } else { lnFact = n * Math.log(n) - n; }
        var classes = [
          ['O(1)', 0, 'a formula or a direct lookup'],
          ['O(log N)', lg(log2n), 'halving: binary search, fast power'],
          ['O(√N)', lg(Math.sqrt(n)), 'trial division up to √N'],
          ['O(N)', lg(n), 'one pass over the input'],
          ['O(N log N)', lg(n * log2n), 'sorting, heaps, binary search inside a loop'],
          ['O(N²)', 2 * lg(n), 'all pairs, double loops'],
          ['O(N³)', 3 * lg(n), 'all triples, triple loops'],
          ['O(2^N)', n * lg(2), 'all subsets'],
          ['O(N!)', lnFact / Math.LN10, 'all orderings']
        ];
        var fmt = function (L) { if (L < 0.0001) return '1'; if (L > 30) return '>1e30'; if (L < 6) return String(Math.round(Math.pow(10, L))); return Math.pow(10, L - Math.floor(L)).toFixed(1) + 'e' + Math.floor(L); };
        var frames = [], vals = [], texts = [], labels = [], hl = {};
        frames.push({ narr: 'N = <b>' + (n >= 1e6 ? n.toExponential(1) : n) + '</b>. Budget ≈ <b>10<sup>8</sup></b> simple steps for ~1 second. Bar height = number of digits in the step count (log<sub>10</sub>). The dashed line we care about is 8.', parts: [
          { type: 'vars', vals: { N: n >= 1e6 ? n.toExponential(1) : n, 'log2 N': log2n.toFixed(1), 'budget (log10)': LIMIT } }
        ] });
        classes.forEach(function (c, k) {
          var L = Math.max(0, c[1]);
          vals.push(Math.min(L, 30)); texts.push(fmt(L)); labels.push(c[0]);
          var okay = L <= LIMIT, near = L > LIMIT && L <= LIMIT + 0.5;
          hl[k] = okay ? 'ok' : (near ? 'cur' : 'bad');
          frames.push({ narr: '<b>' + c[0] + '</b> (' + c[2] + '): about <b>' + fmt(L) + '</b> steps. ' + (okay ? '<span class="c-g">Fits the budget.</span>' : near ? '<span class="c-y">Borderline — only with a tiny constant factor.</span>' : '<span class="c-r">Too slow → TLE.</span>'), parts: [
            { type: 'bars', label: 'log10(steps) — green fits, red is TLE', values: vals.slice(), texts: texts.slice(), idxLabels: labels.slice(), hl: Object.assign({}, hl) }
          ] });
        });
        var best = classes.filter(function (c) { return c[1] <= LIMIT; }).pop();
        frames.push({ narr: 'Summary: the <b>slowest</b> complexity that still fits is <b>' + (best ? best[0] : 'none') + '</b>. That is the strongest hint about the intended solution — aim for it or anything faster.', parts: [
          { type: 'table', label: 'Verdict for N = ' + (n >= 1e6 ? n.toExponential(1) : n), columns: ['complexity', 'steps', 'verdict'], rows: classes.map(function (c) { return [c[0], fmt(Math.max(0, c[1])), c[1] <= LIMIT ? 'OK' : 'TLE']; }), hl: (function () { var o = {}; classes.forEach(function (c, k) { o[k] = c[1] <= LIMIT ? 'ok' : 'bad'; if (best && c[0] === best[0]) o[k] = 'sel'; }); return o; })() }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Same task, three constraint sets', html: `<p>Task: "count pairs (i &lt; j) with a[i] + a[j] = K". The constraints alone decide the approach:</p>
${H.table(['Constraints', 'Steps for brute force', 'Choose'], [
  ['N ≤ 1,000', '≈ 5 × 10<sup>5</sup>', H.c('g', 'double loop — done in 5 minutes')],
  ['N ≤ 10<sup>5</sup>, a<sub>i</sub> ≤ 10<sup>6</sup>', '≈ 5 × 10<sup>9</sup> ' + H.c('r', 'TLE'), H.c('g', 'counting array indexed by value, O(N + maxA)')],
  ['N ≤ 10<sup>5</sup>, a<sub>i</sub> ≤ 10<sup>9</sup>', '≈ 5 × 10<sup>9</sup> ' + H.c('r', 'TLE'), H.c('g', 'HashMap of counts or sort + two pointers, O(N log N)')]
])}<p>Also: the number of pairs can reach N(N−1)/2 ≈ 5 × 10<sup>9</sup> → the <b>answer</b> needs a <code>long</code>.</p>` },
      { title: 'Test cases: per-test vs total bound', html: `<p>Statement A: "T ≤ 10<sup>4</sup>, N ≤ 10<sup>5</sup>" with no total bound → worst case 10<sup>9</sup> elements to read — the setter <i>must</i> intend something cleverer or the input would not even fit. Statement B: "T ≤ 10<sup>4</sup>, sum of N ≤ 2 · 10<sup>5</sup>" → total work is O(2 · 10<sup>5</sup> log) — relaxed.</p>
<p><b>Trap:</b> allocating <code>new int[1_000_001]</code> <b>per test case</b> in B costs 10<sup>4</sup> × 10<sup>6</sup> = 10<sup>10</sup> writes! Allocate once and reset only the cells you touched.</p>`, code: String.raw`
// Reset only what you used, not the whole big array.
int[] freq = new int[1_000_001];          // allocated ONCE
int[][] tests = {{5, 5, 7}, {1, 2}, {9}};
for (int[] a : tests) {
    int dup = 0;
    for (int v : a) if (++freq[v] == 2) dup++;
    System.out.print(dup + " ");          // 1 0 0
    for (int v : a) freq[v] = 0;           // O(size of this test), not O(1e6)
}` },
      { title: 'Queries multiply your cost', html: `<p>N = 10<sup>5</sup> numbers and Q = 10<sup>5</sup> questions "sum of a[l..r]". Looping over the range per query: up to 10<sup>5</sup> × 10<sup>5</sup> = 10<sup>10</sup> → TLE. Precompute prefix sums once (O(N)) and answer each query in O(1): total 2 · 10<sup>5</sup>. Whenever you see Q, multiply!</p>`, code: String.raw`
int[] a = {3, 1, 4, 1, 5};
long[] pre = new long[a.length + 1];
for (int i = 0; i < a.length; i++) pre[i + 1] = pre[i] + a[i];
int[][] queries = {{0, 2}, {1, 4}};
for (int[] q : queries) System.out.print((pre[q[1] + 1] - pre[q[0]]) + " ");   // 8 11` },
      { title: 'Memory limits are constraints too', html: `<p>Memory limit 256 MB. A <code>long[10<sup>7</sup>]</code> = 80 MB (fine). An <code>int[10<sup>4</sup>][10<sup>4</sup>]</code> = 400 MB (fails!). A <code>boolean[10<sup>8</sup>]</code> = 100 MB (ok-ish, a <code>BitSet</code> uses 12.5 MB). When N × M &gt; ~5 × 10<sup>7</sup>, a full 2D table is suspicious — look for a rolling-row or 1D trick.</p>
${H.table(['Structure', 'Size', 'Memory'], [['int[]', '10<sup>7</sup>', '40 MB'], ['long[]', '10<sup>7</sup>', '80 MB'], ['int[][]', '10<sup>4</sup> × 10<sup>4</sup>', H.c('r', '400 MB')], ['ArrayList&lt;Integer&gt;', '10<sup>7</sup>', H.c('r', '≈ 200 MB')]])}` }
    ],
    deepDive: `<h4>Where does 10<sup>8</sup> come from?</h4>
<p>A modern CPU core runs ~3–5 × 10<sup>9</sup> cycles per second and can retire several simple instructions per cycle. One "step" of your algorithm (a loop iteration with an array access, a comparison, an addition) typically costs a handful to tens of instructions — and a cache miss costs ~100 cycles. Averaging out, <b>10<sup>8</sup>–10<sup>9</sup> simple steps per second</b> is realistic; 10<sup>8</sup> is the safe planning number. Tight array loops can do 10<sup>9</sup>; HashMap-heavy code may manage only 10<sup>7</sup>.</p>
<h4>Constant factors that change the verdict</h4>
<ul><li><b>Memory access pattern:</b> sequential array scans are cache-friendly; random access into huge arrays or linked structures can be 10× slower.</li>
<li><b>Boxing and hashing:</b> <code>HashMap&lt;Integer,Integer&gt;</code> operations cost ~20–100 ns each versus ~1 ns for an array cell.</li>
<li><b>Recursion and object allocation</b> in inner loops.</li>
<li><b>JVM warm-up:</b> the first fraction of a second runs interpreted code; judges usually give Java a time multiplier or a longer limit.</li></ul>
<h4>Big-O hides constants — sometimes on purpose</h4>
<p>O(N log N) with N = 10<sup>6</sup> is 2 × 10<sup>7</sup>; with a heavy constant (say, a TreeMap operation per step) it may be closer to 10<sup>9</sup> real instructions. Conversely, an O(N<sup>2</sup>) inner loop that is a simple array comparison at N = 3 × 10<sup>4</sup> (≈ 4.5 × 10<sup>8</sup> pairs) can pass in Java within 1–2 s if it is cache-friendly. Use the table as the first filter, then think about constants.</p>
<h4>Reading constraints backwards (setter psychology)</h4>
<p>Setters choose N so that the intended solution passes comfortably and the next-slower one fails. If N = 5000, an O(N<sup>2</sup>) DP is almost certainly intended (O(N log N) would allow 10<sup>5</sup>). If N ≤ 18, exponential is intended. Odd bounds like N ≤ 40 hint at <b>meet-in-the-middle</b> (2<sup>20</sup> per half). "K ≤ 20" next to "N ≤ 10<sup>5</sup>" hints at O(N · 2<sup>K</sup>) or O(N · K).</p>
<h4>Interview reality</h4>
<p>Interviewers often omit constraints. Ask: "How large can the input be? Can values be negative? Are there duplicates? Does it fit in memory?" Then state your target: "With N up to a million, I'll aim for O(N log N)." This is one of the strongest signals of seniority in a coding round.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI can quickly estimate Big-O of a pasted solution and even benchmark it. But it often ignores the <b>actual numbers</b> — it may propose an O(N<sup>2</sup>) solution for N = 10<sup>5</sup> because the problem text was paraphrased without constraints, or over-engineer an O(N log N) structure when N ≤ 100.</p>
<p><b>How to work alongside it:</b> always paste constraints into your prompt: <code>N ≤ 2e5, values ≤ 1e9, 2-second limit, Java. What complexity is required and which data types?</code> Then check its reasoning against the table above.</p>
<p><b>Generate test data with AI:</b> ask for a script that produces max-size inputs (N = 2 · 10<sup>5</sup>, all values 10<sup>9</sup>, all equal, sorted, reverse sorted) to time your solution locally — the fastest way to catch TLE before submitting.</p>
<p><b>What you must still own:</b> the reflex of turning "N ≤ 10<sup>5</sup>" into "O(N log N), long for sums" within seconds of reading a problem — that is what interviewers watch for.</p>`,
    problems: [{
      title: 'Count Pairs with a Given Sum (Small Values)',
      level: 'Medium', tags: ['constraints', 'counting array', 'brute force'], companies: ['Amazon', 'Microsoft', 'Paytm'],
      statement: `<p>Given an array <code>a</code> of N integers and a target <code>K</code>, count pairs of indexes <code>(i, j)</code> with <code>i &lt; j</code> and <code>a[i] + a[j] == K</code>.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, 0 ≤ a[i] ≤ 10<sup>6</sup>, 0 ≤ K ≤ 2 · 10<sup>6</sup>`,
      example: `${H.arr([1, 5, 7, 1, 5], { label: 'a', hl: { 0: 'b', 1: 'g', 3: 'b', 4: 'g' } })}<p>K = 6 → Output ${H.c('g', '4')}. The pairs (i &lt; j) are (0, 1): 1 + 5, (0, 4): 1 + 5, (1, 3): 5 + 1 and (3, 4): 1 + 5. The 7 has no partner because 6 − 7 = −1 is not a possible value.</p>`,
      brute: { why: `<p>Check all N(N−1)/2 pairs with a double loop. For N = 10<sup>5</sup> that is 5 × 10<sup>9</sup> checks — about 50 seconds at 10<sup>8</sup>/s. The wasted work: for each <code>a[j]</code>, we re-scan all earlier elements just to ask "how many of them equal K − a[j]?" — a question a counter can answer instantly.</p>`, code: String.raw`
class Solution {
    public long countPairs(int[] a, int k) {
        long count = 0;
        for (int i = 0; i < a.length; i++)
            for (int j = i + 1; j < a.length; j++)
                if (a[i] + a[j] == k) count++;
        return count;                 // correct, but O(N^2)
    }
}` },
      mcq: { q: 'Values are at most 10<sup>6</sup>. What does that constraint unlock?', options: ['Using the value itself as an index into a counting array', 'Sorting in O(N)', 'Using int for the answer', 'Skipping the i &lt; j condition'], answer: 0, explain: 'An int[1_000_001] costs only ~4 MB, so freq[v] gives O(1) "how many times have I seen v?" with no hashing.' },
      hints: [`<p>Hint 1: Walk left to right. When you are at index j, the partners that make a valid pair are earlier elements equal to <code>K − a[j]</code>.</p>`, `<p>Hint 2: Keep <code>freq[v]</code> = how many times value v appeared <b>before</b> j. Add <code>freq[K − a[j]]</code> to the answer, then increment <code>freq[a[j]]</code>.</p>`, `<p>Hint 3: K − a[j] can be negative or above 10<sup>6</sup> → skip it. The answer can reach ~5 × 10<sup>9</sup> → use long. Updating freq <i>after</i> counting enforces i &lt; j and avoids pairing an element with itself.</p>`],
      solution: {
        approach: `<p>Constraints say values ≤ 10<sup>6</sup>, so a frequency array replaces the inner loop. For each element, count earlier partners in O(1), then record the element. One pass: O(N + maxValue). The count needs <code>long</code> because N(N−1)/2 can exceed 2<sup>31</sup>.</p>`,
        code: String.raw`
class Solution {
    public long countPairs(int[] a, int k) {
        final int MAXV = 1_000_000;
        int[] freq = new int[MAXV + 1];       // freq[v] = how many earlier elements equal v
        long count = 0;                       // up to ~5e9 → long
        for (int x : a) {
            int need = k - x;
            if (need >= 0 && need <= MAXV) count += freq[need];   // partners seen before
            freq[x]++;                        // now x can partner with later elements
        }
        return count;
    }
}`,
        alt: [{ lang: 'python', code: String.raw`
def count_pairs(a, k):
    freq = {}
    count = 0
    for x in a:
        count += freq.get(k - x, 0)
        freq[x] = freq.get(x, 0) + 1
    return count

print(count_pairs([1, 5, 7, 1, 5], 6))  # 4`, run: true }],
        dry: { head: ['j', 'a[j]', 'need = K − a[j]', 'freq[need] added', 'count', 'freq after'], rows: [['0', '1', '5', '0', '0', '{1:1}'], ['1', '5', '1', '1', '1', '{1:1, 5:1}'], ['2', '7', '−1 (skip)', '0', '1', '{1:1, 5:1, 7:1}'], ['3', '1', '5', '1', '2', '{1:2, 5:1, 7:1}'], ['4', '5', '1', '2', H.c('g', '4'), '{1:2, 5:2, 7:1}']] },
        complexity: `<p>O(N + maxValue) time, O(maxValue) space (~4 MB). Versus O(N<sup>2</sup>) brute force: 10<sup>5</sup> + 10<sup>6</sup> steps instead of 5 × 10<sup>9</sup>.</p>`,
        followUps: ['Values up to 10<sup>9</sup>? (HashMap instead of array, or sort + two pointers.)', 'Count pairs with a[i] − a[j] = K.', 'Count pairs with sum divisible by K.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 8 — Writing your first brute-force solutions
     ====================================================================== */
  topics.push({
    title: 'Writing Your First Brute-Force Solutions',
    analogy: `<p>You lost your keys. The <b>brute-force</b> way: check every pocket, every drawer, every shelf, in order, until you find them. It is slow, but it <b>cannot miss</b>. Once you have searched a few times you notice patterns ("they are always near the door") and get faster — that is <b>optimisation</b>. Great problem solvers always know the "check everything" plan first, because it proves they understand the question and gives a safe answer to fall back on.</p>`,
    explain: `<h4>The 4-step brute-force recipe</h4>
<ol><li><b>Define the candidates:</b> what are all possible answers? (every pair, every subarray, every subset, every number from 1 to N…)</li>
<li><b>Enumerate them</b> with loops (or recursion).</li>
<li><b>Check</b> each candidate against the condition.</li>
<li><b>Keep the best / count / return the first</b> one that works.</li></ol>
<p>Then compute the complexity and compare it with the constraints. If it fits — ship it! If not, you now know exactly what to speed up.</p>
<h4>The candidate catalogue</h4>
${H.table(['Candidates', 'How to enumerate', 'How many', 'Fits when'], [
  ['all pairs (i &lt; j)', 'two nested loops', 'N(N−1)/2 ≈ N<sup>2</sup>/2', 'N ≤ ~10<sup>4</sup>'],
  ['all triples', 'three nested loops', '≈ N<sup>3</sup>/6', 'N ≤ ~500'],
  ['all subarrays a[i..j]', 'loop i, loop j ≥ i', 'N(N+1)/2', 'N ≤ ~5000 (with running sum)'],
  ['all substrings', 'same as subarrays', 'N(N+1)/2', 'beware O(N) to build each'],
  ['all subsets', 'bitmask 0 … 2<sup>N</sup>−1', '2<sup>N</sup>', 'N ≤ ~20'],
  ['all orderings', 'recursion / next permutation', 'N!', 'N ≤ ~10'],
  ['all numbers in a range', 'one loop', 'range size', 'range ≤ ~10<sup>8</sup>']
])}
<h4>From brute force to better: remove repeated work</h4>
<p>Most optimisations come from noticing that the brute force <b>recomputes</b> something. Example — maximum subarray sum:</p>
${H.table(['Version', 'Idea', 'Time'], [['3 loops', 'for every (i, j), sum a[i..j] from scratch', H.c('r', 'O(N<sup>3</sup>)')], ['2 loops', 'extend j by one: sum(i..j) = sum(i..j−1) + a[j]', H.c('y', 'O(N<sup>2</sup>)')], ['1 loop (Kadane, DSA 5)', 'best sum ending at j only needs the best ending at j−1', H.c('g', 'O(N)')]])}
<h4>Brute force is also your test oracle</h4>
<p>A slow-but-obviously-correct solution lets you <b>stress test</b> a fast one: generate thousands of small random inputs, run both, and stop at the first mismatch. That finds edge-case bugs no amount of staring will.</p>
<h4>In interviews</h4>
<p>Say it out loud in the first 2–3 minutes: "The brute force is to try every pair, O(N<sup>2</sup>). With N up to 10<sup>5</sup> that is too slow, so I will look for repeated work." You get credit for a correct baseline and you set up your optimisation story.</p>`,
    clues: [
      '"N ≤ 100" or "N ≤ 1000" → a straightforward nested-loop brute force is probably the intended solution',
      '"Find all…", "list every…", "generate all combinations" → enumeration is unavoidable; output size dominates',
      '"Count the number of pairs/subarrays/substrings such that…" → start with the double loop, then hunt for repeated work',
      '"N ≤ 20" → enumerate all 2<sup>N</sup> subsets with a bitmask',
      'Your clever solution keeps failing hidden tests → write a brute force and stress test against it',
      'Interviewer: "Let\'s start simple" or "any working solution first" → brute force, state its complexity, then optimise'
    ],
    code: [String.raw`
// Enumeration templates you will use for years.
class Enumerate {
    public static void main(String[] args) {
        int[] a = {2, 7, 4};
        int n = a.length;

        // 1) all pairs i < j
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++)
                System.out.print("(" + a[i] + "," + a[j] + ") ");
        System.out.println();

        // 2) all subarrays with a running sum (O(N^2) total, not O(N^3))
        for (int i = 0; i < n; i++) {
            long sum = 0;
            for (int j = i; j < n; j++) {
                sum += a[j];                       // extend the subarray by one element
                System.out.print("[" + i + ".." + j + "]=" + sum + " ");
            }
        }
        System.out.println();

        // 3) all subsets with a bitmask: bit b of mask set => take a[b]
        for (int mask = 0; mask < (1 << n); mask++) {
            StringBuilder sb = new StringBuilder("{");
            for (int b = 0; b < n; b++) if ((mask >> b & 1) == 1) sb.append(a[b]).append(' ');
            System.out.print(sb.toString().trim() + "} ");
        }
        System.out.println();
    }
}`, String.raw`
// Stress test: compare a fast solution against a brute-force oracle on random small inputs.
class Stress {
    static long brute(int[] a) {                     // obviously correct, O(N^3)
        long best = Long.MIN_VALUE;
        for (int i = 0; i < a.length; i++)
            for (int j = i; j < a.length; j++) {
                long s = 0;
                for (int k = i; k <= j; k++) s += a[k];
                best = Math.max(best, s);
            }
        return best;
    }
    static long fast(int[] a) {                      // the solution we want to trust
        long best = Long.MIN_VALUE, cur = 0;
        for (int x : a) { cur = Math.max(x, cur + x); best = Math.max(best, cur); }
        return best;
    }
    public static void main(String[] args) {
        Random rnd = new Random(42);                 // fixed seed → reproducible failures
        for (int iter = 0; iter < 10_000; iter++) {
            int n = 1 + rnd.nextInt(8);
            int[] a = new int[n];
            for (int i = 0; i < n; i++) a[i] = rnd.nextInt(21) - 10;   // small values, negatives too
            if (brute(a) != fast(a)) {
                System.out.println("MISMATCH on " + Arrays.toString(a));
                return;
            }
        }
        System.out.println("all 10000 random tests passed");
    }
}`],
    codeTitle: ['Enumeration templates: pairs, subarrays, subsets', 'Stress testing with a brute-force oracle'],
    viz: {
      title: 'Brute force: try every subarray, keep the best sum',
      input: '-2 1 -3 4 -1 2',
      inputLabel: 'Array of integers (max 8 numbers)',
      gen: function (input) {
        var a = String(input).trim().split(/[\s,]+/).map(Number);
        if (!a.length || a.some(function (x) { return isNaN(x) || Math.floor(x) !== x; })) throw new Error('Enter whole numbers separated by spaces, e.g. -2 1 -3 4 -1 2');
        if (a.length > 8) throw new Error('Use at most 8 numbers so the frames stay readable');
        var n = a.length, frames = [], best = -Infinity, bi = -1, bj = -1, checked = 0;
        var CODE = 'long best = Long.MIN_VALUE;\nfor (int i = 0; i < n; i++) {\n    long sum = 0;\n    for (int j = i; j < n; j++) {\n        sum += a[j];\n        best = Math.max(best, sum);\n    }\n}';
        frames.push({ narr: 'Candidates = every subarray a[i..j]. There are N(N+1)/2 = <b>' + (n * (n + 1) / 2) + '</b> of them. For each start i we extend j one step at a time, so the sum is updated in O(1) instead of re-added from scratch.', parts: [
          { type: 'array', label: 'a', values: a },
          { type: 'vars', vals: { best: '-∞', checked: 0 } },
          { type: 'code', lang: 'java', code: CODE, hl: { 1: 'cur' } }
        ] });
        for (var i = 0; i < n; i++) {
          var sum = 0;
          for (var j = i; j < n; j++) {
            sum += a[j];
            checked++;
            var improved = sum > best;
            if (improved) { best = sum; bi = i; bj = j; }
            var ptr = {}; ptr[i] = 'i'; if (j !== i) ptr[j] = 'j'; else ptr[i] = ['i', 'j'];
            var hl = {}; hl[j] = 'cur';
            frames.push({ narr: 'Subarray [' + i + '..' + j + ']: sum = previous sum + a[' + j + '] = <b>' + sum + '</b>. ' + (improved ? '<span class="c-g">New best!</span>' : 'Not better than best = ' + best + '.'), parts: [
              { type: 'array', label: 'a', values: a, range: [i, j], hl: hl, ptr: ptr },
              { type: 'vars', vals: { i: i, j: j, sum: sum, best: best, 'best range': '[' + bi + '..' + bj + ']', checked: checked }, hl: improved ? { best: 'ok', sum: 'ok' } : { sum: 'cur' } },
              { type: 'code', lang: 'java', code: CODE, hl: improved ? { 5: 'cur', 6: 'ok' } : { 5: 'cur' } }
            ] });
          }
        }
        var fin = {}; for (var k = bi; k <= bj; k++) fin[k] = 'sel';
        frames.push({ narr: 'All ' + checked + ' subarrays checked. Best sum <b>' + best + '</b> from a[' + bi + '..' + bj + ']. Work done: O(N<sup>2</sup>). With 3 loops (re-summing each subarray) it would be O(N<sup>3</sup>); Kadane\'s algorithm (DSA 5) reaches O(N).', parts: [
          { type: 'array', label: 'a — best subarray', values: a, hl: fin },
          { type: 'bars', label: 'Steps for N = ' + n + ' by version', values: [n * (n + 1) * (n + 2) / 6, n * (n + 1) / 2, n], texts: [String(n * (n + 1) * (n + 2) / 6), String(n * (n + 1) / 2), String(n)], idxLabels: ['O(N³)', 'O(N²)', 'O(N)'], hl: { 0: 'bad', 1: 'cur', 2: 'ok' } }
        ] });
        frames.push({ narr: 'How to say it in an interview: "The brute force checks all N(N+1)/2 subarrays with a running sum, O(N<sup>2</sup>). For N up to a few thousand that is fine; for 10<sup>5</sup> I need to remove the repeated work."', parts: [
          { type: 'table', label: 'Brute-force recipe applied', columns: ['step', 'here'], rows: [['1. candidates', 'every subarray a[i..j]'], ['2. enumerate', 'loop i, loop j ≥ i'], ['3. check', 'running sum in O(1)'], ['4. keep best', 'best = max(best, sum) → ' + best]], hl: { 3: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Prime check: brute force with smart pruning', html: `<p>Brute force: try every divisor from 2 to n − 1 (O(n)). Observation: divisors come in pairs d × (n/d), and one of each pair is ≤ √n. So checking up to √n is enough: O(√n). For n = 10<sup>12</sup> that is 10<sup>6</sup> checks instead of 10<sup>12</sup>. Still "try everything" — just a smarter everything.</p>
${H.table(['n = 36', 'divisor pairs'], [['2 × 18', '3 × 12'], ['4 × 9', H.c('g', '6 × 6 (√36)')]])}`, code: String.raw`
class Prime {
    static boolean isPrime(long n) {
        if (n < 2) return false;
        for (long d = 2; d * d <= n; d++)        // d * d avoids floating-point sqrt
            if (n % d == 0) return false;
        return true;
    }
    public static void main(String[] args) {
        System.out.println(isPrime(97) + " " + isPrime(1_000_000_007L) + " " + isPrime(1_000_000_008L));   // true true false
    }
}` },
      { title: 'Subset sum with a bitmask (N ≤ 20)', html: `<p>"Can some subset of these numbers add up to T?" With N ≤ 20 there are at most 2<sup>20</sup> ≈ 10<sup>6</sup> subsets — just try them all. Each mask's binary digits say which elements are taken.</p>
${H.table(['mask (binary)', 'elements taken from {3, 34, 4}', 'sum'], [['001', '3', '3'], ['101', '3, 4', H.c('g', '7')], ['111', '3, 34, 4', '41']])}`, code: String.raw`
int[] a = {3, 34, 4};
int target = 7;
boolean found = false;
for (int mask = 0; mask < (1 << a.length) && !found; mask++) {
    int sum = 0;
    for (int b = 0; b < a.length; b++) if ((mask & (1 << b)) != 0) sum += a[b];
    if (sum == target) found = true;
}
System.out.println(found);   // true (3 + 4)` },
      { title: 'Count palindromic substrings (N ≤ 100)', html: `<p>Enumerate all N(N+1)/2 substrings and check each with two indexes, without building new Strings. O(N<sup>3</sup>) = 10<sup>6</sup> for N = 100 — perfectly fine. For N = 10<sup>4</sup> you would need "expand around center" (String Algorithms module).</p>`, code: String.raw`
String s = "aaba";
int count = 0;
for (int i = 0; i < s.length(); i++)
    for (int j = i; j < s.length(); j++) {
        int l = i, r = j;
        while (l < r && s.charAt(l) == s.charAt(r)) { l++; r--; }
        if (l >= r) count++;                 // s[i..j] is a palindrome
    }
System.out.println(count);   // 6: a, a, b, a, aa, aba` },
      { title: 'Early exit and pruning', html: `<p>Brute force does not have to be dumb. If you only need <b>whether</b> a pair exists, return at the first hit. If the array is sorted and you need a[i] + a[j] ≤ K, break the inner loop as soon as the sum exceeds K — later j only make it bigger. Worst case is unchanged, but typical runs get much faster.</p>`, code: String.raw`
int[] a = {1, 3, 4, 8, 10};        // sorted
int k = 9, pairs = 0;
for (int i = 0; i < a.length; i++)
    for (int j = i + 1; j < a.length; j++) {
        if (a[i] + a[j] > k) break;   // prune: sorted, so the rest are larger
        pairs++;
    }
System.out.println(pairs);   // 4: (1,3) (1,4) (1,8) (3,4)` }
    ],
    deepDive: `<h4>Counting candidates precisely</h4>
<p>Pairs i &lt; j: N(N−1)/2. Subarrays: N(N+1)/2. Triples: N(N−1)(N−2)/6. Subsets: 2<sup>N</sup>. Permutations: N!. Knowing the exact count (not just Big-O) helps when the limit is tight: N = 3000 gives 4.5 × 10<sup>6</sup> pairs (trivial), but 4.5 × 10<sup>9</sup> triples (TLE).</p>
<h4>Where the hidden cost hides</h4>
<ul><li><b>Building candidates:</b> <code>s.substring(i, j)</code> for every pair costs O(N) each → O(N<sup>3</sup>) total.</li>
<li><b>Checking candidates:</b> recomputing a sum or a max from scratch adds a loop.</li>
<li><b>Storing candidates:</b> putting all subsets in a <code>List</code> uses O(2<sup>N</sup> · N) memory.</li></ul>
<p>The classic optimisation ladder: reuse the previous candidate's work (running sums), precompute (prefix sums), sort and prune (two pointers), remember (hashing), or change the question (binary search on answer, DP).</p>
<h4>Stress testing like a professional</h4>
<ol><li>Write <code>brute()</code> as simply as possible — no cleverness, so it is obviously right.</li>
<li>Write a generator with a <b>fixed seed</b> and <b>small sizes</b> (N ≤ 8, values in −10…10) so failures are easy to read.</li>
<li>Loop thousands of times; on mismatch print the input and both outputs.</li>
<li>Shrink the failing case by hand, fix, repeat.</li></ol>
<p>This is the same idea as <b>property-based testing</b> (jqwik/QuickCheck) and <b>differential testing</b> used on compilers and databases in industry.</p>
<h4>When brute force <i>is</i> the final answer</h4>
<p>Many interview problems with N ≤ 100 (or "design" problems with tiny inputs) are best solved by clean enumeration. Over-optimising wastes time and adds bugs. Also, some problems are NP-hard (e.g. general subset sum), so for exact answers on arbitrary inputs, exponential search with pruning is genuinely the best known approach.</p>
<h4>Correctness first, then speed</h4>
<p>An O(N<sup>2</sup>) solution that is correct beats an O(N) solution with a bug — in interviews and in production. Optimise from a working baseline and re-verify after every change.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating a brute force is now nearly free — ask an assistant for "the simplest possible correct solution, ignore performance". That makes <b>stress testing</b> a daily habit rather than a contest trick: AI writes the oracle and the random generator; you write (or review) the fast solution.</p>
<p><b>Where AI goes wrong:</b> it often jumps straight to a clever but subtly wrong "optimal" solution, skipping the baseline entirely. Its brute forces can also be too clever (accidentally sharing bugs with the fast version) — insist on the dumbest version.</p>
<p><b>Great prompt:</b> <code>Write a brute-force O(N^3) Java solution for this problem and a random test generator with a fixed seed (N ≤ 8, values -10..10). Do not optimise.</code></p>
<p><b>What you must own:</b> defining the candidate space correctly (off-by-one in i &lt; j vs i ≤ j changes the answer), knowing its size from the constraints, and explaining your path from brute force to optimal — interviewers grade the <i>journey</i>, not just the final code.</p>`,
    problems: [{
      title: 'Maximum Subarray Sum (Brute Force Done Right)',
      level: 'Medium', tags: ['brute force', 'subarrays', 'running sum'], companies: ['Amazon', 'Microsoft', 'LinkedIn', 'Apple'],
      statement: `<p>Given an integer array <code>a</code>, find the contiguous non-empty subarray with the largest sum and return that sum.</p>`,
      constraints: `1 ≤ N ≤ 2000, −10<sup>9</sup> ≤ a[i] ≤ 10<sup>9</sup>`,
      example: `${H.arr([-2, 1, -3, 4, -1, 2, 1, -5, 4], { label: 'a', hl: { 3: 'g', 4: 'g', 5: 'g', 6: 'g' } })}<p>Output: ${H.c('g', '6')} from [4, −1, 2, 1]. Note the subarray may contain negative numbers if they connect two good parts. If all numbers are negative, the answer is the largest single element.</p>`,
      brute: { why: `<p>Three loops: choose i, choose j, then add a[i..j] from scratch. About N<sup>3</sup>/6 ≈ 1.3 × 10<sup>9</sup> additions for N = 2000 — too slow. The wasted work: sum(i..j) and sum(i..j+1) share all but one element, yet we re-add everything.</p>`, code: String.raw`
class Solution {
    public long maxSubArray(int[] a) {
        long best = Long.MIN_VALUE;
        for (int i = 0; i < a.length; i++)
            for (int j = i; j < a.length; j++) {
                long sum = 0;
                for (int k = i; k <= j; k++) sum += a[k];   // recomputed every time
                best = Math.max(best, sum);
            }
        return best;
    }
}` },
      mcq: { q: 'You know sum(i..j) = 5 and a[j+1] = −2. What is sum(i..j+1)?', options: ['3 — just add a[j+1]', 'Need to re-add from i', '−2', '7'], answer: 0, explain: 'Extending a subarray by one element only adds that element. This O(1) update turns O(N³) into O(N²).' },
      hints: [`<p>Hint 1: Fix the start i. As j moves right, the subarray grows by exactly one element each step.</p>`, `<p>Hint 2: Keep a running <code>sum</code> that resets to 0 for each new i and adds a[j] for each j. Update <code>best</code> after every addition.</p>`, `<p>Hint 3: Initialise best to <code>Long.MIN_VALUE</code> (not 0!) so all-negative arrays work. Use long: a sum of 2000 values of 10<sup>9</sup> is 2 × 10<sup>12</sup>.</p>`],
      solution: {
        approach: `<p>Brute force over all subarrays, but reuse the previous sum: for each start i, extend j and add a[j]. That checks every candidate (so it is obviously correct) in O(N<sup>2</sup>) = 2 × 10<sup>6</sup> steps for N = 2000. Kadane's algorithm (DSA 5) improves this to O(N) by noticing that only the best sum ending at the previous index matters.</p>`,
        code: String.raw`
class Solution {
    public long maxSubArray(int[] a) {
        long best = Long.MIN_VALUE;          // not 0: all-negative arrays must work
        for (int i = 0; i < a.length; i++) {
            long sum = 0;                    // fresh sum for each start
            for (int j = i; j < a.length; j++) {
                sum += a[j];                 // sum of a[i..j] in O(1)
                best = Math.max(best, sum);
            }
        }
        return best;
    }
}`,
        alt: [{ lang: 'python', code: String.raw`
def max_subarray(a):
    best = float("-inf")
    for i in range(len(a)):
        s = 0
        for j in range(i, len(a)):
            s += a[j]
            best = max(best, s)
    return best

print(max_subarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]))  # 6
print(max_subarray([-3, -1, -2]))                       # -1`, run: true }],
        dry: { head: ['i', 'j range', 'running sums', 'best so far'], rows: [['0', '0..8', '−2, −1, −4, 0, −1, 1, 2, −3, 1', '2'], ['1', '1..8', '1, −2, 2, 1, 3, 4, −1, 3', '4'], ['2', '2..8', '−3, 1, 0, 2, 3, −2, 2', '4'], ['3', '3..8', '4, 3, 5, 6, 1, 5', H.c('g', '6')], ['4..8', '…', 'all smaller', H.c('g', '6')]] },
        complexity: `<p>O(N<sup>2</sup>) time, O(1) space. Brute force with 3 loops: O(N<sup>3</sup>). Kadane: O(N).</p>`,
        followUps: ['Return the start and end indexes too.', 'Now N ≤ 10<sup>5</sup> — what changes? (Kadane, DSA 5.)', 'Maximum sum of a subarray of length exactly K.']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Second Largest Distinct Element',
    level: 'Easy', tags: ['arrays', 'single pass'], companies: ['Amazon', 'Infosys', 'Samsung'],
    statement: `<p>Given an array of positive integers, return the <b>second largest distinct</b> value. If it does not exist (all elements equal), return <code>-1</code>.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, 1 ≤ a[i] ≤ 10<sup>9</sup>`,
    example: `${H.arr([12, 35, 1, 10, 34, 35], { hl: { 1: 'g', 5: 'g', 4: 'b' } })}<p>Output ${H.c('b', '34')}. The largest is ${H.c('g', '35')} (appearing twice — duplicates do not count as "second"), and the next distinct value is 34. For <code>[7, 7, 7]</code> the answer is ${H.c('r', '-1')}.</p>`,
    brute: { why: `<p>Sort a copy, then walk from the end skipping values equal to the maximum. Correct and simple, but sorting costs O(N log N) and O(N) extra memory just to find two numbers — we order <b>all</b> elements when we only care about the top two.</p>`, code: String.raw`
class Solution {
    public int secondLargest(int[] a) {
        int[] b = a.clone();
        Arrays.sort(b);                                    // O(N log N)
        int max = b[b.length - 1];
        for (int i = b.length - 2; i >= 0; i--) if (b[i] != max) return b[i];
        return -1;
    }
}` },
    mcq: { q: 'Scanning once with variables <code>first</code> and <code>second</code>, what should happen when you see x == first?', options: ['Ignore it (it is a duplicate of the max)', 'Set second = first', 'Set first = x and second = x', 'Return -1'], answer: 0, explain: 'We need the second largest DISTINCT value, so a copy of the current maximum changes nothing.' },
    hints: [`<p>Hint 1: You only need to remember the two best distinct values seen so far — not the whole sorted order.</p>`, `<p>Hint 2: For each x: if x &gt; first → second = first, first = x. Else if x &lt; first and x &gt; second → second = x.</p>`, `<p>Hint 3: Start with first = second = −1 (values are positive). The strict comparisons automatically skip duplicates of the maximum. Return second (still −1 if never set).</p>`],
    solution: {
      approach: `<p>One pass keeping the top two distinct values. A new maximum pushes the old maximum down to second place; a value strictly between them becomes the new second.</p>`,
      code: String.raw`
class Solution {
    public int secondLargest(int[] a) {
        int first = -1, second = -1;           // values are >= 1, so -1 means "none yet"
        for (int x : a) {
            if (x > first) {                   // new champion
                second = first;
                first = x;
            } else if (x < first && x > second) {   // strictly between: new runner-up
                second = x;
            }                                  // x == first: duplicate, ignore
        }
        return second;
    }
}`,
      dry: { head: ['x', 'first', 'second'], rows: [['12', '12', '−1'], ['35', '35', '12'], ['1', '35', '12'], ['10', '35', '12'], ['34', '35', '34'], ['35', '35', H.c('g', '34')]] },
      complexity: `<p>O(N) time, O(1) space.</p>`,
      followUps: ['Return the k-th largest distinct value (heap or sort — DSA 15).', 'What changes if values can be negative? (Use Long.MIN_VALUE sentinels or a boolean "set" flag.)']
    }
  });

  practice.push({
    title: 'Valid Palindrome (Letters and Digits Only)',
    level: 'Easy', tags: ['strings', 'two pointers', 'char helpers'], companies: ['Meta', 'Microsoft', 'Apple'],
    statement: `<p>A phrase is a palindrome if, after converting all uppercase letters to lowercase and removing all non-alphanumeric characters, it reads the same forward and backward. Given <code>s</code>, return <code>true</code> if it is a palindrome.</p>`,
    constraints: `1 ≤ s.length ≤ 2 · 10<sup>5</sup>; s consists of printable ASCII characters.`,
    example: `<p><code>"A man, a plan, a canal: Panama"</code> → cleaned ${H.c('b', '"amanaplanacanalpanama"')} → ${H.c('g', 'true')}.</p><p><code>"race a car"</code> → ${H.c('b', '"raceacar"')} → ${H.c('r', 'false')} (r-a-c-e-a-c-a-r reversed is r-a-c-a-e-c-a-r).</p>`,
    brute: { why: `<p>Build a cleaned lowercase copy with a StringBuilder, build its reverse, and compare. O(N) time but O(N) extra memory for two new strings — fine, yet the interviewer will ask for O(1) space.</p>`, code: String.raw`
class Solution {
    public boolean isPalindrome(String s) {
        StringBuilder clean = new StringBuilder();
        for (char c : s.toCharArray())
            if (Character.isLetterOrDigit(c)) clean.append(Character.toLowerCase(c));
        String fwd = clean.toString();
        String back = clean.reverse().toString();
        return fwd.equals(back);
    }
}` },
    mcq: { q: 'Which pair of helpers handles the cleaning rules correctly for ASCII input?', options: ['Character.isLetterOrDigit and Character.toLowerCase', 'Character.isLetter and String.trim', 'c != \' \' and Character.toUpperCase on one side only', 'String.split("") and equals'], answer: 0, explain: 'Digits count as alphanumeric too ("0P" is not a palindrome). Compare both sides after lowering case.' },
    hints: [`<p>Hint 1: Instead of building a cleaned copy, skip unwanted characters on the fly from both ends.</p>`, `<p>Hint 2: Two indexes i (left) and j (right). Move i right while s[i] is not alphanumeric; move j left likewise. Compare lowercase versions.</p>`, `<p>Hint 3: Keep the guard <code>i &lt; j</code> inside the skipping loops so a string of only punctuation does not run off the ends. Empty-after-cleaning counts as a palindrome (true).</p>`],
    solution: {
      approach: `<p>Two pointers moving inward, skipping non-alphanumeric characters and comparing case-insensitively. No new strings are built.</p>`,
      code: String.raw`
class Solution {
    public boolean isPalindrome(String s) {
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
}`,
      dry: { head: ['i', 'j', 's[i]', 's[j]', 'match?'], rows: [['0', '9', 'r', 'r', 'yes'], ['1', '8', 'a', 'a', 'yes'], ['2', '7', 'c', 'c', 'yes'], ['3', '5 (skipped the space at 6)', 'e', 'a', H.c('r', 'no → false')]] },
      complexity: `<p>O(N) time, O(1) extra space.</p>`,
      followUps: ['Valid Palindrome II: may delete at most one character.', 'Handle full Unicode (use code points and Character.isLetterOrDigit(int)).']
    }
  });

  practice.push({
    title: 'Matrix Diagonal Sum',
    level: 'Easy', tags: ['2D arrays', 'matrix'], companies: ['Adobe', 'Google'],
    statement: `<p>Given a square matrix <code>mat</code> of size n × n, return the sum of the primary diagonal and the secondary diagonal. If n is odd, the centre cell belongs to both diagonals but must be counted <b>once</b>.</p>`,
    constraints: `1 ≤ n ≤ 100, 1 ≤ mat[i][j] ≤ 100`,
    example: `${H.table(['', 'c0', 'c1', 'c2'], [['r0', H.c('g', '1'), '2', H.c('b', '3')], ['r1', '4', H.c('y', '5'), '6'], ['r2', H.c('b', '7'), '8', H.c('g', '9')]])}<p>Output ${H.c('g', '25')} = ${H.c('g', '1 + 9')} + ${H.c('y', '5')} + ${H.c('b', '3 + 7')}. The centre 5 is counted once.</p>`,
    brute: { why: `<p>Visit all n<sup>2</sup> cells and add those with <code>r == c</code> or <code>r + c == n − 1</code>. Correct (the "or" counts the centre once), but it looks at n<sup>2</sup> cells when only about 2n matter.</p>`, code: String.raw`
class Solution {
    public int diagonalSum(int[][] mat) {
        int n = mat.length, sum = 0;
        for (int r = 0; r < n; r++)
            for (int c = 0; c < n; c++)
                if (r == c || r + c == n - 1) sum += mat[r][c];
        return sum;
    }
}` },
    mcq: { q: 'Cell (r, c) is on the secondary (anti-) diagonal of an n × n matrix when…', options: ['r + c == n − 1', 'r == c', 'r − c == 1', 'r + c == n'], answer: 0, explain: 'Top-right is (0, n−1) and bottom-left is (n−1, 0): the indexes always add to n − 1.' },
    hints: [`<p>Hint 1: Row r touches the primary diagonal at column r and the secondary diagonal at column n − 1 − r. That is just two cells per row.</p>`, `<p>Hint 2: Loop r from 0 to n − 1 and add <code>mat[r][r] + mat[r][n - 1 - r]</code>.</p>`, `<p>Hint 3: When n is odd, the middle row adds the centre twice — subtract <code>mat[n/2][n/2]</code> once at the end. n = 1 is the extreme case.</p>`],
    solution: {
      approach: `<p>One loop over rows, two cells per row, then fix the double-counted centre for odd n.</p>`,
      code: String.raw`
class Solution {
    public int diagonalSum(int[][] mat) {
        int n = mat.length, sum = 0;
        for (int r = 0; r < n; r++) {
            sum += mat[r][r];               // primary diagonal
            sum += mat[r][n - 1 - r];       // secondary diagonal
        }
        if (n % 2 == 1) sum -= mat[n / 2][n / 2];   // centre counted twice
        return sum;
    }
}`,
      dry: { head: ['r', 'mat[r][r]', 'mat[r][n−1−r]', 'sum'], rows: [['0', '1', '3', '4'], ['1', '5', '5', '14'], ['2', '9', '7', '30'], ['fix', '−5 (centre)', '', H.c('g', '25')]] },
      complexity: `<p>O(n) time, O(1) space (versus O(n<sup>2</sup>) for the full scan).</p>`,
      followUps: ['Return the sums of all 2n − 1 anti-diagonals.', 'Rotate the matrix 90° in place (DSA 5).']
    }
  });

  practice.push({
    title: 'Missing Number',
    level: 'Easy', tags: ['math', 'overflow', 'brute force'], companies: ['Amazon', 'Microsoft', 'Apple'],
    statement: `<p>An array <code>a</code> contains <code>n</code> <b>distinct</b> numbers taken from the range <code>[0, n]</code>. Exactly one number of that range is missing. Return it.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup>; all values distinct and within [0, n].`,
    example: `<p><code>a = [3, 0, 1]</code>, n = 3 → range {0, 1, 2, 3} → missing ${H.c('g', '2')}.</p><p>Check with sums: expected 0 + 1 + 2 + 3 = 6, actual 3 + 0 + 1 = 4, difference ${H.c('g', '2')}.</p>`,
    brute: { why: `<p>For each candidate v from 0 to n, scan the whole array to see whether v is present. That is (n + 1) × n ≈ 10<sup>10</sup> comparisons for n = 10<sup>5</sup> → TLE. The wasted work: re-scanning the same array for every candidate.</p>`, code: String.raw`
class Solution {
    public int missingNumber(int[] a) {
        int n = a.length;
        for (int v = 0; v <= n; v++) {
            boolean found = false;
            for (int x : a) if (x == v) { found = true; break; }
            if (!found) return v;
        }
        return -1;   // unreachable for valid input
    }
}` },
    mcq: { q: 'Using the formula n(n+1)/2 with n = 10<sup>5</sup>, what type should hold the expected sum to be safe?', options: ['long (to be safe as n grows)', 'byte', 'short', 'char'], answer: 0, explain: 'For n = 10<sup>5</sup> the sum is about 5·10<sup>9</sup> — already above int\'s 2.1·10<sup>9</sup>! Using long avoids overflow. (XOR avoids the issue entirely.)' },
    hints: [`<p>Hint 1: You know exactly which numbers <i>should</i> be there: 0, 1, …, n. Their total is easy to compute.</p>`, `<p>Hint 2: Missing = (0 + 1 + … + n) − (sum of the array) = n(n+1)/2 − sum. Alternatively XOR all indexes and all values — pairs cancel.</p>`, `<p>Hint 3: n(n+1)/2 for n = 10<sup>5</sup> is ≈ 5 × 10<sup>9</sup>: compute it in <code>long</code>. Missing 0 and missing n are the edge cases to test.</p>`],
    solution: {
      approach: `<p>Gauss's formula gives the expected total of 0..n; subtracting the actual sum leaves the missing value. Do the arithmetic in <code>long</code> because the total exceeds int range for n near 10<sup>5</sup>. (XOR version: <code>res = n; for i: res ^= i ^ a[i]</code> — no overflow at all.)</p>`,
      code: String.raw`
class Solution {
    public int missingNumber(int[] a) {
        long n = a.length;
        long expected = n * (n + 1) / 2;   // 0 + 1 + ... + n, needs long
        long actual = 0;
        for (int x : a) actual += x;
        return (int) (expected - actual);  // result is within [0, n]
    }
}`,
      alt: [{ lang: 'python', code: String.raw`
def missing_number(a):
    n = len(a)
    return n * (n + 1) // 2 - sum(a)

print(missing_number([3, 0, 1]), missing_number([0, 1]), missing_number([1]))  # 2 2 0`, run: true }],
      dry: { head: ['step', 'value'], rows: [['n', '3'], ['expected = 3·4/2', '6'], ['actual = 3 + 0 + 1', '4'], ['missing', H.c('g', '2')]] },
      complexity: `<p>O(n) time, O(1) space.</p>`,
      followUps: ['Two numbers are missing — find both (sum and sum of squares, or XOR partition).', 'The array is sorted — can you do O(log n)? (Binary search on a[i] == i.)']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Reverse Integer (Without 64-bit Help)',
    level: 'Medium', tags: ['math', 'overflow', 'digits'], companies: ['Apple', 'Bloomberg', 'Adobe', 'Amazon'],
    statement: `<p>Given a signed 32-bit integer <code>x</code>, return <code>x</code> with its digits reversed. If reversing makes the value go outside the int range [−2<sup>31</sup>, 2<sup>31</sup> − 1], return <code>0</code>. Assume you cannot store 64-bit integers.</p>`,
    constraints: `−2<sup>31</sup> ≤ x ≤ 2<sup>31</sup> − 1`,
    example: `<p><code>123</code> → ${H.c('g', '321')}; <code>-120</code> → ${H.c('g', '-21')} (trailing zero becomes a leading zero and disappears); <code>1534236469</code> → reversed 9646324351 is bigger than 2,147,483,647 → ${H.c('r', '0')}.</p>`,
    brute: { why: `<p>Convert to a String, reverse it with StringBuilder, parse with <code>Long.parseLong</code> and check the range. Works, but it allocates strings, handles the minus sign awkwardly, and it uses a 64-bit long — exactly what the problem forbids. Interviewers want you to detect overflow <b>before</b> it happens.</p>`, code: String.raw`
class Solution {
    public int reverse(int x) {
        String digits = new StringBuilder(String.valueOf(Math.abs((long) x))).reverse().toString();
        long r = Long.parseLong(digits) * (x < 0 ? -1 : 1);       // uses 64-bit (not allowed)
        if (r > Integer.MAX_VALUE || r < Integer.MIN_VALUE) return 0;
        return (int) r;
    }
}` },
    mcq: { q: 'rev is about to become rev * 10 + d. Which check (for positive numbers) guarantees no overflow?', options: ['rev &gt; Integer.MAX_VALUE / 10 means overflow (or == and d &gt; 7)', 'rev * 10 + d &gt; Integer.MAX_VALUE', 'rev &lt; 0', 'd &gt; 9'], answer: 0, explain: 'Checking rev * 10 + d directly is useless because it already overflowed. Compare rev against MAX/10 = 214748364 first; if equal, the last digit must be ≤ 7.' },
    hints: [`<p>Hint 1: Pop the last digit with <code>x % 10</code>, push it onto the result with <code>rev * 10 + d</code>, drop it with <code>x /= 10</code>. In Java, % keeps the sign, so negatives work automatically.</p>`, `<p>Hint 2: Before pushing, check whether <code>rev * 10 + d</code> would leave int range: compare <code>rev</code> with <code>Integer.MAX_VALUE / 10</code> and <code>Integer.MIN_VALUE / 10</code>.</p>`, `<p>Hint 3: MAX = 2147483647 (last digit 7), MIN = −2147483648 (last digit −8). Recipe: while x != 0: d = x % 10; x /= 10; if rev &gt; MAX/10 or (rev == MAX/10 and d &gt; 7) return 0; same for MIN with −8; rev = rev*10 + d.</p>`],
    solution: {
      approach: `<p>Digit popping with a pre-check. Because Java's <code>%</code> and <code>/</code> truncate toward zero, a negative x yields negative digits and the same loop builds a negative result. Overflow is detected by comparing against MAX/10 and MIN/10 before multiplying.</p>`,
      code: String.raw`
class Solution {
    public int reverse(int x) {
        int rev = 0;
        while (x != 0) {
            int d = x % 10;                  // last digit (negative if x < 0)
            x /= 10;
            if (rev > Integer.MAX_VALUE / 10 || (rev == Integer.MAX_VALUE / 10 && d > 7)) return 0;
            if (rev < Integer.MIN_VALUE / 10 || (rev == Integer.MIN_VALUE / 10 && d < -8)) return 0;
            rev = rev * 10 + d;              // safe now
        }
        return rev;
    }
}`,
      dry: { head: ['x', 'd', 'rev before', 'check', 'rev after'], rows: [['-120', '0', '0', 'ok', '0'], ['-12', '-2', '0', 'ok', '-2'], ['-1', '-1', '-2', 'ok', H.c('g', '-21')]] },
      complexity: `<p>O(log₁₀ |x|) ≤ 10 iterations, O(1) space.</p>`,
      followUps: ['Palindrome Number without converting to a string (reverse half the digits).', 'Reverse the bits of a 32-bit integer (DSA 4).']
    }
  });

  practice.push({
    title: 'String to Integer (atoi)',
    level: 'Medium', tags: ['strings', 'parsing', 'overflow'], companies: ['Amazon', 'Microsoft', 'Meta', 'Goldman Sachs'],
    statement: `<p>Implement <code>myAtoi(String s)</code>: (1) skip leading spaces; (2) read an optional <code>'+'</code> or <code>'-'</code>; (3) read digits until a non-digit or the end; (4) if no digits were read, return 0; (5) clamp the result to [−2<sup>31</sup>, 2<sup>31</sup> − 1].</p>`,
    constraints: `0 ≤ s.length ≤ 200; s consists of English letters, digits, ' ', '+', '-' and '.'`,
    example: `${H.table(['Input', 'Output', 'Why'], [['"42"', '42', 'plain digits'], ['"   -042"', H.c('g', '-42'), 'spaces skipped, sign read, leading zero fine'], ['"1337c0d3"', '1337', 'stops at \'c\''], ['"words 987"', H.c('r', '0'), 'first non-space is not a digit or sign'], ['"-91283472332"', H.c('y', '-2147483648'), 'clamped to int minimum']])}`,
    brute: { why: `<p>Cut out the numeric prefix with index juggling, then hand it to <code>new BigInteger(...)</code> and clamp. Correct, but it needs a second pass, a big-number object for a 200-char input, and special handling for an empty prefix or a lone sign. The skill being tested is the single careful pass with overflow detection.</p>`, code: String.raw`
import java.math.BigInteger;

class Solution {
    public int myAtoi(String s) {
        int i = 0, n = s.length();
        while (i < n && s.charAt(i) == ' ') i++;
        int start = i;
        if (i < n && (s.charAt(i) == '+' || s.charAt(i) == '-')) i++;
        int digitsStart = i;
        while (i < n && Character.isDigit(s.charAt(i))) i++;
        if (i == digitsStart) return 0;                          // no digits
        BigInteger v = new BigInteger(s.substring(start, i));    // handles any length
        if (v.compareTo(BigInteger.valueOf(Integer.MAX_VALUE)) > 0) return Integer.MAX_VALUE;
        if (v.compareTo(BigInteger.valueOf(Integer.MIN_VALUE)) < 0) return Integer.MIN_VALUE;
        return v.intValue();
    }
}` },
    mcq: { q: 'Input "   +-12". What should myAtoi return?', options: ['0 — after "+", the next char "-" is not a digit', '-12', '12', '-2147483648'], answer: 0, explain: 'Only one optional sign is allowed. After reading "+", the parser expects digits; "-" stops it with no digits read, so the result is 0.' },
    hints: [`<p>Hint 1: Treat it as a tiny state machine: spaces → optional sign → digits → stop. Use one index that only moves forward.</p>`, `<p>Hint 2: Accumulate the absolute value in a <code>long</code> (or an int with a MAX/10 pre-check). As soon as it exceeds 2<sup>31</sup>, you can clamp and stop reading.</p>`, `<p>Hint 3: Edge cases: empty string, only spaces, sign with no digits, huge digit runs (stop early — never let the accumulator overflow), leading zeros. Apply the sign at the end, then clamp.</p>`],
    solution: {
      approach: `<p>Single pass. Skip spaces, read one sign, then build the number digit by digit in a <code>long</code>. Because the moment the magnitude passes 2<sup>31</sup> we can clamp and return, the long never overflows even for 200 digits.</p>`,
      code: String.raw`
class Solution {
    public int myAtoi(String s) {
        int i = 0, n = s.length();
        while (i < n && s.charAt(i) == ' ') i++;                 // 1) leading spaces
        int sign = 1;
        if (i < n && (s.charAt(i) == '+' || s.charAt(i) == '-')) { // 2) optional sign
            sign = s.charAt(i) == '-' ? -1 : 1;
            i++;
        }
        long val = 0;
        while (i < n && Character.isDigit(s.charAt(i))) {          // 3) digits
            val = val * 10 + (s.charAt(i) - '0');
            if (sign * val > Integer.MAX_VALUE) return Integer.MAX_VALUE;   // 5) clamp early
            if (sign * val < Integer.MIN_VALUE) return Integer.MIN_VALUE;
            i++;
        }
        return (int) (sign * val);                                  // 4) 0 if no digits
    }
}`,
      dry: { head: ['i', 'char', 'state', 'val'], rows: [['0–2', '" "', 'skip spaces', '0'], ['3', '-', 'sign = −1', '0'], ['4', '0', 'digit', '0'], ['5', '4', 'digit', '4'], ['6', '2', 'digit', '42 → return ' + H.c('g', '-42')]] },
      complexity: `<p>O(N) time, O(1) space. Each character is examined at most once.</p>`,
      followUps: ['Valid Number (Hard): accept decimals and exponents like "-1.5e10".', 'Parse a comma-separated list of integers robustly.']
    }
  });

  practice.push({
    title: 'Add Two Huge Numbers Given as Strings',
    level: 'Medium', tags: ['strings', 'big numbers', 'StringBuilder'], companies: ['Google', 'Meta', 'Airbnb', 'Wayfair'],
    statement: `<p>Given two non-negative integers <code>num1</code> and <code>num2</code> as strings, return their sum as a string. You must not use <code>BigInteger</code> or convert the whole inputs to numbers.</p>`,
    constraints: `1 ≤ num1.length, num2.length ≤ 10<sup>4</sup>; digits only; no leading zeros except "0" itself.`,
    example: `<p><code>"456" + "77"</code> → ${H.c('g', '"533"')}.</p>${H.table(['column', '6 + 7', '5 + 7 + carry 1', '4 + 0 + carry 1'], [['digit / carry', '3 / 1', '3 / 1', '5 / 0']])}<p>Read the digits backwards: 5, 3, 3 → "533".</p>`,
    brute: { why: `<p><code>Long.parseLong(num1) + Long.parseLong(num2)</code> is the "obvious" attempt — and it fails as soon as a number has more than 18–19 digits (overflow / NumberFormatException), while inputs here have up to 10,000 digits. Fixed-size types cannot represent the input at all.</p>`, code: String.raw`
class Solution {
    public String addStrings(String num1, String num2) {
        // Breaks for inputs longer than ~18 digits: long has only 64 bits.
        return String.valueOf(Long.parseLong(num1) + Long.parseLong(num2));
    }
}` },
    mcq: { q: 'Adding column by column from the right, what is the largest possible carry?', options: ['1', '9', '18', '10'], answer: 0, explain: 'The largest column sum is 9 + 9 + 1 = 19, which gives digit 9 and carry 1. The carry can never exceed 1 in addition.' },
    hints: [`<p>Hint 1: Do exactly what you learned in school: start from the rightmost digits, add with a carry, write the last digit, carry the rest.</p>`, `<p>Hint 2: Two indexes i, j at the ends of the strings. Treat a finished string as contributing 0. Append digits to a StringBuilder and reverse at the end.</p>`, `<p>Hint 3: Do not forget a final carry ("99" + "1" = "100"). Loop condition: i ≥ 0 || j ≥ 0 || carry &gt; 0. Digit value is <code>c - '0'</code>.</p>`],
    solution: {
      approach: `<p>Grade-school addition. Walk both strings from the right, sum the two digits plus carry, append <code>sum % 10</code>, keep <code>sum / 10</code> as carry. The StringBuilder collects digits in reverse, so reverse once at the end.</p>`,
      code: String.raw`
class Solution {
    public String addStrings(String num1, String num2) {
        StringBuilder sb = new StringBuilder();
        int i = num1.length() - 1, j = num2.length() - 1, carry = 0;
        while (i >= 0 || j >= 0 || carry > 0) {
            int d1 = i >= 0 ? num1.charAt(i--) - '0' : 0;   // 0 once a number is exhausted
            int d2 = j >= 0 ? num2.charAt(j--) - '0' : 0;
            int sum = d1 + d2 + carry;
            sb.append((char) ('0' + sum % 10));
            carry = sum / 10;
        }
        return sb.reverse().toString();
    }
}`,
      alt: [{ lang: 'python', code: String.raw`
def add_strings(a, b):
    i, j, carry, out = len(a) - 1, len(b) - 1, 0, []
    while i >= 0 or j >= 0 or carry:
        s = carry
        if i >= 0:
            s += ord(a[i]) - 48
            i -= 1
        if j >= 0:
            s += ord(b[j]) - 48
            j -= 1
        out.append(str(s % 10))
        carry = s // 10
    return "".join(reversed(out))

print(add_strings("456", "77"), add_strings("99", "1"))  # 533 100`, run: true }],
      dry: { head: ['i', 'j', 'd1 + d2 + carry', 'append', 'carry'], rows: [['2', '1', '6 + 7 + 0 = 13', '3', '1'], ['1', '0', '5 + 7 + 1 = 13', '3', '1'], ['0', '−1', '4 + 0 + 1 = 5', '5', '0'], ['−1', '−1', 'stop', 'reverse "335"', H.c('g', '"533"')]] },
      complexity: `<p>O(max(N, M)) time, O(max(N, M)) space for the output.</p>`,
      followUps: ['Subtract two big numbers (borrow instead of carry; handle a negative result).', 'Add two numbers stored as linked lists (DSA 12).']
    }
  });

  practice.push({
    title: 'Range Sum Queries with Fast I/O',
    level: 'Medium', tags: ['fast io', 'prefix sums', 'constraints'], companies: ['HackerRank OA', 'Codeforces', 'Atlassian'],
    statement: `<p>Read N integers, then Q queries. Each query gives <code>l r</code> (1-indexed, inclusive). For every query print the sum of <code>a[l..r]</code> on its own line. Input comes from standard input; the time limit is 1 second.</p>`,
    constraints: `1 ≤ N, Q ≤ 2 · 10<sup>5</sup>; −10<sup>9</sup> ≤ a[i] ≤ 10<sup>9</sup>; 1 ≤ l ≤ r ≤ N`,
    example: `<p>Input:<br><code>5 3</code><br><code>3 1 4 1 5</code><br><code>1 3</code><br><code>2 5</code><br><code>4 4</code></p><p>Output: ${H.c('g', '8')}, ${H.c('g', '11')}, ${H.c('g', '1')} — e.g. a[2..5] = 1 + 4 + 1 + 5 = 11.</p>`,
    brute: { why: `<p>Use Scanner and, for each query, loop from l to r adding values, printing with <code>System.out.println</code>. Worst case Q × N = 4 × 10<sup>10</sup> additions — hopeless — plus slow input and 2 × 10<sup>5</sup> separate println calls. Two separate problems: algorithmic (repeated summing) and I/O.</p>`, code: String.raw`
import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt(), q = sc.nextInt();
        int[] a = new int[n + 1];
        for (int i = 1; i <= n; i++) a[i] = sc.nextInt();
        while (q-- > 0) {
            int l = sc.nextInt(), r = sc.nextInt();
            long s = 0;
            for (int i = l; i <= r; i++) s += a[i];   // O(N) per query
            System.out.println(s);                    // one flush-prone call per answer
        }
    }
}` },
    mcq: { q: 'With prefix sums <code>pre[i] = a[1] + … + a[i]</code>, the sum of a[l..r] equals…', options: ['pre[r] − pre[l − 1]', 'pre[r] − pre[l]', 'pre[r + 1] − pre[l]', 'pre[l] + pre[r]'], answer: 0, explain: 'pre[r] includes a[1..r]; subtracting pre[l−1] removes a[1..l−1], leaving exactly a[l..r]. pre[0] = 0 makes l = 1 work.' },
    hints: [`<p>Hint 1: Every query re-adds overlapping stretches of the same array. Precompute running totals once.</p>`, `<p>Hint 2: <code>long[] pre</code> of size N + 1 with pre[0] = 0; answer = pre[r] − pre[l − 1] in O(1). Totals reach 2 × 10<sup>14</sup> → long.</p>`, `<p>Hint 3: 6 × 10<sup>5</sup> numbers to read and 2 × 10<sup>5</sup> lines to print → BufferedReader + StringTokenizer for input, StringBuilder (or PrintWriter + flush) for output.</p>`],
    solution: {
      approach: `<p>Two fixes for two bottlenecks: prefix sums make each query O(1) (total O(N + Q)), and buffered input/output removes the I/O overhead. 1-indexed input maps naturally onto a size-(N+1) prefix array.</p>`,
      code: String.raw`
import java.io.*;
import java.util.*;

class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in), 1 << 16);
        StringTokenizer st = new StringTokenizer(br.readLine());
        int n = Integer.parseInt(st.nextToken()), q = Integer.parseInt(st.nextToken());
        long[] pre = new long[n + 1];                    // pre[0] = 0
        st = new StringTokenizer(br.readLine());
        for (int i = 1; i <= n; i++) {
            while (!st.hasMoreTokens()) st = new StringTokenizer(br.readLine());
            pre[i] = pre[i - 1] + Integer.parseInt(st.nextToken());
        }
        StringBuilder out = new StringBuilder();
        while (q-- > 0) {
            st = new StringTokenizer(br.readLine());
            int l = Integer.parseInt(st.nextToken()), r = Integer.parseInt(st.nextToken());
            out.append(pre[r] - pre[l - 1]).append('\n');    // O(1) per query
        }
        System.out.print(out);                           // one big write
    }
}`,
      dry: { head: ['i', 'a[i]', 'pre[i]'], rows: [['0', '—', '0'], ['1', '3', '3'], ['2', '1', '4'], ['3', '4', '8'], ['4', '1', '9'], ['5', '5', '14'], ['query 2..5', '', 'pre[5] − pre[1] = 14 − 3 = ' + H.c('g', '11')]] },
      complexity: `<p>O(N + Q) time, O(N) space. I/O is linear in the input size with small constants.</p>`,
      followUps: ['Add point updates between queries (Fenwick tree, DSA 21).', '2D version: sum of a sub-rectangle (2D prefix sums, DSA 5).']
    }
  });

  practice.push({
    title: 'Rotate Array to the Right by K',
    level: 'Medium', tags: ['arrays', 'in-place', 'reversal'], companies: ['Microsoft', 'Amazon', 'Bloomberg'],
    statement: `<p>Rotate the array <code>nums</code> to the right by <code>k</code> steps <b>in place</b>. Each step moves the last element to the front.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, 0 ≤ k ≤ 10<sup>9</sup>, −2<sup>31</sup> ≤ nums[i] ≤ 2<sup>31</sup> − 1`,
    example: `${H.arr([1, 2, 3, 4, 5, 6, 7], { label: 'before', hl: { 4: 'b', 5: 'b', 6: 'b' } })}${H.arr([5, 6, 7, 1, 2, 3, 4], { label: 'k = 3', hl: { 0: 'b', 1: 'b', 2: 'b' } })}<p>The last 3 elements wrap around to the front. Note k = 10 on 7 elements is the same as k = 3.</p>`,
    brute: { why: `<p>Rotate by one step, k times: save the last element, shift everything right by one, put it at the front. Each step is O(N), so O(N · k). With k up to 10<sup>9</sup> that is absurd; even after <code>k %= n</code> it is up to 10<sup>10</sup> moves. The wasted work: every element is moved k times instead of once.</p>`, code: String.raw`
class Solution {
    public void rotate(int[] nums, int k) {
        int n = nums.length;
        k %= n;                                   // at least avoid useless full cycles
        for (int step = 0; step < k; step++) {
            int last = nums[n - 1];
            for (int i = n - 1; i > 0; i--) nums[i] = nums[i - 1];   // shift right by one
            nums[0] = last;
        }
    }
}` },
    mcq: { q: 'Why do we start with <code>k %= n</code>?', options: ['Rotating by n returns the original array, so only k mod n matters', 'To make k negative', 'Because k must be even', 'To sort the array'], answer: 0, explain: 'After n single steps every element is back home. k = 10, n = 7 behaves exactly like k = 3, and it also prevents index errors when k ≥ n.' },
    hints: [`<p>Hint 1: The answer is "last k elements, then first n − k elements". Can reversing pieces of the array produce that order?</p>`, `<p>Hint 2: Reverse the whole array, then reverse the first k elements, then reverse the remaining n − k elements.</p>`, `<p>Hint 3: Do <code>k %= n</code> first (k can be 10<sup>9</sup> or ≥ n). Write one helper <code>reverse(a, l, r)</code> and call it three times. k = 0 must leave the array unchanged.</p>`],
    solution: {
      approach: `<p>Three reversals. Reversing the whole array brings the last k elements to the front — but backwards. Reversing each of the two blocks again fixes their internal order. Every element moves a constant number of times; only a temp variable is used.</p>`,
      code: String.raw`
class Solution {
    public void rotate(int[] nums, int k) {
        int n = nums.length;
        k %= n;
        reverse(nums, 0, n - 1);      // 7 6 5 4 3 2 1
        reverse(nums, 0, k - 1);      // 5 6 7 | 4 3 2 1
        reverse(nums, k, n - 1);      // 5 6 7 | 1 2 3 4
    }

    private void reverse(int[] a, int l, int r) {
        while (l < r) {
            int t = a[l];
            a[l++] = a[r];
            a[r--] = t;
        }
    }
}`,
      dry: { head: ['step', 'array'], rows: [['start (k = 3)', '[1, 2, 3, 4, 5, 6, 7]'], ['reverse all', '[7, 6, 5, 4, 3, 2, 1]'], ['reverse [0..2]', '[5, 6, 7, 4, 3, 2, 1]'], ['reverse [3..6]', H.c('g', '[5, 6, 7, 1, 2, 3, 4]')]] },
      complexity: `<p>O(N) time (each element swapped at most twice), O(1) extra space.</p>`,
      followUps: ['Rotate left by k.', 'Do it with cyclic replacements (gcd(n, k) cycles).', 'Rotate a String: is "cdeab" a rotation of "abcde"? (check (s + s).contains(t)).']
    }
  });

  practice.push({
    title: 'Game of Life (In-Place Grid Update)',
    level: 'Medium', tags: ['2D arrays', 'simulation', 'bit tricks'], companies: ['Dropbox', 'Google', 'Amazon', 'Snap'],
    statement: `<p>Each cell of an m × n board is live (1) or dead (0). Compute the next generation <b>in place</b> using the rules, applied to all cells <b>simultaneously</b>: a live cell with 2 or 3 live neighbours stays alive; otherwise it dies. A dead cell with exactly 3 live neighbours becomes alive. Neighbours are the 8 surrounding cells.</p>`,
    constraints: `1 ≤ m, n ≤ 25; board[i][j] is 0 or 1`,
    example: `${H.table(['before', '', ''], [['0', '1', '0'], ['0', '0', '1'], ['1', '1', '1'], ['0', '0', '0']])}${H.table(['after', '', ''], [['0', '0', '0'], ['1', '0', '1'], ['0', '1', '1'], ['0', '1', '0']])}<p>E.g. cell (1, 0) was dead with exactly 3 live neighbours (0,1), (2,0), (2,1) → ${H.c('g', 'born')}. Cell (0, 1) had only 1 live neighbour → ${H.c('r', 'dies')}.</p>`,
    brute: { why: `<p>Copy the whole board, count neighbours on the copy, write results to the original. Correct and clear, but O(m·n) extra memory. The naive in-place attempt (no copy) is <b>wrong</b>: cells updated early change the neighbour counts of cells processed later — the rules must be simultaneous.</p>`, code: String.raw`
class Solution {
    public void gameOfLife(int[][] board) {
        int m = board.length, n = board[0].length;
        int[][] old = new int[m][];
        for (int r = 0; r < m; r++) old[r] = board[r].clone();     // O(m*n) extra memory
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++) {
                int live = 0;
                for (int dr = -1; dr <= 1; dr++)
                    for (int dc = -1; dc <= 1; dc++) {
                        if (dr == 0 && dc == 0) continue;
                        int nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < m && nc >= 0 && nc < n) live += old[nr][nc];
                    }
                board[r][c] = (live == 3 || (old[r][c] == 1 && live == 2)) ? 1 : 0;
            }
    }
}` },
    mcq: { q: 'Each cell holds 0 or 1 in an int (32 bits). How can we store the next state without a second board?', options: ['Use bit 1 for the next state and bit 0 for the current state', 'Store it in a String', 'Use negative zero', 'It is impossible in O(1) space'], answer: 0, explain: 'board[r][c] |= nextState &lt;&lt; 1 keeps the current state readable as board[r][c] &amp; 1. Afterwards shift every cell right by 1.' },
    hints: [`<p>Hint 1: The difficulty is that neighbours must see the <b>old</b> state. Can one int cell remember both old and new states?</p>`, `<p>Hint 2: Bit 0 = current state, bit 1 = next state. While counting neighbours, read only <code>board[nr][nc] &amp; 1</code>. Write the new state with <code>board[r][c] |= 2</code> if it will be alive.</p>`, `<p>Hint 3: Second pass: <code>board[r][c] &gt;&gt;= 1</code> makes the next state current. Remember bounds checks on all 8 directions and skip (0, 0).</p>`],
    solution: {
      approach: `<p>Encode two generations in each cell's bits. Pass 1 counts live neighbours using only the low bit (the old state) and sets the second bit for cells that will be alive. Pass 2 shifts every cell right by one. This respects the simultaneous rule with O(1) extra memory.</p>`,
      code: String.raw`
class Solution {
    public void gameOfLife(int[][] board) {
        int m = board.length, n = board[0].length;
        for (int r = 0; r < m; r++) {
            for (int c = 0; c < n; c++) {
                int live = 0;
                for (int dr = -1; dr <= 1; dr++)
                    for (int dc = -1; dc <= 1; dc++) {
                        if (dr == 0 && dc == 0) continue;
                        int nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < m && nc >= 0 && nc < n) live += board[nr][nc] & 1;  // OLD state only
                    }
                boolean alive = (board[r][c] & 1) == 1;
                if (live == 3 || (alive && live == 2)) board[r][c] |= 2;   // next state in bit 1
            }
        }
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++) board[r][c] >>= 1;                  // promote next → current
    }
}`,
      dry: { head: ['cell', 'old', 'live neighbours', 'rule', 'stored value', 'after shift'], rows: [['(0,1)', '1', '1', 'under-population', '01 = 1', '0'], ['(1,0)', '0', '3', 'birth', '10 = 2', '1'], ['(1,2)', '1', '3', 'survives', '11 = 3', '1'], ['(2,1)', '1', '3', 'survives', '11 = 3', '1']] },
      complexity: `<p>O(m · n · 8) = O(m · n) time, O(1) extra space.</p>`,
      followUps: ['The board is infinite / huge and sparse: store only live cells in a HashSet of coordinates.', 'Simulate k generations efficiently (detect cycles).']
    }
  });

  practice.push({
    title: 'Multiply Strings',
    level: 'Medium', tags: ['strings', 'big numbers', 'arrays'], companies: ['Meta', 'Microsoft', 'Twitter', 'Amazon'],
    statement: `<p>Given two non-negative integers <code>num1</code> and <code>num2</code> as strings, return their product as a string. Do not use <code>BigInteger</code> or convert the inputs to integers directly.</p>`,
    constraints: `1 ≤ num1.length, num2.length ≤ 200; digits only; no leading zeros except "0".`,
    example: `<p><code>"123" × "45"</code> → ${H.c('g', '"5535"')}.</p>${H.table(['', 'pos 0', 'pos 1', 'pos 2', 'pos 3', 'pos 4'], [['raw sums', '0', '4', '13', '22', '15'], ['after carries', '0', '5', '5', '3', '5']])}<p>Digit i of num1 times digit j of num2 lands at position <b>i + j + 1</b>. Strip the leading 0 → "5535".</p>`,
    brute: { why: `<p>Mimic long multiplication with strings: for each digit of num2, build a partial product string (num1 × digit, padded with zeros) and add it to the total with an add-strings helper. O(N·M) arithmetic, but it creates M intermediate strings of length up to N + M and re-copies the growing total each time — lots of allocation and code.</p>`, code: String.raw`
class Solution {
    public String multiply(String num1, String num2) {
        if (num1.equals("0") || num2.equals("0")) return "0";
        String total = "0";
        for (int j = num2.length() - 1, shift = 0; j >= 0; j--, shift++) {
            int d = num2.charAt(j) - '0';
            StringBuilder part = new StringBuilder();
            for (int z = 0; z < shift; z++) part.append('0');      // place value zeros
            int carry = 0;
            for (int i = num1.length() - 1; i >= 0; i--) {
                int p = (num1.charAt(i) - '0') * d + carry;
                part.append(p % 10);
                carry = p / 10;
            }
            if (carry > 0) part.append(carry);
            total = add(total, part.reverse().toString());          // new string every round
        }
        return total;
    }

    private String add(String a, String b) {
        StringBuilder sb = new StringBuilder();
        int i = a.length() - 1, j = b.length() - 1, carry = 0;
        while (i >= 0 || j >= 0 || carry > 0) {
            int s = carry + (i >= 0 ? a.charAt(i--) - '0' : 0) + (j >= 0 ? b.charAt(j--) - '0' : 0);
            sb.append(s % 10);
            carry = s / 10;
        }
        return sb.reverse().toString();
    }
}` },
    mcq: { q: 'A number with N digits times a number with M digits has at most how many digits?', options: ['N + M', 'N × M', 'max(N, M) + 1', 'N + M + 1'], answer: 0, explain: '10<sup>N</sup> × 10<sup>M</sup> = 10<sup>N+M</sup>, and both factors are smaller, so the product has at most N + M digits. Allocate an int[N + M].' },
    hints: [`<p>Hint 1: Indexing from the left, digit i of num1 (place value 10<sup>N−1−i</sup>) times digit j of num2 contributes to result position i + j + 1 of an array of length N + M.</p>`, `<p>Hint 2: Accumulate all products into <code>int[] res = new int[N + M]</code> first, then sweep once from right to left pushing carries: res[k − 1] += res[k] / 10; res[k] %= 10.</p>`, `<p>Hint 3: Each cell collects at most ~200 products of ≤ 81 — fits easily in int. Skip leading zeros when building the string; if everything is zero, return "0".</p>`],
    solution: {
      approach: `<p>Position-array multiplication. Add every digit-pair product into slot i + j + 1, normalise carries once at the end, and build the string while skipping leading zeros. No intermediate strings.</p>`,
      code: String.raw`
class Solution {
    public String multiply(String num1, String num2) {
        int n = num1.length(), m = num2.length();
        int[] res = new int[n + m];                         // product has at most n + m digits
        for (int i = n - 1; i >= 0; i--) {
            int a = num1.charAt(i) - '0';
            for (int j = m - 1; j >= 0; j--) {
                res[i + j + 1] += a * (num2.charAt(j) - '0');   // accumulate, carry later
            }
        }
        for (int k = n + m - 1; k > 0; k--) {               // single carry sweep
            res[k - 1] += res[k] / 10;
            res[k] %= 10;
        }
        StringBuilder sb = new StringBuilder();
        for (int d : res) if (sb.length() > 0 || d != 0) sb.append(d);   // skip leading zeros
        return sb.length() == 0 ? "0" : sb.toString();
    }
}`,
      dry: { head: ['i (num1 digit)', 'j (num2 digit)', 'product', 'slot i+j+1'], rows: [['2 (3)', '1 (5)', '15', '4'], ['2 (3)', '0 (4)', '12', '3'], ['1 (2)', '1 (5)', '10', '3'], ['1 (2)', '0 (4)', '8', '2'], ['0 (1)', '1 (5)', '5', '2'], ['0 (1)', '0 (4)', '4', '1'], ['carry sweep', '', '[0,4,13,22,15] →', H.c('g', '[0,5,5,3,5] → "5535"')]] },
      complexity: `<p>O(N · M) time, O(N + M) space.</p>`,
      followUps: ['Karatsuba multiplication: O(N<sup>1.585</sup>) for very long numbers.', 'Factorial of 1000 as a string (see the Hard problem below).']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Factorial of a Large Number',
    level: 'Hard', tags: ['arrays', 'big numbers', 'overflow', 'simulation'], companies: ['Amazon', 'Samsung', 'Oracle'],
    statement: `<p>Given <code>N</code>, return <code>N!</code> (1 × 2 × … × N) as a string of digits. Do not use <code>BigInteger</code>.</p>`,
    constraints: `0 ≤ N ≤ 1000 (1000! has 2,568 digits)`,
    example: `<p><code>N = 25</code> → ${H.c('g', '"15511210043330985984000000"')} (26 digits).</p><p>Why a <code>long</code> fails: 20! = 2,432,902,008,176,640,000 is the largest factorial that fits; ${H.c('r', '21! overflows')} 9.22 × 10<sup>18</sup>.</p>`,
    brute: { why: `<p>Multiply into a <code>long</code>. It is correct up to N = 20, then silently overflows to garbage (no exception). Using <code>BigInteger</code> would be correct but is banned here — and the interviewer wants to see that you can do big-number arithmetic with arrays yourself.</p>`, code: String.raw`
class Solution {
    public String factorial(int n) {
        long f = 1;
        for (int i = 2; i <= n; i++) f *= i;   // overflows silently for n >= 21
        return String.valueOf(f);
    }
}` },
    mcq: { q: 'You store digits least-significant first in an int array and multiply by i ≤ 1000. What is the largest value of digit × i + carry in one step?', options: ['A few thousand (9 × 1000 + carry) — fits in int', 'More than 2<sup>31</sup>', 'Exactly 9', 'It depends on the number of digits'], answer: 0, explain: 'digit ≤ 9, i ≤ 1000, carry ≤ ~1000, so the product is ≤ ~10<sup>4</sup>. Plain int arithmetic is perfectly safe.' },
    hints: [`<p>Hint 1: Store the number as an array of digits, <b>least significant first</b> (units at index 0). That makes carries flow toward higher indexes and lets the array grow at the end.</p>`, `<p>Hint 2: To multiply the whole number by i: for each digit, <code>prod = digit * i + carry</code>; store <code>prod % 10</code>; <code>carry = prod / 10</code>. After the last digit, append carry digit by digit.</p>`, `<p>Hint 3: Allocate <code>int[3000]</code> (enough for 1000!) and track <code>len</code>. 0! = 1! = 1. Build the answer by reading digits from len − 1 down to 0 with a StringBuilder.</p>`],
    solution: {
      approach: `<p>Schoolbook multiplication of a big number (digit array) by a small int, repeated for i = 2..N. Each step touches every current digit once. Digits are stored in reverse so the number can grow at the end in O(1).</p>`,
      code: String.raw`
class Solution {
    public String factorial(int n) {
        int[] d = new int[3000];          // 1000! has 2568 digits
        d[0] = 1;
        int len = 1;                      // current number of digits (stored units-first)
        for (int i = 2; i <= n; i++) {
            int carry = 0;
            for (int k = 0; k < len; k++) {
                int prod = d[k] * i + carry;
                d[k] = prod % 10;
                carry = prod / 10;
            }
            while (carry > 0) {           // number grew: append new high digits
                d[len++] = carry % 10;
                carry /= 10;
            }
        }
        StringBuilder sb = new StringBuilder(len);
        for (int k = len - 1; k >= 0; k--) sb.append(d[k]);
        return sb.toString();
    }
}`,
      alt: [{ lang: 'python', code: String.raw`
def factorial_digits(n):
    d = [1]                      # least significant digit first
    for i in range(2, n + 1):
        carry = 0
        for k in range(len(d)):
            prod = d[k] * i + carry
            d[k] = prod % 10
            carry = prod // 10
        while carry:
            d.append(carry % 10)
            carry //= 10
    return "".join(map(str, reversed(d)))

print(factorial_digits(25))        # 15511210043330985984000000
print(len(factorial_digits(1000))) # 2568`, run: true }],
      dry: { head: ['i', 'digits (units first)', 'number'], rows: [['start', '[1]', '1'], ['2', '[2]', '2'], ['3', '[6]', '6'], ['4', '[4, 2]', '24'], ['5', '[0, 2, 1]', H.c('g', '120')]] },
      complexity: `<p>O(N · D) where D is the number of digits of N! (≈ 2,568 for N = 1000) → about 2.5 × 10<sup>6</sup> steps. O(D) space. Storing 4 digits per int cell (base 10,000) cuts the work by 4×.</p>`,
      followUps: ['Count trailing zeros of N! without computing it (count factors of 5).', 'Compute N! mod 10<sup>9</sup>+7 for N up to 10<sup>6</sup> (just a long and %).', 'Use base 10<sup>9</sup> per cell with long arithmetic to go 9× faster.']
    }
  });

  practice.push({
    title: 'Integer to English Words',
    level: 'Hard', tags: ['strings', 'methods', 'decomposition'], companies: ['Meta', 'Amazon', 'Microsoft', 'Oracle'],
    statement: `<p>Convert a non-negative integer <code>num</code> to its English words representation, e.g. 1234567 → "One Million Two Hundred Thirty Four Thousand Five Hundred Sixty Seven". Words are separated by single spaces with no leading or trailing spaces.</p>`,
    constraints: `0 ≤ num ≤ 2<sup>31</sup> − 1`,
    example: `${H.table(['Input', 'Output'], [['123', '"One Hundred Twenty Three"'], ['12345', '"Twelve Thousand Three Hundred Forty Five"'], ['1000010', '"One Million Ten"'], ['0', H.c('y', '"Zero"')]])}<p>Notice the pattern: the number splits into groups of three digits (billions, millions, thousands, units), and each group is spoken the same way, followed by its scale word. Empty groups (000) are skipped entirely.</p>`,
    brute: { why: `<p>A recursive function that concatenates Strings at every level with <code>+ " " +</code> and then calls <code>trim()</code> to clean up extra spaces. It is correct, but it builds and copies many temporary strings and relies on trimming to hide spacing bugs — a design that breaks easily when requirements change (e.g. adding "and" in British English).</p>`, code: String.raw`
class Solution {
    private static final String[] ONES = {"", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"};
    private static final String[] TENS = {"", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"};

    public String numberToWords(int num) {
        if (num == 0) return "Zero";
        return words(num).trim();
    }

    private String words(int n) {
        if (n == 0) return "";
        if (n < 20) return ONES[n];
        if (n < 100) return (TENS[n / 10] + " " + words(n % 10)).trim();
        if (n < 1000) return (ONES[n / 100] + " Hundred " + words(n % 100)).trim();
        if (n < 1_000_000) return (words(n / 1000) + " Thousand " + words(n % 1000)).trim();
        if (n < 1_000_000_000) return (words(n / 1_000_000) + " Million " + words(n % 1_000_000)).trim();
        return (words(n / 1_000_000_000) + " Billion " + words(n % 1_000_000_000)).trim();
    }
}` },
    mcq: { q: 'How should the group "000" in 1,000,010 be handled?', options: ['Skip it completely — no "Thousand" word', 'Say "Zero Thousand"', 'Say "Thousand" alone', 'Throw an exception'], answer: 0, explain: '1,000,010 is "One Million Ten". A scale word is spoken only when its 3-digit group is non-zero.' },
    hints: [`<p>Hint 1: Every number is just 3-digit groups with scale words: [Billion, Million, Thousand, ""]. Write one helper <code>three(int n)</code> for 1–999 and reuse it for all groups.</p>`, `<p>Hint 2: three(n): hundreds digit → ONES[h] + " Hundred"; the remaining 0–99: if &lt; 20 use ONES directly (handles Eleven…Nineteen), else TENS[t] plus ONES[u] if u &gt; 0.</p>`, `<p>Hint 3: Peel groups with <code>% 1000</code> and <code>/ 1000</code> from the lowest scale upward (or divide by 10<sup>9</sup>, 10<sup>6</sup>, 10<sup>3</sup> from the top). Skip zero groups. Join non-empty pieces with single spaces. Special-case 0 → "Zero".</p>`],
    solution: {
      approach: `<p>Decompose with helper methods. <code>three(n)</code> converts 1–999 into a list of words. The main method walks the scales Billion, Million, Thousand and units, appending each non-zero group's words plus its scale. Using a word list joined with single spaces makes spacing correct by construction — no trimming hacks.</p>`,
      code: String.raw`
class Solution {
    private static final String[] ONES = {"", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"};
    private static final String[] TENS = {"", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"};
    private static final int[] SCALE_VAL = {1_000_000_000, 1_000_000, 1_000, 1};
    private static final String[] SCALE_NAME = {"Billion", "Million", "Thousand", ""};

    public String numberToWords(int num) {
        if (num == 0) return "Zero";
        List<String> words = new ArrayList<>();
        for (int s = 0; s < SCALE_VAL.length; s++) {
            int group = num / SCALE_VAL[s];
            num %= SCALE_VAL[s];
            if (group == 0) continue;                        // skip empty groups like "000"
            three(group, words);
            if (!SCALE_NAME[s].isEmpty()) words.add(SCALE_NAME[s]);
        }
        return String.join(" ", words);                      // single spaces by construction
    }

    // Appends the words for 1..999
    private void three(int n, List<String> out) {
        if (n >= 100) { out.add(ONES[n / 100]); out.add("Hundred"); n %= 100; }
        if (n >= 20) { out.add(TENS[n / 10]); n %= 10; }
        if (n > 0) out.add(ONES[n]);                         // 1..19 handled in one table
    }
}`,
      dry: { head: ['scale', 'group', 'words added', 'remaining num'], rows: [['Billion', '0', '(skip)', '1234567'], ['Million', '1', 'One Million', '234567'], ['Thousand', '234', 'Two Hundred Thirty Four Thousand', '567'], ['units', '567', 'Five Hundred Sixty Seven', H.c('g', '0 → join')]] },
      complexity: `<p>O(1): at most 4 groups with a few words each (O(log₁₀ num) in general).</p>`,
      followUps: ['Support negative numbers and "and" (British style: "One Hundred and Five").', 'Reverse direction: parse English words back into an integer.']
    }
  });

  practice.push({
    title: 'Text Justification',
    level: 'Hard', tags: ['strings', 'simulation', 'StringBuilder', 'greedy'], companies: ['Google', 'Airbnb', 'LinkedIn', 'Uber', 'Coursera'],
    statement: `<p>Given an array of <code>words</code> and a width <code>maxWidth</code>, format the text so each line has exactly <code>maxWidth</code> characters and is fully justified. Pack as many words as possible into each line (greedy). Distribute extra spaces between words as evenly as possible; if they do not divide evenly, the <b>left</b> gaps get more. A line with one word is left-justified (padded on the right). The <b>last line</b> is left-justified with single spaces between words, padded on the right.</p>`,
    constraints: `1 ≤ words.length ≤ 300; 1 ≤ words[i].length ≤ 20; words[i].length ≤ maxWidth ≤ 100`,
    example: `<p><code>words = ["This", "is", "an", "example", "of", "text", "justification."]</code>, maxWidth = 16:</p>${H.table(['Line', 'Why'], [['<code>"This&nbsp;&nbsp;&nbsp;&nbsp;is&nbsp;&nbsp;&nbsp;&nbsp;an"</code>', '8 letters, 8 spaces over 2 gaps → 4 + 4'], ['<code>"example&nbsp;&nbsp;of&nbsp;text"</code>', '13 letters, 3 spaces over 2 gaps → ' + H.c('b', '2 + 1 (left gap gets the extra)')], ['<code>"justification.&nbsp;&nbsp;"</code>', H.c('y', 'last line: left-justified, padded right')]])}`,
    brute: { why: `<p>Build each line by appending words, then insert extra spaces <b>one at a time</b> in round-robin order across the gaps using repeated String concatenation. It produces the right answer, but each insertion copies the line (O(maxWidth) per space → O(maxWidth<sup>2</sup>) per line), and round-robin logic plus special cases (one word, last line) gets tangled. Arithmetic can place all spaces in one go.</p>`, code: String.raw`
class Solution {
    public List<String> fullJustify(String[] words, int maxWidth) {
        List<String> res = new ArrayList<>();
        int i = 0;
        while (i < words.length) {
            int j = i, len = 0;
            while (j < words.length && len + words[j].length() + (j - i) <= maxWidth) len += words[j++].length();
            String[] gapsArr = new String[Math.max(1, j - i - 1)];
            Arrays.fill(gapsArr, j == words.length ? " " : "");
            if (j < words.length && j - i > 1) {
                for (int s = 0; s < maxWidth - len; s++) gapsArr[s % (j - i - 1)] += " ";   // one space at a time
            }
            String line = words[i];
            for (int k = i + 1; k < j; k++) line += gapsArr[k - i - 1] + words[k];
            while (line.length() < maxWidth) line += " ";                                  // pad right
            res.add(line);
            i = j;
        }
        return res;
    }
}` },
    mcq: { q: 'A line has 3 words with 13 letters in total and maxWidth = 20. How are the 7 spaces split over the 2 gaps?', options: ['4 then 3', '3 then 4', '3.5 and 3.5', '7 then 0'], answer: 0, explain: '7 / 2 = 3 remainder 1. Every gap gets 3, and the leftmost 1 gap gets one extra: 4, 3.' },
    hints: [`<p>Hint 1: Split the job into two helpers: (a) <b>choose</b> the words for a line greedily — keep adding while total letters + minimum single spaces ≤ maxWidth; (b) <b>render</b> the line.</p>`, `<p>Hint 2: For a normal line with g = count − 1 gaps and S = maxWidth − letters spaces: each gap gets S / g, and the first S % g gaps get one extra.</p>`, `<p>Hint 3: Special cases: a line with one word, and the last line → words joined with single spaces, then pad with spaces on the right to maxWidth. Use StringBuilder and <code>" ".repeat(k)</code>.</p>`],
    solution: {
      approach: `<p>Greedy line packing plus arithmetic spacing. For each line find the last word that fits (counting one mandatory space between words). If it is the last line or has one word, left-justify; otherwise compute base = S / gaps and extra = S % gaps, giving the first <code>extra</code> gaps one additional space. Every character of the output is written once.</p>`,
      code: String.raw`
class Solution {
    public List<String> fullJustify(String[] words, int maxWidth) {
        List<String> res = new ArrayList<>();
        int i = 0, n = words.length;
        while (i < n) {
            // 1) choose words i..j-1 for this line
            int j = i, letters = 0;
            while (j < n && letters + words[j].length() + (j - i) <= maxWidth) letters += words[j++].length();
            int count = j - i, gaps = count - 1;
            StringBuilder sb = new StringBuilder(maxWidth);
            if (j == n || gaps == 0) {
                // 2a) last line or single word: left-justify
                for (int k = i; k < j; k++) {
                    if (k > i) sb.append(' ');
                    sb.append(words[k]);
                }
                sb.append(" ".repeat(maxWidth - sb.length()));
            } else {
                // 2b) full justification: spread spaces, extra ones go left
                int spaces = maxWidth - letters, base = spaces / gaps, extra = spaces % gaps;
                for (int k = i; k < j; k++) {
                    sb.append(words[k]);
                    if (k < j - 1) sb.append(" ".repeat(base + (k - i < extra ? 1 : 0)));
                }
            }
            res.add(sb.toString());
            i = j;
        }
        return res;
    }
}`,
      dry: { head: ['line', 'words', 'letters', 'spaces / gaps', 'base, extra', 'result'], rows: [['1', 'This is an', '8', '8 / 2', '4, 0', '"This····is····an"'], ['2', 'example of text', '13', '3 / 2', '1, 1', '"example··of·text"'], ['3 (last)', 'justification.', '14', '—', 'left-justify', '"justification.··"']] },
      complexity: `<p>O(total characters of output) = O(lines × maxWidth) time; O(maxWidth) extra per line.</p>`,
      followUps: ['Centre-justify each line instead.', 'Minimise the "raggedness" (sum of squared trailing spaces) instead of greedy packing — a DP problem (DSA 17).']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'What does <code>System.out.println(7 / 2 + 7 % 2);</code> print?', options: ['4', '3.5', '4.5', '3'], answer: 0, explain: '7 / 2 is integer division = 3, and 7 % 2 = 1. 3 + 1 = 4.' },
    { q: 'What does <code>System.out.println(-7 % 3);</code> print in Java?', options: ['-1', '2', '1', '-2'], answer: 0, explain: 'Java\'s remainder takes the sign of the left operand: -7 = 3 × (-2) + (-1). Use Math.floorMod(-7, 3) to get 2.' },
    { q: 'a and b are <code>int</code> values up to 10<sup>5</sup>. Which line stores their product correctly?', options: ['<code>long p = (long) a * b;</code>', '<code>long p = a * b;</code>', '<code>int p = a * b;</code>', '<code>long p = (long) (a * b);</code>'], answer: 0, explain: 'The cast must happen before the multiplication. In (long)(a * b) and a * b, the int multiplication has already overflowed (10<sup>10</sup> &gt; 2.1 × 10<sup>9</sup>).' },
    { q: 'Your O(N) solution gets Time Limit Exceeded on a HackerRank test with 10<sup>6</sup> input numbers. What is the first thing to check?', options: ['Whether you read input with Scanner instead of BufferedReader', 'Whether you used a for loop', 'Whether the class is public', 'Whether you used int instead of long'], answer: 0, explain: 'With a linear algorithm, I/O often dominates. Scanner parses each token with regular expressions and is several times slower than BufferedReader + StringTokenizer.' },
    { q: 'What is printed?<br><code>int[] a = {1, 2, 3}; int[] b = a; b[0] = 9; System.out.println(a[0]);</code>', options: ['9', '1', '0', 'Compile error'], answer: 0, explain: 'b = a copies the reference (address), not the array. Both names refer to the same object, so the write through b is visible through a.' },
    { q: 'Inside <code>void f(int[] arr)</code> you write <code>arr = new int[5]; arr[0] = 7;</code>. What does the caller\'s array look like afterwards?', options: ['Unchanged', 'Its first element is 7', 'It now has length 5', 'It becomes null'], answer: 0, explain: 'Java passes a copy of the reference. Re-pointing the local parameter to a new array does not affect the caller; the write goes into the new array only.' },
    { q: 'Which comparison is correct for checking whether two Strings have the same text?', options: ['<code>s.equals(t)</code>', '<code>s == t</code>', '<code>s.compareTo(t) == 1</code>', '<code>s.hashCode() == t.hashCode()</code> alone'], answer: 0, explain: '== compares references (works by accident for pooled literals). Equal hash codes do not guarantee equal text. equals compares content.' },
    { q: 'Constraints say N ≤ 10<sup>5</sup>. Which complexity is the safe target?', options: ['O(N log N) or better', 'O(N<sup>2</sup>)', 'O(2<sup>N</sup>)', 'O(N<sup>3</sup>)'], answer: 0, explain: 'N log N ≈ 1.7 × 10<sup>6</sup> steps — comfortable. N<sup>2</sup> = 10<sup>10</sup> would take ~100 seconds at 10<sup>8</sup> steps per second.' },
    { q: 'Constraints say N ≤ 20. What does that most likely hint?', options: ['Trying all 2<sup>N</sup> subsets is intended', 'You must use O(log N)', 'Use a HashMap', 'Read input with Scanner'], answer: 0, explain: '2<sup>20</sup> ≈ 10<sup>6</sup>, so exponential enumeration (bitmasks/backtracking) fits easily. Setters choose tiny N exactly to allow that.' },
    { q: 'How many subarrays does an array of length N have?', options: ['N(N+1)/2', 'N<sup>2</sup>', '2<sup>N</sup>', 'N!'], answer: 0, explain: 'Choose a start i and an end j ≥ i: N + (N−1) + … + 1 = N(N+1)/2. Subsets (not necessarily contiguous) would be 2<sup>N</sup>.' },
    { q: 'Why is <code>result += piece;</code> on a String inside a loop of 10<sup>5</sup> iterations a problem?', options: ['Each += copies the whole string, making it O(N<sup>2</sup>) overall', 'Strings cannot be longer than 1000 chars', 'It causes a compile error', 'It changes the original String object'], answer: 0, explain: 'Strings are immutable, so every concatenation creates a new String and copies all previous characters. StringBuilder appends in amortised O(1).' },
    { q: '<code>Integer x = 1000, y = 1000;</code> What does <code>x == y</code> usually return?', options: ['false', 'true', 'It throws an exception', 'It does not compile'], answer: 0, explain: 'Only values in −128…127 are guaranteed to be cached. 1000 autoboxes into two distinct Integer objects, and == compares references. Use equals or compare int values.' },
    { q: 'A recursive DFS on a path-shaped tree with 10<sup>6</sup> nodes crashes with StackOverflowError. Why?', options: ['Each call adds a stack frame, and the default thread stack holds far fewer than 10<sup>6</sup> frames', 'The heap is full of nodes', 'Recursion is not allowed in Java', 'The tree has a cycle'], answer: 0, explain: 'Recursion depth equals the path length. Frames live on the thread stack (often ~512 KB–1 MB by default). Fix: iterative DFS with an explicit stack, or run in a Thread with a larger stack size.' }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { q: 'Is Java pass-by-value or pass-by-reference?', level: 'B', a: `<p>Java is <b>always pass-by-value</b>. For primitives, the value (e.g. the number 5) is copied into the parameter. For objects, the value being copied is the <b>reference</b> (the address). That is why a method can <b>mutate</b> the object the caller passed (both copies of the address point to the same object), but <b>re-assigning</b> the parameter (<code>arr = new int[3]</code>) never affects the caller's variable. A classic proof: a <code>swap(Integer a, Integer b)</code> method cannot swap the caller's variables.</p>`, followUps: ['How would you let a method "return" two values?', 'What does this mean for Strings, given they are immutable?'] },
    { q: 'What is the difference between the stack and the heap in Java?', level: 'B', a: `<p>The <b>stack</b> (one per thread) holds a <b>frame</b> per active method call: parameters, local primitives and local references. Frames are pushed on call and popped on return — very fast, automatically sized, but small (often ~512 KB–1 MB), so very deep recursion causes <code>StackOverflowError</code>. The <b>heap</b> is shared memory where every object created with <code>new</code> lives (arrays, Strings, collections). Objects live as long as they are reachable; the <b>garbage collector</b> frees unreachable ones. Running out of heap gives <code>OutOfMemoryError</code>.</p>`, followUps: ['Where does a local int[] variable live, and where does the array live?', 'What is escape analysis?'] },
    { q: 'Why is Scanner slow and what do you use instead in coding assessments?', level: 'B', a: `<p><code>Scanner</code> tokenises input with <b>regular expressions</b>, validates each token (including locale handling) and uses a small buffer, so each <code>nextInt()</code> is relatively expensive. With 10<sup>5</sup>–10<sup>6</sup> numbers this can cost close to a second. I use <code>BufferedReader</code> (large buffered chunks) with <code>StringTokenizer</code> and <code>Integer.parseInt</code>, or a custom byte reader over <code>DataInputStream</code> for 10<sup>7</sup>-scale inputs. For output I collect results in a <code>StringBuilder</code> or a <code>PrintWriter</code> and flush once at the end.</p>`, followUps: ['What happens if you forget to flush a PrintWriter?', 'Explain the nextInt() then nextLine() bug.'] },
    { q: 'How do you decide between int and long for a problem?', level: 'B', a: `<p>I read the constraints and compute the <b>largest intermediate value</b>, not just the inputs. int holds about ±2.1 × 10<sup>9</sup>; long about ±9.2 × 10<sup>18</sup>. If values are up to 10<sup>9</sup> and I <b>sum</b> 10<sup>5</sup> of them (10<sup>14</sup>) or <b>multiply</b> two (10<sup>18</sup>), I use long for the accumulator — and I cast <i>before</i> the arithmetic: <code>(long) a * b</code>. Counting pairs among 10<sup>5</sup> elements (up to ~5 × 10<sup>9</sup>) also needs long. When even long can overflow (products of two longs), I use modular arithmetic, <code>Math.multiplyHigh</code>, or <code>BigInteger</code>.</p>`, followUps: ['What does Integer.MAX_VALUE + 1 evaluate to?', 'How do you detect overflow without using long?'] },
    { q: 'Explain the Integer cache pitfall with ==.', level: 'I', a: `<p>Autoboxing uses <code>Integer.valueOf</code>, which returns <b>cached</b> objects for values from −128 to 127 (guaranteed by the language spec). So <code>Integer a = 100, b = 100; a == b</code> is true (same cached object), but with 1000 two separate objects are created and <code>==</code> (reference comparison) is false. This bites in code like <code>map.get(x) == map.get(y)</code> or comparing elements of a <code>List&lt;Integer&gt;</code>. Fix: use <code>.equals</code>, <code>Integer.compare</code>, or unbox to int. Also beware unboxing <code>null</code> → NullPointerException.</p>`, followUps: ['Can the cache upper bound be changed?', 'Why might boxing hurt performance in a HashMap-heavy solution?'] },
    { q: 'Why does String concatenation in a loop hurt performance, and what does the compiler do about it?', level: 'I', a: `<p>Strings are immutable, so <code>s += x</code> inside a loop creates a <b>new</b> String each time and copies all existing characters, giving O(N<sup>2</sup>) total work for N appends. Since Java 9 the compiler turns a <b>single</b> concatenation expression into an efficient <code>invokedynamic</code> call (StringConcatFactory), but it cannot merge appends across loop iterations. The fix is an explicit <code>StringBuilder</code> (amortised O(1) append because its internal array grows geometrically), then <code>toString()</code> once.</p>`, followUps: ['StringBuilder vs StringBuffer?', 'What is the time complexity of sb.insert(0, c) repeated N times?'] },
    { q: 'You are given a problem with N ≤ 10<sup>5</sup>. Walk me through how constraints shape your approach.', level: 'I', a: `<p>First I convert the constraint into a budget: roughly 10<sup>8</sup> simple operations per second, so O(N<sup>2</sup>) = 10<sup>10</sup> is out and I target O(N log N) or O(N). That suggests sorting, binary search, heaps, hashing, two pointers or prefix sums. Next I check <b>value ranges</b>: values up to 10<sup>9</sup> mean sums need <code>long</code>; values up to 10<sup>6</sup> allow counting arrays. Then <b>hidden multipliers</b>: number of test cases, number of queries, string lengths. Finally edge cases implied by the bounds: N = 1, negatives, duplicates. I say all of this out loud before coding.</p>`, followUps: ['What would change if N ≤ 20?', 'How do you handle "sum of N over all test cases ≤ 2·10^5"?'] },
    { q: 'What is the value of writing a brute-force solution first in an interview?', level: 'B', a: `<p>It proves I understand the problem and gives a <b>correct baseline</b> within minutes, so I am never left with nothing. Stating its complexity against the constraints shows exactly why we need something better and <b>where the repeated work is</b> (e.g. re-summing subarrays), which usually points to the optimisation. It also doubles as a <b>test oracle</b>: I can compare the optimised version against it on small inputs. I keep it short — describe it in a sentence, code it only if the interviewer wants or if N is small enough that it is the final answer.</p>`, followUps: ['When is the brute force the final answer?', 'How would you stress test your optimised solution?'] },
    { q: 'How would you stress test a solution?', level: 'I', a: `<p>I write three pieces: a <b>brute-force</b> solution that is obviously correct (no cleverness), a <b>random generator</b> with a fixed seed producing small inputs (e.g. N ≤ 8, values −10…10, including duplicates and negatives), and a loop that runs both solutions thousands of times and stops at the first mismatch, printing the input. Small inputs keep failures readable; the fixed seed makes them reproducible. Then I shrink the failing case by hand, fix the bug and rerun. It is the same principle as property-based and differential testing in industry.</p>`, followUps: ['Why small values rather than random 10^9 values?', 'How do you test for TLE rather than correctness?'] },
    { q: 'What does Arrays.sort use internally, and does it matter in interviews?', level: 'A', a: `<p>For primitive arrays (<code>int[]</code>, <code>long[]</code>…) Java uses <b>dual-pivot quicksort</b> — fast in practice, not stable. Newer JDKs guard against pathological recursion depth by falling back to heapsort, but on older judges crafted inputs could trigger slow cases, so competitive programmers sometimes shuffle first or sort boxed/long arrays. For object arrays (<code>Integer[]</code>, <code>int[][]</code>, <code>String[]</code>) and <code>Collections.sort</code>, Java uses <b>TimSort</b>: stable, O(N log N) worst case, adaptive on partially sorted data. Stability matters when sorting by one key after another; comparators should use <code>Integer.compare</code> rather than subtraction to avoid overflow.</p>`, followUps: ['Why is a - b a dangerous comparator?', 'What does stability mean and when do you need it?'] },
    { q: 'How do you avoid StackOverflowError for deep recursion in Java?', level: 'A', a: `<p>First, estimate depth: recursion on a linked structure or a path-shaped tree can reach N (10<sup>5</sup>–10<sup>6</sup>), while the default thread stack fits only ~10<sup>4</sup>–10<sup>5</sup> frames depending on frame size. Options: (1) rewrite the recursion iteratively with an explicit <code>ArrayDeque</code> as the stack — the most robust; (2) run the solver in a <code>new Thread(null, runnable, "main", 1 &lt;&lt; 26)</code> with a larger stack — common on judges; (3) reduce frame size (fewer locals/parameters). Tail calls are not optimised by the JVM, so "tail recursion" does not help.</p>`, followUps: ['Convert recursive inorder traversal to iterative.', 'Does -Xss work on online judges?'] },
    { q: 'Shallow copy vs deep copy of a 2D array — what is the difference?', level: 'I', a: `<p>A 2D array in Java is an array of references to row arrays. <code>grid.clone()</code> creates a new <b>outer</b> array but copies the row <b>references</b>, so both grids share the same rows — a <b>shallow</b> copy; modifying <code>copy[0][0]</code> changes the original. A <b>deep</b> copy clones each row: <code>for r: copy[r] = grid[r].clone()</code>. This matters for simulations (Game of Life, BFS on a mutated grid), backtracking snapshots and any "return a new board" problem. The same idea applies to <code>List&lt;List&lt;Integer&gt;&gt;</code>: copy inner lists with <code>new ArrayList&lt;&gt;(inner)</code>.</p>`, followUps: ['How does Arrays.copyOf behave for a 2D array?', 'How would you deep-copy a graph?'] },
    { q: 'How do Java Strings store characters, and what does that mean for Unicode problems?', level: 'E', a: `<p>Since Java 9, a String stores a <code>byte[]</code> plus a coder flag: <b>LATIN-1</b> (1 byte per char) when possible, otherwise <b>UTF-16</b> (2 bytes per char) — "compact strings". A Java <code>char</code> is a UTF-16 <b>code unit</b>, so characters outside the Basic Multilingual Plane (emoji, some CJK) occupy <b>two</b> chars (a surrogate pair): <code>"😀".length() == 2</code>. Interview problems usually restrict input to ASCII, so <code>charAt</code> and <code>int[26]</code> are fine; for real text, iterate <code>codePoints()</code> and use int-based Character methods. Strings also cache their hash code, and <code>substring</code> copies (since 7u6), costing O(length).</p>`, followUps: ['How would you reverse a string containing emoji correctly?', 'Why is String a good HashMap key?'] },
    { q: 'You can only use 256 MB of memory and need a 10<sup>4</sup> × 10<sup>4</sup> table. What do you do?', level: 'A', a: `<p>Estimate first: 10<sup>8</sup> cells × 4 bytes (int) = 400 MB — too big; as <code>long</code> it is 800 MB. Options: (1) check whether only the previous row is needed (rolling arrays / two rows → 80 KB), very common in DP; (2) use a smaller type if values fit (<code>byte</code> or <code>short</code>, or a <code>BitSet</code> for booleans: 12.5 MB); (3) store only non-default cells sparsely (HashMap) if the table is mostly empty; (4) recompute instead of store. I would also double-check whether the intended complexity really needs N × M states at all — such a large table is often a hint that a smarter state definition exists.</p>`, followUps: ['How much memory does ArrayList&lt;Integer&gt; with 10<sup>7</sup> elements take?', 'Show the rolling-array trick for LCS.'] }
  );

  registerModule({
    id: 'dsa01',
    title: 'Programming Foundations for DSA',
    intro: `<p>Welcome to the very first DSA module! Before learning clever algorithms, you need a <b>reliable toolkit</b>: writing Java quickly and correctly, reading input fast, knowing exactly what a variable holds, and understanding where your data lives in memory. Most "my solution is right but it fails" stories — overflow, Scanner timeouts, aliasing bugs, stack overflows — come from gaps in exactly these foundations.</p>
<p>You will learn the small subset of Java that problem solving needs, the difference between <b>primitives</b> and <b>references</b>, how the <b>stack and heap</b> work, the everyday tools for <b>arrays and strings</b>, how to split a solution into clean <b>methods</b>, how to read <b>constraints</b> like a hint from the problem setter, and how to write your first <b>brute-force</b> solutions and improve them step by step.</p>
<p>Every topic starts with an everyday analogy, then shows a step-by-step visualizer, worked examples, a deep dive for the curious, and an "AI era" section on working alongside coding assistants without losing the skills interviewers test.</p>`,
    goals: [
      'Write a complete Java program or LeetCode-style method from memory, using loops, conditions, integer division and remainder correctly',
      'Read 10<sup>6</sup> numbers within time limits using BufferedReader + StringTokenizer and print large outputs with StringBuilder or PrintWriter',
      'Choose int vs long vs BigInteger from the constraints and spot overflow (including the <code>int * int</code> trap) before it happens',
      'Draw stack frames and heap objects for any snippet and predict the effect of aliasing, pass-by-value and re-assignment',
      'Use arrays, 2D grids, Strings, StringBuilder and counting arrays (<code>int[26]</code>) fluently and know the cost of each operation',
      'Turn constraints into a target complexity using the 10<sup>8</sup>-operations rule and the N → complexity table',
      'Write a correct brute-force solution, state its complexity, find the repeated work, and stress test a faster version against it'
    ],
    prereqs: `<p>None — this is the starting point of the DSA track. You only need a working Java 17+ (ideally 21) installation or an online editor, and the ability to run a "Hello, World" program. If you have never programmed before, spend an hour on the Java track's first module (JDK, JRE, JVM &amp; Java Basics) first.</p>`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
