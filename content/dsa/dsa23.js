(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // ---------- small shared helpers for the visualizers ----------
  function parseNums(s, what, minLen, maxLen, lo, hi) {
    var t = String(s === undefined || s === null ? '' : s).trim();
    if (!t) throw new Error('Please type ' + what + ' (whole numbers separated by spaces).');
    var a = t.split(/[\s,]+/).map(Number);
    for (var i = 0; i < a.length; i++) {
      if (isNaN(a[i]) || Math.floor(a[i]) !== a[i]) throw new Error('Could not read ' + what + ': use whole numbers separated by spaces, e.g. "1 2 5".');
      if (a[i] < lo || a[i] > hi) throw new Error('Each value in ' + what + ' must be between ' + lo + ' and ' + hi + '.');
    }
    if (a.length < minLen || a.length > maxLen) throw new Error(what + ' must have ' + minLen + ' to ' + maxLen + ' values (got ' + a.length + ').');
    return a;
  }
  function splitBar(s, n, fmt) {
    var parts = String(s === undefined || s === null ? '' : s).split('|');
    if (parts.length !== n) throw new Error('Expected ' + n + ' parts separated by "|": ' + fmt);
    return parts.map(function (x) { return x.trim(); });
  }
  function one(k, v) { var o = {}; o[k] = v; return o; }
  function show(v) { return v === Infinity || v >= 1e15 ? '∞' : v; }
  function r3(x) { return Math.round(x * 1000) / 1000; }
  function bin(mask, n) { var s = mask.toString(2); while (s.length < n) s = '0' + s; return s; }
  function popcount(x) { var c = 0; while (x) { x &= x - 1; c++; } return c; }

  // =====================================================================
  // TOPIC 1 — Bitmask DP: TSP (Held-Karp) and the Assignment problem
  // =====================================================================
  topics.push({
    title: 'Bitmask DP: Travelling Salesman (Held-Karp) & the Assignment Problem',
    analogy: `<p>Imagine a row of <b>light switches</b>, one per city you must visit. A switch that is <b>ON</b> means "already visited". The whole row of switches — say <code>1011</code> — is a tiny photograph of your progress. Two people standing in different towns but with the <i>same</i> switches on and standing in the <i>same</i> town are in exactly the same situation: whatever is left to do costs them the same. So you only need to remember the cheapest way to reach each "switch photo + current town". That is bitmask DP.</p>
      <p>The magic trick: a row of switches is just a <b>binary number</b>. <code>1011</code> is 11. So "the set of visited cities" becomes an <b>array index</b>. A set fits in an <code>int</code>, and a DP table indexed by sets is just <code>dp[1 &lt;&lt; n]</code>.</p>`,
    explain: `<p><b>When do you reach for it?</b> When the input is <b>small</b> (n ≤ 20, sometimes ≤ 24) and the brute force would try every <b>order</b> (n! ways) or every <b>pairing</b>. 20! ≈ 2.4·10<sup>18</sup> — impossible. But 2<sup>20</sup> ≈ 10<sup>6</sup> subsets — easy. Bitmask DP turns "every order" into "every subset", because the future usually depends only on <i>which</i> items are used, not the order you used them in.</p>
      <h4>The 5 bit tricks you need</h4>
      ${H.table(['Goal', 'Code', 'Example (n = 4)'], [
        ['Is item j in the set?', '<code>(mask &gt;&gt; j &amp; 1) == 1</code>', 'mask 1011, j = 1 → yes'],
        ['Add item j', '<code>mask | (1 &lt;&lt; j)</code>', '1001 | 0100 = 1101'],
        ['Remove item j', '<code>mask &amp; ~(1 &lt;&lt; j)</code> or <code>mask ^ (1 &lt;&lt; j)</code> (if present)', '1101 → 1001'],
        ['How many items?', '<code>Integer.bitCount(mask)</code>', 'bitCount(1011) = 3'],
        ['All items', '<code>(1 &lt;&lt; n) - 1</code>', '1111 = 15']
      ])}
      <h4>Travelling Salesman (TSP) — the Held-Karp DP</h4>
      <p>n cities, a distance matrix. Start at city 0, visit every city exactly once, come back. Minimise the total distance.</p>
      <ul>
        <li><b>State</b>: <code>dp[mask][last]</code> = cheapest path that starts at city 0, visits <b>exactly</b> the cities in <code>mask</code>, and is standing at <code>last</code>.</li>
        <li><b>Start</b>: <code>dp[1][0] = 0</code> (only city 0 visited, standing at 0).</li>
        <li><b>Move</b>: from <code>(mask, last)</code> go to any unvisited <code>next</code>: <code>dp[mask | 1&lt;&lt;next][next] = min(…, dp[mask][last] + dist[last][next])</code>.</li>
        <li><b>Answer</b>: <code>min over last of dp[full][last] + dist[last][0]</code> (close the loop).</li>
      </ul>
      <p>Why loop masks in <b>increasing order</b>? Every move <i>adds</i> a bit, so the new mask is always a <b>bigger number</b>. By the time we read <code>dp[mask]</code>, every smaller mask that could lead into it is already final. Cost: 2<sup>n</sup>·n states × n moves = <b>O(2<sup>n</sup>·n<sup>2</sup>)</b>. For n = 16: about 16.7 million steps. Brute force 15! ≈ 1.3·10<sup>12</sup>.</p>
      <h4>Assignment — n workers, n jobs</h4>
      <p><code>cost[w][j]</code> = price if worker w does job j. Each worker gets one job. Clever observation: if we always assign workers <b>in order</b> (0, then 1, then 2…), then the mask of taken jobs already tells us <i>which worker is next</i>: it is <code>bitCount(mask)</code>. So we need only <code>dp[mask]</code>, not <code>dp[mask][worker]</code> → <b>O(2<sup>n</sup>·n)</b>.</p>
      ${H.arr(['000', '001', '010', '011', '100', '101', '110', '111'], { label: 'masks for n = 3 jobs (bitCount = number of workers already placed)', hl: { 0: 'g', 7: 'p' } })}`,
    clues: [
      '<b>n ≤ 20</b> (or ≤ 16 with an extra n factor) → 2<sup>n</sup> states is the intended budget',
      '"visit <b>all</b> nodes / cities / keys exactly once", "shortest route covering every point" → TSP-style dp[mask][last]',
      '"assign each worker to one job", "pair up", "match two arrays to minimise XOR / cost" with tiny n → dp[mask] with popcount trick',
      '"order does not matter, only which ones are used" → subset as state',
      '"split into groups" with n ≤ 16 → iterate submasks, O(3<sup>n</sup>)',
      'Brute force is n! permutations → replace "orders" by "sets"'
    ],
    code: [`
      // Held-Karp: Travelling Salesman in O(2^n * n^2) time, O(2^n * n) memory.
      int tsp(int[][] dist) {
          int n = dist.length, full = 1 << n;
          final int INF = Integer.MAX_VALUE / 2;          // halved so INF + edge does not overflow
          int[][] dp = new int[full][n];
          for (int[] row : dp) Arrays.fill(row, INF);
          dp[1][0] = 0;                                    // visited {0}, standing at city 0
          for (int mask = 1; mask < full; mask++) {
              if ((mask & 1) == 0) continue;               // every useful path contains the start city
              for (int last = 0; last < n; last++) {
                  if (dp[mask][last] >= INF) continue;     // unreachable state
                  for (int next = 0; next < n; next++) {
                      if ((mask >> next & 1) == 1) continue; // already visited
                      int nm = mask | (1 << next);
                      int cand = dp[mask][last] + dist[last][next];
                      if (cand < dp[nm][next]) dp[nm][next] = cand;
                  }
              }
          }
          int best = INF;
          for (int last = 1; last < n; last++)             // close the tour back to city 0
              best = Math.min(best, dp[full - 1][last] + dist[last][0]);
          return n == 1 ? 0 : best;
      }`, { lang: 'python', code: `# Held-Karp TSP + assignment in Python (runnable)
def tsp(dist):
    n = len(dist)
    full = 1 << n
    INF = float('inf')
    dp = [[INF] * n for _ in range(full)]
    dp[1][0] = 0
    for mask in range(1, full, 2):            # only masks containing city 0
        for last in range(n):
            cur = dp[mask][last]
            if cur == INF:
                continue
            for nxt in range(n):
                if mask >> nxt & 1:
                    continue
                nm = mask | 1 << nxt
                if cur + dist[last][nxt] < dp[nm][nxt]:
                    dp[nm][nxt] = cur + dist[last][nxt]
    return min(dp[full - 1][j] + dist[j][0] for j in range(1, n))

def assignment(cost):
    n = len(cost)
    dp = [float('inf')] * (1 << n)
    dp[0] = 0
    for mask in range(1 << n):
        w = bin(mask).count('1')               # next worker to place
        if w == n or dp[mask] == float('inf'):
            continue
        for job in range(n):
            if not mask >> job & 1:
                nm = mask | 1 << job
                dp[nm] = min(dp[nm], dp[mask] + cost[w][job])
    return dp[-1]

D = [[0, 10, 15, 20], [10, 0, 35, 25], [15, 35, 0, 30], [20, 25, 30, 0]]
print("TSP tour cost:", tsp(D))                          # 80  (0-1-3-2-0)
print("assignment:", assignment([[9, 2, 7], [6, 4, 3], [5, 8, 1]]))  # 9`, run: true, title: 'Both DPs in Python (runnable)' }],
    codeTitle: ['Held-Karp TSP (Java)', 'TSP + Assignment (Python, runnable)'],
    viz: [{
      title: 'Held-Karp: filling dp[mask][last] one move at a time',
      input: '0 10 15 20; 10 0 35 25; 15 35 0 30; 20 25 30 0',
      inputLabel: 'Distance matrix: rows separated by ";" (2 to 5 cities)',
      gen: function (input) {
        var rowsTxt = String(input === undefined || input === null ? '' : input).split(';').map(function (r) { return r.trim(); }).filter(function (r) { return r.length; });
        var n = rowsTxt.length;
        if (n < 2 || n > 5) throw new Error('Give 2 to 5 rows separated by ";" e.g. "0 4 1; 4 0 2; 1 2 0"');
        var d = rowsTxt.map(function (r) { return parseNums(r, 'each matrix row', n, n, 0, 999); });
        var full = 1 << n, INF = Infinity, dp = [], m, j, k;
        for (m = 0; m < full; m++) { var row = []; for (j = 0; j < n; j++) row.push(INF); dp.push(row); }
        dp[1][0] = 0;
        var shown = []; for (m = 1; m < full; m += 2) shown.push(m);
        var cities = []; for (j = 0; j < n; j++) cities.push('city ' + j);
        function grid(hl) {
          return { type: 'grid', label: 'dp[mask][last] (rows = visited set, · = last not in mask)', rowHead: shown.map(function (mm) { return bin(mm, n); }), colHead: cities,
            rows: shown.map(function (mm) { return dp[mm].map(function (v, jj) { return (mm >> jj & 1) ? show(v) : '·'; }); }), hl: hl || {} };
        }
        var frames = [];
        frames.push({ narr: 'Start: only city 0 is visited (mask <b>' + bin(1, n) + '</b>) and we stand on it, cost 0. Every other state is ∞ (not reached yet). We only list masks that contain city 0 — every real tour starts there.', parts: [
          { type: 'bits', label: 'mask (bit j = city j visited)', value: 1, width: n, hl: { 0: 'ok' } }, grid(one('0,0', 'ok')) ] });
        for (var si = 0; si < shown.length; si++) {
          m = shown[si];
          for (j = 0; j < n; j++) {
            if (!(m >> j & 1) || dp[m][j] === INF) continue;
            for (k = 0; k < n; k++) {
              if (m >> k & 1) continue;
              var nm = m | (1 << k), cand = dp[m][j] + d[j][k], better = cand < dp[nm][k];
              var old = dp[nm][k];
              if (better) dp[nm][k] = cand;
              var hl = {}; hl[si + ',' + j] = 'cur'; hl[shown.indexOf(nm) + ',' + k] = better ? 'ok' : 'bad';
              var bh = {}; bh[j] = 'cur'; bh[k] = 'ok';
              frames.push({ narr: 'From mask <b>' + bin(m, n) + '</b> standing at city ' + j + ' (cost ' + dp[m][j] + '), walk to unvisited city ' + k + ' for ' + d[j][k] + ' → candidate <b>' + cand + '</b> for state (' + bin(nm, n) + ', ' + k + '). ' +
                (better ? '<span class="c-g">Better than ' + show(old) + ' → store it.</span>' : '<span class="c-r">Not better than ' + old + ' → ignore.</span>') + ' Masks only grow, so the new row is always further down the table.',
                parts: [{ type: 'bits', label: 'mask → new mask ' + bin(nm, n), value: m, width: n, hl: bh }, grid(hl), { type: 'vars', vals: { mask: bin(m, n), last: j, next: k, candidate: cand, stored: show(dp[nm][k]) }, hl: { stored: better ? 'ok' : 'bad' } }] });
            }
          }
        }
        var best = INF, bestJ = -1, fr = shown.length - 1;
        for (j = 1; j < n; j++) {
          var tot = dp[full - 1][j] + d[j][0];
          var h2 = {}; h2[fr + ',' + j] = tot < best ? 'sel' : 'bad';
          if (tot < best) { best = tot; bestJ = j; }
          frames.push({ narr: 'All cities visited, ending at city ' + j + ': path cost ' + show(dp[full - 1][j]) + ' + return edge ' + d[j][0] + ' = <b>' + show(tot) + '</b>. Best tour so far: <b>' + show(best) + '</b>.', parts: [grid(h2), { type: 'vars', vals: { last: j, closeTour: show(tot), best: show(best) }, hl: { best: 'sel' } }] });
        }
        frames.push({ narr: '<b>Answer: ' + show(best) + '</b> (the tour ends at city ' + bestJ + ' before returning). We touched about 2<sup>n</sup>·n<sup>2</sup> transitions instead of (n−1)! full tours. For n = 20 that is 4·10<sup>8</sup> vs 1.2·10<sup>17</sup>.', parts: [grid(one(fr + ',' + bestJ, 'sel')), { type: 'text', html: 'Tip: store a <b>parent[mask][last]</b> table to walk back and print the actual route.' }] });
        return frames;
      }
    }, {
      title: 'Assignment DP: dp[mask] with the popcount trick',
      input: '9 2 7; 6 4 3; 5 8 1',
      inputLabel: 'cost[worker][job]: rows separated by ";" (2 to 4 workers)',
      gen: function (input) {
        var rowsTxt = String(input === undefined || input === null ? '' : input).split(';').map(function (r) { return r.trim(); }).filter(function (r) { return r.length; });
        var n = rowsTxt.length;
        if (n < 2 || n > 4) throw new Error('Give 2 to 4 rows separated by ";" e.g. "9 2; 6 4"');
        var c = rowsTxt.map(function (r) { return parseNums(r, 'each cost row', n, n, 0, 999); });
        var full = 1 << n, dp = [], m, job, frames = [];
        for (m = 0; m < full; m++) dp.push(Infinity);
        dp[0] = 0;
        var labels = []; for (m = 0; m < full; m++) labels.push(bin(m, n));
        function bars(hl) { return { type: 'array', label: 'dp[mask] = cheapest way to give the jobs in mask to the first bitCount(mask) workers', values: dp.map(show), idxLabels: labels, hl: hl || {} }; }
        frames.push({ narr: 'dp[' + bin(0, n) + '] = 0: nobody placed, no job taken. The next worker is always <b>bitCount(mask)</b> — so worker order is fixed and the mask alone is enough state.', parts: [bars(one(0, 'ok')), { type: 'grid', label: 'cost[worker][job]', rows: c, rowHead: c.map(function (_, i) { return 'W' + i; }), colHead: c.map(function (_, i) { return 'J' + i; }) }] });
        for (m = 0; m < full; m++) {
          if (dp[m] === Infinity) continue;
          var w = popcount(m);
          if (w === n) continue;
          for (job = 0; job < n; job++) {
            if (m >> job & 1) continue;
            var nm = m | (1 << job), cand = dp[m] + c[w][job], better = cand < dp[nm], old = dp[nm];
            if (better) dp[nm] = cand;
            var hl = {}; hl[m] = 'cur'; hl[nm] = better ? 'ok' : 'bad';
            var gh = {}; gh[w + ',' + job] = 'cur';
            frames.push({ narr: 'mask ' + bin(m, n) + ' has ' + w + ' job(s) taken → next is <b>worker ' + w + '</b>. Give him job ' + job + ' (cost ' + c[w][job] + '): ' + dp[m] + ' + ' + c[w][job] + ' = ' + cand + (better ? ' <span class="c-g">improves dp[' + bin(nm, n) + '] from ' + show(old) + '</span>' : ' <span class="c-r">not better than ' + old + '</span>') + '.',
              parts: [bars(hl), { type: 'grid', label: 'cost[worker][job]', rows: c, rowHead: c.map(function (_, i) { return 'W' + i; }), colHead: c.map(function (_, i) { return 'J' + i; }), hl: gh }] });
          }
        }
        frames.push({ narr: '<b>Answer dp[' + bin(full - 1, n) + '] = ' + dp[full - 1] + '</b>. Only 2<sup>n</sup> states × n jobs = O(2<sup>n</sup>·n) work, versus n! permutations.', parts: [bars(one(full - 1, 'sel'))] });
        return frames;
      }
    }],
    examples: [
      { title: 'TSP by hand on 4 cities', html: `<p>Matrix (symmetric): d(0,1)=10, d(0,2)=15, d(0,3)=20, d(1,2)=35, d(1,3)=25, d(2,3)=30.</p>
        ${H.table(['state (mask, last)', 'how we got there', 'cost'], [
          ['(0011, 1)', '0 → 1', '10'], ['(0101, 2)', '0 → 2', '15'], ['(1011, 3)', '0 → 1 → 3', '10 + 25 = 35'],
          ['(1101, 2)', '0 → 3 → 2', '20 + 30 = 50 (vs 0→2→3 is a different last)'], ['(1111, 2)', '0 → 1 → 3 → 2', '35 + 30 = 65'], ['close', '65 + d(2,0) = 65 + 15', '<span class="c-g">80</span>']
        ])}<p>The 3! = 6 tours collapse into a handful of shared states. With n = 18 the saving is astronomical.</p>` },
      { title: 'Shortest Path Visiting All Nodes (LC 847) — BFS over (mask, node)', html: `<p>Unweighted graph, n ≤ 12, you may start anywhere and revisit nodes. Because edges have weight 1, plain <b>BFS</b> over states <code>(mask, node)</code> finds the shortest walk. Seed the queue with every <code>(1&lt;&lt;i, i)</code> at distance 0; stop when a state has mask = full. States: 2<sup>12</sup>·12 ≈ 49 000.</p>`, code: `int shortestPathLength(int[][] graph) {
    int n = graph.length, full = (1 << n) - 1;
    boolean[][] seen = new boolean[1 << n][n];
    ArrayDeque<int[]> q = new ArrayDeque<>();
    for (int i = 0; i < n; i++) { q.add(new int[]{1 << i, i}); seen[1 << i][i] = true; }
    for (int steps = 0; !q.isEmpty(); steps++) {
        for (int sz = q.size(); sz > 0; sz--) {
            int[] s = q.poll();
            if (s[0] == full) return steps;
            for (int nb : graph[s[1]]) {
                int nm = s[0] | (1 << nb);
                if (!seen[nm][nb]) { seen[nm][nb] = true; q.add(new int[]{nm, nb}); }
            }
        }
    }
    return -1;
}` },
      { title: 'Grouping with submask enumeration: Minimum Number of Work Sessions (LC 1986)', html: `<p>Tasks (n ≤ 14) must be packed into sessions of length ≤ T. Precompute <code>ok[sub]</code> = "sum of sub ≤ T". Then <code>dp[mask] = 1 + min dp[mask ^ sub]</code> over non-empty submasks <code>sub</code> of <code>mask</code> with <code>ok[sub]</code>. The loop <code>for (sub = mask; sub &gt; 0; sub = (sub - 1) &amp; mask)</code> walks every submask. Total work over all masks is <b>3<sup>n</sup></b> (each element is: out of mask, in mask but not in sub, or in sub). 3<sup>14</sup> ≈ 4.8 million.</p>`, code: `int minSessions(int[] tasks, int T) {
    int n = tasks.length, full = 1 << n;
    boolean[] ok = new boolean[full];
    for (int m = 0; m < full; m++) {
        int s = 0;
        for (int i = 0; i < n; i++) if ((m >> i & 1) == 1) s += tasks[i];
        ok[m] = s <= T;
    }
    int[] dp = new int[full];
    Arrays.fill(dp, Integer.MAX_VALUE / 2);
    dp[0] = 0;
    for (int m = 1; m < full; m++)
        for (int sub = m; sub > 0; sub = (sub - 1) & m)   // every non-empty submask
            if (ok[sub]) dp[m] = Math.min(dp[m], dp[m ^ sub] + 1);
    return dp[full - 1];
}` },
      { title: 'Memory check before you code', html: `<p>dp[2<sup>20</sup>][20] of <code>int</code> = 2<sup>20</sup>·20·4 bytes ≈ <b>84 MB</b> — risky on a 256 MB judge in Java (object headers for 2<sup>20</sup> small arrays add ~16 MB more). Fixes: flatten to <code>int[(1&lt;&lt;n)*n]</code>, drop the start bit (fix city 0, store only masks of the other n−1 cities → half the memory), or use <code>short</code>/<code>float</code> when values fit.</p>` }
    ],
    deepDive: `<p><b>Why it is correct (optimal substructure).</b> Any optimal tour prefix that visits set S and ends at v must itself be the cheapest path over S ending at v — otherwise swap in the cheaper one and the whole tour improves. That "cut-and-paste" argument is exactly what lets dp[S][v] forget the order.</p>
      <p><b>Complexity reality.</b> Held-Karp (1962) is still the best <i>exact</i> worst-case algorithm known for general TSP: Θ(2<sup>n</sup>n<sup>2</sup>) time, Θ(2<sup>n</sup>n) memory. TSP is NP-hard, so nobody expects polynomial time. Real routing (delivery fleets, PCB drilling) uses heuristics — 2-opt, Lin-Kernighan, OR-Tools' local search — or branch-and-cut (Concorde solved 85 900-city instances). Bitmask DP is for <b>small exact</b> sub-problems: n ≤ 20 pick-up points, "visit all keys" puzzles.</p>
      <p><b>Speed tricks.</b> (1) Skip masks without the start bit (halves work). (2) Iterate only set/unset bits with <code>Integer.numberOfTrailingZeros</code> and <code>bits &amp;= bits - 1</code>. (3) Store <code>dp[last][mask]</code> or flatten so the inner loop walks memory sequentially. (4) Prune <code>dp == INF</code> states early.</p>
      <p><b>Assignment problem.</b> dp[mask] is O(2<sup>n</sup>n) — fine for n ≤ 20. For n = 500 you need the <b>Hungarian algorithm</b> (O(n<sup>3</sup>)) or min-cost flow; know that this exists and say it in interviews. For pairing <i>within one set</i> (pair 2n people) the trick is: always pair the <b>lowest unpaired index</b> with someone → O(2<sup>n</sup>·n).</p>
      <p><b>Submask enumeration</b> <code>sub = (sub - 1) &amp; mask</code> works because subtracting 1 flips the lowest set bit and all zeros below it; AND-ing with mask throws away bits outside mask. It visits submasks in decreasing numeric order, and summed over all masks gives 3<sup>n</sup>. Related: <b>broken-profile DP</b> (tiling a grid row by row, mask = which cells of the frontier are filled) and <b>SOS DP</b> (topic 8), which beats 3<sup>n</sup> for sum-style aggregates.</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant writes Held-Karp in seconds — it is one of the most-copied DP templates on the internet. The interview value moved to <b>recognising</b> that "n ≤ 16 + every order" means subsets, choosing the right state (do you need <code>last</code>? does popcount make the worker implicit?), and doing the <b>memory math</b> before the judge kills your program.</p>
      <p><b>Use AI as a partner:</b> "Here is my state dp[mask][last]. Give me 3 tiny inputs where forgetting the return edge or the n = 1 case gives a wrong answer." Or ask it to translate your Java into a flattened-array version and then <i>you</i> verify the indexing.</p>
      <p><b>Where AI goes wrong:</b> it happily proposes bitmask DP for n = 40 (2<sup>40</sup> is 10<sup>12</sup> — meet-in-the-middle or a different idea is needed), forgets <code>INF + w</code> overflow, iterates submasks with an infinite loop when <code>sub = 0</code> is not handled, or uses 2D <code>Integer</code> boxing that blows memory. In production, an agent asked to "optimise the delivery route" should call a solver (OR-Tools) — not run 2<sup>n</sup> DP on 200 stops. <b>You own:</b> the state design, the complexity budget and the judgement call "exact DP vs heuristic".</p>`,
    problems: [{
      title: 'Minimum Cost Worker–Job Assignment',
      level: 'Medium', tags: ['bitmask dp', 'assignment', 'popcount'], companies: ['Google', 'Uber', 'Amazon'],
      statement: `<p>There are <code>n</code> workers and <code>n</code> jobs. <code>cost[w][j]</code> is what worker <code>w</code> charges for job <code>j</code>. Every worker must do <b>exactly one</b> job and every job must be done by exactly one worker. Return the <b>minimum total cost</b>.</p>`,
      constraints: `1 ≤ n ≤ 20, 0 ≤ cost[w][j] ≤ 10<sup>4</sup>`,
      example: `${H.table(['', 'J0', 'J1', 'J2'], [['W0', '9', '<span class="c-g">2</span>', '7'], ['W1', '<span class="c-g">6</span>', '4', '3'], ['W2', '5', '8', '<span class="c-g">1</span>']])}<p>Output <b>9</b>: W0→J1 (2) + W1→J0 (6) + W2→J2 (1). Greedy "each worker takes his cheapest free job" gives W0→J1 (2), W1→J2 (3), W2→J0 (5) = 10 — <span class="c-r">worse</span>, so we need DP.</p>`,
      brute: { why: `<p>Try every permutation of jobs: n! orders. For n = 20 that is 2.4·10<sup>18</sup>. The waste: the permutations "J1,J0,…" and "J0,J1,…" lead to the <i>same</i> leftover problem (jobs 0 and 1 gone, worker 2 next), yet brute force solves that leftover again and again.</p>`, code: `
        int best;
        int bruteAssign(int[][] cost) {
            best = Integer.MAX_VALUE;
            go(cost, 0, new boolean[cost.length], 0);
            return best;
        }
        void go(int[][] cost, int w, boolean[] used, int sum) {
            if (w == cost.length) { best = Math.min(best, sum); return; }
            for (int j = 0; j < cost.length; j++) {
                if (used[j]) continue;
                used[j] = true;
                go(cost, w + 1, used, sum + cost[w][j]);   // worker w takes job j
                used[j] = false;
            }
        }` },
      mcq: { q: 'Jobs {0, 2} are already taken (mask 101). Which worker must be assigned next if we always fill workers in order?', options: ['Worker 0', 'Worker 1', 'Worker 2', 'It depends on the order the jobs were taken'], answer: 2, explain: 'Two jobs are taken, so workers 0 and 1 are done; the next is worker bitCount(101) = 2. The order of the earlier choices does not matter — that is why one index (the mask) is enough.' },
      hints: [`<p><b>Aha:</b> after placing some workers, the only thing that matters for the rest is <i>which jobs are gone</i>. That set is a bitmask.</p>`, `<p>Assign workers in fixed order 0, 1, 2… Then the next worker is <code>bitCount(mask)</code>, so the state is just <code>dp[mask]</code>. Transition: try every free job.</p>`, `<p>Recipe: dp[0] = 0, rest = ∞. For mask from 0 up: w = bitCount(mask); if w == n skip; for each free job j: dp[mask | 1&lt;&lt;j] = min(…, dp[mask] + cost[w][j]). Answer dp[(1&lt;&lt;n) − 1]. Edge: n = 1 → cost[0][0].</p>`],
      solution: {
        approach: `<p>Bitmask DP over the set of taken jobs. Increasing mask order is a valid topological order because every transition adds a bit. O(2<sup>n</sup>·n) time, O(2<sup>n</sup>) memory (4 MB for n = 20).</p>`,
        code: `
          class Solution {
              public int minCost(int[][] cost) {
                  int n = cost.length, full = 1 << n;
                  int[] dp = new int[full];
                  Arrays.fill(dp, Integer.MAX_VALUE);
                  dp[0] = 0;                                     // no job taken yet
                  for (int mask = 0; mask < full; mask++) {
                      if (dp[mask] == Integer.MAX_VALUE) continue; // unreachable (never happens here, but safe)
                      int worker = Integer.bitCount(mask);         // next worker in fixed order
                      if (worker == n) continue;
                      for (int job = 0; job < n; job++) {
                          if ((mask & (1 << job)) != 0) continue;  // job already taken
                          int next = mask | (1 << job);
                          dp[next] = Math.min(dp[next], dp[mask] + cost[worker][job]);
                      }
                  }
                  return dp[full - 1];
              }
          }`,
        alt: [{ lang: 'python', code: `def min_cost(cost):
    n = len(cost)
    INF = float('inf')
    dp = [INF] * (1 << n)
    dp[0] = 0
    for mask in range(1 << n):
        w = bin(mask).count('1')
        if w == n:
            continue
        for job in range(n):
            if not mask >> job & 1:
                nm = mask | 1 << job
                dp[nm] = min(dp[nm], dp[mask] + cost[w][job])
    return dp[-1]

print(min_cost([[9, 2, 7], [6, 4, 3], [5, 8, 1]]))  # 9`, run: true }, { lang: 'cpp', code: `int minCost(vector<vector<int>>& cost) {
    int n = cost.size(), full = 1 << n;
    vector<int> dp(full, INT_MAX);
    dp[0] = 0;
    for (int mask = 0; mask < full; mask++) {
        int w = __builtin_popcount(mask);
        if (w == n || dp[mask] == INT_MAX) continue;
        for (int j = 0; j < n; j++)
            if (!(mask >> j & 1))
                dp[mask | 1 << j] = min(dp[mask | 1 << j], dp[mask] + cost[w][j]);
    }
    return dp[full - 1];
}` }],
        dry: { head: ['mask', 'dp[mask]', 'worker', 'transitions (job: new value)'], rows: [
          ['000', '0', 'W0', 'J0 → dp[001]=9, J1 → dp[010]=2, J2 → dp[100]=7'],
          ['001', '9', 'W1', 'J1 → dp[011]=13, J2 → dp[101]=12'],
          ['010', '2', 'W1', 'J0 → dp[011]=min(13, 8)=<span class="c-g">8</span>, J2 → dp[110]=5'],
          ['011', '8', 'W2', 'J2 → dp[111]=9'],
          ['100', '7', 'W1', 'J0 → dp[101]=min(12,13)=12, J1 → dp[110]=min(5,11)=5'],
          ['101', '12', 'W2', 'J1 → dp[111]=min(9, 20)=9'],
          ['110', '5', 'W2', 'J0 → dp[111]=min(9, 10)=<span class="c-g">9</span>']
        ] },
        complexity: `<p>Time O(2<sup>n</sup>·n) ≈ 2·10<sup>7</sup> for n = 20. Space O(2<sup>n</sup>).</p>`,
        followUps: ['Reconstruct which worker got which job (store the chosen job per mask).', 'n = 500? → Hungarian algorithm O(n<sup>3</sup>) or min-cost max-flow.', 'Minimum XOR Sum of Two Arrays (LC 1879) is this exact problem with cost = a[i] XOR b[j].']
      }
    }]
  });

  // =====================================================================
  // TOPIC 2 — Digit DP
  // =====================================================================
  topics.push({
    title: 'Digit DP: Counting Numbers in [L, R] with a Property',
    analogy: `<p>Think of a <b>car odometer</b> or a bike lock with digit wheels. To count every lock code from <code>0000</code> to <code>3245</code> whose digits add up to 9, you don't spin through all 3 246 codes. You reason wheel by wheel: "If the first wheel shows 0, 1 or 2 — anything smaller than 3 — the remaining three wheels are <b>completely free</b> (000 to 999), and I can look up how many free 3-wheel codes sum to what I still need. If the first wheel shows exactly 3, I'm still <b>hugging the limit</b> and must be careful on the next wheel."</p>
      <p>"Hugging the limit" is the famous <b>tight</b> flag. Once you go below the limit on any wheel, you're <b>free</b> forever after — and free sub-problems repeat, so we remember (memoise) them.</p>`,
    explain: `<p><b>Digit DP</b> answers questions like "<i>how many integers between L and R (up to 10<sup>18</sup>) have property P?</i>" where P depends on the <b>digits</b>: digit sum, no repeated digit, no "13" inside, divisible by K, number of 1s, digits non-decreasing…</p>
      <h4>Step 1 — turn a range into two prefixes</h4>
      <p>count(L..R) = <b>f(R) − f(L − 1)</b>, where f(N) counts numbers in [0, N]. Now we only fight one upper limit.</p>
      <h4>Step 2 — fill digits from left to right</h4>
      <p>Write N as a digit string, e.g. N = 3245 → <code>[3, 2, 4, 5]</code>. Build a number digit by digit. The state is:</p>
      <ul>
        <li><code>pos</code> — which digit we are choosing.</li>
        <li><code>tight</code> — are all digits so far <b>equal</b> to N's? If yes, this digit can go only up to <code>N[pos]</code>; otherwise 0..9.</li>
        <li><code>started</code> — have we placed a non-zero digit yet? (Only needed when leading zeros would break the property, e.g. "all digits distinct": 007 is really 7.)</li>
        <li><b>the property's memory</b> — digit sum so far, sum mod K, a 10-bit mask of used digits, the last digit… whatever P needs.</li>
      </ul>
      ${H.table(['pos', 'N digit', 'tight path so far', 'choices if tight', 'choices if free'], [['0', '3', '—', '0..3', '0..9'], ['1', '2', '3', '0..2', '0..9'], ['2', '4', '32', '0..4', '0..9'], ['3', '5', '324', '0..5', '0..9']])}
      <h4>Step 3 — memoise the free states</h4>
      <p><code>go(pos, state, tight)</code> returns how many ways to finish. When <code>tight = false</code> the answer depends only on <code>(pos, state)</code> — the same for every number that reaches it — so cache it. The tight path is a single chain (only one prefix equals N's prefix), so it needs no cache.</p>
      <p><b>Cost</b> = positions × states × 10 digits. Digit sum ≤ 162 for 18 digits → 19 × 163 × 10 ≈ 31 000 steps, instead of 10<sup>18</sup>.</p>`,
    clues: [
      '<b>L, R up to 10<sup>18</sup></b> (or given as strings with 100+ digits) + "how many numbers in the range…" → digit DP',
      'property talks about <b>digits</b>: "digit sum", "no two adjacent equal digits", "all digits unique", "contains 13", "count of digit 1"',
      '"count numbers ≤ N whose digit sum is divisible by K / is prime" → state = sum mod K',
      '"how many integers in [L, R] are <b>stepping / monotone / lucky</b> numbers" → state = last digit',
      '"find the K-th smallest number with property P" → digit DP counts + greedy walk',
      'answer = f(R) − f(L − 1) is possible whenever the property is a pure count'
    ],
    code: [`
      // Generic digit DP template: count x in [0, N] with (digit sum % K == 0).
      // Swap the 'rem' state and the final check to solve other digit problems.
      class DigitDP {
          char[] d;            // digits of N
          int K;
          long[][] memo;       // memo[pos][rem], only for non-tight states

          long count(long n, int K) {
              if (n < 0) return 0;
              this.K = K;
              d = Long.toString(n).toCharArray();
              memo = new long[d.length][K];
              for (long[] row : memo) Arrays.fill(row, -1);
              return go(0, 0, true);
          }

          long go(int pos, int rem, boolean tight) {
              if (pos == d.length) return rem == 0 ? 1 : 0;      // a full number was built
              if (!tight && memo[pos][rem] != -1) return memo[pos][rem];
              int limit = tight ? d[pos] - '0' : 9;              // tight → cannot exceed N's digit
              long res = 0;
              for (int dig = 0; dig <= limit; dig++)
                  res += go(pos + 1, (rem + dig) % K, tight && dig == limit);
              if (!tight) memo[pos][rem] = res;
              return res;
          }

          long countRange(long L, long R, int K) { return count(R, K) - count(L - 1, K); }
      }`, { lang: 'python', code: `from functools import lru_cache

def count_upto(n, k):
    """How many x in [0, n] have digit sum divisible by k."""
    if n < 0:
        return 0
    digits = list(map(int, str(n)))

    @lru_cache(maxsize=None)
    def go(pos, rem, tight):
        if pos == len(digits):
            return 1 if rem == 0 else 0
        limit = digits[pos] if tight else 9
        return sum(go(pos + 1, (rem + d) % k, tight and d == limit) for d in range(limit + 1))

    return go(0, 0, True)

def count_range(lo, hi, k):
    return count_upto(hi, k) - count_upto(lo - 1, k)

# sanity check against brute force on a small range
brute = sum(1 for x in range(1, 2001) if sum(map(int, str(x))) % 7 == 0)
print(count_range(1, 2000, 7), brute)             # equal
print(count_range(1, 10**18, 9))                   # instant: 111111111111111111`, run: true, title: 'Python with lru_cache (runnable)' }],
    codeTitle: ['Digit DP template (Java)', 'Digit DP in Python + brute-force check'],
    viz: {
      title: 'Walking along N: free completions + the tight path',
      input: '3245 | 9',
      inputLabel: 'N | target digit sum S  (N ≤ 999999, S ≤ 30)',
      gen: function (input) {
        var p = splitBar(input, 2, '"3245 | 9"');
        var N = parseNums(p[0], 'N', 1, 1, 0, 999999)[0], S = parseNums(p[1], 'S', 1, 1, 0, 30)[0];
        var D = String(N).split('').map(Number), L = D.length, s, len, dd, frames = [];
        var ways = [];
        for (len = 0; len < L; len++) { var row = []; for (s = 0; s <= S; s++) row.push(0); ways.push(row); }
        ways[0][0] = 1;
        for (len = 1; len < L; len++) for (s = 0; s <= S; s++) { var t = 0; for (dd = 0; dd <= 9 && dd <= s; dd++) t += ways[len - 1][s - dd]; ways[len][s] = t; }
        var colHead = []; for (s = 0; s <= S; s++) colHead.push('Σ' + s);
        var rowHead = []; for (len = 0; len < L; len++) rowHead.push(len + ' free');
        function grid(hl) { return { type: 'grid', label: 'ways[k][s] = how many k-digit strings (leading zeros ok) have digit sum s', rows: ways, rowHead: rowHead, colHead: colHead, hl: hl || {} }; }
        function digits(i, hl) { var h = {}; for (var q = 0; q < i; q++) h[q] = 'done'; if (hl !== undefined && i < L) h[i] = hl; return { type: 'array', label: 'digits of N = ' + N, values: D, hl: h, ptr: i < L ? one(i, 'pos') : {} }; }
        var ans = 0, prefix = 0;
        frames.push({ narr: 'Count numbers in [0, ' + N + '] with digit sum exactly <b>' + S + '</b>. First precompute <b>ways[k][s]</b>: the number of free k-digit tails with digit sum s (each row = previous row "shifted" by digits 0..9).', parts: [digits(0), grid()] });
        for (var i = 0; i < L; i++) {
          var rem = L - i - 1;
          for (dd = 0; dd < D[i]; dd++) {
            var need = S - prefix - dd, add = (need >= 0 && need <= S) ? ways[rem][need] : 0;
            ans += add;
            var hl = {}; if (need >= 0) hl[rem + ',' + need] = 'ok';
            frames.push({ narr: 'Position ' + i + ': put <b>' + dd + '</b> (smaller than N\'s digit ' + D[i] + ') → we are now <b>free</b>. The ' + rem + ' remaining digit(s) must sum to ' + S + ' − ' + prefix + ' − ' + dd + ' = <b>' + need + '</b>. ' + (need >= 0 ? 'Look up ways[' + rem + '][' + need + '] = ' + add + '.' : 'Negative → impossible, add 0.') + ' Running answer = <b>' + ans + '</b>.',
              parts: [digits(i, 'cur'), grid(hl), { type: 'vars', vals: { pos: i, tightPrefixSum: prefix, digit: dd, freeDigitsLeft: rem, need: need, added: add, answer: ans }, hl: { added: 'ok', answer: 'sel' } }] });
          }
          prefix += D[i];
          frames.push({ narr: 'Now take N\'s own digit <b>' + D[i] + '</b> at position ' + i + ' and stay <b>tight</b> (still hugging N). Tight prefix sum becomes ' + prefix + '.' + (prefix > S ? ' <span class="c-r">That already exceeds ' + S + ', so the tight path can never succeed — stop.</span>' : ''), parts: [digits(i + 1), { type: 'vars', vals: { tightPrefixSum: prefix, answer: ans }, hl: { tightPrefixSum: prefix > S ? 'bad' : 'cur' } }] });
          if (prefix > S) break;
        }
        if (prefix === S) ans += 1;
        frames.push({ narr: (prefix === S ? 'N itself has digit sum ' + S + ', so add 1. ' : 'N itself does not have digit sum ' + S + '. ') + '<b>Answer: ' + ans + '</b> numbers in [0, ' + N + ']. We did about 10 lookups per digit instead of scanning ' + (N + 1) + ' numbers.', parts: [digits(L), { type: 'vars', vals: { N: N, S: S, answer: ans }, hl: { answer: 'sel' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Digit sum = 9 for numbers up to 3245', html: `<p>First digit 0, 1 or 2 → the last 3 digits are free and must sum to 9, 8, 7 → ways 55 + 45 + 36 = 136. First digit 3 (tight), second digit 0 or 1 → 2 free digits summing to 6 or 5 → 7 + 6 = 13. Prefix 32, third digit 0..3 → last digit = 4, 3, 2, 1 → 4 ways. Prefix 324 needs last digit 0 (&lt; 5) → 1 way. Total <b>136 + 13 + 4 + 1 = 154</b>. Try it in the visualizer.</p>` },
      { title: 'No two adjacent digits equal (state = last digit)', html: `<p>Count x in [1, N] like 1213 (ok) but not 1223. State: <code>(pos, last, tight, started)</code>. Before starting, zeros are leading zeros and do not count as "last". Size: 19 × 11 × 2 × 2 states — tiny.</p>`, code: `char[] d; Long[][] memo;   // memo[pos][last+1] for free, started states

long countNoAdjEqual(long n) {
    d = Long.toString(n).toCharArray();
    memo = new Long[d.length][11];
    return go(0, -1, true, false) - 1;            // minus the number 0
}
long go(int pos, int last, boolean tight, boolean started) {
    if (pos == d.length) return 1;
    if (!tight && started && memo[pos][last + 1] != null) return memo[pos][last + 1];
    int limit = tight ? d[pos] - '0' : 9;
    long res = 0;
    for (int dig = 0; dig <= limit; dig++) {
        boolean nowStarted = started || dig != 0;
        if (nowStarted && started && dig == last) continue;      // two equal neighbours
        res += go(pos + 1, nowStarted ? dig : -1, tight && dig == limit, nowStarted);
    }
    if (!tight && started) memo[pos][last + 1] = res;
    return res;
}` },
      { title: 'Number of Digit One (LC 233): carry a count, not a yes/no', html: `<p>"Total number of digit 1 appearing in all numbers ≤ n". The state must carry <b>how many 1s so far</b>; at the end return that count instead of 1/0. State (pos, ones, tight): 10 × 10 × 2. The pattern "return a sum over completions instead of a count" covers "sum of digit sums" too.</p>`, code: `char[] s; Integer[][] memo;
int countDigitOne(int n) {
    s = String.valueOf(n).toCharArray();
    memo = new Integer[s.length][s.length + 1];
    return go(0, 0, true);
}
int go(int pos, int ones, boolean tight) {
    if (pos == s.length) return ones;                    // this number contributes 'ones'
    if (!tight && memo[pos][ones] != null) return memo[pos][ones];
    int limit = tight ? s[pos] - '0' : 9, res = 0;
    for (int dig = 0; dig <= limit; dig++)
        res += go(pos + 1, ones + (dig == 1 ? 1 : 0), tight && dig == limit);
    if (!tight) memo[pos][ones] = res;
    return res;
}` },
      { title: 'K-th number with a property (counting + greedy descent)', html: `<p>"Find the K-th smallest positive integer whose digit sum is 10" — no upper bound! Fix the length first (count how many 1-, 2-, 3-digit numbers qualify using the free table), then pick digits left to right: try digit d, count completions with the free table; if K ≤ count, keep d, else K −= count and try d + 1. This is the same ways[k][s] table from the visualizer used in reverse.</p>` }
    ],
    deepDive: `<p><b>Why caching only free states is enough.</b> For a fixed position there is exactly one tight prefix (N's own), so tight states form a single chain of length ≤ 19. Everything that branches off the chain is free, and free states with equal (pos, property-state) are identical sub-problems. Some people put <code>tight</code> in the memo key — also correct, but you must <b>clear the memo for every new N</b>.</p>
      <p><b>Reusing the memo across many queries.</b> Index free states by <b>digits remaining</b> instead of <code>pos</code>. "3 free digits, need sum 7" means the same thing for every N, so one table answers 10<sup>5</sup> queries. The visualizer's <code>ways[k][s]</code> is exactly that.</p>
      <p><b>Leading zeros.</b> Properties like "digit sum" ignore them (0 adds 0), but "all digits distinct", "count of zeros", "adjacent digits differ", "number is non-decreasing" break if you treat 007 as having two zeros. Add a <code>started</code> flag and only update the property once started.</p>
      <p><b>When f(R) − f(L−1) fails.</b> If you need a min/max/K-th answer, or L, R are 10<sup>5</sup>-digit strings (L − 1 needs big-number subtraction), run one DP with <b>two</b> flags: <code>tightLow</code> (still equal to L's prefix, so digit ≥ L[pos]) and <code>tightHigh</code>. Pad L with leading zeros to the same length.</p>
      <p><b>Divisibility by the number itself or by its digit sum</b> ("beautiful numbers": divisible by each non-zero digit) uses state = value mod lcm(1..9) = 2520 plus the lcm of digits so far (48 distinct values) — 19 × 2520 × 48 ≈ 2.3 M states. Classic CF 55D.</p>
      <p><b>Other bases.</b> Same code with base b: binary digit DP counts numbers ≤ N with k set bits (or uses the combinatorial nCr shortcut). <b>Complexity</b> is always (#digits) × (#states) × base.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants know the digit DP template well, and will produce the tight/memo code instantly. What they get wrong most often is the subtle part: <b>leading zeros</b>, whether 0 is counted, off-by-one in <code>f(L − 1)</code> when L = 0, and memoising tight states with a memo that is not reset between calls.</p>
      <p><b>Use AI as a partner:</b> ask it to generate a <b>brute-force checker</b> (loop to 10<sup>5</sup>) and a random tester comparing it to your DP — the Python cell above does exactly that. Ask "list every place leading zeros could change the answer for property P".</p>
      <p><b>Where AI goes wrong:</b> it may answer a digit-DP question with an O(R − L) loop (fine for 10<sup>6</sup>, fatal for 10<sup>18</sup>), or propose a closed-form formula that only works for some N. <b>You own:</b> spotting "range up to 10<sup>18</sup> + digit property", designing the minimal state, and testing the boundary cases (N = 0, N = 10<sup>k</sup>, N = 10<sup>k</sup> − 1).</p>`,
    problems: [{
      title: 'Count Integers in [L, R] with Digit Sum Divisible by K',
      level: 'Hard', tags: ['digit dp', 'memoization', 'math'], companies: ['Google', 'Codeforces', 'DE Shaw'],
      statement: `<p>Given <code>L</code>, <code>R</code> and <code>K</code>, return how many integers <code>x</code> with <code>L ≤ x ≤ R</code> have a digit sum that is divisible by <code>K</code>.</p>`,
      constraints: `0 ≤ L ≤ R ≤ 10<sup>18</sup>, 1 ≤ K ≤ 100`,
      example: `<p>L = 1, R = 20, K = 3 → Output <b>6</b>: ${H.c('g', '3, 6, 9, 12, 15, 18')}. (12 → 1+2 = 3 ✓; 20 → 2 ✗.)</p>`,
      brute: { why: `<p>Loop x from L to R and add up the digits: up to 10<sup>18</sup> iterations — centuries. Wasted work: all numbers 4000..4999 share the same "free last three digits" sub-problem, yet we redo it for each one.</p>`, code: `
        long brute(long L, long R, int K) {
            long cnt = 0;
            for (long x = L; x <= R; x++) {
                long s = 0, t = x;
                while (t > 0) { s += t % 10; t /= 10; }  // digit sum
                if (s % K == 0) cnt++;
            }
            return cnt;
        }` },
      mcq: { q: 'We are building a number below N = 4729. The first digit chosen is 3. What digits may the second position take?', options: ['0..7', '0..9', '0..4', 'Only 7'], answer: 1, explain: '3 &lt; 4, so the number is already smaller than N — we are free (tight = false) and the rest can be anything 0..9.' },
      hints: [`<p><b>Aha:</b> count(L..R) = f(R) − f(L − 1) where f(N) counts x in [0, N]. Now handle one bound.</p>`, `<p>Build x digit by digit: state (pos, digit sum mod K, tight). Only the remainder matters for divisibility — not the exact sum. Memoise when tight is false.</p>`, `<p>Edge cases: L = 0 → f(−1) = 0; x = 0 has digit sum 0 which is divisible by K (it appears in both f(R) and f(L−1) when L ≥ 1, so it cancels). Recipe: digits = str(N); go(pos, rem, tight): if pos == len return rem == 0; limit = tight ? d[pos] : 9; sum go(pos+1, (rem+dig)%K, tight &amp;&amp; dig==limit).</p>`],
      solution: {
        approach: `<p>Digit DP with state (position, sum mod K, tight). 19 positions × 100 remainders × 10 digits = 19 000 transitions per call — two calls total.</p>`,
        code: `
          class Solution {
              char[] d; int K; long[][] memo;

              long count(long n) {                      // x in [0, n]
                  if (n < 0) return 0;
                  d = Long.toString(n).toCharArray();
                  memo = new long[d.length][K];
                  for (long[] row : memo) Arrays.fill(row, -1);
                  return go(0, 0, true);
              }

              long go(int pos, int rem, boolean tight) {
                  if (pos == d.length) return rem == 0 ? 1 : 0;
                  if (!tight && memo[pos][rem] != -1) return memo[pos][rem];
                  int limit = tight ? d[pos] - '0' : 9;
                  long res = 0;
                  for (int dig = 0; dig <= limit; dig++)
                      res += go(pos + 1, (rem + dig) % K, tight && dig == limit);
                  if (!tight) memo[pos][rem] = res;
                  return res;
              }

              public long countInRange(long L, long R, int K) {
                  this.K = K;
                  return count(R) - count(L - 1);
              }
          }`,
        alt: [{ lang: 'python', code: `from functools import lru_cache

def count_in_range(L, R, K):
    def f(n):
        if n < 0:
            return 0
        d = list(map(int, str(n)))

        @lru_cache(maxsize=None)
        def go(pos, rem, tight):
            if pos == len(d):
                return int(rem == 0)
            lim = d[pos] if tight else 9
            return sum(go(pos + 1, (rem + x) % K, tight and x == lim) for x in range(lim + 1))
        return go(0, 0, True)
    return f(R) - f(L - 1)

print(count_in_range(1, 20, 3))  # 6`, run: true }],
        dry: { head: ['call', 'pos', 'digit tried', 'tight after?', 'state reached', 'ways'], rows: [
          ['f(20)', '0', '0', 'no', 'go(1, rem 0, free): last digit ∈ {0,3,6,9}', '4'],
          ['f(20)', '0', '1', 'no', 'go(1, rem 1, free): last digit ∈ {2,5,8}', '3'],
          ['f(20)', '0', '2', 'yes', 'go(1, rem 2, tight, limit 0): digit 0 → rem 2', '0'],
          ['f(20)', '—', '—', '—', 'total (includes x = 0)', '7'],
          ['f(0)', '0', '0', 'yes', 'only x = 0, rem 0', '1'],
          ['answer', '—', '—', '—', 'f(20) − f(0) = 7 − 1', '<span class="c-g">6</span>']
        ] },
        complexity: `<p>Time O(D · K · 10) per call, D = number of digits (≤ 19). Space O(D · K).</p>`,
        followUps: ['Digit sum must be a <b>prime</b>: keep the exact sum (≤ 162) and test primality at the end.', 'Numbers divisible by K <i>and</i> with digit sum divisible by K (state = value mod K, sum mod K).', 'R given as a 10<sup>5</sup>-digit string: same DP, iterate instead of recurse.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 3 — Probability & Expected-Value DP
  // =====================================================================
  topics.push({
    title: 'Probability & Expected-Value DP',
    analogy: `<p><b>Probability DP</b> is like pouring <b>one litre of water</b> on the start square of a board. Every second the water in each square splits into equal streams flowing to the next squares. Some streams flow off the edge of the table and are lost. After k seconds, the water still on the board <i>is</i> the probability of still being on the board. You never follow one "random walker" — you move all the water at once.</p>
      <p><b>Expected-value DP</b> is like asking a friend at each bus stop "how many more stops until the end, on average?" The friend at the last stop says 0. Every other friend answers "1 (the ride to the next stop) + the average of what the possible next friends say". Start asking from the end and walk backwards.</p>`,
    explain: `<p>Two flavours, both just DP with fractions instead of counts.</p>
      <h4>1. Probability DP — push the probability forward</h4>
      <p><code>P[t][state]</code> = probability of being in <code>state</code> after <code>t</code> steps. Start with <code>P[0][start] = 1</code>. For each state, split its probability among the moves: <code>P[t+1][next] += P[t][state] × p(move)</code>. Moves that leave the board simply vanish. It's a <b>counting DP where every count is multiplied by a probability</b>.</p>
      ${H.table(['step', 'what is stored', 'total still on board (3×3 board, knight from corner)'], [['0', 'P = 1 at (0,0)', '1'], ['1', 'only 2 of 8 moves stay: (1,2), (2,1) get 1/8 each', '0.25'], ['2', 'each of those has 2 legal moves → 4 × 1/64', '0.0625']])}
      <h4>2. Expected-value DP — pull the answer backward</h4>
      <p><code>E[state]</code> = expected <b>remaining</b> cost (or steps) until the process ends, starting from <code>state</code>.</p>
      <ul>
        <li><b>End states</b>: <code>E = 0</code>.</li>
        <li><b>Other states</b>: <code>E[s] = cost(s) + Σ p(s → s') · E[s']</code> — "pay for this step, then on average whatever the next state costs".</li>
        <li>Compute in an order where every <code>E[s']</code> is ready before <code>E[s]</code> (usually from the end backwards).</li>
      </ul>
      <p>Example: roll a fair die and add it to a total; how many rolls on average until the total is ≥ N? <code>E[s] = 1 + (E[s+1] + … + E[s+6]) / 6</code>, with <code>E[s] = 0</code> for s ≥ N. Fill s = N−1, N−2, …, 0.</p>
      <h4>3. The self-loop trick</h4>
      <p>If a state can lead back to <b>itself</b> ("roll again"), the formula contains E[s] on both sides: <code>E = 1 + p·E + (rest)</code>. Just solve it like school algebra: <code>E = (1 + rest) / (1 − p)</code>. Example: rolling until you see a 6 → <code>E = 1 + (5/6)E</code> → <b>E = 6</b>.</p>
      <h4>4. "Print the answer modulo 10<sup>9</sup>+7"</h4>
      <p>The answer is a fraction P/Q. Do all arithmetic mod p and replace "divide by Q" with "multiply by Q<sup>p−2</sup> mod p" (Fermat's modular inverse). 1/6 becomes 166 666 668.</p>`,
    clues: [
      '"return the <b>probability</b> that…", "answers within 10<sup>−5</sup> of the actual answer are accepted" → probability DP with doubles',
      '"<b>expected number</b> of moves / rolls / days", "on average how many…" → expected-value DP, usually backward',
      '"output P · Q<sup>−1</sup> mod 10<sup>9</sup>+7" → expected value with modular inverses',
      'a process that can <b>repeat a state</b> ("re-roll", "stay in place") → self-loop algebra E = (1 + rest)/(1 − p)',
      'random walk on a board for k steps, "probability it stays on the board" → forward push DP over (step, cell)',
      '"expected number of X" where X is a sum of indicators → linearity of expectation, maybe no DP at all'
    ],
    code: [`
      // Expected number of fair-die rolls until the running total reaches at least N.
      // E[s] = 1 + (E[s+1] + ... + E[s+6]) / 6, and E[s] = 0 for s >= N.
      double expectedRolls(int N) {
          double[] E = new double[N + 6];             // indices >= N stay 0.0 (already finished)
          for (int s = N - 1; s >= 0; s--) {
              double sum = 0;
              for (int face = 1; face <= 6; face++) sum += E[s + face];
              E[s] = 1 + sum / 6.0;                    // pay one roll, then average the futures
          }
          return E[0];
      }

      // Same thing, exact, printed as P * Q^(-1) mod 1e9+7.
      static final long MOD = 1_000_000_007L;
      long power(long b, long e) {                     // fast modular exponentiation
          long r = 1; b %= MOD;
          for (; e > 0; e >>= 1, b = b * b % MOD) if ((e & 1) == 1) r = r * b % MOD;
          return r;
      }
      long expectedRollsMod(int N) {
          long inv6 = power(6, MOD - 2);               // Fermat: 6^(p-2) = 1/6 (mod p)
          long[] E = new long[N + 6];
          for (int s = N - 1; s >= 0; s--) {
              long sum = 0;
              for (int face = 1; face <= 6; face++) sum += E[s + face];
              E[s] = (1 + sum % MOD * inv6) % MOD;
          }
          return E[0];
      }`, { lang: 'python', code: `import random

# 1) Knight on an n x n board: probability it is still on the board after k moves
def knight_probability(n, k, r, c):
    moves = [(2, 1), (1, 2), (-1, 2), (-2, 1), (-2, -1), (-1, -2), (1, -2), (2, -1)]
    cur = [[0.0] * n for _ in range(n)]
    cur[r][c] = 1.0
    for _ in range(k):
        nxt = [[0.0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                if cur[i][j]:
                    for di, dj in moves:
                        a, b = i + di, j + dj
                        if 0 <= a < n and 0 <= b < n:
                            nxt[a][b] += cur[i][j] / 8
        cur = nxt
    return sum(map(sum, cur))

print("knight 3x3, k=2:", knight_probability(3, 2, 0, 0))     # 0.0625

# 2) Coupon collector: expected boxes to collect all n stickers.
#    E[k] = expected boxes still needed when k distinct stickers are owned.
#    E[k] = 1 + (k/n) E[k] + ((n-k)/n) E[k+1]  ->  E[k] = E[k+1] + n/(n-k)
def coupon(n):
    E = 0.0
    for k in range(n - 1, -1, -1):
        E += n / (n - k)
    return E

random.seed(1)
def simulate(n, trials=20000):
    total = 0
    for _ in range(trials):
        seen, boxes = set(), 0
        while len(seen) < n:
            seen.add(random.randrange(n)); boxes += 1
        total += boxes
    return total / trials

print("coupon n=6 exact:", round(coupon(6), 3), " simulated:", round(simulate(6), 3))`, run: true, title: 'Knight probability + coupon collector (Python, runnable)' }],
    codeTitle: ['Expected dice rolls: doubles and mod 1e9+7 (Java)', 'Probability DP + expected-value DP with a simulation check (Python)'],
    viz: [{
      title: 'Pouring probability: knight on a board for k moves',
      input: '4 | 3 | 0 0',
      inputLabel: 'board size n (3..8) | moves k (1..6) | start row col',
      gen: function (input) {
        var p = splitBar(input, 3, '"4 | 3 | 0 0"');
        var n = parseNums(p[0], 'n', 1, 1, 3, 8)[0], k = parseNums(p[1], 'k', 1, 1, 1, 6)[0], rc = parseNums(p[2], 'start row col', 2, 2, 0, n - 1);
        var mv = [[2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1]];
        function zero() { var g = []; for (var i = 0; i < n; i++) { var row = []; for (var j = 0; j < n; j++) row.push(0); g.push(row); } return g; }
        function view(g) { return g.map(function (row) { return row.map(function (v) { return v ? r3(v) : '·'; }); }); }
        function tot(g) { var s = 0; g.forEach(function (row) { row.forEach(function (v) { s += v; }); }); return s; }
        var head = []; for (var i = 0; i < n; i++) head.push(String(i));
        var cur = zero(); cur[rc[0]][rc[1]] = 1;
        var frames = [], lost = 0;
        frames.push({ narr: 'Pour <b>1.0</b> of probability on the start square (' + rc[0] + ', ' + rc[1] + '). Each move, every square sends 1/8 of its probability along each knight jump. Jumps off the board are lost forever.', parts: [{ type: 'grid', label: 'P[step 0]', rows: view(cur), rowHead: head, colHead: head, hl: one(rc[0] + ',' + rc[1], 'sel') }, { type: 'vars', vals: { step: 0, onBoard: 1, fellOff: 0 } }] });
        var hl0 = {}, legal = 0;
        mv.forEach(function (m) { var a = rc[0] + m[0], b = rc[1] + m[1]; if (a >= 0 && a < n && b >= 0 && b < n) { hl0[a + ',' + b] = 'ok'; legal++; } });
        hl0[rc[0] + ',' + rc[1]] = 'cur';
        frames.push({ narr: 'From the start square only <b>' + legal + ' of 8</b> jumps land on the board (green). So after one move at most ' + legal + '/8 = ' + r3(legal / 8) + ' of the water is left. The other ' + (8 - legal) + ' streams spill off the table.', parts: [{ type: 'grid', label: 'legal targets from the start', rows: view(cur), rowHead: head, colHead: head, hl: hl0 }] });
        for (var step = 1; step <= k; step++) {
          var nxt = zero(), hl = {};
          for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
            if (!cur[r][c]) continue;
            mv.forEach(function (m) { var a = r + m[0], b = c + m[1]; if (a >= 0 && a < n && b >= 0 && b < n) { nxt[a][b] += cur[r][c] / 8; } else { lost += cur[r][c] / 8; } });
          }
          for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (nxt[r][c]) hl[r + ',' + c] = 'ok';
          cur = nxt;
          var t = tot(cur);
          frames.push({ narr: 'After move ' + step + ': every square pushed its share forward. Probability still on the board = <b>' + r3(t) + '</b>; total spilled so far = ' + r3(lost) + ' (they always add up to 1). Note we never simulated a single random knight — we moved <i>all</i> possibilities at once.', parts: [{ type: 'grid', label: 'P[step ' + step + ']', rows: view(cur), rowHead: head, colHead: head, hl: hl }, { type: 'vars', vals: { step: step, onBoard: r3(t), fellOff: r3(lost) }, hl: { onBoard: 'ok', fellOff: 'bad' } }] });
        }
        frames.push({ narr: '<b>Answer: ' + r3(tot(cur)) + '</b> (sum of the last grid). Work = k × n² squares × 8 moves — for n = 25, k = 100 that is 500 000 steps, versus 8<sup>100</sup> move sequences.', parts: [{ type: 'grid', label: 'final P', rows: view(cur), rowHead: head, colHead: head }, { type: 'vars', vals: { answer: r3(tot(cur)) }, hl: { answer: 'sel' } }] });
        return frames;
      }
    }, {
      title: 'Expected rolls until total ≥ N (filled backwards)',
      input: '8',
      inputLabel: 'N (1..20)',
      gen: function (input) {
        var N = parseNums(input, 'N', 1, 1, 1, 20)[0];
        var E = []; for (var s = 0; s < N + 6; s++) E.push(0);
        var labels = []; for (s = 0; s < N + 6; s++) labels.push(s >= N ? 's=' + s + ' end' : 's=' + s);
        function bars(hl) { return { type: 'bars', label: 'E[s] = expected rolls still needed from total s', values: E.map(function (v) { return Math.round(v * 100) / 100; }), idxLabels: labels, hl: hl || {}, texts: E.map(function (v) { return String(Math.round(v * 100) / 100); }) }; }
        var frames = [];
        var endH = {}; for (s = N; s < N + 6; s++) endH[s] = 'done';
        frames.push({ narr: 'Totals ≥ ' + N + ' are finished, so their expected remaining rolls are <b>0</b>. We fill the table from the right because each E[s] needs the six values just after it.', parts: [bars(endH)] });
        for (s = N - 1; s >= 0; s--) {
          var sum = 0, hl = {};
          for (var f = 1; f <= 6; f++) { sum += E[s + f]; hl[s + f] = 'win'; }
          E[s] = 1 + sum / 6;
          hl[s] = 'ok';
          frames.push({ narr: 'E[' + s + '] = 1 + (E[' + (s + 1) + '] + … + E[' + (s + 6) + ']) / 6 = 1 + ' + (Math.round(sum * 100) / 100) + ' / 6 = <b>' + (Math.round(E[s] * 1000) / 1000) + '</b>. "Pay one roll, then average the six possible futures" (blue).', parts: [bars(hl)] });
        }
        frames.push({ narr: '<b>Answer E[0] = ' + (Math.round(E[0] * 1000) / 1000) + '</b>. Sanity check: the die averages 3.5 per roll, so roughly N / 3.5 + a little overshoot correction = ' + (Math.round(N / 3.5 * 100) / 100) + '+.', parts: [bars(one(0, 'sel'))] });
        return frames;
      }
    }],
    examples: [
      { title: 'Rolling until the first 6 (self-loop algebra)', html: `<p>State "still waiting". One roll: with 1/6 we finish (E = 0 after), with 5/6 we are back in the same state. So <code>E = 1 + (5/6)·E</code> → <code>E/6 = 1</code> → <b>E = 6</b>. In general, a success with probability p takes <b>1/p</b> tries on average (geometric distribution).</p>` },
      { title: 'Coupon collector: 6 stickers', html: `<p>Owning k distinct stickers, a new box gives a new one with probability (n − k)/n, so the wait for the next new one is n/(n − k). Add them up: 6/6 + 6/5 + 6/4 + 6/3 + 6/2 + 6/1 = 1 + 1.2 + 1.5 + 2 + 3 + 6 = <b>14.7 boxes</b>. That is n·H<sub>n</sub> ≈ n ln n — the reason "collect them all" promotions are profitable.</p>
        ${H.table(['k owned', 'P(new)', 'expected wait', 'running E'], [['5', '1/6', '6', '6'], ['4', '2/6', '3', '9'], ['3', '3/6', '2', '11'], ['2', '4/6', '1.5', '12.5'], ['1', '5/6', '1.2', '13.7'], ['0', '6/6', '1', '<span class="c-g">14.7</span>']])}` },
      { title: 'Linearity of expectation (no DP needed!)', html: `<p>"Shuffle n cards; expected number of cards that stay in their original place?" Each card stays with probability 1/n. Expected count = n × 1/n = <b>1</b>, for every n, even though the events are dependent. Before building an expected-value DP, ask: "can I write the answer as a sum of indicator variables?" Then E = Σ P(indicator).</p>` },
      { title: 'Expected value modulo a prime', html: `<p>Expected rolls to reach total ≥ 2 with a fair die: E[1] = 1, E[0] = 1 + E[1]/6 = 7/6. As P·Q<sup>−1</sup> mod 10<sup>9</sup>+7: inv(6) = 166 666 668, 7 · 166 666 668 mod p = 166 666 669. The Java <code>expectedRollsMod(2)</code> above returns exactly that. Check yourself: 166 666 669 × 6 mod p = 7. ✓</p>` }
    ],
    deepDive: `<p><b>Forward vs backward.</b> Probability of <i>reaching</i> states is naturally pushed <b>forward</b> from the start (one source, many sinks). Expected <i>remaining</i> cost is naturally pulled <b>backward</b> from the terminal states (many sources, one question). You can compute expected value forward too (E = Σ over end states of P(end) × cost), but only when the cost is a function of the path you can accumulate.</p>
      <p><b>Cycles.</b> If states can loop among themselves (not just self-loops), you get a <b>system of linear equations</b>: n unknowns E[s]. Solve with Gaussian elimination in O(n<sup>3</sup>) (fine for n ≤ 500), or iterate <code>E ← cost + P·E</code> until it stops changing (value iteration, converges geometrically when the process ends with probability 1). This is exactly the <b>Bellman equation</b> of a Markov chain; add a "min over actions" and it becomes a Markov Decision Process — the foundation of reinforcement learning.</p>
      <p><b>Floating point.</b> Probabilities shrink fast (8<sup>−100</sup> ≈ 10<sup>−90</sup> still fits in a double, whose minimum is ~10<sup>−308</sup>). For thousands of steps work in <b>log space</b> (store log P, add instead of multiply, use log-sum-exp when adding probabilities). Judges accept 10<sup>−6</sup> relative error, so avoid catastrophic subtraction like <code>1 − (1 − tiny)</code>.</p>
      <p><b>Sliding-window sums.</b> When E[s] or P[s] depends on a contiguous block (dice faces 1..W), keep a running window sum: O(N) instead of O(N·W) — New 21 Game (LC 837) is exactly this.</p>
      <p><b>Large-step shortcut.</b> Soup Servings (LC 808) shows a real interview trick: for huge N the probability converges to 1 within 10<sup>−6</sup>, so return 1 above a threshold you measured. Recognising when an answer converges is senior-level judgement.</p>
      <p><b>Modular expectations</b> require the denominator to be invertible mod p (p prime, denominator not a multiple of p). Self-loop formulas need <code>inv(1 − p)</code> computed as <code>inv((q − a) mod p)</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> an LLM writes the knight-probability DP in seconds and can explain linearity of expectation well. AI is also excellent at producing a <b>Monte-Carlo simulator</b> to sanity-check your exact answer — exactly what the Python cell does for the coupon collector. Use simulation as a test oracle, never as the final answer (its error shrinks only like 1/√trials).</p>
      <p><b>Use AI as a partner:</b> "Write a 20-line simulation of this game with a fixed seed; I will compare it with my DP." Or "derive the self-loop equation for this state and solve it for E."</p>
      <p><b>Where AI goes wrong:</b> it mixes up "expected steps from here" and "expected steps from the start", forgets to divide by the number of outcomes, double-counts in the self-loop equation, or uses integer division (<code>1/6 == 0</code> in Java). It also tends to propose recursion without memo over (step, cell) — exponential. <b>You own:</b> the state definition, the direction of the recurrence, the base cases, and spotting when linearity makes the DP unnecessary. In ML systems (RL, A/B tests, ranking) the same expected-value reasoning is your daily bread.</p>`,
    problems: [{
      title: 'Knight Probability in Chessboard',
      level: 'Medium', tags: ['probability dp', 'grid', 'simulation'], companies: ['Google', 'Goldman Sachs', 'Amazon'],
      statement: `<p>A knight starts on cell <code>(row, column)</code> of an <code>n × n</code> chessboard and makes exactly <code>k</code> moves. Each move picks one of the 8 knight jumps uniformly at random — even if it leaves the board. Once off the board, the knight stays off. Return the probability that the knight is still on the board after the k moves.</p>`,
      constraints: `1 ≤ n ≤ 25, 0 ≤ k ≤ 100, 0 ≤ row, column &lt; n. Answers within 10<sup>−5</sup> accepted.`,
      example: `<p>n = 3, k = 2, start (0, 0) → Output <b>0.0625</b>. From (0, 0) only (1, 2) and (2, 1) are on the board (2 of 8 → 0.25). From each of those, again only 2 of 8 jumps stay → 0.25 × 0.25 = ${H.c('g', '0.0625')}.</p>`,
      brute: { why: `<p>Recursively try all 8 moves for k levels: 8<sup>k</sup> paths. k = 100 → 8<sup>100</sup> ≈ 10<sup>90</sup>. Waste: many different paths reach the same (cell, moves left) — the probability from there is identical.</p>`, code: `
        int[][] MOVES = {{2,1},{1,2},{-1,2},{-2,1},{-2,-1},{-1,-2},{1,-2},{2,-1}};
        double bruteKnight(int n, int k, int r, int c) {
            if (r < 0 || r >= n || c < 0 || c >= n) return 0.0;  // fell off
            if (k == 0) return 1.0;                                // survived all moves
            double p = 0;
            for (int[] m : MOVES) p += bruteKnight(n, k - 1, r + m[0], c + m[1]) / 8.0;
            return p;
        }` },
      mcq: { q: 'Which state fully describes "the rest of the problem"?', options: ['(row, col) only', '(row, col, moves left)', '(the whole path so far)', '(moves left) only'], answer: 1, explain: 'The future only depends on where the knight stands and how many moves remain, not how it got there. n² × (k + 1) states.' },
      hints: [`<p><b>Aha:</b> instead of following random knights, move the <i>probability mass</i>: keep a grid P where P[r][c] = chance of being there now.</p>`, `<p>For each step build a fresh grid: every on-board target gets <code>P[r][c] / 8</code> from each source. Off-board targets are simply dropped.</p>`, `<p>Edge cases: k = 0 → 1.0; use double and divide by 8.0 (not 8 integer). Recipe: cur = zeros; cur[row][col] = 1; repeat k times: nxt = zeros; push; cur = nxt. Return the sum of cur.</p>`],
      solution: {
        approach: `<p>Forward probability DP over (step, cell) with two rolling n × n grids. Total probability on the board after k steps is the answer.</p>`,
        code: `
          class Solution {
              public double knightProbability(int n, int k, int row, int column) {
                  int[][] moves = {{2,1},{1,2},{-1,2},{-2,1},{-2,-1},{-1,-2},{1,-2},{2,-1}};
                  double[][] cur = new double[n][n];
                  cur[row][column] = 1.0;                        // all mass on the start cell
                  for (int step = 0; step < k; step++) {
                      double[][] nxt = new double[n][n];
                      for (int r = 0; r < n; r++)
                          for (int c = 0; c < n; c++) {
                              if (cur[r][c] == 0) continue;          // nothing to push
                              for (int[] m : moves) {
                                  int nr = r + m[0], nc = c + m[1];
                                  if (nr >= 0 && nr < n && nc >= 0 && nc < n)
                                      nxt[nr][nc] += cur[r][c] / 8.0; // 1/8 of the mass per jump
                              }
                          }
                      cur = nxt;
                  }
                  double total = 0;
                  for (double[] rowArr : cur) for (double p : rowArr) total += p;
                  return total;
              }
          }`,
        alt: [{ lang: 'python', code: `def knight_probability(n, k, row, column):
    moves = [(2,1),(1,2),(-1,2),(-2,1),(-2,-1),(-1,-2),(1,-2),(2,-1)]
    cur = [[0.0] * n for _ in range(n)]
    cur[row][column] = 1.0
    for _ in range(k):
        nxt = [[0.0] * n for _ in range(n)]
        for r in range(n):
            for c in range(n):
                if cur[r][c]:
                    for dr, dc in moves:
                        a, b = r + dr, c + dc
                        if 0 <= a < n and 0 <= b < n:
                            nxt[a][b] += cur[r][c] / 8
        cur = nxt
    return sum(map(sum, cur))

print(knight_probability(3, 2, 0, 0))  # 0.0625`, run: true }],
        dry: { head: ['step', 'cells holding mass', 'mass per cell', 'total on board'], rows: [
          ['0', '(0,0)', '1', '1'],
          ['1', '(1,2), (2,1)', '1/8', '0.25'],
          ['2', '(0,0) gets 1/64 from both; (0,2) and (2,0) get 1/64', '(0,0)=2/64, others 1/64', '<span class="c-g">0.0625</span>']
        ] },
        complexity: `<p>Time O(k · n² · 8) ≈ 500 000 for the max input. Space O(n²) with two rolling grids.</p>`,
        followUps: ['Use symmetry of the board to cut work by 8.', 'k = 10<sup>9</sup>: the transition is a matrix → matrix exponentiation on n² states (or note the answer tends to 0).', 'Return the probability the knight visits a target cell at least once (make the target absorbing).']
      }
    }]
  });

  // =====================================================================
  // TOPIC 4 — DP with data structures
  // =====================================================================
  topics.push({
    title: 'DP Accelerated by Data Structures (Monotonic Deque, Fenwick / Segment Tree, TreeMap)',
    analogy: `<p>A coach picks the next player for a relay team: "take the <b>fastest</b> runner among the last 5 who trained". Scanning all 5 every time is slow if it's the last 50 000. Instead the coach keeps a <b>leaderboard</b> on the wall: when a new runner beats people at the bottom, those people are crossed out (they are older <i>and</i> slower — never useful again), and anyone too old drops off the top. Asking "who's best?" is now just reading the top line.</p>
      <p>That is this whole topic: the DP formula stays the same, but the "<b>best of many previous answers</b>" part is handed to a smart helper — a deque, a Fenwick tree, a segment tree or a sorted map — so each step costs O(1) or O(log N) instead of O(N).</p>`,
    explain: `<p>Many DPs look like this:</p>
      <p style="text-align:center"><code>dp[i] = value(i) + best{ dp[j] : j is "allowed" for i }</code></p>
      <p>Written naively that is O(N) per i → O(N<sup>2</sup>), too slow for N = 10<sup>5</sup>. The trick: look at the <b>shape of "allowed"</b> and pick the data structure that answers that shape fast.</p>
      ${H.table(['"allowed j" looks like…', 'example', 'helper', 'cost per step'], [
        ['the last k indices (sliding window)', 'jump at most k steps; pick elements at most k apart', '<b>monotonic deque</b>', 'O(1) amortised'],
        ['all j with a[j] &lt; a[i] (prefix by value)', 'LIS, "increasing chain" counts', '<b>Fenwick tree (BIT)</b> on compressed values', 'O(log N)'],
        ['a[j] in a value range [a[i]−k, a[i]−1]', 'LIS with limited jumps (LC 2407)', '<b>segment tree</b> (range max)', 'O(log N)'],
        ['the latest job ending before my start', 'weighted interval scheduling', '<b>TreeMap</b> floorEntry / binary search', 'O(log N)'],
        ['j &lt; i with a line formula a[j]·x + b[j]', 'cost = product of two things', '<b>convex hull trick</b> (topic 5)', 'O(1)–O(log N)']
      ])}
      <h4>Monotonic deque in one breath</h4>
      <p>Keep indices in a deque so that their dp values are <b>decreasing</b> from front to back. For each new i: (1) throw away the front if it is outside the window, (2) the front is now the best → compute dp[i], (3) from the back, throw away every index whose dp is ≤ dp[i] — they are older <i>and</i> not better, they can never win again — then push i. Each index enters and leaves once → O(N) total.</p>
      <h4>Fenwick tree over values in one breath</h4>
      <p>Process the array left to right. <code>best[v]</code> = best dp of any subsequence ending with value v seen so far. For a[i], ask the Fenwick tree for <code>max(best[1..a[i]−1])</code> in O(log N), set dp[i] = that + 1, then update position a[i]. If values are huge (10<sup>9</sup>), first <b>compress</b> them to ranks 1..N.</p>`,
    clues: [
      'DP transition "max/min over the <b>previous k</b> positions" + N ≤ 10<sup>5</sup> → monotonic deque',
      '"subsequence where each next element is larger / within distance k / in a value range" → Fenwick or segment tree indexed by value',
      '"<b>non-overlapping</b> intervals/jobs with maximum profit" → sort by end + binary search / TreeMap floor',
      'O(N<sup>2</sup>) DP works but N = 10<sup>5</sup> → keep the formula, speed up the "best previous" query',
      'values up to 10<sup>9</sup> but only N of them → coordinate compression before the BIT',
      '"count the number of longest increasing subsequences" with big N → BIT storing (length, count) pairs'
    ],
    code: [`
      // LIS in O(N log N) with a Fenwick tree for prefix MAX over compressed values.
      int lisFenwick(int[] a) {
          int n = a.length;
          int[] sorted = Arrays.stream(a).distinct().sorted().toArray();   // coordinate compression
          int m = sorted.length;
          int[] bit = new int[m + 1];                                        // bit[] stores prefix maxima
          int best = 0;
          for (int x : a) {
              int r = Arrays.binarySearch(sorted, x) + 1;                    // rank in 1..m
              int q = 0;
              for (int i = r - 1; i > 0; i -= i & -i) q = Math.max(q, bit[i]); // best over values < x
              int cur = q + 1;                                               // extend that chain by x
              best = Math.max(best, cur);
              for (int i = r; i <= m; i += i & -i) bit[i] = Math.max(bit[i], cur); // values only grow → max-BIT is valid
          }
          return best;
      }`, `
      // Weighted job scheduling: dp over jobs sorted by end time, TreeMap gives "best profit by time t".
      int jobScheduling(int[] startTime, int[] endTime, int[] profit) {
          int n = startTime.length;
          Integer[] idx = new Integer[n];
          for (int i = 0; i < n; i++) idx[i] = i;
          Arrays.sort(idx, (p, q) -> endTime[p] - endTime[q]);
          TreeMap<Integer, Integer> best = new TreeMap<>();   // end time -> best total profit up to it
          best.put(0, 0);
          for (int i : idx) {
              int before = best.floorEntry(startTime[i]).getValue(); // best finishing by my start
              int take = before + profit[i];
              if (take > best.lastEntry().getValue()) best.put(endTime[i], take); // keep values increasing
          }
          return best.lastEntry().getValue();
      }`],
    codeTitle: ['LIS with a Fenwick tree (prefix max over values)', 'Job scheduling with TreeMap.floorEntry'],
    viz: [{
      title: 'Monotonic deque: dp[i] = nums[i] + max(0, best dp in last k)',
      input: '10 2 -10 5 20 | 2',
      inputLabel: 'nums | k',
      gen: function (input) {
        var p = splitBar(input, 2, '"10 2 -10 5 20 | 2"');
        var a = parseNums(p[0], 'nums', 1, 14, -99, 99), k = parseNums(p[1], 'k', 1, 1, 1, 14)[0];
        var n = a.length, dp = [], dq = [], best = -Infinity, frames = [];
        function parts(i, hlArr, dqHl, note) {
          var vals = {}; vals.i = i; vals.best = best === -Infinity ? '−∞' : best;
          return [{ type: 'array', label: 'nums', values: a, hl: hlArr, ptr: i < n ? one(i, 'i') : {} },
            { type: 'bars', label: 'dp (best sum of a valid subsequence ending at i)', values: dp.slice(), texts: dp.map(String) },
            { type: 'queue', label: 'deque of indices (dp decreasing front → back)', items: dq.map(function (j) { return j + ' (dp ' + dp[j] + ')'; }), hl: dqHl || {}, frontLabel: 'front = best', backLabel: 'back' },
            { type: 'vars', vals: vals, hl: { best: 'sel' } }];
        }
        frames.push({ narr: 'Pick a subsequence whose neighbours are at most <b>k = ' + k + '</b> indices apart, maximise the sum. dp[i] = nums[i] + max(0, max dp[j] for i−k ≤ j &lt; i). The deque will hand us that max instantly.', parts: parts(0, {}, {}) });
        for (var i = 0; i < n; i++) {
          var win = {}; for (var j = Math.max(0, i - k); j < i; j++) win[j] = 'win'; win[i] = 'cur';
          while (dq.length && dq[0] < i - k) {
            var gone = dq.shift();
            frames.push({ narr: 'i = ' + i + ': index ' + gone + ' is more than k = ' + k + ' steps back — <span class="c-r">too old, pop it from the front</span>.', parts: parts(i, win, {}) });
          }
          var prev = dq.length ? Math.max(0, dp[dq[0]]) : 0;
          dp.push(a[i] + prev);
          best = Math.max(best, dp[i]);
          frames.push({ narr: 'i = ' + i + ': the front of the deque is the best in the window (blue) → ' + (dq.length ? 'dp[' + dq[0] + '] = ' + dp[dq[0]] : 'empty') + '. Take max(0, that) = ' + prev + ' (0 means "start fresh"). dp[' + i + '] = ' + a[i] + ' + ' + prev + ' = <b>' + dp[i] + '</b>.', parts: parts(i, win, dq.length ? one(0, 'cur') : {}) });
          var popped = [];
          while (dq.length && dp[dq[dq.length - 1]] <= dp[i]) popped.push(dq.pop());
          dq.push(i);
          frames.push({ narr: popped.length ? 'Indices ' + popped.join(', ') + ' have dp ≤ ' + dp[i] + ' <i>and</i> are older than ' + i + ' — they can never be the best again. <span class="c-r">Pop them from the back</span>, then push ' + i + '.' : 'Nothing at the back is worse than dp[' + i + '] = ' + dp[i] + ', so just push ' + i + ' (it may become best once older ones expire).', parts: parts(i, win, one(dq.length - 1, 'ok')) });
        }
        frames.push({ narr: '<b>Answer: ' + best + '</b> (largest dp). Every index entered and left the deque at most once → O(N) total, no matter how big k is.', parts: parts(n, {}, {}) });
        return frames;
      }
    }, {
      title: 'LIS by values: query the best chain ending below a[i]',
      input: '3 1 4 1 5 9 2 6 5 3',
      inputLabel: 'array of values 1..20',
      gen: function (input) {
        var a = parseNums(input, 'the array', 1, 14, 1, 20);
        var mx = Math.max.apply(null, a), best = [], labels = [], frames = [], ans = 0;
        for (var v = 0; v <= mx; v++) { best.push(0); labels.push('v=' + v); }
        frames.push({ narr: '<b>best[v]</b> = length of the longest increasing subsequence seen so far that <i>ends with value v</i>. For each new x, the best chain to extend is max(best[1..x−1]) — a <b>prefix maximum over values</b>. A Fenwick tree answers that in O(log N); here we just colour the range.', parts: [{ type: 'array', label: 'input', values: a }, { type: 'bars', label: 'best[v]', values: best.slice(), idxLabels: labels }] });
        for (var i = 0; i < a.length; i++) {
          var x = a[i], q = 0, h = {};
          for (v = 1; v < x; v++) { q = Math.max(q, best[v]); h[v] = 'win'; }
          var cur = q + 1, improved = cur > best[x];
          if (improved) best[x] = cur;
          ans = Math.max(ans, cur);
          h[x] = improved ? 'ok' : 'bad';
          frames.push({ narr: 'x = ' + x + ': prefix max over values 1..' + (x - 1) + ' (blue) = ' + q + ' → a chain of length <b>' + cur + '</b> can end at ' + x + '. ' + (improved ? 'best[' + x + '] becomes ' + cur + '.' : 'best[' + x + '] already ≥ ' + cur + ', unchanged (equal values cannot extend each other — strictly increasing).') + ' Overall LIS so far = ' + ans + '.', parts: [{ type: 'array', label: 'input', values: a, hl: one(i, 'cur'), ptr: one(i, 'i') }, { type: 'bars', label: 'best[v]', values: best.slice(), idxLabels: labels, hl: h }, { type: 'vars', vals: { x: x, prefixMax: q, dp_i: cur, LIS: ans }, hl: { LIS: 'sel' } }] });
        }
        frames.push({ narr: '<b>LIS = ' + ans + '</b>. Same idea handles "next element at most k bigger" (range max on [x−k, x−1] → segment tree) and counting LIS (store length and count per node).', parts: [{ type: 'bars', label: 'best[v]', values: best.slice(), idxLabels: labels }, { type: 'vars', vals: { LIS: ans }, hl: { LIS: 'sel' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Jump Game VI (LC 1696): the simplest deque DP', html: `<p>dp[i] = nums[i] + max(dp[i−k..i−1]). nums = [1, −1, −2, 4, −7, 3], k = 2 → dp = [1, 0, −1, 4, −3, 7] → <b>7</b>. The deque holds indices with decreasing dp; front = window max. O(N) vs O(N·k).</p>`, code: `int maxResult(int[] nums, int k) {
    int n = nums.length;
    int[] dp = new int[n];
    ArrayDeque<Integer> dq = new ArrayDeque<>();
    dp[0] = nums[0];
    dq.add(0);
    for (int i = 1; i < n; i++) {
        while (dq.peekFirst() < i - k) dq.pollFirst();          // expired
        dp[i] = nums[i] + dp[dq.peekFirst()];                   // window max
        while (!dq.isEmpty() && dp[dq.peekLast()] <= dp[i]) dq.pollLast();
        dq.addLast(i);
    }
    return dp[n - 1];
}` },
      { title: 'Weighted job scheduling (LC 1235) by hand', html: `<p>Jobs (start, end, profit): (1,3,50), (2,4,10), (3,5,40), (3,6,70). Sorted by end: map {0:0}. Job (1,3,50): floor(1) = 0 → 50 → put 3:50. Job (2,4,10): floor(2)=0 → 10 &lt; 50 skip. Job (3,5,40): floor(3) = 50 → 90 → put 5:90. Job (3,6,70): floor(3) = 50 → 120 → put 6:120. <b>Answer 120</b>. The map always holds increasing profits, so floorEntry gives "best so far by that time".</p>` },
      { title: 'Counting LIS with a BIT of pairs', html: `<p>Number of Longest Increasing Subsequences (LC 673) for N = 10<sup>5</sup>: each BIT node stores <code>(len, count)</code>. Combining two pairs: larger len wins; equal len → add counts. Query prefix (values &lt; x) → (L, C); then x gives (L + 1, max(C, 1)). Update at x by combining. O(N log N) instead of O(N<sup>2</sup>).</p>` },
      { title: 'Heap alternative to the deque (lazy deletion)', html: `<p>If you forget the deque, a max-heap of (dp[j], j) also works: before reading the top, pop while <code>top.j &lt; i − k</code>. O(N log N) — slightly slower, often accepted. Interviewers may then ask "can you make it O(N)?" → deque.</p>` }
    ],
    deepDive: `<p><b>Why the deque is correct.</b> Invariant: indices increase front→back and dp values strictly decrease. If j &lt; i and dp[j] ≤ dp[i], j is <b>dominated</b>: it expires earlier and is never better, so deleting it loses nothing. The front is therefore the maximum of all non-dominated indices in the window, i.e. the window maximum. Amortised: N pushes and ≤ N pops → O(N).</p>
      <p><b>Max-Fenwick caveat.</b> A Fenwick tree for prefix <i>max</i> only works when values at a position only <b>increase</b> (you can't "undo" a max). That holds for LIS-style DPs processed left to right. If values can decrease, or you need arbitrary ranges [l, r], use a <b>segment tree</b> (iterative bottom-up is short and fast).</p>
      <p><b>Choosing the axis.</b> The trick is to index the structure by the dimension that the condition talks about: "j &lt; i and a[j] &lt; a[i]" → iterate i (handles j &lt; i by time) and index the tree by a[j] (handles the value condition). Two conditions + time = 3D dominance → <b>CDQ divide and conquer</b> or a 2D BIT. Sort-then-sweep turns one dimension into time.</p>
      <p><b>Ties and strictness.</b> "Strictly increasing" → query values &lt; x (r − 1). "Non-decreasing" → query ≤ x. With duplicates of the same value processed in one batch (e.g. 2D envelopes), sort the second key descending so equal first keys cannot chain.</p>
      <p><b>Production note.</b> These are the same structures used in time-series databases (sliding window max for alerting), order books (TreeMap of price levels) and leaderboards (Fenwick for rank queries). The DP view is just one consumer.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant will often first produce the O(N<sup>2</sup>) DP — correct but slow. Your job is to spot the <b>query shape</b> and say "the inner max is a sliding window → deque" or "it's a prefix over values → BIT". Once you name it, AI can write the structure correctly and quickly.</p>
      <p><b>Use AI as a partner:</b> "Here is my O(N<sup>2</sup>) DP. Which part is a range query? Rewrite only that part with a segment tree and keep the rest identical." Then diff the two versions on random inputs — let the AI write the random tester.</p>
      <p><b>Where AI goes wrong:</b> off-by-one window bounds (<code>i − k</code> vs <code>i − k − 1</code>), using <code>&lt;</code> vs <code>≤</code> when popping (both often work, but one breaks ties incorrectly for counting variants), forgetting coordinate compression (BIT of size 10<sup>9</sup>), and using a max-Fenwick where values can decrease. <b>You own:</b> the invariant ("deque values decrease"), the dominance argument, and the complexity claim.</p>`,
    problems: [{
      title: 'Constrained Subsequence Sum',
      level: 'Hard', tags: ['dp', 'monotonic deque', 'sliding window'], companies: ['Amazon', 'Google', 'Akuna'],
      statement: `<p>Given an integer array <code>nums</code> and an integer <code>k</code>, return the maximum sum of a <b>non-empty</b> subsequence such that for every two consecutive chosen indices <code>i &lt; j</code>, <code>j − i ≤ k</code>.</p>`,
      constraints: `1 ≤ k ≤ N ≤ 10<sup>5</sup>, −10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>`,
      example: `${H.arr([10, 2, -10, 5, 20], { label: 'nums, k = 2', hl: { 0: 'g', 1: 'g', 3: 'g', 4: 'g' } })}<p>Output <b>37</b> = 10 + 2 + 5 + 20. We skip −10 (index 2) — allowed, because index 1 → index 3 is a gap of 2 ≤ k.</p>`,
      brute: { why: `<p>O(N·k) DP: for each i scan the previous k dp values. With N = k = 10<sup>5</sup> that is 10<sup>10</sup>. The waste: consecutive windows overlap in k − 1 positions but we rescan them all.</p>`, code: `
        int bruteConstrained(int[] nums, int k) {
            int n = nums.length, best = Integer.MIN_VALUE;
            int[] dp = new int[n];
            for (int i = 0; i < n; i++) {
                int prev = 0;                                     // 0 = start a new subsequence here
                for (int j = Math.max(0, i - k); j < i; j++) prev = Math.max(prev, dp[j]);
                dp[i] = nums[i] + prev;
                best = Math.max(best, dp[i]);
            }
            return best;
        }` },
      mcq: { q: 'The deque holds indices 3 (dp 17) and 5 (dp 9). New index 6 gets dp 12. What happens?', options: ['Pop 5, push 6 → [3, 6]', 'Pop 3 and 5, push 6', 'Push 6 → [3, 5, 6]', 'Pop 3 only'], answer: 0, explain: 'From the back: dp[5] = 9 ≤ 12 → index 5 is older and worse, pop it. dp[3] = 17 &gt; 12 → stop. Push 6. Deque stays decreasing: 17, 12.' },
      hints: [`<p><b>Aha:</b> dp[i] = nums[i] + max(0, max of dp[j] for j in [i−k, i−1]). The 0 means "start fresh at i".</p>`, `<p>The inner max is a <b>sliding window maximum</b> over dp → keep a deque of indices with decreasing dp values.</p>`, `<p>Recipe per i: pop front while front &lt; i − k; dp[i] = nums[i] + max(0, dp[front]); best = max(best, dp[i]); pop back while dp[back] ≤ dp[i]; push i. All-negative array → answer is the single largest element (the "non-empty" rule).</p>`],
      solution: {
        approach: `<p>DP + monotonic deque over dp values. Each index is pushed and popped at most once.</p>`,
        code: `
          class Solution {
              public int constrainedSubsetSum(int[] nums, int k) {
                  int n = nums.length;
                  int[] dp = new int[n];
                  Deque<Integer> dq = new ArrayDeque<>();      // indices, dp decreasing front -> back
                  int best = Integer.MIN_VALUE;
                  for (int i = 0; i < n; i++) {
                      while (!dq.isEmpty() && dq.peekFirst() < i - k) dq.pollFirst();   // out of window
                      int bestPrev = dq.isEmpty() ? 0 : Math.max(0, dp[dq.peekFirst()]);
                      dp[i] = nums[i] + bestPrev;
                      best = Math.max(best, dp[i]);
                      while (!dq.isEmpty() && dp[dq.peekLast()] <= dp[i]) dq.pollLast(); // dominated
                      dq.offerLast(i);
                  }
                  return best;
              }
          }`,
        alt: [{ lang: 'python', code: `from collections import deque

def constrained_subset_sum(nums, k):
    dp = [0] * len(nums)
    dq = deque()
    best = float('-inf')
    for i, x in enumerate(nums):
        while dq and dq[0] < i - k:
            dq.popleft()
        dp[i] = x + (max(0, dp[dq[0]]) if dq else 0)
        best = max(best, dp[i])
        while dq and dp[dq[-1]] <= dp[i]:
            dq.pop()
        dq.append(i)
    return best

print(constrained_subset_sum([10, 2, -10, 5, 20], 2))  # 37`, run: true }],
        dry: { head: ['i', 'nums[i]', 'front (dp)', 'dp[i]', 'deque after'], rows: [
          ['0', '10', '—', '10', '[0]'], ['1', '2', '0 (10)', '12', '[1] (0 popped: 10 ≤ 12)'], ['2', '−10', '1 (12)', '2', '[1, 2]'],
          ['3', '5', '1 (12)', '17', '[3] (2 and 1 popped)'], ['4', '20', '3 (17)', '<span class="c-g">37</span>', '[4]']
        ] },
        complexity: `<p>Time O(N) amortised, space O(N) (O(k) for the deque).</p>`,
        followUps: ['Return the chosen indices (store the argmax parent).', 'Also require at most m elements chosen → add a dimension, then think about Aliens/Lagrangian relaxation.', 'Gap must be at least g and at most k → push index i − g into the deque only when it becomes eligible.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 5 — Convex Hull Trick (+ Li Chao tree)
  // =====================================================================
  topics.push({
    title: 'Convex Hull Trick & Li Chao Tree: When Every Choice Is a Straight Line',
    analogy: `<p>Picture several <b>mobile phone plans</b>. Each has a fixed monthly fee plus a price per GB: plan A = ₹100 + ₹50/GB, plan B = ₹300 + ₹20/GB, plan C = ₹800 + ₹5/GB. Each plan is a <b>straight line</b> "cost vs GB". For light users A is cheapest, medium users B, heavy users C. If you draw all lines and trace the <b>lowest one</b> at every point, you get a bent "floor" shape — the <b>lower envelope</b>. Some plans never touch that floor: they are never the best for anyone and can be thrown away.</p>
      <p>The Convex Hull Trick keeps only the plans on the floor. When a new customer asks "what's cheapest for 12 GB?", you look at the floor — no need to price every plan.</p>`,
    explain: `<p><b>Where it appears.</b> A DP transition of the form</p>
      <p style="text-align:center"><code>dp[i] = min over j &lt; i of ( dp[j] + m<sub>j</sub> · x<sub>i</sub> ) + (stuff depending only on i)</code></p>
      <p>For a fixed j, <code>m<sub>j</sub>·x + dp[j]</code> is a <b>line</b> in x (slope m<sub>j</sub>, intercept dp[j]). Computing dp[i] means: <b>"which line is lowest at x = x<sub>i</sub>?"</b> Naively O(N) per i → O(N<sup>2</sup>). With the hull: O(1) amortised or O(log N).</p>
      <h4>How to spot the line: expand the square</h4>
      <p>Frog 3: <code>dp[i] = min<sub>j</sub> dp[j] + (h<sub>i</sub> − h<sub>j</sub>)<sup>2</sup> + C</code>. Expand: (h<sub>i</sub> − h<sub>j</sub>)<sup>2</sup> = h<sub>i</sub><sup>2</sup> − 2h<sub>i</sub>h<sub>j</sub> + h<sub>j</sub><sup>2</sup>. Sort terms by who they depend on:</p>
      ${H.table(['term', 'depends on', 'role'], [['h<sub>i</sub><sup>2</sup> + C', 'only i', 'added after the min'], ['−2h<sub>j</sub>', 'only j', '<b>slope</b> m<sub>j</sub>'], ['dp[j] + h<sub>j</sub><sup>2</sup>', 'only j', '<b>intercept</b> b<sub>j</sub>'], ['h<sub>i</sub>', 'only i', '<b>query point</b> x']])}
      <p>So <code>dp[i] = h<sub>i</sub><sup>2</sup> + C + min<sub>j</sub>(m<sub>j</sub>·h<sub>i</sub> + b<sub>j</sub>)</code>. The only "mixed" term is a product → that's the signal for CHT.</p>
      <h4>The monotone deque version (most common in interviews/contests)</h4>
      <ul>
        <li>Lines are added in order of <b>decreasing slope</b> (for min). New line at the back.</li>
        <li><b>Before adding</b>: while the last line is now useless (the new line and the second-to-last together beat it everywhere), pop it. Test with intersections: line l2 is useless if x(l1, l3) ≤ x(l1, l2).</li>
        <li><b>Queries</b> x come in <b>increasing</b> order: while the second line is at least as good as the first at x, pop the front (it will never be best again because x only grows).</li>
      </ul>
      <p>Each line enters and leaves once → <b>O(N)</b> total. If queries are not sorted, keep the hull and <b>binary search</b> the right segment (O(log N)). If even slopes are not sorted, use a <b>Li Chao tree</b> (O(log C) per insert/query, very short code).</p>`,
    clues: [
      'cost contains a <b>product</b> of an i-term and a j-term: (h<sub>i</sub> − h<sub>j</sub>)<sup>2</sup>, a<sub>i</sub>·b<sub>j</sub>, (prefix<sub>i</sub> − prefix<sub>j</sub>)·t<sub>i</sub> → CHT',
      'O(N<sup>2</sup>) DP "min over all previous j" with N ≤ 2·10<sup>5</sup> and nothing else to exploit',
      '"heights strictly increasing", "costs strictly decreasing" in the statement → slopes and queries are sorted → monotone deque CHT',
      'queries arrive in arbitrary order or lines are added online → Li Chao tree or binary search on the hull',
      '"minimise the sum of squares of segment lengths / sums" → square expansion → lines',
      'answer up to 10<sup>18</sup> and products in the intersection test → watch for 128-bit overflow'
    ],
    code: [`
      // Monotone CHT for MIN queries: slopes added in DECREASING order, queries x in INCREASING order.
      class MonotoneCHT {
          long[] M, B;            // lines y = M[i] * x + B[i], stored in a deque [head, tail)
          int head = 0, tail = 0;
          MonotoneCHT(int capacity) { M = new long[capacity]; B = new long[capacity]; }

          // Is line l2 useless between l1 and l3? (slopes M[l1] > M[l2] > M[l3])
          // l2 useless  <=>  x(l1,l3) <= x(l1,l2)  <=>  (B3-B1)(M1-M2) <= (B2-B1)(M1-M3)
          private boolean bad(int l1, int l2, int l3) {
              return (B[l3] - B[l1]) * (M[l1] - M[l2]) <= (B[l2] - B[l1]) * (M[l1] - M[l3]);
          }
          void add(long m, long b) {
              M[tail] = m; B[tail] = b;
              while (tail - head >= 2 && bad(tail - 2, tail - 1, tail)) {   // pop useless last line
                  M[tail - 1] = M[tail]; B[tail - 1] = B[tail];
                  tail--;
              }
              tail++;
          }
          long eval(int i, long x) { return M[i] * x + B[i]; }
          long query(long x) {                       // x never decreases between calls
              while (tail - head >= 2 && eval(head + 1, x) <= eval(head, x)) head++;
              return eval(head, x);
          }
      }`, `
      // Li Chao tree: MIN over lines, any insertion order, any query order, integer x in [lo, hi].
      class LiChao {
          long[] M, B; boolean[] has; int lo, hi;
          LiChao(int lo, int hi) {
              this.lo = lo; this.hi = hi;
              int sz = 4 * (hi - lo + 1);
              M = new long[sz]; B = new long[sz]; has = new boolean[sz];
          }
          long f(long m, long b, long x) { return m * x + b; }
          void add(long m, long b) { add(1, lo, hi, m, b); }
          private void add(int node, int l, int r, long m, long b) {
              if (!has[node]) { has[node] = true; M[node] = m; B[node] = b; return; }
              int mid = (l + r) >> 1;
              boolean leftBetter = f(m, b, l) < f(M[node], B[node], l);
              boolean midBetter = f(m, b, mid) < f(M[node], B[node], mid);
              if (midBetter) {                       // node keeps the line that wins at mid
                  long tm = M[node], tb = B[node];
                  M[node] = m; B[node] = b; m = tm; b = tb;
              }
              if (l == r) return;
              // the loser can only win on ONE side of mid: where the winners differ
              if (leftBetter != midBetter) add(2 * node, l, mid, m, b);
              else add(2 * node + 1, mid + 1, r, m, b);
          }
          long query(long x) { return query(1, lo, hi, x); }
          private long query(int node, int l, int r, long x) {
              if (!has[node]) return Long.MAX_VALUE;
              long res = f(M[node], B[node], x);
              if (l == r) return res;
              int mid = (l + r) >> 1;
              return Math.min(res, x <= mid ? query(2 * node, l, mid, x) : query(2 * node + 1, mid + 1, r, x));
          }
      }`],
    codeTitle: ['Monotone CHT (deque of lines)', 'Li Chao tree (fully dynamic)'],
    viz: [{
      title: 'The lower envelope: which line is lowest at each x?',
      input: '-3 12; -1 5; 0 4; 1 0 | 0 6',
      inputLabel: 'lines "slope intercept" separated by ";" | x from to',
      gen: function (input) {
        var p = splitBar(input, 2, '"-3 12; -1 5 | 0 6"');
        var lines = p[0].split(';').map(function (t) { return t.trim(); }).filter(function (t) { return t.length; }).map(function (t) { return parseNums(t, 'each line (slope intercept)', 2, 2, -50, 50); });
        if (lines.length < 2 || lines.length > 6) throw new Error('Give 2 to 6 lines.');
        var xr = parseNums(p[1], 'x range', 2, 2, -10, 10);
        if (xr[1] - xr[0] < 2 || xr[1] - xr[0] > 12) throw new Error('x range must span 2..12 values, e.g. "0 6"');
        var xs = []; for (var x = xr[0]; x <= xr[1]; x++) xs.push(x);
        var rows = lines.map(function (l) { return xs.map(function (xx) { return l[0] * xx + l[1]; }); });
        var rowHead = lines.map(function (l, i) { return 'L' + i + ': ' + l[0] + 'x' + (l[1] >= 0 ? '+' : '') + l[1]; });
        var colHead = xs.map(function (xx) { return 'x=' + xx; });
        var frames = [], winners = [], hlAll = {};
        frames.push({ narr: 'Each row is one line (one possible "previous j" in the DP), each column one query x. The DP asks: <b>which row is smallest in this column?</b> Doing it for every column naively costs (#lines) per query.', parts: [{ type: 'grid', label: 'value of each line at each x', rows: rows, rowHead: rowHead, colHead: colHead }] });
        for (var c = 0; c < xs.length; c++) {
          var bi = 0; for (var i = 1; i < lines.length; i++) if (rows[i][c] < rows[bi][c]) bi = i;
          winners.push(bi); hlAll[bi + ',' + c] = 'sel';
          var h = {}; for (i = 0; i < lines.length; i++) h[i + ',' + c] = i === bi ? 'ok' : 'win'; for (var key in hlAll) if (!h[key]) h[key] = 'sel';
          frames.push({ narr: 'x = ' + xs[c] + ': lowest is <b>L' + bi + '</b> (value ' + rows[bi][c] + '). ' + (c > 0 && winners[c - 1] !== bi ? 'The winner changed from L' + winners[c - 1] + ' to L' + bi + ' — we crossed an intersection point of the envelope.' : 'Same winner as before or first column.'), parts: [{ type: 'grid', label: 'value of each line at each x', rows: rows, rowHead: rowHead, colHead: colHead, hl: h }] });
        }
        var used = [], never = [];
        lines.forEach(function (_, i) { if (winners.indexOf(i) >= 0) used.push('L' + i); else never.push('L' + i); });
        frames.push({ narr: 'Winners from left to right: ' + winners.map(function (w) { return 'L' + w; }).join(' → ') + '. Notice the winners appear in order of <b>decreasing slope</b> and never come back. Lines ' + (never.length ? never.join(', ') + ' never win — the hull deletes them up front.' : 'all win somewhere in this range.') + ' Because queries move right, a pointer that only moves forward finds each answer: O(1) amortised.', parts: [{ type: 'grid', label: 'purple = lower envelope', rows: rows, rowHead: rowHead, colHead: colHead, hl: hlAll }, { type: 'set', label: 'lines on the hull (in this x range)', items: used }, { type: 'set', label: 'useless lines', items: never.length ? never : ['none'] }] });
        return frames;
      }
    }, {
      title: 'Frog 3 with a monotone CHT deque',
      input: '1 3 4 5 10 11 12 13 | 5',
      inputLabel: 'heights h (strictly increasing) | C',
      gen: function (input) {
        var p = splitBar(input, 2, '"1 3 4 5 10 11 12 13 | 5"');
        var h = parseNums(p[0], 'heights', 2, 12, 0, 1000), C = parseNums(p[1], 'C', 1, 1, 0, 100000)[0];
        for (var t = 1; t < h.length; t++) if (h[t] <= h[t - 1]) throw new Error('Heights must be strictly increasing.');
        var n = h.length, dp = [0], L = [], head = 0, frames = [];
        function table(x, hl) {
          var rows = [];
          for (var q = head; q < L.length; q++) rows.push(['j=' + L[q].j, L[q].m, L[q].b, x === null ? '—' : L[q].m * x + L[q].b]);
          return { type: 'table', label: 'deque of lines y = m·x + b   (m = −2h<sub>j</sub>, b = dp[j] + h<sub>j</sub>²)', columns: ['line', 'slope m', 'intercept b', x === null ? 'value' : 'value at x=' + x], rows: rows, hl: hl || {} };
        }
        function dpBars(hl) { return { type: 'bars', label: 'dp (min cost to reach stone i)', values: dp.slice(), texts: dp.map(String), hl: hl || {} }; }
        function bad(l1, l2, l3) { return (l3.b - l1.b) * (l1.m - l2.m) <= (l2.b - l1.b) * (l1.m - l3.m); }
        function addLine(j) {
          var nl = { j: j, m: -2 * h[j], b: dp[j] + h[j] * h[j] };
          while (L.length - head >= 2 && bad(L[L.length - 2], L[L.length - 1], nl)) {
            var gone = L[L.length - 1];
            frames.push({ narr: 'Adding line for j = ' + j + ' (m = ' + nl.m + ', b = ' + nl.b + '). Line j = ' + gone.j + ' sits between j = ' + L[L.length - 2].j + ' and the new line, and is <span class="c-r">never strictly the lowest</span> (the intersection test says so). Pop it from the back.', parts: [table(null, one(L.length - 1 - head, 'bad')), dpBars()] });
            L.pop();
          }
          L.push(nl);
          frames.push({ narr: 'Push line for j = ' + j + ': y = ' + nl.m + '·x + ' + nl.b + '. Slopes in the deque keep decreasing (heights increase), as the trick requires.', parts: [table(null, one(L.length - 1 - head, 'ok')), dpBars(one(j, 'ok'))] });
        }
        frames.push({ narr: 'dp[i] = h<sub>i</sub>² + C + min<sub>j</sub>( −2h<sub>j</sub>·h<sub>i</sub> + dp[j] + h<sub>j</sub>² ). Each j becomes a line; each i is a query at x = h<sub>i</sub>. Start: dp[0] = 0.', parts: [{ type: 'array', label: 'heights', values: h }, dpBars(one(0, 'ok'))] });
        addLine(0);
        for (var i = 1; i < n; i++) {
          var x = h[i];
          while (L.length - head >= 2 && L[head + 1].m * x + L[head + 1].b <= L[head].m * x + L[head].b) {
            frames.push({ narr: 'Query x = h[' + i + '] = ' + x + ': the second line (j = ' + L[head + 1].j + ') is at least as low as the front (j = ' + L[head].j + '). Since future x are even larger, the front can never win again → <span class="c-r">pop front</span>.', parts: [table(x, one(0, 'bad')), dpBars()] });
            head++;
          }
          var best = L[head].m * x + L[head].b;
          dp.push(best + x * x + C);
          frames.push({ narr: 'Front line j = ' + L[head].j + ' is the lowest at x = ' + x + ': value ' + best + '. dp[' + i + '] = ' + best + ' + ' + x + '² + ' + C + ' = <b>' + dp[i] + '</b> (jump straight from stone ' + L[head].j + ').', parts: [{ type: 'array', label: 'heights', values: h, hl: one(i, 'cur'), ptr: one(i, 'i') }, table(x, one(0, 'sel')), dpBars(one(i, 'ok'))] });
          if (i < n - 1) addLine(i);
        }
        frames.push({ narr: '<b>Answer dp[' + (n - 1) + '] = ' + dp[n - 1] + '</b>. Every line was pushed once and popped at most once → O(N) instead of O(N²).', parts: [dpBars(one(n - 1, 'sel'))] });
        return frames;
      }
    }],
    examples: [
      { title: 'Phone plans as a tiny hull', html: `<p>Lines (min): A: 50x + 100, B: 20x + 300, C: 5x + 800, D: 30x + 250. Intersections: A∩B at x = 6.67, B∩C at x = 33.3. Is D ever lowest? D vs A: 30x + 250 &lt; 50x + 100 ⇔ x &gt; 7.5; D vs B: 30x + 250 &lt; 20x + 300 ⇔ x &lt; 5. Both cannot hold → D is <b>useless</b>; the hull is A, B, C. That's exactly the "bad" test.</p>` },
      { title: 'The intersection test with numbers', html: `<p>l1: y = −2x + 1 (j = 0, h = 1), l2: y = −6x + 19, l3: y = −8x + 31. x(l1, l2) = (19 − 1)/(−2 + 6) = 4.5; x(l1, l3) = (31 − 1)/(−2 + 8) = 5. Since 5 &gt; 4.5, l2 is the lowest on (4.5, 6) → <b>keep it</b>. The code compares cross-products (31−1)(−2+6) = 120 vs (19−1)(−2+8) = 108: 120 ≤ 108 is false → not bad. No division, no floating point.</p>` },
      { title: 'Max instead of min', html: `<p>For max-queries with slopes added in <b>increasing</b> order and increasing x: either flip the comparisons, or (safer) negate everything: max(m x + b) = −min((−m)x + (−b)). Negating slopes turns increasing into decreasing — the same min-code works unchanged.</p>` },
      { title: 'Queries in random order → binary search on the hull', html: `<p>The hull's lines are sorted by slope and the "switch points" x(l<sub>k</sub>, l<sub>k+1</sub>) are increasing. For an arbitrary query x, binary search the first k with value(l<sub>k+1</sub>, x) &gt; value(l<sub>k</sub>, x). Insertions still happen at the back; only the front-pointer trick is lost. O(log N) per query.</p>`, code: `long queryAnyOrder(long[] M, long[] B, int size, long x) {
    int lo = 0, hi = size - 1;                          // lines 0..size-1 form a valid hull
    while (lo < hi) {
        int mid = (lo + hi) >>> 1;
        if (M[mid + 1] * x + B[mid + 1] <= M[mid] * x + B[mid]) lo = mid + 1;  // next line better: go right
        else hi = mid;
    }
    return M[lo] * x + B[lo];
}` }
    ],
    deepDive: `<p><b>Why the envelope is "convex".</b> The minimum of lines is a concave function (a cap shape); its graph is the lower convex hull of the dual points (m, b) — hence the name. Each line on it owns one contiguous interval of x, and the owners appear in slope order. That ordering is what lets a pointer or binary search find the owner.</p>
      <p><b>Overflow is the #1 bug.</b> The bad() test multiplies an intercept difference (up to 10<sup>18</sup> in many problems) by a slope difference (10<sup>9</sup>) → 10<sup>27</sup>, way past <code>long</code>. Options: <code>__int128</code> in C++; in Java <code>Math.multiplyHigh</code> to compare 128-bit products (see the Kalila practice problem), <code>BigInteger</code>, or compare intersection x's as <code>long double</code> / floor-division when the problem guarantees ranges. Li Chao avoids intersections entirely — it only evaluates lines — which is a big reason people prefer it.</p>
      <p><b>Equal slopes.</b> Two lines with the same slope: keep the one with the smaller intercept (for min) before running bad(), or the cross-multiplication divides by zero logically.</p>
      <p><b>Li Chao tree.</b> Each node stores the line that is best at its midpoint. When a new line arrives, the winner at mid stays; the loser can only be better on one side (two lines cross at most once), so it recurses into one child → O(log C) insert and query, where C is the size of the x domain. Use coordinate compression for huge sparse x, or a dynamic (pointer) tree. It also supports <b>segments</b> (lines valid only on an x-interval) in O(log<sup>2</sup> C).</p>
      <p><b>Fully dynamic hull</b> ("LineContainer" with a TreeSet keyed by slope and stored switch points) gives O(log N) insert/query in any order. Related ideas: <b>Aliens trick / WQS binary search</b> (remove a "use exactly k segments" dimension by penalising each segment by λ, then binary search λ — often combined with CHT), and <b>Monge / SMAWK</b> for totally monotone matrices.</p>`,
    aiEra: `<p><b>What AI changes:</b> CHT and Li Chao code are well represented online, so assistants produce them quickly. The real skill is the <b>algebra step</b>: expanding the cost, separating i-only, j-only and mixed terms, and checking the monotonicity guarantees in the statement. An AI that pattern-matches "DP with squares" sometimes applies monotone CHT when queries are <i>not</i> sorted — silently wrong answers.</p>
      <p><b>Use AI as a partner:</b> paste the recurrence and ask "rewrite it as min over lines; list slope, intercept, query point, and state whether slopes/queries are monotone given the constraints." Then let it generate a brute-force O(N<sup>2</sup>) checker and a random tester (that is how this module's solutions were verified).</p>
      <p><b>Where AI goes wrong:</b> overflow in bad(), mixing up min/max orientation (popping the wrong end), floating-point intersection comparisons that fail on near-parallel lines, and Li Chao trees sized by N instead of the x-range. <b>You own:</b> the transformation to lines, the monotonicity argument, and the overflow analysis — exactly what an interviewer probes at this level.</p>`,
    problems: [{
      title: 'Frog 3 (jump to any later stone, squared cost)',
      level: 'Hard', tags: ['dp', 'convex hull trick', 'math'], companies: ['AtCoder', 'Jane Street', 'Citadel'],
      statement: `<p>There are <code>N</code> stones with strictly increasing heights <code>h[0] &lt; h[1] &lt; … &lt; h[N−1]</code>. A frog on stone <code>j</code> may jump to any stone <code>i &gt; j</code>, paying <code>(h[i] − h[j])<sup>2</sup> + C</code>. Starting on stone 0, return the minimum total cost to reach stone N − 1.</p>`,
      constraints: `2 ≤ N ≤ 2·10<sup>5</sup>, 1 ≤ C ≤ 10<sup>12</sup>, 1 ≤ h[i] ≤ 10<sup>6</sup>, h strictly increasing`,
      example: `${H.arr([1, 2, 3, 4, 5], { label: 'h, C = 6', hl: { 0: 'g', 2: 'g', 4: 'g' } })}<p>Output <b>20</b>: 0 → 2 costs (3−1)² + 6 = 10, 2 → 4 costs (5−3)² + 6 = 10. Jumping 0 → 4 directly costs 16 + 6 = 22; stepping one by one costs 4 × 7 = 28. The fixed fee C rewards fewer jumps, the square rewards shorter jumps — DP balances both.</p>`,
      brute: { why: `<p>O(N<sup>2</sup>): for every i scan all j &lt; i. For N = 2·10<sup>5</sup> that is 2·10<sup>10</sup> operations. The waste: each scan evaluates N "lines" at one point although most of them can never be the minimum again.</p>`, code: `
        long bruteFrog(long[] h, long C) {
            int n = h.length;
            long[] dp = new long[n];
            for (int i = 1; i < n; i++) {
                dp[i] = Long.MAX_VALUE;
                for (int j = 0; j < i; j++) {
                    long d = h[i] - h[j];
                    dp[i] = Math.min(dp[i], dp[j] + d * d + C);
                }
            }
            return dp[n - 1];
        }` },
      mcq: { q: 'After expanding (h<sub>i</sub> − h<sub>j</sub>)², which quantity is the <b>slope</b> of line j?', options: ['h<sub>j</sub><sup>2</sup>', '−2h<sub>j</sub>', 'dp[j]', 'h<sub>i</sub>'], answer: 1, explain: 'The mixed term is −2h<sub>i</sub>h<sub>j</sub>. Treat h<sub>i</sub> as x; then −2h<sub>j</sub> multiplies x, so it is the slope. dp[j] + h<sub>j</sub>² is the intercept.' },
      hints: [`<p><b>Aha:</b> expand the square. dp[i] = h<sub>i</sub>² + C + min<sub>j</sub>(−2h<sub>j</sub>·h<sub>i</sub> + dp[j] + h<sub>j</sub>²). Inside the min: a line in x = h<sub>i</sub>.</p>`, `<p>Heights increase → slopes −2h<sub>j</sub> are added in decreasing order and queries x = h<sub>i</sub> increase → monotone deque CHT, O(N).</p>`, `<p>Recipe: add line(j=0); for i = 1..N−1: pop front while line 2 ≤ line 1 at h[i]; dp[i] = front(h[i]) + h[i]² + C; add line(−2h[i], dp[i] + h[i]²) popping useless back lines. Overflow check: dp ≤ ~2·10<sup>12</sup>, slope diff ≤ 2·10<sup>6</sup> → products ≤ ~6·10<sup>18</sup>, fits in long (barely!).</p>`],
      solution: {
        approach: `<p>Convex hull trick with a deque stored in two arrays. Each stone's line is added once and removed at most once; each query moves the front pointer forward only.</p>`,
        code: `
          class Solution {
              long[] M, B; int head, tail;

              long eval(int i, long x) { return M[i] * x + B[i]; }

              // l2 is useless if intersection(l1,l3) is at or left of intersection(l1,l2)
              boolean bad(int l1, int l2, int l3) {
                  return (B[l3] - B[l1]) * (M[l1] - M[l2]) <= (B[l2] - B[l1]) * (M[l1] - M[l3]);
              }

              void add(long m, long b) {
                  M[tail] = m; B[tail] = b;
                  while (tail - head >= 2 && bad(tail - 2, tail - 1, tail)) {
                      M[tail - 1] = M[tail]; B[tail - 1] = B[tail];    // drop the middle line
                      tail--;
                  }
                  tail++;
              }

              long query(long x) {
                  while (tail - head >= 2 && eval(head + 1, x) <= eval(head, x)) head++;
                  return eval(head, x);
              }

              public long frog3(long[] h, long C) {
                  int n = h.length;
                  M = new long[n]; B = new long[n]; head = 0; tail = 0;
                  long[] dp = new long[n];
                  add(-2 * h[0], dp[0] + h[0] * h[0]);              // line for stone 0
                  for (int i = 1; i < n; i++) {
                      dp[i] = query(h[i]) + h[i] * h[i] + C;
                      add(-2 * h[i], dp[i] + h[i] * h[i]);
                  }
                  return dp[n - 1];
              }
          }`,
        alt: [{ lang: 'cpp', code: `long long frog3(vector<long long>& h, long long C) {
    int n = h.size();
    vector<long long> M, B, dp(n, 0);
    size_t head = 0;
    auto bad = [&](size_t a, size_t b, long long m3, long long b3) {
        return (__int128)(b3 - B[a]) * (M[a] - M[b]) <= (__int128)(B[b] - B[a]) * (M[a] - m3);
    };
    auto add = [&](long long m, long long b) {
        while (M.size() - head >= 2 && bad(M.size() - 2, M.size() - 1, m, b)) { M.pop_back(); B.pop_back(); }
        M.push_back(m); B.push_back(b);
    };
    add(-2 * h[0], h[0] * h[0]);
    for (int i = 1; i < n; i++) {
        while (M.size() - head >= 2 && M[head + 1] * h[i] + B[head + 1] <= M[head] * h[i] + B[head]) head++;
        dp[i] = M[head] * h[i] + B[head] + h[i] * h[i] + C;
        add(-2 * h[i], dp[i] + h[i] * h[i]);
    }
    return dp[n - 1];
}` }],
        dry: { head: ['i', 'h[i]', 'best j (front line)', 'dp[i]', 'why'], rows: [
          ['0', '1', '—', '0', 'start'], ['1', '2', '0', '7', '1 + 6'], ['2', '3', '0', '10', '(3−1)² + 6 = 10 beats 7 + 1 + 6 = 14'],
          ['3', '4', '0', '15', '9 + 6 = 15 beats 7 + 4 + 6 = 17 and 10 + 1 + 6 = 17'], ['4', '5', '2', '<span class="c-g">20</span>', '10 + 4 + 6 = 20 beats 22, 22, 22']
        ] },
        complexity: `<p>Time O(N) amortised (each line pushed/popped once). Space O(N).</p>`,
        followUps: ['Heights not sorted (but distinct)? Queries become arbitrary → Li Chao tree over h.', 'Frog may only jump at most K stones → lines also expire: Li Chao on a segment tree of time, or divide &amp; conquer + CHT.', 'Cost |h<sub>i</sub> − h<sub>j</sub>|³? No longer linear in a single product → CHT does not apply directly.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 6 — Divide & Conquer optimization
  // =====================================================================
  topics.push({
    title: 'Divide & Conquer Optimization: Monotone Split Points',
    analogy: `<p>A school bus route has houses along one road, and you must split them into K groups, one bus each. Think about where the <b>last bus's group begins</b>. If the road gets <i>longer</i> (more houses at the end), the best start of the last group never moves <b>backwards</b> — it stays or shifts right. That "never moves backwards" fact is gold.</p>
      <p>So you solve the <b>middle</b> house first: scan all candidate starts, find the best one, say house 37. Now every house to the left of the middle only needs to look at starts ≤ 37, and every house to the right only at starts ≥ 37. Halve, recurse — like binary search for answers. That's the divide &amp; conquer optimization.</p>`,
    explain: `<p><b>The shape.</b> Layered DP for "split an array into K contiguous groups":</p>
      <p style="text-align:center"><code>dp[k][i] = min over j &lt; i of ( dp[k−1][j] + cost(j, i) )</code></p>
      <p>(the k-th group covers elements j+1..i). Naively: K layers × N values of i × N values of j = <b>O(K·N<sup>2</sup>)</b>.</p>
      <p><b>The key property.</b> Let <code>opt(i)</code> = the best j for i (take the smallest if tied). If</p>
      <p style="text-align:center"><code>opt(i) ≤ opt(i + 1)</code> for all i &nbsp;&nbsp;(split points are monotone)</p>
      <p>then we can compute one layer in <b>O(N log N)</b>:</p>
      <ol>
        <li><code>solve(l, r, optL, optR)</code> must fill dp[k][l..r], knowing every answer lies in [optL, optR].</li>
        <li>Take <code>mid = (l + r)/2</code>. Scan j from optL to min(mid − 1, optR), keep the best → dp[k][mid] and <code>best</code>.</li>
        <li>Recurse <code>solve(l, mid − 1, optL, best)</code> and <code>solve(mid + 1, r, best, optR)</code>.</li>
      </ol>
      <p>Each recursion level scans about N + (number of calls) candidates in total, and there are log N levels → O(N log N) per layer → <b>O(K·N log N)</b> overall.</p>
      ${H.table(['N', 'K', 'naive K·N²', 'D&amp;C K·N·log N'], [['5 000', '20', '5·10<sup>8</sup>', '1.2·10<sup>6</sup>'], ['10<sup>5</sup>', '20', '2·10<sup>11</sup> ✗', '3.4·10<sup>7</sup> ✓']])}
      <p><b>When does opt move monotonically?</b> A sufficient condition is the <b>quadrangle inequality</b> on the cost: for a ≤ b ≤ c ≤ d, <code>cost(a, c) + cost(b, d) ≤ cost(a, d) + cost(b, c)</code> — "two overlapping groups are never worse than one big group plus one small group inside it". Squares of non-negative sums, sums of distances to a median, "number of equal pairs inside a segment" all satisfy it. When unsure, <b>stress-test</b>: compare against the O(K·N<sup>2</sup>) version on random small inputs (see the runnable example).</p>`,
    clues: [
      '"split / partition the array into <b>exactly K contiguous</b> groups (or at most K)" + minimise a sum of group costs',
      'N up to 10<sup>4</sup>–10<sup>5</sup> with K ≤ a few hundred → O(K·N log N) target',
      'group cost is "convex-ish": (sum)<sup>2</sup>, distance to median, number of inversions/equal pairs inside → quadrangle inequality likely',
      'you can compute cost(j, i) in O(1) (prefix sums) or amortised with moving pointers',
      '"place K facilities (mailboxes, warehouses, guards) on a line" → layers over facilities, D&amp;C over positions',
      'your O(K·N<sup>2</sup>) layered DP is correct but TLE → check if opt(i) is monotone'
    ],
    code: [`
      // Generic Divide & Conquer optimisation for  dp[k][i] = min_{j<i} dp[k-1][j] + cost(j, i).
      // cost(j, i) = cost of one group covering elements j+1..i (1-based prefix positions).
      class DivideConquerDP {
          interface Cost { long of(int j, int i); }
          static final long INF = Long.MAX_VALUE / 4;
          long[] prev, cur;
          Cost cost;

          // Fill cur[l..r]; the best split for every i in [l, r] is known to lie in [optL, optR].
          void solve(int l, int r, int optL, int optR) {
              if (l > r) return;
              int mid = (l + r) >>> 1;
              long best = INF; int bestJ = optL;
              for (int j = optL; j <= Math.min(mid - 1, optR); j++) {
                  if (prev[j] >= INF) continue;
                  long v = prev[j] + cost.of(j, mid);
                  if (v < best) { best = v; bestJ = j; }      // strict '<' keeps the smallest argmin
              }
              cur[mid] = best;
              solve(l, mid - 1, optL, bestJ);                 // left half: splits ≤ bestJ
              solve(mid + 1, r, bestJ, optR);                 // right half: splits ≥ bestJ
          }

          long run(int n, int K, Cost c) {
              cost = c;
              prev = new long[n + 1];
              Arrays.fill(prev, INF);
              for (int i = 1; i <= n; i++) prev[i] = cost.of(0, i);   // one group
              for (int k = 2; k <= K; k++) {
                  cur = new long[n + 1];
                  Arrays.fill(cur, INF);
                  solve(k, n, k - 1, n - 1);                  // each of k groups needs ≥ 1 element
                  prev = cur;
              }
              return prev[n];
          }
      }`, { lang: 'python', code: `import random

def brute(a, K):
    n = len(a); P = [0]
    for x in a: P.append(P[-1] + x)
    INF = float('inf')
    dp = [0] + [INF] * n
    for _ in range(K):
        nd = [INF] * (n + 1)
        for i in range(1, n + 1):
            nd[i] = min((dp[j] + (P[i] - P[j]) ** 2 for j in range(i) if dp[j] < INF), default=INF)
        dp = nd
    return dp[n]

def dnc(a, K):
    n = len(a); P = [0]
    for x in a: P.append(P[-1] + x)
    INF = float('inf')
    prev = [INF] + [P[i] ** 2 for i in range(1, n + 1)]
    for k in range(2, K + 1):
        cur = [INF] * (n + 1)
        def solve(l, r, ol, orr):
            if l > r: return
            mid = (l + r) // 2
            best, bj = INF, ol
            for j in range(ol, min(mid - 1, orr) + 1):
                v = prev[j] + (P[mid] - P[j]) ** 2
                if v < best: best, bj = v, j
            cur[mid] = best
            solve(l, mid - 1, ol, bj); solve(mid + 1, r, bj, orr)
        solve(k, n, k - 1, n - 1)
        prev = cur
    return prev[n]

random.seed(23)
bad = 0
for _ in range(300):                       # stress test: D&C must equal brute force
    n = random.randint(1, 9); K = random.randint(1, n)
    a = [random.randint(0, 9) for _ in range(n)]
    if dnc(a, K) != brute(a, K): bad += 1
print("mismatches:", bad)                  # 0
print(dnc([1, 3, 2, 4, 1, 5, 2], 3))       # 110`, run: true, title: 'Stress test D&C vs brute force (Python, runnable)' }],
    codeTitle: ['Divide & Conquer DP template (Java)', 'Random stress test (Python)'],
    viz: {
      title: 'solve(l, r, optL, optR): shrinking the search for split points',
      input: '1 3 2 4 1 5 2 | 3',
      inputLabel: 'non-negative array | K groups (cost = (group sum)²)',
      gen: function (input) {
        var p = splitBar(input, 2, '"1 3 2 4 1 5 2 | 3"');
        var a = parseNums(p[0], 'the array', 2, 10, 0, 20), K = parseNums(p[1], 'K', 1, 1, 2, a.length)[0];
        var n = a.length, P = [0], i;
        for (i = 0; i < n; i++) P.push(P[i] + a[i]);
        var INF = Infinity, prev = [INF], frames = [], stack = [], optArr = [];
        for (i = 1; i <= n; i++) prev.push(P[i] * P[i]);
        var pos = []; for (i = 0; i <= n; i++) pos.push(i);
        frames.push({ narr: 'Prefix positions 0..' + n + ': position i means "the first i elements". Layer 1 (one group) is just (prefix sum)²: ' + prev.slice(1).join(', ') + '. Now compute layers 2..' + K + ' with divide &amp; conquer.', parts: [{ type: 'array', label: 'array', values: a, start: 1, showIdx: true }, { type: 'array', label: 'dp[1][i]', values: prev.map(show), idxLabels: pos.map(function (x) { return 'i=' + x; }) }] });
        for (var k = 2; k <= K; k++) {
          var cur = []; optArr = [];
          for (i = 0; i <= n; i++) { cur.push(INF); optArr.push('·'); }
          (function solve(l, r, oL, oR) {
            if (l > r) return;
            var mid = (l + r) >> 1, best = INF, bj = oL, hi = Math.min(mid - 1, oR), tried = [];
            for (var j = oL; j <= hi; j++) { if (prev[j] === INF) continue; var v = prev[j] + (P[mid] - P[j]) * (P[mid] - P[j]); tried.push(j + '→' + v); if (v < best) { best = v; bj = j; } }
            cur[mid] = best; optArr[mid] = bj;
            stack.push('solve(' + l + ',' + r + ' | ' + oL + '..' + oR + ')');
            var hl = {}; for (var q = oL; q <= hi; q++) hl[q] = 'win'; hl[bj] = 'ok';
            var hc = {}; hc[mid] = 'cur'; for (q = l; q <= r; q++) if (q !== mid) hc[q] = 'win';
            frames.push({ narr: 'Layer ' + k + ': fill i ∈ [' + l + ', ' + r + '] knowing splits lie in [' + oL + ', ' + oR + ']. Middle i = <b>' + mid + '</b>: only try j = ' + oL + '..' + hi + ' (' + tried.join(', ') + '). Best j = <b>' + bj + '</b>, dp = ' + best + '. Left half will search j ≤ ' + bj + ', right half j ≥ ' + bj + '.',
              parts: [{ type: 'array', label: 'dp[' + (k - 1) + '][j] — candidates (blue), chosen (green)', values: prev.map(show), idxLabels: pos.map(function (x) { return 'j=' + x; }), hl: hl },
                { type: 'array', label: 'dp[' + k + '][i] being filled', values: cur.map(show), idxLabels: pos.map(function (x) { return 'i=' + x; }), hl: hc },
                { type: 'array', label: 'opt[i] (best split) so far', values: optArr.slice(), idxLabels: pos.map(function (x) { return 'i=' + x; }), hl: one(mid, 'ok') },
                { type: 'stack', label: 'recursion stack', items: stack.slice(), hl: one(stack.length - 1, 'cur') }] });
            solve(l, mid - 1, oL, bj);
            solve(mid + 1, r, bj, oR);
            stack.pop();
          })(k, n, k - 1, n - 1);
          frames.push({ narr: 'Layer ' + k + ' done. Look at opt[i]: <b>' + optArr.slice(k).join(' ≤ ') + '</b> — non-decreasing, exactly the property that let us shrink every search range.', parts: [{ type: 'array', label: 'dp[' + k + '][i]', values: cur.map(show), idxLabels: pos.map(function (x) { return 'i=' + x; }) }, { type: 'array', label: 'opt[i]', values: optArr.slice(), idxLabels: pos.map(function (x) { return 'i=' + x; }), hl: one(n, 'sel') }] });
          prev = cur;
        }
        frames.push({ narr: '<b>Answer dp[' + K + '][' + n + '] = ' + prev[n] + '</b>: the minimum sum of squared group sums with ' + K + ' groups.', parts: [{ type: 'vars', vals: { K: K, n: n, answer: prev[n] }, hl: { answer: 'sel' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Checking the quadrangle inequality with numbers', html: `<p>cost(j, i) = (P[i] − P[j])² for a = [1, 3, 2, 4] (P = 0, 1, 4, 6, 10). Take a=0, b=1, c=2, d=4: cost(0,2) + cost(1,4) = 4² + 9² = 16 + 81 = <b>97</b>; cost(0,4) + cost(1,2) = 10² + 3² = 100 + 9 = <b>109</b>. 97 ≤ 109 ✓. Intuition: squaring punishes one huge group more than two medium ones. With <i>negative</i> elements the prefix sums are not monotone and the inequality can fail — then D&amp;C may give wrong answers.</p>` },
      { title: 'K = 3 split of [1, 3, 2, 4, 1, 5, 2]', html: `<p>Total 18, ideal 6 per group. Answer <b>110</b> = [1, 3, 2] (6² = 36) + [4, 1] (5² = 25) + [5, 2] (7² = 49). The visualizer shows the opt row for layer 3: opt[3..7] = 2, 3, 3, 5, 5 — non-decreasing.</p>` },
      { title: 'Costs that are not O(1): moving-pointer cost (CF 868F)', html: `<p>"Split into K segments, cost of a segment = number of pairs of equal elements inside it." No prefix-sum formula. Keep a global window [L, R] with a frequency array and move its ends to the requested (j+1, i) — adding element x adds freq[x] pairs. Inside one solve() call the requested windows move monotonically, so the total pointer movement is O(N log N) per layer — the same bound as the scans. Cost function trick: <code>while (R &lt; i) add(++R); while (L &gt; j+1) add(--L); while (R &gt; i) remove(R--); while (L &lt; j+1) remove(L++);</code></p>` },
      { title: 'Recognising the 1D cousin', html: `<p>If there is no K (just <code>dp[i] = min<sub>j</sub> dp[j] + cost(j, i)</code> with dp on both sides), D&amp;C does not apply directly because dp[j] for the same layer is not ready. Use the <b>monotone queue + binary search</b> ("decision monotonicity") technique, CHT if the cost is linear-ish, or CDQ divide and conquer. Or add a K dimension and remove it with the Aliens trick.</p>` }
    ],
    deepDive: `<p><b>Why QI ⇒ monotone opt.</b> Suppose i &lt; i' but opt(i') = j' &lt; j = opt(i). Apply QI with j' ≤ j ≤ i ≤ i': cost(j', i) + cost(j, i') ≤ cost(j', i') + cost(j, i). Add dp[j'] + dp[j] to both sides and rearrange: [dp[j] + cost(j, i')] − [dp[j'] + cost(j', i')] ≤ [dp[j] + cost(j, i)] − [dp[j'] + cost(j', i)] &lt; 0 (j is strictly better for i, taking smallest argmin). So j beats j' for i' too — contradiction. Hence opt(i) ≤ opt(i').</p>
      <p><b>Complexity accounting.</b> At recursion depth d there are 2<sup>d</sup> calls; their [optL, optR] ranges overlap only at endpoints, so the total scan length per depth is ≤ N + 2<sup>d</sup>. Depth ≤ log N → O(N log N) per layer. Recursion depth is only log N, so no stack overflow risk in Java.</p>
      <p><b>D&amp;C vs Knuth.</b> D&amp;C needs monotone opt along i within a layer; Knuth (next topic) needs the stronger two-sided condition opt[i][j−1] ≤ opt[i][j] ≤ opt[i+1][j] and gives O(N<sup>2</sup>) for interval DPs. For layered partition DPs, Knuth can also be applied as opt[k−1][i] ≤ opt[k][i] ≤ opt[k][i+1] giving O(N<sup>2</sup>) total regardless of K — better when K is close to N.</p>
      <p><b>Removing K entirely.</b> If the answer as a function of K is <b>convex</b> (often true when QI holds), the Aliens trick (WQS / Lagrangian relaxation) binary searches a penalty λ per group and solves an unconstrained 1D DP each time: O(N log N · log C) — wins when K is large.</p>
      <p><b>Practical tips.</b> Use <code>long</code> and an INF of Long.MAX_VALUE/4 to survive additions. Iterate i only from k (each group non-empty). Break ties consistently (strict &lt; → smallest argmin). Always stress-test against the naive layer DP: monotonicity bugs give answers that are "almost right".</p>`,
    aiEra: `<p><b>What AI changes:</b> D&amp;C optimization is a short template; AI writes it reliably. The hard part — and what interviewers at quant firms and contest-heavy teams test — is <b>justifying</b> that opt is monotone. LLMs frequently assert "this cost satisfies the quadrangle inequality" without checking; with negative values or non-convex costs that claim is false and the code silently returns a slightly wrong answer.</p>
      <p><b>Use AI as a partner:</b> ask it to write the brute-force layered DP and a randomized comparison (like the Python cell), including negative numbers and ties. If mismatches appear, you have learned that the optimisation does not apply. Ask it to <i>prove</i> QI for your cost in two lines — then check the proof yourself.</p>
      <p><b>Where AI goes wrong:</b> mixing 0-based and 1-based prefix indices (cost(j, i) covering j..i vs j+1..i), scanning j up to mid instead of mid − 1 (empty group), forgetting that layer k must start at i = k, and INF overflow. <b>You own:</b> the monotonicity argument, the indexing convention, and the decision between D&amp;C, Knuth, Aliens or CHT.</p>`,
    problems: [{
      title: 'Split Array into K Groups Minimising the Sum of Squared Group Sums',
      level: 'Hard', tags: ['dp', 'divide and conquer optimization', 'prefix sums'], companies: ['Citadel', 'Two Sigma', 'Google'],
      statement: `<p>Given an array of <b>non-negative</b> integers <code>a</code> and an integer <code>K</code>, split the array into exactly <code>K</code> non-empty contiguous groups. The cost of a group is (sum of its elements)<sup>2</sup>. Return the minimum total cost.</p>`,
      constraints: `1 ≤ K ≤ N ≤ 10<sup>4</sup>, 0 ≤ a[i] ≤ 10<sup>4</sup> (answers fit in long)`,
      example: `${H.arr([1, 3, 2, 4, 1, 5, 2], { label: 'a, K = 3', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'b', 4: 'b', 5: 'p', 6: 'p' } })}<p>Output <b>110</b> = (1+3+2)² + (4+1)² + (5+2)² = 36 + 25 + 49. Sums 6, 5, 7 are as equal as possible — squaring rewards balance.</p>`,
      brute: { why: `<p>Layered DP with a full scan: O(K·N<sup>2</sup>) = 10<sup>4</sup> · 10<sup>8</sup> = 10<sup>12</sup> for the max input. The waste: for i and i + 1 we scan all j again, although the best j for i + 1 is never left of the best j for i.</p>`, code: `
        long bruteSplit(int[] a, int K) {
            int n = a.length;
            long[] P = new long[n + 1];
            for (int i = 0; i < n; i++) P[i + 1] = P[i] + a[i];
            long INF = Long.MAX_VALUE / 4;
            long[][] dp = new long[K + 1][n + 1];
            for (long[] row : dp) Arrays.fill(row, INF);
            dp[0][0] = 0;
            for (int k = 1; k <= K; k++)
                for (int i = 1; i <= n; i++)
                    for (int j = 0; j < i; j++)                     // last group = a[j..i-1]
                        if (dp[k - 1][j] < INF) {
                            long s = P[i] - P[j];
                            dp[k][i] = Math.min(dp[k][i], dp[k - 1][j] + s * s);
                        }
            return dp[K][n];
        }` },
      mcq: { q: 'In layer k we found opt(mid = 5) = 3. Which j values must solve() try for i = 6 or 7?', options: ['Only j ≥ 3', 'Only j ≤ 3', 'All j from k−1 to i−1', 'Only j = 3'], answer: 0, explain: 'Monotone opt: i &gt; mid ⇒ opt(i) ≥ opt(mid) = 3. The right half searches [3, optR]. The left half (i &lt; 5) searches [optL, 3].' },
      hints: [`<p><b>Aha:</b> dp[k][i] = min<sub>j</sub> dp[k−1][j] + (P[i] − P[j])². As i grows, the best start of the last group never moves left (non-negative values + convex square cost).</p>`, `<p>Compute each layer with solve(l, r, optL, optR): fix mid, scan j ∈ [optL, min(mid−1, optR)], then recurse with the found best split as the new bound.</p>`, `<p>Edge cases: K = 1 → (total)²; K = N → Σ a[i]²; groups must be non-empty → layer k fills i ∈ [k, n] and j ∈ [k−1, i−1]. Use long; INF = Long.MAX_VALUE marker skipped explicitly.</p>`],
      solution: {
        approach: `<p>Layer by layer, each in O(N log N) via divide &amp; conquer on the monotone split point. Total O(K·N log N) ≈ 10<sup>4</sup> · 10<sup>4</sup> · 14 = 1.4·10<sup>9</sup> elementary steps in the worst case — fine in C++, tight in Java; combine with Knuth (O(N<sup>2</sup>)) if K is huge.</p>`,
        code: `
          class Solution {
              long[] P, prev, cur;

              long cost(int j, int i) { long s = P[i] - P[j]; return s * s; }   // group a[j..i-1]

              void compute(int l, int r, int optL, int optR) {
                  if (l > r) return;
                  int mid = (l + r) >>> 1;
                  long best = Long.MAX_VALUE; int bestJ = optL;
                  for (int j = optL; j <= Math.min(mid - 1, optR); j++) {
                      if (prev[j] == Long.MAX_VALUE) continue;              // impossible state
                      long v = prev[j] + cost(j, mid);
                      if (v < best) { best = v; bestJ = j; }
                  }
                  cur[mid] = best;
                  compute(l, mid - 1, optL, bestJ);
                  compute(mid + 1, r, bestJ, optR);
              }

              public long minSquaredSplit(int[] a, int K) {
                  int n = a.length;
                  P = new long[n + 1];
                  for (int i = 0; i < n; i++) P[i + 1] = P[i] + a[i];
                  prev = new long[n + 1];
                  Arrays.fill(prev, Long.MAX_VALUE);
                  for (int i = 1; i <= n; i++) prev[i] = cost(0, i);        // layer 1
                  for (int k = 2; k <= K; k++) {
                      cur = new long[n + 1];
                      Arrays.fill(cur, Long.MAX_VALUE);
                      compute(k, n, k - 1, n - 1);
                      prev = cur;
                  }
                  return prev[n];
              }
          }`,
        dry: { head: ['layer', 'call (l..r | optL..optR)', 'mid', 'j tried → value', 'dp[mid], opt'], rows: [
          ['2', '2..7 | 1..6', '4', '1→82, 2→52, 3→52', '52, j=2'],
          ['2', '5..7 | 2..6', '6', '2→160, 3→136, 4→136, 5→146', '136, j=3'],
          ['2', '7..7 | 3..6', '7', '3→180, 4→164, 5→170, 6→260', '164, j=4'],
          ['3', '3..7 | 2..6', '5', '2→59, 3→45, 4→53', '45, j=3'],
          ['3', '6..7 | 3..6', '6', '3→120, 4→88, 5→86', '86, j=5'],
          ['3', '7..7 | 5..6', '7', '5→110, 6→140', '<span class="c-g">110</span>, j=5']
        ] },
        complexity: `<p>Time O(K · N log N), space O(N) (two rolling layers).</p>`,
        followUps: ['Print the groups (store opt per layer: O(K·N) memory, or recompute).', 'Elements may be negative — does the method still work? (Stress-test it; generally no.)', 'K up to N: switch to Knuth O(N²) or Aliens trick O(N log N log C).']
      }
    }]
  });
registerModule({ id: 'dsa23', title: 'Advanced Dynamic Programming', intro: `<p>temp</p>`, goals: [], prereqs: `x`, hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
