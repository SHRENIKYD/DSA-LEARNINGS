(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // ================= shared helpers for every visualizer in this module =================
  var INF = Infinity;
  function one(k, v) { var o = {}; o[k] = v; return o; }
  function two(k1, v1, k2, v2) { var o = {}; o[k1] = v1; o[k2] = v2; return o; }
  function fmt(d) { return d === INF ? '∞' : String(d); }
  function copyObj(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }

  // "A B 4, B C 2" -> { ids: ['A','B','C'], edges: [['A','B',4], ['B','C',2]] }
  function parseGraph(input, o) {
    o = o || {};
    var maxN = o.maxN || 8, maxE = o.maxE || 16;
    var s = String(input === undefined || input === null ? '' : input).trim();
    if (!s) throw new Error('Type edges like: A B 4, B C 2  (from, to, weight), separated by commas');
    var items = s.split(/[,;\n]+/).map(function (t) { return t.trim(); }).filter(Boolean);
    var ids = [], edges = [];
    items.forEach(function (it) {
      var p = it.split(/\s+/);
      if (p.length !== 3) throw new Error('Each edge needs 3 parts "from to weight", e.g. A B 4 (problem near "' + it + '")');
      var u = p[0], v = p[1], w = Number(p[2]);
      if (!/^[A-Za-z0-9]{1,3}$/.test(u) || !/^[A-Za-z0-9]{1,3}$/.test(v)) throw new Error('Node names must be 1-3 letters or digits, e.g. A or n1');
      if (!Number.isInteger(w)) throw new Error('Weights must be whole numbers (problem near "' + it + '")');
      if (o.zeroOne && w !== 0 && w !== 1) throw new Error('0-1 BFS needs every weight to be exactly 0 or 1');
      if (!o.allowNeg && w < 0) throw new Error('This algorithm needs non-negative weights. Use the Bellman-Ford visualizer for negative edges.');
      if (Math.abs(w) > 999) throw new Error('Keep weights between -999 and 999');
      if (u === v) throw new Error('Self-loops are not allowed here ("' + it + '")');
      if (ids.indexOf(u) < 0) ids.push(u);
      if (ids.indexOf(v) < 0) ids.push(v);
      edges.push([u, v, w]);
    });
    if (ids.length > maxN) throw new Error('Keep it small: at most ' + maxN + ' different nodes so the picture fits');
    if (edges.length > maxE) throw new Error('Keep it small: at most ' + maxE + ' edges');
    if (ids.length < 2) throw new Error('Need at least 2 different nodes');
    // keep the source (first node typed) first, sort the rest so arrays read nicely
    var rest = ids.slice(1).sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); });
    return { ids: [ids[0]].concat(rest), edges: edges };
  }

  // nice fixed spots for nodes named A..H, otherwise a circle
  var PRESET = { A: [8, 30], B: [30, 9], C: [30, 51], D: [55, 9], E: [55, 51], F: [78, 30], G: [94, 9], H: [94, 51] };
  function layout(ids, height) {
    height = height || 60;
    var usePreset = ids.every(function (id) { return PRESET[id]; });
    return ids.map(function (id, i) {
      if (usePreset) return { id: id, label: id, x: PRESET[id][0], y: PRESET[id][1] * height / 60 };
      var t = Math.PI + 2 * Math.PI * i / ids.length;
      return { id: id, label: id, x: Math.round(50 + 40 * Math.cos(t)), y: Math.round(height / 2 + (height / 2 - 9) * Math.sin(t)) };
    });
  }
  function adjOf(G, directed) {
    var A = {};
    G.ids.forEach(function (id) { A[id] = []; });
    G.edges.forEach(function (e) {
      A[e[0]].push([e[1], e[2]]);
      if (!directed) A[e[1]].push([e[0], e[2]]);
    });
    return A;
  }
  function gpart(G, directed, label, hl, ehl, tags) {
    return {
      type: 'graph', label: label, directed: !!directed, height: 60,
      nodes: layout(G.ids, 60),
      edges: G.edges.map(function (e) { return [e[0], e[1], e[2]]; }),
      hl: hl || {}, ehl: ehl || {}, tags: tags || {}
    };
  }
  function distTags(ids, dist) {
    var t = {};
    ids.forEach(function (id) { t[id] = 'd=' + fmt(dist[id]); });
    return t;
  }
  function distArr(ids, dist, hl, label) {
    return { type: 'array', label: label || 'dist[] (best distance known so far)', values: ids.map(function (id) { return fmt(dist[id]); }), idxLabels: ids, hl: hl || {} };
  }
  // stable sorted insert: keeps the "priority queue" shown in the exact order it will be polled
  function pqPush(pq, item) {
    var i = 0;
    while (i < pq.length && pq[i][0] <= item[0]) i++;
    pq.splice(i, 0, item);
  }
  function pathTo(par, src, v) {
    var p = [], cur = v, guard = 0;
    while (cur !== undefined && guard++ < 50) { p.push(cur); if (cur === src) break; cur = par[cur]; }
    return p.reverse().join(' → ');
  }

  // ================= TOPIC 1: Dijkstra =================
  topics.push({
    title: 'Weighted Graphs, Relaxation & Dijkstra with PriorityQueue',
    analogy: `<p>Imagine a <b>water leak spreading through pipes</b> from one tap. Water reaches nearby joints first and far joints later. The moment water reaches a joint, that is the <b>earliest</b> it could ever arrive there — nothing that arrives later can beat it.</p>
      <p>Dijkstra is exactly this: it lets the "water front" spread out from the source, always moving to the <b>closest not-yet-wet</b> place next. A <b>priority queue</b> is the helper that always tells you "which place gets wet next?".</p>`,
    explain: `<p><b>Weighted graph</b> = a graph where every edge has a number (a <i>weight</i>): kilometres, minutes, rupees, latency. The "shortest path" now means the path with the <b>smallest total weight</b>, not the fewest edges.</p>
      <h4>Why plain BFS is not enough</h4>
      <p>BFS counts edges. Look at this tiny map:</p>
      ${H.table(['path', 'edges', 'total weight'], [['A → D', '1', H.c('r', '10')], ['A → B → C → D', '3', H.c('g', '1 + 1 + 1 = 3')]])}
      <p>BFS happily says "A → D, 1 hop", but the cheaper trip is the 3-hop one. Once edges have different weights we need a smarter rule.</p>
      <h4>The one move every shortest-path algorithm uses: relaxation</h4>
      <p>Keep an array <code>dist[]</code> = "best distance I know so far" (start: 0 for the source, ∞ for everyone else). To <b>relax</b> an edge <code>u → v</code> with weight <code>w</code>:</p>
      <pre>if (dist[u] + w &lt; dist[v])  { dist[v] = dist[u] + w;  parent[v] = u; }</pre>
      <p>In words: "if going through <code>u</code> is a cheaper way to reach <code>v</code>, remember that cheaper way". Dijkstra, Bellman-Ford, 0-1 BFS and Floyd-Warshall are all just <b>different orders</b> of doing this same relaxation.</p>
      <h4>Dijkstra's rule (greedy)</h4>
      <ol>
        <li>Put <code>(0, source)</code> in a min priority queue (smallest distance comes out first).</li>
        <li>Poll the smallest <code>(d, u)</code>. If <code>d &gt; dist[u]</code>, this entry is <b>stale</b> (we already found something better) → skip it.</li>
        <li>Otherwise <code>u</code> is now <b>final</b>: relax every edge out of <code>u</code>; each improvement pushes <code>(newDist, v)</code>.</li>
        <li>Repeat until the queue is empty.</li>
      </ol>
      ${H.table(['poll', 'final?', 'relax', 'PQ after'], [
        ['(0,A)', H.c('g', 'A=0'), 'B=4, C=1', '(1,C) (4,B)'],
        ['(1,C)', H.c('g', 'C=1'), 'B: 1+2=3 &lt; 4 ✔, E=6', '(3,B) (4,B) (6,E)'],
        ['(3,B)', H.c('g', 'B=3'), 'D=4', '(4,B) (4,D) (6,E)'],
        ['(4,B)', H.c('r', 'stale, 4 &gt; 3'), 'skip', '(4,D) (6,E)']
      ])}
      <p><b>Why it works:</b> all weights are ≥ 0, so a path can only get longer as you add edges. When the smallest tentative distance comes out of the queue, no other route can sneak in later and beat it.</p>
      <p><b>Cost:</b> each improvement pushes once → at most E pushes; each push/poll is O(log E). Total <b>O((V + E) log V)</b>. Space O(V + E).</p>
      <p><b>Java detail:</b> <code>PriorityQueue</code> has no "decrease-key". So instead of changing an entry we just push a new, better one and ignore old ones when they pop — this is called <b>lazy deletion</b>.</p>`,
    clues: [
      '"<b>minimum time / cost / distance</b> from a source" with <b>non-negative</b> weights → Dijkstra',
      '"network delay", "signal reaches all nodes", "cheapest route", "fastest delivery"',
      'V up to 10<sup>5</sup>, E up to 2·10<sup>5</sup> and weights ≥ 0 → O(E log V) Dijkstra, not Bellman-Ford',
      'edges have <b>different</b> weights (if all weights equal → plain BFS is enough)',
      '"return the path itself" → keep a <code>parent[]</code> array while relaxing',
      '"probability of success" / "max of product" → Dijkstra with a max-heap (multiplying numbers ≤ 1 never increases)'
    ],
    code: [`
// Dijkstra with lazy deletion + path reconstruction. Graph: 0..n-1, edges {u, v, w}, undirected.
import java.util.*;

class Dijkstra {
    static long[] dist;
    static int[] parent;

    static void run(int n, int[][] edges, int src) {
        // 1) adjacency list: for each node, a list of {neighbour, weight}
        List<List<int[]>> g = new ArrayList<>();
        for (int i = 0; i < n; i++) g.add(new ArrayList<>());
        for (int[] e : edges) {
            g.get(e[0]).add(new int[]{e[1], e[2]});
            g.get(e[1]).add(new int[]{e[0], e[2]}); // remove this line for a directed graph
        }
        // 2) dist = infinity everywhere except the source; long avoids overflow on big sums
        dist = new long[n];
        parent = new int[n];
        Arrays.fill(dist, Long.MAX_VALUE);
        Arrays.fill(parent, -1);
        dist[src] = 0;
        // 3) min-heap ordered by distance: entries are {distance, node}
        PriorityQueue<long[]> pq = new PriorityQueue<>((a, b) -> Long.compare(a[0], b[0]));
        pq.add(new long[]{0, src});
        while (!pq.isEmpty()) {
            long[] top = pq.poll();
            long d = top[0];
            int u = (int) top[1];
            if (d > dist[u]) continue;            // stale entry -> lazy deletion
            for (int[] e : g.get(u)) {            // u is final: relax its edges
                int v = e[0];
                long nd = d + e[1];
                if (nd < dist[v]) {
                    dist[v] = nd;
                    parent[v] = u;
                    pq.add(new long[]{nd, v});    // push a NEW entry instead of decrease-key
                }
            }
        }
    }

    static List<Integer> path(int target) {      // walk parents back from target
        List<Integer> p = new ArrayList<>();
        if (dist[target] == Long.MAX_VALUE) return p;   // unreachable
        for (int v = target; v != -1; v = parent[v]) p.add(v);
        Collections.reverse(p);
        return p;
    }

    public static void main(String[] args) {
        // A=0 B=1 C=2 D=3 E=4 F=5 (same graph as the visualizer)
        int[][] edges = {{0,1,4},{0,2,1},{2,1,2},{1,3,1},{2,4,5},{3,4,3},{3,5,6},{4,5,2}};
        run(6, edges, 0);
        System.out.println(Arrays.toString(dist));   // [0, 3, 1, 4, 6, 8]
        System.out.println(path(5));                 // [0, 2, 4, 5]  = A -> C -> E -> F
    }
}`, {
      lang: 'python', run: true, title: 'Same algorithm in Python with heapq (runnable)', code: `import heapq

def dijkstra(n, edges, src):
    g = [[] for _ in range(n)]
    for u, v, w in edges:
        g[u].append((v, w))
        g[v].append((u, w))          # undirected
    dist = [float('inf')] * n
    parent = [-1] * n
    dist[src] = 0
    pq = [(0, src)]                  # heapq is a MIN-heap of tuples
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:              # stale entry
            continue
        for v, w in g[u]:
            if d + w < dist[v]:
                dist[v] = d + w
                parent[v] = u
                heapq.heappush(pq, (dist[v], v))
    return dist, parent

names = "ABCDEF"
edges = [(0,1,4),(0,2,1),(2,1,2),(1,3,1),(2,4,5),(3,4,3),(3,5,6),(4,5,2)]
dist, parent = dijkstra(6, edges, 0)
for v in range(6):
    path, x = [], v
    while x != -1:
        path.append(names[x]); x = parent[x]
    print(names[v], "dist =", dist[v], "path =", " -> ".join(reversed(path)))
` }],
    codeTitle: ['Dijkstra template (Java)', 'Python version'],
    viz: {
      title: 'Dijkstra step by step: dist tags on nodes + PriorityQueue contents',
      input: 'A B 4, A C 1, C B 2, B D 1, C E 5, D E 3, D F 6, E F 2',
      inputLabel: 'Undirected edges "from to weight", comma separated (source = first node). Weights ≥ 0, ≤ 8 nodes.',
      gen: function (input) {
        var G = parseGraph(input, { maxN: 8, maxE: 16 });
        var ids = G.ids, src = ids[0], A = adjOf(G, false);
        var dist = {}, par = {}, done = {}, frames = [], pq = [[0, src]];
        ids.forEach(function (id) { dist[id] = INF; });
        dist[src] = 0;
        function hlNodes(cur, curCls, extra) {
          var h = {};
          ids.forEach(function (id) { if (done[id]) h[id] = 'ok'; });
          if (extra) h[extra] = 'win';
          if (cur) h[cur] = curCls || 'cur';
          return h;
        }
        function treeEdges() {
          var e = {};
          ids.forEach(function (id) { if (par[id] !== undefined) e[par[id] + '-' + id] = 'sel'; });
          return e;
        }
        function pqPart(hlFront) {
          return { type: 'queue', label: 'PriorityQueue (sorted: the front is polled next)', items: pq.map(function (x) { return '(' + x[0] + ',' + x[1] + ')'; }), hl: hlFront ? { 0: 'cur' } : {}, frontLabel: 'poll', backLabel: 'largest' };
        }
        function frame(narr, nodeHl, ehl, dHl, front) {
          frames.push({ narr: narr, parts: [
            gpart(G, false, 'Graph (green = final, amber = being processed, purple edges = shortest-path tree)', nodeHl, ehl, distTags(ids, dist)),
            pqPart(front),
            distArr(ids, dist, dHl)
          ] });
        }
        frame('Start: <b>dist[' + src + '] = 0</b>, everyone else ∞. Push <b>(0,' + src + ')</b> into the priority queue.', one(src, 'sel'), {}, one(0, 'sel'), true);
        var guard = 0;
        while (pq.length && guard++ < 200) {
          var top = pq.shift(), d = top[0], u = top[1];
          if (done[u] || d > dist[u]) {
            frame('Poll <b>(' + d + ',' + u + ')</b> — but dist[' + u + '] is already ' + dist[u] + ' &lt; ' + d + '. This is a <span class="c-r">stale entry</span> left behind earlier. Skip it (lazy deletion).', hlNodes(u, 'bad'), treeEdges(), {}, false);
            continue;
          }
          done[u] = true;
          frame('Poll <b>(' + d + ',' + u + ')</b>: the smallest distance in the queue. Because all weights are ≥ 0, nothing can beat it later → <span class="c-g">' + u + ' is FINAL at ' + d + '</span>. Now relax its edges.', hlNodes(u), treeEdges(), one(ids.indexOf(u), 'ok'), false);
          A[u].forEach(function (nb) {
            var v = nb[0], w = nb[1], nd = d + w, ek = u + '-' + v, eh = treeEdges();
            if (done[v]) {
              eh[ek] = 'done';
              frame('Edge ' + u + '–' + v + ' (w=' + w + '): ' + v + ' is already final → nothing to do.', hlNodes(u), eh, {}, false);
              return;
            }
            if (nd < dist[v]) {
              var old = dist[v];
              dist[v] = nd; par[v] = u; pqPush(pq, [nd, v]);
              eh = treeEdges(); eh[ek] = 'ok';
              frame('Relax ' + u + ' → ' + v + ': ' + d + ' + ' + w + ' = <b>' + nd + '</b> &lt; ' + fmt(old) + ' ✔ Improve dist[' + v + '], parent[' + v + '] = ' + u + ', push <b>(' + nd + ',' + v + ')</b>.', hlNodes(u, 'cur', v), eh, one(ids.indexOf(v), 'ok'), false);
            } else {
              eh[ek] = 'bad';
              frame('Relax ' + u + ' → ' + v + ': ' + d + ' + ' + w + ' = ' + nd + ' is <span class="c-r">not better</span> than ' + fmt(dist[v]) + '. Keep the old value.', hlNodes(u, 'cur'), eh, one(ids.indexOf(v), 'bad'), false);
            }
          });
        }
        var rows = ids.map(function (id) { return id + ': ' + (dist[id] === INF ? 'unreachable' : dist[id] + ' via ' + pathTo(par, src, id)); });
        frames.push({ narr: 'Queue empty → done. The <b>purple edges</b> form the shortest-path tree: following parents back from any node gives its cheapest route.', parts: [
          gpart(G, false, 'Final shortest-path tree', hlNodes(null), treeEdges(), distTags(ids, dist)),
          { type: 'text', label: 'Answers', html: rows.join('<br>') },
          distArr(ids, dist, {})
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'BFS gives the wrong answer on weighted edges', html: `<p>Edges: A–D (10), A–B (1), B–C (1), C–D (1). BFS reaches D in 1 hop and stops caring. Dijkstra polls A(0) → B(1) → C(2) → D(3): ${H.c('g', 'D = 3')} instead of ${H.c('r', '10')}. Lesson: "fewest edges" and "cheapest path" are different questions.</p>` },
      { title: 'A negative edge breaks Dijkstra', html: `<p>Directed edges: A→B (2), A→C (3), C→B (−2). Dijkstra polls B at distance 2 and marks it final. Later C(3) relaxes C→B: 3 + (−2) = ${H.c('g', '1')} — smaller than the "final" 2! Dijkstra's promise "the first pop is the best" only holds when weights are ≥ 0. Use Bellman-Ford here.</p>` },
      { title: 'Stop early when you only need one target', html: `<p>If the question asks for the distance to a single node T, you can <b>return as soon as T is polled</b> (not when it is first pushed). The first poll of T is final; the first push might still be improved.</p>`, code: `
static long distTo(List<List<int[]>> g, int src, int target) {
    long[] dist = new long[g.size()];
    Arrays.fill(dist, Long.MAX_VALUE);
    dist[src] = 0;
    PriorityQueue<long[]> pq = new PriorityQueue<>((a, b) -> Long.compare(a[0], b[0]));
    pq.add(new long[]{0, src});
    while (!pq.isEmpty()) {
        long[] t = pq.poll();
        long d = t[0];
        int u = (int) t[1];
        if (d > dist[u]) continue;              // stale
        if (u == target) return d;              // first POLL of target is the answer
        for (int[] e : g.get(u))
            if (d + e[1] < dist[e[0]]) { dist[e[0]] = d + e[1]; pq.add(new long[]{dist[e[0]], e[0]}); }
    }
    return -1;                                  // unreachable
}` },
      { title: 'Counting the work', html: `<p>V = 10<sup>5</sup>, E = 2·10<sup>5</sup>: heap holds at most E + 1 entries, log₂(2·10<sup>5</sup>) ≈ 18, so ≈ (V + E) · 18 ≈ 5.4·10<sup>6</sup> heap steps. Comfortably fast. Bellman-Ford would need V·E = 2·10<sup>10</sup> steps — far too slow.</p>` }
    ],
    deepDive: `<p><b>Proof sketch (why the first poll is final).</b> Suppose u is polled with distance d but a true shorter path P exists. P starts in the "final" set and must leave it through some edge x → y where y is not final. y's tentative distance ≤ length of P's prefix ≤ length of P &lt; d (weights ≥ 0 means the rest of P adds nothing negative). So y would have been polled before u — contradiction. With one negative edge, "the rest of P adds nothing negative" fails, and so does the proof.</p>
      <p><b>Heap variants.</b> Lazy deletion: O(E log E) = O(E log V) since E ≤ V². An <i>indexed</i> heap with decrease-key keeps at most V entries (less memory). A Fibonacci heap gives O(E + V log V) in theory but is slow in practice due to pointer chasing. For <b>dense graphs</b> (E ≈ V²) the simple O(V²) version — scan an array for the minimum unfinished node, no heap — is actually faster.</p>
      <p><b>Overflow.</b> 10<sup>5</sup> edges × weight 10<sup>9</sup> overflows <code>int</code>. Use <code>long</code> distances, and never compare with <code>Integer.MAX_VALUE + w</code>.</p>
      <p><b>Performance in Java.</b> <code>PriorityQueue&lt;int[]&gt;</code> allocates one small array per push; for 10<sup>6</sup> edges, packing (dist, node) into one <code>long</code> (<code>dist &lt;&lt; 20 | node</code>) and using a primitive heap can be 2–3× faster. A CSR adjacency (two flat int arrays) beats <code>List&lt;List&lt;int[]&gt;&gt;</code> on cache misses.</p>
      <p><b>Production reality.</b> Internet routing (OSPF, IS-IS) runs Dijkstra on each router. Map apps do not run plain Dijkstra over a continent: they use <b>bidirectional search</b>, <b>A*</b> (Dijkstra + an admissible heuristic such as straight-line distance) and preprocessing like <b>contraction hierarchies</b> to answer in milliseconds.</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant writes a Dijkstra template in seconds, so interviewers now push on <i>why</i>: the stale check, overflow, negative edges, the right state for variants.</p>
      <p><b>Use AI as a partner:</b> ask <code>Give me 3 small graphs where Dijkstra without the stale-entry check still gives correct output, and one where it becomes slow</code>, or <code>Generate a random graph test harness comparing my Dijkstra against Bellman-Ford</code>. A brute-force cross-check is the fastest way to trust your code.</p>
      <p><b>Where AI goes wrong:</b> it often uses <code>visited</code> marked at <b>push</b> time (wrong — a later push may be cheaper), forgets the <code>d &gt; dist[u]</code> check, uses <code>int</code> sums that overflow, or applies Dijkstra to graphs with negative edges.</p>
      <p><b>What you must still own:</b> recognising "non-negative weights + single source" from the wording, defining the state when the problem adds extra rules (stops, fuel, time), and proving the greedy step is safe.</p>`,
    problems: [{
      title: 'Network Delay Time (LeetCode 743)', level: 'Medium', tags: ['dijkstra', 'graph'], companies: ['Amazon', 'Google', 'Meta'],
      statement: `<p>There are <code>n</code> network nodes labelled 1..n. <code>times[i] = (u, v, w)</code> means a signal takes <code>w</code> time to travel from u to v (directed). A signal is sent from node <code>k</code>. Return the time it takes for <b>all</b> nodes to receive it, or <b>-1</b> if some node never receives it.</p>`,
      constraints: `1 ≤ k ≤ n ≤ 100, 1 ≤ times.length ≤ 6000, 0 ≤ w ≤ 100, no duplicate edges.`,
      example: `<p>times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2 → ${H.c('g', '2')}</p><p>Node 2 sends at time 0; nodes 1 and 3 get it at time 1; node 4 at time 2. Everyone has it by ${H.c('g', 'time 2')} = the <b>largest</b> shortest distance.</p>`,
      brute: { why: `<p>Try every simple path from k with DFS and keep the minimum arrival time per node. The number of simple paths can be exponential (think of a ladder graph), so this blows up long before n = 100. The waste: re-exploring paths that are already worse than a known arrival time.</p>`, code: `
class Solution {
    int[] best;
    List<List<int[]>> g;
    public int networkDelayTime(int[][] times, int n, int k) {
        g = new ArrayList<>();
        for (int i = 0; i <= n; i++) g.add(new ArrayList<>());
        for (int[] t : times) g.get(t[0]).add(new int[]{t[1], t[2]});
        best = new int[n + 1];
        Arrays.fill(best, Integer.MAX_VALUE);
        dfs(k, 0, new boolean[n + 1]);
        int ans = 0;
        for (int i = 1; i <= n; i++) { if (best[i] == Integer.MAX_VALUE) return -1; ans = Math.max(ans, best[i]); }
        return ans;
    }
    void dfs(int u, int t, boolean[] onPath) {
        if (t >= best[u]) return;          // small prune; still exponential in the worst case
        best[u] = t;
        onPath[u] = true;
        for (int[] e : g.get(u)) if (!onPath[e[0]]) dfs(e[0], t + e[1], onPath);
        onPath[u] = false;
    }
}` },
      mcq: { q: 'All shortest arrival times are known. What is the answer?', options: ['The maximum of them (or -1 if any is ∞)', 'Their sum', 'The minimum of them', 'The arrival time at node n'], answer: 0, explain: 'Every node must receive the signal; the network is "done" when the slowest one does — the max of the shortest distances.' },
      hints: [`<p>"Time for a signal to reach a node" = shortest path from k, with non-negative times. One run of single-source shortest path gives every node's arrival time.</p>`, `<p>Directed adjacency list + Dijkstra with a min-heap of {time, node}. Skip stale entries.</p>`, `<p>Edge cases: an unreachable node (dist stays ∞ → return -1); nodes are 1-indexed, so size arrays n + 1. Recipe: build graph → Dijkstra from k → answer = max dist, or -1.</p>`],
      solution: {
        approach: `<p>Run Dijkstra from k on the directed graph. The answer is the largest finite distance; if any node is still ∞, return -1.</p>`,
        code: `
class Solution {
    public int networkDelayTime(int[][] times, int n, int k) {
        List<List<int[]>> g = new ArrayList<>();
        for (int i = 0; i <= n; i++) g.add(new ArrayList<>());
        for (int[] t : times) g.get(t[0]).add(new int[]{t[1], t[2]});   // directed u -> v
        int[] dist = new int[n + 1];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[k] = 0;
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        pq.add(new int[]{0, k});
        while (!pq.isEmpty()) {
            int[] top = pq.poll();
            int d = top[0], u = top[1];
            if (d > dist[u]) continue;                 // stale
            for (int[] e : g.get(u)) {
                int v = e[0], nd = d + e[1];
                if (nd < dist[v]) { dist[v] = nd; pq.add(new int[]{nd, v}); }
            }
        }
        int ans = 0;
        for (int i = 1; i <= n; i++) {
            if (dist[i] == Integer.MAX_VALUE) return -1;  // someone never hears the signal
            ans = Math.max(ans, dist[i]);
        }
        return ans;
    }
}`,
        alt: [{ lang: 'python', code: `import heapq
from collections import defaultdict

class Solution:
    def networkDelayTime(self, times, n, k):
        g = defaultdict(list)
        for u, v, w in times:
            g[u].append((v, w))
        dist = {}
        pq = [(0, k)]
        while pq:
            d, u = heapq.heappop(pq)
            if u in dist:          # first pop is final
                continue
            dist[u] = d
            for v, w in g[u]:
                if v not in dist:
                    heapq.heappush(pq, (d + w, v))
        return max(dist.values()) if len(dist) == n else -1` }],
        dry: { head: ['poll', 'final dist', 'relax', 'PQ after'], rows: [
          ['(0,2)', '2 → 0', '1: 1, 3: 1', '(1,1) (1,3)'],
          ['(1,1)', '1 → 1', 'no out-edges', '(1,3)'],
          ['(1,3)', '3 → 1', '4: 2', '(2,4)'],
          ['(2,4)', '4 → 2', '—', 'empty → max = <span class="c-g">2</span>']
        ] },
        complexity: `<p>Time O(E log E) ≈ O(E log V); space O(V + E).</p>`,
        followUps: ['Return the order in which nodes receive the signal', 'What if some times can be negative (but no negative cycles)?', 'Since n ≤ 100, could Floyd-Warshall work? (Yes, 10<sup>6</sup> steps.)']
      }
    }]
  });

  // ================= TOPIC 2: 0-1 BFS =================
  topics.push({
    title: '0-1 BFS: Shortest Paths When Every Weight Is 0 or 1',
    analogy: `<p>Think of a <b>theme-park queue with a fast-pass</b>. Normal visitors join at the <b>back</b> of the line. Fast-pass holders (free moves) are allowed to step in at the <b>front</b>. The line stays nicely ordered by "how long you have paid so far" — without anyone ever sorting it.</p>
      <p>0-1 BFS uses a <b>double-ended queue (deque)</b> the same way: a 0-cost move goes to the front, a 1-cost move goes to the back.</p>`,
    explain: `<p>Many problems have only two kinds of moves: <b>free</b> (cost 0) and <b>paid</b> (cost 1). Examples: "follow the arrow for free, change it for 1", "walk on empty cells for free, break a wall for 1", "use an existing road free, reverse a road for 1".</p>
      <p>Dijkstra would work, but a heap costs O(log V) per step. Because there are only two weights, we can keep the queue sorted <b>for free</b>:</p>
      <ul>
        <li>Pop from the <b>front</b> — that node has the smallest distance.</li>
        <li>Relax each edge. If it improves <code>dist[v]</code>:
          <ul><li>weight <b>0</b> → <code>addFirst(v)</code> (same distance as the current node, so it belongs at the front)</li>
          <li>weight <b>1</b> → <code>addLast(v)</code> (one more than the current node, so it belongs at the back)</li></ul></li>
      </ul>
      <p><b>Why the deque stays sorted:</b> at every moment the deque holds nodes with distance <code>d</code> at the front and <code>d + 1</code> at the back — only two values, in order. Adding <code>d</code> to the front and <code>d + 1</code> to the back keeps that true. So the front is always the minimum, exactly like Dijkstra's heap, but each operation is <b>O(1)</b>.</p>
      ${H.table(['step', 'pop', 'edge', 'action', 'deque (front → back)'], [
        ['1', 'A(0)', 'A–C w=0', 'C = 0 → front', '[C(0)]'],
        ['', '', 'A–B w=1', 'B = 1 → back', '[C(0), B(1)]'],
        ['2', 'C(0)', 'C–B w=0', 'B = 0 &lt; 1 → front', '[B(0), B(1)]'],
        ['3', 'B(0)', '…', 'B is final at 0', '[…, ' + H.c('r', 'B(1) stale') + ']']
      ])}
      <p><b>Total cost:</b> O(V + E) time, O(V) extra space — the same as BFS, but correct for 0/1 weights.</p>
      <p><b>Grid version:</b> cells are nodes, the 4 neighbours are edges, and the problem tells you which moves are free. That is by far the most common way 0-1 BFS shows up in interviews.</p>`,
    clues: [
      'only <b>two</b> kinds of moves: free vs costs 1 ("follow the sign for free, change it for 1")',
      '"minimum number of walls / obstacles to remove", "minimum flips / reversals / modifications"',
      'grid up to 10<sup>3</sup> × 10<sup>3</sup> (10<sup>6</sup> cells) → want O(cells), a heap\'s log factor may be tight',
      '"minimum edges to reverse so a path exists from 1 to N" → original edge 0, reversed edge 1',
      'weights in {0, 1} (or {0, k} — then multiply/divide out k)'
    ],
    code: [`
// 0-1 BFS on an adjacency list. g[u] = list of {v, w} with w in {0, 1}.
import java.util.*;

class ZeroOneBfs {
    static int[] shortest(List<List<int[]>> g, int src) {
        int n = g.size();
        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[src] = 0;
        Deque<Integer> dq = new ArrayDeque<>();
        dq.addFirst(src);
        while (!dq.isEmpty()) {
            int u = dq.pollFirst();               // front always has the smallest distance
            for (int[] e : g.get(u)) {
                int v = e[0], w = e[1];
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    if (w == 0) dq.addFirst(v);   // free move: same distance, goes to the FRONT
                    else dq.addLast(v);           // paid move: distance + 1, goes to the BACK
                }
            }
        }
        return dist;
    }

    public static void main(String[] args) {
        // A=0 B=1 C=2 D=3 E=4 F=5, undirected (same as the visualizer)
        int n = 6;
        int[][] edges = {{0,1,1},{0,2,0},{2,1,0},{1,3,1},{2,4,1},{3,5,0},{4,5,1},{4,3,0}};
        List<List<int[]>> g = new ArrayList<>();
        for (int i = 0; i < n; i++) g.add(new ArrayList<>());
        for (int[] e : edges) { g.get(e[0]).add(new int[]{e[1], e[2]}); g.get(e[1]).add(new int[]{e[0], e[2]}); }
        System.out.println(Arrays.toString(shortest(g, 0)));  // [0, 0, 0, 1, 1, 1]
    }
}`, {
      lang: 'python', run: true, title: 'Grid 0-1 BFS: minimum walls to break (runnable)', code: `from collections import deque

def min_walls(grid):
    # '.' = free cell (cost 0 to enter), '#' = wall (cost 1 to break and enter)
    R, C = len(grid), len(grid[0])
    INF = float('inf')
    dist = [[INF] * C for _ in range(R)]
    dist[0][0] = 0
    dq = deque([(0, 0)])
    while dq:
        r, c = dq.popleft()
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < R and 0 <= nc < C:
                w = 1 if grid[nr][nc] == '#' else 0
                if dist[r][c] + w < dist[nr][nc]:
                    dist[nr][nc] = dist[r][c] + w
                    if w == 0:
                        dq.appendleft((nr, nc))   # free move -> front
                    else:
                        dq.append((nr, nc))       # paid move -> back
    return dist[R - 1][C - 1]

grid = ["..#.",
        "##.#",
        "...#",
        "#.#."]
print("walls to break:", min_walls(grid))   # 2
` }],
    codeTitle: ['0-1 BFS template (Java)', 'Grid version in Python'],
    viz: {
      title: '0-1 BFS: watch 0-edges jump to the FRONT and 1-edges join the BACK',
      input: 'A B 1, A C 0, C B 0, B D 1, C E 1, D F 0, E F 1, E D 0',
      inputLabel: 'Undirected edges "from to weight" with weight 0 or 1 (source = first node, ≤ 8 nodes)',
      gen: function (input) {
        var G = parseGraph(input, { maxN: 8, maxE: 16, zeroOne: true });
        var ids = G.ids, src = ids[0], A = adjOf(G, false);
        var dist = {}, par = {}, done = {}, frames = [], dq = [[0, src]];
        ids.forEach(function (id) { dist[id] = INF; });
        dist[src] = 0;
        function nodeHl(cur, cls, extra) {
          var h = {};
          ids.forEach(function (id) { if (done[id]) h[id] = 'ok'; });
          if (extra) h[extra] = 'win';
          if (cur) h[cur] = cls || 'cur';
          return h;
        }
        function tree() { var e = {}; ids.forEach(function (id) { if (par[id] !== undefined) e[par[id] + '-' + id] = 'sel'; }); return e; }
        function frame(narr, nh, eh, qhl) {
          frames.push({ narr: narr, parts: [
            gpart(G, false, 'Graph (edge label = cost 0 or 1)', nh, eh, distTags(ids, dist)),
            { type: 'queue', label: 'Deque (front = smallest distance)', items: dq.map(function (x) { return x[1] + '(' + x[0] + ')'; }), hl: qhl || {}, frontLabel: 'front: pollFirst / 0-edges', backLabel: 'back: 1-edges' },
            distArr(ids, dist, {})
          ] });
        }
        frame('Start: dist[' + src + '] = 0. Put ' + src + ' in the deque. Only two distance values will ever be inside it at once: d (front) and d + 1 (back).', one(src, 'sel'), {}, one(0, 'cur'));
        var guard = 0;
        while (dq.length && guard++ < 200) {
          var top = dq.shift(), d = top[0], u = top[1];
          if (done[u] || d > dist[u]) {
            frame('pollFirst → ' + u + '(' + d + ') is <span class="c-r">stale</span>: ' + u + ' already settled at ' + dist[u] + '. Skip.', nodeHl(u, 'bad'), tree());
            continue;
          }
          done[u] = true;
          frame('pollFirst → <b>' + u + '</b> with distance ' + d + '. The front of the deque always holds the smallest distance, so <span class="c-g">' + u + ' is final</span>.', nodeHl(u), tree());
          A[u].forEach(function (nb) {
            var v = nb[0], w = nb[1], nd = d + w, eh = tree();
            if (done[v]) return;
            if (nd < dist[v]) {
              dist[v] = nd; par[v] = u;
              eh = tree(); eh[u + '-' + v] = 'ok';
              if (w === 0) {
                dq.unshift([nd, v]);
                frame('Edge ' + u + '–' + v + ' costs <b>0</b>: dist[' + v + '] = ' + nd + '. Same distance as ' + u + ' → <b>addFirst</b> (jumps to the front, like a fast-pass).', nodeHl(u, 'cur', v), eh, one(0, 'ok'));
              } else {
                dq.push([nd, v]);
                frame('Edge ' + u + '–' + v + ' costs <b>1</b>: dist[' + v + '] = ' + nd + '. One more than ' + u + ' → <b>addLast</b> (joins the back).', nodeHl(u, 'cur', v), eh, one(dq.length - 1, 'ok'));
              }
            } else {
              eh[u + '-' + v] = 'bad';
              frame('Edge ' + u + '–' + v + ' (cost ' + w + '): ' + d + ' + ' + w + ' = ' + nd + ' is not better than ' + fmt(dist[v]) + '. Nothing changes.', nodeHl(u, 'cur'), eh);
            }
          });
        }
        frames.push({ narr: 'Deque empty → every reachable node is settled in O(V + E), with no heap at all. Purple edges = the tree of cheapest routes.', parts: [
          gpart(G, false, 'Final distances', nodeHl(null), tree(), distTags(ids, dist)),
          { type: 'text', label: 'Answers', html: ids.map(function (id) { return id + ': ' + (dist[id] === INF ? 'unreachable' : dist[id] + ' via ' + pathTo(par, src, id)); }).join('<br>') }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Minimum edges to reverse (GfG classic)', html: `<p>Directed edges 1→2, 3→2, 3→4. Want a path 1 → 4. Build: for each u→v add <b>u→v with cost 0</b> and <b>v→u with cost 1</b> (using it means reversing). 0-1 BFS from 1: 2 (0), 3 via 2→3 reversed (1), 4 via 3→4 (1). Answer ${H.c('g', '1 reversal')}.</p>` },
      { title: 'Minimum obstacles to remove (LeetCode 2290)', html: `<p>Grid of 0 (empty) and 1 (obstacle). Moving into a cell costs its value. That is literally a 0-1 weighted grid: run 0-1 BFS from (0,0), answer dist at bottom-right. With 10<sup>5</sup> cells, O(cells) instead of O(cells · log cells).</p>` },
      { title: 'Weights {0, k}', html: `<p>If moves cost 0 or 5, divide by 5: they become 0 or 1. Run 0-1 BFS, multiply the answer by 5. If the weights are {1, 2} you can <b>split</b> every 2-edge into two 1-edges with a dummy middle node, then run plain BFS.</p>` },
      { title: 'Why not just BFS?', html: `<p>Plain BFS treats every edge as 1. On A–C (0), C–B (0), A–B (1), BFS says B = 1, but the true answer is ${H.c('g', '0')} (A → C → B is free). 0-1 BFS fixes this by pushing 0-cost discoveries to the front.</p>` }
    ],
    deepDive: `<p><b>Invariant proof.</b> Claim: the deque's distances are non-decreasing from front to back and differ by at most 1. Initially true (one item). Popping the front (value d) leaves values in {d, d + 1}. A 0-edge adds d to the front, a 1-edge adds d + 1 to the back — the claim survives. So every pop returns a minimum tentative distance, which is exactly the property Dijkstra needs; correctness follows from Dijkstra's proof.</p>
      <p><b>Repeated nodes.</b> A node can sit in the deque more than once (pushed to the back with d + 1, later to the front with d). Either skip stale pops (compare with dist or keep a done flag), or simply re-process — re-processing cannot change anything, but skipping saves time. Each node is pushed at most twice per incoming edge improvement; total O(V + E).</p>
      <p><b>Dial's algorithm</b> generalises this: if weights are small integers 0..C, keep C + 1 buckets (circular array of lists) instead of a heap. Total O(V·C + E). Network routers and some game path-finders use bucket queues for this reason.</p>
      <p><b>Alternative for grids:</b> "BFS by layers + flood fill" — from all cells at cost k, DFS through every free move to collect the whole cost-k region, then step once to cost k + 1. Same complexity, sometimes simpler to explain.</p>
      <p><b>Pitfall:</b> using a normal BFS <code>visited</code> array marked at push time. A node first discovered through a 1-edge must still be improvable later through a 0-edge; mark it only when popped (or compare distances).</p>`,
    aiEra: `<p><b>What AI changes:</b> LLMs reliably produce the deque template, but they often reach for Dijkstra or plain BFS first. Your value is spotting the "0 or 1" structure hidden in the wording ("change a sign", "remove an obstacle").</p>
      <p><b>Use AI as a partner:</b> <code>Rewrite my Dijkstra for a 0/1 grid as 0-1 BFS and list the invariants it relies on</code>, or <code>Generate 20 random 6x6 grids and compare 0-1 BFS with Dijkstra outputs</code>.</p>
      <p><b>Where AI goes wrong:</b> marks <code>visited</code> at push time (breaks correctness), pushes 0-edges to the back (silently turns into a slow, sometimes wrong BFS), or forgets that a node may appear twice.</p>
      <p><b>What you must still own:</b> modelling the problem as a graph with the right 0/1 costs (e.g. the reversed-edge trick), and explaining why the deque stays sorted.</p>`,
    problems: [{
      title: 'Minimum Cost to Make at Least One Valid Path in a Grid (LeetCode 1368)', level: 'Hard', tags: ['0-1 bfs', 'grid', 'deque'], companies: ['Google', 'Amazon'],
      statement: `<p>Each cell of an m × n grid has a sign: 1 = go right, 2 = left, 3 = down, 4 = up. Starting at the top-left cell, you follow the signs. You may change the sign of any cell at <b>cost 1</b> (each cell at most once). Return the minimum total cost so that following the signs leads from (0,0) to (m−1, n−1).</p>`,
      constraints: `1 ≤ m, n ≤ 100, grid[i][j] ∈ {1, 2, 3, 4}.`,
      example: `<p>grid = [[1,2],[4,3]] → ${H.c('g', '1')}</p><p>(0,0) points right to (0,1) for free, but (0,1) points back left. Change one sign — e.g. (0,1) to "down" — and the path (0,0) → (0,1) → (1,1) works. Cost ${H.c('g', '1')}.</p>`,
      brute: { why: `<p>Keep relaxing every cell's 4 moves (cost 0 if the move matches the sign, else 1) until nothing changes — Bellman-Ford style. Each sweep is O(mn) and up to O(mn) sweeps may be needed: O((mn)²) = 10<sup>8</sup>. The waste: re-scanning cells whose distance is already final.</p>`, code: `
class Solution {
    public int minCost(int[][] grid) {
        int m = grid.length, n = grid[0].length;
        int[][] dirs = {{0, 1}, {0, -1}, {1, 0}, {-1, 0}};   // sign 1..4
        int[][] dist = new int[m][n];
        for (int[] row : dist) Arrays.fill(row, Integer.MAX_VALUE);
        dist[0][0] = 0;
        boolean changed = true;
        while (changed) {                                   // sweep until stable
            changed = false;
            for (int r = 0; r < m; r++)
                for (int c = 0; c < n; c++) {
                    if (dist[r][c] == Integer.MAX_VALUE) continue;
                    for (int k = 0; k < 4; k++) {
                        int nr = r + dirs[k][0], nc = c + dirs[k][1];
                        if (nr < 0 || nc < 0 || nr >= m || nc >= n) continue;
                        int nd = dist[r][c] + (grid[r][c] == k + 1 ? 0 : 1);
                        if (nd < dist[nr][nc]) { dist[nr][nc] = nd; changed = true; }
                    }
                }
        }
        return dist[m - 1][n - 1];
    }
}` },
      mcq: { q: 'Moving from a cell in the direction its sign points costs…', options: ['0 — push the neighbour to the front of the deque', '1 — push to the back', '0 — push to the back', 'It depends on the neighbour\'s sign'], answer: 0, explain: 'Following the existing sign is free (weight 0 → addFirst). Any other direction means changing this cell\'s sign: weight 1 → addLast.' },
      hints: [`<p>Think of each cell as a node with 4 outgoing edges. The edge in the sign's direction costs 0; the other three cost 1 (you would change the sign).</p>`, `<p>Weights are only 0 and 1 → 0-1 BFS with an <code>ArrayDeque</code>: 0-edges addFirst, 1-edges addLast.</p>`, `<p>Directions must match sign numbering: index 0 = right (sign 1), 1 = left (2), 2 = down (3), 3 = up (4). Answer = dist[m−1][n−1]. A 1×1 grid answers 0.</p>`],
      solution: {
        approach: `<p>0-1 BFS from (0,0). For each popped cell, try all 4 directions; cost = 0 if it matches the cell's sign, else 1. Improve → addFirst for 0, addLast for 1.</p>`,
        code: `
class Solution {
    public int minCost(int[][] grid) {
        int m = grid.length, n = grid[0].length;
        int[][] dirs = {{0, 1}, {0, -1}, {1, 0}, {-1, 0}};   // right, left, down, up = signs 1..4
        int[][] dist = new int[m][n];
        for (int[] row : dist) Arrays.fill(row, Integer.MAX_VALUE);
        Deque<int[]> dq = new ArrayDeque<>();
        dist[0][0] = 0;
        dq.offerFirst(new int[]{0, 0});
        while (!dq.isEmpty()) {
            int[] cur = dq.pollFirst();
            int r = cur[0], c = cur[1];
            for (int k = 0; k < 4; k++) {
                int nr = r + dirs[k][0], nc = c + dirs[k][1];
                if (nr < 0 || nc < 0 || nr >= m || nc >= n) continue;
                int w = (grid[r][c] == k + 1) ? 0 : 1;        // follow sign = free
                if (dist[r][c] + w < dist[nr][nc]) {
                    dist[nr][nc] = dist[r][c] + w;
                    if (w == 0) dq.offerFirst(new int[]{nr, nc});
                    else dq.offerLast(new int[]{nr, nc});
                }
            }
        }
        return dist[m - 1][n - 1];
    }
}`,
        alt: [{ lang: 'python', code: `from collections import deque

class Solution:
    def minCost(self, grid):
        m, n = len(grid), len(grid[0])
        dirs = [(0, 1), (0, -1), (1, 0), (-1, 0)]
        INF = float('inf')
        dist = [[INF] * n for _ in range(m)]
        dist[0][0] = 0
        dq = deque([(0, 0)])
        while dq:
            r, c = dq.popleft()
            for k, (dr, dc) in enumerate(dirs):
                nr, nc = r + dr, c + dc
                if 0 <= nr < m and 0 <= nc < n:
                    w = 0 if grid[r][c] == k + 1 else 1
                    if dist[r][c] + w < dist[nr][nc]:
                        dist[nr][nc] = dist[r][c] + w
                        if w == 0:
                            dq.appendleft((nr, nc))
                        else:
                            dq.append((nr, nc))
        return dist[m - 1][n - 1]` }],
        dry: { head: ['pop', 'dist', 'moves tried', 'deque after'], rows: [
          ['(0,0)', '0', 'right (0,1) w0 → 0 front; down (1,0) w1 → 1 back', '[(0,1), (1,0)]'],
          ['(0,1)', '0', 'left (0,0) no gain; down (1,1) w1 → 1 back', '[(1,0), (1,1)]'],
          ['(1,0)', '1', 'up (0,0) no; right (1,1): 2 not &lt; 1', '[(1,1)]'],
          ['(1,1)', '1', 'nothing improves', 'empty → answer <span class="c-g">1</span>']
        ] },
        complexity: `<p>Time O(m·n) — each cell is pushed a constant number of times; space O(m·n).</p>`,
        followUps: ['Return which cells to modify', 'What if changing a sign costs the cell\'s value instead of 1? (Dijkstra)', 'Minimum Obstacle Removal (LC 2290) — same pattern']
      }
    }]
  });

  // ================= TOPIC 3: Bellman-Ford =================
  topics.push({
    title: 'Bellman-Ford: Negative Edges & Negative-Cycle Detection',
    analogy: `<p>Imagine passing a <b>rumour about the cheapest price</b> around an office. Every morning, each person tells their neighbours "I can get it for X — through me it costs X + fee". After enough mornings, everyone knows the true cheapest price, even if some "fees" are actually <b>discounts</b> (negative).</p>
      <p>But if there is a loop of people where each discount beats the fee, the price keeps dropping <b>forever</b> — that is a <b>negative cycle</b>, and Bellman-Ford can catch it.</p>`,
    explain: `<p>Dijkstra breaks when an edge is negative. <b>Bellman-Ford</b> is slower but much tougher: it handles negative weights and tells you if a negative cycle exists.</p>
      <h4>The idea in one line</h4>
      <p><b>Relax every edge, V − 1 times.</b> That's it.</p>
      <pre>dist[src] = 0, others = ∞
repeat V - 1 times:
    for each edge (u, v, w):
        if dist[u] != ∞ and dist[u] + w &lt; dist[v]:  dist[v] = dist[u] + w</pre>
      <h4>Why V − 1 rounds?</h4>
      <p>A shortest path without cycles visits at most V nodes, so it has at most <b>V − 1 edges</b>. After round 1, every shortest path that uses 1 edge is correct. After round 2, every path with ≤ 2 edges is correct… after round V − 1, all of them are.</p>
      ${H.table(['round', 'what is now guaranteed correct'], [['1', 'shortest paths using ≤ 1 edge'], ['2', 'shortest paths using ≤ 2 edges'], ['…', '…'], ['V − 1', H.c('g', 'every shortest path (it has ≤ V − 1 edges)')]])}
      <h4>Detecting a negative cycle</h4>
      <p>Do <b>one extra round</b> (the V-th). If any edge can <i>still</i> be relaxed, some distance keeps falling forever → a ${H.c('r', 'negative cycle')} is reachable from the source.</p>
      ${H.table(['cycle', 'total', 'meaning'], [['A → B (1), B → C (−2), C → A (0)', H.c('r', '−1'), 'go round again and again: −1, −2, −3, … no shortest path exists'], ['A → B (2), B → A (−1)', H.c('g', '+1'), 'fine: going round only costs more']])}
      <p><b>Early stop:</b> if a whole round changes nothing, later rounds will not change anything either — stop early. On many inputs this makes it much faster than the worst case.</p>
      <p><b>Cost:</b> O(V · E) time, O(V) space. Only use it when you need it: negative edges, negative-cycle detection, or "at most K edges" (next topics).</p>
      <p><b>The <code>dist[u] != ∞</code> check matters:</b> without it, "∞ + (−5)" looks smaller than ∞ and garbage spreads from unreachable nodes. In Java with <code>Integer.MAX_VALUE</code> it also overflows.</p>`,
    clues: [
      '"weights can be <b>negative</b>" (refunds, discounts, energy gained) → not Dijkstra',
      '"detect whether a <b>negative cycle</b> exists", "infinite profit", "arbitrage"',
      '"shortest path using <b>at most K edges</b>" → K rounds of Bellman-Ford (copy the array each round)',
      'V ≤ 500 and E ≤ 5000 (V·E ≈ 2.5·10<sup>6</sup>) → O(V·E) is affordable',
      'edge list given directly as <code>edges[i] = [u, v, w]</code> — Bellman-Ford needs nothing else',
      '"system of difference constraints x<sub>j</sub> − x<sub>i</sub> ≤ c" → edges i → j with weight c, then Bellman-Ford'
    ],
    code: [`
// Bellman-Ford with early stop, negative-cycle detection and cycle extraction.
import java.util.*;

class BellmanFord {
    static final long INF = Long.MAX_VALUE / 4;

    // returns null if a negative cycle is reachable from src, else the dist array
    static long[] shortest(int n, int[][] edges, int src) {
        long[] dist = new long[n];
        Arrays.fill(dist, INF);
        dist[src] = 0;
        for (int round = 1; round <= n - 1; round++) {
            boolean changed = false;
            for (int[] e : edges) {
                int u = e[0], v = e[1], w = e[2];
                if (dist[u] != INF && dist[u] + w < dist[v]) {   // skip unreachable u
                    dist[v] = dist[u] + w;
                    changed = true;
                }
            }
            if (!changed) break;                                  // early stop: already stable
        }
        for (int[] e : edges)                                     // the V-th round = detector
            if (dist[e[0]] != INF && dist[e[0]] + e[2] < dist[e[1]]) return null;
        return dist;
    }

    // returns the nodes of one negative cycle (in order), or an empty list
    static List<Integer> findNegativeCycle(int n, int[][] edges) {
        long[] dist = new long[n];           // all 0 = a virtual source connected to everyone
        int[] parent = new int[n];
        Arrays.fill(parent, -1);
        int last = -1;
        for (int round = 1; round <= n; round++) {
            last = -1;
            for (int[] e : edges) {
                if (dist[e[0]] + e[2] < dist[e[1]]) {
                    dist[e[1]] = dist[e[0]] + e[2];
                    parent[e[1]] = e[0];
                    last = e[1];
                }
            }
        }
        if (last == -1) return new ArrayList<>();               // n-th round changed nothing
        int x = last;
        for (int i = 0; i < n; i++) x = parent[x];               // step back n times: now surely ON the cycle
        List<Integer> cycle = new ArrayList<>();
        for (int v = x; ; v = parent[v]) {
            cycle.add(v);
            if (v == x && cycle.size() > 1) break;
        }
        Collections.reverse(cycle);
        return cycle;
    }

    public static void main(String[] args) {
        int[][] edges = {{0,1,4},{3,4,3},{1,3,-2},{2,1,-3},{0,2,5},{4,5,2},{2,4,6}};
        System.out.println(Arrays.toString(shortest(6, edges, 0)));   // [0, 2, 5, 0, 3, 5]
        int[][] bad = {{0,1,1},{1,2,-2},{2,0,0},{2,3,4}};
        System.out.println(findNegativeCycle(4, bad));                // a rotation of [0, 1, 2, 0]
    }
}`, {
      lang: 'python', run: true, title: 'Currency arbitrage = negative cycle (runnable)', code: `import math

def has_arbitrage(rates):
    # rates[i][j] = how many units of j you get for 1 unit of i
    # profit loop  <=>  product of rates > 1  <=>  sum of -log(rate) < 0  (a negative cycle)
    n = len(rates)
    edges = [(i, j, -math.log(rates[i][j])) for i in range(n) for j in range(n) if i != j]
    dist = [0.0] * n                      # virtual source: start everyone at 0
    for _ in range(n - 1):
        for u, v, w in edges:
            if dist[u] + w < dist[v] - 1e-12:
                dist[v] = dist[u] + w
    return any(dist[u] + w < dist[v] - 1e-12 for u, v, w in edges)

usd_eur_gbp = [[1.0, 0.92, 0.79],
               [1.09, 1.0, 0.86],
               [1.27, 1.17, 1.0]]
print("arbitrage?", has_arbitrage(usd_eur_gbp))     # True: USD->EUR->GBP->USD = 1.0 * 0.92 * 0.86 * 1.27 > 1

fair = [[1.0, 0.5], [2.0, 1.0]]
print("arbitrage?", has_arbitrage(fair))            # False
` }],
    codeTitle: ['Bellman-Ford template (Java)', 'Arbitrage detection in Python'],
    viz: {
      title: 'Bellman-Ford: relax every edge, round after round',
      input: 'A B 4, D E 3, B D -2, C B -3, A C 5, E F 2, C E 6',
      inputLabel: 'Directed edges "from to weight" in the order they are scanned (source = first node; negatives allowed; ≤ 6 nodes, ≤ 10 edges)',
      gen: function (input) {
        var G = parseGraph(input, { maxN: 6, maxE: 10, allowNeg: true });
        var ids = G.ids, src = ids[0], V = ids.length, E = G.edges;
        var dist = {}, frames = [];
        ids.forEach(function (id) { dist[id] = INF; });
        dist[src] = 0;
        var rows = E.map(function (e, i) { return [String(i + 1), e[0] + ' → ' + e[1], String(e[2])]; });
        function frame(narr, ei, ok, round, nodeHl, dHl) {
          var eh = {}, th = {};
          if (ei >= 0) { eh[E[ei][0] + '-' + E[ei][1]] = ok === true ? 'ok' : ok === false ? 'bad' : 'cur'; th[ei] = ok === true ? 'ok' : ok === false ? 'bad' : 'cur'; }
          frames.push({ narr: narr, parts: [
            gpart(G, true, 'Directed graph (tags = current dist)', nodeHl || {}, eh, distTags(ids, dist)),
            { type: 'table', label: 'Edge list (scanned top to bottom every round)', columns: ['#', 'edge', 'w'], rows: rows, hl: th },
            { type: 'vars', label: 'Progress', vals: { round: round + ' / ' + (V - 1), 'V - 1': V - 1 } },
            distArr(ids, dist, dHl || {})
          ] });
        }
        frame('Start: dist[' + src + '] = 0, all others ∞. We will scan the edge list up to V − 1 = <b>' + (V - 1) + '</b> times.', -1, null, 0, one(src, 'sel'));
        var round, stable = false;
        for (round = 1; round <= V - 1; round++) {
          var changed = false;
          for (var i = 0; i < E.length; i++) {
            var u = E[i][0], v = E[i][1], w = E[i][2];
            if (dist[u] === INF) {
              frame('Round ' + round + ', edge ' + u + ' → ' + v + ': dist[' + u + '] is ∞ (not reached yet) → skip. (∞ + w is meaningless.)', i, false, round, one(u, 'bad'));
            } else if (dist[u] + w < dist[v]) {
              var old = dist[v];
              dist[v] = dist[u] + w; changed = true;
              frame('Round ' + round + ', edge ' + u + ' → ' + v + ': ' + dist[u] + ' + (' + w + ') = <b>' + dist[v] + '</b> &lt; ' + fmt(old) + ' ✔ update dist[' + v + '].', i, true, round, two(u, 'cur', v, 'ok'), one(ids.indexOf(v), 'ok'));
            } else {
              frame('Round ' + round + ', edge ' + u + ' → ' + v + ': ' + dist[u] + ' + (' + w + ') = ' + (dist[u] + w) + ' is not better than ' + fmt(dist[v]) + '.', i, null, round, two(u, 'cur', v, 'win'));
            }
          }
          if (!changed) {
            stable = true;
            frame('Round ' + round + ' changed <b>nothing</b> → every later round would also change nothing. <span class="c-g">Early stop.</span> A stable round also proves there is no reachable negative cycle.', -1, null, round, {});
            break;
          }
          frame('End of round ' + round + ': every shortest path that uses ≤ ' + round + ' edge(s) is now correct.', -1, null, round, {});
        }
        if (!stable) {
          var bad = -1;
          for (var j = 0; j < E.length; j++) {
            var a = E[j][0], b = E[j][1];
            if (dist[a] !== INF && dist[a] + E[j][2] < dist[b]) { bad = j; break; }
          }
          if (bad >= 0) {
            frame('Extra round V: edge ' + E[bad][0] + ' → ' + E[bad][1] + ' can <span class="c-r">STILL</span> be relaxed after V − 1 rounds. Distances would fall forever → <span class="c-r">negative cycle detected</span>. No shortest path exists for nodes it reaches.', bad, false, V - 1, two(E[bad][0], 'bad', E[bad][1], 'bad'));
            return frames;
          }
          frame('Extra round V: no edge can be relaxed any more → <span class="c-g">no negative cycle</span>. The distances are final.', -1, null, V - 1, {});
        }
        frames.push({ narr: 'Done. Final shortest distances from ' + src + ' (negative edges handled correctly, no Dijkstra needed).', parts: [
          gpart(G, true, 'Final distances', {}, {}, distTags(ids, dist)),
          distArr(ids, dist, {})
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Order of edges changes speed, not the answer', html: `<p>Edges listed "backwards" (far edges first) may need all V − 1 rounds; listed in BFS order from the source, one round might be enough. The visualizer's default input keeps improving for 4 rounds and spends round 5 confirming that nothing changes. Try reordering it and watch the round count drop.</p>` },
      { title: 'Spotting a negative cycle', html: `<p>Edges A→B (1), B→C (−2), C→A (0), C→D (4). Cycle A→B→C→A sums to ${H.c('r', '−1')}. After V − 1 = 3 rounds, edge A→B can still improve → report "negative cycle". Note D is also affected: its distance is "−∞" because you can loop before leaving.</p>` },
      { title: 'Difference constraints', html: `<p>Find x, y, z with y − x ≤ 3, z − y ≤ −2, z − x ≤ 0. Make an edge x→y (3), y→z (−2), x→z (0), plus a virtual source to all with 0. Bellman-Ford gives x = 0, y = 0, z = −2 — a valid answer. A negative cycle would mean "no solution". Used in scheduling and timing analysis of chips.</p>` },
      { title: 'Arbitrage as a negative cycle', html: `<p>Turn each exchange rate r into weight −log(r). A loop whose product of rates is &gt; 1 has sum of −log(r) &lt; 0: a negative cycle. USD→EUR→GBP→USD = 0.92 × 0.86 × 1.27 ≈ ${H.c('g', '1.005')} &gt; 1 → profit (see runnable Python).</p>` }
    ],
    deepDive: `<p><b>Proof.</b> Induction on k: after round k, dist[v] ≤ length of the best path to v using ≤ k edges (round k relaxes the last edge of such a path, and its prefix was correct after round k − 1). Without negative cycles, some shortest path is simple and has ≤ V − 1 edges, so V − 1 rounds suffice. If a negative cycle is reachable, summing the "no edge relaxes" inequalities around the cycle gives 0 ≤ (cycle weight) &lt; 0 — a contradiction, so some edge must still relax.</p>
      <p><b>Which nodes are "−∞"?</b> The V-th round only finds <i>one</i> edge on or after a cycle. To mark every affected node, collect all nodes relaxed in round V (or keep running V more rounds) and BFS/DFS from them: everything reachable has no finite shortest distance.</p>
      <p><b>SPFA</b> (queue-based Bellman-Ford) only re-relaxes nodes whose distance changed. Often fast on random graphs, but the worst case is still O(V·E) and judges include anti-SPFA tests — don't rely on it for guarantees. Detect negative cycles in SPFA by counting how many times a node is enqueued (≥ V → cycle).</p>
      <p><b>Johnson's algorithm</b> = one Bellman-Ford from a virtual source to compute potentials h(v), reweight w'(u,v) = w + h(u) − h(v) ≥ 0, then V runs of Dijkstra: all-pairs in O(V·E log V), better than Floyd-Warshall on sparse graphs.</p>
      <p><b>Real world:</b> distance-vector routing (RIP) is distributed Bellman-Ford — each router only talks to neighbours. Its famous bug, "count to infinity", is the distributed version of the slow convergence you see here when a link breaks.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating Bellman-Ford is trivial for an assistant; the interview signal is whether <i>you</i> know when it is required and what the V-th round means.</p>
      <p><b>Use AI as a partner:</b> <code>Give me 5 tricky inputs for Bellman-Ford: unreachable negative cycle, cycle only reachable through a negative edge, parallel edges, and V=1</code>. Then predict the outputs yourself before running.</p>
      <p><b>Where AI goes wrong:</b> forgets the <code>dist[u] != ∞</code> guard (garbage "∞ − 5" values), reports a negative cycle that is not reachable from the source when the problem only asks about reachable ones, or uses <code>Integer.MAX_VALUE</code> and overflows.</p>
      <p><b>What you must still own:</b> the induction argument for V − 1 rounds, the difference between "a negative edge" (fine) and "a negative cycle" (no answer), and the modelling trick (−log for products, difference constraints).</p>`,
    problems: [{
      title: 'Bellman-Ford: Distances or Negative Cycle (GfG classic)', level: 'Medium', tags: ['bellman-ford', 'negative cycle'], companies: ['Amazon', 'Microsoft', 'Flipkart'],
      statement: `<p>Given V vertices (0..V−1), a list of directed weighted edges <code>[u, v, w]</code> (weights may be negative) and a source <code>src</code>, return the shortest distance from src to every vertex. Use <b>10<sup>8</sup></b> for unreachable vertices. If a negative cycle is reachable from src, return <code>[-1]</code>.</p>`,
      constraints: `1 ≤ V ≤ 500, 1 ≤ E ≤ V·(V−1), −1000 ≤ w ≤ 1000.`,
      example: `<p>V = 5, edges = [[1,3,2],[4,3,-1],[2,4,1],[1,2,1],[0,1,5]], src = 0 → ${H.c('g', '[0, 5, 6, 6, 7]')}</p><p>0→1 (5), 1→2 (6), 2→4 (7), and 3 is cheaper via 4→3: 7 + (−1) = ${H.c('g', '6')} instead of 1→3: 5 + 2 = 7.</p>`,
      brute: { why: `<p>DFS over every simple path from src, keeping the best cost per node, and checking each time DFS closes a loop whether that loop is negative. Correct, but the number of simple paths is exponential — hopeless for V = 500.</p>`, code: `
class Solution {
    static final int INF = 100000000;
    static int[] best;
    static boolean negCycle;
    static List<List<int[]>> g;

    static int[] bellmanFord(int V, int[][] edges, int src) {
        g = new ArrayList<>();
        for (int i = 0; i < V; i++) g.add(new ArrayList<>());
        for (int[] e : edges) g.get(e[0]).add(new int[]{e[1], e[2]});
        best = new int[V];
        Arrays.fill(best, INF);
        negCycle = false;
        dfs(src, 0, new boolean[V], new int[V]);
        return negCycle ? new int[]{-1} : best;
    }

    static void dfs(int u, int cost, boolean[] onPath, int[] costAt) {
        best[u] = Math.min(best[u], cost);
        onPath[u] = true;
        costAt[u] = cost;
        for (int[] e : g.get(u)) {
            int v = e[0], w = e[1];
            if (onPath[v]) { if (cost + w - costAt[v] < 0) negCycle = true; }  // closed a loop
            else dfs(v, cost + w, onPath, costAt);
        }
        onPath[u] = false;
    }
}` },
      mcq: { q: 'After V − 1 rounds you do one more pass and edge (u, v) still relaxes. What does that prove?', options: ['A negative cycle is reachable from the source', 'The graph has a negative edge', 'Node v is unreachable', 'You needed V + 1 rounds'], answer: 0, explain: 'Without a reachable negative cycle, V − 1 rounds always reach a fixed point. Further improvement means some distance can fall forever.' },
      hints: [`<p>Shortest paths without cycles have at most V − 1 edges, so relaxing every edge V − 1 times is enough.</p>`, `<p>Plain edge list + <code>int[] dist</code> filled with 10<sup>8</sup>. Guard <code>dist[u] != INF</code> before relaxing. Stop early if a round changes nothing.</p>`, `<p>After the rounds, scan all edges once more: any improvement → return [-1]. Recipe: init → (V−1) × relax all → one detection pass → return dist.</p>`],
      solution: {
        approach: `<p>Standard Bellman-Ford with early stop, then one detection pass.</p>`,
        code: `
class Solution {
    static final int INF = 100000000;

    static int[] bellmanFord(int V, int[][] edges, int src) {
        int[] dist = new int[V];
        Arrays.fill(dist, INF);
        dist[src] = 0;
        for (int i = 0; i < V - 1; i++) {
            boolean changed = false;
            for (int[] e : edges) {
                int u = e[0], v = e[1], w = e[2];
                if (dist[u] != INF && dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    changed = true;
                }
            }
            if (!changed) break;                       // stable -> no more work, no neg cycle
        }
        for (int[] e : edges)                          // detection pass
            if (dist[e[0]] != INF && dist[e[0]] + e[2] < dist[e[1]]) return new int[]{-1};
        return dist;
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def bellmanFord(self, V, edges, src):
        INF = 10**8
        dist = [INF] * V
        dist[src] = 0
        for _ in range(V - 1):
            changed = False
            for u, v, w in edges:
                if dist[u] != INF and dist[u] + w < dist[v]:
                    dist[v] = dist[u] + w
                    changed = True
            if not changed:
                break
        for u, v, w in edges:
            if dist[u] != INF and dist[u] + w < dist[v]:
                return [-1]
        return dist` }],
        dry: { head: ['round', 'edges that relax (in list order)', 'dist after round'], rows: [
          ['1', '0→1: 5 (others start from ∞)', '[0, 5, ∞, ∞, ∞]'],
          ['2', '1→3: 7, 1→2: 6', '[0, 5, 6, 7, ∞]'],
          ['3', '2→4: 7', '[0, 5, 6, 7, 7]'],
          ['4', '4→3: 7 − 1 = 6', '[0, 5, 6, 6, 7]'],
          ['check', 'nothing relaxes', '<span class="c-g">[0, 5, 6, 6, 7]</span>']
        ] },
        complexity: `<p>Time O(V·E) worst case (early stop often helps); space O(V).</p>`,
        followUps: ['Print the negative cycle itself', 'Mark every vertex whose distance is −∞', 'Which is faster here: SPFA or plain Bellman-Ford? Worst case?']
      }
    }]
  });

  // ================= TOPIC 4: Floyd-Warshall =================
  topics.push({
    title: 'Floyd-Warshall: All-Pairs Shortest Paths with a 3-Loop DP',
    analogy: `<p>Picture a <b>table of flight prices between every pair of cities</b>. At first you only know direct flights. Then someone says "you may now change planes in <b>Delhi</b>" — you check every pair: is going through Delhi cheaper? Then "you may also change in <b>Dubai</b>"… After you have allowed every city as a stop-over, the table holds the cheapest price for <b>every</b> pair.</p>`,
    explain: `<p>Dijkstra and Bellman-Ford answer "from <b>one</b> source to everyone". Sometimes you need "from <b>every</b> node to <b>every</b> node" — an all-pairs distance table. With V up to ~400, <b>Floyd-Warshall</b> is the simplest way.</p>
      <h4>The whole algorithm</h4>
      <pre>d[i][j] = weight of edge i→j (0 on the diagonal, ∞ if no edge)
for k in 0..V-1:          // allow k as a middle stop
  for i in 0..V-1:
    for j in 0..V-1:
      if d[i][k] + d[k][j] &lt; d[i][j]:  d[i][j] = d[i][k] + d[k][j]</pre>
      <p>Each step asks one question: <b>"Is going from i to j through k cheaper than what I have?"</b></p>
      <h4>Why the order of loops matters (k must be outermost)</h4>
      <p>It is dynamic programming. Define <code>d<sub>k</sub>[i][j]</code> = shortest i → j path whose middle stops are only from {0..k}. Then:</p>
      <p><code>d<sub>k</sub>[i][j] = min( d<sub>k−1</sub>[i][j],  d<sub>k−1</sub>[i][k] + d<sub>k−1</sub>[k][j] )</code> — either the best path does not use k, or it uses k exactly once (split into i → k and k → j).</p>
      <p>So we must finish <b>all</b> pairs for k − 1 before using k. Putting k inside is a classic bug.</p>
      ${H.table(['k (stop-over allowed)', 'example update'], [
        ['A', 'B→D: B→A→D = 8 + 7 = 15 &lt; ∞'],
        ['B', 'A→C: A→B→C = 3 + 2 = ' + H.c('g', '5') + ' &lt; ∞'],
        ['C', 'A→D: A→B→C→D = 5 + 1 = ' + H.c('g', '6') + ' &lt; 7'],
        ['D', 'B→A: B→C→D→A = 3 + 2 = ' + H.c('g', '5') + ' &lt; 7 (it was 8, then 7 via C)']
      ])}
      <p><b>Cost:</b> O(V³) time, O(V²) space. V = 400 → 6.4·10<sup>7</sup> simple steps: fine. V = 2000 → 8·10<sup>9</sup>: too slow, use V × Dijkstra instead.</p>
      <p><b>Negative edges are fine</b> (no negative cycles). After the loops, if some <code>d[i][i] &lt; 0</code>, node i lies on a ${H.c('r', 'negative cycle')}.</p>
      <p><b>Bonus uses:</b> transitive closure ("can i reach j?" — replace + with AND, min with OR), finding the graph's diameter, and the "city with fewest neighbours within a threshold" style problems.</p>`,
    clues: [
      '"shortest distance between <b>every pair</b>", "for all queries (u, v)" with many queries',
      'V ≤ 100…400 (V³ ≤ 6.4·10<sup>7</sup>) → Floyd-Warshall is the easy, safe choice',
      'input given as an <b>adjacency matrix</b> already',
      '"can course i be a prerequisite of j?" (reachability for many pairs) → transitive closure',
      '"city with the smallest number of reachable cities within distance T"',
      'negative edges allowed and you need all pairs → Floyd-Warshall (or Johnson for sparse graphs)'
    ],
    code: [`
// Floyd-Warshall with path reconstruction and negative-cycle check.
import java.util.*;

class FloydWarshall {
    static final long INF = Long.MAX_VALUE / 4;     // big, but INF + INF does not overflow
    static long[][] d;
    static int[][] nxt;                             // nxt[i][j] = first step on the best i -> j path

    static void run(int n, int[][] edges) {
        d = new long[n][n];
        nxt = new int[n][n];
        for (int i = 0; i < n; i++) {
            Arrays.fill(d[i], INF);
            Arrays.fill(nxt[i], -1);
            d[i][i] = 0;
            nxt[i][i] = i;
        }
        for (int[] e : edges) {                     // directed; keep the cheapest parallel edge
            if (e[2] < d[e[0]][e[1]]) { d[e[0]][e[1]] = e[2]; nxt[e[0]][e[1]] = e[1]; }
        }
        for (int k = 0; k < n; k++)                 // k = the newly allowed middle stop (OUTER loop!)
            for (int i = 0; i < n; i++) {
                if (d[i][k] == INF) continue;       // small speed-up: i cannot reach k
                for (int j = 0; j < n; j++) {
                    if (d[k][j] == INF) continue;
                    if (d[i][k] + d[k][j] < d[i][j]) {
                        d[i][j] = d[i][k] + d[k][j];
                        nxt[i][j] = nxt[i][k];      // first go towards k
                    }
                }
            }
    }

    static boolean hasNegativeCycle() {
        for (int i = 0; i < d.length; i++) if (d[i][i] < 0) return true;
        return false;
    }

    static List<Integer> path(int i, int j) {
        List<Integer> p = new ArrayList<>();
        if (nxt[i][j] == -1) return p;              // unreachable
        p.add(i);
        while (i != j) { i = nxt[i][j]; p.add(i); }
        return p;
    }

    public static void main(String[] args) {
        // A=0 B=1 C=2 D=3 (same as the visualizer)
        int[][] edges = {{0,1,3},{0,3,7},{1,0,8},{1,2,2},{2,0,5},{2,3,1},{3,0,2}};
        run(4, edges);
        for (long[] row : d) System.out.println(Arrays.toString(row));
        System.out.println("A->D path: " + path(0, 3));   // [0, 1, 2, 3]
        System.out.println("negative cycle? " + hasNegativeCycle());
    }
}`, {
      lang: 'python', run: true, title: 'Floyd-Warshall in Python (runnable)', code: `INF = float('inf')

def floyd_warshall(n, edges):
    d = [[0 if i == j else INF for j in range(n)] for i in range(n)]
    for u, v, w in edges:
        d[u][v] = min(d[u][v], w)
    for k in range(n):              # allow k as a stop-over
        dk = d[k]
        for i in range(n):
            dik = d[i][k]
            if dik == INF:
                continue
            di = d[i]
            for j in range(n):
                if dik + dk[j] < di[j]:
                    di[j] = dik + dk[j]
    return d

names = "ABCD"
edges = [(0,1,3),(0,3,7),(1,0,8),(1,2,2),(2,0,5),(2,3,1),(3,0,2)]
d = floyd_warshall(4, edges)
print("    " + "   ".join(names))
for i in range(4):
    print(names[i], d[i])
` }],
    codeTitle: ['Floyd-Warshall template (Java)', 'Python version'],
    viz: {
      title: 'Floyd-Warshall grid: one stop-over k at a time',
      input: 'A B 3, A D 7, B A 8, B C 2, C A 5, C D 1, D A 2',
      inputLabel: 'Directed edges "from to weight" (negatives allowed, ≤ 6 nodes, ≤ 14 edges)',
      gen: function (input) {
        var G = parseGraph(input, { maxN: 6, maxE: 14, allowNeg: true });
        var ids = G.ids, n = ids.length, d = [], frames = [];
        for (var i = 0; i < n; i++) { d.push([]); for (var j = 0; j < n; j++) d[i].push(i === j ? 0 : INF); }
        G.edges.forEach(function (e) { var a = ids.indexOf(e[0]), b = ids.indexOf(e[1]); if (e[2] < d[a][b]) d[a][b] = e[2]; });
        function rows() { return d.map(function (r) { return r.map(fmt); }); }
        function frame(narr, hl, k, extra) {
          var parts = [
            gpart(G, true, k >= 0 ? 'Stop-over allowed now: ' + ids[k] : 'Directed graph', k >= 0 ? one(ids[k], 'sel') : {}, extra || {}, {}),
            { type: 'grid', label: 'd[i][j] (row = from, column = to)', rowHead: ids, colHead: ids, rows: rows(), hl: hl }
          ];
          frames.push({ narr: narr, parts: parts });
        }
        frame('Start: the grid holds only <b>direct</b> edges. 0 on the diagonal (stay put), ∞ where there is no direct edge.', {}, -1);
        for (var k = 0; k < n; k++) {
          var hl = {};
          for (var t = 0; t < n; t++) { hl[k + ',' + t] = 'win'; hl[t + ',' + k] = 'win'; }
          frame('k = <b>' + ids[k] + '</b>: now paths may pass through ' + ids[k] + '. Blue row = "from ' + ids[k] + '" values, blue column = "to ' + ids[k] + '" values. For every (i, j) we test d[i][' + ids[k] + '] + d[' + ids[k] + '][j] &lt; d[i][j].', hl, k);
          var count = 0;
          for (var a = 0; a < n; a++) {
            if (d[a][k] === INF) continue;
            for (var b = 0; b < n; b++) {
              if (d[k][b] === INF) continue;
              var via = d[a][k] + d[k][b];
              if (via < d[a][b]) {
                var old = d[a][b];
                d[a][b] = via; count++;
                var h2 = {};
                h2[a + ',' + k] = 'cur'; h2[k + ',' + b] = 'cur'; h2[a + ',' + b] = 'ok';
                var eh = {};
                eh[ids[a] + '-' + ids[k]] = 'cur'; eh[ids[k] + '-' + ids[b]] = 'cur';
                frame('d[' + ids[a] + '][' + ids[b] + ']: ' + ids[a] + ' → ' + ids[k] + ' → ' + ids[b] + ' = ' + d[a][k] + ' + ' + d[k][b] + ' = <b>' + via + '</b> &lt; ' + fmt(old) + ' ✔ update (amber cells are the two halves).', h2, k, eh);
              }
            }
          }
          if (!count) frame('Using ' + ids[k] + ' as a stop-over improves <b>nothing</b> this time. Move to the next k.', hl, k);
        }
        var fin = {}, neg = false;
        for (var z = 0; z < n; z++) if (d[z][z] < 0) { fin[z + ',' + z] = 'bad'; neg = true; }
        frame(neg ? '<span class="c-r">Negative value on the diagonal</span> → those nodes sit on a negative cycle; their rows/columns are not real shortest distances.' : 'All k done. Every cell is now the shortest distance between that pair, using any stop-overs. Diagonal all 0 → <span class="c-g">no negative cycle</span>.', fin, -1);
        return frames;
      }
    },
    examples: [
      { title: 'The loop-order bug', html: `<p>Writing <code>for i … for j … for k …</code> (k innermost) looks harmless but is <b>wrong</b>: when d[i][j] is computed, d[i][k] and d[k][j] may not be final yet. On a path A → B → C → D the answer for A → D can stay ∞. Always: <b>k outermost</b>.</p>` },
      { title: 'Transitive closure (Course Schedule IV)', html: `<p>reach[i][j] = true if a direct prerequisite edge exists. Then <code>reach[i][j] |= reach[i][k] &amp;&amp; reach[k][j]</code> with the same three loops. With 100 courses that is 10<sup>6</sup> steps, then every query is O(1).</p>`, code: `
static void transitiveClosure(boolean[][] reach) {
    int n = reach.length;
    for (int k = 0; k < n; k++)
        for (int i = 0; i < n; i++)
            if (reach[i][k])
                for (int j = 0; j < n; j++)
                    if (reach[k][j]) reach[i][j] = true;   // i -> k -> j
}` },
      { title: 'Graph diameter / best meeting city', html: `<p>After Floyd-Warshall, the <b>eccentricity</b> of i is max<sub>j</sub> d[i][j]. The graph centre (best place for a warehouse) is the i with the smallest eccentricity; the diameter is the largest d[i][j] overall.</p>` },
      { title: 'Floyd-Warshall vs V × Dijkstra', html: `<p>V = 300, E = 1000: FW = 2.7·10<sup>7</sup>; V × Dijkstra ≈ 300 × 1300 × 10 ≈ 3.9·10<sup>6</sup>. Dijkstra wins on sparse graphs, but FW is 6 lines, handles negative edges and is cache-friendly. For V ≤ 400, FW is the pragmatic interview pick.</p>` }
    ],
    deepDive: `<p><b>Why in-place updates are safe.</b> The textbook DP has a 3D table d<sub>k</sub>[i][j]. During round k, the values d[i][k] and d[k][j] do not change (d[i][k] would become d[i][k] + d[k][k] = d[i][k] + 0). So one 2D array suffices — O(V²) memory instead of O(V³).</p>
      <p><b>Overflow & ∞.</b> With <code>Integer.MAX_VALUE</code> as ∞, ∞ + 5 overflows to a negative number and "improves" everything. Use a large sentinel like 10<sup>9</sup> with <code>long</code> sums, or skip when either half is ∞ (as in the template).</p>
      <p><b>Negative cycles.</b> With a negative cycle, values can shrink exponentially (repeated doubling of the cycle) and overflow for big V. If negative cycles are possible, check d[i][i] &lt; 0 and mark every pair (i, j) with d[i][k] &lt; ∞, d[k][k] &lt; 0, d[k][j] &lt; ∞ as −∞.</p>
      <p><b>Path reconstruction:</b> store <code>nxt[i][j]</code> (first hop) — when d[i][j] improves through k, set nxt[i][j] = nxt[i][k]. Routers store exactly this kind of "next hop" table.</p>
      <p><b>Performance:</b> the j-loop scans rows d[i][·] and d[k][·] contiguously, so it is very cache-friendly and auto-vectorises in C++/Java. Hoisting <code>d[i][k]</code> and the row references out of the inner loop (as in the Python version) is a real speed-up. Theoretically it is the (min, +) matrix product; sub-cubic algorithms exist but are not practical.</p>
      <p><b>Dynamic updates:</b> if one edge u→v gets cheaper to w, update all pairs in O(V²): d[i][j] = min(d[i][j], d[i][u] + w + d[v][j]) — a common follow-up.</p>`,
    aiEra: `<p><b>What AI changes:</b> the 3 loops are memorised by every model; what matters is choosing it (V small, many queries) and explaining the DP meaning of k.</p>
      <p><b>Use AI as a partner:</b> <code>Explain d_k[i][j] for Floyd-Warshall with a 4-node example table per k</code>, or <code>Benchmark FW vs N×Dijkstra in Java for V=300 sparse and dense</code> — let the tool do the measurement; you interpret it.</p>
      <p><b>Where AI goes wrong:</b> puts k in the inner loop when "optimising", uses Integer.MAX_VALUE for ∞ (overflow), forgets that undirected edges must be set in both directions, or keeps the last parallel edge instead of the cheapest.</p>
      <p><b>What you must still own:</b> the recurrence and why k is outermost, the V-bound decision (V³ vs V·E log V), and the negative-cycle diagonal test.</p>`,
    problems: [{
      title: 'Find the City With the Smallest Number of Neighbors at a Threshold Distance (LeetCode 1334)', level: 'Medium', tags: ['floyd-warshall', 'all pairs'], companies: ['Uber', 'Amazon'],
      statement: `<p>There are n cities 0..n−1 and undirected weighted roads <code>edges[i] = [u, v, w]</code>. For each city, count how many <b>other</b> cities are reachable with total distance ≤ <code>distanceThreshold</code>. Return the city with the <b>smallest</b> count; if there is a tie, return the one with the <b>largest</b> index.</p>`,
      constraints: `2 ≤ n ≤ 100, 1 ≤ edges.length ≤ n(n−1)/2, 1 ≤ w, distanceThreshold ≤ 10<sup>4</sup>.`,
      example: `<p>n = 4, edges = [[0,1,3],[1,2,1],[1,3,4],[2,3,1]], threshold = 4 → ${H.c('g', '3')}</p><p>Reachable within 4: city 0 → {1, 2}, city 1 → {0, 2, 3}, city 2 → {0, 1, 3}, city 3 → {1, 2}. Cities 0 and 3 tie with 2; pick the larger index ${H.c('g', '3')}.</p>`,
      brute: { why: `<p>Run Bellman-Ford from every city: n × O(n·E). With E ≈ n²/2 that is O(n⁴) ≈ 5·10<sup>7</sup> — it passes here but wastes work by re-scanning every edge many times per source. Floyd-Warshall gets all pairs in n³ = 10<sup>6</sup>.</p>`, code: `
class Solution {
    public int findTheCity(int n, int[][] edges, int distanceThreshold) {
        int INF = 1_000_000_000, best = -1, bestCnt = Integer.MAX_VALUE;
        for (int s = 0; s < n; s++) {
            int[] dist = new int[n];
            Arrays.fill(dist, INF);
            dist[s] = 0;
            for (int r = 0; r < n - 1; r++)                     // Bellman-Ford from s
                for (int[] e : edges) {
                    if (dist[e[0]] != INF && dist[e[0]] + e[2] < dist[e[1]]) dist[e[1]] = dist[e[0]] + e[2];
                    if (dist[e[1]] != INF && dist[e[1]] + e[2] < dist[e[0]]) dist[e[0]] = dist[e[1]] + e[2];
                }
            int cnt = 0;
            for (int j = 0; j < n; j++) if (j != s && dist[j] <= distanceThreshold) cnt++;
            if (cnt <= bestCnt) { bestCnt = cnt; best = s; }   // <= keeps the larger index on ties
        }
        return best;
    }
}` },
      mcq: { q: 'n ≤ 100 and we need distances between ALL pairs. Best first choice?', options: ['Floyd-Warshall, 10<sup>6</sup> steps', 'One Dijkstra from city 0', 'BFS from each city', 'Kruskal\'s MST'], answer: 0, explain: 'All pairs + tiny n → Floyd-Warshall. One Dijkstra gives only one row; BFS ignores weights; an MST does not preserve shortest paths.' },
      hints: [`<p>You need every city's distances to every other city — an all-pairs table.</p>`, `<p>Floyd-Warshall on an n × n matrix; roads are undirected, so set both d[u][v] and d[v][u].</p>`, `<p>Count with <code>j != i &amp;&amp; d[i][j] ≤ T</code>. Loop i from 0 up and use <code>&lt;=</code> when comparing counts so ties go to the larger index. Use a safe INF (10<sup>9</sup>) and skip when d[i][k] is INF.</p>`],
      solution: {
        approach: `<p>Build the matrix, run Floyd-Warshall, then count reachable cities per row.</p>`,
        code: `
class Solution {
    public int findTheCity(int n, int[][] edges, int distanceThreshold) {
        int INF = 1_000_000_000;
        int[][] d = new int[n][n];
        for (int i = 0; i < n; i++) { Arrays.fill(d[i], INF); d[i][i] = 0; }
        for (int[] e : edges) {                                   // undirected roads
            d[e[0]][e[1]] = Math.min(d[e[0]][e[1]], e[2]);
            d[e[1]][e[0]] = Math.min(d[e[1]][e[0]], e[2]);
        }
        for (int k = 0; k < n; k++)
            for (int i = 0; i < n; i++) {
                if (d[i][k] == INF) continue;
                for (int j = 0; j < n; j++)
                    if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
            }
        int best = -1, bestCnt = Integer.MAX_VALUE;
        for (int i = 0; i < n; i++) {
            int cnt = 0;
            for (int j = 0; j < n; j++) if (i != j && d[i][j] <= distanceThreshold) cnt++;
            if (cnt <= bestCnt) { bestCnt = cnt; best = i; }      // tie -> larger index wins
        }
        return best;
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def findTheCity(self, n, edges, distanceThreshold):
        INF = float('inf')
        d = [[0 if i == j else INF for j in range(n)] for i in range(n)]
        for u, v, w in edges:
            d[u][v] = min(d[u][v], w)
            d[v][u] = min(d[v][u], w)
        for k in range(n):
            for i in range(n):
                if d[i][k] == INF:
                    continue
                for j in range(n):
                    if d[i][k] + d[k][j] < d[i][j]:
                        d[i][j] = d[i][k] + d[k][j]
        best, best_cnt = -1, INF
        for i in range(n):
            cnt = sum(1 for j in range(n) if j != i and d[i][j] <= distanceThreshold)
            if cnt <= best_cnt:
                best, best_cnt = i, cnt
        return best` }],
        dry: { head: ['k', 'updates', 'row 0 after', 'row 3 after'], rows: [
          ['start', 'direct roads only', '[0, 3, ∞, ∞]', '[∞, 4, 1, 0]'],
          ['0', 'none (0 only touches 1)', '[0, 3, ∞, ∞]', '[∞, 4, 1, 0]'],
          ['1', 'd[0][2]=4, d[0][3]=7, d[3][0]=7 …', '[0, 3, 4, 7]', '[7, 4, 1, 0]'],
          ['2', 'd[0][3]=5, d[1][3]=2, d[3][0]=5, d[3][1]=2', '[0, 3, 4, 5]', '[5, 2, 1, 0]'],
          ['3', 'none', 'count ≤ 4: 2', 'count ≤ 4: 2 → tie → <span class="c-g">3</span>']
        ] },
        complexity: `<p>Time O(n³) = 10<sup>6</sup>; space O(n²).</p>`,
        followUps: ['Solve with n Dijkstras and compare for sparse graphs', 'What if roads are added one by one and you answer after each?', 'Return the list of reachable cities, not just the count']
      }
    }]
  });

  // ================= TOPIC 5: MST basics + Prim =================
  topics.push({
    title: 'Minimum Spanning Trees & Prim\'s Algorithm',
    analogy: `<p>A town wants to connect every house to the <b>water network</b> with as little pipe as possible. They start at the water tank and keep adding the <b>cheapest pipe that reaches a new house</b> from the network they already have. They never build a pipe between two houses that already have water — that would be a waste (a loop).</p>
      <p>That growing network is <b>Prim's algorithm</b>, and the final network is a <b>minimum spanning tree</b>.</p>`,
    explain: `<h4>What is a Minimum Spanning Tree (MST)?</h4>
      <p>Take a <b>connected, undirected, weighted</b> graph. A <b>spanning tree</b> is a set of edges that connects all V nodes with <b>no cycles</b> — it always has exactly <b>V − 1 edges</b>. The <b>minimum</b> spanning tree is the one with the smallest total weight.</p>
      ${H.table(['', 'Shortest path tree (Dijkstra)', 'Minimum spanning tree'], [
        ['goal', 'cheapest route from ONE source to each node', 'cheapest way to connect ALL nodes together'],
        ['depends on a source?', 'yes', 'no'],
        ['example', 'GPS route from home', 'laying cables / pipes / roads']
      ])}
      <h4>The rule that makes every MST algorithm work: the cut property</h4>
      <p>Split the nodes into any two groups (a "cut"). The <b>cheapest edge crossing the cut</b> is safe to put in the MST. Reason: any spanning tree must cross the cut somewhere; swapping its crossing edge for the cheapest one never makes it more expensive.</p>
      <h4>Prim's algorithm = the cut property, applied again and again</h4>
      <p>Cut = "nodes already in my tree" vs "everyone else". So:</p>
      <ol>
        <li>Start from any node; put its edges into a min-heap.</li>
        <li>Poll the cheapest edge. If it leads to a node already in the tree, <b>skip</b> it (it would form a cycle — a stale entry).</li>
        <li>Otherwise add that node and edge to the tree, and push the new node's edges.</li>
        <li>Stop when the tree has V nodes (V − 1 edges).</li>
      </ol>
      ${H.table(['poll', 'decision', 'tree so far', 'total'], [
        ['(3, C←A)', H.c('g', 'add C'), '{A, C}', '3'],
        ['(1, B←C)', H.c('g', 'add B'), '{A, C, B}', '4'],
        ['(2, D←B)', H.c('g', 'add D'), '{A, B, C, D}', '6'],
        ['(4, B←A)', H.c('r', 'B already in tree → skip'), 'unchanged', '6']
      ])}
      <p><b>Looks like Dijkstra?</b> Almost! The only difference is the key: Dijkstra uses <code>dist[u] + w</code> (total from source); Prim uses <code>w</code> alone (just this one edge).</p>
      <p><b>Cost:</b> heap version O(E log V); array version (no heap) O(V²) — better for dense or complete graphs such as "connect all points".</p>`,
    clues: [
      '"connect <b>all</b> cities / houses / points with minimum total cost"',
      '"minimum cost to make the network connected", "lay cables / pipes / roads"',
      'complete graph from coordinates ("cost = Manhattan distance between points") → dense Prim O(V²)',
      'undirected + weighted + "every node must be connected" (no source, no target) → MST, not Dijkstra',
      '"remove edges to keep it connected while minimising cost" → MST',
      'answer must use exactly V − 1 edges / "no redundant connections"'
    ],
    code: [`
// Lazy Prim with a PriorityQueue. Undirected graph 0..n-1. Returns total MST weight, or -1 if disconnected.
import java.util.*;

class Prim {
    static long mst(int n, int[][] edges, List<int[]> chosen) {
        List<List<int[]>> g = new ArrayList<>();
        for (int i = 0; i < n; i++) g.add(new ArrayList<>());
        for (int[] e : edges) {
            g.get(e[0]).add(new int[]{e[1], e[2]});
            g.get(e[1]).add(new int[]{e[0], e[2]});
        }
        boolean[] inTree = new boolean[n];
        // heap entries: {weight, node, fromNode}; ordered by weight only
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        pq.add(new int[]{0, 0, -1});                    // start anywhere: node 0 with a free "edge"
        long total = 0;
        int count = 0;
        while (!pq.isEmpty() && count < n) {
            int[] top = pq.poll();
            int w = top[0], u = top[1];
            if (inTree[u]) continue;                    // would close a cycle -> skip
            inTree[u] = true;
            total += w;
            count++;
            if (top[2] != -1) chosen.add(new int[]{top[2], u, w});
            for (int[] e : g.get(u))
                if (!inTree[e[0]]) pq.add(new int[]{e[1], e[0], u});   // key = edge weight only
        }
        return count == n ? total : -1;                 // fewer than n nodes -> graph not connected
    }

    public static void main(String[] args) {
        // A=0 B=1 C=2 D=3 E=4 F=5 (same as the visualizer)
        int[][] edges = {{0,1,4},{0,2,3},{1,2,1},{1,3,2},{2,4,4},{3,4,5},{3,5,3},{4,5,6}};
        List<int[]> chosen = new ArrayList<>();
        System.out.println("MST weight = " + mst(6, edges, chosen));   // 13
        for (int[] c : chosen) System.out.println(c[0] + " - " + c[1] + " (" + c[2] + ")");
    }
}`, {
      lang: 'python', run: true, title: 'Prim in Python with heapq (runnable)', code: `import heapq

def prim(n, edges):
    g = [[] for _ in range(n)]
    for u, v, w in edges:
        g[u].append((w, v))
        g[v].append((w, u))
    in_tree = [False] * n
    pq = [(0, 0, -1)]            # (edge weight, node, parent)
    total, chosen = 0, []
    while pq:
        w, u, p = heapq.heappop(pq)
        if in_tree[u]:
            continue             # stale: u was already connected more cheaply
        in_tree[u] = True
        total += w
        if p != -1:
            chosen.append((p, u, w))
        for wt, v in g[u]:
            if not in_tree[v]:
                heapq.heappush(pq, (wt, v, u))
    return (total, chosen) if all(in_tree) else (None, chosen)

names = "ABCDEF"
edges = [(0,1,4),(0,2,3),(1,2,1),(1,3,2),(2,4,4),(3,4,5),(3,5,3),(4,5,6)]
total, chosen = prim(6, edges)
print("MST weight:", total)
for p, u, w in chosen:
    print(f"  {names[p]} - {names[u]}  ({w})")
` }],
    codeTitle: ['Prim template (Java)', 'Python version'],
    viz: {
      title: 'Prim: grow one tree, always take the cheapest edge leaving it',
      input: 'A B 4, A C 3, B C 1, B D 2, C E 4, D E 5, D F 3, E F 6',
      inputLabel: 'Undirected edges "from to weight" (start = first node, ≤ 8 nodes, ≤ 16 edges)',
      gen: function (input) {
        var G = parseGraph(input, { maxN: 8, maxE: 16 });
        var ids = G.ids, start = ids[0], A = adjOf(G, false);
        var inT = {}, chosen = {}, total = 0, frames = [], pq = [[0, start, null]], cnt = 0;
        function nh(cur, cls) { var h = {}; ids.forEach(function (id) { if (inT[id]) h[id] = 'ok'; }); if (cur) h[cur] = cls || 'cur'; return h; }
        function eh(extraKey, cls) { var e = copyObj(chosen); if (extraKey) e[extraKey] = cls; return e; }
        function frame(narr, h, e, qh) {
          frames.push({ narr: narr, parts: [
            gpart(G, false, 'Green = in the tree, purple edges = MST so far', h, e, {}),
            { type: 'queue', label: 'PriorityQueue of candidate edges (weight, node ← from)', items: pq.map(function (x) { return '(' + x[0] + ', ' + x[1] + (x[2] ? '←' + x[2] : '') + ')'; }), hl: qh || {}, frontLabel: 'cheapest', backLabel: 'dearest' },
            { type: 'vars', label: 'Progress', vals: { 'nodes in tree': cnt + ' / ' + ids.length, 'total weight': total } }
          ] });
        }
        frame('Start the tree at <b>' + start + '</b> (any node works). The heap holds a free entry (0, ' + start + ').', one(start, 'sel'), {}, one(0, 'cur'));
        var guard = 0;
        while (pq.length && cnt < ids.length && guard++ < 200) {
          var top = pq.shift(), w = top[0], u = top[1], from = top[2];
          if (inT[u]) {
            frame('Poll (' + w + ', ' + u + '←' + from + '): ' + u + ' is <span class="c-r">already in the tree</span>. Adding this edge would make a cycle → skip.', nh(u, 'bad'), eh(from + '-' + u, 'bad'));
            continue;
          }
          inT[u] = true; cnt++; total += w;
          if (from) chosen[from + '-' + u] = 'sel';
          frame(from ? 'Poll (' + w + ', ' + u + '←' + from + '): the cheapest edge crossing from the tree to the outside. <span class="c-g">Add ' + u + ' with edge ' + from + '–' + u + '</span> (cut property says this is safe). Total = ' + total + '.' : 'Take ' + u + ' as the first tree node.', nh(u), eh());
          var pushed = [];
          A[u].forEach(function (nb) { if (!inT[nb[0]]) { pqPush(pq, [nb[1], nb[0], u]); pushed.push(u + '–' + nb[0] + ' (' + nb[1] + ')'); } });
          if (pushed.length) frame('Push the edges from ' + u + ' to nodes outside the tree: ' + pushed.join(', ') + '. Key = <b>edge weight only</b> (Dijkstra would add the distance so far — Prim does not).', nh(u), eh());
        }
        frames.push({ narr: cnt === ids.length ? 'All ' + ids.length + ' nodes connected with ' + (ids.length - 1) + ' edges. <span class="c-g">MST weight = ' + total + '</span>.' : '<span class="c-r">Heap ran empty with only ' + cnt + ' nodes</span> → the graph is not connected; no spanning tree exists (you get a spanning forest per component instead).', parts: [
          gpart(G, false, 'Final minimum spanning tree', nh(null), eh(), {}),
          { type: 'vars', label: 'Result', vals: { 'MST weight': total, edges: Object.keys(chosen).length } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'MST is NOT the shortest-path tree', html: `<p>Triangle A–B (2), B–C (2), A–C (3). MST = {A–B, B–C}, weight 4. But the shortest path A → C is the direct edge (3), not A→B→C (4). An MST minimises the <b>total</b> wire, not each route.</p>` },
      { title: 'Dense Prim for "connect all points"', html: `<p>1000 points, every pair is an edge (≈ 500,000 edges). Heap Prim: ~E log V ≈ 10<sup>7</sup> plus big memory. Array Prim: keep <code>best[v]</code> = cheapest edge from tree to v, pick the min by scanning, update in O(V): total V² = 10<sup>6</sup>, no edge list stored at all.</p>` },
      { title: 'Disconnected input', html: `<p>Edges A–B (1), C–D (2). Prim from A adds B and then the heap is empty with 2 of 4 nodes. Return -1 ("impossible"), or run Prim from every unvisited node to build a <b>minimum spanning forest</b>.</p>` },
      { title: 'Maximum spanning tree', html: `<p>Want the most reliable network where weight = bandwidth? Use a <b>max</b>-heap (or negate weights). Everything else stays the same — the cut property works for maximum too.</p>`, code: `PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(b[0], a[0])); // max-heap` }
    ],
    deepDive: `<p><b>Proof of the cut property (exchange argument).</b> Let e be the cheapest edge across cut (S, V∖S) and T an MST without e. Adding e to T creates a cycle; that cycle crosses the cut at least twice, so it contains another crossing edge f with w(f) ≥ w(e). T − f + e is still a spanning tree and weighs no more. So some MST contains e. Prim applies this with S = current tree at every step.</p>
      <p><b>Cycle property</b> (the mirror rule): the most expensive edge on any cycle (if strictly heaviest) is in <b>no</b> MST. Used to update an MST when a new edge arrives: add it, find the max edge on the created cycle, remove it.</p>
      <p><b>Uniqueness:</b> if all weights are distinct, the MST is unique. With ties, several MSTs can exist, but they all have the same multiset of weights.</p>
      <p><b>Complexities:</b> lazy Prim O(E log E); eager Prim with an indexed heap O(E log V) and only V heap entries; Fibonacci heap O(E + V log V); array O(V²). For complete Euclidean graphs, building a Delaunay triangulation first (the MST is a subset of it) gives O(N log N) — what GIS tools do.</p>
      <p><b>Negative weights?</b> Fine for MSTs — only comparisons matter. (Unlike Dijkstra.)</p>
      <p><b>Production:</b> MSTs appear in network design, clustering (single-linkage = Kruskal stopped at k components), image segmentation (Felzenszwalb), and approximations (2-approx for metric TSP: walk the MST).</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants confuse Prim with Dijkstra surprisingly often — the code looks almost identical. Your job is to spot the key difference (<code>w</code> vs <code>dist + w</code>) in review.</p>
      <p><b>Use AI as a partner:</b> <code>Write a brute-force MST that tries all subsets of V-1 edges for V ≤ 7 and fuzz my Prim against it</code>; or ask it to produce dense vs sparse benchmarks to justify O(V²) Prim.</p>
      <p><b>Where AI goes wrong:</b> uses <code>dist[u] + w</code> as the key (computes a shortest-path tree, not an MST), forgets to check <code>inTree</code> on poll, returns a total for a disconnected graph, or overflows the total with int.</p>
      <p><b>What you must still own:</b> the cut-property proof, choosing heap vs array Prim from density, and explaining MST vs shortest-path tree to the interviewer.</p>`,
    problems: [{
      title: 'Min Cost to Connect All Points (LeetCode 1584)', level: 'Medium', tags: ['mst', 'prim', 'dense graph'], companies: ['Amazon', 'Google', 'Microsoft'],
      statement: `<p>Given <code>points[i] = [x<sub>i</sub>, y<sub>i</sub>]</code>, the cost to connect two points is their <b>Manhattan distance</b> |x<sub>i</sub> − x<sub>j</sub>| + |y<sub>i</sub> − y<sub>j</sub>|. Return the minimum cost to connect all points (every pair connected by exactly one simple path).</p>`,
      constraints: `1 ≤ n ≤ 1000, −10<sup>6</sup> ≤ x<sub>i</sub>, y<sub>i</sub> ≤ 10<sup>6</sup>, all points distinct.`,
      example: `<p>points = [[0,0],[2,2],[3,10],[5,2],[7,0]] → ${H.c('g', '20')}</p><p>Chosen links: (0,0)–(2,2) 4, (2,2)–(5,2) 3, (5,2)–(7,0) 4, (2,2)–(3,10) 9. Total 4 + 3 + 4 + 9 = ${H.c('g', '20')}.</p>`,
      brute: { why: `<p>Naive Prim: at every one of the n steps, scan <b>all pairs</b> (inside tree, outside tree) to find the cheapest connecting edge. That is n × n² = 10<sup>9</sup> for n = 1000 → TLE. The waste: recomputing each outside point's best connection from scratch instead of remembering it.</p>`, code: `
class Solution {
    public int minCostConnectPoints(int[][] points) {
        int n = points.length, total = 0;
        boolean[] inTree = new boolean[n];
        inTree[0] = true;
        for (int added = 1; added < n; added++) {
            int bestW = Integer.MAX_VALUE, bestV = -1;
            for (int u = 0; u < n; u++) {                 // every tree node...
                if (!inTree[u]) continue;
                for (int v = 0; v < n; v++) {             // ...times every outside node
                    if (inTree[v]) continue;
                    int w = Math.abs(points[u][0] - points[v][0]) + Math.abs(points[u][1] - points[v][1]);
                    if (w < bestW) { bestW = w; bestV = v; }
                }
            }
            inTree[bestV] = true;
            total += bestW;
        }
        return total;
    }
}` },
      mcq: { q: 'The graph is complete (n² edges). Which Prim version fits best?', options: ['Array Prim: best[v] + linear scan, O(n²)', 'Heap Prim over all n² edges, O(n² log n)', 'Dijkstra from point 0', 'Floyd-Warshall'], answer: 0, explain: 'In a dense graph E ≈ V², so the O(V²) array version is optimal and needs no edge list. Dijkstra/FW answer different questions.' },
      hints: [`<p>"Connect all points with minimum total cost, one path between any two" = minimum spanning tree on the complete graph.</p>`, `<p>Keep <code>best[v]</code> = cheapest cost to connect v to the current tree. Each round: pick the outside v with the smallest best[v], add it, then update every outside point's best using the new node.</p>`, `<p>Start with best[0] = 0, others ∞. n rounds × (O(n) scan + O(n) update) = O(n²) = 10<sup>6</sup>. Each distance is ≤ 4·10<sup>6</sup>, but 999 of them could sum past the int limit in theory — keep the running total in a <code>long</code> as a safe habit.</p>`],
      solution: {
        approach: `<p>Dense (array) Prim: no heap, no edge list. O(n²) time, O(n) memory.</p>`,
        code: `
class Solution {
    public int minCostConnectPoints(int[][] points) {
        int n = points.length;
        int[] best = new int[n];                 // cheapest known link from the tree to each point
        boolean[] inTree = new boolean[n];
        Arrays.fill(best, Integer.MAX_VALUE);
        best[0] = 0;
        long total = 0;                          // long: safe even for huge coordinates
        for (int it = 0; it < n; it++) {
            int u = -1;
            for (int v = 0; v < n; v++)          // pick the closest outside point
                if (!inTree[v] && (u == -1 || best[v] < best[u])) u = v;
            inTree[u] = true;
            total += best[u];
            for (int v = 0; v < n; v++) {        // the new tree node may offer cheaper links
                if (inTree[v]) continue;
                int w = Math.abs(points[u][0] - points[v][0]) + Math.abs(points[u][1] - points[v][1]);
                if (w < best[v]) best[v] = w;
            }
        }
        return (int) total;
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def minCostConnectPoints(self, points):
        n = len(points)
        INF = float('inf')
        best = [INF] * n
        best[0] = 0
        in_tree = [False] * n
        total = 0
        for _ in range(n):
            u = min((v for v in range(n) if not in_tree[v]), key=lambda v: best[v])
            in_tree[u] = True
            total += best[u]
            ux, uy = points[u]
            for v in range(n):
                if not in_tree[v]:
                    w = abs(ux - points[v][0]) + abs(uy - points[v][1])
                    if w < best[v]:
                        best[v] = w
        return total` }],
        dry: { head: ['pick', 'cost added', 'total', 'best[] after update (p0..p4)'], rows: [
          ['p0 (0,0)', '0', '0', '[–, 4, 13, 7, 7]'],
          ['p1 (2,2)', '4', '4', '[–, –, 9, 3, 7]'],
          ['p3 (5,2)', '3', '7', '[–, –, 9, –, 4]'],
          ['p4 (7,0)', '4', '11', '[–, –, 9, –, –]'],
          ['p2 (3,10)', '9', '<span class="c-g">20</span>', 'all in tree']
        ] },
        complexity: `<p>Time O(n²) = 10<sup>6</sup>; space O(n).</p>`,
        followUps: ['Solve it with Kruskal + DSU — what is the memory cost of n² edges?', 'Return the list of chosen links', 'For Manhattan distance, an O(n log n) MST exists using 8 octant sweeps — sketch the idea']
      }
    }]
  });

  // ================= TOPIC 6: Kruskal + DSU =================
  topics.push({
    title: 'Kruskal\'s MST with Disjoint Set Union (DSU)',
    analogy: `<p>A government has a <b>list of possible bridges between islands</b>, sorted from cheapest to most expensive. It goes down the list: "Does this bridge join two islands that are <b>not yet connected</b> (by any route)? Build it. Already connected? Skip — it would be a waste."</p>
      <p>To answer "already connected?" instantly, every island group keeps a <b>team captain</b>. Two islands are connected exactly when they have the same captain. That captain system is <b>DSU (Union-Find)</b>.</p>`,
    explain: `<h4>Kruskal in four lines</h4>
      <ol>
        <li>Sort all edges by weight (cheapest first).</li>
        <li>Start with every node in its own group.</li>
        <li>For each edge (u, v): if u and v are in <b>different</b> groups → take the edge and <b>merge</b> the groups. Same group → ${H.c('r', 'skip')} (it would make a cycle).</li>
        <li>Stop after V − 1 edges are taken.</li>
      </ol>
      <h4>Why it is correct</h4>
      <p>When the cheapest remaining edge joins two different groups, look at the cut "u's group vs everyone else". This edge is the cheapest one crossing that cut (every cheaper edge was already handled), so the <b>cut property</b> says it is safe.</p>
      <h4>DSU refresher (from Graphs I)</h4>
      <p>Array <code>parent[]</code>: each node points to a parent; the root (points to itself) is the group's captain.</p>
      <ul>
        <li><code>find(x)</code>: follow parents to the root. <b>Path compression</b>: on the way back, point every visited node straight at the root, so the next find is instant.</li>
        <li><code>union(a, b)</code>: find both roots; if equal → already together (return false). Else hang the <b>shorter</b> tree under the taller one (<b>union by rank</b>).</li>
      </ul>
      ${H.table(['edge (sorted)', 'find(u)', 'find(v)', 'decision'], [
        ['B–C (1)', 'B', 'C', H.c('g', 'take, merge')],
        ['B–D (2)', 'B', 'D', H.c('g', 'take, merge')],
        ['A–C (3)', 'A', 'B', H.c('g', 'take, merge')],
        ['D–F (3)', 'B', 'F', H.c('g', 'take, merge')],
        ['A–B (4)', 'B', 'B', H.c('r', 'same captain → cycle → skip')],
        ['C–E (4)', 'B', 'E', H.c('g', 'take — 5 edges = V − 1, done!')]
      ])}
      <p><b>Cost:</b> sorting O(E log E) dominates; the DSU work is O(E · α(V)) where α is the inverse Ackermann function (≤ 4 for any real input — effectively constant).</p>
      <p><b>Kruskal or Prim?</b> Edge list given / sparse graph → Kruskal (short, no adjacency list). Dense graph or points → array Prim. Both give the same total weight.</p>`,
    clues: [
      'input already given as an <b>edge list</b> <code>[u, v, cost]</code> + "connect all" → Kruskal',
      '"minimum cost to connect all cities / computers / wells"',
      '"which edges are critical / always in the MST?" → Kruskal with an edge forced in or out',
      '"add edges in increasing order until something becomes connected" (minimax / bottleneck paths)',
      '"group into k clusters maximising the minimum gap" → Kruskal stopped at k components',
      'online connectivity questions while edges arrive → DSU'
    ],
    code: [`
// Kruskal's MST with DSU (path compression + union by rank).
import java.util.*;

class Kruskal {
    static int[] parent, rnk;

    static int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]);   // path compression
        return parent[x];
    }

    static boolean union(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;                         // same group -> edge would form a cycle
        if (rnk[ra] < rnk[rb]) { int t = ra; ra = rb; rb = t; }
        parent[rb] = ra;                                    // hang the shorter tree under the taller
        if (rnk[ra] == rnk[rb]) rnk[ra]++;
        return true;
    }

    // edges: {u, v, w}. Returns MST weight, or -1 if the graph is disconnected.
    static long mst(int n, int[][] edges, List<int[]> chosen) {
        parent = new int[n];
        rnk = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        int[][] sorted = edges.clone();
        Arrays.sort(sorted, (a, b) -> Integer.compare(a[2], b[2]));   // cheapest first
        long total = 0;
        for (int[] e : sorted) {
            if (union(e[0], e[1])) {
                total += e[2];
                chosen.add(e);
                if (chosen.size() == n - 1) break;          // a spanning tree has n-1 edges
            }
        }
        return chosen.size() == n - 1 ? total : -1;
    }

    public static void main(String[] args) {
        int[][] edges = {{0,1,4},{0,2,3},{1,2,1},{1,3,2},{2,4,4},{3,4,5},{3,5,3},{4,5,6}};
        List<int[]> chosen = new ArrayList<>();
        System.out.println("MST weight = " + mst(6, edges, chosen));   // 13
        for (int[] e : chosen) System.out.println(e[0] + " - " + e[1] + " (" + e[2] + ")");
    }
}`, {
      lang: 'python', run: true, title: 'Kruskal in Python + clustering by stopping early (runnable)', code: `def kruskal(n, edges, stop_at_components=1):
    parent = list(range(n))
    rank = [0] * n

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]      # path halving (iterative compression)
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra == rb:
            return False
        if rank[ra] < rank[rb]:
            ra, rb = rb, ra
        parent[rb] = ra
        if rank[ra] == rank[rb]:
            rank[ra] += 1
        return True

    comps, total, chosen = n, 0, []
    for u, v, w in sorted(edges, key=lambda e: e[2]):
        if comps == stop_at_components:
            break
        if union(u, v):
            comps -= 1
            total += w
            chosen.append((u, v, w))
    return total, chosen, [find(i) for i in range(n)]

names = "ABCDEF"
edges = [(0,1,4),(0,2,3),(1,2,1),(1,3,2),(2,4,4),(3,4,5),(3,5,3),(4,5,6)]
total, chosen, _ = kruskal(6, edges)
print("MST weight:", total, [(names[u] + names[v], w) for u, v, w in chosen])

_, _, roots = kruskal(6, edges, stop_at_components=2)    # 2 clusters
groups = {}
for i, r in enumerate(roots):
    groups.setdefault(r, []).append(names[i])
print("2 clusters:", list(groups.values()))
` }],
    codeTitle: ['Kruskal + DSU template (Java)', 'Python version with clustering'],
    viz: {
      title: 'Kruskal: sorted edge list + DSU parent array',
      input: 'A B 4, A C 3, B C 1, B D 2, C E 4, D E 5, D F 3, E F 6',
      inputLabel: 'Undirected edges "from to weight" (≤ 8 nodes, ≤ 16 edges)',
      gen: function (input) {
        var G = parseGraph(input, { maxN: 8, maxE: 16, allowNeg: true });
        var ids = G.ids, n = ids.length, frames = [];
        var order = G.edges.map(function (e, i) { return i; }).sort(function (a, b) { return G.edges[a][2] - G.edges[b][2] || a - b; });
        var sorted = order.map(function (i) { return G.edges[i]; });
        var parent = {}, rank = {}, decision = sorted.map(function () { return ''; }), chosen = {}, total = 0, taken = 0, comps = n;
        ids.forEach(function (id) { parent[id] = id; rank[id] = 0; });
        function find(x) { var r = x; while (parent[r] !== r) r = parent[r]; while (parent[x] !== r) { var nx = parent[x]; parent[x] = r; x = nx; } return r; }
        function table(cur, cls) {
          var hl = {};
          sorted.forEach(function (e, i) { if (decision[i].indexOf('take') === 0) hl[i] = 'sel'; else if (decision[i]) hl[i] = 'done'; });
          if (cur >= 0) hl[cur] = cls || 'cur';
          return { type: 'table', label: 'Edges sorted by weight (cheapest first)', columns: ['#', 'edge', 'w', 'decision'], rows: sorted.map(function (e, i) { return [String(i + 1), e[0] + '–' + e[1], String(e[2]), decision[i]]; }), hl: hl };
        }
        function dsu(hlIds) {
          var h = {};
          (hlIds || []).forEach(function (p) { h[ids.indexOf(p[0])] = p[1]; });
          return { type: 'array', label: 'DSU parent[] (a node pointing to itself is a group captain / root)', values: ids.map(function (id) { return parent[id]; }), idxLabels: ids, hl: h };
        }
        function frame(narr, cur, cls, nodeHl, extraE, dsuHl) {
          var e = copyObj(chosen);
          if (extraE) e[extraE[0]] = extraE[1];
          frames.push({ narr: narr, parts: [
            gpart(G, false, 'Purple = MST edges taken, red = rejected', nodeHl || {}, e, {}),
            table(cur, cls),
            dsu(dsuHl),
            { type: 'vars', label: 'Progress', vals: { 'edges taken': taken + ' / ' + (n - 1), groups: comps, 'total weight': total } }
          ] });
        }
        frame('Step 1: sort all ' + sorted.length + ' edges by weight. Step 2: every node is its own group, so parent[x] = x for all.', -1, null, {});
        for (var i = 0; i < sorted.length; i++) {
          var u = sorted[i][0], v = sorted[i][1], w = sorted[i][2];
          var ru = find(u), rv = find(v);
          frame('Edge #' + (i + 1) + ': <b>' + u + '–' + v + ' (' + w + ')</b>. find(' + u + ') = <b>' + ru + '</b>, find(' + v + ') = <b>' + rv + '</b>' + (ru === rv ? ' — the same root!' : ' — different roots.') + ' (finds also compress paths.)', i, 'cur', two(u, 'cur', v, 'cur'), [u + '-' + v, 'cur'], [[ru, 'win'], [rv, 'win']]);
          if (ru === rv) {
            decision[i] = 'skip (cycle)';
            frame('<span class="c-r">Same group</span>: ' + u + ' and ' + v + ' are already connected through taken edges. Adding ' + u + '–' + v + ' would create a cycle → skip.', i, 'bad', two(u, 'bad', v, 'bad'), [u + '-' + v, 'bad'], [[ru, 'bad']]);
          } else {
            if (rank[ru] < rank[rv]) { var t = ru; ru = rv; rv = t; }
            parent[rv] = ru;
            if (rank[ru] === rank[rv]) rank[ru]++;
            taken++; comps--; total += w;
            chosen[u + '-' + v] = 'sel';
            decision[i] = 'take ✔';
            frame('<span class="c-g">Different groups → take it.</span> Union by rank: root ' + rv + ' now points to ' + ru + ' (parent[' + rv + '] = ' + ru + '). Total = ' + total + '.', i, 'ok', two(u, 'ok', v, 'ok'), null, [[rv, 'ok'], [ru, 'sel']]);
            if (taken === n - 1) {
              for (var j = i + 1; j < sorted.length; j++) decision[j] = 'not needed';
              frame('We have V − 1 = ' + (n - 1) + ' edges → the spanning tree is complete. Remaining edges are never looked at. <span class="c-g">MST weight = ' + total + '</span>.', -1, null, {});
              return frames;
            }
          }
        }
        frame('<span class="c-r">Ran out of edges with only ' + taken + ' taken</span> → the graph has ' + comps + ' separate groups, so no spanning tree exists (this is a minimum spanning <b>forest</b>).', -1, null, {});
        return frames;
      }
    },
    examples: [
      { title: 'Path compression in action', html: `<p>Chain parent: D → C → B → A (A is root). <code>find(D)</code> walks 3 steps, then sets parent[D] = parent[C] = A. Next <code>find(D)</code> is 1 step. ${H.arr(['A', 'A', 'B', 'C'], { label: 'before (A B C D)' })}${H.arr(['A', 'A', 'A', 'A'], { label: 'after find(D)', hl: { 2: 'g', 3: 'g' } })}</p>` },
      { title: 'Optimize Water Distribution (virtual node trick)', html: `<p>Each house can dig its own well (cost well[i]) or connect by pipe. Add a <b>virtual node 0</b> = "the ground water", with edge 0–i of weight well[i]. Now it is a plain MST over n + 1 nodes: Kruskal decides automatically which houses dig wells.</p>` },
      { title: 'Clustering (single linkage)', html: `<p>Want k = 2 groups with the biggest possible gap between groups? Run Kruskal but <b>stop when 2 components remain</b>. The next edge Kruskal would take is exactly the maximum possible minimum gap. The runnable Python shows the 2 clusters for the default graph.</p>` },
      { title: 'Minimum bottleneck path', html: `<p>"Find a path from s to t that minimises the <b>largest</b> edge on it." Add edges in increasing order (Kruskal style) until s and t share a root — the last edge added is the answer. Every MST path is a minimum bottleneck path.</p>`, code: `
static int bottleneck(int n, int[][] edges, int s, int t) {
    int[] parent = new int[n];
    for (int i = 0; i < n; i++) parent[i] = i;
    int[][] sorted = edges.clone();
    Arrays.sort(sorted, (a, b) -> Integer.compare(a[2], b[2]));
    for (int[] e : sorted) {
        parent[root(parent, e[0])] = root(parent, e[1]);
        if (root(parent, s) == root(parent, t)) return e[2];   // the bottleneck
    }
    return -1;                                               // never connected
}
static int root(int[] p, int x) {
    while (p[x] != x) { p[x] = p[p[x]]; x = p[x]; }
    return x;
}` }
    ],
    deepDive: `<p><b>Exact complexity.</b> Sorting O(E log E) = O(E log V). DSU with both path compression and union by rank: O(α(V)) amortised per operation (Tarjan 1975); with only one of them, O(log V). If weights are small integers, counting/radix sort makes Kruskal nearly linear.</p>
      <p><b>Recursion depth.</b> Recursive <code>find</code> on a long chain (before compression) can overflow the Java stack around 10<sup>4</sup>–10<sup>5</sup> deep. With union by rank the depth stays ≤ log V, or use the iterative two-pass / path-halving find.</p>
      <p><b>Critical vs pseudo-critical edges (LC 1489).</b> Edge e is <i>critical</i> if removing it increases the MST weight (or disconnects); <i>pseudo-critical</i> if forcing it in still gives the optimal weight. Run Kruskal E times with "skip e" / "force e": O(E² α). Faster: within each group of equal weights, find bridges in the component graph.</p>
      <p><b>Second-best MST:</b> for each non-tree edge (u, v, w), adding it creates a cycle; remove the max tree edge on the u–v tree path. With LCA + binary lifting that max is O(log V) per query → O(E log V) total.</p>
      <p><b>Borůvka's algorithm</b> (1926, the oldest MST algorithm): every component picks its cheapest outgoing edge at once; components at least halve each round → O(E log V). It parallelises beautifully, which is why GPU and distributed MST (e.g. on Spark) use it.</p>
      <p><b>Production:</b> DSU also powers Kruskal-based image segmentation, percolation simulations, detecting network partitions, and incremental connectivity in databases ("are these two accounts linked?").</p>`,
    aiEra: `<p><b>What AI changes:</b> DSU and Kruskal are boilerplate an assistant writes instantly. Interviewers therefore probe the modelling (virtual nodes, forcing/skipping edges, stopping early for clusters) and the α(V) argument.</p>
      <p><b>Use AI as a partner:</b> <code>Give me 3 problems that look like shortest path but are really MST, and 3 the other way round</code> — classify them yourself first. Or <code>Generate a stress test where recursive find overflows the stack</code>.</p>
      <p><b>Where AI goes wrong:</b> sorts edges by the wrong index, forgets to stop at V − 1 edges (still correct but slower), returns a weight for a disconnected graph, or "optimises" union by rank away and gets deep trees.</p>
      <p><b>What you must still own:</b> the cut-property proof for Kruskal, knowing when Kruskal beats Prim, and adapting it (forced edges, virtual nodes, k clusters).</p>`,
    problems: [{
      title: 'Connecting Cities With Minimum Cost (LeetCode 1135)', level: 'Medium', tags: ['mst', 'kruskal', 'union find'], companies: ['Amazon', 'Google'],
      statement: `<p>There are n cities labelled 1..n. <code>connections[i] = [x, y, cost]</code> is the cost to connect cities x and y (bidirectional). Return the minimum cost so that every pair of cities is connected (directly or indirectly). If it is impossible, return <b>-1</b>.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>4</sup>, 1 ≤ connections.length ≤ 10<sup>4</sup>, 0 ≤ cost ≤ 10<sup>5</sup>.`,
      example: `<p>n = 3, connections = [[1,2,5],[1,3,6],[2,3,1]] → ${H.c('g', '6')}</p><p>Take 2–3 (1), then 1–2 (5): all three cities connected for ${H.c('g', '6')}. Edge 1–3 (6) is never needed.</p>`,
      brute: { why: `<p>Try every subset of n − 1 edges and keep the cheapest that connects everything. With 10<sup>4</sup> edges the number of subsets is astronomically large. The waste: ignoring the greedy fact that the cheapest safe edge can always be taken.</p>`, code: `
class Solution {
    int best = Integer.MAX_VALUE;
    public int minimumCost(int n, int[][] connections) {
        pick(n, connections, 0, new ArrayList<>(), 0);
        return best == Integer.MAX_VALUE ? -1 : best;
    }
    void pick(int n, int[][] c, int i, List<int[]> cur, int cost) {
        if (cur.size() == n - 1) { if (connected(n, cur)) best = Math.min(best, cost); return; }
        if (i == c.length) return;
        cur.add(c[i]);                                   // take edge i
        pick(n, c, i + 1, cur, cost + c[i][2]);
        cur.remove(cur.size() - 1);
        pick(n, c, i + 1, cur, cost);                    // skip edge i
    }
    boolean connected(int n, List<int[]> es) {           // simple DFS check
        List<List<Integer>> g = new ArrayList<>();
        for (int i = 0; i <= n; i++) g.add(new ArrayList<>());
        for (int[] e : es) { g.get(e[0]).add(e[1]); g.get(e[1]).add(e[0]); }
        boolean[] seen = new boolean[n + 1];
        Deque<Integer> st = new ArrayDeque<>();
        st.push(1); seen[1] = true; int cnt = 1;
        while (!st.isEmpty()) for (int v : g.get(st.pop())) if (!seen[v]) { seen[v] = true; cnt++; st.push(v); }
        return cnt == n;
    }
}` },
      mcq: { q: 'While scanning sorted edges, find(x) == find(y). What do you do?', options: ['Skip the edge — it would close a cycle', 'Take it — it is cheap', 'Stop the algorithm', 'Swap the two roots'], answer: 0, explain: 'Same root = already connected. Adding the edge only adds cost and creates a cycle; a tree never needs it.' },
      hints: [`<p>"Connect every pair, minimum total cost" = MST. The input is already an edge list — perfect for Kruskal.</p>`, `<p>Sort by cost, DSU over 1..n (size n + 1). Take an edge only when <code>union</code> returns true.</p>`, `<p>Count taken edges; when it hits n − 1, return the total. If the loop ends earlier → -1. Edge case n = 1 → 0 (no edges needed).</p>`],
      solution: {
        approach: `<p>Kruskal with DSU (path compression + union by rank). Stop as soon as n − 1 edges are taken.</p>`,
        code: `
class Solution {
    int[] parent, rnk;

    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];   // path halving
            x = parent[x];
        }
        return x;
    }

    boolean union(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;
        if (rnk[ra] < rnk[rb]) { int t = ra; ra = rb; rb = t; }
        parent[rb] = ra;
        if (rnk[ra] == rnk[rb]) rnk[ra]++;
        return true;
    }

    public int minimumCost(int n, int[][] connections) {
        if (n == 1) return 0;
        parent = new int[n + 1];
        rnk = new int[n + 1];
        for (int i = 0; i <= n; i++) parent[i] = i;
        Arrays.sort(connections, (a, b) -> Integer.compare(a[2], b[2]));
        int total = 0, used = 0;
        for (int[] c : connections) {
            if (union(c[0], c[1])) {
                total += c[2];
                if (++used == n - 1) return total;   // spanning tree complete
            }
        }
        return -1;                                     // still more than one group
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def minimumCost(self, n, connections):
        parent = list(range(n + 1))

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        total = used = 0
        for x, y, c in sorted(connections, key=lambda e: e[2]):
            rx, ry = find(x), find(y)
            if rx != ry:
                parent[ry] = rx
                total += c
                used += 1
                if used == n - 1:
                    return total
        return 0 if n == 1 else -1` }],
        dry: { head: ['edge (sorted)', 'roots', 'action', 'used / total'], rows: [
          ['2–3 (1)', '2 ≠ 3', 'union', '1 / 1'],
          ['1–2 (5)', '1 ≠ 2', 'union', '2 / 6 → used = n − 1 → return <span class="c-g">6</span>'],
          ['1–3 (6)', '—', 'never reached', '—']
        ] },
        complexity: `<p>Time O(E log E) for sorting + O(E α(n)) for DSU; space O(n).</p>`,
        followUps: ['Find Critical and Pseudo-Critical Edges (LC 1489)', 'Some cities can build an airport for a cost instead — model it (virtual node)', 'Edges arrive in a stream — maintain the MST weight online']
      }
    }]
  });

  // ================= TOPIC 7: Variants =================
  topics.push({
    title: 'Shortest-Path Variants: K Stops, Minimum Effort & Multi-Criteria States',
    analogy: `<p>Booking a trip, you rarely want "just the cheapest". You want "the cheapest with <b>at most one layover</b>", or "the route whose <b>single worst road</b> is least bumpy", or "the cheapest that still <b>arrives before 6 pm</b>".</p>
      <p>The trick is always the same: <b>write the extra rule into the "state"</b> (where you are + how many stops used + …) or into <b>how costs combine</b> (add, take the max, multiply), and then run a familiar algorithm on that bigger picture.</p>`,
    explain: `<h4>Two knobs that turn one algorithm into dozens</h4>
      ${H.table(['knob', 'normal', 'variants'], [
        ['<b>state</b> (what a node means)', 'city', '(city, stops used), (city, fuel left), (cell, walls broken), (city, time so far)'],
        ['<b>combine</b> (how a path\'s cost grows)', 'sum of weights', 'max edge (minimum effort / minimax), product (probability), tuple (cost, then time)']
      ])}
      <p>Dijkstra still works as long as the cost <b>never decreases</b> when you extend a path (sum of non-negatives, max, product of numbers ≤ 1 with a max-heap) and costs can be compared in a fixed order.</p>
      <h4>1) At most K stops — Cheapest Flights (LC 787)</h4>
      <p>"At most K stops" = at most K + 1 edges. Bellman-Ford's round r makes every path with ≤ r edges correct — so run <b>exactly K + 1 rounds</b>. Catch: inside one round, use the <b>previous round's</b> array, or one round could chain two flights and break the limit.</p>
      ${H.table(['round', 'reads from', 'writes to', 'meaning'], [['1', 'prev (0 flights)', 'cur', 'best with ≤ 1 flight'], ['2', 'prev = round 1', 'cur', 'best with ≤ 2 flights'], ['…', '', '', ''], ['K + 1', 'prev', 'cur', H.c('g', 'answer = cur[dst]')]])}
      <p>Plain Dijkstra on cities is <b>wrong</b> here: a cheap route with too many stops might "finalise" a city and block a pricier route that respects the limit. Fix: Dijkstra over states <code>(city, stops)</code>, or the Bellman-Ford rounds above.</p>
      <h4>2) Minimum effort — combine with max (LC 1631)</h4>
      <p>Effort of a path = the <b>largest</b> height jump along it. Replace <code>d + w</code> with <code>max(d, w)</code> in Dijkstra. Taking a max never makes the value smaller, so the first time the target is polled, it is optimal. (Also solvable by binary search on the answer + BFS, or Kruskal-style DSU.)</p>
      <h4>3) Multi-criteria — state + tie-breaks</h4>
      <ul>
        <li><b>Lexicographic</b> ("min cost, then min time"): store a pair and compare cost first, time second. Still Dijkstra.</li>
        <li><b>Constrained</b> ("min cost with total time ≤ T", LC 1928): add time to the state <code>(city, timeUsed)</code> or keep, per city, the best time seen so far and only push a state if it is <b>faster</b> (a state that is both pricier and slower is <b>dominated</b> and useless).</li>
        <li><b>Counting</b> ("number of shortest paths", LC 1976): keep <code>ways[v]</code> next to <code>dist[v]</code>: strictly better → copy ways; equal → add ways.</li>
      </ul>`,
    clues: [
      '"at most <b>K stops</b> / K edges / K transfers" → K + 1 rounds of Bellman-Ford with a copied array, or Dijkstra on (node, stops)',
      '"minimise the <b>maximum</b> difference / height / weight along the path" → Dijkstra with max, or binary search + BFS, or DSU',
      '"maximum <b>probability</b> path" → Dijkstra with a max-heap and multiplication',
      '"cheapest path that takes <b>at most T time</b>" → state (node, time) or dominance pruning',
      '"<b>number of ways</b> to arrive in the shortest time" → dist[] + ways[] together (mod 10<sup>9</sup>+7)',
      '"you may use <b>one coupon / k free edges</b>" → state (node, couponsUsed), layered graph'
    ],
    code: [`
// Template: Dijkstra over an EXPANDED state (node, extra) with a custom combine.
// Example: cheapest price from src to dst using at most k stops, via states (city, flightsUsed).
import java.util.*;

class StateDijkstra {
    static int cheapest(int n, int[][] flights, int src, int dst, int k) {
        List<List<int[]>> g = new ArrayList<>();
        for (int i = 0; i < n; i++) g.add(new ArrayList<>());
        for (int[] f : flights) g.get(f[0]).add(new int[]{f[1], f[2]});
        int maxEdges = k + 1;
        int[][] best = new int[n][maxEdges + 1];              // best[city][edgesUsed]
        for (int[] row : best) Arrays.fill(row, Integer.MAX_VALUE);
        best[src][0] = 0;
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        pq.add(new int[]{0, src, 0});                         // {cost, city, edgesUsed}
        while (!pq.isEmpty()) {
            int[] t = pq.poll();
            int cost = t[0], u = t[1], used = t[2];
            if (u == dst) return cost;                        // first time dst is polled = cheapest valid
            if (cost > best[u][used] || used == maxEdges) continue;
            for (int[] e : g.get(u)) {
                int nc = cost + e[1];
                if (nc < best[e[0]][used + 1]) {
                    best[e[0]][used + 1] = nc;
                    pq.add(new int[]{nc, e[0], used + 1});
                }
            }
        }
        return -1;
    }

    // Minimum effort: same skeleton, combine = max instead of +.
    static int minEffort(int[][] h) {
        int R = h.length, C = h[0].length;
        int[][] eff = new int[R][C];
        for (int[] row : eff) Arrays.fill(row, Integer.MAX_VALUE);
        eff[0][0] = 0;
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        pq.add(new int[]{0, 0, 0});
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!pq.isEmpty()) {
            int[] t = pq.poll();
            int e = t[0], r = t[1], c = t[2];
            if (r == R - 1 && c == C - 1) return e;
            if (e > eff[r][c]) continue;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nc < 0 || nr >= R || nc >= C) continue;
                int ne = Math.max(e, Math.abs(h[nr][nc] - h[r][c]));   // <- the only change
                if (ne < eff[nr][nc]) { eff[nr][nc] = ne; pq.add(new int[]{ne, nr, nc}); }
            }
        }
        return 0;
    }

    public static void main(String[] args) {
        int[][] flights = {{0,1,100},{1,2,100},{2,0,100},{1,3,600},{2,3,200}};
        System.out.println(cheapest(4, flights, 0, 3, 1));            // 700
        System.out.println(cheapest(4, flights, 0, 3, 2));            // 400
        System.out.println(minEffort(new int[][]{{1,2,2},{3,8,2},{5,3,5}}));   // 2
    }
}`, {
      lang: 'python', run: true, title: 'Counting shortest paths + lexicographic tie-break (runnable)', code: `import heapq

MOD = 10**9 + 7

def count_shortest(n, roads):
    # LC 1976 idea: dist[] and ways[] travel together
    g = [[] for _ in range(n)]
    for u, v, t in roads:
        g[u].append((v, t))
        g[v].append((u, t))
    dist = [float('inf')] * n
    ways = [0] * n
    dist[0], ways[0] = 0, 1
    pq = [(0, 0)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v, t in g[u]:
            nd = d + t
            if nd < dist[v]:                 # strictly better: inherit u's ways
                dist[v], ways[v] = nd, ways[u]
                heapq.heappush(pq, (nd, v))
            elif nd == dist[v]:              # another equally short way
                ways[v] = (ways[v] + ways[u]) % MOD
    return dist[n - 1], ways[n - 1]

def cheapest_then_fastest(n, edges, s, t):
    # each edge has (cost, time); compare tuples: cost first, time second
    g = [[] for _ in range(n)]
    for u, v, c, tm in edges:
        g[u].append((v, c, tm))
    best = [(float('inf'), float('inf'))] * n
    best[s] = (0, 0)
    pq = [(0, 0, s)]
    while pq:
        c, tm, u = heapq.heappop(pq)
        if (c, tm) > best[u]:
            continue
        for v, ec, et in g[u]:
            cand = (c + ec, tm + et)
            if cand < best[v]:               # Python compares tuples lexicographically
                best[v] = cand
                heapq.heappush(pq, (cand[0], cand[1], v))
    return best[t]

roads = [[0,6,7],[0,1,2],[1,2,3],[1,3,3],[6,3,3],[3,5,1],[6,5,1],[2,5,1],[0,4,5],[4,6,2]]
print("shortest time, number of ways:", count_shortest(7, roads))     # (7, 4)
edges = [(0,1,5,1),(0,2,5,9),(1,3,5,1),(2,3,5,1),(0,3,10,50)]
print("(cost, time) to node 3:", cheapest_then_fastest(4, edges, 0, 3))  # (10, 2)
` }],
    codeTitle: ['Dijkstra over expanded states + max-combine (Java)', 'Counting paths & tuple costs (Python)'],
    viz: [{
      title: 'Cheapest flights within K stops: K + 1 Bellman-Ford rounds with prev/cur arrays',
      input: 'K=1 dst=D | A B 100, B C 100, C A 100, B D 600, C D 200',
      inputLabel: 'Format: K=&lt;stops&gt; dst=&lt;node&gt; | directed flights "from to price" (source = first node)',
      gen: function (input) {
        var s = String(input === undefined || input === null ? '' : input);
        var mt = s.match(/^\s*K\s*=\s*(\d+)\s+dst\s*=\s*([A-Za-z0-9]{1,3})\s*\|(.*)$/i);
        if (!mt) throw new Error('Format: K=1 dst=D | A B 100, B C 100, ...');
        var K = Number(mt[1]), dst = mt[2];
        if (K > 4) throw new Error('Keep K between 0 and 4 so the animation stays short');
        var G = parseGraph(mt[3], { maxN: 7, maxE: 10 });
        if (G.ids.indexOf(dst) < 0) throw new Error('dst must be one of the nodes: ' + G.ids.join(', '));
        var ids = G.ids, src = ids[0], E = G.edges, frames = [];
        var prev = {};
        ids.forEach(function (id) { prev[id] = INF; });
        prev[src] = 0;
        var rows = E.map(function (e, i) { return [String(i + 1), e[0] + ' → ' + e[1], String(e[2])]; });
        function frame(narr, cur, round, ei, cls, nodeHl) {
          var eh = {}, th = {};
          if (ei >= 0) { eh[E[ei][0] + '-' + E[ei][1]] = cls; th[ei] = cls; }
          var parts = [
            gpart(G, true, 'Flights (tags = best price using ≤ ' + round + ' flight(s))', nodeHl || one(dst, 'sel'), eh, distTags(ids, cur || prev)),
            { type: 'table', label: 'Flights', columns: ['#', 'flight', 'price'], rows: rows, hl: th },
            distArr(ids, prev, {}, 'prev[] = best with ≤ ' + Math.max(round - 1, 0) + ' flight(s) (READ only)')
          ];
          if (cur) parts.push(distArr(ids, cur, ei >= 0 && cls === 'ok' ? one(ids.indexOf(E[ei][1]), 'ok') : {}, 'cur[] = best with ≤ ' + round + ' flight(s) (WRITE)'));
          frames.push({ narr: narr, parts: parts });
        }
        frame('Goal: cheapest ' + src + ' → ' + dst + ' with at most K = ' + K + ' stop(s) = at most <b>' + (K + 1) + ' flight(s)</b>. Start: prev[' + src + '] = 0 (0 flights), others ∞.', null, 0, -1, '');
        for (var r = 1; r <= K + 1; r++) {
          var cur = copyObj(prev);
          frame('Round ' + r + ': copy prev into cur. We will <b>read prev</b> and <b>write cur</b>, so each route in this round adds exactly one more flight.', cur, r, -1, '');
          for (var i = 0; i < E.length; i++) {
            var u = E[i][0], v = E[i][1], w = E[i][2];
            if (prev[u] === INF) {
              frame('Flight ' + u + ' → ' + v + ': prev[' + u + '] = ∞ (cannot be at ' + u + ' with ≤ ' + (r - 1) + ' flights) → skip.', cur, r, i, 'bad', one(u, 'bad'));
            } else if (prev[u] + w < cur[v]) {
              var old = cur[v];
              cur[v] = prev[u] + w;
              frame('Flight ' + u + ' → ' + v + ': prev[' + u + '] + ' + w + ' = <b>' + cur[v] + '</b> &lt; ' + fmt(old) + ' ✔ cur[' + v + '] = ' + cur[v] + '.', cur, r, i, 'ok', two(u, 'cur', v, 'ok'));
            } else {
              frame('Flight ' + u + ' → ' + v + ': ' + prev[u] + ' + ' + w + ' = ' + (prev[u] + w) + ' is not cheaper than ' + fmt(cur[v]) + '.', cur, r, i, 'cur', two(u, 'cur', v, 'win'));
            }
          }
          prev = cur;
          frame('End of round ' + r + ': prev = cur. Every price now uses at most ' + r + ' flight(s). (If we had updated in place, a route could have chained two flights in one round and broken the stop limit.)', null, r, -1, '');
        }
        frames.push({ narr: prev[dst] === INF ? '<span class="c-r">' + dst + ' is unreachable within ' + (K + 1) + ' flights → answer -1.</span>' : 'Answer: cheapest price to ' + dst + ' with ≤ ' + K + ' stop(s) = <span class="c-g">' + prev[dst] + '</span>. Try K=2 to see a cheaper route with one more stop.', parts: [
          gpart(G, true, 'Final prices with ≤ ' + (K + 1) + ' flights', one(dst, prev[dst] === INF ? 'bad' : 'ok'), {}, distTags(ids, prev)),
          distArr(ids, prev, one(ids.indexOf(dst), 'sel'), 'final')
        ] });
        return frames;
      }
    }, {
      title: 'Path with minimum effort: Dijkstra where cost = max jump (grid)',
      input: '1 2 2; 3 8 2; 5 3 5',
      inputLabel: 'Heights grid: rows separated by ";" numbers by spaces (max 4 × 4, values 0..99)',
      gen: function (input) {
        var s = String(input === undefined || input === null ? '' : input).trim();
        if (!s) throw new Error('Type a grid like: 1 2 2; 3 8 2; 5 3 5');
        var H2 = s.split(';').map(function (row) { return row.trim().split(/[\s,]+/).filter(Boolean).map(Number); });
        if (H2.length > 4 || H2.some(function (r) { return r.length > 4 || r.length === 0; })) throw new Error('Keep the grid at most 4 × 4');
        if (H2.some(function (r) { return r.length !== H2[0].length; })) throw new Error('All rows need the same number of values');
        if (H2.some(function (r) { return r.some(function (x) { return !Number.isInteger(x) || x < 0 || x > 99; }); })) throw new Error('Heights must be whole numbers 0..99');
        var R = H2.length, C = H2[0].length, eff = [], frames = [], pq = [[0, 0, 0]];
        for (var r = 0; r < R; r++) { eff.push([]); for (var c = 0; c < C; c++) eff[r].push(INF); }
        eff[0][0] = 0;
        var done = {};
        function effRows() { return eff.map(function (row) { return row.map(fmt); }); }
        function frame(narr, hl) {
          var hh = {};
          for (var k in done) hh[k] = 'ok';
          for (var k2 in hl) hh[k2] = hl[k2];
          frames.push({ narr: narr, parts: [
            { type: 'grid', label: 'heights', rows: H2.map(function (row) { return row.slice(); }), hl: hh },
            { type: 'grid', label: 'effort[r][c] = smallest possible "worst jump" to reach this cell', rows: effRows(), hl: hh },
            { type: 'queue', label: 'PriorityQueue (effort, r, c) — front polled next', items: pq.map(function (x) { return '(' + x[0] + ', ' + x[1] + ',' + x[2] + ')'; }), hl: pq.length ? { 0: 'cur' } : {}, frontLabel: 'poll', backLabel: 'largest' }
          ] });
        }
        frame('Start at the top-left with effort 0. A path\'s effort is its <b>largest</b> single jump |height difference|, so we combine with <b>max(effort, jump)</b> instead of adding.', one('0,0', 'sel'));
        var guard = 0;
        while (pq.length && guard++ < 80) {
          var t = pq.shift(), e = t[0], pr = t[1], pc = t[2], key = pr + ',' + pc;
          if (e > eff[pr][pc]) { frame('Poll (' + e + ', ' + pr + ',' + pc + '): stale — cell already has effort ' + eff[pr][pc] + '. Skip.', one(key, 'bad')); continue; }
          if (pr === R - 1 && pc === C - 1) {
            done[key] = true;
            frame('Poll the <b>target</b> cell with effort ' + e + '. Because max never decreases along a path, the first poll is optimal → <span class="c-g">answer = ' + e + '</span>.', one(key, 'sel'));
            return frames;
          }
          done[key] = true;
          var notes = [], hl = one(key, 'cur');
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
            var nr = pr + d[0], nc = pc + d[1];
            if (nr < 0 || nc < 0 || nr >= R || nc >= C || done[nr + ',' + nc]) return;
            var jump = Math.abs(H2[nr][nc] - H2[pr][pc]), ne = Math.max(e, jump);
            if (ne < eff[nr][nc]) {
              eff[nr][nc] = ne; pqPush(pq, [ne, nr, nc]); hl[nr + ',' + nc] = 'win';
              notes.push('(' + nr + ',' + nc + '): jump ' + jump + ' → max(' + e + ', ' + jump + ') = <b>' + ne + '</b> ✔');
            } else notes.push('(' + nr + ',' + nc + '): max(' + e + ', ' + jump + ') = ' + ne + ' not better');
          });
          frame('Poll cell (' + pr + ',' + pc + ') with effort ' + e + ' — final. Neighbours: ' + (notes.length ? notes.join('; ') : 'none left') + '.', hl);
        }
        frame('Queue empty.', {});
        return frames;
      }
    }],
    examples: [
      { title: 'Why plain Dijkstra fails with a stop limit', html: `<p>Flights A→B 100, B→C 100, C→D 100, A→C 500, K = 1 (≤ 2 flights). Plain Dijkstra finalises C at 200 (via B, 2 flights), then reaches D at 300 using <b>3</b> flights — invalid. The valid answer is A→C→D = ${H.c('g', '600')}. The cheap state "C after 2 flights" must not block "C after 1 flight at 500". Expanded state (city, flights) or K + 1 rounds fixes it.</p>` },
      { title: 'Path With Maximum Probability (LC 1514)', html: `<p>Combine = multiply, goal = maximise. Probabilities are ≤ 1, so extending a path never <b>increases</b> it — the mirror of "never decreases". Use a <b>max</b>-heap and <code>prob[u] * p</code>. (Alternatively take −log(p) to turn it into a normal sum-Dijkstra.)</p>`, code: `PriorityQueue<double[]> pq = new PriorityQueue<>((a, b) -> Double.compare(b[0], a[0])); // max-heap\n// relax: if (prob[u] * p > prob[v]) { prob[v] = prob[u] * p; pq.add(new double[]{prob[v], v}); }` },
      { title: 'Minimum effort three ways', html: `<p>Grid [[1,2,2],[3,8,2],[5,3,5]] → ${H.c('g', '2')}. (1) Dijkstra with max (visualizer). (2) Binary search the answer X in 0..10<sup>6</sup>, BFS using only jumps ≤ X: O(RC log 10<sup>6</sup>). (3) Sort all neighbour edges by jump, union cells with DSU until start and end connect; the last jump is the answer (Kruskal-style).</p>` },
      { title: 'Layered graph for "k free edges"', html: `<p>"You may skip the cost of up to k roads." Make k + 1 copies of the graph (layers 0..k). Normal edges stay in a layer; a free edge goes from layer j to layer j + 1 with cost 0. Dijkstra on V·(k + 1) nodes; answer = min over layers at the target. This is the state (node, freeUsed) drawn as a picture.</p>` }
    ],
    deepDive: `<p><b>When does Dijkstra generalise?</b> You need a path cost that is (1) <b>monotone</b> — extending a path never makes it better — and (2) <b>totally ordered</b> with the order respected by extension (if cost(P) ≤ cost(Q) then cost(P + e) ≤ cost(Q + e)). Sum of non-negatives, max, min-bottleneck (maximise the minimum capacity with a max-heap), product of probabilities and lexicographic tuples all qualify. These are the "closed semiring" / algebraic path problems.</p>
      <p><b>Why K-stops breaks the second rule.</b> With a hop limit, a cheaper partial path can be <i>worse</i> in the future (it used up more hops). The order is no longer total on cost alone → put hops into the state. State count = V·(K + 1); each state has deg(v) edges → O(E·K log(V·K)). Bellman-Ford rounds: O(K·E) — usually simpler and just as fast.</p>
      <p><b>Constrained shortest path</b> (min cost with time ≤ T) is NP-hard in general, but pseudo-polynomial when T is small: state (node, time) gives O(E·T). With dominance pruning (keep only Pareto-optimal (cost, time) labels per node) it is fast in practice — this is how airline and transit planners (e.g. RAPTOR, multi-criteria label-setting) work.</p>
      <p><b>Counting shortest paths:</b> correct because nodes are finalised in distance order; ways[u] is complete before u relaxes its neighbours. Do it with lazy deletion carefully: only relax from non-stale pops, or you double count.</p>
      <p><b>Overflow:</b> LC 1976 times go up to 10<sup>9</sup> × 200 edges — distances need <code>long</code>. Probabilities: products of many small numbers underflow to 0; logs avoid it.</p>`,
    aiEra: `<p><b>What AI changes:</b> models are excellent at the base algorithms and weaker at noticing that a constraint ("at most K stops") breaks the base algorithm. Interviewers know this and love these variants.</p>
      <p><b>Use AI as a partner:</b> <code>Here is my state definition (city, stopsUsed). Find an input where a smaller state would give a wrong answer</code> — make it argue against you. Or ask for a brute-force DFS for tiny inputs to fuzz your variant.</p>
      <p><b>Where AI goes wrong:</b> uses plain Dijkstra with a visited[] set for K-stops (wrong), updates Bellman-Ford in place for K-stops (wrong), forgets <code>long</code> in path counting, counts ways from stale heap entries.</p>
      <p><b>What you must still own:</b> choosing the state, checking monotonicity of the combine function, and estimating the size of the expanded state space before coding.</p>`,
    problems: [{
      title: 'Cheapest Flights Within K Stops (LeetCode 787)', level: 'Medium', tags: ['bellman-ford', 'k stops', 'state dijkstra'], companies: ['Amazon', 'Airbnb', 'Google', 'Meta'],
      statement: `<p>There are n cities and directed flights <code>flights[i] = [from, to, price]</code>. Given <code>src</code>, <code>dst</code> and <code>k</code>, return the cheapest price from src to dst with <b>at most k stops</b> (k stops = k + 1 flights). If there is no such route, return -1.</p>`,
      constraints: `1 ≤ n ≤ 100, 0 ≤ flights.length ≤ n(n−1)/2, 1 ≤ price ≤ 10<sup>4</sup>, 0 ≤ k &lt; n, no duplicate flights.`,
      example: `<p>n = 4, flights = [[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]], src = 0, dst = 3, k = 1 → ${H.c('g', '700')}</p><p>0 → 1 → 3 costs 700 with 1 stop. 0 → 1 → 2 → 3 costs only 400 but has ${H.c('r', '2 stops')} — not allowed.</p>`,
      brute: { why: `<p>DFS every route of at most k + 1 flights and keep the cheapest that ends at dst. With branching factor b, that is O(b<sup>k+1</sup>) — explodes for k ≈ 100. The waste: the same (city, flights used) situation is explored again and again.</p>`, code: `
class Solution {
    int best = Integer.MAX_VALUE;
    List<List<int[]>> g;
    public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
        g = new ArrayList<>();
        for (int i = 0; i < n; i++) g.add(new ArrayList<>());
        for (int[] f : flights) g.get(f[0]).add(new int[]{f[1], f[2]});
        dfs(src, dst, k + 1, 0);
        return best == Integer.MAX_VALUE ? -1 : best;
    }
    void dfs(int u, int dst, int flightsLeft, int cost) {
        if (cost >= best) return;                 // prune: already worse
        if (u == dst) { best = cost; return; }
        if (flightsLeft == 0) return;
        for (int[] e : g.get(u)) dfs(e[0], dst, flightsLeft - 1, cost + e[1]);
    }
}` },
      mcq: { q: 'In the K + 1 rounds of Bellman-Ford, why read from a copy of the previous round?', options: ['So one round cannot chain two flights and exceed the stop limit', 'To avoid negative cycles', 'Because Java arrays are immutable', 'It is only an optimisation'], answer: 0, explain: 'Updating in place lets a value written earlier in the same round be used again in that round — the path gains two edges in one round, breaking the "≤ r edges after round r" meaning.' },
      hints: [`<p>"At most k stops" = at most k + 1 edges. Which algorithm naturally grows paths one edge per round?</p>`, `<p>Bellman-Ford for exactly k + 1 rounds. Each round: <code>cur = prev.clone()</code>, relax every flight reading <b>prev</b>, writing <b>cur</b>.</p>`, `<p>Guard prev[u] != INF. After k + 1 rounds, answer = prev[dst] or -1. Alternative: Dijkstra on (city, stops) — never use a plain visited[] on cities.</p>`],
      solution: {
        approach: `<p>Bounded Bellman-Ford: k + 1 rounds with a fresh copy each round. O(k · E).</p>`,
        code: `
class Solution {
    public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
        final int INF = Integer.MAX_VALUE;
        int[] prev = new int[n];
        Arrays.fill(prev, INF);
        prev[src] = 0;
        for (int round = 0; round <= k; round++) {        // k + 1 flights at most
            int[] cur = prev.clone();                     // write here, read prev
            for (int[] f : flights) {
                int u = f[0], v = f[1], w = f[2];
                if (prev[u] != INF && prev[u] + w < cur[v]) cur[v] = prev[u] + w;
            }
            prev = cur;
        }
        return prev[dst] == INF ? -1 : prev[dst];
    }
}`,
        alt: [{ lang: 'python', code: `class Solution:
    def findCheapestPrice(self, n, flights, src, dst, k):
        INF = float('inf')
        prev = [INF] * n
        prev[src] = 0
        for _ in range(k + 1):
            cur = prev[:]
            for u, v, w in flights:
                if prev[u] != INF and prev[u] + w < cur[v]:
                    cur[v] = prev[u] + w
            prev = cur
        return -1 if prev[dst] == INF else prev[dst]` }],
        dry: { head: ['round (≤ flights)', 'relaxations (reading prev)', 'prev after round [0,1,2,3]'], rows: [
          ['start', '—', '[0, ∞, ∞, ∞]'],
          ['1 (≤ 1)', '0→1: 100', '[0, 100, ∞, ∞]'],
          ['2 (≤ 2)', '1→2: 200, 1→3: 700 (2→3 skipped: prev[2] = ∞)', '[0, 100, 200, <span class="c-g">700</span>]'],
          ['answer', 'k = 1 → stop after 2 rounds', '<span class="c-g">700</span>']
        ] },
        complexity: `<p>Time O((k + 1) · E); space O(n).</p>`,
        followUps: ['Return the actual route', 'Same problem with Dijkstra over (city, stops) — when is it faster?', 'Each flight also has a duration; cheapest route arriving within T hours']
      }
    }]
  });

  // ================= PRACTICE: Easy =================
  practice.push({
    title: 'Implementing Dijkstra\'s Algorithm (GfG)', level: 'Easy', tags: ['dijkstra', 'priority queue'], companies: ['Amazon', 'Microsoft', 'Samsung'],
    statement: `<p>Given an undirected weighted graph with V vertices (0..V−1) as an edge list <code>edges[i] = [u, v, w]</code> (all w ≥ 0, graph connected) and a source <code>src</code>, return the shortest distance from src to every vertex.</p>`,
    constraints: `1 ≤ V ≤ 10<sup>4</sup>, 1 ≤ E ≤ 10<sup>4</sup>, 0 ≤ w ≤ 10<sup>3</sup>.`,
    example: `<p>V = 3, edges = [[0,1,1],[1,2,3],[0,2,6]], src = 2 → ${H.c('g', '[4, 3, 0]')}</p><p>2 → 1 costs 3; 2 → 0 directly costs 6, but 2 → 1 → 0 costs 3 + 1 = ${H.c('g', '4')}.</p>`,
    brute: { why: `<p>Relax every edge again and again until nothing changes (Bellman-Ford style): up to V passes × E edges = 10<sup>8</sup>. Works, but wastes passes re-checking edges from nodes whose distance is already final.</p>`, code: `
class Solution {
    public ArrayList<Integer> dijkstra(int V, int[][] edges, int src) {
        int[] dist = new int[V];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[src] = 0;
        boolean changed = true;
        while (changed) {
            changed = false;
            for (int[] e : edges) {
                for (int dir = 0; dir < 2; dir++) {                 // undirected: both ways
                    int u = dir == 0 ? e[0] : e[1], v = dir == 0 ? e[1] : e[0];
                    if (dist[u] != Integer.MAX_VALUE && dist[u] + e[2] < dist[v]) { dist[v] = dist[u] + e[2]; changed = true; }
                }
            }
        }
        ArrayList<Integer> res = new ArrayList<>();
        for (int d : dist) res.add(d);
        return res;
    }
}` },
    mcq: { q: 'You poll (7, v) but dist[v] is already 5. What now?', options: ['Skip it — it is a stale entry', 'Update dist[v] to 7', 'Re-relax all of v\'s edges with 7', 'Throw an error'], answer: 0, explain: 'Java\'s PriorityQueue has no decrease-key, so outdated entries stay inside. Lazy deletion = ignore them when they come out.' },
    hints: [`<p>Non-negative weights + one source → Dijkstra. Build an adjacency list first, adding each edge in both directions.</p>`, `<p>Min-heap of {dist, node}. Poll; if dist &gt; dist[node] skip; else relax neighbours and push improvements.</p>`, `<p>Return the dist array as an ArrayList. Since the graph is connected, no ∞ remains. Complexity O((V + E) log V).</p>`],
    solution: {
      approach: `<p>Standard Dijkstra with lazy deletion.</p>`,
      code: `
class Solution {
    public ArrayList<Integer> dijkstra(int V, int[][] edges, int src) {
        List<List<int[]>> g = new ArrayList<>();
        for (int i = 0; i < V; i++) g.add(new ArrayList<>());
        for (int[] e : edges) {
            g.get(e[0]).add(new int[]{e[1], e[2]});
            g.get(e[1]).add(new int[]{e[0], e[2]});
        }
        int[] dist = new int[V];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[src] = 0;
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        pq.add(new int[]{0, src});
        while (!pq.isEmpty()) {
            int[] t = pq.poll();
            int d = t[0], u = t[1];
            if (d > dist[u]) continue;
            for (int[] e : g.get(u)) {
                if (d + e[1] < dist[e[0]]) {
                    dist[e[0]] = d + e[1];
                    pq.add(new int[]{dist[e[0]], e[0]});
                }
            }
        }
        ArrayList<Integer> res = new ArrayList<>();
        for (int d : dist) res.add(d);
        return res;
    }
}`,
      dry: { head: ['poll', 'relax', 'dist [0,1,2]'], rows: [['(0,2)', '1 ← 3, 0 ← 6', '[6, 3, 0]'], ['(3,1)', '0 ← 3 + 1 = 4 &lt; 6', '[4, 3, 0]'], ['(4,0)', 'nothing better', '[4, 3, 0]'], ['(6,0)', 'stale → skip', '<span class="c-g">[4, 3, 0]</span>']] },
      complexity: `<p>Time O((V + E) log V); space O(V + E).</p>`,
      followUps: ['Print the path to each vertex', 'Which nodes are on at least one shortest path from src to t?']
    }
  });

  practice.push({
    title: 'Minimum Spanning Tree Weight (GfG)', level: 'Easy', tags: ['mst', 'kruskal', 'dsu'], companies: ['Amazon', 'Flipkart', 'Samsung'],
    statement: `<p>Given a connected, undirected, weighted graph with V vertices and edge list <code>edges[i] = [u, v, w]</code>, return the total weight of its minimum spanning tree.</p>`,
    constraints: `2 ≤ V ≤ 1000, V − 1 ≤ E ≤ V(V−1)/2, 1 ≤ w ≤ 1000.`,
    example: `<p>V = 3, edges = [[0,1,5],[1,2,3],[0,2,1]] → ${H.c('g', '4')}</p><p>Take 0–2 (1) and 1–2 (3). Edge 0–1 (5) would close a cycle. Total ${H.c('g', '4')}.</p>`,
    brute: { why: `<p>Naive Prim: V − 1 times, scan <b>every</b> edge to find the cheapest one with exactly one endpoint in the tree: O(V · E) ≈ 5·10<sup>8</sup> for a dense graph. The waste: re-scanning edges that cannot have changed.</p>`, code: `
class Solution {
    static int spanningTree(int V, int[][] edges) {
        boolean[] in = new boolean[V];
        in[0] = true;
        int total = 0;
        for (int step = 1; step < V; step++) {
            int bestW = Integer.MAX_VALUE, bestV = -1;
            for (int[] e : edges) {
                if (in[e[0]] != in[e[1]] && e[2] < bestW) {          // crosses the cut
                    bestW = e[2];
                    bestV = in[e[0]] ? e[1] : e[0];
                }
            }
            in[bestV] = true;
            total += bestW;
        }
        return total;
    }
}` },
    mcq: { q: 'Kruskal processes edges in which order?', options: ['Increasing weight', 'Decreasing weight', 'Input order', 'BFS order from node 0'], answer: 0, explain: 'Cheapest first; each edge joining two different components is safe by the cut property.' },
    hints: [`<p>The input is an edge list — Kruskal is the shortest code: sort edges, add the ones that join different groups.</p>`, `<p>DSU with path compression + union by rank tells you instantly whether two vertices are already connected.</p>`, `<p>Stop after V − 1 edges. Recipe: sort by w → for each edge if union(u, v) then total += w.</p>`],
    solution: {
      approach: `<p>Kruskal + DSU.</p>`,
      code: `
class Solution {
    static int[] parent;

    static int find(int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }

    static int spanningTree(int V, int[][] edges) {
        parent = new int[V];
        for (int i = 0; i < V; i++) parent[i] = i;
        int[][] es = edges.clone();
        Arrays.sort(es, (a, b) -> Integer.compare(a[2], b[2]));
        int total = 0, used = 0;
        for (int[] e : es) {
            int a = find(e[0]), b = find(e[1]);
            if (a == b) continue;                // would form a cycle
            parent[a] = b;
            total += e[2];
            if (++used == V - 1) break;
        }
        return total;
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def spanningTree(self, V, edges):
        parent = list(range(V))
        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x
        total = 0
        for u, v, w in sorted(edges, key=lambda e: e[2]):
            a, b = find(u), find(v)
            if a != b:
                parent[a] = b
                total += w
        return total` }],
      complexity: `<p>Time O(E log E); space O(V).</p>`,
      followUps: ['Return the edges of the MST', 'Is the MST unique? (Check for equal-weight alternatives)']
    }
  });

  practice.push({
    title: 'Floyd Warshall In-Place (GfG)', level: 'Easy', tags: ['floyd-warshall', 'all pairs'], companies: ['Amazon', 'Samsung'],
    statement: `<p>Given an n × n matrix <code>dist</code> where dist[i][j] is the weight of edge i → j, <b>10<sup>8</sup></b> means "no edge", and dist[i][i] = 0, modify it <b>in place</b> so dist[i][j] becomes the shortest distance from i to j (keep 10<sup>8</sup> if unreachable).</p>`,
    constraints: `1 ≤ n ≤ 100, −1000 ≤ dist[i][j] ≤ 1000 or 10<sup>8</sup>; no negative cycles.`,
    example: `<p>dist = [[0,4,∞,5,∞],[∞,0,1,∞,6],[2,∞,0,3,∞],[∞,∞,1,0,2],[1,∞,∞,4,0]] → ${H.c('g', '[[0,4,5,5,7],[3,0,1,4,6],[2,6,0,3,5],[3,7,1,0,2],[1,5,5,4,0]]')}</p><p>For example 0 → 2: 0 → 1 → 2 = 4 + 1 = ${H.c('g', '5')}.</p>`,
    brute: { why: `<p>Run Bellman-Ford from every vertex: n × O(n · E) with E ≈ n² → O(n⁴) = 10<sup>8</sup>. It works but Floyd-Warshall gets the same table in n³ = 10<sup>6</sup> steps with less code.</p>`, code: `
class Solution {
    public void floydWarshall(int[][] dist) {
        int n = dist.length, INF = 100000000;
        int[][] res = new int[n][n];
        for (int s = 0; s < n; s++) {
            int[] d = new int[n];
            Arrays.fill(d, INF);
            d[s] = 0;
            for (int r = 0; r < n - 1; r++)
                for (int u = 0; u < n; u++)
                    for (int v = 0; v < n; v++)
                        if (d[u] != INF && dist[u][v] != INF && d[u] + dist[u][v] < d[v]) d[v] = d[u] + dist[u][v];
            res[s] = d;
        }
        for (int i = 0; i < n; i++) dist[i] = res[i];
    }
}` },
    mcq: { q: 'Why check dist[i][k] != 10<sup>8</sup> before adding?', options: ['10<sup>8</sup> means "no path"; adding a negative weight to it would look like a real path', 'To avoid integer overflow only', 'It is not needed', 'Because Java requires it'], answer: 0, explain: '10<sup>8</sup> + (−5) = 99999995 &lt; 10<sup>8</sup> would wrongly turn "unreachable" into a fake distance when negative weights exist.' },
    hints: [`<p>All pairs + n ≤ 100 → the classic triple loop with k outermost.</p>`, `<p>For each k, i, j: if both halves are reachable and d[i][k] + d[k][j] &lt; d[i][j], update.</p>`, `<p>Skip when either half equals 10<sup>8</sup>. No extra matrix needed — in-place is correct because row k and column k do not change during round k.</p>`],
    solution: {
      approach: `<p>Floyd-Warshall in place with the "unreachable" guard.</p>`,
      code: `
class Solution {
    public void floydWarshall(int[][] dist) {
        int n = dist.length, INF = 100000000;
        for (int k = 0; k < n; k++)
            for (int i = 0; i < n; i++) {
                if (dist[i][k] == INF) continue;
                for (int j = 0; j < n; j++) {
                    if (dist[k][j] == INF) continue;
                    if (dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j];
                }
            }
    }
}`,
      complexity: `<p>Time O(n³); space O(1) extra.</p>`,
      followUps: ['Detect a negative cycle from the result', 'Reconstruct the path i → j with a next[][] matrix']
    }
  });

  practice.push({
    title: 'Negative Weight Cycle Anywhere (GfG)', level: 'Easy', tags: ['bellman-ford', 'negative cycle'], companies: ['Amazon', 'Microsoft'],
    statement: `<p>Given a directed weighted graph with n vertices and edges <code>[u, v, w]</code>, return <b>1</b> if it contains a negative-weight cycle anywhere (not only reachable from some source), else <b>0</b>.</p>`,
    constraints: `1 ≤ n ≤ 100, 1 ≤ E ≤ n(n−1), −1000 ≤ w ≤ 1000.`,
    example: `<p>n = 3, edges = [[0,1,-1],[1,2,-2],[2,0,-3]] → ${H.c('r', '1')}</p><p>Cycle 0 → 1 → 2 → 0 sums to −6 &lt; 0.</p>`,
    brute: { why: `<p>Run Floyd-Warshall (O(n³)) and look for a negative diagonal entry. Correct and short, but computes all-pairs distances you do not need; Bellman-Ford from a virtual source is O(n·E) and also handles larger n with few edges.</p>`, code: `
class Solution {
    public int isNegativeWeightCycle(int n, int[][] edges) {
        long INF = Long.MAX_VALUE / 4;
        long[][] d = new long[n][n];
        for (int i = 0; i < n; i++) { Arrays.fill(d[i], INF); d[i][i] = 0; }
        for (int[] e : edges) d[e[0]][e[1]] = Math.min(d[e[0]][e[1]], e[2]);
        for (int k = 0; k < n; k++)
            for (int i = 0; i < n; i++)
                for (int j = 0; j < n; j++)
                    if (d[i][k] != INF && d[k][j] != INF && d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
        for (int i = 0; i < n; i++) if (d[i][i] < 0) return 1;
        return 0;
    }
}` },
    mcq: { q: 'How do you catch a negative cycle that is NOT reachable from vertex 0?', options: ['Start with dist[v] = 0 for every v (a virtual source joined to all)', 'Run Dijkstra instead', 'Only check edges out of vertex 0', 'It cannot be done'], answer: 0, explain: 'Initialising every distance to 0 is the same as adding a virtual source with 0-weight edges to all vertices — every cycle becomes reachable.' },
    hints: [`<p>Bellman-Ford's extra V-th round detects negative cycles — but only those reachable from the source.</p>`, `<p>Make every vertex a "source": set all distances to 0 initially (a virtual source).</p>`, `<p>Relax all edges n − 1 times, then one more pass: any relaxation → return 1. Otherwise 0.</p>`],
    solution: {
      approach: `<p>Bellman-Ford from a virtual source (all dist = 0).</p>`,
      code: `
class Solution {
    public int isNegativeWeightCycle(int n, int[][] edges) {
        long[] dist = new long[n];                    // all 0 = virtual source
        for (int r = 0; r < n - 1; r++) {
            boolean changed = false;
            for (int[] e : edges)
                if (dist[e[0]] + e[2] < dist[e[1]]) { dist[e[1]] = dist[e[0]] + e[2]; changed = true; }
            if (!changed) return 0;                   // stable early -> no negative cycle
        }
        for (int[] e : edges)
            if (dist[e[0]] + e[2] < dist[e[1]]) return 1;
        return 0;
    }
}`,
      dry: { head: ['round', 'dist [0,1,2]'], rows: [['start', '[0, 0, 0]'], ['1', '[−3, −1, −3]'], ['2', '[−9, −4, −6]'], ['check', 'still relaxes → <span class="c-r">1</span>']] },
      complexity: `<p>Time O(n · E); space O(n).</p>`,
      followUps: ['Print one negative cycle', 'Currency arbitrage: rates instead of weights']
    }
  });

  // ================= PRACTICE: Medium =================
  practice.push({
    title: 'Path With Minimum Effort (LeetCode 1631)', level: 'Medium', tags: ['dijkstra', 'minimax', 'grid'], companies: ['Google', 'Amazon', 'Meta'],
    statement: `<p>Given a rows × columns grid of heights, travel from the top-left to the bottom-right moving up/down/left/right. A route's <b>effort</b> is the maximum absolute height difference between two consecutive cells on it. Return the minimum effort.</p>`,
    constraints: `1 ≤ rows, columns ≤ 100, 1 ≤ heights[i][j] ≤ 10<sup>6</sup>.`,
    example: `<p>[[1,2,2],[3,8,2],[5,3,5]] → ${H.c('g', '2')}</p><p>Route 1 → 3 → 5 → 3 → 5 has jumps 2, 2, 2, 2: max ${H.c('g', '2')}. Any route through 8 has a jump ≥ 5.</p>`,
    brute: { why: `<p>Try every effort X from 0 upward and BFS using only jumps ≤ X; return the first X that reaches the end. Up to 10<sup>6</sup> values × 10<sup>4</sup> cells = 10<sup>10</sup>. The waste: testing thresholds one by one (binary search fixes it) or not reusing work (Dijkstra fixes it).</p>`, code: `
class Solution {
    public int minimumEffortPath(int[][] h) {
        int R = h.length, C = h[0].length;
        for (int x = 0; ; x++) if (reach(h, x)) return x;     // linear scan over the answer
    }
    boolean reach(int[][] h, int x) {
        int R = h.length, C = h[0].length;
        boolean[][] seen = new boolean[R][C];
        Deque<int[]> q = new ArrayDeque<>();
        q.add(new int[]{0, 0});
        seen[0][0] = true;
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!q.isEmpty()) {
            int[] c = q.poll();
            if (c[0] == R - 1 && c[1] == C - 1) return true;
            for (int[] d : dirs) {
                int nr = c[0] + d[0], nc = c[1] + d[1];
                if (nr < 0 || nc < 0 || nr >= R || nc >= C || seen[nr][nc]) continue;
                if (Math.abs(h[nr][nc] - h[c[0]][c[1]]) > x) continue;
                seen[nr][nc] = true;
                q.add(new int[]{nr, nc});
            }
        }
        return false;
    }
}` },
    mcq: { q: 'In Dijkstra for minimum effort, the new value for a neighbour is…', options: ['max(effort so far, |jump|)', 'effort so far + |jump|', 'min(effort so far, |jump|)', '|jump| only'], answer: 0, explain: 'Effort is the largest jump on the route, so extending the route takes the max. max never decreases, which keeps Dijkstra correct.' },
    hints: [`<p>The cost of a path is a <b>max</b>, not a sum — but it still never decreases as the path grows.</p>`, `<p>Dijkstra on cells with <code>ne = max(e, |h[n] − h[c]|)</code>; min-heap of {effort, r, c}.</p>`, `<p>Return when the bottom-right cell is polled. 1 × 1 grid → 0. Alternatives: binary search + BFS, or DSU over edges sorted by jump.</p>`],
    solution: {
      approach: `<p>Minimax Dijkstra.</p>`,
      code: `
class Solution {
    public int minimumEffortPath(int[][] h) {
        int R = h.length, C = h[0].length;
        int[][] eff = new int[R][C];
        for (int[] row : eff) Arrays.fill(row, Integer.MAX_VALUE);
        eff[0][0] = 0;
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        pq.add(new int[]{0, 0, 0});
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!pq.isEmpty()) {
            int[] t = pq.poll();
            int e = t[0], r = t[1], c = t[2];
            if (r == R - 1 && c == C - 1) return e;
            if (e > eff[r][c]) continue;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nc < 0 || nr >= R || nc >= C) continue;
                int ne = Math.max(e, Math.abs(h[nr][nc] - h[r][c]));
                if (ne < eff[nr][nc]) { eff[nr][nc] = ne; pq.add(new int[]{ne, nr, nc}); }
            }
        }
        return 0;
    }
}`,
      complexity: `<p>Time O(RC log(RC)); space O(RC).</p>`,
      followUps: ['Solve with binary search + BFS and compare', 'Solve with DSU (Kruskal style)', 'Swim in Rising Water is the same idea on cell values']
    }
  });

  practice.push({
    title: 'Path with Maximum Probability (LeetCode 1514)', level: 'Medium', tags: ['dijkstra', 'max-heap', 'probability'], companies: ['Google', 'Amazon'],
    statement: `<p>An undirected graph has n nodes; edge i connects <code>edges[i] = [a, b]</code> with success probability <code>succProb[i]</code>. Return the maximum probability of successfully going from <code>start</code> to <code>end</code> (product of the edge probabilities along the path), or 0 if there is no path.</p>`,
    constraints: `2 ≤ n ≤ 10<sup>4</sup>, 0 ≤ edges.length ≤ 2·10<sup>4</sup>, 0 ≤ succProb[i] ≤ 1.`,
    example: `<p>n = 3, edges = [[0,1],[1,2],[0,2]], succProb = [0.5, 0.5, 0.2], start = 0, end = 2 → ${H.c('g', '0.25')}</p><p>Direct 0 → 2 = 0.2; via 1: 0.5 × 0.5 = ${H.c('g', '0.25')} — better.</p>`,
    brute: { why: `<p>Bellman-Ford style: relax all edges (both directions) up to n − 1 times with multiplication. O(n · E) = 2·10<sup>8</sup> — too slow in the worst case. The waste: nodes whose best probability is already final keep being re-checked.</p>`, code: `
class Solution {
    public double maxProbability(int n, int[][] edges, double[] succProb, int start_node, int end_node) {
        double[] p = new double[n];
        p[start_node] = 1.0;
        for (int r = 0; r < n - 1; r++) {
            boolean changed = false;
            for (int i = 0; i < edges.length; i++) {
                int a = edges[i][0], b = edges[i][1];
                double q = succProb[i];
                if (p[a] * q > p[b]) { p[b] = p[a] * q; changed = true; }
                if (p[b] * q > p[a]) { p[a] = p[b] * q; changed = true; }
            }
            if (!changed) break;
        }
        return p[end_node];
    }
}` },
    mcq: { q: 'Why does Dijkstra still work with multiplication here?', options: ['All probabilities are ≤ 1, so extending a path never increases its value (use a max-heap)', 'Multiplication is commutative', 'Probabilities are positive', 'It does not work — use Bellman-Ford'], answer: 0, explain: 'The mirror of "non-negative weights": multiplying by a number in [0, 1] can only keep or reduce the value. The first time the target is polled from a max-heap it is optimal.' },
    hints: [`<p>"Maximum product" with factors ≤ 1 behaves like "minimum sum" with weights ≥ 0. (Or use −log(p) as weights.)</p>`, `<p>Max-heap of {prob, node}; relax with <code>prob[u] * p &gt; prob[v]</code>.</p>`, `<p>Return as soon as end is polled; if the heap empties, return 0. Skip stale entries with <code>prob &lt; best[u]</code>.</p>`],
    solution: {
      approach: `<p>Dijkstra with a max-heap and multiplication.</p>`,
      code: `
class Solution {
    public double maxProbability(int n, int[][] edges, double[] succProb, int start_node, int end_node) {
        List<List<double[]>> g = new ArrayList<>();
        for (int i = 0; i < n; i++) g.add(new ArrayList<>());
        for (int i = 0; i < edges.length; i++) {
            g.get(edges[i][0]).add(new double[]{edges[i][1], succProb[i]});
            g.get(edges[i][1]).add(new double[]{edges[i][0], succProb[i]});
        }
        double[] best = new double[n];
        best[start_node] = 1.0;
        PriorityQueue<double[]> pq = new PriorityQueue<>((a, b) -> Double.compare(b[0], a[0]));  // max-heap
        pq.add(new double[]{1.0, start_node});
        while (!pq.isEmpty()) {
            double[] t = pq.poll();
            double p = t[0];
            int u = (int) t[1];
            if (u == end_node) return p;
            if (p < best[u]) continue;                 // stale
            for (double[] e : g.get(u)) {
                int v = (int) e[0];
                double np = p * e[1];
                if (np > best[v]) { best[v] = np; pq.add(new double[]{np, v}); }
            }
        }
        return 0.0;
    }
}`,
      complexity: `<p>Time O(E log V); space O(V + E).</p>`,
      followUps: ['Use −log(p) and a normal min-heap Dijkstra', 'What breaks if some "probabilities" could be &gt; 1?']
    }
  });

  practice.push({
    title: 'Number of Ways to Arrive at Destination (LeetCode 1976)', level: 'Medium', tags: ['dijkstra', 'counting', 'mod'], companies: ['Google', 'Amazon', 'Uber'],
    statement: `<p>n intersections 0..n−1 and undirected roads <code>[u, v, time]</code>. Return the number of different ways to travel from 0 to n−1 in the <b>shortest possible time</b>, modulo 10<sup>9</sup> + 7.</p>`,
    constraints: `1 ≤ n ≤ 200, n − 1 ≤ roads.length ≤ n(n−1)/2, 1 ≤ time ≤ 10<sup>9</sup>.`,
    example: `<p>n = 7, roads = [[0,6,7],[0,1,2],[1,2,3],[1,3,3],[6,3,3],[3,5,1],[6,5,1],[2,5,1],[0,4,5],[4,6,2]] → ${H.c('g', '4')}</p><p>Shortest time is 7: 0→6, 0→4→6, 0→1→2→5→6, 0→1→3→5→6.</p>`,
    brute: { why: `<p>DFS every simple path from 0 to n−1, track the minimum time and how many paths hit it. The number of simple paths is exponential in n (n = 200 is hopeless). The waste: the count of ways to reach an intermediate node at its best time is recomputed for every continuation.</p>`, code: `
class Solution {
    long bestTime = Long.MAX_VALUE, count = 0;
    List<List<int[]>> g;
    public int countPaths(int n, int[][] roads) {
        g = new ArrayList<>();
        for (int i = 0; i < n; i++) g.add(new ArrayList<>());
        for (int[] r : roads) { g.get(r[0]).add(new int[]{r[1], r[2]}); g.get(r[1]).add(new int[]{r[0], r[2]}); }
        dfs(0, n - 1, 0L, new boolean[n]);
        return (int) (count % 1_000_000_007L);
    }
    void dfs(int u, int t, long time, boolean[] on) {
        if (time > bestTime) return;
        if (u == t) {
            if (time < bestTime) { bestTime = time; count = 1; } else count++;
            return;
        }
        on[u] = true;
        for (int[] e : g.get(u)) if (!on[e[0]]) dfs(e[0], t, time + e[1], on);
        on[u] = false;
    }
}` },
    mcq: { q: 'Relaxing u → v gives exactly dist[v] (a tie). What happens to ways[v]?', options: ['ways[v] += ways[u]', 'ways[v] = ways[u]', 'ways[v]++', 'Nothing'], answer: 0, explain: 'Every shortest way to u extends to a new shortest way to v. On a strict improvement you reset ways[v] = ways[u].' },
    hints: [`<p>Dijkstra finalises nodes in time order, so when u is polled its number of shortest ways is complete.</p>`, `<p>Keep <code>long[] dist</code> and <code>long[] ways</code>. Strictly better → dist = nd, ways = ways[u]; equal → ways += ways[u] (mod).</p>`, `<p>Times up to 10<sup>9</sup> × 200 → long. Only relax from non-stale pops, or ties get counted twice.</p>`],
    solution: {
      approach: `<p>Dijkstra carrying a ways[] array.</p>`,
      code: `
class Solution {
    public int countPaths(int n, int[][] roads) {
        final long MOD = 1_000_000_007L;
        List<List<int[]>> g = new ArrayList<>();
        for (int i = 0; i < n; i++) g.add(new ArrayList<>());
        for (int[] r : roads) { g.get(r[0]).add(new int[]{r[1], r[2]}); g.get(r[1]).add(new int[]{r[0], r[2]}); }
        long[] dist = new long[n];
        long[] ways = new long[n];
        Arrays.fill(dist, Long.MAX_VALUE);
        dist[0] = 0;
        ways[0] = 1;
        PriorityQueue<long[]> pq = new PriorityQueue<>((a, b) -> Long.compare(a[0], b[0]));
        pq.add(new long[]{0, 0});
        while (!pq.isEmpty()) {
            long[] t = pq.poll();
            long d = t[0];
            int u = (int) t[1];
            if (d > dist[u]) continue;                       // stale: do NOT count again
            for (int[] e : g.get(u)) {
                int v = e[0];
                long nd = d + e[1];
                if (nd < dist[v]) {
                    dist[v] = nd;
                    ways[v] = ways[u];
                    pq.add(new long[]{nd, v});
                } else if (nd == dist[v]) {
                    ways[v] = (ways[v] + ways[u]) % MOD;
                }
            }
        }
        return (int) (ways[n - 1] % MOD);
    }
}`,
      complexity: `<p>Time O(E log V); space O(V + E).</p>`,
      followUps: ['Count shortest paths in an unweighted graph (BFS version)', 'Which edges lie on at least one shortest path?']
    }
  });

  practice.push({
    title: 'Minimum Edges to Reverse for a Path (GfG)', level: 'Medium', tags: ['0-1 bfs', 'modelling'], companies: ['Amazon', 'Samsung'],
    statement: `<p>A directed graph has n vertices 1..n and edges <code>[u, v]</code>. Find the minimum number of edges that must be <b>reversed</b> so that a path exists from <code>src</code> to <code>dst</code>. Return -1 if impossible.</p>`,
    constraints: `1 ≤ n, E ≤ 10<sup>5</sup>.`,
    example: `<p>edges = [[1,2],[3,2]], n = 3, src = 1, dst = 3 → ${H.c('g', '1')}</p><p>1 → 2 exists. To get from 2 to 3 we must reverse 3 → 2 into 2 → 3: ${H.c('g', '1 reversal')}.</p>`,
    brute: { why: `<p>Model each original edge u → v as weight 0 and its reverse v → u as weight 1, then run Bellman-Ford: O(n · E) = 10<sup>10</sup>. Correct model, wrong algorithm — with only 0/1 weights a deque does it in O(n + E).</p>`, code: `
class Solution {
    public int minimumEdgeReversal(int[][] edges, int n, int src, int dst) {
        int INF = Integer.MAX_VALUE;
        int[] dist = new int[n + 1];
        Arrays.fill(dist, INF);
        dist[src] = 0;
        for (int r = 0; r < n - 1; r++) {
            boolean changed = false;
            for (int[] e : edges) {
                if (dist[e[0]] != INF && dist[e[0]] < dist[e[1]]) { dist[e[1]] = dist[e[0]]; changed = true; }          // use as is: 0
                if (dist[e[1]] != INF && dist[e[1]] + 1 < dist[e[0]]) { dist[e[0]] = dist[e[1]] + 1; changed = true; } // reversed: 1
            }
            if (!changed) break;
        }
        return dist[dst] == INF ? -1 : dist[dst];
    }
}` },
    mcq: { q: 'How do you model "reversing" an edge u → v?', options: ['Keep u → v with cost 0 and add v → u with cost 1', 'Delete the edge', 'Add v → u with cost 0', 'Double every weight'], answer: 0, explain: 'Using the edge as given is free; travelling against it means one reversal. Now it is a 0-1 shortest-path problem.' },
    hints: [`<p>Every original edge gives two moves: forward (free) and backward (costs one reversal).</p>`, `<p>Weights 0/1 → 0-1 BFS with an ArrayDeque: cost 0 → addFirst, cost 1 → addLast.</p>`, `<p>Vertices are 1-indexed → arrays of size n + 1. If dst stays ∞ return -1; if src == dst return 0.</p>`],
    solution: {
      approach: `<p>Build the 0/1 graph, run 0-1 BFS.</p>`,
      code: `
class Solution {
    public int minimumEdgeReversal(int[][] edges, int n, int src, int dst) {
        List<List<int[]>> g = new ArrayList<>();
        for (int i = 0; i <= n; i++) g.add(new ArrayList<>());
        for (int[] e : edges) {
            g.get(e[0]).add(new int[]{e[1], 0});    // original direction: free
            g.get(e[1]).add(new int[]{e[0], 1});    // against the arrow: one reversal
        }
        int[] dist = new int[n + 1];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[src] = 0;
        Deque<Integer> dq = new ArrayDeque<>();
        dq.add(src);
        while (!dq.isEmpty()) {
            int u = dq.pollFirst();
            for (int[] e : g.get(u)) {
                int v = e[0], w = e[1];
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    if (w == 0) dq.addFirst(v); else dq.addLast(v);
                }
            }
        }
        return dist[dst] == Integer.MAX_VALUE ? -1 : dist[dst];
    }
}`,
      dry: { head: ['pop', 'moves', 'deque'], rows: [['1 (0)', '1→2 free: dist 2 = 0 (front)', '[2]'], ['2 (0)', '2→1 back costs 1: no gain; 2→3 against 3→2: dist 3 = 1 (back)', '[3]'], ['3 (1)', 'nothing better', 'answer <span class="c-g">1</span>']] },
      complexity: `<p>Time O(n + E); space O(n + E).</p>`,
      followUps: ['Return which edges to reverse', 'What if reversing edge i costs c<sub>i</sub>? (Dijkstra)']
    }
  });

  practice.push({
    title: 'Shortest Path in a Weighted DAG (GfG)', level: 'Medium', tags: ['dag', 'topological sort', 'shortest path'], companies: ['Amazon', 'Flipkart'],
    statement: `<p>Given a directed acyclic graph with V vertices and edges <code>[u, v, w]</code> (weights may be negative), return the shortest distance from vertex 0 to every vertex, or -1 for unreachable ones.</p>`,
    constraints: `1 ≤ V ≤ 100, 1 ≤ E ≤ min(V(V−1)/2, 4000), 0 ≤ w ≤ 100 (the same method also works for negative weights).`,
    example: `<p>V = 6, edges = [[0,1,2],[0,4,1],[4,5,4],[4,2,2],[1,2,3],[2,3,6],[5,3,1]] → ${H.c('g', '[0, 2, 3, 6, 1, 5]')}</p><p>3 is cheaper via 0→4→5→3 = 1 + 4 + 1 = ${H.c('g', '6')} than via 2 (3 + 6 = 9).</p>`,
    brute: { why: `<p>Bellman-Ford: V − 1 rounds over all edges, O(V · E). Correct, but it ignores the gift of a DAG: if you process nodes in topological order, every edge needs to be relaxed only <b>once</b>.</p>`, code: `
class Solution {
    public int[] shortestPath(int V, int E, int[][] edges) {
        int INF = Integer.MAX_VALUE;
        int[] d = new int[V];
        Arrays.fill(d, INF);
        d[0] = 0;
        for (int r = 0; r < V - 1; r++)
            for (int[] e : edges)
                if (d[e[0]] != INF && d[e[0]] + e[2] < d[e[1]]) d[e[1]] = d[e[0]] + e[2];
        for (int i = 0; i < V; i++) if (d[i] == INF) d[i] = -1;
        return d;
    }
}` },
    mcq: { q: 'Why does one pass in topological order suffice?', options: ['When u is processed, every edge INTO u has already been relaxed, so dist[u] is final', 'Because DAGs have no negative weights', 'Because the heap is sorted', 'It does not — you still need V − 1 passes'], answer: 0, explain: 'All predecessors of u come before u in topological order, so every path into u has been considered before u relaxes its out-edges.' },
    hints: [`<p>No cycles → there is a topological order where every edge goes left to right.</p>`, `<p>Kahn's algorithm (in-degrees + queue) gives the order; then relax each node's out-edges in that order.</p>`, `<p>Skip nodes whose dist is still ∞. Works with negative weights. Turn ∞ into −1 at the end. Same trick with max gives the <b>longest</b> path in a DAG.</p>`],
    solution: {
      approach: `<p>Topological sort, then relax edges in that order — O(V + E).</p>`,
      code: `
class Solution {
    public int[] shortestPath(int V, int E, int[][] edges) {
        List<List<int[]>> g = new ArrayList<>();
        for (int i = 0; i < V; i++) g.add(new ArrayList<>());
        int[] indeg = new int[V];
        for (int[] e : edges) { g.get(e[0]).add(new int[]{e[1], e[2]}); indeg[e[1]]++; }
        Deque<Integer> q = new ArrayDeque<>();                  // Kahn's algorithm
        for (int i = 0; i < V; i++) if (indeg[i] == 0) q.add(i);
        List<Integer> order = new ArrayList<>();
        while (!q.isEmpty()) {
            int u = q.poll();
            order.add(u);
            for (int[] e : g.get(u)) if (--indeg[e[0]] == 0) q.add(e[0]);
        }
        int INF = Integer.MAX_VALUE;
        int[] d = new int[V];
        Arrays.fill(d, INF);
        d[0] = 0;
        for (int u : order) {
            if (d[u] == INF) continue;                          // not reachable from 0
            for (int[] e : g.get(u)) if (d[u] + e[1] < d[e[0]]) d[e[0]] = d[u] + e[1];
        }
        for (int i = 0; i < V; i++) if (d[i] == INF) d[i] = -1;
        return d;
    }
}`,
      complexity: `<p>Time O(V + E); space O(V + E).</p>`,
      followUps: ['Longest path in a DAG (critical path in project scheduling)', 'Count the number of shortest paths in a DAG']
    }
  });

  // ================= PRACTICE: Hard =================
  practice.push({
    title: 'Minimum Obstacle Removal to Reach Corner (LeetCode 2290)', level: 'Hard', tags: ['0-1 bfs', 'grid'], companies: ['Google', 'Amazon'],
    statement: `<p>An m × n grid has 0 (empty) and 1 (obstacle) cells. You may remove obstacles. Moving up/down/left/right from (0,0), return the minimum number of obstacles to remove to reach (m−1, n−1).</p>`,
    constraints: `1 ≤ m, n ≤ 10<sup>5</sup>, 2 ≤ m·n ≤ 10<sup>5</sup>, grid[0][0] = grid[m−1][n−1] = 0.`,
    example: `<p>grid = [[0,1,1],[1,1,0],[1,1,0]] → ${H.c('g', '2')}</p><p>Remove (0,1) and (0,2), then walk down the right column. Every route needs at least 2 removals.</p>`,
    brute: { why: `<p>Sweep all cells repeatedly relaxing "cost to enter = cell value" until nothing changes: up to O(cells) sweeps × O(cells) = 10<sup>10</sup>. The waste: re-scanning settled cells. Dijkstra is O(cells log cells); with 0/1 costs a deque gives O(cells).</p>`, code: `
class Solution {
    public int minimumObstacles(int[][] grid) {
        int m = grid.length, n = grid[0].length;
        int[][] d = new int[m][n];
        for (int[] row : d) Arrays.fill(row, Integer.MAX_VALUE);
        d[0][0] = 0;
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        boolean changed = true;
        while (changed) {
            changed = false;
            for (int r = 0; r < m; r++)
                for (int c = 0; c < n; c++) {
                    if (d[r][c] == Integer.MAX_VALUE) continue;
                    for (int[] k : dirs) {
                        int nr = r + k[0], nc = c + k[1];
                        if (nr < 0 || nc < 0 || nr >= m || nc >= n) continue;
                        if (d[r][c] + grid[nr][nc] < d[nr][nc]) { d[nr][nc] = d[r][c] + grid[nr][nc]; changed = true; }
                    }
                }
        }
        return d[m - 1][n - 1];
    }
}` },
    mcq: { q: 'Entering a cell costs its value (0 or 1). Best algorithm for 10<sup>5</sup> cells?', options: ['0-1 BFS with a deque, O(cells)', 'Plain BFS', 'Floyd-Warshall', 'Kruskal'], answer: 0, explain: 'Two possible costs → deque keeps the frontier sorted without a heap. Plain BFS would treat obstacles and empty cells the same.' },
    hints: [`<p>Think of moving into a cell as an edge whose weight is that cell's value: 0 or 1.</p>`, `<p>0-1 BFS: pollFirst; neighbour cost 0 → addFirst, cost 1 → addLast; only push on improvement.</p>`, `<p>Use one flat dist array of size m·n (index r·n + c) to save memory. Answer = dist of the bottom-right cell.</p>`],
    solution: {
      approach: `<p>0-1 BFS where the weight of an edge is the value of the cell you step into.</p>`,
      code: `
class Solution {
    public int minimumObstacles(int[][] grid) {
        int m = grid.length, n = grid[0].length;
        int[] dist = new int[m * n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[0] = 0;
        Deque<Integer> dq = new ArrayDeque<>();
        dq.add(0);
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!dq.isEmpty()) {
            int id = dq.pollFirst(), r = id / n, c = id % n;
            for (int[] k : dirs) {
                int nr = r + k[0], nc = c + k[1];
                if (nr < 0 || nc < 0 || nr >= m || nc >= n) continue;
                int w = grid[nr][nc], nid = nr * n + nc;
                if (dist[id] + w < dist[nid]) {
                    dist[nid] = dist[id] + w;
                    if (w == 0) dq.addFirst(nid); else dq.addLast(nid);
                }
            }
        }
        return dist[m * n - 1];
    }
}`,
      complexity: `<p>Time O(m·n); space O(m·n).</p>`,
      followUps: ['Return the cells to remove', 'Each obstacle has its own removal cost → Dijkstra']
    }
  });

  practice.push({
    title: 'Swim in Rising Water (LeetCode 778)', level: 'Hard', tags: ['dijkstra', 'minimax', 'dsu', 'binary search'], companies: ['Google', 'Amazon', 'Uber'],
    statement: `<p>An n × n grid holds a permutation of 0..n²−1 (elevations). At time t, water depth everywhere is t; you can swim between adjacent cells if both elevations are ≤ t (swimming takes no time). Starting at (0,0), return the least time t at which you can reach (n−1, n−1).</p>`,
    constraints: `1 ≤ n ≤ 50, all values distinct, 0 ≤ grid[i][j] &lt; n².`,
    example: `<p>grid = [[0,2],[1,3]] → ${H.c('g', '3')}</p><p>The target itself has elevation 3, so you can never arrive before t = ${H.c('g', '3')}; at t = 3 every cell is open.</p>`,
    brute: { why: `<p>Try every t = 0, 1, 2, … and BFS only through cells ≤ t: O(n²) values × O(n²) BFS = O(n⁴) ≈ 6·10<sup>6</sup>. It actually passes for n = 50, but it repeats almost the same BFS n² times. Dijkstra (or binary search, or DSU) avoids the repetition.</p>`, code: `
class Solution {
    public int swimInWater(int[][] grid) {
        int n = grid.length;
        for (int t = grid[0][0]; ; t++) if (canReach(grid, t)) return t;
    }
    boolean canReach(int[][] g, int t) {
        int n = g.length;
        boolean[][] seen = new boolean[n][n];
        Deque<int[]> q = new ArrayDeque<>();
        q.add(new int[]{0, 0});
        seen[0][0] = true;
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!q.isEmpty()) {
            int[] c = q.poll();
            if (c[0] == n - 1 && c[1] == n - 1) return true;
            for (int[] d : dirs) {
                int r = c[0] + d[0], k = c[1] + d[1];
                if (r < 0 || k < 0 || r >= n || k >= n || seen[r][k] || g[r][k] > t) continue;
                seen[r][k] = true;
                q.add(new int[]{r, k});
            }
        }
        return false;
    }
}` },
    mcq: { q: 'Cost of a route = the highest elevation on it. Which combine rule does Dijkstra use?', options: ['max(time so far, cell elevation)', 'time so far + elevation', 'min(time so far, elevation)', 'elevation of the start cell'], answer: 0, explain: 'You must wait until the water covers the highest cell on your route. Max is monotone, so Dijkstra works.' },
    hints: [`<p>The answer is the minimum over routes of the <b>maximum</b> cell value on the route (a minimax path).</p>`, `<p>Dijkstra: min-heap of {time, r, c}, neighbour time = max(time, grid[nr][nc]). Because the cost lives on cells, you may mark cells seen when pushing.</p>`, `<p>Return when (n−1, n−1) is polled. Alternatives: binary search t + BFS (O(n² log n²)), or add cells in increasing elevation with DSU until corners connect.</p>`],
    solution: {
      approach: `<p>Minimax Dijkstra on cells.</p>`,
      code: `
class Solution {
    public int swimInWater(int[][] grid) {
        int n = grid.length;
        boolean[][] seen = new boolean[n][n];
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        pq.add(new int[]{grid[0][0], 0, 0});
        seen[0][0] = true;
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!pq.isEmpty()) {
            int[] t = pq.poll();
            int time = t[0], r = t[1], c = t[2];
            if (r == n - 1 && c == n - 1) return time;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nc < 0 || nr >= n || nc >= n || seen[nr][nc]) continue;
                // pops come out in non-decreasing time, so the first push to a cell is already its best
                seen[nr][nc] = true;
                pq.add(new int[]{Math.max(time, grid[nr][nc]), nr, nc});
            }
        }
        return -1;
    }
}`,
      complexity: `<p>Time O(n² log n); space O(n²).</p>`,
      followUps: ['Solve with DSU by sorting cells', 'Path With Minimum Effort is the edge-weighted cousin']
    }
  });

  practice.push({
    title: 'Find Critical and Pseudo-Critical Edges in MST (LeetCode 1489)', level: 'Hard', tags: ['mst', 'kruskal', 'dsu'], companies: ['Amazon', 'Google'],
    statement: `<p>Given a connected weighted undirected graph with n vertices and <code>edges[i] = [a, b, w]</code>, return two lists of edge indices: <b>critical</b> edges (removing it increases the MST weight) and <b>pseudo-critical</b> edges (in some MSTs but not all).</p>`,
    constraints: `2 ≤ n ≤ 100, 1 ≤ edges.length ≤ min(200, n(n−1)/2), 1 ≤ w ≤ 1000, all pairs distinct.`,
    example: `<p>n = 5, edges = [[0,1,1],[1,2,1],[2,3,2],[0,3,2],[0,4,3],[3,4,3],[1,4,6]] → ${H.c('g', '[[0,1],[2,3,4,5]]')}</p><p>Edges 0 and 1 (weight 1) are in every MST. The weight-2 pair (2, 3) and the weight-3 pair (4, 5) are interchangeable — each is in some MSTs. Edge 6 (weight 6) is in none.</p>`,
    brute: { why: `<p>Enumerate every subset of n − 1 edges, keep the spanning ones with minimum weight, then classify each edge by how many optimal trees contain it. Exponential — only feasible for about 10 edges.</p>`, code: `
class Solution {
    int best = Integer.MAX_VALUE;
    List<boolean[]> optimal = new ArrayList<>();

    public List<List<Integer>> findCriticalAndPseudoCriticalEdges(int n, int[][] edges) {
        rec(n, edges, 0, new boolean[edges.length], 0, 0);
        List<Integer> crit = new ArrayList<>(), pseudo = new ArrayList<>();
        for (int i = 0; i < edges.length; i++) {
            int cnt = 0;
            for (boolean[] t : optimal) if (t[i]) cnt++;
            if (cnt == optimal.size()) crit.add(i);
            else if (cnt > 0) pseudo.add(i);
        }
        return Arrays.asList(crit, pseudo);
    }

    void rec(int n, int[][] e, int i, boolean[] pick, int cnt, int w) {
        if (cnt == n - 1) {
            if (!spans(n, e, pick)) return;
            if (w < best) { best = w; optimal.clear(); }
            if (w == best) optimal.add(pick.clone());
            return;
        }
        if (i == e.length) return;
        pick[i] = true;
        rec(n, e, i + 1, pick, cnt + 1, w + e[i][2]);
        pick[i] = false;
        rec(n, e, i + 1, pick, cnt, w);
    }

    boolean spans(int n, int[][] e, boolean[] pick) {
        int[] p = new int[n];
        for (int i = 0; i < n; i++) p[i] = i;
        for (int i = 0; i < e.length; i++) if (pick[i]) {
            int a = root(p, e[i][0]), b = root(p, e[i][1]);
            if (a == b) return false;              // cycle -> not a tree
            p[a] = b;
        }
        return true;                               // n-1 edges, no cycle -> spanning tree
    }

    int root(int[] p, int x) { while (p[x] != x) x = p[x]; return x; }
}` },
    mcq: { q: 'How do you test if edge e is pseudo-critical (given it is not critical)?', options: ['Force e into the tree first, run Kruskal; if the weight equals the true MST weight, e is pseudo-critical', 'Remove e and check connectivity', 'Check if e is the lightest edge', 'Check if e is on a cycle'], answer: 0, explain: 'Forcing e and still reaching the optimal weight proves some MST contains it. Being non-critical means some MST avoids it.' },
    hints: [`<p>First compute the true MST weight W with Kruskal (sort once, keep original indices).</p>`, `<p>For each edge i: Kruskal <b>skipping</b> i — weight &gt; W (or disconnected) → critical. Else Kruskal <b>forcing</b> i first — weight == W → pseudo-critical.</p>`, `<p>E ≤ 200 → E Kruskal runs × E edges = 4·10<sup>4</sup> DSU ops — tiny. Return "disconnected" as +∞ so it counts as critical.</p>`],
    solution: {
      approach: `<p>Kruskal with skip/force per edge.</p>`,
      code: `
class Solution {
    int[] parent;

    int find(int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }

    // es sorted by weight; skip / force are positions in es (or -1)
    int mst(int n, int[][] es, int skip, int force) {
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        int total = 0, used = 0;
        if (force != -1) {
            parent[find(es[force][0])] = find(es[force][1]);
            total += es[force][2];
            used++;
        }
        for (int i = 0; i < es.length; i++) {
            if (i == skip || i == force) continue;
            int a = find(es[i][0]), b = find(es[i][1]);
            if (a != b) { parent[a] = b; total += es[i][2]; used++; }
        }
        return used == n - 1 ? total : Integer.MAX_VALUE;   // disconnected -> "infinite"
    }

    public List<List<Integer>> findCriticalAndPseudoCriticalEdges(int n, int[][] edges) {
        int m = edges.length;
        int[][] es = new int[m][];
        for (int i = 0; i < m; i++) es[i] = new int[]{edges[i][0], edges[i][1], edges[i][2], i};
        Arrays.sort(es, (a, b) -> Integer.compare(a[2], b[2]));
        int base = mst(n, es, -1, -1);
        List<Integer> crit = new ArrayList<>(), pseudo = new ArrayList<>();
        for (int i = 0; i < m; i++) {
            if (mst(n, es, i, -1) > base) crit.add(es[i][3]);
            else if (mst(n, es, -1, i) == base) pseudo.add(es[i][3]);
        }
        return Arrays.asList(crit, pseudo);
    }
}`,
      complexity: `<p>Time O(E² · α(V)) after one O(E log E) sort; space O(V + E).</p>`,
      followUps: ['Faster: group equal weights and find bridges in the contracted graph (Tarjan)', 'Second-best MST weight']
    }
  });

  practice.push({
    title: 'Minimum Cost to Reach Destination in Time (LeetCode 1928)', level: 'Hard', tags: ['multi-criteria', 'dijkstra', 'dp'], companies: ['Google', 'Amazon'],
    statement: `<p>n cities 0..n−1, undirected roads <code>[x, y, time]</code> (parallel roads allowed), and <code>passingFees[i]</code> paid every time you pass through city i (including start and end). Starting at city 0, reach city n−1 within <code>maxTime</code> minutes with the minimum total fees. Return the cost, or -1 if impossible.</p>`,
    constraints: `1 ≤ maxTime ≤ 1000, 2 ≤ n ≤ 1000, n − 1 ≤ edges.length ≤ 1000, 1 ≤ time, passingFees[i] ≤ 1000.`,
    example: `<p>maxTime = 30, edges = [[0,1,10],[1,2,10],[2,5,10],[0,3,1],[3,4,10],[4,5,15]], passingFees = [5,1,2,20,20,3] → ${H.c('g', '11')}</p><p>0 → 1 → 2 → 5 takes exactly 30 minutes, fees 5 + 1 + 2 + 3 = ${H.c('g', '11')}. The faster route via 3 and 4 (26 min) costs 48.</p>`,
    brute: { why: `<p>DFS every walk from city 0 that stays within maxTime, adding fees, and keep the cheapest that ends at n−1. Walks can revisit cities, so the count is exponential in maxTime. The waste: the same (city, time used) situation is explored repeatedly — that is exactly the DP / expanded state.</p>`, code: `
class Solution {
    int best = Integer.MAX_VALUE;
    List<List<int[]>> g;
    int[] fee;
    int limit;
    public int minCost(int maxTime, int[][] edges, int[] passingFees) {
        int n = passingFees.length;
        g = new ArrayList<>();
        for (int i = 0; i < n; i++) g.add(new ArrayList<>());
        for (int[] e : edges) { g.get(e[0]).add(new int[]{e[1], e[2]}); g.get(e[1]).add(new int[]{e[0], e[2]}); }
        fee = passingFees;
        limit = maxTime;
        dfs(0, 0, passingFees[0], n - 1);
        return best == Integer.MAX_VALUE ? -1 : best;
    }
    void dfs(int u, int time, int cost, int target) {
        if (cost >= best) return;
        if (u == target) { best = cost; return; }
        for (int[] e : g.get(u))
            if (time + e[1] <= limit) dfs(e[0], time + e[1], cost + fee[e[0]], target);
    }
}` },
    mcq: { q: 'Popping states in cost order, when should you push a new state (v, newTime)?', options: ['Only if newTime is smaller than the best time seen at v so far', 'Always', 'Only if v was never visited', 'Only if the cost is smaller than before'], answer: 0, explain: 'Every earlier state at v costs no more (pops are in cost order). A new state is useful only if it is faster — otherwise it is dominated.' },
    hints: [`<p>Two criteria: minimise fees, but time is a hard limit. A plain "visited" per city is wrong — a pricier but faster arrival may be needed.</p>`, `<p>Dijkstra on fees with states {cost, time, city}. Keep minTime[city]; push only when the new time beats it (dominance pruning).</p>`, `<p>Start cost = passingFees[0]. Skip moves with time &gt; maxTime. First time city n−1 is polled → answer. Alternative: DP dp[t][v] = min cost to be at v at time t, O(maxTime · E).</p>`],
    solution: {
      approach: `<p>Cost-ordered Dijkstra with time-dominance pruning.</p>`,
      code: `
class Solution {
    public int minCost(int maxTime, int[][] edges, int[] passingFees) {
        int n = passingFees.length;
        List<List<int[]>> g = new ArrayList<>();
        for (int i = 0; i < n; i++) g.add(new ArrayList<>());
        for (int[] e : edges) {
            g.get(e[0]).add(new int[]{e[1], e[2]});
            g.get(e[1]).add(new int[]{e[0], e[2]});
        }
        int[] minTime = new int[n];
        Arrays.fill(minTime, Integer.MAX_VALUE);
        minTime[0] = 0;
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        pq.add(new int[]{passingFees[0], 0, 0});            // {cost, time, city}
        while (!pq.isEmpty()) {
            int[] t = pq.poll();
            int cost = t[0], time = t[1], u = t[2];
            if (u == n - 1) return cost;                     // cheapest valid arrival
            for (int[] e : g.get(u)) {
                int v = e[0], nt = time + e[1];
                if (nt > maxTime) continue;                  // breaks the time limit
                if (nt < minTime[v]) {                       // otherwise dominated (pricier AND slower)
                    minTime[v] = nt;
                    pq.add(new int[]{cost + passingFees[v], nt, v});
                }
            }
        }
        return -1;
    }
}`,
      alt: [{ lang: 'python', code: `class Solution:
    def minCost(self, maxTime, edges, passingFees):
        # DP over time: dp[t][v] = min fees to stand at v after exactly t minutes
        n = len(passingFees)
        INF = float('inf')
        dp = [[INF] * n for _ in range(maxTime + 1)]
        dp[0][0] = passingFees[0]
        for t in range(1, maxTime + 1):
            for x, y, w in edges:
                if w <= t:
                    if dp[t - w][x] + passingFees[y] < dp[t][y]:
                        dp[t][y] = dp[t - w][x] + passingFees[y]
                    if dp[t - w][y] + passingFees[x] < dp[t][x]:
                        dp[t][x] = dp[t - w][y] + passingFees[x]
        ans = min(dp[t][n - 1] for t in range(maxTime + 1))
        return -1 if ans == INF else ans` }],
      complexity: `<p>Dijkstra with pruning: each push needs a strictly smaller time, so at most maxTime pushes per city → O(maxTime · E log(...)) worst case, fast in practice. DP: O(maxTime · E) = 10<sup>6</sup>.</p>`,
      followUps: ['Return the route', 'Two limits (time and fuel) — what is the state now?', 'Pareto front: list all non-dominated (cost, time) pairs at the target']
    }
  });

  practice.push({
    title: 'Optimize Water Distribution in a Village (LeetCode 1168)', level: 'Hard', tags: ['mst', 'virtual node', 'kruskal'], companies: ['Google', 'Meta', 'Amazon'],
    statement: `<p>n houses 1..n. House i can build its own well for <code>wells[i−1]</code>, or receive water through pipes: <code>pipes[j] = [h1, h2, cost]</code> (bidirectional). Return the minimum total cost so that every house has water.</p>`,
    constraints: `2 ≤ n ≤ 10<sup>4</sup>, wells.length = n, 1 ≤ pipes.length ≤ 10<sup>4</sup>, 0 ≤ costs ≤ 10<sup>5</sup>.`,
    example: `<p>n = 3, wells = [1, 2, 2], pipes = [[1,2,1],[2,3,1]] → ${H.c('g', '3')}</p><p>Well at house 1 (1), pipe 1–2 (1), pipe 2–3 (1). Total ${H.c('g', '3')}.</p>`,
    brute: { why: `<p>Try every non-empty subset of houses that dig wells (2<sup>n</sup>), merge them into one "has water" group, then Kruskal the pipes. Correct, but 2<sup>n</sup> subsets is impossible for n = 10<sup>4</sup>. The virtual-node trick lets one MST pick the wells automatically.</p>`, code: `
class Solution {
    public int minCostToSupplyWater(int n, int[] wells, int[][] pipes) {
        int[][] ps = pipes.clone();
        Arrays.sort(ps, (a, b) -> Integer.compare(a[2], b[2]));
        int best = Integer.MAX_VALUE;
        for (int mask = 1; mask < (1 << n); mask++) {           // which houses dig a well
            int[] p = new int[n + 1];
            for (int i = 0; i <= n; i++) p[i] = i;
            int cost = 0, comps = n + 1;
            for (int i = 0; i < n; i++) {
                if (((mask >> i) & 1) == 1) {
                    cost += wells[i];
                    p[root(p, i + 1)] = root(p, 0);              // house joins "has water" (node 0)
                    comps--;
                }
            }
            for (int[] e : ps) {
                int a = root(p, e[0]), b = root(p, e[1]);
                if (a != b) { p[a] = b; cost += e[2]; comps--; }
            }
            if (comps == 1) best = Math.min(best, cost);
        }
        return best;
    }
    int root(int[] p, int x) { while (p[x] != x) x = p[x]; return x; }
}` },
    mcq: { q: 'How do you turn "build a well at house i for cost c" into a graph edge?', options: ['Edge between a virtual node 0 (water source) and house i with weight c', 'A self-loop on house i', 'Add c to every pipe of house i', 'Ignore wells and add them afterwards'], answer: 0, explain: 'A virtual source node makes "own well" just another way to connect to water. The MST over n + 1 nodes then chooses wells and pipes together.' },
    hints: [`<p>Every house must be connected to "water". Invent a node 0 that IS the water.</p>`, `<p>Edges: (0, i, wells[i−1]) for each house, plus all pipes. Now it is a plain MST on n + 1 nodes.</p>`, `<p>Kruskal + DSU over n + 1 nodes; stop after n edges. At least one well is always chosen because node 0 must be connected.</p>`],
    solution: {
      approach: `<p>Virtual node + Kruskal.</p>`,
      code: `
class Solution {
    int[] parent;

    int find(int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }

    public int minCostToSupplyWater(int n, int[] wells, int[][] pipes) {
        List<int[]> edges = new ArrayList<>();
        for (int i = 0; i < n; i++) edges.add(new int[]{0, i + 1, wells[i]});   // virtual water node 0
        for (int[] p : pipes) edges.add(p);
        edges.sort((a, b) -> Integer.compare(a[2], b[2]));
        parent = new int[n + 1];
        for (int i = 0; i <= n; i++) parent[i] = i;
        int total = 0, used = 0;
        for (int[] e : edges) {
            int a = find(e[0]), b = find(e[1]);
            if (a == b) continue;
            parent[a] = b;
            total += e[2];
            if (++used == n) break;                     // n + 1 nodes -> n edges
        }
        return total;
    }
}`,
      dry: { head: ['edge (sorted)', 'decision', 'total'], rows: [['0–1 (1)', 'take (well at 1)', '1'], ['1–2 (1)', 'take (pipe)', '2'], ['2–3 (1)', 'take (pipe) → 3 edges = n', '<span class="c-g">3</span>'], ['0–2, 0–3 (2)', 'not needed', '—']] },
      complexity: `<p>Time O((n + P) log(n + P)); space O(n + P).</p>`,
      followUps: ['Prim from node 0 instead', 'Each house needs water from at least 2 sources (much harder — not an MST any more)']
    }
  });

  // ================= QUIZ =================
  quiz.push(
    { q: 'Which algorithm should you pick for single-source shortest paths with V = 10<sup>5</sup>, E = 2·10<sup>5</sup> and all weights ≥ 0?', options: ['Dijkstra with a priority queue', 'Bellman-Ford', 'Floyd-Warshall', 'Kruskal'], answer: 0, explain: 'O(E log V) ≈ 4·10<sup>6</sup> operations. Bellman-Ford would be 2·10<sup>10</sup>, Floyd-Warshall 10<sup>15</sup>; Kruskal builds an MST, not shortest paths.' },
    { q: 'In lazy-deletion Dijkstra you poll (9, v) while dist[v] = 6. What does that mean?', options: ['A stale entry: v was already improved — skip it', 'A bug: the heap is corrupted', 'v must be relaxed again with 9', 'A negative cycle exists'], answer: 0, explain: 'Java\'s PriorityQueue has no decrease-key, so we push a new entry on every improvement and ignore the older, larger ones when they surface.' },
    { q: 'Why does Dijkstra fail with a negative edge (no negative cycle)?', options: ['A node marked final might later be reached more cheaply through the negative edge', 'The heap cannot store negative numbers', 'It loops forever', 'It always returns ∞'], answer: 0, explain: 'The greedy proof needs "extending a path never makes it cheaper". A negative edge breaks that, so the first pop is not guaranteed optimal.' },
    { q: 'In 0-1 BFS, a relaxation through a weight-0 edge puts the node…', options: ['at the FRONT of the deque', 'at the BACK of the deque', 'into a separate heap', 'nowhere — 0 edges are ignored'], answer: 0, explain: 'Its distance equals the current node\'s, which is the smallest in the deque, so it belongs at the front. Weight-1 edges go to the back.' },
    { q: 'Bellman-Ford relaxes every edge V − 1 times because…', options: ['a shortest simple path has at most V − 1 edges, and round k fixes all paths with ≤ k edges', 'there are V − 1 negative edges at most', 'the heap needs V − 1 operations', 'it is a convention with no reason'], answer: 0, explain: 'Induction: after round k every path with ≤ k edges is correct. Without negative cycles a shortest path never needs more than V − 1 edges.' },
    { q: 'After V − 1 rounds of Bellman-Ford, an edge can still be relaxed. Conclusion?', options: ['A negative cycle is reachable from the source', 'You need one more round', 'The graph is disconnected', 'There is a negative edge somewhere'], answer: 0, explain: 'Without a reachable negative cycle the distances would already be stable. A negative edge alone is fine.' },
    { q: 'In Floyd-Warshall, which loop must be the outermost?', options: ['k — the allowed intermediate vertex', 'i — the source', 'j — the destination', 'Any order works'], answer: 0, explain: 'd<sub>k</sub>[i][j] depends on d<sub>k−1</sub> for all pairs, so every pair must be finished for k − 1 before k is used.' },
    { q: 'Floyd-Warshall finishes and d[3][3] = −2. What does it mean?', options: ['Vertex 3 lies on a negative cycle', 'Vertex 3 is unreachable', 'There is a self-loop of weight −2', 'Nothing important'], answer: 0, explain: 'A path from 3 back to 3 with negative total weight is exactly a negative cycle through 3.' },
    { q: 'What is the ONLY difference between the heap keys of Prim and Dijkstra?', options: ['Prim uses the edge weight w; Dijkstra uses dist[u] + w', 'Prim uses a max-heap', 'Dijkstra needs a DSU', 'There is no difference'], answer: 0, explain: 'Prim grows a tree by the cheapest single edge leaving it; Dijkstra grows by the smallest total distance from the source.' },
    { q: 'Kruskal finds find(u) == find(v) for the next edge. It should…', options: ['skip the edge — it would close a cycle', 'take it anyway', 'stop the algorithm', 'restart with a different order'], answer: 0, explain: 'Same root means u and v are already connected by cheaper chosen edges; this edge adds cost and creates a cycle.' },
    { q: 'Cheapest Flights Within K Stops with Bellman-Ford: why copy the previous round\'s array?', options: ['Updating in place could chain several flights in one round and exceed K stops', 'To detect negative cycles', 'Because arrays are passed by value', 'It makes the code faster'], answer: 0, explain: 'Round r must mean "paths with ≤ r edges". Reading from a frozen copy guarantees each round adds at most one edge.' },
    { q: 'Path With Minimum Effort: the route cost is the largest jump on it. Which statement is true?', options: ['Dijkstra works with max(d, jump) because max never decreases along a path', 'Dijkstra cannot be used; only BFS works', 'You must sum the jumps', 'Floyd-Warshall is required'], answer: 0, explain: 'Any monotone, totally ordered path cost works with Dijkstra. Max qualifies, as do sums of non-negative weights and products of probabilities (with a max-heap).' },
    { q: 'You need the MST of 1000 points where every pair is connected (Manhattan distance). Best fit?', options: ['Array-based Prim, O(V²)', 'Bellman-Ford', 'Kruskal on all pairs is the only option', 'Dijkstra from point 0'], answer: 0, explain: 'A complete graph is dense (E ≈ V²/2). O(V²) Prim needs no edge list and beats sorting 500,000 edges.' }
  );

  // ================= INTERVIEW Q&A =================
  interview.push(
    { q: 'Explain Dijkstra\'s algorithm and why it is correct.', level: 'I', a: `<p>Keep dist[] (0 for the source, ∞ otherwise) and a min-heap of (dist, node). Repeatedly poll the smallest entry; if it is stale skip it, otherwise the node is final and we relax its edges, pushing improvements. Correctness: with non-negative weights, any other route to the polled node must leave the finished set through a node whose tentative distance is already ≥ the polled value, and the rest of that route can only add more. So the first pop is optimal. Complexity O((V + E) log V).</p>`, followUps: ['What changes with a decrease-key heap?', 'When is the O(V²) array version better?', 'How would you stop early for one target?'] },
    { q: 'Why can\'t Dijkstra handle negative edges? What do you use instead?', level: 'I', a: `<p>Dijkstra finalises a node the first time it is polled, assuming no later route can be cheaper. A negative edge can make a longer, later route cheaper (A→B 2, A→C 3, C→B −2 gives B = 1, but Dijkstra already fixed B = 2). Use Bellman-Ford (O(VE)), which also detects negative cycles; for all-pairs, Floyd-Warshall or Johnson's algorithm (Bellman-Ford reweighting + Dijkstra). For DAGs, relaxing in topological order handles negatives in O(V + E).</p>`, followUps: ['Can you just add a constant to every edge to make them positive? (No — paths with more edges get penalised more.)', 'How does Johnson\'s reweighting keep shortest paths the same?'] },
    { q: 'What is 0-1 BFS and when would you use it over Dijkstra?', level: 'I', a: `<p>When every edge weight is 0 or 1, keep a deque instead of a heap: pop the front; relax; weight 0 → push front, weight 1 → push back. The deque always holds at most two distance values in sorted order, so the front is the minimum, just like Dijkstra, but each operation is O(1): total O(V + E). Typical uses: minimum walls to break, minimum edge reversals, minimum sign changes in a grid.</p>`, followUps: ['How do you handle weights {0, k}?', 'Why must you not mark visited at push time?', 'What is Dial\'s algorithm?'] },
    { q: 'How does Bellman-Ford detect a negative cycle, and how would you print it?', level: 'A', a: `<p>After V − 1 rounds all shortest distances are final if no negative cycle is reachable. Do one more round: if any edge still relaxes, a negative cycle exists. To print it, record parent[v] on every relaxation; take the vertex relaxed in round V, walk parent pointers V times (now you are guaranteed to be inside the cycle), then follow parents until you return to that vertex, and reverse. To catch cycles anywhere, initialise all distances to 0 (a virtual source).</p>`, followUps: ['How do you mark every vertex with distance −∞?', 'How is currency arbitrage a negative-cycle problem?'] },
    { q: 'Walk me through Floyd-Warshall. Why is it correct and when do you use it?', level: 'I', a: `<p>d[i][j] starts as the direct edge weight. For k = 0..V−1, for every pair, try going through k: d[i][j] = min(d[i][j], d[i][k] + d[k][j]). DP meaning: after processing k, d[i][j] is the best path whose intermediate vertices are all in {0..k}. Use it for all-pairs on small graphs (V ≤ ~400), when the input is a matrix, for transitive closure, or when negative edges exist. O(V³) time, O(V²) space; a negative diagonal signals a negative cycle.</p>`, followUps: ['Why is updating in place safe?', 'How do you reconstruct paths?', 'How do you update the table when one edge gets cheaper?'] },
    { q: 'What is a minimum spanning tree? State and prove the cut property.', level: 'A', a: `<p>For a connected undirected weighted graph, an MST is a set of V − 1 edges connecting all vertices without cycles, with minimum total weight. Cut property: for any partition of the vertices, the cheapest edge crossing it belongs to some MST. Proof by exchange: take an MST T without that edge e; adding e creates a cycle that crosses the cut again at some edge f with w(f) ≥ w(e); T − f + e is a spanning tree that is no heavier. Prim and Kruskal are both repeated applications of this property.</p>`, followUps: ['State the cycle property', 'When is the MST unique?', 'Does an MST give shortest paths? (No.)'] },
    { q: 'Prim vs Kruskal — how do you choose?', level: 'I', a: `<p>Both give an MST. Kruskal sorts edges and uses DSU: O(E log E), ideal when you are handed an edge list or the graph is sparse; it also extends naturally to clustering (stop at k components) and forced/skipped edges. Prim grows one tree from a start vertex: O(E log V) with a heap, or O(V²) with an array — the array version wins on dense or complete graphs (e.g. points in the plane). In parallel/distributed settings, Borůvka is preferred.</p>`, followUps: ['Which handles a disconnected graph more naturally?', 'Which one would you use for 10<sup>5</sup> points with Euclidean distances?'] },
    { q: 'Explain DSU with path compression and union by rank. What is its complexity?', level: 'I', a: `<p>Each set is a tree; parent[x] points upward and the root represents the set. find(x) follows parents to the root; path compression re-points every node on that path directly to the root. union(a, b) links the root of the shorter tree under the root of the taller one (by rank or size). Together they give amortised O(α(n)) per operation, where α is the inverse Ackermann function — at most 4 for any practical n. Either optimisation alone gives O(log n).</p>`, followUps: ['Why might recursive find overflow the stack?', 'How do you support "undo" (rollback DSU)?', 'How do you count components?'] },
    { q: 'Cheapest Flights Within K Stops: why does plain Dijkstra fail and what do you do?', level: 'A', a: `<p>With a stop limit, a cheap route that uses many stops can finalise a city first and block a pricier route that still has stops left, so the visited-per-city logic is wrong. Fixes: (1) Bellman-Ford limited to K + 1 rounds, reading from the previous round's copy each time — O(K·E); (2) Dijkstra over states (city, stopsUsed), keeping best[city][stops] — O(E·K log(VK)); (3) BFS by levels with pruning. I would code (1): short, clearly correct, and fast for n ≤ 100.</p>`, followUps: ['Why must each round use a copy?', 'Return the actual route', 'What if flights also have durations and a time limit?'] },
    { q: 'How do you count the number of shortest paths between two nodes?', level: 'A', a: `<p>Run Dijkstra with ways[] next to dist[]. ways[src] = 1. When relaxing u → v: if dist[u] + w &lt; dist[v], set dist[v] and ways[v] = ways[u]; if equal, ways[v] += ways[u] (mod if needed). This is correct because nodes are finalised in distance order, so ways[u] is complete when u relaxes its edges. Pitfalls: relax only from non-stale pops (else you double count), and use long for distances when weights are large.</p>`, followUps: ['Unweighted version with BFS', 'Which edges lie on at least one shortest path?'] },
    { q: 'Generalise: when does Dijkstra work for costs that are not sums?', level: 'E', a: `<p>You need a path cost that is monotone (extending a path never makes it better) and consistent with extension (if cost(P) ≤ cost(Q) then cost(P + e) ≤ cost(Q + e)). Max-of-edges (minimum effort, swim in rising water), product of probabilities in [0, 1] with a max-heap, bottleneck capacity (maximise the minimum) and lexicographic tuples (cost, then time) all qualify. Constraints that are not captured by the ordering (hop limits, time budgets) must go into the state, which can make the problem pseudo-polynomial or even NP-hard in general.</p>`, followUps: ['Give a cost function where Dijkstra fails', 'What is a Pareto front in multi-criteria routing?'] },
    { q: 'How do real map services compute routes so fast if Dijkstra is O(E log V)?', level: 'E', a: `<p>Continental road graphs have tens of millions of nodes, so plain Dijkstra per query is too slow. Production systems combine bidirectional search, A* with admissible heuristics (straight-line distance or landmark-based ALT bounds), and heavy preprocessing such as contraction hierarchies, hub labels or customizable route planning that add shortcut edges so a query touches only a few thousand nodes. Live traffic is handled by re-customising weights in a separate fast phase. Public transit uses specialised algorithms (RAPTOR, connection scan) with multi-criteria labels.</p>`, followUps: ['What makes an A* heuristic admissible and consistent?', 'Why does bidirectional Dijkstra roughly halve the work?'] },
    { q: 'A graph has 400 nodes and you get 10<sup>5</sup> distance queries. What do you do?', level: 'I', a: `<p>Precompute all pairs once, then answer each query in O(1). With V = 400, Floyd-Warshall is 6.4·10<sup>7</sup> simple operations — well under a second — and handles negative edges. If the graph were sparse and larger (say V = 5000, E = 2·10<sup>4</sup>), I would run Dijkstra from every node (V·E log V) or only from the distinct query sources, caching results. Memory for the table is V² longs = 1.3 MB here.</p>`, followUps: ['What if edges are updated between queries?', 'What if V = 10<sup>5</sup> but queries all share one source?'] },
    { q: 'How would you test and debug a shortest-path implementation in an interview or at work?', level: 'B', a: `<p>Start with hand-made edge cases: single node, unreachable node, parallel edges, zero-weight edges, a negative edge (for Bellman-Ford), and a graph where the greedy wrong answer differs from the right one. Then write a brute-force oracle (Bellman-Ford or DFS over all paths for tiny graphs) and fuzz random graphs against the fast version. Check overflow by using large weights. In interviews, dry-run one small example out loud with the dist array and the heap contents — it catches stale-entry and direction bugs quickly.</p>`, followUps: ['Which bug does an all-equal-weights test catch?', 'How would AI tools help you generate these tests?'] }
  );

  registerModule({
    id: 'dsa20',
    title: 'Graphs II: Shortest Paths & Minimum Spanning Trees',
    intro: `<p>In Graphs I every edge counted as "one step". Real graphs are <b>weighted</b>: roads have kilometres, network links have latency, flights have prices. This module teaches the two big families of weighted-graph questions:</p>
      <ul>
        <li><b>Shortest paths</b> — "what is the cheapest way from A to B?": Dijkstra (non-negative weights), 0-1 BFS (weights 0/1), Bellman-Ford (negative weights + negative-cycle detection) and Floyd-Warshall (every pair at once).</li>
        <li><b>Minimum spanning trees</b> — "what is the cheapest way to connect everything?": Prim and Kruskal (with DSU).</li>
      </ul>
      <p>Then we learn the move that cracks most hard interview problems: <b>changing the state</b> (city + stops used) or <b>changing how costs combine</b> (max instead of sum). Every algorithm has a step-by-step visualizer showing dist tags on the nodes, the priority queue's contents, the Floyd-Warshall grid, and Kruskal's sorted edges with the DSU parent array.</p>
      ${H.table(['situation', 'algorithm', 'time'], [
        ['one source, weights ≥ 0', 'Dijkstra + PriorityQueue', 'O((V + E) log V)'],
        ['one source, weights 0/1', '0-1 BFS (deque)', 'O(V + E)'],
        ['one source, negative weights / cycle check / ≤ K edges', 'Bellman-Ford', 'O(V · E)'],
        ['all pairs, V ≤ ~400', 'Floyd-Warshall', 'O(V³)'],
        ['connect everything, edge list', 'Kruskal + DSU', 'O(E log E)'],
        ['connect everything, dense / points', 'Prim (array)', 'O(V²)']
      ])}`,
    goals: [
      'Pick the right shortest-path algorithm (Dijkstra, 0-1 BFS, Bellman-Ford, Floyd-Warshall) from the weights, the number of sources and the constraints',
      'Write Dijkstra with a Java PriorityQueue and lazy deletion, reconstruct the path, and explain why negative edges break it',
      'Detect and extract a negative cycle with Bellman-Ford, and run bounded Bellman-Ford for "at most K edges"',
      'Build an MST with Prim (heap and O(V²) array versions) and Kruskal + DSU, and prove the cut property',
      'Solve variants by expanding the state (node, stops / time) or changing the combine rule (max, product, tuple) — K stops, minimum effort, max probability, counting shortest paths',
      'Model hidden graph problems: reversed edges as 0/1 weights, wells as a virtual node, arbitrage as a negative cycle'
    ],
    prereqs: `<p>DSA 19 (Graphs I: BFS, DFS, topological sort and DSU) and DSA 15 (Heaps / PriorityQueue). Comfort with Java collections (ArrayList, ArrayDeque, PriorityQueue with comparators) and DSA 17 (DP basics) for the Floyd-Warshall recurrence.</p>`,
    hours: 16,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
