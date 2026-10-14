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
registerModule({ id: 'dsa23', title: 'Advanced Dynamic Programming', intro: `<p>temp</p>`, goals: [], prereqs: `x`, hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
