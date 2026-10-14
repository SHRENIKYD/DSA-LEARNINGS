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

registerModule({ id: 'dsa17', title: 'Dynamic Programming I', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
