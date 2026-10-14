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
    code: [`
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
      }`, {
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
    codeTitle: ['Kosaraju in Java (recursive, clearest form)', 'Kosaraju in Python (iterative)'],
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
      <p><b>Recursion depth is the real production bug.</b> A path graph with 10<sup>5</sup> nodes makes recursive DFS 10<sup>5</sup> frames deep → <code>StackOverflowError</code> in Java (default thread stack ≈ 512 KB–1 MB). Fixes: (1) iterative DFS with an explicit stack of (node, next-edge-index) pairs, like the Python version above; (2) run the solver in <code>new Thread(null, task, "dfs", 1 &lt;&lt; 27)</code> to get a 128 MB stack — a standard competitive-programming trick.</p>
      <p><b>Memory and cache.</b> <code>List&lt;List&lt;Integer&gt;&gt;</code> boxes every integer; for 10<sup>6</sup> edges prefer CSR arrays (<code>int[] start, int[] to</code>) — 3–5× faster. Kosaraju also needs the transpose (double memory), which is the main reason people prefer <b>Tarjan</b> (one pass, no transpose) for huge graphs.</p>
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
    code: [`
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
      }`, {
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
    codeTitle: ['Tarjan in Java (recursive)', 'Tarjan in Python (iterative, safe for deep graphs)'],
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
    code: `
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
      }`,
    codeTitle: 'Bridges + articulation points in one DFS (Java)',
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
      <p><b>Production reality:</b> network engineers call bridges "single points of failure"; tools that audit data-centre topologies, power grids, and road networks run exactly this DFS. Recursion depth is again the trap — LeetCode 1192 has n = 10<sup>5</sup>, and a long path makes the recursion 10<sup>5</sup> deep. Java's default stack often survives ~10<sup>4</sup>–10<sup>5</sup> small frames, but not reliably; Python definitely does not without <code>sys.setrecursionlimit</code> and a bigger thread stack. Write the iterative version for production.</p>`,
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
      solution: {
        approach: `<p>One DFS with disc/low (Tarjan's bridge-finding algorithm). Each edge is examined twice (once from each side), so the whole thing is linear.</p>`,
        code: `class Solution {
    private List<List<int[]>> adj;
    private int[] disc, low;
    private int timer = 0;
    private final List<List<Integer>> result = new ArrayList<>();

    public List<List<Integer>> criticalConnections(int n, List<List<Integer>> connections) {
        adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int id = 0; id < connections.size(); id++) {
            int a = connections.get(id).get(0), b = connections.get(id).get(1);
            adj.get(a).add(new int[]{b, id});
            adj.get(b).add(new int[]{a, id});
        }
        disc = new int[n];
        low = new int[n];
        Arrays.fill(disc, -1);
        for (int v = 0; v < n; v++) if (disc[v] == -1) dfs(v, -1);
        return result;
    }

    private void dfs(int v, int parentEdge) {
        disc[v] = low[v] = timer++;
        for (int[] e : adj.get(v)) {
            int w = e[0], id = e[1];
            if (id == parentEdge) continue;                  // do not reuse the edge we came in on
            if (disc[w] == -1) {
                dfs(w, id);
                low[v] = Math.min(low[v], low[w]);
                if (low[w] > disc[v]) result.add(Arrays.asList(v, w));   // no way back above v
            } else {
                low[v] = Math.min(low[v], disc[w]);          // back edge closes a cycle
            }
        }
    }
}`,
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
    code: [`
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
      }`, `
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
      }`],
    codeTitle: ['Directed Euler path/circuit (Java)', 'Undirected Euler path/circuit (Java)'],
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
      { title: 'Greedy walking fails, Hierholzer does not', html: `<p>Edges <code>A→B, A→C, C→A</code> starting at A (out−in = +1). A naive walker taking A→B first is stuck at B with A→C, C→A unused. Hierholzer: push A, walk A→B, B stuck → answer [B]; back at A, walk A→C→A, A now stuck → [A, B], C → [C, A, B], A → <b>[A, C, A, B]</b>. ${H.c('g', 'The detour was spliced in front of B.')}</p>`, code: `int[][] edges = {{0, 1}, {0, 2}, {2, 0}};   // A=0, B=1, C=2
// Hierholzer.eulerPath(3, edges) returns [0, 2, 0, 1]  i.e.  A C A B` },
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
        `<p>Hint 2: Keep each airport's destinations in a <code>PriorityQueue&lt;String&gt;</code>, so you always take the smallest unused ticket.</p>`,
        `<p>Hint 3: Recipe — stack = [JFK]; while stack not empty: if top has tickets, poll the smallest and push it; else pop and add to the <b>front</b> of the route. Dead ends (like KUL) get popped first and end up at the end of the itinerary.</p>`
      ],
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
    code: [`
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
      }`, `
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
      }`],
    codeTitle: ['Binary lifting: k-th ancestor, LCA, distance (Java)', 'Alternative: Euler tour + sparse table, O(1) per query (Java)'],
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
      { title: 'k-th ancestor (LC 1483) in O(log k)', html: `<p>k = 6 = 110<sub>2</sub>: apply up[1] then up[2]. Order of the jumps does not matter — 2 + 4 = 4 + 2. If k &gt; depth[v], return −1 instead of silently sticking at the root.</p>`, code: `int kth(int[][] up, int[] depth, int v, int k) {
    if (k > depth[v]) return -1;
    for (int b = 0; b < up.length; b++) if ((k >> b & 1) == 1) v = up[b][v];
    return v;
}` }
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
      constraints: `<p>1 ≤ n, q ≤ 10<sup>5</sup>, 1 ≤ w ≤ 10<sup>9</sup> (use <code>long</code>).</p>`,
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
        `<p>Hint 3: Recipe — BFS from 0 fills up[0], depth, dist (no recursion). Build up[k] for k = 1..LOG−1. For each query: equalise depths by the bits of the difference, return early if equal, else jump both while different, LCA = parent. Use long for dist.</p>`
      ],
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
    code: [`
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
      }`, `
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
      }`],
    codeTitle: ['Edmonds-Karp (BFS augmenting paths) in Java', 'Ford-Fulkerson with DFS on a matrix (simplest, small inputs)'],
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
      <p><b>Implementation details that matter:</b> store edges in arrays with the reverse at <code>id ^ 1</code> (edges 0/1, 2/3, …), so pushing flow is two array writes. Use <code>long</code> when capacities × paths can exceed 2<sup>31</sup>. Parallel edges are fine (they just add capacity). In real systems, max flow appears in network bandwidth planning, airline crew and baseball elimination problems, image segmentation, and as a building block for min-cost flow (used in ride-hailing and logistics assignment).</p>`,
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
        `<p>Hint 3: Recipe — loop: BFS from 0 over edges with residual &gt; 0, remembering the edge used to reach each node; if n−1 is unreached, stop; walk back from n−1 to find the bottleneck; subtract it on path edges and add it on their partners; add to the answer. Use long.</p>`
      ],
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
    code: [`
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
      }`, {
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
    codeTitle: ['Dinic in Java (forward-star arrays, current-edge pointers)', 'Dinic in Python'],
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
      <p><b>Recursion depth:</b> the DFS goes at most level[t] ≤ V deep, so for V ≤ 10<sup>4</sup> recursion is fine in Java; for huge V write it iteratively or raise the thread stack.</p>
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
      <p><b>Where AI goes wrong:</b> forgetting to reset <code>it[]</code> at the start of each phase, resetting it inside the inner loop (back to O(V·E²)), checking <code>level[w] &gt; level[v]</code> instead of <code>== level[v] + 1</code>, and using <code>Integer.MAX_VALUE</code> as "infinity" while summing capacities in <code>int</code> (overflow).</p>
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
      solution: {
        approach: `<p>Unit-capacity network + Dinic. Adjacency lists keep edges in input order so the dry run matches. Phase 2 of the example shows the reverse edge 4→1 rerouting the first path.</p>`,
        code: `class Solution {
    private int[] to, cap, level, it;
    private List<List<Integer>> g;

    int edgeDisjointPaths(int n, int[][] edges, int s, int t) {
        int m = edges.length;
        to = new int[2 * m];
        cap = new int[2 * m];
        g = new ArrayList<>();
        for (int i = 0; i < n; i++) g.add(new ArrayList<>());
        for (int i = 0; i < m; i++) {
            int u = edges[i][0], v = edges[i][1];
            to[2 * i] = v;     cap[2 * i] = 1;     g.get(u).add(2 * i);       // each road usable once
            to[2 * i + 1] = u; cap[2 * i + 1] = 0; g.get(v).add(2 * i + 1);   // undo edge
        }
        level = new int[n];
        it = new int[n];
        int paths = 0;
        while (bfs(s, t, n)) {
            Arrays.fill(it, 0);
            int f;
            while ((f = dfs(s, t, Integer.MAX_VALUE)) > 0) paths += f;
        }
        return paths;
    }

    private boolean bfs(int s, int t, int n) {
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

    private int dfs(int v, int t, int f) {
        if (v == t) return f;
        for (; it[v] < g.get(v).size(); it[v]++) {
            int e = g.get(v).get(it[v]), w = to[e];
            if (cap[e] > 0 && level[w] == level[v] + 1) {
                int d = dfs(w, t, Math.min(f, cap[e]));
                if (d > 0) { cap[e] -= d; cap[e ^ 1] += d; return d; }
            }
        }
        return 0;
    }
}`,
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
registerModule({ id: 'dsa22', title: 'Advanced Graph Algorithms', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
