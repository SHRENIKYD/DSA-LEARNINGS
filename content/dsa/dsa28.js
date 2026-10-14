(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // ---------- small shared helpers for the visualizers ----------
  function one(k, v) { var o = {}; o[k] = v; return o; }
  function txt(label, html) { return { type: 'text', label: label, html: html }; }
  function parseNums(input, minN, maxN, lo, hi, what) {
    var s = String(input === undefined ? '' : input).trim();
    if (!s) throw new Error('Please type whole numbers separated by spaces');
    var a = s.split(/[\s,]+/).map(Number);
    if (a.some(function (x) { return !Number.isInteger(x); })) throw new Error('Only whole numbers please for ' + (what || 'the list'));
    if (a.length < minN || a.length > maxN) throw new Error('Use ' + minN + ' to ' + maxN + ' numbers for ' + (what || 'the list'));
    if (a.some(function (x) { return x < lo || x > hi; })) throw new Error('Numbers for ' + (what || 'the list') + ' must be between ' + lo + ' and ' + hi);
    return a;
  }

  // ---------- the master pattern map, shared by topic 1 and the quiz ----------
  var CATS = [
    { id: 'ARR', label: 'Array / String', x: 32, y: 23, kw: ['array', 'string', 'subarray', 'substring', 'list', 'numbers', 'sorted', 'characters', 'integers', 'interval'] },
    { id: 'TREE', label: 'Tree / Words', x: 32, y: 53, kw: ['tree', 'bst', 'root', 'node', 'words', 'dictionary', 'prefix'] },
    { id: 'GRAPH', label: 'Graph / Grid', x: 32, y: 74, kw: ['graph', 'grid', 'island', 'edge', 'network', 'course', 'prerequisite', 'matrix', 'maze', 'city', 'cities', 'flight'] },
    { id: 'OPT', label: 'Optimize / Count', x: 32, y: 95, kw: ['ways', 'minimum', 'maximum', 'optimal', 'all ', 'generate', 'choose', 'fewest', 'largest', 'smallest', 'count'] }
  ];
  var PATS = [
    { id: 'TP', label: 'Two Pointers', cat: 'ARR', x: 60, y: 5, kw: ['sorted', 'pair', 'two sum', 'palindrome', 'reverse', 'container', '3sum', 'triplet', 'in-place', 'in place'] },
    { id: 'SW', label: 'Sliding Window', cat: 'ARR', x: 87, y: 5, kw: ['substring', 'subarray', 'window', 'consecutive', 'at most k', 'longest', 'contiguous', 'distinct', 'without repeating'] },
    { id: 'PH', label: 'Prefix Sum + Hash', cat: 'ARR', x: 60, y: 17, kw: ['sum equals k', 'sum = k', 'sum k', 'negative', 'range sum', 'count subarrays', 'prefix sum', 'equal number of'] },
    { id: 'BS', label: 'Binary Search', cat: 'ARR', x: 87, y: 17, kw: ['sorted', 'minimize the maximum', 'maximize the minimum', 'minimum speed', 'capacity', 'rotated', 'log n', 'kth smallest', 'at least', 'within d days'] },
    { id: 'MS', label: 'Monotonic Stack', cat: 'ARR', x: 60, y: 29, kw: ['next greater', 'next smaller', 'previous greater', 'previous smaller', 'span', 'histogram', 'temperatures', 'visible', 'warmer'] },
    { id: 'HP', label: 'Heap', cat: 'ARR', x: 87, y: 29, kw: ['top k', 'kth largest', 'k closest', 'merge k', 'median', 'stream', 'most frequent', 'k most'] },
    { id: 'BIT', label: 'Bit Tricks', cat: 'ARR', x: 74, y: 41, kw: ['xor', 'single number', 'bitmask', 'power of two', 'appears once', 'only once', 'bits'] },
    { id: 'TR', label: 'Tree DFS / BFS', cat: 'TREE', x: 60, y: 53, kw: ['tree', 'root', 'ancestor', 'depth', 'bst', 'path sum', 'subtree', 'level order', 'leaf'] },
    { id: 'TRIE', label: 'Trie', cat: 'TREE', x: 87, y: 53, kw: ['prefix', 'autocomplete', 'dictionary', 'starts with', 'words'] },
    { id: 'BFS', label: 'Graph BFS / DFS', cat: 'GRAPH', x: 60, y: 65, kw: ['grid', 'island', 'shortest path', 'minimum steps', 'fewest steps', 'connected', 'neighbors', 'maze', 'rot', 'spread'] },
    { id: 'TOPO', label: 'Topological Sort', cat: 'GRAPH', x: 87, y: 65, kw: ['prerequisite', 'dependency', 'dependencies', 'order of tasks', 'course', 'build order', 'before'] },
    { id: 'DSU', label: 'Union-Find', cat: 'GRAPH', x: 60, y: 77, kw: ['groups', 'merge accounts', 'redundant', 'union', 'same group', 'friend circles', 'components'] },
    { id: 'DIJ', label: 'Dijkstra', cat: 'GRAPH', x: 87, y: 77, kw: ['weighted', 'cheapest', 'minimum cost path', 'network delay', 'effort', 'travel time', 'weights'] },
    { id: 'GR', label: 'Greedy + Sort', cat: 'OPT', x: 60, y: 89, kw: ['intervals', 'meeting', 'minimum number of', 'jump', 'earliest', 'deadline', 'rooms', 'arrows'] },
    { id: 'DP', label: 'Dynamic Programming', cat: 'OPT', x: 87, y: 89, kw: ['number of ways', 'how many ways', 'minimum cost', 'maximum profit', 'can you reach', 'increasing subsequence', 'partition', 'knapsack', 'fewest coins', 'edit'] },
    { id: 'BT', label: 'Backtracking', cat: 'OPT', x: 74, y: 101, kw: ['all subsets', 'all permutations', 'all combinations', 'generate all', 'n-queens', 'sudoku', 'every possible', 'list all'] }
  ];
  function mapGraph(hl, ehl, tags) {
    var nodes = [{ id: 'Q', label: 'Problem', x: 6, y: 58, shape: 'box' }];
    var edges = [];
    CATS.forEach(function (c) { nodes.push({ id: c.id, label: c.label, x: c.x, y: c.y, shape: 'box' }); edges.push(['Q', c.id]); });
    PATS.forEach(function (p) { nodes.push({ id: p.id, label: p.label, x: p.x, y: p.y, shape: 'box' }); edges.push([p.cat, p.id]); });
    return { type: 'graph', label: 'Master pattern map (clue → technique)', directed: true, height: 106, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
  }

  // =====================================================================
  // TOPIC 1 — The master pattern map
  // =====================================================================
  topics.push({
    title: 'The Master Pattern Map: Clue → Technique',
    analogy: `<p>A good doctor does not run every test on every patient. She listens for <b>symptoms</b>: "fever + rash" points to one short list, "chest pain on stairs" to another. Then she confirms with one or two targeted tests.</p>
      <p>Interview problems work the same way. The question text is full of <b>symptoms</b> ("sorted", "contiguous", "minimize the maximum", "prerequisites", "number of ways"). Each symptom points to a short list of <b>techniques</b> you already learned in DSA 1–27. This topic is your "symptom → diagnosis" chart.</p>`,
    explain: `<p>You have now met about <b>25 core patterns</b>. Knowing them is not the hard part any more. The hard part in a real interview is <b>picking the right one in the first 5 minutes</b>, when you are nervous and the problem is dressed up in a story about trucks, bananas or meeting rooms.</p>
      <p>The trick: <b>strip the story, keep the shape</b>. Every problem has three things that give the pattern away:</p>
      <ol>
        <li><b>The input shape</b> — array / string, tree, graph or grid, stream, intervals, "a design with operations".</li>
        <li><b>The question word</b> — "find one", "count all", "min/max", "is it possible", "list every".</li>
        <li><b>The constraint size</b> — N ≤ 20 smells exponential, N ≤ 10<sup>5</sup> needs O(N log N) or better (Topic 2).</li>
      </ol>
      <h4>The master map (print this in your head)</h4>
      ${H.table(['clue in the question', 'first technique to try', 'learned in'], [
        ['"sorted array" + "pair / triplet with sum"', H.c('g', 'Two pointers from both ends'), 'DSA 6'],
        ['"contiguous subarray / substring" + "longest / shortest" + all values ≥ 0', H.c('g', 'Sliding window (grow / shrink)'), 'DSA 6, 8'],
        ['"subarray sum = K" and <b>negatives allowed</b>', H.c('g', 'Prefix sum + HashMap of counts'), 'DSA 5, 8'],
        ['"range sum" many times, no updates', H.c('g', 'Prefix sums, O(1) per query'), 'DSA 5'],
        ['"range query" + "update" mixed', H.c('g', 'Fenwick / segment tree'), 'DSA 23'],
        ['"sorted" / "rotated" / "find position" in O(log N)', H.c('g', 'Binary search on index'), 'DSA 10'],
        ['"minimize the maximum" / "maximize the minimum" / "smallest speed so that…"', H.c('g', 'Binary search on the answer'), 'DSA 10'],
        ['"next greater / smaller", "how many days until warmer", "histogram"', H.c('g', 'Monotonic stack'), 'DSA 14'],
        ['"max of every window of size k"', H.c('g', 'Monotonic deque'), 'DSA 14'],
        ['"top k", "kth largest", "k closest", "merge k sorted"', H.c('g', 'Heap of size k'), 'DSA 16'],
        ['"running median", "stream"', H.c('g', 'Two heaps'), 'DSA 16'],
        ['"prefix", "starts with", "dictionary of words"', H.c('g', 'Trie'), 'DSA 16'],
        ['"appears once while others twice", "XOR", "subset as mask"', H.c('g', 'Bit manipulation'), 'DSA 4'],
        ['"seen before?", "frequency", "anagram", "duplicates"', H.c('g', 'HashMap / HashSet'), 'DSA 8'],
        ['"linked list" + "middle / cycle / kth from end"', H.c('g', 'Fast &amp; slow pointers'), 'DSA 12'],
        ['"tree" + "height / path / subtree"', H.c('g', 'DFS returning a value upward'), 'DSA 15'],
        ['"level by level", "minimum depth", "right view"', H.c('g', 'BFS with a queue'), 'DSA 15'],
        ['"grid", "islands", "minimum steps", unweighted', H.c('g', 'BFS / DFS flood fill'), 'DSA 20'],
        ['"spreads from many sources at once" (rotting, fire)', H.c('g', 'Multi-source BFS'), 'DSA 20'],
        ['"prerequisites", "order of tasks", "dependencies"', H.c('g', 'Topological sort (Kahn)'), 'DSA 20'],
        ['"groups merge over time", "are these connected?"', H.c('g', 'Union-Find (DSU)'), 'DSA 20'],
        ['"weighted edges" + "cheapest / fastest" (non-negative)', H.c('g', 'Dijkstra'), 'DSA 21'],
        ['"at most K stops / edges"', H.c('g', 'Bellman-Ford K rounds / BFS by level'), 'DSA 21'],
        ['"connect all with minimum total cost"', H.c('g', 'MST (Kruskal + DSU)'), 'DSA 21'],
        ['"intervals", "meetings", "minimum rooms / arrows"', H.c('g', 'Sort + greedy sweep / heap'), 'DSA 7, 17'],
        ['"number of ways", "min cost", "can you reach" + choices at each step', H.c('g', 'Dynamic programming'), 'DSA 18, 19'],
        ['"list / generate ALL subsets / permutations / boards"', H.c('g', 'Backtracking'), 'DSA 11'],
        ['N ≤ 20 and "choose a subset / visit all"', H.c('g', 'Bitmask DP or backtracking'), 'DSA 4, 24'],
        ['"design a cache / iterator / counter" with O(1) operations', H.c('g', 'HashMap + linked list / deque'), 'DSA 12, 27']
      ])}
      <p>Read the left column as <b>symptoms</b>, not rules. Most real problems show two or three symptoms at once; you pick the technique that explains <b>all</b> of them. Example: "subarray" suggests sliding window, but "negative numbers" breaks the window's grow/shrink logic, so prefix sum + hash wins.</p>
      <h4>The 3-question filter (works in 30 seconds)</h4>
      ${H.table(['ask', 'if YES', 'if NO'], [
        ['1. Is the input sorted, or can I sort it without losing what is asked?', 'two pointers / binary search / greedy sweep', 'hashing, heaps, stacks'],
        ['2. Is it about <b>contiguous</b> pieces (subarray / substring)?', 'window, prefix sums, monotonic stack/deque', 'subsets → DP / backtracking'],
        ['3. Are there <b>relationships</b> between items (edges, parent/child, dependencies)?', 'tree / graph algorithms', 'array-family patterns']
      ])}`,
    clues: [
      '"<b>contiguous</b>" or "subarray / substring" → window, prefix sums, or monotonic stack — never subsets DP.',
      '"<b>sorted</b>" anywhere in the statement → two pointers or binary search should be your first thought.',
      '"<b>minimize the maximum</b>" / "maximize the minimum" / "smallest capacity such that" → binary search on the answer.',
      '"<b>number of ways</b>", "min cost", "can you reach" with a choice at each step → DP.',
      '"<b>prerequisites</b>", "depends on", "must come before" → topological sort.',
      '"<b>top k</b>" / "kth" / "k closest" → heap of size k (or quickselect).',
      'N ≤ 20 → exponential is allowed: bitmask or backtracking. N ≤ 10<sup>5</sup> → O(N log N) max.'
    ],
    code: [{ lang: 'python', run: true, title: 'A tiny clue matcher (runnable) — how your brain should scan a statement', code: `# A toy "pattern spotter": score each technique by the clue phrases it sees.
# Real interviews need judgement, but this shows the habit: scan for symptoms first.
RULES = {
    "Two pointers":        ["sorted", "pair", "palindrome", "in-place", "triplet"],
    "Sliding window":      ["substring", "subarray", "longest", "at most k", "contiguous"],
    "Prefix sum + hash":   ["sum equals k", "negative", "count subarrays", "range sum"],
    "Binary search":       ["sorted", "minimize the maximum", "minimum speed", "capacity", "rotated"],
    "Monotonic stack":     ["next greater", "warmer", "histogram", "span"],
    "Heap":                ["top k", "kth largest", "merge k", "median", "stream"],
    "Graph BFS":           ["grid", "minimum steps", "island", "spread", "maze"],
    "Topological sort":    ["prerequisite", "dependency", "order of tasks"],
    "Dynamic programming": ["number of ways", "minimum cost", "partition", "fewest coins"],
    "Backtracking":        ["all subsets", "all permutations", "generate all"],
}

def spot(statement):
    s = statement.lower()
    scores = {}
    for tech, clues in RULES.items():
        hits = [c for c in clues if c in s]          # which symptoms appear?
        if hits:
            scores[tech] = hits
    # most matched clues first
    return sorted(scores.items(), key=lambda kv: -len(kv[1]))

questions = [
    "Given an array with negative numbers, count subarrays whose sum equals k",
    "Find the minimum speed so that Koko eats all bananas within h hours",
    "Return the number of ways to climb n stairs taking 1 or 2 steps",
    "Given prerequisite pairs, return a valid order of tasks for all courses",
    "Find the longest substring with at most k distinct characters",
]
for q in questions:
    print(q)
    for tech, hits in spot(q)[:2]:
        print("   ->", tech, "because of", hits)
` }, `
// The "pattern skeletons" you should be able to type from memory in under 2 minutes each.
class Skeletons {
    // 1) Variable sliding window: longest window where a condition stays valid
    int longestValidWindow(int[] a, int limit) {
        int left = 0, best = 0, sum = 0;
        for (int right = 0; right < a.length; right++) {
            sum += a[right];                    // grow: take a[right] in
            while (sum > limit) sum -= a[left++]; // shrink until valid again
            best = Math.max(best, right - left + 1);
        }
        return best;
    }

    // 2) Binary search on the answer: smallest x where feasible(x) is true
    int smallestFeasible(int lo, int hi, java.util.function.IntPredicate feasible) {
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;       // overflow-safe middle
            if (feasible.test(mid)) hi = mid;   // mid works -> answer is mid or smaller
            else lo = mid + 1;                  // mid fails -> answer is bigger
        }
        return lo;
    }

    // 3) Prefix sum + HashMap: count subarrays with sum exactly k (negatives OK)
    int countSumK(int[] a, int k) {
        Map<Long, Integer> seen = new HashMap<>();
        seen.put(0L, 1);                        // the empty prefix
        long pf = 0; int count = 0;
        for (int x : a) {
            pf += x;
            count += seen.getOrDefault(pf - k, 0); // earlier prefixes that leave sum k
            seen.merge(pf, 1, Integer::sum);
        }
        return count;
    }

    // 4) Monotonic stack: next greater element to the right
    int[] nextGreater(int[] a) {
        int[] ans = new int[a.length];
        Arrays.fill(ans, -1);
        Deque<Integer> st = new ArrayDeque<>(); // indices whose answer is still unknown
        for (int i = 0; i < a.length; i++) {
            while (!st.isEmpty() && a[st.peek()] < a[i]) ans[st.pop()] = a[i];
            st.push(i);
        }
        return ans;
    }

    // 5) BFS on a grid: minimum steps from (0,0) to bottom-right, 1 = wall
    int bfsSteps(int[][] g) {
        int R = g.length, C = g[0].length;
        if (g[0][0] == 1) return -1;
        int[][] dist = new int[R][C];
        for (int[] row : dist) Arrays.fill(row, -1);
        Deque<int[]> q = new ArrayDeque<>();
        q.add(new int[]{0, 0}); dist[0][0] = 0;
        int[] dr = {1, -1, 0, 0}, dc = {0, 0, 1, -1};
        while (!q.isEmpty()) {
            int[] cur = q.poll();
            for (int d = 0; d < 4; d++) {
                int nr = cur[0] + dr[d], nc = cur[1] + dc[d];
                if (nr < 0 || nc < 0 || nr >= R || nc >= C || g[nr][nc] == 1 || dist[nr][nc] != -1) continue;
                dist[nr][nc] = dist[cur[0]][cur[1]] + 1;   // first visit = shortest
                q.add(new int[]{nr, nc});
            }
        }
        return dist[R - 1][C - 1];
    }
}` ],
    codeTitle: ['Clue matcher (Python, runnable)', 'Five pattern skeletons to type from memory (Java)'],
    viz: {
      title: 'Decision flow: from the words in a question to a technique',
      input: 'Given an array with negative numbers, count subarrays whose sum equals k. n <= 10^5',
      inputLabel: 'Paste or type a problem statement (English)',
      gen: function (input) {
        var raw = String(input === undefined ? '' : input).trim();
        if (raw.length < 5) throw new Error('Type a problem statement of at least a few words, e.g. "find the top k most frequent words"');
        if (raw.length > 400) raw = raw.slice(0, 400);
        var s = ' ' + raw.toLowerCase() + ' ';
        var frames = [];
        frames.push({ narr: 'Step 1 — <b>read the statement slowly</b> and ignore the story. We will scan for <b>symptom words</b> that point to techniques. Everything starts at the "Problem" box.', parts: [
          mapGraph({ Q: 'cur' }), txt('Statement', H.esc(raw))
        ] });
        // constraint scan
        var mPow = s.match(/n\s*(<=|≤|<)\s*10\s*\^\s*(\d+)/), mNum = s.match(/n\s*(<=|≤|<)\s*([\d,]+)/);
        var budget = 'No size given — <b>ask the interviewer</b> "how big can N get?" before choosing.';
        if (mPow || mNum) {
          var exp = mPow ? Number(mPow[2]) : Math.round(Math.log10(Math.max(1, Number(mNum[2].replace(/,/g, '')))));
          if (exp <= 1) budget = 'N ≤ ~10: even O(N!) is fine → brute force / permutations allowed.';
          else if (exp <= 2) budget = 'N ≤ ~100: O(N<sup>3</sup>) fits → triple loops, Floyd-Warshall, interval DP.';
          else if (exp <= 3) budget = 'N ≤ ~1000–5000: O(N<sup>2</sup>) fits → 2D DP, all pairs.';
          else if (exp <= 6) budget = 'N ≤ 10<sup>5</sup>–10<sup>6</sup>: need <b>O(N log N) or O(N)</b> → sorting, heaps, hashing, windows, binary search.';
          else budget = 'N ≥ 10<sup>7</sup> or values up to 10<sup>9</sup>+: think <b>O(log N)</b> or math → binary search / formula.';
        }
        frames.push({ narr: 'Step 2 — <b>read the constraints</b> before the techniques. The size of N tells you how fast the answer must be, which crosses whole families off the list.', parts: [
          mapGraph({ Q: 'ok' }), txt('Complexity budget', budget)
        ] });
        // categories
        var catHl = { Q: 'ok' }, catE = {}, catHits = [];
        CATS.forEach(function (c) {
          var hits = c.kw.filter(function (k) { return s.indexOf(k) >= 0; });
          if (hits.length) { catHl[c.id] = 'cur'; catE['Q-' + c.id] = 'ok'; catHits.push(c.label + ': ' + hits.join(', ')); }
        });
        frames.push({ narr: 'Step 3 — <b>what is the input shape?</b> ' + (catHits.length ? 'Shape words found, so we only walk those branches of the map.' : 'No shape word found — assume a plain array and ask the interviewer to confirm.'), parts: [
          mapGraph(catHl, catE), { type: 'set', label: 'shape clues seen', items: catHits.length ? catHits : ['(none — ask!)'] }
        ] });
        // patterns
        var scored = [], hl = Object.assign({}, catHl), ehl = Object.assign({}, catE), tags = {};
        PATS.forEach(function (p) {
          var hits = p.kw.filter(function (k) { return s.indexOf(k) >= 0; });
          if (!hits.length) return;
          scored.push({ p: p, hits: hits });
          hl[p.id] = 'ok'; ehl[p.cat + '-' + p.id] = 'ok'; tags[p.id] = hits.length + ' clue' + (hits.length > 1 ? 's' : '');
          if (!catHl[p.cat]) { hl[p.cat] = 'cur'; ehl['Q-' + p.cat] = 'ok'; }
          var h2 = Object.assign({}, hl); h2[p.id] = 'cur';
          frames.push({ narr: 'Clue hit → <b>' + p.label + '</b> because the statement says ' + hits.map(function (h) { return '"<b>' + H.esc(h) + '</b>"'; }).join(', ') + '. It is a <i>candidate</i>, not a verdict yet.', parts: [
            mapGraph(h2, Object.assign({}, ehl), Object.assign({}, tags)), { type: 'set', label: 'matched phrases', items: hits.slice(), hl: (function () { var o = {}; hits.forEach(function (h) { o[h] = 'ok'; }); return o; })() }
          ] });
        });
        // conflict rules
        var notes = [];
        var has = function (id) { return scored.some(function (x) { return x.p.id === id; }); };
        if (has('SW') && s.indexOf('negative') >= 0) { hl.SW = 'bad'; notes.push('Sliding window <b>breaks with negative numbers</b> (shrinking no longer lowers the sum) → prefer Prefix Sum + Hash.'); }
        if (has('BS') && has('TP') && s.indexOf('pair') < 0 && s.indexOf('sum') < 0) notes.push('"sorted" alone fits both; with no pair/sum wording, binary search is the safer first guess.');
        if (has('DP') && has('GR')) notes.push('Greedy and DP both fit: try to break greedy with a tiny counterexample. If you can, use DP.');
        if (has('BFS') && has('DIJ')) notes.push('Weights present → plain BFS is wrong unless all weights are equal; use Dijkstra (or 0-1 BFS for weights 0/1).');
        if (notes.length) frames.push({ narr: 'Step 4 — <b>cross-check the candidates</b>. Some clues cancel others; this is where most wrong picks are caught.', parts: [
          mapGraph(Object.assign({}, hl), Object.assign({}, ehl), Object.assign({}, tags)), txt('Conflicts resolved', notes.join('<br>'))
        ] });
        scored.sort(function (a, b) {
          var pa = hl[a.p.id] === 'bad' ? -1 : a.hits.length, pb = hl[b.p.id] === 'bad' ? -1 : b.hits.length;
          return pb - pa;
        });
        var fin = Object.assign({}, hl);
        if (scored.length && hl[scored[0].p.id] !== 'bad') fin[scored[0].p.id] = 'sel';
        frames.push({ narr: scored.length ? 'Verdict: start with <b>' + scored[0].p.label + '</b>' + (scored[1] ? ', keep <b>' + scored[1].p.label + '</b> as plan B' : '') + '. Say it out loud: "I see <i>' + H.esc(scored[0].hits[0]) + '</i>, which usually means ' + scored[0].p.label + '. Let me check it on the example."' : 'No clue matched. That is normal for disguised problems: <b>write the brute force first</b>, then ask "what work is repeated?" — the repeated work names the pattern.', parts: [
          mapGraph(fin, Object.assign({}, ehl), Object.assign({}, tags)),
          { type: 'table', label: 'Ranking', columns: ['technique', 'clues', 'status'], rows: scored.length ? scored.map(function (x) { return [x.p.label, x.hits.length, hl[x.p.id] === 'bad' ? 'ruled out' : 'candidate']; }) : [['brute force first', 0, 'fallback']], hl: scored.length ? { 0: 'sel' } : {} }
        ] });
        frames.push({ narr: 'Last step — <b>verify on the sample</b> before coding: run the chosen technique by hand on the given example (2 minutes). If it gives the right output and fits the budget, start coding.', parts: [
          txt('Checklist before coding', '1. Pattern explains <b>every</b> clue? 2. Fits the complexity budget? 3. Works on the sample by hand? 4. Edge cases listed (empty, one item, all equal, negatives, overflow)?')
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Disguised window: "Fruits into baskets"', html: `<p><b>Story:</b> you walk along a row of trees, each with one fruit type, and you have 2 baskets that each hold one type. Collect the most fruit in one continuous walk.</p>
        <p><b>Strip the story:</b> "continuous walk" = <b>contiguous subarray</b>; "2 baskets" = <b>at most 2 distinct values</b>; "most fruit" = <b>longest</b>. Three clues → ${H.c('g', 'sliding window + frequency map')}, O(N).</p>
        ${H.arr([1, 2, 1, 2, 3, 3], { hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g' } })}<p>Window [1,2,1,2] has 2 types → length 4 is the answer.</p>` },
      { title: 'Disguised binary search: "Ship packages within D days"', html: `<p>"Find the <b>least weight capacity</b> of a ship so all packages ship within D days."</p>
        <p>Clue: "<b>least</b> X <b>such that</b> it is possible". If capacity 15 works, 16 also works — the answers are <b>monotonic</b> (NO NO NO YES YES YES). That shape is ${H.c('g', 'binary search on the answer')} between max(weight) and sum(weights), with a greedy O(N) check per guess: O(N log(sum)).</p>` },
      { title: 'Disguised graph: "Alien dictionary"', html: `<p>"Given words sorted in an unknown alphabet, find the alphabet order."</p>
        <p>Comparing neighbours <code>"wrt"</code> vs <code>"wrf"</code> tells you <b>t comes before f</b>. "Comes before" = <b>a directed edge</b>; "find an order" = ${H.c('g', 'topological sort')}. A cycle means no valid alphabet. The words were never called a graph — the relationships give it away.</p>` },
      { title: 'Two clues fighting: "Maximum subarray sum with one deletion"', html: `<p>"Subarray" suggests sliding window, but values are negative and we want a <b>maximum</b>, not a fixed target. Window logic breaks. "Choose to delete or not at each step" is a <b>choice</b> → ${H.c('g', 'DP with two states')} (best ending here with no deletion / with one deletion). This is Kadane (DSA 5) + state-machine DP (DSA 19).</p>`, code: `int maximumSum(int[] a) {
    int noDel = a[0], oneDel = Integer.MIN_VALUE / 2, best = a[0];
    for (int i = 1; i < a.length; i++) {
        oneDel = Math.max(oneDel + a[i], noDel); // either delete a[i] now, or we deleted earlier
        noDel = Math.max(noDel + a[i], a[i]);    // plain Kadane
        best = Math.max(best, Math.max(noDel, oneDel));
    }
    return best;
}` }
    ],
    deepDive: `<p><b>Why pattern maps work (and when they fail).</b> Interview problems are drawn from a small set of reusable <i>invariants</i>: "the window is always valid", "the stack is always decreasing", "everything left of lo fails the check". A clue word is a hint about which invariant the author built the problem around. That is why one table covers hundreds of problems.</p>
      <p><b>Failure mode 1 — one clue, wrong family.</b> "Longest" appears in sliding window, LIS (DP), and longest path (graph DP). Always pair the clue with the input shape and the size: "longest + contiguous + non-negative" is a window; "longest + subsequence" is DP; "longest + in a DAG" is topo order + DP.</p>
      <p><b>Failure mode 2 — the hidden monotonicity.</b> Binary search on the answer never says "binary search". The tell is a yes/no check that flips once: if capacity C works then C+1 works. Ask yourself: "If I guessed the answer, could I check it in O(N)?" If yes, you probably have binary search on the answer.</p>
      <p><b>Failure mode 3 — the graph in disguise.</b> States connected by moves (word ladder, lock combinations, sliding puzzle) form an implicit graph. "Minimum number of moves" over such states = BFS, even with no edges in the input.</p>
      <p><b>Failure mode 4 — design questions.</b> "Implement X with O(1) get and put" is a data-structure combination question (DSA 27). The clue is the <b>required complexity per operation</b>: O(1) lookup → hash map; O(1) order changes → linked list; O(log N) ordered → TreeMap/heap.</p>
      <p><b>Production reality:</b> The same mapping is how senior engineers read requirements: "recent N events" → ring buffer; "top trending" → heap/count-min sketch; "dependency graph of services" → topological order for deploys. The skill transfers directly from interviews to system work.</p>`,
    aiEra: `<p><b>What AI changes:</b> An assistant can name the pattern for almost any classic problem instantly. Interviewers know this, so 2026 loops increasingly test the <b>reasoning behind the pick</b>: "Why not a sliding window here?", "What would change if values could be negative?". Memorising "problem → pattern" pairs is worth less; understanding which <b>clue</b> forces which choice is worth more.</p>
      <p><b>Use AI as a sparring partner:</b> <code>Give me a disguised problem whose real pattern is monotonic stack. Do not tell me the pattern. After I answer, tell me which phrase was the giveaway.</code> Or: <code>Rewrite LeetCode 'Koko eating bananas' as a story about servers so I can practise spotting the pattern.</code></p>
      <p><b>Where AI goes wrong:</b> It pattern-matches on surface words just like a nervous candidate — it may suggest a sliding window when negatives are present, or BFS on a weighted graph. Always check its pick against the constraints and edge cases.</p>
      <p><b>What you must still own:</b> the 30-second diagnosis in a live room with no tools, the ability to justify it, and the ability to switch plans when the interviewer adds a twist.</p>`,
    problems: [{
      title: 'Pattern Spotter: Subarray Sum Equals K', level: 'Medium', tags: ['prefix sum', 'hashmap', 'pattern recognition'], companies: ['Meta', 'Google', 'Amazon'],
      statement: `<p>Given an integer array <code>nums</code> (values may be <b>negative</b>) and an integer <code>k</code>, return the <b>number of contiguous subarrays</b> whose sum equals <code>k</code>.</p><p>This is the classic "which pattern?" trap: it looks like a sliding window, but it is not.</p>`,
      constraints: `1 ≤ N ≤ 2·10<sup>4</sup>, −1000 ≤ nums[i] ≤ 1000, −10<sup>7</sup> ≤ k ≤ 10<sup>7</sup>`,
      example: `${H.arr([1, -1, 1, 1], { hl: { 2: 'g', 3: 'g' } })}<p>k = 2 → output <b>${H.c('g', '2')}</b>: subarrays [1,1] (indexes 2..3) and [1,−1,1,1] (indexes 0..3) both sum to 2.</p>`,
      brute: { why: `<p>Try every start i and every end j, adding as you go: O(N<sup>2</sup>) = 4·10<sup>8</sup> additions at the max size — borderline TLE. The wasted work: every new start recomputes sums we already knew.</p>`, code: `int bruteCount(int[] nums, int k) {
    int count = 0;
    for (int i = 0; i < nums.length; i++) {
        int sum = 0;
        for (int j = i; j < nums.length; j++) {
            sum += nums[j];           // sum of nums[i..j]
            if (sum == k) count++;
        }
    }
    return count;
}` },
      mcq: { q: 'Why is a sliding window wrong here?', options: ['Negative numbers mean shrinking the window can increase the sum, so grow/shrink decisions are unreliable', 'Windows only work on strings', 'The array is too long for a window', 'Windows cannot count, only find the longest'], answer: 0, explain: 'A window needs "adding makes it bigger, removing makes it smaller". Negatives break that, so you cannot know which way to move.' },
      hints: [`<p>Hint 1: sum(i..j) = pf[j] − pf[i−1]. You want pf[j] − pf[i−1] = k, i.e. an <b>earlier</b> prefix equal to pf[j] − k.</p>`, `<p>Hint 2: keep a HashMap from "prefix sum value" → "how many times seen so far". At each j, add map[pf − k] to the answer.</p>`, `<p>Hint 3: seed the map with {0: 1} so subarrays starting at index 0 are counted. Recipe: pf = 0; for x: pf += x; ans += map[pf−k]; map[pf]++.</p>`],
      solution: {
        approach: `<p><b>Clue reading:</b> "contiguous subarray" + "sum equals k" + "negative values" → prefix sum + HashMap (DSA 5 + DSA 8). One pass; for each end j, count how many earlier prefixes equal pf − k.</p>`,
        code: `class Solution {
    public int subarraySum(int[] nums, int k) {
        Map<Integer, Integer> freq = new HashMap<>();
        freq.put(0, 1);                       // empty prefix: lets subarrays start at index 0
        int pf = 0, count = 0;
        for (int x : nums) {
            pf += x;                          // prefix sum up to here
            count += freq.getOrDefault(pf - k, 0); // earlier prefixes that leave exactly k
            freq.merge(pf, 1, Integer::sum);  // record this prefix AFTER counting
        }
        return count;
    }
}`,
        alt: [{ lang: 'python', code: `from collections import defaultdict

def subarray_sum(nums, k):
    freq = defaultdict(int)
    freq[0] = 1
    pf = count = 0
    for x in nums:
        pf += x
        count += freq[pf - k]
        freq[pf] += 1
    return count

print(subarray_sum([1, -1, 1, 1], 2))  # 2`, run: true }],
        dry: { head: ['j', 'x', 'pf', 'pf − k', 'freq before', 'count'], rows: [['0', '1', '1', '−1', '{0:1}', '0'], ['1', '−1', '0', '−2', '{0:1, 1:1}', '0'], ['2', '1', '1', '−1', '{0:2, 1:1}', '0'], ['3', '1', '2', '0', '{0:2, 1:2}', H.c('g', '0 + 2 = 2')]] },
        complexity: `<p>Time O(N) average (hash operations), space O(N) for the map.</p>`,
        followUps: ['Return the longest such subarray instead of the count (store first index of each prefix).', 'What if all numbers were positive? (Then a sliding window also works in O(1) space.)', 'Count subarrays whose sum is divisible by k (store pf mod k, fix negative mods).']
      }
    }]
  });

  // =====================================================================
  // TOPIC 2 — Constraints → complexity budget → shortlist
  // =====================================================================
  var CLASSES = [
    { name: 'O(log N)', f: function (n) { return Math.log10(Math.max(1, Math.log2(Math.max(2, n)))); }, pats: 'binary search, math formula, fast power' },
    { name: 'O(N)', f: function (n) { return Math.log10(n); }, pats: 'one pass, two pointers, sliding window, hashing, prefix sums, monotonic stack' },
    { name: 'O(N log N)', f: function (n) { return Math.log10(n * Math.max(1, Math.log2(n))); }, pats: 'sorting, heaps, binary search inside a loop, Dijkstra, segment tree' },
    { name: 'O(N √N)', f: function (n) { return 1.5 * Math.log10(n); }, pats: 'sqrt decomposition, Mo’s algorithm' },
    { name: 'O(N²)', f: function (n) { return 2 * Math.log10(n); }, pats: '2D DP (LCS, edit distance), all pairs, O(N²) LIS' },
    { name: 'O(N³)', f: function (n) { return 3 * Math.log10(n); }, pats: 'Floyd-Warshall, interval DP (matrix chain), triple loops' },
    { name: 'O(2ᴺ)', f: function (n) { return n * Math.log10(2); }, pats: 'subsets, bitmask DP (×N), backtracking with pruning' },
    { name: 'O(N!)', f: function (n) { var s = 0; for (var i = 2; i <= Math.min(n, 200); i++) s += Math.log10(i); return n > 200 ? 400 : s; }, pats: 'all permutations, brute-force TSP' }
  ];

  topics.push({
    title: 'Reading Constraints: The Complexity Budget',
    analogy: `<p>Before you plan a trip you check your <b>budget</b>. With ₹500 you are taking the bus; with ₹50,000 you can fly. Nobody plans the route first and checks the money later.</p>
      <p>The constraint line (<code>1 ≤ N ≤ 10<sup>5</sup></code>) is your <b>time budget</b>. A judge (or an interviewer) allows roughly <b>10<sup>8</sup> simple steps per second</b>. Divide that budget by N and you immediately know which "vehicles" (algorithms) you can afford.</p>`,
    explain: `<p>Most candidates read the story, pick an idea, code it, and only then notice it is too slow. Flip the order: <b>read the constraints first</b>. They tell you the target complexity, and the target complexity shortlists the patterns before you have even understood the story.</p>
      <h4>The budget table (≈ 10<sup>8</sup> simple operations per second)</h4>
      ${H.table(['largest N', 'allowed complexity', 'typical techniques'], [
        ['N ≤ 10–11', 'O(N!)', 'all permutations, brute force'],
        ['N ≤ 20–25', 'O(2<sup>N</sup>) or O(2<sup>N</sup>·N)', 'subsets, bitmask DP, backtracking, meet-in-the-middle (N ≤ 40)'],
        ['N ≤ 100–500', 'O(N<sup>3</sup>)', 'Floyd-Warshall, interval DP'],
        ['N ≤ 1,000–5,000', 'O(N<sup>2</sup>)', '2D DP, all pairs, O(N<sup>2</sup>) LIS'],
        ['N ≤ 10<sup>5</sup>–10<sup>6</sup>', 'O(N log N) or O(N)', 'sorting, heaps, hashing, windows, two pointers, segment trees'],
        ['N ≤ 10<sup>8</sup>', 'O(N) with a tiny constant', 'single tight loop, sieve'],
        ['N ≤ 10<sup>18</sup>', 'O(log N) or O(1)', 'binary search on value, fast power, matrix exponentiation, formula']
      ])}
      <h4>A worked budget, step by step</h4>
      <p>Constraint: <code>N ≤ 10<sup>5</sup></code>.</p>
      ${H.table(['idea', 'operations at N = 10<sup>5</sup>', 'verdict'], [
        ['check every pair (O(N<sup>2</sup>))', '10<sup>10</sup>', H.c('r', '100 seconds — TLE')],
        ['sort + one scan (O(N log N))', '10<sup>5</sup> × 17 ≈ 1.7·10<sup>6</sup>', H.c('g', 'about 2 ms — fine')],
        ['hash map pass (O(N))', '10<sup>5</sup>', H.c('g', 'instant')]
      ])}
      <p>So with N up to 10<sup>5</sup>, any idea with a nested loop over N is dead on arrival. You go straight to the O(N log N)/O(N) families.</p>
      <h4>Other numbers in the constraint line that are clues</h4>
      <ul>
        <li><b>Values up to 10<sup>9</sup></b> — you cannot make an array indexed by value; and sums of two values overflow <code>int</code> → use <code>long</code>. Also hints "binary search over the value range" (log<sub>2</sub>10<sup>9</sup> ≈ 30 steps).</li>
        <li><b>K ≤ 20</b> next to a big N — the small parameter is where the exponential part goes: O(N·2<sup>K</sup>) is fine.</li>
        <li><b>Lowercase letters only</b> — alphabet of 26 is a constant: an <code>int[26]</code> beats a HashMap, and O(26·N) counts as O(N).</li>
        <li><b>Q queries up to 10<sup>5</sup></b> — each query must cost O(log N) or O(1), so you need preprocessing (prefix sums, sparse table, segment tree).</li>
        <li><b>"Answer modulo 10<sup>9</sup>+7"</b> — the count is astronomically large → counting DP or combinatorics, never enumeration.</li>
        <li><b>Grid up to 1000 × 1000</b> — 10<sup>6</sup> cells, so O(R·C) BFS/DP is fine, O((R·C)<sup>2</sup>) is not.</li>
      </ul>`,
    clues: [
      '<code>N ≤ 20</code> → exponential is intended: subsets, bitmask DP, backtracking.',
      '<code>N ≤ 5000</code> → O(N<sup>2</sup>) DP is the expected solution.',
      '<code>N ≤ 10<sup>5</sup></code> or <code>2·10<sup>5</sup></code> → O(N log N): sort, heap, binary search, segment tree.',
      '<code>values ≤ 10<sup>9</sup></code> or <code>N ≤ 10<sup>18</sup></code> → binary search on value or math; use <code>long</code>.',
      '"<b>return modulo 10<sup>9</sup>+7</b>" → counting DP / combinatorics; never list the objects.',
      '"<b>Q queries</b>" with Q ≈ N → preprocess once, answer each query in O(1) or O(log N).'
    ],
    code: { lang: 'python', run: true, title: 'Budget calculator (runnable)', code: `import math

BUDGET = 1e8   # ~simple operations per second in a judge / interview estimate

def ops(name, n):
    if name == "O(log N)":   return math.log2(max(2, n))
    if name == "O(N)":       return n
    if name == "O(N log N)": return n * math.log2(max(2, n))
    if name == "O(N^2)":     return n ** 2
    if name == "O(N^3)":     return n ** 3
    if name == "O(2^N)":     return 2.0 ** min(n, 1000)
    if name == "O(N!)":      return math.factorial(min(n, 170)) * 1.0

for n in [10, 20, 500, 5000, 100000, 10**9]:
    fits = [c for c in ["O(N!)", "O(2^N)", "O(N^3)", "O(N^2)", "O(N log N)", "O(N)", "O(log N)"]
            if ops(c, n) <= BUDGET]
    # the FIRST class that fits is the slowest you can afford -> your target
    print(f"N = {n:>10}: slowest affordable = {fits[0]:<11} (all that fit: {', '.join(fits)})")
` },
    viz: {
      title: 'Budget meter: which complexities fit for your N?',
      input: '100000',
      inputLabel: 'N (largest input size, 1 to 10^18)',
      gen: function (input) {
        var s = String(input === undefined ? '' : input).trim().replace(/,/g, '');
        var m = s.match(/^10\s*\^\s*(\d+)$/);
        var n = m ? Math.pow(10, Number(m[1])) : Number(s);
        if (!isFinite(n) || n < 1 || n > 1e18) throw new Error('Type one number N between 1 and 10^18, e.g. 100000 or 10^5');
        var frames = [], vals = [], labels = [], texts = [];
        frames.push({ narr: 'N = <b>' + n.toLocaleString('en-US') + '</b>. Budget ≈ <b>10<sup>8</sup></b> simple steps (about 1 second). The red line on each bar is log<sub>10</sub>(steps) = 8. Taller than 8 = too slow.', parts: [
          { type: 'vars', label: 'budget', vals: { N: n.toLocaleString('en-US'), 'budget (log10)': 8 } },
          txt('How to read the bars', 'Each bar shows <b>log<sub>10</sub>(steps)</b>: 6 means a million steps, 10 means ten billion. We test the classes from fastest to slowest.')
        ] });
        var lastFit = -1;
        CLASSES.forEach(function (c, i) {
          var v = Math.min(30, Math.round(c.f(n) * 10) / 10);
          vals.push(v); labels.push(c.name); texts.push(v >= 30 ? '30+' : String(v));
          var ok = v <= 8;
          if (ok) lastFit = i;
          var hl = {};
          vals.forEach(function (x, j) { hl[j] = x <= 8 ? 'ok' : 'bad'; });
          hl[i] = 'cur';
          frames.push({ narr: '<b>' + c.name + '</b> at N = ' + n.toLocaleString('en-US') + ' ≈ 10<sup>' + (v >= 30 ? '30+' : v) + '</sup> steps → ' + (ok ? '<span class="c-g">fits the budget</span>' : '<span class="c-r">too slow (over 10<sup>8</sup>)</span>') + '. Typical techniques: ' + c.pats + '.', parts: [
            { type: 'bars', label: 'log10(steps) per complexity class', values: vals.slice(), idxLabels: labels.slice(), texts: texts.slice(), hl: hl },
            { type: 'vars', vals: { class: c.name, 'log10 steps': v, verdict: ok ? 'fits' : 'TLE' }, hl: { verdict: ok ? 'ok' : 'bad' } }
          ] });
        });
        var hlF = {};
        vals.forEach(function (x, j) { hlF[j] = x <= 8 ? 'ok' : 'done'; });
        if (lastFit >= 0) hlF[lastFit] = 'sel';
        frames.push({ narr: lastFit >= 0 ? 'Target: the <b>slowest class that still fits</b> is <b>' + CLASSES[lastFit].name + '</b>. Interviewers usually design N so that this is exactly the intended solution. Shortlist: ' + CLASSES[lastFit].pats + '.' : 'Nothing fits?! N is beyond even O(log N) estimates — re-read the constraint.', parts: [
          { type: 'bars', label: 'final verdict', values: vals.slice(), idxLabels: labels.slice(), texts: texts.slice(), hl: hlF },
          { type: 'table', label: 'Shortlist for this N', columns: ['complexity', 'techniques'], rows: CLASSES.filter(function (c, j) { return vals[j] <= 8; }).map(function (c) { return [c.name, c.pats]; }).reverse(), hl: { 0: 'sel' } }
        ] });
        frames.push({ narr: 'Say it out loud in the interview: "N goes up to ' + n.toLocaleString('en-US') + ', so I am aiming for ' + (lastFit >= 0 ? CLASSES[lastFit].name : 'O(1)') + ' — anything slower times out." The interviewer now knows you are not going to waste 20 minutes on a dead end.', parts: [
          txt('Script', '"Given N up to ' + n.toLocaleString('en-US') + ', a brute force of O(N²) would be ≈ 10<sup>' + Math.min(30, Math.round(2 * Math.log10(n) * 10) / 10) + '</sup> steps, so I need ' + (lastFit >= 0 ? CLASSES[lastFit].name : 'O(1)') + '."')
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'N ≤ 15 — the size is shouting "bitmask"', html: `<p>"Assign 15 workers to 15 jobs at minimum total cost." 15! ≈ 1.3·10<sup>12</sup> (TLE), but 2<sup>15</sup>·15 ≈ 4.9·10<sup>5</sup> (instant). ${H.c('g', 'Bitmask DP')}: <code>dp[mask]</code> = min cost when the jobs in <code>mask</code> are taken by the first popcount(mask) workers (DSA 24).</p>` },
      { title: 'N ≤ 10<sup>5</sup> and Q ≤ 10<sup>5</sup> range-sum queries', html: `<p>Answering each query with a loop: 10<sup>5</sup> × 10<sup>5</sup> = 10<sup>10</sup> → TLE. Prefix sums: build O(N) once, each query O(1), total 2·10<sup>5</sup>. If updates are mixed in, prefix sums break (an update costs O(N)) → ${H.c('g', 'Fenwick tree')} with O(log N) for both (DSA 23).</p>` },
      { title: 'Values up to 10<sup>9</sup>, N ≤ 10<sup>5</sup>, "minimum largest sum"', html: `<p>You cannot loop over every candidate answer (up to 10<sup>14</sup>), but binary search over that range takes only log<sub>2</sub>(10<sup>14</sup>) ≈ 47 checks of O(N) each → about 5·10<sup>6</sup> steps. Also: sums reach 10<sup>14</sup>, so ${H.c('r', 'int overflows')} → use <code>long</code>.</p>`, code: `long lo = 0, hi = 0;
int[] nums = {7, 2, 5, 10, 8};
for (int x : nums) { lo = Math.max(lo, x); hi += x; }   // answer lies in [max, sum]
System.out.println("search range: " + lo + " .. " + hi + ", about " + (64 - Long.numberOfLeadingZeros(hi - lo + 1)) + " checks");` },
      { title: 'String of lowercase letters, length ≤ 10<sup>5</sup>', html: `<p>"Lowercase only" means 26 counters. Comparing two frequency arrays costs 26 steps, a constant. A window algorithm that compares counts at every step is O(26·N) = 2.6·10<sup>6</sup> → fine. Use <code>int[26]</code> instead of a HashMap: faster and no boxing.</p>` }
    ],
    deepDive: `<p><b>Where "10<sup>8</sup> per second" comes from.</b> A modern CPU runs ~3·10<sup>9</sup> cycles per second, but one "step" of an algorithm (array access, comparison, hash lookup) costs anywhere from 1 to 100+ cycles once you count cache misses and branch mispredictions. 10<sup>8</sup> is a safe, conservative middle. Java adds JIT warm-up and object overhead; Python is ~30–100× slower, so a Python O(N log N) at N = 10<sup>6</sup> may still struggle.</p>
      <p><b>Constants matter at the border.</b> O(N log N) with a HashMap of boxed <code>Long</code>s can be slower than O(N log N) with a sorted primitive array, because every boxed object is a pointer chase. At N = 10<sup>6</sup>, cache-friendly code wins by 5–10×.</p>
      <p><b>Reading constraints backwards.</b> Problem setters choose N so that the intended solution passes and the naive one fails. If N ≤ 2000, an O(N<sup>2</sup>) solution is almost certainly intended — do not burn time searching for O(N log N). If N ≤ 10<sup>5</sup> but the obvious solution is O(N<sup>2</sup>), the problem is about removing one loop (hashing, sorting, monotonic structure, prefix sums).</p>
      <p><b>Memory budget too.</b> 256 MB ≈ 6·10<sup>7</sup> ints. A 10<sup>4</sup> × 10<sup>4</sup> int DP table is 400 MB → you need the rolling-array trick (keep two rows). Recursion depth of 10<sup>5</sup> in Java can overflow the default stack → iterative DFS or BFS.</p>
      <p><b>Amortised vs worst case:</b> a monotonic stack inside a loop looks O(N<sup>2</sup>) but each element is pushed and popped once → O(N). Always count total work, not nested loops.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI happily produces an O(N<sup>2</sup>) solution that passes the three sample tests and fails the hidden 10<sup>5</sup> test. Generated code rarely mentions the budget unless you ask. Your job is to <b>state the budget first</b> and reject code that does not meet it.</p>
      <p><b>Prompt that works:</b> <code>N ≤ 2·10^5, values ≤ 10^9. State the target time complexity, then give a solution that meets it, and list where overflow can happen.</code> Then verify the claim yourself by counting loops.</p>
      <p><b>Use AI for stress-testing:</b> ask it for a generator of max-size random inputs and a timing harness. Running your solution at the true max size is the only honest proof that it fits.</p>
      <p><b>What you must own:</b> the mental arithmetic (10<sup>5</sup> squared is 10<sup>10</sup>; log<sub>2</sub>10<sup>9</sup> ≈ 30) — interviewers ask it live, and it is the fastest way to catch a bad AI suggestion.</p>`,
    problems: [{
      title: 'Budget First: Split Array Largest Sum', level: 'Hard', tags: ['binary search on answer', 'greedy', 'constraints'], companies: ['Google', 'Amazon', 'Meta'],
      statement: `<p>Split the array <code>nums</code> into <code>k</code> non-empty <b>contiguous</b> parts so that the <b>largest part sum is as small as possible</b>. Return that minimum possible largest sum.</p><p>Read the constraints first and let them choose the technique.</p>`,
      constraints: `1 ≤ N ≤ 1000, 0 ≤ nums[i] ≤ 10<sup>6</sup>, 1 ≤ k ≤ min(50, N)`,
      example: `${H.arr([7, 2, 5, 10, 8], { hl: { 0: 'b', 1: 'b', 2: 'b', 3: 'g', 4: 'g' } })}<p>k = 2 → <b>${H.c('g', '18')}</b>: split [7,2,5] (sum 14) | [10,8] (sum 18). Every other split has a bigger largest part, e.g. [7,2,5,10] | [8] → 24.</p>`,
      brute: { why: `<p>Try every way to place k−1 cut points: C(N−1, k−1) splits — astronomically many for N = 1000, k = 50. The waste: we never use the fact that "largest sum ≤ X is possible" is a yes/no question with a monotone answer.</p>`, code: `int bruteSplit(int[] nums, int k) {
    return go(nums, 0, k);
}
// smallest possible "largest part" for nums[start..] cut into exactly k parts
int go(int[] nums, int start, int k) {
    int n = nums.length;
    if (k == 1) { int s = 0; for (int i = start; i < n; i++) s += nums[i]; return s; }
    int best = Integer.MAX_VALUE, first = 0;
    for (int end = start; end <= n - k; end++) {     // first part is nums[start..end]
        first += nums[end];
        int rest = go(nums, end + 1, k - 1);         // recursion explodes: exponential
        best = Math.min(best, Math.max(first, rest));
    }
    return best;
}` },
      mcq: { q: '"Minimize the largest part sum" + values up to 10<sup>6</sup>. What is the cleanest approach?', options: ['Binary search on the answer with a greedy O(N) feasibility check', 'Sort the array and split in the middle', 'Sliding window of size N/k', 'Heap of part sums'], answer: 0, explain: '"Minimize the maximum" is the classic tell. If largest sum X is achievable, any X\' &gt; X is too — monotone → binary search.' },
      hints: [`<p>Hint 1: Flip the question: "Can I split into ≤ k parts so that every part sum ≤ X?" That yes/no answer only flips once as X grows.</p>`, `<p>Hint 2: The check is greedy: walk left to right, start a new part whenever adding the next number would exceed X. Count the parts.</p>`, `<p>Hint 3: Search X in [max(nums), sum(nums)]. Use long for sums. Recipe: lo = max, hi = sum; while lo &lt; hi: mid; if parts(mid) ≤ k: hi = mid else lo = mid + 1.</p>`],
      solution: {
        approach: `<p><b>Budget:</b> N ≤ 1000, k ≤ 50 → an O(k·N<sup>2</sup>) = 5·10<sup>7</sup> DP also fits, but binary search on the answer is O(N log(sum)) ≈ 1000 × 30 and shorter to code. Mention both; code the simpler one.</p>`,
        code: `class Solution {
    public int splitArray(int[] nums, int k) {
        long lo = 0, hi = 0;
        for (int x : nums) { lo = Math.max(lo, x); hi += x; } // answer is in [max, sum]
        while (lo < hi) {
            long mid = lo + (hi - lo) / 2;
            if (partsNeeded(nums, mid) <= k) hi = mid;  // feasible: try smaller
            else lo = mid + 1;                          // too many parts: need bigger cap
        }
        return (int) lo;
    }
    // greedy: how many parts if no part may exceed cap?
    private int partsNeeded(int[] nums, long cap) {
        int parts = 1; long cur = 0;
        for (int x : nums) {
            if (cur + x > cap) { parts++; cur = 0; }   // start a new part
            cur += x;
        }
        return parts;
    }
}`,
        dry: { head: ['lo', 'hi', 'mid', 'greedy parts at cap = mid', 'move'], rows: [['10', '32', '21', '[7,2,5] [10,8] → 2', 'hi = 21'], ['10', '21', '15', '[7,2,5] [10] [8] → 3', 'lo = 16'], ['16', '21', '18', '[7,2,5] [10,8] → 2', 'hi = 18'], ['16', '18', '17', '[7,2,5] [10] [8] → 3', 'lo = 18'], ['18', '18', '—', 'loop ends', H.c('g', 'answer 18')]] },
        complexity: `<p>Time O(N · log(sum)) ≈ 1000 × 30. Space O(1).</p>`,
        followUps: ['Return the actual split points.', 'Same problem but you may reorder the array first — now what? (Becomes a load-balancing / bin-packing flavour, NP-hard in general.)', 'Painter’s partition: identical structure, explain why.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 3 — Approaching an unseen problem
  // =====================================================================
  var STEPS = [
    { id: 'S1', label: '1 Clarify', x: 8, y: 12 },
    { id: 'S2', label: '2 Examples', x: 33, y: 12 },
    { id: 'S3', label: '3 Brute force', x: 58, y: 12 },
    { id: 'S4', label: '4 Find waste', x: 85, y: 12 },
    { id: 'S5', label: '5 Optimise', x: 85, y: 42 },
    { id: 'S6', label: '6 Walk through', x: 58, y: 42 },
    { id: 'S7', label: '7 Code', x: 33, y: 42 },
    { id: 'S8', label: '8 Test & fix', x: 8, y: 42 }
  ];
  var STEP_MIN = [3, 3, 4, 3, 7, 3, 12, 5];
  var PRESETS = {
    rooms: { name: 'Meeting Rooms II — minimum rooms for intervals [[0,30],[5,10],[15,20]]', say: [
      'Are intervals half-open ([start, end))? If one meeting ends at 10 and another starts at 10, can they share a room? (Yes.) Can the list be empty? N up to 10<sup>4</sup>?',
      'Sample → 2 rooms. My own: [[1,5],[2,6],[3,7]] → 3 (all overlap). Edge: [[1,2],[2,3]] → 1 (touching is fine).',
      'For every meeting, count how many others are running at its start time; the max is the answer. O(N<sup>2</sup>) — 10<sup>8</sup> at N = 10<sup>4</sup>, borderline.',
      'Repeated work: for each start we rescan ALL meetings. If starts and ends were sorted we could sweep time once and keep a running count.',
      'Clue "intervals" + "minimum rooms" → sort + sweep (or min-heap of end times). Sort starts and ends separately; +1 at each start, −1 at each end that happened before it. O(N log N).',
      'starts = [0,5,15], ends = [10,20,30]. t=0 → rooms 1; t=5 (5 &lt; 10) → 2; t=15 (15 ≥ 10, free one) → still 2. Max = 2 ✔.',
      'Write it with clear names: starts, ends, used, best. Two pointers i (starts) and j (ends).',
      'Run the sample and [[1,2],[2,3]] (uses ≥ so touching frees the room → 1 ✔), empty list → 0, one meeting → 1.'
    ] },
    twosum: { name: 'Two Sum — indices of two numbers adding to target (unsorted array)', say: [
      'Exactly one solution? Same element twice not allowed? Return indices, any order? Negatives allowed? N up to 10<sup>4</sup>.',
      '[2,7,11,15], target 9 → [0,1]. Own: [3,3], target 6 → [0,1] (equal values, different indices). Edge: negatives [−1, 4], target 3.',
      'Check every pair i &lt; j: O(N<sup>2</sup>) = 5·10<sup>7</sup> — works but slow.',
      'For each i we search the whole array for target − a[i]. That search is the waste: a lookup should be O(1).',
      'Clue "seen before?" → HashMap value → index. One pass: before storing a[i], ask "is target − a[i] already in the map?" O(N).',
      '[2,7,11,15], t=9: i=0 store 2→0; i=1 need 2 → found at 0 → [0,1] ✔.',
      'Map&lt;Integer,Integer&gt; idx; loop; check, then put (check first avoids using the same element twice).',
      '[3,3] t=6: i=0 store; i=1 need 3 → found → [0,1] ✔. No-solution case: return empty array (agreed in step 1).'
    ] },
    stairs: { name: 'Climbing Stairs — number of ways to climb n steps taking 1 or 2 at a time', say: [
      'n ≥ 1? Up to 45 (fits in int)? Order matters (1+2 differs from 2+1)? Yes.',
      'n=1 → 1, n=2 → 2, n=3 → 3 (1+1+1, 1+2, 2+1), n=4 → 5. Pattern looks like Fibonacci!',
      'Recursion ways(n) = ways(n−1) + ways(n−2): correct but O(2<sup>n</sup>) — 2<sup>45</sup> calls is too many.',
      'ways(3) is computed again and again inside ways(5), ways(4)... Overlapping subproblems = the waste.',
      'Clue "number of ways" + "choice at each step" → DP. Keep only the last two values: O(n) time, O(1) space.',
      'a=1 (n=1), b=2 (n=2); n=3: c=3; n=4: c=5 ✔ matches our hand count.',
      'int a = 1, b = 2; loop i = 3..n: c = a + b; a = b; b = c. Return n == 1 ? 1 : b.',
      'n=1 → 1 ✔ (special case), n=2 → 2 ✔, n=45 → 1836311903 fits int ✔.'
    ] }
  };

  topics.push({
    title: 'How to Approach an Unseen Problem',
    analogy: `<p>When a pilot meets an unusual situation, she does not improvise. She pulls out a <b>checklist</b>: aviate, navigate, communicate. The checklist does not fly the plane, but it stops panic from skipping a step.</p>
      <p>An unseen interview problem is your unusual situation. An 8-step checklist keeps you moving even when your mind goes blank — and it shows the interviewer a calm, organised engineer, which is half of what they are grading.</p>`,
    explain: `<p>The worst thing you can do with a new problem is start typing code in minute two. The best candidates spend the first <b>third</b> of the time talking and drawing, and the code then flows in one go. Here is the checklist, with a rough time split for a 45-minute round:</p>
      ${H.table(['step', 'what you do', 'what you say', 'minutes'], [
        ['1. <b>Clarify</b>', 'restate the problem; ask about input size, ranges, duplicates, empty input, output format', '"So I return indices, not values? Can N be 0?"', '2–3'],
        ['2. <b>Examples</b>', 'work the given example by hand; invent one normal + one edge case', '"Let me try a case where all values are equal."', '2–3'],
        ['3. <b>Brute force</b>', 'state the simplest correct idea and its complexity — do not code it yet', '"Checking all pairs is O(N²), which is 10<sup>10</sup> here — too slow, but it is a baseline."', '2–4'],
        ['4. <b>Find the waste</b>', 'ask: which work is <b>B</b>ottleneck, <b>U</b>nnecessary or <b>D</b>uplicated? (BUD)', '"We re-sum the same range again and again."', '2–3'],
        ['5. <b>Optimise</b>', 'map the waste to a pattern from the master map; pick a data structure', '"Repeated range sums → prefix sums."', '5–8'],
        ['6. <b>Walk through</b>', 'run the optimised idea on the example by hand, before code', '"At index 3 the map holds {0:1, 2:1}…"', '2–3'],
        ['7. <b>Code</b>', 'clean, named helpers, talk while typing', '"This helper returns how many parts we need."', '10–15'],
        ['8. <b>Test &amp; fix</b>', 'dry-run the code (not the idea!), then edge cases; state final complexity', '"Empty array returns 0, good. Time O(N), space O(N)."', '4–6']
      ])}
      <h4>When you are stuck at step 5: seven "unsticking" moves</h4>
      ${H.table(['move', 'how', 'often reveals'], [
        ['Solve it by hand on a bigger example', 'watch what <b>your own brain</b> does — you are often already using the pattern', 'greedy order, two pointers'],
        ['Sort the input', 'does order matter for the answer? if not, sort and see what becomes easy', 'two pointers, sweep, binary search'],
        ['Precompute', '"what if I knew X for every index in O(1)?" — then build X', 'prefix sums, prefix max, next greater'],
        ['Data-structure brainstorm', 'walk the list: hash map, set, stack, queue, deque, heap, trie, tree map, DSU', 'whichever makes the slow step O(1)/O(log N)'],
        ['Simplify the problem', 'k = 1? only positives? 1D instead of 2D? solve that first, then generalise', 'the core recurrence or invariant'],
        ['Guess the answer and check it', '"if I knew the answer X, could I verify it fast?"', 'binary search on the answer'],
        ['Think about the last step', '"what was the final choice made?"', 'DP transition']
      ])}
      <p>The point is not to recite steps. The point is that at every moment you have a <b>next move</b>, so silence and panic never take over.</p>`,
    clues: [
      'A problem you have <b>never seen</b> → still start from brute force; the waste in the brute force names the pattern.',
      'Interviewer says "<b>can you do better?</b>" → there is a known bottleneck; look at the inner loop and ask what it recomputes.',
      'Interviewer gives a <b>small hint</b> ("what if it were sorted?") → they are steering you to a family; follow it immediately.',
      'The statement is <b>vague</b> about duplicates, empty input or output format → the clarifying questions are part of the grade.',
      'You find yourself <b>writing many if-statements</b> for cases → step back; there is usually a cleaner invariant.'
    ],
    code: [`
// The shape of a strong interview solution: tiny main method, named helpers, early edge cases.
class MinMeetingRooms {
    public int minMeetingRooms(int[][] intervals) {
        if (intervals == null || intervals.length == 0) return 0;   // edge case first, out loud
        int n = intervals.length;
        int[] starts = new int[n], ends = new int[n];
        for (int i = 0; i < n; i++) { starts[i] = intervals[i][0]; ends[i] = intervals[i][1]; }
        Arrays.sort(starts);
        Arrays.sort(ends);
        int used = 0, best = 0, j = 0;                 // j points at the earliest unfinished end
        for (int i = 0; i < n; i++) {
            while (j < n && ends[j] <= starts[i]) { used--; j++; } // free rooms whose meeting ended
            used++;                                    // this meeting takes a room
            best = Math.max(best, used);
        }
        return best;
    }
}`, { lang: 'python', run: true, title: 'Brute force vs optimised: count the work (runnable)', code: `import random

def brute(iv):
    ops = 0; best = 0
    for s, _ in iv:                       # for every meeting start ...
        running = 0
        for s2, e2 in iv:                 # ... scan ALL meetings (the waste)
            ops += 1
            if s2 <= s < e2:
                running += 1
        best = max(best, running)
    return best, ops

def sweep(iv):
    starts = sorted(s for s, _ in iv)
    ends = sorted(e for _, e in iv)
    used = best = j = 0
    ops = 0
    for s in starts:
        while j < len(ends) and ends[j] <= s:
            used -= 1; j += 1; ops += 1
        used += 1; ops += 1
        best = max(best, used)
    return best, ops

random.seed(7)
for n in [10, 100, 1000]:
    iv = []
    for _ in range(n):
        s = random.randint(0, 10 * n)
        iv.append((s, s + random.randint(1, 50)))
    b, bo = brute(iv)
    o, oo = sweep(iv)
    assert b == o
    print(f"n={n:5}: rooms={b:3}  brute ops={bo:8}  sweep ops={oo:6} (+ sorting)")
` }],
    codeTitle: ['Clean final code shape (Java)', 'Why step 4 matters: operation counts'],
    viz: {
      title: 'The 8-step loop on a real problem (rooms · twosum · stairs)',
      input: 'rooms',
      inputLabel: 'Pick a problem: rooms, twosum or stairs',
      gen: function (input) {
        var key = String(input === undefined ? 'rooms' : input).trim().toLowerCase() || 'rooms';
        var P = PRESETS[key];
        if (!P) throw new Error('Type one of: rooms, twosum, stairs');
        var nodes = STEPS.map(function (s) { return { id: s.id, label: s.label, x: s.x, y: s.y, shape: 'box' }; });
        var edges = [];
        for (var i = 0; i < STEPS.length - 1; i++) edges.push([STEPS[i].id, STEPS[i + 1].id]);
        edges.push(['S8', 'S5', 'bug? loop back']);
        var frames = [], clock = 0;
        frames.push({ narr: 'Problem: <b>' + P.name + '</b>. We have 45 minutes. Watch how the time is spent: almost 20 minutes pass before the first line of real code — and that is what makes the code come out right first time.', parts: [
          { type: 'graph', label: 'Interview loop', directed: true, height: 54, nodes: nodes, edges: edges, hl: {} },
          { type: 'vars', label: 'clock', vals: { minute: 0, phase: 'start' } }
        ] });
        var spent = [];
        STEPS.forEach(function (s, k) {
          clock += STEP_MIN[k];
          spent.push(STEP_MIN[k]);
          var hl = {}, ehl = {};
          for (var q = 0; q < k; q++) { hl[STEPS[q].id] = 'done'; ehl[STEPS[q].id + '-' + STEPS[q + 1].id] = 'ok'; }
          hl[s.id] = 'cur';
          frames.push({ narr: '<b>' + s.label.replace(/^\d /, '') + '</b> (minute ' + (clock - STEP_MIN[k]) + '–' + clock + '): ' + P.say[k], parts: [
            { type: 'graph', label: 'Interview loop', directed: true, height: 54, nodes: nodes, edges: edges, hl: hl, ehl: ehl },
            { type: 'bars', label: 'minutes spent per step', values: spent.slice(), idxLabels: STEPS.slice(0, k + 1).map(function (x) { return x.label.split(' ')[0]; }), hl: one(k, 'cur') },
            { type: 'vars', label: 'clock', vals: { minute: clock, 'left of 45': 45 - clock }, hl: { minute: 'cur' } }
          ] });
        });
        var fin = {};
        STEPS.forEach(function (s) { fin[s.id] = 'ok'; });
        frames.push({ narr: 'Done at minute ' + clock + ' with ' + (45 - clock) + ' minutes spare for follow-up questions. Notice: coding was only about a quarter of the time. The thinking steps are what make it short.', parts: [
          { type: 'graph', label: 'Interview loop', directed: true, height: 54, nodes: nodes, edges: edges, hl: fin },
          { type: 'bars', label: 'minutes spent per step', values: spent.slice(), idxLabels: STEPS.map(function (x) { return x.label.split(' ')[0]; }), hl: { 6: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Using "solve it by hand": Gas Station', html: `<p>"Circular route, gas[i] and cost[i]; find the start station to complete the loop." Do it by hand with gas = [1,2,3,4,5], cost = [3,4,5,1,2]: start at 0, tank goes 1−3 = −2 → fail. Start at 1: −2 → fail. You quickly notice: <b>whenever the tank goes negative at station i, no start between the old start and i can work</b> — so jump the start to i+1. That observation <i>is</i> the O(N) greedy (DSA 17). You found it by watching yourself.</p>` },
      { title: 'Using "sort the input": Minimum arrows to burst balloons', html: `<p>Balloons are intervals; an arrow at x bursts all intervals containing x. Unsorted, it feels hopeless. Sort by <b>end</b>: shoot at the first end; skip every balloon starting at or before that point; repeat. ${H.arr(['[1,6]', '[2,8]', '[7,12]', '[10,16]'], { hl: { 0: 'g', 1: 'g', 2: 'b', 3: 'b' } })}<p>Arrow at 6 bursts the green pair, arrow at 12 the blue pair → 2 arrows.</p>` },
      { title: 'Using "guess the answer and check": Koko eating bananas', html: `<p>"Minimum eating speed to finish all piles in h hours." If someone told you the speed s, could you check it? Yes: hours = Σ ⌈pile / s⌉, one O(N) pass. And if s works, s+1 works too. Guess-and-check + monotonic ⇒ binary search on s in [1, max pile].</p>`, code: `long hoursAt(int[] piles, int s) {
    long h = 0;
    for (int p : piles) h += (p + s - 1) / s;   // ceil(p / s) without floating point
    return h;
}` },
      { title: 'Using "simplify": Trapping rain water', html: `<p>Too hard at once? Simplify to <b>one bar</b>: how much water sits above bar i? It is <code>min(maxLeft, maxRight) − height[i]</code>. Now the full problem is "compute maxLeft and maxRight for every i" → prefix max + suffix max arrays (O(N)), or two pointers for O(1) space.</p>` }
    ],
    deepDive: `<p><b>Why brute force first is not a waste of time.</b> (1) It proves you understood the problem — interviewers often catch misunderstandings here. (2) It gives a correctness oracle you can mentally check the fast solution against. (3) The structure of the brute force tells you where to optimise: a nested loop that re-sums a range → prefix sums; one that re-searches → hashing/binary search; one that re-scans to find a max → heap/monotonic deque; a recursion with repeated arguments → memoisation.</p>
      <p><b>The BUD lens in detail.</b> <i>Bottleneck</i>: the single slowest step (sorting is O(N log N), so optimising a later O(N) loop is pointless). <i>Unnecessary work</i>: computing things you then throw away (checking every c for a² + b² = c² when c is determined by a, b). <i>Duplicated work</i>: the same subproblem solved repeatedly (Fibonacci-style recursion).</p>
      <p><b>Best Conceivable Runtime (BCR).</b> You must read the input at least once, so O(N) is a floor for most array problems; if you must output N² pairs, O(N²) is a floor. When your solution hits the BCR, stop optimising time and talk about space or simplicity instead.</p>
      <p><b>The "pattern library" vs first principles.</b> Experts do both: they match patterns quickly, but when nothing matches they fall back on first principles — invariants ("what stays true each iteration?"), monotonicity ("does a bigger X always help?"), and decomposition ("does the answer split into independent parts?"). Every pattern in this course is one of those three ideas wearing a costume.</p>
      <p><b>Real interviews:</b> interviewers usually grade four axes — problem solving, coding, verification/testing, communication. The 8-step loop touches all four, which is why it scores well even when the final solution is not optimal.</p>`,
    aiEra: `<p><b>What AI changes:</b> With an assistant you can skip straight to code — which is exactly the habit that fails in a live interview, where you are graded on the <b>process</b>. Several companies now run "AI-allowed" rounds; in those, the grade moves even further toward steps 1, 4, 6 and 8: did you clarify, did you spot the flaw in the generated code, did you test it?</p>
      <p><b>Practise the loop with AI as the interviewer:</b> <code>Act as a Google interviewer. Give me an unseen medium problem. Do not reveal the solution. After each of my messages, tell me which of the 8 steps I am on and what I skipped.</code></p>
      <p><b>In AI-allowed rounds:</b> still do steps 1–5 yourself, then use the tool for typing. Narrate: "I'll have the assistant write the sweep; I'll verify the boundary condition ends[j] ≤ starts[i] myself." That shows ownership.</p>
      <p><b>What you must own:</b> framing the problem and judging the answer. AI is a fast typist; you are the engineer deciding what to type and whether it is right.</p>`,
    problems: [{
      title: 'Unseen Problem Drill: Minimum Meeting Rooms', level: 'Medium', tags: ['intervals', 'sorting', 'sweep line', 'heap'], companies: ['Google', 'Meta', 'Amazon', 'Bloomberg'],
      statement: `<p>Given meeting time intervals <code>[start, end)</code>, return the <b>minimum number of conference rooms</b> needed so that no two overlapping meetings share a room. A meeting ending at time t and one starting at t can share a room.</p><p>Practise the full 8-step loop on it before reading the hints.</p>`,
      constraints: `0 ≤ N ≤ 10<sup>4</sup>, 0 ≤ start &lt; end ≤ 10<sup>6</sup>`,
      example: `<p>[[0,30],[5,10],[15,20]] → <b>${H.c('g', '2')}</b>. [0,30] overlaps both others, but [5,10] and [15,20] do not overlap each other, so they can share the second room.</p>`,
      brute: { why: `<p>At every start time, count meetings running then (scan all N): O(N<sup>2</sup>). The waste: each scan rediscovers the same running meetings. A sweep over sorted times keeps that count incrementally.</p>`, code: `int bruteRooms(int[][] iv) {
    int best = 0;
    for (int[] a : iv) {
        int running = 0;
        for (int[] b : iv)
            if (b[0] <= a[0] && a[0] < b[1]) running++;   // b is in progress at time a[0]
        best = Math.max(best, running);
    }
    return best;
}` },
      mcq: { q: 'Which data structure most naturally tells you "the earliest time any room frees up"?', options: ['A min-heap of end times', 'A stack of start times', 'A HashMap from start to end', 'A queue of intervals in input order'], answer: 0, explain: 'The heap top is the earliest ending meeting. If it ends by the new start, reuse that room (poll), then push the new end.' },
      hints: [`<p>Hint 1: Process meetings in order of start time. At each start, which rooms are free? Those whose meeting already ended.</p>`, `<p>Hint 2: Keep a min-heap of end times of rooms in use. Before adding a meeting, pop the top if it ended (end ≤ start).</p>`, `<p>Hint 3: The heap's maximum size over time is the answer. Edge cases: empty input → 0; touching intervals share a room (use ≤).</p>`],
      solution: {
        approach: `<p>Sort by start. Min-heap holds end times of busy rooms. For each meeting: if the earliest end ≤ its start, that room is free — poll it. Push this meeting's end. Answer = heap size at the end (the heap only grows when no room is free). The two-array sweep from the topic code is an equivalent O(N log N) alternative.</p>`,
        code: `class Solution {
    public int minMeetingRooms(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0])); // by start time
        PriorityQueue<Integer> ends = new PriorityQueue<>();            // end times of busy rooms
        for (int[] m : intervals) {
            if (!ends.isEmpty() && ends.peek() <= m[0]) ends.poll();    // reuse the room that freed first
            ends.offer(m[1]);                                           // this meeting occupies a room
        }
        return ends.size();                                             // rooms ever needed at once
    }
}`,
        dry: { head: ['meeting', 'heap before', 'earliest end ≤ start?', 'heap after', 'rooms'], rows: [['[0,30]', '{}', '—', '{30}', '1'], ['[5,10]', '{30}', '30 ≤ 5? no', '{10, 30}', '2'], ['[15,20]', '{10, 30}', '10 ≤ 15? yes → poll', '{20, 30}', H.c('g', '2')]] },
        complexity: `<p>Time O(N log N) for the sort and heap operations. Space O(N) for the heap.</p>`,
        followUps: ['Return which room each meeting gets.', 'Rooms have different capacities and meetings have sizes — what changes?', 'Meetings arrive online (stream) — can you still answer the current room count?']
      }
    }]
  });

  // =====================================================================
  // TOPIC 4 — Mixed timed problem sets
  // =====================================================================
  topics.push({
    title: 'Mixed Timed Problem Sets: Practising Like the Real Thing',
    analogy: `<p>A footballer who only practises penalties from the same spot scores every time in training — and freezes in a match, where the ball comes from anywhere. Coaches therefore run <b>mixed drills</b>: a pass, then a header, then a shot, with a clock running.</p>
      <p>If you practise "10 sliding-window problems in a row", you already know the answer is a sliding window before you read the question. The real skill — <b>choosing</b> the pattern — is never trained. Mixed, timed sets train exactly that.</p>`,
    explain: `<p>Learning research calls this <b>interleaved practice</b>: mixing problem types forces your brain to first decide <i>which</i> tool fits, then use it. It feels harder and slower than "blocked" practice (all one type), but people who interleave do much better on new, unlabelled problems — which is what an interview is.</p>
      <h4>How to run a timed set</h4>
      ${H.table(['rule', 'why'], [
        ['Pick 3–4 problems from <b>different</b> modules, without looking at their tags', 'you must diagnose the pattern yourself'],
        ['Set a timer: Easy 15 min, Medium 25 min, Hard 40 min', 'mirrors a real round (two mediums in 45 min is common)'],
        ['Read <b>all</b> problems first (2 minutes), then solve easiest-first', 'quick wins bank confidence and time'],
        ['Talk out loud or type your reasoning as comments', 'communication is graded; practise it every time'],
        ['<b>Stuck rule:</b> no progress for 15 min (Medium) → read only hint 1; 30 min → read the approach, close it, code it yourself', 'struggle builds skill; endless struggle wastes the session'],
        ['After the timer: write a 3-line error log entry per problem', 'patterns you missed become tomorrow’s revision list'],
        ['Re-solve every failed problem from scratch after 2–3 days', 'spaced retrieval turns "I understood the solution" into "I can produce it"']
      ])}
      <h4>The error log (the most valuable file you will own)</h4>
      ${H.table(['problem', 'pattern', 'what I missed', 'clue I should have seen', 'redo on'], [
        ['Daily Temperatures', 'monotonic stack', 'tried a heap', '"how many days until warmer" = next greater', 'Thu'],
        ['Koko Eating Bananas', 'binary search on answer', 'simulated speeds one by one', '"minimum speed such that" = monotone yes/no', 'Fri'],
        ['Course Schedule', 'topological sort', 'forgot cycle → impossible', '"prerequisites" = directed edges', 'Sat']
      ])}
      <h4>A 4-week mixed-practice plan</h4>
      ${H.table(['week', 'sets per day', 'mix', 'goal'], [
        ['1', '1 set of 3 (E, M, M)', 'arrays, hashing, two pointers, stacks', 'diagnose pattern in &lt; 5 min'],
        ['2', '1 set of 3 (M, M, M)', 'add trees, graphs, binary search, heaps', 'clean code first try'],
        ['3', '1 set of 3 (M, M, H)', 'add DP, greedy, backtracking', 'finish 2 of 3 within 60 min'],
        ['4', '2 mock rounds of 45 min', 'everything, random order, someone watching', 'talk + code + test like the real thing']
      ])}`,
    clues: [
      'You can name the pattern only when the problem <b>sits in a labelled chapter</b> → you need interleaved sets.',
      'You solve problems but <b>run out of time</b> in interviews → add a visible timer to every practice session.',
      'You understand solutions when you read them but <b>cannot reproduce them</b> a week later → re-solve from scratch after 2–3 days.',
      'The same mistake appears <b>twice in your error log</b> → that pattern goes into tomorrow’s set.',
      'Real loop has <b>two mediums in 45 minutes</b> → practise with 20–25 minute caps per medium.'
    ],
    code: { lang: 'python', run: true, title: 'Build an interleaved, weighted practice set (runnable)', code: `import random

# Each pattern has a confidence 1..5 (from your error log). Lower confidence = picked more often.
bank = {
    "two pointers":      (4, ["3Sum", "Container With Most Water", "Sort Colors"]),
    "sliding window":    (3, ["Longest Substring Without Repeating", "Min Window Substring", "Max Consecutive Ones III"]),
    "binary search":     (2, ["Koko Eating Bananas", "Search Rotated Array", "Split Array Largest Sum"]),
    "monotonic stack":   (2, ["Daily Temperatures", "Largest Rectangle in Histogram", "Next Greater Element II"]),
    "graph BFS/topo":    (3, ["Rotting Oranges", "Course Schedule II", "Word Ladder"]),
    "heap":              (4, ["Top K Frequent", "Merge K Sorted Lists", "Find Median from Data Stream"]),
    "dynamic programming": (1, ["Coin Change", "Word Break", "Longest Increasing Subsequence"]),
}

def build_set(size, seed):
    rnd = random.Random(seed)
    names = list(bank)
    weights = [6 - bank[n][0] for n in names]       # confidence 1 -> weight 5, confidence 5 -> weight 1
    chosen = []
    while len(chosen) < size:
        p = rnd.choices(names, weights)[0]
        if p in [c[0] for c in chosen]:             # interleave: never two of the same pattern
            continue
        chosen.append((p, rnd.choice(bank[p][1])))
    rnd.shuffle(chosen)                             # hide the order so you must diagnose
    return chosen

for day in range(1, 4):
    s = build_set(3, seed=day)
    print(f"Day {day}: " + " | ".join(problem for _, problem in s))
    print("        (answer key: " + ", ".join(p for p, _ in s) + ")")
` },
    viz: {
      title: 'Timed set simulator: triage, stuck rule and partial credit',
      input: '60 | 30 12 45',
      inputLabel: 'budget minutes | estimated minutes for each problem (up to 6)',
      gen: function (input) {
        var parts = String(input === undefined ? '' : input).split('|');
        if (parts.length !== 2) throw new Error('Format: budget | estimates, e.g. 60 | 30 12 45');
        var budget = Number(parts[0].trim());
        if (!Number.isInteger(budget) || budget < 10 || budget > 180) throw new Error('Budget must be 10 to 180 minutes');
        var est = parseNums(parts[1], 1, 6, 3, 120, 'estimates');
        var probs = est.map(function (e, i) { return { name: 'P' + (i + 1), est: e }; });
        var frames = [];
        var names = probs.map(function (p) { return p.name + ' (' + p.est + 'm)'; });
        frames.push({ narr: 'Timer starts: <b>' + budget + ' minutes</b>. First move: <b>read all problems</b> (≈2 minutes) and estimate each. Do not start the first one blindly — it might be the hardest.', parts: [
          { type: 'bars', label: 'estimated minutes (input order)', values: est.slice(), idxLabels: names },
          { type: 'vars', label: 'clock', vals: { minute: 2, left: budget - 2 } }
        ] });
        var order = probs.slice().sort(function (a, b) { return a.est - b.est; });
        frames.push({ narr: 'Triage: solve <b>easiest first</b> → ' + order.map(function (p) { return p.name; }).join(' → ') + '. Early wins bank points and calm nerves; the hard one gets whatever time is left.', parts: [
          { type: 'queue', label: 'plan (front = next)', items: order.map(function (p) { return p.name + ' ~' + p.est + 'm'; }), frontLabel: 'next', backLabel: 'last' }
        ] });
        var clock = 2, spent = [], labels = [], status = [];
        order.forEach(function (p, idx) {
          var left = budget - clock;
          var queueLeft = order.slice(idx).map(function (q) { return q.name; });
          if (left < 5) {
            status.push([p.name, 'skipped', 0]);
            frames.push({ narr: '<b>' + p.name + '</b>: only ' + left + ' min left. <span class="c-r">Skip it</span> — but spend 1 minute stating the approach you would use. Interviewers give credit for a correct plan.', parts: [
              { type: 'queue', label: 'remaining', items: queueLeft, hl: { 0: 'bad' } }, { type: 'vars', label: 'clock', vals: { minute: clock, left: left }, hl: { left: 'bad' } }
            ] });
            return;
          }
          var need = p.est, used, verdict;
          if (p.est > 25) {
            var after = 20 + Math.ceil(0.6 * (p.est - 20));
            frames.push({ narr: '<b>' + p.name + '</b> is long (~' + p.est + 'm). At minute 20 of it with no progress, the <b>stuck rule</b> fires: take one hint (or in an interview, say "here is where I am stuck…"). A hint cuts the remaining work: total now ≈ ' + after + 'm.', parts: [
              { type: 'vars', label: p.name, vals: { estimate: p.est, 'with hint': after, 'clock now': clock + 20 }, hl: { 'with hint': 'ok' } },
              txt('Stuck rule', '15–20 min with no new idea → hint 1 only. 30 min → read the approach, close it, code it yourself. Never stare silently.')
            ] });
            need = after;
          }
          if (need <= left) { used = need; verdict = 'solved'; }
          else { used = left; verdict = 'partial: brute force + optimal idea explained'; }
          clock += used; spent.push(used); labels.push(p.name);
          status.push([p.name, verdict, used]);
          frames.push({ narr: '<b>' + p.name + '</b>: ' + (verdict === 'solved' ? '<span class="c-g">solved</span> in ' + used + ' min.' : '<span class="c-y">not enough time</span> for the full solution, so we code the <b>brute force</b> (correct, slower) and <b>describe</b> the optimal idea. Partial, correct work beats a broken "optimal" attempt.') + ' Clock: ' + clock + '/' + budget + '.', parts: [
            { type: 'bars', label: 'minutes actually spent', values: spent.slice(), idxLabels: labels.slice(), hl: one(spent.length - 1, verdict === 'solved' ? 'ok' : 'cur') },
            { type: 'vars', label: 'clock', vals: { minute: clock, left: budget - clock }, hl: { left: budget - clock < 10 ? 'bad' : 'ok' } }
          ] });
        });
        frames.push({ narr: 'Timer over. Now the <b>most important 5 minutes</b>: write an error-log line for anything not solved cleanly, and schedule a from-scratch redo in 2–3 days.', parts: [
          { type: 'table', label: 'Set report', columns: ['problem', 'result', 'minutes'], rows: status, hl: (function () { var h = {}; status.forEach(function (r, i) { h[i] = r[1] === 'solved' ? 'ok' : r[1] === 'skipped' ? 'bad' : 'cur'; }); return h; })() }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Set A — 45 minutes (Easy, Medium, Medium)', html: `<ol><li>Valid Parentheses</li><li>Product of Array Except Self (no division)</li><li>Course Schedule II</li></ol>
        <details><summary>Reveal patterns and target times</summary><p>1. Stack of open brackets — 8 min. 2. Prefix product × suffix product (DSA 5) — 15 min. 3. Kahn’s topological sort, return [] if a cycle remains (DSA 20) — 20 min.</p></details>
        <p>Diagnosis practice: "every opener must match the latest unmatched opener" → LIFO → stack. "Except self" + "no division" → precompute left and right products.</p>` },
      { title: 'Set B — 60 minutes (Medium, Medium, Medium)', html: `<ol><li>Merge Intervals</li><li>Kth Largest Element in an Array</li><li>Word Break</li></ol>
        <details><summary>Reveal patterns and target times</summary><p>1. Sort by start + merge into the last kept interval (DSA 7) — 15 min. 2. Min-heap of size k, or quickselect for average O(N) (DSA 7, 16) — 15 min. 3. DP: <code>dp[i]</code> = can the prefix of length i be split; try every dictionary word ending at i (DSA 19) — 25 min.</p></details>
        <p>The mix forces three different decisions: sort-based greedy, heap selection, and boolean DP.</p>` },
      { title: 'Set C — 75 minutes (Medium, Hard, Hard)', html: `<ol><li>LRU Cache</li><li>Sliding Window Maximum</li><li>Edit Distance</li></ol>
        <details><summary>Reveal patterns and target times</summary><p>1. HashMap + doubly linked list, O(1) get/put (DSA 12) — 20 min. 2. Monotonic deque of indices, front = max (DSA 14) — 20 min. 3. 2D DP over prefixes: insert/delete/replace (DSA 18) — 30 min.</p></details>
        <p>Typical outcome for a first attempt: 2 solved, 1 partial. That is fine — the error log entry is the win.</p>` },
      { title: 'Reading your set results like a coach', html: `${H.table(['symptom in results', 'diagnosis', 'fix'], [
        ['picked the wrong pattern', 'weak clue recognition', 'drill the master map (Topic 1), more interleaving'],
        ['right pattern, code buggy', 'template not automatic', 'type the skeleton from memory daily for a week'],
        ['right code, too slow to write', 'over-thinking or messy code', 'fixed time caps, helper functions, fewer special cases'],
        ['ran out of time on a Hard', 'no triage', 'easiest-first, brute force fallback at the 2/3 mark']
      ])}` }
    ],
    deepDive: `<p><b>Why interleaving works.</b> Blocked practice (AAAA BBBB) trains <i>execution</i> of a known procedure. Interleaved practice (ABCA CBAB) also trains <i>discrimination</i> — telling which procedure applies. Studies in mathematics education (e.g. Rohrer &amp; Taylor) found interleaved students scored markedly higher on delayed tests even though they performed worse during practice. Expect that "it feels worse" signal; it means the session is doing its job.</p>
      <p><b>Spacing and retrieval.</b> Re-solving a problem from a blank file after a gap (the "testing effect") strengthens memory far more than re-reading the solution. A simple schedule: same day (immediately after), +2 days, +7 days, +21 days. Drop it once you solve it cleanly twice in a row.</p>
      <p><b>Desirable difficulty, not misery.</b> Struggle has diminishing returns. After ~20 minutes with no new idea, the learning rate drops sharply; a hint restarts it. The stuck rule balances productive struggle against wasted time.</p>
      <p><b>Calibrating estimates.</b> Track predicted vs actual time per set. Most people underestimate Hard problems by ~50%. After 10–15 sets your estimates become accurate, which is exactly what you need for triage in an online assessment with 3 problems in 90 minutes.</p>
      <p><b>Online assessments (OAs) vs live rounds:</b> OAs reward finishing — partial credit comes from passing test cases, so a brute force that passes 60% of tests is worth submitting early. Live rounds reward reasoning — a clearly explained optimal approach with a small bug often beats a silent, correct brute force.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI is the best practice-set generator you have ever had. It can produce unlimited <b>fresh, disguised</b> problems, so you never run out of unseen material — the main limit of fixed problem lists that you eventually memorise.</p>
      <p><b>Prompts that work:</b> <code>Generate 3 interview problems (1 easy, 2 medium) from different patterns among: monotonic stack, topo sort, binary search on answer, DP. Disguise them with a real-world story. Give constraints and 2 examples each. Put the patterns in a hidden answer key at the end.</code> And after the set: <code>Here is my error log; build tomorrow's set from my weakest two patterns.</code></p>
      <p><b>Where AI goes wrong:</b> generated problems sometimes have wrong sample outputs or ambiguous statements. Verify the sample with a brute force before trusting it.</p>
      <p><b>What you must own:</b> the timer and the discipline. AI cannot make you sit with a problem for 20 minutes before peeking — and that struggle is where the learning happens. Keep the assistant closed during the timed part.</p>`,
    problems: [{
      title: 'Timed Set Warm-up: Group Anagrams', level: 'Medium', tags: ['hashing', 'strings', 'sorting'], companies: ['Amazon', 'Microsoft', 'Uber'],
      statement: `<p>Given an array of lowercase strings, group the anagrams together (words made of the same letters with the same counts). Return the groups in any order. Target time: <b>15 minutes</b> including tests.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>4</sup>, 0 ≤ word length ≤ 100, lowercase English letters only`,
      example: `<p>["eat","tea","tan","ate","nat","bat"] → [[${H.c('g', 'eat, tea, ate')}], [${H.c('b', 'tan, nat')}], [${H.c('p', 'bat')}]]. All words in a group share the same letter counts.</p>`,
      brute: { why: `<p>Compare every word with every group's first word by sorting both: O(N<sup>2</sup> · L log L). With N = 10<sup>4</sup> that is 10<sup>8</sup> comparisons, each costly. The waste: we recompute the "signature" of a word for every comparison instead of using it as a hash key.</p>`, code: `List<List<String>> bruteGroups(String[] words) {
    List<List<String>> groups = new ArrayList<>();
    for (String w : words) {
        char[] a = w.toCharArray(); Arrays.sort(a);
        boolean placed = false;
        for (List<String> g : groups) {
            char[] b = g.get(0).toCharArray(); Arrays.sort(b);   // recomputed every time: the waste
            if (Arrays.equals(a, b)) { g.add(w); placed = true; break; }
        }
        if (!placed) groups.add(new ArrayList<>(List.of(w)));
    }
    return groups;
}` },
      mcq: { q: 'What is the best "signature" key for a word when letters are only a–z and words can be 100 long?', options: ['A 26-count string like "1#0#0#…" built in O(L)', 'The word sorted, O(L log L)', 'The sum of character codes', 'The first and last letters'], answer: 0, explain: 'Counts are O(L) and unique per anagram class. Sorting also works (O(L log L)). Sums collide: "ad" and "bc" have equal sums.' },
      hints: [`<p>Hint 1: Two words are anagrams exactly when their letter counts are equal. Turn the counts into a key.</p>`, `<p>Hint 2: HashMap&lt;String, List&lt;String&gt;&gt; from key → words. One pass.</p>`, `<p>Hint 3: Build the key from int[26] with separators ("#") so counts like 1,11 and 11,1 cannot collide. Empty string gets the all-zero key — still a valid group.</p>`],
      solution: {
        approach: `<p>Clue: "same letters, same counts" → frequency signature + HashMap (DSA 8). Compute the 26-count key per word in O(L), append the word to its bucket.</p>`,
        code: `class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> groups = new HashMap<>();
        for (String w : strs) {
            int[] cnt = new int[26];
            for (int i = 0; i < w.length(); i++) cnt[w.charAt(i) - 'a']++;
            StringBuilder key = new StringBuilder();
            for (int c : cnt) key.append(c).append('#');       // '#' separates counts: no collisions
            groups.computeIfAbsent(key.toString(), k -> new ArrayList<>()).add(w);
        }
        return new ArrayList<>(groups.values());
    }
}`,
        dry: { head: ['word', 'non-zero counts', 'key bucket', 'groups so far'], rows: [['eat', 'a1 e1 t1', 'K1 (new)', '1'], ['tea', 'a1 e1 t1', 'K1', '1'], ['tan', 'a1 n1 t1', 'K2 (new)', '2'], ['ate', 'a1 e1 t1', 'K1', '2'], ['nat', 'a1 n1 t1', 'K2', '2'], ['bat', 'a1 b1 t1', 'K3 (new)', H.c('g', '3')]] },
        complexity: `<p>Time O(N · L) (plus O(26) per key). Space O(N · L) for the groups.</p>`,
        followUps: ['Unicode words instead of a–z?', 'Stream of words: return the current group of a new word in O(L).', 'Find the largest anagram group only — can you avoid storing every word?']
      }
    }]
  });

  // =====================================================================
  // TOPIC 5 — Mock interview walkthroughs
  // =====================================================================
  function parseGrid(input) {
    var rows = String(input === undefined ? '' : input).trim().split('/').map(function (r) {
      return r.trim().split(/[\s,]+/).filter(function (x) { return x !== ''; }).map(Number);
    });
    if (!rows.length || rows.length > 6) throw new Error('Use 1 to 6 rows separated by /, e.g. 2 1 1 / 1 1 0 / 0 1 1');
    var C = rows[0].length;
    if (!C || C > 7) throw new Error('Use 1 to 7 cells per row');
    rows.forEach(function (r) {
      if (r.length !== C) throw new Error('Every row needs the same number of cells');
      if (r.some(function (x) { return [0, 1, 2].indexOf(x) < 0; })) throw new Error('Cells must be 0 (empty), 1 (fresh) or 2 (rotten)');
    });
    return rows;
  }
  function orangeGrid(g, label, extra) {
    var hl = {};
    g.forEach(function (r, i) { r.forEach(function (v, j) { if (v === 1) hl[i + ',' + j] = 'ok'; else if (v === 2) hl[i + ',' + j] = 'bad'; }); });
    Object.keys(extra || {}).forEach(function (k) { hl[k] = extra[k]; });
    return { type: 'grid', label: label, rows: g.map(function (r) { return r.map(function (v) { return v === 0 ? '·' : v === 1 ? '🍊' : '🟤'; }); }), hl: hl };
  }

  topics.push({
    title: 'Mock Interview Walkthroughs: What a Strong Round Sounds Like',
    analogy: `<p>A cooking show does not just show the finished dish. The chef <b>talks while cooking</b>: "I am salting the water now because pasta absorbs it… I am tasting before plating." You learn the dish <i>and</i> the judgement.</p>
      <p>A coding interview is a cooking show with one viewer — the interviewer. They cannot see inside your head. If you stay silent for ten minutes and then produce perfect code, they saw a magic trick, not an engineer. These walkthroughs show the full "talk while cooking" script.</p>`,
    explain: `<p>A typical 45-minute coding round has a predictable shape. Knowing it lowers stress, because nothing comes as a surprise:</p>
      ${H.table(['minutes', 'phase', 'what the interviewer is checking'], [
        ['0–5', 'intro, problem shared', 'are you calm and friendly?'],
        ['5–12', 'clarify + examples + brute force', 'do you understand before acting? do you ask good questions?'],
        ['12–20', 'optimise + agree on approach', 'problem solving: can you find and justify the right pattern?'],
        ['20–35', 'code', 'clean, correct, readable code; talking while typing'],
        ['35–40', 'test + fix', 'do you verify your own work, or wait to be told?'],
        ['40–45', 'follow-ups + your questions', 'depth: scale, variants, trade-offs']
      ])}
      <h4>Walkthrough 1 — Rotting Oranges (multi-source BFS)</h4>
      <p><b>Problem:</b> grid cells are 0 (empty), 1 (fresh orange) or 2 (rotten). Each minute, rotten oranges rot their 4 neighbours. Return the minutes until no fresh orange remains, or −1 if impossible.</p>
      ${H.table(['speaker', 'line', 'why it is strong'], [
        ['Candidate', '"Can rot spread diagonally? Can the grid be empty, or have no fresh oranges at all?"', 'clarifies edge cases (answer 0 when no fresh)'],
        ['Candidate', '"Brute force: simulate minute by minute, scanning the whole grid each minute. That is O((R·C)<sup>2</sup>) worst case."', 'baseline + complexity'],
        ['Candidate', '"Rot spreads one step per minute from <b>all</b> rotten oranges at once — that is BFS from multiple sources. Each BFS level is one minute."', 'names the pattern and the reason'],
        ['Interviewer', '"Why BFS and not DFS?"', 'probe'],
        ['Candidate', '"BFS processes cells in order of distance, so the level number is exactly the minute a cell rots. DFS would reach cells by long paths first and need extra work to fix times."', 'justifies, compares'],
        ['Candidate', '(codes, narrating) "I count fresh oranges first; at the end, if fresh &gt; 0, return −1."', 'plans the impossible case up front'],
        ['Candidate', '"Let me trace the sample: level 0 = {(0,0)}, level 1 rots (0,1),(1,0)…"', 'tests without being asked'],
        ['Candidate', '"O(R·C) time and space: every cell enters the queue at most once."', 'closes with complexity']
      ])}
      <h4>What interviewers' phrases usually mean</h4>
      ${H.table(['they say', 'it usually means', 'good response'], [
        ['"Are you sure about that line?"', 'there is a bug there', 'trace that line with a tiny input, out loud'],
        ['"Can we do better?"', 'a faster or leaner solution exists', 'find the repeated work in your current solution'],
        ['"What if the input does not fit in memory?"', 'scaling follow-up', 'streaming, chunking, external sort, approximate structures'],
        ['"Let’s move on to coding."', 'your approach is accepted — stop optimising', 'start coding immediately'],
        ['"Interesting…" + silence', 'they are waiting to see if you notice something', 're-check the last step, test an edge case'],
        ['"What about duplicates / negatives?"', 'an edge case breaks the current idea', 'adjust or explain why it still works']
      ])}`,
    clues: [
      'Interviewer gives a <b>vague statement</b> on purpose → they are grading your clarifying questions; ask 2–4 sharp ones.',
      'Interviewer asks "<b>why X and not Y?</b>" → they want a comparison with a reason, not a change of answer.',
      'Interviewer says "<b>let us move on</b>" → stop polishing; coding time is precious.',
      'Interviewer repeats your words back as a question → usually a <b>hint that something is off</b>.',
      'Last 5 minutes with "<b>any follow-ups?</b>" → expect scale, streaming, or a variant; think out loud.'
    ],
    code: [{ lang: 'python', run: true, title: 'Walkthrough 1 code: rotting oranges, level by level (runnable)', code: `from collections import deque

def oranges_rotting(grid):
    R, C = len(grid), len(grid[0])
    q = deque()
    fresh = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] == 2:
                q.append((r, c))           # every rotten orange is a BFS source
            elif grid[r][c] == 1:
                fresh += 1
    minutes = 0
    while q and fresh:
        for _ in range(len(q)):           # one full level = one minute
            r, c = q.popleft()
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 1:
                    grid[nr][nc] = 2       # mark when ENQUEUED, so no cell enters twice
                    fresh -= 1
                    q.append((nr, nc))
        minutes += 1
    return -1 if fresh else minutes

print(oranges_rotting([[2, 1, 1], [1, 1, 0], [0, 1, 1]]))  # 4
print(oranges_rotting([[2, 1, 1], [0, 1, 1], [1, 0, 1]]))  # -1 (bottom-left is unreachable)
print(oranges_rotting([[0, 2]]))                           # 0 (nothing fresh)
` }, `
// Walkthrough 3 code: LRU cache with O(1) get/put — HashMap for lookup + doubly linked list for order.
class LRUCache {
    private static class Node { int key, val; Node prev, next; Node(int k, int v) { key = k; val = v; } }
    private final int capacity;
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node head = new Node(0, 0), tail = new Node(0, 0); // sentinels: no null checks

    public LRUCache(int capacity) {
        this.capacity = capacity;
        head.next = tail; tail.prev = head;
    }
    public int get(int key) {
        Node n = map.get(key);
        if (n == null) return -1;
        unlink(n); addFront(n);                 // touched -> most recently used
        return n.val;
    }
    public void put(int key, int value) {
        Node n = map.get(key);
        if (n != null) { n.val = value; unlink(n); addFront(n); return; }
        if (map.size() == capacity) {           // evict least recently used (just before tail)
            Node lru = tail.prev;
            unlink(lru); map.remove(lru.key);
        }
        n = new Node(key, value);
        map.put(key, n); addFront(n);
    }
    private void unlink(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }
    private void addFront(Node n) { n.next = head.next; n.prev = head; head.next.prev = n; head.next = n; }
}`],
    codeTitle: ['Rotting oranges (Python, runnable)', 'LRU cache (Java)'],
    viz: {
      title: 'Mock round replay: Rotting Oranges with the candidate’s script',
      input: '2 1 1 / 1 1 0 / 0 1 1',
      inputLabel: 'Grid rows separated by / (0 empty, 1 fresh, 2 rotten)',
      gen: function (input) {
        var g = parseGrid(input);
        var R = g.length, C = g[0].length, frames = [];
        frames.push({ narr: '<b>Interviewer:</b> "Here is a grid of oranges…" <b>Candidate:</b> "Before I start: rot spreads only up/down/left/right? If there are no fresh oranges I return 0, and if some can never be reached I return −1?" — two edge cases nailed in the first minute.', parts: [
          orangeGrid(g, 'grid (🍊 fresh, 🟤 rotten, · empty)'), txt('Phase', 'Clarify (minutes 0–5)')
        ] });
        frames.push({ narr: '<b>Candidate:</b> "Brute force would re-scan the whole grid every minute: O((R·C)²). But every rotten orange spreads at the same speed — that is <b>BFS from many sources at once</b>. One BFS level = one minute." <b>Interviewer:</b> "Sounds good, go ahead."', parts: [
          orangeGrid(g, 'grid'), txt('Phase', 'Approach agreed (minutes 5–15). Pattern: multi-source BFS (DSA 20).')
        ] });
        var q = [], fresh = 0;
        g.forEach(function (r, i) { r.forEach(function (v, j) { if (v === 2) q.push([i, j]); else if (v === 1) fresh++; }); });
        frames.push({ narr: '<b>Candidate (coding):</b> "First pass: put every rotten orange in the queue and count fresh ones. Fresh = ' + fresh + '." Narrating each line keeps the interviewer with you.', parts: [
          orangeGrid(g, 'grid'), { type: 'queue', label: 'BFS queue (level 0 sources)', items: q.map(function (p) { return '(' + p[0] + ',' + p[1] + ')'; }), frontLabel: 'front', backLabel: 'back' },
          { type: 'vars', vals: { fresh: fresh, minute: 0 } }
        ] });
        var minute = 0, guard = 0;
        while (q.length && fresh > 0 && guard++ < 40) {
          var next = [], newly = {};
          q.forEach(function (p) {
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
              var r = p[0] + d[0], c = p[1] + d[1];
              if (r >= 0 && c >= 0 && r < R && c < C && g[r][c] === 1) { g[r][c] = 2; fresh--; next.push([r, c]); newly[r + ',' + c] = 'cur'; }
            });
          });
          minute++;
          q = next;
          frames.push({ narr: 'Minute <b>' + minute + '</b>: the whole current level spreads at once. ' + next.length + ' orange(s) rot now (amber). <b>Candidate:</b> "I mark them rotten when I enqueue them, so no cell is added twice." Fresh left: ' + fresh + '.', parts: [
            orangeGrid(g, 'grid after minute ' + minute, newly),
            { type: 'queue', label: 'next level', items: next.map(function (p) { return '(' + p[0] + ',' + p[1] + ')'; }) },
            { type: 'vars', vals: { minute: minute, fresh: fresh }, hl: { minute: 'cur' } }
          ] });
        }
        var ans = fresh > 0 ? -1 : minute;
        frames.push({ narr: fresh > 0 ? '<b>Queue empty but ' + fresh + ' fresh orange(s) remain</b> — walled off by empty cells. <b>Candidate:</b> "That is the −1 case I mentioned at the start." Answer <b>−1</b>.' : 'No fresh oranges left → answer <b>' + ans + '</b> minutes. <b>Candidate:</b> "Let me double-check the boundary: if the grid had no fresh oranges, the loop never runs and I return 0. Good."', parts: [
          orangeGrid(g, 'final grid'), { type: 'vars', label: 'result', vals: { answer: ans }, hl: { answer: ans < 0 ? 'bad' : 'sel' } }
        ] });
        frames.push({ narr: '<b>Interviewer follow-up:</b> "What if the grid is huge and arrives row by row?" <b>Candidate:</b> "BFS needs random access to neighbours, so I would process it in bands with a halo of one row, or switch to a distance-transform style two-pass DP. Time stays O(R·C)." Strong close: complexity + a sensible scaling idea.', parts: [
          txt('Scorecard', 'Problem solving ✔ (pattern + justification) · Coding ✔ (clean BFS) · Verification ✔ (traced, edge cases) · Communication ✔ (narrated throughout)')
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Walkthrough 2 — Longest Substring Without Repeating Characters', html: `<details><summary>Show the full transcript</summary>
        <p><b>C:</b> "Characters are ASCII? Empty string returns 0?" <b>I:</b> "Yes and yes."</p>
        <p><b>C:</b> "Brute force: every substring, check uniqueness with a set — O(N³), or O(N²) if I extend from each start."</p>
        <p><b>C:</b> "The clues are <i>substring</i> and <i>longest</i>, and the condition 'no repeats' only gets worse as the window grows — a sliding window fits. I keep the last index of each character; when s[right] was seen inside the window, jump left past it."</p>
        <p><b>I:</b> "Why jump instead of moving left one step at a time?" <b>C:</b> "Both are O(N) overall, but jumping is one assignment. I must use max(left, last+1) so left never moves backwards."</p>
        <p><b>C:</b> (traces "abba") "At the second 'a', last['a'] = 0 but left is already 2 — the max() saves me. Answer 2."</p></details>
        <p>The key moment: the candidate <b>tested the tricky case "abba"</b> on their own. That one trace is worth more than five easy ones.</p>`, code: `int lengthOfLongestSubstring(String s) {
    int[] last = new int[128];
    Arrays.fill(last, -1);
    int left = 0, best = 0;
    for (int right = 0; right < s.length(); right++) {
        char ch = s.charAt(right);
        left = Math.max(left, last[ch] + 1);   // never move left backwards ("abba")
        last[ch] = right;
        best = Math.max(best, right - left + 1);
    }
    return best;
}` },
      { title: 'Walkthrough 3 — Design an LRU cache', html: `<p><b>C:</b> "Both get and put must be O(1). O(1) lookup means a HashMap. O(1) 'move to most recent' and 'remove least recent' means a doubly linked list — I can unlink a node in O(1) if I hold a pointer to it, which the map gives me."</p>
        <p><b>C:</b> "I'll use two sentinel nodes, head and tail, so I never check for null when inserting or removing."</p>
        <p><b>I:</b> "Could you use Java's LinkedHashMap?" <b>C:</b> "Yes — with accessOrder = true and removeEldestEntry overridden it is an LRU in 10 lines. I'll mention it, but I'll build it by hand since that is what you are assessing. In production I would use the library or Caffeine."</p>
        <p>Strong because: complexity requirement → data structures, explicit sentinel choice, and an honest production note.</p>` },
      { title: 'Weak vs strong at the same moment', html: `${H.table(['moment', 'weak candidate', 'strong candidate'], [
        ['problem read', 'starts typing immediately', 'restates, asks about edge cases'],
        ['stuck', 'silence for 4 minutes', '"I am considering a heap, but the update cost worries me because…"'],
        ['bug found by interviewer', 'gets defensive or random-edits', '"Good catch — let me trace it with [1,2]… I see, the loop bound should be ≤."'],
        ['finished code', '"I think it works."', 'traces a normal case and an edge case, states complexity'],
        ['follow-up', '"I don’t know."', '"I haven’t done that, but my first idea would be…"']
      ])}` },
      { title: 'Handling a follow-up you have never seen', html: `<p><b>I:</b> "Now the oranges also have a 'resistance' — some take 2 minutes to rot." This changes edge weights from 1 to {1, 2}. Strong answer: "Then BFS levels no longer equal time. With small integer weights I can use a <b>Dijkstra</b> with a heap, or a bucket queue / 0-1 BFS style deque if weights were 0 or 1. Complexity becomes O(R·C log(R·C))." You connected the twist back to the map (DSA 21) instead of panicking.</p>` }
    ],
    deepDive: `<p><b>How rounds are actually scored.</b> Most big-tech rubrics have 4 dimensions — problem solving, coding, verification/testing, communication — each rated roughly from "strong no" to "strong yes", plus a free-text summary. Hiring committees read the text. A sentence like "candidate spotted multi-source BFS quickly, explained why BFS gives minutes, traced the −1 case unprompted" is what gets offers. Your job is to <b>generate evidence</b> for those sentences.</p>
      <p><b>Hints are not failures.</b> Interviewers note how much help you needed and how fast you used it. Taking a hint and running with it is a mild signal; needing the same hint repeated is a strong one. Ask for hints with structure: "I am choosing between a heap and sorting; is there a constraint I am missing?"</p>
      <p><b>Silence budget.</b> Thinking silently for 30–60 seconds is fine if you announce it: "Let me think about this for a moment." Beyond 2 minutes the interviewer has nothing to write down — narrate partial thoughts instead.</p>
      <p><b>Code quality signals:</b> meaningful names (<code>fresh</code>, <code>minutes</code>, not <code>x</code>, <code>t</code>), helper functions for the inner check, early returns for edge cases, no dead code. Reviewers mentally ask "would I approve this PR?"</p>
      <p><b>Mock practice that works:</b> record yourself (screen + voice) solving a problem, then watch it at 1.5×. Count silent gaps over 60 seconds and places where you coded before agreeing on an approach. Two recordings fix more habits than twenty silent solves.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI makes excellent mock interviewers — patient, available at 2 a.m., and able to play a strict or friendly persona. Voice-mode assistants can run a full 45-minute round, interrupt with "why?", and give rubric-based feedback afterwards.</p>
      <p><b>Prompt for a realistic mock:</b> <code>You are a senior engineer interviewing me for an SDE-2 role. Give me one medium graph problem. Answer clarifying questions briefly. Do not give hints unless I ask, and keep count of hints. When I say 'done', score me 1-4 on problem solving, coding, testing, communication, with quotes from my answers as evidence.</code></p>
      <p><b>AI-assisted rounds (growing in 2025–2026):</b> some companies let you use an assistant during the interview. The bar then shifts: generate code fast, but <b>review it out loud</b> — "This BFS marks cells when dequeued, which can add duplicates; I'll move the mark to enqueue time." Catching AI's subtle bugs is the new signal of seniority.</p>
      <p><b>What you must still own:</b> composure, live reasoning, and judgement about trade-offs. No tool sits in the room for you in a traditional round.</p>`,
    problems: [{
      title: 'Mock Round: Rotting Oranges', level: 'Medium', tags: ['multi-source BFS', 'grid', 'graph'], companies: ['Amazon', 'Microsoft', 'Google'],
      statement: `<p>In an R × C grid, 0 = empty, 1 = fresh orange, 2 = rotten orange. Every minute, each rotten orange rots its 4-directional fresh neighbours. Return the minimum minutes until no fresh orange remains, or −1 if that is impossible.</p><p>Solve it as if in a live round: clarify, brute force, pattern, code, trace.</p>`,
      constraints: `1 ≤ R, C ≤ 10 (follow-up: up to 1000), grid[i][j] ∈ {0, 1, 2}`,
      example: `<p>[[2,1,1],[1,1,0],[0,1,1]] → <b>${H.c('g', '4')}</b>. The bottom-right orange is 4 steps from the only rotten one. [[2,1,1],[0,1,1],[1,0,1]] → <b>${H.c('r', '−1')}</b>: the bottom-left orange is walled off.</p>`,
      brute: { why: `<p>Simulate minute by minute: scan the whole grid, rot neighbours of rotten cells (using a copy so new rot does not spread in the same minute). Up to R·C minutes × R·C cells = O((R·C)<sup>2</sup>). The waste: rescanning cells that cannot change.</p>`, code: `int bruteRotting(int[][] grid) {
    int R = grid.length, C = grid[0].length, minutes = 0;
    int[] dr = {1, -1, 0, 0}, dc = {0, 0, 1, -1};
    while (true) {
        int[][] next = new int[R][];
        for (int r = 0; r < R; r++) next[r] = grid[r].clone();
        boolean changed = false;
        for (int r = 0; r < R; r++)
            for (int c = 0; c < C; c++) {
                if (grid[r][c] != 2) continue;
                for (int d = 0; d < 4; d++) {
                    int nr = r + dr[d], nc = c + dc[d];
                    if (nr >= 0 && nc >= 0 && nr < R && nc < C && grid[nr][nc] == 1) { next[nr][nc] = 2; changed = true; }
                }
            }
        if (!changed) break;
        grid = next; minutes++;
    }
    for (int[] row : grid) for (int v : row) if (v == 1) return -1;
    return minutes;
}` },
      mcq: { q: 'Why must the BFS start with ALL rotten oranges in the queue at once?', options: ['They all spread simultaneously, so level k of a multi-source BFS is exactly minute k', 'To save memory', 'Because DFS would be faster otherwise', 'It does not matter; one source at a time gives the same answer'], answer: 0, explain: 'Running BFS from one source at a time would compute distances from that source only; the true minute is the distance to the NEAREST rotten orange, which a multi-source BFS gives directly.' },
      hints: [`<p>Hint 1: The minute a fresh orange rots = its distance to the nearest rotten orange.</p>`, `<p>Hint 2: Multi-source BFS: enqueue every rotten cell first. Process the queue level by level; each level is one minute.</p>`, `<p>Hint 3: Count fresh oranges up front, decrement as they rot. Mark rotten when enqueuing. If fresh &gt; 0 at the end → −1; if fresh was 0 from the start → 0.</p>`],
      solution: {
        approach: `<p>Multi-source BFS (DSA 20). All rotten cells are level 0. Each level rots all fresh neighbours of the current level. Stop when the queue is empty or no fresh oranges remain.</p>`,
        code: `class Solution {
    public int orangesRotting(int[][] grid) {
        int R = grid.length, C = grid[0].length, fresh = 0;
        Deque<int[]> q = new ArrayDeque<>();
        for (int r = 0; r < R; r++)
            for (int c = 0; c < C; c++) {
                if (grid[r][c] == 2) q.add(new int[]{r, c}); // every rotten orange is a source
                else if (grid[r][c] == 1) fresh++;
            }
        int minutes = 0;
        int[] dr = {1, -1, 0, 0}, dc = {0, 0, 1, -1};
        while (!q.isEmpty() && fresh > 0) {
            for (int size = q.size(); size > 0; size--) {   // one level = one minute
                int[] cur = q.poll();
                for (int d = 0; d < 4; d++) {
                    int nr = cur[0] + dr[d], nc = cur[1] + dc[d];
                    if (nr < 0 || nc < 0 || nr >= R || nc >= C || grid[nr][nc] != 1) continue;
                    grid[nr][nc] = 2;                           // mark at enqueue time
                    fresh--;
                    q.add(new int[]{nr, nc});
                }
            }
            minutes++;
        }
        return fresh == 0 ? minutes : -1;
    }
}`,
        dry: { head: ['minute', 'level (rotting now)', 'fresh left'], rows: [['0', '(0,0) sources', '6'], ['1', '(1,0) (0,1)', '4'], ['2', '(1,1) (0,2)', '2'], ['3', '(2,1)', '1'], ['4', '(2,2)', H.c('g', '0 → answer 4')]] },
        complexity: `<p>Time O(R·C): each cell is enqueued at most once and checks 4 neighbours. Space O(R·C) for the queue in the worst case.</p>`,
        followUps: ['Return the time each orange rots (store distances).', 'Some cells take 2 minutes to rot — what algorithm now?', 'Do it without modifying the input grid.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 6 — Debugging under pressure
  // =====================================================================
  var BUGGY = 'int lo = 0, hi = n - 1;\nwhile (lo < hi) {\n  int mid = (lo + hi) / 2;\n  if (a[mid] < t) lo = mid;\n  else hi = mid;\n}\nreturn lo;';
  var FIXED = 'int lo = 0, hi = n;          // answer can be n\nwhile (lo < hi) {\n  int mid = lo + (hi - lo) / 2;\n  if (a[mid] < t) lo = mid + 1; // mid is too small: skip it\n  else hi = mid;\n}\nreturn lo;';

  topics.push({
    title: 'Debugging Under Pressure',
    analogy: `<p>When a car will not start, a good mechanic does not randomly swap parts. She checks the <b>usual suspects in order</b> — battery, fuel, starter — and tests each with a simple tool. Random part-swapping is how a 10-minute fix becomes a 3-hour mess.</p>
      <p>In an interview your code "will not start" at the worst moment: the sample gives the wrong answer and the clock is ticking. Panic-editing (changing <code>&lt;</code> to <code>&lt;=</code> and hoping) is the random part-swap. This topic gives you the mechanic’s order of checks.</p>`,
    explain: `<p>Bugs under pressure are almost never exotic. They come from a short list, and a calm, fixed routine finds them fast.</p>
      <h4>The 5-step debugging routine</h4>
      ${H.table(['step', 'do this', 'not this'], [
        ['1. <b>Stop typing</b>', 'say "Let me trace this instead of guessing."', 'edit lines at random'],
        ['2. <b>Shrink the input</b>', 'find the smallest failing case: 1–3 elements, a single row, k = 1', 'trace a 10-element example'],
        ['3. <b>Trace with a state table</b>', 'write the variables per iteration, as in the dry-run tables in this course', 'trace "in your head"'],
        ['4. <b>Compare with intent</b>', 'at each row ask "is this what I meant this variable to hold?" — the first wrong row is the bug', 'jump to the end result'],
        ['5. <b>Fix the cause, re-run all tests</b>', 'one minimal change, then re-trace the failing case and one earlier passing case', 'stack several fixes at once']
      ])}
      <h4>The usual suspects (check in this order)</h4>
      ${H.table(['suspect', 'looks like', 'quick test'], [
        ['Off-by-one in bounds', '<code>i &lt;= n</code>, <code>hi = n - 1</code> when the answer can be n', 'input of size 1 and target past the end'],
        ['Loop that cannot shrink', '<code>lo = mid</code> with <code>mid = (lo+hi)/2</code>', 'two elements left: does the range get smaller?'],
        ['Wrong initial value', '<code>best = 0</code> when all values can be negative', 'all-negative input'],
        ['Integer overflow', '<code>int sum</code> of 10<sup>5</sup> values up to 10<sup>9</sup>; <code>(lo+hi)/2</code>', 'max values; use <code>long</code>'],
        ['Visited marked too late', 'BFS marks on dequeue → same cell queued many times', 'count queue pushes on a small grid'],
        ['State not reset', 'global array or static field reused between test cases', 'run two test cases back to back'],
        ['Aliasing', '<code>Arrays.fill(grid, row)</code> — every row is the same object; adding a list to results then mutating it', 'change one cell, print all rows'],
        ['Java object equality', '<code>Integer a == Integer b</code> fails above 127; <code>String ==</code>', 'values like 1000'],
        ['Comparator overflow', '<code>(a, b) -&gt; a - b</code> with large negatives', 'sort [Integer.MIN_VALUE, 1]'],
        ['Missing base case / return', 'recursion never stops, or the result of a recursive call is ignored', 'smallest input (n = 0, null node)']
      ])}
      <h4>What to say while debugging</h4>
      <p>"My output is 3 but expected 2. Let me take the smallest failing input, [1, 2], and trace. lo = 0, hi = 1, mid = 0… here <code>lo</code> stays 0 — the range does not shrink. The fix is <code>lo = mid + 1</code> because mid is already known to be too small." The interviewer sees a <b>method</b>, which is graded more kindly than the bug itself.</p>`,
    clues: [
      'The code works on the sample but the interviewer asks "<b>what about [x]?</b>" → they have found the bug; trace exactly that input.',
      'Your program <b>hangs</b> → a loop range that cannot shrink (binary search <code>lo = mid</code>) or a missing visited mark.',
      'Answers are <b>slightly off</b> (by 1) → boundary conditions: &lt; vs ≤, n vs n−1, inclusive vs exclusive end.',
      'Answers are <b>wildly wrong or negative</b> for big inputs → integer overflow.',
      'Correct alone, wrong when run <b>after another test</b> → state not reset (static fields, reused arrays).'
    ],
    code: [{ lang: 'python', run: true, title: 'Stress testing: let random small inputs find the bug (runnable)', code: `import random

def max_subarray_buggy(a):
    best = 0                      # BUG: assumes the answer is at least 0
    cur = 0
    for x in a:
        cur = max(x, cur + x)
        best = max(best, cur)
    return best

def max_subarray_brute(a):        # obviously-correct O(N^2) oracle
    return max(sum(a[i:j + 1]) for i in range(len(a)) for j in range(i, len(a)))

random.seed(1)
for trial in range(1, 1001):
    n = random.randint(1, 4)                       # SMALL inputs: easy to trace by hand
    a = [random.randint(-5, 5) for _ in range(n)]
    if max_subarray_buggy(a) != max_subarray_brute(a):
        print("trial", trial, "counterexample:", a)
        print("  buggy says", max_subarray_buggy(a), "but correct is", max_subarray_brute(a))
        break
else:
    print("no difference found")

def max_subarray_fixed(a):
    best = cur = a[0]             # FIX: start from a real element
    for x in a[1:]:
        cur = max(x, cur + x)
        best = max(best, cur)
    return best

print("fixed passes all:", all(max_subarray_fixed(t) == max_subarray_brute(t)
      for t in ([random.randint(-5, 5) for _ in range(random.randint(1, 6))] for _ in range(2000))))
` }, `
// The same stress-test harness in Java: fast solution vs brute force on thousands of tiny random inputs.
class StressTest {
    static int fast(int[] a, int t) {                 // lower bound: first index with a[i] >= t
        int lo = 0, hi = a.length;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (a[mid] < t) lo = mid + 1; else hi = mid;
        }
        return lo;
    }
    static int brute(int[] a, int t) {
        for (int i = 0; i < a.length; i++) if (a[i] >= t) return i;
        return a.length;
    }
    public static void main(String[] args) {
        Random rnd = new Random(42);
        for (int trial = 0; trial < 10000; trial++) {
            int n = rnd.nextInt(6);                    // include the empty array!
            int[] a = new int[n];
            for (int i = 0; i < n; i++) a[i] = rnd.nextInt(10);
            Arrays.sort(a);
            int t = rnd.nextInt(12) - 1;
            if (fast(a, t) != brute(a, t)) {
                System.out.println("MISMATCH " + Arrays.toString(a) + " t=" + t);
                return;
            }
        }
        System.out.println("all 10000 tiny tests agree");
    }
}`],
    codeTitle: ['Stress test finds the bug (Python, runnable)', 'Stress-test harness (Java)'],
    viz: {
      title: 'Trace a buggy binary search, catch the infinite loop, then fix it',
      input: '1 3 5 7 9 | 6',
      inputLabel: 'sorted numbers | target',
      gen: function (input) {
        var sp = String(input === undefined ? '' : input).split('|');
        if (sp.length !== 2) throw new Error('Format: sorted numbers | target, e.g. 1 3 5 7 9 | 6');
        var a = parseNums(sp[0], 1, 12, -99, 99, 'the array');
        for (var z = 1; z < a.length; z++) if (a[z] < a[z - 1]) throw new Error('The array must be sorted ascending');
        var t = Number(sp[1].trim());
        if (!Number.isInteger(t) || t < -99 || t > 999) throw new Error('Target must be a whole number');
        var n = a.length, frames = [];
        frames.push({ narr: 'Goal: return the <b>first index i with a[i] ≥ ' + t + '</b> (where to insert ' + t + '). The first draft below fails on the sample. Rule 1: <b>stop editing, start tracing</b>.', parts: [
          { type: 'array', label: 'a', values: a, showIdx: true }, { type: 'code', label: 'buggy draft', lang: 'java', code: BUGGY, hl: {} }
        ] });
        var lo = 0, hi = n - 1, seen = {}, steps = 0, hung = false, rows = [];
        while (lo < hi && steps < 12) {
          var mid = Math.floor((lo + hi) / 2), key = lo + ',' + hi;
          var repeat = seen[key];
          seen[key] = true;
          var goRight = a[mid] < t;
          rows.push([steps + 1, lo, hi, mid, a[mid], goRight ? 'lo = mid' : 'hi = mid']);
          var ptr = {}; ptr[lo] = 'lo'; ptr[hi] = (ptr[hi] ? ptr[hi] + '/' : '') + 'hi'; ptr[mid] = (ptr[mid] ? ptr[mid] + '/' : '') + 'mid';
          frames.push({ narr: (repeat ? '<span class="c-r"><b>Same (lo, hi) = (' + lo + ', ' + hi + ') as before!</b></span> The range did not shrink, so this loop will spin forever. Found it: when a[mid] &lt; t we set <code>lo = mid</code>, and with two elements left mid == lo.' : 'Trace row ' + (steps + 1) + ': lo=' + lo + ', hi=' + hi + ', mid=' + mid + ', a[mid]=' + a[mid] + (goRight ? ' &lt; ' : ' ≥ ') + t + ' → ' + (goRight ? '<code>lo = mid</code>' : '<code>hi = mid</code>') + '.'), parts: [
            { type: 'array', label: 'a', values: a, ptr: ptr, range: [lo, hi], hl: one(mid, repeat ? 'bad' : 'cur') },
            { type: 'table', label: 'state table (write this on the whiteboard)', columns: ['row', 'lo', 'hi', 'mid', 'a[mid]', 'action'], rows: rows.slice(), hl: one(rows.length - 1, repeat ? 'bad' : 'cur') },
            { type: 'code', label: 'buggy draft', lang: 'java', code: BUGGY, hl: { 3: 'cur', 4: goRight ? (repeat ? 'bad' : 'cur') : '', 5: goRight ? '' : 'cur' } }
          ] });
          if (repeat) { hung = true; break; }
          if (goRight) lo = mid; else hi = mid;
          steps++;
        }
        if (!hung) {
          var wrong = lo, truth = 0;
          while (truth < n && a[truth] < t) truth++;
          frames.push({ narr: 'The buggy loop ended with <b>' + wrong + '</b>; the correct answer is <b>' + truth + '</b>. ' + (wrong === truth ? 'It happens to be right on this input — that is why bugs survive! Try a target bigger than every element (answer should be n = ' + n + ', but <code>hi = n − 1</code> can never return n), or a target between two neighbours.' : '<span class="c-r">Wrong</span>: the search space <code>[0, n−1]</code> never includes n, and/or <code>lo = mid</code> stalls.'), parts: [
            { type: 'array', label: 'a', values: a, hl: one(Math.min(wrong, n - 1), wrong === truth ? 'ok' : 'bad') },
            { type: 'table', label: 'state table', columns: ['row', 'lo', 'hi', 'mid', 'a[mid]', 'action'], rows: rows.length ? rows.slice() : [['—', 0, n - 1, '—', '—', 'loop skipped']] }
          ] });
        }
        frames.push({ narr: 'Two minimal fixes, each with a reason: (1) <code>hi = n</code> because "insert at the end" is a valid answer; (2) <code>lo = mid + 1</code> because a[mid] &lt; t proves mid is <b>not</b> the answer, and +1 guarantees the range shrinks. Also use <code>lo + (hi − lo) / 2</code> out of habit.', parts: [
          { type: 'code', label: 'fixed', lang: 'java', code: FIXED, hl: { 1: 'ok', 4: 'ok' } }
        ] });
        lo = 0; hi = n; rows = [];
        var guard = 0;
        while (lo < hi && guard++ < 20) {
          var m2 = lo + Math.floor((hi - lo) / 2), r2 = a[m2] < t;
          rows.push([rows.length + 1, lo, hi, m2, a[m2], r2 ? 'lo = mid+1' : 'hi = mid']);
          var p2 = {}; p2[lo] = 'lo'; if (hi < n) p2[hi] = (p2[hi] ? p2[hi] + '/' : '') + 'hi'; p2[m2] = (p2[m2] ? p2[m2] + '/' : '') + 'mid';
          if (r2) lo = m2 + 1; else hi = m2;
          frames.push({ narr: 'Fixed trace row ' + rows.length + ': a[' + m2 + '] = ' + a[m2] + (r2 ? ' &lt; ' : ' ≥ ') + t + ' → ' + (r2 ? 'lo = ' + lo : 'hi = ' + hi) + '. The range <b>always shrinks</b> now.', parts: [
            { type: 'array', label: 'a', values: a, ptr: p2, hl: one(m2, 'cur'), range: [Math.min(lo, n - 1), Math.min(Math.max(hi - 1, lo), n - 1)] },
            { type: 'table', label: 'fixed state table', columns: ['row', 'lo', 'hi', 'mid', 'a[mid]', 'action'], rows: rows.slice(), hl: one(rows.length - 1, 'ok') }
          ] });
        }
        frames.push({ narr: 'Answer: <b>' + lo + '</b>' + (lo === n ? ' (insert at the very end)' : ' (a[' + lo + '] = ' + a[lo] + ' is the first value ≥ ' + t + ')') + '. Finally re-run the earlier passing tests too — a fix that breaks old cases is not a fix.', parts: [
          { type: 'array', label: 'a', values: a, hl: lo < n ? one(lo, 'sel') : {} }, { type: 'vars', vals: { answer: lo, n: n }, hl: { answer: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'The Integer cache trap', html: `<p>Two <code>Integer</code> objects compared with <code>==</code> compare <b>references</b>. Java caches −128..127, so small tests pass and large ones fail — a classic "works on the sample, fails on hidden tests" bug.</p>`, code: `Map<String, Integer> a = new HashMap<>(), b = new HashMap<>();
a.put("x", 1000); b.put("x", 1000);
System.out.println(a.get("x") == b.get("x"));        // false: different Integer objects
System.out.println(a.get("x").equals(b.get("x")));   // true: compares values
System.out.println(a.get("x").intValue() == b.get("x")); // true: unboxed comparison` },
      { title: 'Comparator overflow', html: `<p><code>(x, y) -&gt; x - y</code> looks fine until x = −2,000,000,000 and y = 2,000,000,000: the subtraction overflows to a positive number and the sort order flips. Always use <code>Integer.compare(x, y)</code>.</p>`, code: `Integer[] v = {2_000_000_000, -2_000_000_000, 0};
Arrays.sort(v, (x, y) -> Integer.compare(x, y));   // safe
System.out.println(Arrays.toString(v));             // [-2000000000, 0, 2000000000]` },
      { title: 'Aliasing in backtracking results', html: `<p>In subsets/permutations, <code>result.add(path)</code> stores a <b>reference</b> to the list you keep mutating — at the end every stored "answer" is the same, usually empty, list. Fix: <code>result.add(new ArrayList&lt;&gt;(path))</code>. Quick test: print the result for input [1,2]; if you see [[], [], [], []] it is aliasing.</p>` },
      { title: 'BFS marks visited on dequeue', html: `<p>On a 3×3 open grid, marking a cell visited only when it is <i>dequeued</i> lets neighbours enqueue it several times. It still gives correct distances but can blow up to O(4<sup>depth</sup>) queue size and TLE on 1000×1000 grids. Mark when you <b>enqueue</b>. Spotting it: count total pushes — more than R·C means a bug.</p>` }
    ],
    deepDive: `<p><b>Why tracing beats staring.</b> Reading code, your brain sees what you <i>meant</i> to write. Writing the state table forces you to compute what the code <i>does</i>. The first row where "does" ≠ "meant" is the bug. This is the same principle as a debugger's single-step, available on a whiteboard.</p>
      <p><b>Invariants as debugging tools.</b> For each loop, state one sentence that must be true at the top of every iteration: "everything left of <code>lo</code> is &lt; t; everything from <code>hi</code> on is ≥ t". Then check it on each row of your trace. Invariants also tell you the right update: if a[mid] &lt; t, the invariant says mid belongs to the left side, so <code>lo = mid + 1</code>, not <code>mid</code>.</p>
      <p><b>Stress testing (competitive programmers' secret).</b> Write a brute force you trust, a random generator of <b>tiny</b> inputs, and compare thousands of runs. Tiny inputs matter: when a mismatch appears it is small enough to trace by hand. In real interviews you cannot run code, but you can mentally "stress test" by trying size 0, 1, 2 and all-equal inputs.</p>
      <p><b>Binary search on the bug.</b> For longer code, check the state halfway through (print or trace). If it is already wrong, the bug is in the first half; otherwise the second. Debugging is search too.</p>
      <p><b>Production reality.</b> The same classes of bugs cause real outages: integer overflow (the Ariane 5 rocket, many YouTube-view-counter style counters), off-by-one in pagination, aliasing in caches returning mutable objects, and missing resets in pooled objects. Interview debugging habits are production habits.</p>`,
    aiEra: `<p><b>What AI changes:</b> Paste a failing snippet into an assistant and it will often spot an off-by-one instantly. That is great for practice — and dangerous as a habit, because AI also "fixes" bugs by changing several lines at once, sometimes masking the real issue or breaking another case.</p>
      <p><b>Good use:</b> <code>Here is my function and a failing input. Do not fix it. Ask me questions that lead me to the bug.</code> Or: <code>Write a stress-test harness comparing my solution to a brute force on random inputs of size ≤ 6.</code> Let the tool generate tests; you find the cause.</p>
      <p><b>In AI-allowed interviews:</b> generated code will contain subtle bugs — wrong boundary, visited marked late, int overflow. Saying "I'll trace this on [1, 2] before trusting it" and finding the bug yourself is a top-tier signal.</p>
      <p><b>What you must own:</b> the calm, systematic routine. Under pressure, the person who traces wins over the person who guesses — with or without AI.</p>`,
    problems: [{
      title: 'Debug It: Search Insert Position', level: 'Easy', tags: ['binary search', 'debugging', 'off-by-one'], companies: ['Amazon', 'Apple', 'Adobe'],
      statement: `<p>A teammate wrote this to return the index where <code>target</code> is found in a sorted array of distinct integers, or where it would be inserted:</p><pre>int lo = 0, hi = nums.length - 1;
while (lo &lt; hi) {
    int mid = (lo + hi) / 2;
    if (nums[mid] &lt; target) lo = mid;
    else hi = mid;
}
return lo;</pre><p>It hangs on some inputs and returns wrong answers on others. Find every bug, explain each with a failing input, and write a correct O(log N) version.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>4</sup>, −10<sup>4</sup> ≤ nums[i], target ≤ 10<sup>4</sup>, nums sorted ascending, distinct`,
      example: `<p>nums = [1,3,5,6]: target 5 → <b>2</b>; target 2 → <b>1</b>; target 7 → <b>${H.c('g', '4')}</b> (insert at the end — the buggy code can never return 4 because hi starts at 3).</p>`,
      brute: { why: `<p>Linear scan for the first element ≥ target: O(N). Correct and a perfect oracle for testing, but it ignores the sorted order the problem gave us.</p>`, code: `int searchInsertBrute(int[] nums, int target) {
    for (int i = 0; i < nums.length; i++)
        if (nums[i] >= target) return i;   // first position that is not smaller
    return nums.length;                     // larger than everything: insert at the end
}` },
      mcq: { q: 'With nums = [1, 3] and target 2, what happens in the buggy code?', options: ['lo=0, hi=1, mid=0, nums[0] &lt; 2 so lo = 0 again — infinite loop', 'It returns 1 correctly', 'It returns 0', 'It throws ArrayIndexOutOfBounds'], answer: 0, explain: 'lo = mid does not move when mid == lo, which happens whenever only two elements remain.' },
      hints: [`<p>Hint 1: Trace [1,3] with target 2. Does the range [lo, hi] get smaller on every iteration?</p>`, `<p>Hint 2: If nums[mid] &lt; target, mid can never be the answer, so the next range should exclude it: lo = mid + 1.</p>`, `<p>Hint 3: The answer can be N (insert after everything), so the search range must be [0, N]: start hi = nums.length. Recipe: lo=0, hi=N; while lo&lt;hi: mid; if nums[mid] &lt; target: lo=mid+1 else hi=mid; return lo.</p>`],
      solution: {
        approach: `<p>Bug 1 (hang): <code>lo = mid</code> does not shrink the range when mid == lo. Bug 2 (wrong answer): <code>hi = n − 1</code> excludes the valid answer n. Minor: <code>(lo + hi) / 2</code> is fine here but <code>lo + (hi − lo) / 2</code> is the overflow-safe habit. Fixed version is the lower-bound template with invariant: everything before lo is &lt; target, everything from hi on is ≥ target.</p>`,
        code: `class Solution {
    public int searchInsert(int[] nums, int target) {
        int lo = 0, hi = nums.length;           // answer lies in [0, n]
        while (lo < hi) {                       // invariant: nums[..lo-1] < target <= nums[hi..]
            int mid = lo + (hi - lo) / 2;       // overflow-safe
            if (nums[mid] < target) lo = mid + 1; // mid is too small: exclude it
            else hi = mid;                      // mid might be the answer: keep it
        }
        return lo;
    }
}`,
        alt: [{ lang: 'python', code: `def search_insert(nums, target):
    lo, hi = 0, len(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo

print(search_insert([1, 3, 5, 6], 5), search_insert([1, 3, 5, 6], 2), search_insert([1, 3, 5, 6], 7))  # 2 1 4`, run: true }],
        dry: { head: ['lo', 'hi', 'mid', 'nums[mid] vs 7', 'action'], rows: [['0', '4', '2', '5 &lt; 7', 'lo = 3'], ['3', '4', '3', '6 &lt; 7', 'lo = 4'], ['4', '4', '—', 'loop ends', H.c('g', 'return 4')]] },
        complexity: `<p>Time O(log N), space O(1).</p>`,
        followUps: ['Return the last index with nums[i] ≤ target (upper bound − 1).', 'Duplicates allowed: return the first occurrence of target or −1.', 'Write the invariant as a comment and prove termination.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 7 — Communicating trade-offs
  // =====================================================================
  topics.push({
    title: 'Communicating Trade-offs Like a Senior Engineer',
    analogy: `<p>Buying a phone: one has the best camera, another the longest battery, a third is the cheapest. A good salesperson does not say "this one is best". She asks how you use it, then says: "You travel a lot, so the battery matters more than the camera — take this one, and here is what you give up."</p>
      <p>Interviewers want the same answer about algorithms: <b>options, costs, a choice tied to the constraints, and what you give up</b>. "It depends" alone is not an answer; "it depends on X, and since X is true here, I choose Y" is.</p>`,
    explain: `<p>Almost every problem has more than one reasonable solution. Explaining the trade-off between them is often the difference between a "hire" and a "strong hire", especially at mid and senior levels.</p>
      <h4>The trade-off axes you should know by name</h4>
      ${H.table(['axis', 'option A', 'option B', 'example'], [
        ['Time vs space', 'faster, more memory', 'slower, less memory', 'HashSet duplicate check O(N)/O(N) vs sort + scan O(N log N)/O(1)'],
        ['Preprocess vs per-query', 'build once, answer fast', 'no build, slow answers', 'prefix sums vs re-summing each query'],
        ['Read-heavy vs write-heavy', 'cheap reads, costly updates', 'cheap updates, costly reads', 'prefix sums (O(N) update) vs Fenwick (O(log N) both)'],
        ['Average vs worst case', 'great on average', 'guaranteed bound', 'HashMap / quickselect vs TreeMap / heap'],
        ['Simplicity vs optimality', 'short, obviously correct', 'faster, trickier', 'O(N<sup>2</sup>) DP at N = 2000 vs an O(N log N) trick'],
        ['In-place vs copy', 'O(1) extra space', 'input left untouched', 'sorting the caller’s array vs sorting a copy'],
        ['Recursion vs iteration', 'clear code', 'no stack overflow', 'DFS on a 10<sup>5</sup>-deep chain'],
        ['Exact vs approximate', 'exact answer', 'tiny memory, small error', 'HashSet distinct count vs HyperLogLog'],
        ['Online vs offline', 'answer as data arrives', 'see all data first', 'two-heap running median vs sort at the end']
      ])}
      <h4>A 4-sentence template</h4>
      <ol>
        <li><b>Options:</b> "I see two approaches: A, which is O(…) time / O(…) space, and B, which is O(…) / O(…)."</li>
        <li><b>Deciding factor:</b> "The difference matters because N is up to 10<sup>5</sup> and there are 10<sup>5</sup> queries."</li>
        <li><b>Choice:</b> "So I will go with B."</li>
        <li><b>Cost acknowledged:</b> "The price is O(N) extra memory and a slightly longer build, which is fine here."</li>
      </ol>
      <h4>Same problem, three answers — Kth largest element</h4>
      ${H.table(['approach', 'time', 'space', 'when to pick it'], [
        ['Sort, take index n−k', 'O(N log N)', 'O(1)–O(N)', 'one-off, simplest code, N small'],
        ['Min-heap of size k', 'O(N log k)', 'O(k)', 'k ≪ N, or data is a <b>stream</b>'],
        ['Quickselect', 'O(N) average, O(N<sup>2</sup>) worst', 'O(1)', 'one-off, large N, can shuffle / pick random pivot'],
        ['Counting (values in small range)', 'O(N + range)', 'O(range)', 'values bounded, e.g. 0..10<sup>4</sup>']
      ])}
      <p>A strong candidate names at least two rows, picks one using the constraints, and mentions the worst case of quickselect without being asked.</p>`,
    clues: [
      'Interviewer asks "<b>what if memory is limited?</b>" → switch to the space-lean option and state the time cost.',
      '"<b>Many queries</b>" or "called millions of times" → move work to preprocessing.',
      '"<b>Data arrives as a stream</b>" → online structures (heaps, windows, sketches); no sorting the whole input.',
      '"<b>Updates</b> mixed with queries" → balanced structure (Fenwick, segment tree, TreeMap) over static prefix arrays.',
      '"<b>Is there a simpler way?</b>" → they may prefer readable O(N log N) over a fragile O(N).',
      'You hear "<b>worst case</b>" → hash maps and quickselect lose their guarantees; mention adversarial inputs.'
    ],
    code: { lang: 'python', run: true, title: 'Same answer, different costs: Kth largest three ways (runnable)', code: `import heapq, random

def by_sort(a, k):            # O(N log N) time, simplest
    return sorted(a)[-k]

def by_heap(a, k):            # O(N log k) time, O(k) space, works on streams
    h = []
    for x in a:
        heapq.heappush(h, x)
        if len(h) > k:
            heapq.heappop(h)   # drop the smallest; h keeps the k largest
    return h[0]

def by_quickselect(a, k):     # O(N) average, O(N^2) worst; random pivot avoids bad cases
    a = a[:]                  # trade-off: copy to keep the caller's list untouched
    target = len(a) - k
    lo, hi = 0, len(a) - 1
    rnd = random.Random(0)
    while True:
        p = rnd.randint(lo, hi)
        a[p], a[hi] = a[hi], a[p]
        store = lo
        for i in range(lo, hi):            # Lomuto partition around a[hi]
            if a[i] < a[hi]:
                a[i], a[store] = a[store], a[i]
                store += 1
        a[store], a[hi] = a[hi], a[store]
        if store == target:
            return a[store]
        if store < target:
            lo = store + 1
        else:
            hi = store - 1

data = [3, 2, 1, 5, 6, 4, 9, 7, 8]
for k in (1, 2, 4):
    print(k, by_sort(data, k), by_heap(data, k), by_quickselect(data, k))
` },
    viz: {
      title: 'Range queries: the same problem, five designs, one decision',
      input: 'N=100000 Q=100000 U=0',
      inputLabel: 'N (array size), Q (sum queries), U (point updates)',
      gen: function (input) {
        var s = String(input === undefined ? '' : input);
        function grab(k) { var m = s.match(new RegExp(k + '\\s*=\\s*(\\d+)', 'i')); return m ? Number(m[1]) : NaN; }
        var N = grab('N'), Q = grab('Q'), U = grab('U');
        if ([N, Q, U].some(function (x) { return !isFinite(x); })) throw new Error('Format: N=100000 Q=100000 U=0');
        if (N < 1 || N > 1e7 || Q > 1e7 || U > 1e7) throw new Error('Keep N, Q, U at most 10000000');
        var lg = Math.max(1, Math.ceil(Math.log2(N))), sq = Math.ceil(Math.sqrt(N));
        var D = [
          { name: 'Naive loop', build: 0, q: N / 2, u: 1, mem: N, note: 'no build; each query sums up to N values' },
          { name: 'Prefix sums', build: N, q: 1, u: N, mem: 2 * N, note: 'O(1) query, but one update rewrites O(N) prefixes' },
          { name: 'Sqrt blocks', build: N, q: 2 * sq, u: 1, mem: N + sq, note: 'O(√N) query, O(1) update, simple' },
          { name: 'Fenwick tree', build: N, q: 2 * lg, u: lg, mem: 2 * N, note: 'O(log N) both, tiny code' },
          { name: 'Segment tree', build: 2 * N, q: 4 * lg, u: 2 * lg, mem: 5 * N, note: 'O(log N) both; also min/max, lazy range updates' }
        ];
        var frames = [], tot = [], names = [], memv = [];
        frames.push({ narr: 'Workload: array of <b>' + N.toLocaleString('en-US') + '</b>, <b>' + Q.toLocaleString('en-US') + '</b> range-sum queries and <b>' + U.toLocaleString('en-US') + '</b> point updates. We price each design as <i>build + Q·query + U·update</i>. Budget ≈ 10<sup>8</sup>.', parts: [
          { type: 'vars', label: 'workload', vals: { N: N, Q: Q, U: U } },
          txt('Why this matters', 'There is no single "best" structure. The <b>mix of reads and writes</b> decides.')
        ] });
        D.forEach(function (d, i) {
          var total = d.build + Q * d.q + U * d.u;
          var lgT = Math.round(Math.log10(Math.max(1, total)) * 10) / 10;
          tot.push(lgT); names.push(d.name); memv.push(Math.round(d.mem / N * 10) / 10);
          var hl = {}; tot.forEach(function (v, j) { hl[j] = v <= 8 ? 'ok' : 'bad'; }); hl[i] = 'cur';
          frames.push({ narr: '<b>' + d.name + '</b>: ' + d.note + '. Total ≈ 10<sup>' + lgT + '</sup> steps → ' + (lgT <= 8 ? '<span class="c-g">within budget</span>' : '<span class="c-r">too slow</span>') + '. Memory ≈ ' + (d.mem / N).toFixed(1) + '×N.', parts: [
            { type: 'bars', label: 'log10(total steps) — lower is better, 8 = budget', values: tot.slice(), idxLabels: names.slice(), hl: hl },
            { type: 'bars', label: 'memory in multiples of N', values: memv.slice(), idxLabels: names.slice(), hl: one(i, 'cur') },
            { type: 'vars', vals: { build: Math.round(d.build), 'per query': Math.round(d.q), 'per update': Math.round(d.u) } }
          ] });
        });
        var fits = D.map(function (d, i) { return { d: d, t: tot[i], i: i }; }).filter(function (x) { return x.t <= 8; });
        var pick = function (nm) { return fits.filter(function (x) { return x.d.name === nm; })[0]; };
        var simplest = (U === 0 && pick('Prefix sums')) || pick('Fenwick tree') || fits[0] || null;
        var finHl = {}; tot.forEach(function (v, j) { finHl[j] = v <= 8 ? 'ok' : 'done'; }); if (simplest) finHl[simplest.i] = 'sel';
        frames.push({ narr: simplest ? 'Decision: <b>' + simplest.d.name + '</b>. Say it: "Several designs fit; I pick ' + simplest.d.name + ' because ' + (simplest.d.name === 'Prefix sums' ? 'there are no updates, so O(1) queries with the simplest code win' : simplest.d.name === 'Fenwick tree' ? 'updates are mixed with queries, and a Fenwick tree gives O(log N) for both with very little code' : 'it is the cheapest design that fits this workload') + '. The cost is ' + (simplest.d.mem / N).toFixed(0) + '×N memory."' : 'Nothing fits the budget — ask whether queries can be answered offline (sort them, Mo’s algorithm) or whether the limits are really that large.', parts: [
          { type: 'bars', label: 'final comparison', values: tot.slice(), idxLabels: names.slice(), hl: finHl },
          { type: 'table', label: 'trade-off summary', columns: ['design', 'query', 'update', 'fits?'], rows: D.map(function (d, j) { return [d.name, Math.round(d.q), Math.round(d.u), tot[j] <= 8 ? 'yes' : 'no']; }), hl: simplest ? one(simplest.i, 'sel') : {} }
        ] });
        frames.push({ narr: 'Try <code>U=100000</code> to watch prefix sums collapse, or <code>N=1000 Q=10 U=0</code> to see the naive loop become perfectly fine. The <b>workload</b>, not the fanciest structure, decides.', parts: [
          txt('Takeaway', 'Name options → price them against the constraints → choose → state what you give up.')
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Top K frequent: heap vs bucket sort', html: `<p><b>Heap:</b> count with a HashMap (O(N)), keep a min-heap of size k (O(U log k) for U unique values). <b>Bucket sort:</b> frequencies are between 1 and N, so put values into N+1 buckets by frequency and read from the top: O(N) total. Say: "Bucket sort is linear and I'd use it for a one-off batch. If the data were a stream or k were tiny, the heap uses only O(k) extra beyond the counts and supports updates."</p>` },
      { title: 'Recursion vs iteration on a degenerate tree', html: `<p>A "tree" of 10<sup>5</sup> nodes that is really a linked list (every node has only a right child) makes recursive DFS 10<sup>5</sup> frames deep. Java's default thread stack often overflows around 10<sup>4</sup>–10<sup>5</sup> frames. Trade-off: recursion is clearer; an explicit stack is safe. In an interview: write recursion, then say "for very deep inputs I'd convert to an explicit stack" — and show you can.</p>`, code: `int maxDepthIterative(TreeNode root) {
    if (root == null) return 0;
    Deque<Object[]> st = new ArrayDeque<>();
    st.push(new Object[]{root, 1});
    int best = 0;
    while (!st.isEmpty()) {
        Object[] top = st.pop();
        TreeNode node = (TreeNode) top[0];
        int d = (Integer) top[1];
        best = Math.max(best, d);
        if (node.left != null) st.push(new Object[]{node.left, d + 1});
        if (node.right != null) st.push(new Object[]{node.right, d + 1});
    }
    return best;
}` },
      { title: 'HashMap vs TreeMap', html: `${H.table(['need', 'HashMap', 'TreeMap'], [
        ['get / put', 'O(1) average', 'O(log N) guaranteed'],
        ['iterate in key order', H.c('r', 'no'), H.c('g', 'yes')],
        ['"smallest key ≥ x" (ceiling), ranges', H.c('r', 'no'), H.c('g', 'yes: ceilingKey, subMap')],
        ['adversarial keys', 'may degrade (Java treeifies buckets → O(log N))', 'unaffected']
      ])}<p>Clue: the moment a question says "the next booking after time t" or "all keys in a range", switch to TreeMap (e.g. My Calendar, time-based key-value store).</p>` },
      { title: 'In-place vs copy: "Remove duplicates from sorted array"', html: `<p>The in-place two-pointer version uses O(1) space but <b>destroys the caller's data</b>. In an interview, ask: "Am I allowed to modify the input?" If yes, in-place; if it's shared (e.g., used by another thread), copy first. Asking this question is itself a trade-off signal interviewers note.</p>` }
    ],
    deepDive: `<p><b>Big-O hides constants — say so when it matters.</b> A Fenwick tree and a segment tree are both O(log N), but Fenwick is ~3× faster and uses half the memory; a segment tree supports more operations (min, max, lazy range updates). Sorting an array of primitives (dual-pivot quicksort) beats a HashMap for dedup at moderate N because of cache locality, despite the extra log factor.</p>
      <p><b>Amortised vs worst-case latency.</b> ArrayList append is O(1) amortised, but an individual append can cost O(N) when it resizes. For a latency-sensitive service that occasional spike matters; pre-size the list. Same for HashMap rehashing. Mentioning this distinction signals production experience.</p>
      <p><b>Hash flooding.</b> Hash maps are O(1) only on average. An attacker who knows your hash function can force collisions. Java mitigates this by turning long bucket chains into red-black trees (O(log N)); Python randomises string hashes per process. In competitive programming, anti-hash tests target unordered_map in C++.</p>
      <p><b>Space is also time.</b> Using 5×N memory can push data out of CPU caches and slow everything down. A smaller structure (bitset instead of boolean[], int[26] instead of HashMap) can be faster despite identical big-O.</p>
      <p><b>Engineering trade-offs beyond Big-O:</b> readability and maintainability, testability, library availability (use <code>PriorityQueue</code>, do not hand-roll a heap in production), and failure modes (recursion depth, overflow). Senior answers mention at least one non-asymptotic factor.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI lists trade-offs fluently — sometimes too fluently, producing generic tables that do not reference <i>your</i> constraints. Interviewers can smell a memorised list. The value you add is <b>tying each trade-off to the numbers in this problem</b>.</p>
      <p><b>Practise with:</b> <code>Give me two solutions to this problem with different trade-offs. Then argue for each one as if you were a different engineer. Then ask me which I would ship given N = 10^6 and 10^5 updates per second.</code></p>
      <p><b>Where AI goes wrong:</b> claims like "quickselect is O(N)" without the average-case caveat, or "HashMap is always faster than TreeMap". Correcting those nuances is exactly the depth interviewers probe.</p>
      <p><b>What you must own:</b> the decision. AI can enumerate options; the engineer chooses one, defends it with the constraints, and owns the downside. In system-level follow-ups ("what if this runs on 100 machines?") that judgement is the whole interview.</p>`,
    problems: [{
      title: 'Trade-off Design: Two Sum Data Structure', level: 'Easy', tags: ['design', 'hashing', 'trade-offs'], companies: ['LinkedIn', 'Meta'],
      statement: `<p>Design a class with two operations: <code>add(number)</code> stores a number, and <code>find(value)</code> returns true if any <b>two stored numbers</b> (different entries, possibly equal values) sum to <code>value</code>.</p><p>There are two natural designs with opposite costs. Implement one and explain when you would pick the other.</p>`,
      constraints: `−10<sup>5</sup> ≤ number ≤ 10<sup>5</sup>, −2<sup>31</sup> ≤ value ≤ 2<sup>31</sup> − 1, up to 10<sup>4</sup> calls total`,
      example: `<p>add(1), add(3), add(5); find(4) → <b>${H.c('g', 'true')}</b> (1 + 3); find(7) → <b>${H.c('r', 'false')}</b>; add(3) then find(6) → <b>${H.c('g', 'true')}</b> (3 + 3 uses two different entries).</p>`,
      brute: { why: `<p>Store numbers in a list; find checks every pair: O(1) add, O(N<sup>2</sup>) find. The waste: for each number we search linearly for its complement instead of looking it up.</p>`, code: `class TwoSumBrute {
    private final List<Integer> nums = new ArrayList<>();
    public void add(int number) { nums.add(number); }
    public boolean find(int value) {
        for (int i = 0; i < nums.size(); i++)
            for (int j = i + 1; j < nums.size(); j++)
                if ((long) nums.get(i) + nums.get(j) == value) return true;
        return false;
    }
}` },
      mcq: { q: 'The workload is 1 million find calls and only 100 add calls. Which design fits best?', options: ['Precompute all pair sums into a HashSet on add: add O(N), find O(1)', 'Count map: add O(1), find O(N)', 'Keep a sorted list and two-pointer on every find', 'Brute force pairs'], answer: 0, explain: 'Read-heavy workload → pay at write time. With only 100 adds, the set holds at most ~5000 sums and every find is O(1).' },
      hints: [`<p>Hint 1: For find, you need "is value − x present?" for some stored x — a HashMap lookup.</p>`, `<p>Hint 2: Store counts, not just presence: value 6 with a single 3 stored must return false; with two 3s, true.</p>`, `<p>Hint 3: Opposite design: on add, insert number + every existing number into a "sums" set → O(N) add, O(1) find. Pick by read/write ratio.</p>`],
      solution: {
        approach: `<p><b>Write-cheap design (implemented):</b> HashMap value → count. add O(1); find iterates distinct keys, O(U). <b>Read-cheap design:</b> maintain a HashSet of all pairwise sums; add costs O(N) and memory O(N<sup>2</sup>), find is O(1). Choose by the ratio of adds to finds — and by memory: N<sup>2</sup> sums is 10<sup>8</sup> for N = 10<sup>4</sup>, which is too much.</p>`,
        code: `class TwoSum {
    private final Map<Integer, Integer> count = new HashMap<>();

    public void add(int number) {
        count.merge(number, 1, Integer::sum);         // O(1): write-cheap
    }

    public boolean find(int value) {
        for (Map.Entry<Integer, Integer> e : count.entrySet()) {
            long need = (long) value - e.getKey();    // long: value - key can overflow int
            if (need < Integer.MIN_VALUE || need > Integer.MAX_VALUE) continue;
            int other = (int) need;
            if (other == e.getKey()) {
                if (e.getValue() >= 2) return true;   // same value needs two entries
            } else if (count.containsKey(other)) {
                return true;
            }
        }
        return false;
    }
}`,
        dry: { head: ['call', 'count map', 'check', 'result'], rows: [['add 1, 3, 5', '{1:1, 3:1, 5:1}', '—', '—'], ['find(4)', 'same', 'key 1 → need 3, present', H.c('g', 'true')], ['find(7)', 'same', '1→6 no, 3→4 no, 5→2 no', H.c('r', 'false')], ['add 3; find(6)', '{1:1, 3:2, 5:1}', 'key 1 → need 5, present', H.c('g', 'true')]] },
        complexity: `<p>add O(1), find O(U) with U distinct values, space O(U). Alternative: add O(N), find O(1), space O(N<sup>2</sup>).</p>`,
        followUps: ['Support remove(number).', 'Thread-safe version: which operations need locking?', 'Values arrive as a stream and finds must be O(1) but memory is limited — what do you give up?']
      }
    }]
  });

  // =====================================================================
  // TOPIC 8 — Common mistakes
  // =====================================================================
  function to32(x) { return x | 0; }

  topics.push({
    title: 'Common Mistakes (and the Habit That Prevents Each)',
    analogy: `<p>Pilots do not crash because they forget how to fly. They crash from a short, well-known list of slips — wrong fuel setting, a skipped checklist item, a misread altimeter. Aviation got safe by <b>naming those slips and building a habit against each one</b>.</p>
      <p>Interviews are the same. Strong candidates rarely fail because they do not know DSA. They fail from a handful of repeatable slips. Learn the list once, attach a habit to each, and most of your "bad luck" disappears.</p>`,
    explain: `<p>Mistakes fall into four families. Each comes with a <b>preventive habit</b> — a tiny action you do every time.</p>
      <h4>1. Process mistakes</h4>
      ${H.table(['mistake', 'habit that prevents it'], [
        ['Coding before agreeing on the approach', 'Say "Shall I code this?" and wait for a yes'],
        ['Never stating complexity', 'End every approach with "That is O(…) time, O(…) space"'],
        ['Going silent when stuck', 'Narrate what you are considering, even half-ideas'],
        ['Over-engineering (segment tree for a prefix-sum problem)', 'Pick the simplest structure that meets the budget'],
        ['Ignoring the interviewer’s hint', 'Repeat the hint back and act on it right away'],
        ['Declaring "done" without testing', 'Always trace one normal + one edge case before saying done']
      ])}
      <h4>2. Pattern mistakes (right tool, wrong job)</h4>
      ${H.table(['mistake', 'why it fails', 'counter-check'], [
        ['Sliding window with negative numbers', 'shrinking may increase the sum', 'any negatives? → prefix sum + hash'],
        ['Greedy without proof', 'local best ≠ global best (coins {1,3,4}, amount 6)', 'try to break it with a 3-element example'],
        ['BFS on a weighted graph', 'fewest edges ≠ cheapest path', 'weights all equal? else Dijkstra / 0-1 BFS'],
        ['Dijkstra with negative edges', 'a settled node can later get cheaper', 'negatives → Bellman-Ford'],
        ['Binary search on a non-monotone check', 'the yes/no answer flips more than once', 'prove "if x works, x+1 works"'],
        ['DP state missing a dimension', 'two different situations share one cell', 'does the future depend on anything not in the state?'],
        ['Topological sort without cycle check', 'returns a partial order silently', 'output size &lt; V → cycle']
      ])}
      <h4>3. Code mistakes</h4>
      ${H.table(['mistake', 'example', 'fix'], [
        ['int overflow', '<code>int sum</code>, <code>a * b</code> with values to 10<sup>9</sup>', '<code>long</code>, cast before multiplying'],
        ['Negative modulo in Java', '<code>-7 % 3 == -1</code>', '<code>((x % m) + m) % m</code>'],
        ['Off-by-one', '<code>i &lt;= n</code>, missing last window', 'test sizes 0, 1, 2'],
        ['Wrong initial value', '<code>max = 0</code> with all-negative input', 'start from the first element or MIN_VALUE'],
        ['Modifying a collection while iterating', '<code>ConcurrentModificationException</code>', 'iterator.remove() or collect then remove'],
        ['String concatenation in a loop', 'O(N<sup>2</sup>) copying', '<code>StringBuilder</code>'],
        ['Shared mutable result', '<code>res.add(path)</code> in backtracking', '<code>res.add(new ArrayList&lt;&gt;(path))</code>'],
        ['Deep recursion', 'StackOverflowError at depth ~10<sup>4</sup>–10<sup>5</sup>', 'iterative version / explicit stack']
      ])}
      <h4>4. Communication mistakes</h4>
      <p>Arguing with a correct hint, bluffing about something you do not know ("I'm not sure, but my reasoning is…" is always better), and not asking any questions at the end. Interviewers forgive bugs much faster than they forgive defensiveness.</p>`,
    clues: [
      'You wrote a <b>greedy</b> → before coding, spend 60 seconds trying to break it with a tiny counterexample.',
      'Values up to <b>10<sup>9</sup></b> being added or multiplied → overflow alarm; use <code>long</code>.',
      'Statement mentions <b>negative numbers</b> → re-check every "max starts at 0", window and modulo assumption.',
      'Your solution uses <b>recursion over N up to 10<sup>5</sup></b> → stack depth alarm.',
      'You are about to say "<b>done</b>" → you have not traced an edge case yet.'
    ],
    code: [`
// A gallery of classic slips and their fixes — each line compiles and shows the difference.
class MistakeGallery {
    public static void main(String[] args) {
        // 1) Overflow in the midpoint
        int lo = 2_000_000_000, hi = 2_100_000_000;
        int badMid = (lo + hi) / 2;               // lo + hi overflows -> negative
        int goodMid = lo + (hi - lo) / 2;         // never exceeds hi
        System.out.println("bad mid = " + badMid + ", good mid = " + goodMid);

        // 2) Negative modulo
        int x = -7, m = 3;
        System.out.println("-7 % 3 = " + (x % m) + ", fixed = " + (((x % m) + m) % m));

        // 3) Product overflow: cast BEFORE multiplying
        int a = 100_000, b = 100_000;
        long wrong = a * b;                       // multiplied as int, then widened (already wrapped)
        long right = (long) a * b;
        System.out.println("wrong = " + wrong + ", right = " + right);

        // 4) Greedy coin change fails for coins {1, 3, 4}, amount 6
        int[] coins = {4, 3, 1};
        int amount = 6, greedyCount = 0;
        for (int c : coins) while (amount >= c) { amount -= c; greedyCount++; }
        System.out.println("greedy uses " + greedyCount + " coins, but 3 + 3 uses 2");
    }
}`],
    codeTitle: ['Mistake gallery (Java)'],
    viz: {
      title: 'Mistake replay: overflow, negative mod and a greedy that lies',
      input: '2000000000 2100000000',
      inputLabel: 'lo hi (two whole numbers up to 2147483647)',
      gen: function (input) {
        var v = parseNums(input, 2, 2, 0, 2147483647, 'lo and hi');
        var lo = v[0], hi = v[1];
        if (lo > hi) throw new Error('lo must be ≤ hi');
        var frames = [];
        frames.push({ narr: 'Mistake #1 — <b>overflow</b>. lo = ' + lo + ', hi = ' + hi + '. A Java <code>int</code> has 32 bits; the largest value is 2,147,483,647 (bit 31 is the sign bit).', parts: [
          { type: 'bits', label: 'lo', value: lo, width: 32 }, { type: 'bits', label: 'hi', value: hi, width: 32 }
        ] });
        var sum = to32(lo + hi), over = lo + hi > 2147483647;
        frames.push({ narr: '<code>lo + hi</code> = ' + (lo + hi) + (over ? ' — too big! The carry lands in the <b>sign bit</b>, so Java sees <span class="c-r">' + sum + '</span>.' : ' — fits this time, but only by luck of the input.'), parts: [
          { type: 'bits', label: 'lo + hi as int', value: sum >>> 0, width: 32, hl: over ? { 31: 'bad' } : {} },
          { type: 'vars', vals: { 'true sum': lo + hi, 'int sum': sum }, hl: { 'int sum': over ? 'bad' : 'ok' } }
        ] });
        var badMid = to32(sum / 2), goodMid = lo + Math.floor((hi - lo) / 2);
        frames.push({ narr: '(lo + hi) / 2 = <b>' + badMid + '</b>' + (over ? ' → a negative index → ArrayIndexOutOfBounds, or a binary search that runs off into nonsense.' : '.') + ' The safe form <code>lo + (hi − lo) / 2</code> = <b>' + goodMid + '</b> never exceeds hi. Habit: always write it the safe way.', parts: [
          { type: 'vars', vals: { 'bad mid': badMid, 'good mid': goodMid }, hl: { 'bad mid': over ? 'bad' : '', 'good mid': 'ok' } },
          { type: 'code', lang: 'java', code: 'int mid = (lo + hi) / 2;        // can overflow\nint mid = lo + (hi - lo) / 2;  // safe', hl: { 1: over ? 'bad' : '', 2: 'ok' } }
        ] });
        frames.push({ narr: 'Mistake #2 — <b>negative modulo</b>. In Java (and C++), <code>-7 % 3</code> is <span class="c-r">−1</span>, not 2. If you use it as an array index or hash bucket, you crash. Fix: <code>((x % m) + m) % m</code> = 2.', parts: [
          { type: 'table', label: 'x % 3 in Java vs math', columns: ['x', 'Java x % 3', 'fixed ((x%3)+3)%3'], rows: [[-7, -1, 2], [-6, 0, 0], [-5, -2, 1], [5, 2, 2]], hl: { 0: 'bad', 2: 'bad' } }
        ] });
        frames.push({ narr: 'Mistake #3 — <b>trusting greedy</b>. Coins {1, 3, 4}, amount 6. Greedy grabs the biggest coin first: 4, then 1, then 1 = <span class="c-r">3 coins</span>.', parts: [
          { type: 'bars', label: 'greedy picks', values: [4, 1, 1], idxLabels: ['pick 1', 'pick 2', 'pick 3'], hl: { 0: 'cur', 1: 'bad', 2: 'bad' } }
        ] });
        frames.push({ narr: 'But 3 + 3 = 6 uses only <span class="c-g">2 coins</span>. Greedy is wrong here, so the problem needs <b>DP</b> (DSA 18). Habit: before coding a greedy, spend one minute hunting for a small counterexample like this.', parts: [
          { type: 'bars', label: 'optimal picks', values: [3, 3], idxLabels: ['pick 1', 'pick 2'], hl: { 0: 'ok', 1: 'ok' } },
          { type: 'array', label: 'dp[amount] = min coins (0..6)', values: [0, 1, 2, 1, 1, 2, 2], hl: { 6: 'sel' }, showIdx: true }
        ] });
        frames.push({ narr: 'Mistake #4 — <b>max starts at 0</b>. Maximum subarray of [−3, −1, −2] is −1, but <code>best = 0</code> returns 0 (an empty subarray nobody allowed). Habit: initialise from the first real element.', parts: [
          { type: 'array', label: 'all negative input', values: [-3, -1, -2], hl: { 1: 'sel' } },
          { type: 'vars', vals: { 'best = 0 gives': 0, 'best = a[0] gives': -1 }, hl: { 'best = 0 gives': 'bad', 'best = a[0] gives': 'ok' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Dijkstra with a negative edge', html: `<p>Edges: A→B 2, A→C 5, C→B −4. Dijkstra settles B at cost 2 first (cheapest in the heap), then finds A→C→B = 1 too late — B was already "final". Correct answer 1, textbook Dijkstra (with a settled set) says 2. Versions that allow re-insertion happen to fix this tiny case but can take exponential time on bigger ones. ${H.c('r', 'Either way, negative edges break the "settled = final" guarantee')}. Use Bellman-Ford (DSA 21), or Johnson’s reweighting for all-pairs.</p>` },
      { title: 'Sliding window with negatives', html: `<p>"Shortest subarray with sum ≥ K", array [1, −5, 4, 4], K = 8. The window grows: running sums 1, −4, 0, 4 — never reaching 8, so it never shrinks and answers "none". But [4, 4] = 8 exists! The −5 inside the window drags the sum down, and a plain window has no rule for "drop the left part because it hurts". The correct tool is prefix sums + a monotonic deque (LeetCode 862). Clue: <b>negatives + "shortest/longest with sum"</b>.</p>` },
      { title: 'String building in a loop', html: `<p><code>s = s + c</code> inside a loop copies the whole string each time: 1 + 2 + … + N = O(N<sup>2</sup>) characters copied. For N = 10<sup>5</sup> that is 5·10<sup>9</sup> — TLE disguised as an O(N) algorithm.</p>`, code: `StringBuilder sb = new StringBuilder();
for (int i = 0; i < 5; i++) sb.append(i).append(',');  // amortised O(1) per append
System.out.println(sb);  // 0,1,2,3,4,` },
      { title: 'DP state missing a dimension: stock with cooldown', html: `<p>Defining <code>dp[i]</code> = best profit up to day i is not enough: whether you may buy on day i depends on whether you <b>hold a stock</b> and whether you <b>sold yesterday</b>. Two different situations share one cell → wrong answers. Fix: states hold / sold / rest (DSA 19). The check: "Does the future depend on anything not stored in my state?" If yes, add it.</p>` }
    ],
    deepDive: `<p><b>Why the same slips repeat.</b> Under stress the brain falls back on the most practised pattern ("windows solve subarray problems") and skips verification. The fix is not more knowledge but <b>cheap checks inserted at fixed points</b>: after choosing a pattern (counter-check table), after writing a loop (sizes 0/1/2), before saying done (edge case trace).</p>
      <p><b>Proof sketches kill pattern mistakes.</b> Greedy needs an exchange argument ("any optimal solution can be changed to include my greedy choice without getting worse"). Binary search on the answer needs monotonicity. Dijkstra needs non-negative weights. DP needs a state that captures everything the future depends on (the Markov property). If you cannot sketch the proof in two sentences, test with a small counterexample.</p>
      <p><b>Overflow arithmetic in detail.</b> Java ints wrap modulo 2<sup>32</sup> silently (no exception, unlike Rust in debug mode or Python's big ints). <code>Math.addExact</code> / <code>Math.multiplyExact</code> throw on overflow — useful while testing. When computing modular products, cast to long before multiplying: (10<sup>9</sup>+6)<sup>2</sup> ≈ 10<sup>18</sup> fits in a long (max ≈ 9.2·10<sup>18</sup>), but the sum of two such products does not.</p>
      <p><b>Floating point.</b> Comparing doubles with == fails (0.1 + 0.2 ≠ 0.3). Use integer arithmetic where possible (compare a/b with c/d as a·d vs c·b in long), or an epsilon. Geometry problems (DSA 26) use integer cross products for exactly this reason.</p>
      <p><b>Track your personal list.</b> Everyone has 3–5 favourite slips. Your error log (Topic 4) will reveal them within two weeks. Put them on a sticky note next to your screen in practice — and recite them silently before a real round.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-generated code makes the <i>same</i> classic mistakes, just faster: <code>(lo + hi) / 2</code>, <code>best = 0</code>, greedy where DP is needed, BFS marking visited on dequeue. Reviewing AI output against this mistake list is one of the most practical skills of 2026.</p>
      <p><b>Use AI deliberately:</b> <code>Write a solution to 'maximum product subarray' that contains one realistic bug from this list: overflow, wrong initial value, missed zero handling. Don't tell me which. I'll find it.</code> Bug-hunting drills train the exact eye interviewers test.</p>
      <p><b>Where AI helps most:</b> generating adversarial tests ("all negatives", "max values", "single element", "cycle in the graph") for your code. Ask for edge cases, not solutions.</p>
      <p><b>What you must own:</b> the reflexes — the overflow alarm when you see 10<sup>9</sup>, the counterexample hunt before a greedy, the edge-case trace before "done". AI does not have stakes in your interview; you do.</p>`,
    problems: [{
      title: 'Mistake Minefield: Maximum Product Subarray', level: 'Medium', tags: ['dp', 'kadane variant', 'edge cases'], companies: ['Amazon', 'LinkedIn', 'Google'],
      statement: `<p>Given an integer array <code>nums</code>, return the largest product of a non-empty contiguous subarray. This problem is a minefield of the common mistakes: negatives flip signs, zeros reset everything, and "start at 0" is wrong.</p>`,
      constraints: `1 ≤ N ≤ 2·10<sup>4</sup>, −10 ≤ nums[i] ≤ 10, the answer fits in a 32-bit integer`,
      example: `${H.arr([2, 3, -2, 4], { hl: { 0: 'g', 1: 'g' } })}<p>Output <b>${H.c('g', '6')}</b> from [2, 3]. And [−2, 3, −4] → <b>24</b>: two negatives multiply to a positive, which a "max only" Kadane misses.</p>`,
      brute: { why: `<p>Every start, extend to every end, track the product: O(N<sup>2</sup>) = 4·10<sup>8</sup> at the max size. The waste: we never reuse the best/worst product ending at the previous index.</p>`, code: `int bruteMaxProduct(int[] nums) {
    int best = nums[0];                         // not 0: all-negative inputs exist
    for (int i = 0; i < nums.length; i++) {
        long prod = 1;
        for (int j = i; j < nums.length; j++) {
            prod *= nums[j];
            best = (int) Math.max(best, prod);
        }
    }
    return best;
}` },
      mcq: { q: 'Why do we track the MINIMUM product ending at each index too?', options: ['A very negative product times a negative number becomes the new maximum', 'To handle zeros only', 'To make the code shorter', 'Because the answer could be negative'], answer: 0, explain: 'min × (negative) can jump to the top. Tracking both lets a sign flip promote the old minimum to the new maximum.' },
      hints: [`<p>Hint 1: Kadane tracks the best sum ending here. For products, a negative number swaps the roles of the best and worst.</p>`, `<p>Hint 2: Keep curMax and curMin ending at i. New values come from {x, curMax·x, curMin·x}.</p>`, `<p>Hint 3: Compute both new values from the OLD pair (use temporaries). Initialise everything with nums[0], not 0 or 1. Zero naturally resets because x itself is a candidate.</p>`],
      solution: {
        approach: `<p>Kadane variant (DSA 5 + DSA 19 state-machine flavour): two states per index — the largest and smallest product of a subarray ending here. A negative x swaps their roles; a zero resets both to 0, and the next element restarts fresh via the "x alone" candidate.</p>`,
        code: `class Solution {
    public int maxProduct(int[] nums) {
        int curMax = nums[0], curMin = nums[0], best = nums[0]; // start from a real element
        for (int i = 1; i < nums.length; i++) {
            int x = nums[i];
            int a = curMax * x, b = curMin * x;          // both from the OLD values
            curMax = Math.max(x, Math.max(a, b));        // x alone = restart (handles zeros)
            curMin = Math.min(x, Math.min(a, b));
            best = Math.max(best, curMax);
        }
        return best;
    }
}`,
        dry: { head: ['i', 'x', 'curMax', 'curMin', 'best'], rows: [['0', '−2', '−2', '−2', '−2'], ['1', '3', '3', '−6', '3'], ['2', '−4', H.c('g', '24'), '−12', H.c('g', '24')]] },
        complexity: `<p>Time O(N), space O(1).</p>`,
        followUps: ['Return the subarray boundaries as well.', 'What if values can be up to 10<sup>9</sup>? (Products overflow quickly — use logs or BigInteger and discuss.)', 'Prefix/suffix product trick: explain why the answer is the max over all prefix and suffix products split at zeros.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 9 — Final revision checklists
  // =====================================================================
  topics.push({
    title: 'Final Revision Checklists & Your Last-Week Plan',
    analogy: `<p>Before a long road trip you do not re-learn how to drive. You run a short checklist: tyres, fuel, documents, route. Ten minutes of checking prevents the breakdown that a year of driving skill cannot.</p>
      <p>The last week before interviews is the same. You will not learn twenty new patterns. You will <b>refresh</b> the ones you have, plug the two or three weakest, and walk in with checklists so your preparation actually shows.</p>`,
    explain: `<h4>Checklist 1 — The pattern sheet (one line each, can you produce the template from memory?)</h4>
      ${H.table(['pattern', 'invariant to remember', 'signature problems'], [
        ['Two pointers (opposite)', 'answer never lies outside [L, R]; move the side that cannot help', '3Sum, Container With Most Water'],
        ['Sliding window', 'window always valid after the shrink loop', 'Longest Substring w/o Repeat, Min Window Substring'],
        ['Prefix sum + hash', 'sum(i..j) = pf[j] − pf[i−1]; seed {0:1}', 'Subarray Sum = K, Contiguous Array'],
        ['Binary search (index)', 'everything before lo fails, from hi on passes', 'Search Rotated Array, First/Last Position'],
        ['Binary search (answer)', 'feasible(x) is monotone', 'Koko, Split Array Largest Sum, Ship Within D Days'],
        ['Monotonic stack', 'stack stays sorted; pop = answer found for popped item', 'Daily Temperatures, Largest Rectangle'],
        ['Monotonic deque', 'front = best in window; drop out-of-window and dominated', 'Sliding Window Maximum'],
        ['Heap', 'size-k heap keeps the k best so far', 'Top K Frequent, Merge K Lists, Median Stream'],
        ['Fast &amp; slow pointers', 'fast moves 2, slow 1; they meet in a cycle', 'Linked List Cycle II, Middle of List'],
        ['Tree DFS', 'return info upward; combine children', 'Diameter, Max Path Sum, LCA'],
        ['BFS (grid/graph)', 'first visit = shortest (unweighted); mark on enqueue', 'Rotting Oranges, Word Ladder'],
        ['Topological sort', 'indegree 0 can go next; leftover = cycle', 'Course Schedule II, Alien Dictionary'],
        ['Union-Find', 'find with path compression, union by rank', 'Redundant Connection, Accounts Merge'],
        ['Dijkstra', 'pop smallest; skip stale entries', 'Network Delay, Path With Min Effort'],
        ['Backtracking', 'choose → explore → unchoose', 'Subsets, Permutations, N-Queens'],
        ['DP', 'state in one sentence; last-step transition', 'Coin Change, LIS, Edit Distance, Word Break'],
        ['Greedy', 'exchange argument or a counterexample check', 'Jump Game, Non-overlapping Intervals'],
        ['Trie', 'node per character; end-of-word flag', 'Implement Trie, Word Search II']
      ])}
      <h4>Checklist 2 — Before you say "done" (every problem)</h4>
      <ol>
        <li>Traced the sample through <b>the code</b> (not the idea).</li>
        <li>Edge cases: empty / size 1 / all equal / negatives / max values / duplicates / disconnected graph / cycle.</li>
        <li>Overflow: any sum or product that can exceed 2·10<sup>9</sup>? → <code>long</code>.</li>
        <li>Loop bounds and pointer moves: does every loop make progress?</li>
        <li>Stated time and space complexity, and why.</li>
      </ol>
      <h4>Checklist 3 — The timeline</h4>
      ${H.table(['when', 'do', 'do not'], [
        ['1 week before', '2 mixed timed sets per day; redo every error-log problem; 2 full mocks', 'start a brand-new advanced topic'],
        ['2 days before', 'skim the pattern sheet; type 5 skeletons from memory; review your stories (behavioural)', 'grind 10 new Hards'],
        ['Night before', 'light review only (30–45 min), prepare setup, sleep 7–8 hours', 'cram until 2 a.m.'],
        ['1 hour before', 'one easy warm-up problem; water; test camera/mic/editor', 'look at problems you cannot solve'],
        ['During', 'the 8-step loop; narrate; trace before "done"', 'go silent; argue with hints'],
        ['After each round', 'write down the problem and what went well/badly', 'replay it all evening — next round matters more']
      ])}`,
    clues: [
      'You can describe a pattern but <b>cannot type its skeleton in 2 minutes</b> → that pattern goes on today’s revision list.',
      'Your error log shows the <b>same pattern twice</b> → it is your top-priority weak spot.',
      'Interview in <b>≤ 7 days</b> → revision and mocks only, no new advanced topics.',
      'You feel the urge to <b>cram late</b> the night before → sleep improves recall more than one more problem.',
      'You solved a problem <b>only after reading the solution</b> → schedule a from-scratch redo in 2–3 days.'
    ],
    code: [`
// Java toolkit check: you should be able to write every line below without looking anything up.
class JavaToolkit {
    void toolkit() {
        Deque<Integer> stack = new ArrayDeque<>();            // stack AND queue (faster than Stack/LinkedList)
        stack.push(1); stack.peek(); stack.pop();
        Deque<Integer> queue = new ArrayDeque<>();
        queue.offer(1); queue.peek(); queue.poll();

        PriorityQueue<int[]> minByFirst = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());
        minByFirst.offer(new int[]{3, 7}); maxHeap.offer(5);

        Map<String, List<Integer>> groups = new HashMap<>();
        groups.computeIfAbsent("a", k -> new ArrayList<>()).add(1);  // grouping idiom
        Map<Integer, Integer> freq = new HashMap<>();
        freq.merge(42, 1, Integer::sum);                              // counting idiom

        TreeMap<Integer, String> tm = new TreeMap<>();
        tm.put(10, "x"); tm.put(20, "y");
        Integer ceil = tm.ceilingKey(15);                             // 20: smallest key >= 15
        Integer floor = tm.floorKey(15);                              // 10: largest key <= 15

        int[][] intervals = {{5, 6}, {1, 3}};
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0])); // never a[0] - b[0]

        int[][] grid = new int[3][4];
        for (int[] row : grid) Arrays.fill(row, -1);                  // fill each row separately

        StringBuilder sb = new StringBuilder("abc");
        sb.reverse(); sb.append('d'); sb.setCharAt(0, 'z');

        long big = (long) Integer.MAX_VALUE * 2;                      // cast before multiply
        int mod = 1_000_000_007;
        long m = ((-7 % 3) + 3) % 3;                                  // positive modulo
        System.out.println(ceil + " " + floor + " " + sb + " " + big + " " + m + " " + mod);
    }
}`],
    codeTitle: ['Java toolkit you must know cold'],
    viz: {
      title: 'Last-week revision planner: weakest patterns get the most (spaced) slots',
      input: 'TwoPointers:4 Window:3 BinarySearch:2 Graphs:3 DP:1 Heap:4 Backtracking:2',
      inputLabel: 'pattern:confidence pairs (confidence 1 = weak … 5 = strong)',
      gen: function (input) {
        var toks = String(input === undefined ? '' : input).trim().split(/\s+/).filter(function (x) { return x; });
        if (toks.length < 2 || toks.length > 9) throw new Error('Give 2 to 9 pairs like DP:1 Graphs:3');
        var P = toks.map(function (t) {
          var q = t.split(':');
          var c = Number(q[1]);
          if (q.length !== 2 || !q[0] || !Number.isInteger(c) || c < 1 || c > 5) throw new Error('Each pair looks like Name:3 with confidence 1..5');
          return { name: q[0].slice(0, 14), c: c };
        });
        var frames = [];
        frames.push({ narr: 'Your self-rated confidence per pattern (from the error log and from "can I type the skeleton in 2 minutes?"). Taller = stronger.', parts: [
          { type: 'bars', label: 'confidence (1–5)', values: P.map(function (p) { return p.c; }), idxLabels: P.map(function (p) { return p.name; }) }
        ] });
        var sorted = P.slice().sort(function (a, b) { return a.c - b.c; });
        frames.push({ narr: 'Sort weakest first. Rule: weak patterns (1–2) get <b>3 sessions</b> spaced over the week, medium (3) get <b>2</b>, strong (4–5) get <b>1</b> quick refresh. Spacing beats cramming one topic for a whole day.', parts: [
          { type: 'bars', label: 'sorted by confidence', values: sorted.map(function (p) { return p.c; }), idxLabels: sorted.map(function (p) { return p.name; }), hl: (function () { var h = {}; sorted.forEach(function (p, i) { h[i] = p.c <= 2 ? 'bad' : p.c === 3 ? 'cur' : 'ok'; }); return h; })() }
        ] });
        var days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        var plan = days.map(function () { return []; });
        var offsets = { 3: [0, 2, 5], 2: [1, 4], 1: [3] };
        function width() { return Math.max(3, Math.max.apply(null, plan.map(function (d) { return d.length; }))); }
        function planRows() { var W = width(); return plan.map(function (d, i) { var r = [days[i]]; for (var c = 0; c < W; c++) r.push(d[c] || ''); return r; }); }
        function slotHead() { var h = ['day']; for (var c = 1; c <= width(); c++) h.push('slot ' + c); return h; }
        sorted.forEach(function (p, idx) {
          var k = p.c <= 2 ? 3 : p.c === 3 ? 2 : 1;
          offsets[k].forEach(function (d) {
            var day = (d + idx) % 6;                       // Sunday kept for a full mock
            var guard = 0;
            while (plan[day].length >= 3 && guard++ < 6) day = (day + 1) % 6;
            plan[day].push(p.name);
          });
          var rows = planRows();
          var hl = {};
          rows.forEach(function (r, i) { for (var c = 1; c < r.length; c++) if (r[c] === p.name) hl[i + ',' + c] = 'cur'; });
          frames.push({ narr: 'Schedule <b>' + p.name + '</b> (confidence ' + p.c + ') for ' + k + ' session' + (k > 1 ? 's' : '') + (k > 1 ? ', spread out so each review happens just as you start to forget' : '') + '.', parts: [
            { type: 'grid', label: 'week plan (about 3 slots per day)', rows: rows, colHead: slotHead(), hl: hl }
          ] });
        });
        var finalRows = planRows();
        finalRows[6] = ['Sun', 'FULL MOCK', '45 min ×2', 'review log'];
        while (finalRows[6].length < finalRows[0].length) finalRows[6].push('');
        frames.push({ narr: 'Final plan. Each session = type the skeleton from memory + one <b>mixed</b> timed problem that uses it + one redo from the error log. Sunday is a full mock interview. Light review only on the last evening.', parts: [
          { type: 'grid', label: 'week plan', rows: finalRows, colHead: slotHead(), hl: { '6,1': 'sel', '6,2': 'sel', '6,3': 'sel' } },
          txt('Each session', '10 min skeleton from memory → 25 min mixed problem → 10 min redo + error log')
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Pattern flash cards (front → back)', html: `${H.table(['front (clue)', 'back (technique + one-line invariant)'], [
        ['"how many days until a warmer day"', 'monotonic decreasing stack of indices; pop when a warmer day arrives'],
        ['"minimum capacity to finish within D days"', 'binary search on capacity; greedy day count is monotone'],
        ['"return all combinations that sum to target"', 'backtracking: choose, recurse with remaining, unchoose'],
        ['"cheapest flight with at most K stops"', 'Bellman-Ford for K+1 rounds on a copy of dist (or BFS by levels)'],
        ['"merge k sorted lists"', 'min-heap of list heads; pop, push its next']
      ])}<p>Make 30–50 of these from your error log. Review the deck daily in the last week; it takes 10 minutes.</p>` },
      { title: 'Complexity cheat sheet for Java collections', html: `${H.table(['structure', 'add', 'remove', 'lookup', 'notes'], [
        ['ArrayList', 'O(1) amortised (end)', 'O(N) (middle)', 'O(1) by index', 'contains is O(N)'],
        ['ArrayDeque', 'O(1) both ends', 'O(1) both ends', '—', 'use for stacks and queues'],
        ['HashMap / HashSet', 'O(1) avg', 'O(1) avg', 'O(1) avg', 'no order'],
        ['TreeMap / TreeSet', 'O(log N)', 'O(log N)', 'O(log N)', 'floor/ceiling/range'],
        ['PriorityQueue', 'O(log N)', 'O(log N) poll; O(N) remove(obj)', 'O(1) peek', 'not sorted when iterated'],
        ['LinkedHashMap', 'O(1)', 'O(1)', 'O(1)', 'insertion/access order → LRU']
      ])}` },
      { title: 'The 20-minute night-before routine', html: `<ol><li>Read the pattern sheet once (5 min).</li><li>Type two skeletons from memory: sliding window + BFS (8 min).</li><li>Read your top 5 error-log lines (3 min).</li><li>Prepare: charger, water, quiet room, editor tested, ID/links ready (4 min).</li></ol><p>Then stop. Recall the next day is better after sleep than after an extra two hours of grinding.</p>` },
      { title: 'A one-line answer to "tell me the complexity" for 10 classics', html: `${H.table(['algorithm', 'time', 'space'], [
        ['binary search', 'O(log N)', 'O(1)'], ['merge sort', 'O(N log N)', 'O(N)'], ['heap build / k pops', 'O(N) / O(k log N)', 'O(N)'],
        ['BFS / DFS', 'O(V + E)', 'O(V)'], ['Dijkstra (binary heap)', 'O((V + E) log V)', 'O(V + E)'], ['topological sort', 'O(V + E)', 'O(V)'],
        ['union-find (both optimisations)', 'O(α(N)) per op ≈ O(1)', 'O(N)'], ['LCS / edit distance', 'O(N·M)', 'O(min(N, M)) rolling'],
        ['subsets / permutations', 'O(2<sup>N</sup>·N) / O(N!·N)', 'O(N) + output'], ['segment tree query/update', 'O(log N)', 'O(N)']
      ])}` }
    ],
    deepDive: `<p><b>Why checklists work for experts.</b> In medicine, the WHO Surgical Safety Checklist cut complications substantially — not because surgeons lacked skill, but because stress causes skipped steps. A coding interview is a stressful, time-boxed performance; checklists protect the skill you already built.</p>
      <p><b>Retrieval over review.</b> Re-reading notes feels productive but creates an "illusion of fluency". Typing a skeleton from a blank file, or answering a flash card before flipping it, is <i>retrieval practice</i> and roughly doubles retention in many studies. Your last week should be ≥ 80% retrieval (solve, type, recall) and ≤ 20% reading.</p>
      <p><b>Spacing math.</b> Memory decays roughly exponentially; each successful recall flattens the curve. Reviews at increasing gaps (1 day, 3 days, 7 days) give the most retention per minute — the logic behind Anki and the planner above.</p>
      <p><b>Sleep and performance.</b> Sleep consolidates procedural memory (like typing templates) and protects working memory under stress. One night of short sleep measurably hurts problem solving — the exact skill being tested. Cramming late trades a lot of tomorrow’s performance for a little extra exposure.</p>
      <p><b>Company calibration.</b> In the last week, skim recently reported question themes for your target company and level (forums, your recruiter's prep guide). Do not memorise problems — calibrate difficulty and pattern mix (e.g. heavier on graphs/design at some companies, on arrays/strings at others).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI can turn your error log into a personalised revision plan, flash-card deck and quiz in seconds. That removes the planning overhead that used to eat hours of the last week.</p>
      <p><b>Prompts that work:</b> <code>Here is my error log (pasted). Build a 7-day plan using spaced repetition: weak patterns 3 times, medium twice, strong once; leave Sunday for a mock. Then generate 30 flash cards (clue → technique + invariant) from my mistakes only.</code></p>
      <p><b>Quiz yourself with AI:</b> <code>Ask me one pattern-recognition question at a time. Wait for my answer. Tell me if I'm right and what the giveaway clue was.</code> This is retrieval practice on demand.</p>
      <p><b>What you must still own:</b> the honest self-rating (AI cannot see that you peeked), the discipline to stop the night before, and the checklists in your head — on interview day there is no assistant to remind you to check for overflow.</p>`
  });
registerModule({ id: 'dsa28', title: 'Interview Mastery', intro: `<p>xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</p>`, goals: ['aaaaaaaaaaaaa','bbbbbbbbbbbbbbbb','cccccccccccccccc'], prereqs: `ddddddddddddddddddddd`, hours: 10, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
