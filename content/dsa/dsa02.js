(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // ---------- small shared helpers for the visualizers ----------
  function parseOneInt(input, lo, hi, example) {
    var s = String(input === undefined ? '' : input).trim();
    if (!/^\d+$/.test(s)) throw new Error('Enter one whole number between ' + lo + ' and ' + hi + ' (for example ' + example + ').');
    var n = parseInt(s, 10);
    if (n < lo || n > hi) throw new Error('Please keep N between ' + lo + ' and ' + hi + ' so every step fits on screen.');
    return n;
  }
  function copyGrid(g) { return g.map(function (r) { return r.slice(); }); }

  // =====================================================================
  // TOPIC 1 — Counting loop iterations
  // =====================================================================
  topics.push({
    title: 'Counting Loop Iterations (single, nested, triangle, halving, doubling)',
    analogy: `<p>A shopkeeper keeps a <b>tally sheet</b>: every time a customer is served, he draws one stroke <b>|</b>. At closing time he does not remember each customer, he just counts strokes. Counting loop iterations is the same game: imagine a tally stroke every time the innermost line runs, and count the strokes <b>without actually running the code</b>.</p>
<p>A second picture: climbing stairs. Taking 1 step at a time to reach floor 16 needs 16 moves. Taking a <b>lift that doubles</b> your floor each press (1 → 2 → 4 → 8 → 16) needs only 4 presses. Same goal, wildly different counts — that difference is what complexity is all about.</p>`,
    explain: `<p><b>Why count at all?</b> A computer does roughly 10<sup>8</sup> simple steps per second. If you can count how many times the busiest line runs, you know whether your program finishes in time. The trick is to <b>write the loop variable's values in a small table and count the rows</b>.</p>
<h4>1. Single loop — count the values the variable takes</h4>
${H.table(['Loop header', 'values of i (N = 8)', 'how many times'], [
  ['<code>for (i = 0; i &lt; N; i++)</code>', '0 1 2 3 4 5 6 7', H.c('g', 'N = 8')],
  ['<code>for (i = 0; i &lt; N; i += 2)</code>', '0 2 4 6', H.c('g', '⌈N/2⌉ = 4')],
  ['<code>for (i = 1; i &lt;= N; i *= 2)</code>', '1 2 4 8', H.c('y', '⌊log₂ N⌋ + 1 = 4')],
  ['<code>for (i = N; i &gt; 0; i /= 2)</code>', '8 4 2 1', H.c('y', '⌊log₂ N⌋ + 1 = 4')],
  ['<code>for (i = 1; i * i &lt;= N; i++)</code>', '1 2', H.c('b', '⌊√N⌋ = 2')]
])}
<h4>2. Loops one after another → ADD.  Loops inside each other → MULTIPLY.</h4>
<p>Two separate loops of N each = N + N = 2N strokes. A loop of N <i>inside</i> a loop of N = N × N = N<sup>2</sup> strokes (for every outer step, the whole inner loop runs again).</p>
<h4>3. The triangle loop: inner loop starts at i + 1</h4>
<p><code>for (i = 0; i &lt; N; i++) for (j = i + 1; j &lt; N; j++)</code>. For N = 5 the inner loop runs 4, 3, 2, 1, 0 times:</p>
${H.table(['i', 'j runs over', 'inner count'], [['0', '1 2 3 4', '4'], ['1', '2 3 4', '3'], ['2', '3 4', '2'], ['3', '4', '1'], ['4', '(nothing)', '0'], ['<b>total</b>', '', H.c('p', '4+3+2+1+0 = 10 = 5·4/2')]])}
<p>That is an arithmetic progression sum: <b>N(N−1)/2</b>. It is still O(N<sup>2</sup>) — about half the square, and halves do not change the growth.</p>
<h4>4. Doubling loop inside a normal loop</h4>
<p><code>for (j = 1; j &lt;= N; j++) for (i = 1; i &lt;= N; i *= 2)</code>: the outer loop runs N times, and each time the inner loop runs ⌊log₂ N⌋ + 1 times. Total = <b>N · (⌊log₂ N⌋ + 1)</b> → O(N log N). For N = 8: 8 × 4 = 32 strokes.</p>
<h4>5. The harmonic loop (inner step = outer variable)</h4>
<p><code>for (i = 1; i &lt;= N; i++) for (j = i; j &lt;= N; j += i)</code>: inner runs N/1 + N/2 + N/3 + … + N/N ≈ N · ln N times → O(N log N). This is the loop shape of the Sieve of Eratosthenes.</p>
<h4>6. Halving work each round</h4>
<p><code>for (i = N; i &gt; 0; i /= 2) for (j = 0; j &lt; i; j++)</code>: inner runs N + N/2 + N/4 + … which is <b>less than 2N</b> → only O(N), not O(N log N)! (A geometric progression — next topic.)</p>
<p><b>Recipe:</b> (1) find the innermost line, (2) for one fixed outer value, count inner runs, (3) add those counts over all outer values (often an AP or GP sum), (4) keep the biggest term.</p>`,
    clues: [
      '"What is printed by <code>count</code>?" / "how many times does this line execute?" → build the table of loop-variable values and count rows.',
      'Inner loop bound depends on the outer variable (<code>j = i + 1</code>, <code>j &lt; i</code>) → a <b>triangle</b>: N(N−1)/2, still O(N<sup>2</sup>).',
      'Loop variable changes by <code>*= 2</code>, <code>/= 2</code>, <code>&gt;&gt;= 1</code> → it runs only about <b>log₂ N</b> times.',
      'Condition <code>i * i &lt;= N</code> → runs about <b>√N</b> times (divisor checks, prime tests).',
      'Inner step is <code>j += i</code> → harmonic series N/1 + N/2 + … ≈ <b>N ln N</b>.',
      'Work shrinks by half each round (N + N/2 + N/4 …) → total is under <b>2N</b>, so O(N).'
    ],
    code: `
class LoopCounts {
    public static void main(String[] args) {
        int n = 8;

        // (a) simple loop: runs n times
        long a = 0;
        for (int i = 0; i < n; i++) a++;

        // (b) triangle loop: (n-1) + (n-2) + ... + 0 = n*(n-1)/2
        long b = 0;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++) b++;

        // (c) doubling inner loop: n * (floor(log2 n) + 1)
        long c = 0;
        for (int j = 1; j <= n; j++)
            for (int i = 1; i <= n; i *= 2) c++;

        // (d) halving outer, linear inner: n + n/2 + n/4 + ... < 2n
        long d = 0;
        for (int i = n; i > 0; i /= 2)
            for (int j = 0; j < i; j++) d++;

        // (e) square-root loop: floor(sqrt(n)) times
        long e = 0;
        for (int i = 1; (long) i * i <= n; i++) e++;

        System.out.println("simple   = " + a);   // 8
        System.out.println("triangle = " + b);   // 28
        System.out.println("doubling = " + c);   // 32
        System.out.println("halving  = " + d);   // 15
        System.out.println("sqrt     = " + e);   // 2
    }
}`,
    codeTitle: 'Count the strokes of five classic loop shapes',
    viz: [
      {
        title: 'Triangle loop counter: j starts at i + 1',
        input: '5',
        inputLabel: 'N (2 to 8)',
        gen: function (input) {
          var n = parseOneInt(input, 2, 8, 5);
          var frames = [], count = 0, grid = [], rowHead = [], colHead = [], r, c;
          for (r = 0; r < n; r++) {
            grid.push([]);
            rowHead.push('i=' + r);
            for (c = 0; c < n; c++) grid[r].push(c <= r ? '×' : '');
          }
          for (c = 0; c < n; c++) colHead.push('j=' + c);
          function hlAll(cur) {
            var h = {};
            for (var rr = 0; rr < n; rr++) for (var cc = 0; cc < n; cc++) {
              if (cc <= rr) h[rr + ',' + cc] = 'done';
              else if (grid[rr][cc] !== '') h[rr + ',' + cc] = 'ok';
            }
            if (cur) h[cur] = 'cur';
            return h;
          }
          frames.push({
            narr: 'Code: <code>for i in 0..N-1, for j = i+1 .. N-1: count++</code>. The grid has one cell for every (i, j) pair. Cells marked × (j ≤ i) are <b>never</b> visited because j always starts after i. Let us put a tally number in each visited cell.',
            parts: [
              { type: 'grid', label: 'pairs (i, j) — rows are i, columns are j', rows: copyGrid(grid), rowHead: rowHead, colHead: colHead, hl: hlAll(null) },
              { type: 'vars', vals: { N: n, count: 0 } }
            ]
          });
          for (var i = 0; i < n; i++) {
            if (i + 1 >= n) {
              frames.push({
                narr: 'i = ' + i + ': j would start at ' + (i + 1) + ', which is not &lt; N = ' + n + '. The inner loop runs <b>0 times</b> — the last row of a triangle is empty.',
                parts: [
                  { type: 'grid', label: 'pairs (i, j)', rows: copyGrid(grid), rowHead: rowHead, colHead: colHead, hl: hlAll(null) },
                  { type: 'vars', vals: { i: i, 'inner runs this row': 0, count: count }, hl: { i: 'cur' } }
                ]
              });
              continue;
            }
            for (var j = i + 1; j < n; j++) {
              count++;
              grid[i][j] = String(count);
              var rowLen = n - 1 - i;
              var narr = 'i = ' + i + ', j = ' + j + ' → <b>count++</b> → count = ' + count + '.';
              if (j === i + 1) narr += ' Row i = ' + i + ' will run j from ' + (i + 1) + ' to ' + (n - 1) + ', that is <b>' + rowLen + '</b> times.';
              if (j === n - 1) narr += ' Row finished: ' + rowLen + ' stroke' + (rowLen === 1 ? '' : 's') + ' for this i. Each new row is one shorter than the one above.';
              frames.push({
                narr: narr,
                parts: [
                  { type: 'grid', label: 'pairs (i, j)', rows: copyGrid(grid), rowHead: rowHead, colHead: colHead, hl: hlAll(i + ',' + j) },
                  { type: 'vars', vals: { i: i, j: j, count: count }, hl: { count: 'ok', j: 'cur' } }
                ]
              });
            }
          }
          var parts = [];
          for (r = n - 1; r >= 0; r--) parts.push(r);
          frames.push({
            narr: 'Done. Row lengths were ' + parts.join(' + ') + ' = <b>' + count + '</b>. Gauss formula: N(N−1)/2 = ' + n + '·' + (n - 1) + '/2 = <b>' + (n * (n - 1) / 2) + '</b>. It is half of the N×N square (minus the diagonal) → still <b>O(N<sup>2</sup>)</b>.',
            parts: [
              { type: 'grid', label: 'all visited pairs', rows: copyGrid(grid), rowHead: rowHead, colHead: colHead, hl: hlAll(null) },
              { type: 'vars', vals: { count: count, 'N(N-1)/2': n * (n - 1) / 2 }, hl: { count: 'sel', 'N(N-1)/2': 'sel' } }
            ]
          });
          return frames;
        }
      },
      {
        title: 'Doubling inner loop: i *= 2 inside a j loop',
        input: '6',
        inputLabel: 'N (2 to 12)',
        gen: function (input) {
          var n = parseOneInt(input, 2, 12, 6);
          var inner = [];
          for (var v = 1; v <= n; v *= 2) inner.push(v);
          var outer = [];
          for (var q = 1; q <= n; q++) outer.push(q);
          var frames = [], count = 0;
          frames.push({
            narr: 'Code: <code>for (j = 1; j &lt;= N; j++) for (i = 1; i &lt;= N; i *= 2) count++;</code> The inner variable i takes the values ' + inner.join(', ') + ' (it doubles, so it jumps past N quickly). That is ' + inner.length + ' values = ⌊log₂ ' + n + '⌋ + 1.',
            parts: [
              { type: 'array', label: 'outer j values', values: outer, start: 1, showIdx: false },
              { type: 'array', label: 'inner i values (doubling)', values: inner.slice(), showIdx: false },
              { type: 'vars', vals: { N: n, count: 0 } }
            ]
          });
          for (var j = 1; j <= n; j++) {
            var hlO = {};
            for (var k = 0; k < j - 1; k++) hlO[k] = 'done';
            hlO[j - 1] = 'cur';
            var pO = {}; pO[j - 1] = 'j';
            for (var t = 0; t < inner.length; t++) {
              count++;
              var hlI = {};
              for (var u = 0; u < t; u++) hlI[u] = 'ok';
              hlI[t] = 'cur';
              var pI = {}; pI[t] = 'i';
              var narr = 'j = ' + j + ', i = ' + inner[t] + ' → count = <b>' + count + '</b>.';
              if (t === inner.length - 1) narr += ' Next i would be ' + (inner[t] * 2) + ' &gt; ' + n + ', so the inner loop stops after <b>' + inner.length + '</b> runs. Same ' + inner.length + ' runs for every j.';
              frames.push({
                narr: narr,
                parts: [
                  { type: 'array', label: 'outer j values', values: outer, hl: hlO, ptr: pO, showIdx: false },
                  { type: 'array', label: 'inner i values (doubling)', values: inner.slice(), hl: hlI, ptr: pI, showIdx: false },
                  { type: 'vars', vals: { j: j, i: inner[t], count: count }, hl: { count: 'ok' } }
                ]
              });
            }
          }
          frames.push({
            narr: 'Total = (outer runs) × (inner runs) = ' + n + ' × ' + inner.length + ' = <b>' + count + '</b>. In general N · (⌊log₂ N⌋ + 1) → <b>O(N log N)</b>. Nested loops multiply; a doubling loop contributes only a log factor.',
            parts: [
              { type: 'array', label: 'outer j values', values: outer, hl: (function () { var h = {}; for (var z = 0; z < n; z++) h[z] = 'done'; return h; })(), showIdx: false },
              { type: 'array', label: 'inner i values (doubling)', values: inner.slice(), showIdx: false },
              { type: 'vars', vals: { count: count, 'N x (floor(log2 N)+1)': n * inner.length }, hl: { count: 'sel' } }
            ]
          });
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Step of 3: for (i = 1; i <= N; i += 3)',
        html: `<p>N = 10. Write the values of i: ${H.arr([1, 4, 7, 10], { label: 'i', hl: { 3: 'g' } })}</p>
<p>That is <b>4</b> runs. General rule for "start s, stop at ≤ N, step k": count = ⌊(N − s)/k⌋ + 1 (when s ≤ N). Here ⌊(10 − 1)/3⌋ + 1 = 3 + 1 = ${H.c('g', '4')}. A step of 3 only divides the work by 3 — still <b>O(N)</b>, because constants do not change growth.</p>`
      },
      {
        title: 'Inner loop runs i times (j < i)',
        html: `<p><code>for (i = 0; i &lt; N; i++) for (j = 0; j &lt; i; j++) count++;</code> with N = 5:</p>
${H.table(['i', 'j values', 'inner runs'], [['0', '—', '0'], ['1', '0', '1'], ['2', '0 1', '2'], ['3', '0 1 2', '3'], ['4', '0 1 2 3', '4'], ['<b>total</b>', '', H.c('p', '0+1+2+3+4 = 10')]])}
<p>Same triangle as "j starts at i + 1", just mirrored: N(N−1)/2 = 10 → O(N<sup>2</sup>).</p>`,
        code: `int n = 5, count = 0;
for (int i = 0; i < n; i++)
    for (int j = 0; j < i; j++)
        count++;
System.out.println(count); // 10 = 5*4/2`
      },
      {
        title: 'Two pointers inside a while loop: looks nested, is linear',
        html: `<p><code>L = 0, R = N − 1; while (L &lt; R) { if (cond) L++; else R--; }</code></p>
<p>Do not count "loops", count <b>moves</b>. Each iteration moves L right <i>or</i> R left by one. The gap R − L starts at N − 1 and shrinks by exactly 1 per iteration, so the loop runs exactly <b>N − 1</b> times → ${H.c('g', 'O(N)')}. The same "total moves" argument proves the sliding window (left and right each move at most N times) is O(N) even though it has a loop inside a loop.</p>`
      },
      {
        title: 'Harmonic loop for N = 6',
        html: `<p><code>for (i = 1; i &lt;= N; i++) for (j = i; j &lt;= N; j += i)</code></p>
${H.table(['i', 'j values', 'runs = ⌊N/i⌋'], [['1', '1 2 3 4 5 6', '6'], ['2', '2 4 6', '3'], ['3', '3 6', '2'], ['4', '4', '1'], ['5', '5', '1'], ['6', '6', '1'], ['<b>total</b>', '', H.c('p', '14')]])}
<p>6·(1 + 1/2 + 1/3 + … + 1/6) ≈ 6 × 2.45 = 14.7, and the exact floor-sum is 14. For large N the total is about N·ln N → <b>O(N log N)</b>, much smaller than N<sup>2</sup>.</p>`
      },
      {
        title: 'The √N loop and an overflow trap',
        html: `<p><code>for (int i = 1; i * i &lt;= n; i++)</code> runs ⌊√N⌋ times: N = 50 → i = 1..7 (7·7 = 49 ≤ 50, 8·8 = 64 &gt; 50) → <b>7</b> runs.</p>
<p>Trap: if n is close to 2<sup>31</sup> − 1, <code>i * i</code> overflows <code>int</code> before the condition becomes false, turning into a negative number → the loop never ends. Write <code>(long) i * i &lt;= n</code>.</p>`,
        code: `long n = 2_000_000_000L; int runs = 0;
for (long i = 1; i * i <= n; i++) runs++;   // long math: no overflow
System.out.println(runs); // 44721`
      }
    ],
    deepDive: `<p><b>Exact vs Big-O counts.</b> Interview puzzles ("what does this print?") want the <i>exact</i> count, so watch floors and ceilings: <code>for (i = 0; i &lt; N; i += k)</code> runs ⌈N/k⌉ times, <code>for (i = 1; i &lt;= N; i *= 2)</code> runs ⌊log₂ N⌋ + 1 times, and the loop <i>condition</i> is checked one more time than the body runs (the final failing check). Complexity questions only want the growth rate, so all those ±1s disappear.</p>
<p><b>Why the halving loop is linear.</b> N + N/2 + N/4 + … ≤ N·(1 + ½ + ¼ + …) = 2N. Every term is at most half of the one before, so the whole tail is never bigger than the first term. This "geometric dominance" is the reason building a heap bottom-up is O(N) and why <code>ArrayList</code> doubling is amortised O(1).</p>
<p><b>Harmonic numbers.</b> H<sub>N</sub> = 1 + 1/2 + … + 1/N ≈ ln N + 0.577. So ∑ N/i ≈ N ln N ≈ 0.69·N log₂ N. Sieve of Eratosthenes only loops over primes p, giving N·∑ 1/p ≈ N ln ln N — even smaller.</p>
<p><b>Data-dependent loops.</b> When a loop's length depends on the data (while loops with pointers, stacks that push/pop), use the <b>"every element is touched a bounded number of times"</b> argument: each index enters a window once and leaves once, each item is pushed once and popped at most once → O(N) total. This is called <i>aggregate</i> amortised analysis.</p>
<p><b>Production reality.</b> Do not "measure" a counting loop with a stopwatch: the JIT compiler happily deletes a loop that only increments an unused counter, or replaces it with a formula. Use the math, or a benchmark harness like JMH that defeats dead-code elimination.</p>`,
    aiEra: `<p><b>What AI changes:</b> paste any loop into an assistant and it will answer "O(N log N)" in a second. For textbook loops it is usually right; for the tricky shapes in this topic (halving outer + linear inner, harmonic steps, two-pointer while loops, <code>j *= 2</code> up to i) assistants still confidently answer the wrong class surprisingly often, because they pattern-match "two loops = N<sup>2</sup>".</p>
<p><b>Use AI as a partner:</b> ask <code>Write 6 tricky nested-loop snippets and hide the answers</code> for drills; ask it to <code>add a counter to this loop and print the count for N = 1, 10, 100, 1000</code>, then fit the numbers yourself (do they grow ×10, ×100, ×(10·3.3)?). Measured counts are ground truth that catches both your mistakes and the model's.</p>
<p><b>What you must still own:</b> in an interview you have no assistant, and in a code review you are the one accountable for "this endpoint loops over every user for every order". Counting strokes by hand, fast, is the skill the rest of DSA is built on.</p>`,
    problems: [
      {
        title: 'Count the Handshakes (Triangle Loop in O(1))',
        level: 'Easy',
        tags: ['loop counting', 'AP sum', 'math'],
        statement: `<p>At a party with <code>N</code> people, every pair shakes hands exactly once. A slow program counts them like this:</p>
<pre>count = 0
for i in 0..N-1:
    for j in i+1..N-1:
        count++</pre>
<p>Return the final value of <code>count</code> <b>without running the loops</b>.</p>`,
        constraints: `1 ≤ N ≤ 10<sup>9</sup>`,
        example: `<p>Input: <b>N = 4</b> → Output: ${H.c('p', '<b>6</b>')}</p>
${H.table(['person i', 'shakes hands with j', 'new handshakes'], [['0', '1, 2, 3', H.c('g', '3')], ['1', '2, 3', H.c('g', '2')], ['2', '3', H.c('g', '1')], ['3', '(everyone already met)', H.c('m', '0')]])}
<p>Why: 3 + 2 + 1 + 0 = ${H.c('p', '6')} = 4·3/2.</p>`,
        brute: {
          why: `<p>Just run the two loops. For N = 10<sup>9</sup> that is about 5·10<sup>17</sup> increments — at 10<sup>8</sup> per second that is roughly <b>150 years</b>. The wasted work: we already know row i has exactly N−1−i strokes, yet we count them one by one.</p>`,
          code: `
long countByLoop(int n) {
    long count = 0;
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            count++;           // one stroke per handshake
        }
    }
    return count;
}`
        },
        mcq: {
          q: 'Row i of the loop does N−1−i handshakes. Adding all rows gives (N−1) + (N−2) + … + 1 + 0. What is the fastest way to get this sum?',
          options: ['Use a loop that adds the rows (O(N))', 'Use the AP formula N(N−1)/2 (O(1))', 'Sort the people first', 'Use recursion'],
          answer: 1,
          explain: 'The row sizes form an arithmetic progression (each row is 1 less). An AP sum has a closed formula: number of terms × (first + last) / 2 = N·(N−1+0)/2.'
        },
        hints: [
          `<p>Write the inner count for each i: N−1, N−2, …, 1, 0. That is the sum 0 + 1 + … + (N−1). Pair the first with the last (Gauss trick): every pair adds to N−1, and there are N/2 pairs → <b>N(N−1)/2</b>.</p>`,
          `<p>No data structure is needed — just one <code>long</code> variable and one formula. Order of operations matters: multiply first, divide by 2 last.</p>`,
          `<p>Traps: <code>n * (n - 1)</code> with <code>int</code> overflows for N = 10<sup>9</sup> (10<sup>18</sup> &gt; 2.1·10<sup>9</sup>) → use <code>long</code>. Dividing first (<code>n / 2 * (n - 1)</code>) loses the half when N is odd. N(N−1) is always even (one of two neighbours is even), so dividing at the end is exact. Recipe: read N as long → return N·(N−1)/2.</p>`
        ],
        solution: {
          approach: `<p>The loop count is the sum 0 + 1 + … + (N−1), an AP. Replace the loops with the formula N(N−1)/2.</p>`,
          code: `
class Solution {
    // O(1): triangle formula. n*(n-1) is always even, so /2 is exact.
    long countHandshakes(long n) {
        return n * (n - 1) / 2;   // long math: 10^9 * 10^9 = 10^18 fits in long
    }

    // O(n^2): the original slow loop, kept only to cross-check small n.
    long countByLoop(int n) {
        long count = 0;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                count++;
            }
        }
        return count;
    }

    public static void main(String[] args) {
        Solution s = new Solution();
        System.out.println(s.countHandshakes(4));          // 6
        System.out.println(s.countByLoop(4));              // 6  (same answer)
        System.out.println(s.countHandshakes(1000000000L)); // 499999999500000000
    }
}`,
          dry: {
            head: ['i', 'j values', 'inner runs', 'running count (loop)'],
            rows: [
              ['0', '1, 2, 3', '3', '3'],
              ['1', '2, 3', '2', '5'],
              ['2', '3', '1', '6'],
              ['3', '—', '0', '6'],
              ['formula', '—', '—', H.c('p', '4·3/2 = 6 ✓')]
            ]
          },
          complexity: `<p><b>Time O(1)</b>: one multiplication and one division, no matter how big N is. <b>Space O(1)</b>: one variable. The loop version is O(N<sup>2</sup>) because the triangle has about N<sup>2</sup>/2 cells.</p>`
        }
      },
      {
        title: 'Tricky Loop: j Doubles Up to i',
        level: 'Medium',
        tags: ['loop counting', 'logarithm', 'grouping'],
        statement: `<p>Return the exact value of <code>count</code> after this code runs:</p>
<pre>long count = 0;
for (long i = 1; i &lt;= n; i++)
    for (long j = 1; j &lt;= i; j *= 2)
        count++;</pre>
<p>N is so large that you cannot run the loops.</p>`,
        constraints: `1 ≤ N ≤ 10<sup>17</sup> (the answer fits in a <code>long</code>)`,
        example: `<p>Input: <b>N = 5</b> → Output: ${H.c('p', '<b>11</b>')}</p>
${H.table(['i', 'j values (1, 2, 4, …, ≤ i)', 'inner runs'], [['1', '1', H.c('g', '1')], ['2', '1 2', H.c('b', '2')], ['3', '1 2', H.c('b', '2')], ['4', '1 2 4', H.c('y', '3')], ['5', '1 2 4', H.c('y', '3')]])}
<p>Total = 1 + 2 + 2 + 3 + 3 = ${H.c('p', '11')}. Notice the same colour = same inner count.</p>`,
        brute: {
          why: `<p>Running the loops costs about N·log₂ N steps — for N = 10<sup>17</sup> that is ~5.7·10<sup>18</sup> steps, thousands of years. The wasted work: thousands of consecutive i values have the <b>same</b> inner count, yet we recount each one.</p>`,
          code: `
long brute(long n) {
    long count = 0;
    for (long i = 1; i <= n; i++) {
        for (long j = 1; j <= i; j *= 2) {
            count++;
        }
    }
    return count;
}`
        },
        mcq: {
          q: 'For a fixed i, how many times does the inner loop <code>for (j = 1; j &lt;= i; j *= 2)</code> run?',
          options: ['i times', '⌊log₂ i⌋ + 1 times (the number of bits of i)', 'i / 2 times', '√i times'],
          answer: 1,
          explain: 'j takes 1, 2, 4, …, the biggest power of two ≤ i. Those are 2<sup>0</sup> … 2<sup>⌊log₂ i⌋</sup>, i.e. ⌊log₂ i⌋ + 1 values — exactly the bit-length of i (5 = 101₂ has 3 bits).'
        },
        hints: [
          `<p>Inner runs for i = bit-length of i. All numbers in <b>[2<sup>b−1</sup>, 2<sup>b</sup> − 1]</b> have bit-length b: 1 has 1 bit; 2–3 have 2 bits; 4–7 have 3 bits; 8–15 have 4 bits… So group i's by bit-length!</p>`,
          `<p>Walk groups with a variable <code>lo</code> = 1, 2, 4, 8, … (start of each group) and <code>b</code> = 1, 2, 3, … The group is <code>lo .. min(N, 2·lo − 1)</code>; it contributes <code>b × (group size)</code>. Only about 57 groups for N = 10<sup>17</sup>.</p>`,
          `<p>Traps: the last group is cut off by N (use <code>Math.min</code>); use <code>long</code> everywhere (10<sup>17</sup> &gt; int range); stop when <code>lo &gt; N</code>. Recipe: total = 0, lo = 1, b = 1; while lo ≤ N: hi = min(N, 2lo−1); total += b·(hi−lo+1); lo *= 2; b++. Return total.</p>`
        ],
        solution: {
          approach: `<p>Group i by its bit-length b; every group [2<sup>b−1</sup>, 2<sup>b</sup>−1] adds b per member. ~log₂ N groups.</p>`,
          code: `
class Solution {
    long countIterations(long n) {
        long total = 0;
        long lo = 1;   // first i of the current group: 1, 2, 4, 8, ...
        int b = 1;     // every i in this group makes the inner loop run b times
        while (lo <= n) {
            long hi = Math.min(n, 2 * lo - 1);  // last i of this group (cut by n)
            total += (long) b * (hi - lo + 1);  // b runs for each of the (hi-lo+1) values
            lo = 2 * lo;                        // next group starts at the next power of 2
            b++;
        }
        return total;
    }

    public static void main(String[] args) {
        System.out.println(new Solution().countIterations(5));  // 11
    }
}`,
          dry: {
            head: ['b (bits)', 'lo', 'hi = min(N, 2lo−1)', 'group size', 'added b × size', 'total'],
            rows: [
              ['1', '1', '1', '1', '1', '1'],
              ['2', '2', '3', '2', '4', '5'],
              ['3', '4', 'min(5, 7) = 5', '2', '6', H.c('p', '11')],
              ['4', '8', '— (8 &gt; 5, stop)', '—', '—', H.c('p', '11')]
            ]
          },
          complexity: `<p><b>Time O(log N)</b>: <code>lo</code> doubles every round, so the while loop runs about log₂ N ≈ 57 times even for N = 10<sup>17</sup>. <b>Space O(1)</b>: a few variables.</p>`
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 2 — Arithmetic & Geometric Progressions
  // =====================================================================
  topics.push({
    title: 'Arithmetic & Geometric Progressions (AP / GP)',
    analogy: `<p><b>AP — a staircase.</b> Every step is the same height. If you save ₹10 in week 1, ₹20 in week 2, ₹30 in week 3… the amount grows by the <b>same fixed amount</b> each time. That fixed jump is the "common difference" d.</p>
<p><b>GP — folding paper / a rumour.</b> Fold a sheet: 1 layer → 2 → 4 → 8. Or one person tells a secret to 2 friends, each tells 2 more… The amount gets <b>multiplied by the same number</b> each time. That multiplier is the "common ratio" r.</p>
<p><b>Little Gauss</b> was told to add 1 + 2 + … + 100. He paired the ends: 1 + 100, 2 + 99, 3 + 98 … every pair is 101, and there are 50 pairs → 5050, in seconds.</p>`,
    explain: `<h4>Arithmetic Progression (AP): add the same d each time</h4>
${H.arr([3, 7, 11, 15, 19], { label: 'a=3, d=4', hl: { 0: 'g', 4: 'y' } })}
<ul>
<li><b>k-th term</b> (1-based): <code>a + (k − 1)·d</code>. 5th term = 3 + 4·4 = 19.</li>
<li><b>Number of terms</b> from L to R with step d: <code>(R − L)/d + 1</code>. From 3 to 19 step 4: 16/4 + 1 = 5.</li>
<li><b>Sum of n terms</b> = <code>n × (first + last) / 2</code> = <code>n·a + d·n(n−1)/2</code>.</li>
</ul>
<p><b>Why the pairing works</b> (1 + 2 + 3 + 4 + 5 + 6):</p>
${H.table(['pair', 'left', 'right', 'pair sum'], [['1', '1', '6', H.c('g', '7')], ['2', '2', '5', H.c('g', '7')], ['3', '3', '4', H.c('g', '7')], ['<b>total</b>', '', '', H.c('p', '3 pairs × 7 = 21 = 6·7/2')]])}
<p>Moving one step inward, the left grows by d and the right shrinks by d, so <b>every pair has the same sum</b>. With n terms there are n/2 pairs → n·(first+last)/2. Special case: <b>1 + 2 + … + N = N(N+1)/2</b>.</p>
<h4>Geometric Progression (GP): multiply by the same r each time</h4>
${H.arr([1, 2, 4, 8, 16, 32], { label: 'a=1, r=2', hl: { 5: 'y' } })}
<ul>
<li><b>k-th term</b>: <code>a·r<sup>k−1</sup></code>.</li>
<li><b>Sum of n terms</b> (r ≠ 1): <code>a·(r<sup>n</sup> − 1)/(r − 1)</code>. If r = 1, the sum is just n·a.</li>
<li><b>Doubling magic</b>: 1 + 2 + 4 + … + 2<sup>k</sup> = 2<sup>k+1</sup> − 1. So 1+2+4+8+16 = 31 = 32 − 1. The sum of all earlier powers is <b>one less than the next power</b>.</li>
<li><b>Halving magic</b>: N + N/2 + N/4 + … &lt; 2N. A loop whose work halves each round is O(N) total.</li>
</ul>
<h4>Where they show up in DSA</h4>
${H.table(['Code shape', 'Progression', 'Total'], [
  ['triangle loop <code>j = i+1..N</code>', 'AP: (N−1)+(N−2)+…+0', 'N(N−1)/2 → O(N<sup>2</sup>)'],
  ['halving work N, N/2, N/4…', 'GP with r = ½', '&lt; 2N → O(N)'],
  ['complete binary tree levels 1, 2, 4, …', 'GP with r = 2', '2<sup>h+1</sup> − 1 nodes'],
  ['dynamic array doubling copies 1+2+4+…', 'GP', '&lt; 2N → O(1) amortised per push']
])}`,
    clues: [
      '"Sum of 1 to N", "sum of the first N odd/even numbers" with <b>N ≤ 10<sup>9</sup> or 10<sup>18</sup></b> → you cannot loop; use the AP formula.',
      '"Each day she saves X more than the day before" / "every row has one more brick" → AP (same difference).',
      '"Doubles / triples every hour", "each person tells 2 friends", "bacteria split" → GP (same ratio).',
      '"Sum of r<sup>0</sup> + r<sup>1</sup> + … + r<sup>n−1</sup> modulo 10<sup>9</sup>+7" with huge n → GP formula + fast power + modular inverse.',
      '"Sum of multiples of K up to N" → an AP with first term K and difference K: K·m(m+1)/2 where m = ⌊N/K⌋.',
      'Loop whose work halves (N, N/2, N/4…) → GP sum &lt; 2N → total is linear, not N log N.'
    ],
    code: [`
class Progressions {
    // Sum of n terms of an AP: a, a+d, a+2d, ...
    static long apSum(long a, long d, long n) {
        // n*a + d * (0 + 1 + ... + (n-1)) ; n*(n-1) is even, so /2 is exact
        return n * a + d * (n * (n - 1) / 2);
    }

    // Number of terms from L to R (inclusive) with step d, assuming (R-L) % d == 0
    static long countTerms(long L, long R, long d) {
        return (R - L) / d + 1;
    }

    // Sum of n terms of a GP: a, a*r, a*r^2, ...  (small values, no modulo)
    static long gpSum(long a, long r, int n) {
        if (r == 1) return a * n;          // every term equals a
        long power = 1;
        for (int i = 0; i < n; i++) power *= r;   // r^n
        return a * (power - 1) / (r - 1);  // a * (r^n - 1) / (r - 1)
    }

    public static void main(String[] args) {
        System.out.println(apSum(1, 1, 100));      // 5050 (Gauss)
        System.out.println(apSum(3, 4, 5));        // 3+7+11+15+19 = 55
        System.out.println(countTerms(3, 19, 4));  // 5
        System.out.println(gpSum(1, 2, 5));        // 1+2+4+8+16 = 31
        System.out.println(gpSum(1, 3, 4));        // 1+3+9+27 = 40
    }
}`],
    codeTitle: ['AP and GP formulas in Java'],
    viz: [
      {
        title: 'Gauss pairing trick: 1 + 2 + … + N',
        input: '10',
        inputLabel: 'N (1 to 16)',
        gen: function (input) {
          var n = parseOneInt(input, 1, 16, 10);
          var a = [];
          for (var x = 1; x <= n; x++) a.push(x);
          var frames = [], total = 0, pairs = 0, L = 0, R = n - 1, done = {};
          frames.push({
            narr: 'We want 1 + 2 + … + ' + n + '. Instead of adding one by one, pair the <b>smallest</b> with the <b>largest</b>. Watch how every pair gives the same total (' + (n + 1) + ').',
            parts: [
              { type: 'array', label: 'numbers', values: a, ptr: (function () { var p = {}; p[0] = 'L'; if (n - 1 !== 0) p[n - 1] = 'R'; return p; })(), start: 0 },
              { type: 'vars', vals: { N: n, pairs: 0, total: 0 } }
            ]
          });
          while (L < R) {
            pairs++;
            total += a[L] + a[R];
            done[L] = 'ok'; done[R] = 'ok';
            var hl = {};
            for (var k in done) hl[k] = 'done';
            hl[L] = 'cur'; hl[R] = 'cur';
            var ptr = {}; ptr[L] = 'L'; ptr[R] = 'R';
            frames.push({
              narr: 'Pair #' + pairs + ': ' + a[L] + ' + ' + a[R] + ' = <b>' + (a[L] + a[R]) + '</b>. Moving inward, the left grows by 1 and the right shrinks by 1, so the pair sum never changes. Running total = ' + total + '.',
              parts: [
                { type: 'array', label: 'numbers', values: a, hl: hl, ptr: ptr },
                { type: 'vars', vals: { 'pair sum': a[L] + a[R], pairs: pairs, total: total }, hl: { 'pair sum': 'ok' } }
              ]
            });
            L++; R--;
          }
          var hlEnd = {};
          for (var q = 0; q < n; q++) hlEnd[q] = 'done';
          if (L === R) {
            total += a[L];
            hlEnd[L] = 'sel';
            frames.push({
              narr: 'N is odd, so the middle number <b>' + a[L] + '</b> has no partner. It is exactly half of a pair (' + (n + 1) + '/2), which is why the formula N(N+1)/2 still works. Total = ' + total + '.',
              parts: [
                { type: 'array', label: 'numbers', values: a, hl: hlEnd, ptr: (function () { var p = {}; p[L] = 'mid'; return p; })() },
                { type: 'vars', vals: { pairs: pairs, middle: a[L], total: total }, hl: { middle: 'sel' } }
              ]
            });
          }
          frames.push({
            narr: 'Result: <b>' + total + '</b>. Formula: N(N+1)/2 = ' + n + '·' + (n + 1) + '/2 = <b>' + (n * (n + 1) / 2) + '</b>. One multiplication instead of N additions → <b>O(1)</b> time.',
            parts: [
              { type: 'array', label: 'numbers', values: a, hl: hlEnd },
              { type: 'vars', vals: { 'loop total': total, 'N(N+1)/2': n * (n + 1) / 2 }, hl: { 'N(N+1)/2': 'sel' } }
            ]
          });
          if (frames.length < 4) {
            frames.splice(1, 0, {
              narr: 'With such a tiny N there is almost nothing to pair — try N = 10 to see the trick shine.',
              parts: [{ type: 'array', label: 'numbers', values: a }, { type: 'vars', vals: { N: n } }]
            });
          }
          if (frames.length < 4) {
            frames.splice(1, 0, {
              narr: 'Rule to remember: number of terms × (first + last) / 2.',
              parts: [{ type: 'array', label: 'numbers', values: a }, { type: 'vars', vals: { first: a[0], last: a[n - 1] } }]
            });
          }
          return frames;
        }
      },
      {
        title: 'GP growth: each term = previous × r',
        input: '2 6',
        inputLabel: 'r n  (r from 2 to 5, n from 2 to 10)',
        gen: function (input) {
          var parts = String(input === undefined ? '' : input).trim().split(/[\s,]+/);
          if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) throw new Error('Enter two whole numbers: ratio r and number of terms n, e.g. "2 6".');
          var r = parseInt(parts[0], 10), n = parseInt(parts[1], 10);
          if (r < 2 || r > 5 || n < 2 || n > 10) throw new Error('Keep r between 2 and 5 and n between 2 and 10.');
          var frames = [], terms = [], sum = 0, t = 1;
          frames.push({
            narr: 'GP with first term 1 and ratio r = ' + r + ': every new term is the previous one <b>× ' + r + '</b>. Watch how the newest bar is taller than all earlier bars put together' + (r === 2 ? ' (almost — exactly 1 more).' : '.'),
            parts: [{ type: 'bars', label: 'terms', values: [0], texts: [''] }, { type: 'vars', vals: { r: r, n: n, sum: 0 } }]
          });
          for (var i = 0; i < n; i++) {
            var prevSum = sum;
            terms.push(t);
            sum += t;
            var hl = {}; hl[i] = 'cur';
            var narr = 'Term ' + (i + 1) + ' = ' + (i === 0 ? '1' : terms[i - 1] + ' × ' + r + ' = <b>' + t + '</b>') + '. Running sum = ' + sum + '.';
            if (i > 0 && r === 2) narr += ' Sum of all earlier terms was ' + prevSum + ' = ' + t + ' − 1: the next power of 2 minus one.';
            if (i > 0 && r > 2) narr += ' Earlier terms add to only ' + prevSum + ', less than this one term (' + t + ').';
            frames.push({
              narr: narr,
              parts: [
                { type: 'bars', label: 'terms r^k', values: terms.slice(), hl: hl, idxLabels: terms.map(function (_, k) { return 'k=' + k; }) },
                { type: 'vars', vals: { term: t, sum: sum }, hl: { term: 'cur', sum: 'ok' } }
              ]
            });
            t *= r;
          }
          var formula = (Math.pow(r, n) - 1) / (r - 1);
          frames.push({
            narr: 'Formula check: (r<sup>n</sup> − 1)/(r − 1) = (' + r + '<sup>' + n + '</sup> − 1)/' + (r - 1) + ' = (' + Math.pow(r, n) + ' − 1)/' + (r - 1) + ' = <b>' + formula + '</b>, same as our running sum. The <b>last term dominates</b> the whole sum — that is why a GP sum is "about the size of its biggest term".',
            parts: [
              { type: 'bars', label: 'terms r^k', values: terms.slice(), hl: (function () { var h = {}; h[n - 1] = 'sel'; return h; })(), idxLabels: terms.map(function (_, k) { return 'k=' + k; }) },
              { type: 'vars', vals: { 'loop sum': sum, 'formula': formula }, hl: { formula: 'sel' } }
            ]
          });
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Sum of multiples of 3 or 5 below 1000',
        html: `<p>Multiples of 3 below 1000: 3, 6, …, 999 → an AP with m = ⌊999/3⌋ = 333 terms, sum = 3·333·334/2 = ${H.c('b', '166833')}.</p>
<p>Multiples of 5: m = 199 → 5·199·200/2 = ${H.c('b', '99500')}. Multiples of 15 were counted twice: m = 66 → 15·66·67/2 = ${H.c('r', '33165')}.</p>
<p>Answer = 166833 + 99500 − 33165 = ${H.c('p', '<b>233168</b>')}, with zero loops. Works the same for a limit of 10<sup>18</sup> (with care about overflow).</p>`,
        code: `long below = 999;                        // "below 1000" means up to 999
long m3 = below / 3, m5 = below / 5, m15 = below / 15;
long ans = 3 * m3 * (m3 + 1) / 2 + 5 * m5 * (m5 + 1) / 2 - 15 * m15 * (m15 + 1) / 2;
System.out.println(ans); // 233168`
      },
      {
        title: 'Sum of the first N odd numbers is a perfect square',
        html: `<p>1 + 3 + 5 + 7 = 16 = 4<sup>2</sup>. As an AP: a = 1, d = 2, n terms → n·a + d·n(n−1)/2 = n + n(n−1) = <b>n<sup>2</sup></b>.</p>
${H.table(['n', 'odd numbers', 'sum', 'n²'], [['1', '1', '1', '1'], ['2', '1 3', '4', '4'], ['3', '1 3 5', '9', '9'], ['4', '1 3 5 7', '16', H.c('g', '16')]])}
<p>Picture: each odd number adds an "L-shaped" border to a square of dots.</p>`
      },
      {
        title: 'Why ArrayList.add is O(1) on average (GP of copies)',
        html: `<p>A dynamic array doubles its capacity when full: 1 → 2 → 4 → 8 → 16. Adding 16 items triggers copies of 1 + 2 + 4 + 8 = ${H.c('y', '15')} elements (GP doubling magic: 2<sup>4</sup> − 1).</p>
<p>In general, N pushes cause fewer than N copies in total, plus N writes → under 2N work → ${H.c('g', 'O(1) amortised per push')}. If capacity grew by a fixed +10 instead (an AP!), copies would be 10 + 20 + 30 + … ≈ N<sup>2</sup>/20 → O(N) per push on average. Java's ArrayList actually grows by 1.5×, which is still a GP.</p>`
      },
      {
        title: 'Nodes in a complete binary tree',
        html: `<p>Levels hold 1, 2, 4, 8 … nodes (GP, r = 2). A perfect tree of height h (levels 0..h) has 2<sup>h+1</sup> − 1 nodes: h = 3 → 15 nodes.</p>
<p>Reverse view: <b>more than half the nodes are leaves</b> (8 of 15). That is why a heap's sift-down from the bottom is cheap: most nodes sit near the bottom and travel a short distance.</p>`
      }
    ],
    deepDive: `<p><b>Deriving the GP sum.</b> S = a + ar + … + ar<sup>n−1</sup>. Multiply by r: rS = ar + … + ar<sup>n</sup>. Subtract: rS − S = ar<sup>n</sup> − a → S = a(r<sup>n</sup> − 1)/(r − 1). For 0 &lt; r &lt; 1 and n → ∞, r<sup>n</sup> → 0 so S → a/(1 − r): ½ + ¼ + ⅛ + … = 1.</p>
<p><b>The dominance rule (the heart of the Master Theorem).</b> In a GP the biggest term controls the sum: r &gt; 1 → the <b>last</b> term dominates (sum ≈ last·r/(r−1)); r &lt; 1 → the <b>first</b> term dominates; r = 1 → all n terms equal → sum = n·a. Apply it to recursion levels: <code>T(n) = T(n/2) + n</code> has level costs n, n/2, n/4 … (r = ½) → O(n). <code>T(n) = 2T(n/2) + n</code> has every level cost n (r = 1), log n levels → O(n log n). <code>T(n) = 2T(n−1) + 1</code> has level costs 1, 2, 4 … (r = 2) → O(2<sup>n</sup>).</p>
<p><b>Other closed forms worth memorising:</b> ∑k<sup>2</sup> = n(n+1)(2n+1)/6, ∑k<sup>3</sup> = (n(n+1)/2)<sup>2</sup>, ∑k·2<sup>k</sup> (k = 0..n) = (n−1)2<sup>n+1</sup> + 2. A loop nested three deep with i &lt; j &lt; k runs C(N,3) = N(N−1)(N−2)/6 times.</p>
<p><b>Overflow and modulo.</b> With n up to 10<sup>9</sup>, n(n+1) ≈ 10<sup>18</sup> still fits in <code>long</code> (max ≈ 9.22·10<sup>18</sup>); with n up to 10<sup>18</sup> it does not. Under a modulus you cannot simply "divide by 2": either divide the even factor first, multiply by the modular inverse of 2 (when the modulus is prime), or use <code>BigInteger</code>. For a GP mod p where r ≡ 1 (mod p), the formula divides by zero — fall back to n·a or a divide-and-conquer sum.</p>`,
    aiEra: `<p><b>What AI changes:</b> closed forms are exactly the kind of thing an assistant recalls instantly — ask "sum of k² from 1 to n" and you get the formula. Symbolic tools (and AI-driven ones) can also derive sums you have never seen.</p>
<p><b>Use AI as a partner:</b> let it propose the formula, then <b>verify on n = 1, 2, 3</b> by hand or with a 5-line brute-force loop — cheap, and it catches off-by-one errors (n vs n−1 terms) that models make often. Ask it to <code>list the overflow risks of computing n*(n+1)/2 mod 1e9+7 in Java for n up to 1e18</code>; good answers mention reducing n mod p first and the inverse of 2.</p>
<p><b>Where AI goes wrong:</b> dividing under a modulus, forgetting the r = 1 special case of a GP, and mixing "below N" with "up to N". <b>What you must still own:</b> spotting the progression hidden in a story ("each row has one more brick"), and the dominance rule that turns recursion costs into Big-O in your head.</p>`,
    problems: [
      {
        title: 'Sum of an AP in O(1) for Many Queries',
        level: 'Easy',
        tags: ['AP', 'math', 'formula'],
        statement: `<p>You get <code>Q</code> queries. Each query gives <code>a</code> (first term), <code>d</code> (common difference) and <code>n</code> (number of terms). For each query return <code>a + (a+d) + (a+2d) + … </code> (n terms).</p>`,
        constraints: `1 ≤ Q ≤ 10<sup>5</sup>, 1 ≤ n ≤ 10<sup>6</sup>, −10<sup>6</sup> ≤ a, d ≤ 10<sup>6</sup>`,
        example: `<p>Query (a=3, d=4, n=5):</p>
${H.arr([3, 7, 11, 15, 19], { hl: { 0: 'g', 4: 'g' } })}
<p>Pair the ends: ${H.c('g', '3 + 19 = 22')}, 7 + 15 = 22, middle 11 is half of 22. Sum = 5 × 22 / 2 = ${H.c('p', '<b>55</b>')}.</p>
<p>Query (a=10, d=−2, n=6): 10, 8, 6, 4, 2, 0 → ${H.c('p', '<b>30</b>')}. Negative d is fine.</p>`,
        brute: {
          why: `<p>Add the n terms with a loop for each query: Q × n = 10<sup>5</sup> × 10<sup>6</sup> = 10<sup>11</sup> additions → about 1000 seconds → TLE. The wasted work: the terms follow a perfect pattern, so their sum is already known from a, d and n.</p>`,
          code: `
long[] brute(long[][] queries) {
    long[] ans = new long[queries.length];
    for (int q = 0; q < queries.length; q++) {
        long a = queries[q][0], d = queries[q][1], n = queries[q][2];
        long sum = 0, term = a;
        for (long k = 0; k < n; k++) {
            sum += term;     // add current term
            term += d;       // move to next term
        }
        ans[q] = sum;
    }
    return ans;
}`
        },
        mcq: {
          q: 'Which expression equals the sum of n AP terms starting at a with difference d?',
          options: ['n·a + d·n(n−1)/2', 'n·a + d·n(n+1)/2', 'a·d·n', '(a + d)·n/2'],
          answer: 0,
          explain: 'Every term is a plus some multiple of d: a + 0d, a + 1d, …, a + (n−1)d. That is n copies of a plus d·(0+1+…+(n−1)) = d·n(n−1)/2.'
        },
        hints: [
          `<p>Split each term into "a" plus "k·d" (k = 0..n−1). The a's give n·a. The d's give d·(0 + 1 + … + (n−1)) = d·n(n−1)/2 — the triangle number again.</p>`,
          `<p>No data structure needed: one formula per query, stored into a <code>long[]</code> answer array.</p>`,
          `<p>Traps: compute <code>n*(n-1)/2</code> first (it is always an exact integer), then multiply by d — dividing <code>d*n*(n-1)</code> also works but risks overflow on bigger limits. Use <code>long</code>: n(n−1)/2 ≈ 5·10<sup>11</sup>, times d = 10<sup>6</sup> → 5·10<sup>17</sup>. Negative d works without any special case. Recipe: for each query → ans = n·a + d·(n(n−1)/2).</p>`
        ],
        solution: {
          approach: `<p>Use sum = n·a + d·n(n−1)/2 per query → O(1) each.</p>`,
          code: `
class Solution {
    // Sum of n terms: a, a+d, ..., a+(n-1)d
    static long apSum(long a, long d, long n) {
        long tri = n * (n - 1) / 2;   // 0 + 1 + ... + (n-1), always exact
        return n * a + d * tri;       // n copies of a, plus tri copies of d
    }

    static long[] answerQueries(long[][] queries) {
        long[] ans = new long[queries.length];
        for (int q = 0; q < queries.length; q++) {
            ans[q] = apSum(queries[q][0], queries[q][1], queries[q][2]);
        }
        return ans;
    }

    public static void main(String[] args) {
        long[][] qs = { {3, 4, 5}, {1, 1, 100}, {10, -2, 6} };
        System.out.println(Arrays.toString(answerQueries(qs)));  // [55, 5050, 30]
    }
}`,
          dry: {
            head: ['query (a, d, n)', 'n·a', 'tri = n(n−1)/2', 'd·tri', 'answer'],
            rows: [
              ['(3, 4, 5)', '15', '10', '40', H.c('p', '55')],
              ['(1, 1, 100)', '100', '4950', '4950', H.c('p', '5050')],
              ['(10, −2, 6)', '60', '15', '−30', H.c('p', '30')]
            ]
          },
          complexity: `<p><b>Time O(Q)</b>: each query is a handful of multiplications — O(1) — so 10<sup>5</sup> queries take ~10<sup>5</sup> steps instead of 10<sup>11</sup>. <b>Space O(Q)</b> for the answer array, O(1) extra.</p>`
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 3 — Logarithms as repeated halving
  // =====================================================================
  topics.push({
    title: 'Logarithms: log₂ N = How Many Times You Can Halve N',
    analogy: `<p>Find a word in a <b>1000-page dictionary</b>. Open the middle: your word is in the left half or the right half — throw the other half away. 1000 → 500 → 250 → 125 → 63 → 32 → 16 → 8 → 4 → 2 → 1. About <b>10 tears</b> and you are on the right page. That count, "how many halvings until one thing is left", is exactly what log₂ means.</p>
<p>Same with the "guess my number from 1 to 100" game: answering "higher / lower" each time, you never need more than 7 guesses, because 2<sup>7</sup> = 128 ≥ 100.</p>`,
    explain: `<p><b>Definition in plain words:</b> log₂ N is the power you raise 2 to in order to get N. 2<sup>5</sup> = 32, so log₂ 32 = 5. Flip it around: <b>start at N and keep dividing by 2 — the number of divisions until you reach 1 is ⌊log₂ N⌋</b>.</p>
${H.table(['N', 'halving chain', 'steps = ⌊log₂ N⌋'], [
  ['1', '1', '0'],
  ['8', '8 → 4 → 2 → 1', '3'],
  ['20', '20 → 10 → 5 → 2 → 1', '4'],
  ['100', '100 → 50 → 25 → 12 → 6 → 3 → 1', '6'],
  ['10<sup>3</sup>', '…', '≈ 10'],
  ['10<sup>6</sup>', '…', '≈ 20'],
  ['10<sup>9</sup>', '…', '≈ 30'],
  ['10<sup>18</sup>', '…', '≈ 60']
])}
<p><b>Handy trick:</b> 2<sup>10</sup> = 1024 ≈ 10<sup>3</sup>. So every factor of 1000 adds about 10 halvings. That is why log₂ of even a gigantic number is tiny: log₂(10<sup>18</sup>) ≈ 60. <b>Logarithms grow painfully slowly</b> — the best friend of fast algorithms.</p>
<h4>Logs and binary</h4>
<p>Dividing by 2 (integer division) = shifting the binary number one place right and dropping the last bit:</p>
${H.bits(20, 5, { label: '20', hl: { 0: 'r' } })}
${H.bits(10, 5, { label: '20 / 2 = 10', hl: { 0: 'r' } })}
${H.bits(5, 5, { label: '10 / 2 = 5' })}
<p>So the halving count is "number of bits − 1": N has <b>⌊log₂ N⌋ + 1 bits</b>. In Java: <code>63 - Long.numberOfLeadingZeros(n)</code> gives ⌊log₂ n⌋ instantly.</p>
<h4>Other bases and digits</h4>
<ul>
<li>log₁₀ N = number of times you can divide by 10 → N has <b>⌊log₁₀ N⌋ + 1 digits</b> (4096 → 4 digits).</li>
<li>Changing the base only multiplies by a constant (log₂ N ≈ 3.32 × log₁₀ N), so in Big-O we just write <b>O(log N)</b>.</li>
<li>Useful rules: log(a·b) = log a + log b; log(a<sup>k</sup>) = k·log a. Example: log₂(N<sup>2</sup>) = 2·log₂ N, still O(log N).</li>
</ul>
<p><b>Where log N appears:</b> binary search, balanced BST / heap height, fast exponentiation (square the base, halve the exponent), loops with <code>i *= 2</code> or <code>n /= 2</code>, merge sort depth.</p>`,
    clues: [
      '"Sorted array", "find the first/last position", "minimum X such that…" → the search space can be halved → O(log N).',
      'Loop updates like <code>i *= 2</code>, <code>n /= 2</code>, <code>n &gt;&gt;= 1</code> → that loop runs about log₂ N times.',
      '<b>N ≤ 10<sup>18</sup></b> → only O(log N) or O(1) survives; log₂(10<sup>18</sup>) ≈ 60 steps.',
      '"How many digits / bits does N have?" → ⌊log₁₀ N⌋ + 1 / ⌊log₂ N⌋ + 1 (but compute with integers, not doubles).',
      '"Power of two", "how many times can you fold/split/halve", "rounds of a knockout tournament" → log₂.',
      '"Compute a<sup>b</sup> mod M with b up to 10<sup>18</sup>" → repeated squaring, O(log b).'
    ],
    code: `
class Logs {
    // floor(log2 n) by repeated halving: O(log n)
    static int log2Floor(long n) {
        int steps = 0;
        while (n > 1) {
            n /= 2;        // throw away half
            steps++;
        }
        return steps;
    }

    // number of decimal digits by repeated division by 10: O(log10 n)
    static int digits(long n) {
        if (n == 0) return 1;
        int d = 0;
        while (n > 0) {
            n /= 10;
            d++;
        }
        return d;
    }

    public static void main(String[] args) {
        System.out.println(log2Floor(100));                              // 6
        System.out.println(63 - Long.numberOfLeadingZeros(100L));        // 6 (bit trick)
        System.out.println(log2Floor(1000000000000000000L));             // 59
        System.out.println(digits(4096));                                // 4
    }
}`,
    codeTitle: 'log₂ and digit count with integers only',
    viz: {
      title: 'Halving N until 1 (log₂ N steps)',
      input: '100',
      inputLabel: 'N (1 to 1000000000)',
      gen: function (input) {
        var n = parseOneInt(input, 1, 1000000000, 100);
        var width = Math.max(4, n.toString(2).length);
        var frames = [], vals = [n], cur = n, steps = 0;
        frames.push({
          narr: 'Start with N = <b>' + n + '</b>. In binary it has ' + n.toString(2).length + ' bits. We will divide by 2 (dropping any remainder) until only 1 is left, and count the divisions.',
          parts: [
            { type: 'bars', label: 'value after each halving', values: vals.slice(), hl: { 0: 'cur' }, idxLabels: ['start'] },
            { type: 'bits', label: 'binary of current value', value: cur, width: width },
            { type: 'vars', vals: { current: cur, steps: 0 } }
          ]
        });
        while (cur > 1) {
          var lost = cur % 2;
          var next = Math.floor(cur / 2);
          var hlB = {}; hlB[0] = lost ? 'bad' : 'cur';
          frames.push({
            narr: 'Halve ' + cur + ': ' + cur + ' / 2 = <b>' + next + '</b>' + (lost ? ' (remainder 1 is thrown away — the last bit was 1)' : ' (exact — the last bit was 0)') + '. In binary this is a <b>right shift</b>: the rightmost bit falls off.',
            parts: [
              { type: 'bars', label: 'value after each halving', values: vals.slice(), hl: (function () { var h = {}; h[vals.length - 1] = 'cur'; return h; })(), idxLabels: vals.map(function (_, k) { return k === 0 ? 'start' : 's' + k; }) },
              { type: 'bits', label: 'binary of ' + cur + ' (red bit falls off)', value: cur, width: width, hl: hlB },
              { type: 'vars', vals: { current: cur, steps: steps } }
            ]
          });
          cur = next;
          steps++;
          vals.push(cur);
          frames.push({
            narr: 'Now the value is <b>' + cur + '</b> after <b>' + steps + '</b> halving' + (steps === 1 ? '' : 's') + '.' + (cur === 1 ? ' We reached 1 — stop.' : ' Still bigger than 1, keep going.'),
            parts: [
              { type: 'bars', label: 'value after each halving', values: vals.slice(), hl: (function () { var h = {}; h[vals.length - 1] = cur === 1 ? 'sel' : 'ok'; return h; })(), idxLabels: vals.map(function (_, k) { return k === 0 ? 'start' : 's' + k; }) },
              { type: 'bits', label: 'binary of current value', value: cur, width: width },
              { type: 'vars', vals: { current: cur, steps: steps }, hl: { steps: 'ok' } }
            ]
          });
        }
        frames.push({
          narr: 'Total halvings = <b>' + steps + '</b> = ⌊log₂ ' + n + '⌋. It equals (number of bits) − 1 = ' + n.toString(2).length + ' − 1. Even for N = 10<sup>9</sup> this is only 29 steps — that is the power of O(log N).',
          parts: [
            { type: 'bars', label: 'the whole halving chain', values: vals.slice(), hl: (function () { var h = {}; h[vals.length - 1] = 'sel'; return h; })(), idxLabels: vals.map(function (_, k) { return k === 0 ? 'start' : 's' + k; }) },
            { type: 'vars', vals: { N: n, 'floor(log2 N)': steps, bits: n.toString(2).length }, hl: { 'floor(log2 N)': 'sel' } }
          ]
        });
        if (frames.length < 4) {
          frames.splice(1, 0, {
            narr: 'N = 1 is already a single item, so there is nothing to halve: log₂ 1 = 0 because 2<sup>0</sup> = 1. Try N = 100 to see a real chain.',
            parts: [{ type: 'vars', vals: { N: n, steps: 0 } }]
          }, {
            narr: 'Remember: log₂ answers "2 to the power WHAT gives N?" For N = 1 the answer is 0.',
            parts: [{ type: 'bits', label: 'N in binary', value: n, width: width }]
          });
        }
        return frames;
      }
    },
    examples: [
      {
        title: 'Binary search on a million items needs at most 20 looks',
        html: `<p>Each comparison throws away half of what is left: 10<sup>6</sup> → 5·10<sup>5</sup> → … → 1 takes ⌈log₂ 10<sup>6</sup>⌉ = <b>20</b> steps. A linear scan could need 10<sup>6</sup> looks. Doubling the array to 2·10<sup>6</sup> adds just <b>one</b> more look — that is what "logarithmic" feels like.</p>
${H.table(['N', 'linear scan (worst)', 'binary search (worst)'], [['1,000', '1,000', '10'], ['10<sup>6</sup>', '10<sup>6</sup>', '20'], ['10<sup>9</sup>', '10<sup>9</sup>', H.c('g', '30')]])}`
      },
      {
        title: 'Counting digits: the floating-point trap',
        html: `<p>Digits of N = ⌊log₁₀ N⌋ + 1. Tempting code: <code>(int) Math.log10(n) + 1</code>. For n = 999,999,999,999,999,999 (18 nines, 18 digits) the <code>long</code> → <code>double</code> conversion rounds n up to exactly 10<sup>18</sup>, so <code>Math.log10</code> returns 18.0 and the code prints ${H.c('r', '19')}. The integer loop (divide by 10 until 0) prints the correct ${H.c('g', '18')}.</p>`,
        code: `long n = 999_999_999_999_999_999L;
System.out.println((int) Math.log10(n) + 1);   // 19  (wrong: double rounding)
int d = 0;
for (long x = n; x > 0; x /= 10) d++;
System.out.println(d);                         // 18  (correct)`
      },
      {
        title: 'Fast power: 3^13 in 4 squarings',
        html: `<p>13 in binary is ${H.bits(13, 4, { hl: { 0: 'g', 2: 'g', 3: 'g' } })} = 8 + 4 + 1. So 3<sup>13</sup> = 3<sup>8</sup>·3<sup>4</sup>·3<sup>1</sup>. Square the base each step (3, 9, 81, 6561) and multiply in the powers whose bit is 1. The exponent halves every step → ⌊log₂ 13⌋ + 1 = <b>4</b> rounds instead of 12 multiplications. For an exponent of 10<sup>18</sup>: about 60 rounds.</p>`,
        code: `long power(long base, long exp) {
    long result = 1;
    while (exp > 0) {
        if ((exp & 1) == 1) result *= base; // this bit is 1: use the current square
        base *= base;                       // 3, 9, 81, 6561 ...
        exp >>= 1;                          // halve the exponent -> O(log exp) rounds
    }
    return result;                          // power(3, 13) = 1594323
}`
      },
      {
        title: 'Knock-out tournament rounds',
        html: `<p>64 teams: 64 → 32 → 16 → 8 → 4 → 2 → 1 is <b>6</b> rounds = log₂ 64. With 100 teams some get a "bye", and the number of rounds is ⌈log₂ 100⌉ = <b>7</b> (because 2<sup>6</sup> = 64 &lt; 100 ≤ 128 = 2<sup>7</sup>). Notice floor vs ceiling: "how many times can I halve" uses ⌊ ⌋, "how many rounds to get everyone down to 1 winner" uses ⌈ ⌉.</p>`
      }
    ],
    deepDive: `<p><b>Floor or ceiling?</b> ⌊log₂ N⌋ = halvings until you reach 1 = (bit length − 1). ⌈log₂ N⌉ = doublings from 1 to reach at least N = depth of a balanced tree with N leaves. They differ by 1 unless N is a power of two. In Java: <code>63 - Long.numberOfLeadingZeros(n)</code> is the floor; <code>64 - Long.numberOfLeadingZeros(n - 1)</code> is the ceiling (for n ≥ 1). Both compile to a single CPU instruction (LZCNT) — the JIT treats them as intrinsics.</p>
<p><b>Base does not matter … until it is in an exponent.</b> log₂ N = log₁₀ N / log₁₀ 2 ≈ 3.32·log₁₀ N — a constant factor, so O(log₂ N) = O(log₁₀ N) = O(log N). But 2<sup>log₂ N</sup> = N while 4<sup>log₂ N</sup> = N<sup>2</sup>: a constant factor inside an exponent changes the class.</p>
<p><b>Where logs hide.</b> log(N!) = log 1 + log 2 + … + log N = Θ(N log N) (Stirling). Since there are N! possible orders of an array and each comparison gives one yes/no bit, any comparison sort needs ≥ log₂(N!) comparisons → the famous <b>Ω(N log N) lower bound</b>. Smaller still: log log N (Sieve's N log log N; van Emde Boas trees) and the inverse Ackermann α(N) ≤ 4 in union-find.</p>
<p><b>Floating point.</b> A <code>double</code> has 53 bits of mantissa (~15.9 decimal digits). Any <code>long</code> above 2<sup>53</sup> may round when converted, so <code>Math.log</code>, <code>Math.log10</code>, <code>Math.sqrt</code> and <code>Math.pow</code> can be off by one near powers. Production rule: compute with doubles if you like, then <b>correct with integer checks</b> (e.g. while (r·r &gt; n) r--).</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants know log identities and will tell you "binary search is O(log N)" instantly. The value you add is <i>noticing</i> that a problem can be halved at all — "minimise the maximum load", "first day the bouquet is ready" — which is a recognition skill, not a recall skill.</p>
<p><b>Use AI as a partner:</b> ask it to <code>generate 20 boundary inputs for a floor(log2 n) function: powers of two, powers of two minus one, 1, Long.MAX_VALUE</code>, then run your function against <code>63 - Long.numberOfLeadingZeros</code>. That pattern — AI writes the test oracle and edge cases, you write and check the logic — is how strong engineers use these tools.</p>
<p><b>Where AI goes wrong:</b> generated code very often uses <code>Math.log(n)/Math.log(2)</code> or <code>Math.sqrt</code> on large <code>long</code>s, which passes small tests and fails at 10<sup>18</sup>. <b>What you must own:</b> the habit of asking "is this exact for every input in the constraints?"</p>`,
    problems: [
      {
        title: 'How Many Times Can You Halve N?',
        level: 'Easy',
        tags: ['logarithm', 'halving', 'bits'],
        statement: `<p>You have a stack of <code>N</code> pages. In one move you tear the stack in half and keep only one half (if N is odd, the kept half has ⌊N/2⌋ pages). How many moves until exactly <b>1</b> page remains? In other words, return <b>⌊log₂ N⌋</b>.</p>`,
        constraints: `1 ≤ N ≤ 10<sup>18</sup> (use <code>long</code>)`,
        example: `<p>Input: <b>N = 100</b></p>
${H.table(['move', 'pages before', 'pages after'], [['1', '100', '50'], ['2', '50', '25'], ['3', '25', H.c('y', '12 (half of 25, rounded down)')], ['4', '12', '6'], ['5', '6', '3'], ['6', '3', H.c('g', '1')]])}
<p>Output: ${H.c('p', '<b>6</b>')} — and indeed 2<sup>6</sup> = 64 ≤ 100 &lt; 128 = 2<sup>7</sup>.</p>`,
        brute: {
          why: `<p>The tempting "one-liner" <code>(int)(Math.log(n) / Math.log(2))</code> looks O(1) but is <b>wrong</b> for big inputs: a <code>double</code> holds only ~15–16 significant digits. For N = 2<sup>60</sup> − 1 the conversion to double rounds up to 2<sup>60</sup>, giving 60 instead of 59. A brute force that literally removes pages one at a time would be O(N) = 10<sup>18</sup> steps. Integer halving is both exact and fast.</p>`,
          code: `
int bruteWithDoubles(long n) {
    // Looks clever, but floating point rounding can be off by one for large n
    return (int) (Math.log(n) / Math.log(2));
}`
        },
        mcq: {
          q: 'N = 10<sup>18</sup>. Roughly how many halvings until we reach 1?',
          options: ['About 18', 'About 60', 'About 1000', 'About 10<sup>9</sup>'],
          answer: 1,
          explain: '2<sup>10</sup> ≈ 10<sup>3</sup>, so 10<sup>18</sup> = (10<sup>3</sup>)<sup>6</sup> ≈ (2<sup>10</sup>)<sup>6</sup> = 2<sup>60</sup>. About 60 halvings (exactly 59 because 2<sup>60</sup> is slightly more than 10<sup>18</sup>).'
        },
        hints: [
          `<p>Each move is <code>N = N / 2</code>. Counting the moves until N becomes 1 is literally the definition of ⌊log₂ N⌋. Also: it equals the number of binary digits minus 1.</p>`,
          `<p>Just a counter and a <code>while (n &gt; 1)</code> loop. Optional O(1) version: <code>63 - Long.numberOfLeadingZeros(n)</code> (the position of the highest 1-bit).</p>`,
          `<p>Traps: N = 1 → answer 0 (loop never runs); use <code>long</code> because N goes up to 10<sup>18</sup>; avoid <code>Math.log</code> (precision). Recipe: steps = 0; while n &gt; 1 { n /= 2; steps++; } return steps.</p>`
        ],
        solution: {
          approach: `<p>Simulate the halving with integers; it takes only ~60 iterations at most.</p>`,
          code: `
class Solution {
    int halvings(long n) {
        int steps = 0;
        while (n > 1) {      // stop when one page is left
            n /= 2;          // keep half (integer division rounds down)
            steps++;         // one more tear
        }
        return steps;        // equals floor(log2 n)
    }

    // Same answer in O(1) using the highest set bit
    int halvingsFast(long n) {
        return 63 - Long.numberOfLeadingZeros(n);
    }

    public static void main(String[] args) {
        Solution s = new Solution();
        System.out.println(s.halvings(100));                    // 6
        System.out.println(s.halvingsFast(100));                // 6
        System.out.println(s.halvings((1L << 60) - 1));         // 59 (doubles would say 60)
    }
}`,
          dry: {
            head: ['loop check n &gt; 1?', 'n before', 'n after n /= 2', 'steps'],
            rows: [
              ['yes', '100', '50', '1'],
              ['yes', '50', '25', '2'],
              ['yes', '25', '12', '3'],
              ['yes', '12', '6', '4'],
              ['yes', '6', '3', '5'],
              ['yes', '3', '1', '6'],
              ['no (n = 1)', '1', '—', H.c('p', 'return 6')]
            ]
          },
          complexity: `<p><b>Time O(log N)</b>: n halves every iteration, so the loop runs ⌊log₂ N⌋ ≤ 59 times for N ≤ 10<sup>18</sup>. <b>Space O(1)</b>. The bit-trick version is O(1).</p>`
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 4 — Big-O, Big-Omega, Big-Theta
  // =====================================================================
  topics.push({
    title: 'Big-O, Ω (Omega), Θ (Theta) in Plain English',
    analogy: `<p>A courier company makes three kinds of promises about delivery:</p>
<ul>
<li>"Your parcel arrives <b>within 5 days</b>." — it could come sooner, but never later. That is <b>Big-O</b>: an <b>upper limit</b> (worst it can get).</li>
<li>"It takes <b>at least 1 day</b>." — it can never be faster than that. That is <b>Ω (Omega)</b>: a <b>lower limit</b>.</li>
<li>"It takes <b>about 3 days</b>, give or take." — both limits squeeze the same answer. That is <b>Θ (Theta)</b>: a <b>tight</b> description.</li>
</ul>
<p>And just like nobody cares whether delivery takes 3 days or 3 days + 10 minutes, Big-O ignores small extra bits and constant multipliers — it only cares about <b>how the time grows when the input gets huge</b>.</p>`,
    explain: `<h4>Big-O counts growth, not seconds</h4>
<p>Say an algorithm does <code>3N<sup>2</sup> + 5N + 100</code> steps. Look what happens as N grows:</p>
${H.table(['N', '3N<sup>2</sup>', '5N', '100', 'share of 3N<sup>2</sup>'], [
  ['10', '300', '50', '100', '67%'],
  ['100', '30,000', '500', '100', '98%'],
  ['10,000', '300,000,000', '50,000', '100', H.c('g', '99.98%')]
])}
<p>For big N the N<sup>2</sup> part is <b>all that matters</b>. So we (1) <b>drop smaller terms</b> and (2) <b>drop constant multipliers</b> → <b>O(N<sup>2</sup>)</b>. Constants depend on the machine; growth does not.</p>
<h4>The three symbols</h4>
${H.table(['Symbol', 'Plain meaning', 'Everyday version', 'Example: linear search in N items'], [
  ['<b>O(f)</b>', 'grows <b>no faster</b> than f', '"at most"', 'O(N) — never worse than checking all N'],
  ['<b>Ω(f)</b>', 'grows <b>no slower</b> than f', '"at least"', 'Ω(1) — might find it at the first item'],
  ['<b>Θ(f)</b>', 'grows <b>exactly like</b> f (both bounds)', '"about"', 'worst case is Θ(N)']
])}
<p><b>Do not mix up</b> "O / Ω / Θ" with "worst / best / average case". Cases describe <i>which input</i> you feed in; the symbols describe <i>how tightly</i> you bound the cost. In interviews, "the complexity" almost always means the <b>worst-case Big-O</b>, and people usually say O when they mean the tight Θ.</p>
<h4>The growth ladder (slowest-growing first)</h4>
<p>${H.c('g', 'O(1)')} &lt; ${H.c('g', 'O(log N)')} &lt; ${H.c('g', 'O(√N)')} &lt; ${H.c('b', 'O(N)')} &lt; ${H.c('b', 'O(N log N)')} &lt; ${H.c('y', 'O(N<sup>2</sup>)')} &lt; ${H.c('y', 'O(N<sup>3</sup>)')} &lt; ${H.c('r', 'O(2<sup>N</sup>)')} &lt; ${H.c('r', 'O(N!)')}</p>
${H.table(['N', 'log₂ N', 'N log₂ N', 'N<sup>2</sup>', '2<sup>N</sup>'], [
  ['10', '3', '33', '100', '1,024'],
  ['20', '4', '86', '400', '≈ 10<sup>6</sup>'],
  ['1,000', '10', '10<sup>4</sup>', '10<sup>6</sup>', H.c('r', '≈ 10<sup>301</sup>')],
  ['10<sup>6</sup>', '20', '2·10<sup>7</sup>', H.c('r', '10<sup>12</sup>'), H.c('r', 'impossible')]
])}
<h4>Rules of thumb for reading code</h4>
<ul>
<li><b>Sequential</b> blocks add, keep the biggest: O(N) + O(N<sup>2</sup>) = O(N<sup>2</sup>).</li>
<li><b>Nested</b> loops multiply: N outer × log N inner = O(N log N).</li>
<li><b>Two different inputs</b> keep both names: loop over N then over M = O(N + M); nested = O(N · M). Do not call it O(N<sup>2</sup>).</li>
<li>Library calls are not free: <code>Arrays.sort</code> is O(N log N), <code>list.contains</code> is O(N), <code>HashSet.contains</code> is O(1) on average, <code>String +</code> inside a loop can be O(N<sup>2</sup>).</li>
</ul>`,
    clues: [
      '"What is the time complexity of this code?" → find the innermost repeated work, count it, drop constants and smaller terms.',
      'Expressions like <code>N<sup>2</sup>/2</code>, <code>3N + 7</code>, <code>N + log N</code> → simplify to O(N<sup>2</sup>), O(N), O(N).',
      '"Best case / worst case" in the question → think about which input makes the loop stop earliest (Ω) or latest (O).',
      'Two arrays of sizes N and M → answer must use both letters: O(N + M) or O(N·M).',
      '"Can you do better than O(N<sup>2</sup>)?" → the interviewer wants the next rung down the ladder: O(N log N) (sort) or O(N) (hashing / two pointers).'
    ],
    code: `
class GrowthExamples {
    // O(1): same work for any n
    static int first(int[] a) { return a[0]; }

    // O(N): one pass
    static long sum(int[] a) {
        long s = 0;
        for (int x : a) s += x;
        return s;
    }

    // O(N^2): every pair (i, j) with i < j  ->  N(N-1)/2 comparisons
    static int countEqualPairs(int[] a) {
        int c = 0;
        for (int i = 0; i < a.length; i++)
            for (int j = i + 1; j < a.length; j++)
                if (a[i] == a[j]) c++;
        return c;
    }

    // O(N + M): two different inputs, one after the other
    static long sumBoth(int[] a, int[] b) {
        return sum(a) + sum(b);
    }

    // O(log N): the range halves every step (binary search)
    static boolean contains(int[] sorted, int target) {
        int lo = 0, hi = sorted.length - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (sorted[mid] == target) return true;
            if (sorted[mid] < target) lo = mid + 1; else hi = mid - 1;
        }
        return false;
    }
}`,
    codeTitle: 'One method for each common growth rate',
    viz: {
      title: 'Growth-rate race: how many operations for each N?',
      input: '1 10 20 100 1000 100000 1000000000',
      inputLabel: 'list of N values (up to 8, each 1 to 10^18)',
      gen: function (input) {
        var raw = String(input === undefined ? '' : input).trim().split(/[\s,]+/);
        if (!raw.length || raw.some(function (s) { return !/^\d+$/.test(s); })) throw new Error('Enter up to 8 positive whole numbers separated by spaces, e.g. "10 100 1000".');
        var Ns = raw.map(Number);
        if (Ns.length > 8) throw new Error('Please give at most 8 values of N.');
        if (Ns.some(function (v) { return v < 1 || v > 1e18; })) throw new Error('Each N must be between 1 and 10^18.');
        var names = ['log N', '√N', 'N', 'N log N', 'N²', 'N³', '2^N', 'N!'];
        function log10fact(n) {
          if (n <= 2000) { var s = 0; for (var i = 2; i <= n; i++) s += Math.log10(i); return s; }
          return n * Math.log10(n) - n * Math.LOG10E + 0.5 * Math.log10(2 * Math.PI * n);
        }
        function logs(n) {
          var l = Math.log10(n), lg2 = Math.max(1, Math.log2(n));
          return [Math.log10(lg2), 0.5 * l, l, l + Math.log10(lg2), 2 * l, 3 * l, n * Math.log10(2), log10fact(n)];
        }
        function fmt(L) {
          if (L < 6) return String(Math.round(Math.pow(10, L)));
          var e = Math.floor(L), m = Math.pow(10, L - e);
          if (m >= 9.95) { m = 1; e++; }
          return m.toFixed(1) + 'e' + e;
        }
        var frames = [];
        frames.push({
          narr: 'Each bar is one growth rate. Bar height = <b>number of digits</b> of the operation count (log scale, capped at 30), because the real numbers are too big to draw. ' + H.c('g', 'Green') + ' = at most 10<sup>8</sup> operations (≈ 1 second). ' + H.c('r', 'Red') + ' = too slow.',
          parts: [
            { type: 'bars', label: 'growth rates', values: [1, 1, 1, 1, 1, 1, 1, 1], texts: names.map(function () { return '?'; }), idxLabels: names },
            { type: 'text', html: 'Press next to try N = ' + Ns.join(', ') + '.' }
          ]
        });
        Ns.forEach(function (n) {
          var L = logs(n), hl = {}, okCount = 0, firstBad = -1;
          L.forEach(function (x, k) {
            if (x <= 8 + 1e-9) { hl[k] = 'ok'; okCount++; } else { hl[k] = 'bad'; if (firstBad < 0) firstBad = k; }
          });
          var vals = L.map(function (x) { return Math.min(30, Math.round(x * 10) / 10); });
          var texts = L.map(fmt);
          var narr = 'N = <b>' + n + '</b>: N log N ≈ ' + texts[3] + ', N² ≈ ' + texts[4] + ', 2^N ≈ ' + texts[6] + '. ';
          if (firstBad < 0) narr += 'Everything fits — for tiny N even N! is fine.';
          else narr += 'The first rate that is too slow is <b>' + names[firstBad] + '</b>, so the fastest-growing allowed one is <b>' + (firstBad > 0 ? names[firstBad - 1] : 'none') + '</b>.';
          frames.push({
            narr: narr,
            parts: [
              { type: 'bars', label: 'digits of the operation count (N = ' + n + ')', values: vals, texts: texts, idxLabels: names, hl: hl },
              { type: 'vars', vals: { N: n, 'rates that fit in 1 s': okCount + ' of 8' }, hl: { 'rates that fit in 1 s': okCount > 4 ? 'ok' : 'bad' } }
            ]
          });
        });
        frames.push({
          narr: 'Big picture: as N grows, the right-hand bars explode first. log N barely moves (≈ 60 even for 10<sup>18</sup>), while 2<sup>N</sup> and N! are only usable for N around 20 and 10. This is why picking the right growth rate matters far more than micro-optimising constants.',
          parts: [
            { type: 'bars', label: 'growth ladder (N = ' + Ns[Ns.length - 1] + ')', values: logs(Ns[Ns.length - 1]).map(function (x) { return Math.min(30, Math.round(x * 10) / 10); }), texts: logs(Ns[Ns.length - 1]).map(fmt), idxLabels: names, hl: { 0: 'ok', 7: 'bad' } },
            { type: 'text', html: 'O(1) &lt; O(log N) &lt; O(√N) &lt; O(N) &lt; O(N log N) &lt; O(N<sup>2</sup>) &lt; O(N<sup>3</sup>) &lt; O(2<sup>N</sup>) &lt; O(N!)' }
          ]
        });
        if (frames.length < 4) {
          frames.splice(1, 0, {
            narr: 'Tip: give several N values (e.g. "10 1000 1000000") to watch the race between growth rates.',
            parts: [{ type: 'text', html: 'Bars compare operation counts on a log scale.' }]
          });
        }
        return frames;
      }
    },
    examples: [
      {
        title: 'Simplify step by step',
        html: `${H.table(['Raw count', 'drop smaller terms', 'drop constants', 'answer'], [
  ['5N<sup>2</sup> + 3N log N + 1000', '5N<sup>2</sup>', 'N<sup>2</sup>', H.c('y', 'O(N<sup>2</sup>)')],
  ['N/2 + log N', 'N/2', 'N', H.c('b', 'O(N)')],
  ['2<sup>N</sup> + N<sup>10</sup>', '2<sup>N</sup>', '2<sup>N</sup>', H.c('r', 'O(2<sup>N</sup>)')],
  ['N log N + N√N', 'N√N (√N beats log N)', 'N<sup>1.5</sup>', H.c('y', 'O(N<sup>1.5</sup>)')],
  ['42', '42', '1', H.c('g', 'O(1)')]
])}<p>Exponentials beat any polynomial eventually (2<sup>N</sup> passes N<sup>10</sup> around N = 59), and any power of N beats any power of log N.</p>`
      },
      {
        title: 'Two inputs: O(N + M) vs O(N · M)',
        html: `<p>Comparing a list of N = 10<sup>5</sup> orders with a list of M = 10 coupons:</p>
<ul><li>Put the coupons in a HashSet, then scan the orders: O(N + M) ≈ 10<sup>5</sup>.</li>
<li>For every order, scan all coupons: O(N · M) = 10<sup>6</sup> — fine here because M is tiny!</li></ul>
<p>Calling the second one "O(N<sup>2</sup>)" would be wrong and would hide that it is actually cheap. Always name each input separately.</p>`
      },
      {
        title: 'Hidden O(N²): String += in a loop',
        html: `<p>Java strings are immutable, so <code>s += c</code> copies the whole string each time: 1 + 2 + … + N characters copied = N(N+1)/2 → ${H.c('r', 'O(N<sup>2</sup>)')}. <code>StringBuilder.append</code> writes into a growing buffer (doubling, amortised O(1)) → ${H.c('g', 'O(N)')}. For N = 10<sup>5</sup> that is 5·10<sup>9</sup> char copies vs 10<sup>5</sup>.</p>`,
        code: `int n = 100_000;
StringBuilder sb = new StringBuilder();
for (int i = 0; i < n; i++) sb.append('a');   // O(N) total
String s = sb.toString();
System.out.println(s.length());               // 100000`
      },
      {
        title: 'Best, worst and average are separate questions',
        html: `<p>Insertion sort: on an already-sorted array each new element is compared once → <b>best case Θ(N)</b>. On a reversed array element i shifts past all i earlier ones → 0 + 1 + … + (N−1) → <b>worst case Θ(N<sup>2</sup>)</b>. On random input each element shifts past about half → N<sup>2</sup>/4 → <b>average Θ(N<sup>2</sup>)</b>. So "insertion sort is O(N<sup>2</sup>)" is true, "insertion sort is Ω(N)" is true, and "insertion sort is Θ(N<sup>2</sup>) in the worst case" is the precise statement.</p>`
      }
    ],
    deepDive: `<p><b>Formal definitions with numbers.</b> f(N) = O(g(N)) means: there exist constants c &gt; 0 and N₀ such that f(N) ≤ c·g(N) for every N ≥ N₀. Example: 3N<sup>2</sup> + 5N + 100 ≤ 4N<sup>2</sup> exactly when N<sup>2</sup> ≥ 5N + 100, which holds from N₀ = 13 (169 ≥ 165). So it is O(N<sup>2</sup>) with c = 4, N₀ = 13. Ω flips the inequality (f ≥ c·g), and Θ means both hold. Little-o (f = o(g)) means f grows <i>strictly</i> slower: N = o(N<sup>2</sup>), but N<sup>2</sup> ≠ o(N<sup>2</sup>).</p>
<p><b>Average vs expected vs amortised.</b> <i>Average case</i> averages over random inputs. <i>Expected</i> time averages over the algorithm's own coin flips on the worst input (randomised quicksort: expected O(N log N) for every input). <i>Amortised</i> is a guarantee about a whole sequence of operations (N ArrayList pushes cost O(N) total, even though one push can cost O(N)).</p>
<p><b>Input size is measured in bits.</b> Checking primality by trial division is O(√N) — "polynomial" in the value N, but N has only ~log₂ N bits, so it is <b>exponential in the input length</b>. Same story for 0/1-knapsack's O(N·W): it is <i>pseudo-polynomial</i> because W is a number, not a count.</p>
<p><b>Constants still matter in production.</b> Big-O ignores cache misses, allocation, boxing and branch prediction. A cache-friendly O(N log N) sort of an <code>int[]</code> can beat an O(N) algorithm that hops through a <code>HashMap&lt;Integer,Integer&gt;</code> for realistic N. Big-O tells you how things <i>scale</i>; profiling tells you how fast they <i>are</i>.</p>`,
    aiEra: `<p><b>What AI changes:</b> asking "what is the complexity of this function?" is now a one-click action in every IDE, and the answer is right for most straightforward code. Interviews have adapted: instead of "state the Big-O" they ask you to <b>justify</b> it, compare alternatives, and explain what happens at N = 10<sup>7</sup>.</p>
<p><b>Use AI as a partner:</b> ask for <code>the hidden costs in this function (library calls, string building, boxing)</code> — models are good at listing that <code>list.remove(0)</code> is O(N) or that <code>contains</code> on an ArrayList is linear. Then ask it to generate a scaling benchmark (N = 10<sup>3</sup>, 10<sup>4</sup>, 10<sup>5</sup>) and check that the times grow the way your Big-O predicts.</p>
<p><b>Where AI goes wrong:</b> mixing up N and M, calling amortised costs "worst case", quoting O(1) for hash maps without the "average" caveat, and ignoring the cost of sorting inside a loop. <b>What you must own:</b> the reasoning chain — count, simplify, name each input, separate best/worst/amortised.</p>`,
    problems: [
      {
        title: 'Contains Duplicate: O(N²) → O(N log N) → O(N)',
        level: 'Easy',
        tags: ['big-o', 'hashset', 'sorting'],
        statement: `<p>Given an integer array <code>A</code> of size <code>N</code>, return <code>true</code> if some value appears <b>at least twice</b>, else <code>false</code>. Then explain the Big-O of three different approaches.</p>`,
        constraints: `1 ≤ N ≤ 10<sup>5</sup>, −10<sup>9</sup> ≤ A[i] ≤ 10<sup>9</sup>`,
        example: `${H.arr([3, 1, 4, 1, 5], { hl: { 1: 'r', 3: 'r' } })}<p>Output: ${H.c('p', '<b>true</b>')} — the value ${H.c('r', '1')} appears at index 1 and index 3.</p>
${H.arr([7, 2, 9], {})}<p>Output: <b>false</b> — all values are different.</p>`,
        brute: {
          why: `<p>Compare every pair (i, j) with i &lt; j: N(N−1)/2 ≈ 5·10<sup>9</sup> comparisons for N = 10<sup>5</sup> → about 50 seconds → TLE. Wasted work: when we look at A[j], we re-scan all earlier elements instead of remembering them.</p>`,
          code: `
boolean brute(int[] a) {
    for (int i = 0; i < a.length; i++) {
        for (int j = i + 1; j < a.length; j++) {
            if (a[i] == a[j]) return true;   // found a repeated value
        }
    }
    return false;
}`
        },
        mcq: {
          q: 'The brute force does N(N−1)/2 comparisons in the worst case. What is its Big-O?',
          options: ['O(N)', 'O(N<sup>2</sup>)', 'O(N<sup>2</sup>/2)', 'O(log N)'],
          answer: 1,
          explain: 'N(N−1)/2 = N<sup>2</sup>/2 − N/2. Drop the smaller term (N/2) and the constant ½ → O(N<sup>2</sup>). "O(N<sup>2</sup>/2)" is the same class but is never written that way. Best case is Ω(1) when A[0] == A[1].'
        },
        hints: [
          `<p>The question "have I seen this value before?" is a memory question. If you remember every value you passed, each new value needs one lookup instead of a full re-scan.</p>`,
          `<p>Option A: <b>sort</b> the array (O(N log N)); equal values become neighbours → check A[i] == A[i−1]. Option B: a <code>HashSet&lt;Integer&gt;</code> of seen values — <code>add()</code> returns <code>false</code> if the value was already there → O(N) average.</p>`,
          `<p>Traps: sorting changes the input order (copy it if the caller needs it); HashSet uses O(N) extra memory — the classic time-vs-space trade-off; N = 1 → always false. Recipe: seen = empty set; for each x: if !seen.add(x) return true; return false.</p>`
        ],
        solution: {
          approach: `<p>Remember values in a HashSet (O(N) time, O(N) space) — or sort and compare neighbours (O(N log N) time, O(1) extra space besides the sort).</p>`,
          code: `
import java.util.*;

class Solution {
    // O(N) average time, O(N) extra space
    public boolean containsDuplicate(int[] a) {
        Set<Integer> seen = new HashSet<>();
        for (int x : a) {
            if (!seen.add(x)) {   // add() returns false when x is already in the set
                return true;
            }
        }
        return false;
    }

    // O(N log N) time (the sort), no extra set
    public boolean containsDuplicateBySorting(int[] a) {
        int[] b = a.clone();      // do not disturb the caller's array
        Arrays.sort(b);           // equal values become neighbours
        for (int i = 1; i < b.length; i++) {
            if (b[i] == b[i - 1]) return true;
        }
        return false;
    }

    public static void main(String[] args) {
        Solution s = new Solution();
        System.out.println(s.containsDuplicate(new int[]{3, 1, 4, 1, 5}));          // true
        System.out.println(s.containsDuplicateBySorting(new int[]{7, 2, 9}));       // false
    }
}`,
          dry: {
            head: ['i', 'a[i]', 'set before', 'seen.add(a[i])', 'action'],
            rows: [
              ['0', '3', '{ }', 'true', 'store 3'],
              ['1', '1', '{3}', 'true', 'store 1'],
              ['2', '4', '{3, 1}', 'true', 'store 4'],
              ['3', '1', '{3, 1, 4}', H.c('r', 'false'), H.c('p', 'return true')]
            ]
          },
          complexity: `<p><b>Brute:</b> O(N<sup>2</sup>) time, O(1) space. <b>Sorting:</b> O(N log N) time (the sort dominates; the neighbour scan is O(N)), O(N) for the copy. <b>HashSet:</b> O(N) average time — each element is added once with O(1) average cost — and O(N) space for the set. Faster time paid for with more memory.</p>`
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 5 — Space complexity
  // =====================================================================
  topics.push({
    title: 'Space Complexity: How Much Extra Memory?',
    analogy: `<p>You are cooking in a small kitchen. The <b>ingredients</b> you were handed are the input — everybody has them. <b>Space complexity</b> asks: how many <b>extra bowls and plates</b> do you take out while cooking? One spoon for stirring = constant space. A separate bowl for every ingredient = space that grows with the number of ingredients.</p>
<p>Recursion is like a <b>stack of plates</b>: every time a function calls itself, a new plate (its local variables + where to return) goes on top, and it is only removed when that call finishes. A recursion 10<sup>5</sup> calls deep means 10<sup>5</sup> plates on the counter at the same time.</p>`,
    explain: `<p><b>Space complexity</b> = how the <b>extra memory</b> your algorithm uses grows with N. Usually we count only <b>auxiliary</b> space (memory beyond the input itself). If an interviewer says "O(1) extra space" or "in-place", they mean: no new arrays/maps that grow with N.</p>
${H.table(['What you create', 'Extra space'], [
  ['a few <code>int</code>/<code>long</code> variables, loop counters', H.c('g', 'O(1)')],
  ['<code>new int[N]</code>, a HashSet/HashMap of up to N items, a copy of the input', H.c('b', 'O(N)')],
  ['<code>new int[N][N]</code> (a DP table)', H.c('y', 'O(N<sup>2</sup>)')],
  ['recursion that goes <b>d</b> calls deep', H.c('y', 'O(d) — call stack')],
  ['recursion of depth log N (binary search, balanced tree)', H.c('g', 'O(log N)')]
])}
<h4>How big is "too big"? (typical limit 256 MB)</h4>
${H.table(['Type', 'bytes each', 'how many fit in 256 MB'], [
  ['<code>boolean</code> / <code>byte</code>', '1', '≈ 2.5·10<sup>8</sup>'],
  ['<code>int</code>', '4', '≈ 6·10<sup>7</sup>'],
  ['<code>long</code> / <code>double</code>', '8', '≈ 3·10<sup>7</sup>'],
  ['<code>Integer</code> in an ArrayList', '≈ 20 (16-byte object + 4-byte reference)', '≈ 1.3·10<sup>7</sup>'],
  ['<code>Integer</code> in a HashSet / HashMap key', '≈ 50–60 (object + node + table slot)', '≈ 4–5·10<sup>6</sup>']
])}
<p>Quick checks: <code>int[10<sup>6</sup>]</code> = 4 MB ✓. <code>int[10<sup>4</sup>][10<sup>4</sup>]</code> = 400 MB ✗ (MLE — Memory Limit Exceeded). <code>long[5000][5000]</code> = 200 MB, risky.</p>
<h4>The hidden cost: recursion depth</h4>
<p><code>sum(n) = n + sum(n − 1)</code> keeps n frames alive at once → O(n) space, even though it creates no arrays. Java's default stack overflows somewhere around 10<sup>4</sup>–10<sup>5</sup> frames (<code>StackOverflowError</code>). The loop version needs just one variable → O(1).</p>
<h4>Time vs space trade-off</h4>
<p>Many speed-ups <b>buy time with memory</b>: a HashSet makes "seen before?" O(1) but costs O(N) space; a prefix-sum array answers range sums in O(1) but costs O(N). Always state both.</p>`,
    clues: [
      '"Do it <b>in-place</b>" / "using O(1) extra space" / "without allocating another array" → only swap inside the input, use a few variables (two pointers).',
      '"Memory limit 256 MB" + a 2D table of N×N with N = 10<sup>5</sup> → 10<sup>10</sup> cells: impossible, look for a 1D/rolling solution.',
      'Deep recursion on N ≤ 10<sup>5</sup>–10<sup>6</sup> (linked list, skewed tree, DFS on a path graph) → risk of StackOverflowError; use an explicit stack or a loop.',
      '"Follow up: can you do it without extra memory?" → the interviewer accepts the time but wants auxiliary space cut to O(1).',
      'DP where row i only depends on row i−1 → keep two rows: O(N<sup>2</sup>) memory becomes O(N).'
    ],
    code: `
class SpaceExamples {
    // O(n) extra space: n stack frames alive at the deepest point
    static long sumRecursive(int n) {
        if (n == 0) return 0;              // base case: the plate pile stops growing
        return n + sumRecursive(n - 1);    // this frame waits for the inner call
    }

    // O(1) extra space: one running total, no matter how big n is
    static long sumLoop(int n) {
        long total = 0;
        for (int i = 1; i <= n; i++) total += i;
        return total;
    }

    // O(n) extra space: a brand-new array of size n
    static int[] prefixSums(int[] a) {
        int[] pf = new int[a.length];
        for (int i = 0; i < a.length; i++) pf[i] = (i == 0 ? 0 : pf[i - 1]) + a[i];
        return pf;
    }

    public static void main(String[] args) {
        System.out.println(sumRecursive(5));  // 15, but needed 6 frames at once
        System.out.println(sumLoop(5));       // 15, with one variable
    }
}`,
    codeTitle: 'Same answer, different memory',
    viz: {
      title: 'Recursion stack vs loop: where does the memory go?',
      input: '5',
      inputLabel: 'n (1 to 10)',
      gen: function (input) {
        var n = parseOneInt(input, 1, 10, 5);
        var frames = [], stack = [];
        frames.push({
          narr: 'We compute 1 + 2 + … + ' + n + ' two ways. First the recursive way: <code>sum(n) = n + sum(n−1)</code>, <code>sum(0) = 0</code>. Every call puts a frame (a "plate") on the call stack.',
          parts: [{ type: 'stack', label: 'call stack', items: [] }, { type: 'vars', vals: { 'frames alive': 0, 'max frames': 0 } }]
        });
        var maxF = 0;
        for (var k = n; k >= 0; k--) {
          stack.push('sum(' + k + ')');
          maxF = Math.max(maxF, stack.length);
          var hl = {}; hl[stack.length - 1] = 'cur';
          frames.push({
            narr: 'Call <b>sum(' + k + ')</b>. ' + (k > 0 ? 'It cannot finish yet — it must wait for sum(' + (k - 1) + '), so its frame stays on the stack.' : 'Base case! sum(0) = 0 returns immediately.') + ' Frames alive: ' + stack.length + '.',
            parts: [{ type: 'stack', label: 'call stack', items: stack.slice(), hl: hl }, { type: 'vars', vals: { 'frames alive': stack.length, 'max frames': maxF }, hl: { 'frames alive': 'cur' } }]
          });
        }
        var ret = 0;
        stack.pop();
        for (var m = 1; m <= n; m++) {
          ret += m;
          stack.pop();
          frames.push({
            narr: 'sum(' + m + ') gets back ' + (ret - m) + ', returns ' + m + ' + ' + (ret - m) + ' = <b>' + ret + '</b>, and its frame is removed.',
            parts: [{ type: 'stack', label: 'call stack', items: stack.slice(), hl: stack.length ? (function () { var h = {}; h[stack.length - 1] = 'cur'; return h; })() : {} }, { type: 'vars', vals: { returned: ret, 'frames alive': stack.length, 'max frames': maxF }, hl: { returned: 'ok' } }]
          });
        }
        frames.push({
          narr: 'Recursive answer = ' + ret + ', but at the deepest moment <b>' + maxF + ' frames</b> (n + 1) were alive → <b>O(n) extra space</b>. For n = 10<sup>6</sup> this would crash with StackOverflowError.',
          parts: [{ type: 'stack', label: 'call stack (empty again)', items: [] }, { type: 'vars', vals: { answer: ret, 'max frames': maxF }, hl: { 'max frames': 'bad' } }]
        });
        var total = 0;
        for (var i = 1; i <= n; i++) {
          total += i;
          frames.push({
            narr: 'Loop version, i = ' + i + ': total += ' + i + ' → <b>' + total + '</b>. The same single variable is reused every time — nothing piles up.',
            parts: [{ type: 'stack', label: 'call stack', items: ['sumLoop(' + n + ')'], hl: { 0: 'ok' } }, { type: 'vars', vals: { i: i, total: total }, hl: { total: 'ok' } }]
          });
        }
        frames.push({
          narr: 'Same answer <b>' + total + '</b>, only <b>1 frame</b> and two variables → <b>O(1) extra space</b>. Time is O(n) for both; only the memory differs.',
          parts: [{ type: 'vars', label: 'comparison', vals: { 'recursive space': 'O(n) = ' + maxF + ' frames', 'loop space': 'O(1) = 1 frame' }, hl: { 'loop space': 'sel', 'recursive space': 'bad' } }]
        });
        return frames;
      }
    },
    examples: [
      {
        title: 'Three sorts, three memory stories',
        html: `${H.table(['Algorithm', 'time', 'extra space', 'why'], [
  ['Merge sort (arrays)', 'O(N log N)', H.c('y', 'O(N)'), 'needs a temporary buffer to merge two halves'],
  ['Quick sort', 'O(N log N) avg', H.c('g', 'O(log N)') + ' avg', 'recursion stack only; recurse into the smaller side first to guarantee O(log N)'],
  ['Heap sort', 'O(N log N)', H.c('g', 'O(1)'), 'sifts inside the array itself, no recursion needed']
])}<p>Java's <code>Arrays.sort(int[])</code> uses dual-pivot quicksort (little extra memory); <code>Arrays.sort(Object[])</code> uses TimSort, which may allocate up to N/2 extra references but is <b>stable</b>.</p>`
      },
      {
        title: 'Shrinking a DP table with a rolling array',
        html: `<p>Longest Common Subsequence of two strings of length 5000 needs a 5001 × 5001 <code>int</code> table ≈ 25·10<sup>6</sup> × 4 bytes = ${H.c('r', '100 MB')}. Row i only reads row i − 1, so keep <b>two rows</b>: 2 × 5001 ints = ${H.c('g', '40 KB')}. Time stays O(N·M); space drops from O(N·M) to O(M).</p>`,
        code: `int lcs(String a, String b) {
    int[] prev = new int[b.length() + 1], cur = new int[b.length() + 1];
    for (int i = 1; i <= a.length(); i++) {
        for (int j = 1; j <= b.length(); j++)
            cur[j] = a.charAt(i - 1) == b.charAt(j - 1) ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
        int[] t = prev; prev = cur; cur = t;   // swap rows: O(M) memory total
    }
    return prev[b.length()];
}`
      },
      {
        title: 'Recursion on a long chain overflows the stack',
        html: `<p>Counting nodes of a linked list recursively, <code>count(node) = 1 + count(node.next)</code>, keeps one frame per node alive. For a 10<sup>6</sup>-node list that is 10<sup>6</sup> frames → ${H.c('r', 'StackOverflowError')} with Java's default stack. A loop uses O(1) space. Same trap: DFS on a graph that is one long path, or recursion on a degenerate (skewed) binary tree.</p>`,
        code: `int countIterative(ListNode head) {
    int c = 0;
    for (ListNode cur = head; cur != null; cur = cur.next) c++;  // O(1) extra space
    return c;
}`
      },
      {
        title: 'Output space vs auxiliary space',
        html: `<p>Generating all subsets of N = 20 items returns 2<sup>20</sup> ≈ 10<sup>6</sup> lists with average length 10 → about 10<sup>7</sup> numbers <b>of output</b>. The backtracking itself only needs O(N) extra (the recursion depth plus the current subset). Interviewers usually say "O(N) auxiliary space, not counting the output" — say it explicitly so there is no confusion.</p>`
      }
    ],
    deepDive: `<p><b>Stack vs heap in the JVM.</b> Each thread has its own <b>stack</b> holding frames: local primitives, references, the return address and some bookkeeping. Objects (<code>new int[n]</code>, every <code>Integer</code>, every list node) live on the shared <b>heap</b>. The default thread stack is typically 512 KB–1 MB (set with <code>-Xss</code>), enough for roughly 10<sup>4</sup>–10<sup>5</sup> small frames; the heap is limited by <code>-Xmx</code>. Java does <b>not</b> perform tail-call optimisation, so even a tail-recursive method uses O(depth) stack.</p>
<p><b>Workarounds for deep recursion.</b> (1) Convert to a loop or an explicit <code>ArrayDeque</code> stack (heap-allocated, limited only by heap size). (2) Run the recursion in a thread with a big stack: <code>new Thread(null, task, "main", 1 &lt;&lt; 26).start()</code> — common in competitive programming. (3) Change the algorithm so depth is O(log N), e.g. quicksort that recurses on the smaller part and loops on the larger.</p>
<p><b>Real object sizes (64-bit JVM, compressed references).</b> Object header 12 bytes, padded to multiples of 8; a reference 4 bytes; <code>Integer</code> 16 bytes; a <code>HashMap</code> entry node 32 bytes plus key and value objects. <code>boolean[]</code> uses 1 byte per flag, while <code>java.util.BitSet</code> packs 64 flags in one <code>long</code> — an 8× saving for sieves of 10<sup>8</sup>.</p>
<p><b>Space can cost time.</b> Allocating and zeroing a 400 MB array takes real time, triggers garbage collection and pollutes caches. Smaller memory often means faster code — another reason rolling arrays and primitive arrays beat boxed collections.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants readily convert recursion to iteration and suggest rolling arrays when you ask "reduce the memory". They also quote JVM object sizes reasonably well. That makes the <i>mechanics</i> cheap.</p>
<p><b>Use AI as a partner:</b> ask <code>estimate the peak memory of this method for n = 10^6, listing every allocation</code> and compare with your own estimate; ask it to <code>rewrite this DFS with an explicit stack, keeping the visit order identical</code> and then test both on a 10<sup>6</sup>-node path graph.</p>
<p><b>Where AI goes wrong:</b> it often reports "O(1) space" for recursive solutions (forgetting the call stack), counts output as auxiliary space or vice versa, and suggests <code>HashMap&lt;Integer,Integer&gt;</code> where an <code>int[]</code> would use 10× less memory. <b>What you must own:</b> knowing where every byte lives — stack, heap, output — and catching an MLE or StackOverflowError before it ships.</p>`,
    problems: [
      {
        title: 'Reverse an Array In-Place (O(1) Extra Space)',
        level: 'Easy',
        tags: ['space complexity', 'two pointers', 'in-place'],
        statement: `<p>Reverse the integer array <code>A</code> <b>in-place</b>: modify <code>A</code> itself and use only <b>O(1) extra memory</b> (no second array).</p>`,
        constraints: `1 ≤ N ≤ 10<sup>6</sup>, memory limit 16 MB on top of the input`,
        example: `${H.arr([1, 2, 3, 4, 5], { label: 'before', hl: { 0: 'y', 4: 'y' } })}${H.arr([5, 4, 3, 2, 1], { label: 'after', hl: { 0: 'g', 4: 'g' } })}<p>Swap the ${H.c('y', 'two ends')}, then move both ends inward. The middle element 3 stays where it is.</p>`,
        brute: {
          why: `<p>Copy into a new array backwards, then copy back. Time is fine (O(N)), but it allocates a <b>second array of N ints</b> = O(N) extra space (4 MB for 10<sup>6</sup>) — it breaks the "O(1) extra space" rule. The wasted resource here is memory, not time.</p>`,
          code: `
void bruteReverse(int[] a) {
    int n = a.length;
    int[] copy = new int[n];          // O(N) extra memory
    for (int i = 0; i < n; i++) copy[i] = a[n - 1 - i];
    for (int i = 0; i < n; i++) a[i] = copy[i];
}`
        },
        mcq: {
          q: 'What is the extra space of a swap-based reversal that uses indices L, R and one temp variable?',
          options: ['O(N), because the array has N elements', 'O(1), because only 3 variables are used no matter how big N is', 'O(log N)', 'O(N/2), because there are N/2 swaps'],
          answer: 1,
          explain: 'The input array does not count as extra space. L, R and temp are 3 variables whatever N is → O(1). The N/2 swaps describe time (O(N)), not memory.'
        },
        hints: [
          `<p>Position i must end up holding the value from position N−1−i. Swapping the pair (i, N−1−i) puts <b>both</b> elements in their final spots at once.</p>`,
          `<p>Two index pointers: <code>L</code> from the left, <code>R</code> from the right. Swap a[L] and a[R] with one <code>temp</code>, then <code>L++</code>, <code>R--</code>.</p>`,
          `<p>Traps: stop when <code>L &gt;= R</code> (continuing would swap everything back!); odd N leaves the middle untouched, which is correct; N = 1 → nothing happens. Recipe: L = 0, R = N−1; while L &lt; R: swap(a[L], a[R]); L++; R--.</p>`
        ],
        solution: {
          approach: `<p>Two pointers from both ends, swapping as they meet in the middle.</p>`,
          code: `
class Solution {
    public void reverse(int[] a) {
        int L = 0, R = a.length - 1;   // the two ends
        while (L < R) {                // stop when they meet or cross
            int temp = a[L];           // the ONLY extra storage: one int
            a[L] = a[R];
            a[R] = temp;
            L++;                       // move both ends inward
            R--;
        }
    }

    public static void main(String[] args) {
        int[] a = {1, 2, 3, 4, 5};
        new Solution().reverse(a);
        System.out.println(Arrays.toString(a));   // [5, 4, 3, 2, 1]
    }
}`,
          dry: {
            head: ['L', 'R', 'swap', 'array after'],
            rows: [
              ['0', '4', 'a[0]=1 ↔ a[4]=5', '[5, 2, 3, 4, 1]'],
              ['1', '3', 'a[1]=2 ↔ a[3]=4', '[5, 4, 3, 2, 1]'],
              ['2', '2', H.c('m', 'L &lt; R is false → stop'), H.c('p', '[5, 4, 3, 2, 1]')]
            ]
          },
          complexity: `<p><b>Time O(N)</b>: N/2 swaps, each O(1). <b>Extra space O(1)</b>: just L, R and temp — the same three variables for 5 elements or 10<sup>6</sup> elements.</p>`
        }
      }
    ]
  });
  // =====================================================================
  // TOPIC 6 — Reading constraints: the 10^8 rule and TLE estimation
  // =====================================================================
  var LADDER = [
    { name: 'O(N!)', f: function (n) { if (n > 30) return Infinity; var s = 0; for (var i = 2; i <= n; i++) s += Math.log10(i); return s; } },
    { name: 'O(2^N · N)', f: function (n) { return n * Math.log10(2) + Math.log10(n); } },
    { name: 'O(2^N)', f: function (n) { return n * Math.log10(2); } },
    { name: 'O(N^3)', f: function (n) { return 3 * Math.log10(n); } },
    { name: 'O(N^2 log N)', f: function (n) { return 2 * Math.log10(n) + Math.log10(Math.max(1, Math.log2(n))); } },
    { name: 'O(N^2)', f: function (n) { return 2 * Math.log10(n); } },
    { name: 'O(N √N)', f: function (n) { return 1.5 * Math.log10(n); } },
    { name: 'O(N log N)', f: function (n) { return Math.log10(n) + Math.log10(Math.max(1, Math.log2(n))); } },
    { name: 'O(N)', f: function (n) { return Math.log10(n); } },
    { name: 'O(√N)', f: function (n) { return 0.5 * Math.log10(n); } },
    { name: 'O(log N)', f: function (n) { return Math.log10(Math.max(1, Math.log2(n))); } },
    { name: 'O(1)', f: function () { return 0; } }
  ];
  function fmtOps(L) {
    if (!isFinite(L) || L > 300) return 'astronomical';
    if (L < 5) return String(Math.round(Math.pow(10, L)));
    var e = Math.floor(L), m = Math.pow(10, L - e);
    if (m >= 9.95) { m = 1; e++; }
    return m.toFixed(1) + '·10^' + e;
  }

  topics.push({
    title: 'Reading Constraints: the 10⁸ Rule and Estimating TLE',
    analogy: `<p>You have <b>₹100 crore to spend in one day</b> (that is 10<sup>8</sup> rupees... in steps). Each simple operation your program does costs one rupee. Before going shopping, a smart person checks the price tags: an O(N<sup>2</sup>) plan with N = 10<sup>5</sup> costs 10<sup>10</sup> rupees — a hundred times over budget. An O(N log N) plan costs 1.7·10<sup>6</sup> — pocket change.</p>
<p>Like a tailor who glances at a customer and already knows the size, a good problem solver glances at "N ≤ 10<sup>5</sup>" and already knows the shape of the solution — <b>before writing a single line</b>.</p>`,
    explain: `<p><b>The rule of thumb:</b> a judge machine runs roughly <b>10<sup>8</sup> simple operations per second</b> (additions, comparisons, array reads) in Java or C++. Real CPUs do more, but Java has overheads (bounds checks, objects, JIT warm-up), so 10<sup>8</sup> is a safe budget. With a time limit of T seconds, your budget is about <b>T × 10<sup>8</sup></b> operations.</p>
<p><b>The 3-step check:</b> (1) find the largest N in the constraints, (2) plug it into your complexity, (3) compare with the budget. Within budget → go. A few times over → borderline (depends on constants). 100× over → TLE (Time Limit Exceeded), think of something else.</p>
<h4>Constraint → allowed complexity (1 second)</h4>
${H.table(['Largest N', 'Max complexity that fits', 'Typical technique'], [
  ['N ≤ 10–11', H.c('r', 'O(N!)') + ', O(N!·N)', 'try every permutation'],
  ['N ≤ 20–25', H.c('r', 'O(2<sup>N</sup>·N)'), 'subsets, bitmask DP, backtracking'],
  ['N ≤ 40', 'O(2<sup>N/2</sup>·N)', 'meet in the middle'],
  ['N ≤ 400–500', H.c('y', 'O(N<sup>3</sup>)'), 'Floyd-Warshall, interval DP, triple loops'],
  ['N ≤ 2000–5000', H.c('y', 'O(N<sup>2</sup>)') + ', O(N<sup>2</sup> log N)', 'all pairs, 2D DP (LCS, edit distance)'],
  ['N ≤ 10<sup>5</sup>', H.c('b', 'O(N log N)') + ', O(N√N)', 'sorting, heaps, binary search, segment tree'],
  ['N ≤ 10<sup>6</sup>', H.c('b', 'O(N log N)') + ' (tight) or O(N)', 'prefix sums, two pointers, hashing, sieve'],
  ['N ≤ 10<sup>7</sup>–10<sup>8</sup>', H.c('g', 'O(N)') + ' with tiny constant', 'single pass, primitive arrays, no objects'],
  ['N ≤ 10<sup>9</sup>–10<sup>12</sup>', H.c('g', 'O(√N)'), 'divisors, factorisation, √N blocks'],
  ['N ≤ 10<sup>18</sup>', H.c('g', 'O(log N)') + ' or O(1)', 'math formula, binary search, fast power']
])}
<h4>Worked check: N = 10<sup>5</sup>, 1 second</h4>
${H.table(['Plan', 'operations', 'verdict'], [
  ['O(N<sup>2</sup>)', '10<sup>10</sup>', H.c('r', '100× over → TLE (≈ 100 s)')],
  ['O(N√N)', '3.2·10<sup>7</sup>', H.c('g', 'fits')],
  ['O(N log N)', '1.7·10<sup>6</sup>', H.c('g', 'easily fits')],
  ['O(N)', '10<sup>5</sup>', H.c('g', 'instant')]
])}
<h4>Read ALL the numbers, not just N</h4>
<ul>
<li><b>Queries:</b> Q queries × cost per query. Q = N = 10<sup>5</sup> with an O(N) scan per query = 10<sup>10</sup> → precompute so each query is O(1) or O(log N).</li>
<li><b>Test cases:</b> "T ≤ 10<sup>4</sup>, N ≤ 10<sup>5</sup>, <b>sum of N over all tests ≤ 2·10<sup>5</sup></b>" means you may do O(N log N) per test — but never O(max N) work per test (like clearing a 10<sup>5</sup> array T times).</li>
<li><b>Value ranges:</b> A[i] ≤ 10<sup>6</sup> invites counting arrays/sieves; A[i] ≤ 10<sup>9</sup> means sums need <code>long</code>; "answer modulo 10<sup>9</sup>+7" means the true answer is astronomically large.</li>
<li><b>Memory limit</b> (often 256 MB): see the Space Complexity topic.</li>
</ul>`,
    clues: [
      '<b>N ≤ 10<sup>5</sup></b> (or 2·10<sup>5</sup>) → the intended solution is O(N log N) or O(N); any O(N<sup>2</sup>) idea is a stepping stone only.',
      '<b>N ≤ 20</b> → exponential is <i>expected</i>: subsets / bitmasks / backtracking (2<sup>20</sup> ≈ 10<sup>6</sup>).',
      '<b>N ≤ 500</b> → O(N<sup>3</sup>) is fine; <b>N ≤ 5000</b> → O(N<sup>2</sup>) DP over pairs is fine.',
      '<b>N ≤ 10<sup>9</sup> or 10<sup>18</sup></b> → you cannot even read/loop over 1..N: use a formula, O(√N), or binary search.',
      '"<b>Sum of N over all test cases ≤ …</b>" → per-test work must depend on that test\'s N, not the maximum N.',
      '<b>Q ≤ 10<sup>5</sup> queries</b> on an array of 10<sup>5</sup> → each query must be O(1) / O(log N) after preprocessing.'
    ],
    code: [`
class ComplexityBudget {
    // Classic ladder, most expensive first. Each entry: name + log10(operations).
    static final String[] NAMES = {"O(N!)", "O(2^N * N)", "O(2^N)", "O(N^3)", "O(N^2 log N)",
                                   "O(N^2)", "O(N sqrt N)", "O(N log N)", "O(N)", "O(sqrt N)", "O(log N)", "O(1)"};

    static double log10Ops(int k, long n) {
        double lg = Math.log10(n), log2n = Math.max(1.0, Math.log(n) / Math.log(2));
        switch (k) {
            case 0: {                                   // N! : only small N can ever fit
                if (n > 30) return Double.POSITIVE_INFINITY;
                double s = 0;
                for (int i = 2; i <= n; i++) s += Math.log10(i);
                return s;
            }
            case 1: return n * Math.log10(2) + lg;      // 2^N * N
            case 2: return n * Math.log10(2);           // 2^N
            case 3: return 3 * lg;                      // N^3
            case 4: return 2 * lg + Math.log10(log2n);  // N^2 log N
            case 5: return 2 * lg;                      // N^2
            case 6: return 1.5 * lg;                    // N * sqrt(N)
            case 7: return lg + Math.log10(log2n);      // N log N
            case 8: return lg;                          // N
            case 9: return 0.5 * lg;                    // sqrt(N)
            case 10: return Math.log10(log2n);          // log N
            default: return 0;                          // O(1)
        }
    }

    // Most expensive class whose operation count fits in seconds * 10^8.
    static String maxAllowed(long n, double seconds) {
        double budget = Math.log10(seconds * 1e8);
        for (int k = 0; k < NAMES.length; k++) {
            if (log10Ops(k, n) <= budget + 1e-9) return NAMES[k];
        }
        return "O(1)";
    }

    public static void main(String[] args) {
        System.out.println(maxAllowed(10, 1));                    // O(N!)
        System.out.println(maxAllowed(20, 1));                    // O(2^N * N)
        System.out.println(maxAllowed(2000, 1));                  // O(N^2 log N)
        System.out.println(maxAllowed(100_000, 1));               // O(N sqrt N)
        System.out.println(maxAllowed(10_000_000, 1));            // O(N)
        System.out.println(maxAllowed(1_000_000_000_000_000L, 1)); // O(log N)
    }
}`],
    codeTitle: ['Constraint → maximum complexity, computed in log space'],
    viz: [
      {
        title: 'Constraint detective: walk down the ladder until it fits',
        input: '100000 1',
        inputLabel: 'N and time limit in seconds (e.g. "2000 1" or "20 2")',
        gen: function (input) {
          var p = String(input === undefined ? '' : input).trim().split(/[\s,]+/);
          if (p.length < 1 || p.length > 2 || !/^\d+$/.test(p[0]) || (p[1] !== undefined && !/^\d+(\.\d+)?$/.test(p[1]))) throw new Error('Enter N and an optional time limit in seconds, e.g. "100000 1".');
          var n = Number(p[0]), sec = p[1] === undefined ? 1 : Number(p[1]);
          if (n < 2 || n > 1e18) throw new Error('Keep N between 2 and 10^18.');
          if (sec <= 0 || sec > 10) throw new Error('Time limit must be between 0.1 and 10 seconds.');
          var budget = Math.log10(sec * 1e8);
          var frames = [], rows = [], hl = {}, found = -1;
          frames.push({
            narr: 'Budget = ' + sec + ' s × 10<sup>8</sup> ops/s ≈ <b>' + fmtOps(budget) + '</b> simple operations. We try the complexity ladder from the <b>most expensive</b> rung (N!) downwards and stop at the first rung that fits — that is the most powerful kind of algorithm we are allowed to use.',
            parts: [
              { type: 'vars', vals: { N: p[0], 'time limit (s)': sec, budget: fmtOps(budget) }, hl: { budget: 'sel' } },
              { type: 'table', label: 'ladder so far', columns: ['complexity', 'operations', 'verdict'], rows: [] }
            ]
          });
          for (var k = 0; k < LADDER.length; k++) {
            var L = LADDER[k].f(n), verdict, cls;
            if (L <= budget + 1e-9) { verdict = '✓ fits'; cls = 'ok'; }
            else if (L <= budget + Math.log10(5)) { verdict = '≈ borderline (' + (Math.pow(10, L - budget)).toFixed(1) + '× budget)'; cls = 'cur'; }
            else { verdict = '✗ TLE (' + (isFinite(L) && L - budget < 300 ? fmtOps(L - budget) + '× budget' : 'hopeless') + ')'; cls = 'bad'; }
            rows.push([LADDER[k].name, fmtOps(L), verdict]);
            hl[k] = cls;
            var h2 = {}; for (var z in hl) h2[z] = hl[z];
            if (cls === 'ok') { h2[k] = 'sel'; found = k; }
            frames.push({
              narr: LADDER[k].name + ' with N = ' + p[0] + ' needs about <b>' + fmtOps(L) + '</b> operations. ' + (cls === 'ok' ? '<span class="c-g">That fits the budget!</span> This is the most expensive complexity we can afford, so aim for an algorithm of this class (or cheaper).' : cls === 'cur' ? '<span class="c-y">Close to the budget</span> — might pass with a very tight constant, risky. Keep going down.' : '<span class="c-r">Far over budget</span> — this would take about ' + (isFinite(L) && L - budget < 15 ? fmtOps(L - 8) + ' seconds' : 'longer than the age of the universe') + '. Next rung.'),
              parts: [
                { type: 'table', label: 'ladder so far', columns: ['complexity', 'operations', 'verdict'], rows: rows.map(function (r) { return r.slice(); }), hl: h2 },
                { type: 'vars', vals: { trying: LADDER[k].name, 'log10(ops)': (isFinite(L) ? L.toFixed(2) : '∞'), 'log10(budget)': budget.toFixed(2) }, hl: { trying: cls } }
              ]
            });
            if (found >= 0) break;
          }
          var rest = [];
          for (var q = found + 1; q < LADDER.length; q++) rest.push(LADDER[q].name);
          frames.push({
            narr: 'Every rung below ' + LADDER[found].name + ' is cheaper, so it fits too: ' + rest.join(', ') + '. In practice you search for the simplest idea whose complexity is <b>at or below</b> ' + LADDER[found].name + '.',
            parts: [
              { type: 'set', label: 'allowed complexities', items: [LADDER[found].name].concat(rest), hl: (function () { var h = {}; h[LADDER[found].name] = 'sel'; return h; })() },
              { type: 'vars', vals: { N: p[0], 'max allowed': LADDER[found].name }, hl: { 'max allowed': 'sel' } }
            ]
          });
          frames.push({
            narr: 'Rule of thumb recap: N ≤ 10 → N!, N ≤ 20 → 2<sup>N</sup>, N ≤ 500 → N<sup>3</sup>, N ≤ 5000 → N<sup>2</sup>, N ≤ 10<sup>6</sup> → N log N, N ≤ 10<sup>8</sup> → N, bigger → √N / log N / O(1). Try "20 1", "2000 1", "1000000000000 1".',
            parts: [
              { type: 'text', label: 'remember', html: 'Read the constraints <b>first</b>. They whisper the intended complexity.' },
              { type: 'vars', vals: { verdict: LADDER[found].name + ' for N = ' + p[0] }, hl: { verdict: 'ok' } }
            ]
          });
          return frames;
        }
      },
      {
        title: 'Queries multiply: Q × O(N) vs precompute O(N) + Q × O(1)',
        input: '100000 100000',
        inputLabel: 'N and Q (each 1 to 10^7)',
        gen: function (input) {
          var p = String(input === undefined ? '' : input).trim().split(/[\s,]+/);
          if (p.length !== 2 || !/^\d+$/.test(p[0]) || !/^\d+$/.test(p[1])) throw new Error('Enter N and Q, e.g. "100000 100000".');
          var n = Number(p[0]), qMax = Number(p[1]);
          if (n < 1 || n > 1e7 || qMax < 1 || qMax > 1e7) throw new Error('Keep N and Q between 1 and 10^7.');
          var qs = [], q = 1;
          while (q < qMax) { qs.push(q); q *= 10; }
          qs.push(qMax);
          var frames = [];
          frames.push({
            narr: 'Task: answer Q range-sum queries on an array of N = ' + n + ' numbers. <b>Naive:</b> loop over the range for every query → up to N operations each → Q·N total. <b>Smart:</b> build prefix sums once (N operations), then each query is one subtraction → N + Q total. Let Q grow and compare.',
            parts: [
              { type: 'bars', label: 'log10(operations): naive vs smart', values: [0, 0], texts: ['?', '?'], idxLabels: ['naive Q·N', 'smart N+Q'] },
              { type: 'vars', vals: { N: n, budget: '10^8' } }
            ]
          });
          qs.forEach(function (Q) {
            var naive = Q * n, smart = n + Q;
            var ln = Math.log10(naive), ls = Math.log10(smart);
            frames.push({
              narr: 'Q = ' + Q + ': naive = ' + Q + ' × ' + n + ' = <b>' + fmtOps(ln) + '</b> ops ' + (ln <= 8 ? '(fits)' : '(<span class="c-r">TLE, ~' + fmtOps(ln - 8) + ' s</span>)') + '; smart = ' + n + ' + ' + Q + ' = <b>' + fmtOps(ls) + '</b> ops (fits). The naive cost grows with the <i>product</i>, the smart cost with the <i>sum</i>.',
              parts: [
                { type: 'bars', label: 'log10(operations) — budget line is 8', values: [Math.round(ln * 10) / 10, Math.round(ls * 10) / 10], texts: [fmtOps(ln), fmtOps(ls)], idxLabels: ['naive Q·N', 'smart N+Q'], hl: { 0: ln <= 8 ? 'ok' : 'bad', 1: 'ok' } },
                { type: 'vars', vals: { Q: Q, 'naive ops': fmtOps(ln), 'smart ops': fmtOps(ls) }, hl: { 'naive ops': ln <= 8 ? 'ok' : 'bad', 'smart ops': 'ok' } }
              ]
            });
          });
          frames.push({
            narr: 'Lesson: when a problem has Q queries, total time = preprocessing + Q × (time per query). If Q and N are both ~10<sup>5</sup>, per-query work must be O(1) or O(log N).',
            parts: [{ type: 'text', label: 'formula', html: 'total = build + Q × query' }, { type: 'vars', vals: { 'naive': 'O(Q·N)', 'smart': 'O(N + Q)' }, hl: { smart: 'sel', naive: 'bad' } }]
          });
          if (frames.length < 4) frames.splice(1, 0, { narr: 'Tip: use a bigger Q (like 100000) to see the gap open up.', parts: [{ type: 'vars', vals: { N: n, Q: qMax } }] });
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'N ≤ 2000: O(N²) yes, O(N³) no',
        html: `${H.table(['Plan', 'operations at N = 2000', 'verdict'], [['O(N<sup>3</sup>)', '8·10<sup>9</sup>', H.c('r', 'TLE (≈ 80 s)')], ['O(N<sup>2</sup> log N)', '4.4·10<sup>7</sup>', H.c('g', 'fits')], ['O(N<sup>2</sup>)', '4·10<sup>6</sup>', H.c('g', 'fits easily')]])}<p>So for "count pairs/triangles with N ≤ 2000", fix two elements and binary-search (or two-pointer) the third instead of three nested loops.</p>`
      },
      {
        title: 'The multi-test trap: resetting a big array every test',
        html: `<p>T = 10<sup>4</sup> tests, each N small, but "sum of N ≤ 2·10<sup>5</sup>". If every test does <code>Arrays.fill(cnt, 0)</code> on a global array of size 10<sup>6</sup>, the total is 10<sup>4</sup> × 10<sup>6</sup> = ${H.c('r', '10<sup>10</sup>')} → TLE even though each test's real work is tiny. Fix: only clear the entries this test touched, or allocate an array of size N+1 per test (total ${H.c('g', '2·10<sup>5</sup>')}).</p>`
      },
      {
        title: 'N ≤ 10¹⁸: even √N is too slow',
        html: `<p>√(10<sup>18</sup>) = 10<sup>9</sup> → ~10 s. Only O(log N) (≈ 60 steps) or O(1) survives. So "sum of 1..N", "number of perfect squares ≤ N" (= ⌊√N⌋ computed with integer correction), or "a<sup>N</sup> mod M" all need formulas or halving. Seeing 10<sup>18</sup> should instantly make you think "<code>long</code>, overflow, logarithm".</p>`
      },
      {
        title: 'Same N, different limits: 1 s vs 3 s',
        html: `<p>N = 500, O(N<sup>3</sup>) = 1.25·10<sup>8</sup>. With a 1 s limit that is borderline; with 3 s it is comfortable. Simple triple loops over primitive arrays (like Floyd-Warshall) run about 5·10<sup>8</sup> basic steps per second in modern Java, so they usually pass — but a triple loop doing <code>HashMap</code> lookups would not. The 10<sup>8</sup> rule is a <b>first filter</b>, not a stopwatch.</p>`
      },
      {
        title: 'Using constraints to reject your own idea early',
        html: `<p>"Given N ≤ 10<sup>5</sup> intervals, for each interval count how many others overlap it." First idea: compare every pair → N<sup>2</sup>/2 = 5·10<sup>9</sup> → rejected in 5 seconds of thinking. Next idea: sort start and end points and binary search → O(N log N) ≈ 1.7·10<sup>6</sup> ✓. Interviewers love hearing exactly this: "the brute force is O(N<sup>2</sup>) which is 10<sup>10</sup> for these limits, so I need N log N".</p>`
      }
    ],
    deepDive: `<p><b>Where does 10<sup>8</sup> come from?</b> A modern core runs ~3·10<sup>9</sup> cycles per second and can retire several simple instructions per cycle. But one "operation" in your mental model (e.g. <code>dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1] + a[i])</code>) is many machine instructions plus memory accesses. Cache misses cost ~100 cycles each, so random access over large arrays can drop throughput to 10<sup>7</sup>/s, while tight sequential loops can reach 10<sup>9</sup>/s. 10<sup>8</sup> is the honest middle.</p>
<p><b>Java-specific costs.</b> JVM startup and JIT warm-up take ~50–200 ms; <code>Scanner</code> parses ~10<sup>5</sup>–10<sup>6</sup> numbers per second (use <code>BufferedReader</code>/<code>DataInputStream</code> for 10<sup>6</sup> inputs); boxing (<code>Integer</code>, <code>List&lt;Long&gt;</code>) costs allocation and pointer chasing; <code>System.out.println</code> in a loop of 10<sup>5</sup> lines is slow — collect into a <code>StringBuilder</code> or <code>PrintWriter</code>. Recursion depth and heap size have their own limits (see Space topic).</p>
<p><b>Reading the problem setter's mind.</b> Setters pick limits so that the intended solution passes with a 3–10× margin and the next-worse complexity fails by 10–100×. That is why N = 2·10<sup>5</sup> (kills N<sup>2</sup> at 4·10<sup>10</sup>) and N = 5000 (allows N<sup>2</sup> = 2.5·10<sup>7</sup>) are so common. Unusual limits are clues too: N ≤ 40 almost always means meet-in-the-middle; N ≤ 10<sup>5</sup> with Q ≤ 10<sup>5</sup> and offline queries suggests sorting queries or sqrt decomposition.</p>
<p><b>In interviews and production.</b> Interviewers rarely give constraints — <b>ask</b>: "How large can N get? Does it fit in memory? How many queries per second?" In production the same arithmetic becomes capacity planning: 10<sup>6</sup> users × 100 requests/day ≈ 1,200 requests per second; if each request does an O(N) scan over 10<sup>5</sup> rows you need 1.2·10<sup>8</sup> row-reads per second — time for an index.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant can produce a working brute force in seconds, so the scarce skill is knowing whether that solution will survive the real input size. Constraint arithmetic is your first-line filter for AI-generated code: "this is O(N<sup>2</sup>), N is 2·10<sup>5</sup>, it will time out."</p>
<p><b>Use AI as a partner:</b> paste the constraints and ask <code>what complexity does this limit suggest and which techniques fit? Do not write code.</code> Then compare with your own reading. Ask it to <code>write a stress test generator for the max constraints</code> and time your solution locally — measuring at max N is the most reliable TLE check there is.</p>
<p><b>Where AI goes wrong:</b> it often ignores "sum of N over all test cases", forgets Q in "Q queries", and underestimates Java I/O cost (Scanner on 10<sup>6</sup> numbers). It also tends to over-engineer (segment tree where a prefix sum suffices). <b>What you must own:</b> the 10-second budget calculation at the start of every problem — it decides which pattern you reach for.</p>`,
    problems: [
      {
        title: 'Pick the Allowed Complexity',
        level: 'Easy',
        tags: ['complexity', 'constraints', 'logarithms'],
        statement: `<p>Given the largest input size <code>N</code> and a time limit of <code>T</code> seconds, assume the machine does <b>10<sup>8</sup> operations per second</b>. Return the <b>most expensive</b> complexity class from this ladder whose operation count (with N plugged in, log base 2, no constants) is ≤ T·10<sup>8</sup>:</p>
<p><code>O(N!)</code>, <code>O(2^N * N)</code>, <code>O(2^N)</code>, <code>O(N^3)</code>, <code>O(N^2 log N)</code>, <code>O(N^2)</code>, <code>O(N sqrt N)</code>, <code>O(N log N)</code>, <code>O(N)</code>, <code>O(sqrt N)</code>, <code>O(log N)</code>, <code>O(1)</code>.</p>`,
        constraints: `2 ≤ N ≤ 10<sup>18</sup>, 1 ≤ T ≤ 10`,
        example: `<p>Input: <b>N = 2000, T = 1</b> → Output: ${H.c('p', '<b>O(N^2 log N)</b>')}</p>
${H.table(['class', 'ops at N = 2000', '≤ 10<sup>8</sup>?'], [['O(N!)', 'astronomical', H.c('r', 'no')], ['O(2^N·N)', '≈ 10<sup>605</sup>', H.c('r', 'no')], ['O(2^N)', '≈ 10<sup>602</sup>', H.c('r', 'no')], ['O(N^3)', '8·10<sup>9</sup>', H.c('r', 'no')], ['O(N^2 log N)', '4.4·10<sup>7</sup>', H.c('g', 'yes → answer')]])}`,
        brute: {
          why: `<p>Compute each operation count <b>exactly</b> with <code>BigInteger</code> — including N! and 2<sup>N</sup> — and compare with the budget. Even with an early stop for N!, 2<sup>N</sup> for N = 10<sup>5</sup> has about 30,000 digits, and for N = 10<sup>18</sup> it cannot be built at all — so the brute has to give up and guess. Worse, classes with log N or √N are not integers, so exact arithmetic does not even apply. The wasted work: we only need to know <i>how many digits</i> a count has, not the count itself.</p>`,
          code: `
import java.math.BigInteger;

class Brute {
    static String maxAllowed(long n, int t) {
        BigInteger budget = BigInteger.valueOf(100_000_000L * t);
        BigInteger N = BigInteger.valueOf(n);
        // N! computed exactly: hopeless for big n (and n can be 10^18!)
        BigInteger fact = BigInteger.ONE;
        for (long i = 2; i <= n && fact.compareTo(budget) <= 0; i++) fact = fact.multiply(BigInteger.valueOf(i));
        if (fact.compareTo(budget) <= 0) return "O(N!)";
        // 2^N computed exactly: pow() needs an int exponent and builds a gigantic number
        if (n < 100_000) {
            BigInteger two = BigInteger.TWO.pow((int) n);
            if (two.multiply(N).compareTo(budget) <= 0) return "O(2^N * N)";
            if (two.compareTo(budget) <= 0) return "O(2^N)";
        }
        if (N.pow(3).compareTo(budget) <= 0) return "O(N^3)";
        // ...and every remaining class needs logs or square roots anyway,
        // so exact integer arithmetic does not even help for the rest.
        if (N.pow(2).compareTo(budget) <= 0) return "O(N^2)";
        if (N.compareTo(budget) <= 0) return "O(N)";
        return "O(log N)";
    }
}`
        },
        mcq: {
          q: 'How can you compare 2<sup>N</sup> with 10<sup>8</sup> without ever computing 2<sup>N</sup>?',
          options: ['Use a long and hope it does not overflow', 'Compare logarithms: N·log₁₀2 ≤ 8', 'Use a double — it holds any size', 'You cannot; you must compute it'],
          answer: 1,
          explain: 'log₁₀ is increasing, so a ≤ b ⇔ log₁₀ a ≤ log₁₀ b. log₁₀(2<sup>N</sup>) = N·log₁₀ 2 ≈ 0.301·N: a tiny number even when 2<sup>N</sup> is astronomically large. Products become sums: log(N²·log N) = 2 log N + log log N.'
        },
        hints: [
          `<p>Take log₁₀ of everything. The budget becomes log₁₀(T·10<sup>8</sup>) ≈ 8 to 9. Each class becomes a sum of small numbers, e.g. log₁₀(N<sup>2</sup> log₂ N) = 2·log₁₀N + log₁₀(log₂ N).</p>`,
          `<p>Keep the classes in an array ordered from most to least expensive and return the first one that fits. For N! add log₁₀ i for i = 2..N, but stop early: if N &gt; 30 it can never fit (30! ≈ 2.7·10<sup>32</sup>).</p>`,
          `<p>Edge cases: log₂ N can be below 1 for tiny N — clamp it to 1 so log₁₀ of it is not negative; compare with a tiny epsilon (1e-9) to absorb rounding; O(1) always fits, so the loop always returns. Recipe: budget = log10(T·1e8); for each class in order: if log10Ops(class, N) ≤ budget + 1e-9 return its name.</p>`
        ],
        solution: {
          approach: `<p>Work in log space: compare log₁₀(operations) with log₁₀(budget). Products turn into sums, powers into multiplications, and no number ever gets large.</p>`,
          code: `
class Solution {
    static final String[] NAMES = {"O(N!)", "O(2^N * N)", "O(2^N)", "O(N^3)", "O(N^2 log N)",
                                   "O(N^2)", "O(N sqrt N)", "O(N log N)", "O(N)", "O(sqrt N)", "O(log N)", "O(1)"};

    // log10 of the operation count of class k at size n
    static double log10Ops(int k, long n) {
        double lg = Math.log10(n);
        double lgLog = Math.log10(Math.max(1.0, Math.log(n) / Math.log(2)));  // log10(log2 n), clamped
        switch (k) {
            case 0: {
                if (n > 30) return Double.POSITIVE_INFINITY;     // 30! is already ~10^32
                double s = 0;
                for (int i = 2; i <= n; i++) s += Math.log10(i);
                return s;
            }
            case 1: return n * Math.log10(2) + lg;
            case 2: return n * Math.log10(2);
            case 3: return 3 * lg;
            case 4: return 2 * lg + lgLog;
            case 5: return 2 * lg;
            case 6: return 1.5 * lg;
            case 7: return lg + lgLog;
            case 8: return lg;
            case 9: return 0.5 * lg;
            case 10: return lgLog;
            default: return 0;
        }
    }

    static String maxAllowed(long n, int t) {
        double budget = Math.log10(t * 1e8);
        for (int k = 0; k < NAMES.length; k++)
            if (log10Ops(k, n) <= budget + 1e-9) return NAMES[k];   // first (most expensive) that fits
        return "O(1)";
    }

    public static void main(String[] args) {
        System.out.println(maxAllowed(2000, 1));     // O(N^2 log N)
        System.out.println(maxAllowed(20, 1));       // O(2^N * N)
        System.out.println(maxAllowed(500, 2));      // O(N^3)  (1.25e8 <= 2e8)
        System.out.println(maxAllowed(1_000_000_000_000L, 1)); // O(sqrt N): 10^6 ops fit, 10^12 do not
    }
}`,
          dry: {
            head: ['k', 'class', 'log10(ops) at N = 2000', '≤ 8 ?'],
            rows: [
              ['0', 'O(N!)', '∞ (N &gt; 30)', 'no'],
              ['1', 'O(2^N·N)', '602.1 + 3.3 = 605.4', 'no'],
              ['2', 'O(2^N)', '602.1', 'no'],
              ['3', 'O(N^3)', '3 × 3.30 = 9.90', 'no'],
              ['4', 'O(N^2 log N)', '6.60 + log10(10.97) = 7.64', H.c('g', 'yes → return')]
            ]
          },
          complexity: `<p><b>Time O(1)</b>: 12 classes, each a few <code>Math.log10</code> calls (the N! loop runs at most 30 times). <b>Space O(1)</b>. The BigInteger brute force is exponential in N for the N! and 2<sup>N</sup> rows.</p>`,
          followUps: ['Add a "borderline" verdict when the count is within 5× of the budget.', 'Support two variables: N and Q, with classes like O(N + Q log N).']
        }
      }
    ]
  });

  // =====================================================================
  // PRACTICE — Easy
  // =====================================================================
  practice.push({
    title: 'Missing Number (Gauss Sum)',
    level: 'Easy',
    tags: ['AP sum', 'math', 'array'],
    companies: ['Amazon', 'Microsoft', 'Apple'],
    statement: `<p>An array <code>nums</code> holds <code>n</code> <b>distinct</b> numbers taken from the range <code>0, 1, 2, …, n</code>. Exactly one number of that range is missing. Return it.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup>, 0 ≤ nums[i] ≤ n, all values distinct. Aim for O(n) time and O(1) extra space.`,
    example: `<p>Input: ${H.arr([3, 0, 1])} → Output: ${H.c('p', '<b>2</b>')}</p>
<p>Why: n = 3, the range is 0..3 whose sum is 3·4/2 = ${H.c('b', '6')}. The array sums to ${H.c('y', '4')}. The missing number is 6 − 4 = ${H.c('p', '2')}.</p>`,
    brute: {
      why: `<p>For every candidate value v from 0 to n, scan the whole array to see if v is there: (n+1) × n ≈ 10<sup>10</sup> steps for n = 10<sup>5</sup> → TLE. Wasted work: we search for each value separately, although one single total already "remembers" every value.</p>`,
      code: `
int missingBrute(int[] nums) {
    int n = nums.length;
    for (int v = 0; v <= n; v++) {          // every candidate value
        boolean found = false;
        for (int x : nums) {                // scan the whole array for it
            if (x == v) { found = true; break; }
        }
        if (!found) return v;
    }
    return -1;                              // never reached for valid input
}`
    },
    mcq: {
      q: 'Which quantity instantly reveals the missing number?',
      options: ['The maximum of the array', '(0 + 1 + … + n) − (sum of the array)', 'The number of even values', 'The product of the array'],
      answer: 1,
      explain: 'Every present value appears in both sums and cancels out; only the missing value is left over. 0 + … + n = n(n+1)/2 is an AP sum computed in O(1).'
    },
    hints: [
      `<p>If nothing were missing, the numbers would be exactly 0..n, whose sum you know without a loop: n(n+1)/2 (Gauss pairing).</p>`,
      `<p>One pass to add up the array into a <code>long</code>. The difference between the expected total and the actual total is the answer. (An XOR of 0..n and all elements works too and can never overflow.)</p>`,
      `<p>Edge cases: missing 0 (array is 1..n) and missing n (array is 0..n−1) both work automatically. With n up to 10<sup>5</sup> the sum ~5·10<sup>9</sup> overflows <code>int</code> → use <code>long</code>. Recipe: expected = n(n+1)/2; actual = Σ nums; return expected − actual.</p>`
    ],
    solution: {
      approach: `<p>Expected sum of 0..n by the AP formula, minus the actual sum. Everything present cancels out.</p>`,
      code: `
class Solution {
    public int missingNumber(int[] nums) {
        long n = nums.length;
        long expected = n * (n + 1) / 2;   // 0 + 1 + ... + n, Gauss formula
        long actual = 0;
        for (int x : nums) actual += x;    // one pass, O(1) extra space
        return (int) (expected - actual);  // only the missing value survives
    }

    public static void main(String[] args) {
        Solution s = new Solution();
        System.out.println(s.missingNumber(new int[]{3, 0, 1}));                   // 2
        System.out.println(s.missingNumber(new int[]{9, 6, 4, 2, 3, 5, 7, 0, 1})); // 8
        System.out.println(s.missingNumber(new int[]{0}));                         // 1
    }
}`,
      alt: [{ lang: 'python', code: `def missing_number(nums):
    n = len(nums)
    return n * (n + 1) // 2 - sum(nums)   # Python ints never overflow

print(missing_number([3, 0, 1]))  # 2`, run: true }],
      dry: {
        head: ['step', 'value', 'note'],
        rows: [['n', '3', 'length of [3, 0, 1]'], ['expected', '3·4/2 = 6', '0+1+2+3'], ['actual', '3+0+1 = 4', 'one pass'], ['answer', H.c('p', '6 − 4 = 2'), 'missing value']]
      },
      complexity: `<p><b>Time O(n)</b> for one pass (the formula itself is O(1)). <b>Space O(1)</b>. The brute force is O(n<sup>2</sup>).</p>`,
      followUps: ['Solve it with XOR so no overflow is ever possible.', 'Two numbers are missing: use the sum and the sum of squares (two equations).']
    }
  });

  practice.push({
    title: 'Sum of Multiples of 3 or 5 Below N',
    level: 'Easy',
    tags: ['AP sum', 'inclusion-exclusion', 'math'],
    companies: ['Google', 'Adobe'],
    statement: `<p>Return the sum of all natural numbers <b>strictly below</b> <code>N</code> that are multiples of 3 or 5.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>9</sup> (the answer fits in a <code>long</code>)`,
    example: `<p>Input: <b>N = 10</b> → Output: ${H.c('p', '<b>23</b>')}</p>
<p>Multiples of 3: ${H.c('b', '3, 6, 9')} (sum 18). Multiples of 5: ${H.c('y', '5')} (sum 5). Nothing is a multiple of 15 below 10. Total 18 + 5 = 23.</p>`,
    brute: {
      why: `<p>Loop i from 1 to N−1 and add i if <code>i % 3 == 0 || i % 5 == 0</code>. That is 10<sup>9</sup> iterations for the largest N — around 2–10 seconds in Java, and hopeless if N were 10<sup>18</sup>. Wasted work: the multiples of 3 form an AP whose sum has a formula.</p>`,
      code: `
long brute(long n) {
    long sum = 0;
    for (long i = 1; i < n; i++) {
        if (i % 3 == 0 || i % 5 == 0) sum += i;
    }
    return sum;
}`
    },
    mcq: {
      q: 'Why must we subtract the multiples of 15?',
      options: ['They are not multiples of 3', 'They were added twice: once as multiples of 3 and once as multiples of 5', 'Because 15 is odd', 'We must not; the formula already handles it'],
      answer: 1,
      explain: '15, 30, 45 … are in both lists. Inclusion-exclusion: |A ∪ B| = |A| + |B| − |A ∩ B|, and the same works for sums.'
    },
    hints: [
      `<p>Multiples of k below N are k, 2k, …, m·k with m = ⌊(N−1)/k⌋. Their sum is k·(1 + 2 + … + m) = k·m(m+1)/2.</p>`,
      `<p>Write a helper <code>sumOfMultiples(k, limit)</code>. Answer = f(3) + f(5) − f(15).</p>`,
      `<p>Traps: "below N" means up to N−1 (N = 10 must not include 10); N = 1 → 0; use <code>long</code>: m(m+1) ≈ 1.1·10<sup>17</sup>, times 3 still fits. Recipe: lim = N − 1; return f(3) + f(5) − f(15) where f(k) = k·m(m+1)/2, m = lim/k.</p>`
    ],
    solution: {
      approach: `<p>Each set of multiples is an AP; add the two APs and subtract the overlap (multiples of 15).</p>`,
      code: `
class Solution {
    // k + 2k + ... + m*k where m*k <= limit
    static long sumOfMultiples(long k, long limit) {
        long m = limit / k;            // how many multiples
        return k * (m * (m + 1) / 2);  // k * (1 + 2 + ... + m)
    }

    static long solve(long n) {
        long lim = n - 1;              // strictly below n
        return sumOfMultiples(3, lim) + sumOfMultiples(5, lim) - sumOfMultiples(15, lim);
    }

    public static void main(String[] args) {
        System.out.println(solve(10));          // 23
        System.out.println(solve(1000));        // 233168
        System.out.println(solve(1_000_000_000L)); // 233333333166666668
    }
}`,
      dry: {
        head: ['k', 'm = ⌊9/k⌋', 'k·m(m+1)/2', 'sign'],
        rows: [['3', '3', '3·3·4/2 = 18', '+'], ['5', '1', '5·1·2/2 = 5', '+'], ['15', '0', '0', '−'], ['total', '', H.c('p', '23'), '']]
      },
      complexity: `<p><b>Time O(1)</b> and <b>space O(1)</b>: three formula evaluations regardless of N.</p>`,
      followUps: ['Multiples of 3, 5 or 7: inclusion-exclusion over all non-empty subsets of {3, 5, 7}.', 'Return the result modulo 10<sup>9</sup>+7 with N up to 10<sup>18</sup>.']
    }
  });

  practice.push({
    title: 'Count Digits of N in Base B (No Floating Point)',
    level: 'Easy',
    tags: ['logarithm', 'number bases', 'precision'],
    companies: ['Bloomberg', 'Goldman Sachs'],
    statement: `<p>Given a non-negative integer <code>N</code> and a base <code>B</code>, return how many digits <code>N</code> has when written in base <code>B</code>. (0 is written as one digit "0".)</p>`,
    constraints: `0 ≤ N ≤ 10<sup>18</sup>, 2 ≤ B ≤ 36`,
    example: `<p>N = 1000, B = 10 → ${H.c('p', '<b>4</b>')}. N = 13, B = 2 → 1101₂ → ${H.c('p', '<b>4</b>')}. N = 255, B = 16 → FF → ${H.c('p', '<b>2</b>')}.</p>
<p>Why: the digit count is ⌊log<sub>B</sub> N⌋ + 1 = the number of times you can divide by B before reaching 0.</p>`,
    brute: {
      why: `<p>The "one-liner" <code>(int)(Math.log(n) / Math.log(b)) + 1</code> is O(1) but <b>wrong</b>: Math.log(1000)/Math.log(10) evaluates to 2.9999999999999996, so it returns 3 digits for 1000. Doubles cannot represent most logarithms exactly, and values just below an integer get truncated. It also crashes logically for N = 0 (log 0 = −∞).</p>`,
      code: `
int digitsWithLogs(long n, int b) {
    // Fast-looking but wrong for n = 1000, b = 10 (prints 3) and undefined for n = 0
    return (int) (Math.log(n) / Math.log(b)) + 1;
}`
    },
    mcq: {
      q: 'How many loop iterations does "divide N by B until it becomes 0" take for N = 10<sup>18</sup>, B = 2?',
      options: ['18', '60', '10<sup>9</sup>', '10<sup>18</sup>'],
      answer: 1,
      explain: 'The loop runs once per digit: 10<sup>18</sup> has ⌊log₂ 10<sup>18</sup>⌋ + 1 = 60 binary digits. O(log N) with integers — exact and fast.'
    },
    hints: [
      `<p>Each division by B removes exactly one digit from the right (just like dividing by 10 removes the last decimal digit). Count how many divisions it takes to reach 0.</p>`,
      `<p>A <code>while (n &gt; 0) { n /= b; count++; }</code> loop with <code>long</code>. Special-case N = 0 → 1.</p>`,
      `<p>Traps: N = 0 must return 1, not 0; never use <code>Math.log</code> for exact integer answers; exact powers (1000 in base 10, 1024 in base 2) are where float code breaks. Recipe: if n == 0 return 1; count = 0; while n &gt; 0: n /= b, count++; return count.</p>`
    ],
    solution: {
      approach: `<p>Repeated integer division by B counts the digits exactly in O(log<sub>B</sub> N) steps.</p>`,
      code: `
class Solution {
    static int digits(long n, int b) {
        if (n == 0) return 1;      // "0" is one digit
        int count = 0;
        while (n > 0) {
            n /= b;                // drop the last base-b digit
            count++;
        }
        return count;              // = floor(log_b n) + 1, computed exactly
    }

    public static void main(String[] args) {
        System.out.println(digits(1000, 10));                     // 4
        System.out.println(digits(13, 2));                        // 4
        System.out.println(digits(255, 16));                      // 2
        System.out.println(digits(1_000_000_000_000_000_000L, 2)); // 60
        System.out.println((int) (Math.log(1000) / Math.log(10)) + 1); // 3  <- the float bug
    }
}`,
      dry: {
        head: ['n before', 'n / 10', 'count'],
        rows: [['1000', '100', '1'], ['100', '10', '2'], ['10', '1', '3'], ['1', '0', '4'], ['0', 'stop', H.c('p', '4')]]
      },
      complexity: `<p><b>Time O(log<sub>B</sub> N)</b> — at most 60 iterations for N ≤ 10<sup>18</sup>. <b>Space O(1)</b>.</p>`,
      followUps: ['Count the digits of N! in base 10 without computing N! (sum of log10 i, then think about precision).', 'Return the digits themselves as a string in base B.']
    }
  });

  practice.push({
    title: 'Arranging Coins (Staircase Rows)',
    level: 'Easy',
    tags: ['AP sum', 'binary search', 'math'],
    companies: ['Amazon', 'GoDaddy'],
    statement: `<p>You have <code>n</code> coins and build a staircase: row 1 has 1 coin, row 2 has 2 coins, row k has k coins. The last row may be incomplete. Return the number of <b>complete</b> rows.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>18</sup>`,
    example: `<p>n = 8: rows use 1, 2, 3 coins (total 6), the 4th row would need 4 but only 2 coins are left.</p>
${H.table(['row k', 'coins needed', 'total used', 'complete?'], [['1', '1', '1', H.c('g', 'yes')], ['2', '2', '3', H.c('g', 'yes')], ['3', '3', '6', H.c('g', 'yes')], ['4', '4', '10 &gt; 8', H.c('r', 'no')]])}
<p>Output ${H.c('p', '<b>3</b>')}: the largest k with k(k+1)/2 ≤ n.</p>`,
    brute: {
      why: `<p>Build row after row, subtracting k coins each time. The number of rows is about √(2n) ≈ 1.4·10<sup>9</sup> for n = 10<sup>18</sup> → several seconds → TLE. Wasted work: the total after k rows is an AP sum we can compute directly, so we can <b>jump</b> to the right k.</p>`,
      code: `
long bruteRows(long n) {
    long k = 0;
    while (n >= k + 1) {   // enough coins for the next row?
        k++;
        n -= k;            // build row k
    }
    return k;
}`
    },
    mcq: {
      q: 'The coins used by k complete rows are 1 + 2 + … + k. The answer is therefore…',
      options: ['the largest k with k(k+1)/2 ≤ n', 'n / 2', '⌊log₂ n⌋', 'the smallest k with k<sup>2</sup> ≥ n'],
      answer: 0,
      explain: 'k(k+1)/2 grows with k, so "largest k that fits" is a monotonic yes/no question — perfect for binary search (or the quadratic formula with integer correction).'
    },
    hints: [
      `<p>Coins for k rows = k(k+1)/2 (AP). "Does k fit?" is <b>yes</b> for small k and <b>no</b> after some point — a monotone predicate.</p>`,
      `<p>Binary search k in [0, 2·10<sup>9</sup>]: if mid(mid+1)/2 ≤ n move right, else move left. Alternatively k ≈ (√(8n+1) − 1)/2, then nudge k up/down with exact integer checks.</p>`,
      `<p>Traps: mid·(mid+1) for mid = 2·10<sup>9</sup> is 4·10<sup>18</sup> — still fits in a <code>long</code> (max 9.2·10<sup>18</sup>), but a larger upper bound would overflow; use overflow-safe bounds. Recipe: lo = 0, hi = 2e9; while lo &lt; hi: mid = (lo + hi + 1)/2; if mid(mid+1)/2 ≤ n → lo = mid else hi = mid − 1; return lo.</p>`
    ],
    solution: {
      approach: `<p>Binary search on k for the last k whose AP sum k(k+1)/2 fits in n.</p>`,
      code: `
class Solution {
    static long arrangeCoins(long n) {
        long lo = 0, hi = 2_000_000_000L;        // sqrt(2 * 10^18) < 1.5e9, so 2e9 is a safe upper bound
        while (lo < hi) {
            long mid = lo + (hi - lo + 1) / 2;   // upper middle: avoids infinite loop when lo = mid
            if (mid * (mid + 1) / 2 <= n) lo = mid;   // mid rows fit -> answer is mid or more
            else hi = mid - 1;                        // too many rows
        }
        return lo;
    }

    public static void main(String[] args) {
        System.out.println(arrangeCoins(8));                          // 3
        System.out.println(arrangeCoins(5));                          // 2
        System.out.println(arrangeCoins(1_000_000_000_000_000_000L)); // 1414213561
    }
}`,
      dry: {
        head: ['lo', 'hi', 'mid', 'mid(mid+1)/2 ≤ 8 ?'],
        rows: [['0', '2e9', '1e9', 'no → hi = 1e9 − 1'], ['…', '…', '…', '(≈ 30 halvings)'], ['3', '4', '4', '10 ≤ 8? no → hi = 3'], ['3', '3', '—', H.c('p', 'return 3')]]
      },
      complexity: `<p><b>Time O(log n)</b> — about 31 iterations because the range [0, 2·10<sup>9</sup>] halves each time. <b>Space O(1)</b>. The brute force is O(√n).</p>`,
      followUps: ['Solve it in O(1) with the quadratic formula plus integer correction.', 'Rows grow by 2 each time (1, 3, 5, …): the total is k<sup>2</sup>, so the answer is ⌊√n⌋.']
    }
  });

  // =====================================================================
  // PRACTICE — Medium
  // =====================================================================
  practice.push({
    title: 'Integer Square Root up to 10¹⁸',
    level: 'Medium',
    tags: ['square root', 'binary search', 'overflow', 'precision'],
    companies: ['Amazon', 'Microsoft', 'Bloomberg'],
    statement: `<p>Given a non-negative integer <code>x</code>, return ⌊√x⌋ — the largest integer r with r·r ≤ x. You may not use a built-in square-root as your final answer without verifying it with exact integer arithmetic.</p>`,
    constraints: `0 ≤ x ≤ 10<sup>18</sup>`,
    example: `<p>x = 8 → ${H.c('p', '<b>2</b>')} (2·2 = 4 ≤ 8, 3·3 = 9 &gt; 8).</p>
<p>x = 999,999,999,999,999,999 → ${H.c('p', '<b>999,999,999</b>')}. ${H.c('r', '(long) Math.sqrt(x) returns 1,000,000,000')} because x rounds up to 10<sup>18</sup> when converted to a double.</p>`,
    brute: {
      why: `<p>Try r = 0, 1, 2, … while (r+1)·(r+1) ≤ x. That is √x steps = 10<sup>9</sup> for x = 10<sup>18</sup> → several seconds → TLE. Wasted work: the condition r·r ≤ x is monotone, so most candidates can be skipped by halving.</p>`,
      code: `
long sqrtBrute(long x) {
    long r = 0;
    while ((r + 1) * (r + 1) <= x) r++;   // ~sqrt(x) iterations
    return r;
}`
    },
    mcq: {
      q: 'Inside the binary search, why compare <code>mid &lt;= x / mid</code> instead of <code>mid * mid &lt;= x</code>?',
      options: ['Division is faster', 'mid * mid can overflow a long when mid is large', 'It rounds better', 'There is no difference'],
      answer: 1,
      explain: 'If the search range starts above ~3.04·10<sup>9</sup>, mid·mid exceeds 9.22·10<sup>18</sup> and wraps negative. mid ≤ x / mid (integer division) is equivalent for positive mid and can never overflow.'
    },
    hints: [
      `<p>"r·r ≤ x" is true for r = 0..answer and false afterwards: a yes-then-no pattern. Binary search finds the last "yes" in O(log x) steps.</p>`,
      `<p>Search r in [0, min(x, 2·10<sup>9</sup>)]. Use the upper-middle <code>mid = lo + (hi − lo + 1)/2</code> because you move <code>lo = mid</code> on success.</p>`,
      `<p>Traps: x = 0 and x = 1; overflow in mid·mid; floating-point <code>Math.sqrt</code> off by one near 10<sup>18</sup>. Alternative O(1) recipe: r = (long)Math.sqrt(x); while r·r &gt; x: r−−; while (r+1)·(r+1) ≤ x: r++ — the corrections fix the double's rounding.</p>`
    ],
    solution: {
      approach: `<p>Binary search on the answer with an overflow-safe comparison.</p>`,
      code: `
class Solution {
    static long isqrt(long x) {
        long lo = 0, hi = Math.min(x, 2_000_000_000L);   // sqrt(1e18) = 1e9, so 2e9 is plenty
        while (lo < hi) {
            long mid = lo + (hi - lo + 1) / 2;              // upper middle
            if (mid <= x / mid) lo = mid;                   // mid*mid <= x without overflow
            else hi = mid - 1;
        }
        return lo;
    }

    // O(1) alternative: floating guess + exact integer correction
    static long isqrtFast(long x) {
        long r = (long) Math.sqrt((double) x);
        while (r > 0 && r > x / r) r--;                     // guess too big
        while ((r + 1) <= x / (r + 1)) r++;                 // guess too small
        return r;
    }

    public static void main(String[] args) {
        System.out.println(isqrt(8));                        // 2
        System.out.println(isqrt(999_999_999_999_999_999L)); // 999999999
        System.out.println(isqrtFast(999_999_999_999_999_999L)); // 999999999
        System.out.println((long) Math.sqrt(999_999_999_999_999_999L)); // 1000000000 (wrong)
    }
}`,
      dry: {
        head: ['lo', 'hi', 'mid', 'mid ≤ 8 / mid ?', 'move'],
        rows: [['0', '8', '4', '4 ≤ 2? no', 'hi = 3'], ['0', '3', '2', '2 ≤ 4? yes', 'lo = 2'], ['2', '3', '3', '3 ≤ 2? no', 'hi = 2'], ['2', '2', '—', '—', H.c('p', 'return 2')]]
      },
      complexity: `<p><b>Time O(log x)</b> ≈ 31 iterations; the corrected <code>Math.sqrt</code> version is O(1). <b>Space O(1)</b>.</p>`,
      followUps: ['Count perfect squares in [L, R] = isqrt(R) − isqrt(L − 1).', 'Integer cube root up to 10<sup>18</sup> (careful: mid·mid·mid overflows even sooner).']
    }
  });

  practice.push({
    title: 'Fast Modular Exponentiation (aᵇ mod m)',
    level: 'Medium',
    tags: ['logarithm', 'binary exponentiation', 'modular arithmetic'],
    companies: ['Google', 'Amazon', 'Flipkart'],
    statement: `<p>Compute <code>a<sup>b</sup> mod m</code>. The exponent is so large that multiplying b times is impossible.</p>`,
    constraints: `0 ≤ a ≤ 10<sup>9</sup>, 0 ≤ b ≤ 10<sup>18</sup>, 1 ≤ m ≤ 2·10<sup>9</sup>`,
    example: `<p>a = 3, b = 13, m = 1000 → 3<sup>13</sup> = 1,594,323 → ${H.c('p', '<b>323</b>')}.</p>
${H.table(['bit of 13 (right→left)', 'base (mod 1000)', 'result'], [['1', '3', H.c('g', '3')], ['0', '9', '3 (skip)'], ['1', '81', H.c('g', '243')], ['1', '6561 → 561', H.c('g', '243·561 mod 1000 = 323')]])}`,
    brute: {
      why: `<p>Multiply the result by a, b times: O(b) = 10<sup>18</sup> multiplications ≈ 300 years. Wasted work: a<sup>2k</sup> = (a<sup>k</sup>)<sup>2</sup>, so half the multiplications can be replaced by one squaring — and that halving repeats.</p>`,
      code: `
long powBrute(long a, long b, long m) {
    long r = 1 % m;
    for (long i = 0; i < b; i++) r = r * (a % m) % m;   // b iterations
    return r;
}`
    },
    mcq: {
      q: 'How many loop iterations does binary exponentiation need for b = 10<sup>18</sup>?',
      options: ['About 18', 'About 60', 'About 10<sup>9</sup>', 'About 10<sup>18</sup>'],
      answer: 1,
      explain: 'Each iteration halves b (b &gt;&gt;= 1), so the loop runs once per bit of b: ⌊log₂ 10<sup>18</sup>⌋ + 1 = 60.'
    },
    hints: [
      `<p>Write b in binary. a<sup>13</sup> = a<sup>8</sup>·a<sup>4</sup>·a<sup>1</sup> because 13 = 1101₂. The powers a, a², a⁴, a⁸ … come from repeated squaring.</p>`,
      `<p>Loop while b &gt; 0: if the lowest bit is 1, result = result·base mod m; base = base·base mod m; b &gt;&gt;= 1.</p>`,
      `<p>Traps: m = 1 → answer 0 (start with result = 1 % m); reduce a mod m first; with m ≤ 2·10<sup>9</sup>, base·base &lt; 4·10<sup>18</sup> fits in a <code>long</code> — but for m up to 10<sup>18</sup> you would need <code>Math.multiplyHigh</code> or BigInteger. 0<sup>0</sup> is treated as 1.</p>`
    ],
    solution: {
      approach: `<p>Square-and-multiply over the bits of b: O(log b) multiplications.</p>`,
      code: `
class Solution {
    static long modPow(long a, long b, long m) {
        long result = 1 % m;          // handles m = 1
        long base = a % m;
        while (b > 0) {
            if ((b & 1) == 1) result = result * base % m;  // this bit contributes base
            base = base * base % m;                         // a, a^2, a^4, a^8, ...
            b >>= 1;                                        // next bit: b halves
        }
        return result;
    }

    public static void main(String[] args) {
        System.out.println(modPow(3, 13, 1000));                         // 323
        System.out.println(modPow(2, 1_000_000_000_000_000_000L, 1_000_000_007L)); // 2^(1e18) mod 1e9+7
        System.out.println(modPow(5, 0, 1));                              // 0
    }
}`,
      dry: {
        head: ['b (binary)', 'low bit', 'result', 'base after squaring'],
        rows: [['1101', '1', '3', '9'], ['110', '0', '3', '81'], ['11', '1', '243', '561'], ['1', '1', '243·561 % 1000 = 323', '…'], ['0', '—', H.c('p', '323'), 'stop']]
      },
      complexity: `<p><b>Time O(log b)</b> — at most 60 iterations. <b>Space O(1)</b>. The brute force is O(b).</p>`,
      followUps: ['Recursive version: pow(a, b) = pow(a, b/2)² · (b odd ? a : 1). What is its stack depth?', 'Modular inverse via Fermat: a<sup>m−2</sup> mod m for prime m.']
    }
  });

  practice.push({
    title: 'Count Iterations of a Triple Loop (i < j < k)',
    level: 'Medium',
    tags: ['loop counting', 'combinatorics', 'overflow'],
    companies: ['Uber', 'Microsoft'],
    statement: `<p>Return the final value of <code>count</code> without running the loops:</p>
<pre>long count = 0;
for (long i = 0; i &lt; n; i++)
  for (long j = i + 1; j &lt; n; j++)
    for (long k = j + 1; k &lt; n; k++)
      count++;</pre>`,
    constraints: `0 ≤ n ≤ 3·10<sup>6</sup> (the answer fits in a <code>long</code>, but n(n−1)(n−2) does not)`,
    example: `<p>n = 5 → ${H.c('p', '<b>10</b>')}: the loop visits each set of 3 different indices exactly once: {0,1,2}, {0,1,3}, {0,1,4}, {0,2,3}, {0,2,4}, {0,3,4}, {1,2,3}, {1,2,4}, {1,3,4}, {2,3,4}. That is C(5, 3) = 5·4·3/6 = 10.</p>`,
    brute: {
      why: `<p>Running the triple loop is O(n<sup>3</sup>/6) = 4.5·10<sup>18</sup> increments for n = 3·10<sup>6</sup> — centuries. Even the formula is a trap: n(n−1)(n−2) ≈ 2.7·10<sup>19</sup> <b>overflows</b> a long (max ≈ 9.22·10<sup>18</sup>) before you divide by 6, giving garbage.</p>`,
      code: `
long brute(long n) {
    long count = 0;
    for (long i = 0; i < n; i++)
        for (long j = i + 1; j < n; j++)
            for (long k = j + 1; k < n; k++)
                count++;
    return count;
}`
    },
    mcq: {
      q: 'Why is <code>n * (n - 1) * (n - 2) / 6</code> wrong for n = 3·10<sup>6</sup> in Java?',
      options: ['The formula is wrong', 'The product overflows long before the division happens', 'Integer division by 6 rounds', 'Java evaluates right-to-left'],
      answer: 1,
      explain: 'The true product 2.7·10<sup>19</sup> exceeds Long.MAX_VALUE ≈ 9.22·10<sup>18</sup>, so it wraps around. Divide factors early: one of the three consecutive numbers is divisible by 3 and at least one by 2.'
    },
    hints: [
      `<p>The loop picks every triple i &lt; j &lt; k exactly once, so count = C(n, 3) = n(n−1)(n−2)/6. Check: n = 5 → 10.</p>`,
      `<p>Put the three factors in variables x = n, y = n−1, z = n−2. Divide whichever is divisible by 2 by 2, and whichever (possibly the same, now updated) is divisible by 3 by 3. Then multiply — the result is exact and fits.</p>`,
      `<p>Traps: n &lt; 3 → 0 (one factor becomes 0 or negative — return 0 explicitly); the divide-early trick needs the divisibility checks <i>after</i> the first division; double-check with <code>Math.multiplyExact</code> or BigInteger on large n. Recipe: if n &lt; 3 return 0; fix /2 and /3 on factors; return x·y·z.</p>`
    ],
    solution: {
      approach: `<p>count = C(n, 3). Cancel the 2 and 3 of the denominator against the factors before multiplying so nothing overflows.</p>`,
      code: `
class Solution {
    static long tripleLoopCount(long n) {
        if (n < 3) return 0;
        long[] f = {n, n - 1, n - 2};
        // cancel the 2: at least one of two neighbours is even
        for (int t = 0; t < 3; t++) if (f[t] % 2 == 0) { f[t] /= 2; break; }
        // cancel the 3: one of three consecutive numbers is a multiple of 3
        for (int t = 0; t < 3; t++) if (f[t] % 3 == 0) { f[t] /= 3; break; }
        return f[0] * f[1] * f[2];          // <= 4.5e18, fits in long
    }

    public static void main(String[] args) {
        System.out.println(tripleLoopCount(5));          // 10
        System.out.println(tripleLoopCount(3_000_000));  // 4499995500001000000
        System.out.println(java.math.BigInteger.valueOf(3_000_000).multiply(java.math.BigInteger.valueOf(2_999_999))
            .multiply(java.math.BigInteger.valueOf(2_999_998)).divide(java.math.BigInteger.valueOf(6))); // same, via BigInteger
    }
}`,
      dry: {
        head: ['step', 'factors', 'note'],
        rows: [['start (n = 5)', '[5, 4, 3]', ''], ['cancel 2', '[5, 2, 3]', '4 is even'], ['cancel 3', '[5, 2, 1]', '3 is a multiple of 3'], ['multiply', H.c('p', '10'), '= C(5,3)']]
      },
      complexity: `<p><b>Time O(1)</b>, <b>space O(1)</b>. The loop itself is Θ(n<sup>3</sup>).</p>`,
      followUps: ['Generalise to d nested loops i₁ &lt; i₂ &lt; … &lt; i<sub>d</sub>: C(n, d).', 'What if the loops were j ≥ i and k ≥ j (non-strict)? (Combinations with repetition: C(n+2, 3).)']
    }
  });

  practice.push({
    title: 'Bulb Switcher (Harmonic Loop → √N)',
    level: 'Medium',
    tags: ['harmonic series', 'square root', 'divisors'],
    companies: ['Microsoft', 'Amazon'],
    statement: `<p>There are <code>n</code> bulbs, all off. In round i (1 ≤ i ≤ n) you toggle every i-th bulb (bulbs i, 2i, 3i, …). How many bulbs are on after n rounds?</p>`,
    constraints: `0 ≤ n ≤ 10<sup>18</sup>`,
    example: `<p>n = 10:</p>
${H.table(['bulb', 'toggled in rounds (its divisors)', 'toggles', 'final'], [['1', '1', '1', H.c('g', 'on')], ['2', '1, 2', '2', 'off'], ['4', '1, 2, 4', '3', H.c('g', 'on')], ['6', '1, 2, 3, 6', '4', 'off'], ['9', '1, 3, 9', '3', H.c('g', 'on')]])}
<p>Bulbs 1, 4, 9 stay on → ${H.c('p', '<b>3</b>')}.</p>`,
    brute: {
      why: `<p>Simulate: round i touches n/i bulbs, total n/1 + n/2 + … + n/n ≈ n ln n (harmonic loop). For n = 10<sup>18</sup> that is ~4·10<sup>19</sup> operations — and a boolean array of 10<sup>18</sup> entries cannot even be allocated. Wasted work: we only care about the <b>parity</b> of each bulb's number of divisors.</p>`,
      code: `
int bruteBulbs(int n) {
    boolean[] on = new boolean[n + 1];
    for (int i = 1; i <= n; i++)
        for (int j = i; j <= n; j += i)   // harmonic loop: n/1 + n/2 + ... + n/n
            on[j] = !on[j];
    int count = 0;
    for (int j = 1; j <= n; j++) if (on[j]) count++;
    return count;
}`
    },
    mcq: {
      q: 'A bulb ends up ON exactly when it is toggled an odd number of times. Which numbers have an odd number of divisors?',
      options: ['Primes', 'Even numbers', 'Perfect squares', 'Powers of two'],
      answer: 2,
      explain: 'Divisors come in pairs (d, k/d). The pair collapses into one divisor only when d = k/d, i.e. k = d² — so only perfect squares have an odd count. The answer is the number of squares ≤ n = ⌊√n⌋.'
    },
    hints: [
      `<p>Bulb k is toggled once for each divisor of k. Final state = ON iff the number of divisors is odd.</p>`,
      `<p>Divisors pair up as (d, k/d); only perfect squares have an unpaired divisor (√k). Count the perfect squares 1, 4, 9, … ≤ n.</p>`,
      `<p>That count is ⌊√n⌋. Compute it exactly for n up to 10<sup>18</sup>: take <code>(long)Math.sqrt(n)</code> then correct with integer checks (see Integer Square Root). n = 0 → 0.</p>`
    ],
    solution: {
      approach: `<p>Only perfect squares stay on; answer = ⌊√n⌋ with integer correction.</p>`,
      code: `
class Solution {
    static long bulbSwitch(long n) {
        long r = (long) Math.sqrt((double) n);
        while (r > 0 && r > n / r) r--;            // fix double rounding up
        while ((r + 1) <= n / (r + 1)) r++;        // fix double rounding down
        return r;                                  // number of squares 1, 4, 9, ... <= n
    }

    public static void main(String[] args) {
        System.out.println(bulbSwitch(10));                         // 3
        System.out.println(bulbSwitch(0));                          // 0
        System.out.println(bulbSwitch(999_999_999_999_999_999L));   // 999999999
    }
}`,
      dry: {
        head: ['n', '(long) Math.sqrt(n)', 'corrections', 'answer'],
        rows: [['10', '3', '3 ≤ 10/3 ✓; 4 ≤ 10/4? no', H.c('p', '3')], ['999…9 (18 nines)', '1,000,000,000', 'r &gt; n/r → r−− once', H.c('p', '999,999,999')]]
      },
      complexity: `<p><b>Time O(1)</b> (a square root plus at most a couple of corrections). <b>Space O(1)</b>. The simulation is O(n log n) time and O(n) memory.</p>`,
      followUps: ['Count numbers ≤ n with exactly 3 divisors (squares of primes).', 'Which bulbs are on if round i toggles only bulbs i, 2i, … but round 1 is skipped?']
    }
  });

  practice.push({
    title: 'Minimum Moves to Reach Target (Double or +1)',
    level: 'Medium',
    tags: ['greedy', 'logarithm', 'halving'],
    companies: ['Google', 'Amazon'],
    statement: `<p>You start with the number 1. In one move you can <b>add 1</b> or <b>double</b> the number, but you can double at most <code>maxDoubles</code> times. Return the minimum number of moves to reach exactly <code>target</code>.</p>`,
    constraints: `1 ≤ target ≤ 10<sup>9</sup>, 0 ≤ maxDoubles ≤ 100`,
    example: `<p>target = 19, maxDoubles = 2 → ${H.c('p', '<b>7</b>')}: 1 → 2 → 3 → 4 (+1 ×3), → 8 (double), → 9 (+1), → 18 (double), → 19 (+1).</p>
<p>Going <b>backwards</b> from 19 is easier: odd → subtract 1, even → halve (while doubles remain): 19 → 18 → 9 → 8 → 4, then 3 more −1 steps to reach 1. Moves = 1 + 1 + 1 + 1 + 3 = 7.</p>`,
    brute: {
      why: `<p>BFS over (value, doubles used) states: values up to 10<sup>9</sup> × 101 double-counts = 10<sup>11</sup> states — impossible in time and memory. Wasted work: a greedy rule decides every step, and each halving shrinks the number, so only O(log target) real decisions exist.</p>`,
      code: `
int bruteBfs(int target, int maxDoubles) {
    // state = value * (maxDoubles + 1) + doublesUsed ; fine only for tiny targets
    int states = (target + 1) * (maxDoubles + 1);
    int[] dist = new int[states];
    Arrays.fill(dist, -1);
    ArrayDeque<int[]> q = new ArrayDeque<>();
    q.add(new int[]{1, 0});
    dist[1 * (maxDoubles + 1)] = 0;
    while (!q.isEmpty()) {
        int[] cur = q.poll();
        int v = cur[0], d = cur[1], here = dist[v * (maxDoubles + 1) + d];
        if (v == target) return here;
        int[][] next = {{v + 1, d}, {v * 2, d + 1}};
        for (int[] nx : next) {
            if (nx[0] > target || nx[1] > maxDoubles) continue;
            int id = nx[0] * (maxDoubles + 1) + nx[1];
            if (dist[id] == -1) { dist[id] = here + 1; q.add(nx); }
        }
    }
    return -1;
}`
    },
    mcq: {
      q: 'Working backwards from the target, when should you use a "halve" move?',
      options: ['Never', 'Whenever the number is even and doubles remain — halving removes the most distance', 'Only at the very end', 'Only when the number is odd'],
      answer: 1,
      explain: 'Halving a large even number removes half its value in one move; using doubles while the number is big saves the most +1 moves. Odd numbers must first lose 1 to become halvable.'
    },
    hints: [
      `<p>Reverse the process: from target, the reverse moves are "−1" and "halve (if even)". Halving big numbers is far more valuable than halving small ones, so spend doubles early in reverse.</p>`,
      `<p>Loop while target &gt; 1 and maxDoubles &gt; 0: if odd → target−−, moves++; else → target /= 2, maxDoubles−−, moves++. After the loop, add target − 1 for the remaining −1 steps.</p>`,
      `<p>Edge cases: maxDoubles = 0 → answer target − 1 (an AP of +1 steps); target = 1 → 0. Without the "add target − 1 at once" shortcut, a target of 10<sup>9</sup> with 0 doubles would loop 10<sup>9</sup> times. The loop runs at most about 2·log₂ target times.</p>`
    ],
    solution: {
      approach: `<p>Greedy in reverse: halve when even (while doubles remain), otherwise subtract 1; finish the rest with one subtraction.</p>`,
      code: `
class Solution {
    static int minMoves(int target, int maxDoubles) {
        int moves = 0;
        while (target > 1 && maxDoubles > 0) {
            if (target % 2 == 1) {
                target--;               // make it even
            } else {
                target /= 2;            // reverse of a double
                maxDoubles--;
            }
            moves++;
        }
        return moves + (target - 1);    // only +1 moves remain: jump straight to 1
    }

    public static void main(String[] args) {
        System.out.println(minMoves(19, 2));           // 7
        System.out.println(minMoves(10, 4));           // 4
        System.out.println(minMoves(1_000_000_000, 0)); // 999999999
    }
}`,
      dry: {
        head: ['target', 'doubles left', 'action', 'moves'],
        rows: [['19', '2', 'odd → 18', '1'], ['18', '2', 'even → 9', '2'], ['9', '1', 'odd → 8', '3'], ['8', '1', 'even → 4', '4'], ['4', '0', 'no doubles: + (4 − 1)', H.c('p', '7')]]
      },
      complexity: `<p><b>Time O(min(maxDoubles, log target))</b> loop iterations (each halving needs at most one −1 before it). <b>Space O(1)</b>.</p>`,
      followUps: ['Unlimited doubles: the answer is (bit length − 1) + (number of 1-bits − 1). Why?', 'Allow "triple" moves too.']
    }
  });

  practice.push({
    title: 'Total Digits to Number Pages 1..N',
    level: 'Medium',
    tags: ['logarithm', 'grouping', 'GP'],
    companies: ['Adobe', 'Amazon'],
    statement: `<p>A printer numbers the pages of a book 1, 2, 3, …, N. How many digits does it print in total?</p>`,
    constraints: `1 ≤ N ≤ 10<sup>17</sup> (the answer fits in a <code>long</code>)`,
    example: `<p>N = 13 → pages 1–9 use 1 digit each (${H.c('b', '9 digits')}), pages 10–13 use 2 digits each (${H.c('y', '8 digits')}). Total ${H.c('p', '<b>17</b>')}.</p>
${H.table(['digit length d', 'pages', 'count', 'digits'], [['1', '1–9', '9', '9'], ['2', '10–13', '4', '8'], ['total', '', '', H.c('p', '17')]])}`,
    brute: {
      why: `<p>For each page count its digits: O(N · log N) ≈ 10<sup>17</sup> × 17 steps — impossible. Wasted work: all 900 three-digit pages contribute 3 each; groups by digit length are a GP (9, 90, 900, …) and there are only 17 of them.</p>`,
      code: `
long bruteDigits(long n) {
    long total = 0;
    for (long p = 1; p <= n; p++) {
        for (long x = p; x > 0; x /= 10) total++;   // digits of page p
    }
    return total;
}`
    },
    mcq: {
      q: 'How many pages have exactly d digits (when N is large enough)?',
      options: ['10<sup>d</sup>', '9 · 10<sup>d−1</sup>', 'd · 10', '2<sup>d</sup>'],
      answer: 1,
      explain: 'd-digit numbers run from 10<sup>d−1</sup> to 10<sup>d</sup> − 1: that is 10<sup>d</sup> − 10<sup>d−1</sup> = 9·10<sup>d−1</sup> numbers (9, 90, 900, …).'
    },
    hints: [
      `<p>Group pages by digit length: [1, 9], [10, 99], [100, 999], … Each group starts at a power of 10.</p>`,
      `<p>Loop with <code>start</code> = 1, 10, 100, … and <code>d</code> = 1, 2, 3, …: group end = min(N, 10·start − 1); add d × (end − start + 1).</p>`,
      `<p>Traps: the last group is cut short by N; stop when start &gt; N; with N ≤ 10<sup>17</sup>, 10·start stays ≤ 10<sup>18</sup> — fits a long (for N up to 10<sup>18</sup> you would overflow both start and the total). Recipe: total = 0, start = 1, d = 1; while start ≤ N: end = min(N, start·10 − 1); total += d·(end − start + 1); start *= 10; d++.</p>`
    ],
    solution: {
      approach: `<p>Sum over digit-length groups: about log₁₀ N groups, each O(1).</p>`,
      code: `
class Solution {
    static long totalDigits(long n) {
        long total = 0, start = 1;
        int d = 1;
        while (start <= n) {
            long end = Math.min(n, start * 10 - 1);   // last page with d digits
            total += (long) d * (end - start + 1);    // every page in the group prints d digits
            start *= 10;
            d++;
        }
        return total;
    }

    public static void main(String[] args) {
        System.out.println(totalDigits(13));    // 17
        System.out.println(totalDigits(100));   // 192
        System.out.println(totalDigits(100_000_000_000_000_000L)); // 10^17 pages
    }
}`,
      dry: {
        head: ['d', 'start', 'end = min(N, 10·start − 1)', 'added', 'total'],
        rows: [['1', '1', '9', '9', '9'], ['2', '10', 'min(13, 99) = 13', '2·4 = 8', '17'], ['3', '100', '— (100 &gt; 13: stop)', '—', H.c('p', '17')]]
      },
      complexity: `<p><b>Time O(log₁₀ N)</b> — at most 18 groups. <b>Space O(1)</b>.</p>`,
      followUps: ['Reverse question: given the total digits D, how many pages does the book have?', 'Count how many times the digit 7 is printed.']
    }
  });

  practice.push({
    title: 'Nth Digit of 123456789101112…',
    level: 'Medium',
    tags: ['grouping', 'GP', 'logarithm'],
    companies: ['Google', 'Microsoft', 'Amazon'],
    statement: `<p>Write all positive integers one after another: <code>123456789101112131415…</code>. Return the <code>n</code>-th digit (1-indexed) of this infinite string.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>15</sup>`,
    example: `<p>n = 3 → ${H.c('p', '<b>3</b>')}. n = 11 → the string is 1 2 3 4 5 6 7 8 9 ${H.c('b', '1 0')} ${H.c('y', '1 1')} …, digit 11 is the "0" of 10 → ${H.c('p', '<b>0</b>')}.</p>`,
    brute: {
      why: `<p>Build the string (or walk number by number, subtracting digit counts) until you reach n: for n = 10<sup>15</sup> that is ~7·10<sup>13</sup> numbers → hours, and the string would need petabytes. Wasted work: whole blocks (all 2-digit numbers = 180 digits, all 3-digit = 2700 digits …) can be skipped at once.</p>`,
      code: `
int bruteNthDigit(long n) {
    for (long num = 1; ; num++) {
        String s = Long.toString(num);
        if (n <= s.length()) return s.charAt((int) (n - 1)) - '0';
        n -= s.length();          // skip this whole number
    }
}`
    },
    mcq: {
      q: 'How many digits do all 3-digit numbers (100..999) contribute together?',
      options: ['900', '2700', '999', '300'],
      answer: 1,
      explain: '900 numbers × 3 digits = 2700. In general block d contributes 9·10<sup>d−1</sup>·d digits.'
    },
    hints: [
      `<p>Skip whole blocks: block d (numbers with d digits) has 9·10<sup>d−1</sup> numbers and 9·10<sup>d−1</sup>·d digits. While n is bigger than the block's size, subtract it and move to the next block.</p>`,
      `<p>Inside block d starting at <code>start</code> = 10<sup>d−1</sup>: the target number is start + (n − 1)/d, and the digit index inside it is (n − 1) % d.</p>`,
      `<p>Traps: use <code>long</code> — 9·10<sup>d−1</sup>·d overflows int already at d = 9; keep n 1-indexed carefully (subtract 1 before dividing). Recipe: d = 1, count = 9, start = 1; while n &gt; d·count: n −= d·count; d++; count *= 10; start *= 10. num = start + (n−1)/d; return digit (n−1) % d of num.</p>`
    ],
    solution: {
      approach: `<p>Skip blocks of equal digit length (a GP of block sizes), then index directly into the right number.</p>`,
      code: `
class Solution {
    static int findNthDigit(long n) {
        long d = 1, count = 9, start = 1;     // block of 1-digit numbers: 1..9
        while (n > d * count) {               // whole block lies before the answer
            n -= d * count;
            d++;
            count *= 10;                      // 9, 90, 900, ...
            start *= 10;                      // 1, 10, 100, ...
        }
        long num = start + (n - 1) / d;       // the number containing the digit
        String s = Long.toString(num);
        return s.charAt((int) ((n - 1) % d)) - '0';
    }

    public static void main(String[] args) {
        System.out.println(findNthDigit(3));    // 3
        System.out.println(findNthDigit(11));   // 0
        System.out.println(findNthDigit(190));  // 1  (first digit of 100)
    }
}`,
      dry: {
        head: ['n', 'd', 'block digits d·count', 'action'],
        rows: [['11', '1', '9', '11 &gt; 9 → n = 2, d = 2, start = 10'], ['2', '2', '180', '2 ≤ 180 → stop'], ['—', '—', '—', 'num = 10 + (2−1)/2 = 10, index (2−1)%2 = 1 → ' + H.c('p', '0')]]
      },
      complexity: `<p><b>Time O(log₁₀ n)</b> — at most ~15 blocks. <b>Space O(1)</b> (a short string for one number).</p>`,
      followUps: ['Return the digit in base 2 concatenation (1 10 11 100 …).', 'What is the sum of the first n digits of the sequence?']
    }
  });

  // =====================================================================
  // PRACTICE — Hard
  // =====================================================================
  practice.push({
    title: 'Count the Harmonic Loop: Σ ⌊N / i⌋ for N up to 10¹²',
    level: 'Hard',
    tags: ['harmonic series', 'sqrt decomposition', 'loop counting'],
    companies: ['Google', 'Codeforces-style'],
    statement: `<p>Return the exact number of times <code>count++</code> runs:</p>
<pre>for (long i = 1; i &lt;= n; i++)
    for (long j = i; j &lt;= n; j += i)
        count++;</pre>
<p>Equivalently: the number of pairs (i, k) of positive integers with i·k ≤ n, or Σ<sub>i=1..n</sub> ⌊n/i⌋.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>12</sup>`,
    example: `<p>n = 10: ⌊10/i⌋ for i = 1..10 is ${H.arr([10, 5, 3, 2, 2, 1, 1, 1, 1, 1], { start: 1, hl: { 3: 'y', 4: 'y', 5: 'b', 6: 'b', 7: 'b', 8: 'b', 9: 'b' } })}</p>
<p>Sum = ${H.c('p', '<b>27</b>')}. Notice the long runs of equal values (${H.c('y', '2, 2')}, ${H.c('b', '1, 1, 1, 1, 1')}) — that is the key.</p>`,
    brute: {
      why: `<p>Running the loops is ≈ n ln n ≈ 2.8·10<sup>13</sup> steps. Even the smarter O(n) sum of ⌊n/i⌋ is 10<sup>12</sup> divisions ≈ hours. Wasted work: ⌊n/i⌋ takes only about 2√n <b>distinct values</b> (2·10<sup>6</sup> for n = 10<sup>12</sup>), and long stretches of i share the same value.</p>`,
      code: `
long bruteSum(long n) {
    long total = 0;
    for (long i = 1; i <= n; i++) total += n / i;   // O(n): 10^12 iterations for the max n
    return total;
}`
    },
    mcq: {
      q: 'For n = 10<sup>12</sup>, roughly how many different values does ⌊n/i⌋ take as i goes from 1 to n?',
      options: ['About 10<sup>12</sup>', 'About 2·10<sup>6</sup>', 'About 40', 'Exactly 2'],
      answer: 1,
      explain: 'For i ≤ √n the values n/i are all different (≤ 10<sup>6</sup> of them). For i &gt; √n, n/i &lt; √n, so there are at most √n more values. Total ≤ 2√n = 2·10<sup>6</sup>.'
    },
    hints: [
      `<p>Fix q = ⌊n/i⌋. The <b>largest</b> i' with the same quotient is i' = ⌊n/q⌋. So all of i..i' contribute q each: add q·(i' − i + 1) and jump to i' + 1.</p>`,
      `<p>Each jump lands on a new distinct quotient, and there are at most 2√n of them → O(√n) iterations ≈ 2·10<sup>6</sup>. Use <code>long</code> everywhere.</p>`,
      `<p>Check: n = 10 → blocks [1,1]→10, [2,2]→5, [3,3]→3, [4,5]→2, [6,10]→1 → 10 + 5 + 3 + 4 + 5 = 27. Total ≈ n ln n ≈ 2.8·10<sup>13</sup> fits easily. Recipe: i = 1; while i ≤ n: q = n/i; last = n/q; total += q·(last − i + 1); i = last + 1.</p>`
    ],
    solution: {
      approach: `<p>Block decomposition over equal quotients ("√n trick"): O(√n) blocks, O(1) work each.</p>`,
      code: `
class Solution {
    static long harmonicCount(long n) {
        long total = 0;
        for (long i = 1; i <= n; ) {
            long q = n / i;              // the quotient for this block
            long last = n / q;           // last index with the same quotient
            total += q * (last - i + 1); // whole block at once
            i = last + 1;                // jump to the next distinct quotient
        }
        return total;
    }

    public static void main(String[] args) {
        System.out.println(harmonicCount(10));                   // 27
        System.out.println(harmonicCount(1_000_000_000_000L));   // ~2.8e13
    }
}`,
      dry: {
        head: ['i', 'q = ⌊10/i⌋', 'last = ⌊10/q⌋', 'added', 'total'],
        rows: [['1', '10', '1', '10', '10'], ['2', '5', '2', '5', '15'], ['3', '3', '3', '3', '18'], ['4', '2', '5', '2·2 = 4', '22'], ['6', '1', '10', '1·5 = 5', H.c('p', '27')]]
      },
      complexity: `<p><b>Time O(√n)</b> ≈ 2·10<sup>6</sup> iterations for n = 10<sup>12</sup>. <b>Space O(1)</b>.</p>`,
      followUps: ['Σ i·⌊n/i⌋ (sum of divisors of all numbers up to n) with the same blocks and an AP sum per block.', 'Answer modulo 10<sup>9</sup>+7 for n up to 10<sup>15</sup>.']
    }
  });

  practice.push({
    title: 'Geometric Series Modulo Any m',
    level: 'Hard',
    tags: ['GP', 'divide and conquer', 'modular arithmetic', 'logarithm'],
    companies: ['Google', 'DE Shaw'],
    statement: `<p>Compute S = 1 + r + r<sup>2</sup> + … + r<sup>n−1</sup> modulo <code>m</code>. Note: <code>m</code> is <b>not</b> necessarily prime, so you cannot rely on dividing by (r − 1).</p>`,
    constraints: `0 ≤ n ≤ 10<sup>18</sup>, 0 ≤ r ≤ 10<sup>9</sup>, 1 ≤ m ≤ 10<sup>9</sup>`,
    example: `<p>r = 2, n = 5, m = 100 → 1 + 2 + 4 + 8 + 16 = 31 → ${H.c('p', '<b>31</b>')}.</p>
<p>r = 3, n = 4, m = 6 → 1 + 3 + 9 + 27 = 40 → 40 mod 6 = ${H.c('p', '<b>4</b>')}. The formula (3<sup>4</sup> − 1)/(3 − 1) needs "divide by 2 mod 6", which ${H.c('r', 'does not exist')} (2 has no inverse mod 6).</p>`,
    brute: {
      why: `<p>Add the n terms one by one: O(n) = 10<sup>18</sup> steps. The closed form a(r<sup>n</sup> − 1)/(r − 1) needs a modular inverse of (r − 1), which exists only when gcd(r − 1, m) = 1 — false for many m (and r = 1 divides by zero). Wasted work: the second half of the series is just the first half multiplied by r<sup>n/2</sup>.</p>`,
      code: `
long bruteGp(long r, long n, long m) {
    long sum = 0, term = 1 % m;
    for (long i = 0; i < n; i++) {
        sum = (sum + term) % m;
        term = term * (r % m) % m;
    }
    return sum;
}`
    },
    mcq: {
      q: 'S(2k) = 1 + r + … + r<sup>2k−1</sup>. Which identity lets us halve the problem?',
      options: ['S(2k) = 2·S(k)', 'S(2k) = S(k) · (1 + r<sup>k</sup>)', 'S(2k) = S(k)<sup>2</sup>', 'S(2k) = r · S(k)'],
      answer: 1,
      explain: 'Split into the first k terms S(k) and the last k terms r<sup>k</sup>·S(k). Factor out S(k): S(k)(1 + r<sup>k</sup>). Only multiplications and additions — valid for every modulus.'
    },
    hints: [
      `<p>Even n: S(n) = S(n/2)·(1 + r<sup>n/2</sup>). Odd n: S(n) = 1 + r·S(n − 1). Both use only + and ×, so they work mod any m.</p>`,
      `<p>Return a pair (S(n), r<sup>n</sup>) from the recursion so the power is not recomputed: even → (s(1 + p), p²); odd → (1 + r·s, p·r). Depth ≤ 2·log₂ n ≈ 120 — safe for the call stack.</p>`,
      `<p>Traps: m = 1 → everything is 0 (take % m after every operation, including the "1 +"); reduce r mod m first; values &lt; 10<sup>9</sup> so products &lt; 10<sup>18</sup> fit in long; n = 0 → S = 0, r<sup>0</sup> = 1. Base case f(0) = (0, 1 % m).</p>`
    ],
    solution: {
      approach: `<p>Divide and conquer on n that returns both the partial sum and the power; O(log n) steps, no division needed.</p>`,
      code: `
class Solution {
    static long R, M;

    // returns {S(n) mod M, R^n mod M}
    static long[] gp(long n) {
        if (n == 0) return new long[]{0, 1 % M};
        if (n % 2 == 1) {
            long[] t = gp(n - 1);                         // S(n-1), R^(n-1)
            long s = (1 + R * t[0]) % M;                  // S(n) = 1 + R * S(n-1)
            long p = t[1] * R % M;                        // R^n
            return new long[]{s, p};
        }
        long[] h = gp(n / 2);                             // S(n/2), R^(n/2)
        long s = h[0] * ((1 + h[1]) % M) % M;             // S(n) = S(n/2) * (1 + R^(n/2))
        long p = h[1] * h[1] % M;                         // R^n = (R^(n/2))^2
        return new long[]{s, p};
    }

    static long gpSum(long r, long n, long m) {
        M = m;
        R = r % m;
        return gp(n)[0];
    }

    public static void main(String[] args) {
        System.out.println(gpSum(2, 5, 100));                         // 31
        System.out.println(gpSum(3, 4, 6));                           // 4
        System.out.println(gpSum(1, 1_000_000_000_000_000_000L, 1_000_000_000L)); // 10^18 mod 10^9 = 0
        System.out.println(gpSum(7, 1_000_000_000_000_000_000L, 999_999_937L));   // fast even for n = 10^18
    }
}`,
      dry: {
        head: ['call', 'rule', 'S', 'rⁿ'],
        rows: [['gp(0)', 'base', '0', '1'], ['gp(1)', 'odd: 1 + 2·0', '1', '2'], ['gp(2)', 'even: 1·(1+2)', '3', '4'], ['gp(4)', 'even: 3·(1+4)', '15', '16'], ['gp(5)', 'odd: 1 + 2·15', H.c('p', '31'), '32']]
      },
      complexity: `<p><b>Time O(log n)</b>: every two levels at least halve n, so ≤ 2·log₂ n ≈ 120 calls. <b>Space O(log n)</b> recursion stack (≈ 120 frames — tiny).</p>`,
      followUps: ['Write it iteratively over the bits of n.', 'Compute Σ k·r<sup>k</sup> mod m the same way (track one more quantity).', 'Use 2×2 matrix exponentiation: [[r, 1], [0, 1]]<sup>n</sup> contains S(n).']
    }
  });

  practice.push({
    title: 'Preimage Size of Factorial Zeroes',
    level: 'Hard',
    tags: ['logarithm', 'binary search', 'GP', 'math'],
    companies: ['Adobe', 'Amazon'],
    statement: `<p>Let z(x) be the number of trailing zeroes of x! (for example z(3) = 0 since 3! = 6, z(11) = 2 since 11! = 39916800). Given <code>k</code>, return how many non-negative integers x have z(x) = k.</p>`,
    constraints: `0 ≤ k ≤ 10<sup>9</sup>`,
    example: `<p>k = 0 → x ∈ {0, 1, 2, 3, 4} → ${H.c('p', '<b>5</b>')}. k = 5 → ${H.c('p', '<b>0</b>')}: z(24) = 4 but z(25) = 6 — it jumps over 5 because 25 = 5·5 adds <b>two</b> factors of 5.</p>
${H.table(['x', '20–24', '25–29'], [['z(x) = ⌊x/5⌋ + ⌊x/25⌋', '4', H.c('r', '6')]])}`,
    brute: {
      why: `<p>Walk x = 0, 1, 2, … computing z(x) until it exceeds k. Since z(x) ≈ x/4, that is about 4k ≈ 4·10<sup>9</sup> values, each costing O(log₅ x) → ~5·10<sup>10</sup> operations → TLE. Wasted work: z(x) is non-decreasing, so we can binary search instead of walking.</p>`,
      code: `
long z(long x) {
    long c = 0;
    for (long p = 5; p <= x; p *= 5) c += x / p;   // log_5(x) terms
    return c;
}

long brute(long k) {
    long count = 0;
    for (long x = 0; ; x++) {
        long zx = z(x);
        if (zx == k) count++;
        else if (zx > k) return count;
    }
}`
    },
    mcq: {
      q: 'Why is the answer always either 0 or 5?',
      options: ['Because factorials end in 0 or 5', 'z(x) only changes at multiples of 5, so equal values come in blocks of exactly 5 (or a value is skipped)', 'Because k ≤ 10<sup>9</sup>', 'It can be any number'],
      answer: 1,
      explain: 'x!, (x+1)!, … only gain factors of 5 when the new factor is a multiple of 5. So z is constant on blocks 5j..5j+4. Either some block has value k (5 numbers) or the jump at a multiple of 25 skips k (0 numbers).'
    },
    hints: [
      `<p>Legendre's formula: z(x) = ⌊x/5⌋ + ⌊x/25⌋ + ⌊x/125⌋ + … — a GP of divisors, only log₅ x ≈ 14 terms. z is non-decreasing in x.</p>`,
      `<p>Let lb(k) = smallest x with z(x) ≥ k (binary search on x in [0, 5k]). The number of x with z(x) = k is lb(k + 1) − lb(k).</p>`,
      `<p>Why 5k is a safe upper bound: z(5k) ≥ ⌊5k/5⌋ = k. Use <code>long</code> (5·(10<sup>9</sup> + 1) &gt; int range). Recipe: lb(t): lo = 0, hi = 5t; while lo &lt; hi: mid = (lo + hi)/2; if z(mid) &lt; t → lo = mid + 1 else hi = mid. Answer = lb(k+1) − lb(k).</p>`
    ],
    solution: {
      approach: `<p>Binary search on x over a monotone function computed in O(log x); answer = lowerBound(k+1) − lowerBound(k).</p>`,
      code: `
class Solution {
    // trailing zeroes of x!  (Legendre: count factors of 5)
    static long z(long x) {
        long c = 0;
        while (x > 0) {
            x /= 5;           // x/5 + x/25 + x/125 + ...
            c += x;
        }
        return c;
    }

    // smallest x with z(x) >= t
    static long lowerBound(long t) {
        long lo = 0, hi = 5 * t;
        while (lo < hi) {
            long mid = lo + (hi - lo) / 2;
            if (z(mid) < t) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }

    static int preimageSizeFZF(long k) {
        return (int) (lowerBound(k + 1) - lowerBound(k));
    }

    public static void main(String[] args) {
        System.out.println(preimageSizeFZF(0));            // 5
        System.out.println(preimageSizeFZF(5));            // 0
        System.out.println(preimageSizeFZF(3));            // 5
        System.out.println(preimageSizeFZF(1_000_000_000)); // 5
    }
}`,
      dry: {
        head: ['query', 'lowerBound', 'meaning'],
        rows: [['k = 5', 'lb(5) = 25', 'z(24) = 4, z(25) = 6 ≥ 5'], ['k + 1 = 6', 'lb(6) = 25', 'z(25) = 6 ≥ 6'], ['answer', H.c('p', '25 − 25 = 0'), 'value 5 is skipped']]
      },
      complexity: `<p><b>Time O(log k · log k)</b>: two binary searches of ~log₂(5k) ≈ 33 steps, each computing z in ≈ 14 divisions. <b>Space O(1)</b>.</p>`,
      followUps: ['Trailing zeroes of x! in base 12 = 2²·3 (count factors of 2 and 3, take the bottleneck).', 'Smallest x whose factorial has at least k trailing zeroes (that is just lowerBound(k)).']
    }
  });

  practice.push({
    title: 'Smallest Good Base',
    level: 'Hard',
    tags: ['GP', 'logarithm', 'overflow', 'math'],
    companies: ['Google', 'Amazon'],
    statement: `<p>A base k ≥ 2 is <b>good</b> for n if every digit of n written in base k is 1, i.e. n = 1 + k + k<sup>2</sup> + … + k<sup>m</sup> for some m ≥ 1. Given n, return the <b>smallest</b> good base.</p>`,
    constraints: `3 ≤ n ≤ 10<sup>18</sup>`,
    example: `<p>n = 13 → ${H.c('p', '<b>3</b>')} since 13 = 111₃ = 1 + 3 + 9.</p>
<p>n = 4681 → ${H.c('p', '<b>8</b>')} since 4681 = 11111₈ = 1 + 8 + 64 + 512 + 4096.</p>
<p>n = 10<sup>18</sup> → ${H.c('p', '<b>999999999999999999</b>')}: no base works with 3+ ones, but every n is "11" in base n − 1.</p>`,
    brute: {
      why: `<p>Try every base k = 2, 3, … , n − 1 and convert n to base k: up to 10<sup>18</sup> bases → impossible. Wasted work: the number of ones (m + 1) can only be from 2 to ~60 (because k ≥ 2 means 2<sup>m</sup> ≤ n), and for each fixed m there is at most <b>one</b> candidate k ≈ n<sup>1/m</sup>.</p>`,
      code: `
long bruteGoodBase(long n) {
    for (long k = 2; k < n; k++) {          // up to 10^18 candidate bases
        long x = n;
        boolean allOnes = true;
        while (x > 0) {
            if (x % k != 1) { allOnes = false; break; }
            x /= k;
        }
        if (allOnes) return k;
    }
    return n - 1;
}`
    },
    mcq: {
      q: 'If n = 1 + k + … + k<sup>m</sup> with k ≥ 2, what is the largest m worth trying for n ≤ 10<sup>18</sup>?',
      options: ['About 10<sup>9</sup>', 'About 60 (since 2<sup>m</sup> ≤ n)', 'About 18', 'Exactly 2'],
      answer: 1,
      explain: 'Even with the smallest base 2, the sum exceeds 2<sup>m</sup>. So 2<sup>m</sup> &lt; n ≤ 10<sup>18</sup> &lt; 2<sup>60</sup> → m ≤ 59. More ones means a smaller base, so try m from large to small.'
    },
    hints: [
      `<p>More digits ⇒ smaller base. So loop m (number of ones − 1) from ⌊log₂ n⌋ down to 2 and return the first base that works; if none, the answer is n − 1 (two ones).</p>`,
      `<p>For a fixed m, k<sup>m</sup> &lt; n &lt; (k + 1)<sup>m</sup>, so k = ⌊n<sup>1/m</sup>⌋. Compute it with <code>Math.pow</code>, then also test k − 1 and k + 1 to absorb floating-point error.</p>`,
      `<p>Check "1 + k + … + k<sup>m</sup> == n" without overflow: before multiplying, if cur &gt; (n − sum)/k the sum would exceed n → reject. Only bases k ≥ 2 count. Recipe: for m = 59..2: for k in {⌊n<sup>1/m</sup>⌋ − 1, ⌊n<sup>1/m</sup>⌋, ⌊n<sup>1/m</sup>⌋ + 1}: if k ≥ 2 and gpEquals(k, m, n) return k. Return n − 1.</p>`
    ],
    solution: {
      approach: `<p>Try every possible length of the all-ones representation (≤ 60), derive the only possible base from n<sup>1/m</sup>, verify the GP sum exactly with overflow-safe arithmetic.</p>`,
      code: `
class Solution {
    // does 1 + k + k^2 + ... + k^m equal n exactly? (overflow-safe)
    static boolean gpEquals(long k, int m, long n) {
        long sum = 1, cur = 1;
        for (int i = 1; i <= m; i++) {
            if (cur > (n - sum) / k) return false;   // cur*k would push sum past n
            cur *= k;
            sum += cur;
        }
        return sum == n;
    }

    static String smallestGoodBase(String s) {
        long n = Long.parseLong(s);
        int maxM = 63 - Long.numberOfLeadingZeros(n);      // floor(log2 n)
        for (int m = maxM; m >= 2; m--) {                   // more ones first = smaller base
            long k = (long) Math.pow(n, 1.0 / m);
            for (long cand = k - 1; cand <= k + 1; cand++) {
                if (cand >= 2 && gpEquals(cand, m, n)) return Long.toString(cand);
            }
        }
        return Long.toString(n - 1);                        // "11" in base n-1 always works
    }

    public static void main(String[] args) {
        System.out.println(smallestGoodBase("13"));                   // 3
        System.out.println(smallestGoodBase("4681"));                 // 8
        System.out.println(smallestGoodBase("1000000000000000000"));  // 999999999999999999
        System.out.println(smallestGoodBase("2251799813685247"));     // 2  (2^51 - 1)
    }
}`,
      dry: {
        head: ['m', 'k ≈ 13<sup>1/m</sup>', 'candidates', 'check'],
        rows: [['3', '2.35 → 2', '1, 2, 3', '1+2+4+8 = 15 ≠ 13; 1+3+9+27 &gt; 13'], ['2', '3.6 → 3', '2, 3, 4', '1+2+4 = 7; ' + H.c('g', '1+3+9 = 13 ✓')], ['—', '—', '—', H.c('p', 'return 3')]]
      },
      complexity: `<p><b>Time O(log² n)</b>: ≤ 60 values of m × 3 candidates × ≤ 60 multiplications ≈ 10<sup>4</sup> operations. <b>Space O(1)</b>.</p>`,
      followUps: ['Return the largest good base other than n − 1, if any.', 'Replace Math.pow with an integer binary search for k (fully exact).']
    }
  });

  // =====================================================================
  // QUIZ
  // =====================================================================
  quiz.push(
    { q: 'How many times does <code>count++</code> run? <code>for (i = 0; i &lt; n; i++) for (j = i + 1; j &lt; n; j++) count++;</code> with n = 6', options: ['36', '30', '15', '21'], answer: 2, explain: 'Inner counts are 5, 4, 3, 2, 1, 0 → 15 = 6·5/2. A triangle loop runs n(n−1)/2 times — still O(n<sup>2</sup>).' },
    { q: 'What is the time complexity of <code>for (i = n; i &gt; 0; i /= 2) for (j = 0; j &lt; i; j++) work();</code>?', options: ['O(n log n)', 'O(n)', 'O(log n)', 'O(n<sup>2</sup>)'], answer: 1, explain: 'The inner work is n + n/2 + n/4 + … &lt; 2n — a geometric series dominated by its first term. Multiplying "n × log n" is wrong because the inner loop shrinks.' },
    { q: '1 + 2 + 4 + 8 + … + 2<sup>k</sup> equals…', options: ['2<sup>k</sup>', '2<sup>k+1</sup> − 1', 'k·2<sup>k</sup>', '2<sup>k−1</sup> + 1'], answer: 1, explain: 'GP with r = 2: (2<sup>k+1</sup> − 1)/(2 − 1). The sum of all smaller powers of two is one less than the next power: 1 + 2 + 4 = 7 = 8 − 1.' },
    { q: 'Roughly how many times can you halve 10<sup>9</sup> before reaching 1?', options: ['9', '30', '1000', '31,623'], answer: 1, explain: '2<sup>10</sup> ≈ 10<sup>3</sup>, so 10<sup>9</sup> ≈ 2<sup>30</sup> → about 30 halvings (exactly ⌊log₂ 10<sup>9</sup>⌋ = 29).' },
    { q: 'Which statement about f(n) = 3n<sup>2</sup> + 100n is TRUE?', options: ['f is O(n) for large n', 'f is Θ(n<sup>2</sup>)', 'f is Ω(n<sup>3</sup>)', 'f is O(n<sup>2</sup>) only if n &lt; 100'], answer: 1, explain: 'For large n, 3n<sup>2</sup> ≤ f(n) ≤ 4n<sup>2</sup> (from n ≥ 100), so f is bounded above and below by multiples of n<sup>2</sup>: Θ(n<sup>2</sup>).' },
    { q: 'A function loops over array A (size N) and, for each element, over array B (size M). The best description is…', options: ['O(N<sup>2</sup>)', 'O(N + M)', 'O(N · M)', 'O(max(N, M))'], answer: 2, explain: 'Nested loops over two different inputs multiply: N·M. Sequential loops would add: N + M. Never merge different inputs into one letter.' },
    { q: 'What is the extra (auxiliary) space of recursive binary search on an array of N elements?', options: ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)'], answer: 1, explain: 'Each call halves the range, so the recursion is log₂ N deep, and each frame stays on the call stack until the deepest call returns. The iterative version is O(1).' },
    { q: 'N ≤ 2·10<sup>5</sup>, time limit 1 second. Which complexity is the intended one?', options: ['O(N<sup>2</sup>)', 'O(N log N)', 'O(2<sup>N</sup>)', 'O(N<sup>3</sup>)'], answer: 1, explain: 'N<sup>2</sup> = 4·10<sup>10</sup> → ~400× over the 10<sup>8</sup> budget. N log N ≈ 3.5·10<sup>6</sup> fits comfortably.' },
    { q: 'N ≤ 20. Which approach is most likely intended?', options: ['O(N log N) greedy only', 'Trying all 2<sup>N</sup> subsets (≈ 10<sup>6</sup>)', 'Nothing — N is too small to matter', 'A segment tree'], answer: 1, explain: 'A tiny limit like 20 is a loud clue that exponential work is allowed: 2<sup>20</sup> ≈ 10<sup>6</sup>, 2<sup>20</sup>·20 ≈ 2·10<sup>7</sup>.' },
    { q: 'Why can <code>(int) Math.log10(n) + 1</code> give the wrong digit count for n = 999,999,999,999,999,999?', options: ['log10 is not defined for long', 'Converting n to double rounds it up to 10<sup>18</sup>, so log10 returns exactly 18', 'Java truncates log10 to 15 digits', 'It is correct'], answer: 1, explain: 'A double has 53 bits of precision (~16 decimal digits). 10<sup>18</sup> − 1 is not representable and rounds to 10<sup>18</sup>, so the code prints 19. Count digits with integer division instead.' },
    { q: 'How many times does the body run? <code>for (i = 1; i &lt;= n; i++) for (j = i; j &lt;= n; j += i)</code>', options: ['Θ(n<sup>2</sup>)', 'Θ(n log n)', 'Θ(n)', 'Θ(n √n)'], answer: 1, explain: 'For each i the inner loop runs ⌊n/i⌋ times: n(1 + 1/2 + … + 1/n) ≈ n ln n — the harmonic series.' },
    { q: 'An algorithm needs a <code>long[10000][10000]</code> table. With a 256 MB memory limit…', options: ['Fine: 10<sup>8</sup> bytes', 'MLE: 10<sup>8</sup> longs × 8 bytes = 800 MB', 'Fine: Java compresses arrays', 'MLE only on 32-bit JVMs'], answer: 1, explain: '10<sup>4</sup> × 10<sup>4</sup> = 10<sup>8</sup> cells × 8 bytes = 800 MB. Look for a rolling-array or 1D reformulation.' },
    { q: 'Building a max-heap bottom-up does n/4·1 + n/8·2 + n/16·3 + … sift steps. Its complexity is…', options: ['O(n log n)', 'O(n)', 'O(log n)', 'O(n<sup>2</sup>)'], answer: 1, explain: 'The series Σ k/2<sup>k+1</sup> converges to a constant, so the total is O(n). Most nodes are near the bottom and sift only a short distance — a GP-style dominance argument.' }
  );

  // =====================================================================
  // INTERVIEW Q&A
  // =====================================================================
  interview.push(
    {
      q: 'What does Big-O notation mean, in plain words?', level: 'B',
      a: `<p>Big-O describes <b>how the running time (or memory) grows as the input grows</b>, ignoring constant factors and smaller terms. O(n) means "double the input, roughly double the work"; O(n<sup>2</sup>) means "double the input, four times the work". Formally, f(n) = O(g(n)) if f(n) ≤ c·g(n) for all n beyond some n₀ — it is an <b>upper bound</b>. In interviews "the complexity" usually means the worst-case upper bound, and people often say O when they mean the tight Θ.</p>`,
      followUps: ['Why do we drop constants?', 'Is O(2n) different from O(n)?', 'Give an O(1), O(log n) and O(n log n) operation from the Java collections.']
    },
    {
      q: 'Explain the difference between O, Ω and Θ with an example.', level: 'B',
      a: `<p><b>O</b> is an upper bound ("at most"), <b>Ω</b> a lower bound ("at least"), <b>Θ</b> both at once ("exactly this growth"). Linear search: the worst case is Θ(n) (scan everything), the best case is Θ(1) (first element). So "linear search is O(n)" and "linear search is Ω(1)" are both true statements about all inputs. Bounds are a separate idea from cases: you can give O, Ω or Θ for the best, worst or average case.</p>`,
      followUps: ['Is "merge sort is O(n<sup>2</sup>)" a true statement?', 'What is the Θ of insertion sort on already-sorted input?']
    },
    {
      q: 'How do you find the complexity of nested loops when the inner loop depends on the outer variable?', level: 'B',
      a: `<p>Fix the outer variable, count the inner iterations as a function of it, then <b>sum over all outer values</b>. If the inner loop runs i times, the total is 0 + 1 + … + (n−1) = n(n−1)/2 → O(n<sup>2</sup>). If it runs n/i times (step i), it is the harmonic series n·H<sub>n</sub> ≈ n ln n → O(n log n). If the work halves each round (n, n/2, …), it is a geometric series &lt; 2n → O(n). Writing a small table of values for n = 8 is the quickest sanity check.</p>`,
      followUps: ['What is the complexity if the inner loop is <code>for (j = 1; j &lt; i; j *= 2)</code>?', 'How does a two-pointer while loop end up O(n)?']
    },
    {
      q: 'Why is log n so common in complexities, and why does its base not matter?', level: 'B',
      a: `<p>log₂ n counts how many times you can halve n before reaching 1. Any algorithm that discards a constant fraction of the work per step — binary search, balanced tree descent, heap operations, fast exponentiation, divide and conquer depth — gets a log factor. The base does not matter in Big-O because log<sub>a</sub> n = log<sub>b</sub> n / log<sub>b</sub> a: changing base only multiplies by a constant. It is tiny in practice: log₂(10<sup>18</sup>) ≈ 60.</p>`,
      followUps: ['When does the base matter? (Hint: inside an exponent.)', 'How many comparisons does binary search need on 10<sup>9</sup> items?']
    },
    {
      q: 'What is space complexity, and does the input count?', level: 'B',
      a: `<p>Space complexity measures how much memory an algorithm uses as a function of input size. Usually we report <b>auxiliary space</b> — memory beyond the input (and often beyond the output). Arrays/maps you allocate, and the <b>recursion call stack</b>, count. Reversing an array in place with two pointers is O(1) auxiliary; copying it is O(n); a recursive DFS on a path of n nodes is O(n) because n frames are alive at once. Always state which convention you use.</p>`,
      followUps: ['Is recursive Fibonacci O(2<sup>n</sup>) space?', 'What is the space of merge sort vs heap sort?']
    },
    {
      q: 'Given constraints N ≤ 10<sup>5</sup>, how do you decide what complexity to aim for?', level: 'I',
      a: `<p>Use the rule of thumb of about <b>10<sup>8</sup> simple operations per second</b>. Plug N in: N<sup>2</sup> = 10<sup>10</sup> → ~100 s, too slow; N log N ≈ 1.7·10<sup>6</sup> and even N√N ≈ 3·10<sup>7</sup> are fine. So the target is O(N log N) or better — sorting, binary search, heaps, hashing, prefix sums. I also check other numbers: Q queries multiply per-query cost, "sum of N over all tests" bounds total work, value ranges decide <code>int</code> vs <code>long</code>, and the memory limit caps tables.</p>`,
      followUps: ['What would you aim for with N ≤ 500? N ≤ 20? N ≤ 10<sup>18</sup>?', 'Why is the 10<sup>8</sup> rule only approximate?']
    },
    {
      q: 'What is the difference between worst-case, average-case, amortised and expected complexity?', level: 'I',
      a: `<p><b>Worst case:</b> the maximum cost over all inputs of size n. <b>Average case:</b> the mean cost over a distribution of inputs (e.g. random arrays). <b>Expected:</b> the mean over the algorithm's own random choices, for the worst input (randomised quicksort: expected O(n log n) on every input). <b>Amortised:</b> a guarantee on the total cost of a sequence of operations divided by their count — ArrayList.add is O(1) amortised because the occasional O(n) resize is paid for by the many cheap adds (copies total 1 + 2 + 4 + … &lt; 2n).</p>`,
      followUps: ['Why is HashMap.get O(1) average but not worst case?', 'Prove that doubling gives O(1) amortised but growing by +10 does not.']
    },
    {
      q: 'Why is building a heap O(n) but inserting n items one by one O(n log n)?', level: 'I',
      a: `<p>One-by-one insertion sifts each new item <b>up</b> a path of length up to log n, and most items sit near the bottom, so the total is Θ(n log n) in the worst case. Bottom-up heapify sifts <b>down</b>, and a node's cost is its <i>height</i>: about n/2 leaves cost 0, n/4 nodes cost 1, n/8 cost 2… Total Σ (n/2<sup>k+1</sup>)·k = n·Σ k/2<sup>k+1</sup> ≤ n — a convergent series. Most of the work is attached to the many short paths at the bottom, not the few long ones.</p>`,
      followUps: ['Where else does a geometric series make an algorithm linear?', 'What is the height of a heap with n nodes?']
    },
    {
      q: 'Your recursive solution throws StackOverflowError on large input. What do you do?', level: 'I',
      a: `<p>First compute the recursion <b>depth</b>: O(n) depth (linked list, path-shaped graph, skewed tree) exceeds Java's default stack (~10<sup>4</sup>–10<sup>5</sup> frames). Options: (1) rewrite iteratively, or with an explicit <code>ArrayDeque</code> stack on the heap; (2) change the algorithm to bound depth (e.g. quicksort recursing on the smaller part → O(log n)); (3) as a pragmatic fix in contests, run the code in a <code>Thread</code> created with a large stack size; (4) increase <code>-Xss</code> in production only if you control the JVM. Java has no tail-call optimisation, so tail recursion does not help.</p>`,
      followUps: ['How do you keep the same visit order when converting DFS to an explicit stack?', 'Why does quicksort recursing on the smaller side guarantee O(log n) depth?']
    },
    {
      q: 'Is an O(√N) primality test polynomial time?', level: 'A',
      a: `<p>No — not in the formal sense. Complexity is measured against the <b>size of the input in bits</b>. A number N is written with b = log₂ N bits, so √N = 2<sup>b/2</sup> is <b>exponential in b</b>. It is fast for 64-bit numbers (≈ 3·10<sup>9</sup> steps worst case, still too slow for many contests at 10<sup>18</sup>), but for 2048-bit cryptographic numbers it is hopeless — that is why we use Miller–Rabin (polynomial in b). The same idea gives "pseudo-polynomial" algorithms like 0/1-knapsack O(n·W).</p>`,
      followUps: ['Why is knapsack NP-hard if O(n·W) exists?', 'What is the complexity of Euclid\'s GCD in terms of bits?']
    },
    {
      q: 'How do you get the complexity of a recursive function such as T(n) = 2T(n/2) + n?', level: 'A',
      a: `<p>Draw the recursion tree and sum level by level. Level k has 2<sup>k</sup> calls of size n/2<sup>k</sup>, each doing n/2<sup>k</sup> work → every level costs n. There are log₂ n levels → <b>Θ(n log n)</b>. The GP dominance rule generalises it: if level costs grow geometrically, the bottom (leaves) dominates; if they shrink, the root dominates (T(n) = T(n/2) + n → Θ(n)); if equal, multiply one level by the number of levels. That is exactly what the Master Theorem packages up.</p>`,
      followUps: ['Solve T(n) = T(n−1) + n and T(n) = 2T(n−1) + 1.', 'What is the space complexity of merge sort\'s recursion?']
    },
    {
      q: 'When can an algorithm with a better Big-O be slower in practice?', level: 'E',
      a: `<p>Big-O hides constants and memory behaviour. For realistic sizes, an O(n log n) sort over a contiguous <code>int[]</code> can beat an "O(n)" approach that uses a <code>HashMap&lt;Integer,Integer&gt;</code> because of boxing, hashing, allocation and cache misses (~100 cycles each). Insertion sort beats merge sort for n ≲ 32, which is why TimSort and introsort switch to it for small runs. Big-O also ignores I/O: a "fast" algorithm that does one database round trip per item is dominated by network latency. Measure at realistic sizes with a proper harness (JMH) before deciding.</p>`,
      followUps: ['How would you design a benchmark to compare two implementations fairly?', 'Why do linked lists lose to arrays even for O(1) inserts?']
    },
    {
      q: 'How do you use complexity reasoning in system or production work, not just interviews?', level: 'E',
      a: `<p>It becomes <b>capacity planning</b>. Translate traffic into operations: 10<sup>6</sup> daily users × 100 requests ≈ 1,200 requests/second. If each request scans 10<sup>5</sup> rows (O(n)), that is 1.2·10<sup>8</sup> row-reads per second — you need an index (O(log n)) or a cache (O(1)). Watch for O(n<sup>2</sup>) hiding in "for each user, check each order", N+1 database queries, and unbounded in-memory lists that cause out-of-memory errors as data grows. In code review I look for loops over growing collections and ask "what happens at 100× today's data?"</p>`,
      followUps: ['How would you find an accidental O(n<sup>2</sup>) in a slow endpoint?', 'When is an O(n) full scan acceptable in production?']
    }
  );

  registerModule({
    id: 'dsa02',
    title: 'Math Foundations & Time/Space Complexity',
    intro: `<p>Before you learn a single data structure, you need a way to <b>predict how fast and how memory-hungry</b> a piece of code is — without running it. This module gives you that superpower with nothing more than counting, a few school formulas and some everyday analogies.</p>
<p>You will learn to count loop iterations like a shopkeeper counts tally marks, sum <b>arithmetic and geometric progressions</b> (the maths hiding inside nested loops and recursion), see <b>log₂ N as "how many times can I halve N"</b>, speak Big-O / Ω / Θ in plain English, measure <b>space</b> including the invisible recursion stack, and finally read a problem's constraints to know the intended complexity <b>before writing any code</b> (the 10<sup>8</sup> operations-per-second rule). Every later DSA module — sorting, binary search, DP, graphs — leans on these skills, and interviewers test them in every single round.</p>`,
    goals: [
      'Count exactly how many times any loop shape runs: single, nested, triangle, halving, doubling, √N and harmonic loops',
      'Use AP and GP formulas (1 + 2 + … + N, 1 + 2 + 4 + …) to turn loops into O(1) formulas and to analyse recursion costs',
      'Explain log₂ N as repeated halving and compute floors/ceilings of logs with integers only (no floating-point traps)',
      'State time complexity in Big-O / Ω / Θ, separating best/worst/average/amortised cases and multiple input sizes',
      'Measure auxiliary space including the recursion stack, and avoid StackOverflowError and Memory Limit Exceeded',
      'Read constraints and pick the allowed complexity in seconds using the 10<sup>8</sup> ops/sec rule and the constraint → complexity table'
    ],
    prereqs: `DSA 1 (Programming Foundations for DSA): basic Java loops, methods, arrays and <code>long</code> vs <code>int</code>. School maths (multiplication, powers) is enough — everything else is built from scratch here.`,
    hours: 10,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
