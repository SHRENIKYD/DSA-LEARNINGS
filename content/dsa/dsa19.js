(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // ================= shared helpers for the visualizers =================
  function one(k, v) { var o = {}; o[k] = v; return o; }
  function cp(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }
  function ek(u, v) { return u + '-' + v; }

  // "0-1 0-2 1->3"  ->  { n, edges: [[0,1],[0,2],[1,3]] }
  function parseEdges(s, maxN, what) {
    s = String(s === undefined ? '' : s).trim();
    if (!s) throw new Error('Type edges like 0-1 1-2 2-3 for ' + (what || 'the graph'));
    var toks = s.split(/[\s,]+/).filter(Boolean), edges = [], n = 0;
    toks.forEach(function (t) {
      var m = /^(\d+)\s*[-→>]+\s*(\d+)$/.exec(t);
      if (!m) throw new Error('Could not read "' + t + '". Write each edge as u-v, for example 0-1 1-2');
      var u = +m[1], v = +m[2];
      if (u >= maxN || v >= maxN) throw new Error('Keep node numbers between 0 and ' + (maxN - 1) + ' so the picture fits');
      edges.push([u, v]); n = Math.max(n, u + 1, v + 1);
    });
    if (edges.length > 22) throw new Error('At most 22 edges please, so the picture stays readable');
    return { n: n, edges: edges };
  }
  function sections(input, k, hint) {
    var p = String(input === undefined ? '' : input).split('|').map(function (x) { return x.trim(); });
    if (p.length < k) throw new Error(hint);
    return p;
  }
  function circlePos(n, height) {
    var pos = [], cx = 50, cy = height / 2, rx = 40, ry = height / 2 - 8;
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + 2 * Math.PI * i / Math.max(n, 1);
      pos.push({ x: Math.round((cx + rx * Math.cos(a)) * 10) / 10, y: Math.round((cy + ry * Math.sin(a)) * 10) / 10 });
    }
    return pos;
  }
  // one graph "part" with circle layout; hl / ehl / tags are copied so frames never share objects
  function gpart(label, n, edges, directed, hl, ehl, tags, height, labels) {
    var H0 = height || 60, pos = circlePos(n, H0), nodes = [];
    for (var i = 0; i < n; i++) nodes.push({ id: i, label: labels ? String(labels[i]) : String(i), x: pos[i].x, y: pos[i].y });
    return { type: 'graph', label: label, directed: !!directed, height: H0, nodes: nodes, edges: edges.map(function (e) { return e.slice(); }), hl: cp(hl || {}), ehl: cp(ehl || {}), tags: cp(tags || {}) };
  }
  function adjOf(n, edges, directed) {
    var g = [];
    for (var i = 0; i < n; i++) g.push([]);
    edges.forEach(function (e) { g[e[0]].push(e[1]); if (!directed) g[e[1]].push(e[0]); });
    g.forEach(function (l) { l.sort(function (a, b) { return a - b; }); });
    return g;
  }
  function adjEntries(g) { return g.map(function (l, i) { return [String(i), '[' + l.join(', ') + ']']; }); }
  // "2 1 1 / 1 1 0 / 0 1 1"  or  "211/110/011"
  function parseGrid(s, maxR, maxC, allowed, what) {
    s = String(s === undefined ? '' : s).trim();
    if (!s) throw new Error('Type rows separated by /, for example 1 1 0 / 0 1 0 for ' + (what || 'the grid'));
    var rows = s.split('/').map(function (r) {
      r = r.trim();
      var cells = /\s/.test(r) ? r.split(/\s+/) : r.split('');
      return cells.filter(function (c) { return c !== ''; });
    });
    if (rows.length > maxR) throw new Error('At most ' + maxR + ' rows please');
    var C = rows[0].length;
    if (!C || C > maxC) throw new Error('Each row needs 1 to ' + maxC + ' cells');
    rows.forEach(function (r) {
      if (r.length !== C) throw new Error('Every row must have the same number of cells (' + C + ')');
      r.forEach(function (c) { if (allowed.indexOf(c) < 0) throw new Error('Cells may only be: ' + allowed.join(' ')); });
    });
    return rows;
  }
  function gridCopy(g) { return g.map(function (r) { return r.slice(); }); }
  function rc(r, c) { return r + ',' + c; }
  var DR = [-1, 1, 0, 0], DC = [0, 0, -1, 1];

  // ================= TOPIC 1: vocabulary + representations =================
  topics.push({
    title: 'Graph Vocabulary & Representations: Edge List, Adjacency Matrix, Adjacency List',
    analogy: `<p>Think of a <b>city map</b>. The <b>places</b> (home, school, mall) are dots, and the <b>roads</b> between them are lines. That is all a graph is: <b>dots</b> (called <i>nodes</i> or <i>vertices</i>) and <b>lines</b> (called <i>edges</i>).</p>
      <p>Now, how do you <i>write the map down</i>? Option 1 is a huge <b>attendance register</b> with every place as a row and every place as a column, and a tick where a road exists — that is an <b>adjacency matrix</b>. Option 2 is giving every place its own <b>phone contact list</b> of direct neighbours — that is an <b>adjacency list</b>. The register is quick to check ("is there a road from A to B?") but wastes paper when most boxes are empty. The contact lists are compact and perfect for "who can I reach from here?".</p>`,
    explain: `<p><b>Words you will hear (each in one plain sentence):</b></p>
      <ul>
        <li><b>Node / vertex</b> — one thing: a city, a person, a course, a cell in a grid.</li>
        <li><b>Edge</b> — a connection between two nodes. <b>Undirected</b> = two-way road (friendship). <b>Directed</b> = one-way road (A follows B, course A must come before course B).</li>
        <li><b>Weighted</b> — the edge carries a number (distance, cost, time). This module is mostly <b>unweighted</b>; weights come in Graphs II.</li>
        <li><b>Degree</b> — how many edges touch a node. In a directed graph we split it into <b>in-degree</b> (arrows coming in) and <b>out-degree</b> (arrows going out).</li>
        <li><b>Path</b> — a walk from node to node along edges. <b>Cycle</b> — a path that comes back to where it started.</li>
        <li><b>Connected component</b> — a group of nodes where everyone can reach everyone (an "island" of the graph).</li>
        <li><b>Sparse</b> graph — few edges (roads in a country). <b>Dense</b> graph — almost every pair connected.</li>
      </ul>
      <p><b>How interview questions hand you a graph:</b> almost always as an <b>edge list</b>: <code>n = 4, edges = [[0,1],[0,2],[1,2],[2,3]]</code>. Your first job is to turn it into something you can walk.</p>
      ${H.table(['Representation', 'Memory', '"Is u–v an edge?"', '"List neighbours of u"', 'Use when'], [
        ['Edge list', 'O(E)', 'O(E)', 'O(E)', 'Kruskal, DSU, input format'],
        ['Adjacency matrix', H.c('r', 'O(V²)'), H.c('g', 'O(1)'), 'O(V)', 'V ≤ ~2000, dense, Floyd-Warshall'],
        ['Adjacency list', H.c('g', 'O(V + E)'), 'O(deg u)', H.c('g', 'O(deg u)'), H.c('g', 'BFS / DFS / almost everything')]
      ])}
      <p><b>Tiny example</b> — 4 nodes, edges 0–1, 0–2, 1–2, 2–3 (undirected):</p>
      ${H.table(['', '0', '1', '2', '3'], [['<b>0</b>', '0', H.c('g', '1'), H.c('g', '1'), '0'], ['<b>1</b>', H.c('g', '1'), '0', H.c('g', '1'), '0'], ['<b>2</b>', H.c('g', '1'), H.c('g', '1'), '0', H.c('g', '1')], ['<b>3</b>', '0', '0', H.c('g', '1'), '0']])}
      ${H.kv([['0', '[1, 2]'], ['1', '[0, 2]'], ['2', '[0, 1, 3]'], ['3', '[2]']], { label: 'Adjacency list (each node’s contact list)' })}
      <p>Notice the matrix is <b>symmetric</b> for undirected graphs, and each undirected edge appears <b>twice</b> in the list (once from each end). The <b>size check</b> that decides everything: with n = 10<sup>5</sup> nodes a matrix needs 10<sup>10</sup> cells — about 10 GB even as booleans. An adjacency list needs only n + 2E entries. So the default in interviews is <b>adjacency list</b>.</p>
      <p><b>Grids are graphs too.</b> A cell (r, c) is a node, and its up/down/left/right cells are its neighbours. You never build the list — you compute neighbours on the fly with direction arrays <code>dr = {-1,1,0,0}</code>, <code>dc = {0,0,-1,1}</code>. That is called an <b>implicit graph</b>.</p>`,
    clues: [
      '"Given <b>n</b> nodes and <b>edges[i] = [u, v]</b>" → build an adjacency list first, always',
      '"n ≤ 10<sup>5</sup>, edges ≤ 2·10<sup>5</sup>" → adjacency list (a matrix would be 10<sup>10</sup> cells)',
      '"n ≤ 200 / 500" and you need instant "are u and v directly connected?" → adjacency matrix is fine',
      '"cities, roads, flights, friends, followers, courses, prerequisites, network, servers" → it is a graph problem even if the word "graph" never appears',
      '"a 2-D grid of land/water, walls/open cells" → implicit graph: neighbours = 4 (or 8) directions',
      '"<b>A trusts B</b>, A follows B, A must happen before B" → <b>directed</b> edge; count in-degree / out-degree',
      '"word ladder", "lock combinations", "states of a puzzle" → nodes are <i>states</i>, edges are <i>one move</i>'
    ],
    code: [`
      // Build both representations from an edge list (undirected)
      static List<List<Integer>> buildList(int n, int[][] edges) {
          List<List<Integer>> g = new ArrayList<>();
          for (int i = 0; i < n; i++) g.add(new ArrayList<>());   // one empty contact list per node
          for (int[] e : edges) {
              g.get(e[0]).add(e[1]);   // u -> v
              g.get(e[1]).add(e[0]);   // v -> u (delete this line for a DIRECTED graph)
          }
          return g;
      }

      static boolean[][] buildMatrix(int n, int[][] edges) {
          boolean[][] m = new boolean[n][n];                      // n*n cells: only OK for small n
          for (int[] e : edges) { m[e[0]][e[1]] = true; m[e[1]][e[0]] = true; }
          return m;
      }

      // Weighted directed edges: store {to, weight} pairs
      static List<List<int[]>> buildWeighted(int n, int[][] edges) { // edges[i] = {u, v, w}
          List<List<int[]>> g = new ArrayList<>();
          for (int i = 0; i < n; i++) g.add(new ArrayList<>());
          for (int[] e : edges) g.get(e[0]).add(new int[]{e[1], e[2]});
          return g;
      }`, { lang: 'python', run: true, title: 'Same idea in Python (runnable)', code: `from collections import defaultdict

def build(n, edges, directed=False):
    g = [[] for _ in range(n)]          # adjacency list
    for u, v in edges:
        g[u].append(v)
        if not directed:
            g[v].append(u)
    return g

edges = [[0, 1], [0, 2], [1, 2], [2, 3]]
g = build(4, edges)
for u in range(4):
    print(u, "->", g[u], " degree =", len(g[u]))
print("sum of degrees =", sum(len(x) for x in g), "= 2 * edges =", 2 * len(edges))

# directed: in-degree and out-degree
dg = build(4, edges, directed=True)
indeg = [0] * 4
for u in range(4):
    for v in dg[u]:
        indeg[v] += 1
print("out-degree:", [len(x) for x in dg])
print("in-degree: ", indeg)` }],
    codeTitle: ['Adjacency list, matrix and weighted list (Java)'],
    viz: {
      title: 'Edge list → adjacency matrix + adjacency list, one edge at a time',
      input: '0-1 0-2 1-2 2-3 3-4',
      inputLabel: 'Undirected edges u-v (nodes 0..7)',
      gen: function (input) {
        var G = parseEdges(input, 8), n = G.n, frames = [];
        var mat = [], lst = [], head = [], shown = [];
        for (var i = 0; i < n; i++) { mat.push(new Array(n).fill(0)); lst.push([]); head.push(String(i)); }
        frames.push({ narr: 'We have <b>' + n + '</b> nodes and <b>' + G.edges.length + '</b> edges. Start with an all-zero ' + n + '×' + n + ' matrix and ' + n + ' empty contact lists.', parts: [
          gpart('Graph so far (no edges yet)', n, [], false),
          { type: 'grid', label: 'Adjacency matrix', rows: gridCopy(mat), rowHead: head, colHead: head },
          { type: 'map', label: 'Adjacency list', entries: lst.map(function (l, i) { return [String(i), '[' + l.join(', ') + ']']; }) }
        ] });
        G.edges.forEach(function (e, k) {
          var u = e[0], v = e[1];
          mat[u][v] = 1; mat[v][u] = 1; lst[u].push(v); if (u !== v) lst[v].push(u); shown.push(e);
          var gh = {}; gh[rc(u, v)] = 'ok'; gh[rc(v, u)] = 'ok';
          var mh = {}; mh[String(u)] = 'ok'; mh[String(v)] = 'ok';
          var nh = {}; nh[u] = 'cur'; nh[v] = 'cur';
          frames.push({ narr: 'Edge <b>' + u + '–' + v + '</b>: tick BOTH cells [' + u + '][' + v + '] and [' + v + '][' + u + '] (two-way road), and append ' + v + ' to ' + u + '’s list and ' + u + ' to ' + v + '’s list.', parts: [
            gpart('Graph so far', n, shown, false, nh, one(ek(u, v), 'ok')),
            { type: 'grid', label: 'Adjacency matrix', rows: gridCopy(mat), rowHead: head, colHead: head, hl: gh },
            { type: 'map', label: 'Adjacency list', entries: lst.map(function (l, i) { return [String(i), '[' + l.join(', ') + ']']; }), hl: mh }
          ] });
        });
        var deg = lst.map(function (l) { return l.length; }), sum = deg.reduce(function (a, b) { return a + b; }, 0);
        var tags = {}; deg.forEach(function (d, i) { tags[i] = 'deg ' + d; });
        frames.push({ narr: 'Degrees = length of each list. Their sum is <b>' + sum + '</b> = 2 × ' + G.edges.length + ' edges (every edge has two ends — the <i>handshake lemma</i>).', parts: [
          gpart('Degree of each node', n, shown, false, {}, {}, tags),
          { type: 'bars', label: 'degree per node', values: deg, idxLabels: head }
        ] });
        var zeros = n * n - 2 * G.edges.length;
        frames.push({ narr: 'Memory check: the matrix stores <b>' + (n * n) + '</b> cells (about ' + Math.max(zeros, 0) + ' of them are useless zeros). The list stores only <b>' + sum + '</b> entries. For n = 100 000 that gap becomes 10 billion vs a few hundred thousand — that is why lists win.', parts: [
          { type: 'table', label: 'Cost comparison', columns: ['Structure', 'Cells stored', 'Edge check', 'Neighbour scan'], rows: [['Matrix', String(n * n), 'O(1)', 'O(V)'], ['List', String(sum), 'O(degree)', 'O(degree)']], hl: { 1: 'ok' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Directed graph: in-degree and out-degree', html: `<p>Edges 0→1, 0→2, 2→1, 1→3. Out-lists: 0:[1,2], 1:[3], 2:[1], 3:[]. In-degree counts arrows arriving: ${H.arr([0, 2, 1, 1], { label: 'indeg[0..3]', hl: { 0: 'g' } })} Node 0 has in-degree 0 — nothing points to it, so it is a <b>source</b> (a course with no prerequisites). This single array is the heart of topological sort later.</p>` },
      { title: 'Grid as an implicit graph', html: `<p>Grid <code>["110","010"]</code>: cell (0,0) neighbours are (1,0) [down] and (0,1) [right] — we test each of the 4 directions and skip any that fall outside the grid or are water.</p>${H.table(['dir', 'dr', 'dc', 'from (0,1) goes to', 'valid?'], [['up', '-1', '0', '(-1,1)', H.c('r', 'out of bounds')], ['down', '1', '0', '(1,1)', H.c('g', 'yes, land')], ['left', '0', '-1', '(0,0)', H.c('g', 'yes, land')], ['right', '0', '1', '(0,2)', H.c('r', 'water')]])}<p>No adjacency list is built — saves O(R·C) memory and time.</p>`, code: `int[] dr = {-1, 1, 0, 0}, dc = {0, 0, -1, 1};
int R = 2, C = 3, r = 0, c = 1;
for (int d = 0; d < 4; d++) {
    int nr = r + dr[d], nc = c + dc[d];
    if (nr < 0 || nc < 0 || nr >= R || nc >= C) continue;   // off the map
    System.out.println("neighbour: " + nr + "," + nc);
}` },
      { title: '1-indexed input', html: `<p>Many problems number nodes 1..n. Either allocate <code>n + 1</code> lists and ignore index 0, or subtract 1 from every endpoint while reading. Mixing the two is a classic off-by-one crash (<code>IndexOutOfBoundsException</code> on node n).</p>` },
      { title: 'Choosing the representation from constraints', html: `${H.table(['Constraint', 'Choice', 'Why'], [['n ≤ 100, need many "is edge?" checks', 'matrix', 'n² = 10 000 cells, O(1) checks'], ['n ≤ 10<sup>5</sup>, m ≤ 2·10<sup>5</sup>', 'list', 'n² is 10<sup>10</sup>'], ['only need to merge groups', 'edge list + DSU', 'never walk neighbours'], ['grid 1000×1000', 'implicit', 'neighbours computed on the fly']])}` }
    ],
    deepDive: `<p><b>Handshake lemma:</b> the sum of all degrees = 2E in an undirected graph, so the adjacency list holds exactly 2E entries and any traversal that touches each list once is <b>O(V + E)</b>. In a directed graph the sum of out-degrees = E.</p>
      <p><b>Real memory cost in Java:</b> <code>List&lt;List&lt;Integer&gt;&gt;</code> boxes every neighbour into an <code>Integer</code> object (~16 bytes + a 4–8 byte reference) plus each <code>ArrayList</code> has its own header and spare capacity. For 10<sup>6</sup> edges that is tens of MB and lots of pointer-chasing. Competitive programmers use a <b>CSR / "forward star"</b> layout: arrays <code>head[V]</code>, <code>next[E]</code>, <code>to[E]</code> — pure ints, cache-friendly, 3–5× faster. Graph libraries (and GPU graph engines) use CSR for the same reason.</p>
      <p><b>Generic array trap:</b> <code>List&lt;Integer&gt;[] g = new ArrayList[n];</code> compiles only with an unchecked warning — fine in contests, but in interviews <code>List&lt;List&lt;Integer&gt;&gt;</code> reads cleaner.</p>
      <p><b>Matrix superpowers:</b> O(1) edge test, easy to store weights (<code>int[][] w</code>), and the matrix power A<sup>k</sup>[u][v] counts walks of length k from u to v. Bitset rows (<code>long[]</code> or <code>BitSet</code>) make dense-graph operations like triangle counting 64× faster.</p>
      <p><b>Edge cases to ask about:</b> self-loops (u–u), parallel edges (two roads between the same pair), disconnected nodes (isolated vertices still need an empty list), 0- vs 1-indexing, and whether edges can repeat. A clean adjacency list handles all of them without special code, which is another reason it is the default.</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant writes "build adjacency list" boilerplate instantly, so nobody is impressed that you can type it. What interviewers now probe is <b>modelling</b>: spotting that "bus routes", "word transformations" or "lock wheels" are graphs, deciding what a node is and what an edge is, and picking the representation from the constraints.</p>
      <p><b>Use AI as a partner:</b> ask <code>Here is a problem statement. Don't solve it — list 3 different ways to model it as a graph (what is a node, what is an edge) and the size of each graph.</code> Then judge which model is smallest. In real systems, AI tools are also good at converting messy data (CSV of follows, service dependency YAML) into an edge list for analysis.</p>
      <p><b>Where AI goes wrong:</b> forgetting the reverse edge for undirected graphs, building a V×V matrix for V = 10<sup>5</sup>, mixing 0/1-indexing, or creating lists only for nodes that appear in edges (isolated nodes then crash). <b>What you must still own:</b> reading the constraint line, estimating memory in your head, and explaining why O(V + E) is the cost of "touching the whole graph".</p>`,
    problems: [{
      title: 'Find the Town Judge (in-degree / out-degree)', level: 'Easy', tags: ['graph', 'degree', 'directed'], companies: ['Amazon', 'Apple'],
      statement: `<p>A town has <code>n</code> people labelled 1..n. <code>trust[i] = [a, b]</code> means person a trusts person b. The <b>town judge</b> trusts nobody, and everybody else trusts the judge. Return the judge's label, or -1 if there is no judge.</p>`,
      constraints: `1 ≤ n ≤ 1000, 0 ≤ trust.length ≤ 10<sup>4</sup>, all pairs distinct, a ≠ b`,
      example: `<p>n = 3, trust = [[1,3],[2,3]] → <b>${H.c('g', '3')}</b>. Person 3 has ${H.c('g', 'in-degree 2 = n − 1')} (everyone else trusts them) and ${H.c('g', 'out-degree 0')} (trusts nobody).</p>`,
      brute: { why: `<p>For every candidate person, scan the whole trust list to check both conditions: O(n · T) = 10<sup>7</sup> — passes here, but the repeated scanning is wasted work; one pass can count everything.</p>`, code: `int findJudgeBrute(int n, int[][] trust) {
    for (int p = 1; p <= n; p++) {
        boolean trustsSomeone = false;
        int trustedBy = 0;
        for (int[] t : trust) {
            if (t[0] == p) trustsSomeone = true;
            if (t[1] == p) trustedBy++;
        }
        if (!trustsSomeone && trustedBy == n - 1) return p;
    }
    return -1;
}` },
      mcq: { q: 'Which single number per person is enough to decide the judge?', options: ['in-degree − out-degree == n − 1', 'out-degree == 0 only', 'in-degree == 1', 'number of cycles through the person'], answer: 0, explain: 'The judge has in = n−1 and out = 0, so in − out = n−1. Anyone else has in ≤ n−2 or out ≥ 1, so their score is at most n−2.' },
      hints: [`<p>Hint 1: Treat "a trusts b" as a directed edge a → b. The judge is a node every other node points to, and that points to nobody.</p>`, `<p>Hint 2: You don't need the adjacency list at all — just two counters per person (or one combined score: +1 when trusted, −1 when trusting).</p>`, `<p>Hint 3: Recipe: score[a]--, score[b]++ for every pair; return the person whose score is exactly n − 1. Edge case: n = 1 and no trust → person 1 is the judge (score 0 = n − 1).</p>`],
      solution: {
        approach: `<p>Degrees answer "how connected is each node" in one pass over the edge list. Combine in-degree and out-degree into one score: a person trusted by everyone else and trusting nobody scores exactly n − 1, and nobody else can reach that score.</p>`,
        code: `class Solution {
    public int findJudge(int n, int[][] trust) {
        int[] score = new int[n + 1];          // 1-indexed people
        for (int[] t : trust) {
            score[t[0]]--;                     // trusting someone disqualifies (out-degree)
            score[t[1]]++;                     // being trusted counts (in-degree)
        }
        for (int p = 1; p <= n; p++)
            if (score[p] == n - 1) return p;   // in = n-1 and out = 0
        return -1;
    }
}`,
        alt: [{ lang: 'python', code: `def find_judge(n, trust):
    score = [0] * (n + 1)
    for a, b in trust:
        score[a] -= 1
        score[b] += 1
    for p in range(1, n + 1):
        if score[p] == n - 1:
            return p
    return -1

print(find_judge(3, [[1, 3], [2, 3]]))  # 3`, run: true }],
        dry: { head: ['pair', 'score[1]', 'score[2]', 'score[3]'], rows: [['start', '0', '0', '0'], ['[1,3]', '-1', '0', '1'], ['[2,3]', '-1', '-1', H.c('g', '2 = n−1 → judge 3')]] },
        complexity: `<p>Time O(n + T), space O(n). No adjacency list needed — degrees are a summary of the graph.</p>`,
        followUps: ['What if there can be several "celebrities" in a party and you may only ask knows(a, b)? (LC 277, two-pointer elimination in O(n) calls)', 'Return all people trusted by at least k others']
      }
    }]
  });

  // ================= TOPIC 2: BFS + shortest path in unweighted graphs =================
  topics.push({
    title: 'BFS: Level-by-Level Search & Shortest Path in an Unweighted Graph',
    analogy: `<p>Drop a stone in a still pond. The ripple reaches everything <b>1 step</b> away first, then everything <b>2 steps</b> away, then 3… It never jumps ahead. <b>Breadth-First Search (BFS)</b> explores a graph exactly like that ripple.</p>
      <p>Or think of spreading news in a school: you tell your friends (round 1), they tell their friends (round 2), and so on. The round in which a person first hears the news <b>is</b> their shortest distance from you — nobody can hear it "earlier" by a longer chain.</p>`,
    explain: `<p><b>The tool:</b> a <b>queue</b> (first in, first out — like a line at a ticket counter). People who join first get served first, so nodes are processed in order of their distance.</p>
      <p><b>The recipe:</b></p>
      <ol>
        <li>Put the start node in the queue, mark it <b>visited</b>, set <code>dist[start] = 0</code>.</li>
        <li>Take the node at the front of the queue. Look at each neighbour.</li>
        <li>If a neighbour is not visited yet: mark it visited <b>right now</b>, set <code>dist[nb] = dist[cur] + 1</code>, remember <code>parent[nb] = cur</code>, and add it to the back of the queue.</li>
        <li>Repeat until the queue is empty.</li>
      </ol>
      ${H.table(['Step', 'Popped', 'New neighbours (dist)', 'Queue after'], [['0', '—', '0 (0)', '[0]'], ['1', '0', '1 (1), 2 (1)', '[1, 2]'], ['2', '1', '3 (2)', '[2, 3]'], ['3', '2', '— (3 already seen)', '[3]'], ['4', '3', '4 (3)', '[4]']])}
      <p><b>Why is the first time we reach a node the shortest?</b> The queue always holds nodes of distance d followed by nodes of distance d + 1 — never anything else. So every node at distance 1 is finished before any node at distance 2 is even looked at. When a node is discovered, it is discovered through the shortest possible chain.</p>
      <p><b>The #1 bug:</b> marking visited when you <i>pop</i> instead of when you <i>push</i>. Then the same node can be pushed many times by different neighbours — the answer stays correct but the queue can blow up to O(E) copies and you may TLE or run out of memory. <b>Mark on push.</b></p>
      <p><b>Getting the actual path:</b> each node remembers who discovered it (<code>parent</code>). Walk backwards from the target: target → parent → parent … → start, then reverse.</p>
      <p><b>Counting levels:</b> if you need "the number of rounds" (minutes, moves, levels), process the queue <b>one level at a time</b>: read <code>size = q.size()</code>, pop exactly that many, then increment the round counter.</p>
      <p><b>Cost:</b> every node enters the queue once and every adjacency list is scanned once → <b>O(V + E)</b> time, O(V) extra space.</p>`,
    clues: [
      '"<b>minimum number of steps / moves / edges / jumps / transformations</b>" with every step costing the same → BFS',
      '"shortest path" in an <b>unweighted</b> graph or grid → BFS (weighted → Dijkstra, Graphs II)',
      '"level by level", "nearest", "closest", "within k hops", "degrees of separation" → BFS with level counting',
      '"word ladder", "open the lock", "knight moves", "minimum genetic mutation" → BFS over a state graph',
      'V + E ≤ 10<sup>6</sup> and you need distances from one source → O(V + E) BFS fits easily',
      'DFS gives <i>a</i> path, BFS gives the <b>shortest</b> path — if the word "minimum" is there, think BFS first'
    ],
    code: [`
      // BFS from src: distances + parent pointers + path to dst
      static List<Integer> shortestPath(List<List<Integer>> g, int src, int dst) {
          int n = g.size();
          int[] dist = new int[n], parent = new int[n];
          Arrays.fill(dist, -1);                   // -1 = not visited yet
          Arrays.fill(parent, -1);
          ArrayDeque<Integer> q = new ArrayDeque<>();
          dist[src] = 0;
          q.offer(src);
          while (!q.isEmpty()) {
              int u = q.poll();
              if (u == dst) break;                 // optional early exit: dst's distance is final
              for (int v : g.get(u)) {
                  if (dist[v] != -1) continue;     // already discovered by a shorter (or equal) chain
                  dist[v] = dist[u] + 1;           // mark visited ON PUSH
                  parent[v] = u;
                  q.offer(v);
              }
          }
          if (dist[dst] == -1) return Collections.emptyList(); // unreachable
          LinkedList<Integer> path = new LinkedList<>();
          for (int x = dst; x != -1; x = parent[x]) path.addFirst(x); // walk back to src
          return path;
      }

      // Level-by-level BFS (when you need "rounds")
      static int levels(List<List<Integer>> g, int src) {
          boolean[] seen = new boolean[g.size()];
          ArrayDeque<Integer> q = new ArrayDeque<>();
          q.offer(src); seen[src] = true;
          int level = -1;
          while (!q.isEmpty()) {
              level++;
              for (int k = q.size(); k > 0; k--) {     // pop exactly this level
                  int u = q.poll();
                  for (int v : g.get(u)) if (!seen[v]) { seen[v] = true; q.offer(v); }
              }
          }
          return level;                                // eccentricity of src
      }`, { lang: 'python', run: true, title: 'BFS shortest path in Python (runnable)', code: `from collections import deque

def bfs_path(n, edges, src, dst):
    g = [[] for _ in range(n)]
    for u, v in edges:
        g[u].append(v)
        g[v].append(u)
    dist = [-1] * n
    parent = [-1] * n
    dist[src] = 0
    q = deque([src])
    while q:
        u = q.popleft()
        for v in g[u]:
            if dist[v] == -1:          # mark on push
                dist[v] = dist[u] + 1
                parent[v] = u
                q.append(v)
    if dist[dst] == -1:
        return dist, None
    path, x = [], dst
    while x != -1:
        path.append(x)
        x = parent[x]
    return dist, path[::-1]

dist, path = bfs_path(6, [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [4, 5]], 0, 5)
print("dist =", dist)
print("path 0 -> 5 =", path)` }],
    codeTitle: ['BFS with distances, parents and path (Java)'],
    viz: {
      title: 'BFS ripple: queue, distances and parent pointers',
      input: '0-1 0-2 1-3 2-3 2-4 3-5 4-5 5-6 | 0 | 6',
      inputLabel: 'edges | source | target (nodes 0..9)',
      gen: function (input) {
        var P = sections(input, 3, 'Format: edges | source | target, e.g. 0-1 1-2 | 0 | 2');
        var G = parseEdges(P[0], 10), n = G.n, src = +P[1], dst = +P[2];
        if (!(src >= 0 && src < n && dst >= 0 && dst < n) || isNaN(src) || isNaN(dst)) throw new Error('Source and target must be node numbers that appear in the edges (0..' + (n - 1) + ')');
        var g = adjOf(n, G.edges, false), dist = new Array(n).fill(-1), par = new Array(n).fill(-1), q = [src], frames = [], tree = {};
        dist[src] = 0;
        function show(narr, hl, qhl) {
          var h = {}, tags = {};
          for (var i = 0; i < n; i++) { if (dist[i] >= 0) { h[i] = 'done'; tags[i] = 'd=' + dist[i]; } }
          q.forEach(function (x) { h[x] = 'win'; });
          for (var k in hl) h[k] = hl[k];
          frames.push({ narr: narr, parts: [
            gpart('Graph (blue = waiting in queue, faded = finished, purple edges = BFS tree)', n, G.edges, false, h, tree, tags),
            { type: 'queue', label: 'BFS queue', items: q.slice(), hl: qhl || {} },
            { type: 'array', label: 'dist[]  (-1 = not reached yet)', values: dist.slice(), hl: hl ? (function () { var o = {}; for (var k in hl) o[k] = hl[k] === 'cur' ? 'cur' : 'ok'; return o; })() : {} },
            { type: 'array', label: 'parent[]', values: par.slice() }
          ] });
        }
        show('Start: put source <b>' + src + '</b> in the queue, mark it visited, dist = 0. Everything else is -1 (unknown).', one(src, 'cur'), { 0: 'ok' });
        while (q.length) {
          var u = q.shift(), added = [], hl = one(u, 'cur');
          g[u].forEach(function (v) {
            if (dist[v] === -1) { dist[v] = dist[u] + 1; par[v] = u; q.push(v); added.push(v); hl[v] = 'ok'; tree[ek(u, v)] = 'sel'; }
          });
          var qh = {}; for (var j = q.length - added.length; j < q.length; j++) qh[j] = 'ok';
          show('Pop <b>' + u + '</b> (dist ' + dist[u] + '). Neighbours: [' + g[u].join(', ') + ']. ' + (added.length ? 'New: <b>' + added.join(', ') + '</b> → dist ' + (dist[u] + 1) + ', parent ' + u + ', pushed to the back.' : 'All already visited — nothing to add (they were reached by an equal or shorter chain).'), hl, qh);
          if (frames.length > 40) break;
        }
        if (dist[dst] === -1) {
          show('Queue empty. Target <b>' + dst + '</b> was never reached → it is in a different component; answer <span class="c-r">-1 / no path</span>.', one(dst, 'bad'));
          return frames;
        }
        var path = [], x = dst; while (x !== -1) { path.push(x); x = par[x]; } path.reverse();
        var ph = {}, pe = {};
        path.forEach(function (p, i) { ph[p] = 'sel'; if (i) pe[ek(path[i - 1], p)] = 'ok'; });
        frames.push({ narr: 'Walk parent pointers back from ' + dst + ': ' + path.slice().reverse().join(' ← ') + '. Reverse it → shortest path <b>' + path.join(' → ') + '</b> with <b>' + dist[dst] + '</b> edges.', parts: [
          gpart('Shortest path (green edges)', n, G.edges, false, ph, pe, { }),
          { type: 'array', label: 'parent[]', values: par.slice(), hl: (function () { var o = {}; path.forEach(function (p) { o[p] = 'sel'; }); return o; })() },
          { type: 'vars', label: 'Answer', vals: { distance: dist[dst], path: path.join('→') }, hl: { distance: 'ok' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Why DFS does NOT give shortest paths', html: `<p>Edges 0–1, 1–2, 2–3, 0–3. DFS from 0 might go 0→1→2→3 and report 3 edges. BFS sees 3 directly in round 1 (dist 1). DFS commits to one direction deeply; BFS fans out evenly — only the fan-out guarantees "first time = shortest".</p>` },
      { title: 'Visited-on-pop bug, counted', html: `<p>Complete graph on 5 nodes, start 0. Marking on pop: node 0 pushes 1,2,3,4; node 1 pushes 2,3,4 again (not yet popped, so not "visited"); node 2 pushes 3,4 again… The queue receives ${H.c('r', '4 + 3 + 2 + 1 = 10')} pushes instead of ${H.c('g', '4')}. On dense graphs that is O(E) pushes and memory instead of O(V).</p>` },
      { title: 'Counting levels: degrees of separation', html: `<p>"How many handshakes from Asha to Ben?" — level-by-level BFS:</p>${H.table(['level', 'queue at start of level', 'people met'], [['0', '[Asha]', 'Asha'], ['1', '[Chen, Dev]', 'friends'], ['2', '[Eli, Ben]', H.c('g', 'Ben found → answer 2')]])}`, code: { lang: 'python', run: true, code: `from collections import deque
g = {"Asha": ["Chen", "Dev"], "Chen": ["Asha", "Eli"], "Dev": ["Asha", "Ben"], "Eli": ["Chen"], "Ben": ["Dev"]}
q, seen, level = deque(["Asha"]), {"Asha"}, 0
while q:
    for _ in range(len(q)):          # one full level
        p = q.popleft()
        if p == "Ben":
            print("Ben is", level, "handshakes away")
        for f in g[p]:
            if f not in seen:
                seen.add(f)
                q.append(f)
    level += 1` } },
      { title: 'Unreachable target', html: `<p>Edges 0–1, 2–3, source 0, target 3. BFS finishes with dist = [0, 1, -1, -1]. Keep the -1 sentinel (not 0 and not Integer.MAX_VALUE) so "unreachable" is obvious and never accidentally added to.</p>` }
    ],
    deepDive: `<p><b>Proof sketch (queue invariant):</b> at any moment the queue looks like [d, d, …, d, d+1, …, d+1]. Base: only the source (0). Step: popping a d node only pushes d+1 nodes at the back. So nodes leave the queue in non-decreasing distance order, and the first discovery of v comes from the earliest-finished neighbour u — any shorter chain would have reached a neighbour of v at a smaller distance and discovered v earlier. Hence <code>dist[v]</code> is optimal.</p>
      <p><b>Complexity details:</b> O(V + E) with adjacency lists, but O(V²) with a matrix (scanning a whole row per node). On grids R×C it is O(R·C). If you BFS from <i>every</i> node (all-pairs in an unweighted graph) it is O(V·(V + E)).</p>
      <p><b>Bidirectional BFS:</b> search from source and target at the same time and stop when frontiers meet. With branching factor b and distance d, cost drops from b<sup>d</sup> to about 2·b<sup>d/2</sup> — for Word Ladder that is a 100–1000× speed-up. Always expand the <b>smaller</b> frontier.</p>
      <p><b>State-space BFS:</b> when the problem has extra state (keys collected, remaining obstacles you may break, visited-mask), the node becomes the tuple (position, state). Visited must be over the tuple; the graph size is V × (#states), so check it fits.</p>
      <p><b>Java details:</b> use <code>ArrayDeque</code>, not <code>LinkedList</code> (no node allocation per push, better cache locality). For grids, encode (r, c) as <code>r * C + c</code> in an <code>int</code> queue to avoid allocating <code>int[]</code> pairs. An array-based queue (<code>int[] q = new int[V]; head, tail</code>) is fastest because each node enters at most once.</p>
      <p><b>Limits:</b> BFS only works when every edge costs the same. Edge weights of 0 and 1 → 0-1 BFS with a deque; arbitrary non-negative weights → Dijkstra (Graphs II).</p>`,
    aiEra: `<p><b>What AI changes:</b> BFS is the most-generated graph snippet on Earth; assistants produce it flawlessly in isolation. The interview signal moved to <b>recognising</b> that "minimum moves to open a lock" or "fewest bus changes" is BFS, choosing what the node is (a bus route, not a stop), and proving why the first visit is optimal.</p>
      <p><b>Use AI as a partner:</b> <code>Generate 6 tricky inputs for BFS shortest path: unreachable target, src == dst, self-loop, duplicate edges, a long chain of 10^5 nodes, a star graph</code>, then run your code on them. Ask it to compare your solution with bidirectional BFS on random large graphs and report speed-ups.</p>
      <p><b>Where AI goes wrong:</b> marks visited on pop (memory blow-up on dense graphs), uses a recursive "BFS" that is actually DFS, forgets to handle <code>src == dst</code>, uses BFS on weighted graphs, or builds the full state graph for Word Ladder (O(N²·L) edges) instead of wildcard buckets. <b>What you must still own:</b> the queue invariant proof, picking BFS vs Dijkstra vs 0-1 BFS from edge weights, and sizing the state space.</p>`,
    problems: [{
      title: 'Fewest Flights Between Two Cities (unweighted shortest path + route)', level: 'Medium', tags: ['bfs', 'shortest path', 'parent array'], companies: ['Google', 'Uber', 'Expedia'],
      statement: `<p>There are <code>n</code> airports 0..n−1 and a list of two-way direct flights <code>flights[i] = [a, b]</code>. Return the route (list of airports) from <code>src</code> to <code>dst</code> that uses the <b>fewest flights</b>. If several routes tie, any one is fine. If <code>dst</code> is unreachable return an empty list.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>5</sup>, 0 ≤ flights.length ≤ 2·10<sup>5</sup>, 0 ≤ src, dst &lt; n`,
      example: `<p>n = 6, flights = [[0,1],[0,2],[1,3],[2,3],[3,4],[4,5]], src = 0, dst = 5 → <b>${H.c('g', '[0, 1, 3, 4, 5]')}</b> (4 flights). The route 0→2→3→4→5 also has 4 flights, so it is equally valid. No route with 3 flights exists because node 5 is only discovered in BFS round 4.</p>`,
      brute: { why: `<p>Try every simple path with DFS/backtracking and keep the shortest. The number of simple paths can be exponential (a grid-like airport network has millions of them), so this times out long before n = 10<sup>5</sup>.</p>`, code: `List<Integer> best = null;
void dfs(List<List<Integer>> g, int u, int dst, boolean[] onPath, Deque<Integer> path) {
    if (best != null && path.size() >= best.size()) return;      // prune: already longer
    if (u == dst) { best = new ArrayList<>(path); return; }
    for (int v : g.get(u)) {
        if (onPath[v]) continue;
        onPath[v] = true; path.addLast(v);
        dfs(g, v, dst, onPath, path);                               // explores EVERY simple path
        path.removeLast(); onPath[v] = false;
    }
}` },
      mcq: { q: 'You need the fewest flights where every flight "costs" the same. What do you reach for?', options: ['BFS with parent pointers', 'DFS and take the first path found', 'Dijkstra with a priority queue', 'Topological sort'], answer: 0, explain: 'Equal edge costs → BFS gives shortest distance in O(V + E); parents rebuild the route. Dijkstra also works but adds an unnecessary log factor; DFS does not give shortest paths.' },
      hints: [`<p>Hint 1: Every flight costs 1. The first time BFS reaches an airport, it has used the fewest flights possible.</p>`, `<p>Hint 2: Store <code>parent[v] = u</code> when v is first discovered. That one array lets you rebuild the route at the end.</p>`, `<p>Hint 3: Recipe: build adjacency list → BFS from src marking on push → if dist[dst] == -1 return [] → follow parent from dst back to src, then reverse. Edge case: src == dst → return [src].</p>`],
      solution: {
        approach: `<p>Plain BFS from <code>src</code> over the adjacency list, recording <code>parent</code> for every newly discovered airport. BFS discovers airports in order of flight count, so the parent chain from <code>dst</code> back to <code>src</code> is a fewest-flights route. Early-exit when <code>dst</code> is popped.</p>`,
        code: `class Solution {
    public List<Integer> fewestFlights(int n, int[][] flights, int src, int dst) {
        List<List<Integer>> g = new ArrayList<>();
        for (int i = 0; i < n; i++) g.add(new ArrayList<>());
        for (int[] f : flights) { g.get(f[0]).add(f[1]); g.get(f[1]).add(f[0]); }

        int[] parent = new int[n];
        Arrays.fill(parent, -2);                 // -2 = unvisited, -1 = "no parent" (the source)
        ArrayDeque<Integer> q = new ArrayDeque<>();
        parent[src] = -1;
        q.offer(src);
        while (!q.isEmpty()) {
            int u = q.poll();
            if (u == dst) break;                 // dst is final once popped
            for (int v : g.get(u)) {
                if (parent[v] != -2) continue;   // seen already
                parent[v] = u;                   // mark on push
                q.offer(v);
            }
        }
        if (parent[dst] == -2) return new ArrayList<>();
        LinkedList<Integer> route = new LinkedList<>();
        for (int x = dst; x != -1; x = parent[x]) route.addFirst(x);
        return route;
    }
}`,
        alt: [{ lang: 'python', code: `from collections import deque

def fewest_flights(n, flights, src, dst):
    g = [[] for _ in range(n)]
    for a, b in flights:
        g[a].append(b)
        g[b].append(a)
    parent = [-2] * n
    parent[src] = -1
    q = deque([src])
    while q:
        u = q.popleft()
        if u == dst:
            break
        for v in g[u]:
            if parent[v] == -2:
                parent[v] = u
                q.append(v)
    if parent[dst] == -2:
        return []
    route, x = [], dst
    while x != -1:
        route.append(x)
        x = parent[x]
    return route[::-1]

print(fewest_flights(6, [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [4, 5]], 0, 5))`, run: true }],
        dry: { head: ['pop', 'neighbours', 'newly set parent', 'queue'], rows: [['—', '—', 'parent[0] = -1', '[0]'], ['0', '1, 2', 'p[1]=0, p[2]=0', '[1, 2]'], ['1', '0, 3', 'p[3]=1', '[2, 3]'], ['2', '0, 3', '— (3 seen)', '[3]'], ['3', '1, 2, 4', 'p[4]=3', '[4]'], ['4', '3, 5', 'p[5]=4', '[5]'], ['5', '= dst, stop', 'route 5←4←3←1←0', H.c('g', '[0,1,3,4,5]')]] },
        complexity: `<p>Time O(V + E) — each airport is enqueued once, each flight list scanned once. Space O(V + E) for the graph plus O(V) for parent and queue.</p>`,
        followUps: ['Return ALL shortest routes (store a list of parents per node, then backtrack)', 'Flights have prices and you want the cheapest route → Dijkstra (Graphs II)', 'At most k stops with prices → Bellman-Ford style / BFS by levels (Graphs II)', 'Speed it up for a huge network: bidirectional BFS']
      }
    }]
  });

  // ================= TOPIC 3: multi-source BFS on grids =================
  topics.push({
    title: 'Multi-Source BFS on Grids: Rotting Oranges, Nearest Distance, Spreading Fire',
    analogy: `<p>Imagine a forest with <b>three fires</b> that start at the same moment. Every minute each fire spreads to the trees right next to it. If you want to know "when does this tree catch fire?", you do <b>not</b> simulate each fire separately — all fires spread <b>together</b>, and the tree burns when the <b>nearest</b> fire arrives.</p>
      <p>Multi-source BFS is exactly that: put <b>all</b> starting points in the queue at time 0 and let one combined ripple spread. It is like having several stones dropped into the pond at once.</p>`,
    explain: `<p><b>The trick in one line:</b> instead of running BFS from each source (slow), push <b>every source into the queue before you start</b>, all with distance 0. One BFS then gives each cell its distance to the <b>closest</b> source.</p>
      <p><b>Why it works:</b> pretend there is an invisible "super source" connected to every real source by a free edge. A normal BFS from the super source would first discover all the real sources (round 0) and then proceed as usual. Pre-loading the queue is that same BFS with the first round already done.</p>
      <p><b>Grid mechanics (memorise these 5 lines):</b></p>
      <ul>
        <li>Directions: <code>int[] dr = {-1,1,0,0}, dc = {0,0,-1,1};</code> (add 4 diagonals for 8-directional problems).</li>
        <li>Bounds check: <code>nr &gt;= 0 &amp;&amp; nr &lt; R &amp;&amp; nc &gt;= 0 &amp;&amp; nc &lt; C</code>.</li>
        <li>Visited: either a <code>boolean[R][C]</code> or <b>change the cell itself</b> (fresh → rotten) so it cannot be added twice.</li>
        <li>Queue entries: <code>int[]{r, c}</code> or the encoded number <code>r * C + c</code>.</li>
        <li>Rounds: process <code>q.size()</code> cells per minute, then <code>minutes++</code>.</li>
      </ul>
      <p><b>Rotting Oranges walk-through</b> (2 = rotten, 1 = fresh, 0 = empty):</p>
      ${H.table(['minute', 'grid', 'rotten this minute'], [['0', '2 1 1 / 1 1 0 / 0 1 1', '(0,0)'], ['1', '2 2 1 / 2 1 0 / 0 1 1', '(0,1), (1,0)'], ['2', '2 2 2 / 2 2 0 / 0 1 1', '(0,2), (1,1)'], ['3', '2 2 2 / 2 2 0 / 0 2 1', '(2,1)'], ['4', '2 2 2 / 2 2 0 / 0 2 2', H.c('g', '(2,2) → answer 4')]])}
      <p>Keep a <b>fresh counter</b>. Every time an orange rots, decrement it. When the BFS ends, if <code>fresh &gt; 0</code> some orange was walled off → return <b>-1</b>. If there were no fresh oranges at the start the answer is <b>0</b>.</p>
      <p><b>Same skeleton, different stories:</b> distance of each cell to the nearest 0 (01 Matrix), walls and gates (distance of each room to the nearest gate), "as far from land as possible" (BFS from all land cells, answer = the last level), fire spreading while a person escapes (two multi-source BFS runs and a comparison).</p>`,
    clues: [
      '"<b>minimum minutes / time until all</b> cells become X" with several starting cells → multi-source BFS, answer = number of levels',
      '"distance of every cell to the <b>nearest</b> 0 / gate / exit / land" → push all targets first, BFS once (not BFS per cell)',
      '"spreads to 4-directionally adjacent cells every minute" → grid BFS level counting',
      '"return -1 if impossible" → keep a counter of remaining targets and check it after BFS',
      'R, C ≤ 10<sup>3</sup> → R·C = 10<sup>6</sup> cells: one BFS O(R·C) is fine; one BFS per cell (10<sup>12</sup>) is not',
      '"maximize the distance to the nearest land" → multi-source BFS from all land, answer is the deepest level'
    ],
    code: [`
      // Rotting Oranges: multi-source BFS, level by level
      public int orangesRotting(int[][] grid) {
          int R = grid.length, C = grid[0].length, fresh = 0;
          ArrayDeque<int[]> q = new ArrayDeque<>();
          for (int r = 0; r < R; r++)
              for (int c = 0; c < C; c++) {
                  if (grid[r][c] == 2) q.offer(new int[]{r, c});   // EVERY source enters at time 0
                  else if (grid[r][c] == 1) fresh++;
              }
          int[] dr = {-1, 1, 0, 0}, dc = {0, 0, -1, 1};
          int minutes = 0;
          while (!q.isEmpty() && fresh > 0) {                      // stop as soon as nothing is fresh
              for (int k = q.size(); k > 0; k--) {                  // one minute = one level
                  int[] cell = q.poll();
                  for (int d = 0; d < 4; d++) {
                      int nr = cell[0] + dr[d], nc = cell[1] + dc[d];
                      if (nr < 0 || nc < 0 || nr >= R || nc >= C || grid[nr][nc] != 1) continue;
                      grid[nr][nc] = 2;                             // rot it now = mark visited on push
                      fresh--;
                      q.offer(new int[]{nr, nc});
                  }
              }
              minutes++;
          }
          return fresh == 0 ? minutes : -1;
      }`, `
      // 01 Matrix: distance from every cell to the nearest 0 (multi-source from all zeros)
      public int[][] updateMatrix(int[][] mat) {
          int R = mat.length, C = mat[0].length;
          int[][] dist = new int[R][C];
          ArrayDeque<Integer> q = new ArrayDeque<>();
          for (int r = 0; r < R; r++)
              for (int c = 0; c < C; c++) {
                  if (mat[r][c] == 0) q.offer(r * C + c);           // encode (r,c) as one int
                  else dist[r][c] = -1;                             // unknown
              }
          int[] dr = {-1, 1, 0, 0}, dc = {0, 0, -1, 1};
          while (!q.isEmpty()) {
              int cur = q.poll(), r = cur / C, c = cur % C;
              for (int d = 0; d < 4; d++) {
                  int nr = r + dr[d], nc = c + dc[d];
                  if (nr < 0 || nc < 0 || nr >= R || nc >= C || dist[nr][nc] != -1) continue;
                  dist[nr][nc] = dist[r][c] + 1;
                  q.offer(nr * C + nc);
              }
          }
          return dist;
      }`],
    codeTitle: ['Rotting Oranges (Java)', '01 Matrix — nearest zero (Java)'],
    viz: {
      title: 'Rotting oranges: every rotten orange spreads at the same time',
      input: '2 1 1 / 1 1 0 / 0 1 1',
      inputLabel: 'Grid rows separated by / (2 rotten, 1 fresh, 0 empty), max 7x7',
      gen: function (input) {
        var G = parseGrid(input, 7, 7, ['0', '1', '2'], 'the orange grid').map(function (r) { return r.map(Number); });
        var R = G.length, C = G[0].length, q = [], fresh = 0, frames = [], minute = 0;
        for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) { if (G[r][c] === 2) q.push([r, c]); else if (G[r][c] === 1) fresh++; }
        function shown(g) { return g.map(function (row) { return row.map(function (x) { return x === 2 ? '🟥2' : x === 1 ? '🟧1' : '·'; }); }); }
        function qItems() { return q.map(function (p) { return '(' + p[0] + ',' + p[1] + ')'; }); }
        var h0 = {}; q.forEach(function (p) { h0[rc(p[0], p[1])] = 'bad'; });
        frames.push({ narr: 'Scan the grid once: push <b>all ' + q.length + '</b> rotten orange(s) into the queue (they all start at minute 0) and count fresh oranges = <b>' + fresh + '</b>.', parts: [
          { type: 'grid', label: 'Grid at minute 0', rows: shown(G), hl: h0 },
          { type: 'queue', label: 'Queue (all sources together)', items: qItems(), hl: (function () { var o = {}; q.forEach(function (_, i) { o[i] = 'ok'; }); return o; })() },
          { type: 'vars', vals: { minute: 0, fresh: fresh }, hl: { fresh: 'cur' } }
        ] });
        if (fresh === 0) {
          frames.push({ narr: 'No fresh oranges at all → answer is <b>0</b> minutes (nothing has to rot).', parts: [{ type: 'vars', vals: { answer: 0 }, hl: { answer: 'sel' } }] });
          frames.push({ narr: 'Edge case handled before any BFS work. Try an input with some 1s to see the spreading.', parts: [{ type: 'grid', rows: shown(G) }] });
          frames.push({ narr: 'Example input: 2 1 1 / 1 1 0 / 0 1 1', parts: [{ type: 'text', html: 'Type a grid with fresh oranges (1) and press Load.' }] });
          return frames;
        }
        while (q.length && fresh > 0) {
          var size = q.length, newly = [], hl = {};
          for (var k = 0; k < size; k++) {
            var cell = q.shift();
            hl[rc(cell[0], cell[1])] = 'cur';
            for (var d = 0; d < 4; d++) {
              var nr = cell[0] + DR[d], nc = cell[1] + DC[d];
              if (nr < 0 || nc < 0 || nr >= R || nc >= C || G[nr][nc] !== 1) continue;
              G[nr][nc] = 2; fresh--; q.push([nr, nc]); newly.push('(' + nr + ',' + nc + ')'); hl[rc(nr, nc)] = 'ok';
            }
          }
          minute++;
          var qh = {}; q.forEach(function (_, i) { qh[i] = 'ok'; });
          frames.push({ narr: 'Minute <b>' + minute + '</b>: pop the ' + size + ' cell(s) of the previous level (amber). Their fresh neighbours rot now (green): ' + (newly.join(' ') || 'none') + '. Fresh left = <b>' + fresh + '</b>.', parts: [
            { type: 'grid', label: 'Grid after minute ' + minute, rows: shown(G), hl: hl },
            { type: 'queue', label: 'Queue = next level', items: qItems(), hl: qh },
            { type: 'vars', vals: { minute: minute, fresh: fresh, levelSize: size }, hl: { minute: 'ok' } }
          ] });
          if (frames.length > 50) break;
        }
        if (fresh > 0) {
          var bad = {};
          for (r = 0; r < R; r++) for (c = 0; c < C; c++) if (G[r][c] === 1) bad[rc(r, c)] = 'bad';
          frames.push({ narr: 'Queue is empty but <b>' + fresh + '</b> fresh orange(s) remain (red) — walls of empty cells block the rot. Answer <span class="c-r">-1</span>.', parts: [{ type: 'grid', label: 'Unreachable fresh oranges', rows: shown(G), hl: bad }, { type: 'vars', vals: { answer: -1 }, hl: { answer: 'bad' } }] });
        } else {
          frames.push({ narr: 'Fresh count hit 0 after minute <b>' + minute + '</b>. Each cell rotted at its distance to the <b>nearest</b> rotten source — one BFS did all sources at once. Answer = <b>' + minute + '</b>.', parts: [{ type: 'grid', label: 'All rotten', rows: shown(G) }, { type: 'vars', vals: { answer: minute }, hl: { answer: 'sel' } }] });
        }
        return frames;
      }
    },
    examples: [
      { title: 'Impossible case: a walled-off orange', html: `<p>Grid <code>2 1 1 / 0 1 1 / 1 0 1</code>: the orange at (2,0) has an empty cell above it and an empty cell to its right — no rotten orange can ever reach it. BFS ends with ${H.c('r', 'fresh = 1')} → return -1.</p>` },
      { title: 'Nothing to do', html: `<p>Grid <code>0 2</code>: zero fresh oranges at the start → return ${H.c('g', '0')}. Careful: the naive loop "minutes++ after every level" would return 1 here, because one level (the rotten orange) is processed. Stopping when <code>fresh == 0</code> (or returning <code>max(0, levels − 1)</code>) avoids it.</p>` },
      { title: '01 Matrix: distance to the nearest zero', html: `<p>Input <code>0 0 0 / 0 1 0 / 1 1 1</code>. All zeros start in the queue. Output:</p>${H.table(['', 'c0', 'c1', 'c2'], [['r0', '0', '0', '0'], ['r1', '0', H.c('g', '1'), '0'], ['r2', H.c('g', '1'), H.c('y', '2'), H.c('g', '1')]])}<p>Running BFS from each 1 separately costs O((R·C)²); one multi-source BFS costs O(R·C).</p>` },
      { title: 'Why not one BFS per source?', html: `<p>k rotten oranges, grid of N cells: separate BFS runs cost O(k·N) and you must take the min over runs. With N = 10<sup>6</sup> and k = 10<sup>5</sup> that is 10<sup>11</sup> steps. The combined BFS is O(N) because each cell is entered exactly once — by the closest source.</p>`, code: { lang: 'python', run: true, code: `from collections import deque

def rot(grid):
    R, C = len(grid), len(grid[0])
    q = deque((r, c) for r in range(R) for c in range(C) if grid[r][c] == 2)
    fresh = sum(row.count(1) for row in grid)
    minutes = 0
    while q and fresh:
        for _ in range(len(q)):
            r, c = q.popleft()
            for nr, nc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
                if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 1:
                    grid[nr][nc] = 2
                    fresh -= 1
                    q.append((nr, nc))
        minutes += 1
    return minutes if fresh == 0 else -1

print(rot([[2, 1, 1], [1, 1, 0], [0, 1, 1]]))   # 4
print(rot([[2, 1, 1], [0, 1, 1], [1, 0, 1]]))   # -1
print(rot([[0, 2]]))                            # 0` } }
    ],
    deepDive: `<p><b>Correctness:</b> adding a virtual source s* with zero-cost edges to every real source gives an ordinary single-source BFS; the pre-loaded queue is exactly the state after s* is popped. So the BFS invariant holds and every cell gets <code>min over sources of dist(source, cell)</code>.</p>
      <p><b>Mutating the input vs a visited array:</b> overwriting <code>grid</code> saves memory and is accepted on LeetCode, but in production code and in many interviews you should ask first — callers rarely expect their data to change. A separate <code>boolean[][]</code> (or a <code>BitSet</code> of R·C bits) is the safe default.</p>
      <p><b>Performance on big grids:</b> <code>new int[]{r,c}</code> allocates one object per cell; for 10<sup>6</sup> cells that is ~24 MB of garbage. Encode as <code>r * C + c</code> in a primitive <code>int[]</code> ring buffer instead — usually 2–4× faster. Watch overflow if R·C could exceed 2<sup>31</sup>.</p>
      <p><b>Variants to recognise:</b> (1) <i>8-directional</i> movement (Shortest Path in Binary Matrix) — just 8 direction pairs; (2) <i>two competing spreads</i> (fire vs person: BFS the fire first to get fire-arrival times, then BFS the person and only enter cells strictly before the fire arrives); (3) <i>"farthest from all land"</i> — the answer is the last BFS level; (4) <i>multi-source with labels</i> (which source owns each cell — Voronoi regions) — carry the source id in the queue. (5) Weighted spread (cells take different times) → multi-source Dijkstra.</p>
      <p><b>Early stop:</b> checking <code>fresh &gt; 0</code> in the loop avoids an extra empty level and gives the right answer for both "nothing fresh" and "last level just finished".</p>`,
    aiEra: `<p><b>What AI changes:</b> "Rotting Oranges" is so famous that any model will recite it. Interviewers therefore twist it: "the rot takes 2 minutes through some cells", "an orange becomes rotten only if two neighbours are rotten", or "print the grid at each minute for a simulation dashboard". You must understand <i>why</i> multi-source BFS works to adapt it.</p>
      <p><b>Use AI as a partner:</b> ask it to generate random grids and compare your multi-source BFS with a slow "simulate minute by minute until nothing changes" oracle — a classic property-based test. In real products the same pattern powers "nearest store to every map tile", heat-map distance fields in games, and robot path-planning cost maps; AI tools are good at wiring the BFS into those pipelines.</p>
      <p><b>Where AI goes wrong:</b> returns 1 instead of 0 when there are no fresh oranges, runs BFS from each source separately, counts minutes per popped cell instead of per level, or forgets the -1 check. <b>What you must still own:</b> the super-source argument, the level-counting off-by-one, and choosing when mutation of the input is acceptable.</p>`,
    problems: [{
      title: 'Rotting Oranges', level: 'Medium', tags: ['multi-source bfs', 'grid'], companies: ['Amazon', 'Microsoft', 'Google', 'Meta'],
      statement: `<p>In an R×C grid each cell is 0 (empty), 1 (fresh orange) or 2 (rotten orange). Every minute, any fresh orange 4-directionally adjacent to a rotten orange becomes rotten. Return the minimum number of minutes until no fresh orange remains, or -1 if that is impossible.</p>`,
      constraints: `1 ≤ R, C ≤ 10 (LeetCode) — design for R, C ≤ 1000`,
      example: `<p>grid = [[2,1,1],[1,1,0],[0,1,1]] → <b>${H.c('g', '4')}</b>. The last orange to rot is (2,2). The empty cell at (1,2) blocks the short way down the right side, so the rot must travel (0,0)→(0,1)→(1,1)→(2,1)→(2,2): 4 steps, so 4 minutes.</p>`,
      brute: { why: `<p>Simulate minute by minute: copy the grid, rot every fresh orange next to a rotten one, repeat until nothing changes. Each minute scans all R·C cells and there can be up to R·C minutes → O((R·C)²) = 10<sup>12</sup> for 1000×1000.</p>`, code: `int rotBrute(int[][] grid) {
    int R = grid.length, C = grid[0].length, minutes = 0;
    while (true) {
        int[][] next = new int[R][];
        for (int r = 0; r < R; r++) next[r] = grid[r].clone();
        boolean changed = false;
        for (int r = 0; r < R; r++)
            for (int c = 0; c < C; c++) {
                if (grid[r][c] != 1) continue;
                boolean nearRotten = (r > 0 && grid[r - 1][c] == 2) || (r + 1 < R && grid[r + 1][c] == 2)
                        || (c > 0 && grid[r][c - 1] == 2) || (c + 1 < C && grid[r][c + 1] == 2);
                if (nearRotten) { next[r][c] = 2; changed = true; }
            }
        if (!changed) break;
        grid = next; minutes++;
    }
    for (int[] row : grid) for (int x : row) if (x == 1) return -1;
    return minutes;
}` },
      mcq: { q: 'There are 3 rotten oranges. How should the BFS start?', options: ['Push all 3 into the queue before the loop (distance 0)', 'Run 3 separate BFS and take the max', 'Start from the top-left rotten orange only', 'Use DFS from each rotten orange'], answer: 0, explain: 'All sources spread simultaneously; pre-loading them all is a BFS from a virtual super-source, giving each cell its distance to the nearest rotten orange in one O(R·C) pass.' },
      hints: [`<p>Hint 1: The time a fresh orange rots = its BFS distance from the <b>nearest</b> rotten orange. The answer is the largest such distance.</p>`, `<p>Hint 2: Queue all rotten cells first; process the queue level by level, one level per minute. Count fresh oranges up front.</p>`, `<p>Hint 3: Recipe: fresh = count of 1s; queue = all 2s; while queue not empty and fresh &gt; 0 → pop one level, rot neighbours (set to 2, fresh--, push), minutes++. Return fresh == 0 ? minutes : -1. Edge: no fresh → 0.</p>`],
      solution: {
        approach: `<p>Multi-source BFS. All rotten oranges are sources at minute 0. Each BFS level is one minute. Rot (and mark) a neighbour the moment it is pushed so it can never be pushed twice. A remaining fresh count after BFS means some orange is unreachable.</p>`,
        code: `class Solution {
    public int orangesRotting(int[][] grid) {
        int R = grid.length, C = grid[0].length, fresh = 0;
        ArrayDeque<int[]> q = new ArrayDeque<>();
        for (int r = 0; r < R; r++)
            for (int c = 0; c < C; c++) {
                if (grid[r][c] == 2) q.offer(new int[]{r, c});
                else if (grid[r][c] == 1) fresh++;
            }
        int[] dr = {-1, 1, 0, 0}, dc = {0, 0, -1, 1};
        int minutes = 0;
        while (!q.isEmpty() && fresh > 0) {
            for (int k = q.size(); k > 0; k--) {
                int[] cur = q.poll();
                for (int d = 0; d < 4; d++) {
                    int nr = cur[0] + dr[d], nc = cur[1] + dc[d];
                    if (nr < 0 || nc < 0 || nr >= R || nc >= C || grid[nr][nc] != 1) continue;
                    grid[nr][nc] = 2;
                    fresh--;
                    q.offer(new int[]{nr, nc});
                }
            }
            minutes++;
        }
        return fresh == 0 ? minutes : -1;
    }
}`,
        dry: { head: ['minute', 'level popped', 'newly rotten', 'fresh left'], rows: [['0', '—', 'sources: (0,0)', '6'], ['1', '(0,0)', '(1,0), (0,1)', '4'], ['2', '(1,0), (0,1)', '(1,1), (0,2)', '2'], ['3', '(1,1), (0,2)', '(2,1)', '1'], ['4', '(2,1)', '(2,2)', H.c('g', '0 → return 4')]] },
        complexity: `<p>Time O(R·C) — each cell is pushed at most once and checks 4 neighbours. Space O(R·C) for the queue in the worst case.</p>`,
        followUps: ['Return the grid snapshot at minute k', 'Some cells are "slow" and take 2 minutes to rot through (0-1 BFS / Dijkstra)', 'Oranges rot only if at least two neighbours are rotten (BFS with counters, like Kahn)']
      }
    }]
  });

  // ================= TOPIC 4: DFS, connected components, islands =================
  topics.push({
    title: 'DFS: Going Deep, Connected Components & Number of Islands',
    analogy: `<p>You are exploring a <b>maze</b> with a piece of chalk. At every junction you pick a corridor you have not chalked yet and keep walking <b>as deep as you can</b>. When you hit a dead end you <b>walk back</b> to the last junction that still has an unchalked corridor. That is <b>Depth-First Search (DFS)</b>: go deep first, back up only when stuck.</p>
      <p>Counting <b>islands</b> on a map is the same game: walk onto an unexplored piece of land, paint everything you can reach on foot, and count how many times you had to "start a fresh walk".</p>`,
    explain: `<p><b>DFS in plain words:</b> visit a node, mark it, then for each unvisited neighbour, visit <i>that</i> neighbour completely before trying the next one. The "go back" memory is a <b>stack</b> — either the program's call stack (recursion) or your own <code>ArrayDeque</code> used as a stack.</p>
      <p><b>BFS vs DFS at a glance:</b></p>
      ${H.table(['', 'BFS', 'DFS'], [['Data structure', 'Queue (FIFO)', 'Stack / recursion (LIFO)'], ['Order', 'ring by ring', 'one branch to the bottom first'], ['Shortest path (unweighted)', H.c('g', 'yes'), H.c('r', 'no')], ['Natural for', 'distances, levels', 'components, cycles, topo order, backtracking, "explore everything"'], ['Cost', 'O(V + E)', 'O(V + E)']])}
      <p><b>Connected components:</b> loop over every node; if it is not visited yet, that is a <b>new component</b> → <code>count++</code> and run DFS from it to mark its whole component. Because each node is marked exactly once, the loop + all DFS calls together are still O(V + E).</p>
      <p><b>Number of Islands = components on a grid.</b> Land cells are nodes; up/down/left/right land neighbours are edges. Scan every cell; when you see unvisited land, <code>islands++</code> and <b>flood-fill</b> (DFS) to sink the whole island so you never count it again.</p>
      ${H.table(['grid', 'scan finds', 'action'], [['1 1 0 0', '(0,0) land', 'island #1, flood (0,0),(0,1),(1,0),(1,1)'], ['1 1 0 0', '(1,0) already sunk', 'skip'], ['0 0 1 0', '(2,2) land', 'island #2, flood (2,2)'], ['0 0 0 1', '(3,3) land', H.c('g', 'island #3')]])}
      <p><b>Recursive vs iterative:</b> recursion is shortest to write, but Java's default thread stack handles only a few thousand to ~10<sup>4</sup> nested calls. A 1000×1000 grid that is all land can need 10<sup>6</sup> nested calls → <code>StackOverflowError</code>. The fix: an explicit stack (iterative DFS), or BFS — for "mark the whole component" any traversal works.</p>
      <p><b>Iterative DFS pattern:</b> push start; while stack not empty: pop, and for each unvisited neighbour mark + push. (This visits in a slightly different order than recursion, which is fine for components; when you need true pre/post-order — like topological sort — keep an iterator index per node.)</p>`,
    clues: [
      '"<b>number of islands / provinces / groups / connected components</b>" → loop + DFS (or BFS, or DSU)',
      '"flood fill", "paint bucket", "capture regions", "all cells reachable from…" → DFS/BFS from the start cell',
      '"size of the largest island / area" → DFS returns a count',
      '"can you reach X from Y?" (yes/no, not distance) → any traversal; DFS is the shortest to code',
      '"enumerate all paths / all solutions" → DFS with backtracking (un-mark on the way back)',
      'grid up to 1000×1000 all land → recursion depth 10<sup>6</sup>: use an explicit stack or BFS in Java'
    ],
    code: [`
      // Connected components with recursive DFS
      static void dfs(List<List<Integer>> g, int u, boolean[] seen) {
          seen[u] = true;                       // chalk the corridor
          for (int v : g.get(u))
              if (!seen[v]) dfs(g, v, seen);    // go deep before trying the next neighbour
      }
      static int countComponents(int n, int[][] edges) {
          List<List<Integer>> g = new ArrayList<>();
          for (int i = 0; i < n; i++) g.add(new ArrayList<>());
          for (int[] e : edges) { g.get(e[0]).add(e[1]); g.get(e[1]).add(e[0]); }
          boolean[] seen = new boolean[n];
          int comps = 0;
          for (int i = 0; i < n; i++)
              if (!seen[i]) { comps++; dfs(g, i, seen); }   // every fresh start = new component
          return comps;
      }`, `
      // Number of Islands with an explicit stack (no StackOverflowError on huge grids)
      public int numIslands(char[][] grid) {
          int R = grid.length, C = grid[0].length, islands = 0;
          int[] dr = {-1, 1, 0, 0}, dc = {0, 0, -1, 1};
          ArrayDeque<Integer> st = new ArrayDeque<>();
          for (int r = 0; r < R; r++)
              for (int c = 0; c < C; c++) {
                  if (grid[r][c] != '1') continue;
                  islands++;                                   // fresh land = new island
                  grid[r][c] = '0';                            // sink on push
                  st.push(r * C + c);
                  while (!st.isEmpty()) {
                      int cur = st.pop(), cr = cur / C, cc = cur % C;
                      for (int d = 0; d < 4; d++) {
                          int nr = cr + dr[d], nc = cc + dc[d];
                          if (nr < 0 || nc < 0 || nr >= R || nc >= C || grid[nr][nc] != '1') continue;
                          grid[nr][nc] = '0';
                          st.push(nr * C + nc);
                      }
                  }
              }
          return islands;
      }`],
    codeTitle: ['Connected components — recursive DFS (Java)', 'Number of Islands — iterative DFS (Java)'],
    viz: [{
      title: 'DFS on a graph: the recursion stack and component colouring',
      input: '0-1 0-2 1-3 2-3 4-5 6-6',
      inputLabel: 'Undirected edges u-v (nodes 0..9); 6-6 just creates a lonely node 6',
      gen: function (input) {
        var G = parseEdges(input, 10), n = G.n, g = adjOf(n, G.edges, false), seen = new Array(n).fill(false), comp = new Array(n).fill(-1), frames = [], stack = [], tree = {}, comps = 0;
        var edges = G.edges.filter(function (e) { return e[0] !== e[1]; });
        function show(narr, cur, extra) {
          var h = {}, tags = {};
          for (var i = 0; i < n; i++) if (seen[i]) { h[i] = 'done'; tags[i] = 'C' + comp[i]; }
          stack.forEach(function (x) { h[x] = 'win'; });
          if (cur !== undefined) h[cur] = 'cur';
          if (extra) for (var k in extra) h[k] = extra[k];
          frames.push({ narr: narr, parts: [
            gpart('Graph (amber = current, blue = on recursion stack, faded = finished, tag = component)', n, edges, false, h, tree, tags),
            { type: 'stack', label: 'Recursion (call) stack', items: stack.map(function (x) { return 'dfs(' + x + ')'; }), hl: one(stack.length - 1, 'cur') },
            { type: 'vars', vals: { components: comps }, hl: {} }
          ] });
        }
        function dfs(u, p) {
          seen[u] = true; comp[u] = comps; stack.push(u);
          show('Enter <b>dfs(' + u + ')</b>' + (p >= 0 ? ' from ' + p : '') + ': mark it visited and push it on the call stack. Neighbours: [' + g[u].join(', ') + '].', u);
          g[u].forEach(function (v) {
            if (v === u) return;
            if (!seen[v]) { tree[ek(u, v)] = 'sel'; dfs(v, u); show('Back in <b>dfs(' + u + ')</b> after finishing ' + v + '. Try the next neighbour.', u); }
            else if (frames.length < 60) show('Neighbour ' + v + ' of ' + u + ' is already visited → skip it (no second visit).', u, one(v, 'bad'));
          });
          stack.pop();
          show('<b>dfs(' + u + ')</b> has no unvisited neighbours left → it returns (popped from the stack). This is the "walk back" step.', undefined, one(u, 'ok'));
        }
        for (var s = 0; s < n && frames.length < 70; s++) {
          if (seen[s]) continue;
          comps++;
          show('Outer loop: node <b>' + s + '</b> is unvisited → start component <b>#' + comps + '</b>.', undefined, one(s, 'sel'));
          dfs(s, -1);
        }
        show('Done. <b>' + comps + '</b> connected component(s). Purple edges form the DFS tree (forest); every node and every edge was touched once → O(V + E).');
        return frames;
      }
    }, {
      title: 'Number of Islands: scan + flood fill with an explicit stack',
      input: '1 1 0 0 0 / 1 1 0 1 0 / 0 0 1 0 0 / 0 0 0 1 1',
      inputLabel: 'Grid rows separated by / (1 land, 0 water), max 7x8',
      gen: function (input) {
        var G = parseGrid(input, 7, 8, ['0', '1'], 'the island grid'), R = G.length, C = G[0].length, frames = [], islands = 0, owner = {};
        function view() { return G.map(function (row, r) { return row.map(function (x, c) { return owner[rc(r, c)] ? '#' + owner[rc(r, c)] : (x === '1' ? '1' : '·'); }); }); }
        frames.push({ narr: 'Scan cells row by row. Each <b>unvisited land</b> cell starts a new island; a flood fill then "sinks" the whole island so it is not counted twice.', parts: [{ type: 'grid', label: 'Grid', rows: view() }, { type: 'stack', label: 'DFS stack', items: [] }, { type: 'vars', vals: { islands: 0 } }] });
        for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
          if (G[r][c] !== '1' || owner[rc(r, c)]) continue;
          islands++;
          var st = [[r, c]]; owner[rc(r, c)] = islands;
          frames.push({ narr: 'Scan hits land at (' + r + ',' + c + ') that no island owns → <b>island #' + islands + '</b>. Mark it and push it on the stack.', parts: [{ type: 'grid', label: 'Grid', rows: view(), hl: one(rc(r, c), 'sel') }, { type: 'stack', label: 'DFS stack', items: st.map(function (p) { return '(' + p[0] + ',' + p[1] + ')'; }), hl: one(0, 'ok') }, { type: 'vars', vals: { islands: islands }, hl: { islands: 'ok' } }] });
          while (st.length) {
            var cur = st.pop(), hl = {}, added = [];
            hl[rc(cur[0], cur[1])] = 'cur';
            for (var d = 0; d < 4; d++) {
              var nr = cur[0] + DR[d], nc = cur[1] + DC[d];
              if (nr < 0 || nc < 0 || nr >= R || nc >= C || G[nr][nc] !== '1' || owner[rc(nr, nc)]) continue;
              owner[rc(nr, nc)] = islands; st.push([nr, nc]); hl[rc(nr, nc)] = 'ok'; added.push('(' + nr + ',' + nc + ')');
            }
            if (frames.length < 60) frames.push({ narr: 'Pop (' + cur[0] + ',' + cur[1] + '). Land neighbours not yet owned: ' + (added.join(' ') || 'none') + (added.length ? ' → mark as island #' + islands + ' and push (mark on push, so nothing is pushed twice).' : ' → nothing new; the stack shrinks.'), parts: [{ type: 'grid', label: 'Grid', rows: view(), hl: hl }, { type: 'stack', label: 'DFS stack (top = next to explore)', items: st.map(function (p) { return '(' + p[0] + ',' + p[1] + ')'; }), hl: one(st.length - 1, 'cur') }, { type: 'vars', vals: { islands: islands } }] });
          }
        }
        frames.push({ narr: 'Scan finished: <b>' + islands + '</b> island(s). Diagonal neighbours do not join islands (only 4 directions). Total work O(R·C).', parts: [{ type: 'grid', label: 'Each land cell tagged with its island number', rows: view() }, { type: 'vars', vals: { answer: islands }, hl: { answer: 'sel' } }] });
        if (frames.length < 4) frames.push({ narr: 'Tip: add some 1s to see the flood fill.', parts: [{ type: 'text', html: 'Example: 1 1 0 / 0 1 0 / 0 0 1' }] });
        while (frames.length < 4) frames.push({ narr: 'No land at all → 0 islands.', parts: [{ type: 'vars', vals: { answer: 0 } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Count components in an edge list', html: `<p>n = 6, edges = [0–1, 1–2, 3–4]. Outer loop: 0 is new → component 1 (marks 0,1,2). 3 is new → component 2 (marks 3,4). 5 is new → component 3 (isolated node). Answer ${H.c('g', '3')}. Forgetting isolated nodes (they appear in no edge) is the most common bug.</p>` },
      { title: 'Max area of an island', html: `<p>Make the DFS <b>return</b> how many cells it sank: <code>area = 1 + sum of dfs(neighbours)</code>. Keep the maximum over all starts. Same O(R·C).</p>`, code: `int area(int[][] g, int r, int c) {
    if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] != 1) return 0;
    g[r][c] = 0;                                     // sink so we never count it again
    return 1 + area(g, r + 1, c) + area(g, r - 1, c) + area(g, r, c + 1) + area(g, r, c - 1);
}` },
      { title: 'Reachability: can we get from A to B?', html: `<p>Yes/no reachability does not need shortest distances, so DFS is the simplest choice: <code>dfs(A)</code>, then check <code>seen[B]</code>. For many queries on a static graph, label components once (O(V + E)) and answer each query in O(1) with <code>comp[A] == comp[B]</code>.</p>` },
      { title: 'Recursion depth disaster', html: `<p>A path graph 0–1–2–…–99 999 and recursive DFS from 0: the call stack grows to 10<sup>5</sup> frames → ${H.c('r', 'StackOverflowError')} with Java's default stack. Fixes: iterative DFS with <code>ArrayDeque</code>, BFS, or run the work in <code>new Thread(null, task, "dfs", 1 &lt;&lt; 26)</code> with a bigger stack (contest trick).</p>`, code: { lang: 'python', run: true, code: `import sys
# Python's default recursion limit is ~1000, so deep graphs need an explicit stack too
def components(n, edges):
    g = [[] for _ in range(n)]
    for u, v in edges:
        g[u].append(v)
        g[v].append(u)
    seen, comps = [False] * n, 0
    for s in range(n):
        if seen[s]:
            continue
        comps += 1
        seen[s] = True
        stack = [s]
        while stack:
            u = stack.pop()
            for v in g[u]:
                if not seen[v]:
                    seen[v] = True
                    stack.append(v)
    return comps

chain = [[i, i + 1] for i in range(99_999)]         # a 100 000-node path
print("components:", components(100_000, chain))     # 1, no recursion error
print("recursion limit was:", sys.getrecursionlimit())` } }
    ],
    deepDive: `<p><b>Discovery and finish times:</b> recording <code>tin[u]</code> when DFS enters u and <code>tout[u]</code> when it leaves gives the <i>parenthesis property</i>: intervals of two nodes are either nested (one is an ancestor of the other in the DFS tree) or disjoint. This powers ancestor checks in O(1), Euler tours for subtree queries, and the classification of edges.</p>
      <p><b>Edge classification</b> (directed DFS): <i>tree</i> edges (to an unvisited node), <i>back</i> edges (to an ancestor still on the stack → a cycle!), <i>forward</i> edges (to an already-finished descendant), <i>cross</i> edges (to a finished node in another branch). In undirected DFS only tree and back edges exist. The next topic is built entirely on "back edge = cycle".</p>
      <p><b>Iterative DFS that matches recursion exactly:</b> push <code>(node, nextNeighbourIndex)</code> frames; on each step look at the top frame, advance its index, and push the child. Only then can you get correct post-order (needed for topological sort, Tarjan/Kosaraju SCC and articulation points).</p>
      <p><b>Grid flood fill tricks:</b> sinking cells in place (<code>'1' → '0'</code>) avoids a visited array; "<i>closed islands</i>" and "<i>surrounded regions</i>" are solved by first flood-filling everything connected to the <b>border</b>, then handling what remains. Counting <b>distinct island shapes</b> means recording the DFS move sequence (with backtrack markers) as a canonical string.</p>
      <p><b>Components at scale:</b> for billions of edges (social graphs) a single-machine DFS does not fit; systems use label propagation or union-find in MapReduce/Pregel-style rounds. For online edge insertions DSU (topic 8) beats re-running DFS.</p>`,
    aiEra: `<p><b>What AI changes:</b> Number of Islands is the "hello world" of graph interviews, and AI writes it perfectly. Interviewers now add twists: count islands after each land addition (DSU), distinct shapes, islands on a torus (wrap-around), or a 50 000 × 50 000 image streamed row by row (only two rows fit in memory → row-by-row DSU).</p>
      <p><b>Use AI as a partner:</b> have it write a brute-force oracle (BFS-based count) and a random grid generator, then fuzz your DFS against it. Ask <code>What is the maximum recursion depth of this DFS on a 1000x1000 all-land grid, and how do I avoid StackOverflowError in Java?</code> — then verify by actually running it.</p>
      <p><b>Where AI goes wrong:</b> recursive DFS on huge inputs (stack overflow in Java/Python), counting diagonal neighbours when the problem says 4-directional, forgetting isolated nodes when counting components, and mutating the caller's grid without asking. <b>What you must still own:</b> choosing DFS vs BFS vs DSU for the follow-up, reasoning about recursion depth, and the O(V + E) argument.</p>`,
    problems: [{
      title: 'Number of Islands', level: 'Medium', tags: ['dfs', 'bfs', 'grid', 'connected components'], companies: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Bloomberg'],
      statement: `<p>Given an R×C grid of '1' (land) and '0' (water), return the number of islands. An island is a group of land cells connected horizontally or vertically, surrounded by water. Assume everything outside the grid is water.</p>`,
      constraints: `1 ≤ R, C ≤ 300 (design for 1000×1000)`,
      example: `<p>grid = ["11000","11000","00100","00011"] → <b>${H.c('g', '3')}</b>: the 2×2 block top-left, the single cell (2,2), and the pair (3,3),(3,4). (2,2) touches (3,3) only diagonally, which does not count.</p>`,
      brute: { why: `<p>For every pair of land cells, run a BFS to see if they are connected, then group them (like building components by pairwise checks). That is O((R·C)²) BFS work → hopeless for 10<sup>5</sup> cells. The waste: we rediscover the same island again and again.</p>`, code: `int islandsBrute(char[][] g) {
    int R = g.length, C = g[0].length;
    List<int[]> land = new ArrayList<>();
    for (int r = 0; r < R; r++) for (int c = 0; c < C; c++) if (g[r][c] == '1') land.add(new int[]{r, c});
    int[] label = new int[land.size()];
    Arrays.fill(label, -1);
    int count = 0;
    for (int i = 0; i < land.size(); i++) {
        if (label[i] != -1) continue;
        label[i] = count;
        for (int j = i + 1; j < land.size(); j++)                 // pairwise reachability check
            if (label[j] == -1 && reach(g, land.get(i), land.get(j))) label[j] = count;
        count++;
    }
    return count;
}
boolean reach(char[][] g, int[] a, int[] b) {                     // fresh BFS for every pair
    int R = g.length, C = g[0].length;
    boolean[][] seen = new boolean[R][C];
    ArrayDeque<int[]> q = new ArrayDeque<>();
    q.add(a); seen[a[0]][a[1]] = true;
    int[] dr = {-1, 1, 0, 0}, dc = {0, 0, -1, 1};
    while (!q.isEmpty()) {
        int[] p = q.poll();
        if (p[0] == b[0] && p[1] == b[1]) return true;
        for (int d = 0; d < 4; d++) {
            int nr = p[0] + dr[d], nc = p[1] + dc[d];
            if (nr >= 0 && nc >= 0 && nr < R && nc < C && !seen[nr][nc] && g[nr][nc] == '1') { seen[nr][nc] = true; q.add(new int[]{nr, nc}); }
        }
    }
    return false;
}` },
      mcq: { q: 'You found an unvisited land cell during the scan. What next?', options: ['islands++ and flood-fill (DFS/BFS) the whole island, marking it', 'islands++ and move on to the next cell', 'Check only its 4 neighbours', 'Sort the land cells by row'], answer: 0, explain: 'Without marking the whole island, its other cells would each be counted as new islands. Flood fill = mark the full component once.' },
      hints: [`<p>Hint 1: An island is a connected component of land cells. Counting islands = counting how many times you must start a new traversal.</p>`, `<p>Hint 2: Scan every cell; on unvisited land, increment the count and DFS/BFS to mark (or sink to '0') all land reachable from it.</p>`, `<p>Hint 3: Recipe: for r, c: if grid[r][c]=='1': count++, sink(r,c). sink: bounds check, return if not '1', set '0', recurse 4 directions. For 1000×1000 use an explicit stack/queue to avoid StackOverflowError.</p>`],
      solution: {
        approach: `<p>Linear scan + flood fill. Each land cell is sunk exactly once, either by the scan that discovers its island or by the flood fill. The number of flood fills started equals the number of islands.</p>`,
        code: `class Solution {
    public int numIslands(char[][] grid) {
        int count = 0;
        for (int r = 0; r < grid.length; r++)
            for (int c = 0; c < grid[0].length; c++)
                if (grid[r][c] == '1') { count++; sink(grid, r, c); }
        return count;
    }
    private void sink(char[][] g, int r, int c) {
        if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] != '1') return;
        g[r][c] = '0';                       // mark before recursing → never visited twice
        sink(g, r + 1, c);
        sink(g, r - 1, c);
        sink(g, r, c + 1);
        sink(g, r, c - 1);
    }
}`,
        alt: [{ lang: 'python', code: `def num_islands(grid):
    R, C = len(grid), len(grid[0])
    count = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] != "1":
                continue
            count += 1
            grid[r][c] = "0"
            stack = [(r, c)]
            while stack:                      # iterative: no recursion limit issues
                cr, cc = stack.pop()
                for nr, nc in ((cr + 1, cc), (cr - 1, cc), (cr, cc + 1), (cr, cc - 1)):
                    if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == "1":
                        grid[nr][nc] = "0"
                        stack.append((nr, nc))
    return count

g = [list("11000"), list("11000"), list("00100"), list("00011")]
print(num_islands(g))  # 3`, run: true }],
        dry: { head: ['scan cell', 'value', 'action', 'count'], rows: [['(0,0)', '1', 'new island, sink (0,0),(1,0),(0,1),(1,1)', '1'], ['(0,1)', '0 (sunk)', 'skip', '1'], ['(2,2)', '1', 'new island, sink (2,2)', '2'], ['(3,3)', '1', 'new island, sink (3,3),(3,4)', H.c('g', '3')]] },
        complexity: `<p>Time O(R·C) — each cell is visited by the scan once and sunk at most once. Space O(R·C) worst case for recursion/stack (all land).</p>`,
        followUps: ['Land is added one cell at a time; report islands after each addition (Number of Islands II → DSU)', 'Count distinct island shapes (canonical DFS path strings)', 'Max area of an island', 'Grid is too big for memory; process row by row']
      }
    }]
  });

  // ================= TOPIC 5: cycle detection =================
  topics.push({
    title: 'Cycle Detection: Undirected (parent check) and Directed (three colours)',
    analogy: `<p><b>Two-way streets (undirected):</b> you walk around your neighbourhood, chalking every corner. If you ever arrive at a corner that is already chalked — and you did not just come from it — you have walked around a <b>loop</b>. (Arriving back at the corner you just left is not a loop; it is just the same street in reverse.)</p>
      <p><b>One-way streets (directed):</b> chalk is not enough. Seeing a corner you visited <i>yesterday on a different trip</i> means nothing. You only have a loop if you reach a corner that is part of <b>today's current trip</b> — the breadcrumbs you are still standing on. So we use three colours: <b>white</b> = never visited, <b>grey</b> = on the current trip (breadcrumbs), <b>black</b> = fully explored, safe.</p>`,
    explain: `<p><b>Undirected graph — DFS with parent:</b> run DFS; for each neighbour v of u:</p>
      <ul><li>v unvisited → recurse with parent = u.</li><li>v visited and v ≠ parent → <b>cycle</b> (we found another way back to an already-visited node).</li><li>v == parent → ignore (that is just the edge we came down).</li></ul>
      <p>Run it from every unvisited node (the graph may have many components). <b>Shortcut:</b> a forest with V nodes and c components has exactly V − c edges. So a simple undirected graph with <b>E ≥ V</b> must contain a cycle. Another way: <b>DSU</b> — for each edge, if both ends already have the same leader, this edge closes a cycle (topic 8).</p>
      <p><b>Why "visited" alone fails for directed graphs</b> — the diamond:</p>
      ${H.table(['Edges', 'DFS from 0', 'Plain visited says', 'Truth'], [['0→1, 0→2, 1→3, 2→3', '0,1,3 then 2 sees 3 visited', H.c('r', 'cycle!'), H.c('g', 'no cycle (3 is a shared descendant)')]])}
      <p><b>Directed graph — three colours:</b></p>
      <ol><li>On entering u: colour it <b>grey</b> (on the current path).</li>
        <li>For each neighbour v: if v is <b>grey</b> → we found an arrow back into our own current path → <b>cycle</b> (a back edge). If v is <b>white</b> → recurse. If v is <b>black</b> → already proven safe, skip.</li>
        <li>On leaving u: colour it <b>black</b>.</li></ol>
      ${H.table(['state', 'meaning', 'seeing it again means'], [['0 white', 'not visited', 'explore it'], ['1 grey', 'on the current recursion stack', H.c('r', 'cycle')], ['2 black', 'finished, no cycle through it', 'skip']])}
      <p><b>BFS alternative for directed graphs:</b> Kahn's algorithm (topic 7). If the topological order contains fewer than V nodes, the leftovers sit on or behind a cycle.</p>
      <p>All methods are <b>O(V + E)</b>.</p>`,
    clues: [
      '"<b>Can you finish all courses?</b>" / "is there a circular dependency / deadlock?" → directed cycle detection (3 colours or Kahn)',
      '"<b>is this graph a valid tree?</b>" → connected AND no cycle (equivalently E = V − 1 and connected)',
      '"redundant connection", "which edge creates a loop" → undirected cycle via DSU or DFS',
      '"prerequisites", "imports", "build targets", "spreadsheet cells referencing each other" → directed graph, look for back edges',
      '"eventual safe states" / "nodes that never reach a cycle" → black nodes of the 3-colour DFS',
      'Undirected + E ≥ V (no multi-edges) → a cycle is guaranteed, no traversal needed'
    ],
    code: [`
      // Undirected: DFS with parent (iterative-safe version would carry parent in the stack)
      static boolean hasCycleUndirected(int n, List<List<Integer>> g) {
          boolean[] seen = new boolean[n];
          for (int s = 0; s < n; s++)
              if (!seen[s] && dfsU(g, s, -1, seen)) return true;   // check every component
          return false;
      }
      static boolean dfsU(List<List<Integer>> g, int u, int parent, boolean[] seen) {
          seen[u] = true;
          for (int v : g.get(u)) {
              if (v == parent) continue;            // the edge we came down — not a loop
              if (seen[v]) return true;             // another way back → cycle
              if (dfsU(g, v, u, seen)) return true;
          }
          return false;
      }
      // Note: with parallel edges (u-v twice) skip the parent EDGE id, not the parent node.`, `
      // Directed: white(0) / grey(1) / black(2)
      static boolean hasCycleDirected(int n, List<List<Integer>> g) {
          int[] color = new int[n];
          for (int s = 0; s < n; s++)
              if (color[s] == 0 && dfsD(g, s, color)) return true;
          return false;
      }
      static boolean dfsD(List<List<Integer>> g, int u, int[] color) {
          color[u] = 1;                              // grey: on the current path
          for (int v : g.get(u)) {
              if (color[v] == 1) return true;        // back edge into the current path
              if (color[v] == 0 && dfsD(g, v, color)) return true;
              // color[v] == 2: already proven cycle-free, skip
          }
          color[u] = 2;                              // black: finished and safe
          return false;
      }`],
    codeTitle: ['Undirected cycle — parent check (Java)', 'Directed cycle — three colours (Java)'],
    viz: [{
      title: 'Directed cycle detection with white / grey / black',
      input: '0-1 1-2 2-3 0-4 4-3 3-5 5-1',
      inputLabel: 'Directed edges u-v meaning u → v (nodes 0..9)',
      gen: function (input) {
        var G = parseEdges(input, 10, 'the directed graph'), n = G.n, g = adjOf(n, G.edges, true), color = new Array(n).fill(0), frames = [], stack = [], ehl = {}, found = null;
        var NAMES = ['white', 'grey', 'black'];
        function show(narr, extra) {
          var h = {}, tags = {};
          for (var i = 0; i < n; i++) { if (color[i] === 1) h[i] = 'cur'; else if (color[i] === 2) h[i] = 'done'; tags[i] = NAMES[color[i]]; }
          if (extra) for (var k in extra) h[k] = extra[k];
          frames.push({ narr: narr, parts: [
            gpart('Directed graph (amber = grey/on path, faded = black/safe)', n, G.edges, true, h, ehl, tags),
            { type: 'stack', label: 'Current path (grey nodes) = recursion stack', items: stack.map(function (x) { return 'dfs(' + x + ')'; }), hl: one(stack.length - 1, 'cur') },
            { type: 'array', label: 'color[] (0 white, 1 grey, 2 black)', values: color.slice(), hl: (function () { var o = {}; color.forEach(function (c, i) { o[i] = c === 1 ? 'cur' : c === 2 ? 'done' : ''; }); return o; })() }
          ] });
        }
        function dfs(u) {
          color[u] = 1; stack.push(u);
          show('Enter ' + u + ': paint it <b>grey</b> — it is on the current path. Out-edges: [' + g[u].join(', ') + '].');
          for (var i = 0; i < g[u].length && !found; i++) {
            var v = g[u][i];
            if (color[v] === 1) {
              ehl[ek(u, v)] = 'bad';
              var cyc = stack.slice(stack.indexOf(v)).concat([v]);
              found = cyc;
              var hh = {}; cyc.forEach(function (x) { hh[x] = 'bad'; });
              show('Edge ' + u + '→' + v + ' points to a <b>grey</b> node — ' + v + ' is still on our current path. That is a <span class="c-r">back edge → CYCLE</span>: ' + cyc.join(' → ') + '.', hh);
              return;
            }
            if (color[v] === 2) { ehl[ek(u, v)] = 'done'; show('Edge ' + u + '→' + v + ': ' + v + ' is <b>black</b> (already fully explored, no cycle through it). Skip — this is why plain "visited" would give a false alarm.', one(v, 'ok')); continue; }
            ehl[ek(u, v)] = 'sel';
            dfs(v);
          }
          if (found) return;
          color[u] = 2; stack.pop();
          show('All out-edges of ' + u + ' explored without trouble → paint it <b>black</b> (safe) and pop it.');
        }
        show('Start: every node is <b>white</b> (unvisited). We launch DFS from each white node in order.');
        for (var s = 0; s < n && !found; s++) if (color[s] === 0) dfs(s);
        if (!found) show('Every node turned black and no edge ever hit a grey node → the graph is a <b>DAG</b> (no directed cycle). Reverse finish order would be a topological order.');
        else frames.push({ narr: 'Answer: <b>cycle exists</b>. In "course schedule" terms the courses ' + found.slice(0, -1).join(', ') + ' wait on each other forever — impossible to finish.', parts: [gpart('The cycle (red)', n, G.edges, true, (function () { var o = {}; found.forEach(function (x) { o[x] = 'bad'; }); return o; })(), (function () { var o = {}; for (var i = 1; i < found.length; i++) o[ek(found[i - 1], found[i])] = 'bad'; return o; })())] });
        return frames;
      }
    }, {
      title: 'Undirected cycle detection: DFS that ignores the edge it came from',
      input: '0-1 1-2 2-3 3-1 4-5',
      inputLabel: 'Undirected edges u-v (nodes 0..9)',
      gen: function (input) {
        var G = parseEdges(input, 10), n = G.n, g = adjOf(n, G.edges, false), seen = new Array(n).fill(false), par = new Array(n).fill(-1), frames = [], st = [], ehl = {}, found = null;
        function show(narr, extra) {
          var h = {}, tags = {};
          for (var i = 0; i < n; i++) if (seen[i]) { h[i] = 'done'; tags[i] = 'p=' + par[i]; }
          st.forEach(function (x) { h[x] = 'win'; });
          if (extra) for (var k in extra) h[k] = extra[k];
          frames.push({ narr: narr, parts: [gpart('Undirected graph (tag p = parent in DFS tree)', n, G.edges, false, h, ehl, tags), { type: 'stack', label: 'DFS stack (node, parent)', items: st.map(function (x) { return x + ' (from ' + par[x] + ')'; }), hl: one(st.length - 1, 'cur') }] });
        }
        function dfs(u, p) {
          seen[u] = true; par[u] = p; st.push(u);
          show('Visit <b>' + u + '</b> (came from ' + p + '). Neighbours: [' + g[u].join(', ') + '].', one(u, 'cur'));
          for (var i = 0; i < g[u].length && !found; i++) {
            var v = g[u][i];
            if (v === p) { show('Neighbour ' + v + ' is the parent — that is the same road we came down. <b>Ignore</b> it.', two(u, v)); continue; }
            if (seen[v]) { ehl[ek(u, v)] = 'bad'; found = [u, v]; show('Neighbour ' + v + ' is already visited and is NOT our parent → there is a second route between them → <span class="c-r">cycle found</span>.', (function () { var o = {}; o[u] = 'bad'; o[v] = 'bad'; return o; })()); return; }
            ehl[ek(u, v)] = 'sel'; dfs(v, u);
          }
          if (!found) { st.pop(); show('Finished ' + u + ' — no loop through its unexplored roads.', one(u, 'ok')); }
        }
        function two(a, b) { var o = {}; o[a] = 'cur'; o[b] = 'ok'; return o; }
        show('Start: nothing visited. Run DFS from every unvisited node, remembering each node\'s parent.');
        for (var s = 0; s < n && !found; s++) if (!seen[s]) dfs(s, -1);
        if (!found) show('No non-parent visited neighbour ever appeared → the graph is a <b>forest</b> (no cycle). Check: edges ' + G.edges.length + ' ≤ nodes − components.');
        else frames.push({ narr: 'Answer: <b>cycle exists</b> (the red edge closes it). Alternative proofs: E ≥ V for a simple graph, or DSU finding both ends already joined.', parts: [{ type: 'vars', vals: { V: n, E: G.edges.length, cycle: true }, hl: { cycle: 'bad' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Valid tree check (Graph Valid Tree)', html: `<p>n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]. A tree needs exactly ${H.c('g', 'n − 1 = 4 edges')} and must be connected. 4 edges ✔, DFS from 0 reaches all 5 ✔ → valid tree. With an extra edge [2,4] there are 5 edges → a cycle must exist.</p>`, code: `boolean validTree(int n, int[][] edges) {
    if (edges.length != n - 1) return false;            // wrong edge count → cycle or disconnected
    List<List<Integer>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    for (int[] e : edges) { g.get(e[0]).add(e[1]); g.get(e[1]).add(e[0]); }
    boolean[] seen = new boolean[n];
    ArrayDeque<Integer> st = new ArrayDeque<>();
    st.push(0); seen[0] = true;
    int reached = 1;
    while (!st.isEmpty()) for (int v : g.get(st.pop())) if (!seen[v]) { seen[v] = true; reached++; st.push(v); }
    return reached == n;                                 // n-1 edges + connected ⇒ no cycle
}` },
      { title: 'The diamond false alarm', html: `<p>Directed edges 0→1, 0→2, 1→3, 2→3. DFS: 0 grey → 1 grey → 3 grey → 3 black → 1 black → 2 grey → sees 3 which is ${H.c('g', 'black')} → skip. No cycle. With a single boolean "visited", step "2 sees 3" would wrongly scream cycle.</p>` },
      { title: 'Self-loop and two-node loop', html: `<p>Directed edge 2→2: entering 2 makes it grey, its own out-edge hits grey → cycle of length 1. Directed 0→1, 1→0 → cycle. But <b>undirected</b> 0–1 alone is not a cycle — that is exactly why we skip the parent.</p>` },
      { title: 'Finding the actual cycle', html: `<p>Keep the recursion stack (or parent array). When edge u→v hits a grey v, the cycle is the stack slice from v to u, plus v again. In the visualizer input 0→1→2→3→5→1 the slice is ${H.c('r', '1 → 2 → 3 → 5 → 1')}.</p>`, code: { lang: 'python', run: true, code: `def find_cycle(n, edges):
    g = [[] for _ in range(n)]
    for u, v in edges:
        g[u].append(v)
    color, path = [0] * n, []

    def dfs(u):
        color[u] = 1
        path.append(u)
        for v in g[u]:
            if color[v] == 1:                       # back edge
                return path[path.index(v):] + [v]
            if color[v] == 0:
                res = dfs(v)
                if res:
                    return res
        color[u] = 2
        path.pop()
        return None

    for s in range(n):
        if color[s] == 0:
            res = dfs(s)
            if res:
                return res
    return None

print(find_cycle(6, [[0, 1], [1, 2], [2, 3], [0, 4], [4, 3], [3, 5], [5, 1]]))
print(find_cycle(4, [[0, 1], [0, 2], [1, 3], [2, 3]]))   # diamond: None` } }
    ],
    deepDive: `<p><b>Why grey = cycle (proof):</b> a grey node v is an ancestor of the current node u in the DFS tree, so there is a tree path v ⇝ u. The edge u→v closes it into a directed cycle. Conversely, if a cycle exists, let v be the first node of the cycle that DFS enters; all other cycle nodes are reachable from v and still white, so DFS will reach the cycle node just before v while v is still grey — guaranteeing a back edge is seen. So "back edge exists ⇔ cycle exists".</p>
      <p><b>Undirected subtleties:</b> (1) with <b>parallel edges</b> (two roads between u and v) the "skip the parent" rule hides a real 2-cycle — skip the parent <i>edge id</i> instead; (2) in undirected DFS there are no cross edges, so "visited and not parent" always means a back edge; (3) the 3-colour method is unnecessary for undirected graphs but also works if you skip the parent.</p>
      <p><b>Recursion depth again:</b> a chain of 10<sup>5</sup> prerequisites will overflow Java's stack in a recursive 3-colour DFS. Kahn's BFS (topic 7) detects the same cycles iteratively, which is why many production build tools prefer it.</p>
      <p><b>Real-world cycle detection:</b> package managers (npm/pip/Maven) reject circular dependencies; spreadsheet engines report <code>#REF!</code>/circular reference errors; databases detect <b>deadlocks</b> by finding a cycle in the wait-for graph (transaction A waits for B waits for A) and abort one victim; Terraform and Kubernetes controllers order resources by DAGs and must reject cycles.</p>
      <p><b>Safe states (LC 802):</b> a node is "eventually safe" iff it never reaches a cycle — exactly the nodes that end up black <i>without</i> ever being part of a back edge path. Equivalently, run Kahn on the <b>reversed</b> graph from terminal nodes.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants know both algorithms, but they often pick the wrong one for the graph type — using parent-check on directed graphs or a single visited array, producing false alarms on diamonds. Interviewers love asking "why doesn't plain visited work here?" precisely because generated code gets it wrong.</p>
      <p><b>Use AI as a partner:</b> ask <code>Give me a directed graph where a single visited[] array wrongly reports a cycle, and an undirected multigraph where skipping the parent node misses a cycle.</code> Turn those into unit tests. In production, LLM agents that plan multi-step tool calls build dependency DAGs — cycle detection is how orchestrators (Airflow, Dagster, agent planners) reject an impossible plan before running it.</p>
      <p><b>Where AI goes wrong:</b> forgetting to launch DFS from every node (missing cycles in other components), un-greying nodes incorrectly (setting back to white instead of black, which turns O(V + E) into exponential time), and recursion depth on long chains. <b>What you must still own:</b> the grey/black proof, the parallel-edge caveat, and choosing DFS vs Kahn vs DSU.</p>`,
    problems: [{
      title: 'Course Schedule (can you finish all courses?)', level: 'Medium', tags: ['directed graph', 'cycle detection', 'dfs', 'topological sort'], companies: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Uber'],
      statement: `<p>There are <code>numCourses</code> courses 0..n−1. <code>prerequisites[i] = [a, b]</code> means you must take course <b>b before a</b>. Return true if it is possible to finish all courses.</p>`,
      constraints: `1 ≤ numCourses ≤ 2000, 0 ≤ prerequisites.length ≤ 5000, all pairs distinct`,
      example: `<p>n = 2, prerequisites = [[1,0]] → <b>${H.c('g', 'true')}</b> (take 0, then 1).<br>n = 2, prerequisites = [[1,0],[0,1]] → <b>${H.c('r', 'false')}</b>: 0 needs 1 and 1 needs 0 — a directed cycle, nobody can start.</p>`,
      brute: { why: `<p>Repeatedly scan all courses and "take" any course whose prerequisites are all taken; stop when a full scan takes nothing. Each scan is O(V + E) and you may need V scans → O(V·(V + E)) ≈ 1.4·10<sup>7</sup> here — OK for these limits but wasteful; the queue-based version (Kahn) or 3-colour DFS is linear.</p>`, code: `boolean canFinishBrute(int n, int[][] pre) {
    boolean[] taken = new boolean[n];
    int count = 0;
    boolean progress = true;
    while (progress) {
        progress = false;
        for (int c = 0; c < n; c++) {
            if (taken[c]) continue;
            boolean ready = true;
            for (int[] p : pre) if (p[0] == c && !taken[p[1]]) { ready = false; break; }
            if (ready) { taken[c] = true; count++; progress = true; }
        }
    }
    return count == n;
}` },
      mcq: { q: 'During DFS you follow edge u → v and v is currently "grey". What does it mean?', options: ['v is on the current path, so there is a cycle', 'v was finished earlier, so skip', 'v is unvisited, so recurse', 'u and v are in different components'], answer: 0, explain: 'Grey nodes are exactly the nodes on the recursion stack. An edge into one closes a loop back into the current path — a directed cycle.' },
      hints: [`<p>Hint 1: Courses are nodes; "b before a" is a directed edge b → a. All courses can be finished exactly when this graph has <b>no directed cycle</b>.</p>`, `<p>Hint 2: Use the 3-colour DFS (white/grey/black) — or count how many courses Kahn's algorithm can output.</p>`, `<p>Hint 3: Recipe: build adjacency b → a; color[] = 0; for every white node run dfs: grey on entry, if neighbour grey → return false, recurse into white ones, black on exit. If no back edge anywhere → true.</p>`],
      solution: {
        approach: `<p>Model as a directed graph and detect a cycle with the three-colour DFS. A grey neighbour means a back edge (cycle) → false. Black nodes are memoised as safe, so each node and edge is processed once.</p>`,
        code: `class Solution {
    public boolean canFinish(int numCourses, int[][] prerequisites) {
        List<List<Integer>> g = new ArrayList<>();
        for (int i = 0; i < numCourses; i++) g.add(new ArrayList<>());
        for (int[] p : prerequisites) g.get(p[1]).add(p[0]);   // b -> a
        int[] color = new int[numCourses];                       // 0 white, 1 grey, 2 black
        for (int c = 0; c < numCourses; c++)
            if (color[c] == 0 && hasCycle(g, c, color)) return false;
        return true;
    }
    private boolean hasCycle(List<List<Integer>> g, int u, int[] color) {
        color[u] = 1;
        for (int v : g.get(u)) {
            if (color[v] == 1) return true;                      // back edge
            if (color[v] == 0 && hasCycle(g, v, color)) return true;
        }
        color[u] = 2;
        return false;
    }
}`,
        alt: [{ lang: 'python', code: `def can_finish(n, prerequisites):
    g = [[] for _ in range(n)]
    for a, b in prerequisites:
        g[b].append(a)
    color = [0] * n

    def has_cycle(u):
        color[u] = 1
        for v in g[u]:
            if color[v] == 1 or (color[v] == 0 and has_cycle(v)):
                return True
        color[u] = 2
        return False

    return not any(color[c] == 0 and has_cycle(c) for c in range(n))

print(can_finish(2, [[1, 0]]), can_finish(2, [[1, 0], [0, 1]]))  # True False`, run: true }],
        dry: { head: ['step', 'node', 'action', 'color[0..1]'], rows: [['1', '0', 'grey, edges 0→1', '[1, 0]'], ['2', '1', 'grey, edges 1→0', '[1, 1]'], ['3', '1→0', '0 is grey → back edge', H.c('r', 'cycle → return false')]] },
        complexity: `<p>Time O(V + E), space O(V + E) for the graph plus O(V) recursion depth.</p>`,
        followUps: ['Return a valid order (Course Schedule II — topological sort)', 'Return the cycle itself to show the user which courses conflict', 'Minimum number of semesters if you can take any number of courses per semester (Kahn by levels)']
      }
    }]
  });

  // ================= TOPIC 6: bipartite =================
  topics.push({
    title: 'Bipartite Graphs: Two-Colouring with BFS (and the Odd-Cycle Rule)',
    analogy: `<p>You are seating guests at a party with <b>two rooms</b>. Some pairs of guests are enemies and must be in <b>different</b> rooms. Put the first guest in Room A. All their enemies must go to Room B. All of <i>those</i> people's enemies must go to Room A… If you ever find two enemies forced into the <b>same</b> room, the party is impossible.</p>
      <p>A <b>chessboard</b> is the classic picture: every square touches only squares of the other colour. A graph is <b>bipartite</b> when you can paint it like a chessboard with just two colours so that every edge joins different colours.</p>`,
    explain: `<p><b>Definition:</b> a graph is bipartite if its nodes can be split into two groups (call them colour 0 and colour 1) such that <b>every edge goes between the groups</b> — no edge inside a group.</p>
      <p><b>Algorithm (BFS two-colouring):</b></p>
      <ol><li><code>color[]</code> = -1 for everyone (uncoloured).</li>
        <li>For each uncoloured node s (graphs can be disconnected!): colour it 0 and BFS.</li>
        <li>When you pop u, look at each neighbour v: if v is uncoloured → give it the <b>opposite</b> colour <code>1 - color[u]</code> and push. If v already has the <b>same</b> colour as u → <b>not bipartite</b>.</li></ol>
      <p>DFS works the same way; BFS is shown because the colour of a node is simply the <b>parity of its BFS level</b> (even level = colour 0, odd level = colour 1).</p>
      ${H.table(['Graph', 'Try to colour', 'Result'], [['square 0–1–2–3–0 (4-cycle)', '0:A 1:B 2:A 3:B', H.c('g', 'bipartite')], ['triangle 0–1–2–0', '0:A 1:B 2:? (enemy of both)', H.c('r', 'NOT bipartite')], ['any tree', 'colour by depth parity', H.c('g', 'always bipartite')], ['grid graph', 'chessboard (r + c) % 2', H.c('g', 'always bipartite')]])}
      <p><b>The golden rule (König):</b> a graph is bipartite <b>if and only if it has no odd-length cycle</b>. Walking around a cycle flips colour at every step; to come back to the start colour you need an even number of steps. A triangle (3 steps) or a pentagon (5 steps) makes it impossible.</p>
      <p>Cost: <b>O(V + E)</b> — it is just a BFS with one extra array.</p>`,
    clues: [
      '"split into <b>two groups</b> so that no two people who dislike each other are in the same group" → bipartite check (Possible Bipartition)',
      '"<b>is graph bipartite</b>", "two teams", "two colours", "two shifts", "red/blue assignment" → BFS/DFS 2-colouring',
      '"<b>odd cycle</b>" anywhere in the statement → bipartite in disguise',
      'graph given as <code>graph[i]</code> = neighbours, may be <b>disconnected</b> → loop over all nodes as BFS starts',
      '"matching jobs to workers", "students to projects" → the graph is bipartite (max matching is a Graphs II / flow topic)',
      'grids and trees → always bipartite; use parity directly'
    ],
    code: [`
      // BFS two-colouring; graph[u] = neighbours of u (LeetCode 785 format)
      public boolean isBipartite(int[][] graph) {
          int n = graph.length;
          int[] color = new int[n];
          Arrays.fill(color, -1);                        // -1 = not coloured yet
          ArrayDeque<Integer> q = new ArrayDeque<>();
          for (int s = 0; s < n; s++) {
              if (color[s] != -1) continue;              // already handled (another component)
              color[s] = 0;
              q.offer(s);
              while (!q.isEmpty()) {
                  int u = q.poll();
                  for (int v : graph[u]) {
                      if (color[v] == -1) {              // free → opposite colour
                          color[v] = 1 - color[u];
                          q.offer(v);
                      } else if (color[v] == color[u]) { // enemies in the same room
                          return false;
                      }
                  }
              }
          }
          return true;
      }`, { lang: 'python', run: true, title: 'DFS version that also returns the two groups (runnable)', code: `def two_groups(n, edges):
    g = [[] for _ in range(n)]
    for u, v in edges:
        g[u].append(v)
        g[v].append(u)
    color = [-1] * n
    for s in range(n):
        if color[s] != -1:
            continue
        color[s] = 0
        stack = [s]
        while stack:
            u = stack.pop()
            for v in g[u]:
                if color[v] == -1:
                    color[v] = 1 - color[u]
                    stack.append(v)
                elif color[v] == color[u]:
                    return None                       # odd cycle somewhere
    A = [i for i in range(n) if color[i] == 0]
    B = [i for i in range(n) if color[i] == 1]
    return A, B

print(two_groups(4, [[0, 1], [1, 2], [2, 3], [3, 0]]))   # ([0, 2], [1, 3])
print(two_groups(3, [[0, 1], [1, 2], [2, 0]]))           # None (triangle)` }],
    codeTitle: ['Is Graph Bipartite — BFS (Java)'],
    viz: {
      title: 'BFS two-colouring: opposite colour for every neighbour',
      input: '0-1 1-2 2-3 3-0 3-4 4-5 5-6 6-4',
      inputLabel: 'Undirected edges u-v (nodes 0..9)',
      gen: function (input) {
        var G = parseEdges(input, 10), n = G.n, g = adjOf(n, G.edges, false), color = new Array(n).fill(-1), q = [], frames = [], ehl = {}, bad = null;
        function show(narr, extra, qh) {
          var h = {}, tags = {};
          for (var i = 0; i < n; i++) if (color[i] !== -1) { h[i] = color[i] === 0 ? 'win' : 'sel'; tags[i] = color[i] === 0 ? 'A' : 'B'; }
          if (extra) for (var k in extra) h[k] = extra[k];
          frames.push({ narr: narr, parts: [
            gpart('Blue = room A (colour 0), purple = room B (colour 1)', n, G.edges, false, h, ehl, tags),
            { type: 'queue', label: 'BFS queue', items: q.slice(), hl: qh || {} },
            { type: 'array', label: 'color[] (-1 none, 0 = A, 1 = B)', values: color.slice(), hl: (function () { var o = {}; color.forEach(function (c, i) { if (c === 0) o[i] = 'win'; else if (c === 1) o[i] = 'sel'; }); if (extra) for (var k in extra) o[k] = extra[k]; return o; })() }
          ] });
        }
        show('Nobody has a room yet (colour -1). We will BFS from every uncoloured node.');
        for (var s = 0; s < n && !bad; s++) {
          if (color[s] !== -1) continue;
          color[s] = 0; q.push(s);
          show('New component: put <b>' + s + '</b> in room <b>A</b> (colour 0) and push it.', one(s, 'cur'), { 0: 'ok' });
          while (q.length && !bad) {
            var u = q.shift(), newly = [], hl = one(u, 'cur');
            for (var i = 0; i < g[u].length; i++) {
              var v = g[u][i];
              if (color[v] === -1) { color[v] = 1 - color[u]; q.push(v); newly.push(v); ehl[ek(u, v)] = 'ok'; }
              else if (color[v] === color[u]) { bad = [u, v]; ehl[ek(u, v)] = 'bad'; break; }
            }
            if (bad) {
              var bh = {}; bh[bad[0]] = 'bad'; bh[bad[1]] = 'bad';
              show('Pop ' + u + ' (room ' + (color[u] ? 'B' : 'A') + '). Neighbour <b>' + bad[1] + '</b> is ALSO in room ' + (color[u] ? 'B' : 'A') + ' → two enemies in one room → <span class="c-r">NOT bipartite</span>. Somewhere there is an odd cycle through this edge.', bh);
              break;
            }
            var qh = {}; for (var j = q.length - newly.length; j < q.length; j++) qh[j] = 'ok';
            show('Pop <b>' + u + '</b> (room ' + (color[u] ? 'B' : 'A') + '). ' + (newly.length ? 'Uncoloured neighbours ' + newly.join(', ') + ' get the opposite room ' + (color[u] ? 'A' : 'B') + '.' : 'All neighbours already coloured with the opposite room — consistent.'), hl, qh);
            if (frames.length > 45) break;
          }
        }
        if (!bad) show('Every edge joins A and B → <b>bipartite</b>. Room A = {' + color.map(function (c, i) { return c === 0 ? i : null; }).filter(function (x) { return x !== null; }).join(', ') + '}, room B = {' + color.map(function (c, i) { return c === 1 ? i : null; }).filter(function (x) { return x !== null; }).join(', ') + '}.');
        else frames.push({ narr: 'Why it failed: nodes 4, 5, 6 form a triangle (if you kept the default input) — an <b>odd cycle</b>. Going around a cycle flips the room at each step, so an odd cycle can never come back consistent. Try removing edge 6-4.', parts: [{ type: 'vars', vals: { bipartite: false, conflictEdge: bad[0] + '–' + bad[1] }, hl: { bipartite: 'bad' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Even cycle vs odd cycle', html: `<p>4-cycle 0–1–2–3–0: colours A,B,A,B and the closing edge 3–0 joins B–A ✔. 5-cycle 0–1–2–3–4–0: A,B,A,B,A and the closing edge 4–0 joins ${H.c('r', 'A–A ✘')}. That is the odd-cycle rule in action.</p>` },
      { title: 'Disconnected graph trap', html: `<p>graph = [[1],[0],[3,4],[2,4],[2,3]]: component {0,1} is fine, component {2,3,4} is a triangle. If you only BFS from node 0 you return ${H.c('r', 'true (wrong)')}. Looping over every uncoloured node finds the triangle → ${H.c('g', 'false')}.</p>` },
      { title: 'Possible Bipartition (dislike pairs)', html: `<p>n = 4 people, dislikes = [[1,2],[1,3],[2,4]] → groups {1,4} and {2,3} ✔ → true. Build an undirected graph from dislikes (1-indexed → allocate n + 1) and run the same colouring.</p>`, code: `boolean possibleBipartition(int n, int[][] dislikes) {
    List<List<Integer>> g = new ArrayList<>();
    for (int i = 0; i <= n; i++) g.add(new ArrayList<>());
    for (int[] d : dislikes) { g.get(d[0]).add(d[1]); g.get(d[1]).add(d[0]); }
    int[] color = new int[n + 1];                       // 0 = none, 1 / -1 = the two groups
    for (int s = 1; s <= n; s++) {
        if (color[s] != 0) continue;
        color[s] = 1;
        ArrayDeque<Integer> q = new ArrayDeque<>(List.of(s));
        while (!q.isEmpty()) {
            int u = q.poll();
            for (int v : g.get(u)) {
                if (color[v] == 0) { color[v] = -color[u]; q.offer(v); }
                else if (color[v] == color[u]) return false;
            }
        }
    }
    return true;
}` },
      { title: 'DSU view of bipartite', html: `<p>Another method: for each node u, all its neighbours must be in the <b>same</b> group as each other, and in a different group from u. So union all neighbours of u together, and fail if <code>find(u) == find(neighbour)</code>. Same O(V + E·α) cost; handy when edges arrive online.</p>` }
    ],
    deepDive: `<p><b>Proof of the odd-cycle theorem:</b> (⇒) In a bipartite graph every edge switches sides, so any closed walk has even length. (⇐) If there is no odd cycle, BFS-colour each component by level parity. Suppose an edge u–v joins two nodes of the same parity. Then dist(u) and dist(v) differ by 0 (they differ by at most 1 and have the same parity). The BFS paths from the root to u and v plus the edge u–v form a closed walk of length dist(u) + dist(v) + 1 = odd, which contains an odd cycle — contradiction.</p>
      <p><b>Extracting the odd cycle</b> as a certificate: when the conflict edge u–v appears, walk parent pointers from u and v up to their lowest common ancestor; the two paths plus the edge form the odd cycle. Useful for explaining "why not" to a user.</p>
      <p><b>Where bipartite graphs show up:</b> matching (jobs ↔ workers, students ↔ projects, ride requests ↔ drivers) — solved with Hopcroft–Karp or max-flow; <b>2-SAT</b> and "2-colourability" constraints; scheduling with two shifts; recommender systems model users ↔ items as a bipartite graph. Many NP-hard problems (graph colouring with k ≥ 3, max independent set) become easy (polynomial) on bipartite graphs — König's theorem: max matching = min vertex cover.</p>
      <p><b>k-colouring warning:</b> 2-colouring is O(V + E), but deciding 3-colourability is <b>NP-complete</b>. If an interviewer asks "can we split into 3 groups", the honest answer is backtracking/heuristics, not BFS.</p>
      <p><b>Grid shortcut:</b> in a grid every move changes (r + c) parity, so grids are bipartite — used in domino tiling and "knight on a chessboard always alternates colours" puzzles.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated bipartite checks are usually right for connected graphs but frequently start BFS only from node 0, silently passing disconnected inputs. Interviewers like to test exactly that, plus the "why does an odd cycle break it?" explanation.</p>
      <p><b>Use AI as a partner:</b> ask it to produce a brute-force checker (try all 2<sup>n</sup> colourings for n ≤ 15) and fuzz your BFS against it. For real systems (team assignment, conflict-free scheduling) ask it to translate business rules into graph edges — then verify each rule is a "must be different" edge and not a "must be same" edge (those need DSU merging first).</p>
      <p><b>Where AI goes wrong:</b> missing components, using 0 as both "uncoloured" and a colour, recursion depth on long chains, and claiming 3-colouring can be done the same way. <b>What you must still own:</b> the parity proof, handling "must be same" + "must be different" constraints together (DSU with parity), and knowing when the problem quietly became NP-hard.</p>`,
    problems: [{
      title: 'Is Graph Bipartite?', level: 'Medium', tags: ['bfs', 'dfs', 'bipartite', 'graph colouring'], companies: ['Meta', 'Amazon', 'Google', 'LinkedIn'],
      statement: `<p>An undirected graph with n nodes is given as <code>graph[u]</code> = the list of neighbours of u. The graph may be disconnected and has no self-loops or parallel edges. Return true if it is bipartite.</p>`,
      constraints: `1 ≤ n ≤ 100, 0 ≤ graph[u].length &lt; n, graph is symmetric`,
      example: `<p>graph = [[1,3],[0,2],[1,3],[0,2]] (a square) → <b>${H.c('g', 'true')}</b> with groups {0,2} and {1,3}.<br>graph = [[1,2,3],[0,2],[0,1,3],[0,2]] → <b>${H.c('r', 'false')}</b>: 0–1–2 is a triangle (odd cycle).</p>`,
      brute: { why: `<p>Try all 2<sup>n</sup> ways to assign each node to group A or B and check every edge. For n = 100 that is 2<sup>100</sup> assignments — impossible. The waste: once one node's colour is fixed, its whole component's colours are forced; there is nothing to "try".</p>`, code: `boolean bipartiteBrute(int[][] graph) {
    int n = graph.length;                               // only feasible for n <= ~20
    for (long mask = 0; mask < (1L << n); mask++) {
        boolean ok = true;
        for (int u = 0; u < n && ok; u++)
            for (int v : graph[u])
                if (((mask >> u) & 1) == ((mask >> v) & 1)) { ok = false; break; }
        if (ok) return true;
    }
    return false;
}` },
      mcq: { q: 'Which graph is NOT bipartite?', options: ['A 5-node cycle', 'A 6-node cycle', 'Any tree', 'A 3×3 grid graph'], answer: 0, explain: 'A 5-cycle is an odd cycle. Even cycles, trees and grids can all be coloured like a chessboard.' },
      hints: [`<p>Hint 1: Once you pick the colour of one node, every neighbour's colour is forced (the opposite). There is no choice — only consistency checking.</p>`, `<p>Hint 2: BFS (or DFS) with a <code>color[]</code> array initialised to -1; give each newly discovered neighbour <code>1 - color[u]</code>.</p>`, `<p>Hint 3: Recipe: for every uncoloured s: color[s]=0, BFS; for each edge u–v: uncoloured → opposite + push; same colour → return false. After all components → true. Do not forget isolated nodes and multiple components.</p>`],
      solution: {
        approach: `<p>Colouring is forced, so a single BFS per component either succeeds or finds an edge whose ends got the same colour (which proves an odd cycle). Loop over all nodes to cover every component.</p>`,
        code: `class Solution {
    public boolean isBipartite(int[][] graph) {
        int n = graph.length;
        int[] color = new int[n];
        Arrays.fill(color, -1);
        int[] q = new int[n];                              // array queue: each node enters once
        for (int s = 0; s < n; s++) {
            if (color[s] != -1) continue;
            int head = 0, tail = 0;
            color[s] = 0;
            q[tail++] = s;
            while (head < tail) {
                int u = q[head++];
                for (int v : graph[u]) {
                    if (color[v] == -1) { color[v] = color[u] ^ 1; q[tail++] = v; }
                    else if (color[v] == color[u]) return false;
                }
            }
        }
        return true;
    }
}`,
        dry: { head: ['pop', 'colour', 'neighbours', 'result'], rows: [['0', 'A', '1 → B, 2 → B, 3 → B', 'ok'], ['1', 'B', '0 (A ✔), 2 (B!)', H.c('r', 'conflict 1–2 → false')]] },
        complexity: `<p>Time O(V + E), space O(V). The array queue is safe because each node is coloured (and enqueued) exactly once.</p>`,
        followUps: ['Return the two groups', 'Return an odd cycle as proof when not bipartite', 'Constraints of both kinds: "must be same group" and "must be different" → DSU with parity', 'Split into 3 groups instead (NP-complete: backtracking)']
      }
    }]
  });

  // ================= TOPIC 7: topological sort =================
  topics.push({
    title: 'Topological Sort: Kahn’s Algorithm (BFS) and DFS Post-Order',
    analogy: `<p><b>Getting dressed:</b> socks before shoes, shirt before tie, trousers before belt and shoes. You can put on your watch any time. A <b>topological order</b> is any sequence that respects every "X before Y" rule.</p>
      <p>Kahn's algorithm is how a sensible person does it: look for things that have <b>no remaining "before" rules</b> (socks, shirt, trousers, watch) — do one of them, then cross out the rules it satisfied. New items become free (shoes after socks + trousers). Repeat. If at some point nothing is free but items remain, the rules contradict each other (a cycle: "shoes before socks before shoes").</p>`,
    explain: `<p><b>What it is:</b> an ordering of the nodes of a <b>directed acyclic graph (DAG)</b> such that for every edge u → v, u comes <b>before</b> v. It exists <b>if and only if</b> the graph has no directed cycle. There can be many valid orders.</p>
      <p><b>Kahn's algorithm (BFS with in-degrees):</b></p>
      <ol><li>Compute <code>indeg[v]</code> = number of arrows coming into v.</li>
        <li>Push every node with indeg 0 into a queue (no prerequisites).</li>
        <li>Pop u, append it to the answer, and for every edge u → v do <code>indeg[v]--</code>; if it hits 0, push v (all its prerequisites are done).</li>
        <li>If the answer has fewer than V nodes → there is a <b>cycle</b> (those nodes never reached in-degree 0).</li></ol>
      ${H.table(['step', 'pop', 'indeg after', 'queue', 'order'], [['init', '—', '[0,1,1,2]', '[0]', '[]'], ['1', '0', '[0,0,0,2]', '[1, 2]', '[0]'], ['2', '1', '[0,0,0,1]', '[2]', '[0,1]'], ['3', '2', '[0,0,0,0]', '[3]', '[0,1,2]'], ['4', '3', '—', '[]', H.c('g', '[0,1,2,3]')]])}
      <p style="margin-top:4px">(edges 0→1, 0→2, 1→3, 2→3)</p>
      <p><b>DFS post-order method:</b> run DFS; when a node <b>finishes</b> (all its descendants are done), push it on a stack. Reverse finish order is a topological order — a node finishes only after everything that must come after it has finished. Combine with the grey/black colours from the cycle topic to detect cycles in the same pass.</p>
      ${H.table(['', 'Kahn (BFS)', 'DFS post-order'], [['Detect cycle', 'output count &lt; V', 'edge into a grey node'], ['Iterative by nature', H.c('g', 'yes'), 'recursive unless you simulate'], ['Lexicographically smallest order', H.c('g', 'swap queue → min-heap'), 'awkward'], ['Levels / "semesters"', H.c('g', 'process queue level by level'), 'no'], ['Cost', 'O(V + E)', 'O(V + E)']])}
      <p><b>Bonus — DP on a DAG:</b> once you have a topological order, process nodes in that order to compute longest path, number of paths, earliest finish times (critical path in project scheduling) — every node's inputs are final before it is processed.</p>`,
    clues: [
      '"<b>return an order</b> to take courses / build packages / run tasks" with "a before b" rules → topological sort',
      '"prerequisites", "dependencies", "must be done before", "compile order", "install order" → DAG',
      '"<b>alien dictionary</b>" / "derive letter order from sorted words" → build edges from first differing letters, then topo sort',
      '"if impossible return an empty array" → Kahn and check output size == V',
      '"<b>minimum number of semesters / rounds</b>" with parallel work allowed → Kahn level by level',
      '"lexicographically smallest valid order" → Kahn with a PriorityQueue',
      '"longest path / critical path / number of ways in a DAG" → DP in topological order'
    ],
    code: [`
      // Kahn's algorithm: returns an order, or an empty array if there is a cycle
      static int[] topoKahn(int n, int[][] edges) {          // edges[i] = {u, v} means u -> v
          List<List<Integer>> g = new ArrayList<>();
          for (int i = 0; i < n; i++) g.add(new ArrayList<>());
          int[] indeg = new int[n];
          for (int[] e : edges) { g.get(e[0]).add(e[1]); indeg[e[1]]++; }
          ArrayDeque<Integer> q = new ArrayDeque<>();
          for (int v = 0; v < n; v++) if (indeg[v] == 0) q.offer(v);   // no prerequisites
          int[] order = new int[n];
          int k = 0;
          while (!q.isEmpty()) {
              int u = q.poll();
              order[k++] = u;
              for (int v : g.get(u))
                  if (--indeg[v] == 0) q.offer(v);           // last prerequisite just done
          }
          return k == n ? order : new int[0];                // leftover nodes sit on/behind a cycle
      }`, `
      // DFS post-order (reverse finishing times) with cycle detection
      static List<Integer> topoDfs(int n, List<List<Integer>> g) {
          int[] color = new int[n];                           // 0 white, 1 grey, 2 black
          ArrayDeque<Integer> stack = new ArrayDeque<>();
          for (int s = 0; s < n; s++)
              if (color[s] == 0 && !dfs(g, s, color, stack)) return Collections.emptyList();
          return new ArrayList<>(stack);                      // stack top = first in order
      }
      static boolean dfs(List<List<Integer>> g, int u, int[] color, ArrayDeque<Integer> stack) {
          color[u] = 1;
          for (int v : g.get(u)) {
              if (color[v] == 1) return false;                // cycle → no order
              if (color[v] == 0 && !dfs(g, v, color, stack)) return false;
          }
          color[u] = 2;
          stack.push(u);                                      // push AFTER all descendants finish
          return true;
      }`],
    codeTitle: ['Kahn’s algorithm (Java)', 'DFS post-order topological sort (Java)'],
    viz: [{
      title: 'Kahn’s algorithm: in-degrees drop to zero, nodes join the queue',
      input: '5-2 5-0 4-0 4-1 2-3 3-1',
      inputLabel: 'Directed edges u-v meaning u must come before v (nodes 0..9)',
      gen: function (input) {
        var G = parseEdges(input, 10, 'the dependency graph'), n = G.n, g = adjOf(n, G.edges, true), indeg = new Array(n).fill(0), frames = [], order = [], ehl = {}, q = [];
        G.edges.forEach(function (e) { indeg[e[1]]++; });
        function show(narr, extra, ih, qh) {
          var h = {}, tags = {};
          order.forEach(function (x, i) { h[x] = 'done'; tags[x] = '#' + (i + 1); });
          q.forEach(function (x) { h[x] = 'win'; });
          for (var i = 0; i < n; i++) if (tags[i] === undefined) tags[i] = 'in ' + indeg[i];
          if (extra) for (var k in extra) h[k] = extra[k];
          frames.push({ narr: narr, parts: [
            gpart('Dependency graph (blue = ready in queue, faded = placed, tag = in-degree or position)', n, G.edges, true, h, ehl, tags),
            { type: 'array', label: 'indeg[]', values: indeg.slice(), hl: ih || {} },
            { type: 'queue', label: 'Queue of nodes with in-degree 0', items: q.slice(), hl: qh || {} },
            { type: 'array', label: 'Topological order so far', values: order.slice(), hl: order.length ? one(order.length - 1, 'ok') : {} }
          ] });
        }
        show('Count arrows coming INTO each node → indeg[] = [' + indeg.join(', ') + '].');
        for (var v = 0; v < n; v++) if (indeg[v] === 0) q.push(v);
        show('Nodes with in-degree 0 have no prerequisites: <b>' + (q.join(', ') || 'none') + '</b>. They go into the queue.', null, (function () { var o = {}; q.forEach(function (x) { o[x] = 'ok'; }); return o; })(), (function () { var o = {}; q.forEach(function (_, i) { o[i] = 'ok'; }); return o; })());
        while (q.length) {
          var u = q.shift(); order.push(u);
          var freed = [], ih = {};
          g[u].forEach(function (w) { indeg[w]--; ih[w] = indeg[w] === 0 ? 'ok' : 'cur'; ehl[ek(u, w)] = 'done'; if (indeg[w] === 0) { q.push(w); freed.push(w); } });
          var qh = {}; for (var j = q.length - freed.length; j < q.length; j++) qh[j] = 'ok';
          show('Pop <b>' + u + '</b> → append to order. Cross out its arrows ' + (g[u].length ? g[u].map(function (w) { return u + '→' + w; }).join(', ') : '(none)') + ' (indeg − 1). ' + (freed.length ? 'Now free: <b>' + freed.join(', ') + '</b> → push.' : 'Nothing became free yet.'), one(u, 'cur'), ih, qh);
          if (frames.length > 40) break;
        }
        if (order.length === n) show('Queue empty and all <b>' + n + '</b> nodes placed → valid order <b>' + order.join(' → ') + '</b>. Check: every arrow points left-to-right in this order.');
        else {
          var left = {}; for (var i = 0; i < n; i++) if (order.indexOf(i) < 0) left[i] = 'bad';
          show('Queue empty but only ' + order.length + ' of ' + n + ' nodes placed. Red nodes never reached in-degree 0 → they are on (or behind) a <span class="c-r">cycle</span>. No topological order exists.', left);
        }
        return frames;
      }
    }, {
      title: 'DFS topological sort: push a node when it FINISHES',
      input: '5-2 5-0 4-0 4-1 2-3 3-1',
      inputLabel: 'Directed edges u-v (nodes 0..9)',
      gen: function (input) {
        var G = parseEdges(input, 10, 'the dependency graph'), n = G.n, g = adjOf(n, G.edges, true), color = new Array(n).fill(0), frames = [], call = [], fin = [], ehl = {}, cyc = false;
        function show(narr, extra) {
          var h = {}, tags = {};
          for (var i = 0; i < n; i++) { if (color[i] === 1) h[i] = 'cur'; if (color[i] === 2) { h[i] = 'done'; tags[i] = 'fin ' + (fin.indexOf(i) + 1); } }
          if (extra) for (var k in extra) h[k] = extra[k];
          frames.push({ narr: narr, parts: [
            gpart('Graph (amber = in progress, faded = finished)', n, G.edges, true, h, ehl, tags),
            { type: 'stack', label: 'Call stack', items: call.map(function (x) { return 'dfs(' + x + ')'; }), hl: one(call.length - 1, 'cur') },
            { type: 'stack', label: 'Finish stack (top = first in topo order)', items: fin.slice(), hl: fin.length ? one(fin.length - 1, 'ok') : {} }
          ] });
        }
        function dfs(u) {
          color[u] = 1; call.push(u);
          show('Enter <b>' + u + '</b>. Before ' + u + ' can be placed, everything that must come AFTER it ([' + g[u].join(', ') + ']) has to finish first.');
          for (var i = 0; i < g[u].length && !cyc; i++) {
            var v = g[u][i];
            if (color[v] === 1) { cyc = true; ehl[ek(u, v)] = 'bad'; show('Edge ' + u + '→' + v + ' hits a node in progress → <span class="c-r">cycle</span>, no order exists.', one(v, 'bad')); return; }
            if (color[v] === 0) { ehl[ek(u, v)] = 'sel'; dfs(v); }
          }
          if (cyc) return;
          color[u] = 2; call.pop(); fin.push(u);
          show('<b>' + u + '</b> finished (all its successors are already on the finish stack) → push ' + u + ' on the finish stack.', one(u, 'ok'));
        }
        show('Run DFS from each unvisited node in index order. Rule: a node goes onto the finish stack only after all nodes it points to are there.');
        for (var s = 0; s < n && !cyc; s++) if (color[s] === 0) dfs(s);
        if (!cyc) {
          var ord = fin.slice().reverse();
          frames.push({ narr: 'Read the finish stack from top to bottom (= reverse finishing order): <b>' + ord.join(' → ') + '</b>. A different but equally valid order than Kahn may give.', parts: [{ type: 'array', label: 'Topological order', values: ord, hl: one(0, 'sel') }, gpart('Every arrow goes from earlier to later', n, G.edges, true, {}, {}, (function () { var o = {}; ord.forEach(function (x, i) { o[x] = '#' + (i + 1); }); return o; })())] });
        }
        return frames;
      }
    }],
    examples: [
      { title: 'Several valid answers', html: `<p>Edges 5→2, 5→0, 4→0, 4→1, 2→3, 3→1. Kahn (queue, neighbours scanned in increasing order, as in the visualizer) gives ${H.c('g', '4, 5, 0, 2, 3, 1')}; DFS from 0 upwards gives ${H.c('g', '5, 4, 2, 3, 1, 0')}. Both respect every arrow. Interview problems usually say "return any valid order" — if they want a unique one, they say "lexicographically smallest" (use a min-heap in Kahn).</p>` },
      { title: 'Minimum semesters (Kahn by levels)', html: `<p>Prerequisites 1→3, 2→3, 3→4 (take as many courses per semester as you like). Level 0 = {1,2}, level 1 = {3}, level 2 = {4} → ${H.c('g', '3 semesters')}. That number is the length of the longest path (in nodes) — the critical path.</p>`, code: { lang: 'python', run: true, code: `from collections import deque

def min_semesters(n, relations):          # courses 1..n, relation [a, b]: a before b
    g = [[] for _ in range(n + 1)]
    indeg = [0] * (n + 1)
    for a, b in relations:
        g[a].append(b)
        indeg[b] += 1
    q = deque(c for c in range(1, n + 1) if indeg[c] == 0)
    taken = semesters = 0
    while q:
        semesters += 1
        for _ in range(len(q)):           # one semester = one BFS level
            c = q.popleft()
            taken += 1
            for nxt in g[c]:
                indeg[nxt] -= 1
                if indeg[nxt] == 0:
                    q.append(nxt)
    return semesters if taken == n else -1

print(min_semesters(4, [[1, 3], [2, 3], [3, 4]]))  # 3
print(min_semesters(2, [[1, 2], [2, 1]]))          # -1 (cycle)` } },
      { title: 'Alien dictionary edge building', html: `<p>Sorted alien words ["wrt","wrf","er","ett","rftt"]. Compare neighbours, take the <b>first differing letter</b>: wrt/wrf → t→f, wrf/er → w→e, er/ett → r→t, ett/rftt → e→r. Topo sort gives ${H.c('g', 'w e r t f')}. Trap: "abc" before "ab" is invalid input (a longer word with the same prefix cannot come first) → return "".</p>` },
      { title: 'Longest path in a DAG via topo order', html: `<p>Longest path is NP-hard in general graphs but easy in a DAG: process nodes in topological order and relax <code>best[v] = max(best[v], best[u] + 1)</code> for each edge u → v. The input order matters: by the time v is processed every predecessor u is final.</p>`, code: `int longestPath(int n, int[][] edges) {
    List<List<Integer>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    int[] indeg = new int[n], best = new int[n];          // best[v] = edges on the longest path ending at v
    for (int[] e : edges) { g.get(e[0]).add(e[1]); indeg[e[1]]++; }
    ArrayDeque<Integer> q = new ArrayDeque<>();
    for (int v = 0; v < n; v++) if (indeg[v] == 0) q.offer(v);
    int ans = 0;
    while (!q.isEmpty()) {
        int u = q.poll();
        ans = Math.max(ans, best[u]);
        for (int v : g.get(u)) {
            best[v] = Math.max(best[v], best[u] + 1);     // u is final here
            if (--indeg[v] == 0) q.offer(v);
        }
    }
    return ans;
}` }
    ],
    deepDive: `<p><b>Why Kahn is correct:</b> every DAG has at least one node with in-degree 0 (otherwise follow incoming arrows backwards forever → you would revisit a node → a cycle). Removing it leaves a smaller DAG, so induction gives a full order. Conversely, nodes on a cycle each keep at least one incoming arrow from another cycle node, so they can never reach in-degree 0 — that is why "count &lt; V" detects cycles, and the leftover nodes are exactly those on a cycle or reachable from one.</p>
      <p><b>Why reverse post-order is correct:</b> for any edge u → v in a DAG, v finishes before u: either v is still white when u looks at it (then v is a descendant and finishes first), or v is already black. v cannot be grey, because that would be a cycle. So u is pushed after v and appears before v in the reversed list.</p>
      <p><b>Uniqueness:</b> the topological order is unique iff at every Kahn step the queue holds exactly one node — equivalently, the order is a Hamiltonian path (consecutive nodes are connected). This is the check in "Sequence Reconstruction".</p>
      <p><b>Real systems:</b> <code>make</code>, Bazel, Gradle and Maven order build targets topologically; package managers order installs; spreadsheet engines recompute cells in topological order of formula dependencies; Airflow/Dagster/Prefect DAGs, Kubernetes Helm charts and Terraform plans all run topological sorts and reject cycles; neural-network frameworks (PyTorch autograd, TensorFlow graphs) run backprop in reverse topological order of the computation graph. Parallel schedulers use Kahn's levels: everything in the same level can run concurrently.</p>
      <p><b>Lexicographic order:</b> replacing the queue with a <code>PriorityQueue</code> makes Kahn O((V + E) log V) and outputs the smallest order. Note it is <i>not</i> the same as "smallest position for node 1" (that needs the reversed graph with a max-heap, a classic trick).</p>`,
    aiEra: `<p><b>What AI changes:</b> agent frameworks and workflow engines are built on DAGs. When an LLM plans tool calls ("fetch data, then summarise, then email"), the orchestrator topologically sorts the plan and runs independent steps in parallel — Kahn's levels are literally the parallelism. Understanding topo sort is how you debug "why did step 4 run before step 2?" in those systems.</p>
      <p><b>Use AI as a partner:</b> ask it to convert a messy requirements list ("the API must be up before the frontend deploys, migrations before the API…") into an edge list, then run your own Kahn to produce the rollout order and catch cycles. Ask it for adversarial alien-dictionary inputs (prefix traps, single word, duplicate letters).</p>
      <p><b>Where AI goes wrong:</b> reversing the edge direction for prerequisites ([a, b] means b → a!), forgetting the cycle check (returning a partial order as if it were complete), adding duplicate edges that double-count in-degrees in alien dictionary, and missing the prefix-invalid case. <b>What you must still own:</b> the correctness proofs, the edge direction convention, and knowing when you need levels, a heap, or DP on top of the order.</p>`,
    problems: [{
      title: 'Course Schedule II (return a valid order)', level: 'Medium', tags: ['topological sort', 'kahn', 'bfs'], companies: ['Amazon', 'Google', 'Meta', 'Airbnb', 'Microsoft'],
      statement: `<p>There are <code>numCourses</code> courses 0..n−1 and <code>prerequisites[i] = [a, b]</code> means you must take <b>b before a</b>. Return any order in which you can take all courses, or an empty array if it is impossible.</p>`,
      constraints: `1 ≤ numCourses ≤ 2000, 0 ≤ prerequisites.length ≤ n·(n−1), pairs distinct`,
      example: `<p>n = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]] → <b>${H.c('g', '[0, 1, 2, 3]')}</b> (or [0, 2, 1, 3]). Course 0 has no prerequisites; 1 and 2 need 0; 3 needs both 1 and 2, so it must come last.</p>`,
      brute: { why: `<p>Try permutations of the courses and return the first one that respects every prerequisite: n! permutations — even n = 12 is 479 million. The waste: at every point the set of "currently allowed" courses is easy to compute, so there is no need to guess.</p>`, code: `int[] brute(int n, int[][] pre) {                 // only for tiny n
    int[] perm = new int[n];
    for (int i = 0; i < n; i++) perm[i] = i;
    do {
        int[] pos = new int[n];
        for (int i = 0; i < n; i++) pos[perm[i]] = i;
        boolean ok = true;
        for (int[] p : pre) if (pos[p[1]] > pos[p[0]]) { ok = false; break; }
        if (ok) return perm.clone();
    } while (nextPerm(perm));
    return new int[0];
}
boolean nextPerm(int[] a) {
    int i = a.length - 2;
    while (i >= 0 && a[i] >= a[i + 1]) i--;
    if (i < 0) return false;
    int j = a.length - 1;
    while (a[j] <= a[i]) j--;
    int t = a[i]; a[i] = a[j]; a[j] = t;
    for (int l = i + 1, r = a.length - 1; l < r; l++, r--) { t = a[l]; a[l] = a[r]; a[r] = t; }
    return true;
}` },
      mcq: { q: 'Kahn’s algorithm finished and produced 5 courses out of 7. What does that mean?', options: ['There is a cycle; return an empty array', 'The remaining 2 can be appended in any order', 'The graph is disconnected', 'You must run it again from another start node'], answer: 0, explain: 'Nodes on a cycle never reach in-degree 0, so they never enter the queue. Fewer than V outputs ⇒ cycle ⇒ impossible.' },
      hints: [`<p>Hint 1: Draw an arrow b → a for "b before a". A valid schedule is a topological order of this directed graph.</p>`, `<p>Hint 2: Count in-degrees; courses with in-degree 0 can be taken right now. Taking one lowers the in-degree of the courses that depend on it.</p>`, `<p>Hint 3: Recipe: indeg + adjacency; queue all indeg-0; pop → add to answer → decrement children, push those reaching 0. If answer length &lt; n → return []. Courses with no edges at all are in-degree 0 from the start.</p>`],
      solution: {
        approach: `<p>Kahn's algorithm. The queue always contains courses whose prerequisites are all done. Taking a course "removes" its outgoing arrows. If a cycle exists, its courses never become free and the output is short — return an empty array.</p>`,
        code: `class Solution {
    public int[] findOrder(int numCourses, int[][] prerequisites) {
        List<List<Integer>> g = new ArrayList<>();
        for (int i = 0; i < numCourses; i++) g.add(new ArrayList<>());
        int[] indeg = new int[numCourses];
        for (int[] p : prerequisites) { g.get(p[1]).add(p[0]); indeg[p[0]]++; }   // b -> a

        ArrayDeque<Integer> q = new ArrayDeque<>();
        for (int c = 0; c < numCourses; c++) if (indeg[c] == 0) q.offer(c);
        int[] order = new int[numCourses];
        int k = 0;
        while (!q.isEmpty()) {
            int c = q.poll();
            order[k++] = c;
            for (int nxt : g.get(c))
                if (--indeg[nxt] == 0) q.offer(nxt);
        }
        return k == numCourses ? order : new int[0];
    }
}`,
        alt: [{ lang: 'python', code: `from collections import deque

def find_order(n, prerequisites):
    g = [[] for _ in range(n)]
    indeg = [0] * n
    for a, b in prerequisites:
        g[b].append(a)
        indeg[a] += 1
    q = deque(c for c in range(n) if indeg[c] == 0)
    order = []
    while q:
        c = q.popleft()
        order.append(c)
        for nxt in g[c]:
            indeg[nxt] -= 1
            if indeg[nxt] == 0:
                q.append(nxt)
    return order if len(order) == n else []

print(find_order(4, [[1, 0], [2, 0], [3, 1], [3, 2]]))  # [0, 1, 2, 3]`, run: true }],
        dry: { head: ['pop', 'order', 'indeg[0..3] after', 'queue'], rows: [['init', '[]', '[0,1,1,2]', '[0]'], ['0', '[0]', '[0,0,0,2]', '[1,2]'], ['1', '[0,1]', '[0,0,0,1]', '[2]'], ['2', '[0,1,2]', '[0,0,0,0]', '[3]'], ['3', H.c('g', '[0,1,2,3]'), '—', '[]']] },
        complexity: `<p>Time O(V + E), space O(V + E).</p>`,
        followUps: ['Return the lexicographically smallest order (PriorityQueue)', 'Minimum number of semesters (level-by-level Kahn)', 'Each course has a duration and unlimited parallelism — earliest finish time (DP on the DAG = critical path)', 'Is the order unique? (queue size always 1)']
      }
    }]
  });

  // ================= TOPIC 8: Disjoint Set Union =================
  // draw the DSU parent[] array as a forest (arrows child -> parent)
  function forestPart(label, parent, hl, ehl, tags) {
    var n = parent.length, kids = [], roots = [], depth = new Array(n).fill(0), x = new Array(n).fill(0), slot = 0, maxD = 0;
    for (var i = 0; i < n; i++) kids.push([]);
    for (i = 0; i < n; i++) { if (parent[i] === i) roots.push(i); else kids[parent[i]].push(i); }
    function place(u, d) {
      depth[u] = d; if (d > maxD) maxD = d;
      if (!kids[u].length) { x[u] = slot++; return; }
      kids[u].forEach(function (c) { place(c, d + 1); });
      x[u] = (x[kids[u][0]] + x[kids[u][kids[u].length - 1]]) / 2;
    }
    roots.forEach(function (r) { place(r, 0); });
    var height = Math.max(26, (maxD + 1) * 14 + 6), nodes = [], edges = [];
    for (i = 0; i < n; i++) {
      nodes.push({ id: i, label: String(i), x: Math.round((slot <= 1 ? 50 : 6 + 88 * x[i] / (slot - 1)) * 10) / 10, y: 8 + depth[i] * 14 });
      if (parent[i] !== i) edges.push([i, parent[i]]);
    }
    return { type: 'graph', label: label, directed: true, height: height, nodes: nodes, edges: edges, hl: cp(hl || {}), ehl: cp(ehl || {}), tags: cp(tags || {}) };
  }

  topics.push({
    title: 'Disjoint Set Union (Union-Find): Path Compression + Union by Rank',
    analogy: `<p>Think of <b>clubs in a school</b>. Every club has one <b>president</b>. Each member remembers just one person — "the one I report to" — and following those links upward always ends at the president. To ask "are Asha and Ben in the same club?" you each walk up to your president and compare.</p>
      <p>When two clubs <b>merge</b>, you don't re-register everyone. The president of the <b>smaller</b> club simply starts reporting to the president of the bigger club — one change. And whenever someone walks up the chain, they <b>shortcut</b>: next time they report directly to the president (path compression). Soon every chain is just one or two hops long.</p>`,
    explain: `<p><b>DSU</b> keeps a collection of <b>disjoint groups</b> (no element in two groups) and supports two operations, almost in O(1):</p>
      <ul><li><code>find(x)</code> — return the group's <b>leader</b> (root). Two elements are in the same group iff they have the same leader.</li>
        <li><code>union(a, b)</code> — merge the groups of a and b.</li></ul>
      <p><b>Storage:</b> one array <code>parent[]</code>. Initially <code>parent[i] = i</code> (everyone is their own president). A root is a node whose parent is itself.</p>
      ${H.arr([0, 0, 1, 3, 3, 5], { label: 'parent[] — groups {0,1,2} (root 0), {3,4} (root 3), {5}', hl: { 0: 'g', 3: 'g', 5: 'g' } })}
      <p><b>Optimisation 1 — union by rank/size:</b> attach the <b>shorter</b> (or smaller) tree under the taller (bigger) one. Then a tree of height h has at least 2<sup>h</sup> nodes, so heights stay ≤ log₂ n.</p>
      <p><b>Optimisation 2 — path compression:</b> during <code>find(x)</code>, point every node on the path directly at the root. Future finds on those nodes take one hop.</p>
      ${H.table(['Version', 'find cost', 'Note'], [['naive (no tricks)', H.c('r', 'O(n) worst — a long chain'), 'union(0,1), union(1,2)… builds a line'], ['union by rank only', 'O(log n)', 'height ≤ log n'], ['path compression only', 'O(log n) amortised', 'already great in practice'], ['both', H.c('g', 'O(α(n)) amortised'), 'α(n) ≤ 4 for any n you will ever see']])}
      <p><b>α(n)</b> is the <i>inverse Ackermann function</i> — it grows so slowly that α(number of atoms in the universe) ≤ 4. Treat it as a constant.</p>
      <p><b>What DSU is great at:</b> counting components while edges are <b>added</b> (online), detecting a cycle in an undirected graph (an edge whose ends already share a leader), Kruskal's MST (Graphs II), grouping equivalent items (accounts with shared emails, similar strings, equations a == b). <b>What it cannot do:</b> delete edges or give paths/distances — use BFS/DFS for those.</p>`,
    clues: [
      '"<b>number of connected components</b> after each added edge / each new land cell" → DSU (re-running DFS each time is too slow)',
      '"<b>redundant connection</b>", "the edge that creates a cycle" in an undirected graph → first union that finds both ends already connected',
      '"<b>merge accounts / groups / friends circles</b>" sharing a common element → union everything that shares a key',
      '"are x and y connected?" asked many times while connections only get added → DSU',
      '"equations a == b, a != c — is it consistent?" → union all equalities, then check inequalities',
      '"minimum spanning tree" / "connect all cities at minimum cost" → Kruskal = sort edges + DSU (Graphs II)',
      'only <b>additions</b>, no deletions; no shortest-path question → DSU fits; deletions → think offline/reverse processing'
    ],
    code: [`
      // Disjoint Set Union with path compression + union by rank
      class DSU {
          private final int[] parent, rank;
          private int components;

          DSU(int n) {
              parent = new int[n];
              rank = new int[n];
              components = n;
              for (int i = 0; i < n; i++) parent[i] = i;      // everyone leads themselves
          }

          int find(int x) {                                   // iterative: no recursion depth issues
              int root = x;
              while (parent[root] != root) root = parent[root];
              while (parent[x] != root) {                     // path compression: re-point to root
                  int next = parent[x];
                  parent[x] = root;
                  x = next;
              }
              return root;
          }

          boolean union(int a, int b) {                       // false if already in the same group
              int ra = find(a), rb = find(b);
              if (ra == rb) return false;
              if (rank[ra] < rank[rb]) { int t = ra; ra = rb; rb = t; }
              parent[rb] = ra;                                // shorter tree goes under taller
              if (rank[ra] == rank[rb]) rank[ra]++;
              components--;
              return true;
          }

          boolean connected(int a, int b) { return find(a) == find(b); }
          int count() { return components; }
      }`, { lang: 'python', run: true, title: 'DSU in Python with union by size (runnable)', code: `class DSU:
    def __init__(self, n):
        self.parent = list(range(n))
        self.size = [1] * n
        self.components = n

    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]   # path halving
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra                               # small under big
        self.size[ra] += self.size[rb]
        self.components -= 1
        return True

d = DSU(6)
for a, b in [(0, 1), (1, 2), (3, 4), (2, 0)]:
    print("union", a, b, "->", "merged" if d.union(a, b) else "already together (cycle edge!)")
print("components:", d.components)          # {0,1,2}, {3,4}, {5} -> 3
print("0~2?", d.find(0) == d.find(2), " 0~3?", d.find(0) == d.find(3))` }],
    codeTitle: ['DSU class (Java)'],
    viz: [{
      title: 'Union by rank + path compression on the parent[] array',
      input: '8 | 0-1 2-3 1-3 4-5 6-7 5-7 3-7 0-6',
      inputLabel: 'n | union pairs a-b (n ≤ 12)',
      gen: function (input) {
        var P = sections(input, 2, 'Format: n | a-b c-d …  e.g. 6 | 0-1 2-3 1-3');
        var n = parseInt(P[0], 10);
        if (!(n >= 2 && n <= 12)) throw new Error('n must be between 2 and 12');
        var G = parseEdges(P[1], n, 'the union pairs'), parent = [], rank = [], frames = [], comps = n;
        for (var i = 0; i < n; i++) { parent.push(i); rank.push(0); }
        function snap(narr, hl, ehl, ah) {
          frames.push({ narr: narr, parts: [
            forestPart('Forest: arrow = "my parent", top row = leaders (roots)', parent, hl, ehl, (function () { var t = {}; for (var j = 0; j < n; j++) if (parent[j] === j) t[j] = 'r' + rank[j]; return t; })()),
            { type: 'array', label: 'parent[]', values: parent.slice(), hl: ah || {} },
            { type: 'array', label: 'rank[] (upper bound on tree height)', values: rank.slice() },
            { type: 'vars', vals: { components: comps } }
          ] });
        }
        function find(x, who) {
          var path = [x], r = x;
          while (parent[r] !== r) { r = parent[r]; path.push(r); }
          var hl = {}, eh = {}, ah = {};
          path.forEach(function (p, k) { hl[p] = k === path.length - 1 ? 'sel' : 'cur'; ah[p] = hl[p]; if (k) eh[ek(path[k - 1], p)] = 'cur'; });
          if (path.length > 1) snap('find(' + x + ') for ' + who + ': follow parent links ' + path.join(' → ') + '. Leader = <b>' + r + '</b>' + (path.length > 2 ? ' (' + (path.length - 1) + ' hops).' : '.'), hl, eh, ah);
          if (path.length > 2) {
            var changed = [];
            for (var k = 0; k < path.length - 2; k++) { if (parent[path[k]] !== r) { parent[path[k]] = r; changed.push(path[k]); } }
            var h2 = {}, a2 = {}; changed.forEach(function (c) { h2[c] = 'ok'; a2[c] = 'ok'; }); h2[r] = 'sel';
            snap('<b>Path compression:</b> node(s) ' + changed.join(', ') + ' now point straight at leader ' + r + '. Next time find() on them takes 1 hop.', h2, {}, a2);
          }
          return r;
        }
        snap('Start: ' + n + ' separate groups. parent[i] = i, so everyone is their own leader (rank 0).', {}, {}, {});
        G.edges.forEach(function (e) {
          if (frames.length > 70) return;
          var a = e[0], b = e[1];
          var ra = find(a, 'a = ' + a), rb = find(b, 'b = ' + b);
          if (ra === rb) {
            var hb = {}; hb[a] = 'bad'; hb[b] = 'bad';
            snap('union(' + a + ', ' + b + '): both leaders are <b>' + ra + '</b> → already in the same group. Nothing to merge. (In a graph this edge would close a <span class="c-r">cycle</span> — "redundant connection".)', hb, {}, {});
            return;
          }
          var big = ra, small = rb, why;
          if (rank[ra] < rank[rb]) { big = rb; small = ra; why = 'rank[' + rb + ']=' + rank[rb] + ' > rank[' + ra + ']=' + rank[ra] + ', so ' + ra + ' goes under ' + rb; }
          else if (rank[ra] > rank[rb]) why = 'rank[' + ra + ']=' + rank[ra] + ' > rank[' + rb + ']=' + rank[rb] + ', so ' + rb + ' goes under ' + ra;
          else why = 'equal ranks (' + rank[ra] + '), so ' + rb + ' goes under ' + ra + ' and rank[' + ra + '] grows to ' + (rank[ra] + 1);
          parent[small] = big;
          if (rank[big] === rank[small]) rank[big]++;
          comps--;
          var hl = {}; hl[big] = 'sel'; hl[small] = 'ok';
          snap('union(' + a + ', ' + b + '): find(' + a + ') = ' + ra + ', find(' + b + ') = ' + rb + ' — different leaders → link the ROOTS (never a and b themselves). ' + why + '. Only ONE array cell changes: parent[' + small + '] = ' + big + '. Components = ' + comps + '.', hl, one(ek(small, big), 'ok'), one(small, 'ok'));
        });
        snap('All unions done: <b>' + comps + '</b> group(s). Trees stay short thanks to rank (height ≤ log n) and compression flattens them further.', {}, {}, {});
        return frames;
      }
    }, {
      title: 'Why path compression matters: flattening a long chain',
      input: '7',
      inputLabel: 'Chain length (3..10)',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        if (!(n >= 3 && n <= 10)) throw new Error('Choose a chain length from 3 to 10');
        var parent = [0], frames = [];
        for (var i = 1; i < n; i++) parent.push(i - 1);
        function snap(narr, hl, ehl, ah, extra) {
          var parts = [forestPart('Forest (arrow = parent)', parent, hl, ehl), { type: 'array', label: 'parent[]', values: parent.slice(), hl: ah || {} }];
          if (extra) parts.push(extra);
          frames.push({ narr: narr, parts: parts });
        }
        snap('A naive DSU (no union by rank) can build a <b>chain</b>: union(1,0), union(2,1), … Node ' + (n - 1) + ' is ' + (n - 1) + ' hops from the leader 0.', {}, {}, {});
        var x = n - 1, hops = 0, path = [x];
        while (parent[x] !== x) {
          var hl = {}; path.forEach(function (p) { hl[p] = 'done'; }); hl[parent[x]] = 'cur';
          snap('find(' + (n - 1) + '): hop ' + (++hops) + ' — from ' + x + ' up to ' + parent[x] + '.', hl, one(ek(x, parent[x]), 'cur'), one(parent[x], 'cur'), { type: 'vars', vals: { hops: hops } });
          x = parent[x]; path.push(x);
        }
        var changed = [];
        for (var k = 0; k < path.length - 1; k++) if (parent[path[k]] !== 0) { parent[path[k]] = 0; changed.push(path[k]); }
        var h2 = {}, a2 = {}; changed.forEach(function (c) { h2[c] = 'ok'; a2[c] = 'ok'; }); h2[0] = 'sel';
        snap('Leader found after <b>' + hops + '</b> hops. Path compression now re-points <b>every</b> node on the path (' + changed.join(', ') + ') straight at 0.', h2, {}, a2, { type: 'vars', vals: { hops: hops }, hl: { hops: 'bad' } });
        snap('Second find(' + (n - 1) + '): just <b>1</b> hop. Every node on that path got the same gift. Over many operations the average cost becomes α(n) — effectively constant.', one(n - 1, 'cur'), one(ek(n - 1, 0), 'ok'), {}, { type: 'vars', vals: { hops: 1 }, hl: { hops: 'ok' } });
        return frames;
      }
    }],
    examples: [
      { title: 'Count components online', html: `<p>n = 5, edges arrive [0,1], [1,2], [3,4], [2,0]. Components: 5 → 4 → 3 → 2 → ${H.c('y', '2 (the last edge joined two nodes that were already connected)')}. Each step is ~O(1); re-running DFS after each edge would be O(E·(V + E)).</p>` },
      { title: 'Union by size vs union by rank', html: `<p>Both keep trees shallow. <b>Size</b> (number of nodes) is often more useful because you also get "how big is my group?" for free — e.g. "largest group of friends" or "size of the biggest island after flipping one cell". Rank is an upper bound on height and only changes when two equal ranks merge.</p>${H.table(['union', 'by size: sizes', 'by rank: ranks'], [['(0,1)', 'size[0]=2', 'rank[0]=1'], ['(0,2)', 'size[0]=3', 'rank[0]=1'], ['(3,4) then (0,3)', 'size[3]=2, then size[0]=3+2=5', 'rank[3]=1; equal ranks 1 and 1 → rank[0]=2']])}` },
      { title: 'Satisfiability of equality equations', html: `<p>["a==b", "b!=c", "c==a"]: first union all "==" pairs: {a, b, c} become one group. Then check every "!=": b and c share a leader → ${H.c('r', 'contradiction → false')}. Two passes are essential — checking "!=" before all "==" are merged gives wrong answers.</p>`, code: `boolean equationsPossible(String[] eqs) {
    int[] p = new int[26];
    for (int i = 0; i < 26; i++) p[i] = i;
    for (String e : eqs) if (e.charAt(1) == '=') p[find(p, e.charAt(0) - 'a')] = find(p, e.charAt(3) - 'a');
    for (String e : eqs) if (e.charAt(1) == '!' && find(p, e.charAt(0) - 'a') == find(p, e.charAt(3) - 'a')) return false;
    return true;
}
int find(int[] p, int x) { while (p[x] != x) { p[x] = p[p[x]]; x = p[x]; } return x; }` },
      { title: 'DSU on a grid', html: `<p>Number each cell <code>id = r * C + c</code>. For every land cell, union it with its land neighbour to the right and below (enough to cover each edge once). The number of islands = land cells − successful unions. This is the base of Number of Islands II, where land appears one cell at a time.</p>` }
    ],
    deepDive: `<p><b>Why union by rank gives O(log n):</b> a root's rank only increases when two trees of equal rank merge, so a tree of rank r has at least 2<sup>r</sup> nodes ⇒ r ≤ log₂ n, and height ≤ rank.</p>
      <p><b>Path compression + rank ⇒ O(α(n)) amortised</b> (Tarjan 1975; tight lower bound by Fredman–Saks). α is the inverse Ackermann function: α(n) ≤ 4 for n &lt; 2<sup>65536</sup>. Variants with the same bound: <b>path halving</b> (<code>parent[x] = parent[parent[x]]</code> each hop — one pass, no second loop) and <b>path splitting</b>.</p>
      <p><b>Recursive find</b> (<code>return parent[x] = find(parent[x])</code>) is elegant, but with union by rank the depth is ≤ log n so recursion is safe; <i>without</i> rank, a chain of 10<sup>6</sup> can overflow the stack before compression kicks in — prefer the iterative two-pass or halving version.</p>
      <p><b>Extensions:</b> (1) <i>weighted DSU</i> — store the offset/ratio to the parent to answer "a / b = ?" (Evaluate Division) or parity for bipartite-with-constraints; (2) <i>rollback DSU</i> (union by rank, <b>no</b> compression, keep a stack of changes) — supports undo, used for offline dynamic connectivity with deletions; (3) <i>DSU over keys</i> — use a <code>HashMap</code> from key to parent when ids are strings (emails) or sparse coordinates; (4) <i>persistent / parallel</i> DSU in graph-processing systems.</p>
      <p><b>Limits:</b> no deletion (process deletions in reverse as additions — "offline reverse" trick, e.g. Bricks Falling When Hit), no paths, no directed reachability (DSU is about undirected connectivity / equivalence relations).</p>
      <p><b>Real systems:</b> image segmentation and connected-component labelling in computer vision, clustering (single-linkage = Kruskal stopped early), network connectivity monitoring, compilers' type unification (Hindley–Milner), and de-duplicating user identities across devices.</p>`,
    aiEra: `<p><b>What AI changes:</b> a DSU class is 25 lines any assistant will generate, so the interview signal is <b>recognising</b> when a problem is "merge groups as information arrives" (accounts merge, similar string groups, sentence similarity, islands II) and defending the α(n) claim. Expect "why is this almost O(1)?" and "what if edges are deleted?".</p>
      <p><b>Use AI as a partner:</b> ask it to write a naive version (BFS after each union) and fuzz your DSU against it on random operation sequences; ask for the weighted-DSU variant and then derive the offset update yourself on paper. In data engineering, AI-generated entity-resolution pipelines often use DSU under the hood (link records that share an email/phone) — knowing DSU lets you spot when a single bad link merges millions of records ("giant component" bugs).</p>
      <p><b>Where AI goes wrong:</b> union of <code>a</code> and <code>b</code> instead of their <b>roots</b> (<code>parent[a] = b</code> — corrupts trees), forgetting to decrement the component count only on successful unions, recursive find on huge unbalanced chains, and using DSU for directed graphs. <b>What you must still own:</b> the rank/size argument, when DSU beats DFS (online additions), and the offline-reverse trick for deletions.</p>`,
    problems: [{
      title: 'Redundant Connection', level: 'Medium', tags: ['dsu', 'union find', 'cycle', 'tree'], companies: ['Google', 'Amazon', 'Bloomberg'],
      statement: `<p>A tree with n nodes (labelled 1..n) had <b>one extra edge</b> added. You get the n edges in order. Return the edge that can be removed so the result is a tree. If several answers exist, return the one that appears <b>last</b> in the input.</p>`,
      constraints: `3 ≤ n ≤ 1000, edges.length == n, no repeated edges, the graph is connected`,
      example: `<p>edges = [[1,2],[1,3],[2,3]] → <b>${H.c('r', '[2,3]')}</b>. After [1,2] and [1,3], nodes 2 and 3 are already connected through 1, so [2,3] closes the cycle 1–2–3.</p>`,
      brute: { why: `<p>For each edge from last to first: remove it and check (by DFS) whether the remaining graph is a connected tree. n checks × O(n) each = O(n²) = 10<sup>6</sup> — passes, but every check rebuilds the whole graph. DSU finds the answer in one pass.</p>`, code: `int[] redundantBrute(int[][] edges) {
    int n = edges.length;
    for (int skip = n - 1; skip >= 0; skip--) {
        List<List<Integer>> g = new ArrayList<>();
        for (int i = 0; i <= n; i++) g.add(new ArrayList<>());
        for (int i = 0; i < n; i++) if (i != skip) { g.get(edges[i][0]).add(edges[i][1]); g.get(edges[i][1]).add(edges[i][0]); }
        boolean[] seen = new boolean[n + 1];
        ArrayDeque<Integer> st = new ArrayDeque<>();
        st.push(1); seen[1] = true;
        int cnt = 1;
        while (!st.isEmpty()) for (int v : g.get(st.pop())) if (!seen[v]) { seen[v] = true; cnt++; st.push(v); }
        if (cnt == n) return edges[skip];          // n-1 edges + connected = tree
    }
    return new int[0];
}` },
      mcq: { q: 'Processing edges with DSU, when do you know an edge is redundant?', options: ['When find(u) == find(v) before the union', 'When rank[u] == rank[v]', 'When u or v has degree 3', 'When the edge is the last one in the list'], answer: 0, explain: 'If both endpoints already share a leader, a path between them already exists; adding this edge would create a cycle.' },
      hints: [`<p>Hint 1: Add edges one by one. The first edge whose two endpoints are <b>already connected</b> closes the only cycle.</p>`, `<p>Hint 2: "Already connected?" asked repeatedly while edges are only added → DSU.</p>`, `<p>Hint 3: Recipe: parent[i] = i for 1..n; for each edge [u, v]: if find(u) == find(v) return it; else union. Since there is exactly one extra edge, the first such edge is also the last one on the cycle in input order.</p>`],
      solution: {
        approach: `<p>Union edges in input order. The tree edges never connect two already-connected nodes; the extra edge is the first that does. Because the cycle's edges all appear before or at that point, it is also the last cycle edge in input order — exactly what is asked.</p>`,
        code: `class Solution {
    private int[] parent, rank;

    public int[] findRedundantConnection(int[][] edges) {
        int n = edges.length;
        parent = new int[n + 1];
        rank = new int[n + 1];
        for (int i = 1; i <= n; i++) parent[i] = i;
        for (int[] e : edges)
            if (!union(e[0], e[1])) return e;     // ends already connected → this edge closes the cycle
        return new int[0];
    }
    private int find(int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }   // path halving
        return x;
    }
    private boolean union(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;
        if (rank[ra] < rank[rb]) { int t = ra; ra = rb; rb = t; }
        parent[rb] = ra;
        if (rank[ra] == rank[rb]) rank[ra]++;
        return true;
    }
}`,
        alt: [{ lang: 'python', code: `def find_redundant(edges):
    parent = list(range(len(edges) + 1))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for u, v in edges:
        ru, rv = find(u), find(v)
        if ru == rv:
            return [u, v]
        parent[rv] = ru
    return []

print(find_redundant([[1, 2], [1, 3], [2, 3]]))                    # [2, 3]
print(find_redundant([[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]]))    # [1, 4]`, run: true }],
        dry: { head: ['edge', 'find(u)', 'find(v)', 'action'], rows: [['[1,2]', '1', '2', 'union → parent[2]=1'], ['[1,3]', '1', '3', 'union → parent[3]=1'], ['[2,3]', '1', '1', H.c('r', 'same leader → return [2,3]')]] },
        complexity: `<p>Time O(n · α(n)) ≈ O(n), space O(n).</p>`,
        followUps: ['Directed version (Redundant Connection II): a node may get two parents — handle the "two parents" and "cycle" cases separately', 'Return all edges that lie on the cycle', 'Edges arrive as a stream and you must report the first cycle-closing edge in real time']
      }
    }]
  });

  // ================= PRACTICE: Easy =================
  practice.push({
    title: 'Find if Path Exists in Graph', level: 'Easy', tags: ['bfs', 'dfs', 'dsu'], companies: ['Amazon', 'Microsoft'],
    statement: `<p>Given an undirected graph with <code>n</code> nodes (0..n−1) and an edge list, return true if there is a path from <code>source</code> to <code>destination</code>.</p>`,
    constraints: `1 ≤ n ≤ 2·10<sup>5</sup>, 0 ≤ edges.length ≤ 2·10<sup>5</sup>, no duplicate edges, no self-loops`,
    example: `<p>n = 6, edges = [[0,1],[0,2],[3,5],[5,4],[4,3]], source = 0, destination = 5 → <b>${H.c('r', 'false')}</b>. Nodes {0,1,2} and {3,4,5} are separate components; no road crosses between them.</p>`,
    brute: { why: `<p>Repeatedly sweep all edges, spreading a "reachable" flag across any edge with one reachable end, until nothing changes. Each sweep is O(E) and you may need up to V sweeps (a long chain listed in the worst order) → O(V·E) = 4·10<sup>10</sup>.</p>`, code: `boolean validPathBrute(int n, int[][] edges, int source, int destination) {
    boolean[] reach = new boolean[n];
    reach[source] = true;
    boolean changed = true;
    while (changed) {                                  // up to n sweeps
        changed = false;
        for (int[] e : edges) {
            if (reach[e[0]] != reach[e[1]]) { reach[e[0]] = reach[e[1]] = true; changed = true; }
        }
    }
    return reach[destination];
}` },
    mcq: { q: 'Only a yes/no answer is needed (not the shortest path). Which approaches are fine?', options: ['BFS, DFS or DSU — any of them in ~O(V + E)', 'Only Dijkstra', 'Only Floyd-Warshall', 'Topological sort'], answer: 0, explain: 'Reachability in an undirected graph is just "same component?". Any traversal or a DSU answers it in linear time.' },
    hints: [`<p>Hint 1: "Is there a path" = "are source and destination in the same connected component?".</p>`, `<p>Hint 2: BFS/DFS from source and check whether destination got marked — or union all edges with DSU and compare leaders.</p>`, `<p>Hint 3: Recipe: build adjacency list; iterative DFS with a stack from source; return true as soon as destination is popped/marked. Edge: source == destination → true. Use iterative DFS (n can be 2·10<sup>5</sup>).</p>`],
    solution: {
      approach: `<p>Iterative DFS from <code>source</code> with early exit. Iterative, because a path-shaped graph with 2·10<sup>5</sup> nodes would overflow a recursive Java DFS.</p>`,
      code: `class Solution {
    public boolean validPath(int n, int[][] edges, int source, int destination) {
        if (source == destination) return true;
        List<List<Integer>> g = new ArrayList<>();
        for (int i = 0; i < n; i++) g.add(new ArrayList<>());
        for (int[] e : edges) { g.get(e[0]).add(e[1]); g.get(e[1]).add(e[0]); }
        boolean[] seen = new boolean[n];
        ArrayDeque<Integer> st = new ArrayDeque<>();
        st.push(source);
        seen[source] = true;
        while (!st.isEmpty()) {
            int u = st.pop();
            for (int v : g.get(u)) {
                if (v == destination) return true;
                if (!seen[v]) { seen[v] = true; st.push(v); }
            }
        }
        return false;
    }
}`,
      alt: [{ lang: 'python', code: `def valid_path(n, edges, source, destination):
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for u, v in edges:
        parent[find(u)] = find(v)              # DSU version: no adjacency list needed
    return find(source) == find(destination)

print(valid_path(3, [[0, 1], [1, 2], [2, 0]], 0, 2))                       # True
print(valid_path(6, [[0, 1], [0, 2], [3, 5], [5, 4], [4, 3]], 0, 5))       # False`, run: true }],
      complexity: `<p>Time O(V + E), space O(V + E). DSU version: O((V + E)·α(V)) with only O(V) extra memory.</p>`,
      followUps: ['Answer 10<sup>5</sup> queries (s, d) on the same graph → label components once, O(1) per query', 'Directed graph: is d reachable from s? (DFS on directed edges; DSU no longer works)']
    }
  });

  practice.push({
    title: 'Flood Fill', level: 'Easy', tags: ['dfs', 'bfs', 'grid'], companies: ['Amazon', 'Google'],
    statement: `<p>An image is an R×C grid of colour values. Starting at pixel (sr, sc), change the colour of that pixel and every pixel 4-directionally connected to it <b>with the same original colour</b> to <code>color</code>. Return the image (the "paint bucket" tool).</p>`,
    constraints: `1 ≤ R, C ≤ 50, 0 ≤ values &lt; 2<sup>16</sup>`,
    example: `<p>image = [[1,1,1],[1,1,0],[1,0,1]], sr = 1, sc = 1, color = 2 → <b>${H.c('g', '[[2,2,2],[2,2,0],[2,0,1]]')}</b>. The bottom-right 1 is not connected to the start through 1s (only diagonally), so it stays 1.</p>`,
    brute: { why: `<p>Repeatedly scan the whole image and recolour any original-coloured pixel next to an already-recoloured pixel, until no change. Each scan is O(R·C) and you may need O(R·C) scans (a snake-shaped region) → O((R·C)²). Wasted work: rescanning pixels far away from the "paint front".</p>`, code: `int[][] floodBrute(int[][] img, int sr, int sc, int color) {
    int old = img[sr][sc], R = img.length, C = img[0].length;
    if (old == color) return img;
    boolean[][] painted = new boolean[R][C];
    painted[sr][sc] = true;
    boolean changed = true;
    while (changed) {
        changed = false;
        for (int r = 0; r < R; r++)
            for (int c = 0; c < C; c++) {
                if (painted[r][c] || img[r][c] != old) continue;
                if ((r > 0 && painted[r - 1][c]) || (r + 1 < R && painted[r + 1][c]) || (c > 0 && painted[r][c - 1]) || (c + 1 < C && painted[r][c + 1])) {
                    painted[r][c] = true; changed = true;
                }
            }
    }
    for (int r = 0; r < R; r++) for (int c = 0; c < C; c++) if (painted[r][c]) img[r][c] = color;
    return img;
}` },
    mcq: { q: 'The new colour equals the old colour. What happens to a naive DFS that uses "pixel has old colour" as the visited test?', options: ['It recurses forever (StackOverflowError), because painting does not change anything', 'It works fine', 'It paints the whole image', 'It returns an empty image'], answer: 0, explain: 'Painted pixels still have the old colour, so they look unvisited and get re-entered forever. Return early when old == color.' },
    hints: [`<p>Hint 1: The region to paint is the connected component of the start pixel among pixels of the original colour.</p>`, `<p>Hint 2: DFS from (sr, sc); the recolouring itself acts as the visited mark.</p>`, `<p>Hint 3: Recipe: old = image[sr][sc]; if old == color return; dfs(r, c): if out of bounds or image[r][c] != old return; image[r][c] = color; recurse 4 ways.</p>`],
    solution: {
      approach: `<p>DFS flood fill. Painting a pixel immediately changes its colour, so it will never match <code>old</code> again — no separate visited array needed, as long as we return early when the colours are equal.</p>`,
      code: `class Solution {
    public int[][] floodFill(int[][] image, int sr, int sc, int color) {
        int old = image[sr][sc];
        if (old != color) paint(image, sr, sc, old, color);
        return image;
    }
    private void paint(int[][] img, int r, int c, int old, int color) {
        if (r < 0 || c < 0 || r >= img.length || c >= img[0].length || img[r][c] != old) return;
        img[r][c] = color;                       // doubles as "visited"
        paint(img, r + 1, c, old, color);
        paint(img, r - 1, c, old, color);
        paint(img, r, c + 1, old, color);
        paint(img, r, c - 1, old, color);
    }
}`,
      complexity: `<p>Time O(R·C), space O(R·C) recursion depth in the worst case (for 50×50 that is 2500 frames — fine; use an explicit stack for big images).</p>`,
      followUps: ['8-directional fill', 'Return only the size of the painted region', 'Huge images: scan-line flood fill (paint whole horizontal runs at once)']
    }
  });

  practice.push({
    title: 'Find Center of Star Graph', level: 'Easy', tags: ['graph', 'degree'], companies: ['Microsoft'],
    statement: `<p>An undirected <b>star</b> graph has n nodes labelled 1..n: one center node connected to every other node, and no other edges. Given its n − 1 edges, return the center.</p>`,
    constraints: `3 ≤ n ≤ 10<sup>5</sup>, edges.length == n − 1, the input is a valid star`,
    example: `<p>edges = [[1,2],[2,3],[4,2]] → <b>${H.c('g', '2')}</b>: node 2 appears in every edge (degree n − 1 = 3).</p>`,
    brute: { why: `<p>Count the degree of every node (O(n) time and memory) and return the one with degree n − 1. Correct and linear, but it ignores the structure: the center appears in <i>every</i> edge, so two edges are enough.</p>`, code: `int centerBrute(int[][] edges) {
    int n = edges.length + 1;
    int[] deg = new int[n + 1];
    for (int[] e : edges) { deg[e[0]]++; deg[e[1]]++; }
    for (int v = 1; v <= n; v++) if (deg[v] == n - 1) return v;
    return -1;
}` },
    mcq: { q: 'What is the minimum number of edges you must read to find the center?', options: ['2', '1', 'n / 2', 'n − 1'], answer: 0, explain: 'The center is the only node shared by any two edges. One edge leaves two candidates; a second edge breaks the tie.' },
    hints: [`<p>Hint 1: Every single edge of a star touches the center node.</p>`, `<p>Hint 2: So the center is the common endpoint of the first two edges.</p>`, `<p>Hint 3: Return edges[0][0] if it equals edges[1][0] or edges[1][1]; otherwise return edges[0][1].</p>`],
    solution: {
      approach: `<p>Degree reasoning without counting: the center has degree n − 1 and every leaf has degree 1, so the only node appearing in both of the first two edges is the center.</p>`,
      code: `class Solution {
    public int findCenter(int[][] edges) {
        int a = edges[0][0], b = edges[0][1];
        return (a == edges[1][0] || a == edges[1][1]) ? a : b;
    }
}`,
      complexity: `<p>Time O(1), space O(1).</p>`,
      followUps: ['Validate that the input really is a star (check all degrees)', 'Find the center(s) of a general tree (the 1 or 2 nodes minimising the max distance — peel leaves level by level, Kahn-style)']
    }
  });

  practice.push({
    title: 'Island Perimeter', level: 'Easy', tags: ['grid', 'counting', 'dfs'], companies: ['Google', 'Meta', 'Amazon'],
    statement: `<p>A grid has exactly one island (land = 1, water = 0, no lakes inside). Each cell is a 1×1 square. Return the perimeter of the island.</p>`,
    constraints: `1 ≤ R, C ≤ 100`,
    example: `<p>grid = [[0,1,0,0],[1,1,1,0],[0,1,0,0],[1,1,0,0]] → <b>${H.c('g', '16')}</b>. 7 land cells × 4 sides = 28, minus 2 for each of the 6 shared land–land edges (28 − 12 = 16).</p>`,
    brute: { why: `<p>DFS over the island, and for each land cell look at its 4 sides, adding 1 for every side that touches water or the border. That is already O(R·C) — the "brute" cost here is the recursion and visited bookkeeping, which pure counting avoids.</p>`, code: `int perimeterDfs(int[][] g) {
    for (int r = 0; r < g.length; r++)
        for (int c = 0; c < g[0].length; c++)
            if (g[r][c] == 1) return dfs(g, r, c);
    return 0;
}
int dfs(int[][] g, int r, int c) {
    if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] == 0) return 1;   // crossed a border side
    if (g[r][c] == 2) return 0;                                                          // already visited
    g[r][c] = 2;
    return dfs(g, r + 1, c) + dfs(g, r - 1, c) + dfs(g, r, c + 1) + dfs(g, r, c - 1);
}` },
    mcq: { q: 'Land cells L = 5 and shared edges between land cells S = 4. Perimeter?', options: ['4L − 2S = 12', '4L − S = 16', '4L = 20', 'L + S = 9'], answer: 0, explain: 'Each shared edge hides one side of each of its two cells, so subtract 2 per shared edge.' },
    hints: [`<p>Hint 1: Every land cell contributes 4 sides, except sides shared with another land cell.</p>`, `<p>Hint 2: Count land cells L and land–land adjacencies S, looking only up and left to count each adjacency once.</p>`, `<p>Hint 3: Answer = 4·L − 2·S. No traversal needed — the grid is an implicit graph and this is just the handshake idea on cells.</p>`],
    solution: {
      approach: `<p>Edge counting on the implicit grid graph: perimeter = 4 × (land cells) − 2 × (land–land edges). Checking only the top and left neighbours counts each shared edge exactly once.</p>`,
      code: `class Solution {
    public int islandPerimeter(int[][] grid) {
        int land = 0, shared = 0;
        for (int r = 0; r < grid.length; r++)
            for (int c = 0; c < grid[0].length; c++) {
                if (grid[r][c] != 1) continue;
                land++;
                if (r > 0 && grid[r - 1][c] == 1) shared++;   // edge with the cell above
                if (c > 0 && grid[r][c - 1] == 1) shared++;   // edge with the cell to the left
            }
        return 4 * land - 2 * shared;
    }
}`,
      dry: { head: ['cell', 'land', 'shared (up/left)'], rows: [['(0,1)', '1', '0'], ['(1,0),(1,1),(1,2)', '4', '0+2+1 → 3'], ['(2,1)', '5', '4'], ['(3,0),(3,1)', '7', '4+0+2 → 6 → 28 − 12 = 16']] },
      complexity: `<p>Time O(R·C), space O(1).</p>`,
      followUps: ['Several islands: return the perimeter of each (component labelling + counting)', 'Lakes inside the island count as perimeter too — what changes? (nothing: the formula already counts them)']
    }
  });

  // ================= PRACTICE: Medium =================
  practice.push({
    title: 'Number of Provinces', level: 'Medium', tags: ['dfs', 'dsu', 'adjacency matrix', 'components'], companies: ['Amazon', 'Goldman Sachs', 'Bloomberg'],
    statement: `<p>There are n cities. <code>isConnected[i][j] = 1</code> if city i and city j are directly connected (an <b>adjacency matrix</b>). A province is a group of directly or indirectly connected cities. Return the number of provinces.</p>`,
    constraints: `1 ≤ n ≤ 200, isConnected[i][i] = 1, the matrix is symmetric`,
    example: `<p>isConnected = [[1,1,0],[1,1,0],[0,0,1]] → <b>${H.c('g', '2')}</b>: {0,1} and {2}.</p>`,
    brute: { why: `<p>Compute the full transitive closure with Floyd–Warshall style triple loops (reach[i][j] |= reach[i][k] &amp;&amp; reach[k][j]) and then count distinct rows. O(n³) = 8·10<sup>6</sup> — works for n = 200 but explodes for larger n, and it computes far more than needed.</p>`, code: `int provincesBrute(int[][] m) {
    int n = m.length;
    boolean[][] reach = new boolean[n][n];
    for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) reach[i][j] = m[i][j] == 1;
    for (int k = 0; k < n; k++)
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (reach[i][k] && reach[k][j]) reach[i][j] = true;
    int count = 0;
    boolean[] done = new boolean[n];
    for (int i = 0; i < n; i++) {
        if (done[i]) continue;
        count++;
        for (int j = 0; j < n; j++) if (reach[i][j]) done[j] = true;
    }
    return count;
}` },
    mcq: { q: 'The graph is given as an n×n matrix. What is the cost of a DFS over it?', options: ['O(n²) — scanning a row to find neighbours costs n', 'O(n + E)', 'O(n log n)', 'O(n³)'], answer: 0, explain: 'With a matrix, listing the neighbours of one node is a full row scan, so a full traversal is O(V²), which here equals the input size.' },
    hints: [`<p>Hint 1: Provinces = connected components. The input is an adjacency matrix rather than an edge list.</p>`, `<p>Hint 2: Loop over cities; each unvisited city starts a new province and a DFS that scans its matrix row for neighbours.</p>`, `<p>Hint 3: Or DSU: union(i, j) for every i &lt; j with isConnected[i][j] == 1, and count successful unions: answer = n − unions.</p>`],
    solution: {
      approach: `<p>Count connected components with DFS over the matrix (neighbours of i = every j with a 1 in row i). An equally good alternative is DSU, shown in Python.</p>`,
      code: `class Solution {
    public int findCircleNum(int[][] isConnected) {
        int n = isConnected.length, provinces = 0;
        boolean[] seen = new boolean[n];
        ArrayDeque<Integer> st = new ArrayDeque<>();
        for (int s = 0; s < n; s++) {
            if (seen[s]) continue;
            provinces++;
            seen[s] = true;
            st.push(s);
            while (!st.isEmpty()) {
                int u = st.pop();
                for (int v = 0; v < n; v++)
                    if (isConnected[u][v] == 1 && !seen[v]) { seen[v] = true; st.push(v); }
            }
        }
        return provinces;
    }
}`,
      alt: [{ lang: 'python', code: `def find_circle_num(m):
    n = len(m)
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    comps = n
    for i in range(n):
        for j in range(i + 1, n):
            if m[i][j] and find(i) != find(j):
                parent[find(i)] = find(j)
                comps -= 1
    return comps

print(find_circle_num([[1, 1, 0], [1, 1, 0], [0, 0, 1]]))  # 2`, run: true }],
      complexity: `<p>Time O(n²) (the size of the matrix), space O(n).</p>`,
      followUps: ['Input as an edge list with n = 10<sup>5</sup> → adjacency list or DSU', 'Report the size of each province']
    }
  });

  practice.push({
    title: '01 Matrix (distance to nearest 0)', level: 'Medium', tags: ['multi-source bfs', 'grid'], companies: ['Amazon', 'Google', 'Uber'],
    statement: `<p>Given an R×C binary matrix, return a matrix where each cell holds the distance (in 4-directional steps) to the nearest 0.</p>`,
    constraints: `1 ≤ R·C ≤ 10<sup>4</sup> (design for 10<sup>6</sup>), at least one 0 exists`,
    example: `<p>mat = [[0,0,0],[0,1,0],[1,1,1]] → <b>${H.c('g', '[[0,0,0],[0,1,0],[1,2,1]]')}</b>. The bottom middle cell is 2 steps from the nearest 0 (up twice).</p>`,
    brute: { why: `<p>Run a separate BFS from every 1-cell until it finds a 0. Each BFS is O(R·C) → O((R·C)²) = 10<sup>8</sup> for 10<sup>4</sup> cells and 10<sup>12</sup> for a 1000×1000 grid. The waste: neighbouring cells repeat nearly identical searches.</p>`, code: `int[][] nearestBrute(int[][] mat) {
    int R = mat.length, C = mat[0].length;
    int[][] out = new int[R][C];
    int[] dr = {-1, 1, 0, 0}, dc = {0, 0, -1, 1};
    for (int r = 0; r < R; r++)
        for (int c = 0; c < C; c++) {
            if (mat[r][c] == 0) continue;
            boolean[][] seen = new boolean[R][C];        // a fresh BFS for every single cell
            ArrayDeque<int[]> q = new ArrayDeque<>();
            q.add(new int[]{r, c, 0}); seen[r][c] = true;
            while (!q.isEmpty()) {
                int[] p = q.poll();
                if (mat[p[0]][p[1]] == 0) { out[r][c] = p[2]; break; }
                for (int d = 0; d < 4; d++) {
                    int nr = p[0] + dr[d], nc = p[1] + dc[d];
                    if (nr >= 0 && nc >= 0 && nr < R && nc < C && !seen[nr][nc]) { seen[nr][nc] = true; q.add(new int[]{nr, nc, p[2] + 1}); }
                }
            }
        }
    return out;
}` },
    mcq: { q: 'Which cells go into the queue first?', options: ['All 0 cells (the targets), at distance 0', 'All 1 cells', 'Only the top-left cell', 'One random 0 cell'], answer: 0, explain: 'Reverse the question: spread outward from every 0 at once. Each 1 is reached first by its nearest 0 — multi-source BFS.' },
    hints: [`<p>Hint 1: Instead of searching from each 1 to a 0, spread from all 0s simultaneously.</p>`, `<p>Hint 2: Multi-source BFS: queue all zeros with dist 0, mark all ones as -1 (unknown).</p>`, `<p>Hint 3: Pop (r, c); for each in-bounds neighbour with dist -1: dist = dist[r][c] + 1, push. Each cell is finalised the first time it is reached.</p>`],
    solution: {
      approach: `<p>Multi-source BFS from every zero. The BFS invariant guarantees each cell is first reached by its nearest zero, so one pass of O(R·C) gives all distances. (A two-pass DP — top-left then bottom-right sweeps — also works in O(R·C) with O(1) extra space.)</p>`,
      code: `class Solution {
    public int[][] updateMatrix(int[][] mat) {
        int R = mat.length, C = mat[0].length;
        int[][] dist = new int[R][C];
        int[] q = new int[R * C];
        int head = 0, tail = 0;
        for (int r = 0; r < R; r++)
            for (int c = 0; c < C; c++) {
                if (mat[r][c] == 0) q[tail++] = r * C + c;
                else dist[r][c] = -1;
            }
        int[] dr = {-1, 1, 0, 0}, dc = {0, 0, -1, 1};
        while (head < tail) {
            int cur = q[head++], r = cur / C, c = cur % C;
            for (int d = 0; d < 4; d++) {
                int nr = r + dr[d], nc = c + dc[d];
                if (nr < 0 || nc < 0 || nr >= R || nc >= C || dist[nr][nc] != -1) continue;
                dist[nr][nc] = dist[r][c] + 1;
                q[tail++] = nr * C + nc;
            }
        }
        return dist;
    }
}`,
      complexity: `<p>Time O(R·C), space O(R·C) for the queue (array-based: each cell enters once).</p>`,
      followUps: ['Distance to the nearest 1 using 8 directions', 'Walls and Gates (-1 walls, 0 gates, INF rooms)', 'As Far from Land as Possible — the maximum of this distance matrix']
    }
  });

  practice.push({
    title: 'Surrounded Regions', level: 'Medium', tags: ['dfs', 'bfs', 'grid', 'border flood fill'], companies: ['Google', 'Amazon', 'Uber'],
    statement: `<p>Given a board of 'X' and 'O', capture every region of 'O' that is completely surrounded by 'X' (flip those 'O' to 'X'). An 'O' region touching the <b>border</b> is not surrounded and must stay.</p>`,
    constraints: `1 ≤ R, C ≤ 200`,
    example: `<p>board =<br>X X X X<br>X O O X<br>X X O X<br>X <b>O</b> X X<br>→ the middle O's become X; the O at (3,1) is on the border so it ${H.c('g', 'survives')}.</p>`,
    brute: { why: `<p>For every 'O' region, flood fill it and check whether any of its cells touches the border; if not, flip it. Done naively (a fresh BFS from <i>each O cell</i>), that is O((R·C)²). The waste: we keep re-exploring the same region.</p>`, code: `void solveBrute(char[][] b) {
    int R = b.length, C = b[0].length;
    int[] dr = {-1, 1, 0, 0}, dc = {0, 0, -1, 1};
    List<int[]> flip = new ArrayList<>();
    for (int r = 0; r < R; r++)
        for (int c = 0; c < C; c++) {
            if (b[r][c] != 'O') continue;
            boolean[][] seen = new boolean[R][C];           // fresh search per O cell
            ArrayDeque<int[]> q = new ArrayDeque<>();
            q.add(new int[]{r, c}); seen[r][c] = true;
            boolean escapes = false;
            while (!q.isEmpty() && !escapes) {
                int[] p = q.poll();
                if (p[0] == 0 || p[1] == 0 || p[0] == R - 1 || p[1] == C - 1) escapes = true;
                for (int d = 0; d < 4; d++) {
                    int nr = p[0] + dr[d], nc = p[1] + dc[d];
                    if (nr >= 0 && nc >= 0 && nr < R && nc < C && !seen[nr][nc] && b[nr][nc] == 'O') { seen[nr][nc] = true; q.add(new int[]{nr, nc}); }
                }
            }
            if (!escapes) flip.add(new int[]{r, c});
        }
    for (int[] p : flip) b[p[0]][p[1]] = 'X';
}` },
    mcq: { q: 'What is the cleanest way to find the O cells that must NOT be flipped?', options: ['Flood fill from every O on the border and mark what you reach as safe', 'Flood fill from the center of the board', 'Flip every O, then undo', 'Sort the O cells by distance to the center'], answer: 0, explain: 'Reverse thinking: an O survives iff it is connected to a border O. Mark those from the border inward, then flip everything else.' },
    hints: [`<p>Hint 1: Think in reverse: which O's survive? Exactly those connected to the border.</p>`, `<p>Hint 2: DFS/BFS from each border 'O', temporarily marking reached cells as '#'.</p>`, `<p>Hint 3: Final sweep: 'O' → 'X' (captured), '#' → 'O' (restore survivors). Use an explicit stack for 200×200 to be safe.</p>`],
    solution: {
      approach: `<p>Border flood fill. Mark every O reachable from the border as safe ('#'). Every O that remains is enclosed → flip to X. Then turn '#' back into 'O'. Each cell is visited a constant number of times.</p>`,
      code: `class Solution {
    public void solve(char[][] board) {
        int R = board.length, C = board[0].length;
        ArrayDeque<int[]> st = new ArrayDeque<>();
        for (int r = 0; r < R; r++) for (int c = 0; c < C; c++)
            if ((r == 0 || c == 0 || r == R - 1 || c == C - 1) && board[r][c] == 'O') { board[r][c] = '#'; st.push(new int[]{r, c}); }
        int[] dr = {-1, 1, 0, 0}, dc = {0, 0, -1, 1};
        while (!st.isEmpty()) {
            int[] p = st.pop();
            for (int d = 0; d < 4; d++) {
                int nr = p[0] + dr[d], nc = p[1] + dc[d];
                if (nr < 0 || nc < 0 || nr >= R || nc >= C || board[nr][nc] != 'O') continue;
                board[nr][nc] = '#';                       // safe: connected to the border
                st.push(new int[]{nr, nc});
            }
        }
        for (int r = 0; r < R; r++) for (int c = 0; c < C; c++)
            board[r][c] = board[r][c] == '#' ? 'O' : 'X';  // captured O → X, safe # → O
    }
}`,
      complexity: `<p>Time O(R·C), space O(R·C) for the stack in the worst case.</p>`,
      followUps: ['Number of Enclaves: count land cells that cannot walk off the grid (same trick)', 'Number of Closed Islands', 'Do it with DSU and a virtual "border" node']
    }
  });

  practice.push({
    title: 'Possible Bipartition', level: 'Medium', tags: ['bipartite', 'bfs', 'dsu'], companies: ['Google', 'Meta'],
    statement: `<p>Split n people (1..n) into two groups of any size. <code>dislikes[i] = [a, b]</code> means a and b must not be in the same group. Return true if such a split is possible.</p>`,
    constraints: `1 ≤ n ≤ 2000, 0 ≤ dislikes.length ≤ 10<sup>4</sup>, pairs distinct`,
    example: `<p>n = 3, dislikes = [[1,2],[1,3],[2,3]] → <b>${H.c('r', 'false')}</b>: 1, 2, 3 all dislike each other — a triangle (odd cycle) cannot be 2-coloured.</p>`,
    brute: { why: `<p>Try all 2<sup>n</sup> group assignments and check every dislike pair: O(2<sup>n</sup>·m). Already hopeless at n = 40. The insight that removes the search: once one person's group is fixed, everyone connected to them is forced.</p>`, code: `boolean bipartitionBrute(int n, int[][] dislikes) {   // n <= ~20 only
    for (int mask = 0; mask < (1 << n); mask++) {
        boolean ok = true;
        for (int[] d : dislikes)
            if (((mask >> (d[0] - 1)) & 1) == ((mask >> (d[1] - 1)) & 1)) { ok = false; break; }
        if (ok) return true;
    }
    return false;
}` },
    mcq: { q: 'Dislikes form a cycle of length 4: 1-2, 2-3, 3-4, 4-1. Possible?', options: ['Yes: {1,3} and {2,4}', 'No, any cycle is impossible', 'Only if n is even', 'Cannot tell without more info'], answer: 0, explain: 'Only odd cycles break bipartiteness. An even cycle alternates groups perfectly.' },
    hints: [`<p>Hint 1: People = nodes, dislikes = edges. Two groups with no internal edge = bipartite graph.</p>`, `<p>Hint 2: BFS 2-colouring from every uncoloured person (the graph may be disconnected).</p>`, `<p>Hint 3: Remember 1-indexing (allocate n + 1). Neighbour uncoloured → opposite colour; same colour → false.</p>`],
    solution: {
      approach: `<p>Build the dislike graph and run BFS 2-colouring per component; any edge with equal colours proves an odd cycle → impossible.</p>`,
      code: `class Solution {
    public boolean possibleBipartition(int n, int[][] dislikes) {
        List<List<Integer>> g = new ArrayList<>();
        for (int i = 0; i <= n; i++) g.add(new ArrayList<>());
        for (int[] d : dislikes) { g.get(d[0]).add(d[1]); g.get(d[1]).add(d[0]); }
        int[] color = new int[n + 1];                   // 0 none, 1 / 2 groups
        ArrayDeque<Integer> q = new ArrayDeque<>();
        for (int s = 1; s <= n; s++) {
            if (color[s] != 0) continue;
            color[s] = 1;
            q.offer(s);
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int v : g.get(u)) {
                    if (color[v] == 0) { color[v] = 3 - color[u]; q.offer(v); }
                    else if (color[v] == color[u]) return false;
                }
            }
        }
        return true;
    }
}`,
      complexity: `<p>Time O(n + m), space O(n + m).</p>`,
      followUps: ['Return the two groups', 'Some pairs must be in the SAME group too → DSU with parity', 'Minimise the size difference between groups (each component can flip → subset-sum DP)']
    }
  });

  practice.push({
    title: 'Number of Operations to Make Network Connected', level: 'Medium', tags: ['dsu', 'components'], companies: ['Amazon', 'Microsoft'],
    statement: `<p>n computers (0..n−1) are joined by cables <code>connections[i] = [a, b]</code>. You may unplug any cable and re-plug it between any two computers. Return the minimum number of moves to connect all computers, or -1 if impossible.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup>, 1 ≤ connections.length ≤ min(n(n−1)/2, 10<sup>5</sup>)`,
    example: `<p>n = 4, connections = [[0,1],[0,2],[1,2]] → <b>${H.c('g', '1')}</b>. Cable [1,2] is redundant (0,1,2 are already connected); move it to connect computer 3. Components = 2 → 1 move.</p>`,
    brute: { why: `<p>Check every cable for redundancy by removing it and running a BFS (does a path still join its ends?), count the components the slow way, then compare. That is O(E·(V + E)) ≈ 10<sup>10</sup> for 10<sup>5</sup> cables. The insight: you never need to know <i>which</i> cables are redundant — counting is enough.</p>`, code: `int makeConnectedBrute(int n, int[][] connections) {
    int redundant = 0;
    for (int skip = 0; skip < connections.length; skip++)             // is cable 'skip' redundant?
        if (connectedWithout(n, connections, skip, connections[skip][0], connections[skip][1])) redundant++;
    int comps = 0;
    boolean[] seen = new boolean[n];
    for (int s = 0; s < n; s++) {                                       // count components (slow BFS over the edge list)
        if (seen[s]) continue;
        comps++;
        ArrayDeque<Integer> q = new ArrayDeque<>(List.of(s));
        seen[s] = true;
        while (!q.isEmpty()) {
            int u = q.poll();
            for (int[] c : connections) {
                int v = c[0] == u ? c[1] : c[1] == u ? c[0] : -1;
                if (v >= 0 && !seen[v]) { seen[v] = true; q.add(v); }
            }
        }
    }
    return redundant >= comps - 1 ? comps - 1 : -1;
}
boolean connectedWithout(int n, int[][] cs, int skip, int a, int b) {     // one full BFS per cable: O(E * (V + E))
    boolean[] seen = new boolean[n];
    ArrayDeque<Integer> q = new ArrayDeque<>(List.of(a));
    seen[a] = true;
    while (!q.isEmpty()) {
        int u = q.poll();
        if (u == b) return true;
        for (int i = 0; i < cs.length; i++) {
            if (i == skip) continue;
            int v = cs[i][0] == u ? cs[i][1] : cs[i][1] == u ? cs[i][0] : -1;
            if (v >= 0 && !seen[v]) { seen[v] = true; q.add(v); }
        }
    }
    return false;
}` },
    mcq: { q: 'There are k components and enough cables. How many moves are needed?', options: ['k − 1', 'k', 'number of redundant cables', 'n − 1'], answer: 0, explain: 'Each move can join two components, so k − 1 moves suffice and are necessary. Feasibility only needs E ≥ n − 1 (a spanning tree needs n − 1 cables).' },
    hints: [`<p>Hint 1: If there are fewer than n − 1 cables, connecting n computers is impossible → -1.</p>`, `<p>Hint 2: Otherwise there are always enough redundant cables; you need exactly (components − 1) moves.</p>`, `<p>Hint 3: Count components with DSU: start at n, decrement on each successful union.</p>`],
    solution: {
      approach: `<p>Counting argument + DSU. With E ≥ n − 1, the number of redundant cables (E − (n − components)) is always ≥ components − 1, so the answer is components − 1.</p>`,
      code: `class Solution {
    int[] parent;
    int find(int x) { while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }

    public int makeConnected(int n, int[][] connections) {
        if (connections.length < n - 1) return -1;       // not enough cables in total
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        int comps = n;
        for (int[] c : connections) {
            int a = find(c[0]), b = find(c[1]);
            if (a != b) { parent[a] = b; comps--; }
        }
        return comps - 1;
    }
}`,
      complexity: `<p>Time O((n + E)·α(n)), space O(n).</p>`,
      followUps: ['Return which cables to move and where', 'Cables have costs and you want the cheapest network → Kruskal MST (Graphs II)']
    }
  });

  practice.push({
    title: 'Accounts Merge', level: 'Medium', tags: ['dsu', 'hashmap', 'dfs'], companies: ['Meta', 'Google', 'Amazon', 'LinkedIn'],
    statement: `<p>Each account is <code>[name, email1, email2, …]</code>. Two accounts belong to the same person if they share <b>any</b> email (names can repeat for different people). Merge accounts and return each person as <code>[name, sorted emails…]</code>, in any order.</p>`,
    constraints: `1 ≤ accounts.length ≤ 1000, 2 ≤ accounts[i].length ≤ 10, email length ≤ 30`,
    example: `<p>[["John","a@m","b@m"], ["John","b@m","c@m"], ["Mary","m@m"], ["John","x@m"]] → <b>${H.c('g', '[["John","a@m","b@m","c@m"], ["Mary","m@m"], ["John","x@m"]]')}</b>. The first two share b@m. The last John shares nothing, so he is a different person.</p>`,
    brute: { why: `<p>Compare every pair of accounts for a shared email and merge repeatedly until nothing changes: O(A²·L²) per round and up to A rounds. Wasted work: the transitive chains (A shares with B, B with C) force many rounds.</p>`, code: `List<List<String>> mergeBrute(List<List<String>> accounts) {
    List<Set<String>> sets = new ArrayList<>();
    List<String> names = new ArrayList<>();
    for (List<String> a : accounts) { names.add(a.get(0)); sets.add(new TreeSet<>(a.subList(1, a.size()))); }
    boolean merged = true;
    while (merged) {                                       // keep merging pairs until stable
        merged = false;
        outer:
        for (int i = 0; i < sets.size(); i++)
            for (int j = i + 1; j < sets.size(); j++)
                if (!Collections.disjoint(sets.get(i), sets.get(j))) {
                    sets.get(i).addAll(sets.remove(j)); names.remove(j);
                    merged = true; break outer;
                }
    }
    List<List<String>> res = new ArrayList<>();
    for (int i = 0; i < sets.size(); i++) { List<String> row = new ArrayList<>(); row.add(names.get(i)); row.addAll(sets.get(i)); res.add(row); }
    return res;
}` },
    mcq: { q: 'What should be the DSU elements?', options: ['Account indices (union accounts that share an email, via an email → first-account map)', 'Names', 'Characters of emails', 'Pairs of names'], answer: 0, explain: 'Names are not unique identifiers. Map each email to the first account index that owned it; when another account has the same email, union the two indices.' },
    hints: [`<p>Hint 1: "Share any email ⇒ same person" is transitive grouping → connected components / DSU.</p>`, `<p>Hint 2: Keep <code>Map&lt;String, Integer&gt; owner</code> from email to the first account index; union the current account with the owner when an email repeats.</p>`, `<p>Hint 3: Finally group emails by find(owner[email]) into TreeSets, prepend the name of that root account.</p>`],
    solution: {
      approach: `<p>DSU over account indices. One pass over all emails unions accounts sharing an email. A second pass buckets each email under its root account; sorting each bucket gives the output.</p>`,
      code: `class Solution {
    int[] parent;
    int find(int x) { while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }

    public List<List<String>> accountsMerge(List<List<String>> accounts) {
        int n = accounts.size();
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        Map<String, Integer> owner = new HashMap<>();
        for (int i = 0; i < n; i++)
            for (int k = 1; k < accounts.get(i).size(); k++) {
                String email = accounts.get(i).get(k);
                Integer j = owner.putIfAbsent(email, i);
                if (j != null) parent[find(i)] = find(j);    // same email → same person
            }
        Map<Integer, TreeSet<String>> groups = new HashMap<>();
        for (Map.Entry<String, Integer> e : owner.entrySet())
            groups.computeIfAbsent(find(e.getValue()), k -> new TreeSet<>()).add(e.getKey());
        List<List<String>> res = new ArrayList<>();
        for (Map.Entry<Integer, TreeSet<String>> g : groups.entrySet()) {
            List<String> row = new ArrayList<>();
            row.add(accounts.get(g.getKey()).get(0));
            row.addAll(g.getValue());
            res.add(row);
        }
        return res;
    }
}`,
      complexity: `<p>Time O(S log S) where S = total number of emails (sorting dominates; DSU work is O(S·α)). Space O(S).</p>`,
      followUps: ['Billions of records across machines (entity resolution with distributed union-find / connected components)', 'Use DFS on an email graph instead of DSU — compare memory', 'What if one bad shared email (like "noreply@") merges millions of accounts? (block high-degree keys)']
    }
  });

  practice.push({
    title: 'Find Eventual Safe States', level: 'Medium', tags: ['directed graph', 'cycle detection', 'topological sort'], companies: ['Google', 'Amazon'],
    statement: `<p>A directed graph has n nodes; <code>graph[i]</code> lists the nodes i points to. A node is <b>terminal</b> if it has no outgoing edges. A node is <b>safe</b> if every path starting from it ends at a terminal node (it can never get stuck in a cycle). Return all safe nodes in ascending order.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>4</sup>, total edges ≤ 4·10<sup>4</sup>, self-loops possible`,
    example: `<p>graph = [[1,2],[2,3],[5],[0],[5],[],[]] → <b>${H.c('g', '[2,4,5,6]')}</b>. 0 → 1 → 3 → 0 is a cycle, so 0, 1, 3 are unsafe. 2 only reaches 5 (terminal), 4 reaches 5, and 5, 6 are terminal.</p>`,
    brute: { why: `<p>For each node, run a DFS that explores every path and checks whether any of them revisits a node on the current path. Without memoisation each node's DFS is O(V + E) → O(V·(V + E)) = 5·10<sup>8</sup>, and without a visited set it can be exponential.</p>`, code: `List<Integer> safeBrute(int[][] graph) {
    List<Integer> res = new ArrayList<>();
    for (int s = 0; s < graph.length; s++)
        if (!reachesCycle(graph, s, new boolean[graph.length], new boolean[graph.length])) res.add(s);
    return res;
}
boolean reachesCycle(int[][] g, int u, boolean[] onPath, boolean[] done) {   // fresh arrays per start node
    if (onPath[u]) return true;
    if (done[u]) return false;
    onPath[u] = true;
    for (int v : g[u]) if (reachesCycle(g, v, onPath, done)) return true;
    onPath[u] = false;
    done[u] = true;
    return false;
}` },
    mcq: { q: 'In the three-colour DFS, which nodes are safe?', options: ['Nodes that finish black without ever reaching a grey node', 'All grey nodes', 'Nodes with in-degree 0', 'Nodes visited first'], answer: 0, explain: 'A node is unsafe iff it can reach a cycle. If its DFS ever hits a grey node, it (and everything on the current path) is unsafe; otherwise it finishes black and is safe. Memoising the colours makes the whole thing O(V + E).' },
    hints: [`<p>Hint 1: Unsafe = can reach a cycle. Safe = every path ends at a terminal node.</p>`, `<p>Hint 2: Option A: three-colour DFS with memo (grey stays grey if it hits a cycle). Option B: reverse all edges and run Kahn from terminal nodes (out-degree 0).</p>`, `<p>Hint 3: Reverse-Kahn recipe: outdeg[i] = graph[i].length; queue all nodes with outdeg 0; pop v, for each u that points to v: outdeg[u]--, if 0 push. Popped nodes are safe; sort them.</p>`],
    solution: {
      approach: `<p>Three-colour DFS with memoisation: colour 1 (grey) = in progress or known unsafe, 2 (black) = safe. When a DFS hits grey, return unsafe and leave the current path grey forever (they all can reach that cycle). Each node is resolved once.</p>`,
      code: `class Solution {
    public List<Integer> eventualSafeNodes(int[][] graph) {
        int n = graph.length;
        int[] color = new int[n];                    // 0 unvisited, 1 grey/unsafe, 2 safe
        List<Integer> res = new ArrayList<>();
        for (int i = 0; i < n; i++) if (safe(graph, i, color)) res.add(i);
        return res;
    }
    private boolean safe(int[][] g, int u, int[] color) {
        if (color[u] != 0) return color[u] == 2;
        color[u] = 1;
        for (int v : g[u]) if (!safe(g, v, color)) return false;   // u stays grey = unsafe
        color[u] = 2;
        return true;
    }
}`,
      alt: [{ lang: 'python', code: `from collections import deque

def eventual_safe(graph):
    n = len(graph)
    rev = [[] for _ in range(n)]
    outdeg = [len(x) for x in graph]
    for u in range(n):
        for v in graph[u]:
            rev[v].append(u)
    q = deque(i for i in range(n) if outdeg[i] == 0)    # terminal nodes
    safe = [False] * n
    while q:
        v = q.popleft()
        safe[v] = True
        for u in rev[v]:
            outdeg[u] -= 1
            if outdeg[u] == 0:
                q.append(u)
    return [i for i in range(n) if safe[i]]

print(eventual_safe([[1, 2], [2, 3], [5], [0], [5], [], []]))  # [2, 4, 5, 6]`, run: true }],
      complexity: `<p>Time O(V + E), space O(V) (plus recursion depth for the DFS version).</p>`,
      followUps: ['Return the nodes that are ON a cycle (not just able to reach one) → SCCs (Tarjan/Kosaraju)', 'Deadlock detection in a wait-for graph']
    }
  });

  // ================= PRACTICE: Hard =================
  practice.push({
    title: 'Word Ladder', level: 'Hard', tags: ['bfs', 'implicit graph', 'strings'], companies: ['Amazon', 'Meta', 'Google', 'LinkedIn'],
    statement: `<p>Given <code>beginWord</code>, <code>endWord</code> and a <code>wordList</code>, return the number of words in the shortest transformation sequence from beginWord to endWord, where each step changes exactly one letter and every intermediate word must be in wordList. Return 0 if impossible.</p>`,
    constraints: `1 ≤ L = word length ≤ 10, 1 ≤ wordList.length ≤ 5000, lowercase letters, all words distinct`,
    example: `<p>begin = "hit", end = "cog", list = ["hot","dot","dog","lot","log","cog"] → <b>${H.c('g', '5')}</b>: hit → hot → dot → dog → cog (5 words, 4 changes). If "cog" is not in the list → 0.</p>`,
    brute: { why: `<p>Build the explicit graph by comparing every pair of words (O(N²·L) = 2.5·10<sup>8</sup> character comparisons for N = 5000), then BFS. The pair comparison dominates. Generating neighbours by trying 26 letters at each position is O(N·L·26·L) instead.</p>`, code: `int ladderBrute(String begin, String end, List<String> list) {
    List<String> words = new ArrayList<>(list);
    if (!words.contains(end)) return 0;
    words.add(begin);
    int n = words.size();
    List<List<Integer>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    for (int i = 0; i < n; i++)                         // O(N^2 * L) edge building
        for (int j = i + 1; j < n; j++) {
            int diff = 0;
            for (int k = 0; k < begin.length() && diff < 2; k++) if (words.get(i).charAt(k) != words.get(j).charAt(k)) diff++;
            if (diff == 1) { g.get(i).add(j); g.get(j).add(i); }
        }
    int[] dist = new int[n];
    Arrays.fill(dist, -1);
    ArrayDeque<Integer> q = new ArrayDeque<>();
    q.add(n - 1); dist[n - 1] = 1;
    while (!q.isEmpty()) {
        int u = q.poll();
        if (words.get(u).equals(end)) return dist[u];
        for (int v : g.get(u)) if (dist[v] == -1) { dist[v] = dist[u] + 1; q.add(v); }
    }
    return 0;
}` },
    mcq: { q: 'Why BFS and not DFS?', options: ['Each transformation costs 1 and we want the fewest steps', 'DFS cannot handle strings', 'BFS uses less memory', 'The graph is directed'], answer: 0, explain: 'Unweighted shortest path → BFS. DFS finds some ladder, not the shortest one.' },
    hints: [`<p>Hint 1: Words are nodes; two words are connected if they differ in exactly one letter. Find the shortest path → BFS.</p>`, `<p>Hint 2: Don't build all edges. For each popped word, try every position × 26 letters and check membership in a HashSet of remaining words.</p>`, `<p>Hint 3: Remove a word from the set when you enqueue it (= visited). Level count starts at 1. Speed-up: bidirectional BFS, always expanding the smaller frontier.</p>`],
    solution: {
      approach: `<p>BFS on the implicit word graph with on-the-fly neighbour generation. The dictionary set doubles as the "unvisited" set: deleting a word when it is enqueued guarantees each word is processed once.</p>`,
      code: `class Solution {
    public int ladderLength(String beginWord, String endWord, List<String> wordList) {
        Set<String> dict = new HashSet<>(wordList);
        if (!dict.contains(endWord)) return 0;
        ArrayDeque<String> q = new ArrayDeque<>();
        q.offer(beginWord);
        dict.remove(beginWord);
        int level = 1;                                     // number of words in the ladder so far
        while (!q.isEmpty()) {
            for (int k = q.size(); k > 0; k--) {
                char[] w = q.poll().toCharArray();
                for (int i = 0; i < w.length; i++) {
                    char orig = w[i];
                    for (char ch = 'a'; ch <= 'z'; ch++) {
                        if (ch == orig) continue;
                        w[i] = ch;
                        String next = new String(w);
                        if (!dict.contains(next)) continue;
                        if (next.equals(endWord)) return level + 1;
                        dict.remove(next);                 // visited on push
                        q.offer(next);
                    }
                    w[i] = orig;
                }
            }
            level++;
        }
        return 0;
    }
}`,
      complexity: `<p>Time O(N · L · 26 · L) — N words, L positions, 26 letters, O(L) to build/hash each candidate. Space O(N · L).</p>`,
      followUps: ['Return all shortest ladders (Word Ladder II: BFS to build a parent DAG, then backtrack)', 'Bidirectional BFS', 'Wildcard buckets ("h*t" → [hot, hit]) as an alternative neighbour index']
    }
  });

  practice.push({
    title: 'Alien Dictionary', level: 'Hard', tags: ['topological sort', 'graph construction', 'strings'], companies: ['Airbnb', 'Meta', 'Google', 'Uber'],
    statement: `<p>An alien language uses lowercase English letters in an unknown order. You get a list of words <b>sorted</b> by that order. Return a string of the unique letters in a valid order, or "" if the input is inconsistent. Any valid order is accepted.</p>`,
    constraints: `1 ≤ words.length ≤ 100, 1 ≤ word length ≤ 100`,
    example: `<p>words = ["wrt","wrf","er","ett","rftt"] → <b>${H.c('g', '"wertf"')}</b>. Adjacent pairs give t&lt;f, w&lt;e, r&lt;t, e&lt;r → chain w → e → r → t → f.<br>words = ["abc","ab"] → <b>${H.c('r', '""')}</b> (a word cannot come before its own prefix).</p>`,
    brute: { why: `<p>Try every permutation of the distinct letters (up to 26!) and check whether sorting the words by that order reproduces the input. Factorial time — impossible. The structure we need is just "which letter must precede which", i.e. a DAG.</p>`, code: `String alienBrute(String[] words) {                         // only for a handful of letters
    List<Character> letters = new ArrayList<>();
    for (String w : words) for (char c : w.toCharArray()) if (!letters.contains(c)) letters.add(c);
    return permute(letters, 0, words);
}
String permute(List<Character> a, int k, String[] words) {
    if (k == a.size()) return sortedUnder(a, words) ? join(a) : null;
    for (int i = k; i < a.size(); i++) {
        Collections.swap(a, k, i);
        String r = permute(a, k + 1, words);
        Collections.swap(a, k, i);
        if (r != null) return r;
    }
    return k == 0 ? "" : null;
}
boolean sortedUnder(List<Character> order, String[] words) {
    for (int i = 0; i + 1 < words.length; i++) {
        String x = words[i], y = words[i + 1];
        int j = 0;
        while (j < x.length() && j < y.length() && x.charAt(j) == y.charAt(j)) j++;
        if (j == y.length() && j < x.length()) return false;          // prefix violation
        if (j < x.length() && j < y.length() && order.indexOf(x.charAt(j)) > order.indexOf(y.charAt(j))) return false;
    }
    return true;
}
String join(List<Character> a) { StringBuilder sb = new StringBuilder(); for (char c : a) sb.append(c); return sb.toString(); }` },
    mcq: { q: 'Comparing "wrf" and "er", what edge do you add?', options: ['w → e (first differing letters)', 'f → r (last letters)', 'r → e and f → r', 'No edge: the words have different lengths'], answer: 0, explain: 'Only the FIRST differing position tells you anything; letters after it are unconstrained.' },
    hints: [`<p>Hint 1: Compare only adjacent words. The first position where they differ gives one rule: x[j] comes before y[j].</p>`, `<p>Hint 2: Letters = nodes, rules = directed edges. Topologically sort with Kahn; include letters that have no rules at all.</p>`, `<p>Hint 3: Pitfalls: (1) if y is a proper prefix of x with x before y → return ""; (2) avoid duplicate edges (or in-degree double-counts); (3) if Kahn outputs fewer letters than exist → cycle → "".</p>`],
    solution: {
      approach: `<p>Build a DAG of letter precedences from adjacent word pairs, then Kahn's algorithm. Two validity checks: the prefix rule while building, and the "all letters output" cycle check after sorting.</p>`,
      code: `class Solution {
    public String alienOrder(String[] words) {
        Map<Character, Set<Character>> g = new HashMap<>();
        Map<Character, Integer> indeg = new HashMap<>();
        for (String w : words) for (char c : w.toCharArray()) { g.putIfAbsent(c, new HashSet<>()); indeg.putIfAbsent(c, 0); }
        for (int i = 0; i + 1 < words.length; i++) {
            String x = words[i], y = words[i + 1];
            int j = 0;
            while (j < x.length() && j < y.length() && x.charAt(j) == y.charAt(j)) j++;
            if (j == x.length() || j == y.length()) {
                if (x.length() > y.length()) return "";             // "abc" before "ab" is invalid
                continue;                                            // x is a prefix of y: no info
            }
            char a = x.charAt(j), b = y.charAt(j);
            if (g.get(a).add(b)) indeg.merge(b, 1, Integer::sum);    // add edge a -> b once
        }
        ArrayDeque<Character> q = new ArrayDeque<>();
        for (Map.Entry<Character, Integer> e : indeg.entrySet()) if (e.getValue() == 0) q.offer(e.getKey());
        StringBuilder sb = new StringBuilder();
        while (!q.isEmpty()) {
            char c = q.poll();
            sb.append(c);
            for (char nx : g.get(c)) if (indeg.merge(nx, -1, Integer::sum) == 0) q.offer(nx);
        }
        return sb.length() == indeg.size() ? sb.toString() : "";    // cycle → inconsistent
    }
}`,
      complexity: `<p>Time O(C) where C = total characters across words (edge building) + O(26 + E) for Kahn. Space O(26 + E) ≤ O(26²).</p>`,
      followUps: ['Return "" if the order is not UNIQUE (queue size must always be 1)', 'Verifying an Alien Dictionary (given the order, check sortedness) — Easy cousin', 'Return the lexicographically smallest valid order (PriorityQueue)']
    }
  });

  practice.push({
    title: 'Shortest Path Visiting All Nodes', level: 'Hard', tags: ['bfs', 'bitmask', 'multi-source bfs', 'state space'], companies: ['Google', 'Amazon'],
    statement: `<p>An undirected connected graph has n nodes (n ≤ 12), given as <code>graph[i]</code> = neighbours of i. Return the length of the shortest walk that visits every node. You may start and end anywhere, revisit nodes and reuse edges.</p>`,
    constraints: `1 ≤ n ≤ 12, the graph is connected`,
    example: `<p>graph = [[1,2,3],[0],[0],[0]] (a star) → <b>${H.c('g', '4')}</b>: 1 → 0 → 2 → 0 → 3. Starting at a leaf saves a step compared to starting at the center.</p>`,
    brute: { why: `<p>Try every order of visiting the n nodes (n! = 479 million for n = 12) and sum the BFS distances between consecutive nodes. Even with precomputed distances it is far too slow. The state that really matters is just (current node, set of visited nodes): 12 × 2<sup>12</sup> = 49 152 states.</p>`, code: `int bestBrute = Integer.MAX_VALUE;
int shortestBrute(int[][] graph) {
    int n = graph.length;
    int[][] d = new int[n][n];
    for (int s = 0; s < n; s++) {                          // all-pairs BFS distances
        Arrays.fill(d[s], -1);
        ArrayDeque<Integer> q = new ArrayDeque<>(List.of(s));
        d[s][s] = 0;
        while (!q.isEmpty()) { int u = q.poll(); for (int v : graph[u]) if (d[s][v] < 0) { d[s][v] = d[s][u] + 1; q.add(v); } }
    }
    boolean[] used = new boolean[n];
    for (int s = 0; s < n; s++) { used[s] = true; perm(d, s, 1, 0, used); used[s] = false; }
    return bestBrute;
}
void perm(int[][] d, int last, int cnt, int cost, boolean[] used) {   // n! orders
    if (cost >= bestBrute) return;
    if (cnt == used.length) { bestBrute = cost; return; }
    for (int v = 0; v < used.length; v++)
        if (!used[v]) { used[v] = true; perm(d, v, cnt + 1, cost + d[last][v], used); used[v] = false; }
}` },
    mcq: { q: 'What is a node of the BFS graph in this problem?', options: ['(current node, bitmask of visited nodes)', 'Just the current node', 'Just the bitmask', 'An edge of the original graph'], answer: 0, explain: 'Revisiting is allowed, so "current node" alone loses information; the bitmask records progress. BFS over these states finds the fewest moves to reach any state with a full mask.' },
    hints: [`<p>Hint 1: State = (node, visitedMask). A move to neighbour v goes to (v, mask | 1 &lt;&lt; v) and costs 1 → BFS over states.</p>`, `<p>Hint 2: You may start anywhere → multi-source BFS: push (i, 1 &lt;&lt; i) for every i at distance 0.</p>`, `<p>Hint 3: visited[node][mask] boolean array of size n × 2<sup>n</sup>. Return the distance when mask == (1 &lt;&lt; n) − 1. Edge: n == 1 → 0.</p>`],
    solution: {
      approach: `<p>Multi-source BFS over the state graph (node, mask). Every state is reached first by its shortest walk; the first popped state whose mask is full gives the answer.</p>`,
      code: `class Solution {
    public int shortestPathLength(int[][] graph) {
        int n = graph.length, full = (1 << n) - 1;
        if (n == 1) return 0;
        boolean[][] seen = new boolean[n][1 << n];
        ArrayDeque<int[]> q = new ArrayDeque<>();
        for (int i = 0; i < n; i++) { q.offer(new int[]{i, 1 << i}); seen[i][1 << i] = true; }   // start anywhere
        int steps = 0;
        while (!q.isEmpty()) {
            steps++;
            for (int k = q.size(); k > 0; k--) {
                int[] s = q.poll();
                for (int v : graph[s[0]]) {
                    int mask = s[1] | (1 << v);
                    if (mask == full) return steps;
                    if (seen[v][mask]) continue;
                    seen[v][mask] = true;
                    q.offer(new int[]{v, mask});
                }
            }
        }
        return -1;
    }
}`,
      complexity: `<p>States n · 2<sup>n</sup>; each state scans its node's neighbours → O(2<sup>n</sup> · n²) time worst case ≈ 590 000 for n = 12. Space O(n · 2<sup>n</sup>).</p>`,
      followUps: ['Weighted edges → Dijkstra over states, or bitmask DP (TSP-style) on all-pairs distances', 'Must start at node 0 and return to it (classic TSP)', 'Grid version: collect all keys (Shortest Path to Get All Keys)']
    }
  });

  practice.push({
    title: 'Number of Islands II (online land additions)', level: 'Hard', tags: ['dsu', 'grid', 'online'], companies: ['Google', 'Uber', 'Snap'],
    statement: `<p>An m×n grid starts as all water. <code>positions[k] = [r, c]</code> turns cell (r, c) into land at step k (a cell may be added twice). After each addition, report the number of islands.</p>`,
    constraints: `1 ≤ m, n, positions.length ≤ 10<sup>4</sup>, m·n ≤ 10<sup>4</sup> (design for m·n ≤ 10<sup>6</sup>)`,
    example: `<p>m = 3, n = 3, positions = [[0,0],[0,1],[1,2],[2,1],[1,1]] → <b>${H.c('g', '[1, 1, 2, 3, 1]')}</b>. The last cell (1,1) touches three separate islands and merges them all into one: 4 − 3 = 1.</p>`,
    brute: { why: `<p>After each addition, recount islands with a full DFS over the grid: O(k · m · n) = 10<sup>4</sup> × 10<sup>4</sup> = 10<sup>8</sup> here and 10<sup>10</sup> for bigger grids. Wasted work: one new cell only affects its 4 neighbours.</p>`, code: `List<Integer> islands2Brute(int m, int n, int[][] positions) {
    int[][] g = new int[m][n];
    List<Integer> res = new ArrayList<>();
    for (int[] p : positions) {
        g[p[0]][p[1]] = 1;
        boolean[][] seen = new boolean[m][n];
        int count = 0;
        for (int r = 0; r < m; r++)
            for (int c = 0; c < n; c++) {
                if (g[r][c] != 1 || seen[r][c]) continue;
                count++;
                ArrayDeque<int[]> st = new ArrayDeque<>();
                st.push(new int[]{r, c}); seen[r][c] = true;
                while (!st.isEmpty()) {
                    int[] x = st.pop();
                    int[][] nb = {{x[0] + 1, x[1]}, {x[0] - 1, x[1]}, {x[0], x[1] + 1}, {x[0], x[1] - 1}};
                    for (int[] y : nb)
                        if (y[0] >= 0 && y[1] >= 0 && y[0] < m && y[1] < n && g[y[0]][y[1]] == 1 && !seen[y[0]][y[1]]) { seen[y[0]][y[1]] = true; st.push(y); }
                }
            }
        res.add(count);
    }
    return res;
}` },
    mcq: { q: 'A new land cell touches 3 existing land cells. Two of them are already in the same island. How does the count change?', options: ['+1 − 2 (new island, then two successful merges)', '+1 − 3', '−3', 'unchanged'], answer: 0, explain: 'Count +1 for the new cell, then −1 for each union that actually merges two different sets. The two neighbours in the same island share a root, so only 2 unions succeed.' },
    hints: [`<p>Hint 1: Islands only merge, never split → online connectivity with additions → DSU.</p>`, `<p>Hint 2: Map cell (r, c) to id r·n + c. When adding: if already land, just repeat the count; else count++, then try to union with each land neighbour.</p>`, `<p>Hint 3: Decrement count only when union finds two different roots. Use path compression + union by rank/size.</p>`],
    solution: {
      approach: `<p>DSU over cell ids, activated lazily. Each addition is +1 component, and each successful union with a neighbouring land cell is −1. Duplicate positions are ignored. Total work O(k · α(m·n)).</p>`,
      code: `class Solution {
    int[] parent, rank;
    int find(int x) { while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    boolean union(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;
        if (rank[ra] < rank[rb]) { int t = ra; ra = rb; rb = t; }
        parent[rb] = ra;
        if (rank[ra] == rank[rb]) rank[ra]++;
        return true;
    }

    public List<Integer> numIslands2(int m, int n, int[][] positions) {
        parent = new int[m * n];
        rank = new int[m * n];
        Arrays.fill(parent, -1);                          // -1 = water
        int[] dr = {-1, 1, 0, 0}, dc = {0, 0, -1, 1};
        List<Integer> res = new ArrayList<>();
        int count = 0;
        for (int[] p : positions) {
            int id = p[0] * n + p[1];
            if (parent[id] != -1) { res.add(count); continue; }   // already land
            parent[id] = id;
            count++;
            for (int d = 0; d < 4; d++) {
                int r = p[0] + dr[d], c = p[1] + dc[d], nid = r * n + c;
                if (r < 0 || c < 0 || r >= m || c >= n || parent[nid] == -1) continue;
                if (union(id, nid)) count--;               // merged two islands
            }
            res.add(count);
        }
        return res;
    }
}`,
      complexity: `<p>Time O(m·n + k·α(m·n)), space O(m·n).</p>`,
      followUps: ['Cells can also turn back into water (deletions) → offline: reverse the timeline so deletions become additions', 'Report the size of the largest island after each step (union by size)', 'Grid is 10<sup>9</sup>×10<sup>9</sup> → store DSU parents in a HashMap keyed by cell']
    }
  });

  // ================= QUIZ =================
  quiz.push(
    { q: 'A graph has n = 10<sup>5</sup> nodes and 2·10<sup>5</sup> edges. Which representation should you use for BFS?', options: ['Adjacency list', 'Adjacency matrix', 'Only an edge list, scanned for every node', 'A 2-D boolean grid of size n×n'], answer: 0, explain: 'A matrix needs n² = 10<sup>10</sup> cells. An adjacency list needs n + 2E entries and gives O(V + E) traversal.' },
    { q: 'In BFS, when should a node be marked visited?', options: ['When it is pushed into the queue', 'When it is popped from the queue', 'After all its neighbours are processed', 'It does not matter at all'], answer: 0, explain: 'Marking on push guarantees each node enters the queue once. Marking on pop still gives correct distances but can push the same node many times (O(E) queue size).' },
    { q: 'Why does BFS give shortest paths in an unweighted graph?', options: ['The queue processes nodes in non-decreasing order of distance, so the first discovery uses the fewest edges', 'Because it uses recursion', 'Because it visits neighbours in sorted order', 'Because it explores the deepest node first'], answer: 0, explain: 'The queue always holds distance d nodes followed by distance d + 1 nodes; nobody at distance d + 1 is processed before all distance d nodes.' },
    { q: 'Rotting Oranges with 5 rotten oranges at the start. The efficient approach is…', options: ['One BFS with all 5 rotten oranges in the queue at time 0', 'Five BFS runs, take the maximum', 'DFS from each fresh orange', 'Sort oranges by position'], answer: 0, explain: 'Multi-source BFS = BFS from a virtual super-source; each cell is reached first by its nearest source in a single O(R·C) pass.' },
    { q: 'Directed graph 0→1, 0→2, 1→3, 2→3. DFS with a single boolean visited[] reaches 3 a second time from 2. What is true?', options: ['There is no cycle; you need grey/black colours to tell "on current path" from "finished"', 'There is a cycle 0→1→3→2→0', 'The graph is undirected', 'DFS must restart from 3'], answer: 0, explain: 'This is the diamond. 3 is already finished (black), not on the current path (grey). Only an edge into a grey node indicates a cycle.' },
    { q: 'In undirected DFS cycle detection, which neighbour must be ignored?', options: ['The parent (the node we just came from)', 'All visited neighbours', 'The neighbour with the smallest id', 'Nodes in other components'], answer: 0, explain: 'The edge back to the parent is the same undirected edge we walked down; it is not a cycle. Any other visited neighbour is a cycle (with the parallel-edge caveat).' },
    { q: 'A graph is bipartite if and only if…', options: ['It contains no odd-length cycle', 'It contains no cycle at all', 'It is connected', 'Every node has even degree'], answer: 0, explain: 'Going around a cycle flips colours each step; you return to the starting colour only after an even number of steps. Even cycles are fine, odd ones are not.' },
    { q: 'Kahn’s algorithm outputs 6 nodes for a graph with 8 nodes. Conclusion?', options: ['The graph has a directed cycle; no topological order exists', 'The two remaining nodes are isolated and can be appended', 'The graph is disconnected', 'Run DFS topo sort instead and it will succeed'], answer: 0, explain: 'Isolated nodes have in-degree 0 and are output immediately. Nodes that never reach in-degree 0 sit on or behind a cycle.' },
    { q: 'In DFS-based topological sort, when is a node added to the result stack?', options: ['After all its descendants have finished (post-order)', 'When it is first entered (pre-order)', 'When its in-degree reaches 0', 'Before visiting its first neighbour'], answer: 0, explain: 'Reverse post-order works because for every edge u → v, v finishes before u in a DAG.' },
    { q: 'DSU with both path compression and union by rank has amortised cost per operation of…', options: ['O(α(n)) — inverse Ackermann, effectively constant', 'O(log n)', 'O(n)', 'O(1) worst case for every single operation'], answer: 0, explain: 'Tarjan proved the O(α(n)) amortised bound; α(n) ≤ 4 for all practical n. Individual operations can still be slower, hence "amortised".' },
    { q: 'Which task is DSU NOT suitable for?', options: ['Finding the shortest path between two nodes', 'Counting components as edges are added', 'Detecting a cycle in an undirected graph', 'Grouping accounts that share an email'], answer: 0, explain: 'DSU knows only "same group or not". It keeps no path or distance information; use BFS for shortest paths.' },
    { q: 'union(a, b) is implemented as <code>parent[a] = b</code>. What is wrong?', options: ['It must link the ROOTS: parent[find(a)] = find(b); linking a directly can detach a from its own group', 'Nothing, it is correct', 'It should be parent[b] = a', 'It needs a HashMap'], answer: 0, explain: 'If a is not a root, re-pointing it cuts it (and its subtree) away from its old group while the rest of that group stays behind — groups get split incorrectly.' },
    { q: 'Recursive DFS on a 1000×1000 all-land grid in Java will most likely…', options: ['Throw StackOverflowError — recursion depth can reach 10<sup>6</sup>', 'Run fine because Java has tail-call optimisation', 'Run in O(log n) depth', 'Be faster than BFS'], answer: 0, explain: 'Java has no tail-call optimisation and the default thread stack holds roughly 10<sup>4</sup>–10<sup>5</sup> frames. Use an explicit stack or BFS.' }
  );

  // ================= INTERVIEW Q&A =================
  interview.push(
    { q: 'Adjacency matrix vs adjacency list — when would you pick each?', level: 'B', a: `<p>An <b>adjacency list</b> stores, for each node, its neighbours: memory O(V + E), neighbour iteration O(degree) — ideal for sparse graphs and traversals (BFS/DFS run in O(V + E)). An <b>adjacency matrix</b> is a V×V table: O(V²) memory but O(1) "is u–v an edge?" checks; good for dense graphs, small V (≤ ~2000), Floyd–Warshall, and bitset tricks. Rule of thumb: read the constraints — if V² would exceed ~10<sup>8</sup> cells, a matrix is out. Grids are implicit graphs; you compute neighbours with direction arrays and build neither.</p>`, followUps: ['How much memory does List&lt;List&lt;Integer&gt;&gt; really use in Java for 10<sup>6</sup> edges?', 'What is CSR (compressed sparse row) and why do graph libraries use it?'] },
    { q: 'Explain BFS and prove it finds shortest paths in an unweighted graph.', level: 'B', a: `<p>BFS uses a FIFO queue: start with the source at distance 0; pop a node, and for each undiscovered neighbour set dist = dist[u] + 1, record its parent, mark it and push it. <b>Proof:</b> the queue always contains nodes with distance d followed by nodes with distance d + 1 (induction: popping a d node only appends d + 1 nodes). So nodes are finalised in non-decreasing distance order, and the first time a node is discovered it is via a neighbour at the smallest possible distance. Complexity O(V + E). Parent pointers rebuild the path by walking back from the target.</p>`, followUps: ['What breaks if edges have different weights?', 'What is bidirectional BFS and when does it help?'] },
    { q: 'What is multi-source BFS and why is it correct?', level: 'I', a: `<p>Put <b>all</b> sources into the queue at distance 0 before the loop, then run ordinary BFS. Each cell receives its distance to the <b>nearest</b> source. It is correct because it is exactly a single-source BFS from an imaginary super-source connected to every real source with zero-length edges, after its first step. It turns k separate BFS runs (O(k·(V + E))) into one O(V + E) pass. Classic uses: Rotting Oranges (answer = number of levels), 01 Matrix, Walls and Gates, "as far from land as possible", fire spreading in escape problems.</p>`, followUps: ['How do you know which source reached each cell?', 'What if some cells take 2 minutes to cross?'] },
    { q: 'How do you detect a cycle in an undirected graph? Give at least two methods.', level: 'I', a: `<p>(1) <b>DFS with parent:</b> if you meet a visited neighbour that is not your parent, there is a cycle; run from every unvisited node. (2) <b>DSU:</b> process edges; if both endpoints already have the same root, this edge closes a cycle. (3) <b>Counting:</b> a forest with V nodes and c components has exactly V − c edges, so a simple graph with E ≥ V certainly has a cycle (useful as a quick pre-check; Graph Valid Tree uses E == V − 1 plus connectivity). Caveat: with parallel edges, skip the parent <i>edge id</i>, not the parent node, or you miss the 2-cycle.</p>`, followUps: ['Which method would you use if edges arrive as a stream?', 'How would you output the actual cycle?'] },
    { q: 'Why does directed cycle detection need three colours instead of a visited flag?', level: 'I', a: `<p>In a directed graph, reaching an already-visited node is normal when two paths share a descendant (the diamond 0→1→3, 0→2→3). That is not a cycle. A cycle exists only if we reach a node that is still on the <b>current recursion path</b>. Colours: white = unvisited, grey = entered but not finished (on the stack), black = finished. An edge into a grey node is a back edge ⇒ cycle; edges into black nodes are safe. Black also memoises "no cycle reachable from here", keeping the total cost O(V + E). Alternative: Kahn's algorithm — fewer than V nodes output ⇒ cycle.</p>`, followUps: ['How would you find all nodes that can reach a cycle (eventual safe states)?', 'How do databases use this for deadlock detection?'] },
    { q: 'Compare Kahn’s algorithm and DFS-based topological sort.', level: 'I', a: `<p><b>Kahn</b>: compute in-degrees, queue all zero-in-degree nodes, repeatedly pop and decrement successors. Iterative (no recursion depth problems), naturally detects cycles (output count &lt; V), supports levels (minimum semesters / parallel stages) and lexicographically smallest order with a min-heap. <b>DFS</b>: push nodes on a stack when they finish and reverse; detects cycles via grey nodes; elegant and also gives finishing times used by Kosaraju's SCC algorithm. Both are O(V + E). In production build/workflow tools Kahn is common because its levels expose parallelism.</p>`, followUps: ['How do you check if the topological order is unique?', 'How do you compute the longest path in a DAG?'] },
    { q: 'What is a bipartite graph and how do you check it? What is the connection to odd cycles?', level: 'I', a: `<p>A graph is bipartite if nodes can be split into two sets with every edge crossing between them. Check by BFS/DFS 2-colouring: colour a start node 0, each undiscovered neighbour gets the opposite colour, and an edge joining equal colours proves it is not bipartite. Run from every uncoloured node because the graph may be disconnected. Theorem: bipartite ⇔ no odd cycle. Walking around a cycle flips colour each step, so an odd cycle returns with the wrong colour; conversely, BFS level parity gives a valid colouring when no odd cycle exists. Trees and grids are always bipartite.</p>`, followUps: ['How would you return an odd cycle as proof?', 'Is 3-colouring also O(V + E)?'] },
    { q: 'Walk me through DSU with path compression and union by rank. Why is it so fast?', level: 'A', a: `<p>DSU keeps <code>parent[]</code>: a root points to itself. <code>find</code> follows parents to the root; <b>path compression</b> re-points every visited node directly to the root. <code>union</code> links the root of the lower-rank tree under the higher-rank root (rank grows only when equal ranks merge), so height ≤ log n even without compression. Together they give O(α(n)) amortised per operation (Tarjan), where α is the inverse Ackermann function, ≤ 4 for any realistic n. Union by size works equally well and also tracks group sizes. Always link roots, never the raw arguments.</p>`, followUps: ['Why can union by rank alone guarantee O(log n)?', 'What changes if you need to undo unions (rollback DSU)?'] },
    { q: 'When would you choose DSU over BFS/DFS for connectivity?', level: 'A', a: `<p>Choose DSU when connections are <b>added over time</b> and you must answer connectivity or component-count queries in between (online), when you only care about grouping (accounts merge, equations, similar strings), or inside Kruskal's MST. BFS/DFS would need O(V + E) per query or per update. Choose BFS/DFS when you need paths, distances, directed reachability, or a single offline traversal is enough. DSU cannot delete edges; for deletions, process the timeline in reverse (turning deletions into additions) or use more advanced dynamic connectivity.</p>`, followUps: ['How would you handle "Bricks Falling When Hit" (removals)?', 'How do you use DSU when ids are strings?'] },
    { q: 'Your recursive DFS throws StackOverflowError on a large input. What are your options?', level: 'A', a: `<p>(1) Convert to an <b>explicit stack</b> (<code>ArrayDeque</code>) — for "mark the component" you push neighbours and mark on push. When true post-order matters (topological sort, SCC, articulation points), push frames of (node, next-neighbour index) to mimic recursion exactly. (2) Use <b>BFS</b> if order does not matter. (3) Use DSU for pure connectivity. (4) Contest-only trick: run the DFS in a <code>new Thread(null, runnable, "dfs", 1 &lt;&lt; 26)</code> with a larger stack. In Python, raising the recursion limit is risky (can crash the interpreter); prefer iteration.</p>`, followUps: ['Write iterative DFS that produces the same post-order as recursion', 'What is the maximum recursion depth of DFS on a 1000×1000 grid?'] },
    { q: 'Model "Word Ladder" as a graph. What are the nodes and edges, and how do you avoid O(N²) edge building?', level: 'A', a: `<p>Nodes are words; edges join words differing in exactly one letter; the answer is a BFS shortest path. Building edges by comparing all pairs costs O(N²·L). Instead generate neighbours on the fly: for each position, try the 25 other letters and check a HashSet (O(26·L) candidates per word, each hashed in O(L)), or pre-bucket words by wildcard patterns like <code>h*t</code>. Remove words from the set as they are enqueued (visited). Bidirectional BFS, expanding the smaller frontier, cuts the explored states dramatically. For all shortest ladders (Word Ladder II) build a BFS parent DAG and backtrack.</p>`, followUps: ['What is the complexity with wildcard buckets?', 'How do you return all shortest sequences without exploding memory?'] },
    { q: 'Course Schedule: you have 10<sup>5</sup> courses with prerequisites. Describe a full solution and its failure modes.', level: 'A', a: `<p>Edges go from prerequisite to course (for [a, b], b → a). Kahn: in-degree array, queue all zero-in-degree courses, pop/decrement, collect order; if order size &lt; n, a cycle exists → impossible. O(V + E), iterative so no stack issues at 10<sup>5</sup>. Failure modes: reversed edge direction, forgetting isolated courses (they have in-degree 0 and must be included), duplicate prerequisite pairs inflating in-degrees (dedupe or allow — Kahn still works if each duplicate edge also decrements), and returning a partial order instead of empty when a cycle exists. Extensions: min semesters (levels), with durations (DAG DP / critical path), lexicographic order (heap).</p>`, followUps: ['How would you show the user which courses form the cycle?', 'What if at most k courses per semester are allowed? (NP-hard in general — discuss)'] },
    { q: 'Where do these graph algorithms appear in real production systems?', level: 'E', a: `<p><b>Topological sort:</b> build systems (Bazel, Gradle, make), package managers, spreadsheet recalculation, workflow/agent orchestrators (Airflow, Dagster, LLM tool-call planners), and deep-learning autograd (reverse topological order for backprop). <b>Cycle detection:</b> deadlock detection in databases via wait-for graphs, circular-import and circular-dependency errors. <b>BFS:</b> social "degrees of separation", web crawlers by depth, network broadcast, game AI and robot path planning on grids. <b>DSU / components:</b> image segmentation, clustering, entity resolution (merging user identities), network partition detection. At web scale these run as distributed label propagation or Pregel-style supersteps rather than single-machine traversals.</p>`, followUps: ['How would you compute connected components over 10<sup>10</sup> edges?', 'How does Postgres/MySQL resolve a detected deadlock?'] },
    { q: 'How has AI changed graph interview questions, and how do you work with AI on graph code?', level: 'E', a: `<p>Boilerplate (adjacency lists, BFS, DSU class) is now instant with AI, so interviews focus on <b>modelling</b> (what is a node? what is an edge? is it directed? is the state larger than the position?), choosing the right tool (BFS vs Dijkstra vs DSU vs topo sort) from wording and constraints, proofs (queue invariant, grey/black back edges, rank bound), and follow-ups (online additions, deletions, scale). With AI, I generate brute-force oracles and random/adversarial tests (diamond graphs, disconnected inputs, long chains for stack depth, odd cycles) and fuzz my solution. I review generated code for the classic bugs: visited on pop, missing reverse edges, wrong prerequisite direction, BFS only from node 0 in bipartite checks, union of non-roots, recursion depth.</p>`, followUps: ['Give an example of a subtle bug an AI might introduce in DSU', 'How would you prompt an assistant to produce adversarial graph tests?'] }
  );

  registerModule({
    id: 'dsa19',
    title: 'Graphs I: Traversals, Cycles, Topological Sort & DSU',
    intro: `<p>Maps, friendships, course prerequisites, build systems, pixels in an image, word puzzles: they are all <b>graphs</b>, meaning things (nodes) joined by connections (edges). Once you learn to see the graph inside a problem, a small toolkit solves a large share of interview questions.</p>
      <p>In this module you will learn to <b>store</b> a graph (adjacency list vs matrix) and walk it <b>level by level</b> with BFS to get shortest paths in unweighted graphs. You will spread from many starting points at once with <b>multi-source BFS</b> (Rotting Oranges), and go <b>deep</b> with DFS to count connected components and islands. Then you will <b>detect cycles</b> in undirected and directed graphs, split a graph into <b>two teams</b> (bipartite colouring) and <b>order tasks</b> that depend on each other (topological sort with Kahn's algorithm and DFS). Finally you will meet <b>Disjoint Set Union</b>, the almost-O(1) structure for merging groups.</p>
      <p>Each topic starts with an everyday analogy, then gives step-by-step visualizers (graph highlighting, BFS queues, DFS stacks, grid flood fills, and the DSU parent array drawn as a forest), worked examples, deep dives into proofs and production use, and an AI-era section. Graphs II builds on all of this with weighted shortest paths and minimum spanning trees.</p>`,
    goals: [
      'Turn any edge list, matrix or grid into the right representation and estimate its memory from the constraints',
      'Write BFS that returns distances, levels and the actual shortest path, and explain why the first visit is the shortest',
      'Solve multi-source grid problems (Rotting Oranges, 01 Matrix, Walls and Gates) in one O(R·C) pass',
      'Count connected components and islands with recursive and iterative DFS without stack overflows',
      'Detect cycles in undirected graphs (parent check, DSU) and directed graphs (white/grey/black, Kahn)',
      'Check bipartiteness by 2-colouring and explain the odd-cycle theorem',
      'Produce a topological order with Kahn and with DFS post-order, and extend it to levels, lexicographic order and DAG DP',
      'Implement DSU with path compression and union by rank, and recognise "groups merge over time" problems instantly'
    ],
    prereqs: `DSA 1–2 (Java foundations, Big-O), Stacks &amp; Queues (ArrayDeque as stack and queue), Recursion &amp; Backtracking (call stack), Trees (DFS/BFS on trees, level order) and Hashing (HashMap/HashSet).`,
    hours: 16,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
