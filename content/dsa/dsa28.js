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
registerModule({ id: 'dsa28', title: 'Interview Mastery', intro: `<p>xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</p>`, goals: ['aaaaaaaaaaaaa','bbbbbbbbbbbbbbbb','cccccccccccccccc'], prereqs: `ddddddddddddddddddddd`, hours: 10, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
