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
  function show(v) { return v === Infinity || v >= 1e9 ? '∞' : v; }
  function fmt2(x) { return Math.round(x * 100) / 100; }

  // =====================================================================
  // TOPIC 1 — Greedy mindset, greedy choice property, exchange-argument proofs
  // =====================================================================
  topics.push({
    title: 'The Greedy Mindset: Greedy Choice Property & Exchange-Argument Proofs',
    analogy: `<p>A supermarket has <b>one cashier</b> and five people waiting. One has a single bottle of water, another has a trolley with 80 items. If the cashier serves the trolley first, <i>everyone</i> behind it waits ages. If she serves the water-bottle person first, he is gone in 10 seconds and the others barely notice. Serving the <b>smallest basket first</b> makes the <b>total waiting</b> of the whole queue as small as possible.</p>
      <p>Notice how she decides: she does not plan the whole day. She looks at the queue, picks the person who looks best <i>right now</i>, and never changes her mind. That habit is <b>greedy</b>. The interesting question is not "how" (that is easy) but "<b>why is it safe?</b>" — and the tool that answers it is called an <b>exchange argument</b>: "if you served them in any other order, swapping two people would make things better, so my order cannot be beaten."</p>`,
    explain: `<p><b>Greedy algorithm</b> = build the answer one piece at a time; at every step take the piece that looks best <i>right now</i>, lock it in, and never undo it. Usually it is just <b>sort by a clever key + one loop</b>, or <b>a heap you keep popping</b>. Fast and short — but only correct when two things are true:</p>
      <ul>
        <li><b>Greedy choice property</b> — there is <i>some</i> best answer that contains the greedy first choice. In plain words: "taking the best-looking piece now can never hurt me."</li>
        <li><b>Optimal substructure</b> — after you lock in that piece, what is left is a <i>smaller copy of the same problem</i>, and solving that copy well + your piece = best overall.</li>
      </ul>
      <p><b>Tiny worked example (Shortest Job First).</b> Three customers need 3, 1 and 2 minutes. A customer's <i>waiting time</i> = how long until the cashier starts on them.</p>
      ${H.table(['order', 'waiting times', 'total wait'], [
        ['3, 1, 2', '0, 3, 4', H.c('r', '7')],
        ['2, 3, 1', '0, 2, 5', '7'],
        ['1, 2, 3 (shortest first)', '0, 1, 3', H.c('g', '4')]
      ])}
      <p><b>The exchange argument in one line:</b> look at any two <i>neighbours</i> in the queue, a long job <code>a</code> right before a short job <code>b</code>. Everybody else waits the same whichever of the two goes first. Only these two change: with <code>a</code> first, <code>b</code> waits <code>a</code> extra minutes; with <code>b</code> first, <code>a</code> waits <code>b</code> extra minutes. Swapping changes the total by <code>b − a</code>, which is <b>negative</b> when <code>a &gt; b</code>. So any order with a "long before short" pair can be improved → the best order has no such pair → it is sorted ascending. Greedy is proven.</p>
      ${H.arr([3, 1, 2], { label: 'before', hl: { 0: 'r', 1: 'r' } })}${H.arr([1, 3, 2], { label: 'swap 3↔1: total 7 → 5', hl: { 0: 'g', 1: 'g' } })}${H.arr([1, 2, 3], { label: 'swap 3↔2: total 5 → 4', hl: { 1: 'g', 2: 'g' } })}
      <p><b>Three tools every greedy needs</b> (you will reuse them in every topic of this module):</p>
      ${H.table(['tool', 'question it answers', 'how it sounds out loud'], [
        ['<b>Exchange argument</b>', 'Why is my order / choice safe?', '"Take any optimal answer that differs from mine. Swap one piece to match mine. It does not get worse. Repeat until it IS mine."'],
        ['<b>Greedy stays ahead</b>', 'Why does my running total never fall behind?', '"After k steps, my k-th choice is at least as good as anyone\'s k-th choice — so at the end I have at least as many."'],
        ['<b>Counterexample hunt</b>', 'Is greedy even correct here?', '"Let me try to break it with 2–4 items before I code it."']
      ])}
      <p>If you cannot find a counterexample in a minute <i>and</i> you can say one of the two proof sentences, greedy is a good bet. If you find a counterexample, switch to <b>Dynamic Programming</b> (DSA 17).</p>`,
    clues: [
      '"<b>Minimize the total / sum / average</b> waiting time or completion time" → sort by a key (often shortest first), prove with an adjacent swap.',
      '"In what <b>order</b> should we do the tasks / serve the people?" → find the pairwise rule "a before b if …", that rule is the comparator.',
      '<code>N ≤ 10<sup>5</sup></code> or <code>10<sup>6</sup></code> and an optimisation question → O(N log N) sort + sweep, not a DP over subsets.',
      '"Maximum / minimum number of …" where taking the "<b>earliest / smallest / cheapest</b>" thing first feels natural → test greedy with a tiny counterexample hunt first.',
      'The interviewer asks "<b>Why does that work?</b>" or "<b>Can you prove it?</b>" → they want an exchange argument or a stays-ahead argument, not "it seems right".',
      'Weights + times ("minimize Σ weight × finish time") → sort by the ratio <code>time / weight</code> (Smith\'s rule), proven by swapping neighbours.'
    ],
    code: [{ lang: 'java', code: `
      // The greedy template: 1) pick a key you can PROVE is safe, 2) sort (or heap) by it,
      // 3) one pass that locks choices in and never undoes them.
      long minTotalWaiting(int[] durations) {
          int[] d = durations.clone();          // do not mutate the caller's array
          Arrays.sort(d);                        // shortest job first (proved by adjacent swaps)
          long total = 0, clock = 0;             // long: totals can exceed 2^31
          for (int x : d) {
              total += clock;                    // this customer waited 'clock' minutes
              clock += x;                        // cashier is busy for x more minutes
          }
          return total;
      }`, alt: [{ lang: 'python', code: `# The greedy template: 1) pick a key you can PROVE is safe, 2) sort (or heap) by it,
# 3) one pass that locks choices in and never undoes them.
def min_total_waiting(durations):
    total = clock = 0                  # Python ints never overflow
    for x in sorted(durations):        # shortest job first; sorted() leaves the input alone
        total += clock                 # this customer waited 'clock' minutes
        clock += x                     # cashier is busy for x more minutes
    return total` }, { lang: 'js', code: `// The greedy template: 1) pick a key you can PROVE is safe, 2) sort (or heap) by it,
// 3) one pass that locks choices in and never undoes them.
function minTotalWaiting(durations) {
  const d = [...durations].sort((a, b) => a - b);   // copy; a comparator, or sort() compares strings
  let total = 0, clock = 0;
  for (const x of d) {
    total += clock;                    // this customer waited 'clock' minutes
    clock += x;                        // cashier is busy for x more minutes
  }
  return total;
}` }, { lang: 'cpp', code: `// The greedy template: 1) pick a key you can PROVE is safe, 2) sort (or heap) by it,
// 3) one pass that locks choices in and never undoes them.
long long minTotalWaiting(vector<int> d) {      // by value: sorting the copy keeps the caller's data
    sort(d.begin(), d.end());                   // shortest job first
    long long total = 0, clock = 0;             // long long: totals can exceed 2^31
    for (int x : d) {
        total += clock;
        clock += x;
    }
    return total;
}` }, { lang: 'csharp', code: `// The greedy template: 1) pick a key you can PROVE is safe, 2) sort (or heap) by it,
// 3) one pass that locks choices in and never undoes them.
long MinTotalWaiting(int[] durations)
{
    int[] d = (int[])durations.Clone();    // do not mutate the caller's array
    Array.Sort(d);                         // shortest job first (proved by adjacent swaps)
    long total = 0, clock = 0;             // long: totals can exceed 2^31
    foreach (int x in d)
    {
        total += clock;                    // this customer waited 'clock' minutes
        clock += x;                        // cashier is busy for x more minutes
    }
    return total;
}` }] }, { lang: 'java', code: `
      // Smith's rule: minimize sum of weight[i] * finishTime[i].
      // Put job a before job b when time[a] / weight[a] < time[b] / weight[b].
      // Cross-multiply (no doubles, no division by zero) and use long to avoid overflow.
      long minWeightedCompletion(int[] time, int[] weight) {
          int n = time.length;
          Integer[] order = new Integer[n];
          for (int i = 0; i < n; i++) order[i] = i;
          Arrays.sort(order, (a, b) -> Long.compare((long) time[a] * weight[b], (long) time[b] * weight[a]));
          long clock = 0, cost = 0;
          for (int i : order) {
              clock += time[i];                  // job i finishes at 'clock'
              cost += (long) weight[i] * clock;  // pay weight x finish time
          }
          return cost;
      }`, alt: [{ lang: 'python', code: `# Smith's rule: minimize sum of weight[i] * finishTime[i].
# Job a goes before job b when time[a] / weight[a] < time[b] / weight[b].
from functools import cmp_to_key

def min_weighted_completion(time, weight):
    # cross-multiply: exact, no floats, no division by zero
    order = sorted(range(len(time)), key=cmp_to_key(lambda a, b: time[a] * weight[b] - time[b] * weight[a]))
    clock = cost = 0
    for i in order:
        clock += time[i]               # job i finishes at 'clock'
        cost += weight[i] * clock      # pay weight x finish time
    return cost` }, { lang: 'js', code: `// Smith's rule: minimize sum of weight[i] * finishTime[i].
// Job a goes before job b when time[a] / weight[a] < time[b] / weight[b].
function minWeightedCompletion(time, weight) {
  // cross-multiply: exact for products below 2^53, no division by zero
  const order = time.map((_, i) => i).sort((a, b) => time[a] * weight[b] - time[b] * weight[a]);
  let clock = 0, cost = 0;
  for (const i of order) {
    clock += time[i];                  // job i finishes at 'clock'
    cost += weight[i] * clock;         // pay weight x finish time
  }
  return cost;
}` }, { lang: 'cpp', code: `// Smith's rule: minimize sum of weight[i] * finishTime[i].
// Job a goes before job b when time[a] / weight[a] < time[b] / weight[b].
long long minWeightedCompletion(const vector<int>& time, const vector<int>& weight) {
    vector<int> order(time.size());
    iota(order.begin(), order.end(), 0);
    // cross-multiply in long long: exact and overflow-free
    sort(order.begin(), order.end(), [&](int a, int b) {
        return (long long) time[a] * weight[b] < (long long) time[b] * weight[a];
    });
    long long clock = 0, cost = 0;
    for (int i : order) {
        clock += time[i];                          // job i finishes at 'clock'
        cost += (long long) weight[i] * clock;     // pay weight x finish time
    }
    return cost;
}` }, { lang: 'csharp', code: `// Smith's rule: minimize sum of weight[i] * finishTime[i].
// Put job a before job b when time[a] / weight[a] < time[b] / weight[b].
// Cross-multiply (no doubles, no division by zero) and use long to avoid overflow.
long MinWeightedCompletion(int[] time, int[] weight)
{
    int n = time.Length;
    int[] order = new int[n];
    for (int i = 0; i < n; i++) order[i] = i;
    Array.Sort(order, (a, b) => ((long)time[a] * weight[b]).CompareTo((long)time[b] * weight[a]));
    long clock = 0, cost = 0;
    foreach (int i in order)
    {
        clock += time[i];                  // job i finishes at 'clock'
        cost += (long)weight[i] * clock;   // pay weight x finish time
    }
    return cost;
}` }] }],
    codeTitle: ['Shortest Job First (the cleanest greedy)', 'Weighted version: Smith\'s rule with an exact comparator'],
    viz: {
      title: 'Exchange argument live: fix every "long before short" pair by swapping neighbours',
      input: '6 2 8 3 1',
      inputLabel: 'job durations in the current (bad) order, 2 to 7 numbers from 1 to 20',
      gen: function (input) {
        var a = parseNums(input, 'durations', 2, 7, 1, 20);
        function waits(arr) { var w = [], c = 0; arr.forEach(function (x) { w.push(c); c += x; }); return w; }
        function total(arr) { return waits(arr).reduce(function (s, x) { return s + x; }, 0); }
        function bar(arr, hl, label) {
          var w = waits(arr);
          return { type: 'bars', label: label || 'jobs in serving order (bar = duration)', values: arr.slice(), texts: arr.map(function (x, i) { return x + ' (waits ' + w[i] + ')'; }), hl: hl || {} };
        }
        var cur = a.slice(), frames = [], swaps = 0;
        frames.push({ narr: 'Here is some serving order. Each job waits for everything in front of it. Total waiting = <b>' + total(cur) + '</b>. Can we prove "shortest first" is the best? Let us take THIS order and improve it one swap at a time.', parts: [
          bar(cur), { type: 'vars', vals: { totalWait: total(cur), swaps: 0 } }
        ] });
        var changed = true;
        while (changed) {
          changed = false;
          for (var i = 0; i + 1 < cur.length; i++) {
            if (cur[i] > cur[i + 1]) {
              var x = cur[i], y = cur[i + 1], before = total(cur);
              frames.push({ narr: 'Neighbours <b>' + x + '</b> then <b>' + y + '</b>: a longer job sits right before a shorter one (an "inversion"). Everyone else waits the same either way. Only these two change: now ' + y + ' waits ' + x + ' extra; after a swap ' + x + ' would wait only ' + y + ' extra.', parts: [
                bar(cur, (function () { var h = {}; h[i] = 'bad'; h[i + 1] = 'bad'; return h; })()), { type: 'vars', vals: { totalWait: before, change: y + ' − ' + x + ' = ' + (y - x) }, hl: { change: 'cur' } }
              ] });
              cur[i] = y; cur[i + 1] = x; swaps++;
              frames.push({ narr: 'Swap them. Total waiting drops from ' + before + ' to <b>' + total(cur) + '</b> (exactly ' + (y - x) + '). An order with an inversion can always be improved, so the best order cannot have one.', parts: [
                bar(cur, (function () { var h = {}; h[i] = 'ok'; h[i + 1] = 'ok'; return h; })()), { type: 'vars', vals: { totalWait: total(cur), swaps: swaps }, hl: { totalWait: 'ok' } }
              ] });
              changed = true;
            }
          }
        }
        var worst = cur.slice().reverse(), nC = cur.length;
        frames.push({ narr: 'For contrast, the <b>worst</b> order is longest first (sorted descending): total waiting <b>' + total(worst) + '</b>. The biggest job would delay everybody behind it.', parts: [
          bar(worst, (function () { var h = {}; worst.forEach(function (_, k) { h[k] = 'bad'; }); return h; })(), 'worst order = sorted descending'), { type: 'vars', vals: { worstTotal: total(worst), bestTotal: total(cur) }, hl: { worstTotal: 'bad', bestTotal: 'ok' } }
        ] });
        frames.push({ narr: 'A quick formula check: in sorted order, the job at position i is waited for by the <b>n − 1 − i</b> jobs behind it. Smallest durations get the biggest multipliers — that is why ascending order wins.', parts: [
          { type: 'table', label: 'contribution of each job', columns: ['position i', 'duration', 'jobs behind (n−1−i)', 'adds'], rows: cur.map(function (x, k) { return [k, x, nC - 1 - k, x * (nC - 1 - k)]; }) },
          { type: 'vars', vals: { total: total(cur) }, hl: { total: 'ok' } }
        ] });
        frames.push({ narr: 'No inversions left → the order is sorted ascending, which is exactly what the greedy "shortest first" produces in one sort. Final total = <b>' + total(cur) + '</b>. ' + (swaps ? 'We needed ' + swaps + ' swaps and every one helped — that is the whole exchange-argument proof.' : 'Your input was already sorted: greedy order, nothing to fix.'), parts: [
          bar(cur, (function () { var h = {}; cur.forEach(function (_, k) { h[k] = 'sel'; }); return h; })(), 'optimal order = sorted ascending'), { type: 'vars', vals: { totalWait: total(cur), swaps: swaps }, hl: { totalWait: 'sel' } },
          { type: 'code', label: 'the greedy that the proof justifies', lang: 'java', code: 'Arrays.sort(d);\nfor (int x : d) { total += clock; clock += x; }', hl: { 1: 'ok', 2: 'ok' }, alt: {
            python: { code: 'd.sort()\nfor x in d: total, clock = total + clock, clock + x', map: {} },
            js: { code: 'd.sort((a, b) => a - b);\nfor (const x of d) { total += clock; clock += x; }', map: {} },
            cpp: { code: 'sort(d.begin(), d.end());\nfor (int x : d) { total += clock; clock += x; }', map: {} } } }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Shortest Job First, number by number',
        html: `<p>Durations <b>[3, 1, 2]</b> in that order: waits are 0, 3, 3+1 = 4 → total <b>7</b>. Sorted <b>[1, 2, 3]</b>: waits 0, 1, 1+2 = 3 → total <b>4</b>. Another way to see it: in sorted order the job at position i is waited for by the <code>n − 1 − i</code> jobs behind it, so total = 1·2 + 2·1 + 3·0 = 4. We want the <b>biggest</b> multiplier on the <b>smallest</b> duration — sorting ascending does exactly that (this is the rearrangement inequality in disguise).</p>
          ${H.table(['position', 'duration', 'jobs behind it', 'contributes'], [['0', '1', '2', '2'], ['1', '2', '1', '2'], ['2', '3', '0', '0'], ['', '', 'total', H.c('g', '4')]])}`
      },
      {
        title: '"Greedy stays ahead" on activity selection',
        html: `<p>Meetings (1,2) (3,4) (0,6) (5,7) (8,9). Greedy (earliest end) picks ends <b>2, 4, 7, 9</b>. Any other valid schedule, sorted by time, has its k-th end <b>≥</b> greedy's k-th end. Example: the schedule (0,6),(8,9) has ends 6, 9 — its 1st end 6 ≥ 2, its 2nd end 9 ≥ 4. Because greedy always finishes no later, whenever another schedule can fit one more meeting, greedy can fit it too → greedy has at least as many meetings. That is the second classic proof style (full details in the next topic).</p>
          ${H.table(['k', 'greedy k-th end', 'other schedule k-th end', 'greedy ahead?'], [['1', '2', '6', H.c('g', 'yes')], ['2', '4', '9', H.c('g', 'yes')], ['3', '7', '—', H.c('g', 'greedy has more')], ['4', '9', '—', H.c('g', 'greedy has more')]])}`
      },
      {
        title: 'Smith\'s rule: weights change the key',
        html: `<p>Job A takes 3 min and has weight 1; job B takes 1 min and weight 2 (B is a VIP). Cost = Σ weight × finish time.</p>
          ${H.table(['order', 'finish times', 'cost'], [['A, B', 'A=3, B=4', '1·3 + 2·4 = ' + H.c('r', '11')], ['B, A', 'B=1, A=4', '2·1 + 1·4 = ' + H.c('g', '6')]])}
          <p>Swap rule for neighbours a then b: cost changes by <code>w<sub>a</sub>·t<sub>b</sub> − w<sub>b</sub>·t<sub>a</sub></code>. So put a first exactly when <code>t<sub>a</sub>/w<sub>a</sub> &lt; t<sub>b</sub>/w<sub>b</sub></code>. A has 3/1 = 3, B has 1/2 = 0.5 → B first. With all weights equal this collapses back to Shortest Job First.</p>`
      },
      {
        title: 'Counterexample hunt: breaking two "obvious" greedies for 0/1 knapsack',
        html: `<p>Bag capacity 10, items cannot be cut.</p>
          ${H.table(['greedy idea', 'items (value, weight)', 'greedy gets', 'best', 'verdict'], [
            ['biggest value first', '(10,10) (7,5) (7,5)', '10', '7+7 = 14', H.c('r', 'broken')],
            ['lightest first', '(1,1) (10,10)', '1 (then 10 does not fit)', '10', H.c('r', 'broken')],
            ['best value/weight first', '(7,6) (5,5) (5,5)', '7 (ratio 1.17 beats 1, then 5 kg no longer fits)', '5+5 = 10', H.c('r', 'broken')]
          ])}
          <p>Each break took three items or fewer. That is the habit: before you trust a greedy, spend a minute trying to break it with tiny inputs. For whole items there is no safe greedy key — you need DP.</p>`
      }
    ],
    deepDive: `<h4>1. The exchange argument as a recipe you can say out loud</h4>
      <ol>
        <li>Let <b>G</b> = greedy's answer and <b>O</b> = any optimal answer.</li>
        <li>If they are equal, done. Otherwise find the <b>first place they differ</b> (first position, first chosen item…).</li>
        <li>Modify O at that place to agree with G (swap two neighbours, replace one item by greedy's item). Show the result is still <b>valid</b> and <b>no worse</b>.</li>
        <li>The modified O agrees with G in one more place. Repeat (induction) → G itself is optimal.</li>
      </ol>
      <p>Two flavours: <b>adjacent swap</b> (ordering problems: compute the cost change of swapping neighbours a, b; the sign gives the comparator) and <b>replace</b> (selection problems: swap an item of O for greedy's item; e.g. activity selection, fractional knapsack).</p>
      <h4>2. "Greedy stays ahead"</h4>
      <p>Define a measure after k steps (k-th finish time, distance reached, total value). Prove by induction that greedy's measure is at least as good as any other solution's after every k. Jump Game II and activity selection are classic stays-ahead proofs.</p>
      <h4>3. Matroids — why some greedies are always right</h4>
      <p>A <b>matroid</b> is a family of "allowed" sets with two rules: (a) any subset of an allowed set is allowed, (b) <b>exchange</b>: if A is allowed and bigger than allowed B, some element of A can be added to B keeping it allowed. The <b>Rado–Edmonds theorem</b>: "sort by weight, add an element if the set stays allowed" is optimal for <i>every</i> weight function <b>exactly</b> when the structure is a matroid. Examples: forests of a graph (graphic matroid → Kruskal's MST), sets of jobs that can all meet their deadlines (scheduling matroid → job sequencing), "any k items" (uniform matroid → top-k). 0/1 knapsack is <i>not</i> a matroid, which is why greedy fails there.</p>
      <h4>4. Comparators: the silent killer</h4>
      <ul>
        <li>A "subtract" comparator <code>a - b</code> overflows 32-bit ints for values near ±2·10<sup>9</sup> and sorts wrongly in Java (and is undefined behaviour in C++). Use <code>Integer.compare</code> / <code>Long.compare</code> in Java and <code>&lt;</code> in C++. Python keys and JS <code>a - b</code> are safe here because their numbers do not wrap.</li>
        <li>Ratio keys: compare <code>a/b</code> vs <code>c/d</code> as <code>a·d</code> vs <code>c·b</code> in 64-bit integers (<code>long</code> / <code>long long</code>; Python ints are unbounded) (positive denominators) — exact, no floating point ties.</li>
        <li>The comparator must be <b>transitive</b>. If it is not, Java's TimSort may throw <code>IllegalArgumentException: Comparison method violates its general contract!</code>, C++ <code>std::sort</code> has undefined behaviour (it can read out of bounds), and Python or JS quietly return a wrong order. Exchange-derived rules like "a before b if a+b &gt; b+a" (Largest Number) are transitive, but you should know why before relying on them.</li>
        <li>Ties: your proof must work for <i>any</i> tie order, or your code must break ties exactly the way the proof assumes.</li>
      </ul>
      <h4>5. When exact greedy does not exist: approximation</h4>
      <p>For NP-hard problems greedy is often the best <i>practical</i> tool: greedy <b>set cover</b> is within a factor ≈ ln n of optimal (and doing much better is NP-hard); for 0/1 knapsack, <code>max(ratio-greedy, best single item)</code> is at least half the optimum. Real schedulers, CDN cache placement and ad allocation run on such greedies.</p>
      <h4>6. Cost model</h4>
      <p>Almost every greedy is <b>O(N log N)</b> for the sort or heap plus O(N) for the sweep, O(1)–O(N) extra space. If you see O(N²), ask whether a heap, two pointers or DSU can find "the best next choice" faster.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant will write a greedy for almost any optimisation prompt in seconds — and it will sound confident even when the greedy is wrong. Greedy bugs are not crashes; they are <i>quietly wrong answers</i> on rare inputs, which is the worst kind of bug to ship.</p>
      <p><b>Use AI as a partner:</b></p>
      <ul>
        <li><code>Here is my greedy rule for X. Do NOT fix it. Try to find the smallest input (≤ 4 items) where it is not optimal, and show the optimal answer.</code></li>
        <li><code>Write a brute-force checker (try all orders / subsets, n ≤ 8) and a random test loop that compares it with my greedy for 10,000 cases.</code> — stress testing is the single best greedy safety net.</li>
        <li><code>Write the exchange-argument proof for sorting by key K in 5 numbered steps; mark the step where validity is checked.</code> Then read it critically.</li>
      </ul>
      <p><b>Where AI goes wrong:</b> uses <code>a - b</code> comparators, sorts by the wrong key (start instead of end), forgets ties, "proves" a greedy with a hand-wavy paragraph, or applies ratio greedy to 0/1 knapsack.</p>
      <p><b>What you must still own:</b> spotting that a problem is greedy from its wording, inventing the counterexample, and saying the exchange argument out loud in an interview. Interviewers in 2026 increasingly ask "why does this work?" precisely because the code itself is cheap now.</p>`,
    problems: [
      {
        title: 'Minimum Total Waiting Time',
        level: 'Easy',
        tags: ['greedy', 'sorting', 'exchange argument'],
        companies: ['Amazon', 'Google', 'Microsoft'],
        statement: `<p>A database must run <code>N</code> queries one after another. Query <code>i</code> takes <code>durations[i]</code> seconds. The <b>waiting time</b> of a query is the total time spent before it <i>starts</i> (the first query waits 0). You may run the queries in any order. Return the <b>minimum possible total waiting time</b>.</p>`,
        constraints: `1 ≤ N ≤ 10<sup>5</sup>, 1 ≤ durations[i] ≤ 10<sup>4</sup> (answer may exceed 2<sup>31</sup> → use a 64-bit integer)`,
        example: `${H.arr([3, 2, 1, 2, 6], { label: 'durations' })}${H.arr([1, 2, 2, 3, 6], { label: 'best order', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g', 4: 'g' } })}
          <p>Output <b>17</b>. In sorted order the waits are ${H.c('g', '0, 1, 3, 5, 8')} → 0 + 1 + 3 + 5 + 8 = 17. Any order where a longer query runs just before a shorter one can be improved by swapping them, so sorted ascending is optimal.</p>`,
        brute: {
          why: `<p>Try every order (N! permutations), add up the waits, keep the smallest. N = 12 already means ~479 million orders. The wasted work: we never use the fact that "a long query in front of a short one is always a mistake".</p>`,
          code: { lang: 'java', code: `
            long best;

            long bruteMinWaiting(int[] d) {
                best = Long.MAX_VALUE;
                permute(d, new boolean[d.length], 0, 0, 0);
                return best;
            }

            // used[] marks queries already scheduled; clock = time elapsed; total = waits so far
            void permute(int[] d, boolean[] used, int placed, long clock, long total) {
                if (placed == d.length) { best = Math.min(best, total); return; }
                for (int i = 0; i < d.length; i++) {
                    if (used[i]) continue;
                    used[i] = true;
                    permute(d, used, placed + 1, clock + d[i], total + clock); // query i waits 'clock'
                    used[i] = false;
                }
            }`, alt: [
          { lang: 'python', code: `def minimum_waiting_time(d):
    best = float('inf')

    # used[] marks queries already scheduled; clock = time elapsed; total = waits so far
    def permute(used, placed, clock, total):
        nonlocal best
        if placed == len(d):
            best = min(best, total)
            return
        for i in range(len(d)):
            if used[i]:
                continue
            used[i] = True
            permute(used, placed + 1, clock + d[i], total + clock)  # query i waits 'clock'
            used[i] = False

    permute([False] * len(d), 0, 0, 0)
    return best` },
          { lang: 'js', code: `function minimumWaitingTime(d) {
  let best = Infinity;
  // used[] marks queries already scheduled; clock = time elapsed; total = waits so far
  function permute(used, placed, clock, total) {
    if (placed === d.length) { best = Math.min(best, total); return; }
    for (let i = 0; i < d.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      permute(used, placed + 1, clock + d[i], total + clock); // query i waits 'clock'
      used[i] = false;
    }
  }
  permute(new Array(d.length).fill(false), 0, 0, 0);
  return best;
}` },
          { lang: 'cpp', code: `// used[] marks queries already scheduled; clock = time elapsed; total = waits so far
void permute(vector<int>& d, vector<bool>& used, int placed, long long clock, long long total, long long& best) {
    if (placed == (int)d.size()) { best = min(best, total); return; }
    for (int i = 0; i < (int)d.size(); i++) {
        if (used[i]) continue;
        used[i] = true;
        permute(d, used, placed + 1, clock + d[i], total + clock, best); // query i waits 'clock'
        used[i] = false;
    }
}

long long minimumWaitingTime(vector<int> d) {
    long long best = LLONG_MAX;
    vector<bool> used(d.size(), false);
    permute(d, used, 0, 0, 0, best);
    return best;
}` },
          { lang: 'csharp', code: `long best;

long BruteMinWaiting(int[] d)
{
    best = long.MaxValue;
    Permute(d, new bool[d.Length], 0, 0, 0);
    return best;
}

// used[] marks queries already scheduled; clock = time elapsed; total = waits so far
void Permute(int[] d, bool[] used, int placed, long clock, long total)
{
    if (placed == d.Length) { best = Math.Min(best, total); return; }
    for (int i = 0; i < d.Length; i++)
    {
        if (used[i]) continue;
        used[i] = true;
        Permute(d, used, placed + 1, clock + d[i], total + clock); // query i waits 'clock'
        used[i] = false;
    }
}` }
        ] }
        },
        mcq: {
          q: 'Two neighbouring queries take 5 s and 2 s, in that order. If you swap them, how does the total waiting time change?',
          options: ['It goes up by 3', 'It goes down by 3', 'It does not change', 'It depends on the queries further back'],
          answer: 1,
          explain: 'Only these two are affected. Before: the 2 s query waits 5 extra. After: the 5 s query waits 2 extra. Change = 2 − 5 = −3. Queries behind both still wait 5 + 2 for the pair, so they are unaffected.'
        },
        hints: [
          `<p><b>Aha:</b> compare two neighbours a, b. Swapping them changes the total waiting by exactly <code>b − a</code>, nothing else moves. So a longer query should never sit directly before a shorter one.</p>`,
          `<p>An order with no "longer before shorter" neighbours is simply <b>sorted ascending</b>. So: sort, then simulate a clock. Equivalent formula: in sorted order, <code>durations[i]</code> is waited for by the <code>N − 1 − i</code> queries behind it.</p>`,
          `<p>Edge cases: N = 1 → 0; use a 64-bit total (<code>long</code> / <code>long long</code>; Python ints never overflow and a JS Number is exact up to 2<sup>53</sup>) (10<sup>5</sup> queries × 10<sup>4</sup> s × 10<sup>5</sup> waiters ≈ 10<sup>14</sup>). Recipe: sort → total = 0, clock = 0 → for each d: total += clock; clock += d → return total.</p>`
        ],
        tests: { sig: 'int[] -> long', fn: 'minimumWaitingTime', cases: [
          [[[3, 2, 1, 2, 6]], 17],
          [[[5]], 0],
          [[[1, 1]], 1],
          [[[4, 3, 2, 1]], 10],
          [[[7, 7, 7, 7]], 42],
          [[[1, 10000, 2, 9999, 3]], 10015],
          [[[10000, 1]], 1],
          [[{$rep: 10000, n: 100000}], 49999500000000],
          [[{$range: [10000, 0, -1]}], 166666665000]
        ] },
        solution: {
          approach: `<p>Sort ascending (Shortest Job First), then add up each query's start time. The adjacent-swap exchange argument proves no order beats it.</p>`,
          code: `
            import java.util.*;

            class Solution {
                public long minimumWaitingTime(int[] durations) {
                    int[] d = durations.clone();   // keep the caller's array untouched
                    Arrays.sort(d);                 // shortest first
                    long total = 0;
                    int n = d.length;
                    for (int i = 0; i < n; i++) {
                        // d[i] delays every query that comes after it: (n - 1 - i) of them
                        total += (long) d[i] * (n - 1 - i);
                    }
                    return total;
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().minimumWaitingTime(new int[]{3, 2, 1, 2, 6})); // 17
                }
            }`,
          alt: [{ lang: 'python', code: `def minimum_waiting_time(durations):
    d = sorted(durations)          # shortest job first
    n = len(d)
    # d[i] is waited for by the n - 1 - i queries behind it
    return sum(x * (n - 1 - i) for i, x in enumerate(d))

print(minimum_waiting_time([3, 2, 1, 2, 6]))  # 17`, run: true }, { lang: 'js', code: `function minimumWaitingTime(durations) {
  const d = Float64Array.from(durations).sort();   // numeric sort, caller's array untouched
  const n = d.length;
  let total = 0;
  // d[i] is waited for by the n - 1 - i queries behind it
  for (let i = 0; i < n; i++) total += d[i] * (n - 1 - i);
  return total;                                    // ≤ 5·10^13 < 2^53, so Number is exact
}` }, { lang: 'cpp', code: `class Solution {
public:
    long long minimumWaitingTime(vector<int> durations) {     // by value: a private copy to sort
        sort(durations.begin(), durations.end());               // shortest first
        long long total = 0, n = durations.size();
        for (long long i = 0; i < n; i++)
            total += (long long) durations[i] * (n - 1 - i);    // waited for by everyone behind it
        return total;
    }
};` }, { lang: 'csharp', code: `using System;

public class Solution
{
    public long MinimumWaitingTime(int[] durations)
    {
        int[] d = (int[])durations.Clone();   // keep the caller's array untouched
        Array.Sort(d);                        // shortest first
        long total = 0;
        int n = d.Length;
        for (int i = 0; i < n; i++)
        {
            // d[i] delays every query that comes after it: (n - 1 - i) of them
            total += (long)d[i] * (n - 1 - i);
        }
        return total;
    }
}` }],
          dry: {
            head: ['i', 'sorted d[i]', 'queries behind (n−1−i)', 'adds', 'total'],
            rows: [
              ['0', '1', '4', '4', '4'],
              ['1', '2', '3', '6', '10'],
              ['2', '2', '2', '4', '14'],
              ['3', '3', '1', '3', '17'],
              ['4', '6', '0', '0', '<span class="c-p">17</span>']
            ]
          },
          complexity: `<p><b>Time O(N log N)</b> for the sort, O(N) for the sum. <b>Space O(N)</b> for the copy (O(1) extra if you may sort in place).</p>`,
          followUps: ['Each query also has a priority weight: minimize Σ weight × finish time (Smith\'s rule, sort by time/weight).', 'Two database servers run in parallel: assign queries round-robin in sorted order — why does that stay optimal?', 'Return the average waiting time as a double.']
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 2 — Activity selection & the interval-scheduling family
  // =====================================================================
  topics.push({
    title: 'Activity Selection & Interval Scheduling (Earliest End First)',
    analogy: `<p>You manage <b>one meeting room</b> and people keep handing you booking requests. You want to fit in as <b>many meetings as possible</b>. A smart receptionist does not think about the whole day at once. She simply says: <i>"Whichever meeting finishes <b>earliest</b> goes in first — that gives the room back to me as soon as possible."</i> Then she repeats with what is left and never goes back to change her mind.</p>
      <p>It is like packing a day of errands: if you want to finish the <i>most</i> errands, you do the one that gets you free soonest, not the one that starts first or the one that is shortest.</p>`,
    explain: `<p><b>Activity Selection</b>: meetings with (start, end) times, one room, pick the <b>maximum number</b> that do not overlap. Which "best-looking" rule should greedy use? Test three ideas on tiny cases:</p>
      ${H.table(['Greedy rule', 'Tiny test case', 'Rule picks', 'Best possible', 'Verdict'], [
        ['Earliest <b>start</b> first', '(0,10) (1,2) (3,4)', '(0,10) → 1 meeting', '(1,2)+(3,4) → 2', H.c('r', 'fails')],
        ['<b>Shortest</b> meeting first', '(1,5) (4,7) (6,10)', '(4,7) → blocks both others → 1', '(1,5)+(6,10) → 2', H.c('r', 'fails')],
        ['<b>Fewest clashes</b> first', 'textbook counterexample (Kleinberg–Tardos): a low-clash meeting in the middle blocks two chains', 'one meeting fewer', 'one more', H.c('r', 'fails')],
        ['Earliest <b>end</b> first', 'any input', 'frees the room soonest', 'always matches', H.c('g', 'correct')]
      ])}
      <p><b>The algorithm:</b> sort by end time. Keep <code>lastEnd</code> = end of the last meeting you booked. Walk through the meetings: if <code>start ≥ lastEnd</code>, book it and set <code>lastEnd = end</code>; otherwise skip it forever.</p>
      ${H.arr(['(1,2)', '(3,4)', '(0,6)', '(5,7)', '(8,9)', '(5,9)'], { label: 'sorted by end', hl: { 0: 'g', 1: 'g', 2: 'r', 3: 'g', 4: 'g', 5: 'r' } })}
      <p>${H.c('g', 'Green')} = booked (starts after the last booked one ends), ${H.c('r', 'red')} = overlaps, skipped. Answer = 4 meetings.</p>
      <p><b>Why "earliest end" is safe (exchange argument):</b> take any best schedule O. Look at its first meeting X. Swap X for the meeting g that ends earliest overall. g ends <i>no later</i> than X, so it cannot crash into anything that came after X. Same count, still valid → there is always a best schedule that starts with g. After choosing g, the rest is the same problem on "meetings that start at or after g ends" → repeat.</p>
      <p><b>The family</b> — learn the one template, solve five problems:</p>
      ${H.table(['question', 'answer with the template'], [
        ['Max number of non-overlapping intervals', 'count of booked meetings'],
        ['Min number to <b>remove</b> so the rest do not overlap (LC 435)', 'N − (max non-overlapping)'],
        ['Min <b>arrows</b> to burst balloons [x<sub>start</sub>, x<sub>end</sub>] (LC 452)', 'same sweep; touching balloons share an arrow, so a new arrow only when <code>start &gt; lastEnd</code>'],
        ['Max meetings, but each has a <b>profit</b> (weighted)', H.c('r', 'greedy fails') + ' → DP + binary search'],
        ['Min rooms so <b>all</b> meetings happen', 'different greedy: sweep line (Minimum Platforms topic)']
      ])}`,
    clues: [
      '"<b>Maximum number</b> of non-overlapping intervals / meetings / activities / events you can attend" → sort by <b>end time</b>, greedy.',
      '"<b>One room / one machine / one person</b>" doing tasks that each have a start and end → activity selection.',
      '"Minimum number of intervals to <b>remove</b> so none overlap" → N − (max non-overlapping).',
      '"Minimum number of <b>arrows / points / darts</b> that hit every interval" → sort by end, place a point at each chosen end.',
      '<code>N ≤ 10<sup>5</sup></code> with intervals → expect sort O(N log N) + one pass, not DP over subsets.',
      'Intervals carry a <b>value / weight / profit</b> → greedy is no longer safe; think weighted interval scheduling DP.'
    ],
    code: [{ lang: 'java', code: `
      // Greedy template: sort by the "safe" key (END time), then one pass, never undo.
      int maxNonOverlapping(int[][] intervals) {
          // intervals[i] = {start, end}; Integer.compare avoids the overflow of a[1] - b[1]
          Arrays.sort(intervals, (a, b) -> Integer.compare(a[1], b[1]));
          int count = 0;
          long lastEnd = Long.MIN_VALUE;   // the room is free at the very beginning
          for (int[] it : intervals) {
              if (it[0] >= lastEnd) {      // starts after (or exactly when) the last one ended
                  count++;                 // lock it in
                  lastEnd = it[1];         // room busy until this end
              }
          }
          return count;
      }`, alt: [{ lang: 'python', code: `# Greedy template: sort by the "safe" key (END time), then one pass, never undo.
def max_non_overlapping(intervals):
    count, last_end = 0, float('-inf')      # the room is free at the very beginning
    for s, e in sorted(intervals, key=lambda it: it[1]):
        if s >= last_end:                   # starts after (or exactly when) the last one ended
            count += 1                      # lock it in
            last_end = e                    # room busy until this end
    return count` }, { lang: 'js', code: `// Greedy template: sort by the "safe" key (END time), then one pass, never undo.
function maxNonOverlapping(intervals) {
  const a = [...intervals].sort((x, y) => x[1] - y[1]);   // by end time
  let count = 0, lastEnd = -Infinity;                     // the room is free at the very beginning
  for (const [s, e] of a) {
    if (s >= lastEnd) {                // starts after (or exactly when) the last one ended
      count++;                         // lock it in
      lastEnd = e;                     // room busy until this end
    }
  }
  return count;
}` }, { lang: 'cpp', code: `// Greedy template: sort by the "safe" key (END time), then one pass, never undo.
int maxNonOverlapping(vector<vector<int>> intervals) {
    // compare with <, never a[1] - b[1] (overflow near 2^31)
    sort(intervals.begin(), intervals.end(), [](auto& a, auto& b) { return a[1] < b[1]; });
    int count = 0;
    long long lastEnd = LLONG_MIN;           // the room is free at the very beginning
    for (auto& it : intervals) {
        if (it[0] >= lastEnd) {              // starts after (or exactly when) the last one ended
            count++;
            lastEnd = it[1];
        }
    }
    return count;
}` }, { lang: 'csharp', code: `// Greedy template: sort by the "safe" key (END time), then one pass, never undo.
int MaxNonOverlapping(int[][] intervals)
{
    // intervals[i] = {start, end}; CompareTo avoids the overflow of a[1] - b[1]
    Array.Sort(intervals, (a, b) => a[1].CompareTo(b[1]));
    int count = 0;
    long lastEnd = long.MinValue;    // the room is free at the very beginning
    foreach (int[] it in intervals)
    {
        if (it[0] >= lastEnd)        // starts after (or exactly when) the last one ended
        {
            count++;                 // lock it in
            lastEnd = it[1];         // room busy until this end
        }
    }
    return count;
}` }] }, { lang: 'java', code: `
      // LC 452: balloons are CLOSED intervals [s, e]; an arrow at x bursts all with s <= x <= e.
      // Shoot at the end of the earliest-ending balloon; touching balloons share that arrow.
      int findMinArrowShots(int[][] points) {
          Arrays.sort(points, (a, b) -> Integer.compare(a[1], b[1]));
          int arrows = 0;
          long arrowAt = Long.MIN_VALUE;   // no arrow yet
          for (int[] p : points) {
              if (p[0] > arrowAt) {        // this balloon is not hit by the last arrow
                  arrows++;
                  arrowAt = p[1];          // shoot as far right as possible: its end
              }
          }
          return arrows;
      }`, alt: [{ lang: 'python', code: `# LC 452: balloons are CLOSED intervals [s, e]; an arrow at x bursts all with s <= x <= e.
# Shoot at the end of the earliest-ending balloon; touching balloons share that arrow.
def find_min_arrow_shots(points):
    arrows, arrow_at = 0, float('-inf')     # no arrow yet
    for s, e in sorted(points, key=lambda p: p[1]):
        if s > arrow_at:                    # this balloon is not hit by the last arrow
            arrows += 1
            arrow_at = e                    # shoot as far right as possible: its end
    return arrows` }, { lang: 'js', code: `// LC 452: balloons are CLOSED intervals [s, e]; an arrow at x bursts all with s <= x <= e.
// Shoot at the end of the earliest-ending balloon; touching balloons share that arrow.
function findMinArrowShots(points) {
  const p = [...points].sort((a, b) => a[1] - b[1]);
  let arrows = 0, arrowAt = -Infinity;      // no arrow yet
  for (const [s, e] of p) {
    if (s > arrowAt) {                      // this balloon is not hit by the last arrow
      arrows++;
      arrowAt = e;                          // shoot as far right as possible: its end
    }
  }
  return arrows;
}` }, { lang: 'cpp', code: `// LC 452: balloons are CLOSED intervals [s, e]; an arrow at x bursts all with s <= x <= e.
// Shoot at the end of the earliest-ending balloon; touching balloons share that arrow.
int findMinArrowShots(vector<vector<int>> points) {
    sort(points.begin(), points.end(), [](auto& a, auto& b) { return a[1] < b[1]; });
    int arrows = 0;
    long long arrowAt = LLONG_MIN;           // no arrow yet
    for (auto& p : points) {
        if (p[0] > arrowAt) {                // not hit by the last arrow
            arrows++;
            arrowAt = p[1];                  // shoot at its end
        }
    }
    return arrows;
}` }, { lang: 'csharp', code: `// LC 452: balloons are CLOSED intervals [s, e]; an arrow at x bursts all with s <= x <= e.
// Shoot at the end of the earliest-ending balloon; touching balloons share that arrow.
int FindMinArrowShots(int[][] points)
{
    Array.Sort(points, (a, b) => a[1].CompareTo(b[1]));
    int arrows = 0;
    long arrowAt = long.MinValue;    // no arrow yet
    foreach (int[] p in points)
    {
        if (p[0] > arrowAt)          // this balloon is not hit by the last arrow
        {
            arrows++;
            arrowAt = p[1];          // shoot as far right as possible: its end
        }
    }
    return arrows;
}` }] }],
    codeTitle: ['Max non-overlapping intervals', 'Same template, closed intervals: minimum arrows'],
    viz: {
      title: 'Activity selection on meetings sorted by end time',
      input: '1-2 3-4 0-6 5-7 8-9 5-9',
      inputLabel: 'meetings as start-end (space separated, times 0..24)',
      gen: function (input) {
        var toks = String(input === undefined ? '' : input).trim().split(/[\s,]+/);
        var acts = [];
        toks.forEach(function (t, i) {
          var m = /^(\d+)-(\d+)$/.exec(t);
          if (!m) throw new Error('Write each meeting as start-end, e.g. "1-2 3-4 0-6".');
          var s = +m[1], e = +m[2];
          if (e <= s || e > 24) throw new Error('Each meeting needs start < end and end ≤ 24.');
          acts.push({ s: s, e: e, name: String.fromCharCode(65 + i) });
        });
        if (acts.length < 2 || acts.length > 10) throw new Error('Give 2 to 10 meetings.');
        var maxE = 0; acts.forEach(function (a) { if (a.e > maxE) maxE = a.e; });
        function tl(hl) {
          var vals = [];
          for (var t = 0; t < maxE; t++) {
            var who = '·';
            picked.forEach(function (p) { if (p.s <= t && t < p.e) who = p.name; });
            vals.push(who);
          }
          return { type: 'array', label: 'timeline (each box = 1 hour, letter = room is booked)', values: vals, hl: hl || {} };
        }
        var frames = [], picked = [];
        frames.push({ narr: 'Here are the booking requests in the order they arrived. Each bar\'s height is the meeting\'s <b>end time</b>. The room is empty.', parts: [
          { type: 'bars', label: 'end times (input order)', values: acts.map(function (a) { return a.e; }), texts: acts.map(function (a) { return a.name + ' ' + a.s + '→' + a.e; }), idxLabels: acts.map(function (a) { return a.name; }) },
          tl()
        ] });
        var sorted = acts.slice().sort(function (x, y) { return x.e - y.e; });
        var bv = sorted.map(function (a) { return a.e; });
        var bt = sorted.map(function (a) { return a.name + ' ' + a.s + '→' + a.e; });
        var bl = sorted.map(function (a) { return a.name; });
        frames.push({ narr: 'Greedy key: sort by <b>end time</b> (bars now rise left to right). Whoever finishes first gives the room back soonest, leaving the most time for everyone else.', parts: [
          { type: 'bars', label: 'sorted by end time', values: bv, texts: bt, idxLabels: bl },
          tl(), { type: 'vars', vals: { lastEnd: '-∞', count: 0 } }
        ] });
        var lastEnd = -Infinity, count = 0, status = {};
        sorted.forEach(function (a, i) {
          var fits = a.s >= lastEnd;
          var hl = {};
          for (var t = a.s; t < a.e; t++) {
            var busy = picked.some(function (p) { return p.s <= t && t < p.e; });
            hl[t] = fits ? 'ok' : (busy ? 'bad' : 'cur');
          }
          if (fits) { picked.push(a); count++; }
          var bh = {};
          for (var k = 0; k < i; k++) bh[k] = status[k];
          bh[i] = fits ? 'ok' : 'bad';
          status[i] = fits ? 'sel' : 'done';
          var ptr = {}; ptr[i] = 'now';
          frames.push({
            narr: 'Meeting <b>' + a.name + '</b> (' + a.s + '→' + a.e + '): its start ' + a.s + (fits ? ' ≥ ' : ' &lt; ') + 'lastEnd ' + (lastEnd === -Infinity ? '-∞' : lastEnd) + '. ' +
              (fits ? '<span class="c-g">It fits</span> after the last chosen meeting → book it. lastEnd becomes ' + a.e + '.' : '<span class="c-r">It overlaps</span> the meeting already booked (red hours) → skip it forever. Greedy never comes back.'),
            parts: [
              { type: 'bars', label: 'sorted by end time', values: bv, texts: bt, idxLabels: bl, hl: bh, ptr: ptr },
              tl(hl), { type: 'vars', vals: { lastEnd: fits ? a.e : (lastEnd === -Infinity ? '-∞' : lastEnd), count: count }, hl: fits ? { lastEnd: 'ok', count: 'ok' } : {} }
            ]
          });
          if (fits) lastEnd = a.e;
        });
        var fh = {}; sorted.forEach(function (a, i) { fh[i] = status[i]; });
        frames.push({ narr: 'Done! The purple bars are the chosen meetings: <b>' + picked.map(function (p) { return p.name; }).join(', ') + '</b> → <b>' + count + '</b> meetings. Only one sort + one sweep: O(N log N).', parts: [
          { type: 'bars', label: 'sorted by end time', values: bv, texts: bt, idxLabels: bl, hl: fh },
          tl(), { type: 'vars', vals: { answer: count }, hl: { answer: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Minimum removals = N − maximum kept (LC 435)',
        html: `<p>Intervals [1,2] [2,3] [3,4] [1,3]. Sorted by end: [1,2] [2,3] [1,3] [3,4]. Book [1,2] (lastEnd 2) → [2,3] starts at 2 ≥ 2, book (lastEnd 3) → [1,3] starts at 1 &lt; 3, ${H.c('r', 'skip')} → [3,4] book. Kept 3, so remove <b>4 − 3 = 1</b> interval ([1,3]). Keeping the most is the same problem as removing the fewest.</p>`
      },
      {
        title: 'Arrows and the "touching" rule',
        html: `<p>Balloons [10,16] [2,8] [1,6] [7,12]. Sorted by end: [1,6] [2,8] [7,12] [10,16]. Arrow at 6 bursts [1,6] and [2,8] (2 ≤ 6). [7,12]: 7 &gt; 6 → new arrow at 12, which also bursts [10,16]. Answer <b>2</b>. Note the comparison flips from <code>≥</code> to <code>&gt;</code>: meetings that touch can both happen (the room is free at the instant one ends), but balloons that touch can share one arrow. <b>Always read whether endpoints are inclusive.</b></p>
          ${H.table(['balloon (by end)', 'start &gt; arrowAt?', 'action', 'arrowAt', 'arrows'], [['[1,6]', '1 &gt; −∞ ✔', 'shoot', '6', '1'], ['[2,8]', '2 &gt; 6 ✘', 'already burst', '6', '1'], ['[7,12]', '7 &gt; 6 ✔', 'shoot', '12', '2'], ['[10,16]', '10 &gt; 12 ✘', 'already burst', '12', H.c('p', '2')]])}`
      },
      {
        title: 'Weighted meetings break the greedy',
        html: `<p>Meetings with profits: A = (0, 10, profit 100), B = (0, 4, profit 1), C = (5, 9, profit 1). Earliest-end greedy books B and C → profit <b>2</b>. Booking only A gives <b>100</b>. Once meetings are not all "worth one", ending early is no longer a free win. Fix: sort by end, <code>dp[i] = max(dp[i−1], profit[i] + dp[last meeting ending ≤ start[i]])</code>, with binary search for "last meeting" → O(N log N). That is DP, covered in DSA 17/18.</p>`
      },
      {
        title: 'Ties and identical intervals',
        html: `<p>Meetings (1,3) (2,3) (3,3)? A zero-length meeting (3,3) is allowed in some problems. Sorted by end, all end at 3. Book (1,3) → lastEnd 3. (2,3): 2 &lt; 3 skip. (3,3): 3 ≥ 3 book. Answer 2. When every meeting has start &lt; end, the order among equal ends does not change the <i>count</i> (any one of them is a valid "earliest end"). It can change <i>which</i> meetings you report, so say so if the output is the list itself. A zero-length meeting such as (3,3) is the exception: if it came first it would block the others, so break ties by earlier start.</p>`
      }
    ],
    deepDive: `<h4>1. Full "greedy stays ahead" proof</h4>
      <p>Let greedy pick g<sub>1</sub>, g<sub>2</sub>, …, g<sub>k</sub> and let any valid schedule be o<sub>1</sub>, …, o<sub>m</sub>, both in time order. <b>Claim:</b> end(g<sub>i</sub>) ≤ end(o<sub>i</sub>) for every i ≤ min(k, m). <b>Base:</b> g<sub>1</sub> has the smallest end of all meetings. <b>Step:</b> o<sub>i+1</sub> starts after end(o<sub>i</sub>) ≥ end(g<sub>i</sub>), so o<sub>i+1</sub> was still available to greedy at step i+1; greedy picked the available meeting with the earliest end, so end(g<sub>i+1</sub>) ≤ end(o<sub>i+1</sub>). <b>Finish:</b> if m &gt; k, then o<sub>k+1</sub> starts after end(o<sub>k</sub>) ≥ end(g<sub>k</sub>), so greedy would not have stopped — contradiction. Hence k ≥ m.</p>
      <h4>2. Symmetry and variants</h4>
      <ul>
        <li><b>Latest start first</b> (scan from the right) is the mirror image and equally correct.</li>
        <li>If the input is already sorted by end, the algorithm is O(N) and O(1) space — say this when the interviewer hints the data "arrives sorted".</li>
        <li><b>k rooms, maximize meetings:</b> sort by end; keep a sorted map of rooms' free times (<code>TreeMap</code> / <code>SortedList</code> / <code>std::multimap</code>); for each meeting, give it the room whose free time is the <i>largest value ≤ start</i> (<code>floorKey</code> / <code>bisect</code> / <code>prev(upper_bound)</code>); if none, skip. O(N log k). Same exchange argument, one level up.</li>
        <li><b>Weighted</b>: DP. <b>Each meeting needs a room and you want the fewest rooms</b>: interval partitioning / sweep line (Minimum Platforms).</li>
      </ul>
      <h4>3. Production reality</h4>
      <p>Calendar schedulers, ad-slot allocation and CPU reservation systems use exactly this "earliest deadline/finish first" idea. In real data, endpoints are timestamps — compare them as 64-bit integers, keep time zones normalized (UTC), and define inclusive/exclusive ends explicitly in the API (half-open <code>[start, end)</code> intervals avoid most off-by-one bugs, which is why most calendar APIs use them).</p>
      <h4>4. Complexity</h4>
      <p>O(N log N) sort + O(N) sweep. Sorting pairs with a comparator has overhead; for 10<sup>6</sup> intervals, packing <code>(end &lt;&lt; 32) | index</code> into one 64-bit integer per interval and sorting plain numbers (primitive <code>Arrays.sort</code> on a <code>long[]</code> in Java) is a well-known 2–3× speed trick.</p>`,
    aiEra: `<p><b>What AI changes:</b> "non-overlapping intervals" is one of the most memorised LeetCode patterns, so assistants nail the template instantly. The bugs they still make are about the <b>problem's exact rules</b>: sorting by start instead of end, using <code>≥</code> where the problem needs <code>&gt;</code> (meetings vs balloons), forgetting that GFG-style "N meetings" problems often treat touching as overlapping, and overflowing with <code>a[1] - b[1]</code> comparators on values near 2<sup>31</sup>.</p>
      <p><b>Use AI as a partner:</b> <code>List every boundary rule this statement implies: are ends inclusive? can a meeting start when another ends? can start == end?</code> and <code>Generate 6 edge-case interval sets (touching, nested, identical, single, negative coordinates, Integer.MIN/MAX) with expected outputs.</code></p>
      <p><b>Where AI goes wrong:</b> it happily applies this greedy to <i>weighted</i> interval problems ("maximize total profit of non-overlapping jobs") where it is simply wrong — a perfect thing to test it on.</p>
      <p><b>What you must still own:</b> choosing the sort key from a 30-second counterexample hunt, the stays-ahead proof, and reading the statement's boundary rule. Interviewers love asking "what if meetings had profits?" to see if you know when the greedy dies.</p>`,
    problems: [
      {
        title: 'Activity Selection (N Meetings in One Room)',
        level: 'Easy',
        tags: ['greedy', 'sorting', 'intervals'],
        companies: ['Amazon', 'Microsoft', 'Flipkart', 'Google'],
        statement: `<p>There is <b>one</b> meeting room and <code>N</code> meetings. Meeting <code>i</code> runs from <code>start[i]</code> to <code>end[i]</code>. Two meetings clash if they overlap in time; a meeting may start <b>exactly</b> when the previous one ends. Return the <b>maximum number</b> of meetings that can be held in the room.</p>`,
        constraints: `1 ≤ N ≤ 10<sup>5</sup>, 0 ≤ start[i] &lt; end[i] ≤ 10<sup>9</sup>`,
        example: `${H.arr([1, 3, 0, 5, 8, 5], { label: 'start' })}${H.arr([2, 4, 6, 7, 9, 9], { label: 'end', hl: { 0: 'g', 1: 'g', 3: 'g', 4: 'g' } })}
          <p>Output: <b>4</b>. Pick ${H.c('g', '(1,2), (3,4), (5,7), (8,9)')}. Meeting (0,6) clashes with (1,2) and (3,4); (5,9) clashes with (5,7). No 5 meetings can fit together.</p>`,
        brute: {
          why: `<p>Try every subset of meetings (2<sup>N</sup> of them), check all pairs inside it for overlap, keep the largest valid subset. For N = 40 that is already 10<sup>12</sup> subsets. The wasted work: most subsets are obviously bad (they contain two clashing meetings), and we never use the fact that "finishing early is always good".</p>`,
          code: { lang: 'java', code: `
            int bruteMax(int[] s, int[] e) {
                int n = s.length, best = 0;
                for (int mask = 0; mask < (1 << n); mask++) {     // every subset
                    boolean ok = true;
                    for (int i = 0; i < n && ok; i++)
                        for (int j = i + 1; j < n && ok; j++)
                            if (((mask >> i) & 1) == 1 && ((mask >> j) & 1) == 1
                                    && s[i] < e[j] && s[j] < e[i]) // the two overlap
                                ok = false;
                    if (ok) best = Math.max(best, Integer.bitCount(mask));
                }
                return best;
            }`, alt: [
          { lang: 'python', code: `def max_meetings(s, e):
    n = len(s)
    best = 0
    for mask in range(1 << n):                       # every subset
        ok = True
        for i in range(n):
            for j in range(i + 1, n):
                if ok and (mask >> i) & 1 and (mask >> j) & 1 \\
                        and s[i] < e[j] and s[j] < e[i]:   # the two overlap
                    ok = False
        if ok:
            best = max(best, bin(mask).count('1'))
    return best` },
          { lang: 'js', code: `function maxMeetings(s, e) {
  const n = s.length;
  let best = 0;
  for (let mask = 0; mask < (1 << n); mask++) {      // every subset
    let ok = true;
    for (let i = 0; i < n && ok; i++)
      for (let j = i + 1; j < n && ok; j++)
        if (((mask >> i) & 1) === 1 && ((mask >> j) & 1) === 1
            && s[i] < e[j] && s[j] < e[i])           // the two overlap
          ok = false;
    if (ok) {
      let bits = 0;
      for (let m = mask; m > 0; m &= m - 1) bits++;
      best = Math.max(best, bits);
    }
  }
  return best;
}` },
          { lang: 'cpp', code: `int maxMeetings(vector<int>& s, vector<int>& e) {
    int n = s.size(), best = 0;
    for (int mask = 0; mask < (1 << n); mask++) {    // every subset
        bool ok = true;
        for (int i = 0; i < n && ok; i++)
            for (int j = i + 1; j < n && ok; j++)
                if (((mask >> i) & 1) == 1 && ((mask >> j) & 1) == 1
                        && s[i] < e[j] && s[j] < e[i]) // the two overlap
                    ok = false;
        if (ok) best = max(best, __builtin_popcount(mask));
    }
    return best;
}` },
          { lang: 'csharp', code: `int BruteMax(int[] s, int[] e)
{
    int n = s.Length, best = 0;
    for (int mask = 0; mask < (1 << n); mask++)       // every subset
    {
        bool ok = true;
        for (int i = 0; i < n && ok; i++)
            for (int j = i + 1; j < n && ok; j++)
                if (((mask >> i) & 1) == 1 && ((mask >> j) & 1) == 1
                        && s[i] < e[j] && s[j] < e[i]) // the two overlap
                    ok = false;
        if (ok) best = Math.Max(best, BitCount(mask));
    }
    return best;
}
int BitCount(int x) { int c = 0; while (x != 0) { x &= x - 1; c++; } return c; }` }
        ] }
        },
        mcq: {
          q: 'You want to fit the most meetings in one room. Which order should you consider them in?',
          options: ['By earliest start time', 'By shortest duration', 'By earliest end time', 'By fewest clashes with others'],
          answer: 2,
          explain: 'Earliest end frees the room soonest. Earliest start fails on (0,10),(1,2),(3,4); shortest fails on (1,5),(4,7),(6,10). "Fewest clashes" also has known counterexamples.'
        },
        hints: [
          `<p><b>Aha:</b> the meeting that ends first can always be part of some best schedule. If a best schedule starts with a different meeting X, swap X for the earliest-ending one: it ends no later than X, so nothing after it breaks.</p>`,
          `<p>Sort meeting indices by <code>end</code>. Keep one variable <code>lastEnd</code> = end time of the last meeting you booked. No DP table needed — just a counter.</p>`,
          `<p>Traps: sort the <i>indices</i> (or pairs) so start and end stay together; decide <code>≥</code> vs <code>&gt;</code> from the statement (here touching is allowed → <code>≥</code>); start <code>lastEnd</code> below every start time. Recipe: sort by end → for each meeting: if start ≥ lastEnd → count++, lastEnd = end → return count.</p>`
        ],
        tests: { sig: 'int[] int[] -> int', fn: 'maxMeetings', cases: [
          [[[1, 3, 0, 5, 8, 5], [2, 4, 6, 7, 9, 9]], 4],
          [[[0], [1]], 1],
          [[[1, 2, 3], [2, 3, 4]], 3],
          [[[0, 1, 3], [10, 2, 4]], 2],
          [[[1, 4, 6], [5, 7, 10]], 2],
          [[[5, 5, 5], [6, 6, 6]], 1],
          [[[0, 0, 999999999], [1000000000, 1, 1000000000]], 2],
          [[{$range: [0, 100000, 1]}, {$range: [1, 100001, 1]}], 100000],
          [[{$rep: 0, n: 100000}, {$rep: 1000000000, n: 100000}], 1]
        ] },
        solution: {
          approach: `<p>Sort by end time, sweep once, book a meeting whenever it starts at or after the last booked meeting ends.</p>`,
          code: `
            import java.util.*;

            class Solution {
                // Maximum number of non-overlapping meetings in one room.
                // Touching is allowed: a meeting may start exactly when the previous one ends.
                public int maxMeetings(int[] start, int[] end) {
                    int n = start.length;
                    Integer[] order = new Integer[n];         // indices of meetings
                    for (int i = 0; i < n; i++) order[i] = i;

                    // Greedy key: earliest END first (stable sort keeps input order on ties)
                    Arrays.sort(order, (x, y) -> Integer.compare(end[x], end[y]));

                    int count = 0;
                    long lastEnd = Long.MIN_VALUE;             // room is free from the start
                    for (int idx : order) {
                        if (start[idx] >= lastEnd) {           // fits after the last booked meeting
                            count++;                           // book it, never undo
                            lastEnd = end[idx];                // room busy until here
                        }
                        // else: it overlaps the last booked meeting -> skip it
                    }
                    return count;
                }

                public static void main(String[] args) {
                    int[] s = {1, 3, 0, 5, 8, 5};
                    int[] e = {2, 4, 6, 7, 9, 9};
                    System.out.println(new Solution().maxMeetings(s, e)); // prints 4
                }
            }`,
          dry: {
            head: ['sorted meeting', 'start ≥ lastEnd?', 'action', 'lastEnd after', 'count'],
            rows: [
              ['(1,2)', '1 ≥ -∞ ✔', '<span class="c-g">book</span>', '2', '1'],
              ['(3,4)', '3 ≥ 2 ✔', '<span class="c-g">book</span>', '4', '2'],
              ['(0,6)', '0 ≥ 4 ✘', '<span class="c-r">skip</span>', '4', '2'],
              ['(5,7)', '5 ≥ 4 ✔', '<span class="c-g">book</span>', '7', '3'],
              ['(8,9)', '8 ≥ 7 ✔', '<span class="c-g">book</span>', '9', '4'],
              ['(5,9)', '5 ≥ 9 ✘', '<span class="c-r">skip</span>', '9', '<span class="c-p">4</span>']
            ]
          },
          alt: [{ lang: 'python', code: `def max_meetings(start, end):
    # pair up, sort by END time
    meetings = sorted(zip(start, end), key=lambda m: m[1])
    count, last_end = 0, float('-inf')
    for s, e in meetings:
        if s >= last_end:      # touching allowed
            count += 1
            last_end = e
    return count

print(max_meetings([1, 3, 0, 5, 8, 5], [2, 4, 6, 7, 9, 9]))  # 4`, run: true }, { lang: 'js', code: `function maxMeetings(start, end) {
  // indices sorted by END time
  const order = start.map((_, i) => i).sort((x, y) => end[x] - end[y]);
  let count = 0, lastEnd = -Infinity;
  for (const i of order) {
    if (start[i] >= lastEnd) {     // touching is allowed
      count++;
      lastEnd = end[i];
    }
  }
  return count;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int maxMeetings(vector<int>& start, vector<int>& end) {
        vector<pair<int, int>> m;                       // (end, start): sorts by end time
        for (size_t i = 0; i < start.size(); i++) m.push_back({end[i], start[i]});
        sort(m.begin(), m.end());
        int count = 0;
        long long lastEnd = LLONG_MIN;
        for (auto& [e, s] : m) {
            if (s >= lastEnd) {                         // touching is allowed
                count++;
                lastEnd = e;
            }
        }
        return count;
    }
};` }, { lang: 'csharp', code: `using System;
using System.Linq;

public class Solution
{
    // Maximum number of non-overlapping meetings in one room.
    // Touching is allowed: a meeting may start exactly when the previous one ends.
    public int MaxMeetings(int[] start, int[] end)
    {
        int n = start.Length;
        // Greedy key: earliest END first (OrderBy is a stable sort: input order kept on ties)
        var order = Enumerable.Range(0, n).OrderBy(i => end[i]).ToArray();

        int count = 0;
        long lastEnd = long.MinValue;              // room is free from the start
        foreach (int idx in order)
        {
            if (start[idx] >= lastEnd)             // fits after the last booked meeting
            {
                count++;                           // book it, never undo
                lastEnd = end[idx];                // room busy until here
            }
            // else: it overlaps the last booked meeting -> skip it
        }
        return count;
    }
}` }],
          complexity: `<p><b>Time O(N log N)</b>: sorting dominates; the sweep looks at each meeting once (O(N)). <b>Space O(N)</b> for the index array (O(1) extra if you may sort the input pairs in place).</p>`,
          followUps: ['Return the indices of the chosen meetings, not just the count.', 'GFG variant: a meeting may NOT start exactly when another ends (strict). Which single character changes?', 'Two rooms instead of one: maximize the meetings held (a sorted map of room free times).', 'Meetings have profits: why does the greedy break, and what is the O(N log N) DP?']
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 3 — Job sequencing with deadlines
  // =====================================================================
  topics.push({
    title: 'Job Sequencing with Deadlines (Best Profit, Latest Free Slot)',
    analogy: `<p>You are a freelancer. Every gig takes exactly <b>one day</b>, pays some money, and has a <b>deadline</b> ("finish by day 2 or don't bother"). You cannot do two gigs on one day. Common sense: look at the <b>best-paying gig first</b>. And when you accept it, do not do it today if its deadline is Friday — <b>pencil it in on Friday</b>, the last day that still works. That keeps your early days free for gigs with tight deadlines that show up later in your list.</p>`,
    explain: `<p>Each job takes 1 unit of time, has a <b>deadline</b> <code>d</code> (must finish within the first <code>d</code> slots) and a <b>profit</b> <code>p</code> (earned only if it finishes on time). One machine. Maximize total profit.</p>
      <p><b>Greedy recipe:</b></p>
      <ol>
        <li>Sort jobs by <b>profit, highest first</b>.</li>
        <li>For each job, find the <b>latest free slot ≤ its deadline</b>. If one exists, put the job there; otherwise skip it.</li>
      </ol>
      <p>Worked example — jobs as (name, deadline, profit): A(2,100) B(1,19) C(2,27) D(1,25) E(3,15).</p>
      ${H.table(['job (by profit)', 'deadline', 'latest free slot ≤ deadline', 'slots 1 2 3 after', 'profit'], [
        ['A 100', '2', 'slot 2', '_ A _', '100'],
        ['C 27', '2', 'slot 2 taken → slot 1', 'C A _', '127'],
        ['D 25', '1', 'slot 1 taken → none', H.c('r', 'skip'), '127'],
        ['B 19', '1', 'none', H.c('r', 'skip'), '127'],
        ['E 15', '3', 'slot 3', 'C A E', H.c('p', '142')]
      ])}
      <p><b>Why highest profit first is safe (exchange argument):</b> let g be the most profitable job and O a best schedule without g. If O has a free slot ≤ d<sub>g</sub>, add g → better, contradiction. Otherwise slots 1..d<sub>g</sub> are all used; replace the job in any of those slots with g. g meets its deadline (slot ≤ d<sub>g</sub>), and we swapped a job worth ≤ p<sub>g</sub> for g → no worse. So some best schedule contains g.</p>
      <p><b>Why the latest slot?</b> Placing a job as late as possible leaves early slots open for jobs with smaller deadlines. Earliest-slot placement can block them:</p>
      ${H.table(['jobs', 'place in EARLIEST free slot', 'place in LATEST free slot'], [['X(d=2, p=50), Y(d=1, p=40)', 'X → slot 1, Y has nowhere → ' + H.c('r', '50'), 'X → slot 2, Y → slot 1 → ' + H.c('g', '90')]])}
      <p><b>Speed:</b> scanning down for a free slot is O(D) per job → O(N·D) worst case. A <b>Disjoint Set Union</b> where <code>find(t)</code> returns the latest free slot ≤ t makes it near O(1) per job: when slot t is used, link t to t − 1.</p>`,
    clues: [
      '"Each job takes <b>one unit</b> of time, has a <b>deadline</b> and a <b>profit</b>; maximize profit" → profit-desc + latest free slot (or deadline-sorted min-heap).',
      '"Return the <b>number of jobs done</b> and the <b>maximum profit</b>" → the classic GFG Job Sequencing signature.',
      'Deadlines up to N with N ≤ 10<sup>5</sup> → the O(N·D) slot scan may TLE; use DSU or a heap.',
      '"Maximize count of tasks finished before their deadlines" with <b>varying durations</b> → different greedy: sort by deadline + max-heap of durations (Course Schedule III).',
      '"Deadline" + "penalty for missing it" + unit tasks → same structure (minimize lost penalty = maximize kept profit).'
    ],
    code: [{ lang: 'java', code: `
      // O(N log N + N * alpha(N)): DSU where find(t) = latest free slot <= t (0 means "no slot").
      int[] parent;

      int find(int t) {                       // path compression
          while (parent[t] != t) { parent[t] = parent[parent[t]]; t = parent[t]; }
          return t;
      }

      int[] jobSequencing(int[] deadline, int[] profit) {
          int n = deadline.length, maxD = 0;
          for (int d : deadline) maxD = Math.max(maxD, d);
          maxD = Math.min(maxD, n);           // never need more than n slots
          parent = new int[maxD + 1];
          for (int t = 0; t <= maxD; t++) parent[t] = t;

          Integer[] order = new Integer[n];
          for (int i = 0; i < n; i++) order[i] = i;
          Arrays.sort(order, (a, b) -> Integer.compare(profit[b], profit[a]));   // richest first

          int count = 0, total = 0;
          for (int i : order) {
              int slot = find(Math.min(deadline[i], maxD));   // latest free slot <= deadline
              if (slot > 0) {                  // slot 0 is the "no room left" sentinel
                  count++;
                  total += profit[i];
                  parent[slot] = slot - 1;     // slot used: next search falls to slot - 1
              }
          }
          return new int[]{count, total};
      }`, alt: [{ lang: 'python', code: `# O(N log N + N * alpha(N)): DSU where find(t) = latest free slot <= t (0 means "no slot").
def job_sequencing(deadline, profit):
    n = len(deadline)
    max_d = min(max(deadline), n)          # never need more than n slots
    parent = list(range(max_d + 1))

    def find(t):                           # path halving
        while parent[t] != t:
            parent[t] = parent[parent[t]]
            t = parent[t]
        return t

    count = total = 0
    for i in sorted(range(n), key=lambda i: -profit[i]):   # richest first
        slot = find(min(deadline[i], max_d))               # latest free slot <= deadline
        if slot > 0:                       # slot 0 is the "no room left" sentinel
            count += 1
            total += profit[i]
            parent[slot] = slot - 1        # slot used: next search falls to slot - 1
    return [count, total]` }, { lang: 'js', code: `// O(N log N + N * alpha(N)): DSU where find(t) = latest free slot <= t (0 means "no slot").
function jobSequencing(deadline, profit) {
  const n = deadline.length;
  const maxD = Math.min(Math.max(...deadline), n);      // never need more than n slots
  const parent = Array.from({ length: maxD + 1 }, (_, t) => t);
  const find = (t) => {                                 // path halving
    while (parent[t] !== t) { parent[t] = parent[parent[t]]; t = parent[t]; }
    return t;
  };
  const order = deadline.map((_, i) => i).sort((a, b) => profit[b] - profit[a]);   // richest first
  let count = 0, total = 0;
  for (const i of order) {
    const slot = find(Math.min(deadline[i], maxD));     // latest free slot <= deadline
    if (slot > 0) {                                     // slot 0 is the "no room left" sentinel
      count++;
      total += profit[i];
      parent[slot] = slot - 1;                          // next search falls to slot - 1
    }
  }
  return [count, total];
}` }, { lang: 'cpp', code: `// O(N log N + N * alpha(N)): DSU where find(t) = latest free slot <= t (0 means "no slot").
vector<int> jobSequencing(const vector<int>& deadline, const vector<int>& profit) {
    int n = deadline.size();
    int maxD = min(*max_element(deadline.begin(), deadline.end()), n);   // never need more than n slots
    vector<int> parent(maxD + 1);
    iota(parent.begin(), parent.end(), 0);
    auto find = [&](int t) {                       // path halving
        while (parent[t] != t) { parent[t] = parent[parent[t]]; t = parent[t]; }
        return t;
    };
    vector<int> order(n);
    iota(order.begin(), order.end(), 0);
    sort(order.begin(), order.end(), [&](int a, int b) { return profit[a] > profit[b]; });   // richest first
    int count = 0, total = 0;
    for (int i : order) {
        int slot = find(min(deadline[i], maxD));   // latest free slot <= deadline
        if (slot > 0) {                            // slot 0 is the "no room left" sentinel
            count++;
            total += profit[i];
            parent[slot] = slot - 1;
        }
    }
    return {count, total};
}` }, { lang: 'csharp', code: `// O(N log N + N * alpha(N)): DSU where Find(t) = latest free slot <= t (0 means "no slot").
int[] parent;

int Find(int t)                         // path compression
{
    while (parent[t] != t) { parent[t] = parent[parent[t]]; t = parent[t]; }
    return t;
}

int[] JobSequencing(int[] deadline, int[] profit)
{
    int n = deadline.Length, maxD = 0;
    foreach (int d in deadline) maxD = Math.Max(maxD, d);
    maxD = Math.Min(maxD, n);           // never need more than n slots
    parent = new int[maxD + 1];
    for (int t = 0; t <= maxD; t++) parent[t] = t;

    int[] order = new int[n];
    for (int i = 0; i < n; i++) order[i] = i;
    Array.Sort(order, (a, b) => profit[b].CompareTo(profit[a]));   // richest first

    int count = 0, total = 0;
    foreach (int i in order)
    {
        int slot = Find(Math.Min(deadline[i], maxD));   // latest free slot <= deadline
        if (slot > 0)                    // slot 0 is the "no room left" sentinel
        {
            count++;
            total += profit[i];
            parent[slot] = slot - 1;     // slot used: next search falls to slot - 1
        }
    }
    return new[] { count, total };
}` }] }, { lang: 'java', code: `
      // Alternative: sort by DEADLINE, keep chosen profits in a min-heap.
      // If we hold more jobs than the current deadline allows, drop the cheapest one.
      int maxProfitHeap(int[] deadline, int[] profit) {
          int n = deadline.length;
          Integer[] order = new Integer[n];
          for (int i = 0; i < n; i++) order[i] = i;
          Arrays.sort(order, (a, b) -> Integer.compare(deadline[a], deadline[b]));
          PriorityQueue<Integer> chosen = new PriorityQueue<>();   // min-heap of profits
          int total = 0;
          for (int i : order) {
              chosen.add(profit[i]);
              total += profit[i];
              if (chosen.size() > deadline[i]) {   // too many jobs for 'deadline[i]' slots
                  total -= chosen.poll();          // give up the least profitable one
              }
          }
          return total;
      }`, alt: [{ lang: 'python', code: `# Alternative: sort by DEADLINE, keep chosen profits in a min-heap.
# If we hold more jobs than the current deadline allows, drop the cheapest one.
import heapq

def max_profit_heap(deadline, profit):
    chosen, total = [], 0                  # heapq is a min-heap: exactly what we need
    for d, p in sorted(zip(deadline, profit)):
        heapq.heappush(chosen, p)
        total += p
        if len(chosen) > d:                # too many jobs for d slots
            total -= heapq.heappop(chosen) # give up the least profitable one
    return total` }, { lang: 'js', code: `// JS has no built-in heap: a small binary min-heap with a comparator.
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp; }
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {                                // sift up
      const p = (i - 1) >> 1;
      if (this.cmp(a[i], a[p]) >= 0) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {                                   // sift down
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.cmp(a[l], a[m]) < 0) m = l;
        if (r < a.length && this.cmp(a[r], a[m]) < 0) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

// Alternative: sort by DEADLINE, keep chosen profits in a min-heap.
// If we hold more jobs than the current deadline allows, drop the cheapest one.
function maxProfitHeap(deadline, profit) {
  const order = deadline.map((_, i) => i).sort((a, b) => deadline[a] - deadline[b]);
  const chosen = new MinHeap();            // min-heap of profits
  let total = 0;
  for (const i of order) {
    chosen.push(profit[i]);
    total += profit[i];
    if (chosen.size() > deadline[i]) total -= chosen.pop();   // drop the cheapest
  }
  return total;
}` }, { lang: 'cpp', code: `// Alternative: sort by DEADLINE, keep chosen profits in a min-heap.
// If we hold more jobs than the current deadline allows, drop the cheapest one.
int maxProfitHeap(const vector<int>& deadline, const vector<int>& profit) {
    vector<pair<int, int>> jobs;                       // (deadline, profit)
    for (size_t i = 0; i < deadline.size(); i++) jobs.push_back({deadline[i], profit[i]});
    sort(jobs.begin(), jobs.end());
    priority_queue<int, vector<int>, greater<int>> chosen;   // greater<> turns it into a MIN-heap
    int total = 0;
    for (auto [d, p] : jobs) {
        chosen.push(p);
        total += p;
        if ((int) chosen.size() > d) { total -= chosen.top(); chosen.pop(); }   // drop the cheapest
    }
    return total;
}` }, { lang: 'csharp', code: `// Alternative: sort by DEADLINE, keep chosen profits in a min-heap.
// If we hold more jobs than the current deadline allows, drop the cheapest one.
int MaxProfitHeap(int[] deadline, int[] profit)
{
    int n = deadline.Length;
    int[] order = new int[n];
    for (int i = 0; i < n; i++) order[i] = i;
    Array.Sort(order, (a, b) => deadline[a].CompareTo(deadline[b]));
    var chosen = new MinHeap<int>((a, b) => a.CompareTo(b));   // min-heap of profits
    int total = 0;
    foreach (int i in order)
    {
        chosen.Push(profit[i]);
        total += profit[i];
        if (chosen.Count > deadline[i])      // too many jobs for 'deadline[i]' slots
        {
            total -= chosen.Pop();           // give up the least profitable one
        }
    }
    return total;
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }] }],
    codeTitle: ['Profit-first greedy with DSU "latest free slot"', 'Deadline-first greedy with a min-heap (same answer)'],
    viz: {
      title: 'Job sequencing: richest job first, parked in the latest free slot',
      input: '2/100 1/19 2/27 1/25 3/15',
      inputLabel: 'jobs as deadline/profit (2 to 9 jobs, deadline 1..6, profit 1..999)',
      gen: function (input) {
        var toks = String(input === undefined ? '' : input).trim().split(/[\s,]+/);
        var jobs = [];
        toks.forEach(function (t, i) {
          var m = /^(\d+)\/(\d+)$/.exec(t);
          if (!m) throw new Error('Write each job as deadline/profit, e.g. "2/100 1/19 2/27".');
          var d = +m[1], p = +m[2];
          if (d < 1 || d > 6 || p < 1 || p > 999) throw new Error('Deadline must be 1..6 and profit 1..999.');
          jobs.push({ name: String.fromCharCode(65 + i), d: d, p: p });
        });
        if (jobs.length < 2 || jobs.length > 9) throw new Error('Give 2 to 9 jobs.');
        var maxD = 0; jobs.forEach(function (j) { maxD = Math.max(maxD, j.d); });
        maxD = Math.min(maxD, jobs.length);
        var slots = []; for (var s = 0; s < maxD; s++) slots.push('·');
        var slotLbl = slots.map(function (_, k) { return 'slot ' + (k + 1); });
        var sorted = jobs.slice().sort(function (a, b) { return b.p - a.p; });
        var names = sorted.map(function (j) { return j.name + ' d' + j.d + ' $' + j.p; });
        var frames = [], total = 0, status = {};
        frames.push({ narr: 'Every job takes one slot. Sort jobs by profit, richest first. The slots (days) are empty. We have ' + maxD + ' useful slot(s) — more than N slots never help.', parts: [
          { type: 'array', label: 'jobs sorted by profit (name, deadline, profit)', values: names },
          { type: 'array', label: 'timeline', values: slots.slice(), idxLabels: slotLbl },
          { type: 'vars', vals: { profit: 0, jobsDone: 0 } }
        ] });
        var done = 0;
        sorted.forEach(function (j, i) {
          var start = Math.min(j.d, maxD) - 1, found = -1, checked = {};
          for (var t = start; t >= 0; t--) { if (slots[t] === '·') { found = t; break; } checked[t] = 'bad'; }
          var jh = {}; for (var k = 0; k < i; k++) jh[k] = status[k]; jh[i] = 'cur';
          var ptr = {}; ptr[start] = 'deadline';
          frames.push({ narr: 'Job <b>' + j.name + '</b> pays ' + j.p + ', deadline ' + j.d + '. Start at slot ' + (start + 1) + ' (the latest it may use) and walk left to find a free slot' + (Object.keys(checked).length ? ' — red slots are already taken.' : '.'), parts: [
            { type: 'array', label: 'jobs sorted by profit', values: names, hl: jh },
            { type: 'array', label: 'timeline', values: slots.slice(), idxLabels: slotLbl, hl: checked, ptr: ptr },
            { type: 'vars', vals: { profit: total, jobsDone: done } }
          ] });
          if (found >= 0) {
            slots[found] = j.name; total += j.p; done++; status[i] = 'ok';
            var jh2 = {}; for (var k2 = 0; k2 <= i; k2++) jh2[k2] = status[k2];
            frames.push({ narr: '<span class="c-g">Slot ' + (found + 1) + ' is free</span> → park job ' + j.name + ' there (as late as possible, so earlier slots stay open for tight deadlines). Profit becomes ' + total + '.', parts: [
              { type: 'array', label: 'jobs sorted by profit', values: names, hl: jh2 },
              { type: 'array', label: 'timeline', values: slots.slice(), idxLabels: slotLbl, hl: one(found, 'ok') },
              { type: 'vars', vals: { profit: total, jobsDone: done }, hl: { profit: 'ok', jobsDone: 'ok' } }
            ] });
          } else {
            status[i] = 'bad';
            var jh3 = {}; for (var k3 = 0; k3 <= i; k3++) jh3[k3] = status[k3];
            frames.push({ narr: '<span class="c-r">Every slot from 1 to ' + (start + 1) + ' is taken</span> by richer jobs → skip ' + j.name + '. Any job we kicked out to make room would be worth at least as much, so skipping is safe.', parts: [
              { type: 'array', label: 'jobs sorted by profit', values: names, hl: jh3 },
              { type: 'array', label: 'timeline', values: slots.slice(), idxLabels: slotLbl },
              { type: 'vars', vals: { profit: total, jobsDone: done } }
            ] });
          }
        });
        var fh = {}; slots.forEach(function (v, k) { if (v !== '·') fh[k] = 'sel'; });
        frames.push({ narr: 'All jobs considered. Done <b>' + done + '</b> job(s) for a total profit of <b>' + total + '</b>. Slot order is the actual running order.', parts: [
          { type: 'array', label: 'final timeline', values: slots.slice(), idxLabels: slotLbl, hl: fh },
          { type: 'vars', vals: { profit: total, jobsDone: done }, hl: { profit: 'sel', jobsDone: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'The classic 5-job example, start to finish',
        html: `<p>A(2,100) B(1,19) C(2,27) D(1,25) E(3,15) → profit order A, C, D, B, E. A goes to slot 2, C to slot 1, D and B (deadline 1) find slot 1 taken → skip, E goes to slot 3. Answer: <b>3 jobs, profit 142</b>, running order C, A, E.</p>
          ${H.arr(['C', 'A', 'E'], { label: 'slots 1..3', hl: { 0: 'g', 1: 'g', 2: 'g' } })}`
      },
      {
        title: 'Same data, the min-heap way',
        html: `<p>Sort by deadline: B(1,19) D(1,25) A(2,100) C(2,27) E(3,15).</p>
          ${H.table(['job', 'push', 'heap size &gt; deadline?', 'heap after', 'total'], [
            ['B d1', '19', '1 &gt; 1 no', '{19}', '19'],
            ['D d1', '25', '2 &gt; 1 → drop 19', '{25}', '25'],
            ['A d2', '100', '2 &gt; 2 no', '{25, 100}', '125'],
            ['C d2', '27', '3 &gt; 2 → drop 25', '{27, 100}', '127'],
            ['E d3', '15', '3 &gt; 3 no', '{15, 27, 100}', H.c('p', '142')]
          ])}
          <p>Invariant: after processing all jobs with deadline ≤ t, the heap holds the most profitable set that fits in t slots. Dropping the cheapest keeps it so.</p>`
      },
      {
        title: 'Why "latest free slot", in numbers',
        html: `<p>Jobs X(d=2, p=50) and Y(d=1, p=40). Profit order: X, Y. Earliest-slot placement: X → slot 1, then Y (needs slot 1) is stuck → <b>50</b>. Latest-slot placement: X → slot 2, Y → slot 1 → <b>90</b>. The sort key decides <i>which</i> jobs we try first; the placement rule decides whether the set we pick is <i>feasible</i> without blocking later jobs.</p>`
      },
      {
        title: 'Deadlines larger than N',
        html: `<p>4 jobs, deadlines 100, 100, 7, 2. Only 4 jobs exist, so at most 4 slots can ever be used — clamp every deadline to <code>min(d, N)</code>. This keeps the DSU / slot array at size N + 1 even when deadlines are 10<sup>9</sup>. Without clamping, an array of size 10<sup>9</sup> is an instant memory error.</p>`
      }
    ],
    deepDive: `<h4>1. When is a set of jobs feasible?</h4>
      <p>A set S of unit jobs can all meet their deadlines <b>iff</b> for every t, the number of jobs in S with deadline ≤ t is at most t. (Sort S by deadline and run them in that order: the k-th job finishes at time k, so you need d<sub>(k)</sub> ≥ k.) This is exactly the feasibility test the brute force uses.</p>
      <h4>2. It is a matroid</h4>
      <p>Feasible sets satisfy the matroid rules: any subset of a feasible set is feasible, and a bigger feasible set always has a job you can add to a smaller one. By the Rado–Edmonds theorem, "add jobs in profit order if the set stays feasible" is optimal for <i>any</i> profits. The latest-free-slot rule is just a fast way to test "stays feasible".</p>
      <h4>3. The two implementations side by side</h4>
      ${H.table(['approach', 'time', 'gives the schedule?', 'notes'], [
        ['profit-desc + scan slots', 'O(N log N + N·D)', 'yes', 'fine for D ≤ ~10<sup>3</sup>'],
        ['profit-desc + DSU', 'O(N log N + N·α(N))', 'yes', 'α(N) ≤ 4 in practice'],
        ['deadline-asc + min-heap', 'O(N log N)', 'only the set', 'shortest code, same answer']
      ])}
      <h4>4. Variants and where greedy stops</h4>
      <ul>
        <li><b>Varying durations, maximize the count</b> of jobs done on time: sort by deadline, push durations into a max-heap, and if the time used exceeds the deadline drop the longest job (Moore–Hodgson; LC 630 Course Schedule III). Still greedy.</li>
        <li><b>Varying durations AND profits</b>: this contains 0/1 knapsack (all deadlines equal) → NP-hard in general; pseudo-polynomial DP over time.</li>
        <li><b>Minimize maximum lateness</b> (every job must run): Earliest Deadline First, proven by an adjacent-swap exchange argument — the same tool as Topic 1.</li>
      </ul>
      <h4>5. Production note</h4>
      <p>Batch schedulers, ad-delivery pacing and print queues use "Earliest Deadline First" and "value density" greedies. Real systems add preemption, release times and multiple machines, where exact optimisation becomes NP-hard and these greedies are used as fast heuristics with known worst-case bounds.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants know the GFG "Job Sequencing" problem by heart and will output the O(N·D) slot-scan version. Ask for the DSU or heap version and they will usually get it right — but they often forget to <b>clamp deadlines to N</b>, or allocate an array of size <code>maxDeadline</code> that blows memory when deadlines are 10<sup>9</sup>.</p>
      <p><b>Use AI as a partner:</b> <code>Give me 5 job sets where placing each job in the EARLIEST free slot loses profit, with the correct answer</code> — a great way to cement why the latest slot matters. Or: <code>Write a brute force over all subsets with the "k-th smallest deadline ≥ k" feasibility test, and a random stress test against my DSU version.</code></p>
      <p><b>Where AI goes wrong:</b> mixing up this problem (unit jobs) with LC 1235 "Maximum Profit in Job Scheduling" (intervals with profits → DP), or with Course Schedule III (durations → max-heap of durations). The names are similar; the algorithms are not.</p>
      <p><b>What you must still own:</b> the exchange argument for "richest first", the reason for "latest slot", and the ability to say which of the three look-alike problems you are facing from the constraints.</p>`,
    problems: [
      {
        title: 'Job Sequencing Problem',
        level: 'Medium',
        tags: ['greedy', 'sorting', 'DSU', 'heap'],
        companies: ['Amazon', 'Microsoft', 'Flipkart', 'Walmart'],
        statement: `<p>You are given <code>N</code> jobs. Job <code>i</code> has <code>deadline[i]</code> and <code>profit[i]</code>. Every job takes exactly <b>1 unit</b> of time, only one job can run at a time, and a job earns its profit only if it finishes <b>no later than its deadline</b> (a job with deadline d must run in one of the slots 1..d). Return <code>[number of jobs done, maximum total profit]</code>.</p>`,
        constraints: `1 ≤ N ≤ 10<sup>5</sup>, 1 ≤ deadline[i] ≤ N, 1 ≤ profit[i] ≤ 500`,
        example: `${H.arr([4, 1, 1, 1], { label: 'deadline' })}${H.arr([20, 10, 40, 30], { label: 'profit', hl: { 0: 'g', 2: 'g' } })}
          <p>Output <b>[2, 60]</b>. Profit order: 40 (d1), 30 (d1), 20 (d4), 10 (d1). ${H.c('g', '40 → slot 1')}, 30 → slot 1 taken ${H.c('r', 'skip')}, ${H.c('g', '20 → slot 4')}, 10 → ${H.c('r', 'skip')}. Three jobs have deadline 1, so only one of them can ever run.</p>`,
        brute: {
          why: `<p>Try all 2<sup>N</sup> subsets; for each, sort its deadlines and check that the k-th smallest deadline is ≥ k (k = 1, 2, …). Keep the most profitable feasible subset. Already 10<sup>6</sup> subsets × sorting at N = 20; hopeless at 10<sup>5</sup>. The waste: we never use the fact that the richest feasible job always belongs in some optimal answer.</p>`,
          code: { lang: 'java', code: `
            int[] bruteJobs(int[] deadline, int[] profit) {
                int n = deadline.length, bestCount = 0, bestProfit = 0;
                for (int mask = 1; mask < (1 << n); mask++) {
                    List<Integer> ds = new ArrayList<>();
                    int p = 0;
                    for (int i = 0; i < n; i++)
                        if ((mask >> i & 1) == 1) { ds.add(deadline[i]); p += profit[i]; }
                    Collections.sort(ds);
                    boolean ok = true;
                    for (int k = 0; k < ds.size(); k++)
                        if (ds.get(k) < k + 1) { ok = false; break; }   // (k+1)-th job finishes at k+1
                    if (ok && (p > bestProfit || (p == bestProfit && ds.size() > bestCount))) {
                        bestProfit = p;
                        bestCount = ds.size();
                    }
                }
                return new int[]{bestCount, bestProfit};
            }`, alt: [
          { lang: 'python', code: `def job_sequencing(deadline, profit):
    n = len(deadline)
    best_count, best_profit = 0, 0
    for mask in range(1, 1 << n):
        ds = []
        p = 0
        for i in range(n):
            if mask >> i & 1:
                ds.append(deadline[i])
                p += profit[i]
        ds.sort()
        ok = True
        for k in range(len(ds)):
            if ds[k] < k + 1:                        # (k+1)-th job finishes at k+1
                ok = False
                break
        if ok and (p > best_profit or (p == best_profit and len(ds) > best_count)):
            best_profit = p
            best_count = len(ds)
    return [best_count, best_profit]` },
          { lang: 'js', code: `function jobSequencing(deadline, profit) {
  const n = deadline.length;
  let bestCount = 0, bestProfit = 0;
  for (let mask = 1; mask < (1 << n); mask++) {
    const ds = [];
    let p = 0;
    for (let i = 0; i < n; i++)
      if ((mask >> i & 1) === 1) { ds.push(deadline[i]); p += profit[i]; }
    ds.sort((a, b) => a - b);
    let ok = true;
    for (let k = 0; k < ds.length; k++)
      if (ds[k] < k + 1) { ok = false; break; }      // (k+1)-th job finishes at k+1
    if (ok && (p > bestProfit || (p === bestProfit && ds.length > bestCount))) {
      bestProfit = p;
      bestCount = ds.length;
    }
  }
  return [bestCount, bestProfit];
}` },
          { lang: 'cpp', code: `vector<int> jobSequencing(vector<int>& deadline, vector<int>& profit) {
    int n = deadline.size(), bestCount = 0, bestProfit = 0;
    for (int mask = 1; mask < (1 << n); mask++) {
        vector<int> ds;
        int p = 0;
        for (int i = 0; i < n; i++)
            if ((mask >> i & 1) == 1) { ds.push_back(deadline[i]); p += profit[i]; }
        sort(ds.begin(), ds.end());
        bool ok = true;
        for (int k = 0; k < (int)ds.size(); k++)
            if (ds[k] < k + 1) { ok = false; break; }   // (k+1)-th job finishes at k+1
        if (ok && (p > bestProfit || (p == bestProfit && (int)ds.size() > bestCount))) {
            bestProfit = p;
            bestCount = ds.size();
        }
    }
    return {bestCount, bestProfit};
}` },
          { lang: 'csharp', code: `int[] BruteJobs(int[] deadline, int[] profit)
{
    int n = deadline.Length, bestCount = 0, bestProfit = 0;
    for (int mask = 1; mask < (1 << n); mask++)
    {
        var ds = new List<int>();
        int p = 0;
        for (int i = 0; i < n; i++)
            if ((mask >> i & 1) == 1) { ds.Add(deadline[i]); p += profit[i]; }
        ds.Sort();
        bool ok = true;
        for (int k = 0; k < ds.Count; k++)
            if (ds[k] < k + 1) { ok = false; break; }   // (k+1)-th job finishes at k+1
        if (ok && (p > bestProfit || (p == bestProfit && ds.Count > bestCount)))
        {
            bestProfit = p;
            bestCount = ds.Count;
        }
    }
    return new[] { bestCount, bestProfit };
}` }
        ] }
        },
        mcq: {
          q: 'You accepted a job with deadline 5 and slots 1..5 are all free. Where should it go?',
          options: ['Slot 1, do it as early as possible', 'Slot 5, the latest slot its deadline allows', 'Any slot, it does not matter', 'Slot 3, the middle'],
          answer: 1,
          explain: 'Parking it as late as allowed keeps slots 1..4 free for later jobs with tighter deadlines. Using slot 1 can block a job with deadline 1 that comes later in the profit order.'
        },
        hints: [
          `<p><b>Aha:</b> the most profitable job can always be in an optimal schedule — if all its possible slots are full, swap it in for a cheaper job sitting in one of them.</p>`,
          `<p>Process jobs by profit (descending) and put each one in the <b>latest free slot ≤ its deadline</b>. To find that slot fast, use DSU: <code>find(t)</code> returns the latest free slot ≤ t, and after using slot s set <code>parent[s] = s − 1</code>. Slot 0 means "nothing free".</p>`,
          `<p>Edge cases: many jobs with the same deadline (only d of them can fit), deadlines larger than N (clamp), ties in profit (any order works). Recipe: sort indices by profit desc → parent[t] = t → for each job: s = find(min(d, N)); if s &gt; 0 → count++, profit += p, parent[s] = s − 1 → return [count, profit].</p>`
        ],
        tests: { sig: 'int[] int[] -> int[]', fn: 'jobSequencing', cases: [
          [[[4, 1, 1, 1], [20, 10, 40, 30]], [2, 60]],
          [[[2, 1, 2, 1, 3], [100, 19, 27, 25, 15]], [3, 142]],
          [[[1], [7]], [1, 7]],
          [[[1, 1, 1], [5, 5, 5]], [1, 5]],
          [[[2, 1], [50, 40]], [2, 90]],
          [[[3, 3, 3], [1, 2, 3]], [3, 6]],
          [[[2, 2, 1, 3, 3, 1], [10, 20, 30, 40, 50, 60]], [3, 150]],
          [[{$range: [1, 100001, 1]}, {$rep: 500, n: 100000}], [100000, 50000000]],
          [[{$rep: 1, n: 100000}, {$concat: [[1], {$rep: 500, n: 99999}]}], [1, 500]]
        ] },
        solution: {
          approach: `<p>Richest job first; place it in the latest free slot not after its deadline (DSU makes the search near O(1)); skip it if none is free. The exchange argument proves the profit order; the latest-slot rule keeps the chosen set feasible without blocking tighter deadlines.</p>`,
          code: `
            import java.util.*;

            class Solution {
                private int[] parent;   // parent chain points to the latest free slot <= t

                private int find(int t) {
                    while (parent[t] != t) {
                        parent[t] = parent[parent[t]];   // path halving
                        t = parent[t];
                    }
                    return t;
                }

                public int[] jobSequencing(int[] deadline, int[] profit) {
                    int n = deadline.length;
                    parent = new int[n + 1];
                    for (int t = 0; t <= n; t++) parent[t] = t;   // every slot free; 0 = sentinel

                    Integer[] order = new Integer[n];
                    for (int i = 0; i < n; i++) order[i] = i;
                    Arrays.sort(order, (a, b) -> Integer.compare(profit[b], profit[a]));

                    int count = 0, total = 0;
                    for (int i : order) {
                        int slot = find(Math.min(deadline[i], n));   // latest free slot <= deadline
                        if (slot == 0) continue;                     // all earlier slots are taken
                        count++;
                        total += profit[i];
                        parent[slot] = slot - 1;                     // mark used: point left
                    }
                    return new int[]{count, total};
                }

                public static void main(String[] args) {
                    Solution s = new Solution();
                    System.out.println(Arrays.toString(s.jobSequencing(new int[]{4, 1, 1, 1}, new int[]{20, 10, 40, 30})));          // [2, 60]
                    System.out.println(Arrays.toString(s.jobSequencing(new int[]{2, 1, 2, 1, 3}, new int[]{100, 19, 27, 25, 15}))); // [3, 142]
                }
            }`,
          alt: [{ lang: 'python', code: `def job_sequencing(deadline, profit):
    n = len(deadline)
    parent = list(range(n + 1))          # find(t) = latest free slot <= t, 0 = none

    def find(t):
        while parent[t] != t:
            parent[t] = parent[parent[t]]
            t = parent[t]
        return t

    count = total = 0
    for i in sorted(range(n), key=lambda i: -profit[i]):   # richest first
        slot = find(min(deadline[i], n))
        if slot:
            count += 1
            total += profit[i]
            parent[slot] = slot - 1
    return [count, total]

print(job_sequencing([4, 1, 1, 1], [20, 10, 40, 30]))          # [2, 60]
print(job_sequencing([2, 1, 2, 1, 3], [100, 19, 27, 25, 15]))  # [3, 142]`, run: true }, { lang: 'js', code: `function jobSequencing(deadline, profit) {
  const n = deadline.length;
  const parent = Int32Array.from({ length: n + 1 }, (_, t) => t);   // find(t) = latest free slot <= t
  const find = (t) => {
    while (parent[t] !== t) { parent[t] = parent[parent[t]]; t = parent[t]; }
    return t;
  };
  const order = deadline.map((_, i) => i).sort((a, b) => profit[b] - profit[a]);   // richest first
  let count = 0, total = 0;
  for (const i of order) {
    const slot = find(Math.min(deadline[i], n));
    if (slot === 0) continue;          // no free slot before the deadline
    count++;
    total += profit[i];
    parent[slot] = slot - 1;           // slot used: point left
  }
  return [count, total];
}` }, { lang: 'cpp', code: `class Solution {
    vector<int> parent;                         // parent chain leads to the latest free slot <= t
    int find(int t) {
        while (parent[t] != t) { parent[t] = parent[parent[t]]; t = parent[t]; }
        return t;
    }
public:
    vector<int> jobSequencing(vector<int>& deadline, vector<int>& profit) {
        int n = deadline.size();
        parent.resize(n + 1);
        iota(parent.begin(), parent.end(), 0);  // slot 0 = "nothing free"
        vector<int> order(n);
        iota(order.begin(), order.end(), 0);
        sort(order.begin(), order.end(), [&](int a, int b) { return profit[a] > profit[b]; });
        int count = 0, total = 0;
        for (int i : order) {
            int slot = find(min(deadline[i], n));
            if (slot == 0) continue;
            count++;
            total += profit[i];
            parent[slot] = slot - 1;
        }
        return {count, total};
    }
};` }, { lang: 'csharp', code: `using System;
using System.Linq;

public class Solution
{
    private int[] parent;   // parent chain points to the latest free slot <= t

    private int Find(int t)
    {
        while (parent[t] != t)
        {
            parent[t] = parent[parent[t]];   // path halving
            t = parent[t];
        }
        return t;
    }

    public int[] JobSequencing(int[] deadline, int[] profit)
    {
        int n = deadline.Length;
        parent = new int[n + 1];
        for (int t = 0; t <= n; t++) parent[t] = t;   // every slot free; 0 = sentinel

        // richest first (OrderByDescending is stable: equal profits keep input order)
        var order = Enumerable.Range(0, n).OrderByDescending(i => profit[i]).ToArray();

        int count = 0, total = 0;
        foreach (int i in order)
        {
            int slot = Find(Math.Min(deadline[i], n));   // latest free slot <= deadline
            if (slot == 0) continue;                     // all earlier slots are taken
            count++;
            total += profit[i];
            parent[slot] = slot - 1;                     // mark used: point left
        }
        return new[] { count, total };
    }
}` }],
          dry: {
            head: ['job (profit, deadline)', 'find(min(d, 4))', 'slot', 'action', 'parent change', 'count / profit'],
            rows: [
              ['40, d1', 'find(1) = 1', '1', '<span class="c-g">take</span>', 'parent[1] = 0', '1 / 40'],
              ['30, d1', 'find(1) → 0', '0', '<span class="c-r">skip</span>', '—', '1 / 40'],
              ['20, d4', 'find(4) = 4', '4', '<span class="c-g">take</span>', 'parent[4] = 3', '2 / 60'],
              ['10, d1', 'find(1) → 0', '0', '<span class="c-r">skip</span>', '—', '<span class="c-p">2 / 60</span>']
            ]
          },
          complexity: `<p><b>Time O(N log N)</b> for sorting + O(N·α(N)) for the DSU finds (α is the inverse Ackermann function, ≤ 4 for any realistic N). <b>Space O(N)</b> for the parent array and the index order.</p>`,
          followUps: ['Print the actual running order of the chosen jobs.', 'Jobs now take different amounts of time but all profits are 1: maximize the count (LC 630).', 'Minimize the total penalty of missed jobs instead of maximizing profit — what changes?', 'Two machines instead of one.']
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 4 — Fractional knapsack
  // =====================================================================
  topics.push({
    title: 'Fractional Knapsack (Greedy by Value per Kg)',
    analogy: `<p>You walk into a spice market with a bag that holds <b>50 kg</b>. There are open sacks of saffron, cardamom and rice, and you are allowed to <b>scoop any amount</b> from each sack. Obviously you fill up on the most expensive-per-kg spice first (saffron), then the next most expensive, and when the bag is nearly full you scoop just enough of the next spice to fill the last gap. That is the whole algorithm.</p>
      <p>Compare a <b>jewellery shop</b>: a necklace cannot be cut in half. Same bag, same prices — but now the "best per kg first" habit can leave an awkward empty gap. That difference (sand vs. solid objects) is the difference between greedy and DP.</p>`,
    explain: `<p>Each item has a <b>value</b> and a <b>weight</b>, and you may take any <b>fraction</b> of an item (taking fraction f gives f·value and uses f·weight). Compute the <b>ratio = value ÷ weight</b> (rupees per kg) and take items from the highest ratio down. Only the very last item might be cut.</p>
      ${H.table(['item', 'value', 'weight', 'value/kg', 'take (W = 50)', 'gain'], [
        ['0', '60', '10', H.c('y', '6'), 'all 10 kg', '60'],
        ['1', '100', '20', H.c('y', '5'), 'all 20 kg', '100'],
        ['2', '120', '30', H.c('y', '4'), '20 of 30 kg (2/3)', '80'],
        ['', '', '', '', 'bag full', H.c('p', '240')]
      ])}
      <p><b>Why greedy is safe here (exchange argument, per kilo):</b> think of every item as a pile of 1-kg slices, each slice worth the item's ratio. Suppose the bag holds a slice of a cheaper-per-kg item while a slice of a better-per-kg item is left outside. Swap those two slices: weight unchanged, value goes up. So in a best bag no such "bad slice" exists — the bag is filled from the highest ratio down, which is exactly what greedy builds.</p>
      <p>${H.c('r', 'Careful:')} the moment items <b>cannot be cut</b> (0/1 knapsack) this breaks. Same items, W = 50: ratio greedy takes items 0 + 1 = 160, then item 2 (30 kg) no longer fits into the 20 kg left; but items 1 + 2 = <b>220</b>. Whole items need DP (DSA 17).</p>
      <p><b>Three things to get right in code:</b></p>
      <ul>
        <li>Sort by ratio <b>descending</b>; compare <code>v1/w1</code> vs <code>v2/w2</code> as <code>v1·w2</code> vs <code>v2·w1</code> in 64-bit integers (exact, no rounding).</li>
        <li>The answer is a <b>double</b>: <code>(double) value * left / weight</code> — cast <i>before</i> dividing.</li>
        <li>Stop as soon as the bag is full.</li>
      </ul>`,
    clues: [
      '"You may take a <b>fraction / part</b> of an item", "liquid", "dust", "gold powder", "can break items" → greedy by value/weight.',
      '"Maximize total value with a weight / capacity limit" — first ask: <b>can items be split?</b> Yes → greedy. No → 0/1 knapsack DP.',
      'Answer is a <b>double</b> ("print with 2 decimals", "within 10<sup>-6</sup>") → strong hint it is fractional.',
      '<code>N ≤ 10<sup>5</sup></code>, capacity up to 10<sup>9</sup> → a DP over capacity is impossible, sort-by-ratio is O(N log N).',
      '"Maximum units on a truck", "load boxes with the most units per box first" → same greedy with whole boxes but <b>equal size</b> boxes (integral version that still works because every box weighs 1).'
    ],
    code: [{ lang: 'java', code: `
      // Fractional knapsack: highest value-per-weight first, cut only the last item.
      double fractionalKnapsack(int[] val, int[] wt, long capacity) {
          int n = val.length;
          Integer[] order = new Integer[n];
          for (int i = 0; i < n; i++) order[i] = i;
          // val[y]/wt[y] vs val[x]/wt[x] via cross multiplication (exact, no doubles)
          Arrays.sort(order, (x, y) -> Long.compare((long) val[y] * wt[x], (long) val[x] * wt[y]));
          double total = 0;
          long left = capacity;
          for (int i : order) {
              if (left == 0) break;                         // bag is full
              if (wt[i] <= left) { total += val[i]; left -= wt[i]; }       // take it all
              else { total += (double) val[i] * left / wt[i]; left = 0; }  // take a slice
          }
          return total;
      }`, alt: [{ lang: 'python', code: `# Fractional knapsack: highest value-per-weight first, cut only the last item.
from functools import cmp_to_key

def fractional_knapsack(val, wt, capacity):
    # val[y]/wt[y] vs val[x]/wt[x] by cross multiplication (exact, no floats)
    order = sorted(range(len(val)), key=cmp_to_key(lambda x, y: val[y] * wt[x] - val[x] * wt[y]))
    total, left = 0.0, capacity
    for i in order:
        if left == 0:
            break                                    # bag is full
        if wt[i] <= left:                            # take it all
            total += val[i]
            left -= wt[i]
        else:                                        # take a slice
            total += val[i] * left / wt[i]
            left = 0
    return total` }, { lang: 'js', code: `// Fractional knapsack: highest value-per-weight first, cut only the last item.
function fractionalKnapsack(val, wt, capacity) {
  // val[y]/wt[y] vs val[x]/wt[x] by cross multiplication (exact while products stay below 2^53)
  const order = val.map((_, i) => i).sort((x, y) => val[y] * wt[x] - val[x] * wt[y]);
  let total = 0, left = capacity;
  for (const i of order) {
    if (left === 0) break;                                      // bag is full
    if (wt[i] <= left) { total += val[i]; left -= wt[i]; }      // take it all
    else { total += val[i] * left / wt[i]; left = 0; }          // take a slice
  }
  return total;
}` }, { lang: 'cpp', code: `// Fractional knapsack: highest value-per-weight first, cut only the last item.
double fractionalKnapsack(const vector<int>& val, const vector<int>& wt, long long capacity) {
    vector<int> order(val.size());
    iota(order.begin(), order.end(), 0);
    // val[x]/wt[x] > val[y]/wt[y] by cross multiplication in long long (exact)
    sort(order.begin(), order.end(), [&](int x, int y) {
        return (long long) val[x] * wt[y] > (long long) val[y] * wt[x];
    });
    double total = 0;
    long long left = capacity;
    for (int i : order) {
        if (left == 0) break;                                           // bag is full
        if (wt[i] <= left) { total += val[i]; left -= wt[i]; }          // take it all
        else { total += (double) val[i] * left / wt[i]; left = 0; }     // take a slice
    }
    return total;
}` }, { lang: 'csharp', code: `// Fractional knapsack: highest value-per-weight first, cut only the last item.
double FractionalKnapsack(int[] val, int[] wt, long capacity)
{
    int n = val.Length;
    int[] order = new int[n];
    for (int i = 0; i < n; i++) order[i] = i;
    // val[y]/wt[y] vs val[x]/wt[x] via cross multiplication (exact, no doubles)
    Array.Sort(order, (x, y) => ((long)val[y] * wt[x]).CompareTo((long)val[x] * wt[y]));
    double total = 0;
    long left = capacity;
    foreach (int i in order)
    {
        if (left == 0) break;                         // bag is full
        if (wt[i] <= left) { total += val[i]; left -= wt[i]; }       // take it all
        else { total += (double)val[i] * left / wt[i]; left = 0; }   // take a slice
    }
    return total;
}` }] }, {
      lang: 'python', run: true, title: 'Python: greedy vs the 0/1 trap on the same items', code: `def fractional(items, cap):
    # items: list of (value, weight); best value per kg first
    total = 0.0
    for v, w in sorted(items, key=lambda it: it[0] / it[1], reverse=True):
        if cap == 0:
            break
        take = min(w, cap)
        total += v * take / w
        cap -= take
    return total

def zero_one_brute(items, cap):
    # whole items only: try every subset (fine for tiny inputs)
    best = 0
    n = len(items)
    for mask in range(1 << n):
        v = sum(items[i][0] for i in range(n) if mask >> i & 1)
        w = sum(items[i][1] for i in range(n) if mask >> i & 1)
        if w <= cap:
            best = max(best, v)
    return best

items = [(60, 10), (100, 20), (120, 30)]
print("fractional greedy:", fractional(items, 50))    # 240.0
print("0/1 true best:   ", zero_one_brute(items, 50)) # 220 (items 1 and 2)` }],
    codeTitle: ['Fractional knapsack', 'Fractional vs 0/1 on the same data (runnable)'],
    viz: {
      title: 'Filling the bag: best value-per-kg first, slice the last one',
      input: '60/10 100/20 120/30 | 50',
      inputLabel: 'items as value/weight | capacity (2 to 7 items, numbers 1..999)',
      gen: function (input) {
        var p = splitBar(input, 2, 'items | capacity, e.g. "60/10 100/20 120/30 | 50"');
        var toks = p[0].split(/[\s,]+/).filter(function (x) { return x; });
        var items = [];
        toks.forEach(function (t, i) {
          var m = /^(\d+)\/(\d+)$/.exec(t);
          if (!m) throw new Error('Write each item as value/weight, e.g. "60/10".');
          var v = +m[1], w = +m[2];
          if (v < 1 || v > 999 || w < 1 || w > 999) throw new Error('Values and weights must be 1..999.');
          items.push({ name: 'item' + i, v: v, w: w, r: v / w });
        });
        if (items.length < 2 || items.length > 7) throw new Error('Give 2 to 7 items.');
        var cap = parseNums(p[1], 'capacity', 1, 1, 1, 999)[0];
        var frames = [];
        frames.push({ narr: 'Items as they were given. A bag of capacity <b>' + cap + '</b>. Step 1: work out how valuable each kilo of every item is (value ÷ weight).', parts: [
          { type: 'bars', label: 'value per kg (input order)', values: items.map(function (it) { return fmt2(it.r); }), texts: items.map(function (it) { return it.v + '/' + it.w + '=' + fmt2(it.r); }), idxLabels: items.map(function (it) { return it.name; }) },
          { type: 'vars', vals: { capacityLeft: cap, totalValue: 0 } }
        ] });
        var s = items.slice().sort(function (a, b) { return b.r - a.r; });
        var rv = s.map(function (it) { return fmt2(it.r); }), rl = s.map(function (it) { return it.name; });
        var rt = s.map(function (it) { return it.v + '/' + it.w + '=' + fmt2(it.r); });
        frames.push({ narr: 'Step 2: sort by value per kg, <b>highest first</b>. Every kilo on the left is worth more than every kilo on the right, so we always want left kilos before right kilos.', parts: [
          { type: 'bars', label: 'sorted by value per kg', values: rv, texts: rt, idxLabels: rl },
          { type: 'stack', label: 'bag contents', items: [] },
          { type: 'vars', vals: { capacityLeft: cap, totalValue: 0 } }
        ] });
        var left = cap, total = 0, bag = [], st = {};
        for (var i = 0; i < s.length; i++) {
          var it = s[i], hl = {};
          for (var k = 0; k < i; k++) hl[k] = st[k];
          if (left === 0) {
            for (var k2 = i; k2 < s.length; k2++) hl[k2] = 'done';
            frames.push({ narr: 'The bag is full (0 kg left). Everything from <b>' + it.name + '</b> onward stays outside — those kilos are worth less than anything already in the bag.', parts: [
              { type: 'bars', label: 'sorted by value per kg', values: rv, texts: rt, idxLabels: rl, hl: hl },
              { type: 'stack', label: 'bag contents', items: bag.slice() },
              { type: 'vars', vals: { capacityLeft: 0, totalValue: fmt2(total) } }
            ] });
            break;
          }
          if (it.w <= left) {
            left -= it.w; total += it.v; bag.push(it.name + ': all ' + it.w + 'kg (+' + it.v + ')'); st[i] = 'ok'; hl[i] = 'ok';
            frames.push({ narr: '<b>' + it.name + '</b> weighs ' + it.w + ' kg and ' + (left + it.w) + ' kg are free → it fits completely. Take all of it: +' + it.v + '. ' + left + ' kg left.', parts: [
              { type: 'bars', label: 'sorted by value per kg', values: rv, texts: rt, idxLabels: rl, hl: hl, ptr: one(i, 'now') },
              { type: 'stack', label: 'bag contents', items: bag.slice(), hl: one(bag.length - 1, 'ok') },
              { type: 'vars', vals: { capacityLeft: left, totalValue: fmt2(total) }, hl: { totalValue: 'ok' } }
            ] });
          } else {
            var gain = it.v * left / it.w;
            total += gain; bag.push(it.name + ': ' + left + '/' + it.w + 'kg (+' + fmt2(gain) + ')'); st[i] = 'cur'; hl[i] = 'cur';
            frames.push({ narr: '<b>' + it.name + '</b> weighs ' + it.w + ' kg but only ' + left + ' kg are free. Items can be cut, so scoop exactly ' + left + ' kg = ' + left + '/' + it.w + ' of it, worth ' + it.v + ' × ' + left + ' / ' + it.w + ' = <b>' + fmt2(gain) + '</b>. The bag is now full.', parts: [
              { type: 'bars', label: 'sorted by value per kg', values: rv, texts: rt, idxLabels: rl, hl: hl, ptr: one(i, 'slice') },
              { type: 'stack', label: 'bag contents', items: bag.slice(), hl: one(bag.length - 1, 'cur') },
              { type: 'vars', vals: { capacityLeft: 0, totalValue: fmt2(total) }, hl: { totalValue: 'ok' } }
            ] });
            left = 0;
          }
        }
        frames.push({ narr: 'Done. Maximum value = <b>' + fmt2(total) + '</b>' + (left > 0 ? ' (everything fit, ' + left + ' kg still free)' : '') + '. At most one item was cut. If items could NOT be cut, this answer could be wrong — try "60/10 100/20 120/30 | 50": whole items give only 220.', parts: [
          { type: 'stack', label: 'bag contents', items: bag.slice() },
          { type: 'vars', vals: { capacityLeft: left, totalValue: fmt2(total) }, hl: { totalValue: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Everything fits',
        html: `<p>Items (10, 5) and (20, 10), capacity 100. Total weight 15 ≤ 100, so take both completely → <b>30</b>. The loop simply runs out of items with 85 kg still free. Do not divide by zero or "cut" anything when there is room.</p>`
      },
      {
        title: 'Tiny capacity: only a slice of the best item',
        html: `<p>Items (500, 30) ratio 16.67 and (100, 1) ratio 100, capacity 1. Best ratio is the small item (100 per kg) — take it all → 100, bag full. Notice the expensive-looking 500 item loses because <b>per kg</b> it is worse. Sorting by value alone would have scooped 1/30 of it = 16.67.</p>`
      },
      {
        title: 'Same items, whole pieces only: greedy is 20 short',
        html: `<p>Values 60/100/120, weights 10/20/30, capacity 50.</p>
          ${H.table(['version', 'choice', 'value'], [['fractional (greedy)', '0 all, 1 all, 2/3 of item 2', H.c('g', '240')], ['0/1 with ratio greedy', '0 all, 1 all, item 2 does not fit', H.c('r', '160')], ['0/1 true best (DP)', 'items 1 and 2', H.c('g', '220')]])}
          <p>The fractional answer (240) is always an <b>upper bound</b> for the 0/1 answer — that is why branch-and-bound knapsack solvers use it to prune.</p>`
      },
      {
        title: 'Maximum Units on a Truck (LC 1710) — the integral cousin',
        html: `<p>boxTypes = [[1,3],[2,2],[3,1]] (count, units per box), truck holds 4 boxes. Every box has the same "weight" (1 slot), so sort by units per box: take 1 box of 3, 2 boxes of 2, 1 box of 1 → 3 + 4 + 1 = <b>8</b>. Greedy works for whole boxes here only because all boxes weigh the same, so no awkward gap can appear.</p>`
      }
    ],
    deepDive: `<h4>1. Formal exchange argument</h4>
      <p>Sort so that r<sub>1</sub> ≥ r<sub>2</sub> ≥ … (r = v/w). Let x<sub>i</sub> ∈ [0, 1] be the fraction of item i taken by an optimal solution O, and suppose there are i &lt; j with x<sub>i</sub> &lt; 1 and x<sub>j</sub> &gt; 0. Move δ = min((1 − x<sub>i</sub>)·w<sub>i</sub>, x<sub>j</sub>·w<sub>j</sub>) kilograms from item j to item i. Weight is unchanged; value changes by δ·(r<sub>i</sub> − r<sub>j</sub>) ≥ 0. Repeat until no such pair exists — that is precisely the greedy solution, with value ≥ O's.</p>
      <h4>2. Doing it in O(N) — no sort</h4>
      <p>You only need the "cut point": the ratio r* such that items with ratio &gt; r* all fit and the item at r* is cut. Find it with a quickselect-style partition on ratios (weighted median): each round partitions around a pivot ratio and recurses into one side → expected O(N). Rarely needed in interviews, but it is a great "can you beat N log N?" follow-up answer.</p>
      <h4>3. Precision</h4>
      <ul>
        <li>Sorting by floating-point ratios can mis-order items whose ratios differ in the 15th digit; cross multiplication in 64-bit integers is exact (values ≤ 10<sup>9</sup> → products ≤ 10<sup>18</sup> &lt; 9.2·10<sup>18</sup>).</li>
        <li>Accumulate whole items as an integer and add the single fractional part at the end to avoid summing many rounding errors.</li>
        <li>If the output must be an exact fraction, keep numerator/denominator separately.</li>
      </ul>
      <h4>4. Where it is used for real</h4>
      <p>It is the <b>LP relaxation</b> of 0/1 knapsack: the fractional optimum bounds the integer optimum, so branch-and-bound solvers compute it at every node to prune. Portfolio allocation with divisible assets, bandwidth allocation, and "fill the cheapest power plants first" (merit-order dispatch in electricity markets) are the same greedy on a continuous resource.</p>
      <h4>5. Complexity</h4>
      <p>O(N log N) time for the sort, O(N) for the fill; O(N) space for the index array (or O(1) if you sort an array of item objects in place).</p>`,
    aiEra: `<p><b>What AI changes:</b> this is a solved, textbook problem — assistants produce correct fractional knapsack code almost every time. The risk is the <b>opposite mistake</b>: when you paste a 0/1 knapsack problem ("each item can be taken at most once"), assistants sometimes reach for the ratio greedy because it is shorter. They also love <code>(a, b) -&gt; (int)(b.ratio - a.ratio)</code>, which truncates 0.7 to 0 and sorts wrongly.</p>
      <p><b>Use AI as a partner:</b> <code>Is this statement fractional or 0/1 knapsack? Quote the exact words that decide it.</code> and <code>Write a stress test comparing my answer with brute force on 1000 random tiny inputs.</code> The runnable Python above is that kind of check in miniature.</p>
      <p><b>Where AI goes wrong:</b> integer division (<code>val * left / wt</code> in int), casting comparator differences to int, and forgetting to stop when capacity hits 0.</p>
      <p><b>What you must still own:</b> the one question that decides everything — <i>can items be split?</i> — plus the per-kilo exchange argument and the ability to show the 0/1 counterexample on the whiteboard in 20 seconds.</p>`,
    problems: [
      {
        title: 'Fractional Knapsack',
        level: 'Easy',
        tags: ['greedy', 'sorting', 'ratio'],
        companies: ['Amazon', 'Microsoft', 'Samsung', 'Adobe'],
        statement: `<p>Given <code>N</code> items with <code>val[i]</code> and <code>wt[i]</code>, and a bag of capacity <code>W</code>, you may put any <b>fraction</b> of an item into the bag (taking fraction f of item i gives f·val[i] value and uses f·wt[i] weight). Return the maximum total value.</p>`,
        constraints: `1 ≤ N ≤ 10<sup>5</sup>, 1 ≤ val[i], wt[i] ≤ 10<sup>5</sup>, 1 ≤ W ≤ 10<sup>9</sup>`,
        example: `${H.arr([60, 100, 120], { label: 'val' })}${H.arr([10, 20, 30], { label: 'wt' })}${H.arr([6, 5, 4], { label: 'val/wt', hl: { 0: 'g', 1: 'g', 2: 'y' } })}
          <p>W = 50 → Output <b>240.0</b>: ${H.c('g', 'all of item 0 (60) + all of item 1 (100)')} uses 30 kg, then ${H.c('y', '20/30 of item 2 = 80')} fills the last 20 kg.</p>`,
        brute: {
          why: `<p>Every best bag is "fill items in some order, cutting only the last one". So you could try all N! orders and fill greedily in each. For N = 12 that is already ~479 million orders. The wasted work: almost every order is obviously worse than "best ratio first".</p>`,
          code: { lang: 'java', code: `
            double best = 0;

            double bruteAllOrders(int[] val, int[] wt, int cap) {
                best = 0;
                tryOrders(val, wt, new boolean[val.length], 0.0, cap);
                return best;
            }

            // fill the bag with the next unused item, in every possible order
            void tryOrders(int[] val, int[] wt, boolean[] used, double gained, int left) {
                best = Math.max(best, gained);
                if (left == 0) return;
                for (int i = 0; i < val.length; i++) {
                    if (used[i]) continue;
                    used[i] = true;
                    int take = Math.min(left, wt[i]);                 // whole item or what fits
                    tryOrders(val, wt, used, gained + (double) val[i] * take / wt[i], left - take);
                    used[i] = false;
                }
            }`, alt: [
          { lang: 'python', code: `def fractional_knapsack(val, wt, cap):
    best = 0.0

    # fill the bag with the next unused item, in every possible order
    def try_orders(used, gained, left):
        nonlocal best
        best = max(best, gained)
        if left == 0:
            return
        for i in range(len(val)):
            if used[i]:
                continue
            used[i] = True
            take = min(left, wt[i])                  # whole item or what fits
            try_orders(used, gained + val[i] * take / wt[i], left - take)
            used[i] = False

    try_orders([False] * len(val), 0.0, cap)
    return best` },
          { lang: 'js', code: `function fractionalKnapsack(val, wt, cap) {
  let best = 0;
  // fill the bag with the next unused item, in every possible order
  function tryOrders(used, gained, left) {
    best = Math.max(best, gained);
    if (left === 0) return;
    for (let i = 0; i < val.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      const take = Math.min(left, wt[i]);            // whole item or what fits
      tryOrders(used, gained + val[i] * take / wt[i], left - take);
      used[i] = false;
    }
  }
  tryOrders(new Array(val.length).fill(false), 0, cap);
  return best;
}` },
          { lang: 'cpp', code: `// fill the bag with the next unused item, in every possible order
void tryOrders(vector<int>& val, vector<int>& wt, vector<bool>& used, double gained, int left, double& best) {
    best = max(best, gained);
    if (left == 0) return;
    for (int i = 0; i < (int)val.size(); i++) {
        if (used[i]) continue;
        used[i] = true;
        int take = min(left, wt[i]);                 // whole item or what fits
        tryOrders(val, wt, used, gained + (double)val[i] * take / wt[i], left - take, best);
        used[i] = false;
    }
}

double fractionalKnapsack(vector<int>& val, vector<int>& wt, int cap) {
    double best = 0;
    vector<bool> used(val.size(), false);
    tryOrders(val, wt, used, 0.0, cap, best);
    return best;
}` },
          { lang: 'csharp', code: `double best = 0;

double BruteAllOrders(int[] val, int[] wt, int cap)
{
    best = 0;
    TryOrders(val, wt, new bool[val.Length], 0.0, cap);
    return best;
}

// fill the bag with the next unused item, in every possible order
void TryOrders(int[] val, int[] wt, bool[] used, double gained, int left)
{
    best = Math.Max(best, gained);
    if (left == 0) return;
    for (int i = 0; i < val.Length; i++)
    {
        if (used[i]) continue;
        used[i] = true;
        int take = Math.Min(left, wt[i]);                 // whole item or what fits
        TryOrders(val, wt, used, gained + (double)val[i] * take / wt[i], left - take);
        used[i] = false;
    }
}` }
        ] }
        },
        mcq: {
          q: 'Same items (val 60/100/120, wt 10/20/30), W = 50, but now items <b>cannot be cut</b>. Ratio-greedy takes items 0 and 1 for 160. What is the true best?',
          options: ['160', '180', '220', '240'],
          answer: 2,
          explain: 'Items 1 + 2 weigh exactly 50 and are worth 220. Greedy by ratio is only correct when items can be split — with whole items you need 0/1 knapsack DP.'
        },
        hints: [
          `<p><b>Aha:</b> one kilo of item A is worth <code>val[A]/wt[A]</code>. Any kilo of a lower ratio item sitting in the bag while a higher ratio kilo is left outside can be swapped for profit → take highest ratio first.</p>`,
          `<p>Sort item indices by ratio, descending. Compare ratios without division using cross multiplication: <code>a/b &gt; c/d ⇔ a·d &gt; c·b</code> (use 64-bit integers in Java and C++). Keep <code>left</code> = remaining capacity.</p>`,
          `<p>Traps: the answer is a floating-point number; in Java and C++ cast before dividing (<code>(double) val * left / wt</code>) or integer division drops the fraction (Python and JS <code>/</code> already keep it); stop once <code>left == 0</code>. Recipe: sort by ratio → for each item: if wt ≤ left take it all, else take <code>left/wt</code> of it and stop.</p>`
        ],
        tests: { sig: 'int[] int[] int -> double', fn: 'fractionalKnapsack', cmp: 'float', cases: [
          [[[60, 100, 120], [10, 20, 30], 50], 240],
          [[[10, 20], [5, 10], 100], 30],
          [[[500, 100], [30, 1], 1], 100],
          [[[7], [3], 1], 2.3333333333333335],
          [[[99999, 100000], [100000, 99999], 100000], 100000.99999],
          [[[1, 2, 3], [1, 1, 1], 2], 5],
          [[[5, 5], [2, 4], 3], 6.25],
          [[{$rep: 100000, n: 100000}, {$rep: 1, n: 100000}, 1000000000], 10000000000],
          [[{$rep: 100000, n: 100000}, {$rep: 100000, n: 100000}, 1000000000], 1000000000]
        ] },
        solution: {
          approach: `<p>Sort by value-per-weight descending; take whole items while they fit, then a fraction of the next one.</p>`,
          code: `
            import java.util.*;

            class Solution {
                public double fractionalKnapsack(int[] val, int[] wt, int capacity) {
                    int n = val.length;
                    Integer[] order = new Integer[n];
                    for (int i = 0; i < n; i++) order[i] = i;

                    // Highest value-per-kg first. Compare val[y]/wt[y] vs val[x]/wt[x]
                    // by cross multiplication so no floating point rounding sneaks in.
                    Arrays.sort(order, (x, y) -> Long.compare((long) val[y] * wt[x], (long) val[x] * wt[y]));

                    double total = 0;
                    long left = capacity;                 // remaining room in the bag
                    for (int i : order) {
                        if (left == 0) break;             // bag is full
                        if (wt[i] <= left) {              // whole item fits
                            total += val[i];
                            left -= wt[i];
                        } else {                          // take only the part that fits
                            total += (double) val[i] * left / wt[i];
                            left = 0;
                        }
                    }
                    return total;
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().fractionalKnapsack(
                        new int[]{60, 100, 120}, new int[]{10, 20, 30}, 50));   // 240.0
                }
            }`,
          dry: {
            head: ['item (by ratio)', 'val / wt', 'ratio', 'fits whole?', 'take', 'gain', 'left', 'total'],
            rows: [
              ['0', '60 / 10', '6', '10 ≤ 50 ✔', 'all', '+60', '40', '60'],
              ['1', '100 / 20', '5', '20 ≤ 40 ✔', 'all', '+100', '20', '160'],
              ['2', '120 / 30', '4', '30 ≤ 20 ✘', '20/30', '+80', '0', '<span class="c-p">240</span>']
            ]
          },
          alt: [{ lang: 'python', code: `from functools import cmp_to_key

def fractional_knapsack(val, wt, capacity):
    # highest value per kg first; compare v1/w1 vs v2/w2 exactly by cross-multiplying
    order = sorted(range(len(val)), key=cmp_to_key(lambda x, y: val[y] * wt[x] - val[x] * wt[y]))
    total, left = 0.0, capacity
    for i in order:
        if left == 0:
            break                       # bag is full
        if wt[i] <= left:               # whole item fits
            total += val[i]
            left -= wt[i]
        else:                           # take the slice that fits
            total += val[i] * left / wt[i]
            left = 0
    return total` }, { lang: 'js', code: `function fractionalKnapsack(val, wt, capacity) {
  // best value per kg first; products ≤ 10^10 are exact in a Number
  const order = val.map((_, i) => i).sort((x, y) => val[y] * wt[x] - val[x] * wt[y]);
  let total = 0, left = capacity;
  for (const i of order) {
    if (left === 0) break;                    // bag is full
    if (wt[i] <= left) { total += val[i]; left -= wt[i]; }   // take it all
    else { total += val[i] * left / wt[i]; left = 0; }       // take a slice
  }
  return total;
}` }, { lang: 'cpp', code: `class Solution {
public:
    double fractionalKnapsack(vector<int>& val, vector<int>& wt, int capacity) {
        vector<int> order(val.size());
        iota(order.begin(), order.end(), 0);
        // val[x]/wt[x] > val[y]/wt[y] by cross multiplication in long long (no overflow, no rounding)
        sort(order.begin(), order.end(), [&](int x, int y) {
            return (long long) val[x] * wt[y] > (long long) val[y] * wt[x];
        });
        double total = 0;
        long long left = capacity;
        for (int i : order) {
            if (left == 0) break;
            if (wt[i] <= left) { total += val[i]; left -= wt[i]; }
            else { total += (double) val[i] * left / wt[i]; left = 0; }
        }
        return total;
    }
};` }, { lang: 'csharp', code: `using System;

public class Solution
{
    public double FractionalKnapsack(int[] val, int[] wt, int capacity)
    {
        int n = val.Length;
        int[] order = new int[n];
        for (int i = 0; i < n; i++) order[i] = i;

        // Highest value-per-kg first. Compare val[y]/wt[y] vs val[x]/wt[x]
        // by cross multiplication so no floating point rounding sneaks in.
        Array.Sort(order, (x, y) => ((long)val[y] * wt[x]).CompareTo((long)val[x] * wt[y]));

        double total = 0;
        long left = capacity;                 // remaining room in the bag
        foreach (int i in order)
        {
            if (left == 0) break;             // bag is full
            if (wt[i] <= left)                // whole item fits
            {
                total += val[i];
                left -= wt[i];
            }
            else                              // take only the part that fits
            {
                total += (double)val[i] * left / wt[i];
                left = 0;
            }
        }
        return total;
    }
}` }],
          complexity: `<p><b>Time O(N log N)</b> for the sort, then one O(N) pass. <b>Space O(N)</b> for the index array.</p>`,
          followUps: ['Items cannot be cut any more: what changes, and what is the DP?', 'Can you do it in expected O(N) without fully sorting (weighted-median partition)?', 'Return the exact answer as a reduced fraction.', 'Each item can be taken in multiple copies, still divisible: does anything change?']
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 5 — Huffman coding
  // =====================================================================
  topics.push({
    title: 'Huffman Coding (Greedy Merging of the Two Smallest)',
    analogy: `<p>Think of <b>Morse code</b>: the most common English letter, E, is a single dot "·", while the rare letter Q is "− − · −". Or think of nicknames in a group chat: the friend you mention 50 times a day gets a 2-letter nickname, the one you mention once a month keeps their full name. <b>Frequent things get short codes, rare things get long codes</b> → the whole message gets shorter.</p>`,
    explain: `<p>We want a binary code (0s and 1s) for each character so the total message length <code>∑ freq × codeLength</code> is as small as possible, and no code is the beginning of another (a <b>prefix-free</b> code, so decoding is never ambiguous).</p>
      <p><b>Greedy rule:</b> put every character in a min-heap by frequency. Repeatedly <b>pop the two smallest</b>, join them under a new parent whose weight is their sum, and push the parent back. When one node remains, it is the root. Left edge = 0, right edge = 1.</p>
      ${H.table(['step', 'heap before', 'pop two smallest', 'push', 'cost so far'], [
        ['1', '5 9 12 13 16 45', H.c('r', '5, 9'), H.c('g', '14'), '14'],
        ['2', '12 13 14 16 45', H.c('r', '12, 13'), H.c('g', '25'), '39'],
        ['3', '14 16 25 45', H.c('r', '14, 16'), H.c('g', '30'), '69'],
        ['4', '25 30 45', H.c('r', '25, 30'), H.c('g', '55'), '124'],
        ['5', '45 55', H.c('r', '45, 55'), H.c('g', '100'), H.c('p', '224')]
      ])}
      <p><b>Why add up the merged weights?</b> Every time a character sits under a merge, it gets one more bit. So the sum of all merged weights = ∑ freq × depth = total bits. <b>Why is "two smallest" safe?</b> The two rarest characters should be the deepest (longest codes); swapping a rare deep character with a common shallow one would only make the message longer.</p>
      ${H.kv([['f (45)', '0'], ['c (12)', '100'], ['d (13)', '101'], ['a (5)', '1100'], ['b (9)', '1101'], ['e (16)', '111']], { label: 'codes', hl: { 'f (45)': 'g', 'a (5)': 'r' } })}`,
    clues: [
      '"<b>Minimum total cost to merge / combine</b> piles, ropes, files", cost = sum of the two merged → Huffman (min-heap, always merge two smallest).',
      '"Shortest <b>prefix-free</b> / variable-length binary code", "compress text using character frequencies" → Huffman tree.',
      'Repeatedly "take the two smallest, put their sum back" → a min-heap (<code>PriorityQueue</code> / <code>heapq</code> / <code>priority_queue</code> with <code>greater</code>), O(N log N).',
      'Contrast: if only <b>adjacent</b> piles can be merged, greedy fails → interval DP (DSA 18, interval DP: "minimum cost to merge stones").'
,
      '"<b>Connect N ropes</b> with minimum cost" / "<b>minimum cost to connect sticks</b>" (LC 1167) → literally the Huffman cost computation.',
      '"Merge K <b>sorted files</b> two at a time, cost = total size read" → optimal merge pattern = Huffman.'
    ],
    code: [{ lang: 'java', code: `
      // "Connect ropes" / optimal merge pattern: total = sum of all merges (= Huffman total bits)
      long minMergeCost(int[] sizes) {
          PriorityQueue<Long> pq = new PriorityQueue<>();
          for (int s : sizes) pq.add((long) s);
          long cost = 0;
          while (pq.size() > 1) {
              long a = pq.poll(), b = pq.poll();   // two smallest
              cost += a + b;                       // pay for this merge
              pq.add(a + b);                       // merged pile goes back
          }
          return cost;
      }`, alt: [{ lang: 'python', code: `# "Connect ropes" / optimal merge pattern: total = sum of all merges (= Huffman total bits)
import heapq

def min_merge_cost(sizes):
    pq = list(sizes)
    heapq.heapify(pq)                      # O(N) build
    cost = 0
    while len(pq) > 1:
        a = heapq.heappop(pq)              # two smallest
        b = heapq.heappop(pq)
        cost += a + b                      # pay for this merge
        heapq.heappush(pq, a + b)          # merged pile goes back
    return cost` }, { lang: 'js', code: `// JS has no built-in heap: a small binary min-heap with a comparator.
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp; }
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {                                // sift up
      const p = (i - 1) >> 1;
      if (this.cmp(a[i], a[p]) >= 0) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {                                   // sift down
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.cmp(a[l], a[m]) < 0) m = l;
        if (r < a.length && this.cmp(a[r], a[m]) < 0) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

// "Connect ropes" / optimal merge pattern: total = sum of all merges (= Huffman total bits)
function minMergeCost(sizes) {
  const pq = new MinHeap();
  for (const s of sizes) pq.push(s);
  let cost = 0;
  while (pq.size() > 1) {
    const a = pq.pop(), b = pq.pop();      // two smallest
    cost += a + b;                         // pay for this merge
    pq.push(a + b);                        // merged pile goes back
  }
  return cost;
}` }, { lang: 'cpp', code: `// "Connect ropes" / optimal merge pattern: total = sum of all merges (= Huffman total bits)
long long minMergeCost(const vector<int>& sizes) {
    priority_queue<long long, vector<long long>, greater<long long>> pq(sizes.begin(), sizes.end());   // min-heap
    long long cost = 0;
    while (pq.size() > 1) {
        long long a = pq.top(); pq.pop();          // two smallest
        long long b = pq.top(); pq.pop();
        cost += a + b;                             // pay for this merge
        pq.push(a + b);                            // merged pile goes back
    }
    return cost;
}` }, { lang: 'csharp', code: `// "Connect ropes" / optimal merge pattern: total = sum of all merges (= Huffman total bits)
long MinMergeCost(int[] sizes)
{
    var pq = new MinHeap<long>((a, b) => a.CompareTo(b));
    foreach (int s in sizes) pq.Push(s);
    long cost = 0;
    while (pq.Count > 1)
    {
        long a = pq.Pop(), b = pq.Pop();     // two smallest
        cost += a + b;                       // pay for this merge
        pq.Push(a + b);                      // merged pile goes back
    }
    return cost;
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }] }, { lang: 'java', code: `
      // O(N) after sorting: two queues instead of a heap.
      // Leaves come from 'sorted'; merged nodes are created in non-decreasing order,
      // so the front of each queue is its smallest element.
      long huffmanCostSorted(long[] sorted) {
          ArrayDeque<Long> leaves = new ArrayDeque<>(), merged = new ArrayDeque<>();
          for (long x : sorted) leaves.add(x);
          long cost = 0;
          while (leaves.size() + merged.size() > 1) {
              long a = takeSmallest(leaves, merged);
              long b = takeSmallest(leaves, merged);
              cost += a + b;
              merged.add(a + b);                   // always >= every earlier merged value
          }
          return cost;
      }

      long takeSmallest(ArrayDeque<Long> q1, ArrayDeque<Long> q2) {
          if (q2.isEmpty() || (!q1.isEmpty() && q1.peek() <= q2.peek())) return q1.poll();
          return q2.poll();
      }`, alt: [{ lang: 'python', code: `# O(N) after sorting: two queues instead of a heap.
# Leaves come from 'sorted_w'; merged nodes are created in non-decreasing order,
# so the front of each queue is its smallest element.
from collections import deque

def huffman_cost_sorted(sorted_w):
    leaves, merged = deque(sorted_w), deque()

    def take_smallest():
        if not merged or (leaves and leaves[0] <= merged[0]):
            return leaves.popleft()
        return merged.popleft()

    cost = 0
    while len(leaves) + len(merged) > 1:
        a = take_smallest()
        b = take_smallest()
        cost += a + b
        merged.append(a + b)               # always >= every earlier merged value
    return cost` }, { lang: 'js', code: `// O(N) after sorting: two queues instead of a heap.
// Leaves come from 'sorted'; merged nodes are created in non-decreasing order,
// so the front of each queue is its smallest element. Head indices avoid O(N) shift().
function huffmanCostSorted(sorted) {
  const merged = [];
  let li = 0, mi = 0, cost = 0;
  const takeSmallest = () =>
    mi === merged.length || (li < sorted.length && sorted[li] <= merged[mi]) ? sorted[li++] : merged[mi++];
  while ((sorted.length - li) + (merged.length - mi) > 1) {
    const a = takeSmallest(), b = takeSmallest();
    cost += a + b;
    merged.push(a + b);                    // always >= every earlier merged value
  }
  return cost;
}` }, { lang: 'cpp', code: `// O(N) after sorting: two queues instead of a heap.
// Leaves come from 'sorted'; merged nodes are created in non-decreasing order,
// so the front of each queue is its smallest element.
long long huffmanCostSorted(const vector<long long>& sorted) {
    queue<long long> leaves, merged;
    for (long long x : sorted) leaves.push(x);
    auto takeSmallest = [&]() {
        queue<long long>& q = merged.empty() || (!leaves.empty() && leaves.front() <= merged.front()) ? leaves : merged;
        long long v = q.front();
        q.pop();
        return v;
    };
    long long cost = 0;
    while (leaves.size() + merged.size() > 1) {
        long long a = takeSmallest();
        long long b = takeSmallest();
        cost += a + b;
        merged.push(a + b);                // always >= every earlier merged value
    }
    return cost;
}` }, { lang: 'csharp', code: `// O(N) after sorting: two queues instead of a heap.
// Leaves come from 'sorted'; merged nodes are created in non-decreasing order,
// so the front of each queue is its smallest element.
long HuffmanCostSorted(long[] sorted)
{
    var leaves = new Queue<long>(sorted); var merged = new Queue<long>();
    long cost = 0;
    while (leaves.Count + merged.Count > 1)
    {
        long a = TakeSmallest(leaves, merged);
        long b = TakeSmallest(leaves, merged);
        cost += a + b;
        merged.Enqueue(a + b);               // always >= every earlier merged value
    }
    return cost;
}

long TakeSmallest(Queue<long> q1, Queue<long> q2)
{
    if (q2.Count == 0 || (q1.Count > 0 && q1.Peek() <= q2.Peek())) return q1.Dequeue();
    return q2.Dequeue();
}` }] }],
    codeTitle: ['Huffman cost = "connect ropes" (heap)', 'Linear-time Huffman when frequencies are already sorted'],
    viz: {
      title: 'Huffman: keep merging the two smallest',
      input: '5 9 12 13 16 45',
      inputLabel: 'frequencies of characters a, b, c, … (2 to 8 values)',
      gen: function (input) {
        var f = parseNums(input, 'frequencies', 2, 8, 1, 999);
        var nodes = [], id = 0;
        f.forEach(function (x, i) { nodes.push({ f: x, name: String.fromCharCode(97 + i), id: id++, l: null, r: null }); });
        function sorted() { return nodes.slice().sort(function (a, b) { return a.f - b.f || a.id - b.id; }); }
        function q(list, hl) { return { type: 'queue', label: 'min-heap (shown sorted, smallest at front)', items: list.map(function (n) { return n.name + ':' + n.f; }), hl: hl || {}, frontLabel: 'smallest', backLabel: 'largest' }; }
        var frames = [], cost = 0, log = [];
        frames.push({ narr: 'Put every character into a min-heap keyed by frequency. Rare characters sit at the front — they will end up deepest in the tree (longest codes).', parts: [q(sorted()), { type: 'vars', vals: { totalBits: 0 } }] });
        while (nodes.length > 1) {
          var s = sorted(), a = s[0], b = s[1];
          frames.push({ narr: 'Pop the two smallest: <b>' + a.name + ':' + a.f + '</b> and <b>' + b.name + ':' + b.f + '</b>. Everything under them is about to get one bit longer, so this merge costs ' + a.f + ' + ' + b.f + ' = ' + (a.f + b.f) + ' bits.', parts: [
            q(s, { 0: 'bad', 1: 'bad' }), { type: 'stack', label: 'merges so far', items: log.slice() }, { type: 'vars', vals: { totalBits: cost } }
          ] });
          var p = { f: a.f + b.f, name: '(' + a.name + b.name + ')', id: id++, l: a, r: b };
          if (p.name.length > 9) p.name = 'n' + p.id;
          nodes = nodes.filter(function (n) { return n !== a && n !== b; });
          nodes.push(p);
          cost += p.f;
          log.push(a.f + '+' + b.f + '=' + p.f);
          var s2 = sorted(), hl = {};
          hl[s2.indexOf(p)] = 'ok';
          frames.push({ narr: 'Push the new parent <b>' + p.name + ':' + p.f + '</b> back into the heap (green). Running total of bits = ' + cost + '.', parts: [
            q(s2, hl), { type: 'stack', label: 'merges so far', items: log.slice(), hl: one(log.length - 1, 'ok') }, { type: 'vars', vals: { totalBits: cost }, hl: { totalBits: 'ok' } }
          ] });
        }
        // codes + optional tree picture (only if it fits in depth 4)
        var codes = [], arr = [], deep = false, tags = {};
        (function walk(n, path, idx) {
          if (path.length > 4) deep = true;
          if (idx < 31) { arr[idx] = n.l ? n.f : n.name; if (!n.l) tags[idx] = path || '0'; }
          if (!n.l) { codes.push([n.name + ' (' + n.f + ')', path || '0']); return; }
          walk(n.l, path + '0', 2 * idx + 1);
          walk(n.r, path + '1', 2 * idx + 2);
        })(nodes[0], '', 0);
        for (var i = 0; i < arr.length; i++) if (arr[i] === undefined) arr[i] = null;
        var parts = [{ type: 'map', label: 'final codes (left = 0, right = 1)', entries: codes }, { type: 'vars', vals: { totalBits: cost }, hl: { totalBits: 'sel' } }];
        if (!deep) parts.unshift({ type: 'tree', label: 'Huffman tree (leaf tag = its code)', arr: arr, tags: tags });
        frames.push({ narr: 'One node left = the root. Read each code by walking from the root: left = 0, right = 1. Frequent characters ended up near the top (short codes). Total bits = <b>' + cost + '</b>, the minimum possible.', parts: parts });
        return frames;
      }
    },
    examples: [
      {
        title: 'Connect ropes [4, 3, 2, 6]',
        html: `<p>Each join costs the sum of the two lengths. Always join the two shortest:</p>
          ${H.table(['heap', 'join', 'cost of join', 'running cost'], [['2 3 4 6', '2 + 3', '5', '5'], ['4 5 6', '4 + 5', '9', '14'], ['6 9', '6 + 9', '15', H.c('p', '29')]])}
          <p>Joining the long ropes early would make their length get "paid" again in every later join. Short pieces should be paid many times, long pieces few times — exactly like frequent letters get short codes.</p>`
      },
      {
        title: 'How much does Huffman save over fixed-length codes?',
        html: `<p>Six characters with frequencies 5, 9, 12, 13, 16, 45 (100 characters total). A fixed-length code needs ⌈log₂ 6⌉ = 3 bits per character → <b>300 bits</b>. Huffman needs <b>224 bits</b> — about 25% smaller. The more skewed the frequencies, the bigger the win; if all frequencies are equal and the count is a power of two, Huffman gives exactly the fixed-length code.</p>`
      },
      {
        title: 'Decoding is never ambiguous',
        html: `<p>Codes f = 0, c = 100, d = 101, e = 111, a = 1100, b = 1101. Decode <code>0 1100 100 0</code> written without spaces: <code>011001000</code>. Read bits from the root: 0 → leaf <b>f</b>; 1,1,0,0 → <b>a</b>; 1,0,0 → <b>c</b>; 0 → <b>f</b>. Result "facf". Because no code is a prefix of another, the moment you reach a leaf you know the character is complete — no separators needed.</p>
          ${H.kv([['0', 'f'], ['1100', 'a'], ['100', 'c'], ['0', 'f']], { label: 'bits → char' })}`
      },
      {
        title: 'Edge cases: one character, ties',
        html: `<p><b>One distinct character</b> ("aaaa"): the tree is a single leaf with depth 0 — but you still need at least 1 bit per character to know how many there are, so give it code "0" (total 4 bits). <b>Ties</b> in the heap (two nodes with the same frequency): different tie-breaks give different codes and even different code lengths per character, but the <b>total</b> is always the same minimum. If the output must be unique, the problem must define the tie-break (e.g. by insertion order).</p>`
      }
    ],
    deepDive: `<h4>1. The proof in two lemmas</h4>
      <ol>
        <li><b>Exchange lemma:</b> in some optimal tree, the two least frequent characters x and y are <b>siblings at the maximum depth</b>. Take any optimal tree, find two sibling leaves a, b at the deepest level. Swap x with a: x moves deeper (or same), a moves shallower, and since f(x) ≤ f(a) the cost change is (f(a) − f(x))·(depth(x) − depth(a)) ≤ 0. Same for y and b. Cost does not increase.</li>
        <li><b>Reduction lemma:</b> replace x, y by one new character z with f(z) = f(x) + f(y). Any tree T' for the smaller alphabet gives a tree for the original by splitting z into x and y, and cost(T) = cost(T') + f(x) + f(y). So an optimal T' gives an optimal T — and greedy keeps doing exactly that.</li>
      </ol>
      <h4>2. How good is it?</h4>
      <p>With entropy H = −∑ p·log₂ p (bits per symbol), Huffman's average length L satisfies <b>H ≤ L &lt; H + 1</b>. For the example: p = .05, .09, .12, .13, .16, .45 → H ≈ 2.22, L = 2.24. The "+1" waste comes from each symbol needing a whole number of bits; <b>arithmetic coding</b> and <b>ANS</b> (asymmetric numeral systems) avoid that rounding.</p>
      <h4>3. Real-world use (2026)</h4>
      <ul>
        <li><b>DEFLATE</b> (zip, gzip, PNG) = LZ77 + Huffman. It sends only the <b>code lengths</b>; both sides rebuild the same <b>canonical Huffman code</b> (codes assigned in order of length, then symbol), which saves space in the header.</li>
        <li>DEFLATE limits codes to 15 bits → <b>length-limited Huffman</b> (package-merge algorithm, or heuristics that rebalance).</li>
        <li><b>JPEG</b> baseline uses Huffman; <b>zstd</b> uses Huffman for literals and FSE (a tANS variant) for sequences; <b>Brotli</b> and <b>HPACK</b> (HTTP/2 header compression, with a fixed static Huffman table) use Huffman too.</li>
      </ul>
      <h4>4. Complexity choices</h4>
      <p>Heap: O(N log N). If frequencies are already sorted: the two-queue method is O(N), because merged weights are produced in non-decreasing order. For a 256-symbol byte alphabet the cost is negligible either way — counting frequencies over the data (O(data size)) dominates.</p>
      <h4>5. Looks similar, is not Huffman</h4>
      <p>If only <b>adjacent</b> piles may merge (stones in a row), the order is constrained and the two-smallest greedy is wrong → interval DP (LC 1000 "Minimum Cost to Merge Stones"). If each merge costs the <b>max</b> instead of the sum, or merges are k-way, re-derive the greedy (k-ary Huffman pads with zero-weight dummies so that (N − 1) mod (k − 1) = 0).</p>`,
    aiEra: `<p><b>What AI changes:</b> Huffman is fully memorised by assistants, including the "connect ropes" disguise. You will rarely need to write it from scratch at work — libraries (<code>java.util.zip</code>, zlib, zstd) do it. What remains valuable is <b>recognising the merge-two-smallest structure</b> in unfamiliar wording and explaining why it is optimal.</p>
      <p><b>A modern connection:</b> the tokenizers in today's LLMs use <b>Byte-Pair Encoding (BPE)</b>, another greedy merge process: repeatedly merge the <i>most frequent adjacent pair</i> of symbols into a new token. Unlike Huffman, BPE is a heuristic (not provably optimal) — a nice interview talking point on "greedy that is good enough vs greedy that is optimal".</p>
      <p><b>Use AI as a partner:</b> <code>Generate the Huffman tree for these frequencies and show each heap state; then I will verify the total bits by hand</code>, or <code>Give me 3 problems that are secretly Huffman and 2 that look like it but need interval DP.</code></p>
      <p><b>Where AI goes wrong:</b> int overflow in the total, forgetting the single-character case, claiming the codes are unique when ties exist, and treating "merge adjacent stones" as Huffman.</p>
      <p><b>What you must still own:</b> the two-lemma proof, the entropy bound intuition, and the judgement of when merge order is constrained (DP) vs free (greedy).</p>`,
    problems: [
      {
        title: 'Huffman Coding (Total Encoded Length + Codes)',
        level: 'Medium',
        tags: ['greedy', 'heap', 'tree'],
        companies: ['Amazon', 'Google', 'Microsoft', 'Goldman Sachs'],
        statement: `<p>You are given <code>N</code> distinct characters and how often each appears in a text. Build an optimal prefix-free binary code (Huffman code). Return the <b>minimum total number of bits</b> needed to encode the text, and fill a map with each character's code.</p>
          <p>Ties in the heap may give different codes; any optimal prefix-free code is correct, but the total is always the same.</p>`,
        constraints: `2 ≤ N ≤ 10<sup>5</sup>, 1 ≤ freq[i] ≤ 10<sup>9</sup> (answer fits in a 64-bit integer)`,
        example: `${H.arr(['a:5', 'b:9', 'c:12', 'd:13', 'e:16', 'f:45'], { label: 'freq', hl: { 0: 'r', 1: 'r', 5: 'g' } })}
          <p>Output: <b>224</b> bits. Codes: ${H.c('g', 'f = 0')} (1 bit, most frequent), c = 100, d = 101, e = 111, ${H.c('r', 'a = 1100, b = 1101')} (4 bits, rarest). Check: 45·1 + 12·3 + 13·3 + 16·3 + 5·4 + 9·4 = 45 + 36 + 39 + 48 + 20 + 36 = 224.</p>`,
        brute: {
          why: `<p>Every prefix code tree can be built by merging nodes two at a time in <i>some</i> order. Brute force tries every pair at every step: roughly N<sup>2</sup> × (N−1)<sup>2</sup> × … choices — astronomically many even for N = 10. The waste: the cheapest merge is always the two smallest, so all other branches are pointless.</p>`,
          code: { lang: 'java', code: `
            // try merging every pair, recursively; cost of a merge = merged weight
            long bruteCost(List<Long> w) {
                if (w.size() == 1) return 0;
                long best = Long.MAX_VALUE;
                for (int i = 0; i < w.size(); i++)
                    for (int j = i + 1; j < w.size(); j++) {
                        List<Long> next = new ArrayList<>();
                        for (int k = 0; k < w.size(); k++) if (k != i && k != j) next.add(w.get(k));
                        long merged = w.get(i) + w.get(j);
                        next.add(merged);
                        best = Math.min(best, merged + bruteCost(next));
                    }
                return best;
            }`, alt: [
          { lang: 'python', code: `# try merging every pair, recursively; cost of a merge = merged weight
def huffman(w):
    if len(w) == 1:
        return 0
    best = float('inf')
    for i in range(len(w)):
        for j in range(i + 1, len(w)):
            nxt = [w[k] for k in range(len(w)) if k != i and k != j]
            merged = w[i] + w[j]
            nxt.append(merged)
            best = min(best, merged + huffman(nxt))
    return best` },
          { lang: 'js', code: `// try merging every pair, recursively; cost of a merge = merged weight
function huffman(w) {
  if (w.length === 1) return 0;
  let best = Infinity;
  for (let i = 0; i < w.length; i++)
    for (let j = i + 1; j < w.length; j++) {
      const next = [];
      for (let k = 0; k < w.length; k++) if (k !== i && k !== j) next.push(w[k]);
      const merged = w[i] + w[j];
      next.push(merged);
      best = Math.min(best, merged + huffman(next));
    }
  return best;
}` },
          { lang: 'cpp', code: `// try merging every pair, recursively; cost of a merge = merged weight
long long huffman(vector<long long> w) {
    if (w.size() == 1) return 0;
    long long best = LLONG_MAX;
    for (int i = 0; i < (int)w.size(); i++)
        for (int j = i + 1; j < (int)w.size(); j++) {
            vector<long long> next;
            for (int k = 0; k < (int)w.size(); k++) if (k != i && k != j) next.push_back(w[k]);
            long long merged = w[i] + w[j];
            next.push_back(merged);
            best = min(best, merged + huffman(next));
        }
    return best;
}` },
          { lang: 'csharp', code: `// try merging every pair, recursively; cost of a merge = merged weight
long BruteCost(List<long> w)
{
    if (w.Count == 1) return 0;
    long best = long.MaxValue;
    for (int i = 0; i < w.Count; i++)
        for (int j = i + 1; j < w.Count; j++)
        {
            var next = new List<long>();
            for (int k = 0; k < w.Count; k++) if (k != i && k != j) next.Add(w[k]);
            long merged = w[i] + w[j];
            next.Add(merged);
            best = Math.Min(best, merged + BruteCost(next));
        }
    return best;
}` }
        ] }
        },
        mcq: {
          q: 'Heap holds frequencies 4, 7, 9, 20. Which two nodes should be merged first?',
          options: ['20 and 9 (the largest)', '4 and 7 (the two smallest)', '4 and 20 (smallest + largest)', 'Any pair, the result is the same'],
          answer: 1,
          explain: 'The two rarest characters should become the deepest siblings. Merging 4+7 first gives cost 11+20+40 = 71; merging 20+9 first gives 29+11+40 = 80.'
        },
        hints: [
          `<p><b>Aha:</b> total bits = ∑ freq × depth = sum of the weights of all merged (internal) nodes. Each merge adds its weight once, so merge the two cheapest each time.</p>`,
          `<p>Use a min-heap of nodes ordered by frequency (in Python push <code>(freq, id, node)</code> tuples so nodes are never compared). A <code>Node</code> holds <code>freq</code>, a character (for leaves) and <code>left</code>/<code>right</code> children. After the merges, one DFS from the root assigns codes (append "0" going left, "1" going right).</p>`,
          `<p>Traps: the sum can exceed 32 bits → use a 64-bit integer; with only one distinct character give it the code "0" (length 1); ties in the heap may change individual codes but never the total. Recipe: push leaves → while size &gt; 1: a = poll, b = poll, total += a+b, push parent(a,b) → DFS for codes → return total.</p>`
        ],
        tests: { sig: 'char[] int[] -> list<string>', fn: 'huffmanCodes', check: "(args, out, exp) => { const f = args[1]; if (!Array.isArray(out) || out.length !== f.length + 1 || out[0] !== String(exp)) return false; const codes = out.slice(1); if (!codes.every((c) => /^[01]+$/.test(c))) return false; let bits = 0; codes.forEach((c, i) => { bits += f[i] * c.length; }); if (bits !== exp) return false; return codes.every((a, i) => codes.every((b, j) => i === j || !b.startsWith(a))); }", harness: { java: `class Check {
    // [total bits, code of chars[0], code of chars[1], ...]
    static List<String> huffmanCodes(char[] chars, int[] freq) {
        Map<Character, String> codes = new HashMap<>();
        long total = new Solution().huffman(chars, freq, codes);
        List<String> out = new ArrayList<>();
        out.add(String.valueOf(total));
        for (char c : chars) out.add(codes.get(c));
        return out;
    }
}`, python: `def huffman_codes(chars, freq):
    codes = {}
    total = huffman(chars, freq, codes)
    return [str(total)] + [codes[c] for c in chars]`, js: `function huffmanCodes(chars, freq) {
  const codes = new Map();
  const total = huffman(chars, freq, codes);
  return [String(total), ...chars.map((c) => codes.get(c))];
}`, cpp: `vector<string> huffmanCodes(vector<char> chars, vector<int> freq) {
    unordered_map<char, string> codes;
    long long total = huffman(chars, freq, codes);
    vector<string> out{to_string(total)};
    for (char c : chars) out.push_back(codes[c]);
    return out;
}`, csharp: "class Check {\n    // [total bits, code of chars[0], code of chars[1], ...]\n    public static IList<string> HuffmanCodes(char[] chars, int[] freq) {\n        var codes = new Dictionary<char, string>();\n        long total = new Solution().Huffman(chars, freq, codes);\n        var result = new List<string>();\n        result.Add(total.ToString());\n        foreach (char c in chars) result.Add(codes[c]);\n        return result;\n    }\n}" }, cases: [
          [[["a", "b", "c", "d", "e", "f"], [5, 9, 12, 13, 16, 45]], 224],
          [[["a", "b"], [1, 1]], 2],
          [[["x", "y"], [1000000000, 1]], 1000000001],
          [[["a", "b", "c", "d"], [1, 1, 1, 1]], 8],
          [[["a", "b", "c", "d", "e"], [1, 2, 4, 8, 16]], 56],
          [[["p", "q", "r", "s"], [4, 7, 9, 20]], 71],
          [[["a", "b", "c"], [3, 3, 3]], 15],
          [[["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"], {$rep: 1000000000, n: 26}], 124000000000]
        ] },
        solution: {
          approach: `<p>Min-heap of nodes; merge the two smallest N−1 times; total bits = sum of merged weights; DFS assigns codes.</p>`,
          code: `
            import java.util.*;

            class Solution {
                // A Huffman tree node. Leaves carry a character; inner nodes carry merged weight.
                static class Node {
                    long freq; char ch; int id; Node left, right;
                    Node(long f, char c, int id) { freq = f; ch = c; this.id = id; }
                    Node(long f, Node l, Node r, int id) { freq = f; left = l; right = r; this.id = id; }
                    boolean isLeaf() { return left == null && right == null; }
                }

                public long huffman(char[] chars, int[] freq, Map<Character, String> codes) {
                    // smaller frequency first; on ties, older node first (deterministic codes)
                    PriorityQueue<Node> pq = new PriorityQueue<>((a, b) ->
                        a.freq != b.freq ? Long.compare(a.freq, b.freq) : Integer.compare(a.id, b.id));
                    int nextId = 0;
                    for (int i = 0; i < chars.length; i++) pq.add(new Node(freq[i], chars[i], nextId++));

                    long totalBits = 0;
                    while (pq.size() > 1) {
                        Node a = pq.poll();                   // smallest  -> left (bit 0)
                        Node b = pq.poll();                   // 2nd smallest -> right (bit 1)
                        Node parent = new Node(a.freq + b.freq, a, b, nextId++);
                        totalBits += parent.freq;             // every char below gains one bit
                        pq.add(parent);
                    }
                    assignCodes(pq.poll(), "", codes);
                    return totalBits;
                }

                // DFS: going left appends 0, going right appends 1
                private void assignCodes(Node node, String path, Map<Character, String> codes) {
                    if (node.isLeaf()) {
                        codes.put(node.ch, path.isEmpty() ? "0" : path);  // single-char edge case
                        return;
                    }
                    assignCodes(node.left, path + "0", codes);
                    assignCodes(node.right, path + "1", codes);
                }

                public static void main(String[] args) {
                    Map<Character, String> codes = new TreeMap<>();
                    long bits = new Solution().huffman(new char[]{'a', 'b', 'c', 'd', 'e', 'f'},
                                                       new int[]{5, 9, 12, 13, 16, 45}, codes);
                    System.out.println(bits + " " + codes);  // 224 {a=1100, b=1101, c=100, d=101, e=111, f=0}
                }
            }`,
          dry: {
            head: ['step', 'poll a (left)', 'poll b (right)', 'parent', 'totalBits', 'heap after'],
            rows: [
              ['1', 'a:5', 'b:9', '14', '14', '12 13 14 16 45'],
              ['2', 'c:12', 'd:13', '25', '39', '14 16 25 45'],
              ['3', '14', 'e:16', '30', '69', '25 30 45'],
              ['4', '25', '30', '55', '124', '45 55'],
              ['5', 'f:45', '55', '100', '<span class="c-p">224</span>', '100 (root)']
            ]
          },
          alt: [{ lang: 'python', code: `import heapq
from itertools import count

def huffman(chars, freq, codes):
    """Returns the total bits and fills codes {char: bit string}."""
    tick = count()                        # tie-breaker: older node first, never compares nodes
    # heap entries: (weight, id, node); a node is a char (leaf) or a (left, right) tuple
    heap = [(f, next(tick), c) for c, f in zip(chars, freq)]
    heapq.heapify(heap)
    total = 0
    while len(heap) > 1:
        fa, _, a = heapq.heappop(heap)    # smallest -> left (bit 0)
        fb, _, b = heapq.heappop(heap)    # 2nd smallest -> right (bit 1)
        total += fa + fb                  # every char below gains one bit
        heapq.heappush(heap, (fa + fb, next(tick), (a, b)))
    stack = [(heap[0][2], '')]            # iterative DFS: no recursion limit worries
    while stack:
        node, path = stack.pop()
        if isinstance(node, tuple):
            stack.append((node[0], path + '0'))
            stack.append((node[1], path + '1'))
        else:
            codes[node] = path or '0'     # single-character edge case
    return total` }, { lang: 'js', code: `// JS has no built-in heap: a small binary min-heap with a comparator.
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp; }
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {                                // sift up
      const p = (i - 1) >> 1;
      if (this.cmp(a[i], a[p]) >= 0) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {                                   // sift down
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.cmp(a[l], a[m]) < 0) m = l;
        if (r < a.length && this.cmp(a[r], a[m]) < 0) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

// Returns the total bits and fills the Map codes (char -> bit string).
function huffman(chars, freq, codes) {
  let id = 0;
  const heap = new MinHeap((a, b) => a.freq - b.freq || a.id - b.id);   // ties: older node first
  chars.forEach((ch, i) => heap.push({ freq: freq[i], ch, id: id++, left: null, right: null }));
  let total = 0;                       // ≤ 1.7·10^15 < 2^53: exact in a Number
  while (heap.size() > 1) {
    const a = heap.pop(), b = heap.pop();
    total += a.freq + b.freq;          // every char below gains one bit
    heap.push({ freq: a.freq + b.freq, ch: null, id: id++, left: a, right: b });
  }
  const stack = [[heap.pop(), '']];
  while (stack.length) {
    const [node, path] = stack.pop();
    if (node.left === null) codes.set(node.ch, path || '0');   // leaf; single char gets "0"
    else stack.push([node.left, path + '0'], [node.right, path + '1']);
  }
  return total;
}` }, { lang: 'cpp', code: `struct HuffNode {
    long long freq; char ch; int id; HuffNode* left; HuffNode* right;
};

// DFS: going left appends 0, going right appends 1
void assignCodes(HuffNode* node, const string& path, unordered_map<char, string>& codes) {
    if (!node->left) { codes[node->ch] = path.empty() ? "0" : path; return; }   // single char gets "0"
    assignCodes(node->left, path + "0", codes);
    assignCodes(node->right, path + "1", codes);
}

// Returns the total bits and fills codes (char -> bit string).
long long huffman(vector<char>& chars, vector<int>& freq, unordered_map<char, string>& codes) {
    deque<HuffNode> pool;                                 // owns every node; stable addresses, freed automatically
    auto cmp = [](HuffNode* a, HuffNode* b) {             // priority_queue is a MAX-heap: invert the order
        return a->freq != b->freq ? a->freq > b->freq : a->id > b->id;
    };
    priority_queue<HuffNode*, vector<HuffNode*>, decltype(cmp)> pq(cmp);
    int id = 0;
    for (size_t i = 0; i < chars.size(); i++) {
        pool.push_back({freq[i], chars[i], id++, nullptr, nullptr});
        pq.push(&pool.back());
    }
    long long total = 0;
    while (pq.size() > 1) {
        HuffNode* a = pq.top(); pq.pop();                 // smallest -> left
        HuffNode* b = pq.top(); pq.pop();                 // 2nd smallest -> right
        pool.push_back({a->freq + b->freq, 0, id++, a, b});
        total += a->freq + b->freq;                       // every char below gains one bit
        pq.push(&pool.back());
    }
    assignCodes(pq.top(), "", codes);
    return total;
}` }, { lang: 'csharp', code: `using System;
using System.Collections.Generic;

public class Solution
{
    // A Huffman tree node. Leaves carry a character; inner nodes carry merged weight.
    class Node
    {
        public long freq; public char ch; public int id; public Node left, right;
        public Node(long f, char c, int id) { freq = f; ch = c; this.id = id; }
        public Node(long f, Node l, Node r, int id) { freq = f; left = l; right = r; this.id = id; }
        public bool IsLeaf() { return left == null && right == null; }
    }

    public long Huffman(char[] chars, int[] freq, Dictionary<char, string> codes)
    {
        // smaller frequency first; on ties, older node first (deterministic codes)
        var pq = new MinHeap<Node>((a, b) =>
            a.freq != b.freq ? a.freq.CompareTo(b.freq) : a.id.CompareTo(b.id));
        int nextId = 0;
        for (int i = 0; i < chars.Length; i++) pq.Push(new Node(freq[i], chars[i], nextId++));

        long totalBits = 0;
        while (pq.Count > 1)
        {
            Node a = pq.Pop();                    // smallest  -> left (bit 0)
            Node b = pq.Pop();                    // 2nd smallest -> right (bit 1)
            var parent = new Node(a.freq + b.freq, a, b, nextId++);
            totalBits += parent.freq;             // every char below gains one bit
            pq.Push(parent);
        }
        AssignCodes(pq.Pop(), "", codes);
        return totalBits;
    }

    // DFS: going left appends 0, going right appends 1
    private void AssignCodes(Node node, string path, Dictionary<char, string> codes)
    {
        if (node.IsLeaf())
        {
            codes[node.ch] = path.Length == 0 ? "0" : path;  // single-char edge case
            return;
        }
        AssignCodes(node.left, path + "0", codes);
        AssignCodes(node.right, path + "1", codes);
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }],
          complexity: `<p><b>Time O(N log N)</b>: N−1 merges, each does two polls and one add on a heap of size ≤ N (log N each). The DFS is O(N). <b>Space O(N)</b> for the heap and the 2N−1 tree nodes.</p>`,
          followUps: ['Encode and then decode a full string with your codes.', 'Frequencies arrive already sorted: make it O(N) with two queues.', 'Codes may be at most L bits long (length-limited Huffman): what breaks?', 'Ternary code (digits 0, 1, 2): how many dummy zero-frequency symbols do you add?']
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 6 — Minimum platforms / meeting rooms (sweep line)
  // =====================================================================
  topics.push({
    title: 'Minimum Platforms & Meeting Rooms (Sweep-Line Greedy)',
    analogy: `<p>Stand at the entrance of a railway station with a clicker counter. Every time a train <b>arrives</b>, click +1. Every time a train <b>leaves</b>, click −1. The <b>highest number</b> your clicker ever shows is how many platforms the station needs — at that moment that many trains were standing there together, and at no moment were there more.</p>
      <p>You do not care <i>which</i> train is which. You only care about the order of "someone came" and "someone left" events. That is the <b>sweep line</b> idea: walk through time once, keep a running count.</p>`,
    explain: `<p><b>Problem:</b> arrival times <code>arr[]</code> and departure times <code>dep[]</code> of N trains. Find the <b>minimum number of platforms</b> so no train ever waits. (Same problem: Meeting Rooms II — minimum rooms for all meetings.)</p>
      <p><b>Key fact:</b> the answer is the <b>maximum number of trains present at the same instant</b>. You obviously need at least that many; and a greedy "send each arriving train to any free platform" never needs more (proof in the deep dive).</p>
      <p><b>Trick:</b> sort arrivals and departures <i>separately</i>. Then walk with two pointers, always processing the earlier event:</p>
      <ul>
        <li>next arrival ≤ next departure → a train comes before anyone leaves → <code>platforms++</code>, update the max.</li>
        <li>otherwise → a train leaves first → <code>platforms--</code>.</li>
      </ul>
      ${H.arr([900, 940, 950, 1100, 1500, 1800], { label: 'arr sorted' })}${H.arr([910, 1120, 1130, 1200, 1900, 2000], { label: 'dep sorted' })}
      ${H.table(['event', 'platforms in use', 'max'], [
        ['900 arrives', '1', '1'], ['910 leaves', '0', '1'], ['940 arrives', '1', '1'], ['950 arrives', '2', '2'],
        ['1100 arrives', H.c('y', '3'), H.c('p', '3')], ['1120 leaves', '2', '3'], ['1130 leaves', '1', '3'], ['1200 leaves', '0', '3'],
        ['1500 arrives', '1', '3'], ['1800 arrives', '2', '3']
      ])}
      <p>Answer <b>3</b> (at 11:00 three trains stand together). Splitting the arrays "loses" which departure belongs to which arrival — and that is fine, because the count at any moment only depends on <i>how many</i> arrived and left so far.</p>
      <p><b>The tie rule is part of the problem:</b> if a train arrives at exactly the time another leaves, can it reuse that platform? GFG "Minimum Platforms" says <b>no</b> (count the arrival first: <code>arr[i] &lt;= dep[j]</code>). LeetCode Meeting Rooms II says <b>yes</b> for [0,10],[10,20] (process the departure first: <code>start &lt; end</code>). One character changes.</p>`,
    clues: [
      '"<b>Minimum number of platforms / rooms / servers / CPUs</b> so that nothing waits" → max overlap = sweep line.',
      '"<b>Maximum number of concurrent</b> users / calls / sessions at any time" → same sweep, report the peak.',
      '"Is it possible with capacity K?" with pickups and drop-offs (Car Pooling) → +passengers / −passengers events, check the running sum never exceeds K.',
      '"Assign each meeting to a room and return the assignment" → min-heap of (end time, room id), reuse the room that frees earliest.',
      'Times are small integers (0..2359, ≤ 10<sup>6</sup>) → difference array: <code>diff[start]++</code>, <code>diff[end]--</code>, prefix sum.',
      'Watch for "arrival equal to departure" wording → decides <code>&lt;=</code> vs <code>&lt;</code>.'
    ],
    code: [{ lang: 'java', code: `
      // Two sorted arrays + two pointers. GFG rule: arrival == departure needs a NEW platform.
      int findPlatform(int[] arr, int[] dep) {
          int[] a = arr.clone(), d = dep.clone();
          Arrays.sort(a);
          Arrays.sort(d);
          int n = a.length, i = 0, j = 0, inUse = 0, best = 0;
          while (i < n) {                       // once all trains arrived, the count only falls
              if (a[i] <= d[j]) {               // next event is an arrival (ties: arrival first)
                  inUse++;
                  best = Math.max(best, inUse);
                  i++;
              } else {                          // next event is a departure
                  inUse--;
                  j++;
              }
          }
          return best;
      }`, alt: [{ lang: 'python', code: `# Two sorted arrays + two pointers. GFG rule: arrival == departure needs a NEW platform.
def find_platform(arr, dep):
    a, d = sorted(arr), sorted(dep)
    i = j = in_use = best = 0
    while i < len(a):                  # once all trains arrived, the count only falls
        if a[i] <= d[j]:               # next event is an arrival (ties: arrival first)
            in_use += 1
            best = max(best, in_use)
            i += 1
        else:                          # next event is a departure
            in_use -= 1
            j += 1
    return best` }, { lang: 'js', code: `// Two sorted arrays + two pointers. GFG rule: arrival == departure needs a NEW platform.
function findPlatform(arr, dep) {
  const a = [...arr].sort((x, y) => x - y), d = [...dep].sort((x, y) => x - y);
  let i = 0, j = 0, inUse = 0, best = 0;
  while (i < a.length) {               // once all trains arrived, the count only falls
    if (a[i] <= d[j]) {                // arrival first on ties
      inUse++;
      best = Math.max(best, inUse);
      i++;
    } else {                           // a departure
      inUse--;
      j++;
    }
  }
  return best;
}` }, { lang: 'cpp', code: `// Two sorted arrays + two pointers. GFG rule: arrival == departure needs a NEW platform.
int findPlatform(vector<int> a, vector<int> d) {     // copies: the caller's order is kept
    sort(a.begin(), a.end());
    sort(d.begin(), d.end());
    int n = a.size(), i = 0, j = 0, inUse = 0, best = 0;
    while (i < n) {                                  // once all trains arrived, the count only falls
        if (a[i] <= d[j]) { inUse++; best = max(best, inUse); i++; }   // arrival first on ties
        else { inUse--; j++; }                                          // a departure
    }
    return best;
}` }, { lang: 'csharp', code: `// Two sorted arrays + two pointers. GFG rule: arrival == departure needs a NEW platform.
int FindPlatform(int[] arr, int[] dep)
{
    int[] a = (int[])arr.Clone(), d = (int[])dep.Clone();
    Array.Sort(a);
    Array.Sort(d);
    int n = a.Length, i = 0, j = 0, inUse = 0, best = 0;
    while (i < n)                         // once all trains arrived, the count only falls
    {
        if (a[i] <= d[j])                 // next event is an arrival (ties: arrival first)
        {
            inUse++;
            best = Math.Max(best, inUse);
            i++;
        }
        else                              // next event is a departure
        {
            inUse--;
            j++;
        }
    }
    return best;
}` }] }, { lang: 'java', code: `
      // Meeting Rooms II with a min-heap of end times (also tells you which room to reuse).
      // LeetCode rule: a meeting may start exactly when another ends in the same room.
      int minMeetingRooms(int[][] intervals) {
          Arrays.sort(intervals, (x, y) -> Integer.compare(x[0], y[0]));   // by start
          PriorityQueue<Integer> ends = new PriorityQueue<>();              // end times of busy rooms
          for (int[] m : intervals) {
              if (!ends.isEmpty() && ends.peek() <= m[0]) ends.poll();      // reuse the room that frees first
              ends.add(m[1]);                                               // this meeting occupies a room
          }
          return ends.size();                                               // rooms ever opened
      }`, alt: [{ lang: 'python', code: `# Meeting Rooms II with a min-heap of end times (also tells you which room to reuse).
# LeetCode rule: a meeting may start exactly when another ends in the same room.
import heapq

def min_meeting_rooms(intervals):
    ends = []                                  # end times of busy rooms
    for s, e in sorted(intervals):             # by start
        if ends and ends[0] <= s:
            heapq.heapreplace(ends, e)         # reuse the room that frees first
        else:
            heapq.heappush(ends, e)            # open a new room
    return len(ends)                           # rooms ever opened` }, { lang: 'js', code: `// JS has no built-in heap: a small binary min-heap with a comparator.
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp; }
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {                                // sift up
      const p = (i - 1) >> 1;
      if (this.cmp(a[i], a[p]) >= 0) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {                                   // sift down
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.cmp(a[l], a[m]) < 0) m = l;
        if (r < a.length && this.cmp(a[r], a[m]) < 0) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

// Meeting Rooms II with a min-heap of end times (also tells you which room to reuse).
// LeetCode rule: a meeting may start exactly when another ends in the same room.
function minMeetingRooms(intervals) {
  const sorted = [...intervals].sort((x, y) => x[0] - y[0]);   // by start
  const ends = new MinHeap();                                   // end times of busy rooms
  for (const [s, e] of sorted) {
    if (ends.size() > 0 && ends.peek() <= s) ends.pop();        // reuse the room that frees first
    ends.push(e);                                               // this meeting occupies a room
  }
  return ends.size();                                           // rooms ever opened
}` }, { lang: 'cpp', code: `// Meeting Rooms II with a min-heap of end times (also tells you which room to reuse).
// LeetCode rule: a meeting may start exactly when another ends in the same room.
int minMeetingRooms(vector<vector<int>> intervals) {
    sort(intervals.begin(), intervals.end());                    // by start
    priority_queue<int, vector<int>, greater<int>> ends;         // min-heap of end times
    for (auto& m : intervals) {
        if (!ends.empty() && ends.top() <= m[0]) ends.pop();     // reuse the room that frees first
        ends.push(m[1]);
    }
    return ends.size();                                          // rooms ever opened
}` }, { lang: 'csharp', code: `// Meeting Rooms II with a min-heap of end times (also tells you which room to reuse).
// LeetCode rule: a meeting may start exactly when another ends in the same room.
int MinMeetingRooms(int[][] intervals)
{
    Array.Sort(intervals, (x, y) => x[0].CompareTo(y[0]));          // by start
    var ends = new MinHeap<int>((a, b) => a.CompareTo(b));          // end times of busy rooms
    foreach (int[] m in intervals)
    {
        if (ends.Count > 0 && ends.Peek() <= m[0]) ends.Pop();      // reuse the room that frees first
        ends.Push(m[1]);                                            // this meeting occupies a room
    }
    return ends.Count;                                              // rooms ever opened
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }] }, { lang: 'java', code: `
      // Difference array when times are small (here minutes 0..1440): O(N + T)
      int peakConcurrent(int[] start, int[] end) {          // half-open [start, end)
          int[] diff = new int[1442];
          for (int i = 0; i < start.length; i++) { diff[start[i]]++; diff[end[i]]--; }
          int run = 0, best = 0;
          for (int t = 0; t < diff.length; t++) { run += diff[t]; best = Math.max(best, run); }
          return best;
      }`, alt: [{ lang: 'python', code: `# Difference array when times are small (here minutes 0..1440): O(N + T)
from itertools import accumulate

def peak_concurrent(start, end):           # half-open [start, end)
    diff = [0] * 1442
    for s, e in zip(start, end):
        diff[s] += 1
        diff[e] -= 1
    return max(accumulate(diff))           # running sum = meetings in progress` }, { lang: 'js', code: `// Difference array when times are small (here minutes 0..1440): O(N + T)
function peakConcurrent(start, end) {     // half-open [start, end)
  const diff = new Int32Array(1442);
  for (let i = 0; i < start.length; i++) { diff[start[i]]++; diff[end[i]]--; }
  let run = 0, best = 0;
  for (const x of diff) { run += x; best = Math.max(best, run); }
  return best;
}` }, { lang: 'cpp', code: `// Difference array when times are small (here minutes 0..1440): O(N + T)
int peakConcurrent(const vector<int>& start, const vector<int>& end) {   // half-open [start, end)
    vector<int> diff(1442, 0);
    for (size_t i = 0; i < start.size(); i++) { diff[start[i]]++; diff[end[i]]--; }
    int run = 0, best = 0;
    for (int x : diff) { run += x; best = max(best, run); }
    return best;
}` }, { lang: 'csharp', code: `// Difference array when times are small (here minutes 0..1440): O(N + T)
int PeakConcurrent(int[] start, int[] end)            // half-open [start, end)
{
    int[] diff = new int[1442];
    for (int i = 0; i < start.Length; i++) { diff[start[i]]++; diff[end[i]]--; }
    int run = 0, best = 0;
    for (int t = 0; t < diff.Length; t++) { run += diff[t]; best = Math.Max(best, run); }
    return best;
}` }] }],
    codeTitle: ['Minimum platforms: sort both, two pointers', 'Meeting Rooms II: min-heap of end times', 'Difference array for small time ranges'],
    viz: {
      title: 'Sweep line: walk arrival and departure events in time order',
      input: '900 940 950 1100 1500 1800 | 910 1200 1120 1130 1900 2000',
      inputLabel: 'arrivals | departures (same count, 2 to 8 trains, times 0..2359)',
      gen: function (input) {
        var p = splitBar(input, 2, 'arrivals | departures, e.g. "900 940 | 910 1200"');
        var A = parseNums(p[0], 'arrivals', 2, 8, 0, 2359), D = parseNums(p[1], 'departures', 2, 8, 0, 2359);
        if (A.length !== D.length) throw new Error('Give the same number of arrivals and departures.');
        for (var q = 0; q < A.length; q++) if (D[q] < A[q]) throw new Error('Train ' + q + ' departs before it arrives — each departure must be ≥ its arrival.');
        var a = A.slice().sort(function (x, y) { return x - y; }), d = D.slice().sort(function (x, y) { return x - y; });
        var n = a.length, i = 0, j = 0, inUse = 0, best = 0, hist = [], frames = [];
        frames.push({ narr: 'Sort arrivals and departures <b>separately</b>. We will not track which train is which — only how many are at the station. Pointer i = next arrival, j = next departure.', parts: [
          { type: 'array', label: 'arrivals (sorted)', values: a, ptr: { 0: 'i' } },
          { type: 'array', label: 'departures (sorted)', values: d, ptr: { 0: 'j' } },
          { type: 'vars', vals: { platformsInUse: 0, maxSoFar: 0 } }
        ] });
        while (i < n) {
          var arrival = a[i] <= d[j];
          var ah = {}, dh = {};
          for (var k = 0; k < i; k++) ah[k] = 'done';
          for (var k2 = 0; k2 < j; k2++) dh[k2] = 'done';
          if (arrival) {
            inUse++; ah[i] = 'ok';
            var newMax = inUse > best; best = Math.max(best, inUse); hist.push(inUse);
            frames.push({ narr: 'Next arrival ' + a[i] + (a[i] === d[j] ? ' <b>equals</b>' : ' comes before') + ' next departure ' + d[j] + ' → a train <span class="c-g">arrives</span>' + (a[i] === d[j] ? ' (GFG rule: the leaving train has not freed its platform yet, so count the arrival first)' : '') + '. Platforms in use: <b>' + inUse + '</b>.' + (newMax ? ' <span class="c-p">New peak!</span>' : ''), parts: [
              { type: 'array', label: 'arrivals (sorted)', values: a, hl: ah, ptr: one(i, 'i') },
              { type: 'array', label: 'departures (sorted)', values: d, hl: dh, ptr: one(j, 'j') },
              { type: 'bars', label: 'platforms in use after each event', values: hist.slice(), hl: one(hist.length - 1, newMax ? 'sel' : 'ok') },
              { type: 'vars', vals: { platformsInUse: inUse, maxSoFar: best }, hl: newMax ? { maxSoFar: 'sel' } : { platformsInUse: 'ok' } }
            ] });
            i++;
          } else {
            inUse--; dh[j] = 'bad'; hist.push(inUse);
            frames.push({ narr: 'Next departure ' + d[j] + ' comes before next arrival ' + a[i] + ' → a train <span class="c-r">leaves</span> and frees a platform. In use: <b>' + inUse + '</b>.', parts: [
              { type: 'array', label: 'arrivals (sorted)', values: a, hl: ah, ptr: one(i, 'i') },
              { type: 'array', label: 'departures (sorted)', values: d, hl: dh, ptr: one(j, 'j') },
              { type: 'bars', label: 'platforms in use after each event', values: hist.slice(), hl: one(hist.length - 1, 'bad') },
              { type: 'vars', vals: { platformsInUse: inUse, maxSoFar: best } }
            ] });
            j++;
          }
        }
        var bh = {}; hist.forEach(function (v, k) { if (v === best) bh[k] = 'sel'; });
        frames.push({ narr: 'All trains have arrived; from now on the count can only go down, so we can stop. The peak was <b>' + best + '</b> → the station needs <b>' + best + '</b> platform(s).', parts: [
          { type: 'bars', label: 'platforms in use after each event (peaks in purple)', values: hist.slice(), hl: bh },
          { type: 'vars', vals: { answer: best }, hl: { answer: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'The tie rule flips the answer',
        html: `<p>Train A: 9:00 → 10:00. Train B: 10:00 → 11:00.</p>
          ${H.table(['rule', 'comparison', 'events at 10:00', 'answer'], [
            ['GFG: same platform cannot serve a departure and an arrival at the same instant', '<code>a[i] &lt;= d[j]</code> → arrival first', 'B arrives (2 in use), then A leaves', H.c('y', '2')],
            ['LeetCode Meeting Rooms: [9,10] and [10,11] can share', '<code>a[i] &lt; d[j]</code> → departure first', 'A leaves (0), then B arrives (1)', H.c('g', '1')]
          ])}
          <p>Ask the interviewer. If they shrug, say which rule you chose and why.</p>`
      },
      {
        title: 'Meeting Rooms II with the heap',
        html: `<p>[[0,30],[5,10],[15,20]] sorted by start. [0,30] → heap {30}. [5,10]: earliest end 30 &gt; 5, no room free → open one, heap {10, 30}. [15,20]: earliest end 10 ≤ 15 → reuse that room: poll 10, push 20 → heap {20, 30}. Heap size <b>2</b> = rooms needed. The heap version also tells you <i>which</i> room each meeting uses (store room ids with the end times).</p>
          ${H.table(['meeting', 'heap top', 'free room?', 'heap after'], [['[0,30]', '—', 'no', '{30}'], ['[5,10]', '30', '30 &gt; 5 no', '{10, 30}'], ['[15,20]', '10', '10 ≤ 15 yes, reuse', '{20, 30}']])}`
      },
      {
        title: 'Car Pooling (LC 1094): same sweep, capacity check',
        html: `<p>trips = [[2,1,5],[3,3,7]] = (passengers, from, to), capacity 4. Events: +2 at 1, +3 at 3, −2 at 5, −3 at 7. Running load: 2 (at 1), <b>5</b> (at 3) &gt; 4 → <b>false</b>. With capacity 5 → true. At the same location, process drop-offs before pick-ups (passengers leave at <code>to</code>). Locations ≤ 1000 → difference array of size 1001.</p>
          ${H.arr([0, 2, 2, 5, 5, 3, 3, 0], { label: 'load at km 0..7', hl: { 3: 'r', 4: 'r' } })}`
      },
      {
        title: 'Why separate sorting is legal',
        html: `<p>arr = [900, 940], dep = [1000, 950] (train 2 arrives 9:40, leaves 9:50; train 1 stays till 10:00). Sorted dep = [950, 1000]. The sweep sees: 900 arrive (1), 940 arrive (2), 950 leave (1), 1000 leave (0). It "pairs" the 950 departure with nothing in particular — but the <b>count</b> after each event is exactly right, because count = (#arrived so far) − (#departed so far), and neither number cares about pairing.</p>`
      }
    ],
    deepDive: `<h4>1. Proof that max overlap is enough (interval partitioning)</h4>
      <p>Let <b>depth</b> = the largest number of intervals covering one instant. Clearly any valid plan needs ≥ depth rooms. Now run the greedy: process meetings by start time; give each one any room that is free, opening a new room only when all are busy. Suppose greedy opens room number k for meeting m. Then the k − 1 existing rooms are all busy at m's start, i.e. k − 1 meetings plus m all cover that instant → depth ≥ k. So greedy uses at most depth rooms. <b>Lower bound met → optimal.</b> This is a "structural bound" proof — a third proof style next to exchange and stays-ahead.</p>
      <h4>2. Event ordering is a design decision</h4>
      <p>Represent each interval as two events (time, +1) and (time, −1) and sort them. The secondary key decides touching behaviour: (−1 before +1) = half-open intervals <code>[s, e)</code>, the usual choice in calendars and databases; (+1 before −1) = closed intervals <code>[s, e]</code>. Pick one deliberately and document it.</p>
      <h4>3. Three implementations</h4>
      ${H.table(['method', 'time', 'space', 'best when'], [
        ['two sorted arrays + two pointers', 'O(N log N)', 'O(N)', 'only the count is needed'],
        ['min-heap of end times', 'O(N log N)', 'O(N)', 'you must assign rooms / stream meetings online in start order'],
        ['difference array', 'O(N + T)', 'O(T)', 'times are small integers (minutes in a day, km ≤ 1000)'],
        ['sorted map time → delta (<code>TreeMap</code> / <code>SortedDict</code> / <code>std::map</code>)', 'O(N log N)', 'O(N)', 'intervals are added/removed dynamically (My Calendar III)']
      ])}
      <h4>4. Edge cases that bite</h4>
      <ul>
        <li><b>Overnight trains</b> (arrive 23:50, depart 00:10): normalise to minutes since a reference and add 24·60 to departures that are smaller than arrivals, or split into two intervals.</li>
        <li><b>Departure equal to arrival of the same train</b>: a zero-length visit still needs a platform under the GFG rule.</li>
        <li>Very large times (epoch milliseconds) → use 64-bit integers and never a difference array.</li>
      </ul>
      <h4>5. Production reality</h4>
      <p>The same sweep sizes connection pools ("peak concurrent requests"), computes license usage peaks, finds the busiest minute in logs, and checks Kubernetes resource overcommit. At scale it becomes a streaming problem: events arrive roughly in time order, so a heap of active end times with a bounded out-of-order window replaces the global sort.</p>`,
    aiEra: `<p><b>What AI changes:</b> "Meeting Rooms II" and "Minimum Platforms" are memorised; assistants will produce either the heap or the two-pointer version instantly. Their typical slip is the <b>tie rule</b>: they give the LeetCode (<code>&lt;</code>) version to a GFG (<code>&lt;=</code>) problem or vice versa, and both look "obviously right".</p>
      <p><b>Use AI as a partner:</b> <code>Restate the boundary rule in this problem in one sentence, then give 3 test cases where arrival == departure, with expected outputs.</code> For real-world logs: <code>Write a SQL/stream query that computes peak concurrent sessions per day from (session_start, session_end) rows</code> — then check its tie handling with the same eyes.</p>
      <p><b>Where AI goes wrong:</b> sorting intervals by end for this problem (that is activity selection, a different question), forgetting overnight wrap-around, and using a difference array sized by epoch timestamps.</p>
      <p><b>What you must still own:</b> the "answer = max overlap" insight, the interval-partitioning proof, and choosing between count-only (two pointers) vs assignment (heap) vs dynamic (sorted map) from the follow-up the interviewer asks.</p>`,
    problems: [
      {
        title: 'Minimum Platforms',
        level: 'Medium',
        tags: ['greedy', 'sorting', 'two pointers', 'sweep line'],
        companies: ['Amazon', 'Microsoft', 'Walmart', 'Paytm', 'Goldman Sachs'],
        statement: `<p>Given arrival times <code>arr[]</code> and departure times <code>dep[]</code> of <code>N</code> trains for one day (times like 0900 written as 900), find the <b>minimum number of platforms</b> so that no train waits. A platform cannot be used for a departure and an arrival at the <b>same instant</b>: if one train arrives exactly when another departs, they need different platforms. For every train, <code>arr[i] ≤ dep[i]</code>.</p>`,
        constraints: `1 ≤ N ≤ 5·10<sup>4</sup>, 0000 ≤ arr[i] ≤ dep[i] ≤ 2359`,
        example: `${H.arr([900, 940, 950, 1100, 1500, 1800], { label: 'arr', hl: { 1: 'y', 2: 'y', 3: 'y' } })}${H.arr([910, 1200, 1120, 1130, 1900, 2000], { label: 'dep', hl: { 1: 'y', 2: 'y', 3: 'y' } })}
          <p>Output <b>3</b>. At 11:00 the trains ${H.c('y', '9:40→12:00, 9:50→11:20 and 11:00→11:30')} are all at the station. No instant has 4 trains.</p>`,
        brute: {
          why: `<p>The busiest instant is always the moment some train arrives. So for each train i, count the trains j standing at the station at time <code>arr[i]</code> (<code>arr[j] ≤ arr[i] ≤ dep[j]</code>) and take the maximum. O(N²) = 2.5·10<sup>9</sup> steps for N = 5·10<sup>4</sup> → too slow. The waste: we recount the same trains for every arrival instead of keeping a running count.</p>`,
          code: { lang: 'java', code: `
            int brutePlatforms(int[] arr, int[] dep) {
                int n = arr.length, best = 0;
                for (int i = 0; i < n; i++) {
                    int present = 0;                       // trains at the station when train i arrives
                    for (int j = 0; j < n; j++)
                        if (arr[j] <= arr[i] && arr[i] <= dep[j]) present++;
                    best = Math.max(best, present);
                }
                return best;
            }`, alt: [
          { lang: 'python', code: `def find_platform(arr, dep):
    n = len(arr)
    best = 0
    for i in range(n):
        present = 0                                  # trains at the station when train i arrives
        for j in range(n):
            if arr[j] <= arr[i] <= dep[j]:
                present += 1
        best = max(best, present)
    return best` },
          { lang: 'js', code: `function findPlatform(arr, dep) {
  const n = arr.length;
  let best = 0;
  for (let i = 0; i < n; i++) {
    let present = 0;                                 // trains at the station when train i arrives
    for (let j = 0; j < n; j++)
      if (arr[j] <= arr[i] && arr[i] <= dep[j]) present++;
    best = Math.max(best, present);
  }
  return best;
}` },
          { lang: 'cpp', code: `int findPlatform(vector<int> arr, vector<int> dep) {
    int n = arr.size(), best = 0;
    for (int i = 0; i < n; i++) {
        int present = 0;                             // trains at the station when train i arrives
        for (int j = 0; j < n; j++)
            if (arr[j] <= arr[i] && arr[i] <= dep[j]) present++;
        best = max(best, present);
    }
    return best;
}` },
          { lang: 'csharp', code: `int BrutePlatforms(int[] arr, int[] dep)
{
    int n = arr.Length, best = 0;
    for (int i = 0; i < n; i++)
    {
        int present = 0;                       // trains at the station when train i arrives
        for (int j = 0; j < n; j++)
            if (arr[j] <= arr[i] && arr[i] <= dep[j]) present++;
        best = Math.Max(best, present);
    }
    return best;
}` }
        ] }
        },
        mcq: {
          q: 'Why is it OK to sort the arrival and departure arrays separately, losing which departure belongs to which train?',
          options: ['Because trains always leave in the order they arrive', 'Because the number of trains present at any time = arrivals so far − departures so far, which does not depend on pairing', 'It is not OK; it only works when no trains overlap', 'Because sorting is stable'],
          answer: 1,
          explain: 'The count at any instant only depends on how many arrivals and departures happened before it. Trains do NOT need to leave in arrival order (9:40→12:00 leaves after 9:50→11:20).'
        },
        hints: [
          `<p><b>Aha:</b> the answer is the maximum number of trains present at the same time. You do not need to know which platform each train uses.</p>`,
          `<p>Sort <code>arr</code> and <code>dep</code> separately. Walk them with two pointers like merging two sorted lists: an arrival adds 1, a departure subtracts 1, track the max.</p>`,
          `<p>Tie rule: arrival equal to departure needs a new platform → treat the arrival first (<code>arr[i] &lt;= dep[j]</code>). Stop when all arrivals are processed. Recipe: sort both → i = j = 0, cur = best = 0 → while i &lt; n: if arr[i] &lt;= dep[j] {cur++; best = max; i++} else {cur--; j++} → return best.</p>`
        ],
        tests: { sig: 'int[] int[] -> int', fn: 'findPlatform', cases: [
          [[[900, 940, 950, 1100, 1500, 1800], [910, 1200, 1120, 1130, 1900, 2000]], 3],
          [[[900, 1000], [1000, 1100]], 2],
          [[[900], [900]], 1],
          [[[0, 0, 0], [2359, 2359, 2359]], 3],
          [[[900, 1100, 1235], [1000, 1200, 1240]], 1],
          [[[1000, 900], [1100, 1000]], 2],
          [[[100, 200, 300, 400], [2359, 250, 350, 450]], 2],
          [[{$rep: 0, n: 50000}, {$rep: 2359, n: 50000}], 50000],
          [[{$range: [0, 2000, 1]}, {$range: [1, 2001, 1]}], 2]
        ] },
        solution: {
          approach: `<p>Sweep line with two sorted arrays: process events in time order, arrivals before departures on ties, and keep the peak of the running count. The interval-partitioning argument proves that the peak number of platforms is also enough.</p>`,
          code: `
            import java.util.*;

            class Solution {
                public int findPlatform(int[] arr, int[] dep) {
                    int n = arr.length;
                    int[] a = arr.clone(), d = dep.clone();   // do not reorder the caller's data
                    Arrays.sort(a);
                    Arrays.sort(d);

                    int i = 0, j = 0, inUse = 0, best = 0;
                    while (i < n) {
                        if (a[i] <= d[j]) {        // arrival first (also on ties: GFG rule)
                            inUse++;
                            best = Math.max(best, inUse);
                            i++;
                        } else {                   // a departure frees a platform
                            inUse--;
                            j++;
                        }
                    }
                    return best;
                }

                public static void main(String[] args) {
                    Solution s = new Solution();
                    System.out.println(s.findPlatform(new int[]{900, 940, 950, 1100, 1500, 1800},
                                                      new int[]{910, 1200, 1120, 1130, 1900, 2000}));  // 3
                    System.out.println(s.findPlatform(new int[]{900, 1000}, new int[]{1000, 1100}));    // 2 (tie)
                }
            }`,
          alt: [{ lang: 'python', code: `def find_platform(arr, dep):
    a, d = sorted(arr), sorted(dep)
    i = j = in_use = best = 0
    while i < len(a):
        if a[i] <= d[j]:          # arrival first on ties
            in_use += 1
            best = max(best, in_use)
            i += 1
        else:
            in_use -= 1
            j += 1
    return best

print(find_platform([900, 940, 950, 1100, 1500, 1800], [910, 1200, 1120, 1130, 1900, 2000]))  # 3`, run: true }, { lang: 'js', code: `function findPlatform(arr, dep) {
  const a = Int32Array.from(arr).sort(), d = Int32Array.from(dep).sort();   // typed arrays sort numerically
  let i = 0, j = 0, inUse = 0, best = 0;
  while (i < a.length) {
    if (a[i] <= d[j]) {          // arrival first, also on ties
      inUse++;
      best = Math.max(best, inUse);
      i++;
    } else {                     // a departure frees a platform
      inUse--;
      j++;
    }
  }
  return best;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int findPlatform(vector<int> arr, vector<int> dep) {     // copies: sorting does not touch the caller
        sort(arr.begin(), arr.end());
        sort(dep.begin(), dep.end());
        int i = 0, j = 0, inUse = 0, best = 0, n = arr.size();
        while (i < n) {
            if (arr[i] <= dep[j]) { inUse++; best = max(best, inUse); i++; }   // arrival first on ties
            else { inUse--; j++; }
        }
        return best;
    }
};` }, { lang: 'csharp', code: `using System;

public class Solution
{
    public int FindPlatform(int[] arr, int[] dep)
    {
        int n = arr.Length;
        int[] a = (int[])arr.Clone(), d = (int[])dep.Clone();   // do not reorder the caller's data
        Array.Sort(a);
        Array.Sort(d);

        int i = 0, j = 0, inUse = 0, best = 0;
        while (i < n)
        {
            if (a[i] <= d[j])          // arrival first (also on ties: GFG rule)
            {
                inUse++;
                best = Math.Max(best, inUse);
                i++;
            }
            else                       // a departure frees a platform
            {
                inUse--;
                j++;
            }
        }
        return best;
    }
}` }],
          dry: {
            head: ['a[i]', 'd[j]', 'event', 'inUse', 'best'],
            rows: [
              ['900', '910', 'arrive', '1', '1'],
              ['940', '910', 'leave', '0', '1'],
              ['940', '1120', 'arrive', '1', '1'],
              ['950', '1120', 'arrive', '2', '2'],
              ['1100', '1120', 'arrive', '3', '3'],
              ['1500', '1120', 'leave', '2', '3'],
              ['1500', '1130', 'leave', '1', '3'],
              ['1500', '1200', 'leave', '0', '3'],
              ['1500', '1900', 'arrive', '1', '3'],
              ['1800', '1900', 'arrive', '2', '<span class="c-p">3</span>']
            ]
          },
          complexity: `<p><b>Time O(N log N)</b> for the two sorts; the sweep is O(N). <b>Space O(N)</b> for the copies (O(1) extra if sorting in place is allowed). With times ≤ 2359 a difference array gives O(N + 2400).</p>`,
          followUps: ['Return which platform each train uses (min-heap of (departure, platformId)).', 'Trains can run past midnight (depart 00:10 after arriving 23:50).', 'Same-instant arrival and departure CAN share a platform: change one character.', 'Trains are added and cancelled live; answer the peak after every change (a sorted map of deltas or a segment tree).']
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 7 — Gas station (circular tour)
  // =====================================================================
  topics.push({
    title: 'Gas Station / Circular Tour (Reset the Start When the Tank Goes Negative)',
    analogy: `<p>A delivery rider does a loop of shops around a ring road. At every shop she gets some petrol as a tip, and driving to the next shop burns some petrol. She starts with an <b>empty tank</b>. From which shop should she start so she can finish the whole loop?</p>
      <p>Suppose she starts at shop 2 and runs dry just after shop 5. Should she try starting at shop 3 instead? No! When she passed shop 3 on her first attempt she had <b>zero or more</b> petrol in the tank, and she still failed. Starting fresh at shop 3 means arriving there with <b>exactly zero</b> — never more. So shops 2, 3, 4 and 5 are all hopeless; the next candidate is shop 6. That single observation turns an O(N²) search into one pass.</p>`,
    explain: `<p><b>Problem (LC 134):</b> N stations on a circle. At station i you get <code>gas[i]</code>, and driving to station i+1 costs <code>cost[i]</code>. Start with an empty tank. Return the start index that lets you go all the way around, or −1.</p>
      <p>Let <code>gain[i] = gas[i] − cost[i]</code> — the net change in the tank for the leg leaving station i.</p>
      <ul>
        <li><b>Fact 1 (is it possible at all?):</b> if <code>∑ gain &lt; 0</code>, you burn more than you collect — impossible from anywhere → −1. If <code>∑ gain ≥ 0</code>, some start works.</li>
        <li><b>Fact 2 (the skip rule):</b> start at s; if the tank first goes negative after leaving station k, then <b>no station from s to k</b> can be the start. Jump the candidate to k + 1 and reset the tank to 0.</li>
      </ul>
      <p>Worked example: gas = [1, 2, 3, 4, 5], cost = [3, 4, 5, 1, 2].</p>
      ${H.arr([-2, -2, -2, 3, 3], { label: 'gain', hl: { 0: 'r', 1: 'r', 2: 'r', 3: 'g', 4: 'g' } })}
      ${H.table(['i', 'gain', 'tank (from current start)', 'action', 'start'], [
        ['0', '−2', '−2', H.c('r', 'negative → reset, start = 1'), '1'],
        ['1', '−2', '−2', H.c('r', 'reset, start = 2'), '2'],
        ['2', '−2', '−2', H.c('r', 'reset, start = 3'), '3'],
        ['3', '+3', '3', 'keep going', '3'],
        ['4', '+3', '6', 'keep going', '3']
      ])}
      <p>Total gain = −2−2−2+3+3 = 0 ≥ 0 → answer <b>3</b>. Check by hand from station 3: tank 4−1 = 3 → +5−2 = 6 → +1−3 = 4 → +2−4 = 2 → +3−5 = 0. Never negative. ✔</p>
      <p><b>Why do we never need to "wrap around" and re-check the stations before the final start?</b> Because the total is ≥ 0. From the final start to the end of the array the tank never goes below 0. Everything before the final start was a series of failed stretches, and each of them lost fuel. Since the grand total is ≥ 0, the fuel you carry at the end of the array is at least as big as all those losses added together, so the wrap-around part never runs dry. In prefix-sum language: the right start is just after the point where the running sum of gains is <b>lowest</b>; from there every partial sum is at least that low point.</p>`,
    clues: [
      '"<b>Circular</b> route / circular array" + "start with an <b>empty tank</b>" + "return the starting index" → one-pass gas-station greedy.',
      '"Petrol pumps", "truck tour", "circular tour", "first petrol pump from which the truck can complete the circle" → same problem (GFG / HackerRank names).',
      '"If there exists a solution, it is <b>guaranteed to be unique</b>" (LC 134) → strong hint for the single-candidate greedy.',
      '<code>N ≤ 10<sup>5</sup></code> on a circle → the O(N²) "try every start" will TLE; expect O(N).',
      '"Minimum <b>initial fuel</b> needed to complete the loop from station 0" → answer = max(0, −(lowest prefix sum)), the same prefix-sum idea.'
    ],
    code: [{ lang: 'java', code: `
      // LC 134: one pass, O(N) time, O(1) space.
      int canCompleteCircuit(int[] gas, int[] cost) {
          long total = 0;     // sum of all gains: decides if ANY start works
          long tank = 0;      // fuel since the current candidate start
          int start = 0;
          for (int i = 0; i < gas.length; i++) {
              int gain = gas[i] - cost[i];
              total += gain;
              tank += gain;
              if (tank < 0) {          // cannot reach station i+1 from 'start'...
                  start = i + 1;       // ...nor from any station between start and i
                  tank = 0;            // begin again, empty tank, at i+1
              }
          }
          return total >= 0 ? start : -1;
      }`, alt: [{ lang: 'python', code: `# LC 134: one pass, O(N) time, O(1) space.
def can_complete_circuit(gas, cost):
    total = 0      # sum of all gains: decides if ANY start works
    tank = 0       # fuel since the current candidate start
    start = 0
    for i, (g, c) in enumerate(zip(gas, cost)):
        total += g - c
        tank += g - c
        if tank < 0:           # cannot reach station i+1 from 'start'...
            start = i + 1      # ...nor from any station between start and i
            tank = 0           # begin again, empty tank, at i+1
    return start if total >= 0 else -1` }, { lang: 'js', code: `// LC 134: one pass, O(N) time, O(1) space.
function canCompleteCircuit(gas, cost) {
  let total = 0;     // sum of all gains: decides if ANY start works
  let tank = 0;      // fuel since the current candidate start
  let start = 0;
  for (let i = 0; i < gas.length; i++) {
    const gain = gas[i] - cost[i];
    total += gain;
    tank += gain;
    if (tank < 0) {          // cannot reach station i+1 from 'start'...
      start = i + 1;         // ...nor from any station between start and i
      tank = 0;              // begin again, empty tank, at i+1
    }
  }
  return total >= 0 ? start : -1;
}` }, { lang: 'cpp', code: `// LC 134: one pass, O(N) time, O(1) space.
int canCompleteCircuit(const vector<int>& gas, const vector<int>& cost) {
    long long total = 0;     // sum of all gains: decides if ANY start works
    long long tank = 0;      // fuel since the current candidate start
    int start = 0;
    for (int i = 0; i < (int) gas.size(); i++) {
        int gain = gas[i] - cost[i];
        total += gain;
        tank += gain;
        if (tank < 0) {      // cannot reach i+1 from 'start', nor from anything in between
            start = i + 1;
            tank = 0;
        }
    }
    return total >= 0 ? start : -1;
}` }, { lang: 'csharp', code: `// LC 134: one pass, O(N) time, O(1) space.
int CanCompleteCircuit(int[] gas, int[] cost)
{
    long total = 0;     // sum of all gains: decides if ANY start works
    long tank = 0;      // fuel since the current candidate start
    int start = 0;
    for (int i = 0; i < gas.Length; i++)
    {
        int gain = gas[i] - cost[i];
        total += gain;
        tank += gain;
        if (tank < 0)            // cannot reach station i+1 from 'start'...
        {
            start = i + 1;       // ...nor from any station between start and i
            tank = 0;            // begin again, empty tank, at i+1
        }
    }
    return total >= 0 ? start : -1;
}` }] }, { lang: 'java', code: `
      // Same answer via prefix sums: start right after the LOWEST running sum.
      int startAfterMinPrefix(int[] gas, int[] cost) {
          long run = 0, low = 0, total = 0;
          int start = 0;
          for (int i = 0; i < gas.length; i++) {
              run += gas[i] - cost[i];
              total = run;
              if (run < low) { low = run; start = i + 1; }   // new lowest point
          }
          return total < 0 ? -1 : start % gas.length;
      }`, alt: [{ lang: 'python', code: `# Same answer via prefix sums: start right after the LOWEST running sum.
from itertools import accumulate

def start_after_min_prefix(gas, cost):
    run = list(accumulate(g - c for g, c in zip(gas, cost)))
    if run[-1] < 0:
        return -1
    low = min(0, min(run))
    if low == 0:
        return 0                                   # the running sum never dips below 0
    return (run.index(low) + 1) % len(gas)         # first time the lowest point is hit` }, { lang: 'js', code: `// Same answer via prefix sums: start right after the LOWEST running sum.
function startAfterMinPrefix(gas, cost) {
  let run = 0, low = 0, start = 0;
  for (let i = 0; i < gas.length; i++) {
    run += gas[i] - cost[i];
    if (run < low) { low = run; start = i + 1; }   // new lowest point
  }
  return run < 0 ? -1 : start % gas.length;        // run ends as the total
}` }, { lang: 'cpp', code: `// Same answer via prefix sums: start right after the LOWEST running sum.
int startAfterMinPrefix(const vector<int>& gas, const vector<int>& cost) {
    long long run = 0, low = 0;
    int start = 0, n = gas.size();
    for (int i = 0; i < n; i++) {
        run += gas[i] - cost[i];
        if (run < low) { low = run; start = i + 1; }   // new lowest point
    }
    return run < 0 ? -1 : start % n;                   // run ends as the total
}` }, { lang: 'csharp', code: `// Same answer via prefix sums: start right after the LOWEST running sum.
int StartAfterMinPrefix(int[] gas, int[] cost)
{
    long run = 0, low = 0, total = 0;
    int start = 0;
    for (int i = 0; i < gas.Length; i++)
    {
        run += gas[i] - cost[i];
        total = run;
        if (run < low) { low = run; start = i + 1; }   // new lowest point
    }
    return total < 0 ? -1 : start % gas.Length;
}` }] }],
    codeTitle: ['Greedy reset (the interview version)', 'Prefix-sum view of the same idea'],
    viz: {
      title: 'Gas station: drive, and jump the start past every failed stretch',
      input: '1 2 3 4 5 | 3 4 5 1 2',
      inputLabel: 'gas | cost (same length, 2 to 10 stations, values 0..20)',
      gen: function (input) {
        var p = splitBar(input, 2, 'gas | cost, e.g. "1 2 3 4 5 | 3 4 5 1 2"');
        var gas = parseNums(p[0], 'gas', 2, 10, 0, 20), cost = parseNums(p[1], 'cost', 2, 10, 0, 20);
        if (gas.length !== cost.length) throw new Error('gas and cost need the same number of values.');
        var n = gas.length, gain = gas.map(function (g, i) { return g - cost[i]; });
        var frames = [], total = 0, tank = 0, start = 0, tankHist = [];
        frames.push({ narr: 'Turn each station into one number: <b>gain = gas − cost</b> (fuel left over after the leg to the next station). Green legs add fuel, red legs burn it. Candidate start = 0, tank = 0.', parts: [
          { type: 'bars', label: 'gain[i] = gas[i] − cost[i]', values: gain, hl: (function () { var h = {}; gain.forEach(function (g, k) { h[k] = g >= 0 ? 'ok' : 'bad'; }); return h; })() },
          { type: 'vars', vals: { start: 0, tank: 0, total: 0 } }
        ] });
        for (var i = 0; i < n; i++) {
          total += gain[i]; tank += gain[i]; tankHist.push(tank);
          var hl = {};
          for (var k = 0; k < n; k++) hl[k] = k < start ? 'done' : (k <= i ? 'win' : '');
          hl[i] = 'cur';
          var ptr = {}; ptr[start] = start === i ? ['start', 'i'] : 'start'; if (start !== i) ptr[i] = 'i';
          if (tank < 0) {
            frames.push({ narr: 'Leg from station ' + i + ': gain ' + gain[i] + ' → tank = <b>' + tank + '</b> &lt; 0. <span class="c-r">Starting at ' + start + ' fails here.</span> Every station between ' + start + ' and ' + i + ' would arrive at station ' + i + ' with even less fuel, so they all fail too.', parts: [
              { type: 'bars', label: 'gain (blue = current stretch)', values: gain, hl: hl, ptr: ptr },
              { type: 'bars', label: 'tank after each leg (since current start)', values: tankHist.slice(), hl: one(tankHist.length - 1, 'bad') },
              { type: 'vars', vals: { start: start, tank: tank, total: total }, hl: { tank: 'bad' } }
            ] });
            start = i + 1; tank = 0;
            frames.push({ narr: 'Jump the candidate to <b>' + start + '</b>' + (start >= n ? ' (past the end — only possible if the total is negative)' : '') + ' and reset the tank to 0. We never look back at the skipped stations.', parts: [
              { type: 'bars', label: 'gain', values: gain, hl: (function () { var h = {}; for (var q = 0; q < n; q++) h[q] = q < start ? 'done' : ''; return h; })(), ptr: start < n ? one(start, 'start') : {} },
              { type: 'vars', vals: { start: start, tank: 0, total: total }, hl: { start: 'cur' } }
            ] });
          } else {
            frames.push({ narr: 'Leg from station ' + i + ': gain ' + (gain[i] >= 0 ? '+' : '') + gain[i] + ' → tank = <b>' + tank + '</b> ≥ 0. <span class="c-g">Still going.</span>', parts: [
              { type: 'bars', label: 'gain (blue = current stretch)', values: gain, hl: hl, ptr: ptr },
              { type: 'bars', label: 'tank after each leg (since current start)', values: tankHist.slice(), hl: one(tankHist.length - 1, 'ok') },
              { type: 'vars', vals: { start: start, tank: tank, total: total }, hl: { tank: 'ok' } }
            ] });
          }
        }
        var ok = total >= 0;
        frames.push({ narr: 'End of the array. Total gain = <b>' + total + '</b>. ' + (ok ? 'Total ≥ 0, so a full loop is possible, and the only surviving candidate is station <b>' + start + '</b>. The fuel collected from ' + start + ' to the end covers the deficits of the stations before it.' : '<span class="c-r">Total &lt; 0</span>: the loop burns more fuel than it collects, so no start works → <b>−1</b>.'), parts: [
          { type: 'bars', label: 'gain', values: gain, hl: ok ? (function () { var h = {}; h[start] = 'sel'; return h; })() : {}, ptr: ok ? one(start, 'answer') : {} },
          { type: 'vars', vals: { answer: ok ? start : -1, total: total }, hl: { answer: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Impossible: total gain is negative',
        html: `<p>gas = [2, 3, 4], cost = [3, 4, 3] → gain = [−1, −1, +1], total = <b>−1</b> → return <b>−1</b>. Even though station 2 has a positive gain, no amount of clever ordering creates fuel that is not there. Always compute the total; the start candidate alone is meaningless when the total is negative.</p>
          ${H.arr([-1, -1, 1], { label: 'gain', hl: { 0: 'r', 1: 'r', 2: 'g' } })}`
      },
      {
        title: 'Prefix-sum picture: start after the lowest point',
        html: `<p>gain = [−2, −2, −2, 3, 3]. Running sums after each station: −2, −4, <b>−6</b>, −3, 0. The lowest point is after station 2, so start at <b>3</b>. From the lowest point, every later running sum is higher, i.e. the tank (running sum − lowest) is never negative; and because the final total is ≥ 0, wrapping around to the beginning stays ≥ 0 as well.</p>
          ${H.table(['after station', '0', '1', '2', '3', '4'], [['running sum', '−2', '−4', H.c('r', '−6 (min)'), '−3', '0'], ['tank if we start at 3', '', '', '', '3', '6']])}`
      },
      {
        title: 'Brute force vs greedy on the same data',
        html: `<p>Brute force tries start 0 (fails at leg 0), start 1 (fails at leg 1), start 2 (fails at leg 2), start 3 (succeeds) — re-driving the same legs many times. Greedy never re-drives: it walks the array once and only moves the start forward. On N = 10<sup>5</sup> stations that is 10<sup>5</sup> steps instead of up to 10<sup>10</sup>.</p>`
      },
      {
        title: 'Minimum starting fuel at a fixed station',
        html: `<p>Variant: you must start at station 0 — how much fuel do you need in the tank at the start? Running sums of gain [−2, −2, −2, 3, 3] are −2, −4, −6, −3, 0. You need to survive the lowest point, so initial fuel = <b>max(0, −(−6)) = 6</b>. Same prefix sums, a different question — and a common follow-up.</p>`
      }
    ],
    deepDive: `<h4>1. Proof of the skip rule</h4>
      <p>Start at s with tank 0; suppose the tank stays ≥ 0 up to station k − 1 and becomes negative after leg k. Pick any m with s &lt; m ≤ k. Driving from s, you reached m with tank T<sub>m</sub> ≥ 0. Starting fresh at m means arriving at m with 0 ≤ T<sub>m</sub>. From m to k the legs are identical, so your fuel is always lower by T<sub>m</sub> ≥ 0 → you also fail at leg k (or earlier). Hence every m in (s, k] is eliminated, and so is s.</p>
      <h4>2. Proof that the last candidate works (when total ≥ 0)</h4>
      <p>Let P(i) = gain[0] + … + gain[i−1], P(0) = 0, P(N) = total ≥ 0. The algorithm's final start s is the index right after the lowest P (the last reset happens at the minimum). Driving from s, the tank when you reach station j is P(j) − P(s) for j ≥ s, and P(N) − P(s) + P(j) for j &lt; s (after wrapping). Both are ≥ 0 because P(s) is the minimum and P(N) ≥ 0. ∎</p>
      <h4>3. Overflow and types</h4>
      <p>With N = 10<sup>5</sup> and gains up to ±10<sup>4</sup>, sums fit in a 32-bit int (10<sup>9</sup>) — but in the general version with gas up to 10<sup>9</sup>, use a 64-bit integer (Python and JS do not need to care at this size). A cheap habit that never hurts.</p>
      <h4>4. Related problems that share the idea</h4>
      <ul>
        <li><b>Maximum circular subarray sum</b> (Kadane): the best circular segment = total − (minimum subarray), the same "lowest point" thinking.</li>
        <li><b>Minimum Number of Refueling Stops</b> (LC 871): you may stop at stations; greedy with a max-heap — drive as far as possible, and when stuck, retroactively "use" the largest station you passed. Different structure, same "keep going until forced" spirit.</li>
        <li><b>Rotating a circular array:</b> the doubling trick (concatenate the array to itself) solves many circular problems with a linear window; here the greedy makes it unnecessary.</li>
      </ul>
      <h4>5. Where this shows up for real</h4>
      <p>Circular buffers in streaming systems, round-robin budget allocation, and checking whether a cyclic schedule of credits and debits ever goes overdrawn ("Is there a day of the month on which we can start a subscription cycle without our balance dropping below zero?").</p>`,
    aiEra: `<p><b>What AI changes:</b> Gas Station is a top-150 interview staple, so assistants output the one-pass code instantly. What they rarely produce unprompted is a <b>correct explanation</b> of why skipping a whole stretch is safe — and that explanation is exactly what interviewers probe now that the code is cheap.</p>
      <p><b>Use AI as a partner:</b> <code>Explain to a 12-year-old why, if I run out of fuel between stations 2 and 5, starting at 3 or 4 cannot help.</code> Then <code>Write a brute-force O(N²) checker and run 1000 random tests against the greedy, including inputs where the total is exactly 0.</code></p>
      <p><b>Where AI goes wrong:</b> returning the candidate start without checking the total, resetting the tank to <code>gain[i]</code> instead of 0, or "fixing" the loop to run 2N times (still correct but hides that it does not understand the proof).</p>
      <p><b>What you must still own:</b> the two facts (total decides possibility; failure eliminates the whole stretch) and the ability to rephrase the problem in prefix sums — that reframing is what lets you solve the variants nobody has memorised.</p>`,
    problems: [
      {
        title: 'Gas Station',
        level: 'Medium',
        tags: ['greedy', 'array', 'prefix sum'],
        companies: ['Amazon', 'Google', 'Microsoft', 'Bloomberg', 'Uber'],
        statement: `<p>There are <code>N</code> gas stations along a circular route; station <code>i</code> has <code>gas[i]</code> units of gas. Your car has an unlimited tank, and it costs <code>cost[i]</code> gas to drive from station <code>i</code> to station <code>(i + 1) % N</code>. You begin with an <b>empty tank</b> at one of the stations. Return the index of the starting station from which you can travel around the circuit once clockwise, or <code>−1</code> if impossible. If a solution exists, it is unique.</p>`,
        constraints: `1 ≤ N ≤ 10<sup>5</sup>, 0 ≤ gas[i], cost[i] ≤ 10<sup>4</sup>`,
        example: `${H.arr([1, 2, 3, 4, 5], { label: 'gas' })}${H.arr([3, 4, 5, 1, 2], { label: 'cost' })}${H.arr([-2, -2, -2, 3, 3], { label: 'gain', hl: { 3: 'g', 4: 'g' } })}
          <p>Output <b>3</b>. From station 3 the tank goes ${H.c('g', '3 → 6 → 4 → 2 → 0')}, never negative. Starting at 0, 1 or 2 fails on the very first leg (gain −2).</p>`,
        brute: {
          why: `<p>Try every start and simulate the full loop, stopping when the tank goes negative. O(N²) in the worst case = 10<sup>10</sup> steps for N = 10<sup>5</sup>. The waste: after failing from s at station k, we still try s+1, s+2, …, k — all of which provably fail at the same place.</p>`,
          code: { lang: 'java', code: `
            int bruteStart(int[] gas, int[] cost) {
                int n = gas.length;
                for (int s = 0; s < n; s++) {
                    long tank = 0;
                    boolean ok = true;
                    for (int step = 0; step < n; step++) {
                        int i = (s + step) % n;           // current station on the circle
                        tank += gas[i] - cost[i];
                        if (tank < 0) { ok = false; break; }
                    }
                    if (ok) return s;
                }
                return -1;
            }`, alt: [
          { lang: 'python', code: `def can_complete_circuit(gas, cost):
    n = len(gas)
    for s in range(n):
        tank = 0
        ok = True
        for step in range(n):
            i = (s + step) % n                       # current station on the circle
            tank += gas[i] - cost[i]
            if tank < 0:
                ok = False
                break
        if ok:
            return s
    return -1` },
          { lang: 'js', code: `function canCompleteCircuit(gas, cost) {
  const n = gas.length;
  for (let s = 0; s < n; s++) {
    let tank = 0;
    let ok = true;
    for (let step = 0; step < n; step++) {
      const i = (s + step) % n;                      // current station on the circle
      tank += gas[i] - cost[i];
      if (tank < 0) { ok = false; break; }
    }
    if (ok) return s;
  }
  return -1;
}` },
          { lang: 'cpp', code: `int canCompleteCircuit(vector<int>& gas, vector<int>& cost) {
    int n = gas.size();
    for (int s = 0; s < n; s++) {
        long long tank = 0;
        bool ok = true;
        for (int step = 0; step < n; step++) {
            int i = (s + step) % n;                  // current station on the circle
            tank += gas[i] - cost[i];
            if (tank < 0) { ok = false; break; }
        }
        if (ok) return s;
    }
    return -1;
}` },
          { lang: 'csharp', code: `int BruteStart(int[] gas, int[] cost)
{
    int n = gas.Length;
    for (int s = 0; s < n; s++)
    {
        long tank = 0;
        bool ok = true;
        for (int step = 0; step < n; step++)
        {
            int i = (s + step) % n;           // current station on the circle
            tank += gas[i] - cost[i];
            if (tank < 0) { ok = false; break; }
        }
        if (ok) return s;
    }
    return -1;
}` }
        ] }
        },
        mcq: {
          q: 'Starting at station 2 you run dry right after station 6. Which station should you try next?',
          options: ['Station 3', 'Station 7', 'Station 0', 'Go back and try station 1'],
          answer: 1,
          explain: 'Any station from 3 to 6 would be reached with ≥ 0 fuel when starting at 2, and that still failed; starting there fresh means even less fuel. Jump to station 7. Earlier stations (0, 1) were already eliminated or will be checked by the total.'
        },
        hints: [
          `<p><b>Aha 1:</b> if the sum of all <code>gas − cost</code> is negative, the answer is −1, full stop. If it is ≥ 0, some start works (and here it is unique).</p>`,
          `<p><b>Aha 2:</b> keep a running tank from the current candidate start. When it drops below 0 at station i, none of the stations from the candidate to i can be the start → candidate = i + 1, tank = 0.</p>`,
          `<p>Edge cases: N = 1 (gas ≥ cost → 0), total exactly 0 (still valid), the candidate never needs to wrap because the total check covers it. Recipe: total = tank = start = 0 → for i: g = gas[i] − cost[i]; total += g; tank += g; if tank &lt; 0 {start = i + 1; tank = 0} → return total ≥ 0 ? start : −1.</p>`
        ],
        tests: { sig: 'int[] int[] -> int', fn: 'canCompleteCircuit', cases: [
          [[[1, 2, 3, 4, 5], [3, 4, 5, 1, 2]], 3],
          [[[2, 3, 4], [3, 4, 3]], -1],
          [[[5], [4]], 0],
          [[[3], [4]], -1],
          [[[1, 0, 7], [0, 6, 1]], 2],
          [[[5, 1, 2, 3, 4], [4, 4, 1, 5, 1]], 4],
          [[[4, 6, 7, 4], [6, 5, 3, 5]], 1],
          [[[10000, 0], [0, 10000]], 0],
          [[{$concat: [{$rep: 0, n: 50000}, {$rep: 1, n: 50000}]}, {$concat: [{$rep: 1, n: 50000}, {$rep: 0, n: 50000}]}], 50000],
          [[{$rep: 10000, n: 100000}, {$concat: [{$rep: 10000, n: 99999}, [10001]]}], -1]
        ] },
        solution: {
          approach: `<p>One pass. The total gain decides whether any start works; a running tank finds the only candidate by skipping every station that belongs to a failed stretch.</p>`,
          code: `
            class Solution {
                public int canCompleteCircuit(int[] gas, int[] cost) {
                    long total = 0, tank = 0;
                    int start = 0;
                    for (int i = 0; i < gas.length; i++) {
                        int gain = gas[i] - cost[i];
                        total += gain;                 // overall balance of the whole loop
                        tank += gain;                  // balance since the current candidate
                        if (tank < 0) {                // candidate..i all fail
                            start = i + 1;
                            tank = 0;
                        }
                    }
                    return total >= 0 ? start : -1;
                }

                public static void main(String[] args) {
                    Solution s = new Solution();
                    System.out.println(s.canCompleteCircuit(new int[]{1, 2, 3, 4, 5}, new int[]{3, 4, 5, 1, 2})); // 3
                    System.out.println(s.canCompleteCircuit(new int[]{2, 3, 4}, new int[]{3, 4, 3}));           // -1
                }
            }`,
          alt: [{ lang: 'python', code: `def can_complete_circuit(gas, cost):
    total = tank = start = 0
    for i, (g, c) in enumerate(zip(gas, cost)):
        total += g - c
        tank += g - c
        if tank < 0:          # every station from start..i fails
            start, tank = i + 1, 0
    return start if total >= 0 else -1

print(can_complete_circuit([1, 2, 3, 4, 5], [3, 4, 5, 1, 2]))  # 3
print(can_complete_circuit([2, 3, 4], [3, 4, 3]))              # -1`, run: true }, { lang: 'js', code: `function canCompleteCircuit(gas, cost) {
  let total = 0, tank = 0, start = 0;
  for (let i = 0; i < gas.length; i++) {
    const gain = gas[i] - cost[i];
    total += gain;               // balance of the whole loop
    tank += gain;                // balance since the current candidate
    if (tank < 0) {              // candidate..i all fail
      start = i + 1;
      tank = 0;
    }
  }
  return total >= 0 ? start : -1;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int canCompleteCircuit(vector<int>& gas, vector<int>& cost) {
        long long total = 0, tank = 0;
        int start = 0;
        for (int i = 0; i < (int) gas.size(); i++) {
            int gain = gas[i] - cost[i];
            total += gain;
            tank += gain;
            if (tank < 0) { start = i + 1; tank = 0; }   // every station start..i fails
        }
        return total >= 0 ? start : -1;
    }
};` }, { lang: 'csharp', code: `public class Solution
{
    public int CanCompleteCircuit(int[] gas, int[] cost)
    {
        long total = 0, tank = 0;
        int start = 0;
        for (int i = 0; i < gas.Length; i++)
        {
            int gain = gas[i] - cost[i];
            total += gain;                 // overall balance of the whole loop
            tank += gain;                  // balance since the current candidate
            if (tank < 0)                  // candidate..i all fail
            {
                start = i + 1;
                tank = 0;
            }
        }
        return total >= 0 ? start : -1;
    }
}` }],
          dry: {
            head: ['i', 'gain', 'total', 'tank', 'tank &lt; 0?', 'start'],
            rows: [
              ['0', '−2', '−2', '−2 → 0', '<span class="c-r">yes</span>', '1'],
              ['1', '−2', '−4', '−2 → 0', '<span class="c-r">yes</span>', '2'],
              ['2', '−2', '−6', '−2 → 0', '<span class="c-r">yes</span>', '3'],
              ['3', '+3', '−3', '3', 'no', '3'],
              ['4', '+3', '0', '6', 'no', '<span class="c-p">3</span> (total ≥ 0)']
            ]
          },
          complexity: `<p><b>Time O(N)</b> — a single pass. <b>Space O(1)</b> — three variables.</p>`,
          followUps: ['Return ALL valid starting stations when uniqueness is not guaranteed.', 'You must start at station 0: what is the minimum initial fuel?', 'The tank has a maximum capacity C: does the greedy still work?', 'Travel counter-clockwise as well: pick the better direction.']
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 8 — Jump game I & II
  // =====================================================================
  topics.push({
    title: 'Jump Game I & II (Farthest Reach, BFS Levels Without a Queue)',
    analogy: `<p>You are crossing a river on stepping stones. Each stone has a number painted on it: "from here you can leap <b>up to</b> this many stones forward". Question 1: can you reach the far bank? Question 2: what is the <b>fewest leaps</b>?</p>
      <p>For question 1 you do not plan a route at all. You walk along and keep one number in your head: "the farthest stone I could possibly reach so far". If you ever stand on a stone beyond that number, you are stuck. For question 2, think of <b>ripples</b>: with one leap you can land anywhere in a first zone of stones; with two leaps, anywhere in a second zone further out; and so on. Count the zones until the bank is inside one.</p>`,
    explain: `<p><b>Jump Game I (LC 55):</b> <code>nums[i]</code> = maximum jump length from index i. Can you reach the last index from index 0?</p>
      <p><b>Greedy:</b> keep <code>reach</code> = farthest index reachable so far. Walk i from 0: if <code>i &gt; reach</code> you can never stand on i → false. Otherwise <code>reach = max(reach, i + nums[i])</code>. If reach ≥ last index → true.</p>
      ${H.arr([3, 2, 1, 0, 4], { label: 'nums', hl: { 3: 'r' } })}
      ${H.table(['i', 'nums[i]', 'i + nums[i]', 'reach'], [['0', '3', '3', '3'], ['1', '2', '3', '3'], ['2', '1', '3', '3'], ['3', '0', '3', H.c('r', '3 — stuck')], ['4', '—', 'i = 4 &gt; reach 3', H.c('r', 'false')]])}
      <p>Every path funnels into index 3, whose 0 is a trap. The greedy noticed without exploring any path.</p>
      <p><b>Jump Game II (LC 45):</b> the last index is reachable; return the <b>minimum number of jumps</b>.</p>
      <p><b>Greedy (BFS levels):</b> the indices reachable with exactly k jumps form a <b>contiguous window</b>. Walk i through the current window and track <code>farthest = max(i + nums[i])</code>. When i reaches the window's end (<code>curEnd</code>), you must jump: <code>jumps++</code>, and the next window ends at <code>farthest</code>.</p>
      ${H.arr([2, 3, 1, 1, 4], { label: 'nums', hl: { 0: 'y', 1: 'b', 2: 'b', 3: 'g', 4: 'g' } })}
      ${H.table(['jumps used', 'window of indices you can stand on', 'farthest from this window'], [['0', '[0, 0]', '0 + 2 = 2'], ['1', H.c('b', '[1, 2]'), 'max(1+3, 2+1) = 4'], ['2', H.c('g', '[3, 4]'), 'contains last index → ' + H.c('p', 'answer 2')]])}
      <p>Path: 0 → 1 → 4. We never had to decide "which stone to land on" explicitly — the window bookkeeping covers every choice at once, which is why this greedy is really a <b>BFS without a queue</b>.</p>`,
    clues: [
      '"<code>nums[i]</code> is the <b>maximum jump length</b> at that position" + "can you reach the last index?" → farthest-reach greedy, O(N).',
      '"Minimum number of jumps to reach the end" with <b>up to</b> nums[i] steps → BFS levels with curEnd / farthest, O(N).',
      '"Minimum number of <b>taps</b> to water a garden", "<b>video stitching</b>", "minimum intervals to cover [0, T]" → the same window-extension greedy (Jump Game II in disguise).',
      'Jumps are <b>exactly</b> nums[i] left or right (Jump Game III) → plain BFS/DFS, not this greedy.',
      'Each landing has a <b>score / cost</b> (Jump Game VI) → DP (with a monotonic deque), greedy fails.',
      '<code>N ≤ 10<sup>4</sup></code> or 10<sup>5</sup> and an O(N²) DP feels natural → there is likely an O(N) greedy.'
    ],
    code: [{ lang: 'java', code: `
      // LC 55 Jump Game: can we reach the last index?
      boolean canJump(int[] nums) {
          int reach = 0;                               // farthest index we can stand on so far
          for (int i = 0; i < nums.length; i++) {
              if (i > reach) return false;             // index i is unreachable -> so is the end
              reach = Math.max(reach, i + nums[i]);    // standing on i extends our reach
              if (reach >= nums.length - 1) return true;
          }
          return true;
      }`, alt: [{ lang: 'python', code: `# LC 55 Jump Game: can we reach the last index?
def can_jump(nums):
    reach = 0                              # farthest index we can stand on so far
    for i, x in enumerate(nums):
        if i > reach:
            return False                   # index i is unreachable -> so is the end
        reach = max(reach, i + x)          # standing on i extends our reach
        if reach >= len(nums) - 1:
            return True
    return True` }, { lang: 'js', code: `// LC 55 Jump Game: can we reach the last index?
function canJump(nums) {
  let reach = 0;                               // farthest index we can stand on so far
  for (let i = 0; i < nums.length; i++) {
    if (i > reach) return false;               // index i is unreachable -> so is the end
    reach = Math.max(reach, i + nums[i]);      // standing on i extends our reach
    if (reach >= nums.length - 1) return true;
  }
  return true;
}` }, { lang: 'cpp', code: `// LC 55 Jump Game: can we reach the last index?
bool canJump(const vector<int>& nums) {
    int reach = 0, n = nums.size();            // farthest index we can stand on so far
    for (int i = 0; i < n; i++) {
        if (i > reach) return false;           // index i is unreachable -> so is the end
        reach = max(reach, i + nums[i]);
        if (reach >= n - 1) return true;
    }
    return true;
}` }, { lang: 'csharp', code: `// LC 55 Jump Game: can we reach the last index?
bool CanJump(int[] nums)
{
    int reach = 0;                               // farthest index we can stand on so far
    for (int i = 0; i < nums.Length; i++)
    {
        if (i > reach) return false;             // index i is unreachable -> so is the end
        reach = Math.Max(reach, i + nums[i]);    // standing on i extends our reach
        if (reach >= nums.Length - 1) return true;
    }
    return true;
}` }] }, { lang: 'java', code: `
      // LC 45 Jump Game II: minimum jumps (the end is guaranteed reachable).
      int jump(int[] nums) {
          int jumps = 0;
          int curEnd = 0;        // last index reachable with 'jumps' jumps (current BFS level)
          int farthest = 0;      // farthest index reachable with 'jumps + 1' jumps
          for (int i = 0; i < nums.length - 1; i++) {  // no need to jump FROM the last index
              farthest = Math.max(farthest, i + nums[i]);
              if (i == curEnd) {                       // finished scanning this level
                  jumps++;                             // must take another jump
                  curEnd = farthest;                   // next level ends here
                  if (curEnd >= nums.length - 1) break;
              }
          }
          return jumps;
      }`, alt: [{ lang: 'python', code: `# LC 45 Jump Game II: minimum jumps (the end is guaranteed reachable).
def jump(nums):
    jumps = 0
    cur_end = 0        # last index reachable with 'jumps' jumps (current BFS level)
    farthest = 0       # farthest index reachable with 'jumps + 1' jumps
    for i in range(len(nums) - 1):         # no need to jump FROM the last index
        farthest = max(farthest, i + nums[i])
        if i == cur_end:                   # finished scanning this level
            jumps += 1                     # must take another jump
            cur_end = farthest             # next level ends here
            if cur_end >= len(nums) - 1:
                break
    return jumps` }, { lang: 'js', code: `// LC 45 Jump Game II: minimum jumps (the end is guaranteed reachable).
function jump(nums) {
  let jumps = 0;
  let curEnd = 0;      // last index reachable with 'jumps' jumps (current BFS level)
  let farthest = 0;    // farthest index reachable with 'jumps + 1' jumps
  for (let i = 0; i < nums.length - 1; i++) {   // no need to jump FROM the last index
    farthest = Math.max(farthest, i + nums[i]);
    if (i === curEnd) {                         // finished scanning this level
      jumps++;
      curEnd = farthest;
      if (curEnd >= nums.length - 1) break;
    }
  }
  return jumps;
}` }, { lang: 'cpp', code: `// LC 45 Jump Game II: minimum jumps (the end is guaranteed reachable).
int jump(const vector<int>& nums) {
    int n = nums.size(), jumps = 0;
    int curEnd = 0;      // last index reachable with 'jumps' jumps (current BFS level)
    int farthest = 0;    // farthest index reachable with 'jumps + 1' jumps
    for (int i = 0; i < n - 1; i++) {          // no need to jump FROM the last index
        farthest = max(farthest, i + nums[i]);
        if (i == curEnd) {                     // finished scanning this level
            jumps++;
            curEnd = farthest;
            if (curEnd >= n - 1) break;
        }
    }
    return jumps;
}` }, { lang: 'csharp', code: `// LC 45 Jump Game II: minimum jumps (the end is guaranteed reachable).
int Jump(int[] nums)
{
    int jumps = 0;
    int curEnd = 0;        // last index reachable with 'jumps' jumps (current BFS level)
    int farthest = 0;      // farthest index reachable with 'jumps + 1' jumps
    for (int i = 0; i < nums.Length - 1; i++)    // no need to jump FROM the last index
    {
        farthest = Math.Max(farthest, i + nums[i]);
        if (i == curEnd)                         // finished scanning this level
        {
            jumps++;                             // must take another jump
            curEnd = farthest;                   // next level ends here
            if (curEnd >= nums.Length - 1) break;
        }
    }
    return jumps;
}` }] }],
    codeTitle: ['Jump Game I: farthest reach', 'Jump Game II: BFS levels with two variables'],
    viz: {
      title: 'Jump Game II: grow the reachable window one jump at a time',
      input: '2 3 1 1 4',
      inputLabel: 'nums (2 to 14 numbers, each 0..9)',
      gen: function (input) {
        var a = parseNums(input, 'nums', 2, 14, 0, 9);
        var n = a.length, frames = [], jumps = 0, curEnd = 0, farthest = 0, curStart = 0, best = -1;
        var reachArr = a.map(function (x, i) { return i + x; });
        frames.push({ narr: 'Each number says how far you may leap from that index. With <b>0 jumps</b> you can only stand on index 0, so the first window is [0, 0]. We will scan each window and remember the farthest index any stone in it can reach.', parts: [
          { type: 'array', label: 'nums', values: a, range: [0, 0], ptr: { 0: 'start' } },
          { type: 'array', label: 'i + nums[i] (how far each index reaches)', values: reachArr },
          { type: 'vars', vals: { jumps: 0, curEnd: 0, farthest: 0 } }
        ] });
        if (n === 1) return frames;
        for (var i = 0; i < n - 1; i++) {
          if (i > curEnd) {
            frames.push({ narr: '<span class="c-r">Stuck:</span> index ' + i + ' is beyond every index we can reach (' + curEnd + '). The last index is unreachable — for Jump Game I the answer is <b>false</b>.', parts: [
              { type: 'array', label: 'nums', values: a, range: [curStart, curEnd], hl: one(i, 'bad') },
              { type: 'vars', vals: { jumps: jumps, curEnd: curEnd, farthest: farthest }, hl: { farthest: 'bad' } }
            ] });
            frames.push({ narr: 'Try an input without a trap, e.g. "2 3 1 1 4" or "2 3 0 1 4", to see the windows reach the end.', parts: [{ type: 'text', html: 'Unreachable end: Jump Game I → <b>false</b>; Jump Game II has no answer (−1).' }] });
            return frames;
          }
          var before = farthest;
          farthest = Math.max(farthest, i + a[i]);
          var rh = {}; rh[i] = 'cur';
          var fp = {}; fp[i] = 'i'; if (farthest < n && farthest !== i) fp[farthest] = 'far';
          frames.push({ narr: 'Scan index ' + i + ' (inside window [' + curStart + ', ' + curEnd + ']): it reaches ' + i + ' + ' + a[i] + ' = ' + (i + a[i]) + '. farthest = ' + (farthest > before ? '<b>' + farthest + '</b> (improved)' : farthest + ' (unchanged)') + '.', parts: [
            { type: 'array', label: 'nums (blue = indices reachable with ' + jumps + ' jump' + (jumps === 1 ? '' : 's') + ')', values: a, range: [curStart, curEnd], hl: rh, ptr: fp },
            { type: 'array', label: 'i + nums[i]', values: reachArr, hl: one(i, farthest > before ? 'ok' : 'cur') },
            { type: 'vars', vals: { jumps: jumps, curEnd: curEnd, farthest: farthest }, hl: farthest > before ? { farthest: 'ok' } : {} }
          ] });
          if (i === curEnd) {
            if (farthest <= i) {
              frames.push({ narr: '<span class="c-r">Window finished but farthest did not move past it</span> — no jump can take us further. The end is unreachable (Jump Game I → false).', parts: [
                { type: 'array', label: 'nums', values: a, range: [curStart, curEnd], hl: one(i, 'bad') },
                { type: 'vars', vals: { jumps: jumps, curEnd: curEnd, farthest: farthest }, hl: { farthest: 'bad' } }
              ] });
              frames.push({ narr: 'Every path is blocked by zeros. Change a 0 to a bigger number to open a route.', parts: [{ type: 'text', html: 'Unreachable end: Jump Game I → <b>false</b>.' }] });
              return frames;
            }
            jumps++; curStart = curEnd + 1; curEnd = farthest;
            var done = curEnd >= n - 1;
            frames.push({ narr: 'Reached the end of the window → we must take jump #' + jumps + '. Everything up to index ' + Math.min(curEnd, n - 1) + ' is now reachable with ' + jumps + ' jump' + (jumps === 1 ? '' : 's') + ': new window [' + curStart + ', ' + Math.min(curEnd, n - 1) + '].' + (done ? ' <span class="c-g">It contains the last index!</span>' : ''), parts: [
              { type: 'array', label: 'nums (blue = new window)', values: a, range: [curStart, Math.min(curEnd, n - 1)], hl: done ? one(n - 1, 'sel') : {} },
              { type: 'vars', vals: { jumps: jumps, curEnd: curEnd, farthest: farthest }, hl: { jumps: 'ok', curEnd: 'ok' } }
            ] });
            if (done) { best = jumps; break; }
          }
        }
        frames.push({ narr: 'Minimum jumps = <b>' + best + '</b>. Each jump grew the reachable region as far as possible, and no sequence of ' + (best - 1) + ' jumps can get beyond the window we had after ' + (best - 1) + ' jumps — so ' + best + ' is optimal (greedy stays ahead).', parts: [
          { type: 'array', label: 'nums', values: a, hl: one(n - 1, 'sel') },
          { type: 'vars', vals: { answer: best }, hl: { answer: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Jump Game I: reachable and unreachable',
        html: `<p>[2, 3, 1, 1, 4]: reach goes 2 → 4 at i = 1, and 4 is the last index → <b>true</b>. [3, 2, 1, 0, 4]: reach stays 3 for i = 0..3, then i = 4 &gt; 3 → <b>false</b>. [0]: you are already on the last index → <b>true</b>. [1, 0]: reach 1 = last index → <b>true</b> (a zero on the last index is harmless).</p>
          ${H.table(['nums', 'reach after each i', 'answer'], [['[2,3,1,1,4]', '2, 4 ✔', H.c('g', 'true')], ['[3,2,1,0,4]', '3, 3, 3, 3, (4 &gt; 3)', H.c('r', 'false')], ['[0]', '—', H.c('g', 'true')], ['[1,0]', '1 ✔', H.c('g', 'true')]])}`
      },
      {
        title: 'Jump Game II: which stone does greedy "choose"?',
        html: `<p>nums = [2, 3, 1, 1, 4]. From index 0 you could land on index 1 or 2. Greedy does not commit early; it scans both and learns index 1 reaches 4 and index 2 reaches 3. The "real" choice is the one that achieved <code>farthest</code>: index 1. Path 0 → 1 → 4 = <b>2 jumps</b>. Choosing the <i>longest</i> jump (to index 2) would give 0 → 2 → 3 → 4 = 3 jumps — the classic wrong greedy.</p>
          ${H.table(['strategy', 'path', 'jumps'], [['always jump as far as possible', '0 → 2 → 3 → 4', H.c('r', '3')], ['land where the NEXT reach is farthest', '0 → 1 → 4', H.c('g', '2')]])}`
      },
      {
        title: 'Video stitching / taps: Jump Game II in disguise',
        html: `<p>Clips [0,2] [4,6] [8,10] [1,9] [1,5] [5,9], cover [0, 10] with the fewest clips. Convert: <code>best[s] = max end of clips starting at s</code> → it is exactly "from position s you can reach best[s]". Run the window greedy: window [0,0] reaches 2; window up to 2 reaches 9 (clip [1,9]); window up to 9 reaches 10 → <b>3 clips</b> ([0,2], [1,9], [8,10]). LC 1326 "Minimum Number of Taps" is the same with radii.</p>`
      },
      {
        title: 'The O(N²) DP that the greedy replaces',
        html: `<p><code>dp[i]</code> = min jumps from i to the end: <code>dp[i] = 1 + min(dp[i+1..i+nums[i]])</code>. For [2,3,1,1,4]: dp[4]=0, dp[3]=1, dp[2]=2, dp[1]=1 (jump to 4), dp[0]=1+min(dp[1],dp[2])=2. Correct, but each cell scans up to nums[i] others → O(N·max jump). The greedy reaches the same 2 in a single pass, because "reachable in k jumps" is always a contiguous prefix.</p>
          ${H.arr([2, 1, 2, 1, 0], { label: 'dp', hl: { 0: 'p' } })}`
      }
    ],
    deepDive: `<h4>1. Why Jump Game I's greedy is correct</h4>
      <p>Invariant: after processing indices 0..i (all reachable), <code>reach</code> = the largest index reachable at all using only those stones. Every index ≤ reach is reachable too (you can always jump <i>shorter</i>), so the reachable set is the prefix [0, reach]. If i &gt; reach, nothing can ever land on i or beyond it → false.</p>
      <h4>2. Why Jump Game II's greedy is optimal (stays ahead / BFS)</h4>
      <p>Let R<sub>k</sub> = the farthest index reachable with at most k jumps. By the same "shorter jumps are allowed" fact, the set reachable in ≤ k jumps is exactly [0, R<sub>k</sub>]. Then R<sub>k+1</sub> = max over i ≤ R<sub>k</sub> of (i + nums[i]) — that is exactly what <code>farthest</code> computes while scanning the window. The answer is the first k with R<sub>k</sub> ≥ n − 1. The greedy computes R<sub>k</sub> exactly, so nothing can beat it. It is BFS where each level is a contiguous range, so the queue collapses into two integers.</p>
      <h4>3. The Jump Game family — know which tool each needs</h4>
      ${H.table(['problem', 'twist', 'tool'], [
        ['55 Jump Game', 'reachable?', 'farthest-reach greedy O(N)'],
        ['45 Jump Game II', 'min jumps', 'window/BFS-level greedy O(N)'],
        ['1306 Jump Game III', 'jump exactly ±nums[i]', 'BFS/DFS O(N)'],
        ['1345 Jump Game IV', 'teleport between equal values', 'BFS + map, clear lists after use'],
        ['1696 Jump Game VI', 'maximize score, jump ≤ k', 'DP + monotonic deque O(N)'],
        ['1871 Jump Game VII', 'jump in [minJump, maxJump] onto "0"s', 'sliding window / prefix count'],
        ['1024 / 1326 stitching, taps', 'cover an interval', 'convert → Jump Game II']
      ])}
      <h4>4. Edge cases</h4>
      <ul>
        <li>n = 1 → 0 jumps, already at the end (the loop to n − 2 never runs).</li>
        <li>Loop to <code>n − 2</code> in Jump Game II: if you scan the last index and it equals curEnd you would count an extra, pointless jump.</li>
        <li><code>i + nums[i]</code> can overflow if nums[i] is near 2<sup>31</sup> — use <code>Math.max(farthest, Math.min(n - 1, i + nums[i]))</code> with long or clamp.</li>
      </ul>
      <h4>5. Real world</h4>
      <p>"Fewest hops to cover a distance with variable-range relays" (radio relays, EV charging stations along a highway with ranges) is the same structure; with costs per stop it becomes a shortest-path / DP problem instead.</p>`,
    aiEra: `<p><b>What AI changes:</b> both Jump Games are memorised by every assistant. The interesting part is the <b>family</b>: paste Jump Game III or VI and many assistants still try the farthest-reach greedy because the title matches. Pattern-matching on names is exactly the failure mode you must not copy.</p>
      <p><b>Use AI as a partner:</b> <code>Here are 5 problem statements. For each, say greedy, BFS or DP and quote the sentence that decides it.</code> Or <code>Generate 10 random arrays (length ≤ 8) and compare my Jump Game II greedy with a BFS brute force.</code></p>
      <p><b>Where AI goes wrong:</b> the "always take the longest jump" greedy for Jump Game II, looping to <code>n − 1</code> and over-counting, and forgetting that Jump Game II assumes reachability (return −1 when it is not guaranteed).</p>
      <p><b>What you must still own:</b> the insight that reachable sets are <b>prefixes</b> — which is the whole reason a greedy works here — and the reflex to convert interval-cover problems (taps, stitching) into this form.</p>`,
    problems: [
      {
        title: 'Jump Game II (Minimum Jumps)',
        level: 'Medium',
        tags: ['greedy', 'array', 'BFS'],
        companies: ['Amazon', 'Google', 'Microsoft', 'Adobe', 'Apple'],
        statement: `<p>You are given a 0-indexed array <code>nums</code> of length <code>n</code>. You start at index 0. From index <code>i</code> you may jump to any index <code>i + j</code> with <code>0 &lt; j ≤ nums[i]</code> and <code>i + j &lt; n</code>. Return the <b>minimum number of jumps</b> to reach index <code>n − 1</code>. The test cases guarantee you can reach it.</p>`,
        constraints: `1 ≤ n ≤ 10<sup>4</sup>, 0 ≤ nums[i] ≤ 1000, the last index is reachable`,
        example: `${H.arr([2, 3, 1, 1, 4], { label: 'nums', hl: { 0: 'g', 1: 'g', 4: 'g' } })}
          <p>Output <b>2</b>: ${H.c('g', '0 → 1 → 4')} (jump 1 step, then 3 steps). With one jump you can reach at most index 2, so 1 jump is not enough.</p>`,
        brute: {
          why: `<p>DP from the right: <code>dp[i] = 1 + min(dp[i+1 .. i+nums[i]])</code>. Correct, but each index scans up to nums[i] next indices → O(n · max(nums)) = 10<sup>7</sup> here (fine), and O(n²) in general. The waste: indices reachable in k jumps form one contiguous block, so scanning them again and again for each i is unnecessary.</p>`,
          code: { lang: 'java', code: `
            int jumpDP(int[] nums) {
                int n = nums.length;
                int[] dp = new int[n];                     // dp[i] = min jumps from i to n-1
                Arrays.fill(dp, Integer.MAX_VALUE);
                dp[n - 1] = 0;
                for (int i = n - 2; i >= 0; i--) {
                    for (int j = i + 1; j <= Math.min(n - 1, i + nums[i]); j++) {
                        if (dp[j] != Integer.MAX_VALUE) dp[i] = Math.min(dp[i], dp[j] + 1);
                    }
                }
                return dp[0];
            }`, alt: [
          { lang: 'python', code: `def jump(nums):
    n = len(nums)
    INF = float('inf')
    dp = [INF] * n                                   # dp[i] = min jumps from i to n-1
    dp[n - 1] = 0
    for i in range(n - 2, -1, -1):
        for j in range(i + 1, min(n - 1, i + nums[i]) + 1):
            if dp[j] != INF:
                dp[i] = min(dp[i], dp[j] + 1)
    return dp[0]` },
          { lang: 'js', code: `function jump(nums) {
  const n = nums.length;
  const dp = new Array(n).fill(Infinity);            // dp[i] = min jumps from i to n-1
  dp[n - 1] = 0;
  for (let i = n - 2; i >= 0; i--) {
    for (let j = i + 1; j <= Math.min(n - 1, i + nums[i]); j++) {
      if (dp[j] !== Infinity) dp[i] = Math.min(dp[i], dp[j] + 1);
    }
  }
  return dp[0];
}` },
          { lang: 'cpp', code: `int jump(vector<int>& nums) {
    int n = nums.size();
    vector<int> dp(n, INT_MAX);                      // dp[i] = min jumps from i to n-1
    dp[n - 1] = 0;
    for (int i = n - 2; i >= 0; i--) {
        for (int j = i + 1; j <= min(n - 1, i + nums[i]); j++) {
            if (dp[j] != INT_MAX) dp[i] = min(dp[i], dp[j] + 1);
        }
    }
    return dp[0];
}` },
          { lang: 'csharp', code: `int JumpDP(int[] nums)
{
    int n = nums.Length;
    int[] dp = new int[n];                     // dp[i] = min jumps from i to n-1
    for (int i = 0; i < n; i++) dp[i] = int.MaxValue;
    dp[n - 1] = 0;
    for (int i = n - 2; i >= 0; i--)
    {
        for (int j = i + 1; j <= Math.Min(n - 1, i + nums[i]); j++)
        {
            if (dp[j] != int.MaxValue) dp[i] = Math.Min(dp[i], dp[j] + 1);
        }
    }
    return dp[0];
}` }
        ] }
        },
        mcq: {
          q: 'nums = [2, 3, 1, 1, 4]. A friend says "always jump as far as you can". How many jumps does that use, and what is the minimum?',
          options: ['2 and 2', '3 and 2', '3 and 3', '4 and 2'],
          answer: 1,
          explain: 'Longest jump: 0 → 2 (nums[0] = 2), then 2 → 3, then 3 → 4 = 3 jumps. Optimal: 0 → 1 → 4 = 2 jumps. The right greedy picks where the NEXT reach is largest, which the window method does implicitly.'
        },
        hints: [
          `<p><b>Aha:</b> the indices you can reach with exactly k jumps form a contiguous range. You do not need to know which stone you landed on — only how far the next range extends.</p>`,
          `<p>Keep <code>curEnd</code> (end of the range reachable with the current number of jumps) and <code>farthest</code> (max of <code>i + nums[i]</code> seen so far). When <code>i == curEnd</code>, you must jump: <code>jumps++</code>, <code>curEnd = farthest</code>.</p>`,
          `<p>Loop only to <code>n − 2</code> (you never jump from the last index), so n = 1 returns 0. Recipe: jumps = curEnd = farthest = 0 → for i in 0..n−2: farthest = max(farthest, i + nums[i]); if i == curEnd {jumps++; curEnd = farthest} → return jumps.</p>`
        ],
        tests: { sig: 'int[] -> int', fn: 'jump', cases: [
          [[[2, 3, 1, 1, 4]], 2],
          [[[2, 3, 0, 1, 4]], 2],
          [[[0]], 0],
          [[[1, 1, 1, 1]], 3],
          [[[5, 0, 0, 0, 0, 0]], 1],
          [[[1, 2]], 1],
          [[[1, 4, 0, 0, 0, 1]], 2],
          [[{$rep: 1, n: 10000}], 9999],
          [[{$rep: 1000, n: 10000}], 10]
        ] },
        solution: {
          approach: `<p>Implicit BFS: each "level" is a contiguous window of indices reachable with the same number of jumps. Scan the window, track the farthest index the next level reaches, and count a jump each time the scan crosses the window end. Greedy stays ahead because it computes the true farthest reach after every number of jumps.</p>`,
          code: `
            class Solution {
                public int jump(int[] nums) {
                    int n = nums.length;
                    int jumps = 0, curEnd = 0, farthest = 0;
                    for (int i = 0; i < n - 1; i++) {          // never jump from the last index
                        farthest = Math.max(farthest, i + nums[i]);
                        if (i == curEnd) {                     // end of the current BFS level
                            jumps++;
                            curEnd = farthest;                 // next level reaches this far
                            if (curEnd >= n - 1) break;        // the end is in the next level
                        }
                    }
                    return jumps;
                }

                public static void main(String[] args) {
                    Solution s = new Solution();
                    System.out.println(s.jump(new int[]{2, 3, 1, 1, 4}));  // 2
                    System.out.println(s.jump(new int[]{2, 3, 0, 1, 4}));  // 2
                    System.out.println(s.jump(new int[]{0}));              // 0
                }
            }`,
          alt: [{ lang: 'python', code: `def jump(nums):
    jumps = cur_end = farthest = 0
    for i in range(len(nums) - 1):     # never jump from the last index
        farthest = max(farthest, i + nums[i])
        if i == cur_end:               # finished this BFS level
            jumps += 1
            cur_end = farthest
    return jumps

print(jump([2, 3, 1, 1, 4]))  # 2
print(jump([1, 1, 1, 1]))     # 3`, run: true }, { lang: 'js', code: `function jump(nums) {
  let jumps = 0, curEnd = 0, farthest = 0;
  for (let i = 0; i < nums.length - 1; i++) {    // never jump from the last index
    farthest = Math.max(farthest, i + nums[i]);
    if (i === curEnd) {                          // end of the current BFS level
      jumps++;
      curEnd = farthest;
      if (curEnd >= nums.length - 1) break;
    }
  }
  return jumps;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int jump(vector<int>& nums) {
        int n = nums.size(), jumps = 0, curEnd = 0, farthest = 0;
        for (int i = 0; i < n - 1; i++) {          // never jump from the last index
            farthest = max(farthest, i + nums[i]);
            if (i == curEnd) {                     // end of this BFS level
                jumps++;
                curEnd = farthest;
                if (curEnd >= n - 1) break;
            }
        }
        return jumps;
    }
};` }, { lang: 'csharp', code: `using System;

public class Solution
{
    public int Jump(int[] nums)
    {
        int n = nums.Length;
        int jumps = 0, curEnd = 0, farthest = 0;
        for (int i = 0; i < n - 1; i++)            // never jump from the last index
        {
            farthest = Math.Max(farthest, i + nums[i]);
            if (i == curEnd)                       // end of the current BFS level
            {
                jumps++;
                curEnd = farthest;                 // next level reaches this far
                if (curEnd >= n - 1) break;        // the end is in the next level
            }
        }
        return jumps;
    }
}` }],
          dry: {
            head: ['i', 'nums[i]', 'i + nums[i]', 'farthest', 'i == curEnd?', 'jumps', 'curEnd'],
            rows: [
              ['0', '2', '2', '2', '<span class="c-y">yes</span>', '1', '2'],
              ['1', '3', '4', '4', 'no', '1', '2'],
              ['2', '1', '3', '4', '<span class="c-y">yes</span>', '2', '4 (≥ last → stop)'],
              ['—', '', '', '', '', '<span class="c-p">2</span>', '']
            ]
          },
          complexity: `<p><b>Time O(n)</b>: each index is scanned once. <b>Space O(1)</b>: three integers. Compare the DP: O(n · max jump) time and O(n) space.</p>`,
          followUps: ['Return the actual path of indices, not just the count.', 'The end may be unreachable: return −1 (detect farthest ≤ i at a window end).', 'Jumps may go backward as well (Jump Game III): why does the greedy stop working?', 'Convert "minimum taps to water a garden" into this problem.']
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 9 — When greedy fails
  // =====================================================================
  topics.push({
    title: 'When Greedy Fails: the Coin Change Counterexample',
    analogy: `<p>A shopkeeper in India gives change with ₹10, ₹5, ₹2, ₹1 coins and always reaches for the <b>biggest coin that fits</b>. It works every time. Now imagine a strange country whose coins are <b>1, 3 and 4</b>. To give 6, the habit says: 4 first, then 1, then 1 → <b>3 coins</b>. But 3 + 3 = <b>2 coins</b>! The habit that felt obviously right was a trap. The first big coin "looked best" but painted us into a corner.</p>`,
    explain: `<p>Greedy is only correct when you can <b>prove</b> the local choice never hurts. For coins {1, 3, 4}, compare greedy and the true minimum:</p>
      ${H.table(['amount', 'greedy (biggest first)', '# coins', 'true best', '# coins'], [
        ['5', '4 + 1', '2', '4 + 1', '2'],
        ['6', '4 + 1 + 1', H.c('r', '3'), '3 + 3', H.c('g', '2')],
        ['7', '4 + 3', '2', '4 + 3', '2'],
        ['10', '4 + 4 + 1 + 1', H.c('r', '4'), '4 + 3 + 3', H.c('g', '3')]
      ])}
      <p>Greedy can even <b>fail to find any answer</b>: coins {3, 4}, amount 6 → greedy takes 4, then 2 is left and nothing fits; yet 3 + 3 works.</p>
      <p><b>What to do instead?</b> Try <i>every</i> first coin, and for each one ask "what is the best way to pay the rest?" — and remember those answers. That is <b>Dynamic Programming</b> (DSA 17).</p>
      ${H.table(['Problem', 'Greedy OK?', 'Why'], [
        ['Activity selection', H.c('g', 'yes'), 'earliest end can be swapped into any best answer'],
        ['Fractional knapsack', H.c('g', 'yes'), 'items can be split, swap kilos by ratio'],
        ['Huffman coding', H.c('g', 'yes'), 'two rarest can always be deepest siblings'],
        ['Coin change (any coins)', H.c('r', 'no'), '{1,3,4}, amount 6 breaks it → DP'],
        ['0/1 knapsack', H.c('r', 'no'), 'items cannot be split → DP'],
        ['Longest path / LIS', H.c('r', 'no'), 'an early pick can block better later picks → DP']
      ])}
      <p><b>Interview habit:</b> before coding a greedy, spend 60 seconds trying to <b>break it</b> with a tiny input (2–4 items). If you find a counterexample → DP. If every attempt fails and you can say a "swap" argument out loud → greedy.</p>`,
    clues: [
      '"<b>Minimum number of coins</b>" with arbitrary / unusual denominations → DP, not greedy.',
      'Items that <b>cannot be split</b> + a capacity → 0/1 knapsack DP, not ratio greedy.',
      'You can build a 3-item counterexample in under a minute → greedy is wrong.',
      '"Return -1 if it is impossible" with coins → greedy may wrongly report impossible (coins {3,4}, amount 6).',
      'Standard currency (1, 2, 5, 10, …) is "canonical": greedy happens to work — but the problem will rarely promise that.'
    ],
    code: [{ lang: 'java', code: `
      // Looks right, but is WRONG for coins like {1, 3, 4}: returns 3 for amount 6 (best is 2)
      int greedyCoins(int[] coins, int amount) {
          Integer[] c = new Integer[coins.length];
          for (int i = 0; i < coins.length; i++) c[i] = coins[i];
          Arrays.sort(c, Collections.reverseOrder());   // biggest coin first
          int count = 0;
          for (int coin : c) {
              while (amount >= coin) {                  // take this coin as long as it fits
                  amount -= coin;
                  count++;
              }
          }
          return amount == 0 ? count : -1;              // may even say -1 when an answer exists
      }`, alt: [{ lang: 'python', code: `# Looks right, but is WRONG for coins like {1, 3, 4}: returns 3 for amount 6 (best is 2)
def greedy_coins(coins, amount):
    count = 0
    for coin in sorted(coins, reverse=True):   # biggest coin first
        count += amount // coin                # take this coin as long as it fits
        amount %= coin
    return count if amount == 0 else -1        # may even say -1 when an answer exists` }, { lang: 'js', code: `// Looks right, but is WRONG for coins like {1, 3, 4}: returns 3 for amount 6 (best is 2)
function greedyCoins(coins, amount) {
  const c = [...coins].sort((a, b) => b - a);  // biggest coin first
  let count = 0;
  for (const coin of c) {
    while (amount >= coin) {                   // take this coin as long as it fits
      amount -= coin;
      count++;
    }
  }
  return amount === 0 ? count : -1;            // may even say -1 when an answer exists
}` }, { lang: 'cpp', code: `// Looks right, but is WRONG for coins like {1, 3, 4}: returns 3 for amount 6 (best is 2)
int greedyCoins(vector<int> coins, int amount) {
    sort(coins.rbegin(), coins.rend());        // biggest coin first
    int count = 0;
    for (int coin : coins) {
        count += amount / coin;                // take this coin as long as it fits
        amount %= coin;
    }
    return amount == 0 ? count : -1;           // may even say -1 when an answer exists
}` }, { lang: 'csharp', code: `// Looks right, but is WRONG for coins like {1, 3, 4}: returns 3 for amount 6 (best is 2)
int GreedyCoins(int[] coins, int amount)
{
    int[] c = (int[])coins.Clone();
    Array.Sort(c);
    Array.Reverse(c);                             // biggest coin first
    int count = 0;
    foreach (int coin in c)
    {
        while (amount >= coin)                    // take this coin as long as it fits
        {
            amount -= coin;
            count++;
        }
    }
    return amount == 0 ? count : -1;              // may even say -1 when an answer exists
}` }] }, {
      lang: 'python', run: true, title: 'Stress test: is greedy safe for this coin system? (runnable)', code: `import random

def greedy(coins, amount):
    count = 0
    for c in sorted(coins, reverse=True):   # biggest coin first
        count += amount // c
        amount %= c
    return count if amount == 0 else -1

def dp_min(coins, amount):
    INF = float('inf')
    dp = [0] + [INF] * amount               # dp[a] = fewest coins for amount a
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
    return dp[amount] if dp[amount] != INF else -1

def first_counterexample(coins):
    # Kozen and Zaks (1994): for a coin system containing 1, if greedy is ever
    # wrong, the smallest bad amount is below the sum of the two largest coins.
    c = sorted(coins)
    limit = c[-1] + c[-2] if len(c) >= 2 else 1
    for amount in range(1, limit):
        if greedy(coins, amount) != dp_min(coins, amount):
            return amount
    return None

systems = [[1, 2, 5, 10, 20, 50, 100, 200, 500, 2000], [1, 3, 4], [1, 5, 10, 25],
           [1, 10, 25], [1, 3, 6, 12, 24, 30]]
for coins in systems:
    bad = first_counterexample(coins)
    if bad is None:
        print(coins, "-> greedy always optimal (canonical)")
    else:
        print(coins, "-> greedy fails at", bad, ": greedy", greedy(coins, bad), "vs best", dp_min(coins, bad))

random.seed(7)
fails = 0
for _ in range(300):
    coins = sorted(set([1] + random.sample(range(2, 30), 3)))
    if first_counterexample(coins) is not None:
        fails += 1
print("random coin systems where greedy breaks:", fails, "of 300")`
    }],
    codeTitle: ['The tempting (wrong) greedy', 'Stress test greedy against DP'],
    viz: {
      title: 'Greedy vs DP on the same coins',
      input: '1 3 4 | 6',
      inputLabel: 'coins | amount (amount ≤ 40)',
      gen: function (input) {
        var p = splitBar(input, 2, 'coins | amount, e.g. "1 3 4 | 6"');
        var coins = parseNums(p[0], 'coins', 1, 6, 1, 50);
        var amt = parseNums(p[1], 'amount', 1, 1, 1, 40)[0];
        var c = coins.slice().sort(function (a, b) { return b - a; });
        var frames = [], rem = amt, used = [];
        frames.push({ narr: 'Greedy plan: sort coins from biggest to smallest and always grab the biggest coin that still fits. Amount to pay = <b>' + amt + '</b>.', parts: [
          { type: 'array', label: 'coins (biggest first)', values: c }, { type: 'vars', vals: { remaining: rem, coinsUsed: 0 } }
        ] });
        for (var i = 0; i < c.length; i++) {
          while (rem >= c[i]) {
            rem -= c[i]; used.push(c[i]);
            frames.push({ narr: 'Greedy grabs coin <b>' + c[i] + '</b> (biggest that fits). Remaining = ' + rem + '. It never asks "will this hurt me later?"', parts: [
              { type: 'array', label: 'coins (biggest first)', values: c, hl: one(i, 'cur') },
              { type: 'stack', label: 'coins greedy took', items: used.slice(), hl: one(used.length - 1, 'ok') },
              { type: 'vars', vals: { remaining: rem, coinsUsed: used.length } }
            ] });
          }
        }
        var greedyRes = rem === 0 ? used.length : -1;
        // DP for the true answer
        var INF = 1e9, dp = [0], from = [0];
        for (var a = 1; a <= amt; a++) {
          dp[a] = INF; from[a] = -1;
          coins.forEach(function (co) { if (co <= a && dp[a - co] + 1 < dp[a]) { dp[a] = dp[a - co] + 1; from[a] = co; } });
        }
        var best = [], x = amt;
        if (dp[amt] < INF) while (x > 0) { best.push(from[x]); x -= from[x]; }
        frames.push({ narr: (rem === 0 ? 'Greedy finished with <b>' + used.length + '</b> coins.' : '<span class="c-r">Greedy is stuck</span>: ' + rem + ' is left and no coin fits!') + ' Now let DP try <i>every</i> last coin for every amount 0..' + amt + ' and keep the minimum.', parts: [
          { type: 'array', label: 'dp[a] = fewest coins to pay a', values: dp.map(show), hl: one(amt, 'cur') },
          { type: 'stack', label: 'coins greedy took', items: used.slice() }
        ] });
        var verdict = dp[amt] >= INF ? 'Neither can pay this amount.' : (greedyRes === dp[amt] ? 'Here greedy happened to match DP — but that is luck, not proof. Try "1 3 4 | 6" or "3 4 | 6".' : '<span class="c-r">Greedy was wrong</span>: it used ' + (greedyRes < 0 ? 'no valid set' : greedyRes + ' coins') + ', DP found <span class="c-g">' + dp[amt] + '</span> coins.');
        frames.push({ narr: 'DP answer: <b>' + show(dp[amt]) + '</b> coins' + (best.length ? ' (' + best.join(' + ') + ')' : '') + '. ' + verdict, parts: [
          { type: 'array', label: 'dp[a] = fewest coins to pay a', values: dp.map(show), hl: one(amt, 'sel') },
          { type: 'stack', label: 'coins DP picked', items: best, hl: (function () { var h = {}; best.forEach(function (_, k) { h[k] = 'sel'; }); return h; })() },
          { type: 'vars', vals: { greedy: greedyRes, dp: show(dp[amt]) }, hl: { greedy: greedyRes === dp[amt] ? 'ok' : 'bad', dp: 'ok' } }
        ] });
        return frames;
      }
    }
,
    examples: [
      {
        title: 'Greedy cannot even find an answer: coins {3, 4}, amount 6',
        html: `<p>Greedy grabs 4 (biggest that fits), leaving 2. Neither 3 nor 4 fits into 2 → greedy reports <b>−1 (impossible)</b>. But 3 + 3 = 6 works with <b>2 coins</b>. A wrong greedy is not only "a bit suboptimal" — it can be completely wrong about feasibility.</p>
          ${H.table(['method', 'coins used', 'answer'], [['greedy', '4, then stuck at 2', H.c('r', '−1')], ['DP', '3 + 3', H.c('g', '2')]])}`
      },
      {
        title: 'Real currencies: canonical by design (mostly)',
        html: `<p>Indian rupee coins and notes (1, 2, 5, 10, 20, 50, 100, 200, 500), euro (1, 2, 5, 10, 20, 50 cents …) and US coins (1, 5, 10, 25) are <b>canonical</b>: greedy is always optimal, which is why cashiers can make change without thinking. Remove the US nickel → {1, 10, 25}: for 30 cents greedy gives 25 + 1·5 = <b>6 coins</b>, but 10 + 10 + 10 = <b>3</b>. Pre-1971 British coins (1, 3, 6, 12, 24, 30 pence) were <b>not</b> canonical: 48 pence = greedy 30 + 12 + 6 (3 coins) vs 24 + 24 (2 coins).</p>`
      },
      {
        title: 'LIS: "take anything bigger than the last" fails',
        html: `<p>Longest increasing subsequence of [1, 5, 2, 3, 4]. Greedy "take the next element if it is bigger than the last taken" picks 1, 5 and then nothing else is bigger than 5 → length <b>2</b>. The best is 1, 2, 3, 4 → length <b>4</b>. Taking 5 looked good locally but blocked a longer future — the signature of a problem that needs DP (or the patience-sorting trick in DSA 18).</p>
          ${H.arr([1, 5, 2, 3, 4], { label: 'greedy', hl: { 0: 'r', 1: 'r' } })}${H.arr([1, 5, 2, 3, 4], { label: 'best', hl: { 0: 'g', 2: 'g', 3: 'g', 4: 'g' } })}`
      },
      {
        title: 'How to decide in an interview: the 60-second check',
        html: `<ol>
            <li>State the greedy rule in one sentence ("biggest coin first").</li>
            <li>Try to break it with 2–4 tiny items, especially <b>near-ties</b> and <b>awkward sizes</b> (coins 1, 3, 4; amount 6).</li>
            <li>If broken → say so out loud and switch to DP. If not → try to say the exchange argument. If you cannot, say "I believe it is greedy; I would stress-test it against brute force".</li>
          </ol>
          ${H.table(['you found…', 'conclusion'], [['a counterexample', H.c('r', 'not greedy → DP / search')], ['an exchange or stays-ahead argument', H.c('g', 'greedy, explain the proof')], ['neither in 2 minutes', H.c('y', 'code greedy + brute force, stress test')]])}`
      }
    ],
    deepDive: `<h4>1. Why exactly does greedy fail here?</h4>
      <p>The greedy choice property is violated: for coins {1, 3, 4} and amount 6, <b>no</b> optimal answer contains the greedy first coin 4 (the only optimum is 3 + 3). There is no swap that turns an optimal answer into one starting with 4 without getting worse — the exchange argument has nothing to stand on. Structurally, "sets of coins summing to a target" do not form a matroid.</p>
      <h4>2. Canonical coin systems — what theory says</h4>
      <ul>
        <li><b>Kozen &amp; Zaks (1994):</b> for a system containing 1, if greedy ever fails, the smallest failing amount is less than the sum of the two largest coins. So checking all amounts below c<sub>max</sub> + c<sub>second</sub> with a DP decides canonicity — that is what the runnable stress test above does.</li>
        <li><b>Pearson (2005):</b> an O(n³) algorithm (n = number of coin types) decides canonicity without depending on coin values.</li>
        <li>Change-making for an arbitrary system is NP-hard in the size of the input (coin values written in binary); the DP is <b>pseudo-polynomial</b>, O(amount × coins).</li>
      </ul>
      <h4>3. The general "is it greedy?" checklist</h4>
      ${H.table(['signal', 'leans greedy', 'leans DP'], [
        ['items', 'divisible, or all the same size', 'whole items of different sizes'],
        ['choices', 'an early choice never blocks a later one', 'an early choice can block / waste capacity'],
        ['structure', 'intervals by end, deadlines, ratios, merges of smallest', 'targets/sums, "exactly K", subsequences'],
        ['proof', 'you can say a swap / stays-ahead argument', 'you found a tiny counterexample'],
        ['constraints', 'N up to 10<sup>5</sup>–10<sup>6</sup>, values up to 10<sup>9</sup>', 'target/capacity ≤ ~10<sup>4</sup>–10<sup>5</sup> (DP table fits)']
      ])}
      <h4>4. Greedy as a heuristic is still useful</h4>
      <p>When the exact problem is NP-hard (bin packing, set cover, travelling salesman), production systems deliberately use greedy heuristics (first-fit decreasing, nearest neighbour) with known approximation bounds, sometimes followed by local search. The skill is to <b>know</b> you are approximating and say so — "greedy gives at most 11/9·OPT + 6/9 bins for first-fit decreasing" sounds very different from "greedy is optimal".</p>
      <h4>5. Stress testing, the professional habit</h4>
      <p>Write the brute force (exponential, tiny n), the greedy, and a random generator; compare on thousands of small inputs; print the first mismatch. Competitive programmers and senior engineers do this routinely, and with AI-generated code it is the cheapest correctness check you have.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI makes the <i>greedy</i> part of the work almost free and the <i>judgement</i> part more valuable. Ask an assistant for "minimum coins" without listing the coins and you may well get the biggest-coin-first loop, presented confidently. The fix is not a better prompt; it is you knowing that the answer depends on whether the coin system is canonical.</p>
      <p><b>Use AI as a partner:</b></p>
      <ul>
        <li><code>Before writing code: is greedy provably optimal for this problem? Give a counterexample if not.</code></li>
        <li><code>Write a brute force, my greedy, and a random tester; stop at the first mismatch and print it.</code> (exactly the runnable snippet above)</li>
        <li><code>Which real currency systems are non-canonical? Verify each claim with code, not memory.</code> — and check its claims, since assistants sometimes hallucinate coin sets.</li>
      </ul>
      <p><b>Where AI goes wrong:</b> mixing up "fewest coins" (min DP) with "number of ways" (counting DP, where loop order matters), applying ratio greedy to 0/1 knapsack, and "proving" a greedy by testing only the example from the statement.</p>
      <p><b>What you must still own:</b> the reflex to hunt for a counterexample, the vocabulary (greedy choice property, canonical system, exchange argument), and the switch to DP when the hunt succeeds. In 2026 interviews this "greedy or DP, and why?" discussion is often worth more than the code.</p>`,
    problems: [
      {
        title: 'Coin Change: Fewest Coins (Where Greedy Fails)',
        level: 'Medium',
        tags: ['dynamic programming', 'greedy counterexample', 'unbounded knapsack'],
        companies: ['Amazon', 'Google', 'Microsoft', 'Goldman Sachs', 'Bloomberg'],
        statement: `<p>You are given coin denominations <code>coins</code> (unlimited supply of each) and an integer <code>amount</code>. Return the <b>fewest number of coins</b> that add up to exactly <code>amount</code>, or <code>−1</code> if it cannot be made. The coin system is <b>arbitrary</b> — greedy "biggest coin first" is not guaranteed to work.</p>`,
        constraints: `1 ≤ coins.length ≤ 12, 1 ≤ coins[i] ≤ 2<sup>31</sup> − 1, 0 ≤ amount ≤ 10<sup>4</sup>`,
        example: `${H.arr([1, 3, 4], { label: 'coins' })}<p>amount = 6 → Output <b>2</b> (${H.c('g', '3 + 3')}). Greedy would take ${H.c('r', '4 + 1 + 1 = 3 coins')}. With coins [2] and amount 3 the output is −1; with amount 0 the output is 0.</p>`,
        brute: {
          why: `<p>Try every coin as the last coin and recurse on the rest: <code>best(a) = 1 + min over c of best(a − c)</code>. Without memory, the same amounts are recomputed over and over — about coins<sup>amount/min coin</sup> calls, astronomically many for amount = 10<sup>4</sup>. The waste: there are only <code>amount + 1</code> different sub-questions.</p>`,
          code: { lang: 'java', code: `
            int bruteCoins(int[] coins, int amount) {
                if (amount == 0) return 0;
                int best = Integer.MAX_VALUE;
                for (int c : coins) {
                    if (c <= amount) {
                        int sub = bruteCoins(coins, amount - c);   // best way to pay the rest
                        if (sub != -1) best = Math.min(best, sub + 1);
                    }
                }
                return best == Integer.MAX_VALUE ? -1 : best;
            }`, alt: [
          { lang: 'python', code: `def coin_change(coins, amount):
    if amount == 0:
        return 0
    best = float('inf')
    for c in coins:
        if c <= amount:
            sub = coin_change(coins, amount - c)     # best way to pay the rest
            if sub != -1:
                best = min(best, sub + 1)
    return -1 if best == float('inf') else best` },
          { lang: 'js', code: `function coinChange(coins, amount) {
  if (amount === 0) return 0;
  let best = Infinity;
  for (const c of coins) {
    if (c <= amount) {
      const sub = coinChange(coins, amount - c);     // best way to pay the rest
      if (sub !== -1) best = Math.min(best, sub + 1);
    }
  }
  return best === Infinity ? -1 : best;
}` },
          { lang: 'cpp', code: `int coinChange(vector<int>& coins, int amount) {
    if (amount == 0) return 0;
    int best = INT_MAX;
    for (int c : coins) {
        if (c <= amount) {
            int sub = coinChange(coins, amount - c); // best way to pay the rest
            if (sub != -1) best = min(best, sub + 1);
        }
    }
    return best == INT_MAX ? -1 : best;
}` },
          { lang: 'csharp', code: `int BruteCoins(int[] coins, int amount)
{
    if (amount == 0) return 0;
    int best = int.MaxValue;
    foreach (int c in coins)
    {
        if (c <= amount)
        {
            int sub = BruteCoins(coins, amount - c);   // best way to pay the rest
            if (sub != -1) best = Math.Min(best, sub + 1);
        }
    }
    return best == int.MaxValue ? -1 : best;
}` }
        ] }
        },
        mcq: {
          q: 'For coins {1, 3, 4}, which statement is true?',
          options: ['Greedy is always optimal because 1 is included', 'Greedy is optimal for every amount except some, e.g. 6', 'Greedy is never optimal', 'Greedy is optimal only for even amounts'],
          answer: 1,
          explain: 'Having a 1-coin guarantees greedy finds SOME answer, not the best one. For 1..5 greedy matches the optimum, at 6 it gives 4+1+1 = 3 vs 3+3 = 2. (The smallest counterexample is below 4 + 3 = 7, as Kozen–Zaks predicts.)'
        },
        hints: [
          `<p><b>Aha:</b> the last coin of an optimal answer is <i>some</i> coin c; what remains (amount − c) must itself be paid optimally. Try all c instead of trusting the biggest.</p>`,
          `<p>Bottom-up DP: <code>dp[0] = 0</code>, <code>dp[a] = min over coins c ≤ a of dp[a − c] + 1</code>. Use a sentinel like <code>amount + 1</code> for "impossible" (you never need more than <code>amount</code> coins of value ≥ 1).</p>`,
          `<p>Edge cases: amount 0 → 0; unreachable amounts stay at the sentinel → −1; huge coins (2<sup>31</sup> − 1) must not overflow <code>a − c</code> (check <code>c ≤ a</code> first). Recipe: fill dp[1..amount] with amount + 1 → for a: for c: if c ≤ a → dp[a] = min(dp[a], dp[a − c] + 1) → answer dp[amount] &gt; amount ? −1 : dp[amount].</p>`
        ],
        tests: { sig: 'int[] int -> int', fn: 'coinChange', cases: [
          [[[1, 3, 4], 6], 2],
          [[[3, 4], 6], 2],
          [[[2], 3], -1],
          [[[1, 2, 5], 11], 3],
          [[[1], 0], 0],
          [[[2147483647], 2], -1],
          [[[1, 2147483647], 3], 3],
          [[[186, 419, 83, 408], 6249], 20],
          [[[1], 10000], 10000],
          [[[7, 2147483647], 10000], -1]
        ] },
        solution: {
          approach: `<p>Unbounded-knapsack style DP over amounts 0..amount. Each amount takes the best of "last coin = c" for every coin. This is the fix for the failed greedy: instead of committing to one first choice, it evaluates every choice once and reuses the answers.</p>`,
          code: `
            import java.util.*;

            class Solution {
                public int coinChange(int[] coins, int amount) {
                    int INF = amount + 1;                     // more coins than could ever be needed
                    int[] dp = new int[amount + 1];
                    Arrays.fill(dp, INF);
                    dp[0] = 0;                                // zero coins pay zero
                    for (int a = 1; a <= amount; a++) {
                        for (int c : coins) {
                            if (c <= a && dp[a - c] + 1 < dp[a]) {
                                dp[a] = dp[a - c] + 1;        // last coin = c
                            }
                        }
                    }
                    return dp[amount] > amount ? -1 : dp[amount];
                }

                public static void main(String[] args) {
                    Solution s = new Solution();
                    System.out.println(s.coinChange(new int[]{1, 3, 4}, 6));     // 2 (greedy says 3)
                    System.out.println(s.coinChange(new int[]{3, 4}, 6));        // 2 (greedy says -1)
                    System.out.println(s.coinChange(new int[]{2}, 3));           // -1
                    System.out.println(s.coinChange(new int[]{1, 2, 5}, 11));    // 3
                }
            }`,
          alt: [{ lang: 'python', code: `def coin_change(coins, amount):
    INF = amount + 1
    dp = [0] + [INF] * amount          # dp[a] = fewest coins for amount a
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
    return -1 if dp[amount] > amount else dp[amount]

print(coin_change([1, 3, 4], 6))   # 2
print(coin_change([3, 4], 6))      # 2
print(coin_change([2], 3))         # -1`, run: true }, { lang: 'js', code: `function coinChange(coins, amount) {
  const INF = amount + 1;                    // more coins than could ever be needed
  const dp = new Int32Array(amount + 1).fill(INF);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1;   // last coin = c
    }
  }
  return dp[amount] > amount ? -1 : dp[amount];
}` }, { lang: 'cpp', code: `class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        vector<int> dp(amount + 1, amount + 1);      // amount + 1 = "impossible"
        dp[0] = 0;
        for (int a = 1; a <= amount; a++)
            for (int c : coins)
                if (c <= a) dp[a] = min(dp[a], dp[a - c] + 1);   // c <= a first: no overflow
        return dp[amount] > amount ? -1 : dp[amount];
    }
};` }, { lang: 'csharp', code: `public class Solution
{
    public int CoinChange(int[] coins, int amount)
    {
        int INF = amount + 1;                     // more coins than could ever be needed
        int[] dp = new int[amount + 1];
        for (int a = 0; a <= amount; a++) dp[a] = INF;
        dp[0] = 0;                                // zero coins pay zero
        for (int a = 1; a <= amount; a++)
        {
            foreach (int c in coins)
            {
                if (c <= a && dp[a - c] + 1 < dp[a])
                {
                    dp[a] = dp[a - c] + 1;        // last coin = c
                }
            }
        }
        return dp[amount] > amount ? -1 : dp[amount];
    }
}` }],
          dry: {
            head: ['a', 'try c = 1', 'try c = 3', 'try c = 4', 'dp[a]'],
            rows: [
              ['0', '—', '—', '—', '0'],
              ['1', 'dp[0]+1 = 1', '—', '—', '1'],
              ['2', 'dp[1]+1 = 2', '—', '—', '2'],
              ['3', 'dp[2]+1 = 3', 'dp[0]+1 = 1', '—', '1'],
              ['4', 'dp[3]+1 = 2', 'dp[1]+1 = 2', 'dp[0]+1 = 1', '1'],
              ['5', 'dp[4]+1 = 2', 'dp[2]+1 = 3', 'dp[1]+1 = 2', '2'],
              ['6', 'dp[5]+1 = 3', '<span class="c-g">dp[3]+1 = 2</span>', 'dp[2]+1 = 3', '<span class="c-p">2</span>']
            ]
          },
          complexity: `<p><b>Time O(amount × coins)</b> = 10<sup>4</sup> × 12 ≈ 1.2·10<sup>5</sup> steps. <b>Space O(amount)</b>. Pseudo-polynomial: it depends on the numeric value of amount, which is why huge amounts with arbitrary coins are hard in general.</p>`,
          followUps: ['Count the number of different ways to make the amount (LC 518) — which loop goes outside and why?', 'Return the actual coins used.', 'Decide whether greedy is safe for a given coin system (check amounts below the sum of the two largest coins).', 'Each coin may be used at most once: what changes in the loops?']
        }
      }
    ]
  });

  // =====================================================================
  // PRACTICE — Easy
  // =====================================================================
  practice.push({
    title: 'Assign Cookies',
    level: 'Easy',
    tags: ['greedy', 'sorting', 'two pointers'],
    companies: ['Amazon', 'Google'],
    statement: `<p>Each child <code>i</code> has a greed factor <code>g[i]</code>: the smallest cookie size that makes them happy. Each cookie <code>j</code> has size <code>s[j]</code>. A child gets at most one cookie, and a cookie goes to at most one child. Child i is content if they get a cookie with <code>s[j] ≥ g[i]</code>. Return the <b>maximum number of content children</b>.</p>`,
    constraints: `1 ≤ g.length ≤ 3·10<sup>4</sup>, 0 ≤ s.length ≤ 3·10<sup>4</sup>, 1 ≤ g[i], s[j] ≤ 2<sup>31</sup> − 1`,
    example: `${H.arr([1, 2, 3], { label: 'g (greed)' })}${H.arr([1, 1], { label: 's (cookies)', hl: { 0: 'g' } })}
      <p>Output <b>1</b>: both cookies have size 1, so only the child with greed 1 can be satisfied. With g = [1, 2] and s = [1, 2, 3] the output is <b>2</b>.</p>`,
    brute: {
      why: `<p>Backtracking: for each child, either give nothing or try every unused cookie that is big enough. Exponential in the number of children — hopeless at 3·10<sup>4</sup>. The waste: giving a big cookie to an easy child when a small one would do is never better, so most branches are pointless.</p>`,
      code: { lang: 'java', code: `
        int bruteCookies(int[] g, int[] s) {
            return assign(g, s, 0, new boolean[s.length]);
        }

        int assign(int[] g, int[] s, int child, boolean[] used) {
            if (child == g.length) return 0;
            int best = assign(g, s, child + 1, used);                 // this child gets nothing
            for (int c = 0; c < s.length; c++) {
                if (!used[c] && s[c] >= g[child]) {
                    used[c] = true;
                    best = Math.max(best, 1 + assign(g, s, child + 1, used));
                    used[c] = false;
                }
            }
            return best;
        }`, alt: [
          { lang: 'python', code: `def find_content_children(g, s):
    used = [False] * len(s)

    def assign(child):
        if child == len(g):
            return 0
        best = assign(child + 1)                     # this child gets nothing
        for c in range(len(s)):
            if not used[c] and s[c] >= g[child]:
                used[c] = True
                best = max(best, 1 + assign(child + 1))
                used[c] = False
        return best

    return assign(0)` },
          { lang: 'js', code: `function findContentChildren(g, s) {
  const used = new Array(s.length).fill(false);
  function assign(child) {
    if (child === g.length) return 0;
    let best = assign(child + 1);                    // this child gets nothing
    for (let c = 0; c < s.length; c++) {
      if (!used[c] && s[c] >= g[child]) {
        used[c] = true;
        best = Math.max(best, 1 + assign(child + 1));
        used[c] = false;
      }
    }
    return best;
  }
  return assign(0);
}` },
          { lang: 'cpp', code: `int assign(vector<int>& g, vector<int>& s, int child, vector<bool>& used) {
    if (child == (int)g.size()) return 0;
    int best = assign(g, s, child + 1, used);        // this child gets nothing
    for (int c = 0; c < (int)s.size(); c++) {
        if (!used[c] && s[c] >= g[child]) {
            used[c] = true;
            best = max(best, 1 + assign(g, s, child + 1, used));
            used[c] = false;
        }
    }
    return best;
}

int findContentChildren(vector<int> g, vector<int> s) {
    vector<bool> used(s.size(), false);
    return assign(g, s, 0, used);
}` },
          { lang: 'csharp', code: `int BruteCookies(int[] g, int[] s)
{
    return Assign(g, s, 0, new bool[s.Length]);
}

int Assign(int[] g, int[] s, int child, bool[] used)
{
    if (child == g.Length) return 0;
    int best = Assign(g, s, child + 1, used);                 // this child gets nothing
    for (int c = 0; c < s.Length; c++)
    {
        if (!used[c] && s[c] >= g[child])
        {
            used[c] = true;
            best = Math.Max(best, 1 + Assign(g, s, child + 1, used));
            used[c] = false;
        }
    }
    return best;
}` }
        ] }
    },
    mcq: {
      q: 'Cookies are sorted small to large. The current smallest cookie is too small for the least greedy child still waiting. What should you do with it?',
      options: ['Give it to the greediest child anyway', 'Throw it away (skip it) — it cannot satisfy anyone still waiting', 'Stop the algorithm', 'Swap it with a bigger cookie'],
      answer: 1,
      explain: 'If it cannot satisfy the least greedy remaining child, it cannot satisfy anybody remaining. Skip it and try the next (bigger) cookie.'
    },
    hints: [
      `<p><b>Aha:</b> the least greedy child is the easiest to please — give them the <b>smallest cookie that works</b>. Saving bigger cookies for greedier children can only help.</p>`,
      `<p>Sort both arrays. Walk cookies from small to large with a pointer on children: if the cookie satisfies the current child, move to the next child; either way move to the next cookie.</p>`,
      `<p>Edge cases: no cookies → 0; more cookies than children → stop when all children are content. Recipe: sort g, sort s → child = 0 → for each cookie: if child &lt; g.length and s[cookie] ≥ g[child] → child++ → return child.</p>`
    ],
    tests: { sig: 'int[] int[] -> int', fn: 'findContentChildren', cases: [
      [[[1, 2, 3], [1, 1]], 1],
      [[[1, 2], [1, 2, 3]], 2],
      [[[1], []], 0],
      [[[5], [4]], 0],
      [[[2, 2, 2], [2, 2]], 2],
      [[[10, 9, 8, 7], [5, 6, 7, 8]], 2],
      [[[2147483647, 1], [2147483647]], 1],
      [[{$range: [1, 30001, 1]}, {$rep: 2147483647, n: 30000}], 30000],
      [[{$rep: 2, n: 30000}, {$rep: 1, n: 30000}], 0]
    ] },
    solution: {
      approach: `<p>Sort children by greed and cookies by size; match each cookie, smallest first, to the least greedy child it can satisfy. Exchange argument: if an optimal answer gives the least greedy child a bigger cookie, swap it for the smallest sufficient cookie — nobody becomes unhappy.</p>`,
      code: `
        import java.util.*;

        class Solution {
            public int findContentChildren(int[] g, int[] s) {
                int[] greed = g.clone(), size = s.clone();
                Arrays.sort(greed);
                Arrays.sort(size);
                int child = 0;
                for (int cookie = 0; cookie < size.length && child < greed.length; cookie++) {
                    if (size[cookie] >= greed[child]) child++;   // smallest cookie that pleases this child
                    // otherwise this cookie is too small for everyone left: skip it
                }
                return child;
            }

            public static void main(String[] args) {
                Solution sol = new Solution();
                System.out.println(sol.findContentChildren(new int[]{1, 2, 3}, new int[]{1, 1}));     // 1
                System.out.println(sol.findContentChildren(new int[]{1, 2}, new int[]{1, 2, 3}));     // 2
            }
        }`,
      dry: {
        head: ['cookie', 'child greed', 'cookie ≥ greed?', 'content'],
        rows: [['1', '1', '<span class="c-g">yes</span>', '1'], ['2', '2', '<span class="c-g">yes</span>', '2'], ['3', '— (all done)', '', '<span class="c-p">2</span>']]
      },
      alt: [{ lang: 'python', code: `def find_content_children(g, s):
    greed, size = sorted(g), sorted(s)
    child = 0
    for cookie in size:
        if child == len(greed):
            break
        if cookie >= greed[child]:     # smallest cookie that pleases this child
            child += 1
    return child` }, { lang: 'js', code: `function findContentChildren(g, s) {
  const greed = Float64Array.from(g).sort(), size = Float64Array.from(s).sort();   // numeric sorts
  let child = 0;
  for (let c = 0; c < size.length && child < greed.length; c++) {
    if (size[c] >= greed[child]) child++;   // otherwise this cookie is too small for everyone left
  }
  return child;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int findContentChildren(vector<int> g, vector<int> s) {
        sort(g.begin(), g.end());
        sort(s.begin(), s.end());
        size_t child = 0;
        for (size_t c = 0; c < s.size() && child < g.size(); c++)
            if (s[c] >= g[child]) child++;
        return child;
    }
};` }, { lang: 'csharp', code: `using System;

public class Solution
{
    public int FindContentChildren(int[] g, int[] s)
    {
        int[] greed = (int[])g.Clone(), size = (int[])s.Clone();
        Array.Sort(greed);
        Array.Sort(size);
        int child = 0;
        for (int cookie = 0; cookie < size.Length && child < greed.Length; cookie++)
        {
            if (size[cookie] >= greed[child]) child++;   // smallest cookie that pleases this child
            // otherwise this cookie is too small for everyone left: skip it
        }
        return child;
    }
}` }],
      complexity: `<p><b>Time O(N log N + M log M)</b> for the two sorts, O(N + M) for the scan. <b>Space O(N + M)</b> for the copies.</p>`,
      followUps: ['Each child may take up to two cookies whose total size ≥ greed.', 'Return which cookie each content child receives.']
    }
  });

  practice.push({
    title: 'Lemonade Change',
    level: 'Easy',
    tags: ['greedy', 'simulation'],
    companies: ['Amazon', 'Apple'],
    statement: `<p>A lemonade costs $5. Customers pay one at a time with a $5, $10 or $20 bill (<code>bills[i]</code>). You start with no change. Return <code>true</code> if you can give every customer correct change.</p>`,
    constraints: `1 ≤ bills.length ≤ 10<sup>5</sup>, bills[i] ∈ {5, 10, 20}`,
    example: `${H.arr([5, 5, 5, 10, 20], { label: 'bills', hl: { 4: 'g' } })}
      <p>Output <b>true</b>: after three $5s you hold 5,5,5; the $10 takes one $5 back (hold 5,5,10); the $20 gets ${H.c('g', '$10 + $5')}. For [5, 5, 10, 10, 20] the output is <b>false</b>: the $20 arrives when you hold only two $10s.</p>`,
    brute: {
      why: `<p>For every $20 there are two ways to give change ($10+$5 or $5+$5+$5). Track the set of all reachable (fives, tens) states after each customer; it is correct but the set can grow with the number of customers. The waste: one of the two choices is always at least as good, so we only ever need one state.</p>`,
      code: { lang: 'java', code: `
        boolean bruteLemonade(int[] bills) {
            Set<Long> states = new HashSet<>();
            states.add(0L);                                 // state = fives * 1_000_000 + tens
            for (int b : bills) {
                Set<Long> next = new HashSet<>();
                for (long st : states) {
                    long f = st / 1_000_000, t = st % 1_000_000;
                    if (b == 5) next.add((f + 1) * 1_000_000 + t);
                    else if (b == 10) { if (f >= 1) next.add((f - 1) * 1_000_000 + t + 1); }
                    else {
                        if (f >= 1 && t >= 1) next.add((f - 1) * 1_000_000 + t - 1);   // $10 + $5
                        if (f >= 3) next.add((f - 3) * 1_000_000 + t);                 // $5 x 3
                    }
                }
                if (next.isEmpty()) return false;
                states = next;
            }
            return true;
        }`, alt: [
          { lang: 'python', code: `def lemonade_change(bills):
    states = {(0, 0)}                                # state = (fives, tens)
    for b in bills:
        nxt = set()
        for f, t in states:
            if b == 5:
                nxt.add((f + 1, t))
            elif b == 10:
                if f >= 1:
                    nxt.add((f - 1, t + 1))
            else:
                if f >= 1 and t >= 1:
                    nxt.add((f - 1, t - 1))          # $10 + $5
                if f >= 3:
                    nxt.add((f - 3, t))              # $5 x 3
        if not nxt:
            return False
        states = nxt
    return True` },
          { lang: 'js', code: `function lemonadeChange(bills) {
  let states = new Set([0]);                         // state = fives * 1_000_000 + tens
  for (const b of bills) {
    const next = new Set();
    for (const st of states) {
      const f = Math.floor(st / 1000000), t = st % 1000000;
      if (b === 5) next.add((f + 1) * 1000000 + t);
      else if (b === 10) { if (f >= 1) next.add((f - 1) * 1000000 + t + 1); }
      else {
        if (f >= 1 && t >= 1) next.add((f - 1) * 1000000 + t - 1);   // $10 + $5
        if (f >= 3) next.add((f - 3) * 1000000 + t);                 // $5 x 3
      }
    }
    if (next.size === 0) return false;
    states = next;
  }
  return true;
}` },
          { lang: 'cpp', code: `bool lemonadeChange(vector<int>& bills) {
    set<long long> states = {0};                     // state = fives * 1'000'000 + tens
    for (int b : bills) {
        set<long long> next;
        for (long long st : states) {
            long long f = st / 1000000, t = st % 1000000;
            if (b == 5) next.insert((f + 1) * 1000000 + t);
            else if (b == 10) { if (f >= 1) next.insert((f - 1) * 1000000 + t + 1); }
            else {
                if (f >= 1 && t >= 1) next.insert((f - 1) * 1000000 + t - 1);   // $10 + $5
                if (f >= 3) next.insert((f - 3) * 1000000 + t);                 // $5 x 3
            }
        }
        if (next.empty()) return false;
        states = next;
    }
    return true;
}` },
          { lang: 'csharp', code: `bool BruteLemonade(int[] bills)
{
    var states = new HashSet<long> { 0L };          // state = fives * 1_000_000 + tens
    foreach (int b in bills)
    {
        var next = new HashSet<long>();
        foreach (long st in states)
        {
            long f = st / 1000000, t = st % 1000000;
            if (b == 5) next.Add((f + 1) * 1000000 + t);
            else if (b == 10) { if (f >= 1) next.Add((f - 1) * 1000000 + t + 1); }
            else
            {
                if (f >= 1 && t >= 1) next.Add((f - 1) * 1000000 + t - 1);   // $10 + $5
                if (f >= 3) next.Add((f - 3) * 1000000 + t);                 // $5 x 3
            }
        }
        if (next.Count == 0) return false;
        states = next;
    }
    return true;
}` }
        ] }
    },
    mcq: {
      q: 'A customer pays $20 and you hold three $5s and one $10. Which change should you give?',
      options: ['$5 + $5 + $5', '$10 + $5', 'Either, it never matters', 'Refuse the sale'],
      answer: 1,
      explain: 'A $5 can pay change for a $10 or a $20; a $10 can only help with a $20. Spend the less useful $10 first and keep the flexible $5s.'
    },
    hints: [
      `<p><b>Aha:</b> $5 bills are the most useful (they work for both $10 and $20 customers). Whenever you have a choice, keep $5s.</p>`,
      `<p>Count only <code>fives</code> and <code>tens</code> ($20s are never given as change). For a $20, prefer $10 + $5; fall back to three $5s.</p>`,
      `<p>Edge cases: the first customer pays $10 or $20 → false immediately. Recipe: for each bill: 5 → fives++; 10 → need a five; 20 → if tens &gt; 0 and fives &gt; 0 use them, else if fives ≥ 3 use three, else false → true.</p>`
    ],
    tests: { sig: 'int[] -> bool', fn: 'lemonadeChange', cases: [
      [[[5, 5, 5, 10, 20]], true],
      [[[5, 5, 10, 10, 20]], false],
      [[[5]], true],
      [[[10]], false],
      [[[20]], false],
      [[[5, 10, 5, 20]], true],
      [[[5, 5, 5, 20]], true],
      [[[5, 5, 10, 20, 5, 5, 5, 20]], true],
      [[{$concat: [{$rep: 5, n: 50000}, {$rep: 10, n: 50000}]}], true],
      [[{$concat: [{$rep: 5, n: 3}, {$rep: 20, n: 1}, {$rep: 5, n: 49998}, {$rep: 10, n: 49998}, [10]]}], false]
    ] },
    solution: {
      approach: `<p>Simulate with two counters, always giving change with the largest bill possible. Exchange argument: any successful plan that pays a $20 with three $5s while a $10 was available can swap to $10 + $5 and still succeed, because it now holds an extra $5 instead of a $10 — and a $5 can do everything a $10 can.</p>`,
      code: `
        class Solution {
            public boolean lemonadeChange(int[] bills) {
                int fives = 0, tens = 0;
                for (int b : bills) {
                    if (b == 5) {
                        fives++;
                    } else if (b == 10) {
                        if (fives == 0) return false;
                        fives--; tens++;
                    } else {                                   // $20: change of $15
                        if (tens > 0 && fives > 0) { tens--; fives--; }   // keep the flexible $5s
                        else if (fives >= 3) fives -= 3;
                        else return false;
                    }
                }
                return true;
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.lemonadeChange(new int[]{5, 5, 5, 10, 20}));   // true
                System.out.println(s.lemonadeChange(new int[]{5, 5, 10, 10, 20}));  // false
            }
        }`,
      alt: [{ lang: 'python', code: `def lemonade_change(bills):
    fives = tens = 0
    for b in bills:
        if b == 5:
            fives += 1
        elif b == 10:
            if fives == 0:
                return False
            fives -= 1
            tens += 1
        elif tens and fives:           # $20: prefer $10 + $5, keep the flexible $5s
            tens -= 1
            fives -= 1
        elif fives >= 3:
            fives -= 3
        else:
            return False
    return True` }, { lang: 'js', code: `function lemonadeChange(bills) {
  let fives = 0, tens = 0;
  for (const b of bills) {
    if (b === 5) fives++;
    else if (b === 10) {
      if (fives === 0) return false;
      fives--; tens++;
    } else if (tens > 0 && fives > 0) { tens--; fives--; }   // $10 + $5 first
    else if (fives >= 3) fives -= 3;
    else return false;
  }
  return true;
}` }, { lang: 'cpp', code: `class Solution {
public:
    bool lemonadeChange(vector<int>& bills) {
        int fives = 0, tens = 0;
        for (int b : bills) {
            if (b == 5) fives++;
            else if (b == 10) {
                if (fives == 0) return false;
                fives--; tens++;
            } else if (tens > 0 && fives > 0) { tens--; fives--; }
            else if (fives >= 3) fives -= 3;
            else return false;
        }
        return true;
    }
};` }, { lang: 'csharp', code: `public class Solution
{
    public bool LemonadeChange(int[] bills)
    {
        int fives = 0, tens = 0;
        foreach (int b in bills)
        {
            if (b == 5)
            {
                fives++;
            }
            else if (b == 10)
            {
                if (fives == 0) return false;
                fives--; tens++;
            }
            else                                       // $20: change of $15
            {
                if (tens > 0 && fives > 0) { tens--; fives--; }   // keep the flexible $5s
                else if (fives >= 3) fives -= 3;
                else return false;
            }
        }
        return true;
    }
}` }],
      complexity: `<p><b>Time O(N)</b>, <b>Space O(1)</b>.</p>`,
      followUps: ['Prices and bills are arbitrary (e.g. coins 1, 3, 4): is greedy change still safe? (No — see the coin change topic.)', 'Return the index of the first customer you cannot serve.']
    }
  });

  practice.push({
    title: 'Maximum Units on a Truck',
    level: 'Easy',
    tags: ['greedy', 'sorting'],
    companies: ['Amazon'],
    statement: `<p><code>boxTypes[i] = [numberOfBoxes, unitsPerBox]</code>. A truck can carry at most <code>truckSize</code> boxes (any types). Return the <b>maximum total units</b> you can load.</p>`,
    constraints: `1 ≤ boxTypes.length ≤ 1000, 1 ≤ numberOfBoxes, unitsPerBox ≤ 1000, 1 ≤ truckSize ≤ 10<sup>6</sup>`,
    example: `${H.table(['type', 'boxes', 'units/box'], [['0', '1', '3'], ['1', '2', '2'], ['2', '3', '1']])}
      <p>truckSize = 4 → Output <b>8</b>: ${H.c('g', '1 box × 3 + 2 boxes × 2 + 1 box × 1')} = 3 + 4 + 1. Every box takes one slot, so take the boxes with the most units first.</p>`,
    brute: {
      why: `<p>Expand every box into its own entry and try "take or skip" for each box with at most truckSize taken. That is 2<sup>(total boxes)</sup> choices. The waste: every box costs exactly one slot, so a box with more units is always at least as good as one with fewer — there is nothing to search.</p>`,
      code: { lang: 'java', code: `
        int bruteUnits(int[][] boxTypes, int truckSize) {
            List<Integer> boxes = new ArrayList<>();
            for (int[] t : boxTypes) for (int i = 0; i < t[0]; i++) boxes.add(t[1]);   // one entry per box
            return pick(boxes, 0, truckSize);
        }

        int pick(List<Integer> boxes, int i, int left) {
            if (i == boxes.size() || left == 0) return 0;
            int skip = pick(boxes, i + 1, left);
            int take = boxes.get(i) + pick(boxes, i + 1, left - 1);
            return Math.max(skip, take);
        }`, alt: [
          { lang: 'python', code: `def maximum_units(box_types, truck_size):
    boxes = []
    for count, units in box_types:
        boxes.extend([units] * count)                # one entry per box

    def pick(i, left):
        if i == len(boxes) or left == 0:
            return 0
        skip = pick(i + 1, left)
        take = boxes[i] + pick(i + 1, left - 1)
        return max(skip, take)

    return pick(0, truck_size)` },
          { lang: 'js', code: `function maximumUnits(boxTypes, truckSize) {
  const boxes = [];
  for (const [count, units] of boxTypes)
    for (let i = 0; i < count; i++) boxes.push(units);   // one entry per box
  function pick(i, left) {
    if (i === boxes.length || left === 0) return 0;
    const skip = pick(i + 1, left);
    const take = boxes[i] + pick(i + 1, left - 1);
    return Math.max(skip, take);
  }
  return pick(0, truckSize);
}` },
          { lang: 'cpp', code: `int pick(vector<int>& boxes, int i, int left) {
    if (i == (int)boxes.size() || left == 0) return 0;
    int skip = pick(boxes, i + 1, left);
    int take = boxes[i] + pick(boxes, i + 1, left - 1);
    return max(skip, take);
}

int maximumUnits(vector<vector<int>> boxTypes, int truckSize) {
    vector<int> boxes;
    for (auto& t : boxTypes) for (int i = 0; i < t[0]; i++) boxes.push_back(t[1]);   // one entry per box
    return pick(boxes, 0, truckSize);
}` },
          { lang: 'csharp', code: `int BruteUnits(int[][] boxTypes, int truckSize)
{
    var boxes = new List<int>();
    foreach (int[] t in boxTypes) for (int i = 0; i < t[0]; i++) boxes.Add(t[1]);   // one entry per box
    return Pick(boxes, 0, truckSize);
}

int Pick(List<int> boxes, int i, int left)
{
    if (i == boxes.Count || left == 0) return 0;
    int skip = Pick(boxes, i + 1, left);
    int take = boxes[i] + Pick(boxes, i + 1, left - 1);
    return Math.Max(skip, take);
}` }
        ] }
    },
    mcq: {
      q: 'Why is greedy safe here even though boxes cannot be cut (unlike 0/1 knapsack)?',
      options: ['Because unitsPerBox ≤ 1000', 'Because every box uses exactly one slot, so no awkward leftover space can appear', 'Because the truck is large', 'It is not safe; you need DP'],
      answer: 1,
      explain: 'All "weights" are equal (1 slot). Swapping a lower-unit box in the truck for a higher-unit box outside never breaks the capacity, so best-first is optimal.'
    },
    hints: [
      `<p><b>Aha:</b> this is fractional knapsack where every item weighs exactly 1 — the ratio is simply unitsPerBox.</p>`,
      `<p>Sort box types by unitsPerBox descending, then take <code>min(left, numberOfBoxes)</code> boxes of each type until the truck is full.</p>`,
      `<p>Edge cases: truckSize larger than all boxes → take everything. Recipe: sort by units desc → for each type: take = min(left, count); units += take × perBox; left -= take; stop at 0.</p>`
    ],
    tests: { sig: 'int[][] int -> int', fn: 'maximumUnits', cases: [
      [[[[1, 3], [2, 2], [3, 1]], 4], 8],
      [[[[5, 10], [2, 5], [4, 7], [3, 9]], 10], 91],
      [[[[1, 1]], 1], 1],
      [[[[2, 5]], 10], 10],
      [[[[3, 4], [3, 4]], 5], 20],
      [[[[1, 1], [1, 1000]], 1], 1000],
      [[{$rep: [1000, 1000], n: 1000}, 1000000], 1000000000],
      [[{$rep: [1000, 1000], n: 1000}, 999999], 999999000]
    ] },
    solution: {
      approach: `<p>Sort types by units per box (descending) and fill the truck greedily. Exchange argument: any loaded box with fewer units than an unloaded box can be swapped for it, slot count unchanged, units not lower.</p>`,
      code: `
        import java.util.*;

        class Solution {
            public int maximumUnits(int[][] boxTypes, int truckSize) {
                int[][] b = boxTypes.clone();
                Arrays.sort(b, (x, y) -> Integer.compare(y[1], x[1]));   // most units per box first
                int units = 0, left = truckSize;
                for (int[] t : b) {
                    if (left == 0) break;
                    int take = Math.min(left, t[0]);
                    units += take * t[1];
                    left -= take;
                }
                return units;
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.maximumUnits(new int[][]{{1, 3}, {2, 2}, {3, 1}}, 4));             // 8
                System.out.println(s.maximumUnits(new int[][]{{5, 10}, {2, 5}, {4, 7}, {3, 9}}, 10));   // 91
            }
        }`,
      alt: [{ lang: 'python', code: `def maximum_units(box_types, truck_size):
    units, left = 0, truck_size
    for count, per_box in sorted(box_types, key=lambda t: -t[1]):   # most units per box first
        if left == 0:
            break
        take = min(left, count)
        units += take * per_box
        left -= take
    return units` }, { lang: 'js', code: `function maximumUnits(boxTypes, truckSize) {
  const b = [...boxTypes].sort((x, y) => y[1] - x[1]);   // most units per box first
  let units = 0, left = truckSize;
  for (const [count, perBox] of b) {
    if (left === 0) break;
    const take = Math.min(left, count);
    units += take * perBox;
    left -= take;
  }
  return units;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int maximumUnits(vector<vector<int>> boxTypes, int truckSize) {
        sort(boxTypes.begin(), boxTypes.end(), [](auto& x, auto& y) { return x[1] > y[1]; });
        int units = 0, left = truckSize;
        for (auto& t : boxTypes) {
            if (left == 0) break;
            int take = min(left, t[0]);
            units += take * t[1];               // ≤ 10^9 in total: fits in int
            left -= take;
        }
        return units;
    }
};` }, { lang: 'csharp', code: `using System;

public class Solution
{
    public int MaximumUnits(int[][] boxTypes, int truckSize)
    {
        int[][] b = (int[][])boxTypes.Clone();
        Array.Sort(b, (x, y) => y[1].CompareTo(x[1]));   // most units per box first
        int units = 0, left = truckSize;
        foreach (int[] t in b)
        {
            if (left == 0) break;
            int take = Math.Min(left, t[0]);
            units += take * t[1];
            left -= take;
        }
        return units;
    }
}` }],
      complexity: `<p><b>Time O(T log T)</b> for T box types; or O(T + 1000) with counting sort on unitsPerBox ≤ 1000. <b>Space O(T)</b>.</p>`,
      followUps: ['Boxes now have different sizes (weights): which problem is it, and is greedy still correct?', 'Use a counting sort since unitsPerBox ≤ 1000.']
    }
  });

  practice.push({
    title: 'Best Time to Buy and Sell Stock II',
    level: 'Easy',
    tags: ['greedy', 'array'],
    companies: ['Amazon', 'Microsoft', 'Bloomberg', 'Goldman Sachs'],
    statement: `<p><code>prices[i]</code> is a stock's price on day <code>i</code>. You may complete as many transactions as you like, but you can hold at most one share at a time (you may buy and sell on the same day). Return the <b>maximum profit</b>.</p>`,
    constraints: `1 ≤ prices.length ≤ 3·10<sup>4</sup>, 0 ≤ prices[i] ≤ 10<sup>4</sup>`,
    example: `${H.arr([7, 1, 5, 3, 6, 4], { label: 'prices', hl: { 1: 'g', 2: 'g', 3: 'g', 4: 'g' } })}
      <p>Output <b>7</b>: buy at 1, sell at 5 (+4); buy at 3, sell at 6 (+3). Equivalently, add up every day-to-day rise: ${H.c('g', '(5−1) + (6−3) = 7')}.</p>`,
    brute: {
      why: `<p>Recursion over days with a "holding / not holding" flag: each day you either do nothing or buy/sell. Without memoization this explores 2<sup>N</sup> paths. The waste: the profit of any buy-low/sell-high stretch equals the sum of its daily rises, so we can decide day by day.</p>`,
      code: { lang: 'java', code: `
        int bruteStock(int[] p, int day, boolean holding) {
            if (day == p.length) return 0;
            int best = bruteStock(p, day + 1, holding);                                  // do nothing
            if (holding) best = Math.max(best, p[day] + bruteStock(p, day + 1, false));  // sell today
            else best = Math.max(best, -p[day] + bruteStock(p, day + 1, true));          // buy today
            return best;
        }`, alt: [
          { lang: 'python', code: `def max_profit(p, day=0, holding=False):
    if day == len(p):
        return 0
    best = max_profit(p, day + 1, holding)                              # do nothing
    if holding:
        best = max(best, p[day] + max_profit(p, day + 1, False))        # sell today
    else:
        best = max(best, -p[day] + max_profit(p, day + 1, True))        # buy today
    return best` },
          { lang: 'js', code: `function maxProfit(p, day = 0, holding = false) {
  if (day === p.length) return 0;
  let best = maxProfit(p, day + 1, holding);                            // do nothing
  if (holding) best = Math.max(best, p[day] + maxProfit(p, day + 1, false)); // sell today
  else best = Math.max(best, -p[day] + maxProfit(p, day + 1, true));         // buy today
  return best;
}` },
          { lang: 'cpp', code: `int maxProfit(vector<int>& p, int day, bool holding) {
    if (day == (int)p.size()) return 0;
    int best = maxProfit(p, day + 1, holding);                          // do nothing
    if (holding) best = max(best, p[day] + maxProfit(p, day + 1, false)); // sell today
    else best = max(best, -p[day] + maxProfit(p, day + 1, true));         // buy today
    return best;
}` },
          { lang: 'csharp', code: `int BruteStock(int[] p, int day, bool holding)
{
    if (day == p.Length) return 0;
    int best = BruteStock(p, day + 1, holding);                                  // do nothing
    if (holding) best = Math.Max(best, p[day] + BruteStock(p, day + 1, false));  // sell today
    else best = Math.Max(best, -p[day] + BruteStock(p, day + 1, true));          // buy today
    return best;
}` }
        ] }
    },
    mcq: {
      q: 'Prices go 1 → 3 → 6. Which gives more profit: one trade (buy 1, sell 6) or two trades (1→3, 3→6)?',
      options: ['One trade', 'Two trades', 'They are equal (5 each)', 'Neither is allowed'],
      answer: 2,
      explain: '6 − 1 = 5 and (3 − 1) + (6 − 3) = 5. A long rise is just the sum of its daily rises — that is why summing positive differences is optimal.'
    },
    hints: [
      `<p><b>Aha:</b> any trade from day a to day b earns <code>prices[b] − prices[a]</code> = the sum of the daily differences in between.</p>`,
      `<p>So collect every positive daily difference and skip every negative one. No need to find valleys and peaks explicitly.</p>`,
      `<p>Edge cases: a single day or always-falling prices → 0. Recipe: profit = 0 → for i from 1: if prices[i] &gt; prices[i − 1] → profit += prices[i] − prices[i − 1] → return profit.</p>`
    ],
    tests: { sig: 'int[] -> int', fn: 'maxProfit', cases: [
      [[[7, 1, 5, 3, 6, 4]], 7],
      [[[1, 2, 3, 4, 5]], 4],
      [[[7, 6, 4, 3, 1]], 0],
      [[[5]], 0],
      [[[0, 10000]], 10000],
      [[[3, 3, 3]], 0],
      [[[2, 1, 2, 0, 1]], 2],
      [[{$concat: [{$range: [0, 10001, 1]}, {$range: [9999, -1, -1]}, {$range: [1, 10001, 1]}]}], 20000],
      [[{$range: [10000, 0, -1]}], 0]
    ] },
    solution: {
      approach: `<p>Bank every upward step. Any optimal set of trades consists of rising stretches, whose profit equals the sum of the positive daily differences inside them; adding every positive difference can only be ≥ that, and it is always achievable (buy at each valley, sell at each peak).</p>`,
      code: `
        class Solution {
            public int maxProfit(int[] prices) {
                int profit = 0;
                for (int i = 1; i < prices.length; i++) {
                    if (prices[i] > prices[i - 1]) {
                        profit += prices[i] - prices[i - 1];   // bank every rise
                    }
                }
                return profit;
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.maxProfit(new int[]{7, 1, 5, 3, 6, 4}));  // 7
                System.out.println(s.maxProfit(new int[]{1, 2, 3, 4, 5}));     // 4
                System.out.println(s.maxProfit(new int[]{7, 6, 4, 3, 1}));     // 0
            }
        }`,
      alt: [{ lang: 'python', code: `def max_profit(prices):
    # bank every day-to-day rise
    return sum(max(0, b - a) for a, b in zip(prices, prices[1:]))` }, { lang: 'js', code: `function maxProfit(prices) {
  let profit = 0;
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > prices[i - 1]) profit += prices[i] - prices[i - 1];   // bank every rise
  }
  return profit;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int profit = 0;
        for (size_t i = 1; i < prices.size(); i++)
            profit += max(0, prices[i] - prices[i - 1]);   // bank every rise
        return profit;
    }
};` }, { lang: 'csharp', code: `public class Solution
{
    public int MaxProfit(int[] prices)
    {
        int profit = 0;
        for (int i = 1; i < prices.Length; i++)
        {
            if (prices[i] > prices[i - 1])
            {
                profit += prices[i] - prices[i - 1];   // bank every rise
            }
        }
        return profit;
    }
}` }],
      complexity: `<p><b>Time O(N)</b>, <b>Space O(1)</b>.</p>`,
      followUps: ['Each transaction has a fee (LC 714): greedy breaks — use the two-state DP.', 'At most k transactions (LC 188): DP.', 'Cooldown of one day after selling (LC 309).']
    }
  });

  // =====================================================================
  // PRACTICE — Medium
  // =====================================================================
  practice.push({
    title: 'Non-overlapping Intervals',
    level: 'Medium',
    tags: ['greedy', 'intervals', 'sorting'],
    companies: ['Amazon', 'Google', 'Meta', 'Microsoft'],
    statement: `<p>Given an array of intervals <code>[start, end]</code>, return the <b>minimum number of intervals you need to remove</b> so that the rest do not overlap. Intervals that only touch at a point (like [1,2] and [2,3]) do <b>not</b> overlap.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, −5·10<sup>4</sup> ≤ start &lt; end ≤ 5·10<sup>4</sup>`,
    example: `${H.arr(['[1,2]', '[2,3]', '[3,4]', '[1,3]'], { label: 'intervals', hl: { 3: 'r' } })}
      <p>Output <b>1</b>: remove ${H.c('r', '[1,3]')}; the other three only touch. Keeping the most intervals = removing the fewest.</p>`,
    brute: {
      why: `<p>Try every subset to keep (2<sup>N</sup>), check all pairs for overlap, and return N − (largest valid subset). Exponential. The waste: it ignores that keeping the earliest-ending interval is always safe.</p>`,
      code: { lang: 'java', code: `
        int bruteErase(int[][] a) {
            int n = a.length, bestKeep = 0;
            for (int mask = 0; mask < (1 << n); mask++) {
                boolean ok = true;
                for (int i = 0; i < n && ok; i++)
                    for (int j = i + 1; j < n && ok; j++)
                        if ((mask >> i & 1) == 1 && (mask >> j & 1) == 1
                                && a[i][0] < a[j][1] && a[j][0] < a[i][1]) ok = false;   // real overlap
                if (ok) bestKeep = Math.max(bestKeep, Integer.bitCount(mask));
            }
            return n - bestKeep;
        }`, alt: [
          { lang: 'python', code: `def erase_overlap_intervals(a):
    n = len(a)
    best_keep = 0
    for mask in range(1 << n):
        ok = True
        for i in range(n):
            for j in range(i + 1, n):
                if ok and (mask >> i & 1) and (mask >> j & 1) \\
                        and a[i][0] < a[j][1] and a[j][0] < a[i][1]:   # real overlap
                    ok = False
        if ok:
            best_keep = max(best_keep, bin(mask).count('1'))
    return n - best_keep` },
          { lang: 'js', code: `function eraseOverlapIntervals(a) {
  const n = a.length;
  let bestKeep = 0;
  for (let mask = 0; mask < (1 << n); mask++) {
    let ok = true;
    for (let i = 0; i < n && ok; i++)
      for (let j = i + 1; j < n && ok; j++)
        if ((mask >> i & 1) === 1 && (mask >> j & 1) === 1
            && a[i][0] < a[j][1] && a[j][0] < a[i][1]) ok = false;   // real overlap
    if (ok) {
      let bits = 0;
      for (let m = mask; m > 0; m &= m - 1) bits++;
      bestKeep = Math.max(bestKeep, bits);
    }
  }
  return n - bestKeep;
}` },
          { lang: 'cpp', code: `int eraseOverlapIntervals(vector<vector<int>>& a) {
    int n = a.size(), bestKeep = 0;
    for (int mask = 0; mask < (1 << n); mask++) {
        bool ok = true;
        for (int i = 0; i < n && ok; i++)
            for (int j = i + 1; j < n && ok; j++)
                if ((mask >> i & 1) == 1 && (mask >> j & 1) == 1
                        && a[i][0] < a[j][1] && a[j][0] < a[i][1]) ok = false;   // real overlap
        if (ok) bestKeep = max(bestKeep, __builtin_popcount(mask));
    }
    return n - bestKeep;
}` },
          { lang: 'csharp', code: `int BruteErase(int[][] a)
{
    int n = a.Length, bestKeep = 0;
    for (int mask = 0; mask < (1 << n); mask++)
    {
        bool ok = true;
        for (int i = 0; i < n && ok; i++)
            for (int j = i + 1; j < n && ok; j++)
                if ((mask >> i & 1) == 1 && (mask >> j & 1) == 1
                        && a[i][0] < a[j][1] && a[j][0] < a[i][1]) ok = false;   // real overlap
        if (ok) bestKeep = Math.Max(bestKeep, BitCount(mask));
    }
    return n - bestKeep;
}
int BitCount(int x) { int c = 0; while (x != 0) { x &= x - 1; c++; } return c; }` }
        ] }
    },
    mcq: {
      q: 'Two intervals overlap and you must drop one of them. With earliest-end-first, which one survives?',
      options: ['The longer one', 'The one that starts first', 'The one that ends first', 'The one with the smaller index'],
      answer: 2,
      explain: 'Keeping the one that ends first leaves the most room for everything after it. This is activity selection; removals = N − kept.'
    },
    hints: [
      `<p><b>Aha:</b> "fewest removals" = N − "most intervals you can keep without overlap" = activity selection.</p>`,
      `<p>Sort by end. Keep an interval if its start ≥ the end of the last kept one; otherwise it is removed.</p>`,
      `<p>Touching is allowed → use <code>≥</code>. Compare ends without subtracting in Java and C++ (<code>Integer.compare</code>, <code>&lt;</code>). Recipe: sort by end → kept = 0, lastEnd = −∞ → for each: if start ≥ lastEnd {kept++; lastEnd = end} → return N − kept.</p>`
    ],
    tests: { sig: 'int[][] -> int', fn: 'eraseOverlapIntervals', cases: [
      [[[[1, 2], [2, 3], [3, 4], [1, 3]]], 1],
      [[[[1, 2], [1, 2], [1, 2]]], 2],
      [[[[1, 2], [2, 3]]], 0],
      [[[[0, 5]]], 0],
      [[[[-50000, 50000], [-1, 0], [0, 1]]], 1],
      [[[[1, 100], [11, 22], [1, 11], [2, 12]]], 2],
      [[[[-5, -3], [-4, -2], [-3, -1]]], 1],
      [[{$rep: [-50000, 50000], n: 100000}], 99999]
    ] },
    solution: {
      approach: `<p>Activity selection with earliest end first; answer is the number of intervals skipped. The "greedy stays ahead" proof from the Activity Selection topic applies unchanged.</p>`,
      code: `
        import java.util.*;

        class Solution {
            public int eraseOverlapIntervals(int[][] intervals) {
                int[][] a = intervals.clone();
                Arrays.sort(a, (x, y) -> Integer.compare(x[1], y[1]));   // earliest end first
                int kept = 0;
                long lastEnd = Long.MIN_VALUE;
                for (int[] it : a) {
                    if (it[0] >= lastEnd) {          // fits after the last kept interval
                        kept++;
                        lastEnd = it[1];
                    }
                }
                return a.length - kept;              // everything not kept is removed
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.eraseOverlapIntervals(new int[][]{{1, 2}, {2, 3}, {3, 4}, {1, 3}}));  // 1
                System.out.println(s.eraseOverlapIntervals(new int[][]{{1, 2}, {1, 2}, {1, 2}}));          // 2
            }
        }`,
      alt: [{ lang: 'python', code: `def erase_overlap_intervals(intervals):
    kept, last_end = 0, float('-inf')
    for s, e in sorted(intervals, key=lambda it: it[1]):   # earliest end first
        if s >= last_end:              # touching is fine
            kept += 1
            last_end = e
    return len(intervals) - kept` }, { lang: 'js', code: `function eraseOverlapIntervals(intervals) {
  const a = [...intervals].sort((x, y) => x[1] - y[1]);   // earliest end first
  let kept = 0, lastEnd = -Infinity;
  for (const [s, e] of a) {
    if (s >= lastEnd) { kept++; lastEnd = e; }
  }
  return a.length - kept;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int eraseOverlapIntervals(vector<vector<int>> intervals) {
        sort(intervals.begin(), intervals.end(), [](auto& x, auto& y) { return x[1] < y[1]; });
        int kept = 0;
        long long lastEnd = LLONG_MIN;
        for (auto& it : intervals)
            if (it[0] >= lastEnd) { kept++; lastEnd = it[1]; }
        return intervals.size() - kept;
    }
};` }, { lang: 'csharp', code: `using System;

public class Solution
{
    public int EraseOverlapIntervals(int[][] intervals)
    {
        int[][] a = (int[][])intervals.Clone();
        Array.Sort(a, (x, y) => x[1].CompareTo(y[1]));   // earliest end first
        int kept = 0;
        long lastEnd = long.MinValue;
        foreach (int[] it in a)
        {
            if (it[0] >= lastEnd)            // fits after the last kept interval
            {
                kept++;
                lastEnd = it[1];
            }
        }
        return a.Length - kept;              // everything not kept is removed
    }
}` }],
      complexity: `<p><b>Time O(N log N)</b>, <b>Space O(N)</b> for the copy (or O(log N) sorting in place).</p>`,
      followUps: ['Return which intervals to remove.', 'Each interval has a removal cost; minimize total cost (weighted → DP).']
    }
  });

  practice.push({
    title: 'Minimum Number of Arrows to Burst Balloons',
    level: 'Medium',
    tags: ['greedy', 'intervals', 'sorting'],
    companies: ['Amazon', 'Meta', 'Microsoft'],
    statement: `<p>Balloons are horizontal segments <code>[xstart, xend]</code> on a wall. An arrow shot straight up at position <code>x</code> bursts every balloon with <code>xstart ≤ x ≤ xend</code> (endpoints included). Return the <b>minimum number of arrows</b> to burst all balloons.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, −2<sup>31</sup> ≤ xstart &lt; xend ≤ 2<sup>31</sup> − 1`,
    example: `${H.arr(['[10,16]', '[2,8]', '[1,6]', '[7,12]'], { label: 'balloons' })}
      <p>Output <b>2</b>: an arrow at ${H.c('g', 'x = 6')} bursts [1,6] and [2,8]; an arrow at ${H.c('g', 'x = 12')} bursts [7,12] and [10,16].</p>`,
    brute: {
      why: `<p>Simulate naively: repeatedly find the unburst balloon with the smallest end (O(N) scan), shoot there, and mark every balloon it hits (another O(N) scan). Correct, but O(N²) = 10<sup>10</sup> for N = 10<sup>5</sup>. The waste: after one sort by end, a single left-to-right pass does the same work.</p>`,
      code: { lang: 'java', code: `
        int bruteArrows(int[][] points) {
            int n = points.length, arrows = 0;
            boolean[] burst = new boolean[n];
            while (true) {
                int pick = -1;                              // unburst balloon that ends first
                for (int i = 0; i < n; i++)
                    if (!burst[i] && (pick == -1 || points[i][1] < points[pick][1])) pick = i;
                if (pick == -1) return arrows;
                arrows++;
                long x = points[pick][1];                   // shoot at its right end
                for (int i = 0; i < n; i++)
                    if (points[i][0] <= x && x <= points[i][1]) burst[i] = true;
            }
        }`, alt: [
          { lang: 'python', code: `def find_min_arrow_shots(points):
    n = len(points)
    arrows = 0
    burst = [False] * n
    while True:
        pick = -1                                    # unburst balloon that ends first
        for i in range(n):
            if not burst[i] and (pick == -1 or points[i][1] < points[pick][1]):
                pick = i
        if pick == -1:
            return arrows
        arrows += 1
        x = points[pick][1]                          # shoot at its right end
        for i in range(n):
            if points[i][0] <= x <= points[i][1]:
                burst[i] = True` },
          { lang: 'js', code: `function findMinArrowShots(points) {
  const n = points.length;
  let arrows = 0;
  const burst = new Array(n).fill(false);
  while (true) {
    let pick = -1;                                   // unburst balloon that ends first
    for (let i = 0; i < n; i++)
      if (!burst[i] && (pick === -1 || points[i][1] < points[pick][1])) pick = i;
    if (pick === -1) return arrows;
    arrows++;
    const x = points[pick][1];                       // shoot at its right end
    for (let i = 0; i < n; i++)
      if (points[i][0] <= x && x <= points[i][1]) burst[i] = true;
  }
}` },
          { lang: 'cpp', code: `int findMinArrowShots(vector<vector<int>> points) {
    int n = points.size(), arrows = 0;
    vector<bool> burst(n, false);
    while (true) {
        int pick = -1;                               // unburst balloon that ends first
        for (int i = 0; i < n; i++)
            if (!burst[i] && (pick == -1 || points[i][1] < points[pick][1])) pick = i;
        if (pick == -1) return arrows;
        arrows++;
        long long x = points[pick][1];               // shoot at its right end
        for (int i = 0; i < n; i++)
            if (points[i][0] <= x && x <= points[i][1]) burst[i] = true;
    }
}` },
          { lang: 'csharp', code: `int BruteArrows(int[][] points)
{
    int n = points.Length, arrows = 0;
    bool[] burst = new bool[n];
    while (true)
    {
        int pick = -1;                              // unburst balloon that ends first
        for (int i = 0; i < n; i++)
            if (!burst[i] && (pick == -1 || points[i][1] < points[pick][1])) pick = i;
        if (pick == -1) return arrows;
        arrows++;
        long x = points[pick][1];                   // shoot at its right end
        for (int i = 0; i < n; i++)
            if (points[i][0] <= x && x <= points[i][1]) burst[i] = true;
    }
}` }
        ] }
    },
    mcq: {
      q: 'Why is the comparator <code>(a, b) -&gt; a[1] - b[1]</code> dangerous in this problem?',
      options: ['It sorts by start instead of end', 'Coordinates go down to −2<sup>31</sup> and up to 2<sup>31</sup> − 1, so the subtraction can overflow and sort wrongly', 'It is slower than a library compare function', 'It is not stable'],
      answer: 1,
      explain: 'For example 2^31−1 − (−2^31) overflows a 32-bit int and becomes negative. LeetCode includes exactly such a test. In Java use Integer.compare(a[1], b[1]); in C++ use a[1] < b[1]. In Python and JS the subtraction cannot overflow at this size.'
    },
    hints: [
      `<p><b>Aha:</b> some arrow must burst the balloon that ends first; shooting at its <b>right end</b> also hits as many other balloons as possible.</p>`,
      `<p>Sort by end. Keep the position of the last arrow; a balloon needs a new arrow only if its start is <b>strictly greater</b> than that position (touching balloons share it).</p>`,
      `<p>Overflow traps (Java and C++): compare without subtracting, and start the arrow position below every possible start (a 64-bit minimum, or −∞ in Python and JS). Recipe: sort by end → arrows = 0, at = −∞ → for each: if start &gt; at {arrows++; at = end} → return arrows.</p>`
    ],
    tests: { sig: 'int[][] -> int', fn: 'findMinArrowShots', cases: [
      [[[[10, 16], [2, 8], [1, 6], [7, 12]]], 2],
      [[[[1, 2], [3, 4], [5, 6], [7, 8]]], 4],
      [[[[1, 2], [2, 3], [3, 4], [4, 5]]], 2],
      [[[[-2147483648, 2147483647]]], 1],
      [[[[-2147483648, -2147483647], [2147483646, 2147483647]]], 2],
      [[[[1, 10], [2, 3], [4, 5]]], 2],
      [[[[0, 0], [0, 0]]], 1],
      [[{$rep: [-2147483648, 2147483647], n: 100000}], 1]
    ] },
    solution: {
      approach: `<p>Earliest end first, closed intervals. The first arrow at the smallest end bursts every balloon that starts by then; any solution's first arrow can be moved right to that end without missing anything (exchange argument).</p>`,
      code: `
        import java.util.*;

        class Solution {
            public int findMinArrowShots(int[][] points) {
                int[][] p = points.clone();
                Arrays.sort(p, (a, b) -> Integer.compare(a[1], b[1]));   // no overflow
                int arrows = 0;
                long at = Long.MIN_VALUE;            // position of the last arrow
                for (int[] b : p) {
                    if (b[0] > at) {                 // not reached by the last arrow
                        arrows++;
                        at = b[1];                   // shoot at this balloon's right end
                    }
                }
                return arrows;
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.findMinArrowShots(new int[][]{{10, 16}, {2, 8}, {1, 6}, {7, 12}}));  // 2
                System.out.println(s.findMinArrowShots(new int[][]{{1, 2}, {2, 3}, {3, 4}, {4, 5}}));     // 2
                System.out.println(s.findMinArrowShots(new int[][]{{-2147483648, 2147483647}}));         // 1
            }
        }`,
      alt: [{ lang: 'python', code: `def find_min_arrow_shots(points):
    arrows, at = 0, float('-inf')
    for s, e in sorted(points, key=lambda p: p[1]):   # earliest end first
        if s > at:                     # not reached by the last arrow
            arrows += 1
            at = e                     # shoot at this balloon's right end
    return arrows` }, { lang: 'js', code: `function findMinArrowShots(points) {
  // x[1] - y[1] is safe here: ±2^31 differences are exact in a Number
  const p = [...points].sort((x, y) => x[1] - y[1]);
  let arrows = 0, at = -Infinity;
  for (const [s, e] of p) {
    if (s > at) { arrows++; at = e; }
  }
  return arrows;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int findMinArrowShots(vector<vector<int>> points) {
        // compare with <, never a - b: that overflows int for ±2^31
        sort(points.begin(), points.end(), [](auto& a, auto& b) { return a[1] < b[1]; });
        int arrows = 0;
        long long at = LLONG_MIN;
        for (auto& b : points)
            if (b[0] > at) { arrows++; at = b[1]; }
        return arrows;
    }
};` }, { lang: 'csharp', code: `using System;

public class Solution
{
    public int FindMinArrowShots(int[][] points)
    {
        int[][] p = (int[][])points.Clone();
        Array.Sort(p, (a, b) => a[1].CompareTo(b[1]));   // CompareTo: no overflow for +-2^31
        int arrows = 0;
        long at = long.MinValue;             // position of the last arrow
        foreach (int[] b in p)
        {
            if (b[0] > at)                   // not reached by the last arrow
            {
                arrows++;
                at = b[1];                   // shoot at this balloon's right end
            }
        }
        return arrows;
    }
}` }],
      complexity: `<p><b>Time O(N log N)</b>, <b>Space O(N)</b> for the copy.</p>`,
      followUps: ['Return the arrow positions.', 'Balloons are 2D rectangles and arrows are vertical lines: does anything change?']
    }
  });

  practice.push({
    title: 'Partition Labels',
    level: 'Medium',
    tags: ['greedy', 'string', 'two pointers'],
    companies: ['Amazon', 'Meta', 'Google'],
    statement: `<p>Split string <code>s</code> into <b>as many parts as possible</b> so that each letter appears in at most one part. Return the list of part sizes (concatenating the parts in order must give <code>s</code>).</p>`,
    constraints: `1 ≤ s.length ≤ 500, s has lowercase English letters`,
    example: `<p>s = "ababcbaca<b>defegde</b>hijhklij" → Output ${H.c('g', '[9, 7, 8]')}: "ababcbaca", "defegde", "hijhklij". Every 'a' is in the first part, every 'e' in the second, and so on.</p>
      ${H.kv([['a', 'last at 8'], ['b', 'last at 5'], ['c', 'last at 7'], ['e', 'last at 15'], ['j', 'last at 23']], { label: 'last occurrence' })}`,
    brute: {
      why: `<p>For every position i, check whether you may cut right after it: no letter of s[start..i] appears again after i. Each check scans the prefix and the suffix → O(N²) (or O(N²·26)). Fine for 500, but the waste is obvious: the "furthest last occurrence so far" already answers every check in O(1).</p>`,
      code: { lang: 'java', code: `
        List<Integer> brutePartition(String s) {
            List<Integer> sizes = new ArrayList<>();
            int start = 0;
            for (int i = 0; i < s.length(); i++) {
                boolean canCut = true;                       // no letter of s[start..i] appears after i
                for (int a = start; a <= i && canCut; a++)
                    if (s.indexOf(s.charAt(a), i + 1) != -1) canCut = false;
                if (canCut) {
                    sizes.add(i - start + 1);
                    start = i + 1;
                }
            }
            return sizes;
        }`, alt: [
          { lang: 'python', code: `def partition_labels(s):
    sizes = []
    start = 0
    for i in range(len(s)):
        can_cut = True                               # no letter of s[start..i] appears after i
        for a in range(start, i + 1):
            if can_cut and s.find(s[a], i + 1) != -1:
                can_cut = False
        if can_cut:
            sizes.append(i - start + 1)
            start = i + 1
    return sizes` },
          { lang: 'js', code: `function partitionLabels(s) {
  const sizes = [];
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    let canCut = true;                               // no letter of s[start..i] appears after i
    for (let a = start; a <= i && canCut; a++)
      if (s.indexOf(s[a], i + 1) !== -1) canCut = false;
    if (canCut) {
      sizes.push(i - start + 1);
      start = i + 1;
    }
  }
  return sizes;
}` },
          { lang: 'cpp', code: `vector<int> partitionLabels(string s) {
    vector<int> sizes;
    int start = 0;
    for (int i = 0; i < (int)s.size(); i++) {
        bool canCut = true;                          // no letter of s[start..i] appears after i
        for (int a = start; a <= i && canCut; a++)
            if (s.find(s[a], i + 1) != string::npos) canCut = false;
        if (canCut) {
            sizes.push_back(i - start + 1);
            start = i + 1;
        }
    }
    return sizes;
}` },
          { lang: 'csharp', code: `List<int> BrutePartition(string s)
{
    var sizes = new List<int>();
    int start = 0;
    for (int i = 0; i < s.Length; i++)
    {
        bool canCut = true;                          // no letter of s[start..i] appears after i
        for (int a = start; a <= i && canCut; a++)
            if (s.IndexOf(s[a], i + 1) != -1) canCut = false;
        if (canCut)
        {
            sizes.Add(i - start + 1);
            start = i + 1;
        }
    }
    return sizes;
}` }
        ] }
    },
    mcq: {
      q: 'You are scanning "abac…" and the current part has seen letters whose last occurrences are at indices 2, 8 and 5. When can you close the part?',
      options: ['At index 2', 'At index 5', 'At index 8, unless a letter seen before then extends further', 'Only at the end of the string'],
      answer: 2,
      explain: 'The part must stretch to the furthest last occurrence of any letter in it. New letters met on the way may push that end further.'
    },
    hints: [
      `<p><b>Aha:</b> once a part contains letter x, it must reach x's <b>last occurrence</b>. Cut as early as that allows — cutting early gives more parts.</p>`,
      `<p>Precompute <code>last[c]</code>. Scan with <code>end = max(end, last[s[i]])</code>; when <code>i == end</code>, close the part.</p>`,
      `<p>Edge cases: one letter repeated ("aaaa" → [4]); all distinct ("abc" → [1,1,1]). Recipe: last[] → start = end = 0 → for i: end = max(end, last[s[i]]); if i == end {add end − start + 1; start = i + 1} → return sizes.</p>`
    ],
    tests: { sig: 'string -> list<int>', fn: 'partitionLabels', cases: [
      [["ababcbacadefegdehijhklij"], [9, 7, 8]],
      [["eccbbbbdec"], [10]],
      [["a"], [1]],
      [["abc"], [1, 1, 1]],
      [["aaaa"], [4]],
      [["abca"], [4]],
      [["ababcdcde"], [4, 4, 1]],
      [[{$concat: [{$rep: "ab", n: 250}]}], [500]],
      [[{$concat: [{$rep: "abcdefghijklmnopqrstuvwxy", n: 20}]}], [500]]
    ] },
    solution: {
      approach: `<p>Interval-merging greedy: each letter defines an interval [first, last]; parts are the merged groups. Scanning and extending <code>end</code> builds the groups in one pass; closing a part as soon as possible maximizes the count.</p>`,
      code: `
        import java.util.*;

        class Solution {
            public List<Integer> partitionLabels(String s) {
                int[] last = new int[26];
                for (int i = 0; i < s.length(); i++) last[s.charAt(i) - 'a'] = i;   // last occurrence
                List<Integer> sizes = new ArrayList<>();
                int start = 0, end = 0;
                for (int i = 0; i < s.length(); i++) {
                    end = Math.max(end, last[s.charAt(i) - 'a']);   // the part must reach here
                    if (i == end) {                                 // every letter so far ends by i
                        sizes.add(end - start + 1);
                        start = i + 1;
                    }
                }
                return sizes;
            }

            public static void main(String[] args) {
                Solution sol = new Solution();
                System.out.println(sol.partitionLabels("ababcbacadefegdehijhklij"));  // [9, 7, 8]
                System.out.println(sol.partitionLabels("eccbbbbdec"));                // [10]
            }
        }`,
      alt: [{ lang: 'python', code: `def partition_labels(s):
    last = {c: i for i, c in enumerate(s)}    # last occurrence of each letter
    sizes, start, end = [], 0, 0
    for i, c in enumerate(s):
        end = max(end, last[c])               # the part must reach here
        if i == end:                          # every letter so far ends by i
            sizes.append(end - start + 1)
            start = i + 1
    return sizes` }, { lang: 'js', code: `function partitionLabels(s) {
  const last = new Map();
  for (let i = 0; i < s.length; i++) last.set(s[i], i);   // last occurrence
  const sizes = [];
  let start = 0, end = 0;
  for (let i = 0; i < s.length; i++) {
    end = Math.max(end, last.get(s[i]));
    if (i === end) { sizes.push(end - start + 1); start = i + 1; }
  }
  return sizes;
}` }, { lang: 'cpp', code: `class Solution {
public:
    vector<int> partitionLabels(string s) {
        int last[26] = {};
        for (int i = 0; i < (int) s.size(); i++) last[s[i] - 'a'] = i;
        vector<int> sizes;
        int start = 0, end = 0;
        for (int i = 0; i < (int) s.size(); i++) {
            end = max(end, last[s[i] - 'a']);
            if (i == end) { sizes.push_back(end - start + 1); start = i + 1; }
        }
        return sizes;
    }
};` }, { lang: 'csharp', code: `using System;
using System.Collections.Generic;

public class Solution
{
    public IList<int> PartitionLabels(string s)
    {
        int[] last = new int[26];
        for (int i = 0; i < s.Length; i++) last[s[i] - 'a'] = i;   // last occurrence
        var sizes = new List<int>();
        int start = 0, end = 0;
        for (int i = 0; i < s.Length; i++)
        {
            end = Math.Max(end, last[s[i] - 'a']);          // the part must reach here
            if (i == end)                                   // every letter so far ends by i
            {
                sizes.Add(end - start + 1);
                start = i + 1;
            }
        }
        return sizes;
    }
}` }],
      complexity: `<p><b>Time O(N)</b>, <b>Space O(1)</b> (26 counters).</p>`,
      followUps: ['Return the parts as strings.', 'Minimize the size of the largest part instead (different problem: binary search + check).']
    }
  });

  practice.push({
    title: 'Task Scheduler',
    level: 'Medium',
    tags: ['greedy', 'counting', 'heap'],
    companies: ['Meta', 'Amazon', 'Microsoft', 'Uber'],
    statement: `<p>A CPU runs tasks labeled 'A' to 'Z'. Each task takes one time unit; in each unit the CPU runs one task or stays idle. Two runs of the <b>same</b> task must be separated by at least <code>n</code> units. Return the <b>minimum number of units</b> to finish all tasks (in any order).</p>`,
    constraints: `1 ≤ tasks.length ≤ 10<sup>4</sup>, 0 ≤ n ≤ 100`,
    example: `${H.arr(['A', 'A', 'A', 'B', 'B', 'B'], { label: 'tasks' })}
      <p>n = 2 → Output <b>8</b>: ${H.c('g', 'A B idle A B idle A B')}. The three A's need two gaps of length 2 between them; B fills one slot of each gap.</p>`,
    brute: {
      why: `<p>Simulate time unit by unit: each unit, scan all 26 letters and run the ready task with the most copies left (or idle). Correct, but the time can be up to ~10<sup>6</sup> units × 26 letters. The waste: the answer is fully determined by the most frequent count, so a formula gives it in O(N).</p>`,
      code: { lang: 'java', code: `
        int simulate(char[] tasks, int n) {
            int[] freq = new int[26];
            for (char t : tasks) freq[t - 'A']++;
            int[] readyAt = new int[26];                 // earliest time each letter may run again
            int done = 0, time = 0;
            while (done < tasks.length) {
                int pick = -1;                           // ready letter with the most copies left
                for (int c = 0; c < 26; c++)
                    if (freq[c] > 0 && readyAt[c] <= time && (pick == -1 || freq[c] > freq[pick])) pick = c;
                if (pick != -1) {
                    freq[pick]--;
                    readyAt[pick] = time + n + 1;
                    done++;
                }
                time++;                                  // ran a task or stayed idle
            }
            return time;
        }`, alt: [
          { lang: 'python', code: `def least_interval(tasks, n):
    freq = [0] * 26
    for t in tasks:
        freq[ord(t) - ord('A')] += 1
    ready_at = [0] * 26                              # earliest time each letter may run again
    done = time = 0
    while done < len(tasks):
        pick = -1                                    # ready letter with the most copies left
        for c in range(26):
            if freq[c] > 0 and ready_at[c] <= time and (pick == -1 or freq[c] > freq[pick]):
                pick = c
        if pick != -1:
            freq[pick] -= 1
            ready_at[pick] = time + n + 1
            done += 1
        time += 1                                    # ran a task or stayed idle
    return time` },
          { lang: 'js', code: `function leastInterval(tasks, n) {
  const freq = new Array(26).fill(0);
  for (const t of tasks) freq[t.charCodeAt(0) - 65]++;
  const readyAt = new Array(26).fill(0);             // earliest time each letter may run again
  let done = 0, time = 0;
  while (done < tasks.length) {
    let pick = -1;                                   // ready letter with the most copies left
    for (let c = 0; c < 26; c++)
      if (freq[c] > 0 && readyAt[c] <= time && (pick === -1 || freq[c] > freq[pick])) pick = c;
    if (pick !== -1) {
      freq[pick]--;
      readyAt[pick] = time + n + 1;
      done++;
    }
    time++;                                          // ran a task or stayed idle
  }
  return time;
}` },
          { lang: 'cpp', code: `int leastInterval(vector<char>& tasks, int n) {
    int freq[26] = {0};
    for (char t : tasks) freq[t - 'A']++;
    int readyAt[26] = {0};                           // earliest time each letter may run again
    int done = 0, time = 0;
    while (done < (int)tasks.size()) {
        int pick = -1;                               // ready letter with the most copies left
        for (int c = 0; c < 26; c++)
            if (freq[c] > 0 && readyAt[c] <= time && (pick == -1 || freq[c] > freq[pick])) pick = c;
        if (pick != -1) {
            freq[pick]--;
            readyAt[pick] = time + n + 1;
            done++;
        }
        time++;                                      // ran a task or stayed idle
    }
    return time;
}` },
          { lang: 'csharp', code: `int Simulate(char[] tasks, int n)
{
    int[] freq = new int[26];
    foreach (char t in tasks) freq[t - 'A']++;
    int[] readyAt = new int[26];                 // earliest time each letter may run again
    int done = 0, time = 0;
    while (done < tasks.Length)
    {
        int pick = -1;                           // ready letter with the most copies left
        for (int c = 0; c < 26; c++)
            if (freq[c] > 0 && readyAt[c] <= time && (pick == -1 || freq[c] > freq[pick])) pick = c;
        if (pick != -1)
        {
            freq[pick]--;
            readyAt[pick] = time + n + 1;
            done++;
        }
        time++;                                  // ran a task or stayed idle
    }
    return time;
}` }
        ] }
    },
    mcq: {
      q: 'tasks = A×4, B×4, C×1, n = 3. What is the answer?',
      options: ['9', '14', '15', '16'],
      answer: 1,
      explain: 'maxFreq = 4, two letters have it: (4 − 1)·(3 + 1) + 2 = 14. Total tasks = 9 &lt; 14, so 14. Layout: A B C _ A B _ _ A B _ _ A B.'
    },
    hints: [
      `<p><b>Aha:</b> the most frequent task decides the skeleton: it needs <code>maxF − 1</code> full blocks of length <code>n + 1</code>, then one final row.</p>`,
      `<p>The final row holds every task that also has frequency maxF (<code>countMax</code>). So the skeleton length is <code>(maxF − 1)·(n + 1) + countMax</code>.</p>`,
      `<p>If there are so many different tasks that idle slots disappear, the answer is just <code>tasks.length</code>. Recipe: count → maxF, countMax → return max(tasks.length, (maxF − 1)(n + 1) + countMax).</p>`
    ],
    tests: { sig: 'char[] int -> int', fn: 'leastInterval', cases: [
      [[["A", "A", "A", "B", "B", "B"], 2], 8],
      [[["A", "A", "A", "B", "B", "B"], 0], 6],
      [[["A", "A", "A", "A", "B", "B", "B", "B", "C"], 3], 14],
      [[["A"], 100], 1],
      [[["A", "B", "C", "D", "E"], 4], 5],
      [[["A", "A", "A", "B", "B", "B", "C", "C", "C", "D", "D", "E"], 2], 12],
      [[["A", "A", "A", "A", "A", "A", "B", "C", "D", "E", "F", "G"], 2], 16],
      [[{$rep: "A", n: 10000}, 100], 1009900],
      [[{$concat: [{$rep: "A", n: 385}, {$rep: "B", n: 385}, {$rep: "C", n: 385}, {$rep: "D", n: 385}, {$rep: "E", n: 385}, {$rep: "F", n: 385}, {$rep: "G", n: 385}, {$rep: "H", n: 385}, {$rep: "I", n: 385}, {$rep: "J", n: 385}, {$rep: "K", n: 385}, {$rep: "L", n: 385}, {$rep: "M", n: 385}, {$rep: "N", n: 385}, {$rep: "O", n: 385}, {$rep: "P", n: 385}, {$rep: "Q", n: 384}, {$rep: "R", n: 384}, {$rep: "S", n: 384}, {$rep: "T", n: 384}, {$rep: "U", n: 384}, {$rep: "V", n: 384}, {$rep: "W", n: 384}, {$rep: "X", n: 384}, {$rep: "Y", n: 384}, {$rep: "Z", n: 384}]}, 25], 10000]
    ] },
    solution: {
      approach: `<p>Counting greedy. The lower bound <code>(maxF − 1)(n + 1) + countMax</code> comes from the most frequent tasks; filling the gaps with the remaining tasks round-robin achieves it whenever there are enough idle slots, otherwise no idling is needed at all and the answer is the number of tasks.</p>`,
      code: `
        class Solution {
            public int leastInterval(char[] tasks, int n) {
                int[] freq = new int[26];
                for (char t : tasks) freq[t - 'A']++;
                int maxF = 0, countMax = 0;
                for (int f : freq) maxF = Math.max(maxF, f);
                for (int f : freq) if (f == maxF) countMax++;
                // (maxF - 1) blocks of length n + 1, plus a final row of the most frequent tasks
                int frame = (maxF - 1) * (n + 1) + countMax;
                return Math.max(tasks.length, frame);     // no idle needed if tasks overflow the frame
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.leastInterval("AAABBB".toCharArray(), 2));        // 8
                System.out.println(s.leastInterval("AAABBB".toCharArray(), 0));        // 6
                System.out.println(s.leastInterval("AAAABBBBC".toCharArray(), 3));     // 14
            }
        }`,
      alt: [{ lang: 'python', code: `from collections import Counter

def least_interval(tasks, n):
    freq = Counter(tasks)
    max_f = max(freq.values())
    count_max = sum(1 for f in freq.values() if f == max_f)
    # (max_f - 1) blocks of length n + 1, plus a last row of the most frequent tasks
    return max(len(tasks), (max_f - 1) * (n + 1) + count_max)` }, { lang: 'js', code: `function leastInterval(tasks, n) {
  const freq = new Array(26).fill(0);
  for (const t of tasks) freq[t.charCodeAt(0) - 65]++;
  const maxF = Math.max(...freq);
  const countMax = freq.filter((f) => f === maxF).length;
  return Math.max(tasks.length, (maxF - 1) * (n + 1) + countMax);
}` }, { lang: 'cpp', code: `class Solution {
public:
    int leastInterval(vector<char>& tasks, int n) {
        int freq[26] = {};
        for (char t : tasks) freq[t - 'A']++;
        int maxF = *max_element(freq, freq + 26);
        int countMax = count(freq, freq + 26, maxF);
        return max((int) tasks.size(), (maxF - 1) * (n + 1) + countMax);
    }
};` }, { lang: 'csharp', code: `using System;

public class Solution
{
    public int LeastInterval(char[] tasks, int n)
    {
        int[] freq = new int[26];
        foreach (char t in tasks) freq[t - 'A']++;
        int maxF = 0, countMax = 0;
        foreach (int f in freq) maxF = Math.Max(maxF, f);
        foreach (int f in freq) if (f == maxF) countMax++;
        // (maxF - 1) blocks of length n + 1, plus a final row of the most frequent tasks
        int frame = (maxF - 1) * (n + 1) + countMax;
        return Math.Max(tasks.Length, frame);     // no idle needed if tasks overflow the frame
    }
}` }],
      complexity: `<p><b>Time O(N)</b>, <b>Space O(1)</b> (26 counters).</p>`,
      followUps: ['Output an actual valid schedule (max-heap + cooldown queue).', 'Tasks must run in the given order (LC 2365): simulate with a map of next allowed times.']
    }
  });

  practice.push({
    title: 'Boats to Save People',
    level: 'Medium',
    tags: ['greedy', 'two pointers', 'sorting'],
    companies: ['Amazon', 'Google', 'Microsoft'],
    statement: `<p><code>people[i]</code> is the weight of person i. Every boat carries <b>at most two people</b> with total weight ≤ <code>limit</code>. Every person weighs at most <code>limit</code>. Return the <b>minimum number of boats</b> to carry everyone.</p>`,
    constraints: `1 ≤ N ≤ 5·10<sup>4</sup>, 1 ≤ people[i] ≤ limit ≤ 3·10<sup>4</sup>`,
    example: `${H.arr([3, 2, 2, 1], { label: 'people' })}
      <p>limit = 3 → Output <b>3</b>: boats ${H.c('g', '(1, 2), (2), (3)')}. Sorted [1, 2, 2, 3]: the heaviest (3) cannot share with anyone; then 2 + 1 = 3 fits; the last 2 goes alone.</p>`,
    brute: {
      why: `<p>Take the first person without a boat and try every partner (or nobody), recursively. That explores all matchings — exponential. The waste: the heaviest person should simply try the lightest; if even the lightest does not fit, nobody does.</p>`,
      code: { lang: 'java', code: `
        int bruteBoats(int[] p, int limit, boolean[] used) {
            int first = -1;
            for (int i = 0; i < p.length; i++) if (!used[i]) { first = i; break; }
            if (first == -1) return 0;                          // everyone is on a boat
            used[first] = true;
            int best = 1 + bruteBoats(p, limit, used);          // rides alone
            for (int j = first + 1; j < p.length; j++) {
                if (!used[j] && p[first] + p[j] <= limit) {     // shares with j
                    used[j] = true;
                    best = Math.min(best, 1 + bruteBoats(p, limit, used));
                    used[j] = false;
                }
            }
            used[first] = false;
            return best;
        }`, alt: [
          { lang: 'python', code: `def num_rescue_boats(p, limit):
    used = [False] * len(p)

    def solve():
        first = -1
        for i in range(len(p)):
            if not used[i]:
                first = i
                break
        if first == -1:
            return 0                                 # everyone is on a boat
        used[first] = True
        best = 1 + solve()                           # rides alone
        for j in range(first + 1, len(p)):
            if not used[j] and p[first] + p[j] <= limit:   # shares with j
                used[j] = True
                best = min(best, 1 + solve())
                used[j] = False
        used[first] = False
        return best

    return solve()` },
          { lang: 'js', code: `function numRescueBoats(p, limit) {
  const used = new Array(p.length).fill(false);
  function solve() {
    let first = -1;
    for (let i = 0; i < p.length; i++) if (!used[i]) { first = i; break; }
    if (first === -1) return 0;                      // everyone is on a boat
    used[first] = true;
    let best = 1 + solve();                          // rides alone
    for (let j = first + 1; j < p.length; j++) {
      if (!used[j] && p[first] + p[j] <= limit) {    // shares with j
        used[j] = true;
        best = Math.min(best, 1 + solve());
        used[j] = false;
      }
    }
    used[first] = false;
    return best;
  }
  return solve();
}` },
          { lang: 'cpp', code: `int solveBoats(vector<int>& p, int limit, vector<bool>& used) {
    int first = -1;
    for (int i = 0; i < (int)p.size(); i++) if (!used[i]) { first = i; break; }
    if (first == -1) return 0;                       // everyone is on a boat
    used[first] = true;
    int best = 1 + solveBoats(p, limit, used);       // rides alone
    for (int j = first + 1; j < (int)p.size(); j++) {
        if (!used[j] && p[first] + p[j] <= limit) {  // shares with j
            used[j] = true;
            best = min(best, 1 + solveBoats(p, limit, used));
            used[j] = false;
        }
    }
    used[first] = false;
    return best;
}

int numRescueBoats(vector<int> p, int limit) {
    vector<bool> used(p.size(), false);
    return solveBoats(p, limit, used);
}` },
          { lang: 'csharp', code: `int BruteBoats(int[] p, int limit, bool[] used)
{
    int first = -1;
    for (int i = 0; i < p.Length; i++) if (!used[i]) { first = i; break; }
    if (first == -1) return 0;                          // everyone is on a boat
    used[first] = true;
    int best = 1 + BruteBoats(p, limit, used);          // rides alone
    for (int j = first + 1; j < p.Length; j++)
    {
        if (!used[j] && p[first] + p[j] <= limit)       // shares with j
        {
            used[j] = true;
            best = Math.Min(best, 1 + BruteBoats(p, limit, used));
            used[j] = false;
        }
    }
    used[first] = false;
    return best;
}` }
        ] }
    },
    mcq: {
      q: 'Sorted weights, the heaviest person cannot share a boat with the lightest person. What follows?',
      options: ['Try the second lightest', 'The heaviest must go alone — nobody else is lighter than the lightest', 'Put the two lightest together', 'The answer is −1'],
      answer: 1,
      explain: 'If heaviest + lightest > limit, then heaviest + anyone > limit. Send the heaviest alone and move on.'
    },
    hints: [
      `<p><b>Aha:</b> the heaviest person needs a boat now. The best partner to try is the lightest person — the one most likely to fit, and the least "useful" for anyone else.</p>`,
      `<p>Sort, put pointers at both ends. If <code>p[i] + p[j] ≤ limit</code>, both board (i++); the heaviest always boards (j−−); count a boat.</p>`,
      `<p>Loop while <code>i ≤ j</code> so a single person left in the middle still gets a boat. Recipe: sort → i = 0, j = n − 1 → while i ≤ j: if p[i] + p[j] ≤ limit → i++; j−−; boats++ → return boats.</p>`
    ],
    tests: { sig: 'int[] int -> int', fn: 'numRescueBoats', cases: [
      [[[3, 2, 2, 1], 3], 3],
      [[[3, 5, 3, 4], 5], 4],
      [[[1, 2], 3], 1],
      [[[5], 5], 1],
      [[[1, 1, 1, 1], 2], 2],
      [[[2, 4, 1, 3, 5], 5], 3],
      [[[3, 3, 3], 6], 2],
      [[{$rep: 30000, n: 50000}, 30000], 50000],
      [[{$rep: 15000, n: 50000}, 30000], 25000]
    ] },
    solution: {
      approach: `<p>Two pointers on sorted weights: the heaviest person H always leaves now, taking the lightest L along when they fit.</p>
        <p><b>Exchange argument.</b> If H + L &gt; limit, H cannot share with anyone, so every plan sends H alone — same as greedy. If H + L ≤ limit, take any optimal plan where L is not with H. If H's boat-mate is X and L's is Y, swap L and X: (H, L) fits because L ≤ X, and (X, Y) fits because Y ≤ H gives X + Y ≤ X + H ≤ limit. If H or L was alone, moving L into H's boat leaves the others alone — still valid. The boat count never increases, so some optimal plan matches greedy's first boat; repeat on the rest.</p>`,
      code: `
        import java.util.*;

        class Solution {
            public int numRescueBoats(int[] people, int limit) {
                int[] p = people.clone();
                Arrays.sort(p);
                int i = 0, j = p.length - 1, boats = 0;
                while (i <= j) {
                    if (p[i] + p[j] <= limit) i++;   // lightest rides with the heaviest
                    j--;                             // heaviest always leaves on this boat
                    boats++;
                }
                return boats;
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.numRescueBoats(new int[]{3, 2, 2, 1}, 3));  // 3
                System.out.println(s.numRescueBoats(new int[]{3, 5, 3, 4}, 5));  // 4
                System.out.println(s.numRescueBoats(new int[]{1, 2}, 3));        // 1
            }
        }`,
      alt: [{ lang: 'python', code: `def num_rescue_boats(people, limit):
    p = sorted(people)
    i, j, boats = 0, len(p) - 1, 0
    while i <= j:
        if p[i] + p[j] <= limit:   # lightest rides with the heaviest
            i += 1
        j -= 1                     # heaviest always leaves on this boat
        boats += 1
    return boats` }, { lang: 'js', code: `function numRescueBoats(people, limit) {
  const p = Int32Array.from(people).sort();   // numeric sort
  let i = 0, j = p.length - 1, boats = 0;
  while (i <= j) {
    if (p[i] + p[j] <= limit) i++;
    j--;
    boats++;
  }
  return boats;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int numRescueBoats(vector<int> people, int limit) {
        sort(people.begin(), people.end());
        int i = 0, j = people.size() - 1, boats = 0;
        while (i <= j) {
            if (people[i] + people[j] <= limit) i++;
            j--;
            boats++;
        }
        return boats;
    }
};` }, { lang: 'csharp', code: `using System;

public class Solution
{
    public int NumRescueBoats(int[] people, int limit)
    {
        int[] p = (int[])people.Clone();
        Array.Sort(p);
        int i = 0, j = p.Length - 1, boats = 0;
        while (i <= j)
        {
            if (p[i] + p[j] <= limit) i++;   // lightest rides with the heaviest
            j--;                             // heaviest always leaves on this boat
            boats++;
        }
        return boats;
    }
}` }],
      complexity: `<p><b>Time O(N log N)</b> (counting sort makes it O(N + limit)). <b>Space O(N)</b> for the copy.</p>`,
      followUps: ['Boats can carry up to 3 people: why does the two-pointer greedy stop being obviously correct?', 'Weights ≤ 3·10<sup>4</sup>: replace the sort with counting sort.']
    }
  });

  practice.push({
    title: 'Two City Scheduling',
    level: 'Medium',
    tags: ['greedy', 'sorting', 'exchange argument'],
    companies: ['Bloomberg', 'Amazon'],
    statement: `<p>A company will interview <code>2n</code> people. <code>costs[i] = [aCost, bCost]</code> is the cost of flying person i to city A or to city B. Exactly <code>n</code> people must go to each city. Return the <b>minimum total cost</b>.</p>`,
    constraints: `2 ≤ 2n ≤ 100, 1 ≤ aCost, bCost ≤ 1000`,
    example: `${H.table(['person', 'A', 'B', 'A − B'], [['0', '10', '20', '−10'], ['1', '30', '200', H.c('g', '−170')], ['2', '400', '50', H.c('r', '350')], ['3', '30', '20', '10']])}
      <p>Output <b>110</b>: persons 1 and 0 (most negative A − B) fly to ${H.c('g', 'A: 30 + 10')}, persons 3 and 2 fly to ${H.c('b', 'B: 20 + 50')}.</p>`,
    brute: {
      why: `<p>Try every way to choose which n people go to A: C(2n, n) subsets — for 2n = 100 that is about 10<sup>29</sup>. The waste: the only thing that matters about a person is how much cheaper A is than B (A − B).</p>`,
      code: { lang: 'java', code: `
        int bruteTwoCity(int[][] costs) {
            int m = costs.length, n = m / 2, best = Integer.MAX_VALUE;
            for (int mask = 0; mask < (1 << m); mask++) {
                if (Integer.bitCount(mask) != n) continue;      // exactly n people to city A
                int total = 0;
                for (int i = 0; i < m; i++) total += ((mask >> i) & 1) == 1 ? costs[i][0] : costs[i][1];
                best = Math.min(best, total);
            }
            return best;
        }`, alt: [
          { lang: 'python', code: `def two_city_sched_cost(costs):
    m = len(costs)
    n = m // 2
    best = float('inf')
    for mask in range(1 << m):
        if bin(mask).count('1') != n:                # exactly n people to city A
            continue
        total = 0
        for i in range(m):
            total += costs[i][0] if (mask >> i) & 1 else costs[i][1]
        best = min(best, total)
    return best` },
          { lang: 'js', code: `function twoCitySchedCost(costs) {
  const m = costs.length, n = m / 2;
  let best = Infinity;
  for (let mask = 0; mask < (1 << m); mask++) {
    let bits = 0;
    for (let x = mask; x > 0; x &= x - 1) bits++;
    if (bits !== n) continue;                        // exactly n people to city A
    let total = 0;
    for (let i = 0; i < m; i++) total += ((mask >> i) & 1) === 1 ? costs[i][0] : costs[i][1];
    best = Math.min(best, total);
  }
  return best;
}` },
          { lang: 'cpp', code: `int twoCitySchedCost(vector<vector<int>> costs) {
    int m = costs.size(), n = m / 2, best = INT_MAX;
    for (int mask = 0; mask < (1 << m); mask++) {
        if (__builtin_popcount(mask) != n) continue; // exactly n people to city A
        int total = 0;
        for (int i = 0; i < m; i++) total += ((mask >> i) & 1) == 1 ? costs[i][0] : costs[i][1];
        best = min(best, total);
    }
    return best;
}` },
          { lang: 'csharp', code: `int BruteTwoCity(int[][] costs)
{
    int m = costs.Length, n = m / 2, best = int.MaxValue;
    for (int mask = 0; mask < (1 << m); mask++)
    {
        if (BitCount(mask) != n) continue;              // exactly n people to city A
        int total = 0;
        for (int i = 0; i < m; i++) total += ((mask >> i) & 1) == 1 ? costs[i][0] : costs[i][1];
        best = Math.Min(best, total);
    }
    return best;
}
int BitCount(int x) { int c = 0; while (x != 0) { x &= x - 1; c++; } return c; }` }
        ] }
    },
    mcq: {
      q: 'Imagine everyone first flies to B. Sending person i to A instead changes the cost by aCost − bCost. Which n people should switch to A?',
      options: ['The n with the smallest aCost', 'The n with the smallest (aCost − bCost)', 'The n with the largest bCost', 'Any n people'],
      answer: 1,
      explain: 'Total = ΣbCost + Σ over A-people of (aCost − bCost). Minimizing it means choosing the n most negative differences.'
    },
    hints: [
      `<p><b>Aha:</b> start from "everyone flies to B". Moving person i to A adds <code>a<sub>i</sub> − b<sub>i</sub></code>. You must move exactly n people.</p>`,
      `<p>Sort by <code>a − b</code> ascending; the first n go to A, the rest to B.</p>`,
      `<p>Exchange check: if someone with a larger a − b is in A while someone with a smaller one is in B, swapping them lowers the cost. Recipe: sort by a − b → sum a for first half, b for second half.</p>`
    ],
    tests: { sig: 'int[][] -> int', fn: 'twoCitySchedCost', cases: [
      [[[[10, 20], [30, 200], [400, 50], [30, 20]]], 110],
      [[[[1, 2], [3, 4]]], 5],
      [[[[259, 770], [448, 54], [926, 667], [184, 139], [840, 118], [577, 469]]], 1859],
      [[[[515, 563], [451, 713], [537, 709], [343, 819], [855, 779], [457, 60], [650, 359], [631, 42]]], 3086],
      [[[[5, 5], [5, 5]]], 10],
      [[[[1000, 1], [1000, 1]]], 1001],
      [[{$rep: [1000, 1], n: 100}], 50050],
      [[{$concat: [{$rep: [1, 1000], n: 50}, {$rep: [1000, 1], n: 50}]}], 100]
    ] },
    solution: {
      approach: `<p>Rewrite the cost as Σb + Σ<sub>A</sub>(a − b); choose the n smallest differences. A swap of a wrongly placed pair changes the total by (smaller diff − larger diff) ≤ 0, so the sorted split is optimal.</p>`,
      code: `
        import java.util.*;

        class Solution {
            public int twoCitySchedCost(int[][] costs) {
                int[][] c = costs.clone();
                // most "A-friendly" first: smallest (aCost - bCost); values ≤ 1000 so no overflow
                Arrays.sort(c, (x, y) -> Integer.compare(x[0] - x[1], y[0] - y[1]));
                int n = c.length / 2, total = 0;
                for (int i = 0; i < c.length; i++) total += i < n ? c[i][0] : c[i][1];
                return total;
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.twoCitySchedCost(new int[][]{{10, 20}, {30, 200}, {400, 50}, {30, 20}}));  // 110
            }
        }`,
      alt: [{ lang: 'python', code: `def two_city_sched_cost(costs):
    c = sorted(costs, key=lambda x: x[0] - x[1])   # most "A-friendly" first
    n = len(c) // 2
    return sum(a for a, _ in c[:n]) + sum(b for _, b in c[n:])` }, { lang: 'js', code: `function twoCitySchedCost(costs) {
  const c = [...costs].sort((x, y) => (x[0] - x[1]) - (y[0] - y[1]));
  const n = c.length / 2;
  let total = 0;
  c.forEach(([a, b], i) => { total += i < n ? a : b; });
  return total;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int twoCitySchedCost(vector<vector<int>> costs) {
        sort(costs.begin(), costs.end(), [](auto& x, auto& y) { return x[0] - x[1] < y[0] - y[1]; });
        int n = costs.size() / 2, total = 0;
        for (int i = 0; i < (int) costs.size(); i++) total += i < n ? costs[i][0] : costs[i][1];
        return total;
    }
};` }, { lang: 'csharp', code: `using System;

public class Solution
{
    public int TwoCitySchedCost(int[][] costs)
    {
        int[][] c = (int[][])costs.Clone();
        // most "A-friendly" first: smallest (aCost - bCost); values <= 1000 so no overflow
        Array.Sort(c, (x, y) => (x[0] - x[1]).CompareTo(y[0] - y[1]));
        int n = c.Length / 2, total = 0;
        for (int i = 0; i < c.Length; i++) total += i < n ? c[i][0] : c[i][1];
        return total;
    }
}` }],
      complexity: `<p><b>Time O(N log N)</b> (quickselect on the differences gives O(N)). <b>Space O(N)</b>.</p>`,
      followUps: ['Three cities with n people each: greedy no longer works — min-cost flow or DP.', 'City A can take at most k people (not exactly n).']
    }
  });

  practice.push({
    title: 'Largest Number',
    level: 'Medium',
    tags: ['greedy', 'sorting', 'custom comparator', 'string'],
    companies: ['Amazon', 'Microsoft', 'Goldman Sachs', 'Zoho'],
    statement: `<p>Given a list of non-negative integers <code>nums</code>, arrange them so they form the <b>largest number</b> and return it as a string (the result may be huge).</p>`,
    constraints: `1 ≤ nums.length ≤ 100, 0 ≤ nums[i] ≤ 10<sup>9</sup>`,
    example: `${H.arr([3, 30, 34, 5, 9], { label: 'nums' })}
      <p>Output ${H.c('g', '"9534330"')}. Note "3" goes before "30" because "330" &gt; "303". A plain descending string sort ranks "30" above "3", which is wrong, and a numeric sort is wrong too.</p>`,
    brute: {
      why: `<p>Try all N! orders, build each string, keep the largest (all have the same length, so string comparison = numeric comparison). 100! orders is impossible. The waste: the best relative order of any two numbers can be decided by looking at just those two.</p>`,
      code: { lang: 'java', code: `
        String best;

        String bruteLargest(int[] nums) {
            best = "";
            perm(nums, new boolean[nums.length], 0, "");
            return best.startsWith("0") ? "0" : best;
        }

        void perm(int[] nums, boolean[] used, int placed, String cur) {
            if (placed == nums.length) {
                if (cur.compareTo(best) > 0) best = cur;     // same length: lexicographic = numeric
                return;
            }
            for (int i = 0; i < nums.length; i++) {
                if (used[i]) continue;
                used[i] = true;
                perm(nums, used, placed + 1, cur + nums[i]);
                used[i] = false;
            }
        }`, alt: [
          { lang: 'python', code: `def largest_number(nums):
    best = ""

    def perm(used, placed, cur):
        nonlocal best
        if placed == len(nums):
            if cur > best:                           # same length: lexicographic = numeric
                best = cur
            return
        for i in range(len(nums)):
            if used[i]:
                continue
            used[i] = True
            perm(used, placed + 1, cur + str(nums[i]))
            used[i] = False

    perm([False] * len(nums), 0, "")
    return "0" if best.startswith("0") else best` },
          { lang: 'js', code: `function largestNumber(nums) {
  let best = "";
  function perm(used, placed, cur) {
    if (placed === nums.length) {
      if (cur > best) best = cur;                    // same length: lexicographic = numeric
      return;
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      perm(used, placed + 1, cur + nums[i]);
      used[i] = false;
    }
  }
  perm(new Array(nums.length).fill(false), 0, "");
  return best.startsWith("0") ? "0" : best;
}` },
          { lang: 'cpp', code: `void perm(vector<int>& nums, vector<bool>& used, int placed, string cur, string& best) {
    if (placed == (int)nums.size()) {
        if (cur > best) best = cur;                  // same length: lexicographic = numeric
        return;
    }
    for (int i = 0; i < (int)nums.size(); i++) {
        if (used[i]) continue;
        used[i] = true;
        perm(nums, used, placed + 1, cur + to_string(nums[i]), best);
        used[i] = false;
    }
}

string largestNumber(vector<int>& nums) {
    string best = "";
    vector<bool> used(nums.size(), false);
    perm(nums, used, 0, "", best);
    return best[0] == '0' ? "0" : best;
}` },
          { lang: 'csharp', code: `string best;

string BruteLargest(int[] nums)
{
    best = "";
    Perm(nums, new bool[nums.Length], 0, "");
    return best.StartsWith("0") ? "0" : best;
}

void Perm(int[] nums, bool[] used, int placed, string cur)
{
    if (placed == nums.Length)
    {
        if (string.CompareOrdinal(cur, best) > 0) best = cur;     // same length: lexicographic = numeric
        return;
    }
    for (int i = 0; i < nums.Length; i++)
    {
        if (used[i]) continue;
        used[i] = true;
        Perm(nums, used, placed + 1, cur + nums[i]);
        used[i] = false;
    }
}` }
        ] }
    },
    mcq: {
      q: 'How should "3" and "30" be ordered?',
      options: ['"30" first, because 30 &gt; 3', '"3" first, because "330" &gt; "303"', 'It does not matter', '"30" first, because it is longer'],
      answer: 1,
      explain: 'Compare the two possible concatenations directly: a before b iff a + b &gt; b + a. "330" &gt; "303", so "3" goes first.'
    },
    hints: [
      `<p><b>Aha (exchange argument):</b> for two neighbours a, b in the answer, swapping them only changes that local pair. So a must come before b exactly when <code>a + b &gt; b + a</code> as strings.</p>`,
      `<p>Convert to strings and sort with the comparator <code>(a, b) -&gt; (b + a).compareTo(a + b)</code>. This ordering is transitive (it is equivalent to comparing a / (10<sup>len(a)</sup> − 1)), so sorting is valid.</p>`,
      `<p>Edge case: all zeros → "0", not "000". Recipe: map to strings → sort with the concat comparator → if first is "0" return "0" → join.</p>`
    ],
    tests: { sig: 'int[] -> string', fn: 'largestNumber', cases: [
      [[[10, 2]], "210"],
      [[[3, 30, 34, 5, 9]], "9534330"],
      [[[0, 0]], "0"],
      [[[0]], "0"],
      [[[1000000000, 1]], "11000000000"],
      [[[121, 12]], "12121"],
      [[[8308, 8308, 830]], "83088308830"],
      [[[432, 43243]], "43243432"],
      [[{$rep: 0, n: 100}], "0"],
      [[{$rep: 1000000000, n: 100}], {$rep: "1000000000", n: 100}]
    ] },
    solution: {
      approach: `<p>Custom comparator from an adjacent-swap exchange argument: put a before b when a + b &gt; b + a. Any arrangement violating this for a neighbouring pair can be improved by swapping that pair, so the sorted order is optimal.</p>`,
      code: `
        import java.util.*;

        class Solution {
            public String largestNumber(int[] nums) {
                String[] s = new String[nums.length];
                for (int i = 0; i < nums.length; i++) s[i] = String.valueOf(nums[i]);
                Arrays.sort(s, (a, b) -> (b + a).compareTo(a + b));   // a first if a+b > b+a
                if (s[0].equals("0")) return "0";                       // all numbers were zero
                StringBuilder sb = new StringBuilder();
                for (String x : s) sb.append(x);
                return sb.toString();
            }

            public static void main(String[] args) {
                Solution sol = new Solution();
                System.out.println(sol.largestNumber(new int[]{10, 2}));            // 210
                System.out.println(sol.largestNumber(new int[]{3, 30, 34, 5, 9}));  // 9534330
                System.out.println(sol.largestNumber(new int[]{0, 0}));             // 0
            }
        }`,
      alt: [{ lang: 'python', code: `from functools import cmp_to_key

def largest_number(nums):
    s = [str(x) for x in nums]
    # a goes first when a + b > b + a
    s.sort(key=cmp_to_key(lambda a, b: (b + a > a + b) - (b + a < a + b)))
    return '0' if s[0] == '0' else ''.join(s)` }, { lang: 'js', code: `function largestNumber(nums) {
  const s = nums.map(String);
  s.sort((a, b) => (b + a > a + b ? 1 : b + a < a + b ? -1 : 0));   // a first if a+b > b+a
  return s[0] === '0' ? '0' : s.join('');
}` }, { lang: 'cpp', code: `class Solution {
public:
    string largestNumber(vector<int>& nums) {
        vector<string> s;
        for (int x : nums) s.push_back(to_string(x));
        sort(s.begin(), s.end(), [](const string& a, const string& b) { return a + b > b + a; });
        if (s[0] == "0") return "0";                  // all numbers were zero
        string out;
        for (auto& x : s) out += x;
        return out;
    }
};` }, { lang: 'csharp', code: `using System;

public class Solution
{
    public string LargestNumber(int[] nums)
    {
        string[] s = new string[nums.Length];
        for (int i = 0; i < nums.Length; i++) s[i] = nums[i].ToString();
        Array.Sort(s, (a, b) => string.CompareOrdinal(b + a, a + b));   // a first if a+b > b+a
        if (s[0] == "0") return "0";                                     // all numbers were zero
        return string.Concat(s);
    }
}` }],
      complexity: `<p><b>Time O(N log N · L)</b> where L ≤ 10 is the digit length (each comparison builds strings of length ≤ 2L). <b>Space O(N · L)</b>.</p>`,
      followUps: ['Smallest number instead (watch out for leading zeros).', 'Prove the comparator is transitive.']
    }
  });

  practice.push({
    title: 'Queue Reconstruction by Height',
    level: 'Medium',
    tags: ['greedy', 'sorting', 'insertion'],
    companies: ['Google', 'Amazon'],
    statement: `<p><code>people[i] = [h, k]</code>: person i has height h and exactly k people <b>in front</b> of them with height ≥ h. The array is shuffled. Reconstruct and return the queue.</p>`,
    constraints: `1 ≤ N ≤ 2000, 0 ≤ h ≤ 10<sup>6</sup>, 0 ≤ k &lt; N, a valid queue exists`,
    example: `<p>[[7,0],[4,4],[7,1],[5,0],[6,1],[5,2]] → ${H.c('g', '[[5,0],[7,0],[5,2],[6,1],[4,4],[7,1]]')}. Check [5,2]: in front are 5 and 7 — two people with height ≥ 5. ✔</p>
      ${H.table(['insert (tallest first)', 'at index k', 'queue after'], [['[7,0]', '0', '[7,0]'], ['[7,1]', '1', '[7,0] [7,1]'], ['[6,1]', '1', '[7,0] [6,1] [7,1]'], ['[5,0]', '0', '[5,0] [7,0] [6,1] [7,1]'], ['[5,2]', '2', '[5,0] [7,0] [5,2] [6,1] [7,1]'], ['[4,4]', '4', H.c('g', '[5,0] [7,0] [5,2] [6,1] [4,4] [7,1]')]])}`,
    brute: {
      why: `<p>Try every permutation and check each person's k: N! orders (pruned backtracking helps but stays exponential). The waste: once taller people are placed, a shorter person's position is forced — exactly index k.</p>`,
      code: { lang: 'java', code: `
        int[][] bruteQueue(int[][] people) {
            int[][] cur = new int[people.length][];
            return place(people, new boolean[people.length], cur, 0) ? cur : null;
        }

        boolean place(int[][] people, boolean[] used, int[][] cur, int pos) {
            if (pos == people.length) return true;
            for (int i = 0; i < people.length; i++) {
                if (used[i]) continue;
                int taller = 0;                                  // people already in front with height >= h
                for (int j = 0; j < pos; j++) if (cur[j][0] >= people[i][0]) taller++;
                if (taller != people[i][1]) continue;            // k must match exactly
                used[i] = true;
                cur[pos] = people[i];
                if (place(people, used, cur, pos + 1)) return true;
                used[i] = false;
            }
            return false;
        }`, alt: [
          { lang: 'python', code: `def reconstruct_queue(people):
    cur = [None] * len(people)
    used = [False] * len(people)

    def place(pos):
        if pos == len(people):
            return True
        for i in range(len(people)):
            if used[i]:
                continue
            taller = 0                               # people already in front with height >= h
            for j in range(pos):
                if cur[j][0] >= people[i][0]:
                    taller += 1
            if taller != people[i][1]:               # k must match exactly
                continue
            used[i] = True
            cur[pos] = people[i]
            if place(pos + 1):
                return True
            used[i] = False
        return False

    return cur if place(0) else None` },
          { lang: 'js', code: `function reconstructQueue(people) {
  const cur = new Array(people.length);
  const used = new Array(people.length).fill(false);
  function place(pos) {
    if (pos === people.length) return true;
    for (let i = 0; i < people.length; i++) {
      if (used[i]) continue;
      let taller = 0;                                // people already in front with height >= h
      for (let j = 0; j < pos; j++) if (cur[j][0] >= people[i][0]) taller++;
      if (taller !== people[i][1]) continue;         // k must match exactly
      used[i] = true;
      cur[pos] = people[i];
      if (place(pos + 1)) return true;
      used[i] = false;
    }
    return false;
  }
  return place(0) ? cur : null;
}` },
          { lang: 'cpp', code: `bool place(vector<vector<int>>& people, vector<bool>& used, vector<vector<int>>& cur, int pos) {
    if (pos == (int)people.size()) return true;
    for (int i = 0; i < (int)people.size(); i++) {
        if (used[i]) continue;
        int taller = 0;                              // people already in front with height >= h
        for (int j = 0; j < pos; j++) if (cur[j][0] >= people[i][0]) taller++;
        if (taller != people[i][1]) continue;        // k must match exactly
        used[i] = true;
        cur[pos] = people[i];
        if (place(people, used, cur, pos + 1)) return true;
        used[i] = false;
    }
    return false;
}

vector<vector<int>> reconstructQueue(vector<vector<int>> people) {
    vector<vector<int>> cur(people.size());
    vector<bool> used(people.size(), false);
    return place(people, used, cur, 0) ? cur : vector<vector<int>>();
}` },
          { lang: 'csharp', code: `int[][] BruteQueue(int[][] people)
{
    int[][] cur = new int[people.Length][];
    return Place(people, new bool[people.Length], cur, 0) ? cur : null;
}

bool Place(int[][] people, bool[] used, int[][] cur, int pos)
{
    if (pos == people.Length) return true;
    for (int i = 0; i < people.Length; i++)
    {
        if (used[i]) continue;
        int taller = 0;                                  // people already in front with height >= h
        for (int j = 0; j < pos; j++) if (cur[j][0] >= people[i][0]) taller++;
        if (taller != people[i][1]) continue;            // k must match exactly
        used[i] = true;
        cur[pos] = people[i];
        if (Place(people, used, cur, pos + 1)) return true;
        used[i] = false;
    }
    return false;
}` }
        ] }
    },
    mcq: {
      q: 'Why insert the tallest people first?',
      options: ['Because tall people are fewer', 'Shorter people are invisible to taller people\'s k, so inserting a shorter person later never breaks anyone already placed', 'It makes the list shorter', 'Because sorting is cheaper that way'],
      answer: 1,
      explain: 'A person\'s k counts only people with height ≥ theirs. Everyone already placed is at least as tall, so the new person goes exactly at index k, and taller people\'s counts are unaffected.'
    },
    hints: [
      `<p><b>Aha:</b> short people do not count toward a tall person's k. So place tall people first; later insertions of shorter people cannot disturb them.</p>`,
      `<p>Sort by height descending, and for equal heights by k ascending. Insert each person into a list at index k.</p>`,
      `<p>Equal heights: [5,0] must be inserted before [5,2] (both count each other). Recipe: sort (h desc, k asc) → list.add(k, person) for each → toArray.</p>`
    ],
    tests: { sig: 'int[][] -> int[][]', fn: 'reconstructQueue', cases: [
      [[[[7, 0], [4, 4], [7, 1], [5, 0], [6, 1], [5, 2]]], [[5, 0], [7, 0], [5, 2], [6, 1], [4, 4], [7, 1]]],
      [[[[6, 0], [5, 0], [4, 0], [3, 2], [2, 2], [1, 4]]], [[4, 0], [5, 0], [2, 2], [3, 2], [1, 4], [6, 0]]],
      [[[[1, 0]]], [[1, 0]]],
      [[[[5, 0], [5, 1], [5, 2]]], [[5, 0], [5, 1], [5, 2]]],
      [[[[1, 1], [2, 0]]], [[2, 0], [1, 1]]],
      [[[[0, 0], [1000000, 0], [0, 1]]], [[0, 0], [0, 1], [1000000, 0]]],
      [[[[9, 0], [7, 0], [1, 2]]], [[7, 0], [9, 0], [1, 2]]]
    ] },
    solution: {
      approach: `<p>Sort tallest first (ties by k ascending) and insert each person at index k. When a person is inserted, everyone already in the list is at least as tall, so exactly k of them must be in front — index k. Later (shorter) insertions do not affect anyone's count.</p>`,
      code: `
        import java.util.*;

        class Solution {
            public int[][] reconstructQueue(int[][] people) {
                int[][] p = people.clone();
                Arrays.sort(p, (a, b) -> a[0] != b[0] ? Integer.compare(b[0], a[0])   // taller first
                                                       : Integer.compare(a[1], b[1])); // then smaller k
                List<int[]> queue = new ArrayList<>();
                for (int[] person : p) queue.add(person[1], person);   // exactly k taller-or-equal in front
                return queue.toArray(new int[0][]);
            }

            public static void main(String[] args) {
                int[][] q = new Solution().reconstructQueue(new int[][]{{7, 0}, {4, 4}, {7, 1}, {5, 0}, {6, 1}, {5, 2}});
                System.out.println(Arrays.deepToString(q));   // [[5, 0], [7, 0], [5, 2], [6, 1], [4, 4], [7, 1]]
            }
        }`,
      alt: [{ lang: 'python', code: `def reconstruct_queue(people):
    queue = []
    for h, k in sorted(people, key=lambda p: (-p[0], p[1])):   # tallest first, then smaller k
        queue.insert(k, [h, k])     # exactly k taller-or-equal people in front
    return queue` }, { lang: 'js', code: `function reconstructQueue(people) {
  const p = [...people].sort((a, b) => b[0] - a[0] || a[1] - b[1]);   // tallest first, then smaller k
  const queue = [];
  for (const person of p) queue.splice(person[1], 0, person);         // insert at index k
  return queue;
}` }, { lang: 'cpp', code: `class Solution {
public:
    vector<vector<int>> reconstructQueue(vector<vector<int>> people) {
        sort(people.begin(), people.end(), [](auto& a, auto& b) {
            return a[0] != b[0] ? a[0] > b[0] : a[1] < b[1];         // tallest first, then smaller k
        });
        vector<vector<int>> queue;
        for (auto& p : people) queue.insert(queue.begin() + p[1], p);  // insert at index k
        return queue;
    }
};` }, { lang: 'csharp', code: `using System;
using System.Collections.Generic;

public class Solution
{
    public int[][] ReconstructQueue(int[][] people)
    {
        int[][] p = (int[][])people.Clone();
        Array.Sort(p, (a, b) => a[0] != b[0] ? b[0].CompareTo(a[0])    // taller first
                                             : a[1].CompareTo(b[1]));  // then smaller k
        var queue = new List<int[]>();
        foreach (int[] person in p) queue.Insert(person[1], person);   // exactly k taller-or-equal in front
        return queue.ToArray();
    }
}` }],
      complexity: `<p><b>Time O(N²)</b> in the worst case because of list insertions (N ≤ 2000 → fine); a Fenwick tree over empty slots (insert shortest first) gives O(N log N). <b>Space O(N)</b>.</p>`,
      followUps: ['Make it O(N log N) with a BIT / segment tree of free positions.', 'Validate a given queue in O(N log N).']
    }
  });

  // =====================================================================
  // PRACTICE — Hard
  // =====================================================================
  practice.push({
    title: 'Candy',
    level: 'Hard',
    tags: ['greedy', 'array', 'two passes'],
    companies: ['Amazon', 'Google', 'Microsoft', 'Uber'],
    statement: `<p>N children stand in a line with ratings <code>ratings[i]</code>. Give candies so that every child gets <b>at least one</b>, and a child with a <b>higher rating than an immediate neighbour</b> gets more candies than that neighbour. Return the <b>minimum total</b> number of candies.</p>`,
    constraints: `1 ≤ N ≤ 2·10<sup>4</sup>, 0 ≤ ratings[i] ≤ 2·10<sup>4</sup>`,
    example: `${H.arr([1, 0, 2], { label: 'ratings' })}${H.arr([2, 1, 2], { label: 'candies', hl: { 0: 'g', 2: 'g' } })}
      <p>Output <b>5</b>. With ratings [1, 2, 2] the output is <b>4</b> (candies 1, 2, 1): equal neighbours have no constraint.</p>`,
    brute: {
      why: `<p>Start everyone at 1 and repeatedly sweep the line fixing any violated rule (raise the higher-rated child to neighbour + 1) until nothing changes. It reaches the minimum, but a long decreasing run can need O(N) sweeps → O(N²). The waste: the left rules and right rules can each be satisfied in one directed pass.</p>`,
      code: { lang: 'java', code: `
        int bruteCandy(int[] r) {
            int n = r.length;
            int[] c = new int[n];
            Arrays.fill(c, 1);
            boolean changed = true;
            while (changed) {                                   // relax until every rule holds
                changed = false;
                for (int i = 0; i < n; i++) {
                    if (i > 0 && r[i] > r[i - 1] && c[i] <= c[i - 1]) { c[i] = c[i - 1] + 1; changed = true; }
                    if (i + 1 < n && r[i] > r[i + 1] && c[i] <= c[i + 1]) { c[i] = c[i + 1] + 1; changed = true; }
                }
            }
            int sum = 0;
            for (int x : c) sum += x;
            return sum;
        }`, alt: [
          { lang: 'python', code: `def candy(r):
    n = len(r)
    c = [1] * n
    changed = True
    while changed:                                   # relax until every rule holds
        changed = False
        for i in range(n):
            if i > 0 and r[i] > r[i - 1] and c[i] <= c[i - 1]:
                c[i] = c[i - 1] + 1
                changed = True
            if i + 1 < n and r[i] > r[i + 1] and c[i] <= c[i + 1]:
                c[i] = c[i + 1] + 1
                changed = True
    return sum(c)` },
          { lang: 'js', code: `function candy(r) {
  const n = r.length;
  const c = new Array(n).fill(1);
  let changed = true;
  while (changed) {                                  // relax until every rule holds
    changed = false;
    for (let i = 0; i < n; i++) {
      if (i > 0 && r[i] > r[i - 1] && c[i] <= c[i - 1]) { c[i] = c[i - 1] + 1; changed = true; }
      if (i + 1 < n && r[i] > r[i + 1] && c[i] <= c[i + 1]) { c[i] = c[i + 1] + 1; changed = true; }
    }
  }
  return c.reduce((a, b) => a + b, 0);
}` },
          { lang: 'cpp', code: `int candy(vector<int>& r) {
    int n = r.size();
    vector<int> c(n, 1);
    bool changed = true;
    while (changed) {                                // relax until every rule holds
        changed = false;
        for (int i = 0; i < n; i++) {
            if (i > 0 && r[i] > r[i - 1] && c[i] <= c[i - 1]) { c[i] = c[i - 1] + 1; changed = true; }
            if (i + 1 < n && r[i] > r[i + 1] && c[i] <= c[i + 1]) { c[i] = c[i + 1] + 1; changed = true; }
        }
    }
    int sum = 0;
    for (int x : c) sum += x;
    return sum;
}` },
          { lang: 'csharp', code: `int BruteCandy(int[] r)
{
    int n = r.Length;
    int[] c = new int[n];
    for (int i = 0; i < n; i++) c[i] = 1;
    bool changed = true;
    while (changed)                                     // relax until every rule holds
    {
        changed = false;
        for (int i = 0; i < n; i++)
        {
            if (i > 0 && r[i] > r[i - 1] && c[i] <= c[i - 1]) { c[i] = c[i - 1] + 1; changed = true; }
            if (i + 1 < n && r[i] > r[i + 1] && c[i] <= c[i + 1]) { c[i] = c[i + 1] + 1; changed = true; }
        }
    }
    int sum = 0;
    foreach (int x in c) sum += x;
    return sum;
}` }
        ] }
    },
    mcq: {
      q: 'After the left-to-right pass, why take <code>max(c[i], c[i+1] + 1)</code> in the right-to-left pass instead of just <code>c[i+1] + 1</code>?',
      options: ['To keep the sum small', 'To keep the left-neighbour rule that the first pass already satisfied', 'Because of integer overflow', 'It makes no difference'],
      answer: 1,
      explain: 'The first pass guarantees c[i] &gt; c[i−1] when needed. Overwriting with c[i+1] + 1 could lower c[i] and break that. The max satisfies both sides with the smallest value.'
    },
    hints: [
      `<p><b>Aha:</b> split the rule into two independent rules — "beat your left neighbour if higher" and "beat your right neighbour if higher". Each one is easy in one directed pass.</p>`,
      `<p>Pass 1 (left → right): if r[i] &gt; r[i−1], c[i] = c[i−1] + 1. Pass 2 (right → left): if r[i] &gt; r[i+1], c[i] = max(c[i], c[i+1] + 1).</p>`,
      `<p>Each c[i] ends as the max of the two "slope lengths" ending at i — the smallest value satisfying both rules. Equal ratings impose nothing. Recipe: fill 1 → pass 1 → pass 2 with max → sum.</p>`
    ],
    tests: { sig: 'int[] -> int', fn: 'candy', cases: [
      [[[1, 0, 2]], 5],
      [[[1, 2, 2]], 4],
      [[[1, 3, 4, 5, 2]], 11],
      [[[5]], 1],
      [[[3, 3, 3]], 3],
      [[[5, 4, 3, 2, 1]], 15],
      [[[1, 2, 87, 87, 87, 2, 1]], 13],
      [[[0, 20000, 0]], 4],
      [[{$range: [0, 20000, 1]}], 200010000],
      [[{$concat: [{$range: [0, 10000, 1]}, {$range: [10000, 0, -1]}]}], 100010001]
    ] },
    solution: {
      approach: `<p>Two greedy passes. After pass 1, c[i] = length of the increasing run ending at i from the left — the minimum to satisfy left rules. Pass 2 computes the same from the right and keeps the max. Every child needs at least both values, and the max satisfies both rules, so the total is minimal.</p>`,
      code: `
        import java.util.*;

        class Solution {
            public int candy(int[] ratings) {
                int n = ratings.length;
                int[] c = new int[n];
                Arrays.fill(c, 1);                                     // everyone gets at least one
                for (int i = 1; i < n; i++)                            // beat the LEFT neighbour
                    if (ratings[i] > ratings[i - 1]) c[i] = c[i - 1] + 1;
                for (int i = n - 2; i >= 0; i--)                       // beat the RIGHT neighbour
                    if (ratings[i] > ratings[i + 1]) c[i] = Math.max(c[i], c[i + 1] + 1);
                int sum = 0;
                for (int x : c) sum += x;
                return sum;
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.candy(new int[]{1, 0, 2}));            // 5
                System.out.println(s.candy(new int[]{1, 2, 2}));            // 4
                System.out.println(s.candy(new int[]{1, 3, 4, 5, 2}));      // 11
            }
        }`,
      dry: {
        head: ['i', 'rating', 'after pass 1', 'after pass 2'],
        rows: [['0', '1', '1', '1'], ['1', '3', '2', '2'], ['2', '4', '3', '3'], ['3', '5', '4', '4'], ['4', '2', '1', '1 → total <span class="c-p">11</span>']]
      },
      alt: [{ lang: 'python', code: `def candy(ratings):
    n = len(ratings)
    c = [1] * n                                 # everyone gets at least one
    for i in range(1, n):                       # beat the LEFT neighbour
        if ratings[i] > ratings[i - 1]:
            c[i] = c[i - 1] + 1
    for i in range(n - 2, -1, -1):              # beat the RIGHT neighbour
        if ratings[i] > ratings[i + 1]:
            c[i] = max(c[i], c[i + 1] + 1)
    return sum(c)` }, { lang: 'js', code: `function candy(ratings) {
  const n = ratings.length, c = new Array(n).fill(1);
  for (let i = 1; i < n; i++) if (ratings[i] > ratings[i - 1]) c[i] = c[i - 1] + 1;
  for (let i = n - 2; i >= 0; i--) if (ratings[i] > ratings[i + 1]) c[i] = Math.max(c[i], c[i + 1] + 1);
  return c.reduce((s, x) => s + x, 0);
}` }, { lang: 'cpp', code: `class Solution {
public:
    int candy(vector<int>& ratings) {
        int n = ratings.size();
        vector<int> c(n, 1);
        for (int i = 1; i < n; i++) if (ratings[i] > ratings[i - 1]) c[i] = c[i - 1] + 1;
        for (int i = n - 2; i >= 0; i--) if (ratings[i] > ratings[i + 1]) c[i] = max(c[i], c[i + 1] + 1);
        return accumulate(c.begin(), c.end(), 0);
    }
};` }, { lang: 'csharp', code: `using System;

public class Solution
{
    public int Candy(int[] ratings)
    {
        int n = ratings.Length;
        int[] c = new int[n];
        for (int i = 0; i < n; i++) c[i] = 1;                    // everyone gets at least one
        for (int i = 1; i < n; i++)                              // beat the LEFT neighbour
            if (ratings[i] > ratings[i - 1]) c[i] = c[i - 1] + 1;
        for (int i = n - 2; i >= 0; i--)                         // beat the RIGHT neighbour
            if (ratings[i] > ratings[i + 1]) c[i] = Math.Max(c[i], c[i + 1] + 1);
        int sum = 0;
        foreach (int x in c) sum += x;
        return sum;
    }
}` }],
      complexity: `<p><b>Time O(N)</b>, <b>Space O(N)</b>. An O(1)-space one-pass version counts up-slopes and down-slopes, but the two-pass version is what interviewers expect first.</p>`,
      followUps: ['Children sit in a circle.', 'Do it with O(1) extra space (slope counting).']
    }
  });

  practice.push({
    title: 'IPO (Maximize Capital)',
    level: 'Hard',
    tags: ['greedy', 'heap', 'sorting'],
    companies: ['Amazon', 'Google', 'Meta'],
    statement: `<p>You start with capital <code>w</code> and may finish at most <code>k</code> distinct projects. Project i needs <code>capital[i]</code> to start (it is not spent) and adds <code>profits[i]</code> to your capital when finished. Return your <b>maximum final capital</b>.</p>`,
    constraints: `1 ≤ k ≤ 10<sup>5</sup>, 0 ≤ w ≤ 10<sup>9</sup>, 1 ≤ N ≤ 10<sup>5</sup>, 0 ≤ profits[i] ≤ 10<sup>4</sup>, 0 ≤ capital[i] ≤ 10<sup>9</sup>; the answer fits in a 32-bit signed int`,
    example: `<p>k = 2, w = 0, profits = [1, 2, 3], capital = [0, 1, 1] → Output <b>4</b>. Round 1: only project 0 is affordable → w = 1. Round 2: projects 1 and 2 are affordable, take the richer ${H.c('g', 'project 2 (+3)')} → w = 4.</p>`,
    brute: {
      why: `<p>Each round, scan all projects, pick the unused affordable one with the largest profit: O(k·N) = 10<sup>10</sup> in the worst case. The waste: projects become affordable in a fixed order (by capital) and never stop being affordable, so a sorted pointer plus a heap avoids rescanning.</p>`,
      code: { lang: 'java', code: `
        int bruteIPO(int k, int w, int[] profits, int[] capital) {
            boolean[] used = new boolean[profits.length];
            for (int round = 0; round < k; round++) {
                int pick = -1;
                for (int i = 0; i < profits.length; i++)
                    if (!used[i] && capital[i] <= w && (pick == -1 || profits[i] > profits[pick])) pick = i;
                if (pick == -1) break;                 // nothing affordable
                used[pick] = true;
                w += profits[pick];
            }
            return w;
        }`, alt: [
          { lang: 'python', code: `def find_maximized_capital(k, w, profits, capital):
    used = [False] * len(profits)
    for _ in range(k):
        pick = -1
        for i in range(len(profits)):
            if not used[i] and capital[i] <= w and (pick == -1 or profits[i] > profits[pick]):
                pick = i
        if pick == -1:                               # nothing affordable
            break
        used[pick] = True
        w += profits[pick]
    return w` },
          { lang: 'js', code: `function findMaximizedCapital(k, w, profits, capital) {
  const used = new Array(profits.length).fill(false);
  for (let round = 0; round < k; round++) {
    let pick = -1;
    for (let i = 0; i < profits.length; i++)
      if (!used[i] && capital[i] <= w && (pick === -1 || profits[i] > profits[pick])) pick = i;
    if (pick === -1) break;                          // nothing affordable
    used[pick] = true;
    w += profits[pick];
  }
  return w;
}` },
          { lang: 'cpp', code: `int findMaximizedCapital(int k, int w, vector<int>& profits, vector<int>& capital) {
    vector<bool> used(profits.size(), false);
    for (int round = 0; round < k; round++) {
        int pick = -1;
        for (int i = 0; i < (int)profits.size(); i++)
            if (!used[i] && capital[i] <= w && (pick == -1 || profits[i] > profits[pick])) pick = i;
        if (pick == -1) break;                       // nothing affordable
        used[pick] = true;
        w += profits[pick];
    }
    return w;
}` },
          { lang: 'csharp', code: `int BruteIPO(int k, int w, int[] profits, int[] capital)
{
    bool[] used = new bool[profits.Length];
    for (int round = 0; round < k; round++)
    {
        int pick = -1;
        for (int i = 0; i < profits.Length; i++)
            if (!used[i] && capital[i] <= w && (pick == -1 || profits[i] > profits[pick])) pick = i;
        if (pick == -1) break;                 // nothing affordable
        used[pick] = true;
        w += profits[pick];
    }
    return w;
}` }
        ] }
    },
    mcq: {
      q: 'Why is it safe to always take the most profitable affordable project?',
      options: ['Because profits are sorted', 'Capital only grows, so anything affordable now stays affordable; taking the biggest profit first makes later options a superset', 'Because k is small', 'It is not safe; you need DP'],
      answer: 1,
      explain: 'Profits are non-negative, so a richer you can afford everything a poorer you could. Exchange: swapping a smaller first pick for the largest affordable never shrinks future choices or the total.'
    },
    hints: [
      `<p><b>Aha:</b> capital never decreases. So the set of affordable projects only grows over time, and the best move each round is the most profitable affordable project.</p>`,
      `<p>Sort projects by required capital. Each round, push every newly affordable project's profit into a <b>max-heap</b>, then pop the top.</p>`,
      `<p>Stop early if the heap is empty (stuck). Recipe: sort indices by capital → for round in 1..k: while next affordable → push profit; if heap empty → break; w += poll → return w.</p>`
    ],
    tests: { sig: 'int int int[] int[] -> int', fn: 'findMaximizedCapital', cases: [
      [[2, 0, [1, 2, 3], [0, 1, 1]], 4],
      [[3, 0, [1, 2, 3], [0, 1, 2]], 6],
      [[1, 0, [1], [1]], 0],
      [[1, 5, [0], [0]], 5],
      [[10, 0, [1, 2, 3], [0, 1, 2]], 6],
      [[2, 1000000000, [10000, 1], [1000000000, 0]], 1000010001],
      [[2, 1, [1, 2, 3, 100], [1, 1, 2, 4]], 6],
      [[100000, 0, {$rep: 10000, n: 100000}, {$rep: 0, n: 100000}], 1000000000],
      [[100000, 0, {$rep: 10000, n: 100000}, {$rep: 1, n: 100000}], 0]
    ] },
    solution: {
      approach: `<p>Two-structure greedy: a pointer over projects sorted by capital "unlocks" projects as w grows; a max-heap gives the best unlocked profit each round. Exchange argument: if an optimal sequence starts with a smaller affordable profit, swapping in the largest affordable one leaves capital at least as high at every later step.</p>`,
      code: `
        import java.util.*;

        class Solution {
            public int findMaximizedCapital(int k, int w, int[] profits, int[] capital) {
                int n = profits.length;
                Integer[] order = new Integer[n];
                for (int i = 0; i < n; i++) order[i] = i;
                Arrays.sort(order, (a, b) -> Integer.compare(capital[a], capital[b]));   // cheapest to start first
                PriorityQueue<Integer> affordable = new PriorityQueue<>(Collections.reverseOrder()); // max-heap of profits
                int next = 0;
                for (int round = 0; round < k; round++) {
                    while (next < n && capital[order[next]] <= w) {
                        affordable.add(profits[order[next++]]);   // unlocked forever
                    }
                    if (affordable.isEmpty()) break;              // cannot start anything
                    w += affordable.poll();                       // best project we can do now
                }
                return w;
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.findMaximizedCapital(2, 0, new int[]{1, 2, 3}, new int[]{0, 1, 1}));  // 4
                System.out.println(s.findMaximizedCapital(3, 0, new int[]{1, 2, 3}, new int[]{0, 1, 2}));  // 6
            }
        }`,
      alt: [{ lang: 'python', code: `import heapq

def find_maximized_capital(k, w, profits, capital):
    projects = sorted(zip(capital, profits))   # cheapest to start first
    affordable = []                            # max-heap via negated profits
    nxt = 0
    for _ in range(k):
        while nxt < len(projects) and projects[nxt][0] <= w:
            heapq.heappush(affordable, -projects[nxt][1])   # unlocked forever
            nxt += 1
        if not affordable:
            break                              # cannot start anything
        w -= heapq.heappop(affordable)         # best project we can do now
    return w` }, { lang: 'js', code: `// JS has no built-in heap: a small binary min-heap with a comparator.
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp; }
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {                                // sift up
      const p = (i - 1) >> 1;
      if (this.cmp(a[i], a[p]) >= 0) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {                                   // sift down
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.cmp(a[l], a[m]) < 0) m = l;
        if (r < a.length && this.cmp(a[r], a[m]) < 0) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function findMaximizedCapital(k, w, profits, capital) {
  const order = profits.map((_, i) => i).sort((a, b) => capital[a] - capital[b]);   // cheapest first
  const affordable = new MinHeap((a, b) => b - a);   // reversed comparator = max-heap of profits
  let next = 0;
  for (let round = 0; round < k; round++) {
    while (next < order.length && capital[order[next]] <= w) affordable.push(profits[order[next++]]);
    if (affordable.size() === 0) break;
    w += affordable.pop();
  }
  return w;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int findMaximizedCapital(int k, int w, vector<int>& profits, vector<int>& capital) {
        vector<pair<int, int>> projects;                  // (capital, profit)
        for (size_t i = 0; i < profits.size(); i++) projects.push_back({capital[i], profits[i]});
        sort(projects.begin(), projects.end());
        priority_queue<int> affordable;                   // max-heap by default
        size_t next = 0;
        for (int round = 0; round < k; round++) {
            while (next < projects.size() && projects[next].first <= w) affordable.push(projects[next++].second);
            if (affordable.empty()) break;
            w += affordable.top();
            affordable.pop();
        }
        return w;
    }
};` }, { lang: 'csharp', code: `using System;
using System.Collections.Generic;

public class Solution
{
    public int FindMaximizedCapital(int k, int w, int[] profits, int[] capital)
    {
        int n = profits.Length;
        int[] order = new int[n];
        for (int i = 0; i < n; i++) order[i] = i;
        Array.Sort(order, (a, b) => capital[a].CompareTo(capital[b]));   // cheapest to start first
        var affordable = new MinHeap<int>((a, b) => b.CompareTo(a));      // max-heap of profits
        int next = 0;
        for (int round = 0; round < k; round++)
        {
            while (next < n && capital[order[next]] <= w)
            {
                affordable.Push(profits[order[next++]]);  // unlocked forever
            }
            if (affordable.Count == 0) break;             // cannot start anything
            w += affordable.Pop();                        // best project we can do now
        }
        return w;
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }],
      complexity: `<p><b>Time O(N log N + k log N)</b>: sorting plus at most N pushes and k pops. <b>Space O(N)</b>.</p>`,
      followUps: ['Projects can lose money (negative profits): what breaks?', 'Each project also takes time and you have a deadline.']
    }
  });

  practice.push({
    title: 'Course Schedule III',
    level: 'Hard',
    tags: ['greedy', 'heap', 'scheduling'],
    companies: ['Google', 'Amazon', 'Microsoft'],
    statement: `<p><code>courses[i] = [duration, lastDay]</code>: course i takes <code>duration</code> consecutive days and must be finished by day <code>lastDay</code>. You start on day 1, take one course at a time. Return the <b>maximum number of courses</b> you can take.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>4</sup>, 1 ≤ duration, lastDay ≤ 10<sup>4</sup>`,
    example: `${H.table(['course', 'duration', 'lastDay'], [['A', '100', '200'], ['B', '200', '1300'], ['C', '1000', '1250'], ['D', '2000', '3200']])}
      <p>Output <b>3</b>: A (days 1–100), C (101–1100), B (1101–1300). D would end on day 3300 &gt; 3200. Taking A, C, B, D is impossible.</p>`,
    brute: {
      why: `<p>Try all 2<sup>N</sup> subsets; a subset is feasible iff running it in deadline order finishes each course on time (Earliest Deadline First is optimal for a fixed set). Exponential. The waste: when a deadline is missed, dropping the single longest course taken so far is always the best repair.</p>`,
      code: { lang: 'java', code: `
        int bruteCourses(int[][] courses) {
            int n = courses.length, best = 0;
            int[][] c = courses.clone();
            Arrays.sort(c, (a, b) -> Integer.compare(a[1], b[1]));    // deadline order
            for (int mask = 0; mask < (1 << n); mask++) {
                int time = 0;
                boolean ok = true;
                for (int i = 0; i < n && ok; i++) {
                    if ((mask >> i & 1) == 0) continue;
                    time += c[i][0];
                    if (time > c[i][1]) ok = false;                     // finished too late
                }
                if (ok) best = Math.max(best, Integer.bitCount(mask));
            }
            return best;
        }`, alt: [
          { lang: 'python', code: `def schedule_course(courses):
    n = len(courses)
    best = 0
    c = sorted(courses, key=lambda x: x[1])          # deadline order
    for mask in range(1 << n):
        time = 0
        ok = True
        for i in range(n):
            if not ok:
                break
            if (mask >> i & 1) == 0:
                continue
            time += c[i][0]
            if time > c[i][1]:                       # finished too late
                ok = False
        if ok:
            best = max(best, bin(mask).count('1'))
    return best` },
          { lang: 'js', code: `function scheduleCourse(courses) {
  const n = courses.length;
  let best = 0;
  const c = [...courses].sort((a, b) => a[1] - b[1]);   // deadline order
  for (let mask = 0; mask < (1 << n); mask++) {
    let time = 0;
    let ok = true;
    for (let i = 0; i < n && ok; i++) {
      if ((mask >> i & 1) === 0) continue;
      time += c[i][0];
      if (time > c[i][1]) ok = false;                // finished too late
    }
    if (ok) {
      let bits = 0;
      for (let m = mask; m > 0; m &= m - 1) bits++;
      best = Math.max(best, bits);
    }
  }
  return best;
}` },
          { lang: 'cpp', code: `int scheduleCourse(vector<vector<int>> courses) {
    int n = courses.size(), best = 0;
    vector<vector<int>> c = courses;
    sort(c.begin(), c.end(), [](auto& a, auto& b) { return a[1] < b[1]; });   // deadline order
    for (int mask = 0; mask < (1 << n); mask++) {
        int time = 0;
        bool ok = true;
        for (int i = 0; i < n && ok; i++) {
            if ((mask >> i & 1) == 0) continue;
            time += c[i][0];
            if (time > c[i][1]) ok = false;          // finished too late
        }
        if (ok) best = max(best, __builtin_popcount(mask));
    }
    return best;
}` },
          { lang: 'csharp', code: `int BruteCourses(int[][] courses)
{
    int n = courses.Length, best = 0;
    int[][] c = (int[][])courses.Clone();
    Array.Sort(c, (a, b) => a[1].CompareTo(b[1]));    // deadline order
    for (int mask = 0; mask < (1 << n); mask++)
    {
        int time = 0;
        bool ok = true;
        for (int i = 0; i < n && ok; i++)
        {
            if ((mask >> i & 1) == 0) continue;
            time += c[i][0];
            if (time > c[i][1]) ok = false;                     // finished too late
        }
        if (ok) best = Math.Max(best, BitCount(mask));
    }
    return best;
}
int BitCount(int x) { int cnt = 0; while (x != 0) { x &= x - 1; cnt++; } return cnt; }` }
        ] }
    },
    mcq: {
      q: 'Processing courses by deadline, adding course X makes you finish too late. Which course should you drop?',
      options: ['Course X, always', 'The course with the earliest deadline', 'The longest course taken so far (possibly X itself)', 'The shortest course taken so far'],
      answer: 2,
      explain: 'Every taken course counts as 1. Dropping the longest one frees the most time for the future while losing only one course — and the remaining set still meets all deadlines.'
    },
    hints: [
      `<p><b>Aha 1:</b> for any fixed set of courses, taking them in order of <b>lastDay</b> is best (exchange argument: swapping two adjacent courses that are out of deadline order never hurts).</p>`,
      `<p><b>Aha 2:</b> scan courses by lastDay, keep the taken durations in a <b>max-heap</b> and the total time. If total &gt; current lastDay, remove the longest taken course.</p>`,
      `<p>The heap size is the answer. Removing the longest keeps the count as high as possible and the time as low as possible. Recipe: sort by lastDay → for each: push duration, time += duration; if time &gt; lastDay → time −= poll → return heap size.</p>`
    ],
    tests: { sig: 'int[][] -> int', fn: 'scheduleCourse', cases: [
      [[[[100, 200], [200, 1300], [1000, 1250], [2000, 3200]]], 3],
      [[[[3, 2], [4, 3]]], 0],
      [[[[1, 2]]], 1],
      [[[[1, 1]]], 1],
      [[[[2, 1]]], 0],
      [[[[5, 5], [4, 6], [2, 6]]], 2],
      [[[[7, 17], [3, 12], [10, 20], [9, 10], [5, 20], [10, 19], [4, 18]]], 4],
      [[{$rep: [1, 10000], n: 10000}], 10000],
      [[{$rep: [2, 10000], n: 10000}], 5000]
    ] },
    solution: {
      approach: `<p>Earliest-deadline order plus "drop the longest when late" (Moore–Hodgson). Invariant: after each course, the heap holds a maximum-size feasible set among the courses seen, and among those the one with the smallest total time. Dropping the longest preserves both.</p>`,
      code: `
        import java.util.*;

        class Solution {
            public int scheduleCourse(int[][] courses) {
                int[][] c = courses.clone();
                Arrays.sort(c, (a, b) -> Integer.compare(a[1], b[1]));                // earliest deadline first
                PriorityQueue<Integer> taken = new PriorityQueue<>(Collections.reverseOrder()); // longest on top
                int time = 0;
                for (int[] course : c) {
                    taken.add(course[0]);
                    time += course[0];
                    if (time > course[1]) {            // late: give up the longest course so far
                        time -= taken.poll();
                    }
                }
                return taken.size();
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.scheduleCourse(new int[][]{{100, 200}, {200, 1300}, {1000, 1250}, {2000, 3200}}));  // 3
                System.out.println(s.scheduleCourse(new int[][]{{3, 2}, {4, 3}}));                                       // 0
            }
        }`,
      dry: {
        head: ['course (by lastDay)', 'push', 'time', 'late?', 'heap'],
        rows: [['100, 200', '100', '100', 'no', '{100}'], ['1000, 1250', '1000', '1100', 'no', '{1000, 100}'], ['200, 1300', '200', '1300', 'no', '{1000, 200, 100}'], ['2000, 3200', '2000', '3300 → drop 2000 → 1300', '<span class="c-r">yes</span>', 'size <span class="c-p">3</span>']]
      },
      alt: [{ lang: 'python', code: `import heapq

def schedule_course(courses):
    taken, time = [], 0                       # max-heap of durations (negated)
    for duration, last_day in sorted(courses, key=lambda c: c[1]):   # earliest deadline first
        heapq.heappush(taken, -duration)
        time += duration
        if time > last_day:                   # late: give up the longest course so far
            time += heapq.heappop(taken)
    return len(taken)` }, { lang: 'js', code: `// JS has no built-in heap: a small binary min-heap with a comparator.
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp; }
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {                                // sift up
      const p = (i - 1) >> 1;
      if (this.cmp(a[i], a[p]) >= 0) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {                                   // sift down
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.cmp(a[l], a[m]) < 0) m = l;
        if (r < a.length && this.cmp(a[r], a[m]) < 0) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function scheduleCourse(courses) {
  const c = [...courses].sort((a, b) => a[1] - b[1]);   // earliest deadline first
  const taken = new MinHeap((a, b) => b - a);           // max-heap of durations
  let time = 0;
  for (const [duration, lastDay] of c) {
    taken.push(duration);
    time += duration;
    if (time > lastDay) time -= taken.pop();            // drop the longest course so far
  }
  return taken.size();
}` }, { lang: 'cpp', code: `class Solution {
public:
    int scheduleCourse(vector<vector<int>> courses) {
        sort(courses.begin(), courses.end(), [](auto& a, auto& b) { return a[1] < b[1]; });
        priority_queue<int> taken;                          // longest on top
        int time = 0;
        for (auto& c : courses) {
            taken.push(c[0]);
            time += c[0];
            if (time > c[1]) { time -= taken.top(); taken.pop(); }
        }
        return taken.size();
    }
};` }, { lang: 'csharp', code: `using System;
using System.Collections.Generic;

public class Solution
{
    public int ScheduleCourse(int[][] courses)
    {
        int[][] c = (int[][])courses.Clone();
        Array.Sort(c, (a, b) => a[1].CompareTo(b[1]));             // earliest deadline first
        var taken = new MinHeap<int>((a, b) => b.CompareTo(a));    // longest on top (max-heap)
        int time = 0;
        foreach (int[] course in c)
        {
            taken.Push(course[0]);
            time += course[0];
            if (time > course[1])              // late: give up the longest course so far
            {
                time -= taken.Pop();
            }
        }
        return taken.Count;
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }],
      complexity: `<p><b>Time O(N log N)</b>, <b>Space O(N)</b>.</p>`,
      followUps: ['Courses have different values: maximize total value (no longer greedy — DP over time).', 'Return the actual course order.']
    }
  });

  practice.push({
    title: 'Minimum Number of Refueling Stops',
    level: 'Hard',
    tags: ['greedy', 'heap'],
    companies: ['Google', 'Amazon', 'Meta'],
    statement: `<p>A car drives east from position 0 to <code>target</code> with <code>startFuel</code> liters (1 liter per mile). <code>stations[i] = [position, fuel]</code>, sorted by position. When the car stops at a station it takes <b>all</b> of that station's fuel (unlimited tank). Return the <b>minimum number of stops</b> to reach the target, or −1. Arriving with 0 fuel still counts as arriving.</p>`,
    constraints: `1 ≤ target, startFuel ≤ 10<sup>9</sup>, 0 ≤ N ≤ 500, 0 &lt; position[i] &lt; target, 1 ≤ fuel[i] &lt; 10<sup>9</sup>`,
    example: `<p>target = 100, startFuel = 10, stations = [[10,60],[20,30],[30,30],[60,40]] → Output <b>2</b>. Reach 10, take ${H.c('g', '60')} (now reach 70); you passed 20, 30, 60 — take the biggest of them, ${H.c('g', '40 at mile 60')} (reach 110 ≥ 100).</p>`,
    brute: {
      why: `<p>For every station you can reach, choose "stop" or "skip" recursively: 2<sup>N</sup> paths. The waste: you never need to decide <i>when</i> you pass a station. Only when you are about to run dry does it matter which passed station you "should have" stopped at — and the answer is always the one with the most fuel.</p>`,
      code: { lang: 'java', code: `
        long INF = Long.MAX_VALUE / 4;

        int bruteRefuel(int target, int startFuel, int[][] stations) {
            long r = dfs(target, stations, 0, startFuel);
            return r >= INF ? -1 : (int) r;
        }

        // reach = farthest position reachable with the fuel picked up so far
        long dfs(int target, int[][] st, int i, long reach) {
            if (reach >= target) return 0;
            if (i == st.length || st[i][0] > reach) return INF;          // stuck before station i
            long skip = dfs(target, st, i + 1, reach);
            long stop = 1 + dfs(target, st, i + 1, reach + st[i][1]);
            return Math.min(skip, stop);
        }`, alt: [
          { lang: 'python', code: `def min_refuel_stops(target, start_fuel, stations):
    INF = float('inf')

    # reach = farthest position reachable with the fuel picked up so far
    def dfs(i, reach):
        if reach >= target:
            return 0
        if i == len(stations) or stations[i][0] > reach:   # stuck before station i
            return INF
        skip = dfs(i + 1, reach)
        stop = 1 + dfs(i + 1, reach + stations[i][1])
        return min(skip, stop)

    r = dfs(0, start_fuel)
    return -1 if r == INF else r` },
          { lang: 'js', code: `function minRefuelStops(target, startFuel, stations) {
  const INF = Infinity;
  // reach = farthest position reachable with the fuel picked up so far
  function dfs(i, reach) {
    if (reach >= target) return 0;
    if (i === stations.length || stations[i][0] > reach) return INF;   // stuck before station i
    const skip = dfs(i + 1, reach);
    const stop = 1 + dfs(i + 1, reach + stations[i][1]);
    return Math.min(skip, stop);
  }
  const r = dfs(0, startFuel);
  return r === INF ? -1 : r;
}` },
          { lang: 'cpp', code: `const long long INF = LLONG_MAX / 4;

// reach = farthest position reachable with the fuel picked up so far
long long dfs(int target, vector<vector<int>>& st, int i, long long reach) {
    if (reach >= target) return 0;
    if (i == (int)st.size() || st[i][0] > reach) return INF;   // stuck before station i
    long long skip = dfs(target, st, i + 1, reach);
    long long stop = 1 + dfs(target, st, i + 1, reach + st[i][1]);
    return min(skip, stop);
}

int minRefuelStops(int target, int startFuel, vector<vector<int>>& stations) {
    long long r = dfs(target, stations, 0, startFuel);
    return r >= INF ? -1 : (int)r;
}` },
          { lang: 'csharp', code: `long INF = long.MaxValue / 4;

int BruteRefuel(int target, int startFuel, int[][] stations)
{
    long r = Dfs(target, stations, 0, startFuel);
    return r >= INF ? -1 : (int)r;
}

// reach = farthest position reachable with the fuel picked up so far
long Dfs(int target, int[][] st, int i, long reach)
{
    if (reach >= target) return 0;
    if (i == st.Length || st[i][0] > reach) return INF;          // stuck before station i
    long skip = Dfs(target, st, i + 1, reach);
    long stop = 1 + Dfs(target, st, i + 1, reach + st[i][1]);
    return Math.Min(skip, stop);
}` }
        ] }
    },
    mcq: {
      q: 'You will run out of fuel before the next station. You have passed stations with 30, 30 and 40 liters without stopping. What does the greedy do?',
      options: ['Give up and return −1', '"Retroactively" stop at the 40-liter station', 'Stop at the first one you passed', 'Stop at all three'],
      answer: 1,
      explain: 'You must have stopped somewhere among the passed stations; one stop is unavoidable, and the 40-liter one extends your reach the most. The heap makes "pick the biggest passed station" O(log N).'
    },
    hints: [
      `<p><b>Aha:</b> drive as far as you can. Only when you cannot go further do you need a stop — and you may pretend you stopped at any station you already passed.</p>`,
      `<p>Push the fuel of every station within reach into a <b>max-heap</b>. While <code>reach &lt; target</code>: add newly reachable stations, then pop the largest fuel (one more stop). If the heap is empty, return −1.</p>`,
      `<p>Keep reach in a 64-bit integer: it can approach 2·10<sup>9</sup>, right next to the 32-bit limit. Recipe: reach = startFuel, stops = 0 → while reach &lt; target: push stations with pos ≤ reach; if heap empty → −1; reach += poll; stops++ → return stops.</p>`
    ],
    tests: { sig: 'int int int[][] -> int', fn: 'minRefuelStops', cases: [
      [[100, 10, [[10, 60], [20, 30], [30, 30], [60, 40]]], 2],
      [[100, 1, [[10, 100]]], -1],
      [[1, 1, []], 0],
      [[100, 50, []], -1],
      [[100, 50, [[50, 50]]], 1],
      [[1000000000, 1, [[1, 999999999]]], 1],
      [[100, 25, [[25, 25], [50, 25], [75, 25]]], 3],
      [[1000, 299, [[13, 21], [26, 115], [100, 47], [225, 99], [299, 141], [444, 198], [608, 190], [636, 157], [647, 255], [841, 123]]], 4],
      [[1000000000, 1000000000, []], 0]
    ] },
    solution: {
      approach: `<p>Lazy, retroactive greedy with a max-heap: each forced stop takes the largest fuel among stations already passed. Stays-ahead proof: after k stops, greedy's reach is the maximum reach possible with any k stops (it is the startFuel plus the k largest fuels among reachable stations), so it reaches the target with the fewest stops. An O(N²) DP (<code>dp[k]</code> = farthest reach with k stops) is the standard alternative.</p>`,
      code: `
        import java.util.*;

        class Solution {
            public int minRefuelStops(int target, int startFuel, int[][] stations) {
                PriorityQueue<Integer> passed = new PriorityQueue<>(Collections.reverseOrder()); // fuel we could have taken
                long reach = startFuel;          // farthest position reachable with stops chosen so far
                int stops = 0, i = 0;
                while (reach < target) {
                    while (i < stations.length && stations[i][0] <= reach) {
                        passed.add(stations[i++][1]);   // within reach: remember it
                    }
                    if (passed.isEmpty()) return -1;   // nothing to refuel from: stuck
                    reach += passed.poll();            // stop at the best station we passed
                    stops++;
                }
                return stops;
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.minRefuelStops(100, 10, new int[][]{{10, 60}, {20, 30}, {30, 30}, {60, 40}}));  // 2
                System.out.println(s.minRefuelStops(100, 1, new int[][]{{10, 100}}));                             // -1
                System.out.println(s.minRefuelStops(1, 1, new int[][]{}));                                        // 0
            }
        }`,
      alt: [{ lang: 'python', code: `import heapq

def min_refuel_stops(target, start_fuel, stations):
    passed = []                # max-heap (negated) of fuel at stations we drove past
    reach, stops, i = start_fuel, 0, 0
    while reach < target:
        while i < len(stations) and stations[i][0] <= reach:
            heapq.heappush(passed, -stations[i][1])
            i += 1
        if not passed:
            return -1          # stuck
        reach -= heapq.heappop(passed)   # stop at the best station we passed
        stops += 1
    return stops` }, { lang: 'js', code: `// JS has no built-in heap: a small binary min-heap with a comparator.
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp; }
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {                                // sift up
      const p = (i - 1) >> 1;
      if (this.cmp(a[i], a[p]) >= 0) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {                                   // sift down
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.cmp(a[l], a[m]) < 0) m = l;
        if (r < a.length && this.cmp(a[r], a[m]) < 0) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function minRefuelStops(target, startFuel, stations) {
  const passed = new MinHeap((a, b) => b - a);   // max-heap of fuel we could have taken
  let reach = startFuel, stops = 0, i = 0;
  while (reach < target) {
    while (i < stations.length && stations[i][0] <= reach) passed.push(stations[i++][1]);
    if (passed.size() === 0) return -1;
    reach += passed.pop();
    stops++;
  }
  return stops;
}` }, { lang: 'cpp', code: `class Solution {
public:
    int minRefuelStops(int target, int startFuel, vector<vector<int>>& stations) {
        priority_queue<int> passed;            // max-heap of fuel at passed stations
        long long reach = startFuel;
        int stops = 0;
        size_t i = 0;
        while (reach < target) {
            while (i < stations.size() && stations[i][0] <= reach) passed.push(stations[i++][1]);
            if (passed.empty()) return -1;
            reach += passed.top();
            passed.pop();
            stops++;
        }
        return stops;
    }
};` }, { lang: 'csharp', code: `using System;
using System.Collections.Generic;

public class Solution
{
    public int MinRefuelStops(int target, int startFuel, int[][] stations)
    {
        var passed = new MinHeap<int>((a, b) => b.CompareTo(a));   // max-heap: fuel we could have taken
        long reach = startFuel;          // farthest position reachable with stops chosen so far
        int stops = 0, i = 0;
        while (reach < target)
        {
            while (i < stations.Length && stations[i][0] <= reach)
            {
                passed.Push(stations[i++][1]);  // within reach: remember it
            }
            if (passed.Count == 0) return -1;  // nothing to refuel from: stuck
            reach += passed.Pop();             // stop at the best station we passed
            stops++;
        }
        return stops;
    }
}

// .NET Framework has no priority queue, so this small binary heap stands in for one:
// Push / Pop / Peek in O(log n); the comparison decides what comes out first.
public class MinHeap<T>
{
    private readonly List<T> a = new List<T>();
    private readonly Comparison<T> cmp;
    public MinHeap(Comparison<T> cmp) { this.cmp = cmp; }
    public int Count { get { return a.Count; } }
    public T Peek() { return a[0]; }
    public void Push(T x)
    {
        a.Add(x);
        int i = a.Count - 1;
        while (i > 0)
        {
            int p = (i - 1) / 2;
            if (cmp(a[i], a[p]) >= 0) break;
            T t = a[i]; a[i] = a[p]; a[p] = t; i = p;
        }
    }
    public T Pop()
    {
        T top = a[0];
        T last = a[a.Count - 1];
        a.RemoveAt(a.Count - 1);
        if (a.Count > 0)
        {
            a[0] = last;
            int i = 0;
            while (true)
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && cmp(a[l], a[m]) < 0) m = l;
                if (r < a.Count && cmp(a[r], a[m]) < 0) m = r;
                if (m == i) break;
                T t = a[i]; a[i] = a[m]; a[m] = t; i = m;
            }
        }
        return top;
    }
}` }],
      complexity: `<p><b>Time O(N log N)</b>: each station is pushed and popped at most once. <b>Space O(N)</b>.</p>`,
      followUps: ['Write the O(N²) DP and compare.', 'The tank has a maximum capacity: what changes?', 'Each stop costs money proportional to the fuel taken.']
    }
  });

  // =====================================================================
  // QUIZ
  // =====================================================================
  quiz.push(
    {
      q: 'Which two properties must a problem have for a greedy algorithm to be optimal?',
      options: ['Overlapping subproblems and memoization', 'Greedy choice property and optimal substructure', 'Monotonicity and binary searchability', 'Sorted input and unique answers'],
      answer: 1,
      explain: 'Greedy choice property: some optimal answer contains the greedy first choice. Optimal substructure: after that choice, the rest is a smaller instance whose optimum completes the overall optimum. Overlapping subproblems is the DP signal.'
    },
    {
      q: 'In an exchange-argument proof, what do you do with an optimal solution O that differs from greedy\'s solution G?',
      options: ['Show O is invalid', 'Modify O step by step to agree with G without making it worse', 'Show G is shorter than O', 'Run both on random inputs'],
      answer: 1,
      explain: 'Find the first difference, swap/replace to match G, prove validity and no loss, repeat. At the end O has become G, so G is optimal.'
    },
    {
      q: 'Which greedy key is <b>always</b> optimal for "maximum number of non-overlapping meetings in one room"?',
      options: ['Earliest start', 'Shortest duration', 'Earliest end', 'Fewest overlaps with other meetings'],
      answer: 2,
      explain: 'Earliest start fails on (0,10),(1,2),(3,4): it takes (0,10) and gets 1 instead of 2. Shortest fails on (1,5),(4,7),(6,10). Earliest end is always correct (exchange / stays-ahead proof).'
    },
    {
      q: 'Job sequencing (unit jobs). Jobs X(deadline 2, profit 50) and Y(deadline 1, profit 40). Processing by profit, where should X be placed?',
      options: ['Slot 1', 'Slot 2 (the latest free slot within its deadline)', 'Either slot', 'X should be skipped'],
      answer: 1,
      explain: 'Slot 2 leaves slot 1 free for Y, total 90. Putting X in slot 1 blocks Y and gives only 50.'
    },
    {
      q: 'Items (value, weight): (60,10), (100,20), (120,30), capacity 50. What are the fractional and 0/1 optimal values?',
      options: ['240 and 240', '240 and 220', '220 and 160', '160 and 220'],
      answer: 1,
      explain: 'Fractional: 60 + 100 + 2/3·120 = 240. 0/1: items 2 and 3 (weights 20 + 30) = 220. Ratio greedy on whole items would get only 160.'
    },
    {
      q: 'Huffman frequencies 1, 1, 2, 4. What is the total number of encoded bits?',
      options: ['14', '15', '16', '8'],
      answer: 0,
      explain: 'Merges: 1+1 = 2 (cost 2), 2+2 = 4 (cost 4), 4+4 = 8 (cost 8). Total 2 + 4 + 8 = 14. Check: depths 3, 3, 2, 1 → 1·3 + 1·3 + 2·2 + 4·1 = 14.'
    },
    {
      q: 'Minimum platforms: train A 9:00–10:00 and train B 10:00–11:00, and a platform CANNOT serve an arrival and a departure at the same instant. Which comparison does the two-pointer sweep use?',
      options: ['<code>arr[i] &lt; dep[j]</code> → answer 1', '<code>arr[i] &lt;= dep[j]</code> → answer 2', '<code>arr[i] &gt; dep[j]</code> → answer 0', 'The tie rule does not matter'],
      answer: 1,
      explain: 'Processing the arrival first on ties counts both trains as present at 10:00 → 2 platforms. The LeetCode Meeting Rooms convention (half-open intervals) uses &lt; and gets 1.'
    },
    {
      q: 'Gas station: gain = gas − cost = [−1, 2, −3, 4]. What does the one-pass greedy return?',
      options: ['0', '1', '3', '−1'],
      answer: 2,
      explain: 'Total = 2 ≥ 0. Tank: −1 → reset, start 1; +2 = 2; 2 − 3 = −1 → reset, start 3; +4 = 4. Answer 3. Check from 3: 4 → 3 → 5 → 2, never negative.'
    },
    {
      q: 'Jump Game II on [2, 3, 1, 1, 4]. What do the variables (jumps, curEnd) look like after scanning index 0?',
      options: ['(0, 0)', '(1, 2)', '(1, 4)', '(2, 4)'],
      answer: 1,
      explain: 'At i = 0, farthest = 2 and i == curEnd (0), so jumps becomes 1 and curEnd becomes 2: with one jump you can stand anywhere in [1, 2].'
    },
    {
      q: 'For coins {1, 3, 4}, what is the smallest amount where "biggest coin first" is not optimal?',
      options: ['5', '6', '7', '8'],
      answer: 1,
      explain: '6: greedy 4 + 1 + 1 = 3 coins, optimal 3 + 3 = 2 coins. Amounts 1..5 are fine. Kozen–Zaks says the smallest counterexample is below 4 + 3 = 7, consistent with 6.'
    },
    {
      q: 'Which of these problems is NOT correctly solved by a simple greedy?',
      options: ['Maximum number of non-overlapping intervals', 'Fractional knapsack', 'Weighted interval scheduling (maximize total profit)', 'Minimum arrows to burst balloons'],
      answer: 2,
      explain: 'With profits, earliest end can sacrifice one very valuable interval for two cheap ones. It needs DP with binary search.'
    },
    {
      q: 'In Java or C++, why is the comparator <code>x[1] - y[1]</code> risky for interval problems with values in [−2<sup>31</sup>, 2<sup>31</sup> − 1]?',
      options: ['It is O(N²)', 'The subtraction can overflow, producing a wrong sign and a wrong order', 'It is not stable', 'It sorts in descending order'],
      answer: 1,
      explain: 'E.g. 2147483647 − (−2147483648) overflows to −1 in a 32-bit int. Use Integer.compare / Long.compare in Java and plain < in C++. Python and JS numbers do not wrap, so the subtraction is safe there.'
    },
    {
      q: 'Smith\'s rule: to minimize Σ weight × finish time on one machine, order jobs by…',
      options: ['Shortest time first', 'Largest weight first', 'Smallest time / weight first', 'Earliest deadline first'],
      answer: 2,
      explain: 'Swapping neighbours a, b changes the cost by w<sub>a</sub>t<sub>b</sub> − w<sub>b</sub>t<sub>a</sub>, so a goes first iff t<sub>a</sub>/w<sub>a</sub> &lt; t<sub>b</sub>/w<sub>b</sub>. With equal weights it becomes shortest job first.'
    },
    {
      q: 'Which statement about matroids and greedy is correct?',
      options: ['Greedy is optimal for every problem with optimal substructure', 'Greedy "add the heaviest element that keeps the set independent" is optimal for all weights exactly when the structure is a matroid', 'Matroids only apply to graphs', '0/1 knapsack is a matroid'],
      answer: 1,
      explain: 'Rado–Edmonds theorem. Graphic matroids give Kruskal, scheduling matroids give job sequencing. Knapsack is not a matroid, so greedy fails there.'
    }
  );

  // =====================================================================
  // INTERVIEW Q&A
  // =====================================================================
  interview.push(
    {
      q: 'What is a greedy algorithm, and how is it different from dynamic programming?',
      level: 'B',
      a: `<p>A greedy algorithm builds the answer step by step, always taking the choice that looks best right now and <b>never revisiting it</b>. DP instead considers <b>every</b> choice at each step and reuses answers to overlapping subproblems. Greedy is a special case that works when one local choice is provably safe (greedy choice property); DP is the fallback when you cannot prove that. Greedy is typically O(N log N) and O(1) extra space; DP is often O(N·W) or O(N²) time and memory. Example: fractional knapsack → greedy by ratio; 0/1 knapsack → DP.</p>`,
      followUps: ['Give a problem where both work and greedy is faster.', 'Can every greedy be rewritten as a DP?']
    },
    {
      q: 'How do you convince an interviewer that your greedy is correct?',
      level: 'I',
      a: `<p>I use one of three arguments. <b>Exchange argument:</b> take any optimal solution that differs from mine, swap one piece to match my choice, show it stays valid and is no worse, repeat. <b>Greedy stays ahead:</b> define a measure after k steps (k-th finish time, reach) and prove by induction mine is always at least as good. <b>Structural bound:</b> show a lower bound every solution must meet (e.g. max overlap for meeting rooms) and that greedy meets it. Before any of that I spend a minute trying to break the greedy with 2–4 item inputs; if I cannot break it and one argument fits, I am confident. If time is short, I offer a brute-force stress test.</p>`,
      followUps: ['Walk me through the exchange argument for activity selection.', 'What does "greedy stays ahead" look like for Jump Game II?']
    },
    {
      q: 'Why does activity selection sort by end time and not by start time or duration?',
      level: 'B',
      a: `<p>Ending earliest frees the room soonest, leaving the maximum time for the rest. Counterexamples kill the others: <b>earliest start</b> on (0,10),(1,2),(3,4) picks (0,10) and gets 1 instead of 2; <b>shortest</b> on (1,5),(4,7),(6,10) picks (4,7), which blocks both others, giving 1 instead of 2. Proof for end time: any optimal schedule's first meeting can be replaced by the earliest-ending meeting — it ends no later, so nothing after it conflicts. Then induct on the remaining meetings that start after it.</p>`,
      followUps: ['What if touching meetings are not allowed?', 'What if meetings have profits?']
    },
    {
      q: 'Explain job sequencing with deadlines and why each job goes into the latest free slot.',
      level: 'I',
      a: `<p>Unit-time jobs with deadlines and profits; maximize profit. Process jobs by profit descending; place each in the latest free slot ≤ its deadline, skip if none. <b>Richest first</b> is safe by exchange: if an optimal schedule omits the richest job g, either a slot ≤ d<sub>g</sub> is free (add g, contradiction) or one holds a cheaper job (swap it out). <b>Latest slot</b> keeps early slots open for jobs with tight deadlines: X(d=2, 50), Y(d=1, 40) — earliest-slot placement gets 50, latest-slot gets 90. For speed, a DSU with <code>find(t)</code> = latest free slot ≤ t makes it O(N log N + N α(N)); an alternative sorts by deadline and keeps a min-heap of profits, popping the smallest when the heap exceeds the deadline.</p>`,
      followUps: ['Why is the set of feasible job sets a matroid?', 'How do you handle deadlines up to 10^9?']
    },
    {
      q: 'Why does greedy work for fractional knapsack but not for 0/1 knapsack?',
      level: 'I',
      a: `<p>In the fractional version you can think of every item as 1-kg slices worth the item's ratio. If a cheaper slice is in the bag while a better slice is outside, swapping them increases value — so the best bag is filled by ratio, highest first. In 0/1, items are indivisible; taking the best-ratio item can leave an awkward gap that no remaining item fills. Example: capacity 50, items (60,10), (100,20), (120,30): ratio greedy takes 60 + 100 = 160 and cannot fit 120; the optimum is 100 + 120 = 220. The fractional value (240) is still useful as an upper bound in branch-and-bound.</p>`,
      followUps: ['Can you do fractional knapsack in O(N)?', 'What approximation does greedy give for 0/1 knapsack?']
    },
    {
      q: 'Walk me through Huffman coding and why merging the two smallest frequencies is optimal.',
      level: 'A',
      a: `<p>Put all characters in a min-heap by frequency. Repeatedly pop the two smallest, create a parent with their sum, push it back; after N − 1 merges the last node is the root; left = 0, right = 1. Total bits = Σ freq × depth = the sum of all merged weights. Proof: (1) <b>exchange</b> — in some optimal tree the two rarest characters are sibling leaves at the deepest level (swapping a rarer character deeper never increases cost); (2) <b>reduction</b> — merging them into one symbol of weight f<sub>x</sub> + f<sub>y</sub> gives a smaller instance whose optimal tree, expanded, is optimal for the original (cost differs by exactly f<sub>x</sub> + f<sub>y</sub>). Complexity O(N log N), or O(N) with two queues if frequencies are pre-sorted. Real use: DEFLATE/gzip/PNG, JPEG, HPACK, zstd literals.</p>`,
      followUps: ['What is a canonical Huffman code?', 'How far is Huffman from the entropy?', 'How do you handle a single distinct character?']
    },
    {
      q: 'How do you find the minimum number of meeting rooms or train platforms?',
      level: 'I',
      a: `<p>The answer is the <b>maximum number of intervals overlapping at any instant</b>. Sort start times and end times separately and sweep with two pointers: a start before the next end adds a room, otherwise an end frees one; track the max. That is O(N log N). A min-heap of end times (sorted by start) gives the same count and also the actual room assignment. For small integer times, a difference array is O(N + T). Correctness: every solution needs ≥ max overlap rooms, and the greedy "reuse any free room" never opens room k unless k intervals overlap at that moment. The tie rule (arrival == departure) must match the problem: GFG platforms counts both; LeetCode Meeting Rooms lets them share.</p>`,
      followUps: ['Return which room each meeting uses.', 'Meetings are added online one at a time — what structure?']
    },
    {
      q: 'Explain the Gas Station greedy and why it is correct.',
      level: 'I',
      a: `<p>Compute gain = gas − cost. If Σgain &lt; 0, return −1 — no start can create fuel. Otherwise scan with a running tank from a candidate start; when the tank goes negative at i, set start = i + 1 and tank = 0. <b>Why skipping is safe:</b> starting at s you reached every station m between s and i with ≥ 0 fuel and still failed; starting fresh at m gives 0 fuel there, so it fails too. <b>Why the final candidate works:</b> it sits right after the minimum prefix sum; from there all partial sums are ≥ the minimum, and wrapping around adds a non-negative total. O(N) time, O(1) space.</p>`,
      followUps: ['What is the minimum initial fuel if you must start at station 0?', 'What if the tank has a capacity limit?']
    },
    {
      q: 'Jump Game II: why is the O(N) greedy optimal, and what is the common wrong greedy?',
      level: 'A',
      a: `<p>Wrong greedy: "always jump as far as possible" — on [2,3,1,1,4] it goes 0 → 2 → 3 → 4 (3 jumps) instead of 0 → 1 → 4 (2). Right greedy: indices reachable in ≤ k jumps form a prefix [0, R<sub>k</sub>] because you can always jump shorter. R<sub>k+1</sub> = max(i + nums[i]) over i ≤ R<sub>k</sub>. Scanning with curEnd = R<sub>k</sub> and farthest = R<sub>k+1</sub>, incrementing jumps whenever i reaches curEnd, computes exactly these values — it is BFS where each level is an interval, so the queue collapses into two integers. The first k with R<sub>k</sub> ≥ n − 1 is optimal (greedy stays ahead). O(N) time, O(1) space.</p>`,
      followUps: ['Return the path.', 'How do "minimum taps to water a garden" and "video stitching" reduce to this?']
    },
    {
      q: 'Give an example where greedy fails and explain how you would detect it during an interview.',
      level: 'B',
      a: `<p>Coin change with coins {1, 3, 4} and amount 6: biggest-first gives 4 + 1 + 1 = 3 coins; optimal is 3 + 3 = 2. With {3, 4}, greedy even reports "impossible" (4, then 2 left) though 3 + 3 works. Detection: state the greedy rule, then try tiny, awkward inputs — near-ties, sizes that do not divide each other, an expensive item that blocks two cheaper ones. If I break it, I switch to DP (here O(amount × coins)). If I cannot break it and cannot prove it, I propose a brute-force stress test. Real currencies are designed to be canonical, so "it works for rupees/dollars" is not evidence.</p>`,
      followUps: ['What is a canonical coin system and how do you test one?', 'How does the DP for fewest coins work?']
    },
    {
      q: 'What is a matroid, and why does it matter for greedy algorithms?',
      level: 'E',
      a: `<p>A matroid is a ground set with a family of "independent" subsets that is (1) <b>hereditary</b> — subsets of independent sets are independent — and (2) has the <b>exchange property</b> — if A and B are independent and |A| &gt; |B|, some element of A \\ B can be added to B keeping it independent. Rado–Edmonds theorem: the greedy "sort by weight descending, add if still independent" returns a maximum-weight basis for <b>every</b> weight function exactly when the structure is a matroid. Examples: forests in a graph (graphic matroid → Kruskal's MST), sets of unit jobs that can all meet deadlines (job sequencing), any k elements (top-k). Knapsack and coin change are not matroids, so greedy has no guarantee there. Practical use: if you can show the feasible sets satisfy the exchange property, the greedy proof is free.</p>`,
      followUps: ['Show that the job-sequencing feasibility family has the exchange property.', 'What is the intersection of two matroids, and why is greedy not enough there?']
    },
    {
      q: 'Your greedy uses a custom comparator. What can go wrong (Java first, then other languages)?',
      level: 'A',
      a: `<p>Three things. (1) <b>Overflow:</b> <code>(a, b) -&gt; a - b</code> breaks for values near ±2<sup>31</sup>; use <code>Integer.compare</code>. (2) <b>Precision:</b> comparing <code>double</code> ratios can mis-order close values; for v<sub>1</sub>/w<sub>1</sub> vs v<sub>2</sub>/w<sub>2</sub> compare <code>(long) v1 * w2</code> with <code>(long) v2 * w1</code>. Casting a double difference to int (<code>(int)(r2 - r1)</code>) is a classic bug — 0.7 becomes 0. (3) <b>Contract violations:</b> a comparator that is not transitive or not consistent can make TimSort throw <code>IllegalArgumentException: Comparison method violates its general contract!</code> or silently produce a wrong order. In other languages: C++ <code>std::sort</code> with a broken comparator is undefined behaviour and <code>a - b</code> overflow is too, so return <code>a &lt; b</code>; Python keys and JS <code>a - b</code> cannot overflow, but JS <code>sort()</code> with no comparator compares numbers as strings. Exchange-derived rules (like Largest Number's a+b vs b+a) must be shown transitive. Also make sure the proof holds for any tie order, or break ties explicitly.</p>`,
      followUps: ['Prove the Largest Number comparator is transitive.', 'Why does Java use TimSort for objects and dual-pivot quicksort for primitives?']
    },
    {
      q: 'How would you use an AI assistant when solving a greedy problem, and what would you not trust it with?',
      level: 'I',
      a: `<p>I use it to <b>attack</b> my solution, not to replace my reasoning: "find the smallest input where this greedy is not optimal", "write a brute force and a random tester comparing it with my code", "list every boundary rule this statement implies (touching intervals, ties, overflow)". I do not trust its claim that a greedy is correct, because it will produce a fluent but hand-wavy proof, or apply a memorised template (ratio greedy, earliest end) to a look-alike problem where it fails, such as 0/1 knapsack or weighted intervals. I verify by the stress test and by writing the exchange argument myself. In an interview, I own the counterexample hunt and the proof; the code is the cheap part now.</p>`,
      followUps: ['Design a stress-testing harness in 10 lines.', 'How do you review AI-written comparator code?']
    },
    {
      q: 'Greedy algorithms in production: where have you seen them, and what trade-offs come with them?',
      level: 'E',
      a: `<p>Schedulers (Earliest Deadline First in real-time systems, shortest-job-first approximations in batch queues), compression (Huffman in DEFLATE/JPEG/HPACK), networking (Dijkstra's greedy shortest paths inside link-state routing such as OSPF and IS-IS), memory allocators (first-fit/best-fit), cache eviction (LRU is a greedy heuristic; Belady's offline optimum evicts the item used furthest in the future), ad allocation and bin packing (first-fit decreasing). The trade-off: many of these underlying problems are NP-hard, so the greedy is an <b>approximation</b> chosen for speed and simplicity, with known bounds (set cover ≈ ln n, FFD ≤ 11/9·OPT + 6/9). Production concerns are tie-breaking determinism, stability under small input changes, and monitoring for adversarial inputs that hit the worst case.</p>`,
      followUps: ['Why is Belady\'s algorithm optimal but impractical?', 'When would you accept an approximation over an exact DP?']
    }
  );

  registerModule({
    id: 'dsa16',
    title: 'Greedy Algorithms',
    intro: `<p>A <b>greedy algorithm</b> builds its answer one step at a time and, at every step, grabs the option that looks best <i>right now</i> — the meeting that ends first, the job that pays most, the spice that is worth most per kilo, the two smallest piles to merge. No going back, no trying every possibility. When it works, it is the fastest and shortest code you will ever write in an interview: usually <b>a sort or a heap plus one loop</b>.</p>
      <p>The catch: greedy is <b>often wrong</b>, and wrong quietly. So this module teaches the two halves together. First, the <b>proof tools</b> — exchange arguments, "greedy stays ahead" and lower-bound arguments — so you can say <i>why</i> a greedy is safe. Then the classic problems interviewers love: <b>activity selection</b>, <b>job sequencing with deadlines</b>, <b>fractional knapsack</b>, <b>Huffman coding</b>, <b>minimum platforms</b>, <b>gas station</b> and <b>jump game</b>. Finally the most important skill of all: spotting <b>when greedy fails</b> (the coin change counterexample) and switching to Dynamic Programming.</p>
      <p>Every topic has an animated visualizer, worked examples, clue phrases that give the pattern away, a guided problem with a dry run, and a note on how AI assistants help — and where they confidently get greedy wrong.</p>`,
    goals: [
      'Explain the <b>greedy choice property</b> and <b>optimal substructure</b> in plain words, and prove a greedy correct with an <b>exchange argument</b> or a <b>"greedy stays ahead"</b> argument',
      'Solve activity selection, non-overlapping intervals and minimum arrows with the <b>earliest-end-first</b> sweep in O(N log N)',
      'Solve <b>job sequencing with deadlines</b> (profit-first + latest free slot with DSU, or deadline-sorted min-heap) and explain why the latest slot matters',
      'Solve <b>fractional knapsack</b> by value per weight and show in 20 seconds why the same idea fails for 0/1 knapsack',
      'Build a <b>Huffman code</b> with a min-heap, compute total bits, and recognise "connect ropes / merge files" as the same problem',
      'Find the <b>minimum platforms / meeting rooms</b> with a sweep line and choose the right tie rule',
      'Solve <b>Gas Station</b> and <b>Jump Game I/II</b> in O(N) and justify the skip rule and BFS-level window',
      'Break a wrong greedy with a tiny <b>counterexample</b> (coins {1, 3, 4}, amount 6), know what a canonical coin system is, and switch to DP'
    ],
    prereqs: `<p><b>DSA 7 (Sorting &amp; Intervals)</b> — custom comparators, merging intervals. <b>DSA 15 (Heaps)</b> — <code>PriorityQueue</code> for Huffman, meeting rooms and job sequencing. Helpful: <b>DSA 5 (Prefix Sums)</b> for the gas-station proof and <b>DSA 11 (Recursion)</b> for the brute forces. DSU (union-find) appears once as an optional speed-up and is taught fully in DSA 19.</p>`,
    hours: 14,
    langNotes: {
      java: `<p><b>Java:</b> greedy code is mostly "sort by a key, then one pass". Sorting <code>int[][]</code> or <code>Integer[]</code> with a lambda needs a safe comparator: <code>Integer.compare(a[1], b[1])</code>, never <code>a[1] - b[1]</code>, because <code>int</code> overflow wraps silently (balloon coordinates reach ±2<sup>31</sup>), and a comparator that breaks transitivity can make TimSort throw <code>IllegalArgumentException</code>. Compare ratios by cross-multiplying in <code>long</code>, and keep totals such as waiting time, Huffman bits or weighted cost in <code>long</code>. <code>PriorityQueue</code> is a <b>min</b>-heap; pass <code>Collections.reverseOrder()</code> for the max-heaps in IPO, Course Schedule III and refuelling. <code>Arrays.sort</code> on <code>int[]</code> sorts primitives in place (dual-pivot quicksort), so <code>clone()</code> first if the caller's array must stay as it was. Recursion is fine to about 10<sup>4</sup> frames; the only recursion here is the Huffman code DFS, whose depth stays below about 45 because frequencies are at most 10<sup>9</sup>.</p>`,
      python: `<p><b>Python:</b> <code>sorted(items, key=...)</code> is stable and returns a new list, so the caller's data is untouched; for pairwise rules like Largest Number or exact ratio comparison, wrap a comparator with <code>functools.cmp_to_key</code>. Integers never overflow, so <code>a - b</code> in a comparator is always safe and cross-multiplied ratios stay exact. <code>/</code> always gives a float and <code>//</code> floors. <code>heapq</code> is a <b>min-heap only</b>: push negated values for the max-heaps (IPO, Course Schedule III, refuelling), and push <code>(freq, counter, node)</code> tuples for Huffman so nodes are never compared on ties. <code>collections.Counter</code> does the Task Scheduler counts. <code>list.insert(k, x)</code> is O(N), fine for Queue Reconstruction's N ≤ 2000. <code>list.pop(0)</code> is also O(N): use <code>deque.popleft()</code> for the two-queue Huffman. Recursion stops at <b>1000</b> frames, which is why the Huffman code assignment here uses an explicit stack.</p>`,
      js: `<p><b>JavaScript:</b> <code>array.sort()</code> with no comparator compares <b>as strings</b> (<code>[10, 9, 1]</code> becomes <code>[1, 10, 9]</code>), so always pass <code>(a, b) =&gt; a - b</code>, or sort a typed array (<code>Int32Array.from(a).sort()</code> is numeric). <code>sort</code> works in place, so spread first (<code>[...a].sort(...)</code>) to keep the input. Numbers are doubles: <code>a - b</code> cannot overflow at these sizes and cross products up to 10<sup>10</sup> are exact, but integers are exact only up to 2<sup>53</sup> (Huffman totals here stay below 2·10<sup>15</sup>; use <code>BigInt</code> past 2<sup>53</sup>). <code>/</code> gives fractions, so use <code>Math.floor</code> for integer division. There is <b>no built-in heap</b>: Huffman, IPO, Course Schedule III, refuelling and the lesson code include the same small <code>MinHeap</code> class (<code>push</code>, <code>pop</code>, <code>peek</code>, <code>size</code>, with a comparator); pass <code>(a, b) =&gt; b - a</code> to get a max-heap. <code>array.shift()</code> is O(N), so move a head index instead. Recursion is fine to about 10<sup>4</sup> frames.</p>`,
      cpp: `<p><b>C++:</b> <code>sort</code> takes a "less than" comparator: return <code>a[1] &lt; b[1]</code>, never <code>a[1] - b[1]</code>, because signed overflow is undefined behaviour, and a comparator that is not a strict weak ordering (for example <code>&lt;=</code>) is also undefined behaviour and can crash. Use <code>long long</code> for totals and for cross-multiplied ratios (<code>(long long) v1 * w2</code>), and cast to <code>double</code> before dividing in fractional knapsack. <code>priority_queue</code> is a <b>max</b>-heap by default (perfect for IPO, Course Schedule III and refuelling); use <code>priority_queue&lt;T, vector&lt;T&gt;, greater&lt;T&gt;&gt;</code> for the min-heaps in Huffman and Meeting Rooms. Taking a <code>vector</code> by value gives the function its own copy to sort; take it by reference when you must not copy. Huffman nodes live in a <code>deque</code> pool, so their addresses stay valid and they are freed automatically. The default stack is about 8 MB, far more than the shallow Huffman DFS needs.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
