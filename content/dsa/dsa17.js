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
    code: [`
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
      }`, { lang: 'python', run: true, title: 'Count the calls yourself (Python, runnable)', code: `calls = 0

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
    codeTitle: ['Same recursion, with and without a notebook (Java)', 'Count the calls yourself (Python, runnable)'],
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
      { title: 'Writing the recipe for "count binary strings of length n with no two adjacent 1s"', html: `<p><b>State:</b> end0[i] = strings of length i ending in 0, end1[i] = ending in 1.<br><b>Transition (last character):</b> end0[i] = end0[i-1] + end1[i-1] (a 0 can follow anything); end1[i] = end0[i-1] (a 1 only after a 0).<br><b>Base:</b> end0[1] = 1, end1[1] = 1.<br><b>Answer:</b> end0[n] + end1[n].</p>${H.table(['i', 'end0', 'end1', 'total'], [['1', '1', '1', '2'], ['2', '2', '1', '3'], ['3', '3', '2', '5'], ['4', '5', '3', H.c('g', '8')]])}<p>Fibonacci again, hiding in a word problem. Many "count" problems are Fibonacci in disguise.</p>`, code: `long countNoAdjacentOnes(int n) {
    long end0 = 1, end1 = 1;          // length 1: "0" and "1"
    for (int i = 2; i <= n; i++) {
        long new0 = end0 + end1;       // append 0 to anything
        long new1 = end0;              // append 1 only after a 0
        end0 = new0;
        end1 = new1;
    }
    return end0 + end1;
}` },
      { title: 'Spotting the repeated state in a brute force', html: `<p>Brute force for "min cost to reach stair n" is <code>solve(i) = cost[i] + min(solve(i-1), solve(i-2))</code>. Its <b>only parameter</b> is <code>i</code>, and i ranges over 0..n. So at most n+1 different calls exist, yet the plain recursion makes ~1.6<sup>n</sup> calls. "Few distinct parameter values, many calls" is the exact moment to add a memo.</p>` }
    ],
    deepDive: `<p><b>Why "dynamic programming"?</b> Richard Bellman coined it in the 1950s; "programming" meant <i>planning/tabulating</i> (like a TV programme schedule), and "dynamic" sounded impressive to funding committees. The name tells you nothing — the idea is "solve each distinct subproblem once".</p>
      <p><b>The subproblem graph.</b> Every DP is a <i>directed acyclic graph</i> (DAG): nodes are states, edges go from a state to the states it depends on. Memoization is DFS over this DAG; tabulation is processing nodes in a topological order. Total time = (number of states) × (work per state). For fib: n states × O(1). This one formula estimates every DP in this module: knapsack = N·W states × O(1); LCS = n·m × O(1); coin change = amount × coins.</p>
      <p><b>Why it must be acyclic.</b> If state A depends on B and B on A, neither can be finished first — memoization would loop forever. Problems with cycles (shortest path with arbitrary edges) need graph algorithms like Dijkstra/Bellman–Ford instead; Bellman–Ford is itself a DP over "number of edges used", which breaks the cycle by adding a dimension.</p>
      <p><b>Correctness proof shape.</b> DP proofs are induction: "assume all smaller states hold the correct answer; the transition considers every possible last choice; therefore this state is correct". If your transition misses a possible last choice, the proof (and the code) breaks.</p>
      <p><b>Exponential → polynomial.</b> Plain fib calls grow like φ<sup>n</sup> with φ ≈ 1.618 (the golden ratio). fib(n) itself also grows like φ<sup>n</sup>, which is why fib(93) overflows a signed 64-bit long — real interview answers often need <code>% 1_000_000_007</code> or BigInteger.</p>
      <p><b>Even faster than O(n):</b> Fibonacci-like linear recurrences can be solved in O(log n) with 2×2 matrix fast exponentiation (DSA 3 modular power, applied to matrices). Worth mentioning as a follow-up; rarely required.</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant will write memoized Fibonacci instantly, so "can you code DP" is no longer the signal. Interviewers now probe whether you can <b>find the state</b> in a messy word problem and <b>justify</b> that subproblems overlap and that optimal substructure holds.</p>
      <p><b>Use AI as a partner:</b> ask <code>Here is my brute-force recursion. List its parameters and estimate how many distinct calls exist vs total calls. Do not give me the DP.</code> That trains the exact recognition skill you need. Or ask for 3 counting problems that are "Fibonacci in disguise" and solve them yourself.</p>
      <p><b>Where AI goes wrong:</b> it happily labels problems as DP when greedy suffices (or vice versa), invents a state that loses information (e.g. drops "last element used"), and forgets overflow. It can also produce code that passes the sample but silently double counts.</p>
      <p><b>What you must still own:</b> the one-sentence state definition, the "last step" reasoning for the transition, the state-count × work-per-state complexity estimate, and the decision whether DP is even the right tool.</p>`,
    problems: [{
      title: 'Fibonacci Number', level: 'Easy', tags: ['dp', '1d dp', 'recursion'], companies: ['Amazon', 'Adobe', 'Apple'],
      statement: `<p>The Fibonacci numbers are F(0) = 0, F(1) = 1 and F(n) = F(n−1) + F(n−2) for n &gt; 1. Given <code>n</code>, return F(n).</p>`,
      constraints: `0 ≤ n ≤ 30 (follow-up: n ≤ 90 with long, or n up to 10<sup>18</sup> modulo 10<sup>9</sup>+7)`,
      example: `<p>Input <code>n = 6</code> → Output <b>8</b>.</p>${H.arr([0, 1, 1, 2, 3, 5, 8], { label: 'F', hl: { 4: 'b', 5: 'b', 6: 'g' } })}<p>${H.c('g', 'F(6) = 8')} because ${H.c('b', 'F(5) + F(4) = 5 + 3')}.</p>`,
      brute: { why: `<p>Direct recursion recomputes the same F(k) over and over: about 1.6<sup>n</sup> calls. n = 30 is ~2.7 million calls (ok), but n = 50 is ~4·10<sup>10</sup> calls (TLE). The waste: F(n−2) is computed inside F(n−1) <i>and</i> again directly.</p>`, code: `int fib(int n) {
    if (n < 2) return n;              // F(0)=0, F(1)=1
    return fib(n - 1) + fib(n - 2);   // overlapping calls -> exponential
}` },
      mcq: { q: 'To compute F(n) bottom-up, how many earlier values do you need to keep at any moment?', options: ['All n values', 'Just the last two', 'Just the last one', 'log n values'], answer: 1, explain: 'F(i) only reads F(i−1) and F(i−2), so two variables are enough → O(1) space.' },
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
        return prev1` }, { lang: 'cpp', code: `class Solution {
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
        followUps: ['n up to 10<sup>18</sup> modulo 10<sup>9</sup>+7 → 2×2 matrix fast exponentiation, O(log n).', 'Return the first n Fibonacci numbers as a list.', 'Why does fib(93) overflow a Java long?']
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
        ['risk', 'StackOverflowError for deep recursion', 'must get the fill order right', 'can overwrite a value you still need'],
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
      '<code>n ≤ 10<sup>5</sup></code> with recursion in Java → deep recursion may overflow the stack; prefer tabulation.',
      '<code>n ≤ 10<sup>18</sup></code> → not a loop at all; linear recurrence → matrix exponentiation O(log n).'
    ],
    code: [`
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
      }`, { lang: 'python', run: true, title: 'All three in Python (runnable)', code: `from functools import lru_cache

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
    codeTitle: ['Climbing stairs: memo → table → two variables (Java)', 'All three in Python (runnable)'],
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
      { title: 'Steps of 1, 2 or 3 (Tribonacci stairs)', html: `<p>ways(i) = ways(i−1) + ways(i−2) + ways(i−3), bases ways(0) = 1, negative index = 0.</p>${H.table(['i', '0', '1', '2', '3', '4', '5'], [['ways', '1', '1', '2', '4', '7', H.c('g', '13')]])}<p>ways(4) = 4 + 2 + 1 = 7. Space optimization now needs <b>three</b> variables — the sticky note grows with the number of allowed step sizes.</p>`, code: `int ways123(int n) {
    int[] dp = new int[n + 1];
    dp[0] = 1;
    for (int i = 1; i <= n; i++)
        for (int step = 1; step <= 3; step++)
            if (i - step >= 0) dp[i] += dp[i - step];
    return dp[n];
}` },
      { title: 'Arbitrary allowed steps + modulo', html: `<p>Allowed steps = {1, 3, 5}, n up to 10<sup>5</sup>, answer mod 10<sup>9</sup>+7. Same transition, sum over allowed steps, and take <code>% MOD</code> after every addition so the int never overflows (10<sup>9</sup>+7 + 10<sup>9</sup>+7 still fits in a long; use long for the sum).</p>`, code: `int waysSteps(int n, int[] steps) {
    final int MOD = 1_000_000_007;
    long[] dp = new long[n + 1];
    dp[0] = 1;
    for (int i = 1; i <= n; i++)
        for (int s : steps)
            if (i - s >= 0) dp[i] = (dp[i] + dp[i - s]) % MOD;
    return (int) dp[n];
}` },
      { title: 'Why the memo sentinel matters', html: `<p>Using <code>0</code> to mean "not computed" works for climbing stairs because every answer is ≥ 1. In <b>min-cost</b> problems a real answer can be 0, so a 0 sentinel would make you recompute (correct but slow) — or worse, in some codes return a wrong cached 0. Fix: fill memo with <code>-1</code> via <code>Arrays.fill(memo, -1)</code>, or use <code>Integer[]</code> with <code>null</code>, or a separate <code>boolean[] seen</code>.</p>` },
      { title: 'Top-down wins when most states are never visited', html: `<p>f(0) = 1 and f(k) = f(⌊k/2⌋) + f(⌊k/3⌋), asked for n = 10<sup>12</sup>. A bottom-up table of 10<sup>12</sup> cells is impossible, but starting from n the recursion only ever reaches numbers of the form ⌊n / (2<sup>a</sup>·3<sup>b</sup>)⌋ — a few hundred distinct states. A top-down memo in a HashMap touches only those. Rule: if the reachable states are a tiny slice of the full table, memoize with a HashMap instead of tabulating.</p>` }
    ],
    deepDive: `<p><b>Stack depth in Java.</b> Each recursive call uses a stack frame (tens of bytes to ~100 bytes). The default thread stack (often 512 KB–1 MB) usually survives depth ~10<sup>4</sup> but fails around 10<sup>5</sup>. Options: tabulate, run the solver in <code>new Thread(null, task, "dp", 1 &lt;&lt; 26)</code> with a bigger stack (competitive programming trick), or convert to an explicit stack. Python's default recursion limit is 1000 — <code>sys.setrecursionlimit</code> helps but the C stack can still crash.</p>
      <p><b>Pull vs push DP.</b> "Pull" (what we wrote): dp[i] = combine of dp[earlier]. "Push": for each i, add dp[i] into dp[i+1] and dp[i+2]. Both are valid; push is handy when it is easier to list where a state <i>goes</i> than where it <i>came from</i> (e.g. "from i you can jump to these positions").</p>
      <p><b>Memo containers.</b> Array &gt; HashMap by 5–20× in Java (no hashing, no boxing). Use HashMap&lt;Long, Long&gt; only when states are sparse or huge; encode a pair (i, j) into one long key <code>i * M + j</code> rather than building strings like <code>i + "," + j</code> (slow, allocation heavy).</p>
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
    def climbStairs(self, n: int) -> int:
        prev2, prev1 = 1, 1
        for _ in range(2, n + 1):
            prev2, prev1 = prev1, prev1 + prev2
        return prev1` }],
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
    code: [`
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
      }`, { lang: 'python', run: true, title: 'With reconstruction: which houses? (Python, runnable)', code: `def rob_with_houses(a):
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
    codeTitle: ['House Robber: table and O(1) versions (Java)', 'With reconstruction (Python, runnable)'],
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
      { title: 'House Robber II (circular street)', html: `<p>First and last house are now neighbours. They cannot both be robbed, so the answer is <code>max(rob(a[0..n-2]), rob(a[1..n-1]))</code>. Example [2, 3, 2]: rob([2,3]) = 3, rob([3,2]) = 3 → <b>3</b> (not 4). Single house n = 1 is a special case: return a[0].</p>`, code: `int robCircle(int[] a) {
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
}` },
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
        return prev1` }, { lang: 'cpp', code: `class Solution {
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
    code: [`
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
      }`, { lang: 'python', run: true, title: 'Combinations vs permutations: see the loop order matter (Python, runnable)', code: `def combos(coins, amount):
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
    codeTitle: ['Min coins, combinations, permutations (Java)', 'Loop order experiment (Python, runnable)'],
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
        frames.push({ narr: 'Answer: <b>' + dp[A] + '</b> coins. Follow the "last coin" links back from ' + A + ' to 0 to list them: <b>' + used.join(' + ') + '</b>.', parts: [
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
      { title: 'Impossible amount → −1', html: `<p>coins = [2], amount = 3. dp = [0, ∞, 1, ∞]. dp[3] = 1 + dp[1] = ∞ → return <b>−1</b>. Using <code>Integer.MAX_VALUE</code> as ∞ and then doing <code>+ 1</code> overflows to a negative number and returns garbage — that is why we use <code>amount + 1</code> as ∞ (no answer can need more than <code>amount</code> coins when the smallest coin is 1).</p>` },
      { title: 'Combinations vs permutations, by hand', html: `<p>coins {1, 2}, amount 3.</p>${H.table(['loop order', 'what is counted', 'answer'], [['coin outer', '{1,1,1}, {1,2}', H.c('g', '2')], ['amount outer', '1+1+1, 1+2, 2+1', H.c('b', '3')]])}<p>With coin-outer, once you move to coin 2 you can never add a 1 after a 2 → each pile is built in one fixed order (all 1s, then all 2s) → counted once.</p>` },
      { title: 'Amount 0', html: `<p>coins = [1], amount = 0 → min coins = <b>0</b>, number of ways = <b>1</b> (the empty pile). Interviewers check this: dp[0] = 0 for min, ways[0] = 1 for counting.</p>` },
      { title: 'Perfect Squares is coin change in disguise', html: `<p>"Fewest perfect squares summing to n" (LC 279): the coins are 1, 4, 9, 16, … ≤ n. n = 12 → 4 + 4 + 4 = <b>3</b> (greedy 9 + 1 + 1 + 1 = 4 squares is wrong). Same dp, O(n√n).</p>`, code: `int numSquares(int n) {
    int[] dp = new int[n + 1];
    Arrays.fill(dp, n + 1);
    dp[0] = 0;
    for (int a = 1; a <= n; a++)
        for (int s = 1; s * s <= a; s++)
            dp[a] = Math.min(dp[a], dp[a - s * s] + 1);
    return dp[n];
}` }
    ],
    deepDive: `<p><b>Why the loop order decides combinations vs permutations.</b> Coin-outer processes coin types in a fixed order, so every multiset is generated exactly once, as "all coins of type 1, then all of type 2, …". Amount-outer lets the last coin be any type at every step, so every arrangement is generated. Mixing them up is the #1 bug on this topic.</p>
      <p><b>Overflow.</b> LC 518 promises the answer fits in a 32-bit int, but intermediate cells can still overflow in some inputs for LC 377 (which is why some solutions use <code>long</code> or skip values over Integer.MAX_VALUE). In exam settings answers are taken mod 10<sup>9</sup>+7.</p>
      <p><b>Complexity.</b> Both are O(amount × #coins) time and O(amount) space. This is <i>pseudo-polynomial</i>: polynomial in the <b>value</b> of amount, exponential in its number of bits. Amount = 10<sup>9</sup> would need a different idea (e.g. BFS with pruning for small answers, or math for canonical coin systems).</p>
      <p><b>BFS view of min coins.</b> Amounts are nodes; each coin is an edge of weight 1. Min coins = shortest path from 0 to amount — BFS solves it too and can stop early, but the dp is simpler and has the same worst case.</p>
      <p><b>When greedy is optimal.</b> Coin systems where greedy always works are called <i>canonical</i> (₹1, 2, 5, 10, 20 … and US 1, 5, 10, 25 are). Kozen &amp; Zaks showed that if greedy fails, a counterexample exists below c<sub>max</sub> + c<sub>second max</sub>, and Pearson gave an O(n<sup>3</sup>) test for canonicity. In interviews: assume arbitrary coins → DP.</p>
      <p><b>Reconstruction.</b> Keep <code>last[a]</code> = the coin that achieved dp[a]; walk a → a − last[a] until 0 to print the coins (the visualizer does this).</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants know LC 322/518/377 by heart, so the interviewer's real test becomes: "Here is a slightly different wording — do you count piles or sequences? Is the coin reusable?" That reading skill is yours.</p>
      <p><b>Use AI as a partner:</b> paste the problem wording and ask <code>Is this order-sensitive? Quote the exact sentence that decides it.</code> Then generate random tests and compare your DP against a brute-force enumerator the AI writes.</p>
      <p><b>Where AI goes wrong:</b> swapping the loop order (answering 9 instead of 4), using <code>Integer.MAX_VALUE</code> as ∞ and overflowing on +1, applying greedy for "real-looking" coin sets, and forgetting amount = 0.</p>
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
      mcq: { q: 'Which initial value is the safest "∞" for dp[a] in Java?', options: ['Integer.MAX_VALUE', 'amount + 1', '0', '-1'], answer: 1, explain: 'No valid answer needs more than amount coins (all coins ≥ 1), so amount + 1 means impossible — and dp + 1 never overflows. MAX_VALUE + 1 wraps to a negative number.' },
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
    def coinChange(self, coins, amount):
        INF = amount + 1
        dp = [0] + [INF] * amount
        for a in range(1, amount + 1):
            for c in coins:
                if c <= a and dp[a - c] + 1 < dp[a]:
                    dp[a] = dp[a - c] + 1
        return -1 if dp[amount] > amount else dp[amount]` }, { lang: 'cpp', code: `class Solution {
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
    code: [`
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
      }`, { lang: 'python', run: true, title: 'Knapsack + which items were packed (Python, runnable)', code: `def knapsack(wt, val, W):
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
    codeTitle: ['0/1 knapsack: 2D table and 1D backward loop (Java)', 'With item reconstruction (Python, runnable)'],
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
      { title: 'Subset sum = boolean knapsack', html: `<p>"Is there a subset of [3, 34, 4, 12, 5, 2] with sum 9?" Weight = value = the number; dp[c] = can we hit exactly c. <code>dp[c] |= dp[c − x]</code>, backwards. 4 + 5 = 9 → <b>true</b>. Partition Equal Subset Sum = subset sum with target total/2 (odd total → false immediately).</p>`, code: `boolean subsetSum(int[] a, int target) {
    boolean[] can = new boolean[target + 1];
    can[0] = true;                         // empty subset makes 0
    for (int x : a)
        for (int c = target; c >= x; c--)  // backwards: each number once
            can[c] = can[c] || can[c - x];
    return can[target];
}` },
      { title: 'Counting subsets: Target Sum', html: `<p>nums = [1,1,1,1,1], target 3: choose a + or − for each. If P = sum of "+" numbers, then P − (total − P) = target → P = (total + target)/2 = 4. Count subsets summing to 4 → C(5,4) = <b>5</b>. Same backward loop with <code>ways[c] += ways[c − x]</code>. If (total + target) is odd or |target| &gt; total → 0.</p>` },
      { title: 'Huge capacity, small values: flip the DP', html: `<p>n = 100, W = 10<sup>9</sup>, each value ≤ 1000. A W-wide table is impossible. Instead <code>minW[val]</code> = least weight achieving total value exactly val (size ≤ 100 × 1000 = 10<sup>5</sup>). Answer = largest val with minW[val] ≤ W. Same 0/1 backward loop, roles of weight and value swapped.</p>` }
    ],
    deepDive: `<p><b>Pseudo-polynomial, NP-hard.</b> O(n·W) looks polynomial, but W is a <i>number</i> written with log₂W bits; doubling the bits squares W. The 0/1 knapsack decision problem is NP-complete (weakly), so no algorithm polynomial in the bit-size is known. The DP is fast exactly when W (or total value) is small.</p>
      <p><b>Bitset speed-up for subset sum.</b> For the boolean version, the whole row update is <code>bits |= bits &lt;&lt; x</code>. With <code>java.util.BitSet</code> or C++ <code>std::bitset</code> that processes 64 capacities per machine word: O(n·W/64). A classic trick for partition problems with sums up to 10<sup>6</sup>.</p>
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
    def knapSack(self, W, wt, val):
        dp = [0] * (W + 1)
        for w, v in zip(wt, val):
            for c in range(W, w - 1, -1):
                dp[c] = max(dp[c], dp[c - w] + v)
        return dp[W]` }, { lang: 'cpp', code: `class Solution {
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
    code: [`
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
      }`, { lang: 'python', run: true, title: 'Rod cutting with the actual cuts (Python, runnable)', code: `def cut_rod(price, n):
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
    codeTitle: ['Unbounded knapsack and rod cutting (Java)', 'Rod cutting with reconstruction (Python, runnable)'],
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
      { title: 'Integer Break (LC 343)', html: `<p>Break n (≥ 2) into at least two positive parts maximizing the product. dp[i] = max over j of max(j, dp[j]) × max(i−j, dp[i−j]) — the max(j, dp[j]) allows "do not break this part further". n = 10 → 3 + 3 + 4 → <b>36</b>. (Math shortcut: use as many 3s as possible — a nice follow-up.)</p>`, code: `int integerBreak(int n) {
    int[] dp = new int[n + 1];
    dp[1] = 1;
    for (int i = 2; i <= n; i++)
        for (int j = 1; j < i; j++)
            dp[i] = Math.max(dp[i], Math.max(j, dp[j]) * Math.max(i - j, dp[i - j]));
    return dp[n];
}` },
      { title: 'Minimum cost to get at least X (bundles)', html: `<p>Packs of 3 cans for ₹5, 5 cans for ₹7, need <b>at least</b> 11 cans. Exact-amount DP would miss "buy 12". Fix: let dp[x] = min cost for at least x cans and use <code>dp[max(0, x − size)] + price</code>. Options: 5+3+3 cans = ₹7+₹5+₹5 = <b>₹17</b> (exactly 11), 5+5+3 = ₹19 (13 cans), 3+3+3+3 = ₹20 (12 cans) → <b>₹17</b>. When pack sizes don't line up exactly, buying a little extra can be cheapest, and only the clamp lets the DP consider it. The clamp to 0 is the whole trick.</p>` },
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
      hints: [`<p>Hint 1: The only thing that matters about a partly-cut rod is its remaining length. That is your state.</p>`, `<p>Hint 2: best[len] = max(price[p−1] + best[len−p]) for p = 1..len; best[0] = 0. This is unbounded knapsack with weight = piece length.</p>`, `<p>Hint 3: Fill len = 1..n in increasing order (O(n²) = 10<sup>6</sup>). Use long if prices × count could exceed 2·10<sup>9</sup> (here 1000 × 10<sup>5</sup> = 10<sup>8</sup>, int is fine).</p>`],
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
    def cutRod(self, price):
        n = len(price)
        best = [0] * (n + 1)
        for length in range(1, n + 1):
            for piece in range(1, length + 1):
                best[length] = max(best[length], price[piece - 1] + best[length - piece])
        return best[n]` }],
        dry: { head: ['len', 'best candidates (piece + rest)', 'best[len]'], rows: [['1', '1+0', '1'], ['2', '1+1, 5+0', '5'], ['3', '1+5, 5+1, 8+0', '8'], ['4', '1+8, 5+5, 8+1, 9', '10'], ['5', '1+10, 5+8, 8+5, 9+1, 10', '13'], ['6', '…, 17+0', '17'], ['7', '1+17, 5+13, 8+10, …', '18'], ['8', '5+17 (piece 2 + best[6])', H.c('g', '22')]] },
        complexity: `<p>Time O(n²), space O(n).</p>`,
        followUps: ['Print the cuts (store the best first piece per length).', 'Each cut costs a fixed fee c → subtract c per cut.', 'Only certain lengths are allowed → loop over the allowed list.']
      }
    }]
  });

registerModule({ id: 'dsa17', title: 'Dynamic Programming I', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
