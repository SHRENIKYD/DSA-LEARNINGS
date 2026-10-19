(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // ---------- small shared helpers for the visualizers ----------
  var INF = 1000000000;
  function parseNums(input, minN, maxN, lo, hi, what) {
    var s = String(input === undefined ? '' : input).trim();
    if (!s) throw new Error('Please type some whole numbers separated by spaces, e.g. 2 7 9 3 1');
    var a = s.split(/[\s,]+/).map(Number);
    if (a.some(function (x) { return !Number.isInteger(x); })) throw new Error('Only whole numbers please (separated by spaces) for ' + (what || 'the list'));
    if (a.length < minN) throw new Error('Need at least ' + minN + ' number(s) for ' + (what || 'the list'));
    if (a.length > maxN) throw new Error('Keep it small: at most ' + maxN + ' numbers for ' + (what || 'the list') + ' so the picture fits');
    if (a.some(function (x) { return x < lo || x > hi; })) throw new Error('Numbers for ' + (what || 'the list') + ' must be between ' + lo + ' and ' + hi);
    return a;
  }
  // "W | w:v w:v ..." -> {W, w:[], v:[]}
  function parseKnap(input, maxItems, maxW) {
    var s = String(input === undefined ? '' : input).trim();
    var bits = s.split('|');
    if (bits.length !== 2) throw new Error('Format: capacity | weight:value pairs, e.g. 7 | 1:1 3:4 4:5 5:7');
    var W = Number(bits[0].trim());
    if (!Number.isInteger(W) || W < 1 || W > maxW) throw new Error('Capacity must be a whole number from 1 to ' + maxW);
    var pairs = bits[1].trim().split(/[\s,]+/).filter(function (x) { return x; });
    if (!pairs.length || pairs.length > maxItems) throw new Error('Give 1 to ' + maxItems + ' items written as weight:value');
    var w = [], v = [];
    pairs.forEach(function (p) {
      var q = p.split(':').map(Number);
      if (q.length !== 2 || !Number.isInteger(q[0]) || !Number.isInteger(q[1]) || q[0] < 1 || q[0] > maxW || q[1] < 0 || q[1] > 99) throw new Error('Each item looks like weight:value, e.g. 3:4 (weight 1..' + maxW + ', value 0..99)');
      w.push(q[0]); v.push(q[1]);
    });
    return { W: W, w: w, v: v };
  }
  function parseTwoWords(input, maxLen) {
    var s = String(input === undefined ? '' : input).trim().split(/\s+/);
    if (s.length !== 2) throw new Error('Type exactly two words separated by a space, e.g. horse ros');
    if (s[0].length > maxLen || s[1].length > maxLen) throw new Error('Keep each word at most ' + maxLen + ' letters so the table fits');
    return s;
  }
  // rows separated by "/" , cells by spaces
  function parseMatrix(input, maxR, maxC, lo, hi) {
    var rows = String(input === undefined ? '' : input).trim().split('/').map(function (r) {
      return r.trim().split(/[\s,]+/).filter(function (x) { return x !== ''; }).map(Number);
    });
    if (!rows.length || rows.length > maxR) throw new Error('Use 1 to ' + maxR + ' rows separated by /');
    var C = rows[0].length;
    if (!C || C > maxC) throw new Error('Use 1 to ' + maxC + ' numbers per row');
    rows.forEach(function (r) {
      if (r.length !== C) throw new Error('Every row needs the same number of cells');
      if (r.some(function (x) { return !Number.isInteger(x) || x < lo || x > hi; })) throw new Error('Cells must be whole numbers from ' + lo + ' to ' + hi);
    });
    return rows;
  }
  function one(k, v) { var o = {}; o[k] = v; return o; }
  function show(x) { return x === null || x === undefined ? '' : (x >= INF ? '∞' : x); }
  function showRow(r) { return r.map(show); }
  function grid(label, rows, rowHead, colHead, hl) {
    return { type: 'grid', label: label, rows: rows.map(showRow), rowHead: rowHead.slice(), colHead: colHead.slice(), hl: hl || {} };
  }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  // highlight map for a grid: every filled cell 'done', then the specials on top
  function gridHl(filled, specials) {
    var h = {};
    Object.keys(filled).forEach(function (k) { h[k] = 'done'; });
    Object.keys(specials || {}).forEach(function (k) { h[k] = specials[k]; });
    return h;
  }

  // =====================================================================
  // TOPIC 1 — What DP is: overlapping subproblems + optimal substructure
  // =====================================================================
  topics.push({
    title: 'DP Intuition: Overlapping Subproblems + Optimal Substructure',
    analogy: `<p>Your little cousin writes <b>1+1+1+1+1+1+1+1</b> on a paper and asks "what is this?". You count: <b>8</b>. Then they add one more "+1" and ask again. You do not count all nine ones again — you say <b>9</b> instantly, because you <b>remember</b> the 8.</p>
      <p>That is all dynamic programming (DP) is: <b>write answers to small questions in a notebook, so you never solve the same small question twice</b>. The fancy name hides a very simple habit.</p>`,
    explain: `<p><b>Dynamic Programming</b> = recursion + a notebook. You break a big question into smaller questions of the <i>same kind</i>, solve each small question <b>once</b>, write the answer down, and reuse it.</p>
      <p>Look at plain recursive Fibonacci: <code>fib(n) = fib(n-1) + fib(n-2)</code>. Calling <code>fib(6)</code> asks the <i>same</i> small questions again and again:</p>
      ${H.table(['sub-question', 'fib(6)', 'fib(5)', 'fib(4)', 'fib(3)', 'fib(2)', 'fib(1)', 'fib(0)'], [
        ['times computed (plain recursion)', '1', '1', '2', '3', H.c('r', '5'), H.c('r', '8'), H.c('r', '5')],
        ['times computed (with notebook)', '1', '1', '1', '1', H.c('g', '1'), H.c('g', '1'), H.c('g', '1')]
      ])}
      <p>25 calls shrink to 7 real computations (11 calls if you count the instant notebook look-ups). For fib(50) it is about 4·10<sup>10</sup> calls (a minute of CPU) versus about 100 (instant). A problem is a DP problem when it has <b>both</b> of these properties:</p>
      <ul>
        <li><b>Overlapping subproblems</b> — the recursion asks the <i>same</i> smaller question many times (fib(3) above). If every sub-question is brand new (like merge sort splitting different halves), a notebook does not help: that is plain divide &amp; conquer.</li>
        <li><b>Optimal substructure</b> — the best answer to the big question is built from the <i>best</i> answers to smaller questions. Example: if the shortest road from Delhi to Mumbai passes Jaipur, then its Delhi → Jaipur part must itself be the shortest Delhi → Jaipur road (otherwise swap in the shorter one and you beat the "shortest" route — impossible).</li>
      </ul>
      <h4>The 5-step DP recipe (use it on every problem in this module)</h4>
      ${H.table(['step', 'ask yourself', 'Fibonacci'], [
        ['1. <b>State</b>', 'what does <code>dp[i]</code> mean, in one English sentence?', 'dp[i] = the i-th Fibonacci number'],
        ['2. <b>Transition</b>', 'what was the LAST choice? combine the sub-answers', 'dp[i] = dp[i-1] + dp[i-2]'],
        ['3. <b>Base cases</b>', 'smallest answers you know by heart', 'dp[0] = 0, dp[1] = 1'],
        ['4. <b>Order</b>', 'fill so everything you need is already filled', 'i = 2, 3, …, n'],
        ['5. <b>Answer</b>', 'which cell holds the final answer?', 'dp[n]']
      ])}
      <p>Think of step 1 as the most important: once you can say "<i>dp[i] means …</i>" in plain words, the transition usually writes itself by asking "<b>what happened at the very last step?</b>".</p>
      <h4>The three DP "verbs"</h4>
      ${H.table(['question shape', 'combine sub-answers with', 'example'], [
        ['"how many ways …"', H.c('b', 'add (+)'), 'climbing stairs, coin change ways, grid paths'],
        ['"minimum / maximum …"', H.c('g', 'min / max'), 'min coins, house robber, knapsack, edit distance'],
        ['"is it possible …"', H.c('p', 'OR (||)'), 'subset sum, word break, partition']
      ])}`,
    clues: [
      '"<b>Number of ways</b> to …" → DP that <b>adds</b> sub-answers (usually with "return it modulo 10<sup>9</sup>+7").',
      '"<b>Minimum / maximum</b> cost / profit / length" and you can find a counterexample to greedy → DP that takes <b>min / max</b> over choices.',
      '"<b>Can you</b> reach / form / partition …?" → boolean DP (OR over the choices).',
      '"At each step you may <b>choose</b> A or B" (take/skip, 1 step/2 steps, insert/delete/replace) → the choices become the transition.',
      'Your brute-force recursion has <b>parameters that repeat</b> (same (i, j) reached by different paths) → add a memo table.',
      'Constraints: <code>N ≤ 30</code> hints exponential brute force is fine; <code>N ≤ 1000–5000</code> hints O(N<sup>2</sup>) DP; <code>N ≤ 10<sup>5</sup></code> hints O(N) or O(N·K) DP with small K.'
    ],
    code: [{ lang: 'java', code: `
      // Plain recursion: asks the same fib(k) again and again -> about 1.6^n calls
      long fibSlow(int n) {
          if (n < 2) return n;                    // base cases: fib(0)=0, fib(1)=1
          return fibSlow(n - 1) + fibSlow(n - 2); // two calls, and they overlap
      }

      // Same recursion + a notebook (memo). Each fib(k) is computed once -> O(n)
      long[] memo = new long[91];                 // fib(90) still fits in a long
      boolean[] known = new boolean[91];

      long fibMemo(int n) {
          if (n < 2) return n;
          if (known[n]) return memo[n];           // already in the notebook: reuse!
          memo[n] = fibMemo(n - 1) + fibMemo(n - 2);
          known[n] = true;                        // write it down before returning
          return memo[n];
      }`, alt: [{ lang: 'python', code: `# Plain recursion: asks the same fib(k) again and again -> about 1.6^n calls
def fib_slow(n):
    if n < 2:                                 # base cases: fib(0)=0, fib(1)=1
        return n
    return fib_slow(n - 1) + fib_slow(n - 2)  # two calls, and they overlap

# Same recursion + a notebook (memo). Each fib(k) is computed once -> O(n)
memo = {}                                     # n -> fib(n); Python ints never overflow

def fib_memo(n):
    if n < 2:
        return n
    if n in memo:                             # already in the notebook: reuse!
        return memo[n]
    memo[n] = fib_memo(n - 1) + fib_memo(n - 2)   # write it down before returning
    return memo[n]

# The same notebook, built in: @functools.cache on fib_slow makes it O(n) too.` }, { lang: 'js', code: `// Plain recursion: asks the same fib(k) again and again -> about 1.6^n calls
function fibSlow(n) {
  if (n < 2) return n;                        // base cases: fib(0)=0, fib(1)=1
  return fibSlow(n - 1) + fibSlow(n - 2);     // two calls, and they overlap
}

// Same recursion + a notebook (memo). Each fib(k) is computed once -> O(n).
// BigInt keeps it exact: a Number is exact only up to fib(78).
const memo = new Map();                       // n -> fib(n)

function fibMemo(n) {
  if (n < 2) return BigInt(n);
  if (memo.has(n)) return memo.get(n);        // already in the notebook: reuse!
  const v = fibMemo(n - 1) + fibMemo(n - 2);
  memo.set(n, v);                             // write it down before returning
  return v;
}` }, { lang: 'cpp', code: `// Plain recursion: asks the same fib(k) again and again -> about 1.6^n calls
long long fibSlow(int n) {
    if (n < 2) return n;                      // base cases: fib(0)=0, fib(1)=1
    return fibSlow(n - 1) + fibSlow(n - 2);   // two calls, and they overlap
}

// Same recursion + a notebook (memo). Each fib(k) is computed once -> O(n)
vector<long long> memo(91, -1);               // -1 = not computed; fib(90) fits in long long

long long fibMemo(int n) {
    if (n < 2) return n;
    if (memo[n] != -1) return memo[n];        // already in the notebook: reuse!
    return memo[n] = fibMemo(n - 1) + fibMemo(n - 2);   // write it down before returning
}` }] }, { lang: 'python', run: true, title: 'Count the calls yourself (Python, runnable)', code: `calls = 0

def fib_slow(n):
    global calls
    calls += 1
    return n if n < 2 else fib_slow(n - 1) + fib_slow(n - 2)

memo = {}
memo_calls = 0

def fib_memo(n):
    global memo_calls
    memo_calls += 1
    if n < 2:
        return n
    if n in memo:            # notebook hit
        return memo[n]
    memo[n] = fib_memo(n - 1) + fib_memo(n - 2)
    return memo[n]

for n in (10, 20, 25):
    calls = 0
    memo.clear()
    memo_calls = 0
    print("n =", n, "fib =", fib_slow(n), "plain calls =", calls,
          "| memo fib =", fib_memo(n), "memo calls =", memo_calls)
` }],
    codeTitle: ['Same recursion, with and without a notebook', 'Count the calls yourself (Python, runnable)'],
    viz: {
      title: 'fib(n): recursion tree (repeats in red) vs memo notebook vs bottom-up',
      input: '5',
      inputLabel: 'n (2 to 5, so the tree fits on screen)',
      gen: function (input) {
        var n = parseNums(input, 1, 1, 2, 5, 'n')[0];
        var fib = [0, 1], i;
        for (i = 2; i <= n; i++) fib[i] = fib[i - 1] + fib[i - 2];
        var full = [];
        (function build(idx, m) { full[idx] = 'f' + m; if (m >= 2) { build(2 * idx + 1, m - 1); build(2 * idx + 2, m - 2); } })(0, n);
        for (i = 0; i < full.length; i++) if (full[i] === undefined) full[i] = null;
        function stackOf(idx, arr) { var s = []; for (;;) { s.unshift(arr[idx] + '()'); if (idx === 0) break; idx = (idx - 1) >> 1; } return s; }
        var frames = [], hl = {}, tags = {}, seen = {}, calls = 0, repeats = 0;
        frames.push({ narr: 'Plain recursion for <b>fib(' + n + ')</b>. Each circle is one function call; f3 means "fib(3)". Watch how often the <i>same</i> question gets solved again.', parts: [
          { type: 'tree', label: 'recursion tree (no notebook)', arr: full.slice() },
          { type: 'code', label: 'code running', lang: 'java', code: 'long fib(int n) {\n  if (n < 2) return n;\n  return fib(n-1) + fib(n-2);\n}', hl: { 3: 'cur' } }
        ] });
        (function post(idx, m) {
          if (m >= 2) { post(2 * idx + 1, m - 1); post(2 * idx + 2, m - 2); }
          calls++;
          var again = !!seen[m];
          if (again) repeats++;
          seen[m] = true;
          var h = Object.assign({}, hl); h[idx] = again ? 'bad' : 'cur';
          tags[idx] = '=' + fib[m];
          var st = stackOf(idx, full);
          frames.push({ narr: 'Call f' + m + ' finishes and returns <b>' + fib[m] + '</b>' + (m < 2 ? ' (base case).' : ' = f' + (m - 1) + ' + f' + (m - 2) + '.') + (again ? ' <span class="c-r">We already solved f' + m + ' earlier — this is wasted, repeated work!</span>' : ''), parts: [
            { type: 'tree', label: 'recursion tree (no notebook)', arr: full.slice(), hl: h, tags: Object.assign({}, tags) },
            { type: 'stack', label: 'call stack (bottom → top)', items: st, hl: one(st.length - 1, 'cur') },
            { type: 'vars', vals: { calls: calls, repeated: repeats }, hl: again ? { repeated: 'bad' } : {} }
          ] });
          hl[idx] = again ? 'bad' : 'done';
        })(0, n);
        frames.push({ narr: 'Plain recursion made <b>' + calls + '</b> calls and <b>' + repeats + '</b> of them were repeats (red). Repeats = <b>overlapping subproblems</b> — the sign that a notebook will help.', parts: [
          { type: 'tree', label: 'recursion tree (no notebook)', arr: full.slice(), hl: Object.assign({}, hl), tags: Object.assign({}, tags) },
          { type: 'vars', vals: { calls: calls, repeated: repeats }, hl: { repeated: 'bad' } }
        ] });
        var pr = [], known = {};
        (function build2(idx, m) { pr[idx] = 'f' + m; if (m < 2 || known[m]) return; build2(2 * idx + 1, m - 1); build2(2 * idx + 2, m - 2); known[m] = true; })(0, n);
        for (i = 0; i < pr.length; i++) if (pr[i] === undefined) pr[i] = null;
        var memo = []; for (i = 0; i <= n; i++) memo.push('?');
        memo[0] = 0; memo[1] = 1;
        var mh = {}, mt = {}, mcalls = 0, k2 = {};
        frames.push({ narr: 'Now the same recursion <b>with a notebook</b> memo[]. Base cases f0 = 0 and f1 = 1 are written in already. Before solving f(m) we first look in the notebook.', parts: [
          { type: 'tree', label: 'recursion tree (with memo)', arr: pr.slice() },
          { type: 'array', label: 'memo[] notebook', values: memo.slice(), hl: { 0: 'ok', 1: 'ok' } }
        ] });
        (function post2(idx, m) {
          mcalls++;
          var hit = m >= 2 && k2[m];
          if (m >= 2 && !hit) { post2(2 * idx + 1, m - 1); post2(2 * idx + 2, m - 2); memo[m] = fib[m]; k2[m] = true; }
          var h = Object.assign({}, mh); h[idx] = hit ? 'sel' : 'cur';
          mt[idx] = hit ? 'memo!' : '=' + fib[m];
          frames.push({ narr: hit ? 'f' + m + ' is <span class="c-p">already in the notebook</span> → return memo[' + m + '] = ' + fib[m] + ' instantly. The whole subtree under it is skipped!' :
            (m < 2 ? 'f' + m + ' is a base case → ' + fib[m] + '.' : 'f' + m + ' solved for the first time = ' + fib[m] + ' → <span class="c-g">write it into memo[' + m + ']</span>.'), parts: [
            { type: 'tree', label: 'recursion tree (with memo)', arr: pr.slice(), hl: h, tags: Object.assign({}, mt) },
            { type: 'array', label: 'memo[] notebook', values: memo.slice(), hl: one(m, hit ? 'sel' : 'ok') },
            { type: 'vars', vals: { calls: mcalls } }
          ] });
          mh[idx] = hit ? 'sel' : 'done';
        })(0, n);
        frames.push({ narr: 'With the notebook: <b>' + mcalls + '</b> calls instead of ' + calls + '. In general about 2n calls instead of ~1.6<sup>n</sup>. That is <b>top-down DP (memoization)</b>.', parts: [
          { type: 'tree', label: 'recursion tree (with memo)', arr: pr.slice(), hl: Object.assign({}, mh), tags: Object.assign({}, mt) },
          { type: 'array', label: 'memo[] notebook', values: memo.slice() }
        ] });
        var dp = [0, 1]; for (i = 2; i <= n; i++) dp.push('');
        for (i = 2; i <= n; i++) {
          dp[i] = dp[i - 1] + dp[i - 2];
          var bh = {}; bh[i - 1] = 'win'; bh[i - 2] = 'win'; bh[i] = 'cur';
          frames.push({ narr: '<b>Bottom-up</b> (no recursion at all): dp[' + i + '] = dp[' + (i - 1) + '] + dp[' + (i - 2) + '] = ' + dp[i - 1] + ' + ' + dp[i - 2] + ' = <b>' + dp[i] + '</b>. We fill left → right, so the two cells we depend on (blue) are always ready.', parts: [
            { type: 'array', label: 'dp[] filled left → right', values: dp.slice(), hl: bh }
          ] });
        }
        frames.push({ narr: 'Answer: fib(' + n + ') = <b>' + dp[n] + '</b>. Same number three ways: plain recursion (' + calls + ' calls), memo (' + mcalls + ' calls), bottom-up (' + (n - 1) + ' loop steps).', parts: [
          { type: 'array', label: 'final dp[]', values: dp.slice(), hl: one(n, 'sel') },
          { type: 'table', label: 'cost comparison', columns: ['method', 'work for this n', 'big-O'], rows: [['plain recursion', calls + ' calls', 'O(1.6ⁿ)'], ['memoization', mcalls + ' calls', 'O(n)'], ['tabulation', (n - 1) + ' additions', 'O(n)']], hl: { 2: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Overlap or not? Merge sort vs Fibonacci', html: `<p><b>Merge sort</b> splits [8,3,5,1] into [8,3] and [5,1]. Those halves never meet again — every subproblem is unique. A memo table would never get a hit, so it is <b>divide &amp; conquer</b>, not DP.</p><p><b>Fibonacci</b> asks fib(3) from both fib(5) and fib(4). Same question, many askers → memo gets hits → <b>DP</b>.</p>` },
      { title: 'Optimal substructure fails: longest simple path', html: `<p>Shortest path has optimal substructure. <b>Longest simple path</b> (no repeated vertex) does not: in a triangle A–B–C, the longest simple path A→C is A→B→C, but its piece A→B (length 1) is not the longest A→B path (A→C→B, length 2). Glueing "best pieces" together would reuse C — illegal. So there is no clean DP for it on general graphs (it is NP-hard). Lesson: before writing a DP, check that the best answer really is built from best sub-answers <i>independently</i>.</p>` },
      { title: 'Writing the recipe for "count binary strings of length n with no two adjacent 1s"', html: `<p><b>State:</b> end0[i] = strings of length i ending in 0, end1[i] = ending in 1.<br><b>Transition (last character):</b> end0[i] = end0[i-1] + end1[i-1] (a 0 can follow anything); end1[i] = end0[i-1] (a 1 only after a 0).<br><b>Base:</b> end0[1] = 1, end1[1] = 1.<br><b>Answer:</b> end0[n] + end1[n].</p>${H.table(['i', 'end0', 'end1', 'total'], [['1', '1', '1', '2'], ['2', '2', '1', '3'], ['3', '3', '2', '5'], ['4', '5', '3', H.c('g', '8')]])}<p>Fibonacci again, hiding in a word problem. Many "count" problems are Fibonacci in disguise.</p>`, code: { lang: 'java', code: `long countNoAdjacentOnes(int n) {
    long end0 = 1, end1 = 1;          // length 1: "0" and "1"
    for (int i = 2; i <= n; i++) {
        long new0 = end0 + end1;       // append 0 to anything
        long new1 = end0;              // append 1 only after a 0
        end0 = new0;
        end1 = new1;
    }
    return end0 + end1;
}`, alt: [{ lang: 'python', code: `def count_no_adjacent_ones(n):
    end0, end1 = 1, 1                 # length 1: "0" and "1"
    for _ in range(2, n + 1):
        # append 0 to anything; append 1 only after a 0
        end0, end1 = end0 + end1, end0
    return end0 + end1` }, { lang: 'js', code: `function countNoAdjacentOnes(n) {
  let end0 = 1, end1 = 1;             // length 1: "0" and "1"
  for (let i = 2; i <= n; i++) {
    [end0, end1] = [end0 + end1, end0];   // append 0 to anything; 1 only after a 0
  }
  return end0 + end1;
}` }, { lang: 'cpp', code: `long long countNoAdjacentOnes(int n) {
    long long end0 = 1, end1 = 1;     // length 1: "0" and "1"
    for (int i = 2; i <= n; i++) {
        long long new0 = end0 + end1; // append 0 to anything
        long long new1 = end0;        // append 1 only after a 0
        end0 = new0;
        end1 = new1;
    }
    return end0 + end1;
}` }] } },
      { title: 'Spotting the repeated state in a brute force', html: `<p>Brute force for "min cost to reach stair n" is <code>solve(i) = cost[i] + min(solve(i-1), solve(i-2))</code>. Its <b>only parameter</b> is <code>i</code>, and i ranges over 0..n. So at most n+1 different calls exist, yet the plain recursion makes ~1.6<sup>n</sup> calls. "Few distinct parameter values, many calls" is the exact moment to add a memo.</p>` }
    ],
    deepDive: `<p><b>Why "dynamic programming"?</b> Richard Bellman coined it in the 1950s; "programming" meant <i>planning/tabulating</i> (like a TV programme schedule), and "dynamic" sounded impressive to funding committees. The name tells you nothing — the idea is "solve each distinct subproblem once".</p>
      <p><b>The subproblem graph.</b> Every DP is a <i>directed acyclic graph</i> (DAG): nodes are states, edges go from a state to the states it depends on. Memoization is DFS over this DAG; tabulation is processing nodes in a topological order. Total time = (number of states) × (work per state). For fib: n states × O(1). This one formula estimates every DP in this module: knapsack = N·W states × O(1); LCS = n·m × O(1); coin change = amount × coins.</p>
      <p><b>Why it must be acyclic.</b> If state A depends on B and B on A, neither can be finished first — memoization would loop forever. Problems with cycles (shortest path with arbitrary edges) need graph algorithms like Dijkstra/Bellman–Ford instead; Bellman–Ford is itself a DP over "number of edges used", which breaks the cycle by adding a dimension.</p>
      <p><b>Correctness proof shape.</b> DP proofs are induction: "assume all smaller states hold the correct answer; the transition considers every possible last choice; therefore this state is correct". If your transition misses a possible last choice, the proof (and the code) breaks.</p>
      <p><b>Exponential → polynomial.</b> Plain fib calls grow like φ<sup>n</sup> with φ ≈ 1.618 (the golden ratio). fib(n) itself also grows like φ<sup>n</sup>, which is why fib(93) overflows a signed 64-bit integer (Java <code>long</code>, C++ <code>long long</code>) — real interview answers often need <code>% 1_000_000_007</code> or big integers (Java <code>BigInteger</code>, JS <code>BigInt</code>; Python ints never overflow).</p>
      <p><b>Even faster than O(n):</b> Fibonacci-like linear recurrences can be solved in O(log n) with 2×2 matrix fast exponentiation (DSA 3 modular power, applied to matrices). Worth mentioning as a follow-up; rarely required.</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant will write memoized Fibonacci instantly, so "can you code DP" is no longer the signal. Interviewers now probe whether you can <b>find the state</b> in a messy word problem and <b>justify</b> that subproblems overlap and that optimal substructure holds.</p>
      <p><b>Use AI as a partner:</b> ask <code>Here is my brute-force recursion. List its parameters and estimate how many distinct calls exist vs total calls. Do not give me the DP.</code> That trains the exact recognition skill you need. Or ask for 3 counting problems that are "Fibonacci in disguise" and solve them yourself.</p>
      <p><b>Where AI goes wrong:</b> it happily labels problems as DP when greedy suffices (or vice versa), invents a state that loses information (e.g. drops "last element used"), and forgets overflow. It can also produce code that passes the sample but silently double counts.</p>
      <p><b>What you must still own:</b> the one-sentence state definition, the "last step" reasoning for the transition, the state-count × work-per-state complexity estimate, and the decision whether DP is even the right tool.</p>`,
    problems: [{
      title: 'Fibonacci Number', level: 'Easy', tags: ['dp', '1d dp', 'recursion'], companies: ['Amazon', 'Adobe', 'Apple'],
      statement: `<p>The Fibonacci numbers are F(0) = 0, F(1) = 1 and F(n) = F(n−1) + F(n−2) for n &gt; 1. Given <code>n</code>, return F(n).</p>`,
      constraints: `0 ≤ n ≤ 30 (follow-up: n ≤ 90 with a 64-bit integer, or n up to 10<sup>18</sup> modulo 10<sup>9</sup>+7)`,
      example: `<p>Input <code>n = 6</code> → Output <b>8</b>.</p>${H.arr([0, 1, 1, 2, 3, 5, 8], { label: 'F', hl: { 4: 'b', 5: 'b', 6: 'g' } })}<p>${H.c('g', 'F(6) = 8')} because ${H.c('b', 'F(5) + F(4) = 5 + 3')}.</p>`,
      brute: { why: `<p>Direct recursion recomputes the same F(k) over and over: about 1.6<sup>n</sup> calls. n = 30 is ~2.7 million calls (ok), but n = 50 is ~4·10<sup>10</sup> calls (TLE). The waste: F(n−2) is computed inside F(n−1) <i>and</i> again directly.</p>`, code: `int fib(int n) {
    if (n < 2) return n;              // F(0)=0, F(1)=1
    return fib(n - 1) + fib(n - 2);   // overlapping calls -> exponential
}` },
      mcq: { q: 'To compute F(n) bottom-up, how many earlier values do you need to keep at any moment?', options: ['All n values', 'Just the last two', 'Just the last one', 'log n values'], answer: 1, explain: 'F(i) only reads F(i−1) and F(i−2), so two variables are enough → O(1) space.' },
      tests: { sig: 'int -> int', fn: 'fib', cases: [
        [[0], 0], [[1], 1], [[2], 1], [[6], 8], [[10], 55], [[20], 6765], [[30], 832040]
      ] },
      hints: [`<p>Hint 1: F(i) only depends on F(i−1) and F(i−2). If you compute them in increasing order, they are ready when you need them.</p>`, `<p>Hint 2: a dp array of size n+1 works; then notice you only ever look one and two cells back → replace the array with two variables <code>prev2</code>, <code>prev1</code>.</p>`, `<p>Hint 3: handle n = 0 and n = 1 first (return n). Recipe: prev2 = 0, prev1 = 1; repeat n−1 times: cur = prev1 + prev2, shift prev2 = prev1, prev1 = cur; return prev1.</p>`],
      solution: {
        approach: `<p>Bottom-up with two rolling variables. Each loop step slides a two-number "window" one position forward along the Fibonacci sequence.</p>`,
        code: `class Solution {
    public int fib(int n) {
        if (n < 2) return n;           // F(0)=0, F(1)=1
        int prev2 = 0, prev1 = 1;      // F(i-2), F(i-1)
        for (int i = 2; i <= n; i++) {
            int cur = prev1 + prev2;   // F(i) = F(i-1) + F(i-2)
            prev2 = prev1;             // slide the window forward
            prev1 = cur;
        }
        return prev1;                  // F(n)
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def fib(self, n: int) -> int:
        if n < 2:
            return n
        prev2, prev1 = 0, 1
        for _ in range(2, n + 1):
            prev2, prev1 = prev1, prev1 + prev2
        return prev1` }, { lang: 'js', code: `function fib(n) {
  if (n < 2) return n;                // F(0)=0, F(1)=1
  let prev2 = 0, prev1 = 1;           // F(i-2), F(i-1)
  for (let i = 2; i <= n; i++) {
    [prev2, prev1] = [prev1, prev1 + prev2];   // slide the window forward
  }
  return prev1;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int fib(int n) {
        if (n < 2) return n;
        int prev2 = 0, prev1 = 1;
        for (int i = 2; i <= n; i++) {
            int cur = prev1 + prev2;
            prev2 = prev1;
            prev1 = cur;
        }
        return prev1;
    }
};` }],
        dry: { head: ['i', 'prev2 (F(i-2))', 'prev1 (F(i-1))', 'cur = F(i)'], rows: [['2', '0', '1', '1'], ['3', '1', '1', '2'], ['4', '1', '2', '3'], ['5', '2', '3', '5'], ['6', '3', '5', H.c('g', '8')]] },
        complexity: `<p>Time O(n), space O(1). Memoized recursion is also O(n) time but O(n) space for the memo plus O(n) recursion stack.</p>`,
        followUps: ['n up to 10<sup>18</sup> modulo 10<sup>9</sup>+7 → 2×2 matrix fast exponentiation, O(log n).', 'Return the first n Fibonacci numbers as a list.', 'Why does fib(93) overflow a 64-bit integer (Java <code>long</code>, C++ <code>long long</code>), and what happens in Python and JS instead?']
      }
    }]
  });

  // =====================================================================
  // TOPIC 2 — Memoization vs Tabulation vs Space Optimization
  // =====================================================================
  topics.push({
    title: 'Memoization vs Tabulation vs Space Optimization (Climbing Stairs 3 Ways)',
    analogy: `<p>Three friends do the same homework sheet of 10 linked questions (Q10 needs the answers of Q9 and Q8, and so on).</p>
      <ul><li><b>Riya (top-down / memoization)</b> starts at Q10, sees she needs Q9, jumps there, then Q8 … and writes every answer in the margin so she can just look it up the next time it is needed.</li>
      <li><b>Arjun (bottom-up / tabulation)</b> starts at Q1 and walks forward Q1, Q2, Q3 … so whatever he needs is always already written above.</li>
      <li><b>Meera (space-optimized)</b> notices each question only needs the <b>last two</b> answers, so she uses a tiny sticky note with two numbers and keeps overwriting it.</li></ul>
      <p>All three get the same answers. They differ only in <i>direction</i> and <i>how much paper</i> they use.</p>`,
    explain: `<p><b>Climbing Stairs:</b> you can climb 1 or 2 steps at a time. In how many different ways can you reach step <code>n</code>? Think about your <b>last move</b>: you arrived at step i either from step i−1 (a 1-step) or from step i−2 (a 2-step). Those two groups of ways never overlap and together cover everything, so:</p>
      <p style="text-align:center"><code>ways(i) = ways(i−1) + ways(i−2)</code>, with <code>ways(0) = 1</code> (standing still is one way) and <code>ways(1) = 1</code>.</p>
      ${H.arr([1, 1, 2, 3, 5, 8], { label: 'ways[i]', hl: { 3: 'b', 4: 'b', 5: 'y' } })}
      <p>${H.c('y', 'ways[5] = 8')} = ${H.c('b', 'ways[4] + ways[3] = 5 + 3')}. Now the same problem written three ways:</p>
      ${H.table(['', 'Top-down (memoization)', 'Bottom-up (tabulation)', 'Space-optimized'], [
        ['direction', 'start at n, recurse down to bases', 'start at bases, loop up to n', 'loop up to n'],
        ['storage', 'memo array/map + call stack', 'dp array', 'only the cells still needed'],
        ['extra space', 'O(n) memo + O(n) stack', 'O(n)', H.c('g', 'O(1)')],
        ['computes', 'only states actually reached', 'every state in the table', 'every state'],
        ['risk', 'stack overflow for deep recursion (Java <code>StackOverflowError</code>, Python <code>RecursionError</code>, JS <code>RangeError</code>, C++ crash)', 'must get the fill order right', 'can overwrite a value you still need'],
        ['when to pick', 'state space sparse or order hard to see', 'default in interviews', 'after tabulation works, as a follow-up']
      ])}
      <h4>How to turn one into the next</h4>
      <ol>
        <li><b>Brute recursion</b> → add a memo check at the top + a memo write before return = <b>memoization</b>.</li>
        <li>Memoization → make an array of the same shape, fill base cases, loop in the order "smaller states first" = <b>tabulation</b>.</li>
        <li>Tabulation → look at which cells the transition reads. If row i only reads rows i−1 / i−2 (or cell i only reads i−1, i−2), keep just those = <b>space optimization</b>.</li>
      </ol>
      <p>Interview flow that impresses: say the recursion in words → memoize it → convert to a loop → shrink space. Each step is a small, safe change.</p>`,
    clues: [
      '"In how many <b>distinct ways</b> can you climb / reach / decode …" → counting DP that adds the ways of each possible last move.',
      '"You can take <b>1 or 2</b> (or 1, 2 or 3) steps" → ways(i) = sum of ways(i − step) over allowed steps.',
      '"Return it <b>modulo 10<sup>9</sup>+7</b>" → counting DP whose answer explodes; take mod at each addition.',
      'Follow-up "<b>can you do it in O(1) space?</b>" → the transition reads only a fixed number of previous states → rolling variables.',
      '<code>n ≤ 10<sup>5</sup></code> with top-down recursion → the call stack may overflow (Python stops at 1000 frames by default, Java and JS at roughly 10<sup>4</sup>); prefer tabulation.',
      '<code>n ≤ 10<sup>18</sup></code> → not a loop at all; linear recurrence → matrix exponentiation O(log n).'
    ],
    code: [{ lang: 'java', code: `
      // 1) TOP-DOWN: recursion + memo. memo[i] == 0 means "not computed yet"
      //    (safe here because every real answer is >= 1).
      int climbMemo(int i, int[] memo) {
          if (i <= 1) return 1;                    // ways(0) = ways(1) = 1
          if (memo[i] != 0) return memo[i];        // notebook hit
          return memo[i] = climbMemo(i - 1, memo) + climbMemo(i - 2, memo);
      }

      // 2) BOTTOM-UP: fill dp[] from small to big.
      int climbTab(int n) {
          int[] dp = new int[n + 2];               // n+2 so dp[1] exists even when n = 0
          dp[0] = 1;                               // base cases
          dp[1] = 1;
          for (int i = 2; i <= n; i++) {
              dp[i] = dp[i - 1] + dp[i - 2];       // last move was 1 step or 2 steps
          }
          return dp[n];
      }

      // 3) SPACE-OPTIMIZED: keep only the last two cells.
      int climbO1(int n) {
          int twoBack = 1, oneBack = 1;            // ways(i-2), ways(i-1) for i = 2
          for (int i = 2; i <= n; i++) {
              int cur = oneBack + twoBack;
              twoBack = oneBack;                   // slide the window
              oneBack = cur;
          }
          return oneBack;                          // n = 0 or 1 -> loop skipped -> 1
      }`, alt: [{ lang: 'python', code: `from functools import cache

# 1) TOP-DOWN: recursion + memo. @cache is Python's built-in notebook.
@cache
def climb_memo(i):
    if i <= 1:                                # ways(0) = ways(1) = 1
        return 1
    return climb_memo(i - 1) + climb_memo(i - 2)

# 2) BOTTOM-UP: fill dp[] from small to big.
def climb_tab(n):
    dp = [1, 1] + [0] * max(0, n - 1)         # base cases; dp[1] exists even when n = 0
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]         # last move was 1 step or 2 steps
    return dp[n]

# 3) SPACE-OPTIMIZED: keep only the last two cells.
def climb_o1(n):
    two_back, one_back = 1, 1                 # ways(i-2), ways(i-1) for i = 2
    for _ in range(2, n + 1):
        two_back, one_back = one_back, one_back + two_back   # slide the window
    return one_back                           # n = 0 or 1 -> loop skipped -> 1` }, { lang: 'js', code: `// 1) TOP-DOWN: recursion + memo. memo[i] === 0 means "not computed yet"
//    (safe here because every real answer is >= 1).
function climbMemo(i, memo) {
  if (i <= 1) return 1;                       // ways(0) = ways(1) = 1
  if (memo[i] !== 0) return memo[i];          // notebook hit
  return (memo[i] = climbMemo(i - 1, memo) + climbMemo(i - 2, memo));
}
// call it as climbMemo(n, new Array(n + 1).fill(0))

// 2) BOTTOM-UP: fill dp[] from small to big.
function climbTab(n) {
  const dp = new Array(n + 2).fill(0);        // n+2 so dp[1] exists even when n = 0
  dp[0] = 1;                                  // base cases
  dp[1] = 1;
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];            // last move was 1 step or 2 steps
  }
  return dp[n];
}

// 3) SPACE-OPTIMIZED: keep only the last two cells.
function climbO1(n) {
  let twoBack = 1, oneBack = 1;               // ways(i-2), ways(i-1) for i = 2
  for (let i = 2; i <= n; i++) {
    [twoBack, oneBack] = [oneBack, oneBack + twoBack];   // slide the window
  }
  return oneBack;                             // n = 0 or 1 -> loop skipped -> 1
}` }, { lang: 'cpp', code: `// 1) TOP-DOWN: recursion + memo. memo[i] == 0 means "not computed yet"
//    (safe here because every real answer is >= 1).
int climbMemo(int i, vector<int>& memo) {     // pass the memo by reference, not a copy
    if (i <= 1) return 1;                     // ways(0) = ways(1) = 1
    if (memo[i] != 0) return memo[i];         // notebook hit
    return memo[i] = climbMemo(i - 1, memo) + climbMemo(i - 2, memo);
}

// 2) BOTTOM-UP: fill dp[] from small to big.
int climbTab(int n) {
    vector<int> dp(n + 2, 0);                 // n+2 so dp[1] exists even when n = 0
    dp[0] = 1;                                // base cases
    dp[1] = 1;
    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];        // last move was 1 step or 2 steps
    }
    return dp[n];
}

// 3) SPACE-OPTIMIZED: keep only the last two cells.
int climbO1(int n) {
    int twoBack = 1, oneBack = 1;             // ways(i-2), ways(i-1) for i = 2
    for (int i = 2; i <= n; i++) {
        int cur = oneBack + twoBack;
        twoBack = oneBack;                    // slide the window
        oneBack = cur;
    }
    return oneBack;                           // n = 0 or 1 -> loop skipped -> 1
}` }] }, { lang: 'python', run: true, title: 'All three in Python (runnable)', code: `from functools import lru_cache

@lru_cache(maxsize=None)          # Python's built-in memo notebook
def climb_memo(i):
    return 1 if i <= 1 else climb_memo(i - 1) + climb_memo(i - 2)

def climb_tab(n):
    dp = [1, 1] + [0] * max(0, n - 1)
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]
    return dp[n]

def climb_o1(n):
    two_back, one_back = 1, 1
    for _ in range(2, n + 1):
        two_back, one_back = one_back, one_back + two_back
    return one_back

for n in (1, 2, 3, 5, 10, 45):
    print(n, climb_memo(n), climb_tab(n), climb_o1(n))
` }],
    codeTitle: ['Climbing stairs: memo → table → two variables', 'All three in Python (runnable)'],
    viz: {
      title: 'Climbing stairs three ways: call stack + memo, dp table, sticky note',
      input: '6',
      inputLabel: 'n = number of stairs (2 to 10)',
      gen: function (input) {
        var n = parseNums(input, 1, 1, 2, 10, 'n')[0];
        var frames = [], memo = [], stack = [], i;
        for (i = 0; i <= n; i++) memo.push(i <= 1 ? 1 : '?');
        function snap(narr, curIdx, cls) {
          frames.push({ narr: narr, parts: [
            { type: 'stack', label: 'call stack (top-down)', items: stack.slice(), hl: one(stack.length - 1, 'cur') },
            { type: 'array', label: 'memo[] (? = not known yet)', values: memo.slice(), hl: curIdx === undefined ? { 0: 'ok', 1: 'ok' } : one(curIdx, cls) }
          ] });
        }
        snap('<b>Phase 1 — top-down.</b> We ask for ways(' + n + '). Bases ways(0) = ways(1) = 1 are pre-filled (green).');
        (function solve(k) {
          stack.push('ways(' + k + ')');
          if (k <= 1) { snap('ways(' + k + ') is a base case → 1.', k, 'ok'); stack.pop(); return 1; }
          if (memo[k] !== '?') { snap('ways(' + k + ') is <span class="c-p">already in memo</span> → ' + memo[k] + ', no recursion needed.', k, 'sel'); stack.pop(); return memo[k]; }
          snap('ways(' + k + ') unknown → it needs ways(' + (k - 1) + ') and ways(' + (k - 2) + '). Go deeper.', k, 'cur');
          var a = solve(k - 1), b = solve(k - 2);
          memo[k] = a + b;
          snap('ways(' + k + ') = ' + a + ' + ' + b + ' = <b>' + memo[k] + '</b> → write into memo and return.', k, 'ok');
          stack.pop();
          return memo[k];
        })(n);
        var dp = [1, 1]; for (i = 2; i <= n; i++) dp.push('');
        frames.push({ narr: '<b>Phase 2 — bottom-up.</b> No recursion and no call stack. Start with the bases and walk right.', parts: [
          { type: 'array', label: 'dp[]', values: dp.slice(), hl: { 0: 'ok', 1: 'ok' } }
        ] });
        for (i = 2; i <= n; i++) {
          dp[i] = dp[i - 1] + dp[i - 2];
          var h = {}; for (var j = 0; j < i - 2; j++) h[j] = 'done';
          h[i - 1] = 'win'; h[i - 2] = 'win'; h[i] = 'cur';
          frames.push({ narr: 'dp[' + i + '] = dp[' + (i - 1) + '] + dp[' + (i - 2) + '] = ' + dp[i - 1] + ' + ' + dp[i - 2] + ' = <b>' + dp[i] + '</b>. Blue = the only two cells this step reads. Faded cells will <i>never</i> be read again …', parts: [
            { type: 'array', label: 'dp[]', values: dp.slice(), hl: h },
            { type: 'code', label: 'loop body', lang: 'java', code: 'for (int i = 2; i <= n; i++)\n  dp[i] = dp[i-1] + dp[i-2];', hl: { 2: 'cur' } }
          ] });
        }
        var tb = 1, ob = 1;
        frames.push({ narr: '<b>Phase 3 — space optimization.</b> … so throw the array away and keep a sticky note with just two numbers.', parts: [
          { type: 'vars', label: 'sticky note', vals: { i: 1, twoBack: tb, oneBack: ob } }
        ] });
        for (i = 2; i <= n; i++) {
          var cur = ob + tb;
          frames.push({ narr: 'i = ' + i + ': cur = oneBack + twoBack = ' + ob + ' + ' + tb + ' = <b>' + cur + '</b>; then slide: twoBack ← ' + ob + ', oneBack ← ' + cur + '.', parts: [
            { type: 'vars', label: 'sticky note', vals: { i: i, twoBack: ob, oneBack: cur }, hl: { oneBack: 'ok', twoBack: 'win' } }
          ] });
          tb = ob; ob = cur;
        }
        frames.push({ narr: 'All three methods agree: <b>' + ob + '</b> ways to climb ' + n + ' stairs. Extra memory: O(n) + stack → O(n) → O(1).', parts: [
          { type: 'array', label: 'dp[] (for reference)', values: dp.slice(), hl: one(n, 'sel') },
          { type: 'vars', label: 'sticky note', vals: { answer: ob }, hl: { answer: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Steps of 1, 2 or 3 (Tribonacci stairs)', html: `<p>ways(i) = ways(i−1) + ways(i−2) + ways(i−3), bases ways(0) = 1, negative index = 0.</p>${H.table(['i', '0', '1', '2', '3', '4', '5'], [['ways', '1', '1', '2', '4', '7', H.c('g', '13')]])}<p>ways(4) = 4 + 2 + 1 = 7. Space optimization now needs <b>three</b> variables — the sticky note grows with the number of allowed step sizes.</p>`, code: { lang: 'java', code: `int ways123(int n) {
    int[] dp = new int[n + 1];
    dp[0] = 1;
    for (int i = 1; i <= n; i++)
        for (int step = 1; step <= 3; step++)
            if (i - step >= 0) dp[i] += dp[i - step];
    return dp[n];
}`, alt: [{ lang: 'python', code: `def ways123(n):
    dp = [1] + [0] * n
    for i in range(1, n + 1):
        dp[i] = sum(dp[i - step] for step in (1, 2, 3) if i - step >= 0)
    return dp[n]` }, { lang: 'js', code: `function ways123(n) {
  const dp = new Array(n + 1).fill(0);
  dp[0] = 1;
  for (let i = 1; i <= n; i++)
    for (let step = 1; step <= 3; step++)
      if (i - step >= 0) dp[i] += dp[i - step];
  return dp[n];
}` }, { lang: 'cpp', code: `int ways123(int n) {
    vector<int> dp(n + 1, 0);
    dp[0] = 1;
    for (int i = 1; i <= n; i++)
        for (int step = 1; step <= 3; step++)
            if (i - step >= 0) dp[i] += dp[i - step];
    return dp[n];
}` }] } },
      { title: 'Arbitrary allowed steps + modulo', html: `<p>Allowed steps = {1, 3, 5}, n up to 10<sup>5</sup>, answer mod 10<sup>9</sup>+7. Same transition, sum over allowed steps, and take <code>% MOD</code> after every addition so the int never overflows (10<sup>9</sup>+7 + 10<sup>9</sup>+7 still fits in a long; use long for the sum).</p>`, code: { lang: 'java', code: `int waysSteps(int n, int[] steps) {
    final int MOD = 1_000_000_007;
    long[] dp = new long[n + 1];
    dp[0] = 1;
    for (int i = 1; i <= n; i++)
        for (int s : steps)
            if (i - s >= 0) dp[i] = (dp[i] + dp[i - s]) % MOD;
    return (int) dp[n];
}`, alt: [{ lang: 'python', code: `def ways_steps(n, steps):
    MOD = 1_000_000_007
    dp = [1] + [0] * n
    for i in range(1, n + 1):
        # Python ints never overflow, but % MOD keeps them small and fast
        dp[i] = sum(dp[i - s] for s in steps if i - s >= 0) % MOD
    return dp[n]` }, { lang: 'js', code: `function waysSteps(n, steps) {
  const MOD = 1_000_000_007;
  const dp = new Array(n + 1).fill(0);
  dp[0] = 1;
  for (let i = 1; i <= n; i++)
    for (const s of steps)
      if (i - s >= 0) dp[i] = (dp[i] + dp[i - s]) % MOD;   // sum < 2^31, exact as a Number
  return dp[n];
}` }, { lang: 'cpp', code: `int waysSteps(int n, const vector<int>& steps) {
    const int MOD = 1'000'000'007;
    vector<long long> dp(n + 1, 0);
    dp[0] = 1;
    for (int i = 1; i <= n; i++)
        for (int s : steps)
            if (i - s >= 0) dp[i] = (dp[i] + dp[i - s]) % MOD;
    return (int) dp[n];
}` }] } },
      { title: 'Why the memo sentinel matters', html: `<p>Using <code>0</code> to mean "not computed" works for climbing stairs because every answer is ≥ 1. In <b>min-cost</b> problems a real answer can be 0, so a 0 sentinel would make you recompute (correct but slow) — or worse, in some codes return a wrong cached 0. Fix: fill the memo with <code>-1</code> (Java <code>Arrays.fill(memo, -1)</code>, Python <code>[-1] * (n + 1)</code>, JS <code>new Array(n + 1).fill(-1)</code>, C++ <code>vector&lt;long long&gt; memo(n + 1, -1)</code>), or use "no value" as unknown (<code>null</code> / <code>None</code> / <code>undefined</code>), or keep a separate <code>seen</code> array.</p>` },
      { title: 'Top-down wins when most states are never visited', html: `<p>f(0) = 1 and f(k) = f(⌊k/2⌋) + f(⌊k/3⌋), asked for n = 10<sup>12</sup>. A bottom-up table of 10<sup>12</sup> cells is impossible, but starting from n the recursion only ever reaches numbers of the form ⌊n / (2<sup>a</sup>·3<sup>b</sup>)⌋ — a few hundred distinct states. A top-down memo in a hash map (<code>HashMap</code> / <code>dict</code> or <code>@cache</code> / <code>Map</code> / <code>unordered_map</code>) touches only those. Rule: if the reachable states are a tiny slice of the full table, memoize with a hash map instead of tabulating.</p>` }
    ],
    deepDive: `<p><b>Stack depth.</b> Each recursive call uses a stack frame (tens of bytes to ~100 bytes). In Java the default thread stack (often 512 KB–1 MB) usually survives depth ~10<sup>4</sup> but fails around 10<sup>5</sup>; JS (Node) also fails near 10<sup>4</sup>; C++ gets about 8 MB on Linux (roughly 10<sup>5</sup> small frames). Python stops at 1000 frames by default — <code>sys.setrecursionlimit</code> helps, but deep recursion also needs a bigger C stack (<code>threading.stack_size</code> plus a thread) or it can still crash. Options in every language: tabulate, convert to an explicit stack, or (Java) run the solver in <code>new Thread(null, task, "dp", 1 &lt;&lt; 26)</code> with a bigger stack (competitive programming trick).</p>
      <p><b>Pull vs push DP.</b> "Pull" (what we wrote): dp[i] = combine of dp[earlier]. "Push": for each i, add dp[i] into dp[i+1] and dp[i+2]. Both are valid; push is handy when it is easier to list where a state <i>goes</i> than where it <i>came from</i> (e.g. "from i you can jump to these positions").</p>
      <p><b>Memo containers.</b> A plain array beats a hash map by 5–20× (no hashing; in Java no boxing either). Use a hash map (<code>HashMap&lt;Long, Long&gt;</code> / <code>dict</code> / <code>Map</code> / <code>unordered_map</code>) only when states are sparse or huge; encode a pair (i, j) into one integer key <code>i * M + j</code> rather than building strings like <code>i + "," + j</code> (slow, allocation heavy). In Python a tuple key <code>(i, j)</code> or <code>@functools.cache</code> is the idiomatic shortcut.</p>
      <p><b>Cache behavior.</b> Tabulation walks memory in order → CPU prefetching makes it fast. Memoization jumps around and pays function-call overhead. For the same O(n) bound tabulation is often 2–5× faster in practice.</p>
      <p><b>Space optimization pitfall:</b> you lose the full table, so you can no longer <b>reconstruct</b> the actual path/choices. If the follow-up asks "print the sequence", keep the table (or store parent pointers).</p>
      <p><b>O(log n):</b> [ways(i), ways(i−1)] = [[1,1],[1,0]] × [ways(i−1), ways(i−2)], so ways(n) comes from the matrix raised to the power n−1 using fast exponentiation.</p>`,
    aiEra: `<p><b>What AI changes:</b> converting memo → table → O(1) is mechanical, and copilots do it reliably for 1D problems. The interview signal moves to <i>explaining why</i> each conversion is safe (fill order respects dependencies; overwritten cells are never read again).</p>
      <p><b>Use AI as a partner:</b> write the memo version yourself, then ask the assistant <code>Convert this to bottom-up; then list every cell each iteration reads</code> and check its dependency list against yours. Ask it to generate stress tests comparing all three versions for n = 0..40.</p>
      <p><b>Where AI goes wrong:</b> off-by-one bases (ways(0) = 0 instead of 1), forgetting n = 0/1 so the dp array is too small (<code>dp[1]</code> out of bounds when n = 0), using <code>@lru_cache</code> on a function with mutable list arguments (unhashable), and overflowing int on counting problems without mod.</p>
      <p><b>What you must still own:</b> choosing the direction (sparse states → top-down), recognising when space optimization would destroy information you need for reconstruction, and talking through stack-depth limits in your interview language.</p>`,
    problems: [{
      title: 'Climbing Stairs', level: 'Easy', tags: ['dp', '1d dp', 'fibonacci'], companies: ['Amazon', 'Google', 'Adobe', 'Microsoft'],
      statement: `<p>You are climbing a staircase with <code>n</code> steps. Each time you can climb 1 or 2 steps. In how many distinct ways can you reach the top?</p>`,
      constraints: `1 ≤ n ≤ 45 (answer fits in a 32-bit int)`,
      example: `<p>Input <code>n = 4</code> → Output <b>5</b>.</p>${H.table(['way', 'moves'], [['1', '1+1+1+1'], ['2', '1+1+2'], ['3', '1+2+1'], ['4', '2+1+1'], ['5', '2+2']])}<p>Ways ending with a 1-step: ways(3) = 3. Ways ending with a 2-step: ways(2) = 2. ${H.c('g', '3 + 2 = 5')}.</p>`,
      brute: { why: `<p>Try every sequence of 1s and 2s recursively: count(i) = count(i+1) + count(i+2). The same suffix (e.g. "from step 3") is recounted in many branches → ~1.6<sup>n</sup> calls; for n = 45 that is about 3.7 billion calls — far too slow.</p>`, code: `int count(int i, int n) {
    if (i == n) return 1;          // reached the top exactly: one way
    if (i > n) return 0;           // overshot: not a valid way
    return count(i + 1, n) + count(i + 2, n);
}` },
      mcq: { q: 'You stand on step i. Which statement gives the correct recurrence?', options: ['ways(i) = ways(i−1) × ways(i−2)', 'ways(i) = ways(i−1) + ways(i−2)', 'ways(i) = 2 × ways(i−1)', 'ways(i) = ways(i−1) + 1'], answer: 1, explain: 'The last move was either a 1-step (from i−1) or a 2-step (from i−2). These two groups are disjoint and cover everything, so we add.' },
      tests: { sig: 'int -> int', fn: 'climbStairs', cases: [
        [[1], 1], [[2], 2], [[3], 3], [[4], 5], [[5], 8], [[10], 89], [[45], 1836311903]
      ] },
      hints: [`<p>Hint 1: Do not think about the first move; think about the <b>last</b> move into step n. It was a 1-step or a 2-step.</p>`, `<p>Hint 2: That gives ways(n) = ways(n−1) + ways(n−2) — Fibonacci shifted by one. A dp array or two rolling variables is enough.</p>`, `<p>Hint 3: Bases: ways(0) = 1, ways(1) = 1. Recipe: a = 1, b = 1; for i = 2..n: c = a + b, a = b, b = c; return b. n = 1 returns 1 without entering the loop.</p>`],
      solution: {
        approach: `<p>Bottom-up Fibonacci with two variables. <code>prev2</code> = ways to reach step i−2, <code>prev1</code> = ways to reach step i−1.</p>`,
        code: `class Solution {
    public int climbStairs(int n) {
        int prev2 = 1, prev1 = 1;          // ways(0), ways(1)
        for (int i = 2; i <= n; i++) {
            int cur = prev1 + prev2;       // last move: 1-step or 2-step
            prev2 = prev1;
            prev1 = cur;
        }
        return prev1;                      // ways(n)
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def climb_stairs(self, n: int) -> int:
        prev2, prev1 = 1, 1                  # ways(0), ways(1)
        for _ in range(2, n + 1):
            prev2, prev1 = prev1, prev1 + prev2   # last move: 1-step or 2-step
        return prev1` }, { lang: 'js', code: `function climbStairs(n) {
  let prev2 = 1, prev1 = 1;            // ways(0), ways(1)
  for (let i = 2; i <= n; i++) {
    [prev2, prev1] = [prev1, prev1 + prev2];   // last move: 1-step or 2-step
  }
  return prev1;                        // ways(n)
}` }, { lang: 'cpp', code: `class Solution {
public:
    int climbStairs(int n) {
        int prev2 = 1, prev1 = 1;            // ways(0), ways(1)
        for (int i = 2; i <= n; i++) {
            int cur = prev1 + prev2;         // last move: 1-step or 2-step
            prev2 = prev1;
            prev1 = cur;
        }
        return prev1;                        // ways(n); n <= 45 fits in int
    }
};` }],
        dry: { head: ['i', 'prev2 = ways(i-2)', 'prev1 = ways(i-1)', 'cur = ways(i)'], rows: [['2', '1', '1', '2'], ['3', '1', '2', '3'], ['4', '2', '3', H.c('g', '5')]] },
        complexity: `<p>Time O(n), space O(1).</p>`,
        followUps: ['Steps can be any size from a given set → sum over the set (O(n·k)).', 'Some stairs are broken (cannot be stepped on) → dp[broken] = 0.', 'Each stair has a cost → Min Cost Climbing Stairs (min instead of +).']
      }
    }]
  });

  // =====================================================================
  // TOPIC 3 — House Robber: the take-or-skip pattern
  // =====================================================================
  topics.push({
    title: 'House Robber: the Take-or-Skip Pattern',
    analogy: `<p>You walk down a street of houses collecting donations for a charity drive. Rule from the neighbourhood: if you ring a doorbell, the house <b>right next door</b> gets annoyed and will not donate. At each house you ask one question: "<b>Is ringing this bell worth losing the neighbour I just rang?</b>"</p>
      <p>You don't need to plan the whole street in advance. You only keep two numbers in your head: "best total if I stop just before this house" and "best total two houses ago". That tiny memory is the whole algorithm.</p>`,
    explain: `<p><b>Problem:</b> houses in a line hold money <code>a[0..n-1]</code>. You cannot rob two <b>adjacent</b> houses. Maximize the total.</p>
      <p><b>Why greedy fails:</b> "always rob the richest remaining house" on ${H.arr([2, 7, 9, 3, 1])} picks 9, then cannot take 7 or 3, then takes 2 and 1 → 12 (lucky). But on ${H.arr([5, 6, 5])} greedy takes 6 (then nothing else) = 6, while the best is 5 + 5 = <b>10</b>. "Take every other house" also fails: on ${H.arr([2, 1, 1, 2])} both even and odd positions give 3, but houses 0 and 3 give <b>4</b>.</p>
      <h4>The 5-step recipe</h4>
      ${H.table(['step', 'House Robber'], [
        ['State', '<code>dp[i]</code> = the most money you can get from houses <b>0..i</b> only'],
        ['Last choice', 'house i is either <b>skipped</b> or <b>robbed</b>'],
        ['Transition', '<code>dp[i] = max( dp[i-1] , dp[i-2] + a[i] )</code><br>skip i → keep best of 0..i−1; rob i → neighbour i−1 is off-limits, so best of 0..i−2 plus a[i]'],
        ['Base', '<code>dp[0] = a[0]</code>, <code>dp[1] = max(a[0], a[1])</code>'],
        ['Answer', '<code>dp[n-1]</code>']
      ])}
      <p>Walk-through on [2, 7, 9, 3, 1]:</p>
      ${H.table(['i', 'a[i]', 'skip = dp[i-1]', 'rob = dp[i-2] + a[i]', 'dp[i]'], [
        ['0', '2', '—', '—', '2'],
        ['1', '7', '2', '7', '7'],
        ['2', '9', '7', '2 + 9 = 11', H.c('g', '11')],
        ['3', '3', H.c('g', '11'), '7 + 3 = 10', '11'],
        ['4', '1', '11', H.c('g', '11 + 1 = 12'), H.c('g', '12')]
      ])}
      <p>Answer <b>12</b> (houses 0, 2, 4). The "take-or-skip" shape — <i>for every item, the best answer either uses it (and pays a restriction) or ignores it</i> — reappears in knapsack, LIS, subset sum and dozens of interview problems. Learn to see it.</p>`,
    clues: [
      '"<b>cannot pick two adjacent</b> / neighbouring" elements → take-or-skip DP with dp[i−2] on the take branch.',
      '"<b>maximum sum</b> of a subsequence with a gap rule" → dp[i] = max(skip, take + best compatible earlier).',
      'Houses arranged in a <b>circle</b> → run the line version twice (exclude first house / exclude last house).',
      '"<b>Delete and Earn</b>": taking value x deletes x−1 and x+1 → bucket by value, then it is House Robber on the buckets.',
      '<code>N ≤ 10<sup>5</sup></code>, values ≥ 0, "O(1) extra space?" → two rolling variables.',
      'A choice at i "<b>blocks</b>" the next k positions → take branch reads dp[i−k−1].'
    ],
    code: [{ lang: 'java', code: `
      // dp[i] = best loot using houses 0..i only.
      int rob(int[] a) {
          int n = a.length;
          if (n == 1) return a[0];
          int[] dp = new int[n];
          dp[0] = a[0];
          dp[1] = Math.max(a[0], a[1]);
          for (int i = 2; i < n; i++) {
              int skip = dp[i - 1];            // leave house i alone
              int take = dp[i - 2] + a[i];     // rob i, so i-1 is forbidden
              dp[i] = Math.max(skip, take);
          }
          return dp[n - 1];
      }

      // Same idea, O(1) space: prev2 = dp[i-2], prev1 = dp[i-1].
      int robO1(int[] a) {
          int prev2 = 0, prev1 = 0;            // "best before any house" = 0
          for (int x : a) {
              int cur = Math.max(prev1, prev2 + x);
              prev2 = prev1;
              prev1 = cur;
          }
          return prev1;
      }`, alt: [{ lang: 'python', code: `# dp[i] = best loot using houses 0..i only.
def rob(a):
    n = len(a)
    if n == 1:
        return a[0]
    dp = [0] * n
    dp[0] = a[0]
    dp[1] = max(a[0], a[1])
    for i in range(2, n):
        skip = dp[i - 1]                      # leave house i alone
        take = dp[i - 2] + a[i]               # rob i, so i-1 is forbidden
        dp[i] = max(skip, take)
    return dp[n - 1]

# Same idea, O(1) space: prev2 = dp[i-2], prev1 = dp[i-1].
def rob_o1(a):
    prev2 = prev1 = 0                         # "best before any house" = 0
    for x in a:
        prev2, prev1 = prev1, max(prev1, prev2 + x)
    return prev1` }, { lang: 'js', code: `// dp[i] = best loot using houses 0..i only.
function rob(a) {
  const n = a.length;
  if (n === 1) return a[0];
  const dp = new Array(n).fill(0);
  dp[0] = a[0];
  dp[1] = Math.max(a[0], a[1]);
  for (let i = 2; i < n; i++) {
    const skip = dp[i - 1];                   // leave house i alone
    const take = dp[i - 2] + a[i];            // rob i, so i-1 is forbidden
    dp[i] = Math.max(skip, take);
  }
  return dp[n - 1];
}

// Same idea, O(1) space: prev2 = dp[i-2], prev1 = dp[i-1].
function robO1(a) {
  let prev2 = 0, prev1 = 0;                   // "best before any house" = 0
  for (const x of a) {
    [prev2, prev1] = [prev1, Math.max(prev1, prev2 + x)];
  }
  return prev1;
}` }, { lang: 'cpp', code: `// dp[i] = best loot using houses 0..i only.
int rob(const vector<int>& a) {
    int n = a.size();
    if (n == 1) return a[0];
    vector<int> dp(n);
    dp[0] = a[0];
    dp[1] = max(a[0], a[1]);
    for (int i = 2; i < n; i++) {
        int skip = dp[i - 1];                 // leave house i alone
        int take = dp[i - 2] + a[i];          // rob i, so i-1 is forbidden
        dp[i] = max(skip, take);
    }
    return dp[n - 1];
}

// Same idea, O(1) space: prev2 = dp[i-2], prev1 = dp[i-1].
int robO1(const vector<int>& a) {
    int prev2 = 0, prev1 = 0;                 // "best before any house" = 0
    for (int x : a) {
        int cur = max(prev1, prev2 + x);
        prev2 = prev1;
        prev1 = cur;
    }
    return prev1;
}` }] }, { lang: 'python', run: true, title: 'With reconstruction: which houses? (Python, runnable)', code: `def rob_with_houses(a):
    n = len(a)
    dp = [0] * (n + 1)          # dp[i] = best using the first i houses (shifted by one)
    for i in range(1, n + 1):
        take = (dp[i - 2] if i >= 2 else 0) + a[i - 1]
        dp[i] = max(dp[i - 1], take)
    # walk backwards: if dp[i] == dp[i-1], house i-1 was skipped
    houses, i = [], n
    while i >= 1:
        if dp[i] == dp[i - 1]:
            i -= 1
        else:
            houses.append(i - 1)
            i -= 2
    return dp[n], sorted(houses)

print(rob_with_houses([2, 7, 9, 3, 1]))   # (12, [0, 2, 4])
print(rob_with_houses([2, 1, 1, 2]))      # (4, [0, 3])
print(rob_with_houses([5, 6, 5]))         # (10, [0, 2])
` }],
    codeTitle: ['House Robber: table and O(1) versions', 'With reconstruction (Python, runnable)'],
    viz: {
      title: 'House Robber: each cell compares "skip" (dp[i-1]) with "rob" (dp[i-2] + a[i])',
      input: '2 7 9 3 1',
      inputLabel: 'money in each house (2 to 10 numbers, 0..99)',
      gen: function (input) {
        var a = parseNums(input, 2, 10, 0, 99, 'the houses');
        var n = a.length, dp = [], i, frames = [];
        for (i = 0; i < n; i++) dp.push('');
        dp[0] = a[0];
        frames.push({ narr: 'Base: with only house 0, rob it → dp[0] = <b>' + a[0] + '</b>.', parts: [
          { type: 'array', label: 'a[] money', values: a.slice(), hl: { 0: 'cur' } },
          { type: 'array', label: 'dp[i] = best using houses 0..i', values: dp.slice(), hl: { 0: 'ok' } }
        ] });
        dp[1] = Math.max(a[0], a[1]);
        frames.push({ narr: 'Base: with houses 0 and 1 you can rob only one of them → dp[1] = max(' + a[0] + ', ' + a[1] + ') = <b>' + dp[1] + '</b>.', parts: [
          { type: 'array', label: 'a[] money', values: a.slice(), hl: { 0: 'win', 1: 'win' } },
          { type: 'array', label: 'dp[i] = best using houses 0..i', values: dp.slice(), hl: { 0: 'done', 1: 'ok' } }
        ] });
        for (i = 2; i < n; i++) {
          var skip = dp[i - 1], take = dp[i - 2] + a[i];
          var h = {}; for (var j = 0; j < i; j++) h[j] = 'done';
          h[i - 1] = 'win'; h[i - 2] = 'win';
          frames.push({ narr: 'House ' + i + ' has ' + a[i] + '. <b>Skip</b> it → keep dp[' + (i - 1) + '] = ' + skip + '. <b>Rob</b> it → neighbour ' + (i - 1) + ' is off-limits, so dp[' + (i - 2) + '] + ' + a[i] + ' = ' + take + '.', parts: [
            { type: 'array', label: 'a[] money', values: a.slice(), hl: one(i, 'cur'), ptr: one(i, 'i') },
            { type: 'array', label: 'dp[] (blue = the two cells this step reads)', values: dp.slice(), hl: h },
            { type: 'vars', vals: { skip: skip, rob: take }, hl: take > skip ? { rob: 'ok' } : { skip: 'ok' } }
          ] });
          dp[i] = Math.max(skip, take);
          h = {}; for (j = 0; j < i; j++) h[j] = 'done';
          h[i] = 'ok';
          frames.push({ narr: 'dp[' + i + '] = max(' + skip + ', ' + take + ') = <b>' + dp[i] + '</b> → ' + (take > skip ? '<span class="c-g">robbing house ' + i + ' is better</span>.' : '<span class="c-y">skipping house ' + i + ' is at least as good</span>.'), parts: [
            { type: 'array', label: 'a[] money', values: a.slice(), hl: one(i, take > skip ? 'ok' : 'bad') },
            { type: 'array', label: 'dp[]', values: dp.slice(), hl: h }
          ] });
        }
        var robbed = {}, k = n - 1, steps = [];
        while (k >= 0) {
          if (k === 0) { robbed[0] = 'sel'; steps.push('house 0 robbed'); break; }
          if (dp[k] === dp[k - 1]) { steps.push('dp[' + k + '] = dp[' + (k - 1) + '] → house ' + k + ' skipped'); k -= 1; }
          else { robbed[k] = 'sel'; steps.push('dp[' + k + '] ≠ dp[' + (k - 1) + '] → house ' + k + ' robbed'); k -= 2; }
        }
        frames.push({ narr: '<b>Reconstruct</b> by walking back: if dp[k] equals dp[k−1], house k was not needed; otherwise it was robbed and we jump to k−2. Purple = robbed houses.', parts: [
          { type: 'array', label: 'a[] money', values: a.slice(), hl: robbed },
          { type: 'array', label: 'dp[]', values: dp.slice(), hl: one(n - 1, 'sel') },
          { type: 'text', label: 'walk back', html: steps.join('<br>') }
        ] });
        var sum = 0; Object.keys(robbed).forEach(function (x) { sum += a[x]; });
        frames.push({ narr: 'Answer: <b>' + dp[n - 1] + '</b> (robbed houses add up to ' + sum + '). Each step only read two earlier cells — that is why O(1) space works.', parts: [
          { type: 'array', label: 'a[] money', values: a.slice(), hl: robbed },
          { type: 'vars', vals: { answer: dp[n - 1] }, hl: { answer: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Greedy trap [5, 6, 5]', html: `<p>Greedy "richest first" takes 6, blocking both 5s → 6. DP: dp = [5, 6, max(6, 5+5) = ${H.c('g', '10')}]. Lesson: a big single value can be worse than two medium ones it blocks.</p>` },
      { title: 'Not just "every other house" [2, 1, 1, 2]', html: `<p>Even indices: 2 + 1 = 3. Odd indices: 1 + 2 = 3. Optimal: houses 0 and 3 = <b>4</b> — the gap between robbed houses can be 2 or more. dp = [2, 2, 3, ${H.c('g', '4')}].</p>` },
      { title: 'House Robber II (circular street)', html: `<p>First and last house are now neighbours. They cannot both be robbed, so the answer is <code>max(rob(a[0..n-2]), rob(a[1..n-1]))</code>. Example [2, 3, 2]: rob([2,3]) = 3, rob([3,2]) = 3 → <b>3</b> (not 4). Single house n = 1 is a special case: return a[0].</p>`, code: { lang: 'java', code: `int robCircle(int[] a) {
    int n = a.length;
    if (n == 1) return a[0];
    return Math.max(robRange(a, 0, n - 2), robRange(a, 1, n - 1));
}
int robRange(int[] a, int lo, int hi) {
    int prev2 = 0, prev1 = 0;
    for (int i = lo; i <= hi; i++) {
        int cur = Math.max(prev1, prev2 + a[i]);
        prev2 = prev1;
        prev1 = cur;
    }
    return prev1;
}`, alt: [{ lang: 'python', code: `def rob_range(a, lo, hi):
    prev2 = prev1 = 0
    for x in a[lo:hi + 1]:
        prev2, prev1 = prev1, max(prev1, prev2 + x)
    return prev1

def rob_circle(a):
    n = len(a)
    if n == 1:
        return a[0]
    return max(rob_range(a, 0, n - 2), rob_range(a, 1, n - 1))` }, { lang: 'js', code: `function robRange(a, lo, hi) {
  let prev2 = 0, prev1 = 0;
  for (let i = lo; i <= hi; i++) [prev2, prev1] = [prev1, Math.max(prev1, prev2 + a[i])];
  return prev1;
}

function robCircle(a) {
  const n = a.length;
  if (n === 1) return a[0];
  return Math.max(robRange(a, 0, n - 2), robRange(a, 1, n - 1));
}` }, { lang: 'cpp', code: `int robRange(const vector<int>& a, int lo, int hi) {
    int prev2 = 0, prev1 = 0;
    for (int i = lo; i <= hi; i++) {
        int cur = max(prev1, prev2 + a[i]);
        prev2 = prev1;
        prev1 = cur;
    }
    return prev1;
}

int robCircle(const vector<int>& a) {     // robRange is defined first: C++ needs it declared
    int n = a.size();
    if (n == 1) return a[0];
    return max(robRange(a, 0, n - 2), robRange(a, 1, n - 1));
}` }] } },
      { title: 'Delete and Earn reduces to House Robber', html: `<p>nums = [2, 2, 3, 3, 3, 4]. Taking a value x earns x but deletes all x−1 and x+1. Build points[v] = v × count(v): points = [0, 0, 4, 9, 4] for v = 0..4. Adjacent <i>values</i> conflict exactly like adjacent houses → House Robber on points → max(4 + 4, 9) = <b>9</b>.</p>` }
    ],
    deepDive: `<p><b>Two-state view (state machine).</b> Another way to write it: <code>robbed[i]</code> = best if house i is robbed, <code>free[i]</code> = best if it is not. Then robbed[i] = free[i−1] + a[i], free[i] = max(robbed[i−1], free[i−1]). This "state machine DP" generalises to stock buy/sell with cooldown (DSA 18) — the same idea with more states.</p>
      <p><b>Proof sketch (exchange-free induction):</b> any valid robbery plan for houses 0..i either excludes i (then it is a valid plan for 0..i−1, worth ≤ dp[i−1]) or includes i (then it excludes i−1, so the rest is a valid plan for 0..i−2, worth ≤ dp[i−2]). Both cases are achievable, so dp[i] is exactly the max.</p>
      <p><b>Negative values.</b> If money can be negative, robbing nothing must be allowed: start with prev1 = prev2 = 0 (the O(1) version already handles that since max(prev1, …) never forces a take). The array version with dp[0] = a[0] would wrongly force a negative house — use dp[0] = max(0, a[0]).</p>
      <p><b>Variants:</b> House Robber III puts houses on a binary tree — return a pair (rob this node, skip this node) from each subtree (tree DP, DSA 18). "No k consecutive" generalises the take branch. "Maximum sum of non-adjacent elements" on a 2×N grid (pick from either row of a column, but not adjacent columns) collapses each column to max of the two rows, then House Robber.</p>
      <p><b>Production reality:</b> the same take/skip shape schedules non-overlapping jobs for profit (weighted interval scheduling: sort by end, binary search the last compatible job, dp[i] = max(dp[i−1], profit[i] + dp[p(i)])) — used in ad-slot and meeting-room allocation.</p>`,
    aiEra: `<p><b>What AI changes:</b> House Robber is one of the most memorised problems on the internet; an AI writes it in a second. Interviewers therefore twist it (circle, tree, values deleting neighbours, k-gap) and watch whether you <b>re-derive</b> the state instead of reciting.</p>
      <p><b>Use AI as a partner:</b> ask <code>Give me 4 disguised versions of House Robber without naming it</code>, solve them, then ask it to check your reductions. Ask for adversarial tests: single house, two houses, all zeros, negatives.</p>
      <p><b>Where AI goes wrong:</b> crashes on n = 1 (reads a[1]), forgets the n = 1 special case in the circular version, and in reconstruction compares the wrong cells. It also sometimes "optimises" with even/odd sums — wrong, as [2,1,1,2] shows.</p>
      <p><b>What you must still own:</b> the take-or-skip mental model, the induction argument for why two cells suffice, and the reductions (Delete and Earn, circular, weighted intervals) that turn a new problem into this one.</p>`,
    problems: [{
      title: 'House Robber', level: 'Medium', tags: ['dp', 'take or skip', '1d dp'], companies: ['Amazon', 'Google', 'Microsoft', 'Cisco'],
      statement: `<p>Houses along a street hold <code>nums[i]</code> money. Adjacent houses have connected alarms: robbing two adjacent houses on the same night calls the police. Return the maximum amount you can rob without alerting the police.</p>`,
      constraints: `1 ≤ n ≤ 100, 0 ≤ nums[i] ≤ 400`,
      example: `${H.arr([2, 7, 9, 3, 1], { hl: { 0: 'g', 2: 'g', 4: 'g' } })}<p>Output <b>12</b>: rob houses 0, 2 and 4 → ${H.c('g', '2 + 9 + 1 = 12')}. Robbing 7 and 3 gives only 10.</p>`,
      brute: { why: `<p>Try every subset with no two adjacent members (recursion: at house i, either skip to i+1 or take and jump to i+2). The number of such subsets grows like Fibonacci (~1.6<sup>n</sup>); for n = 100 that is ~10<sup>21</sup>. The waste: "best from house 7 onward" is recomputed in countless branches.</p>`, code: `int best(int[] a, int i) {
    if (i >= a.length) return 0;               // no houses left
    int skip = best(a, i + 1);                 // leave house i
    int take = a[i] + best(a, i + 2);          // rob i, neighbour i+1 forbidden
    return Math.max(skip, take);
}` },
      mcq: { q: 'In dp[i] = max(dp[i−1], dp[i−2] + nums[i]), why dp[i−2] in the rob branch?', options: ['Because robbing i forbids house i−1, so only houses 0..i−2 remain usable', 'Because we must skip exactly one house every time', 'Because dp[i−1] is always smaller', 'It is a typo; it should be dp[i−1]'], answer: 0, explain: 'Robbing house i blocks i−1; the best you can add from the rest is the best plan for 0..i−2.' },
      tests: { sig: 'int[] -> int', fn: 'rob', cases: [
        [[[2, 7, 9, 3, 1]], 12], [[[1, 2, 3, 1]], 4], [[[5]], 5], [[[2, 1]], 2], [[[0, 0, 0]], 0],
        [[[2, 1, 1, 2]], 4], [[[5, 6, 5]], 10],
        [[{ $rep: 400, n: 100 }], 20000], [[{ $rep: 400, n: 99 }], 20000]
      ] },
      hints: [`<p>Hint 1: Look at the last house i. Either you rob it or you don't. Those are the only two possibilities.</p>`, `<p>Hint 2: dp[i] = best for houses 0..i = max(dp[i−1], dp[i−2] + nums[i]). Only two previous values matter → two variables.</p>`, `<p>Hint 3: Start with prev2 = 0, prev1 = 0 ("no houses yet") and loop over every house: cur = max(prev1, prev2 + x); prev2 = prev1; prev1 = cur. This handles n = 1 automatically.</p>`],
      solution: {
        approach: `<p>Take-or-skip DP with two rolling variables. <code>prev1</code> = best up to the previous house, <code>prev2</code> = best up to the house before that.</p>`,
        code: `class Solution {
    public int rob(int[] nums) {
        int prev2 = 0, prev1 = 0;                 // best before the first house
        for (int x : nums) {
            int cur = Math.max(prev1, prev2 + x); // skip x  vs  rob x
            prev2 = prev1;
            prev1 = cur;
        }
        return prev1;
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def rob(self, nums):
        prev2 = prev1 = 0
        for x in nums:
            prev2, prev1 = prev1, max(prev1, prev2 + x)
        return prev1` }, { lang: 'js', code: `function rob(nums) {
  let prev2 = 0, prev1 = 0;                       // best before the first house
  for (const x of nums) {
    [prev2, prev1] = [prev1, Math.max(prev1, prev2 + x)];   // skip x vs rob x
  }
  return prev1;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int rob(vector<int>& nums) {
        int prev2 = 0, prev1 = 0;
        for (int x : nums) {
            int cur = max(prev1, prev2 + x);
            prev2 = prev1;
            prev1 = cur;
        }
        return prev1;
    }
};` }],
        dry: { head: ['x', 'prev2', 'prev1', 'cur = max(prev1, prev2 + x)'], rows: [['2', '0', '0', 'max(0, 2) = 2'], ['7', '0', '2', 'max(2, 7) = 7'], ['9', '2', '7', 'max(7, 11) = 11'], ['3', '7', '11', 'max(11, 10) = 11'], ['1', '11', '11', H.c('g', 'max(11, 12) = 12')]] },
        complexity: `<p>Time O(n), space O(1).</p>`,
        followUps: ['Houses in a circle (House Robber II).', 'Return which houses were robbed.', 'Houses on a binary tree (House Robber III, DSA 18).']
      }
    }]
  });

  // =====================================================================
  // TOPIC 4 — Coin Change: minimum coins and number of ways
  // =====================================================================
  function parseCoins(input, maxCoins, maxAmt) {
    var s = String(input === undefined ? '' : input).split('|');
    if (s.length !== 2) throw new Error('Format: coins | amount, e.g. 1 3 4 | 6');
    var coins = parseNums(s[0], 1, maxCoins, 1, 50, 'the coins');
    var amt = parseNums(s[1], 1, 1, 1, maxAmt, 'the amount')[0];
    return { coins: coins, amt: amt };
  }
  topics.push({
    title: 'Coin Change: Minimum Coins and Number of Ways',
    analogy: `<p>You are a shopkeeper with unlimited coins of a few types, say ₹1, ₹3 and ₹4, and you must hand back ₹6 change.</p>
      <ul><li><b>Minimum coins</b> question: "What is the <i>fewest</i> coins I can hand over?" Think backwards from the <b>last coin you hand over</b>: if it was ₹3, you still owe ₹3 — and you already know the best way to pay ₹3.</li>
      <li><b>Number of ways</b> question: "How many different <i>piles</i> of coins make ₹6?" Like counting how many different shopping baskets add up to the same bill.</li></ul>
      <p>Same coins, same table shape — but one question takes a <b>min</b>, the other <b>adds</b>, and the loop order decides whether 1+3 and 3+1 count as one pile or two.</p>`,
    explain: `<h4>1) Minimum number of coins (LeetCode 322)</h4>
      <p><b>Greedy fails.</b> Coins {1, 3, 4}, amount 6: greedy grabs the biggest coin 4, then 1 + 1 → <span class="c-r">3 coins</span>. Best is 3 + 3 → <span class="c-g">2 coins</span>. (Greedy only works for special "canonical" systems like real-world ₹/$ coins.)</p>
      ${H.table(['step', 'Min coins'], [
        ['State', '<code>dp[a]</code> = fewest coins that make exactly amount a (∞ if impossible)'],
        ['Last choice', 'which coin c was handed over <b>last</b>?'],
        ['Transition', '<code>dp[a] = 1 + min over coins c ≤ a of dp[a − c]</code>'],
        ['Base', '<code>dp[0] = 0</code> (zero coins make zero), everything else starts at ∞'],
        ['Answer', '<code>dp[amount]</code>, or −1 if still ∞']
      ])}
      ${H.table(['a', '0', '1', '2', '3', '4', '5', '6'], [['dp[a]', '0', '1', '2', '1', '1', '2', H.c('g', '2')], ['best last coin', '—', '1', '1', '3', '4', '4 (or 1)', '3']])}
      <p>dp[6] = 1 + min(dp[5], dp[3], dp[2]) = 1 + min(2, 1, 2) = <b>2</b>.</p>
      <h4>2) Number of ways = combinations (LeetCode 518)</h4>
      <p>Now count the <b>piles</b> (order does not matter: 1+2 and 2+1 are the same pile). Trick: decide coin types <b>one at a time</b>. <code>ways[i][a]</code> = piles making a using only the first i coin types. For coin type i you either use <b>none</b> of it (ways[i−1][a]) or <b>at least one</b> (ways[i][a − c], same row because you may use it again).</p>
      <p style="text-align:center"><code>ways[i][a] = ways[i−1][a] + ways[i][a − c<sub>i</sub>]</code>, base <code>ways[·][0] = 1</code>.</p>
      <p>Squashed into 1D: <b>outer loop over coins, inner loop over amounts</b> (left → right): <code>ways[a] += ways[a − c]</code>.</p>
      <h4>3) Number of ordered sequences = permutations (LeetCode 377)</h4>
      <p>If 1+2 and 2+1 should count separately, swap the loops: <b>outer loop over amounts, inner over coins</b>: <code>ways[a] = Σ ways[a − c]</code> — exactly climbing stairs with step sizes = coins.</p>
      ${H.table(['coins {1, 2, 5}, amount 5', 'loop order', 'result'], [
        ['combinations (piles)', 'for coin → for amount', H.c('g', '4') + ' : 5, 2+2+1, 2+1+1+1, 1×5'],
        ['permutations (sequences)', 'for amount → for coin', H.c('b', '9') + ' : 5, and 8 orderings of 1s and 2s']
      ])}`,
    clues: [
      '"<b>fewest number of coins</b> / minimum number of items to make exactly X" → dp[a] = 1 + min dp[a − c], base 0, others ∞.',
      '"If that amount cannot be made, <b>return −1</b>" → keep an ∞ sentinel and check it at the end.',
      '"<b>number of combinations</b> that make up the amount" (order doesn\'t matter) → coins outer loop, amount inner loop.',
      '"<b>different sequences</b> are counted as different combinations" (LC 377 wording!) → amount outer loop, coins inner loop.',
      '"<b>infinite number of each kind</b> of coin" → unbounded (same coin reusable) → inner loop goes forward / same row.',
      '<code>amount ≤ 10<sup>4</sup></code>, <code>coins ≤ 12</code> → O(amount × coins) ≈ 1.2·10<sup>5</sup> — trivial.'
    ],
    code: [{ lang: 'java', code: `
      // Minimum coins (LeetCode 322). dp[a] = fewest coins summing to a.
      int coinChange(int[] coins, int amount) {
          int INF = amount + 1;                  // more coins than could ever be needed
          int[] dp = new int[amount + 1];
          Arrays.fill(dp, INF);
          dp[0] = 0;                             // zero coins make amount 0
          for (int a = 1; a <= amount; a++) {
              for (int c : coins) {
                  if (c <= a && dp[a - c] + 1 < dp[a]) {
                      dp[a] = dp[a - c] + 1;     // last coin handed over is c
                  }
              }
          }
          return dp[amount] == INF ? -1 : dp[amount];
      }

      // Number of COMBINATIONS (LeetCode 518): coins outer, amounts inner.
      int change(int amount, int[] coins) {
          int[] ways = new int[amount + 1];
          ways[0] = 1;                           // one way to make 0: take nothing
          for (int c : coins) {                  // decide coin types one at a time
              for (int a = c; a <= amount; a++) {
                  ways[a] += ways[a - c];        // add "at least one more coin c"
              }
          }
          return ways[amount];
      }

      // Number of ORDERED SEQUENCES (LeetCode 377): amounts outer, coins inner.
      int combinationSum4(int[] nums, int target) {
          int[] ways = new int[target + 1];
          ways[0] = 1;
          for (int a = 1; a <= target; a++) {
              for (int c : nums) {
                  if (c <= a) ways[a] += ways[a - c]; // last element of the sequence is c
              }
          }
          return ways[target];
      }`, alt: [{ lang: 'python', code: `# Minimum coins (LeetCode 322). dp[a] = fewest coins summing to a.
def coin_change(coins, amount):
    INF = amount + 1                          # more coins than could ever be needed
    dp = [0] + [INF] * amount                 # zero coins make amount 0
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1         # last coin handed over is c
    return -1 if dp[amount] == INF else dp[amount]

# Number of COMBINATIONS (LeetCode 518): coins outer, amounts inner.
def change(amount, coins):
    ways = [1] + [0] * amount                 # one way to make 0: take nothing
    for c in coins:                           # decide coin types one at a time
        for a in range(c, amount + 1):
            ways[a] += ways[a - c]            # add "at least one more coin c"
    return ways[amount]

# Number of ORDERED SEQUENCES (LeetCode 377): amounts outer, coins inner.
def combination_sum4(nums, target):
    ways = [1] + [0] * target
    for a in range(1, target + 1):
        for c in nums:
            if c <= a:
                ways[a] += ways[a - c]        # last element of the sequence is c
    return ways[target]` }, { lang: 'js', code: `// Minimum coins (LeetCode 322). dp[a] = fewest coins summing to a.
function coinChange(coins, amount) {
  const INF = amount + 1;                     // more coins than could ever be needed
  const dp = new Array(amount + 1).fill(INF);
  dp[0] = 0;                                  // zero coins make amount 0
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a && dp[a - c] + 1 < dp[a]) {
        dp[a] = dp[a - c] + 1;                // last coin handed over is c
      }
    }
  }
  return dp[amount] === INF ? -1 : dp[amount];
}

// Number of COMBINATIONS (LeetCode 518): coins outer, amounts inner.
function change(amount, coins) {
  const ways = new Array(amount + 1).fill(0);
  ways[0] = 1;                                // one way to make 0: take nothing
  for (const c of coins) {                    // decide coin types one at a time
    for (let a = c; a <= amount; a++) {
      ways[a] += ways[a - c];                 // add "at least one more coin c"
    }
  }
  return ways[amount];
}

// Number of ORDERED SEQUENCES (LeetCode 377): amounts outer, coins inner.
function combinationSum4(nums, target) {
  const ways = new Array(target + 1).fill(0);
  ways[0] = 1;
  for (let a = 1; a <= target; a++) {
    for (const c of nums) {
      if (c <= a) ways[a] += ways[a - c];     // last element of the sequence is c
    }
  }
  return ways[target];
}` }, { lang: 'cpp', code: `// Minimum coins (LeetCode 322). dp[a] = fewest coins summing to a.
int coinChange(const vector<int>& coins, int amount) {
    const int INF = amount + 1;               // more coins than could ever be needed
    vector<int> dp(amount + 1, INF);
    dp[0] = 0;                                // zero coins make amount 0
    for (int a = 1; a <= amount; a++) {
        for (int c : coins) {
            if (c <= a && dp[a - c] + 1 < dp[a]) {
                dp[a] = dp[a - c] + 1;        // last coin handed over is c
            }
        }
    }
    return dp[amount] == INF ? -1 : dp[amount];
}

// Number of COMBINATIONS (LeetCode 518): coins outer, amounts inner.
long long change(int amount, const vector<int>& coins) {
    vector<long long> ways(amount + 1, 0);
    ways[0] = 1;                              // one way to make 0: take nothing
    for (int c : coins) {                     // decide coin types one at a time
        for (int a = c; a <= amount; a++) {
            ways[a] += ways[a - c];           // add "at least one more coin c"
        }
    }
    return ways[amount];
}

// Number of ORDERED SEQUENCES (LeetCode 377): amounts outer, coins inner.
long long combinationSum4(const vector<int>& nums, int target) {
    vector<long long> ways(target + 1, 0);
    ways[0] = 1;
    for (int a = 1; a <= target; a++) {
        for (int c : nums) {
            if (c <= a) ways[a] += ways[a - c];   // last element of the sequence is c
        }
    }
    return ways[target];
}` }] }, { lang: 'python', run: true, title: 'Combinations vs permutations: see the loop order matter (Python, runnable)', code: `def combos(coins, amount):
    ways = [1] + [0] * amount
    for c in coins:                 # coin outer -> each pile counted once
        for a in range(c, amount + 1):
            ways[a] += ways[a - c]
    return ways[amount]

def perms(coins, amount):
    ways = [1] + [0] * amount
    for a in range(1, amount + 1):  # amount outer -> every ordering counted
        for c in coins:
            if c <= a:
                ways[a] += ways[a - c]
    return ways[amount]

def min_coins(coins, amount):
    INF = float("inf")
    dp = [0] + [INF] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return -1 if dp[amount] == INF else dp[amount]

print("combinations of 5 with 1,2,5:", combos([1, 2, 5], 5))   # 4
print("ordered sequences:", perms([1, 2, 5], 5))               # 9
print("min coins for 6 with 1,3,4:", min_coins([1, 3, 4], 6))  # 2
print("min coins for 3 with 2:", min_coins([2], 3))            # -1
` }],
    codeTitle: ['Min coins, combinations, permutations', 'Loop order experiment (Python, runnable)'],
    viz: [{
      title: 'Min coins: dp[a] looks back at dp[a − c] for every coin c',
      input: '1 3 4 | 6',
      inputLabel: 'coins | amount (up to 5 coins, amount ≤ 15)',
      gen: function (input) {
        var p = parseCoins(input, 5, 15), coins = p.coins, A = p.amt;
        var dp = [0], last = [0], frames = [], a, j;
        for (a = 1; a <= A; a++) { dp.push(INF); last.push(-1); }
        frames.push({ narr: 'dp[a] = fewest coins to make a. Base dp[0] = 0; everything else starts at ∞ ("not possible yet"). Coins: ' + coins.join(', ') + '.', parts: [
          { type: 'array', label: 'dp[a]', values: dp.map(show), hl: { 0: 'ok' } }
        ] });
        for (a = 1; a <= A; a++) {
          var h = {}, notes = [], best = INF, bestC = -1;
          for (j = 0; j < a; j++) h[j] = 'done';
          coins.forEach(function (c) {
            if (c <= a) {
              h[a - c] = 'win';
              var cand = dp[a - c] >= INF ? INF : dp[a - c] + 1;
              notes.push('coin ' + c + ': dp[' + (a - c) + '] + 1 = ' + show(cand));
              if (cand < best) { best = cand; bestC = c; }
            } else notes.push('coin ' + c + ' &gt; ' + a + ': cannot use');
          });
          h[a] = 'cur';
          frames.push({ narr: 'Amount ' + a + ': which coin could be the <b>last</b> one handed over? Blue cells are the amounts left after removing each coin.', parts: [
            { type: 'array', label: 'dp[a]', values: dp.map(show), hl: h, ptr: one(a, 'a') },
            { type: 'text', label: 'candidates', html: notes.join('<br>') }
          ] });
          dp[a] = best; last[a] = bestC;
          h = {}; for (j = 0; j < a; j++) h[j] = 'done';
          if (bestC > 0) h[a - bestC] = 'win';
          h[a] = best >= INF ? 'bad' : 'ok';
          frames.push({ narr: best >= INF ? 'No coin works → dp[' + a + '] stays ∞ (amount ' + a + ' is impossible).' : 'dp[' + a + '] = <b>' + best + '</b> (last coin ' + bestC + ', coming from dp[' + (a - bestC) + ']).', parts: [
            { type: 'array', label: 'dp[a]', values: dp.map(show), hl: h }
          ] });
        }
        if (dp[A] >= INF) {
          frames.push({ narr: 'dp[' + A + '] = ∞ → the answer is <b>−1</b>: these coins can never make ' + A + '.', parts: [{ type: 'array', label: 'dp[a]', values: dp.map(show), hl: one(A, 'bad') }] });
          return frames;
        }
        var used = [], hh = {}, x = A;
        while (x > 0) { hh[x] = 'sel'; used.push(last[x]); x -= last[x]; }
        hh[0] = 'sel';
        frames.push({ narr: 'Answer: <b>' + dp[A] + '</b> ' + (dp[A] === 1 ? 'coin' : 'coins') + '. Follow the "last coin" links back from ' + A + ' to 0 to list them: <b>' + used.join(' + ') + '</b>.', parts: [
          { type: 'array', label: 'dp[a]', values: dp.map(show), hl: hh },
          { type: 'set', label: 'coins used', items: used.map(String) }
        ] });
        return frames;
      }
    }, {
      title: 'Number of ways (combinations): ways[i][a] = ways[i−1][a] (skip coin) + ways[i][a−c] (use it again)',
      input: '1 2 5 | 5',
      inputLabel: 'coins | amount (up to 4 coins, amount ≤ 10)',
      gen: function (input) {
        var p = parseCoins(input, 4, 10), coins = p.coins, A = p.amt, n = coins.length;
        var rows = [], i, a, filled = {};
        for (i = 0; i <= n; i++) { rows.push([]); for (a = 0; a <= A; a++) rows[i].push(i === 0 ? (a === 0 ? 1 : 0) : ''); }
        for (a = 0; a <= A; a++) filled['0,' + a] = 1;
        var rh = ['no coins'].concat(coins.map(function (c, k) { return '+ coin ' + c; }));
        var ch = range(A + 1).map(function (x) { return 'a=' + x; });
        var frames = [];
        frames.push({ narr: 'Row 0 = "using no coin types": only amount 0 can be made (the empty pile) → 1, every other amount → 0.', parts: [
          grid('ways[i][a]', rows, rh, ch, gridHl(filled, {}))
        ] });
        for (i = 1; i <= n; i++) {
          var c = coins[i - 1];
          for (a = 0; a <= A; a++) {
            var up = rows[i - 1][a], left = a >= c ? rows[i][a - c] : 0;
            rows[i][a] = up + left;
            var sp = {}; sp[(i - 1) + ',' + a] = 'win';
            if (a >= c) sp[i + ',' + (a - c)] = 'win';
            sp[i + ',' + a] = 'cur';
            frames.push({ narr: 'Coin ' + c + ', amount ' + a + ': piles that use <b>no</b> coin ' + c + ' = cell above = ' + up + (a >= c ? '; piles that use <b>at least one</b> = same row, ' + c + ' to the left = ' + left : '; coin ' + c + ' is too big to use') + ' → <b>' + rows[i][a] + '</b>.', parts: [
              grid('ways[i][a]', rows, rh, ch, gridHl(filled, sp))
            ] });
            filled[i + ',' + a] = 1;
          }
        }
        frames.push({ narr: 'Answer in the bottom-right cell: <b>' + rows[n][A] + '</b> different piles make ' + A + '. Notice each row only read itself and the row above → a single 1D array with the coin loop outside is enough.', parts: [
          grid('ways[i][a]', rows, rh, ch, gridHl(filled, one(n + ',' + A, 'sel')))
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Impossible amount → −1', html: `<p>coins = [2], amount = 3. dp = [0, ∞, 1, ∞]. dp[3] = 1 + dp[1] = ∞ → return <b>−1</b>. Using the largest int (Java <code>Integer.MAX_VALUE</code>, C++ <code>INT_MAX</code>) as ∞ and then doing <code>+ 1</code> overflows to a negative number (Java wraps; in C++ it is undefined behaviour) and returns garbage — that is why we use <code>amount + 1</code> as ∞ (no answer can need more than <code>amount</code> coins when the smallest coin is 1).</p>` },
      { title: 'Combinations vs permutations, by hand', html: `<p>coins {1, 2}, amount 3.</p>${H.table(['loop order', 'what is counted', 'answer'], [['coin outer', '{1,1,1}, {1,2}', H.c('g', '2')], ['amount outer', '1+1+1, 1+2, 2+1', H.c('b', '3')]])}<p>With coin-outer, once you move to coin 2 you can never add a 1 after a 2 → each pile is built in one fixed order (all 1s, then all 2s) → counted once.</p>` },
      { title: 'Amount 0', html: `<p>coins = [1], amount = 0 → min coins = <b>0</b>, number of ways = <b>1</b> (the empty pile). Interviewers check this: dp[0] = 0 for min, ways[0] = 1 for counting.</p>` },
      { title: 'Perfect Squares is coin change in disguise', html: `<p>"Fewest perfect squares summing to n" (LC 279): the coins are 1, 4, 9, 16, … ≤ n. n = 12 → 4 + 4 + 4 = <b>3</b> (greedy 9 + 1 + 1 + 1 = 4 squares is wrong). Same dp, O(n√n).</p>`, code: { lang: 'java', code: `int numSquares(int n) {
    int[] dp = new int[n + 1];
    Arrays.fill(dp, n + 1);
    dp[0] = 0;
    for (int a = 1; a <= n; a++)
        for (int s = 1; s * s <= a; s++)
            dp[a] = Math.min(dp[a], dp[a - s * s] + 1);
    return dp[n];
}`, alt: [{ lang: 'python', code: `def num_squares(n):
    dp = [0] + [n + 1] * n
    for a in range(1, n + 1):
        s = 1
        while s * s <= a:
            dp[a] = min(dp[a], dp[a - s * s] + 1)
            s += 1
    return dp[n]` }, { lang: 'js', code: `function numSquares(n) {
  const dp = new Array(n + 1).fill(n + 1);
  dp[0] = 0;
  for (let a = 1; a <= n; a++)
    for (let s = 1; s * s <= a; s++)
      dp[a] = Math.min(dp[a], dp[a - s * s] + 1);
  return dp[n];
}` }, { lang: 'cpp', code: `int numSquares(int n) {
    vector<int> dp(n + 1, n + 1);
    dp[0] = 0;
    for (int a = 1; a <= n; a++)
        for (int s = 1; s * s <= a; s++)
            dp[a] = min(dp[a], dp[a - s * s] + 1);
    return dp[n];
}` }] } }
    ],
    deepDive: `<p><b>Why the loop order decides combinations vs permutations.</b> Coin-outer processes coin types in a fixed order, so every multiset is generated exactly once, as "all coins of type 1, then all of type 2, …". Amount-outer lets the last coin be any type at every step, so every arrangement is generated. Mixing them up is the #1 bug on this topic.</p>
      <p><b>Overflow.</b> LC 518 promises the answer fits in a 32-bit int, but intermediate cells can still overflow in some inputs for LC 377 (which is why some solutions use a 64-bit integer or cap values at the int maximum; Python ints never overflow, and JS numbers stay exact only up to 2<sup>53</sup>). In exam settings answers are taken mod 10<sup>9</sup>+7.</p>
      <p><b>Complexity.</b> Both are O(amount × #coins) time and O(amount) space. This is <i>pseudo-polynomial</i>: polynomial in the <b>value</b> of amount, exponential in its number of bits. Amount = 10<sup>9</sup> would need a different idea (e.g. BFS with pruning for small answers, or math for canonical coin systems).</p>
      <p><b>BFS view of min coins.</b> Amounts are nodes; each coin is an edge of weight 1. Min coins = shortest path from 0 to amount — BFS solves it too and can stop early, but the dp is simpler and has the same worst case.</p>
      <p><b>When greedy is optimal.</b> Coin systems where greedy always works are called <i>canonical</i> (₹1, 2, 5, 10, 20 … and US 1, 5, 10, 25 are). Kozen &amp; Zaks showed that if greedy fails, a counterexample exists below c<sub>max</sub> + c<sub>second max</sub>, and Pearson gave an O(n<sup>3</sup>) test for canonicity. In interviews: assume arbitrary coins → DP.</p>
      <p><b>Reconstruction.</b> Keep <code>last[a]</code> = the coin that achieved dp[a]; walk a → a − last[a] until 0 to print the coins (the visualizer does this).</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants know LC 322/518/377 by heart, so the interviewer's real test becomes: "Here is a slightly different wording — do you count piles or sequences? Is the coin reusable?" That reading skill is yours.</p>
      <p><b>Use AI as a partner:</b> paste the problem wording and ask <code>Is this order-sensitive? Quote the exact sentence that decides it.</code> Then generate random tests and compare your DP against a brute-force enumerator the AI writes.</p>
      <p><b>Where AI goes wrong:</b> swapping the loop order (answering 9 instead of 4), using the largest int as ∞ and overflowing on +1, applying greedy for "real-looking" coin sets, and forgetting amount = 0.</p>
      <p><b>What you must still own:</b> the combinations-vs-permutations argument, the ∞ sentinel choice, the pseudo-polynomial caveat, and turning disguised wordings (perfect squares, minimum stamps, ribbon cutting) into this exact table.</p>`,
    problems: [{
      title: 'Coin Change (minimum coins)', level: 'Medium', tags: ['dp', 'unbounded knapsack', 'coin change'], companies: ['Amazon', 'Google', 'Microsoft', 'Goldman Sachs', 'Uber'],
      statement: `<p>Given coin denominations <code>coins</code> (unlimited supply of each) and an integer <code>amount</code>, return the fewest number of coins needed to make up exactly that amount. If it cannot be made, return <code>-1</code>.</p>`,
      constraints: `1 ≤ coins.length ≤ 12, 1 ≤ coins[i] ≤ 2<sup>31</sup>−1, 0 ≤ amount ≤ 10<sup>4</sup>`,
      example: `<p>coins = [1, 3, 4], amount = 6 → Output <b>2</b> (${H.c('g', '3 + 3')}). Greedy would take ${H.c('r', '4 + 1 + 1 = 3 coins')}.</p><p>coins = [2], amount = 3 → <b>−1</b>.</p>`,
      brute: { why: `<p>Recursively try every coin as the next coin: f(a) = 1 + min f(a − c). Without memo the tree has up to (#coins)<sup>amount / smallest coin</sup> nodes — for amount 100 and coins {1,2,5} that is astronomically many. The same remaining amount (say 37) is solved again in millions of branches.</p>`, code: `int minCoins(int[] coins, int a) {
    if (a == 0) return 0;
    int best = Integer.MAX_VALUE;
    for (int c : coins) {
        if (c <= a) {
            int sub = minCoins(coins, a - c);
            if (sub != Integer.MAX_VALUE) best = Math.min(best, sub + 1);
        }
    }
    return best;   // MAX_VALUE means impossible; caller converts to -1
}` },
      mcq: { q: 'Which initial value is the safest "∞" for dp[a]?', options: ['The largest int (Integer.MAX_VALUE / INT_MAX)', 'amount + 1', '0', '-1'], answer: 1, explain: 'No valid answer needs more than amount coins (all coins ≥ 1), so amount + 1 means impossible — and dp + 1 never overflows. The largest int + 1 wraps to a negative number in Java (and is undefined behaviour in C++).' },
      tests: { sig: 'int[] int -> int', fn: 'coinChange', cases: [
        [[[1, 2, 5], 11], 3], [[[2], 3], -1], [[[1], 0], 0], [[[1, 3, 4], 6], 2],
        [[[186, 419, 83, 408], 6249], 20], [[[2147483647], 2], -1], [[[7, 2147483647], 0], 0],
        [[[1, 2, 5], 10000], 2000], [[[3, 7], 10000], 1432]
      ] },
      hints: [`<p>Hint 1: Think about the <b>last</b> coin you hand over. If it is c, the rest is the best way to pay a − c.</p>`, `<p>Hint 2: dp[a] = 1 + min(dp[a − c]) over coins c ≤ a; dp[0] = 0; fill a = 1..amount in increasing order.</p>`, `<p>Hint 3: Fill dp with amount + 1 as ∞. At the end return dp[amount] &gt; amount ? −1 : dp[amount]. amount = 0 returns 0. Coins larger than amount are simply skipped (also avoids int overflow with huge coins).</p>`],
      solution: {
        approach: `<p>Unbounded "min" DP over amounts. Each amount looks back at amount − c for every coin and keeps the smallest count + 1.</p>`,
        code: `class Solution {
    public int coinChange(int[] coins, int amount) {
        int INF = amount + 1;                       // impossible marker
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, INF);
        dp[0] = 0;
        for (int a = 1; a <= amount; a++) {
            for (int c : coins) {
                if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
            }
        }
        return dp[amount] > amount ? -1 : dp[amount];
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def coin_change(self, coins, amount):
        INF = amount + 1                          # impossible marker
        dp = [0] + [INF] * amount
        for a in range(1, amount + 1):
            dp[a] = min((dp[a - c] + 1 for c in coins if c <= a), default=INF)
        return -1 if dp[amount] > amount else dp[amount]` }, { lang: 'js', code: `function coinChange(coins, amount) {
  const INF = amount + 1;                         // impossible marker
  const dp = new Array(amount + 1).fill(INF);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);   // last coin is c
    }
  }
  return dp[amount] > amount ? -1 : dp[amount];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        vector<int> dp(amount + 1, amount + 1);
        dp[0] = 0;
        for (int a = 1; a <= amount; a++)
            for (int c : coins)
                if (c <= a) dp[a] = min(dp[a], dp[a - c] + 1);
        return dp[amount] > amount ? -1 : dp[amount];
    }
};` }],
        dry: { head: ['a', 'coin 1 → dp[a-1]+1', 'coin 3 → dp[a-3]+1', 'coin 4 → dp[a-4]+1', 'dp[a]'], rows: [['1', '1', '—', '—', '1'], ['2', '2', '—', '—', '2'], ['3', '3', '1', '—', '1'], ['4', '2', '2', '1', '1'], ['5', '2', '3', '2', '2'], ['6', '3', H.c('g', '2'), '3', H.c('g', '2')]] },
        complexity: `<p>Time O(amount × #coins) ≈ 1.2·10<sup>5</sup> operations; space O(amount).</p>`,
        followUps: ['Print the coins used (store the last coin per amount).', 'Count the number of combinations instead (LC 518).', 'Each coin may be used at most once → 0/1 knapsack, iterate amounts backwards.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 5 — 0/1 Knapsack
  // =====================================================================
  topics.push({
    title: '0/1 Knapsack: Take Each Item at Most Once',
    analogy: `<p>You are packing a cabin bag with a <b>7 kg</b> limit for a trip. On the bed: a laptop, a camera, a jacket, a pair of shoes — each has a weight and a "how happy it makes me" score. You either pack an item or you don't (you can't pack half a laptop, and you only own one of each).</p>
      <p>A clever packer thinks item by item: "<b>For every possible remaining space</b> (0 kg, 1 kg, … 7 kg), what is the happiest bag I can make with the items I have looked at so far?" Each new item asks: "<i>Is it worth giving up its weight in space?</i>"</p>`,
    explain: `<p><b>Problem:</b> n items, item i has weight <code>w[i]</code> and value <code>v[i]</code>. Bag capacity <code>W</code>. Choose a subset with total weight ≤ W and maximum total value. Each item is used <b>0 or 1</b> times — hence "0/1".</p>
      <p><b>Greedy by value/weight ratio fails here</b> (it only works for <i>fractional</i> knapsack, where you can cut items). W = 7, items (weight:value) 1:1, 3:4, 4:5, 5:7. Best ratio is 5:7 (1.4) → take it, 2 kg left → add 1:1 → value 8. But 3:4 + 4:5 = weight 7, value <b>9</b>.</p>
      <h4>Why one index is not enough</h4>
      <p>In House Robber, knowing "which house" was enough. Here, after deciding some items, what matters for the future is also <b>how much space is left</b>. So the state needs two numbers.</p>
      ${H.table(['step', '0/1 Knapsack'], [
        ['State', '<code>dp[i][c]</code> = best value using only the <b>first i items</b> with capacity <b>c</b>'],
        ['Last choice', 'item i (the i-th item) is <b>skipped</b> or <b>taken</b>'],
        ['Transition', '<code>dp[i][c] = max( dp[i−1][c] , dp[i−1][c − w<sub>i</sub>] + v<sub>i</sub> )</code> (take only if w<sub>i</sub> ≤ c)'],
        ['Base', '<code>dp[0][c] = 0</code> (no items → no value) and <code>dp[i][0] = 0</code>'],
        ['Order', 'row by row (i = 1..n); each row only reads the row above'],
        ['Answer', '<code>dp[n][W]</code>']
      ])}
      <p>Both arrows point to the <b>row above</b> (i−1) — that is what "each item at most once" looks like in the table: once you take item i you jump to a state where item i is no longer available.</p>
      ${H.table(['items ↓ / capacity →', '0', '1', '2', '3', '4', '5', '6', '7'], [
        ['none', '0', '0', '0', '0', '0', '0', '0', '0'],
        ['+ 1:1', '0', '1', '1', '1', '1', '1', '1', '1'],
        ['+ 3:4', '0', '1', '1', '4', '5', '5', '5', '5'],
        ['+ 4:5', '0', '1', '1', '4', '5', '6', '6', H.c('b', '9')],
        ['+ 5:7', '0', '1', '1', '4', '5', '7', '8', H.c('g', '9')]
      ])}
      <h4>Space optimization: one row, loop capacity <u>backwards</u></h4>
      <p>Since row i only reads row i−1, keep one array. But if you loop c from small to big, <code>dp[c − w]</code> has <i>already</i> been updated for item i — you would be reading "row i", i.e. using the item twice. Looping c from <b>W down to w</b> reads values that are still from the previous item.</p>
      ${H.table(['loop direction (1D)', 'reads dp[c−w] from', 'meaning'], [['c = W → w (backwards)', 'previous item (old row)', H.c('g', '0/1 knapsack')], ['c = w → W (forwards)', 'current item (new row)', H.c('b', 'unbounded knapsack (next topic)')]])}`,
    clues: [
      '"each item can be used <b>at most once</b>" + weight/capacity/budget limit + maximize value → 0/1 knapsack.',
      '"<b>subset</b> whose sum equals target" / "can the array be <b>partitioned</b> into two equal-sum parts" → boolean 0/1 knapsack (subset sum).',
      '"assign <b>+ or −</b> to each number to reach target" (Target Sum) → count subsets with sum (total + target)/2 → counting 0/1 knapsack.',
      '<code>N ≤ 100–200</code> and <code>W ≤ 10<sup>4</sup>–10<sup>5</sup></code> → O(N·W) table is the intended solution.',
      '<code>W ≤ 10<sup>9</sup></code> but values small → flip it: dp over <b>value</b> = min weight to reach that value.',
      '<code>N ≤ 40</code> and huge W → meet-in-the-middle (split items into two halves of 2<sup>20</sup> subsets each).'
    ],
    code: [{ lang: 'java', code: `
      // 0/1 knapsack, full table. dp[i][c] = best value from first i items, capacity c.
      int knapsack(int[] wt, int[] val, int W) {
          int n = wt.length;
          int[][] dp = new int[n + 1][W + 1];          // row 0 and column 0 are all 0
          for (int i = 1; i <= n; i++) {
              int w = wt[i - 1], v = val[i - 1];       // the i-th item
              for (int c = 0; c <= W; c++) {
                  dp[i][c] = dp[i - 1][c];             // skip item i
                  if (w <= c) {
                      dp[i][c] = Math.max(dp[i][c], dp[i - 1][c - w] + v); // take it once
                  }
              }
          }
          return dp[n][W];
      }

      // Same thing in one array: capacity loop runs BACKWARDS so each item is used once.
      int knapsack1D(int[] wt, int[] val, int W) {
          int[] dp = new int[W + 1];
          for (int i = 0; i < wt.length; i++) {
              for (int c = W; c >= wt[i]; c--) {       // right-to-left!
                  dp[c] = Math.max(dp[c], dp[c - wt[i]] + val[i]);
              }
          }
          return dp[W];
      }`, alt: [{ lang: 'python', code: `# 0/1 knapsack, full table. dp[i][c] = best value from first i items, capacity c.
def knapsack(wt, val, W):
    n = len(wt)
    dp = [[0] * (W + 1) for _ in range(n + 1)]   # row 0 and column 0 are all 0
    for i in range(1, n + 1):
        w, v = wt[i - 1], val[i - 1]          # the i-th item
        for c in range(W + 1):
            dp[i][c] = dp[i - 1][c]           # skip item i
            if w <= c:
                dp[i][c] = max(dp[i][c], dp[i - 1][c - w] + v)   # take it once
    return dp[n][W]

# Same thing in one list: capacity loop runs BACKWARDS so each item is used once.
def knapsack_1d(wt, val, W):
    dp = [0] * (W + 1)
    for w, v in zip(wt, val):
        for c in range(W, w - 1, -1):         # right-to-left!
            dp[c] = max(dp[c], dp[c - w] + v)
    return dp[W]` }, { lang: 'js', code: `// 0/1 knapsack, full table. dp[i][c] = best value from first i items, capacity c.
function knapsack(wt, val, W) {
  const n = wt.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0));   // row 0 / col 0 = 0
  for (let i = 1; i <= n; i++) {
    const w = wt[i - 1], v = val[i - 1];      // the i-th item
    for (let c = 0; c <= W; c++) {
      dp[i][c] = dp[i - 1][c];                // skip item i
      if (w <= c) dp[i][c] = Math.max(dp[i][c], dp[i - 1][c - w] + v);   // take it once
    }
  }
  return dp[n][W];
}

// Same thing in one array: capacity loop runs BACKWARDS so each item is used once.
function knapsack1D(wt, val, W) {
  const dp = new Array(W + 1).fill(0);
  for (let i = 0; i < wt.length; i++) {
    for (let c = W; c >= wt[i]; c--) {        // right-to-left!
      dp[c] = Math.max(dp[c], dp[c - wt[i]] + val[i]);
    }
  }
  return dp[W];
}` }, { lang: 'cpp', code: `// 0/1 knapsack, full table. dp[i][c] = best value from first i items, capacity c.
int knapsack(const vector<int>& wt, const vector<int>& val, int W) {
    int n = wt.size();
    vector<vector<int>> dp(n + 1, vector<int>(W + 1, 0));   // row 0 and column 0 are all 0
    for (int i = 1; i <= n; i++) {
        int w = wt[i - 1], v = val[i - 1];    // the i-th item
        for (int c = 0; c <= W; c++) {
            dp[i][c] = dp[i - 1][c];          // skip item i
            if (w <= c) dp[i][c] = max(dp[i][c], dp[i - 1][c - w] + v);   // take it once
        }
    }
    return dp[n][W];
}

// Same thing in one array: capacity loop runs BACKWARDS so each item is used once.
int knapsack1D(const vector<int>& wt, const vector<int>& val, int W) {
    vector<int> dp(W + 1, 0);
    for (size_t i = 0; i < wt.size(); i++) {
        for (int c = W; c >= wt[i]; c--) {    // right-to-left!
            dp[c] = max(dp[c], dp[c - wt[i]] + val[i]);
        }
    }
    return dp[W];
}` }] }, { lang: 'python', run: true, title: 'Knapsack + which items were packed (Python, runnable)', code: `def knapsack(wt, val, W):
    n = len(wt)
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        w, v = wt[i - 1], val[i - 1]
        for c in range(W + 1):
            dp[i][c] = dp[i - 1][c]
            if w <= c:
                dp[i][c] = max(dp[i][c], dp[i - 1][c - w] + v)
    # walk back: if the value changed between rows, item i was taken
    picked, c = [], W
    for i in range(n, 0, -1):
        if dp[i][c] != dp[i - 1][c]:
            picked.append(i - 1)
            c -= wt[i - 1]
    return dp[n][W], sorted(picked)

print(knapsack([1, 3, 4, 5], [1, 4, 5, 7], 7))     # (9, [1, 2])
print(knapsack([10, 20, 30], [60, 100, 120], 50))  # (220, [1, 2])
` }],
    codeTitle: ['0/1 knapsack: 2D table and 1D backward loop', 'With item reconstruction (Python, runnable)'],
    viz: [{
      title: '0/1 knapsack table: each cell reads the cell above (skip) and the cell above-left by w (take)',
      input: '7 | 1:1 3:4 4:5 5:7',
      inputLabel: 'capacity | weight:value items (≤ 5 items, capacity ≤ 10)',
      gen: function (input) {
        var p = parseKnap(input, 5, 10), W = p.W, wt = p.w, val = p.v, n = wt.length;
        var rows = [], i, c, filled = {}, frames = [];
        for (i = 0; i <= n; i++) { rows.push([]); for (c = 0; c <= W; c++) rows[i].push(i === 0 ? 0 : ''); }
        for (c = 0; c <= W; c++) filled['0,' + c] = 1;
        var rh = ['none'].concat(wt.map(function (w, k) { return '+ ' + w + ':' + val[k]; }));
        var ch = range(W + 1).map(String);
        frames.push({ narr: 'Rows = items considered so far (weight:value), columns = capacity 0..' + W + '. Row "none" is all 0: no items, no value.', parts: [
          grid('dp[i][c]', rows, rh, ch, gridHl(filled, {}))
        ] });
        for (i = 1; i <= n; i++) {
          var w = wt[i - 1], v = val[i - 1];
          for (c = 0; c <= W; c++) {
            var skip = rows[i - 1][c], take = w <= c ? rows[i - 1][c - w] + v : null;
            rows[i][c] = take !== null && take > skip ? take : skip;
            var sp = {}; sp[(i - 1) + ',' + c] = take !== null && take > skip ? 'win' : 'ok';
            if (take !== null) sp[(i - 1) + ',' + (c - w)] = take > skip ? 'ok' : 'win';
            sp[i + ',' + c] = 'cur';
            frames.push({ narr: 'Item ' + w + ':' + v + ', capacity ' + c + '. Skip → cell above = ' + skip + '. ' + (take === null ? 'Take → impossible (weight ' + w + ' &gt; ' + c + ').' : 'Take → cell above, ' + w + ' columns left (' + rows[i - 1][c - w] + ') + ' + v + ' = ' + take + '.') + ' Keep <b>' + rows[i][c] + '</b> (green = the winner).', parts: [
              grid('dp[i][c]', rows, rh, ch, gridHl(filled, sp))
            ] });
            filled[i + ',' + c] = 1;
          }
        }
        var path = {}, cc = W, picked = [];
        for (i = n; i >= 1; i--) {
          path[i + ',' + cc] = 'sel';
          if (rows[i][cc] !== rows[i - 1][cc]) { picked.push(wt[i - 1] + ':' + val[i - 1]); cc -= wt[i - 1]; }
        }
        path['0,' + cc] = 'sel';
        frames.push({ narr: 'Answer dp[' + n + '][' + W + '] = <b>' + rows[n][W] + '</b>. Walk back up: when a cell differs from the one above, that item was taken (jump left by its weight). Packed: <b>' + (picked.length ? picked.reverse().join(', ') : 'nothing') + '</b>.', parts: [
          grid('dp[i][c]', rows, rh, ch, gridHl(filled, path)),
          { type: 'set', label: 'items packed (weight:value)', items: picked }
        ] });
        return frames;
      }
    }, {
      title: 'One-array version: why the capacity loop must run right-to-left',
      input: '6 | 2:3 3:4',
      inputLabel: 'capacity | weight:value items (≤ 3 items, capacity ≤ 8)',
      gen: function (input) {
        var p = parseKnap(input, 3, 8), W = p.W, wt = p.w, val = p.v, frames = [], c, k;
        var dp = []; for (c = 0; c <= W; c++) dp.push(0);
        frames.push({ narr: 'One array dp[c] (all 0). For each item we sweep capacity from <b>' + W + ' down to its weight</b>.', parts: [
          { type: 'array', label: 'dp[c]', values: dp.slice() }
        ] });
        for (k = 0; k < wt.length; k++) {
          for (c = W; c >= wt[k]; c--) {
            var cand = dp[c - wt[k]] + val[k], h = {};
            h[c] = 'cur'; h[c - wt[k]] = 'win';
            frames.push({ narr: 'Item ' + wt[k] + ':' + val[k] + ', c = ' + c + ': dp[' + (c - wt[k]) + '] (blue) has <b>not</b> been touched for this item yet — it is still the "row above". Take → ' + dp[c - wt[k]] + ' + ' + val[k] + ' = ' + cand + ' vs keep ' + dp[c] + '.', parts: [
              { type: 'array', label: 'dp[c]', values: dp.slice(), hl: h, ptr: one(c, 'c') }
            ] });
            if (cand > dp[c]) dp[c] = cand;
          }
          frames.push({ narr: 'Finished item ' + wt[k] + ':' + val[k] + '. Every cell used it at most once.', parts: [
            { type: 'array', label: 'dp[c]', values: dp.slice(), hl: one(W, 'ok') }
          ] });
        }
        var bad = []; for (c = 0; c <= W; c++) bad.push(0);
        for (c = wt[0]; c <= W; c++) bad[c] = Math.max(bad[c], bad[c - wt[0]] + val[0]);
        frames.push({ narr: '<span class="c-r">Danger demo:</span> sweeping item ' + wt[0] + ':' + val[0] + ' <b>left-to-right</b> instead gives dp[' + W + '] = ' + bad[W] + ' — it reused the same item ' + Math.floor(W / wt[0]) + ' times! That is unbounded knapsack, not 0/1.', parts: [
          { type: 'array', label: 'WRONG (forward) sweep with only item ' + wt[0] + ':' + val[0], values: bad.slice(), hl: one(W, 'bad') },
          { type: 'array', label: 'correct 0/1 answer row', values: dp.slice(), hl: one(W, 'sel') }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Classic textbook instance', html: `<p>W = 50, items (10 kg, ₹60), (20 kg, ₹100), (30 kg, ₹120). Ratio-greedy takes 10 + 20 = ₹160 then cannot fit 30. DP: 20 + 30 = 50 kg → <b>₹220</b>. (Fractional knapsack would get ₹240 by cutting the 30-kg item — but here items are indivisible.)</p>` },
      { title: 'Subset sum = boolean knapsack', html: `<p>"Is there a subset of [3, 34, 4, 12, 5, 2] with sum 9?" Weight = value = the number; dp[c] = can we hit exactly c. <code>dp[c] |= dp[c − x]</code>, backwards. 4 + 5 = 9 → <b>true</b>. Partition Equal Subset Sum = subset sum with target total/2 (odd total → false immediately).</p>`, code: { lang: 'java', code: `boolean subsetSum(int[] a, int target) {
    boolean[] can = new boolean[target + 1];
    can[0] = true;                         // empty subset makes 0
    for (int x : a)
        for (int c = target; c >= x; c--)  // backwards: each number once
            can[c] = can[c] || can[c - x];
    return can[target];
}`, alt: [{ lang: 'python', code: `def subset_sum(a, target):
    can = [True] + [False] * target          # empty subset makes 0
    for x in a:
        for c in range(target, x - 1, -1):   # backwards: each number once
            can[c] = can[c] or can[c - x]
    return can[target]` }, { lang: 'js', code: `function subsetSum(a, target) {
  const can = new Array(target + 1).fill(false);
  can[0] = true;                             // empty subset makes 0
  for (const x of a)
    for (let c = target; c >= x; c--)        // backwards: each number once
      can[c] = can[c] || can[c - x];
  return can[target];
}` }, { lang: 'cpp', code: `bool subsetSum(const vector<int>& a, int target) {
    vector<bool> can(target + 1, false);
    can[0] = true;                           // empty subset makes 0
    for (int x : a)
        for (int c = target; c >= x; c--)    // backwards: each number once
            can[c] = can[c] || can[c - x];
    return can[target];
}` }] } },
      { title: 'Counting subsets: Target Sum', html: `<p>nums = [1,1,1,1,1], target 3: choose a + or − for each. If P = sum of "+" numbers, then P − (total − P) = target → P = (total + target)/2 = 4. Count subsets summing to 4 → C(5,4) = <b>5</b>. Same backward loop with <code>ways[c] += ways[c − x]</code>. If (total + target) is odd or |target| &gt; total → 0.</p>` },
      { title: 'Huge capacity, small values: flip the DP', html: `<p>n = 100, W = 10<sup>9</sup>, each value ≤ 1000. A W-wide table is impossible. Instead <code>minW[val]</code> = least weight achieving total value exactly val (size ≤ 100 × 1000 = 10<sup>5</sup>). Answer = largest val with minW[val] ≤ W. Same 0/1 backward loop, roles of weight and value swapped.</p>` }
    ],
    deepDive: `<p><b>Pseudo-polynomial, NP-hard.</b> O(n·W) looks polynomial, but W is a <i>number</i> written with log₂W bits; doubling the bits squares W. The 0/1 knapsack decision problem is NP-complete (weakly), so no algorithm polynomial in the bit-size is known. The DP is fast exactly when W (or total value) is small.</p>
      <p><b>Bitset speed-up for subset sum.</b> For the boolean version, the whole row update is <code>bits |= bits &lt;&lt; x</code>. With Java <code>java.util.BitSet</code>, C++ <code>std::bitset</code> or a Python int used as a bitset (<code>bits |= bits &lt;&lt; x</code>) that processes 64 capacities per machine word: O(n·W/64). A classic trick for partition problems with sums up to 10<sup>6</sup>.</p>
      <p><b>Reconstruction needs the 2D table</b> (or one bit per (i, c) "taken" flag). The 1D array forgets which items made each value. Hirschberg-style divide &amp; conquer can reconstruct in O(W) memory at ~2× time.</p>
      <p><b>Meet in the middle.</b> When n ≤ 40 and W is huge: enumerate the 2<sup>20</sup> subsets of each half, sort one half by weight with a running best value, and binary-search the complement for each subset of the other half → O(2<sup>n/2</sup>·n).</p>
      <p><b>Approximation.</b> In practice (cloud bin packing, ad budgets) people use the FPTAS: scale values down by a factor, run the value-indexed DP, and get within (1 − ε) of optimal in polynomial time. Solvers like OR-Tools use branch-and-bound with LP relaxation bounds (the fractional greedy gives the bound!).</p>
      <p><b>Bounded knapsack</b> (item i has count k<sub>i</sub>): split each count into powers of two (1, 2, 4, …, remainder) and run 0/1 on the bundles → O(W·Σ log k<sub>i</sub>); a monotonic-queue trick gives O(n·W).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes the 2D knapsack instantly. What it cannot do for you in an interview is <b>recognise</b> knapsack inside "split players into two teams of equal skill" or "assign + / −" and explain why the backward loop is needed.</p>
      <p><b>Use AI as a partner:</b> ask it to produce the 1D version and then ask <code>Explain why the inner loop must go backwards using a 2-item example where forwards gives the wrong answer</code>. If its example doesn't actually break, you've caught it. Use it to write a brute-force 2<sup>n</sup> checker for random testing.</p>
      <p><b>Where AI goes wrong:</b> forward loop in 1D 0/1 knapsack (silently becomes unbounded), greedy by ratio for 0/1, int overflow when values are large, and forgetting the parity check in Partition / Target Sum.</p>
      <p><b>What you must still own:</b> the 2-dimensional state argument ("what matters for the future is items left AND space left"), the loop-direction proof, and the pseudo-polynomial complexity story — including what to do when W is 10<sup>9</sup>.</p>`,
    problems: [{
      title: '0/1 Knapsack', level: 'Medium', tags: ['dp', 'knapsack', '2d dp'], companies: ['Amazon', 'Microsoft', 'Flipkart', 'Walmart'],
      statement: `<p>You have <code>n</code> items; item i weighs <code>wt[i]</code> and is worth <code>val[i]</code>. Your bag holds at most <code>W</code> weight. Each item can be taken at most once and cannot be broken. Return the maximum total value you can carry.</p>`,
      constraints: `1 ≤ n ≤ 1000, 1 ≤ W ≤ 1000, 1 ≤ wt[i] ≤ 1000, 1 ≤ val[i] ≤ 1000`,
      example: `<p>W = 7, items (weight:value) = ${H.c('m', '1:1')}, ${H.c('g', '3:4')}, ${H.c('g', '4:5')}, ${H.c('m', '5:7')} → Output <b>9</b>.</p><p>${H.c('g', '3:4 + 4:5')} weighs exactly 7 and is worth 9. The best-ratio item 5:7 plus 1:1 is only 8.</p>`,
      brute: { why: `<p>Try all 2<sup>n</sup> subsets (take/skip recursion) and keep the best that fits. n = 1000 → 2<sup>1000</sup> subsets: hopeless. The waste: the question "best value from items i..n−1 with c capacity left" depends only on (i, c), yet it is answered again for every different set of earlier choices that leaves the same c.</p>`, code: `int best(int[] wt, int[] val, int i, int cap) {
    if (i == wt.length) return 0;                      // no items left
    int skip = best(wt, val, i + 1, cap);
    int take = 0;
    if (wt[i] <= cap) take = val[i] + best(wt, val, i + 1, cap - wt[i]);
    return Math.max(skip, take);
}` },
      mcq: { q: 'In the 1D version you loop capacity from small to large by mistake. What happens?', options: ['Nothing, same answer', 'Items can be counted more than once (it becomes unbounded knapsack)', 'It throws an exception', 'It returns 0'], answer: 1, explain: 'dp[c − w] was already updated with item i in this sweep, so taking it again reuses the same item.' },
      tests: { sig: 'int int[] int[] -> int', fn: 'knapSack', names: { python: 'knapsack' }, cases: [
        [[7, [1, 3, 4, 5], [1, 4, 5, 7]], 9], [[50, [10, 20, 30], [60, 100, 120]], 220], [[1, [2], [5]], 0],
        [[4, [4], [10]], 10], [[10, [5, 5, 5], [10, 10, 10]], 20], [[5, [1, 1, 1, 1, 1, 1], [1, 2, 3, 4, 5, 6]], 20],
        [[1000, { $rep: 1, n: 1000 }, { $rep: 1000, n: 1000 }], 1000000],
        [[1000, { $rep: 1000, n: 1000 }, { $rep: 1000, n: 1000 }], 1000]
      ] },
      hints: [`<p>Hint 1: The recursion best(i, cap) has only two changing parameters. Different take/skip histories reach the same (i, cap) — memoize on it.</p>`, `<p>Hint 2: Table dp[i][c] = max(dp[i−1][c], dp[i−1][c−w] + v). Both arrows go to the row above because the item can't be reused.</p>`, `<p>Hint 3: Shrink to one array and loop c from W down to w. Recipe: dp[0..W] = 0; for each item: for c = W..w: dp[c] = max(dp[c], dp[c−w] + v); return dp[W].</p>`],
      solution: {
        approach: `<p>Item-by-item DP over capacities using one array swept right-to-left, so every read of <code>dp[c − w]</code> still holds the value from before this item.</p>`,
        code: `class Solution {
    public int knapSack(int W, int[] wt, int[] val) {
        int[] dp = new int[W + 1];                     // dp[c] = best value with capacity c
        for (int i = 0; i < wt.length; i++) {
            for (int c = W; c >= wt[i]; c--) {         // backwards = each item once
                dp[c] = Math.max(dp[c], dp[c - wt[i]] + val[i]);
            }
        }
        return dp[W];
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def knapsack(self, W, wt, val):
        dp = [0] * (W + 1)                        # dp[c] = best value with capacity c
        for w, v in zip(wt, val):
            for c in range(W, w - 1, -1):         # backwards = each item once
                dp[c] = max(dp[c], dp[c - w] + v)
        return dp[W]` }, { lang: 'js', code: `function knapSack(W, wt, val) {
  const dp = new Array(W + 1).fill(0);            // dp[c] = best value with capacity c
  for (let i = 0; i < wt.length; i++) {
    for (let c = W; c >= wt[i]; c--) {            // backwards = each item once
      dp[c] = Math.max(dp[c], dp[c - wt[i]] + val[i]);
    }
  }
  return dp[W];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int knapSack(int W, vector<int>& wt, vector<int>& val) {
        vector<int> dp(W + 1, 0);
        for (size_t i = 0; i < wt.size(); i++)
            for (int c = W; c >= wt[i]; c--)
                dp[c] = max(dp[c], dp[c - wt[i]] + val[i]);
        return dp[W];
    }
};` }],
        dry: { head: ['after item', 'dp[0..7]', 'note'], rows: [['1:1', '0 1 1 1 1 1 1 1', 'any capacity ≥ 1 takes it'], ['3:4', '0 1 1 4 5 5 5 5', 'c=4: 1 + 4 = 5'], ['4:5', '0 1 1 4 5 6 6 9', 'c=7: dp[3] + 5 = 9'], ['5:7', '0 1 1 4 5 7 8 9', H.c('g', 'c=7: max(9, dp[2]+7=8) = 9')]] },
        complexity: `<p>Time O(n·W) = 10<sup>6</sup>; space O(W) (O(n·W) if you need to list the items).</p>`,
        followUps: ['Return the chosen items (keep the 2D table).', 'W up to 10<sup>9</sup>, values ≤ 100 → DP over value.', 'Each item has a count limit (bounded knapsack).']
      }
    }]
  });

  // =====================================================================
  // TOPIC 6 — Unbounded knapsack (rod cutting)
  // =====================================================================
  topics.push({
    title: 'Unbounded Knapsack: Reuse Items as Often as You Like (Rod Cutting)',
    analogy: `<p>A carpenter has one 8-metre wooden rod and a price list: a 1 m piece sells for ₹1, 2 m for ₹5, 3 m for ₹8, 4 m for ₹9. She can cut <b>as many pieces of each size as she likes</b>. How should she cut to earn the most?</p>
      <p>The difference from packing a suitcase: the shop has an <b>endless supply</b> of each piece size. After choosing a 3 m piece, the 3 m option is <i>still on the menu</i> for the rest of the rod.</p>`,
    explain: `<p><b>Unbounded knapsack:</b> same as 0/1 knapsack (weights, values, capacity W) but each item type can be taken <b>any number of times</b>. Rod cutting, coin change, "minimum cost to buy at least X", perfect squares and integer break are all this pattern.</p>
      <h4>The only change: "take" stays on the same row</h4>
      ${H.table(['', '0/1 knapsack', 'unbounded knapsack'], [
        ['skip item i', 'dp[i−1][c]', 'dp[i−1][c]'],
        ['take item i', 'dp[<b>i−1</b>][c − w] + v → item gone', 'dp[<b>i</b>][c − w] + v → item still available'],
        ['1D loop over c', H.c('g', 'W → w (backwards)'), H.c('b', 'w → W (forwards)')]
      ])}
      <p>Because "take" lands on the same row, you may take item i again from there, and again … That single index change is the whole difference.</p>
      <h4>Even simpler 1D view (capacity-first)</h4>
      <p>For unbounded problems where only the total matters (not the order), you can also think "<b>what was the last piece cut?</b>": <code>best[len] = max over pieces p ≤ len of price[p] + best[len − p]</code>. Same answer, same O(W·n).</p>
      <p>Rod length 4, prices p1 = 1, p2 = 5, p3 = 8, p4 = 9:</p>
      ${H.table(['len', 'options (last piece + best of the rest)', 'best[len]'], [
        ['1', '1 + best[0]', '1'],
        ['2', '1 + best[1] = 2, 5 + best[0] = 5', '5'],
        ['3', '1 + 5, 5 + 1, 8 + 0', '8'],
        ['4', '1 + 8, 5 + 5, 8 + 1, 9 + 0', H.c('g', '10') + ' (2 + 2)']
      ])}`,
    clues: [
      '"<b>unlimited</b> supply / <b>infinite</b> number of each" item, coin or piece → unbounded knapsack.',
      '"cut a rod / ribbon / log into pieces" with a price or allowed lengths → rod cutting = unbounded knapsack.',
      '"break the integer n into a sum of at least two positive integers and <b>maximise the product</b>" (Integer Break) → unbounded with product.',
      '"minimum cost to buy <b>at least</b> X units" with bundle offers reusable → unbounded min DP (careful: "at least" means cap at X).',
      'Same constraint shapes as 0/1 knapsack: <code>W ≤ 10<sup>4</sup></code>, item types ≤ 100 → O(n·W).'
    ],
    code: [{ lang: 'java', code: `
      // Unbounded knapsack (each item type reusable). 1D, capacity loop FORWARDS.
      int unboundedKnapsack(int[] wt, int[] val, int W) {
          int[] dp = new int[W + 1];                 // dp[c] = best value with capacity c
          for (int i = 0; i < wt.length; i++) {
              for (int c = wt[i]; c <= W; c++) {     // forwards: dp[c - w] may already use item i
                  dp[c] = Math.max(dp[c], dp[c - wt[i]] + val[i]);
              }
          }
          return dp[W];
      }

      // Rod cutting: price[k] = price of a piece of length k+1. Last-piece formulation.
      int cutRod(int[] price, int n) {
          int[] best = new int[n + 1];               // best[0] = 0: empty rod earns nothing
          for (int len = 1; len <= n; len++) {
              for (int piece = 1; piece <= len && piece <= price.length; piece++) {
                  best[len] = Math.max(best[len], price[piece - 1] + best[len - piece]);
              }
          }
          return best[n];
      }`, alt: [{ lang: 'python', code: `# Unbounded knapsack (each item type reusable). 1D, capacity loop FORWARDS.
def unbounded_knapsack(wt, val, W):
    dp = [0] * (W + 1)                        # dp[c] = best value with capacity c
    for w, v in zip(wt, val):
        for c in range(w, W + 1):             # forwards: dp[c - w] may already use this item
            dp[c] = max(dp[c], dp[c - w] + v)
    return dp[W]

# Rod cutting: price[k] = price of a piece of length k+1. Last-piece formulation.
def cut_rod(price, n):
    best = [0] * (n + 1)                      # best[0] = 0: empty rod earns nothing
    for length in range(1, n + 1):
        for piece in range(1, min(length, len(price)) + 1):
            best[length] = max(best[length], price[piece - 1] + best[length - piece])
    return best[n]` }, { lang: 'js', code: `// Unbounded knapsack (each item type reusable). 1D, capacity loop FORWARDS.
function unboundedKnapsack(wt, val, W) {
  const dp = new Array(W + 1).fill(0);        // dp[c] = best value with capacity c
  for (let i = 0; i < wt.length; i++) {
    for (let c = wt[i]; c <= W; c++) {        // forwards: dp[c - w] may already use item i
      dp[c] = Math.max(dp[c], dp[c - wt[i]] + val[i]);
    }
  }
  return dp[W];
}

// Rod cutting: price[k] = price of a piece of length k+1. Last-piece formulation.
function cutRod(price, n) {
  const best = new Array(n + 1).fill(0);      // best[0] = 0: empty rod earns nothing
  for (let len = 1; len <= n; len++) {
    for (let piece = 1; piece <= len && piece <= price.length; piece++) {
      best[len] = Math.max(best[len], price[piece - 1] + best[len - piece]);
    }
  }
  return best[n];
}` }, { lang: 'cpp', code: `// Unbounded knapsack (each item type reusable). 1D, capacity loop FORWARDS.
int unboundedKnapsack(const vector<int>& wt, const vector<int>& val, int W) {
    vector<int> dp(W + 1, 0);                 // dp[c] = best value with capacity c
    for (size_t i = 0; i < wt.size(); i++) {
        for (int c = wt[i]; c <= W; c++) {    // forwards: dp[c - w] may already use item i
            dp[c] = max(dp[c], dp[c - wt[i]] + val[i]);
        }
    }
    return dp[W];
}

// Rod cutting: price[k] = price of a piece of length k+1. Last-piece formulation.
int cutRod(const vector<int>& price, int n) {
    vector<int> best(n + 1, 0);               // best[0] = 0: empty rod earns nothing
    for (int len = 1; len <= n; len++) {
        for (int piece = 1; piece <= len && piece <= (int) price.size(); piece++) {
            best[len] = max(best[len], price[piece - 1] + best[len - piece]);
        }
    }
    return best[n];
}` }] }, { lang: 'python', run: true, title: 'Rod cutting with the actual cuts (Python, runnable)', code: `def cut_rod(price, n):
    best = [0] * (n + 1)
    first_cut = [0] * (n + 1)          # which piece to cut first for this length
    for length in range(1, n + 1):
        for piece in range(1, min(length, len(price)) + 1):
            cand = price[piece - 1] + best[length - piece]
            if cand > best[length]:
                best[length], first_cut[length] = cand, piece
    cuts, L = [], n
    while L > 0:
        cuts.append(first_cut[L])
        L -= first_cut[L]
    return best[n], cuts

print(cut_rod([1, 5, 8, 9], 4))                     # (10, [2, 2])
print(cut_rod([1, 5, 8, 9, 10, 17, 17, 20], 8))     # (22, [2, 6])
print(cut_rod([3, 5, 8, 9, 10, 17, 17, 20], 8))     # (24, [1, 1, 1, 1, 1, 1, 1, 1])
` }],
    codeTitle: ['Unbounded knapsack and rod cutting', 'Rod cutting with reconstruction (Python, runnable)'],
    viz: {
      title: 'Unbounded table: "take" reads the SAME row (item still available), "skip" reads the row above',
      input: '8 | 1:1 2:5 3:8 4:9',
      inputLabel: 'capacity | weight:value item types (≤ 4 types, capacity ≤ 10)',
      gen: function (input) {
        var p = parseKnap(input, 4, 10), W = p.W, wt = p.w, val = p.v, n = wt.length;
        var rows = [], i, c, filled = {}, frames = [];
        for (i = 0; i <= n; i++) { rows.push([]); for (c = 0; c <= W; c++) rows[i].push(i === 0 ? 0 : ''); }
        for (c = 0; c <= W; c++) filled['0,' + c] = 1;
        var rh = ['none'].concat(wt.map(function (w, k) { return '+ ' + w + ':' + val[k] + ' ∞'; }));
        var ch = range(W + 1).map(String);
        frames.push({ narr: 'Rows add one item <b>type</b> at a time (reusable). Columns = capacity. Watch the "take" arrow: it points <b>left within the same row</b>.', parts: [
          grid('dp[i][c]', rows, rh, ch, gridHl(filled, {}))
        ] });
        for (i = 1; i <= n; i++) {
          var w = wt[i - 1], v = val[i - 1];
          for (c = 0; c <= W; c++) {
            var skip = rows[i - 1][c], take = w <= c ? rows[i][c - w] + v : null;
            rows[i][c] = take !== null && take > skip ? take : skip;
            var tw = take !== null && take > skip;
            var sp = {}; sp[(i - 1) + ',' + c] = tw ? 'win' : 'ok';
            if (take !== null) sp[i + ',' + (c - w)] = tw ? 'ok' : 'win';
            sp[i + ',' + c] = 'cur';
            frames.push({ narr: 'Type ' + w + ':' + v + ', capacity ' + c + '. Skip → above = ' + skip + '. ' + (take === null ? 'Too heavy to take.' : 'Take one more → <b>same row</b>, ' + w + ' to the left (' + rows[i][c - w] + ', which may already contain this type) + ' + v + ' = ' + take + '.') + ' Keep <b>' + rows[i][c] + '</b>.', parts: [
              grid('dp[i][c]', rows, rh, ch, gridHl(filled, sp))
            ] });
            filled[i + ',' + c] = 1;
          }
        }
        var path = {}, used = [], ii = n, cc = W;
        while (ii > 0 && cc > 0) {
          path[ii + ',' + cc] = 'sel';
          if (rows[ii][cc] === rows[ii - 1][cc]) ii--;
          else { used.push(wt[ii - 1] + ':' + val[ii - 1]); cc -= wt[ii - 1]; }
        }
        path[ii + ',' + cc] = 'sel';
        frames.push({ narr: 'Answer <b>' + rows[n][W] + '</b>. Walking back: equal to the cell above → go up (type not used); otherwise go left by its weight and <b>stay in the row</b> (it may be used again). Used: ' + (used.length ? used.join(' + ') : 'nothing') + '.', parts: [
          grid('dp[i][c]', rows, rh, ch, gridHl(filled, path)),
          { type: 'set', label: 'pieces / items used (with repeats)', items: used }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'CLRS rod of length 8', html: `<p>Prices for lengths 1..8: 1, 5, 8, 9, 10, 17, 17, 20. Best for length 8 = <b>22</b>: cut 2 + 6 (5 + 17). Selling the whole rod gives only 20; four 2 m pieces give 20.</p>` },
      { title: 'Integer Break (LC 343)', html: `<p>Break n (≥ 2) into at least two positive parts maximizing the product. dp[i] = max over j of max(j, dp[j]) × max(i−j, dp[i−j]) — the max(j, dp[j]) allows "do not break this part further". n = 10 → 3 + 3 + 4 → <b>36</b>. (Math shortcut: use as many 3s as possible — a nice follow-up.)</p>`, code: { lang: 'java', code: `int integerBreak(int n) {
    int[] dp = new int[n + 1];
    dp[1] = 1;
    for (int i = 2; i <= n; i++)
        for (int j = 1; j < i; j++)
            dp[i] = Math.max(dp[i], Math.max(j, dp[j]) * Math.max(i - j, dp[i - j]));
    return dp[n];
}`, alt: [{ lang: 'python', code: `def integer_break(n):
    dp = [0] * (n + 1)
    dp[1] = 1
    for i in range(2, n + 1):
        for j in range(1, i):
            # max(j, dp[j]): a part may also stay unbroken
            dp[i] = max(dp[i], max(j, dp[j]) * max(i - j, dp[i - j]))
    return dp[n]` }, { lang: 'js', code: `function integerBreak(n) {
  const dp = new Array(n + 1).fill(0);
  dp[1] = 1;
  for (let i = 2; i <= n; i++)
    for (let j = 1; j < i; j++)
      dp[i] = Math.max(dp[i], Math.max(j, dp[j]) * Math.max(i - j, dp[i - j]));
  return dp[n];
}` }, { lang: 'cpp', code: `int integerBreak(int n) {
    vector<int> dp(n + 1, 0);
    dp[1] = 1;
    for (int i = 2; i <= n; i++)
        for (int j = 1; j < i; j++)
            dp[i] = max(dp[i], max(j, dp[j]) * max(i - j, dp[i - j]));
    return dp[n];
}` }] } },
      { title: 'Minimum cost to get at least X (bundles)', html: `<p>Packs of 3 cans for ₹5 or 5 cans for ₹7; you need <b>at least</b> 12 cans. Exactly 12 cans costs ₹20 (3+3+3+3), but 5+5+3 = 13 cans costs only <b>₹19</b>. An exact-amount DP would never look at 13. Fix: dp[x] = min cost for at least x cans, transition <code>dp[x] = min(dp[max(0, x − size)] + price)</code>. The clamp to 0 is the whole trick.</p>` },
      { title: 'Coin change is unbounded knapsack', html: `<p>Min coins: weight = coin value, "value" = 1 coin, minimize instead of maximize, exact capacity. Number of combinations: same forward loop with + instead of max. If you understood the forward-loop rule here, you understand why LC 518's inner loop goes forward.</p>` }
    ],
    deepDive: `<p><b>Proof of the forward loop.</b> In the 1D array, when we compute dp[c] for item i, dp[c − w] has already been updated in this same sweep, i.e. it equals dp[i][c − w] (the same row). That is exactly the unbounded transition. For 0/1 we needed dp[i−1][c − w], so we had to read it <i>before</i> it was overwritten — hence backwards.</p>
      <p><b>Item-outer vs capacity-outer.</b> For a <i>max/min value</i> question, both loop orders give the same answer for unbounded knapsack (order of items does not change a sum). For <i>counting</i>, they differ: item-outer counts multisets, capacity-outer counts sequences (seen in coin change).</p>
      <p><b>Dominance pruning.</b> If item A is no heavier and no less valuable than item B, B can be dropped. Real solvers also use the best-ratio item: for very large W, the optimal solution uses the best-ratio item for "most" of the capacity, so you only need DP on a small residual (periodicity of unbounded knapsack) — a known trick when W is up to 10<sup>9</sup> but weights are small.</p>
      <p><b>Exact vs "at most" vs "at least".</b> With dp initialised to 0 everywhere, dp[c] means "best with capacity <i>at most</i> c". If the problem wants <i>exactly</i> c (e.g. coin change), initialise unreachable states to −∞ (max) or +∞ (min) and only dp[0] = 0. "At least" needs the clamp max(0, c − w). Mixing these up is the classic silent bug.</p>
      <p><b>Production:</b> cutting-stock problems (paper rolls, steel bars, cloud VM shapes) are large unbounded knapsacks; industry solves them with column generation, where unbounded knapsack DP is the pricing subproblem solved thousands of times.</p>`,
    aiEra: `<p><b>What AI changes:</b> the forward-vs-backward loop rule is a one-liner for an assistant to write, and also a one-liner for it to get wrong without noticing. Your value is <b>verifying</b> which variant the problem needs.</p>
      <p><b>Use AI as a partner:</b> give it a problem statement and ask <code>Is each item reusable? Is the capacity exact, at most, or at least?</code> before asking for code. Then ask it to generate a brute-force recursive enumerator to cross-check on small inputs.</p>
      <p><b>Where AI goes wrong:</b> uses 0-initialisation for an "exact amount" problem (returns a value for an impossible capacity), forgets the "at least" clamp, and for Integer Break forgets that a part may stay unbroken (dp[2] = 1 but the part "2" contributes 2).</p>
      <p><b>What you must still own:</b> the one-index difference between 0/1 and unbounded, the three capacity semantics (exact / at most / at least), and spotting the pattern behind cutting, bundles and change-making.</p>`,
    problems: [{
      title: 'Rod Cutting', level: 'Medium', tags: ['dp', 'unbounded knapsack'], companies: ['Amazon', 'Microsoft', 'Google'],
      statement: `<p>A rod of length <code>n</code> can be cut into integer-length pieces. <code>price[k]</code> is the selling price of a piece of length <code>k+1</code>. Pieces of the same length may be produced any number of times. Return the maximum total price obtainable (not cutting at all is allowed).</p>`,
      constraints: `1 ≤ n ≤ 1000, price.length = n, 1 ≤ price[k] ≤ 10<sup>5</sup>`,
      example: `<p>price = [1, 5, 8, 9, 10, 17, 17, 20], n = 8 → Output <b>22</b>.</p>${H.table(['cut', 'value'], [['8 (no cut)', '20'], ['2 + 2 + 2 + 2', '20'], [H.c('g', '2 + 6'), H.c('g', '5 + 17 = 22')]])}`,
      brute: { why: `<p>Recursively choose the first piece length (1..n) and solve the rest: T(n) = Σ T(n−k) → 2<sup>n−1</sup> ways to cut. n = 1000 → impossible. The waste: "best for remaining length 5" is recomputed for every way of cutting the first 3 metres.</p>`, code: `int cut(int[] price, int len) {
    if (len == 0) return 0;
    int best = 0;
    for (int piece = 1; piece <= len; piece++)
        best = Math.max(best, price[piece - 1] + cut(price, len - piece));
    return best;
}` },
      mcq: { q: 'Which statement about rod cutting\'s 1D dp is correct?', options: ['best[len] = max over piece of price[piece−1] + best[len − piece]', 'best[len] = best[len−1] + price[0]', 'It needs a backward loop like 0/1 knapsack', 'It cannot be done in less than O(2ⁿ)'], answer: 0, explain: 'Choose the last (or first) piece; the remainder is an independent smaller rod. Pieces are reusable, so no backward loop is needed.' },
      tests: { sig: 'int[] -> int', fn: 'cutRod', cases: [
        [[[1, 5, 8, 9]], 10], [[[1, 5, 8, 9, 10, 17, 17, 20]], 22], [[[3, 5, 8, 9, 10, 17, 17, 20]], 24],
        [[[2]], 2], [[[1, 1]], 2], [[[1, 10]], 10], [[[10, 1, 1]], 30],
        [[{ $rep: 100000, n: 1000 }], 100000000], [[{ $range: [1, 1001] }], 1000]
      ] },
      hints: [`<p>Hint 1: The only thing that matters about a partly-cut rod is its remaining length. That is your state.</p>`, `<p>Hint 2: best[len] = max(price[p−1] + best[len−p]) for p = 1..len; best[0] = 0. This is unbounded knapsack with weight = piece length.</p>`, `<p>Hint 3: Fill len = 1..n in increasing order (O(n²) = 10<sup>6</sup>). Use a 64-bit integer if prices × count could exceed 2·10<sup>9</sup> (here 1000 × 10<sup>5</sup> = 10<sup>8</sup>, int is fine).</p>`],
      solution: {
        approach: `<p>Last-piece DP: for each length, try every possible piece as the last cut and add the best price of the remainder (already computed, since it is shorter).</p>`,
        code: `class Solution {
    public int cutRod(int[] price) {
        int n = price.length;
        int[] best = new int[n + 1];                   // best[0] = 0
        for (int len = 1; len <= n; len++) {
            for (int piece = 1; piece <= len; piece++) {
                best[len] = Math.max(best[len], price[piece - 1] + best[len - piece]);
            }
        }
        return best[n];
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def cut_rod(self, price):
        n = len(price)
        best = [0] * (n + 1)                      # best[0] = 0
        for length in range(1, n + 1):
            # try every piece as the last cut; the rest is a shorter, solved rod
            best[length] = max(price[p - 1] + best[length - p] for p in range(1, length + 1))
        return best[n]` }, { lang: 'js', code: `function cutRod(price) {
  const n = price.length;
  const best = new Array(n + 1).fill(0);          // best[0] = 0
  for (let len = 1; len <= n; len++) {
    for (let piece = 1; piece <= len; piece++) {
      best[len] = Math.max(best[len], price[piece - 1] + best[len - piece]);
    }
  }
  return best[n];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int cutRod(vector<int>& price) {
        int n = price.size();
        vector<int> best(n + 1, 0);               // best[0] = 0
        for (int len = 1; len <= n; len++)
            for (int piece = 1; piece <= len; piece++)
                best[len] = max(best[len], price[piece - 1] + best[len - piece]);
        return best[n];                           // at most 1000 * 1e5 = 1e8, fits in int
    }
};` }],
        dry: { head: ['len', 'best candidates (piece + rest)', 'best[len]'], rows: [['1', '1+0', '1'], ['2', '1+1, 5+0', '5'], ['3', '1+5, 5+1, 8+0', '8'], ['4', '1+8, 5+5, 8+1, 9', '10'], ['5', '1+10, 5+8, 8+5, 9+1, 10', '13'], ['6', '…, 17+0', '17'], ['7', '1+17, 5+13, 8+10, …', '18'], ['8', '5+17 (piece 2 + best[6])', H.c('g', '22')]] },
        complexity: `<p>Time O(n²), space O(n).</p>`,
        followUps: ['Print the cuts (store the best first piece per length).', 'Each cut costs a fixed fee c → subtract c per cut.', 'Only certain lengths are allowed → loop over the allowed list.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 7 — Longest Common Subsequence
  // =====================================================================
  topics.push({
    title: 'Longest Common Subsequence (LCS): DP on Two Strings',
    analogy: `<p>Two friends describe the same holiday from memory. Riya says: "<b>beach, museum, market, dinner, fireworks</b>". Arjun says: "<b>museum, dinner, karaoke, fireworks</b>". Each forgot or added some things, but the events they <i>both</i> mention appear in the same order: <b>museum → dinner → fireworks</b>.</p>
      <p>The longest list of shared events kept in order is their <b>longest common subsequence</b>. It is how <code>git diff</code> decides which lines stayed the same between two versions of a file — everything else is "added" or "removed".</p>`,
    explain: `<p><b>Subsequence</b> = delete some characters (possibly none) without reordering: "ace" is a subsequence of "a<u>b</u>c<u>d</u>e". <b>Substring</b> must be contiguous ("bcd"). LCS asks for the longest string that is a subsequence of <b>both</b> inputs.</p>
      <p>Brute force: s1 of length n has 2<sup>n</sup> subsequences — check each against s2 → hopeless for n = 1000.</p>
      <h4>Recipe — compare the LAST characters</h4>
      ${H.table(['step', 'LCS'], [
        ['State', '<code>dp[i][j]</code> = LCS length of the <b>first i chars</b> of s1 and the <b>first j chars</b> of s2 (prefixes)'],
        ['Last chars match', 's1[i−1] == s2[j−1] → use it! <code>dp[i][j] = 1 + dp[i−1][j−1]</code> (diagonal)'],
        ['Last chars differ', 'at least one of them is not in the LCS → drop one: <code>dp[i][j] = max(dp[i−1][j], dp[i][j−1])</code> (up or left)'],
        ['Base', 'empty prefix: <code>dp[0][j] = dp[i][0] = 0</code>'],
        ['Answer', '<code>dp[n][m]</code>']
      ])}
      <p>The extra row and column of zeros (for the empty prefix) mean you never need an <code>if (i == 0)</code> inside the loop. s1 = "abcde", s2 = "ace":</p>
      ${H.table(['', '""', 'a', 'c', 'e'], [
        ['""', '0', '0', '0', '0'],
        ['a', '0', H.c('g', '1 ↖'), '1', '1'],
        ['b', '0', '1', '1', '1'],
        ['c', '0', '1', H.c('g', '2 ↖'), '2'],
        ['d', '0', '1', '2', '2'],
        ['e', '0', '1', '2', H.c('g', '3 ↖')]
      ])}
      <p>Green ↖ cells are matches; walking back along them spells <b>"ace"</b>.</p>
      <h4>Why is "drop one" safe when characters differ?</h4>
      <p>If s1's last char x and s2's last char y differ, an LCS cannot end with both x and y (it has one last character). So either x is unused (answer = LCS(s1 without x, s2)) or y is unused (answer = LCS(s1, s2 without y)). Taking the max covers both cases. When they match, using the match is never worse (exchange argument: any LCS that doesn't end with that pair can swap its last char to use it).</p>`,
    clues: [
      '"<b>longest common subsequence</b>" / "longest sequence appearing in both <b>in the same relative order</b>" → dp[i][j] on prefixes.',
      '"minimum number of <b>deletions</b> (or insertions + deletions) to make two strings equal" → n + m − 2·LCS.',
      '"<b>longest palindromic subsequence</b>" → LCS(s, reverse(s)).',
      '"<b>uncrossed lines</b>" / "max matching pairs without crossing" → LCS on arrays.',
      '"<b>shortest common supersequence</b>" → n + m − LCS (and rebuild it from the table).',
      'Two strings with <code>n, m ≤ 1000–5000</code> → O(n·m) table expected; contiguous ("substring") wording → reset to 0 on mismatch instead.'
    ],
    code: [{ lang: 'java', code: `
      // LCS length. dp[i][j] = LCS of s1[0..i-1] and s2[0..j-1].
      int lcs(String s1, String s2) {
          int n = s1.length(), m = s2.length();
          int[][] dp = new int[n + 1][m + 1];           // row 0 / col 0 = empty prefix = 0
          for (int i = 1; i <= n; i++) {
              for (int j = 1; j <= m; j++) {
                  if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
                      dp[i][j] = 1 + dp[i - 1][j - 1];  // use the matching pair (diagonal)
                  } else {
                      dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]); // drop one char
                  }
              }
          }
          return dp[n][m];
      }

      // Rebuild one actual LCS string by walking back from dp[n][m].
      String lcsString(String s1, String s2, int[][] dp) {
          StringBuilder sb = new StringBuilder();
          int i = s1.length(), j = s2.length();
          while (i > 0 && j > 0) {
              if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
                  sb.append(s1.charAt(i - 1));          // part of the LCS
                  i--; j--;
              } else if (dp[i - 1][j] >= dp[i][j - 1]) {
                  i--;                                  // came from above
              } else {
                  j--;                                  // came from the left
              }
          }
          return sb.reverse().toString();
      }`, alt: [{ lang: 'python', code: `# LCS length. dp[i][j] = LCS of s1[:i] and s2[:j].
def lcs_table(s1, s2):
    n, m = len(s1), len(s2)
    dp = [[0] * (m + 1) for _ in range(n + 1)]   # row 0 / col 0 = empty prefix = 0
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if s1[i - 1] == s2[j - 1]:
                dp[i][j] = 1 + dp[i - 1][j - 1]  # use the matching pair (diagonal)
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])   # drop one char
    return dp                                 # dp[n][m] is the LCS length

# Rebuild one actual LCS string by walking back from dp[n][m].
def lcs_string(s1, s2, dp):
    out, i, j = [], len(s1), len(s2)
    while i > 0 and j > 0:
        if s1[i - 1] == s2[j - 1]:
            out.append(s1[i - 1])             # part of the LCS
            i -= 1
            j -= 1
        elif dp[i - 1][j] >= dp[i][j - 1]:
            i -= 1                            # came from above
        else:
            j -= 1                            # came from the left
    return "".join(reversed(out))` }, { lang: 'js', code: `// LCS length. dp[i][j] = LCS of s1[0..i-1] and s2[0..j-1].
function lcsTable(s1, s2) {
  const n = s1.length, m = s2.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));   // empty prefix = 0
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (s1[i - 1] === s2[j - 1]) dp[i][j] = 1 + dp[i - 1][j - 1];   // use the matching pair
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);           // drop one char
    }
  }
  return dp;                                  // dp[n][m] is the LCS length
}

// Rebuild one actual LCS string by walking back from dp[n][m].
function lcsString(s1, s2, dp) {
  const out = [];
  let i = s1.length, j = s2.length;
  while (i > 0 && j > 0) {
    if (s1[i - 1] === s2[j - 1]) {
      out.push(s1[i - 1]);                    // part of the LCS
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;                                    // came from above
    } else {
      j--;                                    // came from the left
    }
  }
  return out.reverse().join('');
}` }, { lang: 'cpp', code: `// LCS length. dp[i][j] = LCS of s1[0..i-1] and s2[0..j-1].
vector<vector<int>> lcsTable(const string& s1, const string& s2) {
    int n = s1.size(), m = s2.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));   // empty prefix = 0
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (s1[i - 1] == s2[j - 1]) dp[i][j] = 1 + dp[i - 1][j - 1];   // use the matching pair
            else dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);              // drop one char
        }
    }
    return dp;                                // dp[n][m] is the LCS length
}

// Rebuild one actual LCS string by walking back from dp[n][m].
string lcsString(const string& s1, const string& s2, const vector<vector<int>>& dp) {
    string out;
    int i = s1.size(), j = s2.size();
    while (i > 0 && j > 0) {
        if (s1[i - 1] == s2[j - 1]) {
            out += s1[i - 1];                 // part of the LCS
            i--; j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
            i--;                              // came from above
        } else {
            j--;                              // came from the left
        }
    }
    reverse(out.begin(), out.end());
    return out;
}` }] }, { lang: 'python', run: true, title: 'LCS with two rolling rows + the string itself (Python, runnable)', code: `def lcs_len_two_rows(s1, s2):
    prev = [0] * (len(s2) + 1)              # row i-1
    for ch in s1:
        cur = [0] * (len(s2) + 1)           # row i
        for j in range(1, len(s2) + 1):
            if ch == s2[j - 1]:
                cur[j] = prev[j - 1] + 1
            else:
                cur[j] = max(prev[j], cur[j - 1])
        prev = cur
    return prev[-1]

def lcs_string(s1, s2):
    n, m = len(s1), len(s2)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if s1[i - 1] == s2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    out, i, j = [], n, m
    while i and j:
        if s1[i - 1] == s2[j - 1]:
            out.append(s1[i - 1]); i -= 1; j -= 1
        elif dp[i - 1][j] >= dp[i][j - 1]:
            i -= 1
        else:
            j -= 1
    return "".join(reversed(out))

print(lcs_len_two_rows("abcde", "ace"), lcs_string("abcde", "ace"))        # 3 ace
print(lcs_len_two_rows("AGGTAB", "GXTXAYB"), lcs_string("AGGTAB", "GXTXAYB"))  # 4 GTAB
print(lcs_len_two_rows("abc", "def"), repr(lcs_string("abc", "def")))      # 0 ''
` }],
    codeTitle: ['LCS length + reconstruction', 'Two-row version and reconstruction (Python, runnable)'],
    viz: {
      title: 'LCS table: match → diagonal + 1, mismatch → max(up, left); then trace the arrows back',
      input: 'abcde ace',
      inputLabel: 'two words separated by a space (each ≤ 8 letters)',
      gen: function (input) {
        var w = parseTwoWords(input, 8), s1 = w[0], s2 = w[1], n = s1.length, m = s2.length;
        var rows = [], i, j, filled = {}, frames = [];
        for (i = 0; i <= n; i++) { rows.push([]); for (j = 0; j <= m; j++) rows[i].push(i === 0 || j === 0 ? 0 : ''); }
        for (i = 0; i <= n; i++) for (j = 0; j <= m; j++) if (i === 0 || j === 0) filled[i + ',' + j] = 1;
        var rh = ['""'].concat(s1.split('')), ch = ['""'].concat(s2.split(''));
        frames.push({ narr: 'Rows = prefixes of "' + s1 + '", columns = prefixes of "' + s2 + '". The empty-prefix row and column are 0: nothing in common with an empty string.', parts: [
          grid('dp[i][j]', rows, rh, ch, gridHl(filled, {}))
        ] });
        for (i = 1; i <= n; i++) {
          for (j = 1; j <= m; j++) {
            var a = s1[i - 1], b = s2[j - 1], sp = {}, narr;
            if (a === b) {
              rows[i][j] = rows[i - 1][j - 1] + 1;
              sp[(i - 1) + ',' + (j - 1)] = 'ok';
              narr = '"' + a + '" == "' + b + '" → <span class="c-g">match!</span> Use it: diagonal ' + rows[i - 1][j - 1] + ' + 1 = <b>' + rows[i][j] + '</b>.';
            } else {
              var up = rows[i - 1][j], left = rows[i][j - 1];
              rows[i][j] = Math.max(up, left);
              sp[(i - 1) + ',' + j] = up >= left ? 'ok' : 'win';
              sp[i + ',' + (j - 1)] = up >= left ? 'win' : 'ok';
              narr = '"' + a + '" ≠ "' + b + '" → one of them is not used. Drop "' + a + '" (up = ' + up + ') or drop "' + b + '" (left = ' + left + ') → max = <b>' + rows[i][j] + '</b>.';
            }
            sp[i + ',' + j] = 'cur';
            frames.push({ narr: narr, parts: [
              grid('dp[i][j]', rows, rh, ch, gridHl(filled, sp)),
              { type: 'vars', vals: { 's1 prefix': s1.slice(0, i), 's2 prefix': s2.slice(0, j) } }
            ] });
            filled[i + ',' + j] = 1;
          }
        }
        var path = {}, out = [];
        i = n; j = m;
        while (i > 0 && j > 0) {
          if (s1[i - 1] === s2[j - 1]) { path[i + ',' + j] = 'sel'; out.unshift(s1[i - 1]); i--; j--; }
          else { path[i + ',' + j] = 'win'; if (rows[i - 1][j] >= rows[i][j - 1]) i--; else j--; }
        }
        frames.push({ narr: 'LCS length = <b>' + rows[n][m] + '</b>. Walk back from the bottom-right: on a match (purple) take the letter and go diagonal; otherwise move to the bigger neighbour (blue). Letters collected: <b>"' + out.join('') + '"</b>.', parts: [
          grid('dp[i][j]', rows, rh, ch, gridHl(filled, path)),
          { type: 'array', label: 'one LCS', values: out.length ? out : ['(empty)'], hl: {} }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'GeeksforGeeks classic: AGGTAB vs GXTXAYB', html: `<p>LCS = <b>"GTAB"</b>, length 4. Note the answer string need not be unique: for "abc" vs "acb" both "ab" and "ac" are LCSs of length 2 — the tie-break in the walk-back decides which one you print.</p>` },
      { title: 'Delete Operation for Two Strings (LC 583)', html: `<p>"sea" → "eat": minimum deletions from both to make them equal. Keep the LCS "ea" (length 2) and delete everything else: (3 − 2) + (3 − 2) = <b>2</b>. Formula n + m − 2·LCS. With different insert/delete costs this becomes edit distance (next topic).</p>` },
      { title: 'Longest Palindromic Subsequence = LCS(s, reverse(s))', html: `<p>s = "bbbab", reverse = "babbb", LCS = "bbbb" → <b>4</b>. Why: a palindrome reads the same both ways, so a palindromic subsequence of s is common to s and its reverse (and the longest common one can be chosen to be a palindrome).</p>` },
      { title: 'Substring vs subsequence (do not mix them up)', html: `<p><b>Longest common substring</b> (contiguous): on mismatch, the run breaks → <code>dp[i][j] = 0</code>; on match <code>dp[i][j] = dp[i−1][j−1] + 1</code>; answer = max over all cells (not the corner). "abcdxyz" vs "xyzabcd" → substring "abcd" (4); the LCS is also 4 here, but for "abcde" vs "ace" the substring answer is just 1.</p>`, code: { lang: 'java', code: `int longestCommonSubstring(String a, String b) {
    int[][] dp = new int[a.length() + 1][b.length() + 1];
    int best = 0;
    for (int i = 1; i <= a.length(); i++)
        for (int j = 1; j <= b.length(); j++)
            if (a.charAt(i - 1) == b.charAt(j - 1)) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
                best = Math.max(best, dp[i][j]);
            }                                      // else stays 0: the run is broken
    return best;
}`, alt: [{ lang: 'python', code: `def longest_common_substring(a, b):
    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    best = 0
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
                best = max(best, dp[i][j])
            # else stays 0: the run is broken
    return best` }, { lang: 'js', code: `function longestCommonSubstring(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  let best = 0;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        best = Math.max(best, dp[i][j]);
      }                                        // else stays 0: the run is broken
  return best;
}` }, { lang: 'cpp', code: `int longestCommonSubstring(const string& a, const string& b) {
    vector<vector<int>> dp(a.size() + 1, vector<int>(b.size() + 1, 0));
    int best = 0;
    for (size_t i = 1; i <= a.size(); i++)
        for (size_t j = 1; j <= b.size(); j++)
            if (a[i - 1] == b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
                best = max(best, dp[i][j]);
            }                                  // else stays 0: the run is broken
    return best;
}` }] } }
    ],
    deepDive: `<p><b>Space.</b> Each row reads only the row above and itself → two rows O(min(n, m)) (put the shorter string on the columns). With a single row plus one saved "diagonal" variable it is one array. Reconstruction needs the full table, or <b>Hirschberg's algorithm</b>: divide &amp; conquer that finds the middle crossing point using forward and backward two-row passes → O(n·m) time, O(n + m) space. That is how diff tools handle large files.</p>
      <p><b>Lower bounds.</b> Under the Strong Exponential Time Hypothesis there is no O((nm)<sup>1−ε</sup>) algorithm for LCS (Abboud–Backurs–Vassilevska Williams 2015, Bringmann–Künnemann). So O(n·m) — with bit-parallel tricks giving O(n·m/64) — is essentially the end of the road for general strings.</p>
      <p><b>Hunt–Szymanski.</b> When matches are rare, process only matching pairs with an LIS-like technique: O((r + n) log n) where r = number of matching (i, j) pairs. If one string is a permutation (all distinct characters), LCS reduces to <b>LIS</b> in O(n log n) — a classic follow-up (DSA 18 covers LIS).</p>
      <p><b>Real diff.</b> git uses Myers' O((n + m)·D) algorithm, where D = size of the edit script — very fast when files are similar. It finds a shortest edit script of insertions/deletions, which is equivalent to an LCS. Patience diff and histogram diff add heuristics for human-readable output.</p>
      <p><b>Bioinformatics.</b> DNA alignment (Needleman–Wunsch global, Smith–Waterman local) is the same grid with match/mismatch/gap scores instead of 1/0 — the template you learn here scales directly.</p>`,
    aiEra: `<p><b>What AI changes:</b> the LCS table is boilerplate for any copilot. Interviews now lean on variants: print the string, count distinct LCSs, LCS of three strings, LCS with constraints, or "this looks like LCS but it is actually substring". The skill is reading the wording precisely.</p>
      <p><b>Use AI as a partner:</b> ask <code>Give me 5 problems that reduce to LCS without saying so</code> and practise the reduction. Ask it to explain Hirschberg at a high level and then try to implement the two-row forward pass yourself.</p>
      <p><b>Where AI goes wrong:</b> confusing substring and subsequence, off-by-one between dp indices and string indices (<code>s1.charAt(i)</code> instead of <code>i − 1</code>), and walking back with the wrong tie-break so the printed string is not actually common. Always verify the printed string is a subsequence of both.</p>
      <p><b>What you must still own:</b> the "compare last characters" argument, the prefix-state definition, and the family of reductions (min deletions, LPS, SCS, uncrossed lines).</p>`,
    problems: [{
      title: 'Longest Common Subsequence', level: 'Medium', tags: ['dp', 'strings', '2d dp'], companies: ['Amazon', 'Google', 'Microsoft', 'Meta'],
      statement: `<p>Given two strings <code>text1</code> and <code>text2</code>, return the length of their longest common subsequence, or 0 if there is none. A subsequence keeps the relative order of characters but may skip characters.</p>`,
      constraints: `1 ≤ text1.length, text2.length ≤ 1000; lowercase English letters only`,
      example: `<p>text1 = "${H.c('g', 'a')}b${H.c('g', 'c')}d${H.c('g', 'e')}", text2 = "${H.c('g', 'ace')}" → Output <b>3</b> ("ace" appears in order in both).</p><p>text1 = "abc", text2 = "def" → <b>0</b>.</p>`,
      brute: { why: `<p>Recursion on (i, j): if chars match, 1 + f(i+1, j+1); else max(f(i+1, j), f(i, j+1)). Without memo, mismatches branch in two and the same (i, j) is reached along many paths → up to O(2<sup>n+m</sup>). With n = m = 1000, impossible. Only (n+1)(m+1) ≈ 10<sup>6</sup> distinct (i, j) pairs exist.</p>`, code: `int f(String a, String b, int i, int j) {
    if (i == a.length() || j == b.length()) return 0;     // one string used up
    if (a.charAt(i) == b.charAt(j)) return 1 + f(a, b, i + 1, j + 1);
    return Math.max(f(a, b, i + 1, j), f(a, b, i, j + 1));
}` },
      mcq: { q: 'text1[i−1] ≠ text2[j−1]. Which cells can give dp[i][j]?', options: ['Only the diagonal dp[i−1][j−1]', 'max(dp[i−1][j], dp[i][j−1])', 'dp[i−1][j−1] + 1', 'Always 0'], answer: 1, explain: 'At least one of the two last characters is not part of the LCS, so drop one of them and take the better result.' },
      tests: { sig: 'string string -> int', fn: 'longestCommonSubsequence', cases: [
        [['abcde', 'ace'], 3], [['abc', 'abc'], 3], [['abc', 'def'], 0], [['a', 'a'], 1], [['a', 'b'], 0],
        [['aggtab', 'gxtxayb'], 4], [['bsbininm', 'jmjkbkjkv'], 1],
        [[{ $rep: 'a', n: 1000 }, { $rep: 'a', n: 1000 }], 1000],
        [[{ $rep: 'ab', n: 500 }, { $rep: 'ba', n: 500 }], 999],
        [[{ $rep: 'a', n: 1000 }, { $rep: 'b', n: 1000 }], 0]
      ] },
      hints: [`<p>Hint 1: Compare only the <b>last</b> characters of the two prefixes. Either they match (great, use them) or at least one of them is useless.</p>`, `<p>Hint 2: dp[i][j] over prefixes with an extra 0 row/column. Match → diag + 1; else max(up, left).</p>`, `<p>Hint 3: Fill rows top-to-bottom, columns left-to-right; answer dp[n][m]. For O(m) memory keep two rows (prev, cur) — swap them after each row.</p>`],
      solution: {
        approach: `<p>Prefix DP over both strings, implemented with two rolling rows to use O(m) memory.</p>`,
        code: `class Solution {
    public int longestCommonSubsequence(String text1, String text2) {
        int n = text1.length(), m = text2.length();
        int[] prev = new int[m + 1], cur = new int[m + 1];   // rows i-1 and i
        for (int i = 1; i <= n; i++) {
            char a = text1.charAt(i - 1);
            for (int j = 1; j <= m; j++) {
                if (a == text2.charAt(j - 1)) cur[j] = prev[j - 1] + 1;   // diagonal + 1
                else cur[j] = Math.max(prev[j], cur[j - 1]);              // up or left
            }
            int[] t = prev; prev = cur; cur = t;                         // row i becomes "previous"
        }
        return prev[m];
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def longest_common_subsequence(self, text1, text2):
        m = len(text2)
        prev = [0] * (m + 1)                       # row i-1
        for a in text1:
            cur = [0] * (m + 1)                    # row i
            for j in range(1, m + 1):
                cur[j] = prev[j - 1] + 1 if a == text2[j - 1] else max(prev[j], cur[j - 1])
            prev = cur
        return prev[m]` }, { lang: 'js', code: `function longestCommonSubsequence(text1, text2) {
  const m = text2.length;
  let prev = new Int32Array(m + 1), cur = new Int32Array(m + 1);   // rows i-1 and i
  for (let i = 1; i <= text1.length; i++) {
    const a = text1[i - 1];
    for (let j = 1; j <= m; j++) {
      cur[j] = a === text2[j - 1] ? prev[j - 1] + 1          // diagonal + 1
                                  : Math.max(prev[j], cur[j - 1]);   // up or left
    }
    [prev, cur] = [cur, prev];                                // row i becomes "previous"
  }
  return prev[m];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int longestCommonSubsequence(string text1, string text2) {
        int n = text1.size(), m = text2.size();
        vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
        for (int i = 1; i <= n; i++)
            for (int j = 1; j <= m; j++)
                dp[i][j] = text1[i - 1] == text2[j - 1] ? dp[i - 1][j - 1] + 1
                                                        : max(dp[i - 1][j], dp[i][j - 1]);
        return dp[n][m];
    }
};` }],
        dry: { head: ['i (char of text1)', 'row after processing ("" a c e)', 'note'], rows: [['1 (a)', '0 1 1 1', 'a matches a'], ['2 (b)', '0 1 1 1', 'no match, copy max'], ['3 (c)', '0 1 2 2', 'c matches c: diag 1 + 1'], ['4 (d)', '0 1 2 2', 'no match'], ['5 (e)', '0 1 2 3', H.c('g', 'e matches e → 3')]] },
        complexity: `<p>Time O(n·m) = 10<sup>6</sup>; space O(m) with two rows (O(n·m) to rebuild the string).</p>`,
        followUps: ['Print the LCS itself.', 'LCS of three strings → dp[i][j][k].', 'One string has all distinct characters → reduce to LIS in O(n log n).']
      }
    }]
  });

  // =====================================================================
  // TOPIC 8 — Edit distance (Levenshtein)
  // =====================================================================
  topics.push({
    title: 'Edit Distance (Levenshtein): Insert, Delete, Replace',
    analogy: `<p>You type "<b>horse</b>" but meant "<b>ros</b>". Your phone's autocorrect wonders: "How many single-letter fixes would turn what they typed into a real word?" Each fix is one keystroke: <b>insert</b> a letter, <b>delete</b> a letter, or <b>replace</b> one letter with another.</p>
      <p>The word with the fewest fixes is probably what you meant. That count is the <b>edit distance</b>, and the same grid that computes it powers spell-checkers, DNA comparison and fuzzy search ("did you mean …?").</p>`,
    explain: `<p><b>Problem:</b> minimum number of operations (insert, delete, replace one character) to convert <code>word1</code> into <code>word2</code>.</p>
      ${H.table(['step', 'Edit distance'], [
        ['State', '<code>dp[i][j]</code> = min ops to turn the first i chars of word1 into the first j chars of word2'],
        ['Last chars equal', 'nothing to do for them: <code>dp[i][j] = dp[i−1][j−1]</code>'],
        ['Last chars differ', '<code>1 + min( dp[i−1][j−1]</code> (replace), <code>dp[i−1][j]</code> (delete word1[i−1]), <code>dp[i][j−1]</code> (insert word2[j−1]) <code>)</code>'],
        ['Base', '<code>dp[i][0] = i</code> (delete all i chars), <code>dp[0][j] = j</code> (insert all j chars)'],
        ['Answer', '<code>dp[n][m]</code>']
      ])}
      <p>Remember the three arrows with this picture:</p>
      ${H.table(['arrow', 'from cell', 'operation', 'meaning'], [
        ['↖ diagonal', 'dp[i−1][j−1]', 'replace (or free if equal)', 'last chars now match each other'],
        ['↑ up', 'dp[i−1][j]', H.c('r', 'delete'), 'drop word1\'s last char'],
        ['← left', 'dp[i][j−1]', H.c('g', 'insert'), 'append word2\'s last char to word1']
      ])}
      <p>horse → ros (answer 3):</p>
      ${H.table(['', '""', 'r', 'o', 's'], [
        ['""', '0', '1', '2', '3'],
        ['h', '1', H.c('y', '1'), '2', '3'],
        ['o', '2', '2', H.c('y', '1'), '2'],
        ['r', '3', '2', H.c('y', '2'), '2'],
        ['s', '4', '3', '3', H.c('y', '2')],
        ['e', '5', '4', '4', H.c('g', '3')]
      ])}
      <p>One optimal script: <b>h→r</b> (replace) "rorse", delete <b>r</b> "rose", delete <b>e</b> "ros" → 3 operations.</p>
      <p><b>Compared with LCS:</b> same grid, same "look at the last characters" idea. LCS maximises matches with arrows worth +1; edit distance minimises cost with arrows worth +1 per operation. If only insert and delete are allowed (no replace), edit distance = n + m − 2·LCS.</p>`,
    clues: [
      '"minimum number of <b>operations</b> to convert word1 to word2" with <b>insert / delete / replace</b> → Levenshtein dp[i][j].',
      '"<b>one edit away</b>" → do not build the table; two pointers in O(n) (check length difference ≤ 1).',
      '"<b>fuzzy match</b>", "did you mean", "spell-check", "similar strings within k typos" → edit distance (banded to k for speed).',
      '"only insertions and deletions allowed" → n + m − 2·LCS.',
      'Different <b>costs</b> per operation ("insert costs 2, delete 3") → same grid, weighted arrows.',
      '<code>word lengths ≤ 500</code> → O(n·m) = 2.5·10<sup>5</sup> cells, intended.'
    ],
    code: [{ lang: 'java', code: `
      // Levenshtein distance. dp[i][j] = min ops: word1[0..i-1] -> word2[0..j-1].
      int minDistance(String word1, String word2) {
          int n = word1.length(), m = word2.length();
          int[][] dp = new int[n + 1][m + 1];
          for (int i = 0; i <= n; i++) dp[i][0] = i;          // delete everything
          for (int j = 0; j <= m; j++) dp[0][j] = j;          // insert everything
          for (int i = 1; i <= n; i++) {
              for (int j = 1; j <= m; j++) {
                  if (word1.charAt(i - 1) == word2.charAt(j - 1)) {
                      dp[i][j] = dp[i - 1][j - 1];               // free: chars already match
                  } else {
                      int replace = dp[i - 1][j - 1];
                      int delete  = dp[i - 1][j];
                      int insert  = dp[i][j - 1];
                      dp[i][j] = 1 + Math.min(replace, Math.min(delete, insert));
                  }
              }
          }
          return dp[n][m];
      }`, alt: [{ lang: 'python', code: `# Levenshtein distance. dp[i][j] = min ops: word1[:i] -> word2[:j].
def min_distance(word1, word2):
    n, m = len(word1), len(word2)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i                          # delete everything
    for j in range(m + 1):
        dp[0][j] = j                          # insert everything
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]   # free: chars already match
            else:
                dp[i][j] = 1 + min(dp[i - 1][j - 1],   # replace
                                   dp[i - 1][j],       # delete
                                   dp[i][j - 1])       # insert
    return dp[n][m]` }, { lang: 'js', code: `// Levenshtein distance. dp[i][j] = min ops: word1[0..i-1] -> word2[0..j-1].
function minDistance(word1, word2) {
  const n = word1.length, m = word2.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;  // delete everything
  for (let j = 0; j <= m; j++) dp[0][j] = j;  // insert everything
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];          // free: chars already match
      } else {
        const replace = dp[i - 1][j - 1], del = dp[i - 1][j], insert = dp[i][j - 1];
        dp[i][j] = 1 + Math.min(replace, del, insert);
      }
    }
  }
  return dp[n][m];
}` }, { lang: 'cpp', code: `// Levenshtein distance. dp[i][j] = min ops: word1[0..i-1] -> word2[0..j-1].
int minDistance(const string& word1, const string& word2) {
    int n = word1.size(), m = word2.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
    for (int i = 0; i <= n; i++) dp[i][0] = i;   // delete everything
    for (int j = 0; j <= m; j++) dp[0][j] = j;   // insert everything
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (word1[i - 1] == word2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];  // free: chars already match
            } else {
                int replace = dp[i - 1][j - 1], del = dp[i - 1][j], insert = dp[i][j - 1];
                dp[i][j] = 1 + min({replace, del, insert});
            }
        }
    }
    return dp[n][m];
}` }] }, { lang: 'python', run: true, title: 'Edit distance + the actual list of edits (Python, runnable)', code: `def edit_script(a, b):
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    ops, i, j = [], n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and a[i - 1] == b[j - 1] and dp[i][j] == dp[i - 1][j - 1]:
            i, j = i - 1, j - 1                          # match, free
        elif i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + 1:
            ops.append("replace " + a[i - 1] + " -> " + b[j - 1]); i, j = i - 1, j - 1
        elif i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            ops.append("delete " + a[i - 1]); i -= 1
        else:
            ops.append("insert " + b[j - 1]); j -= 1
    return dp[n][m], list(reversed(ops))

print(edit_script("horse", "ros"))
print(edit_script("intention", "execution"))
print(edit_script("", "abc"))
` }],
    codeTitle: ['Levenshtein distance', 'Distance + edit script (Python, runnable)'],
    viz: {
      title: 'Edit distance table: three arrows (↖ replace/match, ↑ delete, ← insert) and the cheapest path back',
      input: 'horse ros',
      inputLabel: 'from-word and to-word separated by a space (each ≤ 7 letters)',
      gen: function (input) {
        var w = parseTwoWords(input, 7), s1 = w[0], s2 = w[1], n = s1.length, m = s2.length;
        var rows = [], i, j, filled = {}, frames = [];
        for (i = 0; i <= n; i++) { rows.push([]); for (j = 0; j <= m; j++) rows[i].push(i === 0 ? j : (j === 0 ? i : '')); }
        for (i = 0; i <= n; i++) for (j = 0; j <= m; j++) if (i === 0 || j === 0) filled[i + ',' + j] = 1;
        var rh = ['""'].concat(s1.split('')), ch = ['""'].concat(s2.split(''));
        frames.push({ narr: 'Base row: turning "" into the first j letters of "' + s2 + '" needs j inserts. Base column: turning the first i letters of "' + s1 + '" into "" needs i deletes.', parts: [
          grid('dp[i][j]', rows, rh, ch, gridHl(filled, {}))
        ] });
        for (i = 1; i <= n; i++) {
          for (j = 1; j <= m; j++) {
            var a = s1[i - 1], b = s2[j - 1], sp = {}, narr;
            if (a === b) {
              rows[i][j] = rows[i - 1][j - 1];
              sp[(i - 1) + ',' + (j - 1)] = 'ok';
              narr = '"' + a + '" == "' + b + '" → no operation needed: copy the diagonal = <b>' + rows[i][j] + '</b>.';
            } else {
              var rep = rows[i - 1][j - 1], del = rows[i - 1][j], ins = rows[i][j - 1];
              var best = Math.min(rep, del, ins);
              rows[i][j] = best + 1;
              sp[(i - 1) + ',' + (j - 1)] = rep === best ? 'ok' : 'win';
              sp[(i - 1) + ',' + j] = del === best ? 'ok' : 'win';
              sp[i + ',' + (j - 1)] = ins === best ? 'ok' : 'win';
              var who = rep === best ? 'replace ' + a + '→' + b : (del === best ? 'delete ' + a : 'insert ' + b);
              narr = '"' + a + '" ≠ "' + b + '". Replace ↖ ' + rep + ', delete ↑ ' + del + ', insert ← ' + ins + '. Cheapest + 1 = <b>' + rows[i][j] + '</b> (e.g. ' + who + ').';
            }
            sp[i + ',' + j] = 'cur';
            frames.push({ narr: narr, parts: [
              grid('dp[i][j]', rows, rh, ch, gridHl(filled, sp)),
              { type: 'vars', vals: { from: s1.slice(0, i), to: s2.slice(0, j) } }
            ] });
            filled[i + ',' + j] = 1;
          }
        }
        var path = {}, ops = [];
        i = n; j = m;
        while (i > 0 || j > 0) {
          path[i + ',' + j] = 'sel';
          if (i > 0 && j > 0 && s1[i - 1] === s2[j - 1] && rows[i][j] === rows[i - 1][j - 1]) { i--; j--; }
          else if (i > 0 && j > 0 && rows[i][j] === rows[i - 1][j - 1] + 1) { ops.unshift('replace ' + s1[i - 1] + '→' + s2[j - 1]); i--; j--; }
          else if (i > 0 && rows[i][j] === rows[i - 1][j] + 1) { ops.unshift('delete ' + s1[i - 1]); i--; }
          else { ops.unshift('insert ' + s2[j - 1]); j--; }
        }
        path['0,0'] = 'sel';
        frames.push({ narr: 'Edit distance = <b>' + rows[n][m] + '</b>. Tracing back from the corner (purple) gives one cheapest edit script: ' + (ops.length ? ops.join(', ') : 'no edits — the words are equal') + '.', parts: [
          grid('dp[i][j]', rows, rh, ch, gridHl(filled, path)),
          { type: 'queue', label: 'edit script (first → last)', items: ops.length ? ops : ['(none)'] }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'intention → execution = 5', html: `<p>LeetCode's second sample. One script: delete <b>t</b> (inention), replace <b>i→e</b> (enention), replace <b>n→x</b> (exention), replace <b>n→c</b> (exection), insert <b>u</b> (execution). 5 operations; the table proves no 4-step script exists.</p>` },
      { title: 'Empty strings', html: `<p>"" → "abc" = <b>3</b> inserts; "abc" → "" = <b>3</b> deletes; "" → "" = 0. These are exactly the base row and column — if your base cases are right, these tests pass for free.</p>` },
      { title: 'One Edit Distance in O(n) without a table', html: `<p>"Are s and t exactly one edit apart?" Walk both strings until the first mismatch. If lengths are equal, the rest must match after skipping one char in both (replace). If t is one longer, the rest of s must equal the rest of t after skipping t's char (insert). Anything else → false. O(n) time, O(1) space — a common follow-up that tests whether you <i>over-engineer</i>.</p>`, code: { lang: 'java', code: `boolean isOneEditDistance(String s, String t) {
    if (s.length() > t.length()) return isOneEditDistance(t, s);  // make s the shorter
    if (t.length() - s.length() > 1) return false;
    for (int i = 0; i < s.length(); i++) {
        if (s.charAt(i) != t.charAt(i)) {
            if (s.length() == t.length())
                return s.substring(i + 1).equals(t.substring(i + 1)); // replace
            return s.substring(i).equals(t.substring(i + 1));          // insert into s
        }
    }
    return s.length() + 1 == t.length();   // all equal so far: only an extra last char is ok
}`, alt: [{ lang: 'python', code: `def is_one_edit_distance(s, t):
    if len(s) > len(t):
        return is_one_edit_distance(t, s)    # make s the shorter
    if len(t) - len(s) > 1:
        return False
    for i, (a, b) in enumerate(zip(s, t)):
        if a != b:
            if len(s) == len(t):
                return s[i + 1:] == t[i + 1:]   # replace
            return s[i:] == t[i + 1:]           # insert into s
    return len(s) + 1 == len(t)              # all equal so far: only an extra last char is ok` }, { lang: 'js', code: `function isOneEditDistance(s, t) {
  if (s.length > t.length) return isOneEditDistance(t, s);   // make s the shorter
  if (t.length - s.length > 1) return false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== t[i]) {
      if (s.length === t.length) return s.slice(i + 1) === t.slice(i + 1);   // replace
      return s.slice(i) === t.slice(i + 1);                                  // insert into s
    }
  }
  return s.length + 1 === t.length;          // all equal so far: only an extra last char is ok
}` }, { lang: 'cpp', code: `bool isOneEditDistance(const string& s, const string& t) {
    if (s.size() > t.size()) return isOneEditDistance(t, s);   // make s the shorter
    if (t.size() - s.size() > 1) return false;
    for (size_t i = 0; i < s.size(); i++) {
        if (s[i] != t[i]) {
            if (s.size() == t.size()) return s.compare(i + 1, string::npos, t, i + 1) == 0;   // replace
            return s.compare(i, string::npos, t, i + 1) == 0;                              // insert into s
        }
    }
    return s.size() + 1 == t.size();           // all equal so far: only an extra last char is ok
}` }] } },
      { title: 'Weighted costs', html: `<p>Insert costs 1, delete costs 1, replace costs 2: then replace is never better than delete + insert, and the answer becomes n + m − 2·LCS. "kitten" → "sitting": Levenshtein = <b>3</b> (k→s, e→i, insert g); with replace = 2 it is 5. Same grid; just put the costs on the arrows.</p>` }
    ],
    deepDive: `<p><b>Why the three arrows are complete.</b> Look at an optimal edit script for the last characters. Either word1's last char is deleted (↑), or word2's last char was inserted (←), or the two last characters end up aligned with each other — free if equal, one replace if not (↖). There is no fourth possibility, so the min over three arrows is exact (induction on i + j).</p>
      <p><b>Space &amp; speed.</b> Two rows give O(m) memory. If you only care whether distance ≤ k (spell-check), compute just a <b>band</b> of width 2k+1 around the diagonal → O(n·k). Ukkonen's algorithm and Myers' bit-parallel algorithm (O(n·m/64)) make fuzzy search over big dictionaries fast; Lucene/Elasticsearch fuzzy queries use <b>Levenshtein automata</b> to match all terms within distance 1–2 without comparing each one.</p>
      <p><b>Damerau–Levenshtein</b> adds a fourth operation: swapping two adjacent characters ("teh" → "the" = 1). Add the arrow dp[i−2][j−2] + 1 when the last two characters are swapped (optimal string alignment variant).</p>
      <p><b>Metric.</b> Levenshtein distance satisfies the triangle inequality, so BK-trees can prune dictionary search for "all words within distance 2". No known strongly subquadratic algorithm exists for general strings (SETH-hard, Backurs–Indyk 2015).</p>
      <p><b>Bioinformatics:</b> Needleman–Wunsch is this grid with a scoring matrix (BLOSUM) and gap penalties; affine gaps (opening a gap costs more than extending it) need three grids (Gotoh's algorithm) — a state-machine DP.</p>`,
    aiEra: `<p><b>What AI changes:</b> edit distance is a one-prompt solution. The interview signal shifts to <b>which arrow means what</b>, reconstructing the script, handling weighted costs, and knowing when not to use the table (one-edit check, or ≤ k band).</p>
      <p><b>Use AI as a partner:</b> ask an assistant to produce the edit script for random word pairs and verify it by applying the operations yourself — a fast way to catch tie-breaking bugs. Ask it to explain how a Levenshtein automaton works in Lucene; then implement the O(n·k) band yourself.</p>
      <p><b>Where AI goes wrong:</b> swapping insert/delete arrows (harmless for the distance but wrong in the printed script), wrong base cases (dp[0][j] = 0), and string slicing in loops that turns an O(n) one-edit check into O(n<sup>2</sup>).</p>
      <p><b>What you must still own:</b> the completeness argument for the three arrows, mapping real product needs (autocorrect, dedupe customer names, DNA) to costs and bands, and the LCS ↔ edit-distance relationship.</p>`,
    problems: [{
      title: 'Edit Distance', level: 'Hard', tags: ['dp', 'strings', '2d dp'], companies: ['Google', 'Amazon', 'Microsoft', 'LinkedIn', 'Bloomberg'],
      statement: `<p>Given two strings <code>word1</code> and <code>word2</code>, return the minimum number of operations required to convert word1 to word2. Allowed operations on word1: insert a character, delete a character, replace a character.</p>`,
      constraints: `0 ≤ word1.length, word2.length ≤ 500; lowercase English letters`,
      example: `<p>word1 = "horse", word2 = "ros" → Output <b>3</b>.</p>${H.table(['step', 'operation', 'word'], [['1', H.c('y', 'replace h → r'), 'rorse'], ['2', H.c('r', 'delete r'), 'rose'], ['3', H.c('r', 'delete e'), 'ros']])}`,
      brute: { why: `<p>Recursion f(i, j) tries all three operations on every mismatch → 3-way branching, about 3<sup>n+m</sup> calls. With 500-letter words that never finishes. Yet there are only 501 × 501 ≈ 2.5·10<sup>5</sup> distinct (i, j) states.</p>`, code: `int f(String a, String b, int i, int j) {
    if (i == 0) return j;                         // insert the remaining j chars
    if (j == 0) return i;                         // delete the remaining i chars
    if (a.charAt(i - 1) == b.charAt(j - 1)) return f(a, b, i - 1, j - 1);
    return 1 + Math.min(f(a, b, i - 1, j - 1),    // replace
               Math.min(f(a, b, i - 1, j),        // delete
                        f(a, b, i, j - 1)));      // insert
}` },
      mcq: { q: 'Which cell corresponds to INSERTING word2[j−1] at the end of the current word1 prefix?', options: ['dp[i−1][j−1]', 'dp[i−1][j]', 'dp[i][j−1]', 'dp[i][j]'], answer: 2, explain: 'After inserting word2[j−1], that char is matched; what remains is converting word1[0..i−1] into word2[0..j−2] → dp[i][j−1].' },
      tests: { sig: 'string string -> int', fn: 'minDistance', cases: [
        [['horse', 'ros'], 3], [['intention', 'execution'], 5], [['', ''], 0], [['', 'abc'], 3], [['abc', ''], 3],
        [['a', 'a'], 0], [['kitten', 'sitting'], 3], [['ab', 'ba'], 2], [['abc', 'yabd'], 2],
        [[{ $rep: 'a', n: 500 }, { $rep: 'b', n: 500 }], 500],
        [[{ $rep: 'a', n: 500 }, { $rep: 'a', n: 499 }], 1],
        [[{ $rep: 'a', n: 500 }, ''], 500]
      ] },
      hints: [`<p>Hint 1: Only the last characters matter. If they are equal, they cost nothing. If not, the last operation was a replace, a delete or an insert.</p>`, `<p>Hint 2: dp[i][j] over prefixes; equal → dp[i−1][j−1]; else 1 + min(↖, ↑, ←). Base dp[i][0] = i, dp[0][j] = j.</p>`, `<p>Hint 3: Watch empty strings (the base cases handle them). For O(m) memory: one row plus a variable holding the old diagonal value before you overwrite it.</p>`],
      solution: {
        approach: `<p>Prefix DP with three transitions, using a single row plus a saved diagonal for O(m) memory.</p>`,
        code: `class Solution {
    public int minDistance(String word1, String word2) {
        int n = word1.length(), m = word2.length();
        int[] dp = new int[m + 1];
        for (int j = 0; j <= m; j++) dp[j] = j;            // row 0: insert j chars
        for (int i = 1; i <= n; i++) {
            int diag = dp[0];                              // old dp[i-1][0]
            dp[0] = i;                                     // dp[i][0]: delete i chars
            for (int j = 1; j <= m; j++) {
                int up = dp[j];                            // old dp[i-1][j] (not yet overwritten)
                if (word1.charAt(i - 1) == word2.charAt(j - 1)) {
                    dp[j] = diag;                          // match: free
                } else {
                    dp[j] = 1 + Math.min(diag, Math.min(up, dp[j - 1])); // replace, delete, insert
                }
                diag = up;                                 // becomes dp[i-1][j-1] for next j
            }
        }
        return dp[m];
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def min_distance(self, word1, word2):
        m = len(word2)
        dp = list(range(m + 1))                    # row 0: insert j chars
        for i in range(1, len(word1) + 1):
            diag, dp[0] = dp[0], i                 # old dp[i-1][0]; dp[i][0] = i deletes
            for j in range(1, m + 1):
                up = dp[j]                         # old dp[i-1][j]
                if word1[i - 1] == word2[j - 1]:
                    dp[j] = diag                   # match: free
                else:
                    dp[j] = 1 + min(diag, up, dp[j - 1])   # replace, delete, insert
                diag = up
        return dp[m]` }, { lang: 'js', code: `function minDistance(word1, word2) {
  const m = word2.length;
  const dp = Array.from({ length: m + 1 }, (_, j) => j);   // row 0: insert j chars
  for (let i = 1; i <= word1.length; i++) {
    let diag = dp[0];                              // old dp[i-1][0]
    dp[0] = i;                                     // delete i chars
    for (let j = 1; j <= m; j++) {
      const up = dp[j];                            // old dp[i-1][j]
      dp[j] = word1[i - 1] === word2[j - 1]
        ? diag                                     // match: free
        : 1 + Math.min(diag, up, dp[j - 1]);       // replace, delete, insert
      diag = up;
    }
  }
  return dp[m];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int minDistance(string word1, string word2) {
        int n = word1.size(), m = word2.size();
        vector<int> dp(m + 1);
        iota(dp.begin(), dp.end(), 0);             // row 0: insert j chars
        for (int i = 1; i <= n; i++) {
            int diag = dp[0];                      // old dp[i-1][0]
            dp[0] = i;                             // delete i chars
            for (int j = 1; j <= m; j++) {
                int up = dp[j];                    // old dp[i-1][j]
                if (word1[i - 1] == word2[j - 1]) dp[j] = diag;          // match: free
                else dp[j] = 1 + min({diag, up, dp[j - 1]});             // replace, delete, insert
                diag = up;
            }
        }
        return dp[m];
    }
};` }],
        dry: { head: ['i (word1 char)', 'row dp[i][0..3] for "" r o s', 'note'], rows: [['0', '0 1 2 3', 'base: inserts'], ['1 (h)', '1 1 2 3', 'h→r replace = 1'], ['2 (o)', '2 2 1 2', 'o==o: copy diag 1'], ['3 (r)', '3 2 2 2', 'r vs s: min(1, 2, 2) + 1 = 2'], ['4 (s)', '4 3 3 2', 's==s: diag 2'], ['5 (e)', '5 4 4 3', H.c('g', 'delete e: up 2 + 1 = 3')]] },
        complexity: `<p>Time O(n·m) = 2.5·10<sup>5</sup>; space O(m) (keep the full table to print the edit script).</p>`,
        followUps: ['Return the list of edits.', 'Is the distance ≤ k? (banded DP, O(n·k))', 'Allow swapping adjacent characters (Damerau–Levenshtein).']
      }
    }]
  });

  // =====================================================================
  // TOPIC 9 — Grid paths: obstacles and minimum path sum
  // =====================================================================
  topics.push({
    title: 'Grid DP: Unique Paths (with Obstacles) and Minimum Path Sum',
    analogy: `<p>A delivery rider in a city of perfect square blocks starts at the top-left corner and must reach the bottom-right, moving only <b>right</b> or <b>down</b> (one-way streets!). Some junctions are closed for road works.</p>
      <p>To count routes to any junction, the rider only needs to know: "how many routes reach the junction <b>just above</b>, and how many reach the one <b>just to the left</b>?" — because the last move into this junction came from one of those two. Same idea for the <i>cheapest</i> route when every junction charges a toll.</p>`,
    explain: `<p><b>Unique Paths:</b> an m × n grid, start (0,0), finish (m−1, n−1), moves right or down. The last move into cell (r, c) came from above (r−1, c) or from the left (r, c−1):</p>
      <p style="text-align:center"><code>paths[r][c] = paths[r−1][c] + paths[r][c−1]</code></p>
      ${H.table(['', 'c0', 'c1', 'c2', 'c3'], [['r0', '1', '1', '1', '1'], ['r1', '1', '2', '3', '4'], ['r2', '1', '3', '6', H.c('g', '10')]])}
      <p>First row and first column are all 1 (only one straight way). For a 3 × 4 grid the answer is 10 — also C(5, 2) = 10, since every path is 5 moves of which 2 are "down".</p>
      <h4>With obstacles (Unique Paths II)</h4>
      <p>A blocked cell can't be stepped on, so <code>paths = 0</code> there. Everything else stays the same — the zero simply stops flowing. Careful with the first row/column: cells <b>after</b> an obstacle in the first row are unreachable (0), not 1. If the start or finish is blocked, the answer is 0.</p>
      ${H.table(['grid', 'paths'], [[H.arr([0, 0, 0], { idx: false }) + H.arr([0, 1, 0], { idx: false, hl: { 1: 'r' } }) + H.arr([0, 0, 0], { idx: false }), H.arr([1, 1, 1], { idx: false }) + H.arr([1, 0, 1], { idx: false, hl: { 1: 'r' } }) + H.arr([1, 1, 2], { idx: false, hl: { 2: 'g' } })]])}
      <h4>Minimum Path Sum</h4>
      <p>Each cell has a cost; find the cheapest route. Swap "+" for "min":</p>
      <p style="text-align:center"><code>cost[r][c] = grid[r][c] + min(cost[r−1][c], cost[r][c−1])</code></p>
      <p>First row: only reachable from the left → running sums. First column: running sums down. Grid [[1,3,1],[1,5,1],[4,2,1]] → answer <b>7</b> via 1→3→1→1→1.</p>
      <p>The grid itself is the DP table, and the fill order is just "row by row, left to right" — every cell's dependencies (above and left) are already done.</p>`,
    clues: [
      '"robot at the <b>top-left</b> can only move <b>right or down</b>" → grid DP from top and left.',
      '"<b>obstacles</b>" marked as 1 / "#" in the grid → that cell\'s dp = 0 (count) or ∞ (min cost).',
      '"<b>minimum path sum</b> / minimum cost path / maximum gold collected" with right/down moves → grid[r][c] + min/max(up, left).',
      'Moves in <b>all four directions</b> → not a DAG any more: use BFS / Dijkstra instead of grid DP.',
      '"must have at least 1 health at every step" (Dungeon Game) → fill <b>backwards</b> from the bottom-right.',
      '<code>m, n ≤ 100–200</code> → O(m·n) table; "O(n) extra space?" → one row array.'
    ],
    code: [{ lang: 'java', code: `
      // Unique Paths II: grid[r][c] == 1 means blocked. One row of dp is enough.
      int uniquePathsWithObstacles(int[][] grid) {
          int m = grid.length, n = grid[0].length;
          int[] dp = new int[n];                 // dp[c] = paths to (current row, c)
          dp[0] = grid[0][0] == 1 ? 0 : 1;       // blocked start -> 0 paths
          for (int r = 0; r < m; r++) {
              for (int c = 0; c < n; c++) {
                  if (grid[r][c] == 1) {
                      dp[c] = 0;                 // nobody can stand here
                  } else if (c > 0) {
                      dp[c] += dp[c - 1];        // from above (old dp[c]) + from left
                  }
              }
          }
          return dp[n - 1];
      }

      // Minimum Path Sum: reuse the grid itself as the dp table (modifies input).
      int minPathSum(int[][] g) {
          int m = g.length, n = g[0].length;
          for (int r = 0; r < m; r++) {
              for (int c = 0; c < n; c++) {
                  if (r == 0 && c == 0) continue;               // start: cost is its own value
                  int up   = r > 0 ? g[r - 1][c] : Integer.MAX_VALUE;
                  int left = c > 0 ? g[r][c - 1] : Integer.MAX_VALUE;
                  g[r][c] += Math.min(up, left);                // cheapest way in + this toll
              }
          }
          return g[m - 1][n - 1];
      }`, alt: [{ lang: 'python', code: `import math

# Unique Paths II: grid[r][c] == 1 means blocked. One row of dp is enough.
def unique_paths_with_obstacles(grid):
    n = len(grid[0])
    dp = [0] * n                              # dp[c] = paths to (current row, c)
    dp[0] = 0 if grid[0][0] == 1 else 1       # blocked start -> 0 paths
    for row in grid:
        for c in range(n):
            if row[c] == 1:
                dp[c] = 0                     # nobody can stand here
            elif c > 0:
                dp[c] += dp[c - 1]            # from above (old dp[c]) + from left
    return dp[-1]

# Minimum Path Sum: reuse the grid itself as the dp table (modifies input).
def min_path_sum(g):
    m, n = len(g), len(g[0])
    for r in range(m):
        for c in range(n):
            if r == 0 and c == 0:
                continue                      # start: cost is its own value
            up = g[r - 1][c] if r > 0 else math.inf
            left = g[r][c - 1] if c > 0 else math.inf
            g[r][c] += min(up, left)          # cheapest way in + this toll
    return g[m - 1][n - 1]` }, { lang: 'js', code: `// Unique Paths II: grid[r][c] === 1 means blocked. One row of dp is enough.
function uniquePathsWithObstacles(grid) {
  const n = grid[0].length;
  const dp = new Array(n).fill(0);            // dp[c] = paths to (current row, c)
  dp[0] = grid[0][0] === 1 ? 0 : 1;           // blocked start -> 0 paths
  for (const row of grid) {
    for (let c = 0; c < n; c++) {
      if (row[c] === 1) dp[c] = 0;            // nobody can stand here
      else if (c > 0) dp[c] += dp[c - 1];     // from above (old dp[c]) + from left
    }
  }
  return dp[n - 1];
}

// Minimum Path Sum: reuse the grid itself as the dp table (modifies input).
function minPathSum(g) {
  const m = g.length, n = g[0].length;
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (r === 0 && c === 0) continue;       // start: cost is its own value
      const up = r > 0 ? g[r - 1][c] : Infinity;
      const left = c > 0 ? g[r][c - 1] : Infinity;
      g[r][c] += Math.min(up, left);          // cheapest way in + this toll
    }
  }
  return g[m - 1][n - 1];
}` }, { lang: 'cpp', code: `// Unique Paths II: grid[r][c] == 1 means blocked. One row of dp is enough.
int uniquePathsWithObstacles(const vector<vector<int>>& grid) {
    int n = grid[0].size();
    vector<long long> dp(n, 0);               // dp[c] = paths to (current row, c)
    dp[0] = grid[0][0] == 1 ? 0 : 1;          // blocked start -> 0 paths
    for (const auto& row : grid) {
        for (int c = 0; c < n; c++) {
            if (row[c] == 1) dp[c] = 0;       // nobody can stand here
            else if (c > 0) dp[c] = min<long long>(dp[c] + dp[c - 1], INT_MAX);   // above + left, capped
        }
    }
    return (int) dp[n - 1];
}

// Minimum Path Sum: reuse the grid itself as the dp table (modifies input, so take it by reference).
int minPathSum(vector<vector<int>>& g) {
    int m = g.size(), n = g[0].size();
    for (int r = 0; r < m; r++) {
        for (int c = 0; c < n; c++) {
            if (r == 0 && c == 0) continue;   // start: cost is its own value
            int up   = r > 0 ? g[r - 1][c] : INT_MAX;
            int left = c > 0 ? g[r][c - 1] : INT_MAX;
            g[r][c] += min(up, left);         // one of them is always a real cell
        }
    }
    return g[m - 1][n - 1];
}` }] }, { lang: 'python', run: true, title: 'Paths, obstacle paths, min path + route (Python, runnable)', code: `from math import comb

def unique_paths(m, n):
    row = [1] * n
    for _ in range(1, m):
        for c in range(1, n):
            row[c] += row[c - 1]
    return row[-1]

def paths_with_obstacles(g):
    n = len(g[0])
    dp = [0] * n
    dp[0] = 1 if g[0][0] == 0 else 0
    for r in range(len(g)):
        for c in range(n):
            if g[r][c] == 1:
                dp[c] = 0
            elif c > 0:
                dp[c] += dp[c - 1]
    return dp[-1]

def min_path(g):
    m, n = len(g), len(g[0])
    cost = [[0] * n for _ in range(m)]
    for r in range(m):
        for c in range(n):
            if r == 0 and c == 0:
                cost[r][c] = g[0][0]
            else:
                up = cost[r - 1][c] if r > 0 else float("inf")
                left = cost[r][c - 1] if c > 0 else float("inf")
                cost[r][c] = g[r][c] + min(up, left)
    route, r, c = [], m - 1, n - 1           # walk back to list the cells
    while True:
        route.append(g[r][c])
        if r == 0 and c == 0:
            break
        if c == 0 or (r > 0 and cost[r - 1][c] <= cost[r][c - 1]):
            r -= 1
        else:
            c -= 1
    return cost[m - 1][n - 1], route[::-1]

print(unique_paths(3, 7), comb(8, 2))                                  # 28 28
print(paths_with_obstacles([[0, 0, 0], [0, 1, 0], [0, 0, 0]]))          # 2
print(min_path([[1, 3, 1], [1, 5, 1], [4, 2, 1]]))                      # (7, [1, 3, 1, 1, 1])
` }],
    codeTitle: ['Unique Paths II (1 row) and Minimum Path Sum (in place)', 'All three + route reconstruction (Python, runnable)'],
    viz: [{
      title: 'Counting paths with obstacles: each cell = from above + from the left (blocked cells stay 0)',
      input: '0 0 0 0 / 0 1 0 0 / 0 0 0 1 / 1 0 0 0',
      inputLabel: 'grid rows separated by / (0 = open, 1 = blocked; up to 5×6)',
      gen: function (input) {
        var g = parseMatrix(input, 5, 6, 0, 1), R = g.length, C = g[0].length, r, c, frames = [];
        var dp = [], filled = {};
        for (r = 0; r < R; r++) { dp.push([]); for (c = 0; c < C; c++) dp[r].push(g[r][c] === 1 ? '■' : ''); }
        var rh = range(R).map(function (x) { return 'r' + x; }), ch = range(C).map(function (x) { return 'c' + x; });
        var blocked = {}; for (r = 0; r < R; r++) for (c = 0; c < C; c++) if (g[r][c] === 1) blocked[r + ',' + c] = 'bad';
        frames.push({ narr: 'Grid with ■ = blocked. We will write in each open cell how many right/down routes reach it from the top-left.', parts: [
          grid('paths[r][c]', dp, rh, ch, blocked)
        ] });
        for (r = 0; r < R; r++) {
          for (c = 0; c < C; c++) {
            var sp = Object.assign({}, blocked), narr;
            if (g[r][c] === 1) {
              narr = '(' + r + ',' + c + ') is blocked → <span class="c-r">0 routes</span> pass through it. It will feed 0 to its right and lower neighbours.';
              sp[r + ',' + c] = 'bad';
              frames.push({ narr: narr, parts: [grid('paths[r][c]', dp, rh, ch, gridHl(filled, sp))] });
              filled[r + ',' + c] = 1;
              continue;
            }
            if (r === 0 && c === 0) { dp[0][0] = 1; narr = 'Start cell: exactly <b>1</b> way to be here (do nothing).'; }
            else {
              var up = r > 0 ? (g[r - 1][c] === 1 ? 0 : dp[r - 1][c]) : 0;
              var left = c > 0 ? (g[r][c - 1] === 1 ? 0 : dp[r][c - 1]) : 0;
              dp[r][c] = up + left;
              if (r > 0) sp[(r - 1) + ',' + c] = g[r - 1][c] === 1 ? 'bad' : 'win';
              if (c > 0) sp[r + ',' + (c - 1)] = g[r][c - 1] === 1 ? 'bad' : 'win';
              narr = '(' + r + ',' + c + '): from above ' + (r > 0 ? up : '— (edge)') + ' + from the left ' + (c > 0 ? left : '— (edge)') + ' = <b>' + dp[r][c] + '</b>.' + (dp[r][c] === 0 ? ' <span class="c-r">Unreachable: both ways in are walled off.</span>' : '');
            }
            sp[r + ',' + c] = 'cur';
            frames.push({ narr: narr, parts: [grid('paths[r][c]', dp, rh, ch, gridHl(filled, sp))] });
            filled[r + ',' + c] = 1;
          }
        }
        var ans = g[R - 1][C - 1] === 1 ? 0 : dp[R - 1][C - 1];
        var fin = gridHl(filled, blocked); fin[(R - 1) + ',' + (C - 1)] = ans ? 'sel' : 'bad';
        frames.push({ narr: 'Answer: <b>' + ans + '</b> route(s) reach the bottom-right corner.' + (g[R - 1][C - 1] === 1 ? ' (The finish itself is blocked.)' : ''), parts: [grid('paths[r][c]', dp, rh, ch, fin)] });
        return frames;
      }
    }, {
      title: 'Minimum path sum: each cell = its toll + the cheaper of (above, left); then trace the cheapest route',
      input: '1 3 1 / 1 5 1 / 4 2 1',
      inputLabel: 'cost grid rows separated by / (0..9, up to 5×6)',
      gen: function (input) {
        var g = parseMatrix(input, 5, 6, 0, 9), R = g.length, C = g[0].length, r, c, frames = [];
        var cost = [], filled = {};
        for (r = 0; r < R; r++) { cost.push([]); for (c = 0; c < C; c++) cost[r].push(''); }
        var rh = range(R).map(function (x) { return 'r' + x; }), ch = range(C).map(function (x) { return 'c' + x; });
        frames.push({ narr: 'Left: the tolls. Right: the cheapest total cost to reach each cell (moves: right or down).', parts: [
          grid('toll grid', g, rh, ch, {}), grid('cost[r][c]', cost, rh, ch, {})
        ] });
        for (r = 0; r < R; r++) {
          for (c = 0; c < C; c++) {
            var sp = {}, narr;
            if (r === 0 && c === 0) { cost[0][0] = g[0][0]; narr = 'Start: cost = its own toll ' + g[0][0] + '.'; }
            else {
              var up = r > 0 ? cost[r - 1][c] : INF, left = c > 0 ? cost[r][c - 1] : INF;
              cost[r][c] = g[r][c] + Math.min(up, left);
              if (r > 0) sp[(r - 1) + ',' + c] = up <= left ? 'ok' : 'win';
              if (c > 0) sp[r + ',' + (c - 1)] = left < up ? 'ok' : 'win';
              narr = '(' + r + ',' + c + '): toll ' + g[r][c] + ' + min(above ' + show(up) + ', left ' + show(left) + ') = <b>' + cost[r][c] + '</b>. Green = the cheaper way in.';
            }
            sp[r + ',' + c] = 'cur';
            frames.push({ narr: narr, parts: [
              grid('toll grid', g, rh, ch, one(r + ',' + c, 'cur')),
              grid('cost[r][c]', cost, rh, ch, gridHl(filled, sp))
            ] });
            filled[r + ',' + c] = 1;
          }
        }
        var path = {}, tolls = [];
        r = R - 1; c = C - 1;
        for (;;) {
          path[r + ',' + c] = 'sel'; tolls.unshift(g[r][c]);
          if (r === 0 && c === 0) break;
          if (c === 0 || (r > 0 && cost[r - 1][c] <= cost[r][c - 1])) r--; else c--;
        }
        frames.push({ narr: 'Cheapest total: <b>' + cost[R - 1][C - 1] + '</b>. Walk back from the corner always stepping to the cheaper of above/left: tolls ' + tolls.join(' → ') + '.', parts: [
          grid('toll grid', g, rh, ch, path),
          grid('cost[r][c]', cost, rh, ch, gridHl(filled, path))
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Unique Paths has a formula', html: `<p>Without obstacles, every route is (m−1) downs and (n−1) rights in some order → <b>C(m+n−2, m−1)</b>. m = 3, n = 7 → C(8, 2) = <b>28</b>. Good to mention, but the DP generalises to obstacles and costs while the formula does not. To compute C(n, k) without overflow, multiply and divide step by step in a 64-bit integer: <code>res = res * (n − k + i) / i</code> (Python has <code>math.comb</code>).</p>` },
      { title: 'Obstacle in the first row', html: `<p>Grid [[0, 1, 0], [0, 0, 0]]: cell (0,2) is <b>0</b> (the obstacle blocks the only way in along the top row), not 1. A common bug is initialising the whole first row to 1. Answer: only the route down-then-right → <b>1</b>.</p>` },
      { title: 'Triangle (LC 120) — grid DP on a triangle, bottom-up', html: `<p>[[2], [3,4], [6,5,7], [4,1,8,3]], move to adjacent index below. Go <b>bottom-up</b>: start with the last row as dp and for each row above set <code>dp[j] = tri[i][j] + min(dp[j], dp[j+1])</code>. Rows: [4,1,8,3] → [7,6,10] → [9,10] → [<b>11</b>] (2+3+5+1). Bottom-up means no edge cases for the triangle's edges.</p>`, code: { lang: 'java', code: `int minimumTotal(List<List<Integer>> tri) {
    int n = tri.size();
    int[] dp = new int[n + 1];                      // extra 0 below the last row
    for (int i = n - 1; i >= 0; i--)
        for (int j = 0; j <= i; j++)
            dp[j] = tri.get(i).get(j) + Math.min(dp[j], dp[j + 1]);
    return dp[0];
}`, alt: [{ lang: 'python', code: `def minimum_total(tri):
    dp = [0] * (len(tri) + 1)                # extra 0 below the last row
    for row in reversed(tri):
        for j, v in enumerate(row):
            dp[j] = v + min(dp[j], dp[j + 1])
    return dp[0]` }, { lang: 'js', code: `function minimumTotal(tri) {
  const n = tri.length;
  const dp = new Array(n + 1).fill(0);       // extra 0 below the last row
  for (let i = n - 1; i >= 0; i--)
    for (let j = 0; j <= i; j++)
      dp[j] = tri[i][j] + Math.min(dp[j], dp[j + 1]);
  return dp[0];
}` }, { lang: 'cpp', code: `int minimumTotal(const vector<vector<int>>& tri) {
    int n = tri.size();
    vector<int> dp(n + 1, 0);                // extra 0 below the last row
    for (int i = n - 1; i >= 0; i--)
        for (int j = 0; j <= i; j++)
            dp[j] = tri[i][j] + min(dp[j], dp[j + 1]);
    return dp[0];
}` }] } },
      { title: 'Dungeon Game: why some grids are filled backwards', html: `<p>The knight needs health ≥ 1 at every cell. A forward DP would have to remember both "current health" and "minimum seen so far" — two numbers that trade off. Backwards, <code>need[r][c] = max(1, min(need[r+1][c], need[r][c+1]) − dungeon[r][c])</code> is a single number: the minimum health needed when <i>entering</i> (r, c). Rule: fill in the direction where the future is a single number.</p>` }
    ],
    deepDive: `<p><b>Why right/down makes it a DP.</b> With only right/down moves, every path visits cells in increasing (r + c) order — the grid is a DAG and row-major order is a topological order. Allow up/left moves and cycles appear; then "cheapest path" needs Dijkstra (non-negative tolls) or BFS (unit costs) — DSA 19–20.</p>
      <p><b>One-row memory.</b> In <code>dp[c] += dp[c−1]</code>, before the update dp[c] still holds the row above (from above), and dp[c−1] already holds the current row (from the left). That is why the single array works without copying — the same trick as the unbounded knapsack forward loop. Choose the shorter dimension for the row: O(min(m, n)) memory.</p>
      <p><b>Overflow.</b> Unique Paths for a 100 × 100 grid is C(198, 99) ≈ 2.3·10<sup>58</sup> — huge. LeetCode guarantees answers ≤ 2·10<sup>9</sup>; otherwise use mod 10<sup>9</sup>+7 or big integers (<code>BigInteger</code> / Python int / <code>BigInt</code>).</p>
      <p><b>Cherry Pickup / two walkers.</b> When two people walk simultaneously (or go there and back), the state becomes (step, r1, r2) since c = step − r — a 3D DP in O(n<sup>3</sup>). That is a DP II/III pattern built on this grid foundation.</p>
      <p><b>Counting with modulo and obstacles at scale.</b> For a huge grid (10<sup>5</sup> × 10<sup>5</sup>) with only k ≤ 3000 obstacles, count paths via inclusion–exclusion over obstacles sorted by position: ways(start → o<sub>i</sub> avoiding earlier obstacles) using C(·,·) with precomputed factorials → O(k<sup>2</sup>) — a classic competitive-programming upgrade (AtCoder DP contest "Grid 2").</p>
      <p><b>Production:</b> seam carving (content-aware image resizing) is minimum path sum over an energy grid, moving down with three choices (down-left, down, down-right). Dynamic time warping for comparing speech/time series is the same grid with min over three neighbours.</p>`,
    aiEra: `<p><b>What AI changes:</b> grid DP is the easiest DP for an assistant to write. Interviewers therefore use twists: obstacles on the first row, blocked start, four-directional movement (no longer DP!), backward fill (Dungeon Game), or "print the route".</p>
      <p><b>Use AI as a partner:</b> ask for tricky grids: <code>Give me 6 small obstacle grids that break naive first-row initialisation</code>, and run them against your code. Ask it to compare DP vs Dijkstra on a grid with 4-way movement and explain why DP fails there.</p>
      <p><b>Where AI goes wrong:</b> initialising the first row/column to 1 regardless of obstacles, forgetting that the start cell can be blocked, modifying the input grid when the caller still needs it, and using the largest int + toll (overflow in Java and C++) at edges.</p>
      <p><b>What you must still own:</b> the DAG argument (why right/down allows DP and 4-way doesn't), the choice of fill direction, and the one-row memory trick's correctness.</p>`,
    problems: [{
      title: 'Unique Paths II (with obstacles)', level: 'Medium', tags: ['dp', 'grid dp', 'counting'], companies: ['Amazon', 'Google', 'Bloomberg'],
      statement: `<p>A robot starts at the top-left of an m × n grid and wants to reach the bottom-right, moving only right or down. <code>obstacleGrid[r][c] = 1</code> marks an obstacle the robot cannot enter; 0 is open. Return the number of distinct paths.</p>`,
      constraints: `1 ≤ m, n ≤ 100; answer ≤ 2·10<sup>9</sup>`,
      example: `${H.table(['grid', 'paths per cell'], [['0 0 0<br>0 ' + H.c('r', '1') + ' 0<br>0 0 0', '1 1 1<br>1 ' + H.c('r', '0') + ' 1<br>1 1 ' + H.c('g', '2')]])}<p>Output <b>2</b>: right-right-down-down and down-down-right-right; every other route crosses the obstacle.</p>`,
      brute: { why: `<p>Recursively walk right or down from every cell and count arrivals: up to C(m+n−2, m−1) paths — for 100 × 100 about 10<sup>58</sup> recursive leaves. Every cell is re-explored once per route that reaches it, though its answer never changes.</p>`, code: `int count(int[][] g, int r, int c) {
    int m = g.length, n = g[0].length;
    if (r >= m || c >= n || g[r][c] == 1) return 0;   // off-grid or blocked
    if (r == m - 1 && c == n - 1) return 1;           // reached the goal
    return count(g, r + 1, c) + count(g, r, c + 1);   // down or right
}` },
      mcq: { q: 'The first row is [0, 0, 1, 0]. What are the path counts for that row?', options: ['1 1 1 1', '1 1 0 0', '1 1 0 1', '0 0 0 0'], answer: 1, explain: 'In row 0 the only way in is from the left. The obstacle gives 0 and every cell after it inherits 0.' },
      tests: { sig: 'int[][] -> int', fn: 'uniquePathsWithObstacles', cases: [
        [[[[0, 0, 0], [0, 1, 0], [0, 0, 0]]], 2], [[[[0, 1], [0, 0]]], 1], [[[[1]]], 0], [[[[0]]], 1],
        [[[[0, 0], [0, 1]]], 0], [[[[1, 0]]], 0], [[[[0, 1, 0], [0, 0, 0]]], 1], [[[[0], [0], [0]]], 1],
        // 17 x 18 open grid: C(33, 16) paths, close to the int limit
        [[{ $rep: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], n: 17 }], 1166803110],
        // 100 x 100: a wall in column 98 (below row 0). Cells left of it get astronomically large counts,
        // but they never reach the goal, so the answer is 1 (along the top row, then straight down).
        [[{ $concat: [[new Array(100).fill(0)], { $rep: new Array(98).fill(0).concat([1, 0]), n: 99 }] }], 1]
      ] },
      hints: [`<p>Hint 1: The last move into a cell came from above or from the left. Obstacles contribute 0.</p>`, `<p>Hint 2: paths[r][c] = 0 if blocked, else paths[r−1][c] + paths[r][c−1] (missing neighbours count 0). Start = 1 if open.</p>`, `<p>Hint 3: One array dp of length n: for each row, for each c: if blocked dp[c] = 0 else if c &gt; 0 dp[c] += dp[c−1]. Initialise dp[0] = 1 only if the start is open. Return dp[n−1].</p>`],
      solution: {
        approach: `<p>Row-by-row counting DP in one array: before the update, dp[c] is "from above"; dp[c−1] is "from the left" (already updated for this row).</p>`,
        code: `class Solution {
    public int uniquePathsWithObstacles(int[][] obstacleGrid) {
        int n = obstacleGrid[0].length;
        int[] dp = new int[n];
        dp[0] = obstacleGrid[0][0] == 1 ? 0 : 1;
        for (int[] row : obstacleGrid) {
            for (int c = 0; c < n; c++) {
                if (row[c] == 1) dp[c] = 0;            // blocked cell
                else if (c > 0) dp[c] += dp[c - 1];    // above + left
            }
        }
        return dp[n - 1];
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def unique_paths_with_obstacles(self, obstacle_grid):
        n = len(obstacle_grid[0])
        dp = [0] * n
        dp[0] = 0 if obstacle_grid[0][0] else 1
        for row in obstacle_grid:
            for c in range(n):
                if row[c]:
                    dp[c] = 0                      # blocked cell
                elif c:
                    dp[c] += dp[c - 1]             # above + left
        return dp[-1]` }, { lang: 'js', code: `function uniquePathsWithObstacles(obstacleGrid) {
  const n = obstacleGrid[0].length;
  const dp = new Array(n).fill(0);
  dp[0] = obstacleGrid[0][0] === 1 ? 0 : 1;
  for (const row of obstacleGrid) {
    for (let c = 0; c < n; c++) {
      if (row[c] === 1) dp[c] = 0;                 // blocked cell
      else if (c > 0) dp[c] += dp[c - 1];          // above + left
    }
  }
  // Cells that never reach the goal may grow past 2^53 and lose precision,
  // but every cell that feeds the goal is <= the answer, so the answer stays exact.
  return dp[n - 1];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int uniquePathsWithObstacles(vector<vector<int>>& obstacleGrid) {
        int n = obstacleGrid[0].size();
        vector<long long> dp(n, 0);
        dp[0] = obstacleGrid[0][0] == 1 ? 0 : 1;
        for (auto& row : obstacleGrid) {
            for (int c = 0; c < n; c++) {
                if (row[c] == 1) dp[c] = 0;                    // blocked cell
                else if (c > 0)                                // above + left, capped:
                    dp[c] = min<long long>(dp[c] + dp[c - 1], INT_MAX);
            }   // a capped cell can never feed an answer that fits in int, and the cap avoids overflow
        }
        return (int) dp[n - 1];
    }
};` }],
        dry: { head: ['row', 'grid row', 'dp after the row'], rows: [['0', '0 0 0', '1 1 1'], ['1', '0 1 0', '1 0 1'], ['2', '0 0 0', '1 1 ' + H.c('g', '2')]] },
        complexity: `<p>Time O(m·n), space O(n).</p>`,
        followUps: ['Minimum Path Sum on the same grid.', 'Robot can also move diagonally down-right → add a third term.', 'Count paths modulo 10<sup>9</sup>+7 on a 10<sup>5</sup> × 10<sup>5</sup> grid with few obstacles (combinatorics + inclusion–exclusion).']
      }
    }, {
      title: 'Minimum Path Sum', level: 'Medium', tags: ['dp', 'grid dp', 'min cost'], companies: ['Amazon', 'Goldman Sachs', 'Microsoft'],
      statement: `<p>Given an m × n grid of non-negative integers, find a path from the top-left to the bottom-right that minimizes the sum of all numbers along the path. You can only move right or down.</p>`,
      constraints: `1 ≤ m, n ≤ 200, 0 ≤ grid[i][j] ≤ 200`,
      example: `${H.table(['grid', 'cost'], [[H.c('g', '1') + ' ' + H.c('g', '3') + ' ' + H.c('g', '1') + '<br>1 5 ' + H.c('g', '1') + '<br>4 2 ' + H.c('g', '1'), '1 4 5<br>2 7 6<br>6 8 ' + H.c('g', '7')]])}<p>Output <b>7</b> via 1 → 3 → 1 → 1 → 1. Going down first (1 → 1 → 4 → 2 → 1) costs 9.</p>`,
      brute: { why: `<p>Enumerate every right/down route (C(m+n−2, m−1) of them, ~10<sup>118</sup> for 200 × 200) and sum each. The cheapest cost to reach any middle cell is recomputed for every route through it.</p>`, code: `int best(int[][] g, int r, int c) {
    if (r == 0 && c == 0) return g[0][0];
    int up = r > 0 ? best(g, r - 1, c) : Integer.MAX_VALUE;
    int left = c > 0 ? best(g, r, c - 1) : Integer.MAX_VALUE;
    return g[r][c] + Math.min(up, left);              // exponential without memo
}` },
      mcq: { q: 'How should the first row be filled?', options: ['All zeros', 'Copy the grid values', 'Running (prefix) sums of the row, since it is reachable only from the left', 'All infinity'], answer: 2, explain: 'Cells in row 0 can only be entered from the left, so their cost is the sum of everything before them plus themselves.' },
      tests: { sig: 'int[][] -> int', fn: 'minPathSum', cases: [
        [[[[1, 3, 1], [1, 5, 1], [4, 2, 1]]], 7], [[[[1, 2, 3], [4, 5, 6]]], 12], [[[[0]]], 0], [[[[5]]], 5],
        [[[[1, 2], [1, 1]]], 3], [[[[1], [2], [3]]], 6],
        [[{ $rep: new Array(200).fill(200), n: 200 }], 79800],
        [[{ $rep: new Array(200).fill(0), n: 200 }], 0]
      ] },
      hints: [`<p>Hint 1: The cheapest way into (r, c) is via the cheaper of its two possible predecessors.</p>`, `<p>Hint 2: cost[r][c] = grid[r][c] + min(cost[r−1][c], cost[r][c−1]); edges have only one predecessor.</p>`, `<p>Hint 3: Use one row array: dp[c] = grid[r][c] + min(dp[c] (above), dp[c−1] (left)), treating missing neighbours as +∞. Start dp[0] with grid[0][0] and build the first row as prefix sums.</p>`],
      solution: {
        approach: `<p>Grid DP with "min" instead of "+", stored in a single row array.</p>`,
        code: `class Solution {
    public int minPathSum(int[][] grid) {
        int m = grid.length, n = grid[0].length;
        int[] dp = new int[n];
        for (int r = 0; r < m; r++) {
            for (int c = 0; c < n; c++) {
                if (r == 0 && c == 0) dp[c] = grid[0][0];
                else if (r == 0) dp[c] = dp[c - 1] + grid[r][c];          // only from the left
                else if (c == 0) dp[c] = dp[c] + grid[r][c];              // only from above
                else dp[c] = Math.min(dp[c], dp[c - 1]) + grid[r][c];     // cheaper of above/left
            }
        }
        return dp[n - 1];
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def min_path_sum(self, grid):
        n = len(grid[0])
        dp = [float("inf")] * n                    # +inf = "no row above yet"
        dp[0] = 0
        for row in grid:
            dp[0] += row[0]                        # first column: only from above
            for c in range(1, n):
                dp[c] = min(dp[c], dp[c - 1]) + row[c]   # cheaper of above / left
        return dp[-1]` }, { lang: 'js', code: `function minPathSum(grid) {
  const n = grid[0].length;
  const dp = new Array(n).fill(Infinity);          // Infinity = "no row above yet"
  dp[0] = 0;
  for (const row of grid) {
    dp[0] += row[0];                               // first column: only from above
    for (let c = 1; c < n; c++) {
      dp[c] = Math.min(dp[c], dp[c - 1]) + row[c]; // cheaper of above / left
    }
  }
  return dp[n - 1];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int minPathSum(vector<vector<int>>& grid) {
        int n = grid[0].size();
        vector<int> dp(n, INT_MAX);                // INT_MAX = "no row above yet"
        dp[0] = 0;
        for (auto& row : grid) {
            dp[0] += row[0];                       // first column: only from above
            for (int c = 1; c < n; c++)
                dp[c] = min(dp[c], dp[c - 1]) + row[c];   // dp[c - 1] is finite, so no overflow
        }
        return dp[n - 1];
    }
};` }],
        dry: { head: ['row', 'grid row', 'dp after the row'], rows: [['0', '1 3 1', '1 4 5'], ['1', '1 5 1', '2 7 6'], ['2', '4 2 1', '6 8 ' + H.c('g', '7')]] },
        complexity: `<p>Time O(m·n) = 4·10<sup>4</sup>; space O(n).</p>`,
        followUps: ['Print the path (keep the full table and walk back).', 'Maximum gold instead of minimum cost.', 'Movement in 4 directions → Dijkstra.']
      }
    }]
  });

  // =====================================================================
  // PRACTICE — Easy
  // =====================================================================
  practice.push({
    title: 'N-th Tribonacci Number', level: 'Easy', tags: ['dp', '1d dp'], companies: ['Amazon', 'Bloomberg'],
    statement: `<p>The Tribonacci sequence is T0 = 0, T1 = 1, T2 = 1 and T(n+3) = T(n) + T(n+1) + T(n+2). Given <code>n</code>, return T(n).</p>`,
    constraints: `0 ≤ n ≤ 37 (answer fits in a 32-bit int)`,
    example: `${H.arr([0, 1, 1, 2, 4, 7], { label: 'T', hl: { 1: 'b', 2: 'b', 3: 'b', 4: 'g' } })}<p>n = 4 → <b>4</b> = ${H.c('b', '1 + 1 + 2')}.</p>`,
    brute: { why: `<p>Three-way recursion recomputes small terms constantly: ~1.84<sup>n</sup> calls (≈ 6·10<sup>9</sup> for n = 37) — too slow.</p>`, code: `int trib(int n) {
    if (n == 0) return 0;
    if (n <= 2) return 1;
    return trib(n - 1) + trib(n - 2) + trib(n - 3);
}` },
    mcq: { q: 'How many rolling variables does the O(1)-space solution need?', options: ['1', '2', '3', 'n'], answer: 2, explain: 'Each term reads the previous three terms.' },
    tests: { sig: 'int -> int', fn: 'tribonacci', cases: [
      [[0], 0], [[1], 1], [[2], 1], [[3], 2], [[4], 4], [[25], 1389537], [[37], 2082876103]
    ] },
    hints: [`<p>Hint 1: Exactly like Fibonacci, but each term looks three steps back instead of two.</p>`, `<p>Hint 2: Keep a = T(i−3), b = T(i−2), c = T(i−1) and slide them forward each step.</p>`, `<p>Hint 3: Return n directly for n = 0 and 1 for n = 1 or 2; otherwise loop i = 3..n computing d = a + b + c then shift.</p>`],
    solution: {
      approach: `<p>Bottom-up with a three-number sliding window.</p>`,
      code: `class Solution {
    public int tribonacci(int n) {
        if (n == 0) return 0;
        if (n <= 2) return 1;
        int a = 0, b = 1, c = 1;               // T(i-3), T(i-2), T(i-1)
        for (int i = 3; i <= n; i++) {
            int d = a + b + c;
            a = b; b = c; c = d;               // slide the window
        }
        return c;
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def tribonacci(self, n: int) -> int:
        if n == 0:
            return 0
        a, b, c = 0, 1, 1                      # T(i-3), T(i-2), T(i-1)
        for _ in range(3, n + 1):
            a, b, c = b, c, a + b + c          # slide the window
        return c` }, { lang: 'js', code: `function tribonacci(n) {
  if (n === 0) return 0;
  let a = 0, b = 1, c = 1;                     // T(i-3), T(i-2), T(i-1)
  for (let i = 3; i <= n; i++) {
    [a, b, c] = [b, c, a + b + c];             // slide the window
  }
  return c;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int tribonacci(int n) {
        if (n == 0) return 0;
        if (n <= 2) return 1;
        int a = 0, b = 1, c = 1;               // T(i-3), T(i-2), T(i-1)
        for (int i = 3; i <= n; i++) {
            int d = a + b + c;                 // n <= 37 keeps this inside int
            a = b; b = c; c = d;               // slide the window
        }
        return c;
    }
};` }],
      dry: { head: ['i', 'a', 'b', 'c', 'd'], rows: [['3', '0', '1', '1', '2'], ['4', '1', '1', '2', H.c('g', '4')]] },
      complexity: `<p>Time O(n), space O(1).</p>`
    }
  });

  practice.push({
    title: 'Min Cost Climbing Stairs', level: 'Easy', tags: ['dp', '1d dp', 'min cost'], companies: ['Amazon', 'Adobe', 'Google'],
    statement: `<p><code>cost[i]</code> is the cost of stepping on stair i. After paying, you may climb 1 or 2 stairs. You may start at stair 0 or stair 1. Return the minimum cost to reach the top (the position just past the last stair).</p>`,
    constraints: `2 ≤ cost.length ≤ 1000, 0 ≤ cost[i] ≤ 999`,
    example: `${H.arr([1, 100, 1, 1, 1, 100, 1, 1, 100, 1], { label: 'cost', hl: { 0: 'g', 2: 'g', 4: 'g', 6: 'g', 7: 'g', 9: 'g' } })}<p>Output <b>6</b>: start at stair 0 and step only on the six green stairs (0 → 2 → 4 → 6 → 7 → 9 → top), each costing 1, hopping over every 100.</p>`,
    brute: { why: `<p>Recursively try 1 or 2 steps from each stair: 2-way branching → ~1.6<sup>n</sup> calls; n = 1000 is impossible. The cheapest way from stair 7 to the top is recomputed for every route that reaches stair 7.</p>`, code: `int from(int[] cost, int i) {
    if (i >= cost.length) return 0;                      // reached the top
    return cost[i] + Math.min(from(cost, i + 1), from(cost, i + 2));
}
int minCost(int[] cost) { return Math.min(from(cost, 0), from(cost, 1)); }` },
    mcq: { q: 'Let dp[i] = min cost to <i>stand on</i> position i (before paying cost[i]). What is dp[i]?', options: ['min(dp[i−1] + cost[i−1], dp[i−2] + cost[i−2])', 'dp[i−1] + dp[i−2]', 'cost[i] + cost[i−1]', 'max(dp[i−1], dp[i−2])'], answer: 0, explain: 'You arrived from i−1 (paying cost[i−1]) or from i−2 (paying cost[i−2]). dp[0] = dp[1] = 0 because you may start on either for free.' },
    tests: { sig: 'int[] -> int', fn: 'minCostClimbingStairs', cases: [
      [[[10, 15, 20]], 15], [[[1, 100, 1, 1, 1, 100, 1, 1, 100, 1]], 6], [[[0, 0]], 0], [[[5, 3]], 3],
      [[[1, 2, 3]], 2], [[{ $rep: 999, n: 20 }], 9990], [[{ $rep: 999, n: 1000 }], 499500]
    ] },
    hints: [`<p>Hint 1: It is Climbing Stairs with min instead of +: how did you arrive at position i, and what did that last step cost?</p>`, `<p>Hint 2: dp[i] = min(dp[i−1] + cost[i−1], dp[i−2] + cost[i−2]), dp[0] = dp[1] = 0, answer dp[n] (the top).</p>`, `<p>Hint 3: Only two previous values are needed → two variables. Be careful: the top is index n, one past the last stair.</p>`],
    solution: {
      approach: `<p>dp over positions 0..n where n is the top; two rolling variables.</p>`,
      code: `class Solution {
    public int minCostClimbingStairs(int[] cost) {
        int twoBack = 0, oneBack = 0;          // dp[i-2], dp[i-1]; dp[0] = dp[1] = 0
        for (int i = 2; i <= cost.length; i++) {
            int cur = Math.min(oneBack + cost[i - 1], twoBack + cost[i - 2]);
            twoBack = oneBack;
            oneBack = cur;
        }
        return oneBack;                        // dp[n] = cost to reach the top
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def min_cost_climbing_stairs(self, cost):
        two, one = 0, 0                        # dp[i-2], dp[i-1]; dp[0] = dp[1] = 0
        for i in range(2, len(cost) + 1):
            two, one = one, min(one + cost[i - 1], two + cost[i - 2])
        return one                             # dp[n] = cost to reach the top` }, { lang: 'js', code: `function minCostClimbingStairs(cost) {
  let twoBack = 0, oneBack = 0;                // dp[i-2], dp[i-1]; dp[0] = dp[1] = 0
  for (let i = 2; i <= cost.length; i++) {
    [twoBack, oneBack] = [oneBack, Math.min(oneBack + cost[i - 1], twoBack + cost[i - 2])];
  }
  return oneBack;                              // dp[n] = cost to reach the top
}` }, { lang: 'cpp', code: `class Solution {
public:
    int minCostClimbingStairs(vector<int>& cost) {
        int twoBack = 0, oneBack = 0;          // dp[i-2], dp[i-1]; dp[0] = dp[1] = 0
        for (size_t i = 2; i <= cost.size(); i++) {
            int cur = min(oneBack + cost[i - 1], twoBack + cost[i - 2]);
            twoBack = oneBack;
            oneBack = cur;
        }
        return oneBack;                        // dp[n] = cost to reach the top
    }
};` }],
      dry: { head: ['i', 'from i-1', 'from i-2', 'dp[i]'], rows: [['2 (cost=[10,15,20])', '0 + 15', '0 + 10', '10'], ['3 (top)', '10 + 20 = 30', '0 + 15 = 15', H.c('g', '15')]] },
      complexity: `<p>Time O(n), space O(1).</p>`,
      followUps: ['Allow jumps of 1..k stairs → O(n·k), or O(n) with a monotonic deque.']
    }
  });

  practice.push({
    title: 'Pascal\'s Triangle', level: 'Easy', tags: ['dp', 'combinatorics'], companies: ['Amazon', 'Apple', 'Microsoft'],
    statement: `<p>Given <code>numRows</code>, return the first numRows rows of Pascal's triangle. Each number is the sum of the two numbers directly above it; the edges are 1.</p>`,
    constraints: `1 ≤ numRows ≤ 30`,
    example: `<p>numRows = 5 →</p>${H.arr([1], { idx: false })}${H.arr([1, 1], { idx: false })}${H.arr([1, 2, 1], { idx: false })}${H.arr([1, 3, 3, 1], { idx: false, hl: { 1: 'b', 2: 'b' } })}${H.arr([1, 4, 6, 4, 1], { idx: false, hl: { 2: 'g' } })}<p>${H.c('g', '6')} = ${H.c('b', '3 + 3')}. Entry j of row i is C(i, j).</p>`,
    brute: { why: `<p>Compute each entry C(i, j) independently with factorials: 30! overflows a 64-bit integer, and recomputing factorials per entry is wasteful (O(n) per entry). Or recursively C(i, j) = C(i−1, j−1) + C(i−1, j) without memo → exponential.</p>`, code: `long C(int n, int k) {
    if (k == 0 || k == n) return 1;
    return C(n - 1, k - 1) + C(n - 1, k);      // exponential without memo
}` },
    mcq: { q: 'Which DP relation builds row i from row i−1?', options: ['row[i][j] = row[i−1][j−1] + row[i−1][j]', 'row[i][j] = row[i−1][j] × 2', 'row[i][j] = row[i][j−1] + 1', 'row[i][j] = i × j'], answer: 0, explain: 'Pascal\'s rule: C(i, j) = C(i−1, j−1) + C(i−1, j) — choose item i or not.' },
    tests: { sig: 'int -> list<list<int>>', fn: 'generate', cases: [
      [[1], [[1]]], [[2], [[1], [1, 1]]], [[3], [[1], [1, 1], [1, 2, 1]]],
      [[5], [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, 4, 6, 4, 1]]],
      [[6], [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, 4, 6, 4, 1], [1, 5, 10, 10, 5, 1]]],
      // 30 rows: the middle of the last row is C(29, 14) = 77558760
      [[30], [[1],[1,1],[1,2,1],[1,3,3,1],[1,4,6,4,1],[1,5,10,10,5,1],[1,6,15,20,15,6,1],[1,7,21,35,35,21,7,1],[1,8,28,56,70,56,28,8,1],[1,9,36,84,126,126,84,36,9,1],[1,10,45,120,210,252,210,120,45,10,1],[1,11,55,165,330,462,462,330,165,55,11,1],[1,12,66,220,495,792,924,792,495,220,66,12,1],[1,13,78,286,715,1287,1716,1716,1287,715,286,78,13,1],[1,14,91,364,1001,2002,3003,3432,3003,2002,1001,364,91,14,1],[1,15,105,455,1365,3003,5005,6435,6435,5005,3003,1365,455,105,15,1],[1,16,120,560,1820,4368,8008,11440,12870,11440,8008,4368,1820,560,120,16,1],[1,17,136,680,2380,6188,12376,19448,24310,24310,19448,12376,6188,2380,680,136,17,1],[1,18,153,816,3060,8568,18564,31824,43758,48620,43758,31824,18564,8568,3060,816,153,18,1],[1,19,171,969,3876,11628,27132,50388,75582,92378,92378,75582,50388,27132,11628,3876,969,171,19,1],[1,20,190,1140,4845,15504,38760,77520,125970,167960,184756,167960,125970,77520,38760,15504,4845,1140,190,20,1],[1,21,210,1330,5985,20349,54264,116280,203490,293930,352716,352716,293930,203490,116280,54264,20349,5985,1330,210,21,1],[1,22,231,1540,7315,26334,74613,170544,319770,497420,646646,705432,646646,497420,319770,170544,74613,26334,7315,1540,231,22,1],[1,23,253,1771,8855,33649,100947,245157,490314,817190,1144066,1352078,1352078,1144066,817190,490314,245157,100947,33649,8855,1771,253,23,1],[1,24,276,2024,10626,42504,134596,346104,735471,1307504,1961256,2496144,2704156,2496144,1961256,1307504,735471,346104,134596,42504,10626,2024,276,24,1],[1,25,300,2300,12650,53130,177100,480700,1081575,2042975,3268760,4457400,5200300,5200300,4457400,3268760,2042975,1081575,480700,177100,53130,12650,2300,300,25,1],[1,26,325,2600,14950,65780,230230,657800,1562275,3124550,5311735,7726160,9657700,10400600,9657700,7726160,5311735,3124550,1562275,657800,230230,65780,14950,2600,325,26,1],[1,27,351,2925,17550,80730,296010,888030,2220075,4686825,8436285,13037895,17383860,20058300,20058300,17383860,13037895,8436285,4686825,2220075,888030,296010,80730,17550,2925,351,27,1],[1,28,378,3276,20475,98280,376740,1184040,3108105,6906900,13123110,21474180,30421755,37442160,40116600,37442160,30421755,21474180,13123110,6906900,3108105,1184040,376740,98280,20475,3276,378,28,1],[1,29,406,3654,23751,118755,475020,1560780,4292145,10015005,20030010,34597290,51895935,67863915,77558760,77558760,67863915,51895935,34597290,20030010,10015005,4292145,1560780,475020,118755,23751,3654,406,29,1]]]
    ] },
    hints: [`<p>Hint 1: Each row depends only on the row above it, like a 2D DP table filled row by row.</p>`, `<p>Hint 2: Start every row with 1, fill the middle with sums of the two above, end with 1.</p>`, `<p>Hint 3: Row i has i+1 entries; handle row 0 = [1] as the base. Keep a list of rows (<code>List&lt;List&lt;Integer&gt;&gt;</code> / list of lists / array of arrays / <code>vector&lt;vector&lt;int&gt;&gt;</code>) and read the previous row, row i−1.</p>`],
    solution: {
      approach: `<p>Build row by row; middle entries are sums of the two entries above.</p>`,
      code: `class Solution {
    public List<List<Integer>> generate(int numRows) {
        List<List<Integer>> rows = new ArrayList<>();
        for (int i = 0; i < numRows; i++) {
            List<Integer> row = new ArrayList<>();
            for (int j = 0; j <= i; j++) {
                if (j == 0 || j == i) row.add(1);                       // edges
                else row.add(rows.get(i - 1).get(j - 1) + rows.get(i - 1).get(j));
            }
            rows.add(row);
        }
        return rows;
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def generate(self, num_rows: int) -> list[list[int]]:
        rows = [[1]]                           # row 0
        for _ in range(1, num_rows):
            prev = rows[-1]
            # edges are 1; each middle entry is the sum of the two above it
            rows.append([1] + [a + b for a, b in zip(prev, prev[1:])] + [1])
        return rows` }, { lang: 'js', code: `function generate(numRows) {
  const rows = [[1]];                          // row 0
  for (let i = 1; i < numRows; i++) {
    const prev = rows[i - 1], row = [1];       // left edge
    for (let j = 1; j < i; j++) row.push(prev[j - 1] + prev[j]);
    row.push(1);                               // right edge
    rows.push(row);
  }
  return rows;
}` }, { lang: 'cpp', code: `class Solution {
public:
    vector<vector<int>> generate(int numRows) {
        vector<vector<int>> rows;
        for (int i = 0; i < numRows; i++) {
            vector<int> row(i + 1, 1);         // edges are 1
            for (int j = 1; j < i; j++) row[j] = rows[i - 1][j - 1] + rows[i - 1][j];
            rows.push_back(move(row));
        }
        return rows;
    }
};` }],
      dry: { head: ['i', 'row'], rows: [['0', '1'], ['1', '1 1'], ['2', '1 2 1'], ['3', '1 3 3 1'], ['4', H.c('g', '1 4 6 4 1')]] },
      complexity: `<p>Time O(numRows<sup>2</sup>), space O(numRows<sup>2</sup>) for the output.</p>`,
      followUps: ['Return only row k using O(k) space (update right-to-left, like 0/1 knapsack).', 'nCr mod p for large n → factorials + modular inverse (DSA 3).']
    }
  });

  practice.push({
    title: 'Counting Bits', level: 'Easy', tags: ['dp', 'bit manipulation'], companies: ['Amazon', 'Apple', 'Adobe'],
    statement: `<p>Given <code>n</code>, return an array <code>ans</code> of length n + 1 where ans[i] is the number of 1 bits in the binary form of i.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>; follow-up: O(n) without a built-in popcount`,
    example: `<p>n = 5 → <b>[0, 1, 1, 2, 1, 2]</b>.</p>${H.table(['i', 'binary', 'i &gt;&gt; 1', 'ans[i] = ans[i&gt;&gt;1] + (i &amp; 1)'], [['4', '100', '2 (10)', '1 + 0 = 1'], ['5', '101', '2 (10)', H.c('g', '1 + 1 = 2')]])}`,
    brute: { why: `<p>Count bits of every i separately with a loop over its bits: O(n log n). Fine for 10<sup>5</sup>, but it ignores that i shifted right by one was already counted — the follow-up asks for O(n).</p>`, code: `int[] countBits(int n) {
    int[] ans = new int[n + 1];
    for (int i = 0; i <= n; i++) {
        int x = i, c = 0;
        while (x > 0) { c += x & 1; x >>= 1; }   // O(log i) per number
        ans[i] = c;
    }
    return ans;
}` },
    mcq: { q: 'Why is ans[i] = ans[i &gt;&gt; 1] + (i &amp; 1) valid DP?', options: ['i &gt;&gt; 1 &lt; i so it is already computed, and it has the same bits except the last one', 'Because of 2\'s complement', 'Because popcount is multiplicative', 'It only works for powers of two'], answer: 0, explain: 'Dropping the last bit gives a smaller number already in the table; add back the dropped bit.' },
    // check: compares against an independent popcount (binary string), so the big case needs no literal
    tests: { sig: 'int -> int[]', fn: 'countBits', check: '(args, out) => Array.isArray(out) && out.length === args[0] + 1 && out.every((v, i) => v === i.toString(2).split("").filter((ch) => ch === "1").length)', cases: [
      [[0], [0]], [[1], [0, 1]], [[2], [0, 1, 1]], [[5], [0, 1, 1, 2, 1, 2]],
      [[16], [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4, 1]], [[100000], null]
    ] },
    hints: [`<p>Hint 1: Look for a smaller number whose bit count is already known and differs from i in a predictable way.</p>`, `<p>Hint 2: i &gt;&gt; 1 removes the last bit: ans[i] = ans[i &gt;&gt; 1] + (i &amp; 1). Alternatively ans[i] = ans[i &amp; (i − 1)] + 1 (drop the lowest set bit).</p>`, `<p>Hint 3: Base ans[0] = 0; fill i = 1..n in increasing order — every dependency is smaller than i.</p>`],
    solution: {
      approach: `<p>1D DP where each number's answer comes from a strictly smaller number.</p>`,
      code: `class Solution {
    public int[] countBits(int n) {
        int[] ans = new int[n + 1];                 // ans[0] = 0
        for (int i = 1; i <= n; i++) {
            ans[i] = ans[i >> 1] + (i & 1);         // same bits as i/2, plus the last bit
        }
        return ans;
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def count_bits(self, n: int) -> list[int]:
        ans = [0] * (n + 1)                    # ans[0] = 0
        for i in range(1, n + 1):
            ans[i] = ans[i >> 1] + (i & 1)     # same bits as i // 2, plus the last bit
        return ans` }, { lang: 'js', code: `function countBits(n) {
  const ans = new Array(n + 1).fill(0);        // ans[0] = 0
  for (let i = 1; i <= n; i++) {
    ans[i] = ans[i >> 1] + (i & 1);            // same bits as i / 2, plus the last bit
  }
  return ans;
}` }, { lang: 'cpp', code: `class Solution {
public:
    vector<int> countBits(int n) {
        vector<int> ans(n + 1, 0);             // ans[0] = 0
        for (int i = 1; i <= n; i++)
            ans[i] = ans[i >> 1] + (i & 1);    // same bits as i / 2, plus the last bit
        return ans;
    }
};` }],
      dry: { head: ['i', 'i>>1', 'i&1', 'ans[i]'], rows: [['1', '0', '1', '1'], ['2', '1', '0', '1'], ['3', '1', '1', '2'], ['4', '2', '0', '1'], ['5', '2', '1', H.c('g', '2')]] },
      complexity: `<p>Time O(n), space O(n) for the output.</p>`
    }
  });

  // =====================================================================
  // PRACTICE — Medium
  // =====================================================================
  practice.push({
    title: 'House Robber II (circular street)', level: 'Medium', tags: ['dp', 'take or skip'], companies: ['Amazon', 'Microsoft', 'Google'],
    statement: `<p>Same as House Robber, but the houses are arranged in a <b>circle</b>: the first house is adjacent to the last. Return the maximum amount you can rob without robbing two adjacent houses.</p>`,
    constraints: `1 ≤ n ≤ 100, 0 ≤ nums[i] ≤ 1000`,
    example: `<p>[2, 3, 2] → <b>3</b> (houses 0 and 2 are neighbours now). [1, 2, 3, 1] → <b>4</b> (1 + 3).</p>`,
    brute: { why: `<p>Enumerate all non-adjacent subsets and reject those containing both the first and last house: exponential (~1.6<sup>n</sup>), and the same suffix questions are recomputed.</p>`, code: `int go(int[] a, int i, boolean tookFirst) {
    if (i >= a.length) return 0;
    if (i == a.length - 1 && tookFirst) return 0;          // last house touches the first
    int skip = go(a, i + 1, tookFirst);
    int take = a[i] + go(a, i + 2, tookFirst || i == 0);
    return Math.max(skip, take);
}` },
    mcq: { q: 'How do you break the circle?', options: ['Solve the line twice: without the last house, and without the first house; take the max', 'Always skip house 0', 'Rob every other house', 'Double the array'], answer: 0, explain: 'First and last can\'t both be robbed, so at least one of them is excluded; each case is a plain line problem.' },
    tests: { sig: 'int[] -> int', fn: 'rob', cases: [
      [[[2, 3, 2]], 3], [[[1, 2, 3, 1]], 4], [[[1, 2, 3]], 3], [[[5]], 5], [[[1, 2]], 2], [[[0]], 0],
      [[[200, 3, 140, 20, 10]], 340], [[{ $rep: 1000, n: 100 }], 50000], [[{ $rep: 1000, n: 99 }], 49000]
    ] },
    hints: [`<p>Hint 1: The only new conflict is between house 0 and house n−1. At least one of them is not robbed.</p>`, `<p>Hint 2: Answer = max(robLine(0..n−2), robLine(1..n−1)), each solved with the two-variable House Robber.</p>`, `<p>Hint 3: Special case n = 1 → nums[0] (both ranges would be empty otherwise).</p>`],
    solution: {
      approach: `<p>Reduce the circle to two line problems.</p>`,
      code: `class Solution {
    public int rob(int[] nums) {
        int n = nums.length;
        if (n == 1) return nums[0];
        return Math.max(line(nums, 0, n - 2), line(nums, 1, n - 1));
    }
    private int line(int[] a, int lo, int hi) {
        int prev2 = 0, prev1 = 0;
        for (int i = lo; i <= hi; i++) {
            int cur = Math.max(prev1, prev2 + a[i]);
            prev2 = prev1;
            prev1 = cur;
        }
        return prev1;
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def rob(self, nums):
        def line(houses):                      # plain House Robber on a straight street
            prev2 = prev1 = 0
            for x in houses:
                prev2, prev1 = prev1, max(prev1, prev2 + x)
            return prev1
        if len(nums) == 1:
            return nums[0]
        return max(line(nums[:-1]), line(nums[1:]))   # drop the last house, or the first` }, { lang: 'js', code: `function rob(nums) {
  const n = nums.length;
  if (n === 1) return nums[0];
  const line = (lo, hi) => {                   // plain House Robber on nums[lo..hi]
    let prev2 = 0, prev1 = 0;
    for (let i = lo; i <= hi; i++) [prev2, prev1] = [prev1, Math.max(prev1, prev2 + nums[i])];
    return prev1;
  };
  return Math.max(line(0, n - 2), line(1, n - 1));   // drop the last house, or the first
}` }, { lang: 'cpp', code: `class Solution {
    int line(const vector<int>& a, int lo, int hi) {   // plain House Robber on a[lo..hi]
        int prev2 = 0, prev1 = 0;
        for (int i = lo; i <= hi; i++) {
            int cur = max(prev1, prev2 + a[i]);
            prev2 = prev1;
            prev1 = cur;
        }
        return prev1;
    }
public:
    int rob(vector<int>& nums) {
        int n = nums.size();
        if (n == 1) return nums[0];
        return max(line(nums, 0, n - 2), line(nums, 1, n - 1));   // drop the last house, or the first
    }
};` }],
      dry: { head: ['range', 'houses', 'best'], rows: [['0..n-2', '1 2 3', '4 (1 + 3)'], ['1..n-1', '2 3 1', '3'], ['answer', '', H.c('g', '4')]] },
      complexity: `<p>Time O(n), space O(1).</p>`
    }
  });

  practice.push({
    title: 'Coin Change II (number of combinations)', level: 'Medium', tags: ['dp', 'unbounded knapsack', 'counting'], companies: ['Amazon', 'Google', 'Microsoft'],
    statement: `<p>Given an integer <code>amount</code> and an array of distinct coin denominations (unlimited supply), return the number of <b>combinations</b> that make up that amount. Order does not matter. If no combination works, return 0.</p>`,
    constraints: `1 ≤ coins.length ≤ 300, 1 ≤ coins[i] ≤ 5000, 0 ≤ amount ≤ 5000; answer fits in a signed 32-bit int`,
    example: `<p>amount = 5, coins = [1, 2, 5] → <b>4</b>: 5 · 2+2+1 · 2+1+1+1 · 1+1+1+1+1.</p>`,
    brute: { why: `<p>Recursion choosing "how many of coin i" for each coin in order: exponential in amount/smallest coin. The same (coin index, remaining amount) pair is solved repeatedly.</p>`, code: `int ways(int[] coins, int i, int left) {
    if (left == 0) return 1;
    if (i == coins.length || left < 0) return 0;
    return ways(coins, i, left - coins[i])     // use coin i again
         + ways(coins, i + 1, left);           // move on to the next coin type
}` },
    mcq: { q: 'Which loop order counts each combination exactly once?', options: ['for coin { for a = coin..amount }', 'for a { for coin }', 'Either, they are identical', 'for a = amount down to coin'], answer: 0, explain: 'Coins outer means coin types are added in a fixed order, so each multiset is built once. Amount outer counts orderings (LC 377).' },
    tests: { sig: 'int int[] -> int', fn: 'change', cases: [
      [[5, [1, 2, 5]], 4], [[3, [2]], 0], [[10, [10]], 1], [[0, [7]], 1], [[0, [1, 2]], 1], [[4, [1, 2, 3]], 4],
      [[500, [1, 2, 5]], 12701], [[5000, [5000]], 1],
      // 300 even coins, odd amount: the answer is 0, but the even cells overflow 64 bits along the way
      [[4999, { $range: [2, 602, 2] }], 0]
    ] },
    hints: [`<p>Hint 1: To avoid counting 1+2 and 2+1 twice, decide coin types one at a time in a fixed order.</p>`, `<p>Hint 2: ways[a] += ways[a − c] with coins in the outer loop and amounts going up in the inner loop (unbounded → forwards).</p>`, `<p>Hint 3: ways[0] = 1 (empty combination). amount = 0 → 1. Answer ways[amount].</p>`],
    solution: {
      approach: `<p>1D unbounded counting DP with coins as the outer loop.</p>`,
      code: `class Solution {
    public int change(int amount, int[] coins) {
        int[] ways = new int[amount + 1];
        ways[0] = 1;
        for (int c : coins)
            for (int a = c; a <= amount; a++)
                ways[a] += ways[a - c];
        return ways[amount];
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def change(self, amount, coins):
        ways = [1] + [0] * amount              # one way to make 0: take nothing
        for c in coins:                        # coin types one at a time
            for a in range(c, amount + 1):
                ways[a] += ways[a - c]
        return ways[amount]` }, { lang: 'js', code: `function change(amount, coins) {
  const ways = new Array(amount + 1).fill(0);
  ways[0] = 1;                                 // one way to make 0: take nothing
  for (const c of coins) {                     // coin types one at a time
    for (let a = c; a <= amount; a++) ways[a] += ways[a - c];
  }
  // cells that cannot lead to amount may lose precision past 2^53; the answer itself is exact
  return ways[amount];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int change(int amount, vector<int>& coins) {
        // unsigned arithmetic wraps (defined behaviour); the true answer fits in int,
        // so the wrapped sum still ends on the right value
        vector<unsigned long long> ways(amount + 1, 0);
        ways[0] = 1;                           // one way to make 0: take nothing
        for (int c : coins)                    // coin types one at a time
            for (int a = c; a <= amount; a++)
                ways[a] += ways[a - c];
        return (int) ways[amount];
    }
};` }],
      dry: { head: ['after coin', 'ways[0..5]'], rows: [['(start)', '1 0 0 0 0 0'], ['1', '1 1 1 1 1 1'], ['2', '1 1 2 2 3 3'], ['5', '1 1 2 2 3 ' + H.c('g', '4')]] },
      complexity: `<p>Time O(amount × coins) = 1.5·10<sup>6</sup>; space O(amount).</p>`
    }
  });

  practice.push({
    title: 'Combination Sum IV (ordered sequences)', level: 'Medium', tags: ['dp', 'counting', 'permutations'], companies: ['Google', 'Meta', 'Amazon'],
    statement: `<p>Given an array of <b>distinct</b> positive integers <code>nums</code> and a <code>target</code>, return the number of possible <b>sequences</b> (order matters) of numbers from nums (with repetition) that add up to target.</p>`,
    constraints: `1 ≤ nums.length ≤ 200, 1 ≤ nums[i] ≤ 1000, 1 ≤ target ≤ 1000; answer fits in 32-bit int`,
    example: `<p>nums = [1, 2, 3], target = 4 → <b>7</b>: (1,1,1,1) (1,1,2) (1,2,1) (2,1,1) (2,2) (1,3) (3,1).</p>`,
    brute: { why: `<p>Recursively pick the next number: f(t) = Σ f(t − x). Without memo the tree is exponential; f(1) and f(2) are recomputed in every branch.</p>`, code: `int count(int[] nums, int t) {
    if (t == 0) return 1;
    int total = 0;
    for (int x : nums) if (x <= t) total += count(nums, t - x);
    return total;
}` },
    mcq: { q: 'This is just which earlier problem with arbitrary step sizes?', options: ['Climbing Stairs', '0/1 Knapsack', 'Edit Distance', 'House Robber'], answer: 0, explain: 'ways(t) = Σ ways(t − step) over allowed steps — exactly climbing stairs where steps = nums.' },
    tests: { sig: 'int[] int -> int', fn: 'combinationSum4', cases: [
      [[[1, 2, 3], 4], 7], [[[9], 3], 0], [[[1], 1], 1], [[[2], 4], 1], [[[1, 2], 10], 89],
      [[[1, 2], 45], 1836311903], [[[4, 2, 1], 32], 39882198],
      // 200 even numbers, odd target: the answer is 0, but the even cells get astronomically large
      [[{ $range: [2, 402, 2] }, 999], 0]
    ] },
    hints: [`<p>Hint 1: Think about the LAST number in the sequence. If it is x, the rest is any sequence summing to target − x.</p>`, `<p>Hint 2: dp[t] = Σ dp[t − x] for x in nums, x ≤ t; dp[0] = 1. Loop t outer, nums inner.</p>`, `<p>Hint 3: Intermediate dp values can exceed a 32-bit int (even 64 bits) even when the final answer fits. Cap each cell at the int maximum: a capped cell can never feed an answer that fits. Use a 64-bit integer for the cap in Java and C++ (signed overflow is undefined behaviour in C++); Python ints never overflow; JS numbers are exact only up to 2<sup>53</sup>, so cap there too.</p>`],
    solution: {
      approach: `<p>Amount-outer counting DP (permutations).</p>`,
      code: `class Solution {
    public int combinationSum4(int[] nums, int target) {
        long[] dp = new long[target + 1];
        dp[0] = 1;
        for (int t = 1; t <= target; t++) {
            for (int x : nums) {
                if (x <= t) dp[t] = Math.min(Integer.MAX_VALUE, dp[t] + dp[t - x]); // cap to avoid overflow
            }
        }
        return (int) dp[target];
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def combination_sum4(self, nums, target):
        dp = [1] + [0] * target                # dp[0] = 1: the empty sequence
        for t in range(1, target + 1):
            dp[t] = sum(dp[t - x] for x in nums if x <= t)   # last number is x
        return dp[target]                      # Python ints never overflow` }, { lang: 'js', code: `function combinationSum4(nums, target) {
  const CAP = 2 ** 31 - 1;                     // a capped cell can never feed an answer that fits
  const dp = new Array(target + 1).fill(0);
  dp[0] = 1;                                   // the empty sequence
  for (let t = 1; t <= target; t++) {
    for (const x of nums) {
      if (x <= t) dp[t] = Math.min(CAP, dp[t] + dp[t - x]);   // last number is x
    }
  }
  return dp[target];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int combinationSum4(vector<int>& nums, int target) {
        vector<long long> dp(target + 1, 0);
        dp[0] = 1;                             // the empty sequence
        for (int t = 1; t <= target; t++)
            for (int x : nums)
                if (x <= t) dp[t] = min<long long>(INT_MAX, dp[t] + dp[t - x]);   // cap: no overflow
        return (int) dp[target];
    }
};` }],
      dry: { head: ['t', 'dp[t-1]', 'dp[t-2]', 'dp[t-3]', 'dp[t]'], rows: [['1', '1', '—', '—', '1'], ['2', '1', '1', '—', '2'], ['3', '2', '1', '1', '4'], ['4', '4', '2', '1', H.c('g', '7')]] },
      complexity: `<p>Time O(target × n) = 2·10<sup>5</sup>; space O(target).</p>`,
      followUps: ['Negative numbers allowed? Then infinitely many sequences may exist — you must cap the length.']
    }
  });

  practice.push({
    title: 'Partition Equal Subset Sum', level: 'Medium', tags: ['dp', '0/1 knapsack', 'subset sum'], companies: ['Amazon', 'Meta', 'Microsoft', 'Uber'],
    statement: `<p>Given an array of positive integers, return true if it can be split into two subsets with equal sums.</p>`,
    constraints: `1 ≤ n ≤ 200, 1 ≤ nums[i] ≤ 100`,
    example: `<p>[1, 5, 11, 5] → <b>true</b> (${H.c('g', '1 + 5 + 5 = 11')} and 11). [1, 2, 3, 5] → <b>false</b> (total 11 is odd).</p>`,
    brute: { why: `<p>Try all 2<sup>n</sup> subsets for one with sum total/2. n = 200 → 2<sup>200</sup>. But the only thing that matters after looking at some numbers is "which sums are reachable" — at most total/2 + 1 ≤ 10 001 values.</p>`, code: `boolean can(int[] a, int i, int left) {
    if (left == 0) return true;
    if (i == a.length || left < 0) return false;
    return can(a, i + 1, left - a[i]) || can(a, i + 1, left);
}` },
    mcq: { q: 'The total is 23. What do you return?', options: ['false immediately', 'Run subset sum for 11', 'Run subset sum for 12', 'true'], answer: 0, explain: 'Two equal integer halves need an even total.' },
    tests: { sig: 'int[] -> bool', fn: 'canPartition', cases: [
      [[[1, 5, 11, 5]], true], [[[1, 2, 3, 5]], false], [[[1]], false], [[[2, 2]], true], [[[1, 1, 1, 1]], true],
      [[[3, 3, 3, 4, 5]], true], [[[2, 2, 3, 5]], false],
      [[{ $rep: 100, n: 200 }], true], [[{ $concat: [{ $rep: 100, n: 199 }, [98]] }], false]
    ] },
    hints: [`<p>Hint 1: If two halves are equal, each is total/2. So the question is "is there a subset with sum total/2?"</p>`, `<p>Hint 2: Boolean 0/1 knapsack: can[s] |= can[s − x], looping s from target down to x (each number once).</p>`, `<p>Hint 3: Odd total → false. can[0] = true. Early exit as soon as can[target] becomes true.</p>`],
    solution: {
      approach: `<p>Subset-sum DP over reachable sums, backward loop.</p>`,
      code: `class Solution {
    public boolean canPartition(int[] nums) {
        int total = 0;
        for (int x : nums) total += x;
        if (total % 2 == 1) return false;
        int target = total / 2;
        boolean[] can = new boolean[target + 1];
        can[0] = true;
        for (int x : nums) {
            for (int s = target; s >= x; s--) {        // backwards: each number once
                can[s] = can[s] || can[s - x];
            }
            if (can[target]) return true;
        }
        return can[target];
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def can_partition(self, nums):
        total = sum(nums)
        if total % 2:
            return False                       # odd total: no equal halves
        target = total // 2
        reach = 1                              # bit s set = some subset sums to s (bitset)
        for x in nums:
            reach |= reach << x                # take x or not, each number once
        return (reach >> target) & 1 == 1` }, { lang: 'js', code: `function canPartition(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % 2 === 1) return false;           // odd total: no equal halves
  const target = total / 2;
  const can = new Uint8Array(target + 1);
  can[0] = 1;                                  // empty subset makes 0
  for (const x of nums) {
    for (let s = target; s >= x; s--) {        // backwards: each number once
      if (can[s - x]) can[s] = 1;
    }
    if (can[target]) return true;
  }
  return can[target] === 1;
}` }, { lang: 'cpp', code: `class Solution {
public:
    bool canPartition(vector<int>& nums) {
        int total = accumulate(nums.begin(), nums.end(), 0);
        if (total % 2 == 1) return false;      // odd total: no equal halves
        bitset<10001> reach;                   // bit s = some subset sums to s
        reach[0] = 1;
        for (int x : nums) reach |= reach << x;   // take x or not, each number once
        return reach[total / 2];
    }
};` }],
      dry: { head: ['after x', 'reachable sums ≤ 11'], rows: [['1', '{0, 1}'], ['5', '{0, 1, 5, 6}'], ['11', '{0, 1, 5, 6, ' + H.c('g', '11') + '} → true']] },
      complexity: `<p>Time O(n × total/2) ≤ 200 × 10 000 = 2·10<sup>6</sup>; space O(total). BitSet version: O(n·total/64).</p>`
    }
  });

  practice.push({
    title: 'Target Sum', level: 'Medium', tags: ['dp', '0/1 knapsack', 'counting'], companies: ['Meta', 'Google', 'Amazon'],
    statement: `<p>Given an integer array <code>nums</code> and an integer <code>target</code>, put a '+' or '−' before each number and concatenate them into an expression. Return the number of different expressions that evaluate to target.</p>`,
    constraints: `1 ≤ n ≤ 20, 0 ≤ nums[i] ≤ 1000, sum(nums) ≤ 1000, −1000 ≤ target ≤ 1000`,
    example: `<p>[1, 1, 1, 1, 1], target 3 → <b>5</b> (choose which single 1 gets the minus sign).</p>`,
    brute: { why: `<p>2<sup>n</sup> sign assignments: for n = 20 that is ~10<sup>6</sup> — actually feasible, which is why the follow-up asks for the DP: with sum ≤ 1000 the DP is ~2·10<sup>4</sup> steps and scales to larger n.</p>`, code: `int count(int[] a, int i, int sum, int target) {
    if (i == a.length) return sum == target ? 1 : 0;
    return count(a, i + 1, sum + a[i], target) + count(a, i + 1, sum - a[i], target);
}` },
    mcq: { q: 'With P = sum of "+" numbers and total = sum of all, which is true?', options: ['P = (total + target) / 2', 'P = total − target', 'P = target / 2', 'P = total'], answer: 0, explain: 'P − (total − P) = target ⇒ 2P = total + target.' },
    tests: { sig: 'int[] int -> int', fn: 'findTargetSumWays', cases: [
      [[[1, 1, 1, 1, 1], 3], 5], [[[1], 1], 1], [[[1], 2], 0], [[[0, 0, 0], 0], 8], [[[1, 0], 1], 2],
      [[[1000], -1000], 1], [[[2, 3], 0], 0],
      [[{ $rep: 0, n: 20 }, 0], 1048576], [[{ $rep: 50, n: 20 }, 1000], 1], [[{ $rep: 50, n: 20 }, 0], 184756]
    ] },
    hints: [`<p>Hint 1: Split the numbers into a plus group P and a minus group. Write an equation linking P, total and target.</p>`, `<p>Hint 2: P = (total + target)/2 → count subsets with that sum: ways[s] += ways[s − x], s going down.</p>`, `<p>Hint 3: If total + target is odd or |target| &gt; total → 0. Zeros are handled naturally: each 0 doubles the count (both signs).</p>`],
    solution: {
      approach: `<p>Algebra turns signs into a subset-count problem → counting 0/1 knapsack.</p>`,
      code: `class Solution {
    public int findTargetSumWays(int[] nums, int target) {
        int total = 0;
        for (int x : nums) total += x;
        if (Math.abs(target) > total || (total + target) % 2 != 0) return 0;
        int p = (total + target) / 2;
        int[] ways = new int[p + 1];
        ways[0] = 1;
        for (int x : nums)
            for (int s = p; s >= x; s--)               // each number used once
                ways[s] += ways[s - x];
        return ways[p];
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def find_target_sum_ways(self, nums, target):
        total = sum(nums)
        if abs(target) > total or (total + target) % 2:
            return 0
        p = (total + target) // 2              # sum of the "+" group
        ways = [1] + [0] * p
        for x in nums:
            for s in range(p, x - 1, -1):      # each number used once
                ways[s] += ways[s - x]
        return ways[p]` }, { lang: 'js', code: `function findTargetSumWays(nums, target) {
  const total = nums.reduce((a, b) => a + b, 0);
  if (Math.abs(target) > total || (total + target) % 2 !== 0) return 0;
  const p = (total + target) / 2;              // sum of the "+" group
  const ways = new Array(p + 1).fill(0);
  ways[0] = 1;
  for (const x of nums) {
    for (let s = p; s >= x; s--) ways[s] += ways[s - x];   // each number used once
  }
  return ways[p];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int findTargetSumWays(vector<int>& nums, int target) {
        int total = accumulate(nums.begin(), nums.end(), 0);
        if (abs(target) > total || (total + target) % 2 != 0) return 0;
        int p = (total + target) / 2;          // sum of the "+" group
        vector<int> ways(p + 1, 0);
        ways[0] = 1;
        for (int x : nums)
            for (int s = p; s >= x; s--) ways[s] += ways[s - x];   // each number used once
        return ways[p];                        // at most 2^20, fits in int
    }
};` }],
      dry: { head: ['after x', 'ways[0..4]'], rows: [['1', '1 1 0 0 0'], ['1', '1 2 1 0 0'], ['1', '1 3 3 1 0'], ['1', '1 4 6 4 1'], ['1', '1 5 10 10 ' + H.c('g', '5')]] },
      complexity: `<p>Time O(n × P), space O(P).</p>`
    }
  });

  practice.push({
    title: 'Perfect Squares', level: 'Medium', tags: ['dp', 'unbounded knapsack', 'min'], companies: ['Google', 'Amazon', 'Adobe'],
    statement: `<p>Given an integer <code>n</code>, return the least number of perfect square numbers (1, 4, 9, 16, …) that sum to n.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>4</sup>`,
    example: `<p>n = 12 → <b>3</b> (${H.c('g', '4 + 4 + 4')}); greedy 9 + 1 + 1 + 1 uses ${H.c('r', '4')}. n = 13 → <b>2</b> (4 + 9).</p>`,
    brute: { why: `<p>Recursion over "which square is last" without memo is exponential; f(k) for small k is recomputed many times.</p>`, code: `int f(int n) {
    if (n == 0) return 0;
    int best = Integer.MAX_VALUE;
    for (int s = 1; s * s <= n; s++) best = Math.min(best, 1 + f(n - s * s));
    return best;
}` },
    mcq: { q: 'This is coin change (min coins) with which coins?', options: ['All perfect squares ≤ n', 'Only 1 and 4', 'All primes', 'Powers of two'], answer: 0, explain: 'Each square can be reused any number of times — unbounded min-coin DP.' },
    tests: { sig: 'int -> int', fn: 'numSquares', cases: [
      [[1], 1], [[2], 2], [[3], 3], [[4], 1], [[7], 4], [[12], 3], [[13], 2], [[43], 3], [[9999], 4], [[10000], 1]
    ] },
    hints: [`<p>Hint 1: Treat each perfect square as a coin you may use any number of times.</p>`, `<p>Hint 2: dp[a] = 1 + min dp[a − s²] for all s² ≤ a; dp[0] = 0.</p>`, `<p>Hint 3: There are only √n coins, so O(n√n) ≈ 10<sup>6</sup>. (Math follow-up: Lagrange — every number is a sum of at most 4 squares.)</p>`],
    solution: {
      approach: `<p>Unbounded min DP over amounts with square "coins".</p>`,
      code: `class Solution {
    public int numSquares(int n) {
        int[] dp = new int[n + 1];
        Arrays.fill(dp, Integer.MAX_VALUE);
        dp[0] = 0;
        for (int a = 1; a <= n; a++)
            for (int s = 1; s * s <= a; s++)
                dp[a] = Math.min(dp[a], dp[a - s * s] + 1);   // dp[a - s*s] is always finite (1 is a square)
        return dp[n];
    }
}`,
      alt: [{ lang: 'python', code: `import math

class Solution:
    def num_squares(self, n: int) -> int:
        squares = [s * s for s in range(1, math.isqrt(n) + 1)]   # the "coins"
        dp = [0] + [n] * n                     # n ones always work, so n is a safe "infinity"
        for a in range(1, n + 1):
            for sq in squares:
                if sq > a:
                    break
                if dp[a - sq] + 1 < dp[a]:
                    dp[a] = dp[a - sq] + 1
        return dp[n]` }, { lang: 'js', code: `function numSquares(n) {
  const dp = new Array(n + 1).fill(n);         // n ones always work, so n is a safe "infinity"
  dp[0] = 0;
  for (let a = 1; a <= n; a++) {
    for (let s = 1; s * s <= a; s++) dp[a] = Math.min(dp[a], dp[a - s * s] + 1);
  }
  return dp[n];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int numSquares(int n) {
        vector<int> dp(n + 1, n);              // n ones always work, so n is a safe "infinity"
        dp[0] = 0;
        for (int a = 1; a <= n; a++)
            for (int s = 1; s * s <= a; s++) dp[a] = min(dp[a], dp[a - s * s] + 1);
        return dp[n];
    }
};` }],
      dry: { head: ['a', 'options', 'dp[a]'], rows: [['4', 'dp[3]+1 = 4, dp[0]+1 = 1', '1'], ['8', 'dp[7]+1 = 5, dp[4]+1 = 2', '2'], ['12', 'dp[11]+1 = 4, dp[8]+1 = 3, dp[3]+1 = 4', H.c('g', '3')]] },
      complexity: `<p>Time O(n√n), space O(n).</p>`
    }
  });

  practice.push({
    title: 'Longest Palindromic Subsequence', level: 'Medium', tags: ['dp', 'lcs', 'strings'], companies: ['Amazon', 'LinkedIn', 'Uber'],
    statement: `<p>Given a string <code>s</code>, return the length of its longest palindromic subsequence.</p>`,
    constraints: `1 ≤ s.length ≤ 1000, lowercase letters`,
    example: `<p>"bbbab" → <b>4</b> ("bbbb"). "cbbd" → <b>2</b> ("bb").</p>`,
    brute: { why: `<p>Check all 2<sup>n</sup> subsequences for being a palindrome — impossible for n = 1000. The answer for a middle part s[i..j] is needed by many outer parts.</p>`, code: `int lps(String s, int i, int j) {
    if (i > j) return 0;
    if (i == j) return 1;
    if (s.charAt(i) == s.charAt(j)) return 2 + lps(s, i + 1, j - 1);
    return Math.max(lps(s, i + 1, j), lps(s, i, j - 1));
}` },
    mcq: { q: 'Which reduction gives the LPS length?', options: ['LCS(s, reverse(s))', 'Edit distance(s, reverse(s))', 'Longest common substring of s and reverse(s)', 'n − number of distinct letters'], answer: 0, explain: 'A palindromic subsequence is common to s and its reverse; the LCS of the two has the max length.' },
    tests: { sig: 'string -> int', fn: 'longestPalindromeSubseq', cases: [
      [['bbbab'], 4], [['cbbd'], 2], [['a'], 1], [['ab'], 1], [['aaaa'], 4], [['abcde'], 1], [['agbdba'], 5],
      [[{ $rep: 'a', n: 1000 }], 1000], [[{ $rep: 'ab', n: 500 }], 999]
    ] },
    hints: [`<p>Hint 1: A palindrome reads the same forwards and backwards. What is common between s and reverse(s)?</p>`, `<p>Hint 2: Answer = LCS(s, reverse(s)) using the standard O(n²) table (two rows enough).</p>`, `<p>Hint 3: Alternative interval DP: dp[i][j] = 2 + dp[i+1][j−1] if s[i] == s[j], else max(dp[i+1][j], dp[i][j−1]); fill i from n−1 down.</p>`],
    solution: {
      approach: `<p>LCS of s with its reverse, two rolling rows.</p>`,
      code: `class Solution {
    public int longestPalindromeSubseq(String s) {
        String t = new StringBuilder(s).reverse().toString();
        int n = s.length();
        int[] prev = new int[n + 1], cur = new int[n + 1];
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= n; j++) {
                if (s.charAt(i - 1) == t.charAt(j - 1)) cur[j] = prev[j - 1] + 1;
                else cur[j] = Math.max(prev[j], cur[j - 1]);
            }
            int[] tmp = prev; prev = cur; cur = tmp;
        }
        return prev[n];
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def longest_palindrome_subseq(self, s: str) -> int:
        t = s[::-1]                            # LPS(s) = LCS(s, reverse(s))
        n = len(s)
        prev = [0] * (n + 1)
        for a in s:
            cur = [0] * (n + 1)
            for j in range(1, n + 1):
                cur[j] = prev[j - 1] + 1 if a == t[j - 1] else max(prev[j], cur[j - 1])
            prev = cur
        return prev[n]` }, { lang: 'js', code: `function longestPalindromeSubseq(s) {
  const t = [...s].reverse().join('');         // LPS(s) = LCS(s, reverse(s))
  const n = s.length;
  let prev = new Int32Array(n + 1), cur = new Int32Array(n + 1);
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= n; j++) {
      cur[j] = s[i - 1] === t[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int longestPalindromeSubseq(string s) {
        string t(s.rbegin(), s.rend());        // LPS(s) = LCS(s, reverse(s))
        int n = s.size();
        vector<int> prev(n + 1, 0), cur(n + 1, 0);
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= n; j++)
                cur[j] = s[i - 1] == t[j - 1] ? prev[j - 1] + 1 : max(prev[j], cur[j - 1]);
            swap(prev, cur);                   // O(1): swaps the buffers, no copy
        }
        return prev[n];
    }
};` }],
      dry: { head: ['s', 'reverse', 'LCS'], rows: [['bbbab', 'babbb', H.c('g', 'bbbb → 4')], ['cbbd', 'dbbc', 'bb → 2']] },
      complexity: `<p>Time O(n²) = 10<sup>6</sup>, space O(n).</p>`,
      followUps: ['Minimum insertions to make s a palindrome = n − LPS (see Hard practice).']
    }
  });

  practice.push({
    title: 'Triangle (minimum path)', level: 'Medium', tags: ['dp', 'grid dp', 'bottom-up'], companies: ['Amazon', 'Apple', 'Bloomberg'],
    statement: `<p>Given a triangle array, return the minimum path sum from top to bottom. From index j in one row you may move to index j or j+1 in the next row.</p>`,
    constraints: `1 ≤ rows ≤ 200, −10<sup>4</sup> ≤ value ≤ 10<sup>4</sup>; follow-up: O(rows) extra space`,
    example: `<p>[[2], [3,4], [6,5,7], [4,1,8,3]] → <b>11</b> (${H.c('g', '2 + 3 + 5 + 1')}).</p>`,
    brute: { why: `<p>Every path makes a left/right choice per row → 2<sup>rows−1</sup> paths ≈ 10<sup>60</sup> for 200 rows. The best path from any middle cell to the bottom is recomputed for each path reaching it.</p>`, code: `int best(List<List<Integer>> t, int i, int j) {
    if (i == t.size()) return 0;
    return t.get(i).get(j) + Math.min(best(t, i + 1, j), best(t, i + 1, j + 1));
}` },
    mcq: { q: 'Why is bottom-up nicer than top-down here?', options: ['No edge cases: every cell has exactly two children below, and the answer ends in one cell', 'It uses less time asymptotically', 'Top-down is wrong', 'Negative numbers break top-down'], answer: 0, explain: 'Going up, dp[j] = val + min(dp[j], dp[j+1]) works for every cell, and the final answer is dp[0].' },
    tests: { sig: 'list<list<int>> -> int', fn: 'minimumTotal', cases: [
      [[[[2], [3, 4], [6, 5, 7], [4, 1, 8, 3]]], 11], [[[[-10]]], -10], [[[[1], [2, 3]]], 3],
      [[[[-1], [2, 3], [1, -1, -3]]], -1], [[[[0], [0, 0]]], 0],
      // 200 rows of -10000: every path has 200 cells, so -2 000 000
      [[Array.from({ length: 200 }, (_, i) => ({ $rep: -10000, n: i + 1 }))], -2000000],
      [[Array.from({ length: 200 }, (_, i) => ({ $rep: 10000, n: i + 1 }))], 2000000]
    ] },
    hints: [`<p>Hint 1: The best path from a cell to the bottom depends only on the two cells below it.</p>`, `<p>Hint 2: Start from the bottom row and move up: dp[j] = tri[i][j] + min(dp[j], dp[j+1]).</p>`, `<p>Hint 3: Use an array of size rows + 1 filled with 0 so the bottom row needs no special case; answer dp[0].</p>`],
    solution: {
      approach: `<p>Bottom-up DP in one array.</p>`,
      code: `class Solution {
    public int minimumTotal(List<List<Integer>> triangle) {
        int n = triangle.size();
        int[] dp = new int[n + 1];                     // zeros below the last row
        for (int i = n - 1; i >= 0; i--)
            for (int j = 0; j <= i; j++)
                dp[j] = triangle.get(i).get(j) + Math.min(dp[j], dp[j + 1]);
        return dp[0];
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def minimum_total(self, triangle):
        dp = [0] * (len(triangle) + 1)         # zeros below the last row
        for row in reversed(triangle):         # bottom-up
            for j, v in enumerate(row):
                dp[j] = v + min(dp[j], dp[j + 1])
        return dp[0]` }, { lang: 'js', code: `function minimumTotal(triangle) {
  const n = triangle.length;
  const dp = new Array(n + 1).fill(0);         // zeros below the last row
  for (let i = n - 1; i >= 0; i--) {           // bottom-up
    for (let j = 0; j <= i; j++) dp[j] = triangle[i][j] + Math.min(dp[j], dp[j + 1]);
  }
  return dp[0];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int minimumTotal(vector<vector<int>>& triangle) {
        int n = triangle.size();
        vector<int> dp(n + 1, 0);              // zeros below the last row
        for (int i = n - 1; i >= 0; i--)       // bottom-up
            for (int j = 0; j <= i; j++) dp[j] = triangle[i][j] + min(dp[j], dp[j + 1]);
        return dp[0];
    }
};` }],
      dry: { head: ['row', 'dp after processing'], rows: [['4 1 8 3', '4 1 8 3'], ['6 5 7', '7 6 10'], ['3 4', '9 10'], ['2', H.c('g', '11')]] },
      complexity: `<p>Time O(rows²), space O(rows).</p>`
    }
  });

  // =====================================================================
  // PRACTICE — Hard
  // =====================================================================
  practice.push({
    title: 'Distinct Subsequences', level: 'Hard', tags: ['dp', 'strings', 'counting'], companies: ['Google', 'Amazon', 'Bloomberg'],
    statement: `<p>Given strings <code>s</code> and <code>t</code>, return the number of distinct subsequences of s that equal t (different index choices count separately).</p>`,
    constraints: `1 ≤ s.length, t.length ≤ 1000; answer fits in a 32-bit signed int`,
    example: `<p>s = "rabbbit", t = "rabbit" → <b>3</b>: choose which one of the three b's to drop.</p>`,
    brute: { why: `<p>Enumerate all 2<sup>|s|</sup> subsequences of s and compare with t — impossible for |s| = 1000. The count for "suffix of s from i matching suffix of t from j" is needed again and again.</p>`, code: `int count(String s, String t, int i, int j) {
    if (j == t.length()) return 1;                  // matched all of t
    if (i == s.length()) return 0;                  // ran out of s
    int res = count(s, t, i + 1, j);                // do not use s[i]
    if (s.charAt(i) == t.charAt(j)) res += count(s, t, i + 1, j + 1);   // use s[i] for t[j]
    return res;
}` },
    mcq: { q: 'dp[i][j] = ways to form t[0..j−1] from s[0..i−1]. If s[i−1] == t[j−1], dp[i][j] = ?', options: ['dp[i−1][j] + dp[i−1][j−1]', 'dp[i−1][j−1] only', 'max(dp[i−1][j], dp[i][j−1])', 'dp[i][j−1] + 1'], answer: 0, explain: 'Either ignore s[i−1] (dp[i−1][j]) or use it to match t[j−1] (dp[i−1][j−1]). Counting → add.' },
    tests: { sig: 'string string -> int', fn: 'numDistinct', cases: [
      [['rabbbit', 'rabbit'], 3], [['babgbag', 'bag'], 5], [['a', 'a'], 1], [['a', 'b'], 0], [['abc', 'abcd'], 0],
      [['aaa', 'a'], 3],
      // C(1000, 998) = 499500, while middle cells reach C(1000, 500), far past 64 bits
      [[{ $rep: 'a', n: 1000 }, { $rep: 'a', n: 998 }], 499500],
      [[{ $rep: 'a', n: 1000 }, { $concat: [{ $rep: 'a', n: 500 }, 'c'] }], 0]
    ] },
    hints: [`<p>Hint 1: Same prefix-grid as LCS, but you <b>count</b> ways instead of maximising. Look at s's last character.</p>`, `<p>Hint 2: dp[i][j] = dp[i−1][j] (skip s[i−1]) + (s[i−1] == t[j−1] ? dp[i−1][j−1] : 0). Base dp[i][0] = 1 (empty t), dp[0][j&gt;0] = 0.</p>`, `<p>Hint 3: One array over j, updated from j = m down to 1 so dp[j−1] is still the previous row. Intermediate values can exceed even 64 bits when the answer fits, so cap each cell at the int maximum (a capped cell never feeds an answer that fits); Python ints never overflow.</p>`],
    solution: {
      approach: `<p>Counting DP on prefixes, compressed into one array iterated right-to-left.</p>`,
      code: `class Solution {
    public int numDistinct(String s, String t) {
        int m = t.length();
        long[] dp = new long[m + 1];
        dp[0] = 1;                                   // empty t: one way (pick nothing)
        for (int i = 1; i <= s.length(); i++) {
            char c = s.charAt(i - 1);
            for (int j = Math.min(i, m); j >= 1; j--) {   // backwards: dp[j-1] is still row i-1
                if (c == t.charAt(j - 1)) dp[j] += dp[j - 1];
            }
        }
        return (int) dp[m];
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def num_distinct(self, s: str, t: str) -> int:
        m = len(t)
        dp = [1] + [0] * m                     # empty t: one way (pick nothing)
        for i, c in enumerate(s, 1):
            for j in range(min(i, m), 0, -1):  # backwards: dp[j-1] is still row i-1
                if c == t[j - 1]:
                    dp[j] += dp[j - 1]
        return dp[m]                           # Python ints never overflow` }, { lang: 'js', code: `function numDistinct(s, t) {
  const m = t.length, CAP = 2 ** 31 - 1;       // a capped cell can never feed an answer that fits
  const dp = new Array(m + 1).fill(0);
  dp[0] = 1;                                   // empty t: one way (pick nothing)
  for (let i = 1; i <= s.length; i++) {
    const c = s[i - 1];
    for (let j = Math.min(i, m); j >= 1; j--) {   // backwards: dp[j-1] is still row i-1
      if (c === t[j - 1]) dp[j] = Math.min(CAP, dp[j] + dp[j - 1]);
    }
  }
  return dp[m];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int numDistinct(string s, string t) {
        int m = t.size();
        vector<long long> dp(m + 1, 0);
        dp[0] = 1;                             // empty t: one way (pick nothing)
        for (size_t i = 1; i <= s.size(); i++) {
            char c = s[i - 1];
            for (int j = min((int) i, m); j >= 1; j--)   // backwards: dp[j-1] is still row i-1
                if (c == t[j - 1]) dp[j] = min<long long>(INT_MAX, dp[j] + dp[j - 1]);   // cap: no overflow
        }
        return (int) dp[m];
    }
};` }],
      dry: { head: ['s char', 'dp over t = "" r a b b i t'], rows: [['r', '1 1 0 0 0 0 0'], ['a', '1 1 1 0 0 0 0'], ['b', '1 1 1 1 0 0 0'], ['b', '1 1 1 2 1 0 0'], ['b', '1 1 1 3 3 0 0'], ['i', '1 1 1 3 3 3 0'], ['t', '1 1 1 3 3 3 ' + H.c('g', '3')]] },
      complexity: `<p>Time O(|s|·|t|) = 10<sup>6</sup>; space O(|t|).</p>`
    }
  });

  practice.push({
    title: 'Shortest Common Supersequence', level: 'Hard', tags: ['dp', 'lcs', 'reconstruction'], companies: ['Google', 'Amazon', 'Microsoft'],
    statement: `<p>Given strings <code>str1</code> and <code>str2</code>, return the shortest string that has both as subsequences. If several exist, return any.</p>`,
    constraints: `1 ≤ str1.length, str2.length ≤ 1000, lowercase letters`,
    example: `<p>str1 = "abac", str2 = "cab" → <b>"cabac"</b> (length 5 = 4 + 3 − LCS("ab") 2).</p>`,
    brute: { why: `<p>Try candidate strings in increasing length and test both subsequence conditions — the number of candidates is 26<sup>L</sup>. Hopeless; the structure is entirely determined by an LCS.</p>`, code: `boolean isSubseq(String small, String big) {
    int i = 0;
    for (int j = 0; j < big.length() && i < small.length(); j++)
        if (small.charAt(i) == big.charAt(j)) i++;
    return i == small.length();     // brute force would call this on 26^L candidates
}` },
    mcq: { q: 'Length of the shortest common supersequence?', options: ['n + m − LCS', 'n + m', 'max(n, m)', 'LCS'], answer: 0, explain: 'Shared LCS characters are written once; every other character of both strings must appear.' },
    // any shortest answer is accepted: check the length and that both strings are subsequences of the output
    tests: { sig: 'string string -> string', fn: 'shortestCommonSupersequence', check: '(args, out, exp) => { const sub = (a, b) => { let i = 0; for (const ch of b) if (i < a.length && a[i] === ch) i++; return i === a.length; }; return typeof out === "string" && out.length === exp.length && sub(args[0], out) && sub(args[1], out); }', cases: [
      [['abac', 'cab'], 'cabac'], [['aaaaaaaa', 'aaaaaaaa'], 'aaaaaaaa'], [['a', 'b'], 'ab'], [['abc', 'abc'], 'abc'],
      [['geek', 'eke'], 'geeke'], [['bbbaaaba', 'bbababbb'], 'bbabaaababb'],
      [[{ $rep: 'a', n: 1000 }, { $rep: 'b', n: 1000 }], { $concat: [{ $rep: 'a', n: 1000 }, { $rep: 'b', n: 1000 }] }],
      [[{ $rep: 'ab', n: 500 }, { $rep: 'ba', n: 500 }], { $concat: ['b', { $rep: 'ab', n: 500 }] }]
    ] },
    hints: [`<p>Hint 1: Characters in the LCS can be shared; all the others must be written separately. So length = n + m − LCS.</p>`, `<p>Hint 2: Build the LCS table, then walk back from (n, m): on match emit the char and go diagonal; otherwise emit the char of the direction you leave (the bigger neighbour) and move.</p>`, `<p>Hint 3: When one index reaches 0, emit the remaining prefix of the other string. Reverse the result at the end.</p>`],
    solution: {
      approach: `<p>LCS table + reconstruction that also emits the non-LCS characters in order.</p>`,
      code: `class Solution {
    public String shortestCommonSupersequence(String a, String b) {
        int n = a.length(), m = b.length();
        int[][] dp = new int[n + 1][m + 1];
        for (int i = 1; i <= n; i++)
            for (int j = 1; j <= m; j++)
                dp[i][j] = a.charAt(i - 1) == b.charAt(j - 1) ? dp[i - 1][j - 1] + 1
                                                              : Math.max(dp[i - 1][j], dp[i][j - 1]);
        StringBuilder sb = new StringBuilder();
        int i = n, j = m;
        while (i > 0 && j > 0) {
            if (a.charAt(i - 1) == b.charAt(j - 1)) { sb.append(a.charAt(i - 1)); i--; j--; }   // shared
            else if (dp[i - 1][j] >= dp[i][j - 1]) { sb.append(a.charAt(i - 1)); i--; }         // only in a
            else { sb.append(b.charAt(j - 1)); j--; }                                           // only in b
        }
        while (i > 0) sb.append(a.charAt(--i));
        while (j > 0) sb.append(b.charAt(--j));
        return sb.reverse().toString();
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def shortest_common_supersequence(self, a: str, b: str) -> str:
        n, m = len(a), len(b)
        dp = [[0] * (m + 1) for _ in range(n + 1)]     # LCS table
        for i in range(1, n + 1):
            for j in range(1, m + 1):
                dp[i][j] = dp[i - 1][j - 1] + 1 if a[i - 1] == b[j - 1] else max(dp[i - 1][j], dp[i][j - 1])
        out, i, j = [], n, m
        while i and j:
            if a[i - 1] == b[j - 1]:
                out.append(a[i - 1]); i -= 1; j -= 1   # shared
            elif dp[i - 1][j] >= dp[i][j - 1]:
                out.append(a[i - 1]); i -= 1           # only in a
            else:
                out.append(b[j - 1]); j -= 1           # only in b
        out.extend(reversed(a[:i]))                    # leftovers (built backwards)
        out.extend(reversed(b[:j]))
        return "".join(reversed(out))` }, { lang: 'js', code: `function shortestCommonSupersequence(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));   // LCS table
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const out = [];
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { out.push(a[i - 1]); i--; j--; }        // shared
    else if (dp[i - 1][j] >= dp[i][j - 1]) out.push(a[--i]);           // only in a
    else out.push(b[--j]);                                             // only in b
  }
  while (i > 0) out.push(a[--i]);
  while (j > 0) out.push(b[--j]);
  return out.reverse().join('');               // join once: no O(n^2) string building
}` }, { lang: 'cpp', code: `class Solution {
public:
    string shortestCommonSupersequence(string a, string b) {
        int n = a.size(), m = b.size();
        vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));   // LCS table
        for (int i = 1; i <= n; i++)
            for (int j = 1; j <= m; j++)
                dp[i][j] = a[i - 1] == b[j - 1] ? dp[i - 1][j - 1] + 1 : max(dp[i - 1][j], dp[i][j - 1]);
        string out;
        int i = n, j = m;
        while (i > 0 && j > 0) {
            if (a[i - 1] == b[j - 1]) { out += a[i - 1]; i--; j--; }     // shared
            else if (dp[i - 1][j] >= dp[i][j - 1]) out += a[--i];        // only in a
            else out += b[--j];                                          // only in b
        }
        while (i > 0) out += a[--i];
        while (j > 0) out += b[--j];
        reverse(out.begin(), out.end());
        return out;
    }
};` }],
      dry: { head: ['(i, j)', 'compare', 'action', 'emitted so far (backwards)'], rows: [['(4,3)', 'c vs b', 'up ≥ left → emit c', 'c'], ['(3,3)', 'a vs b', 'up ≥ left → emit a', 'ca'], ['(2,3)', 'b vs b', 'match → emit b', 'cab'], ['(1,2)', 'a vs a', 'match → emit a', 'caba'], ['(0,1)', '—', 'emit rest of str2: c', 'cabac'], ['done', '', 'reverse', H.c('g', '"cabac"')]] },
      complexity: `<p>Time O(n·m), space O(n·m) for reconstruction.</p>`,
      followUps: ['Prove the result has length n + m − LCS.', 'Return the lexicographically smallest SCS (needs more careful tie-breaking).']
    }
  });

  practice.push({
    title: 'Dungeon Game', level: 'Hard', tags: ['dp', 'grid dp', 'backward dp'], companies: ['Google', 'Microsoft', 'Amazon'],
    statement: `<p>A knight starts at the top-left of a dungeon grid and must reach the princess at the bottom-right, moving only right or down. Each cell adds (positive) or removes (negative) health. If health ever drops to 0 or below, the knight dies. Return the minimum initial health needed.</p>`,
    constraints: `1 ≤ m, n ≤ 200, −1000 ≤ dungeon[i][j] ≤ 1000`,
    example: `<p>[[−2, −3, 3], [−5, −10, 1], [10, 30, −5]] → <b>7</b>. Path right → right → down → down: 7 − 2 − 3 + 3 + 1 − 5 = 1, never ≤ 0 along the way.</p>`,
    brute: { why: `<p>Try every path (C(m+n−2, m−1)) and compute the health it needs (1 − minimum prefix sum). Exponential, and a forward DP needs two numbers per cell (current health and lowest point) that conflict — so the naive forward table is wrong, not just slow.</p>`, code: `int need(int[][] d, int r, int c) {
    int m = d.length, n = d[0].length;
    if (r == m - 1 && c == n - 1) return Math.max(1, 1 - d[r][c]);
    int best = Integer.MAX_VALUE;
    if (r + 1 < m) best = Math.min(best, need(d, r + 1, c));
    if (c + 1 < n) best = Math.min(best, need(d, r, c + 1));
    return Math.max(1, best - d[r][c]);          // exponential without memo
}` },
    mcq: { q: 'Why fill this grid from the bottom-right?', options: ['Because "minimum health needed from here on" is a single number that depends only on the future', 'Because it is faster', 'Because the start cell is negative', 'It does not matter'], answer: 0, explain: 'Forward you must track both current health and the worst dip; backward one number (health needed on entering) captures everything.' },
    tests: { sig: 'int[][] -> int', fn: 'calculateMinimumHP', cases: [
      [[[[-2, -3, 3], [-5, -10, 1], [10, 30, -5]]], 7], [[[[0]]], 1], [[[[100]]], 1], [[[[-200]]], 201],
      [[[[1, -3, 3], [0, -2, 0], [-3, -3, -3]]], 3], [[[[0, 0, 0], [1, 1, -1]]], 1], [[[[-3, 5]]], 4],
      [[[[2], [-5], [1]]], 4],
      [[{ $rep: new Array(200).fill(-1000), n: 200 }], 399001],
      [[{ $rep: new Array(200).fill(1000), n: 200 }], 1]
    ] },
    hints: [`<p>Hint 1: Define need[r][c] = minimum health required when <i>entering</i> cell (r, c) so that you can still finish alive.</p>`, `<p>Hint 2: need[r][c] = max(1, min(need[r+1][c], need[r][c+1]) − dungeon[r][c]). Fill from the bottom-right backwards.</p>`, `<p>Hint 3: Pad with a row and column of +∞, except the two cells next to the princess set to 1 so the formula works at the goal. Answer need[0][0].</p>`],
    solution: {
      approach: `<p>Backward grid DP on "health needed on entry", one row array.</p>`,
      code: `class Solution {
    public int calculateMinimumHP(int[][] dungeon) {
        int m = dungeon.length, n = dungeon[0].length;
        int[] need = new int[n + 1];
        Arrays.fill(need, Integer.MAX_VALUE);
        need[n - 1] = 1;                                    // "after" the princess you need 1
        for (int r = m - 1; r >= 0; r--) {
            for (int c = n - 1; c >= 0; c--) {
                int next = Math.min(need[c], need[c + 1]);  // below (old need[c]) or right
                need[c] = Math.max(1, next - dungeon[r][c]);
            }
        }
        return need[0];
    }
}`,
      alt: [{ lang: 'python', code: `import math

class Solution:
    def calculate_minimum_hp(self, dungeon):
        n = len(dungeon[0])
        need = [math.inf] * (n + 1)            # padding: +inf blocks moves off the grid
        need[n - 1] = 1                        # "after" the princess you need 1
        for row in reversed(dungeon):
            for c in range(n - 1, -1, -1):
                nxt = min(need[c], need[c + 1])    # below (old need[c]) or right
                need[c] = max(1, nxt - row[c])
        return need[0]` }, { lang: 'js', code: `function calculateMinimumHP(dungeon) {
  const m = dungeon.length, n = dungeon[0].length;
  const need = new Array(n + 1).fill(Infinity);   // padding: blocks moves off the grid
  need[n - 1] = 1;                             // "after" the princess you need 1
  for (let r = m - 1; r >= 0; r--) {
    for (let c = n - 1; c >= 0; c--) {
      const next = Math.min(need[c], need[c + 1]);   // below (old need[c]) or right
      need[c] = Math.max(1, next - dungeon[r][c]);
    }
  }
  return need[0];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int calculateMinimumHP(vector<vector<int>>& dungeon) {
        int m = dungeon.size(), n = dungeon[0].size();
        vector<int> need(n + 1, INT_MAX);      // padding: blocks moves off the grid
        need[n - 1] = 1;                       // "after" the princess you need 1
        for (int r = m - 1; r >= 0; r--)
            for (int c = n - 1; c >= 0; c--) {
                int next = min(need[c], need[c + 1]);   // always finite: one neighbour is real
                need[c] = max(1, next - dungeon[r][c]);
            }
        return need[0];
    }
};` }],
      dry: { head: ['cell', 'min(next)', 'value', 'need'], rows: [['(2,2)', '1', '−5', '6'], ['(1,2)', '6', '1', '5'], ['(0,2)', '5', '3', '2'], ['(0,1)', 'min(11, 2) = 2', '−3', '5'], ['(0,0)', 'min(6, 5) = 5', '−2', H.c('g', '7')]] },
      complexity: `<p>Time O(m·n), space O(n).</p>`
    }
  });

  practice.push({
    title: 'Minimum Insertion Steps to Make a String Palindrome', level: 'Hard', tags: ['dp', 'lcs', 'palindrome'], companies: ['Google', 'Amazon', 'Uber'],
    statement: `<p>Given a string <code>s</code>, in one step you may insert any character at any index. Return the minimum number of steps to make s a palindrome.</p>`,
    constraints: `1 ≤ s.length ≤ 500, lowercase letters`,
    example: `<p>"zzazz" → <b>0</b> (already a palindrome). "mbadm" → <b>2</b> ("mbdadbm"). "leetcode" → <b>5</b>.</p>`,
    brute: { why: `<p>Interval recursion f(i, j): if s[i] == s[j] recurse inside, else 1 + min(f(i+1, j), f(i, j−1)). Without memo it branches twice per mismatch → exponential; only n² distinct (i, j) intervals exist.</p>`, code: `int f(String s, int i, int j) {
    if (i >= j) return 0;
    if (s.charAt(i) == s.charAt(j)) return f(s, i + 1, j - 1);
    return 1 + Math.min(f(s, i + 1, j), f(s, i, j - 1));
}` },
    mcq: { q: 'Minimum insertions equals…', options: ['n − LPS(s) = n − LCS(s, reverse(s))', 'number of distinct letters', 'edit distance(s, reverse(s))', 'n / 2'], answer: 0, explain: 'Keep the longest palindromic subsequence; every other character needs a mirrored partner inserted.' },
    tests: { sig: 'string -> int', fn: 'minInsertions', cases: [
      [['zzazz'], 0], [['mbadm'], 2], [['leetcode'], 5], [['a'], 0], [['ab'], 1], [['abc'], 2], [['race'], 3],
      [[{ $rep: 'a', n: 500 }], 0], [[{ $rep: 'ab', n: 250 }], 1], [[{ $rep: 'abcdefghij', n: 50 }], 401]
    ] },
    hints: [`<p>Hint 1: Characters that already form a palindromic subsequence need no help. Every other character needs one inserted twin.</p>`, `<p>Hint 2: Answer = n − LPS, and LPS = LCS(s, reverse(s)).</p>`, `<p>Hint 3: Two-row LCS keeps memory at O(n). Check: "mbadm" → LPS "mam"/"mbm" (3) → 5 − 3 = 2.</p>`],
    solution: {
      approach: `<p>Reduce to LCS with the reversed string.</p>`,
      code: `class Solution {
    public int minInsertions(String s) {
        int n = s.length();
        String r = new StringBuilder(s).reverse().toString();
        int[] prev = new int[n + 1], cur = new int[n + 1];
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= n; j++) {
                cur[j] = s.charAt(i - 1) == r.charAt(j - 1) ? prev[j - 1] + 1
                                                            : Math.max(prev[j], cur[j - 1]);
            }
            int[] t = prev; prev = cur; cur = t;
        }
        return n - prev[n];                          // n - LPS
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def min_insertions(self, s: str) -> int:
        r, n = s[::-1], len(s)
        prev = [0] * (n + 1)                   # LCS(s, reverse(s)) = LPS, two rows
        for a in s:
            cur = [0] * (n + 1)
            for j in range(1, n + 1):
                cur[j] = prev[j - 1] + 1 if a == r[j - 1] else max(prev[j], cur[j - 1])
            prev = cur
        return n - prev[n]                     # n - LPS` }, { lang: 'js', code: `function minInsertions(s) {
  const n = s.length, r = [...s].reverse().join('');
  let prev = new Int32Array(n + 1), cur = new Int32Array(n + 1);   // LCS(s, reverse(s)) = LPS
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= n; j++) {
      cur[j] = s[i - 1] === r[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    }
    [prev, cur] = [cur, prev];
  }
  return n - prev[n];                          // n - LPS
}` }, { lang: 'cpp', code: `class Solution {
public:
    int minInsertions(string s) {
        int n = s.size();
        string r(s.rbegin(), s.rend());
        vector<int> prev(n + 1, 0), cur(n + 1, 0);   // LCS(s, reverse(s)) = LPS
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= n; j++)
                cur[j] = s[i - 1] == r[j - 1] ? prev[j - 1] + 1 : max(prev[j], cur[j - 1]);
            swap(prev, cur);
        }
        return n - prev[n];                    // n - LPS
    }
};` }],
      dry: { head: ['s', 'LPS', 'answer'], rows: [['zzazz', '5', '0'], ['mbadm', '3', H.c('g', '2')], ['leetcode', '3 ("eee"/"ete")', '5']] },
      complexity: `<p>Time O(n²) = 2.5·10<sup>5</sup>, space O(n).</p>`
    }
  });

  // =====================================================================
  // QUIZ
  // =====================================================================
  quiz.push({ q: 'Which pair of properties makes a problem a good fit for dynamic programming?', options: ['Overlapping subproblems + optimal substructure', 'Sorted input + binary search', 'Greedy choice + matroid', 'Independent subproblems + merging'], answer: 0, explain: 'Repeated subproblems make a memo useful; optimal substructure makes combining best sub-answers correct. Independent subproblems = divide &amp; conquer.' });
  quiz.push({ q: 'Merge sort splits an array into halves recursively. Why is it not DP?', options: ['Its subproblems never repeat, so memoizing gains nothing', 'It has no recursion', 'It lacks optimal substructure', 'It runs in O(n log n)'], answer: 0, explain: 'Each half is a distinct subarray; no subproblem is solved twice, so there is nothing to cache.' });
  quiz.push({ q: 'A DP has n·m states and each state does O(k) work. Total time?', options: ['O(n·m·k)', 'O(n + m + k)', 'O(n·m)', 'O(k<sup>n</sup>)'], answer: 0, explain: 'Time = number of states × work per state — the universal DP estimate.' });
  quiz.push({ q: 'In the 1D 0/1 knapsack, the capacity loop runs from W down to w because…', options: ['dp[c − w] must still hold the value from before this item', 'it is faster', 'the compiler requires it', 'otherwise dp[0] changes'], answer: 0, explain: 'Going upward would read an already-updated dp[c − w], i.e. use the same item twice (unbounded behaviour).' });
  quiz.push({ q: 'coins = {1, 2, 5}, amount = 5. "Amount outer, coins inner" counting gives 9. What does it count?', options: ['Ordered sequences (permutations)', 'Combinations (multisets)', 'Minimum coins', 'Subsets of distinct coins'], answer: 0, explain: 'With amount outer, the last coin can be any type at every step, so 1+2+2 and 2+1+2 are separate. Coin-outer would give 4.' });
  quiz.push({ q: 'Coins {1, 3, 4}, amount 6. Greedy (largest coin first) uses 3 coins. What is optimal?', options: ['2 (3 + 3)', '3', '1', '6'], answer: 0, explain: 'dp[6] = 1 + min(dp[5], dp[3], dp[2]) = 1 + 1 = 2. Greedy is only safe for canonical coin systems.' });
  quiz.push({ q: 'House Robber on [2, 1, 1, 2] returns…', options: ['4', '3', '2', '6'], answer: 0, explain: 'Rob houses 0 and 3 (gap of two houses). "Every other house" only reaches 3.' });
  quiz.push({ q: 'In LCS, when text1[i−1] == text2[j−1], dp[i][j] equals…', options: ['dp[i−1][j−1] + 1', 'max(dp[i−1][j], dp[i][j−1])', 'dp[i−1][j] + dp[i][j−1]', '0'], answer: 0, explain: 'Using the matching pair as the last LCS character is always safe (exchange argument).' });
  quiz.push({ q: 'In edit distance, moving from dp[i−1][j] to dp[i][j] (the ↑ arrow) represents…', options: ['Deleting word1[i−1]', 'Inserting word2[j−1]', 'Replacing a character', 'A free match'], answer: 0, explain: 'After deleting word1\'s last char, we still need to turn word1[0..i−2] into word2[0..j−1] = dp[i−1][j].' });
  quiz.push({ q: 'Unique Paths II: first row is [0, 1, 0, 0] (1 = obstacle). Its path counts are…', options: ['1 0 0 0', '1 0 1 1', '1 1 1 1', '0 0 0 0'], answer: 0, explain: 'Row 0 cells can only be entered from the left; the obstacle stops the flow for everything after it.' });
  quiz.push({ q: 'Why does a grid with moves in all 4 directions break grid DP?', options: ['Cycles appear, so there is no order in which all dependencies are computed first', 'The grid is too big', 'DP only works on 1D arrays', 'Min becomes max'], answer: 0, explain: 'DP needs a DAG of states. With 4-way moves, use BFS/Dijkstra.' });
  quiz.push({ q: '0/1 knapsack with n = 100, W = 10<sup>9</sup>, values ≤ 100. Best approach?', options: ['DP over total value: minWeight[v], v ≤ 10<sup>4</sup>', 'dp over capacity 0..W', 'Greedy by ratio', 'Brute force 2<sup>100</sup>'], answer: 0, explain: 'Total value ≤ 100 × 100 = 10<sup>4</sup>, so index the table by value and store the least weight.' });
  quiz.push({ q: 'You memoize with <code>memo[i] == 0</code> meaning "not computed" in a min-cost DP where real answers can be 0. What happens?', options: ['States whose answer is 0 are recomputed every time (can become exponential)', 'Compile error', 'Always wrong answer', 'Nothing changes'], answer: 0, explain: 'A genuine 0 looks like "unknown", so those states never hit the cache. Use −1 or a separate visited array.' });

  // =====================================================================
  // INTERVIEW Q&A
  // =====================================================================
  interview.push({ level: 'B', q: 'What is dynamic programming, in plain words?', a: `<p>DP is solving a problem by breaking it into smaller versions of itself, solving each distinct smaller version <b>once</b>, storing the answer, and reusing it. It applies when (1) the same subproblems appear many times (overlapping subproblems) and (2) the best answer is built from best answers of subproblems (optimal substructure). Example: fib(n) with a memo goes from ~1.6<sup>n</sup> calls to O(n).</p>`, followUps: ['How is DP different from divide &amp; conquer?', 'How is it different from greedy?'] });
  interview.push({ level: 'B', q: 'Memoization vs tabulation — which do you prefer?', a: `<p><b>Memoization</b> (top-down) = recursion + cache; easy to write from the brute force and only computes reachable states, but pays function-call overhead and risks stack overflow on deep recursion (about 1000 frames in Python by default, ~10<sup>4</sup> in Java and JS). <b>Tabulation</b> (bottom-up) = loops in dependency order; no recursion, cache-friendly, and makes space optimization obvious. I usually derive the recurrence top-down, then write it bottom-up for the final answer, unless the state space is sparse (then top-down with a hash map).</p>`, followUps: ['When is top-down strictly better?', 'How do you avoid stack overflow in your language?'] });
  interview.push({ level: 'B', q: 'Walk me through how you design a DP solution from scratch.', a: `<p>Five steps: (1) <b>State</b> — say in one sentence what dp[...] means; (2) <b>transition</b> — look at the last decision and combine sub-answers with +, min/max or OR; (3) <b>base cases</b>; (4) <b>order</b> — fill so dependencies are ready; (5) <b>answer</b> location. Then complexity = states × work per state, then space optimization if each row depends only on the previous one. I validate with a tiny hand-filled table before coding.</p>`, followUps: ['What if you can\'t find the state?', 'How do you test a DP?'] });
  interview.push({ level: 'I', q: 'Climbing Stairs: why does ways(n) = ways(n−1) + ways(n−2) not double count?', a: `<p>Split all valid step sequences by their <b>last move</b>. Sequences ending with a 1-step are in bijection with sequences reaching n−1; those ending with a 2-step with sequences reaching n−2. The two groups are disjoint (different last moves) and cover everything, so adding them counts each sequence exactly once. This "partition by last choice" argument is how to justify any counting DP.</p>`, followUps: ['Steps from a set S?', 'What if some stairs are broken?'] });
  interview.push({ level: 'I', q: 'Why does greedy fail for coin change and when does it work?', a: `<p>Greedy commits to the largest coin without considering what it leaves behind. With {1, 3, 4} and 6, taking 4 forces 1 + 1 (3 coins), while 3 + 3 uses 2. Greedy is optimal only for <b>canonical</b> coin systems (real currencies are designed that way). DP checks every possible last coin: dp[a] = 1 + min dp[a − c], O(amount × coins). If a greedy fails, a counterexample exists below the sum of the two largest coins, which gives a quick test.</p>`, followUps: ['How do you prove greedy is safe for {1, 5, 10, 25}?', 'Return the coins, not just the count.'] });
  interview.push({ level: 'I', q: 'Explain the difference between Coin Change II (LC 518) and Combination Sum IV (LC 377).', a: `<p>Both count ways to reach an amount with reusable values. LC 518 counts <b>combinations</b> (1+2 = 2+1): loop coins outside, amounts inside — coins are introduced in a fixed order, so each multiset is generated once. LC 377 counts <b>sequences</b>: loop amounts outside, coins inside — each step can end with any coin, so orderings are distinct. Same transition ways[a] += ways[a − c], different loop order, different answer (4 vs 9 for {1,2,5}, 5).</p>`, followUps: ['What does each loop order look like as a 2D table?', 'How would you count combinations using each coin at most once?'] });
  interview.push({ level: 'I', q: 'Derive the 0/1 knapsack recurrence and its space-optimized form.', a: `<p>State dp[i][c] = best value using the first i items with capacity c. Item i is either skipped (dp[i−1][c]) or taken once (dp[i−1][c − w<sub>i</sub>] + v<sub>i</sub> if it fits) → max of the two. Both reads come from row i−1, so one array suffices if we iterate c from W down to w<sub>i</sub>: then dp[c − w] still holds the previous row. O(n·W) time, O(W) space. To list chosen items, keep the 2D table and walk back: a change between rows means the item was taken.</p>`, followUps: ['Why is it called pseudo-polynomial?', 'How do you handle W = 10<sup>9</sup>?'] });
  interview.push({ level: 'I', q: 'What changes between 0/1 and unbounded knapsack?', a: `<p>Only where the "take" arrow points. 0/1: take → dp[i−1][c − w] (item consumed). Unbounded: take → dp[i][c − w] (item still available, can be taken again). In 1D form that becomes the loop direction: backward for 0/1, forward for unbounded. Coin change, rod cutting and perfect squares are unbounded; subset sum, partition and target sum are 0/1.</p>`, followUps: ['Bounded knapsack (each item k times)?', 'Does loop order matter for max value in unbounded knapsack?'] });
  interview.push({ level: 'I', q: 'How do you reconstruct the actual LCS string, and what memory does it need?', a: `<p>Fill the full (n+1)×(m+1) table, then walk back from (n, m): if the characters match, emit it and go diagonal; otherwise move to the larger of up/left (ties broken consistently). Reverse the collected characters. This needs the whole table, O(n·m) memory. If memory is tight, Hirschberg's algorithm recovers the string in O(n + m) space by divide &amp; conquer with forward/backward two-row passes, at about twice the time.</p>`, followUps: ['How would you print all LCSs?', 'LCS when one string has distinct characters?'] });
  interview.push({ level: 'A', q: 'Edit distance: justify the three transitions and give the space-optimized version.', a: `<p>Consider the last characters of the two prefixes in an optimal alignment: either word1's last char is deleted (dp[i−1][j] + 1), word2's last char is inserted (dp[i][j−1] + 1), or they are aligned — free if equal (dp[i−1][j−1]) else a replace (+1). These cases are exhaustive, so min over them is exact. Space: one row plus a variable saving the old diagonal before overwrite → O(m). For "distance ≤ k" questions compute only a diagonal band of width 2k+1 → O(n·k).</p>`, followUps: ['Add adjacent transposition (Damerau).', 'How do search engines do fuzzy matching at scale?'] });
  interview.push({ level: 'A', q: 'How would you handle a DP whose table does not fit in memory?', a: `<p>Options: (1) <b>rolling arrays</b> when a row depends only on the previous one(s); (2) <b>change the state</b> — index by value instead of weight, or compress coordinates; (3) <b>top-down with a hash map</b> if only a sparse set of states is reachable; (4) <b>Hirschberg / divide &amp; conquer</b> to reconstruct answers in linear space; (5) <b>bitsets</b> for boolean DPs (64 states per word). I'd first measure: states × bytes per state, e.g. 10<sup>4</sup> × 10<sup>4</sup> ints = 400 MB — too much, so rolling rows.</p>`, followUps: ['When does rolling the array lose information?', 'How do you pack a pair (i, j) into one 64-bit key?'] });
  interview.push({ level: 'A', q: 'Unique Paths with obstacles vs Dungeon Game — why does one fill forward and the other backward?', a: `<p>In Unique Paths, the number of ways to reach a cell depends only on the past (cells above/left), so forward works. In Dungeon Game, the answer for a prefix depends on two numbers — current health and the lowest dip so far — that trade off, so a forward table can't pick one value per cell. Backward, "minimum health needed when entering this cell" is a single number determined by the future: need = max(1, min(next) − cell). Rule: fill in the direction where the remaining problem is summarised by one value.</p>`, followUps: ['Could binary search on the initial health work?', 'What if moves can go in 4 directions?'] });
  interview.push({ level: 'E', q: 'Is 0/1 knapsack polynomial? What do production systems do for large instances?', a: `<p>O(n·W) is <b>pseudo-polynomial</b>: polynomial in the numeric value W but exponential in its bit-length, and 0/1 knapsack is (weakly) NP-hard. In production: if W or total value is small, the DP; otherwise <b>branch-and-bound</b> with the fractional (greedy) relaxation as an upper bound, <b>FPTAS</b> by scaling values to get a (1 − ε) approximation, <b>meet-in-the-middle</b> for n ≤ 40, or an ILP/CP solver (OR-Tools, Gurobi). Cutting-stock and ad-budget allocation use column generation with knapsack DPs as subproblems.</p>`, followUps: ['Explain the FPTAS scaling idea.', 'How would you parallelise the DP?'] });
  interview.push({ level: 'E', q: 'An AI assistant gave you a DP that passes the samples. How do you verify it before shipping?', a: `<p>(1) Re-derive the state and transition myself and check the code matches them line by line (loop direction, base cases, sentinel values). (2) Write a brute-force enumerator for tiny inputs and run a randomized <b>stress test</b> comparing both for thousands of cases, including edge cases (empty input, n = 1, zeros, impossible targets, max values for overflow). (3) Check complexity against constraints (states × work). (4) For reconstruction, verify the output independently (e.g. the printed LCS is a subsequence of both strings). AI often gets loop order, sentinels and overflow wrong — exactly what stress tests catch.</p>`, followUps: ['How do you choose random test sizes?', 'What invariants would you assert inside the DP?'] });

  // ---------- spread correct answers across positions (A/B/C/D) ----------
  function placeAnswer(m, k) {
    if (!m || !m.options) return;
    var correct = m.options[m.answer], rest = m.options.filter(function (_, i) { return i !== m.answer; });
    k = k % m.options.length;
    rest.splice(k, 0, correct);
    m.options = rest;
    m.answer = k;
  }
  var POS = [1, 3, 0, 2, 2, 1, 3, 0, 1, 2, 0, 3, 1, 2, 3, 0];
  quiz.forEach(function (q, i) { placeAnswer(q, POS[i % POS.length]); });
  practice.forEach(function (p, i) { placeAnswer(p.mcq, POS[(i + 5) % POS.length]); });
  topics.forEach(function (t, i) { (t.problems || []).forEach(function (p, j) { placeAnswer(p.mcq, POS[(i + j + 9) % POS.length]); }); });

  registerModule({
    id: 'dsa17',
    title: 'Dynamic Programming I',
    intro: `<p>Dynamic programming (DP) has a scary name for a simple habit: <b>never solve the same small question twice — write the answer down and reuse it</b>. This module takes you from "what is DP?" to confidently solving the classic interview families: 1D DP (Fibonacci, climbing stairs, house robber), coin change (min coins and number of ways), 0/1 and unbounded knapsack, two-string DP (longest common subsequence, edit distance) and grid DP (paths with obstacles, minimum path sum).</p>
      <p>Every topic follows the same <b>5-step recipe</b> — state, transition, base cases, fill order, answer — and every topic has a visualizer where you watch the DP table fill cell by cell, with the <span class="c-y">current cell</span> and the <span class="c-b">cells it depends on</span> highlighted. You will learn memoization → tabulation → space optimization as a sequence of small safe steps, how to reconstruct the actual choices (which coins, which items, which edits), and how to spot DP from the wording of a question.</p>
      <p>DP is the single most feared interview topic, and in the AI era it is still tested heavily because it checks reasoning rather than recall: finding the state, proving the transition, and choosing loop order are things you must own.</p>`,
    goals: [
      'Recognise a DP problem from its wording ("number of ways", "minimum cost", "is it possible", choices at each step) and justify overlapping subproblems + optimal substructure',
      'Apply the 5-step recipe (state → transition → base → order → answer) and estimate complexity as states × work per state',
      'Convert any recursion into memoization, then tabulation, then a space-optimized version — and know when each is the better choice',
      'Solve climbing stairs, house robber, coin change (min + combinations + permutations), 0/1 and unbounded knapsack without notes, including the correct 1D loop direction',
      'Fill and trace back 2D tables for LCS, edit distance, unique paths with obstacles and minimum path sum, reconstructing the actual answer',
      'Reduce disguised problems (partition, target sum, perfect squares, palindromic subsequence, delete-and-earn) to the patterns in this module'
    ],
    prereqs: `<p>DSA 11 (Recursion &amp; Backtracking — recursion trees, the call stack, pick/not-pick), DSA 2 (Time/Space Complexity), DSA 5 (Arrays &amp; Prefix Sums). DSA 16 (Greedy) helps for the "why greedy fails" comparisons. Comfortable with 2D arrays in Java.</p>`,
    hours: 16,
    langNotes: {
      java: `<p><b>Java:</b> <code>int</code> overflow wraps silently, and DP counts grow fast: fib(47) already passes 2<sup>31</sup>, fib(93) passes <code>long</code>. Use <code>long</code> for counts, take <code>% 1_000_000_007</code> when asked, and cap cells with <code>Math.min(Integer.MAX_VALUE, …)</code> when an answer "fits in int" but other cells do not (Combination Sum IV, Distinct Subsequences). Never use <code>Integer.MAX_VALUE</code> as ∞ and then add 1: it wraps to a negative number; use <code>amount + 1</code> or a value like 10<sup>9</sup>. <code>new int[n]</code> is zero-filled, so set a sentinel with <code>Arrays.fill(memo, -1)</code> when 0 is a real answer. Top-down recursion overflows the default stack around 10<sup>4</sup>–10<sup>5</sup> frames (<code>StackOverflowError</code>): tabulate for big n. A <code>HashMap&lt;Long, Long&gt;</code> memo boxes every value and is 5–20× slower than an array; use it only for sparse states.</p>`,
      python: `<p><b>Python:</b> ints never overflow, so counting DPs (coin change ways, distinct subsequences) need no caps — but huge numbers get slower, so still take <code>% MOD</code> when the problem asks. <code>@functools.cache</code> (or <code>lru_cache</code>) turns a recursive brute force into memoization in one line, but recursion stops at <b>1000 frames</b> (<code>RecursionError</code>): for n in the thousands, tabulate, or raise <code>sys.setrecursionlimit</code> and run the code in a thread with a bigger <code>threading.stack_size</code>. Build tables with <code>[[0] * (m + 1) for _ in range(n + 1)]</code>; <code>[[0] * (m + 1)] * (n + 1)</code> repeats <b>one</b> row object. Plain loops run about 10<sup>7</sup> simple steps per second, so an O(n·W) table of 10<sup>7</sup> cells is slow: keep only two rows, and use built-ins (<code>max</code>, <code>min</code>, <code>sum</code> over a generator). A Python int also works as a fast bitset for subset sum: <code>reach |= reach &lt;&lt; x</code>. <code>float("inf")</code> / <code>math.inf</code> is a safe ∞ for min-DPs.</p>`,
      js: `<p><b>JavaScript:</b> every number is a double, exact only up to 2<sup>53</sup> (≈ 9·10<sup>15</sup>): fib(78) is the last exact Fibonacci number, so use <code>BigInt</code> (<code>1n</code>, <code>a + b</code>) for big exact counts or take <code>% MOD</code> after every addition. When an answer fits in 32 bits but other cells explode, cap cells with <code>Math.min(2 ** 31 - 1, …)</code>. <code>Infinity</code> is a safe ∞ for min-DPs (<code>Infinity + 1</code> is still <code>Infinity</code>). Build tables with <code>Array.from({ length: n + 1 }, () =&gt; new Array(m + 1).fill(0))</code>; <code>new Array(n).fill(row)</code> shares one row. <code>Int32Array</code> rows are compact and fast for small integers. Recursion depth is about 10<sup>4</sup> frames (<code>RangeError: Maximum call stack size exceeded</code>), so tabulate for big n. A <code>Map</code> memo needs a primitive key: encode (i, j) as <code>i * M + j</code>, not an array.</p>`,
      cpp: `<p><b>C++:</b> signed overflow is <b>undefined behaviour</b>, not a wrap, so DP counts need care: use <code>long long</code>, take <code>% MOD</code>, or cap cells with <code>min&lt;long long&gt;(INT_MAX, …)</code> when only the final answer is promised to fit; <code>unsigned long long</code> wraps legally modulo 2<sup>64</sup> if you prefer that. Never add 1 to <code>INT_MAX</code> used as ∞. <code>vector&lt;int&gt; dp(n + 1, -1)</code> sets the memo sentinel in one line, and a 2D table is <code>vector&lt;vector&lt;int&gt;&gt; dp(n + 1, vector&lt;int&gt;(m + 1))</code>. Pass the memo and the input <b>by reference</b> (<code>vector&lt;int&gt;&amp;</code>) to recursive helpers, or every call copies them. <code>swap(prev, cur)</code> switches two DP rows in O(1). <code>std::bitset</code> makes subset sum 64× faster (<code>reach |= reach &lt;&lt; x</code>). The stack is about 8 MB on Linux, so very deep memoized recursion can crash: tabulate.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
