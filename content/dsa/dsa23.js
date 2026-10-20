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
        ['How many items?', '<code>bitCount(mask)</code> (<code>Integer.bitCount</code> / <code>int.bit_count()</code> / <code>__builtin_popcount</code>; JS: loop with <code>m &amp;= m - 1</code>)', 'bitCount(1011) = 3'],
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
    code: [{ lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `
# Held-Karp: Travelling Salesman in O(2^n * n^2) time, O(2^n * n) memory.
def tsp(dist):
    n = len(dist)
    if n == 1:
        return 0
    full = 1 << n
    INF = float('inf')
    dp = [[INF] * n for _ in range(full)]
    dp[1][0] = 0                                     # visited {0}, standing at city 0
    for mask in range(1, full, 2):                   # odd masks: every useful path contains city 0
        for last in range(n):
            cur = dp[mask][last]
            if cur == INF:                           # unreachable state
                continue
            for nxt in range(n):
                if mask >> nxt & 1:                  # already visited
                    continue
                nm = mask | 1 << nxt
                if cur + dist[last][nxt] < dp[nm][nxt]:
                    dp[nm][nxt] = cur + dist[last][nxt]
    # close the tour back to city 0
    return min(dp[full - 1][last] + dist[last][0] for last in range(1, n))` }, { lang: 'js', code: `
// Held-Karp: Travelling Salesman in O(2^n * n^2) time, O(2^n * n) memory.
function tsp(dist) {
  const n = dist.length, full = 1 << n;
  if (n === 1) return 0;
  const INF = 1e9;                                   // far above any real tour, and sums stay exact
  const dp = Array.from({ length: full }, () => new Array(n).fill(INF));
  dp[1][0] = 0;                                      // visited {0}, standing at city 0
  for (let mask = 1; mask < full; mask += 2) {       // odd masks: every useful path contains city 0
    for (let last = 0; last < n; last++) {
      const cur = dp[mask][last];
      if (cur >= INF) continue;                      // unreachable state
      for (let next = 0; next < n; next++) {
        if ((mask >> next) & 1) continue;            // already visited
        const nm = mask | (1 << next);
        if (cur + dist[last][next] < dp[nm][next]) dp[nm][next] = cur + dist[last][next];
      }
    }
  }
  let best = INF;
  for (let last = 1; last < n; last++)               // close the tour back to city 0
    best = Math.min(best, dp[full - 1][last] + dist[last][0]);
  return best;
}` }, { lang: 'cpp', code: `
// Held-Karp: Travelling Salesman in O(2^n * n^2) time, O(2^n * n) memory.
int tsp(const vector<vector<int>>& dist) {
    int n = dist.size(), full = 1 << n;
    if (n == 1) return 0;
    const int INF = INT_MAX / 2;                     // halved so INF + edge does not overflow
    vector<vector<int>> dp(full, vector<int>(n, INF));
    dp[1][0] = 0;                                    // visited {0}, standing at city 0
    for (int mask = 1; mask < full; mask += 2) {     // odd masks: every useful path contains city 0
        for (int last = 0; last < n; last++) {
            if (dp[mask][last] >= INF) continue;     // unreachable state
            for (int next = 0; next < n; next++) {
                if (mask >> next & 1) continue;      // already visited
                int nm = mask | (1 << next);
                dp[nm][next] = min(dp[nm][next], dp[mask][last] + dist[last][next]);
            }
        }
    }
    int best = INF;
    for (int last = 1; last < n; last++)             // close the tour back to city 0
        best = min(best, dp[full - 1][last] + dist[last][0]);
    return best;
}` }] }, { lang: 'python', code: `# Held-Karp TSP + assignment in Python (runnable)
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
    codeTitle: ['Held-Karp TSP', 'TSP + Assignment (Python, runnable)'],
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
      { title: 'Shortest Path Visiting All Nodes (LC 847) — BFS over (mask, node)', html: `<p>Unweighted graph, n ≤ 12, you may start anywhere and revisit nodes. Because edges have weight 1, plain <b>BFS</b> over states <code>(mask, node)</code> finds the shortest walk. Seed the queue with every <code>(1&lt;&lt;i, i)</code> at distance 0; stop when a state has mask = full. States: 2<sup>12</sup>·12 ≈ 49 000.</p>`, code: { lang: 'java', code: `int shortestPathLength(int[][] graph) {
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
}`, alt: [{ lang: 'python', code: `
from collections import deque

def shortest_path_length(graph):
    n = len(graph)
    full = (1 << n) - 1
    seen = {(1 << i, i) for i in range(n)}
    q = deque(seen)                                  # multi-source BFS: start anywhere
    steps = 0
    while q:
        for _ in range(len(q)):
            mask, node = q.popleft()
            if mask == full:
                return steps
            for nb in graph[node]:
                state = (mask | 1 << nb, nb)
                if state not in seen:
                    seen.add(state)
                    q.append(state)
        steps += 1
    return -1` }, { lang: 'js', code: `
function shortestPathLength(graph) {
  const n = graph.length, full = (1 << n) - 1;
  const seen = Array.from({ length: 1 << n }, () => new Uint8Array(n));
  let level = [];                                    // current BFS level of [mask, node]
  for (let i = 0; i < n; i++) { level.push([1 << i, i]); seen[1 << i][i] = 1; }
  for (let steps = 0; level.length; steps++) {
    const next = [];
    for (const [mask, node] of level) {
      if (mask === full) return steps;
      for (const nb of graph[node]) {
        const nm = mask | (1 << nb);
        if (!seen[nm][nb]) { seen[nm][nb] = 1; next.push([nm, nb]); }
      }
    }
    level = next;
  }
  return -1;
}` }, { lang: 'cpp', code: `
int shortestPathLength(vector<vector<int>>& graph) {
    int n = graph.size(), full = (1 << n) - 1;
    vector<vector<bool>> seen(1 << n, vector<bool>(n, false));
    queue<pair<int, int>> q;
    for (int i = 0; i < n; i++) { q.push({1 << i, i}); seen[1 << i][i] = true; }
    for (int steps = 0; !q.empty(); steps++) {
        for (int sz = q.size(); sz > 0; sz--) {
            auto [mask, node] = q.front(); q.pop();
            if (mask == full) return steps;
            for (int nb : graph[node]) {
                int nm = mask | (1 << nb);
                if (!seen[nm][nb]) { seen[nm][nb] = true; q.push({nm, nb}); }
            }
        }
    }
    return -1;
}` }] } },
      { title: 'Grouping with submask enumeration: Minimum Number of Work Sessions (LC 1986)', html: `<p>Tasks (n ≤ 14) must be packed into sessions of length ≤ T. Precompute <code>ok[sub]</code> = "sum of sub ≤ T". Then <code>dp[mask] = 1 + min dp[mask ^ sub]</code> over non-empty submasks <code>sub</code> of <code>mask</code> with <code>ok[sub]</code>. The loop <code>for (sub = mask; sub &gt; 0; sub = (sub - 1) &amp; mask)</code> walks every submask. Total work over all masks is <b>3<sup>n</sup></b> (each element is: out of mask, in mask but not in sub, or in sub). 3<sup>14</sup> ≈ 4.8 million.</p>`, code: { lang: 'java', code: `int minSessions(int[] tasks, int T) {
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
}`, alt: [{ lang: 'python', code: `
def min_sessions(tasks, T):
    n = len(tasks)
    full = 1 << n
    total = [0] * full                               # total[m] = sum of the tasks in m
    for m in range(1, full):
        low = m & -m
        total[m] = total[m ^ low] + tasks[low.bit_length() - 1]
    dp = [float('inf')] * full
    dp[0] = 0
    for m in range(1, full):
        sub = m
        while sub:                                   # every non-empty submask
            if total[sub] <= T:
                dp[m] = min(dp[m], dp[m ^ sub] + 1)
            sub = (sub - 1) & m
    return dp[full - 1]` }, { lang: 'js', code: `
function minSessions(tasks, T) {
  const n = tasks.length, full = 1 << n;
  const ok = new Uint8Array(full);
  for (let m = 0; m < full; m++) {
    let s = 0;
    for (let i = 0; i < n; i++) if ((m >> i) & 1) s += tasks[i];
    ok[m] = s <= T ? 1 : 0;
  }
  const dp = new Array(full).fill(Infinity);
  dp[0] = 0;
  for (let m = 1; m < full; m++)
    for (let sub = m; sub > 0; sub = (sub - 1) & m)  // every non-empty submask
      if (ok[sub]) dp[m] = Math.min(dp[m], dp[m ^ sub] + 1);
  return dp[full - 1];
}` }, { lang: 'cpp', code: `
int minSessions(vector<int>& tasks, int T) {
    int n = tasks.size(), full = 1 << n;
    vector<bool> ok(full);
    for (int m = 0; m < full; m++) {
        int s = 0;
        for (int i = 0; i < n; i++) if (m >> i & 1) s += tasks[i];
        ok[m] = s <= T;
    }
    vector<int> dp(full, INT_MAX / 2);
    dp[0] = 0;
    for (int m = 1; m < full; m++)
        for (int sub = m; sub > 0; sub = (sub - 1) & m)   // every non-empty submask
            if (ok[sub]) dp[m] = min(dp[m], dp[m ^ sub] + 1);
    return dp[full - 1];
}` }] } },
      { title: 'Memory check before you code', html: `<p>dp[2<sup>20</sup>][20] of <code>int</code> = 2<sup>20</sup>·20·4 bytes ≈ <b>84 MB</b> — risky on a 256 MB judge (in Java, object headers for 2<sup>20</sup> small arrays add ~16 MB more; a flat array avoids that, and a Python list of lists is far heavier still). Fixes: flatten to <code>int[(1&lt;&lt;n)*n]</code>, drop the start bit (fix city 0, store only masks of the other n−1 cities → half the memory), or use <code>short</code>/<code>float</code> when values fit.</p>` }
    ],
    deepDive: `<p><b>Why it is correct (optimal substructure).</b> Any optimal tour prefix that visits set S and ends at v must itself be the cheapest path over S ending at v — otherwise swap in the cheaper one and the whole tour improves. That "cut-and-paste" argument is exactly what lets dp[S][v] forget the order.</p>
      <p><b>Complexity reality.</b> Held-Karp (1962) is still the best <i>exact</i> worst-case algorithm known for general TSP: Θ(2<sup>n</sup>n<sup>2</sup>) time, Θ(2<sup>n</sup>n) memory. TSP is NP-hard, so nobody expects polynomial time. Real routing (delivery fleets, PCB drilling) uses heuristics — 2-opt, Lin-Kernighan, OR-Tools' local search — or branch-and-cut (Concorde solved 85 900-city instances). Bitmask DP is for <b>small exact</b> sub-problems: n ≤ 20 pick-up points, "visit all keys" puzzles.</p>
      <p><b>Speed tricks.</b> (1) Skip masks without the start bit (halves work). (2) Iterate only set/unset bits: take the lowest bit with <code>bits &amp; -bits</code> (its index is <code>Integer.numberOfTrailingZeros</code> / <code>__builtin_ctz</code> / <code>(b).bit_length() - 1</code> / <code>31 - Math.clz32(b)</code>) and clear it with <code>bits &amp;= bits - 1</code>. (3) Store <code>dp[last][mask]</code> or flatten so the inner loop walks memory sequentially. (4) Prune <code>dp == INF</code> states early.</p>
      <p><b>Assignment problem.</b> dp[mask] is O(2<sup>n</sup>n) — fine for n ≤ 20. For n = 500 you need the <b>Hungarian algorithm</b> (O(n<sup>3</sup>)) or min-cost flow; know that this exists and say it in interviews. For pairing <i>within one set</i> (pair 2n people) the trick is: always pair the <b>lowest unpaired index</b> with someone → O(2<sup>n</sup>·n).</p>
      <p><b>Submask enumeration</b> <code>sub = (sub - 1) &amp; mask</code> works because subtracting 1 flips the lowest set bit and all zeros below it; AND-ing with mask throws away bits outside mask. It visits submasks in decreasing numeric order, and summed over all masks gives 3<sup>n</sup>. Related: <b>broken-profile DP</b> (tiling a grid row by row, mask = which cells of the frontier are filled) and <b>SOS DP</b> (topic 8), which beats 3<sup>n</sup> for sum-style aggregates.</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant writes Held-Karp in seconds — it is one of the most-copied DP templates on the internet. The interview value moved to <b>recognising</b> that "n ≤ 16 + every order" means subsets, choosing the right state (do you need <code>last</code>? does popcount make the worker implicit?), and doing the <b>memory math</b> before the judge kills your program.</p>
      <p><b>Use AI as a partner:</b> "Here is my state dp[mask][last]. Give me 3 tiny inputs where forgetting the return edge or the n = 1 case gives a wrong answer." Or ask it to translate your solution into a flattened-array version and then <i>you</i> verify the indexing.</p>
      <p><b>Where AI goes wrong:</b> it happily proposes bitmask DP for n = 40 (2<sup>40</sup> is 10<sup>12</sup> — meet-in-the-middle or a different idea is needed), forgets <code>INF + w</code> overflow, iterates submasks with an infinite loop when <code>sub = 0</code> is not handled, or uses boxed 2D tables (<code>Integer</code> objects in Java, nested lists in Python) that blow memory. In production, an agent asked to "optimise the delivery route" should call a solver (OR-Tools) — not run 2<sup>n</sup> DP on 200 stops. <b>You own:</b> the state design, the complexity budget and the judgement call "exact DP vs heuristic".</p>`,
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
      tests: { sig: "int[][] -> int", fn: "minCost", cases: [
          [[[[9,2,7],[6,4,3],[5,8,1]]],9],
          [[[[5]]],5],
          [[[[0,0],[0,0]]],0],
          [[[[1,2],[2,1]]],2],
          [[[[10000,10000],[10000,10000]]],20000],
          [[[[4,1,3],[2,0,5],[3,2,2]]],5],
          [[[[5971,2992,5423,9871,6722],[5292,8699,9154,745,9974],[2096,1933,9928,590,3841],[302,720,6737,9241,8096],[7412,637,6181,4960,2039]]],10442],
          [[[[8924,689,8028,1463,272,7165],[7388,8632,8177,8359,7425,362],[3390,1502,6589,3831,2994,7902],[3129,8745,5581,2005,4620,5741],[4151,2983,8403,6008,3533,7175],[5869,3995,5737,2373,862,5913]]],13921],
          [[[[5251,4547,2950,4519,796,7712,2023],[1206,8502,6039,6176,9323,2487,4804],[3935,6316,6802,2316,1920,6173,3],[2831,7770,7664,4321,3671,5093,2539],[2924,8435,2827,5947,588,8757,6871],[4485,1741,8275,2881,2214,4551,7748],[3640,10,4211,1083,9906,2777,5761]]],11683],
          [[[[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],[0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30],[0,3,6,9,12,15,18,21,24,27,30,33,36,39,42,45],[0,4,8,12,16,20,24,28,32,36,40,44,48,52,56,60],[0,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75],[0,6,12,18,24,30,36,42,48,54,60,66,72,78,84,90],[0,7,14,21,28,35,42,49,56,63,70,77,84,91,98,105],[0,8,16,24,32,40,48,56,64,72,80,88,96,104,112,120],[0,9,18,27,36,45,54,63,72,81,90,99,108,117,126,135],[0,10,20,30,40,50,60,70,80,90,100,110,120,130,140,150],[0,11,22,33,44,55,66,77,88,99,110,121,132,143,154,165],[0,12,24,36,48,60,72,84,96,108,120,132,144,156,168,180],[0,13,26,39,52,65,78,91,104,117,130,143,156,169,182,195],[0,14,28,42,56,70,84,98,112,126,140,154,168,182,196,210],[0,15,30,45,60,75,90,105,120,135,150,165,180,195,210,225]]],560],
          [[[[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14],[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],[3,4,5,6,7,8,9,10,11,12,13,14,15,16,17],[4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],[5,6,7,8,9,10,11,12,13,14,15,16,17,18,19],[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],[7,8,9,10,11,12,13,14,15,16,17,18,19,20,21],[8,9,10,11,12,13,14,15,16,17,18,19,20,21,22],[9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],[10,11,12,13,14,15,16,17,18,19,20,21,22,23,24],[11,12,13,14,15,16,17,18,19,20,21,22,23,24,25],[12,13,14,15,16,17,18,19,20,21,22,23,24,25,26],[13,14,15,16,17,18,19,20,21,22,23,24,25,26,27],[14,15,16,17,18,19,20,21,22,23,24,25,26,27,28]]],210]
        ] },
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
        alt: [{ lang: 'python', run: true, code: `def min_cost(cost):
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

print(min_cost([[9, 2, 7], [6, 4, 3], [5, 8, 1]]))  # 9` }, { lang: 'js', code: `function minCost(cost) {
  const n = cost.length, full = 1 << n;
  const dp = new Int32Array(full).fill(0x7fffffff);
  dp[0] = 0;
  for (let mask = 0; mask < full; mask++) {
    if (dp[mask] === 0x7fffffff) continue;
    let w = 0;                                   // popcount = next worker
    for (let m = mask; m; m &= m - 1) w++;
    if (w === n) continue;
    for (let job = 0; job < n; job++) {
      if (mask >> job & 1) continue;
      const next = mask | 1 << job;
      dp[next] = Math.min(dp[next], dp[mask] + cost[w][job]);
    }
  }
  return dp[full - 1];
}` }, { lang: 'cpp', code: `int minCost(vector<vector<int>>& cost) {
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
    code: [{ lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `
from functools import lru_cache

# Generic digit DP template: count x in [0, N] with (digit sum % K == 0).
# Swap the 'rem' state and the final check to solve other digit problems.
def count(n, K):
    if n < 0:
        return 0
    d = list(map(int, str(n)))                       # digits of N

    @lru_cache(maxsize=None)                         # depth is only len(d), so recursion is safe
    def go(pos, rem, tight):
        if pos == len(d):
            return 1 if rem == 0 else 0              # a full number was built
        limit = d[pos] if tight else 9               # tight -> cannot exceed N's digit
        return sum(go(pos + 1, (rem + dig) % K, tight and dig == limit)
                   for dig in range(limit + 1))

    return go(0, 0, True)

def count_range(L, R, K):
    return count(R, K) - count(L - 1, K)` }, { lang: 'js', code: `
// Generic digit DP template: count x in [0, N] with (digit sum % K == 0).
// n is a BigInt (or a decimal string) and the count is a BigInt: both pass 2^53 for N near 10^18.
class DigitDP {
  count(n, K) {
    n = BigInt(n);
    if (n < 0n) return 0n;
    this.K = K;
    this.d = String(n).split('').map(Number);        // digits of N
    this.memo = this.d.map(() => new Array(K).fill(-1n));   // memo[pos][rem], non-tight only
    return this.go(0, 0, true);
  }

  go(pos, rem, tight) {
    if (pos === this.d.length) return rem === 0 ? 1n : 0n;   // a full number was built
    if (!tight && this.memo[pos][rem] !== -1n) return this.memo[pos][rem];
    const limit = tight ? this.d[pos] : 9;           // tight -> cannot exceed N's digit
    let res = 0n;
    for (let dig = 0; dig <= limit; dig++)
      res += this.go(pos + 1, (rem + dig) % this.K, tight && dig === limit);
    if (!tight) this.memo[pos][rem] = res;
    return res;
  }

  countRange(L, R, K) { return this.count(R, K) - this.count(BigInt(L) - 1n, K); }
}` }, { lang: 'cpp', code: `
// Generic digit DP template: count x in [0, N] with (digit sum % K == 0).
// Swap the 'rem' state and the final check to solve other digit problems.
class DigitDP {
    string d;                                        // digits of N
    int K;
    vector<vector<long long>> memo;                  // memo[pos][rem], only for non-tight states

    long long go(int pos, int rem, bool tight) {
        if (pos == (int)d.size()) return rem == 0;   // a full number was built
        if (!tight && memo[pos][rem] != -1) return memo[pos][rem];
        int limit = tight ? d[pos] - '0' : 9;        // tight -> cannot exceed N's digit
        long long res = 0;
        for (int dig = 0; dig <= limit; dig++)
            res += go(pos + 1, (rem + dig) % K, tight && dig == limit);
        if (!tight) memo[pos][rem] = res;
        return res;
    }
public:
    long long count(long long n, int k) {
        if (n < 0) return 0;
        K = k;
        d = to_string(n);
        memo.assign(d.size(), vector<long long>(K, -1));
        return go(0, 0, true);
    }
    long long countRange(long long L, long long R, int k) { return count(R, k) - count(L - 1, k); }
};` }] }, { lang: 'python', code: `from functools import lru_cache

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
    codeTitle: ['Digit DP template', 'Digit DP in Python + brute-force check'],
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
      { title: 'No two adjacent digits equal (state = last digit)', html: `<p>Count x in [1, N] like 1213 (ok) but not 1223. State: <code>(pos, last, tight, started)</code>. Before starting, zeros are leading zeros and do not count as "last". Size: 19 × 11 × 2 × 2 states — tiny.</p>`, code: { lang: 'java', code: `char[] d; Long[][] memo;   // memo[pos][last+1] for free, started states

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
}`, alt: [{ lang: 'python', code: `
from functools import lru_cache

def count_no_adj_equal(n):
    d = str(n)

    @lru_cache(maxsize=None)
    def go(pos, last, tight, started):               # last = -1 until the first non-zero digit
        if pos == len(d):
            return 1
        limit = int(d[pos]) if tight else 9
        res = 0
        for dig in range(limit + 1):
            now_started = started or dig != 0
            if now_started and started and dig == last:      # two equal neighbours
                continue
            res += go(pos + 1, dig if now_started else -1, tight and dig == limit, now_started)
        return res

    return go(0, -1, True, False) - 1                # minus the number 0` }, { lang: 'js', code: `
// n is a BigInt or a decimal string; the result is a BigInt.
function countNoAdjEqual(n) {
  const d = String(n);
  const memo = d.split('').map(() => new Array(11).fill(null));   // memo[pos][last+1] for free, started states
  function go(pos, last, tight, started) {
    if (pos === d.length) return 1n;
    if (!tight && started && memo[pos][last + 1] !== null) return memo[pos][last + 1];
    const limit = tight ? Number(d[pos]) : 9;
    let res = 0n;
    for (let dig = 0; dig <= limit; dig++) {
      const nowStarted = started || dig !== 0;
      if (nowStarted && started && dig === last) continue;        // two equal neighbours
      res += go(pos + 1, nowStarted ? dig : -1, tight && dig === limit, nowStarted);
    }
    if (!tight && started) memo[pos][last + 1] = res;
    return res;
  }
  return go(0, -1, true, false) - 1n;                              // minus the number 0
}` }, { lang: 'cpp', code: `
string d;
vector<array<long long, 11>> memo;                   // memo[pos][last+1] for free, started states

long long go(int pos, int last, bool tight, bool started) {
    if (pos == (int)d.size()) return 1;
    if (!tight && started && memo[pos][last + 1] != -1) return memo[pos][last + 1];
    int limit = tight ? d[pos] - '0' : 9;
    long long res = 0;
    for (int dig = 0; dig <= limit; dig++) {
        bool nowStarted = started || dig != 0;
        if (nowStarted && started && dig == last) continue;      // two equal neighbours
        res += go(pos + 1, nowStarted ? dig : -1, tight && dig == limit, nowStarted);
    }
    if (!tight && started) memo[pos][last + 1] = res;
    return res;
}
long long countNoAdjEqual(long long n) {
    d = to_string(n);
    memo.assign(d.size(), {});
    for (auto& row : memo) row.fill(-1);
    return go(0, -1, true, false) - 1;               // minus the number 0
}` }] } },
      { title: 'Number of Digit One (LC 233): carry a count, not a yes/no', html: `<p>"Total number of digit 1 appearing in all numbers ≤ n". The state must carry <b>how many 1s so far</b>; at the end return that count instead of 1/0. State (pos, ones, tight): 10 × 10 × 2. The pattern "return a sum over completions instead of a count" covers "sum of digit sums" too.</p>`, code: { lang: 'java', code: `char[] s; Integer[][] memo;
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
}`, alt: [{ lang: 'python', code: `
from functools import lru_cache

def count_digit_one(n):
    s = str(n)

    @lru_cache(maxsize=None)
    def go(pos, ones, tight):
        if pos == len(s):
            return ones                              # this number contributes 'ones'
        limit = int(s[pos]) if tight else 9
        return sum(go(pos + 1, ones + (dig == 1), tight and dig == limit)
                   for dig in range(limit + 1))

    return go(0, 0, True)` }, { lang: 'js', code: `
function countDigitOne(n) {
  const s = String(n);
  const memo = s.split('').map(() => new Array(s.length + 1).fill(-1));
  function go(pos, ones, tight) {
    if (pos === s.length) return ones;               // this number contributes 'ones'
    if (!tight && memo[pos][ones] !== -1) return memo[pos][ones];
    const limit = tight ? Number(s[pos]) : 9;
    let res = 0;
    for (let dig = 0; dig <= limit; dig++)
      res += go(pos + 1, ones + (dig === 1 ? 1 : 0), tight && dig === limit);
    if (!tight) memo[pos][ones] = res;
    return res;
  }
  return go(0, 0, true);
}` }, { lang: 'cpp', code: `
string s;
vector<vector<int>> memo;

int go(int pos, int ones, bool tight) {
    if (pos == (int)s.size()) return ones;           // this number contributes 'ones'
    if (!tight && memo[pos][ones] != -1) return memo[pos][ones];
    int limit = tight ? s[pos] - '0' : 9, res = 0;
    for (int dig = 0; dig <= limit; dig++)
        res += go(pos + 1, ones + (dig == 1), tight && dig == limit);
    if (!tight) memo[pos][ones] = res;
    return res;
}
int countDigitOne(int n) {
    s = to_string(n);
    memo.assign(s.size(), vector<int>(s.size() + 1, -1));
    return go(0, 0, true);
}` }] } },
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
      tests: { sig: "long long int -> long", fn: "countInRange", cases: [
          [[1,20,3],6],
          [[0,0,1],1],
          [[0,0,7],1],
          [[5,5,5],1],
          [[7,7,5],0],
          [[1,100,10],9],
          [[0,9999,13],763],
          [[98,1003,4],225],
          [[1,99999,100],0],
          [[0,"1000000000000000000",9],"111111111111111112"],
          [[0,"1000000000000000000",3],"333333333333333334"],
          [[1,"1000000000000000000",1],"1000000000000000000"],
          [[0,"1000000000000000000",2],"500000000000000000"],
          [[1,"1000000000000000000",2],"499999999999999999"],
          [["123456789012345678","987654321098765432",9],"96021948009602195"],
          [[0,"1000000000000000000",100],"9869362547411188"],
          [[1,"1000000000000000000",100],"9869362547411187"]
        ] },
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
        alt: [{ lang: 'python', run: true, code: `from functools import lru_cache

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

print(count_in_range(1, 20, 3))  # 6` }, { lang: 'js', code: `function countInRange(L, R, K) {
  L = BigInt(L); R = BigInt(R);                   // counts reach 10^18: past 2^53, so use BigInt
  function count(n) {                              // x in [0, n]
    if (n < 0n) return 0n;
    const d = n.toString().split('').map(Number);
    const memo = d.map(() => Array(K).fill(-1n));
    function go(pos, rem, tight) {
      if (pos === d.length) return rem === 0 ? 1n : 0n;
      if (!tight && memo[pos][rem] !== -1n) return memo[pos][rem];
      const limit = tight ? d[pos] : 9;
      let res = 0n;
      for (let dig = 0; dig <= limit; dig++)
        res += go(pos + 1, (rem + dig) % K, tight && dig === limit);
      if (!tight) memo[pos][rem] = res;
      return res;
    }
    return go(0, 0, true);
  }
  return count(R) - count(L - 1n);
}` }, { lang: 'cpp', code: `class Solution {
    string d;
    int K;
    long long memo[20][100];

    long long go(int pos, int rem, bool tight) {
        if (pos == (int)d.size()) return rem == 0;
        if (!tight && memo[pos][rem] != -1) return memo[pos][rem];
        int limit = tight ? d[pos] - '0' : 9;
        long long res = 0;
        for (int dig = 0; dig <= limit; dig++)
            res += go(pos + 1, (rem + dig) % K, tight && dig == limit);
        if (!tight) memo[pos][rem] = res;
        return res;
    }

    long long count(long long n) {                 // x in [0, n]
        if (n < 0) return 0;
        d = to_string(n);
        memset(memo, -1, sizeof memo);
        return go(0, 0, true);
    }

public:
    long long countInRange(long long L, long long R, int k) {
        K = k;
        return count(R) - count(L - 1);
    }
};` }],
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
    code: [{ lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `
# Expected number of fair-die rolls until the running total reaches at least N.
# E[s] = 1 + (E[s+1] + ... + E[s+6]) / 6, and E[s] = 0 for s >= N.
def expected_rolls(N):
    E = [0.0] * (N + 6)                              # indices >= N stay 0.0 (already finished)
    for s in range(N - 1, -1, -1):
        E[s] = 1 + sum(E[s + 1:s + 7]) / 6           # pay one roll, then average the futures
    return E[0]

# Same thing, exact, printed as P * Q^(-1) mod 1e9+7.
MOD = 1_000_000_007

def expected_rolls_mod(N):
    inv6 = pow(6, MOD - 2, MOD)                      # Fermat: 6^(p-2) = 1/6 (mod p)
    E = [0] * (N + 6)
    for s in range(N - 1, -1, -1):
        E[s] = (1 + sum(E[s + 1:s + 7]) % MOD * inv6) % MOD
    return E[0]` }, { lang: 'js', code: `
// Expected number of fair-die rolls until the running total reaches at least N.
// E[s] = 1 + (E[s+1] + ... + E[s+6]) / 6, and E[s] = 0 for s >= N.
function expectedRolls(N) {
  const E = new Array(N + 6).fill(0);                // indices >= N stay 0 (already finished)
  for (let s = N - 1; s >= 0; s--) {
    let sum = 0;
    for (let face = 1; face <= 6; face++) sum += E[s + face];
    E[s] = 1 + sum / 6;                              // pay one roll, then average the futures
  }
  return E[0];
}

// Same thing, exact, as P * Q^(-1) mod 1e9+7. Products reach 10^18, so use BigInt.
const MOD = 1000000007n;
function power(b, e) {                               // fast modular exponentiation
  let r = 1n; b %= MOD;
  for (; e > 0n; e >>= 1n, b = b * b % MOD) if (e & 1n) r = r * b % MOD;
  return r;
}
function expectedRollsMod(N) {
  const inv6 = power(6n, MOD - 2n);                  // Fermat: 6^(p-2) = 1/6 (mod p)
  const E = new Array(N + 6).fill(0n);
  for (let s = N - 1; s >= 0; s--) {
    let sum = 0n;
    for (let face = 1; face <= 6; face++) sum += E[s + face];
    E[s] = (1n + sum % MOD * inv6) % MOD;
  }
  return E[0];
}` }, { lang: 'cpp', code: `
// Expected number of fair-die rolls until the running total reaches at least N.
// E[s] = 1 + (E[s+1] + ... + E[s+6]) / 6, and E[s] = 0 for s >= N.
double expectedRolls(int N) {
    vector<double> E(N + 6, 0.0);                    // indices >= N stay 0.0 (already finished)
    for (int s = N - 1; s >= 0; s--) {
        double sum = 0;
        for (int face = 1; face <= 6; face++) sum += E[s + face];
        E[s] = 1 + sum / 6.0;                        // pay one roll, then average the futures
    }
    return E[0];
}

// Same thing, exact, printed as P * Q^(-1) mod 1e9+7.
const long long MOD = 1'000'000'007LL;
long long power(long long b, long long e) {          // fast modular exponentiation
    long long r = 1; b %= MOD;
    for (; e > 0; e >>= 1, b = b * b % MOD) if (e & 1) r = r * b % MOD;
    return r;
}
long long expectedRollsMod(int N) {
    long long inv6 = power(6, MOD - 2);              // Fermat: 6^(p-2) = 1/6 (mod p)
    vector<long long> E(N + 6, 0);
    for (int s = N - 1; s >= 0; s--) {
        long long sum = 0;
        for (int face = 1; face <= 6; face++) sum += E[s + face];
        E[s] = (1 + sum % MOD * inv6) % MOD;
    }
    return E[0];
}` }] }, { lang: 'python', code: `import random

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
    codeTitle: ['Expected dice rolls: doubles and mod 1e9+7', 'Probability DP + expected-value DP with a simulation check (Python)'],
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
      { title: 'Expected value modulo a prime', html: `<p>Expected rolls to reach total ≥ 2 with a fair die: E[1] = 1, E[0] = 1 + E[1]/6 = 7/6. As P·Q<sup>−1</sup> mod 10<sup>9</sup>+7: inv(6) = 166 666 668, 7 · 166 666 668 mod p = 166 666 669. The <code>expectedRollsMod(2)</code> code above returns exactly that. Check yourself: 166 666 669 × 6 mod p = 7. ✓</p>` }
    ],
    deepDive: `<p><b>Forward vs backward.</b> Probability of <i>reaching</i> states is naturally pushed <b>forward</b> from the start (one source, many sinks). Expected <i>remaining</i> cost is naturally pulled <b>backward</b> from the terminal states (many sources, one question). You can compute expected value forward too (E = Σ over end states of P(end) × cost), but only when the cost is a function of the path you can accumulate.</p>
      <p><b>Cycles.</b> If states can loop among themselves (not just self-loops), you get a <b>system of linear equations</b>: n unknowns E[s]. Solve with Gaussian elimination in O(n<sup>3</sup>) (fine for n ≤ 500), or iterate <code>E ← cost + P·E</code> until it stops changing (value iteration, converges geometrically when the process ends with probability 1). This is exactly the <b>Bellman equation</b> of a Markov chain; add a "min over actions" and it becomes a Markov Decision Process — the foundation of reinforcement learning.</p>
      <p><b>Floating point.</b> Probabilities shrink fast (8<sup>−100</sup> ≈ 10<sup>−90</sup> still fits in a double, whose minimum is ~10<sup>−308</sup>). For thousands of steps work in <b>log space</b> (store log P, add instead of multiply, use log-sum-exp when adding probabilities). Judges accept 10<sup>−6</sup> relative error, so avoid catastrophic subtraction like <code>1 − (1 − tiny)</code>.</p>
      <p><b>Sliding-window sums.</b> When E[s] or P[s] depends on a contiguous block (dice faces 1..W), keep a running window sum: O(N) instead of O(N·W) — New 21 Game (LC 837) is exactly this.</p>
      <p><b>Large-step shortcut.</b> Soup Servings (LC 808) shows a real interview trick: for huge N the probability converges to 1 within 10<sup>−6</sup>, so return 1 above a threshold you measured. Recognising when an answer converges is senior-level judgement.</p>
      <p><b>Modular expectations</b> require the denominator to be invertible mod p (p prime, denominator not a multiple of p). Self-loop formulas need <code>inv(1 − p)</code> computed as <code>inv((q − a) mod p)</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> an LLM writes the knight-probability DP in seconds and can explain linearity of expectation well. AI is also excellent at producing a <b>Monte-Carlo simulator</b> to sanity-check your exact answer — exactly what the Python cell does for the coupon collector. Use simulation as a test oracle, never as the final answer (its error shrinks only like 1/√trials).</p>
      <p><b>Use AI as a partner:</b> "Write a 20-line simulation of this game with a fixed seed; I will compare it with my DP." Or "derive the self-loop equation for this state and solve it for E."</p>
      <p><b>Where AI goes wrong:</b> it mixes up "expected steps from here" and "expected steps from the start", forgets to divide by the number of outcomes, double-counts in the self-loop equation, or uses integer division (<code>1/6 == 0</code> in Java and C++, while Python 3 and JS give 0.1666…). It also tends to propose recursion without memo over (step, cell) — exponential. <b>You own:</b> the state definition, the direction of the recurrence, the base cases, and spotting when linearity makes the DP unnecessary. In ML systems (RL, A/B tests, ranking) the same expected-value reasoning is your daily bread.</p>`,
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
      tests: { sig: "int int int int -> double", fn: "knightProbability", cmp: "float", cases: [
          [[3,2,0,0],0.0625],
          [[1,0,0,0],1],
          [[1,1,0,0],0],
          [[8,30,6,4],0.00019],
          [[2,5,0,1],0],
          [[25,0,12,12],1],
          [[5,1,2,2],1],
          [[8,3,3,3],0.62109375],
          [[25,100,12,12],0.04742876069380137],
          [[25,100,0,0],0.0012193746331114295],
          [[25,100,24,3],0.003757992179779752],
          [[10,50,4,5],0.00010383055349924424],
          [[4,100,1,2],8.301326222966356e-42]
        ] },
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
        alt: [{ lang: 'python', run: true, code: `def knight_probability(n, k, row, column):
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

print(knight_probability(3, 2, 0, 0))  # 0.0625` }, { lang: 'js', code: `function knightProbability(n, k, row, column) {
  const moves = [[2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1]];
  let cur = Array.from({ length: n }, () => new Float64Array(n));
  cur[row][column] = 1;                            // all mass on the start cell
  for (let step = 0; step < k; step++) {
    const nxt = Array.from({ length: n }, () => new Float64Array(n));
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        if (cur[r][c] === 0) continue;
        for (const [dr, dc] of moves) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < n && nc >= 0 && nc < n) nxt[nr][nc] += cur[r][c] / 8;
        }
      }
    cur = nxt;
  }
  let total = 0;
  for (const rowArr of cur) for (const p of rowArr) total += p;
  return total;
}` }, { lang: 'cpp', code: `double knightProbability(int n, int k, int row, int column) {
    const int dr[] = {2, 1, -1, -2, -2, -1, 1, 2};
    const int dc[] = {1, 2, 2, 1, -1, -2, -2, -1};
    vector<vector<double>> cur(n, vector<double>(n, 0.0));
    cur[row][column] = 1.0;                        // all mass on the start cell
    while (k--) {
        vector<vector<double>> nxt(n, vector<double>(n, 0.0));
        for (int r = 0; r < n; r++)
            for (int c = 0; c < n; c++) {
                if (cur[r][c] == 0) continue;
                for (int m = 0; m < 8; m++) {
                    int nr = r + dr[m], nc = c + dc[m];
                    if (nr >= 0 && nr < n && nc >= 0 && nc < n) nxt[nr][nc] += cur[r][c] / 8.0;
                }
            }
        cur = move(nxt);
    }
    double total = 0;
    for (auto& line : cur) for (double p : line) total += p;
    return total;
}` }],
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
        ['the latest job ending before my start', 'weighted interval scheduling', '<b>ordered map floor</b> (<code>TreeMap.floorEntry</code> / <code>std::map</code> + <code>upper_bound</code>) or binary search on a sorted list (<code>bisect</code>)', 'O(log N)'],
        ['j &lt; i with a line formula a[j]·x + b[j]', 'cost = product of two things', '<b>convex hull trick</b> (topic 5)', 'O(1)–O(log N)']
      ])}
      <h4>Monotonic deque in one breath</h4>
      <p>Keep indices in a deque so that their dp values are <b>decreasing</b> from front to back. For each new i: (1) throw away the front if it is outside the window, (2) the front is now the best → compute dp[i], (3) from the back, throw away every index whose dp is ≤ dp[i] — they are older <i>and</i> not better, they can never win again — then push i. Each index enters and leaves once → O(N) total.</p>
      <h4>Fenwick tree over values in one breath</h4>
      <p>Process the array left to right. <code>best[v]</code> = best dp of any subsequence ending with value v seen so far. For a[i], ask the Fenwick tree for <code>max(best[1..a[i]−1])</code> in O(log N), set dp[i] = that + 1, then update position a[i]. If values are huge (10<sup>9</sup>), first <b>compress</b> them to ranks 1..N.</p>`,
    clues: [
      'DP transition "max/min over the <b>previous k</b> positions" + N ≤ 10<sup>5</sup> → monotonic deque',
      '"subsequence where each next element is larger / within distance k / in a value range" → Fenwick or segment tree indexed by value',
      '"<b>non-overlapping</b> intervals/jobs with maximum profit" → sort by end + binary search / ordered-map floor (TreeMap, std::map, bisect)',
      'O(N<sup>2</sup>) DP works but N = 10<sup>5</sup> → keep the formula, speed up the "best previous" query',
      'values up to 10<sup>9</sup> but only N of them → coordinate compression before the BIT',
      '"count the number of longest increasing subsequences" with big N → BIT storing (length, count) pairs'
    ],
    code: [{ lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `
from bisect import bisect_left

# LIS in O(N log N) with a Fenwick tree for prefix MAX over compressed values.
def lis_fenwick(a):
    vals = sorted(set(a))                            # coordinate compression
    m = len(vals)
    bit = [0] * (m + 1)                              # bit[] stores prefix maxima
    best = 0
    for x in a:
        r = bisect_left(vals, x) + 1                 # rank in 1..m
        q, i = 0, r - 1
        while i > 0:                                 # best over values < x
            q = max(q, bit[i])
            i -= i & -i
        cur = q + 1                                  # extend that chain by x
        best = max(best, cur)
        i = r
        while i <= m:                                # values only grow -> max-BIT is valid
            bit[i] = max(bit[i], cur)
            i += i & -i
    return best` }, { lang: 'js', code: `
// LIS in O(N log N) with a Fenwick tree for prefix MAX over compressed values.
function lisFenwick(a) {
  const sorted = [...new Set(a)].sort((x, y) => x - y);   // coordinate compression
  const m = sorted.length;
  const rank = new Map(sorted.map((v, i) => [v, i + 1]));
  const bit = new Int32Array(m + 1);                 // bit[] stores prefix maxima
  let best = 0;
  for (const x of a) {
    const r = rank.get(x);                           // rank in 1..m
    let q = 0;
    for (let i = r - 1; i > 0; i -= i & -i) q = Math.max(q, bit[i]);   // best over values < x
    const cur = q + 1;                               // extend that chain by x
    best = Math.max(best, cur);
    for (let i = r; i <= m; i += i & -i) bit[i] = Math.max(bit[i], cur); // values only grow -> max-BIT is valid
  }
  return best;
}` }, { lang: 'cpp', code: `
// LIS in O(N log N) with a Fenwick tree for prefix MAX over compressed values.
int lisFenwick(vector<int>& a) {
    vector<int> sorted(a);
    sort(sorted.begin(), sorted.end());              // coordinate compression
    sorted.erase(unique(sorted.begin(), sorted.end()), sorted.end());
    int m = sorted.size();
    vector<int> bit(m + 1, 0);                       // bit[] stores prefix maxima
    int best = 0;
    for (int x : a) {
        int r = lower_bound(sorted.begin(), sorted.end(), x) - sorted.begin() + 1;   // rank in 1..m
        int q = 0;
        for (int i = r - 1; i > 0; i -= i & -i) q = max(q, bit[i]);   // best over values < x
        int cur = q + 1;                             // extend that chain by x
        best = max(best, cur);
        for (int i = r; i <= m; i += i & -i) bit[i] = max(bit[i], cur); // values only grow -> max-BIT is valid
    }
    return best;
}` }] }, { lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `
from bisect import bisect_right

# Weighted job scheduling: dp over jobs sorted by end time; two parallel lists play the TreeMap.
def job_scheduling(start_time, end_time, profit):
    order = sorted(range(len(start_time)), key=lambda i: end_time[i])
    times, best = [0], [0]                           # end time -> best total profit up to it (both increasing)
    for i in order:
        before = best[bisect_right(times, start_time[i]) - 1]   # best finishing by my start
        take = before + profit[i]
        if take > best[-1]:                          # keep values increasing
            if times[-1] == end_time[i]:
                best[-1] = take
            else:
                times.append(end_time[i])
                best.append(take)
    return best[-1]` }, { lang: 'js', code: `
// Weighted job scheduling: dp over jobs sorted by end time; two parallel arrays play the TreeMap.
function jobScheduling(startTime, endTime, profit) {
  const order = startTime.map((_, i) => i).sort((p, q) => endTime[p] - endTime[q]);
  const times = [0], best = [0];                     // end time -> best total profit up to it (both increasing)
  for (const i of order) {
    let lo = 0, hi = times.length - 1;               // last index with times[idx] <= start
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (times[mid] <= startTime[i]) lo = mid; else hi = mid - 1;
    }
    const take = best[lo] + profit[i];
    if (take > best[best.length - 1]) {              // keep values increasing
      if (times[times.length - 1] === endTime[i]) best[best.length - 1] = take;
      else { times.push(endTime[i]); best.push(take); }
    }
  }
  return best[best.length - 1];
}` }, { lang: 'cpp', code: `
// Weighted job scheduling: dp over jobs sorted by end time, std::map gives "best profit by time t".
int jobScheduling(vector<int>& startTime, vector<int>& endTime, vector<int>& profit) {
    int n = startTime.size();
    vector<int> idx(n);
    iota(idx.begin(), idx.end(), 0);
    sort(idx.begin(), idx.end(), [&](int p, int q) { return endTime[p] < endTime[q]; });
    map<int, int> best{{0, 0}};                      // end time -> best total profit up to it
    for (int i : idx) {
        int before = prev(best.upper_bound(startTime[i]))->second;   // best finishing by my start
        int take = before + profit[i];
        if (take > best.rbegin()->second) best[endTime[i]] = take;   // keep values increasing
    }
    return best.rbegin()->second;
}` }] }],
    codeTitle: ['LIS with a Fenwick tree (prefix max over values)', 'Job scheduling with an ordered map (floor lookup)'],
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
      { title: 'Jump Game VI (LC 1696): the simplest deque DP', html: `<p>dp[i] = nums[i] + max(dp[i−k..i−1]). nums = [1, −1, −2, 4, −7, 3], k = 2 → dp = [1, 0, −1, 4, −3, 7] → <b>7</b>. The deque holds indices with decreasing dp; front = window max. O(N) vs O(N·k).</p>`, code: { lang: 'java', code: `int maxResult(int[] nums, int k) {
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
}`, alt: [{ lang: 'python', code: `
from collections import deque

def max_result(nums, k):
    n = len(nums)
    dp = [0] * n
    dp[0] = nums[0]
    dq = deque([0])                                  # indices, dp values decreasing
    for i in range(1, n):
        while dq[0] < i - k:                         # expired
            dq.popleft()
        dp[i] = nums[i] + dp[dq[0]]                  # window max
        while dq and dp[dq[-1]] <= dp[i]:
            dq.pop()
        dq.append(i)
    return dp[-1]` }, { lang: 'js', code: `
function maxResult(nums, k) {
  const n = nums.length;
  const dp = new Array(n).fill(0);
  const dq = new Array(n);                           // array-backed deque of indices: [head, tail)
  let head = 0, tail = 0;
  dp[0] = nums[0];
  dq[tail++] = 0;
  for (let i = 1; i < n; i++) {
    while (dq[head] < i - k) head++;                 // expired
    dp[i] = nums[i] + dp[dq[head]];                  // window max
    while (tail > head && dp[dq[tail - 1]] <= dp[i]) tail--;
    dq[tail++] = i;
  }
  return dp[n - 1];
}` }, { lang: 'cpp', code: `
int maxResult(vector<int>& nums, int k) {
    int n = nums.size();
    vector<int> dp(n);
    deque<int> dq;
    dp[0] = nums[0];
    dq.push_back(0);
    for (int i = 1; i < n; i++) {
        while (dq.front() < i - k) dq.pop_front();   // expired
        dp[i] = nums[i] + dp[dq.front()];            // window max
        while (!dq.empty() && dp[dq.back()] <= dp[i]) dq.pop_back();
        dq.push_back(i);
    }
    return dp[n - 1];
}` }] } },
      { title: 'Weighted job scheduling (LC 1235) by hand', html: `<p>Jobs (start, end, profit): (1,3,50), (2,4,10), (3,5,40), (3,6,70). Sorted by end: map {0:0}. Job (1,3,50): floor(1) = 0 → 50 → put 3:50. Job (2,4,10): floor(2)=0 → 10 &lt; 50 skip. Job (3,5,40): floor(3) = 50 → 90 → put 5:90. Job (3,6,70): floor(3) = 50 → 120 → put 6:120. <b>Answer 120</b>. The map always holds increasing profits, so floorEntry gives "best so far by that time".</p>` },
      { title: 'Counting LIS with a BIT of pairs', html: `<p>Number of Longest Increasing Subsequences (LC 673) for N = 10<sup>5</sup>: each BIT node stores <code>(len, count)</code>. Combining two pairs: larger len wins; equal len → add counts. Query prefix (values &lt; x) → (L, C); then x gives (L + 1, max(C, 1)). Update at x by combining. O(N log N) instead of O(N<sup>2</sup>).</p>` },
      { title: 'Heap alternative to the deque (lazy deletion)', html: `<p>If you forget the deque, a max-heap of (dp[j], j) also works: before reading the top, pop while <code>top.j &lt; i − k</code>. O(N log N) — slightly slower, often accepted. Interviewers may then ask "can you make it O(N)?" → deque.</p>` }
    ],
    deepDive: `<p><b>Why the deque is correct.</b> Invariant: indices increase front→back and dp values strictly decrease. If j &lt; i and dp[j] ≤ dp[i], j is <b>dominated</b>: it expires earlier and is never better, so deleting it loses nothing. The front is therefore the maximum of all non-dominated indices in the window, i.e. the window maximum. Amortised: N pushes and ≤ N pops → O(N).</p>
      <p><b>Max-Fenwick caveat.</b> A Fenwick tree for prefix <i>max</i> only works when values at a position only <b>increase</b> (you can't "undo" a max). That holds for LIS-style DPs processed left to right. If values can decrease, or you need arbitrary ranges [l, r], use a <b>segment tree</b> (iterative bottom-up is short and fast).</p>
      <p><b>Choosing the axis.</b> The trick is to index the structure by the dimension that the condition talks about: "j &lt; i and a[j] &lt; a[i]" → iterate i (handles j &lt; i by time) and index the tree by a[j] (handles the value condition). Two conditions + time = 3D dominance → <b>CDQ divide and conquer</b> or a 2D BIT. Sort-then-sweep turns one dimension into time.</p>
      <p><b>Ties and strictness.</b> "Strictly increasing" → query values &lt; x (r − 1). "Non-decreasing" → query ≤ x. With duplicates of the same value processed in one batch (e.g. 2D envelopes), sort the second key descending so equal first keys cannot chain.</p>
      <p><b>Production note.</b> These are the same structures used in time-series databases (sliding window max for alerting), order books (an ordered map of price levels) and leaderboards (Fenwick for rank queries). The DP view is just one consumer.</p>`,
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
      tests: { sig: "int[] int -> int", fn: "constrainedSubsetSum", cases: [
          [[[10,2,-10,5,20],2],37],
          [[[-1,-2,-3],1],-1],
          [[[-1],1],-1],
          [[[10,-2,-10,-5,20],2],23],
          [[[5],1],5],
          [[[0,0,0],3],0],
          [[[-5,-1,-7],3],-1],
          [[[-5662,6014,6249,-2634,-4854,-1653,3721,10,-4638,1230,9136,4325,-5146,-1420,-5963,-2012,3806,1935,1875,-5440,6227,-7418,8111,8027,-9713,9862,7689,-3010,2255,-624,3251,-9796,1968,-4490,-2096,-7202,-3680],23],85691],
          [[[-3954,8727,4702,-4781,577,-8451,3817,-8078,5155,-3052,8005,-8087,-4529,-1270,-7053,-4058,3483,-7607,6767,-1881,-8749,5724,-2298,-6017,-7626,-2737,4781,6624,-3226,7392,4596],20],70350],
          [[[-891,-2569,4981,8930,-1380,9701,-4542,1580,-4389,-2659,-8616,-1805,-7484,-105,1254,-8841,-9610,-7120,-5263,21,6686,-1276,-7193,4735,1650,3556,-6822,-7626,327,-9188,8503,2273,-8301,-4093,-2996,5561,-6388,-3226,3090,-9855,-8176,-215,6226,318,-7300,-4130,2503,6180,-958,-3351,3199,1899],15],83173],
          [[[6830,-5014,-7584,-829,6845,5689,-2563,-2724,-6997,8386,-3905,6825,8272,-7204,-4891,-3344,7360,8889,3629,-5977,-6880,-1017,6994,901,7239,-9995,-5548,44,-5651,-8517,9992,-6395,-265,-7878,-6802,-6804,8015,-6198,-9589,-6756,-2955,4249,6458,654,-4950,-7721,5410],6],112681],
          [[[598,5846,9201,111,-6001,-3538,-2251,61,8545,-1770,2948,-3912,1669,-2677,8057,3028,-7688,-8463,-7791,6129,5089,1132,-1441,-2239,-9493,-4093,-7693,8803,-9662,-9737,-8030,-955,-7818,-5107,955,-6895,-7709,6813],16],68985],
          [[{"$rep":10000,"n":100000},100000],1000000000],
          [[{"$rep":10000,"n":100000},1],1000000000],
          [[{"$concat":[{"$rep":7,"n":40000},{"$rep":-10000,"n":10},{"$rep":3,"n":50000}]},1],330000],
          [[{"$concat":[{"$rep":7,"n":40000},{"$rep":-10000,"n":10},{"$rep":3,"n":50000}]},10],420000],
          [[{"$concat":[{"$rep":7,"n":40000},{"$rep":-10000,"n":10},{"$rep":3,"n":50000}]},11],430000],
          [[{"$concat":[{"$rep":-10000,"n":100000}]},50000],-10000]
        ] },
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
        alt: [{ lang: 'python', run: true, code: `from collections import deque

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

print(constrained_subset_sum([10, 2, -10, 5, 20], 2))  # 37` }, { lang: 'js', code: `function constrainedSubsetSum(nums, k) {
  const n = nums.length;
  const dp = new Array(n).fill(0);
  const dq = new Int32Array(n);                    // indices; dp decreasing front -> back
  let head = 0, tail = 0, best = -Infinity;
  for (let i = 0; i < n; i++) {
    while (head < tail && dq[head] < i - k) head++;           // out of window
    dp[i] = nums[i] + (head < tail ? Math.max(0, dp[dq[head]]) : 0);
    best = Math.max(best, dp[i]);
    while (head < tail && dp[dq[tail - 1]] <= dp[i]) tail--;  // dominated
    dq[tail++] = i;
  }
  return best;
}` }, { lang: 'cpp', code: `int constrainedSubsetSum(vector<int>& nums, int k) {
    int n = nums.size(), best = INT_MIN;
    vector<int> dp(n);
    deque<int> dq;                                 // indices; dp decreasing front -> back
    for (int i = 0; i < n; i++) {
        while (!dq.empty() && dq.front() < i - k) dq.pop_front();
        dp[i] = nums[i] + (dq.empty() ? 0 : max(0, dp[dq.front()]));
        best = max(best, dp[i]);
        while (!dq.empty() && dp[dq.back()] <= dp[i]) dq.pop_back();
        dq.push_back(i);
    }
    return best;
}` }],
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
    code: [{ lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `
# Monotone CHT for MIN queries: slopes added in DECREASING order, queries x in INCREASING order.
class MonotoneCHT:
    def __init__(self):
        self.M, self.B = [], []                      # lines y = M[i] * x + B[i]
        self.head = 0                                # front of the deque: M[head:]

    # l2 useless  <=>  x(l1,l3) <= x(l1,l2)  <=>  (B3-B1)(M1-M2) <= (B2-B1)(M1-M3)
    def _bad(self, l1, l2, l3):
        M, B = self.M, self.B
        return (B[l3] - B[l1]) * (M[l1] - M[l2]) <= (B[l2] - B[l1]) * (M[l1] - M[l3])

    def add(self, m, b):
        self.M.append(m)
        self.B.append(b)
        while len(self.M) - self.head >= 3 and self._bad(-3, -2, -1):   # pop useless last line
            del self.M[-2], self.B[-2]

    def _eval(self, i, x):
        return self.M[i] * x + self.B[i]

    def query(self, x):                              # x never decreases between calls
        while len(self.M) - self.head >= 2 and self._eval(self.head + 1, x) <= self._eval(self.head, x):
            self.head += 1
        return self._eval(self.head, x)` }, { lang: 'js', code: `
// Monotone CHT for MIN queries: slopes added in DECREASING order, queries x in INCREASING order.
// Slopes, intercepts and x are BigInt: the cross-multiplications below can pass 2^53.
class MonotoneCHT {
  constructor() { this.M = []; this.B = []; this.head = 0; }   // lines y = M[i] * x + B[i], deque = [head, end)

  // l2 useless  <=>  x(l1,l3) <= x(l1,l2)  <=>  (B3-B1)(M1-M2) <= (B2-B1)(M1-M3)
  bad(l1, l2, l3) {
    const { M, B } = this;
    return (B[l3] - B[l1]) * (M[l1] - M[l2]) <= (B[l2] - B[l1]) * (M[l1] - M[l3]);
  }
  add(m, b) {
    const { M, B } = this;
    M.push(m); B.push(b);
    while (M.length - this.head >= 3 && this.bad(M.length - 3, M.length - 2, M.length - 1)) {
      M[M.length - 2] = M[M.length - 1]; B[B.length - 2] = B[B.length - 1];   // pop useless last line
      M.pop(); B.pop();
    }
  }
  evalAt(i, x) { return this.M[i] * x + this.B[i]; }
  query(x) {                                         // x never decreases between calls
    while (this.M.length - this.head >= 2 && this.evalAt(this.head + 1, x) <= this.evalAt(this.head, x)) this.head++;
    return this.evalAt(this.head, x);
  }
}` }, { lang: 'cpp', code: `
// Monotone CHT for MIN queries: slopes added in DECREASING order, queries x in INCREASING order.
class MonotoneCHT {
    vector<long long> M, B;                          // lines y = M[i] * x + B[i], deque = [head, end)
    size_t head = 0;
    typedef __int128 i128;                           // cross products can pass 2^63

    // l2 useless  <=>  x(l1,l3) <= x(l1,l2)  <=>  (B3-B1)(M1-M2) <= (B2-B1)(M1-M3)
    bool bad(size_t l1, size_t l2, size_t l3) const {
        return (i128)(B[l3] - B[l1]) * (M[l1] - M[l2]) <= (i128)(B[l2] - B[l1]) * (M[l1] - M[l3]);
    }
    long long eval(size_t i, long long x) const { return M[i] * x + B[i]; }
public:
    void add(long long m, long long b) {
        M.push_back(m); B.push_back(b);
        while (M.size() - head >= 3 && bad(M.size() - 3, M.size() - 2, M.size() - 1)) {
            M[M.size() - 2] = M.back(); B[B.size() - 2] = B.back();    // pop useless last line
            M.pop_back(); B.pop_back();
        }
    }
    long long query(long long x) {                   // x never decreases between calls
        while (M.size() - head >= 2 && eval(head + 1, x) <= eval(head, x)) head++;
        return eval(head, x);
    }
};` }] }, { lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `
# Li Chao tree: MIN over lines, any insertion order, any query order, integer x in [lo, hi].
class LiChao:
    def __init__(self, lo, hi):
        self.lo, self.hi = lo, hi
        self.line = {}                               # node id -> (m, b); heap-style ids, created on demand

    def add(self, m, b):
        node, l, r = 1, self.lo, self.hi
        while True:                                  # one root-to-leaf path: iterative, so no recursion limit
            if node not in self.line:
                self.line[node] = (m, b)
                return
            cm, cb = self.line[node]
            mid = (l + r) // 2
            left_better = m * l + b < cm * l + cb
            mid_better = m * mid + b < cm * mid + cb
            if mid_better:                           # node keeps the line that wins at mid
                self.line[node] = (m, b)
                m, b = cm, cb
            if l == r:
                return
            # the loser can only win on ONE side of mid: where the winners differ
            if left_better != mid_better:
                node, r = 2 * node, mid
            else:
                node, l = 2 * node + 1, mid + 1

    def query(self, x):
        node, l, r = 1, self.lo, self.hi
        res = float('inf')
        while node in self.line:
            m, b = self.line[node]
            res = min(res, m * x + b)
            if l == r:
                break
            mid = (l + r) // 2
            if x <= mid:
                node, r = 2 * node, mid
            else:
                node, l = 2 * node + 1, mid + 1
        return res` }, { lang: 'js', code: `
// Li Chao tree: MIN over lines, any insertion order, any query order, integer x in [lo, hi].
// Slopes and intercepts are BigInt (values pass 2^53); x, lo and hi are ordinary integers.
class LiChao {
  constructor(lo, hi) {
    this.lo = lo; this.hi = hi;
    this.line = new Map();                           // node id -> [m, b]; heap-style ids, created on demand
  }
  static f(m, b, x) { return m * BigInt(x) + b; }
  add(m, b) {
    let node = 1, l = this.lo, r = this.hi;
    for (;;) {
      const cur = this.line.get(node);
      if (!cur) { this.line.set(node, [m, b]); return; }
      const mid = Math.floor((l + r) / 2);
      const leftBetter = LiChao.f(m, b, l) < LiChao.f(cur[0], cur[1], l);
      const midBetter = LiChao.f(m, b, mid) < LiChao.f(cur[0], cur[1], mid);
      if (midBetter) { this.line.set(node, [m, b]); [m, b] = cur; }   // node keeps the line that wins at mid
      if (l === r) return;
      // the loser can only win on ONE side of mid: where the winners differ
      if (leftBetter !== midBetter) { node = 2 * node; r = mid; }
      else { node = 2 * node + 1; l = mid + 1; }
    }
  }
  query(x) {
    let node = 1, l = this.lo, r = this.hi, res = null;
    while (this.line.has(node)) {
      const [m, b] = this.line.get(node);
      const v = LiChao.f(m, b, x);
      if (res === null || v < res) res = v;
      if (l === r) break;
      const mid = Math.floor((l + r) / 2);
      if (x <= mid) { node = 2 * node; r = mid; } else { node = 2 * node + 1; l = mid + 1; }
    }
    return res;                                      // null when no line was added
  }
}` }, { lang: 'cpp', code: `
// Li Chao tree: MIN over lines, any insertion order, any query order, integer x in [lo, hi].
class LiChao {
    struct Line { long long m = 0, b = 0; bool has = false; };
    vector<Line> t;
    int lo, hi;
    static long long f(const Line& s, long long x) { return s.m * x + s.b; }

    void add(int node, int l, int r, Line nw) {
        if (!t[node].has) { t[node] = nw; t[node].has = true; return; }
        int mid = (l + r) >> 1;
        bool leftBetter = f(nw, l) < f(t[node], l);
        bool midBetter = f(nw, mid) < f(t[node], mid);
        if (midBetter) swap(t[node], nw);            // node keeps the line that wins at mid
        t[node].has = true;
        if (l == r) return;
        // the loser can only win on ONE side of mid: where the winners differ
        if (leftBetter != midBetter) add(2 * node, l, mid, nw);
        else add(2 * node + 1, mid + 1, r, nw);
    }
    long long query(int node, int l, int r, long long x) const {
        if (!t[node].has) return LLONG_MAX;
        long long res = f(t[node], x);
        if (l == r) return res;
        int mid = (l + r) >> 1;
        return min(res, x <= mid ? query(2 * node, l, mid, x) : query(2 * node + 1, mid + 1, r, x));
    }
public:
    LiChao(int lo, int hi) : t(4 * (hi - lo + 1)), lo(lo), hi(hi) {}
    void add(long long m, long long b) { add(1, lo, hi, Line{m, b, true}); }
    long long query(long long x) const { return query(1, lo, hi, x); }
};` }] }],
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
      { title: 'Queries in random order → binary search on the hull', html: `<p>The hull's lines are sorted by slope and the "switch points" x(l<sub>k</sub>, l<sub>k+1</sub>) are increasing. For an arbitrary query x, binary search the first k with value(l<sub>k+1</sub>, x) &gt; value(l<sub>k</sub>, x). Insertions still happen at the back; only the front-pointer trick is lost. O(log N) per query.</p>`, code: { lang: 'java', code: `long queryAnyOrder(long[] M, long[] B, int size, long x) {
    int lo = 0, hi = size - 1;                          // lines 0..size-1 form a valid hull
    while (lo < hi) {
        int mid = (lo + hi) >>> 1;
        if (M[mid + 1] * x + B[mid + 1] <= M[mid] * x + B[mid]) lo = mid + 1;  // next line better: go right
        else hi = mid;
    }
    return M[lo] * x + B[lo];
}`, alt: [{ lang: 'python', code: `
def query_any_order(M, B, size, x):
    lo, hi = 0, size - 1                             # lines 0..size-1 form a valid hull
    while lo < hi:
        mid = (lo + hi) // 2
        if M[mid + 1] * x + B[mid + 1] <= M[mid] * x + B[mid]:   # next line better: go right
            lo = mid + 1
        else:
            hi = mid
    return M[lo] * x + B[lo]` }, { lang: 'js', code: `
// M, B are BigInt arrays and x is a BigInt: the products can pass 2^53.
function queryAnyOrder(M, B, size, x) {
  let lo = 0, hi = size - 1;                         // lines 0..size-1 form a valid hull
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (M[mid + 1] * x + B[mid + 1] <= M[mid] * x + B[mid]) lo = mid + 1;   // next line better: go right
    else hi = mid;
  }
  return M[lo] * x + B[lo];
}` }, { lang: 'cpp', code: `
long long queryAnyOrder(const vector<long long>& M, const vector<long long>& B, int size, long long x) {
    int lo = 0, hi = size - 1;                       // lines 0..size-1 form a valid hull
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (M[mid + 1] * x + B[mid + 1] <= M[mid] * x + B[mid]) lo = mid + 1;   // next line better: go right
        else hi = mid;
    }
    return M[lo] * x + B[lo];
}` }] } }
    ],
    deepDive: `<p><b>Why the envelope is "convex".</b> The minimum of lines is a concave function (a cap shape); its graph is the lower convex hull of the dual points (m, b) — hence the name. Each line on it owns one contiguous interval of x, and the owners appear in slope order. That ordering is what lets a pointer or binary search find the owner.</p>
      <p><b>Overflow is the #1 bug.</b> The bad() test multiplies an intercept difference (up to 10<sup>18</sup> in many problems) by a slope difference (10<sup>9</sup>) → 10<sup>27</sup>, way past a 64-bit integer. Options: <code>__int128</code> in C++; in Java <code>Math.multiplyHigh</code> to compare 128-bit products (see the Kalila practice problem) or <code>BigInteger</code>; in JS <code>BigInt</code>; Python integers never overflow, so nothing is needed there; or compare intersection x's as <code>long double</code> / floor-division when the problem guarantees ranges. Li Chao avoids intersections entirely — it only evaluates lines — which is a big reason people prefer it.</p>
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
      hints: [`<p><b>Aha:</b> expand the square. dp[i] = h<sub>i</sub>² + C + min<sub>j</sub>(−2h<sub>j</sub>·h<sub>i</sub> + dp[j] + h<sub>j</sub>²). Inside the min: a line in x = h<sub>i</sub>.</p>`, `<p>Heights increase → slopes −2h<sub>j</sub> are added in decreasing order and queries x = h<sub>i</sub> increase → monotone deque CHT, O(N).</p>`, `<p>Recipe: add line(j=0); for i = 1..N−1: pop front while line 2 ≤ line 1 at h[i]; dp[i] = front(h[i]) + h[i]² + C; add line(−2h[i], dp[i] + h[i]²) popping useless back lines. Overflow check: dp ≤ ~2·10<sup>12</sup>, slope diff ≤ 2·10<sup>6</sup> → products ≤ ~6·10<sup>18</sup>, fits in a signed 64-bit integer (barely!).</p>`],
      tests: { sig: "long[] long -> long", fn: "frog3", cases: [
          [[[1,2,3,4,5],6],20],
          [[[1,2],5],6],
          [[[5,9],1],17],
          [[[1,1000000],1000000000000],1999998000001],
          [[[5,6,24,28,49,51,62,79,83,85,87,89,96,104,115,117,133,137,152,159,163,173,175,185,187,191,205,212,215,225,227,236,243,244,245,250,255,260,273,285],111],6342],
          [[[3,9,10,13,15,21,29,36,43,50,86,94,96,97,101,116,117,152,155,182,188,201,208,258,270,271,272],628],14523],
          [[[5,27,47,49,65,82,90,94,110,128,136,137,144,147,166,171,172,184,192,198,203,205,208,218,221,232,250,252,253,254,259,260,261,277,288,295,296,300],936],18301],
          [[[41,68,74,122,134,136,139,145,152,199],850],9902],
          [[[15,20,21,22,30,36,40,43,51,55,58,60,63,70,75,81,86,94,102,104,113,114,116,118,120,122,136,141,151,157,158,166,167,177,187,189,193,199,202,203,206,209,212,214,220,229,242,243,244,245,250,259,262,266,271,289,297],1984],25176],
          [[[6,42,48,50,51,57,61,88,105,110,118,155,167,170,212,241,261,288],1533],22471],
          [[{"$range":[1,1000001,5]},1],5199974],
          [[{"$range":[1,1000001,5]},1000],63333025],
          [[{"$range":[1,1000001,5]},1000000000000],1999990000025],
          [[{"$concat":[{"$range":[1,400001,4]},{"$range":[400002,1000002,6]}]},1000000000000],1999990000025],
          [[{"$concat":[{"$range":[1,400001,4]},{"$range":[400002,1000002,6]}]},5000],141443753]
        ] },
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
        alt: [{ lang: 'python', code: `def frog3(h, C):
    n = len(h)
    M, B = [], []                      # lines y = M*x + B, slopes strictly decreasing
    head = 0

    def add(m, b):
        # the middle line is useless if the new line beats it before it beats the first one
        while len(M) - head >= 2 and (b - B[-2]) * (M[-2] - M[-1]) <= (B[-1] - B[-2]) * (M[-2] - m):
            M.pop()
            B.pop()
        M.append(m)
        B.append(b)

    dp = 0
    add(-2 * h[0], h[0] * h[0])
    for i in range(1, n):
        x = h[i]
        while len(M) - head >= 2 and M[head + 1] * x + B[head + 1] <= M[head] * x + B[head]:
            head += 1
        dp = M[head] * x + B[head] + x * x + C
        add(-2 * x, dp + x * x)
    return dp` }, { lang: 'js', code: `function frog3(h, C) {
  const n = h.length;
  const M = new Array(n), B = new Array(n);        // lines y = M*x + B, slopes strictly decreasing
  let head = 0, tail = 0;
  // products can reach ~6e18, past 2^53, so the intersection test uses BigInt
  const bad = (a, b, m3, b3) =>
    BigInt(b3 - B[a]) * BigInt(M[a] - M[b]) <= BigInt(B[b] - B[a]) * BigInt(M[a] - m3);
  function add(m, b) {
    while (tail - head >= 2 && bad(tail - 2, tail - 1, m, b)) tail--;   // drop the middle line
    M[tail] = m; B[tail] = b; tail++;
  }
  let dp = 0;
  add(-2 * h[0], h[0] * h[0]);
  for (let i = 1; i < n; i++) {
    const x = h[i];
    while (tail - head >= 2 && M[head + 1] * x + B[head + 1] <= M[head] * x + B[head]) head++;
    dp = M[head] * x + B[head] + x * x + C;        // < 2^53: dp never exceeds about 2e12
    add(-2 * x, dp + x * x);
  }
  return dp;
}` }, { lang: 'cpp', code: `long long frog3(vector<long long>& h, long long C) {
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
    code: [{ lang: 'java', code: `
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
      }`, alt: [{ lang: 'python', code: `
# Generic Divide & Conquer optimisation for  dp[k][i] = min_{j<i} dp[k-1][j] + cost(j, i).
# cost(j, i) = cost of one group covering elements j+1..i (1-based prefix positions).
INF = float('inf')

def divide_conquer_dp(n, K, cost):
    prev = [INF] + [cost(0, i) for i in range(1, n + 1)]    # one group
    for k in range(2, K + 1):
        cur = [INF] * (n + 1)

        # Fill cur[l..r]; the best split for every i in [l, r] is known to lie in [opt_l, opt_r].
        def solve(l, r, opt_l, opt_r):
            if l > r:
                return
            mid = (l + r) // 2
            best, best_j = INF, opt_l
            for j in range(opt_l, min(mid - 1, opt_r) + 1):
                if prev[j] == INF:
                    continue
                v = prev[j] + cost(j, mid)
                if v < best:                         # strict '<' keeps the smallest argmin
                    best, best_j = v, j
            cur[mid] = best
            solve(l, mid - 1, opt_l, best_j)         # left half: splits <= best_j
            solve(mid + 1, r, best_j, opt_r)         # right half: splits >= best_j

        solve(k, n, k - 1, n - 1)                    # each of k groups needs >= 1 element
        prev = cur
    return prev[n]` }, { lang: 'js', code: `
// Generic Divide & Conquer optimisation for  dp[k][i] = min_{j<i} dp[k-1][j] + cost(j, i).
// cost(j, i) = cost of one group covering elements j+1..i (1-based prefix positions).
// Numbers are exact up to 2^53: if sums can pass that, make cost return BigInt and use 1n << 62n for INF.
const INF = Infinity;

function divideConquerDP(n, K, cost) {
  let prev = new Array(n + 1).fill(INF);
  for (let i = 1; i <= n; i++) prev[i] = cost(0, i);        // one group
  for (let k = 2; k <= K; k++) {
    const cur = new Array(n + 1).fill(INF);
    // Fill cur[l..r]; the best split for every i in [l, r] is known to lie in [optL, optR].
    const solve = (l, r, optL, optR) => {
      if (l > r) return;
      const mid = (l + r) >> 1;
      let best = INF, bestJ = optL;
      for (let j = optL; j <= Math.min(mid - 1, optR); j++) {
        if (prev[j] === INF) continue;
        const v = prev[j] + cost(j, mid);
        if (v < best) { best = v; bestJ = j; }              // strict '<' keeps the smallest argmin
      }
      cur[mid] = best;
      solve(l, mid - 1, optL, bestJ);                       // left half: splits <= bestJ
      solve(mid + 1, r, bestJ, optR);                       // right half: splits >= bestJ
    };
    solve(k, n, k - 1, n - 1);                              // each of k groups needs >= 1 element
    prev = cur;
  }
  return prev[n];
}` }, { lang: 'cpp', code: `
// Generic Divide & Conquer optimisation for  dp[k][i] = min_{j<i} dp[k-1][j] + cost(j, i).
// cost(j, i) = cost of one group covering elements j+1..i (1-based prefix positions).
class DivideConquerDP {
    static constexpr long long INF = LLONG_MAX / 4;
    vector<long long> prev, cur;
    function<long long(int, int)> cost;

    // Fill cur[l..r]; the best split for every i in [l, r] is known to lie in [optL, optR].
    void solve(int l, int r, int optL, int optR) {
        if (l > r) return;
        int mid = (l + r) >> 1;
        long long best = INF;
        int bestJ = optL;
        for (int j = optL; j <= min(mid - 1, optR); j++) {
            if (prev[j] >= INF) continue;
            long long v = prev[j] + cost(j, mid);
            if (v < best) { best = v; bestJ = j; }   // strict '<' keeps the smallest argmin
        }
        cur[mid] = best;
        solve(l, mid - 1, optL, bestJ);              // left half: splits <= bestJ
        solve(mid + 1, r, bestJ, optR);              // right half: splits >= bestJ
    }
public:
    long long run(int n, int K, function<long long(int, int)> c) {
        cost = c;
        prev.assign(n + 1, INF);
        for (int i = 1; i <= n; i++) prev[i] = cost(0, i);   // one group
        for (int k = 2; k <= K; k++) {
            cur.assign(n + 1, INF);
            solve(k, n, k - 1, n - 1);               // each of k groups needs >= 1 element
            prev = cur;
        }
        return prev[n];
    }
};` }] }, { lang: 'python', code: `import random

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
    codeTitle: ['Divide & Conquer DP template', 'Random stress test (Python)'],
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
      <p><b>Complexity accounting.</b> At recursion depth d there are 2<sup>d</sup> calls; their [optL, optR] ranges overlap only at endpoints, so the total scan length per depth is ≤ N + 2<sup>d</sup>. Depth ≤ log N → O(N log N) per layer. Recursion depth is only log N, so there is no stack-overflow risk in any language.</p>
      <p><b>D&amp;C vs Knuth.</b> D&amp;C needs monotone opt along i within a layer; Knuth (next topic) needs the stronger two-sided condition opt[i][j−1] ≤ opt[i][j] ≤ opt[i+1][j] and gives O(N<sup>2</sup>) for interval DPs. For layered partition DPs, Knuth can also be applied as opt[k−1][i] ≤ opt[k][i] ≤ opt[k][i+1] giving O(N<sup>2</sup>) total regardless of K — better when K is close to N.</p>
      <p><b>Removing K entirely.</b> If the answer as a function of K is <b>convex</b> (often true when QI holds), the Aliens trick (WQS / Lagrangian relaxation) binary searches a penalty λ per group and solves an unconstrained 1D DP each time: O(N log N · log C) — wins when K is large.</p>
      <p><b>Practical tips.</b> Use 64-bit integers (<code>long</code> / <code>long long</code>; Python integers are unbounded) and an INF of about 2<sup>61</sup> (<code>Long.MAX_VALUE/4</code>) to survive additions. Iterate i only from k (each group non-empty). Break ties consistently (strict &lt; → smallest argmin). Always stress-test against the naive layer DP: monotonicity bugs give answers that are "almost right".</p>`,
    aiEra: `<p><b>What AI changes:</b> D&amp;C optimization is a short template; AI writes it reliably. The hard part — and what interviewers at quant firms and contest-heavy teams test — is <b>justifying</b> that opt is monotone. LLMs frequently assert "this cost satisfies the quadrangle inequality" without checking; with negative values or non-convex costs that claim is false and the code silently returns a slightly wrong answer.</p>
      <p><b>Use AI as a partner:</b> ask it to write the brute-force layered DP and a randomized comparison (like the Python cell), including negative numbers and ties. If mismatches appear, you have learned that the optimisation does not apply. Ask it to <i>prove</i> QI for your cost in two lines — then check the proof yourself.</p>
      <p><b>Where AI goes wrong:</b> mixing 0-based and 1-based prefix indices (cost(j, i) covering j..i vs j+1..i), scanning j up to mid instead of mid − 1 (empty group), forgetting that layer k must start at i = k, and INF overflow. <b>You own:</b> the monotonicity argument, the indexing convention, and the decision between D&amp;C, Knuth, Aliens or CHT.</p>`,
    problems: [{
      title: 'Split Array into K Groups Minimising the Sum of Squared Group Sums',
      level: 'Hard', tags: ['dp', 'divide and conquer optimization', 'prefix sums'], companies: ['Citadel', 'Two Sigma', 'Google'],
      statement: `<p>Given an array of <b>non-negative</b> integers <code>a</code> and an integer <code>K</code>, split the array into exactly <code>K</code> non-empty contiguous groups. The cost of a group is (sum of its elements)<sup>2</sup>. Return the minimum total cost.</p>`,
      constraints: `1 ≤ K ≤ N ≤ 10<sup>4</sup>, 0 ≤ a[i] ≤ 10<sup>4</sup> (answers fit in a signed 64-bit integer)`,
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
      hints: [`<p><b>Aha:</b> dp[k][i] = min<sub>j</sub> dp[k−1][j] + (P[i] − P[j])². As i grows, the best start of the last group never moves left (non-negative values + convex square cost).</p>`, `<p>Compute each layer with solve(l, r, optL, optR): fix mid, scan j ∈ [optL, min(mid−1, optR)], then recurse with the found best split as the new bound.</p>`, `<p>Edge cases: K = 1 → (total)²; K = N → Σ a[i]²; groups must be non-empty → layer k fills i ∈ [k, n] and j ∈ [k−1, i−1]. Use 64-bit integers; keep the INF marker (about 2<sup>61</sup>) skipped explicitly.</p>`],
      tests: { sig: "int[] int -> long", fn: "minSquaredSplit", cases: [
          [[[1,3,2,4,1,5,2],3],110],
          [[[5],1],25],
          [[[0,0,0],2],0],
          [[[1,2,3,4],4],30],
          [[[1,2,3,4],1],100],
          [[[3,3,3,3],2],72],
          [[[7,0,0,7],2],98],
          [[[2581,8969,3209,8140,1292,4949,4350,4264,2271,2069,4283,6380,3007,2973,7109,1575,788,1516,5046,3755,635,287,9624,4555],20],539585701],
          [[[795,9033,8976],1],353590416],
          [[[8549,8624,5293,7685,7134,1668,3118,6402,7693,8749,3622,3570,7383,7576,5253,207,1559,5782,2625,4429,6167,6897,7672,7672],22],916785327],
          [[[6622,7680,4994,3036,2561,820,8907,7167,2254,4615,5435,8952,5062,5750,9035,2039,6212,1661,4177,8312,4782,4331,9327],3],5103597259],
          [[[5971,2759,8023,3768,9113,7794,8800,3507,7813],3],1111772490],
          [[[4591,2137,9481,148,8617,9278,2342,1048,2113,6588,7518,6145,6475,225,6995,9144,1032,4186,8815,4413,2947,2498,2440,54,667,2861,6785,6374],28],831081483],
          [[{"$rep":10000,"n":10000},1],"10000000000000000"],
          [[{"$rep":10000,"n":10000},2],"5000000000000000"],
          [[{"$rep":10000,"n":10000},3],"3333333400000000"],
          [[{"$rep":10000,"n":10000},7],"1428571600000000"],
          [[{"$rep":10000,"n":10000},20],"500000000000000"],
          [[{"$rep":0,"n":10000},20],0],
          [[{"$range":[0,10000]},3],833166682445342],
          [[{"$range":[10000,0,-1]},2],1250250013118272],
          [[{"$concat":[{"$rep":0,"n":5000},{"$rep":9000,"n":3},{"$rep":0,"n":4997}]},3],243000000]
        ] },
            solution: {
        approach: `<p>Layer by layer, each in O(N log N) via divide &amp; conquer on the monotone split point. Total O(K·N log N) ≈ 10<sup>4</sup> · 10<sup>4</sup> · 14 = 1.4·10<sup>9</sup> elementary steps in the worst case — fine in C++, tight in Java or JS and too slow in plain Python at the maximum; combine with Knuth (O(N<sup>2</sup>)) if K is huge.</p>`,
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
        alt: [{ lang: 'python', code: `def min_squared_split(a, K):
    n = len(a)
    P = [0] * (n + 1)
    for i, x in enumerate(a):
        P[i + 1] = P[i] + x
    INF = float('inf')
    prev = [INF] + [P[i] ** 2 for i in range(1, n + 1)]      # layer 1

    for layer in range(2, K + 1):
        cur = [INF] * (n + 1)

        def compute(l, r, opt_l, opt_r):
            if l > r:
                return
            mid = (l + r) // 2
            best, best_j = INF, opt_l
            for j in range(opt_l, min(mid - 1, opt_r) + 1):
                if prev[j] == INF:
                    continue
                v = prev[j] + (P[mid] - P[j]) ** 2
                if v < best:
                    best, best_j = v, j
            cur[mid] = best
            compute(l, mid - 1, opt_l, best_j)
            compute(mid + 1, r, best_j, opt_r)

        compute(layer, n, layer - 1, n - 1)
        prev = cur
    return prev[n]` }, { lang: 'js', code: `function minSquaredSplit(a, K) {
  const n = a.length;
  const INF = 1n << 62n;                           // answers reach 10^16, past 2^53, so use BigInt
  const P = new Array(n + 1).fill(0n);
  for (let i = 0; i < n; i++) P[i + 1] = P[i] + BigInt(a[i]);
  const cost = (j, i) => (P[i] - P[j]) * (P[i] - P[j]);   // group a[j..i-1]
  let prev = new Array(n + 1).fill(INF);
  for (let i = 1; i <= n; i++) prev[i] = cost(0, i);        // layer 1
  for (let k = 2; k <= K; k++) {
    const cur = new Array(n + 1).fill(INF);
    const compute = (l, r, optL, optR) => {
      if (l > r) return;
      const mid = (l + r) >> 1;
      let best = INF, bestJ = optL;
      for (let j = optL; j <= Math.min(mid - 1, optR); j++) {
        if (prev[j] === INF) continue;
        const v = prev[j] + cost(j, mid);
        if (v < best) { best = v; bestJ = j; }
      }
      cur[mid] = best;
      compute(l, mid - 1, optL, bestJ);
      compute(mid + 1, r, bestJ, optR);
    };
    compute(k, n, k - 1, n - 1);
    prev = cur;
  }
  return prev[n];
}` }, { lang: 'cpp', code: `class Solution {
    vector<long long> P, prev, cur;
    const long long INF = LLONG_MAX;

    long long cost(int j, int i) { long long s = P[i] - P[j]; return s * s; }   // group a[j..i-1]

    void compute(int l, int r, int optL, int optR) {
        if (l > r) return;
        int mid = (l + r) / 2, bestJ = optL;
        long long best = INF;
        for (int j = optL; j <= min(mid - 1, optR); j++) {
            if (prev[j] == INF) continue;                     // impossible state
            long long v = prev[j] + cost(j, mid);
            if (v < best) { best = v; bestJ = j; }
        }
        cur[mid] = best;
        compute(l, mid - 1, optL, bestJ);
        compute(mid + 1, r, bestJ, optR);
    }

public:
    long long minSquaredSplit(vector<int>& a, int K) {
        int n = a.size();
        P.assign(n + 1, 0);
        for (int i = 0; i < n; i++) P[i + 1] = P[i] + a[i];
        prev.assign(n + 1, INF);
        for (int i = 1; i <= n; i++) prev[i] = cost(0, i);    // layer 1
        for (int k = 2; k <= K; k++) {
            cur.assign(n + 1, INF);
            compute(k, n, k - 1, n - 1);
            prev = cur;
        }
        return prev[n];
    }
};` }],
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

  // =====================================================================
  // TOPIC 7 — Knuth optimization
  // =====================================================================
  topics.push({
    title: 'Knuth Optimization: Interval DP from O(N³) to O(N²)',
    analogy: `<p>You're merging a row of <b>sand piles</b>, two neighbours at a time, paying the weight you carry each time. For any stretch of piles, the big question is: <b>where is the last merge?</b> — the "split point" between the left part and the right part.</p>
      <p>Now a common-sense observation: if you take a stretch and add <b>one more pile on the right</b>, the best split shouldn't jump <i>left</i>; and if you remove a pile from the <b>left</b>, it shouldn't jump left either. So the best split for a stretch is sandwiched between the best splits of its two slightly shorter neighbours. Instead of trying every split, you only try the few positions inside that sandwich — and across a whole diagonal those sandwiches add up to only O(N).</p>`,
    explain: `<p><b>The shape.</b> Interval DP:</p>
      <p style="text-align:center"><code>dp[i][j] = min over i ≤ k &lt; j of ( dp[i][k] + dp[k+1][j] ) + w(i, j)</code></p>
      <p>Fill by increasing length; each cell scans up to j − i split points → <b>O(N<sup>3</sup>)</b>. For N = 5 000 that's 2·10<sup>10</sup> — hopeless.</p>
      <p><b>Knuth's observation.</b> Let <code>opt[i][j]</code> be the best k. If the extra cost <code>w</code> satisfies</p>
      <ul>
        <li><b>quadrangle inequality</b>: w(a, c) + w(b, d) ≤ w(a, d) + w(b, c) for a ≤ b ≤ c ≤ d, and</li>
        <li><b>monotone on intervals</b>: w(b, c) ≤ w(a, d) when [b, c] ⊆ [a, d],</li>
      </ul>
      <p>then</p>
      <p style="text-align:center"><b><code>opt[i][j−1] ≤ opt[i][j] ≤ opt[i+1][j]</code></b></p>
      <p>So for cell (i, j) we only scan k from <code>opt[i][j−1]</code> to <code>opt[i+1][j]</code> — both already computed (they are shorter intervals).</p>
      <h4>Why it's O(N<sup>2</sup>) — the telescoping sum</h4>
      <p>On one diagonal (fixed length), the scan for (i, j) costs <code>opt[i+1][j] − opt[i][j−1] + 1</code>. Adding over i, the terms cancel like a chain: <code>opt[i+1][j]</code> of one cell is subtracted as <code>opt[(i+1)][(j+1)−1]</code> by the next. What remains is ≤ N + (#cells). N diagonals × O(N) = <b>O(N<sup>2</sup>)</b>.</p>
      ${H.table(['N', 'plain interval DP ~N³/6', 'Knuth ~N²'], [['500', '2·10<sup>7</sup>', '2.5·10<sup>5</sup>'], ['5 000', '2·10<sup>10</sup> ✗', '2.5·10<sup>7</sup> ✓']])}
      <p><b>Typical costs that qualify:</b> w(i, j) = sum of a[i..j] (merging piles, optimal BST with frequencies, Huffman-like merges of <i>adjacent</i> items), w(i, j) = pos[j] − pos[i] (cutting a stick, breaking a string). <b>Costs that don't:</b> anything that depends on k itself, like matrix-chain p<sub>i−1</sub>·p<sub>k</sub>·p<sub>j</sub> or burst balloons.</p>`,
    clues: [
      'interval DP "dp[i][j] = min over split k of dp[i][k] + dp[k+1][j] + cost(i, j)" with <b>N up to 5 000</b> → O(N²) needed → Knuth',
      '"merge adjacent piles / files / stones, cost = total size of the merged pile"',
      '"cut a rod/stick/string at given points, each cut costs the current length"',
      '"optimal binary search tree" with access frequencies',
      'the extra cost w(i, j) does <b>not</b> depend on the split k (if it does — matrix chain, burst balloons — Knuth does not apply)',
      'layered partition DP with K close to N → Knuth on (k, i): opt[k−1][i] ≤ opt[k][i] ≤ opt[k][i+1]'
    ],
    code: [{ lang: 'java', code: `
      // Minimum Cost to Cut a Stick (LC 1547) with Knuth: O(m^2) where m = cuts + 2.
      // dp[i][j] = min cost to perform all cuts strictly between pos[i] and pos[j].
      long minCostCuts(int n, int[] cuts) {
          int m = cuts.length + 2;
          int[] sorted = cuts.clone();
          Arrays.sort(sorted);
          int[] pos = new int[m];
          pos[0] = 0; pos[m - 1] = n;
          for (int i = 0; i < sorted.length; i++) pos[i + 1] = sorted[i];
          long[][] dp = new long[m][m];                  // dp[i][i+1] = 0: no cut inside
          int[][] opt = new int[m][m];
          for (int i = 0; i + 1 < m; i++) opt[i][i + 1] = i;   // sentinel, clamped below
          for (int len = 2; len < m; len++)
              for (int i = 0; i + len < m; i++) {
                  int j = i + len;
                  dp[i][j] = Long.MAX_VALUE;
                  int lo = Math.max(i + 1, opt[i][j - 1]);       // Knuth window
                  int hi = Math.min(j - 1, opt[i + 1][j]);
                  for (int k = lo; k <= hi; k++) {               // first cut at pos[k]
                      long v = dp[i][k] + dp[k][j];
                      if (v < dp[i][j]) { dp[i][j] = v; opt[i][j] = k; }
                  }
                  dp[i][j] += pos[j] - pos[i];                  // the first cut costs the whole stick
              }
          return dp[0][m - 1];
      }`, alt: [{ lang: 'python', code: `
# Minimum Cost to Cut a Stick (LC 1547) with Knuth: O(m^2) where m = cuts + 2.
# dp[i][j] = min cost to perform all cuts strictly between pos[i] and pos[j].
def min_cost_cuts(n, cuts):
    pos = [0] + sorted(cuts) + [n]
    m = len(pos)
    dp = [[0] * m for _ in range(m)]                 # dp[i][i+1] = 0: no cut inside
    opt = [[0] * m for _ in range(m)]
    for i in range(m - 1):
        opt[i][i + 1] = i                            # sentinel, clamped below
    for length in range(2, m):
        for i in range(m - length):
            j = i + length
            best, arg = float('inf'), i + 1
            lo = max(i + 1, opt[i][j - 1])           # Knuth window
            hi = min(j - 1, opt[i + 1][j])
            for k in range(lo, hi + 1):              # first cut at pos[k]
                v = dp[i][k] + dp[k][j]
                if v < best:
                    best, arg = v, k
            dp[i][j] = best + pos[j] - pos[i]        # the first cut costs the whole stick
            opt[i][j] = arg
    return dp[0][m - 1]` }, { lang: 'js', code: `
// Minimum Cost to Cut a Stick (LC 1547) with Knuth: O(m^2) where m = cuts + 2.
// dp[i][j] = min cost to perform all cuts strictly between pos[i] and pos[j].
// Totals stay below 2^53 for the LeetCode limits; use BigInt beyond that.
function minCostCuts(n, cuts) {
  const pos = [0, ...[...cuts].sort((a, b) => a - b), n];
  const m = pos.length;
  const dp = Array.from({ length: m }, () => new Array(m).fill(0));    // dp[i][i+1] = 0: no cut inside
  const opt = Array.from({ length: m }, () => new Array(m).fill(0));
  for (let i = 0; i + 1 < m; i++) opt[i][i + 1] = i;                   // sentinel, clamped below
  for (let len = 2; len < m; len++)
    for (let i = 0; i + len < m; i++) {
      const j = i + len;
      let best = Infinity;
      const lo = Math.max(i + 1, opt[i][j - 1]);                       // Knuth window
      const hi = Math.min(j - 1, opt[i + 1][j]);
      for (let k = lo; k <= hi; k++) {                                 // first cut at pos[k]
        const v = dp[i][k] + dp[k][j];
        if (v < best) { best = v; opt[i][j] = k; }
      }
      dp[i][j] = best + pos[j] - pos[i];                               // the first cut costs the whole stick
    }
  return dp[0][m - 1];
}` }, { lang: 'cpp', code: `
// Minimum Cost to Cut a Stick (LC 1547) with Knuth: O(m^2) where m = cuts + 2.
// dp[i][j] = min cost to perform all cuts strictly between pos[i] and pos[j].
long long minCostCuts(int n, vector<int> cuts) {
    sort(cuts.begin(), cuts.end());
    vector<int> pos{0};
    pos.insert(pos.end(), cuts.begin(), cuts.end());
    pos.push_back(n);
    int m = pos.size();
    vector<vector<long long>> dp(m, vector<long long>(m, 0));   // dp[i][i+1] = 0: no cut inside
    vector<vector<int>> opt(m, vector<int>(m, 0));
    for (int i = 0; i + 1 < m; i++) opt[i][i + 1] = i;          // sentinel, clamped below
    for (int len = 2; len < m; len++)
        for (int i = 0; i + len < m; i++) {
            int j = i + len;
            dp[i][j] = LLONG_MAX;
            int lo = max(i + 1, opt[i][j - 1]);                 // Knuth window
            int hi = min(j - 1, opt[i + 1][j]);
            for (int k = lo; k <= hi; k++) {                    // first cut at pos[k]
                long long v = dp[i][k] + dp[k][j];
                if (v < dp[i][j]) { dp[i][j] = v; opt[i][j] = k; }
            }
            dp[i][j] += pos[j] - pos[i];                        // the first cut costs the whole stick
        }
    return dp[0][m - 1];
}` }] }],
    codeTitle: ['Cutting a stick with Knuth'],
    viz: {
      title: 'Merging piles: each cell only scans the Knuth window',
      input: '4 1 3 2 5',
      inputLabel: 'pile sizes (2..7 piles)',
      gen: function (input) {
        var a = parseNums(input, 'pile sizes', 2, 7, 1, 50), n = a.length, i, j, k;
        var P = [0]; for (i = 0; i < n; i++) P.push(P[i] + a[i]);
        var dp = [], opt = [];
        for (i = 0; i < n; i++) { var r1 = [], r2 = []; for (j = 0; j < n; j++) { r1.push(i === j ? 0 : '·'); r2.push(i === j ? i : '·'); } dp.push(r1); opt.push(r2); }
        var head = []; for (i = 0; i < n; i++) head.push(String(i));
        var frames = [], scanned = 0, naive = 0;
        function g(lbl, M, hl) { return { type: 'grid', label: lbl, rows: M.map(function (r) { return r.slice(); }), rowHead: head, colHead: head, hl: hl || {} }; }
        frames.push({ narr: 'dp[i][j] = cheapest way to merge piles i..j into one; opt[i][j] = the best last split k (left part i..k, right part k+1..j). Diagonal: single piles cost 0 and opt[i][i] = i.', parts: [{ type: 'array', label: 'piles', values: a }, g('dp', dp), g('opt', opt)] });
        for (var len = 2; len <= n; len++) {
          for (i = 0; i + len - 1 < n; i++) {
            j = i + len - 1;
            var lo = opt[i][j - 1], hi = Math.min(opt[i + 1][j], j - 1), best = Infinity, bk = lo, tried = [];
            for (k = lo; k <= hi; k++) { var v = dp[i][k] + dp[k + 1][j]; tried.push('k=' + k + ':' + v); if (v < best) { best = v; bk = k; } }
            scanned += hi - lo + 1; naive += j - i;
            dp[i][j] = best + P[j + 1] - P[i]; opt[i][j] = bk;
            var hd = {}; hd[i + ',' + j] = 'ok'; hd[i + ',' + (j - 1)] = 'win'; hd[(i + 1) + ',' + j] = 'win';
            var ho = {}; ho[i + ',' + j] = 'ok'; ho[i + ',' + (j - 1)] = 'cur'; ho[(i + 1) + ',' + j] = 'cur';
            var hp = {}; for (var q = i; q <= j; q++) hp[q] = q <= bk ? 'win' : 'sel';
            frames.push({ narr: 'Cell (' + i + ', ' + j + '): Knuth window k ∈ [opt[' + i + '][' + (j - 1) + '] = ' + lo + ', opt[' + (i + 1) + '][' + j + '] = ' + opt[i + 1][j] + '] (clamped to ≤ ' + (j - 1) + '). Tried ' + tried.join(', ') + ' — <b>' + (hi - lo + 1) + '</b> candidate(s) instead of ' + (j - i) + '. Best k = ' + bk + ', plus merge cost sum(' + i + '..' + j + ') = ' + (P[j + 1] - P[i]) + ' → dp = <b>' + dp[i][j] + '</b>.',
              parts: [{ type: 'array', label: 'piles (blue = left part, purple = right part)', values: a, hl: hp }, g('dp', dp, hd), g('opt (amber = the two bounds)', opt, ho), { type: 'vars', vals: { candidatesKnuth: scanned, candidatesNaive: naive }, hl: { candidatesKnuth: 'ok' } }] });
          }
        }
        frames.push({ narr: '<b>Answer dp[0][' + (n - 1) + '] = ' + dp[0][n - 1] + '</b>. Candidates scanned: ' + scanned + ' with Knuth vs ' + naive + ' naively. The gap grows from O(N³) vs O(N²): at N = 5 000 it is ~2·10<sup>10</sup> vs ~2.5·10<sup>7</sup>.', parts: [g('dp', dp, one('0,' + (n - 1), 'sel')), { type: 'vars', vals: { answer: dp[0][n - 1], candidatesKnuth: scanned, candidatesNaive: naive }, hl: { answer: 'sel' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Merging 4 1 3 2 5 by hand', html: `<p>Length 2: (0,1) = 5, (1,2) = 4, (2,3) = 5, (3,4) = 7. Length 3: (0,2): k ∈ [0, 1] → k=0: 0 + 4 = 4, k=1: 5 + 0 = 5 → 4 + 8 = <b>12</b>. (1,3) → 10, (2,4) → 15. Length 4: (0,3) window [0, 2] → 20; (1,4) window [opt[1][3] = 2, opt[2][4] = 3] → only k = 2, 3 (naive would try 1, 2, 3) → 21. Full (0,4): window [0, 3] → best k = 2: dp[0][2] + dp[3][4] = 12 + 7 = 19, +15 = <b>34</b>.</p>` },
      { title: 'Cutting a stick (LC 1547)', html: `<p>Stick of length 7, cuts at 1, 3, 4, 5 → positions [0, 1, 3, 4, 5, 7]. Every cut costs the length of the piece being cut. Best order costs <b>16</b> (cut at 3: 7, then 1 on [0,3]: 3, then 5 on [3,7]: 4, then 4 on [3,5]: 2 → 16). Here the extra cost is <code>pos[j] − pos[i]</code> — it satisfies both Knuth conditions, so the code above runs in O(m²). With 10<sup>4</sup> cuts that's 10<sup>8</sup> vs 10<sup>12</sup>/6.</p>` },
      { title: 'Optimal binary search tree (Knuth, 1971)', html: `<p>Keys k<sub>1</sub>…k<sub>n</sub> with search frequencies f. Cost of a tree = Σ f · depth. dp[i][j] = min over root r of dp[i][r−1] + dp[r+1][j] + (f<sub>i</sub> + … + f<sub>j</sub>) — every key in the range sinks one level below the root. Same structure, so root[i][j−1] ≤ root[i][j] ≤ root[i+1][j]. This is the problem where Knuth discovered the trick; it's used in compilers (switch-case trees) and static dictionaries.</p>` },
      { title: 'When Knuth does NOT apply: matrix chain & burst balloons', html: `<p>Matrix chain: dp[i][j] = min<sub>k</sub> dp[i][k] + dp[k+1][j] + p<sub>i−1</sub>·p<sub>k</sub>·p<sub>j</sub>. The extra cost depends on <b>k</b>, so it is not a w(i, j) — the monotone-opt guarantee is gone, and counterexamples exist. Burst balloons is similar. For matrix chain an O(N log N) algorithm (Hu–Shing) exists but is rarely asked; in interviews say "O(N³) interval DP; Knuth doesn't apply because the merge cost depends on the split".</p>` }
    ],
    deepDive: `<p><b>The theorem (Knuth 1971, generalised by F. Yao 1980).</b> If w satisfies the quadrangle inequality (QI) and is monotone on the inclusion lattice, then dp itself satisfies QI, and from that opt[i][j−1] ≤ opt[i][j] ≤ opt[i+1][j]. Yao's "speed-up" paper made this a general tool, which is why it's sometimes called the <b>Knuth–Yao</b> optimization.</p>
      <p><b>Ties.</b> The proof talks about the <i>largest</i> (or consistently the smallest) optimal k. In practice, pick one tie-break rule and keep it; mixing &lt; and ≤ across cells can break the window bounds on adversarial inputs. Stress-test against the O(N³) version.</p>
      <p><b>Memory.</b> Two N × N tables: N = 5 000 → 25·10<sup>6</sup> longs (200 MB) + ints (100 MB) — too much! Tricks: use <code>int</code> for dp when values fit, store only the upper triangle in a 1D array, or note that each diagonal only needs the previous diagonal of opt and earlier dp values (dp needs all shorter intervals, so dp stays O(N²); opt can be rolled).</p>
      <p><b>Knuth on layered DP.</b> For dp[k][i] = min<sub>j</sub> dp[k−1][j] + cost(j, i) with QI cost: opt[k−1][i] ≤ opt[k][i] ≤ opt[k][i+1]. Iterate k ascending and i <b>descending</b> so both bounds are known. Total O(N²) independent of K — compare D&amp;C's O(K·N log N).</p>
      <p><b>Relatives.</b> Garsia–Wachs solves "merge adjacent piles" (optimal alphabetic tree) in O(N log N). Hu–Tucker likewise. The <b>Huffman</b> greedy works only when merges need not be adjacent. Knowing these names is an expert-level signal; implementing them is rarely required.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI will write the O(N³) interval DP immediately and, if asked, the Knuth version. Two things it routinely gets wrong: applying Knuth to costs that depend on k (matrix chain, burst balloons — wrong answers), and the boundary initialisation of opt (e.g. opt[i][i] for "merge" vs opt[i][i+1] for "cut" formulations), which causes empty windows or index errors.</p>
      <p><b>Use AI as a partner:</b> "Here is my interval DP. Does the extra cost depend only on (i, j)? Check QI and interval monotonicity for it, with a small numeric counterexample search." Then have it produce the random brute-force comparison — the same workflow used to verify every solution in this module.</p>
      <p><b>Where AI goes wrong:</b> memory blow-ups (two 5000 × 5000 tables of 64-bit values), wrong loop order (must fill by increasing length so both bounds exist), and claiming O(N²) without the telescoping argument. <b>You own:</b> the eligibility check, the opt initialisation, and the memory plan.</p>`,
    problems: [{
      title: 'Merge Adjacent Piles (Minimum Total Merge Cost)',
      level: 'Hard', tags: ['interval dp', 'knuth optimization', 'prefix sums'], companies: ['Google', 'Bloomberg', 'Codeforces'],
      statement: `<p>There are <code>N</code> piles in a row, pile <code>i</code> has <code>a[i]</code> stones. In one move you merge <b>two adjacent</b> piles into one; the cost equals the total stones in the new pile. Merge until one pile remains. Return the minimum total cost.</p>`,
      constraints: `1 ≤ N ≤ 5 000, 1 ≤ a[i] ≤ 10<sup>4</sup> (answer fits in a signed 64-bit integer)`,
      example: `${H.arr([4, 1, 3, 2, 5], { label: 'a' })}<p>Output <b>34</b>: merge (1,3) → 4 [cost 4], then (4,4) → 8 [cost 8], then (2,5) → 7 [cost 7], finally (8,7) → 15 [cost 15]. Total 4 + 8 + 7 + 15 = ${H.c('g', '34')}. A tempting order like (4,1) first gives 5 + 8 + 7 + 15 = 35. The last merge always costs the total (15); the DP decides how to build the two halves cheaply.</p>`,
      brute: { why: `<p>The standard O(N³) interval DP: every cell tries every split. N = 5 000 → ~2·10<sup>10</sup> steps. The waste: the best split of [i, j] is always between the best splits of [i, j−1] and [i+1, j], but we ignore that and scan all of them.</p>`, code: `
        long bruteMerge(int[] a) {
            int n = a.length;
            long[] P = new long[n + 1];
            for (int i = 0; i < n; i++) P[i + 1] = P[i] + a[i];
            long[][] dp = new long[n][n];
            for (int len = 2; len <= n; len++)
                for (int i = 0; i + len - 1 < n; i++) {
                    int j = i + len - 1;
                    dp[i][j] = Long.MAX_VALUE;
                    for (int k = i; k < j; k++)                   // every split point
                        dp[i][j] = Math.min(dp[i][j], dp[i][k] + dp[k + 1][j]);
                    dp[i][j] += P[j + 1] - P[i];                  // final merge of [i..j]
                }
            return dp[0][n - 1];
        }` },
      mcq: { q: 'opt[2][6] = 4 and opt[3][7] = 5. Which split points must be tried for the interval [2, 7]?', options: ['k = 4 and 5 only', 'k = 2..6', 'k = 5 only', 'k = 3..6'], answer: 0, explain: 'Knuth: opt[i][j−1] ≤ opt[i][j] ≤ opt[i+1][j], i.e. opt[2][6] = 4 ≤ opt[2][7] ≤ opt[3][7] = 5. Only k ∈ {4, 5}.' },
      hints: [`<p><b>Aha:</b> the last merge joins [i..k] and [k+1..j] and always costs sum(i..j). So dp[i][j] = min<sub>k</sub>(dp[i][k] + dp[k+1][j]) + sum(i..j).</p>`, `<p>w(i, j) = sum(i..j) satisfies the quadrangle inequality (with equality!) and is monotone on intervals → Knuth: scan k only in [opt[i][j−1], opt[i+1][j]].</p>`, `<p>Recipe: prefix sums; opt[i][i] = i; for len = 2..N, for i: j = i+len−1; lo = opt[i][j−1]; hi = min(opt[i+1][j], j−1); scan; add sum. N = 1 → 0. Memory: two N×N tables — consider int opt and long dp.</p>`],
      tests: { sig: "int[] -> long", fn: "mergePiles", cases: [
          [[[4,1,3,2,5]],34],
          [[[7]],0],
          [[[3,5]],8],
          [[[1,1,1,1]],8],
          [[[10000,1,1,10000]],30006],
          [[[5,4,3,2,1]],33],
          [[[1,2,3,4,5,6,7,8]],102],
          [[[8,7,6,5,4,3,2,1]],102],
          [[[3405,1878,6533,4178,2609,6323,855,8538,1783,8661,4,2822,8261,1991,7723,4967,7976,5164,5012,5076,949,887,4728,9353,1667,1020,5803,7575,4502,1528,2536,3463]],669076],
          [[[2274,3212,6088,6284,9827,4461,9298,2473,5674,8052,2001,3310,7074,4032,5351,842,2305,8895,2170,7607,6448,8180,956,960,4158,5446,6948,8512,9753,5997,9594,5491,5015,9868,3471,8845,3603,5939,3120,8544,7323,6135,3239,1592,4389,9533,5483]],1415032],
          [[[9590,8523,608,2632,605,4776,2050,9447,9338,7990,9943,8083,9629,6673,707,7511,5307,6903,3812,3071]],487373],
          [[[8303,3245,4620,9082,6898,9292,2439,3322,5857,4866,1768,5647,6675,7576,9702,3322,4081,5614,6787,3488,6455,6935,6036]],589545],
          [[[1705,3746,6889,8213,8586,6236,5378,1610,2029,1391,345,8614,556,4561,1735,9041,2927,2232,435,7459,7280,5289,8346,237,9637,5495,2617,3635,5627,4,5018,8206,6074]],732011],
          [[[9954,7782,9447,1363,7343,3303,7777,4253,5250]],177671],
          [[{"$rep":10000,"n":1}],0],
          [[{"$rep":10000,"n":2}],20000],
          [[{"$rep":10000,"n":3}],50000],
          [[{"$rep":10000,"n":5}],120000],
          [[{"$rep":10000,"n":64}],3840000],
          [[{"$rep":10000,"n":100}],6720000],
          [[{"$rep":10000,"n":1000}],99760000],
          [[{"$rep":1,"n":2000}],21952],
          [[{"$rep":10000,"n":2000}],219520000]
        ] },
            solution: {
        approach: `<p>Interval DP by increasing length with the Knuth window. The scan lengths telescope along each diagonal, giving O(N²) total.</p>`,
        code: `
          class Solution {
              public long mergePiles(int[] a) {
                  int n = a.length;
                  long[] P = new long[n + 1];
                  for (int i = 0; i < n; i++) P[i + 1] = P[i] + a[i];
                  long[][] dp = new long[n][n];
                  int[][] opt = new int[n][n];
                  for (int i = 0; i < n; i++) opt[i][i] = i;        // a single pile "splits" at itself
                  for (int len = 2; len <= n; len++) {
                      for (int i = 0; i + len - 1 < n; i++) {
                          int j = i + len - 1;
                          dp[i][j] = Long.MAX_VALUE;
                          int lo = opt[i][j - 1];                     // Knuth lower bound
                          int hi = Math.min(opt[i + 1][j], j - 1);    // Knuth upper bound
                          for (int k = lo; k <= hi; k++) {
                              long v = dp[i][k] + dp[k + 1][j];
                              if (v < dp[i][j]) { dp[i][j] = v; opt[i][j] = k; }
                          }
                          dp[i][j] += P[j + 1] - P[i];                // cost of the final merge
                      }
                  }
                  return dp[0][n - 1];
              }
          }`,
        alt: [{ lang: 'python', code: `def merge_piles(a):
    n = len(a)
    P = [0] * (n + 1)
    for i, x in enumerate(a):
        P[i + 1] = P[i] + x
    dp = [[0] * n for _ in range(n)]
    opt = [[0] * n for _ in range(n)]
    for i in range(n):
        opt[i][i] = i                                # a single pile "splits" at itself
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            lo = opt[i][j - 1]                       # Knuth bounds
            hi = min(opt[i + 1][j], j - 1)
            best, best_k = float('inf'), lo
            row = dp[i]
            for k in range(lo, hi + 1):
                v = row[k] + dp[k + 1][j]
                if v < best:
                    best, best_k = v, k
            dp[i][j] = best + P[j + 1] - P[i]        # cost of the final merge
            opt[i][j] = best_k
    return dp[0][n - 1]` }, { lang: 'js', code: `function mergePiles(a) {
  const n = a.length;
  const P = new Array(n + 1).fill(0);
  for (let i = 0; i < n; i++) P[i + 1] = P[i] + a[i];
  const dp = Array.from({ length: n }, () => new Float64Array(n));   // sums stay far below 2^53
  const opt = Array.from({ length: n }, () => new Int32Array(n));
  for (let i = 0; i < n; i++) opt[i][i] = i;      // a single pile "splits" at itself
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      const lo = opt[i][j - 1];                   // Knuth bounds
      const hi = Math.min(opt[i + 1][j], j - 1);
      let best = Infinity, bestK = lo;
      for (let k = lo; k <= hi; k++) {
        const v = dp[i][k] + dp[k + 1][j];
        if (v < best) { best = v; bestK = k; }
      }
      dp[i][j] = best + P[j + 1] - P[i];          // cost of the final merge
      opt[i][j] = bestK;
    }
  }
  return dp[0][n - 1];
}` }, { lang: 'cpp', code: `long long mergePiles(vector<int>& a) {
    int n = a.size();
    vector<long long> P(n + 1, 0);
    for (int i = 0; i < n; i++) P[i + 1] = P[i] + a[i];
    vector<vector<long long>> dp(n, vector<long long>(n, 0));
    vector<vector<int>> opt(n, vector<int>(n, 0));
    for (int i = 0; i < n; i++) opt[i][i] = i;     // a single pile "splits" at itself
    for (int len = 2; len <= n; len++) {
        for (int i = 0; i + len - 1 < n; i++) {
            int j = i + len - 1;
            int lo = opt[i][j - 1];                // Knuth bounds
            int hi = min(opt[i + 1][j], j - 1);
            long long best = LLONG_MAX;
            for (int k = lo; k <= hi; k++) {
                long long v = dp[i][k] + dp[k + 1][j];
                if (v < best) { best = v; opt[i][j] = k; }
            }
            dp[i][j] = best + P[j + 1] - P[i];     // cost of the final merge
        }
    }
    return dp[0][n - 1];
}` }],
        dry: { head: ['cell (i, j)', 'window [lo, hi]', 'naive range', 'best k', 'dp'], rows: [
          ['(0,1)…(3,4)', '[i, i]', '[i, i]', 'i', '5, 4, 5, 7'],
          ['(0,2)', '[0, 1]', '[0, 1]', '0', '12'], ['(1,3)', '[1, 2]', '[1, 2]', '2', '10'], ['(2,4)', '[2, 3]', '[2, 3]', '3', '15'],
          ['(0,3)', '[0, 2]', '[0, 2]', '0', '20'], ['(1,4)', '<span class="c-g">[2, 3]</span>', '[1, 3]', '3', '21'],
          ['(0,4)', '[0, 3]', '[0, 3]', '2', '<span class="c-g">34</span>']
        ] },
        complexity: `<p>Time O(N²) (telescoping windows), space O(N²).</p>`,
        followUps: ['Circular piles (LC-style "stone merge on a circle"): double the array and take the best window of length N.', 'Merge exactly K consecutive piles at a time (LC 1000) — interval DP with an extra "number of piles" dimension; Knuth no longer applies directly.', 'Merges need not be adjacent → Huffman greedy with a min-heap, O(N log N).']
      }
    }]
  });

  // =====================================================================
  // TOPIC 8 — SOS DP (Sum over Subsets) intro
  // =====================================================================
  topics.push({
    title: 'SOS DP (Sum over Subsets): Aggregating Over All Submasks in O(n·2ⁿ)',
    analogy: `<p>A pizza shop has 3 toppings: cheese, olive, mushroom. Each customer ordered some <b>combination</b>. Now the owner asks, for every combination: "how many customers would be <b>happy</b> with this pizza?" — a customer is happy if everything they asked for is on it (their order is a <b>subset</b> of the pizza).</p>
      <p>Checking every pizza against every order is slow. Smarter: handle <b>one topping at a time</b>. First, let every pizza that has cheese also collect the counts of the same pizza <i>without</i> cheese. Then do the same for olive, then mushroom. After the three passes, each pizza has collected every order that fits inside it — exactly once. That's SOS DP: a prefix sum, but on the corners of a cube instead of along a line.</p>`,
    explain: `<p><b>The task.</b> Given a value <code>A[mask]</code> for every mask of n bits, compute</p>
      <p style="text-align:center"><code>F[mask] = Σ A[sub] over all sub ⊆ mask</code> (sub &amp; mask == sub)</p>
      <ul>
        <li>Naive: for each mask, for each other mask, test subset → <b>O(4<sup>n</sup>)</b>.</li>
        <li>Submask enumeration (<code>sub = (sub − 1) &amp; mask</code>) → <b>O(3<sup>n</sup>)</b> (topic 1).</li>
        <li><b>SOS DP</b> → <b>O(n · 2<sup>n</sup>)</b>. For n = 20: 2·10<sup>7</sup> vs 3.5·10<sup>9</sup> vs 10<sup>12</sup>.</li>
      </ul>
      <h4>The 3-line algorithm</h4>
      <p>Start with <code>F = A</code>. For each bit i from 0 to n−1: for every mask that <b>has</b> bit i, do <code>F[mask] += F[mask ^ (1 &lt;&lt; i)]</code>.</p>
      <p><b>Why it works:</b> after processing bits 0..i, <code>F[mask]</code> = sum of A[sub] for sub ⊆ mask that agree with mask on all bits <i>above</i> i. Processing bit i lets bit i be "either": if mask has it, add the version without it. After all bits, every bit is free → all submasks, each counted once (each submask is reached by exactly one sequence of "drop or keep" decisions).</p>
      ${H.table(['mask', 'A', 'after bit 0', 'after bit 1', 'after bit 2 = F'], [
        ['000', '1', '1', '1', '1'], ['001', '2', '3', '3', '3'], ['010', '3', '3', '4', '4'], ['011', '4', '7', '10', '10'],
        ['100', '5', '5', '5', '6'], ['101', '6', '11', '11', '14'], ['110', '7', '7', '12', '16'], ['111', '8', '15', '<b>26</b>', '<b>36</b>']
      ])}
      <p>Check F[111] = 1+2+…+8 = 36 ✓ (every mask is a subset of 111). F[101] = A[000]+A[001]+A[100]+A[101] = 1+2+5+6 = 14 ✓.</p>
      <h4>Three variants you'll use</h4>
      <ul>
        <li><b>Sum over supersets</b>: for masks <i>without</i> bit i, <code>F[mask] += F[mask | 1&lt;&lt;i]</code>. ("How many numbers contain all bits of mask?")</li>
        <li><b>Inverse (Möbius)</b>: same loops with <code>−=</code> recovers A from F.</li>
        <li><b>Any / max / min</b> instead of sum — e.g. "some element that is a submask of mask" (guided problem).</li>
      </ul>`,
    clues: [
      'values up to 2<sup>20</sup> (≈10<sup>6</sup>) and a condition with <b>&amp; / |</b>: "a[i] &amp; a[j] == 0", "a[i] | a[j] == a[i]", "x is a submask of y"',
      '"for every mask, count / sum / max over all its <b>submasks</b> (or supersets)"',
      '"number of subsets whose AND is 0 / whose OR is X" → SOS + inclusion–exclusion',
      'n ≤ 20 and an O(3<sup>n</sup>) submask loop is too slow (3<sup>20</sup> ≈ 3.5·10<sup>9</sup>) → SOS O(n·2<sup>n</sup>)',
      '"for each element find another compatible element" with bitwise compatibility',
      'OR-convolution / "count pairs with OR equal to each value" → zeta transform, multiply, Möbius'
    ],
    code: [{ lang: 'java', code: `
      // SOS DP: F[mask] = sum of A[sub] over all sub ⊆ mask. O(n * 2^n).
      long[] sumOverSubsets(long[] A, int n) {
          long[] F = A.clone();
          for (int bit = 0; bit < n; bit++)
              for (int mask = 0; mask < (1 << n); mask++)
                  if ((mask & (1 << bit)) != 0)
                      F[mask] += F[mask ^ (1 << bit)];   // bring in the version without this bit
          return F;
      }

      // Sum over SUPERsets: G[mask] = sum of A[sup] over all sup ⊇ mask.
      long[] sumOverSupersets(long[] A, int n) {
          long[] G = A.clone();
          for (int bit = 0; bit < n; bit++)
              for (int mask = 0; mask < (1 << n); mask++)
                  if ((mask & (1 << bit)) == 0)
                      G[mask] += G[mask | (1 << bit)];
          return G;
      }

      // Count ordered pairs (i, j) with a[i] & a[j] == 0, values < 2^n.
      long countAndZeroPairs(int[] a, int n) {
          long[] cnt = new long[1 << n];
          for (int x : a) cnt[x]++;
          long[] F = sumOverSubsets(cnt, n);          // F[m] = how many values are submasks of m
          int full = (1 << n) - 1;
          long pairs = 0;
          for (int x : a) pairs += F[full ^ x];       // partners must avoid every bit of x
          return pairs;
      }`, alt: [{ lang: 'python', code: `
# SOS DP: F[mask] = sum of A[sub] over all sub that are subsets of mask. O(n * 2^n).
def sum_over_subsets(A, n):
    F = list(A)
    for bit in range(n):
        b = 1 << bit
        for mask in range(1 << n):
            if mask & b:
                F[mask] += F[mask ^ b]               # bring in the version without this bit
    return F

# Sum over SUPERsets: G[mask] = sum of A[sup] over all sup that contain mask.
def sum_over_supersets(A, n):
    G = list(A)
    for bit in range(n):
        b = 1 << bit
        for mask in range(1 << n):
            if not mask & b:
                G[mask] += G[mask | b]
    return G

# Count ordered pairs (i, j) with a[i] & a[j] == 0, values < 2^n.
def count_and_zero_pairs(a, n):
    cnt = [0] * (1 << n)
    for x in a:
        cnt[x] += 1
    F = sum_over_subsets(cnt, n)                     # F[m] = how many values are submasks of m
    full = (1 << n) - 1
    return sum(F[full ^ x] for x in a)               # partners must avoid every bit of x` }, { lang: 'js', code: `
// SOS DP: F[mask] = sum of A[sub] over all sub that are subsets of mask. O(n * 2^n).
function sumOverSubsets(A, n) {
  const F = Float64Array.from(A);                    // doubles are exact up to 2^53
  for (let bit = 0; bit < n; bit++)
    for (let mask = 0; mask < (1 << n); mask++)
      if (mask & (1 << bit)) F[mask] += F[mask ^ (1 << bit)];   // bring in the version without this bit
  return F;
}

// Sum over SUPERsets: G[mask] = sum of A[sup] over all sup that contain mask.
function sumOverSupersets(A, n) {
  const G = Float64Array.from(A);
  for (let bit = 0; bit < n; bit++)
    for (let mask = 0; mask < (1 << n); mask++)
      if (!(mask & (1 << bit))) G[mask] += G[mask | (1 << bit)];
  return G;
}

// Count ordered pairs (i, j) with a[i] & a[j] == 0, values < 2^n.
function countAndZeroPairs(a, n) {
  const cnt = new Float64Array(1 << n);
  for (const x of a) cnt[x]++;
  const F = sumOverSubsets(cnt, n);                  // F[m] = how many values are submasks of m
  const full = (1 << n) - 1;
  let pairs = 0;
  for (const x of a) pairs += F[full ^ x];           // partners must avoid every bit of x
  return pairs;
}` }, { lang: 'cpp', code: `
// SOS DP: F[mask] = sum of A[sub] over all sub that are subsets of mask. O(n * 2^n).
vector<long long> sumOverSubsets(vector<long long> F, int n) {
    for (int bit = 0; bit < n; bit++)
        for (int mask = 0; mask < (1 << n); mask++)
            if (mask & (1 << bit))
                F[mask] += F[mask ^ (1 << bit)];     // bring in the version without this bit
    return F;
}

// Sum over SUPERsets: G[mask] = sum of A[sup] over all sup that contain mask.
vector<long long> sumOverSupersets(vector<long long> G, int n) {
    for (int bit = 0; bit < n; bit++)
        for (int mask = 0; mask < (1 << n); mask++)
            if (!(mask & (1 << bit)))
                G[mask] += G[mask | (1 << bit)];
    return G;
}

// Count ordered pairs (i, j) with a[i] & a[j] == 0, values < 2^n.
long long countAndZeroPairs(const vector<int>& a, int n) {
    vector<long long> cnt(1 << n, 0);
    for (int x : a) cnt[x]++;
    vector<long long> F = sumOverSubsets(cnt, n);    // F[m] = how many values are submasks of m
    int full = (1 << n) - 1;
    long long pairs = 0;
    for (int x : a) pairs += F[full ^ x];            // partners must avoid every bit of x
    return pairs;
}` }] }, { lang: 'python', code: `def sos(A, n):
    F = A[:]
    for bit in range(n):
        for mask in range(1 << n):
            if mask >> bit & 1:
                F[mask] += F[mask ^ (1 << bit)]
    return F

def brute(A, n):
    return [sum(A[s] for s in range(1 << n) if s & m == s) for m in range(1 << n)]

A = [1, 2, 3, 4, 5, 6, 7, 8]
print(sos(A, 3))                  # [1, 3, 4, 10, 6, 14, 16, 36]
print(sos(A, 3) == brute(A, 3))   # True

# Count ordered pairs with a & b == 0 (including i == j only if a[i] == 0)
a = [1, 2, 4, 3, 0]
n = 3
cnt = [0] * (1 << n)
for x in a: cnt[x] += 1
F = sos(cnt, n)
print(sum(F[((1 << n) - 1) ^ x] for x in a))   # 17`, run: true, title: 'SOS + brute-force check (Python, runnable)' }],
    codeTitle: ['SOS over subsets / supersets + AND-zero pairs', 'SOS in Python with a brute-force check'],
    viz: {
      title: 'One bit at a time: F[mask] += F[mask without bit]',
      input: '1 2 3 4 5 6 7 8',
      inputLabel: 'A[0..7] for n = 3 bits (or 4 values for n = 2, 16 for n = 4)',
      gen: function (input) {
        var A = parseNums(input, 'A', 4, 16, -999, 999);
        var n = A.length === 4 ? 2 : A.length === 8 ? 3 : A.length === 16 ? 4 : -1;
        if (n < 0) throw new Error('Give exactly 4, 8 or 16 values (n = 2, 3 or 4 bits).');
        var F = A.slice(), size = 1 << n, labels = [], frames = [];
        for (var m = 0; m < size; m++) labels.push(bin(m, n));
        frames.push({ narr: 'Start with F = A. Index labels are the masks in binary. Goal: F[mask] = sum of A over every submask. We will sweep bit 0, then bit 1, … — like doing a prefix sum along each of the n dimensions of a cube.', parts: [{ type: 'array', label: 'F (= A for now)', values: F.slice(), idxLabels: labels }] });
        for (var bit = 0; bit < n; bit++) {
          for (m = 0; m < size; m++) {
            if (!(m >> bit & 1)) continue;
            var src = m ^ (1 << bit), before = F[m];
            F[m] += F[src];
            var hl = {}; hl[m] = 'ok'; hl[src] = 'win';
            frames.push({ narr: 'Bit ' + bit + ': mask <b>' + bin(m, n) + '</b> has bit ' + bit + ' set, so it adds F[' + bin(src, n) + '] = ' + F[src] + ' (the same mask with that bit removed): ' + before + ' + ' + F[src] + ' = <b>' + F[m] + '</b>.', parts: [{ type: 'bits', label: 'mask', value: m, width: n, hl: one(bit, 'cur') }, { type: 'array', label: 'F after processing bits 0..' + bit + ' (partially)', values: F.slice(), idxLabels: labels, hl: hl }] });
          }
          frames.push({ narr: 'Bit ' + bit + ' done. Now F[mask] sums A[sub] over submasks that may differ from mask only in bits 0..' + bit + '.', parts: [{ type: 'array', label: 'F after bit ' + bit, values: F.slice(), idxLabels: labels }] });
        }
        var check = 0, full = size - 1; for (m = 0; m < size; m++) check += A[m];
        frames.push({ narr: '<b>Done.</b> F[' + bin(full, n) + '] = ' + F[full] + ' = sum of all A (' + check + ') ✓, since every mask is a submask of all-ones. Work: n · 2<sup>n</sup>/2 additions = ' + (n * size / 2) + ', versus 3<sup>n</sup> = ' + Math.pow(3, n) + ' pairs for submask enumeration.', parts: [{ type: 'array', label: 'F = sum over subsets', values: F.slice(), idxLabels: labels, hl: one(full, 'sel') }] });
        return frames;
      }
    },
    examples: [
      { title: 'Counting AND-zero pairs', html: `<p>a = [1, 2, 4, 3, 0] with 3 bits; cnt[v] = 1 for each of these values. A partner of x must be a submask of the complement 111 ^ x:</p>${H.table(['x', 'complement', 'array values inside it', 'partners'], [['1 (001)', '110', '2, 4, 0', '3'], ['2 (010)', '101', '1, 4, 0', '3'], ['4 (100)', '011', '1, 2, 3, 0', '4'], ['3 (011)', '100', '4, 0', '2'], ['0 (000)', '111', 'all five', '5']])}<p>Total ordered pairs = <b>17</b> (this counts (0, 0) as a valid self-pair; subtract self-pairs or halve for unordered pairs if the problem asks). One SOS pass gives every row in O(1).</p>` },
      { title: 'Supersets: "how many numbers contain these bits?"', html: `<p>Query: how many array values have <i>all</i> bits of q set (q is a submask of the value)? Build cnt, run sum-over-supersets → G[q] answers each query in O(1). With values &lt; 2<sup>20</sup> and 10<sup>6</sup> queries: 2·10<sup>7</sup> preprocessing + 10<sup>6</sup> lookups.</p>` },
      { title: 'Subsets with AND = 0 (inclusion–exclusion)', html: `<p>G[m] = how many values are supersets of m. Every non-empty subset chosen from those G[m] values has an AND that contains m: 2<sup>G[m]</sup> − 1 of them. Inclusion–exclusion over m: #(AND = 0) = Σ<sub>m</sub> (−1)<sup>popcount(m)</sup> (2<sup>G[m]</sup> − 1). This is practice problem "Jzzhu and Numbers".</p>` },
      { title: 'OR convolution in one picture', html: `<p>Want C[k] = Σ<sub>i | j = k</sub> A[i]·B[j]? Apply SOS (zeta) to A and B, multiply pointwise, apply the inverse (Möbius, with −=). Pointwise products of subset-sums count pairs whose OR is a submask; Möbius peels it back to "exactly k". O(n·2<sup>n</sup>) instead of O(4<sup>n</sup>). (AND convolution uses supersets; XOR convolution needs the Walsh–Hadamard transform.)</p>` }
    ],
    deepDive: `<p><b>It's an n-dimensional prefix sum.</b> View a mask as a point in {0,1}<sup>n</sup>. "sub ⊆ mask" means "sub ≤ mask in every coordinate" — exactly the condition of an n-D prefix sum. A 2D prefix sum can be computed by summing along rows, then along columns; SOS does the same along each of the n axes, each axis having length 2.</p>
      <p><b>Loop order.</b> The bit loop must be <b>outside</b>. Swapping the loops (mask outer, bit inner) double-counts. Within a bit, iteration order of masks doesn't matter, because <code>mask ^ bit</code> lacks the bit and is not modified in this pass.</p>
      <p><b>Memory and speed.</b> 2<sup>20</sup> longs = 8 MB; 2<sup>22</sup> ints = 16 MB. The double loop is branchy; a faster form iterates blocks: <code>for (bit) for (base = 0; base &lt; size; base += 2*step) for (k = 0; k &lt; step; k++) F[base + step + k] += F[base + k];</code> — no branch, cache-friendly, vectorisable.</p>
      <p><b>Overflow and mod.</b> Sums can reach N · (number of submasks); use long or mod arithmetic. For the inverse transform under a modulus, add MOD before taking %.</p>
      <p><b>Subset-sum convolution</b> (Σ over disjoint i, j with i | j = k) adds a popcount dimension: "ranked zeta transform", O(n<sup>2</sup>·2<sup>n</sup>) — used for counting set partitions and in exact algorithms for graph colouring (Björklund–Husfeldt–Koivisto: chromatic number in O*(2<sup>n</sup>)). That's the expert horizon of this topic.</p>`,
    aiEra: `<p><b>What AI changes:</b> SOS DP is short and well documented; an assistant will write it correctly most of the time. The interview signal is <b>reduction</b>: turning "a[i] &amp; a[j] == 0" into "a[j] is a submask of the complement of a[i]", or "AND of subset is 0" into inclusion–exclusion over supersets. Those translations are where candidates (and AIs) stumble.</p>
      <p><b>Use AI as a partner:</b> ask for the O(4<sup>n</sup>) brute force for n ≤ 8 and a randomized equality test against your SOS — exactly the Python cell above. Ask it to explain "why the bit loop must be outermost" in two sentences and see if you agree.</p>
      <p><b>Where AI goes wrong:</b> swapping loop order, confusing subsets with supersets, forgetting that i = j pairs are counted (ordered vs unordered pairs), sizing the array by max(a) instead of the next power of two, and int overflow in counts. Also, AIs sometimes claim O(2<sup>n</sup>) — it's O(n·2<sup>n</sup>). <b>You own:</b> the reduction to a sub/superset aggregate, the counting convention, and the complexity budget.</p>`,
    problems: [{
      title: 'Compatible Numbers (find any partner with AND = 0)',
      level: 'Hard', tags: ['sos dp', 'bitmask', 'bit manipulation'], companies: ['Codeforces', 'Google', 'Tower Research'],
      statement: `<p>Given an array <code>a</code>, for each <code>a[i]</code> output <b>any</b> element <code>a[j]</code> of the array such that <code>a[i] &amp; a[j] == 0</code>, or <code>−1</code> if none exists.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>6</sup>, 1 ≤ a[i] ≤ 4·10<sup>6</sup> (&lt; 2<sup>22</sup>)`,
      example: `${H.arr([10, 6, 9, 8, 2], { label: 'a' })}<p>One valid output: <b>[−1, 9, 6, 6, 9]</b>. 10 = 1010 shares a bit with every other value (6 = 0110, 9 = 1001, 8 = 1000, 2 = 0010) → ${H.c('r', '−1')}. 6 &amp; 9 = 0110 &amp; 1001 = 0 ✓. 8 &amp; 6 = 0 ✓. 2 &amp; 9 = 0 ✓. Other valid partners are fine too (e.g. 8 for 6).</p>`,
      brute: { why: `<p>Check every pair: N<sup>2</sup> = 10<sup>12</sup>. The waste: we don't need a specific j, only "does any value fit inside the complement of a[i]?" — a question about masks, which has only 2<sup>22</sup> possible answers.</p>`, code: `
        int[] brutePartners(int[] a) {
            int[] res = new int[a.length];
            for (int i = 0; i < a.length; i++) {
                res[i] = -1;
                for (int j = 0; j < a.length; j++)
                    if ((a[i] & a[j]) == 0) { res[i] = a[j]; break; }
            }
            return res;
        }` },
      mcq: { q: 'a[i] = 0101 (4 bits). A valid partner must be…', options: ['a submask of 1010', 'a superset of 1010', 'equal to 1010', 'any number with an even popcount'], answer: 0, explain: 'a[i] &amp; x == 0 means x has no bit where a[i] has one, i.e. all of x\'s bits lie inside ~a[i] = 1010. So x ⊆ 1010 — a submask query.' },
      hints: [`<p><b>Aha:</b> a[i] &amp; x == 0 ⇔ x ⊆ complement(a[i]) = FULL ^ a[i]. So we need "any array value that is a submask of mask M" for M = FULL ^ a[i].</p>`, `<p>SOS with "any" instead of sum: any[v] = v for values in the array, −1 elsewhere; for each bit, for masks with the bit: if any[mask] == −1 take any[mask ^ bit].</p>`, `<p>Edge cases: duplicates are fine; a value can partner with itself only if it's 0 (not possible here since a[i] ≥ 1). Use FULL = 2<sup>22</sup> − 1; array of 4 M ints = 16 MB. Recipe: build any[], SOS pass over 22 bits, answer any[FULL ^ a[i]].</p>`],
      tests: { sig: "int[] -> int[]", fn: "compatible", check: "(args, out, expected) => { const a = args[0], set = new Set(a); if (!Array.isArray(out) || out.length !== a.length) return false; for (let i = 0; i < a.length; i++) { if (expected[i] === -1) { if (out[i] !== -1) return false; } else if (out[i] === -1 || !set.has(out[i]) || (a[i] & out[i]) !== 0) return false; } return true; }", cases: [
          [[[10,6,9,8,2]],[-1,0,0,0,0]],
          [[[1]],[-1]],
          [[[1,1,1]],[-1,-1,-1]],
          [[[3,5,6]],[-1,-1,-1]],
          [[[7,7,8]],[0,0,0]],
          [[[1,2,4,8,16,32,64,128,256,512]],[0,0,0,0,0,0,0,0,0,0]],
          [[[1023,1023]],[-1,-1]],
          [[[6,9]],[0,0]],
          [[[12,3,5,10]],[0,0,0,0]],
          [[[601,523,389,714,905,74,931,704,514,720,771,287,490,309,608,928,336,525,951,463,502,244,924,352,375,216,211,315,1010,99,566,435]],[-1,0,0,0,-1,0,-1,0,0,-1,0,0,-1,0,0,0,0,0,-1,-1,-1,0,0,0,-1,0,-1,0,-1,0,-1,-1]],
          [[[402,152,444,302,991,662,425,639,810,541,901,962,127,996,775,515,840,271,148,543]],[-1,0,0,-1,-1,-1,-1,-1,0,-1,-1,-1,-1,-1,0,0,0,-1,0,-1]],
          [[[367,274,415,137,1013,107,524,298,286,278,723,782,621,880,821,723,94,716,1,12,216,406,395,34,669,108,50,264,575,495]],[-1,0,-1,0,-1,-1,0,0,0,0,0,0,0,0,-1,0,0,0,0,0,0,0,-1,0,0,0,0,0,-1,-1]],
          [[[294,354,872,471,277,533,526,1004,31,868,701,276,148,1005,612,258,756,195,541,470,886,185,846,227,488,363,546,306,814]],[-1,0,0,-1,0,0,-1,-1,-1,-1,0,0,0,-1,0,0,0,0,0,-1,-1,0,-1,0,0,0,0,-1,-1]],
          [[{"$concat":[{"$range":[1,1000001]},[4000000]]}],{"$rep":0,"n":1000001}]
        ] },
            solution: {
        approach: `<p>Sum-over-subsets with an "any witness" aggregate. After the passes, any[M] is some array value that is a submask of M (or −1). Each query is one lookup.</p>`,
        code: `
          class Solution {
              public int[] compatible(int[] a) {
                  final int B = 22, FULL = (1 << B) - 1;
                  int[] any = new int[1 << B];
                  Arrays.fill(any, -1);
                  for (int x : a) any[x] = x;                     // every value is a submask of itself
                  for (int bit = 0; bit < B; bit++)
                      for (int mask = 0; mask <= FULL; mask++)
                          if ((mask & (1 << bit)) != 0 && any[mask] == -1)
                              any[mask] = any[mask ^ (1 << bit)];   // inherit a witness without this bit
                  int[] res = new int[a.length];
                  for (int i = 0; i < a.length; i++) res[i] = any[FULL ^ a[i]];
                  return res;
              }
          }`,
        alt: [{ lang: 'python', code: `def compatible(a):
    B = max(a).bit_length()                     # only as many bits as the data needs
    size = 1 << B
    witness = [-1] * size                       # witness[m] = some array value that is a submask of m
    for x in a:
        witness[x] = x                          # every value is a submask of itself
    for bit in range(B):
        step = 1 << bit
        for base in range(0, size, 2 * step):   # blocks: lower half lacks the bit, upper half has it
            lo = witness[base:base + step]
            hi = witness[base + step:base + 2 * step]
            witness[base + step:base + 2 * step] = [h if h != -1 else l for h, l in zip(hi, lo)]
    full = size - 1
    return [witness[full ^ x] for x in a]       # a submask of the complement has no common bit with x` }, { lang: 'js', code: `function compatible(a) {
  const B = 22, FULL = (1 << B) - 1;
  const any = new Int32Array(1 << B).fill(-1);    // any[m] = some array value that is a submask of m
  for (const x of a) any[x] = x;                  // every value is a submask of itself
  for (let bit = 0; bit < B; bit++)
    for (let mask = 0; mask <= FULL; mask++)
      if ((mask & (1 << bit)) !== 0 && any[mask] === -1)
        any[mask] = any[mask ^ (1 << bit)];       // inherit a witness without this bit
  return a.map((x) => any[FULL ^ x]);
}` }, { lang: 'cpp', code: `vector<int> compatible(vector<int>& a) {
    const int B = 22, FULL = (1 << B) - 1;
    vector<int> any(1 << B, -1);                   // any[m] = some array value that is a submask of m
    for (int x : a) any[x] = x;                    // every value is a submask of itself
    for (int bit = 0; bit < B; bit++)
        for (int mask = 0; mask <= FULL; mask++)
            if ((mask >> bit & 1) && any[mask] == -1)
                any[mask] = any[mask ^ (1 << bit)];   // inherit a witness without this bit
    vector<int> res;
    res.reserve(a.size());
    for (int x : a) res.push_back(any[FULL ^ x]);
    return res;
}` }],
        dry: { head: ['a[i]', 'binary', 'complement (4-bit view)', 'any[complement]', 'check'], rows: [
          ['10', '1010', '0101', '−1 (submasks 0101, 0100, 0001, 0000 absent)', '<span class="c-r">−1</span>'],
          ['6', '0110', '1001', '9 (9 itself is in the array)', '6 &amp; 9 = 0 ✓'],
          ['9', '1001', '0110', '6', '9 &amp; 6 = 0 ✓'],
          ['8', '1000', '0111', '6 (inherited from 0110 via bit 0)', '8 &amp; 6 = 0 ✓'],
          ['2', '0010', '1101', '9 (inherited from 1001 via bit 2)', '2 &amp; 9 = 0 ✓']
        ] },
        complexity: `<p>Time O(B·2<sup>B</sup> + N) with B = 22 ≈ 9.2·10<sup>7</sup> simple steps. Space O(2<sup>B</sup>).</p>`,
        followUps: ['Count, for each i, how many j are compatible (sum instead of any).', 'Find the pair with maximum a[i] + a[j] among compatible pairs (SOS with top-2 values).', 'Values up to 10<sup>18</sup>? SOS is impossible — switch to tries or randomized bit-sampling.']
      }
    }]
  });

  // =====================================================================
  // PRACTICE — Easy
  // =====================================================================
  practice.push({
    title: 'Count Numbers with Unique Digits',
    level: 'Easy', tags: ['digit dp', 'combinatorics'], companies: ['Google', 'Amazon'],
    statement: `<p>Given <code>n</code>, return how many integers <code>x</code> with <code>0 ≤ x &lt; 10<sup>n</sup></code> have all <b>distinct</b> digits.</p>`,
    constraints: `0 ≤ n ≤ 8`,
    example: `<p>n = 2 → Output <b>91</b>. There are 100 numbers 0..99; the 9 numbers ${H.c('r', '11, 22, …, 99')} repeat a digit. 100 − 9 = 91.</p>`,
    brute: { why: `<p>Check all 10<sup>n</sup> numbers: 10<sup>8</sup> digit checks — slow but borderline. The waste: every number of length L with distinct digits is counted by the same simple product, but we test them one by one.</p>`, code: `
      int bruteUnique(int n) {
          int limit = 1;
          for (int i = 0; i < n; i++) limit *= 10;
          int count = 0;
          for (int x = 0; x < limit; x++) {
              boolean[] seen = new boolean[10];
              boolean ok = true;
              for (char c : Integer.toString(x).toCharArray()) {
                  if (seen[c - '0']) { ok = false; break; }
                  seen[c - '0'] = true;
              }
              if (ok) count++;
          }
          return count;
      }` },
    mcq: { q: 'How many 3-digit numbers (100..999) have distinct digits?', options: ['9 · 9 · 8 = 648', '9 · 10 · 10 = 900', '10 · 9 · 8 = 720', '9 · 8 · 7 = 504'], answer: 0, explain: 'First digit 1..9 (9 ways), second any of the other 9 digits (0 now allowed), third any of the remaining 8.' },
    hints: [`<p><b>Aha:</b> this is the free (non-tight) part of a digit DP with a "used digits" state — and because the bound is 10<sup>n</sup>, every length is completely free.</p>`, `<p>Count by length L: 9 choices for the first digit (no leading zero), then 9, 8, 7, … for the next ones.</p>`, `<p>n = 0 → 1 (just 0). Total = 10 (all 1-digit numbers incl. 0) + Σ<sub>L=2..n</sub> 9·9·8·…·(11 − L). Lengths above 10 add nothing (only 10 digits exist).</p>`],
    tests: { sig: "int -> int", fn: "countNumbersWithUniqueDigits", cases: [
        [[0],1],
        [[1],10],
        [[2],91],
        [[3],739],
        [[4],5275],
        [[5],32491],
        [[6],168571],
        [[7],712891],
        [[8],2345851]
      ] },
        solution: {
      approach: `<p>Sum over lengths of 9 × (9 × 8 × …) — the closed form of the free digit-DP states.</p>`,
      code: `
        class Solution {
            public int countNumbersWithUniqueDigits(int n) {
                if (n == 0) return 1;                     // only the number 0
                int total = 10;                           // 0..9
                int cur = 9;                              // first digit of a longer number: 1..9
                for (int len = 2; len <= Math.min(n, 10); len++) {
                    cur *= (11 - len);                    // 9, 8, 7, ... unused digits for the next slot
                    total += cur;
                }
                return total;
            }
        }`,
      alt: [{ lang: 'python', code: `def count_numbers_with_unique_digits(n):
    if n == 0:
        return 1                         # only the number 0
    total, cur = 10, 9                   # 0..9, then 9 choices for a leading digit
    for length in range(2, min(n, 10) + 1):
        cur *= 11 - length               # 9, 8, 7, ... unused digits for the next slot
        total += cur
    return total` }, { lang: 'js', code: `function countNumbersWithUniqueDigits(n) {
  if (n === 0) return 1;                          // only the number 0
  let total = 10, cur = 9;                        // 0..9, then 9 choices for a leading digit
  for (let len = 2; len <= Math.min(n, 10); len++) {
    cur *= 11 - len;                              // 9, 8, 7, ... unused digits for the next slot
    total += cur;
  }
  return total;
}` }, { lang: 'cpp', code: `int countNumbersWithUniqueDigits(int n) {
    if (n == 0) return 1;                          // only the number 0
    int total = 10, cur = 9;                       // 0..9, then 9 choices for a leading digit
    for (int len = 2; len <= min(n, 10); len++) {
        cur *= 11 - len;                           // 9, 8, 7, ... unused digits for the next slot
        total += cur;
    }
    return total;
}` }],
      dry: { head: ['len', 'count of that length', 'running total'], rows: [['1', '10 (incl. 0)', '10'], ['2', '9·9 = 81', '91'], ['3', '81·8 = 648', '739']] },
      complexity: `<p>O(min(n, 10)) time, O(1) space.</p>`,
      followUps: ['Count numbers in [0, N] (arbitrary N) with distinct digits → full digit DP with a 10-bit mask (practice "Numbers With Repeated Digits").']
    }
  });

  practice.push({
    title: 'Toss Strange Coins',
    level: 'Easy', tags: ['probability dp', 'knapsack-style'], companies: ['Twitch', 'Jane Street'],
    statement: `<p>You have <code>n</code> coins; coin <code>i</code> lands heads with probability <code>prob[i]</code>. Toss every coin once. Return the probability that <b>exactly</b> <code>target</code> coins show heads.</p>`,
    constraints: `1 ≤ n ≤ 1000, 0 ≤ prob[i] ≤ 1, 0 ≤ target ≤ n. Answers within 10<sup>−5</sup> accepted.`,
    example: `<p>prob = [0.5, 0.5, 0.5, 0.5, 0.5], target = 0 → <b>0.03125</b> = 0.5<sup>5</sup> (all tails). prob = [0.4], target = 1 → <b>0.4</b>.</p>`,
    brute: { why: `<p>Enumerate all 2<sup>n</sup> head/tail outcomes and add the probabilities of those with exactly target heads. n = 1000 → 2<sup>1000</sup> outcomes. The waste: many outcomes share "first i coins, j heads so far" and have identical futures.</p>`, code: `
      double bruteCoins(double[] prob, int target) {
          int n = prob.length;
          double total = 0;
          for (int mask = 0; mask < (1 << n); mask++) {       // only feasible for n <= 20
              if (Integer.bitCount(mask) != target) continue;
              double p = 1;
              for (int i = 0; i < n; i++) p *= ((mask >> i & 1) == 1) ? prob[i] : 1 - prob[i];
              total += p;
          }
          return total;
      }` },
    mcq: { q: 'dp[j] = probability of j heads among the coins processed so far. Adding a coin with probability p, the new dp[j] is…', options: ['dp[j]·(1−p) + dp[j−1]·p', 'dp[j]·p + dp[j−1]·(1−p)', 'dp[j] + dp[j−1]', 'dp[j−1]·p'], answer: 0, explain: 'Either we already had j heads and this coin is tails (1 − p), or we had j − 1 heads and this coin is heads (p).' },
    hints: [`<p><b>Aha:</b> process coins one by one; the only thing that matters is how many heads so far — a probability version of 0/1 knapsack.</p>`, `<p>dp[j] over j = 0..target, update j from high to low so each coin is used once (like 0/1 knapsack).</p>`, `<p>Recipe: dp[0] = 1. For each p: for j = target..1: dp[j] = dp[j]·(1−p) + dp[j−1]·p; then dp[0] *= (1−p). Return dp[target].</p>`],
    tests: { sig: "double[] int -> double", fn: "probabilityOfHeads", cmp: "float", cases: [
        [[[0.4],1],0.4],
        [[[0.5,0.5,0.5,0.5,0.5],0],0.03125],
        [[[0.4],0],0.6],
        [[[1,0],1],1],
        [[[1,1,1],3],1],
        [[[0,0],0],1],
        [[[0.3,0.7,0.2,0.9],2],0.48379999999999995],
        [[[0.5,0.5],1],0.5],
        [[[0.74,0.51,0.56,0.25,0.56],3],0.34522104000000003],
        [[[0.01,0.09,0.72,0.15,0.61,0.08,0.74,0.33,0.69,0.76,0.07,0.69],9],0.002517933050711606],
        [[[0.82,0.92,0.09,0.45,0.75,0.15,0.16,0.3],6],0.038540471759999986],
        [[[0.18,0.28,0.02,0.33,0.34,0.12,0.21,0.77,0.78],4],0.22530968600887624],
        [[{"$rep":0.5,"n":1000},500],0.025225018178380496],
        [[{"$rep":0.5,"n":1000},0],9.332636185032189e-302],
        [[{"$rep":0.9,"n":1000},900],0.04201679086125396],
        [[{"$rep":0.001,"n":1000},1],0.36806348825925433],
        [[{"$rep":1,"n":1000},1000],1]
      ] },
        solution: {
      approach: `<p>Forward probability DP with a 1D rolling array, iterating j downward.</p>`,
      code: `
        class Solution {
            public double probabilityOfHeads(double[] prob, int target) {
                double[] dp = new double[target + 1];
                dp[0] = 1.0;                                  // zero coins → zero heads with certainty
                for (double p : prob) {
                    for (int j = target; j >= 1; j--)         // high → low: use each coin once
                        dp[j] = dp[j] * (1 - p) + dp[j - 1] * p;
                    dp[0] *= (1 - p);
                }
                return dp[target];
            }
        }`,
      alt: [{ lang: 'python', code: `def probability_of_heads(prob, target):
    dp = [0.0] * (target + 1)
    dp[0] = 1.0                                   # zero coins -> zero heads with certainty
    for p in prob:
        for j in range(target, 0, -1):            # high -> low: use each coin once
            dp[j] = dp[j] * (1 - p) + dp[j - 1] * p
        dp[0] *= 1 - p
    return dp[target]` }, { lang: 'js', code: `function probabilityOfHeads(prob, target) {
  const dp = new Float64Array(target + 1);
  dp[0] = 1;                                      // zero coins -> zero heads with certainty
  for (const p of prob) {
    for (let j = target; j >= 1; j--)             // high -> low: use each coin once
      dp[j] = dp[j] * (1 - p) + dp[j - 1] * p;
    dp[0] *= 1 - p;
  }
  return dp[target];
}` }, { lang: 'cpp', code: `double probabilityOfHeads(vector<double>& prob, int target) {
    vector<double> dp(target + 1, 0.0);
    dp[0] = 1.0;                                   // zero coins -> zero heads with certainty
    for (double p : prob) {
        for (int j = target; j >= 1; j--)          // high -> low: use each coin once
            dp[j] = dp[j] * (1 - p) + dp[j - 1] * p;
        dp[0] *= 1 - p;
    }
    return dp[target];
}` }],
      complexity: `<p>O(n · target) time, O(target) space.</p>`,
      followUps: ['Probability of <i>at least</i> target heads → sum the tail of dp.', 'Expected number of heads → linearity: Σ prob[i], no DP needed.']
    }
  });

  practice.push({
    title: 'Jump Game VI',
    level: 'Easy', tags: ['dp', 'monotonic deque'], companies: ['Amazon', 'Google'],
    statement: `<p>You start at index 0 of <code>nums</code> and must reach the last index. From index <code>i</code> you may jump to any index in <code>[i + 1, min(n − 1, i + k)]</code>. Your score is the sum of <code>nums</code> at every index you visit (including the first and last). Return the maximum score.</p>`,
    constraints: `1 ≤ n, k ≤ 10<sup>5</sup>, −10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>`,
    example: `${H.arr([1, -1, -2, 4, -7, 3], { label: 'nums, k = 2', hl: { 0: 'g', 1: 'g', 3: 'g', 5: 'g' } })}<p>Output <b>7</b> = 1 + (−1) + 4 + 3. We must step on −1 (cannot jump 0 → 3 with k = 2), but we skip −2 and −7.</p>`,
    brute: { why: `<p>dp[i] = nums[i] + max(dp[i−k..i−1]) scanned directly: O(n·k) = 10<sup>10</sup>. Waste: neighbouring windows share k − 1 values.</p>`, code: `
      int bruteJump(int[] nums, int k) {
          int n = nums.length;
          int[] dp = new int[n];
          dp[0] = nums[0];
          for (int i = 1; i < n; i++) {
              int best = Integer.MIN_VALUE;
              for (int j = Math.max(0, i - k); j < i; j++) best = Math.max(best, dp[j]);
              dp[i] = nums[i] + best;
          }
          return dp[n - 1];
      }` },
    mcq: { q: 'Why can we delete index j from the deque when dp[j] ≤ dp[i] and j &lt; i?', options: ['j expires sooner and is never better than i', 'j is out of the window already', 'Because dp values are always increasing', 'To keep the deque sorted by index'], answer: 0, explain: 'Every future window containing j also contains i, and dp[i] ≥ dp[j]. So j can never be the unique maximum again.' },
    hints: [`<p><b>Aha:</b> dp[i] = nums[i] + (maximum dp in the previous k positions) — a sliding window maximum.</p>`, `<p>Monotonic deque of indices with decreasing dp values; the front is the window max.</p>`, `<p>Per i: pop front while front &lt; i − k; dp[i] = nums[i] + dp[front]; pop back while dp[back] ≤ dp[i]; push i. Answer dp[n−1].</p>`],
    tests: { sig: "int[] int -> int", fn: "maxResult", cases: [
        [[[1,-1,-2,4,-7,3],2],7],
        [[[10,-5,-2,4,0,3],3],17],
        [[[1,-5,-20,4,-1,3,-6,-3],2],0],
        [[[5],1],5],
        [[[-3],100000],-3],
        [[[1,2],1],3],
        [[[-1,-2],5],-3],
        [[[0,0,0,0],2],0],
        [[[3,-1,-1,-1,3],4],6],
        [[[3,-1,-1,-1,3],1],3],
        [[[6397,-4954,-9499,-6711,-1201,3741,-1812,7235,9301,-1468],10],25206],
        [[[-5718,-6922,7788],1],-4852],
        [[[-9861,-9701,1495,-5194,8951,-2548,-8276,-955,-2696,-4736,-4996,4427,946,-266,8191,-2609,5698,6535,-8236,-6083,2706,195,-682,-3008,2880,1140,86,-2036,-4921,7809,-869,-1931,2050,6471,9833,5606,-1423,-1291,-5368,-3311,8756,-4979,8594,-4413,-1698,-892,5080],47],87588],
        [[[7737,-9108,8453,-5854,-9440,7852,549,-4760,5760,-8920,7845,-9657,4062,-8509,4836,5106,-3990,3847,2662,6491,3016,-3246,-4913,9044,7470,-4431,-5748,-7170,-432,6568,-6206,-8814,-8160],27],83138],
        [[[7264,2908,8845,3778,3089,8292,9375,275,4967],6],48793],
        [[{"$rep":10000,"n":100000},100000],1000000000],
        [[{"$rep":10000,"n":100000},1],1000000000],
        [[{"$rep":-10000,"n":100000},1],-1000000000],
        [[{"$rep":-10000,"n":100000},100000],-20000],
        [[{"$rep":-10000,"n":100000},2],-500010000],
        [[{"$concat":[{"$rep":7,"n":40000},{"$rep":-10000,"n":10},{"$rep":3,"n":50000}]},5],410000],
        [[{"$concat":[{"$rep":7,"n":40000},{"$rep":-10000,"n":10},{"$rep":3,"n":50000}]},11],430000]
      ] },
        solution: {
      approach: `<p>DP + monotonic deque, O(n).</p>`,
      code: `
        class Solution {
            public int maxResult(int[] nums, int k) {
                int n = nums.length;
                int[] dp = new int[n];
                ArrayDeque<Integer> dq = new ArrayDeque<>();
                dp[0] = nums[0];
                dq.addLast(0);
                for (int i = 1; i < n; i++) {
                    while (dq.peekFirst() < i - k) dq.pollFirst();                 // expired
                    dp[i] = nums[i] + dp[dq.peekFirst()];                          // best in window
                    while (!dq.isEmpty() && dp[dq.peekLast()] <= dp[i]) dq.pollLast(); // dominated
                    dq.addLast(i);
                }
                return dp[n - 1];
            }
        }`,
      alt: [{ lang: 'python', code: `from collections import deque

def max_result(nums, k):
    n = len(nums)
    dp = [0] * n
    dp[0] = nums[0]
    dq = deque([0])                              # indices, dp decreasing front -> back
    for i in range(1, n):
        while dq[0] < i - k:                     # expired
            dq.popleft()
        dp[i] = nums[i] + dp[dq[0]]              # best score inside the window
        while dq and dp[dq[-1]] <= dp[i]:        # dominated
            dq.pop()
        dq.append(i)
    return dp[-1]` }, { lang: 'js', code: `function maxResult(nums, k) {
  const n = nums.length;
  const dp = new Array(n).fill(0);
  const dq = new Int32Array(n);                    // indices, dp decreasing front -> back
  let head = 0, tail = 0;
  dp[0] = nums[0];
  dq[tail++] = 0;
  for (let i = 1; i < n; i++) {
    while (dq[head] < i - k) head++;               // expired
    dp[i] = nums[i] + dp[dq[head]];                // best score inside the window
    while (head < tail && dp[dq[tail - 1]] <= dp[i]) tail--;   // dominated
    dq[tail++] = i;
  }
  return dp[n - 1];
}` }, { lang: 'cpp', code: `int maxResult(vector<int>& nums, int k) {
    int n = nums.size();
    vector<int> dp(n);
    deque<int> dq;                                 // indices, dp decreasing front -> back
    dp[0] = nums[0];
    dq.push_back(0);
    for (int i = 1; i < n; i++) {
        while (dq.front() < i - k) dq.pop_front();         // expired
        dp[i] = nums[i] + dp[dq.front()];                  // best score inside the window
        while (!dq.empty() && dp[dq.back()] <= dp[i]) dq.pop_back();   // dominated
        dq.push_back(i);
    }
    return dp[n - 1];
}` }],
      dry: { head: ['i', 'nums[i]', 'window best', 'dp[i]'], rows: [['0', '1', '—', '1'], ['1', '−1', '1', '0'], ['2', '−2', '1', '−1'], ['3', '4', '0', '4'], ['4', '−7', '4', '−3'], ['5', '3', '4', '<span class="c-g">7</span>']] },
      complexity: `<p>O(n) time, O(k) extra space.</p>`,
      followUps: ['Return the path (store the argmax index per i).', 'Minimum cost instead of maximum score → deque with increasing values.']
    }
  });

  practice.push({
    title: 'Sum Over Submasks for Every Mask',
    level: 'Easy', tags: ['sos dp', 'bitmask'], companies: ['Codeforces', 'Hudson River Trading'],
    statement: `<p>You are given <code>n</code> and an array <code>A</code> of length <code>2<sup>n</sup></code>. For every mask <code>m</code>, compute <code>F[m] = Σ A[s]</code> over all <code>s</code> that are submasks of <code>m</code> (<code>s &amp; m == s</code>).</p>`,
    constraints: `1 ≤ n ≤ 20, |A[i]| ≤ 10<sup>9</sup> (use long)`,
    example: `<p>n = 2, A = [1, 2, 3, 4] → Output <b>[1, 3, 4, 10]</b>. F[01] = A[00] + A[01] = 3; F[10] = A[00] + A[10] = 4; F[11] = all four = 10.</p>`,
    brute: { why: `<p>Test every (m, s) pair: 4<sup>n</sup> = 10<sup>12</sup> for n = 20. Even the 3<sup>n</sup> submask walk is 3.5·10<sup>9</sup>. Waste: F[m] and F[m without one bit] share almost all their terms.</p>`, code: `
      long[] bruteSOS(long[] A, int n) {
          int size = 1 << n;
          long[] F = new long[size];
          for (int m = 0; m < size; m++)
              for (int s = 0; s < size; s++)
                  if ((s & m) == s) F[m] += A[s];          // s is a submask of m
          return F;
      }` },
    mcq: { q: 'Which loop order is correct for SOS DP?', options: ['for bit { for mask { … } }', 'for mask { for bit { … } }', 'Either order works', 'for mask descending only'], answer: 0, explain: 'Bits must be processed one full pass at a time (like prefix sums along each axis). Putting the bit loop inside counts some submasks several times.' },
    hints: [`<p><b>Aha:</b> a mask is a corner of an n-dimensional cube; "submask" = "≤ in every coordinate". That's an n-D prefix sum.</p>`, `<p>Do a prefix sum along one axis at a time: for each bit, every mask with that bit adds the value of the mask without it.</p>`, `<p>Recipe: F = A copy; for bit in 0..n−1: for mask in 0..2<sup>n</sup>−1: if mask has bit: F[mask] += F[mask ^ (1 &lt;&lt; bit)]. Use long.</p>`],
    tests: { sig: "long[] int -> long[]", fn: "sumOverSubmasks", check: "(args, out, expected) => { const n = args[1]; if (!Array.isArray(out) || out.length !== (1 << n)) return false; if (expected.length === 1 && expected[0] === \"pop\") { for (let m = 0; m < (1 << n); m++) { let c = 0; for (let x = m; x; x &= x - 1) c++; if (String(out[m]) !== String(args[0][0] * Math.pow(2, c))) return false; } return true; } return out.length === expected.length && out.every((v, i) => String(v) === String(expected[i])); }", cases: [
        [[[1,2,3,4],2],[1,3,4,10]],
        [[[5,-7],1],[5,-2]],
        [[[0,0,0,0],2],[0,0,0,0]],
        [[[-1000000000,1000000000,-1000000000,1000000000],2],[-1000000000,0,-2000000000,0]],
        [[[1,1,1,1,1,1,1,1],3],[1,2,2,4,2,4,4,8]],
        [[[392657116,-375022650,764022112,-9298086,166085482,966976405,-420971871,-727231026],3],[392657116,17634466,1156679228,772358492,558742598,1150696353,901792839,757217482]],
        [[[164193869,-823437930,-132042110,670257092,564137936,259845257,225732327,-409569264,-109591007,803859234,-605650425,918929637,936260462,895053149,200819254,191922426,-804687262,-612389267,552895665,-591844082,983879626,312196255,526717663,723027707,289767742,979470730,396354199,415753842,152385235,-249128819,803222180,104207516,236804485,-363836765,811774731,813779355,-689396382,-698637426,-207650781,-114087224,-951059938,85271768,256185770,785466433,778328181,588637591,795664072,-608664275,316128075,270563126,-154115677,-930433274,441183150,-342452288,-133318186,-472954989,13957739,-364215136,-566015482,763430417,-802827359,-927359999,354264617,-413648606,-73038101,-135946274,356672287,159517288,-621393204,538660109,202458143,-466596842,-208531618,341964483,527191878,-287416697,-308755160,653926611,290829420,763528586,19671202,969978095,156456947,561142922,441445351,273316383,-251959801,778092385,135811806,68634987,359642983,-72829247,182229042,-12511253,-813422203,297440589,-136856318,-758025408,405149281,111814022,-47367573,-686247349,774489940,-979541541,-661740013,16288996,-872071028,148737252,815002442,804027558,961280823,635089875,199417114,-302585602,-511116028,-676479340,-175689638,452593565,752265692,-855445147,-490945995,206960201,-797527790,-652929724,465895057,-334309578,191615105,-818531990,458247245,128373861,-981724978,938888364,519694090,929504157,561203718,568311453,145300627,731944800,661999464,744500876,338316,823631049,-53183794,510228873,-978669405,-214382358,-196580172,-208843470,-544078112,-674986065,-265516639,-668169856,-424313843,-691206932,-986563623,-89409001,166940212,-778847218,-103075445,-609754324,-193800628,306986809,-500828743,986338616,845393181,-916096688,-348179758,-506544352,-234685183,-743149043,702942670,34672260,-197518826,852051259,820620060,526455403,332624912,-452125073,-127568722,740284443,378271580,996017933,-760449887,-614856184,-6647706,-950357438,-76253839,353446961,-845363617,-865325869,625994563,-329020024,327502728,584771633,22590160,355161190,-366276264,583955288,632827282,-914148808,696902812,803695918,896689654,556932688,-618666411,503238976,-103879929,-847314835,710077346,-253688097,-514662028,786738217,147879124,-593322277,56154788,130618334,643049479,848141909,113861322,-912468672,85237801,936531067,-265758515,-133682251,61458588,404075623,-373714447,435058594,671398163,160926819,-72246552,-994003296,-604160256,-645975471,359864414,693158627,-391743183,-715376377,-49011648,-420902014,-855969191,925321877,-195476532,917678833,237941742,-343635559,-171108246,159759522,-508075714,-136100769,504871369,-197525025,290096283,763084412,-554256439,-306518495],8],[164193869,-659244061,32151759,-121029079,728331805,164739132,822022022,519117177,54602862,35024166,-683089673,886518360,1555001260,2690320970,1243860306,3750719907,-640493393,-2076320590,-219639838,-1577054025,907524169,43738484,2080827714,1608913482,-460316658,-112813891,-248759329,1511839927,2176346601,3741815210,4144395354,7732548837,400998354,-786276341,1080730975,1377492727,275739908,-1350326956,973554075,307867170,-659652591,-957796284,-329384625,2560904199,929677606,1676432484,2274510444,5269299502,-87560833,-1616661669,990951776,-576389969,1212243497,-785905541,2702237129,392263412,-844486297,-869200537,-285099626,2535525554,1519464552,1332904032,4644302369,6303314560,91155768,-868228436,315785945,186176121,33900500,-126978338,686721147,479450583,-226966857,-40527344,-80795227,1566931606,343283177,2877207816,1409293951,5483790816,-693860292,-1295655668,240122497,437400341,674209417,1456432045,2311140538,4517390372,-586403369,1005730689,1025118055,4390762868,1743785919,6007277669,4539704326,12558759934,191103935,-1890142442,1632658124,1306779504,-602915288,-3270541074,1833668530,-1048384370,-1739818641,-2573680537,-992608257,1494614229,-313001939,1208401665,3677831643,7532401370,-78366936,-1834046961,1407308160,-230617882,818432330,-827973189,4192842423,867115972,-2060698220,-1678142982,-1876913019,642538115,1054618946,2964783950,5911412412,8312742518,622441114,-72622955,-491325974,422755413,1706273140,2200558485,1379442097,3641615087,658150734,1498890699,-399267315,3714048619,2678581538,6427355115,2555734994,10437978028,-1160915553,-2682751247,-1918367148,-2631744938,362717987,-332558103,653403461,980185315,-1259752034,-957519896,-2551064014,549401382,1519805731,3339305634,2124413015,7152350707,665444971,-86469054,-137376129,2519973273,1905273796,727975071,1333558202,3103633517,-484590530,-358577796,-271934151,5746911216,2272646428,5132647510,4480327905,13391214660,-469158709,-2229406306,-1197348715,-539169268,2029926360,135069898,900274811,-70997316,-1746430278,-3655059892,-2691621550,1744967305,941197395,-763329941,3038870087,5556445500,876905741,630667031,142401100,2019986324,973068299,3038794400,1860785128,4828331702,1400986555,3836212280,2146712485,8638708648,1506326320,9129366641,4208858671,15285031019,-176702378,-533422715,-913096607,1401200577,948586169,2221034939,1899809421,5584840821,991693620,4521478412,1618824843,9093620582,2712951664,10643799125,4983251336,16877251433,844511868,187473417,452388049,4266164119,1720701815,1235573531,3097212315,3266718678,-1083052708,-346190474,451975870,9254633701,806383060,6120345277,6973184215,17287106194,-216895341,-543241091,-1599185707,3143527313,2570127429,2495419793,2709256766,3067499798,-2491856409,-1462973922,-2998625239,6301766645,1003004836,5220847996,5119377830,11513458739]],
        [[[-781639338,933281720,-448215008,-125199795,-198768139,519587040,-313487530,-201623440,443710804,569323063,-763354779,813627780,415877581,292948008,360909701,452816248,785571337,134489298,485394717,-761520148,53763688,905755043,219010353,-554129601,115021765,-559570551,408310712,708851338,-704186917,476791919,512292147,-241809607],5],[-781639338,151642382,-1229854346,-421772421,-980407477,472461283,-1742110015,-616064490,-337928534,1164676249,-1549498321,641534447,-120819092,2194320739,-1284966708,1969793916,3931999,1071703017,41111708,222162783,-141072452,2352040649,-198369920,652270197,562664568,1640188098,244800210,1958082915,129350781,3401956321,590211094,3953829409]],
        [[[269087076,804990054,-245940924,-662163496,-537748039,-750175357,-723753274,-911647797,347198546,478655577,-725031,-650183916,538778127,-21860600,-832745076,289636195,361829996,804593325,-211059332,-344444990,296694040,570008517,-470256567,-747334242,989187539,-964588166,463417106,576993943,-442609787,473318100,-942495347,-729051538,-365955353,-785606385,380634368,-730355502,183864415,625552655,533151150,-361855030,-150927067,899791241,-578749180,-984772146,315578811,794742585,-453125000,609386444,-848350525,666523040,-943490267,-922825046,-600426883,-352539838,-996990681,730615192,703190804,-163226128,-215952873,189175606,953648568,277295113,128987312,-446719170,94243050,-7281303,688282967,532132149,492161751,-993517876,16621643,167200565,823261738,313421726,-994491101,-210309452,-865896106,700771034,-987131119,-381460138,726585389,654850006,923583985,795665741,-918907166,100849211,23062468,556422949,709805251,541269064,-284741640,-726646662,-978766621,-642733939,-156586349,708069802,292412758,145951271,638680458,162568092,254601479,-991103173,-3378816,-909718514,-293583810,-383711100,-111485720,732467413,654511214,-97109079,497275114,-676273585,-138491809,-945357800,238970332,296621800,-286620617,-294614315,-34091473,233015537,-309546948,413446903,710987568,184912205,919846058,-63184261,387096882,431608677,844917775,601664067,-453029156,221151829,502777577,452913761,87093830,-729661465,24284899,528870821,-391765356,-879292250,-331735313,867321015,-295982361,562152863,-156967163,570278168,-25215149,755466462,-999847413,63518577,341954708,-512814045,-455069065,-859108448,492200434,744066477,466416598,-285213232,367701769,-432824850,-480753660,877525568,174590349,-30797720,517937899,-892047644,-46780288,784352303,-683810234,16942084,-205333948,-83415270,52888632,-498677492,-916748286,-649062336,-169810653,-54088473,-887392402,432137668,723287106,-502270222,-766729832,-72319448,628391505,809993029,-551202536,850453675,-699372292,327513755,892095328,-245850802,584720373,-162806749,110154867,-764470339,760268987,600135327,-270540714,-583408833,-786619604,-625833154,38409174,492550135,522814989,775297404,-10271788,-257919073,852530718,-22016287,-177229643,-770778418,-324528396,-564410210,-788767755,-441768766,561632514,-713379860,-902436197,-813074232,611797750,-22499323,187355757,-177210093,-690766573,10776341,536296368,-465315342,426391125,467122555,482043743,-695257664,874396861,-148280859,-441044569,366949320,585255862,-849311591,464965165,-402190209,-397803307,678025246,-912131310,514710486,-9124994,-296248675,-503374338,-90325594,64311743,593121291,-122595072,-684994936,-612068355,-816666007,-844036878,716941357,844129086,642161846,995896817,-817108632,722524226,-45171499,-64429045,926830531,-429684401,-554948569,641354859,223700523,-139580727,262763024,118231773,364325524,-811455727,-971611918,-654008992,942924083,-327251196,371501208,-151498556,-292750120,-575401068,-233475387,-993147851,945626312,-706056118,-51169813,-375380278,958927393,979029656,103404045,168025017,-436726570,-34337044,740183831,795771599,831400872,160304070,549815178,764338494,-251057625,-358922005,47923088,276850701,456522942,-263890267,132561,786433220,-655232430,-976475657,-803297170,-815815360,-152301997,525787473,-218023777,299140453,655393124,-609745503,452058375,311941385,190953493,742042780,86653948,470072031,479928255,-11661291,-529980421,-198152244,-185405731,-890853882,326625884,-58686495,282504797,255070448,-169355631,-496739626,-10208368,-47148943,671933890,572958708,823238135,-441714525,-521261454,-709942997,279158235,-355737686,104486466,-475221634,225267410,-556192398,-424764574,-474894762,319123984,708475829,-899536372,914536298,199940205,-113000393,-271377087,-250257015,527416706,-367280483,-452750683,-687947750,10532916,930295229,-493926764,526129961,829988718,-472746611,135059595,185252428,531759501,-520746947,-67680061,-945383072,-205923028,985130311,-538753510,945800841,616930723,149390936,-771918536,472829640,-69620609,289538860,384210110,-651115895,358701289,481722117,-621306181,-495433510,-451368332,628011704,840982438,154401779,-825468064,-172296465,827332259,-368990183,-59640169,135585547,-442721606,-740408183,-518811405,-371873260,884954572,-970177174,565396838,86583614,401736736,980966092,418723583,-474108219,391795635,393479824,456939221,-218760014,17718792,-947302342,573401980,555823803,87003231,-173618794,567994595,189986706,175603390,-348232746,-156332493,875052929,-749834538,634501994,982475520,-745240212,-562714517,-220911145,-529925943,-182509482,358705759,-420714140,790973902,976786852,168386459,944955826,-371873856,-861387253,678136886,977692366,410886765,623582840,422689438,585855484,-29436111,261201859,899724961,28039932,707731247,370256424,388235092,845956803,24732590,-193784714,134313583,863824845,761411667,112047195,321554184,93362808,195112228,518220902,-928949357,-266210497,815312148,-196760416,-702611208,706039250,-170280933,82211971,-367741108,-825712681,729018748,95348597,-92465162,-204301596,580624819,-826751471,404486954,376778603,-40984154,-463843346,792160988,591164589,186463356,-189781,-435225487,352913857,826508522,186608315,-89858055,294838905,855713845,541863442,367325783,-825247765,875641883,410522223,960922957,-268541336,-254392624,-690698624,-906255663,628514171,-992859364],9],[269087076,1074077130,23146152,165972710,-268660963,-213846266,-1238355161,-2757351757,616285622,1899931253,369619667,340917886,617315710,1128925384,-1185848595,-2608597935,630917072,2240500451,173916816,776891709,389863073,1819279612,-1261147024,-2497321010,1967303157,3090953947,1972994976,2016847307,1822417498,3217358948,-1141140947,-2924395338,-96868277,-77484608,37825167,-1335310162,-450751901,-555990934,-506660581,-3277921439,99403202,1497233689,-345377565,-1975022138,599876516,2645966286,-1321376451,-2677241929,-583388806,907111228,-1603244961,-2772533961,-1241005273,342340738,-3918710800,-6285375700,1305261016,3046393574,-46605117,-1834048106,2013040268,5370514001,-3096053348,-4834125108,363330126,1161038877,805672169,1473349573,317743838,-628240644,52954250,-1767508811,1533790410,3123576464,980916321,1580177660,1161086143,1686089398,-1918795772,-3220588407,1451745511,3708897593,2606612207,5184953693,783946097,1968262674,784487063,1354634519,4321198585,6947108868,4659524615,6596478215,1904904784,3967474157,-1830052807,-1504604321,289787531,447841168,1751444400,1211679280,682667137,-1268522977,1966964709,-2698064938,1015736938,2481948019,791942775,447536998,2051588590,2785099860,-125290951,-3377128399,391360582,1730022790,1861022169,2326883125,-725020438,-1471898406,-910994401,-3773974961,3209946635,5683667960,3667867351,4380424415,3188655879,4998075981,-367782538,-1757631350,1114004851,2520658972,415034771,1380677225,1079034389,2188426914,-256595135,-1229523539,1485488296,3899668815,394027829,837720515,1657560648,4619939986,-1199286700,-996915399,1318867684,4100393298,383623123,3135158542,580743849,3698534961,-1119462015,-933118647,2224469603,4189825001,1852352195,3579301652,1717195393,5052381572,-1123404333,-1238168974,267295838,1765869142,123550475,419958890,934127690,1868944409,640093745,-846066414,-195958018,3226875009,-1516276896,-1893272340,1046384091,5046986041,-2922824092,-3128749436,-546002507,2939876857,-2756905020,-552856451,-459463805,2241376008,-4712677272,-5114332786,856444420,5089653794,-2342569477,371835221,1796576466,7179185533,-5497060046,-4496253381,1792968274,3029534343,1892436028,2455652240,3010428550,3556350474,2219317789,34372326,2201093853,4132774892,951989293,963084992,3282515826,6845081573,-983297593,-1186424869,3576947214,6821218495,4186494829,7193325048,2847818555,5571411786,1672780509,955921044,5790629032,7734207873,4820044036,5060285858,4582300010,7849601260,-843025161,-2900679396,547905446,2033118310,2377574743,2125537278,3148160640,3152253752,5052287211,79133559,702106775,3267175975,-153409659,-541596954,4774558185,7529680909,1459735674,-2884124371,777428092,4615448181,613133603,3470457066,1258208963,2339402345,-2026821722,-5510829818,3823532764,8398936874,563729334,3263316728,5995401770,8732982655,-2898782733,-6702289872,1113216162,2560368062,1863172055,1831051827,1297992349,1949797393,1259765923,447481573,1030730307,2401589215,2421316028,1886419415,1614703894,2431118370,1502593993,1082397401,663590431,1943723738,548478000,947818272,817809462,2244105638,-707240411,-1186638898,994891047,1000667809,990677699,1211798288,399641573,1214631915,-3046898145,-2157628030,1726290465,2491240025,3024905743,1143501103,2060594023,3395933213,3899949731,3073663297,1653181613,3791444600,3778016033,1607611656,2343339377,6135560091,4118126625,5806279656,164423942,1429010510,440913849,-1920432166,-1108732196,511916719,-2726063023,-4708389282,1734079838,2792666375,2390245722,527775497,12015066,3661733822,-2993374314,-547773628,1949501992,3476026537,3857812883,4917125704,2614778639,1822458031,3553376610,2290821846,1799423993,3889703156,3295187116,4563966507,2253072382,2796824219,580738537,562261383,2179312707,4865602555,4719097967,9155559060,1453410507,2341952684,1714847195,4146035007,2797088744,5494825187,3634632217,8749492860,-824066638,202889735,-6412612521,-1656694704,3563464882,3654201986,7573651914,6392603519,4519869986,2395018163,8635631016,5323215296,2761899593,4029535951,5745694701,4894428070,5048139688,5124134776,6786255522,6309486955,2069796385,3176656188,6978623499,8281404597,-749247462,-2855010488,164237412,-1260480191,3940646772,5165541294,8273363932,11514714920,1180953051,-533927134,-481426818,3150483355,2247672797,4680698874,1893483639,3427090706,3416948678,4886235479,1866237521,1270258249,2817483545,6544069889,2866560638,3562484265,3881925048,8580327814,1354994295,3013361694,1776665450,4170229496,-208215364,2121063822,1543663502,4863471146,-2887716900,-1785542748,2391777218,4423466266,1753598436,4275169232,897583366,6319802400,-4123274883,1045941906,2161233426,4807301523,1582991660,2705162935,4553798380,6796819274,3887558282,5262728031,2246597649,7828377906,1703644754,2154706948,5418926592,12127368987,2949968927,7739535919,-337065578,2319393099,-3811359594,-3519509340,-382903369,2461089508,-8195423319,-6750527108,2627756299,7161621454,609127805,3180122160,988468491,9503312006,-5452370016,4784171951,4292261840,7064543251,5792438031,7883454386,6963509027,8748413153,6843131836,6887041091,4378117264,8846408490,6112748087,8358008620,6662734690,13520230719,4767008596,9610042618,5465268852,9824410025,6747429245,12303677198,5567309025,8915283977,2237079666,5944054580,6315364959,9944845144,7819055544,12304552770,4033468547,9099356345,-2911566222,5273522967,4611293080,6761342589,7772628191,9094752606,8247070080,9579563626,11501561991,11649749742,3962391201,9258020764,6340890114,9087664417,10266009331,15839245741,12110625015,18024279981,2934575023,6499205891,4419464097,9557501588,2690390977,3823058207,-4031746180,648946416,7034487790,13344895133,9466209097,18015372712,6010451585,9232029508,736694771,13245635240]],
        [[{"$rep":1000000000,"n":1048576},20],["pop"]]
      ] },
        solution: {
      approach: `<p>Standard SOS DP, O(n·2<sup>n</sup>).</p>`,
      code: `
        class Solution {
            public long[] sumOverSubmasks(long[] A, int n) {
                long[] F = A.clone();
                for (int bit = 0; bit < n; bit++)
                    for (int mask = 0; mask < (1 << n); mask++)
                        if ((mask & (1 << bit)) != 0) F[mask] += F[mask ^ (1 << bit)];
                return F;
            }
        }`,
      alt: [{ lang: 'python', code: `def sum_over_submasks(A, n):
    F = A[:]
    for bit in range(n):
        step = 1 << bit
        for base in range(0, 1 << n, 2 * step):          # upper half of each block has the bit set
            lo = F[base:base + step]
            hi = F[base + step:base + 2 * step]
            F[base + step:base + 2 * step] = [h + l for h, l in zip(hi, lo)]
    return F` }, { lang: 'js', code: `function sumOverSubmasks(A, n) {
  const F = Float64Array.from(A, Number);          // sums stay below 2^53 (about 1e15)
  for (let bit = 0; bit < n; bit++)
    for (let mask = 0; mask < (1 << n); mask++)
      if (mask & (1 << bit)) F[mask] += F[mask ^ (1 << bit)];
  return F;
}` }, { lang: 'cpp', code: `vector<long long> sumOverSubmasks(vector<long long>& A, int n) {
    vector<long long> F = A;
    for (int bit = 0; bit < n; bit++)
        for (int mask = 0; mask < (1 << n); mask++)
            if (mask >> bit & 1) F[mask] += F[mask ^ (1 << bit)];
    return F;
}` }],
      complexity: `<p>O(n · 2<sup>n</sup>) ≈ 2·10<sup>7</sup> for n = 20; O(2<sup>n</sup>) space.</p>`,
      followUps: ['Supersets instead of subsets.', 'Recover A from F (Möbius inverse: same loops with −=).']
    }
  });

  // =====================================================================
  // PRACTICE — Medium
  // =====================================================================
  practice.push({
    title: 'Partition to K Equal Sum Subsets',
    level: 'Medium', tags: ['bitmask dp', 'backtracking'], companies: ['LinkedIn', 'Amazon', 'Meta'],
    statement: `<p>Given an integer array <code>nums</code> and an integer <code>k</code>, return <code>true</code> if it can be divided into <code>k</code> non-empty subsets with equal sums.</p>`,
    constraints: `1 ≤ k ≤ n ≤ 16, 1 ≤ nums[i] ≤ 10<sup>4</sup>`,
    example: `<p>nums = [4, 3, 2, 3, 5, 2, 1], k = 4 → <b>true</b>: ${H.c('g', '(5), (1, 4), (2, 3), (2, 3)')} each sum to 5.</p>`,
    brute: { why: `<p>Assign every number to one of k buckets: k<sup>n</sup> = 4<sup>16</sup> ≈ 4·10<sup>9</sup> in the worst case. Waste: the order in which buckets were filled doesn't matter, only <i>which</i> numbers are used.</p>`, code: `
      boolean bruteK(int[] nums, int k) {
          int sum = 0;
          for (int x : nums) sum += x;
          if (sum % k != 0) return false;
          return place(nums, 0, new int[k], sum / k);
      }
      boolean place(int[] nums, int i, int[] bucket, int target) {
          if (i == nums.length) {
              for (int b : bucket) if (b != target) return false;
              return true;
          }
          for (int b = 0; b < bucket.length; b++) {
              if (bucket[b] + nums[i] > target) continue;
              bucket[b] += nums[i];
              if (place(nums, i + 1, bucket, target)) return true;
              bucket[b] -= nums[i];
          }
          return false;
      }` },
    mcq: { q: 'Why is dp[mask] = (sum of mask) mod target enough as the state?', options: ['Full buckets are interchangeable; only the fill level of the current bucket matters', 'Because k ≤ 16', 'Because numbers are positive', 'It is not enough'], answer: 0, explain: 'Fill buckets one at a time. Completed buckets are all equal, so the only live information is which items are used (the mask) and how full the open bucket is — which is determined by the mask\'s sum mod target.' },
    hints: [`<p><b>Aha:</b> fill buckets one after another. A used-set (mask) determines the total used; the current bucket's level is that total mod target.</p>`, `<p>dp[mask] = reachable? (store the level, −1 if unreachable). From a reachable mask add any unused number that still fits in the current bucket.</p>`, `<p>Pre-checks: sum % k ≠ 0 → false; any number &gt; target → false. Answer: dp[full] reachable. 2<sup>16</sup> · 16 ≈ 10<sup>6</sup> steps.</p>`],
    tests: { sig: "int[] int -> bool", fn: "canPartitionKSubsets", cases: [
        [[[4,3,2,3,5,2,1],4],true],
        [[[1,2,3,4],3],false],
        [[[2,2,2,2,3,4,5],4],false],
        [[[7],1],true],
        [[[1,1],2],true],
        [[[1,2,3],1],true],
        [[[10000,10000,10000],2],false],
        [[[5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],4],true],
        [[[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],3],false],
        [[[10,10,10,7,7,7,7,7,7,6,6,6],3],true],
        [[[6,6,12,3,7,11,2,2,12,4],3],false],
        [[[9,3,7,5,3,7,12,7,7],5],false],
        [[[5,6,7,11],2],false],
        [[[4,3,3,11],3],false],
        [[[3,1,5,12,3,5,6,9,3,8],5],false],
        [[[8,7,9,12,2,4,3,5,4],3],true],
        [[[4,5,5,7,7,10],4],false],
        [[[11,8,3,11,3,10,1,7],5],false],
        [[[3,4,2,3,4,6,5,5,5,2,1,2],3],true],
        [[[3,13,4,7,9,7,3,10,6,2,6,2,2,1,2,3],4],true],
        [[[2,5,2,1,4,1,6,1,5,1,7,3,2,2,3],5],true],
        [[[3,1,6,1,7,16,1,9,5,1,1,1,5,1,1,1],2],true],
        [[{"$rep":10000,"n":16},16],true],
        [[{"$rep":10000,"n":16},8],true],
        [[{"$rep":10000,"n":16},3],false],
        [[{"$concat":[{"$rep":10000,"n":15},[9999]]},2],false],
        [[[3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,6],5],false],
        [[[9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,8],4],false]
      ] },
        solution: {
      approach: `<p>Bitmask DP over used items, iterating masks in increasing order.</p>`,
      code: `
        class Solution {
            public boolean canPartitionKSubsets(int[] nums, int k) {
                int sum = 0;
                for (int x : nums) sum += x;
                if (sum % k != 0) return false;
                int target = sum / k, n = nums.length;
                int[] level = new int[1 << n];         // fill of the open bucket, -1 = unreachable
                Arrays.fill(level, -1);
                level[0] = 0;
                for (int mask = 0; mask < (1 << n); mask++) {
                    if (level[mask] == -1) continue;
                    for (int i = 0; i < n; i++) {
                        if ((mask >> i & 1) == 1) continue;              // already used
                        if (level[mask] + nums[i] > target) continue;    // would overflow the bucket
                        int next = mask | (1 << i);
                        if (level[next] == -1) level[next] = (level[mask] + nums[i]) % target;
                    }
                }
                return level[(1 << n) - 1] != -1;
            }
        }`,
      alt: [{ lang: 'python', code: `def can_partition_k_subsets(nums, k):
    total = sum(nums)
    if total % k:
        return False
    target, n = total // k, len(nums)
    level = [-1] * (1 << n)                  # fill of the open bucket, -1 = unreachable
    level[0] = 0
    for mask in range(1 << n):
        if level[mask] == -1:
            continue
        for i in range(n):
            if mask >> i & 1 or level[mask] + nums[i] > target:
                continue                     # already used, or would overflow the bucket
            nxt = mask | 1 << i
            if level[nxt] == -1:
                level[nxt] = (level[mask] + nums[i]) % target
    return level[-1] != -1` }, { lang: 'js', code: `function canPartitionKSubsets(nums, k) {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % k !== 0) return false;
  const target = total / k, n = nums.length;
  const level = new Int32Array(1 << n).fill(-1);   // fill of the open bucket, -1 = unreachable
  level[0] = 0;
  for (let mask = 0; mask < (1 << n); mask++) {
    if (level[mask] === -1) continue;
    for (let i = 0; i < n; i++) {
      if ((mask >> i & 1) || level[mask] + nums[i] > target) continue;   // used, or bucket overflow
      const next = mask | 1 << i;
      if (level[next] === -1) level[next] = (level[mask] + nums[i]) % target;
    }
  }
  return level[(1 << n) - 1] !== -1;
}` }, { lang: 'cpp', code: `bool canPartitionKSubsets(vector<int>& nums, int k) {
    int total = accumulate(nums.begin(), nums.end(), 0);
    if (total % k) return false;
    int target = total / k, n = nums.size();
    vector<int> level(1 << n, -1);                 // fill of the open bucket, -1 = unreachable
    level[0] = 0;
    for (int mask = 0; mask < (1 << n); mask++) {
        if (level[mask] == -1) continue;
        for (int i = 0; i < n; i++) {
            if ((mask >> i & 1) || level[mask] + nums[i] > target) continue;   // used, or bucket overflow
            int next = mask | 1 << i;
            if (level[next] == -1) level[next] = (level[mask] + nums[i]) % target;
        }
    }
    return level[(1 << n) - 1] != -1;
}` }],
      complexity: `<p>O(2<sup>n</sup> · n) time, O(2<sup>n</sup>) space.</p>`,
      followUps: ['Return the actual subsets (store parent masks).', 'Matchsticks to Square (LC 473) is k = 4.']
    }
  });

  practice.push({
    title: 'Numbers At Most N Given Digit Set',
    level: 'Medium', tags: ['digit dp', 'math'], companies: ['Google', 'Amazon'],
    statement: `<p>Given a sorted array of distinct digit strings <code>digits</code> (from '1' to '9'), you can write numbers using these digits as many times as you like. Return how many positive integers you can write that are <b>≤ n</b>.</p>`,
    constraints: `1 ≤ digits.length ≤ 9, 1 ≤ n ≤ 10<sup>9</sup>`,
    example: `<p>digits = ["1", "3", "5", "7"], n = 100 → <b>20</b>: 4 one-digit numbers + 16 two-digit numbers (11, 13, …, 77). No 3-digit number made of these digits is ≤ 100.</p>`,
    brute: { why: `<p>Generate every number from the digit set by DFS until it exceeds n — up to D<sup>9</sup> ≈ 3.9·10<sup>8</sup> numbers for 9 digits. Waste: once a prefix is smaller than n's prefix, all completions are valid and can be counted with a power.</p>`, code: `
      int bruteDigitSet(String[] digits, int n) {
          return gen(digits, 0L, n);
      }
      int gen(String[] digits, long cur, int n) {
          int count = 0;
          for (String d : digits) {
              long next = cur * 10 + (d.charAt(0) - '0');     // digits are 1..9, so next > cur
              if (next <= n) count += 1 + gen(digits, next, n);
          }
          return count;
      }` },
    mcq: { q: 'n = 3245, digits {1, 2, 4}. The first digit 1 or 2 is chosen. How many completions of length 4?', options: ['3<sup>3</sup> each', '4<sup>3</sup> each', '3<sup>4</sup> each', 'Depends on n\'s remaining digits'], answer: 0, explain: '1 and 2 are smaller than 3, so we are free: each of the 3 remaining positions can be any of the 3 digits → 27 numbers each.' },
    hints: [`<p><b>Aha:</b> numbers shorter than n are always fine: Σ D<sup>len</sup> for len &lt; L.</p>`, `<p>For length L, walk n's digits left to right (the tight path): a smaller allowed digit frees the rest (D<sup>remaining</sup>); an equal digit keeps you tight; if no equal digit exists, stop.</p>`, `<p>If you stay tight through all digits, n itself is writable → +1. Example n = 100: the first digit 1 equals → tight; second digit 0: no allowed digit ≤ 0 → stop.</p>`],
    tests: { sig: "string[] int -> int", fn: "atMostNGivenDigitSet", cases: [
        [[["1","3","5","7"],100],20],
        [[["1","4","9"],1000000000],29523],
        [[["7"],8],1],
        [[["7"],7],1],
        [[["7"],6],0],
        [[["3","4","5","6"],64],18],
        [[["1","2","3","4","5","6","7","8","9"],1],1],
        [[["5"],55555],5],
        [[["2","5","8"],258],18],
        [[["2","5","8"],259],18],
        [[["2","5","8"],1],0],
        [[["1","2"],1000000],126],
        [[["3","6","9"],999999],1092],
        [[["1","9"],100],6],
        [[["8"],2471048],6],
        [[["2","3","5","6","7"],3005320],35155],
        [[["2","5","6","9"],3283701],9556],
        [[["3","9"],3871813],158],
        [[["1","2","3","4","5","6","7","8","9"],1000000000],435848049],
        [[["1","2","3","4","5","6","7","8","9"],999999999],435848049],
        [[["9"],1000000000],9],
        [[["1"],1000000000],9],
        [[["1","2"],1000000000],1022]
      ] },
        solution: {
      approach: `<p>Digit DP collapsed to a single tight walk plus powers for the free branches.</p>`,
      code: `
        class Solution {
            public int atMostNGivenDigitSet(String[] digits, int n) {
                String s = String.valueOf(n);
                int L = s.length(), D = digits.length, ans = 0;
                for (int len = 1; len < L; len++) ans += pow(D, len);      // all shorter numbers
                for (int i = 0; i < L; i++) {
                    boolean canStayTight = false;
                    for (String dg : digits) {
                        char c = dg.charAt(0);
                        if (c < s.charAt(i)) ans += pow(D, L - i - 1);     // smaller → rest is free
                        else if (c == s.charAt(i)) canStayTight = true;
                    }
                    if (!canStayTight) return ans;                         // tight path dies here
                }
                return ans + 1;                                             // n itself
            }
            private int pow(int b, int e) { int r = 1; while (e-- > 0) r *= b; return r; }
        }`,
      alt: [{ lang: 'python', code: `def at_most_n_given_digit_set(digits, n):
    s = str(n)
    L, D = len(s), len(digits)
    ans = sum(D ** length for length in range(1, L))      # all shorter numbers
    for i, ch in enumerate(s):
        stay_tight = False
        for dg in digits:
            if dg < ch:
                ans += D ** (L - i - 1)                    # smaller digit -> the rest is free
            elif dg == ch:
                stay_tight = True
        if not stay_tight:                                 # the tight path dies here
            return ans
    return ans + 1                                         # n itself can be written` }, { lang: 'js', code: `function atMostNGivenDigitSet(digits, n) {
  const s = String(n);
  const L = s.length, D = digits.length;
  let ans = 0;
  for (let len = 1; len < L; len++) ans += D ** len;       // all shorter numbers
  for (let i = 0; i < L; i++) {
    let stayTight = false;
    for (const dg of digits) {
      if (dg < s[i]) ans += D ** (L - i - 1);              // smaller digit -> the rest is free
      else if (dg === s[i]) stayTight = true;
    }
    if (!stayTight) return ans;                            // the tight path dies here
  }
  return ans + 1;                                          // n itself can be written
}` }, { lang: 'cpp', code: `int atMostNGivenDigitSet(vector<string>& digits, int n) {
    string s = to_string(n);
    int L = s.size(), D = digits.size(), ans = 0;
    auto power = [](int b, int e) { int r = 1; while (e--) r *= b; return r; };
    for (int len = 1; len < L; len++) ans += power(D, len);        // all shorter numbers
    for (int i = 0; i < L; i++) {
        bool stayTight = false;
        for (const string& dg : digits) {
            if (dg[0] < s[i]) ans += power(D, L - i - 1);          // smaller digit -> the rest is free
            else if (dg[0] == s[i]) stayTight = true;
        }
        if (!stayTight) return ans;                                // the tight path dies here
    }
    return ans + 1;                                                // n itself can be written
}` }],
      dry: { head: ['step', 'detail', 'ans'], rows: [['shorter', 'len 1: 4, len 2: 16', '20'], ['i = 0 (digit 1)', 'no digit &lt; 1; "1" equals → stay tight', '20'], ['i = 1 (digit 0)', 'no digit ≤ 0 → stop', '<span class="c-g">20</span>']] },
      complexity: `<p>O(L · D) where L ≤ 10.</p>`,
      followUps: ['Digits may include 0 → leading-zero handling with a started flag.', 'Count in [L, R] → f(R) − f(L − 1).']
    }
  });

  practice.push({
    title: 'Soup Servings',
    level: 'Medium', tags: ['probability dp', 'memoization', 'math'], companies: ['Google'],
    statement: `<p>Two soups A and B start with <code>n</code> ml each. Each turn, one of four operations is chosen with probability 0.25: serve (100 A, 0 B), (75, 25), (50, 50), (25, 75). If a soup has less than requested, serve what remains. Stop when either soup is empty. Return P(A empties first) + ½·P(both empty at the same time).</p>`,
    constraints: `0 ≤ n ≤ 10<sup>9</sup>. Answers within 10<sup>−5</sup> accepted.`,
    example: `<p>n = 50 → <b>0.625</b>. The first two operations empty A first (prob 0.5 → counts 1 each), the third empties both at once (0.25 × ½), the fourth empties B first (0). 0.25 + 0.25 + 0.125 = 0.625.</p>`,
    brute: { why: `<p>Plain recursion without memo branches 4 ways per turn: about 4<sup>n/25</sup> calls — explodes for n = 1000. And n = 10<sup>9</sup> would need 4·10<sup>7</sup> × 4·10<sup>7</sup> states even with memo. Waste: (a, b) states repeat; and for big n the answer converges to 1.</p>`, code: `
      double bruteSoup(int a, int b) {                 // a, b in units of 25 ml
          if (a <= 0 && b <= 0) return 0.5;
          if (a <= 0) return 1.0;
          if (b <= 0) return 0.0;
          return 0.25 * (bruteSoup(a - 4, b) + bruteSoup(a - 3, b - 1)
                       + bruteSoup(a - 2, b - 2) + bruteSoup(a - 1, b - 3));
      }` },
    mcq: { q: 'Why can we return 1.0 when n is large (≈ 4800+)?', options: ['A is served 2.5 units on average vs 1.5 for B, so A almost surely empties first and the answer is within 10<sup>−5</sup> of 1', 'Because the DP overflows', 'Because both soups always empty together', 'It is a LeetCode rule'], answer: 0, explain: 'The expected serving per turn is 62.5 ml of A vs 37.5 ml of B. As n grows, the probability mass shifts to "A first", and numerically it is within 10<sup>−5</sup> of 1 once n exceeds about 4800.' },
    hints: [`<p><b>Aha:</b> divide by 25 (round up) so moves become (4,0), (3,1), (2,2), (1,3). State (a, b) with memo.</p>`, `<p>Base cases: both ≤ 0 → 0.5; only a ≤ 0 → 1; only b ≤ 0 → 0. Otherwise average the four children.</p>`, `<p>For n &gt; 4800 return 1.0 (measure the threshold by printing the DP for growing n). States ≤ 193 × 193.</p>`],
    tests: { sig: "int -> double", fn: "soupServings", cmp: "float", cases: [
        [[0],0.5],
        [[1],0.625],
        [[25],0.625],
        [[50],0.625],
        [[100],0.71875],
        [[200],0.796875],
        [[500],0.916344165802002],
        [[660],0.9487833306193352],
        [[1000],0.9765650521094358],
        [[2000],0.9977163163248763],
        [[4000],0.9999719963014364],
        [[4799],0.999994994425816],
        [[4800],0.999994994425816],
        [[4801],0.9999953823152488],
        [[5000],0.9999967386599964],
        [[10000],0.9999999999159161],
        [[100000],1],
        [[1000000000],1]
      ] },
        solution: {
      approach: `<p>Probability DP (memoised recursion) on (A units, B units) plus a convergence cut-off.</p>`,
      code: `
        class Solution {
            public double soupServings(int n) {
                if (n > 4800) return 1.0;                  // converged within 1e-5
                int m = (n + 24) / 25;                     // ceil(n / 25)
                Double[][] memo = new Double[m + 1][m + 1];
                return go(m, m, memo);
            }
            private double go(int a, int b, Double[][] memo) {
                if (a <= 0 && b <= 0) return 0.5;
                if (a <= 0) return 1.0;
                if (b <= 0) return 0.0;
                if (memo[a][b] != null) return memo[a][b];
                double r = 0.25 * (go(a - 4, b, memo) + go(a - 3, b - 1, memo)
                                 + go(a - 2, b - 2, memo) + go(a - 1, b - 3, memo));
                memo[a][b] = r;
                return r;
            }
        }`,
      alt: [{ lang: 'python', code: `from functools import lru_cache

def soup_servings(n):
    if n > 4800:
        return 1.0                               # converged within 1e-5
    m = (n + 24) // 25                           # ceil(n / 25)

    @lru_cache(maxsize=None)
    def go(a, b):
        if a <= 0 and b <= 0:
            return 0.5
        if a <= 0:
            return 1.0
        if b <= 0:
            return 0.0
        return 0.25 * (go(a - 4, b) + go(a - 3, b - 1) + go(a - 2, b - 2) + go(a - 1, b - 3))

    return go(m, m)` }, { lang: 'js', code: `function soupServings(n) {
  if (n > 4800) return 1.0;                        // converged within 1e-5
  const m = Math.ceil(n / 25);
  const memo = new Map();
  function go(a, b) {
    if (a <= 0 && b <= 0) return 0.5;
    if (a <= 0) return 1.0;
    if (b <= 0) return 0.0;
    const key = a * 1000 + b;
    if (memo.has(key)) return memo.get(key);
    const r = 0.25 * (go(a - 4, b) + go(a - 3, b - 1) + go(a - 2, b - 2) + go(a - 1, b - 3));
    memo.set(key, r);
    return r;
  }
  return go(m, m);
}` }, { lang: 'cpp', code: `class Solution {
    vector<vector<double>> memo;

    double go(int a, int b) {
        if (a <= 0 && b <= 0) return 0.5;
        if (a <= 0) return 1.0;
        if (b <= 0) return 0.0;
        double& r = memo[a][b];
        if (r >= 0) return r;                       // already computed
        return r = 0.25 * (go(a - 4, b) + go(a - 3, b - 1) + go(a - 2, b - 2) + go(a - 1, b - 3));
    }

public:
    double soupServings(int n) {
        if (n > 4800) return 1.0;                   // converged within 1e-5
        int m = (n + 24) / 25;                      // ceil(n / 25)
        memo.assign(m + 1, vector<double>(m + 1, -1.0));
        return go(m, m);
    }
};` }],
      complexity: `<p>O(m²) with m ≤ 192 → ~37 000 states, each O(1).</p>`,
      followUps: ['How would you choose the cut-off rigorously? (Increase n until the DP value exceeds 1 − 10<sup>−6</sup>.)', 'Return the exact probability as a fraction mod p.']
    }
  });

  practice.push({
    title: 'New 21 Game',
    level: 'Medium', tags: ['probability dp', 'sliding window'], companies: ['Google', 'Amazon'],
    statement: `<p>Alice starts with 0 points and draws while she has <b>fewer than</b> <code>k</code> points. Each draw adds a uniform random integer in <code>[1, maxPts]</code>. Return the probability that she finishes with <b>≤ n</b> points.</p>`,
    constraints: `0 ≤ k ≤ n ≤ 10<sup>4</sup>, 1 ≤ maxPts ≤ 10<sup>4</sup>`,
    example: `<p>n = 6, k = 1, maxPts = 10 → <b>0.6</b>: she draws once; 6 of the 10 outcomes are ≤ 6. n = 21, k = 17, maxPts = 10 → ≈ <b>0.73278</b>.</p>`,
    brute: { why: `<p>dp[i] = (1/maxPts) · Σ dp[i − d] for d = 1..maxPts, only over i − d &lt; k: O(n · maxPts) = 10<sup>8</sup>. The waste: consecutive sums share maxPts − 1 terms.</p>`, code: `
      double bruteNew21(int n, int k, int maxPts) {
          if (k == 0) return 1.0;
          double[] dp = new double[n + 1];
          dp[0] = 1.0;
          double ans = 0;
          for (int i = 1; i <= n; i++) {
              for (int d = 1; d <= maxPts; d++) {
                  int from = i - d;
                  if (from >= 0 && from < k) dp[i] += dp[from] / maxPts;   // only draw while < k
              }
              if (i >= k) ans += dp[i];
          }
          return ans;
      }` },
    mcq: { q: 'dp[i] = probability of ever having exactly i points. Which previous states contribute to dp[i]?', options: ['dp[j] for i − maxPts ≤ j ≤ i − 1 and j &lt; k', 'All dp[j] with j &lt; i', 'Only dp[i − 1]', 'dp[j] for j ≥ k'], answer: 0, explain: 'She reaches i from j by drawing i − j ∈ [1, maxPts], and she only draws when j &lt; k.' },
    hints: [`<p><b>Aha:</b> dp[i] = windowSum / maxPts where windowSum = Σ dp[j] over the last maxPts j's that are still &lt; k.</p>`, `<p>Maintain the window sum: add dp[i] if i &lt; k (it can still draw), subtract dp[i − maxPts] when it leaves the window (if it was &lt; k).</p>`, `<p>Shortcut: k = 0 or n ≥ k − 1 + maxPts → answer 1.0. Answer = Σ dp[i] for k ≤ i ≤ n.</p>`],
    tests: { sig: "int int int -> double", fn: "new21Game", cmp: "float", cases: [
        [[10,1,10],1],
        [[6,1,10],0.6],
        [[21,17,10],0.73278],
        [[0,0,1],1],
        [[1,1,1],1],
        [[1,0,1],1],
        [[5,5,5],0.41472000000000003],
        [[10,5,3],0.9999999999999999],
        [[20,10,1],1],
        [[100,100,10],0.1818181815561093],
        [[21,10,10],0.9999999999999999],
        [[2,2,5],0.24000000000000002],
        [[50,40,8],1.0000000000000002],
        [[10000,10000,10000],0.00027178741394112704],
        [[10000,5000,3000],1.0000000000000016],
        [[10000,9990,1],1],
        [[10000,1,10000],0.9999999999999062],
        [[10000,10000,1],1],
        [[9999,5000,5000],1.0000000000000024]
      ] },
        solution: {
      approach: `<p>Probability DP with a sliding window sum — the "DP with a data structure" idea where the structure is just a running sum.</p>`,
      code: `
        class Solution {
            public double new21Game(int n, int k, int maxPts) {
                if (k == 0 || n >= k - 1 + maxPts) return 1.0;   // she can never exceed n
                double[] dp = new double[n + 1];
                dp[0] = 1.0;
                double windowSum = 1.0, ans = 0.0;
                for (int i = 1; i <= n; i++) {
                    dp[i] = windowSum / maxPts;
                    if (i < k) windowSum += dp[i];                 // i can still draw
                    else ans += dp[i];                             // i is a final score <= n
                    if (i - maxPts >= 0 && i - maxPts < k) windowSum -= dp[i - maxPts];
                }
                return ans;
            }
        }`,
      alt: [{ lang: 'python', code: `def new21_game(n, k, max_pts):
    if k == 0 or n >= k - 1 + max_pts:
        return 1.0                                  # she can never exceed n
    dp = [0.0] * (n + 1)
    dp[0] = 1.0
    window = 1.0                                    # sum of dp[i - max_pts .. i - 1] over scores below k
    ans = 0.0
    for i in range(1, n + 1):
        dp[i] = window / max_pts
        if i < k:
            window += dp[i]                         # i can still draw
        else:
            ans += dp[i]                            # i is a final score <= n
        if 0 <= i - max_pts < k:
            window -= dp[i - max_pts]
    return ans` }, { lang: 'js', code: `function new21Game(n, k, maxPts) {
  if (k === 0 || n >= k - 1 + maxPts) return 1.0;  // she can never exceed n
  const dp = new Float64Array(n + 1);
  dp[0] = 1;
  let window = 1, ans = 0;                         // window = sum of dp over scores below k that can reach i
  for (let i = 1; i <= n; i++) {
    dp[i] = window / maxPts;
    if (i < k) window += dp[i];                    // i can still draw
    else ans += dp[i];                             // i is a final score <= n
    if (i - maxPts >= 0 && i - maxPts < k) window -= dp[i - maxPts];
  }
  return ans;
}` }, { lang: 'cpp', code: `double new21Game(int n, int k, int maxPts) {
    if (k == 0 || n >= k - 1 + maxPts) return 1.0;   // she can never exceed n
    vector<double> dp(n + 1, 0.0);
    dp[0] = 1.0;
    double window = 1.0, ans = 0.0;                  // window = sum of dp over scores below k that can reach i
    for (int i = 1; i <= n; i++) {
        dp[i] = window / maxPts;
        if (i < k) window += dp[i];                  // i can still draw
        else ans += dp[i];                           // i is a final score <= n
        if (i - maxPts >= 0 && i - maxPts < k) window -= dp[i - maxPts];
    }
    return ans;
}` }],
      complexity: `<p>O(n) time, O(n) space.</p>`,
      followUps: ['Expected final score.', 'Probability she ends with exactly n points.']
    }
  });

  practice.push({
    title: 'Minimum XOR Sum of Two Arrays',
    level: 'Medium', tags: ['bitmask dp', 'assignment'], companies: ['Google', 'Amazon'],
    statement: `<p>Given two arrays <code>nums1</code> and <code>nums2</code> of length <code>n</code>, rearrange <code>nums2</code> to minimise <code>Σ (nums1[i] XOR nums2[i])</code>. Return the minimum sum.</p>`,
    constraints: `1 ≤ n ≤ 14, 0 ≤ nums[i] ≤ 10<sup>7</sup>`,
    example: `<p>nums1 = [1, 0, 3], nums2 = [5, 3, 4] → <b>8</b>: rearrange nums2 to [5, 4, 3]: (1⊕5) + (0⊕4) + (3⊕3) = 4 + 4 + 0 = 8.</p>`,
    brute: { why: `<p>Try all n! orders of nums2: 14! ≈ 8.7·10<sup>10</sup>. Waste: after matching the first i elements of nums1, only <i>which</i> nums2 elements are used matters.</p>`, code: `
      int bestX;
      int bruteXor(int[] a, int[] b) {
          bestX = Integer.MAX_VALUE;
          perm(a, b, 0, new boolean[b.length], 0);
          return bestX;
      }
      void perm(int[] a, int[] b, int i, boolean[] used, int sum) {
          if (i == a.length) { bestX = Math.min(bestX, sum); return; }
          for (int j = 0; j < b.length; j++) {
              if (used[j]) continue;
              used[j] = true;
              perm(a, b, i + 1, used, sum + (a[i] ^ b[j]));
              used[j] = false;
          }
      }` },
    mcq: { q: 'Which known problem is this in disguise?', options: ['Assignment problem with cost[i][j] = a[i] XOR b[j]', 'Travelling salesman', 'Knapsack', 'Longest common subsequence'], answer: 0, explain: 'Each nums1 index gets exactly one nums2 index — a perfect matching minimising total cost. Topic 1\'s dp[mask] with the popcount trick solves it in O(2<sup>n</sup>·n).' },
    hints: [`<p><b>Aha:</b> it's the worker–job assignment problem from topic 1.</p>`, `<p>dp[mask] = min sum after pairing nums1[0..popcount(mask)−1] with the nums2 elements in mask.</p>`, `<p>Recipe: dp[0] = 0; for mask ascending: i = bitCount(mask); for j not in mask: relax dp[mask | 1&lt;&lt;j] with dp[mask] + (nums1[i] ^ nums2[j]). Answer dp[full].</p>`],
    tests: { sig: "int[] int[] -> int", fn: "minimumXORSum", cases: [
        [[[1,2],[2,3]],2],
        [[[1,0,3],[5,3,4]],8],
        [[[5],[5]],0],
        [[[0],[10000000]],10000000],
        [[[0,0],[0,0]],0],
        [[[1,1,1],[2,2,2]],9],
        [[[3,7,1],[1,3,7]],0],
        [[[10000000,0],[0,10000000]],0],
        [[[5051373,2201913,475558,8683299,3875499,6513896,7614818],[818400,9149547,2445782,9755015,4076023,1815872,7266064]],22810853],
        [[[5683154,1584680,7184532],[5528442,1242166,3825799]],6653657],
        [[[5625429,491170,7487879,6765884,7562608,7752623,9555549,6277126],[7266492,5134195,1891116,9965310,6286357,7115987,7345450,3035691]],12888406],
        [[[532391,3503096,3971201,4649926,7041623,8246738,3971983,7850400],[453811,2275001,5783253,5611179,950830,1376121,67932,8324141]],18055254],
        [[[9431683,3489886,670515,4279462,5602541,965108,2740870,1060623,3032884,3354614,8393438,9114521,7541635,4969184],[9127729,6476467,8333605,336806,9882162,7094519,5098298,708391,3317044,9848725,3937673,2922296,4697370,358171]],15512822],
        [[[9758521,6931806,6736303,6617856,3570485,6504712,1979985,4038663,9983482,7882734,8512426,5840268,1938405,9232984],[6359748,4184841,457409,9194254,4560673,4324133,4063752,130388,8752225,861771,3966067,6534621,7920057,8944794]],24007857],
        [[[5721732,6939761,9414293,6220814,3876277,3236319,2916890,5377022,565062,1483866,5294185,7217314,5455620,9676097],[2925770,377523,7984880,3476750,1296702,3117377,3786292,8011070,8863349,82144,9844948,5387216,8502946,8019891]],31567910],
        [[[4722352,5036721,1627183,3327356,1562289,8107552,8087657,1817066,935080,912920,6289739,6479012,5213195,2036539],[2036539,5213195,6479012,6289739,912920,935080,1817066,8087657,8107552,1562289,3327356,1627183,5036721,4722352]],0],
        [[{"$rep":10000000,"n":14},{"$rep":0,"n":14}],140000000]
      ] },
        solution: {
      approach: `<p>Assignment bitmask DP, O(2<sup>n</sup>·n) = 2.3·10<sup>5</sup> for n = 14.</p>`,
      code: `
        class Solution {
            public int minimumXORSum(int[] nums1, int[] nums2) {
                int n = nums1.length;
                int[] dp = new int[1 << n];
                Arrays.fill(dp, Integer.MAX_VALUE);
                dp[0] = 0;
                for (int mask = 0; mask < (1 << n); mask++) {
                    if (dp[mask] == Integer.MAX_VALUE) continue;
                    int i = Integer.bitCount(mask);            // next nums1 index to pair
                    if (i == n) continue;
                    for (int j = 0; j < n; j++) {
                        if ((mask >> j & 1) == 1) continue;
                        int nm = mask | (1 << j);
                        dp[nm] = Math.min(dp[nm], dp[mask] + (nums1[i] ^ nums2[j]));
                    }
                }
                return dp[(1 << n) - 1];
            }
        }`,
      alt: [{ lang: 'python', code: `def minimum_xor_sum(nums1, nums2):
    n = len(nums1)
    INF = float('inf')
    dp = [INF] * (1 << n)
    dp[0] = 0
    for mask in range(1 << n):
        if dp[mask] == INF:
            continue
        i = bin(mask).count('1')                 # next nums1 index to pair
        if i == n:
            continue
        for j in range(n):
            if not mask >> j & 1:
                nm = mask | 1 << j
                dp[nm] = min(dp[nm], dp[mask] + (nums1[i] ^ nums2[j]))
    return dp[-1]` }, { lang: 'js', code: `function minimumXORSum(nums1, nums2) {
  const n = nums1.length;
  const dp = new Int32Array(1 << n).fill(0x7fffffff);
  dp[0] = 0;
  for (let mask = 0; mask < (1 << n); mask++) {
    if (dp[mask] === 0x7fffffff) continue;
    let i = 0;                                     // popcount = next nums1 index to pair
    for (let m = mask; m; m &= m - 1) i++;
    if (i === n) continue;
    for (let j = 0; j < n; j++) {
      if (mask >> j & 1) continue;
      const next = mask | 1 << j;
      dp[next] = Math.min(dp[next], dp[mask] + (nums1[i] ^ nums2[j]));
    }
  }
  return dp[(1 << n) - 1];
}` }, { lang: 'cpp', code: `int minimumXORSum(vector<int>& nums1, vector<int>& nums2) {
    int n = nums1.size();
    vector<int> dp(1 << n, INT_MAX);
    dp[0] = 0;
    for (int mask = 0; mask < (1 << n); mask++) {
        if (dp[mask] == INT_MAX) continue;
        int i = __builtin_popcount(mask);          // next nums1 index to pair
        if (i == n) continue;
        for (int j = 0; j < n; j++) {
            if (mask >> j & 1) continue;
            int next = mask | 1 << j;
            dp[next] = min(dp[next], dp[mask] + (nums1[i] ^ nums2[j]));
        }
    }
    return dp[(1 << n) - 1];
}` }],
      complexity: `<p>O(2<sup>n</sup> · n) time, O(2<sup>n</sup>) space.</p>`,
      followUps: ['n = 1000 → Hungarian algorithm.', 'Maximise instead of minimise → flip min to max.']
    }
  });

  // =====================================================================
  // PRACTICE — Hard
  // =====================================================================
  practice.push({
    title: 'Find the Shortest Superstring',
    level: 'Hard', tags: ['bitmask dp', 'tsp', 'strings'], companies: ['Google', 'Amazon', 'Illumina'],
    statement: `<p>Given an array of strings <code>words</code> (no word is a substring of another), return the <b>shortest</b> string that contains every word as a substring. If several exist, return any.</p>`,
    constraints: `1 ≤ words.length ≤ 12, 1 ≤ words[i].length ≤ 20, lowercase letters, all distinct`,
    example: `<p>words = ["catg", "ctaagt", "gcta", "ttca", "atgcatc"] → <b>"gctaagttcatgcatc"</b> (length 16). Overlaps: "gcta"+"ctaagt" share "cta", "ctaagt"+"ttca" share "t", "ttca"+"catg" share "ca", "catg"+"atgcatc" share "atg".</p>`,
    brute: { why: `<p>Try all n! orders and glue each with maximum overlaps: 12! ≈ 4.8·10<sup>8</sup> orders × n work. Waste: the best way to glue a <i>set</i> of words ending with word j is reused by many orders — that's TSP structure.</p>`, code: `
      String bestS;
      String bruteSuperstring(String[] words) {
          bestS = null;
          permute(words, new boolean[words.length], -1, "", 0);
          return bestS;
      }
      void permute(String[] w, boolean[] used, int last, String cur, int placed) {
          if (placed == w.length) {
              if (bestS == null || cur.length() < bestS.length()) bestS = cur;
              return;
          }
          for (int j = 0; j < w.length; j++) {
              if (used[j]) continue;
              int o = 0;
              if (last >= 0)
                  for (int len = Math.min(cur.length(), w[j].length()); len > 0; len--)
                      if (cur.endsWith(w[j].substring(0, len))) { o = len; break; }
              used[j] = true;
              permute(w, used, j, cur + w[j].substring(o), placed + 1);
              used[j] = false;
          }
      }` },
    mcq: { q: 'What plays the role of "distance" between word i and word j in the TSP view?', options: ['−overlap(i, j): the longer the overlap, the cheaper the step', 'The edit distance', 'The length of word j', 'The number of common letters'], answer: 0, explain: 'Appending j after i adds len(j) − overlap(i, j) characters. Minimising total length = maximising total overlap along a path (no return edge).' },
    hints: [`<p><b>Aha:</b> precompute overlap[i][j] = longest suffix of words[i] that is a prefix of words[j]. Then pick an order (a path) maximising the sum of overlaps — TSP without returning home.</p>`, `<p>dp[mask][j] = max total overlap for a path visiting mask and ending at j. Store parent[mask][j] to rebuild the order.</p>`, `<p>Start states dp[1&lt;&lt;i][i] = 0 for every i (any start). After the DP, pick the best last word, walk parents back, glue words skipping their overlaps.</p>`],
    tests: { sig: "string[] -> string", fn: "shortestSuperstring", check: "(args, out, expected) => typeof out === \"string\" && out.length === expected && args[0].every((w) => out.includes(w))", cases: [
        [[["catg","ctaagt","gcta","ttca","atgcatc"]],16],
        [[["alex","loves","leetcode"]],17],
        [[["abc"]],3],
        [[["abc","def"]],6],
        [[["ab","bc","cd"]],4],
        [[["abc","bcd","cde","def"]],6],
        [[["aab","abb","bba"]],5],
        [[["xyz","yzx","zxy"]],5],
        [[["ccca","bcbccc","cbacc","acba","cbbbac","aac","acabba"]],22],
        [[["baaccb","acbb","cabca"]],13],
        [[["caca","ccaabc","abaaac","cbab","abbaac","ccbbb","abbcc"]],28],
        [[["ababba","cac","bcba","cca","ccc","cabaca"]],18],
        [[["abaabbaaababaababa","ababbbaaaabaabaaaaab","ababababbbaaaaababaa","aabbababaaaabbbaa","babababbbaaababbaba","bababbbbabbbbabaa","aaaaabbbabbbbbababa","bbbbabbaaabaaaababaa","baabbbaaaabababaaba","bbabbabbbbababaab","abaababbbbbbbaaaa","babbaabaaaabbababa"]],176],
        [[["bbabaababbbbbbbaaba","bbaaabbbabaaabaabba","ababbabbbbabababa","aabaaaabbbabbabaa","bbabbaaaaabbaababa","aaababaaabbabbaab","bababababbaabbaabba","abbaabbbbbabbbaba","baaabbabbaaaabbbbbba","babbbbaaaabaabaab","babbbababbaababbaa","ababbababaabbbbabbab"]],169],
        [[["abbbbbaaaaaaaabba","baaaabbabbaaaaabaabb","baaaabbaaaabababb","bbbbbababbbaaaaab","baaaaabbaaabbbaba","babbbaaababbbbaab","aabbbaabaaabbababaa","abbaababbaabaaababa","ababaaabababbaabb","bbaabaababbbbaabbbaa","bbbaabbbbbbbababba","bbbababbaabaabbbb"]],161],
        [[["aaaaaaaaaaaaaaaaaaaa","bbbbbbbbbbbbbbbbbbbb","cccccccccccccccccccc","dddddddddddddddddddd","eeeeeeeeeeeeeeeeeeee","ffffffffffffffffffff","gggggggggggggggggggg","hhhhhhhhhhhhhhhhhhhh","iiiiiiiiiiiiiiiiiiii","jjjjjjjjjjjjjjjjjjjj","kkkkkkkkkkkkkkkkkkkk","llllllllllllllllllll"]],240]
      ] },
        solution: {
      approach: `<p>Held-Karp on overlaps (maximise) + path reconstruction. O(2<sup>n</sup>·n<sup>2</sup>) ≈ 5.9·10<sup>5</sup> for n = 12.</p>`,
      code: `
        class Solution {
            public String shortestSuperstring(String[] words) {
                int n = words.length, full = 1 << n;
                int[][] gain = new int[n][n];                 // overlap of words[i] followed by words[j]
                for (int i = 0; i < n; i++)
                    for (int j = 0; j < n; j++) if (i != j) {
                        int m = Math.min(words[i].length(), words[j].length());
                        for (int o = m; o >= 0; o--)
                            if (words[i].endsWith(words[j].substring(0, o))) { gain[i][j] = o; break; }
                    }
                int[][] dp = new int[full][n], parent = new int[full][n];
                for (int[] row : dp) Arrays.fill(row, -1);
                for (int[] row : parent) Arrays.fill(row, -1);
                for (int i = 0; i < n; i++) dp[1 << i][i] = 0;  // a path may start anywhere
                for (int mask = 1; mask < full; mask++)
                    for (int j = 0; j < n; j++) {
                        if (dp[mask][j] < 0) continue;
                        for (int k = 0; k < n; k++) {
                            if ((mask & (1 << k)) != 0) continue;
                            int nm = mask | (1 << k), v = dp[mask][j] + gain[j][k];
                            if (v > dp[nm][k]) { dp[nm][k] = v; parent[nm][k] = j; }
                        }
                    }
                int last = 0;
                for (int j = 1; j < n; j++) if (dp[full - 1][j] > dp[full - 1][last]) last = j;
                int[] order = new int[n];
                int mask = full - 1;
                for (int pos = n - 1; pos >= 0; pos--) {       // walk the parent pointers back
                    order[pos] = last;
                    int p = parent[mask][last];
                    mask ^= 1 << last;
                    last = p;
                }
                StringBuilder sb = new StringBuilder(words[order[0]]);
                for (int t = 1; t < n; t++)
                    sb.append(words[order[t]].substring(gain[order[t - 1]][order[t]]));
                return sb.toString();
            }
        }`,
      alt: [{ lang: 'python', code: `def shortest_superstring(words):
    n = len(words)
    full = 1 << n
    gain = [[0] * n for _ in range(n)]              # overlap of words[i] followed by words[j]
    for i in range(n):
        for j in range(n):
            if i != j:
                for o in range(min(len(words[i]), len(words[j])), 0, -1):
                    if words[i].endswith(words[j][:o]):
                        gain[i][j] = o
                        break
    dp = [[-1] * n for _ in range(full)]
    parent = [[-1] * n for _ in range(full)]
    for i in range(n):
        dp[1 << i][i] = 0                           # a path may start anywhere
    for mask in range(1, full):
        for j in range(n):
            if dp[mask][j] < 0:
                continue
            for k in range(n):
                if mask >> k & 1:
                    continue
                nm = mask | 1 << k
                v = dp[mask][j] + gain[j][k]
                if v > dp[nm][k]:
                    dp[nm][k] = v
                    parent[nm][k] = j
    last = max(range(n), key=lambda j: dp[full - 1][j])
    order, mask = [], full - 1
    while last != -1:                               # walk the parent pointers back
        order.append(last)
        prev = parent[mask][last]
        mask ^= 1 << last
        last = prev
    order.reverse()
    result = words[order[0]]
    for a, b in zip(order, order[1:]):
        result += words[b][gain[a][b]:]
    return result` }, { lang: 'js', code: `function shortestSuperstring(words) {
  const n = words.length, full = 1 << n;
  const gain = Array.from({ length: n }, () => new Array(n).fill(0));   // overlap of words[i] followed by words[j]
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      for (let o = Math.min(words[i].length, words[j].length); o > 0; o--)
        if (words[i].endsWith(words[j].slice(0, o))) { gain[i][j] = o; break; }
    }
  const dp = Array.from({ length: full }, () => new Int32Array(n).fill(-1));
  const parent = Array.from({ length: full }, () => new Int32Array(n).fill(-1));
  for (let i = 0; i < n; i++) dp[1 << i][i] = 0;   // a path may start anywhere
  for (let mask = 1; mask < full; mask++)
    for (let j = 0; j < n; j++) {
      if (dp[mask][j] < 0) continue;
      for (let k = 0; k < n; k++) {
        if (mask >> k & 1) continue;
        const nm = mask | 1 << k, v = dp[mask][j] + gain[j][k];
        if (v > dp[nm][k]) { dp[nm][k] = v; parent[nm][k] = j; }
      }
    }
  let last = 0;
  for (let j = 1; j < n; j++) if (dp[full - 1][j] > dp[full - 1][last]) last = j;
  const order = [];
  for (let mask = full - 1; last !== -1;) {        // walk the parent pointers back
    order.push(last);
    const prev = parent[mask][last];
    mask ^= 1 << last;
    last = prev;
  }
  order.reverse();
  let result = words[order[0]];
  for (let t = 1; t < n; t++) result += words[order[t]].slice(gain[order[t - 1]][order[t]]);
  return result;
}` }, { lang: 'cpp', code: `string shortestSuperstring(vector<string>& words) {
    int n = words.size(), full = 1 << n;
    vector<vector<int>> gain(n, vector<int>(n, 0));     // overlap of words[i] followed by words[j]
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) {
            if (i == j) continue;
            int m = min(words[i].size(), words[j].size());
            for (int o = m; o > 0; o--)
                if (words[i].compare(words[i].size() - o, o, words[j], 0, o) == 0) { gain[i][j] = o; break; }
        }
    vector<vector<int>> dp(full, vector<int>(n, -1)), parent(full, vector<int>(n, -1));
    for (int i = 0; i < n; i++) dp[1 << i][i] = 0;      // a path may start anywhere
    for (int mask = 1; mask < full; mask++)
        for (int j = 0; j < n; j++) {
            if (dp[mask][j] < 0) continue;
            for (int k = 0; k < n; k++) {
                if (mask >> k & 1) continue;
                int nm = mask | 1 << k, v = dp[mask][j] + gain[j][k];
                if (v > dp[nm][k]) { dp[nm][k] = v; parent[nm][k] = j; }
            }
        }
    int last = max_element(dp[full - 1].begin(), dp[full - 1].end()) - dp[full - 1].begin();
    vector<int> order;
    for (int mask = full - 1; last != -1;) {            // walk the parent pointers back
        order.push_back(last);
        int prev = parent[mask][last];
        mask ^= 1 << last;
        last = prev;
    }
    reverse(order.begin(), order.end());
    string result = words[order[0]];
    for (int t = 1; t < n; t++) result += words[order[t]].substr(gain[order[t - 1]][order[t]]);
    return result;
}` }],
      complexity: `<p>O(n<sup>2</sup>·L<sup>2</sup>) for overlaps + O(2<sup>n</sup>·n<sup>2</sup>) DP; O(2<sup>n</sup>·n) memory.</p>`,
      followUps: ['Words may be substrings of others → first delete contained words.', 'n = 1000 (DNA assembly) → greedy merging (conjectured 2-approximation, proven within 3.5) or overlap graphs/de Bruijn graphs.']
    }
  });

  practice.push({
    title: 'Numbers With Repeated Digits',
    level: 'Hard', tags: ['digit dp', 'bitmask'], companies: ['Google', 'Amazon'],
    statement: `<p>Given <code>n</code>, return how many positive integers in <code>[1, n]</code> have <b>at least one repeated digit</b>.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>9</sup>`,
    example: `<p>n = 20 → <b>1</b> (only ${H.c('r', '11')}). n = 100 → <b>10</b> (11, 22, …, 99 and 100). n = 1000 → <b>262</b>.</p>`,
    brute: { why: `<p>Loop 1..n and check digits with a 10-slot seen array: 10<sup>9</sup> × ~10 operations — about 10 seconds or more even in a compiled language, far worse in Python. Waste: digit states repeat massively.</p>`, code: `
      int bruteRepeated(int n) {
          int count = 0;
          for (int x = 1; x <= n; x++) {
              boolean[] seen = new boolean[10];
              for (int t = x; t > 0; t /= 10) {
                  if (seen[t % 10]) { count++; break; }
                  seen[t % 10] = true;
              }
          }
          return count;
      }` },
    mcq: { q: 'What extra state does this digit DP need compared with a "digit sum" DP?', options: ['A 10-bit mask of used digits, plus a started flag for leading zeros', 'Only the last digit', 'The digit sum mod 10', 'Nothing extra'], answer: 0, explain: 'Distinctness depends on which digits were already used (mask). Leading zeros must not mark 0 as used, so we track whether the number has started.' },
    hints: [`<p><b>Aha:</b> complement counting: answer = n − (numbers in [1, n] with all distinct digits).</p>`, `<p>Digit DP state (pos, usedMask, tight, started). Skip a digit already in the mask once started. Memoise free and started states.</p>`, `<p>The DP counts 0 too (all-leading-zeros path) → subtract 1. Check: n = 20 → 20 distinct-digit numbers in [0, 20] minus 11 → 21 − 1 = 20 with 0 → distinct count in [1,20] = 19 → answer 1.</p>`],
    tests: { sig: "int -> int", fn: "numDupDigitsAtMostN", cases: [
        [[1],0],
        [[9],0],
        [[10],0],
        [[11],1],
        [[20],1],
        [[99],9],
        [[100],10],
        [[101],11],
        [[1000],262],
        [[5000],2246],
        [[9999],4725],
        [[10000],4726],
        [[12345],6685],
        [[99999],67509],
        [[100000],67510],
        [[987654],819084],
        [[1000000],831430],
        [[5000000],4589510],
        [[9876543],9163653],
        [[10000000],9287110],
        [[100000000],97654150],
        [[123456789],121064705],
        [[987654321],982042551],
        [[999999999],994388229],
        [[1000000000],994388230],
        [[876543210],871340553],
        [[102030405],99684555]
      ] },
        solution: {
      approach: `<p>Digit DP over distinct-digit numbers with a used-digit bitmask, then complement.</p>`,
      code: `
        class Solution {
            char[] d; Integer[][] memo;

            public int numDupDigitsAtMostN(int n) {
                d = String.valueOf(n).toCharArray();
                memo = new Integer[d.length][1 << 10];
                int distinctInclZero = go(0, 0, true, false);  // counts 0..n with distinct digits
                return n - (distinctInclZero - 1);              // remove the number 0
            }

            private int go(int pos, int mask, boolean tight, boolean started) {
                if (pos == d.length) return 1;
                if (!tight && started && memo[pos][mask] != null) return memo[pos][mask];
                int limit = tight ? d[pos] - '0' : 9, res = 0;
                for (int dig = 0; dig <= limit; dig++) {
                    if (started || dig != 0) {
                        if ((mask & (1 << dig)) != 0) continue;   // digit already used
                        res += go(pos + 1, mask | (1 << dig), tight && dig == limit, true);
                    } else {
                        res += go(pos + 1, mask, tight && dig == limit, false); // still leading zeros
                    }
                }
                if (!tight && started) memo[pos][mask] = res;
                return res;
            }
        }`,
      alt: [{ lang: 'python', code: `from functools import lru_cache

def num_dup_digits_at_most_n(n):
    d = list(map(int, str(n)))

    @lru_cache(maxsize=None)
    def go(pos, mask, tight, started):
        if pos == len(d):
            return 1
        limit = d[pos] if tight else 9
        res = 0
        for dig in range(limit + 1):
            nt = tight and dig == limit
            if started or dig:
                if mask >> dig & 1:
                    continue                          # digit already used
                res += go(pos + 1, mask | 1 << dig, nt, True)
            else:
                res += go(pos + 1, mask, nt, False)   # still leading zeros
        return res

    distinct_incl_zero = go(0, 0, True, False)        # counts 0..n with distinct digits
    return n - (distinct_incl_zero - 1)               # remove the number 0` }, { lang: 'js', code: `function numDupDigitsAtMostN(n) {
  const d = String(n).split('').map(Number);
  const memo = d.map(() => new Int32Array(1 << 10).fill(-1));
  function go(pos, mask, tight, started) {
    if (pos === d.length) return 1;
    if (!tight && started && memo[pos][mask] !== -1) return memo[pos][mask];
    const limit = tight ? d[pos] : 9;
    let res = 0;
    for (let dig = 0; dig <= limit; dig++) {
      const nt = tight && dig === limit;
      if (started || dig !== 0) {
        if (mask >> dig & 1) continue;               // digit already used
        res += go(pos + 1, mask | 1 << dig, nt, true);
      } else {
        res += go(pos + 1, mask, nt, false);         // still leading zeros
      }
    }
    if (!tight && started) memo[pos][mask] = res;
    return res;
  }
  const distinctInclZero = go(0, 0, true, false);    // counts 0..n with distinct digits
  return n - (distinctInclZero - 1);                 // remove the number 0
}` }, { lang: 'cpp', code: `class Solution {
    string d;
    int memo[10][1 << 10];

    int go(int pos, int mask, bool tight, bool started) {
        if (pos == (int)d.size()) return 1;
        if (!tight && started && memo[pos][mask] != -1) return memo[pos][mask];
        int limit = tight ? d[pos] - '0' : 9, res = 0;
        for (int dig = 0; dig <= limit; dig++) {
            bool nt = tight && dig == limit;
            if (started || dig != 0) {
                if (mask >> dig & 1) continue;            // digit already used
                res += go(pos + 1, mask | 1 << dig, nt, true);
            } else {
                res += go(pos + 1, mask, nt, false);      // still leading zeros
            }
        }
        if (!tight && started) memo[pos][mask] = res;
        return res;
    }

public:
    int numDupDigitsAtMostN(int n) {
        d = to_string(n);
        memset(memo, -1, sizeof memo);
        int distinctInclZero = go(0, 0, true, false);     // counts 0..n with distinct digits
        return n - (distinctInclZero - 1);                // remove the number 0
    }
};` }],
      complexity: `<p>O(D · 2<sup>10</sup> · 10) ≈ 10<sup>5</sup> for D = 10 digits.</p>`,
      followUps: ['Count Special Integers (LC 2376) is the complement directly.', 'Count numbers in [L, R] whose digits are all distinct and sorted.']
    }
  });

  practice.push({
    title: 'Longest Increasing Subsequence II (bounded jumps)',
    level: 'Hard', tags: ['dp', 'segment tree', 'lis'], companies: ['Google', 'Amazon'],
    statement: `<p>Find the length of the longest subsequence of <code>nums</code> that is <b>strictly increasing</b> and where every two adjacent chosen elements differ by <b>at most</b> <code>k</code>.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, 1 ≤ nums[i], k ≤ 10<sup>5</sup>`,
    example: `<p>nums = [4, 2, 1, 4, 3, 4, 5, 8, 15], k = 3 → <b>5</b>: ${H.c('g', '1, 3, 4, 5, 8')} (gaps 2, 1, 1, 3). 15 can't follow 8 (gap 7 &gt; 3).</p>`,
    brute: { why: `<p>O(N<sup>2</sup>) DP: dp[i] = 1 + max dp[j] over j &lt; i with nums[i] − k ≤ nums[j] &lt; nums[i]. 10<sup>10</sup> steps. Waste: the condition is a <b>value range</b> — a segment tree over values answers it in O(log V).</p>`, code: `
      int bruteLis2(int[] nums, int k) {
          int n = nums.length, best = 0;
          int[] dp = new int[n];
          for (int i = 0; i < n; i++) {
              dp[i] = 1;
              for (int j = 0; j < i; j++)
                  if (nums[j] < nums[i] && nums[i] - nums[j] <= k) dp[i] = Math.max(dp[i], dp[j] + 1);
              best = Math.max(best, dp[i]);
          }
          return best;
      }` },
    mcq: { q: 'Which range do we query for x = nums[i]?', options: ['values [x − k, x − 1]', 'values [x − k, x]', 'indices [i − k, i − 1]', 'values [1, x − 1]'], answer: 0, explain: 'The previous chosen value must be strictly smaller (≤ x − 1) and within k (≥ x − k). It is a range over <b>values</b>, not indices.' },
    hints: [`<p><b>Aha:</b> index the DP by value: best[v] = longest valid subsequence ending with value v, processed left to right.</p>`, `<p>Need max(best[x−k .. x−1]) → segment tree with range max and point update (values only grow, but the range has a lower bound, so Fenwick-prefix-max isn't enough).</p>`, `<p>Recipe: for x in nums: q = rangeMax(max(1, x−k), x−1); cur = q + 1; update(x, cur); ans = max(ans, cur). Iterative bottom-up segment tree keeps it short.</p>`],
    tests: { sig: "int[] int -> int", fn: "lengthOfLIS", cases: [
        [[[4,2,1,4,3,4,5,8,15],3],5],
        [[[7,4,5,1,8,12,4,7],5],4],
        [[[1,5],1],1],
        [[[1],1],1],
        [[[5,5,5],10],1],
        [[[1,2,3,4,5],1],5],
        [[[5,4,3,2,1],5],1],
        [[[1,100000,2,99999,3],100000],3],
        [[[3,1,2,2,4,3,5],1],3],
        [[[10,20,30,40],9],1],
        [[[10,20,30,40],10],4],
        [[[764,547,866,714,840,34,968,412,204,562,269,160,666,604,703,640,669,763,108,687,428,203,111,629,570,141,474,287,832,517,795,228,855,863,520,739,438,185,618,750,661,222,885,925,213,653,675,380,905,373,569,175,458,36,631,969,284,965,317,694,181,199,613,182,394,517,18,267,275,149,760,342,775,196,156,520,581,868,483,971,341,15,100,128,725,782,383,569,505,926,707,499,937,709,641,886,671,624,28,108,981,305,342,842,984,350,201,765,757,401,45,80,217,62,591,366,984,460,387,502,307,689,288,655,166,574,29,255,870,191,967,71,941,580,358,42,227,37,37,399,406,482,950,277,223,688,131,922,402,730,403,111,593,226,805,85,190,345,376,294,148,421,269,446,640,853,681,648,222,396,451,383,853,195,409,498,739,54,435,441,956,843,63,740,849,316,559,510,918,126,109,625,995,61,188,906,712,320,34,119,339,542,926,791,542,427,847,878,228,847,352,861,88,730,548,329,950,544,513,563,766,964,427,401,520,529,856,795,892,114,964,302,331,988,773,500,799,334,211,918,814,460,722,915,461,75,246,727,606,457,508,466,675,262,400,736,523,785,705,110,134,603,385,921,369,361,713,488,648,929,627,372,275,449,472,256,550,493,627,228,53,176,203,731,608,614,529,178,751,678,192,967,167,820,601,876,512,238,856,144,555,393,195,20,612,984,723,874,107,993,935,610,856,489,289,377,468,132,557,623,564,17,812,263,465,866,15,216,541,25,263,790,893,468,347,467,238,35,970,962,1000,811,508,433,876,44,637,946,255,533,946,465,587,505,293,777,544,834,281,459,337,921,963,458,203,724,740,390,703,395,100,384,22,83,618,166,515,752,720,175,803,1,663,634,135,58,232,792,798,178,859,249,432,51,494,611,158,726,821,351,754,85,540,586,73,858,163,818,158,217,623,815,253,755,22,87,607,967,388,865,147,741,366,649,238,992,46,814,260,497,842,297,562,463,494,803,590,728,389,321,254,304,393,176,910,627,564,226,251,438,662,442,694,689,543,349,701,551,387,812,810,575,642,567,477,774,993,746,139,269,115,740,414,227,341,664,954,942,688,130,71,518,586,590,426,920,697,443,512,253,640,369,152,412,397,409,515,957,934,49,840,515,304,183,734,493,249,656,562,308,291,800,924,31,968,113,112,371,741,718,952,808,676,551,609,91,645,762,711,666,753,732,872,249,687,123,320,668,327,15,229,137,365,696,670,966,421,850,896,540,44,277,6,351,977,719,326,101,742,922,767,951,550,650,917,897,174,931,914,867,451,926,705,412,270,255,696,277,609,818,840,355,547,133,341,673,842,892,419,761,896,1,804,861,267,653,172,554,618,561],17],18],
        [[[47850,47235,43643,71027,20984,55543,40335,37218,84793,96544,79273,19443,38024,26209,59879,29255,86310,53463,90538,6756,29850,40963,68721,89245,63046,39173,97295,40411,81752,73335,49407,68178,42282,14788,75887,76758,49822,6576,5058,69553,51506,63108,93942,91550,52833,57961,4190,79027,61880,18661,85356,25031,78580,43414,54596,6054,70205,76242,20534,84441,87404,21735,56096,18913,58386,26057,98910,55047,34620,7609,20904,17690,56669,61700,10650,3429,52566,12238,91806,3963,25524,7513,41626,47415,52922,31674,3288,58188,4083,41499,75143,84453,24045,53105,48809,73279,49665,96042,84822,64561,73847,42985,15117,35598,20641,54067,93782,65014,65536,21560,82331,52857,63634,80017,70821,31786,45112,37381,86843,36517,65637,46206,1263,74425,31512,26409,2440,12308,84318,17231,93075,81220,76037,42263,26192,65235,694,32031,22706,18830,12726,89467,38839,88214,31104,38455,3201,69648,31124,83248,19607,65051,69802,4047,51331,514,17093,5363,20616,55759,59734,72581,4560,39056,10151,68980,39597,8186,51692,46977,60657,20848,47461,1584,59790,6353,33801,22674,47201,62598,84463,72636,96105,97056,43290,4179,41948,12878,39023,9350,17861,73700,20554,21917,7182,17815,54550,20758,20284,34778,95217,43445,65834,53057,9121,81722,50634,64824,96543,85126,56745,79453,31455,36716,64977,76831,6256,50328,55029,40364,40261,17661,99872,90216,83634,78671,19859,91740,19143,12769,97932,12211,47301,53683,24427,38507,82745,77352,99157,69929,59343,49710,71679,61281,35080,6132,49374,41866,2146,39154,59509,76347,54061,54412,77845,23846,14351,1915,59892,74317,18002,8858,14002,80679,55271,19926,5927,13494,63688,59123,60894,12894,10154,93616,27157,37527,72883,99865,43919,6121,84197,89988,68471,42460,44359,86486,39813,48707,43169,54642,95350,36891,84010,96459,28295,42216,79236,33470,60766,50670,76358,19238,6290,251,41031,37203,57272,25919,13850,4294,60603,68619,37964,563,10195,8208,90998,17108,65097,63294,68104,28384,86563,96738,48756,12174,71376,11098,59603,36550,14438,88943,28375,74460,51357,26920,42750,72145,62637,96681,32234,50554,91702,48827,70461,35665,69999,10898,59189,7812,25124,82588,98037,81055,3938,25704,68988,91261,94023,60282,22572,66554,18518,91610,3845,72476,447,7101,8382,72079,79792,36636,24343,9969,51699,45420,15811,16702,18949,2310,39303,33794,31207,61347,91900,28849,54162,98766,4912,27074,56648,28662,25268,15505,98468,11609,94254,39690,54486,84816,16655,67750,28023,84979,45534,31880,69852,41833,65931,88531,85150,16077,3595,374,62081,19713,39456,15369,4434,24297,71306,13104,85599,28300,69146,98479,34396,99864,76406,86975,44304,28696,41387,96782,51222,12790,86091,16501,15949,70981,73931,56012,35399,43887,93809,39079,78019,12049,93057,24721,85027,64002,99557,4708,66853,66602,27278,29406,54402,43692,93496,5426,45435,26601,54263,98047,59013,28534,26557,84090,97679,78887,10917,32273,7700,80,92879,66518,85959,25641,66560,10180,35534,74846,96371,30290,76401,75557,35826,40145,11835,62000,26100,34058,17123,34960,68840,90098,81124,20662,77494,62122,6613,45763,93239,33563,28042,70649,37535,48498,47627,50612,31933,35347,98099,45678,97334,7556,68384,14748,92156,81248,445,23197,60963,16643,8621,94053,95715,23453,80747,97458,49388,12069,12483,76296,49054,69037,62998,48803,32495,59590,43616,64474,27648,4947,13437,95117,43969,86054,53113,9057,34464,33613,54706,52462,7980,90592,39423,470,45457,45669,5133,50915,53726,59575,582,83085,27491,96071,33132,51001,4461,99777,97963,5108,32657,85786,26121,74460,55552,24291,23303,16704,69146,35308,36807,96349,41008,28846,54941,21189,6985,74428,3922,30670,79216,85945,6315,10071,69078,12876,16973,24381,8236,50161,35611,41771,74674,96657,57585,96255,24658,19135,36960,69564,2536,95781,51963,24068,26680,4994,56002,48906,362,30952,98316,14005,98242,71960,65647,52456,9342,54832,18050,78058,11341,55750,11094,18234,4658,62920,1877,10699,65587,6444,33954,84718,19523,9877,95205,42169,77549,55277,48124,3889,35528,84794,35959,95543,5300,78627,34222,37027,62531,73008,16330,67846,45447,92803,47836,91421,89535,26051,34223,59466,8712,11132,82697,98395,60590,70173,55491,24254,75476,76996,80893,24327,31910,32017,99105,48044,16718,36373,93111,48900,48066,46878,59524,46210,59607,76407,30585,57945,95107,37817,90815,21948,4322,68229,60069,72882,57913,70209,586,25917,18709,60409,59673,72544,56732,99348,10630,22148,38541,1693,86978,87507,30286,22447,51552,53916,76374,48028,55635,86781,94528,44100,963,32194,33146,53546,71466,7396,29067,54733,88576,63518,30581,19309,1260,42764,18233,36023,508,43821,34434,8082,19239,75120,43269,35874,81247,6298,60499,13484,82902,6178,24622,57113,21627,92128,69232,31018,82208,30490,45985,63373,25908,45941,14371,93000,82833,58576,75489,51395,88602,53290,34433,47692,16114,97764,91768,7013,39664,15300,86441,93786,90870,86665],8251],47],
        [[[23,18,12,14,39,8,20,18,38,36,14,29,33,14,36,33,16,38,34,12,19,33,20,18,29,5,38,7,22,37,40,23,10,4,4,8,5,33,12,12,39,31,39,28,26,36,21,11,15,23,3,11,29,28,23,17,26,9,22,40,31,37,17,27,16,5,1,11,36,9,18,32,32,19,22,37,27,10,32,22,21,6,26,38,9,12,7,37,27,37,16,25,22,29,10,17,31,29,20,15,26,38,35,9,16,13,1,30,26,31,19,23,12,39,40,37,33,39,34,13,19,35,15,9,4,36,31,16,9,20,8,15,31,19,30,21,37,27,17,4,9,11,14,32,9,22,14,14,40,6,35,37,15,11,30,30,12,11,6,36,3,39,12,6,28,39,25,2,26,36,30,28,32,40,3,3,21,31,7,39,4,20,24,30,22,2,37,33,19,38,19,1,13,1,18,12,19,10,1,3,23,18,35,34,24,5,35,24,13,13,10,2,8,26,26,31,6,20,36,13,37,16,29,22,2,38,9,38,11,4,31,31,37,26,1,33,37,4,38,2,8,25,38,31,39,24,7,1,10,5,3,10,5,8,38,28,6,34,38,10,3,5,9,29,38,3,21,34,11,2,13,7,18,28,12,6,34,36,2,34,20,2,9,12,36,25,10,1,14,1,38,8,30,7,39,26,10,30,38,39,32,37,2,39,6,40,21,39,10,15,15,20,10,32,7,25,9,14,14,8,12,35,39,18,17,7,33,29,22,4,34,17,1,21,13,25,32,30,6,9,11,24,2,37,21,24,35,5,1,31,28,5,9,21,31,28,15,1,38,11,15,9,21,30,11,27,8,38,1,10,24,7,22,29,16,5,27,13,35,38,18,9,36,1,5,14,25,5,35,5,6,17,39,8,36,13,11,14,30,10,27,16,38,26,18,11,40,24,38,34,39,6,3,22,14,18,31,7,39,33,34,35,9,5,37,35,28,16,3,17,29,35,40,16,19,27,27,38,28,37,27,32,2,37,2,33,29,18,6,22,38,28,3,24,13,29,33,6,19,24,19,2,39,34,25,31,12,13,2,17,5,32,28,15,40,26,7,4,29,20,26,15,33,24,18,6,39,15,33,24,38,20,39,32,21,8,15,20,23,37],3],28],
        [[{"$range":[1,100001]},1],100000],
        [[{"$range":[1,100001]},100000],100000],
        [[{"$range":[100000,0,-1]},100000],1],
        [[{"$rep":100000,"n":100000},100000],1],
        [[{"$range":[1,100001,2]},1],1],
        [[{"$range":[1,100001,2]},2],50000],
        [[{"$concat":[{"$range":[2,100001,2]},{"$range":[1,100001,2]}]},2],50000],
        [[{"$concat":[{"$range":[2,100001,2]},{"$range":[1,100001,2]}]},1],2]
      ] },
        solution: {
      approach: `<p>DP over values with an iterative segment tree for range max — "DP with data structures".</p>`,
      code: `
        class Solution {
            public int lengthOfLIS(int[] nums, int k) {
                int maxV = 0;
                for (int x : nums) maxV = Math.max(maxV, x);
                int size = 1;
                while (size < maxV + 1) size <<= 1;
                int[] tree = new int[2 * size];                  // leaves at [size, 2*size)
                int best = 0;
                for (int x : nums) {
                    int lo = Math.max(1, x - k), hi = x - 1, got = 0;
                    for (int l = lo + size, r = hi + size + 1; l < r; l >>= 1, r >>= 1) { // max on [lo, hi]
                        if ((l & 1) == 1) got = Math.max(got, tree[l++]);
                        if ((r & 1) == 1) got = Math.max(got, tree[--r]);
                    }
                    int cur = got + 1;
                    best = Math.max(best, cur);
                    int p = x + size;
                    if (tree[p] < cur) {                              // point update, then fix parents
                        tree[p] = cur;
                        for (p >>= 1; p >= 1; p >>= 1) tree[p] = Math.max(tree[2 * p], tree[2 * p + 1]);
                    }
                }
                return best;
            }
        }`,
      alt: [{ lang: 'python', code: `def length_of_lis(nums, k):
    size = 1
    while size < max(nums) + 1:
        size <<= 1
    tree = [0] * (2 * size)                       # max segment tree over values; leaves at [size, 2*size)
    best = 0
    for x in nums:
        lo, hi = max(1, x - k), x - 1
        got = 0
        l, r = lo + size, hi + size + 1           # max on values [lo, hi]
        while l < r:
            if l & 1:
                got = max(got, tree[l])
                l += 1
            if r & 1:
                r -= 1
                got = max(got, tree[r])
            l >>= 1
            r >>= 1
        cur = got + 1
        best = max(best, cur)
        p = x + size
        if tree[p] < cur:                         # point update, then fix the parents
            tree[p] = cur
            p >>= 1
            while p:
                tree[p] = max(tree[2 * p], tree[2 * p + 1])
                p >>= 1
    return best` }, { lang: 'js', code: `function lengthOfLIS(nums, k) {
  let maxV = 0;
  for (const x of nums) maxV = Math.max(maxV, x);
  let size = 1;
  while (size < maxV + 1) size <<= 1;
  const tree = new Int32Array(2 * size);          // max segment tree over values; leaves at [size, 2*size)
  let best = 0;
  for (const x of nums) {
    const lo = Math.max(1, x - k), hi = x - 1;
    let got = 0;
    for (let l = lo + size, r = hi + size + 1; l < r; l >>= 1, r >>= 1) {   // max on values [lo, hi]
      if (l & 1) got = Math.max(got, tree[l++]);
      if (r & 1) got = Math.max(got, tree[--r]);
    }
    const cur = got + 1;
    best = Math.max(best, cur);
    let p = x + size;
    if (tree[p] < cur) {                          // point update, then fix the parents
      tree[p] = cur;
      for (p >>= 1; p >= 1; p >>= 1) tree[p] = Math.max(tree[2 * p], tree[2 * p + 1]);
    }
  }
  return best;
}` }, { lang: 'cpp', code: `int lengthOfLIS(vector<int>& nums, int k) {
    int maxV = *max_element(nums.begin(), nums.end());
    int size = 1;
    while (size < maxV + 1) size <<= 1;
    vector<int> tree(2 * size, 0);                 // max segment tree over values; leaves at [size, 2*size)
    int best = 0;
    for (int x : nums) {
        int lo = max(1, x - k), hi = x - 1, got = 0;
        for (int l = lo + size, r = hi + size + 1; l < r; l >>= 1, r >>= 1) {   // max on values [lo, hi]
            if (l & 1) got = max(got, tree[l++]);
            if (r & 1) got = max(got, tree[--r]);
        }
        int cur = got + 1;
        best = max(best, cur);
        int p = x + size;
        if (tree[p] < cur) {                       // point update, then fix the parents
            tree[p] = cur;
            for (p >>= 1; p >= 1; p >>= 1) tree[p] = max(tree[2 * p], tree[2 * p + 1]);
        }
    }
    return best;
}` }],
      complexity: `<p>O(N log V) time, O(V) space (V = max value).</p>`,
      followUps: ['Values up to 10<sup>9</sup> → coordinate compression, then binary search the rank range.', 'Count the number of such longest subsequences → store (len, count) in nodes.']
    }
  });

  practice.push({
    title: 'Allocate Mailboxes',
    level: 'Hard', tags: ['dp', 'divide and conquer optimization', 'median'], companies: ['Amazon', 'Google'],
    statement: `<p>Houses stand on a street at positions <code>houses[i]</code>. Place <code>k</code> mailboxes anywhere on the street to minimise the total distance from every house to its nearest mailbox. Return that minimum.</p>`,
    constraints: `1 ≤ k ≤ n ≤ 100 (LeetCode); the D&amp;C version scales to n ≈ 10<sup>4</sup>. Positions are distinct, ≤ 10<sup>4</sup>.`,
    example: `<p>houses = [1, 4, 8, 10, 20], k = 3 → <b>5</b>: mailboxes at 3, 9, 20 → |1−3| + |4−3| + |8−9| + |10−9| + 0 = 2 + 1 + 1 + 1 + 0 = 5.</p>`,
    brute: { why: `<p>Layered DP where each group cost is recomputed from scratch: O(k·n<sup>2</sup>) transitions × O(n) per cost = O(k·n<sup>3</sup>). Fine for n = 100, hopeless for 10<sup>4</sup>. Waste: group costs can be precomputed, and the best split is monotone.</p>`, code: `
      int bruteMailboxes(int[] houses, int k) {
          int[] h = houses.clone();
          Arrays.sort(h);
          int n = h.length;
          long INF = Long.MAX_VALUE / 4;
          long[][] dp = new long[k + 1][n + 1];
          for (long[] row : dp) Arrays.fill(row, INF);
          dp[0][0] = 0;
          for (int t = 1; t <= k; t++)
              for (int i = 1; i <= n; i++)
                  for (int j = 0; j < i; j++) {
                      if (dp[t - 1][j] >= INF) continue;
                      int med = h[(j + i - 1) / 2];             // a mailbox at the median is optimal
                      long s = 0;
                      for (int q = j; q < i; q++) s += Math.abs(h[q] - med);
                      dp[t][i] = Math.min(dp[t][i], dp[t - 1][j] + s);
                  }
          long best = INF;
          for (int t = 1; t <= k; t++) best = Math.min(best, dp[t][n]);
          return (int) best;
      }` },
    mcq: { q: 'Where should one mailbox go for a group of sorted houses?', options: ['At the median house', 'At the mean position', 'At the first house', 'Anywhere between the two ends'], answer: 0, explain: 'Sum of absolute distances is minimised at a median: moving away from it increases the distance to more than half of the houses.' },
    hints: [`<p><b>Aha:</b> sort; each mailbox serves a contiguous block, placed at its median. cost[i][j] = cost[i+1][j−1] + h[j] − h[i] (peel off the two ends).</p>`, `<p>dp[t][i] = min<sub>j</sub> dp[t−1][j] + cost(j, i−1). The cost satisfies the quadrangle inequality → opt monotone → divide &amp; conquer per layer.</p>`, `<p>k ≥ n → 0. Recipe: precompute cost by length; layer 1 = cost(0, i−1); layers 2..k with compute(l, r, optL, optR) as in topic 6.</p>`],
    tests: { sig: "int[] int -> int", fn: "minDistance", cases: [
        [[[1,4,8,10,20],3],5],
        [[[2,3,5,12,18],2],9],
        [[[7,4,6,1],1],8],
        [[[3,6,14,10],4],0],
        [[[5],1],0],
        [[[1,10000],1],9999],
        [[[10,1,4],2],3],
        [[[1,2,3,4,5,6,7,8,9],3],6],
        [[[9000,10000,1,2],2],1001],
        [[[6287,1565,461,4431,9397,7401,3274,2911,7461,4960,2117],2],11692],
        [[[1636,9367,4056,1765,4884],4],129],
        [[[3967,7321,7080,611,8546,5915,9037,9915],2],9855],
        [[[7913,5955,6194,7011,9019,3903,3331,6204,9056,1175],7],286],
        [[[9948,8749,9428,6200,6830,1748,9235,5502,7607,590,4279,7144,2533,8306,6545,248,3458,7859,9367,3753,391,2140,5741,5556,5396,8060,7410,2,4909,6482,54,9233,148,6422,9333,513,3092,6990,8440,1972,2239,5976,6538,3991,8740,398,5402,8117,3464,7211,4545,1729,9516,3019,2766,7052,2653,9110,9949,9755,3852,7192,2026,7511,5024,3590,3619,5247,3462,3415,6937,9091,4874,992,7050,9779,9818,4885,891,5848,494,9841,3109,7396,7867,8132,8342,1542,652,6371,3499,2793,7722,1118,53,6954,2968,5476,3474,5373],1],257294],
        [[[9256,3774,5096,7751,5184,4448,6159,3185,7032,6944,988,8228,2922,8600,4908,4447,3972,1792,2081,9734,3020,2249,7012,712,8002,2561,3464,4245,8816,7117,4380,8264,3934,5613,2796,5275,8298,2638,9003,7211,2671,1219,2983,817,9305,5974,1376,5585,3125,6411,6343,5931,8257,8505,860,3536,6333,5398,1056,1664,506,8365,4810,778,3808,722,2691,1011,5754,243,5581,9331,3897,6644,3197,4425,6827,9044,6845,2070,1596,9450,1823,3339,4799,6742,1821,8235,3307,7955,625,3393,1720,8125,8284,7263,2693,2842,5458,9132],2],114611],
        [[[7230,8927,6950,3743,9117,5767,6675,2942,4534,2162,8705,4479,372,4470,6313,2469,5652,7122,3067,8697,7289,7831,1525,2680,7483,5256,1692,859,2389,492,4254,2226,7339,32,8761,2211,62,5643,6271,5214,6340,9627,779,4414,3469,8180,5717,4001,7429,4657,3934,2325,8589,3033,1926,9548,5272,2746,3839,3936,4375,3558,1249,5947,1442,2425,2323,3808,497,1785,9223,2593,8586,9651,7457,3708,8588,7496,6503,3364,9209,8672,5781,1805,2060,2687,1531,3488,1538,9410,2350,7756,4138,4820,823,7582,6179,2349,4311,3534],7],29527],
        [[[5702,7992,1759,5368,6175,1497,2459,1799,4983,6556,528,5871,2636,4270,9826,1163,1076,7262,4780,9287,2017,9759,1498,8215,3324,9263,9349,5781,547,2849,8521,7036,4156,1630,4339,9653,5585,3335,392,745,105,3527,906,5262,9212,7699,1796,5420,2440,3547,4988,7403,7695,370,9346,5804,2336,274,591,9932,8508,1243,9065,6873,3481,9231,4871,9244,2498,7768,8765,4403,1790,4490,6432,7585,4791,2493,3081,4140,7289,5529,2725,1212,8949,2656,868,4009,7439,6995,7955,2371,6032,7269,4443,263,4979,4293,1031,4859],30],4799],
        [[[2383,6849,8740,271,7530,6024,352,5706,711,256,5731,792,5261,3466,1027,9256,6999,2211,6794,9497,1071,7127,8567,869,4751,6610,347,9293,1509,144,7116,3564,4676,1360,5517,6509,4431,1641,2497,2611,8733,423,7232,3577,8226,1833,5335,1325,8940,8416,9724,7999,3080,4501,1888,7134,5069,2779,9537,4520,280,7672,100,8568,2955,8025,8452,868,8526,3288,4051,9323,4878,5355,1284,3929,4678,4835,3690,4978,9016,3853,5788,7839,8603,9769,660,5259,2401,1465,688,2866,5312,7180,1443,2767,9818,3910,486,4578],99],1],
        [[[1393,5430,2524,3442,5549,4991,644,9141,5963,4950,3048,3291,540,8854,6482,3703,8995,3899,3709,5993,6831,7963,4005,6046,1400,3961,9429,5176,6258,5792,504,5828,6892,8956,9670,7176,7148,2224,1250,2177,9280,2106,9637,7824,2936,1593,9219,7220,9750,9263,9320,9169,1116,7008,8027,2717,2885,1202,4446,6259,7217,4665,4876,8798,9018,6664,7989,831,2230,6595,9694,7171,7262,6761,1384,6234,7733,9768,9148,5796,97,8469,9783,8883,7977,8404,5502,3002,2034,2549,7608,3019,1908,9517,2864,8282,6637,929,6007,6571],100],0],
        [[{"$range":[1,101]},1],2500],
        [[{"$range":[100,0,-1]},100],0]
      ] },
        solution: {
      approach: `<p>Sorted houses, O(n²) cost table via the "peel the ends" recurrence, then D&amp;C optimisation per layer.</p>`,
      code: `
        class Solution {
            long[][] cost; long[] prev, cur;

            public int minDistance(int[] houses, int k) {
                int[] h = houses.clone();
                Arrays.sort(h);
                int n = h.length;
                k = Math.min(k, n);
                cost = new long[n][n];                         // cost[i][j]: one mailbox for h[i..j]
                for (int len = 2; len <= n; len++)
                    for (int i = 0; i + len - 1 < n; i++) {
                        int j = i + len - 1;
                        cost[i][j] = (len > 2 ? cost[i + 1][j - 1] : 0) + h[j] - h[i];
                    }
                prev = new long[n + 1];
                Arrays.fill(prev, Long.MAX_VALUE);
                for (int i = 1; i <= n; i++) prev[i] = cost[0][i - 1];   // one mailbox
                for (int layer = 2; layer <= k; layer++) {
                    cur = new long[n + 1];
                    Arrays.fill(cur, Long.MAX_VALUE);
                    compute(layer, n, layer - 1, n - 1);
                    prev = cur;
                }
                return (int) prev[n];
            }

            // fill cur[l..r]; best split for each lies in [optL, optR]
            private void compute(int l, int r, int optL, int optR) {
                if (l > r) return;
                int mid = (l + r) >>> 1;
                long best = Long.MAX_VALUE; int bestJ = optL;
                for (int j = optL; j <= Math.min(mid - 1, optR); j++) {
                    long v = prev[j] + cost[j][mid - 1];       // last mailbox serves h[j..mid-1]
                    if (v < best) { best = v; bestJ = j; }
                }
                cur[mid] = best;
                compute(l, mid - 1, optL, bestJ);
                compute(mid + 1, r, bestJ, optR);
            }
        }`,
      alt: [{ lang: 'python', code: `def min_distance(houses, k):
    h = sorted(houses)
    n = len(h)
    k = min(k, n)
    # cost[i][j]: one mailbox (at the median) serving h[i..j]
    cost = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            cost[i][j] = (cost[i + 1][j - 1] if length > 2 else 0) + h[j] - h[i]
    INF = float('inf')
    prev = [INF] + [cost[0][i - 1] for i in range(1, n + 1)]      # one mailbox
    for layer in range(2, k + 1):
        cur = [INF] * (n + 1)

        def compute(l, r, opt_l, opt_r):
            if l > r:
                return
            mid = (l + r) // 2
            best, best_j = INF, opt_l
            for j in range(opt_l, min(mid - 1, opt_r) + 1):
                v = prev[j] + cost[j][mid - 1]                    # last mailbox serves h[j..mid-1]
                if v < best:
                    best, best_j = v, j
            cur[mid] = best
            compute(l, mid - 1, opt_l, best_j)
            compute(mid + 1, r, best_j, opt_r)

        compute(layer, n, layer - 1, n - 1)
        prev = cur
    return prev[n]` }, { lang: 'js', code: `function minDistance(houses, k) {
  const h = [...houses].sort((a, b) => a - b);
  const n = h.length;
  k = Math.min(k, n);
  // cost[i][j]: one mailbox (at the median) serving h[i..j]
  const cost = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let len = 2; len <= n; len++)
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      cost[i][j] = (len > 2 ? cost[i + 1][j - 1] : 0) + h[j] - h[i];
    }
  let prev = new Array(n + 1).fill(Infinity);
  for (let i = 1; i <= n; i++) prev[i] = cost[0][i - 1];     // one mailbox
  for (let layer = 2; layer <= k; layer++) {
    const cur = new Array(n + 1).fill(Infinity);
    const compute = (l, r, optL, optR) => {
      if (l > r) return;
      const mid = (l + r) >> 1;
      let best = Infinity, bestJ = optL;
      for (let j = optL; j <= Math.min(mid - 1, optR); j++) {
        const v = prev[j] + cost[j][mid - 1];                // last mailbox serves h[j..mid-1]
        if (v < best) { best = v; bestJ = j; }
      }
      cur[mid] = best;
      compute(l, mid - 1, optL, bestJ);
      compute(mid + 1, r, bestJ, optR);
    };
    compute(layer, n, layer - 1, n - 1);
    prev = cur;
  }
  return prev[n];
}` }, { lang: 'cpp', code: `class Solution {
    vector<vector<int>> cost;
    vector<int> prev, cur;
    const int INF = INT_MAX / 2;

    // fill cur[l..r]; the best split for each lies in [optL, optR]
    void compute(int l, int r, int optL, int optR) {
        if (l > r) return;
        int mid = (l + r) / 2, best = INF, bestJ = optL;
        for (int j = optL; j <= min(mid - 1, optR); j++) {
            int v = prev[j] + cost[j][mid - 1];       // last mailbox serves h[j..mid-1]
            if (v < best) { best = v; bestJ = j; }
        }
        cur[mid] = best;
        compute(l, mid - 1, optL, bestJ);
        compute(mid + 1, r, bestJ, optR);
    }

public:
    int minDistance(vector<int>& houses, int k) {
        vector<int> h = houses;
        sort(h.begin(), h.end());
        int n = h.size();
        k = min(k, n);
        cost.assign(n, vector<int>(n, 0));            // one mailbox (at the median) serving h[i..j]
        for (int len = 2; len <= n; len++)
            for (int i = 0; i + len - 1 < n; i++) {
                int j = i + len - 1;
                cost[i][j] = (len > 2 ? cost[i + 1][j - 1] : 0) + h[j] - h[i];
            }
        prev.assign(n + 1, INF);
        for (int i = 1; i <= n; i++) prev[i] = cost[0][i - 1];   // one mailbox
        for (int layer = 2; layer <= k; layer++) {
            cur.assign(n + 1, INF);
            compute(layer, n, layer - 1, n - 1);
            prev = cur;
        }
        return prev[n];
    }
};` }],
      complexity: `<p>O(n² + k·n log n) time, O(n²) space for the cost table.</p>`,
      followUps: ['Return the mailbox positions.', 'Weighted houses (several letters per house) → weighted median.', 'Large k → Knuth (O(n²)) or the Aliens trick.']
    }
  });

  practice.push({
    title: 'Kalila and Dimna in the Logging Industry',
    level: 'Hard', tags: ['dp', 'convex hull trick', 'overflow'], companies: ['Codeforces', 'Jane Street'],
    statement: `<p>There are <code>n</code> trees with heights <code>a[0] &lt; a[1] &lt; … &lt; a[n−1]</code> (a[0] = 1) and recharge costs <code>b[0] &gt; b[1] &gt; … &gt; b[n−1] = 0</code>. Cutting tree i completely costs <code>a[i]</code> uses of the saw; after each use you must recharge, paying <code>b[j]</code> where j is the <b>largest index of a tree already cut down</b>. Tree 0 is cut at the start for free. Minimise the total cost to cut tree n − 1 (after which recharging is free).</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup>, 1 ≤ a[i] ≤ 10<sup>9</sup>, 0 ≤ b[i] ≤ 10<sup>9</sup>; answers up to ~10<sup>18</sup>`,
    example: `<p>a = [1, 2, 3, 4, 5], b = [5, 4, 3, 2, 0] → <b>25</b>: cut tree 4 right after tree 0, paying b[0]·a[4] = 5 × 5 = 25. Any detour (e.g. 0 → 1 → 4: 5·2 + 4·5 = 30) costs more here. With a = [1, 2, 3, 10, 20, 30], b = [6, 5, 4, 3, 2, 0] the answer is <b>138</b>.</p>`,
    brute: { why: `<p>dp[i] = min<sub>j&lt;i</sub> dp[j] + b[j]·a[i]: O(n<sup>2</sup>) = 10<sup>10</sup>. Waste: each j is a line with slope b[j] and intercept dp[j]; most lines are never the minimum.</p>`, code: `
      long bruteKalila(long[] a, long[] b) {
          int n = a.length;
          long[] dp = new long[n];
          for (int i = 1; i < n; i++) {
              dp[i] = Long.MAX_VALUE;
              for (int j = 0; j < i; j++) dp[i] = Math.min(dp[i], dp[j] + b[j] * a[i]);
          }
          return dp[n - 1];
      }` },
    mcq: { q: 'In dp[i] = min(dp[j] + b[j]·a[i]), which guarantees make the O(n) deque version valid?', options: ['b decreasing (slopes added in decreasing order) and a increasing (queries move right)', 'a and b both increasing', 'b[n−1] = 0 only', 'Nothing — CHT always works in O(n)'], answer: 0, explain: 'For min-CHT with a deque we need slopes inserted in decreasing order (b strictly decreasing) and monotone queries (a strictly increasing) so the front pointer only moves forward.' },
    hints: [`<p><b>Aha:</b> once you cut tree n−1 everything is free, and the optimal plan is a chain 0 → j<sub>1</sub> → … → n−1. dp[i] = min<sub>j</sub> dp[j] + b[j]·a[i].</p>`, `<p>Line for j: y = b[j]·x + dp[j]; query at x = a[i]. Sorted slopes and queries → monotone CHT deque.</p>`, `<p>Overflow: intercepts ~10<sup>18</sup> × slope differences ~10<sup>9</sup> → 10<sup>27</sup>. Compare 128-bit products: <code>__int128</code> in C++; Java <code>Math.multiplyHigh</code> (high 64 bits) + <code>Long.compareUnsigned</code> (low bits); <code>BigInt</code> in JS; plain integers in Python.</p>`],
    tests: { sig: "long[] long[] -> long", fn: "minCost", cases: [
        [[[1,2,3,4,5],[5,4,3,2,0]],25],
        [[[1,2,3,10,20,30],[6,5,4,3,2,0]],138],
        [[[1],[0]],0],
        [[[1,5],[3,0]],15],
        [[[1,2],[1,0]],2],
        [[[1,334,400],[384,307,0]],153600],
        [[[1,108,162,220,315,466],[525,400,234,201,150,0]],194094],
        [[[1,19,112],[164,10,0]],4236],
        [[[1,42,108,167,257,350,405,422,429,499],[427,422,357,320,254,243,180,128,38,0]],202145],
        [[[1,12,46,118,199,225,266,357,396,421],[433,378,315,258,238,196,153,107,73,0]],152533],
        [[[1,7,32,100,195,264,291,307,351,413],[521,441,341,322,249,243,219,164,100,0]],157505],
        [[[1,1252029,2059374,2060722,5084322,6470748,8253828,10947141,13177288,15377230,17620661,20287188,22244196,24805485,25983287,28176557,29372043,30363019,31851229,33611422,34102251,35189885,37739908,40897876,43520105,45521819,46536210,47147550,49446407,50401799,51949751,54715245,55607009,56996087,58169392,58298148,60571297,61475341,62998688,64942771,67330376,67645227,69946569,71316474,71827756,72719651,74594987,77906795,78349058,79007268,81937773,83339266,83817653,84432708,85219995,86077483,86709210,89719605,92845922,94388812,96721971,98194080,100276226,102984875,105256833,106340644,107563148,109572118,112720986,114524694,117451642,117933907,121084645,121707371,124956216,127622121,130567369,131067225,131253011,131305427,131694926,132190478,132356583,133366181,135314454,138569638,139871904,140348711,140998581,143780944,145723579,146331445,149616815,152945499,154812620,156210508,156813541,159097609,161152984,161331593,163973156,164768698,166545008,169245601,170459020,173054356,175605631,177912325,179976530,182960489,183714692,185371648,188097491,189843281,192566034,193942473,196191047,199130608,199201002,202498954,205569611,206389349,208001456,210522892,212131833,212752164,214204436,217326595,218886479,219425055,220801779,222421257,224703256,225497215,226322973,228945232,231597371,233529401,236387753,238041466,241043393,241515800,242003655,243305747,244432855,245840940,246446898,247025421,248606835,249171464,249487550,251505087,252825000,253328758,256232355,258656570,261117178,261547803,264130669,265840243,267171949,268297486,271428196,272007895,273835549,276749363,277340744,278970598,280697908,282176944,284074669,286980529,288555708,289051519,290730789,294006736,295041907,297119495,299467659,302513086,302842741,303618093,303933391,304911426,307027569,308914539,311992745,314644699,316713203,319647733,322095567,322928209,326174151,329366752,332429476,334603757,336174731,338482628,339331302,340017851,342394794,342438145,343879063,345814872,347147058,348490772,351080495,353748694,356776634,357934719,361140433,361892402,363593533,366866465,369909564,371525614,373516105,376078168,378674325,378689512,381817431,384781821,386138802,386804856,388636049,390501600,391368456,391630248,393408387,393716593,396137486,397108277,399810275,401405033,401906202,402870019,406001937,409167733,410412591,411225348,411343796,411386309,414428345,416952084,417092502,417294667,420153754,421544498,422991983,424867340,426718998,427353046,428280295,430007945,430563611,431391339,433419669,434746121,437783922,439585380,442654055,444305112,444443642,447568240,448285699,450456979,452905809,453791087,456155097,458280043,460302428,461117961,461537277,461697032,463180831,464265181,465927036,466211945,466947179,470148740,470306323,471491246,474441675,477647108,479120858,481295055,483213945,485384661,488667296,490324404,491325136,493433891,493826955,494107390,495261052,496197420,497753359,500419627,500887047,502145864],[506423498,503819838,501148772,499042777,496642952,495983047,492870245,490244477,489141859,486549002,483922606,483006820,481369149,480920528,477812933,475378260,472862662,470602648,469835345,466888809,465439245,464340291,461479731,459635306,457052618,455682941,454595074,454474230,452915771,452877015,452719143,452056021,449088205,445880489,443978360,440940793,439840170,437191562,435997568,432706385,430210234,427877649,425857982,424160563,424139359,421044811,417966080,416208745,416193314,415663314,413027946,410583665,408701697,406658223,403435666,400918594,398841332,396137349,392930324,389770612,389026620,387479268,387104578,384897325,382585332,381737602,379568139,379138166,377585773,377028438,377021060,374115732,371859250,368851401,368379541,365985064,364484885,364386662,361970141,361344407,361100676,359753701,357809584,356868575,356109829,355163460,353510199,350635485,350587344,347528850,346479568,345477699,344269600,342651452,342640316,342214024,341322565,338772281,336103434,334355368,334092220,333502246,331379930,331379359,331163741,328655439,326721478,325139690,322512776,319588621,317945187,315954580,315417244,312834180,310049498,309876208,306691663,303751557,303595482,302049657,299975930,297414658,296982101,295908535,293280432,292619478,290873705,289672313,288281494,288226899,287621521,284730228,284531266,281454643,280541836,277993891,276633252,273525948,273356919,272366740,272020663,269452694,267785251,264592911,262313584,259308285,256221202,253294352,252220812,250352280,249152239,247080276,244814453,243908738,242183019,240069008,240020417,237718025,236219207,235950457,235898741,233075893,231728496,229456255,226156693,224054657,220877683,220196451,217641578,217203480,214107886,212637735,210291704,208212269,206503089,205034667,203566423,201159128,198914161,197055216,195597246,192326609,189053850,188015914,186828799,185266631,184440755,184167266,182551099,179395085,178098959,175063248,174169661,172737712,169418774,169203703,168494480,165611602,164696523,164536133,164137238,162265772,160293309,158164879,156302364,155600714,154045419,152342535,150213545,147671094,145509002,142502963,142431299,140407516,138975378,138608354,135517352,134814307,134212157,130969242,129014382,126525975,126519645,124388993,122224905,120601443,118013098,116016800,113926860,113413437,111562275,110245976,107316529,106034731,104863787,101688481,101428681,100245737,100016272,97061068,95546202,94903071,92526490,90761634,88814843,86578491,83284491,80128832,79096308,77902023,76870157,74493509,74489143,71320402,70024739,67199133,65071554,64925421,63068578,60626424,59451134,56440421,55818905,54889704,52666282,51948642,49819450,48312630,47231893,46959104,46337115,43541862,43270609,42922222,42486779,39814247,37163695,35440460,33165157,31588937,30514424,29927162,27422722,24125370,24039863,23616957,23300062,22111445,19712122,18902751,16724137,15425597,13155159,13087238,12776558,9896643,7440561,4470947,3096011,0]],"243522413069653144"],
        [[[1,966075,2452207,3469678,3513778,6190922,6745622,6997156,10195096,10574876,10717181,13959514,14883262,16805539,17023836,17253672,19618954,21686135,22906043,25511814,25851525,25911018,26738951,29430211,31428219,34186706,34248209,36116384,38967959,41710250,44509907,46560580,48759105,50201678,51891945,54047726,56492044,59400605,60401811,61603536,62803170,62840561,66027461,68669861,70540706,71082314,73686891,76648642,79363374,80799994,83859012,86274950,88197211,90015497,93299245,95122882,98068409,100194450,101167092,103678341,105141273,107878021,110027166,113199171,114002262,115779894,118035760,119721203,122986256,124883119,125076262,126347769,127558786,130565675,131587429,133510547,136070816,138844748,140284714,142809174,146023199,148432236,151377958,152473223,152564455,152808365,153257988,155393014,155426384,156955564,158691189,160136239,162289796,165386425,167135719,168019945,168841855,171456904,172855895,175693741,177696007,179992033,181363596,181869378,184683144,187433422,189711089,191923562,192929057,194975657,195340820,196027115,198086831,200037176,200327762,200555866,203882701,205517808,206882446,208886472,212045353,212063257,214848107,216365623,218101295,218925235,220744766,223554472,225266518,228424112,229677008,232819839,236011759,237259436,239771462,242464133,244466249,244684135,245430796,247836028,250717656,254014740,255495236,257432870,257735267,259472966,261145289,261934101,263849423,264211473,266834094,267055558,268012516,269904507,273002015,274690053,275527410,275998973,276164365,277713368,280612832,282860559,285994730,286670834,288820311,291916094,292357559,294748618,297320846,297861373,300432775,302337029,305337902,306616174,308854053,310261932,311713294,314293439,315079413,317412528,318613065,318771329,321114387,323455908,325775359,326878187,329549611,331789260,334668130,336392811,336504401,337466337,339810124,340387859,340601316,343493260,344559196,344821277,347331298,347621128,350652026,350941985,352018490,353371527,355414053,358453170,359013149,359036986,361866081,362459183,365524226,367587717,370454170,371888401,372773615,375199375,378008887,379577726,379653436,379663552,382836570,384544619,387400604,387579713,390153287,391229588,392206892,394772998,394890304,396275214,399486644,402492482,402629047,405313430,406638980,406879487,409795950,412923894,415313299,417749566,417908533,419432505,420998105,422288112,423001394,423973395,424707020,424992159,425439728,428117412,428307196,431196180,434304224,435494580,436303586,437613257,439767720,440965712,442413490,445489025,445703588,446181569,448251662,450679839,452323336,454528830,456200015,458471064,460468145,463252087,463423321,466164481,467862640,470081739,473084744,475609836,476612862,478475853,481058230,481143117,482657980,485760541,487272778,489236146,490428931,491665425,493978806,496336493,496769804,499204704,500710810,503802171,504884859,505332699,507431686,510070863,511884472,515210915,515668549,518989730],[496416458,496301515,495840759,495289623,493574817,490637099,487312662,485553358,485440743,484353126,482965921,481384817,481225486,480500910,477898650,475707619,474530828,473978722,471961725,469330374,467832068,464940371,462604402,460885107,459958230,457778902,456028298,454840403,452444956,450758998,450386340,447186735,446457414,443315920,441509674,441383992,438578617,435944978,433484763,432789592,431067857,429052680,427862873,426218430,425812309,423920864,423273449,421201124,417871903,416547536,415660595,414223513,412490304,410158281,409395580,407959591,405616270,403616456,402572779,402186710,399834535,399435780,398493154,395219663,394346916,391628915,389713834,387808942,385910131,384015990,383245029,383191005,380042286,378495184,376258319,375126648,374989864,374232725,372934741,372015194,372000408,369791386,367594561,364805953,362425431,359926749,359592133,358181030,357113353,355854673,355757850,352908858,351292866,348762477,348337953,346139697,343713729,342468537,339296821,337327971,337025150,335709468,333693546,331069337,328616635,325421789,323497960,322582386,321248338,320111924,319696243,317909791,317212915,316620948,314092639,313059632,310764175,308974873,308796641,306927074,306551948,304875376,303157501,302968341,300476871,297668921,295959642,293761052,291012472,287796248,285190327,285016872,282545957,279425718,278897175,277590030,275491580,274609843,271278507,271163745,268199262,267101180,265320963,262180339,262087821,261892204,258874780,257560491,255541500,254157529,251716560,251686543,248883406,245952871,243381032,240354545,237264696,235532958,234880765,231920253,228925880,228621189,227323892,224109115,222683790,220647926,219622579,216872776,214379171,212523145,209977669,209812731,206684913,204624805,203103187,201251918,199355732,196268930,193058057,191199025,189418851,186872433,185637770,183892450,183684828,181286343,178191721,176390376,175048950,173468260,170751908,170173420,169562153,166693346,166005465,164722494,164322560,161526137,158338299,157156042,156321163,155361853,152232589,149568914,147383867,146058607,144150333,141750771,141605591,141543128,139523797,138525739,136357747,134590963,134272766,131825962,130283362,127020648,126643413,125151230,123971196,120998278,119446123,118615303,118483949,117419078,116528354,115879445,114030097,113038854,111585278,109148516,107391681,106351848,105950653,104236420,102963630,100578354,97392811,94150594,94139988,92796695,91792634,90092457,88397350,87733155,87458146,86515799,83908361,81950329,78710452,78462163,77274064,76566418,75962042,73107294,72141021,72043743,68834365,66118971,65136804,62216726,59275674,55983309,54408449,52367314,50136273,47371703,44177397,42675822,42339116,40993336,40919148,39868117,37116179,36766126,33767546,31539648,29590787,27179252,24785044,24236396,23397944,22636710,21428586,18607908,16005372,15531545,12406500,12073996,11218244,11196034,9033803,6109057,4032548,3246071,1746684,1381382,212169,0]],"249179253945441171"],
        [[{"$range":[1,1000000000,10000]},{"$range":[99999,-1,-1]}],99998000109999],
        [[{"$range":[1,999910000,9999]},{"$range":[1000000000,-1,-10000]}],"999900001000000000"],
        [[{"$range":[1,100001]},{"$range":[99999,-1,-1]}],9999900000]
      ] },
        solution: {
      approach: `<p>Monotone convex hull trick; the "bad line" test compares two products exactly in 128 bits.</p>`,
      code: `
        class Solution {
            // compare x1*y1 with x2*y2 exactly (signed 128-bit)
            static int cmp128(long x1, long y1, long x2, long y2) {
                long h1 = Math.multiplyHigh(x1, y1), h2 = Math.multiplyHigh(x2, y2);
                if (h1 != h2) return Long.compare(h1, h2);
                return Long.compareUnsigned(x1 * y1, x2 * y2);    // low 64 bits, unsigned
            }

            public long minCost(long[] a, long[] b) {
                int n = a.length;
                long[] M = new long[n], C = new long[n], dp = new long[n];
                int head = 0, tail = 0;
                M[tail] = b[0]; C[tail] = 0; tail++;              // line for tree 0
                for (int i = 1; i < n; i++) {
                    long x = a[i];
                    while (tail - head >= 2 && M[head + 1] * x + C[head + 1] <= M[head] * x + C[head]) head++;
                    dp[i] = M[head] * x + C[head];
                    long m = b[i], c = dp[i];
                    // drop line (tail-1) if x(l1, new) <= x(l1, l2)
                    while (tail - head >= 2 && cmp128(c - C[tail - 2], M[tail - 2] - M[tail - 1],
                                                       C[tail - 1] - C[tail - 2], M[tail - 2] - m) <= 0) tail--;
                    M[tail] = m; C[tail] = c; tail++;
                }
                return dp[n - 1];
            }
        }`,
      alt: [{ lang: 'python', code: `def min_cost(a, b):
    n = len(a)
    M, C = [b[0]], [0]                   # lines y = M*x + C, slopes strictly decreasing
    head = 0
    dp = 0
    for i in range(1, n):
        x = a[i]
        while len(M) - head >= 2 and M[head + 1] * x + C[head + 1] <= M[head] * x + C[head]:
            head += 1
        dp = M[head] * x + C[head]
        m, c = b[i], dp
        # drop the last line if the new line overtakes it before it overtakes the line before it
        while len(M) - head >= 2 and (c - C[-2]) * (M[-2] - M[-1]) <= (C[-1] - C[-2]) * (M[-2] - m):
            M.pop()
            C.pop()
        M.append(m)
        C.append(c)
    return dp` }, { lang: 'js', code: `function minCost(a, b) {
  // costs reach about 10^18, past 2^53, so every value is a BigInt
  const n = a.length;
  const A = a.map(BigInt), Bb = b.map(BigInt);
  const M = new Array(n), C = new Array(n);        // lines y = M*x + C, slopes strictly decreasing
  let head = 0, tail = 0, dp = 0n;
  M[tail] = Bb[0]; C[tail] = 0n; tail++;           // line for tree 0
  for (let i = 1; i < n; i++) {
    const x = A[i];
    while (tail - head >= 2 && M[head + 1] * x + C[head + 1] <= M[head] * x + C[head]) head++;
    dp = M[head] * x + C[head];
    const m = Bb[i], c = dp;
    // drop the last line if the new line overtakes it before it overtakes the line before it
    while (tail - head >= 2 &&
           (c - C[tail - 2]) * (M[tail - 2] - M[tail - 1]) <= (C[tail - 1] - C[tail - 2]) * (M[tail - 2] - m)) tail--;
    M[tail] = m; C[tail] = c; tail++;
  }
  return dp;
}` }, { lang: 'cpp', code: `long long minCost(vector<long long>& a, vector<long long>& b) {
    typedef __int128 i128;                          // cross products reach about 10^27
    int n = a.size();
    vector<long long> M(n), C(n);                   // lines y = M*x + C, slopes strictly decreasing
    int head = 0, tail = 0;
    long long dp = 0;
    M[tail] = b[0]; C[tail] = 0; tail++;            // line for tree 0
    for (int i = 1; i < n; i++) {
        long long x = a[i];
        while (tail - head >= 2 && M[head + 1] * x + C[head + 1] <= M[head] * x + C[head]) head++;
        dp = M[head] * x + C[head];
        long long m = b[i], c = dp;
        // drop the last line if the new line overtakes it before it overtakes the line before it
        while (tail - head >= 2 &&
               (i128)(c - C[tail - 2]) * (M[tail - 2] - M[tail - 1]) <= (i128)(C[tail - 1] - C[tail - 2]) * (M[tail - 2] - m)) tail--;
        M[tail] = m; C[tail] = c; tail++;
    }
    return dp;
}` }],
      complexity: `<p>O(n) amortised time, O(n) space.</p>`,
      followUps: ['Why is M·x + C itself safe from overflow? (b ≤ 10<sup>9</sup>, a ≤ 10<sup>9</sup> → 10<sup>18</sup>; plus dp ≤ ~10<sup>18</sup> — check the bound carefully or use overflow-checked multiplication: Math.multiplyExact in Java, __int128 in C++, BigInt in JS.)', 'Unsorted a → Li Chao tree over compressed a.']
    }
  });

  practice.push({
    title: 'Jzzhu and Numbers (count subsets with AND = 0)',
    level: 'Hard', tags: ['sos dp', 'inclusion-exclusion', 'bitmask'], companies: ['Codeforces', 'Tower Research'],
    statement: `<p>Given <code>n</code> integers, count the non-empty subsets (by index) whose bitwise AND equals 0. Return the count modulo 10<sup>9</sup> + 7.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>6</sup>, 0 ≤ a[i] ≤ 10<sup>6</sup> (&lt; 2<sup>20</sup>)`,
    example: `<p>a = [0, 1, 2, 3] → <b>10</b>: all 8 subsets containing 0, plus {1, 2} and {1, 2, 3}. a = [2, 3, 3] → <b>0</b> (every element has bit 1 set).</p>`,
    brute: { why: `<p>Enumerate 2<sup>n</sup> subsets — impossible for n = 10<sup>6</sup>. Waste: the AND only cares about bit patterns; with 2<sup>20</sup> possible masks we can count via supersets.</p>`, code: `
      int bruteAndZero(int[] a) {                         // n <= 20 only
          int n = a.length, count = 0;
          for (int s = 1; s < (1 << n); s++) {
              int and = -1;                                 // all ones
              for (int i = 0; i < n; i++) if ((s >> i & 1) == 1) and &= a[i];
              if (and == 0) count++;
          }
          return count;
      }` },
    mcq: { q: 'G[m] = how many elements are supersets of m. How many non-empty subsets have an AND that contains all bits of m?', options: ['2<sup>G[m]</sup> − 1', 'G[m]', 'G[m]²', '2<sup>n</sup> − G[m]'], answer: 0, explain: 'AND ⊇ m ⇔ every chosen element ⊇ m. Any non-empty subset of those G[m] elements works: 2<sup>G[m]</sup> − 1.' },
    hints: [`<p><b>Aha:</b> "AND = 0" is hard to count directly, but "AND ⊇ m" is easy: 2<sup>G[m]</sup> − 1 with G = count of supersets of m.</p>`, `<p>Inclusion–exclusion: #(AND = 0) = Σ<sub>m</sub> (−1)<sup>popcount(m)</sup> (2<sup>G[m]</sup> − 1). Compute G with sum-over-supersets SOS DP.</p>`, `<p>Precompute powers of 2 mod p up to n. Keep results in [0, p) with +MOD before %. 20 bits × 2<sup>20</sup> ≈ 2·10<sup>7</sup> steps.</p>`],
    tests: { sig: 'int[] -> int', fn: 'countAndZero', cases: [
      [[[0, 1, 2, 3]], 10],
      [[[2, 3, 3]], 0],
      [[[0]], 1],
      [[[1]], 0],
      [[[1, 2, 4]], 4],
      [[[3, 5, 6]], 1],
      [[[7, 7, 7]], 0],
      [[[1000000, 0, 524288, 475712]], 10],
      [[[5, 10, 15, 5, 10, 0]], 50],
      [[[32, 45, 3, 59, 31, 6, 20, 14, 47, 60, 31, 48, 13, 31]], 14724],
      [[[1, 8, 5, 16, 4, 5, 4, 2, 4, 12, 4, 4, 1, 1, 8]], 32476],
      [[{ $rep: 0, n: 1000000 }], 235042058],
      [[{ $range: [1, 1000001] }], 533191335]
    ] },
    solution: {
      approach: `<p>Superset SOS DP for G, then inclusion–exclusion over all masks.</p>`,
      code: `
        class Solution {
            public int countAndZero(int[] a) {
                final int B = 20, MOD = 1_000_000_007, SZ = 1 << B;
                int[] g = new int[SZ];
                for (int x : a) g[x]++;
                for (int bit = 0; bit < B; bit++)                     // sum over supersets
                    for (int mask = 0; mask < SZ; mask++)
                        if ((mask & (1 << bit)) == 0) g[mask] += g[mask | (1 << bit)];
                long[] pow2 = new long[a.length + 1];
                pow2[0] = 1;
                for (int i = 1; i <= a.length; i++) pow2[i] = pow2[i - 1] * 2 % MOD;
                long ans = 0;
                for (int mask = 0; mask < SZ; mask++) {
                    long ways = (pow2[g[mask]] - 1 + MOD) % MOD;      // subsets whose AND ⊇ mask
                    if ((Integer.bitCount(mask) & 1) == 1) ans = (ans - ways + MOD) % MOD;
                    else ans = (ans + ways) % MOD;
                }
                return (int) ans;
            }
        }`,
      alt: [{ lang: 'python', code: `
MOD = 1_000_000_007

def count_and_zero(a):
    B = 20
    g = [0] * (1 << B)
    for x in a:
        g[x] += 1
    for _ in range(B):                                # sum over supersets, one bit per round
        lo, hi = g[0::2], g[1::2]                     # masks without / with the lowest bit
        g = [x + y for x, y in zip(lo, hi)] + hi      # rotate the bit order; B rounds restore it
    pow2 = [1] * (len(a) + 1)
    for i in range(1, len(a) + 1):
        pow2[i] = pow2[i - 1] * 2 % MOD
    odd = [0]                                         # odd[mask] = popcount parity
    for _ in range(B):
        odd += [1 - p for p in odd]
    ans = 0
    for c, p in zip(g, odd):
        ways = pow2[c] - 1                            # subsets whose AND contains the mask
        ans += -ways if p else ways
    return ans % MOD` }, { lang: 'js', code: `
function countAndZero(a) {
  const B = 20, MOD = 1000000007, SZ = 1 << B;
  const g = new Int32Array(SZ);
  for (const x of a) g[x]++;
  for (let bit = 0; bit < B; bit++)                      // sum over supersets
    for (let mask = 0; mask < SZ; mask++)
      if (!(mask & (1 << bit))) g[mask] += g[mask | (1 << bit)];
  const pow2 = new Array(a.length + 1);
  pow2[0] = 1;
  for (let i = 1; i <= a.length; i++) pow2[i] = (pow2[i - 1] * 2) % MOD;   // < 2^31, safe
  let ans = 0, parity = new Uint8Array(SZ);
  for (let mask = 1; mask < SZ; mask++) parity[mask] = parity[mask >> 1] ^ (mask & 1);
  for (let mask = 0; mask < SZ; mask++) {
    const ways = (pow2[g[mask]] - 1 + MOD) % MOD;
    ans = parity[mask] ? (ans - ways + MOD) % MOD : (ans + ways) % MOD;
  }
  return ans;
}` }, { lang: 'cpp', code: `
class Solution {
public:
    int countAndZero(vector<int>& a) {
        const int B = 20, MOD = 1'000'000'007, SZ = 1 << B;
        vector<int> g(SZ, 0);
        for (int x : a) g[x]++;
        for (int bit = 0; bit < B; bit++)                     // sum over supersets
            for (int mask = 0; mask < SZ; mask++)
                if (!(mask & (1 << bit))) g[mask] += g[mask | (1 << bit)];
        vector<long long> pow2(a.size() + 1, 1);
        for (size_t i = 1; i < pow2.size(); i++) pow2[i] = pow2[i - 1] * 2 % MOD;
        long long ans = 0;
        for (int mask = 0; mask < SZ; mask++) {
            long long ways = (pow2[g[mask]] - 1 + MOD) % MOD;
            if (__builtin_popcount(mask) & 1) ans = (ans - ways + MOD) % MOD;
            else ans = (ans + ways) % MOD;
        }
        return (int)ans;
    }
};` }],
      complexity: `<p>O(B·2<sup>B</sup> + n) time, O(2<sup>B</sup>) space, B = 20.</p>`,
      followUps: ['Count subsets with OR = full mask (dual: sum over subsets).', 'Count subsets with AND exactly equal to X for every X (Möbius inversion of the 2<sup>G</sup> − 1 values).']
    }
  });

  // =====================================================================
  // QUIZ
  // =====================================================================
  quiz.push({ q: 'A problem says "n ≤ 16 cities, visit all of them exactly once, minimise distance". Which complexity is the intended solution?', options: ['O(2<sup>n</sup> · n<sup>2</sup>) Held-Karp', 'O(n!) permutations', 'O(n<sup>3</sup>) Floyd-Warshall', 'O(n log n) greedy nearest neighbour'], answer: 0, explain: '2<sup>16</sup>·16² ≈ 1.7·10<sup>7</sup>. n! = 2·10<sup>13</sup> is too slow, Floyd-Warshall gives pairwise distances not tours, and nearest-neighbour greedy is not optimal.' });
  quiz.push({ q: 'In the assignment DP dp[mask], why don\'t we need the worker index in the state?', options: ['Workers are assigned in fixed order, so the next worker is bitCount(mask)', 'Because all workers are identical', 'Because the cost matrix is symmetric', 'We do need it; dp[mask][worker] is required'], answer: 0, explain: 'If worker 0 is placed first, then worker 1, …, the number of taken jobs equals the number of placed workers. The mask determines the worker.' });
  quiz.push({ q: 'Iterating all submasks of every mask of n bits with <code>sub = (sub − 1) &amp; mask</code> costs in total…', options: ['O(3<sup>n</sup>)', 'O(4<sup>n</sup>)', 'O(n · 2<sup>n</sup>)', 'O(2<sup>n</sup>)'], answer: 0, explain: 'Each element is in one of three states: not in mask, in mask but not sub, in sub. So the number of (mask, sub) pairs is 3<sup>n</sup>.' });
  quiz.push({ q: 'In digit DP, why is it safe to memoise only states with tight = false?', options: ['For each position there is only one tight prefix, so tight states never repeat', 'Tight states always return 0', 'Tight states are faster to compute', 'Because leading zeros are ignored'], answer: 0, explain: 'The tight path follows N\'s own digits — a single chain. Free states, on the other hand, are shared by many prefixes and are worth caching.' });
  quiz.push({ q: 'count(L..R) of numbers with property P is computed as…', options: ['f(R) − f(L − 1), where f(N) counts in [0, N]', 'f(R) − f(L)', 'f(R − L)', 'f(R) + f(L) − 1'], answer: 0, explain: 'f(R) counts [0, R], f(L − 1) counts [0, L − 1]; the difference is exactly [L, R]. Using f(L) would wrongly exclude L itself.' });
  quiz.push({ q: 'Rolling a die until you see a 6. Expected number of rolls?', options: ['6', '3.5', '5', '36'], answer: 0, explain: 'E = 1 + (5/6)·E ⇒ E = 6. In general a success with probability p takes 1/p tries on average.' });
  quiz.push({ q: 'An expected-value answer must be printed as P · Q<sup>−1</sup> mod 10<sup>9</sup>+7. How do you divide by Q?', options: ['Multiply by Q<sup>p−2</sup> mod p (Fermat)', 'Use integer division Q', 'Use doubles and round', 'Multiply by Q mod p'], answer: 0, explain: 'p is prime, so Q<sup>p−1</sup> ≡ 1 and Q<sup>p−2</sup> is the modular inverse. Fast exponentiation computes it in O(log p).' });
  quiz.push({ q: 'dp[i] = nums[i] + max(dp[i−k..i−1]). Best data structure for the max?', options: ['Monotonic deque (O(1) amortised)', 'Sorted array with insertion (O(k))', 'HashMap', 'Stack of all dp values'], answer: 0, explain: 'A sliding-window maximum over dp values: indices with dominated dp are discarded, the front is the window max.' });
  quiz.push({ q: 'Frog 3: dp[i] = min<sub>j</sub> dp[j] + (h<sub>i</sub> − h<sub>j</sub>)² + C. After expanding, the line for j has…', options: ['slope −2h<sub>j</sub>, intercept dp[j] + h<sub>j</sub>²', 'slope h<sub>j</sub>², intercept dp[j]', 'slope dp[j], intercept −2h<sub>j</sub>', 'slope −2h<sub>i</sub>, intercept h<sub>i</sub>²'], answer: 0, explain: '(h<sub>i</sub> − h<sub>j</sub>)² = h<sub>i</sub>² − 2h<sub>i</sub>h<sub>j</sub> + h<sub>j</sub>². With x = h<sub>i</sub>: slope −2h<sub>j</sub>, intercept dp[j] + h<sub>j</sub>²; h<sub>i</sub>² + C is added after the min.' });
  quiz.push({ q: 'Divide &amp; conquer optimisation requires…', options: ['opt(i) ≤ opt(i + 1) within a layer (e.g. cost satisfies the quadrangle inequality)', 'The cost to be linear', 'K = 2', 'All values to be distinct'], answer: 0, explain: 'Monotone split points let solve(l, r, optL, optR) restrict each half\'s search range. QI on the cost is the usual sufficient condition.' });
  quiz.push({ q: 'Knuth optimisation scans k in which range for cell (i, j)?', options: ['[opt[i][j−1], opt[i+1][j]]', '[i, j − 1]', '[opt[i][j+1], opt[i−1][j]]', '[0, n − 1]'], answer: 0, explain: 'Knuth\'s condition sandwiches the optimum between the optima of the two shorter neighbouring intervals; the scan lengths telescope to O(N) per diagonal → O(N²) total.' });
  quiz.push({ q: 'Why does Knuth optimisation NOT apply to matrix-chain multiplication?', options: ['The merge cost p<sub>i−1</sub>·p<sub>k</sub>·p<sub>j</sub> depends on the split k', 'Because N is too small', 'Because the DP is a max, not a min', 'It does apply'], answer: 0, explain: 'Knuth needs dp[i][j] = min<sub>k</sub>(dp[i][k] + dp[k+1][j]) + w(i, j) with w independent of k. Matrix chain\'s extra cost depends on k.' });
  quiz.push({ q: 'In SOS DP, which loop must be outermost?', options: ['The bit loop', 'The mask loop', 'Either', 'Neither — use recursion'], answer: 0, explain: 'Process one dimension (bit) completely before the next, like 2D prefix sums row-then-column. Swapping loops counts submasks multiple times.' });
  quiz.push({ q: 'a[i] &amp; a[j] == 0 is equivalent to…', options: ['a[j] is a submask of ~a[i] (within the bit width)', 'a[j] is a superset of a[i]', 'a[i] == a[j]', 'a[i] | a[j] == 0'], answer: 0, explain: 'No common bit means every bit of a[j] lies in the complement of a[i]. That turns pair questions into submask queries answered by SOS DP.' });

  // =====================================================================
  // INTERVIEW Q&A
  // =====================================================================
  interview.push({ q: 'How do you recognise that a problem wants bitmask DP?', level: 'A', a: `<p>Three signals together: (1) a <b>tiny n</b> — 15 to 20, sometimes 24 — which is far too small for an "ordinary" problem; (2) the brute force tries <b>every order or every pairing</b> (n!); (3) the future depends only on <b>which</b> items are used, not in what order. Then the state is a subset as a bitmask, often plus "the last item" (TSP) or nothing else when the next actor is implied by popcount (assignment). I also do the budget check: 2<sup>n</sup> states × transitions, and the memory 2<sup>n</sup> × extra × bytes, before writing code.</p>`, followUps: ['What if n = 40? (Meet in the middle: two halves of 2<sup>20</sup>.)', 'How do you reconstruct the chosen order?'] });
  interview.push({ q: 'Explain Held-Karp and its complexity. Why is it still exponential, and what do real routing systems use?', level: 'A', a: `<p>dp[mask][v] = cheapest path from the start that visits exactly mask and ends at v. Transition: extend by one unvisited city. Answer: close the tour from the best last city. States 2<sup>n</sup>·n, transitions n each → O(2<sup>n</sup>·n<sup>2</sup>) time and O(2<sup>n</sup>·n) memory. It's exponential because TSP is NP-hard; Held-Karp is still the best known exact worst-case bound. Production routing (delivery fleets) uses heuristics and metaheuristics — 2-opt/Or-opt, Lin-Kernighan, guided local search (OR-Tools), or branch-and-cut (Concorde) for exact large instances. Bitmask DP is used for small exact subproblems, like optimising one driver's 12 stops.</p>`, followUps: ['How would you add time windows?', 'How to cut memory in half?'] });
  interview.push({ q: 'Walk me through a digit DP. What is the "tight" flag and why do we need a "started" flag?', level: 'A', a: `<p>We count numbers in [0, N] with a digit property by building them left to right. <b>tight</b> means "every digit so far equals N's digit", so the current digit is capped by N[pos]; once we go below, we're free (0..9) for the rest. Free states depend only on (pos, property-state), so we memoise them; tight states form a single chain. <b>started</b> distinguishes leading zeros from real zeros: for "all digits distinct" or "count of zeros", 007 must behave like 7, so zeros before the first non-zero digit must not update the property. Range [L, R] = f(R) − f(L − 1).</p>`, followUps: ['How do you reuse the memo across 10<sup>5</sup> queries?', 'How do you handle L and R given as 10<sup>5</sup>-digit strings?'] });
  interview.push({ q: 'How would you find the K-th smallest number whose digit sum is S?', level: 'E', a: `<p>Use the digit-DP counting table as an oracle and descend greedily. Precompute ways[len][s] = number of len-digit strings (leading zeros allowed) with digit sum s. First choose the length: count numbers of length 1, 2, … with digit sum S (first digit 1..9 then ways[len−1][S − d]) until the running total reaches K. Then fix digits left to right: for each candidate digit d (starting from 1 for the first position, 0 afterwards), c = ways[remaining][S − sum − d]; if K ≤ c, pick d; else K −= c. Complexity O(length × 10). This "count-then-descend" pattern also finds the K-th lexicographic string, K-th permutation, etc.</p>`, followUps: ['What if there is also an upper bound N?', 'How would you verify it?'] });
  interview.push({ q: 'Forward vs backward in probability/expected-value DP — how do you choose?', level: 'A', a: `<p>Ask what is being aggregated. <b>Probability of being in a state</b> starts at one known source (probability 1 at the start), so push forward: P[next] += P[cur]·p. <b>Expected remaining cost</b> is known at the ends (0 at terminal states), so pull backward: E[s] = cost + Σ p·E[next]. Backward expected-value DP naturally handles "until something happens" processes. If states can loop, you get equations — a self-loop solves by algebra (E = (1 + rest)/(1 − p)); general cycles need Gaussian elimination or value iteration. Also check linearity of expectation first; it often removes the DP entirely.</p>`, followUps: ['Expected value with cycles among 300 states?', 'When is Monte-Carlo acceptable?'] });
  interview.push({ q: 'Explain linearity of expectation with an example where it avoids a DP.', level: 'I', a: `<p>E[X + Y] = E[X] + E[Y] always, even if X and Y are dependent. So if a quantity is a sum of indicators, its expectation is the sum of their probabilities. Example: expected number of fixed points in a random permutation of n cards: each card stays with probability 1/n, so the answer is n·(1/n) = 1. Another: expected number of distinct values when drawing m times from n: Σ over values of P(value appears) = n·(1 − (1 − 1/n)<sup>m</sup>). Both would be painful as DPs over states.</p>`, followUps: ['Expected number of inversions in a random permutation?', 'Coupon collector expected time?'] });
  interview.push({ q: 'Your DP is O(N²) because dp[i] takes a max over a set of previous j. How do you speed it up?', level: 'A', a: `<p>Keep the recurrence, change the query. Classify the "allowed j" set: (1) last k indices → <b>monotonic deque</b>, O(1) amortised; (2) prefix by value (a[j] &lt; a[i]) → <b>Fenwick tree</b> over compressed values, O(log N) (max-Fenwick only if values only increase); (3) arbitrary value range → <b>segment tree</b>; (4) "latest interval ending before t" → binary search / ordered map (<code>TreeMap</code>, <code>std::map</code>, <code>bisect</code> on a sorted list); (5) the term is a product a[i]·b[j] → <b>convex hull trick / Li Chao</b>; (6) cost(j, i) with monotone argmin in a layered DP → <b>divide &amp; conquer</b> or <b>Knuth</b>. I'd validate the faster version against the O(N²) one on random inputs.</p>`, followUps: ['When can\'t you use a max-Fenwick?', 'What if both conditions j &lt; i and a[j] &lt; a[i] and b[j] &lt; b[i] apply? (CDQ divide & conquer.)'] });
  interview.push({ q: 'What is the convex hull trick and when does the O(N) deque version apply?', level: 'E', a: `<p>If dp[i] = min<sub>j</sub>(m<sub>j</sub>·x<sub>i</sub> + b<sub>j</sub>) + g(i), each j is a line and we query the lower envelope at x<sub>i</sub>. Lines that are never minimal are removed with the intersection test (l2 is useless if x(l1, l3) ≤ x(l1, l2), done with cross-multiplication). The <b>O(N) deque</b> needs slopes inserted in monotone order (decreasing for min) <i>and</i> queries in monotone order (increasing), so a front pointer only moves forward. Sorted slopes but random queries → binary search on the hull, O(log N). Nothing sorted → Li Chao tree (O(log C)) or a dynamic hull. Watch overflow in the intersection test — products can need 128 bits.</p>`, followUps: ['How does a Li Chao tree insert a line?', 'How do you handle equal slopes?'] });
  interview.push({ q: 'Explain the Li Chao tree. Why does each insertion recurse into only one child?', level: 'E', a: `<p>A segment tree over the x-domain; each node stores one line — the one that is best at the node's midpoint. Inserting a new line: compare with the stored line at mid; the winner stays, the loser moves down. Two distinct lines intersect at most once, so the loser can beat the winner only on one side of mid — the side where their order at the left endpoint differs from their order at mid. Recurse there only → O(log C) per insertion. A query walks root to leaf, taking the min of the stored lines at x → O(log C). It never computes intersections, which avoids overflow and floating-point issues, and supports arbitrary insertion/query order.</p>`, followUps: ['How to support line segments valid only on [l, r]?', 'What if x is up to 10<sup>18</sup>?'] });
  interview.push({ q: 'State the quadrangle inequality and explain why it gives monotone split points.', level: 'E', a: `<p>QI: for a ≤ b ≤ c ≤ d, w(a, c) + w(b, d) ≤ w(a, d) + w(b, c) — "crossing intervals cost no more than nested ones". Suppose i &lt; i' but opt(i') = j' &lt; j = opt(i). Apply QI to j' ≤ j ≤ i ≤ i' and add dp values: [dp[j] + w(j, i')] − [dp[j'] + w(j', i')] ≤ [dp[j] + w(j, i)] − [dp[j'] + w(j', i)] &lt; 0, so j would also beat j' for i' — contradiction. Hence opt is monotone, which powers D&amp;C optimisation; with interval-monotonicity it also gives Knuth's two-sided bound. Examples: (sum)² with non-negative values, distance-to-median costs, sums (equality).</p>`, followUps: ['Give a cost that violates QI.', 'How would you check QI empirically?'] });
  interview.push({ q: 'D&C optimisation vs Knuth optimisation vs Aliens trick — when do you use which?', level: 'E', a: `<p><b>D&amp;C</b>: layered "split into K groups" DP with monotone opt along i; O(K·N log N); simple and robust. <b>Knuth</b>: interval DPs dp[i][j] = min<sub>k</sub> dp[i][k] + dp[k+1][j] + w(i, j) with QI + monotone w; O(N²) instead of O(N³). It also applies to layered DPs giving O(N²) independent of K — better when K ~ N. <b>Aliens (WQS/Lagrangian)</b>: when answer(K) is convex in K, drop the K dimension by charging λ per group and binary-searching λ; each check is a 1D DP (often sped up by CHT or a monotone queue): O(N log N log C). Rule of thumb: small K → D&amp;C, interval DP → Knuth, huge K with convexity → Aliens.</p>`, followUps: ['How do you recover the exact K in the Aliens trick when there are ties?', 'Can you combine D&C with CHT?'] });
  interview.push({ q: 'What is SOS DP, and how would you count pairs (i, j) with a[i] &amp; a[j] = 0 for N = 10<sup>6</sup>, values &lt; 2<sup>20</sup>?', level: 'A', a: `<p>SOS (sum over subsets) computes F[mask] = Σ A[sub] for all sub ⊆ mask in O(B·2<sup>B</sup>) by processing one bit at a time: for each bit, masks with that bit add the value of the mask without it — an n-dimensional prefix sum. For the pairs: cnt[v] = frequency; F = SOS(cnt); a[j] is compatible with a[i] iff a[j] ⊆ ~a[i], so the answer is Σ<sub>i</sub> F[FULL ^ a[i]] (ordered pairs, including i = j when a[i] = 0). Total ≈ 2·10<sup>7</sup> + 10<sup>6</sup> operations instead of 10<sup>12</sup>.</p>`, followUps: ['Unordered pairs with i &lt; j?', 'Pairs with a[i] | a[j] == X for every X?'] });
  interview.push({ q: 'How do you test an optimised DP (CHT, D&C, Knuth) to be confident it is correct?', level: 'I', a: `<p>Keep the slow reference: the plain O(N²)/O(N³)/O(K·N²) DP is short and obviously correct. Write a <b>random stress test</b>: tiny sizes (n ≤ 10), small value ranges (0..9) to force ties and equal values, many iterations, fixed seed for reproducibility; compare outputs; on mismatch print the smallest failing input. Add edge cases by hand: n = 1, K = 1, K = n, all equal values, strictly monotone inputs, maximum values for overflow. For floating-point DPs compare with tolerance; for probability problems, also compare with a Monte-Carlo simulation. Every solution in this module was verified this way.</p>`, followUps: ['How do you shrink a failing random case?', 'How would you test for overflow?'] });
  interview.push({ q: 'How has AI changed the way you would approach an advanced DP question in an interview or at work?', level: 'I', a: `<p>Writing the template code (Held-Karp, digit DP, CHT, Li Chao, SOS) is now cheap — an assistant produces it instantly. The value moved to the parts AI gets wrong without supervision: choosing the <b>minimal state</b>, verifying the <b>preconditions</b> (sorted slopes for monotone CHT, quadrangle inequality for D&amp;C/Knuth, convexity for Aliens), the <b>complexity and memory budget</b>, overflow analysis, and testing. My workflow: derive the recurrence myself, ask AI for a brute-force reference and a random stress harness, let it draft the optimised version, and then I review invariants and boundary conditions. In interviews I still must explain all of it without help.</p>`, followUps: ['Give an example where an AI-suggested optimisation was silently wrong.', 'What would you never delegate?'] });

  registerModule({
    id: 'dsa23',
    title: 'Advanced Dynamic Programming',
    intro: `<p>You already know DP as "remember answers to sub-problems". This expert module is about the two things that separate a good DP from a great one: <b>clever states</b> and <b>fast transitions</b>.</p>
      <p><b>Clever states:</b> a whole <i>set</i> of visited items squeezed into one integer (bitmask DP — travelling salesman, assignment), a number up to 10<sup>18</sup> handled one digit at a time with a "tight" flag (digit DP), and states that hold <i>probabilities</i> or <i>expected values</i> instead of counts. <b>Fast transitions:</b> when the DP formula is right but O(N<sup>2</sup>) or O(N<sup>3</sup>) is too slow, you keep the formula and speed up the "best previous choice" with a monotonic deque, a Fenwick/segment tree, the <b>convex hull trick</b> or a <b>Li Chao tree</b>, the <b>divide &amp; conquer</b> optimisation, or <b>Knuth's</b> optimisation. Finally, <b>SOS DP</b> aggregates over all submasks in O(n·2<sup>n</sup>).</p>
      <p>Every topic starts with an everyday analogy, then a step-by-step visualizer you can feed your own input, worked examples, a guided problem with a dry run, and an expert deep dive. These are the tools behind hard rounds at quant firms, Google-level onsites and competitive programming — and the reasoning (state design, preconditions, budgets) is exactly what you must still own when an AI writes the boilerplate for you.</p>`,
    goals: [
      'Design bitmask DP states for "every order / every pairing" problems with n ≤ 20 (Held-Karp TSP, assignment with the popcount trick, submask enumeration in O(3<sup>n</sup>))',
      'Write a digit DP with tight / started flags to count numbers in [L, R] up to 10<sup>18</sup> with digit properties, and use it to find the K-th such number',
      'Build probability DPs (push forward) and expected-value DPs (pull backward), including self-loops and answers modulo 10<sup>9</sup>+7',
      'Speed up "best previous j" transitions with a monotonic deque, Fenwick/segment trees, or an ordered map (TreeMap / std::map / sorted list + bisect)',
      'Recognise line-shaped transitions and apply the convex hull trick (deque, binary search) or a Li Chao tree, with overflow-safe intersection tests',
      'Apply divide &amp; conquer and Knuth optimisations, justify them with the quadrangle inequality, and stress-test them against brute force',
      'Use SOS DP (subsets and supersets) for bitwise pair/subset counting in O(n·2<sup>n</sup>)'
    ],
    prereqs: `<p>DSA 17 and DSA 18 (Dynamic Programming I &amp; II) are essential. Also: DSA 4 (Bit Manipulation) for masks, DSA 3 (Number Theory — modular inverse) for expected values mod p, DSA 13 (Stacks &amp; Queues — monotonic deque), DSA 21 (Range Query Data Structures — Fenwick &amp; segment tree), and DSA 7 (Sorting) for coordinate compression.</p>`,
    hours: 24,
    langNotes: {
      java: `<p><b>Java:</b> <code>int</code> overflow wraps silently, so DP values, prefix sums and the cross-multiplications in the convex hull test use <code>long</code>; even then products of 10<sup>18</sup> and 10<sup>9</sup> need <code>Math.multiplyHigh</code> or <code>BigInteger</code>. Use an INF of <code>Integer.MAX_VALUE / 2</code> or <code>Long.MAX_VALUE / 4</code> so <code>INF + w</code> cannot wrap. The recursions here are shallow (digit DP at most 19 levels, divide &amp; conquer and Li Chao about log N), so the default stack of roughly 10,000 frames is plenty. A <code>dp[1 &lt;&lt; n][n]</code> table is 2<sup>n</sup> small arrays with object headers, so flatten it to one array when memory is tight, and avoid boxed <code>Integer</code> / <code>Long</code> tables on hot paths. <code>Integer.bitCount</code> gives the popcount. <code>TreeMap.floorEntry</code> is the ordered-map floor lookup (O(log N)); <code>PriorityQueue</code> is a min-heap, so a max-heap needs a reversed comparator. The sliding-window deque is <code>ArrayDeque</code>, which rejects <code>null</code>.</p>`,
      python: `<p><b>Python:</b> integers never overflow, so CHT cross-products and counts up to 10<sup>18</sup> need no care, and <code>pow(x, MOD - 2, MOD)</code> gives the modular inverse. The default recursion limit is 1,000 frames; the digit DPs (depth at most 19), divide &amp; conquer (depth log N) and Li Chao (depth log C, written as a loop here) stay far below it, and <code>functools.lru_cache</code> makes the memoisation one line. Speed is the real limit: a pure-Python loop over 2<sup>20</sup> masks times 20 bits takes many seconds, so use slice and list-comprehension tricks (or numpy) for SOS-style sweeps, and prefer <code>collections.deque</code> for the monotonic deque because <code>list.pop(0)</code> is O(n). There is no built-in ordered map: use <code>bisect</code> on a sorted list (O(n) inserts, fine for these sizes) or <code>sortedcontainers.SortedList</code>. <code>heapq</code> is a min-heap only, so negate values for a max-heap. <code>int.bit_count()</code> (3.10+) or <code>bin(x).count('1')</code> gives the popcount.</p>`,
      js: `<p><b>JavaScript:</b> <code>Number</code> is exact only up to 2<sup>53</sup>, so counts near 10<sup>18</sup>, hull cross-products and modular products like <code>a * b % MOD</code> (up to 10<sup>18</sup>) need <code>BigInt</code>; the solutions here use it where those values appear. Bitwise operators work on 32-bit signed integers, so masks stop at 31 bits (<code>1 &lt;&lt; 31</code> is negative), <code>%</code> keeps the sign of the dividend, and <code>|0</code> truncates to 32 bits. Node's default stack fits roughly 10,000 frames, which covers these shallow recursions. There is no built-in ordered map, deque or heap: the solutions use a sorted array with binary search, an array with head and tail indices (never <code>shift()</code>, it is O(n)), and, if you need a heap, a small <code>MinHeap</code> class with a comparator. <code>sort()</code> compares as strings unless you pass <code>(a, b) =&gt; a - b</code>. Use typed arrays (<code>Int32Array</code>, <code>Float64Array</code>) for big DP tables.</p>`,
      cpp: `<p><b>C++:</b> signed overflow is undefined behaviour, so use <code>long long</code> for DP values and counts, and <code>__int128</code> for the hull cross-multiplications that pass 2<sup>63</sup>; use <code>INT_MAX / 2</code> or <code>LLONG_MAX / 4</code> as INF so additions stay safe. The default stack is about 8 MB, which easily holds these shallow recursions, but declare large tables (<code>vector</code>, not a local array) on the heap. <code>__builtin_popcount</code> and <code>__builtin_ctz</code> give popcount and lowest set bit. <code>std::map</code> is an ordered O(log N) tree (<code>upper_bound</code> then <code>prev</code> for a floor lookup) and <code>unordered_map</code> is O(1) on average; <code>deque</code> backs the monotonic window; <code>priority_queue</code> is a max-heap, so use <code>greater&lt;&gt;</code> for a min-heap. <code>vector&lt;bool&gt;</code> is bit-packed and slower per access than <code>vector&lt;char&gt;</code>.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
