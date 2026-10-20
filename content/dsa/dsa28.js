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
        ['"subarray sum = K" and <b>negatives allowed</b>', H.c('g', 'Prefix sum + hash map of counts'), 'DSA 5, 8'],
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
        ['"seen before?", "frequency", "anagram", "duplicates"', H.c('g', 'Hash map / hash set'), 'DSA 8'],
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
        ['"design a cache / iterator / counter" with O(1) operations', H.c('g', 'Hash map + linked list / deque'), 'DSA 12, 27']
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
` }, { lang: 'java', code: `
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

    // 3) Prefix sum + hash map: count subarrays with sum exactly k (negatives OK)
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
}`,
        alt: [{ lang: 'python', code: `from collections import deque

# The "pattern skeletons" you should be able to type from memory in under 2 minutes each.

# 1) Variable sliding window: longest window where a condition stays valid
def longest_valid_window(a, limit):
    left = best = total = 0
    for right, x in enumerate(a):
        total += x                          # grow: take a[right] in
        while total > limit:                # shrink until valid again
            total -= a[left]
            left += 1
        best = max(best, right - left + 1)
    return best

# 2) Binary search on the answer: smallest x where feasible(x) is true
def smallest_feasible(lo, hi, feasible):
    while lo < hi:
        mid = (lo + hi) // 2                # Python ints never overflow
        if feasible(mid):
            hi = mid                        # mid works -> answer is mid or smaller
        else:
            lo = mid + 1                    # mid fails -> answer is bigger
    return lo

# 3) Prefix sum + dict: count subarrays with sum exactly k (negatives OK)
def count_sum_k(a, k):
    seen = {0: 1}                           # the empty prefix
    pf = count = 0
    for x in a:
        pf += x
        count += seen.get(pf - k, 0)        # earlier prefixes that leave sum k
        seen[pf] = seen.get(pf, 0) + 1
    return count

# 4) Monotonic stack: next greater element to the right
def next_greater(a):
    ans = [-1] * len(a)
    st = []                                 # indices whose answer is still unknown
    for i, x in enumerate(a):
        while st and a[st[-1]] < x:
            ans[st.pop()] = x
        st.append(i)
    return ans

# 5) BFS on a grid: minimum steps from (0,0) to bottom-right, 1 = wall
def bfs_steps(g):
    R, C = len(g), len(g[0])
    if g[0][0] == 1:
        return -1
    dist = [[-1] * C for _ in range(R)]
    dist[0][0] = 0
    q = deque([(0, 0)])
    while q:
        r, c = q.popleft()
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < R and 0 <= nc < C and g[nr][nc] != 1 and dist[nr][nc] == -1:
                dist[nr][nc] = dist[r][c] + 1      # first visit = shortest
                q.append((nr, nc))
    return dist[R - 1][C - 1]` },
          { lang: 'js', code: `// The "pattern skeletons" you should be able to type from memory in under 2 minutes each.

// 1) Variable sliding window: longest window where a condition stays valid
function longestValidWindow(a, limit) {
  let left = 0, best = 0, sum = 0;
  for (let right = 0; right < a.length; right++) {
    sum += a[right];                         // grow: take a[right] in
    while (sum > limit) sum -= a[left++];    // shrink until valid again
    best = Math.max(best, right - left + 1);
  }
  return best;
}

// 2) Binary search on the answer: smallest x where feasible(x) is true
function smallestFeasible(lo, hi, feasible) {
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);   // keep the middle an integer
    if (feasible(mid)) hi = mid;             // mid works -> answer is mid or smaller
    else lo = mid + 1;                       // mid fails -> answer is bigger
  }
  return lo;
}

// 3) Prefix sum + Map: count subarrays with sum exactly k (negatives OK)
function countSumK(a, k) {
  const seen = new Map([[0, 1]]);            // the empty prefix
  let pf = 0, count = 0;
  for (const x of a) {
    pf += x;
    count += seen.get(pf - k) || 0;          // earlier prefixes that leave sum k
    seen.set(pf, (seen.get(pf) || 0) + 1);
  }
  return count;
}

// 4) Monotonic stack: next greater element to the right
function nextGreater(a) {
  const ans = new Array(a.length).fill(-1);
  const st = [];                             // indices whose answer is still unknown
  for (let i = 0; i < a.length; i++) {
    while (st.length > 0 && a[st[st.length - 1]] < a[i]) ans[st.pop()] = a[i];
    st.push(i);
  }
  return ans;
}

// 5) BFS on a grid: minimum steps from (0,0) to bottom-right, 1 = wall
function bfsSteps(g) {
  const R = g.length, C = g[0].length;
  if (g[0][0] === 1) return -1;
  const dist = Array.from({ length: R }, () => new Array(C).fill(-1));
  dist[0][0] = 0;
  const q = [[0, 0]];                        // read index = head: shift() would be O(n)
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let head = 0; head < q.length; head++) {
    const [r, c] = q[head];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= R || nc >= C || g[nr][nc] === 1 || dist[nr][nc] !== -1) continue;
      dist[nr][nc] = dist[r][c] + 1;         // first visit = shortest
      q.push([nr, nc]);
    }
  }
  return dist[R - 1][C - 1];
}` },
          { lang: 'cpp', code: `// The "pattern skeletons" you should be able to type from memory in under 2 minutes each.
class Skeletons {
public:
    // 1) Variable sliding window: longest window where a condition stays valid
    int longestValidWindow(const vector<int>& a, int limit) {
        int left = 0, best = 0;
        long long sum = 0;
        for (int right = 0; right < (int)a.size(); right++) {
            sum += a[right];                    // grow: take a[right] in
            while (sum > limit) sum -= a[left++];   // shrink until valid again
            best = max(best, right - left + 1);
        }
        return best;
    }

    // 2) Binary search on the answer: smallest x where feasible(x) is true
    int smallestFeasible(int lo, int hi, function<bool(int)> feasible) {
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;       // overflow-safe middle
            if (feasible(mid)) hi = mid;        // mid works -> answer is mid or smaller
            else lo = mid + 1;                  // mid fails -> answer is bigger
        }
        return lo;
    }

    // 3) Prefix sum + unordered_map: count subarrays with sum exactly k (negatives OK)
    int countSumK(const vector<int>& a, int k) {
        unordered_map<long long, int> seen;
        seen[0] = 1;                            // the empty prefix
        long long pf = 0;
        int count = 0;
        for (int x : a) {
            pf += x;
            auto it = seen.find(pf - k);        // earlier prefixes that leave sum k
            if (it != seen.end()) count += it->second;
            seen[pf]++;
        }
        return count;
    }

    // 4) Monotonic stack: next greater element to the right
    vector<int> nextGreater(const vector<int>& a) {
        vector<int> ans(a.size(), -1), st;      // st holds indices whose answer is still unknown
        for (int i = 0; i < (int)a.size(); i++) {
            while (!st.empty() && a[st.back()] < a[i]) { ans[st.back()] = a[i]; st.pop_back(); }
            st.push_back(i);
        }
        return ans;
    }

    // 5) BFS on a grid: minimum steps from (0,0) to bottom-right, 1 = wall
    int bfsSteps(const vector<vector<int>>& g) {
        int R = g.size(), C = g[0].size();
        if (g[0][0] == 1) return -1;
        vector<vector<int>> dist(R, vector<int>(C, -1));
        queue<pair<int, int>> q;
        q.push({0, 0});
        dist[0][0] = 0;
        const int dr[] = {1, -1, 0, 0}, dc[] = {0, 0, 1, -1};
        while (!q.empty()) {
            auto [r, c] = q.front();
            q.pop();
            for (int d = 0; d < 4; d++) {
                int nr = r + dr[d], nc = c + dc[d];
                if (nr < 0 || nc < 0 || nr >= R || nc >= C || g[nr][nc] == 1 || dist[nr][nc] != -1) continue;
                dist[nr][nc] = dist[r][c] + 1;  // first visit = shortest
                q.push({nr, nc});
            }
        }
        return dist[R - 1][C - 1];
    }
};` }] } ],
    codeTitle: ['Clue matcher (Python, runnable)', 'Five pattern skeletons to type from memory'],
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
      { title: 'Two clues fighting: "Maximum subarray sum with one deletion"', html: `<p>"Subarray" suggests sliding window, but values are negative and we want a <b>maximum</b>, not a fixed target. Window logic breaks. "Choose to delete or not at each step" is a <b>choice</b> → ${H.c('g', 'DP with two states')} (best ending here with no deletion / with one deletion). This is Kadane (DSA 5) + state-machine DP (DSA 19).</p>`, code: { lang: 'java', code: `int maximumSum(int[] a) {
    int noDel = a[0], oneDel = Integer.MIN_VALUE / 2, best = a[0];
    for (int i = 1; i < a.length; i++) {
        oneDel = Math.max(oneDel + a[i], noDel); // either delete a[i] now, or we deleted earlier
        noDel = Math.max(noDel + a[i], a[i]);    // plain Kadane
        best = Math.max(best, Math.max(noDel, oneDel));
    }
    return best;
}`,
        alt: [{ lang: 'python', code: `def maximum_sum(a):
    no_del, one_del, best = a[0], float("-inf"), a[0]
    for x in a[1:]:
        one_del = max(one_del + x, no_del)    # either delete x now, or we deleted earlier
        no_del = max(no_del + x, x)           # plain Kadane
        best = max(best, no_del, one_del)
    return best` },
          { lang: 'js', code: `function maximumSum(a) {
  let noDel = a[0], oneDel = -Infinity, best = a[0];
  for (let i = 1; i < a.length; i++) {
    oneDel = Math.max(oneDel + a[i], noDel);   // either delete a[i] now, or we deleted earlier
    noDel = Math.max(noDel + a[i], a[i]);      // plain Kadane
    best = Math.max(best, noDel, oneDel);
  }
  return best;
}` },
          { lang: 'cpp', code: `int maximumSum(const vector<int>& a) {
    int noDel = a[0], oneDel = INT_MIN / 2, best = a[0];
    for (size_t i = 1; i < a.size(); i++) {
        oneDel = max(oneDel + a[i], noDel);    // either delete a[i] now, or we deleted earlier
        noDel = max(noDel + a[i], a[i]);       // plain Kadane
        best = max({best, noDel, oneDel});
    }
    return best;
}` }] } }
    ],
    deepDive: `<p><b>Why pattern maps work (and when they fail).</b> Interview problems are drawn from a small set of reusable <i>invariants</i>: "the window is always valid", "the stack is always decreasing", "everything left of lo fails the check". A clue word is a hint about which invariant the author built the problem around. That is why one table covers hundreds of problems.</p>
      <p><b>Failure mode 1 — one clue, wrong family.</b> "Longest" appears in sliding window, LIS (DP), and longest path (graph DP). Always pair the clue with the input shape and the size: "longest + contiguous + non-negative" is a window; "longest + subsequence" is DP; "longest + in a DAG" is topo order + DP.</p>
      <p><b>Failure mode 2 — the hidden monotonicity.</b> Binary search on the answer never says "binary search". The tell is a yes/no check that flips once: if capacity C works then C+1 works. Ask yourself: "If I guessed the answer, could I check it in O(N)?" If yes, you probably have binary search on the answer.</p>
      <p><b>Failure mode 3 — the graph in disguise.</b> States connected by moves (word ladder, lock combinations, sliding puzzle) form an implicit graph. "Minimum number of moves" over such states = BFS, even with no edges in the input.</p>
      <p><b>Failure mode 4 — design questions.</b> "Implement X with O(1) get and put" is a data-structure combination question (DSA 27). The clue is the <b>required complexity per operation</b>: O(1) lookup → hash map; O(1) order changes → linked list; O(log N) ordered → ordered map (TreeMap / std::map) or heap.</p>
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
      brute: { why: `<p>Try every start i and every end j, adding as you go: O(N<sup>2</sup>) = 4·10<sup>8</sup> additions at the max size — borderline TLE. The wasted work: every new start recomputes sums we already knew.</p>`, code: { lang: 'java', code: `int bruteCount(int[] nums, int k) {
    int count = 0;
    for (int i = 0; i < nums.length; i++) {
        int sum = 0;
        for (int j = i; j < nums.length; j++) {
            sum += nums[j];           // sum of nums[i..j]
            if (sum == k) count++;
        }
    }
    return count;
}`, alt: [{ lang: 'python', code: String.raw`
def subarray_sum(nums, k):
    count = 0
    for i in range(len(nums)):
        total = 0
        for j in range(i, len(nums)):
            total += nums[j]                          # sum of nums[i..j]
            if total == k:
                count += 1
    return count` }, { lang: 'js', code: String.raw`
function subarraySum(nums, k) {
  let count = 0;
  for (let i = 0; i < nums.length; i++) {
    let sum = 0;
    for (let j = i; j < nums.length; j++) {
      sum += nums[j];                                 // sum of nums[i..j]
      if (sum === k) count++;
    }
  }
  return count;
}` }, { lang: 'cpp', code: String.raw`
int subarraySum(vector<int>& nums, int k) {
    int count = 0;
    for (int i = 0; i < (int)nums.size(); i++) {
        int sum = 0;
        for (int j = i; j < (int)nums.size(); j++) {
            sum += nums[j];                           // sum of nums[i..j]
            if (sum == k) count++;
        }
    }
    return count;
}` }] } },
      mcq: { q: 'Why is a sliding window wrong here?', options: ['Negative numbers mean shrinking the window can increase the sum, so grow/shrink decisions are unreliable', 'Windows only work on strings', 'The array is too long for a window', 'Windows cannot count, only find the longest'], answer: 0, explain: 'A window needs "adding makes it bigger, removing makes it smaller". Negatives break that, so you cannot know which way to move.' },
      hints: [`<p>Hint 1: sum(i..j) = pf[j] − pf[i−1]. You want pf[j] − pf[i−1] = k, i.e. an <b>earlier</b> prefix equal to pf[j] − k.</p>`, `<p>Hint 2: keep a hash map from "prefix sum value" → "how many times seen so far". At each j, add map[pf − k] to the answer.</p>`, `<p>Hint 3: seed the map with {0: 1} so subarrays starting at index 0 are counted. Recipe: pf = 0; for x: pf += x; ans += map[pf−k]; map[pf]++.</p>`],
      tests: { sig: 'int[] int -> int', fn: 'subarraySum', cases: [
        [[[1,-1,1,1],2],2],
        [[[1,1,1],2],2],
        [[[1,2,3],3],2],
        [[[0,0,0,0],0],10],
        [[[-1,-1,1],0],1],
        [[[1],1],1],
        [[[1],0],0],
        [[[-1000,1000],0],1],
        [[[3,4,7,2,-3,1,4,2],7],4],
        [[[-2,2,-4,0,0,1,-1],-3],2],
        [[[3,-3,-2,1,3],5],0],
        [[[0,0,1,-2,2,2,4,-2],-1],3],
        [[[2,-3,-4,3,-4,1,-2],1],1],
        [[{"$rep":0,"n":20000},0],200010000],
        [[{"$rep":1000,"n":20000},10000000],10001],
        [[{"$rep":-1000,"n":20000},-10000000],10001]
      ] },
      solution: {
        approach: `<p><b>Clue reading:</b> "contiguous subarray" + "sum equals k" + "negative values" → prefix sum + hash map (DSA 5 + DSA 8). One pass; for each end j, count how many earlier prefixes equal pf − k.</p>`,
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
        alt: [{ lang: 'python', code: `from collections import Counter

def subarray_sum(nums, k):
    freq = Counter({0: 1})        # the empty prefix lets subarrays start at index 0
    pf = count = 0
    for x in nums:
        pf += x                   # prefix sum up to here
        count += freq[pf - k]     # earlier prefixes that leave exactly k
        freq[pf] += 1             # record this prefix AFTER counting
    return count` },
          { lang: 'js', code: `function subarraySum(nums, k) {
  const freq = new Map([[0, 1]]);          // the empty prefix
  let pf = 0, count = 0;
  for (const x of nums) {
    pf += x;                               // prefix sum up to here
    count += freq.get(pf - k) || 0;        // earlier prefixes that leave exactly k
    freq.set(pf, (freq.get(pf) || 0) + 1); // record this prefix AFTER counting
  }
  return count;
}` },
          { lang: 'cpp', code: `class Solution {
public:
    int subarraySum(vector<int>& nums, int k) {
        unordered_map<long long, int> freq;
        freq[0] = 1;                          // the empty prefix
        long long pf = 0;
        int count = 0;
        for (int x : nums) {
            pf += x;                          // prefix sum up to here
            auto it = freq.find(pf - k);      // earlier prefixes that leave exactly k
            if (it != freq.end()) count += it->second;
            freq[pf]++;                       // record this prefix AFTER counting
        }
        return count;
    }
};` }],
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
        <li><b>Lowercase letters only</b> — alphabet of 26 is a constant: a 26-slot count array (<code>int[26]</code> in Java) beats a hash map, and O(26·N) counts as O(N).</li>
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
      { title: 'Values up to 10<sup>9</sup>, N ≤ 10<sup>5</sup>, "minimum largest sum"', html: `<p>You cannot loop over every candidate answer (up to 10<sup>14</sup>), but binary search over that range takes only log<sub>2</sub>(10<sup>14</sup>) ≈ 47 checks of O(N) each → about 5·10<sup>6</sup> steps. Also: sums reach 10<sup>14</sup>, so ${H.c('r', 'int overflows')} → use <code>long</code>.</p>`, code: { lang: 'java', code: `long lo = 0, hi = 0;
int[] nums = {7, 2, 5, 10, 8};
for (int x : nums) { lo = Math.max(lo, x); hi += x; }   // answer lies in [max, sum]
System.out.println("search range: " + lo + " .. " + hi + ", about " + (64 - Long.numberOfLeadingZeros(hi - lo + 1)) + " checks");`,
        alt: [{ lang: 'python', run: true, code: `nums = [7, 2, 5, 10, 8]
lo, hi = max(nums), sum(nums)                 # answer lies in [max, sum]
print(f"search range: {lo} .. {hi}, about {(hi - lo + 1).bit_length()} checks")` },
          { lang: 'js', run: true, code: `const nums = [7, 2, 5, 10, 8];
const lo = Math.max(...nums), hi = nums.reduce((a, b) => a + b, 0);   // answer lies in [max, sum]
console.log("search range: " + lo + " .. " + hi + ", about " + (hi - lo + 1).toString(2).length + " checks");` },
          { lang: 'cpp', code: `vector<int> nums = {7, 2, 5, 10, 8};
long long lo = *max_element(nums.begin(), nums.end());
long long hi = accumulate(nums.begin(), nums.end(), 0LL);   // answer lies in [max, sum]
cout << "search range: " << lo << " .. " << hi << ", about " << (64 - __builtin_clzll(hi - lo + 1)) << " checks" << endl;` }] } },
      { title: 'String of lowercase letters, length ≤ 10<sup>5</sup>', html: `<p>"Lowercase only" means 26 counters. Comparing two frequency arrays costs 26 steps, a constant. A window algorithm that compares counts at every step is O(26·N) = 2.6·10<sup>6</sup> → fine. Use a 26-slot count array instead of a hash map: faster and no boxing.</p>` }
    ],
    deepDive: `<p><b>Where "10<sup>8</sup> per second" comes from.</b> A modern CPU runs ~3·10<sup>9</sup> cycles per second, but one "step" of an algorithm (array access, comparison, hash lookup) costs anywhere from 1 to 100+ cycles once you count cache misses and branch mispredictions. 10<sup>8</sup> is a safe, conservative middle. Java and JavaScript add JIT warm-up and object overhead; Python is ~30–100× slower, so a Python O(N log N) at N = 10<sup>6</sup> may still struggle.</p>
      <p><b>Constants matter at the border.</b> O(N log N) with a hash map of boxed numbers (such as Java <code>Long</code>s) can be slower than O(N log N) with a sorted primitive array, because every boxed object is a pointer chase. At N = 10<sup>6</sup>, cache-friendly code wins by 5–10×.</p>
      <p><b>Reading constraints backwards.</b> Problem setters choose N so that the intended solution passes and the naive one fails. If N ≤ 2000, an O(N<sup>2</sup>) solution is almost certainly intended — do not burn time searching for O(N log N). If N ≤ 10<sup>5</sup> but the obvious solution is O(N<sup>2</sup>), the problem is about removing one loop (hashing, sorting, monotonic structure, prefix sums).</p>
      <p><b>Memory budget too.</b> 256 MB ≈ 6·10<sup>7</sup> ints. A 10<sup>4</sup> × 10<sup>4</sup> int DP table is 400 MB → you need the rolling-array trick (keep two rows). Recursion depth of 10<sup>5</sup> can overflow the default stack in Java, JavaScript and Python → iterative DFS or BFS.</p>
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
      brute: { why: `<p>Try every way to place k−1 cut points: C(N−1, k−1) splits — astronomically many for N = 1000, k = 50. The waste: we never use the fact that "largest sum ≤ X is possible" is a yes/no question with a monotone answer.</p>`, code: { lang: 'java', code: `int bruteSplit(int[] nums, int k) {
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
}`, alt: [{ lang: 'python', code: String.raw`
def split_array(nums, k):
    n = len(nums)

    # smallest possible "largest part" for nums[start:] cut into exactly k parts
    def go(start, k):
        if k == 1:
            return sum(nums[start:])
        best, first = float("inf"), 0
        for end in range(start, n - k + 1):           # first part is nums[start..end]
            first += nums[end]
            rest = go(end + 1, k - 1)                 # recursion explodes: exponential
            best = min(best, max(first, rest))
        return best

    return go(0, k)` }, { lang: 'js', code: String.raw`
function splitArray(nums, k) {
  const n = nums.length;

  // smallest possible "largest part" for nums[start..] cut into exactly k parts
  function go(start, k) {
    if (k === 1) { let s = 0; for (let i = start; i < n; i++) s += nums[i]; return s; }
    let best = Infinity, first = 0;
    for (let end = start; end <= n - k; end++) {      // first part is nums[start..end]
      first += nums[end];
      const rest = go(end + 1, k - 1);                // recursion explodes: exponential
      best = Math.min(best, Math.max(first, rest));
    }
    return best;
  }

  return go(0, k);
}` }, { lang: 'cpp', code: String.raw`
int splitArray(vector<int>& nums, int k) {
    int n = nums.size();
    // smallest possible "largest part" for nums[start..] cut into exactly k parts
    function<int(int, int)> go = [&](int start, int k) {
        if (k == 1) { int s = 0; for (int i = start; i < n; i++) s += nums[i]; return s; }
        int best = INT_MAX, first = 0;
        for (int end = start; end <= n - k; end++) {  // first part is nums[start..end]
            first += nums[end];
            int rest = go(end + 1, k - 1);            // recursion explodes: exponential
            best = min(best, max(first, rest));
        }
        return best;
    };
    return go(0, k);
}` }] } },
      mcq: { q: '"Minimize the largest part sum" + values up to 10<sup>6</sup>. What is the cleanest approach?', options: ['Binary search on the answer with a greedy O(N) feasibility check', 'Sort the array and split in the middle', 'Sliding window of size N/k', 'Heap of part sums'], answer: 0, explain: '"Minimize the maximum" is the classic tell. If largest sum X is achievable, any X\' &gt; X is too — monotone → binary search.' },
      hints: [`<p>Hint 1: Flip the question: "Can I split into ≤ k parts so that every part sum ≤ X?" That yes/no answer only flips once as X grows.</p>`, `<p>Hint 2: The check is greedy: walk left to right, start a new part whenever adding the next number would exceed X. Count the parts.</p>`, `<p>Hint 3: Search X in [max(nums), sum(nums)]. Use long for sums. Recipe: lo = max, hi = sum; while lo &lt; hi: mid; if parts(mid) ≤ k: hi = mid else lo = mid + 1.</p>`],
      tests: { sig: 'int[] int -> int', fn: 'splitArray', cases: [
        [[[7,2,5,10,8],2],18],
        [[[1,2,3,4,5],2],9],
        [[[1,4,4],3],4],
        [[[0,0,0],2],0],
        [[[10],1],10],
        [[[5,5,5,5],4],5],
        [[[2,3,1,2,4,3],5],4],
        [[[1,2,3,4,5],1],15],
        [[[0],1],0],
        [[[8,3,13,15,6,20],5],20],
        [[[14,2,12,11,14],5],14],
        [[[17,12,0,7,2],3],17],
        [[[3,16,1,1,4],5],16],
        [[{"$rep":1000000,"n":1000},1],1000000000],
        [[{"$rep":1000000,"n":1000},2],500000000],
        [[{"$rep":1000000,"n":1000},50],20000000],
        [[{"$concat":[{"$rep":0,"n":999},[1000000]]},50],1000000]
      ] },
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
        alt: [{ lang: 'python', code: `def split_array(nums, k):
    def parts_needed(cap):                 # greedy: fewest parts if no part may exceed cap
        parts, cur = 1, 0
        for x in nums:
            if cur + x > cap:
                parts += 1
                cur = 0
            cur += x
        return parts

    lo, hi = max(nums), sum(nums)          # the answer is in [max, sum]
    while lo < hi:
        mid = (lo + hi) // 2
        if parts_needed(mid) <= k:
            hi = mid                       # feasible: try smaller
        else:
            lo = mid + 1                   # too many parts: need a bigger cap
    return lo` },
          { lang: 'js', code: `function splitArray(nums, k) {
  // greedy: how many parts if no part may exceed cap?
  const partsNeeded = (cap) => {
    let parts = 1, cur = 0;
    for (const x of nums) {
      if (cur + x > cap) { parts++; cur = 0; }
      cur += x;
    }
    return parts;
  };
  let lo = Math.max(...nums), hi = nums.reduce((a, b) => a + b, 0); // answer is in [max, sum]
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (partsNeeded(mid) <= k) hi = mid;   // feasible: try smaller
    else lo = mid + 1;                     // too many parts: need a bigger cap
  }
  return lo;
}` },
          { lang: 'cpp', code: `class Solution {
    // greedy: how many parts if no part may exceed cap?
    int partsNeeded(const vector<int>& nums, long long cap) {
        int parts = 1;
        long long cur = 0;
        for (int x : nums) {
            if (cur + x > cap) { parts++; cur = 0; }
            cur += x;
        }
        return parts;
    }
public:
    int splitArray(vector<int>& nums, int k) {
        long long lo = *max_element(nums.begin(), nums.end());
        long long hi = accumulate(nums.begin(), nums.end(), 0LL);   // answer is in [max, sum]
        while (lo < hi) {
            long long mid = lo + (hi - lo) / 2;
            if (partsNeeded(nums, mid) <= k) hi = mid;   // feasible: try smaller
            else lo = mid + 1;                           // too many parts: need a bigger cap
        }
        return (int)lo;
    }
};` }],
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
      'Clue "seen before?" → hash map value → index. One pass: before storing a[i], ask "is target − a[i] already in the map?" O(N).',
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
    code: [{ lang: 'java', code: `
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
}`,
        alt: [{ lang: 'python', code: `# The shape of a strong interview solution: tiny entry point, named steps, early edge cases.
class MinMeetingRooms:
    def min_meeting_rooms(self, intervals):
        if not intervals:
            return 0                                   # edge case first, out loud
        starts = sorted(s for s, _ in intervals)
        ends = sorted(e for _, e in intervals)
        used = best = j = 0                            # j points at the earliest unfinished end
        for s in starts:
            while j < len(ends) and ends[j] <= s:      # free rooms whose meeting ended
                used -= 1
                j += 1
            used += 1                                  # this meeting takes a room
            best = max(best, used)
        return best` },
          { lang: 'js', code: `// The shape of a strong interview solution: tiny entry point, named steps, early edge cases.
class MinMeetingRooms {
  minMeetingRooms(intervals) {
    if (!intervals || intervals.length === 0) return 0;          // edge case first, out loud
    const n = intervals.length;
    const starts = intervals.map((m) => m[0]).sort((a, b) => a - b);   // comparator: default sort is by string
    const ends = intervals.map((m) => m[1]).sort((a, b) => a - b);
    let used = 0, best = 0, j = 0;                               // j points at the earliest unfinished end
    for (let i = 0; i < n; i++) {
      while (j < n && ends[j] <= starts[i]) { used--; j++; }     // free rooms whose meeting ended
      used++;                                                    // this meeting takes a room
      best = Math.max(best, used);
    }
    return best;
  }
}` },
          { lang: 'cpp', code: `// The shape of a strong interview solution: tiny entry point, named steps, early edge cases.
class MinMeetingRooms {
public:
    int minMeetingRooms(const vector<vector<int>>& intervals) {
        if (intervals.empty()) return 0;               // edge case first, out loud
        int n = intervals.size();
        vector<int> starts, ends;
        for (const auto& m : intervals) { starts.push_back(m[0]); ends.push_back(m[1]); }
        sort(starts.begin(), starts.end());
        sort(ends.begin(), ends.end());
        int used = 0, best = 0, j = 0;                 // j points at the earliest unfinished end
        for (int i = 0; i < n; i++) {
            while (j < n && ends[j] <= starts[i]) { used--; j++; }   // free rooms whose meeting ended
            used++;                                    // this meeting takes a room
            best = max(best, used);
        }
        return best;
    }
};` }] }, { lang: 'python', run: true, title: 'Brute force vs optimised: count the work (runnable)', code: `import random

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
    codeTitle: ['Clean final code shape', 'Why step 4 matters: operation counts'],
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
      { title: 'Using "guess the answer and check": Koko eating bananas', html: `<p>"Minimum eating speed to finish all piles in h hours." If someone told you the speed s, could you check it? Yes: hours = Σ ⌈pile / s⌉, one O(N) pass. And if s works, s+1 works too. Guess-and-check + monotonic ⇒ binary search on s in [1, max pile].</p>`, code: { lang: 'java', code: `long hoursAt(int[] piles, int s) {
    long h = 0;
    for (int p : piles) h += (p + s - 1) / s;   // ceil(p / s) without floating point
    return h;
}`,
        alt: [{ lang: 'python', code: `def hours_at(piles, s):
    return sum((p + s - 1) // s for p in piles)   # ceil(p / s) without floating point` },
          { lang: 'js', code: `function hoursAt(piles, s) {
  let h = 0;
  for (const p of piles) h += Math.floor((p + s - 1) / s);   // ceil(p / s) without floating point
  return h;
}` },
          { lang: 'cpp', code: `long long hoursAt(const vector<int>& piles, long long s) {
    long long h = 0;
    for (int p : piles) h += (p + s - 1) / s;   // ceil(p / s) without floating point
    return h;
}` }] } },
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
      brute: { why: `<p>At every start time, count meetings running then (scan all N): O(N<sup>2</sup>). The waste: each scan rediscovers the same running meetings. A sweep over sorted times keeps that count incrementally.</p>`, code: { lang: 'java', code: `int bruteRooms(int[][] iv) {
    int best = 0;
    for (int[] a : iv) {
        int running = 0;
        for (int[] b : iv)
            if (b[0] <= a[0] && a[0] < b[1]) running++;   // b is in progress at time a[0]
        best = Math.max(best, running);
    }
    return best;
}`, alt: [{ lang: 'python', code: String.raw`
def min_meeting_rooms(intervals):
    best = 0
    for a in intervals:
        running = 0
        for b in intervals:
            if b[0] <= a[0] < b[1]:                   # b is in progress at time a[0]
                running += 1
        best = max(best, running)
    return best` }, { lang: 'js', code: String.raw`
function minMeetingRooms(intervals) {
  let best = 0;
  for (const a of intervals) {
    let running = 0;
    for (const b of intervals)
      if (b[0] <= a[0] && a[0] < b[1]) running++;     // b is in progress at time a[0]
    best = Math.max(best, running);
  }
  return best;
}` }, { lang: 'cpp', code: String.raw`
int minMeetingRooms(vector<vector<int>>& intervals) {
    int best = 0;
    for (auto& a : intervals) {
        int running = 0;
        for (auto& b : intervals)
            if (b[0] <= a[0] && a[0] < b[1]) running++;   // b is in progress at time a[0]
        best = max(best, running);
    }
    return best;
}` }] } },
      mcq: { q: 'Which data structure most naturally tells you "the earliest time any room frees up"?', options: ['A min-heap of end times', 'A stack of start times', 'A hash map from start to end', 'A queue of intervals in input order'], answer: 0, explain: 'The heap top is the earliest ending meeting. If it ends by the new start, reuse that room (poll), then push the new end.' },
      hints: [`<p>Hint 1: Process meetings in order of start time. At each start, which rooms are free? Those whose meeting already ended.</p>`, `<p>Hint 2: Keep a min-heap of end times of rooms in use. Before adding a meeting, pop the top if it ended (end ≤ start).</p>`, `<p>Hint 3: The heap's maximum size over time is the answer. Edge cases: empty input → 0; touching intervals share a room (use ≤).</p>`],
      tests: { sig: 'int[][] -> int', fn: 'minMeetingRooms', cases: [
        [[[[0,30],[5,10],[15,20]]],2],
        [[[[7,10],[2,4]]],1],
        [[[[1,5],[5,10]]],1],
        [[[[0,1]]],1],
        [[[]],0],
        [[[[1,10],[2,9],[3,8],[4,7]]],4],
        [[[[0,10],[10,20],[20,30]]],1],
        [[[[1,3],[1,3],[1,3]]],3],
        [[[[0,1000000],[0,1000000]]],2],
        [[[[6,9],[1,4],[4,7],[1,7],[10,13],[7,8]]],3],
        [[[[2,5],[9,14],[10,12],[9,10],[12,13],[2,8],[8,9],[3,7]]],3],
        [[[[11,14],[11,14],[2,7]]],2],
        [[[[10,12],[1,3],[5,7]]],1],
        [[{"$rep":[0,1000000],"n":10000}],10000],
        [[{"$concat":[[[0,5]],{"$rep":[5,10],"n":5000}]}],5000],
        [[{"$concat":[{"$rep":[0,1],"n":4000},{"$rep":[1,2],"n":4000}]}],4000]
      ] },
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
        alt: [{ lang: 'python', code: `import heapq

def min_meeting_rooms(intervals):
    ends = []                                  # min-heap of end times of busy rooms
    for start, end in sorted(intervals):       # by start time
        if ends and ends[0] <= start:
            heapq.heapreplace(ends, end)       # reuse the room that freed first
        else:
            heapq.heappush(ends, end)          # open a new room
    return len(ends)` },
          { lang: 'js', code: `class MinHeap {
  constructor(less) { this.a = []; this.less = less || ((x, y) => x < y); }
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(v) {
    const a = this.a;
    a.push(v);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function minMeetingRooms(intervals) {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);   // by start time
  const ends = new MinHeap();                                  // end times of busy rooms
  for (const [start, end] of sorted) {
    if (ends.size() > 0 && ends.peek() <= start) ends.pop();   // reuse the room that freed first
    ends.push(end);                                            // this meeting occupies a room
  }
  return ends.size();                                          // rooms ever needed at once
}` },
          { lang: 'cpp', code: `class Solution {
public:
    int minMeetingRooms(vector<vector<int>>& intervals) {
        sort(intervals.begin(), intervals.end());               // by start time
        priority_queue<int, vector<int>, greater<int>> ends;    // min-heap of end times
        for (auto& m : intervals) {
            if (!ends.empty() && ends.top() <= m[0]) ends.pop();  // reuse the room that freed first
            ends.push(m[1]);                                      // this meeting occupies a room
        }
        return (int)ends.size();
    }
};` }],
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
        <details><summary>Reveal patterns and target times</summary><p>1. Hash map + doubly linked list, O(1) get/put (DSA 12) — 20 min. 2. Monotonic deque of indices, front = max (DSA 14) — 20 min. 3. 2D DP over prefixes: insert/delete/replace (DSA 18) — 30 min.</p></details>
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
      brute: { why: `<p>Compare every word with every group's first word by sorting both: O(N<sup>2</sup> · L log L). With N = 10<sup>4</sup> that is 10<sup>8</sup> comparisons, each costly. The waste: we recompute the "signature" of a word for every comparison instead of using it as a hash key.</p>`, code: { lang: 'java', code: `List<List<String>> bruteGroups(String[] words) {
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
}`, alt: [{ lang: 'python', code: String.raw`
def group_anagrams(strs):
    groups = []
    for w in strs:
        a = sorted(w)
        placed = False
        for g in groups:
            b = sorted(g[0])                          # recomputed every time: the waste
            if a == b:
                g.append(w)
                placed = True
                break
        if not placed:
            groups.append([w])
    return groups` }, { lang: 'js', code: String.raw`
function groupAnagrams(strs) {
  const groups = [];
  for (const w of strs) {
    const a = w.split("").sort().join("");
    let placed = false;
    for (const g of groups) {
      const b = g[0].split("").sort().join("");       // recomputed every time: the waste
      if (a === b) { g.push(w); placed = true; break; }
    }
    if (!placed) groups.push([w]);
  }
  return groups;
}` }, { lang: 'cpp', code: String.raw`
vector<vector<string>> groupAnagrams(vector<string>& strs) {
    vector<vector<string>> groups;
    for (auto& w : strs) {
        string a = w;
        sort(a.begin(), a.end());
        bool placed = false;
        for (auto& g : groups) {
            string b = g[0];
            sort(b.begin(), b.end());                 // recomputed every time: the waste
            if (a == b) { g.push_back(w); placed = true; break; }
        }
        if (!placed) groups.push_back({w});
    }
    return groups;
}` }] } },
      mcq: { q: 'What is the best "signature" key for a word when letters are only a–z and words can be 100 long?', options: ['A 26-count string like "1#0#0#…" built in O(L)', 'The word sorted, O(L log L)', 'The sum of character codes', 'The first and last letters'], answer: 0, explain: 'Counts are O(L) and unique per anagram class. Sorting also works (O(L log L)). Sums collide: "ad" and "bc" have equal sums.' },
      hints: [`<p>Hint 1: Two words are anagrams exactly when their letter counts are equal. Turn the counts into a key.</p>`, `<p>Hint 2: HashMap&lt;String, List&lt;String&gt;&gt; from key → words. One pass.</p>`, `<p>Hint 3: Build the key from the 26 counts with separators ("#") so counts like 1,11 and 11,1 cannot collide. Empty string gets the all-zero key — still a valid group.</p>`],
      tests: { sig: 'string[] -> list<list<string>>', fn: 'groupAnagrams', check: "(args, out, expected) => { const words = args[0]; const key = (s) => s.split(\"\").sort().join(\"\"); const seen = new Set(); let total = 0; const sizes = []; for (const g of out) { if (g.length === 0) return false; const k = key(g[0]); if (seen.has(k)) return false; seen.add(k); for (const w of g) if (key(w) !== k) return false; total += g.length; sizes.push(g.length); } if (total !== words.length) return false; const a = words.map(String).sort(), b = out.flat().map(String).sort(); for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; sizes.sort((p, q) => p - q); return JSON.stringify(sizes) === JSON.stringify(expected); }", cases: [
        [[["eat","tea","tan","ate","nat","bat"]],[1,2,3]],
        [[[""]],[1]],
        [[["a"]],[1]],
        [[["",""]],[2]],
        [[["ab","ba","abc","cab","bca","c"]],[1,2,3]],
        [[["aab","aba","baa","abb"]],[1,3]],
        [[["a","b","c"]],[1,1,1]],
        [[["zz","zz","z"]],[1,2]],
        [[["aa","bc","","","cb","a","c",""]],[1,1,1,2,3]],
        [[["b","cbb","bc","bba","b",""]],[1,1,1,1,2]],
        [[["ccc","bbb","aaa","ba","bc","caa","cb"]],[1,1,1,1,1,2]],
        [[{"$rep":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","n":10000}],[10000]],
        [[{"$concat":[{"$rep":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","n":5000},{"$rep":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","n":5000}]}],[5000,5000]],
        [[{"$concat":[{"$rep":"abababababababababababababababababababababababababababababababababababababababababababababababababab","n":5000},{"$rep":"babababababababababababababababababababababababababababababababababababababababababababababababababa","n":5000}]}],[10000]]
      ] },
      solution: {
        approach: `<p>Clue: "same letters, same counts" → frequency signature + hash map (DSA 8). Compute the 26-count key per word in O(L), append the word to its bucket.</p>`,
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
        alt: [{ lang: 'python', code: `from collections import defaultdict

def group_anagrams(strs):
    groups = defaultdict(list)
    for w in strs:
        cnt = [0] * 26
        for ch in w:
            cnt[ord(ch) - ord('a')] += 1
        groups[tuple(cnt)].append(w)       # equal letter counts = same key
    return list(groups.values())` },
          { lang: 'js', code: `function groupAnagrams(strs) {
  const groups = new Map();
  for (const w of strs) {
    const cnt = new Array(26).fill(0);
    for (const ch of w) cnt[ch.charCodeAt(0) - 97]++;
    const key = cnt.join('#');                 // '#' separates counts: no collisions
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(w);
  }
  return [...groups.values()];
}` },
          { lang: 'cpp', code: `class Solution {
public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        unordered_map<string, vector<string>> groups;
        for (const string& w : strs) {
            int cnt[26] = {};
            for (char c : w) cnt[c - 'a']++;
            string key;
            for (int c : cnt) key += to_string(c) + '#';   // '#' separates counts: no collisions
            groups[key].push_back(w);
        }
        vector<vector<string>> res;
        for (auto& [key, words] : groups) res.push_back(move(words));
        return res;
    }
};` }],
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
` }, { lang: 'java', code: `
// Walkthrough 3 code: LRU cache with O(1) get/put — hash map for lookup + doubly linked list for order.
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
}`,
        alt: [{ lang: 'python', code: `# Walkthrough 3 code: LRU cache with O(1) get/put - dict for lookup + doubly linked list for order.
class LRUCache:
    class Node:
        __slots__ = ("key", "val", "prev", "next")

        def __init__(self, key=0, val=0):
            self.key, self.val = key, val
            self.prev = self.next = None

    def __init__(self, capacity):
        self.capacity = capacity
        self.map = {}
        self.head, self.tail = self.Node(), self.Node()      # sentinels: no None checks
        self.head.next, self.tail.prev = self.tail, self.head

    def get(self, key):
        n = self.map.get(key)
        if n is None:
            return -1
        self._unlink(n)
        self._add_front(n)                                   # touched -> most recently used
        return n.val

    def put(self, key, value):
        n = self.map.get(key)
        if n is not None:
            n.val = value
            self._unlink(n)
            self._add_front(n)
            return
        if len(self.map) == self.capacity:                   # evict least recently used (just before tail)
            lru = self.tail.prev
            self._unlink(lru)
            del self.map[lru.key]
        n = self.Node(key, value)
        self.map[key] = n
        self._add_front(n)

    def _unlink(self, n):
        n.prev.next = n.next
        n.next.prev = n.prev

    def _add_front(self, n):
        n.next, n.prev = self.head.next, self.head
        self.head.next.prev = n
        self.head.next = n` },
          { lang: 'js', code: `// Walkthrough 3 code: LRU cache with O(1) get/put - Map for lookup + doubly linked list for order.
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
    this.head = { key: 0, val: 0, prev: null, next: null };   // sentinels: no null checks
    this.tail = { key: 0, val: 0, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }
  get(key) {
    const n = this.map.get(key);
    if (n === undefined) return -1;
    this.unlink(n);
    this.addFront(n);                                         // touched -> most recently used
    return n.val;
  }
  put(key, value) {
    let n = this.map.get(key);
    if (n !== undefined) { n.val = value; this.unlink(n); this.addFront(n); return; }
    if (this.map.size === this.capacity) {                    // evict least recently used (just before tail)
      const lru = this.tail.prev;
      this.unlink(lru);
      this.map.delete(lru.key);
    }
    n = { key, val: value, prev: null, next: null };
    this.map.set(key, n);
    this.addFront(n);
  }
  unlink(n) { n.prev.next = n.next; n.next.prev = n.prev; }
  addFront(n) { n.next = this.head.next; n.prev = this.head; this.head.next.prev = n; this.head.next = n; }
}` },
          { lang: 'cpp', code: `// Walkthrough 3 code: LRU cache with O(1) get/put - hash map for lookup + doubly linked list for order.
// std::list is a doubly linked list; the map stores an iterator to each node.
class LRUCache {
    int capacity;
    list<pair<int, int>> order;                                    // front = most recently used
    unordered_map<int, list<pair<int, int>>::iterator> pos;
public:
    LRUCache(int capacity) : capacity(capacity) {}
    int get(int key) {
        auto it = pos.find(key);
        if (it == pos.end()) return -1;
        order.splice(order.begin(), order, it->second);            // touched -> most recently used
        return it->second->second;
    }
    void put(int key, int value) {
        auto it = pos.find(key);
        if (it != pos.end()) {
            it->second->second = value;
            order.splice(order.begin(), order, it->second);
            return;
        }
        if ((int)pos.size() == capacity) {                         // evict least recently used (the back)
            pos.erase(order.back().first);
            order.pop_back();
        }
        order.emplace_front(key, value);
        pos[key] = order.begin();
    }
};` }] }],
    codeTitle: ['Rotting oranges (Python, runnable)', 'LRU cache'],
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
        <p>The key moment: the candidate <b>tested the tricky case "abba"</b> on their own. That one trace is worth more than five easy ones.</p>`, code: { lang: 'java', code: `int lengthOfLongestSubstring(String s) {
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
}`,
        alt: [{ lang: 'python', code: `def length_of_longest_substring(s):
    last = {}                                  # char -> index of its latest occurrence
    left = best = 0
    for right, ch in enumerate(s):
        left = max(left, last.get(ch, -1) + 1) # never move left backwards ("abba")
        last[ch] = right
        best = max(best, right - left + 1)
    return best` },
          { lang: 'js', code: `function lengthOfLongestSubstring(s) {
  const last = new Map();                      // char -> index of its latest occurrence
  let left = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    left = Math.max(left, (last.has(ch) ? last.get(ch) : -1) + 1);   // never move left backwards ("abba")
    last.set(ch, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}` },
          { lang: 'cpp', code: `int lengthOfLongestSubstring(const string& s) {
    vector<int> last(256, -1);                 // char -> index of its latest occurrence
    int left = 0, best = 0;
    for (int right = 0; right < (int)s.size(); right++) {
        unsigned char ch = s[right];
        left = max(left, last[ch] + 1);        // never move left backwards ("abba")
        last[ch] = right;
        best = max(best, right - left + 1);
    }
    return best;
}` }] } },
      { title: 'Walkthrough 3 — Design an LRU cache', html: `<p><b>C:</b> "Both get and put must be O(1). O(1) lookup means a HashMap. O(1) 'move to most recent' and 'remove least recent' means a doubly linked list — I can unlink a node in O(1) if I hold a pointer to it, which the map gives me."</p>
        <p><b>C:</b> "I'll use two sentinel nodes, head and tail, so I never check for null when inserting or removing."</p>
        <p><b>I:</b> "Could you use the library's ordered hash map?" <b>C:</b> "Yes — Java's LinkedHashMap with accessOrder = true and removeEldestEntry overridden, or Python's OrderedDict with move_to_end, gives an LRU in about 10 lines. I'll mention it, but I'll build it by hand since that is what you are assessing. In production I would use the library or Caffeine."</p>
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
      brute: { why: `<p>Simulate minute by minute: scan the whole grid, rot neighbours of rotten cells (using a copy so new rot does not spread in the same minute). Up to R·C minutes × R·C cells = O((R·C)<sup>2</sup>). The waste: rescanning cells that cannot change.</p>`, code: { lang: 'java', code: `int bruteRotting(int[][] grid) {
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
}`, alt: [{ lang: 'python', code: String.raw`
def oranges_rotting(grid):
    R, C, minutes = len(grid), len(grid[0]), 0
    while True:
        nxt = [row[:] for row in grid]
        changed = False
        for r in range(R):
            for c in range(C):
                if grid[r][c] != 2:
                    continue
                for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 1:
                        nxt[nr][nc] = 2
                        changed = True
        if not changed:
            break
        grid = nxt
        minutes += 1
    if any(v == 1 for row in grid for v in row):
        return -1
    return minutes` }, { lang: 'js', code: String.raw`
function orangesRotting(grid) {
  const R = grid.length, C = grid[0].length;
  const dr = [1, -1, 0, 0], dc = [0, 0, 1, -1];
  let minutes = 0;
  while (true) {
    const next = grid.map((row) => row.slice());
    let changed = false;
    for (let r = 0; r < R; r++)
      for (let c = 0; c < C; c++) {
        if (grid[r][c] !== 2) continue;
        for (let d = 0; d < 4; d++) {
          const nr = r + dr[d], nc = c + dc[d];
          if (nr >= 0 && nc >= 0 && nr < R && nc < C && grid[nr][nc] === 1) { next[nr][nc] = 2; changed = true; }
        }
      }
    if (!changed) break;
    grid = next; minutes++;
  }
  for (const row of grid) for (const v of row) if (v === 1) return -1;
  return minutes;
}` }, { lang: 'cpp', code: String.raw`
int orangesRotting(vector<vector<int>> grid) {
    int R = grid.size(), C = grid[0].size(), minutes = 0;
    int dr[4] = {1, -1, 0, 0}, dc[4] = {0, 0, 1, -1};
    while (true) {
        vector<vector<int>> next = grid;
        bool changed = false;
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
    for (auto& row : grid) for (int v : row) if (v == 1) return -1;
    return minutes;
}` }] } },
      mcq: { q: 'Why must the BFS start with ALL rotten oranges in the queue at once?', options: ['They all spread simultaneously, so level k of a multi-source BFS is exactly minute k', 'To save memory', 'Because DFS would be faster otherwise', 'It does not matter; one source at a time gives the same answer'], answer: 0, explain: 'Running BFS from one source at a time would compute distances from that source only; the true minute is the distance to the NEAREST rotten orange, which a multi-source BFS gives directly.' },
      hints: [`<p>Hint 1: The minute a fresh orange rots = its distance to the nearest rotten orange.</p>`, `<p>Hint 2: Multi-source BFS: enqueue every rotten cell first. Process the queue level by level; each level is one minute.</p>`, `<p>Hint 3: Count fresh oranges up front, decrement as they rot. Mark rotten when enqueuing. If fresh &gt; 0 at the end → −1; if fresh was 0 from the start → 0.</p>`],
      tests: { sig: 'int[][] -> int', fn: 'orangesRotting', cases: [
        [[[[2,1,1],[1,1,0],[0,1,1]]],4],
        [[[[2,1,1],[0,1,1],[1,0,1]]],-1],
        [[[[0,2]]],0],
        [[[[1]]],-1],
        [[[[0]]],0],
        [[[[2]]],0],
        [[[[2,2],[1,1],[0,0],[2,0]]],1],
        [[[[1,2]]],1],
        [[[[2,1,1,1,1,1,1,1,1,1]]],9],
        [[[[1,1],[1,1]]],-1],
        [[[[2,1],[2,1],[2,0],[0,2],[2,2]]],1],
        [[[[0,0],[1,0]]],-1],
        [[[[0,0,0,2,2],[2,1,0,2,0],[2,2,1,2,1]]],1],
        [[[[1,0,2,2],[0,0,2,1],[1,0,2,0],[0,2,0,2],[1,0,0,2]]],-1],
        [[{"$rep":[2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],"n":1000}],999],
        [[{"$rep":[2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],"n":300}],299]
      ] },
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
        alt: [{ lang: 'python', code: `from collections import deque

def oranges_rotting(grid):
    R, C = len(grid), len(grid[0])
    q, fresh = deque(), 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] == 2:
                q.append((r, c))               # every rotten orange is a source
            elif grid[r][c] == 1:
                fresh += 1
    minutes = 0
    while q and fresh:
        for _ in range(len(q)):                # one level = one minute
            r, c = q.popleft()
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 1:
                    grid[nr][nc] = 2           # mark at enqueue time
                    fresh -= 1
                    q.append((nr, nc))
        minutes += 1
    return minutes if fresh == 0 else -1` },
          { lang: 'js', code: `function orangesRotting(grid) {
  const R = grid.length, C = grid[0].length;
  let queue = [], fresh = 0;
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++) {
      if (grid[r][c] === 2) queue.push([r, c]);   // every rotten orange is a source
      else if (grid[r][c] === 1) fresh++;
    }
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let minutes = 0;
  while (queue.length > 0 && fresh > 0) {
    const next = [];                               // one level = one minute
    for (const [r, c] of queue) {
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= R || nc >= C || grid[nr][nc] !== 1) continue;
        grid[nr][nc] = 2;                          // mark at enqueue time
        fresh--;
        next.push([nr, nc]);
      }
    }
    queue = next;
    minutes++;
  }
  return fresh === 0 ? minutes : -1;
}` },
          { lang: 'cpp', code: `class Solution {
public:
    int orangesRotting(vector<vector<int>>& grid) {
        int R = grid.size(), C = grid[0].size(), fresh = 0;
        queue<pair<int, int>> q;
        for (int r = 0; r < R; r++)
            for (int c = 0; c < C; c++) {
                if (grid[r][c] == 2) q.push({r, c});   // every rotten orange is a source
                else if (grid[r][c] == 1) fresh++;
            }
        const int dr[] = {1, -1, 0, 0}, dc[] = {0, 0, 1, -1};
        int minutes = 0;
        while (!q.empty() && fresh > 0) {
            for (int size = q.size(); size > 0; size--) {   // one level = one minute
                auto [r, c] = q.front();
                q.pop();
                for (int d = 0; d < 4; d++) {
                    int nr = r + dr[d], nc = c + dc[d];
                    if (nr < 0 || nc < 0 || nr >= R || nc >= C || grid[nr][nc] != 1) continue;
                    grid[nr][nc] = 2;                       // mark at enqueue time
                    fresh--;
                    q.push({nr, nc});
                }
            }
            minutes++;
        }
        return fresh == 0 ? minutes : -1;
    }
};` }],
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
  // Alternative-language versions of the Java panes above (hl keys are Java line numbers).
  var BUGGY_ALT = {
    python: { code: 'lo, hi = 0, n - 1\nwhile lo < hi:\n    mid = (lo + hi) // 2\n    if a[mid] < t: lo = mid\n    else: hi = mid\nreturn lo', map: {} },
    js: { code: 'let lo = 0, hi = n - 1;\nwhile (lo < hi) {\n  const mid = Math.floor((lo + hi) / 2);\n  if (a[mid] < t) lo = mid;\n  else hi = mid;\n}\nreturn lo;', map: {} },
    cpp: { code: 'int lo = 0, hi = n - 1;\nwhile (lo < hi) {\n  int mid = (lo + hi) / 2;\n  if (a[mid] < t) lo = mid;\n  else hi = mid;\n}\nreturn lo;', map: {} } };
  var FIXED_ALT = {
    python: { code: 'lo, hi = 0, n          # answer can be n\nwhile lo < hi:\n    mid = lo + (hi - lo) // 2\n    if a[mid] < t: lo = mid + 1  # mid is too small: skip it\n    else: hi = mid\nreturn lo', map: {} },
    js: { code: 'let lo = 0, hi = n;          // answer can be n\nwhile (lo < hi) {\n  const mid = lo + Math.floor((hi - lo) / 2);\n  if (a[mid] < t) lo = mid + 1; // mid is too small: skip it\n  else hi = mid;\n}\nreturn lo;', map: {} },
    cpp: { code: 'int lo = 0, hi = n;          // answer can be n\nwhile (lo < hi) {\n  int mid = lo + (hi - lo) / 2;\n  if (a[mid] < t) lo = mid + 1; // mid is too small: skip it\n  else hi = mid;\n}\nreturn lo;', map: {} } };
  var MID_ALT = {
    python: { code: 'mid = (lo + hi) // 2        # overflows only in fixed-width ints (Python ints never do)\nmid = lo + (hi - lo) // 2  # safe in every language', map: {} },
    js: { code: 'mid = Math.floor((lo + hi) / 2);        // overflows only in 32-bit ints (JS numbers are doubles)\nmid = lo + Math.floor((hi - lo) / 2);  // safe', map: {} },
    cpp: { code: 'int mid = (lo + hi) / 2;        // can overflow\nint mid = lo + (hi - lo) / 2;  // safe', map: {} } };

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
        ['Aliasing', 'one row object reused for every row (Java <code>Arrays.fill(grid, row)</code>, Python <code>[row] * n</code>, JS <code>new Array(n).fill([])</code>) — every row is the same object; or adding a list to results then mutating it', 'change one cell, print all rows'],
        ['Reference vs value equality', 'Java <code>Integer a == Integer b</code> fails above 127 and <code>String ==</code> compares references; Python <code>is</code>; JS <code>===</code> on arrays and objects; C++ comparing pointers', 'values like 1000'],
        ['Comparator overflow', '<code>a - b</code> as a comparator (Java, C++) with large negatives', 'sort [the smallest 32-bit int, 1]'],
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
` }, { lang: 'java', code: `
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
}`,
        alt: [{ lang: 'python', run: true, code: `import random

# The same stress-test harness: fast solution vs brute force on thousands of tiny random inputs.
def fast(a, t):                                   # lower bound: first index with a[i] >= t
    lo, hi = 0, len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < t:
            lo = mid + 1
        else:
            hi = mid
    return lo

def brute(a, t):
    for i, x in enumerate(a):
        if x >= t:
            return i
    return len(a)

rnd = random.Random(42)
for trial in range(10000):
    n = rnd.randrange(6)                          # include the empty array!
    a = sorted(rnd.randrange(10) for _ in range(n))
    t = rnd.randrange(12) - 1
    if fast(a, t) != brute(a, t):
        print("MISMATCH", a, "t =", t)
        break
else:
    print("all 10000 tiny tests agree")` },
          { lang: 'js', run: true, code: `// The same stress-test harness: fast solution vs brute force on thousands of tiny random inputs.
function fast(a, t) {                             // lower bound: first index with a[i] >= t
  let lo = 0, hi = a.length;
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (a[mid] < t) lo = mid + 1; else hi = mid;
  }
  return lo;
}
function brute(a, t) {
  for (let i = 0; i < a.length; i++) if (a[i] >= t) return i;
  return a.length;
}
// a tiny seeded generator, so a failing run can be repeated exactly
let seed = 42;
const rand = (n) => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return Math.floor(seed / 2147483648 * n); };

let mismatch = null;
for (let trial = 0; trial < 10000 && mismatch === null; trial++) {
  const n = rand(6);                              // include the empty array!
  const a = Array.from({ length: n }, () => rand(10)).sort((x, y) => x - y);
  const t = rand(12) - 1;
  if (fast(a, t) !== brute(a, t)) mismatch = "MISMATCH [" + a + "] t=" + t;
}
console.log(mismatch === null ? "all 10000 tiny tests agree" : mismatch);` },
          { lang: 'cpp', code: `// The same stress-test harness: fast solution vs brute force on thousands of tiny random inputs.
class StressTest {
public:
    static int fast(const vector<int>& a, int t) {      // lower bound: first index with a[i] >= t
        int lo = 0, hi = a.size();
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (a[mid] < t) lo = mid + 1; else hi = mid;
        }
        return lo;
    }
    static int brute(const vector<int>& a, int t) {
        for (int i = 0; i < (int)a.size(); i++) if (a[i] >= t) return i;
        return a.size();
    }
    static void run() {
        mt19937 rnd(42);                                // fixed seed: failures repeat exactly
        for (int trial = 0; trial < 10000; trial++) {
            int n = rnd() % 6;                          // include the empty array!
            vector<int> a(n);
            for (int& x : a) x = rnd() % 10;
            sort(a.begin(), a.end());
            int t = (int)(rnd() % 12) - 1;
            if (fast(a, t) != brute(a, t)) {
                cout << "MISMATCH t=" << t << endl;
                return;
            }
        }
        cout << "all 10000 tiny tests agree" << endl;
    }
};

int main() {
    StressTest::run();
    return 0;
}` }] }],
    codeTitle: ['Stress test finds the bug (Python, runnable)', 'Stress-test harness'],
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
          { type: 'array', label: 'a', values: a, showIdx: true }, { type: 'code', label: 'buggy draft', lang: 'java', code: BUGGY, hl: {}, alt: BUGGY_ALT }
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
            { type: 'code', label: 'buggy draft', lang: 'java', code: BUGGY, hl: { 3: 'cur', 4: goRight ? (repeat ? 'bad' : 'cur') : '', 5: goRight ? '' : 'cur' }, alt: BUGGY_ALT }
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
          { type: 'code', label: 'fixed', lang: 'java', code: FIXED, hl: { 1: 'ok', 4: 'ok' }, alt: FIXED_ALT }
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
      { title: 'Reference equality vs value equality (the Integer cache trap)', html: `<p>In Java, two <code>Integer</code> objects compared with <code>==</code> compare <b>references</b>. Java caches −128..127, so small tests pass and large ones fail — a classic "works on the sample, fails on hidden tests" bug. The same family of slip exists elsewhere: Python <code>is</code> on integers, JavaScript <code>===</code> on arrays or objects, and C++ comparing two C-string pointers. Compare values, not identities.</p>`, code: { lang: 'java', code: `Map<String, Integer> a = new HashMap<>(), b = new HashMap<>();
a.put("x", 1000); b.put("x", 1000);
System.out.println(a.get("x") == b.get("x"));        // false: different Integer objects
System.out.println(a.get("x").equals(b.get("x")));   // true: compares values
System.out.println(a.get("x").intValue() == b.get("x")); // true: unboxed comparison`,
        alt: [{ lang: 'python', run: true, code: `a = int("1000")
b = int("1000")
print(a is b)       # False: two separate int objects (identity)
print(a == b)       # True: compares values` },
          { lang: 'js', run: true, code: `const a = [1000], b = [1000];
console.log(a === b);                        // false: two different array objects (identity)
console.log(a[0] === b[0]);                  // true: numbers compare by value
console.log(JSON.stringify(a) === JSON.stringify(b));   // true: compares contents` },
          { lang: 'cpp', code: `string a = "x", b = "x";
cout << (a.c_str() == b.c_str()) << endl;    // 0 (false): compares the two pointers
cout << (a == b) << endl;                    // 1 (true): string == compares the contents` }] } },
      { title: 'Comparator overflow', html: `<p><code>(x, y) -&gt; x - y</code> looks fine until x = −2,000,000,000 and y = 2,000,000,000: the 32-bit subtraction overflows to a positive number and the sort order flips. Always compare with <code>Integer.compare(x, y)</code> in Java or <code>x &lt; y</code> in C++, and remember that JavaScript needs a comparator at all, because its default sort compares strings.</p>`, code: { lang: 'java', code: `Integer[] v = {2_000_000_000, -2_000_000_000, 0};
Arrays.sort(v, (x, y) -> Integer.compare(x, y));   // safe
System.out.println(Arrays.toString(v));             // [-2000000000, 0, 2000000000]`,
        alt: [{ lang: 'python', run: true, code: `v = [2_000_000_000, -2_000_000_000, 0]
v.sort()                                       # no overflow in Python; never compare with x - y in a 32-bit language
print(v)                                       # [-2000000000, 0, 2000000000]` },
          { lang: 'js', run: true, code: `const v = [2000000000, -2000000000, 0];
v.sort((x, y) => x - y);                       // a comparator is a must: the default sort compares strings
console.log(v);                                // [ -2000000000, 0, 2000000000 ]` },
          { lang: 'cpp', code: `vector<int> v = {2000000000, -2000000000, 0};
sort(v.begin(), v.end(), [](int x, int y) { return x < y; });   // safe; x - y could overflow int
for (int x : v) cout << x << " ";              // -2000000000 0 2000000000
cout << endl;` }] } },
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
      brute: { why: `<p>Linear scan for the first element ≥ target: O(N). Correct and a perfect oracle for testing, but it ignores the sorted order the problem gave us.</p>`, code: { lang: 'java', code: `int searchInsertBrute(int[] nums, int target) {
    for (int i = 0; i < nums.length; i++)
        if (nums[i] >= target) return i;   // first position that is not smaller
    return nums.length;                     // larger than everything: insert at the end
}`, alt: [{ lang: 'python', code: String.raw`
def search_insert(nums, target):
    for i in range(len(nums)):
        if nums[i] >= target:
            return i                                  # first position that is not smaller
    return len(nums)                                  # larger than everything: insert at the end` }, { lang: 'js', code: String.raw`
function searchInsert(nums, target) {
  for (let i = 0; i < nums.length; i++)
    if (nums[i] >= target) return i;                  // first position that is not smaller
  return nums.length;                                 // larger than everything: insert at the end
}` }, { lang: 'cpp', code: String.raw`
int searchInsert(vector<int>& nums, int target) {
    for (int i = 0; i < (int)nums.size(); i++)
        if (nums[i] >= target) return i;              // first position that is not smaller
    return nums.size();                               // larger than everything: insert at the end
}` }] } },
      mcq: { q: 'With nums = [1, 3] and target 2, what happens in the buggy code?', options: ['lo=0, hi=1, mid=0, nums[0] &lt; 2 so lo = 0 again — infinite loop', 'It returns 1 correctly', 'It returns 0', 'It throws ArrayIndexOutOfBounds'], answer: 0, explain: 'lo = mid does not move when mid == lo, which happens whenever only two elements remain.' },
      hints: [`<p>Hint 1: Trace [1,3] with target 2. Does the range [lo, hi] get smaller on every iteration?</p>`, `<p>Hint 2: If nums[mid] &lt; target, mid can never be the answer, so the next range should exclude it: lo = mid + 1.</p>`, `<p>Hint 3: The answer can be N (insert after everything), so the search range must be [0, N]: start hi = nums.length. Recipe: lo=0, hi=N; while lo&lt;hi: mid; if nums[mid] &lt; target: lo=mid+1 else hi=mid; return lo.</p>`],
      tests: { sig: 'int[] int -> int', fn: 'searchInsert', cases: [
        [[[1,3,5,6],5],2],
        [[[1,3,5,6],2],1],
        [[[1,3,5,6],7],4],
        [[[1,3,5,6],0],0],
        [[[1],0],0],
        [[[1],1],0],
        [[[1],2],1],
        [[[1,3],2],1],
        [[[1,3],3],1],
        [[[-10000,10000],-10000],0],
        [[[-10000,10000],10000],1],
        [[[-10000,10000],0],1],
        [[{"$range":[-10000,0]},10000],10000],
        [[{"$range":[-10000,0]},-10000],0],
        [[{"$range":[-10000,0]},-1],9999],
        [[{"$range":[-10000,0]},-5000],5000]
      ] },
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
    lo, hi = 0, len(nums)                  # the answer lies in [0, n]
    while lo < hi:                         # invariant: nums[:lo] < target <= nums[hi:]
        mid = (lo + hi) // 2               # Python ints never overflow
        if nums[mid] < target:
            lo = mid + 1                   # mid is too small: exclude it
        else:
            hi = mid                       # mid might be the answer: keep it
    return lo` },
          { lang: 'js', code: `function searchInsert(nums, target) {
  let lo = 0, hi = nums.length;            // the answer lies in [0, n]
  while (lo < hi) {                        // invariant: nums[0..lo-1] < target <= nums[hi..]
    const mid = lo + ((hi - lo) >> 1);
    if (nums[mid] < target) lo = mid + 1;  // mid is too small: exclude it
    else hi = mid;                         // mid might be the answer: keep it
  }
  return lo;
}` },
          { lang: 'cpp', code: `class Solution {
public:
    int searchInsert(vector<int>& nums, int target) {
        int lo = 0, hi = nums.size();      // the answer lies in [0, n]
        while (lo < hi) {                  // invariant: nums[..lo-1] < target <= nums[hi..]
            int mid = lo + (hi - lo) / 2;  // overflow-safe
            if (nums[mid] < target) lo = mid + 1;   // mid is too small: exclude it
            else hi = mid;                          // mid might be the answer: keep it
        }
        return lo;                         // same as lower_bound(...) - nums.begin()
    }
};` }],
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
        ['Time vs space', 'faster, more memory', 'slower, less memory', 'Hash set duplicate check O(N)/O(N) vs sort + scan O(N log N)/O(1)'],
        ['Preprocess vs per-query', 'build once, answer fast', 'no build, slow answers', 'prefix sums vs re-summing each query'],
        ['Read-heavy vs write-heavy', 'cheap reads, costly updates', 'cheap updates, costly reads', 'prefix sums (O(N) update) vs Fenwick (O(log N) both)'],
        ['Average vs worst case', 'great on average', 'guaranteed bound', 'Hash map / quickselect vs ordered map / heap'],
        ['Simplicity vs optimality', 'short, obviously correct', 'faster, trickier', 'O(N<sup>2</sup>) DP at N = 2000 vs an O(N log N) trick'],
        ['In-place vs copy', 'O(1) extra space', 'input left untouched', 'sorting the caller’s array vs sorting a copy'],
        ['Recursion vs iteration', 'clear code', 'no stack overflow', 'DFS on a 10<sup>5</sup>-deep chain'],
        ['Exact vs approximate', 'exact answer', 'tiny memory, small error', 'Hash set distinct count vs HyperLogLog'],
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
      '"<b>Updates</b> mixed with queries" → balanced structure (Fenwick, segment tree, ordered map such as TreeMap / std::map) over static prefix arrays.',
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
      { title: 'Top K frequent: heap vs bucket sort', html: `<p><b>Heap:</b> count with a hash map (O(N)), keep a min-heap of size k (O(U log k) for U unique values). <b>Bucket sort:</b> frequencies are between 1 and N, so put values into N+1 buckets by frequency and read from the top: O(N) total. Say: "Bucket sort is linear and I'd use it for a one-off batch. If the data were a stream or k were tiny, the heap uses only O(k) extra beyond the counts and supports updates."</p>` },
      { title: 'Recursion vs iteration on a degenerate tree', html: `<p>A "tree" of 10<sup>5</sup> nodes that is really a linked list (every node has only a right child) makes recursive DFS 10<sup>5</sup> frames deep. The default stack often overflows at that depth: Java and JavaScript around 10<sup>4</sup> frames, Python at 1,000, while C++ usually survives on its 8 MB stack but is not guaranteed to. Trade-off: recursion is clearer; an explicit stack is safe. In an interview: write recursion, then say "for very deep inputs I'd convert to an explicit stack" — and show you can.</p>`, code: { lang: 'java', code: `int maxDepthIterative(TreeNode root) {
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
}`,
        alt: [{ lang: 'python', code: `def max_depth_iterative(root):
    if root is None:
        return 0
    stack = [(root, 1)]
    best = 0
    while stack:
        node, d = stack.pop()
        best = max(best, d)
        if node.left:
            stack.append((node.left, d + 1))
        if node.right:
            stack.append((node.right, d + 1))
    return best` },
          { lang: 'js', code: `function maxDepthIterative(root) {
  if (root === null) return 0;
  const stack = [[root, 1]];
  let best = 0;
  while (stack.length > 0) {
    const [node, d] = stack.pop();
    best = Math.max(best, d);
    if (node.left) stack.push([node.left, d + 1]);
    if (node.right) stack.push([node.right, d + 1]);
  }
  return best;
}` },
          { lang: 'cpp', code: `int maxDepthIterative(TreeNode* root) {
    if (!root) return 0;
    vector<pair<TreeNode*, int>> st = {{root, 1}};
    int best = 0;
    while (!st.empty()) {
        auto [node, d] = st.back();
        st.pop_back();
        best = max(best, d);
        if (node->left) st.push_back({node->left, d + 1});
        if (node->right) st.push_back({node->right, d + 1});
    }
    return best;
}` }] } },
      { title: 'Hash map vs ordered map (TreeMap)', html: `${H.table(['need', 'Hash map / dict / Map / unordered_map', 'TreeMap / std::map / sorted list'], [
        ['get / put', 'O(1) average', 'O(log N) guaranteed'],
        ['iterate in key order', H.c('r', 'no'), H.c('g', 'yes')],
        ['"smallest key ≥ x" (ceiling), ranges', H.c('r', 'no'), H.c('g', 'yes: ceilingKey / lower_bound, range views')],
        ['adversarial keys', 'may degrade (Java treeifies buckets → O(log N))', 'unaffected']
      ])}<p>Clue: the moment a question says "the next booking after time t" or "all keys in a range", switch to an ordered map (TreeMap / std::map / sorted list; e.g. My Calendar, time-based key-value store).</p>` },
      { title: 'In-place vs copy: "Remove duplicates from sorted array"', html: `<p>The in-place two-pointer version uses O(1) space but <b>destroys the caller's data</b>. In an interview, ask: "Am I allowed to modify the input?" If yes, in-place; if it's shared (e.g., used by another thread), copy first. Asking this question is itself a trade-off signal interviewers note.</p>` }
    ],
    deepDive: `<p><b>Big-O hides constants — say so when it matters.</b> A Fenwick tree and a segment tree are both O(log N), but Fenwick is ~3× faster and uses half the memory; a segment tree supports more operations (min, max, lazy range updates). Sorting an array of primitives (dual-pivot quicksort) beats a hash map for dedup at moderate N because of cache locality, despite the extra log factor.</p>
      <p><b>Amortised vs worst-case latency.</b> ArrayList append is O(1) amortised, but an individual append can cost O(N) when it resizes. For a latency-sensitive service that occasional spike matters; pre-size the list. Same for hash map rehashing. Mentioning this distinction signals production experience.</p>
      <p><b>Hash flooding.</b> Hash maps are O(1) only on average. An attacker who knows your hash function can force collisions. Java mitigates this by turning long bucket chains into red-black trees (O(log N)); Python randomises string hashes per process. In competitive programming, anti-hash tests target unordered_map in C++.</p>
      <p><b>Space is also time.</b> Using 5×N memory can push data out of CPU caches and slow everything down. A smaller structure (bitset instead of boolean[], int[26] instead of hash map) can be faster despite identical big-O.</p>
      <p><b>Engineering trade-offs beyond Big-O:</b> readability and maintainability, testability, library availability (use <code>PriorityQueue</code>, do not hand-roll a heap in production), and failure modes (recursion depth, overflow). Senior answers mention at least one non-asymptotic factor.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI lists trade-offs fluently — sometimes too fluently, producing generic tables that do not reference <i>your</i> constraints. Interviewers can smell a memorised list. The value you add is <b>tying each trade-off to the numbers in this problem</b>.</p>
      <p><b>Practise with:</b> <code>Give me two solutions to this problem with different trade-offs. Then argue for each one as if you were a different engineer. Then ask me which I would ship given N = 10^6 and 10^5 updates per second.</code></p>
      <p><b>Where AI goes wrong:</b> claims like "quickselect is O(N)" without the average-case caveat, or "a hash map is always faster than an ordered map". Correcting those nuances is exactly the depth interviewers probe.</p>
      <p><b>What you must own:</b> the decision. AI can enumerate options; the engineer chooses one, defends it with the constraints, and owns the downside. In system-level follow-ups ("what if this runs on 100 machines?") that judgement is the whole interview.</p>`,
    problems: [{
      title: 'Trade-off Design: Two Sum Data Structure', level: 'Easy', tags: ['design', 'hashing', 'trade-offs'], companies: ['LinkedIn', 'Meta'],
      statement: `<p>Design a class with two operations: <code>add(number)</code> stores a number, and <code>find(value)</code> returns true if any <b>two stored numbers</b> (different entries, possibly equal values) sum to <code>value</code>.</p><p>There are two natural designs with opposite costs. Implement one and explain when you would pick the other.</p>`,
      constraints: `−10<sup>5</sup> ≤ number ≤ 10<sup>5</sup>, −2<sup>31</sup> ≤ value ≤ 2<sup>31</sup> − 1, up to 10<sup>4</sup> calls total`,
      example: `<p>add(1), add(3), add(5); find(4) → <b>${H.c('g', 'true')}</b> (1 + 3); find(7) → <b>${H.c('r', 'false')}</b>; add(3) then find(6) → <b>${H.c('g', 'true')}</b> (3 + 3 uses two different entries).</p>`,
      brute: { why: `<p>Store numbers in a list; find checks every pair: O(1) add, O(N<sup>2</sup>) find. The waste: for each number we search linearly for its complement instead of looking it up.</p>`, code: { lang: 'java', code: `class TwoSumBrute {
    private final List<Integer> nums = new ArrayList<>();
    public void add(int number) { nums.add(number); }
    public boolean find(int value) {
        for (int i = 0; i < nums.size(); i++)
            for (int j = i + 1; j < nums.size(); j++)
                if ((long) nums.get(i) + nums.get(j) == value) return true;
        return false;
    }
}`, alt: [{ lang: 'python', code: String.raw`
class TwoSumBrute:
    def __init__(self):
        self.nums = []

    def add(self, number):
        self.nums.append(number)

    def find(self, value):
        for i in range(len(self.nums)):
            for j in range(i + 1, len(self.nums)):
                if self.nums[i] + self.nums[j] == value:
                    return True
        return False` }, { lang: 'js', code: String.raw`
class TwoSumBrute {
  constructor() {
    this.nums = [];
  }

  add(number) { this.nums.push(number); }

  find(value) {
    for (let i = 0; i < this.nums.length; i++)
      for (let j = i + 1; j < this.nums.length; j++)
        if (this.nums[i] + this.nums[j] === value) return true;
    return false;
  }
}` }, { lang: 'cpp', code: String.raw`
class TwoSumBrute {
    vector<int> nums;

public:
    void add(int number) { nums.push_back(number); }

    bool find(int value) {
        for (int i = 0; i < (int)nums.size(); i++)
            for (int j = i + 1; j < (int)nums.size(); j++)
                if ((long long)nums[i] + nums[j] == value) return true;
        return false;
    }
};` }] } },
      mcq: { q: 'The workload is 1 million find calls and only 100 add calls. Which design fits best?', options: ['Precompute all pair sums into a hash set on add: add O(N), find O(1)', 'Count map: add O(1), find O(N)', 'Keep a sorted list and two-pointer on every find', 'Brute force pairs'], answer: 0, explain: 'Read-heavy workload → pay at write time. With only 100 adds, the set holds at most ~5000 sums and every find is O(1).' },
      hints: [`<p>Hint 1: For find, you need "is value − x present?" for some stored x — a hash map lookup.</p>`, `<p>Hint 2: Store counts, not just presence: value 6 with a single 3 stored must return false; with two 3s, true.</p>`, `<p>Hint 3: Opposite design: on add, insert number + every existing number into a "sums" set → O(N) add, O(1) find. Pick by read/write ratio.</p>`],
      tests: { cls: 'TwoSum', sigs: {TwoSum: '',add: 'int -> void',find: 'int -> bool'}, cases: [
        {"ops":["TwoSum","add","add","add","find","find","add","find"],"args":[[],[1],[3],[5],[4],[7],[3],[6]],"out":[null,null,null,null,true,false,null,true]},
        {"ops":["TwoSum","find"],"args":[[],[0]],"out":[null,false]},
        {"ops":["TwoSum","add","find","add","find"],"args":[[],[3],[6],[3],[6]],"out":[null,null,false,null,true]},
        {"ops":["TwoSum","add","find","add","find"],"args":[[],[0],[0],[0],[0]],"out":[null,null,false,null,true]},
        {"ops":["TwoSum","add","add","find","find","find"],"args":[[],[-100000],[100000],[0],[-200000],[200000]],"out":[null,null,null,true,false,false]},
        {"ops":["TwoSum","add","add","find","find","find"],"args":[[],[100000],[100000],[200000],[2147483647],[-2147483648]],"out":[null,null,null,true,false,false]},
        {"ops":["TwoSum","add","find","find","add","find","find"],"args":[[],[5],[10],[5],[-5],[0],[10]],"out":[null,null,false,false,null,true,false]},
        {"ops":["TwoSum","add","add","find","find","add","find"],"args":[[],[1],[2],[3],[-3],[2],[4]],"out":[null,null,null,true,false,null,true]},
        {"ops":["TwoSum","add","find","find","find","find","add","find","find","find","add","find","add","find","find","find","find","find","add","add","add","add","add","add","add","add","add","add","add","add","add","add","add","find","find","add","find","add","add","find","find","add","find","find","add","find","find","add","add","find","find","add","add","add","add","add","add","add","add","find","add","add","add","add","find","add","find","find","add","add","find","find","find","add","add","add","add","find","find","add","add","add","add","find","add","add","find","add","find","add","find","add","find","find","add","find","add","find","find","find","find","find","find","find","find","add","add","find","add","add","find","add","add","find","add","add","find","find","find","add","add","add","add","add","add","add","add","find","add","find","add","add","find","find","find","add","find","add","find","add","find","add","add","find","find","add","add","add","find","add","find","find","add","find","find","add","add","find","find","add","find","find","add","add","add","find","add","add","add","add","add","add","add","add","add","find","add","add","find","find","add","find","add","find","find","add","find","add","add","find","add","find","add","find","find","find","find","add","find","find","find","add","add","add","add","add","add","add","add","find","find","add","find","add","add","add","add","add","add","add","add","add","find","add","add","add","add","find","add","add","find","add","add","add","find","add","add","add","find","find","find","add","add","add","add","find","find","find","find","add","add","add","add","find","add","find","find","add","add","find","find","find","find","find","add","add","add","find","find","add","find","add","add","add","find","add","find","add","add","find","add","add","find","add","add","find","add","find","add","find","find","find","find","add","add","find","find","add","add","add","add"],"args":[[],[-11],[-59],[49],[-45],[-36],[21],[29],[-12],[55],[4],[31],[-19],[1],[-15],[-31],[-59],[-7],[-4],[-12],[-25],[12],[-13],[18],[-8],[8],[13],[2],[-30],[1],[20],[27],[-13],[-27],[19],[-23],[34],[17],[-26],[-41],[-58],[-8],[-56],[52],[-6],[36],[-24],[-17],[7],[10],[-4],[-15],[-12],[11],[-9],[5],[-15],[6],[21],[-25],[17],[16],[-30],[14],[21],[-1],[22],[-5],[-9],[29],[-16],[16],[4],[-25],[1],[18],[-21],[-40],[-32],[-30],[16],[-5],[-14],[-21],[-16],[4],[-4],[16],[53],[30],[9],[-3],[-50],[-49],[-8],[-16],[13],[-35],[-32],[-25],[42],[29],[-52],[-33],[-45],[16],[4],[-47],[18],[29],[47],[-29],[-30],[60],[14],[9],[19],[-50],[25],[-21],[-8],[-16],[-20],[0],[-28],[6],[-8],[-57],[12],[-29],[28],[1],[29],[8],[-60],[0],[-2],[5],[-40],[-22],[-37],[-27],[-2],[-31],[-8],[21],[-15],[21],[34],[-2],[20],[-50],[27],[-28],[-10],[-3],[-16],[43],[55],[-5],[-7],[51],[-30],[-1],[-29],[-10],[0],[3],[17],[-20],[22],[8],[14],[17],[11],[-49],[4],[-30],[27],[-52],[-9],[-10],[-5],[-15],[14],[-2],[9],[18],[19],[60],[6],[26],[-16],[57],[-59],[-48],[-36],[17],[-12],[49],[22],[13],[11],[22],[-15],[30],[15],[2],[-2],[-58],[7],[26],[15],[-20],[3],[-10],[18],[16],[-5],[4],[-8],[6],[-31],[8],[24],[13],[-22],[29],[-15],[7],[-55],[10],[-8],[22],[-46],[3],[-23],[-29],[-18],[58],[23],[26],[8],[4],[-11],[-5],[-42],[34],[-9],[4],[-18],[-15],[-28],[33],[-8],[-18],[23],[25],[-29],[-27],[20],[-12],[-30],[-14],[2],[18],[-17],[57],[-33],[14],[28],[-7],[-13],[-15],[-18],[6],[24],[0],[19],[-56],[26],[18],[29],[21],[-5],[-47],[26],[8],[-2],[44],[37],[-48],[-8],[-23],[-8],[-44],[-18],[-21],[-1],[23],[25]],"out":[null,null,false,false,false,false,null,false,false,false,null,false,null,false,true,false,false,true,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,true,true,null,true,null,null,true,false,null,true,false,null,false,true,null,null,true,true,null,null,null,null,null,null,null,null,true,null,null,null,null,true,null,true,true,null,null,true,true,true,null,null,null,null,true,true,null,null,null,null,true,null,null,true,null,false,null,true,null,true,true,null,true,null,true,true,true,true,true,false,true,true,null,null,true,null,null,true,null,null,false,null,null,true,true,true,null,null,null,null,null,null,null,null,true,null,true,null,null,true,true,true,null,true,null,true,null,true,null,null,true,true,null,null,null,true,null,true,true,null,true,true,null,null,true,true,null,true,true,null,null,null,true,null,null,null,null,null,null,null,null,null,true,null,null,true,true,null,true,null,true,true,null,true,null,null,false,null,true,null,true,true,true,true,null,true,true,true,null,null,null,null,null,null,null,null,true,true,null,true,null,null,null,null,null,null,null,null,null,true,null,null,null,null,true,null,null,true,null,null,null,true,null,null,null,true,true,true,null,null,null,null,true,true,true,true,null,null,null,null,true,null,true,true,null,null,true,true,true,true,true,null,null,null,true,true,null,true,null,null,null,true,null,true,null,null,true,null,null,true,null,null,true,null,true,null,true,true,true,true,null,null,true,true,null,null,null,null]}
      ] },
      solution: {
        approach: `<p><b>Write-cheap design (implemented):</b> hash map value → count. add O(1); find iterates distinct keys, O(U). <b>Read-cheap design:</b> maintain a hash set of all pairwise sums; add costs O(N) and memory O(N<sup>2</sup>), find is O(1). Choose by the ratio of adds to finds — and by memory: N<sup>2</sup> sums is 10<sup>8</sup> for N = 10<sup>4</sup>, which is too much.</p>`,
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
        alt: [{ lang: 'python', code: `from collections import Counter

class TwoSum:
    def __init__(self):
        self.count = Counter()

    def add(self, number):
        self.count[number] += 1                # O(1): write-cheap

    def find(self, value):
        for key, c in self.count.items():
            other = value - key                # Python ints never overflow
            if other == key:
                if c >= 2:
                    return True                # same value needs two entries
            elif other in self.count:
                return True
        return False` },
          { lang: 'js', code: `class TwoSum {
  constructor() {
    this.count = new Map();
  }
  add(number) {
    this.count.set(number, (this.count.get(number) || 0) + 1);   // O(1): write-cheap
  }
  find(value) {
    for (const [key, c] of this.count) {
      const other = value - key;               // exact: values stay far below 2^53
      if (other === key) {
        if (c >= 2) return true;               // same value needs two entries
      } else if (this.count.has(other)) {
        return true;
      }
    }
    return false;
  }
}` },
          { lang: 'cpp', code: `class TwoSum {
    unordered_map<int, int> count;
public:
    TwoSum() {}
    void add(int number) {
        count[number]++;                           // O(1): write-cheap
    }
    bool find(int value) {
        for (const auto& [key, c] : count) {
            long long need = (long long)value - key;   // long long: value - key can overflow int
            if (need < INT_MIN || need > INT_MAX) continue;
            int other = (int)need;
            if (other == key) {
                if (c >= 2) return true;           // same value needs two entries
            } else if (count.count(other)) {
                return true;
            }
        }
        return false;
    }
};` }],
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
        ['int overflow', '<code>int sum</code>, <code>a * b</code> with values to 10<sup>9</sup>', '<code>long</code> / <code>long long</code>, cast before multiplying (Python and <code>BigInt</code> avoid it)'],
        ['Negative modulo (Java, C++, JavaScript)', '<code>-7 % 3 == -1</code> (Python gives 2)', '<code>((x % m) + m) % m</code>'],
        ['Off-by-one', '<code>i &lt;= n</code>, missing last window', 'test sizes 0, 1, 2'],
        ['Wrong initial value', '<code>max = 0</code> with all-negative input', 'start from the first element or MIN_VALUE'],
        ['Modifying a collection while iterating', '<code>ConcurrentModificationException</code> in Java; skipped elements in Python and JS', 'iterator.remove() or collect then remove'],
        ['String concatenation in a loop', 'O(N<sup>2</sup>) copying', 'a string builder (<code>StringBuilder</code>, <code>"".join(parts)</code>, <code>parts.join("")</code>, <code>std::string +=</code>)'],
        ['Shared mutable result', '<code>res.add(path)</code> in backtracking', 'copy it: <code>res.add(new ArrayList&lt;&gt;(path))</code>, <code>res.append(path[:])</code>, <code>res.push([...path])</code>'],
        ['Deep recursion', 'StackOverflowError / RecursionError / RangeError at depth ~10<sup>3</sup>–10<sup>5</sup>', 'iterative version / explicit stack']
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
    code: [{ lang: 'java', code: `
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
}`,
        alt: [{ lang: 'python', run: true, code: `# A gallery of classic slips and their fixes. Python ints never overflow, so a helper
# imitates a 32-bit int to show what happens in Java, C++ and (with |0) JavaScript.
def i32(x):
    x &= 0xFFFFFFFF
    return x - (1 << 32) if x >= (1 << 31) else x

# 1) Overflow in the midpoint
lo, hi = 2_000_000_000, 2_100_000_000
bad_mid = i32(lo + hi) // 2               # lo + hi overflows a 32-bit int -> negative
good_mid = lo + (hi - lo) // 2            # never exceeds hi
print("bad mid =", bad_mid, ", good mid =", good_mid)

# 2) Negative modulo: C-like languages give -1, Python's % is already non-negative
x, m = -7, 3
c_like = x - m * int(x / m)               # remainder that keeps the sign of the dividend
print("-7 % 3 =", c_like, ", fixed =", ((c_like % m) + m) % m)

# 3) Product overflow: in a 32-bit language, cast BEFORE multiplying
a = b = 100_000
wrong = i32(a * b)                        # multiplied as a 32-bit int, already wrapped
right = a * b
print("wrong =", wrong, ", right =", right)

# 4) Greedy coin change fails for coins {1, 3, 4}, amount 6
amount, greedy_count = 6, 0
for c in [4, 3, 1]:
    while amount >= c:
        amount -= c
        greedy_count += 1
print("greedy uses", greedy_count, "coins, but 3 + 3 uses 2")` },
          { lang: 'js', run: true, code: `// A gallery of classic slips and their fixes. JavaScript numbers are doubles, so |0 imitates
// a 32-bit int and Math.imul multiplies like one.

// 1) Overflow in the midpoint (what a 32-bit int language does)
const lo = 2000000000, hi = 2100000000;
const badMid = ((lo + hi) | 0) / 2;       // |0 wraps the sum to 32 bits -> negative
const goodMid = lo + Math.floor((hi - lo) / 2);   // never exceeds hi
console.log("bad mid = " + badMid + ", good mid = " + goodMid);

// 2) Negative modulo: % keeps the sign of the dividend
const x = -7, m = 3;
console.log("-7 % 3 = " + (x % m) + ", fixed = " + (((x % m) + m) % m));

// 3) Product overflow: a 32-bit multiply wraps, a double multiply does not (until 2^53)
const a = 100000, b = 100000;
const wrong = Math.imul(a, b);            // 32-bit wrap
const right = a * b;                      // exact here, but use BigInt past 2^53
console.log("wrong = " + wrong + ", right = " + right);

// 4) Greedy coin change fails for coins {1, 3, 4}, amount 6
let amount = 6, greedyCount = 0;
for (const c of [4, 3, 1]) while (amount >= c) { amount -= c; greedyCount++; }
console.log("greedy uses " + greedyCount + " coins, but 3 + 3 uses 2");` },
          { lang: 'cpp', code: `// A gallery of classic slips and their fixes. Signed int overflow is undefined behaviour in C++,
// so the slips are shown by wrapping through unsigned arithmetic, which is well defined.
class MistakeGallery {
public:
    static int wrap(long long v) { return (int)(unsigned int)v; }   // keep the low 32 bits

    static void run() {
        // 1) Overflow in the midpoint
        int lo = 2000000000, hi = 2100000000;
        int badMid = wrap((long long)lo + hi) / 2;     // the 32-bit sum wraps -> negative
        int goodMid = lo + (hi - lo) / 2;              // never exceeds hi
        cout << "bad mid = " << badMid << ", good mid = " << goodMid << endl;

        // 2) Negative modulo
        int x = -7, m = 3;
        cout << "-7 % 3 = " << (x % m) << ", fixed = " << (((x % m) + m) % m) << endl;

        // 3) Product overflow: cast BEFORE multiplying
        int a = 100000, b = 100000;
        long long wrong = wrap((long long)a * b);      // what a 32-bit multiply would give
        long long right = (long long)a * b;
        cout << "wrong = " << wrong << ", right = " << right << endl;

        // 4) Greedy coin change fails for coins {1, 3, 4}, amount 6
        int coins[] = {4, 3, 1};
        int amount = 6, greedyCount = 0;
        for (int c : coins) while (amount >= c) { amount -= c; greedyCount++; }
        cout << "greedy uses " << greedyCount << " coins, but 3 + 3 uses 2" << endl;
    }
};

int main() {
    MistakeGallery::run();
    return 0;
}` }] }],
    codeTitle: ['Mistake gallery'],
    viz: {
      title: 'Mistake replay: overflow, negative mod and a greedy that lies',
      input: '2000000000 2100000000',
      inputLabel: 'lo hi (two whole numbers up to 2147483647)',
      gen: function (input) {
        var v = parseNums(input, 2, 2, 0, 2147483647, 'lo and hi');
        var lo = v[0], hi = v[1];
        if (lo > hi) throw new Error('lo must be ≤ hi');
        var frames = [];
        frames.push({ narr: 'Mistake #1 — <b>overflow</b>. lo = ' + lo + ', hi = ' + hi + '. A 32-bit <code>int</code> (Java, C++) has 32 bits; the largest value is 2,147,483,647 (bit 31 is the sign bit).', parts: [
          { type: 'bits', label: 'lo', value: lo, width: 32 }, { type: 'bits', label: 'hi', value: hi, width: 32 }
        ] });
        var sum = to32(lo + hi), over = lo + hi > 2147483647;
        frames.push({ narr: '<code>lo + hi</code> = ' + (lo + hi) + (over ? ' — too big! The carry lands in the <b>sign bit</b>, so a 32-bit int sees <span class="c-r">' + sum + '</span>.' : ' — fits this time, but only by luck of the input.'), parts: [
          { type: 'bits', label: 'lo + hi as int', value: sum >>> 0, width: 32, hl: over ? { 31: 'bad' } : {} },
          { type: 'vars', vals: { 'true sum': lo + hi, 'int sum': sum }, hl: { 'int sum': over ? 'bad' : 'ok' } }
        ] });
        var badMid = to32(sum / 2), goodMid = lo + Math.floor((hi - lo) / 2);
        frames.push({ narr: '(lo + hi) / 2 = <b>' + badMid + '</b>' + (over ? ' → a negative index → ArrayIndexOutOfBounds, or a binary search that runs off into nonsense.' : '.') + ' The safe form <code>lo + (hi − lo) / 2</code> = <b>' + goodMid + '</b> never exceeds hi. Habit: always write it the safe way.', parts: [
          { type: 'vars', vals: { 'bad mid': badMid, 'good mid': goodMid }, hl: { 'bad mid': over ? 'bad' : '', 'good mid': 'ok' } },
          { type: 'code', lang: 'java', code: 'int mid = (lo + hi) / 2;        // can overflow\nint mid = lo + (hi - lo) / 2;  // safe', hl: { 1: over ? 'bad' : '', 2: 'ok' }, alt: MID_ALT }
        ] });
        frames.push({ narr: 'Mistake #2 — <b>negative modulo</b>. In Java, C++ and JavaScript, <code>-7 % 3</code> is <span class="c-r">−1</span>, not 2 (the Python <code>%</code> operator already gives 2). If you use it as an array index or hash bucket, you crash. Fix: <code>((x % m) + m) % m</code> = 2.', parts: [
          { type: 'table', label: 'x % 3 in Java / C++ / JS vs math', columns: ['x', 'Java / C++ / JS x % 3', 'fixed ((x%3)+3)%3'], rows: [[-7, -1, 2], [-6, 0, 0], [-5, -2, 1], [5, 2, 2]], hl: { 0: 'bad', 2: 'bad' } }
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
      { title: 'String building in a loop', html: `<p><code>s = s + c</code> inside a loop copies the whole string each time: 1 + 2 + … + N = O(N<sup>2</sup>) characters copied. For N = 10<sup>5</sup> that is 5·10<sup>9</sup> — TLE disguised as an O(N) algorithm.</p>`, code: { lang: 'java', code: `StringBuilder sb = new StringBuilder();
for (int i = 0; i < 5; i++) sb.append(i).append(',');  // amortised O(1) per append
System.out.println(sb);  // 0,1,2,3,4,`,
        alt: [{ lang: 'python', run: true, code: `parts = []
for i in range(5):
    parts.append(f"{i},")                      # amortised O(1) per append
print("".join(parts))                          # 0,1,2,3,4,` },
          { lang: 'js', run: true, code: `const parts = [];
for (let i = 0; i < 5; i++) parts.push(i + ",");   // amortised O(1) per push
console.log(parts.join(""));                        // 0,1,2,3,4,` },
          { lang: 'cpp', code: `string sb;
for (int i = 0; i < 5; i++) sb += to_string(i) + ',';   // amortised O(1) per append
cout << sb << endl;                                     // 0,1,2,3,4,` }] } },
      { title: 'DP state missing a dimension: stock with cooldown', html: `<p>Defining <code>dp[i]</code> = best profit up to day i is not enough: whether you may buy on day i depends on whether you <b>hold a stock</b> and whether you <b>sold yesterday</b>. Two different situations share one cell → wrong answers. Fix: states hold / sold / rest (DSA 19). The check: "Does the future depend on anything not stored in my state?" If yes, add it.</p>` }
    ],
    deepDive: `<p><b>Why the same slips repeat.</b> Under stress the brain falls back on the most practised pattern ("windows solve subarray problems") and skips verification. The fix is not more knowledge but <b>cheap checks inserted at fixed points</b>: after choosing a pattern (counter-check table), after writing a loop (sizes 0/1/2), before saying done (edge case trace).</p>
      <p><b>Proof sketches kill pattern mistakes.</b> Greedy needs an exchange argument ("any optimal solution can be changed to include my greedy choice without getting worse"). Binary search on the answer needs monotonicity. Dijkstra needs non-negative weights. DP needs a state that captures everything the future depends on (the Markov property). If you cannot sketch the proof in two sentences, test with a small counterexample.</p>
      <p><b>Overflow arithmetic in detail.</b> 32-bit ints (Java, and C++ in practice) wrap modulo 2<sup>32</sup> silently, and in C++ signed overflow is formally undefined behaviour. Python ints never overflow, and JavaScript numbers are doubles that lose exactness past 2<sup>53</sup> (use <code>BigInt</code>). In Java, <code>Math.addExact</code> / <code>Math.multiplyExact</code> throw on overflow — useful while testing. When computing modular products, cast to a 64-bit type (<code>long</code> / <code>long long</code>) before multiplying: (10<sup>9</sup>+6)<sup>2</sup> ≈ 10<sup>18</sup> fits in a long (max ≈ 9.2·10<sup>18</sup>), but the sum of two such products does not.</p>
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
      brute: { why: `<p>Every start, extend to every end, track the product: O(N<sup>2</sup>) = 4·10<sup>8</sup> at the max size. The waste: we never reuse the best/worst product ending at the previous index.</p>`, code: { lang: 'java', code: `int bruteMaxProduct(int[] nums) {
    int best = nums[0];                         // not 0: all-negative inputs exist
    for (int i = 0; i < nums.length; i++) {
        long prod = 1;
        for (int j = i; j < nums.length; j++) {
            prod *= nums[j];
            best = (int) Math.max(best, prod);
        }
    }
    return best;
}`, alt: [{ lang: 'python', code: String.raw`
def max_product(nums):
    best = nums[0]                                    # not 0: all-negative inputs exist
    for i in range(len(nums)):
        prod = 1
        for j in range(i, len(nums)):
            prod *= nums[j]
            best = max(best, prod)
    return best` }, { lang: 'js', code: String.raw`
function maxProduct(nums) {
  let best = nums[0];                                 // not 0: all-negative inputs exist
  for (let i = 0; i < nums.length; i++) {
    let prod = 1;
    for (let j = i; j < nums.length; j++) {
      prod *= nums[j];
      best = Math.max(best, prod);
    }
  }
  return best;
}` }, { lang: 'cpp', code: String.raw`
int maxProduct(vector<int>& nums) {
    int best = nums[0];                               // not 0: all-negative inputs exist
    for (int i = 0; i < (int)nums.size(); i++) {
        long long prod = 1;
        for (int j = i; j < (int)nums.size(); j++) {
            prod *= nums[j];
            best = (int)max((long long)best, prod);
        }
    }
    return best;
}` }] } },
      mcq: { q: 'Why do we track the MINIMUM product ending at each index too?', options: ['A very negative product times a negative number becomes the new maximum', 'To handle zeros only', 'To make the code shorter', 'Because the answer could be negative'], answer: 0, explain: 'min × (negative) can jump to the top. Tracking both lets a sign flip promote the old minimum to the new maximum.' },
      hints: [`<p>Hint 1: Kadane tracks the best sum ending here. For products, a negative number swaps the roles of the best and worst.</p>`, `<p>Hint 2: Keep curMax and curMin ending at i. New values come from {x, curMax·x, curMin·x}.</p>`, `<p>Hint 3: Compute both new values from the OLD pair (use temporaries). Initialise everything with nums[0], not 0 or 1. Zero naturally resets because x itself is a candidate.</p>`],
      tests: { sig: 'int[] -> int', fn: 'maxProduct', cases: [
        [[[2,3,-2,4]],6],
        [[[-2,0,-1]],0],
        [[[-2,3,-4]],24],
        [[[0]],0],
        [[[-2]],-2],
        [[[0,2]],2],
        [[[-3,-1,-1]],3],
        [[[2,-5,-2,-4,3]],24],
        [[[0,0,-1]],0],
        [[[-1,0,-1,0,-2]],0],
        [[[1,1,1]],1],
        [[[-10,10,10,10,10,10,10,10,10,10]],1000000000],
        [[[10,10,10,-10,-10,8,10,10,10,-10,10]],800000000],
        [[[10,1,-10,5,10,-10,10,-10,10,-5,-10]],250000000],
        [[[8,10,10,10,10,-10,-10,10,10,1,-4]],800000000],
        [[[0,-1,1]],1],
        [[[-2,3,2,2,-3,-1,1]],72],
        [[[-2,-3,0,-1,-3]],6],
        [[[1,-2,3]],3],
        [[{"$rep":-1,"n":20000}],1],
        [[{"$rep":-1,"n":19999}],1],
        [[{"$rep":1,"n":20000}],1],
        [[{"$concat":[{"$rep":2,"n":30},[-1]]}],1073741824]
      ] },
      solution: {
        approach: `<p>Kadane variant (DSA 5 + DSA 19 state-machine flavour): two states per index — the largest and smallest product of a subarray ending here. A negative x swaps their roles; a zero resets both to 0, and the next element restarts fresh via the "x alone" candidate.</p>`,
        code: `class Solution {
    public int maxProduct(int[] nums) {
        // long: the answer fits an int, but curMin can be about 10x larger than that
        long curMax = nums[0], curMin = nums[0], best = nums[0]; // start from a real element
        for (int i = 1; i < nums.length; i++) {
            long x = nums[i];
            long a = curMax * x, b = curMin * x;         // both from the OLD values
            curMax = Math.max(x, Math.max(a, b));        // x alone = restart (handles zeros)
            curMin = Math.min(x, Math.min(a, b));
            best = Math.max(best, curMax);
        }
        return (int) best;
    }
}`,
        alt: [{ lang: 'python', code: `def max_product(nums):
    cur_max = cur_min = best = nums[0]         # start from a real element
    for x in nums[1:]:
        a, b = cur_max * x, cur_min * x        # both from the OLD values
        cur_max = max(x, a, b)                 # x alone = restart (handles zeros)
        cur_min = min(x, a, b)
        best = max(best, cur_max)
    return best` },
          { lang: 'js', code: `function maxProduct(nums) {
  // products stay below about 2e10, far under 2^53, so plain numbers are exact
  let curMax = nums[0], curMin = nums[0], best = nums[0];   // start from a real element
  for (let i = 1; i < nums.length; i++) {
    const x = nums[i];
    const a = curMax * x, b = curMin * x;      // both from the OLD values
    curMax = Math.max(x, a, b);                // x alone = restart (handles zeros)
    curMin = Math.min(x, a, b);
    best = Math.max(best, curMax);
  }
  return best;
}` },
          { lang: 'cpp', code: `class Solution {
public:
    int maxProduct(vector<int>& nums) {
        // long long: curMin can be about 10x larger than any int answer
        long long curMax = nums[0], curMin = nums[0], best = nums[0];   // start from a real element
        for (size_t i = 1; i < nums.size(); i++) {
            long long x = nums[i];
            long long a = curMax * x, b = curMin * x;   // both from the OLD values
            curMax = max({x, a, b});                    // x alone = restart (handles zeros)
            curMin = min({x, a, b});
            best = max(best, curMax);
        }
        return (int)best;
    }
};` }],
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
    code: [{ lang: 'java', code: `
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
}`,
        alt: [{ lang: 'python', run: true, code: `# Python toolkit check: you should be able to write every line below without looking anything up.
import bisect
import heapq
from collections import Counter, defaultdict, deque

stack = []                                   # a list is a stack: append / pop at the end
stack.append(1); stack[-1]; stack.pop()
queue = deque()                              # never list.pop(0): it is O(n)
queue.append(1); queue[0]; queue.popleft()

min_by_first = []                            # heapq is a MIN-heap; tuples compare element by element
heapq.heappush(min_by_first, (3, 7))
max_heap = []                                # for a max-heap, push the negated value
heapq.heappush(max_heap, -5)

groups = defaultdict(list)
groups["a"].append(1)                        # grouping idiom
freq = Counter()
freq[42] += 1                                # counting idiom

keys = [10, 20]                              # a sorted list + bisect plays the role of a TreeMap
i = bisect.bisect_left(keys, 15)
ceil = keys[i] if i < len(keys) else None    # 20: smallest key >= 15
j = bisect.bisect_right(keys, 15)
floor = keys[j - 1] if j > 0 else None       # 10: largest key <= 15

intervals = [[5, 6], [1, 3]]
intervals.sort(key=lambda p: p[0])           # sort by a key; no subtraction comparator needed

grid = [[-1] * 4 for _ in range(3)]          # a comprehension: [[-1] * 4] * 3 would share ONE row

chars = list("abc")
chars.reverse(); chars.append("d"); chars[0] = "z"
sb = "".join(chars)                          # build strings from a list, not with += in a loop

big = 2147483647 * 2                         # Python ints never overflow
mod = 1_000_000_007
m = (-7 % 3 + 3) % 3                         # Python's % is already non-negative
print(ceil, floor, sb, big, m, mod)` },
          { lang: 'js', run: true, code: `// JavaScript toolkit check: you should be able to write every line below without looking anything up.

// JS has no built-in heap: keep a small MinHeap class like this one.
class MinHeap {
  constructor(less) { this.a = []; this.less = less || ((x, y) => x < y); }
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(v) {
    const a = this.a;
    a.push(v);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

const stack = [];                            // an array is a stack: push / pop at the end
stack.push(1); stack[stack.length - 1]; stack.pop();
const queue = [];                            // never shift() in a loop: it is O(n). Use a read index.
queue.push(1); let head = 0; queue[head++];

const minByFirst = new MinHeap((a, b) => a[0] < b[0]);
const maxHeap = new MinHeap((a, b) => a > b);   // flip the comparator for a max-heap
minByFirst.push([3, 7]); maxHeap.push(5);

const groups = new Map();
if (!groups.has("a")) groups.set("a", []);
groups.get("a").push(1);                     // grouping idiom
const freq = new Map();
freq.set(42, (freq.get(42) || 0) + 1);       // counting idiom

const keys = [10, 20];                       // a sorted array + binary search plays the role of a TreeMap
const lowerBound = (arr, x) => { let lo = 0, hi = arr.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] < x) lo = mid + 1; else hi = mid; } return lo; };
const i = lowerBound(keys, 15);
const ceil = i < keys.length ? keys[i] : null;       // 20: smallest key >= 15
const floor = i > 0 ? keys[i - 1] : null;           // 10: largest key <= 15

const intervals = [[5, 6], [1, 3]];
intervals.sort((a, b) => a[0] - b[0]);       // always pass a comparator: the default sort compares strings

const grid = Array.from({ length: 3 }, () => new Array(4).fill(-1));   // fill(-1) on the outer array would share ONE row

const chars = "abc".split("");
chars.reverse(); chars.push("d"); chars[0] = "z";
const sb = chars.join("");

const big = 2147483647n * 2n;                // BigInt: Number is exact only up to 2^53
const mod = 1000000007;
const m = ((-7 % 3) + 3) % 3;                // % keeps the sign of the dividend
console.log(ceil, floor, sb, String(big), m, mod);` },
          { lang: 'cpp', code: `// C++ toolkit check: you should be able to write every line below without looking anything up.
class CppToolkit {
public:
    static void toolkit() {
        stack<int> st;                                   // adapters: stack / queue over deque
        st.push(1); st.top(); st.pop();
        queue<int> qu;
        qu.push(1); qu.front(); qu.pop();

        priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> minByFirst;   // MIN-heap by (first, second)
        priority_queue<int> maxHeap;                     // the default is a MAX-heap
        minByFirst.push({3, 7}); maxHeap.push(5);

        unordered_map<string, vector<int>> groups;
        groups["a"].push_back(1);                        // grouping idiom
        unordered_map<int, int> freq;
        freq[42]++;                                      // counting idiom

        map<int, string> tm;                             // ordered map (a balanced tree), O(log n)
        tm[10] = "x"; tm[20] = "y";
        auto ceilIt = tm.lower_bound(15);                // first key >= 15 -> 20
        auto floorIt = tm.upper_bound(15);               // first key > 15, step back -> 10
        int ceilKey = ceilIt->first;
        int floorKey = (--floorIt)->first;

        vector<vector<int>> intervals = {{5, 6}, {1, 3}};
        sort(intervals.begin(), intervals.end(), [](const auto& a, const auto& b) { return a[0] < b[0]; });   // never a[0] - b[0]

        vector<vector<int>> grid(3, vector<int>(4, -1)); // every row is its own vector

        string sb = "abc";
        reverse(sb.begin(), sb.end()); sb += 'd'; sb[0] = 'z';

        long long big = (long long)INT_MAX * 2;          // cast before multiply: signed overflow is undefined
        int mod = 1'000'000'007;
        long long m = ((-7 % 3) + 3) % 3;                // % keeps the sign of the dividend
        cout << ceilKey << " " << floorKey << " " << sb << " " << big << " " << m << " " << mod << endl;
    }
};

int main() {
    CppToolkit::toolkit();
    return 0;
}` }] }],
    codeTitle: ['Toolkit you must know cold'],
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
      { title: 'Complexity cheat sheet for the standard collections', html: `${H.table(['structure', 'add', 'remove', 'lookup', 'notes'], [
        ['dynamic array (ArrayList / list / Array / vector)', 'O(1) amortised (end)', 'O(N) (middle)', 'O(1) by index', 'contains is O(N)'],
        ['deque (ArrayDeque / collections.deque / std::deque)', 'O(1) both ends', 'O(1) both ends', '—', 'use for stacks and queues'],
        ['hash map / set (hash map / dict, set / Map, Set / unordered_map)', 'O(1) avg', 'O(1) avg', 'O(1) avg', 'no order'],
        ['ordered map / set (TreeMap / sorted list + bisect / std::map)', 'O(log N)', 'O(log N)', 'O(log N)', 'floor/ceiling/range'],
        ['heap (PriorityQueue / heapq / priority_queue / your own MinHeap in JS)', 'O(log N)', 'O(log N) poll; O(N) remove(obj)', 'O(1) peek', 'not sorted when iterated'],
        ['insertion-ordered map (LinkedHashMap / OrderedDict / Map)', 'O(1)', 'O(1)', 'O(1)', 'insertion/access order → LRU']
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

  // =====================================================================
  // PRACTICE — a mixed, timed set: diagnose the pattern before you solve
  // =====================================================================
  practice.push({
    title: 'Best Time to Buy and Sell Stock', level: 'Easy', tags: ['carry forward', 'running minimum', 'arrays'], companies: ['Amazon', 'Meta', 'Goldman Sachs'],
    statement: `<p><b>Timed: 10 min.</b> <code>prices[i]</code> is a stock price on day i. Buy on one day and sell on a <b>later</b> day to maximise profit. Return the max profit, or 0 if no profit is possible.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, 0 ≤ prices[i] ≤ 10<sup>4</sup>`,
    example: `${H.arr([7, 1, 5, 3, 6, 4], { hl: { 1: 'g', 4: 'g' } })}<p>Buy at ${H.c('g', '1')} (day 1), sell at ${H.c('g', '6')} (day 4) → profit <b>5</b>. Selling at 7 is not allowed: day 0 comes before the purchase.</p>`,
    brute: { why: `<p>Every buy day × every later sell day: O(N<sup>2</sup>) = 5·10<sup>9</sup> at N = 10<sup>5</sup> → TLE. The waste: for each sell day we re-find the cheapest earlier price.</p>`, code: { lang: 'java', code: `int maxProfitBrute(int[] p) {
    int best = 0;
    for (int i = 0; i < p.length; i++)
        for (int j = i + 1; j < p.length; j++)
            best = Math.max(best, p[j] - p[i]);
    return best;
}`, alt: [{ lang: 'python', code: String.raw`
def max_profit(prices):
    best = 0
    for i in range(len(prices)):
        for j in range(i + 1, len(prices)):
            best = max(best, prices[j] - prices[i])
    return best` }, { lang: 'js', code: String.raw`
function maxProfit(prices) {
  let best = 0;
  for (let i = 0; i < prices.length; i++)
    for (let j = i + 1; j < prices.length; j++)
      best = Math.max(best, prices[j] - prices[i]);
  return best;
}` }, { lang: 'cpp', code: String.raw`
int maxProfit(vector<int>& prices) {
    int best = 0;
    for (int i = 0; i < (int)prices.size(); i++)
        for (int j = i + 1; j < (int)prices.size(); j++)
            best = max(best, prices[j] - prices[i]);
    return best;
}` }] } },
    mcq: { q: 'Which single value do you need to carry forward while scanning left to right?', options: ['The minimum price seen so far', 'The maximum price seen so far', 'The sum of prices so far', 'The previous day price only'], answer: 0, explain: 'Selling today, the best buy is the cheapest earlier day — carry the running minimum (DSA 5, carry forward).' },
    hints: [`<p>Hint 1: If you sell on day j, the best buy day is the cheapest day before j.</p>`, `<p>Hint 2: Keep <code>minSoFar</code> while scanning; profit today = price − minSoFar.</p>`, `<p>Hint 3: Initialise minSoFar = prices[0], best = 0 (never negative). Update best before or after min — both work because selling on the buy day gives 0.</p>`],
    tests: { sig: 'int[] -> int', fn: 'maxProfit', cases: [
      [[[7,1,5,3,6,4]],5],
      [[[7,6,4,3,1]],0],
      [[[5]],0],
      [[[0]],0],
      [[[1,2]],1],
      [[[2,1]],0],
      [[[3,3,3]],0],
      [[[2,4,1]],2],
      [[[3,2,6,5,0,3]],4],
      [[[10000,0,10000]],10000],
      [[[4,8,17,9]],13],
      [[[12,18,3,13]],10],
      [[[15,11,7,14]],7],
      [[{"$concat":[{"$rep":0,"n":50000},{"$rep":10000,"n":50000}]}],10000],
      [[{"$range":[10000,0,-1]}],0],
      [[{"$concat":[{"$range":[10000,0,-1]},{"$rep":10000,"n":80000}]}],9999]
    ] },
    solution: {
      approach: `<p><b>Clue:</b> "buy before sell" + one transaction → carry forward the running minimum. One pass.</p>`,
      code: `class Solution {
    public int maxProfit(int[] prices) {
        int minSoFar = prices[0], best = 0;
        for (int p : prices) {
            minSoFar = Math.min(minSoFar, p);     // cheapest buy up to today
            best = Math.max(best, p - minSoFar);  // sell today
        }
        return best;
    }
}`,
      alt: [{ lang: 'python', code: `def max_profit(prices):
    min_so_far, best = prices[0], 0
    for p in prices:
        min_so_far = min(min_so_far, p)        # cheapest buy up to today
        best = max(best, p - min_so_far)       # sell today
    return best` },
        { lang: 'js', code: `function maxProfit(prices) {
  let minSoFar = prices[0], best = 0;
  for (const p of prices) {
    minSoFar = Math.min(minSoFar, p);          // cheapest buy up to today
    best = Math.max(best, p - minSoFar);       // sell today
  }
  return best;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int minSoFar = prices[0], best = 0;
        for (int p : prices) {
            minSoFar = min(minSoFar, p);       // cheapest buy up to today
            best = max(best, p - minSoFar);    // sell today
        }
        return best;
    }
};` }],
      dry: { head: ['day', 'price', 'minSoFar', 'best'], rows: [['0', '7', '7', '0'], ['1', '1', '1', '0'], ['2', '5', '1', '4'], ['4', '6', '1', H.c('g', '5')]] },
      complexity: `<p>Time O(N), space O(1).</p>`,
      followUps: ['Unlimited transactions (sum every rise).', 'At most k transactions (state-machine DP, DSA 19).', 'With a cooldown day after selling.']
    }
  });

  practice.push({
    title: 'Contains Duplicate Within Distance K', level: 'Easy', tags: ['sliding window', 'hashset'], companies: ['Airbnb', 'Palantir'],
    statement: `<p><b>Timed: 10 min.</b> Return true if there are two <b>different</b> indices i and j with <code>nums[i] == nums[j]</code> and <code>|i − j| ≤ k</code>.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, −10<sup>9</sup> ≤ nums[i] ≤ 10<sup>9</sup>, 0 ≤ k ≤ 10<sup>5</sup>`,
    example: `${H.arr([1, 2, 3, 1], { hl: { 0: 'g', 3: 'g' } })}<p>k = 3 → <b>${H.c('g', 'true')}</b> (indices 0 and 3, distance 3). With [1,2,3,1,2,3] and k = 2 → <b>false</b>: equal values are always 3 apart.</p>`,
    brute: { why: `<p>For each i check the next k elements: O(N·k) = 10<sup>10</sup> worst case. The waste: neighbouring windows share k−1 elements, but we re-check them all.</p>`, code: { lang: 'java', code: `boolean bruteNearby(int[] nums, int k) {
    for (int i = 0; i < nums.length; i++)
        for (int j = i + 1; j < nums.length && j - i <= k; j++)
            if (nums[i] == nums[j]) return true;
    return false;
}`, alt: [{ lang: 'python', code: String.raw`
def contains_nearby_duplicate(nums, k):
    for i in range(len(nums)):
        j = i + 1
        while j < len(nums) and j - i <= k:
            if nums[i] == nums[j]:
                return True
            j += 1
    return False` }, { lang: 'js', code: String.raw`
function containsNearbyDuplicate(nums, k) {
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length && j - i <= k; j++)
      if (nums[i] === nums[j]) return true;
  return false;
}` }, { lang: 'cpp', code: String.raw`
bool containsNearbyDuplicate(vector<int>& nums, int k) {
    for (int i = 0; i < (int)nums.size(); i++)
        for (int j = i + 1; j < (int)nums.size() && j - i <= k; j++)
            if (nums[i] == nums[j]) return true;
    return false;
}` }] } },
    mcq: { q: 'Which pattern fits "two equal values at most k apart"?', options: ['A fixed-size sliding window kept in a hash set', 'Sorting then two pointers', 'Binary search', 'Prefix sums'], answer: 0, explain: 'Only the last k values matter; keep them in a set, drop the one leaving the window. Sorting loses the index distances.' },
    hints: [`<p>Hint 1: At index i, only nums[i−k .. i−1] can pair with nums[i].</p>`, `<p>Hint 2: Keep exactly those values in a hash set; set.add returns false on a duplicate.</p>`, `<p>Hint 3: After adding nums[i], if the set size exceeds k, remove nums[i−k]. k = 0 → always false.</p>`],
    tests: { sig: 'int[] int -> bool', fn: 'containsNearbyDuplicate', cases: [
      [[[1,2,3,1],3],true],
      [[[1,0,1,1],1],true],
      [[[1,2,3,1,2,3],2],false],
      [[[7],0],false],
      [[[5,5],0],false],
      [[[5,5],1],true],
      [[[1000000000,-1000000000,1000000000],2],true],
      [[[1000000000,-1000000000,1000000000],1],false],
      [[[1,2,1],0],false],
      [[[0,0],100000],true],
      [[[-1,-1],1],true],
      [[[4,2,2,2,2,0,2],0],false],
      [[[0,5,1,0,1,3,2,5,2],3],true],
      [[[3,5,5,3],2],true],
      [[{"$range":[0,100000]},100000],false],
      [[{"$concat":[{"$range":[0,99999]},[0]]},99999],true],
      [[{"$concat":[{"$range":[0,99999]},[0]]},99998],false],
      [[{"$rep":3,"n":100000},0],false],
      [[{"$rep":3,"n":100000},100000],true]
    ] },
    solution: {
      approach: `<p><b>Clue:</b> "within distance k" = fixed-size window; "equal value" = membership test → hash set window (DSA 6 + DSA 8).</p>`,
      code: `class Solution {
    public boolean containsNearbyDuplicate(int[] nums, int k) {
        Set<Integer> window = new HashSet<>();
        for (int i = 0; i < nums.length; i++) {
            if (!window.add(nums[i])) return true;   // already inside the last k values
            if (window.size() > k) window.remove(nums[i - k]); // slide: drop the oldest
        }
        return false;
    }
}`,
      alt: [{ lang: 'python', code: `def contains_nearby_duplicate(nums, k):
    window = set()
    for i, x in enumerate(nums):
        if x in window:
            return True                        # already inside the last k values
        window.add(x)
        if len(window) > k:
            window.remove(nums[i - k])         # slide: drop the oldest
    return False` },
        { lang: 'js', code: `function containsNearbyDuplicate(nums, k) {
  const window = new Set();
  for (let i = 0; i < nums.length; i++) {
    if (window.has(nums[i])) return true;      // already inside the last k values
    window.add(nums[i]);
    if (window.size > k) window.delete(nums[i - k]);   // slide: drop the oldest
  }
  return false;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    bool containsNearbyDuplicate(vector<int>& nums, int k) {
        unordered_set<int> window;
        for (int i = 0; i < (int)nums.size(); i++) {
            if (!window.insert(nums[i]).second) return true;   // already inside the last k values
            if ((int)window.size() > k) window.erase(nums[i - k]);   // slide: drop the oldest
        }
        return false;
    }
};` }],
      complexity: `<p>Time O(N) average, space O(min(N, k)).</p>`,
      followUps: ['Values within t of each other (|nums[i] − nums[j]| ≤ t): use TreeSet floor/ceiling or buckets of width t+1.']
    }
  });

  practice.push({
    title: 'Valid Parentheses', level: 'Easy', tags: ['stack', 'strings'], companies: ['Amazon', 'Bloomberg', 'Microsoft'],
    statement: `<p><b>Timed: 10 min.</b> Given a string of <code>()[]{}</code>, return true if every opener is closed by the same type in the correct order.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>4</sup>, only the six bracket characters`,
    example: `<p>"([]{})" → <b>${H.c('g', 'true')}</b>. "([)]" → <b>${H.c('r', 'false')}</b>: ")" arrives while "[" is the most recent unclosed opener.</p>`,
    brute: { why: `<p>Repeatedly delete adjacent pairs "()", "[]", "{}" until nothing changes: up to N/2 passes of O(N) each → O(N<sup>2</sup>). The waste: rescanning the whole string after every deletion.</p>`, code: { lang: 'java', code: `boolean bruteValid(String s) {
    String prev;
    do {
        prev = s;
        s = s.replace("()", "").replace("[]", "").replace("{}", "");
    } while (!s.equals(prev));
    return s.isEmpty();
}`, alt: [{ lang: 'python', code: String.raw`
def is_valid(s):
    while True:
        prev = s
        s = s.replace("()", "").replace("[]", "").replace("{}", "")
        if s == prev:
            break
    return s == ""` }, { lang: 'js', code: String.raw`
function isValid(s) {
  let prev;
  do {
    prev = s;
    s = s.split("()").join("").split("[]").join("").split("{}").join("");   // delete every adjacent pair
  } while (s !== prev);
  return s.length === 0;
}` }, { lang: 'cpp', code: String.raw`
bool isValid(string s) {
    auto eraseAll = [](string t, const string& pat) {
        size_t p;
        while ((p = t.find(pat)) != string::npos) t.erase(p, pat.size());
        return t;
    };
    string prev;
    do {
        prev = s;
        s = eraseAll(eraseAll(eraseAll(s, "()"), "[]"), "{}");
    } while (s != prev);
    return s.empty();
}` }] } },
    mcq: { q: '"Each closer must match the most recent unmatched opener" describes which structure?', options: ['Stack (LIFO)', 'Queue (FIFO)', 'Heap', 'Hash set'], answer: 0, explain: '"Most recent" = last in, first out.' },
    hints: [`<p>Hint 1: The closer always matches the latest unclosed opener.</p>`, `<p>Hint 2: Push openers; on a closer, the top must be its partner — pop it.</p>`, `<p>Hint 3: Fail if the stack is empty on a closer, or non-empty at the end. Quick reject: odd length.</p>`],
    tests: { sig: 'string -> bool', fn: 'isValid', cases: [
      [["()"],true],
      [["()[]{}"],true],
      [["(]"],false],
      [["([)]"],false],
      [["{[]}"],true],
      [["("],false],
      [["))"],false],
      [["((()))"],true],
      [["(()"],false],
      [["{[()]}"],true],
      [["}{"],false],
      [["["],false],
      [["]["],false],
      [["([]{})"],true],
      [["(((((((("],false],
      [[")("],false],
      [["(][})["],false],
      [["{{]}{}()["],false],
      [["({"],false],
      [[{"$concat":[{"$rep":"(","n":5000},{"$rep":")","n":5000}]}],true],
      [[{"$rep":"(","n":10000}],false],
      [[{"$concat":[{"$rep":"[","n":4999},{"$rep":"]","n":4999},"{}"]}],true],
      [[{"$concat":[{"$rep":"{","n":5000},{"$rep":"}","n":4999},"("]}],false]
    ] },
    solution: {
      approach: `<p><b>Clue:</b> nesting / "most recent" → stack (DSA 14). Pushing the <i>expected closer</i> makes the check a single comparison.</p>`,
      code: `class Solution {
    public boolean isValid(String s) {
        if (s.length() % 2 == 1) return false;
        Deque<Character> st = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(') st.push(')');          // push the closer we now expect
            else if (c == '[') st.push(']');
            else if (c == '{') st.push('}');
            else if (st.isEmpty() || st.pop() != c) return false;
        }
        return st.isEmpty();
    }
}`,
      alt: [{ lang: 'python', code: `def is_valid(s):
    if len(s) % 2:
        return False
    closer = {'(': ')', '[': ']', '{': '}'}
    stack = []
    for c in s:
        if c in closer:
            stack.append(closer[c])            # push the closer we now expect
        elif not stack or stack.pop() != c:
            return False
    return not stack` },
        { lang: 'js', code: `function isValid(s) {
  if (s.length % 2 === 1) return false;
  const closer = { '(': ')', '[': ']', '{': '}' };
  const stack = [];
  for (const c of s) {
    if (c in closer) stack.push(closer[c]);    // push the closer we now expect
    else if (stack.length === 0 || stack.pop() !== c) return false;
  }
  return stack.length === 0;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    bool isValid(string s) {
        if (s.size() % 2) return false;
        stack<char> st;
        for (char c : s) {
            if (c == '(') st.push(')');        // push the closer we now expect
            else if (c == '[') st.push(']');
            else if (c == '{') st.push('}');
            else if (st.empty() || st.top() != c) return false;
            else st.pop();
        }
        return st.empty();
    }
};` }],
      complexity: `<p>Time O(N), space O(N).</p>`,
      followUps: ['Minimum insertions to make it valid.', 'Longest valid parentheses substring (stack of indices or DP).']
    }
  });

  practice.push({
    title: 'Missing Number', level: 'Easy', tags: ['bit manipulation', 'xor', 'math'], companies: ['Microsoft', 'Apple'],
    statement: `<p><b>Timed: 10 min.</b> An array holds N <b>distinct</b> numbers from the range 0..N (so exactly one is missing). Return the missing number using O(1) extra space.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>4</sup>, 0 ≤ nums[i] ≤ N, all distinct`,
    example: `${H.arr([3, 0, 1])}<p>N = 3, range 0..3, the array lacks <b>${H.c('g', '2')}</b>.</p>`,
    brute: { why: `<p>For each candidate 0..N, scan the array for it: O(N<sup>2</sup>). Or a hash set: O(N) time but O(N) space, which breaks the O(1)-space requirement.</p>`, code: { lang: 'java', code: `int missingBrute(int[] nums) {
    for (int c = 0; c <= nums.length; c++) {
        boolean found = false;
        for (int x : nums) if (x == c) { found = true; break; }
        if (!found) return c;
    }
    return -1;
}`, alt: [{ lang: 'python', code: String.raw`
def missing_number(nums):
    for c in range(len(nums) + 1):
        found = False
        for x in nums:
            if x == c:
                found = True
                break
        if not found:
            return c
    return -1` }, { lang: 'js', code: String.raw`
function missingNumber(nums) {
  for (let c = 0; c <= nums.length; c++) {
    let found = false;
    for (const x of nums) if (x === c) { found = true; break; }
    if (!found) return c;
  }
  return -1;
}` }, { lang: 'cpp', code: String.raw`
int missingNumber(vector<int>& nums) {
    for (int c = 0; c <= (int)nums.size(); c++) {
        bool found = false;
        for (int x : nums) if (x == c) { found = true; break; }
        if (!found) return c;
    }
    return -1;
}` }] } },
    mcq: { q: 'XOR of all indices 0..N and all array values leaves…', options: ['the missing number, because every present number cancels with its twin', '0 always', 'the largest value', 'the sum of the array'], answer: 0, explain: 'x ^ x = 0 and x ^ 0 = x (DSA 4). Every number except the missing one appears twice.' },
    hints: [`<p>Hint 1: "Every value appears in two lists except one" is the XOR-cancellation signature.</p>`, `<p>Hint 2: XOR together i for i in 0..N and every nums[i].</p>`, `<p>Hint 3: Alternative: N(N+1)/2 − sum(nums) — fine here, but mention overflow for big N; XOR never overflows.</p>`],
    tests: { sig: 'int[] -> int', fn: 'missingNumber', cases: [
      [[[3,0,1]],2],
      [[[0,1]],2],
      [[[9,6,4,2,3,5,7,0,1]],8],
      [[[1]],0],
      [[[0]],1],
      [[[2,0]],1],
      [[[1,2]],0],
      [[[0,2,3,1,5]],4],
      [[[4,3,2,1]],0],
      [[{"$range":[0,10000]}],10000],
      [[{"$range":[1,10001]}],0],
      [[{"$concat":[{"$range":[0,5000]},{"$range":[5001,10001]}]}],5000],
      [[{"$concat":[{"$range":[10000,5000,-1]},{"$range":[0,5000]}]}],5000]
    ] },
    solution: {
      approach: `<p><b>Clue:</b> "exactly one missing/odd one out" + O(1) space → XOR cancellation (DSA 4).</p>`,
      code: `class Solution {
    public int missingNumber(int[] nums) {
        int x = nums.length;                 // start with N (the index loop below stops at N-1)
        for (int i = 0; i < nums.length; i++) x ^= i ^ nums[i];
        return x;
    }
}`,
      alt: [{ lang: 'python', code: `def missing_number(nums):
    x = len(nums)                              # start with N (the loop below stops at N-1)
    for i, v in enumerate(nums):
        x ^= i ^ v                             # equal pairs cancel out
    return x` },
        { lang: 'js', code: `function missingNumber(nums) {
  let x = nums.length;                         // start with N (the loop below stops at N-1)
  for (let i = 0; i < nums.length; i++) x ^= i ^ nums[i];   // equal pairs cancel out
  return x;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int missingNumber(vector<int>& nums) {
        int x = nums.size();                   // start with N (the loop below stops at N-1)
        for (int i = 0; i < (int)nums.size(); i++) x ^= i ^ nums[i];   // equal pairs cancel out
        return x;
    }
};` }],
      dry: { head: ['i', 'nums[i]', 'x after i ^ nums[i]'], rows: [['start', '—', '3'], ['0', '3', '3^0^3 = 0'], ['1', '0', '0^1^0 = 1'], ['2', '1', '1^2^1 = ' + H.c('g', '2')]] },
      complexity: `<p>Time O(N), space O(1).</p>`,
      followUps: ['Two numbers missing (split by a set bit of the XOR, like Single Number III).', 'Find the duplicate in 1..N with one repeat (Floyd cycle detection on indices).']
    }
  });

  practice.push({
    title: 'Top K Frequent Elements', level: 'Medium', tags: ['hashmap', 'bucket sort', 'heap'], companies: ['Amazon', 'Meta', 'Yelp'],
    statement: `<p><b>Timed: 20 min.</b> Return the <code>k</code> most frequent elements of <code>nums</code> in any order. The answer is guaranteed unique. Beat O(N log N).</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, −10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>, 1 ≤ k ≤ number of distinct values`,
    example: `<p>[1,1,1,2,2,3], k = 2 → <b>${H.c('g', '[1, 2]')}</b>: 1 appears 3 times, 2 twice, 3 once.</p>`,
    brute: { why: `<p>Count, then sort all distinct values by frequency: O(N + U log U). Fine in practice, but the follow-up asks for better than O(N log N). The waste: we fully order values whose relative order we never need.</p>`, code: { lang: 'java', code: `int[] topKBrute(int[] nums, int k) {
    Map<Integer, Integer> cnt = new HashMap<>();
    for (int x : nums) cnt.merge(x, 1, Integer::sum);
    List<Integer> keys = new ArrayList<>(cnt.keySet());
    keys.sort((a, b) -> Integer.compare(cnt.get(b), cnt.get(a)));   // full sort: O(U log U)
    int[] res = new int[k];
    for (int i = 0; i < k; i++) res[i] = keys.get(i);
    return res;
}`, alt: [{ lang: 'python', code: String.raw`
def top_k_frequent(nums, k):
    cnt = {}
    for x in nums:
        cnt[x] = cnt.get(x, 0) + 1
    keys = sorted(cnt, key=lambda x: -cnt[x])         # full sort: O(U log U)
    return keys[:k]` }, { lang: 'js', code: String.raw`
function topKFrequent(nums, k) {
  const cnt = new Map();
  for (const x of nums) cnt.set(x, (cnt.get(x) || 0) + 1);
  const keys = [...cnt.keys()];
  keys.sort((a, b) => cnt.get(b) - cnt.get(a));       // full sort: O(U log U)
  return keys.slice(0, k);
}` }, { lang: 'cpp', code: String.raw`
vector<int> topKFrequent(vector<int>& nums, int k) {
    unordered_map<int, int> cnt;
    for (int x : nums) cnt[x]++;
    vector<int> keys;
    for (auto& [v, c] : cnt) keys.push_back(v);
    sort(keys.begin(), keys.end(), [&](int a, int b) { return cnt[a] > cnt[b]; });   // full sort: O(U log U)
    return vector<int>(keys.begin(), keys.begin() + k);
}` }] } },
    mcq: { q: 'Frequencies lie in 1..N. Which trick gives O(N) total?', options: ['Bucket sort: bucket[f] = values with frequency f, read from high f down', 'Binary search on k', 'Two pointers on the sorted array', 'Union-Find'], answer: 0, explain: 'A bounded key range (1..N) allows counting/bucket sort in linear time.' },
    hints: [`<p>Hint 1: First count frequencies with a hash map.</p>`, `<p>Hint 2: Either keep a min-heap of size k keyed by frequency (O(U log k)) or bucket by frequency (O(N)).</p>`, `<p>Hint 3: Buckets: array of lists of size N+1. Walk f from N down to 1, collecting until you have k values.</p>`],
    tests: { sig: 'int[] int -> int[]', fn: 'topKFrequent', cmp: 'set', cases: [
      [[[1,1,1,2,2,3],2],[1,2]],
      [[[1],1],[1]],
      [[[1,2],2],[1,2]],
      [[[-1,-1,2,2,2,3],1],[2]],
      [[[4,4,4,4,5,5,5,6,6,7],3],[4,5,6]],
      [[[10000,-10000,10000],1],[10000]],
      [[[0,0,0,1,1,2],3],[0,1,2]],
      [[[5,3,5,3,5,3,5],2],[5,3]],
      [[{"$concat":[{"$rep":5,"n":60000},{"$rep":-10000,"n":40000}]},1],[5]],
      [[{"$concat":[{"$rep":5,"n":60000},{"$rep":-10000,"n":40000}]},2],[5,-10000]],
      [[{"$concat":[{"$rep":7,"n":50000},{"$range":[-10000,0]},{"$range":[1,10001]}]},1],[7]]
    ] },
    solution: {
      approach: `<p><b>Clue:</b> "top k" → heap; "frequencies bounded by N" → bucket sort beats it. Mention both (trade-off: heap works for streams, buckets are linear for batches).</p>`,
      code: `class Solution {
    @SuppressWarnings("unchecked")
    public int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> cnt = new HashMap<>();
        for (int x : nums) cnt.merge(x, 1, Integer::sum);
        List<Integer>[] bucket = new List[nums.length + 1];   // bucket[f] = values seen f times
        for (Map.Entry<Integer, Integer> e : cnt.entrySet()) {
            int f = e.getValue();
            if (bucket[f] == null) bucket[f] = new ArrayList<>();
            bucket[f].add(e.getKey());
        }
        int[] res = new int[k];
        int idx = 0;
        for (int f = nums.length; f >= 1 && idx < k; f--) {
            if (bucket[f] == null) continue;
            for (int v : bucket[f]) { if (idx == k) break; res[idx++] = v; }
        }
        return res;
    }
}`,
      alt: [{ lang: 'python', code: `from collections import Counter

def top_k_frequent(nums, k):
    cnt = Counter(nums)
    bucket = [[] for _ in range(len(nums) + 1)]   # bucket[f] = values seen f times
    for value, f in cnt.items():
        bucket[f].append(value)
    res = []
    for f in range(len(nums), 0, -1):
        for value in bucket[f]:
            res.append(value)
            if len(res) == k:
                return res
    return res` },
        { lang: 'js', code: `function topKFrequent(nums, k) {
  const cnt = new Map();
  for (const x of nums) cnt.set(x, (cnt.get(x) || 0) + 1);
  const bucket = Array.from({ length: nums.length + 1 }, () => []);   // bucket[f] = values seen f times
  for (const [value, f] of cnt) bucket[f].push(value);
  const res = [];
  for (let f = nums.length; f >= 1 && res.length < k; f--) {
    for (const value of bucket[f]) {
      if (res.length === k) break;
      res.push(value);
    }
  }
  return res;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<int> topKFrequent(vector<int>& nums, int k) {
        unordered_map<int, int> cnt;
        for (int x : nums) cnt[x]++;
        vector<vector<int>> bucket(nums.size() + 1);   // bucket[f] = values seen f times
        for (auto& [value, f] : cnt) bucket[f].push_back(value);
        vector<int> res;
        for (int f = nums.size(); f >= 1 && (int)res.size() < k; f--)
            for (int value : bucket[f]) {
                if ((int)res.size() == k) break;
                res.push_back(value);
            }
        return res;
    }
};` }],
      complexity: `<p>Time O(N), space O(N). Heap alternative: O(N + U log k) time, O(U + k) space.</p>`,
      followUps: ['Stream of values: maintain top k as data arrives.', 'Top k frequent words with alphabetical tie-break.']
    }
  });

  practice.push({
    title: 'Number of Islands', level: 'Medium', tags: ['grid', 'bfs', 'dfs', 'flood fill'], companies: ['Amazon', 'Google', 'Microsoft'],
    statement: `<p><b>Timed: 20 min.</b> A grid of '1' (land) and '0' (water). An island is land connected up/down/left/right. Count the islands.</p>`,
    constraints: `1 ≤ R, C ≤ 300`,
    example: `<p>["11000","11000","00100","00011"] → <b>${H.c('g', '3')}</b>: the top-left block, the single middle cell and the bottom-right pair.</p>`,
    brute: { why: `<p>For every pair of land cells, test whether they are connected by a fresh search, then count classes: O((R·C)<sup>2</sup>) or worse. The waste: re-exploring the same island again and again.</p>`, code: { lang: 'java', code: `int bruteIslands(char[][] g) {
    int R = g.length, C = g[0].length, n = R * C;
    int[] label = new int[n];
    Arrays.fill(label, -1);
    int islands = 0;
    for (int s = 0; s < n; s++) {
        if (g[s / C][s % C] != '1' || label[s] != -1) continue;
        islands++;
        // naive: repeatedly sweep the grid, growing the label until nothing changes
        label[s] = islands;
        boolean changed = true;
        while (changed) {
            changed = false;
            for (int c = 0; c < n; c++) {
                if (label[c] != islands) continue;
                int r = c / C, col = c % C;
                int[][] nb = {{r + 1, col}, {r - 1, col}, {r, col + 1}, {r, col - 1}};
                for (int[] p : nb) {
                    if (p[0] < 0 || p[1] < 0 || p[0] >= R || p[1] >= C) continue;
                    int id = p[0] * C + p[1];
                    if (g[p[0]][p[1]] == '1' && label[id] == -1) { label[id] = islands; changed = true; }
                }
            }
        }
    }
    return islands;
}`, alt: [{ lang: 'python', code: String.raw`
def num_islands(grid):
    R, C = len(grid), len(grid[0])
    n = R * C
    label = [-1] * n
    islands = 0
    for s in range(n):
        if grid[s // C][s % C] != '1' or label[s] != -1:
            continue
        islands += 1
        # naive: repeatedly sweep the grid, growing the label until nothing changes
        label[s] = islands
        changed = True
        while changed:
            changed = False
            for c in range(n):
                if label[c] != islands:
                    continue
                r, col = divmod(c, C)
                for pr, pc in ((r + 1, col), (r - 1, col), (r, col + 1), (r, col - 1)):
                    if pr < 0 or pc < 0 or pr >= R or pc >= C:
                        continue
                    ident = pr * C + pc
                    if grid[pr][pc] == '1' and label[ident] == -1:
                        label[ident] = islands
                        changed = True
    return islands` }, { lang: 'js', code: String.raw`
function numIslands(g) {
  const R = g.length, C = g[0].length, n = R * C;
  const label = new Array(n).fill(-1);
  let islands = 0;
  for (let s = 0; s < n; s++) {
    if (g[Math.floor(s / C)][s % C] !== '1' || label[s] !== -1) continue;
    islands++;
    // naive: repeatedly sweep the grid, growing the label until nothing changes
    label[s] = islands;
    let changed = true;
    while (changed) {
      changed = false;
      for (let c = 0; c < n; c++) {
        if (label[c] !== islands) continue;
        const r = Math.floor(c / C), col = c % C;
        const nb = [[r + 1, col], [r - 1, col], [r, col + 1], [r, col - 1]];
        for (const [pr, pc] of nb) {
          if (pr < 0 || pc < 0 || pr >= R || pc >= C) continue;
          const id = pr * C + pc;
          if (g[pr][pc] === '1' && label[id] === -1) { label[id] = islands; changed = true; }
        }
      }
    }
  }
  return islands;
}` }, { lang: 'cpp', code: String.raw`
int numIslands(vector<vector<char>>& g) {
    int R = g.size(), C = g[0].size(), n = R * C;
    vector<int> label(n, -1);
    int islands = 0;
    for (int s = 0; s < n; s++) {
        if (g[s / C][s % C] != '1' || label[s] != -1) continue;
        islands++;
        // naive: repeatedly sweep the grid, growing the label until nothing changes
        label[s] = islands;
        bool changed = true;
        while (changed) {
            changed = false;
            for (int c = 0; c < n; c++) {
                if (label[c] != islands) continue;
                int r = c / C, col = c % C;
                int nb[4][2] = {{r + 1, col}, {r - 1, col}, {r, col + 1}, {r, col - 1}};
                for (auto& p : nb) {
                    if (p[0] < 0 || p[1] < 0 || p[0] >= R || p[1] >= C) continue;
                    int id = p[0] * C + p[1];
                    if (g[p[0]][p[1]] == '1' && label[id] == -1) { label[id] = islands; changed = true; }
                }
            }
        }
    }
    return islands;
}` }] } },
    mcq: { q: 'Each time the outer scan finds an unvisited land cell, what do you do?', options: ['Count +1 and flood-fill (BFS/DFS) its whole island, marking visited', 'Count +1 only', 'Sort the grid', 'Run Dijkstra'], answer: 0, explain: 'The flood fill guarantees each island is counted exactly once — the components pattern (DSA 20).' },
    hints: [`<p>Hint 1: Islands are connected components of land cells.</p>`, `<p>Hint 2: Scan the grid; on unvisited land, increment the count and flood-fill to mark the whole island.</p>`, `<p>Hint 3: Use an explicit stack/queue — recursive DFS can be 90,000 deep on a 300×300 all-land grid. Mark cells when pushing.</p>`],
    tests: { sig: 'char[][] -> int', fn: 'numIslands', cases: [
      [[[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]],3],
      [[[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]],1],
      [[[["1"]]],1],
      [[[["0"]]],0],
      [[[["1","0","1"],["0","1","0"],["1","0","1"]]],5],
      [[[["1"],["0"],["1"]]],2],
      [[[["1","0","1","0","1"]]],3],
      [[[["1","1","1"],["1","0","1"],["1","1","1"]]],1],
      [[[["1","1","1","1"],["0","0","0","0"],["1","1","1","1"]]],2],
      [[[["1","0"],["0","1"]]],2],
      [[[["1","1","0","1","0"],["0","1","0","1","0"]]],2],
      [[[["1","1","0","1","0"],["1","0","0","1","1"],["1","0","0","1","1"]]],2],
      [[[["1","1"],["0","0"]]],1],
      [[{"$rep":["1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1"],"n":300}],1],
      [[{"$rep":["0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0"],"n":300}],0],
      [[{"$rep":["1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","1","0"],"n":300}],1]
    ] },
    solution: {
      approach: `<p><b>Clue:</b> "grid" + "connected" → flood fill counting components. Iterative BFS avoids stack overflow; Union-Find is an alternative (useful if land is added over time — Number of Islands II).</p>`,
      code: `class Solution {
    public int numIslands(char[][] grid) {
        int R = grid.length, C = grid[0].length, count = 0;
        int[] dr = {1, -1, 0, 0}, dc = {0, 0, 1, -1};
        Deque<int[]> q = new ArrayDeque<>();
        for (int r = 0; r < R; r++)
            for (int c = 0; c < C; c++) {
                if (grid[r][c] != '1') continue;
                count++;                              // new island found
                grid[r][c] = '0';                     // sink it as we enqueue (visited mark)
                q.add(new int[]{r, c});
                while (!q.isEmpty()) {
                    int[] cur = q.poll();
                    for (int d = 0; d < 4; d++) {
                        int nr = cur[0] + dr[d], nc = cur[1] + dc[d];
                        if (nr < 0 || nc < 0 || nr >= R || nc >= C || grid[nr][nc] != '1') continue;
                        grid[nr][nc] = '0';
                        q.add(new int[]{nr, nc});
                    }
                }
            }
        return count;
    }
}`,
      alt: [{ lang: 'python', code: `from collections import deque

def num_islands(grid):
    R, C, count = len(grid), len(grid[0]), 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] != '1':
                continue
            count += 1                         # new island found
            grid[r][c] = '0'                   # sink it as we enqueue (visited mark)
            q = deque([(r, c)])
            while q:
                cr, cc = q.popleft()
                for nr, nc in ((cr + 1, cc), (cr - 1, cc), (cr, cc + 1), (cr, cc - 1)):
                    if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == '1':
                        grid[nr][nc] = '0'
                        q.append((nr, nc))
    return count` },
        { lang: 'js', code: `function numIslands(grid) {
  const R = grid.length, C = grid[0].length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let count = 0;
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++) {
      if (grid[r][c] !== '1') continue;
      count++;                                 // new island found
      grid[r][c] = '0';                        // sink it as we enqueue (visited mark)
      const stack = [[r, c]];                  // an explicit stack works as well as a queue here
      while (stack.length > 0) {
        const [cr, cc] = stack.pop();
        for (const [dr, dc] of dirs) {
          const nr = cr + dr, nc = cc + dc;
          if (nr < 0 || nc < 0 || nr >= R || nc >= C || grid[nr][nc] !== '1') continue;
          grid[nr][nc] = '0';
          stack.push([nr, nc]);
        }
      }
    }
  return count;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int numIslands(vector<vector<char>>& grid) {
        int R = grid.size(), C = grid[0].size(), count = 0;
        const int dr[] = {1, -1, 0, 0}, dc[] = {0, 0, 1, -1};
        queue<pair<int, int>> q;
        for (int r = 0; r < R; r++)
            for (int c = 0; c < C; c++) {
                if (grid[r][c] != '1') continue;
                count++;                       // new island found
                grid[r][c] = '0';              // sink it as we enqueue (visited mark)
                q.push({r, c});
                while (!q.empty()) {
                    auto [cr, cc] = q.front();
                    q.pop();
                    for (int d = 0; d < 4; d++) {
                        int nr = cr + dr[d], nc = cc + dc[d];
                        if (nr < 0 || nc < 0 || nr >= R || nc >= C || grid[nr][nc] != '1') continue;
                        grid[nr][nc] = '0';
                        q.push({nr, nc});
                    }
                }
            }
        return count;
    }
};` }],
      complexity: `<p>Time O(R·C), space O(min(R, C)) to O(R·C) for the queue.</p>`,
      followUps: ['Do not modify the input (separate visited array).', 'Land added one cell at a time; report the count after each (Union-Find).', 'Count distinct island shapes.']
    }
  });

  practice.push({
    title: 'Koko Eating Bananas', level: 'Medium', tags: ['binary search on answer'], companies: ['Airbnb', 'Google', 'Meta'],
    statement: `<p><b>Timed: 20 min.</b> There are <code>piles</code> of bananas and <code>h</code> hours. Each hour Koko picks one pile and eats up to <code>s</code> bananas from it (if fewer remain, she finishes the pile and waits). Return the <b>minimum integer speed s</b> to finish within h hours.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>4</sup>, N ≤ h ≤ 10<sup>9</sup>, 1 ≤ piles[i] ≤ 10<sup>9</sup>`,
    example: `<p>piles = [3,6,7,11], h = 8 → <b>${H.c('g', '4')}</b>: hours at s = 4 are 1+2+2+3 = 8 ✔; at s = 3 they are 1+2+3+4 = 10 ✘.</p>`,
    brute: { why: `<p>Try s = 1, 2, 3, … until it works: up to 10<sup>9</sup> speeds × N piles → TLE. The waste: checking speeds one by one when "works" is monotone.</p>`, code: { lang: 'java', code: `int bruteSpeed(int[] piles, int h) {
    for (int s = 1; ; s++) {
        long hours = 0;
        for (int p : piles) hours += (p + s - 1) / s;
        if (hours <= h) return s;
    }
}`, alt: [{ lang: 'python', code: String.raw`
def min_eating_speed(piles, h):
    s = 1
    while True:
        hours = 0
        for p in piles:
            hours += (p + s - 1) // s
        if hours <= h:
            return s
        s += 1` }, { lang: 'js', code: String.raw`
function minEatingSpeed(piles, h) {
  for (let s = 1; ; s++) {
    let hours = 0;
    for (const p of piles) hours += Math.floor((p + s - 1) / s);
    if (hours <= h) return s;
  }
}` }, { lang: 'cpp', code: String.raw`
int minEatingSpeed(vector<int>& piles, int h) {
    for (int s = 1; ; s++) {
        long long hours = 0;
        for (int p : piles) hours += (p + s - 1) / s;
        if (hours <= h) return s;
    }
}` }] } },
    mcq: { q: 'What makes binary search valid here?', options: ['If speed s finishes in time, every speed above s also does', 'The piles are sorted', 'h is large', 'Speeds are integers'], answer: 0, explain: 'Monotone feasibility (NO…NO YES…YES) is the precondition for binary search on the answer (DSA 10).' },
    hints: [`<p>Hint 1: "Minimum speed such that…" → guess a speed and check it.</p>`, `<p>Hint 2: Check = Σ ⌈pile / s⌉ ≤ h, computed in O(N) with integer ceil (p + s − 1) / s.</p>`, `<p>Hint 3: Search s in [1, max(piles)]. Use long for the hour total (10<sup>4</sup> piles × 10<sup>9</sup> hours overflows int).</p>`],
    tests: { sig: 'int[] int -> int', fn: 'minEatingSpeed', cases: [
      [[[3,6,7,11],8],4],
      [[[30,11,23,4,20],5],30],
      [[[30,11,23,4,20],6],23],
      [[[1],1],1],
      [[[5],5],1],
      [[[5],1],5],
      [[[1,1,1],3],1],
      [[[1,1,1],10],1],
      [[[312884470],312884469],2],
      [[[4,9,2],3],9],
      [[[2,5,15],17],2],
      [[[1,12,29,8,1],11],6],
      [[[19,11,18],16],4],
      [[[1000000000],1],1000000000],
      [[[1000000000],1000000000],1],
      [[{"$rep":1000000000,"n":10000},1000000000],10000],
      [[{"$rep":1000000000,"n":10000},10000],1000000000],
      [[{"$rep":1000000000,"n":10000},20000],500000000]
    ] },
    solution: {
      approach: `<p><b>Clue:</b> "minimum X such that possible" + monotone → binary search on the answer with an O(N) greedy check.</p>`,
      code: `class Solution {
    public int minEatingSpeed(int[] piles, int h) {
        int lo = 1, hi = 0;
        for (int p : piles) hi = Math.max(hi, p);       // speed max(piles) always works
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (hoursAt(piles, mid) <= h) hi = mid;     // fast enough: try slower
            else lo = mid + 1;                          // too slow
        }
        return lo;
    }
    private long hoursAt(int[] piles, int s) {
        long hours = 0;
        for (int p : piles) hours += (p + (long) s - 1) / s;  // ceil without overflow
        return hours;
    }
}`,
      alt: [{ lang: 'python', code: `def min_eating_speed(piles, h):
    def hours_at(s):
        return sum((p + s - 1) // s for p in piles)   # ceil(p / s) with integers

    lo, hi = 1, max(piles)                     # speed max(piles) always works
    while lo < hi:
        mid = (lo + hi) // 2
        if hours_at(mid) <= h:
            hi = mid                           # fast enough: try slower
        else:
            lo = mid + 1                       # too slow
    return lo` },
        { lang: 'js', code: `function minEatingSpeed(piles, h) {
  // ceil(p / s) with integers; the total stays below 1e13, so Number is exact
  const hoursAt = (s) => piles.reduce((sum, p) => sum + Math.floor((p + s - 1) / s), 0);
  let lo = 1, hi = Math.max(...piles);         // speed max(piles) always works
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (hoursAt(mid) <= h) hi = mid;           // fast enough: try slower
    else lo = mid + 1;                         // too slow
  }
  return lo;
}` },
        { lang: 'cpp', code: `class Solution {
    long long hoursAt(const vector<int>& piles, long long s) {
        long long hours = 0;                   // long long: up to 10^4 * 10^9
        for (int p : piles) hours += (p + s - 1) / s;   // ceil without floating point
        return hours;
    }
public:
    int minEatingSpeed(vector<int>& piles, int h) {
        int lo = 1, hi = *max_element(piles.begin(), piles.end());   // speed max(piles) always works
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (hoursAt(piles, mid) <= h) hi = mid;   // fast enough: try slower
            else lo = mid + 1;                        // too slow
        }
        return lo;
    }
};` }],
      dry: { head: ['lo', 'hi', 'mid', 'hours', 'move'], rows: [['1', '11', '6', '1+1+2+2 = 6 ≤ 8', 'hi = 6'], ['1', '6', '3', '1+2+3+4 = 10', 'lo = 4'], ['4', '6', '5', '1+2+2+3 = 8 ≤ 8', 'hi = 5'], ['4', '5', '4', '1+2+2+3 = 8 ≤ 8', 'hi = 4'], ['4', '4', '—', 'stop', H.c('g', '4')]] },
      complexity: `<p>Time O(N log max(piles)) ≈ 10<sup>4</sup> × 30. Space O(1).</p>`,
      followUps: ['Minimum days to make m bouquets (same template).', 'Capacity to ship packages within D days.']
    }
  });

  practice.push({
    title: 'Daily Temperatures', level: 'Medium', tags: ['monotonic stack'], companies: ['Meta', 'Amazon', 'Uber'],
    statement: `<p><b>Timed: 20 min.</b> For each day, return how many days you must wait for a <b>warmer</b> temperature; 0 if none.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, 30 ≤ temperatures[i] ≤ 100`,
    example: `${H.arr([73, 74, 75, 71, 69, 72, 76, 73])}<p>→ <b>[1, 1, 4, 2, 1, 1, 0, 0]</b>. Day 2 (75) waits until day 6 (76): ${H.c('g', '4 days')}.</p>`,
    brute: { why: `<p>For each day scan forward until warmer: O(N<sup>2</sup>) on a decreasing sequence = 5·10<sup>9</sup>. The waste: many days wait for the same future warm day, but each scans independently.</p>`, code: { lang: 'java', code: `int[] bruteTemps(int[] t) {
    int[] ans = new int[t.length];
    for (int i = 0; i < t.length; i++)
        for (int j = i + 1; j < t.length; j++)
            if (t[j] > t[i]) { ans[i] = j - i; break; }
    return ans;
}`, alt: [{ lang: 'python', code: String.raw`
def daily_temperatures(temps):
    t = temps
    ans = [0] * len(t)
    for i in range(len(t)):
        for j in range(i + 1, len(t)):
            if t[j] > t[i]:
                ans[i] = j - i
                break
    return ans` }, { lang: 'js', code: String.raw`
function dailyTemperatures(t) {
  const ans = new Array(t.length).fill(0);
  for (let i = 0; i < t.length; i++)
    for (let j = i + 1; j < t.length; j++)
      if (t[j] > t[i]) { ans[i] = j - i; break; }
  return ans;
}` }, { lang: 'cpp', code: String.raw`
vector<int> dailyTemperatures(vector<int>& t) {
    vector<int> ans(t.size(), 0);
    for (int i = 0; i < (int)t.size(); i++)
        for (int j = i + 1; j < (int)t.size(); j++)
            if (t[j] > t[i]) { ans[i] = j - i; break; }
    return ans;
}` }] } },
    mcq: { q: '"Days until a warmer temperature" is which classic?', options: ['Next greater element → monotonic decreasing stack of indices', 'Sliding window maximum', 'Binary search on the answer', 'Kadane'], answer: 0, explain: 'Every "next greater/smaller" question is a monotonic stack (DSA 14).' },
    hints: [`<p>Hint 1: This is "next greater element", returning distances instead of values.</p>`, `<p>Hint 2: Keep a stack of indices whose answer is unknown; their temperatures are decreasing from bottom to top.</p>`, `<p>Hint 3: When t[i] is warmer than the top, pop it and set ans[top] = i − top. Repeat, then push i. Leftovers keep 0.</p>`],
    tests: { sig: 'int[] -> int[]', fn: 'dailyTemperatures', cases: [
      [[[73,74,75,71,69,72,76,73]],[1,1,4,2,1,1,0,0]],
      [[[30,40,50,60]],[1,1,1,0]],
      [[[30,60,90]],[1,1,0]],
      [[[30]],[0]],
      [[[100,100,100]],[0,0,0]],
      [[[100,30,100,30,100]],[0,1,0,1,0]],
      [[[50,40,30,60]],[3,2,1,0]],
      [[[31,30]],[0,0]],
      [[[39,35,40,39,38]],[2,1,0,0,0]],
      [[[39,39,34,30,33,37,34,30,36,32]],[0,0,3,1,1,0,2,1,0,0]],
      [[[40,38,37,35,31,37,34,32,40,37]],[0,7,6,2,1,3,2,1,0,0]],
      [[{"$concat":[{"$rep":30,"n":99999},[100]]}],{"$concat":[{"$range":[99999,0,-1]},[0]]}],
      [[{"$rep":55,"n":100000}],{"$rep":0,"n":100000}],
      [[{"$concat":[{"$rep":100,"n":50000},{"$rep":30,"n":50000}]}],{"$rep":0,"n":100000}]
    ] },
    solution: {
      approach: `<p><b>Clue:</b> "wait until warmer" = next greater → monotonic stack, each index pushed and popped once.</p>`,
      code: `class Solution {
    public int[] dailyTemperatures(int[] t) {
        int[] ans = new int[t.length];
        Deque<Integer> st = new ArrayDeque<>();           // indices with decreasing temps
        for (int i = 0; i < t.length; i++) {
            while (!st.isEmpty() && t[st.peek()] < t[i]) {
                int j = st.pop();
                ans[j] = i - j;                           // i is j's first warmer day
            }
            st.push(i);
        }
        return ans;                                       // remaining indices stay 0
    }
}`,
      alt: [{ lang: 'python', code: `def daily_temperatures(temps):
    ans = [0] * len(temps)
    stack = []                                 # indices with decreasing temps
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            ans[j] = i - j                     # i is j's first warmer day
        stack.append(i)
    return ans                                 # remaining indices stay 0` },
        { lang: 'js', code: `function dailyTemperatures(t) {
  const ans = new Array(t.length).fill(0);
  const stack = [];                            // indices with decreasing temps
  for (let i = 0; i < t.length; i++) {
    while (stack.length > 0 && t[stack[stack.length - 1]] < t[i]) {
      const j = stack.pop();
      ans[j] = i - j;                          // i is j's first warmer day
    }
    stack.push(i);
  }
  return ans;                                  // remaining indices stay 0
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<int> dailyTemperatures(vector<int>& t) {
        vector<int> ans(t.size(), 0);
        vector<int> st;                        // indices with decreasing temps
        for (int i = 0; i < (int)t.size(); i++) {
            while (!st.empty() && t[st.back()] < t[i]) {
                int j = st.back();
                st.pop_back();
                ans[j] = i - j;                // i is j's first warmer day
            }
            st.push_back(i);
        }
        return ans;                            // remaining indices stay 0
    }
};` }],
      complexity: `<p>Time O(N) amortised (each index pushed and popped at most once). Space O(N).</p>`,
      followUps: ['Circular array (Next Greater Element II): loop 2N times with i % N.', 'Stock span (previous greater).']
    }
  });

  practice.push({
    title: 'Course Schedule II', level: 'Medium', tags: ['topological sort', 'graph', 'kahn'], companies: ['Amazon', 'Google', 'Uber'],
    statement: `<p><b>Timed: 25 min.</b> There are <code>n</code> courses (0..n−1). <code>prerequisites[i] = [a, b]</code> means you must take b before a. Return any valid order to take all courses, or an empty array if impossible.</p>`,
    constraints: `1 ≤ n ≤ 2000, 0 ≤ prerequisites.length ≤ n·(n−1), all pairs distinct`,
    example: `<p>n = 4, [[1,0],[2,0],[3,1],[3,2]] → <b>${H.c('g', '[0, 1, 2, 3]')}</b> (or [0,2,1,3]). With [[1,0],[0,1]] → <b>${H.c('r', '[]')}</b>: a cycle.</p>`,
    brute: { why: `<p>Try permutations and check each against all prerequisites: O(n!·E) — impossible beyond n ≈ 10. The waste: we ignore the structure (only courses with no remaining prerequisites can go next).</p>`, code: { lang: 'java', code: `int[] bruteOrder(int n, int[][] pre) {
    // repeatedly scan for a course whose prerequisites are all taken: O(n * (n + E))
    boolean[] taken = new boolean[n];
    int[] order = new int[n];
    for (int k = 0; k < n; k++) {
        int pick = -1;
        for (int c = 0; c < n && pick == -1; c++) {
            if (taken[c]) continue;
            boolean ok = true;
            for (int[] p : pre) if (p[0] == c && !taken[p[1]]) { ok = false; break; }
            if (ok) pick = c;
        }
        if (pick == -1) return new int[0];          // nothing available: cycle
        taken[pick] = true; order[k] = pick;
    }
    return order;
}`, alt: [{ lang: 'python', code: String.raw`
def find_order(n, prerequisites):
    # repeatedly scan for a course whose prerequisites are all taken: O(n * (n + E))
    taken = [False] * n
    order = []
    for _ in range(n):
        pick = -1
        for c in range(n):
            if pick != -1:
                break
            if taken[c]:
                continue
            if all(taken[p[1]] for p in prerequisites if p[0] == c):
                pick = c
        if pick == -1:
            return []                                 # nothing available: cycle
        taken[pick] = True
        order.append(pick)
    return order` }, { lang: 'js', code: String.raw`
function findOrder(n, prerequisites) {
  // repeatedly scan for a course whose prerequisites are all taken: O(n * (n + E))
  const taken = new Array(n).fill(false), order = [];
  for (let k = 0; k < n; k++) {
    let pick = -1;
    for (let c = 0; c < n && pick === -1; c++) {
      if (taken[c]) continue;
      let ok = true;
      for (const p of prerequisites) if (p[0] === c && !taken[p[1]]) { ok = false; break; }
      if (ok) pick = c;
    }
    if (pick === -1) return [];                       // nothing available: cycle
    taken[pick] = true; order.push(pick);
  }
  return order;
}` }, { lang: 'cpp', code: String.raw`
vector<int> findOrder(int n, vector<vector<int>>& prerequisites) {
    // repeatedly scan for a course whose prerequisites are all taken: O(n * (n + E))
    vector<char> taken(n, 0);
    vector<int> order;
    for (int k = 0; k < n; k++) {
        int pick = -1;
        for (int c = 0; c < n && pick == -1; c++) {
            if (taken[c]) continue;
            bool ok = true;
            for (auto& p : prerequisites) if (p[0] == c && !taken[p[1]]) { ok = false; break; }
            if (ok) pick = c;
        }
        if (pick == -1) return {};                    // nothing available: cycle
        taken[pick] = 1; order.push_back(pick);
    }
    return order;
}` }] } },
    mcq: { q: 'In Kahn’s algorithm, how do you detect that no valid order exists?', options: ['Fewer than n courses get output — the rest are stuck in a cycle', 'The queue becomes empty at the start', 'A course has two prerequisites', 'The graph is disconnected'], answer: 0, explain: 'Nodes on a cycle never reach indegree 0, so they never leave the queue logic.' },
    hints: [`<p>Hint 1: "b before a" is a directed edge b → a. You want a topological order.</p>`, `<p>Hint 2: Kahn: compute indegrees; queue all indegree-0 courses; pop, output, decrement neighbours, enqueue those reaching 0.</p>`, `<p>Hint 3: If the output has fewer than n courses, return an empty array. Disconnected courses are fine — they start with indegree 0.</p>`],
    tests: { sig: 'int int[][] -> int[]', fn: 'findOrder', check: "(args, out, expected) => { const n = args[0], pre = args[1]; if (expected.length === 0) return out.length === 0; if (out.length !== n) return false; const pos = new Array(n).fill(-1); for (let i = 0; i < n; i++) { if (out[i] < 0 || out[i] >= n || pos[out[i]] !== -1) return false; pos[out[i]] = i; } return pre.every(p => pos[p[1]] < pos[p[0]]); }", cases: [
      [[4,[[1,0],[2,0],[3,1],[3,2]]],[0,1,2,3]],
      [[2,[[1,0]]],[0,1]],
      [[2,[[1,0],[0,1]]],[]],
      [[1,[]],[0]],
      [[3,[]],[0,1,2]],
      [[3,[[0,1],[1,2],[2,0]]],[]],
      [[3,[[0,1],[1,2]]],[2,1,0]],
      [[4,[[1,0],[2,1],[3,2],[1,3]]],[]],
      [[5,[[1,0],[2,0],[3,1],[3,2],[4,3]]],[0,1,2,3,4]],
      [[2,[[0,0]]],[]],
      [[500,[[1,0],[2,1],[3,2],[4,3],[5,4],[6,5],[7,6],[8,7],[9,8],[10,9],[11,10],[12,11],[13,12],[14,13],[15,14],[16,15],[17,16],[18,17],[19,18],[20,19],[21,20],[22,21],[23,22],[24,23],[25,24],[26,25],[27,26],[28,27],[29,28],[30,29],[31,30],[32,31],[33,32],[34,33],[35,34],[36,35],[37,36],[38,37],[39,38],[40,39],[41,40],[42,41],[43,42],[44,43],[45,44],[46,45],[47,46],[48,47],[49,48],[50,49],[51,50],[52,51],[53,52],[54,53],[55,54],[56,55],[57,56],[58,57],[59,58],[60,59],[61,60],[62,61],[63,62],[64,63],[65,64],[66,65],[67,66],[68,67],[69,68],[70,69],[71,70],[72,71],[73,72],[74,73],[75,74],[76,75],[77,76],[78,77],[79,78],[80,79],[81,80],[82,81],[83,82],[84,83],[85,84],[86,85],[87,86],[88,87],[89,88],[90,89],[91,90],[92,91],[93,92],[94,93],[95,94],[96,95],[97,96],[98,97],[99,98],[100,99],[101,100],[102,101],[103,102],[104,103],[105,104],[106,105],[107,106],[108,107],[109,108],[110,109],[111,110],[112,111],[113,112],[114,113],[115,114],[116,115],[117,116],[118,117],[119,118],[120,119],[121,120],[122,121],[123,122],[124,123],[125,124],[126,125],[127,126],[128,127],[129,128],[130,129],[131,130],[132,131],[133,132],[134,133],[135,134],[136,135],[137,136],[138,137],[139,138],[140,139],[141,140],[142,141],[143,142],[144,143],[145,144],[146,145],[147,146],[148,147],[149,148],[150,149],[151,150],[152,151],[153,152],[154,153],[155,154],[156,155],[157,156],[158,157],[159,158],[160,159],[161,160],[162,161],[163,162],[164,163],[165,164],[166,165],[167,166],[168,167],[169,168],[170,169],[171,170],[172,171],[173,172],[174,173],[175,174],[176,175],[177,176],[178,177],[179,178],[180,179],[181,180],[182,181],[183,182],[184,183],[185,184],[186,185],[187,186],[188,187],[189,188],[190,189],[191,190],[192,191],[193,192],[194,193],[195,194],[196,195],[197,196],[198,197],[199,198],[200,199],[201,200],[202,201],[203,202],[204,203],[205,204],[206,205],[207,206],[208,207],[209,208],[210,209],[211,210],[212,211],[213,212],[214,213],[215,214],[216,215],[217,216],[218,217],[219,218],[220,219],[221,220],[222,221],[223,222],[224,223],[225,224],[226,225],[227,226],[228,227],[229,228],[230,229],[231,230],[232,231],[233,232],[234,233],[235,234],[236,235],[237,236],[238,237],[239,238],[240,239],[241,240],[242,241],[243,242],[244,243],[245,244],[246,245],[247,246],[248,247],[249,248],[250,249],[251,250],[252,251],[253,252],[254,253],[255,254],[256,255],[257,256],[258,257],[259,258],[260,259],[261,260],[262,261],[263,262],[264,263],[265,264],[266,265],[267,266],[268,267],[269,268],[270,269],[271,270],[272,271],[273,272],[274,273],[275,274],[276,275],[277,276],[278,277],[279,278],[280,279],[281,280],[282,281],[283,282],[284,283],[285,284],[286,285],[287,286],[288,287],[289,288],[290,289],[291,290],[292,291],[293,292],[294,293],[295,294],[296,295],[297,296],[298,297],[299,298],[300,299],[301,300],[302,301],[303,302],[304,303],[305,304],[306,305],[307,306],[308,307],[309,308],[310,309],[311,310],[312,311],[313,312],[314,313],[315,314],[316,315],[317,316],[318,317],[319,318],[320,319],[321,320],[322,321],[323,322],[324,323],[325,324],[326,325],[327,326],[328,327],[329,328],[330,329],[331,330],[332,331],[333,332],[334,333],[335,334],[336,335],[337,336],[338,337],[339,338],[340,339],[341,340],[342,341],[343,342],[344,343],[345,344],[346,345],[347,346],[348,347],[349,348],[350,349],[351,350],[352,351],[353,352],[354,353],[355,354],[356,355],[357,356],[358,357],[359,358],[360,359],[361,360],[362,361],[363,362],[364,363],[365,364],[366,365],[367,366],[368,367],[369,368],[370,369],[371,370],[372,371],[373,372],[374,373],[375,374],[376,375],[377,376],[378,377],[379,378],[380,379],[381,380],[382,381],[383,382],[384,383],[385,384],[386,385],[387,386],[388,387],[389,388],[390,389],[391,390],[392,391],[393,392],[394,393],[395,394],[396,395],[397,396],[398,397],[399,398],[400,399],[401,400],[402,401],[403,402],[404,403],[405,404],[406,405],[407,406],[408,407],[409,408],[410,409],[411,410],[412,411],[413,412],[414,413],[415,414],[416,415],[417,416],[418,417],[419,418],[420,419],[421,420],[422,421],[423,422],[424,423],[425,424],[426,425],[427,426],[428,427],[429,428],[430,429],[431,430],[432,431],[433,432],[434,433],[435,434],[436,435],[437,436],[438,437],[439,438],[440,439],[441,440],[442,441],[443,442],[444,443],[445,444],[446,445],[447,446],[448,447],[449,448],[450,449],[451,450],[452,451],[453,452],[454,453],[455,454],[456,455],[457,456],[458,457],[459,458],[460,459],[461,460],[462,461],[463,462],[464,463],[465,464],[466,465],[467,466],[468,467],[469,468],[470,469],[471,470],[472,471],[473,472],[474,473],[475,474],[476,475],[477,476],[478,477],[479,478],[480,479],[481,480],[482,481],[483,482],[484,483],[485,484],[486,485],[487,486],[488,487],[489,488],[490,489],[491,490],[492,491],[493,492],[494,493],[495,494],[496,495],[497,496],[498,497],[499,498]]],[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292,293,294,295,296,297,298,299,300,301,302,303,304,305,306,307,308,309,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,329,330,331,332,333,334,335,336,337,338,339,340,341,342,343,344,345,346,347,348,349,350,351,352,353,354,355,356,357,358,359,360,361,362,363,364,365,366,367,368,369,370,371,372,373,374,375,376,377,378,379,380,381,382,383,384,385,386,387,388,389,390,391,392,393,394,395,396,397,398,399,400,401,402,403,404,405,406,407,408,409,410,411,412,413,414,415,416,417,418,419,420,421,422,423,424,425,426,427,428,429,430,431,432,433,434,435,436,437,438,439,440,441,442,443,444,445,446,447,448,449,450,451,452,453,454,455,456,457,458,459,460,461,462,463,464,465,466,467,468,469,470,471,472,473,474,475,476,477,478,479,480,481,482,483,484,485,486,487,488,489,490,491,492,493,494,495,496,497,498,499]],
      [[500,[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,16],[16,17],[17,18],[18,19],[19,20],[20,21],[21,22],[22,23],[23,24],[24,25],[25,26],[26,27],[27,28],[28,29],[29,30],[30,31],[31,32],[32,33],[33,34],[34,35],[35,36],[36,37],[37,38],[38,39],[39,40],[40,41],[41,42],[42,43],[43,44],[44,45],[45,46],[46,47],[47,48],[48,49],[49,50],[50,51],[51,52],[52,53],[53,54],[54,55],[55,56],[56,57],[57,58],[58,59],[59,60],[60,61],[61,62],[62,63],[63,64],[64,65],[65,66],[66,67],[67,68],[68,69],[69,70],[70,71],[71,72],[72,73],[73,74],[74,75],[75,76],[76,77],[77,78],[78,79],[79,80],[80,81],[81,82],[82,83],[83,84],[84,85],[85,86],[86,87],[87,88],[88,89],[89,90],[90,91],[91,92],[92,93],[93,94],[94,95],[95,96],[96,97],[97,98],[98,99],[99,100],[100,101],[101,102],[102,103],[103,104],[104,105],[105,106],[106,107],[107,108],[108,109],[109,110],[110,111],[111,112],[112,113],[113,114],[114,115],[115,116],[116,117],[117,118],[118,119],[119,120],[120,121],[121,122],[122,123],[123,124],[124,125],[125,126],[126,127],[127,128],[128,129],[129,130],[130,131],[131,132],[132,133],[133,134],[134,135],[135,136],[136,137],[137,138],[138,139],[139,140],[140,141],[141,142],[142,143],[143,144],[144,145],[145,146],[146,147],[147,148],[148,149],[149,150],[150,151],[151,152],[152,153],[153,154],[154,155],[155,156],[156,157],[157,158],[158,159],[159,160],[160,161],[161,162],[162,163],[163,164],[164,165],[165,166],[166,167],[167,168],[168,169],[169,170],[170,171],[171,172],[172,173],[173,174],[174,175],[175,176],[176,177],[177,178],[178,179],[179,180],[180,181],[181,182],[182,183],[183,184],[184,185],[185,186],[186,187],[187,188],[188,189],[189,190],[190,191],[191,192],[192,193],[193,194],[194,195],[195,196],[196,197],[197,198],[198,199],[199,200],[200,201],[201,202],[202,203],[203,204],[204,205],[205,206],[206,207],[207,208],[208,209],[209,210],[210,211],[211,212],[212,213],[213,214],[214,215],[215,216],[216,217],[217,218],[218,219],[219,220],[220,221],[221,222],[222,223],[223,224],[224,225],[225,226],[226,227],[227,228],[228,229],[229,230],[230,231],[231,232],[232,233],[233,234],[234,235],[235,236],[236,237],[237,238],[238,239],[239,240],[240,241],[241,242],[242,243],[243,244],[244,245],[245,246],[246,247],[247,248],[248,249],[249,250],[250,251],[251,252],[252,253],[253,254],[254,255],[255,256],[256,257],[257,258],[258,259],[259,260],[260,261],[261,262],[262,263],[263,264],[264,265],[265,266],[266,267],[267,268],[268,269],[269,270],[270,271],[271,272],[272,273],[273,274],[274,275],[275,276],[276,277],[277,278],[278,279],[279,280],[280,281],[281,282],[282,283],[283,284],[284,285],[285,286],[286,287],[287,288],[288,289],[289,290],[290,291],[291,292],[292,293],[293,294],[294,295],[295,296],[296,297],[297,298],[298,299],[299,300],[300,301],[301,302],[302,303],[303,304],[304,305],[305,306],[306,307],[307,308],[308,309],[309,310],[310,311],[311,312],[312,313],[313,314],[314,315],[315,316],[316,317],[317,318],[318,319],[319,320],[320,321],[321,322],[322,323],[323,324],[324,325],[325,326],[326,327],[327,328],[328,329],[329,330],[330,331],[331,332],[332,333],[333,334],[334,335],[335,336],[336,337],[337,338],[338,339],[339,340],[340,341],[341,342],[342,343],[343,344],[344,345],[345,346],[346,347],[347,348],[348,349],[349,350],[350,351],[351,352],[352,353],[353,354],[354,355],[355,356],[356,357],[357,358],[358,359],[359,360],[360,361],[361,362],[362,363],[363,364],[364,365],[365,366],[366,367],[367,368],[368,369],[369,370],[370,371],[371,372],[372,373],[373,374],[374,375],[375,376],[376,377],[377,378],[378,379],[379,380],[380,381],[381,382],[382,383],[383,384],[384,385],[385,386],[386,387],[387,388],[388,389],[389,390],[390,391],[391,392],[392,393],[393,394],[394,395],[395,396],[396,397],[397,398],[398,399],[399,400],[400,401],[401,402],[402,403],[403,404],[404,405],[405,406],[406,407],[407,408],[408,409],[409,410],[410,411],[411,412],[412,413],[413,414],[414,415],[415,416],[416,417],[417,418],[418,419],[419,420],[420,421],[421,422],[422,423],[423,424],[424,425],[425,426],[426,427],[427,428],[428,429],[429,430],[430,431],[431,432],[432,433],[433,434],[434,435],[435,436],[436,437],[437,438],[438,439],[439,440],[440,441],[441,442],[442,443],[443,444],[444,445],[445,446],[446,447],[447,448],[448,449],[449,450],[450,451],[451,452],[452,453],[453,454],[454,455],[455,456],[456,457],[457,458],[458,459],[459,460],[460,461],[461,462],[462,463],[463,464],[464,465],[465,466],[466,467],[467,468],[468,469],[469,470],[470,471],[471,472],[472,473],[473,474],[474,475],[475,476],[476,477],[477,478],[478,479],[479,480],[480,481],[481,482],[482,483],[483,484],[484,485],[485,486],[486,487],[487,488],[488,489],[489,490],[490,491],[491,492],[492,493],[493,494],[494,495],[495,496],[496,497],[497,498],[498,499]]],[499,498,497,496,495,494,493,492,491,490,489,488,487,486,485,484,483,482,481,480,479,478,477,476,475,474,473,472,471,470,469,468,467,466,465,464,463,462,461,460,459,458,457,456,455,454,453,452,451,450,449,448,447,446,445,444,443,442,441,440,439,438,437,436,435,434,433,432,431,430,429,428,427,426,425,424,423,422,421,420,419,418,417,416,415,414,413,412,411,410,409,408,407,406,405,404,403,402,401,400,399,398,397,396,395,394,393,392,391,390,389,388,387,386,385,384,383,382,381,380,379,378,377,376,375,374,373,372,371,370,369,368,367,366,365,364,363,362,361,360,359,358,357,356,355,354,353,352,351,350,349,348,347,346,345,344,343,342,341,340,339,338,337,336,335,334,333,332,331,330,329,328,327,326,325,324,323,322,321,320,319,318,317,316,315,314,313,312,311,310,309,308,307,306,305,304,303,302,301,300,299,298,297,296,295,294,293,292,291,290,289,288,287,286,285,284,283,282,281,280,279,278,277,276,275,274,273,272,271,270,269,268,267,266,265,264,263,262,261,260,259,258,257,256,255,254,253,252,251,250,249,248,247,246,245,244,243,242,241,240,239,238,237,236,235,234,233,232,231,230,229,228,227,226,225,224,223,222,221,220,219,218,217,216,215,214,213,212,211,210,209,208,207,206,205,204,203,202,201,200,199,198,197,196,195,194,193,192,191,190,189,188,187,186,185,184,183,182,181,180,179,178,177,176,175,174,173,172,171,170,169,168,167,166,165,164,163,162,161,160,159,158,157,156,155,154,153,152,151,150,149,148,147,146,145,144,143,142,141,140,139,138,137,136,135,134,133,132,131,130,129,128,127,126,125,124,123,122,121,120,119,118,117,116,115,114,113,112,111,110,109,108,107,106,105,104,103,102,101,100,99,98,97,96,95,94,93,92,91,90,89,88,87,86,85,84,83,82,81,80,79,78,77,76,75,74,73,72,71,70,69,68,67,66,65,64,63,62,61,60,59,58,57,56,55,54,53,52,51,50,49,48,47,46,45,44,43,42,41,40,39,38,37,36,35,34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1,0]],
      [[500,[[1,0],[2,1],[3,2],[4,3],[5,4],[6,5],[7,6],[8,7],[9,8],[10,9],[11,10],[12,11],[13,12],[14,13],[15,14],[16,15],[17,16],[18,17],[19,18],[20,19],[21,20],[22,21],[23,22],[24,23],[25,24],[26,25],[27,26],[28,27],[29,28],[30,29],[31,30],[32,31],[33,32],[34,33],[35,34],[36,35],[37,36],[38,37],[39,38],[40,39],[41,40],[42,41],[43,42],[44,43],[45,44],[46,45],[47,46],[48,47],[49,48],[50,49],[51,50],[52,51],[53,52],[54,53],[55,54],[56,55],[57,56],[58,57],[59,58],[60,59],[61,60],[62,61],[63,62],[64,63],[65,64],[66,65],[67,66],[68,67],[69,68],[70,69],[71,70],[72,71],[73,72],[74,73],[75,74],[76,75],[77,76],[78,77],[79,78],[80,79],[81,80],[82,81],[83,82],[84,83],[85,84],[86,85],[87,86],[88,87],[89,88],[90,89],[91,90],[92,91],[93,92],[94,93],[95,94],[96,95],[97,96],[98,97],[99,98],[100,99],[101,100],[102,101],[103,102],[104,103],[105,104],[106,105],[107,106],[108,107],[109,108],[110,109],[111,110],[112,111],[113,112],[114,113],[115,114],[116,115],[117,116],[118,117],[119,118],[120,119],[121,120],[122,121],[123,122],[124,123],[125,124],[126,125],[127,126],[128,127],[129,128],[130,129],[131,130],[132,131],[133,132],[134,133],[135,134],[136,135],[137,136],[138,137],[139,138],[140,139],[141,140],[142,141],[143,142],[144,143],[145,144],[146,145],[147,146],[148,147],[149,148],[150,149],[151,150],[152,151],[153,152],[154,153],[155,154],[156,155],[157,156],[158,157],[159,158],[160,159],[161,160],[162,161],[163,162],[164,163],[165,164],[166,165],[167,166],[168,167],[169,168],[170,169],[171,170],[172,171],[173,172],[174,173],[175,174],[176,175],[177,176],[178,177],[179,178],[180,179],[181,180],[182,181],[183,182],[184,183],[185,184],[186,185],[187,186],[188,187],[189,188],[190,189],[191,190],[192,191],[193,192],[194,193],[195,194],[196,195],[197,196],[198,197],[199,198],[200,199],[201,200],[202,201],[203,202],[204,203],[205,204],[206,205],[207,206],[208,207],[209,208],[210,209],[211,210],[212,211],[213,212],[214,213],[215,214],[216,215],[217,216],[218,217],[219,218],[220,219],[221,220],[222,221],[223,222],[224,223],[225,224],[226,225],[227,226],[228,227],[229,228],[230,229],[231,230],[232,231],[233,232],[234,233],[235,234],[236,235],[237,236],[238,237],[239,238],[240,239],[241,240],[242,241],[243,242],[244,243],[245,244],[246,245],[247,246],[248,247],[249,248],[250,249],[251,250],[252,251],[253,252],[254,253],[255,254],[256,255],[257,256],[258,257],[259,258],[260,259],[261,260],[262,261],[263,262],[264,263],[265,264],[266,265],[267,266],[268,267],[269,268],[270,269],[271,270],[272,271],[273,272],[274,273],[275,274],[276,275],[277,276],[278,277],[279,278],[280,279],[281,280],[282,281],[283,282],[284,283],[285,284],[286,285],[287,286],[288,287],[289,288],[290,289],[291,290],[292,291],[293,292],[294,293],[295,294],[296,295],[297,296],[298,297],[299,298],[300,299],[301,300],[302,301],[303,302],[304,303],[305,304],[306,305],[307,306],[308,307],[309,308],[310,309],[311,310],[312,311],[313,312],[314,313],[315,314],[316,315],[317,316],[318,317],[319,318],[320,319],[321,320],[322,321],[323,322],[324,323],[325,324],[326,325],[327,326],[328,327],[329,328],[330,329],[331,330],[332,331],[333,332],[334,333],[335,334],[336,335],[337,336],[338,337],[339,338],[340,339],[341,340],[342,341],[343,342],[344,343],[345,344],[346,345],[347,346],[348,347],[349,348],[350,349],[351,350],[352,351],[353,352],[354,353],[355,354],[356,355],[357,356],[358,357],[359,358],[360,359],[361,360],[362,361],[363,362],[364,363],[365,364],[366,365],[367,366],[368,367],[369,368],[370,369],[371,370],[372,371],[373,372],[374,373],[375,374],[376,375],[377,376],[378,377],[379,378],[380,379],[381,380],[382,381],[383,382],[384,383],[385,384],[386,385],[387,386],[388,387],[389,388],[390,389],[391,390],[392,391],[393,392],[394,393],[395,394],[396,395],[397,396],[398,397],[399,398],[400,399],[401,400],[402,401],[403,402],[404,403],[405,404],[406,405],[407,406],[408,407],[409,408],[410,409],[411,410],[412,411],[413,412],[414,413],[415,414],[416,415],[417,416],[418,417],[419,418],[420,419],[421,420],[422,421],[423,422],[424,423],[425,424],[426,425],[427,426],[428,427],[429,428],[430,429],[431,430],[432,431],[433,432],[434,433],[435,434],[436,435],[437,436],[438,437],[439,438],[440,439],[441,440],[442,441],[443,442],[444,443],[445,444],[446,445],[447,446],[448,447],[449,448],[450,449],[451,450],[452,451],[453,452],[454,453],[455,454],[456,455],[457,456],[458,457],[459,458],[460,459],[461,460],[462,461],[463,462],[464,463],[465,464],[466,465],[467,466],[468,467],[469,468],[470,469],[471,470],[472,471],[473,472],[474,473],[475,474],[476,475],[477,476],[478,477],[479,478],[480,479],[481,480],[482,481],[483,482],[484,483],[485,484],[486,485],[487,486],[488,487],[489,488],[490,489],[491,490],[492,491],[493,492],[494,493],[495,494],[496,495],[497,496],[498,497],[499,498],[0,499]]],[]],
      [[2000,[]],{"$range":[0,2000]}]
    ] },
    solution: {
      approach: `<p><b>Clue:</b> "prerequisites", "order" → topological sort (DSA 20). Kahn’s BFS gives the order and cycle detection in one pass.</p>`,
      code: `class Solution {
    public int[] findOrder(int n, int[][] prerequisites) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        int[] indeg = new int[n];
        for (int[] p : prerequisites) { adj.get(p[1]).add(p[0]); indeg[p[0]]++; } // edge b -> a
        Deque<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < n; i++) if (indeg[i] == 0) q.add(i);
        int[] order = new int[n];
        int k = 0;
        while (!q.isEmpty()) {
            int c = q.poll();
            order[k++] = c;
            for (int nxt : adj.get(c)) if (--indeg[nxt] == 0) q.add(nxt);
        }
        return k == n ? order : new int[0];        // leftover nodes = cycle
    }
}`,
      alt: [{ lang: 'python', code: `from collections import deque

def find_order(n, prerequisites):
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for a, b in prerequisites:                 # edge b -> a
        adj[b].append(a)
        indeg[a] += 1
    q = deque(i for i in range(n) if indeg[i] == 0)
    order = []
    while q:
        c = q.popleft()
        order.append(c)
        for nxt in adj[c]:
            indeg[nxt] -= 1
            if indeg[nxt] == 0:
                q.append(nxt)
    return order if len(order) == n else []    # leftover nodes = cycle` },
        { lang: 'js', code: `function findOrder(n, prerequisites) {
  const adj = Array.from({ length: n }, () => []);
  const indeg = new Array(n).fill(0);
  for (const [a, b] of prerequisites) {        // edge b -> a
    adj[b].push(a);
    indeg[a]++;
  }
  const order = [];                            // doubles as the queue: read index = head
  for (let i = 0; i < n; i++) if (indeg[i] === 0) order.push(i);
  for (let head = 0; head < order.length; head++) {
    for (const nxt of adj[order[head]]) {
      if (--indeg[nxt] === 0) order.push(nxt);
    }
  }
  return order.length === n ? order : [];      // leftover nodes = cycle
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<int> findOrder(int n, vector<vector<int>>& prerequisites) {
        vector<vector<int>> adj(n);
        vector<int> indeg(n, 0);
        for (auto& p : prerequisites) {        // edge b -> a
            adj[p[1]].push_back(p[0]);
            indeg[p[0]]++;
        }
        vector<int> order;                     // doubles as the queue: read index = head
        for (int i = 0; i < n; i++) if (indeg[i] == 0) order.push_back(i);
        for (size_t head = 0; head < order.size(); head++)
            for (int nxt : adj[order[head]])
                if (--indeg[nxt] == 0) order.push_back(nxt);
        if ((int)order.size() != n) return {};     // leftover nodes = cycle
        return order;
    }
};` }],
      dry: { head: ['pop', 'order', 'indegree changes', 'queue'], rows: [['—', '[]', 'indeg = [0,1,1,2]', '[0]'], ['0', '[0]', '1→0, 2→0', '[1, 2]'], ['1', '[0,1]', '3→1', '[2]'], ['2', '[0,1,2]', '3→0', '[3]'], ['3', H.c('g', '[0,1,2,3]'), '—', '[]']] },
      complexity: `<p>Time O(n + E), space O(n + E).</p>`,
      followUps: ['Return the minimum number of semesters (BFS levels).', 'Lexicographically smallest order (priority queue instead of queue).', 'Alien Dictionary: build the edges yourself.']
    }
  });

  practice.push({
    title: 'Longest Repeating Character Replacement', level: 'Medium', tags: ['sliding window', 'frequency count'], companies: ['Google', 'Amazon'],
    statement: `<p><b>Timed: 25 min.</b> Given an uppercase string <code>s</code> and an integer <code>k</code>, you may change at most k characters. Return the length of the longest substring that can be made of one repeated letter.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, 0 ≤ k ≤ N, uppercase English letters`,
    example: `<p>s = "AABABBA", k = 1 → <b>${H.c('g', '4')}</b>: window "AABA" (indexes 0..3) needs one change (B→A) to become "AAAA". "BABB" (indexes 2..5) also works. No window of length 5 has 4 equal letters.</p>`,
    brute: { why: `<p>Every substring: count letters, check length − maxCount ≤ k: O(26·N<sup>2</sup>) = 2.6·10<sup>11</sup>. The waste: neighbouring substrings share almost all their counts.</p>`, code: { lang: 'java', code: `int bruteReplace(String s, int k) {
    int best = 0;
    for (int i = 0; i < s.length(); i++) {
        int[] cnt = new int[26];
        int maxCnt = 0;
        for (int j = i; j < s.length(); j++) {
            maxCnt = Math.max(maxCnt, ++cnt[s.charAt(j) - 'A']);
            if (j - i + 1 - maxCnt <= k) best = Math.max(best, j - i + 1);
        }
    }
    return best;
}`, alt: [{ lang: 'python', code: String.raw`
def character_replacement(s, k):
    best = 0
    for i in range(len(s)):
        cnt = [0] * 26
        max_cnt = 0
        for j in range(i, len(s)):
            idx = ord(s[j]) - ord('A')
            cnt[idx] += 1
            max_cnt = max(max_cnt, cnt[idx])
            if j - i + 1 - max_cnt <= k:
                best = max(best, j - i + 1)
    return best` }, { lang: 'js', code: String.raw`
function characterReplacement(s, k) {
  let best = 0;
  for (let i = 0; i < s.length; i++) {
    const cnt = new Array(26).fill(0);
    let maxCnt = 0;
    for (let j = i; j < s.length; j++) {
      maxCnt = Math.max(maxCnt, ++cnt[s.charCodeAt(j) - 65]);
      if (j - i + 1 - maxCnt <= k) best = Math.max(best, j - i + 1);
    }
  }
  return best;
}` }, { lang: 'cpp', code: String.raw`
int characterReplacement(string s, int k) {
    int best = 0;
    for (int i = 0; i < (int)s.size(); i++) {
        int cnt[26] = {0};
        int maxCnt = 0;
        for (int j = i; j < (int)s.size(); j++) {
            maxCnt = max(maxCnt, ++cnt[s[j] - 'A']);
            if (j - i + 1 - maxCnt <= k) best = max(best, j - i + 1);
        }
    }
    return best;
}` }] } },
    mcq: { q: 'A window is valid when…', options: ['window length − count of its most frequent letter ≤ k', 'it has at most k distinct letters', 'its length ≤ k', 'all letters are equal'], answer: 0, explain: 'Keep the majority letter, change the rest; the "rest" must be at most k.' },
    hints: [`<p>Hint 1: "Longest substring" + a validity condition → variable sliding window.</p>`, `<p>Hint 2: Valid iff (right − left + 1) − maxCount ≤ k, where maxCount is the top letter count in the window.</p>`, `<p>Hint 3: When invalid, move left by one. You never need to decrease maxCount: the answer only grows when a bigger maxCount appears.</p>`],
    tests: { sig: 'string int -> int', fn: 'characterReplacement', cases: [
      [["AABABBA",1],4],
      [["ABAB",2],4],
      [["AAAA",0],4],
      [["A",0],1],
      [["A",1],1],
      [["ABC",0],1],
      [["ABC",3],3],
      [["ABBB",2],4],
      [["AABA",0],2],
      [["ABCDEFG",2],3],
      [["BAAAB",1],4],
      [["ACBBB",3],5],
      [["CACACCBCA",4],9],
      [["ABABBBBCCAB",2],7],
      [["ACCA",1],3],
      [[{"$rep":"A","n":100000},0],100000],
      [[{"$concat":[{"$rep":"A","n":50000},{"$rep":"B","n":50000}]},0],50000],
      [[{"$concat":[{"$rep":"A","n":50000},{"$rep":"B","n":50000}]},50000],100000],
      [[{"$concat":[{"$rep":"A","n":50000},{"$rep":"B","n":50000}]},20000],70000]
    ] },
    solution: {
      approach: `<p><b>Clue:</b> "longest substring" + "at most k changes" → sliding window with a 26-count array (DSA 6). The non-shrinking maxCount trick keeps it O(N).</p>`,
      code: `class Solution {
    public int characterReplacement(String s, int k) {
        int[] cnt = new int[26];
        int left = 0, maxCnt = 0, best = 0;
        for (int right = 0; right < s.length(); right++) {
            maxCnt = Math.max(maxCnt, ++cnt[s.charAt(right) - 'A']);
            while (right - left + 1 - maxCnt > k) {   // too many letters to change
                cnt[s.charAt(left) - 'A']--;
                left++;
            }
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}`,
      alt: [{ lang: 'python', code: `def character_replacement(s, k):
    cnt = [0] * 26
    left = max_cnt = best = 0
    for right, ch in enumerate(s):
        i = ord(ch) - 65
        cnt[i] += 1
        max_cnt = max(max_cnt, cnt[i])
        while right - left + 1 - max_cnt > k:      # too many letters to change
            cnt[ord(s[left]) - 65] -= 1
            left += 1
        best = max(best, right - left + 1)
    return best` },
        { lang: 'js', code: `function characterReplacement(s, k) {
  const cnt = new Array(26).fill(0);
  let left = 0, maxCnt = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    maxCnt = Math.max(maxCnt, ++cnt[s.charCodeAt(right) - 65]);
    while (right - left + 1 - maxCnt > k) {    // too many letters to change
      cnt[s.charCodeAt(left) - 65]--;
      left++;
    }
    best = Math.max(best, right - left + 1);
  }
  return best;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int characterReplacement(string s, int k) {
        int cnt[26] = {};
        int left = 0, maxCnt = 0, best = 0;
        for (int right = 0; right < (int)s.size(); right++) {
            maxCnt = max(maxCnt, ++cnt[s[right] - 'A']);
            while (right - left + 1 - maxCnt > k) {   // too many letters to change
                cnt[s[left] - 'A']--;
                left++;
            }
            best = max(best, right - left + 1);
        }
        return best;
    }
};` }],
      complexity: `<p>Time O(N), space O(26).</p>`,
      followUps: ['Binary string version: Max Consecutive Ones III.', 'Why is a stale (too large) maxCount still safe? Prove it.']
    }
  });

  practice.push({
    title: 'Coin Change (Fewest Coins)', level: 'Medium', tags: ['dynamic programming', 'unbounded knapsack'], companies: ['Amazon', 'Microsoft', 'Goldman Sachs'],
    statement: `<p><b>Timed: 25 min.</b> Given coin denominations (unlimited supply) and an amount, return the fewest coins that make the amount, or −1 if impossible.</p>`,
    constraints: `1 ≤ coins.length ≤ 12, 1 ≤ coins[i] ≤ 2<sup>31</sup> − 1, 0 ≤ amount ≤ 10<sup>4</sup>`,
    example: `<p>coins = [1, 3, 4], amount = 6 → <b>${H.c('g', '2')}</b> (3 + 3). Greedy would pick 4 + 1 + 1 = ${H.c('r', '3 coins')} — a trap from Topic 8.</p>`,
    brute: { why: `<p>Recursively try every coin at every step: branching factor up to 12, depth up to 10<sup>4</sup> → exponential. The waste: "fewest coins for amount 5" is recomputed along countless paths.</p>`, code: { lang: 'java', code: `int bruteCoins(int[] coins, int amount) {
    if (amount == 0) return 0;
    int best = Integer.MAX_VALUE;
    for (int c : coins) {
        if (c > amount) continue;
        int sub = bruteCoins(coins, amount - c);   // same sub-amounts solved again and again
        if (sub != -1) best = Math.min(best, sub + 1);
    }
    return best == Integer.MAX_VALUE ? -1 : best;
}`, alt: [{ lang: 'python', code: String.raw`
def coin_change(coins, amount):
    if amount == 0:
        return 0
    best = float("inf")
    for c in coins:
        if c > amount:
            continue
        sub = coin_change(coins, amount - c)          # same sub-amounts solved again and again
        if sub != -1:
            best = min(best, sub + 1)
    return -1 if best == float("inf") else best` }, { lang: 'js', code: String.raw`
function coinChange(coins, amount) {
  if (amount === 0) return 0;
  let best = Infinity;
  for (const c of coins) {
    if (c > amount) continue;
    const sub = coinChange(coins, amount - c);        // same sub-amounts solved again and again
    if (sub !== -1) best = Math.min(best, sub + 1);
  }
  return best === Infinity ? -1 : best;
}` }, { lang: 'cpp', code: String.raw`
int coinChange(vector<int>& coins, int amount) {
    if (amount == 0) return 0;
    int best = INT_MAX;
    for (int c : coins) {
        if (c > amount) continue;
        int sub = coinChange(coins, amount - c);      // same sub-amounts solved again and again
        if (sub != -1) best = min(best, sub + 1);
    }
    return best == INT_MAX ? -1 : best;
}` }] } },
    mcq: { q: 'What does dp[a] mean in the standard solution?', options: ['Fewest coins that sum exactly to a', 'Number of ways to make a', 'Largest coin used for a', 'Whether coin a exists'], answer: 0, explain: 'Then dp[a] = 1 + min over coins c ≤ a of dp[a − c] (DSA 18).' },
    hints: [`<p>Hint 1: Greedy fails ({1,3,4}, 6). "Fewest" + choices at each step → DP.</p>`, `<p>Hint 2: dp[a] = min over coins c of dp[a − c] + 1, with dp[0] = 0.</p>`, `<p>Hint 3: Fill a from 1 to amount; use a sentinel "infinity" = amount + 1. Watch out: coins can be up to 2<sup>31</sup>−1, so check c ≤ a before subtracting.</p>`],
    tests: { sig: 'int[] int -> int', fn: 'coinChange', cases: [
      [[[1,3,4],6],2],
      [[[2],3],-1],
      [[[1],0],0],
      [[[1,2,5],11],3],
      [[[2],0],0],
      [[[186,419,83,408],6249],20],
      [[[5],10000],2000],
      [[[3,7],10000],1432],
      [[[1],10000],10000],
      [[[2],9999],-1],
      [[[2147483647],10000],-1],
      [[[2147483647,1],10000],10000],
      [[[2,5,10,1],27],4],
      [[[7],0],0],
      [[[5],38],-1],
      [[[2],39],-1],
      [[[2],3],-1]
    ] },
    solution: {
      approach: `<p><b>Clue:</b> "fewest coins", unlimited supply, amount ≤ 10<sup>4</sup> → 1D unbounded-knapsack DP, O(amount × coins) = 1.2·10<sup>5</sup>.</p>`,
      code: `class Solution {
    public int coinChange(int[] coins, int amount) {
        int INF = amount + 1;                   // more coins than could ever be needed
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, INF);
        dp[0] = 0;                              // zero coins make amount 0
        for (int a = 1; a <= amount; a++)
            for (int c : coins)
                if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1;
        return dp[amount] >= INF ? -1 : dp[amount];
    }
}`,
      alt: [{ lang: 'python', code: `def coin_change(coins, amount):
    INF = amount + 1                           # more coins than could ever be needed
    dp = [0] + [INF] * amount                  # zero coins make amount 0
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
    return -1 if dp[amount] >= INF else dp[amount]` },
        { lang: 'js', code: `function coinChange(coins, amount) {
  const INF = amount + 1;                      // more coins than could ever be needed
  const dp = new Array(amount + 1).fill(INF);
  dp[0] = 0;                                   // zero coins make amount 0
  for (let a = 1; a <= amount; a++)
    for (const c of coins)
      if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1;
  return dp[amount] >= INF ? -1 : dp[amount];
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        int INF = amount + 1;                  // more coins than could ever be needed
        vector<int> dp(amount + 1, INF);
        dp[0] = 0;                             // zero coins make amount 0
        for (int a = 1; a <= amount; a++)
            for (int c : coins)
                if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1;
        return dp[amount] >= INF ? -1 : dp[amount];
    }
};` }],
      dry: { head: ['a', '0', '1', '2', '3', '4', '5', '6'], rows: [['dp[a]', '0', '1', '2', '1', '1', '2', H.c('g', '2')], ['via', '—', '1', '1+1', '3', '4', '4+1', '3+3']] },
      complexity: `<p>Time O(amount × coins), space O(amount).</p>`,
      followUps: ['Count the number of ways (Coin Change II) — loop order matters!', 'Reconstruct the coins used.']
    }
  });

  practice.push({
    title: 'Sliding Window Maximum', level: 'Hard', tags: ['monotonic deque', 'sliding window'], companies: ['Amazon', 'Google', 'Citadel'],
    statement: `<p><b>Timed: 30 min.</b> Return the maximum of every contiguous window of size <code>k</code> as the window slides from left to right.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, 1 ≤ k ≤ N, −10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>`,
    example: `${H.arr([1, 3, -1, -3, 5, 3, 6, 7])}<p>k = 3 → <b>[3, 3, 5, 5, 6, 7]</b>. Window [−1, −3, 5] has max ${H.c('g', '5')}.</p>`,
    brute: { why: `<p>Scan each window: O(N·k) = 10<sup>10</sup> when k = N/2. A heap gives O(N log N) but needs lazy deletion. The waste: values that can never be a future max (a smaller value left of a bigger one) are kept and rescanned.</p>`, code: { lang: 'java', code: `int[] bruteWindowMax(int[] a, int k) {
    int[] res = new int[a.length - k + 1];
    for (int i = 0; i + k <= a.length; i++) {
        int m = Integer.MIN_VALUE;
        for (int j = i; j < i + k; j++) m = Math.max(m, a[j]);
        res[i] = m;
    }
    return res;
}`, alt: [{ lang: 'python', code: String.raw`
def max_sliding_window(nums, k):
    res = []
    for i in range(len(nums) - k + 1):
        m = nums[i]
        for j in range(i, i + k):
            m = max(m, nums[j])
        res.append(m)
    return res` }, { lang: 'js', code: String.raw`
function maxSlidingWindow(nums, k) {
  const res = new Array(nums.length - k + 1);
  for (let i = 0; i + k <= nums.length; i++) {
    let m = -Infinity;
    for (let j = i; j < i + k; j++) m = Math.max(m, nums[j]);
    res[i] = m;
  }
  return res;
}` }, { lang: 'cpp', code: String.raw`
vector<int> maxSlidingWindow(vector<int>& nums, int k) {
    vector<int> res(nums.size() - k + 1);
    for (int i = 0; i + k <= (int)nums.size(); i++) {
        int m = INT_MIN;
        for (int j = i; j < i + k; j++) m = max(m, nums[j]);
        res[i] = m;
    }
    return res;
}` }] } },
    mcq: { q: 'Why may we discard a value that has a larger value to its right inside the window?', options: ['The larger one stays in the window longer and is bigger, so the smaller can never be a max again', 'To save memory only', 'Because the array is sorted', 'We may not discard it'], answer: 0, explain: 'Dominated elements are useless → keep a decreasing deque (DSA 14).' },
    hints: [`<p>Hint 1: A value is useless once a bigger value appears after it.</p>`, `<p>Hint 2: Deque of indices with decreasing values: pop from the back while smaller than the new value; the front is the max.</p>`, `<p>Hint 3: Pop the front if its index ≤ i − k (left the window). Record the front once i ≥ k − 1.</p>`],
    tests: { sig: 'int[] int -> int[]', fn: 'maxSlidingWindow', cases: [
      [[[1,3,-1,-3,5,3,6,7],3],[3,3,5,5,6,7]],
      [[[1],1],[1]],
      [[[1,-1],1],[1,-1]],
      [[[9,11],2],[11]],
      [[[4,3,2,1],2],[4,3,2]],
      [[[1,2,3,4],2],[2,3,4]],
      [[[5,5,5,5],3],[5,5]],
      [[[-10000,10000,-10000],2],[10000,10000]],
      [[[4,-2,3,-5,-1,-2,2,-3,-3,-1],6],[4,3,3,2,2]],
      [[[-1,2,2,-5,3,0,-2,5,-5,-5,5,4],1],[-1,2,2,-5,3,0,-2,5,-5,-5,5,4]],
      [[[1,1,2,-1,4,-4],5],[4,4]],
      [[[-2,5,-5,1,4,-2],5],[5,5]],
      [[{"$range":[-10000,10000]},3],{"$range":[-9998,10000]}],
      [[{"$range":[10000,-10000,-1]},3],{"$range":[10000,-9998,-1]}],
      [[{"$rep":5,"n":100000},50000],{"$rep":5,"n":50001}],
      [[{"$rep":-7,"n":100000},100000],[-7]],
      [[{"$concat":[{"$rep":0,"n":99999},[10000]]},1000],{"$concat":[{"$rep":0,"n":99000},[10000]]}]
    ] },
    solution: {
      approach: `<p><b>Clue:</b> "max of every window of size k" → monotonic deque, O(N) total.</p>`,
      code: `class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        int n = nums.length;
        int[] res = new int[n - k + 1];
        Deque<Integer> dq = new ArrayDeque<>();              // indices, values decreasing
        for (int i = 0; i < n; i++) {
            if (!dq.isEmpty() && dq.peekFirst() <= i - k) dq.pollFirst();      // left the window
            while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i]) dq.pollLast(); // dominated
            dq.offerLast(i);
            if (i >= k - 1) res[i - k + 1] = nums[dq.peekFirst()];             // front = max
        }
        return res;
    }
}`,
      alt: [{ lang: 'python', code: `from collections import deque

def max_sliding_window(nums, k):
    res = []
    dq = deque()                               # indices, values decreasing
    for i, x in enumerate(nums):
        if dq and dq[0] <= i - k:
            dq.popleft()                       # left the window
        while dq and nums[dq[-1]] <= x:
            dq.pop()                           # dominated
        dq.append(i)
        if i >= k - 1:
            res.append(nums[dq[0]])            # front = max
    return res` },
        { lang: 'js', code: `function maxSlidingWindow(nums, k) {
  const n = nums.length, res = [];
  const dq = new Array(n);                     // indices, values decreasing; head..tail is the deque
  let head = 0, tail = 0;
  for (let i = 0; i < n; i++) {
    if (head < tail && dq[head] <= i - k) head++;                    // left the window
    while (head < tail && nums[dq[tail - 1]] <= nums[i]) tail--;     // dominated
    dq[tail++] = i;
    if (i >= k - 1) res.push(nums[dq[head]]);                        // front = max
  }
  return res;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<int> maxSlidingWindow(vector<int>& nums, int k) {
        int n = nums.size();
        vector<int> res;
        deque<int> dq;                         // indices, values decreasing
        for (int i = 0; i < n; i++) {
            if (!dq.empty() && dq.front() <= i - k) dq.pop_front();         // left the window
            while (!dq.empty() && nums[dq.back()] <= nums[i]) dq.pop_back(); // dominated
            dq.push_back(i);
            if (i >= k - 1) res.push_back(nums[dq.front()]);                // front = max
        }
        return res;
    }
};` }],
      dry: { head: ['i', 'nums[i]', 'deque (values)', 'output'], rows: [['2', '−1', '[3, −1]', '3'], ['3', '−3', '[3, −1, −3]', '3'], ['4', '5', '[5] (3 expired, rest dominated)', '5'], ['6', '6', '[6]', '6'], ['7', '7', '[7]', H.c('g', '7')]] },
      complexity: `<p>Time O(N) amortised, space O(k).</p>`,
      followUps: ['Window minimum at the same time.', 'Shortest subarray with sum ≥ K (deque over prefix sums).', 'Constrained subsequence sum (deque-optimised DP).']
    }
  });

  practice.push({
    title: 'Merge K Sorted Lists', level: 'Hard', tags: ['heap', 'linked list', 'divide and conquer'], companies: ['Amazon', 'Google', 'Meta'],
    statement: `<p><b>Timed: 30 min.</b> Merge <code>k</code> sorted linked lists into one sorted list and return its head.</p>`,
    constraints: `0 ≤ k ≤ 10<sup>4</sup>, total nodes N ≤ 10<sup>4</sup>, −10<sup>4</sup> ≤ val ≤ 10<sup>4</sup>`,
    example: `<p>[[1,4,5],[1,3,4],[2,6]] → <b>${H.c('g', '1→1→2→3→4→4→5→6')}</b>.</p>`,
    brute: { why: `<p>Merge lists one by one into a growing result: list sizes add up to O(N·k) work. Or scan all k heads to find the minimum each step: O(N·k). The waste: re-finding the minimum among k heads from scratch every time.</p>`, code: { lang: 'java', code: `ListNode bruteMerge(ListNode[] lists) {
    ListNode dummy = new ListNode(0), tail = dummy;
    while (true) {
        int best = -1;
        for (int i = 0; i < lists.length; i++)          // O(k) scan for the smallest head
            if (lists[i] != null && (best == -1 || lists[i].val < lists[best].val)) best = i;
        if (best == -1) break;
        tail.next = lists[best]; tail = tail.next;
        lists[best] = lists[best].next;
    }
    return dummy.next;
}`, alt: [{ lang: 'python', code: String.raw`
def merge_k_lists(lists):
    dummy = ListNode(0)
    tail = dummy
    while True:
        best = -1
        for i in range(len(lists)):                   # O(k) scan for the smallest head
            if lists[i] is not None and (best == -1 or lists[i].val < lists[best].val):
                best = i
        if best == -1:
            break
        tail.next = lists[best]
        tail = tail.next
        lists[best] = lists[best].next
    return dummy.next` }, { lang: 'js', code: String.raw`
function mergeKLists(lists) {
  const dummy = new ListNode(0);
  let tail = dummy;
  while (true) {
    let best = -1;
    for (let i = 0; i < lists.length; i++)            // O(k) scan for the smallest head
      if (lists[i] !== null && (best === -1 || lists[i].val < lists[best].val)) best = i;
    if (best === -1) break;
    tail.next = lists[best]; tail = tail.next;
    lists[best] = lists[best].next;
  }
  return dummy.next;
}` }, { lang: 'cpp', code: String.raw`
ListNode* mergeKLists(vector<ListNode*>& lists) {
    ListNode dummy(0);
    ListNode* tail = &dummy;
    while (true) {
        int best = -1;
        for (int i = 0; i < (int)lists.size(); i++)   // O(k) scan for the smallest head
            if (lists[i] && (best == -1 || lists[i]->val < lists[best]->val)) best = i;
        if (best == -1) break;
        tail->next = lists[best]; tail = tail->next;
        lists[best] = lists[best]->next;
    }
    return dummy.next;
}` }] } },
    mcq: { q: 'Which structure finds the smallest of k heads in O(log k)?', options: ['Min-heap (priority queue) of list nodes', 'Stack', 'Hash map', 'Sorted array rebuilt each step'], answer: 0, explain: '"Merge k sorted" is a heap signature (DSA 16): poll the smallest, push its successor.' },
    hints: [`<p>Hint 1: At any moment the next output node is the smallest of the k current heads.</p>`, `<p>Hint 2: Keep those heads in a min-heap ordered by value.</p>`, `<p>Hint 3: Skip null lists. Use a dummy head. Compare nodes by <code>val</code> (Java: <code>Integer.compare(a.val, b.val)</code>; Python: push <code>(val, index, node)</code> tuples).</p>`],
    tests: { sig: 'ListNode[] -> ListNode', fn: 'mergeKLists', cases: [
      [[[[1,4,5],[1,3,4],[2,6]]],[1,1,2,3,4,4,5,6]],
      [[[]],[]],
      [[[[]]],[]],
      [[[[],[1]]],[1]],
      [[[[5]]],[5]],
      [[[[-10000,10000],[-10000],[0,0]]],[-10000,-10000,0,0,10000]],
      [[[[3],[2],[1]]],[1,2,3]],
      [[[[1,2,3],[4,5,6]]],[1,2,3,4,5,6]],
      [[[[],[],[]]],[]],
      [[[[2,2],[2],[2,2,2]]],[2,2,2,2,2,2]],
      [[{"$rep":[1],"n":10000}],{"$rep":1,"n":10000}],
      [[[{"$range":[0,10000,2]},{"$range":[1,10000,2]}]],{"$range":[0,10000]}],
      [[[{"$rep":7,"n":5000},{"$rep":7,"n":5000}]],{"$rep":7,"n":10000}],
      [[{"$concat":[{"$rep":[],"n":9999},[[1]]]}],[1]]
    ] },
    solution: {
      approach: `<p><b>Clue:</b> "merge k sorted" → min-heap of heads. Alternative: pairwise divide-and-conquer merging, also O(N log k) with O(1) extra space (besides recursion).</p>`,
      code: `class Solution {
    public ListNode mergeKLists(ListNode[] lists) {
        PriorityQueue<ListNode> pq = new PriorityQueue<>((a, b) -> Integer.compare(a.val, b.val));
        for (ListNode head : lists) if (head != null) pq.offer(head);
        ListNode dummy = new ListNode(0), tail = dummy;
        while (!pq.isEmpty()) {
            ListNode node = pq.poll();              // smallest current head
            tail.next = node;
            tail = node;
            if (node.next != null) pq.offer(node.next); // its successor joins the race
        }
        return dummy.next;
    }
}`,
      alt: [{ lang: 'python', code: `import heapq

def merge_k_lists(lists):
    heap = []
    for i, head in enumerate(lists):
        if head:
            heap.append((head.val, i, head))   # i breaks ties so nodes are never compared
    heapq.heapify(heap)
    dummy = tail = ListNode(0)
    while heap:
        _, i, node = heapq.heappop(heap)       # smallest current head
        tail.next = node
        tail = node
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))   # its successor joins the race
    return dummy.next` },
        { lang: 'js', code: `class MinHeap {
  constructor(less) { this.a = []; this.less = less || ((x, y) => x < y); }
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(v) {
    const a = this.a;
    a.push(v);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function mergeKLists(lists) {
  const heap = new MinHeap((a, b) => a.val < b.val);
  for (const head of lists) if (head) heap.push(head);
  const dummy = new ListNode(0);
  let tail = dummy;
  while (heap.size() > 0) {
    const node = heap.pop();                   // smallest current head
    tail.next = node;
    tail = node;
    if (node.next) heap.push(node.next);       // its successor joins the race
  }
  return dummy.next;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    ListNode* mergeKLists(vector<ListNode*>& lists) {
        // priority_queue is a max-heap, so "greater val" means "lower priority": a min-heap
        auto cmp = [](ListNode* a, ListNode* b) { return a->val > b->val; };
        priority_queue<ListNode*, vector<ListNode*>, decltype(cmp)> pq(cmp);
        for (ListNode* head : lists) if (head) pq.push(head);
        ListNode dummy(0);
        ListNode* tail = &dummy;
        while (!pq.empty()) {
            ListNode* node = pq.top();         // smallest current head
            pq.pop();
            tail->next = node;
            tail = node;
            if (node->next) pq.push(node->next);   // its successor joins the race
        }
        return dummy.next;
    }
};` }],
      complexity: `<p>Time O(N log k), space O(k) for the heap.</p>`,
      followUps: ['Merge k sorted arrays and find the smallest range covering one element of each.', 'External merge sort of files that do not fit in memory.']
    }
  });

  practice.push({
    title: 'Trapping Rain Water', level: 'Hard', tags: ['two pointers', 'prefix max', 'monotonic stack'], companies: ['Google', 'Amazon', 'Goldman Sachs'],
    statement: `<p><b>Timed: 30 min.</b> Bars of width 1 have heights <code>height[i]</code>. How much rain water is trapped between them?</p>`,
    constraints: `1 ≤ N ≤ 2·10<sup>4</sup>, 0 ≤ height[i] ≤ 10<sup>5</sup>`,
    example: `${H.arr([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1])}<p>→ <b>${H.c('g', '6')}</b>. Above index 5 (height 0) the water level is min(2, 3) = 2, so 2 units sit there.</p>`,
    brute: { why: `<p>For each bar, scan left for the tallest and right for the tallest: O(N<sup>2</sup>). The waste: the left max of i+1 is just max(left max of i, height[i]) — we keep recomputing it.</p>`, code: { lang: 'java', code: `int bruteTrap(int[] h) {
    int water = 0;
    for (int i = 0; i < h.length; i++) {
        int lm = 0, rm = 0;
        for (int j = 0; j <= i; j++) lm = Math.max(lm, h[j]);
        for (int j = i; j < h.length; j++) rm = Math.max(rm, h[j]);
        water += Math.min(lm, rm) - h[i];
    }
    return water;
}`, alt: [{ lang: 'python', code: String.raw`
def trap(h):
    water = 0
    for i in range(len(h)):
        lm = max(h[:i + 1])
        rm = max(h[i:])
        water += min(lm, rm) - h[i]
    return water` }, { lang: 'js', code: String.raw`
function trap(h) {
  let water = 0;
  for (let i = 0; i < h.length; i++) {
    let lm = 0, rm = 0;
    for (let j = 0; j <= i; j++) lm = Math.max(lm, h[j]);
    for (let j = i; j < h.length; j++) rm = Math.max(rm, h[j]);
    water += Math.min(lm, rm) - h[i];
  }
  return water;
}` }, { lang: 'cpp', code: String.raw`
int trap(vector<int>& h) {
    int water = 0;
    for (int i = 0; i < (int)h.size(); i++) {
        int lm = 0, rm = 0;
        for (int j = 0; j <= i; j++) lm = max(lm, h[j]);
        for (int j = i; j < (int)h.size(); j++) rm = max(rm, h[j]);
        water += min(lm, rm) - h[i];
    }
    return water;
}` }] } },
    mcq: { q: 'With two pointers, why is it safe to settle the side with the smaller max?', options: ['Its water level is decided by its own max, because the other side is known to be at least as tall', 'Because it is closer to the edge', 'Because water flows left', 'It is not safe'], answer: 0, explain: 'If leftMax ≤ rightMax, water at left = leftMax − h[left]; nothing on the right can lower it.' },
    hints: [`<p>Hint 1: Water above i = min(maxLeft(i), maxRight(i)) − height[i].</p>`, `<p>Hint 2: Precompute prefix max and suffix max arrays → O(N) time, O(N) space.</p>`, `<p>Hint 3: Two pointers for O(1) space: move the side whose running max is smaller and add its water.</p>`],
    tests: { sig: 'int[] -> int', fn: 'trap', cases: [
      [[[0,1,0,2,1,0,1,3,2,1,2,1]],6],
      [[[4,2,0,3,2,5]],9],
      [[[1]],0],
      [[[0]],0],
      [[[3,0,3]],3],
      [[[1,2,3,4]],0],
      [[[4,3,2,1]],0],
      [[[2,0,2]],2],
      [[[5,4,1,2]],1],
      [[[0,0,0]],0],
      [[[100000,0,100000]],100000],
      [[[5,2,4,5,2,0,5,3,2]],12],
      [[[5,1,5,5,2,1,4,5,3]],12],
      [[[4,4,0,5,4,1]],4],
      [[{"$concat":[[100000],{"$rep":0,"n":19998},[100000]]}],1999800000],
      [[{"$concat":[{"$range":[0,10000]},{"$range":[10000,0,-1]}]}],0],
      [[{"$concat":[{"$rep":1,"n":1},{"$rep":0,"n":10000},{"$rep":2,"n":1},{"$rep":0,"n":9998},{"$rep":1,"n":1}]}],19998]
    ] },
    solution: {
      approach: `<p><b>Clue:</b> per-position answer depends on max to the left and right → prefix/suffix max (DSA 5), compressed into two pointers (DSA 6).</p>`,
      code: `class Solution {
    public int trap(int[] h) {
        int l = 0, r = h.length - 1, leftMax = 0, rightMax = 0, water = 0;
        while (l < r) {
            leftMax = Math.max(leftMax, h[l]);
            rightMax = Math.max(rightMax, h[r]);
            if (leftMax <= rightMax) water += leftMax - h[l++];   // left side is the bottleneck
            else water += rightMax - h[r--];                       // right side is the bottleneck
        }
        return water;
    }
}`,
      alt: [{ lang: 'python', code: `def trap(h):
    l, r = 0, len(h) - 1
    left_max = right_max = water = 0
    while l < r:
        left_max = max(left_max, h[l])
        right_max = max(right_max, h[r])
        if left_max <= right_max:              # left side is the bottleneck
            water += left_max - h[l]
            l += 1
        else:                                  # right side is the bottleneck
            water += right_max - h[r]
            r -= 1
    return water` },
        { lang: 'js', code: `function trap(h) {
  let l = 0, r = h.length - 1, leftMax = 0, rightMax = 0, water = 0;
  while (l < r) {
    leftMax = Math.max(leftMax, h[l]);
    rightMax = Math.max(rightMax, h[r]);
    if (leftMax <= rightMax) water += leftMax - h[l++];   // left side is the bottleneck
    else water += rightMax - h[r--];                      // right side is the bottleneck
  }
  return water;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int trap(vector<int>& h) {
        int l = 0, r = (int)h.size() - 1, leftMax = 0, rightMax = 0;
        long long water = 0;                   // the total can reach about 2*10^9
        while (l < r) {
            leftMax = max(leftMax, h[l]);
            rightMax = max(rightMax, h[r]);
            if (leftMax <= rightMax) water += leftMax - h[l++];   // left side is the bottleneck
            else water += rightMax - h[r--];                      // right side is the bottleneck
        }
        return (int)water;
    }
};` }],
      complexity: `<p>Time O(N), space O(1).</p>`,
      followUps: ['2D version (Trapping Rain Water II): min-heap from the border inward.', 'Monotonic stack version that fills water layer by layer.']
    }
  });

  practice.push({
    title: 'Word Ladder', level: 'Hard', tags: ['bfs', 'implicit graph', 'strings'], companies: ['Amazon', 'Meta', 'LinkedIn'],
    statement: `<p><b>Timed: 35 min.</b> Transform <code>beginWord</code> into <code>endWord</code> changing one letter at a time; every intermediate word must be in <code>wordList</code>. Return the number of words in the shortest sequence (including both ends), or 0.</p>`,
    constraints: `1 ≤ word length ≤ 10, 1 ≤ wordList.length ≤ 5000, lowercase letters, all words the same length`,
    example: `<p>hit → hot → dot → dog → cog with list [hot, dot, dog, lot, log, cog] → <b>${H.c('g', '5')}</b>.</p>`,
    brute: { why: `<p>DFS over all transformation sequences, keeping the shortest: exponential paths. The waste: DFS explores long paths first and revisits words via different routes.</p>`, code: { lang: 'java', code: `int bruteLadder(String cur, String end, Set<String> dict, Set<String> onPath) {
    if (cur.equals(end)) return 1;
    int best = 0;
    for (String w : dict) {
        if (onPath.contains(w) || !oneApart(cur, w)) continue;
        onPath.add(w);
        int sub = bruteLadder(w, end, dict, onPath);   // explores every simple path: exponential
        onPath.remove(w);
        if (sub > 0 && (best == 0 || sub + 1 < best)) best = sub + 1;
    }
    return best;
}
boolean oneApart(String a, String b) {
    int diff = 0;
    for (int i = 0; i < a.length(); i++) if (a.charAt(i) != b.charAt(i)) diff++;
    return diff == 1;
}`, alt: [{ lang: 'python', code: String.raw`
def ladder_length(cur, end, words, on_path):
    if cur == end:
        return 1
    best = 0
    for w in words:
        if w in on_path or not one_apart(cur, w):
            continue
        on_path.add(w)
        sub = ladder_length(w, end, words, on_path)   # explores every simple path: exponential
        on_path.remove(w)
        if sub > 0 and (best == 0 or sub + 1 < best):
            best = sub + 1
    return best

def one_apart(a, b):
    return sum(1 for x, y in zip(a, b) if x != y) == 1` }, { lang: 'js', code: String.raw`
function ladderLength(cur, end, words, onPath) {
  if (cur === end) return 1;
  let best = 0;
  for (const w of words) {
    if (onPath.has(w) || !oneApart(cur, w)) continue;
    onPath.add(w);
    const sub = ladderLength(w, end, words, onPath);  // explores every simple path: exponential
    onPath.delete(w);
    if (sub > 0 && (best === 0 || sub + 1 < best)) best = sub + 1;
  }
  return best;
}

function oneApart(a, b) {
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  return diff === 1;
}` }, { lang: 'cpp', code: String.raw`
bool oneApart(const string& a, const string& b) {
    int diff = 0;
    for (size_t i = 0; i < a.size(); i++) if (a[i] != b[i]) diff++;
    return diff == 1;
}

int ladderLength(const string& cur, const string& end, const unordered_set<string>& words, unordered_set<string>& onPath) {
    if (cur == end) return 1;
    int best = 0;
    for (auto& w : words) {
        if (onPath.count(w) || !oneApart(cur, w)) continue;
        onPath.insert(w);
        int sub = ladderLength(w, end, words, onPath);   // explores every simple path: exponential
        onPath.erase(w);
        if (sub > 0 && (best == 0 || sub + 1 < best)) best = sub + 1;
    }
    return best;
}` }] } },
    mcq: { q: '"Shortest sequence of one-letter changes" is…', options: ['BFS on an implicit graph whose nodes are words', 'Dijkstra with weights = letter distance', 'DP over the word list order', 'Backtracking for all paths'], answer: 0, explain: 'All moves cost 1 → unweighted shortest path → BFS (DSA 20). The graph is never given; you generate neighbours.' },
    hints: [`<p>Hint 1: Words are nodes, one-letter changes are edges, each costs 1.</p>`, `<p>Hint 2: BFS from beginWord. Generate neighbours by trying all 26 letters at each position (O(26·L) per word) and checking the dictionary set.</p>`, `<p>Hint 3: Remove words from the set when enqueued (visited). If endWord is not in the list, return 0 immediately.</p>`],
    tests: { sig: 'string string list<string> -> int', fn: 'ladderLength', cases: [
      [["hit","cog",["hot","dot","dog","lot","log","cog"]],5],
      [["hit","cog",["hot","dot","dog","lot","log"]],0],
      [["a","c",["a","b","c"]],2],
      [["hot","dog",["hot","dog"]],0],
      [["hit","hot",["hot"]],2],
      [["hit","hot",["hit","hot"]],2],
      [["abc","abd",["abd"]],2],
      [["lost","cost",["most","fust","miss","cost","lost"]],2],
      [["ab","cd",["ad","cd","cb"]],3],
      [["hot","dot",["dot","hot"]],2],
      [["aaaaaaaaaa","bbbbbbbbbb",["aaaaaaaaaa","aaaaaaaaab","aaaaaaaaba","aaaaaaaabb","aaaaaaabaa","aaaaaaabab","aaaaaaabba","aaaaaaabbb","aaaaaabaaa","aaaaaabaab","aaaaaababa","aaaaaababb","aaaaaabbaa","aaaaaabbab","aaaaaabbba","aaaaaabbbb","aaaaabaaaa","aaaaabaaab","aaaaabaaba","aaaaabaabb","aaaaababaa","aaaaababab","aaaaababba","aaaaababbb","aaaaabbaaa","aaaaabbaab","aaaaabbaba","aaaaabbabb","aaaaabbbaa","aaaaabbbab","aaaaabbbba","aaaaabbbbb","aaaabaaaaa","aaaabaaaab","aaaabaaaba","aaaabaaabb","aaaabaabaa","aaaabaabab","aaaabaabba","aaaabaabbb","aaaababaaa","aaaababaab","aaaabababa","aaaabababb","aaaababbaa","aaaababbab","aaaababbba","aaaababbbb","aaaabbaaaa","aaaabbaaab","aaaabbaaba","aaaabbaabb","aaaabbabaa","aaaabbabab","aaaabbabba","aaaabbabbb","aaaabbbaaa","aaaabbbaab","aaaabbbaba","aaaabbbabb","aaaabbbbaa","aaaabbbbab","aaaabbbbba","aaaabbbbbb","aaabaaaaaa","aaabaaaaab","aaabaaaaba","aaabaaaabb","aaabaaabaa","aaabaaabab","aaabaaabba","aaabaaabbb","aaabaabaaa","aaabaabaab","aaabaababa","aaabaababb","aaabaabbaa","aaabaabbab","aaabaabbba","aaabaabbbb","aaababaaaa","aaababaaab","aaababaaba","aaababaabb","aaabababaa","aaabababab","aaabababba","aaabababbb","aaababbaaa","aaababbaab","aaababbaba","aaababbabb","aaababbbaa","aaababbbab","aaababbbba","aaababbbbb","aaabbaaaaa","aaabbaaaab","aaabbaaaba","aaabbaaabb","aaabbaabaa","aaabbaabab","aaabbaabba","aaabbaabbb","aaabbabaaa","aaabbabaab","aaabbababa","aaabbababb","aaabbabbaa","aaabbabbab","aaabbabbba","aaabbabbbb","aaabbbaaaa","aaabbbaaab","aaabbbaaba","aaabbbaabb","aaabbbabaa","aaabbbabab","aaabbbabba","aaabbbabbb","aaabbbbaaa","aaabbbbaab","aaabbbbaba","aaabbbbabb","aaabbbbbaa","aaabbbbbab","aaabbbbbba","aaabbbbbbb","aabaaaaaaa","aabaaaaaab","aabaaaaaba","aabaaaaabb","aabaaaabaa","aabaaaabab","aabaaaabba","aabaaaabbb","aabaaabaaa","aabaaabaab","aabaaababa","aabaaababb","aabaaabbaa","aabaaabbab","aabaaabbba","aabaaabbbb","aabaabaaaa","aabaabaaab","aabaabaaba","aabaabaabb","aabaababaa","aabaababab","aabaababba","aabaababbb","aabaabbaaa","aabaabbaab","aabaabbaba","aabaabbabb","aabaabbbaa","aabaabbbab","aabaabbbba","aabaabbbbb","aababaaaaa","aababaaaab","aababaaaba","aababaaabb","aababaabaa","aababaabab","aababaabba","aababaabbb","aabababaaa","aabababaab","aababababa","aababababb","aabababbaa","aabababbab","aabababbba","aabababbbb","aababbaaaa","aababbaaab","aababbaaba","aababbaabb","aababbabaa","aababbabab","aababbabba","aababbabbb","aababbbaaa","aababbbaab","aababbbaba","aababbbabb","aababbbbaa","aababbbbab","aababbbbba","aababbbbbb","aabbaaaaaa","aabbaaaaab","aabbaaaaba","aabbaaaabb","aabbaaabaa","aabbaaabab","aabbaaabba","aabbaaabbb","aabbaabaaa","aabbaabaab","aabbaababa","aabbaababb","aabbaabbaa","aabbaabbab","aabbaabbba","aabbaabbbb","aabbabaaaa","aabbabaaab","aabbabaaba","aabbabaabb","aabbababaa","aabbababab","aabbababba","aabbababbb","aabbabbaaa","aabbabbaab","aabbabbaba","aabbabbabb","aabbabbbaa","aabbabbbab","aabbabbbba","aabbabbbbb","aabbbaaaaa","aabbbaaaab","aabbbaaaba","aabbbaaabb","aabbbaabaa","aabbbaabab","aabbbaabba","aabbbaabbb","aabbbabaaa","aabbbabaab","aabbbababa","aabbbababb","aabbbabbaa","aabbbabbab","aabbbabbba","aabbbabbbb","aabbbbaaaa","aabbbbaaab","aabbbbaaba","aabbbbaabb","aabbbbabaa","aabbbbabab","aabbbbabba","aabbbbabbb","aabbbbbaaa","aabbbbbaab","aabbbbbaba","aabbbbbabb","aabbbbbbaa","aabbbbbbab","aabbbbbbba","aabbbbbbbb","abaaaaaaaa","abaaaaaaab","abaaaaaaba","abaaaaaabb","abaaaaabaa","abaaaaabab","abaaaaabba","abaaaaabbb","abaaaabaaa","abaaaabaab","abaaaababa","abaaaababb","abaaaabbaa","abaaaabbab","abaaaabbba","abaaaabbbb","abaaabaaaa","abaaabaaab","abaaabaaba","abaaabaabb","abaaababaa","abaaababab","abaaababba","abaaababbb","abaaabbaaa","abaaabbaab","abaaabbaba","abaaabbabb","abaaabbbaa","abaaabbbab","abaaabbbba","abaaabbbbb","abaabaaaaa","abaabaaaab","abaabaaaba","abaabaaabb","abaabaabaa","abaabaabab","abaabaabba","abaabaabbb","abaababaaa","abaababaab","abaabababa","abaabababb","abaababbaa","abaababbab","abaababbba","abaababbbb","abaabbaaaa","abaabbaaab","abaabbaaba","abaabbaabb","abaabbabaa","abaabbabab","abaabbabba","abaabbabbb","abaabbbaaa","abaabbbaab","abaabbbaba","abaabbbabb","abaabbbbaa","abaabbbbab","abaabbbbba","abaabbbbbb","ababaaaaaa","ababaaaaab","ababaaaaba","ababaaaabb","ababaaabaa","ababaaabab","ababaaabba","ababaaabbb","ababaabaaa","ababaabaab","ababaababa","ababaababb","ababaabbaa","ababaabbab","ababaabbba","ababaabbbb","abababaaaa","abababaaab","abababaaba","abababaabb","ababababaa","ababababab","ababababba","ababababbb","abababbaaa","abababbaab","abababbaba","abababbabb","abababbbaa","abababbbab","abababbbba","abababbbbb","ababbaaaaa","ababbaaaab","ababbaaaba","ababbaaabb","ababbaabaa","ababbaabab","ababbaabba","ababbaabbb","ababbabaaa","ababbabaab","ababbababa","ababbababb","ababbabbaa","ababbabbab","ababbabbba","ababbabbbb","ababbbaaaa","ababbbaaab","ababbbaaba","ababbbaabb","ababbbabaa","ababbbabab","ababbbabba","ababbbabbb","ababbbbaaa","ababbbbaab","ababbbbaba","ababbbbabb","ababbbbbaa","ababbbbbab","ababbbbbba","ababbbbbbb","abbaaaaaaa","abbaaaaaab","abbaaaaaba","abbaaaaabb","abbaaaabaa","abbaaaabab","abbaaaabba","abbaaaabbb","abbaaabaaa","abbaaabaab","abbaaababa","abbaaababb","abbaaabbaa","abbaaabbab","abbaaabbba","abbaaabbbb","abbaabaaaa","abbaabaaab","abbaabaaba","abbaabaabb","abbaababaa","abbaababab","abbaababba","abbaababbb","abbaabbaaa","abbaabbaab","abbaabbaba","abbaabbabb","abbaabbbaa","abbaabbbab","abbaabbbba","abbaabbbbb","abbabaaaaa","abbabaaaab","abbabaaaba","abbabaaabb","abbabaabaa","abbabaabab","abbabaabba","abbabaabbb","abbababaaa","abbababaab","abbabababa","abbabababb","abbababbaa","abbababbab","abbababbba","abbababbbb","abbabbaaaa","abbabbaaab","abbabbaaba","abbabbaabb","abbabbabaa","abbabbabab","abbabbabba","abbabbabbb","abbabbbaaa","abbabbbaab","abbabbbaba","abbabbbabb","abbabbbbaa","abbabbbbab","abbabbbbba","abbabbbbbb","abbbaaaaaa","abbbaaaaab","abbbaaaaba","abbbaaaabb","abbbaaabaa","abbbaaabab","abbbaaabba","abbbaaabbb","abbbaabaaa","abbbaabaab","abbbaababa","abbbaababb","abbbaabbaa","abbbaabbab","abbbaabbba","abbbaabbbb","abbbabaaaa","abbbabaaab","abbbabaaba","abbbabaabb","abbbababaa","abbbababab","abbbababba","abbbababbb","abbbabbaaa","abbbabbaab","abbbabbaba","abbbabbabb","abbbabbbaa","abbbabbbab","abbbabbbba","abbbabbbbb","abbbbaaaaa","abbbbaaaab","abbbbaaaba","abbbbaaabb","abbbbaabaa","abbbbaabab","abbbbaabba","abbbbaabbb","abbbbabaaa","abbbbabaab","abbbbababa","abbbbababb","abbbbabbaa","abbbbabbab","abbbbabbba","abbbbabbbb","abbbbbaaaa","abbbbbaaab","abbbbbaaba","abbbbbaabb","abbbbbabaa","abbbbbabab","abbbbbabba","abbbbbabbb","abbbbbbaaa","abbbbbbaab","abbbbbbaba","abbbbbbabb","abbbbbbbaa","abbbbbbbab","abbbbbbbba","abbbbbbbbb","baaaaaaaaa","baaaaaaaab","baaaaaaaba","baaaaaaabb","baaaaaabaa","baaaaaabab","baaaaaabba","baaaaaabbb","baaaaabaaa","baaaaabaab","baaaaababa","baaaaababb","baaaaabbaa","baaaaabbab","baaaaabbba","baaaaabbbb","baaaabaaaa","baaaabaaab","baaaabaaba","baaaabaabb","baaaababaa","baaaababab","baaaababba","baaaababbb","baaaabbaaa","baaaabbaab","baaaabbaba","baaaabbabb","baaaabbbaa","baaaabbbab","baaaabbbba","baaaabbbbb","baaabaaaaa","baaabaaaab","baaabaaaba","baaabaaabb","baaabaabaa","baaabaabab","baaabaabba","baaabaabbb","baaababaaa","baaababaab","baaabababa","baaabababb","baaababbaa","baaababbab","baaababbba","baaababbbb","baaabbaaaa","baaabbaaab","baaabbaaba","baaabbaabb","baaabbabaa","baaabbabab","baaabbabba","baaabbabbb","baaabbbaaa","baaabbbaab","baaabbbaba","baaabbbabb","baaabbbbaa","baaabbbbab","baaabbbbba","baaabbbbbb","baabaaaaaa","baabaaaaab","baabaaaaba","baabaaaabb","baabaaabaa","baabaaabab","baabaaabba","baabaaabbb","baabaabaaa","baabaabaab","baabaababa","baabaababb","baabaabbaa","baabaabbab","baabaabbba","baabaabbbb","baababaaaa","baababaaab","baababaaba","baababaabb","baabababaa","baabababab","baabababba","baabababbb","baababbaaa","baababbaab","baababbaba","baababbabb","baababbbaa","baababbbab","baababbbba","baababbbbb","baabbaaaaa","baabbaaaab","baabbaaaba","baabbaaabb","baabbaabaa","baabbaabab","baabbaabba","baabbaabbb","baabbabaaa","baabbabaab","baabbababa","baabbababb","baabbabbaa","baabbabbab","baabbabbba","baabbabbbb","baabbbaaaa","baabbbaaab","baabbbaaba","baabbbaabb","baabbbabaa","baabbbabab","baabbbabba","baabbbabbb","baabbbbaaa","baabbbbaab","baabbbbaba","baabbbbabb","baabbbbbaa","baabbbbbab","baabbbbbba","baabbbbbbb","babaaaaaaa","babaaaaaab","babaaaaaba","babaaaaabb","babaaaabaa","babaaaabab","babaaaabba","babaaaabbb","babaaabaaa","babaaabaab","babaaababa","babaaababb","babaaabbaa","babaaabbab","babaaabbba","babaaabbbb","babaabaaaa","babaabaaab","babaabaaba","babaabaabb","babaababaa","babaababab","babaababba","babaababbb","babaabbaaa","babaabbaab","babaabbaba","babaabbabb","babaabbbaa","babaabbbab","babaabbbba","babaabbbbb","bababaaaaa","bababaaaab","bababaaaba","bababaaabb","bababaabaa","bababaabab","bababaabba","bababaabbb","babababaaa","babababaab","bababababa","bababababb","babababbaa","babababbab","babababbba","babababbbb","bababbaaaa","bababbaaab","bababbaaba","bababbaabb","bababbabaa","bababbabab","bababbabba","bababbabbb","bababbbaaa","bababbbaab","bababbbaba","bababbbabb","bababbbbaa","bababbbbab","bababbbbba","bababbbbbb","babbaaaaaa","babbaaaaab","babbaaaaba","babbaaaabb","babbaaabaa","babbaaabab","babbaaabba","babbaaabbb","babbaabaaa","babbaabaab","babbaababa","babbaababb","babbaabbaa","babbaabbab","babbaabbba","babbaabbbb","babbabaaaa","babbabaaab","babbabaaba","babbabaabb","babbababaa","babbababab","babbababba","babbababbb","babbabbaaa","babbabbaab","babbabbaba","babbabbabb","babbabbbaa","babbabbbab","babbabbbba","babbabbbbb","babbbaaaaa","babbbaaaab","babbbaaaba","babbbaaabb","babbbaabaa","babbbaabab","babbbaabba","babbbaabbb","babbbabaaa","babbbabaab","babbbababa","babbbababb","babbbabbaa","babbbabbab","babbbabbba","babbbabbbb","babbbbaaaa","babbbbaaab","babbbbaaba","babbbbaabb","babbbbabaa","babbbbabab","babbbbabba","babbbbabbb","babbbbbaaa","babbbbbaab","babbbbbaba","babbbbbabb","babbbbbbaa","babbbbbbab","babbbbbbba","babbbbbbbb","bbaaaaaaaa","bbaaaaaaab","bbaaaaaaba","bbaaaaaabb","bbaaaaabaa","bbaaaaabab","bbaaaaabba","bbaaaaabbb","bbaaaabaaa","bbaaaabaab","bbaaaababa","bbaaaababb","bbaaaabbaa","bbaaaabbab","bbaaaabbba","bbaaaabbbb","bbaaabaaaa","bbaaabaaab","bbaaabaaba","bbaaabaabb","bbaaababaa","bbaaababab","bbaaababba","bbaaababbb","bbaaabbaaa","bbaaabbaab","bbaaabbaba","bbaaabbabb","bbaaabbbaa","bbaaabbbab","bbaaabbbba","bbaaabbbbb","bbaabaaaaa","bbaabaaaab","bbaabaaaba","bbaabaaabb","bbaabaabaa","bbaabaabab","bbaabaabba","bbaabaabbb","bbaababaaa","bbaababaab","bbaabababa","bbaabababb","bbaababbaa","bbaababbab","bbaababbba","bbaababbbb","bbaabbaaaa","bbaabbaaab","bbaabbaaba","bbaabbaabb","bbaabbabaa","bbaabbabab","bbaabbabba","bbaabbabbb","bbaabbbaaa","bbaabbbaab","bbaabbbaba","bbaabbbabb","bbaabbbbaa","bbaabbbbab","bbaabbbbba","bbaabbbbbb","bbabaaaaaa","bbabaaaaab","bbabaaaaba","bbabaaaabb","bbabaaabaa","bbabaaabab","bbabaaabba","bbabaaabbb","bbabaabaaa","bbabaabaab","bbabaababa","bbabaababb","bbabaabbaa","bbabaabbab","bbabaabbba","bbabaabbbb","bbababaaaa","bbababaaab","bbababaaba","bbababaabb","bbabababaa","bbabababab","bbabababba","bbabababbb","bbababbaaa","bbababbaab","bbababbaba","bbababbabb","bbababbbaa","bbababbbab","bbababbbba","bbababbbbb","bbabbaaaaa","bbabbaaaab","bbabbaaaba","bbabbaaabb","bbabbaabaa","bbabbaabab","bbabbaabba","bbabbaabbb","bbabbabaaa","bbabbabaab","bbabbababa","bbabbababb","bbabbabbaa","bbabbabbab","bbabbabbba","bbabbabbbb","bbabbbaaaa","bbabbbaaab","bbabbbaaba","bbabbbaabb","bbabbbabaa","bbabbbabab","bbabbbabba","bbabbbabbb","bbabbbbaaa","bbabbbbaab","bbabbbbaba","bbabbbbabb","bbabbbbbaa","bbabbbbbab","bbabbbbbba","bbabbbbbbb","bbbaaaaaaa","bbbaaaaaab","bbbaaaaaba","bbbaaaaabb","bbbaaaabaa","bbbaaaabab","bbbaaaabba","bbbaaaabbb","bbbaaabaaa","bbbaaabaab","bbbaaababa","bbbaaababb","bbbaaabbaa","bbbaaabbab","bbbaaabbba","bbbaaabbbb","bbbaabaaaa","bbbaabaaab","bbbaabaaba","bbbaabaabb","bbbaababaa","bbbaababab","bbbaababba","bbbaababbb","bbbaabbaaa","bbbaabbaab","bbbaabbaba","bbbaabbabb","bbbaabbbaa","bbbaabbbab","bbbaabbbba","bbbaabbbbb","bbbabaaaaa","bbbabaaaab","bbbabaaaba","bbbabaaabb","bbbabaabaa","bbbabaabab","bbbabaabba","bbbabaabbb","bbbababaaa","bbbababaab","bbbabababa","bbbabababb","bbbababbaa","bbbababbab","bbbababbba","bbbababbbb","bbbabbaaaa","bbbabbaaab","bbbabbaaba","bbbabbaabb","bbbabbabaa","bbbabbabab","bbbabbabba","bbbabbabbb","bbbabbbaaa","bbbabbbaab","bbbabbbaba","bbbabbbabb","bbbabbbbaa","bbbabbbbab","bbbabbbbba","bbbabbbbbb","bbbbaaaaaa","bbbbaaaaab","bbbbaaaaba","bbbbaaaabb","bbbbaaabaa","bbbbaaabab","bbbbaaabba","bbbbaaabbb","bbbbaabaaa","bbbbaabaab","bbbbaababa","bbbbaababb","bbbbaabbaa","bbbbaabbab","bbbbaabbba","bbbbaabbbb","bbbbabaaaa","bbbbabaaab","bbbbabaaba","bbbbabaabb","bbbbababaa","bbbbababab","bbbbababba","bbbbababbb","bbbbabbaaa","bbbbabbaab","bbbbabbaba","bbbbabbabb","bbbbabbbaa","bbbbabbbab","bbbbabbbba","bbbbabbbbb","bbbbbaaaaa","bbbbbaaaab","bbbbbaaaba","bbbbbaaabb","bbbbbaabaa","bbbbbaabab","bbbbbaabba","bbbbbaabbb","bbbbbabaaa","bbbbbabaab","bbbbbababa","bbbbbababb","bbbbbabbaa","bbbbbabbab","bbbbbabbba","bbbbbabbbb","bbbbbbaaaa","bbbbbbaaab","bbbbbbaaba","bbbbbbaabb","bbbbbbabaa","bbbbbbabab","bbbbbbabba","bbbbbbabbb","bbbbbbbaaa","bbbbbbbaab","bbbbbbbaba","bbbbbbbabb","bbbbbbbbaa","bbbbbbbbab","bbbbbbbbba","bbbbbbbbbb"]],11],
      [["aaaaaaaaaa","bbbbbbbbbb",["aaaaaaaaaa","aaaaaaaaab","aaaaaaaaba","aaaaaaaabb","aaaaaaabaa","aaaaaaabab","aaaaaaabba","aaaaaaabbb","aaaaaabaaa","aaaaaabaab","aaaaaababa","aaaaaababb","aaaaaabbaa","aaaaaabbab","aaaaaabbba","aaaaaabbbb","aaaaabaaaa","aaaaabaaab","aaaaabaaba","aaaaabaabb","aaaaababaa","aaaaababab","aaaaababba","aaaaababbb","aaaaabbaaa","aaaaabbaab","aaaaabbaba","aaaaabbabb","aaaaabbbaa","aaaaabbbab","aaaaabbbba","aaaaabbbbb","aaaabaaaaa","aaaabaaaab","aaaabaaaba","aaaabaaabb","aaaabaabaa","aaaabaabab","aaaabaabba","aaaabaabbb","aaaababaaa","aaaababaab","aaaabababa","aaaabababb","aaaababbaa","aaaababbab","aaaababbba","aaaababbbb","aaaabbaaaa","aaaabbaaab","aaaabbaaba","aaaabbaabb","aaaabbabaa","aaaabbabab","aaaabbabba","aaaabbabbb","aaaabbbaaa","aaaabbbaab","aaaabbbaba","aaaabbbabb","aaaabbbbaa","aaaabbbbab","aaaabbbbba","aaaabbbbbb","aaabaaaaaa","aaabaaaaab","aaabaaaaba","aaabaaaabb","aaabaaabaa","aaabaaabab","aaabaaabba","aaabaaabbb","aaabaabaaa","aaabaabaab","aaabaababa","aaabaababb","aaabaabbaa","aaabaabbab","aaabaabbba","aaabaabbbb","aaababaaaa","aaababaaab","aaababaaba","aaababaabb","aaabababaa","aaabababab","aaabababba","aaabababbb","aaababbaaa","aaababbaab","aaababbaba","aaababbabb","aaababbbaa","aaababbbab","aaababbbba","aaababbbbb","aaabbaaaaa","aaabbaaaab","aaabbaaaba","aaabbaaabb","aaabbaabaa","aaabbaabab","aaabbaabba","aaabbaabbb","aaabbabaaa","aaabbabaab","aaabbababa","aaabbababb","aaabbabbaa","aaabbabbab","aaabbabbba","aaabbabbbb","aaabbbaaaa","aaabbbaaab","aaabbbaaba","aaabbbaabb","aaabbbabaa","aaabbbabab","aaabbbabba","aaabbbabbb","aaabbbbaaa","aaabbbbaab","aaabbbbaba","aaabbbbabb","aaabbbbbaa","aaabbbbbab","aaabbbbbba","aaabbbbbbb","aabaaaaaaa","aabaaaaaab","aabaaaaaba","aabaaaaabb","aabaaaabaa","aabaaaabab","aabaaaabba","aabaaaabbb","aabaaabaaa","aabaaabaab","aabaaababa","aabaaababb","aabaaabbaa","aabaaabbab","aabaaabbba","aabaaabbbb","aabaabaaaa","aabaabaaab","aabaabaaba","aabaabaabb","aabaababaa","aabaababab","aabaababba","aabaababbb","aabaabbaaa","aabaabbaab","aabaabbaba","aabaabbabb","aabaabbbaa","aabaabbbab","aabaabbbba","aabaabbbbb","aababaaaaa","aababaaaab","aababaaaba","aababaaabb","aababaabaa","aababaabab","aababaabba","aababaabbb","aabababaaa","aabababaab","aababababa","aababababb","aabababbaa","aabababbab","aabababbba","aabababbbb","aababbaaaa","aababbaaab","aababbaaba","aababbaabb","aababbabaa","aababbabab","aababbabba","aababbabbb","aababbbaaa","aababbbaab","aababbbaba","aababbbabb","aababbbbaa","aababbbbab","aababbbbba","aababbbbbb","aabbaaaaaa","aabbaaaaab","aabbaaaaba","aabbaaaabb","aabbaaabaa","aabbaaabab","aabbaaabba","aabbaaabbb","aabbaabaaa","aabbaabaab","aabbaababa","aabbaababb","aabbaabbaa","aabbaabbab","aabbaabbba","aabbaabbbb","aabbabaaaa","aabbabaaab","aabbabaaba","aabbabaabb","aabbababaa","aabbababab","aabbababba","aabbababbb","aabbabbaaa","aabbabbaab","aabbabbaba","aabbabbabb","aabbabbbaa","aabbabbbab","aabbabbbba","aabbabbbbb","aabbbaaaaa","aabbbaaaab","aabbbaaaba","aabbbaaabb","aabbbaabaa","aabbbaabab","aabbbaabba","aabbbaabbb","aabbbabaaa","aabbbabaab","aabbbababa","aabbbababb","aabbbabbaa","aabbbabbab","aabbbabbba","aabbbabbbb","aabbbbaaaa","aabbbbaaab","aabbbbaaba","aabbbbaabb","aabbbbabaa","aabbbbabab","aabbbbabba","aabbbbabbb","aabbbbbaaa","aabbbbbaab","aabbbbbaba","aabbbbbabb","aabbbbbbaa","aabbbbbbab","aabbbbbbba","aabbbbbbbb","abaaaaaaaa","abaaaaaaab","abaaaaaaba","abaaaaaabb","abaaaaabaa","abaaaaabab","abaaaaabba","abaaaaabbb","abaaaabaaa","abaaaabaab","abaaaababa","abaaaababb","abaaaabbaa","abaaaabbab","abaaaabbba","abaaaabbbb","abaaabaaaa","abaaabaaab","abaaabaaba","abaaabaabb","abaaababaa","abaaababab","abaaababba","abaaababbb","abaaabbaaa","abaaabbaab","abaaabbaba","abaaabbabb","abaaabbbaa","abaaabbbab","abaaabbbba","abaaabbbbb","abaabaaaaa","abaabaaaab","abaabaaaba","abaabaaabb","abaabaabaa","abaabaabab","abaabaabba","abaabaabbb","abaababaaa","abaababaab","abaabababa","abaabababb","abaababbaa","abaababbab","abaababbba","abaababbbb","abaabbaaaa","abaabbaaab","abaabbaaba","abaabbaabb","abaabbabaa","abaabbabab","abaabbabba","abaabbabbb","abaabbbaaa","abaabbbaab","abaabbbaba","abaabbbabb","abaabbbbaa","abaabbbbab","abaabbbbba","abaabbbbbb","ababaaaaaa","ababaaaaab","ababaaaaba","ababaaaabb","ababaaabaa","ababaaabab","ababaaabba","ababaaabbb","ababaabaaa","ababaabaab","ababaababa","ababaababb","ababaabbaa","ababaabbab","ababaabbba","ababaabbbb","abababaaaa","abababaaab","abababaaba","abababaabb","ababababaa","ababababab","ababababba","ababababbb","abababbaaa","abababbaab","abababbaba","abababbabb","abababbbaa","abababbbab","abababbbba","abababbbbb","ababbaaaaa","ababbaaaab","ababbaaaba","ababbaaabb","ababbaabaa","ababbaabab","ababbaabba","ababbaabbb","ababbabaaa","ababbabaab","ababbababa","ababbababb","ababbabbaa","ababbabbab","ababbabbba","ababbabbbb","ababbbaaaa","ababbbaaab","ababbbaaba","ababbbaabb","ababbbabaa","ababbbabab","ababbbabba","ababbbabbb","ababbbbaaa","ababbbbaab","ababbbbaba","ababbbbabb","ababbbbbaa","ababbbbbab","ababbbbbba","ababbbbbbb","abbaaaaaaa","abbaaaaaab","abbaaaaaba","abbaaaaabb","abbaaaabaa","abbaaaabab","abbaaaabba","abbaaaabbb","abbaaabaaa","abbaaabaab","abbaaababa","abbaaababb","abbaaabbaa","abbaaabbab","abbaaabbba","abbaaabbbb","abbaabaaaa","abbaabaaab","abbaabaaba","abbaabaabb","abbaababaa","abbaababab","abbaababba","abbaababbb","abbaabbaaa","abbaabbaab","abbaabbaba","abbaabbabb","abbaabbbaa","abbaabbbab","abbaabbbba","abbaabbbbb","abbabaaaaa","abbabaaaab","abbabaaaba","abbabaaabb","abbabaabaa","abbabaabab","abbabaabba","abbabaabbb","abbababaaa","abbababaab","abbabababa","abbabababb","abbababbaa","abbababbab","abbababbba","abbababbbb","abbabbaaaa","abbabbaaab","abbabbaaba","abbabbaabb","abbabbabaa","abbabbabab","abbabbabba","abbabbabbb","abbabbbaaa","abbabbbaab","abbabbbaba","abbabbbabb","abbabbbbaa","abbabbbbab","abbabbbbba","abbabbbbbb","abbbaaaaaa","abbbaaaaab","abbbaaaaba","abbbaaaabb","abbbaaabaa","abbbaaabab","abbbaaabba","abbbaaabbb","abbbaabaaa","abbbaabaab","abbbaababa","abbbaababb","abbbaabbaa","abbbaabbab","abbbaabbba","abbbaabbbb","abbbabaaaa","abbbabaaab","abbbabaaba","abbbabaabb","abbbababaa","abbbababab","abbbababba","abbbababbb","abbbabbaaa","abbbabbaab","abbbabbaba","abbbabbabb","abbbabbbaa","abbbabbbab","abbbabbbba","abbbabbbbb","abbbbaaaaa","abbbbaaaab","abbbbaaaba","abbbbaaabb","abbbbaabaa","abbbbaabab","abbbbaabba","abbbbaabbb","abbbbabaaa","abbbbabaab","abbbbababa","abbbbababb","abbbbabbaa","abbbbabbab","abbbbabbba","abbbbabbbb","abbbbbaaaa","abbbbbaaab","abbbbbaaba","abbbbbaabb","abbbbbabaa","abbbbbabab","abbbbbabba","abbbbbabbb","abbbbbbaaa","abbbbbbaab","abbbbbbaba","abbbbbbabb","abbbbbbbaa","abbbbbbbab","abbbbbbbba","abbbbbbbbb","baaaaaaaaa","baaaaaaaab","baaaaaaaba","baaaaaaabb","baaaaaabaa","baaaaaabab","baaaaaabba","baaaaaabbb","baaaaabaaa","baaaaabaab","baaaaababa","baaaaababb","baaaaabbaa","baaaaabbab","baaaaabbba","baaaaabbbb","baaaabaaaa","baaaabaaab","baaaabaaba","baaaabaabb","baaaababaa","baaaababab","baaaababba","baaaababbb","baaaabbaaa","baaaabbaab","baaaabbaba","baaaabbabb","baaaabbbaa","baaaabbbab","baaaabbbba","baaaabbbbb","baaabaaaaa","baaabaaaab","baaabaaaba","baaabaaabb","baaabaabaa","baaabaabab","baaabaabba","baaabaabbb","baaababaaa","baaababaab","baaabababa","baaabababb","baaababbaa","baaababbab","baaababbba","baaababbbb","baaabbaaaa","baaabbaaab","baaabbaaba","baaabbaabb","baaabbabaa","baaabbabab","baaabbabba","baaabbabbb","baaabbbaaa","baaabbbaab","baaabbbaba","baaabbbabb","baaabbbbaa","baaabbbbab","baaabbbbba","baaabbbbbb","baabaaaaaa","baabaaaaab","baabaaaaba","baabaaaabb","baabaaabaa","baabaaabab","baabaaabba","baabaaabbb","baabaabaaa","baabaabaab","baabaababa","baabaababb","baabaabbaa","baabaabbab","baabaabbba","baabaabbbb","baababaaaa","baababaaab","baababaaba","baababaabb","baabababaa","baabababab","baabababba","baabababbb","baababbaaa","baababbaab","baababbaba","baababbabb","baababbbaa","baababbbab","baababbbba","baababbbbb","baabbaaaaa","baabbaaaab","baabbaaaba","baabbaaabb","baabbaabaa","baabbaabab","baabbaabba","baabbaabbb","baabbabaaa","baabbabaab","baabbababa","baabbababb","baabbabbaa","baabbabbab","baabbabbba","baabbabbbb","baabbbaaaa","baabbbaaab","baabbbaaba","baabbbaabb","baabbbabaa","baabbbabab","baabbbabba","baabbbabbb","baabbbbaaa","baabbbbaab","baabbbbaba","baabbbbabb","baabbbbbaa","baabbbbbab","baabbbbbba","baabbbbbbb","babaaaaaaa","babaaaaaab","babaaaaaba","babaaaaabb","babaaaabaa","babaaaabab","babaaaabba","babaaaabbb","babaaabaaa","babaaabaab","babaaababa","babaaababb","babaaabbaa","babaaabbab","babaaabbba","babaaabbbb","babaabaaaa","babaabaaab","babaabaaba","babaabaabb","babaababaa","babaababab","babaababba","babaababbb","babaabbaaa","babaabbaab","babaabbaba","babaabbabb","babaabbbaa","babaabbbab","babaabbbba","babaabbbbb","bababaaaaa","bababaaaab","bababaaaba","bababaaabb","bababaabaa","bababaabab","bababaabba","bababaabbb","babababaaa","babababaab","bababababa","bababababb","babababbaa","babababbab","babababbba","babababbbb","bababbaaaa","bababbaaab","bababbaaba","bababbaabb","bababbabaa","bababbabab","bababbabba","bababbabbb","bababbbaaa","bababbbaab","bababbbaba","bababbbabb","bababbbbaa","bababbbbab","bababbbbba","bababbbbbb","babbaaaaaa","babbaaaaab","babbaaaaba","babbaaaabb","babbaaabaa","babbaaabab","babbaaabba","babbaaabbb","babbaabaaa","babbaabaab","babbaababa","babbaababb","babbaabbaa","babbaabbab","babbaabbba","babbaabbbb","babbabaaaa","babbabaaab","babbabaaba","babbabaabb","babbababaa","babbababab","babbababba","babbababbb","babbabbaaa","babbabbaab","babbabbaba","babbabbabb","babbabbbaa","babbabbbab","babbabbbba","babbabbbbb","babbbaaaaa","babbbaaaab","babbbaaaba","babbbaaabb","babbbaabaa","babbbaabab","babbbaabba","babbbaabbb","babbbabaaa","babbbabaab","babbbababa","babbbababb","babbbabbaa","babbbabbab","babbbabbba","babbbabbbb","babbbbaaaa","babbbbaaab","babbbbaaba","babbbbaabb","babbbbabaa","babbbbabab","babbbbabba","babbbbabbb","babbbbbaaa","babbbbbaab","babbbbbaba","babbbbbabb","babbbbbbaa","babbbbbbab","babbbbbbba","babbbbbbbb","bbaaaaaaaa","bbaaaaaaab","bbaaaaaaba","bbaaaaaabb","bbaaaaabaa","bbaaaaabab","bbaaaaabba","bbaaaaabbb","bbaaaabaaa","bbaaaabaab","bbaaaababa","bbaaaababb","bbaaaabbaa","bbaaaabbab","bbaaaabbba","bbaaaabbbb","bbaaabaaaa","bbaaabaaab","bbaaabaaba","bbaaabaabb","bbaaababaa","bbaaababab","bbaaababba","bbaaababbb","bbaaabbaaa","bbaaabbaab","bbaaabbaba","bbaaabbabb","bbaaabbbaa","bbaaabbbab","bbaaabbbba","bbaaabbbbb","bbaabaaaaa","bbaabaaaab","bbaabaaaba","bbaabaaabb","bbaabaabaa","bbaabaabab","bbaabaabba","bbaabaabbb","bbaababaaa","bbaababaab","bbaabababa","bbaabababb","bbaababbaa","bbaababbab","bbaababbba","bbaababbbb","bbaabbaaaa","bbaabbaaab","bbaabbaaba","bbaabbaabb","bbaabbabaa","bbaabbabab","bbaabbabba","bbaabbabbb","bbaabbbaaa","bbaabbbaab","bbaabbbaba","bbaabbbabb","bbaabbbbaa","bbaabbbbab","bbaabbbbba","bbaabbbbbb","bbabaaaaaa","bbabaaaaab","bbabaaaaba","bbabaaaabb","bbabaaabaa","bbabaaabab","bbabaaabba","bbabaaabbb","bbabaabaaa","bbabaabaab","bbabaababa","bbabaababb","bbabaabbaa","bbabaabbab","bbabaabbba","bbabaabbbb","bbababaaaa","bbababaaab","bbababaaba","bbababaabb","bbabababaa","bbabababab","bbabababba","bbabababbb","bbababbaaa","bbababbaab","bbababbaba","bbababbabb","bbababbbaa","bbababbbab","bbababbbba","bbababbbbb","bbabbaaaaa","bbabbaaaab","bbabbaaaba","bbabbaaabb","bbabbaabaa","bbabbaabab","bbabbaabba","bbabbaabbb","bbabbabaaa","bbabbabaab","bbabbababa","bbabbababb","bbabbabbaa","bbabbabbab","bbabbabbba","bbabbabbbb","bbabbbaaaa","bbabbbaaab","bbabbbaaba","bbabbbaabb","bbabbbabaa","bbabbbabab","bbabbbabba","bbabbbabbb","bbabbbbaaa","bbabbbbaab","bbabbbbaba","bbabbbbabb","bbabbbbbaa","bbabbbbbab","bbabbbbbba","bbabbbbbbb","bbbaaaaaaa","bbbaaaaaab","bbbaaaaaba","bbbaaaaabb","bbbaaaabaa","bbbaaaabab","bbbaaaabba","bbbaaaabbb","bbbaaabaaa","bbbaaabaab","bbbaaababa","bbbaaababb","bbbaaabbaa","bbbaaabbab","bbbaaabbba","bbbaaabbbb","bbbaabaaaa","bbbaabaaab","bbbaabaaba","bbbaabaabb","bbbaababaa","bbbaababab","bbbaababba","bbbaababbb","bbbaabbaaa","bbbaabbaab","bbbaabbaba","bbbaabbabb","bbbaabbbaa","bbbaabbbab","bbbaabbbba","bbbaabbbbb","bbbabaaaaa","bbbabaaaab","bbbabaaaba","bbbabaaabb","bbbabaabaa","bbbabaabab","bbbabaabba","bbbabaabbb","bbbababaaa","bbbababaab","bbbabababa","bbbabababb","bbbababbaa","bbbababbab","bbbababbba","bbbababbbb","bbbabbaaaa","bbbabbaaab","bbbabbaaba","bbbabbaabb","bbbabbabaa","bbbabbabab","bbbabbabba","bbbabbabbb","bbbabbbaaa","bbbabbbaab","bbbabbbaba","bbbabbbabb","bbbabbbbaa","bbbabbbbab","bbbabbbbba","bbbabbbbbb","bbbbaaaaaa","bbbbaaaaab","bbbbaaaaba","bbbbaaaabb","bbbbaaabaa","bbbbaaabab","bbbbaaabba","bbbbaaabbb","bbbbaabaaa","bbbbaabaab","bbbbaababa","bbbbaababb","bbbbaabbaa","bbbbaabbab","bbbbaabbba","bbbbaabbbb","bbbbabaaaa","bbbbabaaab","bbbbabaaba","bbbbabaabb","bbbbababaa","bbbbababab","bbbbababba","bbbbababbb","bbbbabbaaa","bbbbabbaab","bbbbabbaba","bbbbabbabb","bbbbabbbaa","bbbbabbbab","bbbbabbbba","bbbbabbbbb","bbbbbaaaaa","bbbbbaaaab","bbbbbaaaba","bbbbbaaabb","bbbbbaabaa","bbbbbaabab","bbbbbaabba","bbbbbaabbb","bbbbbabaaa","bbbbbabaab","bbbbbababa","bbbbbababb","bbbbbabbaa","bbbbbabbab","bbbbbabbba","bbbbbabbbb","bbbbbbaaaa","bbbbbbaaab","bbbbbbaaba","bbbbbbaabb","bbbbbbabaa","bbbbbbabab","bbbbbbabba","bbbbbbabbb","bbbbbbbaaa","bbbbbbbaab","bbbbbbbaba","bbbbbbbabb","bbbbbbbbaa","bbbbbbbbab","bbbbbbbbba"]],0]
    ] },
    solution: {
      approach: `<p><b>Clue:</b> "shortest transformation", unit moves → BFS on an implicit graph. Neighbour generation by letter substitution avoids comparing all word pairs (5000<sup>2</sup>). Bidirectional BFS is the senior follow-up.</p>`,
      code: `class Solution {
    public int ladderLength(String beginWord, String endWord, List<String> wordList) {
        Set<String> dict = new HashSet<>(wordList);
        if (!dict.contains(endWord)) return 0;
        Deque<String> q = new ArrayDeque<>();
        q.add(beginWord);
        dict.remove(beginWord);
        int steps = 1;                                   // words in the sequence so far
        while (!q.isEmpty()) {
            for (int size = q.size(); size > 0; size--) {
                char[] w = q.poll().toCharArray();
                for (int i = 0; i < w.length; i++) {
                    char orig = w[i];
                    for (char c = 'a'; c <= 'z'; c++) {
                        if (c == orig) continue;
                        w[i] = c;
                        String next = new String(w);
                        if (next.equals(endWord)) return steps + 1;
                        if (dict.remove(next)) q.add(next);   // remove = mark visited
                    }
                    w[i] = orig;
                }
            }
            steps++;
        }
        return 0;
    }
}`,
      alt: [{ lang: 'python', code: `from collections import deque

def ladder_length(begin_word, end_word, word_list):
    words = set(word_list)
    if end_word not in words:
        return 0
    words.discard(begin_word)
    q = deque([begin_word])
    steps = 1                                  # words in the sequence so far
    while q:
        for _ in range(len(q)):
            w = q.popleft()
            for i in range(len(w)):
                for c in 'abcdefghijklmnopqrstuvwxyz':
                    if c == w[i]:
                        continue
                    nxt = w[:i] + c + w[i + 1:]
                    if nxt == end_word:
                        return steps + 1
                    if nxt in words:
                        words.remove(nxt)      # remove = mark visited
                        q.append(nxt)
        steps += 1
    return 0` },
        { lang: 'js', code: `function ladderLength(beginWord, endWord, wordList) {
  const dict = new Set(wordList);
  if (!dict.has(endWord)) return 0;
  dict.delete(beginWord);
  let level = [beginWord];
  let steps = 1;                               // words in the sequence so far
  while (level.length > 0) {
    const next = [];
    for (const word of level) {
      for (let i = 0; i < word.length; i++) {
        for (let code = 97; code <= 122; code++) {
          const c = String.fromCharCode(code);
          if (c === word[i]) continue;
          const cand = word.slice(0, i) + c + word.slice(i + 1);
          if (cand === endWord) return steps + 1;
          if (dict.delete(cand)) next.push(cand);   // delete = mark visited
        }
      }
    }
    level = next;
    steps++;
  }
  return 0;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int ladderLength(string beginWord, string endWord, vector<string>& wordList) {
        unordered_set<string> dict(wordList.begin(), wordList.end());
        if (!dict.count(endWord)) return 0;
        dict.erase(beginWord);
        queue<string> q;
        q.push(beginWord);
        int steps = 1;                         // words in the sequence so far
        while (!q.empty()) {
            for (int size = q.size(); size > 0; size--) {
                string w = q.front();
                q.pop();
                for (size_t i = 0; i < w.size(); i++) {
                    char orig = w[i];
                    for (char c = 'a'; c <= 'z'; c++) {
                        if (c == orig) continue;
                        w[i] = c;
                        if (w == endWord) return steps + 1;
                        if (dict.erase(w)) q.push(w);   // erase = mark visited
                    }
                    w[i] = orig;
                }
            }
            steps++;
        }
        return 0;
    }
};` }],
      complexity: `<p>Time O(M · L · 26 · L) where M = word count, L = word length (building each candidate string costs L). Space O(M · L).</p>`,
      followUps: ['Return all shortest sequences (Word Ladder II: BFS for distances, then DFS backtracking).', 'Bidirectional BFS: why does it cut the explored nodes so much?']
    }
  });

  practice.push({
    title: 'Count of Smaller Numbers After Self', level: 'Hard', tags: ['fenwick tree', 'coordinate compression', 'merge sort'], companies: ['Google', 'Amazon'],
    statement: `<p><b>Timed: 40 min.</b> For each index i, return how many elements to its <b>right</b> are strictly smaller than nums[i].</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, −10<sup>4</sup> ≤ nums[i] ≤ 10<sup>4</sup>`,
    example: `${H.arr([5, 2, 6, 1])}<p>→ <b>${H.c('g', '[2, 1, 1, 0]')}</b>: right of 5 are 2 and 1 (two smaller); right of 2 is 1; right of 6 is 1; nothing right of 1.</p>`,
    brute: { why: `<p>For each i scan everything to its right: O(N<sup>2</sup>) = 10<sup>10</sup>. The waste: we repeatedly count over the same suffix instead of maintaining counts as the suffix grows.</p>`, code: { lang: 'java', code: `List<Integer> bruteSmaller(int[] nums) {
    List<Integer> res = new ArrayList<>();
    for (int i = 0; i < nums.length; i++) {
        int c = 0;
        for (int j = i + 1; j < nums.length; j++) if (nums[j] < nums[i]) c++;
        res.add(c);
    }
    return res;
}`, alt: [{ lang: 'python', code: String.raw`
def count_smaller(nums):
    res = []
    for i in range(len(nums)):
        c = 0
        for j in range(i + 1, len(nums)):
            if nums[j] < nums[i]:
                c += 1
        res.append(c)
    return res` }, { lang: 'js', code: String.raw`
function countSmaller(nums) {
  const res = [];
  for (let i = 0; i < nums.length; i++) {
    let c = 0;
    for (let j = i + 1; j < nums.length; j++) if (nums[j] < nums[i]) c++;
    res.push(c);
  }
  return res;
}` }, { lang: 'cpp', code: String.raw`
vector<int> countSmaller(vector<int>& nums) {
    vector<int> res;
    for (int i = 0; i < (int)nums.size(); i++) {
        int c = 0;
        for (int j = i + 1; j < (int)nums.size(); j++) if (nums[j] < nums[i]) c++;
        res.push_back(c);
    }
    return res;
}` }] } },
    mcq: { q: 'Scanning from right to left, which operation do you need per element?', options: ['"How many seen values are &lt; x?" then "add x" — a prefix count query + point update (Fenwick tree)', 'Find the maximum seen so far', 'Check whether x was seen', 'Sort the seen values every time'], answer: 0, explain: 'Prefix count + point update on a value-indexed array is exactly what a Fenwick tree does in O(log N) (DSA 23).' },
    hints: [`<p>Hint 1: Walk from right to left; the "seen" set is exactly the elements to the right.</p>`, `<p>Hint 2: Keep counts indexed by value; the answer for x is the count of values &lt; x — a prefix sum with updates → Fenwick tree.</p>`, `<p>Hint 3: Shift values by +10<sup>4</sup>+1 so indices are ≥ 1 (or coordinate-compress for large ranges). Query(x − 1) before update(x).</p>`],
    tests: { sig: 'int[] -> list<int>', fn: 'countSmaller', cases: [
      [[[5,2,6,1]],[2,1,1,0]],
      [[[-1]],[0]],
      [[[-1,-1]],[0,0]],
      [[[1,2,3]],[0,0,0]],
      [[[3,2,1]],[2,1,0]],
      [[[2,0,1]],[2,0,0]],
      [[[0,0,0,0]],[0,0,0,0]],
      [[[10000,-10000]],[1,0]],
      [[[-10000,10000]],[0,0]],
      [[[5,5,2,5,1]],[2,2,1,1,0]],
      [[[4,3,4,-2,2,-2,4,0,1]],[6,5,5,0,3,0,2,0,0]],
      [[[-3,-1,-1,-4,2,-4,0,4]],[2,2,2,0,2,0,0,0]],
      [[[-3,0,-4,-1]],[1,2,0,0]],
      [[{"$range":[10000,-10001,-1]}],{"$range":[20000,-1,-1]}],
      [[{"$rep":5,"n":100000}],{"$rep":0,"n":100000}],
      [[{"$concat":[{"$rep":10000,"n":50000},{"$rep":-10000,"n":50000}]}],{"$concat":[{"$rep":50000,"n":50000},{"$rep":0,"n":50000}]}],
      [[{"$range":[-10000,10000]}],{"$rep":0,"n":20000}]
    ] },
    solution: {
      approach: `<p><b>Clue:</b> "count elements to the right that are smaller", N = 10<sup>5</sup> → O(N log N) with a Fenwick tree over values (or merge sort with index tracking — the inversion-count family, DSA 7).</p>`,
      code: `class Solution {
    private int[] bit;
    public List<Integer> countSmaller(int[] nums) {
        int OFFSET = 10001, SIZE = 20002;            // maps -10^4..10^4 to 1..20001
        bit = new int[SIZE + 1];
        Integer[] res = new Integer[nums.length];
        for (int i = nums.length - 1; i >= 0; i--) {
            int idx = nums[i] + OFFSET;
            res[i] = query(idx - 1);                 // how many seen values are smaller
            update(idx);                             // now nums[i] is "seen"
        }
        return Arrays.asList(res);
    }
    private void update(int i) { for (; i < bit.length; i += i & -i) bit[i]++; }
    private int query(int i) { int s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; }
}`,
      alt: [{ lang: 'python', code: `def count_smaller(nums):
    OFFSET, SIZE = 10001, 20002                # maps -10^4..10^4 to 1..20001
    bit = [0] * (SIZE + 1)

    def update(i):
        while i <= SIZE:
            bit[i] += 1
            i += i & -i

    def query(i):                              # how many seen values have index <= i
        s = 0
        while i > 0:
            s += bit[i]
            i -= i & -i
        return s

    res = [0] * len(nums)
    for i in range(len(nums) - 1, -1, -1):
        idx = nums[i] + OFFSET
        res[i] = query(idx - 1)                # how many seen values are smaller
        update(idx)                            # now nums[i] is "seen"
    return res` },
        { lang: 'js', code: `function countSmaller(nums) {
  const OFFSET = 10001, SIZE = 20002;          // maps -10^4..10^4 to 1..20001
  const bit = new Int32Array(SIZE + 1);
  const update = (i) => { for (; i <= SIZE; i += i & -i) bit[i]++; };
  const query = (i) => { let s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; };
  const res = new Array(nums.length);
  for (let i = nums.length - 1; i >= 0; i--) {
    const idx = nums[i] + OFFSET;
    res[i] = query(idx - 1);                   // how many seen values are smaller
    update(idx);                               // now nums[i] is "seen"
  }
  return res;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<int> countSmaller(vector<int>& nums) {
        const int OFFSET = 10001, SIZE = 20002;    // maps -10^4..10^4 to 1..20001
        vector<int> bit(SIZE + 1, 0);
        auto update = [&](int i) { for (; i <= SIZE; i += i & -i) bit[i]++; };
        auto query = [&](int i) { int s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; };
        vector<int> res(nums.size());
        for (int i = (int)nums.size() - 1; i >= 0; i--) {
            int idx = nums[i] + OFFSET;
            res[i] = query(idx - 1);               // how many seen values are smaller
            update(idx);                           // now nums[i] is "seen"
        }
        return res;
    }
};` }],
      dry: { head: ['i (right→left)', 'nums[i]', 'seen before', 'smaller seen', 'res'], rows: [['3', '1', '{}', '0', '[_, _, _, 0]'], ['2', '6', '{1}', '1', '[_, _, 1, 0]'], ['1', '2', '{1, 6}', '1', '[_, 1, 1, 0]'], ['0', '5', '{1, 2, 6}', '2', H.c('g', '[2, 1, 1, 0]')]] },
      complexity: `<p>Time O(N log V) with V = 20001 value slots; space O(V). With coordinate compression: O(N log N).</p>`,
      followUps: ['Count of range sum (prefix sums + merge sort / BIT).', 'Reverse pairs: nums[i] &gt; 2·nums[j].', 'Values up to 10<sup>9</sup> — compress coordinates first.']
    }
  });

  // =====================================================================
  // QUIZ — mixed pattern recognition
  // =====================================================================
  quiz.push({ q: '"Given an array that may contain negative numbers, find the length of the longest subarray with sum exactly k." First technique?', options: ['Prefix sum + hash map storing the FIRST index of each prefix', 'Sliding window', 'Two pointers after sorting', 'Monotonic stack'], answer: 0, explain: 'Negatives break windows; sorting destroys contiguity. Store first occurrence of each prefix sum to maximise length.' });
  quiz.push({ q: 'Constraint says <code>N ≤ 18</code> and asks for the best way to visit all cities. Target complexity?', options: ['O(2<sup>N</sup> · N<sup>2</sup>) bitmask DP', 'O(N log N)', 'O(N!) is required', 'O(N<sup>3</sup>) Floyd-Warshall only'], answer: 0, explain: '2<sup>18</sup> · 18<sup>2</sup> ≈ 8.5·10<sup>7</sup> fits; 18! ≈ 6.4·10<sup>15</sup> does not. Small N + "visit all" = bitmask DP (DSA 24).' });
  quiz.push({ q: '"Find the minimum largest distance between adjacent gas stations after adding k stations." Which phrase is the giveaway?', options: ['"minimum largest" — minimise the maximum → binary search on the answer', '"gas stations" → greedy', '"adjacent" → two pointers', '"add k" → heap is the only option'], answer: 0, explain: 'Minimise-the-maximum with a monotone feasibility check is the binary-search-on-answer signature.' });
  quiz.push({ q: 'Which statement about the 10<sup>8</sup>-operations-per-second rule is most accurate?', options: ['It is a rough budget; constants, cache behaviour and language speed shift it', 'It is an exact law for every computer', 'It only applies to C++', 'It means O(N<sup>2</sup>) always passes for N = 10<sup>5</sup>'], answer: 0, explain: 'It is an estimate for planning. N = 10<sup>5</sup> squared is 10<sup>10</sup>, about 100 seconds.' });
  quiz.push({ q: 'In the 8-step approach, when should you start writing real code?', options: ['After clarifying, examples, brute force, optimising and agreeing on the approach', 'Immediately, to save time', 'Only after the interviewer gives the solution', 'After writing all test cases in code'], answer: 0, explain: 'Coding before agreement is the most common process mistake; the thinking steps make the coding short.' });
  quiz.push({ q: 'Your binary search hangs on input [1, 3] with target 2. Most likely bug?', options: ['<code>lo = mid</code> instead of <code>lo = mid + 1</code>', '<code>hi = mid</code>', 'Using a 64-bit integer type (<code>long</code> / <code>long long</code>)', 'The array is too small'], answer: 0, explain: 'With two elements mid == lo, so lo = mid makes no progress.' });
  quiz.push({ q: 'BFS on a grid where moving into a cell costs either 0 or 1. Best algorithm?', options: ['0-1 BFS with a deque (push front for 0, back for 1)', 'Plain BFS with a queue', 'DFS', 'Floyd-Warshall'], answer: 0, explain: 'Plain BFS assumes equal weights. 0-1 BFS is Dijkstra specialised to weights 0/1, O(V + E) (DSA 21).' });
  quiz.push({ q: 'Workload: 10<sup>5</sup> range-sum queries and 10<sup>5</sup> point updates on 10<sup>5</sup> numbers. Best fit?', options: ['Fenwick tree (O(log N) each)', 'Prefix sums rebuilt after each update', 'Naive loop per query', 'Sorting'], answer: 0, explain: 'Prefix sums make updates O(N) → 10<sup>10</sup> total. Fenwick: ~3.4·10<sup>6</sup>.' });
  quiz.push({ q: 'Greedy coin change works for coins {1, 5, 10, 25} but not for {1, 3, 4}. What should you do before coding a greedy in an interview?', options: ['Try to break it with a small counterexample, or sketch an exchange argument', 'Trust it if it passes the sample', 'Always use DP instead of greedy', 'Sort coins descending, which fixes it'], answer: 0, explain: 'Greedy needs a proof; a one-minute counterexample hunt is the practical substitute.' });
  quiz.push({ q: 'You compute <code>(lo + hi) / 2</code> with lo = hi = 2·10<sup>9</sup> in 32-bit ints (Java, C++). What happens?', options: ['Overflow: the sum wraps negative and mid becomes negative', 'It throws an arithmetic exception', 'It returns 2·10<sup>9</sup>', 'It promotes to long automatically'], answer: 0, explain: 'A 32-bit int wraps silently (Python ints never overflow; JavaScript numbers are doubles). Use lo + (hi − lo) / 2.' });
  quiz.push({ q: 'Why do interleaved (mixed) practice sets beat blocked sets for interview prep?', options: ['They train choosing the pattern, not just executing it', 'They are easier', 'They take less time', 'They avoid hard problems'], answer: 0, explain: 'Blocked practice reveals the pattern by the chapter title; interviews do not.' });
  quiz.push({ q: '"Return the k closest points to the origin" with a stream of points. Which choice and why?', options: ['Max-heap of size k (evict the farthest) — O(N log k), works online', 'Sort all points every time', 'Quickselect — needs all data, not online', 'BFS from the origin'], answer: 0, explain: 'Quickselect is great offline, but a stream needs an online structure; the size-k heap keeps only the best k.' });
  quiz.push({ q: 'The interviewer asks "Are you sure about that line?" What does it usually mean and what should you do?', options: ['There is probably a bug there — trace that line with a tiny input out loud', 'They are impressed — move on', 'They want you to rewrite everything', 'They want a different language'], answer: 0, explain: 'Treat it as a hint. Calm tracing beats defensiveness or random edits.' });
  quiz.push({ q: '"List every valid combination of k numbers from 1..9 that sum to n." Pattern?', options: ['Backtracking (choose → explore → unchoose) with pruning', 'Dynamic programming counting ways', 'Sliding window', 'Union-Find'], answer: 0, explain: '"List every" requires generating the objects; counting DP would only give how many.' });
  quiz.push({ q: 'You have one week left before interviews. Best use of time?', options: ['Mixed timed sets, redo error-log problems, mock interviews, sleep', 'Start learning max-flow and suffix automata', 'Read solutions to 200 new problems', 'Practise only your strongest pattern'], answer: 0, explain: 'The last week is for retrieval, weak-spot repair and realistic rehearsal, not new advanced topics.' });

  // =====================================================================
  // INTERVIEW Q&A — meta-questions about patterns, approach and trade-offs
  // =====================================================================
  interview.push({ q: 'You get a problem you have never seen. Walk me through your first five minutes.', level: 'B', a: `<p>I restate the problem in my own words and ask clarifying questions: input size and value ranges, duplicates, negatives, empty input, the exact output format. Then I work the given example by hand and make one edge-case example of my own. Next I state a brute force and its complexity, and compare it with the budget from the constraints — for N = 10<sup>5</sup>, O(N<sup>2</sup>) is about 10<sup>10</sup> steps, too slow. That tells me I need O(N log N) or better. Then I look for the repeated work in the brute force; it usually names the pattern.</p>`, followUps: ['What if the interviewer refuses to give constraints?', 'How long would you spend on the brute force?'] });
  interview.push({ q: 'How do you decide between a sliding window and prefix sums with a hash map?', level: 'I', a: `<p>Both handle contiguous subarrays. A sliding window needs <b>monotonic behaviour</b>: adding an element makes the window "more" (larger sum, more distinct letters), and removing makes it "less", so you know which pointer to move. That holds for non-negative numbers and for "at most k distinct" style conditions. With <b>negative numbers</b> or an <b>exact-target</b> question ("sum equals k", "count subarrays"), the monotonic property fails, so I use prefix sums: sum(i..j) = pf[j] − pf[i−1], and a hash map of earlier prefix values finds matches in O(1).</p>`, followUps: ['Shortest subarray with sum ≥ k and negatives allowed?', 'Count subarrays with at most k odd numbers?'] });
  interview.push({ q: 'How do you recognise "binary search on the answer" when the problem never mentions searching?', level: 'I', a: `<p>Three signs. First, the question asks for the minimum or maximum value of something ("smallest capacity", "minimum speed", "largest minimum distance"). Second, if I guess a candidate answer X, I can check feasibility quickly, usually with a greedy O(N) pass. Third, feasibility is <b>monotone</b>: if X works, every larger X works (or every smaller one). Then I binary search X over its valid range, e.g. [max(weights), sum(weights)], for O(N log range) total.</p>`, followUps: ['Prove monotonicity for Koko eating bananas.', 'What if feasibility is not monotone?'] });
  interview.push({ q: 'Tell me how you would explain the trade-off between a heap and quickselect for the kth largest element.', level: 'I', a: `<p>A min-heap of size k scans once and keeps the k largest values: O(N log k) time, O(k) space, and it works on a <b>stream</b> because it never needs the whole array. Quickselect partitions like quicksort but recurses into one side: O(N) on average and O(1) extra space, but O(N<sup>2</sup>) in the worst case unless I randomise the pivot, and it needs all the data and reorders it. For a one-off batch with large N I would pick quickselect with a random pivot; for streaming or small k, the heap. Sorting is the simplest if N is small.</p>`, followUps: ['How does median-of-medians guarantee O(N)?', 'What if k is close to N?'] });
  interview.push({ q: 'Your code fails a test and you have five minutes left. What do you do?', level: 'B', a: `<p>I stop editing and say I am going to trace. I shrink the failing input to the smallest case that still fails — often 1–3 elements — and walk the code with a state table, comparing each variable with what I intended. The first row where they differ is the bug. I check the usual suspects: loop bounds, initial values, pointer updates that do not make progress, overflow, and visited marking. I make one minimal fix, re-trace the failing case and one previously passing case, then state the complexity.</p>`, followUps: ['What if you cannot find the bug in time?', 'How do you avoid introducing a new bug with the fix?'] });
  interview.push({ q: 'When is it acceptable to submit a brute-force solution?', level: 'B', a: `<p>When it is clearly better than nothing: in an online assessment where passing some test cases earns partial credit, or in a live round when time is nearly up and I cannot finish the optimal version. Even then, I state its complexity, explain why it is too slow for the full constraints, and describe the optimal approach in words. Starting with a correct brute force is also useful as a stepping stone and a mental test oracle. What I avoid is silently submitting brute force as if it were the final answer.</p>`, followUps: ['How do OAs score partial solutions?', 'How do you describe an optimal solution you did not code?'] });
  interview.push({ q: 'BFS or DFS: how do you choose for a graph or grid problem?', level: 'I', a: `<p>If the question asks for the <b>shortest path or minimum steps</b> with equal edge costs, BFS, because it visits nodes in order of distance and the first visit is the shortest. Multiple simultaneous sources → multi-source BFS. For connectivity, counting components, cycle detection, topological order via finishing times, or exploring all paths, DFS is natural. On large grids I prefer iterative versions, because recursive DFS can overflow the stack around 10<sup>4</sup>–10<sup>5</sup> frames. With weighted edges neither works for shortest paths — I switch to Dijkstra or 0-1 BFS.</p>`, followUps: ['Why does BFS fail with weights?', 'Bidirectional BFS: when does it help?'] });
  interview.push({ q: 'How do you know a problem is a DP problem, and how do you design the state?', level: 'A', a: `<p>Signals: a question about the number of ways, a min/max cost, or feasibility, built from a sequence of choices, and a brute-force recursion whose arguments repeat. To design the state, I write one sentence: "dp[i] is the best answer for the first i items" (adding dimensions such as remaining capacity or "holding a stock" when the future depends on them). The check is: does the rest of the problem depend on anything not stored in the state? If yes, add it. The transition comes from asking what the last choice was. Then base cases, fill order and where the answer lives.</p>`, followUps: ['When does greedy suffice instead of DP?', 'How do you reduce memory from O(N·M) to O(M)?'] });
  interview.push({ q: 'You chose a greedy solution. The interviewer asks: "Why is it correct?"', level: 'A', a: `<p>I give an exchange argument. Take any optimal solution; if it differs from mine at the first choice, swap its choice for the greedy one and show the result is no worse — for interval scheduling, replacing the first chosen interval with the one that ends earliest leaves at least as much room for the rest. Repeating this turns any optimal solution into mine without losing quality, so mine is optimal. If I cannot build that argument, I try small counterexamples. If I find one, I switch to DP.</p>`, followUps: ['Show greedy failing on coin change {1, 3, 4}.', 'Why does sorting by end time work but by start time fail?'] });
  interview.push({ q: 'How do you communicate while coding without slowing down?', level: 'B', a: `<p>I narrate intent, not keystrokes: "This loop builds the frequency map", "This helper checks whether a capacity is feasible", "Here I mark visited when enqueuing so nothing is added twice". I pause briefly at decisions such as bounds and initial values and say why. I name variables clearly so the code explains itself, and I split logic into small helpers. If I need to think silently, I say so: "Give me 30 seconds to work out the boundary". Then I summarise what I decided.</p>`, followUps: ['What if the interviewer is silent the whole time?', 'How do you handle being interrupted mid-thought?'] });
  interview.push({ q: 'Design a revision plan for the last two weeks before a big-tech loop.', level: 'I', a: `<p>Week 1: one mixed timed set per day (2–3 problems from different patterns, 20–25 minutes per medium), redo every error-log problem from scratch, and type the main skeletons from memory. Week 2: two full mock interviews with someone watching or an AI interviewer, light daily sets, flash cards of clue → technique, and behavioural stories. Weak patterns get three spaced sessions, strong ones one. The last evening is light review, setup checks and a full night’s sleep. No new advanced topics in the final week.</p>`, followUps: ['How do you measure whether the plan is working?', 'How would you adapt it for a company that emphasises graphs?'] });
  interview.push({ q: 'What changes when an interview allows AI coding assistants?', level: 'A', a: `<p>The grade shifts from typing to judgement. I still clarify, pick the pattern and state the complexity myself, because the assistant will happily produce a solution for a misunderstood problem. I use it to draft code quickly, then review it out loud against a checklist: boundaries, initial values, overflow, visited marking, recursion depth, and edge cases. I write a couple of targeted tests, including a tiny brute-force comparison if possible. Catching a subtle generated bug and explaining the fix is strong evidence of seniority; pasting output without review is a red flag.</p>`, followUps: ['Give an example of a subtle bug an assistant might introduce in BFS.', 'How do you show ownership of AI-generated code?'] });
  interview.push({ q: 'The interviewer adds a twist: "Now the input is too large to fit in memory." How do you respond?', level: 'E', a: `<p>I identify what my algorithm actually needs to keep. For counting and top-k I can stream: hash counts per chunk, or a size-k heap; if the distinct keys do not fit, partition by hash into files and process each file separately, or use approximate structures (count-min sketch, HyperLogLog) if exact answers are not required. Sorting-based solutions become external merge sort: sort chunks that fit, then k-way merge with a heap. Graph problems need partitioning or a distributed framework. I state the I/O cost and what exactness I give up.</p>`, followUps: ['How does external merge sort use a heap?', 'When is an approximate answer acceptable?'] });
  interview.push({ q: 'How do you keep calm and recover after a bad start in a round?', level: 'B', a: `<p>I treat the round as many small steps that are each graded, not as a single pass/fail. If I start badly — wrong pattern, a bug — I name it: "That approach does not handle negatives; let me step back." Then I return to the checklist: brute force, the waste, the next pattern. I slow my speech and write things down, because that lowers stress and helps the interviewer follow me. Recovering cleanly from a mistake is itself positive evidence. After the round I write two lines about it, then focus on the next round.</p>`, followUps: ['What do you do if you blank completely?', 'How do you ask for a hint without sounding lost?'] });

  // Spread correct answers across positions (deterministic rotation) so the right option is not always first.
  function rotateMcq(m, r) {
    if (!m || !m.options) return;
    var n = m.options.length, k = r % n;
    if (!k) return;
    m.options = m.options.slice(k).concat(m.options.slice(0, k));
    m.answer = (m.answer - k + n) % n;
  }
  quiz.forEach(function (q, i) { rotateMcq(q, i * 2 + 1); });
  practice.forEach(function (p, i) { rotateMcq(p.mcq, i + 2); });
  topics.forEach(function (t, i) { (t.problems || []).forEach(function (p) { rotateMcq(p.mcq, i + 1); }); });

  registerModule({
    id: 'dsa28',
    title: 'Interview Mastery: Pattern Recognition & Mock Rounds',
    intro: `<p>This is the capstone of the DSA track. You already know the tools from DSA 1–27: windows and two pointers, hashing, binary search, stacks, trees, heaps, graphs, greedy, DP and the advanced structures. This module is about the step that decides real interviews: <b>picking the right tool, under time pressure, for a problem you have never seen — and explaining your choice out loud</b>.</p>
      <p>You will build a <b>master clue → technique map</b>, learn to read constraints as a complexity budget, follow an 8-step routine for unseen problems, run <b>mixed timed problem sets</b>, replay full <b>mock interview walkthroughs</b>, debug calmly under pressure, communicate trade-offs like a senior engineer, avoid the classic mistakes, and finish with revision checklists for the last week. Every topic has a visualizer, worked examples, and an "AI era" section on how assistants change preparation and interviews in 2026.</p>`,
    goals: [
      'Diagnose the right pattern from the wording and constraints of an unseen problem within about 5 minutes, using the master clue → technique map',
      'Turn any constraint line (N, value ranges, number of queries) into a target complexity and a shortlist of techniques',
      'Run a full 45-minute mock round with the 8-step routine: clarify, examples, brute force, find the waste, optimise, walk through, code, test',
      'Debug a failing solution systematically with the smallest failing input, a state table and the usual-suspects list',
      'Explain trade-offs (time vs space, preprocessing vs queries, average vs worst case, simplicity vs optimality) with a clear, constraint-based choice',
      'Solve a mixed set of 16 problems across 12+ patterns and build a personal error log and last-week revision plan'
    ],
    prereqs: `The whole DSA track, especially DSA 5–6 (prefix sums, two pointers, sliding window), DSA 8 (hashing), DSA 10 (binary search), DSA 14 (stacks/queues), DSA 15–16 (trees, heaps, tries), DSA 17–19 (greedy and DP) and DSA 20–21 (graphs). Advanced modules (DSA 22–27) help with the hardest follow-ups but are not required.`,
    hours: 20,
    langNotes: {
      java: `<p><b>Java:</b> <code>int</code> wraps silently on overflow, so use <code>long</code> for sums, products and the binary-search midpoint (<code>lo + (hi - lo) / 2</code>). Recursion is limited to roughly 10,000 frames, so deep DFS needs an explicit stack. <code>PriorityQueue</code> is a min-heap, <code>ArrayDeque</code> is the stack and the queue, <code>HashMap</code> is O(1) on average and <code>TreeMap</code> is O(log N). Compare boxed values with <code>equals</code>, and sort with <code>Integer.compare</code>, never <code>a - b</code>.</p>`,
      python: `<p><b>Python:</b> integers never overflow, but recursion stops at 1,000 frames, so use loops or an explicit stack for deep DFS. Never use <code>list.pop(0)</code> (O(n)); use <code>collections.deque</code>. <code>heapq</code> is a min-heap only, so push negated values for a max-heap, and push <code>(key, index, item)</code> tuples when items cannot be compared. <code>Counter</code> and <code>defaultdict</code> replace hand-written counting maps, and <code>bisect</code> on a sorted list stands in for <code>TreeMap</code>. Python is 30 to 100 times slower than C++, so keep the loops tight.</p>`,
      js: `<p><b>JavaScript:</b> <code>Number</code> is a double: exact only up to 2<sup>53</sup>, so use <code>BigInt</code> beyond that, and <code>|0</code> truncates to 32 bits. <code>%</code> keeps the sign of the dividend. <code>sort()</code> compares strings unless you pass a comparator. <code>array.shift()</code> is O(n), so keep a read index for BFS queues. There is no built-in heap: the solutions here include a small <code>MinHeap</code> class. The call stack holds about 10,000 frames. <code>Map</code> and <code>Set</code> are O(1) on average; keep a sorted array when you need ordered lookups.</p>`,
      cpp: `<p><b>C++:</b> signed overflow is undefined behaviour, so use <code>long long</code> for sums and products. The default stack is about 8 MB, which is plenty for most recursion but not for 10<sup>5</sup>-deep chains in big frames. <code>priority_queue</code> is a max-heap (use <code>greater&lt;&gt;</code> for a min-heap). <code>map</code> is O(log N) and ordered, <code>unordered_map</code> is O(1) on average. Pass big containers by reference, and remember that <code>%</code> keeps the sign of the dividend.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
