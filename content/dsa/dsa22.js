(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // =====================================================================
  // Shared helpers for every visualizer in this module
  // =====================================================================
  function one(k, v) { var o = {}; o[k] = v; return o; }
  function copy(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }
  var COMP = ['ok', 'sel', 'win', 'bad', 'cur'];

  // Reads "A>B B>C" (directed), "0-1 1-2" (undirected) or "S>A:10" (with capacity).
  function parseEdges(input, o) {
    var txt = String(input === undefined || input === null ? '' : input).trim();
    if (!txt) throw new Error('Type edges like: ' + o.example);
    var toks = txt.split(/[\s,;]+/).filter(Boolean);
    var re = o.weighted ? /^([A-Za-z0-9]{1,3})([>-])([A-Za-z0-9]{1,3}):(\d{1,3})$/ : /^([A-Za-z0-9]{1,3})([>-])([A-Za-z0-9]{1,3})$/;
    var ids = [], seen = {}, edges = [];
    function add(id) { if (!seen[id]) { seen[id] = true; ids.push(id); } }
    toks.forEach(function (t) {
      var m = re.exec(t);
      if (!m) throw new Error('Could not read "' + t + '". Use the format: ' + o.example);
      if (o.noLoops && m[1] === m[3]) throw new Error('Self-loop "' + t + '" is not allowed here.');
      add(m[1]); add(m[3]);
      edges.push([m[1], m[3], o.weighted ? Number(m[4]) : undefined]);
    });
    var maxN = o.maxN || 10, maxE = o.maxE || 18;
    if (ids.length > maxN) throw new Error('Please use at most ' + maxN + ' different nodes (you used ' + ids.length + ').');
    if (edges.length > maxE) throw new Error('Please use at most ' + maxE + ' edges (you used ' + edges.length + ').');
    if (ids.every(function (x) { return /^\d+$/.test(x); })) ids.sort(function (a, b) { return Number(a) - Number(b); });
    return { ids: ids, edges: edges };
  }

  // Nodes placed evenly on a circle (good for general graphs).
  function circle(ids, h) {
    var n = ids.length, H = h || 70;
    return ids.map(function (id, i) {
      var a = -Math.PI / 2 + 2 * Math.PI * i / Math.max(1, n);
      return { id: id, label: id, x: Math.round((50 + 40 * Math.cos(a)) * 10) / 10, y: Math.round((H / 2 + (H / 2 - 11) * Math.sin(a)) * 10) / 10 };
    });
  }

  // Left-to-right layers by BFS distance from s (good for flow networks: S on the left, T on the right).
  function layered(ids, edges, s, t, h) {
    var H = h || 70, dist = {}, q = [s], adj = {};
    ids.forEach(function (id) { adj[id] = []; });
    edges.forEach(function (e) { adj[e[0]].push(e[1]); adj[e[1]].push(e[0]); });
    dist[s] = 0;
    while (q.length) { var v = q.shift(); adj[v].forEach(function (w) { if (dist[w] === undefined) { dist[w] = dist[v] + 1; q.push(w); } }); }
    var maxL = 0;
    ids.forEach(function (id) { if (id !== t && dist[id] !== undefined) maxL = Math.max(maxL, dist[id]); });
    ids.forEach(function (id) { if (dist[id] === undefined) dist[id] = Math.max(1, Math.ceil(maxL / 2)); });
    dist[t] = maxL + 1;
    var byL = {};
    ids.forEach(function (id) { (byL[dist[id]] = byL[dist[id]] || []).push(id); });
    var nodes = [];
    Object.keys(byL).forEach(function (L) {
      var arr = byL[L];
      arr.forEach(function (id, j) {
        nodes.push({ id: id, label: id, x: Math.round((7 + 86 * Number(L) / (maxL + 1)) * 10) / 10, y: Math.round((H * (j + 1) / (arr.length + 1)) * 10) / 10 });
      });
    });
    return nodes;
  }

  // Residual network shared by the flow visualizers. Edge 2k is original edge k, edge 2k+1 its reverse.
  function buildNet(ids, edges) {
    var idx = {};
    ids.forEach(function (id, i) { idx[id] = i; });
    var g = ids.map(function () { return []; }), E = [];
    edges.forEach(function (e, k) {
      var u = idx[e[0]], v = idx[e[1]];
      g[u].push(E.length); E.push({ u: u, v: v, cap: e[2], f: 0, k: k });
      g[v].push(E.length); E.push({ u: v, v: u, cap: 0, f: 0, k: k });
    });
    return { g: g, E: E, idx: idx };
  }
  function resid(E, id) { return E[id].cap - E[id].f; }
  function push(E, id, d) { E[id].f += d; E[id ^ 1].f -= d; }
  function flowEdges(edges, E) {
    return edges.map(function (e, k) { return [e[0], e[1], E[2 * k].f + '/' + E[2 * k].cap]; });
  }
  function flowEhl(edges, E) {
    var o = {};
    edges.forEach(function (e, k) { var f = E[2 * k].f; if (f > 0) o[e[0] + '-' + e[1]] = f === E[2 * k].cap ? 'bad' : 'ok'; });
    return o;
  }
  function parseFlow(input, maxN) {
    var P = parseEdges(input, { weighted: true, noLoops: true, example: 'S>A:10 A>T:5 (source S, sink T, capacity after the colon)', maxN: maxN || 9, maxE: 16 });
    if (P.ids.indexOf('S') < 0 || P.ids.indexOf('T') < 0) throw new Error('The network needs a source node S and a sink node T.');
    return P;
  }

  // =====================================================================
  // TOPIC 1 — Strongly Connected Components & Kosaraju
  // =====================================================================
  topics.push({
    title: 'Strongly Connected Components (SCC) & Kosaraju\'s Two-Pass Algorithm',
    analogy: `<p>Imagine a city where <b>every street is one-way</b>. Some neighbourhoods are "<b>closed loops</b>": from any house inside you can drive to any other house inside <i>and drive back home</i>. Other streets are like a highway exit: you can leave the neighbourhood, but there is <b>no road back</b>.</p>
      <p>Each closed-loop neighbourhood is a <b>Strongly Connected Component</b>. If you shrink every neighbourhood into one big dot, the map of dots has <b>no loops at all</b> — every road between neighbourhoods only goes "downhill". Kosaraju's trick finds the neighbourhoods by driving around the city <b>twice</b>: once normally, and once with every street sign flipped.</p>`,
    explain: `<p><b>Strongly connected</b> means: for two nodes <code>u</code> and <code>v</code> in a <b>directed</b> graph, you can go <code>u → … → v</code> <b>and</b> <code>v → … → u</code>. A <b>Strongly Connected Component (SCC)</b> is a largest group of nodes where every pair is strongly connected. Every node belongs to exactly one SCC (a lonely node is an SCC of size 1).</p>
      ${H.table(['graph', 'SCCs', 'why'], [
        ['<code>0→1, 1→2, 2→0</code>', '{0, 1, 2}', 'one cycle: everyone reaches everyone'],
        ['<code>0→1, 1→2</code>', '{0}, {1}, {2}', 'no way back from 2 to 0'],
        ['<code>0→1, 1→0, 1→2, 2→3, 3→2</code>', '{0, 1}, {2, 3}', 'two loops joined by a one-way bridge 1→2']
      ])}
      <p><b>The condensation (also called the component DAG):</b> squash each SCC into a single "super node". The result is always a <b>DAG</b> (Directed Acyclic Graph — no cycles). Why? If two SCCs could reach each other, they would be one SCC. This is the real power of SCCs: <b>any directed graph problem can be turned into a DAG problem</b>, where topological order, DP and "sources/sinks" work again.</p>
      <p><b>Kosaraju's algorithm in 3 plain steps:</b></p>
      <ol>
        <li><b>Pass 1:</b> run a normal DFS over the whole graph. Every time a node <b>finishes</b> (all its neighbours are done), push it on a stack. The node finished <b>last</b> sits on top.</li>
        <li><b>Flip</b> every edge (the "transpose" graph).</li>
        <li><b>Pass 2:</b> pop nodes from the stack. For each node not yet labelled, run a DFS <b>on the flipped graph</b>. Everything this DFS touches is exactly one SCC.</li>
      </ol>
      ${H.arr(['5', '4', '3', '2', '1', '0', '7', '6'], { label: 'finish order for 0→1→2→0, 2→3→4→5→3, 6→5, 6→7→6 (6 finished last)', hl: { 7: 'g' } })}
      <p><b>Why it works (the one-sentence intuition):</b> the node that finishes last always lives in a <b>"source" SCC</b> of the condensation (nothing points into it from outside). Flipping the edges turns that source into a <b>sink</b> — a component with no exits — so the second DFS starting there <b>cannot leak</b> into any other component. Remove it, repeat. Total cost: two DFS passes = <b>O(V + E)</b>.</p>
      <p>${H.c('b', 'Bonus:')} Kosaraju hands out components in <b>topological order of the condensation</b> (first component found = a source). That is handy for DP over the component DAG.</p>`,
    clues: [
      '"<b>directed graph</b>" + "<b>every node can reach every other</b>" / "mutually reachable" → SCC.',
      '"<b>groups / clusters</b> where members can reach each other", "circular dependencies between modules", "deadlock groups" → find SCCs.',
      '"<b>Minimum edges to add</b> so the graph becomes strongly connected" → condense into SCC DAG, answer = max(#sources, #sinks).',
      '"Longest / best path where you may <b>revisit</b> nodes" or "collect all coins in a cycle" → condense SCCs, then DP on the DAG.',
      '<b>2-SAT</b> ("each variable true/false, clauses of two literals") → implication graph + SCC.',
      '<code>V, E ≤ 10<sup>5</sup>–10<sup>6</sup></code> on a directed graph → only O(V + E) works: Kosaraju or Tarjan, never "BFS from every node" (O(V·(V+E))).'
    ],
    code: [{ lang: 'java', code: `
      class Kosaraju {
          // Returns comp[v] = id of v's strongly connected component (0, 1, 2, ...).
          // Component ids come out in TOPOLOGICAL order of the condensation DAG.
          static int[] scc(int n, List<List<Integer>> adj) {
              // ---- Pass 1: plain DFS on the original graph, remember finish order ----
              boolean[] seen = new boolean[n];
              Deque<Integer> order = new ArrayDeque<>();      // stack: node finished LAST is on top
              for (int v = 0; v < n; v++) if (!seen[v]) dfs1(v, adj, seen, order);

              // ---- Build the transpose: every edge u->v becomes v->u ----
              List<List<Integer>> radj = new ArrayList<>();
              for (int v = 0; v < n; v++) radj.add(new ArrayList<>());
              for (int u = 0; u < n; u++) for (int v : adj.get(u)) radj.get(v).add(u);

              // ---- Pass 2: pop by decreasing finish time, DFS on the transpose ----
              int[] comp = new int[n];
              Arrays.fill(comp, -1);
              int c = 0;
              while (!order.isEmpty()) {
                  int v = order.pop();
                  if (comp[v] == -1) dfs2(v, radj, comp, c++);   // one DFS tree = one SCC
              }
              return comp;
          }

          static void dfs1(int v, List<List<Integer>> adj, boolean[] seen, Deque<Integer> order) {
              seen[v] = true;
              for (int w : adj.get(v)) if (!seen[w]) dfs1(w, adj, seen, order);
              order.push(v);                                  // v finished: all it can reach is done
          }

          static void dfs2(int v, List<List<Integer>> radj, int[] comp, int c) {
              comp[v] = c;
              for (int w : radj.get(v)) if (comp[w] == -1) dfs2(w, radj, comp, c);
          }
      }`, alt: [{ lang: 'python', code: `def kosaraju(n, adj):
    # Returns comp[v] = id of v's strongly connected component (0, 1, 2, ...).
    # Component ids come out in TOPOLOGICAL order of the condensation DAG.
    # Recursive, so only for small graphs (see the iterative version below).
    seen = [False] * n
    order = []                              # finish order: the node finished LAST is at the end

    def dfs1(v):
        seen[v] = True
        for w in adj[v]:
            if not seen[w]:
                dfs1(w)
        order.append(v)                     # v finished: all it can reach is done

    for v in range(n):                      # pass 1: plain DFS on the original graph
        if not seen[v]:
            dfs1(v)

    radj = [[] for _ in range(n)]           # transpose: every edge u->v becomes v->u
    for u in range(n):
        for v in adj[u]:
            radj[v].append(u)

    comp = [-1] * n

    def dfs2(v, c):
        comp[v] = c
        for w in radj[v]:
            if comp[w] == -1:
                dfs2(w, c)

    c = 0
    for v in reversed(order):               # pass 2: decreasing finish time, DFS on the transpose
        if comp[v] == -1:
            dfs2(v, c)                      # one DFS tree = one SCC
            c += 1
    return comp
` }, { lang: 'js', code: `// Returns comp[v] = id of v's strongly connected component (0, 1, 2, ...).
// Component ids come out in TOPOLOGICAL order of the condensation DAG.
// Recursive, so only for small graphs (see the iterative version below).
function kosaraju(n, adj) {
  const seen = new Array(n).fill(false);
  const order = [];                         // finish order: the node finished LAST is at the end

  function dfs1(v) {
    seen[v] = true;
    for (const w of adj[v]) if (!seen[w]) dfs1(w);
    order.push(v);                          // v finished: all it can reach is done
  }
  for (let v = 0; v < n; v++) if (!seen[v]) dfs1(v);     // pass 1: plain DFS on the original graph

  const radj = Array.from({ length: n }, () => []);      // transpose: every edge u->v becomes v->u
  for (let u = 0; u < n; u++) for (const v of adj[u]) radj[v].push(u);

  const comp = new Array(n).fill(-1);
  function dfs2(v, c) {
    comp[v] = c;
    for (const w of radj[v]) if (comp[w] === -1) dfs2(w, c);
  }
  let c = 0;
  for (let k = n - 1; k >= 0; k--) {        // pass 2: decreasing finish time, DFS on the transpose
    const v = order[k];
    if (comp[v] === -1) dfs2(v, c++);       // one DFS tree = one SCC
  }
  return comp;
}
` }, { lang: 'cpp', code: `class Kosaraju {
    // Returns comp[v] = id of v's strongly connected component (0, 1, 2, ...).
    // Component ids come out in TOPOLOGICAL order of the condensation DAG.
public:
    static vector<int> scc(int n, const vector<vector<int>>& adj) {
        // ---- Pass 1: plain DFS on the original graph, remember finish order ----
        vector<char> seen(n, 0);
        vector<int> order;                              // the node finished LAST is at the end
        for (int v = 0; v < n; v++) if (!seen[v]) dfs1(v, adj, seen, order);

        // ---- Build the transpose: every edge u->v becomes v->u ----
        vector<vector<int>> radj(n);
        for (int u = 0; u < n; u++) for (int v : adj[u]) radj[v].push_back(u);

        // ---- Pass 2: decreasing finish time, DFS on the transpose ----
        vector<int> comp(n, -1);
        int c = 0;
        for (int k = n - 1; k >= 0; k--) {
            int v = order[k];
            if (comp[v] == -1) dfs2(v, radj, comp, c++);   // one DFS tree = one SCC
        }
        return comp;
    }

private:
    static void dfs1(int v, const vector<vector<int>>& adj, vector<char>& seen, vector<int>& order) {
        seen[v] = 1;
        for (int w : adj[v]) if (!seen[w]) dfs1(w, adj, seen, order);
        order.push_back(v);                              // v finished: all it can reach is done
    }

    static void dfs2(int v, const vector<vector<int>>& radj, vector<int>& comp, int c) {
        comp[v] = c;
        for (int w : radj[v]) if (comp[w] == -1) dfs2(w, radj, comp, c);
    }
};
` }] }, {
      lang: 'python', run: true, title: 'Iterative Kosaraju in Python (no recursion limit problems) — runnable',
      code: `def kosaraju(n, edges):
    adj = [[] for _ in range(n)]
    radj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        radj[v].append(u)
    # Pass 1: iterative DFS that records the finish order
    seen = [False] * n
    order = []
    for s in range(n):
        if seen[s]:
            continue
        seen[s] = True
        stack = [(s, 0)]                # (node, index of the next neighbour to try)
        while stack:
            v, i = stack[-1]
            if i < len(adj[v]):
                stack[-1] = (v, i + 1)
                w = adj[v][i]
                if not seen[w]:
                    seen[w] = True
                    stack.append((w, 0))
            else:
                stack.pop()
                order.append(v)         # v is finished
    # Pass 2: decreasing finish time, DFS on the transposed graph
    comp = [-1] * n
    c = 0
    for s in reversed(order):
        if comp[s] != -1:
            continue
        comp[s] = c
        pending = [s]
        while pending:
            v = pending.pop()
            for w in radj[v]:
                if comp[w] == -1:
                    comp[w] = c
                    pending.append(w)
        c += 1
    return c, comp


edges = [(0, 1), (1, 2), (2, 0), (2, 3), (3, 4), (4, 5), (5, 3), (6, 5), (6, 7), (7, 6)]
count, comp = kosaraju(8, edges)
print("SCC count:", count)
groups = {}
for v, c in enumerate(comp):
    groups.setdefault(c, []).append(v)
for c in sorted(groups):
    print("component", c, "->", groups[c])
`
    }],
    codeTitle: ['Kosaraju (recursive, clearest form)', 'Kosaraju in Python (iterative)'],
    viz: {
      title: 'Kosaraju live: finish-order DFS, flip every edge, peel off one SCC at a time',
      input: '0>1 1>2 2>0 2>3 3>4 4>5 5>3 6>5 6>7 7>6',
      inputLabel: 'Directed edges "u>v" separated by spaces (up to 10 nodes, 18 edges)',
      gen: function (input) {
        var P = parseEdges(input, { example: '0>1 1>2 2>0 2>3', maxN: 10, maxE: 18 });
        var ids = P.ids, n = ids.length, ix = {};
        ids.forEach(function (id, i) { ix[id] = i; });
        var adj = ids.map(function () { return []; }), radj = ids.map(function () { return []; });
        P.edges.forEach(function (e) { adj[ix[e[0]]].push(ix[e[1]]); radj[ix[e[1]]].push(ix[e[0]]); });
        var nodes = circle(ids, 70), frames = [], seen = [], order = [], comp = [], hl = {}, tags = {}, ehl = {};
        function G(rev, label) {
          var edges = P.edges.map(function (e) { return rev ? [e[1], e[0]] : [e[0], e[1]]; });
          return { type: 'graph', label: label, directed: true, height: 70, nodes: nodes, edges: edges, hl: copy(hl), ehl: copy(ehl), tags: copy(tags) };
        }
        function st(k) { return { type: 'stack', label: 'finish stack (top = finished last)', items: order.slice(0, k === undefined ? order.length : k).map(function (i) { return ids[i]; }) }; }
        frames.push({ narr: '<b>Pass 1 plan:</b> run a normal DFS from every unvisited node. A node is pushed on the stack only when it <b>finishes</b> (all its out-neighbours are fully explored). Tags will show the finish number <b>f1, f2, …</b>.', parts: [G(false, 'original graph'), st()] });
        function dfs1(v, from) {
          seen[v] = true;
          hl[ids[v]] = 'cur';
          if (from >= 0) ehl[ids[from] + '-' + ids[v]] = 'win';
          frames.push({ narr: 'Enter <b>' + ids[v] + '</b>' + (from >= 0 ? ' (came from ' + ids[from] + ')' : ' (new DFS start)') + '. Now explore its out-edges: ' + (adj[v].length ? adj[v].map(function (w) { return ids[w]; }).join(', ') : 'none') + '.', parts: [G(false, 'pass 1 — DFS on the original graph'), st()] });
          adj[v].forEach(function (w) {
            if (!seen[w]) { hl[ids[v]] = 'win'; dfs1(w, v); hl[ids[v]] = 'cur'; }
          });
          order.push(v);
          hl[ids[v]] = 'done';
          tags[ids[v]] = 'f' + order.length;
          frames.push({ narr: '<b>' + ids[v] + '</b> has nothing new left to visit → it <b>finishes</b> as number ' + order.length + ' and goes on top of the stack.', parts: [G(false, 'pass 1 — DFS on the original graph'), st()] });
        }
        for (var v = 0; v < n; v++) if (!seen[v]) dfs1(v, -1);
        hl = {}; ehl = {};
        frames.push({ narr: '<b>Flip every edge</b> (transpose). SCCs stay the same — a loop reversed is still a loop — but the one-way roads <i>between</i> components now point the other way. The stack top <b>' + ids[order[order.length - 1]] + '</b> finished last, so it sits in a <b>source</b> component; after flipping, that component is a <b>dead end</b>.', parts: [G(true, 'transposed graph'), st()] });
        var c = 0;
        for (var k = order.length - 1; k >= 0; k--) {
          var s = order[k];
          if (comp[s] !== undefined) {
            frames.push({ narr: 'Pop <b>' + ids[s] + '</b>: already labelled C' + (comp[s] + 1) + ' → skip.', parts: [G(true, 'pass 2 — DFS on the transposed graph'), st(k)] });
            continue;
          }
          var cls = COMP[c % 4], members = [], pending = [s];
          comp[s] = c;
          while (pending.length) {
            var x = pending.pop();
            members.push(ids[x]);
            hl[ids[x]] = cls;
            tags[ids[x]] = 'C' + (c + 1);
            radj[x].forEach(function (w) { if (comp[w] === undefined) { comp[w] = c; pending.push(w); ehl[ids[x] + '-' + ids[w]] = cls; } });
          }
          frames.push({ narr: 'Pop <b>' + ids[s] + '</b> (unlabelled) → DFS on the flipped graph reaches <b>{' + members.join(', ') + '}</b>. It cannot escape into other components, so this is SCC <b>C' + (c + 1) + '</b>.', parts: [G(true, 'pass 2 — DFS on the transposed graph'), st(k), { type: 'set', label: 'SCC C' + (c + 1), items: members, hl: one(ids[s], 'cur') }] });
          c++;
        }
        var cn = [], cedges = [], seenE = {};
        for (var j = 0; j < c; j++) {
          var mem = ids.filter(function (id, i) { return comp[i] === j; });
          cn.push({ id: 'C' + (j + 1), label: 'C' + (j + 1) + ': ' + mem.join(','), x: Math.round((12 + 76 * (c === 1 ? 0.5 : j / (c - 1))) * 10) / 10, y: j % 2 ? 40 : 18, shape: 'box' });
        }
        P.edges.forEach(function (e) {
          var a = comp[ix[e[0]]], b = comp[ix[e[1]]], key = a + '-' + b;
          if (a !== b && !seenE[key]) { seenE[key] = true; cedges.push(['C' + (a + 1), 'C' + (b + 1)]); }
        });
        ehl = {};
        P.edges.forEach(function (e) { if (comp[ix[e[0]]] === comp[ix[e[1]]]) ehl[e[0] + '-' + e[1]] = COMP[comp[ix[e[0]]] % 4]; });
        frames.push({ narr: 'Done: <b>' + c + '</b> SCC' + (c === 1 ? '' : 's') + '. Squash each into one box — the <b>condensation</b> is a DAG, and Kosaraju already numbered the boxes in topological order (edges only go C-small → C-big).', parts: [G(false, 'original graph coloured by SCC'), { type: 'graph', label: 'condensation DAG', directed: true, height: 56, nodes: cn, edges: cedges }] });
        return frames;
      }
    },
    examples: [
      { title: 'A single cycle is one SCC', html: `<p>Edges <code>A→B, B→C, C→A</code>. Pass 1 from A: A, B, C entered; C finishes first, then B, then A (top). Flip: <code>B→A, C→B, A→C</code>. Pass 2 pops A and walks A → C → B: one SCC <b>{A, B, C}</b>.</p>${H.arr(['C', 'B', 'A'], { label: 'finish stack (A on top)', hl: { 2: 'g' } })}` },
      { title: 'A chain — every node alone', html: `<p><code>1→2→3</code>. Finish order 3, 2, 1 (1 on top). Flipped: <code>2→1, 3→2</code>. Pop 1: from 1 in the flipped graph there are no out-edges → {1}. Pop 2: its flipped edge goes to 1, already labelled → {2}. Pop 3 → {3}. Three SCCs, already in topological order 1, 2, 3.</p>` },
      { title: 'Why we must use the finish order (common bug)', html: `<p>Edges <code>0→1, 1→0, 1→2</code>. If you start pass 2 at <b>2</b> on the <b>original</b> graph you find {2} (fine), but starting at <b>0</b> on the original graph reaches {0, 1, 2} — wrong, 2 cannot come back. Using finish order on the <b>flipped</b> graph: pass 1 from 0: 0 → 1 → 2; finish 2, 1, 0. Pop 0 on the flipped graph (<code>1→0, 0→1, 2→1</code>): 0 reaches 1 only → {0, 1}. Pop 2 → {2}. ${H.c('g', 'Correct.')} In code: <code>comp = [0, 0, 1]</code>.</p>` },
      { title: 'Counting reachable sets with the condensation', html: `<p>"How many nodes can each node reach?" On a raw graph that is O(V·(V+E)). Condense first: inside one SCC everybody reaches the same set. Then on the DAG, process components in <b>reverse</b> topological order and combine children (with bitsets for exact counts). The SCC step turns a messy cyclic problem into a clean DAG DP.</p>` }
    ],
    deepDive: `<p><b>Proof sketch.</b> Let <code>f(C)</code> = the latest finish time of any node in component C (from pass 1). <b>Lemma:</b> if the condensation has an edge C → D, then <code>f(C) &gt; f(D)</code>. Case 1: DFS enters C first — it will explore all of D before C's first node finishes. Case 2: DFS enters D first — it cannot reach C (otherwise C and D would merge), so all of D finishes before C is even touched. Hence the global last-finisher is in a source component; on the transpose that component is a sink, and DFS from it stays inside. Induction on the remaining graph finishes the proof.</p>
      <p><b>Recursion depth is the real production bug.</b> A path graph with 10<sup>5</sup> nodes makes recursive DFS 10<sup>5</sup> frames deep → a stack overflow in most languages (Java <code>StackOverflowError</code> with a default thread stack of ≈ 512 KB–1 MB, JavaScript <code>RangeError</code> after about 10<sup>4</sup> frames, Python <code>RecursionError</code> after 1000). Fixes: (1) iterative DFS with an explicit stack of (node, next-edge-index) pairs, like the Python version above; (2) give the solver a bigger stack: a Java <code>new Thread(null, task, "dfs", 1 &lt;&lt; 27)</code> for 128 MB, <code>threading.stack_size</code> in Python, a larger stack limit for C++ — a standard competitive-programming trick.</p>
      <p><b>Memory and cache.</b> A list of lists of boxed integers (Java <code>List&lt;List&lt;Integer&gt;&gt;</code>, or a Python list of lists) costs far more than flat arrays; for 10<sup>6</sup> edges prefer CSR arrays (<code>start[]</code> and <code>to[]</code> of plain ints) — typically 3–5× faster. Kosaraju also needs the transpose (double memory), which is the main reason people prefer <b>Tarjan</b> (one pass, no transpose) for huge graphs.</p>
      <p><b>Where SCCs show up in real systems:</b> detecting circular imports in build tools (Bazel/Gradle report "cycle in dependency graph" — that cycle is an SCC), deadlock detection in wait-for graphs, finding "link farms" in web graphs, simplifying state machines and model checking (an infinite run must stay in one SCC), and the classic <b>2-SAT</b> solver used in scheduling and configuration problems.</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant will produce a Kosaraju or Tarjan implementation in seconds, and networkx / JGraphT have <code>strongly_connected_components</code> built in. Writing the code from memory is no longer the hard part.</p>
      <p><b>Use AI as a partner:</b> ask it <code>"Generate 6 tricky directed graphs for SCC testing: self-loops, a single node, two cycles joined one way, a 10^5-node path"</code>, then run your code on them. Ask it to convert your recursive DFS into an iterative one and check that both agree on random graphs.</p>
      <p><b>Where AI goes wrong:</b> it often forgets to <b>transpose</b> in pass 2, iterates pass 2 in <b>increasing</b> instead of decreasing finish order, or writes recursive code that overflows on 10<sup>5</sup> nodes. It also happily "finds SCCs" in an <b>undirected</b> graph, where the right concept is connected components or 2-edge-connected components.</p>
      <p><b>What you must still own:</b> spotting that a problem is secretly "condense then DAG-DP", explaining the finish-time lemma, and choosing Kosaraju vs Tarjan vs a library based on memory, recursion limits and whether you need topological order of components.</p>`,
    problems: [{
      title: 'Count the Strongly Connected Components',
      level: 'Medium', tags: ['graph', 'scc', 'kosaraju'], companies: ['Amazon', 'Microsoft', 'Flipkart'],
      statement: `<p>You are given a directed graph with <code>V</code> vertices numbered <code>0 … V−1</code> and a list of edges. Return the <b>number of strongly connected components</b>.</p>`,
      constraints: `<p>1 ≤ V ≤ 10<sup>5</sup>, 0 ≤ E ≤ 2·10<sup>5</sup>. Self-loops and repeated edges may appear.</p>`,
      example: `<p>V = 5, edges = <code>1→0, 0→2, 2→1, 0→3, 3→4</code> → output <b>${H.c('g', '3')}</b>.</p><p>Why: 0 → 2 → 1 → 0 is a cycle, so <b>{0, 1, 2}</b> is one SCC. 3 and 4 are on a one-way chain: <b>{3}</b>, <b>{4}</b>.</p>`,
      brute: {
        why: `<p>For every node run a BFS to find what it reaches, then two nodes share an SCC if each reaches the other. That is V BFS runs → <b>O(V·(V + E))</b> ≈ 10<sup>5</sup> × 3·10<sup>5</sup> = 3·10<sup>10</sup> steps. The wasted work: we recompute reachability for every node of the same component again and again.</p>`,
        code: `class Brute {
    int countSCC(int V, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < V; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(e[1]);
        boolean[][] reach = new boolean[V][V];
        for (int s = 0; s < V; s++) {                 // BFS from every node
            Deque<Integer> q = new ArrayDeque<>();
            q.add(s); reach[s][s] = true;
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int w : adj.get(u)) if (!reach[s][w]) { reach[s][w] = true; q.add(w); }
            }
        }
        int[] comp = new int[V];
        Arrays.fill(comp, -1);
        int c = 0;
        for (int u = 0; u < V; u++) {
            if (comp[u] != -1) continue;
            for (int v = 0; v < V; v++) if (reach[u][v] && reach[v][u]) comp[v] = c;
            c++;
        }
        return c;
    }
}`
      },
      mcq: { q: 'After pass 1 of Kosaraju, which node do you start pass 2 from?', options: ['The node that finished <b>last</b> (top of the stack)', 'The node that finished first', 'Node 0 always', 'The node with the highest out-degree'], answer: 0, explain: 'The last finisher lies in a source component of the condensation; on the flipped graph that component is a sink, so the DFS cannot leak out.' },
      hints: [
        `<p>Hint 1: Inside one SCC everybody reaches the same set of nodes. If you could start a DFS inside a component that has <b>no exits</b>, the DFS would collect exactly that component.</p>`,
        `<p>Hint 2: Finish times from one DFS tell you which component is a "source" in the component DAG. Flip all edges to turn sources into dead-ends (sinks).</p>`,
        `<p>Hint 3: Recipe — DFS #1 pushes nodes on finish; build the transpose; pop nodes, and each pop of an unlabelled node starts DFS #2 on the transpose = one new SCC. Use an iterative DFS (or a big thread stack) because V = 10<sup>5</sup> can be a single long path.</p>`
      ],
      tests: { sig: "string int int[][] -> int", fn: "scc", cases: [
          [["",5,[[1,0],[0,2],[2,1],[0,3],[3,4]]],3],
          [["",1,[]],1],
          [["",4,[]],4],
          [["",2,[[0,0],[0,1],[0,1]]],2],
          [["",4,[[0,1],[1,0],[1,2],[2,3],[3,2]]],2],
          [["",6,[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]]],1],
          [["",3,[[2,1],[1,0]]],3],
          [["",6,[]],6],
          [["",5,[[4,1],[3,3],[2,4],[2,2],[0,2],[1,0],[2,0],[1,3],[1,0],[0,2],[2,3],[1,1]]],2],
          [["",6,[[4,1],[4,2],[4,5],[1,4],[0,1],[2,1],[0,4]]],4],
          [["",5,[[1,0]]],5],
          [["",5,[[1,4],[3,2],[1,3],[4,4],[3,4],[4,4],[0,0],[4,1],[4,2],[4,3],[0,3]]],3],
          [["",8,[[7,1]]],8],
          [["",4,[[1,1]]],4],
          [["",6,[[3,0],[4,5],[1,0],[1,5],[1,0],[3,3]]],6],
          [["chain",100000,[]],100000],
          [["cycle",100000,[]],1],
          [["chords",100000,[]],1],
          [["twoCycles",100000,[]],2],
          [["outStar",100000,[]],100000]
        ], harness: { java: `class Check {
  static int[][] gen(String kind, int n) {
    List<int[]> e = new ArrayList<>();
    if (kind.equals("chain")) { for (int i = 0; i + 1 < n; i++) e.add(new int[]{i, i + 1}); }
    else if (kind.equals("outStar")) { for (int i = 1; i < n; i++) e.add(new int[]{0, i}); }
    else if (kind.equals("twoCycles")) {
      int h = n / 2;
      for (int i = 0; i < n; i++) { int b = i < h ? 0 : h, len = i < h ? h : n - h; e.add(new int[]{i, b + (i - b + 1) % len}); }
      e.add(new int[]{0, h});
    } else {
      for (int i = 0; i < n; i++) { e.add(new int[]{i, (i + 1) % n}); if (kind.equals("chords")) e.add(new int[]{i, (i + 2) % n}); }
    }
    return e.toArray(new int[0][]);
  }
  static int scc(String kind, int V, int[][] edges) {
    return new Solution().countSCC(V, kind.isEmpty() ? edges : gen(kind, V));
  }
}`, python: `def _gen(kind, n):
    if kind == 'chain':
        return [[i, i + 1] for i in range(n - 1)]
    if kind == 'outStar':
        return [[0, i] for i in range(1, n)]
    if kind == 'twoCycles':
        h = n // 2
        e = [[i, (i + 1) % h] for i in range(h)] + [[h + i, h + (i + 1) % (n - h)] for i in range(n - h)]
        return e + [[0, h]]
    e = [[i, (i + 1) % n] for i in range(n)]
    if kind == 'chords':
        e += [[i, (i + 2) % n] for i in range(n)]
    return e


def scc(kind, V, edges):
    return count_scc(V, edges if kind == '' else _gen(kind, V))`, js: `function _gen(kind, n) {
  const e = [];
  if (kind === 'chain') { for (let i = 0; i + 1 < n; i++) e.push([i, i + 1]); }
  else if (kind === 'outStar') { for (let i = 1; i < n; i++) e.push([0, i]); }
  else if (kind === 'twoCycles') {
    const h = Math.floor(n / 2);
    for (let i = 0; i < h; i++) e.push([i, (i + 1) % h]);
    for (let i = 0; i < n - h; i++) e.push([h + i, h + (i + 1) % (n - h)]);
    e.push([0, h]);
  } else {
    for (let i = 0; i < n; i++) { e.push([i, (i + 1) % n]); if (kind === 'chords') e.push([i, (i + 2) % n]); }
  }
  return e;
}
function scc(kind, V, edges) { return countSCC(V, kind === '' ? edges : _gen(kind, V)); }`, cpp: `vector<vector<int>> _gen(const string& kind, int n) {
  vector<vector<int>> e;
  if (kind == "chain") { for (int i = 0; i + 1 < n; i++) e.push_back({i, i + 1}); }
  else if (kind == "outStar") { for (int i = 1; i < n; i++) e.push_back({0, i}); }
  else if (kind == "twoCycles") {
    int h = n / 2;
    for (int i = 0; i < h; i++) e.push_back({i, (i + 1) % h});
    for (int i = 0; i < n - h; i++) e.push_back({h + i, h + (i + 1) % (n - h)});
    e.push_back({0, h});
  } else {
    for (int i = 0; i < n; i++) { e.push_back({i, (i + 1) % n}); if (kind == "chords") e.push_back({i, (i + 2) % n}); }
  }
  return e;
}
int scc(string kind, int V, vector<vector<int>> edges) {
  if (!kind.empty()) edges = _gen(kind, V);
  return Solution().countSCC(V, edges);
}` } },
      solution: {
        approach: `<p>Kosaraju with iterative DFS so a 10<sup>5</sup>-long chain cannot overflow the call stack. Each node and edge is touched a constant number of times in each pass.</p>`,
        code: `class Solution {
    int countSCC(int V, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>(), radj = new ArrayList<>();
        for (int i = 0; i < V; i++) { adj.add(new ArrayList<>()); radj.add(new ArrayList<>()); }
        for (int[] e : edges) { adj.get(e[0]).add(e[1]); radj.get(e[1]).add(e[0]); }

        // Pass 1: iterative DFS, record finish order
        boolean[] seen = new boolean[V];
        int[] nextIdx = new int[V];                 // which neighbour each node tries next
        int[] order = new int[V];
        int finished = 0;
        Deque<Integer> st = new ArrayDeque<>();
        for (int s = 0; s < V; s++) {
            if (seen[s]) continue;
            seen[s] = true;
            st.push(s);
            while (!st.isEmpty()) {
                int v = st.peek();
                if (nextIdx[v] < adj.get(v).size()) {
                    int w = adj.get(v).get(nextIdx[v]++);
                    if (!seen[w]) { seen[w] = true; st.push(w); }
                } else {
                    st.pop();
                    order[finished++] = v;          // v finished
                }
            }
        }

        // Pass 2: decreasing finish time, DFS on the transpose
        int[] comp = new int[V];
        Arrays.fill(comp, -1);
        int count = 0;
        for (int k = V - 1; k >= 0; k--) {
            int s = order[k];
            if (comp[s] != -1) continue;
            comp[s] = count;
            st.push(s);
            while (!st.isEmpty()) {
                int v = st.pop();
                for (int w : radj.get(v)) if (comp[w] == -1) { comp[w] = count; st.push(w); }
            }
            count++;
        }
        return count;
    }
}`,
      alt: [{ lang: 'python', code: `def count_scc(V, edges):
    adj = [[] for _ in range(V)]
    radj = [[] for _ in range(V)]
    for u, v in edges:
        adj[u].append(v)
        radj[v].append(u)

    # Pass 1: iterative DFS, record the finish order
    seen = [False] * V
    order = []
    for s in range(V):
        if seen[s]:
            continue
        seen[s] = True
        stack = [(s, iter(adj[s]))]
        while stack:
            v, it = stack[-1]
            for w in it:
                if not seen[w]:
                    seen[w] = True
                    stack.append((w, iter(adj[w])))
                    break
            else:                       # no neighbour left: v is finished
                stack.pop()
                order.append(v)

    # Pass 2: decreasing finish time, DFS on the transpose
    comp = [-1] * V
    count = 0
    for s in reversed(order):
        if comp[s] != -1:
            continue
        comp[s] = count
        stack = [s]
        while stack:
            v = stack.pop()
            for w in radj[v]:
                if comp[w] == -1:
                    comp[w] = count
                    stack.append(w)
        count += 1
    return count
` }, { lang: 'js', code: `function countSCC(V, edges) {
  const adj = Array.from({ length: V }, () => []);
  const radj = Array.from({ length: V }, () => []);
  for (const [u, v] of edges) { adj[u].push(v); radj[v].push(u); }

  // Pass 1: iterative DFS, record the finish order
  const seen = new Uint8Array(V), next = new Int32Array(V), order = [];
  for (let s = 0; s < V; s++) {
    if (seen[s]) continue;
    seen[s] = 1;
    const stack = [s];
    while (stack.length) {
      const v = stack[stack.length - 1];
      if (next[v] < adj[v].length) {
        const w = adj[v][next[v]++];
        if (!seen[w]) { seen[w] = 1; stack.push(w); }
      } else {
        stack.pop();
        order.push(v);                 // v finished
      }
    }
  }

  // Pass 2: decreasing finish time, DFS on the transpose
  const comp = new Int32Array(V).fill(-1);
  let count = 0;
  for (let k = V - 1; k >= 0; k--) {
    const s = order[k];
    if (comp[s] !== -1) continue;
    comp[s] = count;
    const stack = [s];
    while (stack.length) {
      const v = stack.pop();
      for (const w of radj[v]) if (comp[w] === -1) { comp[w] = count; stack.push(w); }
    }
    count++;
  }
  return count;
}
` }, { lang: 'cpp', code: `class Solution {
public:
    int countSCC(int V, vector<vector<int>>& edges) {
        vector<vector<int>> adj(V), radj(V);
        for (auto& e : edges) { adj[e[0]].push_back(e[1]); radj[e[1]].push_back(e[0]); }

        // Pass 1: iterative DFS, record the finish order
        vector<char> seen(V, 0);
        vector<int> next(V, 0), order;
        order.reserve(V);
        for (int s = 0; s < V; s++) {
            if (seen[s]) continue;
            seen[s] = 1;
            vector<int> st{s};
            while (!st.empty()) {
                int v = st.back();
                if (next[v] < (int)adj[v].size()) {
                    int w = adj[v][next[v]++];
                    if (!seen[w]) { seen[w] = 1; st.push_back(w); }
                } else {
                    st.pop_back();
                    order.push_back(v);              // v finished
                }
            }
        }

        // Pass 2: decreasing finish time, DFS on the transpose
        vector<int> comp(V, -1);
        int count = 0;
        for (int k = V - 1; k >= 0; k--) {
            int s = order[k];
            if (comp[s] != -1) continue;
            comp[s] = count;
            vector<int> st{s};
            while (!st.empty()) {
                int v = st.back(); st.pop_back();
                for (int w : radj[v]) if (comp[w] == -1) { comp[w] = count; st.push_back(w); }
            }
            count++;
        }
        return count;
    }
};
` }],
        dry: {
          head: ['step', 'action', 'stack / order', 'result'],
          rows: [
            ['1', 'DFS from 0: 0 → 2 → 1 (1→0 seen) → 1 finishes', 'order = [1]', ''],
            ['2', '2 finishes; back at 0, go 0 → 3 → 4', 'order = [1, 2]', ''],
            ['3', '4 finishes, 3 finishes, 0 finishes', 'order = [1, 2, 4, 3, 0]', '0 on top'],
            ['4', 'pop 0, DFS on transpose (edges 0→1, 1→2, 2→0)', 'reaches 0, 1, 2', H.c('g', 'SCC #1 {0,1,2}')],
            ['5', 'pop 3: transpose edge 3→0 goes to a labelled node', 'reaches 3', H.c('g', 'SCC #2 {3}')],
            ['6', 'pop 4: edge 4→3 labelled', 'reaches 4', H.c('g', 'SCC #3 {4}')],
            ['7', 'pop 2, 1: already labelled', '—', '<b>answer 3</b>']
          ]
        },
        complexity: `<p>Time <b>O(V + E)</b> (two DFS passes + building the transpose). Space <b>O(V + E)</b> for the two adjacency lists, plus O(V) for stacks and arrays.</p>`,
        followUps: ['Return the components themselves, sorted.', 'Return the size of the largest SCC.', 'Solve it with Tarjan in a single pass and without building the transpose.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 2 — Tarjan's SCC: disc / low in one DFS
  // =====================================================================
  topics.push({
    title: 'Tarjan\'s SCC Algorithm: disc[], low[] and One Single DFS',
    analogy: `<p>Think of a group of hikers exploring caves. Each hiker writes down the <b>time they entered</b> each cave (<code>disc</code>). They also ask: "<b>What is the oldest cave I can get back to</b> from here, using tunnels that lead to caves we are still exploring?" (<code>low</code>).</p>
      <p>If a cave's "oldest cave I can get back to" is <b>itself</b>, then nobody below it can climb any higher — this cave is the <b>entrance of a closed cave system</b>. Everybody who entered after it and is still waiting on the rope (the stack) belongs to that system. Cut the rope there: that group is one SCC.</p>`,
    explain: `<p>Tarjan finds all SCCs in <b>one DFS</b>, with no flipped graph. It keeps two numbers per node:</p>
      ${H.table(['name', 'plain meaning', 'starts as'], [
        ['<code>disc[v]</code>', 'the "arrival time": the order in which DFS first reached v (0, 1, 2, …)', 'timer++'],
        ['<code>low[v]</code>', 'the smallest <code>disc</code> v can reach by going down its DFS subtree and then taking <b>at most one</b> edge to a node that is <b>still on the stack</b>', 'disc[v]']
      ])}
      <p>And one <b>stack</b> of nodes whose SCC is not decided yet. The rules while visiting <code>v</code>:</p>
      <ol>
        <li>Set <code>disc[v] = low[v] = timer++</code>, push v on the stack.</li>
        <li>For every edge <code>v → w</code>:
          <ul>
            <li>${H.c('b', 'w unvisited')} (tree edge): visit w first, then <code>low[v] = min(low[v], low[w])</code> — "if my child can climb high, so can I".</li>
            <li>${H.c('p', 'w is on the stack')} (back edge into an open component): <code>low[v] = min(low[v], disc[w])</code>.</li>
            <li>${H.c('m', 'w visited but NOT on the stack')}: w's SCC is already closed and finished. <b>Ignore</b> — it can never be in v's SCC.</li>
          </ul></li>
        <li>After all edges: if <code>low[v] == disc[v]</code>, v is the <b>root</b> (first-entered node) of its SCC. Pop the stack down to and including v — that is one complete SCC.</li>
      </ol>
      <p><b>Worked mini-example</b> — edges <code>A→B, B→C, C→A, B→D</code>:</p>
      ${H.table(['step', 'event', 'disc/low', 'stack'], [
        ['1', 'enter A', 'A 0/0', 'A'],
        ['2', 'enter B', 'B 1/1', 'A B'],
        ['3', 'enter C', 'C 2/2', 'A B C'],
        ['4', 'C→A, A on stack', 'C 2/' + H.c('p', '0'), 'A B C'],
        ['5', 'back to B: low = min(1, 0)', 'B 1/0', 'A B C'],
        ['6', 'B→D: enter D, no edges, low = disc', 'D 3/3', 'A B C D'],
        ['7', 'D is a root → pop', H.c('g', 'SCC {D}'), 'A B C'],
        ['8', 'A finishes, low = disc = 0 → pop', H.c('g', 'SCC {C, B, A}'), 'empty']
      ])}
      <p>Notice the SCCs come out in <b>reverse topological order</b> of the condensation ({D} first, even though A's component points to it). If you need topological order, just reverse the list.</p>`,
    clues: [
      '"Find SCCs" with a hint of <b>memory pressure</b> or "single pass" → Tarjan (no transpose graph).',
      'You need components in <b>reverse topological order</b> (e.g. for DP from sinks up, or 2-SAT assignment) → Tarjan gives it for free.',
      'The words "<b>disc / low</b>", "<b>low-link</b>", "lowest reachable ancestor" in a hint → Tarjan-family algorithm (SCC, bridges, articulation points).',
      '"<b>Minimum edges to add</b> to make every node reachable from every node" → SCC + count sources and sinks of the condensation.',
      '"Can every city reach the capital and come back?" / "is this graph strongly connected?" → one SCC check (or BFS from 0 on graph + transpose).',
      '<code>N ≤ 10<sup>5</sup></code> directed edges + cycles + "longest path / max coins" → Tarjan, condense, then DP on the DAG.'
    ],
    code: [{ lang: 'java', code: `
      class TarjanSCC {
          private final List<List<Integer>> adj;
          private final int[] disc, low;
          private final boolean[] onStack;
          private final Deque<Integer> stack = new ArrayDeque<>();
          private final List<List<Integer>> sccs = new ArrayList<>();
          private int timer = 0;

          TarjanSCC(int n, List<List<Integer>> adj) {
              this.adj = adj;
              disc = new int[n];
              low = new int[n];
              onStack = new boolean[n];
              Arrays.fill(disc, -1);                         // -1 = not visited yet
              for (int v = 0; v < n; v++) if (disc[v] == -1) dfs(v);
          }

          private void dfs(int v) {
              disc[v] = low[v] = timer++;                    // arrival time; low starts as itself
              stack.push(v);
              onStack[v] = true;
              for (int w : adj.get(v)) {
                  if (disc[w] == -1) {                       // tree edge: explore the child first
                      dfs(w);
                      low[v] = Math.min(low[v], low[w]);     // if my child can climb up, so can I
                  } else if (onStack[w]) {                   // edge into a still-OPEN component
                      low[v] = Math.min(low[v], disc[w]);
                  }                                          // else: w's SCC is closed -> ignore
              }
              if (low[v] == disc[v]) {                       // v is the root of its SCC
                  List<Integer> comp = new ArrayList<>();
                  int w;
                  do {
                      w = stack.pop();
                      onStack[w] = false;
                      comp.add(w);
                  } while (w != v);
                  sccs.add(comp);                            // reverse topological order
              }
          }

          List<List<Integer>> components() { return sccs; }
      }`, alt: [{ lang: 'python', code: `class TarjanSCC:
    # Recursive form: clear, but see the iterative version below for deep graphs.
    def __init__(self, n, adj):
        self.adj = adj
        self.disc = [-1] * n                    # -1 = not visited yet
        self.low = [0] * n
        self.on_stack = [False] * n
        self.stack = []
        self.sccs = []                          # components come out in reverse topological order
        self.timer = 0
        for v in range(n):
            if self.disc[v] == -1:
                self._dfs(v)

    def _dfs(self, v):
        self.disc[v] = self.low[v] = self.timer     # arrival time; low starts as itself
        self.timer += 1
        self.stack.append(v)
        self.on_stack[v] = True
        for w in self.adj[v]:
            if self.disc[w] == -1:                  # tree edge: explore the child first
                self._dfs(w)
                self.low[v] = min(self.low[v], self.low[w])    # if my child can climb up, so can I
            elif self.on_stack[w]:                  # edge into a still-OPEN component
                self.low[v] = min(self.low[v], self.disc[w])
            # else: w's SCC is closed -> ignore
        if self.low[v] == self.disc[v]:             # v is the root of its SCC
            comp = []
            while True:
                w = self.stack.pop()
                self.on_stack[w] = False
                comp.append(w)
                if w == v:
                    break
            self.sccs.append(comp)

    def components(self):
        return self.sccs
` }, { lang: 'js', code: `class TarjanSCC {
  // Recursive form: clear, but use an explicit stack for graphs deeper than ~10^4.
  constructor(n, adj) {
    this.adj = adj;
    this.disc = new Array(n).fill(-1);          // -1 = not visited yet
    this.low = new Array(n).fill(0);
    this.onStack = new Array(n).fill(false);
    this.stack = [];
    this.sccs = [];                             // components come out in reverse topological order
    this.timer = 0;
    for (let v = 0; v < n; v++) if (this.disc[v] === -1) this.dfs(v);
  }

  dfs(v) {
    this.disc[v] = this.low[v] = this.timer++;  // arrival time; low starts as itself
    this.stack.push(v);
    this.onStack[v] = true;
    for (const w of this.adj[v]) {
      if (this.disc[w] === -1) {                // tree edge: explore the child first
        this.dfs(w);
        this.low[v] = Math.min(this.low[v], this.low[w]);   // if my child can climb up, so can I
      } else if (this.onStack[w]) {             // edge into a still-OPEN component
        this.low[v] = Math.min(this.low[v], this.disc[w]);
      }                                         // else: w's SCC is closed -> ignore
    }
    if (this.low[v] === this.disc[v]) {         // v is the root of its SCC
      const comp = [];
      let w;
      do {
        w = this.stack.pop();
        this.onStack[w] = false;
        comp.push(w);
      } while (w !== v);
      this.sccs.push(comp);
    }
  }

  components() { return this.sccs; }
}
` }, { lang: 'cpp', code: `class TarjanSCC {
    const vector<vector<int>>& adj;
    vector<int> disc, low, stk;
    vector<char> onStack;
    vector<vector<int>> sccs;                   // components come out in reverse topological order
    int timer = 0;

    void dfs(int v) {
        disc[v] = low[v] = timer++;             // arrival time; low starts as itself
        stk.push_back(v);
        onStack[v] = 1;
        for (int w : adj[v]) {
            if (disc[w] == -1) {                // tree edge: explore the child first
                dfs(w);
                low[v] = min(low[v], low[w]);   // if my child can climb up, so can I
            } else if (onStack[w]) {            // edge into a still-OPEN component
                low[v] = min(low[v], disc[w]);
            }                                   // else: w's SCC is closed -> ignore
        }
        if (low[v] == disc[v]) {                // v is the root of its SCC
            vector<int> comp;
            int w;
            do {
                w = stk.back();
                stk.pop_back();
                onStack[w] = 0;
                comp.push_back(w);
            } while (w != v);
            sccs.push_back(comp);
        }
    }

public:
    TarjanSCC(int n, const vector<vector<int>>& adj) : adj(adj), disc(n, -1), low(n, 0), onStack(n, 0) {
        for (int v = 0; v < n; v++) if (disc[v] == -1) dfs(v);
    }

    const vector<vector<int>>& components() const { return sccs; }
};
` }] }, {
      lang: 'python', run: true, title: 'Iterative Tarjan in Python — runnable',
      code: `def tarjan(n, adj):
    disc = [-1] * n
    low = [0] * n
    on_stack = [False] * n
    stack, sccs = [], []
    timer = 0
    for root in range(n):
        if disc[root] != -1:
            continue
        disc[root] = low[root] = timer
        timer += 1
        stack.append(root)
        on_stack[root] = True
        work = [(root, 0)]                      # (node, index of next neighbour)
        while work:
            v, i = work[-1]
            if i < len(adj[v]):
                work[-1] = (v, i + 1)
                w = adj[v][i]
                if disc[w] == -1:               # tree edge: "recurse"
                    disc[w] = low[w] = timer
                    timer += 1
                    stack.append(w)
                    on_stack[w] = True
                    work.append((w, 0))
                elif on_stack[w]:               # edge into an open component
                    low[v] = min(low[v], disc[w])
            else:                               # v is finished: "return"
                work.pop()
                if work:
                    parent = work[-1][0]
                    low[parent] = min(low[parent], low[v])
                if low[v] == disc[v]:           # v is the root of an SCC
                    comp = []
                    while True:
                        w = stack.pop()
                        on_stack[w] = False
                        comp.append(w)
                        if w == v:
                            break
                    sccs.append(comp)
    return sccs


names = "ABCDEFG"
edges = ["AB", "BC", "CA", "BD", "DE", "EF", "FD", "EG"]
adj = [[] for _ in names]
for e in edges:
    adj[names.index(e[0])].append(names.index(e[1]))
for comp in tarjan(len(names), adj):
    print(sorted(names[v] for v in comp))
`
    }],
    codeTitle: ['Tarjan (recursive)', 'Tarjan in Python (iterative, safe for deep graphs)'],
    viz: {
      title: 'Tarjan live: watch disc/low tags, the stack, and SCCs popping off',
      input: 'A>B B>C C>A B>D D>E E>F F>D E>G',
      inputLabel: 'Directed edges "u>v" separated by spaces (up to 10 nodes, 18 edges)',
      gen: function (input) {
        var P = parseEdges(input, { example: 'A>B B>C C>A', maxN: 10, maxE: 18 });
        var ids = P.ids, n = ids.length, ix = {};
        ids.forEach(function (id, i) { ix[id] = i; });
        var adj = ids.map(function () { return []; });
        P.edges.forEach(function (e) { adj[ix[e[0]]].push(ix[e[1]]); });
        var nodes = circle(ids, 70), frames = [], disc = [], low = [], onSt = [], st = [], comp = [], timer = 0, c = 0, hl = {}, tags = {}, ehl = {};
        var TC = ['ok', 'sel'];
        var CODE = 'disc[v] = low[v] = timer++; push v\nfor each edge v -> w:\n  if w unvisited: dfs(w); low[v] = min(low[v], low[w])\n  elif w on stack: low[v] = min(low[v], disc[w])\n  else: ignore (w is in a closed SCC)\nif low[v] == disc[v]: pop down to v = one SCC';
        function tag(i) { tags[ids[i]] = (comp[i] !== undefined ? 'C' + (comp[i] + 1) + ' ' : '') + disc[i] + '/' + low[i]; }
        function F(narr, line, v) {
          frames.push({ narr: narr, parts: [
            { type: 'graph', label: 'tags = disc/low', directed: true, height: 70, nodes: nodes, edges: P.edges.map(function (e) { return [e[0], e[1]]; }), hl: copy(hl), ehl: copy(ehl), tags: copy(tags) },
            { type: 'stack', label: 'Tarjan stack (SCC not decided yet)', items: st.map(function (i) { return ids[i]; }), hl: v >= 0 && onSt[v] ? one(st.indexOf(v), 'cur') : {} },
            { type: 'vars', label: 'state', vals: { timer: timer, v: v >= 0 ? ids[v] : '-', 'disc[v]': v >= 0 ? disc[v] : '-', 'low[v]': v >= 0 ? low[v] : '-', 'SCCs found': c }, hl: { 'low[v]': 'cur' } },
            { type: 'code', label: 'rule being applied', lang: 'text', code: CODE, hl: one(line, 'cur') }
          ] });
        }
        F('Start: every node unvisited, timer = 0, empty stack. Tag format on each node will be <b>disc/low</b>.', 1, -1);
        function dfs(v) {
          disc[v] = low[v] = timer++;
          st.push(v); onSt[v] = true; hl[ids[v]] = 'cur'; tag(v);
          F('Enter <b>' + ids[v] + '</b>: disc = low = <b>' + disc[v] + '</b>. Push it on the stack — its SCC is not known yet.', 1, v);
          adj[v].forEach(function (w) {
            var key = ids[v] + '-' + ids[w], old;
            if (disc[w] === undefined) {
              ehl[key] = 'win'; hl[ids[v]] = 'win';
              dfs(w);
              hl[ids[v]] = 'cur';
              old = low[v]; low[v] = Math.min(low[v], low[w]); tag(v);
              F('Back at <b>' + ids[v] + '</b> from child ' + ids[w] + ': low = min(' + old + ', low[' + ids[w] + ']=' + low[w] + ') = <b>' + low[v] + '</b>' + (low[v] < old ? ' — the child found a way up, so ' + ids[v] + ' can climb too.' : ' — no improvement.'), 3, v);
            } else if (onSt[w]) {
              ehl[key] = 'sel';
              old = low[v]; low[v] = Math.min(low[v], disc[w]); tag(v);
              F('Edge ' + ids[v] + '→' + ids[w] + ': <b>' + ids[w] + ' is still on the stack</b> (same open group) → low = min(' + old + ', disc[' + ids[w] + ']=' + disc[w] + ') = <b>' + low[v] + '</b>.', 4, v);
            } else {
              ehl[key] = 'done';
              F('Edge ' + ids[v] + '→' + ids[w] + ': ' + ids[w] + ' is visited but <b>not on the stack</b> — its SCC (C' + (comp[w] + 1) + ') is already closed. Ignore this edge.', 5, v);
            }
          });
          if (low[v] === disc[v]) {
            var mem = [], w;
            do { w = st.pop(); onSt[w] = false; comp[w] = c; mem.push(ids[w]); hl[ids[w]] = TC[c % 2]; tag(w); } while (w !== v);
            c++;
            F('<b>' + ids[v] + '</b> finished with low == disc (' + disc[v] + '): nobody below it reaches anything older. It is an SCC root → pop <b>{' + mem.join(', ') + '}</b> as SCC C' + c + '.', 6, v);
          } else {
            hl[ids[v]] = 'win';
            F('<b>' + ids[v] + '</b> finished, but low (' + low[v] + ') &lt; disc (' + disc[v] + '): it can reach an older open node, so it <b>stays on the stack</b> and waits for its root.', 6, v);
          }
        }
        for (var v = 0; v < n; v++) if (disc[v] === undefined) dfs(v);
        F('All done: <b>' + c + '</b> SCC' + (c === 1 ? '' : 's') + '. They came out in <b>reverse topological order</b> of the component DAG (sinks first).', 6, -1);
        return frames;
      }
    },
    examples: [
      { title: 'Why "on the stack" matters (cross edges)', html: `<p>Edges <code>A→B, A→C, C→B</code>. DFS: A(0) → B(1). B has no edges → root → SCC {B} popped. Then A → C(2). Edge C→B: B is visited but <b>not on the stack</b>. If we wrongly did <code>low[C] = min(2, disc[B]=1)</code>, C would think it belongs with something older and never become a root → C and A would be merged into one SCC. ${H.c('r', 'Wrong!')} The on-stack check stops that.</p>` },
      { title: 'A big cycle: everyone gets low = 0', html: `<p><code>0→1→2→3→0</code>. disc = 0, 1, 2, 3. Node 3 sees 0 on the stack → low[3] = 0. Returning, low[2] = low[1] = 0. Only node 0 has low == disc, so the whole cycle pops at once.</p>${H.table(['node', 'disc', 'low'], [['0', '0', H.c('g', '0 (root)')], ['1', '1', '0'], ['2', '2', '0'], ['3', '3', '0']])}` },
      { title: 'Using disc[w] vs low[w] for back edges', html: `<p>For SCCs both <code>low[v] = min(low[v], disc[w])</code> and <code>min(low[v], low[w])</code> (for an on-stack w) give correct components — w's low is also inside the same open group. The <b>textbook</b> uses <code>disc[w]</code>, and for <b>articulation points</b> you <b>must</b> use <code>disc[w]</code> (next topic), so build the habit now.</p>` },
      { title: 'Self-loop and isolated node', html: `<p><code>A→A</code> and lone node <code>B</code>. A: disc = low = 0; its self-edge sees A on the stack, low stays 0; root → {A}. B → {B}. Both are size-1 SCCs. If a problem says "a node is in a cycle", remember a size-1 SCC is a cycle <b>only</b> if it has a self-loop.</p>` }
    ],
    deepDive: `<p><b>Why <code>low == disc</code> marks the root.</b> Every SCC has exactly one node that DFS enters first — call it r. All other members are DFS descendants of r (DFS from r reaches them before r finishes). A member below r can reach r and anything r reaches, but nothing <b>outside the stack</b>; and nothing in r's subtree reaches a node older than r that is still open (else that node would be in the same SCC, and it would be the first-entered one). So low[r] = disc[r], and for every other member low &lt; disc. Popping at r removes exactly the members, because they were pushed after r and none was popped earlier.</p>
      <p><b>Kosaraju vs Tarjan in practice:</b></p>
      ${H.table(['', 'Kosaraju', 'Tarjan'], [
        ['passes', '2 DFS', '1 DFS'],
        ['extra memory', 'transpose graph (≈ doubles edges)', 'disc, low, onStack arrays + stack'],
        ['component order', 'topological', 'reverse topological'],
        ['easy to explain', 'very', 'needs the low-link idea'],
        ['iterative version', 'easy', 'a bit fiddly (pass low to parent on pop)']
      ])}
      <p><b>Gabow / path-based SCC</b> is a third O(V + E) variant using two stacks instead of low values. Libraries: networkx uses a non-recursive Tarjan variant; Boost Graph Library has <code>strong_components</code> (Tarjan). For huge graphs (billions of edges) people use parallel algorithms such as forward-backward (FW-BW) with trimming, because DFS is inherently sequential.</p>
      <p><b>2-SAT connection:</b> build an implication graph with 2n literal nodes. The formula is satisfiable iff no variable <code>x</code> is in the same SCC as <code>¬x</code>. Tarjan's reverse-topological order gives the assignment directly: set <code>x = true</code> if comp[x] comes <b>earlier</b> in Tarjan's output than comp[¬x] (it is "later" in topological order).</p>`,
    aiEra: `<p><b>What AI changes:</b> Tarjan used to be the classic "can you remember it?" algorithm. Today an assistant writes it instantly, so interviewers shift to <b>why</b>: "why ignore edges to nodes not on the stack?", "why is low == disc the root?", "what order do components come out in?".</p>
      <p><b>Use AI as a partner:</b> ask <code>"Write a randomized test that compares my Tarjan with a brute-force SCC (BFS reachability both ways) on 1000 random graphs with up to 8 nodes"</code>. That kind of differential test catches the on-stack bug immediately.</p>
      <p><b>Where AI goes wrong:</b> mixing up the SCC version and the bridge version (SCC needs the <code>onStack</code> check; bridges need the parent-edge skip), using <code>low[w]</code> where <code>disc[w]</code> is required for articulation points, and producing recursive code that crashes on deep graphs in Python (default recursion limit 1000) and Java.</p>
      <p><b>What you must still own:</b> the invariant behind <code>low</code>, choosing between Kosaraju and Tarjan, and turning "SCC" into the real answer (sources/sinks, DAG DP, 2-SAT assignment).</p>`,
    problems: [{
      title: 'Minimum Edges to Make a Directed Graph Strongly Connected',
      level: 'Hard', tags: ['scc', 'tarjan', 'condensation'], companies: ['Google', 'Uber'],
      statement: `<p>A directed graph has <code>V</code> nodes and the given edges. Return the <b>minimum number of new directed edges</b> you must add so that every node can reach every other node.</p>`,
      constraints: `<p>1 ≤ V ≤ 10<sup>5</sup>, 0 ≤ E ≤ 2·10<sup>5</sup>.</p>`,
      example: `<p>V = 5, edges <code>0→1, 1→2, 2→0, 2→3, 4→3</code> → output <b>${H.c('g', '2')}</b>.</p><p>Why: SCCs are {0,1,2}, {3}, {4}. Condensation: {0,1,2} → {3} ← {4}. ${H.c('b', 'Sources')} (no incoming) = {0,1,2}, {4} → 2. ${H.c('p', 'Sinks')} (no outgoing) = {3} → 1. Answer max(2, 1) = 2, e.g. add 3→0 and 3→4.</p>`,
      brute: {
        why: `<p>Try adding 0 edges, then every set of 1 edge, then every set of 2 edges, … and test strong connectivity each time. With V² possible edges and k chosen, that is C(V², k) tests — hopeless beyond V ≈ 6. The waste: all nodes inside one SCC are interchangeable, so most choices are equivalent.</p>`,
        code: `class Brute {
    int V;
    List<List<Integer>> adj;

    int minEdges(int V, int[][] edges) {
        this.V = V;
        adj = new ArrayList<>();
        for (int i = 0; i < V; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(e[1]);
        for (int k = 0; ; k++) if (tryAdd(k, 0)) return k;   // k = V always works (a big cycle)
    }

    boolean tryAdd(int left, int from) {                  // add 'left' more edges, pairs >= from
        if (left == 0) return reachAll(false) && reachAll(true);
        for (int p = from; p < V * V; p++) {
            int u = p / V, v = p % V;
            if (u == v) continue;
            adj.get(u).add(v);
            boolean ok = tryAdd(left - 1, p + 1);
            adj.get(u).remove(adj.get(u).size() - 1);
            if (ok) return true;
        }
        return false;
    }

    boolean reachAll(boolean reversed) {                  // node 0 reaches all (or all reach 0)
        boolean[] seen = new boolean[V];
        Deque<Integer> q = new ArrayDeque<>();
        q.add(0);
        seen[0] = true;
        int cnt = 1;
        while (!q.isEmpty()) {
            int u = q.poll();
            for (int x = 0; x < V; x++) {
                boolean edge = reversed ? adj.get(x).contains(u) : adj.get(u).contains(x);
                if (edge && !seen[x]) { seen[x] = true; cnt++; q.add(x); }
            }
        }
        return cnt == V;
    }
}`
      },
      mcq: { q: 'The condensation has 4 sources and 2 sinks (and more than one SCC). How many edges are needed?', options: ['4', '2', '6', '3'], answer: 0, explain: 'Every source needs at least one new incoming edge and every sink at least one new outgoing edge; one new edge fixes at most one of each, so we need ≥ max(4, 2) = 4, and a careful pairing achieves it.' },
      hints: [
        `<p>Hint 1: Nodes inside one SCC already reach each other. Shrink every SCC to a single node — now you have a DAG and the question is about that DAG.</p>`,
        `<p>Hint 2: In the DAG, a <b>source</b> component needs a new incoming edge and a <b>sink</b> component needs a new outgoing edge. One added edge can fix one sink and one source at the same time.</p>`,
        `<p>Hint 3: Recipe — run Tarjan (iterative for V = 10<sup>5</sup>), mark for each component whether it has an incoming / outgoing edge from another component, count sources S and sinks T. If there is only one SCC answer 0, else max(S, T). Edge case: a single node → 0.</p>`
      ],
      tests: { sig: "string int int[][] -> int", fn: "minE", cases: [
          [["",5,[[0,1],[1,2],[2,0],[2,3],[4,3]]],2],
          [["",1,[]],0],
          [["",1,[[0,0]]],0],
          [["",2,[]],2],
          [["",3,[[0,1],[1,2],[2,0]]],0],
          [["",3,[[0,1],[1,2]]],1],
          [["",4,[[0,1],[0,2],[0,3]]],3],
          [["",4,[[1,2],[3,2]]],3],
          [["",3,[[2,0],[2,0]]],2],
          [["",3,[[1,0],[2,1],[2,0],[2,0],[0,0],[0,2]]],0],
          [["",3,[[2,0],[1,1],[0,1],[0,0],[2,2]]],1],
          [["",2,[[0,1],[1,0],[1,0],[1,1],[1,0],[1,0],[1,1]]],0],
          [["",5,[[2,0],[4,4],[2,1],[4,4],[2,1]]],4],
          [["",2,[[0,0],[1,1],[1,0],[0,1],[1,1],[1,0],[0,0]]],0],
          [["",4,[]],4],
          [["",3,[[0,2],[1,1],[1,2],[1,2],[0,0],[2,0]]],1],
          [["",4,[[2,1],[1,2],[0,0],[2,3],[2,0],[2,3]]],2],
          [["",6,[[0,2],[1,2],[3,4],[3,5]]],3],
          [["",6,[[0,1],[1,2],[2,0],[3,4],[4,5],[5,3]]],2],
          [["",6,[[0,2],[1,2],[2,3],[3,4],[3,5]]],2],
          [["",100000,[]],100000],
          [["chain",100000,[]],1],
          [["cycle",100000,[]],0],
          [["chords",100000,[]],0],
          [["twoCycles",100000,[]],1],
          [["outStar",100000,[]],99999]
        ], harness: { java: `class Check {
  static int[][] gen(String kind, int n) {
    List<int[]> e = new ArrayList<>();
    if (kind.equals("chain")) { for (int i = 0; i + 1 < n; i++) e.add(new int[]{i, i + 1}); }
    else if (kind.equals("outStar")) { for (int i = 1; i < n; i++) e.add(new int[]{0, i}); }
    else if (kind.equals("twoCycles")) {
      int h = n / 2;
      for (int i = 0; i < n; i++) { int b = i < h ? 0 : h, len = i < h ? h : n - h; e.add(new int[]{i, b + (i - b + 1) % len}); }
      e.add(new int[]{0, h});
    } else {
      for (int i = 0; i < n; i++) { e.add(new int[]{i, (i + 1) % n}); if (kind.equals("chords")) e.add(new int[]{i, (i + 2) % n}); }
    }
    return e.toArray(new int[0][]);
  }
  static int minE(String kind, int V, int[][] edges) {
    return new Solution().minEdgesToStronglyConnect(V, kind.isEmpty() ? edges : gen(kind, V));
  }
}`, python: `def _gen(kind, n):
    if kind == 'chain':
        return [[i, i + 1] for i in range(n - 1)]
    if kind == 'outStar':
        return [[0, i] for i in range(1, n)]
    if kind == 'twoCycles':
        h = n // 2
        e = [[i, (i + 1) % h] for i in range(h)] + [[h + i, h + (i + 1) % (n - h)] for i in range(n - h)]
        return e + [[0, h]]
    e = [[i, (i + 1) % n] for i in range(n)]
    if kind == 'chords':
        e += [[i, (i + 2) % n] for i in range(n)]
    return e


def min_e(kind, V, edges):
    return min_edges_to_strongly_connect(V, edges if kind == '' else _gen(kind, V))`, js: `function _gen(kind, n) {
  const e = [];
  if (kind === 'chain') { for (let i = 0; i + 1 < n; i++) e.push([i, i + 1]); }
  else if (kind === 'outStar') { for (let i = 1; i < n; i++) e.push([0, i]); }
  else if (kind === 'twoCycles') {
    const h = Math.floor(n / 2);
    for (let i = 0; i < h; i++) e.push([i, (i + 1) % h]);
    for (let i = 0; i < n - h; i++) e.push([h + i, h + (i + 1) % (n - h)]);
    e.push([0, h]);
  } else {
    for (let i = 0; i < n; i++) { e.push([i, (i + 1) % n]); if (kind === 'chords') e.push([i, (i + 2) % n]); }
  }
  return e;
}
function minE(kind, V, edges) { return minEdgesToStronglyConnect(V, kind === '' ? edges : _gen(kind, V)); }`, cpp: `vector<vector<int>> _gen(const string& kind, int n) {
  vector<vector<int>> e;
  if (kind == "chain") { for (int i = 0; i + 1 < n; i++) e.push_back({i, i + 1}); }
  else if (kind == "outStar") { for (int i = 1; i < n; i++) e.push_back({0, i}); }
  else if (kind == "twoCycles") {
    int h = n / 2;
    for (int i = 0; i < h; i++) e.push_back({i, (i + 1) % h});
    for (int i = 0; i < n - h; i++) e.push_back({h + i, h + (i + 1) % (n - h)});
    e.push_back({0, h});
  } else {
    for (int i = 0; i < n; i++) { e.push_back({i, (i + 1) % n}); if (kind == "chords") e.push_back({i, (i + 2) % n}); }
  }
  return e;
}
int minE(string kind, int V, vector<vector<int>> edges) {
  if (!kind.empty()) edges = _gen(kind, V);
  return Solution().minEdgesToStronglyConnect(V, edges);
}` } },
      solution: {
        approach: `<p>Iterative Tarjan labels each node with its component. One pass over edges marks hasIn / hasOut for components (ignoring edges inside a component). The lower bound max(S, T) is achievable — the classic Eswaran–Tarjan result (1976) — by linking sinks to sources in a ring-like pattern.</p>`,
        code: `class Solution {
    int minEdgesToStronglyConnect(int V, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < V; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(e[1]);

        int[] disc = new int[V], low = new int[V], comp = new int[V], it = new int[V];
        Arrays.fill(disc, -1);
        boolean[] onStack = new boolean[V];
        int[] stack = new int[V], work = new int[V];      // Tarjan stack + simulated call stack
        int sp = 0, wp = 0, timer = 0, comps = 0;

        for (int r = 0; r < V; r++) {
            if (disc[r] != -1) continue;
            disc[r] = low[r] = timer++;
            stack[sp++] = r; onStack[r] = true; work[wp++] = r;
            while (wp > 0) {
                int v = work[wp - 1];
                if (it[v] < adj.get(v).size()) {
                    int w = adj.get(v).get(it[v]++);
                    if (disc[w] == -1) {                    // "recursive call"
                        disc[w] = low[w] = timer++;
                        stack[sp++] = w; onStack[w] = true; work[wp++] = w;
                    } else if (onStack[w]) {
                        low[v] = Math.min(low[v], disc[w]);
                    }
                } else {                                    // "return" from v
                    wp--;
                    if (wp > 0) { int p = work[wp - 1]; low[p] = Math.min(low[p], low[v]); }
                    if (low[v] == disc[v]) {
                        int x;
                        do { x = stack[--sp]; onStack[x] = false; comp[x] = comps; } while (x != v);
                        comps++;
                    }
                }
            }
        }
        if (comps == 1) return 0;

        boolean[] hasIn = new boolean[comps], hasOut = new boolean[comps];
        for (int[] e : edges) {
            int a = comp[e[0]], b = comp[e[1]];
            if (a != b) { hasOut[a] = true; hasIn[b] = true; }
        }
        int sources = 0, sinks = 0;
        for (int c = 0; c < comps; c++) {
            if (!hasIn[c]) sources++;
            if (!hasOut[c]) sinks++;
        }
        return Math.max(sources, sinks);
    }
}`,
      alt: [{ lang: 'python', code: `def min_edges_to_strongly_connect(V, edges):
    adj = [[] for _ in range(V)]
    for u, v in edges:
        adj[u].append(v)

    disc = [-1] * V
    low = [0] * V
    comp = [-1] * V
    nxt = [0] * V                        # next neighbour index to try, per node
    on_stack = [False] * V
    tarjan = []                          # Tarjan's stack of open nodes
    timer = comps = 0

    for root in range(V):
        if disc[root] != -1:
            continue
        disc[root] = low[root] = timer
        timer += 1
        tarjan.append(root)
        on_stack[root] = True
        work = [root]                    # our own call stack
        while work:
            v = work[-1]
            if nxt[v] < len(adj[v]):
                w = adj[v][nxt[v]]
                nxt[v] += 1
                if disc[w] == -1:
                    disc[w] = low[w] = timer
                    timer += 1
                    tarjan.append(w)
                    on_stack[w] = True
                    work.append(w)
                elif on_stack[w]:
                    low[v] = min(low[v], disc[w])
            else:
                work.pop()
                if work:
                    p = work[-1]
                    low[p] = min(low[p], low[v])
                if low[v] == disc[v]:    # v is the root of an SCC
                    while True:
                        x = tarjan.pop()
                        on_stack[x] = False
                        comp[x] = comps
                        if x == v:
                            break
                    comps += 1

    if comps == 1:
        return 0
    has_in = [False] * comps
    has_out = [False] * comps
    for u, v in edges:
        a, b = comp[u], comp[v]
        if a != b:
            has_out[a] = True
            has_in[b] = True
    return max(has_in.count(False), has_out.count(False))   # sources, sinks
` }, { lang: 'js', code: `function minEdgesToStronglyConnect(V, edges) {
  const adj = Array.from({ length: V }, () => []);
  for (const [u, v] of edges) adj[u].push(v);

  const disc = new Int32Array(V).fill(-1), low = new Int32Array(V), comp = new Int32Array(V);
  const nxt = new Int32Array(V), onStack = new Uint8Array(V);
  const tarjan = [];
  let timer = 0, comps = 0;

  for (let root = 0; root < V; root++) {
    if (disc[root] !== -1) continue;
    disc[root] = low[root] = timer++;
    tarjan.push(root);
    onStack[root] = 1;
    const work = [root];                     // our own call stack
    while (work.length) {
      const v = work[work.length - 1];
      if (nxt[v] < adj[v].length) {
        const w = adj[v][nxt[v]++];
        if (disc[w] === -1) {
          disc[w] = low[w] = timer++;
          tarjan.push(w);
          onStack[w] = 1;
          work.push(w);
        } else if (onStack[w]) {
          low[v] = Math.min(low[v], disc[w]);
        }
      } else {
        work.pop();
        if (work.length) {
          const p = work[work.length - 1];
          low[p] = Math.min(low[p], low[v]);
        }
        if (low[v] === disc[v]) {            // v is the root of an SCC
          let x;
          do { x = tarjan.pop(); onStack[x] = 0; comp[x] = comps; } while (x !== v);
          comps++;
        }
      }
    }
  }

  if (comps === 1) return 0;
  const hasIn = new Uint8Array(comps), hasOut = new Uint8Array(comps);
  for (const [u, v] of edges) {
    const a = comp[u], b = comp[v];
    if (a !== b) { hasOut[a] = 1; hasIn[b] = 1; }
  }
  let sources = 0, sinks = 0;
  for (let c = 0; c < comps; c++) {
    if (!hasIn[c]) sources++;
    if (!hasOut[c]) sinks++;
  }
  return Math.max(sources, sinks);
}
` }, { lang: 'cpp', code: `class Solution {
public:
    int minEdgesToStronglyConnect(int V, vector<vector<int>>& edges) {
        vector<vector<int>> adj(V);
        for (auto& e : edges) adj[e[0]].push_back(e[1]);

        vector<int> disc(V, -1), low(V, 0), comp(V, -1), nxt(V, 0), tarjan, work;
        vector<char> onStack(V, 0);
        int timer = 0, comps = 0;

        for (int root = 0; root < V; root++) {
            if (disc[root] != -1) continue;
            disc[root] = low[root] = timer++;
            tarjan.push_back(root);
            onStack[root] = 1;
            work.push_back(root);                 // our own call stack
            while (!work.empty()) {
                int v = work.back();
                if (nxt[v] < (int)adj[v].size()) {
                    int w = adj[v][nxt[v]++];
                    if (disc[w] == -1) {
                        disc[w] = low[w] = timer++;
                        tarjan.push_back(w);
                        onStack[w] = 1;
                        work.push_back(w);
                    } else if (onStack[w]) {
                        low[v] = min(low[v], disc[w]);
                    }
                } else {
                    work.pop_back();
                    if (!work.empty()) low[work.back()] = min(low[work.back()], low[v]);
                    if (low[v] == disc[v]) {      // v is the root of an SCC
                        int x;
                        do { x = tarjan.back(); tarjan.pop_back(); onStack[x] = 0; comp[x] = comps; } while (x != v);
                        comps++;
                    }
                }
            }
        }

        if (comps == 1) return 0;
        vector<char> hasIn(comps, 0), hasOut(comps, 0);
        for (auto& e : edges) {
            int a = comp[e[0]], b = comp[e[1]];
            if (a != b) { hasOut[a] = 1; hasIn[b] = 1; }
        }
        int sources = 0, sinks = 0;
        for (int c = 0; c < comps; c++) {
            if (!hasIn[c]) sources++;
            if (!hasOut[c]) sinks++;
        }
        return max(sources, sinks);
    }
};
` }],
        dry: {
          head: ['step', 'event', 'disc/low', 'stack', 'SCC'],
          rows: [
            ['1', 'enter 0, 1, 2', '0/0, 1/1, 2/2', '0 1 2', ''],
            ['2', '2→0 on stack', '2: 2/0', '0 1 2', ''],
            ['3', '2→3: enter 3, no edges, root', '3: 3/3', '0 1 2 3', H.c('g', '{3} = comp 0')],
            ['4', 'return to 1, then 0: low 0 == disc 0', '1: 1/0', '0 1 2', H.c('g', '{2,1,0} = comp 1')],
            ['5', 'enter 4: edge 4→3, 3 not on stack → ignore; root', '4: 4/4', '4', H.c('g', '{4} = comp 2')],
            ['6', 'hasIn: comp0 (from 1 and 2); hasOut: comp1, comp2', '—', '—', 'sources = 2, sinks = 1'],
            ['7', 'answer', '—', '—', '<b>max(2, 1) = 2</b>']
          ]
        },
        complexity: `<p>Time <b>O(V + E)</b>, space <b>O(V + E)</b>. No recursion, so no stack overflow on long chains.</p>`,
        followUps: ['Output the actual edges to add, not just how many.', 'Undirected version: minimum edges to make the graph 2-edge-connected (answer ⌈leaves/2⌉ in the bridge tree).', 'What if you may only add edges from a given list of candidate roads?']
      }
    }]
  });

  // =====================================================================
  // TOPIC 3 — Bridges & Articulation Points (low-link in undirected graphs)
  // =====================================================================
  topics.push({
    title: 'Bridges & Articulation Points with Low-Link Values',
    analogy: `<p>Picture islands joined by bridges. Some bridges are the <b>only</b> way to a group of islands — if a storm knocks one down, those islands are cut off. Those are <b>bridges</b> (critical edges). Some islands are <b>hubs</b>: if a hub island sinks, the archipelago splits into pieces. Those are <b>articulation points</b> (cut vertices).</p>
      <p>How do you spot them without knocking down every bridge one by one? Walk the islands once (DFS) and ask at each island: "<b>Can the islands behind me reach an older island without using the bridge I just crossed?</b>" If not, that bridge is critical.</p>`,
    explain: `<p>All of this is for <b>undirected</b> graphs.</p>
      <ul>
        <li><b>Bridge</b> = an edge whose removal increases the number of connected components.</li>
        <li><b>Articulation point (cut vertex)</b> = a vertex whose removal (with its edges) increases the number of components.</li>
      </ul>
      <p>We run one DFS and keep the same two numbers as Tarjan's SCC:</p>
      ${H.table(['value', 'meaning here'], [
        ['<code>disc[v]</code>', 'when DFS first reached v'],
        ['<code>low[v]</code>', 'the smallest disc reachable from v\'s DFS subtree using tree edges downward plus <b>one back edge</b> — but <b>never the edge we came in on</b>']
      ])}
      <p>In an undirected DFS there are only two kinds of edges: <b>tree edges</b> (to a new node) and <b>back edges</b> (to an ancestor). There are no cross edges, which makes the rules clean. For a tree edge <code>v — w</code> (w is the child):</p>
      ${H.table(['test', 'meaning in words', 'conclusion'], [
        ['<code>low[w] &gt; disc[v]</code>', 'w\'s whole subtree cannot reach v or anything older', H.c('r', 'edge v—w is a BRIDGE')],
        ['<code>low[w] ≥ disc[v]</code> and v is not the root', 'w\'s subtree can reach v but nothing older than v', H.c('p', 'v is an ARTICULATION POINT')],
        ['v is the root and has ≥ 2 DFS children', 'the children can only meet through the root', H.c('p', 'root is an ARTICULATION POINT')]
      ])}
      <p><b>Mini example:</b> triangle 0–1–2 plus a tail 1–3.</p>
      ${H.table(['node', 'disc', 'low', 'note'], [
        ['0', '0', '0', 'root, only 1 DFS child → not a cut vertex'],
        ['1', '1', '0', 'child 3 has low 3 ≥ disc 1 → ' + H.c('p', 'cut vertex')],
        ['2', '2', '0', 'back edge 2—0'],
        ['3', '3', '3', 'low[3] = 3 &gt; disc[1] = 1 → ' + H.c('r', 'edge 1—3 is a bridge')]
      ])}
      <p>Notice the difference: <b>&gt;</b> for bridges, <b>≥</b> for articulation points. If the child's subtree can climb back to <i>exactly</i> v (low[w] == disc[v]), the <b>edge</b> is safe (there is a cycle through it) but the <b>vertex</b> v is still a choke point.</p>`,
    clues: [
      '"<b>Critical connections</b>", "critical roads/links", "single point of failure", "which cable, if cut, disconnects…" → bridges.',
      '"<b>Which server / router / city, if removed</b>, splits the network?" → articulation points.',
      '"<b>Biconnected</b>" / "2-vertex-connected" / "2-edge-connected" components → low-link DFS.',
      '"Minimum days to disconnect an island" (LC 1568) → answer is 0, 1 or 2; check for an articulation point to decide 1.',
      '<b>Undirected</b> graph with <code>V, E ≤ 10<sup>5</sup></code> and "remove one edge/vertex" → do NOT remove-and-BFS each one (O(E·(V+E))); one low-link DFS is O(V + E).',
      '"Make the graph survive any single link failure with minimum new edges" → build the bridge tree, answer ⌈leaves / 2⌉.'
    ],
    code: { lang: 'java', code: `
      class BridgesAndCutVertices {
          final List<List<int[]>> adj = new ArrayList<>();   // adj[u] holds {neighbour, edgeId}
          final int[] disc, low;
          final boolean[] isCut;
          final List<int[]> bridges = new ArrayList<>();
          int timer = 0;

          BridgesAndCutVertices(int n, int[][] edges) {
              for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
              for (int id = 0; id < edges.length; id++) {
                  adj.get(edges[id][0]).add(new int[]{edges[id][1], id});
                  adj.get(edges[id][1]).add(new int[]{edges[id][0], id});
              }
              disc = new int[n];
              low = new int[n];
              isCut = new boolean[n];
              Arrays.fill(disc, -1);
              for (int v = 0; v < n; v++) if (disc[v] == -1) dfs(v, -1);
          }

          private void dfs(int v, int parentEdge) {
              disc[v] = low[v] = timer++;
              int children = 0;
              for (int[] e : adj.get(v)) {
                  int w = e[0], id = e[1];
                  if (id == parentEdge) continue;             // skip ONLY the edge we came in on
                  if (disc[w] == -1) {                        // tree edge
                      children++;
                      dfs(w, id);
                      low[v] = Math.min(low[v], low[w]);
                      if (low[w] > disc[v]) bridges.add(new int[]{v, w});          // subtree cannot reach v
                      if (parentEdge != -1 && low[w] >= disc[v]) isCut[v] = true;  // subtree cannot pass v
                  } else {                                    // back edge to an ancestor (or a done descendant)
                      low[v] = Math.min(low[v], disc[w]);
                  }
              }
              if (parentEdge == -1 && children >= 2) isCut[v] = true;              // special root rule
          }
      }`, alt: [{ lang: 'python', code: `class BridgesAndCutVertices:
    # Recursive form: clear, but deep graphs need an explicit stack in Python.
    def __init__(self, n, edges):
        self.adj = [[] for _ in range(n)]       # adj[u] holds (neighbour, edge id)
        for eid, (u, v) in enumerate(edges):
            self.adj[u].append((v, eid))
            self.adj[v].append((u, eid))
        self.disc = [-1] * n
        self.low = [0] * n
        self.is_cut = [False] * n
        self.bridges = []
        self.timer = 0
        for v in range(n):
            if self.disc[v] == -1:
                self._dfs(v, -1)

    def _dfs(self, v, parent_edge):
        self.disc[v] = self.low[v] = self.timer
        self.timer += 1
        children = 0
        for w, eid in self.adj[v]:
            if eid == parent_edge:              # skip ONLY the edge we came in on
                continue
            if self.disc[w] == -1:              # tree edge
                children += 1
                self._dfs(w, eid)
                self.low[v] = min(self.low[v], self.low[w])
                if self.low[w] > self.disc[v]:                      # subtree cannot reach v
                    self.bridges.append((v, w))
                if parent_edge != -1 and self.low[w] >= self.disc[v]:   # subtree cannot pass v
                    self.is_cut[v] = True
            else:                               # back edge to an ancestor (or a done descendant)
                self.low[v] = min(self.low[v], self.disc[w])
        if parent_edge == -1 and children >= 2:     # special root rule
            self.is_cut[v] = True
` }, { lang: 'js', code: `class BridgesAndCutVertices {
  // Recursive form: clear, but very deep graphs need an explicit stack in JavaScript.
  constructor(n, edges) {
    this.adj = Array.from({ length: n }, () => []);    // adj[u] holds [neighbour, edge id]
    edges.forEach(([u, v], id) => {
      this.adj[u].push([v, id]);
      this.adj[v].push([u, id]);
    });
    this.disc = new Array(n).fill(-1);
    this.low = new Array(n).fill(0);
    this.isCut = new Array(n).fill(false);
    this.bridges = [];
    this.timer = 0;
    for (let v = 0; v < n; v++) if (this.disc[v] === -1) this.dfs(v, -1);
  }

  dfs(v, parentEdge) {
    this.disc[v] = this.low[v] = this.timer++;
    let children = 0;
    for (const [w, id] of this.adj[v]) {
      if (id === parentEdge) continue;                  // skip ONLY the edge we came in on
      if (this.disc[w] === -1) {                        // tree edge
        children++;
        this.dfs(w, id);
        this.low[v] = Math.min(this.low[v], this.low[w]);
        if (this.low[w] > this.disc[v]) this.bridges.push([v, w]);                    // subtree cannot reach v
        if (parentEdge !== -1 && this.low[w] >= this.disc[v]) this.isCut[v] = true;   // subtree cannot pass v
      } else {                                          // back edge to an ancestor (or a done descendant)
        this.low[v] = Math.min(this.low[v], this.disc[w]);
      }
    }
    if (parentEdge === -1 && children >= 2) this.isCut[v] = true;                     // special root rule
  }
}
` }, { lang: 'cpp', code: `class BridgesAndCutVertices {
public:
    vector<vector<pair<int, int>>> adj;         // adj[u] holds {neighbour, edgeId}
    vector<int> disc, low;
    vector<char> isCut;
    vector<pair<int, int>> bridges;
    int timer = 0;

    BridgesAndCutVertices(int n, const vector<vector<int>>& edges)
        : adj(n), disc(n, -1), low(n, 0), isCut(n, 0) {
        for (int id = 0; id < (int)edges.size(); id++) {
            adj[edges[id][0]].push_back({edges[id][1], id});
            adj[edges[id][1]].push_back({edges[id][0], id});
        }
        for (int v = 0; v < n; v++) if (disc[v] == -1) dfs(v, -1);
    }

private:
    void dfs(int v, int parentEdge) {
        disc[v] = low[v] = timer++;
        int children = 0;
        for (auto [w, id] : adj[v]) {
            if (id == parentEdge) continue;              // skip ONLY the edge we came in on
            if (disc[w] == -1) {                         // tree edge
                children++;
                dfs(w, id);
                low[v] = min(low[v], low[w]);
                if (low[w] > disc[v]) bridges.push_back({v, w});                 // subtree cannot reach v
                if (parentEdge != -1 && low[w] >= disc[v]) isCut[v] = 1;         // subtree cannot pass v
            } else {                                     // back edge to an ancestor (or a done descendant)
                low[v] = min(low[v], disc[w]);
            }
        }
        if (parentEdge == -1 && children >= 2) isCut[v] = 1;                     // special root rule
    }
};
` }] },
    codeTitle: 'Bridges + articulation points in one DFS',
    viz: {
      title: 'Low-link DFS: disc/low tags, bridges turn red, cut vertices turn purple',
      input: '0-1 1-2 2-0 1-3 3-4 4-5 5-3 4-6',
      inputLabel: 'Undirected edges "u-v" separated by spaces (up to 10 nodes, 16 edges)',
      gen: function (input) {
        var P = parseEdges(input, { example: '0-1 1-2 2-0 1-3', maxN: 10, maxE: 16, noLoops: true });
        var ids = P.ids, n = ids.length, ix = {};
        ids.forEach(function (id, i) { ix[id] = i; });
        var adj = ids.map(function () { return []; });
        P.edges.forEach(function (e, id) { adj[ix[e[0]]].push({ w: ix[e[1]], id: id }); adj[ix[e[1]]].push({ w: ix[e[0]], id: id }); });
        var nodes = circle(ids, 70), frames = [], disc = [], low = [], timer = 0, hl = {}, tags = {}, ehl = {}, bridges = [], cuts = [];
        function tag(i) { tags[ids[i]] = disc[i] + '/' + low[i]; }
        function F(narr, v) {
          frames.push({ narr: narr, parts: [
            { type: 'graph', label: 'tags = disc/low · blue = DFS tree edge · purple edge = back edge', directed: false, height: 70, nodes: nodes, edges: P.edges.map(function (e) { return [e[0], e[1]]; }), hl: copy(hl), ehl: copy(ehl), tags: copy(tags) },
            { type: 'vars', label: 'current node', vals: { v: v >= 0 ? ids[v] : '-', 'disc[v]': v >= 0 ? disc[v] : '-', 'low[v]': v >= 0 ? low[v] : '-', timer: timer } },
            { type: 'set', label: 'bridges so far', items: bridges.slice() },
            { type: 'set', label: 'articulation points so far', items: cuts.slice() }
          ] });
        }
        F('Start. We will DFS once. Each node gets <b>disc</b> (arrival time) and <b>low</b> (oldest node its subtree can reach without reusing the edge it came in on).', -1);
        function dfs(v, pe) {
          disc[v] = low[v] = timer++;
          hl[ids[v]] = 'cur'; tag(v);
          F('Enter <b>' + ids[v] + '</b>: disc = low = ' + disc[v] + (pe === -1 ? ' (this is a DFS <b>root</b>).' : '.'), v);
          var children = 0;
          adj[v].forEach(function (a) {
            var w = a.w, key = ids[v] + '-' + ids[w], old;
            if (a.id === pe) return;
            if (disc[w] === undefined) {
              children++;
              ehl[key] = 'win'; hl[ids[v]] = 'win';
              dfs(w, a.id);
              hl[ids[v]] = 'cur';
              old = low[v]; low[v] = Math.min(low[v], low[w]); tag(v);
              var isB = low[w] > disc[v], isC = pe !== -1 && low[w] >= disc[v];
              var msg = 'Back at <b>' + ids[v] + '</b> from child ' + ids[w] + ': low[' + ids[w] + '] = ' + low[w] + ', disc[' + ids[v] + '] = ' + disc[v] + '. ';
              if (isB) { bridges.push(ids[v] + '-' + ids[w]); ehl[key] = 'bad'; msg += '<span class="c-r">low[' + ids[w] + '] &gt; disc[' + ids[v] + '] → edge ' + ids[v] + '—' + ids[w] + ' is a BRIDGE</span> (the subtree has no other way back). '; }
              else msg += 'low[' + ids[w] + '] ≤ disc[' + ids[v] + '] → the subtree has another way up, edge is safe. ';
              if (isC && cuts.indexOf(ids[v]) < 0) { cuts.push(ids[v]); msg += '<span class="c-p">low[' + ids[w] + '] ≥ disc[' + ids[v] + '] → ' + ids[v] + ' is an ARTICULATION POINT.</span>'; }
              if (pe === -1) msg += '(Root: decided later by counting DFS children.)';
              F(msg + ' Update low[' + ids[v] + '] = ' + low[v] + '.', v);
            } else if (disc[w] < disc[v]) {
              ehl[key] = 'sel';
              old = low[v]; low[v] = Math.min(low[v], disc[w]); tag(v);
              F('Back edge <b>' + ids[v] + '—' + ids[w] + '</b> to an older node: low[' + ids[v] + '] = min(' + old + ', disc[' + ids[w] + ']=' + disc[w] + ') = <b>' + low[v] + '</b>. This edge closes a cycle.', v);
            }
          });
          if (pe === -1) {
            if (children >= 2 && cuts.indexOf(ids[v]) < 0) cuts.push(ids[v]);
            F('Root <b>' + ids[v] + '</b> has <b>' + children + '</b> DFS child' + (children === 1 ? '' : 'ren') + ' → ' + (children >= 2 ? '<span class="c-p">it IS an articulation point</span> (its subtrees meet only through it).' : 'it is <b>not</b> an articulation point.'), v);
          }
          hl[ids[v]] = cuts.indexOf(ids[v]) >= 0 ? 'sel' : 'done';
        }
        for (var v = 0; v < n; v++) if (disc[v] === undefined) dfs(v, -1);
        F('Finished. Bridges: <b>' + (bridges.join(', ') || 'none') + '</b>. Articulation points: <b>' + (cuts.join(', ') || 'none') + '</b>. One DFS, O(V + E).', -1);
        return frames;
      }
    },
    examples: [
      { title: 'A simple cycle has no bridges and no cut vertices', html: `<p>Square 0–1–2–3–0. DFS goes 0 → 1 → 2 → 3, and the back edge 3—0 gives low = 0 to everyone. Every <code>low[child] = 0 ≤ disc[parent]</code>, so no bridge; for non-root vertices <code>low[child] = 0 &lt; disc[v]</code>, so no cut vertex; root 0 has one child. ${H.c('g', 'Robust ring.')}</p>` },
      { title: 'A tree: every edge is a bridge', html: `<p>Star with centre 0 and leaves 1, 2, 3. Each leaf has low = disc (no back edges), so every edge 0—leaf is a bridge. Root 0 has 3 DFS children → articulation point. In any tree, <b>all</b> edges are bridges and all non-leaf nodes are cut vertices.</p>` },
      { title: 'Parallel edges: why we skip the edge id, not the parent vertex', html: `<p>Two cables between A and B: edges #0 = A—B and #1 = A—B. Removing one cable keeps A and B connected, so <b>neither is a bridge</b>. If the code skipped "the parent vertex", B would never look at cable #1 and would wrongly report a bridge. Skipping only <b>edge #0</b> (the one we came in on) lets B use cable #1 as a back edge: low[B] = disc[A] → not a bridge. ${H.c('g', 'Correct.')}</p>` },
      { title: 'Vertex is a cut point but its edges are not bridges', html: `<p>Bow-tie: triangles 0–1–2 and 2–3–4 sharing vertex 2. No edge is a bridge (each lies on a triangle), but removing vertex 2 splits {0,1} from {3,4}. In DFS from 0: 0 → 1 → 2 → 3 → 4; back edge 4—2 gives low[3] = 2 = disc[2] → 2 is a cut vertex (≥ holds), but 2—3 is not a bridge (&gt; fails).</p>` }
    ],
    deepDive: `<p><b>Why the root needs a special rule:</b> for the root, <code>low[w] ≥ disc[root] = 0</code> is always true, so the normal test would mark every root as a cut vertex. The truth: the root separates the graph only if DFS needed to start <b>two or more</b> separate subtrees from it — because in an undirected DFS a later subtree would have been discovered from an earlier one if any path avoided the root.</p>
      <p><b>Why disc[w], not low[w], on back edges (for cut vertices):</b> low[w] of an ancestor may "climb through" v itself. Using low[w] can make a child's low smaller than disc[v] even though the only route goes through v, hiding a real articulation point. Bridges happen to stay correct with either, but <code>disc[w]</code> is the safe universal choice.</p>
      <p><b>Building bigger structures:</b></p>
      <ul>
        <li><b>2-edge-connected components</b>: delete all bridges; the remaining connected pieces are the components. Contract them → the <b>bridge tree</b> (always a tree/forest). Adding ⌈leaves/2⌉ edges makes the graph bridgeless.</li>
        <li><b>Biconnected components (blocks)</b>: push <b>edges</b> on a stack during DFS; when <code>low[w] ≥ disc[v]</code>, pop edges down to (v, w) — that is one block. Blocks + cut vertices form the <b>block-cut tree</b>, used for "is there a path from a to b avoiding vertex x?" queries.</li>
      </ul>
      <p><b>Production reality:</b> network engineers call bridges "single points of failure"; tools that audit data-centre topologies, power grids, and road networks run exactly this DFS. Recursion depth is again the trap — LeetCode 1192 has n = 10<sup>5</sup>, and a long path makes the recursion 10<sup>5</sup> deep. A Java or C++ stack often survives ~10<sup>4</sup>–10<sup>5</sup> small frames, but not reliably; JavaScript overflows near 10<sup>4</sup>, and Python does not survive without <code>sys.setrecursionlimit</code> and a bigger thread stack. Write the iterative version for production.</p>`,
    aiEra: `<p><b>What AI changes:</b> "find critical connections" is one of the most-memorised LeetCode Hards, and assistants reproduce it perfectly. Interviewers know that, so they twist it: parallel edges, "return articulation points instead", "do it iteratively", "now the graph changes over time".</p>
      <p><b>Use AI as a partner:</b> have it generate random small graphs and a brute-force oracle (remove each edge/vertex, count components) so you can fuzz your low-link code. Ask it to explain the root rule in its own words — then check it against the proof above.</p>
      <p><b>Where AI goes wrong:</b> skipping the parent <b>vertex</b> instead of the parent <b>edge</b> (breaks on parallel edges), using <code>&gt;=</code> for bridges or <code>&gt;</code> for cut vertices, forgetting the root rule, adding a vertex to the answer list twice (once per child), and recursion overflow on path-shaped inputs.</p>
      <p><b>What you must still own:</b> the &gt; vs ≥ distinction and why, how to turn bridges into a bridge tree, and translating vague business questions ("which link is a single point of failure?") into this algorithm.</p>`,
    problems: [{
      title: 'Critical Connections in a Network',
      level: 'Hard', tags: ['bridges', 'tarjan', 'dfs'], companies: ['Amazon', 'Google', 'Meta'],
      statement: `<p>There are <code>n</code> servers numbered <code>0 … n−1</code> connected by undirected <code>connections</code>, forming a connected network. A <b>critical connection</b> is a connection that, if removed, makes some server unable to reach some other server. Return all critical connections in any order.</p>`,
      constraints: `<p>2 ≤ n ≤ 10<sup>5</sup>, n − 1 ≤ connections.length ≤ 10<sup>5</sup>, no repeated connections.</p>`,
      example: `<p>n = 4, connections = <code>[[0,1],[1,2],[2,0],[1,3]]</code> → output <b>${H.c('g', '[[1,3]]')}</b>.</p><p>Why: 0, 1, 2 form a triangle, so any one of those edges can break and the others still connect them. Server 3 hangs on edge 1—3 only.</p>`,
      brute: {
        why: `<p>Remove each connection, BFS from one endpoint, and check whether the other endpoint is still reachable. That is E BFS runs → <b>O(E·(V + E))</b> = 10<sup>5</sup> × 2·10<sup>5</sup> = 2·10<sup>10</sup>. Wasted work: every BFS re-explores the same graph that one DFS could summarise with low-link values.</p>`,
        code: `class Brute {
    public List<List<Integer>> criticalConnections(int n, List<List<Integer>> connections) {
        List<List<Integer>> ans = new ArrayList<>();
        for (int skip = 0; skip < connections.size(); skip++) {
            List<List<Integer>> adj = new ArrayList<>();
            for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
            for (int id = 0; id < connections.size(); id++) {
                if (id == skip) continue;                     // pretend this cable is cut
                int a = connections.get(id).get(0), b = connections.get(id).get(1);
                adj.get(a).add(b);
                adj.get(b).add(a);
            }
            int s = connections.get(skip).get(0), t = connections.get(skip).get(1);
            boolean[] seen = new boolean[n];
            Deque<Integer> q = new ArrayDeque<>();
            q.add(s);
            seen[s] = true;
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int w : adj.get(u)) if (!seen[w]) { seen[w] = true; q.add(w); }
            }
            if (!seen[t]) ans.add(connections.get(skip));     // endpoints separated -> critical
        }
        return ans;
    }
}`
      },
      mcq: { q: 'For tree edge v—w, which condition means it is a bridge?', options: ['low[w] &gt; disc[v]', 'low[w] ≥ disc[v]', 'low[v] &gt; disc[w]', 'disc[w] &gt; low[v]'], answer: 0, explain: 'w\'s subtree cannot reach v or anything discovered before v without this edge. With ≥ you would also flag edges on cycles that return exactly to v.' },
      hints: [
        `<p>Hint 1: An edge is critical exactly when it is <b>not on any cycle</b>. A DFS back edge closes a cycle — so ask whether the subtree below an edge has a back edge that climbs above it.</p>`,
        `<p>Hint 2: Keep <code>disc[v]</code> and <code>low[v]</code>. After returning from child w, tree edge v—w is a bridge iff <code>low[w] &gt; disc[v]</code>.</p>`,
        `<p>Hint 3: Recipe — store (neighbour, edgeId) pairs; skip only the edge id you arrived by; low[v] = min over children's low and over back edges' disc. Edge case: the graph is connected, but still loop over all nodes to be safe.</p>`
      ],
      tests: { sig: "string int list<list<int>> -> list<list<int>>", fn: "bridges", check: `(args, out, exp) => {
  const norm = (l) => l.map((p) => (p[0] < p[1] ? p : [p[1], p[0]])).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let want = exp;
  if (typeof exp === 'string') {
    const n = args[1], h = Math.floor(n / 2);
    want = [];
    if (exp === 'path') for (let i = 0; i + 1 < n; i++) want.push([i, i + 1]);
    else if (exp === 'star') for (let i = 1; i < n; i++) want.push([0, i]);
    else for (let i = h - 1; i + 1 < n; i++) want.push([i, i + 1]);
  }
  const a = norm(out), b = norm(want);
  return a.length === b.length && a.every((p, i) => p[0] === b[i][0] && p[1] === b[i][1]);
}`, cases: [
          [["",4,[[0,1],[1,2],[2,0],[1,3]]],[[1,3]]],
          [["",2,[[0,1]]],[[0,1]]],
          [["",3,[[0,1],[1,2],[2,0]]],[]],
          [["",5,[[0,1],[1,2],[2,3],[3,4]]],[[0,1],[1,2],[2,3],[3,4]]],
          [["",6,[[0,1],[1,2],[2,0],[2,3],[3,4],[4,5],[5,3]]],[[2,3]]],
          [["",4,[[0,1],[0,2],[0,3]]],[[0,1],[0,2],[0,3]]],
          [["",7,[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[5,6]]],[[5,6]]],
          [["",7,[[1,0],[0,2],[2,4],[5,6],[3,1],[5,2],[4,0],[0,6]]],[[1,0],[3,1]]],
          [["",2,[[0,1]]],[[0,1]]],
          [["",6,[[2,0],[1,5],[3,4],[5,4],[1,0],[5,2],[1,3]]],[]],
          [["",8,[[1,0],[5,7],[2,0],[2,4],[3,6],[4,5],[6,7],[2,3]]],[[1,0],[2,0]]],
          [["",6,[[1,0],[0,2],[1,3],[2,4],[5,0]]],[[1,0],[0,2],[1,3],[2,4],[5,0]]],
          [["",4,[[3,1],[1,0],[2,0],[2,1]]],[[3,1]]],
          [["",2,[[1,0]]],[[1,0]]],
          [["",5,[[1,3],[3,4],[2,1],[1,0]]],[[1,3],[3,4],[2,1],[1,0]]],
          [["",4,[[1,2],[1,0],[0,3]]],[[1,2],[1,0],[0,3]]],
          [["",6,[[1,2],[2,3],[1,4],[0,1],[4,5]]],[[1,2],[2,3],[1,4],[0,1],[4,5]]],
          [["path",100000,[]],"path"],
          [["star",100000,[]],"star"],
          [["cycle",100000,[]],[]],
          [["cycleTail",100000,[]],"cycleTail"]
        ], harness: { java: `class Check {
  static List<List<Integer>> bridges(String kind, int n, List<List<Integer>> conns) {
    if (!kind.isEmpty()) {
      conns = new ArrayList<>();
      int h = n / 2;
      if (kind.equals("path")) { for (int i = 0; i + 1 < n; i++) conns.add(Arrays.asList(i, i + 1)); }
      else if (kind.equals("star")) { for (int i = 1; i < n; i++) conns.add(Arrays.asList(0, i)); }
      else {
        int c = kind.equals("cycle") ? n : h;
        for (int i = 0; i < c; i++) conns.add(Arrays.asList(i, (i + 1) % c));
        if (kind.equals("cycleTail")) for (int i = h - 1; i + 1 < n; i++) conns.add(Arrays.asList(i, i + 1));
      }
    }
    return new Solution().criticalConnections(n, conns);
  }
}`, python: `def bridges(kind, n, conns):
    if kind != '':
        h = n // 2
        if kind == 'path':
            conns = [[i, i + 1] for i in range(n - 1)]
        elif kind == 'star':
            conns = [[0, i] for i in range(1, n)]
        else:
            c = n if kind == 'cycle' else h
            conns = [[i, (i + 1) % c] for i in range(c)]
            if kind == 'cycleTail':
                conns += [[i, i + 1] for i in range(h - 1, n - 1)]
    return critical_connections(n, conns)`, js: `function bridges(kind, n, conns) {
  if (kind !== '') {
    const h = Math.floor(n / 2);
    conns = [];
    if (kind === 'path') { for (let i = 0; i + 1 < n; i++) conns.push([i, i + 1]); }
    else if (kind === 'star') { for (let i = 1; i < n; i++) conns.push([0, i]); }
    else {
      const c = kind === 'cycle' ? n : h;
      for (let i = 0; i < c; i++) conns.push([i, (i + 1) % c]);
      if (kind === 'cycleTail') for (let i = h - 1; i + 1 < n; i++) conns.push([i, i + 1]);
    }
  }
  return criticalConnections(n, conns);
}`, cpp: `vector<vector<int>> bridges(string kind, int n, vector<vector<int>> conns) {
  if (!kind.empty()) {
    conns.clear();
    int h = n / 2;
    if (kind == "path") { for (int i = 0; i + 1 < n; i++) conns.push_back({i, i + 1}); }
    else if (kind == "star") { for (int i = 1; i < n; i++) conns.push_back({0, i}); }
    else {
      int c = kind == "cycle" ? n : h;
      for (int i = 0; i < c; i++) conns.push_back({i, (i + 1) % c});
      if (kind == "cycleTail") for (int i = h - 1; i + 1 < n; i++) conns.push_back({i, i + 1});
    }
  }
  return Solution().criticalConnections(n, conns);
}` } },
      solution: {
        approach: `<p>One DFS with disc/low (Tarjan's bridge-finding algorithm). Each edge is examined twice (once from each side), so the whole thing is linear.</p>`,
        code: `class Solution {
    public List<List<Integer>> criticalConnections(int n, List<List<Integer>> connections) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int id = 0; id < connections.size(); id++) {
            int a = connections.get(id).get(0), b = connections.get(id).get(1);
            adj.get(a).add(new int[]{b, id});
            adj.get(b).add(new int[]{a, id});
        }
        int[] disc = new int[n], low = new int[n], next = new int[n], parentEdge = new int[n];
        Arrays.fill(disc, -1);
        int[] stack = new int[n];                              // our own DFS stack: no deep recursion
        int timer = 0;
        List<List<Integer>> result = new ArrayList<>();
        for (int root = 0; root < n; root++) {
            if (disc[root] != -1) continue;
            int sp = 0;
            stack[sp++] = root;
            parentEdge[root] = -1;
            disc[root] = low[root] = timer++;
            while (sp > 0) {
                int v = stack[sp - 1];
                if (next[v] < adj.get(v).size()) {
                    int[] e = adj.get(v).get(next[v]++);
                    int w = e[0], id = e[1];
                    if (id == parentEdge[v]) continue;         // do not reuse the edge we came in on
                    if (disc[w] == -1) {                       // "recursive call" into w
                        parentEdge[w] = id;
                        disc[w] = low[w] = timer++;
                        stack[sp++] = w;
                    } else {
                        low[v] = Math.min(low[v], disc[w]);    // back edge closes a cycle
                    }
                } else {                                       // "return" from v
                    sp--;
                    if (sp > 0) {
                        int p = stack[sp - 1];
                        low[p] = Math.min(low[p], low[v]);
                        if (low[v] > disc[p]) result.add(Arrays.asList(p, v));   // no way back above p
                    }
                }
            }
        }
        return result;
    }
}`,
      alt: [{ lang: 'python', code: `def critical_connections(n, connections):
    adj = [[] for _ in range(n)]
    for eid, (a, b) in enumerate(connections):
        adj[a].append((b, eid))
        adj[b].append((a, eid))

    disc = [-1] * n
    low = [0] * n
    nxt = [0] * n                        # next neighbour index to try, per node
    parent_edge = [-1] * n
    timer = 0
    result = []
    for root in range(n):
        if disc[root] != -1:
            continue
        disc[root] = low[root] = timer
        timer += 1
        stack = [root]                   # our own DFS stack: no recursion limit
        while stack:
            v = stack[-1]
            if nxt[v] < len(adj[v]):
                w, eid = adj[v][nxt[v]]
                nxt[v] += 1
                if eid == parent_edge[v]:        # do not reuse the edge we came in on
                    continue
                if disc[w] == -1:
                    parent_edge[w] = eid
                    disc[w] = low[w] = timer
                    timer += 1
                    stack.append(w)
                else:
                    low[v] = min(low[v], disc[w])   # back edge closes a cycle
            else:
                stack.pop()
                if stack:
                    p = stack[-1]
                    low[p] = min(low[p], low[v])
                    if low[v] > disc[p]:            # no way back above p
                        result.append([p, v])
    return result
` }, { lang: 'js', code: `function criticalConnections(n, connections) {
  const adj = Array.from({ length: n }, () => []);
  connections.forEach(([a, b], id) => { adj[a].push([b, id]); adj[b].push([a, id]); });

  const disc = new Int32Array(n).fill(-1), low = new Int32Array(n), next = new Int32Array(n);
  const parentEdge = new Int32Array(n).fill(-1);
  let timer = 0;
  const result = [];
  for (let root = 0; root < n; root++) {
    if (disc[root] !== -1) continue;
    disc[root] = low[root] = timer++;
    const stack = [root];                      // our own DFS stack: no stack overflow
    while (stack.length) {
      const v = stack[stack.length - 1];
      if (next[v] < adj[v].length) {
        const [w, id] = adj[v][next[v]++];
        if (id === parentEdge[v]) continue;    // do not reuse the edge we came in on
        if (disc[w] === -1) {
          parentEdge[w] = id;
          disc[w] = low[w] = timer++;
          stack.push(w);
        } else {
          low[v] = Math.min(low[v], disc[w]);  // back edge closes a cycle
        }
      } else {
        stack.pop();
        if (stack.length) {
          const p = stack[stack.length - 1];
          low[p] = Math.min(low[p], low[v]);
          if (low[v] > disc[p]) result.push([p, v]);   // no way back above p
        }
      }
    }
  }
  return result;
}
` }, { lang: 'cpp', code: `class Solution {
public:
    vector<vector<int>> criticalConnections(int n, vector<vector<int>>& connections) {
        vector<vector<pair<int, int>>> adj(n);             // (neighbour, edge id)
        for (int id = 0; id < (int)connections.size(); id++) {
            int a = connections[id][0], b = connections[id][1];
            adj[a].push_back({b, id});
            adj[b].push_back({a, id});
        }
        vector<int> disc(n, -1), low(n, 0), next(n, 0), parentEdge(n, -1);
        int timer = 0;
        vector<vector<int>> result;
        for (int root = 0; root < n; root++) {
            if (disc[root] != -1) continue;
            disc[root] = low[root] = timer++;
            vector<int> stack{root};                       // our own DFS stack
            while (!stack.empty()) {
                int v = stack.back();
                if (next[v] < (int)adj[v].size()) {
                    auto [w, id] = adj[v][next[v]++];
                    if (id == parentEdge[v]) continue;     // do not reuse the edge we came in on
                    if (disc[w] == -1) {
                        parentEdge[w] = id;
                        disc[w] = low[w] = timer++;
                        stack.push_back(w);
                    } else {
                        low[v] = min(low[v], disc[w]);     // back edge closes a cycle
                    }
                } else {
                    stack.pop_back();
                    if (!stack.empty()) {
                        int p = stack.back();
                        low[p] = min(low[p], low[v]);
                        if (low[v] > disc[p]) result.push_back({p, v});   // no way back above p
                    }
                }
            }
        }
        return result;
    }
};
` }],
        dry: {
          head: ['step', 'event', 'disc/low after', 'bridge?'],
          rows: [
            ['1', 'enter 0', '0: 0/0', ''],
            ['2', 'enter 1 (edge 0—1)', '1: 1/1', ''],
            ['3', 'enter 2 (edge 1—2); 2—0 is a back edge', '2: 2/0', ''],
            ['4', 'back at 1 from 2: low[1] = min(1, 0)', '1: 1/0', 'low[2]=0 &gt; 1? no'],
            ['5', 'enter 3 (edge 1—3), no other edges', '3: 3/3', ''],
            ['6', 'back at 1 from 3', '1: 1/0', H.c('r', 'low[3]=3 &gt; disc[1]=1 → [1,3]')],
            ['7', 'back at 0 from 1; edge 0—2 to a finished descendant', '0: 0/0', 'low[1]=0 &gt; 0? no']
          ]
        },
        complexity: `<p>Time <b>O(V + E)</b>, space <b>O(V + E)</b> (adjacency + recursion depth up to V).</p>`,
        followUps: ['Return the articulation points instead (LC-style "critical servers").', 'Rewrite the DFS iteratively so n = 10<sup>6</sup> works.', 'After finding bridges, how many edges must be added so no single failure disconnects the network?']
      }
    }]
  });

  // =====================================================================
  // TOPIC 4 — Euler path / circuit with Hierholzer
  // =====================================================================
  topics.push({
    title: 'Euler Paths & Circuits with Hierholzer\'s Algorithm',
    analogy: `<p>Remember the kids' puzzle "<b>draw this house without lifting your pen and without tracing any line twice</b>"? That is an Euler path. A postman who wants to walk <b>every street exactly once</b> and end up back at the post office wants an Euler <b>circuit</b>.</p>
      <p>Hierholzer's idea is how a relaxed postman would do it: <b>just walk</b> until you get stuck. If some streets are still unwalked, go back to a corner on your route that still has an unwalked street, walk a little <b>detour loop</b> from there, and <b>splice</b> that loop into your route. Repeat until every street is used.</p>`,
    explain: `<p>An <b>Euler path</b> uses <b>every edge exactly once</b> (vertices may repeat). An <b>Euler circuit</b> is an Euler path that starts and ends at the same vertex. (Do not confuse with a <b>Hamiltonian</b> path, which visits every <b>vertex</b> once — that one is NP-hard. Euler is easy: linear time!)</p>
      <p><b>When does one exist?</b> Only the edges matter: all vertices that have edges must be in one connected piece, plus a degree rule.</p>
      ${H.table(['graph', 'Euler circuit exists iff', 'Euler path (not circuit) exists iff', 'where to start'], [
        ['undirected', 'every vertex has <b>even</b> degree', 'exactly <b>2</b> vertices have odd degree', 'an odd vertex (else anywhere with an edge)'],
        ['directed', 'in-degree = out-degree for every vertex', 'one vertex has out − in = +1, one has in − out = +1, rest balanced', 'the vertex with out − in = +1']
      ])}
      <p><b>Why the degree rule?</b> Every time the walk passes <i>through</i> a vertex it uses one edge in and one edge out — a pair. So middle vertices need even degree (or in = out). Only the start and the end may have one unpaired edge.</p>
      <p><b>Hierholzer with a stack (the version everyone codes):</b></p>
      <ol>
        <li>Push the start vertex.</li>
        <li>Look at the top vertex <code>v</code>. If it still has an unused edge <code>v → w</code>, mark it used and push <code>w</code> ("keep walking").</li>
        <li>If <code>v</code> has no unused edges, pop it and put it at the <b>front</b> of the answer ("stuck here — this vertex is final at this position").</li>
        <li>Repeat until the stack is empty. If the answer has <code>E + 1</code> vertices, it is a valid Euler path; otherwise the graph was disconnected.</li>
      </ol>
      <p><b>Tiny run</b> — edges <code>A→B, B→C, C→A, C→D, D→E, E→C</code>:</p>
      ${H.table(['stack (bottom → top)', 'action', 'answer (built from the back)'], [
        ['A', 'walk A→B', ''],
        ['A B C', 'walk B→C, then C→A', ''],
        ['A B C A', H.c('r', 'A stuck') + ' → pop', 'A'],
        ['A B C', 'C still has C→D: detour C→D→E→C', 'A'],
        ['A B C D E C', 'C stuck, E stuck, D stuck, … pop all', 'A B C D E C A']
      ])}
      <p>The early "stuck at A" is not a failure — it just means A is the <b>last</b> vertex. The detour C→D→E→C gets spliced in automatically. Each edge is used once → <b>O(V + E)</b>.</p>`,
    clues: [
      '"Use <b>every ticket / edge / domino / pair exactly once</b>" → Euler path, not DFS over vertices.',
      '"Draw the figure <b>without lifting the pen</b>" / "walk every street once" → Euler path/circuit + degree test.',
      '"Arrange pairs so the <b>end of one equals the start of the next</b>" (LC 2097) → directed Euler path on values.',
      '"Shortest string that contains <b>every combination</b> of length n" (LC 753 Cracking the Safe) → de Bruijn sequence = Euler circuit on (n−1)-length states.',
      '"<b>Lexicographically smallest</b> itinerary" (LC 332) → Hierholzer that always takes the smallest unused edge (min-heap / sorted lists).',
      '"Minimum total length to walk every road at least once" → Chinese Postman: Euler + pairing up odd-degree vertices.'
    ],
    code: [{ lang: 'java', code: `
      class Hierholzer {
          // Directed graph with n nodes. Returns an Euler path/circuit as a vertex list, or an empty list.
          static List<Integer> eulerPath(int n, int[][] edges) {
              List<List<Integer>> adj = new ArrayList<>();
              for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
              int[] out = new int[n], in = new int[n];
              for (int[] e : edges) { adj.get(e[0]).add(e[1]); out[e[0]]++; in[e[1]]++; }

              // 1) Degree check + choose the start vertex
              int start = -1, plus = 0, minus = 0;
              for (int v = 0; v < n; v++) {
                  int d = out[v] - in[v];
                  if (d == 1) { plus++; start = v; }
                  else if (d == -1) minus++;
                  else if (d != 0) return List.of();          // |out - in| >= 2: impossible
              }
              if (!((plus == 0 && minus == 0) || (plus == 1 && minus == 1))) return List.of();
              if (start == -1) {                               // circuit: any vertex with an edge
                  for (int v = 0; v < n; v++) if (out[v] > 0) { start = v; break; }
                  if (start == -1) return List.of();           // no edges at all
              }

              // 2) Hierholzer with an explicit stack; ptr[v] = index of v's next unused edge
              int[] ptr = new int[n];
              Deque<Integer> stack = new ArrayDeque<>();
              LinkedList<Integer> path = new LinkedList<>();
              stack.push(start);
              while (!stack.isEmpty()) {
                  int v = stack.peek();
                  if (ptr[v] < adj.get(v).size()) {
                      stack.push(adj.get(v).get(ptr[v]++));    // walk along an unused edge
                  } else {
                      path.addFirst(stack.pop());              // stuck: v is final at this position
                  }
              }

              // 3) Connectivity check: a real Euler path uses ALL edges
              return path.size() == edges.length + 1 ? path : List.of();
          }
      }`, alt: [{ lang: 'python', code: `def euler_path(n, edges):
    # Directed graph with n nodes. Returns an Euler path/circuit as a vertex list, or [].
    adj = [[] for _ in range(n)]
    out = [0] * n
    inn = [0] * n
    for u, v in edges:
        adj[u].append(v)
        out[u] += 1
        inn[v] += 1

    # 1) Degree check + choose the start vertex
    start, plus, minus = -1, 0, 0
    for v in range(n):
        d = out[v] - inn[v]
        if d == 1:
            plus += 1
            start = v
        elif d == -1:
            minus += 1
        elif d != 0:
            return []                           # |out - in| >= 2: impossible
    if not ((plus == 0 and minus == 0) or (plus == 1 and minus == 1)):
        return []
    if start == -1:                             # circuit: any vertex with an edge
        start = next((v for v in range(n) if out[v] > 0), -1)
        if start == -1:
            return []                           # no edges at all

    # 2) Hierholzer with an explicit stack; ptr[v] = index of v's next unused edge
    ptr = [0] * n
    stack = [start]
    path = []
    while stack:
        v = stack[-1]
        if ptr[v] < len(adj[v]):
            stack.append(adj[v][ptr[v]])        # walk along an unused edge
            ptr[v] += 1
        else:
            path.append(stack.pop())            # stuck: v is final at this position
    path.reverse()

    # 3) Connectivity check: a real Euler path uses ALL edges
    return path if len(path) == len(edges) + 1 else []
` }, { lang: 'js', code: `// Directed graph with n nodes. Returns an Euler path/circuit as a vertex list, or [].
function eulerPath(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  const out = new Array(n).fill(0), inn = new Array(n).fill(0);
  for (const [u, v] of edges) { adj[u].push(v); out[u]++; inn[v]++; }

  // 1) Degree check + choose the start vertex
  let start = -1, plus = 0, minus = 0;
  for (let v = 0; v < n; v++) {
    const d = out[v] - inn[v];
    if (d === 1) { plus++; start = v; }
    else if (d === -1) minus++;
    else if (d !== 0) return [];                // |out - in| >= 2: impossible
  }
  if (!((plus === 0 && minus === 0) || (plus === 1 && minus === 1))) return [];
  if (start === -1) {                           // circuit: any vertex with an edge
    start = out.findIndex((d) => d > 0);
    if (start === -1) return [];                // no edges at all
  }

  // 2) Hierholzer with an explicit stack; ptr[v] = index of v's next unused edge
  const ptr = new Array(n).fill(0);
  const stack = [start], path = [];
  while (stack.length) {
    const v = stack[stack.length - 1];
    if (ptr[v] < adj[v].length) stack.push(adj[v][ptr[v]++]);   // walk along an unused edge
    else path.push(stack.pop());                                // stuck: v is final at this position
  }
  path.reverse();

  // 3) Connectivity check: a real Euler path uses ALL edges
  return path.length === edges.length + 1 ? path : [];
}
` }, { lang: 'cpp', code: `// Directed graph with n nodes. Returns an Euler path/circuit as a vertex list, or an empty vector.
vector<int> eulerPath(int n, const vector<vector<int>>& edges) {
    vector<vector<int>> adj(n);
    vector<int> out(n, 0), in(n, 0);
    for (auto& e : edges) { adj[e[0]].push_back(e[1]); out[e[0]]++; in[e[1]]++; }

    // 1) Degree check + choose the start vertex
    int start = -1, plus = 0, minus = 0;
    for (int v = 0; v < n; v++) {
        int d = out[v] - in[v];
        if (d == 1) { plus++; start = v; }
        else if (d == -1) minus++;
        else if (d != 0) return {};                          // |out - in| >= 2: impossible
    }
    if (!((plus == 0 && minus == 0) || (plus == 1 && minus == 1))) return {};
    if (start == -1) {                                       // circuit: any vertex with an edge
        for (int v = 0; v < n; v++) if (out[v] > 0) { start = v; break; }
        if (start == -1) return {};                          // no edges at all
    }

    // 2) Hierholzer with an explicit stack; ptr[v] = index of v's next unused edge
    vector<int> ptr(n, 0), stack{start}, path;
    while (!stack.empty()) {
        int v = stack.back();
        if (ptr[v] < (int)adj[v].size()) stack.push_back(adj[v][ptr[v]++]);   // walk along an unused edge
        else { path.push_back(v); stack.pop_back(); }                          // stuck: v is final here
    }
    reverse(path.begin(), path.end());

    // 3) Connectivity check: a real Euler path uses ALL edges
    return path.size() == edges.size() + 1 ? path : vector<int>{};
}
` }] }, { lang: 'java', code: `
      class EulerUndirected {
          // Undirected version: each edge appears in both lists, so mark edges used by id.
          static List<Integer> euler(int n, int[][] edges) {
              List<List<int[]>> adj = new ArrayList<>();            // {neighbour, edgeId}
              for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
              int[] deg = new int[n];
              for (int id = 0; id < edges.length; id++) {
                  int u = edges[id][0], v = edges[id][1];
                  adj.get(u).add(new int[]{v, id});
                  adj.get(v).add(new int[]{u, id});
                  deg[u]++;
                  deg[v]++;
              }
              int odd = 0, start = -1;
              for (int v = 0; v < n; v++) if (deg[v] % 2 == 1) { odd++; if (start == -1) start = v; }
              if (odd != 0 && odd != 2) return List.of();
              if (start == -1) for (int v = 0; v < n; v++) if (deg[v] > 0) { start = v; break; }
              if (start == -1) return List.of();

              boolean[] used = new boolean[edges.length];
              int[] ptr = new int[n];
              Deque<Integer> stack = new ArrayDeque<>();
              LinkedList<Integer> path = new LinkedList<>();
              stack.push(start);
              while (!stack.isEmpty()) {
                  int v = stack.peek();
                  // skip edges that were already walked from the other end
                  while (ptr[v] < adj.get(v).size() && used[adj.get(v).get(ptr[v])[1]]) ptr[v]++;
                  if (ptr[v] == adj.get(v).size()) {
                      path.addFirst(stack.pop());
                  } else {
                      int[] e = adj.get(v).get(ptr[v]++);
                      used[e[1]] = true;
                      stack.push(e[0]);
                  }
              }
              return path.size() == edges.length + 1 ? path : List.of();
          }
      }`, alt: [{ lang: 'python', code: `def euler_undirected(n, edges):
    # Undirected version: each edge appears in both lists, so mark edges used by id.
    adj = [[] for _ in range(n)]                # (neighbour, edge id)
    deg = [0] * n
    for eid, (u, v) in enumerate(edges):
        adj[u].append((v, eid))
        adj[v].append((u, eid))
        deg[u] += 1
        deg[v] += 1
    odd = [v for v in range(n) if deg[v] % 2 == 1]
    if len(odd) not in (0, 2):
        return []
    start = odd[0] if odd else next((v for v in range(n) if deg[v] > 0), -1)
    if start == -1:
        return []

    used = [False] * len(edges)
    ptr = [0] * n
    stack = [start]
    path = []
    while stack:
        v = stack[-1]
        # skip edges that were already walked from the other end
        while ptr[v] < len(adj[v]) and used[adj[v][ptr[v]][1]]:
            ptr[v] += 1
        if ptr[v] == len(adj[v]):
            path.append(stack.pop())
        else:
            w, eid = adj[v][ptr[v]]
            ptr[v] += 1
            used[eid] = True
            stack.append(w)
    path.reverse()
    return path if len(path) == len(edges) + 1 else []
` }, { lang: 'js', code: `// Undirected version: each edge appears in both lists, so mark edges used by id.
function eulerUndirected(n, edges) {
  const adj = Array.from({ length: n }, () => []);      // [neighbour, edge id]
  const deg = new Array(n).fill(0);
  edges.forEach(([u, v], id) => {
    adj[u].push([v, id]);
    adj[v].push([u, id]);
    deg[u]++;
    deg[v]++;
  });
  const odd = [];
  for (let v = 0; v < n; v++) if (deg[v] % 2 === 1) odd.push(v);
  if (odd.length !== 0 && odd.length !== 2) return [];
  const start = odd.length ? odd[0] : deg.findIndex((d) => d > 0);
  if (start === -1) return [];

  const used = new Array(edges.length).fill(false);
  const ptr = new Array(n).fill(0);
  const stack = [start], path = [];
  while (stack.length) {
    const v = stack[stack.length - 1];
    // skip edges that were already walked from the other end
    while (ptr[v] < adj[v].length && used[adj[v][ptr[v]][1]]) ptr[v]++;
    if (ptr[v] === adj[v].length) {
      path.push(stack.pop());
    } else {
      const [w, id] = adj[v][ptr[v]++];
      used[id] = true;
      stack.push(w);
    }
  }
  path.reverse();
  return path.length === edges.length + 1 ? path : [];
}
` }, { lang: 'cpp', code: `// Undirected version: each edge appears in both lists, so mark edges used by id.
vector<int> eulerUndirected(int n, const vector<vector<int>>& edges) {
    vector<vector<pair<int, int>>> adj(n);                   // {neighbour, edgeId}
    vector<int> deg(n, 0);
    for (int id = 0; id < (int)edges.size(); id++) {
        int u = edges[id][0], v = edges[id][1];
        adj[u].push_back({v, id});
        adj[v].push_back({u, id});
        deg[u]++;
        deg[v]++;
    }
    int odd = 0, start = -1;
    for (int v = 0; v < n; v++) if (deg[v] % 2 == 1) { odd++; if (start == -1) start = v; }
    if (odd != 0 && odd != 2) return {};
    if (start == -1) for (int v = 0; v < n; v++) if (deg[v] > 0) { start = v; break; }
    if (start == -1) return {};

    vector<char> used(edges.size(), 0);
    vector<int> ptr(n, 0), stack{start}, path;
    while (!stack.empty()) {
        int v = stack.back();
        // skip edges that were already walked from the other end
        while (ptr[v] < (int)adj[v].size() && used[adj[v][ptr[v]].second]) ptr[v]++;
        if (ptr[v] == (int)adj[v].size()) {
            path.push_back(v);
            stack.pop_back();
        } else {
            auto [w, id] = adj[v][ptr[v]++];
            used[id] = 1;
            stack.push_back(w);
        }
    }
    reverse(path.begin(), path.end());
    return path.size() == edges.size() + 1 ? path : vector<int>{};
}
` }] }],
    codeTitle: ['Directed Euler path/circuit', 'Undirected Euler path/circuit'],
    viz: {
      title: 'Hierholzer live: walk until stuck, pop into the answer, detours splice themselves in',
      input: 'A>B B>C C>A C>D D>E E>C',
      inputLabel: 'Directed edges "u>v" separated by spaces (up to 9 nodes, 16 edges)',
      gen: function (input) {
        var P = parseEdges(input, { example: 'A>B B>C C>A', maxN: 9, maxE: 16 });
        var ids = P.ids, n = ids.length, ix = {};
        ids.forEach(function (id, i) { ix[id] = i; });
        var adj = ids.map(function () { return []; }), out = ids.map(function () { return 0; }), inn = out.slice();
        P.edges.forEach(function (e, k) { adj[ix[e[0]]].push(k); out[ix[e[0]]]++; inn[ix[e[1]]]++; });
        var nodes = circle(ids, 70), frames = [], hl = {}, ehl = {}, tags = {};
        ids.forEach(function (id, i) { tags[id] = 'out ' + out[i] + ' in ' + inn[i]; });
        function G(label) { return { type: 'graph', label: label, directed: true, height: 70, nodes: nodes, edges: P.edges.map(function (e) { return [e[0], e[1]]; }), hl: copy(hl), ehl: copy(ehl), tags: copy(tags) }; }
        var start = -1, plus = 0, minus = 0, bad = false, rows = [], rhl = {};
        ids.forEach(function (id, i) {
          var d = out[i] - inn[i];
          rows.push([id, out[i], inn[i], (d > 0 ? '+' : '') + d]);
          if (d !== 0) rhl[i] = Math.abs(d) === 1 ? 'cur' : 'bad';
          if (d === 1) { plus++; start = i; } else if (d === -1) minus++; else if (d !== 0) bad = true;
        });
        var ok = !bad && ((plus === 0 && minus === 0) || (plus === 1 && minus === 1));
        frames.push({ narr: '<b>Step 1 — degree check.</b> Every pass through a vertex uses one edge in and one out, so vertices must be balanced (out = in), except possibly a start with +1 and an end with −1.', parts: [G('tags = out/in degree'), { type: 'table', label: 'degree table', columns: ['node', 'out', 'in', 'out − in'], rows: rows, hl: rhl }] });
        if (!ok) {
          frames.push({ narr: '<span class="c-r">Degree rule fails</span> (' + plus + ' vertex/vertices with +1, ' + minus + ' with −1' + (bad ? ', and some |out − in| ≥ 2' : '') + '). No Euler path exists — no need to search.', parts: [G('impossible'), { type: 'table', label: 'degree table', columns: ['node', 'out', 'in', 'out − in'], rows: rows, hl: rhl }] });
          frames.push({ narr: 'Tip: try removing or adding one edge so that all vertices are balanced, e.g. close the path back to its start.', parts: [{ type: 'text', html: 'A directed Euler <b>circuit</b> needs out = in everywhere; an Euler <b>path</b> allows exactly one +1 vertex (start) and one −1 vertex (end).' }] });
          frames.push({ narr: 'Edit the input and run again.', parts: [G('your graph')] });
          return frames;
        }
        if (start === -1) { for (var i = 0; i < n; i++) if (out[i] > 0) { start = i; break; } }
        frames.push({ narr: (plus ? 'Exactly one +1 vertex: the walk must <b>start at ' + ids[start] + '</b> (Euler <b>path</b>).' : 'All balanced: an Euler <b>circuit</b> — start anywhere with an edge, we use <b>' + ids[start] + '</b>.') + ' Push it on the stack.', parts: [G('start'), { type: 'stack', label: 'stack', items: [ids[start]] }, { type: 'array', label: 'answer (built from the back)', values: [] }] });
        var ptr = ids.map(function () { return 0; }), stack = [start], path = [], last = null, used = 0;
        tags = {};
        var guard = 0;
        while (stack.length && guard++ < 200) {
          var v = stack[stack.length - 1];
          hl = {}; hl[ids[v]] = 'cur';
          if (ptr[v] < adj[v].length) {
            var k = adj[v][ptr[v]++], e = P.edges[k], w = ix[e[1]];
            if (last) ehl[last] = 'done';
            last = e[0] + '-' + e[1]; ehl[last] = 'cur'; used++;
            stack.push(w);
            hl[ids[w]] = 'ok';
            frames.push({ narr: '<b>' + ids[v] + '</b> still has an unused edge → walk <b>' + ids[v] + '→' + ids[w] + '</b> and push ' + ids[w] + '. (' + used + '/' + P.edges.length + ' edges used)', parts: [G('walking'), { type: 'stack', label: 'stack (current walk)', items: stack.map(function (x) { return ids[x]; }), hl: one(stack.length - 1, 'ok') }, { type: 'array', label: 'answer (built from the back)', values: path.map(function (x) { return ids[x]; }) }] });
          } else {
            stack.pop();
            path.unshift(v);
            hl[ids[v]] = 'sel';
            frames.push({ narr: '<b>' + ids[v] + '</b> has no unused edges → <b>stuck</b>. Pop it and put it at the <b>front</b> of the answer. ' + (stack.length ? 'Back to ' + ids[stack[stack.length - 1]] + ' — if it has unused edges, a detour starts there.' : 'Stack empty — done!'), parts: [G('backing up'), { type: 'stack', label: 'stack (current walk)', items: stack.map(function (x) { return ids[x]; }) }, { type: 'array', label: 'answer (built from the back)', values: path.map(function (x) { return ids[x]; }), hl: one(0, 'ok') }] });
          }
        }
        if (last) ehl[last] = 'done';
        var full = path.length === P.edges.length + 1;
        frames.push({ narr: full ? '<span class="c-g">Euler ' + (plus ? 'path' : 'circuit') + ' found</span>: ' + path.map(function (x) { return ids[x]; }).join(' → ') + '. Every edge used exactly once, total work O(V + E).' : '<span class="c-r">Only ' + (path.length - 1) + ' of ' + P.edges.length + ' edges were reachable</span> — the edges are in more than one piece, so no Euler path exists even though degrees looked fine.', parts: [G(full ? 'all edges used' : 'disconnected'), { type: 'array', label: 'final answer', values: path.map(function (x) { return ids[x]; }), hl: full ? {} : one(0, 'bad') }] });
        return frames;
      }
    },
    examples: [
      { title: 'The Seven Bridges of Königsberg (1736)', html: `<p>Euler's original puzzle: 4 land masses, 7 bridges. Degrees were 5, 3, 3, 3 — <b>four</b> odd vertices. A path allows at most two, so no walk crosses each bridge once. This was the birth of graph theory.</p>${H.arr([5, 3, 3, 3], { label: 'degrees (all odd)', hl: { 0: 'r', 1: 'r', 2: 'r', 3: 'r' } })}` },
      { title: 'The "house" drawing puzzle', html: `<p>A square with an X inside and a roof triangle: the two bottom corners have degree 3 (odd), every other corner is even. Exactly two odd vertices → an Euler <b>path</b> exists, and it <b>must start at one bottom corner and end at the other</b>. Start anywhere else and you will always get stuck.</p>` },
      { title: 'Greedy walking fails, Hierholzer does not', html: `<p>Edges <code>A→B, A→C, C→A</code> starting at A (out−in = +1). A naive walker taking A→B first is stuck at B with A→C, C→A unused. Hierholzer: push A, walk A→B, B stuck → answer [B]; back at A, walk A→C→A, A now stuck → [A, B], C → [C, A, B], A → <b>[A, C, A, B]</b>. ${H.c('g', 'The detour was spliced in front of B.')}</p>`, code: { lang: 'java', code: `int[][] edges = {{0, 1}, {0, 2}, {2, 0}};   // A=0, B=1, C=2
// Hierholzer.eulerPath(3, edges) returns [0, 2, 0, 1]  i.e.  A C A B`, alt: [{ lang: 'python', code: `edges = [[0, 1], [0, 2], [2, 0]]   # A=0, B=1, C=2
# euler_path(3, edges) returns [0, 2, 0, 1]  i.e.  A C A B
` }, { lang: 'js', code: `const edges = [[0, 1], [0, 2], [2, 0]];   // A=0, B=1, C=2
// eulerPath(3, edges) returns [0, 2, 0, 1]  i.e.  A C A B
` }, { lang: 'cpp', code: `vector<vector<int>> edges = {{0, 1}, {0, 2}, {2, 0}};   // A=0, B=1, C=2
// eulerPath(3, edges) returns {0, 2, 0, 1}  i.e.  A C A B
` }] } },
      { title: 'Degrees fine but still impossible', html: `<p>Two separate triangles <code>A→B→C→A</code> and <code>D→E→F→D</code>: every vertex is balanced, yet no single walk covers both. That is why the code checks <code>path.size() == E + 1</code> at the end — it is the cheapest connectivity test.</p>` }
    ],
    deepDive: `<p><b>Why "pop into the front of the answer" is correct.</b> A vertex is popped only when all its edges are used. In the directed case with balanced degrees, the first time the walk gets stuck it must be at the start vertex (every other vertex we enter still has an unused out-edge, because in = out). So the first walk is a closed loop. Backing up, we find a vertex with unused edges, walk another closed loop from it (same argument), and so on. The reverse pop order exactly splices each loop into the place where it branches off. This is just <b>reverse post-order of a DFS over edges</b>.</p>
      <p><b>Complexity:</b> each edge is pushed once and each vertex is popped once per incident edge → <b>O(V + E)</b>. Fleury's older algorithm ("never cross a bridge unless you must") is O(E²) because it needs a bridge check at every step — avoid it.</p>
      <p><b>Lexicographic order (LC 332):</b> use a min-heap per vertex (or sort adjacency lists in <b>ascending</b> order and read them with a pointer). Because of the reverse construction, always taking the smallest available edge still yields the lexicographically smallest valid itinerary.</p>
      <p><b>de Bruijn sequences:</b> to list every length-n string over k symbols as overlapping windows, make the (n−1)-length strings the vertices and each n-length string an edge (k<sup>n</sup> edges). Every vertex has in = out = k, the graph is strongly connected → an Euler circuit exists; its edge labels form a sequence of length k<sup>n</sup> + n − 1 that contains every combination exactly once. This is the trick behind "Cracking the Safe" and is used in genome assembly (de Bruijn graphs of k-mers in assemblers such as Velvet and SPAdes).</p>
      <p><b>Chinese Postman (route inspection):</b> if some vertices are odd, you must repeat some edges. Pair up the odd vertices with a <b>minimum-weight perfect matching</b> on their shortest-path distances, duplicate those paths, and the graph becomes Eulerian. Used for snow-plough, street-sweeping and mail routes.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant instantly recognises "use all tickets once" as Euler and writes Hierholzer. The value you add is the <b>modelling</b>: what are the vertices, what are the edges? In de Bruijn or "valid arrangement of pairs" problems that mapping is the whole difficulty.</p>
      <p><b>Use AI as a partner:</b> ask <code>"Give me a graph where greedily taking the smallest edge gets stuck but a valid Euler path exists"</code> and use it as a regression test. Ask for a networkx one-liner (<code>nx.eulerian_path</code>) to cross-check your output on random Eulerian graphs.</p>
      <p><b>Where AI goes wrong:</b> confusing Euler with Hamiltonian (and then proposing exponential backtracking), forgetting the connectivity check, starting the directed path at the wrong vertex (must be out − in = +1), and in undirected graphs forgetting to mark an edge used from <b>both</b> ends, which walks every edge twice.</p>
      <p><b>What you must still own:</b> the degree argument (it is a 30-second proof interviewers love), the vertex/edge modelling choice, and recognising when the problem is really Chinese Postman rather than pure Euler.</p>`,
    problems: [{
      title: 'Reconstruct Itinerary',
      level: 'Hard', tags: ['euler path', 'hierholzer', 'heap'], companies: ['Google', 'Uber', 'Meta'],
      statement: `<p>You are given airline <code>tickets</code> where <code>tickets[i] = [from, to]</code>. All tickets belong to a traveller who starts at <code>"JFK"</code>. Use <b>all</b> tickets exactly once and return the itinerary. If several itineraries are valid, return the <b>lexicographically smallest</b> one. At least one valid itinerary exists.</p>`,
      constraints: `<p>1 ≤ tickets.length ≤ 300, airport codes are 3 uppercase letters.</p>`,
      example: `<p>tickets = <code>[["JFK","KUL"],["JFK","NRT"],["NRT","JFK"]]</code> → <b>${H.c('g', '["JFK","NRT","JFK","KUL"]')}</b>.</p><p>Why: "KUL" &lt; "NRT", but flying to KUL first leaves you stuck there with two unused tickets. The smallest <b>valid</b> itinerary goes to NRT first.</p>`,
      brute: {
        why: `<p>Backtracking: sort tickets, try the smallest unused ticket from the current airport, undo when stuck. The first complete path found is the answer — but in the worst case it explores exponentially many partial paths (many dead ends with repeated airports).</p>`,
        code: `class Brute {
    public List<String> findItinerary(List<List<String>> tickets) {
        List<List<String>> t = new ArrayList<>(tickets);
        t.sort((a, b) -> a.get(1).compareTo(b.get(1)));        // try smaller destinations first
        boolean[] used = new boolean[t.size()];
        List<String> path = new ArrayList<>();
        path.add("JFK");
        dfs("JFK", t, used, path);
        return path;
    }

    private boolean dfs(String at, List<List<String>> t, boolean[] used, List<String> path) {
        if (path.size() == t.size() + 1) return true;           // every ticket used
        for (int i = 0; i < t.size(); i++) {
            if (used[i] || !t.get(i).get(0).equals(at)) continue;
            used[i] = true;
            path.add(t.get(i).get(1));
            if (dfs(t.get(i).get(1), t, used, path)) return true;
            path.remove(path.size() - 1);                       // undo and try the next ticket
            used[i] = false;
        }
        return false;
    }
}`
      },
      mcq: { q: 'Why does Hierholzer prepend a vertex to the answer when it gets stuck?', options: ['A stuck vertex must be the end of the remaining route, so it belongs after everything still on the stack', 'Because the stack is reversed by mistake', 'To sort the answer lexicographically', 'It does not matter where it is inserted'], answer: 0, explain: 'All edges of that vertex are used, so nothing can follow it; everything still on the stack comes before it.' },
      hints: [
        `<p>Hint 1: Airports are vertices, tickets are directed edges, and "use every ticket once" is an Euler path starting at JFK.</p>`,
        `<p>Hint 2: Keep each airport's destinations in a min-heap (<code>PriorityQueue</code> / <code>heapq</code> / a hand-written heap in JavaScript / <code>priority_queue</code> with <code>greater</code>) or a sorted list, so you always take the smallest unused ticket.</p>`,
        `<p>Hint 3: Recipe — stack = [JFK]; while stack not empty: if top has tickets, poll the smallest and push it; else pop and add to the <b>front</b> of the route. Dead ends (like KUL) get popped first and end up at the end of the itinerary.</p>`
      ],
      tests: { sig: "list<list<string>> -> list<string>", fn: "findItinerary", cases: [
          [[[["JFK","KUL"],["JFK","NRT"],["NRT","JFK"]]],["JFK","NRT","JFK","KUL"]],
          [[[["JFK","SFO"],["JFK","ATL"],["SFO","ATL"],["ATL","JFK"],["ATL","SFO"]]],["JFK","ATL","JFK","SFO","ATL","SFO"]],
          [[[["JFK","AAA"]]],["JFK","AAA"]],
          [[[["JFK","AAA"],["JFK","AAA"],["AAA","JFK"]]],["JFK","AAA","JFK","AAA"]],
          [[[["JFK","JFK"]]],["JFK","JFK"]],
          [[[["JFK","BBB"],["BBB","AAA"],["AAA","CCC"]]],["JFK","BBB","AAA","CCC"]],
          [[[["JFK","AAA"],["JFK","BBB"],["BBB","JFK"]]],["JFK","BBB","JFK","AAA"]],
          [[[["JFK","BBB"],["JFK","DDD"],["BBB","BBB"],["CCC","AAA"],["DDD","DDD"],["BBB","AAA"],["BBB","CCC"],["AAA","BBB"],["AAA","JFK"]]],["JFK","BBB","AAA","BBB","BBB","CCC","AAA","JFK","DDD","DDD"]],
          [[[["AAA","CCC"],["CCC","AAA"],["CCC","CCC"],["CCC","DDD"],["JFK","CCC"]]],["JFK","CCC","AAA","CCC","CCC","DDD"]],
          [[[["JFK","AAA"],["JFK","JFK"],["JFK","BBB"],["JFK","JFK"],["AAA","JFK"],["BBB","AAA"]]],["JFK","AAA","JFK","JFK","JFK","BBB","AAA"]],
          [[[["CCC","DDD"],["JFK","BBB"],["DDD","BBB"],["CCC","DDD"],["BBB","CCC"],["BBB","DDD"],["DDD","AAA"],["AAA","BBB"],["BBB","CCC"]]],["JFK","BBB","CCC","DDD","AAA","BBB","CCC","DDD","BBB","DDD"]],
          [[[["JFK","DDD"],["DDD","AAA"],["AAA","JFK"]]],["JFK","DDD","AAA","JFK"]],
          [[[["JFK","BBB"],["BBB","DDD"],["DDD","JFK"],["JFK","BBB"],["BBB","DDD"]]],["JFK","BBB","DDD","JFK","BBB","DDD"]],
          [[[["JFK","AAA"],["AAA","DDD"],["BBB","DDD"],["DDD","BBB"],["JFK","AAA"],["DDD","JFK"],["AAA","BBB"]]],["JFK","AAA","BBB","DDD","JFK","AAA","DDD","BBB"]],
          [[[["DDD","BBB"],["BBB","JFK"],["JFK","JFK"],["BBB","BBB"],["CCC","DDD"],["JFK","CCC"]]],["JFK","CCC","DDD","BBB","BBB","JFK","JFK"]],
          [[[["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"],["JFK","AAA"],["AAA","JFK"]]],["JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK","AAA","JFK"]],
          [[[["EAZ","JFK"],["BYZ","JFK"],["BBZ","JFK"],["ASZ","JFK"],["JFK","AOZ"],["AAZ","JFK"],["AGZ","JFK"],["JFK","ACZ"],["JFK","AGZ"],["JFK","ATZ"],["JFK","AAZ"],["AOZ","JFK"],["CAZ","JFK"],["JFK","BVZ"],["AUZ","JFK"],["JFK","CFZ"],["JFK","CBZ"],["JFK","ASZ"],["AEZ","JFK"],["CCZ","JFK"],["AFZ","JFK"],["CFZ","JFK"],["JFK","AYZ"],["CNZ","JFK"],["JFK","AVZ"],["CHZ","JFK"],["ALZ","JFK"],["BGZ","JFK"],["BNZ","JFK"],["JFK","BOZ"],["JFK","ADZ"],["JFK","BIZ"],["JFK","CXZ"],["CLZ","JFK"],["AIZ","JFK"],["CMZ","JFK"],["JFK","FEZ"],["ELZ","JFK"],["BQZ","JFK"],["CDZ","JFK"],["EVZ","JFK"],["CQZ","JFK"],["DWZ","JFK"],["JFK","CEZ"],["JFK","ENZ"],["JFK","BNZ"],["JFK","EPZ"],["ERZ","JFK"],["JFK","FCZ"],["BSZ","JFK"],["JFK","ESZ"],["JFK","CYZ"],["FCZ","JFK"],["JFK","AFZ"],["CYZ","JFK"],["JFK","EWZ"],["JFK","ELZ"],["ACZ","JFK"],["EHZ","JFK"],["JFK","DSZ"],["JFK","DJZ"],["EYZ","JFK"],["JFK","EMZ"],["BLZ","JFK"],["ETZ","JFK"],["FGZ","JFK"],["JFK","EAZ"],["DAZ","JFK"],["CVZ","JFK"],["JFK","AHZ"],["DGZ","JFK"],["JFK","AZZ"],["JFK","CZZ"],["EKZ","JFK"],["FEZ","JFK"],["JFK","DZZ"],["BWZ","JFK"],["EZZ","JFK"],["BRZ","JFK"],["JFK","CJZ"],["ADZ","JFK"],["EGZ","JFK"],["JFK","CGZ"],["JFK","FIZ"],["FPZ","JFK"],["EMZ","JFK"],["AHZ","JFK"],["JFK","AQZ"],["JFK","BCZ"],["JFK","EJZ"],["JFK","EDZ"],["JFK","DIZ"],["JFK","CNZ"],["JFK","BBZ"],["ESZ","JFK"],["CZZ","JFK"],["ENZ","JFK"],["JFK","BAZ"],["BMZ","JFK"],["JFK","ABZ"],["JFK","CMZ"],["DRZ","JFK"],["JFK","DUZ"],["FTZ","JFK"],["DJZ","JFK"],["JFK","CWZ"],["JFK","EUZ"],["DSZ","JFK"],["CWZ","JFK"],["JFK","CRZ"],["JFK","FOZ"],["JFK","DXZ"],["JFK","DKZ"],["JFK","BRZ"],["JFK","FQZ"],["CRZ","JFK"],["JFK","AEZ"],["JFK","BXZ"],["EBZ","JFK"],["FHZ","JFK"],["JFK","DBZ"],["JFK","DRZ"],["DUZ","JFK"],["FQZ","JFK"],["DFZ","JFK"],["EXZ","JFK"],["JFK","DTZ"],["JFK","AIZ"],["CPZ","JFK"],["EIZ","JFK"],["DYZ","JFK"],["FFZ","JFK"],["FBZ","JFK"],["JFK","DGZ"],["JFK","EKZ"],["JFK","CQZ"],["JFK","EIZ"],["JFK","BFZ"],["JFK","EYZ"],["DVZ","JFK"],["JFK","APZ"],["JFK","EZZ"],["JFK","ETZ"],["FSZ","JFK"],["ABZ","JFK"],["JFK","BHZ"],["FRZ","JFK"],["JFK","AMZ"],["EFZ","JFK"],["ATZ","JFK"],["DBZ","JFK"],["JFK","DWZ"],["ANZ","JFK"],["FAZ","JFK"],["JFK","CKZ"],["AJZ","JFK"],["AKZ","JFK"],["JFK","BDZ"],["EOZ","JFK"],["AQZ","JFK"],["JFK","CPZ"],["JFK","DVZ"],["APZ","JFK"],["JFK","BYZ"],["JFK","AJZ"],["JFK","EOZ"],["JFK","DMZ"],["JFK","FFZ"],["JFK","ALZ"],["CIZ","JFK"],["DPZ","JFK"],["JFK","DPZ"],["AYZ","JFK"],["JFK","ECZ"],["FJZ","JFK"],["BOZ","JFK"],["JFK","EHZ"],["JFK","AKZ"],["EUZ","JFK"],["JFK","DEZ"],["FMZ","JFK"],["JFK","CAZ"],["JFK","BWZ"],["AMZ","JFK"],["JFK","ERZ"],["BKZ","JFK"],["JFK","ANZ"],["JFK","FMZ"],["JFK","BMZ"],["EWZ","JFK"],["CBZ","JFK"],["DKZ","JFK"],["JFK","EFZ"],["JFK","EVZ"],["JFK","FNZ"],["JFK","CIZ"],["JFK","FBZ"],["DCZ","JFK"],["JFK","AUZ"],["JFK","AWZ"],["DHZ","JFK"],["BXZ","JFK"],["EDZ","JFK"],["JFK","CUZ"],["DTZ","JFK"],["JFK","CSZ"],["JFK","BJZ"],["FLZ","JFK"],["JFK","CVZ"],["JFK","FRZ"],["JFK","ARZ"],["CUZ","JFK"],["CKZ","JFK"],["EEZ","JFK"],["JFK","EGZ"],["JFK","FSZ"],["FOZ","JFK"],["DXZ","JFK"],["JFK","BSZ"],["JFK","DQZ"],["JFK","DYZ"],["JFK","AXZ"],["EJZ","JFK"],["JFK","FDZ"],["JFK","EEZ"],["JFK","BUZ"],["BPZ","JFK"],["ECZ","JFK"],["DQZ","JFK"],["ARZ","JFK"],["JFK","DOZ"],["BEZ","JFK"],["AWZ","JFK"],["EPZ","JFK"],["BJZ","JFK"],["JFK","FJZ"],["FKZ","JFK"],["JFK","BEZ"],["BUZ","JFK"],["JFK","CLZ"],["JFK","CHZ"],["JFK","EBZ"],["JFK","FAZ"],["JFK","DLZ"],["CGZ","JFK"],["DZZ","JFK"],["JFK","DAZ"],["BVZ","JFK"],["JFK","DHZ"],["JFK","EQZ"],["DOZ","JFK"],["JFK","BKZ"],["CTZ","JFK"],["JFK","BTZ"],["FIZ","JFK"],["JFK","EXZ"],["BDZ","JFK"],["JFK","FPZ"],["JFK","BLZ"],["JFK","BGZ"],["JFK","CTZ"],["AZZ","JFK"],["CXZ","JFK"],["JFK","BPZ"],["BAZ","JFK"],["JFK","FKZ"],["BTZ","JFK"],["DLZ","JFK"],["DNZ","JFK"],["FNZ","JFK"],["JFK","FLZ"],["COZ","JFK"],["JFK","DCZ"],["CSZ","JFK"],["CJZ","JFK"],["JFK","FHZ"],["CEZ","JFK"],["DEZ","JFK"],["DDZ","JFK"],["EQZ","JFK"],["JFK","FGZ"],["DMZ","JFK"],["BIZ","JFK"],["BFZ","JFK"],["AVZ","JFK"],["JFK","FTZ"],["JFK","DFZ"],["JFK","BZZ"],["JFK","CDZ"],["JFK","DDZ"],["AXZ","JFK"],["DIZ","JFK"],["JFK","DNZ"],["FDZ","JFK"],["BCZ","JFK"],["BHZ","JFK"],["JFK","COZ"],["BZZ","JFK"],["JFK","BQZ"],["JFK","CCZ"]]],["JFK","AAZ","JFK","ABZ","JFK","ACZ","JFK","ADZ","JFK","AEZ","JFK","AFZ","JFK","AGZ","JFK","AHZ","JFK","AIZ","JFK","AJZ","JFK","AKZ","JFK","ALZ","JFK","AMZ","JFK","ANZ","JFK","AOZ","JFK","APZ","JFK","AQZ","JFK","ARZ","JFK","ASZ","JFK","ATZ","JFK","AUZ","JFK","AVZ","JFK","AWZ","JFK","AXZ","JFK","AYZ","JFK","AZZ","JFK","BAZ","JFK","BBZ","JFK","BCZ","JFK","BDZ","JFK","BEZ","JFK","BFZ","JFK","BGZ","JFK","BHZ","JFK","BIZ","JFK","BJZ","JFK","BKZ","JFK","BLZ","JFK","BMZ","JFK","BNZ","JFK","BOZ","JFK","BPZ","JFK","BQZ","JFK","BRZ","JFK","BSZ","JFK","BTZ","JFK","BUZ","JFK","BVZ","JFK","BWZ","JFK","BXZ","JFK","BYZ","JFK","BZZ","JFK","CAZ","JFK","CBZ","JFK","CCZ","JFK","CDZ","JFK","CEZ","JFK","CFZ","JFK","CGZ","JFK","CHZ","JFK","CIZ","JFK","CJZ","JFK","CKZ","JFK","CLZ","JFK","CMZ","JFK","CNZ","JFK","COZ","JFK","CPZ","JFK","CQZ","JFK","CRZ","JFK","CSZ","JFK","CTZ","JFK","CUZ","JFK","CVZ","JFK","CWZ","JFK","CXZ","JFK","CYZ","JFK","CZZ","JFK","DAZ","JFK","DBZ","JFK","DCZ","JFK","DDZ","JFK","DEZ","JFK","DFZ","JFK","DGZ","JFK","DHZ","JFK","DIZ","JFK","DJZ","JFK","DKZ","JFK","DLZ","JFK","DMZ","JFK","DNZ","JFK","DOZ","JFK","DPZ","JFK","DQZ","JFK","DRZ","JFK","DSZ","JFK","DTZ","JFK","DUZ","JFK","DVZ","JFK","DWZ","JFK","DXZ","JFK","DYZ","JFK","DZZ","JFK","EAZ","JFK","EBZ","JFK","ECZ","JFK","EDZ","JFK","EEZ","JFK","EFZ","JFK","EGZ","JFK","EHZ","JFK","EIZ","JFK","EJZ","JFK","EKZ","JFK","ELZ","JFK","EMZ","JFK","ENZ","JFK","EOZ","JFK","EPZ","JFK","EQZ","JFK","ERZ","JFK","ESZ","JFK","ETZ","JFK","EUZ","JFK","EVZ","JFK","EWZ","JFK","EXZ","JFK","EYZ","JFK","EZZ","JFK","FAZ","JFK","FBZ","JFK","FCZ","JFK","FDZ","JFK","FEZ","JFK","FFZ","JFK","FGZ","JFK","FHZ","JFK","FIZ","JFK","FJZ","JFK","FKZ","JFK","FLZ","JFK","FMZ","JFK","FNZ","JFK","FOZ","JFK","FPZ","JFK","FQZ","JFK","FRZ","JFK","FSZ","JFK","FTZ","JFK"]],
          [[[["DQQ","DRQ"],["IXQ","IYQ"],["JFK","AAQ"],["CAQ","CBQ"],["AAQ","ABQ"],["BOQ","BPQ"],["ATQ","AUQ"],["CVQ","CWQ"],["CHQ","CIQ"],["BXQ","BYQ"],["CNQ","COQ"],["FOQ","FPQ"],["DBQ","DCQ"],["AKQ","ALQ"],["EJQ","EKQ"],["BSQ","BTQ"],["EFQ","EGQ"],["BHQ","BIQ"],["CSQ","CTQ"],["EXQ","EYQ"],["FDQ","FEQ"],["CZQ","DAQ"],["EQQ","ERQ"],["DSQ","DTQ"],["EDQ","EEQ"],["ARQ","ASQ"],["EKQ","ELQ"],["AVQ","AWQ"],["ANQ","AOQ"],["ELQ","EMQ"],["BRQ","BSQ"],["FNQ","FOQ"],["FKQ","FLQ"],["DIQ","DJQ"],["AYQ","AZQ"],["CUQ","CVQ"],["KUQ","KVQ"],["CMQ","CNQ"],["AWQ","AXQ"],["BAQ","BBQ"],["JXQ","JYQ"],["EUQ","EVQ"],["CGQ","CHQ"],["FLQ","FMQ"],["BLQ","BMQ"],["IWQ","IXQ"],["JPQ","JQQ"],["KAQ","KBQ"],["BWQ","BXQ"],["AIQ","AJQ"],["JLQ","JMQ"],["JEQ","JFQ"],["DZQ","EAQ"],["JZQ","KAQ"],["GHQ","GIQ"],["JSQ","JTQ"],["DXQ","DYQ"],["HFQ","HGQ"],["HBQ","HCQ"],["AGQ","AHQ"],["FBQ","FCQ"],["BKQ","BLQ"],["AQQ","ARQ"],["AOQ","APQ"],["GXQ","GYQ"],["GZQ","HAQ"],["HTQ","HUQ"],["IMQ","INQ"],["JMQ","JNQ"],["BTQ","BUQ"],["IOQ","IPQ"],["JDQ","JEQ"],["BFQ","BGQ"],["JRQ","JSQ"],["HLQ","HMQ"],["AEQ","AFQ"],["HKQ","HLQ"],["APQ","AQQ"],["HSQ","HTQ"],["CRQ","CSQ"],["CBQ","CCQ"],["GOQ","GPQ"],["JNQ","JOQ"],["KCQ","KDQ"],["FCQ","FDQ"],["IJQ","IKQ"],["DLQ","DMQ"],["GQQ","GRQ"],["GKQ","GLQ"],["GPQ","GQQ"],["HVQ","HWQ"],["JQQ","JRQ"],["HOQ","HPQ"],["HCQ","HDQ"],["JKQ","JLQ"],["HXQ","HYQ"],["IIQ","IJQ"],["JWQ","JXQ"],["EZQ","FAQ"],["AUQ","AVQ"],["ENQ","EOQ"],["BJQ","BKQ"],["EVQ","EWQ"],["GVQ","GWQ"],["CTQ","CUQ"],["CEQ","CFQ"],["KBQ","KCQ"],["JJQ","JKQ"],["FHQ","FIQ"],["DFQ","DGQ"],["HYQ","HZQ"],["JTQ","JUQ"],["ECQ","EDQ"],["ACQ","ADQ"],["FQQ","FRQ"],["JYQ","JZQ"],["GTQ","GUQ"],["LFQ","LGQ"],["EMQ","ENQ"],["FVQ","FWQ"],["GEQ","GFQ"],["HWQ","HXQ"],["JVQ","JWQ"],["KEQ","KFQ"],["GIQ","GJQ"],["KXQ","KYQ"],["IEQ","IFQ"],["HNQ","HOQ"],["FYQ","FZQ"],["AZQ","BAQ"],["IKQ","ILQ"],["EIQ","EJQ"],["KFQ","KGQ"],["LLQ","LMQ"],["FPQ","FQQ"],["BVQ","BWQ"],["CJQ","CKQ"],["ERQ","ESQ"],["FGQ","FHQ"],["IPQ","IQQ"],["LGQ","LHQ"],["DCQ","DDQ"],["IVQ","IWQ"],["DDQ","DEQ"],["CXQ","CYQ"],["JFQ","JGQ"],["ADQ","AEQ"],["HMQ","HNQ"],["ASQ","ATQ"],["CYQ","CZQ"],["ALQ","AMQ"],["KYQ","KZQ"],["CIQ","CJQ"],["LHQ","LIQ"],["DTQ","DUQ"],["IBQ","ICQ"],["HQQ","HRQ"],["KIQ","KJQ"],["CLQ","CMQ"],["AXQ","AYQ"],["HUQ","HVQ"],["HRQ","HSQ"],["HAQ","HBQ"],["DNQ","DOQ"],["IRQ","ISQ"],["BQQ","BRQ"],["KTQ","KUQ"],["DMQ","DNQ"],["HGQ","HHQ"],["EYQ","EZQ"],["IUQ","IVQ"],["EPQ","EQQ"],["KDQ","KEQ"],["JOQ","JPQ"],["ISQ","ITQ"],["ICQ","IDQ"],["DGQ","DHQ"],["GBQ","GCQ"],["AHQ","AIQ"],["LIQ","LJQ"],["ABQ","ACQ"],["IQQ","IRQ"],["CDQ","CEQ"],["CCQ","CDQ"],["DRQ","DSQ"],["KJQ","KKQ"],["FFQ","FGQ"],["FMQ","FNQ"],["KVQ","KWQ"],["BMQ","BNQ"],["LBQ","LCQ"],["KOQ","KPQ"],["CWQ","CXQ"],["KZQ","LAQ"],["IDQ","IEQ"],["BNQ","BOQ"],["BGQ","BHQ"],["GGQ","GHQ"],["DHQ","DIQ"],["DYQ","DZQ"],["JUQ","JVQ"],["KWQ","KXQ"],["HJQ","HKQ"],["EBQ","ECQ"],["HPQ","HQQ"],["DAQ","DBQ"],["KLQ","KMQ"],["DUQ","DVQ"],["HIQ","HJQ"],["AJQ","AKQ"],["GRQ","GSQ"],["IHQ","IIQ"],["JIQ","JJQ"],["FUQ","FVQ"],["GAQ","GBQ"],["AMQ","ANQ"],["BPQ","BQQ"],["DEQ","DFQ"],["EHQ","EIQ"],["CFQ","CGQ"],["HZQ","IAQ"],["EAQ","EBQ"],["JGQ","JHQ"],["IYQ","IZQ"],["LAQ","LBQ"],["GYQ","GZQ"],["JCQ","JDQ"],["EEQ","EFQ"],["DWQ","DXQ"],["KQQ","KRQ"],["BCQ","BDQ"],["KMQ","KNQ"],["HDQ","HEQ"],["LEQ","LFQ"],["JHQ","JIQ"],["AFQ","AGQ"],["KGQ","KHQ"],["FRQ","FSQ"],["IFQ","IGQ"],["IZQ","JAQ"],["ILQ","IMQ"],["KHQ","KIQ"],["LCQ","LDQ"],["DKQ","DLQ"],["FWQ","FXQ"],["EOQ","EPQ"],["JAQ","JBQ"],["FTQ","FUQ"],["DOQ","DPQ"],["DPQ","DQQ"],["FXQ","FYQ"],["CPQ","CQQ"],["BBQ","BCQ"],["IGQ","IHQ"],["FAQ","FBQ"],["BUQ","BVQ"],["IAQ","IBQ"],["HHQ","HIQ"],["INQ","IOQ"],["ETQ","EUQ"],["FZQ","GAQ"],["GCQ","GDQ"],["DJQ","DKQ"],["FSQ","FTQ"],["BZQ","CAQ"],["FEQ","FFQ"],["GNQ","GOQ"],["FIQ","FJQ"],["FJQ","FKQ"],["KNQ","KOQ"],["GDQ","GEQ"],["BIQ","BJQ"],["GUQ","GVQ"],["GWQ","GXQ"],["LJQ","LKQ"],["KPQ","KQQ"],["CQQ","CRQ"],["HEQ","HFQ"],["GFQ","GGQ"],["DVQ","DWQ"],["ESQ","ETQ"],["GMQ","GNQ"],["ITQ","IUQ"],["KSQ","KTQ"],["BDQ","BEQ"],["KKQ","KLQ"],["LDQ","LEQ"],["GLQ","GMQ"],["BYQ","BZQ"],["EWQ","EXQ"],["GJQ","GKQ"],["KRQ","KSQ"],["COQ","CPQ"],["CKQ","CLQ"],["BEQ","BFQ"],["GSQ","GTQ"],["LMQ","LNQ"],["LKQ","LLQ"],["JBQ","JCQ"],["EGQ","EHQ"]]],["JFK","AAQ","ABQ","ACQ","ADQ","AEQ","AFQ","AGQ","AHQ","AIQ","AJQ","AKQ","ALQ","AMQ","ANQ","AOQ","APQ","AQQ","ARQ","ASQ","ATQ","AUQ","AVQ","AWQ","AXQ","AYQ","AZQ","BAQ","BBQ","BCQ","BDQ","BEQ","BFQ","BGQ","BHQ","BIQ","BJQ","BKQ","BLQ","BMQ","BNQ","BOQ","BPQ","BQQ","BRQ","BSQ","BTQ","BUQ","BVQ","BWQ","BXQ","BYQ","BZQ","CAQ","CBQ","CCQ","CDQ","CEQ","CFQ","CGQ","CHQ","CIQ","CJQ","CKQ","CLQ","CMQ","CNQ","COQ","CPQ","CQQ","CRQ","CSQ","CTQ","CUQ","CVQ","CWQ","CXQ","CYQ","CZQ","DAQ","DBQ","DCQ","DDQ","DEQ","DFQ","DGQ","DHQ","DIQ","DJQ","DKQ","DLQ","DMQ","DNQ","DOQ","DPQ","DQQ","DRQ","DSQ","DTQ","DUQ","DVQ","DWQ","DXQ","DYQ","DZQ","EAQ","EBQ","ECQ","EDQ","EEQ","EFQ","EGQ","EHQ","EIQ","EJQ","EKQ","ELQ","EMQ","ENQ","EOQ","EPQ","EQQ","ERQ","ESQ","ETQ","EUQ","EVQ","EWQ","EXQ","EYQ","EZQ","FAQ","FBQ","FCQ","FDQ","FEQ","FFQ","FGQ","FHQ","FIQ","FJQ","FKQ","FLQ","FMQ","FNQ","FOQ","FPQ","FQQ","FRQ","FSQ","FTQ","FUQ","FVQ","FWQ","FXQ","FYQ","FZQ","GAQ","GBQ","GCQ","GDQ","GEQ","GFQ","GGQ","GHQ","GIQ","GJQ","GKQ","GLQ","GMQ","GNQ","GOQ","GPQ","GQQ","GRQ","GSQ","GTQ","GUQ","GVQ","GWQ","GXQ","GYQ","GZQ","HAQ","HBQ","HCQ","HDQ","HEQ","HFQ","HGQ","HHQ","HIQ","HJQ","HKQ","HLQ","HMQ","HNQ","HOQ","HPQ","HQQ","HRQ","HSQ","HTQ","HUQ","HVQ","HWQ","HXQ","HYQ","HZQ","IAQ","IBQ","ICQ","IDQ","IEQ","IFQ","IGQ","IHQ","IIQ","IJQ","IKQ","ILQ","IMQ","INQ","IOQ","IPQ","IQQ","IRQ","ISQ","ITQ","IUQ","IVQ","IWQ","IXQ","IYQ","IZQ","JAQ","JBQ","JCQ","JDQ","JEQ","JFQ","JGQ","JHQ","JIQ","JJQ","JKQ","JLQ","JMQ","JNQ","JOQ","JPQ","JQQ","JRQ","JSQ","JTQ","JUQ","JVQ","JWQ","JXQ","JYQ","JZQ","KAQ","KBQ","KCQ","KDQ","KEQ","KFQ","KGQ","KHQ","KIQ","KJQ","KKQ","KLQ","KMQ","KNQ","KOQ","KPQ","KQQ","KRQ","KSQ","KTQ","KUQ","KVQ","KWQ","KXQ","KYQ","KZQ","LAQ","LBQ","LCQ","LDQ","LEQ","LFQ","LGQ","LHQ","LIQ","LJQ","LKQ","LLQ","LMQ","LNQ"]]
        ] },
      solution: {
        approach: `<p>Hierholzer with min-heaps. Popping a dead-end airport first means it lands at the end of the itinerary, which is exactly where a dead end must go.</p>`,
        code: `class Solution {
    public List<String> findItinerary(List<List<String>> tickets) {
        Map<String, PriorityQueue<String>> g = new HashMap<>();
        for (List<String> t : tickets) g.computeIfAbsent(t.get(0), k -> new PriorityQueue<>()).add(t.get(1));
        LinkedList<String> route = new LinkedList<>();
        Deque<String> stack = new ArrayDeque<>();
        stack.push("JFK");
        while (!stack.isEmpty()) {
            PriorityQueue<String> pq = g.get(stack.peek());
            if (pq != null && !pq.isEmpty()) {
                stack.push(pq.poll());            // use the smallest unused ticket
            } else {
                route.addFirst(stack.pop());      // stuck: this airport is final here
            }
        }
        return route;
    }
}`,
      alt: [{ lang: 'python', code: `import heapq
from collections import defaultdict


def find_itinerary(tickets):
    graph = defaultdict(list)                 # airport -> min-heap of destinations
    for src, dst in tickets:
        heapq.heappush(graph[src], dst)
    route = []
    stack = ['JFK']
    while stack:
        heap = graph[stack[-1]]
        if heap:
            stack.append(heapq.heappop(heap))     # use the smallest unused ticket
        else:
            route.append(stack.pop())             # stuck: this airport is final here
    return route[::-1]
` }, { lang: 'js', code: `function findItinerary(tickets) {
  const graph = new Map();                       // airport -> destinations, largest first
  for (const [from, to] of tickets) {
    if (!graph.has(from)) graph.set(from, []);
    graph.get(from).push(to);
  }
  for (const list of graph.values()) list.sort().reverse();   // so pop() gives the smallest
  const route = [], stack = ['JFK'];
  while (stack.length) {
    const list = graph.get(stack[stack.length - 1]);
    if (list && list.length) stack.push(list.pop());   // use the smallest unused ticket
    else route.push(stack.pop());                      // stuck: this airport is final here
  }
  return route.reverse();
}
` }, { lang: 'cpp', code: `class Solution {
public:
    vector<string> findItinerary(vector<vector<string>>& tickets) {
        unordered_map<string, priority_queue<string, vector<string>, greater<string>>> g;
        for (auto& t : tickets) g[t[0]].push(t[1]);
        vector<string> route, stack{"JFK"};
        while (!stack.empty()) {
            auto& pq = g[stack.back()];
            if (!pq.empty()) {
                string next = pq.top();           // use the smallest unused ticket
                pq.pop();
                stack.push_back(next);
            } else {
                route.push_back(stack.back());    // stuck: this airport is final here
                stack.pop_back();
            }
        }
        reverse(route.begin(), route.end());
        return route;
    }
};
` }],
        dry: {
          head: ['stack (bottom → top)', 'action', 'route'],
          rows: [
            ['JFK', 'poll KUL (smallest)', '[]'],
            ['JFK KUL', 'KUL has no tickets → pop', '[KUL]'],
            ['JFK', 'poll NRT', '[KUL]'],
            ['JFK NRT', 'poll JFK', '[KUL]'],
            ['JFK NRT JFK', 'JFK empty → pop', '[JFK, KUL]'],
            ['JFK NRT', 'pop NRT, then pop JFK', H.c('g', '[JFK, NRT, JFK, KUL]')]
          ]
        },
        complexity: `<p>Time <b>O(E log E)</b> because of the heaps (E = number of tickets); space <b>O(E)</b>.</p>`,
        followUps: ['What if no valid itinerary is guaranteed — how do you detect it?', 'Return the number of distinct valid itineraries (hint: this one is hard — it is counting Euler paths, solvable for circuits with the BEST theorem).', 'Undirected version: tickets can be used in either direction.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 5 — LCA with Binary Lifting
  // =====================================================================
  topics.push({
    title: 'Lowest Common Ancestor (LCA) with Binary Lifting',
    analogy: `<p>Two cousins want to find their <b>closest shared grandparent</b> in a giant family tree. The slow way: each climbs one generation at a time. The smart way: everyone keeps a little card listing their <b>parent</b>, their <b>grandparent</b> (2 up), their <b>great-great-grandparent</b> (4 up), 8 up, 16 up…</p>
      <p>With that card you can climb 13 generations in just 3 jumps (8 + 4 + 1), like an <b>express elevator</b> that only stops at floors 1, 2, 4, 8, 16. That card is the binary-lifting table.</p>`,
    explain: `<p>In a rooted tree, the <b>Lowest Common Ancestor</b> <code>LCA(u, v)</code> is the deepest node that is an ancestor of both u and v (a node counts as its own ancestor). Once you have LCA, lots of questions become one-liners:</p>
      ${H.table(['question', 'formula'], [
        ['number of edges between u and v', '<code>depth[u] + depth[v] − 2·depth[LCA]</code>'],
        ['weighted distance', '<code>dist[u] + dist[v] − 2·dist[LCA]</code> (dist = distance from root)'],
        ['is u an ancestor of v?', '<code>LCA(u, v) == u</code>'],
        ['k-th node on the path u → v', 'climb from u if k ≤ depth[u] − depth[LCA], else climb from v']
      ])}
      <p><b>Slow way:</b> lift the deeper node until both have the same depth, then lift both one step at a time until they meet. Fine for one query, but a long chain makes each query <b>O(N)</b>; with 10<sup>5</sup> queries that is 10<sup>10</sup>.</p>
      <p><b>Binary lifting:</b> precompute <code>up[k][v]</code> = the ancestor <b>2<sup>k</sup></b> steps above v.</p>
      <ul>
        <li><code>up[0][v]</code> = parent of v (the root points to itself).</li>
        <li><code>up[k][v] = up[k−1][ up[k−1][v] ]</code> — "2<sup>k</sup> steps = 2<sup>k−1</sup> steps, then 2<sup>k−1</sup> more". ${H.c('b', 'This doubling is the whole trick.')}</li>
      </ul>
      <p><b>Query LCA(u, v) in 3 moves:</b></p>
      <ol>
        <li>Make u the deeper one. Lift it by <code>d = depth[u] − depth[v]</code> using the binary digits of d. Example: d = 13 = ${H.c('y', '1101')}<sub>2</sub> → jumps of 8, 4, 1.</li>
        <li>If now <code>u == v</code>, v was an ancestor of u — done.</li>
        <li>For k from big to small: if <code>up[k][u] != up[k][v]</code>, jump both. (If they are <b>equal</b>, that jump lands on a common ancestor — maybe too high — so skip it.) At the end u and v are two different children of the LCA → answer <code>up[0][u]</code>.</li>
      </ol>
      ${H.bits(13, 4, { label: 'climb 13 levels: bits 3, 2, 0 set → jumps of 8, 4, 1', hl: { 3: 'y', 2: 'y', 0: 'y' } })}
      <p><b>Cost:</b> building takes <b>O(N log N)</b> time and memory; each query is <b>O(log N)</b>. For N = 10<sup>5</sup>, log N ≈ 17 — each query is about 34 table lookups.</p>`,
    clues: [
      '"<b>Lowest / nearest common ancestor</b>", "common manager", "closest shared folder" → LCA.',
      '"<b>Distance between two nodes</b> in a tree" with <b>many queries</b> (Q up to 10<sup>5</sup>) → depth/dist + LCA.',
      '"<b>k-th ancestor</b>" or "jump k steps up" (LC 1483) → binary lifting directly.',
      '"Maximum / minimum edge weight on the path between u and v" → binary lifting that also stores the max along each 2<sup>k</sup> jump.',
      '"Where are you after <b>k = 10<sup>18</sup> moves</b>" in a graph where every node has exactly one next node (functional graph) → binary lifting with LOG = 60.',
      '"Is u an ancestor of v?" for many pairs → LCA, or simpler Euler-tour entry/exit times.'
    ],
    code: [{ lang: 'java', code: `
      class BinaryLifting {
          final int LOG;
          final int[][] up;        // up[k][v] = 2^k-th ancestor of v (the root's ancestor is the root itself)
          final int[] depth;

          BinaryLifting(int n, List<List<Integer>> children, int root) {
              int lg = 1;
              while ((1 << lg) < n) lg++;              // 2^LOG >= n: any depth difference fits in LOG bits
              LOG = lg;
              up = new int[LOG][n];
              depth = new int[n];
              Deque<Integer> q = new ArrayDeque<>();   // BFS: parents are processed before children
              q.add(root);
              up[0][root] = root;
              while (!q.isEmpty()) {
                  int v = q.poll();
                  for (int c : children.get(v)) { depth[c] = depth[v] + 1; up[0][c] = v; q.add(c); }
              }
              for (int k = 1; k < LOG; k++)
                  for (int v = 0; v < n; v++)
                      up[k][v] = up[k - 1][up[k - 1][v]];   // 2^k steps = 2^(k-1) steps twice
          }

          int kthAncestor(int v, int k) {               // -1 if the tree is not that tall
              if (k > depth[v]) return -1;
              for (int b = 0; b < LOG; b++) if ((k >> b & 1) == 1) v = up[b][v];
              return v;
          }

          int lca(int u, int v) {
              if (depth[u] < depth[v]) { int t = u; u = v; v = t; }
              u = kthAncestor(u, depth[u] - depth[v]);   // 1) same depth
              if (u == v) return u;                      // 2) v was an ancestor of u
              for (int k = LOG - 1; k >= 0; k--)         // 3) biggest jumps that keep them apart
                  if (up[k][u] != up[k][v]) { u = up[k][u]; v = up[k][v]; }
              return up[0][u];                           // they are now children of the LCA
          }

          int distance(int u, int v) { return depth[u] + depth[v] - 2 * depth[lca(u, v)]; }
      }`, alt: [{ lang: 'python', code: `from collections import deque


class BinaryLifting:
    def __init__(self, n, children, root):
        self.log = 1
        while (1 << self.log) < n:
            self.log += 1                       # 2^LOG >= n: any depth difference fits in LOG bits
        self.depth = [0] * n
        up0 = [0] * n                           # up[k][v] = 2^k-th ancestor of v (the root's ancestor is the root)
        up0[root] = root
        queue = deque([root])                   # BFS: parents are processed before children
        while queue:
            v = queue.popleft()
            for c in children[v]:
                self.depth[c] = self.depth[v] + 1
                up0[c] = v
                queue.append(c)
        self.up = [up0]
        for k in range(1, self.log):
            prev = self.up[k - 1]
            self.up.append([prev[prev[v]] for v in range(n)])   # 2^k steps = 2^(k-1) steps twice

    def kth_ancestor(self, v, k):               # -1 if the tree is not that tall
        if k > self.depth[v]:
            return -1
        for b in range(self.log):
            if k >> b & 1:
                v = self.up[b][v]
        return v

    def lca(self, u, v):
        if self.depth[u] < self.depth[v]:
            u, v = v, u
        u = self.kth_ancestor(u, self.depth[u] - self.depth[v])    # 1) same depth
        if u == v:                                                  # 2) v was an ancestor of u
            return u
        for k in range(self.log - 1, -1, -1):                       # 3) biggest jumps that keep them apart
            if self.up[k][u] != self.up[k][v]:
                u, v = self.up[k][u], self.up[k][v]
        return self.up[0][u]                                        # they are now children of the LCA

    def distance(self, u, v):
        return self.depth[u] + self.depth[v] - 2 * self.depth[self.lca(u, v)]
` }, { lang: 'js', code: `class BinaryLifting {
  constructor(n, children, root) {
    let log = 1;
    while ((1 << log) < n) log++;               // 2^LOG >= n: any depth difference fits in LOG bits
    this.LOG = log;
    this.depth = new Array(n).fill(0);
    const up0 = new Array(n).fill(0);           // up[k][v] = 2^k-th ancestor of v (the root's ancestor is the root)
    up0[root] = root;
    const queue = [root];                       // BFS: parents are processed before children
    for (let h = 0; h < queue.length; h++) {
      const v = queue[h];
      for (const c of children[v]) { this.depth[c] = this.depth[v] + 1; up0[c] = v; queue.push(c); }
    }
    this.up = [up0];
    for (let k = 1; k < log; k++) {
      const prev = this.up[k - 1];
      this.up.push(prev.map((mid) => prev[mid]));            // 2^k steps = 2^(k-1) steps twice
    }
  }

  kthAncestor(v, k) {                           // -1 if the tree is not that tall
    if (k > this.depth[v]) return -1;
    for (let b = 0; b < this.LOG; b++) if ((k >> b) & 1) v = this.up[b][v];
    return v;
  }

  lca(u, v) {
    if (this.depth[u] < this.depth[v]) [u, v] = [v, u];
    u = this.kthAncestor(u, this.depth[u] - this.depth[v]);  // 1) same depth
    if (u === v) return u;                                    // 2) v was an ancestor of u
    for (let k = this.LOG - 1; k >= 0; k--)                   // 3) biggest jumps that keep them apart
      if (this.up[k][u] !== this.up[k][v]) { u = this.up[k][u]; v = this.up[k][v]; }
    return this.up[0][u];                                     // they are now children of the LCA
  }

  distance(u, v) { return this.depth[u] + this.depth[v] - 2 * this.depth[this.lca(u, v)]; }
}
` }, { lang: 'cpp', code: `class BinaryLifting {
    int LOG;
    vector<vector<int>> up;     // up[k][v] = 2^k-th ancestor of v (the root's ancestor is the root itself)
    vector<int> depth;

public:
    BinaryLifting(int n, const vector<vector<int>>& children, int root) : depth(n, 0) {
        LOG = 1;
        while ((1 << LOG) < n) LOG++;           // 2^LOG >= n: any depth difference fits in LOG bits
        up.assign(LOG, vector<int>(n, 0));
        queue<int> q;                           // BFS: parents are processed before children
        q.push(root);
        up[0][root] = root;
        while (!q.empty()) {
            int v = q.front();
            q.pop();
            for (int c : children[v]) { depth[c] = depth[v] + 1; up[0][c] = v; q.push(c); }
        }
        for (int k = 1; k < LOG; k++)
            for (int v = 0; v < n; v++)
                up[k][v] = up[k - 1][up[k - 1][v]];   // 2^k steps = 2^(k-1) steps twice
    }

    int kthAncestor(int v, int k) const {       // -1 if the tree is not that tall
        if (k > depth[v]) return -1;
        for (int b = 0; b < LOG; b++) if (k >> b & 1) v = up[b][v];
        return v;
    }

    int lca(int u, int v) const {
        if (depth[u] < depth[v]) swap(u, v);
        u = kthAncestor(u, depth[u] - depth[v]);  // 1) same depth
        if (u == v) return u;                     // 2) v was an ancestor of u
        for (int k = LOG - 1; k >= 0; k--)        // 3) biggest jumps that keep them apart
            if (up[k][u] != up[k][v]) { u = up[k][u]; v = up[k][v]; }
        return up[0][u];                          // they are now children of the LCA
    }

    int distance(int u, int v) const { return depth[u] + depth[v] - 2 * depth[lca(u, v)]; }
};
` }] }, { lang: 'java', code: `
      class LcaEulerTour {
          // O(N log N) build, O(1) query: LCA = shallowest node between the first visits of u and v.
          final int[] first, euler, depthAt, lg;
          final int[][] sparse;      // sparse[k][i] = position of the min depth in tour[i .. i + 2^k)

          LcaEulerTour(int n, List<List<Integer>> children, int root) {
              first = new int[n];
              euler = new int[2 * n - 1];
              depthAt = new int[2 * n - 1];
              int[] depth = new int[n], it = new int[n];
              int len = 0;
              Deque<Integer> st = new ArrayDeque<>();
              st.push(root);
              first[root] = 0;
              euler[len] = root;
              depthAt[len++] = 0;
              while (!st.isEmpty()) {                      // write v on entry and after each child
                  int v = st.peek();
                  if (it[v] < children.get(v).size()) {
                      int c = children.get(v).get(it[v]++);
                      depth[c] = depth[v] + 1;
                      first[c] = len;
                      euler[len] = c;
                      depthAt[len++] = depth[c];
                      st.push(c);
                  } else {
                      st.pop();
                      if (!st.isEmpty()) { int p = st.peek(); euler[len] = p; depthAt[len++] = depth[p]; }
                  }
              }
              lg = new int[len + 1];
              for (int i = 2; i <= len; i++) lg[i] = lg[i / 2] + 1;
              sparse = new int[lg[len] + 1][len];
              for (int i = 0; i < len; i++) sparse[0][i] = i;
              for (int k = 1; k <= lg[len]; k++)
                  for (int i = 0; i + (1 << k) <= len; i++) {
                      int a = sparse[k - 1][i], b = sparse[k - 1][i + (1 << (k - 1))];
                      sparse[k][i] = depthAt[a] <= depthAt[b] ? a : b;
                  }
          }

          int lca(int u, int v) {
              int l = Math.min(first[u], first[v]), r = Math.max(first[u], first[v]);
              int k = lg[r - l + 1];
              int a = sparse[k][l], b = sparse[k][r - (1 << k) + 1];   // two overlapping blocks
              return euler[depthAt[a] <= depthAt[b] ? a : b];
          }
      }`, alt: [{ lang: 'python', code: `class LcaEulerTour:
    # O(N log N) build, O(1) query: LCA = shallowest node between the first visits of u and v.
    def __init__(self, n, children, root):
        self.first = [0] * n
        self.euler = [root]
        self.depth_at = [0]
        depth = [0] * n
        it = [0] * n
        stack = [root]
        while stack:                            # write v on entry and after each child
            v = stack[-1]
            if it[v] < len(children[v]):
                c = children[v][it[v]]
                it[v] += 1
                depth[c] = depth[v] + 1
                self.first[c] = len(self.euler)
                self.euler.append(c)
                self.depth_at.append(depth[c])
                stack.append(c)
            else:
                stack.pop()
                if stack:
                    p = stack[-1]
                    self.euler.append(p)
                    self.depth_at.append(depth[p])
        length = len(self.euler)
        self.lg = [0] * (length + 1)
        for i in range(2, length + 1):
            self.lg[i] = self.lg[i // 2] + 1
        # sparse[k][i] = position of the min depth in tour[i .. i + 2^k)
        self.sparse = [list(range(length))]
        k = 1
        while (1 << k) <= length:
            prev, half = self.sparse[-1], 1 << (k - 1)
            row = []
            for i in range(length - (1 << k) + 1):
                a, b = prev[i], prev[i + half]
                row.append(a if self.depth_at[a] <= self.depth_at[b] else b)
            self.sparse.append(row)
            k += 1

    def lca(self, u, v):
        l, r = sorted((self.first[u], self.first[v]))
        k = self.lg[r - l + 1]
        a = self.sparse[k][l]                    # two overlapping blocks
        b = self.sparse[k][r - (1 << k) + 1]
        return self.euler[a if self.depth_at[a] <= self.depth_at[b] else b]
` }, { lang: 'js', code: `class LcaEulerTour {
  // O(N log N) build, O(1) query: LCA = shallowest node between the first visits of u and v.
  constructor(n, children, root) {
    this.first = new Array(n).fill(0);
    this.euler = [root];
    this.depthAt = [0];
    const depth = new Array(n).fill(0), it = new Array(n).fill(0);
    const stack = [root];
    while (stack.length) {                      // write v on entry and after each child
      const v = stack[stack.length - 1];
      if (it[v] < children[v].length) {
        const c = children[v][it[v]++];
        depth[c] = depth[v] + 1;
        this.first[c] = this.euler.length;
        this.euler.push(c);
        this.depthAt.push(depth[c]);
        stack.push(c);
      } else {
        stack.pop();
        if (stack.length) {
          const p = stack[stack.length - 1];
          this.euler.push(p);
          this.depthAt.push(depth[p]);
        }
      }
    }
    const len = this.euler.length;
    this.lg = new Array(len + 1).fill(0);
    for (let i = 2; i <= len; i++) this.lg[i] = this.lg[i >> 1] + 1;
    // sparse[k][i] = position of the min depth in tour[i .. i + 2^k)
    this.sparse = [Array.from({ length: len }, (_, i) => i)];
    for (let k = 1; (1 << k) <= len; k++) {
      const prev = this.sparse[k - 1], half = 1 << (k - 1), row = [];
      for (let i = 0; i + (1 << k) <= len; i++) {
        const a = prev[i], b = prev[i + half];
        row.push(this.depthAt[a] <= this.depthAt[b] ? a : b);
      }
      this.sparse.push(row);
    }
  }

  lca(u, v) {
    const l = Math.min(this.first[u], this.first[v]), r = Math.max(this.first[u], this.first[v]);
    const k = this.lg[r - l + 1];
    const a = this.sparse[k][l], b = this.sparse[k][r - (1 << k) + 1];   // two overlapping blocks
    return this.euler[this.depthAt[a] <= this.depthAt[b] ? a : b];
  }
}
` }, { lang: 'cpp', code: `class LcaEulerTour {
    // O(N log N) build, O(1) query: LCA = shallowest node between the first visits of u and v.
    vector<int> first, euler, depthAt, lg;
    vector<vector<int>> sparse;     // sparse[k][i] = position of the min depth in tour[i .. i + 2^k)

public:
    LcaEulerTour(int n, const vector<vector<int>>& children, int root) : first(n, 0) {
        vector<int> depth(n, 0), it(n, 0), stack{root};
        euler.push_back(root);
        depthAt.push_back(0);
        while (!stack.empty()) {                // write v on entry and after each child
            int v = stack.back();
            if (it[v] < (int)children[v].size()) {
                int c = children[v][it[v]++];
                depth[c] = depth[v] + 1;
                first[c] = euler.size();
                euler.push_back(c);
                depthAt.push_back(depth[c]);
                stack.push_back(c);
            } else {
                stack.pop_back();
                if (!stack.empty()) { int p = stack.back(); euler.push_back(p); depthAt.push_back(depth[p]); }
            }
        }
        int len = euler.size();
        lg.assign(len + 1, 0);
        for (int i = 2; i <= len; i++) lg[i] = lg[i / 2] + 1;
        sparse.assign(lg[len] + 1, vector<int>(len, 0));
        for (int i = 0; i < len; i++) sparse[0][i] = i;
        for (int k = 1; k <= lg[len]; k++)
            for (int i = 0; i + (1 << k) <= len; i++) {
                int a = sparse[k - 1][i], b = sparse[k - 1][i + (1 << (k - 1))];
                sparse[k][i] = depthAt[a] <= depthAt[b] ? a : b;
            }
    }

    int lca(int u, int v) const {
        int l = min(first[u], first[v]), r = max(first[u], first[v]);
        int k = lg[r - l + 1];
        int a = sparse[k][l], b = sparse[k][r - (1 << k) + 1];   // two overlapping blocks
        return euler[depthAt[a] <= depthAt[b] ? a : b];
    }
};
` }] }],
    codeTitle: ['Binary lifting: k-th ancestor, LCA, distance', 'Alternative: Euler tour + sparse table, O(1) per query'],
    viz: {
      title: 'Binary lifting: build the 2^k jump table, then answer LCA(u, v) with big jumps',
      input: '-1 0 0 1 1 2 2 3 3 4 6 7 | 11 9',
      inputLabel: 'parent of node 0, 1, 2, … (root = -1)  |  query u v',
      gen: function (input) {
        var sp = String(input === undefined || input === null ? '' : input).split('|');
        if (sp.length !== 2) throw new Error('Format: "parents | u v", e.g. "-1 0 0 1 1 | 3 2"');
        var par = sp[0].trim().split(/[\s,]+/).map(Number), qq = sp[1].trim().split(/[\s,]+/).map(Number);
        var n = par.length, i, k;
        if (n < 2 || n > 16) throw new Error('Use 2 to 16 nodes.');
        if (qq.length !== 2 || qq.some(function (x) { return isNaN(x) || x < 0 || x >= n || Math.floor(x) !== x; })) throw new Error('Query must be two node numbers between 0 and ' + (n - 1) + '.');
        var root = -1, ch = [];
        for (i = 0; i < n; i++) ch.push([]);
        for (i = 0; i < n; i++) {
          if (isNaN(par[i]) || Math.floor(par[i]) !== par[i] || par[i] < -1 || par[i] >= n) throw new Error('Parent values must be -1 (root) or a node number 0..' + (n - 1) + '.');
          if (par[i] === -1) { if (root !== -1) throw new Error('Exactly one node may have parent -1.'); root = i; } else ch[par[i]].push(i);
        }
        if (root === -1) throw new Error('One node must be the root (parent -1).');
        var depth = [], order = [root], seen = 1;
        depth[root] = 0;
        for (i = 0; i < order.length; i++) ch[order[i]].forEach(function (c) { depth[c] = depth[order[i]] + 1; order.push(c); seen++; });
        if (seen !== n) throw new Error('The parent list has a cycle — every node must lead up to the root.');
        if (Math.max.apply(null, depth) > 5) throw new Error('Keep the tree depth at most 5 so it fits on screen.');
        var xs = [], leaf = 0;
        (function place(v) { if (!ch[v].length) xs[v] = leaf++; else { ch[v].forEach(place); xs[v] = (xs[ch[v][0]] + xs[ch[v][ch[v].length - 1]]) / 2; } })(root);
        var nodes = [];
        for (i = 0; i < n; i++) nodes.push({ id: String(i), label: String(i), x: Math.round((6 + 88 * xs[i] / Math.max(1, leaf - 1)) * 10) / 10, y: 7 + depth[i] * 12.5 });
        var edges = [];
        for (i = 0; i < n; i++) if (i !== root) edges.push([String(par[i]), String(i)]);
        var LOG = 1;
        while ((1 << LOG) < n) LOG++;
        var up = [], tags = {};
        for (i = 0; i < n; i++) tags[i] = 'd' + depth[i];
        function G(hl, ehl, label) { return { type: 'graph', label: label || 'tree (tag = depth)', directed: false, height: 74, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: copy(tags) }; }
        function grid(rowsDone, hl) {
          var rows = [];
          for (var kk = 0; kk < LOG; kk++) { var r = []; for (var v = 0; v < n; v++) r.push(kk < rowsDone ? up[kk][v] : '·'); rows.push(r); }
          return { type: 'grid', label: 'up[k][v] = ancestor 2^k levels above v', rowHead: up.length ? Array.apply(null, Array(LOG)).map(function (_, kk) { return 'k=' + kk + ' (' + (1 << kk) + ' up)'; }) : [], colHead: nodes.map(function (nd) { return nd.id; }), rows: rows, hl: hl || {} };
        }
        var frames = [];
        up.push(par.map(function (p, v) { return p === -1 ? v : p; }));
        frames.push({ narr: 'The tree, root <b>' + root + '</b>, each node tagged with its depth. <b>Row k = 0</b> of the table is simply each node\'s parent (the root points to itself so jumps never fall off).', parts: [G(), grid(1, (function () { var o = {}; for (var v = 0; v < n; v++) o['0,' + v] = 'ok'; return o; })())] });
        var deep = order[order.length - 1];
        for (k = 1; k < LOG; k++) {
          var row = [];
          for (var v = 0; v < n; v++) row.push(up[k - 1][up[k - 1][v]]);
          up.push(row);
          var mid = up[k - 1][deep], hl = {}, ghl = {};
          hl[String(deep)] = 'cur'; hl[String(mid)] = 'win'; hl[String(up[k][deep])] = 'ok';
          ghl[(k - 1) + ',' + deep] = 'win'; ghl[(k - 1) + ',' + mid] = 'win'; ghl[k + ',' + deep] = 'ok';
          frames.push({ narr: '<b>Row k = ' + k + '</b>: up[' + k + '][v] = up[' + (k - 1) + '][ up[' + (k - 1) + '][v] ] — a jump of ' + (1 << k) + ' is two jumps of ' + (1 << (k - 1)) + '. Example for node ' + deep + ': ' + deep + ' → ' + mid + ' → <b>' + up[k][deep] + '</b>.', parts: [G(hl), grid(k + 1, ghl)] });
        }
        var u = qq[0], w = qq[1];
        if (depth[u] < depth[w]) { var t = u; u = w; w = t; }
        var diff = depth[u] - depth[w];
        frames.push({ narr: '<b>Query LCA(' + qq[0] + ', ' + qq[1] + ')</b>. Deeper node is ' + u + ' (depth ' + depth[u] + '), other is ' + w + ' (depth ' + depth[w] + '). Difference = <b>' + diff + '</b>; we climb it using its binary digits.', parts: [G(one(String(u), 'cur'), {}, 'query'), { type: 'bits', label: 'depth difference', value: diff, width: LOG, showDec: true }, { type: 'vars', vals: { u: u, v: w, diff: diff } }] });
        for (k = 0; k < LOG; k++) {
          if ((diff >> k) & 1) {
            var from = u; u = up[k][u];
            var h1 = {}; h1[String(from)] = 'done'; h1[String(u)] = 'cur'; h1[String(w)] = 'win';
            frames.push({ narr: 'Bit ' + k + ' of ' + diff + ' is 1 → jump ' + (1 << k) + ' up: ' + from + ' → <b>' + u + '</b> (up[' + k + '][' + from + ']).', parts: [G(h1, {}, 'equalising depths'), { type: 'bits', label: 'depth difference', value: diff, width: LOG, hl: one(k, 'cur'), showDec: true }, grid(LOG, one(k + ',' + from, 'cur'))] });
          }
        }
        if (u === w) {
          frames.push({ narr: 'After lifting, both pointers sit on <b>' + u + '</b> → the shallower node was an ancestor of the deeper one. <span class="c-g">LCA = ' + u + '</span>.', parts: [G(one(String(u), 'sel'), {}, 'answer'), { type: 'vars', vals: { LCA: u } }] });
          frames.push({ narr: 'Distance in edges = depth[' + qq[0] + '] + depth[' + qq[1] + '] − 2·depth[LCA] = ' + (depth[qq[0]] + depth[qq[1]] - 2 * depth[u]) + '.', parts: [{ type: 'vars', vals: { LCA: u, distance: depth[qq[0]] + depth[qq[1]] - 2 * depth[u] } }] });
          return frames;
        }
        frames.push({ narr: 'Same depth now (' + u + ' and ' + w + '), still different nodes. Try jumps from the <b>largest k down</b>: jump both only if they land on <b>different</b> nodes.', parts: [G((function () { var o = {}; o[String(u)] = 'cur'; o[String(w)] = 'cur'; return o; })(), {}, 'both at the same depth'), { type: 'vars', vals: { u: u, v: w } }] });
        for (k = LOG - 1; k >= 0; k--) {
          var au = up[k][u], aw = up[k][w], h2 = {}, g2 = {};
          h2[String(u)] = 'cur'; h2[String(w)] = 'cur'; h2[String(au)] = au === aw ? 'bad' : 'ok'; h2[String(aw)] = au === aw ? 'bad' : 'ok';
          g2[k + ',' + u] = au === aw ? 'bad' : 'ok'; g2[k + ',' + w] = au === aw ? 'bad' : 'ok';
          if (au !== aw) {
            frames.push({ narr: 'k = ' + k + ': up[' + k + '][' + u + '] = ' + au + ' ≠ up[' + k + '][' + w + '] = ' + aw + ' → still below the LCA, <b>jump both</b>.', parts: [G(h2, {}, 'jump both'), grid(LOG, g2), { type: 'vars', vals: { k: k, u: au, v: aw } }] });
            u = au; w = aw;
          } else {
            frames.push({ narr: 'k = ' + k + ': both land on <b>' + au + '</b> — a common ancestor, but maybe <i>above</i> the lowest one. <b>Do not jump</b>.', parts: [G(h2, {}, 'would overshoot'), grid(LOG, g2), { type: 'vars', vals: { k: k, u: u, v: w } }] });
          }
        }
        var ans = up[0][u], h3 = {};
        h3[String(u)] = 'win'; h3[String(w)] = 'win'; h3[String(ans)] = 'sel';
        frames.push({ narr: 'Now ' + u + ' and ' + w + ' are different children of the same parent. <span class="c-g">LCA = up[0][' + u + '] = ' + ans + '</span>. Distance in edges = ' + depth[qq[0]] + ' + ' + depth[qq[1]] + ' − 2·' + depth[ans] + ' = <b>' + (depth[qq[0]] + depth[qq[1]] - 2 * depth[ans]) + '</b>.', parts: [G(h3, {}, 'answer'), { type: 'vars', vals: { LCA: ans, distance: depth[qq[0]] + depth[qq[1]] - 2 * depth[ans] } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Building one column of the table by hand', html: `<p>Chain 0 ← 1 ← 2 ← 3 ← 4 ← 5 (0 is the root). For node 5:</p>${H.table(['k', 'jump size', 'up[k][5]', 'how'], [['0', '1', '4', 'parent'], ['1', '2', '3', 'up[0][up[0][5]] = up[0][4] = 3'], ['2', '4', '1', 'up[1][up[1][5]] = up[1][3] = 1']])}<p>Jumping 5 levels from node 5 = jump 4 (→ 1) then jump 1 (→ 0). Two lookups instead of five steps.</p>` },
      { title: 'One node is the ancestor of the other', html: `<p>LCA(5, 2) in the chain above: depth 5 vs 2, diff 3 = 011<sub>2</sub> → jump 1 (5 → 4), jump 2 (4 → 2). Now u == v == 2 → answer <b>2</b>. Forgetting the <code>if (u == v) return u;</code> check makes the final loop return the parent of 2 — ${H.c('r', 'a classic bug')}.</p>` },
      { title: 'Distance query', html: `<p>Tree with depths: LCA(11, 9) in the visualizer's default tree is 1. depth[11] = 4, depth[9] = 3, depth[1] = 1 → distance = 4 + 3 − 2·1 = <b>5</b> edges (11 → 7 → 3 → 1 → 4 → 9). ${H.c('g', 'Matches counting by hand.')}</p>` },
      { title: 'k-th ancestor (LC 1483) in O(log k)', html: `<p>k = 6 = 110<sub>2</sub>: apply up[1] then up[2]. Order of the jumps does not matter — 2 + 4 = 4 + 2. If k &gt; depth[v], return −1 instead of silently sticking at the root.</p>`, code: { lang: 'java', code: `int kth(int[][] up, int[] depth, int v, int k) {
    if (k > depth[v]) return -1;
    for (int b = 0; b < up.length; b++) if ((k >> b & 1) == 1) v = up[b][v];
    return v;
}`, alt: [{ lang: 'python', code: `def kth(up, depth, v, k):
    if k > depth[v]:
        return -1
    for b in range(len(up)):
        if k >> b & 1:
            v = up[b][v]
    return v
` }, { lang: 'js', code: `function kth(up, depth, v, k) {
  if (k > depth[v]) return -1;
  for (let b = 0; b < up.length; b++) if ((k >> b) & 1) v = up[b][v];
  return v;
}
` }, { lang: 'cpp', code: `int kth(const vector<vector<int>>& up, const vector<int>& depth, int v, int k) {
    if (k > depth[v]) return -1;
    for (int b = 0; b < (int)up.size(); b++) if (k >> b & 1) v = up[b][v];
    return v;
}
` }] } }
    ],
    deepDive: `<p><b>Why the "jump while different" loop is correct.</b> Let L = LCA. For every k, <code>up[k][u] == up[k][v]</code> exactly when 2<sup>k</sup> ≥ depth[u] − depth[L] (the jump reaches L or above). Going from large k to small k greedily builds the binary representation of <code>depth[u] − depth[L] − 1</code> — the largest climb that keeps them apart. After the loop both are exactly one step below L.</p>
      <p><b>Choosing an LCA method:</b></p>
      ${H.table(['method', 'build', 'query', 'notes'], [
        ['naive climbing', 'O(N)', 'O(depth)', 'fine for a few queries or balanced trees'],
        ['binary lifting', 'O(N log N)', 'O(log N)', 'also gives k-th ancestor and path aggregates (max edge)'],
        ['Euler tour + sparse table', 'O(N log N)', 'O(1)', 'fastest queries; tour has 2N − 1 entries'],
        ['Tarjan offline (DSU)', 'O((N + Q) α)', '—', 'all queries known in advance'],
        ['Heavy-Light Decomposition', 'O(N)', 'O(log N)', 'also supports path updates with a segment tree']
      ])}
      <p><b>Memory and cache:</b> for N = 10<sup>6</sup>, LOG = 20 → 20 million ints = 80 MB. Store <code>up[k][v]</code> (k-major) so building row k streams through row k−1 sequentially. For tight memory, "jump pointers" (skew-binary lifting, Myers 1983) keep just <b>two</b> pointers per node and still answer in O(log N).</p>
      <p><b>Binary lifting is a general tool, not only for trees.</b> Any "next" function f on N states can be lifted: <code>up[k][x] = f<sup>2<sup>k</sup></sup>(x)</code>. That answers "where am I after 10<sup>18</sup> steps?" in 60 lookups, and works with monoid data (sum, min, max) carried along each jump — e.g. "maximum edge on the path" stores <code>mx[k][v] = max(mx[k−1][v], mx[k−1][up[k−1][v]])</code>. It is also the idea behind "parallel binary search on the answer" style problems.</p>`,
    aiEra: `<p><b>What AI changes:</b> binary lifting code is short and AI writes it reliably. Where engineers still shine is <b>recognising</b> that a path, distance, or "k steps later" question on a tree or functional graph is secretly an LCA or lifting problem — often hidden behind business words (org charts, file systems, version-control histories: <code>git merge-base</code> is literally an LCA in the commit DAG).</p>
      <p><b>Use AI as a partner:</b> ask it to generate a brute-force LCA (climb step by step) and run both on 10<sup>4</sup> random trees, including a 10<sup>5</sup>-node chain to check you did not recurse. Ask it for the memory estimate of your table for your N.</p>
      <p><b>Where AI goes wrong:</b> off-by-one in LOG (using <code>log2(n)</code> truncated so a jump of exactly n−1 does not fit), forgetting the root's self-loop (index −1 crashes), skipping the <code>u == v</code> early return, and building the table with the loops in the wrong order (v outer, k inner) for a non-BFS node order — which reads unfilled entries.</p>
      <p><b>What you must still own:</b> picking between lifting, Euler+RMQ, HLD or offline Tarjan given query volume, memory and whether the tree changes; and explaining the "jump while different" invariant out loud.</p>`,
    problems: [{
      title: 'Weighted Tree Distance Queries',
      level: 'Medium', tags: ['lca', 'binary lifting', 'tree'], companies: ['Google', 'Amazon', 'Directi'],
      statement: `<p>A weighted tree has <code>n</code> nodes (0 … n−1), given as <code>edges[i] = [u, v, w]</code>. Answer <code>q</code> queries <code>[a, b]</code>: the total weight of the unique path between a and b.</p>`,
      constraints: `<p>1 ≤ n, q ≤ 10<sup>5</sup>, 1 ≤ w ≤ 10<sup>9</sup> (distance sums need 64-bit integers).</p>`,
      example: `<p>n = 6, edges <code>(0,1,3) (0,2,2) (1,3,4) (1,4,1) (2,5,7)</code>, queries <code>(3,4) (3,5) (4,1)</code> → <b>${H.c('g', '[5, 16, 1]')}</b>.</p><p>Why: dist from root = [0, 3, 2, 7, 4, 9]. (3,4): LCA = 1 → 7 + 4 − 2·3 = 5. (3,5): LCA = 0 → 7 + 9 − 0 = 16. (4,1): LCA = 1 → 4 + 3 − 6 = 1.</p>`,
      brute: {
        why: `<p>For each query, climb parent pointers from both nodes until they meet, adding edge weights. On a chain each query costs O(n) → O(n·q) = 10<sup>10</sup>. The waste: we re-climb the same long stretches for every query.</p>`,
        code: `class Brute {
    long[] treeDistances(int n, int[][] edges, int[][] queries) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) { adj.get(e[0]).add(new int[]{e[1], e[2]}); adj.get(e[1]).add(new int[]{e[0], e[2]}); }
        int[] parent = new int[n], depth = new int[n];
        long[] w = new long[n];                          // weight of the edge to the parent
        boolean[] seen = new boolean[n];
        Deque<Integer> q = new ArrayDeque<>();
        q.add(0);
        seen[0] = true;
        while (!q.isEmpty()) {
            int v = q.poll();
            for (int[] e : adj.get(v)) if (!seen[e[0]]) {
                seen[e[0]] = true; parent[e[0]] = v; depth[e[0]] = depth[v] + 1; w[e[0]] = e[1]; q.add(e[0]);
            }
        }
        long[] ans = new long[queries.length];
        for (int i = 0; i < queries.length; i++) {
            int u = queries[i][0], v = queries[i][1];
            long d = 0;
            while (depth[u] > depth[v]) { d += w[u]; u = parent[u]; }
            while (depth[v] > depth[u]) { d += w[v]; v = parent[v]; }
            while (u != v) { d += w[u] + w[v]; u = parent[u]; v = parent[v]; }
            ans[i] = d;
        }
        return ans;
    }
}`
      },
      mcq: { q: 'distRoot = [0, 3, 2, 7, 4, 9] and LCA(3, 5) = 0. What is the path weight between 3 and 5?', options: ['16', '9', '7', '2'], answer: 0, explain: 'dist[3] + dist[5] − 2·dist[LCA] = 7 + 9 − 0 = 16.' },
      hints: [
        `<p>Hint 1: Root the tree at 0 and store dist[v] = weight from the root. The path a → b goes up to LCA(a, b) and back down, so its weight is dist[a] + dist[b] − 2·dist[LCA].</p>`,
        `<p>Hint 2: Many queries → precompute up[k][v] with one BFS plus doubling, then each LCA costs O(log n).</p>`,
        `<p>Hint 3: Recipe — BFS from 0 fills up[0], depth, dist (no recursion). Build up[k] for k = 1..LOG−1. For each query: equalise depths by the bits of the difference, return early if equal, else jump both while different, LCA = parent. Keep dist in a 64-bit integer.</p>`
      ],
      tests: { sig: "string int int[][] int[][] -> long[]", fn: "dist", cases: [
          [["",6,[[0,1,3],[0,2,2],[1,3,4],[1,4,1],[2,5,7]],[[3,4],[3,5],[4,1]]],[5,16,1]],
          [["",1,[],[[0,0]]],[0]],
          [["",2,[[1,0,1000000000]],[[0,1],[1,0],[1,1]]],[1000000000,1000000000,0]],
          [["",5,[[0,1,1],[1,2,1],[2,3,1],[3,4,1]],[[0,4],[4,0],[1,3],[2,2]]],[4,4,2,0]],
          [["",5,[[0,1,5],[0,2,5],[0,3,5],[0,4,5]],[[1,2],[3,4],[0,4],[4,0]]],[10,10,5,5]],
          [["",4,[[3,2,7],[2,1,6],[1,0,5]],[[3,0],[2,0],[3,1]]],[18,11,13]],
          [["",9,[[0,7,1],[3,0,6],[1,7,20],[4,7,17],[5,0,20],[8,0,5],[8,2,18],[4,6,13]],[[1,5],[5,2],[7,5],[0,8],[3,3],[7,2]]],[41,43,21,5,0,24]],
          [["",3,[[1,0,16],[0,2,2]],[[0,2],[1,0],[2,0],[2,2],[0,1],[2,2]]],[2,16,2,0,16,0]],
          [["",8,[[0,6,20],[6,5,15],[6,1,19],[4,5,8],[2,5,9],[7,2,16],[6,3,3]],[[4,6],[1,4],[0,2],[5,2],[5,1],[2,7]]],[23,42,44,9,34,16]],
          [["",9,[[8,4,16],[1,8,18],[1,2,4],[8,3,6],[8,7,1],[2,0,6],[8,5,17],[3,6,14]],[[3,5],[1,0],[3,4],[0,5],[4,4],[3,4]]],[23,10,22,45,0,22]],
          [["",5,[[1,2,14],[4,2,20],[2,3,8],[0,2,20]],[[1,0],[3,3],[3,2],[1,0],[4,4],[2,0]]],[34,0,8,34,0,20]],
          [["",9,[[3,4,12],[2,4,14],[8,2,8],[5,4,17],[2,1,20],[8,6,2],[4,7,11],[5,0,9]],[[0,5],[8,0],[1,3],[7,8],[7,4],[0,6]]],[9,48,46,33,11,50]],
          [["",5,[[0,1,12],[2,1,12],[1,4,12],[3,1,8]],[[1,0],[1,1],[3,2],[1,1],[3,1],[4,2]]],[12,0,20,0,8,24]],
          [["",3,[[0,1,12],[1,2,8]],[[2,1],[0,0],[0,0],[2,1],[1,0],[2,0]]],[8,0,0,8,12,20]],
          [["chain",100000,[],[[0,99999],[99999,0],[50000,99999],[7,7]]],[99999000000000,99999000000000,49999000000000,0]],
          [["chain",100000,[],{"$rep":[0,99999],"n":100000}],{"$rep":99999000000000,"n":100000}],
          [["binary",100000,[],[[99999,99998],[99999,1],[2,99999],[65535,65536],[0,99999],[5,5]]],[12000000000,17000000000,15000000000,2000000000,16000000000,0]]
        ], harness: { java: `class Check {
  static long[] dist(String kind, int n, int[][] edges, int[][] queries) {
    if (!kind.isEmpty()) {
      edges = new int[n - 1][];
      for (int i = 1; i < n; i++) edges[i - 1] = kind.equals("chain") ? new int[]{i - 1, i, 1000000000} : new int[]{(i - 1) / 2, i, 1000000000};
    }
    return new Solution().treeDistances(n, edges, queries);
  }
}`, python: `def dist(kind, n, edges, queries):
    if kind != '':
        edges = [[i - 1 if kind == 'chain' else (i - 1) // 2, i, 10 ** 9] for i in range(1, n)]
    return tree_distances(n, edges, queries)`, js: `function dist(kind, n, edges, queries) {
  if (kind !== '') {
    edges = [];
    for (let i = 1; i < n; i++) edges.push([kind === 'chain' ? i - 1 : (i - 1) >> 1, i, 1000000000]);
  }
  return treeDistances(n, edges, queries);
}`, cpp: `vector<long long> dist(string kind, int n, vector<vector<int>> edges, vector<vector<int>> queries) {
  if (!kind.empty()) {
    edges.clear();
    for (int i = 1; i < n; i++) edges.push_back({kind == "chain" ? i - 1 : (i - 1) / 2, i, 1000000000});
  }
  return Solution().treeDistances(n, edges, queries);
}` } },
      solution: {
        approach: `<p>Binary lifting for LCA plus root distances. Building is O(n log n); every query O(log n).</p>`,
        code: `class Solution {
    long[] treeDistances(int n, int[][] edges, int[][] queries) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) { adj.get(e[0]).add(new int[]{e[1], e[2]}); adj.get(e[1]).add(new int[]{e[0], e[2]}); }
        int LOG = 1;
        while ((1 << LOG) < n) LOG++;
        int[][] up = new int[LOG][n];
        int[] depth = new int[n];
        long[] dist = new long[n];
        boolean[] seen = new boolean[n];
        Deque<Integer> q = new ArrayDeque<>();
        q.add(0);
        seen[0] = true;                                  // up[0][0] = 0: the root points to itself
        while (!q.isEmpty()) {
            int v = q.poll();
            for (int[] e : adj.get(v)) {
                int w = e[0];
                if (seen[w]) continue;
                seen[w] = true;
                up[0][w] = v;
                depth[w] = depth[v] + 1;
                dist[w] = dist[v] + e[1];
                q.add(w);
            }
        }
        for (int k = 1; k < LOG; k++)
            for (int v = 0; v < n; v++) up[k][v] = up[k - 1][up[k - 1][v]];
        long[] ans = new long[queries.length];
        for (int i = 0; i < queries.length; i++) {
            int a = queries[i][0], b = queries[i][1];
            int l = lca(a, b, up, depth, LOG);
            ans[i] = dist[a] + dist[b] - 2 * dist[l];
        }
        return ans;
    }

    private int lca(int u, int v, int[][] up, int[] depth, int LOG) {
        if (depth[u] < depth[v]) { int t = u; u = v; v = t; }
        int diff = depth[u] - depth[v];
        for (int k = 0; k < LOG; k++) if ((diff >> k & 1) == 1) u = up[k][u];
        if (u == v) return u;
        for (int k = LOG - 1; k >= 0; k--)
            if (up[k][u] != up[k][v]) { u = up[k][u]; v = up[k][v]; }
        return up[0][u];
    }
}`,
      alt: [{ lang: 'python', code: `from collections import deque


def tree_distances(n, edges, queries):
    adj = [[] for _ in range(n)]
    for u, v, w in edges:
        adj[u].append((v, w))
        adj[v].append((u, w))

    LOG = max(1, (n - 1).bit_length())            # 2^LOG >= n
    up = [[0] * n for _ in range(LOG)]            # up[k][v] = 2^k-th ancestor (the root points to itself)
    depth = [0] * n
    dist = [0] * n                                # weighted distance from the root
    seen = [False] * n
    seen[0] = True
    queue = deque([0])
    while queue:                                  # BFS: no recursion
        v = queue.popleft()
        for w, c in adj[v]:
            if not seen[w]:
                seen[w] = True
                up[0][w] = v
                depth[w] = depth[v] + 1
                dist[w] = dist[v] + c
                queue.append(w)
    for k in range(1, LOG):
        prev, cur = up[k - 1], up[k]
        for v in range(n):
            cur[v] = prev[prev[v]]

    def lca(u, v):
        if depth[u] < depth[v]:
            u, v = v, u
        diff = depth[u] - depth[v]
        for k in range(LOG):
            if diff >> k & 1:
                u = up[k][u]
        if u == v:
            return u
        for k in range(LOG - 1, -1, -1):
            if up[k][u] != up[k][v]:
                u, v = up[k][u], up[k][v]
        return up[0][u]

    return [dist[a] + dist[b] - 2 * dist[lca(a, b)] for a, b in queries]
` }, { lang: 'js', code: `function treeDistances(n, edges, queries) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) { adj[u].push([v, w]); adj[v].push([u, w]); }

  let LOG = 1;
  while ((1 << LOG) < n) LOG++;
  const up = Array.from({ length: LOG }, () => new Int32Array(n));   // the root points to itself
  const depth = new Int32Array(n);
  const dist = new Float64Array(n);          // weights sum to at most 1e14, exact in a double
  const seen = new Uint8Array(n);
  const queue = [0];
  seen[0] = 1;
  for (let head = 0; head < queue.length; head++) {      // BFS with an index, not shift()
    const v = queue[head];
    for (const [w, c] of adj[v]) {
      if (seen[w]) continue;
      seen[w] = 1;
      up[0][w] = v;
      depth[w] = depth[v] + 1;
      dist[w] = dist[v] + c;
      queue.push(w);
    }
  }
  for (let k = 1; k < LOG; k++)
    for (let v = 0; v < n; v++) up[k][v] = up[k - 1][up[k - 1][v]];

  const lca = (u, v) => {
    if (depth[u] < depth[v]) [u, v] = [v, u];
    const diff = depth[u] - depth[v];
    for (let k = 0; k < LOG; k++) if ((diff >> k) & 1) u = up[k][u];
    if (u === v) return u;
    for (let k = LOG - 1; k >= 0; k--)
      if (up[k][u] !== up[k][v]) { u = up[k][u]; v = up[k][v]; }
    return up[0][u];
  };
  return queries.map(([a, b]) => dist[a] + dist[b] - 2 * dist[lca(a, b)]);
}
` }, { lang: 'cpp', code: `class Solution {
public:
    vector<long long> treeDistances(int n, vector<vector<int>>& edges, vector<vector<int>>& queries) {
        vector<vector<pair<int, int>>> adj(n);
        for (auto& e : edges) {
            adj[e[0]].push_back({e[1], e[2]});
            adj[e[1]].push_back({e[0], e[2]});
        }
        int LOG = 1;
        while ((1 << LOG) < n) LOG++;
        vector<vector<int>> up(LOG, vector<int>(n, 0));   // the root points to itself
        vector<int> depth(n, 0);
        vector<long long> dist(n, 0);                     // long long: up to 1e5 * 1e9
        vector<char> seen(n, 0);
        queue<int> q;
        q.push(0);
        seen[0] = 1;
        while (!q.empty()) {
            int v = q.front(); q.pop();
            for (auto [w, c] : adj[v]) {
                if (seen[w]) continue;
                seen[w] = 1;
                up[0][w] = v;
                depth[w] = depth[v] + 1;
                dist[w] = dist[v] + c;
                q.push(w);
            }
        }
        for (int k = 1; k < LOG; k++)
            for (int v = 0; v < n; v++) up[k][v] = up[k - 1][up[k - 1][v]];

        auto lca = [&](int u, int v) {
            if (depth[u] < depth[v]) swap(u, v);
            int diff = depth[u] - depth[v];
            for (int k = 0; k < LOG; k++) if (diff >> k & 1) u = up[k][u];
            if (u == v) return u;
            for (int k = LOG - 1; k >= 0; k--)
                if (up[k][u] != up[k][v]) { u = up[k][u]; v = up[k][v]; }
            return up[0][u];
        };
        vector<long long> ans;
        ans.reserve(queries.size());
        for (auto& qu : queries) {
            int a = qu[0], b = qu[1];
            ans.push_back(dist[a] + dist[b] - 2 * dist[lca(a, b)]);
        }
        return ans;
    }
};
` }],
        dry: {
          head: ['query', 'equalise', 'jumps (k = 2, 1, 0)', 'LCA', 'answer'],
          rows: [
            ['(3, 4)', 'both depth 2', 'k=2, 1, 0: ancestors always equal → no jumps (u = 3, v = 4)', 'up[0][3] = 1', '7 + 4 − 6 = <b>5</b>'],
            ['(3, 5)', 'both depth 2', 'k=2,1: same (0) skip; k=0: 1 ≠ 2 → jump to 1, 2', 'up[0][1] = 0', '7 + 9 − 0 = <b>16</b>'],
            ['(4, 1)', 'depth 2 vs 1, diff 1 → 4 jumps to 1', '— (u == v)', '1', '4 + 3 − 6 = <b>1</b>']
          ]
        },
        complexity: `<p>Build <b>O(n log n)</b> time and memory; each query <b>O(log n)</b>; total O((n + q) log n).</p>`,
        followUps: ['Also return the maximum single edge on each path.', 'Support "change the weight of an edge" between queries (hint: Euler tour + Fenwick tree, or HLD).', 'Answer the queries in O(1) each with Euler tour + sparse table.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 6 — Max flow: Ford-Fulkerson & Edmonds-Karp (residual graph)
  // =====================================================================
  function flowViz(input, fixedMode) {
    var sp = String(input === undefined || input === null ? '' : input).split('|'), mode = fixedMode || 'bfs', body = input;
    if (sp.length === 2) { mode = sp[0].trim().toLowerCase(); body = sp[1]; }
    if (mode !== 'bfs' && mode !== 'dfs') throw new Error('Mode must be "bfs" (Edmonds-Karp) or "dfs" (plain Ford-Fulkerson), e.g. "dfs | S>A:3 A>T:2"');
    var P = parseFlow(body), N = buildNet(P.ids, P.edges), E = N.E, s = N.idx.S, t = N.idx.T;
    var nodes = layered(P.ids, P.edges, 'S', 'T', 70), frames = [], total = 0, round = 0;
    function G(hl, extra, label) {
      var ehl = flowEhl(P.edges, E);
      for (var k in extra) ehl[k] = extra[k];
      return { type: 'graph', label: label, directed: true, height: 70, nodes: nodes, edges: flowEdges(P.edges, E), hl: hl || {}, ehl: ehl };
    }
    frames.push({ narr: '<b>' + (mode === 'bfs' ? 'Edmonds-Karp' : 'Ford-Fulkerson (DFS)') + '</b>. Every edge label is <b>flow/capacity</b>; all flows start at 0. We repeatedly find an <b>augmenting path</b> S → T in the residual graph, push its bottleneck, and stop when no path is left.', parts: [G({ S: 'sel', T: 'sel' }, {}, 'network (label = flow/capacity)'), { type: 'vars', label: 'state', vals: { 'total flow': 0, 'search': mode === 'bfs' ? 'BFS (shortest path)' : 'DFS (any path)' } }] });
    function findPath() {
      var via = P.ids.map(function () { return -1; }), seen = P.ids.map(function () { return false; });
      seen[s] = true;
      if (mode === 'bfs') {
        var q = [s];
        while (q.length && !seen[t]) {
          var v = q.shift();
          N.g[v].forEach(function (id) { var w = E[id].v; if (!seen[w] && resid(E, id) > 0) { seen[w] = true; via[w] = id; q.push(w); } });
        }
      } else {
        (function dfs(v) {
          if (v === t) return true;
          for (var j = 0; j < N.g[v].length; j++) {
            var id = N.g[v][j], w = E[id].v;
            if (!seen[w] && resid(E, id) > 0) { seen[w] = true; via[w] = id; if (dfs(w)) return true; }
          }
          return false;
        })(s);
      }
      if (!seen[t]) return { path: null, seen: seen };
      var path = [];
      for (var x = t; x !== s; x = E[via[x]].u) path.unshift(via[x]);
      return { path: path, seen: seen };
    }
    var guard = 0;
    while (guard++ < 40) {
      var r = findPath();
      if (!r.path) {
        var hl = {};
        P.ids.forEach(function (id, i) { hl[id] = r.seen[i] ? 'ok' : 'bad'; });
        frames.push({ narr: 'No augmenting path is left: from S the residual graph only reaches the <span class="c-g">green</span> nodes, T is <span class="c-r">unreachable</span>. <b>Maximum flow = ' + total + '</b>. (The edges from green to red are all full — that is the minimum cut, next topics.)', parts: [G(hl, {}, 'final flow'), { type: 'vars', label: 'result', vals: { 'max flow': total, 'augmenting paths used': round } }] });
        break;
      }
      round++;
      var b = Infinity, ex = {}, rows = [], hlp = {}, usesBack = false;
      r.path.forEach(function (id) {
        var e = E[id], orig = P.edges[e.k], key = orig[0] + '-' + orig[1], back = (id & 1) === 1;
        b = Math.min(b, resid(E, id));
        ex[key] = back ? 'sel' : 'cur';
        hlp[P.ids[e.u]] = 'cur'; hlp[P.ids[e.v]] = 'cur';
        if (back) usesBack = true;
        rows.push([P.ids[e.u] + '→' + P.ids[e.v], back ? 'undo ' + orig[0] + '→' + orig[1] : 'forward', String(resid(E, id))]);
      });
      hlp.S = 'sel'; hlp.T = 'sel';
      var names = [P.ids[s]].concat(r.path.map(function (id) { return P.ids[E[id].v]; }));
      frames.push({ narr: 'Path #' + round + ' (' + (mode === 'bfs' ? 'BFS: fewest edges' : 'DFS: first one found') + '): <b>' + names.join(' → ') + '</b>. The <b>bottleneck</b> (smallest residual on the path) is <b>' + b + '</b>.' + (usesBack ? ' <span class="c-p">Purple step = a reverse edge: we push flow "backwards", which cancels flow sent earlier and reroutes it.</span>' : ''), parts: [G(hlp, ex, 'augmenting path'), { type: 'table', label: 'residual capacities on the path', columns: ['step', 'kind', 'residual'], rows: rows }, { type: 'vars', vals: { bottleneck: b, 'total flow': total } }] });
      r.path.forEach(function (id) { push(E, id, b); });
      total += b;
      frames.push({ narr: 'Push <b>' + b + '</b> along the path: forward edges gain ' + b + ' flow' + (usesBack ? ', the reverse step <b>removes</b> ' + b + ' from the edge it undoes' : '') + '. Total flow = <b>' + total + '</b>. Red edges are now full (saturated).', parts: [G(hlp, {}, 'after augmenting'), { type: 'vars', vals: { 'total flow': total } }] });
    }
    return frames;
  }

  topics.push({
    title: 'Maximum Flow I: Residual Graphs, Ford-Fulkerson & Edmonds-Karp',
    analogy: `<p>A city's water network: a <b>reservoir</b> (source S), a <b>town</b> (sink T), and pipes with different widths (capacities). How many litres per second can reach the town? Water may split at a junction and merge later, but every junction must pass on exactly what it receives — pipes do not leak or store water.</p>
      <p>The algorithm is what a plumber would do: find any route with spare room, push as much as the <b>narrowest pipe</b> allows, repeat. The clever bit is an <b>"undo" valve</b>: if an earlier choice was bad, you are allowed to push water <i>backwards</i> through a pipe, which simply means "send less that way" and reroute it.</p>`,
    explain: `<p><b>The vocabulary in one table:</b></p>
      ${H.table(['word', 'plain meaning'], [
        ['network', 'directed graph with a source <b>S</b>, a sink <b>T</b>, and a capacity c(u, v) ≥ 0 on each edge'],
        ['flow f(u, v)', 'how much we send on the edge; <code>0 ≤ f ≤ c</code> (capacity rule)'],
        ['conservation', 'for every node except S and T: total in = total out'],
        ['value of the flow', 'total leaving S (= total arriving at T)'],
        ['residual capacity', 'forward: <code>c − f</code> (room left); backward: <code>f</code> (how much we could undo)'],
        ['augmenting path', 'an S → T path in the residual graph where every step has residual &gt; 0'],
        ['bottleneck', 'the smallest residual on that path = how much we can push']
      ])}
      <p><b>Ford-Fulkerson method:</b> start with zero flow; while an augmenting path exists, push its bottleneck. That is it. When no path exists, the flow is maximum (proved in the Min-Cut topic).</p>
      <p><b>Why reverse edges are essential — the classic trap:</b></p>
      ${H.table(['step', 'path chosen', 'pushed', 'total'], [
        ['1', 'S → A → B → T (unlucky: uses the middle edge)', '2', '2'],
        ['2', 'S → A → T', '1', '3'],
        ['3', 'S → B → ' + H.c('p', 'A (reverse of A→B)') + ' → T', '1', '4'],
        ['4', 'S → B → T', '1', H.c('g', '5 = max')]
      ])}
      <p>Network: S→A:3, S→B:2, A→B:2, A→T:2, B→T:3. Without the reverse step 3, a greedy "never undo" approach gets stuck at 4. The reverse edge B→A says: "the 2 units that went A→B — let one of them go A→T instead, and B will fill its own pipe to T from S."</p>
      <p><b>Ford-Fulkerson vs Edmonds-Karp:</b> Ford-Fulkerson does not say <i>how</i> to find the path. With DFS and integer capacities it runs in <b>O(E · F)</b> where F = max flow value — terrible when capacities are 10<sup>9</sup>. <b>Edmonds-Karp</b> = always take the <b>shortest</b> augmenting path (BFS). This gives <b>O(V · E²)</b> regardless of the capacities.</p>`,
    clues: [
      '"<b>Maximum</b> amount of water / data / traffic / goods from A to B" with <b>capacities</b> on edges → max flow.',
      '"Maximum number of <b>edge-disjoint paths</b>" → max flow with every capacity = 1.',
      '"Assign people to jobs / students to projects, each with a <b>limit</b>" → bipartite graph + super source and super sink, capacities = limits.',
      '"Each node can be used at most k times" → <b>split the node</b> into in/out halves joined by an edge of capacity k.',
      'Small V (≤ 500) and E (≤ 5000) in a "flow / assignment / routing" story → Edmonds-Karp is enough; bigger → Dinic.',
      'You see the phrases "<b>residual</b>", "<b>augmenting path</b>", "bottleneck" in a hint → flow family.'
    ],
    code: [{ lang: 'java', code: `
      class EdmondsKarp {
          private final int n;
          private final List<List<Integer>> g = new ArrayList<>();   // g[v] = ids of edges leaving v
          private final List<Integer> to = new ArrayList<>();
          private final List<Long> cap = new ArrayList<>();          // RESIDUAL capacity of each edge

          EdmondsKarp(int n) {
              this.n = n;
              for (int i = 0; i < n; i++) g.add(new ArrayList<>());
          }

          void addEdge(int u, int v, long c) {
              g.get(u).add(to.size()); to.add(v); cap.add(c);    // forward edge: even id
              g.get(v).add(to.size()); to.add(u); cap.add(0L);   // reverse edge: id ^ 1, starts at 0
          }

          long maxFlow(int s, int t) {
              long flow = 0;
              while (true) {
                  int[] via = new int[n];                         // edge used to reach each node
                  Arrays.fill(via, -1);
                  boolean[] seen = new boolean[n];
                  Deque<Integer> q = new ArrayDeque<>();
                  q.add(s);
                  seen[s] = true;
                  while (!q.isEmpty() && !seen[t]) {              // BFS = shortest augmenting path
                      int v = q.poll();
                      for (int id : g.get(v)) {
                          int w = to.get(id);
                          if (!seen[w] && cap.get(id) > 0) { seen[w] = true; via[w] = id; q.add(w); }
                      }
                  }
                  if (!seen[t]) return flow;                      // no path left: flow is maximum
                  long push = Long.MAX_VALUE;                     // bottleneck along the path
                  for (int v = t; v != s; v = to.get(via[v] ^ 1)) push = Math.min(push, cap.get(via[v]));
                  for (int v = t; v != s; v = to.get(via[v] ^ 1)) {
                      int id = via[v];
                      cap.set(id, cap.get(id) - push);            // use forward room
                      cap.set(id ^ 1, cap.get(id ^ 1) + push);    // create "undo" room
                  }
                  flow += push;
              }
          }
      }`, alt: [{ lang: 'python', code: `from collections import deque


class EdmondsKarp:
    def __init__(self, n):
        self.n = n
        self.g = [[] for _ in range(n)]         # g[v] = ids of edges leaving v
        self.to = []
        self.cap = []                           # RESIDUAL capacity of each edge

    def add_edge(self, u, v, c):
        self.g[u].append(len(self.to)); self.to.append(v); self.cap.append(c)   # forward edge: even id
        self.g[v].append(len(self.to)); self.to.append(u); self.cap.append(0)   # reverse edge: id ^ 1, starts at 0

    def max_flow(self, s, t):
        flow = 0
        while True:
            via = [-1] * self.n                 # edge used to reach each node
            seen = [False] * self.n
            seen[s] = True
            q = deque([s])
            while q and not seen[t]:            # BFS = shortest augmenting path
                v = q.popleft()
                for eid in self.g[v]:
                    w = self.to[eid]
                    if not seen[w] and self.cap[eid] > 0:
                        seen[w] = True
                        via[w] = eid
                        q.append(w)
            if not seen[t]:
                return flow                     # no path left: flow is maximum
            push = float('inf')                 # bottleneck along the path
            v = t
            while v != s:
                push = min(push, self.cap[via[v]])
                v = self.to[via[v] ^ 1]
            v = t
            while v != s:
                eid = via[v]
                self.cap[eid] -= push           # use forward room
                self.cap[eid ^ 1] += push       # create "undo" room
                v = self.to[eid ^ 1]
            flow += push
` }, { lang: 'js', code: `class EdmondsKarp {
  constructor(n) {
    this.n = n;
    this.g = Array.from({ length: n }, () => []);   // g[v] = ids of edges leaving v
    this.to = [];
    this.cap = [];                                  // RESIDUAL capacity of each edge
  }

  addEdge(u, v, c) {
    this.g[u].push(this.to.length); this.to.push(v); this.cap.push(c);   // forward edge: even id
    this.g[v].push(this.to.length); this.to.push(u); this.cap.push(0);   // reverse edge: id ^ 1, starts at 0
  }

  maxFlow(s, t) {
    let flow = 0;
    for (;;) {
      const via = new Array(this.n).fill(-1);       // edge used to reach each node
      const seen = new Array(this.n).fill(false);
      seen[s] = true;
      const q = [s];
      for (let h = 0; h < q.length && !seen[t]; h++) {   // BFS = shortest augmenting path
        const v = q[h];
        for (const id of this.g[v]) {
          const w = this.to[id];
          if (!seen[w] && this.cap[id] > 0) { seen[w] = true; via[w] = id; q.push(w); }
        }
      }
      if (!seen[t]) return flow;                    // no path left: flow is maximum
      let push = Infinity;                          // bottleneck along the path
      for (let v = t; v !== s; v = this.to[via[v] ^ 1]) push = Math.min(push, this.cap[via[v]]);
      for (let v = t; v !== s; v = this.to[via[v] ^ 1]) {
        const id = via[v];
        this.cap[id] -= push;                       // use forward room
        this.cap[id ^ 1] += push;                   // create "undo" room
      }
      flow += push;
    }
  }
}
` }, { lang: 'cpp', code: `class EdmondsKarp {
    int n;
    vector<vector<int>> g;      // g[v] = ids of edges leaving v
    vector<int> to;
    vector<long long> cap;      // RESIDUAL capacity of each edge

public:
    explicit EdmondsKarp(int n) : n(n), g(n) {}

    void addEdge(int u, int v, long long c) {
        g[u].push_back(to.size()); to.push_back(v); cap.push_back(c);   // forward edge: even id
        g[v].push_back(to.size()); to.push_back(u); cap.push_back(0);   // reverse edge: id ^ 1, starts at 0
    }

    long long maxFlow(int s, int t) {
        long long flow = 0;
        while (true) {
            vector<int> via(n, -1);                     // edge used to reach each node
            vector<char> seen(n, 0);
            queue<int> q;
            q.push(s);
            seen[s] = 1;
            while (!q.empty() && !seen[t]) {            // BFS = shortest augmenting path
                int v = q.front();
                q.pop();
                for (int id : g[v]) {
                    int w = to[id];
                    if (!seen[w] && cap[id] > 0) { seen[w] = 1; via[w] = id; q.push(w); }
                }
            }
            if (!seen[t]) return flow;                  // no path left: flow is maximum
            long long push = LLONG_MAX;                 // bottleneck along the path
            for (int v = t; v != s; v = to[via[v] ^ 1]) push = min(push, cap[via[v]]);
            for (int v = t; v != s; v = to[via[v] ^ 1]) {
                int id = via[v];
                cap[id] -= push;                        // use forward room
                cap[id ^ 1] += push;                    // create "undo" room
            }
            flow += push;
        }
    }
};
` }] }, { lang: 'java', code: `
      class FordFulkersonMatrix {
          // Plain Ford-Fulkerson with DFS on a capacity matrix: O(E * maxFlow). Small integer capacities only.
          static int maxFlow(int[][] cap, int s, int t) {
              int n = cap.length;
              int[][] r = new int[n][];
              for (int i = 0; i < n; i++) r[i] = cap[i].clone();   // residual = capacity at the start
              int flow = 0;
              while (true) {
                  int pushed = dfs(r, s, t, Integer.MAX_VALUE, new boolean[n]);
                  if (pushed == 0) return flow;
                  flow += pushed;
              }
          }

          static int dfs(int[][] r, int v, int t, int f, boolean[] seen) {
              if (v == t) return f;
              seen[v] = true;
              for (int w = 0; w < r.length; w++) {
                  if (!seen[w] && r[v][w] > 0) {
                      int d = dfs(r, w, t, Math.min(f, r[v][w]), seen);
                      if (d > 0) { r[v][w] -= d; r[w][v] += d; return d; }   // r[w][v] is the undo room
                  }
              }
              return 0;
          }
      }`, alt: [{ lang: 'python', code: `def max_flow(cap, s, t):
    # Plain Ford-Fulkerson with DFS on a capacity matrix: O(E * maxFlow). Small integer capacities only.
    n = len(cap)
    r = [row[:] for row in cap]                 # residual = capacity at the start

    def dfs(v, f, seen):
        if v == t:
            return f
        seen[v] = True
        for w in range(n):
            if not seen[w] and r[v][w] > 0:
                d = dfs(w, min(f, r[v][w]), seen)
                if d > 0:
                    r[v][w] -= d
                    r[w][v] += d                # r[w][v] is the undo room
                    return d
        return 0

    flow = 0
    while True:
        pushed = dfs(s, float('inf'), [False] * n)
        if pushed == 0:
            return flow
        flow += pushed
` }, { lang: 'js', code: `// Plain Ford-Fulkerson with DFS on a capacity matrix: O(E * maxFlow). Small integer capacities only.
function maxFlow(cap, s, t) {
  const n = cap.length;
  const r = cap.map((row) => row.slice());      // residual = capacity at the start

  function dfs(v, f, seen) {
    if (v === t) return f;
    seen[v] = true;
    for (let w = 0; w < n; w++) {
      if (!seen[w] && r[v][w] > 0) {
        const d = dfs(w, Math.min(f, r[v][w]), seen);
        if (d > 0) { r[v][w] -= d; r[w][v] += d; return d; }   // r[w][v] is the undo room
      }
    }
    return 0;
  }

  let flow = 0;
  for (;;) {
    const pushed = dfs(s, Infinity, new Array(n).fill(false));
    if (pushed === 0) return flow;
    flow += pushed;
  }
}
` }, { lang: 'cpp', code: `// Plain Ford-Fulkerson with DFS on a capacity matrix: O(E * maxFlow). Small integer capacities only.
int fordFulkersonDfs(vector<vector<int>>& r, int v, int t, int f, vector<char>& seen) {
    if (v == t) return f;
    seen[v] = 1;
    for (int w = 0; w < (int)r.size(); w++) {
        if (!seen[w] && r[v][w] > 0) {
            int d = fordFulkersonDfs(r, w, t, min(f, r[v][w]), seen);
            if (d > 0) { r[v][w] -= d; r[w][v] += d; return d; }   // r[w][v] is the undo room
        }
    }
    return 0;
}

int maxFlow(vector<vector<int>> cap, int s, int t) {   // cap is copied: residual = capacity at the start
    int flow = 0;
    while (true) {
        vector<char> seen(cap.size(), 0);
        int pushed = fordFulkersonDfs(cap, s, t, INT_MAX, seen);
        if (pushed == 0) return flow;
        flow += pushed;
    }
}
` }] }],
    codeTitle: ['Edmonds-Karp (BFS augmenting paths)', 'Ford-Fulkerson with DFS on a matrix (simplest, small inputs)'],
    viz: {
      title: 'Augmenting paths live: bottleneck, push, and the reverse-edge "undo"',
      input: 'dfs | S>A:3 S>B:2 A>B:2 A>T:2 B>T:3',
      inputLabel: 'mode (bfs = Edmonds-Karp, dfs = Ford-Fulkerson) | edges "u>v:capacity" with source S and sink T',
      gen: function (input) { return flowViz(input); }
    },
    examples: [
      { title: 'Single path: the narrowest pipe wins', html: `<p>S→A:5, A→B:2, B→T:9. Only one route; bottleneck = min(5, 2, 9) = <b>2</b>. Max flow 2. After pushing, A→B is saturated and no path remains.</p>${H.arr([5, 2, 9], { label: 'capacities on the only path', hl: { 1: 'r' } })}` },
      { title: 'Why DFS Ford-Fulkerson can be painfully slow', html: `<p>S→A:10<sup>9</sup>, S→B:10<sup>9</sup>, A→T:10<sup>9</sup>, B→T:10<sup>9</sup>, A→B:1. An unlucky DFS alternates S→A→B→T and S→B→A→T (using the reverse of A→B), pushing just <b>1</b> unit each time → <b>2·10<sup>9</sup></b> iterations. BFS (Edmonds-Karp) finds the 2-edge paths S→A→T and S→B→T first and finishes in <b>2</b> iterations.</p>` },
      { title: 'Flow decomposition', html: `<p>A final flow can always be split into at most E simple S→T paths (plus cycles that carry no value). For the viz default (max 5): 2 units on S→A→T, 2 units on S→B→T, 1 unit on S→A→B→T. That decomposition is how you turn a flow into concrete routes for trucks or packets.</p>` },
      { title: 'Undirected edge with capacity c', html: `<p>Model it as <b>two</b> directed edges u→v and v→u, each with capacity c. Their reverse "undo" edges handle cancellation automatically. (Shortcut used in contests: add u→v with capacity c and set the paired reverse edge's capacity to c too, instead of 0.)</p>` }
    ],
    deepDive: `<p><b>Why Edmonds-Karp is O(V·E²).</b> Two facts. (1) With BFS augmentation, the shortest-path distance from S to every node in the residual graph <b>never decreases</b>. (2) Every augmentation saturates at least one <b>critical</b> edge (u, v) on the path; before (u, v) can be critical again, flow must go back along (v, u), which forces dist(u) to grow by at least 2. Distances are at most V, so each edge is critical O(V) times → O(V·E) augmentations, each a BFS of O(E) → <b>O(V·E²)</b>.</p>
      <p><b>Integrality theorem:</b> if all capacities are integers, Ford-Fulkerson produces an integer max flow (every bottleneck is an integer). This is why flow solves <b>combinatorial</b> problems like matching: "1 unit of flow on an edge" can be read as "this pair is chosen".</p>
      <p><b>Irrational capacities:</b> plain Ford-Fulkerson with a bad path choice may never terminate and may even converge to the wrong value (Zwick's example with the golden ratio). With BFS it always terminates — another reason to never use "any DFS" in production.</p>
      <p><b>Implementation details that matter:</b> store edges in arrays with the reverse at <code>id ^ 1</code> (edges 0/1, 2/3, …), so pushing flow is two array writes. Use a 64-bit integer (<code>long</code> / <code>long long</code>) when capacities × paths can exceed 2<sup>31</sup>; Python integers never overflow, and JavaScript numbers are exact up to 2<sup>53</sup>. Parallel edges are fine (they just add capacity). In real systems, max flow appears in network bandwidth planning, airline crew and baseball elimination problems, image segmentation, and as a building block for min-cost flow (used in ride-hailing and logistics assignment).</p>`,
    aiEra: `<p><b>What AI changes:</b> an AI writes Edmonds-Karp or calls <code>networkx.maximum_flow</code> / OR-Tools <code>SimpleMaxFlow</code> instantly. The scarce skill is the <b>modelling</b>: what are the nodes, what does one unit of flow mean, where do the capacities come from, and which constraints need node splitting or a super source.</p>
      <p><b>Use AI as a partner:</b> describe the business problem in words and ask for 2–3 alternative flow models; then prove to yourself which one is correct by checking that every valid real-world plan maps to a flow and back. Ask it for adversarial tests like the 10<sup>9</sup>-capacity example to show why DFS is unsafe.</p>
      <p><b>Where AI goes wrong:</b> forgetting reverse edges (code "works" on simple tests and fails on the diamond), using <code>int</code> for sums of 10<sup>9</sup> capacities, modelling an undirected edge as one directed edge, and confusing "max flow" with "widest path" (maximum bottleneck of a single path — a Dijkstra variant, not flow).</p>
      <p><b>What you must still own:</b> the residual-graph idea, why the result is optimal (min-cut), and a correct model of the problem — a library cannot fix a wrong graph.</p>`,
    problems: [{
      title: 'Maximum Flow in a Network',
      level: 'Medium', tags: ['max flow', 'edmonds-karp', 'bfs'], companies: ['Google', 'Amazon', 'Uber'],
      statement: `<p>A directed network has <code>n</code> nodes (0 … n−1). <code>edges[i] = [u, v, c]</code> is a pipe from u to v with capacity c. Return the maximum flow from node <code>0</code> to node <code>n−1</code>.</p>`,
      constraints: `<p>2 ≤ n ≤ 500, 1 ≤ E ≤ 5000, 1 ≤ c ≤ 10<sup>9</sup>. Parallel edges may appear.</p>`,
      example: `<p>n = 4, edges <code>0→1:3, 0→2:2, 1→2:2, 1→3:2, 2→3:3</code> → <b>${H.c('g', '5')}</b>.</p><p>Why: everything leaving node 0 is 3 + 2 = 5 and we can route all of it: 2 via 0→2→3, 2 via 0→1→3, 1 via 0→1→2→3. No flow can exceed what leaves the source.</p>`,
      brute: {
        why: `<p>Plain Ford-Fulkerson with DFS is correct but may push 1 unit per iteration: <b>O(E · F)</b> with F up to ~5·10<sup>12</sup> — it can run forever in practice. The wasted work: long, zig-zagging paths with tiny bottlenecks.</p>`,
        code: `class Brute {
    long maxFlow(int n, int[][] edges) {
        long[][] r = new long[n][n];
        for (int[] e : edges) r[e[0]][e[1]] += e[2];          // parallel edges add up
        long flow = 0, pushed;
        while ((pushed = dfs(r, 0, n - 1, Long.MAX_VALUE, new boolean[n])) > 0) flow += pushed;
        return flow;
    }

    long dfs(long[][] r, int v, int t, long f, boolean[] seen) {
        if (v == t) return f;
        seen[v] = true;
        for (int w = 0; w < r.length; w++) {
            if (!seen[w] && r[v][w] > 0) {
                long d = dfs(r, w, t, Math.min(f, r[v][w]), seen);
                if (d > 0) { r[v][w] -= d; r[w][v] += d; return d; }
            }
        }
        return 0;
    }
}`
      },
      mcq: { q: 'You pushed 4 units on edge A→B (capacity 6). What are the residual capacities of A→B and B→A?', options: ['A→B: 2, B→A: 4', 'A→B: 4, B→A: 2', 'A→B: 2, B→A: 0', 'A→B: 6, B→A: 4'], answer: 0, explain: 'Forward room = 6 − 4 = 2. Backward residual = the flow we could undo = 4.' },
      hints: [
        `<p>Hint 1: Greedy "push along any path and never look back" can get stuck below the optimum. You need reverse (undo) edges with residual = current flow.</p>`,
        `<p>Hint 2: Store each edge and its reverse as a pair (ids 2i and 2i+1) so <code>id ^ 1</code> finds the partner. Find paths with BFS (Edmonds-Karp) to bound the number of rounds.</p>`,
        `<p>Hint 3: Recipe — loop: BFS from 0 over edges with residual &gt; 0, remembering the edge used to reach each node; if n−1 is unreached, stop; walk back from n−1 to find the bottleneck; subtract it on path edges and add it on their partners; add to the answer. Use a 64-bit integer for the flow.</p>`
      ],
      tests: { sig: "string int int[][] -> long", fn: "flow", cases: [
          [["",4,[[0,1,3],[0,2,2],[1,2,2],[1,3,2],[2,3,3]]],5],
          [["",2,[[0,1,7]]],7],
          [["",3,[[0,1,5]]],0],
          [["",3,[[0,1,4],[0,1,6],[1,2,9]]],9],
          [["",4,[[0,1,10],[1,0,10],[1,2,3],[2,1,3],[2,3,10],[3,0,5]]],3],
          [["",6,[[0,1,16],[0,2,13],[1,2,10],[2,1,4],[1,3,12],[3,2,9],[2,4,14],[4,3,7],[3,5,20],[4,5,4]]],23],
          [["",5,[[3,1,5]]],0],
          [["",2,[[1,0,2]]],0],
          [["",8,[[0,1,5],[6,5,5],[3,1,9],[7,2,9],[6,7,7],[7,0,9]]],0],
          [["",3,[[0,1,2],[2,1,6],[1,2,6],[2,0,6],[0,2,8],[0,1,4],[1,0,3],[0,1,3]]],14],
          [["",3,[[0,1,1],[2,1,2],[1,2,1],[1,2,3],[0,2,2],[0,1,7]]],6],
          [["",7,[[1,4,4],[5,1,2],[5,0,1],[4,2,7],[3,6,7],[1,2,5],[2,3,2],[0,1,4],[1,5,7],[0,4,1],[6,2,8],[5,6,4],[4,0,4]]],5],
          [["",8,[[5,0,4],[0,1,7],[4,5,3]]],0],
          [["",8,[[4,5,7],[2,3,4],[4,5,8],[0,2,8],[0,1,7],[4,7,1],[7,2,5],[3,2,3],[3,2,4],[4,5,9],[3,7,9],[6,0,5],[3,5,4],[1,7,1]]],5],
          [["",2,[[1,0,6],[1,0,4],[0,1,4],[1,0,5],[1,0,9],[0,1,1],[0,1,6]]],11],
          [["",8,[[3,4,4],[6,7,6]]],0],
          [["",3,{"$concat":[{"$rep":[0,1,1000000000],"n":2500},{"$rep":[1,2,1000000000],"n":2500}]}],2500000000000],
          [["",3,{"$concat":[{"$rep":[0,1,1000000000],"n":4000},{"$rep":[1,2,1000000000],"n":1000}]}],1000000000000],
          [["fan",500,[]],498000000000],
          [["chain",500,[]],1000000000],
          [["complete",140,[]],69000000000]
        ], harness: { java: `class Check {
  static long flow(String kind, int n, int[][] edges) {
    if (!kind.isEmpty()) {
      List<int[]> e = new ArrayList<>();
      int B = 1000000000;
      if (kind.equals("fan")) { for (int i = 1; i < n - 1; i++) { e.add(new int[]{0, i, B}); e.add(new int[]{i, n - 1, B}); } }
      else if (kind.equals("chain")) { for (int i = 0; i + 1 < n; i++) e.add(new int[]{i, i + 1, B}); }
      else {
        int k = (n - 2) / 2;
        for (int a = 1; a <= k; a++) { e.add(new int[]{0, a, B}); e.add(new int[]{k + a, n - 1, B}); for (int b = 1; b <= k; b++) e.add(new int[]{a, k + b, B}); }
      }
      edges = e.toArray(new int[0][]);
    }
    return new Solution().maxFlow(n, edges);
  }
}`, python: `def flow(kind, n, edges):
    B = 10 ** 9
    if kind == 'fan':
        edges = [[0, i, B] for i in range(1, n - 1)] + [[i, n - 1, B] for i in range(1, n - 1)]
    elif kind == 'chain':
        edges = [[i, i + 1, B] for i in range(n - 1)]
    elif kind == 'complete':
        k = (n - 2) // 2
        edges = [[0, a, B] for a in range(1, k + 1)] + [[k + a, n - 1, B] for a in range(1, k + 1)]
        edges += [[a, k + b, B] for a in range(1, k + 1) for b in range(1, k + 1)]
    return max_flow(n, edges)`, js: `function flow(kind, n, edges) {
  const B = 1000000000;
  if (kind === 'fan') { edges = []; for (let i = 1; i < n - 1; i++) { edges.push([0, i, B]); edges.push([i, n - 1, B]); } }
  else if (kind === 'chain') { edges = []; for (let i = 0; i + 1 < n; i++) edges.push([i, i + 1, B]); }
  else if (kind === 'complete') {
    edges = [];
    const k = (n - 2) / 2;
    for (let a = 1; a <= k; a++) {
      edges.push([0, a, B]); edges.push([k + a, n - 1, B]);
      for (let b = 1; b <= k; b++) edges.push([a, k + b, B]);
    }
  }
  return maxFlow(n, edges);
}`, cpp: `long long flow(string kind, int n, vector<vector<int>> edges) {
  int B = 1000000000;
  if (kind == "fan") { edges.clear(); for (int i = 1; i < n - 1; i++) { edges.push_back({0, i, B}); edges.push_back({i, n - 1, B}); } }
  else if (kind == "chain") { edges.clear(); for (int i = 0; i + 1 < n; i++) edges.push_back({i, i + 1, B}); }
  else if (kind == "complete") {
    edges.clear();
    int k = (n - 2) / 2;
    for (int a = 1; a <= k; a++) {
      edges.push_back({0, a, B}); edges.push_back({k + a, n - 1, B});
      for (int b = 1; b <= k; b++) edges.push_back({a, k + b, B});
    }
  }
  return Solution().maxFlow(n, edges);
}` } },
      solution: {
        approach: `<p>Edmonds-Karp on an array-based edge list (forward-star): <code>head[v]</code> points to v's latest edge and <code>next[e]</code> to the one before. Arrays avoid boxing and are several times faster than lists of objects.</p>`,
        code: `class Solution {
    long maxFlow(int n, int[][] edges) {
        int m = edges.length;
        int[] to = new int[2 * m], next = new int[2 * m], head = new int[n];
        long[] cap = new long[2 * m];
        Arrays.fill(head, -1);
        for (int i = 0; i < m; i++) {
            int u = edges[i][0], v = edges[i][1];
            to[2 * i] = v;     cap[2 * i] = edges[i][2]; next[2 * i] = head[u];     head[u] = 2 * i;
            to[2 * i + 1] = u; cap[2 * i + 1] = 0;       next[2 * i + 1] = head[v]; head[v] = 2 * i + 1;
        }
        int s = 0, t = n - 1;
        long flow = 0;
        int[] via = new int[n], q = new int[n];
        while (true) {
            Arrays.fill(via, -1);
            via[s] = -2;                                    // mark the source as visited
            int qh = 0, qt = 0;
            q[qt++] = s;
            while (qh < qt && via[t] == -1) {               // BFS for the shortest augmenting path
                int v = q[qh++];
                for (int e = head[v]; e != -1; e = next[e]) {
                    if (cap[e] > 0 && via[to[e]] == -1) { via[to[e]] = e; q[qt++] = to[e]; }
                }
            }
            if (via[t] == -1) return flow;                  // sink unreachable: done
            long push = Long.MAX_VALUE;
            for (int v = t; v != s; v = to[via[v] ^ 1]) push = Math.min(push, cap[via[v]]);
            for (int v = t; v != s; v = to[via[v] ^ 1]) { cap[via[v]] -= push; cap[via[v] ^ 1] += push; }
            flow += push;
        }
    }
}`,
      alt: [{ lang: 'python', code: `from collections import deque


def max_flow(n, edges):
    to, cap = [], []                       # edge 2i is forward, 2i + 1 is its undo edge
    g = [[] for _ in range(n)]
    for u, v, c in edges:
        g[u].append(len(to)); to.append(v); cap.append(c)
        g[v].append(len(to)); to.append(u); cap.append(0)
    s, t = 0, n - 1
    flow = 0
    while True:
        via = [-1] * n                     # via[v] = edge used to reach v; -2 marks the source
        via[s] = -2
        queue = deque([s])
        while queue and via[t] == -1:      # BFS for the shortest augmenting path
            v = queue.popleft()
            for e in g[v]:
                if cap[e] > 0 and via[to[e]] == -1:
                    via[to[e]] = e
                    queue.append(to[e])
        if via[t] == -1:                   # sink unreachable: done
            return flow
        path = []
        v = t
        while v != s:
            path.append(via[v])
            v = to[via[v] ^ 1]
        push = min(cap[e] for e in path)   # bottleneck
        for e in path:
            cap[e] -= push
            cap[e ^ 1] += push
        flow += push
` }, { lang: 'js', code: `function maxFlow(n, edges) {
  const m = edges.length;
  const to = new Int32Array(2 * m), cap = new Float64Array(2 * m);   // edge 2i forward, 2i + 1 its undo edge
  const g = Array.from({ length: n }, () => []);
  edges.forEach(([u, v, c], i) => {
    to[2 * i] = v; cap[2 * i] = c; g[u].push(2 * i);
    to[2 * i + 1] = u; cap[2 * i + 1] = 0; g[v].push(2 * i + 1);
  });
  const s = 0, t = n - 1;
  let flow = 0;
  const via = new Int32Array(n), queue = new Int32Array(n);
  for (;;) {
    via.fill(-1);
    via[s] = -2;                             // mark the source as visited
    let head = 0, tail = 0;
    queue[tail++] = s;
    while (head < tail && via[t] === -1) {   // BFS for the shortest augmenting path
      const v = queue[head++];
      for (const e of g[v]) {
        if (cap[e] > 0 && via[to[e]] === -1) { via[to[e]] = e; queue[tail++] = to[e]; }
      }
    }
    if (via[t] === -1) return flow;          // sink unreachable: done
    let push = Infinity;
    for (let v = t; v !== s; v = to[via[v] ^ 1]) push = Math.min(push, cap[via[v]]);
    for (let v = t; v !== s; v = to[via[v] ^ 1]) { cap[via[v]] -= push; cap[via[v] ^ 1] += push; }
    flow += push;
  }
}
` }, { lang: 'cpp', code: `class Solution {
public:
    long long maxFlow(int n, vector<vector<int>>& edges) {
        vector<int> to;
        vector<long long> cap;                       // edge 2i forward, 2i + 1 its undo edge
        vector<vector<int>> g(n);
        for (auto& e : edges) {
            g[e[0]].push_back(to.size()); to.push_back(e[1]); cap.push_back(e[2]);
            g[e[1]].push_back(to.size()); to.push_back(e[0]); cap.push_back(0);
        }
        int s = 0, t = n - 1;
        long long flow = 0;
        vector<int> via(n);
        while (true) {
            fill(via.begin(), via.end(), -1);
            via[s] = -2;                             // mark the source as visited
            queue<int> q;
            q.push(s);
            while (!q.empty() && via[t] == -1) {     // BFS for the shortest augmenting path
                int v = q.front(); q.pop();
                for (int e : g[v])
                    if (cap[e] > 0 && via[to[e]] == -1) { via[to[e]] = e; q.push(to[e]); }
            }
            if (via[t] == -1) return flow;           // sink unreachable: done
            long long push = LLONG_MAX;
            for (int v = t; v != s; v = to[via[v] ^ 1]) push = min(push, cap[via[v]]);
            for (int v = t; v != s; v = to[via[v] ^ 1]) { cap[via[v]] -= push; cap[via[v] ^ 1] += push; }
            flow += push;
        }
    }
};
` }],
        dry: {
          head: ['round', 'BFS path (head order = latest edge first)', 'bottleneck', 'total'],
          rows: [
            ['1', '0 → 2 → 3', 'min(2, 3) = 2', '2'],
            ['2', '0 → 1 → 3', 'min(3, 2) = 2', '4'],
            ['3', '0 → 1 → 2 → 3', 'min(1, 2, 1) = 1', '5'],
            ['4', '0→1 and 0→2 both full → 3 unreachable', '—', H.c('g', '<b>5</b>')]
          ]
        },
        complexity: `<p>Time <b>O(V · E²)</b> worst case (in practice far less), space <b>O(V + E)</b>.</p>`,
        followUps: ['Return the flow on every original edge.', 'Several sources and sinks? (Add a super source and a super sink.)', 'Find the edges of a minimum cut.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 7 — Dinic's algorithm (level graph + blocking flow)
  // =====================================================================
  topics.push({
    title: 'Maximum Flow II: Dinic\'s Algorithm (Level Graph + Blocking Flow)',
    analogy: `<p>Evacuating a stadium. Edmonds-Karp sends <b>one group at a time</b> down the shortest corridor, then re-plans from scratch. Dinic is smarter: first a steward walks the building and paints each corridor with its <b>distance from the field</b> (level 1, 2, 3, …). Then crowds are only allowed to walk <b>forward one level at a time</b>, and many groups are sent in one go until every forward route is jammed.</p>
      <p>Corridors that turned out to be dead ends get a "<b>closed</b>" sign so nobody wastes time there again. Only when all forward routes are full does the steward repaint the distances.</p>`,
    explain: `<p>Dinic (1970) runs in <b>phases</b>. Each phase has two steps:</p>
      <ol>
        <li><b>BFS → level graph.</b> From S, compute <code>level[v]</code> = BFS distance in the residual graph. Keep only edges with residual &gt; 0 that go from level L to level <b>L + 1</b>. This "level graph" has no cycles and every S→T path in it is a <b>shortest</b> path.</li>
        <li><b>DFS → blocking flow.</b> Push flow along S→T paths of the level graph again and again until <b>every</b> S→T path in it has a full edge ("blocked"). The trick that makes this fast is the <b>current-edge pointer</b> <code>it[v]</code>: once an edge out of v is useless (full, or leads to a dead end), v never looks at it again in this phase.</li>
      </ol>
      <p>Repeat phases until BFS cannot reach T. Each phase makes the S→T distance <b>strictly longer</b>, so there are at most <b>V − 1</b> phases.</p>
      ${H.table(['algorithm', 'one round does', 'worst case', 'typical use'], [
        ['Ford-Fulkerson (DFS)', 'one path, any length', 'O(E · F)', 'tiny capacities only'],
        ['Edmonds-Karp', 'one shortest path', 'O(V · E²)', 'small graphs, easy to write'],
        [H.c('g', 'Dinic'), 'a whole blocking flow on shortest paths', 'O(V² · E)', 'default choice in contests and interviews'],
        ['Dinic, unit capacities', '—', 'O(E · √E)', 'edge-disjoint paths'],
        ['Dinic, unit bipartite graph', '—', 'O(E · √V)', 'matching (= Hopcroft-Karp)']
      ])}
      <p><b>Mini example</b> (S→A:10, S→C:10, A→B:4, A→C:2, A→D:8, C→D:9, D→B:6, B→T:10, D→T:10). Phase 1 levels: S = 0; A, C = 1; B, D = 2; T = 3. Edges A→C and D→B stay inside one level / go sideways, so they are <b>not</b> in the level graph. The blocking flow sends S→A→B→T (4), S→A→D→T (6), S→C→D→T (4)… until the level graph is jammed; the next phase uses longer paths such as S→C→D→B→T.</p>`,
    clues: [
      'Max-flow with <code>V ≈ 10<sup>3</sup>–10<sup>4</sup></code>, <code>E ≈ 10<sup>4</sup>–10<sup>5</sup></code> → Dinic (Edmonds-Karp will likely TLE).',
      '"<b>Edge-disjoint</b> / <b>vertex-disjoint</b> paths" (unit capacities) → Dinic runs in O(E√E).',
      '"Maximum matching" on a big bipartite graph (10<sup>5</sup> edges) → Dinic on the unit network (same bound as Hopcroft-Karp).',
      'Any flow model built by you (super source, node splitting, project selection) in a contest → write Dinic once and reuse it.',
      'Hints mentioning "<b>level graph</b>", "<b>blocking flow</b>", or "<b>current arc</b>" → Dinic.'
    ],
    code: [{ lang: 'java', code: `
      class Dinic {
          private final int n;
          private final int[] head, level, it;
          private final int[] next, to;      // forward-star edge storage; edge e's partner is e ^ 1
          private final long[] cap;          // residual capacities
          private int cnt = 0;

          Dinic(int n, int maxEdges) {
              this.n = n;
              head = new int[n];
              Arrays.fill(head, -1);
              level = new int[n];
              it = new int[n];
              next = new int[2 * maxEdges];
              to = new int[2 * maxEdges];
              cap = new long[2 * maxEdges];
          }

          void addEdge(int u, int v, long c) {
              to[cnt] = v; cap[cnt] = c; next[cnt] = head[u]; head[u] = cnt++;
              to[cnt] = u; cap[cnt] = 0; next[cnt] = head[v]; head[v] = cnt++;
          }

          private boolean bfs(int s, int t) {                // build levels; true if t reachable
              Arrays.fill(level, -1);
              int[] q = new int[n];
              int qh = 0, qt = 0;
              level[s] = 0;
              q[qt++] = s;
              while (qh < qt) {
                  int v = q[qh++];
                  for (int e = head[v]; e != -1; e = next[e])
                      if (cap[e] > 0 && level[to[e]] < 0) { level[to[e]] = level[v] + 1; q[qt++] = to[e]; }
              }
              return level[t] >= 0;
          }

          private long dfs(int v, int t, long f) {            // one augmenting path in the level graph
              if (v == t) return f;
              for (; it[v] != -1; it[v] = next[it[v]]) {      // it[v]: never retry a useless edge this phase
                  int e = it[v], w = to[e];
                  if (cap[e] > 0 && level[w] == level[v] + 1) {
                      long d = dfs(w, t, Math.min(f, cap[e]));
                      if (d > 0) { cap[e] -= d; cap[e ^ 1] += d; return d; }
                  }
              }
              return 0;                                       // v is a dead end for this phase
          }

          long maxFlow(int s, int t) {
              long flow = 0;
              while (bfs(s, t)) {                             // at most V - 1 phases
                  System.arraycopy(head, 0, it, 0, n);        // reset current-edge pointers
                  long f;
                  while ((f = dfs(s, t, Long.MAX_VALUE)) > 0) flow += f;   // blocking flow
              }
              return flow;
          }
      }`, alt: [{ lang: 'python', code: `from collections import deque


class Dinic:
    def __init__(self, n):
        self.n = n
        self.g = [[] for _ in range(n)]         # g[v] = ids of edges leaving v; edge e's partner is e ^ 1
        self.to = []
        self.cap = []                           # residual capacities

    def add_edge(self, u, v, c):
        self.g[u].append(len(self.to)); self.to.append(v); self.cap.append(c)
        self.g[v].append(len(self.to)); self.to.append(u); self.cap.append(0)

    def _bfs(self, s, t):                       # build levels; True if t reachable
        self.level = [-1] * self.n
        self.level[s] = 0
        q = deque([s])
        while q:
            v = q.popleft()
            for e in self.g[v]:
                w = self.to[e]
                if self.cap[e] > 0 and self.level[w] < 0:
                    self.level[w] = self.level[v] + 1
                    q.append(w)
        return self.level[t] >= 0

    def _dfs(self, v, t, f):                    # one augmenting path in the level graph (recursive)
        if v == t:
            return f
        while self.it[v] < len(self.g[v]):      # it[v]: never retry a useless edge this phase
            e = self.g[v][self.it[v]]
            w = self.to[e]
            if self.cap[e] > 0 and self.level[w] == self.level[v] + 1:
                d = self._dfs(w, t, min(f, self.cap[e]))
                if d > 0:
                    self.cap[e] -= d
                    self.cap[e ^ 1] += d
                    return d
            self.it[v] += 1
        return 0                                # v is a dead end for this phase

    def max_flow(self, s, t):
        flow = 0
        while self._bfs(s, t):                  # at most V - 1 phases
            self.it = [0] * self.n              # reset current-edge pointers
            while True:
                f = self._dfs(s, t, float('inf'))   # blocking flow
                if f == 0:
                    break
                flow += f
        return flow
` }, { lang: 'js', code: `class Dinic {
  constructor(n) {
    this.n = n;
    this.g = Array.from({ length: n }, () => []);   // g[v] = ids of edges leaving v; edge e's partner is e ^ 1
    this.to = [];
    this.cap = [];                                  // residual capacities
  }

  addEdge(u, v, c) {
    this.g[u].push(this.to.length); this.to.push(v); this.cap.push(c);
    this.g[v].push(this.to.length); this.to.push(u); this.cap.push(0);
  }

  bfs(s, t) {                                       // build levels; true if t reachable
    this.level = new Array(this.n).fill(-1);
    this.level[s] = 0;
    const q = [s];
    for (let h = 0; h < q.length; h++) {
      const v = q[h];
      for (const e of this.g[v]) {
        const w = this.to[e];
        if (this.cap[e] > 0 && this.level[w] < 0) { this.level[w] = this.level[v] + 1; q.push(w); }
      }
    }
    return this.level[t] >= 0;
  }

  dfs(v, t, f) {                                    // one augmenting path in the level graph
    if (v === t) return f;
    for (; this.it[v] < this.g[v].length; this.it[v]++) {   // it[v]: never retry a useless edge this phase
      const e = this.g[v][this.it[v]], w = this.to[e];
      if (this.cap[e] > 0 && this.level[w] === this.level[v] + 1) {
        const d = this.dfs(w, t, Math.min(f, this.cap[e]));
        if (d > 0) { this.cap[e] -= d; this.cap[e ^ 1] += d; return d; }
      }
    }
    return 0;                                       // v is a dead end for this phase
  }

  maxFlow(s, t) {
    let flow = 0;
    while (this.bfs(s, t)) {                        // at most V - 1 phases
      this.it = new Array(this.n).fill(0);          // reset current-edge pointers
      let f;
      while ((f = this.dfs(s, t, Infinity)) > 0) flow += f;   // blocking flow
    }
    return flow;
  }
}
` }, { lang: 'cpp', code: `class Dinic {
    int n;
    vector<int> head, level, it;    // head[v] = first edge of v; it = current-edge pointers
    vector<int> nxt, to;            // forward-star edge storage; edge e's partner is e ^ 1
    vector<long long> cap;          // residual capacities

    bool bfs(int s, int t) {                            // build levels; true if t reachable
        fill(level.begin(), level.end(), -1);
        queue<int> q;
        level[s] = 0;
        q.push(s);
        while (!q.empty()) {
            int v = q.front();
            q.pop();
            for (int e = head[v]; e != -1; e = nxt[e])
                if (cap[e] > 0 && level[to[e]] < 0) { level[to[e]] = level[v] + 1; q.push(to[e]); }
        }
        return level[t] >= 0;
    }

    long long dfs(int v, int t, long long f) {          // one augmenting path in the level graph
        if (v == t) return f;
        for (int& e = it[v]; e != -1; e = nxt[e]) {     // it[v]: never retry a useless edge this phase
            int w = to[e];
            if (cap[e] > 0 && level[w] == level[v] + 1) {
                long long d = dfs(w, t, min(f, cap[e]));
                if (d > 0) { cap[e] -= d; cap[e ^ 1] += d; return d; }
            }
        }
        return 0;                                       // v is a dead end for this phase
    }

public:
    explicit Dinic(int n) : n(n), head(n, -1), level(n, -1), it(n, -1) {}

    void addEdge(int u, int v, long long c) {
        to.push_back(v); cap.push_back(c); nxt.push_back(head[u]); head[u] = to.size() - 1;
        to.push_back(u); cap.push_back(0); nxt.push_back(head[v]); head[v] = to.size() - 1;
    }

    long long maxFlow(int s, int t) {
        long long flow = 0;
        while (bfs(s, t)) {                             // at most V - 1 phases
            it = head;                                  // reset current-edge pointers
            while (long long f = dfs(s, t, LLONG_MAX)) flow += f;   // blocking flow
        }
        return flow;
    }
};
` }] }, {
      lang: 'python', run: true, title: 'Dinic in Python on the CLRS network (answer 23) — runnable',
      code: `from collections import deque


class Dinic:
    def __init__(self, n):
        self.n = n
        self.g = [[] for _ in range(n)]     # g[v] = ids of edges leaving v
        self.to, self.cap = [], []

    def add_edge(self, u, v, c):
        self.g[u].append(len(self.to)); self.to.append(v); self.cap.append(c)
        self.g[v].append(len(self.to)); self.to.append(u); self.cap.append(0)

    def bfs(self, s, t):
        self.level = [-1] * self.n
        self.level[s] = 0
        q = deque([s])
        while q:
            v = q.popleft()
            for e in self.g[v]:
                w = self.to[e]
                if self.cap[e] > 0 and self.level[w] < 0:
                    self.level[w] = self.level[v] + 1
                    q.append(w)
        return self.level[t] >= 0

    def dfs(self, v, t, f):
        if v == t:
            return f
        while self.it[v] < len(self.g[v]):
            e = self.g[v][self.it[v]]
            w = self.to[e]
            if self.cap[e] > 0 and self.level[w] == self.level[v] + 1:
                d = self.dfs(w, t, min(f, self.cap[e]))
                if d > 0:
                    self.cap[e] -= d
                    self.cap[e ^ 1] += d
                    return d
            self.it[v] += 1                 # this edge is useless for the rest of the phase
        return 0

    def max_flow(self, s, t):
        flow, phases = 0, 0
        while self.bfs(s, t):
            phases += 1
            self.it = [0] * self.n
            while True:
                f = self.dfs(s, t, float("inf"))
                if f == 0:
                    break
                flow += f
        return flow, phases


d = Dinic(6)    # s=0, v1=1, v2=2, v3=3, v4=4, t=5
for u, v, c in [(0, 1, 16), (0, 2, 13), (1, 2, 10), (2, 1, 4), (1, 3, 12),
                (3, 2, 9), (2, 4, 14), (4, 3, 7), (3, 5, 20), (4, 5, 4)]:
    d.add_edge(u, v, c)
flow, phases = d.max_flow(0, 5)
print("max flow =", flow, "found in", phases, "phases")
`
    }],
    codeTitle: ['Dinic (forward-star arrays, current-edge pointers)', 'Dinic in Python'],
    viz: {
      title: 'Dinic live: BFS levels (tags), level-graph edges (blue), blocking flow, dead-end pruning',
      input: 'S>A:10 S>C:10 A>B:4 A>C:2 A>D:8 C>D:9 D>B:6 B>T:10 D>T:10',
      inputLabel: 'Edges "u>v:capacity" with source S and sink T (up to 9 nodes, 16 edges)',
      gen: function (input) {
        var P = parseFlow(input), N = buildNet(P.ids, P.edges), E = N.E, s = N.idx.S, t = N.idx.T;
        var nodes = layered(P.ids, P.edges, 'S', 'T', 70), frames = [], total = 0, phase = 0, level = [];
        function tagsNow() { var o = {}; P.ids.forEach(function (id, i) { o[id] = level[i] >= 0 ? 'L' + level[i] : 'L—'; }); return o; }
        function G(hl, extra, label) {
          var ehl = flowEhl(P.edges, E);
          for (var k in extra) ehl[k] = extra[k];
          return { type: 'graph', label: label, directed: true, height: 70, nodes: nodes, edges: flowEdges(P.edges, E), hl: hl || {}, ehl: ehl, tags: tagsNow() };
        }
        level = P.ids.map(function () { return -1; });
        frames.push({ narr: '<b>Dinic</b>: labels are flow/capacity. Each phase = (1) BFS to give every node a <b>level</b>, (2) push a <b>blocking flow</b> using only edges that go exactly one level forward.', parts: [G({ S: 'sel', T: 'sel' }, {}, 'network'), { type: 'vars', vals: { phase: 0, 'total flow': 0 } }] });
        while (phase < 10) {
          level = P.ids.map(function () { return -1; });
          level[s] = 0;
          var q = [s];
          while (q.length) { var v = q.shift(); N.g[v].forEach(function (id) { var w = E[id].v; if (resid(E, id) > 0 && level[w] < 0) { level[w] = level[v] + 1; q.push(w); } }); }
          if (level[t] < 0) {
            var fh = {};
            P.ids.forEach(function (id, i) { fh[id] = level[i] >= 0 ? 'ok' : 'bad'; });
            frames.push({ narr: 'BFS can no longer reach T (tag L— = unreachable). <b>Maximum flow = ' + total + '</b> after ' + phase + ' phase' + (phase === 1 ? '' : 's') + '. Green = still reachable from S, red = not: the full edges between them form a minimum cut.', parts: [G(fh, {}, 'final flow'), { type: 'vars', label: 'result', vals: { 'max flow': total, phases: phase } }] });
            break;
          }
          phase++;
          var lvlE = {};
          P.edges.forEach(function (e, k) {
            var a = N.idx[e[0]], b = N.idx[e[1]];
            if (resid(E, 2 * k) > 0 && level[b] === level[a] + 1) lvlE[e[0] + '-' + e[1]] = 'win';
            else if (resid(E, 2 * k + 1) > 0 && level[a] === level[b] + 1) lvlE[e[0] + '-' + e[1]] = 'sel';
          });
          frames.push({ narr: '<b>Phase ' + phase + ' — BFS levels</b> (tags L0, L1, …). The level graph keeps only edges with spare room going from level L to L + 1 (<span class="c-b">blue</span>)' + (Object.keys(lvlE).some(function (k) { return lvlE[k] === 'sel'; }) ? ', plus usable <b>reverse</b> edges (<span class="c-p">purple</span> = flow can be undone in that direction)' : '') + '. S→T distance is now <b>' + level[t] + '</b>.', parts: [G({ S: 'sel', T: 'sel' }, lvlE, 'level graph, phase ' + phase), { type: 'vars', vals: { phase: phase, 'dist(S,T)': level[t], 'total flow': total } }] });
          var it = P.ids.map(function () { return 0; }), dead = {}, phaseFlow = 0, guard = 0;
          while (guard++ < 30) {
            var path = [];
            var d = (function dfs(v, f) {
              if (v === t) return f;
              for (; it[v] < N.g[v].length; it[v]++) {
                var id = N.g[v][it[v]], w = E[id].v;
                if (resid(E, id) > 0 && level[w] === level[v] + 1) {
                  var got = dfs(w, Math.min(f, resid(E, id)));
                  if (got > 0) { path.unshift(id); return got; }
                }
              }
              if (v !== s) dead[P.ids[v]] = true;
              return 0;
            })(s, Infinity);
            var dh = {};
            Object.keys(dead).forEach(function (k) { dh[k] = 'bad'; });
            if (!d) {
              frames.push({ narr: 'No more S→T paths inside this level graph — the flow is <b>blocking</b>. Phase ' + phase + ' added <b>' + phaseFlow + '</b>.' + (Object.keys(dead).length ? ' Dead ends found and skipped forever this phase: <b>' + Object.keys(dead).join(', ') + '</b> (red).' : '') + ' Rebuild levels.', parts: [G(dh, {}, 'blocked'), { type: 'vars', vals: { phase: phase, 'phase flow': phaseFlow, 'total flow': total } }] });
              break;
            }
            var ex = {}, hl = {}, names = ['S'];
            path.forEach(function (id) { var e = E[id], o = P.edges[e.k]; ex[o[0] + '-' + o[1]] = (id & 1) ? 'sel' : 'cur'; hl[P.ids[e.v]] = 'cur'; names.push(P.ids[e.v]); });
            hl.S = 'cur';
            Object.keys(dead).forEach(function (k) { hl[k] = 'bad'; });
            path.forEach(function (id) { push(E, id, d); });
            total += d; phaseFlow += d;
            frames.push({ narr: 'DFS in the level graph: <b>' + names.join(' → ') + '</b>, bottleneck <b>' + d + '</b>. Pushed. ' + (Object.keys(dead).length ? 'Dead ends so far (never retried this phase): ' + Object.keys(dead).join(', ') + '. ' : '') + 'Total flow = <b>' + total + '</b>.', parts: [G(hl, ex, 'phase ' + phase + ': pushing'), { type: 'vars', vals: { phase: phase, pushed: d, 'phase flow': phaseFlow, 'total flow': total } }] });
          }
        }
        return frames;
      }
    },
    examples: [
      { title: 'Why the level graph forbids "sideways" edges', html: `<p>In phase 1 of the default network, A→C goes from level 1 to level 1. Using it would make a path longer than the shortest S→T distance (3). Dinic only augments along <b>shortest</b> paths in a phase, which is exactly what guarantees the distance grows after every phase.</p>${H.table(['edge', 'levels', 'in level graph?'], [['S→A', '0 → 1', H.c('g', 'yes')], ['A→C', '1 → 1', H.c('r', 'no')], ['D→B', '2 → 2', H.c('r', 'no')], ['B→T', '2 → 3', H.c('g', 'yes')]])}` },
      { title: 'The current-edge pointer saves the day', html: `<p>Without <code>it[v]</code>, each DFS restarts scanning v's edges from the first one, re-checking full edges and dead ends: a phase can cost O(V·E²). With it, every edge is skipped at most once per phase, and each augmenting path costs O(V) extra → a phase is <b>O(V·E)</b>, total <b>O(V²·E)</b>.</p>` },
      { title: 'Unit capacities: edge-disjoint paths', html: `<p>All capacities 1. Every augmenting path saturates all its edges, so blocking flows are found very quickly; after about √E phases the remaining flow is at most √E. Total <b>O(E·√E)</b>. For bipartite matching (unit network where every middle node has in-degree or out-degree 1) it becomes <b>O(E·√V)</b> — the same as Hopcroft-Karp.</p>` },
      { title: 'Python check on the CLRS network', html: `<p>The runnable Python above prints <code>max flow = 23</code> for the textbook network (Cormen et al., Figure 26.1). The number of phases is small (a handful) even though Edmonds-Karp would need more separate BFS rounds — each Dinic phase pushes several paths.</p>` }
    ],
    deepDive: `<p><b>Proof that phases ≤ V − 1.</b> After a blocking flow, every shortest S→T path in the old level graph contains a saturated edge. New residual edges created by pushing go from level L+1 back to level L (reverse edges), which cannot create a path of the same length. So the new shortest distance is strictly larger. Distances are at most V − 1 → at most V − 1 phases.</p>
      <p><b>Recursion depth:</b> the DFS goes at most level[t] ≤ V deep, so for V ≤ 10<sup>4</sup> recursion is fine in Java, C++ and JavaScript; Python needs the iterative form (see the Python version above) or a raised recursion limit. For huge V write it iteratively or raise the stack.</p>
      <p><b>Engineering tricks used in fast implementations:</b></p>
      <ul>
        <li><b>Multi-push DFS</b>: instead of returning after one path, let <code>dfs(v, f)</code> keep pushing through other edges until f is used up — fewer recursive calls.</li>
        <li><b>Mark dead nodes</b>: if dfs(w) returns 0, set <code>level[w] = -1</code> so nobody enters w again this phase.</li>
        <li><b>Capacity scaling</b>: run phases only on edges with residual ≥ Δ, halving Δ — O(V·E·log U) and great for wildly different capacities.</li>
        <li><b>Push-relabel</b> (Goldberg–Tarjan, with gap and global-relabel heuristics) is often the fastest in practice for dense graphs; modern theory has almost-linear-time max flow (Chen, Kyng, Liu, Peng, Probst Gutenberg, Sachdeva, 2022), but contests and industry still mostly use Dinic or push-relabel.</li>
      </ul>
      <p><b>Real-world use:</b> OR-Tools, LEMON and Boost all ship push-relabel and related solvers; image-segmentation graph cuts use the Boykov–Kolmogorov algorithm, which is tuned for grid-like graphs.</p>`,
    aiEra: `<p><b>What AI changes:</b> a Dinic template is easy to paste. Competitive programmers have done that for decades; AI just makes it universal. What still separates people is <b>modelling</b> (turning a story into a network) and <b>debugging</b> a wrong model.</p>
      <p><b>Use AI as a partner:</b> keep one trusted Dinic and ask AI to build random networks plus a slow Edmonds-Karp to cross-check. Ask it "<i>Which edges of this flow model have capacity infinity and why?</i>" — making it explain your own model is a great sanity check.</p>
      <p><b>Where AI goes wrong:</b> forgetting to reset <code>it[]</code> at the start of each phase, resetting it inside the inner loop (back to O(V·E²)), checking <code>level[w] &gt; level[v]</code> instead of <code>== level[v] + 1</code>, and using the 32-bit maximum as "infinity" while summing capacities in a 32-bit <code>int</code> (overflow).</p>
      <p><b>What you must still own:</b> knowing the complexity bounds well enough to choose Edmonds-Karp vs Dinic vs push-relabel from the constraints, and the unit-capacity special cases that make Dinic dramatically faster.</p>`,
    problems: [{
      title: 'Maximum Number of Edge-Disjoint Paths',
      level: 'Medium', tags: ['max flow', 'dinic', 'menger'], companies: ['Google', 'Cisco', 'Juniper'],
      statement: `<p>A directed graph has <code>n</code> nodes and a list of one-way roads. Return the maximum number of paths from <code>s</code> to <code>t</code> such that <b>no road is used by two paths</b> (paths may share nodes).</p>`,
      constraints: `<p>2 ≤ n ≤ 10<sup>4</sup>, 1 ≤ E ≤ 10<sup>5</sup>, s ≠ t.</p>`,
      example: `<p>n = 6, s = 0, t = 5, roads <code>0→1, 1→4, 1→2, 2→5, 0→3, 3→4, 4→5</code> → <b>${H.c('g', '2')}</b>: paths 0→1→2→5 and 0→3→4→5.</p><p>Why it is tricky: the "shortest-looking" path 0→1→4→5 blocks both of these, and after taking it greedily only <b>1</b> path remains possible.</p>`,
      brute: {
        why: `<p>The tempting brute: find a path, delete its roads, repeat. It is <b>wrong</b>, not just slow: on the example BFS finds 0→1→4→5 first and then nothing else, answering 1 instead of 2. Fixing it needs the ability to <b>undo</b> a road choice — which is exactly what reverse edges in a flow network give you.</p>`,
        code: `class Brute {
    // Tempting but WRONG: take a shortest path, delete its roads, repeat.
    int edgeDisjointPaths(int n, int[][] edges, int s, int t) {
        boolean[] removed = new boolean[edges.length];
        int count = 0;
        while (true) {
            int[] via = new int[n];
            Arrays.fill(via, -1);
            boolean[] seen = new boolean[n];
            Deque<Integer> q = new ArrayDeque<>();
            q.add(s);
            seen[s] = true;
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int i = 0; i < edges.length; i++)
                    if (!removed[i] && edges[i][0] == u && !seen[edges[i][1]]) {
                        seen[edges[i][1]] = true; via[edges[i][1]] = i; q.add(edges[i][1]);
                    }
            }
            if (!seen[t]) return count;
            for (int v = t; v != s; v = edges[via[v]][0]) removed[via[v]] = true;   // delete the path
            count++;
        }
    }
}`
      },
      mcq: { q: 'What capacity should each road get in the flow model?', options: ['1', 'infinity', 'its length', 'the number of nodes'], answer: 0, explain: 'Each road may be used by at most one path, so capacity 1. By integrality, a max flow of value k splits into k edge-disjoint paths (Menger\'s theorem).' },
      hints: [
        `<p>Hint 1: "Each road used at most once" = capacity 1 on every edge. The number of disjoint paths equals the max flow (Menger's theorem).</p>`,
        `<p>Hint 2: Greedy path deletion fails; flow fixes it with reverse edges. With unit capacities Dinic needs only O(√E) phases.</p>`,
        `<p>Hint 3: Recipe — build Dinic with cap 1 per road, run maxFlow(s, t). To list the paths, repeatedly walk from s along edges with flow 1, clearing them as you go.</p>`
      ],
      tests: { sig: "string int int[][] int int -> int", fn: "paths", cases: [
          [["",6,[[0,1],[1,4],[1,2],[2,5],[0,3],[3,4],[4,5]],0,5],2],
          [["",2,[[0,1]],0,1],1],
          [["",2,[[1,0]],0,1],0],
          [["",3,[[0,1],[0,1],[0,1],[1,2],[1,2]],0,2],2],
          [["",4,[[0,1],[1,2],[2,3],[3,0],[1,3]],2,0],1],
          [["",5,[[3,4],[4,1],[3,2],[2,1],[3,1],[1,3]],3,1],3],
          [["",2,[[1,0]],1,0],1],
          [["",5,[[2,3],[1,0],[3,2],[0,1]],1,2],0],
          [["",4,[[0,3],[0,1],[0,1],[2,3],[0,3],[2,3],[2,3],[2,3],[3,0],[0,1],[1,0],[0,3],[1,2],[1,3],[2,3],[1,2]],0,1],3],
          [["",9,[[1,5],[3,0],[6,8],[4,7],[5,8],[1,4]],5,8],1],
          [["",9,[[5,8],[8,4],[7,0],[4,2],[6,4],[6,8],[5,7],[3,5],[6,4],[2,3],[0,1],[8,7],[5,0],[5,6]],6,8],2],
          [["",4,[[2,3],[2,3],[0,3],[2,3],[0,1],[0,3],[3,2],[2,3],[2,3],[3,1],[0,2],[3,0],[0,2],[1,2],[0,1],[1,2]],0,1],3],
          [["",3,[[0,2]],2,0],0],
          [["",3,[[1,2],[1,2],[2,0],[2,1],[2,1],[1,0],[1,2]],0,1],0],
          [["",8,[[6,3],[2,7],[2,3],[3,6],[3,7],[4,3],[2,4],[2,7],[4,7],[6,3],[3,5],[7,4],[5,1],[5,3]],4,6],1],
          [["",5,[[0,3],[3,4],[1,2],[0,3],[4,3]],4,0],0],
          [["chain",10000,[],0,9999],1],
          [["chainTwice",10000,[],0,9999],2],
          [["multi",9992,[],0,1],10],
          [["fan",10000,[],0,9999],9998],
          [["bip",632,[],0,631],315]
        ], harness: { java: `class Check {
  static int paths(String kind, int n, int[][] edges, int s, int t) {
    if (!kind.isEmpty()) {
      List<int[]> e = new ArrayList<>();
      if (kind.equals("chain") || kind.equals("chainTwice")) {
        for (int i = 0; i + 1 < n; i++) { e.add(new int[]{i, i + 1}); if (kind.equals("chainTwice")) e.add(new int[]{i, i + 1}); }
      } else if (kind.equals("multi")) {
        for (int j = 0; j < 10; j++) {
          int first = 2 + j * 999, last = first + 998;
          e.add(new int[]{0, first});
          for (int v = first; v < last; v++) e.add(new int[]{v, v + 1});
          e.add(new int[]{last, 1});
        }
      } else if (kind.equals("fan")) {
        for (int i = 1; i < n - 1; i++) { e.add(new int[]{0, i}); e.add(new int[]{i, n - 1}); }
      } else {
        int k = (n - 2) / 2;
        for (int a = 1; a <= k; a++) { e.add(new int[]{0, a}); e.add(new int[]{k + a, n - 1}); for (int b = 1; b <= k; b++) e.add(new int[]{a, k + b}); }
      }
      edges = e.toArray(new int[0][]);
    }
    return new Solution().edgeDisjointPaths(n, edges, s, t);
  }
}`, python: `def paths(kind, n, edges, s, t):
    if kind in ('chain', 'chainTwice'):
        edges = [[i, i + 1] for i in range(n - 1)] * (2 if kind == 'chainTwice' else 1)
    elif kind == 'multi':
        edges = []
        for j in range(10):
            first = 2 + j * 999
            last = first + 998
            edges.append([0, first])
            edges += [[v, v + 1] for v in range(first, last)]
            edges.append([last, 1])
    elif kind == 'fan':
        edges = [[0, i] for i in range(1, n - 1)] + [[i, n - 1] for i in range(1, n - 1)]
    elif kind == 'bip':
        k = (n - 2) // 2
        edges = [[0, a] for a in range(1, k + 1)] + [[k + a, n - 1] for a in range(1, k + 1)]
        edges += [[a, k + b] for a in range(1, k + 1) for b in range(1, k + 1)]
    return edge_disjoint_paths(n, edges, s, t)`, js: `function paths(kind, n, edges, s, t) {
  if (kind === 'chain' || kind === 'chainTwice') {
    edges = [];
    for (let i = 0; i + 1 < n; i++) { edges.push([i, i + 1]); if (kind === 'chainTwice') edges.push([i, i + 1]); }
  } else if (kind === 'multi') {
    edges = [];
    for (let j = 0; j < 10; j++) {
      const first = 2 + j * 999, last = first + 998;
      edges.push([0, first]);
      for (let v = first; v < last; v++) edges.push([v, v + 1]);
      edges.push([last, 1]);
    }
  } else if (kind === 'fan') {
    edges = [];
    for (let i = 1; i < n - 1; i++) { edges.push([0, i]); edges.push([i, n - 1]); }
  } else if (kind === 'bip') {
    edges = [];
    const k = (n - 2) / 2;
    for (let a = 1; a <= k; a++) {
      edges.push([0, a]); edges.push([k + a, n - 1]);
      for (let b = 1; b <= k; b++) edges.push([a, k + b]);
    }
  }
  return edgeDisjointPaths(n, edges, s, t);
}`, cpp: `int paths(string kind, int n, vector<vector<int>> edges, int s, int t) {
  if (kind == "chain" || kind == "chainTwice") {
    edges.clear();
    for (int i = 0; i + 1 < n; i++) { edges.push_back({i, i + 1}); if (kind == "chainTwice") edges.push_back({i, i + 1}); }
  } else if (kind == "multi") {
    edges.clear();
    for (int j = 0; j < 10; j++) {
      int first = 2 + j * 999, last = first + 998;
      edges.push_back({0, first});
      for (int v = first; v < last; v++) edges.push_back({v, v + 1});
      edges.push_back({last, 1});
    }
  } else if (kind == "fan") {
    edges.clear();
    for (int i = 1; i < n - 1; i++) { edges.push_back({0, i}); edges.push_back({i, n - 1}); }
  } else if (kind == "bip") {
    edges.clear();
    int k = (n - 2) / 2;
    for (int a = 1; a <= k; a++) {
      edges.push_back({0, a}); edges.push_back({k + a, n - 1});
      for (int b = 1; b <= k; b++) edges.push_back({a, k + b});
    }
  }
  return Solution().edgeDisjointPaths(n, edges, s, t);
}` } },
      solution: {
        approach: `<p>Unit-capacity network + Dinic. Adjacency lists keep edges in input order so the dry run matches. Phase 2 of the example shows the reverse edge 4→1 rerouting the first path.</p>`,
        code: `class Solution {
    int edgeDisjointPaths(int n, int[][] edges, int s, int t) {
        int m = edges.length;
        int[] to = new int[2 * m], cap = new int[2 * m];
        List<List<Integer>> g = new ArrayList<>();
        for (int i = 0; i < n; i++) g.add(new ArrayList<>());
        for (int i = 0; i < m; i++) {
            int u = edges[i][0], v = edges[i][1];
            to[2 * i] = v;     cap[2 * i] = 1;     g.get(u).add(2 * i);       // each road usable once
            to[2 * i + 1] = u; cap[2 * i + 1] = 0; g.get(v).add(2 * i + 1);   // undo edge
        }
        int[] level = new int[n], it = new int[n], path = new int[n];
        int paths = 0;
        while (bfs(g, to, cap, level, s, t)) {
            Arrays.fill(it, 0);
            int len = 0, v = s;                    // path[0 .. len) = roads on the walk from s to v
            while (true) {
                if (v == t) {                      // found a path: use every road on it, start again
                    for (int i = 0; i < len; i++) { cap[path[i]]--; cap[path[i] ^ 1]++; }
                    paths++;
                    len = 0;
                    v = s;
                    continue;
                }
                boolean moved = false;
                List<Integer> out = g.get(v);
                while (it[v] < out.size()) {
                    int e = out.get(it[v]);
                    if (cap[e] > 0 && level[to[e]] == level[v] + 1) { path[len++] = e; v = to[e]; moved = true; break; }
                    it[v]++;
                }
                if (!moved) {
                    if (v == s) break;             // nothing left in this level graph
                    v = to[path[--len] ^ 1];       // dead end: step back and skip that road
                    it[v]++;
                }
            }
        }
        return paths;
    }

    private boolean bfs(List<List<Integer>> g, int[] to, int[] cap, int[] level, int s, int t) {
        Arrays.fill(level, -1);
        level[s] = 0;
        Deque<Integer> q = new ArrayDeque<>();
        q.add(s);
        while (!q.isEmpty()) {
            int v = q.poll();
            for (int e : g.get(v)) if (cap[e] > 0 && level[to[e]] < 0) { level[to[e]] = level[v] + 1; q.add(to[e]); }
        }
        return level[t] >= 0;
    }
}`,
      alt: [{ lang: 'python', code: `from collections import deque


def edge_disjoint_paths(n, edges, s, t):
    to, cap = [], []                       # edge 2i is the road, 2i + 1 its undo edge
    g = [[] for _ in range(n)]
    for u, v in edges:
        g[u].append(len(to)); to.append(v); cap.append(1)      # each road usable once
        g[v].append(len(to)); to.append(u); cap.append(0)
    paths = 0
    while True:
        level = [-1] * n                   # Dinic phase: BFS levels
        level[s] = 0
        queue = deque([s])
        while queue:
            v = queue.popleft()
            for e in g[v]:
                if cap[e] > 0 and level[to[e]] < 0:
                    level[to[e]] = level[v] + 1
                    queue.append(to[e])
        if level[t] < 0:
            return paths
        it = [0] * n                       # current-edge pointers
        path = []                          # edges of the path we are walking (an explicit stack)
        v = s
        while True:
            if v == t:                     # found a path: use every road on it, start again
                for e in path:
                    cap[e] -= 1
                    cap[e ^ 1] += 1
                paths += 1
                path.clear()
                v = s
                continue
            moved = False
            while it[v] < len(g[v]):
                e = g[v][it[v]]
                if cap[e] > 0 and level[to[e]] == level[v] + 1:
                    path.append(e)
                    v = to[e]
                    moved = True
                    break
                it[v] += 1
            if not moved:
                if v == s:                 # nothing left in this level graph
                    break
                v = to[path.pop() ^ 1]     # dead end: step back and skip that road
                it[v] += 1
` }, { lang: 'js', code: `function edgeDisjointPaths(n, edges, s, t) {
  const m = edges.length;
  const to = new Int32Array(2 * m), cap = new Int32Array(2 * m);   // edge 2i is the road, 2i + 1 its undo edge
  const g = Array.from({ length: n }, () => []);
  edges.forEach(([u, v], i) => {
    to[2 * i] = v; cap[2 * i] = 1; g[u].push(2 * i);        // each road usable once
    to[2 * i + 1] = u; g[v].push(2 * i + 1);
  });
  const level = new Int32Array(n), it = new Int32Array(n), queue = new Int32Array(n);
  let paths = 0;
  for (;;) {
    level.fill(-1);                          // Dinic phase: BFS levels
    level[s] = 0;
    let head = 0, tail = 0;
    queue[tail++] = s;
    while (head < tail) {
      const v = queue[head++];
      for (const e of g[v]) if (cap[e] > 0 && level[to[e]] < 0) { level[to[e]] = level[v] + 1; queue[tail++] = to[e]; }
    }
    if (level[t] < 0) return paths;
    it.fill(0);                              // current-edge pointers
    const path = [];                         // edges of the path we are walking (an explicit stack)
    let v = s;
    for (;;) {
      if (v === t) {                         // found a path: use every road on it, start again
        for (const e of path) { cap[e]--; cap[e ^ 1]++; }
        paths++;
        path.length = 0;
        v = s;
        continue;
      }
      let moved = false;
      while (it[v] < g[v].length) {
        const e = g[v][it[v]];
        if (cap[e] > 0 && level[to[e]] === level[v] + 1) { path.push(e); v = to[e]; moved = true; break; }
        it[v]++;
      }
      if (!moved) {
        if (v === s) break;                  // nothing left in this level graph
        v = to[path.pop() ^ 1];              // dead end: step back and skip that road
        it[v]++;
      }
    }
  }
}
` }, { lang: 'cpp', code: `class Solution {
    vector<int> to, cap, level, it;
    vector<vector<int>> g;

    bool bfs(int s, int t) {
        fill(level.begin(), level.end(), -1);
        level[s] = 0;
        queue<int> q;
        q.push(s);
        while (!q.empty()) {
            int v = q.front(); q.pop();
            for (int e : g[v])
                if (cap[e] > 0 && level[to[e]] < 0) { level[to[e]] = level[v] + 1; q.push(to[e]); }
        }
        return level[t] >= 0;
    }

    int dfs(int v, int t, int f) {
        if (v == t) return f;
        for (int& i = it[v]; i < (int)g[v].size(); i++) {
            int e = g[v][i];
            if (cap[e] > 0 && level[to[e]] == level[v] + 1) {
                int d = dfs(to[e], t, min(f, cap[e]));
                if (d > 0) { cap[e] -= d; cap[e ^ 1] += d; return d; }
            }
        }
        return 0;
    }

public:
    int edgeDisjointPaths(int n, vector<vector<int>>& edges, int s, int t) {
        g.assign(n, {});
        to.clear(); cap.clear();
        for (auto& e : edges) {
            g[e[0]].push_back(to.size()); to.push_back(e[1]); cap.push_back(1);   // each road usable once
            g[e[1]].push_back(to.size()); to.push_back(e[0]); cap.push_back(0);   // undo edge
        }
        level.assign(n, -1);
        int paths = 0;
        while (bfs(s, t)) {
            it.assign(n, 0);
            int f;
            while ((f = dfs(s, t, INT_MAX)) > 0) paths += f;
        }
        return paths;
    }
};
` }],
        dry: {
          head: ['phase', 'levels', 'DFS result', 'paths'],
          rows: [
            ['1', '0:L0 · 1,3:L1 · 4,2:L2 · 5:L3', '0→1→4→5 (push 1)', '1'],
            ['1', 'same', '0→3→4: road 4→5 full, 4 is a dead end → blocked', '1'],
            ['2', '0:L0 · 3:L1 · 4:L2 · 1:L3 (via reverse 4→1) · 2:L4 · 5:L5', '0→3→4→' + H.c('p', '1') + '→2→5 (undoes 1→4)', '2'],
            ['3', 'both roads out of 0 are full → 5 unreachable', 'stop', H.c('g', '<b>2</b>')]
          ]
        },
        complexity: `<p>Unit capacities: <b>O(E·√E)</b> time, <b>O(V + E)</b> space.</p>`,
        followUps: ['Vertex-disjoint paths instead (hint: split each node v into v_in → v_out with capacity 1).', 'Undirected roads.', 'Print the actual paths.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 8 — Min cut (max-flow min-cut theorem) and how to use it
  // =====================================================================
  topics.push({
    title: 'Minimum Cut: The Max-Flow Min-Cut Theorem & Modelling with Cuts',
    analogy: `<p>An enemy wants to stop all supplies from a port (S) reaching a capital (T) by blowing up roads. Each road has a cost to destroy, equal to how much it can carry. The <b>cheapest set of roads</b> to destroy is a <b>minimum cut</b>.</p>
      <p>Here is the magic: the cheapest demolition bill is <b>exactly equal</b> to the most supplies you could ever ship. The narrowest "waist" of the network decides both. Find the max flow, and the min cut falls out for free.</p>`,
    explain: `<p>An <b>S-T cut</b> splits the nodes into two groups: the S-side (contains S) and the T-side (contains T). Its <b>capacity</b> is the sum of capacities of edges going <b>from the S-side to the T-side</b>. Edges going backwards (T-side → S-side) do <b>not</b> count.</p>
      <p><b>Two facts:</b></p>
      <ol>
        <li><b>Any flow ≤ any cut.</b> Every unit going from S to T must cross from the S-side to the T-side at least once, so it uses some cut edge.</li>
        <li><b>Max-flow min-cut theorem:</b> the maximum flow value <b>equals</b> the minimum cut capacity. When Ford-Fulkerson stops, the nodes still reachable from S in the residual graph form a cut whose edges are all full and whose backward edges are all empty — so flow = that cut, and by fact 1 both are optimal.</li>
      </ol>
      <p><b>How to find the min cut (3 lines after max flow):</b></p>
      <ol>
        <li>Run any max-flow algorithm.</li>
        <li>BFS/DFS from S using only residual edges with room &gt; 0. Mark everything reached as the <b>S-side</b>.</li>
        <li>Every <b>original</b> edge from a marked node to an unmarked node is a cut edge. Their capacities sum to the max flow.</li>
      </ol>
      ${H.table(['cut (S-side)', 'edges crossing S→T side', 'capacity'], [
        ['{S}', 'S→A 3, S→B 2', '5'],
        ['{S, A}', 'S→B 2, A→B 2, A→T 2', '6'],
        ['{S, A, B}', 'A→T 2, B→T 3', '5'],
        ['{S, B}', 'S→A 3, B→T 3', '6']
      ])}
      <p>For the network S→A:3, S→B:2, A→B:2, A→T:2, B→T:3 the minimum is <b>5</b> (two different min cuts tie), matching the max flow 5 from the previous topic.</p>
      <p><b>Why this matters in interviews:</b> many "minimum cost to separate / choose / forbid" problems are secretly min cut. You build a network where <b>every finite cut corresponds to a valid choice</b> and its capacity equals the cost. Then max flow solves it.</p>`,
    clues: [
      '"<b>Minimum cost to disconnect</b> A from B", "cheapest set of links to remove" → min S-T cut.',
      '"Minimum number of <b>nodes</b> to remove to separate" → split nodes (in → out, capacity 1), then min cut.',
      '"Choose projects for <b>max profit</b>, but a project needs certain tools / prerequisites" → project selection: max closure = total positive profit − min cut.',
      '"Label each pixel/item as A or B; cost for each label + penalty when neighbours differ" → graph-cut segmentation (min cut).',
      '"Can team X still win the league?" (baseball elimination) → flow network; X is eliminated iff max flow &lt; total remaining games.',
      'The answer equals a max flow, but the question asks "<b>which edges</b>" → residual BFS from S after max flow.'
    ],
    code: [{ lang: 'java', code: `
      class MinCut {
          // Capacity-matrix version (n up to a few hundred). Returns the cut edges {u, v}.
          static List<int[]> minCut(int[][] capacity, int s, int t) {
              int n = capacity.length;
              int[][] r = new int[n][];
              for (int i = 0; i < n; i++) r[i] = capacity[i].clone();     // residual capacities
              int[] parent = new int[n];
              while (bfs(r, s, t, parent)) {                                // Edmonds-Karp
                  int push = Integer.MAX_VALUE;
                  for (int v = t; v != s; v = parent[v]) push = Math.min(push, r[parent[v]][v]);
                  for (int v = t; v != s; v = parent[v]) { r[parent[v]][v] -= push; r[v][parent[v]] += push; }
              }
              bfs(r, s, -1, parent);                                        // who is still reachable?
              List<int[]> cut = new ArrayList<>();
              for (int u = 0; u < n; u++)
                  for (int v = 0; v < n; v++)
                      if (parent[u] != -1 && parent[v] == -1 && capacity[u][v] > 0) cut.add(new int[]{u, v});
              return cut;
          }

          // BFS over residual edges. parent[v] == -1 means "not reached" (parent[s] = s).
          static boolean bfs(int[][] r, int s, int t, int[] parent) {
              Arrays.fill(parent, -1);
              parent[s] = s;
              Deque<Integer> q = new ArrayDeque<>();
              q.add(s);
              while (!q.isEmpty()) {
                  int u = q.poll();
                  for (int v = 0; v < r.length; v++)
                      if (parent[v] == -1 && r[u][v] > 0) { parent[v] = u; q.add(v); }
              }
              return t >= 0 && parent[t] != -1;
          }
      }`, alt: [{ lang: 'python', code: `from collections import deque


def min_cut(capacity, s, t):
    # Capacity-matrix version (n up to a few hundred). Returns the cut edges (u, v).
    n = len(capacity)
    r = [row[:] for row in capacity]            # residual capacities

    def bfs(target):                            # parent[v] == -1 means "not reached" (parent[s] = s)
        parent = [-1] * n
        parent[s] = s
        q = deque([s])
        while q:
            u = q.popleft()
            for v in range(n):
                if parent[v] == -1 and r[u][v] > 0:
                    parent[v] = u
                    q.append(v)
        return parent if target < 0 or parent[target] != -1 else None

    while True:                                 # Edmonds-Karp
        parent = bfs(t)
        if parent is None:
            break
        push = float('inf')
        v = t
        while v != s:
            push = min(push, r[parent[v]][v])
            v = parent[v]
        v = t
        while v != s:
            r[parent[v]][v] -= push
            r[v][parent[v]] += push
            v = parent[v]
    reach = bfs(-1)                             # who is still reachable?
    return [(u, v) for u in range(n) for v in range(n)
            if reach[u] != -1 and reach[v] == -1 and capacity[u][v] > 0]
` }, { lang: 'js', code: `// Capacity-matrix version (n up to a few hundred). Returns the cut edges [u, v].
function minCut(capacity, s, t) {
  const n = capacity.length;
  const r = capacity.map((row) => row.slice());          // residual capacities

  // BFS over residual edges. parent[v] === -1 means "not reached" (parent[s] = s).
  function bfs() {
    const parent = new Array(n).fill(-1);
    parent[s] = s;
    const q = [s];
    for (let h = 0; h < q.length; h++) {
      const u = q[h];
      for (let v = 0; v < n; v++) if (parent[v] === -1 && r[u][v] > 0) { parent[v] = u; q.push(v); }
    }
    return parent;
  }

  for (;;) {                                             // Edmonds-Karp
    const parent = bfs();
    if (parent[t] === -1) break;
    let push = Infinity;
    for (let v = t; v !== s; v = parent[v]) push = Math.min(push, r[parent[v]][v]);
    for (let v = t; v !== s; v = parent[v]) { r[parent[v]][v] -= push; r[v][parent[v]] += push; }
  }
  const reach = bfs();                                   // who is still reachable?
  const cut = [];
  for (let u = 0; u < n; u++)
    for (let v = 0; v < n; v++)
      if (reach[u] !== -1 && reach[v] === -1 && capacity[u][v] > 0) cut.push([u, v]);
  return cut;
}
` }, { lang: 'cpp', code: `// Capacity-matrix version (n up to a few hundred). Returns the cut edges {u, v}.
// BFS over residual edges. parent[v] == -1 means "not reached" (parent[s] = s).
void residualBfs(const vector<vector<int>>& r, int s, vector<int>& parent) {
    parent.assign(r.size(), -1);
    parent[s] = s;
    queue<int> q;
    q.push(s);
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        for (int v = 0; v < (int)r.size(); v++)
            if (parent[v] == -1 && r[u][v] > 0) { parent[v] = u; q.push(v); }
    }
}

vector<pair<int, int>> minCut(const vector<vector<int>>& capacity, int s, int t) {
    int n = capacity.size();
    vector<vector<int>> r = capacity;                    // residual capacities
    vector<int> parent;
    while (true) {                                       // Edmonds-Karp
        residualBfs(r, s, parent);
        if (parent[t] == -1) break;
        int push = INT_MAX;
        for (int v = t; v != s; v = parent[v]) push = min(push, r[parent[v]][v]);
        for (int v = t; v != s; v = parent[v]) { r[parent[v]][v] -= push; r[v][parent[v]] += push; }
    }
    residualBfs(r, s, parent);                           // who is still reachable?
    vector<pair<int, int>> cut;
    for (int u = 0; u < n; u++)
        for (int v = 0; v < n; v++)
            if (parent[u] != -1 && parent[v] == -1 && capacity[u][v] > 0) cut.push_back({u, v});
    return cut;
}
` }] }, { lang: 'java', code: `
      class ProjectSelection {
          // profit[i] > 0: project earns money; profit[i] < 0: it is a cost (e.g. buying a tool).
          // need[i] = list of items that must also be chosen if i is chosen.
          // Answer = sum of positive profits - min cut.  (Uses the MinCut-style Edmonds-Karp on a matrix.)
          static long maxProfit(long[] profit, int[][] need) {
              int n = profit.length, s = n, t = n + 1;
              long INF = Long.MAX_VALUE / 4, positive = 0;
              long[][] r = new long[n + 2][n + 2];
              for (int i = 0; i < n; i++) {
                  if (profit[i] > 0) { r[s][i] = profit[i]; positive += profit[i]; }   // lose it if NOT chosen
                  else r[i][t] = -profit[i];                                          // pay it if chosen
                  for (int j : need[i]) r[i][j] = INF;                                // cannot cut a dependency
              }
              long flow = 0;
              int[] parent = new int[n + 2];
              while (true) {
                  Arrays.fill(parent, -1);
                  parent[s] = s;
                  Deque<Integer> q = new ArrayDeque<>();
                  q.add(s);
                  while (!q.isEmpty() && parent[t] == -1) {
                      int u = q.poll();
                      for (int v = 0; v < n + 2; v++) if (parent[v] == -1 && r[u][v] > 0) { parent[v] = u; q.add(v); }
                  }
                  if (parent[t] == -1) break;
                  long push = INF;
                  for (int v = t; v != s; v = parent[v]) push = Math.min(push, r[parent[v]][v]);
                  for (int v = t; v != s; v = parent[v]) { r[parent[v]][v] -= push; r[v][parent[v]] += push; }
                  flow += push;
              }
              return positive - flow;
          }
      }`, alt: [{ lang: 'python', code: `from collections import deque


def max_profit(profit, need):
    # profit[i] > 0: project earns money; profit[i] < 0: it is a cost (e.g. buying a tool).
    # need[i] = list of items that must also be chosen if i is chosen.
    # Answer = sum of positive profits - min cut.  (Edmonds-Karp on a matrix.)
    n = len(profit)
    s, t = n, n + 1
    INF = 1 << 60
    r = [[0] * (n + 2) for _ in range(n + 2)]
    positive = 0
    for i in range(n):
        if profit[i] > 0:
            r[s][i] = profit[i]                  # lose it if NOT chosen
            positive += profit[i]
        else:
            r[i][t] = -profit[i]                 # pay it if chosen
        for j in need[i]:
            r[i][j] = INF                        # cannot cut a dependency
    flow = 0
    while True:
        parent = [-1] * (n + 2)
        parent[s] = s
        q = deque([s])
        while q and parent[t] == -1:
            u = q.popleft()
            for v in range(n + 2):
                if parent[v] == -1 and r[u][v] > 0:
                    parent[v] = u
                    q.append(v)
        if parent[t] == -1:
            break
        push = INF
        v = t
        while v != s:
            push = min(push, r[parent[v]][v])
            v = parent[v]
        v = t
        while v != s:
            r[parent[v]][v] -= push
            r[v][parent[v]] += push
            v = parent[v]
        flow += push
    return positive - flow
` }, { lang: 'js', code: `// profit[i] > 0: project earns money; profit[i] < 0: it is a cost (e.g. buying a tool).
// need[i] = list of items that must also be chosen if i is chosen.
// Answer = sum of positive profits - min cut.  (Edmonds-Karp on a matrix.)
function maxProfit(profit, need) {
  const n = profit.length, s = n, t = n + 1;
  const INF = 1e15;                              // above any possible flow, and exact in a double
  const r = Array.from({ length: n + 2 }, () => new Array(n + 2).fill(0));
  let positive = 0;
  for (let i = 0; i < n; i++) {
    if (profit[i] > 0) { r[s][i] = profit[i]; positive += profit[i]; }   // lose it if NOT chosen
    else r[i][t] = -profit[i];                                          // pay it if chosen
    for (const j of need[i]) r[i][j] = INF;                             // cannot cut a dependency
  }
  let flow = 0;
  for (;;) {
    const parent = new Array(n + 2).fill(-1);
    parent[s] = s;
    const q = [s];
    for (let h = 0; h < q.length && parent[t] === -1; h++) {
      const u = q[h];
      for (let v = 0; v < n + 2; v++) if (parent[v] === -1 && r[u][v] > 0) { parent[v] = u; q.push(v); }
    }
    if (parent[t] === -1) break;
    let push = INF;
    for (let v = t; v !== s; v = parent[v]) push = Math.min(push, r[parent[v]][v]);
    for (let v = t; v !== s; v = parent[v]) { r[parent[v]][v] -= push; r[v][parent[v]] += push; }
    flow += push;
  }
  return positive - flow;
}
` }, { lang: 'cpp', code: `// profit[i] > 0: project earns money; profit[i] < 0: it is a cost (e.g. buying a tool).
// need[i] = list of items that must also be chosen if i is chosen.
// Answer = sum of positive profits - min cut.  (Edmonds-Karp on a matrix.)
long long maxProfit(const vector<long long>& profit, const vector<vector<int>>& need) {
    int n = profit.size(), s = n, t = n + 1;
    const long long INF = LLONG_MAX / 4;
    long long positive = 0;
    vector<vector<long long>> r(n + 2, vector<long long>(n + 2, 0));
    for (int i = 0; i < n; i++) {
        if (profit[i] > 0) { r[s][i] = profit[i]; positive += profit[i]; }   // lose it if NOT chosen
        else r[i][t] = -profit[i];                                          // pay it if chosen
        for (int j : need[i]) r[i][j] = INF;                                // cannot cut a dependency
    }
    long long flow = 0;
    vector<int> parent(n + 2);
    while (true) {
        fill(parent.begin(), parent.end(), -1);
        parent[s] = s;
        queue<int> q;
        q.push(s);
        while (!q.empty() && parent[t] == -1) {
            int u = q.front();
            q.pop();
            for (int v = 0; v < n + 2; v++) if (parent[v] == -1 && r[u][v] > 0) { parent[v] = u; q.push(v); }
        }
        if (parent[t] == -1) break;
        long long push = INF;
        for (int v = t; v != s; v = parent[v]) push = min(push, r[parent[v]][v]);
        for (int v = t; v != s; v = parent[v]) { r[parent[v]][v] -= push; r[v][parent[v]] += push; }
        flow += push;
    }
    return positive - flow;
}
` }] }],
    codeTitle: ['Max flow, then residual BFS → the cut edges', 'Min cut as a modelling tool: project selection / max-weight closure'],
    viz: {
      title: 'From max flow to min cut: run the flow, BFS the residual graph, read off the full edges',
      input: 'S>A:16 S>C:13 C>A:4 A>B:12 B>C:9 C>D:14 D>B:7 B>T:20 D>T:4',
      inputLabel: 'Edges "u>v:capacity" with source S and sink T (up to 9 nodes, 16 edges)',
      gen: function (input) {
        var P = parseFlow(input), N = buildNet(P.ids, P.edges), E = N.E, s = N.idx.S, t = N.idx.T;
        var nodes = layered(P.ids, P.edges, 'S', 'T', 70), frames = [], total = 0, round = 0;
        function G(hl, extra, label) {
          var ehl = flowEhl(P.edges, E);
          for (var k in extra) ehl[k] = extra[k];
          return { type: 'graph', label: label, directed: true, height: 70, nodes: nodes, edges: flowEdges(P.edges, E), hl: hl || {}, ehl: ehl };
        }
        frames.push({ narr: '<b>Step 1: compute a maximum flow</b> (Edmonds-Karp here; any algorithm works). Labels are flow/capacity.', parts: [G({ S: 'sel', T: 'sel' }, {}, 'network'), { type: 'vars', vals: { 'total flow': 0 } }] });
        while (round < 30) {
          var via = P.ids.map(function () { return -1; }), seen = P.ids.map(function () { return false; }), q = [s];
          seen[s] = true;
          while (q.length && !seen[t]) { var v = q.shift(); N.g[v].forEach(function (id) { var w = E[id].v; if (!seen[w] && resid(E, id) > 0) { seen[w] = true; via[w] = id; q.push(w); } }); }
          if (!seen[t]) break;
          var path = [], b = Infinity, ex = {}, names = [];
          for (var x = t; x !== s; x = E[via[x]].u) path.unshift(via[x]);
          path.forEach(function (id) { b = Math.min(b, resid(E, id)); var o = P.edges[E[id].k]; ex[o[0] + '-' + o[1]] = (id & 1) ? 'sel' : 'cur'; });
          names = ['S'].concat(path.map(function (id) { return P.ids[E[id].v]; }));
          path.forEach(function (id) { push(E, id, b); });
          total += b; round++;
          frames.push({ narr: 'Augment #' + round + ': ' + names.join(' → ') + ', push <b>' + b + '</b>. Total = <b>' + total + '</b>.', parts: [G({}, ex, 'max flow in progress'), { type: 'vars', vals: { 'total flow': total } }] });
        }
        var side = P.ids.map(function () { return false; }), order = [s], hl = {};
        side[s] = true; hl.S = 'ok';
        frames.push({ narr: '<b>Step 2: max flow = ' + total + '.</b> Now BFS from S using only residual edges that still have room (forward edges not full, or backward edges that carry flow). Start with S on the S-side.', parts: [G(copy(hl), {}, 'residual BFS from S'), { type: 'set', label: 'S-side', items: ['S'] }] });
        for (var i = 0; i < order.length; i++) {
          var u = order[i];
          N.g[u].forEach(function (id) {
            var w = E[id].v;
            if (!side[w] && resid(E, id) > 0) {
              side[w] = true; order.push(w); hl[P.ids[w]] = 'ok';
              var o = P.edges[E[id].k], back = (id & 1) === 1;
              frames.push({ narr: 'Reach <b>' + P.ids[w] + '</b> from ' + P.ids[u] + ' — ' + (back ? 'via the <b>reverse</b> of ' + o[0] + '→' + o[1] + ' (it carries flow we could undo).' : 'edge ' + o[0] + '→' + o[1] + ' still has room ' + resid(E, id) + '.'), parts: [G(copy(hl), one(o[0] + '-' + o[1], 'cur'), 'residual BFS from S'), { type: 'set', label: 'S-side', items: order.map(function (z) { return P.ids[z]; }), hl: one(P.ids[w], 'ok') }] });
            }
          });
        }
        var cut = [], cap = 0, cutE = {}, fin = {};
        P.ids.forEach(function (id, j) { fin[id] = side[j] ? 'ok' : 'bad'; });
        P.edges.forEach(function (e) { if (side[N.idx[e[0]]] && !side[N.idx[e[1]]]) { cut.push([e[0] + '→' + e[1], e[2]]); cap += e[2]; cutE[e[0] + '-' + e[1]] = 'sel'; } });
        frames.push({ narr: '<b>Step 3: the cut.</b> <span class="c-g">Green</span> = S-side, <span class="c-r">red</span> = T-side. The <span class="c-p">purple</span> edges cross from green to red — every one is <b>full</b>. Their capacities sum to <b>' + cap + '</b> = the max flow ' + total + '. ' + (cap === total ? 'Max-flow = min-cut ✔' : ''), parts: [G(fin, cutE, 'minimum cut'), { type: 'table', label: 'cut edges', columns: ['edge', 'capacity'], rows: cut.map(function (c) { return [c[0], String(c[1])]; }).concat([['<b>total</b>', '<b>' + cap + '</b>']]) }] });
        var backs = [];
        P.edges.forEach(function (e, k) { if (!side[N.idx[e[0]]] && side[N.idx[e[1]]]) backs.push(e[0] + '→' + e[1] + ' carries ' + E[2 * k].f); });
        frames.push({ narr: 'Last check: edges going <b>backwards</b> (red → green) must carry <b>zero</b> flow, otherwise BFS could have used their reverse edge. ' + (backs.length ? 'Here: ' + backs.join(', ') + '.' : 'There are no such edges here.') + ' Both conditions together prove the flow is maximum and the cut is minimum.', parts: [G(fin, cutE, 'minimum cut'), { type: 'vars', vals: { 'max flow': total, 'min cut': cap } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Min vertex cut by node splitting', html: `<p>"Remove the fewest routers so A cannot reach B." Replace every router v (except A and B) by two nodes <code>v_in → v_out</code> with capacity <b>1</b>; every original link u→v becomes <code>u_out → v_in</code> with capacity <b>∞</b> (so cutting links is never cheaper). Now any finite cut must cut some <code>v_in → v_out</code> edges — i.e. remove routers — and max flow = minimum routers to remove.</p>` },
      { title: 'Project selection in numbers', html: `<p>Projects P1 (+10), P2 (+7); tools T1 (−6), T2 (−9). P1 needs T1; P2 needs T1 and T2. Network: S→P1:10, S→P2:7, T1→T:6, T2→T:9, P1→T1:∞, P2→T1:∞, P2→T2:∞. Min cut = 13 (cut S→P2 = 7 and T1→T = 6). Profit = 17 − 13 = <b>4</b>: do P1 with T1 (10 − 6), skip P2 (7 − 6 − 9 &lt; 0 extra).</p>`, code: { lang: 'java', code: `long[] profit = {10, 7, -6, -9};          // P1, P2, T1, T2
int[][] need = {{2}, {2, 3}, {}, {}};       // P1 needs T1; P2 needs T1 and T2
// ProjectSelection.maxProfit(profit, need) == 4`, alt: [{ lang: 'python', code: `profit = [10, 7, -6, -9]                 # P1, P2, T1, T2
need = [[2], [2, 3], [], []]             # P1 needs T1; P2 needs T1 and T2
# max_profit(profit, need) == 4
` }, { lang: 'js', code: `const profit = [10, 7, -6, -9];          // P1, P2, T1, T2
const need = [[2], [2, 3], [], []];      // P1 needs T1; P2 needs T1 and T2
// maxProfit(profit, need) === 4
` }, { lang: 'cpp', code: `vector<long long> profit = {10, 7, -6, -9};          // P1, P2, T1, T2
vector<vector<int>> need = {{2}, {2, 3}, {}, {}};    // P1 needs T1; P2 needs T1 and T2
// maxProfit(profit, need) == 4
` }] } },
      { title: 'Several minimum cuts can exist', html: `<p>With S→A:3, S→B:2, A→B:2, A→T:2, B→T:3, both {S} and {S, A, B} have capacity 5. The residual BFS from S always returns the <b>smallest</b> S-side (the min cut closest to S). BFS backwards from T in the residual graph gives the min cut closest to T. Edges that appear in <b>every</b> min cut are the truly critical ones.</p>` },
      { title: 'Global min cut (no fixed S and T)', html: `<p>"Fewest edges to disconnect the graph at all" has no S and T. Options: fix S and try all T (V − 1 max flows), <b>Stoer–Wagner</b> O(V·E + V² log V) deterministic, or <b>Karger</b>'s random edge contraction (repeat O(V² log V) times for high success probability). Interviews mostly ask about S-T cuts; know the names for the global version.</p>` }
    ],
    deepDive: `<p><b>Full proof of the theorem (the 3 equivalent statements):</b> for a flow f, these are equivalent: (1) f is maximum; (2) the residual graph has no S→T path; (3) some cut has capacity equal to |f|. (1 ⇒ 2): an augmenting path would increase f. (2 ⇒ 3): let X = nodes reachable from S in the residual graph. For every edge from X to outside, residual is 0 → it is full; for every edge from outside into X, its reverse residual is 0 → it carries 0. So the net flow across the cut equals its capacity. (3 ⇒ 1): no flow can exceed any cut. ∎</p>
      <p><b>Max-flow min-cut is LP duality.</b> Max flow is a linear program; its dual assigns each node a 0/1 "side" and each edge a 0/1 "cut" variable — the min-cut LP — and it has integral optimal solutions. This is why so many combinatorial min-max theorems (König, Menger, Hall, Dilworth) are special cases of max-flow min-cut.</p>
      <p><b>Modelling patterns with ∞ edges:</b> an edge of capacity ∞ from u to v says "if u is on the S-side then v must be on the S-side too" (otherwise the cut would be infinite). That one rule encodes dependencies (project selection), "must choose together" constraints, and closure problems. For binary labelling (image segmentation, Boykov–Kolmogorov), costs to label i as "foreground"/"background" become edges S→i and i→T, and smoothness penalties become edges between neighbouring pixels; this exactly minimises energies that are <b>submodular</b>.</p>
      <p><b>Production notes:</b> graph cuts powered image segmentation and stereo vision for a decade (GrabCut in OpenCV is still a min-cut). Network reliability teams compute min cuts between data centres to know how many fibre cuts they can survive. Use 64-bit integers and a large finite INF (e.g. a quarter of the 64-bit maximum, <code>Long.MAX_VALUE / 4</code> in Java) so adding two INF edges does not overflow; in JavaScript use an INF such as 10<sup>15</sup> that stays below 2<sup>53</sup>.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI can compute a min cut with networkx (<code>nx.minimum_cut</code>) in one line. What it cannot do reliably is <b>invent the right network</b> for an unusual "minimum cost to separate / choose" story, especially with ∞ dependency edges and node splitting.</p>
      <p><b>Use AI as a partner:</b> state your model ("each project is a node, S→project with its profit, tool→T with its cost, project→tool with ∞") and ask the AI to find a counterexample where a valid choice does not correspond to a finite cut. Ask it to brute-force small instances (all 2<sup>n</sup> choices) and compare with your flow answer.</p>
      <p><b>Where AI goes wrong:</b> counting backward edges in the cut capacity, reporting edges between "S-reachable in the original graph" instead of the <b>residual</b> graph, putting the ∞ dependency edge in the wrong direction, and overflowing with the 64-bit maximum as INF.</p>
      <p><b>What you must still own:</b> the proof sketch (interviewers ask "how do you know it is optimal?"), the residual-BFS recipe, and the modelling patterns: node splitting, ∞ edges, super source/sink, and "profit = positives − min cut".</p>`,
    problems: [{
      title: 'Cheapest Roads to Block',
      level: 'Medium', tags: ['min cut', 'max flow', 'residual graph'], companies: ['Google', 'Palantir', 'Microsoft'],
      statement: `<p>A directed road network has <code>n</code> towns. <code>roads[i] = [u, v, cost]</code>: blocking road i costs <code>cost</code>. Find a set of roads with <b>minimum total cost</b> whose removal makes town <code>t</code> unreachable from town <code>s</code>. Return the road indices (any optimal set, sorted).</p>`,
      constraints: `<p>2 ≤ n ≤ 500, 1 ≤ roads.length ≤ 5000, 1 ≤ cost ≤ 10<sup>6</sup>, s ≠ t, t reachable from s.</p>`,
      example: `<p>n = 4, s = 0, t = 3, roads <code>[0,1,10] [0,2,10] [1,3,2] [2,3,3] [1,2,1]</code> → <b>${H.c('g', '[2, 3]')}</b> (cost 2 + 3 = 5).</p><p>Why: blocking the two cheap roads into town 3 costs 5. Blocking the roads out of 0 would cost 20. The max flow is also 5 — no cheaper cut can exist.</p>`,
      brute: {
        why: `<p>Try every subset of roads (2<sup>E</sup>), check with BFS whether t is still reachable, keep the cheapest that works. Fine for E ≤ 20, impossible for E = 5000. The waste: the exponential search ignores the structure that max flow exploits.</p>`,
        code: `class Brute {
    List<Integer> cheapestBlock(int n, int[][] roads, int s, int t) {
        int m = roads.length;
        long best = Long.MAX_VALUE;
        int bestMask = 0;
        for (int mask = 0; mask < (1 << m); mask++) {        // mask bit i = road i blocked
            long cost = 0;
            for (int i = 0; i < m; i++) if ((mask >> i & 1) == 1) cost += roads[i][2];
            if (cost >= best) continue;
            boolean[] seen = new boolean[n];
            Deque<Integer> q = new ArrayDeque<>();
            q.add(s);
            seen[s] = true;
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int i = 0; i < m; i++)
                    if ((mask >> i & 1) == 0 && roads[i][0] == u && !seen[roads[i][1]]) { seen[roads[i][1]] = true; q.add(roads[i][1]); }
            }
            if (!seen[t]) { best = cost; bestMask = mask; }
        }
        List<Integer> ans = new ArrayList<>();
        for (int i = 0; i < m; i++) if ((bestMask >> i & 1) == 1) ans.add(i);
        return ans;
    }
}`
      },
      mcq: { q: 'After max flow, which roads form the cut?', options: ['Roads from a node reachable from s in the RESIDUAL graph to a node that is not', 'All roads with flow &gt; 0', 'All saturated roads', 'Roads on the last augmenting path'], answer: 0, explain: 'Saturated roads can be inside one side; only those crossing from the residual-reachable set to the rest form the min cut.' },
      hints: [
        `<p>Hint 1: Treat blocking cost as capacity. Any blocking set is an S-T cut; the cheapest one equals the max flow.</p>`,
        `<p>Hint 2: Run max flow (Edmonds-Karp is enough for 5000 edges), then BFS from s using edges with residual &gt; 0.</p>`,
        `<p>Hint 3: Recipe — answer = indices i with reach[u_i] = true and reach[v_i] = false. Do not report every saturated road: some saturated roads lie entirely inside one side.</p>`
      ],
      tests: { sig: "int int[][] int int -> list<int>", fn: "cheapestBlock", check: `(args, out, exp) => {
  const roads = args[1], n = args[0], s = args[2], t = args[3];
  if (!Array.isArray(out)) return false;
  for (let i = 0; i < out.length; i++) if (!Number.isInteger(out[i]) || out[i] < 0 || out[i] >= roads.length || (i > 0 && out[i] <= out[i - 1])) return false;   // sorted, distinct, valid
  const cut = new Set(out);
  let cost = 0;
  out.forEach((i) => { cost += roads[i][2]; });
  if (cost !== exp) return false;                                                                 // must be the cheapest
  const adj = Array.from({ length: n }, () => []);
  roads.forEach((e, i) => { if (!cut.has(i)) adj[e[0]].push(e[1]); });
  const seen = new Array(n).fill(false); seen[s] = true; const st = [s];
  while (st.length) { const v = st.pop(); for (const w of adj[v]) if (!seen[w]) { seen[w] = true; st.push(w); } }
  return !seen[t];                                                                                // and t must really be cut off
}`, cases: [
          [[4,[[0,1,10],[0,2,10],[1,3,2],[2,3,3],[1,2,1]],0,3],5],
          [[2,[[0,1,7]],0,1],7],
          [[2,[[0,1,3],[0,1,4],[1,0,100]],0,1],7],
          [[5,[[0,1,1],[1,2,1],[2,3,1],[3,4,1]],0,4],1],
          [[4,[[3,2,5],[2,1,4],[1,0,6],[3,0,100]],3,0],104],
          [[4,[[0,1,5],[1,2,5],[2,1,5],[1,3,1],[2,3,1],[0,3,9]],0,3],11],
          [[3,[[0,2,6],[1,2,3],[1,0,5],[0,1,2],[0,2,7],[0,1,1],[1,2,7],[2,0,5],[1,2,3]],1,0],10],
          [[3,[[0,1,5],[0,1,2],[0,2,8],[0,1,9],[1,2,4],[1,0,4],[0,2,1],[2,1,3],[2,0,8],[1,2,9],[0,1,6],[1,2,9],[0,1,3]],2,1],11],
          [[4,[[2,3,8],[1,2,9],[0,1,7],[1,3,1],[2,1,7],[0,1,3],[3,0,1],[2,1,6],[1,2,5],[1,0,5],[0,2,1]],0,2],11],
          [[2,[[1,0,4],[1,0,2],[1,0,9],[0,1,8],[1,0,6],[0,1,6],[1,0,3]],0,1],14],
          [[3,[[0,1,1],[1,0,3],[2,0,1],[1,2,7],[2,0,3],[0,1,6],[2,0,4],[2,0,1],[1,2,6],[1,2,9],[1,0,2],[2,0,2],[0,1,8]],1,2],22],
          [[5,[[1,4,7],[1,2,9],[0,1,1],[1,2,2],[1,2,7],[4,2,7],[4,1,1],[3,2,3]],0,1],1],
          [[5,[[4,2,2],[1,4,7],[3,4,1],[3,0,7],[3,0,3],[0,1,8],[2,4,4],[2,3,6],[0,1,5],[2,0,9],[0,3,5]],3,1],11],
          [[3,[[0,1,5],[2,0,9],[0,1,6],[1,2,3],[0,2,7],[0,2,8],[2,0,1],[1,2,7],[0,2,5],[0,2,8],[1,0,6]],2,0],10],
          [[7,[[6,3,5],[5,3,6],[4,1,1],[5,1,5],[4,3,8],[6,2,2],[1,5,7],[3,6,4],[4,0,6],[3,0,1],[0,1,3],[4,6,3],[3,5,8],[0,5,2]],1,0],1],
          [[5,[[1,3,1],[3,4,8],[1,4,3],[3,4,5],[4,1,6],[1,2,1],[1,3,2],[0,1,1],[4,0,5],[4,2,7]],4,0],5],
          [[6,[[3,1,1],[2,1,5],[2,4,3],[5,4,4],[0,5,4],[5,2,1]],5,2],1],
          [[6,[[5,3,8],[5,1,7],[2,5,7],[5,2,7],[0,2,1],[4,2,6],[0,5,6]],2,3],7],
          [[2,{"$rep":[0,1,1000000],"n":5000},0,1],5000000000],
          [[3,{"$concat":[{"$rep":[0,1,1000000],"n":2500},{"$rep":[1,2,999999],"n":2500}]},0,2],2499997500]
        ] },
      solution: {
        approach: `<p>Edmonds-Karp with paired edge ids (road i → ids 2i, 2i+1). After the flow, one BFS over residual edges marks the S-side; the crossing original roads are an optimal blocking set.</p>`,
        code: `class Solution {
    List<Integer> cheapestBlock(int n, int[][] roads, int s, int t) {
        int m = roads.length;
        int[] to = new int[2 * m];
        long[] cap = new long[2 * m];
        List<List<Integer>> g = new ArrayList<>();
        for (int i = 0; i < n; i++) g.add(new ArrayList<>());
        for (int i = 0; i < m; i++) {
            to[2 * i] = roads[i][1];     cap[2 * i] = roads[i][2]; g.get(roads[i][0]).add(2 * i);
            to[2 * i + 1] = roads[i][0]; cap[2 * i + 1] = 0;       g.get(roads[i][1]).add(2 * i + 1);
        }
        int[] via = new int[n];
        while (bfs(g, to, cap, s, via) && via[t] != -1) {      // Edmonds-Karp rounds
            long push = Long.MAX_VALUE;
            for (int v = t; v != s; v = to[via[v] ^ 1]) push = Math.min(push, cap[via[v]]);
            for (int v = t; v != s; v = to[via[v] ^ 1]) { cap[via[v]] -= push; cap[via[v] ^ 1] += push; }
        }
        bfs(g, to, cap, s, via);                              // final residual reachability
        List<Integer> ans = new ArrayList<>();
        for (int i = 0; i < m; i++)
            if (via[roads[i][0]] != -1 && via[roads[i][1]] == -1) ans.add(i);
        return ans;
    }

    // BFS over residual edges; via[v] = edge used to reach v, -1 = unreached, -2 = the source.
    private boolean bfs(List<List<Integer>> g, int[] to, long[] cap, int s, int[] via) {
        Arrays.fill(via, -1);
        via[s] = -2;
        Deque<Integer> q = new ArrayDeque<>();
        q.add(s);
        while (!q.isEmpty()) {
            int v = q.poll();
            for (int e : g.get(v)) if (cap[e] > 0 && via[to[e]] == -1) { via[to[e]] = e; q.add(to[e]); }
        }
        return true;
    }
}`,
      alt: [{ lang: 'python', code: `from collections import deque


def cheapest_block(n, roads, s, t):
    to, cap = [], []                       # edge 2i is road i, 2i + 1 its undo edge
    g = [[] for _ in range(n)]
    for u, v, cost in roads:
        g[u].append(len(to)); to.append(v); cap.append(cost)
        g[v].append(len(to)); to.append(u); cap.append(0)

    def bfs():                             # via[v] = edge used to reach v, -1 = unreached, -2 = source
        via = [-1] * n
        via[s] = -2
        queue = deque([s])
        while queue:
            v = queue.popleft()
            for e in g[v]:
                if cap[e] > 0 and via[to[e]] == -1:
                    via[to[e]] = e
                    queue.append(to[e])
        return via

    via = bfs()
    while via[t] != -1:                    # Edmonds-Karp rounds
        path = []
        v = t
        while v != s:
            path.append(via[v])
            v = to[via[v] ^ 1]
        push = min(cap[e] for e in path)
        for e in path:
            cap[e] -= push
            cap[e ^ 1] += push
        via = bfs()
    # via now marks the S side of the cut: roads from reached to unreached are full
    return [i for i, (u, v, _) in enumerate(roads) if via[u] != -1 and via[v] == -1]
` }, { lang: 'js', code: `function cheapestBlock(n, roads, s, t) {
  const m = roads.length;
  const to = new Int32Array(2 * m), cap = new Float64Array(2 * m);   // edge 2i is road i, 2i + 1 its undo edge
  const g = Array.from({ length: n }, () => []);
  roads.forEach(([u, v, cost], i) => {
    to[2 * i] = v; cap[2 * i] = cost; g[u].push(2 * i);
    to[2 * i + 1] = u; g[v].push(2 * i + 1);
  });
  const via = new Int32Array(n), queue = new Int32Array(n);
  // BFS over residual edges; via[v] = edge used to reach v, -1 = unreached, -2 = the source
  const bfs = () => {
    via.fill(-1);
    via[s] = -2;
    let head = 0, tail = 0;
    queue[tail++] = s;
    while (head < tail) {
      const v = queue[head++];
      for (const e of g[v]) if (cap[e] > 0 && via[to[e]] === -1) { via[to[e]] = e; queue[tail++] = to[e]; }
    }
  };
  bfs();
  while (via[t] !== -1) {                    // Edmonds-Karp rounds
    let push = Infinity;
    for (let v = t; v !== s; v = to[via[v] ^ 1]) push = Math.min(push, cap[via[v]]);
    for (let v = t; v !== s; v = to[via[v] ^ 1]) { cap[via[v]] -= push; cap[via[v] ^ 1] += push; }
    bfs();
  }
  // via now marks the S side of the cut: roads from reached to unreached are full
  const ans = [];
  roads.forEach(([u, v], i) => { if (via[u] !== -1 && via[v] === -1) ans.push(i); });
  return ans;
}
` }, { lang: 'cpp', code: `class Solution {
public:
    vector<int> cheapestBlock(int n, vector<vector<int>>& roads, int s, int t) {
        int m = roads.size();
        vector<int> to(2 * m), via(n);
        vector<long long> cap(2 * m);                    // edge 2i is road i, 2i + 1 its undo edge
        vector<vector<int>> g(n);
        for (int i = 0; i < m; i++) {
            to[2 * i] = roads[i][1];     cap[2 * i] = roads[i][2]; g[roads[i][0]].push_back(2 * i);
            to[2 * i + 1] = roads[i][0]; cap[2 * i + 1] = 0;       g[roads[i][1]].push_back(2 * i + 1);
        }
        // BFS over residual edges; via[v] = edge used to reach v, -1 = unreached, -2 = the source
        auto bfs = [&]() {
            fill(via.begin(), via.end(), -1);
            via[s] = -2;
            queue<int> q;
            q.push(s);
            while (!q.empty()) {
                int v = q.front(); q.pop();
                for (int e : g[v]) if (cap[e] > 0 && via[to[e]] == -1) { via[to[e]] = e; q.push(to[e]); }
            }
        };
        bfs();
        while (via[t] != -1) {                           // Edmonds-Karp rounds
            long long push = LLONG_MAX;
            for (int v = t; v != s; v = to[via[v] ^ 1]) push = min(push, cap[via[v]]);
            for (int v = t; v != s; v = to[via[v] ^ 1]) { cap[via[v]] -= push; cap[via[v] ^ 1] += push; }
            bfs();
        }
        // via now marks the S side of the cut: roads from reached to unreached are full
        vector<int> ans;
        for (int i = 0; i < m; i++)
            if (via[roads[i][0]] != -1 && via[roads[i][1]] == -1) ans.push_back(i);
        return ans;
    }
};
` }],
        dry: {
          head: ['step', 'what happens', 'flow / reach'],
          rows: [
            ['1', 'BFS path 0→1→3, bottleneck min(10, 2)', 'flow 2'],
            ['2', 'BFS path 0→2→3, bottleneck min(10, 3)', 'flow 5'],
            ['3', 'BFS: 1→3 and 2→3 full, 2→1 has no flow to undo → 3 unreachable', 'max flow 5'],
            ['4', 'residual BFS from 0: reach 1 (room 8), 2 (room 7)', 'S-side {0, 1, 2}'],
            ['5', 'roads crossing to {3}: #2 (1→3, 2), #3 (2→3, 3)', H.c('g', '[2, 3], cost 5')]
          ]
        },
        complexity: `<p>Edmonds-Karp O(V·E²) worst case, plus O(V + E) for the final BFS. Space O(V + E).</p>`,
        followUps: ['Block towns instead of roads (node splitting).', 'Roads are two-way.', 'Which roads belong to <b>every</b> minimum cut?']
      }
    }]
  });

  // =====================================================================
  // TOPIC 9 — Bipartite matching (Kuhn, flow view, Hopcroft-Karp, König)
  // =====================================================================
  topics.push({
    title: 'Bipartite Matching: Kuhn\'s Augmenting Paths, Flow View, Hopcroft-Karp & König\'s Theorem',
    analogy: `<p>A school dance: students on the left, dance partners on the right, and lines showing who is willing to dance with whom. You want as many pairs as possible. When a new student arrives and their favourite partner is taken, you do not give up — you politely ask the current partner's dancer "<b>could you switch to someone else you also like?</b>" That dancer may ask someone else in turn, a <b>chain of polite switches</b>. If the chain ends at a free partner, everyone shifts by one and the new student gets a partner.</p>
      <p>That chain is an <b>augmenting path</b>, and repeating it is all Kuhn's algorithm does.</p>`,
    explain: `<p>A graph is <b>bipartite</b> when its nodes split into a Left group and a Right group and every edge goes Left–Right. A <b>matching</b> is a set of edges with no shared endpoint (everyone dances with at most one partner). We want a <b>maximum matching</b>.</p>
      <p><b>Augmenting path:</b> a path that starts at a <b>free</b> left node, ends at a <b>free</b> right node, and alternates <i>non-matching edge, matching edge, non-matching edge, …</i>. Flipping every edge on it (matched ↔ unmatched) grows the matching by exactly 1. <b>Berge's theorem:</b> a matching is maximum ⟺ no augmenting path exists.</p>
      <p><b>Kuhn's algorithm</b> (a DFS version of Ford-Fulkerson specialised to matching):</p>
      <ol>
        <li>For each left node u: clear <code>visited</code>, call <code>try(u)</code>.</li>
        <li><code>try(u)</code>: for each right neighbour r not yet visited in this round — mark it; if r is free <b>or</b> <code>try(owner of r)</code> succeeds (the owner moves elsewhere), give r to u and return true.</li>
      </ol>
      ${H.table(['step', 'who', 'what happens', 'matching'], [
        ['1', 'A', '1 is free → A–1', '{A–1}'],
        ['2', 'B', 'wants 1 (taken by A) → ask A: A takes 2', '{A–2, B–1}'],
        ['3', 'C', 'wants 2 (A) → A wants 1 (B) → B has no other → fail; C takes 3', '{A–2, B–1, C–3}'],
        ['4', 'D', 'wants 3 (C) → C wants 2 (A) → A wants 1 (B) → B stuck → fail', H.c('g', 'size 3 = maximum')]
      ])}
      <p>Edges here: A–1, A–2, B–1, C–2, C–3, D–3. Only 3 right nodes exist, so 3 is clearly the best.</p>
      <p><b>The flow view:</b> add a source S with edges S→left (capacity 1), keep left→right edges (capacity 1), add right→T (capacity 1). Max flow = maximum matching, and Kuhn is exactly Ford-Fulkerson on this network. Running <b>Dinic</b> on it gives <b>Hopcroft-Karp</b>'s <b>O(E·√V)</b>; Kuhn is <b>O(V·E)</b>.</p>
      <p><b>König's theorem</b> (bipartite only): <b>max matching = minimum vertex cover</b> (fewest nodes touching every edge). Consequences: maximum independent set = V − max matching; minimum path cover of a DAG = n − max matching in the "split" graph.</p>`,
    clues: [
      '"Assign <b>workers to jobs / students to seats / pilots to planes</b>, each used at most once, maximise the number assigned" → bipartite matching.',
      '"Maximum number of <b>pairs</b>" where pairs must be compatible and the two sides are different kinds of things → matching.',
      '"Fewest <b>rows and columns</b> (or lines) to cover all marked cells" → minimum vertex cover = max matching (König).',
      '"Grid domino placement / pairing adjacent cells" → chessboard colouring makes it bipartite → matching.',
      '"Minimum number of <b>paths/chains</b> to cover all nodes of a DAG" (each node on exactly one path) → n − max matching.',
      '"Assign with <b>costs</b>, minimise total" → weighted matching: Hungarian algorithm O(n³) or min-cost flow — plain matching is not enough.'
    ],
    code: [{ lang: 'java', code: `
      class Kuhn {
          private final List<List<Integer>> adj;   // adj[left] = right vertices it may pair with
          private final int[] matchR;              // matchR[right] = left partner, or -1
          private boolean[] visited;               // right vertices tried in the CURRENT attempt

          Kuhn(int nRight, List<List<Integer>> adj) {
              this.adj = adj;
              matchR = new int[nRight];
              Arrays.fill(matchR, -1);
          }

          // Find a partner for left vertex u, possibly by asking current owners to move.
          private boolean tryKuhn(int u) {
              for (int r : adj.get(u)) {
                  if (visited[r]) continue;
                  visited[r] = true;
                  if (matchR[r] == -1 || tryKuhn(matchR[r])) {   // free, or its owner found another
                      matchR[r] = u;
                      return true;
                  }
              }
              return false;
          }

          int maxMatching() {
              int result = 0;
              for (int u = 0; u < adj.size(); u++) {
                  visited = new boolean[matchR.length];          // fresh for every left vertex
                  if (tryKuhn(u)) result++;
              }
              return result;
          }
      }`, alt: [{ lang: 'python', code: `class Kuhn:
    def __init__(self, n_right, adj):
        self.adj = adj                          # adj[left] = right vertices it may pair with
        self.match_r = [-1] * n_right           # match_r[right] = left partner, or -1

    # Find a partner for left vertex u, possibly by asking current owners to move.
    def _try_kuhn(self, u):
        for r in self.adj[u]:
            if self.visited[r]:
                continue
            self.visited[r] = True
            if self.match_r[r] == -1 or self._try_kuhn(self.match_r[r]):   # free, or its owner found another
                self.match_r[r] = u
                return True
        return False

    def max_matching(self):
        result = 0
        for u in range(len(self.adj)):
            self.visited = [False] * len(self.match_r)    # fresh for every left vertex
            if self._try_kuhn(u):
                result += 1
        return result
` }, { lang: 'js', code: `class Kuhn {
  constructor(nRight, adj) {
    this.adj = adj;                             // adj[left] = right vertices it may pair with
    this.matchR = new Array(nRight).fill(-1);   // matchR[right] = left partner, or -1
  }

  // Find a partner for left vertex u, possibly by asking current owners to move.
  tryKuhn(u) {
    for (const r of this.adj[u]) {
      if (this.visited[r]) continue;
      this.visited[r] = true;
      if (this.matchR[r] === -1 || this.tryKuhn(this.matchR[r])) {   // free, or its owner found another
        this.matchR[r] = u;
        return true;
      }
    }
    return false;
  }

  maxMatching() {
    let result = 0;
    for (let u = 0; u < this.adj.length; u++) {
      this.visited = new Array(this.matchR.length).fill(false);      // fresh for every left vertex
      if (this.tryKuhn(u)) result++;
    }
    return result;
  }
}
` }, { lang: 'cpp', code: `class Kuhn {
    const vector<vector<int>>& adj;   // adj[left] = right vertices it may pair with
    vector<int> matchR;               // matchR[right] = left partner, or -1
    vector<char> visited;             // right vertices tried in the CURRENT attempt

    // Find a partner for left vertex u, possibly by asking current owners to move.
    bool tryKuhn(int u) {
        for (int r : adj[u]) {
            if (visited[r]) continue;
            visited[r] = 1;
            if (matchR[r] == -1 || tryKuhn(matchR[r])) {   // free, or its owner found another
                matchR[r] = u;
                return true;
            }
        }
        return false;
    }

public:
    Kuhn(int nRight, const vector<vector<int>>& adj) : adj(adj), matchR(nRight, -1) {}

    int maxMatching() {
        int result = 0;
        for (int u = 0; u < (int)adj.size(); u++) {
            visited.assign(matchR.size(), 0);              // fresh for every left vertex
            if (tryKuhn(u)) result++;
        }
        return result;
    }
};
` }] }, { lang: 'java', code: `
      class HopcroftKarp {
          private final int nL;
          private final List<List<Integer>> adj;
          private final int[] matchL, matchR, dist;
          private static final int INF = Integer.MAX_VALUE;

          HopcroftKarp(int nL, int nR, List<List<Integer>> adj) {
              this.nL = nL;
              this.adj = adj;
              matchL = new int[nL];
              matchR = new int[nR];
              dist = new int[nL];
              Arrays.fill(matchL, -1);
              Arrays.fill(matchR, -1);
          }

          // BFS from ALL free left vertices at once: layers of the shortest augmenting paths.
          private boolean bfs() {
              Deque<Integer> q = new ArrayDeque<>();
              for (int u = 0; u < nL; u++) {
                  if (matchL[u] == -1) { dist[u] = 0; q.add(u); } else dist[u] = INF;
              }
              boolean foundFree = false;
              while (!q.isEmpty()) {
                  int u = q.poll();
                  for (int r : adj.get(u)) {
                      int w = matchR[r];
                      if (w == -1) foundFree = true;                       // a path can end here
                      else if (dist[w] == INF) { dist[w] = dist[u] + 1; q.add(w); }
                  }
              }
              return foundFree;
          }

          // DFS only along the BFS layers; many vertex-disjoint paths per phase.
          private boolean dfs(int u) {
              for (int r : adj.get(u)) {
                  int w = matchR[r];
                  if (w == -1 || (dist[w] == dist[u] + 1 && dfs(w))) {
                      matchL[u] = r;
                      matchR[r] = u;
                      return true;
                  }
              }
              dist[u] = INF;                                               // dead end this phase
              return false;
          }

          int maxMatching() {
              int result = 0;
              while (bfs())                                                // O(sqrt V) phases
                  for (int u = 0; u < nL; u++)
                      if (matchL[u] == -1 && dfs(u)) result++;
              return result;
          }
      }`, alt: [{ lang: 'python', code: `from collections import deque

INF = float('inf')


class HopcroftKarp:
    def __init__(self, n_left, n_right, adj):
        self.n_left = n_left
        self.adj = adj
        self.match_l = [-1] * n_left
        self.match_r = [-1] * n_right
        self.dist = [0] * n_left

    # BFS from ALL free left vertices at once: layers of the shortest augmenting paths.
    def _bfs(self):
        q = deque()
        for u in range(self.n_left):
            if self.match_l[u] == -1:
                self.dist[u] = 0
                q.append(u)
            else:
                self.dist[u] = INF
        found_free = False
        while q:
            u = q.popleft()
            for r in self.adj[u]:
                w = self.match_r[r]
                if w == -1:
                    found_free = True            # a path can end here
                elif self.dist[w] == INF:
                    self.dist[w] = self.dist[u] + 1
                    q.append(w)
        return found_free

    # DFS only along the BFS layers; many vertex-disjoint paths per phase.
    def _dfs(self, u):
        for r in self.adj[u]:
            w = self.match_r[r]
            if w == -1 or (self.dist[w] == self.dist[u] + 1 and self._dfs(w)):
                self.match_l[u] = r
                self.match_r[r] = u
                return True
        self.dist[u] = INF                       # dead end this phase
        return False

    def max_matching(self):
        result = 0
        while self._bfs():                       # O(sqrt V) phases
            for u in range(self.n_left):
                if self.match_l[u] == -1 and self._dfs(u):
                    result += 1
        return result
` }, { lang: 'js', code: `class HopcroftKarp {
  constructor(nL, nR, adj) {
    this.nL = nL;
    this.adj = adj;
    this.matchL = new Array(nL).fill(-1);
    this.matchR = new Array(nR).fill(-1);
    this.dist = new Array(nL).fill(0);
  }

  // BFS from ALL free left vertices at once: layers of the shortest augmenting paths.
  bfs() {
    const q = [];
    for (let u = 0; u < this.nL; u++) {
      if (this.matchL[u] === -1) { this.dist[u] = 0; q.push(u); } else this.dist[u] = Infinity;
    }
    let foundFree = false;
    for (let h = 0; h < q.length; h++) {
      const u = q[h];
      for (const r of this.adj[u]) {
        const w = this.matchR[r];
        if (w === -1) foundFree = true;                         // a path can end here
        else if (this.dist[w] === Infinity) { this.dist[w] = this.dist[u] + 1; q.push(w); }
      }
    }
    return foundFree;
  }

  // DFS only along the BFS layers; many vertex-disjoint paths per phase.
  dfs(u) {
    for (const r of this.adj[u]) {
      const w = this.matchR[r];
      if (w === -1 || (this.dist[w] === this.dist[u] + 1 && this.dfs(w))) {
        this.matchL[u] = r;
        this.matchR[r] = u;
        return true;
      }
    }
    this.dist[u] = Infinity;                                    // dead end this phase
    return false;
  }

  maxMatching() {
    let result = 0;
    while (this.bfs())                                          // O(sqrt V) phases
      for (let u = 0; u < this.nL; u++)
        if (this.matchL[u] === -1 && this.dfs(u)) result++;
    return result;
  }
}
` }, { lang: 'cpp', code: `class HopcroftKarp {
    int nL;
    const vector<vector<int>>& adj;
    vector<int> matchL, matchR, dist;
    static constexpr int INF = INT_MAX;

    // BFS from ALL free left vertices at once: layers of the shortest augmenting paths.
    bool bfs() {
        queue<int> q;
        for (int u = 0; u < nL; u++) {
            if (matchL[u] == -1) { dist[u] = 0; q.push(u); } else dist[u] = INF;
        }
        bool foundFree = false;
        while (!q.empty()) {
            int u = q.front();
            q.pop();
            for (int r : adj[u]) {
                int w = matchR[r];
                if (w == -1) foundFree = true;                       // a path can end here
                else if (dist[w] == INF) { dist[w] = dist[u] + 1; q.push(w); }
            }
        }
        return foundFree;
    }

    // DFS only along the BFS layers; many vertex-disjoint paths per phase.
    bool dfs(int u) {
        for (int r : adj[u]) {
            int w = matchR[r];
            if (w == -1 || (dist[w] == dist[u] + 1 && dfs(w))) {
                matchL[u] = r;
                matchR[r] = u;
                return true;
            }
        }
        dist[u] = INF;                                               // dead end this phase
        return false;
    }

public:
    HopcroftKarp(int nL, int nR, const vector<vector<int>>& adj)
        : nL(nL), adj(adj), matchL(nL, -1), matchR(nR, -1), dist(nL, 0) {}

    int maxMatching() {
        int result = 0;
        while (bfs())                                                // O(sqrt V) phases
            for (int u = 0; u < nL; u++)
                if (matchL[u] == -1 && dfs(u)) result++;
        return result;
    }
};
` }] }],
    codeTitle: ['Kuhn\'s algorithm, O(V·E) — short and interview-friendly', 'Hopcroft-Karp, O(E·√V) — for 10^5 edges'],
    viz: {
      title: 'Kuhn live: chains of "can you move?" requests become augmenting paths',
      input: 'A-1 A-2 B-1 C-2 C-3 D-3',
      inputLabel: 'Edges "left-right" separated by spaces (up to 12 nodes, 20 edges); left names come first',
      gen: function (input) {
        var P = parseEdges(input, { example: 'A-1 A-2 B-1', maxN: 12, maxE: 20, noLoops: true });
        var L = [], R = [], isL = {}, isR = {}, adj = {};
        P.edges.forEach(function (e) {
          if (!isL[e[0]]) { isL[e[0]] = true; L.push(e[0]); adj[e[0]] = []; }
          if (!isR[e[1]]) { isR[e[1]] = true; R.push(e[1]); }
          adj[e[0]].push(e[1]);
        });
        L.forEach(function (x) { if (isR[x]) throw new Error('"' + x + '" appears on both sides. Write every edge as left-right with different names, e.g. A-1.'); });
        var H2 = 70, nodes = [];
        L.forEach(function (id, i) { nodes.push({ id: id, label: id, x: 22, y: Math.round(H2 * (i + 1) / (L.length + 1) * 10) / 10 }); });
        R.forEach(function (id, i) { nodes.push({ id: id, label: id, x: 78, y: Math.round(H2 * (i + 1) / (R.length + 1) * 10) / 10 }); });
        var matchR = {}, matchL = {}, frames = [], size = 0;
        function G(hl, extra, label) {
          var ehl = {};
          Object.keys(matchL).forEach(function (l) { ehl[l + '-' + matchL[l]] = 'sel'; });
          for (var k in extra) ehl[k] = extra[k];
          var tags = {};
          L.forEach(function (l) { tags[l] = matchL[l] !== undefined ? '↔ ' + matchL[l] : 'free'; });
          R.forEach(function (r) { tags[r] = matchR[r] !== undefined ? '↔ ' + matchR[r] : 'free'; });
          return { type: 'graph', label: label, directed: false, height: H2, nodes: nodes, edges: P.edges.map(function (e) { return [e[0], e[1]]; }), hl: hl || {}, ehl: ehl, tags: tags };
        }
        function M() { return { type: 'map', label: 'current matching (left → right)', entries: L.filter(function (l) { return matchL[l] !== undefined; }).map(function (l) { return [l, matchL[l]]; }) }; }
        frames.push({ narr: 'Left side: ' + L.join(', ') + '. Right side: ' + R.join(', ') + '. Lines = allowed pairs. <span class="c-p">Purple</span> lines will be the current matching. We give each left node a chance in turn.', parts: [G({}, {}, 'bipartite graph'), M()] });
        L.forEach(function (start) {
          var visited = {}, chain = [];
          frames.push({ narr: '<b>New round for ' + start + '</b>: find it a partner. Clear the "visited" marks (each right node may be asked once per round).', parts: [G(one(start, 'cur'), {}, 'round for ' + start), M(), { type: 'set', label: 'visited right nodes this round', items: [] }] });
          function tryK(u) {
            for (var j = 0; j < adj[u].length; j++) {
              var r = adj[u][j];
              if (visited[r]) continue;
              visited[r] = true;
              var hl = {}, ex = {};
              chain.forEach(function (c) { hl[c] = 'win'; });
              hl[u] = 'cur'; hl[r] = matchR[r] === undefined ? 'ok' : 'bad';
              ex[u + '-' + r] = 'cur';
              frames.push({ narr: '<b>' + u + '</b> asks for <b>' + r + '</b>: ' + (matchR[r] === undefined ? '<span class="c-g">' + r + ' is free!</span>' : r + ' is taken by <b>' + matchR[r] + '</b> → ask ' + matchR[r] + ' whether it can move to another partner.'), parts: [G(hl, ex, 'round for ' + start), M(), { type: 'set', label: 'visited right nodes this round', items: Object.keys(visited) }] });
              chain.push(u);
              if (matchR[r] === undefined || tryK(matchR[r])) {
                chain.pop();
                matchR[r] = u; matchL[u] = r;
                return true;
              }
              chain.pop();
              frames.push({ narr: matchR[r] + ' could not move, so <b>' + r + '</b> stays with ' + matchR[r] + '. ' + u + ' tries its next option.', parts: [G(one(u, 'cur'), one(u + '-' + r, 'bad'), 'round for ' + start), M(), { type: 'set', label: 'visited right nodes this round', items: Object.keys(visited) }] });
            }
            return false;
          }
          var ok = tryK(start);
          if (ok) size++;
          frames.push({ narr: ok ? '<span class="c-g">Augmenting path found</span> — every switch in the chain happened at once. ' + start + ' now dances with <b>' + matchL[start] + '</b>. Matching size = <b>' + size + '</b>.' : '<span class="c-r">No augmenting path for ' + start + '</span>: every chain of switches hit a dead end. ' + start + ' stays free (and will never get a partner later either).', parts: [G(one(start, ok ? 'ok' : 'bad'), {}, 'after round ' + start), M(), { type: 'vars', vals: { 'matching size': size } }] });
        });
        frames.push({ narr: '<b>Maximum matching = ' + size + '</b>. By König\'s theorem this is also the size of the smallest set of nodes that touches every line (minimum vertex cover).', parts: [G({}, {}, 'final matching'), M(), { type: 'vars', vals: { 'max matching': size, 'min vertex cover': size, 'max independent set': L.length + R.length - size } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Why visited[] is per round', html: `<p>Inside one round, if right node r already failed to help, asking again cannot succeed (nothing changed) — and without the mark the DFS could loop forever (A asks 1, its owner B asks 2, its owner A asks 1, …). Between rounds the matching changes, so the marks must be cleared: forgetting to reset gives too-small answers.</p>` },
      { title: 'König in action: cover the marked cells', html: `<p>Marked cells (0,0), (0,2), (1,1), (2,1). Rows are the left side, columns the right side, one edge per marked cell: r0–c0, r0–c2, r1–c1, r2–c1. Kuhn finds r0–c0 and r1–c1; r2 only likes c1, whose owner r1 has no other option → maximum matching = <b>2</b>. Minimum cover: <b>row 0 + column 1</b> touch all four cells → 2 lines. ${H.c('g', 'Matching = cover = 2, exactly as König promises.')}</p>` },
      { title: 'Minimum path cover of a DAG', html: `<p>DAG 1→2, 2→3, 1→4. Split each node into out-copy (left) and in-copy (right); edge u→v becomes u_out–v_in. Max matching: 1–2, 2–3 (size 2). Paths = n − matching = 4 − 2 = <b>2</b>: 1→2→3 and 4. Each matched edge "glues" two nodes into the same path.</p>` },
      { title: 'Flow model of matching', html: `<p>Build S→each left (cap 1), left→right edges (cap 1), each right→T (cap 1). The integer max flow picks a set of left→right edges with flow 1 — no left node can send 2 (its in-capacity is 1), no right node can receive 2 (its out-capacity is 1). So flow = matching. Change the S→left capacity to k and a worker can take k jobs — that is the main advantage of the flow view.</p>`, code: { lang: 'java', code: `// Flow model sizes for nL left and nR right vertices:
int nL = 4, nR = 3;
int nodes = nL + nR + 2;          // + source + sink
int source = nL + nR, sink = nL + nR + 1;
System.out.println(nodes + " nodes, source " + source + ", sink " + sink);`, alt: [{ lang: 'python', code: `# Flow model sizes for n_left left and n_right right vertices:
n_left, n_right = 4, 3
nodes = n_left + n_right + 2             # + source + sink
source, sink = n_left + n_right, n_left + n_right + 1
print(f"{nodes} nodes, source {source}, sink {sink}")
` }, { lang: 'js', code: `// Flow model sizes for nL left and nR right vertices:
const nL = 4, nR = 3;
const nodes = nL + nR + 2;               // + source + sink
const source = nL + nR, sink = nL + nR + 1;
console.log(\`\${nodes} nodes, source \${source}, sink \${sink}\`);
` }, { lang: 'cpp', code: `// Flow model sizes for nL left and nR right vertices:
int nL = 4, nR = 3;
int nodes = nL + nR + 2;                 // + source + sink
int source = nL + nR, sink = nL + nR + 1;
cout << nodes << " nodes, source " << source << ", sink " << sink << "\\n";
` }] } }
    ],
    deepDive: `<p><b>Why Kuhn is correct.</b> If a left vertex u finds no augmenting path in its round, then it never will later: later augmentations only change the matching along alternating paths, and one can show the set of vertices reachable from u by alternating paths does not gain a free right vertex. So processing each left vertex once suffices (Berge + this lemma). Complexity: each round is one DFS O(V + E) → <b>O(V·E)</b>. Heuristic speed-ups: start with a greedy matching, and randomise the order of left vertices.</p>
      <p><b>Hopcroft-Karp</b> runs in phases like Dinic: BFS from all free left vertices builds layers, then DFS finds a maximal set of vertex-disjoint <b>shortest</b> augmenting paths. After √V phases the shortest augmenting path is longer than √V, which leaves at most √V more augmentations → <b>O(E·√V)</b>. For E = 10<sup>5</sup>, V = 10<sup>5</sup> that is about 3·10<sup>7</sup> steps.</p>
      <p><b>König and the vertex cover recipe:</b> after a maximum matching, run alternating BFS/DFS from all free left vertices (non-matching edges L→R, matching edges R→L). Let Z be everything reached. Then <b>(L \\ Z) ∪ (R ∩ Z)</b> is a minimum vertex cover. Its complement is a maximum independent set.</p>
      <p><b>Hall's marriage theorem:</b> a matching that saturates every left vertex exists iff every subset X of the left side has at least |X| neighbours. Useful for proofs ("show a perfect assignment always exists").</p>
      <p><b>Beyond bipartite:</b> general graphs need <b>Edmonds' blossom algorithm</b> (odd cycles break the simple alternating search). Weighted bipartite matching uses the <b>Hungarian algorithm</b> (O(n³)) or <b>min-cost max-flow</b>; online assignment in ride-hailing and ad allocation uses these plus approximations. Stable matching (Gale–Shapley) is a different problem — preferences instead of compatibility, used in medical residency placement.</p>`,
    aiEra: `<p><b>What AI changes:</b> asking for "maximum bipartite matching" in your language gives working Kuhn instantly, and SciPy offers <code>linear_sum_assignment</code> (Hungarian) and <code>maximum_bipartite_matching</code>. The hard part left for you is noticing the <b>bipartite structure</b> (rows vs columns, chessboard colours, time slots vs tasks, out-copies vs in-copies) and choosing plain matching vs weighted vs stable matching.</p>
      <p><b>Use AI as a partner:</b> ask it to brute-force all matchings for tiny random graphs and compare with your Kuhn; ask for the König cover construction and verify that the cover really touches every edge.</p>
      <p><b>Where AI goes wrong:</b> not resetting <code>visited</code> per round, resetting it inside the recursion (infinite recursion), using Kuhn on a non-bipartite graph (wrong answers on odd cycles), confusing "maximum matching" with "maximum-weight matching", and applying König to general graphs where it does not hold.</p>
      <p><b>What you must still own:</b> the augmenting-path idea (it is the same idea as max flow, which interviewers love to connect), the reductions (vertex cover, path cover, independent set), and complexity choices between Kuhn, Hopcroft-Karp and Dinic.</p>`,
    problems: [{
      title: 'Maximum Bipartite Matching (Job Applicants)',
      level: 'Medium', tags: ['bipartite matching', 'kuhn', 'augmenting path'], companies: ['Amazon', 'Google', 'Flipkart'],
      statement: `<p>There are <code>M</code> applicants and <code>N</code> jobs. <code>G[i][j] = 1</code> if applicant i is interested in job j. Each job takes at most one applicant and each applicant takes at most one job. Return the maximum number of applicants who can get a job.</p>`,
      constraints: `<p>1 ≤ M, N ≤ 100.</p>`,
      example: `<p>G = <code>[[1,1,0],[1,0,0],[0,1,1],[0,0,1]]</code> → <b>${H.c('g', '3')}</b>.</p><p>Why: applicant 1 can only do job 0, so applicant 0 takes job 1, applicant 2 takes job 2. Applicant 3 also wants only job 2 — there are just 3 jobs, so 3 is the best possible.</p>`,
      brute: {
        why: `<p>Backtracking: for each applicant, either skip them or give them any free job they like. That explores up to (N + 1)<sup>M</sup> assignments — far too many for 100 × 100. The waste: assignments that differ only in irrelevant ways are explored again and again.</p>`,
        code: `class Brute {
    private int best = 0;

    int maximumMatch(int[][] G) {
        int n = G.length > 0 ? G[0].length : 0;
        go(G, 0, new boolean[n], 0);
        return best;
    }

    private void go(int[][] G, int i, boolean[] taken, int count) {
        if (i == G.length) { best = Math.max(best, count); return; }
        go(G, i + 1, taken, count);                      // applicant i gets nothing
        for (int j = 0; j < taken.length; j++)
            if (G[i][j] == 1 && !taken[j]) {
                taken[j] = true;
                go(G, i + 1, taken, count + 1);
                taken[j] = false;
            }
    }
}`
      },
      mcq: { q: 'Applicant C wants job 1, which applicant A holds. What does Kuhn do?', options: ['Recursively asks A to find another job it likes; if A succeeds, C takes job 1', 'Skips job 1 forever', 'Gives job 1 to C and leaves A unmatched', 'Restarts the whole matching'], answer: 0, explain: 'That recursive "can you move?" request is the search for an augmenting path. The matching never shrinks.' },
      hints: [
        `<p>Hint 1: Process applicants one by one. A new applicant may take a job that is held, if the holder can move to another job it likes.</p>`,
        `<p>Hint 2: Write <code>tryAssign(a, seen)</code>: for each job j applicant a likes and not yet seen this round, mark it, and succeed if j is free or <code>tryAssign(owner[j], seen)</code> succeeds.</p>`,
        `<p>Hint 3: Recipe — owner[] = −1; for each applicant: fresh seen[], if tryAssign succeeds, count++. Answer = count. O(M · M·N) with a matrix.</p>`
      ],
      tests: { sig: "string int[][] -> int", fn: "match", cases: [
          [["",[[1,1,0],[1,0,0],[0,1,1],[0,0,1]]],3],
          [["",[[0]]],0],
          [["",[[1]]],1],
          [["",[[0,0,0],[0,0,0],[0,0,0]]],0],
          [["",[[1,1],[1,0]]],2],
          [["",[[1,1,1,1,1]]],1],
          [["",[[1],[1],[1],[1],[1]]],1],
          [["",[[1,0,0,0],[1,1,0,0],[0,1,1,0],[0,0,1,1]]],4],
          [["",[[1,1,0,0,0],[1,1,0,0,0],[1,1,0,0,0],[0,0,1,0,0]]],3],
          [["",[[1,0,0,0,1,0],[1,0,0,0,1,0]]],2],
          [["",[[0,1,0,0,0],[0,0,1,0,1]]],2],
          [["",[[1,0,0,1,0,0]]],1],
          [["",[[0],[1]]],1],
          [["",[[0,0],[0,1],[0,1],[0,0]]],1],
          [["",[[0,0,0,1],[0,0,0,0],[0,0,0,1],[0,1,0,0]]],2],
          [["",[[0,0,1,0,0],[1,0,0,0,1],[0,1,0,0,1],[0,0,1,0,1],[0,1,0,0,0],[0,0,1,1,0]]],5],
          [["",[[1,0],[0,1],[0,1],[1,1],[1,1]]],2],
          [["",[[1,0,0,0,1],[0,0,0,0,0]]],1],
          [["",[[0,1,1,1,0,0],[0,0,0,0,0,1]]],2],
          [["",{"$rep":[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],"n":100}],100],
          [["",{"$rep":[1],"n":100}],1],
          [["",[[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]]],1],
          [["identity",[]],100],
          [["upper",[]],100],
          [["hall",[]],50]
        ], harness: { java: `class Check {
  static int match(String kind, int[][] G) {
    if (!kind.isEmpty()) {
      G = new int[100][100];
      for (int i = 0; i < 100; i++) for (int j = 0; j < 100; j++)
        G[i][j] = kind.equals("identity") ? (i == j ? 1 : 0) : kind.equals("upper") ? (j >= i ? 1 : 0) : (j < 50 ? 1 : 0);
    }
    return new Solution().maximumMatch(G);
  }
}`, python: `def match(kind, G):
    if kind != '':
        G = [[(i == j) if kind == 'identity' else (j >= i) if kind == 'upper' else (j < 50) for j in range(100)] for i in range(100)]
        G = [[int(x) for x in row] for row in G]
    return maximum_match(G)`, js: `function match(kind, G) {
  if (kind !== '') {
    G = Array.from({ length: 100 }, (_, i) => Array.from({ length: 100 }, (_, j) =>
      kind === 'identity' ? (i === j ? 1 : 0) : kind === 'upper' ? (j >= i ? 1 : 0) : (j < 50 ? 1 : 0)));
  }
  return maximumMatch(G);
}`, cpp: `int match(string kind, vector<vector<int>> G) {
  if (!kind.empty()) {
    G.assign(100, vector<int>(100, 0));
    for (int i = 0; i < 100; i++) for (int j = 0; j < 100; j++)
      G[i][j] = kind == "identity" ? (i == j) : kind == "upper" ? (j >= i) : (j < 50);
  }
  return Solution().maximumMatch(G);
}` } },
      solution: {
        approach: `<p>Kuhn's augmenting-path algorithm on the adjacency matrix. Each successful call flips one alternating chain and grows the matching by one.</p>`,
        code: `class Solution {
    int maximumMatch(int[][] G) {
        int m = G.length, n = m > 0 ? G[0].length : 0;
        int[] owner = new int[n];                 // owner[j] = applicant holding job j, or -1
        Arrays.fill(owner, -1);
        int result = 0;
        for (int a = 0; a < m; a++)
            if (tryAssign(G, a, new boolean[n], owner)) result++;
        return result;
    }

    private boolean tryAssign(int[][] G, int a, boolean[] seen, int[] owner) {
        for (int j = 0; j < owner.length; j++) {
            if (G[a][j] == 0 || seen[j]) continue;
            seen[j] = true;
            if (owner[j] == -1 || tryAssign(G, owner[j], seen, owner)) {
                owner[j] = a;                     // a takes j (the old owner already moved)
                return true;
            }
        }
        return false;
    }
}`,
      alt: [{ lang: 'python', code: `def maximum_match(G):
    m = len(G)
    n = len(G[0]) if m else 0
    owner = [-1] * n                      # owner[j] = applicant holding job j, or -1

    def try_assign(a, seen):
        for j in range(n):
            if G[a][j] and not seen[j]:
                seen[j] = True
                if owner[j] == -1 or try_assign(owner[j], seen):
                    owner[j] = a          # a takes j (the old owner already moved)
                    return True
        return False

    return sum(try_assign(a, [False] * n) for a in range(m))
` }, { lang: 'js', code: `function maximumMatch(G) {
  const m = G.length, n = m ? G[0].length : 0;
  const owner = new Array(n).fill(-1);    // owner[j] = applicant holding job j, or -1

  const tryAssign = (a, seen) => {
    for (let j = 0; j < n; j++) {
      if (!G[a][j] || seen[j]) continue;
      seen[j] = true;
      if (owner[j] === -1 || tryAssign(owner[j], seen)) {
        owner[j] = a;                     // a takes j (the old owner already moved)
        return true;
      }
    }
    return false;
  };

  let result = 0;
  for (let a = 0; a < m; a++) if (tryAssign(a, new Array(n).fill(false))) result++;
  return result;
}
` }, { lang: 'cpp', code: `class Solution {
    bool tryAssign(const vector<vector<int>>& G, int a, vector<char>& seen, vector<int>& owner) {
        for (int j = 0; j < (int)owner.size(); j++) {
            if (!G[a][j] || seen[j]) continue;
            seen[j] = 1;
            if (owner[j] == -1 || tryAssign(G, owner[j], seen, owner)) {
                owner[j] = a;              // a takes j (the old owner already moved)
                return true;
            }
        }
        return false;
    }

public:
    int maximumMatch(vector<vector<int>>& G) {
        int m = G.size(), n = m ? G[0].size() : 0, result = 0;
        vector<int> owner(n, -1);          // owner[j] = applicant holding job j, or -1
        for (int a = 0; a < m; a++) {
            vector<char> seen(n, 0);
            if (tryAssign(G, a, seen, owner)) result++;
        }
        return result;
    }
};
` }],
        dry: {
          head: ['applicant', 'search', 'owner[] after (jobs 0, 1, 2)', 'count'],
          rows: [
            ['0', 'job 0 free', '[0, −, −]', '1'],
            ['1', 'job 0 held by 0 → 0 tries job 1 (free) → move', '[1, 0, −]', '2'],
            ['2', 'job 1 held by 0 → 0 tries job 0 (held by 1, 1 has nothing else) → fail; job 2 free', '[1, 0, 2]', '3'],
            ['3', 'job 2 held by 2 → 2 tries job 1 → 0 tries job 0 → 1 stuck → fail', '[1, 0, 2]', H.c('g', '<b>3</b>')]
          ]
        },
        complexity: `<p>Each applicant's search visits each job at most once and scans its row: O(M · M · N) worst case with a matrix (O(V·E) with adjacency lists). Space O(N) plus recursion depth ≤ M.</p>`,
        followUps: ['Each job can take up to c<sub>j</sub> applicants (use flow with capacities).', 'Applicants have salary demands — minimise total cost (Hungarian / min-cost flow).', 'Return the minimum set of applicants and jobs that "covers" every interest edge (König).']
      }
    }]
  });

  // =====================================================================
  // PRACTICE — Easy
  // =====================================================================
  practice.push({
    title: 'Find a Mother Vertex',
    level: 'Easy', tags: ['scc', 'kosaraju idea', 'dfs'], companies: ['Amazon', 'Microsoft'],
    statement: `<p>A <b>mother vertex</b> of a directed graph is a vertex from which every other vertex is reachable. Given <code>V</code> vertices and adjacency lists, return the <b>smallest-index</b> mother vertex, or <code>-1</code> if none exists.</p>`,
    constraints: `<p>1 ≤ V ≤ 10<sup>5</sup>, 0 ≤ E ≤ 2·10<sup>5</sup>.</p>`,
    example: `<p>V = 5, edges <code>0→2, 0→3, 1→0, 2→1, 3→4</code> → <b>${H.c('g', '0')}</b>.</p><p>Why: from 0 we reach 2, 3, then 1 (via 2) and 4 (via 3). Nodes 1 and 2 are mother vertices too (they reach 0, which reaches everyone) — 0 is the smallest.</p>`,
    brute: {
      why: `<p>Run a DFS from every vertex and check whether it reaches all V vertices: <b>O(V·(V + E))</b> ≈ 3·10<sup>10</sup>. The waste: Kosaraju's finish-time insight tells us only one vertex is worth testing.</p>`,
      code: `class Brute {
    int findMotherVertex(int V, List<List<Integer>> adj) {
        for (int s = 0; s < V; s++) {
            boolean[] seen = new boolean[V];
            Deque<Integer> st = new ArrayDeque<>();
            st.push(s);
            seen[s] = true;
            int count = 1;
            while (!st.isEmpty()) {
                int u = st.pop();
                for (int w : adj.get(u)) if (!seen[w]) { seen[w] = true; count++; st.push(w); }
            }
            if (count == V) return s;            // first (smallest) success
        }
        return -1;
    }
}`
    },
    mcq: { q: 'You run DFS from 0, 1, 2, … skipping visited vertices. Which vertex is the only possible candidate?', options: ['The start of the LAST DFS tree (it finishes last)', 'Vertex 0', 'The vertex with the largest out-degree', 'Any leaf'], answer: 0, explain: 'The last-finishing vertex lies in a source SCC of the condensation. If any mother vertex exists, it must be in that SCC.' },
    hints: [
      `<p>Hint 1: A mother vertex must be in a <b>source</b> component of the SCC condensation (nothing outside can reach into it and still be reached from it). There can be only one such component if a mother vertex exists.</p>`,
      `<p>Hint 2: The vertex that finishes last in a full DFS sweep lives in a source component (Kosaraju's lemma). Test only that vertex with one more DFS.</p>`,
      `<p>Hint 3: For the smallest index: every mother vertex is in the same SCC as the candidate, i.e. it can reach the candidate. DFS on the reversed graph from the candidate and return the smallest reached index.</p>`
    ],
    tests: { sig: "string int list<list<int>> -> int", fn: "mother", cases: [
        [["",5,[[2,3],[0],[1],[4],[]]],0],
        [["",1,[[]]],0],
        [["",2,[[],[]]],-1],
        [["",1,[[0]]],0],
        [["",3,[[1],[2],[0]]],0],
        [["",3,[[],[0],[1]]],2],
        [["",3,[[1],[],[1]]],-1],
        [["",4,[[1],[0],[3],[2]]],-1],
        [["",4,[[0,1,1],[2],[0,3],[]]],0],
        [["",4,[[0,3],[1,1,3,3,2],[3],[0,0]]],1],
        [["",4,[[2,0,0],[1,2],[],[]]],-1],
        [["",1,[[0]]],0],
        [["",3,[[2],[2,2,0],[0,0]]],1],
        [["",6,[[2],[4,0],[0],[4,2],[],[2]]],-1],
        [["",7,[[1],[],[6],[],[],[],[6,3]]],-1],
        [["",1,[[0,0]]],0],
        [["",6,[[],[1],[],[],[4],[5]]],-1],
        [["",4,[[1],[],[1,3],[0]]],2],
        [["",6,[[5],[1,4],[4],[],[],[2]]],-1],
        [["",5,[[0],[1,2,3],[3],[],[2]]],-1],
        [["",2,[[1,1,1,0,1,0],[1,1]]],0],
        [["chain",100000,[]],0],
        [["revChain",100000,[]],99999],
        [["cycle",100000,[]],0],
        [["chords",100000,[]],0],
        [["twoChains",100000,[]],-1]
      ], harness: { java: `class Check {
  static int mother(String kind, int V, List<List<Integer>> adj) {
    if (!kind.isEmpty()) {
      adj = new ArrayList<>();
      for (int i = 0; i < V; i++) adj.add(new ArrayList<>());
      int h = V / 2;
      for (int i = 0; i < V; i++) {
        if (kind.equals("chain") && i + 1 < V) adj.get(i).add(i + 1);
        if (kind.equals("revChain") && i + 1 < V) adj.get(i + 1).add(i);
        if (kind.equals("twoChains") && i + 1 < V && i + 1 != h) adj.get(i).add(i + 1);
        if (kind.equals("cycle") || kind.equals("chords")) adj.get(i).add((i + 1) % V);
        if (kind.equals("chords")) adj.get(i).add((i + 2) % V);
      }
    }
    return new Solution().findMotherVertex(V, adj);
  }
}`, python: `def mother(kind, V, adj):
    if kind != '':
        adj = [[] for _ in range(V)]
        h = V // 2
        for i in range(V):
            if kind == 'chain' and i + 1 < V:
                adj[i].append(i + 1)
            if kind == 'revChain' and i + 1 < V:
                adj[i + 1].append(i)
            if kind == 'twoChains' and i + 1 < V and i + 1 != h:
                adj[i].append(i + 1)
            if kind in ('cycle', 'chords'):
                adj[i].append((i + 1) % V)
            if kind == 'chords':
                adj[i].append((i + 2) % V)
    return find_mother_vertex(V, adj)`, js: `function mother(kind, V, adj) {
  if (kind !== '') {
    adj = Array.from({ length: V }, () => []);
    const h = Math.floor(V / 2);
    for (let i = 0; i < V; i++) {
      if (kind === 'chain' && i + 1 < V) adj[i].push(i + 1);
      if (kind === 'revChain' && i + 1 < V) adj[i + 1].push(i);
      if (kind === 'twoChains' && i + 1 < V && i + 1 !== h) adj[i].push(i + 1);
      if (kind === 'cycle' || kind === 'chords') adj[i].push((i + 1) % V);
      if (kind === 'chords') adj[i].push((i + 2) % V);
    }
  }
  return findMotherVertex(V, adj);
}`, cpp: `int mother(string kind, int V, vector<vector<int>> adj) {
  if (!kind.empty()) {
    adj.assign(V, {});
    int h = V / 2;
    for (int i = 0; i < V; i++) {
      if (kind == "chain" && i + 1 < V) adj[i].push_back(i + 1);
      if (kind == "revChain" && i + 1 < V) adj[i + 1].push_back(i);
      if (kind == "twoChains" && i + 1 < V && i + 1 != h) adj[i].push_back(i + 1);
      if (kind == "cycle" || kind == "chords") adj[i].push_back((i + 1) % V);
      if (kind == "chords") adj[i].push_back((i + 2) % V);
    }
  }
  return Solution().findMotherVertex(V, adj);
}` } },
    solution: {
      approach: `<p>Three linear passes: (1) DFS sweep, remember the root of the last DFS tree; (2) verify it reaches all vertices; (3) reverse DFS from it to collect its SCC-mates and return the smallest. Iterative DFS avoids stack overflow.</p>`,
      code: `class Solution {
    int findMotherVertex(int V, List<List<Integer>> adj) {
        boolean[] seen = new boolean[V];
        int last = -1;
        for (int v = 0; v < V; v++)
            if (!seen[v]) { dfs(v, adj, seen); last = v; }   // root of the last DFS tree finishes last
        Arrays.fill(seen, false);
        dfs(last, adj, seen);
        for (boolean b : seen) if (!b) return -1;           // candidate fails -> nobody succeeds
        List<List<Integer>> radj = new ArrayList<>();
        for (int i = 0; i < V; i++) radj.add(new ArrayList<>());
        for (int u = 0; u < V; u++) for (int w : adj.get(u)) radj.get(w).add(u);
        boolean[] reachesLast = new boolean[V];
        dfs(last, radj, reachesLast);                        // all mother vertices = can reach 'last'
        for (int v = 0; v < V; v++) if (reachesLast[v]) return v;
        return last;
    }

    private void dfs(int s, List<List<Integer>> adj, boolean[] seen) {
        Deque<Integer> st = new ArrayDeque<>();
        st.push(s);
        seen[s] = true;
        while (!st.isEmpty()) {
            int u = st.pop();
            for (int w : adj.get(u)) if (!seen[w]) { seen[w] = true; st.push(w); }
        }
    }
}`,
      alt: [{ lang: 'python', code: `def find_mother_vertex(V, adj):
    def dfs(s, graph, seen):              # iterative: a path of 10^5 vertices must not overflow
        seen[s] = True
        stack = [s]
        while stack:
            u = stack.pop()
            for w in graph[u]:
                if not seen[w]:
                    seen[w] = True
                    stack.append(w)

    seen = [False] * V
    last = -1
    for v in range(V):
        if not seen[v]:
            dfs(v, adj, seen)
            last = v                      # root of the last DFS tree finishes last
    seen = [False] * V
    dfs(last, adj, seen)
    if not all(seen):
        return -1                         # candidate fails -> nobody succeeds
    radj = [[] for _ in range(V)]
    for u in range(V):
        for w in adj[u]:
            radj[w].append(u)
    reaches_last = [False] * V
    dfs(last, radj, reaches_last)         # all mother vertices = can reach 'last'
    return reaches_last.index(True)
` }, { lang: 'js', code: `function findMotherVertex(V, adj) {
  const dfs = (s, graph, seen) => {       // iterative: a path of 10^5 vertices must not overflow
    seen[s] = 1;
    const stack = [s];
    while (stack.length) {
      const u = stack.pop();
      for (const w of graph[u]) if (!seen[w]) { seen[w] = 1; stack.push(w); }
    }
  };

  let seen = new Uint8Array(V), last = -1;
  for (let v = 0; v < V; v++) {
    if (!seen[v]) { dfs(v, adj, seen); last = v; }    // root of the last DFS tree finishes last
  }
  seen = new Uint8Array(V);
  dfs(last, adj, seen);
  if (seen.includes(0)) return -1;        // candidate fails -> nobody succeeds
  const radj = Array.from({ length: V }, () => []);
  for (let u = 0; u < V; u++) for (const w of adj[u]) radj[w].push(u);
  const reachesLast = new Uint8Array(V);
  dfs(last, radj, reachesLast);           // all mother vertices = can reach 'last'
  return reachesLast.indexOf(1);
}
` }, { lang: 'cpp', code: `class Solution {
    void dfs(int s, const vector<vector<int>>& graph, vector<char>& seen) {   // iterative
        seen[s] = 1;
        vector<int> st{s};
        while (!st.empty()) {
            int u = st.back(); st.pop_back();
            for (int w : graph[u]) if (!seen[w]) { seen[w] = 1; st.push_back(w); }
        }
    }

public:
    int findMotherVertex(int V, vector<vector<int>>& adj) {
        vector<char> seen(V, 0);
        int last = -1;
        for (int v = 0; v < V; v++)
            if (!seen[v]) { dfs(v, adj, seen); last = v; }    // root of the last DFS tree finishes last
        fill(seen.begin(), seen.end(), 0);
        dfs(last, adj, seen);
        if (find(seen.begin(), seen.end(), 0) != seen.end()) return -1;   // candidate fails -> nobody succeeds
        vector<vector<int>> radj(V);
        for (int u = 0; u < V; u++) for (int w : adj[u]) radj[w].push_back(u);
        vector<char> reachesLast(V, 0);
        dfs(last, radj, reachesLast);                         // all mother vertices = can reach 'last'
        return int(find(reachesLast.begin(), reachesLast.end(), 1) - reachesLast.begin());
    }
};
` }],
      complexity: `<p>Time <b>O(V + E)</b>, space <b>O(V + E)</b> (reverse graph).</p>`,
      followUps: ['Return ALL mother vertices.', 'How many edges must be added so a mother vertex exists? (Number of source SCCs − 1.)']
    }
  });

  practice.push({
    title: 'Euler Circuit or Euler Path? (Undirected)',
    level: 'Easy', tags: ['euler', 'degree', 'connectivity'], companies: ['Amazon', 'Adobe'],
    statement: `<p>Given an undirected graph with <code>V</code> vertices (adjacency lists), return <b>2</b> if it has an Euler circuit, <b>1</b> if it has an Euler path but no circuit, and <b>0</b> otherwise. A graph with no edges counts as having a circuit.</p>`,
    constraints: `<p>1 ≤ V ≤ 10<sup>5</sup>, 0 ≤ E ≤ 2·10<sup>5</sup>, no self-loops.</p>`,
    example: `<p>Edges <code>0–1, 1–2, 2–0, 0–3</code> → <b>${H.c('g', '1')}</b>.</p><p>Why: degrees are 3, 2, 2, 1 → exactly two odd vertices (0 and 3), and all edges are connected. A path exists (3 → 0 → 1 → 2 → 0) but it cannot return to its start.</p>`,
    brute: {
      why: `<p>Backtracking over the order of edges from every start vertex tries up to E! orders. Even 12 edges is 479 million orders. The waste: Euler's degree argument answers the question without searching at all.</p>`,
      code: `class Brute {
    int isEulerian(int V, List<List<Integer>> adj) {
        List<int[]> edges = new ArrayList<>();
        for (int u = 0; u < V; u++) for (int w : adj.get(u)) if (u < w) edges.add(new int[]{u, w});
        if (edges.isEmpty()) return 2;
        boolean path = false;
        for (int s = 0; s < V; s++) {
            int r = walk(s, s, edges, new boolean[edges.size()], 0);
            if (r == 2) return 2;
            if (r == 1) path = true;
        }
        return path ? 1 : 0;
    }

    // 2 = used all edges and came back to start, 1 = used all edges elsewhere, 0 = stuck
    private int walk(int start, int at, List<int[]> edges, boolean[] used, int count) {
        if (count == edges.size()) return at == start ? 2 : 1;
        int best = 0;
        for (int i = 0; i < edges.size() && best < 2; i++) {
            if (used[i]) continue;
            int[] e = edges.get(i);
            int next = e[0] == at ? e[1] : (e[1] == at ? e[0] : -1);
            if (next < 0) continue;
            used[i] = true;
            best = Math.max(best, walk(start, next, edges, used, count + 1));
            used[i] = false;
        }
        return best;
    }
}`
    },
    mcq: { q: 'Degrees are 2, 4, 3, 3, 2, 1, 1 and the graph is connected. Answer?', options: ['0 — four odd vertices', '1', '2', 'Cannot tell without searching'], answer: 0, explain: 'Odd-degree vertices: 3, 3, 1, 1 → four of them. A trail can have at most two "unpaired" endpoints.' },
    hints: [
      `<p>Hint 1: Each time a trail passes through a vertex it uses two edges. Only the two ends of the trail can have an unpaired edge.</p>`,
      `<p>Hint 2: Count odd-degree vertices: 0 → circuit, 2 → path, otherwise none. Degrees alone are not enough — check connectivity too.</p>`,
      `<p>Hint 3: Recipe — find any vertex with an edge, DFS from it, and make sure every vertex that has an edge was visited (isolated vertices are fine). Then apply the odd-count rule.</p>`
    ],
    tests: { sig: "string int list<list<int>> -> int", fn: "euler", cases: [
        [["",4,[[1,2,3],[0,2],[1,0],[0]]],1],
        [["",1,[[]]],2],
        [["",3,[[],[],[]]],2],
        [["",2,[[1],[0]]],1],
        [["",3,[[1,2],[0,2],[1,0]]],2],
        [["",5,[[1,2],[0,2],[1,0],[4,4],[3,3]]],0],
        [["",7,[[1,2],[0,2],[1,0],[],[],[],[]]],2],
        [["",5,[[1,2,3,4],[0],[0],[0],[0]]],0],
        [["",4,[[1,2,3],[0,2,3],[0,1,3],[0,1,2]]],0],
        [["",2,[[1,1],[0,0]]],2],
        [["",6,[[1],[0,2],[1,3],[2,4],[3,5],[4]]],1],
        [["",7,[[1,6],[0,2],[1,3],[2,4],[3,5],[4,6],[5,0]]],2],
        [["",5,[[1,2,3,4],[0,2,3,4],[0,1,3,4],[0,1,2,4],[0,1,2,3]]],2],
        [["",5,[[2],[],[3,4,0,3,4],[2,2],[2,2]]],1],
        [["",4,[[2,1,2],[0,2,3],[0,1,0,3],[2,1]]],1],
        [["",6,[[1,1,5],[3,0,0],[4],[1,4],[5,2,3],[4,0]]],0],
        [["",7,[[2,5,5,4],[3],[0],[4,1,4],[3,0,3],[0,0],[]]],0],
        [["",7,[[5],[],[3,5,3],[2,2],[],[0,2],[]]],1],
        [["",4,[[1,1],[0,0,3,3,2],[3,3,1],[2,1,2,1]]],1],
        [["",3,[[2,1,1,1],[0,0,2,0],[0,1]]],2],
        [["",5,[[4,3],[],[3,3],[2,2,0,4],[0,3]]],2],
        [["",6,[[3],[],[5],[0],[],[2]]],0],
        [["",7,[[2],[4],[0],[4],[5,3,1],[4],[]]],0],
        [["",6,[[3],[2],[1],[0],[5],[4]]],0],
        [["",6,[[],[],[5],[],[],[2]]],1],
        [["cycle",100000,[]],2],
        [["path",100000,[]],1],
        [["twoCycles",100000,[]],0],
        [["chords",100000,[]],2],
        [["star",100000,[]],0]
      ], harness: { java: `class Check {
  static int euler(String kind, int V, List<List<Integer>> adj) {
    if (!kind.isEmpty()) {
      adj = new ArrayList<>();
      for (int i = 0; i < V; i++) adj.add(new ArrayList<>());
      int h = V / 2;
      for (int i = 0; i < V; i++) {
        int[] to = new int[0];
        if (kind.equals("cycle")) to = new int[]{(i + 1) % V};
        else if (kind.equals("path")) to = i + 1 < V ? new int[]{i + 1} : new int[0];
        else if (kind.equals("chords")) to = new int[]{(i + 1) % V, (i + 2) % V};
        else if (kind.equals("star")) to = i == 0 ? new int[0] : new int[]{0};
        else if (kind.equals("twoCycles")) to = new int[]{i < h ? (i + 1) % h : h + (i - h + 1) % (V - h)};
        for (int w : to) { adj.get(i).add(w); adj.get(w).add(i); }
      }
    }
    return new Solution().isEulerian(V, adj);
  }
}`, python: `def euler(kind, V, adj):
    if kind != '':
        adj = [[] for _ in range(V)]
        h = V // 2
        for i in range(V):
            if kind == 'cycle':
                to = [(i + 1) % V]
            elif kind == 'path':
                to = [i + 1] if i + 1 < V else []
            elif kind == 'chords':
                to = [(i + 1) % V, (i + 2) % V]
            elif kind == 'star':
                to = [0] if i else []
            else:
                to = [(i + 1) % h if i < h else h + (i - h + 1) % (V - h)]
            for w in to:
                adj[i].append(w)
                adj[w].append(i)
    return is_eulerian(V, adj)`, js: `function euler(kind, V, adj) {
  if (kind !== '') {
    adj = Array.from({ length: V }, () => []);
    const h = Math.floor(V / 2);
    for (let i = 0; i < V; i++) {
      let to = [];
      if (kind === 'cycle') to = [(i + 1) % V];
      else if (kind === 'path') to = i + 1 < V ? [i + 1] : [];
      else if (kind === 'chords') to = [(i + 1) % V, (i + 2) % V];
      else if (kind === 'star') to = i === 0 ? [] : [0];
      else to = [i < h ? (i + 1) % h : h + (i - h + 1) % (V - h)];
      for (const w of to) { adj[i].push(w); adj[w].push(i); }
    }
  }
  return isEulerian(V, adj);
}`, cpp: `int euler(string kind, int V, vector<vector<int>> adj) {
  if (!kind.empty()) {
    adj.assign(V, {});
    int h = V / 2;
    for (int i = 0; i < V; i++) {
      vector<int> to;
      if (kind == "cycle") to = {(i + 1) % V};
      else if (kind == "path") { if (i + 1 < V) to = {i + 1}; }
      else if (kind == "chords") to = {(i + 1) % V, (i + 2) % V};
      else if (kind == "star") { if (i) to = {0}; }
      else to = {i < h ? (i + 1) % h : h + (i - h + 1) % (V - h)};
      for (int w : to) { adj[i].push_back(w); adj[w].push_back(i); }
    }
  }
  return Solution().isEulerian(V, adj);
}` } },
    solution: {
      approach: `<p>Degree parity + one DFS for connectivity among non-isolated vertices.</p>`,
      code: `class Solution {
    int isEulerian(int V, List<List<Integer>> adj) {
        int odd = 0, start = -1;
        for (int v = 0; v < V; v++) {
            if (adj.get(v).size() % 2 == 1) odd++;
            if (start == -1 && !adj.get(v).isEmpty()) start = v;
        }
        if (start == -1) return 2;                          // no edges at all
        boolean[] seen = new boolean[V];
        Deque<Integer> st = new ArrayDeque<>();
        st.push(start);
        seen[start] = true;
        while (!st.isEmpty()) {
            int u = st.pop();
            for (int w : adj.get(u)) if (!seen[w]) { seen[w] = true; st.push(w); }
        }
        for (int v = 0; v < V; v++)
            if (!adj.get(v).isEmpty() && !seen[v]) return 0;  // edges live in two separate pieces
        if (odd == 0) return 2;
        return odd == 2 ? 1 : 0;
    }
}`,
      alt: [{ lang: 'python', code: `def is_eulerian(V, adj):
    odd = sum(len(a) % 2 for a in adj)                  # vertices with odd degree
    start = next((v for v in range(V) if adj[v]), -1)
    if start == -1:
        return 2                                        # no edges at all
    seen = [False] * V
    seen[start] = True
    stack = [start]
    while stack:
        u = stack.pop()
        for w in adj[u]:
            if not seen[w]:
                seen[w] = True
                stack.append(w)
    if any(adj[v] and not seen[v] for v in range(V)):
        return 0                                        # edges live in two separate pieces
    if odd == 0:
        return 2
    return 1 if odd == 2 else 0
` }, { lang: 'js', code: `function isEulerian(V, adj) {
  let odd = 0, start = -1;
  for (let v = 0; v < V; v++) {
    if (adj[v].length % 2 === 1) odd++;
    if (start === -1 && adj[v].length > 0) start = v;
  }
  if (start === -1) return 2;                           // no edges at all
  const seen = new Uint8Array(V);
  seen[start] = 1;
  const stack = [start];
  while (stack.length) {
    const u = stack.pop();
    for (const w of adj[u]) if (!seen[w]) { seen[w] = 1; stack.push(w); }
  }
  for (let v = 0; v < V; v++) if (adj[v].length > 0 && !seen[v]) return 0;   // two separate pieces
  if (odd === 0) return 2;
  return odd === 2 ? 1 : 0;
}
` }, { lang: 'cpp', code: `class Solution {
public:
    int isEulerian(int V, vector<vector<int>>& adj) {
        int odd = 0, start = -1;
        for (int v = 0; v < V; v++) {
            if (adj[v].size() % 2 == 1) odd++;
            if (start == -1 && !adj[v].empty()) start = v;
        }
        if (start == -1) return 2;                      // no edges at all
        vector<char> seen(V, 0);
        seen[start] = 1;
        vector<int> st{start};
        while (!st.empty()) {
            int u = st.back(); st.pop_back();
            for (int w : adj[u]) if (!seen[w]) { seen[w] = 1; st.push_back(w); }
        }
        for (int v = 0; v < V; v++)
            if (!adj[v].empty() && !seen[v]) return 0;  // edges live in two separate pieces
        if (odd == 0) return 2;
        return odd == 2 ? 1 : 0;
    }
};
` }],
      complexity: `<p>Time <b>O(V + E)</b>, space <b>O(V)</b>.</p>`,
      followUps: ['Directed version (in/out degrees).', 'Actually print the path with Hierholzer.']
    }
  });

  practice.push({
    title: 'Is the Graph Biconnected?',
    level: 'Easy', tags: ['articulation points', 'low-link'], companies: ['Cisco', 'Amazon'],
    statement: `<p>An undirected graph with <code>n ≥ 2</code> vertices is <b>biconnected</b> if it is connected and has <b>no articulation point</b> (removing any single vertex leaves it connected). Return true or false.</p>`,
    constraints: `<p>2 ≤ n ≤ 10<sup>5</sup>, 1 ≤ E ≤ 2·10<sup>5</sup>.</p>`,
    example: `<p>n = 4, edges <code>0–1, 1–2, 2–3, 3–0</code> → <b>${H.c('g', 'true')}</b> (a square: removing any corner leaves a path).</p><p>Add vertex 4 with edge <code>3–4</code> → <b>${H.c('r', 'false')}</b>: removing 3 cuts 4 off.</p>`,
    brute: {
      why: `<p>Remove each vertex in turn and BFS the rest: <b>O(V·(V + E))</b>. The waste: every BFS re-explores almost the same graph; one low-link DFS answers for all vertices at once.</p>`,
      code: `class Brute {
    boolean isBiconnected(int n, int[][] edges) {
        for (int removed = -1; removed < n; removed++) {      // -1 = remove nothing (plain connectivity)
            List<List<Integer>> adj = new ArrayList<>();
            for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
            for (int[] e : edges) if (e[0] != removed && e[1] != removed) { adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]); }
            int start = removed == 0 ? 1 : 0;
            boolean[] seen = new boolean[n];
            Deque<Integer> q = new ArrayDeque<>();
            q.add(start);
            seen[start] = true;
            int count = 1;
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int w : adj.get(u)) if (!seen[w]) { seen[w] = true; count++; q.add(w); }
            }
            if (count != (removed == -1 ? n : n - 1)) return false;
        }
        return true;
    }
}`
    },
    mcq: { q: 'For articulation points, is it safe to skip the parent VERTEX (not edge id) in the DFS?', options: ['Yes — parallel edges never change whether removing a vertex disconnects the graph', 'No, it breaks on parallel edges', 'Only for trees', 'Only if the graph is directed'], answer: 0, explain: 'Removing vertex v deletes all its parallel edges at once, so they do not matter for cut vertices. For BRIDGES you must skip by edge id.' },
    hints: [
      `<p>Hint 1: Biconnected = connected + no cut vertex. One DFS from vertex 0 checks both: every vertex must get a disc time.</p>`,
      `<p>Hint 2: Non-root v is a cut vertex if some child w has <code>low[w] ≥ disc[v]</code>; the root is one if it has ≥ 2 DFS children.</p>`,
      `<p>Hint 3: Recipe — DFS(0, −1) computing disc/low and a flag; after it, if any disc is still −1 return false; else return !flag. For n = 10<sup>5</sup> chains consider an iterative DFS.</p>`
    ],
    tests: { sig: "string int int[][] -> bool", fn: "biconn", cases: [
        [["",4,[[0,1],[1,2],[2,3],[3,0]]],true],
        [["",5,[[0,1],[1,2],[2,3],[3,0],[3,4]]],false],
        [["",2,[[0,1]]],true],
        [["",3,[[0,1],[1,2]]],false],
        [["",3,[[0,1],[1,2],[2,0]]],true],
        [["",4,[[0,1],[2,3]]],false],
        [["",3,[[0,1]]],false],
        [["",5,[[0,1],[1,2],[2,0],[2,3],[3,4],[4,2]]],false],
        [["",4,[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]]],true],
        [["",5,[[0,1],[1,2],[2,3],[3,4],[4,0],[0,2]]],true],
        [["",3,[[0,1],[0,1],[1,2],[2,0]]],true],
        [["",4,[[2,3]]],false],
        [["",3,[[2,1]]],false],
        [["",5,[[0,4],[1,2],[3,4],[2,3],[4,1],[1,4],[1,2],[1,0],[1,0]]],true],
        [["",3,[[0,1],[1,2],[0,1],[1,0]]],false],
        [["",4,[[0,1],[2,3],[0,1],[2,1],[0,1],[1,3],[0,2],[1,0],[1,0]]],true],
        [["",7,[[0,4]]],false],
        [["",5,[[2,0],[0,2],[2,4],[3,1],[2,3]]],false],
        [["",4,[[0,3],[0,3],[0,1],[3,0],[1,2],[2,1],[2,0],[3,2],[3,0],[0,1],[2,0]]],true],
        [["",7,[[0,2],[4,5],[3,1]]],false],
        [["",3,[[2,0]]],false],
        [["",5,[[0,3],[1,2],[3,2],[3,1],[0,2]]],false],
        [["",2,[[1,0],[0,1],[0,1],[1,0],[0,1]]],true],
        [["path",100000,[]],false],
        [["cycle",100000,[]],true],
        [["chords",100000,[]],true],
        [["bowtie",100000,[]],false],
        [["twoCycles",100000,[]],false],
        [["cycleTail",100000,[]],false]
      ], harness: { java: `class Check {
  static int[][] ugen(String kind, int n) {
    List<int[]> e = new ArrayList<>();
    int h = n / 2;
    if (kind.equals("path")) { for (int i = 0; i + 1 < n; i++) e.add(new int[]{i, i + 1}); }
    else if (kind.equals("star")) { for (int i = 1; i < n; i++) e.add(new int[]{0, i}); }
    else if (kind.equals("cycleTail")) {
      for (int i = 0; i < h; i++) e.add(new int[]{i, (i + 1) % h});
      for (int i = h - 1; i + 1 < n; i++) e.add(new int[]{i, i + 1});
    } else if (kind.equals("bowtie")) {
      for (int i = 0; i < h; i++) e.add(new int[]{i, (i + 1) % h});
      int k = n - h + 1;                                  // second cycle: 0, h, h+1, ..., n-1
      for (int j = 0; j < k; j++) {
        int a = j == 0 ? 0 : h + j - 1, jn = (j + 1) % k, b = jn == 0 ? 0 : h + jn - 1;
        e.add(new int[]{a, b});
      }
    } else if (kind.equals("twoCycles")) {
      for (int i = 0; i < h; i++) e.add(new int[]{i, (i + 1) % h});
      for (int i = 0; i < n - h; i++) e.add(new int[]{h + i, h + (i + 1) % (n - h)});
    } else {
      for (int i = 0; i < n; i++) { e.add(new int[]{i, (i + 1) % n}); if (kind.equals("chords")) e.add(new int[]{i, (i + 2) % n}); }
    }
    return e.toArray(new int[0][]);
  }
  static boolean biconn(String kind, int n, int[][] edges) {
    return new Solution().isBiconnected(n, kind.isEmpty() ? edges : ugen(kind, n));
  }
}`, python: `def _ugen(kind, n):
    h = n // 2
    if kind == 'path':
        return [[i, i + 1] for i in range(n - 1)]
    if kind == 'star':
        return [[0, i] for i in range(1, n)]
    if kind == 'cycleTail':
        return [[i, (i + 1) % h] for i in range(h)] + [[i, i + 1] for i in range(h - 1, n - 1)]
    if kind == 'bowtie':
        w = [0] + list(range(h, n))                      # second cycle: 0, h, h+1, ..., n-1
        return [[i, (i + 1) % h] for i in range(h)] + [[w[j], w[(j + 1) % len(w)]] for j in range(len(w))]
    if kind == 'twoCycles':
        return [[i, (i + 1) % h] for i in range(h)] + [[h + i, h + (i + 1) % (n - h)] for i in range(n - h)]
    e = [[i, (i + 1) % n] for i in range(n)]
    if kind == 'chords':
        e += [[i, (i + 2) % n] for i in range(n)]
    return e


def biconn(kind, n, edges):
    return is_biconnected(n, edges if kind == '' else _ugen(kind, n))`, js: `function _ugen(kind, n) {
  const e = [], h = Math.floor(n / 2);
  if (kind === 'path') { for (let i = 0; i + 1 < n; i++) e.push([i, i + 1]); }
  else if (kind === 'star') { for (let i = 1; i < n; i++) e.push([0, i]); }
  else if (kind === 'cycleTail') {
    for (let i = 0; i < h; i++) e.push([i, (i + 1) % h]);
    for (let i = h - 1; i + 1 < n; i++) e.push([i, i + 1]);
  } else if (kind === 'bowtie') {
    for (let i = 0; i < h; i++) e.push([i, (i + 1) % h]);
    const w = [0]; for (let i = h; i < n; i++) w.push(i);   // second cycle: 0, h, h+1, ..., n-1
    for (let j = 0; j < w.length; j++) e.push([w[j], w[(j + 1) % w.length]]);
  } else if (kind === 'twoCycles') {
    for (let i = 0; i < h; i++) e.push([i, (i + 1) % h]);
    for (let i = 0; i < n - h; i++) e.push([h + i, h + (i + 1) % (n - h)]);
  } else {
    for (let i = 0; i < n; i++) { e.push([i, (i + 1) % n]); if (kind === 'chords') e.push([i, (i + 2) % n]); }
  }
  return e;
}
function biconn(kind, n, edges) { return isBiconnected(n, kind === '' ? edges : _ugen(kind, n)); }`, cpp: `vector<vector<int>> _ugen(const string& kind, int n) {
  vector<vector<int>> e;
  int h = n / 2;
  if (kind == "path") { for (int i = 0; i + 1 < n; i++) e.push_back({i, i + 1}); }
  else if (kind == "star") { for (int i = 1; i < n; i++) e.push_back({0, i}); }
  else if (kind == "cycleTail") {
    for (int i = 0; i < h; i++) e.push_back({i, (i + 1) % h});
    for (int i = h - 1; i + 1 < n; i++) e.push_back({i, i + 1});
  } else if (kind == "bowtie") {
    for (int i = 0; i < h; i++) e.push_back({i, (i + 1) % h});
    vector<int> w{0}; for (int i = h; i < n; i++) w.push_back(i);   // second cycle: 0, h, h+1, ..., n-1
    for (size_t j = 0; j < w.size(); j++) e.push_back({w[j], w[(j + 1) % w.size()]});
  } else if (kind == "twoCycles") {
    for (int i = 0; i < h; i++) e.push_back({i, (i + 1) % h});
    for (int i = 0; i < n - h; i++) e.push_back({h + i, h + (i + 1) % (n - h)});
  } else {
    for (int i = 0; i < n; i++) { e.push_back({i, (i + 1) % n}); if (kind == "chords") e.push_back({i, (i + 2) % n}); }
  }
  return e;
}
bool biconn(string kind, int n, vector<vector<int>> edges) {
  if (!kind.empty()) edges = _ugen(kind, n);
  return Solution().isBiconnected(n, edges);
}` } },
    solution: {
      approach: `<p>Low-link DFS from vertex 0 with the two articulation-point rules, plus a visited check for connectivity.</p>`,
      code: `class Solution {
    boolean isBiconnected(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) { adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]); }
        int[] disc = new int[n], low = new int[n], next = new int[n], parent = new int[n], children = new int[n];
        Arrays.fill(disc, -1);
        int[] stack = new int[n];                              // our own DFS stack: no deep recursion
        int sp = 0, timer = 0;
        boolean hasCut = false;
        stack[sp++] = 0;
        parent[0] = -1;
        disc[0] = low[0] = timer++;
        while (sp > 0) {
            int v = stack[sp - 1];
            if (next[v] < adj.get(v).size()) {
                int w = adj.get(v).get(next[v]++);
                if (w == parent[v]) continue;
                if (disc[w] == -1) {                           // "recursive call" into w
                    children[v]++;
                    parent[w] = v;
                    disc[w] = low[w] = timer++;
                    stack[sp++] = w;
                } else {
                    low[v] = Math.min(low[v], disc[w]);
                }
            } else {                                           // "return" from v
                sp--;
                int p = parent[v];
                if (p != -1) {
                    low[p] = Math.min(low[p], low[v]);
                    if (parent[p] != -1 && low[v] >= disc[p]) hasCut = true;   // p is not the root
                } else if (children[v] > 1) {
                    hasCut = true;                             // the root with two or more children
                }
            }
        }
        for (int v = 0; v < n; v++) if (disc[v] == -1) return false;   // not even connected
        return !hasCut;
    }
}`,
      alt: [{ lang: 'python', code: `def is_biconnected(n, edges):
    adj = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)

    disc = [-1] * n
    low = [0] * n
    nxt = [0] * n                        # next neighbour index to try, per node
    parent = [-1] * n
    children = [0] * n
    timer = 0
    has_cut = False
    disc[0] = low[0] = timer
    timer += 1
    stack = [0]                          # our own DFS stack: no recursion limit
    while stack:
        v = stack[-1]
        if nxt[v] < len(adj[v]):
            w = adj[v][nxt[v]]
            nxt[v] += 1
            if w == parent[v]:
                continue
            if disc[w] == -1:
                children[v] += 1
                parent[w] = v
                disc[w] = low[w] = timer
                timer += 1
                stack.append(w)
            else:
                low[v] = min(low[v], disc[w])
        else:
            stack.pop()
            p = parent[v]
            if p != -1:
                low[p] = min(low[p], low[v])
                if parent[p] != -1 and low[v] >= disc[p]:   # p is not the root
                    has_cut = True
            elif children[v] > 1:                           # the root with two or more children
                has_cut = True
    if -1 in disc:
        return False                     # not even connected
    return not has_cut
` }, { lang: 'js', code: `function isBiconnected(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }

  const disc = new Int32Array(n).fill(-1), low = new Int32Array(n), next = new Int32Array(n);
  const parent = new Int32Array(n).fill(-1), children = new Int32Array(n);
  let timer = 0, hasCut = false;
  disc[0] = low[0] = timer++;
  const stack = [0];                     // our own DFS stack: no stack overflow
  while (stack.length) {
    const v = stack[stack.length - 1];
    if (next[v] < adj[v].length) {
      const w = adj[v][next[v]++];
      if (w === parent[v]) continue;
      if (disc[w] === -1) {
        children[v]++;
        parent[w] = v;
        disc[w] = low[w] = timer++;
        stack.push(w);
      } else {
        low[v] = Math.min(low[v], disc[w]);
      }
    } else {
      stack.pop();
      const p = parent[v];
      if (p !== -1) {
        low[p] = Math.min(low[p], low[v]);
        if (parent[p] !== -1 && low[v] >= disc[p]) hasCut = true;   // p is not the root
      } else if (children[v] > 1) {
        hasCut = true;                   // the root with two or more children
      }
    }
  }
  if (disc.includes(-1)) return false;   // not even connected
  return !hasCut;
}
` }, { lang: 'cpp', code: `class Solution {
public:
    bool isBiconnected(int n, vector<vector<int>>& edges) {
        vector<vector<int>> adj(n);
        for (auto& e : edges) { adj[e[0]].push_back(e[1]); adj[e[1]].push_back(e[0]); }

        vector<int> disc(n, -1), low(n, 0), next(n, 0), parent(n, -1), children(n, 0);
        int timer = 0;
        bool hasCut = false;
        disc[0] = low[0] = timer++;
        vector<int> stack{0};                           // our own DFS stack
        while (!stack.empty()) {
            int v = stack.back();
            if (next[v] < (int)adj[v].size()) {
                int w = adj[v][next[v]++];
                if (w == parent[v]) continue;
                if (disc[w] == -1) {
                    children[v]++;
                    parent[w] = v;
                    disc[w] = low[w] = timer++;
                    stack.push_back(w);
                } else {
                    low[v] = min(low[v], disc[w]);
                }
            } else {
                stack.pop_back();
                int p = parent[v];
                if (p != -1) {
                    low[p] = min(low[p], low[v]);
                    if (parent[p] != -1 && low[v] >= disc[p]) hasCut = true;   // p is not the root
                } else if (children[v] > 1) {
                    hasCut = true;                      // the root with two or more children
                }
            }
        }
        if (find(disc.begin(), disc.end(), -1) != disc.end()) return false;   // not even connected
        return !hasCut;
    }
};
` }],
      complexity: `<p>Time <b>O(V + E)</b>, space <b>O(V + E)</b>.</p>`,
      followUps: ['Is the graph 2-edge-connected (no bridges)?', 'List the biconnected components (edge stack).']
    }
  });

  // =====================================================================
  // PRACTICE — Medium
  // =====================================================================
  practice.push({
    title: 'Articulation Points (Cut Vertices)',
    level: 'Medium', tags: ['articulation points', 'low-link', 'tarjan'], companies: ['Amazon', 'Google', 'Cisco'],
    statement: `<p>Given an undirected graph with <code>V</code> vertices (not necessarily connected), return all articulation points in <b>increasing</b> order, or <code>[-1]</code> if there are none.</p>`,
    constraints: `<p>1 ≤ V ≤ 10<sup>5</sup>, 0 ≤ E ≤ 2·10<sup>5</sup>.</p>`,
    example: `<p>Edges <code>0–1, 1–4, 4–2, 4–3, 3–2</code> → <b>${H.c('g', '[1, 4]')}</b>.</p><p>Why: removing 1 separates 0; removing 4 separates {0, 1} from {2, 3}. 2 and 3 sit on the triangle 2–3–4, so removing either keeps the rest connected.</p>`,
    brute: {
      why: `<p>For each vertex, delete it and count connected components with BFS; compare with the original count. <b>O(V·(V + E))</b>. The waste: the same graph is re-explored V times.</p>`,
      code: `class Brute {
    List<Integer> articulationPoints(int V, int[][] edges) {
        int base = components(V, edges, -1);
        List<Integer> ans = new ArrayList<>();
        for (int v = 0; v < V; v++) if (components(V, edges, v) > base) ans.add(v);
        if (ans.isEmpty()) ans.add(-1);
        return ans;
    }

    private int components(int V, int[][] edges, int removed) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < V; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) if (e[0] != removed && e[1] != removed) { adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]); }
        boolean[] seen = new boolean[V];
        int count = 0;
        for (int s = 0; s < V; s++) {
            if (s == removed || seen[s]) continue;
            count++;
            Deque<Integer> q = new ArrayDeque<>();
            q.add(s);
            seen[s] = true;
            while (!q.isEmpty()) { int u = q.poll(); for (int w : adj.get(u)) if (!seen[w]) { seen[w] = true; q.add(w); } }
        }
        return count;
    }
}`
    },
    mcq: { q: 'A DFS root has exactly 3 DFS children. Is it an articulation point?', options: ['Yes — its subtrees are connected only through it', 'No — roots never are', 'Only if it has degree ≥ 4', 'Need low values to decide'], answer: 0, explain: 'If any path linked two subtrees without the root, DFS would have reached the second subtree from the first. Two or more children ⇒ cut vertex.' },
    hints: [
      `<p>Hint 1: One DFS per connected component with disc[] and low[]. The graph may be disconnected — start a DFS from every unvisited vertex.</p>`,
      `<p>Hint 2: Non-root v: cut vertex iff some child w has <code>low[w] ≥ disc[v]</code>. Root: cut vertex iff ≥ 2 DFS children.</p>`,
      `<p>Hint 3: Use a boolean array, not a list, so a vertex with several qualifying children is reported once; collect in index order at the end for sorted output.</p>`
    ],
    tests: { sig: "string int int[][] -> list<int>", fn: "cuts", cases: [
        [["",5,[[0,1],[1,4],[4,2],[4,3],[3,2]]],[1,4]],
        [["",1,[]],[-1]],
        [["",2,[[0,1]]],[-1]],
        [["",3,[]],[-1]],
        [["",3,[[0,1],[1,2]]],[1]],
        [["",3,[[0,1],[1,2],[2,0]]],[-1]],
        [["",5,[[0,1],[0,2],[0,3],[0,4]]],[0]],
        [["",5,[[0,1],[1,2],[2,0],[2,3],[3,4],[4,2]]],[2]],
        [["",8,[[0,1],[1,2],[3,4],[4,5],[5,3],[6,7]]],[1]],
        [["",4,[[0,1],[0,1],[1,2],[2,3],[2,3]]],[1,2]],
        [["",7,[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0]]],[-1]],
        [["",6,[[0,1],[1,2],[2,0],[2,3],[3,4],[4,5],[5,3]]],[2,3]],
        [["",6,[[0,1],[0,1],[0,2],[3,5]]],[0]],
        [["",6,[[1,0],[3,2],[3,4],[0,3],[2,3],[2,0],[4,2],[0,1],[0,1]]],[0]],
        [["",3,[[1,2],[0,1],[0,2],[0,1],[0,1],[1,0],[0,1],[2,0],[0,2],[0,1]]],[-1]],
        [["",3,[[2,0],[0,1],[0,2],[0,1],[0,2],[2,0],[1,2],[2,0],[1,2],[2,0]]],[-1]],
        [["",5,[[2,4],[1,3],[1,2],[3,2],[0,1],[3,0],[4,3],[1,4],[4,0]]],[-1]],
        [["",4,[[1,2]]],[-1]],
        [["",4,[[2,3],[1,3]]],[3]],
        [["",9,[[0,1],[4,1],[7,5],[7,6],[7,8],[0,7]]],[0,1,7]],
        [["",7,[]],[-1]],
        [["",2,[]],[-1]],
        [["",8,[[2,1]]],[-1]],
        [["",4,[[2,3]]],[-1]],
        [["path",100000,[]],{"$range":[1,99999]}],
        [["cycle",100000,[]],[-1]],
        [["star",100000,[]],[0]],
        [["bowtie",100000,[]],[0]],
        [["cycleTail",100000,[]],{"$range":[49999,99999]}],
        [["chords",100000,[]],[-1]],
        [["twoCycles",100000,[]],[-1]]
      ], harness: { java: `class Check {
  static int[][] ugen(String kind, int n) {
    List<int[]> e = new ArrayList<>();
    int h = n / 2;
    if (kind.equals("path")) { for (int i = 0; i + 1 < n; i++) e.add(new int[]{i, i + 1}); }
    else if (kind.equals("star")) { for (int i = 1; i < n; i++) e.add(new int[]{0, i}); }
    else if (kind.equals("cycleTail")) {
      for (int i = 0; i < h; i++) e.add(new int[]{i, (i + 1) % h});
      for (int i = h - 1; i + 1 < n; i++) e.add(new int[]{i, i + 1});
    } else if (kind.equals("bowtie")) {
      for (int i = 0; i < h; i++) e.add(new int[]{i, (i + 1) % h});
      int k = n - h + 1;                                  // second cycle: 0, h, h+1, ..., n-1
      for (int j = 0; j < k; j++) {
        int a = j == 0 ? 0 : h + j - 1, jn = (j + 1) % k, b = jn == 0 ? 0 : h + jn - 1;
        e.add(new int[]{a, b});
      }
    } else if (kind.equals("twoCycles")) {
      for (int i = 0; i < h; i++) e.add(new int[]{i, (i + 1) % h});
      for (int i = 0; i < n - h; i++) e.add(new int[]{h + i, h + (i + 1) % (n - h)});
    } else {
      for (int i = 0; i < n; i++) { e.add(new int[]{i, (i + 1) % n}); if (kind.equals("chords")) e.add(new int[]{i, (i + 2) % n}); }
    }
    return e.toArray(new int[0][]);
  }
  static List<Integer> cuts(String kind, int n, int[][] edges) {
    return new Solution().articulationPoints(n, kind.isEmpty() ? edges : ugen(kind, n));
  }
}`, python: `def _ugen(kind, n):
    h = n // 2
    if kind == 'path':
        return [[i, i + 1] for i in range(n - 1)]
    if kind == 'star':
        return [[0, i] for i in range(1, n)]
    if kind == 'cycleTail':
        return [[i, (i + 1) % h] for i in range(h)] + [[i, i + 1] for i in range(h - 1, n - 1)]
    if kind == 'bowtie':
        w = [0] + list(range(h, n))                      # second cycle: 0, h, h+1, ..., n-1
        return [[i, (i + 1) % h] for i in range(h)] + [[w[j], w[(j + 1) % len(w)]] for j in range(len(w))]
    if kind == 'twoCycles':
        return [[i, (i + 1) % h] for i in range(h)] + [[h + i, h + (i + 1) % (n - h)] for i in range(n - h)]
    e = [[i, (i + 1) % n] for i in range(n)]
    if kind == 'chords':
        e += [[i, (i + 2) % n] for i in range(n)]
    return e


def cuts(kind, n, edges):
    return articulation_points(n, edges if kind == '' else _ugen(kind, n))`, js: `function _ugen(kind, n) {
  const e = [], h = Math.floor(n / 2);
  if (kind === 'path') { for (let i = 0; i + 1 < n; i++) e.push([i, i + 1]); }
  else if (kind === 'star') { for (let i = 1; i < n; i++) e.push([0, i]); }
  else if (kind === 'cycleTail') {
    for (let i = 0; i < h; i++) e.push([i, (i + 1) % h]);
    for (let i = h - 1; i + 1 < n; i++) e.push([i, i + 1]);
  } else if (kind === 'bowtie') {
    for (let i = 0; i < h; i++) e.push([i, (i + 1) % h]);
    const w = [0]; for (let i = h; i < n; i++) w.push(i);   // second cycle: 0, h, h+1, ..., n-1
    for (let j = 0; j < w.length; j++) e.push([w[j], w[(j + 1) % w.length]]);
  } else if (kind === 'twoCycles') {
    for (let i = 0; i < h; i++) e.push([i, (i + 1) % h]);
    for (let i = 0; i < n - h; i++) e.push([h + i, h + (i + 1) % (n - h)]);
  } else {
    for (let i = 0; i < n; i++) { e.push([i, (i + 1) % n]); if (kind === 'chords') e.push([i, (i + 2) % n]); }
  }
  return e;
}
function cuts(kind, n, edges) { return articulationPoints(n, kind === '' ? edges : _ugen(kind, n)); }`, cpp: `vector<vector<int>> _ugen(const string& kind, int n) {
  vector<vector<int>> e;
  int h = n / 2;
  if (kind == "path") { for (int i = 0; i + 1 < n; i++) e.push_back({i, i + 1}); }
  else if (kind == "star") { for (int i = 1; i < n; i++) e.push_back({0, i}); }
  else if (kind == "cycleTail") {
    for (int i = 0; i < h; i++) e.push_back({i, (i + 1) % h});
    for (int i = h - 1; i + 1 < n; i++) e.push_back({i, i + 1});
  } else if (kind == "bowtie") {
    for (int i = 0; i < h; i++) e.push_back({i, (i + 1) % h});
    vector<int> w{0}; for (int i = h; i < n; i++) w.push_back(i);   // second cycle: 0, h, h+1, ..., n-1
    for (size_t j = 0; j < w.size(); j++) e.push_back({w[j], w[(j + 1) % w.size()]});
  } else if (kind == "twoCycles") {
    for (int i = 0; i < h; i++) e.push_back({i, (i + 1) % h});
    for (int i = 0; i < n - h; i++) e.push_back({h + i, h + (i + 1) % (n - h)});
  } else {
    for (int i = 0; i < n; i++) { e.push_back({i, (i + 1) % n}); if (kind == "chords") e.push_back({i, (i + 2) % n}); }
  }
  return e;
}
vector<int> cuts(string kind, int n, vector<vector<int>> edges) {
  if (!kind.empty()) edges = _ugen(kind, n);
  return Solution().articulationPoints(n, edges);
}` } },
    solution: {
      approach: `<p>Standard low-link DFS (Tarjan/Hopcroft 1973) over every component, marking cut vertices in a boolean array.</p>`,
      code: `class Solution {
    List<Integer> articulationPoints(int V, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < V; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) { adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]); }
        int[] disc = new int[V], low = new int[V], next = new int[V], parent = new int[V], children = new int[V];
        boolean[] cut = new boolean[V];
        Arrays.fill(disc, -1);
        int[] stack = new int[V];                              // our own DFS stack: no deep recursion
        int timer = 0;
        for (int root = 0; root < V; root++) {
            if (disc[root] != -1) continue;
            int sp = 0;
            stack[sp++] = root;
            parent[root] = -1;
            disc[root] = low[root] = timer++;
            while (sp > 0) {
                int v = stack[sp - 1];
                if (next[v] < adj.get(v).size()) {
                    int w = adj.get(v).get(next[v]++);
                    if (w == parent[v]) continue;
                    if (disc[w] == -1) {                       // "recursive call" into w
                        children[v]++;
                        parent[w] = v;
                        disc[w] = low[w] = timer++;
                        stack[sp++] = w;
                    } else {
                        low[v] = Math.min(low[v], disc[w]);    // must be disc[w], not low[w]
                    }
                } else {                                       // "return" from v
                    sp--;
                    int p = parent[v];
                    if (p != -1) {
                        low[p] = Math.min(low[p], low[v]);
                        if (parent[p] != -1 && low[v] >= disc[p]) cut[p] = true;   // p is not the root
                    } else if (children[v] > 1) {
                        cut[v] = true;                         // the root with two or more children
                    }
                }
            }
        }
        List<Integer> ans = new ArrayList<>();
        for (int v = 0; v < V; v++) if (cut[v]) ans.add(v);
        if (ans.isEmpty()) ans.add(-1);
        return ans;
    }
}`,
      alt: [{ lang: 'python', code: `def articulation_points(V, edges):
    adj = [[] for _ in range(V)]
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)

    disc = [-1] * V
    low = [0] * V
    nxt = [0] * V                        # next neighbour index to try, per node
    parent = [-1] * V
    children = [0] * V
    cut = [False] * V
    timer = 0
    for root in range(V):
        if disc[root] != -1:
            continue
        disc[root] = low[root] = timer
        timer += 1
        stack = [root]                   # our own DFS stack: no recursion limit
        while stack:
            v = stack[-1]
            if nxt[v] < len(adj[v]):
                w = adj[v][nxt[v]]
                nxt[v] += 1
                if w == parent[v]:
                    continue
                if disc[w] == -1:
                    children[v] += 1
                    parent[w] = v
                    disc[w] = low[w] = timer
                    timer += 1
                    stack.append(w)
                else:
                    low[v] = min(low[v], disc[w])      # must be disc[w], not low[w]
            else:
                stack.pop()
                p = parent[v]
                if p != -1:
                    low[p] = min(low[p], low[v])
                    if parent[p] != -1 and low[v] >= disc[p]:   # p is not the root
                        cut[p] = True
                elif children[v] > 1:                           # the root with two or more children
                    cut[v] = True
    ans = [v for v in range(V) if cut[v]]
    return ans or [-1]
` }, { lang: 'js', code: `function articulationPoints(V, edges) {
  const adj = Array.from({ length: V }, () => []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }

  const disc = new Int32Array(V).fill(-1), low = new Int32Array(V), next = new Int32Array(V);
  const parent = new Int32Array(V).fill(-1), children = new Int32Array(V), cut = new Uint8Array(V);
  let timer = 0;
  for (let root = 0; root < V; root++) {
    if (disc[root] !== -1) continue;
    disc[root] = low[root] = timer++;
    const stack = [root];                // our own DFS stack: no stack overflow
    while (stack.length) {
      const v = stack[stack.length - 1];
      if (next[v] < adj[v].length) {
        const w = adj[v][next[v]++];
        if (w === parent[v]) continue;
        if (disc[w] === -1) {
          children[v]++;
          parent[w] = v;
          disc[w] = low[w] = timer++;
          stack.push(w);
        } else {
          low[v] = Math.min(low[v], disc[w]);   // must be disc[w], not low[w]
        }
      } else {
        stack.pop();
        const p = parent[v];
        if (p !== -1) {
          low[p] = Math.min(low[p], low[v]);
          if (parent[p] !== -1 && low[v] >= disc[p]) cut[p] = 1;   // p is not the root
        } else if (children[v] > 1) {
          cut[v] = 1;                    // the root with two or more children
        }
      }
    }
  }
  const ans = [];
  for (let v = 0; v < V; v++) if (cut[v]) ans.push(v);
  return ans.length ? ans : [-1];
}
` }, { lang: 'cpp', code: `class Solution {
public:
    vector<int> articulationPoints(int V, vector<vector<int>>& edges) {
        vector<vector<int>> adj(V);
        for (auto& e : edges) { adj[e[0]].push_back(e[1]); adj[e[1]].push_back(e[0]); }

        vector<int> disc(V, -1), low(V, 0), next(V, 0), parent(V, -1), children(V, 0);
        vector<char> cut(V, 0);
        int timer = 0;
        for (int root = 0; root < V; root++) {
            if (disc[root] != -1) continue;
            disc[root] = low[root] = timer++;
            vector<int> stack{root};                    // our own DFS stack
            while (!stack.empty()) {
                int v = stack.back();
                if (next[v] < (int)adj[v].size()) {
                    int w = adj[v][next[v]++];
                    if (w == parent[v]) continue;
                    if (disc[w] == -1) {
                        children[v]++;
                        parent[w] = v;
                        disc[w] = low[w] = timer++;
                        stack.push_back(w);
                    } else {
                        low[v] = min(low[v], disc[w]);  // must be disc[w], not low[w]
                    }
                } else {
                    stack.pop_back();
                    int p = parent[v];
                    if (p != -1) {
                        low[p] = min(low[p], low[v]);
                        if (parent[p] != -1 && low[v] >= disc[p]) cut[p] = 1;   // p is not the root
                    } else if (children[v] > 1) {
                        cut[v] = 1;                     // the root with two or more children
                    }
                }
            }
        }
        vector<int> ans;
        for (int v = 0; v < V; v++) if (cut[v]) ans.push_back(v);
        if (ans.empty()) ans.push_back(-1);
        return ans;
    }
};
` }],
      dry: {
        head: ['vertex', 'disc', 'low', 'decision'],
        rows: [
          ['0', '0', '0', 'root with 1 child → not a cut'],
          ['1', '1', '1', 'child 4 has low 2 ≥ 1 → ' + H.c('p', 'cut')],
          ['4', '2', '2', 'child 2 has low 2 ≥ 2 → ' + H.c('p', 'cut')],
          ['2', '3', '2', 'back edge (via 3) reaches 4'],
          ['3', '4', '2', 'back edge 3–4']
        ]
      },
      complexity: `<p>Time <b>O(V + E)</b>, space <b>O(V + E)</b>.</p>`,
      followUps: ['For each cut vertex, how many components appear after removing it?', 'Build the block-cut tree.']
    }
  });

  practice.push({
    title: 'Kth Ancestor of a Tree Node',
    level: 'Medium', tags: ['binary lifting', 'tree', 'design'], companies: ['Google', 'Amazon'],
    statement: `<p>Design <code>TreeAncestor(int n, int[] parent)</code> for a tree where <code>parent[0] = -1</code> (node 0 is the root). Method <code>getKthAncestor(node, k)</code> returns the k-th ancestor of node, or <code>-1</code> if it does not exist. Up to 5·10<sup>4</sup> calls.</p>`,
    constraints: `<p>1 ≤ k ≤ n ≤ 5·10<sup>4</sup>, 0 ≤ parent[i] &lt; n for i ≥ 1.</p>`,
    example: `<p>parent = <code>[-1, 0, 0, 1, 1, 2, 2]</code>: getKthAncestor(3, 1) = <b>1</b>, (5, 2) = <b>0</b>, (6, 3) = <b>${H.c('r', '-1')}</b>.</p><p>Why: 6's ancestors are 2 (1 up) and 0 (2 up); a third does not exist.</p>`,
    brute: {
      why: `<p>Walk up k parent pointers: O(k) per call. A 5·10<sup>4</sup>-long chain with 5·10<sup>4</sup> queries → 2.5·10<sup>9</sup> steps. The waste: the same long stretches are walked again for every query.</p>`,
      code: `class TreeAncestorBrute {
    private final int[] parent;

    TreeAncestorBrute(int n, int[] parent) { this.parent = parent.clone(); }

    int getKthAncestor(int node, int k) {
        while (k-- > 0 && node != -1) node = parent[node];
        return node;
    }
}`
    },
    mcq: { q: 'k = 11. Which jumps does binary lifting make?', options: ['8, 2 and 1', '11 single steps', '4, 4, 2, 1', '16 then down 5'], answer: 0, explain: '11 = 1011 in binary → jumps of 2^3, 2^1, 2^0.' },
    hints: [
      `<p>Hint 1: Precompute up[j][v] = 2<sup>j</sup>-th ancestor. Any k is a sum of distinct powers of two (its binary digits).</p>`,
      `<p>Hint 2: up[j][v] = up[j−1][ up[j−1][v] ], with −1 propagating: once you fall off the root you stay at −1.</p>`,
      `<p>Hint 3: Recipe — LOG = 16 covers k ≤ 5·10<sup>4</sup>. Query: for each set bit j of k, node = up[j][node]; stop early if node becomes −1.</p>`
    ],
    tests: { cls: "TreeAncestor", sigs: { TreeAncestor: "int int[]", getKthAncestor: "int int -> int" }, cases: [
        {"ops":["TreeAncestor","getKthAncestor","getKthAncestor","getKthAncestor"],"args":[[7,[-1,0,0,1,1,2,2]],[3,1],[5,2],[6,3]],"out":[null,1,0,-1]},
        {"ops":["TreeAncestor","getKthAncestor"],"args":[[1,[-1]],[0,1]],"out":[null,-1]},
        {"ops":["TreeAncestor","getKthAncestor","getKthAncestor","getKthAncestor"],"args":[[2,[-1,0]],[1,1],[1,2],[0,1]],"out":[null,0,-1,-1]},
        {"ops":["TreeAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor"],"args":[[6,[-1,0,1,2,3,4]],[5,1],[5,5],[5,4],[5,6],[2,2],[2,3]],"out":[null,4,0,1,-1,0,-1]},
        {"ops":["TreeAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor"],"args":[[4,[-1,3,0,0]],[1,1],[1,2],[1,3],[2,1],[3,1]],"out":[null,3,0,-1,0,0]},
        {"ops":["TreeAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor"],"args":[[7,[-1,2,4,0,0,0,3]],[0,5],[1,6],[2,7],[4,7],[1,2],[0,5],[1,2],[4,3]],"out":[null,-1,-1,-1,-1,4,-1,4,-1]},
        {"ops":["TreeAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor"],"args":[[1,[-1]],[0,1],[0,1],[0,1],[0,1],[0,1],[0,1],[0,1],[0,1]],"out":[null,-1,-1,-1,-1,-1,-1,-1,-1]},
        {"ops":["TreeAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor"],"args":[[1,[-1]],[0,1],[0,1],[0,1],[0,1],[0,1],[0,1],[0,1],[0,1]],"out":[null,-1,-1,-1,-1,-1,-1,-1,-1]},
        {"ops":["TreeAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor"],"args":[[11,[-1,0,1,1,1,0,4,3,0,3,0]],[0,8],[9,9],[3,11],[5,7],[9,2],[2,10],[5,11],[7,1]],"out":[null,-1,-1,-1,-1,1,-1,-1,3]},
        {"ops":["TreeAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor"],"args":[[3,[-1,0,1]],[1,1],[1,2],[1,1],[2,2],[2,3],[2,1],[0,2],[1,3]],"out":[null,0,-1,0,0,-1,1,-1,-1]},
        {"ops":["TreeAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor"],"args":[[14,[-1,2,0,0,6,6,2,0,1,2,11,1,8,8]],[9,5],[7,5],[1,1],[4,13],[2,11],[13,1],[9,13],[5,7]],"out":[null,-1,-1,2,-1,-1,8,-1,-1]},
        {"ops":["TreeAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor"],"args":[[13,[-1,10,8,0,0,3,3,3,11,8,4,0,0]],[10,11],[12,7],[12,13],[6,8],[3,6],[11,7],[10,3],[11,6]],"out":[null,-1,-1,-1,-1,-1,-1,-1,-1]},
        {"ops":["TreeAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor"],"args":[[1,[-1]],[0,1],[0,1],[0,1],[0,1],[0,1],[0,1],[0,1],[0,1]],"out":[null,-1,-1,-1,-1,-1,-1,-1,-1]},
        {"ops":["TreeAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor"],"args":[[50000,{"$range":[-1,49999]}],[49999,1],[49999,49999],[49999,50000],[49999,32768],[49999,32769],[40000,16384],[40000,40000],[40000,40001],[123,123],[123,124],[0,1],[49999,50000],[30000,29999],[30000,30000],[1,1],[2,1]],"out":[null,49998,0,-1,17231,17230,23616,0,-1,0,-1,-1,-1,1,0,0,1]},
        {"ops":["TreeAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor","getKthAncestor"],"args":[[50000,{"$concat":[[-1],{"$rep":0,"n":49999}]}],[49999,1],[49999,2],[1,1],[1,2],[0,1],[25000,50000]],"out":[null,0,-1,0,-1,-1,-1]}
      ] },
    solution: {
      approach: `<p>Binary lifting with −1 as the "fell off the tree" sentinel. Build loops k outer, v inner, so row k−1 is complete before row k (works even if parents have larger indices than children).</p>`,
      code: `class TreeAncestor {
    private static final int LOG = 16;           // 2^16 = 65536 > 5 * 10^4
    private final int[][] up;

    public TreeAncestor(int n, int[] parent) {
        up = new int[LOG][];
        up[0] = parent.clone();
        for (int j = 1; j < LOG; j++) {
            up[j] = new int[n];
            for (int v = 0; v < n; v++) {
                int mid = up[j - 1][v];
                up[j][v] = mid == -1 ? -1 : up[j - 1][mid];
            }
        }
    }

    public int getKthAncestor(int node, int k) {
        for (int j = 0; j < LOG && node != -1; j++)
            if ((k >> j & 1) == 1) node = up[j][node];
        return node;
    }
}`,
      alt: [{ lang: 'python', code: `class TreeAncestor:
    LOG = 16                                  # 2^16 = 65536 > 5 * 10^4

    def __init__(self, n, parent):
        # up[j][v] = the 2^j-th ancestor of v, or -1 if it does not exist
        self.up = [list(parent)]
        for _ in range(1, self.LOG):
            prev = self.up[-1]
            self.up.append([-1 if mid == -1 else prev[mid] for mid in prev])

    def getKthAncestor(self, node, k):
        for j in range(self.LOG):
            if node == -1:
                break
            if k >> j & 1:                    # jump 2^j steps for every set bit of k
                node = self.up[j][node]
        return node
` }, { lang: 'js', code: `class TreeAncestor {
  constructor(n, parent) {
    this.LOG = 16;                            // 2^16 = 65536 > 5 * 10^4
    // up[j][v] = the 2^j-th ancestor of v, or -1 if it does not exist
    this.up = [Int32Array.from(parent)];
    for (let j = 1; j < this.LOG; j++) {
      const prev = this.up[j - 1], cur = new Int32Array(n);
      for (let v = 0; v < n; v++) cur[v] = prev[v] === -1 ? -1 : prev[prev[v]];
      this.up.push(cur);
    }
  }

  getKthAncestor(node, k) {
    for (let j = 0; j < this.LOG && node !== -1; j++)
      if ((k >> j) & 1) node = this.up[j][node];   // jump 2^j steps for every set bit of k
    return node;
  }
}
` }, { lang: 'cpp', code: `class TreeAncestor {
    static const int LOG = 16;                // 2^16 = 65536 > 5 * 10^4
    vector<vector<int>> up;                   // up[j][v] = the 2^j-th ancestor of v, or -1

public:
    TreeAncestor(int n, vector<int>& parent) : up(LOG) {
        up[0] = parent;
        for (int j = 1; j < LOG; j++) {
            up[j].assign(n, -1);
            for (int v = 0; v < n; v++) {
                int mid = up[j - 1][v];
                up[j][v] = mid == -1 ? -1 : up[j - 1][mid];
            }
        }
    }

    int getKthAncestor(int node, int k) {
        for (int j = 0; j < LOG && node != -1; j++)
            if (k >> j & 1) node = up[j][node];   // jump 2^j steps for every set bit of k
        return node;
    }
};
` }],
      complexity: `<p>Build <b>O(n log n)</b>, query <b>O(log k)</b>, memory <b>O(n log n)</b> ≈ 3.2 MB here.</p>`,
      followUps: ['Answer each query in O(1) after O(n) preprocessing (ladder decomposition / long-path).', 'Support adding a new leaf online (its up-row is computable from its parent\'s rows).']
    }
  });

  practice.push({
    title: 'Maximum Dominoes on a Damaged Board',
    level: 'Medium', tags: ['bipartite matching', 'grid', 'chessboard colouring'], companies: ['Google', 'Jane Street'],
    statement: `<p>A board has <code>R × C</code> cells; <code>'.'</code> is usable, <code>'#'</code> is broken. Place as many <b>1×2 dominoes</b> as possible on usable cells (horizontal or vertical) with no overlap. Return the count.</p>`,
    constraints: `<p>1 ≤ R, C ≤ 40.</p>`,
    example: `<p><code>["..#", "...", "#.."]</code> → <b>${H.c('g', '3')}</b>.</p><p>Why: there are 7 usable cells, so at most ⌊7/2⌋ = 3 dominoes; one valid placement is (0,0)-(0,1), (1,0)-(1,1), (1,2)-(2,2) — and (2,1) is left alone.</p>`,
    brute: {
      why: `<p>Backtracking cell by cell: leave the cell empty, or cover it with a domino to the right or down. Exponential (about 3<sup>cells</sup> branches). The waste: it ignores the bipartite structure that turns this into a polynomial matching.</p>`,
      code: `class Brute {
    private int best = 0;

    int maxDominoes(String[] board) {
        int R = board.length, C = board[0].length();
        boolean[][] used = new boolean[R][C];
        go(board, used, 0, 0);
        return best;
    }

    private void go(String[] b, boolean[][] used, int idx, int placed) {
        int R = b.length, C = b[0].length();
        if (idx == R * C) { best = Math.max(best, placed); return; }
        int r = idx / C, c = idx % C;
        go(b, used, idx + 1, placed);                                   // leave this cell
        if (b[r].charAt(c) == '#' || used[r][c]) return;
        if (c + 1 < C && b[r].charAt(c + 1) == '.' && !used[r][c + 1]) { // horizontal
            used[r][c] = used[r][c + 1] = true;
            go(b, used, idx + 1, placed + 1);
            used[r][c] = used[r][c + 1] = false;
        }
        if (r + 1 < R && b[r + 1].charAt(c) == '.' && !used[r + 1][c]) { // vertical
            used[r][c] = used[r + 1][c] = true;
            go(b, used, idx + 1, placed + 1);
            used[r][c] = used[r + 1][c] = false;
        }
    }
}`
    },
    mcq: { q: 'Why is the cell graph bipartite?', options: ['Colour cells like a chessboard: every domino covers one black and one white cell', 'Because grids have no cycles', 'Because dominoes are rectangles', 'It is not bipartite'], answer: 0, explain: 'Neighbouring cells always have different (r + c) parity, so all edges go black–white.' },
    hints: [
      `<p>Hint 1: A domino = a pair of neighbouring usable cells. You want the largest set of pairs with no shared cell — a maximum matching.</p>`,
      `<p>Hint 2: Cells with even (r + c) form the left side, odd the right side; every neighbour pair is left–right.</p>`,
      `<p>Hint 3: Recipe — number cells r·C + c; for each usable even cell try Kuhn over its up to 4 usable neighbours. 1600 cells × ~6400 edges is tiny for Kuhn.</p>`
    ],
    tests: { sig: "string[] -> int", fn: "maxDominoes", cases: [
        [[["..#","...","#.."]],3],
        [[["."]],0],
        [[["#"]],0],
        [[[".."]],1],
        [[["..."]],1],
        [[[".",".",".","."]],2],
        [[[".#.","#.#",".#."]],0],
        [[["....","....","....","...."]],8],
        [[[".#.","...",".#."]],2],
        [[["#.#","...","#.#"]],1],
        [[["..#","..."]],2],
        [[[".."]],1],
        [[["###."]],0],
        [[[".#.#.","#.#..","..#..","###..","...#."]],5],
        [[[".","."]],1],
        [[["..#..",".#..#"]],3],
        [[["..#.#","....."]],3],
        [[["...","...",".#.","#..","#.."]],5],
        [[["##","##","#.",".."]],1],
        [[[".","#"]],0],
        [[{"$rep":"........................................","n":40}],800],
        [[{"$rep":"########################################","n":40}],0],
        [[{"$concat":[["#......................................."],{"$rep":"........................................","n":38},[".......................................#"]]}],798],
        [[{"$concat":[["#......................................."],{"$rep":"........................................","n":39}]}],799],
        [[{"$rep":"........................................","n":1}],20],
        [[{"$concat":[{"$rep":"########################################","n":39},["........................................"]]}],20]
      ] },
    solution: {
      approach: `<p>Chessboard colouring + Kuhn's algorithm. The matching size is the domino count.</p>`,
      code: `class Solution {
    private int R, C;
    private String[] b;
    private int[] owner;            // owner[oddCell] = even cell matched to it, or -1
    private boolean[] seen;
    private final int[] dr = {1, -1, 0, 0}, dc = {0, 0, 1, -1};

    int maxDominoes(String[] board) {
        b = board;
        R = board.length;
        C = board[0].length();
        owner = new int[R * C];
        Arrays.fill(owner, -1);
        int count = 0;
        for (int r = 0; r < R; r++)
            for (int c = 0; c < C; c++)
                if ((r + c) % 2 == 0 && b[r].charAt(c) == '.') {
                    seen = new boolean[R * C];
                    if (tryCell(r, c)) count++;
                }
        return count;
    }

    private boolean tryCell(int r, int c) {
        for (int d = 0; d < 4; d++) {
            int nr = r + dr[d], nc = c + dc[d];
            if (nr < 0 || nc < 0 || nr >= R || nc >= C || b[nr].charAt(nc) != '.') continue;
            int id = nr * C + nc;
            if (seen[id]) continue;
            seen[id] = true;
            if (owner[id] == -1 || tryCell(owner[id] / C, owner[id] % C)) {
                owner[id] = r * C + c;
                return true;
            }
        }
        return false;
    }
}`,
      alt: [{ lang: 'python', code: `import sys


def max_dominoes(board):
    sys.setrecursionlimit(10000)          # a path can reach R * C / 2 = 800 cells: near the default limit of 1000
    R, C = len(board), len(board[0])
    owner = [-1] * (R * C)                # owner[oddCell] = even cell matched to it, or -1

    def try_cell(r, c, seen):
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < R and 0 <= nc < C and board[nr][nc] == '.':
                nid = nr * C + nc
                if nid in seen:
                    continue
                seen.add(nid)
                if owner[nid] == -1 or try_cell(owner[nid] // C, owner[nid] % C, seen):
                    owner[nid] = r * C + c
                    return True
        return False

    count = 0
    for r in range(R):
        for c in range(C):
            if (r + c) % 2 == 0 and board[r][c] == '.' and try_cell(r, c, set()):
                count += 1
    return count
` }, { lang: 'js', code: `function maxDominoes(board) {
  const R = board.length, C = board[0].length;
  const owner = new Int32Array(R * C).fill(-1);      // owner[oddCell] = even cell matched to it, or -1
  const dr = [1, -1, 0, 0], dc = [0, 0, 1, -1];

  const tryCell = (r, c, seen) => {
    for (let d = 0; d < 4; d++) {
      const nr = r + dr[d], nc = c + dc[d];
      if (nr < 0 || nc < 0 || nr >= R || nc >= C || board[nr][nc] !== '.') continue;
      const id = nr * C + nc;
      if (seen[id]) continue;
      seen[id] = 1;
      if (owner[id] === -1 || tryCell(Math.floor(owner[id] / C), owner[id] % C, seen)) {
        owner[id] = r * C + c;
        return true;
      }
    }
    return false;
  };

  let count = 0;
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++)
      if ((r + c) % 2 === 0 && board[r][c] === '.' && tryCell(r, c, new Uint8Array(R * C))) count++;
  return count;
}
` }, { lang: 'cpp', code: `class Solution {
    int R, C;
    vector<string> b;
    vector<int> owner;                       // owner[oddCell] = even cell matched to it, or -1
    vector<char> seen;

    bool tryCell(int r, int c) {
        static const int dr[] = {1, -1, 0, 0}, dc[] = {0, 0, 1, -1};
        for (int d = 0; d < 4; d++) {
            int nr = r + dr[d], nc = c + dc[d];
            if (nr < 0 || nc < 0 || nr >= R || nc >= C || b[nr][nc] != '.') continue;
            int id = nr * C + nc;
            if (seen[id]) continue;
            seen[id] = 1;
            if (owner[id] == -1 || tryCell(owner[id] / C, owner[id] % C)) {
                owner[id] = r * C + c;
                return true;
            }
        }
        return false;
    }

public:
    int maxDominoes(vector<string>& board) {
        b = board;
        R = b.size();
        C = b[0].size();
        owner.assign(R * C, -1);
        int count = 0;
        for (int r = 0; r < R; r++)
            for (int c = 0; c < C; c++)
                if ((r + c) % 2 == 0 && b[r][c] == '.') {
                    seen.assign(R * C, 0);
                    if (tryCell(r, c)) count++;
                }
        return count;
    }
};
` }],
      complexity: `<p>Kuhn: O(V·E) = 1600 × 6400 ≈ 10<sup>7</sup> in the worst case. Space O(R·C).</p>`,
      followUps: ['Count the number of ways to tile the full board (that is a DP over profiles / FKT algorithm, not matching).', 'Large boards (10<sup>3</sup> × 10<sup>3</sup>) → Hopcroft-Karp.']
    }
  });

  practice.push({
    title: 'Fewest Lines to Cover All Marked Cells',
    level: 'Medium', tags: ['könig', 'vertex cover', 'bipartite matching'], companies: ['Google', 'Two Sigma'],
    statement: `<p>A grid has some cells marked <code>1</code>. One "line" covers a whole row or a whole column. Return the <b>minimum number of lines</b> needed so every marked cell is covered.</p>`,
    constraints: `<p>1 ≤ R, C ≤ 300.</p>`,
    example: `<p>grid = <code>[[1,0,1],[0,1,0],[0,1,0]]</code> → <b>${H.c('g', '2')}</b>.</p><p>Why: row 0 covers (0,0) and (0,2); column 1 covers (1,1) and (2,1). One line cannot do it, because (0,0) and (1,1) share neither a row nor a column.</p>`,
    brute: {
      why: `<p>Try every subset of rows (2<sup>R</sup>); for each, all columns that still contain an uncovered 1 must be chosen. Take the minimum. O(2<sup>R</sup>·R·C) — fine for R ≤ 15, hopeless for 300.</p>`,
      code: `class Brute {
    int minLines(int[][] grid) {
        int R = grid.length, C = grid[0].length, best = Integer.MAX_VALUE;
        for (int mask = 0; mask < (1 << R); mask++) {
            int lines = Integer.bitCount(mask);
            for (int c = 0; c < C; c++) {
                boolean need = false;
                for (int r = 0; r < R; r++) if (grid[r][c] == 1 && (mask >> r & 1) == 0) need = true;
                if (need) lines++;                       // this column must be a line
            }
            best = Math.min(best, lines);
        }
        return best;
    }
}`
    },
    mcq: { q: 'Rows are left vertices, columns right vertices, each marked cell an edge. "Fewest lines" is then…', options: ['A minimum vertex cover — equal to the maximum matching (König)', 'A maximum independent set', 'A shortest path', 'A spanning tree'], answer: 0, explain: 'Choosing a row/column = choosing a vertex; covering every marked cell = covering every edge.' },
    hints: [
      `<p>Hint 1: Model rows and columns as the two sides of a bipartite graph; every marked cell (r, c) is an edge r–c.</p>`,
      `<p>Hint 2: Choosing lines that cover all cells = choosing vertices that touch all edges = minimum vertex cover. In bipartite graphs that equals the maximum matching (König).</p>`,
      `<p>Hint 3: Recipe — Kuhn from every row over the columns with a 1. Answer = matching size. To output the lines, run the alternating search from unmatched rows and take (unvisited rows) ∪ (visited columns).</p>`
    ],
    tests: { sig: "string int[][] -> int", fn: "lines", cases: [
        [["",[[1,0,1],[0,1,0],[0,1,0]]],2],
        [["",[[0]]],0],
        [["",[[1]]],1],
        [["",[[0,0],[0,0]]],0],
        [["",[[1,1,1,1]]],1],
        [["",[[1],[1],[1]]],1],
        [["",[[1,1,1],[1,1,1]]],2],
        [["",[[1,1],[1,1],[1,1]]],2],
        [["",[[1,0,0],[0,1,0],[0,0,1]]],3],
        [["",[[0,1,0,0],[1,1,1,1],[0,1,0,0]]],2],
        [["",[[0],[0],[1],[1]]],1],
        [["",[[1,0,0,1],[1,0,0,0],[1,0,0,1],[0,1,0,0],[0,0,0,0],[1,1,0,1]]],3],
        [["",[[0,0,0,0],[0,0,0,0],[0,0,1,1],[0,0,1,1],[1,1,0,1],[0,1,1,0]]],4],
        [["",[[0,1,1,0],[1,0,0,0]]],2],
        [["",[[1,0,0,1],[0,0,1,0],[0,0,1,0],[0,0,1,1],[0,0,0,1],[0,0,0,1]]],3],
        [["",[[1,1,0,0,1,0]]],1],
        [["",[[1,0,0,0,0,1],[0,0,0,0,1,1]]],2],
        [["",[[0,1],[0,0]]],1],
        [["",[[0,1,0,1,1],[0,0,1,0,1],[0,0,0,0,0],[0,0,0,0,0]]],2],
        [["",[[0,0,1,0,1],[0,0,0,0,0],[0,1,0,1,0]]],2],
        [["",{"$rep":{"$rep":1,"n":300},"n":300}],300],
        [["",{"$rep":{"$concat":[{"$rep":1,"n":150},{"$rep":0,"n":150}]},"n":300}],150],
        [["",{"$rep":{"$concat":[{"$rep":0,"n":299},[1]]},"n":300}],1],
        [["identity",[]],300],
        [["upper",[]],300],
        [["",{"$rep":{"$rep":0,"n":300},"n":300}],0]
      ], harness: { java: `class Check {
  static int lines(String kind, int[][] grid) {
    if (!kind.isEmpty()) {
      grid = new int[300][300];
      for (int i = 0; i < 300; i++) for (int j = 0; j < 300; j++) grid[i][j] = kind.equals("identity") ? (i == j ? 1 : 0) : (j >= i ? 1 : 0);
    }
    return new Solution().minLines(grid);
  }
}`, python: `def lines(kind, grid):
    if kind != '':
        grid = [[int(i == j) if kind == 'identity' else int(j >= i) for j in range(300)] for i in range(300)]
    return min_lines(grid)`, js: `function lines(kind, grid) {
  if (kind !== '') {
    grid = Array.from({ length: 300 }, (_, i) => Array.from({ length: 300 }, (_, j) => (kind === 'identity' ? (i === j ? 1 : 0) : (j >= i ? 1 : 0))));
  }
  return minLines(grid);
}`, cpp: `int lines(string kind, vector<vector<int>> grid) {
  if (!kind.empty()) {
    grid.assign(300, vector<int>(300, 0));
    for (int i = 0; i < 300; i++) for (int j = 0; j < 300; j++) grid[i][j] = kind == "identity" ? (i == j) : (j >= i);
  }
  return Solution().minLines(grid);
}` } },
    solution: {
      approach: `<p>König's theorem: min vertex cover = max matching. Kuhn on rows → columns.</p>`,
      code: `class Solution {
    private int[][] g;
    private int[] owner;            // owner[col] = row matched to it, or -1
    private boolean[] seen;

    int minLines(int[][] grid) {
        g = grid;
        int R = grid.length, C = grid[0].length, matching = 0;
        owner = new int[C];
        Arrays.fill(owner, -1);
        for (int r = 0; r < R; r++) {
            seen = new boolean[C];
            if (tryRow(r)) matching++;
        }
        return matching;            // = minimum vertex cover = fewest lines
    }

    private boolean tryRow(int r) {
        for (int c = 0; c < g[r].length; c++) {
            if (g[r][c] == 0 || seen[c]) continue;
            seen[c] = true;
            if (owner[c] == -1 || tryRow(owner[c])) { owner[c] = r; return true; }
        }
        return false;
    }
}`,
      alt: [{ lang: 'python', code: `def min_lines(grid):
    R, C = len(grid), len(grid[0])
    owner = [-1] * C                      # owner[col] = row matched to it, or -1

    def try_row(r, seen):
        for c in range(C):
            if grid[r][c] and not seen[c]:
                seen[c] = True
                if owner[c] == -1 or try_row(owner[c], seen):
                    owner[c] = r
                    return True
        return False

    # maximum matching = minimum vertex cover (Konig) = fewest lines
    return sum(try_row(r, [False] * C) for r in range(R))
` }, { lang: 'js', code: `function minLines(grid) {
  const R = grid.length, C = grid[0].length;
  const owner = new Array(C).fill(-1);    // owner[col] = row matched to it, or -1

  const tryRow = (r, seen) => {
    for (let c = 0; c < C; c++) {
      if (!grid[r][c] || seen[c]) continue;
      seen[c] = true;
      if (owner[c] === -1 || tryRow(owner[c], seen)) { owner[c] = r; return true; }
    }
    return false;
  };

  let matching = 0;                       // = minimum vertex cover (Konig) = fewest lines
  for (let r = 0; r < R; r++) if (tryRow(r, new Array(C).fill(false))) matching++;
  return matching;
}
` }, { lang: 'cpp', code: `class Solution {
    vector<vector<int>> g;
    vector<int> owner;                    // owner[col] = row matched to it, or -1
    vector<char> seen;

    bool tryRow(int r) {
        for (int c = 0; c < (int)g[r].size(); c++) {
            if (!g[r][c] || seen[c]) continue;
            seen[c] = 1;
            if (owner[c] == -1 || tryRow(owner[c])) { owner[c] = r; return true; }
        }
        return false;
    }

public:
    int minLines(vector<vector<int>>& grid) {
        g = grid;
        int R = g.size(), C = g[0].size(), matching = 0;
        owner.assign(C, -1);
        for (int r = 0; r < R; r++) {
            seen.assign(C, 0);
            if (tryRow(r)) matching++;    // matching = minimum vertex cover (Konig) = fewest lines
        }
        return matching;
    }
};
` }],
      complexity: `<p>O(R · R · C) = 2.7·10<sup>7</sup> worst case; space O(C).</p>`,
      followUps: ['Output which rows and columns to choose.', 'Each row and column has a different cost (weighted vertex cover → min cut).']
    }
  });

  // =====================================================================
  // PRACTICE — Hard
  // =====================================================================
  practice.push({
    title: 'Cracking the Safe (de Bruijn Sequence)',
    level: 'Hard', tags: ['euler circuit', 'hierholzer', 'de bruijn'], companies: ['Google', 'Amazon'],
    statement: `<p>A safe has a password of <code>n</code> digits, each from <code>0 … k−1</code>. The safe checks the <b>last n digits typed</b> after every keystroke. Return any <b>shortest</b> string that is guaranteed to open the safe (contains every possible password as a substring).</p>`,
    constraints: `<p>1 ≤ n ≤ 4, 1 ≤ k ≤ 10, k<sup>n</sup> ≤ 4096.</p>`,
    example: `<p>n = 2, k = 2 → <b>${H.c('g', '"00110"')}</b> (length 2<sup>2</sup> + 1 = 5).</p><p>Why: its windows are 00, 01, 11, 10 — all four passwords, each exactly once. No shorter string can contain 4 different length-2 windows.</p>`,
    brute: {
      why: `<p>DFS that appends a digit only if the new n-digit window is unseen, and backtracks when stuck. Without the Euler-circuit argument there is no guarantee it never backtracks, so in the worst case it explores exponentially many strings. The waste: blind search where a linear-time construction exists.</p>`,
      code: `class Brute {
    public String crackSafe(int n, int k) {
        int total = (int) Math.pow(k, n);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) sb.append('0');
        Set<String> seen = new HashSet<>();
        seen.add(sb.toString());
        dfs(sb, seen, n, k, total);
        return sb.toString();
    }

    private boolean dfs(StringBuilder sb, Set<String> seen, int n, int k, int total) {
        if (seen.size() == total) return true;
        String tail = sb.substring(sb.length() - n + 1);
        for (int d = 0; d < k; d++) {
            String w = tail + d;
            if (seen.contains(w)) continue;
            seen.add(w);
            sb.append(d);
            if (dfs(sb, seen, n, k, total)) return true;
            sb.deleteCharAt(sb.length() - 1);            // backtrack
            seen.remove(w);
        }
        return false;
    }
}`
    },
    mcq: { q: 'In the de Bruijn graph for this problem, what are the vertices and edges?', options: ['Vertices = (n−1)-digit strings, edges = n-digit passwords', 'Vertices = passwords, edges = keystrokes', 'Vertices = digits, edges = pairs of digits', 'Vertices = n-digit strings, edges = (n+1)-digit strings'], answer: 0, explain: 'Edge "abc" goes from "ab" to "bc". Each password is an edge, so an Euler circuit uses every password once.' },
    hints: [
      `<p>Hint 1: The shortest answer has length k<sup>n</sup> + n − 1: each new keystroke must create a brand-new password window.</p>`,
      `<p>Hint 2: Make each (n−1)-digit string a vertex; appending digit d to vertex v moves to (v·k + d) mod k<sup>n−1</sup>. Every vertex has in = out = k → an Euler circuit exists.</p>`,
      `<p>Hint 3: Recipe — iterative Hierholzer from vertex 0 (n−1 zeros) recording the digit of each edge when it is popped; reverse the digits and prepend n−1 zeros.</p>`
    ],
    tests: { sig: "int int -> string", fn: "crackSafe", check: `(args, out, exp) => {
  const n = args[0], k = args[1];
  if (typeof out !== 'string' || out.length !== exp) return false;
  for (const ch of out) if (ch < '0' || ch > String(k - 1)) return false;
  const seen = new Set();
  for (let i = 0; i + n <= out.length; i++) seen.add(out.substr(i, n));
  return seen.size === Math.pow(k, n);
}`, cases: [
        [[1,1],1],
        [[1,2],2],
        [[2,2],5],
        [[1,10],10],
        [[2,3],10],
        [[3,2],10],
        [[3,3],29],
        [[4,2],19],
        [[2,10],101],
        [[4,1],4],
        [[3,1],3],
        [[3,10],1002],
        [[4,3],84],
        [[4,5],628],
        [[4,6],1299],
        [[4,7],2404],
        [[4,8],4099],
        [[2,7],50],
        [[3,7],345]
      ] },
    solution: {
      approach: `<p>Hierholzer on the de Bruijn graph with an explicit stack of (vertex, digit used to enter it). Post-order digits reversed = the Euler circuit's edge labels.</p>`,
      code: `class Solution {
    public String crackSafe(int n, int k) {
        int nodes = 1;
        for (int i = 0; i < n - 1; i++) nodes *= k;          // k^(n-1) vertices
        int[] ptr = new int[nodes];                            // next digit to try from each vertex
        Deque<Integer> nodeStack = new ArrayDeque<>(), digitStack = new ArrayDeque<>();
        StringBuilder digits = new StringBuilder();
        nodeStack.push(0);
        digitStack.push(-1);                                   // nothing led into the start vertex
        while (!nodeStack.isEmpty()) {
            int v = nodeStack.peek();
            if (ptr[v] < k) {
                int d = ptr[v]++;
                nodeStack.push((v * k + d) % nodes);           // drop the oldest digit, append d
                digitStack.push(d);
            } else {
                nodeStack.pop();
                int d = digitStack.pop();
                if (d >= 0) digits.append(d);                  // post-order edge label
            }
        }
        digits.reverse();
        StringBuilder ans = new StringBuilder();
        for (int i = 0; i < n - 1; i++) ans.append('0');       // the start vertex
        return ans.append(digits).toString();
    }
}`,
      alt: [{ lang: 'python', code: `def crack_safe(n, k):
    nodes = k ** (n - 1)                       # vertices: every (n-1)-digit string
    ptr = [0] * nodes                          # next digit to try from each vertex
    node_stack, digit_stack = [0], [-1]        # nothing led into the start vertex
    digits = []
    while node_stack:
        v = node_stack[-1]
        if ptr[v] < k:
            d = ptr[v]
            ptr[v] += 1
            node_stack.append((v * k + d) % nodes)   # drop the oldest digit, append d
            digit_stack.append(d)
        else:
            node_stack.pop()
            d = digit_stack.pop()
            if d >= 0:
                digits.append(d)               # post-order edge label
    digits.reverse()
    return '0' * (n - 1) + ''.join(map(str, digits))   # the start vertex, then the digits
` }, { lang: 'js', code: `function crackSafe(n, k) {
  let nodes = 1;
  for (let i = 0; i < n - 1; i++) nodes *= k;          // k^(n-1) vertices
  const ptr = new Int32Array(nodes);                   // next digit to try from each vertex
  const nodeStack = [0], digitStack = [-1];            // nothing led into the start vertex
  const digits = [];
  while (nodeStack.length) {
    const v = nodeStack[nodeStack.length - 1];
    if (ptr[v] < k) {
      const d = ptr[v]++;
      nodeStack.push((v * k + d) % nodes);             // drop the oldest digit, append d
      digitStack.push(d);
    } else {
      nodeStack.pop();
      const d = digitStack.pop();
      if (d >= 0) digits.push(d);                      // post-order edge label
    }
  }
  digits.reverse();
  return '0'.repeat(n - 1) + digits.join('');          // the start vertex, then the digits
}
` }, { lang: 'cpp', code: `class Solution {
public:
    string crackSafe(int n, int k) {
        int nodes = 1;
        for (int i = 0; i < n - 1; i++) nodes *= k;    // k^(n-1) vertices
        vector<int> ptr(nodes, 0);                     // next digit to try from each vertex
        vector<int> nodeStack{0}, digitStack{-1};      // nothing led into the start vertex
        string digits;
        while (!nodeStack.empty()) {
            int v = nodeStack.back();
            if (ptr[v] < k) {
                int d = ptr[v]++;
                nodeStack.push_back((v * k + d) % nodes);   // drop the oldest digit, append d
                digitStack.push_back(d);
            } else {
                nodeStack.pop_back();
                int d = digitStack.back();
                digitStack.pop_back();
                if (d >= 0) digits.push_back('0' + d);      // post-order edge label
            }
        }
        reverse(digits.begin(), digits.end());
        return string(n - 1, '0') + digits;            // the start vertex, then the digits
    }
};
` }],
      complexity: `<p>Time and space <b>O(k<sup>n</sup>)</b> — one push and pop per password.</p>`,
      followUps: ['Prove the length k<sup>n</sup> + n − 1 is optimal.', 'Genome assembly uses the same graph on k-mers — what breaks with sequencing errors?']
    }
  });

  practice.push({
    title: 'Valid Arrangement of Pairs',
    level: 'Hard', tags: ['euler path', 'hierholzer', 'hashmap'], companies: ['Google', 'Microsoft'],
    statement: `<p>You get <code>pairs[i] = [start, end]</code>. Rearrange all pairs so that for every i ≥ 1, <code>pairs[i−1][1] == pairs[i][0]</code>. A valid arrangement is guaranteed to exist; return any.</p>`,
    constraints: `<p>1 ≤ pairs.length ≤ 10<sup>5</sup>, 0 ≤ values ≤ 10<sup>9</sup>, no two pairs are equal.</p>`,
    example: `<p>pairs = <code>[[5,1],[4,5],[11,9],[9,4]]</code> → <b>${H.c('g', '[[11,9],[9,4],[4,5],[5,1]]')}</b>.</p><p>Why: values are vertices, pairs are directed edges; 11 has out − in = +1 so the chain must start there: 11 → 9 → 4 → 5 → 1.</p>`,
    brute: {
      why: `<p>Backtracking over which pair comes next tries up to n! orders; even with pruning it explodes on graphs with many cycles. The waste: an Euler path can be built greedily in O(n) with Hierholzer.</p>`,
      code: `class Brute {
    public int[][] validArrangement(int[][] pairs) {
        int n = pairs.length;
        int[][] ans = new int[n][];
        boolean[] used = new boolean[n];
        for (int i = 0; i < n; i++) {                    // try every pair as the first one
            used[i] = true;
            ans[0] = pairs[i];
            if (go(pairs, used, ans, 1)) return ans;
            used[i] = false;
        }
        return ans;
    }

    private boolean go(int[][] pairs, boolean[] used, int[][] ans, int pos) {
        if (pos == pairs.length) return true;
        for (int i = 0; i < pairs.length; i++) {
            if (used[i] || pairs[i][0] != ans[pos - 1][1]) continue;
            used[i] = true;
            ans[pos] = pairs[i];
            if (go(pairs, used, ans, pos + 1)) return true;
            used[i] = false;
        }
        return false;
    }
}`
    },
    mcq: { q: 'All values are balanced (out = in). Where can the arrangement start?', options: ['At any start value that has an outgoing pair — it is an Euler circuit', 'Only at the smallest value', 'Nowhere — no arrangement exists', 'Only at pairs[0][1]'], answer: 0, explain: 'Balanced degrees + connectivity → Euler circuit, which can start anywhere on it.' },
    hints: [
      `<p>Hint 1: Values are vertices, pairs are directed edges, and "use every pair once, end of one = start of next" is an Euler path.</p>`,
      `<p>Hint 2: Values go up to 10<sup>9</sup> → adjacency in a hash map (<code>HashMap</code> / <code>dict</code> / <code>Map</code> / <code>unordered_map</code>). Start at the value with out − in = +1, or at pairs[0][0] if all are balanced.</p>`,
      `<p>Hint 3: Recipe — iterative Hierholzer: push start; while stack: if top has an unused out-edge, push its target; else pop into a list. Reverse the list (vertices) and turn consecutive vertices into pairs.</p>`
    ],
    tests: { sig: "string int[][] -> int[][]", fn: "arrange", check: `(args, out, exp) => {
  let pairs = args[1];
  const kind = args[0], N = 100000;
  if (kind !== '') {
    pairs = [];
    if (kind === 'chain') for (let i = 0; i < N; i++) { const j = (i * 7919) % N; pairs.push([j * 10000, (j + 1) * 10000]); }
    else if (kind === 'cycle') for (let i = 0; i < N; i++) { const j = (i * 7919) % N; pairs.push([j * 10000, ((j + 1) % N) * 10000]); }
    else for (let i = 0; i < N / 2; i++) { const a = (((i * 7919) % (N / 2)) + 1) * 1000; pairs.push([0, a], [a, 0]); }
  }
  if (!Array.isArray(out) || out.length !== pairs.length) return false;
  for (let i = 1; i < out.length; i++) if (out[i - 1][1] !== out[i][0]) return false;      // each pair starts where the last ended
  const key = (p) => p[0] + ',' + p[1];
  const a = out.map(key).sort(), b = pairs.map(key).sort();                                   // same pairs, none lost or invented
  return a.every((x, i) => x === b[i]);
}`, cases: [
        [["",[[5,1],[4,5],[11,9],[9,4]]],[[11,9],[9,4],[4,5],[5,1]]],
        [["",[[5,6]]],[[5,6]]],
        [["",[[1,2],[2,1]]],[[1,2],[2,1]]],
        [["",[[3,1],[2,3],[1,2]]],[[3,1],[1,2],[2,3]]],
        [["",[[1,2],[2,3],[3,1],[1,4],[4,1]]],[[1,2],[2,3],[3,1],[1,4],[4,1]]],
        [["",[[1000000000,0],[0,1000000000]]],[[1000000000,0],[0,1000000000]]],
        [["",[[4,5],[3,4],[2,3],[1,2],[0,1]]],[[0,1],[1,2],[2,3],[3,4],[4,5]]],
        [["",[[2,2],[3,2],[0,3],[2,0],[2,1]]],[[2,2],[2,0],[0,3],[3,2],[2,1]]],
        [["",[[0,0],[0,2],[2,0],[3,0],[0,3]]],[[0,0],[0,2],[2,0],[0,3],[3,0]]],
        [["",[[0,1],[3,1],[3,2],[2,3],[2,1],[1,2],[2,0],[1,3]]],[[2,3],[3,1],[1,2],[2,1],[1,3],[3,2],[2,0],[0,1]]],
        [["",[[1,0],[1,2],[2,3],[0,0],[3,2],[2,1],[1,3],[3,3],[3,1]]],[[1,2],[2,3],[3,2],[2,1],[1,3],[3,3],[3,1],[1,0],[0,0]]],
        [["",[[2,3],[3,1],[2,2],[2,0],[0,2]]],[[2,2],[2,0],[0,2],[2,3],[3,1]]],
        [["",[[1,0],[0,1],[1,2],[2,2],[2,3],[3,3]]],[[1,0],[0,1],[1,2],[2,2],[2,3],[3,3]]],
        [["",[[0,0],[3,0],[0,3]]],[[0,0],[0,3],[3,0]]],
        [["",[[3,0],[1,1],[0,1],[1,3],[1,0]]],[[1,1],[1,3],[3,0],[0,1],[1,0]]],
        [["",[[2,3],[3,2],[2,0],[2,2],[0,3],[3,1],[1,2]]],[[2,3],[3,2],[2,0],[0,3],[3,1],[1,2],[2,2]]],
        [["",[[1,0],[0,3],[0,0],[3,0],[1,3],[3,1]]],[[1,0],[0,3],[3,1],[1,3],[3,0],[0,0]]],
        [["chain",[]],null],
        [["cycle",[]],null],
        [["flower",[]],null]
      ], harness: { java: `class Check {
  static int[][] arrange(String kind, int[][] pairs) {
    if (!kind.isEmpty()) {
      int N = 100000;
      pairs = new int[N][];
      for (int i = 0; i < N; i++) {
        long j = (long) i * 7919 % N;
        if (kind.equals("chain")) pairs[i] = new int[]{(int) j * 10000, (int) (j + 1) * 10000};
        else if (kind.equals("cycle")) pairs[i] = new int[]{(int) j * 10000, (int) ((j + 1) % N) * 10000};
        else { int a = (int) (((long) (i / 2) * 7919 % (N / 2)) + 1) * 1000; pairs[i] = i % 2 == 0 ? new int[]{0, a} : new int[]{a, 0}; }
      }
    }
    return new Solution().validArrangement(pairs);
  }
}`, python: `def arrange(kind, pairs):
    if kind != '':
        N = 100000
        if kind == 'chain':
            pairs = [[(i * 7919 % N) * 10000, (i * 7919 % N + 1) * 10000] for i in range(N)]
        elif kind == 'cycle':
            pairs = [[(i * 7919 % N) * 10000, ((i * 7919 % N + 1) % N) * 10000] for i in range(N)]
        else:
            pairs = []
            for i in range(N // 2):
                a = (i * 7919 % (N // 2) + 1) * 1000
                pairs += [[0, a], [a, 0]]
    return valid_arrangement(pairs)`, js: `function arrange(kind, pairs) {
  if (kind !== '') {
    const N = 100000;
    pairs = [];
    for (let i = 0; i < N; i++) {
      const j = (i * 7919) % N;
      if (kind === 'chain') pairs.push([j * 10000, (j + 1) * 10000]);
      else if (kind === 'cycle') pairs.push([j * 10000, ((j + 1) % N) * 10000]);
      else if (i < N / 2) { const a = ((i * 7919) % (N / 2) + 1) * 1000; pairs.push([0, a], [a, 0]); }
    }
  }
  return validArrangement(pairs);
}`, cpp: `vector<vector<int>> arrange(string kind, vector<vector<int>> pairs) {
  if (!kind.empty()) {
    const long long N = 100000;
    pairs.clear();
    for (long long i = 0; i < N; i++) {
      long long j = i * 7919 % N;
      if (kind == "chain") pairs.push_back({(int)(j * 10000), (int)((j + 1) * 10000)});
      else if (kind == "cycle") pairs.push_back({(int)(j * 10000), (int)((j + 1) % N * 10000)});
      else if (i < N / 2) { int a = (int)((i * 7919 % (N / 2) + 1) * 1000); pairs.push_back({0, a}); pairs.push_back({a, 0}); }
    }
  }
  return Solution().validArrangement(pairs);
}` } },
    solution: {
      approach: `<p>Directed Euler path with Hierholzer on a hash-map graph.</p>`,
      code: `class Solution {
    public int[][] validArrangement(int[][] pairs) {
        Map<Integer, Deque<Integer>> g = new HashMap<>();
        Map<Integer, Integer> balance = new HashMap<>();          // out - in
        for (int[] p : pairs) {
            g.computeIfAbsent(p[0], x -> new ArrayDeque<>()).push(p[1]);
            balance.merge(p[0], 1, Integer::sum);
            balance.merge(p[1], -1, Integer::sum);
        }
        int start = pairs[0][0];
        for (Map.Entry<Integer, Integer> e : balance.entrySet())
            if (e.getValue() == 1) { start = e.getKey(); break; }
        Deque<Integer> stack = new ArrayDeque<>();
        List<Integer> order = new ArrayList<>();                 // vertices in reverse Euler order
        stack.push(start);
        while (!stack.isEmpty()) {
            Deque<Integer> out = g.get(stack.peek());
            if (out != null && !out.isEmpty()) stack.push(out.pop());
            else order.add(stack.pop());
        }
        Collections.reverse(order);
        int[][] ans = new int[pairs.length][];
        for (int i = 0; i + 1 < order.size(); i++) ans[i] = new int[]{order.get(i), order.get(i + 1)};
        return ans;
    }
}`,
      alt: [{ lang: 'python', code: `from collections import defaultdict


def valid_arrangement(pairs):
    graph = defaultdict(list)             # vertex -> unused out-neighbours
    balance = defaultdict(int)            # out-degree minus in-degree
    for a, b in pairs:
        graph[a].append(b)
        balance[a] += 1
        balance[b] -= 1
    start = pairs[0][0]
    for v, bal in balance.items():
        if bal == 1:                      # the chain must begin where out - in = +1
            start = v
            break
    stack = [start]
    order = []                            # vertices in reverse Euler order
    while stack:
        out = graph[stack[-1]]
        if out:
            stack.append(out.pop())
        else:
            order.append(stack.pop())
    order.reverse()
    return [[order[i], order[i + 1]] for i in range(len(pairs))]
` }, { lang: 'js', code: `function validArrangement(pairs) {
  const graph = new Map();                // vertex -> unused out-neighbours
  const balance = new Map();              // out-degree minus in-degree
  for (const [a, b] of pairs) {
    if (!graph.has(a)) graph.set(a, []);
    graph.get(a).push(b);
    balance.set(a, (balance.get(a) || 0) + 1);
    balance.set(b, (balance.get(b) || 0) - 1);
  }
  let start = pairs[0][0];
  for (const [v, bal] of balance) {
    if (bal === 1) { start = v; break; }  // the chain must begin where out - in = +1
  }
  const stack = [start], order = [];      // order = vertices in reverse Euler order
  while (stack.length) {
    const out = graph.get(stack[stack.length - 1]);
    if (out && out.length) stack.push(out.pop());
    else order.push(stack.pop());
  }
  order.reverse();
  const ans = [];
  for (let i = 0; i < pairs.length; i++) ans.push([order[i], order[i + 1]]);
  return ans;
}
` }, { lang: 'cpp', code: `class Solution {
public:
    vector<vector<int>> validArrangement(vector<vector<int>>& pairs) {
        unordered_map<int, vector<int>> graph;     // vertex -> unused out-neighbours
        unordered_map<int, int> balance;           // out-degree minus in-degree
        for (auto& p : pairs) {
            graph[p[0]].push_back(p[1]);
            balance[p[0]]++;
            balance[p[1]]--;
        }
        int start = pairs[0][0];
        for (auto& [v, bal] : balance)
            if (bal == 1) { start = v; break; }    // the chain must begin where out - in = +1
        vector<int> stack{start}, order;           // order = vertices in reverse Euler order
        while (!stack.empty()) {
            auto& out = graph[stack.back()];
            if (!out.empty()) {
                int next = out.back();
                out.pop_back();
                stack.push_back(next);
            } else {
                order.push_back(stack.back());
                stack.pop_back();
            }
        }
        reverse(order.begin(), order.end());
        vector<vector<int>> ans;
        for (size_t i = 0; i < pairs.size(); i++) ans.push_back({order[i], order[i + 1]});
        return ans;
    }
};
` }],
      complexity: `<p>Time <b>O(n)</b> expected (hashing), space <b>O(n)</b>.</p>`,
      followUps: ['What if no arrangement is guaranteed? Add the degree and E + 1 length checks.', 'Lexicographically smallest arrangement.']
    }
  });

  practice.push({
    title: '2-SAT: Satisfy Every Two-Option Rule',
    level: 'Hard', tags: ['scc', '2-sat', 'implication graph'], companies: ['Google', 'Jane Street', 'Citadel'],
    statement: `<p>There are <code>n</code> boolean variables x<sub>1</sub> … x<sub>n</sub> and a list of clauses, each "<code>a OR b</code>" where a literal <code>+i</code> means x<sub>i</sub> and <code>−i</code> means NOT x<sub>i</sub>. Return any assignment that makes every clause true (index 1 … n), or <code>null</code> if impossible.</p>`,
    constraints: `<p>1 ≤ n ≤ 10<sup>5</sup>, 1 ≤ clauses ≤ 2·10<sup>5</sup>.</p>`,
    example: `<p>n = 2, clauses <code>(x1 ∨ x2), (¬x1 ∨ x2), (¬x2 ∨ x1)</code> → <b>${H.c('g', 'x1 = true, x2 = true')}</b>.</p><p>Why: clause 2 says "if x1 then x2", clause 3 says "if x2 then x1", clause 1 forbids both false → both true. Adding <code>(¬x1 ∨ ¬x2)</code> would make it impossible: x1 and ¬x1 would land in one SCC.</p>`,
    brute: {
      why: `<p>Try all 2<sup>n</sup> assignments and test every clause: O(2<sup>n</sup>·m). Fine for n ≤ 20, impossible for 10<sup>5</sup>. The waste: clauses with only two literals have implication structure that SCCs decide in linear time.</p>`,
      code: `class Brute {
    boolean[] solve2SAT(int n, int[][] clauses) {
        for (int mask = 0; mask < (1 << n); mask++) {
            boolean ok = true;
            for (int[] c : clauses) {
                if (!(lit(mask, c[0]) || lit(mask, c[1]))) { ok = false; break; }
            }
            if (ok) {
                boolean[] value = new boolean[n + 1];
                for (int i = 1; i <= n; i++) value[i] = (mask >> (i - 1) & 1) == 1;
                return value;
            }
        }
        return null;
    }

    private boolean lit(int mask, int l) {
        boolean v = (mask >> (Math.abs(l) - 1) & 1) == 1;
        return l > 0 ? v : !v;
    }
}`
    },
    mcq: { q: 'Clause (a ∨ b) becomes which implication edges?', options: ['¬a → b and ¬b → a', 'a → b and b → a', 'a → ¬b only', '¬a → ¬b'], answer: 0, explain: 'If a is false, b must be true; if b is false, a must be true. Both directions are needed for the graph to be symmetric.' },
    hints: [
      `<p>Hint 1: Make 2n nodes: x<sub>i</sub> and ¬x<sub>i</sub>. Each clause (a ∨ b) adds edges ¬a → b and ¬b → a.</p>`,
      `<p>Hint 2: If x and ¬x are in the same SCC, x ⇒ ¬x and ¬x ⇒ x — contradiction, unsatisfiable. Otherwise a solution exists.</p>`,
      `<p>Hint 3: Recipe — Kosaraju (iterative) numbers components in topological order. Set x<sub>i</sub> = true iff comp[x<sub>i</sub>] &gt; comp[¬x<sub>i</sub>] (choose the literal that comes later, so nothing it implies can force a contradiction).</p>`
    ],
    tests: { sig: "string int int[][] -> bool", fn: "sat", cases: [
        [["",2,[[1,2],[-1,2],[-2,1]]],true],
        [["",2,[[1,2],[-1,2],[-2,1],[-1,-2]]],false],
        [["",1,[[1,1]]],true],
        [["",1,[[1,1],[-1,-1]]],false],
        [["",1,[[1,-1]]],true],
        [["",3,[[1,2],[-1,-2],[2,3],[-2,-3],[1,3],[-1,-3]]],false],
        [["",3,[[1,2],[-1,3],[-2,-3]]],true],
        [["",4,[[-1,2],[-2,3],[-3,4],[-4,-1],[1,4]]],true],
        [["",4,[[-1,2],[3,-2],[-1,-2],[1,-3],[4,2],[-1,-3],[-2,3]]],true],
        [["",5,[[-2,-1],[5,-4],[-5,-5],[4,-3],[4,-3],[-5,1],[-4,-1],[4,2],[4,-1]]],true],
        [["",4,[[-1,3],[-3,-2],[1,2],[1,-2],[1,4],[-1,-2]]],true],
        [["",6,[[6,-6],[-1,1],[-2,6],[3,-2],[-6,2],[1,3],[-2,4],[2,3],[-5,5],[-4,1],[1,4],[2,-4],[-1,-4]]],true],
        [["",4,[[-1,1],[-2,1],[4,3],[4,3],[-2,-2],[4,-3],[3,4]]],true],
        [["",4,[[-3,3],[-3,-2],[-4,2],[-4,3],[4,2],[-1,3],[1,-2],[-1,1],[1,1],[-2,-3],[-4,3],[-2,3]]],false],
        [["",4,[[1,-3],[-1,1],[-4,2],[-4,-4],[3,-4],[2,3],[-4,2]]],true],
        [["",4,[[3,4],[3,2],[-4,-2],[-1,-2],[-2,4],[-4,-4],[-2,1]]],true],
        [["chain",0,[]],true],
        [["chainunsat",0,[]],false],
        [["alternate",0,[]],true]
      ], harness: { java: `class Check {
  static boolean sat(String kind, int n, int[][] cl) {
    if (!kind.isEmpty()) {
      n = 100000;
      if (kind.equals("chain")) {
        cl = new int[n - 1][];
        for (int i = 1; i < n; i++) cl[i - 1] = new int[]{-i, i + 1};
      } else if (kind.equals("chainunsat")) {
        cl = new int[n + 1][];
        for (int i = 1; i < n; i++) cl[i - 1] = new int[]{-i, i + 1};
        cl[n - 1] = new int[]{1, 1};
        cl[n] = new int[]{-n, -n};
      } else {
        cl = new int[2 * (n - 1)][];
        for (int i = 1; i < n; i++) { cl[2 * (i - 1)] = new int[]{i, i + 1}; cl[2 * (i - 1) + 1] = new int[]{-i, -(i + 1)}; }
      }
    }
    boolean[] v = new Solution().solve2SAT(n, cl);
    if (v == null || v.length != n + 1) return false;
    for (int[] c : cl) {
      boolean a = c[0] > 0 ? v[c[0]] : !v[-c[0]], b = c[1] > 0 ? v[c[1]] : !v[-c[1]];
      if (!a && !b) return false;
    }
    return true;
  }
}`, python: `def sat(kind, n, cl):
    if kind != '':
        n = 100000
        if kind == 'chain':
            cl = [[-i, i + 1] for i in range(1, n)]
        elif kind == 'chainunsat':
            cl = [[-i, i + 1] for i in range(1, n)] + [[1, 1], [-n, -n]]
        else:
            cl = [c for i in range(1, n) for c in ([i, i + 1], [-i, -(i + 1)])]
    v = solve_2sat(n, cl)
    if v is None or len(v) != n + 1:
        return False
    return all(v[abs(a)] == (a > 0) or v[abs(b)] == (b > 0) for a, b in cl)`, js: `function sat(kind, n, cl) {
  if (kind !== '') {
    n = 100000;
    cl = [];
    for (let i = 1; i < n; i++) {
      if (kind === 'alternate') cl.push([i, i + 1], [-i, -(i + 1)]);
      else cl.push([-i, i + 1]);
    }
    if (kind === 'chainunsat') cl.push([1, 1], [-n, -n]);
  }
  const v = solve2SAT(n, cl);
  if (v === null || v.length !== n + 1) return false;
  const val = (l) => (l > 0 ? v[l] : !v[-l]);
  return cl.every(([a, b]) => val(a) || val(b));
}`, cpp: `bool sat(string kind, int n, vector<vector<int>> cl) {
  if (!kind.empty()) {
    n = 100000;
    cl.clear();
    for (int i = 1; i < n; i++) {
      if (kind == "alternate") { cl.push_back({i, i + 1}); cl.push_back({-i, -(i + 1)}); }
      else cl.push_back({-i, i + 1});
    }
    if (kind == "chainunsat") { cl.push_back({1, 1}); cl.push_back({-n, -n}); }
  }
  vector<bool> v = Solution().solve2SAT(n, cl);
  if (v.size() != (size_t)n + 1) return false;
  auto val = [&](int l) { return l > 0 ? (bool)v[l] : !v[-l]; };
  for (auto& c : cl) if (!val(c[0]) && !val(c[1])) return false;
  return true;
}` } },
    solution: {
      approach: `<p>Implication graph + iterative Kosaraju. Node 2(i−1) is x<sub>i</sub>, node 2(i−1)+1 is ¬x<sub>i</sub>, so negation is <code>^ 1</code>.</p>`,
      code: `class Solution {
    boolean[] solve2SAT(int n, int[][] clauses) {
        int N = 2 * n;
        List<List<Integer>> g = new ArrayList<>(), rg = new ArrayList<>();
        for (int i = 0; i < N; i++) { g.add(new ArrayList<>()); rg.add(new ArrayList<>()); }
        for (int[] c : clauses) {
            int a = node(c[0]), b = node(c[1]);
            g.get(a ^ 1).add(b); rg.get(b).add(a ^ 1);          // NOT a -> b
            g.get(b ^ 1).add(a); rg.get(a).add(b ^ 1);          // NOT b -> a
        }
        int[] order = new int[N], it = new int[N];
        boolean[] seen = new boolean[N];
        int cnt = 0;
        Deque<Integer> st = new ArrayDeque<>();
        for (int s = 0; s < N; s++) {                           // pass 1: finish order
            if (seen[s]) continue;
            seen[s] = true;
            st.push(s);
            while (!st.isEmpty()) {
                int v = st.peek();
                if (it[v] < g.get(v).size()) {
                    int w = g.get(v).get(it[v]++);
                    if (!seen[w]) { seen[w] = true; st.push(w); }
                } else {
                    st.pop();
                    order[cnt++] = v;
                }
            }
        }
        int[] comp = new int[N];
        Arrays.fill(comp, -1);
        int c = 0;
        for (int k = N - 1; k >= 0; k--) {                      // pass 2: topological component ids
            int s = order[k];
            if (comp[s] != -1) continue;
            comp[s] = c;
            st.push(s);
            while (!st.isEmpty()) {
                int v = st.pop();
                for (int w : rg.get(v)) if (comp[w] == -1) { comp[w] = c; st.push(w); }
            }
            c++;
        }
        boolean[] value = new boolean[n + 1];
        for (int i = 1; i <= n; i++) {
            int x = 2 * (i - 1);
            if (comp[x] == comp[x ^ 1]) return null;             // x <=> NOT x
            value[i] = comp[x] > comp[x ^ 1];                    // later in topological order wins
        }
        return value;
    }

    private int node(int lit) { return lit > 0 ? 2 * (lit - 1) : 2 * (-lit - 1) + 1; }
}`,
      alt: [{ lang: 'python', code: `def solve_2sat(n, clauses):
    size = 2 * n                              # node 2(i-1) = x_i, node 2(i-1)+1 = NOT x_i
    g = [[] for _ in range(size)]
    rg = [[] for _ in range(size)]

    def node(lit):
        return 2 * (lit - 1) if lit > 0 else 2 * (-lit - 1) + 1

    for x, y in clauses:
        a, b = node(x), node(y)
        g[a ^ 1].append(b)                    # NOT a -> b
        rg[b].append(a ^ 1)
        g[b ^ 1].append(a)                    # NOT b -> a
        rg[a].append(b ^ 1)
    seen = [False] * size
    order = []
    for s in range(size):                     # pass 1: finish order (iterative DFS)
        if seen[s]:
            continue
        seen[s] = True
        stack = [(s, 0)]
        while stack:
            v, i = stack[-1]
            if i < len(g[v]):
                stack[-1] = (v, i + 1)
                w = g[v][i]
                if not seen[w]:
                    seen[w] = True
                    stack.append((w, 0))
            else:
                stack.pop()
                order.append(v)
    comp = [-1] * size
    c = 0
    for s in reversed(order):                 # pass 2: topological component ids
        if comp[s] != -1:
            continue
        comp[s] = c
        pending = [s]
        while pending:
            v = pending.pop()
            for w in rg[v]:
                if comp[w] == -1:
                    comp[w] = c
                    pending.append(w)
        c += 1
    value = [False] * (n + 1)
    for i in range(1, n + 1):
        x = 2 * (i - 1)
        if comp[x] == comp[x ^ 1]:            # x <=> NOT x
            return None
        value[i] = comp[x] > comp[x ^ 1]      # later in topological order wins
    return value
` }, { lang: 'js', code: `function solve2SAT(n, clauses) {
  const size = 2 * n;                         // node 2(i-1) = x_i, node 2(i-1)+1 = NOT x_i
  const g = Array.from({ length: size }, () => []);
  const rg = Array.from({ length: size }, () => []);
  const node = (lit) => (lit > 0 ? 2 * (lit - 1) : 2 * (-lit - 1) + 1);
  for (const [x, y] of clauses) {
    const a = node(x), b = node(y);
    g[a ^ 1].push(b); rg[b].push(a ^ 1);      // NOT a -> b
    g[b ^ 1].push(a); rg[a].push(b ^ 1);      // NOT b -> a
  }
  const seen = new Uint8Array(size), it = new Int32Array(size);
  const order = [];
  for (let s = 0; s < size; s++) {            // pass 1: finish order
    if (seen[s]) continue;
    seen[s] = 1;
    const stack = [s];
    while (stack.length) {
      const v = stack[stack.length - 1];
      if (it[v] < g[v].length) {
        const w = g[v][it[v]++];
        if (!seen[w]) { seen[w] = 1; stack.push(w); }
      } else {
        stack.pop();
        order.push(v);
      }
    }
  }
  const comp = new Int32Array(size).fill(-1);
  let c = 0;
  for (let k = size - 1; k >= 0; k--) {       // pass 2: topological component ids
    const s = order[k];
    if (comp[s] !== -1) continue;
    comp[s] = c;
    const pending = [s];
    while (pending.length) {
      const v = pending.pop();
      for (const w of rg[v]) if (comp[w] === -1) { comp[w] = c; pending.push(w); }
    }
    c++;
  }
  const value = new Array(n + 1).fill(false);
  for (let i = 1; i <= n; i++) {
    const x = 2 * (i - 1);
    if (comp[x] === comp[x ^ 1]) return null; // x <=> NOT x
    value[i] = comp[x] > comp[x ^ 1];         // later in topological order wins
  }
  return value;
}
` }, { lang: 'cpp', code: `class Solution {
public:
    // Returns n + 1 entries (index 0 unused), or an empty vector when the clauses cannot all hold.
    vector<bool> solve2SAT(int n, vector<vector<int>>& clauses) {
        int size = 2 * n;                              // node 2(i-1) = x_i, node 2(i-1)+1 = NOT x_i
        vector<vector<int>> g(size), rg(size);
        auto node = [](int lit) { return lit > 0 ? 2 * (lit - 1) : 2 * (-lit - 1) + 1; };
        for (auto& c : clauses) {
            int a = node(c[0]), b = node(c[1]);
            g[a ^ 1].push_back(b); rg[b].push_back(a ^ 1);   // NOT a -> b
            g[b ^ 1].push_back(a); rg[a].push_back(b ^ 1);   // NOT b -> a
        }
        vector<int> order, it(size, 0);
        vector<char> seen(size, 0);
        for (int s = 0; s < size; s++) {               // pass 1: finish order
            if (seen[s]) continue;
            seen[s] = 1;
            vector<int> st{s};
            while (!st.empty()) {
                int v = st.back();
                if (it[v] < (int)g[v].size()) {
                    int w = g[v][it[v]++];
                    if (!seen[w]) { seen[w] = 1; st.push_back(w); }
                } else {
                    st.pop_back();
                    order.push_back(v);
                }
            }
        }
        vector<int> comp(size, -1);
        int c = 0;
        for (int k = size - 1; k >= 0; k--) {          // pass 2: topological component ids
            int s = order[k];
            if (comp[s] != -1) continue;
            comp[s] = c;
            vector<int> pending{s};
            while (!pending.empty()) {
                int v = pending.back();
                pending.pop_back();
                for (int w : rg[v]) if (comp[w] == -1) { comp[w] = c; pending.push_back(w); }
            }
            c++;
        }
        vector<bool> value(n + 1, false);
        for (int i = 1; i <= n; i++) {
            int x = 2 * (i - 1);
            if (comp[x] == comp[x ^ 1]) return {};     // x <=> NOT x
            value[i] = comp[x] > comp[x ^ 1];          // later in topological order wins
        }
        return value;
    }
};
` }],
      complexity: `<p>Time <b>O(n + m)</b>, space <b>O(n + m)</b>.</p>`,
      followUps: ['Why does 3-SAT not have such an algorithm? (NP-complete.)', 'Model "exactly one of a, b" and "a implies b" as 2-SAT clauses.']
    }
  });

  practice.push({
    title: 'Max Flow with Node Capacities (Node Splitting)',
    level: 'Hard', tags: ['max flow', 'node splitting', 'dinic'], companies: ['Google', 'Amazon', 'Cloudflare'],
    statement: `<p>A data network has <code>n</code> routers. <code>links[i] = [u, v, c]</code> is a one-way link with bandwidth c. Every router v other than the source <code>s</code> and sink <code>t</code> can forward at most <code>limit[v]</code> units in total. Return the maximum throughput from s to t.</p>`,
    constraints: `<p>2 ≤ n ≤ 2000, 1 ≤ links ≤ 10<sup>4</sup>, capacities ≤ 10<sup>9</sup>.</p>`,
    example: `<p>n = 4, s = 0, t = 3, links <code>0→1:10, 0→2:10, 1→3:10, 2→3:10</code>, limit = <code>[∞, 4, 7, ∞]</code> → <b>${H.c('g', '11')}</b>.</p><p>Why: links allow 20, but router 1 forwards at most 4 and router 2 at most 7: 4 + 7 = 11.</p>`,
    brute: {
      why: `<p>Plain Ford-Fulkerson (DFS) on the split network is correct but O(E·F) with F up to ~10<sup>13</sup>. Ignoring node limits (plain max flow) is fast but <b>wrong</b> (answers 20 here). The fix is the model, then a fast algorithm.</p>`,
      code: `class Brute {
    long maxThroughput(int n, int[][] links, long[] limit, int s, int t) {
        int N = 2 * n;                                       // v_in = v, v_out = v + n
        long[][] r = new long[N][N];
        for (int v = 0; v < n; v++) r[v][v + n] = (v == s || v == t) ? Long.MAX_VALUE / 4 : limit[v];
        for (int[] l : links) r[l[0] + n][l[1]] += l[2];
        long flow = 0, pushed;
        while ((pushed = dfs(r, s, t + n, Long.MAX_VALUE, new boolean[N])) > 0) flow += pushed;
        return flow;
    }

    long dfs(long[][] r, int v, int t, long f, boolean[] seen) {
        if (v == t) return f;
        seen[v] = true;
        for (int w = 0; w < r.length; w++)
            if (!seen[w] && r[v][w] > 0) {
                long d = dfs(r, w, t, Math.min(f, r[v][w]), seen);
                if (d > 0) { r[v][w] -= d; r[w][v] += d; return d; }
            }
        return 0;
    }
}`
    },
    mcq: { q: 'How do you put a capacity on a NODE?', options: ['Split it into v_in → v_out with that capacity; in-links go to v_in, out-links leave v_out', 'Divide each incident edge by its degree', 'Add a self-loop with that capacity', 'Cap the source edges only'], answer: 0, explain: 'All flow through v must cross the single edge v_in → v_out, so its capacity limits the node.' },
    hints: [
      `<p>Hint 1: Flow algorithms only limit edges. Turn each router into an edge.</p>`,
      `<p>Hint 2: v becomes v_in (id v) and v_out (id v + n) with edge v_in → v_out of capacity limit[v] (∞ for s and t). Link u → v becomes u_out → v_in.</p>`,
      `<p>Hint 3: Recipe — build the 2n-node network, run Dinic from s_in to t_out, use 64-bit integers and a large finite INF (a quarter of the 64-bit maximum).</p>`
    ],
    tests: { sig: "string int int[][] long[] int int -> long", fn: "flow", cases: [
        [["",4,[[0,1,10],[0,2,10],[1,3,10],[2,3,10]],[1000000000,4,7,1000000000],0,3],11],
        [["",2,[[0,1,5]],[0,0],0,1],5],
        [["",3,[[0,1,5]],[0,0,0],0,2],0],
        [["",3,[[0,1,3],[0,1,4],[1,2,100]],[0,6,0],0,2],6],
        [["",3,[[0,1,3],[0,1,4],[1,2,100]],[0,5,0],0,2],5],
        [["",5,[[0,1,10],[1,2,10],[2,1,10],[1,3,4],[2,3,5],[3,4,100],[0,2,2]],[0,9,3,50,0],0,4],7],
        [["",4,[[3,0,7],[0,1,2],[1,2,9],[2,3,4],[0,3,1]],[1,1,1,1],3,2],1],
        [["",4,[[0,1,1000000000],[0,2,1000000000],[1,3,1000000000],[2,3,1000000000]],[0,1000000000,1000000000,0],0,3],2000000000],
        [["",3,[[1,0,4],[2,1,11],[1,2,3],[2,1,9]],[3,9,3],1,2],3],
        [["",6,[[5,1,7],[5,3,9],[3,2,4],[5,4,5],[5,2,10],[0,4,4],[1,2,8],[2,0,10],[5,1,6]],[6,5,2,2,0,8],4,5],0],
        [["",5,[[1,4,12],[1,3,3],[0,2,9],[2,0,1]],[2,7,5,2,7],1,4],12],
        [["",3,[[1,0,8],[2,0,12],[1,2,8],[2,1,6]],[5,3,2],2,0],15],
        [["",7,[[2,0,1],[6,4,9],[3,5,6],[3,6,12]],[1,3,6,4,0,9,5],4,6],0],
        [["",5,[[2,3,9],[2,4,2],[1,3,1]],[6,1,5,9,0],3,4],0],
        [["star",0,[],[],0,0],"1398601997001"],
        [["chain",0,[],[],0,0],999998002]
      ], harness: { java: `class Check {
  static long flow(String kind, int n, int[][] links, long[] limit, int s, int t) {
    if (!kind.isEmpty()) {
      n = 2000; s = 0; t = n - 1;
      limit = new long[n];
      if (kind.equals("star")) {
        links = new int[2 * (n - 2)][];
        for (int v = 1; v <= n - 2; v++) {
          limit[v] = 700000000L + v;
          links[2 * (v - 1)] = new int[]{0, v, 1000000000};
          links[2 * (v - 1) + 1] = new int[]{v, t, 1000000000};
        }
      } else {
        links = new int[n - 1][];
        for (int v = 0; v < n - 1; v++) links[v] = new int[]{v, v + 1, 1000000000};
        for (int v = 1; v < n - 1; v++) limit[v] = 1000000000L - v;
      }
    }
    return new Solution().maxThroughput(n, links, limit, s, t);
  }
}`, python: `def flow(kind, n, links, limit, s, t):
    if kind != '':
        n = 2000
        s, t = 0, n - 1
        if kind == 'star':
            links = [l for v in range(1, n - 1) for l in ([0, v, 10**9], [v, t, 10**9])]
            limit = [0] + [700000000 + v for v in range(1, n - 1)] + [0]
        else:
            links = [[v, v + 1, 10**9] for v in range(n - 1)]
            limit = [0] + [10**9 - v for v in range(1, n - 1)] + [0]
    return max_throughput(n, links, limit, s, t)`, js: `function flow(kind, n, links, limit, s, t) {
  if (kind !== '') {
    n = 2000; s = 0; t = n - 1;
    links = []; limit = new Array(n).fill(0);
    if (kind === 'star') {
      for (let v = 1; v < n - 1; v++) { limit[v] = 700000000 + v; links.push([0, v, 1e9], [v, t, 1e9]); }
    } else {
      for (let v = 0; v < n - 1; v++) links.push([v, v + 1, 1e9]);
      for (let v = 1; v < n - 1; v++) limit[v] = 1e9 - v;
    }
  }
  return maxThroughput(n, links, limit, s, t);
}`, cpp: `long long flow(string kind, int n, vector<vector<int>> links, vector<long long> limit, int s, int t) {
  if (!kind.empty()) {
    n = 2000; s = 0; t = n - 1;
    links.clear();
    limit.assign(n, 0);
    if (kind == "star") {
      for (int v = 1; v < n - 1; v++) { limit[v] = 700000000LL + v; links.push_back({0, v, 1000000000}); links.push_back({v, t, 1000000000}); }
    } else {
      for (int v = 0; v < n - 1; v++) links.push_back({v, v + 1, 1000000000});
      for (int v = 1; v < n - 1; v++) limit[v] = 1000000000LL - v;
    }
  }
  return Solution().maxThroughput(n, links, limit, s, t);
}` } },
    solution: {
      approach: `<p>Node splitting + Dinic (forward-star arrays).</p>`,
      code: `class Solution {
    private int[] head, nxt, to, level, it;
    private long[] cap;
    private int cnt = 0;

    long maxThroughput(int n, int[][] links, long[] limit, int s, int t) {
        int N = 2 * n, M = n + links.length;
        head = new int[N];
        Arrays.fill(head, -1);
        nxt = new int[2 * M];
        to = new int[2 * M];
        cap = new long[2 * M];
        level = new int[N];
        it = new int[N];
        long INF = Long.MAX_VALUE / 4;
        for (int v = 0; v < n; v++) add(v, v + n, (v == s || v == t) ? INF : limit[v]);   // v_in -> v_out
        for (int[] l : links) add(l[0] + n, l[1], l[2]);                                 // u_out -> v_in
        long flow = 0;
        while (bfs(s, t + n, N)) {
            System.arraycopy(head, 0, it, 0, N);
            long f;
            while ((f = dfs(s, t + n, INF)) > 0) flow += f;
        }
        return flow;
    }

    private void add(int u, int v, long c) {
        to[cnt] = v; cap[cnt] = c; nxt[cnt] = head[u]; head[u] = cnt++;
        to[cnt] = u; cap[cnt] = 0; nxt[cnt] = head[v]; head[v] = cnt++;
    }

    private boolean bfs(int s, int t, int N) {
        Arrays.fill(level, -1);
        int[] q = new int[N];
        int qh = 0, qt = 0;
        level[s] = 0;
        q[qt++] = s;
        while (qh < qt) {
            int v = q[qh++];
            for (int e = head[v]; e != -1; e = nxt[e])
                if (cap[e] > 0 && level[to[e]] < 0) { level[to[e]] = level[v] + 1; q[qt++] = to[e]; }
        }
        return level[t] >= 0;
    }

    private long dfs(int v, int t, long f) {
        if (v == t) return f;
        for (; it[v] != -1; it[v] = nxt[it[v]]) {
            int e = it[v];
            if (cap[e] > 0 && level[to[e]] == level[v] + 1) {
                long d = dfs(to[e], t, Math.min(f, cap[e]));
                if (d > 0) { cap[e] -= d; cap[e ^ 1] += d; return d; }
            }
        }
        return 0;
    }
}`,
      alt: [{ lang: 'python', code: `from collections import deque


def max_throughput(n, links, limit, s, t):
    INF = 1 << 60
    size = 2 * n                              # v_in = v, v_out = v + n
    g = [[] for _ in range(size)]
    to, cap = [], []

    def add(u, v, c):
        g[u].append(len(to)); to.append(v); cap.append(c)
        g[v].append(len(to)); to.append(u); cap.append(0)

    for v in range(n):
        add(v, v + n, INF if v in (s, t) else limit[v])    # v_in -> v_out
    for u, v, c in links:
        add(u + n, v, c)                                   # u_out -> v_in
    src, sink = s, t + n
    flow = 0
    while True:
        level = [-1] * size
        level[src] = 0
        q = deque([src])
        while q:
            v = q.popleft()
            for e in g[v]:
                if cap[e] > 0 and level[to[e]] < 0:
                    level[to[e]] = level[v] + 1
                    q.append(to[e])
        if level[sink] < 0:
            return flow
        it = [0] * size                        # current-edge pointers for this phase
        path = []                              # edge ids from src to the current node
        v = src
        while True:                            # iterative DFS: paths can be 2n edges long
            if v == sink:
                push = min(cap[e] for e in path)
                for e in path:
                    cap[e] -= push
                    cap[e ^ 1] += push
                flow += push
                path.clear()
                v = src
                continue
            while it[v] < len(g[v]):
                e = g[v][it[v]]
                if cap[e] > 0 and level[to[e]] == level[v] + 1:
                    break
                it[v] += 1
            if it[v] < len(g[v]):
                path.append(g[v][it[v]])
                v = to[g[v][it[v]]]
            elif v == src:
                break
            else:                              # dead end: back up and skip that edge
                e = path.pop()
                v = to[e ^ 1]
                it[v] += 1
` }, { lang: 'js', code: `function maxThroughput(n, links, limit, s, t) {
  const INF = 1e15;                           // above any possible flow (at most 10^4 * 10^9)
  const size = 2 * n;                         // v_in = v, v_out = v + n
  const g = Array.from({ length: size }, () => []);
  const to = [], cap = [];
  const add = (u, v, c) => {
    g[u].push(to.length); to.push(v); cap.push(c);
    g[v].push(to.length); to.push(u); cap.push(0);
  };
  for (let v = 0; v < n; v++) add(v, v + n, v === s || v === t ? INF : limit[v]);   // v_in -> v_out
  for (const [u, v, c] of links) add(u + n, v, c);                                   // u_out -> v_in
  const src = s, sink = t + n;
  let flow = 0;
  for (;;) {
    const level = new Int32Array(size).fill(-1);
    level[src] = 0;
    const q = [src];
    for (let h = 0; h < q.length; h++) {
      const v = q[h];
      for (const e of g[v]) if (cap[e] > 0 && level[to[e]] < 0) { level[to[e]] = level[v] + 1; q.push(to[e]); }
    }
    if (level[sink] < 0) return flow;
    const it = new Int32Array(size);          // current-edge pointers for this phase
    const path = [];                          // edge ids from src to the current node
    let v = src;
    for (;;) {                                // iterative DFS: paths can be 2n edges long
      if (v === sink) {
        let push = Infinity;
        for (const e of path) push = Math.min(push, cap[e]);
        for (const e of path) { cap[e] -= push; cap[e ^ 1] += push; }
        flow += push;
        path.length = 0;
        v = src;
        continue;
      }
      while (it[v] < g[v].length) {
        const e = g[v][it[v]];
        if (cap[e] > 0 && level[to[e]] === level[v] + 1) break;
        it[v]++;
      }
      if (it[v] < g[v].length) {
        const e = g[v][it[v]];
        path.push(e);
        v = to[e];
      } else if (v === src) {
        break;
      } else {                                // dead end: back up and skip that edge
        const e = path.pop();
        v = to[e ^ 1];
        it[v]++;
      }
    }
  }
}
` }, { lang: 'cpp', code: `class Solution {
    vector<int> head, nxt, to, level, it;
    vector<long long> cap;

    void add(int u, int v, long long c) {
        to.push_back(v); cap.push_back(c); nxt.push_back(head[u]); head[u] = (int)to.size() - 1;
        to.push_back(u); cap.push_back(0); nxt.push_back(head[v]); head[v] = (int)to.size() - 1;
    }

    bool bfs(int s, int t) {
        fill(level.begin(), level.end(), -1);
        queue<int> q;
        level[s] = 0;
        q.push(s);
        while (!q.empty()) {
            int v = q.front();
            q.pop();
            for (int e = head[v]; e != -1; e = nxt[e])
                if (cap[e] > 0 && level[to[e]] < 0) { level[to[e]] = level[v] + 1; q.push(to[e]); }
        }
        return level[t] >= 0;
    }

    long long dfs(int v, int t, long long f) {
        if (v == t) return f;
        for (int& e = it[v]; e != -1; e = nxt[e]) {      // never retry a useless edge this phase
            if (cap[e] > 0 && level[to[e]] == level[v] + 1) {
                long long d = dfs(to[e], t, min(f, cap[e]));
                if (d > 0) { cap[e] -= d; cap[e ^ 1] += d; return d; }
            }
        }
        return 0;
    }

public:
    long long maxThroughput(int n, vector<vector<int>>& links, vector<long long>& limit, int s, int t) {
        const long long INF = LLONG_MAX / 4;
        int size = 2 * n;                                // v_in = v, v_out = v + n
        head.assign(size, -1);
        level.assign(size, -1);
        for (int v = 0; v < n; v++) add(v, v + n, (v == s || v == t) ? INF : limit[v]);   // v_in -> v_out
        for (auto& l : links) add(l[0] + n, l[1], l[2]);                                   // u_out -> v_in
        long long flow = 0;
        while (bfs(s, t + n)) {
            it = head;
            while (long long f = dfs(s, t + n, INF)) flow += f;
        }
        return flow;
    }
};
` }],
      complexity: `<p>Dinic O(V²·E) on 2n nodes and n + E edges; in practice very fast. Space O(n + E).</p>`,
      followUps: ['Minimum number of routers to remove to disconnect s and t (all limits = 1, then min cut).', 'Undirected links.']
    }
  });

  practice.push({
    title: 'Project Selection: Maximum Profit with Prerequisites',
    level: 'Hard', tags: ['min cut', 'max closure', 'dinic'], companies: ['Google', 'Two Sigma', 'Hudson River Trading'],
    statement: `<p>There are <code>n</code> items with value <code>val[i]</code> (positive = profit, negative = cost). <code>req[j] = [a, b]</code> means "if you choose a you must also choose b". Choose a set of items closed under the requirements with <b>maximum total value</b> (choosing nothing gives 0).</p>`,
    constraints: `<p>1 ≤ n ≤ 500, 0 ≤ req ≤ 5000, |val[i]| ≤ 10<sup>6</sup>.</p>`,
    example: `<p>val = <code>[10, 7, -6, -9]</code>, req = <code>[0,2], [1,2], [1,3]</code> → <b>${H.c('g', '4')}</b>.</p><p>Why: item 0 (+10) needs item 2 (−6) → +4. Item 1 (+7) needs 2 and 3 → 7 − 6 − 9 alone is −8, and together with item 0 the total is 10 + 7 − 6 − 9 = 2 &lt; 4. Best is {0, 2}.</p>`,
    brute: {
      why: `<p>Enumerate all 2<sup>n</sup> subsets, keep the closed ones, take the best. O(2<sup>n</sup>·(n + req)). The waste: closure problems have a min-cut structure that solves them in polynomial time.</p>`,
      code: `class Brute {
    long maxProfit(long[] val, int[][] req) {
        int n = val.length;
        long best = 0;
        for (int mask = 0; mask < (1 << n); mask++) {
            boolean closed = true;
            for (int[] r : req)
                if ((mask >> r[0] & 1) == 1 && (mask >> r[1] & 1) == 0) { closed = false; break; }
            if (!closed) continue;
            long sum = 0;
            for (int i = 0; i < n; i++) if ((mask >> i & 1) == 1) sum += val[i];
            best = Math.max(best, sum);
        }
        return best;
    }
}`
    },
    mcq: { q: 'In the project-selection network, what does an ∞ edge a → b enforce?', options: ['If a is on the S-side (chosen), b must be too — otherwise the cut is infinite', 'a and b are never chosen together', 'b is cheaper than a', 'Nothing; ∞ edges are ignored'], answer: 0, explain: 'A finite cut can never cut an ∞ edge, so "a chosen, b not chosen" is impossible.' },
    hints: [
      `<p>Hint 1: Think "choose = S-side". Losing a profit or paying a cost should be exactly the capacity of the edges you cut.</p>`,
      `<p>Hint 2: S → i with capacity val[i] for profits (cut = not chosen, profit lost); i → T with capacity −val[i] for costs (cut = chosen, cost paid); a → b with ∞ for each requirement.</p>`,
      `<p>Hint 3: Recipe — answer = (sum of positive values) − maxflow(S, T). The chosen set = nodes reachable from S in the residual graph.</p>`
    ],
    tests: { sig: "long[] int[][] -> long", fn: "maxProfit", cases: [
        [[[10,7,-6,-9],[[0,2],[1,2],[1,3]]],4],
        [[[5],[]],5],
        [[[-5],[]],0],
        [[[-3,-4],[]],0],
        [[[3,4],[]],7],
        [[[5,-8],[[0,1]]],0],
        [[[8,-5],[[0,1]]],3],
        [[[1000000,-1000000,1000000,-999999],[[0,1],[2,3]]],1],
        [[[4,-2,-2,6,-7],[[0,1],[0,2],[3,4],[3,1]]],0],
        [[[2,2,-3],[[0,2],[1,2]]],1],
        [[[3,-1,-1,-1,5],[[0,1],[1,2],[2,3],[3,4],[4,0]]],5],
        [[[0,-6,8,-4],[[3,1],[2,3],[1,3]]],0],
        [[[-4,-7,-9,-6],[[2,3],[3,2]]],0],
        [[[-1,2,0,-7,8,6,-2,-5],[[2,1],[4,5],[0,7],[7,3],[0,3]]],16],
        [[[0,-8,-9,6],[[2,1]]],6],
        [[[-2,2,4],[[0,1]]],6],
        [[[1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999,-999999],[[0,250],[1,251],[2,252],[3,253],[4,254],[5,255],[6,256],[7,257],[8,258],[9,259],[10,260],[11,261],[12,262],[13,263],[14,264],[15,265],[16,266],[17,267],[18,268],[19,269],[20,270],[21,271],[22,272],[23,273],[24,274],[25,275],[26,276],[27,277],[28,278],[29,279],[30,280],[31,281],[32,282],[33,283],[34,284],[35,285],[36,286],[37,287],[38,288],[39,289],[40,290],[41,291],[42,292],[43,293],[44,294],[45,295],[46,296],[47,297],[48,298],[49,299],[50,300],[51,301],[52,302],[53,303],[54,304],[55,305],[56,306],[57,307],[58,308],[59,309],[60,310],[61,311],[62,312],[63,313],[64,314],[65,315],[66,316],[67,317],[68,318],[69,319],[70,320],[71,321],[72,322],[73,323],[74,324],[75,325],[76,326],[77,327],[78,328],[79,329],[80,330],[81,331],[82,332],[83,333],[84,334],[85,335],[86,336],[87,337],[88,338],[89,339],[90,340],[91,341],[92,342],[93,343],[94,344],[95,345],[96,346],[97,347],[98,348],[99,349],[100,350],[101,351],[102,352],[103,353],[104,354],[105,355],[106,356],[107,357],[108,358],[109,359],[110,360],[111,361],[112,362],[113,363],[114,364],[115,365],[116,366],[117,367],[118,368],[119,369],[120,370],[121,371],[122,372],[123,373],[124,374],[125,375],[126,376],[127,377],[128,378],[129,379],[130,380],[131,381],[132,382],[133,383],[134,384],[135,385],[136,386],[137,387],[138,388],[139,389],[140,390],[141,391],[142,392],[143,393],[144,394],[145,395],[146,396],[147,397],[148,398],[149,399],[150,400],[151,401],[152,402],[153,403],[154,404],[155,405],[156,406],[157,407],[158,408],[159,409],[160,410],[161,411],[162,412],[163,413],[164,414],[165,415],[166,416],[167,417],[168,418],[169,419],[170,420],[171,421],[172,422],[173,423],[174,424],[175,425],[176,426],[177,427],[178,428],[179,429],[180,430],[181,431],[182,432],[183,433],[184,434],[185,435],[186,436],[187,437],[188,438],[189,439],[190,440],[191,441],[192,442],[193,443],[194,444],[195,445],[196,446],[197,447],[198,448],[199,449],[200,450],[201,451],[202,452],[203,453],[204,454],[205,455],[206,456],[207,457],[208,458],[209,459],[210,460],[211,461],[212,462],[213,463],[214,464],[215,465],[216,466],[217,467],[218,468],[219,469],[220,470],[221,471],[222,472],[223,473],[224,474],[225,475],[226,476],[227,477],[228,478],[229,479],[230,480],[231,481],[232,482],[233,483],[234,484],[235,485],[236,486],[237,487],[238,488],[239,489],[240,490],[241,491],[242,492],[243,493],[244,494],[245,495],[246,496],[247,497],[248,498],[249,499]]],250],
        [[[1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000],[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,16],[16,17],[17,18],[18,19],[19,20],[20,21],[21,22],[22,23],[23,24],[24,25],[25,26],[26,27],[27,28],[28,29],[29,30],[30,31],[31,32],[32,33],[33,34],[34,35],[35,36],[36,37],[37,38],[38,39],[39,40],[40,41],[41,42],[42,43],[43,44],[44,45],[45,46],[46,47],[47,48],[48,49],[49,50],[50,51],[51,52],[52,53],[53,54],[54,55],[55,56],[56,57],[57,58],[58,59],[59,60],[60,61],[61,62],[62,63],[63,64],[64,65],[65,66],[66,67],[67,68],[68,69],[69,70],[70,71],[71,72],[72,73],[73,74],[74,75],[75,76],[76,77],[77,78],[78,79],[79,80],[80,81],[81,82],[82,83],[83,84],[84,85],[85,86],[86,87],[87,88],[88,89],[89,90],[90,91],[91,92],[92,93],[93,94],[94,95],[95,96],[96,97],[97,98],[98,99],[99,100],[100,101],[101,102],[102,103],[103,104],[104,105],[105,106],[106,107],[107,108],[108,109],[109,110],[110,111],[111,112],[112,113],[113,114],[114,115],[115,116],[116,117],[117,118],[118,119],[119,120],[120,121],[121,122],[122,123],[123,124],[124,125],[125,126],[126,127],[127,128],[128,129],[129,130],[130,131],[131,132],[132,133],[133,134],[134,135],[135,136],[136,137],[137,138],[138,139],[139,140],[140,141],[141,142],[142,143],[143,144],[144,145],[145,146],[146,147],[147,148],[148,149],[149,150],[150,151],[151,152],[152,153],[153,154],[154,155],[155,156],[156,157],[157,158],[158,159],[159,160],[160,161],[161,162],[162,163],[163,164],[164,165],[165,166],[166,167],[167,168],[168,169],[169,170],[170,171],[171,172],[172,173],[173,174],[174,175],[175,176],[176,177],[177,178],[178,179],[179,180],[180,181],[181,182],[182,183],[183,184],[184,185],[185,186],[186,187],[187,188],[188,189],[189,190],[190,191],[191,192],[192,193],[193,194],[194,195],[195,196],[196,197],[197,198],[198,199],[199,200],[200,201],[201,202],[202,203],[203,204],[204,205],[205,206],[206,207],[207,208],[208,209],[209,210],[210,211],[211,212],[212,213],[213,214],[214,215],[215,216],[216,217],[217,218],[218,219],[219,220],[220,221],[221,222],[222,223],[223,224],[224,225],[225,226],[226,227],[227,228],[228,229],[229,230],[230,231],[231,232],[232,233],[233,234],[234,235],[235,236],[236,237],[237,238],[238,239],[239,240],[240,241],[241,242],[242,243],[243,244],[244,245],[245,246],[246,247],[247,248],[248,249],[249,250],[250,251],[251,252],[252,253],[253,254],[254,255],[255,256],[256,257],[257,258],[258,259],[259,260],[260,261],[261,262],[262,263],[263,264],[264,265],[265,266],[266,267],[267,268],[268,269],[269,270],[270,271],[271,272],[272,273],[273,274],[274,275],[275,276],[276,277],[277,278],[278,279],[279,280],[280,281],[281,282],[282,283],[283,284],[284,285],[285,286],[286,287],[287,288],[288,289],[289,290],[290,291],[291,292],[292,293],[293,294],[294,295],[295,296],[296,297],[297,298],[298,299],[299,300],[300,301],[301,302],[302,303],[303,304],[304,305],[305,306],[306,307],[307,308],[308,309],[309,310],[310,311],[311,312],[312,313],[313,314],[314,315],[315,316],[316,317],[317,318],[318,319],[319,320],[320,321],[321,322],[322,323],[323,324],[324,325],[325,326],[326,327],[327,328],[328,329],[329,330],[330,331],[331,332],[332,333],[333,334],[334,335],[335,336],[336,337],[337,338],[338,339],[339,340],[340,341],[341,342],[342,343],[343,344],[344,345],[345,346],[346,347],[347,348],[348,349],[349,350],[350,351],[351,352],[352,353],[353,354],[354,355],[355,356],[356,357],[357,358],[358,359],[359,360],[360,361],[361,362],[362,363],[363,364],[364,365],[365,366],[366,367],[367,368],[368,369],[369,370],[370,371],[371,372],[372,373],[373,374],[374,375],[375,376],[376,377],[377,378],[378,379],[379,380],[380,381],[381,382],[382,383],[383,384],[384,385],[385,386],[386,387],[387,388],[388,389],[389,390],[390,391],[391,392],[392,393],[393,394],[394,395],[395,396],[396,397],[397,398],[398,399],[399,400],[400,401],[401,402],[402,403],[403,404],[404,405],[405,406],[406,407],[407,408],[408,409],[409,410],[410,411],[411,412],[412,413],[413,414],[414,415],[415,416],[416,417],[417,418],[418,419],[419,420],[420,421],[421,422],[422,423],[423,424],[424,425],[425,426],[426,427],[427,428],[428,429],[429,430],[430,431],[431,432],[432,433],[433,434],[434,435],[435,436],[436,437],[437,438],[438,439],[439,440],[440,441],[441,442],[442,443],[443,444],[444,445],[445,446],[446,447],[447,448],[448,449],[449,450],[450,451],[451,452],[452,453],[453,454],[454,455],[455,456],[456,457],[457,458],[458,459],[459,460],[460,461],[461,462],[462,463],[463,464],[464,465],[465,466],[466,467],[467,468],[468,469],[469,470],[470,471],[471,472],[472,473],[473,474],[474,475],[475,476],[476,477],[477,478],[478,479],[479,480],[480,481],[481,482],[482,483],[483,484],[484,485],[485,486],[486,487],[487,488],[488,489],[489,490],[490,491],[491,492],[492,493],[493,494],[494,495],[495,496],[496,497],[497,498],[498,499]]],500000000],
        [[[-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000,-1000000],[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,16],[16,17],[17,18],[18,19],[19,20],[20,21],[21,22],[22,23],[23,24],[24,25],[25,26],[26,27],[27,28],[28,29],[29,30],[30,31],[31,32],[32,33],[33,34],[34,35],[35,36],[36,37],[37,38],[38,39],[39,40],[40,41],[41,42],[42,43],[43,44],[44,45],[45,46],[46,47],[47,48],[48,49],[49,50],[50,51],[51,52],[52,53],[53,54],[54,55],[55,56],[56,57],[57,58],[58,59],[59,60],[60,61],[61,62],[62,63],[63,64],[64,65],[65,66],[66,67],[67,68],[68,69],[69,70],[70,71],[71,72],[72,73],[73,74],[74,75],[75,76],[76,77],[77,78],[78,79],[79,80],[80,81],[81,82],[82,83],[83,84],[84,85],[85,86],[86,87],[87,88],[88,89],[89,90],[90,91],[91,92],[92,93],[93,94],[94,95],[95,96],[96,97],[97,98],[98,99],[99,100],[100,101],[101,102],[102,103],[103,104],[104,105],[105,106],[106,107],[107,108],[108,109],[109,110],[110,111],[111,112],[112,113],[113,114],[114,115],[115,116],[116,117],[117,118],[118,119],[119,120],[120,121],[121,122],[122,123],[123,124],[124,125],[125,126],[126,127],[127,128],[128,129],[129,130],[130,131],[131,132],[132,133],[133,134],[134,135],[135,136],[136,137],[137,138],[138,139],[139,140],[140,141],[141,142],[142,143],[143,144],[144,145],[145,146],[146,147],[147,148],[148,149],[149,150],[150,151],[151,152],[152,153],[153,154],[154,155],[155,156],[156,157],[157,158],[158,159],[159,160],[160,161],[161,162],[162,163],[163,164],[164,165],[165,166],[166,167],[167,168],[168,169],[169,170],[170,171],[171,172],[172,173],[173,174],[174,175],[175,176],[176,177],[177,178],[178,179],[179,180],[180,181],[181,182],[182,183],[183,184],[184,185],[185,186],[186,187],[187,188],[188,189],[189,190],[190,191],[191,192],[192,193],[193,194],[194,195],[195,196],[196,197],[197,198],[198,199],[199,200],[200,201],[201,202],[202,203],[203,204],[204,205],[205,206],[206,207],[207,208],[208,209],[209,210],[210,211],[211,212],[212,213],[213,214],[214,215],[215,216],[216,217],[217,218],[218,219],[219,220],[220,221],[221,222],[222,223],[223,224],[224,225],[225,226],[226,227],[227,228],[228,229],[229,230],[230,231],[231,232],[232,233],[233,234],[234,235],[235,236],[236,237],[237,238],[238,239],[239,240],[240,241],[241,242],[242,243],[243,244],[244,245],[245,246],[246,247],[247,248],[248,249],[249,250],[250,251],[251,252],[252,253],[253,254],[254,255],[255,256],[256,257],[257,258],[258,259],[259,260],[260,261],[261,262],[262,263],[263,264],[264,265],[265,266],[266,267],[267,268],[268,269],[269,270],[270,271],[271,272],[272,273],[273,274],[274,275],[275,276],[276,277],[277,278],[278,279],[279,280],[280,281],[281,282],[282,283],[283,284],[284,285],[285,286],[286,287],[287,288],[288,289],[289,290],[290,291],[291,292],[292,293],[293,294],[294,295],[295,296],[296,297],[297,298],[298,299],[299,300],[300,301],[301,302],[302,303],[303,304],[304,305],[305,306],[306,307],[307,308],[308,309],[309,310],[310,311],[311,312],[312,313],[313,314],[314,315],[315,316],[316,317],[317,318],[318,319],[319,320],[320,321],[321,322],[322,323],[323,324],[324,325],[325,326],[326,327],[327,328],[328,329],[329,330],[330,331],[331,332],[332,333],[333,334],[334,335],[335,336],[336,337],[337,338],[338,339],[339,340],[340,341],[341,342],[342,343],[343,344],[344,345],[345,346],[346,347],[347,348],[348,349],[349,350],[350,351],[351,352],[352,353],[353,354],[354,355],[355,356],[356,357],[357,358],[358,359],[359,360],[360,361],[361,362],[362,363],[363,364],[364,365],[365,366],[366,367],[367,368],[368,369],[369,370],[370,371],[371,372],[372,373],[373,374],[374,375],[375,376],[376,377],[377,378],[378,379],[379,380],[380,381],[381,382],[382,383],[383,384],[384,385],[385,386],[386,387],[387,388],[388,389],[389,390],[390,391],[391,392],[392,393],[393,394],[394,395],[395,396],[396,397],[397,398],[398,399],[399,400],[400,401],[401,402],[402,403],[403,404],[404,405],[405,406],[406,407],[407,408],[408,409],[409,410],[410,411],[411,412],[412,413],[413,414],[414,415],[415,416],[416,417],[417,418],[418,419],[419,420],[420,421],[421,422],[422,423],[423,424],[424,425],[425,426],[426,427],[427,428],[428,429],[429,430],[430,431],[431,432],[432,433],[433,434],[434,435],[435,436],[436,437],[437,438],[438,439],[439,440],[440,441],[441,442],[442,443],[443,444],[444,445],[445,446],[446,447],[447,448],[448,449],[449,450],[450,451],[451,452],[452,453],[453,454],[454,455],[455,456],[456,457],[457,458],[458,459],[459,460],[460,461],[461,462],[462,463],[463,464],[464,465],[465,466],[466,467],[467,468],[468,469],[469,470],[470,471],[471,472],[472,473],[473,474],[474,475],[475,476],[476,477],[477,478],[478,479],[479,480],[480,481],[481,482],[482,483],[483,484],[484,485],[485,486],[486,487],[487,488],[488,489],[489,490],[490,491],[491,492],[492,493],[493,494],[494,495],[495,496],[496,497],[497,498],[498,499]]],0],
        [[[1000000,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999,-1999],[[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],[0,11],[0,12],[0,13],[0,14],[0,15],[0,16],[0,17],[0,18],[0,19],[0,20],[0,21],[0,22],[0,23],[0,24],[0,25],[0,26],[0,27],[0,28],[0,29],[0,30],[0,31],[0,32],[0,33],[0,34],[0,35],[0,36],[0,37],[0,38],[0,39],[0,40],[0,41],[0,42],[0,43],[0,44],[0,45],[0,46],[0,47],[0,48],[0,49],[0,50],[0,51],[0,52],[0,53],[0,54],[0,55],[0,56],[0,57],[0,58],[0,59],[0,60],[0,61],[0,62],[0,63],[0,64],[0,65],[0,66],[0,67],[0,68],[0,69],[0,70],[0,71],[0,72],[0,73],[0,74],[0,75],[0,76],[0,77],[0,78],[0,79],[0,80],[0,81],[0,82],[0,83],[0,84],[0,85],[0,86],[0,87],[0,88],[0,89],[0,90],[0,91],[0,92],[0,93],[0,94],[0,95],[0,96],[0,97],[0,98],[0,99],[0,100],[0,101],[0,102],[0,103],[0,104],[0,105],[0,106],[0,107],[0,108],[0,109],[0,110],[0,111],[0,112],[0,113],[0,114],[0,115],[0,116],[0,117],[0,118],[0,119],[0,120],[0,121],[0,122],[0,123],[0,124],[0,125],[0,126],[0,127],[0,128],[0,129],[0,130],[0,131],[0,132],[0,133],[0,134],[0,135],[0,136],[0,137],[0,138],[0,139],[0,140],[0,141],[0,142],[0,143],[0,144],[0,145],[0,146],[0,147],[0,148],[0,149],[0,150],[0,151],[0,152],[0,153],[0,154],[0,155],[0,156],[0,157],[0,158],[0,159],[0,160],[0,161],[0,162],[0,163],[0,164],[0,165],[0,166],[0,167],[0,168],[0,169],[0,170],[0,171],[0,172],[0,173],[0,174],[0,175],[0,176],[0,177],[0,178],[0,179],[0,180],[0,181],[0,182],[0,183],[0,184],[0,185],[0,186],[0,187],[0,188],[0,189],[0,190],[0,191],[0,192],[0,193],[0,194],[0,195],[0,196],[0,197],[0,198],[0,199],[0,200],[0,201],[0,202],[0,203],[0,204],[0,205],[0,206],[0,207],[0,208],[0,209],[0,210],[0,211],[0,212],[0,213],[0,214],[0,215],[0,216],[0,217],[0,218],[0,219],[0,220],[0,221],[0,222],[0,223],[0,224],[0,225],[0,226],[0,227],[0,228],[0,229],[0,230],[0,231],[0,232],[0,233],[0,234],[0,235],[0,236],[0,237],[0,238],[0,239],[0,240],[0,241],[0,242],[0,243],[0,244],[0,245],[0,246],[0,247],[0,248],[0,249],[0,250],[0,251],[0,252],[0,253],[0,254],[0,255],[0,256],[0,257],[0,258],[0,259],[0,260],[0,261],[0,262],[0,263],[0,264],[0,265],[0,266],[0,267],[0,268],[0,269],[0,270],[0,271],[0,272],[0,273],[0,274],[0,275],[0,276],[0,277],[0,278],[0,279],[0,280],[0,281],[0,282],[0,283],[0,284],[0,285],[0,286],[0,287],[0,288],[0,289],[0,290],[0,291],[0,292],[0,293],[0,294],[0,295],[0,296],[0,297],[0,298],[0,299],[0,300],[0,301],[0,302],[0,303],[0,304],[0,305],[0,306],[0,307],[0,308],[0,309],[0,310],[0,311],[0,312],[0,313],[0,314],[0,315],[0,316],[0,317],[0,318],[0,319],[0,320],[0,321],[0,322],[0,323],[0,324],[0,325],[0,326],[0,327],[0,328],[0,329],[0,330],[0,331],[0,332],[0,333],[0,334],[0,335],[0,336],[0,337],[0,338],[0,339],[0,340],[0,341],[0,342],[0,343],[0,344],[0,345],[0,346],[0,347],[0,348],[0,349],[0,350],[0,351],[0,352],[0,353],[0,354],[0,355],[0,356],[0,357],[0,358],[0,359],[0,360],[0,361],[0,362],[0,363],[0,364],[0,365],[0,366],[0,367],[0,368],[0,369],[0,370],[0,371],[0,372],[0,373],[0,374],[0,375],[0,376],[0,377],[0,378],[0,379],[0,380],[0,381],[0,382],[0,383],[0,384],[0,385],[0,386],[0,387],[0,388],[0,389],[0,390],[0,391],[0,392],[0,393],[0,394],[0,395],[0,396],[0,397],[0,398],[0,399],[0,400],[0,401],[0,402],[0,403],[0,404],[0,405],[0,406],[0,407],[0,408],[0,409],[0,410],[0,411],[0,412],[0,413],[0,414],[0,415],[0,416],[0,417],[0,418],[0,419],[0,420],[0,421],[0,422],[0,423],[0,424],[0,425],[0,426],[0,427],[0,428],[0,429],[0,430],[0,431],[0,432],[0,433],[0,434],[0,435],[0,436],[0,437],[0,438],[0,439],[0,440],[0,441],[0,442],[0,443],[0,444],[0,445],[0,446],[0,447],[0,448],[0,449],[0,450],[0,451],[0,452],[0,453],[0,454],[0,455],[0,456],[0,457],[0,458],[0,459],[0,460],[0,461],[0,462],[0,463],[0,464],[0,465],[0,466],[0,467],[0,468],[0,469],[0,470],[0,471],[0,472],[0,473],[0,474],[0,475],[0,476],[0,477],[0,478],[0,479],[0,480],[0,481],[0,482],[0,483],[0,484],[0,485],[0,486],[0,487],[0,488],[0,489],[0,490],[0,491],[0,492],[0,493],[0,494],[0,495],[0,496],[0,497],[0,498],[0,499]]],2499]
      ] },
    solution: {
      approach: `<p>Max-weight closure via min cut (Picard 1976). Every finite cut ↔ a closed set; cut capacity = lost profits + paid costs.</p>`,
      code: `class Solution {
    private int[] head, nxt, to, level, it;
    private long[] cap;
    private int cnt = 0;

    long maxProfit(long[] val, int[][] req) {
        int n = val.length, S = n, T = n + 1, N = n + 2, M = n + req.length;
        head = new int[N];
        Arrays.fill(head, -1);
        nxt = new int[2 * M];
        to = new int[2 * M];
        cap = new long[2 * M];
        level = new int[N];
        it = new int[N];
        long INF = Long.MAX_VALUE / 4, positive = 0;
        for (int i = 0; i < n; i++) {
            if (val[i] > 0) { add(S, i, val[i]); positive += val[i]; }   // cut = give up this profit
            else add(i, T, -val[i]);                                     // cut = pay this cost
        }
        for (int[] r : req) add(r[0], r[1], INF);                         // a chosen => b chosen
        long flow = 0;
        while (bfs(S, T, N)) {
            System.arraycopy(head, 0, it, 0, N);
            long f;
            while ((f = dfs(S, T, INF)) > 0) flow += f;
        }
        return positive - flow;
    }

    private void add(int u, int v, long c) {
        to[cnt] = v; cap[cnt] = c; nxt[cnt] = head[u]; head[u] = cnt++;
        to[cnt] = u; cap[cnt] = 0; nxt[cnt] = head[v]; head[v] = cnt++;
    }

    private boolean bfs(int s, int t, int N) {
        Arrays.fill(level, -1);
        int[] q = new int[N];
        int qh = 0, qt = 0;
        level[s] = 0;
        q[qt++] = s;
        while (qh < qt) {
            int v = q[qh++];
            for (int e = head[v]; e != -1; e = nxt[e])
                if (cap[e] > 0 && level[to[e]] < 0) { level[to[e]] = level[v] + 1; q[qt++] = to[e]; }
        }
        return level[t] >= 0;
    }

    private long dfs(int v, int t, long f) {
        if (v == t) return f;
        for (; it[v] != -1; it[v] = nxt[it[v]]) {
            int e = it[v];
            if (cap[e] > 0 && level[to[e]] == level[v] + 1) {
                long d = dfs(to[e], t, Math.min(f, cap[e]));
                if (d > 0) { cap[e] -= d; cap[e ^ 1] += d; return d; }
            }
        }
        return 0;
    }
}`,
      dry: {
        head: ['edge', 'capacity', 'in min cut?'],
        rows: [
          ['S → 0', '10', 'no (0 chosen)'],
          ['S → 1', '7', H.c('r', 'yes: give up +7')],
          ['2 → T', '6', H.c('r', 'yes: pay 6')],
          ['3 → T', '9', 'no (3 not chosen)'],
          ['total', 'positives 17', 'min cut 13 → profit <b>4</b>']
        ]
      },
      alt: [{ lang: 'python', code: `from collections import deque


def max_profit(val, req):
    n = len(val)
    S, T = n, n + 1
    INF = 1 << 60
    g = [[] for _ in range(n + 2)]
    to, cap = [], []

    def add(u, v, c):
        g[u].append(len(to)); to.append(v); cap.append(c)
        g[v].append(len(to)); to.append(u); cap.append(0)

    positive = 0
    for i, x in enumerate(val):
        if x > 0:
            add(S, i, x)                       # cut = give up this profit
            positive += x
        else:
            add(i, T, -x)                      # cut = pay this cost
    for a, b in req:
        add(a, b, INF)                         # a chosen => b chosen
    flow = 0
    while True:
        level = [-1] * (n + 2)
        level[S] = 0
        q = deque([S])
        while q:
            v = q.popleft()
            for e in g[v]:
                if cap[e] > 0 and level[to[e]] < 0:
                    level[to[e]] = level[v] + 1
                    q.append(to[e])
        if level[T] < 0:
            return positive - flow
        it = [0] * (n + 2)
        path = []
        v = S
        while True:                            # iterative DFS keeps Python clear of its recursion limit
            if v == T:
                push = min(cap[e] for e in path)
                for e in path:
                    cap[e] -= push
                    cap[e ^ 1] += push
                flow += push
                path.clear()
                v = S
                continue
            while it[v] < len(g[v]):
                e = g[v][it[v]]
                if cap[e] > 0 and level[to[e]] == level[v] + 1:
                    break
                it[v] += 1
            if it[v] < len(g[v]):
                e = g[v][it[v]]
                path.append(e)
                v = to[e]
            elif v == S:
                break
            else:
                e = path.pop()
                v = to[e ^ 1]
                it[v] += 1
` }, { lang: 'js', code: `function maxProfit(val, req) {
  const n = val.length, S = n, T = n + 1, size = n + 2;
  const INF = 1e15;                           // above any possible flow (at most 500 * 10^6)
  const g = Array.from({ length: size }, () => []);
  const to = [], cap = [];
  const add = (u, v, c) => {
    g[u].push(to.length); to.push(v); cap.push(c);
    g[v].push(to.length); to.push(u); cap.push(0);
  };
  let positive = 0;
  for (let i = 0; i < n; i++) {
    if (val[i] > 0) { add(S, i, val[i]); positive += val[i]; }   // cut = give up this profit
    else add(i, T, -val[i]);                                     // cut = pay this cost
  }
  for (const [a, b] of req) add(a, b, INF);                      // a chosen => b chosen
  let flow = 0;
  for (;;) {
    const level = new Int32Array(size).fill(-1);
    level[S] = 0;
    const q = [S];
    for (let h = 0; h < q.length; h++) {
      const v = q[h];
      for (const e of g[v]) if (cap[e] > 0 && level[to[e]] < 0) { level[to[e]] = level[v] + 1; q.push(to[e]); }
    }
    if (level[T] < 0) return positive - flow;
    const it = new Int32Array(size);
    const path = [];
    let v = S;
    for (;;) {
      if (v === T) {
        let push = Infinity;
        for (const e of path) push = Math.min(push, cap[e]);
        for (const e of path) { cap[e] -= push; cap[e ^ 1] += push; }
        flow += push;
        path.length = 0;
        v = S;
        continue;
      }
      while (it[v] < g[v].length) {
        const e = g[v][it[v]];
        if (cap[e] > 0 && level[to[e]] === level[v] + 1) break;
        it[v]++;
      }
      if (it[v] < g[v].length) {
        const e = g[v][it[v]];
        path.push(e);
        v = to[e];
      } else if (v === S) {
        break;
      } else {
        const e = path.pop();
        v = to[e ^ 1];
        it[v]++;
      }
    }
  }
}
` }, { lang: 'cpp', code: `class Solution {
    vector<int> head, nxt, to, level, it;
    vector<long long> cap;

    void add(int u, int v, long long c) {
        to.push_back(v); cap.push_back(c); nxt.push_back(head[u]); head[u] = (int)to.size() - 1;
        to.push_back(u); cap.push_back(0); nxt.push_back(head[v]); head[v] = (int)to.size() - 1;
    }

    bool bfs(int s, int t) {
        fill(level.begin(), level.end(), -1);
        queue<int> q;
        level[s] = 0;
        q.push(s);
        while (!q.empty()) {
            int v = q.front();
            q.pop();
            for (int e = head[v]; e != -1; e = nxt[e])
                if (cap[e] > 0 && level[to[e]] < 0) { level[to[e]] = level[v] + 1; q.push(to[e]); }
        }
        return level[t] >= 0;
    }

    long long dfs(int v, int t, long long f) {
        if (v == t) return f;
        for (int& e = it[v]; e != -1; e = nxt[e]) {
            if (cap[e] > 0 && level[to[e]] == level[v] + 1) {
                long long d = dfs(to[e], t, min(f, cap[e]));
                if (d > 0) { cap[e] -= d; cap[e ^ 1] += d; return d; }
            }
        }
        return 0;
    }

public:
    long long maxProfit(vector<long long>& val, vector<vector<int>>& req) {
        int n = val.size(), S = n, T = n + 1;
        const long long INF = LLONG_MAX / 4;
        head.assign(n + 2, -1);
        level.assign(n + 2, -1);
        long long positive = 0;
        for (int i = 0; i < n; i++) {
            if (val[i] > 0) { add(S, i, val[i]); positive += val[i]; }   // cut = give up this profit
            else add(i, T, -val[i]);                                     // cut = pay this cost
        }
        for (auto& r : req) add(r[0], r[1], INF);                         // a chosen => b chosen
        long long flow = 0;
        while (bfs(S, T)) {
            it = head;
            while (long long f = dfs(S, T, INF)) flow += f;
        }
        return positive - flow;
    }
};
` }],
      complexity: `<p>Dinic on n + 2 nodes and n + req edges: O(V²·E) worst case, fast in practice.</p>`,
      followUps: ['Return the chosen items (residual reachability from S).', 'Image segmentation is the same pattern with pixel-neighbour penalty edges.']
    }
  });

  practice.push({
    title: 'Minimum Path Cover in a DAG',
    level: 'Hard', tags: ['bipartite matching', 'dag', 'könig'], companies: ['Google', 'Uber'],
    statement: `<p>Tasks form a DAG: edge <code>u → v</code> means one worker may do v right after u. Each worker does a chain of tasks following edges, and every task must be done by exactly one worker. Return the <b>minimum number of workers</b> (vertex-disjoint path cover).</p>`,
    constraints: `<p>1 ≤ n ≤ 500, 0 ≤ E ≤ 10<sup>4</sup>, the graph is acyclic.</p>`,
    example: `<p>n = 5, edges <code>0→1, 1→2, 0→3, 3→4, 2→4</code> → <b>${H.c('g', '2')}</b>.</p><p>Why: chains 0→1→2→4 and 3 cover everything. One worker cannot: after 0 they must pick 1 or 3, and the other is left over.</p>`,
    brute: {
      why: `<p>Each task chooses its "next task" (or none) so that no task is chosen twice; try all choices by backtracking. Exponential (∏ out-degree + 1). The waste: "each node picks at most one successor, each node is picked at most once" is exactly a bipartite matching.</p>`,
      code: `class Brute {
    private int best = 0;

    int minWorkers(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(e[1]);
        go(adj, 0, new boolean[n], 0);
        return n - best;                                   // every link merges two chains
    }

    private void go(List<List<Integer>> adj, int u, boolean[] takenAsNext, int links) {
        if (u == adj.size()) { best = Math.max(best, links); return; }
        go(adj, u + 1, takenAsNext, links);                // u is the end of its chain
        for (int v : adj.get(u))
            if (!takenAsNext[v]) {
                takenAsNext[v] = true;
                go(adj, u + 1, takenAsNext, links + 1);
                takenAsNext[v] = false;
            }
    }
}`
    },
    mcq: { q: 'n = 6 tasks and the maximum matching in the split graph is 4. How many workers?', options: ['2', '4', '6', '10'], answer: 0, explain: 'Start with 6 one-task chains; each matched edge glues two chains together: 6 − 4 = 2.' },
    hints: [
      `<p>Hint 1: Start with n chains of length 1. Linking u → v merges two chains — but each node may have at most one successor and at most one predecessor.</p>`,
      `<p>Hint 2: Left copy = "u as predecessor", right copy = "v as successor", edge u–v for each DAG edge. A matching = a valid set of links.</p>`,
      `<p>Hint 3: Recipe — Kuhn over the split graph; answer = n − matching. (If workers may share tasks / paths may overlap, first take the transitive closure.)</p>`
    ],
    tests: { sig: "string int int[][] -> int", fn: "cover", cases: [
        [["",5,[[0,1],[1,2],[0,3],[3,4],[2,4]]],2],
        [["",1,[]],1],
        [["",5,[]],5],
        [["",4,[[0,1],[0,2],[0,3]]],3],
        [["",4,[[0,1],[0,2],[1,3],[2,3]]],2],
        [["",4,[[1,0],[2,0],[3,0]]],3],
        [["",6,[[0,1],[1,2],[2,3],[3,4],[4,5]]],1],
        [["",6,[[0,3],[1,3],[2,3],[3,4],[3,5]]],4],
        [["",2,[[0,1]]],1],
        [["",9,[[6,1],[1,8],[1,7],[4,2],[4,0],[2,0],[2,8],[2,5],[0,8],[5,3],[7,3]]],3],
        [["",6,[[3,5],[3,0],[3,1],[2,0],[0,1]]],3],
        [["",7,[[3,2],[3,6],[1,5],[0,6]]],4],
        [["",6,[[5,4],[0,2],[2,3]]],3],
        [["",9,[[1,2],[7,6],[7,4],[3,4],[5,8],[5,6],[5,2],[8,6],[8,2],[8,4]]],5],
        [["chain",0,[]],1],
        [["band",0,[]],1],
        [["bip",0,[]],250],
        [["none",0,[]],500]
      ], harness: { java: `class Check {
  static int cover(String kind, int n, int[][] edges) {
    if (!kind.isEmpty()) {
      n = 500;
      List<int[]> e = new ArrayList<>();
      for (int i = 0; i < n; i++) {
        if (kind.equals("chain") && i + 1 < n) e.add(new int[]{i, i + 1});
        if (kind.equals("band")) for (int d = 1; d <= 20 && i + d < n; d++) e.add(new int[]{i, i + d});
        if (kind.equals("bip") && i < 250) for (int k = 0; k < 40; k++) e.add(new int[]{i, 250 + (i + k) % 250});
      }
      edges = e.toArray(new int[0][]);
    }
    return new Solution().minWorkers(n, edges);
  }
}`, python: `def cover(kind, n, edges):
    if kind != '':
        n = 500
        edges = []
        for i in range(n):
            if kind == 'chain' and i + 1 < n:
                edges.append([i, i + 1])
            if kind == 'band':
                edges += [[i, i + d] for d in range(1, 21) if i + d < n]
            if kind == 'bip' and i < 250:
                edges += [[i, 250 + (i + k) % 250] for k in range(40)]
    return min_workers(n, edges)`, js: `function cover(kind, n, edges) {
  if (kind !== '') {
    n = 500;
    edges = [];
    for (let i = 0; i < n; i++) {
      if (kind === 'chain' && i + 1 < n) edges.push([i, i + 1]);
      if (kind === 'band') for (let d = 1; d <= 20 && i + d < n; d++) edges.push([i, i + d]);
      if (kind === 'bip' && i < 250) for (let k = 0; k < 40; k++) edges.push([i, 250 + ((i + k) % 250)]);
    }
  }
  return minWorkers(n, edges);
}`, cpp: `int cover(string kind, int n, vector<vector<int>> edges) {
  if (!kind.empty()) {
    n = 500;
    edges.clear();
    for (int i = 0; i < n; i++) {
      if (kind == "chain" && i + 1 < n) edges.push_back({i, i + 1});
      if (kind == "band") for (int d = 1; d <= 20 && i + d < n; d++) edges.push_back({i, i + d});
      if (kind == "bip" && i < 250) for (int k = 0; k < 40; k++) edges.push_back({i, 250 + (i + k) % 250});
    }
  }
  return Solution().minWorkers(n, edges);
}` } },
    solution: {
      approach: `<p>Reduce to maximum bipartite matching (Fulkerson's/Dilworth-style reduction) and use Kuhn.</p>`,
      code: `class Solution {
    private List<List<Integer>> adj;
    private int[] pred;              // pred[v] = task linked right before v, or -1
    private boolean[] seen;

    int minWorkers(int n, int[][] edges) {
        adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(e[1]);
        pred = new int[n];
        Arrays.fill(pred, -1);
        int links = 0;
        for (int u = 0; u < n; u++) {
            seen = new boolean[n];
            if (link(u)) links++;
        }
        return n - links;
    }

    private boolean link(int u) {                    // give u a successor
        for (int v : adj.get(u)) {
            if (seen[v]) continue;
            seen[v] = true;
            if (pred[v] == -1 || link(pred[v])) { pred[v] = u; return true; }
        }
        return false;
    }
}`,
      alt: [{ lang: 'python', code: `def min_workers(n, edges):
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
    pred = [-1] * n                            # pred[v] = task linked right before v, or -1

    def link(u, seen):                         # give u a successor (depth <= n)
        for v in adj[u]:
            if v in seen:
                continue
            seen.add(v)
            if pred[v] == -1 or link(pred[v], seen):
                pred[v] = u
                return True
        return False

    links = sum(1 for u in range(n) if link(u, set()))
    return n - links
` }, { lang: 'js', code: `function minWorkers(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) adj[u].push(v);
  const pred = new Int32Array(n).fill(-1);    // pred[v] = task linked right before v, or -1
  let seen;
  const link = (u) => {                       // give u a successor (depth <= n)
    for (const v of adj[u]) {
      if (seen[v]) continue;
      seen[v] = 1;
      if (pred[v] === -1 || link(pred[v])) { pred[v] = u; return true; }
    }
    return false;
  };
  let links = 0;
  for (let u = 0; u < n; u++) {
    seen = new Uint8Array(n);
    if (link(u)) links++;
  }
  return n - links;
}
` }, { lang: 'cpp', code: `class Solution {
    vector<vector<int>> adj;
    vector<int> pred;                          // pred[v] = task linked right before v, or -1
    vector<char> seen;

    bool link(int u) {                         // give u a successor
        for (int v : adj[u]) {
            if (seen[v]) continue;
            seen[v] = 1;
            if (pred[v] == -1 || link(pred[v])) { pred[v] = u; return true; }
        }
        return false;
    }

public:
    int minWorkers(int n, vector<vector<int>>& edges) {
        adj.assign(n, {});
        for (auto& e : edges) adj[e[0]].push_back(e[1]);
        pred.assign(n, -1);
        int links = 0;
        for (int u = 0; u < n; u++) {
            seen.assign(n, 0);
            if (link(u)) links++;
        }
        return n - links;
    }
};
` }],
      complexity: `<p>Kuhn O(V·E) = 5·10<sup>6</sup>; space O(V + E).</p>`,
      followUps: ['Paths may share vertices (Dilworth: minimum chain cover of a partial order).', 'Print the chains.']
    }
  });

  practice.push({
    title: 'Heaviest Edge on a Tree Path (Binary Lifting with Aggregates)',
    level: 'Hard', tags: ['binary lifting', 'lca', 'path query'], companies: ['Google', 'Codeforces-style', 'Amazon'],
    statement: `<p>A weighted tree has <code>n</code> nodes. Answer <code>q</code> queries <code>(u, v)</code>: the <b>maximum edge weight</b> on the path between u and v (0 if u == v).</p>`,
    constraints: `<p>1 ≤ n, q ≤ 10<sup>5</sup>, weights ≤ 10<sup>9</sup>.</p>`,
    example: `<p>n = 5, edges <code>(0,1,4) (1,2,9) (1,3,2) (0,4,7)</code>, queries <code>(2,3) (3,4) (2,2)</code> → <b>${H.c('g', '[9, 7, 0]')}</b>.</p><p>Why: 2 → 1 → 3 uses weights 9, 2 → max 9. 3 → 1 → 0 → 4 uses 2, 4, 7 → max 7. A path from a node to itself has no edges → 0.</p>`,
    brute: {
      why: `<p>Climb from both nodes to their LCA one parent at a time, tracking the max: O(n) per query, 10<sup>10</sup> total on a chain. The waste: the same segments are re-scanned for every query.</p>`,
      code: `class Brute {
    long[] maxEdge(int n, int[][] edges, int[][] queries) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) { adj.get(e[0]).add(new int[]{e[1], e[2]}); adj.get(e[1]).add(new int[]{e[0], e[2]}); }
        int[] par = new int[n], depth = new int[n];
        long[] w = new long[n];
        boolean[] seen = new boolean[n];
        Deque<Integer> q = new ArrayDeque<>();
        q.add(0);
        seen[0] = true;
        while (!q.isEmpty()) {
            int v = q.poll();
            for (int[] e : adj.get(v)) if (!seen[e[0]]) { seen[e[0]] = true; par[e[0]] = v; depth[e[0]] = depth[v] + 1; w[e[0]] = e[1]; q.add(e[0]); }
        }
        long[] ans = new long[queries.length];
        for (int i = 0; i < queries.length; i++) {
            int a = queries[i][0], b = queries[i][1];
            long best = 0;
            while (depth[a] > depth[b]) { best = Math.max(best, w[a]); a = par[a]; }
            while (depth[b] > depth[a]) { best = Math.max(best, w[b]); b = par[b]; }
            while (a != b) { best = Math.max(best, Math.max(w[a], w[b])); a = par[a]; b = par[b]; }
            ans[i] = best;
        }
        return ans;
    }
}`
    },
    mcq: { q: 'How is mx[k][v] (max edge over the 2^k edges above v) built?', options: ['max(mx[k−1][v], mx[k−1][up[k−1][v]])', 'mx[k−1][v] + mx[k−1][v]', 'max over all children', 'mx[k−1][up[k][v]]'], answer: 0, explain: 'The 2^k segment is the first 2^(k−1) edges plus the next 2^(k−1) edges starting at the midpoint ancestor.' },
    hints: [
      `<p>Hint 1: Binary lifting can carry any "combinable" value along each jump — here the maximum edge weight over that jump.</p>`,
      `<p>Hint 2: mx[0][v] = weight of edge (v, parent). mx[k][v] = max(mx[k−1][v], mx[k−1][up[k−1][v]]).</p>`,
      `<p>Hint 3: Recipe — run the usual LCA lifting, and every time you jump u (or v) by 2<sup>k</sup>, fold mx[k][u] (or mx[k][v]) into the answer. In the last step add the two final parent edges.</p>`
    ],
    tests: { sig: "string int int[][] int[][] -> long[]", fn: "heavy", check: `(args, out, exp) => {
  const kind = args[0];
  if (kind === '') return Array.isArray(out) && out.length === exp.length && out.every((x, i) => Number(x) === exp[i]);
  const n = 100000, w = (i) => ((i * 7919) % 999983) + 1;
  const qs = [];
  if (kind === 'chain') qs.push([0, n - 1], [n - 1, 0], [5, 10], [n - 1, n - 1], [50000, 50001], [99990, 3]);
  else for (let i = 0; i < 100000; i++) qs.push([(i * 7919) % n, (i * 104729 + 13) % n]);
  if (!Array.isArray(out) || out.length !== qs.length) return false;
  return qs.every(([u, v], i) => {
    let best = 0;
    if (kind === 'chain') { for (let x = Math.min(u, v) + 1; x <= Math.max(u, v); x++) best = Math.max(best, w(x)); }
    else while (u !== v) { if (u > v) { best = Math.max(best, w(u)); u = (u - 1) >> 1; } else { best = Math.max(best, w(v)); v = (v - 1) >> 1; } }
    return Number(out[i]) === best;
  });
}`, cases: [
        [["",5,[[0,1,4],[1,2,9],[1,3,2],[0,4,7]],[[2,3],[3,4],[2,2]]],[9,7,0]],
        [["",1,[],[[0,0]]],[0]],
        [["",2,[[1,0,1000000000]],[[0,1],[1,0],[0,0]]],[1000000000,1000000000,0]],
        [["",4,[[0,1,5],[1,2,5],[2,3,5]],[[0,3],[3,0],[1,2]]],[5,5,5]],
        [["",6,[[0,1,3],[0,2,8],[1,3,6],[1,4,1],[2,5,2]],[[3,4],[3,5],[4,5],[0,5],[2,1]]],[6,8,8,8,8]],
        [["",7,[[3,0,1],[3,1,2],[3,2,3],[0,4,9],[1,5,8],[2,6,7]],[[4,5],[5,6],[4,6],[3,3],[6,3]]],[9,8,9,0,7]],
        [["",7,[[3,4,33],[3,2,38],[2,1,8],[2,6,3],[1,0,22],[4,5,6]],[[4,4],[5,5],[1,0],[4,1],[2,2],[1,2]]],[0,0,22,38,0,8]],
        [["",12,[[3,1,4],[1,8,23],[1,0,15],[8,11,23],[11,7,26],[7,4,18],[1,5,20],[0,6,4],[11,2,19],[1,10,41],[8,9,41]],[[2,10],[8,7],[3,4],[0,2],[8,11],[0,1]]],[41,26,26,23,23,15]],
        [["",8,[[4,0,6],[4,3,26],[0,6,18],[6,7,7],[0,5,49],[7,2,18],[6,1,20]],[[6,4],[6,0],[1,7],[1,5],[4,2],[2,3]]],[18,18,20,49,18,26]],
        [["",8,[[4,1,3],[1,0,27],[4,6,38],[6,2,40],[6,3,11],[0,5,33],[4,7,15]],[[3,6],[2,7],[1,6],[6,3],[7,7],[0,4]]],[11,40,38,11,0,27]],
        [["chain",0,[],[]],null],
        [["heap",0,[],[]],null]
      ], harness: { java: `class Check {
  static long[] heavy(String kind, int n, int[][] edges, int[][] queries) {
    if (!kind.isEmpty()) {
      n = 100000;
      edges = new int[n - 1][];
      for (int i = 1; i < n; i++) {
        int w = (int) ((long) i * 7919 % 999983) + 1;
        edges[i - 1] = new int[]{kind.equals("chain") ? i - 1 : (i - 1) / 2, i, w};
      }
      if (kind.equals("chain")) {
        queries = new int[][]{{0, n - 1}, {n - 1, 0}, {5, 10}, {n - 1, n - 1}, {50000, 50001}, {99990, 3}};
      } else {
        queries = new int[100000][];
        for (int i = 0; i < queries.length; i++)
          queries[i] = new int[]{(int) ((long) i * 7919 % n), (int) (((long) i * 104729 + 13) % n)};
      }
    }
    return new Solution().maxEdge(n, edges, queries);
  }
}`, python: `def heavy(kind, n, edges, queries):
    if kind != '':
        n = 100000
        w = lambda i: i * 7919 % 999983 + 1
        if kind == 'chain':
            edges = [[i - 1, i, w(i)] for i in range(1, n)]
            queries = [[0, n - 1], [n - 1, 0], [5, 10], [n - 1, n - 1], [50000, 50001], [99990, 3]]
        else:
            edges = [[(i - 1) // 2, i, w(i)] for i in range(1, n)]
            queries = [[i * 7919 % n, (i * 104729 + 13) % n] for i in range(100000)]
    return max_edge(n, edges, queries)`, js: `function heavy(kind, n, edges, queries) {
  if (kind !== '') {
    n = 100000;
    edges = [];
    for (let i = 1; i < n; i++) edges.push([kind === 'chain' ? i - 1 : (i - 1) >> 1, i, (i * 7919) % 999983 + 1]);
    if (kind === 'chain') {
      queries = [[0, n - 1], [n - 1, 0], [5, 10], [n - 1, n - 1], [50000, 50001], [99990, 3]];
    } else {
      queries = [];
      for (let i = 0; i < 100000; i++) queries.push([(i * 7919) % n, (i * 104729 + 13) % n]);
    }
  }
  return maxEdge(n, edges, queries);
}`, cpp: `vector<long long> heavy(string kind, int n, vector<vector<int>> edges, vector<vector<int>> queries) {
  if (!kind.empty()) {
    n = 100000;
    edges.clear();
    queries.clear();
    for (long long i = 1; i < n; i++) edges.push_back({(int)(kind == "chain" ? i - 1 : (i - 1) / 2), (int)i, (int)(i * 7919 % 999983 + 1)});
    if (kind == "chain") {
      queries = {{0, n - 1}, {n - 1, 0}, {5, 10}, {n - 1, n - 1}, {50000, 50001}, {99990, 3}};
    } else {
      for (long long i = 0; i < 100000; i++) queries.push_back({(int)(i * 7919 % n), (int)((i * 104729 + 13) % n)});
    }
  }
  return Solution().maxEdge(n, edges, queries);
}` } },
    solution: {
      approach: `<p>Binary lifting with an aggregate table alongside the ancestor table. O(log n) per query.</p>`,
      code: `class Solution {
    long[] maxEdge(int n, int[][] edges, int[][] queries) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) { adj.get(e[0]).add(new int[]{e[1], e[2]}); adj.get(e[1]).add(new int[]{e[0], e[2]}); }
        int LOG = 1;
        while ((1 << LOG) < n) LOG++;
        int[][] up = new int[LOG][n];
        long[][] mx = new long[LOG][n];
        int[] depth = new int[n];
        boolean[] seen = new boolean[n];
        Deque<Integer> q = new ArrayDeque<>();
        q.add(0);
        seen[0] = true;                                    // root: up = itself, mx = 0
        while (!q.isEmpty()) {
            int v = q.poll();
            for (int[] e : adj.get(v)) if (!seen[e[0]]) {
                seen[e[0]] = true; up[0][e[0]] = v; mx[0][e[0]] = e[1]; depth[e[0]] = depth[v] + 1; q.add(e[0]);
            }
        }
        for (int k = 1; k < LOG; k++)
            for (int v = 0; v < n; v++) {
                int mid = up[k - 1][v];
                up[k][v] = up[k - 1][mid];
                mx[k][v] = Math.max(mx[k - 1][v], mx[k - 1][mid]);
            }
        long[] ans = new long[queries.length];
        for (int i = 0; i < queries.length; i++) {
            int a = queries[i][0], b = queries[i][1];
            long best = 0;
            if (depth[a] < depth[b]) { int t = a; a = b; b = t; }
            int diff = depth[a] - depth[b];
            for (int k = 0; k < LOG; k++)
                if ((diff >> k & 1) == 1) { best = Math.max(best, mx[k][a]); a = up[k][a]; }
            if (a != b) {
                for (int k = LOG - 1; k >= 0; k--)
                    if (up[k][a] != up[k][b]) {
                        best = Math.max(best, Math.max(mx[k][a], mx[k][b]));
                        a = up[k][a];
                        b = up[k][b];
                    }
                best = Math.max(best, Math.max(mx[0][a], mx[0][b]));   // the two edges into the LCA
            }
            ans[i] = best;
        }
        return ans;
    }
}`,
      alt: [{ lang: 'python', code: `from collections import deque


def max_edge(n, edges, queries):
    adj = [[] for _ in range(n)]
    for u, v, w in edges:
        adj[u].append((v, w))
        adj[v].append((u, w))
    LOG = max(1, (n - 1).bit_length())         # 2^LOG >= n: any depth difference fits in LOG bits
    up = [[0] * n]                             # up[k][v] = 2^k-th ancestor (the root points to itself)
    mx = [[0] * n]                             # mx[k][v] = heaviest edge on those 2^k steps
    depth = [0] * n
    seen = [False] * n
    seen[0] = True
    queue = deque([0])
    while queue:
        v = queue.popleft()
        for w, c in adj[v]:
            if not seen[w]:
                seen[w] = True
                up[0][w], mx[0][w], depth[w] = v, c, depth[v] + 1
                queue.append(w)
    for k in range(1, LOG):
        pu, pm = up[k - 1], mx[k - 1]
        up.append([pu[pu[v]] for v in range(n)])
        mx.append([max(pm[v], pm[pu[v]]) for v in range(n)])
    ans = []
    for a, b in queries:
        best = 0
        if depth[a] < depth[b]:
            a, b = b, a
        diff = depth[a] - depth[b]
        for k in range(LOG):                   # lift a to b's depth
            if diff >> k & 1:
                best = max(best, mx[k][a])
                a = up[k][a]
        if a != b:
            for k in range(LOG - 1, -1, -1):   # biggest jumps that keep them apart
                if up[k][a] != up[k][b]:
                    best = max(best, mx[k][a], mx[k][b])
                    a, b = up[k][a], up[k][b]
            best = max(best, mx[0][a], mx[0][b])   # the two edges into the LCA
        ans.append(best)
    return ans
` }, { lang: 'js', code: `function maxEdge(n, edges, queries) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) { adj[u].push([v, w]); adj[v].push([u, w]); }
  let LOG = 1;
  while ((1 << LOG) < n) LOG++;               // 2^LOG >= n: any depth difference fits in LOG bits
  const up = Array.from({ length: LOG }, () => new Int32Array(n));   // root points to itself
  const mx = Array.from({ length: LOG }, () => new Float64Array(n)); // heaviest edge on those 2^k steps
  const depth = new Int32Array(n), seen = new Uint8Array(n);
  seen[0] = 1;
  const queue = [0];
  for (let h = 0; h < queue.length; h++) {
    const v = queue[h];
    for (const [w, c] of adj[v]) {
      if (seen[w]) continue;
      seen[w] = 1;
      up[0][w] = v; mx[0][w] = c; depth[w] = depth[v] + 1;
      queue.push(w);
    }
  }
  for (let k = 1; k < LOG; k++)
    for (let v = 0; v < n; v++) {
      const mid = up[k - 1][v];
      up[k][v] = up[k - 1][mid];
      mx[k][v] = Math.max(mx[k - 1][v], mx[k - 1][mid]);
    }
  return queries.map(([a, b]) => {
    let best = 0;
    if (depth[a] < depth[b]) [a, b] = [b, a];
    const diff = depth[a] - depth[b];
    for (let k = 0; k < LOG; k++)             // lift a to b's depth
      if ((diff >> k) & 1) { best = Math.max(best, mx[k][a]); a = up[k][a]; }
    if (a !== b) {
      for (let k = LOG - 1; k >= 0; k--)      // biggest jumps that keep them apart
        if (up[k][a] !== up[k][b]) {
          best = Math.max(best, mx[k][a], mx[k][b]);
          a = up[k][a]; b = up[k][b];
        }
      best = Math.max(best, mx[0][a], mx[0][b]);   // the two edges into the LCA
    }
    return best;
  });
}
` }, { lang: 'cpp', code: `class Solution {
public:
    vector<long long> maxEdge(int n, vector<vector<int>>& edges, vector<vector<int>>& queries) {
        vector<vector<pair<int, int>>> adj(n);
        for (auto& e : edges) {
            adj[e[0]].push_back({e[1], e[2]});
            adj[e[1]].push_back({e[0], e[2]});
        }
        int LOG = 1;
        while ((1 << LOG) < n) LOG++;                       // 2^LOG >= n: any depth difference fits in LOG bits
        vector<vector<int>> up(LOG, vector<int>(n, 0));     // root points to itself
        vector<vector<int>> mx(LOG, vector<int>(n, 0));     // heaviest edge on those 2^k steps
        vector<int> depth(n, 0);
        vector<char> seen(n, 0);
        queue<int> q;
        q.push(0);
        seen[0] = 1;
        while (!q.empty()) {
            int v = q.front();
            q.pop();
            for (auto [w, c] : adj[v]) {
                if (seen[w]) continue;
                seen[w] = 1;
                up[0][w] = v; mx[0][w] = c; depth[w] = depth[v] + 1;
                q.push(w);
            }
        }
        for (int k = 1; k < LOG; k++)
            for (int v = 0; v < n; v++) {
                int mid = up[k - 1][v];
                up[k][v] = up[k - 1][mid];
                mx[k][v] = max(mx[k - 1][v], mx[k - 1][mid]);
            }
        vector<long long> ans;
        for (auto& qu : queries) {
            int a = qu[0], b = qu[1], best = 0;
            if (depth[a] < depth[b]) swap(a, b);
            int diff = depth[a] - depth[b];
            for (int k = 0; k < LOG; k++)                    // lift a to b's depth
                if (diff >> k & 1) { best = max(best, mx[k][a]); a = up[k][a]; }
            if (a != b) {
                for (int k = LOG - 1; k >= 0; k--)           // biggest jumps that keep them apart
                    if (up[k][a] != up[k][b]) {
                        best = max({best, mx[k][a], mx[k][b]});
                        a = up[k][a]; b = up[k][b];
                    }
                best = max({best, mx[0][a], mx[0][b]});      // the two edges into the LCA
            }
            ans.push_back(best);
        }
        return ans;
    }
};
` }],
      complexity: `<p>Build <b>O(n log n)</b>, each query <b>O(log n)</b>, memory O(n log n).</p>`,
      followUps: ['Minimum spanning tree "second best" problems use exactly this query.', 'Edges change weight → Heavy-Light Decomposition + segment tree.']
    }
  });

  // =====================================================================
  // QUIZ
  // =====================================================================
  quiz.push(
    { q: 'In Kosaraju\'s second pass, which graph do you search and in what order?', options: ['The <b>transposed</b> graph, in <b>decreasing</b> finish time', 'The original graph, in increasing finish time', 'The transposed graph, in increasing node id', 'The original graph, in BFS order'], answer: 0, explain: 'The last-finished node sits in a source component; flipping edges turns it into a sink, so the DFS collects exactly one SCC.' },
    { q: 'Why is the condensation (SCCs squashed into single nodes) always a DAG?', options: ['If two components could reach each other, they would be one component', 'Because DFS never revisits nodes', 'Because Tarjan pops components in order', 'It is not always a DAG'], answer: 0, explain: 'A cycle between components would make all of them mutually reachable, contradicting maximality of SCCs.' },
    { q: 'In Tarjan\'s SCC algorithm, an edge v → w reaches a node w that is visited but <b>not on the stack</b>. What do you do?', options: ['Ignore it — w\'s SCC is already closed', 'low[v] = min(low[v], disc[w])', 'low[v] = min(low[v], low[w])', 'Push w again'], answer: 0, explain: 'w belongs to a finished component that cannot reach back to v, so it must not lower v\'s low value.' },
    { q: 'For a <b>non-root</b> vertex v with DFS child w, when is v an articulation point?', options: ['low[w] ≥ disc[v]', 'low[w] &gt; disc[v]', 'low[v] &lt; disc[w]', 'disc[w] ≥ low[v]'], answer: 0, explain: 'w\'s subtree cannot reach anything older than v, so removing v cuts it off. (Strict &gt; is the bridge test.)' },
    { q: 'An undirected connected graph has odd-degree vertices with degrees 3 and 5, all others even. What exists?', options: ['An Euler path starting at one odd vertex and ending at the other, but no circuit', 'An Euler circuit', 'Neither', 'A Hamiltonian cycle'], answer: 0, explain: 'Exactly two odd vertices → Euler path between them; a circuit needs zero odd vertices.' },
    { q: 'Hierholzer\'s algorithm, when the top vertex has no unused edges, …', options: ['pops it and puts it at the FRONT of the answer', 'declares failure', 'restarts from the start vertex', 'appends it to the END of the answer and keeps it on the stack'], answer: 0, explain: 'Vertices are produced in reverse order; prepending (or appending and reversing at the end) gives the Euler path.' },
    { q: 'Binary lifting for LCA on N nodes costs…', options: ['O(N log N) build and O(log N) per query', 'O(N) build and O(1) per query', 'O(N²) build and O(1) per query', 'O(log N) build and O(N) per query'], answer: 0, explain: 'A table of LOG ≈ log₂N rows × N columns; a query does at most 2·LOG jumps.' },
    { q: 'During the "jump both" loop of binary-lifting LCA, why do we skip a jump when up[k][u] == up[k][v]?', options: ['That jump lands on a common ancestor that may be ABOVE the lowest one', 'Because the table entry is invalid', 'To save memory', 'Because u and v are already equal'], answer: 0, explain: 'We only take jumps that keep u and v different; at the end both are children of the LCA.' },
    { q: 'What is the purpose of reverse (residual) edges in Ford-Fulkerson?', options: ['They let later paths cancel ("undo") flow sent earlier, so a bad early choice can be fixed', 'They double the capacity', 'They make the graph undirected', 'They store the BFS parent'], answer: 0, explain: 'Without them greedy augmentation can get stuck below the maximum (e.g. 4 instead of 5 on the diamond network).' },
    { q: 'Worst-case running time of Edmonds-Karp?', options: ['O(V · E²)', 'O(E · F) where F = max flow', 'O(V² · E)', 'O(E log V)'], answer: 0, explain: 'BFS augmentation: O(V·E) augmentations, each O(E). O(E·F) is plain Ford-Fulkerson; O(V²·E) is Dinic.' },
    { q: 'After computing a maximum flow, how do you find a minimum S-T cut?', options: ['S-side = all nodes reachable from S in the residual graph; cut = original edges from S-side to the rest', 'Take all saturated edges', 'Take the edges of the last augmenting path', 'Run Kruskal on the flow values'], answer: 0, explain: 'Every edge leaving the residual-reachable set is full and every edge entering it is empty, so its capacity equals the flow.' },
    { q: 'Dinic\'s algorithm on a unit-capacity bipartite matching network runs in…', options: ['O(E · √V) — the same as Hopcroft-Karp', 'O(V · E)', 'O(V² · E)', 'O(E²)'], answer: 0, explain: 'Shortest augmenting path lengths grow each phase; after √V phases at most √V augmentations remain.' },
    { q: 'In a bipartite graph with 10 vertices and a maximum matching of size 4, the maximum independent set has size…', options: ['6', '4', '10', '14'], answer: 0, explain: 'König: minimum vertex cover = 4. Independent set = complement of a vertex cover → 10 − 4 = 6.' },
    { q: 'Which statement is TRUE?', options: ['Euler path (every edge once) is solvable in linear time; Hamiltonian path (every vertex once) is NP-hard', 'Both are NP-hard', 'Both are linear', 'Euler is NP-hard, Hamiltonian is linear'], answer: 0, explain: 'Euler has a simple degree characterisation and Hierholzer\'s O(V + E) algorithm; no such thing is known for Hamiltonian paths.' }
  );

  // =====================================================================
  // INTERVIEW Q&A
  // =====================================================================
  interview.push(
    { q: 'What is a strongly connected component, and why is the condensation graph useful?', level: 'I',
      a: `<p>In a <b>directed</b> graph, an SCC is a maximal set of nodes where every node can reach every other. Squashing each SCC into one node gives the <b>condensation</b>, which is always a <b>DAG</b> — if two components could reach each other they would be the same component. That is the useful part: once the graph is a DAG, I can use topological order, DP along it, and reason about sources/sinks. Examples: "minimum edges to make the graph strongly connected" = max(#sources, #sinks) in the condensation; "maximum coins collected when you may revisit nodes" = DAG DP where each SCC's coins are summed; 2-SAT checks whether x and ¬x share an SCC.</p>`,
      followUps: ['How many sources/sinks can a condensation have?', 'How would you find the longest path that may revisit nodes?'] },
    { q: 'Kosaraju or Tarjan — which would you implement and why?', level: 'A',
      a: `<p>Both are O(V + E). <b>Kosaraju</b> is two DFS passes (finish order, then DFS on the transpose in decreasing finish time). It is easier to explain and naturally gives components in <b>topological</b> order, but it needs the transposed graph (roughly double memory). <b>Tarjan</b> is a single DFS with <code>disc</code>, <code>low</code>, an <code>onStack</code> flag and a stack; components pop out in <b>reverse topological</b> order, no transpose. In an interview I pick whichever I can write bug-free and explain — usually Kosaraju for clarity — and mention Tarjan if memory matters. For 10<sup>5</sup>+ nodes I make the DFS iterative to avoid stack overflow (Python and JavaScript fail first, then Java and C++).</p>`,
      followUps: ['Which one is easier to make iterative?', 'What order do you need for a 2-SAT assignment?'] },
    { q: 'Explain low-link values and the exact conditions for bridges and articulation points.', level: 'A',
      a: `<p>Run a DFS on an undirected graph. <code>disc[v]</code> is the visit time; <code>low[v]</code> is the smallest disc reachable from v's DFS subtree using tree edges downward and at most one back edge, never re-using the edge to the parent. For a tree edge v–w (w child): it is a <b>bridge</b> iff <code>low[w] &gt; disc[v]</code> — the subtree cannot even get back to v. A <b>non-root</b> v is an <b>articulation point</b> iff some child has <code>low[w] ≥ disc[v]</code> — the subtree can reach v but nothing older. The <b>root</b> is an articulation point iff it has at least two DFS children. Back edges update with <code>disc[w]</code>, not <code>low[w]</code>.</p>`,
      followUps: ['Why does the root need its own rule?', 'What changes with parallel edges?', 'How do you get biconnected components?'] },
    { q: 'Your bridge-finding code skips the parent vertex. A tester reports a wrong answer on a graph with two cables between the same pair of routers. Why?', level: 'A',
      a: `<p>With two parallel edges A–B, neither edge is a bridge: cutting one leaves the other. If the DFS from B skips "the parent vertex A", it also skips the <b>second</b> cable, which is really a back edge. Then low[B] stays equal to disc[B] &gt; disc[A] and the code wrongly reports A–B as a bridge. The fix is to skip only the <b>edge id</b> we arrived by: store (neighbour, edgeId) in adjacency lists and pass the parent edge id down. For articulation points skipping the parent vertex is harmless, because removing a vertex deletes all its parallel edges anyway.</p>`,
      followUps: ['Write the adjacency representation you would use.', 'Does the SCC algorithm have a similar issue?'] },
    { q: 'When does an Euler path exist, and how does Hierholzer\'s algorithm find it in linear time?', level: 'A',
      a: `<p>All edges must be in one connected piece. Undirected: 0 odd-degree vertices → circuit, exactly 2 → path between them. Directed: all in = out → circuit; or one vertex with out − in = 1 (start), one with in − out = 1 (end) → path. The reason: every pass through a vertex uses one in-edge and one out-edge. <b>Hierholzer</b>: push the start; repeatedly look at the top vertex — if it has an unused edge, take it and push the neighbour; if not, pop it to the front of the answer. Getting stuck early just means that vertex is final at that position; detours are spliced in automatically. Each edge is used once, so it is O(V + E). At the end, if the answer has fewer than E + 1 vertices, the edges were disconnected.</p>`,
      followUps: ['How do you get the lexicographically smallest path?', 'Connect this to de Bruijn sequences.', 'What is the Chinese Postman problem?'] },
    { q: 'Compare ways to answer many LCA queries on a static tree.', level: 'A',
      a: `<p><b>Naive climbing</b>: O(depth) per query — fine for balanced trees or few queries. <b>Binary lifting</b>: up[k][v] = 2<sup>k</sup>-th ancestor, O(N log N) build, O(log N) query; it also gives k-th ancestor and path aggregates like max edge. <b>Euler tour + sparse table</b>: LCA is the shallowest node between first occurrences, O(N log N) build and <b>O(1)</b> query. <b>Tarjan's offline LCA</b> with DSU: near-linear if all queries are known up front. <b>Heavy-light decomposition</b>: O(log N) LCA and supports path updates with a segment tree. My default is binary lifting for flexibility; Euler+RMQ when queries vastly outnumber nodes; HLD when edge weights change.</p>`,
      followUps: ['How much memory does binary lifting take for N = 10<sup>6</sup>?', 'How do you compute the distance between two nodes?'] },
    { q: 'Why do max-flow algorithms need reverse edges? Give an example.', level: 'I',
      a: `<p>Augmenting greedily can commit flow to a route that blocks better routes. Network S→A:3, S→B:2, A→B:2, A→T:2, B→T:3. If the first path is S→A→B→T (2 units), then S→A→T (1), we have 3 and the obvious remaining route S→B→T gives only 1 more → stuck at 4. The reverse edge B→A with residual 2 lets the path S→B→A→T push 1 unit, which really means "send 1 less on A→B and route it A→T instead". Then S→B→T adds the last unit → 5 = the min cut. Residual graph: forward residual = c − f, backward residual = f.</p>`,
      followUps: ['What does the final flow look like on each edge?', 'How do you store edges so the reverse is found in O(1)?'] },
    { q: 'State and justify the max-flow min-cut theorem. How do you extract the cut?', level: 'E',
      a: `<p>For any flow f and any S-T cut, |f| ≤ capacity of the cut, because each unit must cross from the S-side to the T-side. When Ford-Fulkerson stops, let X be the nodes reachable from S in the residual graph. T ∉ X. Every edge from X to outside has residual 0 → it is <b>full</b>; every edge from outside into X has backward residual 0 → it carries <b>no flow</b>. So the net flow across (X, V∖X) equals its capacity, i.e. |f| = cut capacity, and by the inequality both are optimal. To extract it: after max flow, BFS from S over residual edges; the cut edges are original edges from visited to unvisited nodes. It is also a case of LP duality, which explains why König, Menger and Hall follow from it.</p>`,
      followUps: ['Is the min cut unique?', 'How do you find edges that are in EVERY min cut?', 'Global min cut without fixed S and T?'] },
    { q: 'Ford-Fulkerson, Edmonds-Karp, Dinic — what are their complexities and how do you choose?', level: 'E',
      a: `<p><b>Ford-Fulkerson with DFS</b>: O(E·F) where F is the max-flow value — only safe with tiny integer capacities; can loop with irrational ones. <b>Edmonds-Karp</b> (shortest path by BFS): O(V·E²), independent of capacities, simple; good up to a few hundred nodes / few thousand edges. <b>Dinic</b> (BFS level graph + blocking flow with current-edge pointers): O(V²·E) in general, O(E·√E) for unit capacities and O(E·√V) for bipartite matching; my default for anything bigger. For very dense graphs or production solvers, <b>push-relabel</b> with heuristics is often fastest; libraries like OR-Tools implement it. I choose from the constraints: V ≤ 500 → EK is fine; V ~ 10<sup>4</sup>, E ~ 10<sup>5</sup> → Dinic.</p>`,
      followUps: ['Why do Dinic phases strictly increase the S-T distance?', 'What does the current-edge pointer prevent?'] },
    { q: 'Model this as flow: hospitals have doctors; each doctor can work at most c<sub>d</sub> shifts, at most one shift per holiday period, only on days they are available, and each day needs exactly one doctor.', level: 'E',
      a: `<p>Source S → each doctor d with capacity <b>c<sub>d</sub></b> (total shifts). Doctor d → node (d, period p) with capacity <b>1</b> for each holiday period (at most one shift per period per doctor). (d, p) → day x with capacity 1 if x is in period p and d is available on x. Each day x → sink T with capacity <b>1</b>. A feasible schedule exists iff the max flow equals the number of days; by integrality, flow 1 on (d, p) → x means "doctor d works day x". The intermediate (d, p) nodes are the key trick: they enforce a per-doctor, per-group limit. This is the classic CLRS/Kleinberg–Tardos "holiday scheduling" exercise and shows the general recipe: one layer per type of constraint.</p>`,
      followUps: ['How would you add a minimum number of shifts per doctor? (Lower bounds / circulation with demands.)', 'Minimise cost if doctors charge different rates? (Min-cost flow.)'] },
    { q: 'How does Kuhn\'s algorithm work, and what is König\'s theorem good for?', level: 'A',
      a: `<p>Process left vertices one by one. For left u, try each right neighbour r not yet visited in this round: if r is free, match it; otherwise recursively ask r's owner to find another partner. A successful chain is an <b>augmenting path</b> — flipping it grows the matching by one. Berge: no augmenting path ⇔ maximum. Cost O(V·E); Hopcroft-Karp improves it to O(E·√V) by augmenting many shortest paths per phase. <b>König</b> (bipartite only): max matching = minimum vertex cover; so max independent set = V − matching. Uses: fewest rows/columns to cover marked cells, minimum path cover of a DAG (n − matching on the split graph), and proving that a greedy-looking answer is optimal.</p>`,
      followUps: ['How do you construct the vertex cover from the matching?', 'What changes for weighted matching or general (non-bipartite) graphs?'] },
    { q: 'You need SCCs of a web-scale graph with billions of edges. What changes compared to the interview solution?', level: 'E',
      a: `<p>Recursive DFS is out: depth can be millions and DFS is inherently sequential. On one large machine I would use an <b>iterative</b> Tarjan/Kosaraju over a compressed CSR representation (int arrays for offsets and targets, maybe memory-mapped), which handles billions of edges if memory allows. For distributed processing, systems use <b>forward-backward (FW-BW)</b> decomposition: pick a pivot, compute forward and backward reachable sets with parallel BFS; their intersection is the pivot's SCC and the three remaining parts can be processed independently. <b>Trimming</b> first removes nodes with in- or out-degree 0 (trivial SCCs), which are a large fraction of real web graphs. Frameworks like Spark GraphX/Pregel-style systems implement label-propagation variants. I would also question whether exact SCCs are needed or an approximation suffices.</p>`,
      followUps: ['Why is DFS hard to parallelise?', 'How do you validate the result at that scale?'] },
    { q: 'Explain how 2-SAT is solved with SCCs.', level: 'E',
      a: `<p>Each variable x gets two nodes: x and ¬x. Each clause (a ∨ b) is equivalent to two implications ¬a → b and ¬b → a; add both edges. If x and ¬x are in the same SCC, then x ⇒ ¬x and ¬x ⇒ x — a contradiction, so unsatisfiable. Otherwise a solution exists: compute SCCs, and for each variable choose the literal whose component comes <b>later</b> in topological order (with Kosaraju's numbering: x = true iff comp[x] &gt; comp[¬x]; with Tarjan's reverse-topological numbering the inequality flips). Choosing the later one never forces anything false downstream. Total O(n + m). Real uses: scheduling with pairwise constraints, placing labels on maps, configuration problems.</p>`,
      followUps: ['Encode "exactly one of a, b".', 'Why does this not extend to 3-SAT?'] },
    { q: 'Recursive DFS works on small tests but crashes on the judge. What is happening and how do you fix it?', level: 'I',
      a: `<p>Graph algorithms like Tarjan, bridges, Kosaraju or Kuhn recurse once per vertex on a path. A 10<sup>5</sup>-node chain makes 10<sup>5</sup> nested calls; Java's default thread stack (often 512 KB–1 MB), JavaScript's ~10<sup>4</sup>-frame limit and Python's recursion limit (1000) cannot hold that → <code>StackOverflowError</code> / <code>RangeError</code> / <code>RecursionError</code>. Fixes: (1) convert to an <b>iterative DFS</b> with an explicit stack of (vertex, next-edge index) pairs, and handle the "return" work (like low[parent] = min(low[parent], low[v])) when popping; (2) give the solver a bigger stack: in Java run it inside <code>new Thread(null, runnable, "main", 1 &lt;&lt; 27)</code> for 128 MB, in C++ raise the stack limit (<code>ulimit -s</code>); (3) in Python, raise the limit and run in a thread with <code>threading.stack_size</code>; iterative is safer in every language.</p>`,
      followUps: ['Rewrite Tarjan SCC iteratively.', 'Which algorithms in this module are naturally iterative?'] }
  );

  // =====================================================================
  // MODULE
  // =====================================================================
  registerModule({
    id: 'dsa22',
    title: 'Advanced Graph Algorithms',
    intro: `<p>This is the module where graphs stop being "BFS and DFS" and become a <b>modelling language</b>. You will learn to find the tightly knit groups of a directed graph (<b>strongly connected components</b> with Kosaraju and Tarjan), the single points of failure of a network (<b>bridges and articulation points</b> with low-link values), routes that use every edge exactly once (<b>Euler paths</b> with Hierholzer), fast ancestor and distance queries on trees (<b>LCA with binary lifting</b>), and the big one: <b>maximum flow</b> (Ford-Fulkerson, Edmonds-Karp, Dinic), its twin the <b>minimum cut</b>, and <b>bipartite matching</b>.</p>
      <p>Every topic starts with an everyday picture, then a plain-English explanation, an interactive visualizer (watch <code>disc/low</code> tags change, flow/capacity labels fill up, augmenting paths reroute), worked examples, a deep dive into proofs and production reality, and an AI-era section on what still needs a human. These algorithms show up in senior interviews, competitive programming, and real systems: build tools, network reliability, schedulers, genome assembly and ride-hailing assignment.</p>`,
    goals: [
      'Find SCCs with Kosaraju and Tarjan, explain <code>disc</code>/<code>low</code>, and solve problems on the condensation DAG (min edges to strongly connect, 2-SAT).',
      'Find bridges and articulation points in one O(V + E) DFS, including the root rule and parallel edges.',
      'Decide Euler path/circuit existence from degrees and construct one with Hierholzer (itineraries, de Bruijn sequences).',
      'Answer LCA, k-th ancestor, distance and path-maximum queries with binary lifting in O(log N).',
      'Explain residual graphs and implement Edmonds-Karp and Dinic; choose between them from constraints.',
      'Extract a minimum cut and model problems with node splitting, ∞ edges and super sources (project selection, edge-disjoint paths).',
      'Solve bipartite matching with Kuhn / Hopcroft-Karp and apply König\'s theorem (vertex cover, path cover, independent set).'
    ],
    prereqs: `<p>DSA 19 (Graphs I: BFS, DFS, topological sort, DSU) and DSA 20 (Graphs II: shortest paths, MST). Comfort with recursion (DSA 11) and bit manipulation (DSA 4) helps for binary lifting.</p>`,
    hours: 24,
    langNotes: {
      java: `<p><b>Java:</b> a recursive DFS uses one stack frame per vertex, and the default thread stack holds roughly 10,000 simple frames, so a 10<sup>5</sup>-node path graph throws <code>StackOverflowError</code> in recursive Kosaraju, Tarjan, bridges or Kuhn. The solutions here use explicit stacks (iterative Kosaraju, Hierholzer, binary lifting built by BFS), and the Dinic and Kuhn recursions stay as deep as the level graph or the augmenting path, which is at most the vertex count of the stated limits. Flow values overflow <code>int</code> quickly (10<sup>4</sup> edges of capacity 10<sup>9</sup>), so use <code>long</code> for capacities and totals, and use <code>Long.MAX_VALUE / 4</code> as INF so that adding two of them cannot wrap. <code>PriorityQueue</code> is a min-heap (Reconstruct Itinerary), and <code>List&lt;List&lt;Integer&gt;&gt;</code> boxes every integer, so flat arrays win on large graphs.</p>`,
      python: `<p><b>Python:</b> recursion stops at <b>1,000 frames</b> by default (<code>RecursionError</code>), far below a 10<sup>5</sup>-deep DFS. Every Python solution here that must survive deep graphs (SCC, Tarjan, bridges, Euler paths, Dinic, 2-SAT) keeps its own stack of (node, next-edge) pairs, or an edge path in Dinic. The recursive Kuhn matchings are only as deep as the augmenting path (at most 500 here), and the dominoes board raises the limit with <code>sys.setrecursionlimit</code> because a path stays under 800 cells; for deeper work combine <code>sys.setrecursionlimit</code> with <code>threading.stack_size</code>. Integers never overflow, so flow sums and INF = <code>1 &lt;&lt; 60</code> need no care. Use <code>collections.deque</code> for BFS (<code>list.pop(0)</code> is O(n)), <code>heapq</code> for the min-heap in Reconstruct Itinerary (it is min-only; negate values for a max-heap), and a dict of lists for sparse graphs.</p>`,
      js: `<p><b>JavaScript:</b> the call stack holds about 10,000 simple frames before <code>RangeError: Maximum call stack size exceeded</code>, so deep DFS must use an array as an explicit stack, as the solutions here do. <code>Number</code> is exact only up to 2<sup>53</sup>: flow totals stay far below that, but INF must be finite and small enough (the solutions use 10<sup>15</sup>, not <code>Number.MAX_SAFE_INTEGER</code> sums or <code>Infinity</code> arithmetic on capacities), and anything beyond 2<sup>53</sup> needs <code>BigInt</code>. Bit tricks such as <code>x ^ 1</code> and <code>k &gt;&gt; b</code> work on 32-bit values. For BFS never <code>shift()</code> (O(n)); keep a read index into the array. <code>sort()</code> compares strings unless you pass a comparator, which is fine for airport names (Reconstruct Itinerary sorts descending and pops, so no heap is needed). <code>Map</code> and <code>Set</code> are hash tables; JavaScript has no built-in heap, so write a small <code>MinHeap</code> when you need one.</p>`,
      cpp: `<p><b>C++:</b> the default stack is about 8 MB, so a recursive DFS on a 10<sup>5</sup>-deep path usually survives but is not guaranteed (large frames or sanitizers shrink it); the solutions here use an explicit <code>vector</code> stack for the deep ones, while Dinic and Kuhn recurse only as deep as the level graph or augmenting path. Signed overflow is undefined behaviour, so use <code>long long</code> for capacities, flows and INF (<code>LLONG_MAX / 4</code>, so that adding two INF values stays valid). <code>priority_queue</code> is a <b>max</b>-heap: pass <code>greater&lt;&gt;</code> for the smallest-first order Reconstruct Itinerary needs. <code>unordered_map</code> is O(1) on average and <code>map</code> is O(log n) but ordered; use <code>vector&lt;vector&lt;int&gt;&gt;</code> or flat forward-star arrays for adjacency, and <code>queue</code> or a vector with a head index for BFS.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
