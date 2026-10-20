(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ======================================================================
     TOPIC 1 — Core syntax for problem solving (Java, Python, JS, C++)
     ====================================================================== */
  topics.push({
    title: 'Core Language Syntax for Problem Solving',
    analogy: `<p>A program is like a <b>recipe card</b>. The file is the card, the entry point (<code>main</code> in Java and C++, the top of the file in Python and JavaScript) is the line that says <i>"start cooking here"</i>, and every statement is one step. Variables are labelled <b>bowls</b>. In Java and C++ each bowl has a fixed type (a soup bowl cannot hold a whole cake); in Python and JavaScript the label can move to any bowl, but the value inside still has a type, and loops are instructions like <i>"stir 10 times"</i> or <i>"keep stirring until it thickens"</i>.</p>`,
    explain: `<p>In interviews and online judges you only need a <b>small, sharp subset</b> of your language. Pick one of Java, Python, JavaScript or C++ and learn these pieces until you can type them without thinking. The ideas are the same in all four; the tables show where the details differ.</p>
<h4>1. The skeleton</h4>
${H.table(['Language', 'Runnable program (online judge)', 'LeetCode style'], [
  ['Java', 'a class with <code>public static void main(String[] args)</code>', 'a method inside <code>class Solution</code>'],
  ['Python', 'plain top-level code (optionally a <code>main()</code> function)', 'a method inside <code>class Solution</code>'],
  ['JavaScript', 'top-level code run by Node.js', 'one function, e.g. <code>function twoSum(nums, target)</code>'],
  ['C++', '<code>int main()</code> plus <code>#include</code> lines', 'a method inside <code>class Solution { public: ... };</code>']
])}
<p>On LeetCode-style platforms you never write the entry point or read input: the judge calls your method.</p>
<h4>2. Variables and the four types you use 95% of the time</h4>
<p>The table uses Java names. The same four ideas exist everywhere: Python has <code>int</code> (unlimited size), <code>bool</code> and <code>str</code> (no separate char); JavaScript has <code>number</code> (a double, exact up to 2<sup>53</sup>), <code>BigInt</code>, <code>boolean</code> and <code>string</code>; C++ has <code>int</code>, <code>long long</code>, <code>bool</code> and <code>char</code>.</p>
${H.table(['Type', 'Holds', 'Example', 'Use it for'], [
  ['<code>int</code>', 'whole numbers up to about ±2.1 billion', '<code>int n = 5;</code>', 'indexes, counts, most inputs'],
  ['<code>long</code>', 'whole numbers up to about ±9.2 × 10<sup>18</sup>', '<code>long sum = 0;</code>', 'sums, products, answers "mod 10<sup>9</sup>+7"'],
  ['<code>boolean</code>', '<code>true</code> / <code>false</code>', '<code>boolean found = false;</code>', 'flags, visited marks'],
  ['<code>char</code>', 'one character (really a small number)', '<code>char c = \'a\';</code>', 'string processing']
])}
<h4>3. Operators that trip beginners</h4>
${H.table(['Expression', 'Result', 'Why'], [
  ['<code>7 / 2</code>', H.c('r', '3'), 'int ÷ int throws away the fraction (Java, C++)'],
  ['<code>7 / 2.0</code>', H.c('g', '3.5'), 'one side is a double, so the maths is done in double'],
  ['<code>7 % 3</code>', '1', 'remainder after division'],
  ['<code>-7 % 3</code>', H.c('r', '-1'), 'Java, C++ and JavaScript keep the sign of the left number'],
  ['<code>Math.floorMod(-7, 3)</code>', H.c('g', '2'), 'the "maths class" remainder, always 0..2'],
  ['<code>x == y</code> vs <code>x = y</code>', 'compare vs assign', 'one equals sign changes x!']
])}
<p>Where the languages disagree (memorise this row by row):</p>
${H.table(['Expression', 'Java / C++', 'Python', 'JavaScript'], [
  ['<code>7 / 2</code>', '3', '3.5 (use <code>7 // 2</code> for 3)', '3.5 (use <code>Math.floor(7 / 2)</code>)'],
  ['<code>-7 / 2</code> as an integer', '-3 (towards zero)', H.c('r', '<code>-7 // 2</code> is -4 (rounds down)'), '<code>Math.trunc</code> gives -3, <code>Math.floor</code> gives -4'],
  ['<code>-7 % 3</code>', '-1', H.c('g', '2 (sign of the right number)'), '-1'],
  ['non-negative remainder', '<code>Math.floorMod(a, m)</code> / <code>((a % m) + m) % m</code>', '<code>a % m</code> already', '<code>((a % m) + m) % m</code>'],
  ['equality', '<code>==</code>', '<code>==</code> (<code>is</code> checks identity)', '<code>===</code> (<code>==</code> converts types)']
])}
<h4>4. Decisions and loops</h4>
<ul><li><code>if / else if / else</code> — choose a path.</li>
<li><code>for (int i = 0; i &lt; n; i++)</code> (Python: <code>for i in range(n)</code>) — when you know how many times (walk an array).</li>
<li><code>while (n &gt; 0)</code> — when you stop on a condition (peel digits off a number).</li>
<li>For-each: <code>for (int x : arr)</code> in Java and C++, <code>for x in arr</code> in Python, <code>for (const x of arr)</code> in JavaScript — read every element, no index needed.</li>
<li><code>break</code> leaves the loop, <code>continue</code> skips to the next round.</li></ul>
<h4>5. Digit peeling — the first "algorithm" every coder learns</h4>
<p><code>n % 10</code> gives the <b>last digit</b>; integer division by 10 <b>chops it off</b> (<code>n / 10</code> in Java and C++, <code>n // 10</code> in Python, <code>Math.floor(n / 10)</code> in JavaScript). Repeat until <code>n</code> is 0. A number with 10 digits needs only 10 rounds, so this is <b>O(number of digits) = O(log₁₀ N)</b>.</p>
${H.table(['n', 'n % 10 (digit)', 'sum', 'n / 10'], [['4096', '6', '6', '409'], ['409', '9', '15', '40'], ['40', '0', '15', '4'], ['4', '4', H.c('g', '19'), '0 → stop']])}`,
    clues: [
      '"digits of a number", "reverse the number", "sum of digits" → peel with <code>% 10</code> and <code>/ 10</code>',
      '"The first line contains T, the number of test cases" → wrap your logic in a loop that runs T times (<code>while (T-- &gt; 0)</code>, <code>for _ in range(T)</code>)',
      '"Return the result rounded down" → integer division already floors for non-negative numbers (in JavaScript, wrap it in <code>Math.floor</code>)',
      '"Answer can be negative" + remainder → use <code>Math.floorMod</code> (Java) or <code>((a % m) + m) % m</code> (C++, JavaScript); Python\'s <code>%</code> is already non-negative for m &gt; 0',
      '"Simulate the process step by step" → a plain <code>while</code> loop with a clear stop condition',
      '"N ≤ 10<sup>9</sup>" but you only loop over its digits → at most 10 iterations, always fast'
    ],
    code: [{ code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
# A complete Python script. No class or main() is required, but a main() keeps it tidy.
def main():
    n = 4096                         # Python ints grow as needed: no int/long split
    total = 0
    is_even = n % 2 == 0
    grade = "A" if n > 1000 else "B"   # conditional expression

    for i in range(1, 6):            # for loop over 1, 2, 3, 4, 5
        total += i

    digit_sum, m = 0, n
    while m > 0:                     # while loop: peel digits
        digit_sum += m % 10
        m //= 10                     # // is integer division; / would give a float

    match len(str(n)):               # match statement (Python 3.10+)
        case 1 | 2:
            size = "small"
        case 3 | 4:
            size = "medium"
        case _:
            size = "large"

    print(total, is_even, grade, digit_sum, size)   # 15 True A 19 medium

if __name__ == "__main__":
    main()`, run: true }, { lang: 'js', code: String.raw`
// A Node.js script: top-level code runs straight away.
function main() {
  const n = 4096;                  // every JS number is a double: integers are exact only up to 2^53
  let total = 0;
  const isEven = n % 2 === 0;      // === compares without type conversion
  const grade = n > 1000 ? 'A' : 'B';

  for (let i = 1; i <= 5; i++) total += i;

  let digitSum = 0, m = n;
  while (m > 0) {
    digitSum += m % 10;
    m = Math.floor(m / 10);        // 4096 / 10 is 409.6 in JS: floor it to drop the digit
  }

  let size;
  switch (String(n).length) {
    case 1: case 2: size = 'small'; break;     // break is required: JS switch falls through
    case 3: case 4: size = 'medium'; break;
    default: size = 'large';
  }

  console.log(total, isEven, grade, digitSum, size);  // 15 true A 19 medium
}

main();`, run: true }, { lang: 'cpp', code: String.raw`
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n = 4096;                   // a whole number (32 bits on every judge)
    long long total = 0;            // 64 bits for sums that may grow large
    bool isEven = n % 2 == 0;
    char grade = n > 1000 ? 'A' : 'B';

    for (int i = 1; i <= 5; i++) total += i;

    int digitSum = 0, m = n;
    while (m > 0) {
        digitSum += m % 10;         // last digit
        m /= 10;                    // int / int drops the fraction
    }

    string size;
    switch (to_string(n).size()) {
        case 1: case 2: size = "small"; break;   // break is required: C++ switch falls through
        case 3: case 4: size = "medium"; break;
        default: size = "large";
    }

    cout << total << ' ' << boolalpha << isEven << ' ' << grade << ' ' << digitSum << ' ' << size << '\n';
    // prints: 15 true A 19 medium
    return 0;
}` }] }, { code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
# LeetCode style: only the method inside class Solution.
class Solution:
    def sumOfDigits(self, n: int) -> int:
        n = abs(n)                  # safe: Python ints have no minimum value
        total = 0
        while n > 0:
            n, d = divmod(n, 10)    # quotient and last digit in one step
            total += d
        return total` }, { lang: 'js', code: String.raw`
// LeetCode style: you fill in one function.
function sumOfDigits(n) {
  n = Math.abs(n);                  // safe for any 32-bit input: doubles have room
  let sum = 0;
  while (n > 0) {
    sum += n % 10;
    n = Math.floor(n / 10);
  }
  return sum;
}` }, { lang: 'cpp', code: String.raw`
// LeetCode style: a method inside class Solution, no main().
class Solution {
public:
    int sumOfDigits(int n) {
        long long m = llabs((long long)n);   // abs(INT_MIN) overflows an int: widen first
        int sum = 0;
        while (m > 0) {
            sum += m % 10;
            m /= 10;
        }
        return sum;
    }
};` }] }],
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
        var PY = 'total = 0\nwhile n > 0:\n    d = n % 10\n    total += d\n    n //= 10\nreturn total',
            JS = 'let sum = 0;\nwhile (n > 0) {\n    const d = n % 10;\n    sum += d;\n    n = Math.floor(n / 10);\n}\nreturn sum;',
            CPP = 'int sum = 0;\nwhile (n > 0) {\n    int d = n % 10;\n    sum += d;\n    n /= 10;\n}\nreturn sum;';
        var ALT = { python: { code: PY, map: { 7: 6 } }, js: { code: JS }, cpp: { code: CPP } };
        var digits = function (x) { return String(x).split(''); };
        frames.push({ narr: 'Start with <b>n = ' + n + '</b> and an empty bucket <b>sum = 0</b>. We will peel the <b>last</b> digit each round.', parts: [
          { type: 'array', label: 'digits of n', values: digits(n) },
          { type: 'vars', vals: { n: n, d: '-', sum: 0 } },
          { type: 'code', lang: 'java', code: CODE, alt: ALT, hl: { 1: 'cur' } }
        ] });
        if (n === 0) {
          frames.push({ narr: 'n is already 0, so the loop condition <code>n &gt; 0</code> is false right away.', parts: [{ type: 'vars', vals: { n: 0, sum: 0 }, hl: { n: 'bad' } }, { type: 'code', lang: 'java', code: CODE, alt: ALT, hl: { 2: 'bad' } }] });
          frames.push({ narr: 'We never entered the loop, so the answer is <b>0</b>. Zero is the classic edge case for digit loops!', parts: [{ type: 'vars', vals: { n: 0, sum: 0 }, hl: { sum: 'sel' } }, { type: 'code', lang: 'java', code: CODE, alt: ALT, hl: { 7: 'ok' } }] });
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
            { type: 'code', lang: 'java', code: CODE, alt: ALT, hl: { 3: 'cur' } }
          ] });
          sum += d;
          frames.push({ narr: 'Add it: sum = ' + (sum - d) + ' + ' + d + ' = <b>' + sum + '</b>.', parts: [
            { type: 'array', label: 'digits of n', values: ds, hl: hl },
            { type: 'vars', vals: { n: n, d: d, sum: sum }, hl: { sum: 'ok' } },
            { type: 'code', lang: 'java', code: CODE, alt: ALT, hl: { 4: 'ok' } }
          ] });
          var old = n;
          n = Math.floor(n / 10);
          var dh = {}; dh[ds.length - 1] = 'bad';
          frames.push({ narr: '<code>n /= 10</code>: ' + old + ' / 10 = <b>' + n + '</b>. Integer division throws the fraction away, which <b>drops the last digit</b>.', parts: [
            { type: 'array', label: 'digit being removed', values: ds, hl: dh },
            { type: 'vars', vals: { n: n, d: d, sum: sum }, hl: { n: 'cur' } },
            { type: 'code', lang: 'java', code: CODE, alt: ALT, hl: { 5: 'cur' } }
          ] });
        }
        frames.push({ narr: 'n became 0, so <code>n &gt; 0</code> is false and the loop ends after <b>' + round + '</b> rounds (one per digit). Answer: <b>' + sum + '</b>.', parts: [
          { type: 'vars', vals: { n: 0, sum: sum, rounds: round }, hl: { sum: 'sel' } },
          { type: 'code', lang: 'java', code: CODE, alt: ALT, hl: { 7: 'ok' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Integer division and remainder surprises', html: `<p>Predict each line before reading the comments. Most bugs in "average" and "middle index" questions come from these rules.</p>
${H.table(['Code', 'Prints', 'Lesson'], [['<code>5 / 2</code>', '2', 'fraction dropped'], ['<code>-5 / 2</code>', '-2', 'Java and C++ round <b>towards zero</b>, not down'], ['<code>-5 % 2</code>', '-1', 'sign follows the left operand'], ['<code>(5 + 2 - 1) / 2</code>', '3', 'ceiling division for positives: (a + b - 1) / b']])}<p>Python is different on purpose: <code>-5 // 2</code> is <b>-3</b> (it rounds down) and <code>-5 % 2</code> is <b>1</b>. JavaScript's <code>/</code> never drops the fraction, so you choose <code>Math.trunc</code> or <code>Math.floor</code> yourself. Check each tab below.</p>`, code: { code: String.raw`
System.out.println(5 / 2);                 // 2
System.out.println(-5 / 2);                // -2 (towards zero)
System.out.println(-5 % 2);                // -1
System.out.println(Math.floorMod(-5, 2));  // 1
System.out.println((5 + 2 - 1) / 2);       // 3 = ceil(5 / 2)
System.out.println(5 / 2.0);               // 2.5`, alt: [{ lang: 'python', code: String.raw`
print(5 // 2)            # 2    // is floor division
print(-5 // 2)           # -3   Python rounds DOWN, not towards zero!
print(-5 % 2)            # 1    the remainder takes the sign of the divisor
print(int(-5 / 2))       # -2   truncate towards zero, like Java and C++
print((5 + 2 - 1) // 2)  # 3 = ceil(5 / 2)
print(5 / 2)             # 2.5  / is always true division`, run: true }, { lang: 'js', code: String.raw`
console.log(Math.trunc(5 / 2));    // 2   '/' never drops the fraction on its own
console.log(Math.trunc(-5 / 2));   // -2  towards zero, like Java
console.log(Math.floor(-5 / 2));   // -3  rounds down
console.log(-5 % 2);               // -1  sign follows the left operand, like Java
console.log(((-5 % 2) + 2) % 2);   // 1   the "maths" remainder
console.log(5 / 2);                // 2.5`, run: true }, { lang: 'cpp', code: String.raw`
cout << 5 / 2 << '\n';              // 2
cout << -5 / 2 << '\n';             // -2 (towards zero, guaranteed since C++11)
cout << -5 % 2 << '\n';             // -1
cout << ((-5 % 2) + 2) % 2 << '\n'; // 1  the "maths" remainder
cout << (5 + 2 - 1) / 2 << '\n';    // 3 = ceil(5 / 2)
cout << 5 / 2.0 << '\n';            // 2.5` }] } },
      { title: 'Picking the right loop', html: `<p><b>for</b> when you can count the rounds, <b>while</b> when a condition decides, <b>for-each</b> when you only read values. Counting down is common too (reverse traversal), and a step of 2 visits every second index.</p>`, code: { code: String.raw`
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
for (int v : a) if (v > 5) System.out.print(v + " ");                 // 8 9`, alt: [{ lang: 'python', code: String.raw`
a = [3, 8, 1, 9]
print(*[a[i] for i in range(len(a))])        # 3 8 1 9
print(*[a[i] for i in range(len(a) - 1, -1, -1)])   # 9 1 8 3 (or reversed(a))
print(*a[::2])                               # 3 1  (slice with step 2)
x, steps = 100, 0
while x > 1:                                 # how many halvings to reach 1?
    x //= 2
    steps += 1
print(steps)                                 # 6
print(*[v for v in a if v > 5])              # 8 9`, run: true }, { lang: 'js', code: String.raw`
const a = [3, 8, 1, 9];
const out = [];
for (let i = 0; i < a.length; i++) out.push(a[i]);
console.log(out.join(' '));                          // 3 8 1 9
const back = [];
for (let i = a.length - 1; i >= 0; i--) back.push(a[i]);
console.log(back.join(' '));                         // 9 1 8 3
const even = [];
for (let i = 0; i < a.length; i += 2) even.push(a[i]);
console.log(even.join(' '));                         // 3 1
let x = 100, steps = 0;
while (x > 1) { x = Math.floor(x / 2); steps++; }   // how many halvings to reach 1?
console.log(steps);                                  // 6
for (const v of a) if (v > 5) console.log(v);        // 8, 9 (for...of reads values)`, run: true }, { lang: 'cpp', code: String.raw`
vector<int> a = {3, 8, 1, 9};
for (size_t i = 0; i < a.size(); i++) cout << a[i] << ' ';        // 3 8 1 9
cout << '\n';
for (int i = (int)a.size() - 1; i >= 0; i--) cout << a[i] << ' ';   // 9 1 8 3 (int, not size_t!)
cout << '\n';
for (size_t i = 0; i < a.size(); i += 2) cout << a[i] << ' ';     // 3 1
cout << '\n';
int x = 100, steps = 0;
while (x > 1) { x /= 2; steps++; }
cout << steps << '\n';                                             // 6
for (int v : a) if (v > 5) cout << v << ' ';                       // 8 9` }] } },
      { title: 'String + number: left to right!', html: `<p>Java evaluates <code>+</code> from left to right. Once a String appears, everything after it becomes text glueing. This matters when you print answers like <code>"Case " + i + 1</code>. JavaScript behaves exactly the same. Python refuses to mix text and numbers (a <code>TypeError</code>), so you use f-strings. In C++, <code>"Case #" + i</code> even compiles but moves a pointer — stream the parts with <code>&lt;&lt;</code> or use <code>to_string</code>.</p>
${H.table(['Expression', 'Result'], [['<code>1 + 2 + "x"</code>', '"3x"'], ['<code>"x" + 1 + 2</code>', H.c('r', '"x12"')], ['<code>"x" + (1 + 2)</code>', H.c('g', '"x3"')], ['<code>\'a\' + 1</code>', '98 (char is a number)']])}`, code: { code: String.raw`
int i = 4;
System.out.println("Case #" + i + 1);    // Case #41  (bug!)
System.out.println("Case #" + (i + 1));  // Case #5   (fixed)
System.out.println('a' + 1);             // 98
System.out.println((char) ('a' + 1));    // b`, alt: [{ lang: 'python', code: String.raw`
i = 4
# print("Case #" + i + 1)      # TypeError: Python refuses to glue str and int
print("Case #" + str(i + 1))   # Case #5
print(f"Case #{i + 1}")        # Case #5  (f-string: the usual way)
print(ord("a") + 1)            # 98  (a str is not a number; ord gives its code)
print(chr(ord("a") + 1))       # b`, run: true }, { lang: 'js', code: String.raw`
const i = 4;
console.log('Case #' + i + 1);      // Case #41  (same left-to-right bug as Java)
console.log('Case #' + (i + 1));    // Case #5   (fixed)
console.log('a' + 1);               // a1  (JS has no char type: this is string glue)
console.log('a'.charCodeAt(0) + 1); // 98
console.log(String.fromCharCode('a'.charCodeAt(0) + 1));  // b`, run: true }, { lang: 'cpp', code: String.raw`
int i = 4;
// "Case #" + i + 1 compiles but moves a char POINTER 5 places: it prints "#". Nasty!
cout << "Case #" << i + 1 << '\n';              // Case #5  (stream the parts)
string s = "Case #" + to_string(i + 1);          // Case #5  (build a std::string)
cout << s << '\n';
cout << 'a' + 1 << '\n';                         // 98 (char is promoted to int)
cout << char('a' + 1) << '\n';                   // b` }] } },
      { title: 'Labelled break: escaping two loops at once', html: `<p>When searching a grid, you often want to stop <b>both</b> loops as soon as you find the target. A label on the outer loop lets one <code>break</code> jump out of everything — cleaner than a flag variable. Java and JavaScript have labels; in Python and C++, put the loops in a function (or lambda) and <code>return</code>.</p>`, code: { code: String.raw`
int[][] grid = {{1, 2}, {3, 4}};
int target = 3, fr = -1, fc = -1;
search:
for (int r = 0; r < grid.length; r++) {
    for (int c = 0; c < grid[r].length; c++) {
        if (grid[r][c] == target) { fr = r; fc = c; break search; }
    }
}
System.out.println(fr + "," + fc);   // 1,0`, alt: [{ lang: 'python', code: String.raw`
# Python has no labelled break. Put the search in a function and return from it.
def find(grid, target):
    for r, row in enumerate(grid):
        for c, v in enumerate(row):
            if v == target:
                return r, c          # leaves both loops at once
    return -1, -1

print(*find([[1, 2], [3, 4]], 3), sep=",")   # 1,0`, run: true }, { lang: 'js', code: String.raw`
// JavaScript has labelled break, exactly like Java.
const grid = [[1, 2], [3, 4]];
const target = 3;
let fr = -1, fc = -1;
search:
for (let r = 0; r < grid.length; r++) {
  for (let c = 0; c < grid[r].length; c++) {
    if (grid[r][c] === target) { fr = r; fc = c; break search; }
  }
}
console.log(fr + ',' + fc);   // 1,0`, run: true }, { lang: 'cpp', code: String.raw`
// C++ has no labelled break. A lambda that returns leaves both loops cleanly.
vector<vector<int>> grid = {{1, 2}, {3, 4}};
int target = 3;
auto find = [&]() -> pair<int, int> {
    for (int r = 0; r < (int)grid.size(); r++)
        for (int c = 0; c < (int)grid[r].size(); c++)
            if (grid[r][c] == target) return {r, c};
    return {-1, -1};
};
auto [fr, fc] = find();             // structured binding (C++17)
cout << fr << "," << fc << '\n';    // 1,0` }] } }
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
<p>Performance note: the JVM starts by interpreting your code and compiles hot loops to machine code (JIT) after a few thousand iterations. That is why tiny benchmarks lie, and why judges usually allow Java a little more time than C++.</p>
<h4>The same traps in Python, JavaScript and C++</h4>
<ul><li><b>Python:</b> <code>/</code> always returns a float, <code>//</code> floors (rounds down, even for negatives) and <code>%</code> takes the sign of the divisor. Booleans are <code>and</code>/<code>or</code>/<code>not</code>, and they short-circuit too. There is no <code>i++</code>; write <code>i += 1</code>.</li>
<li><b>JavaScript:</b> every number is a double, so <code>7 / 2</code> is 3.5 and integers are exact only up to 2<sup>53</sup>. Use <code>===</code>, never <code>==</code> (which converts types: <code>"5" == 5</code> is true). <code>%</code> keeps the dividend's sign, like Java.</li>
<li><b>C++:</b> the same integer rules as Java (truncate toward zero since C++11), but <b>signed overflow is undefined behaviour</b>, out-of-range <code>a[i]</code> is not checked, and an uninitialised local variable holds garbage. Turn on warnings (<code>-Wall</code>) and use <code>-fsanitize=address,undefined</code> while practising.</li></ul>`,
    aiEra: `<p><b>What AI changes:</b> editors like Copilot, Cursor or Claude Code type the skeleton, imports and loops for you in a blink. Syntax is no longer the bottleneck at work.</p>
<p><b>Why you still drill it:</b> many interview rounds use a plain shared editor (CoderPad, HackerRank) with autocomplete switched off, and the interviewer watches you type. Fumbling <code>for</code> loops or <code>-5 % 2</code> costs you minutes and confidence.</p>
<p><b>Use AI as a coach, not a crutch:</b> ask <code>Give me 10 output-prediction puzzles in my language (Java, Python, JavaScript or C++) about integer division, negative remainders, char arithmetic and string concatenation. Don't show answers until I reply.</code> Then explain each answer back in your own words.</p>
<p><b>Where AI goes wrong:</b> it sometimes mixes habits between languages (<code>len(a)</code> in Java, <code>a.length()</code> on Java arrays instead of <code>a.length</code>, <code>/</code> instead of <code>//</code> in Python, a missing <code>Math.floor</code> in JavaScript), assumes <code>%</code> is always non-negative, or uses a floating-point power (<code>Math.pow</code>, C++ <code>pow</code>) for integer powers. Always read generated code line by line before trusting it.</p>`,
    problems: [{
      title: 'Add Digits Until One Digit Remains',
      level: 'Easy', tags: ['math', 'loops', 'digits'], companies: ['Adobe', 'Microsoft', 'Amazon'],
      statement: `<p>Given a non-negative integer <code>num</code>, repeatedly add all its digits until the result has only one digit, and return it.</p>`,
      constraints: `0 ≤ num ≤ 2<sup>31</sup> − 1`,
      example: `<p>Input: <code>num = 38</code> → Output: ${H.c('g', '2')}</p><p>Why: ${H.c('b', '3 + 8 = 11')}, then ${H.c('b', '1 + 1 = 2')}. 2 has a single digit, so we stop.</p>`,
      brute: { why: `<p>Simulate exactly what the statement says: peel digits to get a sum, and repeat while the number is ≥ 10. Each pass takes O(digits) and the number shrinks very fast (at most 10 digits → sum ≤ 90 → ≤ 18 → one digit), so this is already fast. It is the "obvious" answer you should write first.</p>`, code: { lang: 'java', code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
def add_digits(num):
    while num >= 10:             # more than one digit?
        total = 0
        while num > 0:           # peel every digit
            total += num % 10
            num //= 10
        num = total              # repeat with the digit sum
    return num` }, { lang: 'js', code: String.raw`
function addDigits(num) {
  while (num >= 10) {            // more than one digit?
    let sum = 0;
    while (num > 0) {            // peel every digit
      sum += num % 10;
      num = Math.floor(num / 10);
    }
    num = sum;                   // repeat with the digit sum
  }
  return num;
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    int addDigits(int num) {
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
};` }] } },
      mcq: { q: 'Adding the digits of a number never changes its remainder when divided by…', options: ['9', '10', '2', '7'], answer: 0, explain: 'Because 10 ≡ 1 (mod 9), every power of 10 is ≡ 1, so a number and its digit sum leave the same remainder mod 9. That gives the O(1) "digital root" formula.' },
      hints: [`<p>Hint 1: Write the simulation first — inner loop sums digits, outer loop repeats while the number has 2+ digits.</p>`, `<p>Hint 2: Try a few inputs: 38 → 2, 18 → 9, 27 → 9, 10 → 1. Compare each answer with <code>num % 9</code>. Do you see the pattern?</p>`, `<p>Hint 3: Edge cases: 0 stays 0; multiples of 9 give 9, not 0. Recipe: if num == 0 return 0, else return 1 + (num − 1) % 9.</p>`],
      tests: { sig: 'int -> int', fn: 'addDigits', cases: [
        [[38], 2], [[0], 0], [[1], 1], [[9], 9], [[10], 1], [[18], 9], [[19], 1], [[99], 9], [[2147483647], 1]
      ] },
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

print(add_digits(38), add_digits(0), add_digits(99))  # 2 0 9`, run: true }, { lang: 'js', code: String.raw`
function addDigits(num) {
  if (num === 0) return 0;          // the only number whose digital root is 0
  return 1 + (num - 1) % 9;         // multiples of 9 map to 9, others to num % 9
}

console.log(addDigits(38), addDigits(0), addDigits(99));  // 2 0 9`, run: true }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    int addDigits(int num) {
        if (num == 0) return 0;      // the only number whose digital root is 0
        return 1 + (num - 1) % 9;    // multiples of 9 map to 9, others to num % 9
    }
};` }],
        dry: { head: ['num', 'digits summed', 'new num', 'one digit?'], rows: [['38', '3 + 8', '11', 'no'], ['11', '1 + 1', '2', H.c('g', 'yes → return 2')], ['formula', '1 + (38 − 1) % 9', '1 + 1 = 2', H.c('g', 'same answer')]] },
        complexity: `<p>Simulation: O(log N) total (each pass is O(digits), passes shrink instantly). Formula: O(1) time and space.</p>`,
        followUps: ['What if the number is given as a String with 10<sup>5</sup> digits? (Sum the chars once, then apply the formula.)', 'Return how many rounds of adding were needed.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Fast input / output in every language
     ====================================================================== */
  topics.push({
    title: 'Fast Input/Output: Slow vs Buffered Reading',
    analogy: `<p>Imagine fetching 1,000,000 grocery items. A <b>slow reader</b> (Java's <code>Scanner</code>, Python's <code>input()</code> called a million times, C++ <code>cin</code> still synced with C's stdio) is a polite shop assistant who walks to the warehouse for <b>one item at a time</b> and carefully checks every label. A <b>buffered reader</b> (Java's <code>BufferedReader</code>, Python's <code>sys.stdin.buffer.read()</code>, Node's <code>fs.readFileSync(0)</code>, C++ <code>cin</code> after <code>ios::sync_with_stdio(false)</code>) grabs a <b>whole trolley</b> per trip and lets you cut it into pieces yourself. Printing works the same way: printing a million separate lines is like posting a million separate letters; collecting the text and writing it once puts everything in one parcel.</p>`,
    explain: `<p>On LeetCode you never read input — the judge calls your method. But <b>online assessments</b> (HackerRank, Codility, CodeChef/Codeforces-style rounds used by many companies) give you raw text on <b>standard input</b>. With 10<sup>6</sup> numbers, slow reading alone can cause <b>Time Limit Exceeded</b> even when your algorithm is perfect.</p>
<h4>Slow and fast, language by language</h4>
${H.table(['Language', 'Slow (avoid for big input)', 'Fast reading', 'Fast writing'], [
  ['Java', '<code>Scanner</code>', '<code>BufferedReader</code> + <code>StringTokenizer</code>', '<code>StringBuilder</code> or <code>PrintWriter</code> + <code>flush()</code>'],
  ['Python', '<code>input()</code> per line', '<code>sys.stdin.buffer.read().split()</code> once, or <code>sys.stdin.readline</code>', 'collect strings, <code>sys.stdout.write("\\n".join(out))</code>'],
  ['JavaScript (Node)', '<code>readline</code> events for huge input', '<code>require("fs").readFileSync(0, "utf8")</code>, then split', 'build an array, <code>process.stdout.write(out.join("\\n"))</code>'],
  ['C++', '<code>cin</code> with default sync, <code>endl</code>', '<code>ios::sync_with_stdio(false); cin.tie(nullptr);</code> then <code>cin &gt;&gt;</code>', '<code>\'\\n\'</code> instead of <code>endl</code>; one big string']
])}
<h4>The three ways to read in Java (the same ladder exists everywhere)</h4>
${H.table(['Tool', 'How it works', 'Speed for 10<sup>6</sup> ints', 'Use when'], [
  ['<code>Scanner</code>', 'regex-based parsing of each token', H.c('r', 'slow (often 0.5–1 s+)'), 'tiny inputs, quick experiments'],
  ['<code>BufferedReader</code> + <code>StringTokenizer</code>', 'reads big chunks, splits on spaces', H.c('g', 'fast (~0.1–0.2 s)'), 'default choice for judges'],
  ['<code>DataInputStream</code> custom reader', 'reads raw bytes, builds numbers by hand', H.c('g', 'fastest'), 'huge inputs (10<sup>7</sup> numbers)']
])}
<p><small>Times are rough, machine-dependent ballparks — the <b>ratio</b> is what matters.</small></p>
<h4>The two ways to write (Java)</h4>
<ul><li>Collect output in a <code>StringBuilder</code> and print once at the end, <b>or</b></li>
<li>Wrap output in <code>PrintWriter out = new PrintWriter(new BufferedWriter(new OutputStreamWriter(System.out)));</code> and call <code>out.flush()</code> at the end. <b>Forgetting flush = empty output = Wrong Answer.</b></li></ul>
<h4>How a tokenizer reads "3 \\n 10 20 \\n 30"</h4>
<p>BufferedReader hands you <b>whole lines</b>. StringTokenizer cuts a line into <b>tokens</b> (pieces between spaces). When the current line runs out of tokens, read the next line. <code>Integer.parseInt</code> turns the text <code>"20"</code> into the number 20. Python and Node usually skip the line step: read everything, <code>split()</code> into one list of tokens, and walk an index. C++ <code>cin &gt;&gt; x</code> does the tokenising for you.</p>
${H.table(['Call', 'Current line', 'Token returned', 'Value'], [['nextInt()', '"3"', '"3"', '3'], ['nextInt()', '"10 20"', '"10"', '10'], ['nextInt()', '"10 20"', '"20"', '20'], ['nextInt()', '"30"', '"30"', '30']])}
<h4>Common input shapes</h4>
<ul><li><b>T test cases</b>: read T, loop T times, reset per-test state inside the loop.</li>
<li><b>N then N numbers</b>: read N, allocate an array of size N (or slice N tokens), fill it.</li>
<li><b>Grid of characters</b>: read each row as a string (<code>readLine().toCharArray()</code>, <code>list(row)</code>, <code>row.split("")</code>, <code>cin &gt;&gt; row</code>).</li>
<li><b>Unknown length / until EOF</b>: Java loops while <code>readLine()</code> is not <code>null</code>; Python iterates <code>for line in sys.stdin</code>; C++ loops <code>while (cin &gt;&gt; x)</code> or <code>while (getline(cin, line))</code>; Node splits the whole input into lines.</li></ul>`,
    clues: [
      '"The first line contains an integer T — the number of test cases" → fast reader + loop, reset state each test',
      '"N ≤ 10<sup>6</sup>" or "sum of N over all tests ≤ 2·10<sup>5</sup>" in an OA → the fast reader of your language (BufferedReader, <code>sys.stdin.buffer</code>, <code>fs.readFileSync(0)</code>, unsynced <code>cin</code>)',
      '"Print each answer on a new line" with Q up to 10<sup>5</sup> queries → collect the output and write it once, never one print call per answer',
      '"Read until end of file" → <code>while ((line = br.readLine()) != null)</code>, <code>for line in sys.stdin</code>, <code>while (cin &gt;&gt; x)</code>',
      '"Time limit: 1 second" on HackerRank/Codeforces in Java or Python → I/O speed matters (Python is hit hardest)',
      'LeetCode-style "implement the function" → no I/O at all; do not add any input reading'
    ],
    code: [{ code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
# Fast input in Python: read ALL bytes once, split on whitespace, walk an iterator.
import sys

def main():
    tokens = iter(sys.stdin.buffer.read().split())   # one system call, no per-line overhead
    next_int = lambda: int(next(tokens))
    t = next_int()                                   # number of test cases
    out = []
    for _ in range(t):
        n = next_int()
        total = sum(next_int() for _ in range(n))    # fresh state for EVERY test case
        out.append(str(total))
    sys.stdout.write("\n".join(out) + "\n")          # one big write instead of many print()s

main()` }, { lang: 'js', code: String.raw`
// Fast input in Node.js: read all of stdin (file descriptor 0) once, split on whitespace.
const data = require('fs').readFileSync(0, 'utf8');
const tokens = data.split(/\s+/).filter(Boolean);
let pos = 0;
const nextInt = () => Number(tokens[pos++]);

const t = nextInt();                     // number of test cases
const out = [];
for (let tc = 0; tc < t; tc++) {
  const n = nextInt();
  let sum = 0;                           // fresh state for EVERY test case
  for (let i = 0; i < n; i++) sum += nextInt();
  out.push(sum);
}
process.stdout.write(out.join('\n') + '\n');   // one big write` }, { lang: 'cpp', code: String.raw`
#include <bits/stdc++.h>
using namespace std;

int main() {
    // The two lines every C++ competitive programmer types first:
    ios::sync_with_stdio(false);   // stop syncing with C stdio (printf/scanf): cin/cout get fast buffers
    cin.tie(nullptr);              // do not flush cout before every cin read
    int t;
    cin >> t;                      // number of test cases
    while (t--) {
        int n;
        cin >> n;
        long long sum = 0;         // fresh state for EVERY test case
        for (int i = 0; i < n; i++) { long long x; cin >> x; sum += x; }
        cout << sum << '\n';       // '\n', not endl: endl forces a flush every line
    }
    return 0;                      // cout is flushed automatically at exit
}` }] }, { code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
# For 10^7 numbers, avoid creating a Python int per token one by one in a loop.
# Read raw bytes and let C-level code do the parsing in bulk.
import sys

def read_ints():
    return list(map(int, sys.stdin.buffer.read().split()))   # map(int, ...) runs in C

# With NumPy available (many judges have it), this is faster still:
#   import numpy as np
#   arr = np.array(sys.stdin.buffer.read().split(), dtype=np.int64)` }, { lang: 'js', code: String.raw`
// Byte-level reader: parse numbers straight from the Buffer, no string splitting.
const buf = require('fs').readFileSync(0);   // a Buffer of raw bytes
let ptr = 0;

function nextInt() {
  while (ptr < buf.length && buf[ptr] !== 45 && (buf[ptr] < 48 || buf[ptr] > 57)) ptr++;   // skip to '-' or a digit
  let neg = false;
  if (buf[ptr] === 45) { neg = true; ptr++; }   // 45 is '-'
  let x = 0;
  while (ptr < buf.length && buf[ptr] >= 48 && buf[ptr] <= 57) x = x * 10 + (buf[ptr++] - 48);
  return neg ? -x : x;
}` }, { lang: 'cpp', code: String.raw`
// Byte-level reader: fread a big chunk and parse digits by hand (handles negative numbers).
static char buf[1 << 16];
static size_t len = 0, ptr = 0;

static inline int readByte() {
    if (ptr == len) { len = fread(buf, 1, sizeof buf, stdin); ptr = 0; if (len == 0) return -1; }
    return buf[ptr++];
}

static int nextInt() {
    int c = readByte();
    while (c != '-' && (c < '0' || c > '9')) c = readByte();   // skip spaces/newlines
    bool neg = c == '-';
    if (neg) c = readByte();
    int x = 0;
    while (c >= '0' && c <= '9') { x = x * 10 + (c - '0'); c = readByte(); }
    return neg ? -x : x;
}` }] }],
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
      { title: 'The Scanner nextInt() + nextLine() trap', html: `<p>Input is <code>"3\\nhello world"</code>. After <code>nextInt()</code> reads 3, the newline is <b>still waiting</b>. The next <code>nextLine()</code> returns that empty leftover, not "hello world". Fix: call an extra <code>nextLine()</code> to eat the newline, or read every line with BufferedReader and parse it yourself. C++ has the very same trap (<code>cin &gt;&gt; n</code> then <code>getline</code>); Python and Node read whole lines or the whole input, so the leftover newline does not bite there.</p>`, code: { code: String.raw`
Scanner sc = new Scanner("3\nhello world");
int n = sc.nextInt();          // 3
String rest = sc.nextLine();   // "" (leftover end of line 1!)
String text = sc.nextLine();   // "hello world"
System.out.println(n + " [" + rest + "] [" + text + "]");`, alt: [{ lang: 'python', code: String.raw`
# Python reads whole lines, so this trap does not exist in the same form:
# readline() consumes the newline together with the number.
import io

src = io.StringIO("3\nhello world\n")   # stands in for sys.stdin
n = int(src.readline())                 # "3\n" -> 3 (int() ignores the newline)
text = src.readline().rstrip("\n")      # "hello world"
print(n, "[" + text + "]")              # 3 [hello world]
# The Python trap is speed instead: input() per line is slow for 10^5+ lines.
# Use sys.stdin.readline (or read everything at once) in assessments.`, run: true }, { lang: 'js', code: String.raw`
// In Node you usually read everything and split into lines, so there is no leftover newline.
const input = '3\nhello world';
const lines = input.split('\n');
const n = Number(lines[0]);
const text = lines[1];
console.log(n + ' [' + text + ']');   // 3 [hello world]`, run: true }, { lang: 'cpp', code: String.raw`
// C++ has EXACTLY the same trap: cin >> n leaves the '\n' behind for getline.
istringstream in("3\nhello world");      // stands in for cin
int n;
in >> n;                                 // 3
string rest, text;
getline(in, rest);                       // "" (leftover end of line 1!)
getline(in, text);                       // "hello world"
cout << n << " [" << rest << "] [" << text << "]\n";
// Fix: in >> ws (skip whitespace) or in.ignore(numeric_limits<streamsize>::max(), '\n') before getline.` }] } },
      { title: 'Reading a character grid', html: `<p>Input: first line <code>R C</code>, then R rows like <code>#..#</code>. Read sizes with a tokenizer, then each row as a string. Java converts it to <code>char[]</code>; Python and C++ strings already give O(1) access by <code>grid[r][c]</code> (use a list of lists in Python if you must edit cells).</p>`, code: { code: String.raw`
BufferedReader br = new BufferedReader(new StringReader("2 4\n#..#\n.##."));
StringTokenizer st = new StringTokenizer(br.readLine());
int rows = Integer.parseInt(st.nextToken()), cols = Integer.parseInt(st.nextToken());
char[][] grid = new char[rows][];
for (int r = 0; r < rows; r++) grid[r] = br.readLine().trim().toCharArray();
int hashes = 0;
for (char[] row : grid) for (char ch : row) if (ch == '#') hashes++;
System.out.println(rows + "x" + cols + " grid has " + hashes + " walls");   // 2x4 grid has 4 walls`, alt: [{ lang: 'python', code: String.raw`
import io

src = io.StringIO("2 4\n#..#\n.##.\n")          # stands in for sys.stdin
rows, cols = map(int, src.readline().split())
grid = [src.readline().strip() for _ in range(rows)]   # a str gives O(1) grid[r][c] reads
hashes = sum(row.count("#") for row in grid)
print(f"{rows}x{cols} grid has {hashes} walls")  # 2x4 grid has 4 walls
# Need to edit cells? Use a list of lists: [list(row) for row in grid]`, run: true }, { lang: 'js', code: String.raw`
const lines = '2 4\n#..#\n.##.'.split('\n');
const [rows, cols] = lines[0].split(' ').map(Number);
const grid = lines.slice(1, 1 + rows).map((l) => l.trim().split(''));   // char arrays you can edit
let hashes = 0;
for (const row of grid) for (const ch of row) if (ch === '#') hashes++;
console.log(rows + 'x' + cols + ' grid has ' + hashes + ' walls');   // 2x4 grid has 4 walls`, run: true }, { lang: 'cpp', code: String.raw`
istringstream in("2 4\n#..#\n.##.");     // stands in for cin
int rows, cols;
in >> rows >> cols;
vector<string> grid(rows);
for (auto& row : grid) in >> row;        // >> skips whitespace and reads one row
int hashes = 0;
for (const string& row : grid) hashes += count(row.begin(), row.end(), '#');
cout << rows << "x" << cols << " grid has " << hashes << " walls\n";   // 2x4 grid has 4 walls` }] } },
      { title: 'Reading until end of input', html: `<p>Some problems never tell you how many lines come. <code>readLine()</code> returns <code>null</code> at end of input — use it as the loop guard (Python: the <code>for line in ...</code> loop simply ends; C++: <code>getline</code> returns false). Skip blank lines defensively, because judges sometimes add a trailing newline.</p>`, code: { code: String.raw`
BufferedReader br = new BufferedReader(new StringReader("5 7\n1 2\n\n10 20\n"));
StringBuilder sb = new StringBuilder();
String line;
while ((line = br.readLine()) != null) {
    line = line.trim();
    if (line.isEmpty()) continue;                 // ignore blank lines
    String[] p = line.split(" ");
    sb.append(Long.parseLong(p[0]) + Long.parseLong(p[1])).append('\n');
}
System.out.print(sb);                             // 12, 3, 30 on separate lines`, alt: [{ lang: 'python', code: String.raw`
import io

src = io.StringIO("5 7\n1 2\n\n10 20\n")    # stands in for sys.stdin
out = []
for line in src:                            # iterating a file stops at end of input
    parts = line.split()
    if not parts:
        continue                            # ignore blank lines
    a, b = map(int, parts)
    out.append(str(a + b))
print("\n".join(out))                       # 12, 3, 30 on separate lines`, run: true }, { lang: 'js', code: String.raw`
const input = '5 7\n1 2\n\n10 20\n';
const out = [];
for (const raw of input.split('\n')) {
  const line = raw.trim();
  if (!line) continue;                      // ignore blank lines (and the final empty one)
  const [a, b] = line.split(/\s+/).map(Number);
  out.push(a + b);
}
console.log(out.join('\n'));                // 12, 3, 30 on separate lines`, run: true }, { lang: 'cpp', code: String.raw`
istringstream in("5 7\n1 2\n\n10 20\n");    // stands in for cin
string out, line;
while (getline(in, line)) {                 // false at end of input
    istringstream ls(line);
    long long a, b;
    if (!(ls >> a >> b)) continue;          // blank line: nothing to read
    out += to_string(a + b) + '\n';
}
cout << out;                                // 12, 3, 30 on separate lines
// With plain tokens, "while (cin >> a >> b)" also stops at end of input.` }] } },
      { title: 'Output: one parcel instead of a million letters', html: `<p>Printing 10<sup>5</sup> answers one call at a time (<code>System.out.println</code>, <code>print()</code>, <code>console.log</code>, <code>cout &lt;&lt; endl</code>) may flush to the operating system many times. Collecting the text (a <code>StringBuilder</code>, a list joined once, a <code>std::string</code>) and printing once makes output practically free.</p>
${H.table(['Way', 'Flushes for 10<sup>5</sup> lines', 'Verdict'], [['println in loop', 'up to 10<sup>5</sup>', H.c('r', 'risky')], ['StringBuilder + one print', '1', H.c('g', 'fast')], ['PrintWriter + flush()', 'a few (buffer fills)', H.c('g', 'fast')]])}`, code: { code: String.raw`
StringBuilder sb = new StringBuilder();
for (int q = 1; q <= 5; q++) sb.append(q * q).append('\n');
System.out.print(sb);   // 1 4 9 16 25, each on its own line`, alt: [{ lang: 'python', code: String.raw`
import sys

out = [str(q * q) for q in range(1, 6)]
sys.stdout.write("\n".join(out) + "\n")    # 1 4 9 16 25, each on its own line`, run: true }, { lang: 'js', code: String.raw`
const out = [];
for (let q = 1; q <= 5; q++) out.push(q * q);
process.stdout.write(out.join('\n') + '\n');   // one write; console.log per line is much slower`, run: true }, { lang: 'cpp', code: String.raw`
string out;
for (int q = 1; q <= 5; q++) out += to_string(q * q) + '\n';
cout << out;   // one write; also never use endl in a loop (it flushes every time)` }] } }
    ],
    deepDive: `<h4>Why Java's Scanner is slow</h4>
<p><code>Scanner</code> wraps the input in a small (1024-char) buffer and uses <code>java.util.regex</code> to find each token and to validate it as an integer (it even supports locale-specific digit grouping). Every <code>nextInt()</code> therefore runs pattern matching, plus extra checks. <code>StringTokenizer</code> just scans for delimiter characters; <code>Integer.parseInt</code> is a tight digit loop.</p>
<h4>StringTokenizer vs String.split</h4>
<p><code>String.split(" ")</code> has a fast path for one-character, non-regex delimiters, so it is decent, but it allocates a whole <code>String[]</code> for each line. <code>split("\\s+")</code> is a real regex and slower. StringTokenizer is "legacy" in the docs but remains the competitive programmer's favourite for speed and simplicity.</p>
<h4>Output buffering details</h4>
<p><code>System.out</code> is a <code>PrintStream</code>. Writing through it many times can cause many small system calls. A <code>PrintWriter</code> over a <code>BufferedWriter</code> batches writes in memory and only talks to the OS when its buffer (8 KB default) fills, or on <code>flush()</code>/<code>close()</code>. If your program exits without flushing a PrintWriter, the buffered text is <b>lost</b>.</p>
<h4>Character decoding</h4>
<p><code>InputStreamReader</code> decodes bytes to UTF-16 chars, which costs time. The byte-level reader skips decoding entirely because judge input is plain ASCII digits. That is why it wins on 10<sup>7</sup>-number inputs.</p>
<h4>Production reality</h4>
<p>Real services do not parse stdin; they parse JSON/protobuf from the network with libraries like Jackson. But the same lesson applies: <b>batch I/O, avoid per-item system calls, stream large files instead of loading them</b> (<code>Files.lines</code>, buffered streams).</p>
<h4>Under the hood in Python, JavaScript and C++</h4>
<ul><li><b>Python:</b> each <code>input()</code> call does extra work (prompt handling, decoding, building a new str). <code>sys.stdin.buffer.read()</code> grabs all bytes in one system call, and <code>split()</code> plus <code>map(int, ...)</code> run in C. For 10<sup>6</sup> numbers this is often the difference between 2 s and 0.3 s. Print once with <code>"\\n".join</code>, because each <code>print()</code> has its own overhead.</li>
<li><b>JavaScript (Node):</b> <code>fs.readFileSync(0, "utf8")</code> reads the whole of stdin (file descriptor 0) at once. Splitting with a regex is fine; for 10<sup>7</sup> numbers, parse the raw Buffer byte by byte. <code>console.log</code> per line is slow; join first and write once.</li>
<li><b>C++:</b> by default <code>cin</code>/<code>cout</code> stay synchronised with C's <code>scanf</code>/<code>printf</code>, which disables their own buffering. <code>ios::sync_with_stdio(false)</code> turns that off (after it, do not mix <code>cin</code> with <code>scanf</code>), and <code>cin.tie(nullptr)</code> stops <code>cout</code> being flushed before every read. <code>endl</code> means "newline + flush", so use <code>'\\n'</code>.</li></ul>`,
    aiEra: `<p><b>What AI changes:</b> an assistant will happily generate a FastReader template, and many candidates now paste one from memory or a snippet manager. That is fine — the template is boilerplate.</p>
<p><b>What you must own:</b> recognising <i>when</i> I/O is the bottleneck (a correct O(N) solution that times out on a 10<sup>6</sup>-line input is a red flag), remembering to <code>flush()</code>, and resetting per-test-case state. AI-generated solutions commonly use <code>Scanner</code> or <code>input()</code> by default, forget <code>ios::sync_with_stdio(false)</code>, or mix <code>nextInt()</code> with <code>nextLine()</code> (or <code>cin &gt;&gt;</code> with <code>getline</code>), producing the classic empty-line bug.</p>
<p><b>Good prompt:</b> <code>Here is my solution (Java / Python / JavaScript / C++) that gets TLE on a 10^6-number input. Without changing the algorithm, point out any I/O bottlenecks.</code></p>
<p><b>Proctoring note:</b> many 2026 online assessments are proctored and disallow AI tools; keep your own template ready and practise typing it once so it feels automatic.</p>`,
    problems: [{
      title: 'Sum of a Huge Input',
      level: 'Easy', tags: ['fast io', 'long', 'online assessment'], companies: ['HackerRank OA', 'CodeChef', 'Goldman Sachs'],
      statement: `<p>The first line contains <code>N</code>. The second line contains <code>N</code> integers. Print their sum. The time limit is 1 second.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>6</sup>, −10<sup>9</sup> ≤ a<sub>i</sub> ≤ 10<sup>9</sup>`,
      example: `<p>Input:<br><code>4</code><br><code>1000000000 1000000000 1000000000 -7</code></p><p>Output: ${H.c('g', '2999999993')}</p><p>Why: the true sum is about 3·10<sup>9</sup>, which does ${H.c('r', 'not fit in int')} (max ≈ 2.1·10<sup>9</sup>). A <code>long</code> accumulator is required.</p>`,
      brute: { why: `<p>Slow token-by-token reading (Java <code>Scanner</code>, Python <code>input()</code>, C++ <code>cin</code> with default sync, Node <code>readline</code> events) plus a 32-bit <code>int</code> sum looks fine and passes tiny tests, but has <b>two</b> problems: (1) that style of reading handles 10<sup>6</sup> tokens slowly — risky for a 1 s limit; (2) in Java and C++ the <code>int</code> sum overflows and prints a wrong (often negative) number; Python integers never overflow and JavaScript doubles stay exact at this size, so there only the speed problem remains.</p>`, code: { lang: 'java', code: String.raw`
import java.util.*;

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int sum = 0;                    // BUG: overflows past ~2.1e9
        for (int i = 0; i < n; i++) sum += sc.nextInt();   // slow regex parsing
        System.out.println(sum);
    }
}`, alt: [{ lang: 'python', code: String.raw`
def main():
    n = int(input())
    total = 0                          # Python ints never overflow, so only the slow reading remains
    for x in input().split():
        total += int(x)                # input() per line + a list of 10^6 strings: slow on huge input
    print(total)` }, { lang: 'js', code: String.raw`
const rl = require('readline').createInterface({ input: process.stdin });
const lines = [];
rl.on('line', (l) => lines.push(l));       // one event per line: slow for huge input
rl.on('close', () => {
  let sum = 0;                             // doubles stay exact below 2^53, so no overflow at this size
  for (const x of lines[1].split(' ')) sum += parseInt(x);
  console.log(sum);
});` }, { lang: 'cpp', code: String.raw`
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    cin >> n;                          // cin still synced with C stdio: slow
    int sum = 0;                       // BUG: signed overflow past ~2.1e9 (undefined behaviour)
    for (int i = 0; i < n; i++) { int x; cin >> x; sum += x; }
    cout << sum << endl;
}` }] } },
      mcq: { q: 'Your O(N) solution gets TLE on N = 10<sup>6</sup>. What is the most likely culprit?', options: ['Reading input with a slow reader (Scanner in Java, input() per line in Python, synced cin in C++)', 'Using a for loop instead of while', 'Declaring the array as int[]', 'Using long instead of int'], answer: 0, explain: 'The algorithm is already linear; the remaining cost is I/O. Scanner is several times slower than BufferedReader + StringTokenizer on large inputs.' },
      hints: [`<p>Hint 1: The algorithm is trivial — the challenge is reading 10<sup>6</sup> numbers fast and storing a sum that can reach 10<sup>15</sup>.</p>`, `<p>Hint 2: Use your language's fast reader: BufferedReader + StringTokenizer in Java (refill the tokenizer with the next line if the numbers wrap across lines), <code>sys.stdin.buffer.read().split()</code> in Python, <code>fs.readFileSync(0)</code> in Node, <code>cin</code> after <code>ios::sync_with_stdio(false)</code> in C++.</p>`, `<p>Hint 3: Use a 64-bit sum (<code>long</code> in Java, <code>long long</code> in C++; Python ints never overflow; a JS Number is exact up to 2<sup>53</sup> ≈ 9 × 10<sup>15</sup>, which is enough here). Recipe: read N → loop N times: sum += nextInt() → print sum. Max |sum| = 10<sup>6</sup> × 10<sup>9</sup> = 10<sup>15</sup>, safely inside long.</p>`],
      tests: { io: true, cases: [
        { stdin: '4\n1000000000 1000000000 1000000000 -7\n', stdout: '2999999993' },
        { stdin: '1\n-5\n', stdout: '-5' },
        { stdin: '2\n0 0\n', stdout: '0' },
        { stdin: '5\n1 -1 2 -2 3\n', stdout: '3' },
        { stdin: '3\n-1000000000 -1000000000 -1000000000\n', stdout: '-3000000000' },
        { stdin: '6\n1 2 3\n4 5\n6\n', stdout: '21' },
        { stdin: '1000\n' + Array(1000).fill('1000000000').join(' ') + '\n', stdout: '1000000000000' }
      ] },
      solution: {
        approach: `<p>Read with a buffered tokenizer (refilling from the next line whenever the current line is used up, so the program works even if numbers are split across lines), accumulate into a 64-bit integer (Python's int and a JS Number also hold 10<sup>15</sup> exactly), print once. Every language tab uses the same plan with its own fast reader.</p>`,
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
    main()` }, { lang: 'js', code: String.raw`
// Read all of stdin in one call, then split on any whitespace.
const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
const n = Number(data[0]);
let sum = 0;                         // |sum| <= 1e15 < 2^53, so Number stays exact
for (let i = 1; i <= n; i++) sum += Number(data[i]);
console.log(String(sum));` }, { lang: 'cpp', code: String.raw`
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);     // stop syncing with C stdio: big speed-up
    cin.tie(nullptr);                // do not flush cout before every cin
    int n;
    cin >> n;
    long long sum = 0;               // up to 1e15: needs 64 bits
    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;
        sum += x;
    }
    cout << sum << '\n';
    return 0;
}` }],
        dry: { head: ['step', 'token', 'sum (long)', 'sum if it were int'], rows: [['1', '1000000000', '1000000000', '1000000000'], ['2', '1000000000', '2000000000', '2000000000'], ['3', '1000000000', '3000000000', H.c('r', '-1294967296 (overflow!)')], ['4', '-7', H.c('g', '2999999993'), H.c('r', '-1294967303')]] },
        complexity: `<p>O(N) time, O(1) extra space (we never store the array). I/O dominates the running time.</p>`,
        followUps: ['Now print the prefix sum after every element (collect the lines and write once).', 'What if values are up to 10<sup>18</sup>? (Sum may exceed long → use BigInteger or Math.addExact to detect overflow.)']
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
<h4>The same question in every language: "how big can my integer get?"</h4>
${H.table(['Language', 'Everyday integer', 'Bigger', 'What happens on overflow'], [
  ['Java', '<code>int</code> (32-bit)', '<code>long</code> (64-bit), <code>BigInteger</code>', 'wraps around silently (defined behaviour)'],
  ['Python', '<code>int</code> (unlimited)', 'not needed', H.c('g', 'never overflows') + ', but huge numbers get slow'],
  ['JavaScript', '<code>number</code> (a double)', '<code>BigInt</code> (<code>10n ** 20n</code>)', 'exact only up to 2<sup>53</sup> ≈ 9 × 10<sup>15</sup>, then digits are silently lost'],
  ['C++', '<code>int</code> (32-bit)', '<code>long long</code> (64-bit), <code>__int128</code>', H.c('r', 'undefined behaviour') + ' for signed types: anything can happen']
])}
<h4>Reference types</h4>
<p>Everything else — <code>String</code>, arrays (<code>int[]</code>), <code>ArrayList</code>, your own classes, and the <b>wrapper classes</b> <code>Integer</code>, <code>Long</code>, <code>Character</code>, <code>Boolean</code> — is a reference type. The variable stores an <b>address</b> of an object (or <code>null</code>, meaning "no house").</p>
<h4>Overflow: the odometer rolls over</h4>
<p><code>Integer.MAX_VALUE + 1</code> becomes <code>Integer.MIN_VALUE</code> (−2,147,483,648). No error, no warning — just a wrong answer. The most common trap: <code>long x = a * b;</code> where <code>a</code> and <code>b</code> are <code>int</code>. The multiplication happens in <b>int first</b>, overflows, and only then gets widened. Fix: <code>long x = (long) a * b;</code> or <code>1L * a * b</code>.</p>
<h4>Casting</h4>
<ul><li><b>Widening</b> (int → long → double) is automatic and safe (int → double is exact).</li>
<li><b>Narrowing</b> (double → int, long → int) needs an explicit cast and can lose information: <code>(int) 3.99 == 3</code>, <code>(int) 3_000_000_000L</code> is negative garbage.</li>
<li><code>char</code> ↔ <code>int</code>: <code>'a' + 2 == 99</code>, <code>(char) ('a' + 2) == 'c'</code>, digit value is <code>c - '0'</code>.</li></ul>
<h4>Wrapper trap: == on Integer</h4>
<p><code>Integer a = 127, b = 127; a == b</code> is <b>true</b> (Java caches −128…127), but with 128 it is usually <b>false</b> — two different objects. Always compare wrappers with <code>.equals()</code> or unbox to <code>int</code> first. Python has a cousin of this trap: <code>is</code> checks identity and small ints (−5…256) are cached, so always compare numbers with <code>==</code>. JavaScript and C++ numbers are plain values, so <code>===</code>/<code>==</code> compare them directly.</p>`,
    clues: [
      '"a<sub>i</sub> ≤ 10<sup>9</sup>" and you <b>add</b> or <b>multiply</b> them → the result needs <code>long</code>',
      '"Return the answer modulo 10<sup>9</sup> + 7" → do multiplications in <code>long</code>, take % after each step',
      '"Values up to 10<sup>18</sup>" or "number has 100 digits" → 64 bits are not enough for products; use big numbers (<code>BigInteger</code>, Python <code>int</code>, JS <code>BigInt</code>) or digit arrays (C++ has no built-in big integer)',
      '"Answers within 10<sup>−6</sup> are accepted" → double is fine; otherwise prefer exact integer math',
      'Comparing values pulled out of a Java <code>List&lt;Integer&gt;</code> or <code>Map</code> → use <code>.equals</code> or unbox, never <code>==</code> (in Python, use <code>==</code>, never <code>is</code>)',
      '"Reverse an integer; return 0 if it overflows" → you must detect overflow explicitly'
    ],
    code: [{ code: String.raw`
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
System.out.println(mid);                        // 2050000000`, alt: [{ lang: 'python', code: String.raw`
# Python ints never overflow: they grow to as many digits as needed.
a = b = 50_000
print(a * b)                         # 2500000000 (exact)
print(2**31 - 1 + 1)                 # 2147483648 (no rollover)

# When a problem asks for 32-bit behaviour, you must emulate it yourself:
def to_int32(x):
    x &= 0xFFFFFFFF
    return x - (1 << 32) if x >= 1 << 31 else x

print(to_int32(2**31 - 1 + 1))       # -2147483648
# The real Python cost: huge ints get slow. Keep numbers small with % MOD when asked.
lo, hi = 2_000_000_000, 2_100_000_000
print((lo + hi) // 2)                # 2050000000 (no overflow risk in Python)`, run: true }, { lang: 'js', code: String.raw`
// JS numbers are 64-bit doubles: integers are exact only up to 2^53 - 1.
const a = 50000, b = 50000;
console.log(a * b);                          // 2500000000 (fine: below 2^53)
console.log(Number.MAX_SAFE_INTEGER + 2);    // 9007199254740992 (WRONG: should end in 3)
console.log((2147483647 + 1) | 0);           // -2147483648: '| 0' forces 32-bit wrap
console.log(Math.imul(a, b));                // -1794967296: true 32-bit int multiply
console.log(10n ** 18n * 10n);               // 10000000000000000000n: BigInt is exact
const lo = 2000000000, hi = 2100000000;
console.log(lo + Math.floor((hi - lo) / 2)); // 2050000000`, run: true }, { lang: 'cpp', code: String.raw`
// In C++, SIGNED overflow is undefined behaviour: the compiler may assume it never happens.
int a = 50'000, b = 50'000;           // ' is a digit separator (C++14)
long long wrong = a * b;              // int * int overflows BEFORE widening (undefined!)
long long right = (long long)a * b;   // promote first, then multiply
cout << right << '\n';                // 2500000000
cout << INT_MAX << ' ' << LLONG_MAX << '\n';
int r;
if (__builtin_mul_overflow(a, b, &r)) cout << "overflow detected\n";   // GCC/Clang helper
int lo = 2'000'000'000, hi = 2'100'000'000;
int mid = lo + (hi - lo) / 2;         // safe midpoint
cout << mid << '\n';                  // 2050000000` }] }, { code: String.raw`
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
// int boom = maybe;                 // would throw NullPointerException while unboxing`, alt: [{ lang: 'python', code: String.raw`
# Python's version of this trap: 'is' compares identity, '==' compares values.
x, y = 256, 256
p = int("1000")                  # built at runtime
q = int("1000")
print(x is y)                    # True  (CPython caches small ints -5..256)
print(p is q)                    # False (two different objects)
print(p == q)                    # True  (compares the numbers) - always use ==
maybe = None
# maybe + 1                      # would raise TypeError: None is not a number`, run: true }, { lang: 'js', code: String.raw`
// JS has no boxed Integer objects: numbers compare by value.
console.log(1000 === 1000);        // true
// The same trap appears with arrays and objects: === compares references.
console.log([1] === [1]);          // false (two different arrays)
const a = [1], b = a;
console.log(a === b);              // true  (same array)
console.log(null + 1);             // 1 (!) null quietly becomes 0; undefined + 1 is NaN`, run: true }, { lang: 'cpp', code: String.raw`
// C++ ints are plain values: == compares numbers. No hidden boxing.
int p = 128, q = 128;
cout << (p == q) << '\n';          // 1
// The address trap appears with pointers instead:
int* pp = new int(1000);
int* pq = new int(1000);
cout << (pp == pq) << ' ' << (*pp == *pq) << '\n';   // 0 1 (addresses differ, values equal)
delete pp;
delete pq;` }] }],
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
      { title: 'Sum of an array: int vs long', html: `<p>N = 10<sup>5</sup> values, each up to 10<sup>9</sup>. Maximum sum = 10<sup>14</sup>, far above int's 2.1 × 10<sup>9</sup>. The element type can stay <code>int</code> (each value fits); only the <b>accumulator</b> must be <code>long</code> (<code>long long</code> in C++). Python never overflows, and a JS Number holds 10<sup>14</sup> exactly.</p>`, code: { code: String.raw`
int[] a = new int[100_000];
Arrays.fill(a, 1_000_000_000);
int badSum = 0;
long goodSum = 0;
for (int v : a) { badSum += v; goodSum += v; }
System.out.println(badSum);   // some meaningless number
System.out.println(goodSum);  // 100000000000000`, alt: [{ lang: 'python', code: String.raw`
a = [1_000_000_000] * 100_000
print(sum(a))        # 100000000000000 (exact: Python ints never overflow)`, run: true }, { lang: 'js', code: String.raw`
const a = new Array(100000).fill(1000000000);
let sum = 0;
for (const v of a) sum += v;
console.log(sum);    // 100000000000000 (exact: still below 2^53 ~ 9e15)
// A sum near 1e18 would lose digits: use BigInt there.`, run: true }, { lang: 'cpp', code: String.raw`
vector<int> a(100'000, 1'000'000'000);
int badSum = 0;
long long goodSum = 0;
for (int v : a) { badSum += v; goodSum += v; }   // badSum overflows (undefined behaviour)
cout << goodSum << '\n';                           // 100000000000000
// Trap: accumulate(a.begin(), a.end(), 0) sums in int! Write 0LL to sum in long long.
cout << accumulate(a.begin(), a.end(), 0LL) << '\n';` }] } },
      { title: 'Ceiling division without doubles', html: `<p>"How many boxes of size 3 to pack 10 items?" Answer ⌈10/3⌉ = 4. Avoid <code>Math.ceil(10 / 3)</code> — that computes integer 3 first and returns 3.0! For positive numbers use <code>(a + b - 1) / b</code>, or <code>Math.ceilDiv</code> (Java 18+). C++ has the same trap. In Python and JavaScript <code>/</code> already gives 3.33…, so <code>math.ceil</code>/<code>Math.ceil</code> work for small numbers — but the integer recipe (<code>-(-a // b)</code> in Python) stays exact for huge ones.</p>
${H.table(['Expression', 'Result'], [['<code>Math.ceil(10 / 3)</code>', H.c('r', '3.0')], ['<code>Math.ceil(10 / 3.0)</code>', '4.0 (double)'], ['<code>(10 + 3 - 1) / 3</code>', H.c('g', '4')]])}`, code: { code: String.raw`
int items = 10, size = 3;
System.out.println(Math.ceil(items / size));          // 3.0  (bug)
System.out.println((items + size - 1) / size);        // 4
System.out.println(Math.ceilDiv(items, size));        // 4 (Java 18+)`, alt: [{ lang: 'python', code: String.raw`
import math

items, size = 10, 3
print((items + size - 1) // size)   # 4
print(-(-items // size))            # 4  (floor division trick: works for negatives too)
print(math.ceil(items / size))      # 4, but goes through a float: wrong for numbers past 2^53`, run: true }, { lang: 'js', code: String.raw`
const items = 10, size = 3;
console.log(Math.ceil(items / size));                  // 4 ('/' already gives 3.333...)
console.log(Math.floor((items + size - 1) / size));    // 4 (integer recipe, same as Java)`, run: true }, { lang: 'cpp', code: String.raw`
int items = 10, size = 3;
cout << ceil(items / size) << '\n';          // 3  (bug: int / int happened first)
cout << (items + size - 1) / size << '\n';   // 4` }] } },
      { title: 'Doubles are approximate', html: `<p><code>0.1 + 0.2 == 0.3</code> is <b>false</b> in Java (and in every language using IEEE-754 doubles), because 0.1 has no exact binary form. Compare doubles with a tolerance, or better, keep money and counts in integers (cents, not dollars).</p>`, code: { code: String.raw`
double s = 0.1 + 0.2;
System.out.println(s);                         // 0.30000000000000004
System.out.println(s == 0.3);                  // false
System.out.println(Math.abs(s - 0.3) < 1e-9);  // true
long cents = 10 + 20;                          // exact
System.out.println(cents == 30);               // true`, alt: [{ lang: 'python', code: String.raw`
import math

s = 0.1 + 0.2
print(s)                        # 0.30000000000000004
print(s == 0.3)                 # False
print(math.isclose(s, 0.3))     # True (relative tolerance)
cents = 10 + 20                 # exact integers
print(cents == 30)              # True`, run: true }, { lang: 'js', code: String.raw`
const s = 0.1 + 0.2;
console.log(s);                          // 0.30000000000000004
console.log(s === 0.3);                  // false
console.log(Math.abs(s - 0.3) < 1e-9);   // true
const cents = 10 + 20;
console.log(cents === 30);               // true`, run: true }, { lang: 'cpp', code: String.raw`
double s = 0.1 + 0.2;
cout << setprecision(17) << s << '\n';   // 0.30000000000000004
cout << (s == 0.3) << '\n';              // 0
cout << (fabs(s - 0.3) < 1e-9) << '\n';  // 1
long long cents = 10 + 20;
cout << (cents == 30) << '\n';           // 1` }] } },
      { title: 'char is secretly a number', html: `<p>Characters are stored as UTF-16 code numbers: <code>'a' = 97</code>, <code>'A' = 65</code>, <code>'0' = 48</code>. That is why <code>c - 'a'</code> gives a letter's position 0–25 and <code>c - '0'</code> gives a digit's value.</p>
${H.table(['char c', 'c - \'a\'', 'c - \'0\''], [['\'a\'', '0', '—'], ['\'d\'', '3', '—'], ['\'7\'', '—', '7']])}`, code: { code: String.raw`
char c = 'd';
int pos = c - 'a';                 // 3
char next = (char) (c + 1);        // 'e'
int digit = '7' - '0';             // 7
char upper = (char) (c - 'a' + 'A'); // 'D'
System.out.println(pos + " " + next + " " + digit + " " + upper);`, alt: [{ lang: 'python', code: String.raw`
c = "d"                          # Python has no char type: a 1-letter str
pos = ord(c) - ord("a")          # 3
nxt = chr(ord(c) + 1)            # 'e'
digit = int("7")                 # 7 (or ord("7") - ord("0"))
upper = c.upper()                # 'D'
print(pos, nxt, digit, upper)`, run: true }, { lang: 'js', code: String.raw`
const c = 'd';                                   // JS has no char type: a 1-letter string
const pos = c.charCodeAt(0) - 97;                // 3 ('a' is code 97)
const next = String.fromCharCode(c.charCodeAt(0) + 1);   // 'e'
const digit = '7'.charCodeAt(0) - 48;            // 7 ('0' is code 48)
const upper = c.toUpperCase();                   // 'D'
console.log(pos, next, digit, upper);`, run: true }, { lang: 'cpp', code: String.raw`
char c = 'd';
int pos = c - 'a';                 // 3
char next = c + 1;                 // 'e'
int digit = '7' - '0';             // 7
char upper = c - 'a' + 'A';        // 'D' (or toupper(c))
cout << pos << ' ' << next << ' ' << digit << ' ' << upper << '\n';` }] } }
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
<p><code>java.math.BigInteger</code> handles arbitrary size but is immutable and much slower (every operation allocates). Use it for genuinely huge numbers (factorials, 100-digit inputs), not as a habit.</p>
<h4>Overflow in Python, JavaScript and C++</h4>
<ul><li><b>Python</b> ints grow without limit, so overflow bugs vanish — but a 10<sup>6</sup>-digit number makes every operation slow. Still reduce with <code>% MOD</code> after each step when a problem asks for a modulus. If a problem needs 32-bit wrap-around, emulate it with <code>&amp; 0xFFFFFFFF</code>.</li>
<li><b>JavaScript</b> numbers are doubles. <code>Number.MAX_SAFE_INTEGER</code> is 2<sup>53</sup> − 1; past it, <code>a * b</code> silently rounds. A product of two values near 10<sup>9</sup> (≈ 10<sup>18</sup>) is <b>not exact</b>, so modular multiplication needs <code>BigInt</code> (or splitting into halves). Bit operators (<code>| &amp; ^ &lt;&lt; &gt;&gt;</code>) work on 32-bit ints, and <code>x | 0</code> truncates to 32 bits.</li>
<li><b>C++</b> signed overflow is <b>undefined behaviour</b>: the optimiser may assume it never happens and delete your overflow check. Cast before multiplying (<code>1LL * a * b</code>), use <code>long long</code> for sums, and use <code>__builtin_mul_overflow</code> to detect it. Unsigned types wrap modulo 2<sup>n</sup> (defined).</li></ul>`,
    aiEra: `<p><b>What AI changes:</b> static analysers and AI reviewers now flag some overflow risks (e.g. <code>int * int</code> assigned to <code>long</code>). That is helpful at work, but in interviews the overflow bug is <i>yours</i> to catch.</p>
<p><b>Where AI goes wrong:</b> generated code frequently uses <code>int</code> for sums of large inputs, writes <code>long x = a * b</code> (still overflows), compares <code>Integer</code> objects with <code>==</code> (works in its tiny test because of the −128…127 cache, then fails in production), and reaches for <code>Math.pow</code> with integers.</p>
<p><b>Use AI well:</b> ask <code>List every place in this code where a 32-bit int (or, in JavaScript, a Number past 2^53) could overflow given values up to 1e9 and N up to 1e5</code>. Then verify each claim yourself by computing the worst-case value.</p>
<p><b>What you must still own:</b> reading constraints, computing the largest possible intermediate value, and choosing the type before you write the first line.</p>`,
    problems: [{
      title: 'Product of Array Modulo 10^9 + 7',
      level: 'Easy', tags: ['overflow', 'modular arithmetic', 'long'], companies: ['Amazon', 'Flipkart', 'Uber'],
      statement: `<p>Given an array <code>a</code> of positive integers, return the product of all elements modulo <code>1,000,000,007</code>.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, 1 ≤ a[i] ≤ 10<sup>9</sup>`,
      example: `<p>Input: <code>a = [100000, 100000, 3]</code> → Output: ${H.c('g', '999999797')}</p><p>Why: the true product is 3 × 10<sup>10</sup>. First 10<sup>10</sup> mod M = 999,999,937 (since 10<sup>10</sup> = 9 × 1,000,000,007 + 999,999,937). Then 999,999,937 × 3 = 2,999,999,811, and subtracting 2M leaves ${H.c('g', '999,999,797')}.</p>`,
      brute: { why: `<p>Multiply everything in a fixed-size integer (Java <code>int</code>/<code>long</code>, C++ <code>long long</code>, a JavaScript double) and take the modulo only at the end. The product of 10<sup>5</sup> numbers of size 10<sup>9</sup> has ~900,000 digits, so any fixed-size type overflows almost immediately. A big-number type (Java <code>BigInteger</code>, Python's built-in <code>int</code>, JavaScript <code>BigInt</code>) would be correct but painfully slow (each multiply grows the number).</p>`, code: { lang: 'java', code: String.raw`
class Solution {
    public int productMod(int[] a) {
        long p = 1;
        for (int v : a) p *= v;                 // overflows after 2-3 elements
        return (int) (p % 1_000_000_007L);      // garbage in, garbage out
    }
}`, alt: [{ lang: 'python', code: String.raw`
def product_mod(a):
    p = 1
    for v in a:
        p *= v                       # never overflows, but p grows to ~900,000 digits
    return p % 1_000_000_007         # correct, but painfully slow` }, { lang: 'js', code: String.raw`
function productMod(a) {
  let p = 1;
  for (const v of a) p *= v;                 // BUG: a double loses precision after 2^53, then hits Infinity
  return p % 1_000_000_007;                  // garbage in, garbage out
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    int productMod(vector<int>& a) {
        long long p = 1;
        for (int v : a) p *= v;                 // overflows after 2-3 elements
        return (int) (p % 1000000007LL);        // garbage in, garbage out
    }
};` }] } },
      mcq: { q: 'Both p and a[i] are below M = 10<sup>9</sup>+7. What is the largest possible value of p × a[i] before taking %?', options: ['About 10<sup>18</sup> — fits in long', 'About 10<sup>9</sup> — fits in int', 'About 10<sup>27</sup> — needs BigInteger', 'Exactly M'], answer: 0, explain: '(10<sup>9</sup>)·(10<sup>9</sup>) = 10<sup>18</sup> &lt; 9.22·10<sup>18</sup>, so a long holds it. That is exactly why the modulus is chosen around 10<sup>9</sup>.' },
      hints: [`<p>Hint 1: (x · y) mod M = ((x mod M) · (y mod M)) mod M. You can take the modulo after <b>every</b> multiplication without changing the final answer.</p>`, `<p>Hint 2: Keep the running product in a 64-bit integer (<code>long</code> / <code>long long</code>) and reduce it right away, so it always stays below M. In JavaScript, p × v can reach 10<sup>18</sup> &gt; 2<sup>53</sup>, so use <code>BigInt</code>. Python ints never overflow, but reducing keeps them small and fast.</p>`, `<p>Hint 3: Edge: a[i] can be up to 10<sup>9</sup> which is already &lt; M, but reduce it anyway for safety. Recipe: p = 1; for v: p = p * (v % M) % M; return (int) p.</p>`],
      tests: { sig: 'int[] -> int', fn: 'productMod', cases: [
        [[[100000, 100000, 3]], 999999797],
        [[[1]], 1],
        [[[1000000000]], 1000000000],
        [[[1000000000, 1000000000]], 49],
        [[Array(30).fill(2)], 73741817],
        [[[7, 1, 1, 1]], 7],
        [[Array(1000).fill(999999999)], 165700476]
      ] },
      solution: {
        approach: `<p>Use the multiplication rule of modular arithmetic. After each step the product is in [0, M), and the next multiplication is at most ~10<sup>18</sup>, which fits a 64-bit integer (but not a JS Number, hence <code>BigInt</code> in the JavaScript tab). Never let the number grow beyond what one multiplication can produce.</p>`,
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

print(product_mod([100000, 100000, 3]))  # 999999797`, run: true }, { lang: 'js', code: String.raw`
const MOD = 1000000007n;

function productMod(a) {
  // p * v can reach ~1e18, far past 2^53, so a Number would lose digits. Use BigInt.
  let p = 1n;
  for (const v of a) p = (p * BigInt(v)) % MOD;
  return Number(p);                  // p < MOD, safe to convert back
}

console.log(productMod([100000, 100000, 3]));  // 999999797`, run: true }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    int productMod(vector<int>& a) {
        const long long MOD = 1'000'000'007LL;
        long long p = 1;
        for (int v : a) p = p * (v % MOD) % MOD;   // p, v < MOD, so p * v < ~1e18 fits in long long
        return (int)p;
    }
};` }],
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
<h4>Java is always pass-by-value (and Python and JavaScript behave the same way)</h4>
<p>When you call a method, Java <b>copies</b> each argument into the new frame. For a primitive, the copy is the number — changes inside the method do not affect the caller. For a reference, the copy is the <b>address</b> — so the method can <b>change the object</b> the address points to (the caller sees it), but <b>re-pointing</b> the parameter to a new object does nothing to the caller's variable.</p>
${H.table(['Inside the method', 'Caller sees the change?'], [['<code>n++</code> on an int parameter', H.c('r', 'No')], ['<code>arr[i] = 7</code> on an array parameter', H.c('g', 'Yes — same object')], ['<code>arr = new int[3]</code>', H.c('r', 'No — only the local copy of the address changed')]])}
<p>Python and JavaScript follow exactly this table: numbers behave like copies, and lists/arrays/objects are shared through a copied reference (Python calls it "call by sharing"). <b>C++ is different:</b> by default it copies the <b>whole object</b>, even a big <code>vector</code> (O(N) work, and the caller sees no change). Write <code>vector&lt;int&gt;&amp; a</code> (a <b>reference</b>) to share the caller's object, or <code>const vector&lt;int&gt;&amp; a</code> to share it read-only without copying. A C++ reference can also change a caller's <code>int</code>, so <code>swap(int&amp; x, int&amp; y)</code> really works there.</p>
<h4>null and garbage collection</h4>
<p><code>null</code> means "this note has no address". Using it (<code>a.length</code>, <code>s.charAt(0)</code>) throws <code>NullPointerException</code>. When no reference to an object remains, it becomes <b>garbage</b> and the collector will reclaim it automatically — you never call <code>free</code> in Java. Python (<code>None</code>, <code>AttributeError</code>/<code>TypeError</code>) and JavaScript (<code>null</code>/<code>undefined</code>, <code>TypeError</code>) work the same way, with automatic garbage collection. C++ has no garbage collector: <code>vector</code> and <code>string</code> free their memory automatically when they go out of scope (RAII), a raw <code>new</code> needs a matching <code>delete</code>, and dereferencing <code>nullptr</code> is undefined behaviour (usually a crash).</p>
<h4>Why this matters in DSA</h4>
<ul><li>"Modify the array <b>in place</b>" works because the method receives the address of the caller's array.</li>
<li>Storing the <i>same</i> list object in your answer and then changing it (backtracking!) corrupts every saved copy — you must add a snapshot: <code>new ArrayList&lt;&gt;(path)</code>, <code>path[:]</code>, <code>[...path]</code>. (C++ <code>push_back(path)</code> already copies.)</li>
<li>Deep recursion (10<sup>5</sup>+ levels) can overflow the stack — prefer iteration.</li></ul>`,
    clues: [
      '"Modify the array in-place" / "do not return anything" → mutate the object through the parameter; never reassign it',
      '"O(1) extra space" → no new arrays/lists proportional to N on the heap (a few variables are fine)',
      '"Return all subsets / paths" → add a <b>copy</b> (<code>new ArrayList&lt;&gt;(path)</code>, <code>path[:]</code>, <code>[...path]</code>), not the live list',
      '"Tree/linked list with up to 10<sup>5</sup> nodes, possibly a straight line" → recursion depth 10<sup>5</sup> may overflow the stack',
      '"Memory limit 256 MB" with N = 10<sup>7</sup> → estimate bytes: int[] = 4 B each, long[] = 8 B, boxed Integer ≈ 16–20 B',
      '"Clone the graph / deep copy the list" → you must allocate new objects, not copy references'
    ],
    code: [{ code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
# Python passes object references by value ("call by sharing"), just like Java.
def bump(n):
    n += 1                   # rebinds the local name only

def fill(arr):
    arr[1] = 7               # mutates the caller's list (same object)
    arr = [0, 0, 0]          # rebinds the LOCAL name only
    arr[2] = 42              # touches the new list, invisible to the caller

x = 5
a = [1, 2, 3]
b = a                        # alias: same list
b[0] = 99
bump(x)
fill(a)
print(x, a)                  # 5 [99, 7, 3]`, run: true }, { lang: 'js', code: String.raw`
// JS passes primitives by value and objects (arrays) as a copy of the reference, like Java.
function bump(n) { n++; }            // changes only the local copy
function fill(arr) {
  arr[1] = 7;                        // mutates the caller's array (same object)
  arr = new Array(3).fill(0);        // re-points the LOCAL variable only
  arr[2] = 42;                       // invisible to the caller
}

const x = 5;
const a = [1, 2, 3];
const b = a;                         // alias: same array
b[0] = 99;
bump(x);
fill(a);
console.log(x, a);                   // 5 [ 99, 7, 3 ]`, run: true }, { lang: 'cpp', code: String.raw`
#include <bits/stdc++.h>
using namespace std;

// C++ copies by default - even whole vectors. Ask for a reference (&) to share.
void bump(int n) { n++; }                     // copy of the int
void bumpRef(int& n) { n++; }                 // reference: changes the caller's int
void fillCopy(vector<int> arr) { arr[1] = 7; } // copies the WHOLE vector: caller unchanged, O(N) cost
void fill(vector<int>& arr) {                 // reference: same object as the caller's
    arr[1] = 7;
    arr = vector<int>(3);                     // assigns INTO the caller's vector (no re-pointing in C++)
    arr[2] = 42;
}

int main() {
    int x = 5;
    vector<int> a = {1, 2, 3};
    vector<int>& b = a;                       // alias needs an explicit reference
    b[0] = 99;
    bump(x);
    bumpRef(x);
    fillCopy(a);
    cout << x << " " << a[0] << "," << a[1] << "," << a[2] << '\n';   // 6 99,2,3
    fill(a);
    cout << a[0] << "," << a[1] << "," << a[2] << '\n';               // 0,0,42
    return 0;
}` }] }, { code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
# Python stops at ~1000 frames by default (RecursionError).
# Raise the limit AND run in a thread with a bigger C stack, or the interpreter itself crashes.
import sys
import threading

def depth(n):
    return 0 if n == 0 else 1 + depth(n - 1)

def main():
    print(depth(1_000_000))          # 1,000,000 frames

sys.setrecursionlimit(1 << 21)
threading.stack_size(1 << 29)        # 512 MB stack for new threads
t = threading.Thread(target=main)
t.start()
t.join()
# Often simpler: rewrite the recursion as a loop with an explicit list used as a stack.` }, { lang: 'js', code: String.raw`
// Node's default stack holds roughly 10k frames; deeper recursion throws RangeError.
// 'node --stack-size=...' helps a little but can crash the process. Prefer a loop:
function depthRecursive(n) { return n === 0 ? 0 : 1 + depthRecursive(n - 1); }

function depthIterative(n) {
  const stack = [n];                 // explicit stack replaces the call stack
  let d = 0;
  while (stack.length) {
    const k = stack.pop();
    if (k > 0) { d++; stack.push(k - 1); }
  }
  return d;
}

console.log(depthRecursive(5000));       // fine
console.log(depthIterative(1000000));    // 1000000, no stack limit`, run: true }, { lang: 'cpp', code: String.raw`
#include <bits/stdc++.h>
using namespace std;

// The main thread stack is usually 8 MB on Linux judges (1 MB on Windows).
// Small frames reach ~10^5-10^6 calls; big locals per frame overflow much sooner.
int depth(int n) { return n == 0 ? 0 : 1 + depth(n - 1); }

int main() {
    cout << depth(100'000) << '\n';   // fine with an 8 MB stack
    // For 10^6+ levels: use an explicit std::stack / vector, or raise the limit
    // outside the program (ulimit -s unlimited), which judges may not allow.
    return 0;
}` }] }],
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
      { title: 'Why swap(int, int) fails but swap(int[], i, j) works', html: `<p>The first version swaps two <b>copies</b> that die when the method returns. The second receives the array's address and swaps the real cells. This tiny helper appears in sorting, two-pointer and permutation code all the time.</p>`, code: { code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
def swap_broken(x, y):
    x, y = y, x               # swaps two local names only

def swap(a, i, j):
    a[i], a[j] = a[j], a[i]   # writes into the shared list

p, q = 1, 2
swap_broken(p, q)
print(p, q)                   # 1 2 (unchanged)
p, q = q, p                   # in Python you swap variables right where they live
arr = [1, 2]
swap(arr, 0, 1)
print(arr)                    # [2, 1]`, run: true }, { lang: 'js', code: String.raw`
function swapBroken(x, y) { [x, y] = [y, x]; }          // local copies only
function swap(a, i, j) { [a[i], a[j]] = [a[j], a[i]]; } // writes into the shared array

let p = 1, q = 2;
swapBroken(p, q);
console.log(p, q);            // 1 2 (unchanged)
const arr = [1, 2];
swap(arr, 0, 1);
console.log(arr);             // [ 2, 1 ]`, run: true }, { lang: 'cpp', code: String.raw`
#include <bits/stdc++.h>
using namespace std;

void swapBroken(int x, int y) { int t = x; x = y; y = t; }   // copies
void swapRef(int& x, int& y) { int t = x; x = y; y = t; }    // references: this one WORKS in C++

int main() {
    int p = 1, q = 2;
    swapBroken(p, q);
    cout << p << " " << q << '\n';      // 1 2
    swapRef(p, q);
    cout << p << " " << q << '\n';      // 2 1
    vector<int> arr = {1, 2};
    swap(arr[0], arr[1]);               // std::swap takes references too
    cout << arr[0] << " " << arr[1] << '\n';   // 2 1
    return 0;
}` }] } },
      { title: 'Alias vs copy vs deep copy', html: `<p><code>b = a</code> is an alias. <code>a.clone()</code> or <code>Arrays.copyOf</code> makes a new 1D array. For a <b>2D</b> array, <code>clone()</code> copies only the outer array of row addresses — rows are still shared (a <b>shallow</b> copy). Copy each row for a true deep copy.</p>
${H.table(['Operation', 'New outer array?', 'New rows?'], [['<code>int[][] g2 = g;</code>', 'no', 'no'], ['<code>g.clone()</code>', 'yes', H.c('r', 'no')], ['row-by-row <code>clone()</code>', 'yes', H.c('g', 'yes')]])}`, code: { code: String.raw`
int[][] g = {{1, 2}, {3, 4}};
int[][] shallow = g.clone();
shallow[0][0] = 100;                       // also changes g[0][0]!
int[][] deep = new int[g.length][];
for (int r = 0; r < g.length; r++) deep[r] = g[r].clone();
deep[1][1] = -1;                           // g is untouched
System.out.println(g[0][0] + " " + g[1][1]);   // 100 4`, alt: [{ lang: 'python', code: String.raw`
import copy

g = [[1, 2], [3, 4]]
shallow = g.copy()                 # new outer list, SAME row lists (also g[:] or list(g))
shallow[0][0] = 100                # also changes g[0][0]!
deep = [row[:] for row in g]       # copy each row (or copy.deepcopy(g) for any nesting)
deep[1][1] = -1                    # g is untouched
print(g[0][0], g[1][1])            # 100 4`, run: true }, { lang: 'js', code: String.raw`
const g = [[1, 2], [3, 4]];
const shallow = [...g];                 // new outer array, SAME rows
shallow[0][0] = 100;                    // also changes g[0][0]!
const deep = g.map((row) => [...row]);  // copy each row (or structuredClone(g))
deep[1][1] = -1;                        // g is untouched
console.log(g[0][0], g[1][1]);          // 100 4`, run: true }, { lang: 'cpp', code: String.raw`
// C++ is the opposite: copying a vector<vector<int>> is a DEEP copy by default.
vector<vector<int>> g = {{1, 2}, {3, 4}};
auto copyAll = g;                  // copies every row
copyAll[0][0] = 100;               // g is untouched
auto& alias = g;                   // sharing needs an explicit reference
alias[1][1] = -1;                  // changes g
cout << g[0][0] << " " << g[1][1] << '\n';   // 1 -1` }] } },
      { title: 'Strings look like pass-by-value because they are immutable', html: `<p>Inside a method, <code>s += "!"</code> does <b>not</b> change the caller's String. Strings cannot be modified; <code>+=</code> builds a <b>new</b> String and re-points the local variable. If you want a method to modify text, pass a <code>StringBuilder</code> (which is mutable) or return the new String.</p>`, code: { code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
def shout(s):
    s += "!"                 # str is immutable: builds a new str, rebinds the local name

def shout_list(chars):
    chars.append("!")        # lists are mutable: the caller sees it

s = "hi"
shout(s)
chars = list("hi")
shout_list(chars)
print(s, "".join(chars))     # hi hi!`, run: true }, { lang: 'js', code: String.raw`
function shout(s) { s += '!'; }            // strings are immutable: new string, local only
function shoutArr(parts) { parts.push('!'); }   // arrays are mutable

const s = 'hi';
shout(s);
const parts = ['h', 'i'];
shoutArr(parts);
console.log(s, parts.join(''));            // hi hi!`, run: true }, { lang: 'cpp', code: String.raw`
#include <bits/stdc++.h>
using namespace std;

// std::string is MUTABLE. What matters is copy vs reference.
void shout(string s) { s += "!"; }          // works on a copy
void shoutRef(string& s) { s += "!"; }      // edits the caller's string in place

int main() {
    string a = "hi", b = "hi";
    shout(a);
    shoutRef(b);
    cout << a << " " << b << '\n';          // hi hi!
    return 0;
}` }] } },
      { title: 'The live-list bug in backtracking', html: `<p>Adding <code>path</code> itself to the result stores the <b>address</b> of one list that keeps changing. At the end every entry shows the same (often empty) list. Always snapshot with <code>new ArrayList&lt;&gt;(path)</code>.</p>`, code: { code: String.raw`
List<List<Integer>> bad = new ArrayList<>(), good = new ArrayList<>();
List<Integer> path = new ArrayList<>();
for (int i = 1; i <= 3; i++) {
    path.add(i);
    bad.add(path);                    // same object added three times
    good.add(new ArrayList<>(path));  // independent snapshot
}
path.clear();
System.out.println(bad);   // [[], [], []]
System.out.println(good);  // [[1], [1, 2], [1, 2, 3]]`, alt: [{ lang: 'python', code: String.raw`
bad, good, path = [], [], []
for i in range(1, 4):
    path.append(i)
    bad.append(path)          # same list object added three times
    good.append(path[:])      # independent snapshot (or list(path))
path.clear()
print(bad)                    # [[], [], []]
print(good)                   # [[1], [1, 2], [1, 2, 3]]`, run: true }, { lang: 'js', code: String.raw`
const bad = [], good = [], path = [];
for (let i = 1; i <= 3; i++) {
  path.push(i);
  bad.push(path);             // same array added three times
  good.push([...path]);       // independent snapshot
}
path.length = 0;
console.log(JSON.stringify(bad));    // [[],[],[]]
console.log(JSON.stringify(good));   // [[1],[1,2],[1,2,3]]`, run: true }, { lang: 'cpp', code: String.raw`
// push_back(path) COPIES the vector, so C++ value semantics avoid this bug...
vector<vector<int>> good;
vector<int> path;
for (int i = 1; i <= 3; i++) { path.push_back(i); good.push_back(path); }
// ...but storing pointers brings it back: every entry points at the same vector.
vector<vector<int>*> bad;
for (int i = 0; i < 3; i++) bad.push_back(&path);
path.clear();
cout << good.size() << " snapshots, last has " << good.back().size() << " items; bad[0] has " << bad[0]->size() << '\n';
// 3 snapshots, last has 3 items; bad[0] has 0` }] } }
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
<h4>Stack limits in Python, JavaScript and C++</h4>
<ul><li><b>Python:</b> a hard recursion limit of about 1000 frames (<code>RecursionError</code>). <code>sys.setrecursionlimit</code> raises it, but deep recursion can then crash the interpreter unless you also run the code in a <code>threading.Thread</code> after <code>threading.stack_size(...)</code>. Iteration is usually the better fix.</li>
<li><b>JavaScript (Node):</b> roughly 10,000 frames by default (<code>RangeError: Maximum call stack size exceeded</code>). <code>node --stack-size</code> exists but is risky; use an explicit stack.</li>
<li><b>C++:</b> the main thread usually gets 8 MB on Linux (1 MB on Windows). Small frames allow ~10<sup>5</sup>–10<sup>6</sup> levels; a big local array inside a recursive function overflows much sooner. Put big arrays in <code>static</code>/global storage or a <code>vector</code> (heap), never as a huge local.</li></ul>
<h4>Memory leaks still happen</h4>
<p>GC frees only <b>unreachable</b> objects. A static <code>List</code> or cache that keeps growing holds references forever — the classic Java "leak". In DSA terms, clearing a static structure between test cases also prevents wrong answers from stale state.</p>`,
    aiEra: `<p><b>What AI changes:</b> you rarely debug raw memory any more; profilers and AI assistants can read a heap dump or a stack trace and point at the culprit quickly.</p>
<p><b>Where AI goes wrong:</b> it often writes recursive DFS for inputs where depth can reach 10<sup>5</sup>, adds <code>result.add(path)</code> without copying in backtracking, or claims "Java passes objects by reference" — which leads to wrong predictions about reassignment. These are exactly the bugs interviewers probe.</p>
<p><b>Use AI well:</b> paste a snippet and ask <code>Draw the stack frames and heap objects after each line, as a table</code>, then check it against your own drawing. Or ask it to produce tricky "what does this print?" aliasing puzzles.</p>
<p><b>What you must own:</b> the mental model of arrows. If you can draw stack-and-heap boxes for any snippet, you can predict linked-list, tree and backtracking behaviour without running code.</p>`,
    problems: [{
      title: 'Reverse an Array In Place',
      level: 'Easy', tags: ['arrays', 'two pointers', 'references'], companies: ['Infosys', 'TCS', 'Amazon'],
      statement: `<p>Write <code>reverse(a)</code> (Java: <code>void reverse(int[] a)</code>, C++: <code>void reverse(vector&lt;int&gt;&amp; a)</code>) that reverses the array <b>in place</b>: after the call, the caller's array must hold the elements in reverse order. Use O(1) extra space.</p>`,
      constraints: `0 ≤ N ≤ 10<sup>6</sup>, −10<sup>9</sup> ≤ a[i] ≤ 10<sup>9</sup>`,
      example: `${H.arr([1, 2, 3, 4, 5], { label: 'before' })}${H.arr([5, 4, 3, 2, 1], { label: 'after', hl: { 0: 'g', 4: 'g', 1: 'b', 3: 'b', 2: 'y' } })}<p>Why: pairs (0,4) and (1,3) are swapped; the middle element (index 2) stays put.</p>`,
      brute: { why: `<p>Build a brand-new reversed array and then re-point the parameter to it: <code>a = rev;</code>. It even "works" when printed inside the method — but the <b>caller's</b> array is unchanged, because only the local copy of the address moved (in C++ a by-value <code>vector</code> parameter is a full copy, so assigning to it is just as invisible). Copying back element by element fixes correctness but uses O(N) extra memory.</p>`, code: { lang: 'java', code: String.raw`
class Solution {
    void reverse(int[] a) {
        int[] rev = new int[a.length];
        for (int i = 0; i < a.length; i++) rev[i] = a[a.length - 1 - i];
        a = rev;   // BUG: only the local reference changes; caller sees nothing
        // correct-but-wasteful fix: System.arraycopy(rev, 0, a, 0, a.length);
    }
}`, alt: [{ lang: 'python', code: String.raw`
def reverse(a):
    rev = [a[len(a) - 1 - i] for i in range(len(a))]
    a = rev   # BUG: only the local name is re-pointed; caller sees nothing
    # correct-but-wasteful fix: a[:] = rev (copy back into the caller's list)` }, { lang: 'js', code: String.raw`
function reverse(a) {
  const rev = new Array(a.length);
  for (let i = 0; i < a.length; i++) rev[i] = a[a.length - 1 - i];
  a = rev;   // BUG: only the local variable is re-pointed; caller sees nothing
  // correct-but-wasteful fix: a.splice(0, a.length, ...rev) (copy back into the caller's array)
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    void reverse(vector<int> a) {            // BUG: by value, so a is a full copy of the caller's vector
        vector<int> rev(a.size());
        for (int i = 0; i < (int) a.size(); i++) rev[i] = a[a.size() - 1 - i];
        a = rev;   // changes only the local copy; caller sees nothing
        // correct-but-wasteful fix: take vector<int>& a and copy rev back element by element
    }
};` }] } },
      mcq: { q: 'Inside <code>reverse(int[] a)</code> you write <code>a = newArray;</code>. What does the caller see?', options: ['The original array, unchanged', 'The new array', 'null', 'A compile error'], answer: 0, explain: 'Java copied the address into a. Re-pointing the local copy does not touch the caller\'s variable. Only writes through the address (a[i] = …) are visible.' },
      hints: [`<p>Hint 1: The first and last elements trade places, then the second and second-to-last, and so on. You never need a second array.</p>`, `<p>Hint 2: Two indices: <code>i</code> from the left, <code>j</code> from the right. Swap <code>a[i]</code> and <code>a[j]</code> through the array reference, then move both inward.</p>`, `<p>Hint 3: Stop when <code>i &gt;= j</code> (handles odd length, length 0 and 1). Recipe: i = 0, j = n−1; while i &lt; j: swap(a, i, j); i++; j−−.</p>`],
      tests: { sig: 'int[] -> void', fn: 'reverse', mutate: 0, cases: [
        [[[1, 2, 3, 4, 5]], [5, 4, 3, 2, 1]],
        [[[]], []],
        [[[7]], [7]],
        [[[1, 2]], [2, 1]],
        [[[3, 3, 1]], [1, 3, 3]],
        [[[-1000000000, 0, 1000000000, 5]], [5, 1000000000, 0, -1000000000]]
      ] },
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
print(nums)  # [5, 4, 3, 2, 1]`, run: true }, { lang: 'js', code: String.raw`
function reverse(a) {
  // Arrays are objects: 'a' holds a reference, so writes through it reach the caller.
  for (let i = 0, j = a.length - 1; i < j; i++, j--) {
    [a[i], a[j]] = [a[j], a[i]];
  }
}

const nums = [1, 2, 3, 4, 5];
reverse(nums);
console.log(nums);  // [ 5, 4, 3, 2, 1 ]`, run: true }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    // Take the vector by reference (&). Without it, C++ would copy the whole vector
    // and the caller would never see the change.
    void reverse(vector<int>& a) {
        int i = 0, j = (int)a.size() - 1;
        while (i < j) swap(a[i++], a[j--]);
    }
};` }],
        dry: { head: ['i', 'j', 'swap', 'array after'], rows: [['0', '4', 'a[0] ↔ a[4]', '[5, 2, 3, 4, 1]'], ['1', '3', 'a[1] ↔ a[3]', '[5, 4, 3, 2, 1]'], ['2', '2', H.c('m', 'i ≥ j → stop'), H.c('g', '[5, 4, 3, 2, 1]')]] },
        complexity: `<p>O(N) time (N/2 swaps), O(1) extra space.</p>`,
        followUps: ['Reverse only the sub-range [l, r].', 'Rotate the array right by k using three reversals.', 'Reverse a string in place (Java, Python and JavaScript strings are immutable — convert to a char array or list first; a C++ std::string can be edited directly).']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — Arrays and Strings basics
     ====================================================================== */
  topics.push({
    title: 'Arrays & Strings Basics',
    analogy: `<p>An <b>array</b> is a row of <b>numbered lockers</b> in a school corridor: all lockers are the same size, the row has a fixed length decided when it was built, and you can open locker #7 instantly without walking past the others. A <b>string</b> in Java, Python and JavaScript is a <b>printed sign</b>: you can read any letter, but to change one letter you must print a whole new sign. A <b>builder</b> is a <b>whiteboard</b> — write, erase and append freely, then "print" it once: Java's <code>StringBuilder</code>, a Python list of pieces joined with <code>"".join</code>, a JavaScript array joined with <code>join("")</code>. A C++ <code>std::string</code> is already a whiteboard: it can be edited in place.</p>`,
    explain: `<h4>Arrays in 60 seconds</h4>
<ul><li>Create: <code>int[] a = new int[n];</code> (all zeros) or <code>int[] a = {4, 1, 7};</code></li>
<li>Default values: <code>0</code> for numbers, <code>false</code> for boolean, <code>'\\u0000'</code> for char, <code>null</code> for objects.</li>
<li>Length: <code>a.length</code> (a field — no brackets). Valid indexes: <b>0 … n − 1</b>. Index <code>n</code> → <code>ArrayIndexOutOfBoundsException</code>.</li>
<li>Access is <b>O(1)</b>: address of a[i] = start + i × size. That "jump straight there" power is why arrays are the backbone of DSA.</li>
<li>Size is fixed. Need to grow? Use <code>ArrayList&lt;Integer&gt;</code> (amortised O(1) add).</li></ul>
<p>The examples use Java. Here is the same toolkit in the other three languages:</p>
${H.table(['Task', 'Python', 'JavaScript', 'C++'], [
  ['growable array', '<code>list</code>: <code>a = [0] * n</code>, <code>a.append(x)</code>', '<code>Array</code>: <code>new Array(n).fill(0)</code>, <code>a.push(x)</code>', '<code>vector&lt;int&gt; a(n)</code>, <code>a.push_back(x)</code>'],
  ['length', '<code>len(a)</code>', '<code>a.length</code>', '<code>a.size()</code>'],
  ['sort ascending', '<code>a.sort()</code> / <code>sorted(a)</code>', H.c('r', '<code>a.sort((x, y) =&gt; x - y)</code>') + ' (no comparator = string order!)', '<code>sort(a.begin(), a.end())</code>'],
  ['copy a range', '<code>a[l:r]</code>', '<code>a.slice(l, r)</code>', '<code>vector&lt;int&gt;(a.begin() + l, a.begin() + r)</code>'],
  ['2D grid', '<code>[[0] * C for _ in range(R)]</code>', '<code>Array.from({length: R}, () =&gt; new Array(C).fill(0))</code>', '<code>vector&lt;vector&lt;int&gt;&gt; g(R, vector&lt;int&gt;(C))</code>'],
  ['bad index', '<code>IndexError</code> (and <code>a[-1]</code> is the last item!)', 'returns <code>undefined</code> silently', H.c('r', 'undefined behaviour') + ' (use <code>a.at(i)</code> to check)']
])}
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
<p>Strings elsewhere: Python <code>len(s)</code>, <code>s[1]</code>, slices <code>s[1:4]</code>, <code>s.find("l")</code>, <code>==</code> compares content; JavaScript <code>s.length</code>, <code>s[1]</code>, <code>s.slice(1, 4)</code>, <code>s.indexOf("l")</code>, <code>===</code> compares content; C++ <code>s.size()</code>, <code>s[1]</code>, <code>s.substr(1, 3)</code> (start and <b>length</b>!), <code>s.find('l')</code>, <code>==</code> compares content. Only Java needs <code>.equals</code>.</p>
<h4>The counting array trick</h4>
<p>When input is "lowercase English letters only", a letter <code>c</code> maps to index <code>c - 'a'</code> (0–25). An <code>int[26]</code> then counts letters in O(1) per character — faster and lighter than a hash map. In Python write <code>ord(c) - ord("a")</code>, in JavaScript <code>c.charCodeAt(0) - 97</code>; C++ is the same as Java.</p>`,
    clues: [
      '"String consists of lowercase English letters only" → <code>int[26]</code> counting with <code>c - \'a\'</code>',
      '"Grid", "matrix", "board of m × n cells" → 2D array + direction arrays for neighbours',
      '"Build the answer string" in a loop → a builder (<code>StringBuilder</code>, list + <code>"".join</code>, array + <code>join</code>, C++ <code>+=</code>), never Java/Python <code>s = s + x</code> in a loop',
      '"Compare two strings for equality" → Java <code>.equals</code> (<code>==</code> in Python and C++, <code>===</code> in JS); "lexicographically smallest" → <code>compareTo</code> / <code>&lt;</code> on strings',
      '"1-indexed" in the statement → subtract 1 when storing, or allocate n + 1 cells',
      '"ASCII characters" (any printable) → <code>int[128]</code> or <code>int[256]</code> instead of 26'
    ],
    code: [{ code: String.raw`
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
System.out.println(Arrays.toString(part) + " " + peaks);   // [3, 5] 1`, alt: [{ lang: 'python', code: String.raw`
# List toolkit (Python lists are dynamic arrays)
a = [5, 3, 8, 1]
print(len(a))                       # 4
a.sort()                            # in place: [1, 3, 5, 8]  (sorted(a) returns a new list)
print(a)
part = a[1:3]                       # slice copy: [3, 5]
dp = [-1] * 5                       # [-1, -1, -1, -1, -1]

# 2D grid: count cells whose 4 neighbours are all smaller
g = [[1, 2, 1], [2, 9, 2], [1, 2, 1]]
R, C = len(g), len(g[0])
peaks = 0
for r in range(R):
    for c in range(C):
        if all(not (0 <= r + dr < R and 0 <= c + dc < C) or g[r + dr][c + dc] < g[r][c]
               for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1))):
            peaks += 1
print(part, peaks)                  # [3, 5] 1
# Trap: [[0] * C] * R makes R references to ONE row. Use [[0] * C for _ in range(R)].`, run: true }, { lang: 'js', code: String.raw`
// Array toolkit
const a = [5, 3, 8, 1];
console.log(a.length);                      // 4
a.sort((x, y) => x - y);                    // ALWAYS pass a comparator: default sort compares as strings
console.log(a);                             // [ 1, 3, 5, 8 ]
const part = a.slice(1, 3);                 // [ 3, 5 ] (end index exclusive)
const dp = new Array(5).fill(-1);           // [ -1, -1, -1, -1, -1 ]

// 2D grid: count cells whose 4 neighbours are all smaller
const g = [[1, 2, 1], [2, 9, 2], [1, 2, 1]];
const dr = [-1, 1, 0, 0], dc = [0, 0, -1, 1];
let peaks = 0;
for (let r = 0; r < g.length; r++) {
  for (let c = 0; c < g[0].length; c++) {
    let peak = true;
    for (let d = 0; d < 4; d++) {
      const nr = r + dr[d], nc = c + dc[d];
      if (nr >= 0 && nr < g.length && nc >= 0 && nc < g[0].length && g[nr][nc] >= g[r][c]) peak = false;
    }
    if (peak) peaks++;
  }
}
console.log(part, peaks);                   // [ 3, 5 ] 1
// Trap: new Array(3).fill([]) shares ONE inner array. Use Array.from({ length: 3 }, () => []).`, run: true }, { lang: 'cpp', code: String.raw`
// vector toolkit
vector<int> a = {5, 3, 8, 1};
cout << a.size() << '\n';                         // 4
sort(a.begin(), a.end());                         // 1 3 5 8
vector<int> part(a.begin() + 1, a.begin() + 3);   // {3, 5}: half-open range [first, last)
vector<int> dp(5, -1);                            // five -1s

// 2D grid: count cells whose 4 neighbours are all smaller
vector<vector<int>> g = {{1, 2, 1}, {2, 9, 2}, {1, 2, 1}};
int R = g.size(), C = g[0].size();
int dr[] = {-1, 1, 0, 0}, dc[] = {0, 0, -1, 1};
int peaks = 0;
for (int r = 0; r < R; r++)
    for (int c = 0; c < C; c++) {
        bool peak = true;
        for (int d = 0; d < 4; d++) {
            int nr = r + dr[d], nc = c + dc[d];
            if (nr >= 0 && nr < R && nc >= 0 && nc < C && g[nr][nc] >= g[r][c]) peak = false;
        }
        if (peak) peaks++;
    }
cout << part[0] << "," << part[1] << " " << peaks << '\n';   // 3,5 1
// a[i] is unchecked: an out-of-range index is undefined behaviour. a.at(i) throws instead.` }] }, { code: String.raw`
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
System.out.println(Character.isDigit(c) + " " + Character.isLetter('x') + " " + Character.toUpperCase('q'));`, alt: [{ lang: 'python', code: String.raw`
from collections import Counter

s = "Hello, World"
print(len(s), s[4], s[7:])                       # 12 o World
print(s.lower().find("world"))                   # 7  (-1 if absent)
words = "the quick  brown".split()               # split() with no argument splits on runs of spaces
print(len(words), "-".join(words))               # 3 the-quick-brown

cnt = [0] * 26                                   # counting array
for ch in "banana":
    cnt[ord(ch) - ord("a")] += 1
print(cnt[0], cnt[ord("n") - ord("a")])          # 3 2
print(Counter("banana")["a"])                    # 3 (Counter: a dict of counts)

parts = [str(i) for i in range(5)]               # build pieces in a list...
print(",".join(reversed(parts)))                 # ...and join once: 4,3,2,1,0
print("7".isdigit(), "x".isalpha(), "q".upper()) # True True Q`, run: true }, { lang: 'js', code: String.raw`
const s = 'Hello, World';
console.log(s.length, s[4], s.substring(7));            // 12 o World
console.log(s.toLowerCase().indexOf('world'));          // 7
const words = 'the quick  brown'.trim().split(/\s+/);   // split on runs of spaces
console.log(words.length, words.join('-'));             // 3 the-quick-brown

const cnt = new Array(26).fill(0);                      // counting array
for (const ch of 'banana') cnt[ch.charCodeAt(0) - 97]++;
console.log(cnt[0], cnt['n'.charCodeAt(0) - 97]);       // 3 2

const parts = [];
for (let i = 0; i < 5; i++) parts.push(i);              // collect pieces, join once
console.log(parts.reverse().join(','));                 // 4,3,2,1,0
console.log(/\d/.test('7'), /[a-z]/i.test('x'), 'q'.toUpperCase());   // true true Q`, run: true }, { lang: 'cpp', code: String.raw`
string s = "Hello, World";
cout << s.size() << " " << s[4] << " " << s.substr(7) << '\n';    // 12 o World
string low = s;
transform(low.begin(), low.end(), low.begin(), ::tolower);
cout << (int)low.find("world") << '\n';                            // 7 (string::npos if absent)
istringstream iss("the quick  brown");
vector<string> words;
for (string w; iss >> w;) words.push_back(w);                      // >> splits on any whitespace
cout << words.size() << '\n';                                      // 3

int cnt[26] = {};                                                  // counting array, zeroed
for (char ch : string("banana")) cnt[ch - 'a']++;
cout << cnt[0] << " " << cnt['n' - 'a'] << '\n';                   // 3 2

string sb;                                                         // std::string is mutable
for (int i = 0; i < 5; i++) { sb += to_string(i); sb += ','; }      // += is amortised O(1)
sb.pop_back();                                                     // drop trailing comma
reverse(sb.begin(), sb.end());
cout << sb << '\n';                                                // 4,3,2,1,0
cout << (bool)isdigit('7') << " " << (bool)isalpha('x') << " " << (char)toupper('q') << '\n';   // 1 1 Q` }] }],
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
        var PY = 'cnt = [0] * 26\nfor c in s:\n    cnt[ord(c) - ord(\'a\')] += 1\nfor c in t:\n    cnt[ord(c) - ord(\'a\')] -= 1\nif any(x != 0 for x in cnt):\n    return False\nreturn True',
            JS = 'const cnt = new Array(26).fill(0);\nfor (const c of s) cnt[c.charCodeAt(0) - 97]++;\nfor (const c of t) cnt[c.charCodeAt(0) - 97]--;\nif (cnt.some((x) => x !== 0)) return false;\nreturn true;',
            CPP = 'int cnt[26] = {0};\nfor (char c : s) cnt[c - \'a\']++;\nfor (char c : t) cnt[c - \'a\']--;\nfor (int x : cnt) if (x != 0) return false;\nreturn true;';
        var ALT = { python: { code: PY, map: { 2: 3, 3: 5, 4: 6, 5: 8 } }, js: { code: JS }, cpp: { code: CPP } };
        frames.push({ narr: 'One locker per letter: index 0 = \'a\', 1 = \'b\', … 25 = \'z\'. All start at 0. ' + (s.length !== t.length ? '<span class="c-y">(Lengths differ, so the real code could return false immediately — we will still count to show the idea.)</span>' : ''), parts: [
          { type: 'array', label: 'cnt[26]', values: cnt.slice(), idxLabels: L },
          { type: 'code', lang: 'java', code: CODE, alt: ALT, hl: { 1: 'cur' } }
        ] });
        for (i = 0; i < s.length; i++) {
          var k = s.charCodeAt(i) - 97; cnt[k]++;
          var h = {}; h[k] = 'ok'; var sh = {}; sh[i] = 'cur';
          frames.push({ narr: 'First word: char <b>\'' + s[i] + '\'</b> → index <code>\'' + s[i] + '\' - \'a\'</code> = ' + k + '. Increment: cnt[' + k + '] = ' + cnt[k] + '.', parts: [
            { type: 'array', label: 'first word', values: s.split(''), hl: sh },
            { type: 'array', label: 'cnt[26]', values: cnt.slice(), idxLabels: L, hl: h },
            { type: 'code', lang: 'java', code: CODE, alt: ALT, hl: { 2: 'cur' } }
          ] });
        }
        for (i = 0; i < t.length; i++) {
          var k2 = t.charCodeAt(i) - 97; cnt[k2]--;
          var h2 = {}; h2[k2] = cnt[k2] < 0 ? 'bad' : (cnt[k2] === 0 ? 'done' : 'cur'); var th = {}; th[i] = 'cur';
          frames.push({ narr: 'Second word: char <b>\'' + t[i] + '\'</b> → decrement cnt[' + k2 + '] to ' + cnt[k2] + '. ' + (cnt[k2] < 0 ? '<span class="c-r">Negative: the second word has more \'' + t[i] + '\'s than the first.</span>' : 'It cancels one copy from the first word.'), parts: [
            { type: 'array', label: 'second word', values: t.split(''), hl: th },
            { type: 'array', label: 'cnt[26]', values: cnt.slice(), idxLabels: L, hl: h2 },
            { type: 'code', lang: 'java', code: CODE, alt: ALT, hl: { 3: 'cur' } }
          ] });
        }
        var bad = {}, ok = true;
        for (i = 0; i < 26; i++) if (cnt[i] !== 0) { bad[i] = 'bad'; ok = false; }
        frames.push({ narr: ok ? 'Every locker is back to <b>0</b>: each letter appeared equally often in both words → <span class="c-g"><b>anagrams</b></span>. Total work: one pass over each word + 26 checks = O(N).' : 'Some lockers are not 0 (red) → letter counts differ → <span class="c-r"><b>not anagrams</b></span>.', parts: [
          { type: 'array', label: 'cnt[26]', values: cnt.slice(), idxLabels: L, hl: bad },
          { type: 'code', lang: 'java', code: CODE, alt: ALT, hl: ok ? { 5: 'ok' } : { 4: 'bad' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'String += in a loop is secretly O(N²)', html: `<p>Each <code>s += c</code> creates a <b>new</b> String and copies all previous characters. Building a 10<sup>5</sup>-char string that way copies about 1 + 2 + … + 10<sup>5</sup> ≈ 5 × 10<sup>9</sup> chars. StringBuilder appends into a growing buffer: total O(N).</p>
${H.table(['Length built', 'chars copied with +=', 'with StringBuilder'], [['10', '55', '≈ 10'], ['1,000', '≈ 500,000', '≈ 1,000'], ['100,000', H.c('r', '≈ 5,000,000,000'), H.c('g', '≈ 100,000')]])}`, code: { code: String.raw`
int n = 20_000;
long t0 = System.nanoTime();
String s = "";
for (int i = 0; i < n; i++) s += 'x';                 // quadratic copying
long t1 = System.nanoTime();
StringBuilder sb = new StringBuilder();
for (int i = 0; i < n; i++) sb.append('x');           // linear
String fast = sb.toString();
long t2 = System.nanoTime();
System.out.println("+=: " + (t1 - t0) / 1_000_000 + " ms, StringBuilder: " + (t2 - t1) / 1_000_000 + " ms, same=" + s.equals(fast));`, alt: [{ lang: 'python', code: String.raw`
import time

n = 20_000
t0 = time.perf_counter()
s = ""
for _ in range(n):
    s += "x"              # may copy each time (CPython sometimes optimises this, never rely on it)
t1 = time.perf_counter()
fast = "".join("x" for _ in range(n))   # linear: collect pieces, join once
t2 = time.perf_counter()
print(f"+=: {(t1 - t0) * 1000:.1f} ms, join: {(t2 - t1) * 1000:.1f} ms, same={s == fast}")`, run: true }, { lang: 'js', code: String.raw`
const n = 20000;
let t0 = Date.now();
let s = '';
for (let i = 0; i < n; i++) s += 'x';     // V8 uses "rope" strings, so += is usually fine here...
let t1 = Date.now();
const parts = [];
for (let i = 0; i < n; i++) parts.push('x');
const fast = parts.join('');               // ...but array + join is the portable linear habit
let t2 = Date.now();
console.log('+=: ' + (t1 - t0) + ' ms, join: ' + (t2 - t1) + ' ms, same=' + (s === fast));`, run: true }, { lang: 'cpp', code: String.raw`
// std::string is mutable: s += 'x' appends in amortised O(1).
// The quadratic trap in C++ is s = s + 'x', which builds a brand-new string each time.
int n = 20'000;
string slow, fast;
for (int i = 0; i < n; i++) slow = slow + 'x';   // O(N^2): copies the whole string every time
for (int i = 0; i < n; i++) fast += 'x';         // O(N)
cout << (slow == fast) << '\n';                   // 1` }] } },
      { title: 'substring indexes: start inclusive, end exclusive', html: `<p><code>s.substring(i, j)</code> returns characters at positions i, i+1, …, j−1, so its length is <b>j − i</b>. To take k characters starting at i use <code>substring(i, i + k)</code>. Looping over all substrings uses <code>j</code> from <code>i + 1</code> to <code>n</code> inclusive.</p>
${H.arr(['c', 'o', 'd', 'e', 'r'], { label: 's', hl: { 1: 'b', 2: 'b', 3: 'b' } })}<p>${H.c('b', 's.substring(1, 4) = "ode"')} (indexes 1, 2, 3).</p>`, code: { code: String.raw`
String s = "coder";
System.out.println(s.substring(1, 4));   // ode
System.out.println(s.substring(2));      // der  (to the end)
for (int i = 0; i < 2; i++)
    for (int j = i + 1; j <= 3; j++)
        System.out.print(s.substring(i, j) + " ");   // c co cod o od`, alt: [{ lang: 'python', code: String.raw`
s = "coder"
print(s[1:4])        # ode  (start inclusive, end exclusive)
print(s[2:])         # der  (to the end)
print(s[-2:])        # er   (negative indexes count from the end)
print(*[s[i:j] for i in range(2) for j in range(i + 1, 4)])   # c co cod o od`, run: true }, { lang: 'js', code: String.raw`
const s = 'coder';
console.log(s.substring(1, 4));   // ode  (start inclusive, end exclusive)
console.log(s.slice(2));          // der  (slice also accepts negative indexes)
const out = [];
for (let i = 0; i < 2; i++) for (let j = i + 1; j <= 3; j++) out.push(s.substring(i, j));
console.log(out.join(' '));       // c co cod o od`, run: true }, { lang: 'cpp', code: String.raw`
string s = "coder";
// Careful: substr takes (start, LENGTH), not (start, end)!
cout << s.substr(1, 3) << '\n';   // ode  (3 characters from index 1)
cout << s.substr(2) << '\n';      // der  (to the end)
for (int i = 0; i < 2; i++)
    for (int j = i + 1; j <= 3; j++)
        cout << s.substr(i, j - i) << ' ';   // c co cod o od
// string_view(s).substr(i, len) avoids copying when you only need to read.` }] } },
      { title: 'Sorting descending and sorting 2D arrays', html: `<p><code>Arrays.sort(int[])</code> only sorts ascending. For descending, either sort and walk backwards, or use a boxed <code>Integer[]</code> with a comparator. Sorting intervals by start: <code>Arrays.sort(iv, (x, y) -&gt; Integer.compare(x[0], y[0]))</code>. Prefer <code>Integer.compare</code> over <code>x[0] - y[0]</code>, which can overflow.</p>`, code: { code: String.raw`
Integer[] boxed = {5, 1, 4};
Arrays.sort(boxed, Collections.reverseOrder());
System.out.println(Arrays.toString(boxed));          // [5, 4, 1]

int[][] iv = {{5, 6}, {1, 3}, {2, 4}};
Arrays.sort(iv, (x, y) -> Integer.compare(x[0], y[0]));
System.out.println(Arrays.deepToString(iv));         // [[1, 3], [2, 4], [5, 6]]`, alt: [{ lang: 'python', code: String.raw`
nums = [5, 1, 4]
print(sorted(nums, reverse=True))          # [5, 4, 1]
iv = [[5, 6], [1, 3], [2, 4]]
iv.sort(key=lambda x: x[0])                # sort by start (plain iv.sort() compares lists too)
print(iv)                                  # [[1, 3], [2, 4], [5, 6]]`, run: true }, { lang: 'js', code: String.raw`
const nums = [5, 1, 4, 10];
console.log([...nums].sort());                  // [ 1, 10, 4, 5 ]  string order: a classic bug!
console.log([...nums].sort((x, y) => y - x));   // [ 10, 5, 4, 1 ]  descending
const iv = [[5, 6], [1, 3], [2, 4]];
iv.sort((x, y) => x[0] - y[0]);                 // fine for small values (no overflow in JS doubles)
console.log(JSON.stringify(iv));                // [[1,3],[2,4],[5,6]]`, run: true }, { lang: 'cpp', code: String.raw`
vector<int> nums = {5, 1, 4};
sort(nums.begin(), nums.end(), greater<int>());              // 5 4 1
vector<array<int, 2>> iv = {{5, 6}, {1, 3}, {2, 4}};
sort(iv.begin(), iv.end(), [](const auto& x, const auto& y) { return x[0] < y[0]; });
// A comparator must return "x comes before y" (a strict <), never x[0] - y[0].
for (auto& p : iv) cout << "[" << p[0] << "," << p[1] << "] ";   // [1,3] [2,4] [5,6]` }] } },
      { title: 'Palindrome check with two indexes', html: `<p>A palindrome reads the same both ways ("racecar"). Compare <code>charAt(i)</code> with <code>charAt(n - 1 - i)</code> for the first half only. No new string, O(1) extra space — far better than building a reversed copy.</p>
${H.arr(['r', 'a', 'c', 'e', 'c', 'a', 'r'], { hl: { 0: 'g', 6: 'g', 1: 'b', 5: 'b', 2: 'p', 4: 'p', 3: 'y' } })}`, code: { code: String.raw`
String w = "racecar";
boolean pal = true;
for (int i = 0, j = w.length() - 1; i < j; i++, j--) {
    if (w.charAt(i) != w.charAt(j)) { pal = false; break; }
}
System.out.println(pal);   // true`, alt: [{ lang: 'python', code: String.raw`
w = "racecar"
pal = all(w[i] == w[-1 - i] for i in range(len(w) // 2))
print(pal)          # True  (w == w[::-1] is shorter but builds a reversed copy)`, run: true }, { lang: 'js', code: String.raw`
const w = 'racecar';
let pal = true;
for (let i = 0, j = w.length - 1; i < j; i++, j--) {
  if (w[i] !== w[j]) { pal = false; break; }
}
console.log(pal);   // true`, run: true }, { lang: 'cpp', code: String.raw`
string w = "racecar";
bool pal = true;
for (int i = 0, j = (int)w.size() - 1; i < j; i++, j--)
    if (w[i] != w[j]) { pal = false; break; }
cout << boolalpha << pal << '\n';   // true` }] } }
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
<p>Arrays are contiguous, so scanning them uses the CPU cache beautifully. Iterating a 2D array <b>row by row</b> (<code>g[r][c]</code> with c in the inner loop) is noticeably faster than column by column, because each row is one contiguous block.</p>
<h4>Strings and arrays in Python, JavaScript and C++</h4>
<ul><li><b>Python:</b> <code>str</code> is immutable, and <code>s += c</code> in a loop is only sometimes optimised by CPython — build a list and <code>"".join</code> it. Slicing copies (O(k)). A list stores pointers to objects, so a list of 10<sup>7</sup> ints costs far more than 40 MB; <code>array</code> or NumPy store raw numbers. Never build a grid with <code>[[0] * C] * R</code>: all rows would be the same list.</li>
<li><b>JavaScript:</b> strings are immutable UTF-16 like Java's (<code>"😀".length === 2</code>). <code>Array.prototype.sort()</code> without a comparator converts numbers to strings (<code>[10, 9, 1].sort()</code> gives <code>[1, 10, 9]</code>). Typed arrays (<code>Int32Array</code>) are fixed-size, zero-filled and compact — ideal counting arrays.</li>
<li><b>C++:</b> <code>std::string</code> is mutable and <code>+=</code> is amortised O(1), but <code>s = s + c</code> copies. <code>substr(pos, len)</code> takes a <b>length</b> and copies; <code>string_view</code> avoids the copy. <code>std::sort</code> is introsort (O(N log N) worst case, not stable; <code>stable_sort</code> is stable). <code>vector</code> copies are deep copies.</li></ul>`,
    aiEra: `<p><b>What AI changes:</b> assistants instantly recall API details (<code>copyOfRange</code> bounds, <code>split</code> regex quirks), so memorising every method is less critical than knowing <b>what exists</b> and <b>what it costs</b>.</p>
<p><b>Where AI goes wrong:</b> it uses <code>s += ...</code> in loops, calls <code>substring</code> inside nested loops without noticing the O(N³), compares Strings with <code>==</code>, mixes up <code>.length</code> / <code>.length()</code> / <code>.size()</code>, and writes <code>split(".")</code> (a regex meaning "any char" — returns an empty array!).</p>
<p><b>Use AI well:</b> <code>Review this string-processing code (Java / Python / JavaScript / C++) only for hidden O(N^2) costs and API misuse.</code> Ask for edge cases: empty string, single char, all same chars, mixed case, spaces.</p>
<p><b>What you must own:</b> choosing the representation (char array vs string vs builder vs counting array) from the constraints, and reasoning about index boundaries without running code.</p>`,
    problems: [{
      title: 'Valid Anagram',
      level: 'Easy', tags: ['strings', 'counting array'], companies: ['Amazon', 'Bloomberg', 'Google', 'Meta'],
      statement: `<p>Given two strings <code>s</code> and <code>t</code>, return <code>true</code> if <code>t</code> is an anagram of <code>s</code> (same letters, same counts, any order), otherwise <code>false</code>.</p>`,
      constraints: `1 ≤ s.length, t.length ≤ 5 × 10<sup>4</sup>; s and t consist of lowercase English letters.`,
      example: `<p><code>s = "anagram", t = "nagaram"</code> → ${H.c('g', 'true')} (a×3, n×1, g×1, r×1, m×1 in both).</p><p><code>s = "rat", t = "car"</code> → ${H.c('r', 'false')} ('t' vs 'c').</p>`,
      brute: { why: `<p>For each character of <code>s</code>, search for it in a list of <code>t</code>'s characters and remove it. Each search/removal scans up to N characters, so the total is O(N²) ≈ 2.5 × 10<sup>9</sup> steps for N = 5 × 10<sup>4</sup> — too slow. The wasted work: we re-scan <code>t</code> again and again just to ask "how many of this letter are left?" — a question a counter answers in O(1).</p>`, code: { lang: 'java', code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
def is_anagram(s, t):
    if len(s) != len(t):
        return False
    pool = list(t)
    for c in s:
        try:
            pool.remove(c)           # O(N) scan + shift
        except ValueError:
            return False
    return True` }, { lang: 'js', code: String.raw`
function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const pool = t.split('');
  for (const c of s) {
    const i = pool.indexOf(c);       // O(N) scan
    if (i < 0) return false;
    pool.splice(i, 1);               // O(N) shift
  }
  return true;
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    bool isAnagram(const string& s, const string& t) {
        if (s.size() != t.size()) return false;
        string pool = t;
        for (char c : s) {
            size_t i = pool.find(c);           // O(N) scan
            if (i == string::npos) return false;
            pool.erase(i, 1);                  // O(N) shift
        }
        return true;
    }
};` }] } },
      mcq: { q: 'Input is guaranteed to be lowercase English letters. Which structure counts letters most efficiently?', options: ['int[26] indexed by c - \'a\'', 'HashMap&lt;Character, Integer&gt;', 'Sorting both strings', 'A List&lt;Character&gt;'], answer: 0, explain: 'A fixed 26-cell array gives O(1) access with no hashing or boxing. HashMap works too but is slower; sorting is O(N log N).' },
      hints: [`<p>Hint 1: Two strings are anagrams exactly when every letter appears the same number of times in both. Order does not matter at all.</p>`, `<p>Hint 2: One <code>int[26]</code>: +1 for each letter of s, −1 for each letter of t. If they are anagrams, every cell returns to 0.</p>`, `<p>Hint 3: Early exit when lengths differ. Recipe: if lengths differ → false; for i: cnt[s[i]−'a']++, cnt[t[i]−'a']−−; return all cells == 0. Unicode follow-up → use a hash map (<code>HashMap</code> / <code>dict</code> or <code>Counter</code> / <code>Map</code> / <code>unordered_map</code>).</p>`],
      tests: { sig: 'string string -> bool', fn: 'isAnagram', cases: [
        [['anagram', 'nagaram'], true],
        [['rat', 'car'], false],
        [['a', 'a'], true],
        [['a', 'b'], false],
        [['ab', 'a'], false],
        [['aacc', 'ccac'], false],
        [['abc', 'cba'], true],
        [['ab'.repeat(1000), 'ba'.repeat(1000)], true]
      ] },
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

print(is_anagram("anagram", "nagaram"), is_anagram("rat", "car"))  # True False`, run: true }, { lang: 'js', code: String.raw`
function isAnagram(s, t) {
  if (s.length !== t.length) return false;   // quick reject
  const cnt = new Int32Array(26);            // typed array: 26 zeroed counters
  for (let i = 0; i < s.length; i++) {
    cnt[s.charCodeAt(i) - 97]++;             // 97 is the code of 'a'
    cnt[t.charCodeAt(i) - 97]--;
  }
  return cnt.every((c) => c === 0);
}

console.log(isAnagram('anagram', 'nagaram'), isAnagram('rat', 'car'));  // true false`, run: true }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    bool isAnagram(const string& s, const string& t) {
        if (s.size() != t.size()) return false;    // quick reject
        array<int, 26> cnt{};                      // value-initialised to zeros
        for (size_t i = 0; i < s.size(); i++) {
            cnt[s[i] - 'a']++;
            cnt[t[i] - 'a']--;
        }
        for (int c : cnt) if (c != 0) return false;
        return true;
    }
};` }],
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
<p>In a judge program with <code>main</code>, make helpers <code>static</code> so <code>main</code> (which is static) can call them directly. On LeetCode your methods live inside <code>class Solution</code> and are instance methods; helpers you add there can be plain <code>private</code> methods. In Python and JavaScript, helpers are usually plain functions defined at the top level (or nested inside the function that uses them); in Python, methods of <code>class Solution</code> take <code>self</code> first. In C++, write free functions above <code>main</code> (declare before use) or private members of <code>Solution</code>.</p>
<h4>Overloading</h4>
<p>Several methods may share a name if their <b>parameter lists differ</b>: <code>max(int, int)</code> and <code>max(long, long)</code>. Java picks the best match at <b>compile time</b>. The return type alone cannot distinguish overloads. C++ overloads the same way. <b>Python and JavaScript have no overloading</b>: a second definition with the same name silently replaces the first, so use default arguments (<code>def f(x, scale=1)</code>, <code>function f(x, scale = 1)</code>) or check the argument type instead.</p>
<h4>Methods calling methods — the call stack</h4>
<p>Every call pushes a new frame; <code>return</code> pops it and hands the value back to the caller, which continues exactly where it paused. A method may even call <b>itself</b> (recursion) as long as it has a <b>base case</b> that stops the chain — you will master this in the Recursion module.</p>
${H.table(['Call stack while computing isArmstrong(153)', ''], [['main', 'waiting for isArmstrong'], ['isArmstrong(153)', 'waiting for countDigits'], [H.c('y', 'countDigits(153)'), H.c('y', 'running → returns 3')]])}`,
    clues: [
      '"Implement the function <code>xyz(...)</code>" → that signature is your contract; add private helpers freely',
      'The same check appears in several places (bounds, validity, digit sum) → extract a helper method',
      '"For each of Q queries, answer…" → write <code>solve(query)</code> and call it in a loop; reset state inside',
      '"Return two values" (e.g. min and max) → return an <code>int[]</code> or a <code>record</code> (Java), a tuple (Python), an object or array to destructure (JavaScript), a <code>pair</code> or <code>struct</code> (C++)',
      '"Defined recursively" (e.g. f(n) = f(n−1) + …) → a method that calls itself with a base case',
      'Interviewer says "assume a helper exists for X" → write its signature, explain its contract, implement later'
    ],
    code: [{ code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
# A tiny helper library. Plain module-level functions are the Python way.
import math

def gcd(a, b):
    while b:
        a, b = b, a % b          # Euclid: gcd(a, b) = gcd(b, a % b)
    return abs(a)                # (the standard library has math.gcd)

def power(base, exp):
    return base ** exp           # exact for ints of any size (pow(b, e, m) does modular power)

def in_bounds(r, c, rows, cols):
    return 0 <= r < rows and 0 <= c < cols   # chained comparison

def is_prime(n):
    if n < 2:
        return False
    return all(n % d for d in range(2, math.isqrt(n) + 1))   # isqrt: exact integer square root

# No overloading in Python: one function works for any numeric type.
print(gcd(84, 36), power(3, 4), is_prime(97), in_bounds(2, 3, 3, 3), max(4, 9), max(4, 10_000_000_000))
# 12 81 True False 9 10000000000`, run: true }, { lang: 'js', code: String.raw`
function gcd(a, b) {
  while (b !== 0) [a, b] = [b, a % b];   // Euclid
  return Math.abs(a);
}

function power(base, exp) {
  let result = 1;
  for (let i = 0; i < exp; i++) result *= base;   // exact while the result stays below 2^53
  return result;
}

const inBounds = (r, c, rows, cols) => r >= 0 && r < rows && c >= 0 && c < cols;

function isPrime(n) {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;   // early return
  return true;
}

// No overloading in JS: a later function with the same name REPLACES the earlier one.
console.log(gcd(84, 36), power(3, 4), isPrime(97), inBounds(2, 3, 3, 3), Math.max(4, 9), Math.max(4, 10000000000));
// 12 81 true false 9 10000000000`, run: true }, { lang: 'cpp', code: String.raw`
#include <bits/stdc++.h>
using namespace std;

long long gcdLL(long long a, long long b) {        // (C++17 has std::gcd in <numeric>)
    while (b != 0) { long long t = a % b; a = b; b = t; }
    return llabs(a);
}

long long power(long long base, int exp) {
    long long result = 1;
    for (int i = 0; i < exp; i++) result *= base;
    return result;
}

bool inBounds(int r, int c, int rows, int cols) { return r >= 0 && r < rows && c >= 0 && c < cols; }

bool isPrime(int n) {
    if (n < 2) return false;
    for (long long d = 2; d * d <= n; d++) if (n % d == 0) return false;
    return true;
}

// Overloading works in C++, chosen at compile time like Java.
int myMax(int a, int b) { return a > b ? a : b; }
long long myMax(long long a, long long b) { return a > b ? a : b; }

int main() {
    cout << gcdLL(84, 36) << " " << power(3, 4) << " " << boolalpha << isPrime(97) << " "
         << inBounds(2, 3, 3, 3) << " " << myMax(4, 9) << " " << myMax(4LL, 10'000'000'000LL) << '\n';
    // 12 81 true false 9 10000000000
    return 0;
}` }] }, { code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
from typing import NamedTuple

class MinMax(NamedTuple):        # a light immutable record with named fields
    min: int
    max: int

def min_max(a):
    return MinMax(min(a), max(a))

r = min_max([4, -2, 9, 7])
print(r.min, r.max)              # -2 9
print(r)                         # MinMax(min=-2, max=9)
lo, hi = r                       # a plain tuple "return lo, hi" also unpacks like this`, run: true }, { lang: 'js', code: String.raw`
// Return an object and destructure it at the call site.
function minMax(a) {
  let lo = Infinity, hi = -Infinity;
  for (const v of a) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  return { min: lo, max: hi };
}

const { min, max } = minMax([4, -2, 9, 7]);
console.log(min, max);   // -2 9`, run: true }, { lang: 'cpp', code: String.raw`
#include <bits/stdc++.h>
using namespace std;

struct MinMax { int min, max; };     // a tiny aggregate type

MinMax minMax(const vector<int>& a) {
    auto [lo, hi] = minmax_element(a.begin(), a.end());   // STL returns two iterators
    return {*lo, *hi};
}

int main() {
    auto [mn, mx] = minMax({4, -2, 9, 7});   // structured binding (C++17)
    cout << mn << " " << mx << '\n';         // -2 9
    return 0;
}` }] }],
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
        var PY = 'def is_armstrong(n):\n    k = count_digits(n)\n    total = 0\n    m = n\n    while m > 0:\n        total += power(m % 10, k)\n        m //= 10\n    return total == n',
            JS = 'function isArmstrong(n) {\n    const k = countDigits(n);\n    let sum = 0;\n    for (let m = n; m > 0; m = Math.floor(m / 10))\n        sum += power(m % 10, k);\n    return sum === n;\n}',
            CPP = 'bool isArmstrong(int n) {\n    int k = countDigits(n);\n    long long sum = 0;\n    for (int m = n; m > 0; m /= 10)\n        sum += power(m % 10, k);\n    return sum == n;\n}';
        var ALT = { python: { code: PY, map: { 4: 7, 5: 6, 6: 8 } }, js: { code: JS }, cpp: { code: CPP } };
        frames.push({ narr: '<code>main</code> calls <code>isArmstrong(' + n + ')</code>. Java pushes a new frame with its own copy of n. main is <b>paused</b>, waiting for a boolean.', parts: [
          { type: 'stack', label: 'Call stack', items: ['main', 'isArmstrong(n=' + n + ')'], hl: { 1: 'cur' } },
          { type: 'code', lang: 'java', code: CODE, alt: ALT, hl: { 1: 'cur' } }
        ] });
        frames.push({ narr: 'First line calls the helper <code>countDigits(' + n + ')</code>: another frame on top. isArmstrong pauses mid-line.', parts: [
          { type: 'stack', label: 'Call stack', items: ['main', 'isArmstrong(n=' + n + ')', 'countDigits(' + n + ')'], hl: { 2: 'cur' } },
          { type: 'code', lang: 'java', code: CODE, alt: ALT, hl: { 2: 'cur' } }
        ] });
        frames.push({ narr: 'countDigits finishes and <b>returns ' + k + '</b>. Its frame is popped; isArmstrong resumes and stores k = ' + k + '.', parts: [
          { type: 'stack', label: 'Call stack', items: ['main', 'isArmstrong(n=' + n + ')'], hl: { 1: 'ok' } },
          { type: 'vars', vals: { n: n, k: k, sum: 0 }, hl: { k: 'ok' } },
          { type: 'code', lang: 'java', code: CODE, alt: ALT, hl: { 2: 'ok', 3: 'cur' } }
        ] });
        var sum = 0, m = n;
        while (m > 0) {
          var d = m % 10, pw = Math.pow(d, k);
          frames.push({ narr: 'Digit <b>' + d + '</b>: call <code>power(' + d + ', ' + k + ')</code>. A fresh frame computes ' + d + '<sup>' + k + '</sup> = ' + pw + ' and returns it.', parts: [
            { type: 'stack', label: 'Call stack', items: ['main', 'isArmstrong(n=' + n + ')', 'power(' + d + ', ' + k + ') → ' + pw], hl: { 2: 'cur' } },
            { type: 'vars', vals: { m: m, digit: d, k: k, sum: sum }, hl: { digit: 'cur' } },
            { type: 'code', lang: 'java', code: CODE, alt: ALT, hl: { 5: 'cur' } }
          ] });
          sum += pw;
          m = Math.floor(m / 10);
          frames.push({ narr: 'power returned; its frame is gone. sum += ' + pw + ' → <b>' + sum + '</b>. Drop the digit: m = ' + m + '.', parts: [
            { type: 'stack', label: 'Call stack', items: ['main', 'isArmstrong(n=' + n + ')'], hl: { 1: 'cur' } },
            { type: 'vars', vals: { m: m, k: k, sum: sum }, hl: { sum: 'ok' } },
            { type: 'code', lang: 'java', code: CODE, alt: ALT, hl: { 4: 'cur' } }
          ] });
        }
        var ans = sum === n;
        frames.push({ narr: 'Loop done. <code>return sum == n</code> → ' + sum + (ans ? ' == ' : ' ≠ ') + n + ' → <b>' + ans + '</b>. ' + (ans ? n + ' is an Armstrong number!' : n + ' is not an Armstrong number. Try 153, 370, 371, 407, 1634, 8208, 9474 or 54748.'), parts: [
          { type: 'stack', label: 'Call stack', items: ['main'], hl: { 0: ans ? 'ok' : 'bad' } },
          { type: 'vars', vals: { n: n, sum: sum, result: String(ans) }, hl: { result: ans ? 'sel' : 'bad' } },
          { type: 'code', lang: 'java', code: CODE, alt: ALT, hl: { 6: ans ? 'ok' : 'bad' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Helper for grid neighbours', html: `<p>Counting land cells next to water appears in many grid problems. With an <code>inBounds</code> helper the neighbour loop shrinks to one readable line, and the edge-of-grid bugs live in exactly one place.</p>
${H.table(['grid', '', ''], [['1', '1', '0'], ['0', '1', '0'], ['0', '0', '0']])}<p>Land cells touching water (or the border) on any side: all 3.</p>`, code: { code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
DR = ((-1, 0), (1, 0), (0, -1), (0, 1))

def in_bounds(g, r, c):
    return 0 <= r < len(g) and 0 <= c < len(g[0])

def is_coast(g, r, c):
    return any(not in_bounds(g, r + dr, c + dc) or g[r + dr][c + dc] == 0 for dr, dc in DR)

g = [[1, 1, 0], [0, 1, 0], [0, 0, 0]]
print(sum(1 for r in range(3) for c in range(3) if g[r][c] == 1 and is_coast(g, r, c)))   # 3`, run: true }, { lang: 'js', code: String.raw`
const DR = [-1, 1, 0, 0], DC = [0, 0, -1, 1];
const inBounds = (g, r, c) => r >= 0 && r < g.length && c >= 0 && c < g[0].length;

function isCoast(g, r, c) {
  for (let d = 0; d < 4; d++) {
    const nr = r + DR[d], nc = c + DC[d];
    if (!inBounds(g, nr, nc) || g[nr][nc] === 0) return true;   // early return
  }
  return false;
}

const g = [[1, 1, 0], [0, 1, 0], [0, 0, 0]];
let count = 0;
for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (g[r][c] === 1 && isCoast(g, r, c)) count++;
console.log(count);   // 3`, run: true }, { lang: 'cpp', code: String.raw`
#include <bits/stdc++.h>
using namespace std;

const int DR[] = {-1, 1, 0, 0}, DC[] = {0, 0, -1, 1};

bool inBounds(const vector<vector<int>>& g, int r, int c) {
    return r >= 0 && r < (int)g.size() && c >= 0 && c < (int)g[0].size();
}

bool isCoast(const vector<vector<int>>& g, int r, int c) {   // const&: no copy, no edits
    for (int d = 0; d < 4; d++) {
        int nr = r + DR[d], nc = c + DC[d];
        if (!inBounds(g, nr, nc) || g[nr][nc] == 0) return true;
    }
    return false;
}

int main() {
    vector<vector<int>> g = {{1, 1, 0}, {0, 1, 0}, {0, 0, 0}};
    int count = 0;
    for (int r = 0; r < 3; r++) for (int c = 0; c < 3; c++) if (g[r][c] == 1 && isCoast(g, r, c)) count++;
    cout << count << '\n';   // 3
    return 0;
}` }] } },
      { title: 'Overload resolution surprises', html: `<p>Java chooses an overload at compile time in phases: <b>exact/widening</b> first, then <b>boxing</b>, then <b>varargs</b>. So <code>f(5)</code> prefers <code>f(long)</code> (widening) over <code>f(Integer)</code> (boxing).</p>
${H.table(['Call', 'Available', 'Chosen'], [['<code>f(5)</code>', 'f(long), f(Integer)', H.c('g', 'f(long)')], ['<code>f(5)</code>', 'f(Integer), f(int...)', H.c('g', 'f(Integer)')]])}`, code: { code: String.raw`
class Over {
    static String f(long x) { return "long"; }
    static String f(Integer x) { return "Integer"; }
    static String g(Integer x) { return "Integer"; }
    static String g(int... x) { return "varargs"; }
    public static void main(String[] args) {
        System.out.println(f(5) + " " + g(5));   // long Integer
    }
}`, alt: [{ lang: 'python', code: String.raw`
# Python has NO overloading: a second def with the same name replaces the first.
def f(x: int):
    return "int"

def f(x: float):        # silently replaces the int version
    return "float"

print(f(5))             # float  (type hints do not choose anything at runtime)

# Do it with one function instead: default arguments or a type check.
def g(x, scale=1):
    return x * scale

print(g(5), g(5, 3))    # 5 15`, run: true }, { lang: 'js', code: String.raw`
// JS has NO overloading: the later declaration wins.
function f(x) { return 'first'; }
function f(x, y) { return 'second'; }
console.log(f(5));        // second

// Instead, branch on what you received, or use default parameters.
function g(x, scale = 1) { return typeof x === 'string' ? x.repeat(scale) : x * scale; }
console.log(g(5), g(5, 3), g('ab', 2));   // 5 15 abab`, run: true }, { lang: 'cpp', code: String.raw`
#include <bits/stdc++.h>
using namespace std;

// C++ overloading: exact match beats promotion, which beats conversion.
string g(int) { return "int"; }
string g(double) { return "double"; }

int main() {
    cout << g(5) << " " << g(5.0) << " " << g('a') << '\n';   // int double int ('a' promotes to int)
    // g(5L) would be a compile error: long -> int and long -> double are equally good (ambiguous).
    return 0;
}` }] } },
      { title: 'Static state is not reset between test cases', html: `<p>LeetCode runs all test cases in the <b>same JVM</b>, creating a new <code>Solution</code> object per test but <b>keeping static fields</b>. A static counter that you forget to reset gives correct output on the first test and wrong output on later ones. Prefer local variables or instance fields, and reset any shared state at the start of each call. The same bug appears with Python class attributes and mutable default arguments, JavaScript module-level variables, and C++ globals or <code>static</code> members.</p>`, code: { code: String.raw`
class Solution {
    static int calls = 0;                 // shared across ALL test cases (danger)
    private int localCalls = 0;           // fresh for each new Solution object

    public int countSomething(int[] a) {
        calls = 0;                        // reset explicitly if you must use static
        for (int v : a) if (v > 0) { calls++; localCalls++; }
        return calls;
    }
}`, alt: [{ lang: 'python', code: String.raw`
# Python's version of "state that survives between test cases":
# class attributes and MUTABLE DEFAULT ARGUMENTS are created only once.
class Solution:
    calls = 0                                 # class attribute: shared by every instance (danger)

    def count_something(self, a, seen=[]):    # BUG: this list is created ONCE and reused forever
        seen.append(len(a))
        return sum(1 for v in a if v > 0)

    def count_safe(self, a, seen=None):
        seen = [] if seen is None else seen   # the safe idiom: fresh list per call
        return sum(1 for v in a if v > 0)` }, { lang: 'js', code: String.raw`
// Module-level variables survive between test cases if the judge reuses the process.
let calls = 0;                           // shared (danger)

function countSomething(a) {
  calls = 0;                             // reset explicitly if you must keep it outside
  let local = 0;                         // better: local state, fresh on every call
  for (const v of a) if (v > 0) { calls++; local++; }
  return local;
}` }, { lang: 'cpp', code: String.raw`
// Globals and static members live for the whole program: reset them per test case.
class Solution {
    static inline int calls = 0;          // shared across ALL test cases (danger), C++17 inline static
    int localCalls = 0;                   // fresh for each new Solution object
public:
    int countSomething(vector<int>& a) {
        calls = 0;                        // reset explicitly if you must use static
        for (int v : a) if (v > 0) { calls++; localCalls++; }
        return calls;
    }
};` }] } },
      { title: 'A first recursive method', html: `<p><code>sumTo(n)</code> = n + sumTo(n − 1), with <b>base case</b> sumTo(0) = 0. Each call waits for the smaller one, so the stack grows to depth n, then unwinds adding numbers on the way back.</p>
${H.table(['call', 'returns'], [['sumTo(3)', '3 + sumTo(2) = 6'], ['sumTo(2)', '2 + sumTo(1) = 3'], ['sumTo(1)', '1 + sumTo(0) = 1'], ['sumTo(0)', H.c('g', '0 (base case)')]])}`, code: { code: String.raw`
class Rec {
    static long sumTo(int n) {
        if (n == 0) return 0;          // base case stops the chain
        return n + sumTo(n - 1);       // smaller sub-problem
    }
    public static void main(String[] args) { System.out.println(sumTo(3) + " " + sumTo(1000)); }   // 6 500500
}`, alt: [{ lang: 'python', code: String.raw`
def sum_to(n):
    if n == 0:
        return 0            # base case stops the chain
    return n + sum_to(n - 1)

print(sum_to(3), sum_to(900))   # 6 405450
# sum_to(1000) raises RecursionError: Python's default limit is about 1000 frames.`, run: true }, { lang: 'js', code: String.raw`
function sumTo(n) {
  if (n === 0) return 0;           // base case stops the chain
  return n + sumTo(n - 1);         // smaller sub-problem
}

console.log(sumTo(3), sumTo(1000));   // 6 500500`, run: true }, { lang: 'cpp', code: String.raw`
#include <bits/stdc++.h>
using namespace std;

long long sumTo(int n) {
    if (n == 0) return 0;          // base case stops the chain
    return n + sumTo(n - 1);       // smaller sub-problem
}

int main() {
    cout << sumTo(3) << " " << sumTo(1000) << '\n';   // 6 500500
    return 0;
}` }] } }
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
<p><code>static int sum(int... xs)</code> receives an <code>int[]</code>; each call allocates an array, so avoid varargs in hot inner loops. Generic helpers like <code>static &lt;T extends Comparable&lt;T&gt;&gt; T maxOf(List&lt;T&gt; xs)</code> work with any comparable type but box primitives.</p>
<h4>Functions in Python, JavaScript and C++</h4>
<ul><li><b>Python:</b> function calls are relatively expensive (no JIT in CPython), so a helper called 10<sup>7</sup> times can matter; built-ins like <code>sum</code>, <code>max</code> and <code>sorted</code> run in C and are much faster than hand-written loops. Beware <b>mutable default arguments</b> (<code>def f(seen=[])</code>): the list is created once and shared by every call.</li>
<li><b>JavaScript:</b> functions are values: arrow functions (<code>(r, c) =&gt; ...</code>) make tiny helpers cheap to write, and V8 inlines hot small functions like the JVM does. Module-level variables persist between calls, so reset them per test.</li>
<li><b>C++:</b> small functions are inlined by the optimiser. Pass big objects as <code>const T&amp;</code> (read-only, no copy) or <code>T&amp;</code> (to modify); passing a <code>vector</code> by value copies it every call — a classic hidden O(N) per call. Lambdas (<code>[&amp;](int r, int c) { ... }</code>) are handy local helpers.</li></ul>`,
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
      brute: { why: `<p>One long loop body that converts each number to a String to count digits, then calls a floating-point power function (<code>Math.pow</code> / <code>math.pow</code> / <code>pow</code>, which return a <b>double</b>) for every digit and converts back. It works, but it is hard to read, allocates a string per number, recomputes the same small powers millions of times, and relies on double rounding being exact. Nothing is reusable or testable on its own.</p>`, code: { lang: 'java', code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
import math

def armstrong(lo, hi):
    out = []
    for n in range(lo, hi + 1):
        k = len(str(n))                          # allocates a string every time
        total, m = 0, n
        while m > 0:
            total += int(math.pow(m % 10, k))    # float math for integer powers
            m //= 10
        if total == n:
            out.append(n)
    return out` }, { lang: 'js', code: String.raw`
function armstrong(lo, hi) {
  const out = [];
  for (let n = lo; n <= hi; n++) {
    const k = String(n).length;                  // allocates a string every time
    let sum = 0, m = n;
    while (m > 0) {
      sum += Math.pow(m % 10, k);                // float math for integer powers
      m = Math.floor(m / 10);
    }
    if (sum === n) out.push(n);
  }
  return out;
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    vector<int> armstrong(int lo, int hi) {
        vector<int> out;
        for (int n = lo; n <= hi; n++) {
            int k = to_string(n).size();             // allocates a string every time
            int sum = 0, m = n;
            while (m > 0) {
                sum += (int) pow(m % 10, k);         // double math for integer powers
                m /= 10;
            }
            if (sum == n) out.push_back(n);
        }
        return out;
    }
};` }] } },
      mcq: { q: 'Why is <code>(int) Math.pow(d, k)</code> considered risky for integer powers in general?', options: ['It computes in double and can round below the true value for large results', 'It is a compile error', 'It only accepts positive bases', 'It always returns 0 for k &gt; 3'], answer: 0, explain: 'Math.pow returns a double. For small values it is exact, but large integer powers may not be representable exactly, and casting truncates. Integer loops or precomputed tables are exact.' },
      hints: [`<p>Hint 1: Split the job into tiny questions: "how many digits does n have?", "what is d<sup>k</sup>?", "is n Armstrong?". Each is a helper.</p>`, `<p>Hint 2: Only digits 0–9 are ever raised to a power, and k ≤ 7. Precompute <code>pow[k][d]</code> once with integer multiplication.</p>`, `<p>Hint 3: Remember 1-digit numbers are all Armstrong (d¹ = d). Recipe: build pow table → for n in [lo, hi]: k = countDigits(n); if digitPowerSum(n, k) == n add n.</p>`],
      tests: { sig: 'int int -> list<int>', fn: 'armstrong', cases: [
        [[100, 500], [153, 370, 371, 407]],
        [[1, 1], [1]],
        [[1, 9], [1, 2, 3, 4, 5, 6, 7, 8, 9]],
        [[10, 99], []],
        [[154, 154], []],
        [[9474, 9474], [9474]],
        [[1, 1000000], [1, 2, 3, 4, 5, 6, 7, 8, 9, 153, 370, 371, 407, 1634, 8208, 9474, 54748, 92727, 93084, 548834]]
      ] },
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

print(armstrong(100, 500))  # [153, 370, 371, 407]`, run: true }, { lang: 'js', code: String.raw`
// POW[k][d] = d^k for k = 0..7, d = 0..9, built once with exact integer multiplication
const POW = Array.from({ length: 8 }, (_, k) => Array.from({ length: 10 }, (_, d) => d ** k));

function countDigits(n) {
  let k = 0;
  do { k++; n = Math.floor(n / 10); } while (n > 0);   // 0 has one digit
  return k;
}

function digitPowerSum(n, k) {
  let sum = 0;
  for (let m = n; m > 0; m = Math.floor(m / 10)) sum += POW[k][m % 10];
  return sum;
}

const isArmstrong = (n) => digitPowerSum(n, countDigits(n)) === n;

function armstrong(lo, hi) {
  const out = [];
  for (let n = lo; n <= hi; n++) if (isArmstrong(n)) out.push(n);
  return out;
}

console.log(armstrong(100, 500));  // [ 153, 370, 371, 407 ]`, run: true }, { lang: 'cpp', code: String.raw`
class Solution {
    long long POW[8][10];   // POW[k][d] = d^k

    static int countDigits(int n) {
        int k = 0;
        do { k++; n /= 10; } while (n > 0);   // 0 has one digit
        return k;
    }

    long long digitPowerSum(int n, int k) const {
        long long sum = 0;
        for (int m = n; m > 0; m /= 10) sum += POW[k][m % 10];
        return sum;
    }

    bool isArmstrong(int n) const { return digitPowerSum(n, countDigits(n)) == n; }

public:
    Solution() {
        for (int d = 0; d <= 9; d++) {
            POW[0][d] = 1;
            for (int k = 1; k < 8; k++) POW[k][d] = POW[k - 1][d] * d;
        }
    }

    vector<int> armstrong(int lo, int hi) {
        vector<int> out;
        for (int n = lo; n <= hi; n++) if (isArmstrong(n)) out.push_back(n);
        return out;
    }
};` }],
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
<p>A typical judge runs roughly <b>10<sup>8</sup> simple operations per second</b> in Java, C++ and JavaScript (a rough rule of thumb: real speed depends on what each operation does). <b>Pure Python is about 10× slower, roughly 10<sup>7</sup></b>, which is why Python solutions lean on built-ins and why some judges give Python a longer limit. With a 1–2 second limit, aim for at most ~10<sup>8</sup> basic steps. So: plug the largest N into your complexity and compare against 10<sup>8</sup> (10<sup>7</sup> for Python).</p>
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
    code: [{ code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
import math

# Pure-Python loops run roughly 10^7 simple steps per second: about 10x slower than Java or C++.
OPS_PER_SEC = 1e7

def verdict(ops, limit_sec):
    secs = ops / OPS_PER_SEC
    if secs <= limit_sec * 0.5:
        return "comfortable"
    if secs <= limit_sec:
        return "risky but maybe"
    return "TLE"

n = 1e5
print("N       :", verdict(n, 1))                  # comfortable
print("N log N :", verdict(n * math.log2(n), 1))   # comfortable (~0.17 s even in Python)
print("N^2     :", verdict(n * n, 1))              # TLE (~1000 s in Python!)
# Memory: a Python list of 10^7 ints costs ~8 bytes per slot + ~28 bytes per distinct int object.
# array.array("i") or NumPy stores 4 bytes per int.
print(10_000_000 * 4 // (1024 * 1024), "MB as a packed int32 array")   # 38 MB`, run: true }, { lang: 'js', code: String.raw`
// Node (V8 JIT) runs tight loops at roughly 10^8 simple steps per second, similar to Java.
const OPS_PER_SEC = 1e8;

function verdict(ops, limitSec) {
  const secs = ops / OPS_PER_SEC;
  if (secs <= limitSec * 0.5) return 'comfortable';
  if (secs <= limitSec) return 'risky but maybe';
  return 'TLE';
}

const n = 1e5;
console.log('N       : ' + verdict(n, 1));                  // comfortable
console.log('N log N : ' + verdict(n * Math.log2(n), 1));   // comfortable
console.log('N^2     : ' + verdict(n * n, 1));              // TLE
// Memory: an Int32Array of 10^7 costs 40 MB; a plain array of numbers costs about 8 bytes per slot.
console.log(Math.floor(1e7 * Int32Array.BYTES_PER_ELEMENT / (1024 * 1024)) + ' MB');   // 38 MB`, run: true }, { lang: 'cpp', code: String.raw`
#include <bits/stdc++.h>
using namespace std;

// Compiled C++ often does 10^8 to 10^9 simple steps per second; plan with 10^8 to be safe.
const double OPS_PER_SEC = 1e8;

string verdict(double ops, double limitSec) {
    double secs = ops / OPS_PER_SEC;
    if (secs <= limitSec * 0.5) return "comfortable";
    if (secs <= limitSec) return "risky but maybe";
    return "TLE";
}

int main() {
    double n = 1e5;
    cout << "N       : " << verdict(n, 1) << '\n';               // comfortable
    cout << "N log N : " << verdict(n * log2(n), 1) << '\n';     // comfortable
    cout << "N^2     : " << verdict(n * n, 1) << '\n';           // TLE
    cout << 10'000'000LL * sizeof(int) / (1024 * 1024) << " MB\n";   // 38 MB
    return 0;
}` }] }],
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
<p><b>Trap:</b> allocating <code>new int[1_000_001]</code> <b>per test case</b> in B costs 10<sup>4</sup> × 10<sup>6</sup> = 10<sup>10</sup> writes! Allocate once and reset only the cells you touched.</p>`, code: { code: String.raw`
// Reset only what you used, not the whole big array.
int[] freq = new int[1_000_001];          // allocated ONCE
int[][] tests = {{5, 5, 7}, {1, 2}, {9}};
for (int[] a : tests) {
    int dup = 0;
    for (int v : a) if (++freq[v] == 2) dup++;
    System.out.print(dup + " ");          // 1 0 0
    for (int v : a) freq[v] = 0;           // O(size of this test), not O(1e6)
}`, alt: [{ lang: 'python', code: String.raw`
freq = [0] * 1_000_001                 # allocated ONCE
tests = [[5, 5, 7], [1, 2], [9]]
out = []
for a in tests:
    dup = 0
    for v in a:
        freq[v] += 1
        if freq[v] == 2:
            dup += 1
    out.append(dup)
    for v in a:
        freq[v] = 0                    # O(size of this test), not O(1e6)
print(*out)                            # 1 0 0`, run: true }, { lang: 'js', code: String.raw`
const freq = new Int32Array(1000001);  // allocated ONCE
const tests = [[5, 5, 7], [1, 2], [9]];
const out = [];
for (const a of tests) {
  let dup = 0;
  for (const v of a) if (++freq[v] === 2) dup++;
  out.push(dup);
  for (const v of a) freq[v] = 0;      // O(size of this test), not O(1e6)
}
console.log(out.join(' '));            // 1 0 0`, run: true }, { lang: 'cpp', code: String.raw`
static int freq[1'000'001];            // allocated ONCE (static: zeroed, and not on the small stack)
vector<vector<int>> tests = {{5, 5, 7}, {1, 2}, {9}};
for (auto& a : tests) {
    int dup = 0;
    for (int v : a) if (++freq[v] == 2) dup++;
    cout << dup << ' ';                // 1 0 0
    for (int v : a) freq[v] = 0;       // O(size of this test), not O(1e6)
}` }] } },
      { title: 'Queries multiply your cost', html: `<p>N = 10<sup>5</sup> numbers and Q = 10<sup>5</sup> questions "sum of a[l..r]". Looping over the range per query: up to 10<sup>5</sup> × 10<sup>5</sup> = 10<sup>10</sup> → TLE. Precompute prefix sums once (O(N)) and answer each query in O(1): total 2 · 10<sup>5</sup>. Whenever you see Q, multiply!</p>`, code: { code: String.raw`
int[] a = {3, 1, 4, 1, 5};
long[] pre = new long[a.length + 1];
for (int i = 0; i < a.length; i++) pre[i + 1] = pre[i] + a[i];
int[][] queries = {{0, 2}, {1, 4}};
for (int[] q : queries) System.out.print((pre[q[1] + 1] - pre[q[0]]) + " ");   // 8 11`, alt: [{ lang: 'python', code: String.raw`
from itertools import accumulate

a = [3, 1, 4, 1, 5]
pre = [0, *accumulate(a)]              # pre[i] = a[0] + ... + a[i-1]
queries = [(0, 2), (1, 4)]
print(*(pre[r + 1] - pre[l] for l, r in queries))   # 8 11`, run: true }, { lang: 'js', code: String.raw`
const a = [3, 1, 4, 1, 5];
const pre = [0];
for (const v of a) pre.push(pre[pre.length - 1] + v);
const queries = [[0, 2], [1, 4]];
console.log(queries.map(([l, r]) => pre[r + 1] - pre[l]).join(' '));   // 8 11`, run: true }, { lang: 'cpp', code: String.raw`
vector<int> a = {3, 1, 4, 1, 5};
vector<long long> pre(a.size() + 1, 0);
partial_sum(a.begin(), a.end(), pre.begin() + 1);   // STL prefix sums
vector<pair<int, int>> queries = {{0, 2}, {1, 4}};
for (auto [l, r] : queries) cout << pre[r + 1] - pre[l] << ' ';   // 8 11` }] } },
      { title: 'Memory limits are constraints too', html: `<p>Memory limit 256 MB. A <code>long[10<sup>7</sup>]</code> = 80 MB (fine). An <code>int[10<sup>4</sup>][10<sup>4</sup>]</code> = 400 MB (fails!). A <code>boolean[10<sup>8</sup>]</code> = 100 MB (ok-ish, a <code>BitSet</code> uses 12.5 MB). When N × M &gt; ~5 × 10<sup>7</sup>, a full 2D table is suspicious — look for a rolling-row or 1D trick.</p>
${H.table(['Structure', 'Size', 'Memory'], [['int[]', '10<sup>7</sup>', '40 MB'], ['long[]', '10<sup>7</sup>', '80 MB'], ['int[][]', '10<sup>4</sup> × 10<sup>4</sup>', H.c('r', '400 MB')], ['ArrayList&lt;Integer&gt;', '10<sup>7</sup>', H.c('r', '≈ 200 MB')]])}` }
    ],
    deepDive: `<h4>Where does 10<sup>8</sup> come from?</h4>
<p>A modern CPU core runs ~3–5 × 10<sup>9</sup> cycles per second and can retire several simple instructions per cycle. One "step" of your algorithm (a loop iteration with an array access, a comparison, an addition) typically costs a handful to tens of instructions — and a cache miss costs ~100 cycles. Averaging out, <b>10<sup>8</sup>–10<sup>9</sup> simple steps per second</b> is realistic; 10<sup>8</sup> is the safe planning number. Tight array loops can do 10<sup>9</sup>; HashMap-heavy code may manage only 10<sup>7</sup>.</p>
<h4>Constant factors that change the verdict</h4>
<ul><li><b>Memory access pattern:</b> sequential array scans are cache-friendly; random access into huge arrays or linked structures can be 10× slower.</li>
<li><b>Boxing and hashing:</b> <code>HashMap&lt;Integer,Integer&gt;</code> operations cost ~20–100 ns each versus ~1 ns for an array cell.</li>
<li><b>Recursion and object allocation</b> in inner loops.</li>
<li><b>JVM warm-up:</b> the first fraction of a second runs interpreted code; judges usually give Java a time multiplier or a longer limit.</li>
<li><b>Language speed:</b> C++ is the fastest; Java and JavaScript (both JIT-compiled) are usually within 1–3× of it; CPython is often 10–50× slower on tight loops. An O(N log N) Python solution with N = 10<sup>6</sup> may need built-ins (<code>sorted</code>, <code>sum</code>, <code>collections.Counter</code>) to pass.</li></ul>
<h4>Big-O hides constants — sometimes on purpose</h4>
<p>O(N log N) with N = 10<sup>6</sup> is 2 × 10<sup>7</sup>; with a heavy constant (say, a TreeMap operation per step) it may be closer to 10<sup>9</sup> real instructions. Conversely, an O(N<sup>2</sup>) inner loop that is a simple array comparison at N = 3 × 10<sup>4</sup> (≈ 4.5 × 10<sup>8</sup> pairs) can pass in Java within 1–2 s if it is cache-friendly. Use the table as the first filter, then think about constants.</p>
<h4>Reading constraints backwards (setter psychology)</h4>
<p>Setters choose N so that the intended solution passes comfortably and the next-slower one fails. If N = 5000, an O(N<sup>2</sup>) DP is almost certainly intended (O(N log N) would allow 10<sup>5</sup>). If N ≤ 18, exponential is intended. Odd bounds like N ≤ 40 hint at <b>meet-in-the-middle</b> (2<sup>20</sup> per half). "K ≤ 20" next to "N ≤ 10<sup>5</sup>" hints at O(N · 2<sup>K</sup>) or O(N · K).</p>
<h4>Interview reality</h4>
<p>Interviewers often omit constraints. Ask: "How large can the input be? Can values be negative? Are there duplicates? Does it fit in memory?" Then state your target: "With N up to a million, I'll aim for O(N log N)." This is one of the strongest signals of seniority in a coding round.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI can quickly estimate Big-O of a pasted solution and even benchmark it. But it often ignores the <b>actual numbers</b> — it may propose an O(N<sup>2</sup>) solution for N = 10<sup>5</sup> because the problem text was paraphrased without constraints, or over-engineer an O(N log N) structure when N ≤ 100.</p>
<p><b>How to work alongside it:</b> always paste constraints into your prompt: <code>N ≤ 2e5, values ≤ 1e9, 2-second limit, Python. What complexity is required and which data types?</code> Then check its reasoning against the table above.</p>
<p><b>Generate test data with AI:</b> ask for a script that produces max-size inputs (N = 2 · 10<sup>5</sup>, all values 10<sup>9</sup>, all equal, sorted, reverse sorted) to time your solution locally — the fastest way to catch TLE before submitting.</p>
<p><b>What you must still own:</b> the reflex of turning "N ≤ 10<sup>5</sup>" into "O(N log N), long for sums" within seconds of reading a problem — that is what interviewers watch for.</p>`,
    problems: [{
      title: 'Count Pairs with a Given Sum (Small Values)',
      level: 'Medium', tags: ['constraints', 'counting array', 'brute force'], companies: ['Amazon', 'Microsoft', 'Paytm'],
      statement: `<p>Given an array <code>a</code> of N integers and a target <code>K</code>, count pairs of indexes <code>(i, j)</code> with <code>i &lt; j</code> and <code>a[i] + a[j] == K</code>.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>5</sup>, 0 ≤ a[i] ≤ 10<sup>6</sup>, 0 ≤ K ≤ 2 · 10<sup>6</sup>`,
      example: `${H.arr([1, 5, 7, 1, 5], { label: 'a', hl: { 0: 'b', 1: 'g', 3: 'b', 4: 'g' } })}<p>K = 6 → Output ${H.c('g', '4')}. The pairs (i &lt; j) are (0, 1): 1 + 5, (0, 4): 1 + 5, (1, 3): 5 + 1 and (3, 4): 1 + 5. The 7 has no partner because 6 − 7 = −1 is not a possible value.</p>`,
      brute: { why: `<p>Check all N(N−1)/2 pairs with a double loop. For N = 10<sup>5</sup> that is 5 × 10<sup>9</sup> checks — about 50 seconds at 10<sup>8</sup>/s. The wasted work: for each <code>a[j]</code>, we re-scan all earlier elements just to ask "how many of them equal K − a[j]?" — a question a counter can answer instantly.</p>`, code: { lang: 'java', code: String.raw`
class Solution {
    public long countPairs(int[] a, int k) {
        long count = 0;
        for (int i = 0; i < a.length; i++)
            for (int j = i + 1; j < a.length; j++)
                if (a[i] + a[j] == k) count++;
        return count;                 // correct, but O(N^2)
    }
}`, alt: [{ lang: 'python', code: String.raw`
def count_pairs(a, k):
    count = 0
    for i in range(len(a)):
        for j in range(i + 1, len(a)):
            if a[i] + a[j] == k:
                count += 1
    return count                  # correct, but O(N^2)` }, { lang: 'js', code: String.raw`
function countPairs(a, k) {
  let count = 0;
  for (let i = 0; i < a.length; i++)
    for (let j = i + 1; j < a.length; j++)
      if (a[i] + a[j] === k) count++;
  return count;                 // correct, but O(N^2)
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    long long countPairs(vector<int>& a, int k) {
        long long count = 0;
        for (int i = 0; i < (int) a.size(); i++)
            for (int j = i + 1; j < (int) a.size(); j++)
                if (a[i] + a[j] == k) count++;
        return count;                 // correct, but O(N^2)
    }
};` }] } },
      mcq: { q: 'Values are at most 10<sup>6</sup>. What does that constraint unlock?', options: ['Using the value itself as an index into a counting array', 'Sorting in O(N)', 'Using int for the answer', 'Skipping the i &lt; j condition'], answer: 0, explain: 'An int[1_000_001] costs only ~4 MB, so freq[v] gives O(1) "how many times have I seen v?" with no hashing.' },
      hints: [`<p>Hint 1: Walk left to right. When you are at index j, the partners that make a valid pair are earlier elements equal to <code>K − a[j]</code>.</p>`, `<p>Hint 2: Keep <code>freq[v]</code> = how many times value v appeared <b>before</b> j. Add <code>freq[K − a[j]]</code> to the answer, then increment <code>freq[a[j]]</code>.</p>`, `<p>Hint 3: K − a[j] can be negative or above 10<sup>6</sup> → skip it. The answer can reach ~5 × 10<sup>9</sup> → use a 64-bit count (<code>long</code> / <code>long long</code>; Python ints and JS Numbers hold it exactly). Updating freq <i>after</i> counting enforces i &lt; j and avoids pairing an element with itself.</p>`],
      tests: { sig: 'int[] int -> long', fn: 'countPairs', cases: [
        [[[1, 5, 7, 1, 5], 6], 4],
        [[[1], 2], 0],
        [[[3, 3], 6], 1],
        [[[0, 0, 0], 0], 3],
        [[[5, 5, 5, 5], 10], 6],
        [[[7], 0], 0],
        [[[1, 2, 3], 100], 0],
        [[[1000000, 1000000, 0], 2000000], 1],
        [[Array(3000).fill(1), 2], 4498500],
        [[{ $rep: 1, n: 70000 }, 2], 2449965000],
        [[{ $concat: [{ $rep: 3, n: 50000 }, { $rep: 7, n: 50000 }] }, 10], 2500000000]
      ] },
      solution: {
        approach: `<p>Constraints say values ≤ 10<sup>6</sup>, so a frequency array replaces the inner loop. For each element, count earlier partners in O(1), then record the element. One pass: O(N + maxValue). The count needs a 64-bit integer (<code>long</code> in Java, <code>long long</code> in C++) because N(N−1)/2 can exceed 2<sup>31</sup>; Python's int and a JS Number hold it exactly.</p>`,
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

print(count_pairs([1, 5, 7, 1, 5], 6))  # 4`, run: true }, { lang: 'js', code: String.raw`
function countPairs(a, k) {
  const MAXV = 1000000;
  const freq = new Int32Array(MAXV + 1);   // freq[v] = earlier elements equal to v (~4 MB)
  let count = 0;                           // up to ~5e9: still exact in a Number (< 2^53)
  for (const x of a) {
    const need = k - x;
    if (need >= 0 && need <= MAXV) count += freq[need];
    freq[x]++;
  }
  return count;
}

console.log(countPairs([1, 5, 7, 1, 5], 6));  // 4`, run: true }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    long long countPairs(vector<int>& a, int k) {
        const int MAXV = 1'000'000;
        vector<int> freq(MAXV + 1, 0);       // freq[v] = earlier elements equal to v
        long long count = 0;                 // up to ~5e9 -> long long
        for (int x : a) {
            int need = k - x;
            if (need >= 0 && need <= MAXV) count += freq[need];
            freq[x]++;
        }
        return count;
    }
};` }],
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
    code: [{ code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
from itertools import combinations

a = [2, 7, 4]
n = len(a)

# 1) all pairs i < j
print(*[f"({a[i]},{a[j]})" for i in range(n) for j in range(i + 1, n)])
print(*[f"({x},{y})" for x, y in combinations(a, 2)])     # same, with itertools

# 2) all subarrays with a running sum (O(N^2) total, not O(N^3))
row = []
for i in range(n):
    s = 0
    for j in range(i, n):
        s += a[j]                                         # extend the subarray by one element
        row.append(f"[{i}..{j}]={s}")
print(*row)

# 3) all subsets with a bitmask: bit b of mask set => take a[b]
print(*["{" + " ".join(str(a[b]) for b in range(n) if mask >> b & 1) + "}" for mask in range(1 << n)])`, run: true }, { lang: 'js', code: String.raw`
const a = [2, 7, 4];
const n = a.length;

// 1) all pairs i < j
const pairs = [];
for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push('(' + a[i] + ',' + a[j] + ')');
console.log(pairs.join(' '));

// 2) all subarrays with a running sum (O(N^2) total, not O(N^3))
const subs = [];
for (let i = 0; i < n; i++) {
  let sum = 0;
  for (let j = i; j < n; j++) {
    sum += a[j];
    subs.push('[' + i + '..' + j + ']=' + sum);
  }
}
console.log(subs.join(' '));

// 3) all subsets with a bitmask (bit operators work on 32-bit ints: fine for n <= 30)
const sets = [];
for (let mask = 0; mask < (1 << n); mask++) {
  const picked = [];
  for (let b = 0; b < n; b++) if ((mask >> b) & 1) picked.push(a[b]);
  sets.push('{' + picked.join(' ') + '}');
}
console.log(sets.join(' '));`, run: true }, { lang: 'cpp', code: String.raw`
#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> a = {2, 7, 4};
    int n = a.size();

    // 1) all pairs i < j
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++) cout << "(" << a[i] << "," << a[j] << ") ";
    cout << '\n';

    // 2) all subarrays with a running sum
    for (int i = 0; i < n; i++) {
        long long sum = 0;
        for (int j = i; j < n; j++) {
            sum += a[j];
            cout << "[" << i << ".." << j << "]=" << sum << " ";
        }
    }
    cout << '\n';

    // 3) all subsets with a bitmask
    for (int mask = 0; mask < (1 << n); mask++) {
        cout << "{";
        bool first = true;
        for (int b = 0; b < n; b++)
            if (mask >> b & 1) { cout << (first ? "" : " ") << a[b]; first = false; }
        cout << "} ";
    }
    cout << '\n';
    // To enumerate orderings, sort first and loop: do { ... } while (next_permutation(a.begin(), a.end()));
    return 0;
}` }] }, { code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
import random

def brute(a):                                   # obviously correct, O(N^3)
    return max(sum(a[i:j + 1]) for i in range(len(a)) for j in range(i, len(a)))

def fast(a):                                    # the solution we want to trust (Kadane)
    best = cur = a[0]
    for x in a[1:]:
        cur = max(x, cur + x)
        best = max(best, cur)
    return best

rnd = random.Random(42)                         # fixed seed -> reproducible failures
for _ in range(10_000):
    a = [rnd.randint(-10, 10) for _ in range(rnd.randint(1, 8))]   # small values, negatives too
    if brute(a) != fast(a):
        print("MISMATCH on", a)
        break
else:                                           # for-else: runs only if the loop never broke
    print("all 10000 random tests passed")`, run: true }, { lang: 'js', code: String.raw`
function brute(a) {                       // obviously correct, O(N^3)
  let best = -Infinity;
  for (let i = 0; i < a.length; i++)
    for (let j = i; j < a.length; j++) {
      let s = 0;
      for (let k = i; k <= j; k++) s += a[k];
      best = Math.max(best, s);
    }
  return best;
}

function fast(a) {                        // the solution we want to trust
  let best = -Infinity, cur = 0;
  for (const x of a) { cur = Math.max(x, cur + x); best = Math.max(best, cur); }
  return best;
}

// Math.random cannot be seeded, so use a tiny seeded generator (mulberry32) for reproducible runs.
function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = rng(42);
const randInt = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
let ok = true;
for (let iter = 0; iter < 10000 && ok; iter++) {
  const a = Array.from({ length: randInt(1, 8) }, () => randInt(-10, 10));
  if (brute(a) !== fast(a)) { console.log('MISMATCH on', a); ok = false; }
}
if (ok) console.log('all 10000 random tests passed');`, run: true }, { lang: 'cpp', code: String.raw`
#include <bits/stdc++.h>
using namespace std;

long long brute(const vector<int>& a) {          // obviously correct, O(N^3)
    long long best = LLONG_MIN;
    for (size_t i = 0; i < a.size(); i++)
        for (size_t j = i; j < a.size(); j++) {
            long long s = 0;
            for (size_t k = i; k <= j; k++) s += a[k];
            best = max(best, s);
        }
    return best;
}

long long fast(const vector<int>& a) {           // the solution we want to trust
    long long best = LLONG_MIN, cur = 0;
    for (int x : a) { cur = max<long long>(x, cur + x); best = max(best, cur); }
    return best;
}

int main() {
    mt19937 rng(42);                             // fixed seed -> reproducible failures
    auto randInt = [&](int lo, int hi) { return uniform_int_distribution<int>(lo, hi)(rng); };
    for (int iter = 0; iter < 10'000; iter++) {
        vector<int> a(randInt(1, 8));
        for (int& x : a) x = randInt(-10, 10);
        if (brute(a) != fast(a)) {
            cout << "MISMATCH on size " << a.size() << '\n';
            return 0;
        }
    }
    cout << "all 10000 random tests passed\n";
    return 0;
}` }] }],
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
        var PY = 'best = float(\'-inf\')\nfor i in range(n):\n    total = 0\n    for j in range(i, n):\n        total += a[j]\n        best = max(best, total)',
            JS = 'let best = -Infinity;\nfor (let i = 0; i < n; i++) {\n    let sum = 0;\n    for (let j = i; j < n; j++) {\n        sum += a[j];\n        best = Math.max(best, sum);\n    }\n}',
            CPP = 'long long best = LLONG_MIN;\nfor (int i = 0; i < n; i++) {\n    long long sum = 0;\n    for (int j = i; j < n; j++) {\n        sum += a[j];\n        best = max(best, sum);\n    }\n}';
        var ALT = { python: { code: PY }, js: { code: JS }, cpp: { code: CPP } };
        frames.push({ narr: 'Candidates = every subarray a[i..j]. There are N(N+1)/2 = <b>' + (n * (n + 1) / 2) + '</b> of them. For each start i we extend j one step at a time, so the sum is updated in O(1) instead of re-added from scratch.', parts: [
          { type: 'array', label: 'a', values: a },
          { type: 'vars', vals: { best: '-∞', checked: 0 } },
          { type: 'code', lang: 'java', code: CODE, alt: ALT, hl: { 1: 'cur' } }
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
              { type: 'code', lang: 'java', code: CODE, alt: ALT, hl: improved ? { 5: 'cur', 6: 'ok' } : { 5: 'cur' } }
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
${H.table(['n = 36', 'divisor pairs'], [['2 × 18', '3 × 12'], ['4 × 9', H.c('g', '6 × 6 (√36)')]])}`, code: { code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
def is_prime(n):
    if n < 2:
        return False
    d = 2
    while d * d <= n:          # d * d avoids floating-point sqrt (math.isqrt also works)
        if n % d == 0:
            return False
        d += 1
    return True

print(is_prime(97), is_prime(1_000_000_007), is_prime(1_000_000_008))   # True True False`, run: true }, { lang: 'js', code: String.raw`
function isPrime(n) {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;   // exact: n < 2^53
  return true;
}

console.log(isPrime(97), isPrime(1000000007), isPrime(1000000008));   // true true false`, run: true }, { lang: 'cpp', code: String.raw`
#include <bits/stdc++.h>
using namespace std;

bool isPrime(long long n) {
    if (n < 2) return false;
    for (long long d = 2; d * d <= n; d++)     // d * d in long long: no overflow for n <= 1e18
        if (n % d == 0) return false;
    return true;
}

int main() {
    cout << boolalpha << isPrime(97) << " " << isPrime(1'000'000'007LL) << " " << isPrime(1'000'000'008LL) << '\n';
    return 0;
}` }] } },
      { title: 'Subset sum with a bitmask (N ≤ 20)', html: `<p>"Can some subset of these numbers add up to T?" With N ≤ 20 there are at most 2<sup>20</sup> ≈ 10<sup>6</sup> subsets — just try them all. Each mask's binary digits say which elements are taken.</p>
${H.table(['mask (binary)', 'elements taken from {3, 34, 4}', 'sum'], [['001', '3', '3'], ['101', '3, 4', H.c('g', '7')], ['111', '3, 34, 4', '41']])}`, code: { code: String.raw`
int[] a = {3, 34, 4};
int target = 7;
boolean found = false;
for (int mask = 0; mask < (1 << a.length) && !found; mask++) {
    int sum = 0;
    for (int b = 0; b < a.length; b++) if ((mask & (1 << b)) != 0) sum += a[b];
    if (sum == target) found = true;
}
System.out.println(found);   // true (3 + 4)`, alt: [{ lang: 'python', code: String.raw`
a, target = [3, 34, 4], 7
found = any(sum(a[b] for b in range(len(a)) if mask >> b & 1) == target
            for mask in range(1 << len(a)))     # any() stops at the first True
print(found)                                    # True (3 + 4)`, run: true }, { lang: 'js', code: String.raw`
const a = [3, 34, 4], target = 7;
let found = false;
for (let mask = 0; mask < (1 << a.length) && !found; mask++) {
  let sum = 0;
  for (let b = 0; b < a.length; b++) if (mask & (1 << b)) sum += a[b];
  if (sum === target) found = true;
}
console.log(found);   // true (3 + 4)`, run: true }, { lang: 'cpp', code: String.raw`
vector<int> a = {3, 34, 4};
int target = 7, n = a.size();
bool found = false;
for (int mask = 0; mask < (1 << n) && !found; mask++) {
    int sum = 0;
    for (int b = 0; b < n; b++) if (mask & (1 << b)) sum += a[b];
    if (sum == target) found = true;
}
cout << boolalpha << found << '\n';   // true (3 + 4)` }] } },
      { title: 'Count palindromic substrings (N ≤ 100)', html: `<p>Enumerate all N(N+1)/2 substrings and check each with two indexes, without building new Strings. O(N<sup>3</sup>) = 10<sup>6</sup> for N = 100 — perfectly fine. For N = 10<sup>4</sup> you would need "expand around center" (String Algorithms module).</p>`, code: { code: String.raw`
String s = "aaba";
int count = 0;
for (int i = 0; i < s.length(); i++)
    for (int j = i; j < s.length(); j++) {
        int l = i, r = j;
        while (l < r && s.charAt(l) == s.charAt(r)) { l++; r--; }
        if (l >= r) count++;                 // s[i..j] is a palindrome
    }
System.out.println(count);   // 6: a, a, b, a, aa, aba`, alt: [{ lang: 'python', code: String.raw`
s = "aaba"
count = 0
for i in range(len(s)):
    for j in range(i, len(s)):
        l, r = i, j
        while l < r and s[l] == s[r]:   # compare in place, no new strings
            l, r = l + 1, r - 1
        if l >= r:
            count += 1                  # s[i..j] is a palindrome
print(count)                            # 6: a, a, b, a, aa, aba`, run: true }, { lang: 'js', code: String.raw`
const s = 'aaba';
let count = 0;
for (let i = 0; i < s.length; i++)
  for (let j = i; j < s.length; j++) {
    let l = i, r = j;
    while (l < r && s[l] === s[r]) { l++; r--; }
    if (l >= r) count++;                // s[i..j] is a palindrome
  }
console.log(count);   // 6: a, a, b, a, aa, aba`, run: true }, { lang: 'cpp', code: String.raw`
string s = "aaba";
int count = 0, n = s.size();
for (int i = 0; i < n; i++)
    for (int j = i; j < n; j++) {
        int l = i, r = j;
        while (l < r && s[l] == s[r]) { l++; r--; }
        if (l >= r) count++;             // s[i..j] is a palindrome
    }
cout << count << '\n';   // 6: a, a, b, a, aa, aba` }] } },
      { title: 'Early exit and pruning', html: `<p>Brute force does not have to be dumb. If you only need <b>whether</b> a pair exists, return at the first hit. If the array is sorted and you need a[i] + a[j] ≤ K, break the inner loop as soon as the sum exceeds K — later j only make it bigger. Worst case is unchanged, but typical runs get much faster.</p>`, code: { code: String.raw`
int[] a = {1, 3, 4, 8, 10};        // sorted
int k = 9, pairs = 0;
for (int i = 0; i < a.length; i++)
    for (int j = i + 1; j < a.length; j++) {
        if (a[i] + a[j] > k) break;   // prune: sorted, so the rest are larger
        pairs++;
    }
System.out.println(pairs);   // 4: (1,3) (1,4) (1,8) (3,4)`, alt: [{ lang: 'python', code: String.raw`
a, k, pairs = [1, 3, 4, 8, 10], 9, 0     # a is sorted
for i in range(len(a)):
    for j in range(i + 1, len(a)):
        if a[i] + a[j] > k:
            break                        # prune: sorted, so the rest are larger
        pairs += 1
print(pairs)                             # 4: (1,3) (1,4) (1,8) (3,4)`, run: true }, { lang: 'js', code: String.raw`
const a = [1, 3, 4, 8, 10];   // sorted
const k = 9;
let pairs = 0;
for (let i = 0; i < a.length; i++)
  for (let j = i + 1; j < a.length; j++) {
    if (a[i] + a[j] > k) break;   // prune: sorted, so the rest are larger
    pairs++;
  }
console.log(pairs);   // 4: (1,3) (1,4) (1,8) (3,4)`, run: true }, { lang: 'cpp', code: String.raw`
vector<int> a = {1, 3, 4, 8, 10};   // sorted
int k = 9, pairs = 0, n = a.size();
for (int i = 0; i < n; i++)
    for (int j = i + 1; j < n; j++) {
        if (a[i] + a[j] > k) break;   // prune: sorted, so the rest are larger
        pairs++;
    }
cout << pairs << '\n';   // 4: (1,3) (1,4) (1,8) (3,4)` }] } }
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
<p><b>Great prompt:</b> <code>Write a brute-force O(N^3) solution in my interview language (Java, Python, JavaScript or C++) for this problem and a random test generator with a fixed seed (N ≤ 8, values -10..10). Do not optimise.</code></p>
<p><b>What you must own:</b> defining the candidate space correctly (off-by-one in i &lt; j vs i ≤ j changes the answer), knowing its size from the constraints, and explaining your path from brute force to optimal — interviewers grade the <i>journey</i>, not just the final code.</p>`,
    problems: [{
      title: 'Maximum Subarray Sum (Brute Force Done Right)',
      level: 'Medium', tags: ['brute force', 'subarrays', 'running sum'], companies: ['Amazon', 'Microsoft', 'LinkedIn', 'Apple'],
      statement: `<p>Given an integer array <code>a</code>, find the contiguous non-empty subarray with the largest sum and return that sum.</p>`,
      constraints: `1 ≤ N ≤ 2000, −10<sup>9</sup> ≤ a[i] ≤ 10<sup>9</sup>`,
      example: `${H.arr([-2, 1, -3, 4, -1, 2, 1, -5, 4], { label: 'a', hl: { 3: 'g', 4: 'g', 5: 'g', 6: 'g' } })}<p>Output: ${H.c('g', '6')} from [4, −1, 2, 1]. Note the subarray may contain negative numbers if they connect two good parts. If all numbers are negative, the answer is the largest single element.</p>`,
      brute: { why: `<p>Three loops: choose i, choose j, then add a[i..j] from scratch. About N<sup>3</sup>/6 ≈ 1.3 × 10<sup>9</sup> additions for N = 2000 — too slow. The wasted work: sum(i..j) and sum(i..j+1) share all but one element, yet we re-add everything.</p>`, code: { lang: 'java', code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
def max_sub_array(a):
    best = float('-inf')
    for i in range(len(a)):
        for j in range(i, len(a)):
            s = 0
            for k in range(i, j + 1):
                s += a[k]                   # recomputed every time
            best = max(best, s)
    return best` }, { lang: 'js', code: String.raw`
function maxSubArray(a) {
  let best = -Infinity;
  for (let i = 0; i < a.length; i++)
    for (let j = i; j < a.length; j++) {
      let sum = 0;
      for (let k = i; k <= j; k++) sum += a[k];   // recomputed every time
      best = Math.max(best, sum);
    }
  return best;
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    long long maxSubArray(vector<int>& a) {
        long long best = LLONG_MIN;
        for (int i = 0; i < (int) a.size(); i++)
            for (int j = i; j < (int) a.size(); j++) {
                long long sum = 0;
                for (int k = i; k <= j; k++) sum += a[k];   // recomputed every time
                best = max(best, sum);
            }
        return best;
    }
};` }] } },
      mcq: { q: 'You know sum(i..j) = 5 and a[j+1] = −2. What is sum(i..j+1)?', options: ['3 — just add a[j+1]', 'Need to re-add from i', '−2', '7'], answer: 0, explain: 'Extending a subarray by one element only adds that element. This O(1) update turns O(N³) into O(N²).' },
      hints: [`<p>Hint 1: Fix the start i. As j moves right, the subarray grows by exactly one element each step.</p>`, `<p>Hint 2: Keep a running <code>sum</code> that resets to 0 for each new i and adds a[j] for each j. Update <code>best</code> after every addition.</p>`, `<p>Hint 3: Initialise best to the smallest possible value (<code>Long.MIN_VALUE</code>, <code>LLONG_MIN</code>, <code>-Infinity</code>, or simply a[0]) — not 0! — so all-negative arrays work. Use a 64-bit sum (<code>long</code> / <code>long long</code>): a sum of 2000 values of 10<sup>9</sup> is 2 × 10<sup>12</sup>.</p>`],
      tests: { sig: 'int[] -> long', fn: 'maxSubArray', cases: [
        [[[-2, 1, -3, 4, -1, 2, 1, -5, 4]], 6],
        [[[-3, -1, -2]], -1],
        [[[5]], 5],
        [[[-1000000000]], -1000000000],
        [[[0, 0]], 0],
        [[[2, -1, 2]], 3],
        [[[-2, 1]], 1],
        [[[1000000000, 1000000000, 1000000000]], 3000000000],
        [[Array(2000).fill(1000000000)], 2000000000000]
      ] },
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
def max_sub_array(a):
    best = a[0]                      # N >= 1; works for all-negative arrays
    for i in range(len(a)):
        s = 0
        for j in range(i, len(a)):
            s += a[j]                # sum of a[i..j] in O(1)
            best = max(best, s)
    return best

print(max_sub_array([-2, 1, -3, 4, -1, 2, 1, -5, 4]))  # 6
print(max_sub_array([-3, -1, -2]))                       # -1`, run: true }, { lang: 'js', code: String.raw`
function maxSubArray(a) {
  let best = -Infinity;              // not 0: all-negative arrays must work
  for (let i = 0; i < a.length; i++) {
    let sum = 0;                     // |sum| <= 2e12, exact in a Number
    for (let j = i; j < a.length; j++) {
      sum += a[j];
      best = Math.max(best, sum);
    }
  }
  return best;
}

console.log(maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4]));  // 6
console.log(maxSubArray([-3, -1, -2]));                      // -1`, run: true }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    long long maxSubArray(vector<int>& a) {
        long long best = LLONG_MIN;          // not 0: all-negative arrays must work
        for (size_t i = 0; i < a.size(); i++) {
            long long sum = 0;               // fresh sum for each start
            for (size_t j = i; j < a.size(); j++) {
                sum += a[j];
                best = max(best, sum);
            }
        }
        return best;
    }
};` }],
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
    brute: { why: `<p>Sort a copy, then walk from the end skipping values equal to the maximum. Correct and simple, but sorting costs O(N log N) and O(N) extra memory just to find two numbers — we order <b>all</b> elements when we only care about the top two.</p>`, code: { lang: 'java', code: String.raw`
class Solution {
    public int secondLargest(int[] a) {
        int[] b = a.clone();
        Arrays.sort(b);                                    // O(N log N)
        int max = b[b.length - 1];
        for (int i = b.length - 2; i >= 0; i--) if (b[i] != max) return b[i];
        return -1;
    }
}`, alt: [{ lang: 'python', code: String.raw`
def second_largest(a):
    b = sorted(a)                                  # O(N log N), plus a copy
    mx = b[-1]
    for i in range(len(b) - 2, -1, -1):
        if b[i] != mx:
            return b[i]
    return -1` }, { lang: 'js', code: String.raw`
function secondLargest(a) {
  const b = [...a].sort((x, y) => x - y);          // O(N log N), plus a copy
  const max = b[b.length - 1];
  for (let i = b.length - 2; i >= 0; i--) if (b[i] !== max) return b[i];
  return -1;
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    int secondLargest(vector<int>& a) {
        vector<int> b = a;
        sort(b.begin(), b.end());                      // O(N log N)
        int mx = b.back();
        for (int i = (int) b.size() - 2; i >= 0; i--) if (b[i] != mx) return b[i];
        return -1;
    }
};` }] } },
    mcq: { q: 'Scanning once with variables <code>first</code> and <code>second</code>, what should happen when you see x == first?', options: ['Ignore it (it is a duplicate of the max)', 'Set second = first', 'Set first = x and second = x', 'Return -1'], answer: 0, explain: 'We need the second largest DISTINCT value, so a copy of the current maximum changes nothing.' },
    hints: [`<p>Hint 1: You only need to remember the two best distinct values seen so far — not the whole sorted order.</p>`, `<p>Hint 2: For each x: if x &gt; first → second = first, first = x. Else if x &lt; first and x &gt; second → second = x.</p>`, `<p>Hint 3: Start with first = second = −1 (values are positive). The strict comparisons automatically skip duplicates of the maximum. Return second (still −1 if never set).</p>`],
    tests: { sig: 'int[] -> int', fn: 'secondLargest', cases: [
      [[[12, 35, 1, 10, 34, 35]], 34],
      [[[7, 7, 7]], -1],
      [[[5]], -1],
      [[[1, 2]], 1],
      [[[2, 1]], 1],
      [[[10, 10, 9]], 9],
      [[[3, 1, 2, 3, 2]], 2],
      [[[1000000000, 999999999]], 999999999]
    ] },
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
      alt: [{ lang: 'python', code: String.raw`
def second_largest(a):
    first = second = -1                # values are >= 1, so -1 means "none yet"
    for x in a:
        if x > first:
            first, second = x, first   # new champion pushes the old one down
        elif second < x < first:       # strictly between: new runner-up
            second = x
    return second

print(second_largest([12, 35, 1, 10, 34, 35]), second_largest([7, 7, 7]))  # 34 -1`, run: true }, { lang: 'js', code: String.raw`
function secondLargest(a) {
  let first = -1, second = -1;         // values are >= 1, so -1 means "none yet"
  for (const x of a) {
    if (x > first) {
      second = first;
      first = x;
    } else if (x < first && x > second) {
      second = x;
    }
  }
  return second;
}

console.log(secondLargest([12, 35, 1, 10, 34, 35]), secondLargest([7, 7, 7]));  // 34 -1`, run: true }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    int secondLargest(vector<int>& a) {
        int first = -1, second = -1;       // values are >= 1, so -1 means "none yet"
        for (int x : a) {
            if (x > first) {
                second = first;
                first = x;
            } else if (x < first && x > second) {
                second = x;
            }
        }
        return second;
    }
};` }],
      dry: { head: ['x', 'first', 'second'], rows: [['12', '12', '−1'], ['35', '35', '12'], ['1', '35', '12'], ['10', '35', '12'], ['34', '35', '34'], ['35', '35', H.c('g', '34')]] },
      complexity: `<p>O(N) time, O(1) space.</p>`,
      followUps: ['Return the k-th largest distinct value (heap or sort — DSA 15).', 'What changes if values can be negative? (Use the smallest value of a wider type as the sentinel — Long.MIN_VALUE, LLONG_MIN, -Infinity, None — or a boolean "set" flag.)']
    }
  });

  practice.push({
    title: 'Valid Palindrome (Letters and Digits Only)',
    level: 'Easy', tags: ['strings', 'two pointers', 'char helpers'], companies: ['Meta', 'Microsoft', 'Apple'],
    statement: `<p>A phrase is a palindrome if, after converting all uppercase letters to lowercase and removing all non-alphanumeric characters, it reads the same forward and backward. Given <code>s</code>, return <code>true</code> if it is a palindrome.</p>`,
    constraints: `1 ≤ s.length ≤ 2 · 10<sup>5</sup>; s consists of printable ASCII characters.`,
    example: `<p><code>"A man, a plan, a canal: Panama"</code> → cleaned ${H.c('b', '"amanaplanacanalpanama"')} → ${H.c('g', 'true')}.</p><p><code>"race a car"</code> → ${H.c('b', '"raceacar"')} → ${H.c('r', 'false')} (r-a-c-e-a-c-a-r reversed is r-a-c-a-e-c-a-r).</p>`,
    brute: { why: `<p>Build a cleaned lowercase copy of the string, build a reversed copy of that, and compare. O(N) time but O(N) extra memory for two new strings — fine, yet the interviewer will ask for O(1) space.</p>`, code: { lang: 'java', code: String.raw`
class Solution {
    public boolean isPalindrome(String s) {
        StringBuilder clean = new StringBuilder();
        for (char c : s.toCharArray())
            if (Character.isLetterOrDigit(c)) clean.append(Character.toLowerCase(c));
        String fwd = clean.toString();
        String back = clean.reverse().toString();
        return fwd.equals(back);
    }
}`, alt: [{ lang: 'python', code: String.raw`
def is_palindrome(s):
    clean = [c.lower() for c in s if c.isalnum()]
    fwd = "".join(clean)
    back = fwd[::-1]                 # a second full copy
    return fwd == back` }, { lang: 'js', code: String.raw`
function isPalindrome(s) {
  const fwd = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const back = fwd.split('').reverse().join('');   // a second full copy
  return fwd === back;
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    bool isPalindrome(const string& s) {
        string fwd;
        for (char c : s)
            if (isalnum((unsigned char) c)) fwd += (char) tolower((unsigned char) c);
        string back(fwd.rbegin(), fwd.rend());     // a second full copy
        return fwd == back;
    }
};` }] } },
    mcq: { q: 'Which pair of helpers handles the cleaning rules correctly for ASCII input?', options: ['An "is letter or digit" test plus lower-casing both sides (Character.isLetterOrDigit + toLowerCase, str.isalnum + lower, isalnum + tolower)', 'An "is letter" test plus trimming spaces', 'Skipping only spaces and upper-casing one side', 'Splitting into characters and comparing the whole arrays'], answer: 0, explain: 'Digits count as alphanumeric too ("0P" is not a palindrome). Compare both sides after lowering case.' },
    hints: [`<p>Hint 1: Instead of building a cleaned copy, skip unwanted characters on the fly from both ends.</p>`, `<p>Hint 2: Two indexes i (left) and j (right). Move i right while s[i] is not alphanumeric; move j left likewise. Compare lowercase versions.</p>`, `<p>Hint 3: Keep the guard <code>i &lt; j</code> inside the skipping loops so a string of only punctuation does not run off the ends. Empty-after-cleaning counts as a palindrome (true).</p>`],
    tests: { sig: 'string -> bool', fn: 'isPalindrome', cases: [
      [['A man, a plan, a canal: Panama'], true],
      [['race a car'], false],
      [[' '], true],
      [['0P'], false],
      [['a.'], true],
      [['.,!'], true],
      [['ab_a'], true],
      [['Aa'], true],
      [["No 'x' in Nixon"], true]
    ] },
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
      alt: [{ lang: 'python', code: String.raw`
def is_palindrome(s):
    i, j = 0, len(s) - 1
    while i < j:
        if not s[i].isalnum():
            i += 1                     # skip junk on the left
        elif not s[j].isalnum():
            j -= 1                     # skip junk on the right
        elif s[i].lower() != s[j].lower():
            return False
        else:
            i += 1
            j -= 1
    return True

print(is_palindrome("A man, a plan, a canal: Panama"), is_palindrome("race a car"))  # True False`, run: true }, { lang: 'js', code: String.raw`
const isAlnum = (c) => /[a-z0-9]/i.test(c);

function isPalindrome(s) {
  let i = 0, j = s.length - 1;
  while (i < j) {
    while (i < j && !isAlnum(s[i])) i++;    // skip junk on the left
    while (i < j && !isAlnum(s[j])) j--;    // skip junk on the right
    if (s[i].toLowerCase() !== s[j].toLowerCase()) return false;
    i++;
    j--;
  }
  return true;
}

console.log(isPalindrome('A man, a plan, a canal: Panama'), isPalindrome('race a car'));  // true false`, run: true }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    bool isPalindrome(const string& s) {
        int i = 0, j = (int)s.size() - 1;
        // Cast to unsigned char: passing a negative char to isalnum/tolower is undefined.
        auto ok = [&](int k) { return isalnum((unsigned char)s[k]) != 0; };
        while (i < j) {
            while (i < j && !ok(i)) i++;
            while (i < j && !ok(j)) j--;
            if (tolower((unsigned char)s[i]) != tolower((unsigned char)s[j])) return false;
            i++;
            j--;
        }
        return true;
    }
};` }],
      dry: { head: ['i', 'j', 's[i]', 's[j]', 'match?'], rows: [['0', '9', 'r', 'r', 'yes'], ['1', '8', 'a', 'a', 'yes'], ['2', '7', 'c', 'c', 'yes'], ['3', '5 (skipped the space at 6)', 'e', 'a', H.c('r', 'no → false')]] },
      complexity: `<p>O(N) time, O(1) extra space.</p>`,
      followUps: ['Valid Palindrome II: may delete at most one character.', 'Handle full Unicode (iterate code points, not UTF-16 units: Java codePoints(), JS [...s]; Python str is already code points).']
    }
  });

  practice.push({
    title: 'Matrix Diagonal Sum',
    level: 'Easy', tags: ['2D arrays', 'matrix'], companies: ['Adobe', 'Google'],
    statement: `<p>Given a square matrix <code>mat</code> of size n × n, return the sum of the primary diagonal and the secondary diagonal. If n is odd, the centre cell belongs to both diagonals but must be counted <b>once</b>.</p>`,
    constraints: `1 ≤ n ≤ 100, 1 ≤ mat[i][j] ≤ 100`,
    example: `${H.table(['', 'c0', 'c1', 'c2'], [['r0', H.c('g', '1'), '2', H.c('b', '3')], ['r1', '4', H.c('y', '5'), '6'], ['r2', H.c('b', '7'), '8', H.c('g', '9')]])}<p>Output ${H.c('g', '25')} = ${H.c('g', '1 + 9')} + ${H.c('y', '5')} + ${H.c('b', '3 + 7')}. The centre 5 is counted once.</p>`,
    brute: { why: `<p>Visit all n<sup>2</sup> cells and add those with <code>r == c</code> or <code>r + c == n − 1</code>. Correct (the "or" counts the centre once), but it looks at n<sup>2</sup> cells when only about 2n matter.</p>`, code: { lang: 'java', code: String.raw`
class Solution {
    public int diagonalSum(int[][] mat) {
        int n = mat.length, sum = 0;
        for (int r = 0; r < n; r++)
            for (int c = 0; c < n; c++)
                if (r == c || r + c == n - 1) sum += mat[r][c];
        return sum;
    }
}`, alt: [{ lang: 'python', code: String.raw`
def diagonal_sum(mat):
    n, total = len(mat), 0
    for r in range(n):
        for c in range(n):
            if r == c or r + c == n - 1:
                total += mat[r][c]
    return total` }, { lang: 'js', code: String.raw`
function diagonalSum(mat) {
  const n = mat.length;
  let sum = 0;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (r === c || r + c === n - 1) sum += mat[r][c];
  return sum;
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    int diagonalSum(vector<vector<int>>& mat) {
        int n = mat.size(), sum = 0;
        for (int r = 0; r < n; r++)
            for (int c = 0; c < n; c++)
                if (r == c || r + c == n - 1) sum += mat[r][c];
        return sum;
    }
};` }] } },
    mcq: { q: 'Cell (r, c) is on the secondary (anti-) diagonal of an n × n matrix when…', options: ['r + c == n − 1', 'r == c', 'r − c == 1', 'r + c == n'], answer: 0, explain: 'Top-right is (0, n−1) and bottom-left is (n−1, 0): the indexes always add to n − 1.' },
    hints: [`<p>Hint 1: Row r touches the primary diagonal at column r and the secondary diagonal at column n − 1 − r. That is just two cells per row.</p>`, `<p>Hint 2: Loop r from 0 to n − 1 and add <code>mat[r][r] + mat[r][n - 1 - r]</code>.</p>`, `<p>Hint 3: When n is odd, the middle row adds the centre twice — subtract <code>mat[n/2][n/2]</code> once at the end. n = 1 is the extreme case.</p>`],
    tests: { sig: 'int[][] -> int', fn: 'diagonalSum', cases: [
      [[[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], 25],
      [[[[5]]], 5],
      [[[[1, 2], [3, 4]]], 10],
      [[[[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]]], 8],
      [[Array.from({ length: 5 }, () => Array(5).fill(1))], 9],
      [[Array.from({ length: 50 }, () => Array(50).fill(100))], 10000],
      [[Array.from({ length: 51 }, () => Array(51).fill(100))], 10100]
    ] },
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
      alt: [{ lang: 'python', code: String.raw`
def diagonal_sum(mat):
    n = len(mat)
    total = sum(mat[r][r] + mat[r][n - 1 - r] for r in range(n))
    if n % 2 == 1:
        total -= mat[n // 2][n // 2]     # centre counted twice
    return total

print(diagonal_sum([[1, 2, 3], [4, 5, 6], [7, 8, 9]]))  # 25`, run: true }, { lang: 'js', code: String.raw`
function diagonalSum(mat) {
  const n = mat.length;
  let sum = 0;
  for (let r = 0; r < n; r++) sum += mat[r][r] + mat[r][n - 1 - r];
  if (n % 2 === 1) sum -= mat[n >> 1][n >> 1];   // centre counted twice
  return sum;
}

console.log(diagonalSum([[1, 2, 3], [4, 5, 6], [7, 8, 9]]));  // 25`, run: true }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    int diagonalSum(vector<vector<int>>& mat) {
        int n = mat.size(), sum = 0;
        for (int r = 0; r < n; r++) sum += mat[r][r] + mat[r][n - 1 - r];
        if (n % 2 == 1) sum -= mat[n / 2][n / 2];   // centre counted twice
        return sum;
    }
};` }],
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
    brute: { why: `<p>For each candidate v from 0 to n, scan the whole array to see whether v is present. That is (n + 1) × n ≈ 10<sup>10</sup> comparisons for n = 10<sup>5</sup> → TLE. The wasted work: re-scanning the same array for every candidate.</p>`, code: { lang: 'java', code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
def missing_number(a):
    n = len(a)
    for v in range(n + 1):
        found = False
        for x in a:
            if x == v:
                found = True
                break
        if not found:
            return v
    return -1   # unreachable for valid input` }, { lang: 'js', code: String.raw`
function missingNumber(a) {
  const n = a.length;
  for (let v = 0; v <= n; v++) {
    let found = false;
    for (const x of a) if (x === v) { found = true; break; }
    if (!found) return v;
  }
  return -1;   // unreachable for valid input
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    int missingNumber(vector<int>& a) {
        int n = a.size();
        for (int v = 0; v <= n; v++) {
            bool found = false;
            for (int x : a) if (x == v) { found = true; break; }
            if (!found) return v;
        }
        return -1;   // unreachable for valid input
    }
};` }] } },
    mcq: { q: 'Using the formula n(n+1)/2 with n = 10<sup>5</sup>, what type should hold the expected sum to be safe?', options: ['long (to be safe as n grows)', 'byte', 'short', 'char'], answer: 0, explain: 'For n = 10<sup>5</sup> the sum is about 5·10<sup>9</sup> — already above int\'s 2.1·10<sup>9</sup>! Using long avoids overflow. (XOR avoids the issue entirely.)' },
    hints: [`<p>Hint 1: You know exactly which numbers <i>should</i> be there: 0, 1, …, n. Their total is easy to compute.</p>`, `<p>Hint 2: Missing = (0 + 1 + … + n) − (sum of the array) = n(n+1)/2 − sum. Alternatively XOR all indexes and all values — pairs cancel.</p>`, `<p>Hint 3: n(n+1)/2 for n = 10<sup>5</sup> is ≈ 5 × 10<sup>9</sup>: compute it in <code>long</code>. Missing 0 and missing n are the edge cases to test.</p>`],
    tests: { sig: 'int[] -> int', fn: 'missingNumber', cases: [
      [[[3, 0, 1]], 2],
      [[[0, 1]], 2],
      [[[1]], 0],
      [[[0]], 1],
      [[[1, 2, 3]], 0],
      [[[9, 6, 4, 2, 3, 5, 7, 0, 1]], 8],
      [[Array.from({ length: 5001 }, (_, i) => i).filter((x) => x !== 2500)], 2500]
    ] },
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

print(missing_number([3, 0, 1]), missing_number([0, 1]), missing_number([1]))  # 2 2 0`, run: true }, { lang: 'js', code: String.raw`
function missingNumber(a) {
  const n = a.length;
  const expected = n * (n + 1) / 2;     // ~5e9 for n = 1e5: exact in a Number
  const actual = a.reduce((s, x) => s + x, 0);
  return expected - actual;
}

console.log(missingNumber([3, 0, 1]), missingNumber([0, 1]), missingNumber([1]));  // 2 2 0`, run: true }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    int missingNumber(vector<int>& a) {
        long long n = a.size();
        long long expected = n * (n + 1) / 2;   // needs 64 bits for n near 1e5
        long long actual = accumulate(a.begin(), a.end(), 0LL);   // 0LL: sum in long long
        return (int)(expected - actual);
    }
};` }],
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
    statement: `<p>Given a signed 32-bit integer <code>x</code>, return <code>x</code> with its digits reversed. If reversing makes the value go outside the int range [−2<sup>31</sup>, 2<sup>31</sup> − 1], return <code>0</code>. Assume you cannot store 64-bit integers. (Python's ints never overflow, so in Python you may build the value and check the range at the end — but know the pre-check too.)</p>`,
    constraints: `−2<sup>31</sup> ≤ x ≤ 2<sup>31</sup> − 1`,
    example: `<p><code>123</code> → ${H.c('g', '321')}; <code>-120</code> → ${H.c('g', '-21')} (trailing zero becomes a leading zero and disappears); <code>1534236469</code> → reversed 9646324351 is bigger than 2,147,483,647 → ${H.c('r', '0')}.</p>`,
    brute: { why: `<p>Convert to a string, reverse it, parse it into a wider number (Java <code>long</code> via <code>Long.parseLong</code>, C++ <code>long long</code> via <code>stoll</code>, a JavaScript double, Python's unbounded <code>int</code>) and check the range. Works, but it allocates strings, handles the minus sign awkwardly, and it relies on a wider-than-32-bit value — exactly what the problem forbids. Interviewers want you to detect overflow <b>before</b> it happens.</p>`, code: { lang: 'java', code: String.raw`
class Solution {
    public int reverse(int x) {
        String digits = new StringBuilder(String.valueOf(Math.abs((long) x))).reverse().toString();
        long r = Long.parseLong(digits) * (x < 0 ? -1 : 1);       // uses 64-bit (not allowed)
        if (r > Integer.MAX_VALUE || r < Integer.MIN_VALUE) return 0;
        return (int) r;
    }
}`, alt: [{ lang: 'python', code: String.raw`
def reverse(x):
    digits = str(abs(x))[::-1]
    r = int(digits) * (-1 if x < 0 else 1)     # works on a wider-than-32-bit value (not allowed)
    if r > 2**31 - 1 or r < -2**31:
        return 0
    return r` }, { lang: 'js', code: String.raw`
function reverse(x) {
  const digits = String(Math.abs(x)).split('').reverse().join('');
  const r = Number(digits) * (x < 0 ? -1 : 1);   // works on a wider-than-32-bit value (not allowed)
  if (r > 2147483647 || r < -2147483648) return 0;
  return r;
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    int reverse(int x) {
        string digits = to_string(abs((long long) x));
        std::reverse(digits.begin(), digits.end());
        long long r = stoll(digits) * (x < 0 ? -1 : 1);     // uses 64-bit (not allowed)
        if (r > INT_MAX || r < INT_MIN) return 0;
        return (int) r;
    }
};` }] } },
    mcq: { q: 'rev is about to become rev * 10 + d. Which check (for positive numbers) guarantees no overflow?', options: ['rev &gt; Integer.MAX_VALUE / 10 means overflow (or == and d &gt; 7)', 'rev * 10 + d &gt; Integer.MAX_VALUE', 'rev &lt; 0', 'd &gt; 9'], answer: 0, explain: 'Checking rev * 10 + d directly is useless because it already overflowed. Compare rev against MAX/10 = 214748364 first; if equal, the last digit must be ≤ 7.' },
    hints: [`<p>Hint 1: Pop the last digit with <code>x % 10</code>, push it onto the result with <code>rev * 10 + d</code>, drop it with integer division by 10. In Java, C++ and JavaScript, % keeps the sign of x, so negatives work automatically (JavaScript needs <code>Math.trunc(x / 10)</code>). In Python, <code>-7 % 10</code> is 3, so work with <code>abs(x)</code> and put the sign back at the end.</p>`, `<p>Hint 2: Before pushing, check whether <code>rev * 10 + d</code> would leave int range: compare <code>rev</code> with INT_MAX / 10 and INT_MIN / 10 (<code>Integer.MAX_VALUE</code> in Java, <code>INT_MAX</code> in C++). In C++ this check is essential: signed overflow is undefined behaviour.</p>`, `<p>Hint 3: MAX = 2147483647 (last digit 7), MIN = −2147483648 (last digit −8). Recipe: while x != 0: d = x % 10; x /= 10; if rev &gt; MAX/10 or (rev == MAX/10 and d &gt; 7) return 0; same for MIN with −8; rev = rev*10 + d.</p>`],
    tests: { sig: 'int -> int', fn: 'reverse', cases: [
      [[123], 321],
      [[-123], -321],
      [[120], 21],
      [[-120], -21],
      [[0], 0],
      [[7], 7],
      [[1534236469], 0],
      [[2147483647], 0],
      [[-2147483648], 0],
      [[1463847412], 2147483641],
      [[-2147483412], -2143847412],
      [[1563847412], 0]
    ] },
    solution: {
      approach: `<p>Digit popping with a pre-check. Because Java's and C++'s <code>%</code> and <code>/</code> truncate toward zero (JavaScript: <code>%</code> plus <code>Math.trunc</code>), a negative x yields negative digits and the same loop builds a negative result. Overflow is detected by comparing against MAX/10 and MIN/10 before multiplying.</p>`,
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
      alt: [{ lang: 'python', code: String.raw`
def reverse(x):
    # Python ints never overflow, so we can build the full value and check the range once.
    # Note: Python's % follows the divisor's sign (-7 % 10 == 3), so work on abs(x).
    sign = -1 if x < 0 else 1
    rev = sign * int(str(abs(x))[::-1])
    return rev if -2**31 <= rev <= 2**31 - 1 else 0

print(reverse(123), reverse(-120), reverse(1534236469))  # 321 -21 0`, run: true }, { lang: 'js', code: String.raw`
const INT_MAX = 2147483647, INT_MIN = -2147483648;

function reverse(x) {
  let rev = 0;
  while (x !== 0) {
    const d = x % 10;                  // JS % keeps the sign of x, like Java and C++
    x = Math.trunc(x / 10);            // '/' gives a fraction in JS: truncate toward zero
    if (rev > Math.trunc(INT_MAX / 10) || (rev === Math.trunc(INT_MAX / 10) && d > 7)) return 0;
    if (rev < Math.trunc(INT_MIN / 10) || (rev === Math.trunc(INT_MIN / 10) && d < -8)) return 0;
    rev = rev * 10 + d;
  }
  return rev;
}

console.log(reverse(123), reverse(-120), reverse(1534236469));  // 321 -21 0`, run: true }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    int reverse(int x) {
        int rev = 0;
        while (x != 0) {
            int d = x % 10;                // C++ % truncates toward zero: negative x gives negative d
            x /= 10;
            // Signed overflow is undefined behaviour in C++, so check BEFORE multiplying.
            if (rev > INT_MAX / 10 || (rev == INT_MAX / 10 && d > 7)) return 0;
            if (rev < INT_MIN / 10 || (rev == INT_MIN / 10 && d < -8)) return 0;
            rev = rev * 10 + d;
        }
        return rev;
    }
};` }],
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
    brute: { why: `<p>Cut out the numeric prefix with index juggling, then hand it to a big-number type (Java <code>BigInteger</code>, Python's <code>int</code>, JavaScript <code>BigInt</code>; C++ has none, so the sketch parses into a <code>long double</code>) and clamp. Correct, but it needs a second pass, a big-number value for a 200-char input, and special handling for an empty prefix or a lone sign. The skill being tested is the single careful pass with overflow detection.</p>`, code: { lang: 'java', code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
def my_atoi(s):
    i, n = 0, len(s)
    while i < n and s[i] == ' ':
        i += 1
    start = i
    if i < n and s[i] in '+-':
        i += 1
    digits_start = i
    while i < n and s[i].isdigit():
        i += 1
    if i == digits_start:
        return 0                                 # no digits
    v = int(s[start:i])                          # big-number int handles any length
    return max(-2**31, min(2**31 - 1, v))` }, { lang: 'js', code: String.raw`
function myAtoi(s) {
  let i = 0;
  const n = s.length;
  while (i < n && s[i] === ' ') i++;
  const start = i;
  if (i < n && (s[i] === '+' || s[i] === '-')) i++;
  const digitsStart = i;
  while (i < n && s[i] >= '0' && s[i] <= '9') i++;
  if (i === digitsStart) return 0;               // no digits
  const v = BigInt(s.slice(start, i));           // handles any length
  if (v > 2147483647n) return 2147483647;
  if (v < -2147483648n) return -2147483648;
  return Number(v);
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    int myAtoi(const string& s) {
        int i = 0, n = s.size();
        while (i < n && s[i] == ' ') i++;
        int start = i;
        if (i < n && (s[i] == '+' || s[i] == '-')) i++;
        int digitsStart = i;
        while (i < n && isdigit((unsigned char) s[i])) i++;
        if (i == digitsStart) return 0;                          // no digits
        long double v = stold(s.substr(start, i - start));      // no built-in big integer: a long double holds 200 digits approximately
        if (v > INT_MAX) return INT_MAX;
        if (v < INT_MIN) return INT_MIN;
        return (int) v;
    }
};` }] } },
    mcq: { q: 'Input "   +-12". What should myAtoi return?', options: ['0 — after "+", the next char "-" is not a digit', '-12', '12', '-2147483648'], answer: 0, explain: 'Only one optional sign is allowed. After reading "+", the parser expects digits; "-" stops it with no digits read, so the result is 0.' },
    hints: [`<p>Hint 1: Treat it as a tiny state machine: spaces → optional sign → digits → stop. Use one index that only moves forward.</p>`, `<p>Hint 2: Accumulate the absolute value in a 64-bit integer (<code>long</code> / <code>long long</code>), or a 32-bit int with a MAX/10 pre-check. As soon as it exceeds 2<sup>31</sup>, you can clamp and stop reading.</p>`, `<p>Hint 3: Edge cases: empty string, only spaces, sign with no digits, huge digit runs (stop early — never let the accumulator overflow), leading zeros. Apply the sign at the end, then clamp.</p>`],
    tests: { sig: 'string -> int', fn: 'myAtoi', cases: [
      [['42'], 42],
      [['   -042'], -42],
      [['1337c0d3'], 1337],
      [['0-1'], 0],
      [['words and 987'], 0],
      [['-91283472332'], -2147483648],
      [['91283472332'], 2147483647],
      [[''], 0],
      [['   '], 0],
      [['+-12'], 0],
      [['-'], 0],
      [['   +0 123'], 0],
      [['+1'], 1],
      [['3.14'], 3],
      [['2147483647'], 2147483647],
      [['2147483648'], 2147483647],
      [['-2147483648'], -2147483648],
      [['00000000000012345678'], 12345678],
      [['9'.repeat(200)], 2147483647]
    ] },
    solution: {
      approach: `<p>Single pass. Skip spaces, read one sign, then build the number digit by digit in a 64-bit integer (<code>long</code> / <code>long long</code>; Python's int and a JS Number also work because we stop early). Because the moment the magnitude passes 2<sup>31</sup> we can clamp and return, the accumulator never overflows even for 200 digits.</p>`,
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
      alt: [{ lang: 'python', code: String.raw`
INT_MAX, INT_MIN = 2**31 - 1, -2**31

def my_atoi(s):
    i, n = 0, len(s)
    while i < n and s[i] == " ":           # 1) leading spaces
        i += 1
    sign = 1
    if i < n and s[i] in "+-":             # 2) optional sign
        sign = -1 if s[i] == "-" else 1
        i += 1
    val = 0
    while i < n and "0" <= s[i] <= "9":    # 3) ASCII digits only (str.isdigit accepts other scripts)
        val = val * 10 + ord(s[i]) - 48
        if sign * val > INT_MAX: return INT_MAX     # 5) clamp early
        if sign * val < INT_MIN: return INT_MIN
        i += 1
    return sign * val                      # 4) 0 if no digits

print(my_atoi("   -042"), my_atoi("1337c0d3"), my_atoi("-91283472332"))  # -42 1337 -2147483648`, run: true }, { lang: 'js', code: String.raw`
const INT_MAX = 2147483647, INT_MIN = -2147483648;

function myAtoi(s) {
  let i = 0;
  const n = s.length;
  while (i < n && s[i] === ' ') i++;                 // 1) leading spaces
  let sign = 1;
  if (i < n && (s[i] === '+' || s[i] === '-')) {     // 2) optional sign
    sign = s[i] === '-' ? -1 : 1;
    i++;
  }
  let val = 0;                                       // stays below 2^32: exact in a Number
  while (i < n && s[i] >= '0' && s[i] <= '9') {      // 3) digits
    val = val * 10 + (s.charCodeAt(i) - 48);
    if (sign * val > INT_MAX) return INT_MAX;        // 5) clamp early
    if (sign * val < INT_MIN) return INT_MIN;
    i++;
  }
  return sign * val || 0;                            // 4) 0 if no digits ('|| 0' turns -0 into 0)
}

console.log(myAtoi('   -042'), myAtoi('1337c0d3'), myAtoi('-91283472332'));  // -42 1337 -2147483648`, run: true }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    int myAtoi(const string& s) {
        size_t i = 0, n = s.size();
        while (i < n && s[i] == ' ') i++;                       // 1) leading spaces
        int sign = 1;
        if (i < n && (s[i] == '+' || s[i] == '-')) {            // 2) optional sign
            sign = s[i] == '-' ? -1 : 1;
            i++;
        }
        long long val = 0;
        while (i < n && isdigit((unsigned char)s[i])) {         // 3) digits
            val = val * 10 + (s[i] - '0');
            if (sign * val > INT_MAX) return INT_MAX;            // 5) clamp early: val never overflows
            if (sign * val < INT_MIN) return INT_MIN;
            i++;
        }
        return (int)(sign * val);                                // 4) 0 if no digits
    }
};` }],
      dry: { head: ['i', 'char', 'state', 'val'], rows: [['0–2', '" "', 'skip spaces', '0'], ['3', '-', 'sign = −1', '0'], ['4', '0', 'digit', '0'], ['5', '4', 'digit', '4'], ['6', '2', 'digit', '42 → return ' + H.c('g', '-42')]] },
      complexity: `<p>O(N) time, O(1) space. Each character is examined at most once.</p>`,
      followUps: ['Valid Number (Hard): accept decimals and exponents like "-1.5e10".', 'Parse a comma-separated list of integers robustly.']
    }
  });

  practice.push({
    title: 'Add Two Huge Numbers Given as Strings',
    level: 'Medium', tags: ['strings', 'big numbers', 'StringBuilder'], companies: ['Google', 'Meta', 'Airbnb', 'Wayfair'],
    statement: `<p>Given two non-negative integers <code>num1</code> and <code>num2</code> as strings, return their sum as a string. You must not use a big-number type (Java <code>BigInteger</code>, Python's <code>int()</code> on the whole string, JavaScript <code>BigInt</code>) or convert the whole inputs to numbers.</p>`,
    constraints: `1 ≤ num1.length, num2.length ≤ 10<sup>4</sup>; digits only; no leading zeros except "0" itself.`,
    example: `<p><code>"456" + "77"</code> → ${H.c('g', '"533"')}.</p>${H.table(['column', '6 + 7', '5 + 7 + carry 1', '4 + 0 + carry 1'], [['digit / carry', '3 / 1', '3 / 1', '5 / 0']])}<p>Read the digits backwards: 5, 3, 3 → "533".</p>`,
    brute: { why: `<p>Converting both strings to a built-in number and adding them (<code>Long.parseLong</code> in Java, <code>stoll</code> in C++, <code>Number</code> in JavaScript, <code>int</code> in Python) is the "obvious" attempt — and it fails on long inputs: past 18–19 digits Java and C++ overflow or throw, JavaScript silently loses precision after about 15 digits, and Python 3.11+ refuses string/int conversions beyond 4300 digits by default. The inputs here have up to 10,000 digits. Fixed-size types cannot represent the input at all.</p>`, code: { lang: 'java', code: String.raw`
class Solution {
    public String addStrings(String num1, String num2) {
        // Breaks for inputs longer than ~18 digits: long has only 64 bits.
        return String.valueOf(Long.parseLong(num1) + Long.parseLong(num2));
    }
}`, alt: [{ lang: 'python', code: String.raw`
def add_strings(num1, num2):
    # Breaks for inputs longer than 4300 digits: Python 3.11+ refuses int<->str conversion beyond that limit.
    return str(int(num1) + int(num2))` }, { lang: 'js', code: String.raw`
function addStrings(num1, num2) {
  // Breaks for inputs longer than ~15 digits: a Number is a double with 53 bits of precision.
  return String(Number(num1) + Number(num2));
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    string addStrings(const string& num1, const string& num2) {
        // Breaks for inputs longer than ~18 digits: long long has only 64 bits (stoll throws).
        return to_string(stoll(num1) + stoll(num2));
    }
};` }] } },
    mcq: { q: 'Adding column by column from the right, what is the largest possible carry?', options: ['1', '9', '18', '10'], answer: 0, explain: 'The largest column sum is 9 + 9 + 1 = 19, which gives digit 9 and carry 1. The carry can never exceed 1 in addition.' },
    hints: [`<p>Hint 1: Do exactly what you learned in school: start from the rightmost digits, add with a carry, write the last digit, carry the rest.</p>`, `<p>Hint 2: Two indexes i, j at the ends of the strings. Treat a finished string as contributing 0. Append digits to a builder (StringBuilder, a list, an array, a <code>std::string</code>) and reverse at the end.</p>`, `<p>Hint 3: Do not forget a final carry ("99" + "1" = "100"). Loop condition: i ≥ 0 || j ≥ 0 || carry &gt; 0. Digit value is <code>c - '0'</code> (Python: <code>ord(c) - 48</code>, JavaScript: <code>s.charCodeAt(i) - 48</code>).</p>`],
    tests: { sig: 'string string -> string', fn: 'addStrings', cases: [
      [['456', '77'], '533'],
      [['99', '1'], '100'],
      [['0', '0'], '0'],
      [['1', '9'], '10'],
      [['11', '123'], '134'],
      [['9999999999999999999', '1'], '10000000000000000000'],
      [['9'.repeat(10000), '1'], '1' + '0'.repeat(10000)]
    ] },
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

print(add_strings("456", "77"), add_strings("99", "1"))  # 533 100`, run: true }, { lang: 'js', code: String.raw`
function addStrings(num1, num2) {
  const out = [];                          // digits in reverse; join once at the end
  let i = num1.length - 1, j = num2.length - 1, carry = 0;
  while (i >= 0 || j >= 0 || carry > 0) {
    const d1 = i >= 0 ? num1.charCodeAt(i--) - 48 : 0;   // 48 is the code of '0'
    const d2 = j >= 0 ? num2.charCodeAt(j--) - 48 : 0;
    const sum = d1 + d2 + carry;
    out.push(sum % 10);
    carry = Math.floor(sum / 10);
  }
  return out.reverse().join('');
}

console.log(addStrings('456', '77'), addStrings('99', '1'));  // 533 100`, run: true }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    string addStrings(const string& num1, const string& num2) {
        string out;                          // digits in reverse
        int i = (int)num1.size() - 1, j = (int)num2.size() - 1, carry = 0;
        while (i >= 0 || j >= 0 || carry > 0) {
            int sum = carry;
            if (i >= 0) sum += num1[i--] - '0';
            if (j >= 0) sum += num2[j--] - '0';
            out.push_back(char('0' + sum % 10));   // push_back is amortised O(1)
            carry = sum / 10;
        }
        reverse(out.begin(), out.end());
        return out;
    }
};` }],
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
    brute: { why: `<p>Use slow input (Java <code>Scanner</code>, Python <code>input()</code>, C++ <code>cin</code> with default sync) and, for each query, loop from l to r adding values, printing each answer with its own call (<code>System.out.println</code> / <code>print</code> / <code>console.log</code> / <code>endl</code>). Worst case Q × N = 4 × 10<sup>10</sup> additions — hopeless — plus slow input and 2 × 10<sup>5</sup> separate print calls. Two separate problems: algorithmic (repeated summing) and I/O.</p>`, code: { lang: 'java', code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
def main():
    n, q = map(int, input().split())          # input() per line: slow for 2*10^5 queries
    a = [0] + list(map(int, input().split()))
    for _ in range(q):
        l, r = map(int, input().split())
        s = 0
        for i in range(l, r + 1):
            s += a[i]                         # O(N) per query
        print(s)                              # one print call per answer` }, { lang: 'js', code: String.raw`
const lines = require('fs').readFileSync(0, 'utf8').split('\n');
const [n, q] = lines[0].split(' ').map(Number);
const a = [0, ...lines[1].split(' ').map(Number)];
for (let t = 0; t < q; t++) {
  const [l, r] = lines[2 + t].split(' ').map(Number);
  let s = 0;
  for (let i = l; i <= r; i++) s += a[i];     // O(N) per query
  console.log(s);                             // one console call per answer
}` }, { lang: 'cpp', code: String.raw`
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, q;
    cin >> n >> q;                           // cin still synced with C stdio: slow
    vector<int> a(n + 1);
    for (int i = 1; i <= n; i++) cin >> a[i];
    while (q-- > 0) {
        int l, r;
        cin >> l >> r;
        long long s = 0;
        for (int i = l; i <= r; i++) s += a[i];   // O(N) per query
        cout << s << endl;                        // endl flushes on every answer
    }
}` }] } },
    mcq: { q: 'With prefix sums <code>pre[i] = a[1] + … + a[i]</code>, the sum of a[l..r] equals…', options: ['pre[r] − pre[l − 1]', 'pre[r] − pre[l]', 'pre[r + 1] − pre[l]', 'pre[l] + pre[r]'], answer: 0, explain: 'pre[r] includes a[1..r]; subtracting pre[l−1] removes a[1..l−1], leaving exactly a[l..r]. pre[0] = 0 makes l = 1 work.' },
    hints: [`<p>Hint 1: Every query re-adds overlapping stretches of the same array. Precompute running totals once.</p>`, `<p>Hint 2: A prefix array <code>pre</code> of size N + 1 with pre[0] = 0; answer = pre[r] − pre[l − 1] in O(1). Totals reach 2 × 10<sup>14</sup> → 64-bit (<code>long</code> / <code>long long</code>; a JS Number is still exact below 2<sup>53</sup>).</p>`, `<p>Hint 3: 6 × 10<sup>5</sup> numbers to read and 2 × 10<sup>5</sup> lines to print → the fast reader of your language for input (BufferedReader + StringTokenizer, <code>sys.stdin.buffer.read()</code>, <code>fs.readFileSync(0)</code>, unsynced <code>cin</code>) and one big write for output.</p>`],
    tests: { io: true, cases: [
      { stdin: '5 3\n3 1 4 1 5\n1 3\n2 5\n4 4\n', stdout: '8\n11\n1' },
      { stdin: '1 1\n-5\n1 1\n', stdout: '-5' },
      { stdin: '3 2\n1000000000 1000000000 1000000000\n1 3\n2 3\n', stdout: '3000000000\n2000000000' },
      { stdin: '4 3\n-1 -2 3 0\n1 4\n2 3\n4 4\n', stdout: '0\n1\n0' },
      { stdin: '6 2\n1 2 3\n4 5 6\n1 6\n3 5\n', stdout: '21\n12' },
      { stdin: '3 3\n-1000000000 -1000000000 -1000000000\n1 3\n1 1\n3 3\n', stdout: '-3000000000\n-1000000000\n-1000000000' },
      { stdin: '1000 2\n' + Array(1000).fill('1000000000').join(' ') + '\n1 1000\n500 500\n', stdout: '1000000000000\n1000000000' }
    ] },
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
      alt: [{ lang: 'python', code: String.raw`
import sys
from itertools import accumulate

def main():
    data = sys.stdin.buffer.read().split()       # one read for all input
    n, q = int(data[0]), int(data[1])
    pre = [0, *accumulate(map(int, data[2:2 + n]))]   # pre[0] = 0
    out = []
    pos = 2 + n
    for _ in range(q):
        l, r = int(data[pos]), int(data[pos + 1])
        pos += 2
        out.append(str(pre[r] - pre[l - 1]))     # O(1) per query
    sys.stdout.write("\n".join(out) + "\n")      # one big write

main()` }, { lang: 'js', code: String.raw`
const data = require('fs').readFileSync(0, 'utf8').split(/\s+/).filter(Boolean).map(Number);
let pos = 0;
const n = data[pos++], q = data[pos++];
const pre = new Float64Array(n + 1);             // sums up to 2e14: exact in a double
for (let i = 1; i <= n; i++) pre[i] = pre[i - 1] + data[pos++];
const out = [];
for (let k = 0; k < q; k++) {
  const l = data[pos++], r = data[pos++];
  out.push(pre[r] - pre[l - 1]);                 // O(1) per query
}
process.stdout.write(out.join('\n') + '\n');     // one big write` }, { lang: 'cpp', code: String.raw`
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, q;
    cin >> n >> q;
    vector<long long> pre(n + 1, 0);             // pre[0] = 0
    for (int i = 1; i <= n; i++) {
        long long x;
        cin >> x;
        pre[i] = pre[i - 1] + x;
    }
    string out;
    while (q--) {
        int l, r;
        cin >> l >> r;
        out += to_string(pre[r] - pre[l - 1]);   // O(1) per query
        out += '\n';                             // '\n', not endl: endl flushes every line
    }
    cout << out;
    return 0;
}` }],
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
    brute: { why: `<p>Rotate by one step, k times: save the last element, shift everything right by one, put it at the front. Each step is O(N), so O(N · k). With k up to 10<sup>9</sup> that is absurd; even after <code>k %= n</code> it is up to 10<sup>10</sup> moves. The wasted work: every element is moved k times instead of once.</p>`, code: { lang: 'java', code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
def rotate(nums, k):
    n = len(nums)
    k %= n                                    # at least avoid useless full cycles
    for _ in range(k):
        last = nums[n - 1]
        for i in range(n - 1, 0, -1):
            nums[i] = nums[i - 1]             # shift right by one
        nums[0] = last` }, { lang: 'js', code: String.raw`
function rotate(nums, k) {
  const n = nums.length;
  k %= n;                                     // at least avoid useless full cycles
  for (let step = 0; step < k; step++) {
    const last = nums[n - 1];
    for (let i = n - 1; i > 0; i--) nums[i] = nums[i - 1];   // shift right by one
    nums[0] = last;
  }
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    void rotate(vector<int>& nums, int k) {
        int n = nums.size();
        k %= n;                                   // at least avoid useless full cycles
        for (int step = 0; step < k; step++) {
            int last = nums[n - 1];
            for (int i = n - 1; i > 0; i--) nums[i] = nums[i - 1];   // shift right by one
            nums[0] = last;
        }
    }
};` }] } },
    mcq: { q: 'Why do we start with <code>k %= n</code>?', options: ['Rotating by n returns the original array, so only k mod n matters', 'To make k negative', 'Because k must be even', 'To sort the array'], answer: 0, explain: 'After n single steps every element is back home. k = 10, n = 7 behaves exactly like k = 3, and it also prevents index errors when k ≥ n.' },
    hints: [`<p>Hint 1: The answer is "last k elements, then first n − k elements". Can reversing pieces of the array produce that order?</p>`, `<p>Hint 2: Reverse the whole array, then reverse the first k elements, then reverse the remaining n − k elements.</p>`, `<p>Hint 3: Do <code>k %= n</code> first (k can be 10<sup>9</sup> or ≥ n). Write one helper <code>reverse(a, l, r)</code> and call it three times. k = 0 must leave the array unchanged.</p>`],
    tests: { sig: 'int[] int -> void', fn: 'rotate', mutate: 0, cases: [
      [[[1, 2, 3, 4, 5, 6, 7], 3], [5, 6, 7, 1, 2, 3, 4]],
      [[[-1, -100, 3, 99], 2], [3, 99, -1, -100]],
      [[[1], 0], [1]],
      [[[1], 1000000000], [1]],
      [[[1, 2], 3], [2, 1]],
      [[[1, 2, 3], 0], [1, 2, 3]],
      [[[1, 2, 3], 3], [1, 2, 3]],
      [[[1, 2, 3, 4, 5, 6, 7], 10], [5, 6, 7, 1, 2, 3, 4]],
      [[[-2147483648, 2147483647], 1], [2147483647, -2147483648]]
    ] },
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
      alt: [{ lang: 'python', code: String.raw`
def rotate(nums, k):
    def rev(l, r):                     # reverse nums[l..r] in place
        while l < r:
            nums[l], nums[r] = nums[r], nums[l]
            l, r = l + 1, r - 1

    n = len(nums)
    k %= n
    rev(0, n - 1)
    rev(0, k - 1)
    rev(k, n - 1)
    # Shorter but uses O(n) extra memory: nums[:] = nums[-k:] + nums[:-k] (when k > 0)

a = [1, 2, 3, 4, 5, 6, 7]
rotate(a, 3)
print(a)  # [5, 6, 7, 1, 2, 3, 4]`, run: true }, { lang: 'js', code: String.raw`
function reverseRange(a, l, r) {
  while (l < r) {
    [a[l], a[r]] = [a[r], a[l]];
    l++;
    r--;
  }
}

function rotate(nums, k) {
  const n = nums.length;
  k %= n;
  reverseRange(nums, 0, n - 1);
  reverseRange(nums, 0, k - 1);
  reverseRange(nums, k, n - 1);
}

const a = [1, 2, 3, 4, 5, 6, 7];
rotate(a, 3);
console.log(a);  // [ 5, 6, 7, 1, 2, 3, 4 ]`, run: true }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    void rotate(vector<int>& nums, int k) {
        int n = nums.size();
        k %= n;
        // std::reverse works on the half-open range [first, last)
        reverse(nums.begin(), nums.end());
        reverse(nums.begin(), nums.begin() + k);
        reverse(nums.begin() + k, nums.end());
        // The STL also has std::rotate(nums.begin(), nums.end() - k, nums.end()).
    }
};` }],
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
    brute: { why: `<p>Copy the whole board, count neighbours on the copy, write results to the original. Correct and clear, but O(m·n) extra memory. The naive in-place attempt (no copy) is <b>wrong</b>: cells updated early change the neighbour counts of cells processed later — the rules must be simultaneous.</p>`, code: { lang: 'java', code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
def game_of_life(board):
    m, n = len(board), len(board[0])
    old = [row[:] for row in board]           # O(m*n) extra memory
    for r in range(m):
        for c in range(n):
            live = 0
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    if dr == 0 and dc == 0:
                        continue
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < m and 0 <= nc < n:
                        live += old[nr][nc]
            board[r][c] = 1 if (live == 3 or (old[r][c] == 1 and live == 2)) else 0` }, { lang: 'js', code: String.raw`
function gameOfLife(board) {
  const m = board.length, n = board[0].length;
  const old = board.map((row) => row.slice());     // O(m*n) extra memory
  for (let r = 0; r < m; r++)
    for (let c = 0; c < n; c++) {
      let live = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < m && nc >= 0 && nc < n) live += old[nr][nc];
        }
      board[r][c] = (live === 3 || (old[r][c] === 1 && live === 2)) ? 1 : 0;
    }
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    void gameOfLife(vector<vector<int>>& board) {
        int m = board.size(), n = board[0].size();
        vector<vector<int>> old = board;                // O(m*n) extra memory
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
};` }] } },
    mcq: { q: 'Each cell holds 0 or 1 in an int (32 bits). How can we store the next state without a second board?', options: ['Use bit 1 for the next state and bit 0 for the current state', 'Store it in a String', 'Use negative zero', 'It is impossible in O(1) space'], answer: 0, explain: 'board[r][c] |= nextState &lt;&lt; 1 keeps the current state readable as board[r][c] &amp; 1. Afterwards shift every cell right by 1.' },
    hints: [`<p>Hint 1: The difficulty is that neighbours must see the <b>old</b> state. Can one int cell remember both old and new states?</p>`, `<p>Hint 2: Bit 0 = current state, bit 1 = next state. While counting neighbours, read only <code>board[nr][nc] &amp; 1</code>. Write the new state with <code>board[r][c] |= 2</code> if it will be alive.</p>`, `<p>Hint 3: Second pass: <code>board[r][c] &gt;&gt;= 1</code> makes the next state current. Remember bounds checks on all 8 directions and skip (0, 0).</p>`],
    tests: { sig: 'int[][] -> void', fn: 'gameOfLife', mutate: 0, cases: [
      [[[[0, 1, 0], [0, 0, 1], [1, 1, 1], [0, 0, 0]]], [[0, 0, 0], [1, 0, 1], [0, 1, 1], [0, 1, 0]]],
      [[[[1, 1], [1, 0]]], [[1, 1], [1, 1]]],
      [[[[1]]], [[0]]],
      [[[[0]]], [[0]]],
      [[[[0, 1, 0], [0, 1, 0], [0, 1, 0]]], [[0, 0, 0], [1, 1, 1], [0, 0, 0]]],
      [[[[1, 1], [1, 1]]], [[1, 1], [1, 1]]],
      [[[[1, 1, 1]]], [[0, 1, 0]]],
      [[[[1, 0, 1, 1, 0], [0, 1, 1, 0, 1], [1, 1, 0, 0, 0]]], [[0, 0, 1, 1, 0], [0, 0, 0, 0, 0], [1, 1, 1, 0, 0]]]
    ] },
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
      alt: [{ lang: 'python', code: String.raw`
def game_of_life(board):
    m, n = len(board), len(board[0])
    for r in range(m):
        for c in range(n):
            live = sum(board[nr][nc] & 1                      # OLD state only
                       for nr in range(max(0, r - 1), min(m, r + 2))
                       for nc in range(max(0, c - 1), min(n, c + 2))
                       if (nr, nc) != (r, c))
            if live == 3 or (board[r][c] & 1 and live == 2):
                board[r][c] |= 2                              # next state in bit 1
    for row in board:
        for c in range(n):
            row[c] >>= 1                                      # promote next -> current

b = [[0, 1, 0], [0, 0, 1], [1, 1, 1], [0, 0, 0]]
game_of_life(b)
print(b)  # [[0, 0, 0], [1, 0, 1], [0, 1, 1], [0, 1, 0]]`, run: true }, { lang: 'js', code: String.raw`
function gameOfLife(board) {
  const m = board.length, n = board[0].length;
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      let live = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < m && nc >= 0 && nc < n) live += board[nr][nc] & 1;   // OLD state only
        }
      }
      if (live === 3 || ((board[r][c] & 1) === 1 && live === 2)) board[r][c] |= 2;
    }
  }
  for (const row of board) for (let c = 0; c < n; c++) row[c] >>= 1;
}

const b = [[0, 1, 0], [0, 0, 1], [1, 1, 1], [0, 0, 0]];
gameOfLife(b);
console.log(JSON.stringify(b));  // [[0,0,0],[1,0,1],[0,1,1],[0,1,0]]`, run: true }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    void gameOfLife(vector<vector<int>>& board) {
        int m = board.size(), n = board[0].size();
        for (int r = 0; r < m; r++) {
            for (int c = 0; c < n; c++) {
                int live = 0;
                for (int dr = -1; dr <= 1; dr++)
                    for (int dc = -1; dc <= 1; dc++) {
                        if (dr == 0 && dc == 0) continue;
                        int nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < m && nc >= 0 && nc < n) live += board[nr][nc] & 1;
                    }
                if (live == 3 || ((board[r][c] & 1) && live == 2)) board[r][c] |= 2;
            }
        }
        for (auto& row : board)               // reference: edit the real row, not a copy
            for (int& cell : row) cell >>= 1;
    }
};` }],
      dry: { head: ['cell', 'old', 'live neighbours', 'rule', 'stored value', 'after shift'], rows: [['(0,1)', '1', '1', 'under-population', '01 = 1', '0'], ['(1,0)', '0', '3', 'birth', '10 = 2', '1'], ['(1,2)', '1', '3', 'survives', '11 = 3', '1'], ['(2,1)', '1', '3', 'survives', '11 = 3', '1']] },
      complexity: `<p>O(m · n · 8) = O(m · n) time, O(1) extra space.</p>`,
      followUps: ['The board is infinite / huge and sparse: store only live cells in a HashSet of coordinates.', 'Simulate k generations efficiently (detect cycles).']
    }
  });

  practice.push({
    title: 'Multiply Strings',
    level: 'Medium', tags: ['strings', 'big numbers', 'arrays'], companies: ['Meta', 'Microsoft', 'Twitter', 'Amazon'],
    statement: `<p>Given two non-negative integers <code>num1</code> and <code>num2</code> as strings, return their product as a string. Do not use a big-number type (<code>BigInteger</code>, Python <code>int()</code> on the whole input, JavaScript <code>BigInt</code>) or convert the inputs to integers directly.</p>`,
    constraints: `1 ≤ num1.length, num2.length ≤ 200; digits only; no leading zeros except "0".`,
    example: `<p><code>"123" × "45"</code> → ${H.c('g', '"5535"')}.</p>${H.table(['', 'pos 0', 'pos 1', 'pos 2', 'pos 3', 'pos 4'], [['raw sums', '0', '4', '13', '22', '15'], ['after carries', '0', '5', '5', '3', '5']])}<p>Digit i of num1 times digit j of num2 lands at position <b>i + j + 1</b>. Strip the leading 0 → "5535".</p>`,
    brute: { why: `<p>Mimic long multiplication with strings: for each digit of num2, build a partial product string (num1 × digit, padded with zeros) and add it to the total with an add-strings helper. O(N·M) arithmetic, but it creates M intermediate strings of length up to N + M and re-copies the growing total each time — lots of allocation and code.</p>`, code: { lang: 'java', code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
def multiply(num1, num2):
    if num1 == "0" or num2 == "0":
        return "0"
    total = "0"
    for shift, j in enumerate(range(len(num2) - 1, -1, -1)):
        d = ord(num2[j]) - 48
        part = ["0"] * shift                    # place value zeros
        carry = 0
        for i in range(len(num1) - 1, -1, -1):
            p = (ord(num1[i]) - 48) * d + carry
            part.append(str(p % 10))
            carry = p // 10
        if carry > 0:
            part.append(str(carry))
        total = add(total, "".join(reversed(part)))     # new string every round
    return total

def add(a, b):
    out, i, j, carry = [], len(a) - 1, len(b) - 1, 0
    while i >= 0 or j >= 0 or carry > 0:
        s = carry
        if i >= 0:
            s += ord(a[i]) - 48
            i -= 1
        if j >= 0:
            s += ord(b[j]) - 48
            j -= 1
        out.append(str(s % 10))
        carry = s // 10
    return "".join(reversed(out))` }, { lang: 'js', code: String.raw`
function multiply(num1, num2) {
  if (num1 === '0' || num2 === '0') return '0';
  let total = '0';
  for (let j = num2.length - 1, shift = 0; j >= 0; j--, shift++) {
    const d = num2.charCodeAt(j) - 48;
    const part = new Array(shift).fill('0');                 // place value zeros
    let carry = 0;
    for (let i = num1.length - 1; i >= 0; i--) {
      const p = (num1.charCodeAt(i) - 48) * d + carry;
      part.push(p % 10);
      carry = Math.floor(p / 10);
    }
    if (carry > 0) part.push(carry);
    total = add(total, part.reverse().join(''));             // new string every round
  }
  return total;
}

function add(a, b) {
  const out = [];
  let i = a.length - 1, j = b.length - 1, carry = 0;
  while (i >= 0 || j >= 0 || carry > 0) {
    const s = carry + (i >= 0 ? a.charCodeAt(i--) - 48 : 0) + (j >= 0 ? b.charCodeAt(j--) - 48 : 0);
    out.push(s % 10);
    carry = Math.floor(s / 10);
  }
  return out.reverse().join('');
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    string multiply(const string& num1, const string& num2) {
        if (num1 == "0" || num2 == "0") return "0";
        string total = "0";
        for (int j = num2.size() - 1, shift = 0; j >= 0; j--, shift++) {
            int d = num2[j] - '0';
            string part(shift, '0');                         // place value zeros
            int carry = 0;
            for (int i = num1.size() - 1; i >= 0; i--) {
                int p = (num1[i] - '0') * d + carry;
                part += char('0' + p % 10);
                carry = p / 10;
            }
            if (carry > 0) part += to_string(carry);
            reverse(part.begin(), part.end());
            total = add(total, part);                        // new string every round
        }
        return total;
    }

private:
    string add(const string& a, const string& b) {
        string sb;
        int i = a.size() - 1, j = b.size() - 1, carry = 0;
        while (i >= 0 || j >= 0 || carry > 0) {
            int s = carry + (i >= 0 ? a[i--] - '0' : 0) + (j >= 0 ? b[j--] - '0' : 0);
            sb += char('0' + s % 10);
            carry = s / 10;
        }
        reverse(sb.begin(), sb.end());
        return sb;
    }
};` }] } },
    mcq: { q: 'A number with N digits times a number with M digits has at most how many digits?', options: ['N + M', 'N × M', 'max(N, M) + 1', 'N + M + 1'], answer: 0, explain: '10<sup>N</sup> × 10<sup>M</sup> = 10<sup>N+M</sup>, and both factors are smaller, so the product has at most N + M digits. Allocate an int[N + M].' },
    hints: [`<p>Hint 1: Indexing from the left, digit i of num1 (place value 10<sup>N−1−i</sup>) times digit j of num2 contributes to result position i + j + 1 of an array of length N + M.</p>`, `<p>Hint 2: Accumulate all products into <code>int[] res = new int[N + M]</code> first, then sweep once from right to left pushing carries: res[k − 1] += res[k] / 10; res[k] %= 10.</p>`, `<p>Hint 3: Each cell collects at most ~200 products of ≤ 81 — fits easily in int. Skip leading zeros when building the string; if everything is zero, return "0".</p>`],
    tests: { sig: 'string string -> string', fn: 'multiply', cases: [
      [['123', '45'], '5535'],
      [['2', '3'], '6'],
      [['0', '52'], '0'],
      [['52', '0'], '0'],
      [['1', '1'], '1'],
      [['999', '999'], '998001'],
      [['123456789', '987654321'], '121932631112635269'],
      [['9'.repeat(200), '9'.repeat(200)], '9'.repeat(199) + '8' + '0'.repeat(199) + '1']
    ] },
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
      alt: [{ lang: 'python', code: String.raw`
def multiply(num1, num2):
    n, m = len(num1), len(num2)
    res = [0] * (n + m)                          # product has at most n + m digits
    for i in range(n - 1, -1, -1):
        a = ord(num1[i]) - 48
        for j in range(m - 1, -1, -1):
            res[i + j + 1] += a * (ord(num2[j]) - 48)   # accumulate, carry later
    for k in range(n + m - 1, 0, -1):            # single carry sweep
        res[k - 1] += res[k] // 10
        res[k] %= 10
    s = "".join(map(str, res)).lstrip("0")       # skip leading zeros
    return s or "0"

print(multiply("123", "45"), multiply("0", "52"))  # 5535 0`, run: true }, { lang: 'js', code: String.raw`
function multiply(num1, num2) {
  const n = num1.length, m = num2.length;
  const res = new Array(n + m).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    const a = num1.charCodeAt(i) - 48;
    for (let j = m - 1; j >= 0; j--) res[i + j + 1] += a * (num2.charCodeAt(j) - 48);
  }
  for (let k = n + m - 1; k > 0; k--) {          // single carry sweep
    res[k - 1] += Math.floor(res[k] / 10);
    res[k] %= 10;
  }
  const s = res.join('').replace(/^0+/, '');     // skip leading zeros
  return s === '' ? '0' : s;
}

console.log(multiply('123', '45'), multiply('0', '52'));  // 5535 0`, run: true }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    string multiply(const string& num1, const string& num2) {
        int n = num1.size(), m = num2.size();
        vector<int> res(n + m, 0);
        for (int i = n - 1; i >= 0; i--)
            for (int j = m - 1; j >= 0; j--)
                res[i + j + 1] += (num1[i] - '0') * (num2[j] - '0');
        for (int k = n + m - 1; k > 0; k--) {     // single carry sweep
            res[k - 1] += res[k] / 10;
            res[k] %= 10;
        }
        string s;
        for (int d : res) if (!s.empty() || d != 0) s.push_back(char('0' + d));
        return s.empty() ? "0" : s;
    }
};` }],
      dry: { head: ['i (num1 digit)', 'j (num2 digit)', 'product', 'slot i+j+1'], rows: [['2 (3)', '1 (5)', '15', '4'], ['2 (3)', '0 (4)', '12', '3'], ['1 (2)', '1 (5)', '10', '3'], ['1 (2)', '0 (4)', '8', '2'], ['0 (1)', '1 (5)', '5', '2'], ['0 (1)', '0 (4)', '4', '1'], ['carry sweep', '', '[0,4,13,22,15] →', H.c('g', '[0,5,5,3,5] → "5535"')]] },
      complexity: `<p>O(N · M) time, O(N + M) space.</p>`,
      followUps: ['Karatsuba multiplication: O(N<sup>1.585</sup>) for very long numbers.', 'Factorial of 1000 as a string (see the Hard problem below).']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  // Independent oracle for the factorial tests: exact BigInt arithmetic.
  function bigFactorial(n) { var f = BigInt(1); for (var i = 2; i <= n; i++) f *= BigInt(i); return f.toString(); }

  practice.push({
    title: 'Factorial of a Large Number',
    level: 'Hard', tags: ['arrays', 'big numbers', 'overflow', 'simulation'], companies: ['Amazon', 'Samsung', 'Oracle'],
    statement: `<p>Given <code>N</code>, return <code>N!</code> (1 × 2 × … × N) as a string of digits. Do not use a big-number type (<code>BigInteger</code>, Python's unbounded int on the whole value, JavaScript <code>BigInt</code>); C++ has none built in anyway.</p>`,
    constraints: `0 ≤ N ≤ 1000 (1000! has 2,568 digits)`,
    example: `<p><code>N = 25</code> → ${H.c('g', '"15511210043330985984000000"')} (26 digits).</p><p>Why a <code>long</code> fails: 20! = 2,432,902,008,176,640,000 is the largest factorial that fits; ${H.c('r', '21! overflows')} 9.22 × 10<sup>18</sup>.</p>`,
    brute: { why: `<p>Multiply into a fixed-size integer (<code>long</code> in Java, <code>long long</code> in C++). It is correct up to N = 20, then silently overflows to garbage (no exception); a JavaScript double loses precision from 23! on, and Python's built-in <code>int</code> would simply work. Using a big-number type (<code>BigInteger</code>, Python <code>int</code>, <code>BigInt</code>) would be correct but is banned here — and the interviewer wants to see that you can do big-number arithmetic with arrays yourself.</p>`, code: { lang: 'java', code: String.raw`
class Solution {
    public String factorial(int n) {
        long f = 1;
        for (int i = 2; i <= n; i++) f *= i;   // overflows silently for n >= 21
        return String.valueOf(f);
    }
}`, alt: [{ lang: 'python', code: String.raw`
def factorial(n):
    f = 1
    for i in range(2, n + 1):
        f *= i          # Python's int is already a big number; in other languages this overflows silently
    return str(f)` }, { lang: 'js', code: String.raw`
function factorial(n) {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;   // loses precision past 22!, and becomes Infinity for n >= 171
  return String(f);
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    string factorial(int n) {
        long long f = 1;
        for (int i = 2; i <= n; i++) f *= i;   // overflows silently for n >= 21
        return to_string(f);
    }
};` }] } },
    mcq: { q: 'You store digits least-significant first in an int array and multiply by i ≤ 1000. What is the largest value of digit × i + carry in one step?', options: ['A few thousand (9 × 1000 + carry) — fits in int', 'More than 2<sup>31</sup>', 'Exactly 9', 'It depends on the number of digits'], answer: 0, explain: 'digit ≤ 9, i ≤ 1000, carry ≤ ~1000, so the product is ≤ ~10<sup>4</sup>. Plain int arithmetic is perfectly safe.' },
    hints: [`<p>Hint 1: Store the number as an array of digits, <b>least significant first</b> (units at index 0). That makes carries flow toward higher indexes and lets the array grow at the end.</p>`, `<p>Hint 2: To multiply the whole number by i: for each digit, <code>prod = digit * i + carry</code>; store <code>prod % 10</code>; <code>carry = prod / 10</code>. After the last digit, append carry digit by digit.</p>`, `<p>Hint 3: Allocate 3000 digit cells (enough for 1000!) and track <code>len</code>, or use a growable list/vector. 0! = 1! = 1. Build the answer by reading digits from the most significant end.</p>`],
    tests: { sig: 'int -> string', fn: 'factorial', cases: [
        [[0], '1'],
        [[1], '1'],
        [[2], '2'],
        [[5], '120'],
        [[20], '2432902008176640000'],
        [[21], '51090942171709440000'],
        [[25], '15511210043330985984000000'],
        [[100], bigFactorial(100)],
        [[1000], bigFactorial(1000)]
      ] },
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
def factorial(n):
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

print(factorial(25))        # 15511210043330985984000000
print(len(factorial(1000))) # 2568
# (In real Python code, math.factorial(n) does this for you: Python ints are unbounded.)`, run: true }, { lang: 'js', code: String.raw`
function factorial(n) {
  const d = [1];                             // least significant digit first
  for (let i = 2; i <= n; i++) {
    let carry = 0;
    for (let k = 0; k < d.length; k++) {
      const prod = d[k] * i + carry;
      d[k] = prod % 10;
      carry = Math.floor(prod / 10);
    }
    while (carry > 0) {                      // number grew: append new high digits
      d.push(carry % 10);
      carry = Math.floor(carry / 10);
    }
  }
  return d.reverse().join('');
}

console.log(factorial(25));               // 15511210043330985984000000
console.log(factorial(1000).length);      // 2568
// (Modern JS has BigInt: let f = 1n; f *= BigInt(i) — but interviews want the digit array.)`, run: true }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    string factorial(int n) {
        vector<int> d{1};                    // least significant digit first
        for (int i = 2; i <= n; i++) {
            int carry = 0;
            for (int& digit : d) {
                int prod = digit * i + carry;
                digit = prod % 10;
                carry = prod / 10;
            }
            while (carry > 0) {              // number grew: append new high digits
                d.push_back(carry % 10);
                carry /= 10;
            }
        }
        string s;
        for (auto it = d.rbegin(); it != d.rend(); ++it) s.push_back(char('0' + *it));
        return s;
    }
};` }],
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
    brute: { why: `<p>A recursive function that concatenates strings at every level with <code>+ " " +</code> and then calls <code>trim()</code> to clean up extra spaces. It is correct, but it builds and copies many temporary strings and relies on trimming to hide spacing bugs — a design that breaks easily when requirements change (e.g. adding "and" in British English).</p>`, code: { lang: 'java', code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

def number_to_words(num):
    if num == 0:
        return "Zero"
    return words(num).strip()

def words(n):
    if n == 0: return ""
    if n < 20: return ONES[n]
    if n < 100: return (TENS[n // 10] + " " + words(n % 10)).strip()
    if n < 1000: return (ONES[n // 100] + " Hundred " + words(n % 100)).strip()
    if n < 1_000_000: return (words(n // 1000) + " Thousand " + words(n % 1000)).strip()
    if n < 1_000_000_000: return (words(n // 1_000_000) + " Million " + words(n % 1_000_000)).strip()
    return (words(n // 1_000_000_000) + " Billion " + words(n % 1_000_000_000)).strip()` }, { lang: 'js', code: String.raw`
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function numberToWords(num) {
  if (num === 0) return 'Zero';
  return words(num).trim();
}

function words(n) {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) return (TENS[Math.floor(n / 10)] + ' ' + words(n % 10)).trim();
  if (n < 1000) return (ONES[Math.floor(n / 100)] + ' Hundred ' + words(n % 100)).trim();
  if (n < 1000000) return (words(Math.floor(n / 1000)) + ' Thousand ' + words(n % 1000)).trim();
  if (n < 1000000000) return (words(Math.floor(n / 1000000)) + ' Million ' + words(n % 1000000)).trim();
  return (words(Math.floor(n / 1000000000)) + ' Billion ' + words(n % 1000000000)).trim();
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    string numberToWords(int num) {
        if (num == 0) return "Zero";
        return trim(words(num));
    }

private:
    const vector<string> ONES = {"", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"};
    const vector<string> TENS = {"", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"};

    string trim(const string& s) {
        size_t a = s.find_first_not_of(' '), b = s.find_last_not_of(' ');
        return a == string::npos ? "" : s.substr(a, b - a + 1);
    }

    string words(int n) {
        if (n == 0) return "";
        if (n < 20) return ONES[n];
        if (n < 100) return trim(TENS[n / 10] + " " + words(n % 10));
        if (n < 1000) return trim(ONES[n / 100] + " Hundred " + words(n % 100));
        if (n < 1000000) return trim(words(n / 1000) + " Thousand " + words(n % 1000));
        if (n < 1000000000) return trim(words(n / 1000000) + " Million " + words(n % 1000000));
        return trim(words(n / 1000000000) + " Billion " + words(n % 1000000000));
    }
};` }] } },
    mcq: { q: 'How should the group "000" in 1,000,010 be handled?', options: ['Skip it completely — no "Thousand" word', 'Say "Zero Thousand"', 'Say "Thousand" alone', 'Throw an exception'], answer: 0, explain: '1,000,010 is "One Million Ten". A scale word is spoken only when its 3-digit group is non-zero.' },
    hints: [`<p>Hint 1: Every number is just 3-digit groups with scale words: [Billion, Million, Thousand, ""]. Write one helper <code>three(int n)</code> for 1–999 and reuse it for all groups.</p>`, `<p>Hint 2: three(n): hundreds digit → ONES[h] + " Hundred"; the remaining 0–99: if &lt; 20 use ONES directly (handles Eleven…Nineteen), else TENS[t] plus ONES[u] if u &gt; 0.</p>`, `<p>Hint 3: Peel groups with <code>% 1000</code> and <code>/ 1000</code> from the lowest scale upward (or divide by 10<sup>9</sup>, 10<sup>6</sup>, 10<sup>3</sup> from the top). Skip zero groups. Join non-empty pieces with single spaces. Special-case 0 → "Zero".</p>`],
    tests: { sig: 'int -> string', fn: 'numberToWords', cases: [
      [[123], 'One Hundred Twenty Three'],
      [[12345], 'Twelve Thousand Three Hundred Forty Five'],
      [[1234567], 'One Million Two Hundred Thirty Four Thousand Five Hundred Sixty Seven'],
      [[1000010], 'One Million Ten'],
      [[0], 'Zero'],
      [[5], 'Five'],
      [[15], 'Fifteen'],
      [[20], 'Twenty'],
      [[100], 'One Hundred'],
      [[101], 'One Hundred One'],
      [[110], 'One Hundred Ten'],
      [[1000], 'One Thousand'],
      [[1000001], 'One Million One'],
      [[1000000000], 'One Billion'],
      [[2147483647], 'Two Billion One Hundred Forty Seven Million Four Hundred Eighty Three Thousand Six Hundred Forty Seven']
    ] },
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
      alt: [{ lang: 'python', code: String.raw`
ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
SCALES = [(10**9, "Billion"), (10**6, "Million"), (10**3, "Thousand"), (1, "")]

def three(n):
    # words for 1..999 as a list
    out = []
    if n >= 100:
        out += [ONES[n // 100], "Hundred"]
        n %= 100
    if n >= 20:
        out.append(TENS[n // 10])
        n %= 10
    if n:
        out.append(ONES[n])
    return out

def number_to_words(num):
    if num == 0:
        return "Zero"
    words = []
    for value, name in SCALES:
        group, num = divmod(num, value)
        if group:                                  # skip empty groups like "000"
            words += three(group) + ([name] if name else [])
    return " ".join(words)                         # single spaces by construction

print(number_to_words(1234567))  # One Million Two Hundred Thirty Four Thousand Five Hundred Sixty Seven`, run: true }, { lang: 'js', code: String.raw`
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const SCALES = [[1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand'], [1, '']];

// Appends the words for 1..999
function three(n, out) {
  if (n >= 100) { out.push(ONES[Math.floor(n / 100)], 'Hundred'); n %= 100; }
  if (n >= 20) { out.push(TENS[Math.floor(n / 10)]); n %= 10; }
  if (n > 0) out.push(ONES[n]);
}

function numberToWords(num) {
  if (num === 0) return 'Zero';
  const words = [];
  for (const [value, name] of SCALES) {
    const group = Math.floor(num / value);
    num %= value;
    if (group === 0) continue;                 // skip empty groups like "000"
    three(group, words);
    if (name) words.push(name);
  }
  return words.join(' ');
}

console.log(numberToWords(1000010));  // One Million Ten`, run: true }, { lang: 'cpp', code: String.raw`
class Solution {
    const vector<string> ONES = {"", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"};
    const vector<string> TENS = {"", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"};

    // Appends the words for 1..999
    void three(int n, vector<string>& out) const {
        if (n >= 100) { out.push_back(ONES[n / 100]); out.push_back("Hundred"); n %= 100; }
        if (n >= 20) { out.push_back(TENS[n / 10]); n %= 10; }
        if (n > 0) out.push_back(ONES[n]);
    }

public:
    string numberToWords(int num) {
        if (num == 0) return "Zero";
        const int VAL[] = {1'000'000'000, 1'000'000, 1'000, 1};
        const char* NAME[] = {"Billion", "Million", "Thousand", ""};
        vector<string> words;
        for (int s = 0; s < 4; s++) {
            int group = num / VAL[s];
            num %= VAL[s];
            if (group == 0) continue;             // skip empty groups like "000"
            three(group, words);
            if (*NAME[s]) words.push_back(NAME[s]);
        }
        string out;
        for (size_t i = 0; i < words.size(); i++) out += (i ? " " : "") + words[i];
        return out;
    }
};` }],
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
    brute: { why: `<p>Build each line by appending words, then insert extra spaces <b>one at a time</b> in round-robin order across the gaps using repeated String concatenation. It produces the right answer, but each insertion copies the line (O(maxWidth) per space → O(maxWidth<sup>2</sup>) per line), and round-robin logic plus special cases (one word, last line) gets tangled. Arithmetic can place all spaces in one go.</p>`, code: { lang: 'java', code: String.raw`
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
}`, alt: [{ lang: 'python', code: String.raw`
def full_justify(words, max_width):
    res = []
    i = 0
    while i < len(words):
        j, length = i, 0
        while j < len(words) and length + len(words[j]) + (j - i) <= max_width:
            length += len(words[j])
            j += 1
        gaps = [" " if j == len(words) else ""] * max(1, j - i - 1)
        if j < len(words) and j - i > 1:
            for s in range(max_width - length):
                gaps[s % (j - i - 1)] += " "          # one space at a time
        line = words[i]
        for k in range(i + 1, j):
            line += gaps[k - i - 1] + words[k]
        while len(line) < max_width:
            line += " "                               # pad right
        res.append(line)
        i = j
    return res` }, { lang: 'js', code: String.raw`
function fullJustify(words, maxWidth) {
  const res = [];
  let i = 0;
  while (i < words.length) {
    let j = i, len = 0;
    while (j < words.length && len + words[j].length + (j - i) <= maxWidth) len += words[j++].length;
    const gaps = new Array(Math.max(1, j - i - 1)).fill(j === words.length ? ' ' : '');
    if (j < words.length && j - i > 1) {
      for (let s = 0; s < maxWidth - len; s++) gaps[s % (j - i - 1)] += ' ';   // one space at a time
    }
    let line = words[i];
    for (let k = i + 1; k < j; k++) line += gaps[k - i - 1] + words[k];
    while (line.length < maxWidth) line += ' ';                                // pad right
    res.push(line);
    i = j;
  }
  return res;
}` }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    vector<string> fullJustify(vector<string>& words, int maxWidth) {
        vector<string> res;
        int i = 0, n = words.size();
        while (i < n) {
            int j = i, len = 0;
            while (j < n && len + (int) words[j].size() + (j - i) <= maxWidth) len += words[j++].size();
            vector<string> gaps(max(1, j - i - 1), j == n ? " " : "");
            if (j < n && j - i > 1) {
                for (int s = 0; s < maxWidth - len; s++) gaps[s % (j - i - 1)] += " ";   // one space at a time
            }
            string line = words[i];
            for (int k = i + 1; k < j; k++) line += gaps[k - i - 1] + words[k];
            while ((int) line.size() < maxWidth) line += " ";                          // pad right
            res.push_back(line);
            i = j;
        }
        return res;
    }
};` }] } },
    mcq: { q: 'A line has 3 words with 13 letters in total and maxWidth = 20. How are the 7 spaces split over the 2 gaps?', options: ['4 then 3', '3 then 4', '3.5 and 3.5', '7 then 0'], answer: 0, explain: '7 / 2 = 3 remainder 1. Every gap gets 3, and the leftmost 1 gap gets one extra: 4, 3.' },
    hints: [`<p>Hint 1: Split the job into two helpers: (a) <b>choose</b> the words for a line greedily — keep adding while total letters + minimum single spaces ≤ maxWidth; (b) <b>render</b> the line.</p>`, `<p>Hint 2: For a normal line with g = count − 1 gaps and S = maxWidth − letters spaces: each gap gets S / g, and the first S % g gaps get one extra.</p>`, `<p>Hint 3: Special cases: a line with one word, and the last line → words joined with single spaces, then pad with spaces on the right to maxWidth. Repeat spaces with <code>" ".repeat(k)</code> (Java, JS), <code>" " * k</code> (Python) or <code>string(k, ' ')</code> (C++); <code>ljust</code> / <code>padEnd</code> pad the right side.</p>`],
    tests: { sig: 'string[] int -> list<string>', fn: 'fullJustify', cases: [
      [[['This', 'is', 'an', 'example', 'of', 'text', 'justification.'], 16], ['This    is    an', 'example  of text', 'justification.  ']],
      [[['What', 'must', 'be', 'acknowledgment', 'shall', 'be'], 16], ['What   must   be', 'acknowledgment  ', 'shall be        ']],
      [[['Science', 'is', 'what', 'we', 'understand', 'well', 'enough', 'to', 'explain', 'to', 'a', 'computer.', 'Art', 'is', 'everything', 'else', 'we', 'do'], 20], ['Science  is  what we', 'understand      well', 'enough to explain to', 'a  computer.  Art is', 'everything  else  we', 'do                  ']],
      [[['a'], 1], ['a']],
      [[['a', 'b', 'c'], 1], ['a', 'b', 'c']],
      [[['ab', 'c'], 5], ['ab c ']],
      [[['hello', 'world'], 5], ['hello', 'world']],
      [[['a', 'b', 'c', 'd', 'e'], 3], ['a b', 'c d', 'e  ']]
    ] },
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
      alt: [{ lang: 'python', code: String.raw`
def full_justify(words, max_width):
    res, i, n = [], 0, len(words)
    while i < n:
        # 1) choose words i..j-1 for this line
        j, letters = i, 0
        while j < n and letters + len(words[j]) + (j - i) <= max_width:
            letters += len(words[j])
            j += 1
        line, gaps = words[i:j], j - i - 1
        if j == n or gaps == 0:
            # 2a) last line or single word: left-justify, pad right
            res.append(" ".join(line).ljust(max_width))
        else:
            # 2b) spread spaces; the first 'extra' gaps get one more
            base, extra = divmod(max_width - letters, gaps)
            parts = []
            for k, w in enumerate(line[:-1]):
                parts.append(w + " " * (base + (k < extra)))
            res.append("".join(parts) + line[-1])
        i = j
    return res

for row in full_justify(["This", "is", "an", "example", "of", "text", "justification."], 16):
    print(repr(row))`, run: true }, { lang: 'js', code: String.raw`
function fullJustify(words, maxWidth) {
  const res = [];
  let i = 0;
  const n = words.length;
  while (i < n) {
    // 1) choose words i..j-1 for this line
    let j = i, letters = 0;
    while (j < n && letters + words[j].length + (j - i) <= maxWidth) letters += words[j++].length;
    const line = words.slice(i, j), gaps = j - i - 1;
    if (j === n || gaps === 0) {
      res.push(line.join(' ').padEnd(maxWidth));      // 2a) left-justify, pad right
    } else {
      const spaces = maxWidth - letters, base = Math.floor(spaces / gaps), extra = spaces % gaps;
      let s = '';
      for (let k = 0; k < gaps; k++) s += line[k] + ' '.repeat(base + (k < extra ? 1 : 0));
      res.push(s + line[gaps]);                       // 2b) extra spaces go left
    }
    i = j;
  }
  return res;
}

console.log(fullJustify(['This', 'is', 'an', 'example', 'of', 'text', 'justification.'], 16));`, run: true }, { lang: 'cpp', code: String.raw`
class Solution {
public:
    vector<string> fullJustify(vector<string>& words, int maxWidth) {
        vector<string> res;
        int i = 0, n = words.size();
        while (i < n) {
            // 1) choose words i..j-1 for this line
            int j = i, letters = 0;
            while (j < n && letters + (int)words[j].size() + (j - i) <= maxWidth) letters += words[j++].size();
            int gaps = j - i - 1;
            string line;
            line.reserve(maxWidth);
            if (j == n || gaps == 0) {
                // 2a) last line or single word: left-justify
                for (int k = i; k < j; k++) {
                    if (k > i) line += ' ';
                    line += words[k];
                }
                line.append(maxWidth - line.size(), ' ');   // pad right
            } else {
                // 2b) full justification: extra spaces go to the left gaps
                int spaces = maxWidth - letters, base = spaces / gaps, extra = spaces % gaps;
                for (int k = i; k < j; k++) {
                    line += words[k];
                    if (k < j - 1) line.append(base + (k - i < extra ? 1 : 0), ' ');
                }
            }
            res.push_back(move(line));
            i = j;
        }
        return res;
    }
};` }],
      dry: { head: ['line', 'words', 'letters', 'spaces / gaps', 'base, extra', 'result'], rows: [['1', 'This is an', '8', '8 / 2', '4, 0', '"This····is····an"'], ['2', 'example of text', '13', '3 / 2', '1, 1', '"example··of·text"'], ['3 (last)', 'justification.', '14', '—', 'left-justify', '"justification.··"']] },
      complexity: `<p>O(total characters of output) = O(lines × maxWidth) time; O(maxWidth) extra per line.</p>`,
      followUps: ['Centre-justify each line instead.', 'Minimise the "raggedness" (sum of squared trailing spaces) instead of greedy packing — a DP problem (DSA 17).']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'In Java or C++ with <code>int</code> operands, what does <code>7 / 2 + 7 % 2</code> evaluate to? (Python: <code>7 // 2 + 7 % 2</code>.)', options: ['4', '3.5', '4.5', '3'], answer: 0, explain: '7 / 2 is integer division = 3, and 7 % 2 = 1. 3 + 1 = 4.' },
    { q: 'What does <code>-7 % 3</code> evaluate to in Java, C++ or JavaScript? (Python behaves differently.)', options: ['-1', '2', '1', '-2'], answer: 0, explain: 'In Java, C++ and JavaScript the remainder takes the sign of the left operand: -7 = 3 × (-2) + (-1). To get 2, use Math.floorMod(-7, 3) in Java or ((x % m) + m) % m elsewhere; Python\'s % already returns 2.' },
    { q: 'a and b are 32-bit <code>int</code> values up to 10<sup>5</sup>. Which line (Java shown; in C++ read <code>long</code> as <code>long long</code>) stores their product correctly?', options: ['<code>long p = (long) a * b;</code>', '<code>long p = a * b;</code>', '<code>int p = a * b;</code>', '<code>long p = (long) (a * b);</code>'], answer: 0, explain: 'The cast must happen before the multiplication. In (long)(a * b) and a * b, the int multiplication has already overflowed (10<sup>10</sup> &gt; 2.1 × 10<sup>9</sup>).' },
    { q: 'Your O(N) solution gets Time Limit Exceeded on a HackerRank test with 10<sup>6</sup> input numbers. What is the first thing to check?', options: ['Whether you read input with a slow reader (Java Scanner, Python input() per line, C++ cin without sync_with_stdio(false)) instead of a buffered one', 'Whether you used a for loop', 'Whether the class is public', 'Whether you used int instead of long'], answer: 0, explain: 'With a linear algorithm, I/O often dominates. Java\'s Scanner parses each token with regular expressions and is several times slower than BufferedReader + StringTokenizer; the same trap exists as per-line input() in Python and unsynced cin in C++.' },
    { q: 'What is printed in Java? (Python lists and JavaScript arrays behave the same way.)<br><code>int[] a = {1, 2, 3}; int[] b = a; b[0] = 9; System.out.println(a[0]);</code>', options: ['9', '1', '0', 'Compile error'], answer: 0, explain: 'b = a copies the reference (address), not the array. Both names refer to the same object, so the write through b is visible through a.' },
    { q: 'In Java (Python and JavaScript behave the same), inside <code>void f(int[] arr)</code> you write <code>arr = new int[5]; arr[0] = 7;</code>. What does the caller\'s array look like afterwards?', options: ['Unchanged', 'Its first element is 7', 'It now has length 5', 'It becomes null'], answer: 0, explain: 'Java passes a copy of the reference. Re-pointing the local parameter to a new array does not affect the caller; the write goes into the new array only.' },
    { q: 'Which comparison is correct for checking whether two Java Strings have the same text? (Python, JavaScript and C++ strings use <code>==</code>.)', options: ['<code>s.equals(t)</code>', '<code>s == t</code>', '<code>s.compareTo(t) == 1</code>', '<code>s.hashCode() == t.hashCode()</code> alone'], answer: 0, explain: '== compares references (works by accident for pooled literals). Equal hash codes do not guarantee equal text. equals compares content.' },
    { q: 'Constraints say N ≤ 10<sup>5</sup>. Which complexity is the safe target?', options: ['O(N log N) or better', 'O(N<sup>2</sup>)', 'O(2<sup>N</sup>)', 'O(N<sup>3</sup>)'], answer: 0, explain: 'N log N ≈ 1.7 × 10<sup>6</sup> steps — comfortable. N<sup>2</sup> = 10<sup>10</sup> would take ~100 seconds at 10<sup>8</sup> steps per second.' },
    { q: 'Constraints say N ≤ 20. What does that most likely hint?', options: ['Trying all 2<sup>N</sup> subsets is intended', 'You must use O(log N)', 'Use a hash map (HashMap / dict / Map / unordered_map)', 'Read input with a slow reader such as Scanner'] , answer: 0, explain: '2<sup>20</sup> ≈ 10<sup>6</sup>, so exponential enumeration (bitmasks/backtracking) fits easily. Setters choose tiny N exactly to allow that.' },
    { q: 'How many subarrays does an array of length N have?', options: ['N(N+1)/2', 'N<sup>2</sup>', '2<sup>N</sup>', 'N!'], answer: 0, explain: 'Choose a start i and an end j ≥ i: N + (N−1) + … + 1 = N(N+1)/2. Subsets (not necessarily contiguous) would be 2<sup>N</sup>.' },
    { q: 'Why is <code>result += piece;</code> on an immutable String (Java, Python, JavaScript) inside a loop of 10<sup>5</sup> iterations a problem?', options: ['Each += copies the whole string, making it O(N<sup>2</sup>) overall', 'Strings cannot be longer than 1000 chars', 'It causes a compile error', 'It changes the original String object'], answer: 0, explain: 'Strings are immutable, so every concatenation creates a new String and copies all previous characters. StringBuilder appends in amortised O(1).' },
    { q: '<code>Integer x = 1000, y = 1000;</code> What does <code>x == y</code> usually return?', options: ['false', 'true', 'It throws an exception', 'It does not compile'], answer: 0, explain: 'Only values in −128…127 are guaranteed to be cached. 1000 autoboxes into two distinct Integer objects, and == compares references. Use equals or compare int values.' },
    { q: 'A recursive DFS on a path-shaped tree with 10<sup>6</sup> nodes crashes with a stack overflow (StackOverflowError in Java, RecursionError in Python, RangeError in JavaScript, a segfault in C++). Why?', options: ['Each call adds a stack frame, and the default thread stack holds far fewer than 10<sup>6</sup> frames', 'The heap is full of nodes', 'Recursion is not allowed on judges', 'The tree has a cycle'], answer: 0, explain: 'Recursion depth equals the path length. Frames live on the thread stack (often ~512 KB–1 MB by default). Fix: iterative DFS with an explicit stack, or run in a Thread with a larger stack size.' }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { q: 'Is Java pass-by-value or pass-by-reference?', level: 'B', a: `<p>Java is <b>always pass-by-value</b>. For primitives, the value (e.g. the number 5) is copied into the parameter. For objects, the value being copied is the <b>reference</b> (the address). That is why a method can <b>mutate</b> the object the caller passed (both copies of the address point to the same object), but <b>re-assigning</b> the parameter (<code>arr = new int[3]</code>) never affects the caller's variable. A classic proof: a <code>swap(Integer a, Integer b)</code> method cannot swap the caller's variables.</p>`, followUps: ['How would you let a method "return" two values?', 'What does this mean for Strings, given they are immutable?'] },
    { q: 'What is the difference between the stack and the heap (in Java, and how do the other languages differ)?', level: 'B', a: `<p>The <b>stack</b> (one per thread) holds a <b>frame</b> per active method call: parameters, local primitives and local references. Frames are pushed on call and popped on return — very fast, automatically sized, but small (often ~512 KB–1 MB), so very deep recursion causes <code>StackOverflowError</code>. The <b>heap</b> is shared memory where every object created with <code>new</code> lives (arrays, Strings, collections). Objects live as long as they are reachable; the <b>garbage collector</b> frees unreachable ones. Running out of heap gives <code>OutOfMemoryError</code>. Python and JavaScript work the same way: every object lives on the heap and variables hold references, with a garbage collector. C++ lets you choose: locals (and the small control block of a <code>vector</code>) live on the stack, while the elements, <code>new</code> objects and <code>make_unique</code> allocations live on the heap and are freed by destructors, not a collector.</p>`, followUps: ['Where does a local int[]  variable live, and where does the array live?', 'What is escape analysis?'] },
    { q: 'Why is Java\'s Scanner slow, and what do you use instead (in any language) in coding assessments?', level: 'B', a: `<p><code>Scanner</code> tokenises input with <b>regular expressions</b>, validates each token (including locale handling) and uses a small buffer, so each <code>nextInt()</code> is relatively expensive. With 10<sup>5</sup>–10<sup>6</sup> numbers this can cost close to a second. I use <code>BufferedReader</code> (large buffered chunks) with <code>StringTokenizer</code> and <code>Integer.parseInt</code>, or a custom byte reader over <code>DataInputStream</code> for 10<sup>7</sup>-scale inputs. For output I collect results in a <code>StringBuilder</code> or a <code>PrintWriter</code> and flush once at the end. The same ladder exists elsewhere: in Python read everything with <code>sys.stdin.buffer.read().split()</code> and print once with <code>"\\n".join</code>; in Node use <code>fs.readFileSync(0, "utf8")</code>; in C++ start with <code>ios::sync_with_stdio(false); cin.tie(nullptr);</code> and print <code>'\\n'</code> instead of <code>endl</code>.</p>`, followUps: ['What happens if you forget to flush  a PrintWriter?', 'Explain the nextInt() then nextLine() bug.'] },
    { q: 'How do you decide between int and long for a problem?', level: 'B', a: `<p>I read the constraints and compute the <b>largest intermediate value</b>, not just the inputs. int holds about ±2.1 × 10<sup>9</sup>; long about ±9.2 × 10<sup>18</sup>. If values are up to 10<sup>9</sup> and I <b>sum</b> 10<sup>5</sup> of them (10<sup>14</sup>) or <b>multiply</b> two (10<sup>18</sup>), I use long for the accumulator — and I cast <i>before</i> the arithmetic: <code>(long) a * b</code>. Counting pairs among 10<sup>5</sup> elements (up to ~5 × 10<sup>9</sup>) also needs long. When even long can overflow (products of two longs), I use modular arithmetic, <code>Math.multiplyHigh</code>, or <code>BigInteger</code>. In C++ the same rule applies to <code>int</code> versus <code>long long</code> (and signed overflow is undefined behaviour); Python integers never overflow; JavaScript numbers are exact only up to 2<sup>53</sup>, so use <code>BigInt</code> beyond that.</p>`, followUps: ['What does Integer.MAX_VALUE + 1 evaluate to?', 'How do you detect overflow without using long?'] },
    { q: 'Explain the Integer cache pitfall with ==.', level: 'I', a: `<p>Autoboxing uses <code>Integer.valueOf</code>, which returns <b>cached</b> objects for values from −128 to 127 (guaranteed by the language spec). So <code>Integer a = 100, b = 100; a == b</code> is true (same cached object), but with 1000 two separate objects are created and <code>==</code> (reference comparison) is false. This bites in code like <code>map.get(x) == map.get(y)</code> or comparing elements of a <code>List&lt;Integer&gt;</code>. Fix: use <code>.equals</code>, <code>Integer.compare</code>, or unbox to int. Also beware unboxing <code>null</code> → NullPointerException.</p>`, followUps: ['Can the cache upper bound be changed?', 'Why might boxing hurt performance in a HashMap-heavy solution?'] },
    { q: 'Why does String concatenation in a loop hurt performance, and what does the compiler do about it?', level: 'I', a: `<p>Strings are immutable, so <code>s += x</code> inside a loop creates a <b>new</b> String each time and copies all existing characters, giving O(N<sup>2</sup>) total work for N appends. Since Java 9 the compiler turns a <b>single</b> concatenation expression into an efficient <code>invokedynamic</code> call (StringConcatFactory), but it cannot merge appends across loop iterations. The fix is an explicit <code>StringBuilder</code> (amortised O(1) append because its internal array grows geometrically), then <code>toString()</code> once. Python and JavaScript have the same problem in principle (collect pieces in a list or array and <code>join</code> once), while C++ <code>std::string</code> is mutable and <code>+=</code> is amortised O(1).</p>`, followUps: ['StringBuilder vs StringBuffer?', 'What is the time complexity of sb.insert(0, c) repeated N times?'] },
    { q: 'You are given a problem with N ≤ 10<sup>5</sup>. Walk me through how constraints shape your approach.', level: 'I', a: `<p>First I convert the constraint into a budget: roughly 10<sup>8</sup> simple operations per second, so O(N<sup>2</sup>) = 10<sup>10</sup> is out and I target O(N log N) or O(N). That suggests sorting, binary search, heaps, hashing, two pointers or prefix sums. Next I check <b>value ranges</b>: values up to 10<sup>9</sup> mean sums need a 64-bit type (<code>long</code> / <code>long long</code>);  values up to 10<sup>6</sup> allow counting arrays. Then <b>hidden multipliers</b>: number of test cases, number of queries, string lengths. Finally edge cases implied by the bounds: N = 1, negatives, duplicates. I say all of this out loud before coding.</p>`, followUps: ['What would change if N ≤ 20?', 'How do you handle "sum of N over all test cases ≤ 2·10^5"?'] },
    { q: 'What is the value of writing a brute-force solution first in an interview?', level: 'B', a: `<p>It proves I understand the problem and gives a <b>correct baseline</b> within minutes, so I am never left with nothing. Stating its complexity against the constraints shows exactly why we need something better and <b>where the repeated work is</b> (e.g. re-summing subarrays), which usually points to the optimisation. It also doubles as a <b>test oracle</b>: I can compare the optimised version against it on small inputs. I keep it short — describe it in a sentence, code it only if the interviewer wants or if N is small enough that it is the final answer.</p>`, followUps: ['When is the brute force the final answer?', 'How would you stress test your optimised solution?'] },
    { q: 'How would you stress test a solution?', level: 'I', a: `<p>I write three pieces: a <b>brute-force</b> solution that is obviously correct (no cleverness), a <b>random generator</b> with a fixed seed producing small inputs (e.g. N ≤ 8, values −10…10, including duplicates and negatives), and a loop that runs both solutions thousands of times and stops at the first mismatch, printing the input. Small inputs keep failures readable; the fixed seed makes them reproducible. Then I shrink the failing case by hand, fix the bug and rerun. It is the same principle as property-based and differential testing in industry.</p>`, followUps: ['Why small values rather than random 10^9 values?', 'How do you test for TLE rather than correctness?'] },
    { q: 'What does Arrays.sort use internally, and does it matter in interviews?', level: 'A', a: `<p>For primitive arrays (<code>int[]</code>, <code>long[]</code>…) Java uses <b>dual-pivot quicksort</b> — fast in practice, not stable. Newer JDKs guard against pathological recursion depth by falling back to heapsort, but on older judges crafted inputs could trigger slow cases, so competitive programmers sometimes shuffle first or sort boxed/long arrays. For object arrays (<code>Integer[]</code>, <code>int[][]</code>, <code>String[]</code>) and <code>Collections.sort</code>, Java uses <b>TimSort</b>: stable, O(N log N) worst case, adaptive on partially sorted data. Stability matters when sorting by one key after another; comparators should use <code>Integer.compare</code> rather than subtraction to avoid overflow.</p>`, followUps: ['Why is a - b a dangerous comparator?', 'What does stability mean and when do you need it?'] },
    { q: 'How do you avoid a stack overflow (StackOverflowError in Java) for deep recursion?', level: 'A', a: `<p>First, estimate depth: recursion on a linked structure or a path-shaped tree can reach N (10<sup>5</sup>–10<sup>6</sup>), while the default thread stack fits only ~10<sup>4</sup>–10<sup>5</sup> frames depending on frame size. Options: (1) rewrite the recursion iteratively with an explicit <code>ArrayDeque</code> as the stack — the most robust; (2) run the solver in a <code>new Thread(null, runnable, "main", 1 &lt;&lt; 26)</code> with a larger stack — common on judges; (3) reduce frame size (fewer locals/parameters). Tail calls are not optimised by the JVM, so "tail recursion" does not help. Python is stricter (about 1000 frames by default): iterate, or raise <code>sys.setrecursionlimit</code> and run in a <code>threading.Thread</code> with a bigger <code>threading.stack_size</code>. JavaScript allows roughly 10<sup>4</sup> frames, so iterate with an explicit array stack. In C++ use an explicit <code>stack</code>/<code>vector</code> because the typical 8 MB stack is fixed on judges.</p>`, followUps: ['Convert recursive inorder  traversal to iterative.', 'Does -Xss work on online judges?'] },
    { q: 'Shallow copy vs deep copy of a 2D array — what is the difference?', level: 'I', a: `<p>A 2D array in Java is an array of references to row arrays. <code>grid.clone()</code> creates a new <b>outer</b> array but copies the row <b>references</b>, so both grids share the same rows — a <b>shallow</b> copy; modifying <code>copy[0][0]</code> changes the original. A <b>deep</b> copy clones each row: <code>for r: copy[r] = grid[r].clone()</code>. This matters for simulations (Game of Life, BFS on a mutated grid), backtracking snapshots and any "return a new board" problem. The same idea applies to <code>List&lt;List&lt;Integer&gt;&gt;</code>: copy inner lists with <code>new ArrayList&lt;&gt;(inner)</code>. In Python the equivalent is <code>[row[:] for row in grid]</code> (or <code>copy.deepcopy</code>); in JavaScript <code>grid.map((r) =&gt; r.slice())</code>; in C++ assigning a <code>vector&lt;vector&lt;int&gt;&gt;</code> already copies every row.</p>`, followUps: ['How does Arrays.copyOf behave  for a 2D array?', 'How would you deep-copy a graph?'] },
    { q: 'How do Java Strings store characters, and what does that mean for Unicode problems?', level: 'E', a: `<p>Since Java 9, a String stores a <code>byte[]</code> plus a coder flag: <b>LATIN-1</b> (1 byte per char) when possible, otherwise <b>UTF-16</b> (2 bytes per char) — "compact strings". A Java <code>char</code> is a UTF-16 <b>code unit</b>, so characters outside the Basic Multilingual Plane (emoji, some CJK) occupy <b>two</b> chars (a surrogate pair): <code>"😀".length() == 2</code>. Interview problems usually restrict input to ASCII, so <code>charAt</code> and <code>int[26]</code> are fine; for real text, iterate <code>codePoints()</code> and use int-based Character methods. Strings also cache their hash code, and <code>substring</code> copies (since 7u6), costing O(length).</p>`, followUps: ['How would you reverse a string containing emoji correctly?', 'Why is String a good HashMap key?'] },
    { q: 'You can only use 256 MB of memory and need a 10<sup>4</sup> × 10<sup>4</sup> table. What do you do?', level: 'A', a: `<p>Estimate first: 10<sup>8</sup> cells × 4 bytes (int) = 400 MB — too big; as <code>long</code> it is 800 MB. Options: (1) check whether only the previous row is needed (rolling arrays / two rows → 80 KB), very common in DP; (2) use a smaller type if values fit (<code>byte</code> or <code>short</code>, or a bitset for booleans: Java <code>BitSet</code>, C++ <code>bitset</code>, Python <code>bytearray</code>: 12.5 MB); (3) store only non-default cells sparsely (HashMap) if the table is mostly empty; (4) recompute instead of store. I would also double-check whether the intended complexity really needs N × M states at all — such a large table is often a hint that a smarter state definition exists.</p>`, followUps: ['How much memory does a list of boxed integers (Java ArrayList&lt;Integer&gt;, Python list of int) with 10<sup>7</sup> elements take?', 'Show the rolling-array trick for LCS.'] }
  );

  registerModule({
    id: 'dsa01',
    title: 'Programming Foundations for DSA',
    intro: `<p>Welcome to the very first DSA module! Before learning clever algorithms, you need a <b>reliable toolkit</b>: writing code quickly and correctly in your language (Java, Python, JavaScript or C++ — every code block has a tab for each), reading input fast, knowing exactly what a variable holds, and understanding where your data lives in memory. Most "my solution is right but it fails" stories — overflow, slow-input timeouts, aliasing bugs, stack overflows — come from gaps in exactly these foundations.</p>
<p>You will learn the small subset of your language that problem solving needs (and the few places where the four languages behave differently), the difference between <b>primitives</b> and <b>references</b>, how the <b>stack and heap</b> work, the everyday tools for <b>arrays and strings</b>, how to split a solution into clean <b>methods</b>, how to read <b>constraints</b> like a hint from the problem setter, and how to write your first <b>brute-force</b> solutions and improve them step by step.</p>
<p>Every topic starts with an everyday analogy, then shows a step-by-step visualizer, worked examples, a deep dive for the curious, and an "AI era" section on working alongside coding assistants without losing the skills interviewers test.</p>`,
    goals: [
      'Write a complete program or LeetCode-style method from memory in Java, Python, JavaScript or C++, using loops, conditions, integer division and remainder correctly — including how Python and JavaScript division differ',
      'Read 10<sup>6</sup> numbers within time limits using your language\'s fast reader (BufferedReader + StringTokenizer, sys.stdin.buffer, fs.readFileSync(0), or cin with sync_with_stdio(false)) and print large outputs in one write',
      'Choose the integer type from the constraints (int vs long / long long, JavaScript Number vs BigInt, Python\'s unbounded int) and spot overflow (including the <code>int * int</code> trap) before it happens',
      'Draw stack frames and heap objects for any snippet and predict the effect of aliasing, pass-by-value and re-assignment',
      'Use arrays, 2D grids, strings, string builders (StringBuilder, list + join, array + join, std::string) and counting arrays (<code>int[26]</code>) fluently and know the cost of each operation',
      'Turn constraints into a target complexity using the 10<sup>8</sup>-operations rule and the N → complexity table',
      'Write a correct brute-force solution, state its complexity, find the repeated work, and stress test a faster version against it'
    ],
    prereqs: `<p>None — this is the starting point of the DSA track. You only need a working Java 17+ (ideally 21) installation or an online editor, and the ability to run a "Hello, World" program. If you have never programmed before, spend an hour on the Java track's first module (JDK, JRE, JVM &amp; Java Basics) first.</p>`,
    hours: 14,
    langNotes: {
      java: `<p><b>Java:</b> <code>int</code> overflow wraps silently (no error), so use <code>long</code> for sums and products and cast <i>before</i> multiplying: <code>(long) a * b</code>. <code>/</code> and <code>%</code> truncate toward zero (<code>-7 % 3 == -1</code>; use <code>Math.floorMod</code>). Read big inputs with <code>BufferedReader</code> + <code>StringTokenizer</code>, never <code>Scanner</code>, and print through a <code>StringBuilder</code> or a flushed <code>PrintWriter</code>. Strings are immutable: compare with <code>.equals</code>, build with <code>StringBuilder</code>. Arguments are copies of values or references. The default stack fits roughly 10<sup>4</sup>–10<sup>5</sup> frames; run deep recursion in a <code>Thread</code> with a big stack or make it iterative. <code>HashMap</code> is O(1) on average, <code>TreeMap</code> O(log n); <code>PriorityQueue</code> is a min-heap.</p>`,
      python: `<p><b>Python:</b> ints never overflow, but huge numbers get slow, so still reduce with <code>% MOD</code>. <code>/</code> always gives a float: use <code>//</code>, which rounds <b>down</b> (<code>-7 // 2 == -4</code>), and <code>%</code> takes the divisor's sign (<code>-7 % 3 == 2</code>). Pure-Python loops run about 10<sup>7</sup> simple steps per second, so lean on built-ins (<code>sum</code>, <code>sorted</code>, <code>collections.Counter</code>). Read input with <code>sys.stdin.buffer.read().split()</code> and print once with <code>"\\n".join</code>. Build strings with a list and <code>"".join</code>. Recursion stops at about 1000 frames: prefer iteration, or use <code>sys.setrecursionlimit</code> together with <code>threading.stack_size</code> and a thread. <code>list.pop(0)</code> is O(n): use <code>collections.deque</code>. <code>heapq</code> is a min-heap only (negate values for a max-heap); <code>dict</code> is a hash map. Compare values with <code>==</code>, not <code>is</code>.</p>`,
      js: `<p><b>JavaScript:</b> every <code>number</code> is a double, exact only up to 2<sup>53</sup> − 1 (≈ 9 × 10<sup>15</sup>): products like 10<sup>9</sup> × 10<sup>9</sup> need <code>BigInt</code> (<code>10n ** 18n</code>). <code>/</code> never drops the fraction (use <code>Math.floor</code> or <code>Math.trunc</code>), <code>%</code> keeps the dividend's sign, and <code>x | 0</code> truncates to 32 bits. <code>sort()</code> without a comparator compares as <b>strings</b>: always write <code>sort((a, b) =&gt; a - b)</code>. Use <code>===</code>. Read stdin with <code>require("fs").readFileSync(0, "utf8")</code> and write once. <code>array.shift()</code> is O(n): keep a head index for queues. Recursion depth is about 10<sup>4</sup> frames. <code>Map</code>/<code>Set</code> are hash-based and O(1) on average. <b>There is no built-in heap</b>: write a small <code>MinHeap</code> class when you need one.</p>`,
      cpp: `<p><b>C++:</b> signed overflow is <b>undefined behaviour</b>, not a wrap: use <code>long long</code> and cast before multiplying (<code>1LL * a * b</code>); <code>accumulate(..., 0LL)</code> sums in 64 bits. <code>/</code> and <code>%</code> truncate toward zero like Java. Start every judge program with <code>ios::sync_with_stdio(false); cin.tie(nullptr);</code> and print <code>'\\n'</code>, not <code>endl</code>. Function arguments are <b>copied</b> by default, even whole vectors: pass <code>const vector&lt;int&gt;&amp;</code> to read and <code>vector&lt;int&gt;&amp;</code> to modify. <code>std::string</code> is mutable and <code>+=</code> is amortised O(1), but <code>substr(pos, len)</code> takes a length. <code>a[i]</code> is unchecked. The stack is about 8 MB on Linux judges: keep big arrays global, static or in a <code>vector</code>. <code>map</code> is O(log n), <code>unordered_map</code> O(1) on average; <code>priority_queue</code> is a <b>max</b>-heap.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
