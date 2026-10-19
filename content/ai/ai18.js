(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- small helpers shared by the visualizers ---------- */
  function r3(x) { var v = Math.round(x * 1000) / 1000; return v === 0 ? 0 : v; }   // avoid "-0"
  function parseVec(s, name) {
    var a = String(s).trim().split(/[\s,]+/).filter(function (t) { return t !== ''; }).map(Number);
    if (!a.length || a.some(isNaN)) throw new Error('Enter ' + (name || 'a vector') + ' as numbers separated by spaces, e.g. 2 1');
    if (a.length > 8) throw new Error('Use at most 8 numbers per vector');
    return a;
  }
  // "1 2; 3 4" -> [[1,2],[3,4]]
  function parseMat(s, name) {
    var rows = String(s).split(';').map(function (r) { return parseVec(r, (name || 'the matrix') + ' rows'); });
    var w = rows[0].length;
    if (rows.some(function (r) { return r.length !== w; })) throw new Error('Every row of ' + (name || 'the matrix') + ' needs the same number of entries (rows separated by ;)');
    if (rows.length > 6 || w > 6) throw new Error('Keep ' + (name || 'the matrix') + ' at 6×6 or smaller');
    return rows;
  }
  function splitBar(s, n, hint) {
    var p = String(s).split('|');
    if (p.length !== n) throw new Error('Format: ' + hint);
    return p;
  }
  function vs(v) { return '(' + v.map(r3).join(', ') + ')'; }
  function mrows(M) { return M.map(function (r) { return r.map(r3); }); }
  function mv(M, v) { return M.map(function (row) { return row.reduce(function (s, x, j) { return s + x * v[j]; }, 0); }); }
  function dotv(a, b) { return a.reduce(function (s, x, i) { return s + x * b[i]; }, 0); }
  function normv(a) { return Math.sqrt(dotv(a, a)); }

  /* A 2-D "graph paper" picture: arrows from the origin O (or from another point) to each vector tip.
     vecs: [{id, name, x, y, from?, cls?, tag?}] ; y grows upwards like in school maths. */
  function plane(label, vecs, opt) {
    opt = opt || {};
    var H = opt.height || 64, cx = 50, cy = H / 2;
    var m = opt.scale || 1;
    vecs.forEach(function (v) { m = Math.max(m, Math.abs(v.x), Math.abs(v.y)); });
    var k = (H / 2 - 6) / m;
    var nodes = [
      { id: 'O', label: 'O', x: cx, y: cy },
      { id: 'X+', label: 'x', x: Math.min(97, cx + k * m + 6), y: cy },
      { id: 'Y+', label: 'y', x: cx, y: 3 }
    ];
    var edges = [['O', 'X+'], ['O', 'Y+']], hl = { O: 'done', 'X+': 'done', 'Y+': 'done' }, ehl = {}, tags = {};
    vecs.forEach(function (v) {
      nodes.push({ id: v.id, label: v.name, x: r3(cx + k * v.x), y: r3(cy - k * v.y) });
      if (!v.noArrow) { edges.push([v.from || 'O', v.id]); if (v.cls) ehl[(v.from || 'O') + '-' + v.id] = v.cls; }
      if (v.cls) hl[v.id] = v.cls;
      tags[v.id] = v.tag !== undefined ? v.tag : vs([v.x, v.y]);
    });
    return { type: 'graph', label: label, directed: true, height: H, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags };
  }

  /* builds a problem; `key` pulls the Python model solution, brute code and tests from SOL/TESTS (generated chunk) */
  function PR(key, o) {
    var s = SOL[key], t = TESTS[key];
    var brute = { why: o.bruteWhy };
    if (s && s.brute) brute.code = { lang: 'python', code: s.brute };
    var sol = { approach: o.approach, complexity: o.complexity, followUps: o.followUps || [] };
    if (s) sol.code = { lang: 'python', code: s.code };
    if (o.dry) sol.dry = o.dry;
    var p = {
      title: o.title, level: o.level, tags: o.tags, companies: o.companies || [], lang: 'python',
      statement: o.statement, constraints: o.constraints, example: o.example,
      brute: brute, mcq: o.mcq, hints: o.hints, solution: sol
    };
    p.tests = t ? { sig: t.sig, fn: t.fn, cmp: t.cmp, cases: t.cases } : { skip: 'conceptual' };
    return p;
  }
  // ---- generated: Python model solutions and test cases (single source: sol/gen.py) ----
  var SOL = {
"normalize": {
"code": "import math\n\ndef normalize(v):\n    # Step 1: length (norm) = square root of the sum of squares (Pythagoras)\n    length = math.sqrt(sum(x * x for x in v))\n    # Step 2: a zero vector has no direction, so we return it unchanged\n    if length == 0:\n        return [0.0 for _ in v]\n    # Step 3: divide every slot by the length -> new length is exactly 1\n    return [x / length for x in v]\n",
"brute": "import math\n\ndef normalize(v):\n    # Same maths, but the length is recomputed for every slot: O(d^2) work\n    out = []\n    for x in v:\n        length = math.sqrt(sum(y * y for y in v))\n        out.append(x / length if length else 0.0)\n    return out\n"
},
"cosine": {
"code": "import math\n\ndef cosine_similarity(a, b):\n    # dot product: multiply matching slots, then add\n    dot = sum(x * y for x, y in zip(a, b))\n    # lengths of both arrows\n    na = math.sqrt(sum(x * x for x in a))\n    nb = math.sqrt(sum(y * y for y in b))\n    # a zero vector has no direction: define the similarity as 0\n    if na == 0 or nb == 0:\n        return 0.0\n    return dot / (na * nb)\n",
"brute": "import math\n\ndef cosine_similarity(a, b):\n    # Measure the angle with atan2 for each vector (only works in 2-D!)\n    if not any(a) or not any(b):\n        return 0.0\n    angle = math.atan2(b[1], b[0]) - math.atan2(a[1], a[0])\n    return math.cos(angle)\n"
},
"transform": {
"code": "def apply_transform(M, points):\n    # M is 2x2: [[a, b], [c, d]]. Each point is [x, y].\n    # New point = x * (first column) + y * (second column)\n    #           = [a*x + b*y, c*x + d*y]\n    out = []\n    for x, y in points:\n        out.append([M[0][0] * x + M[0][1] * y,\n                    M[1][0] * x + M[1][1] * y])\n    return out\n",
"brute": null
},
"matmul": {
"code": "def matmul(A, B):\n    # Shapes: A is n x k, B must be k x m. The inner sizes must match.\n    n, k = len(A), len(A[0])\n    if len(B) != k:\n        return []                     # shape mismatch: (n x k) . (k2 x m) with k != k2\n    m = len(B[0])\n    C = [[0.0] * m for _ in range(n)]  # result is n x m\n    for i in range(n):                 # each row of A\n        for j in range(m):             # each column of B\n            s = 0.0\n            for t in range(k):         # dot product of row i and column j\n                s += A[i][t] * B[t][j]\n            C[i][j] = s\n    return C\n",
"brute": "def matmul(A, B):\n    # Builds every column of B as a fresh list for every single cell: same answer, extra copying\n    if len(B) != len(A[0]):\n        return []\n    C = []\n    for row in A:\n        out = []\n        for j in range(len(B[0])):\n            col = [B[t][j] for t in range(len(B))]\n            out.append(sum(r * c for r, c in zip(row, col)))\n        C.append(out)\n    return C\n"
},
"inverse2": {
"code": "def inverse_2x2(M):\n    (a, b), (c, d) = M\n    det = a * d - b * c          # how much the matrix scales area\n    if abs(det) < 1e-12:\n        return []                # area squashed to zero: no way back (singular)\n    # swap the diagonal, negate the off-diagonal, divide everything by det\n    return [[d / det, -b / det],\n            [-c / det, a / det]]\n",
"brute": "def inverse_2x2(M):\n    # Solve M x = e1 and M x = e2 separately by trying to eliminate by hand\n    (a, b), (c, d) = M\n    det = a * d - b * c\n    if det == 0:\n        return []\n    col1 = [d / det, -c / det]   # solution of M x = [1, 0]\n    col2 = [-b / det, a / det]   # solution of M x = [0, 1]\n    return [[col1[0], col2[0]], [col1[1], col2[1]]]\n"
},
"solve": {
"code": "def solve_linear_system(A, b):\n    n = len(A)\n    # Build the augmented matrix [A | b] (copy, so we do not change the caller's lists)\n    M = [list(map(float, A[i])) + [float(b[i])] for i in range(n)]\n    # Forward elimination: make zeros below each pivot\n    for col in range(n):\n        # Partial pivoting: pick the row with the biggest number in this column\n        best = max(range(col, n), key=lambda r: abs(M[r][col]))\n        if abs(M[best][col]) < 1e-12:\n            return []                       # no usable pivot: no unique solution\n        M[col], M[best] = M[best], M[col]   # swap it to the top\n        for r in range(col + 1, n):\n            factor = M[r][col] / M[col][col]\n            for c in range(col, n + 1):\n                M[r][c] -= factor * M[col][c]\n    # Back substitution: solve from the last row upwards\n    x = [0.0] * n\n    for i in range(n - 1, -1, -1):\n        s = M[i][n] - sum(M[i][j] * x[j] for j in range(i + 1, n))\n        x[i] = s / M[i][i]\n    return x\n",
"brute": "from itertools import product\n\ndef solve_linear_system(A, b):\n    # Try every integer guess from -10..10 for each unknown. Only finds whole-number answers,\n    # and costs 21^n checks. Shown to explain why elimination is needed.\n    n = len(A)\n    for guess in product(range(-10, 11), repeat=n):\n        if all(abs(sum(A[i][j] * guess[j] for j in range(n)) - b[i]) < 1e-9 for i in range(n)):\n            return [float(g) for g in guess]\n    return []\n"
},
"power": {
"code": "import math\n\ndef power_iteration(M, iters):\n    n = len(M)\n    v = [1.0] * n                          # start with any non-zero guess\n    for _ in range(iters):\n        w = [sum(M[i][j] * v[j] for j in range(n)) for i in range(n)]   # w = M v\n        length = math.sqrt(sum(x * x for x in w))\n        if length == 0:\n            return 0.0                     # M sent our guess to zero\n        v = [x / length for x in w]        # rescale to length 1 so numbers stay small\n    # Rayleigh quotient: lambda = (v . M v) / (v . v); v has length 1, so just v . M v\n    Mv = [sum(M[i][j] * v[j] for j in range(n)) for i in range(n)]\n    return sum(v[i] * Mv[i] for i in range(n))\n",
"brute": "import math\n\ndef power_iteration(M, iters):\n    # 2x2 only: solve the characteristic equation lambda^2 - trace*lambda + det = 0\n    (a, b), (c, d) = M\n    tr, det = a + d, a * d - b * c\n    disc = math.sqrt(max(tr * tr - 4 * det, 0))\n    return max((tr + disc) / 2, (tr - disc) / 2, key=abs)\n"
},
"explained": {
"code": "def explained_variance(eigenvalues, k):\n    # Each eigenvalue of the covariance matrix = variance along one principal direction.\n    total = sum(eigenvalues)\n    if total == 0:\n        return 0.0\n    top = sorted(eigenvalues, reverse=True)[:k]   # keep the k biggest directions\n    return sum(top) / total                        # fraction of the spread we keep\n",
"brute": null
},
"nearest": {
"code": "import math\n\ndef nearest_neighbours(query, embeddings, k):\n    def cos(a, b):\n        dot = sum(x * y for x, y in zip(a, b))\n        na = math.sqrt(sum(x * x for x in a))\n        nb = math.sqrt(sum(x * x for x in b))\n        return 0.0 if na == 0 or nb == 0 else dot / (na * nb)\n    # score every stored vector against the query (a \"flat\" exact search)\n    scored = [(cos(query, e), i) for i, e in enumerate(embeddings)]\n    # highest cosine first; on a tie the smaller index wins (round to dodge float noise)\n    scored.sort(key=lambda t: (-round(t[0], 9), t[1]))\n    return [i for _, i in scored[:k]]\n",
"brute": "import math\n\ndef nearest_neighbours(query, embeddings, k):\n    # Pick the best one, remove it, repeat k times: O(k * N * d)\n    def cos(a, b):\n        dot = sum(x * y for x, y in zip(a, b))\n        na = math.sqrt(sum(x * x for x in a)); nb = math.sqrt(sum(x * x for x in b))\n        return 0.0 if na == 0 or nb == 0 else dot / (na * nb)\n    left, out = list(range(len(embeddings))), []\n    for _ in range(min(k, len(left))):\n        best = max(left, key=lambda i: (round(cos(query, embeddings[i]), 9), -i))\n        out.append(best); left.remove(best)\n    return out\n"
},
"distance": {
"code": "import math\n\ndef euclidean_distance(a, b):\n    # subtract slot by slot, square, add, square root (Pythagoras in d dimensions)\n    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))\n",
"brute": null
},
"transpose": {
"code": "def transpose(M):\n    rows, cols = len(M), len(M[0])\n    # entry (i, j) moves to (j, i): rows become columns\n    return [[M[i][j] for i in range(rows)] for j in range(cols)]\n",
"brute": null
},
"matvec": {
"code": "def mat_vec(M, v):\n    # each output slot = (row of M) . v\n    if any(len(row) != len(v) for row in M):\n        return []                     # columns of M must equal the length of v\n    return [sum(m * x for m, x in zip(row, v)) for row in M]\n",
"brute": null
},
"det2": {
"code": "def det_2x2(M):\n    (a, b), (c, d) = M\n    # signed area of the parallelogram made by the two columns\n    return a * d - b * c\n",
"brute": null
},
"project": {
"code": "def project_onto_line(p, d):\n    # Line through the origin in direction d. Shadow of p on it:\n    #   proj = (p . d) / (d . d) * d\n    dd = sum(x * x for x in d)\n    if dd == 0:\n        return [0.0 for _ in p]          # no direction: define the projection as the origin\n    t = sum(x * y for x, y in zip(p, d)) / dd   # how many \"d steps\" along the line\n    return [t * x for x in d]\n",
"brute": "def project_onto_line(p, d):\n    # Walk along the line in tiny steps and keep the closest point: slow and only approximate\n    best, best_dist = None, float(\"inf\")\n    for i in range(-20000, 20001):\n        t = i / 1000\n        q = [t * x for x in d]\n        dist = sum((a - b) ** 2 for a, b in zip(p, q))\n        if dist < best_dist:\n            best, best_dist = q, dist\n    return best\n"
},
"cosmatrix": {
"code": "import math\n\ndef cosine_matrix(vectors):\n    # Normalise every vector once, then every pair is just a dot product: U . U^T\n    units = []\n    for v in vectors:\n        n = math.sqrt(sum(x * x for x in v))\n        units.append([x / n for x in v] if n else [0.0] * len(v))\n    size = len(units)\n    S = [[0.0] * size for _ in range(size)]\n    for i in range(size):\n        for j in range(i, size):            # symmetric: compute the upper half, mirror it\n            s = sum(a * b for a, b in zip(units[i], units[j]))\n            S[i][j] = S[j][i] = s\n    return S\n",
"brute": null
},
"compose": {
"code": "def compose_transforms(steps):\n    # steps[0] is applied first, then steps[1], ...  so the total is\n    #   T = steps[-1] . ... . steps[1] . steps[0]   (right-most acts first)\n    def mul(A, B):\n        return [[sum(A[i][t] * B[t][j] for t in range(len(B))) for j in range(len(B[0]))]\n                for i in range(len(A))]\n    n = len(steps[0])\n    T = [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]   # identity: \"do nothing\"\n    for S in steps:\n        T = mul(S, T)          # new step goes on the LEFT\n    return T\n",
"brute": null
},
"solve2": {
"code": "def solve_2x2(A, b):\n    # x = A^-1 b, using the 2x2 inverse formula (equivalent to Cramer's rule)\n    (p, q), (r, s) = A\n    det = p * s - q * r\n    if abs(det) < 1e-12:\n        return []                      # parallel lines: no single crossing point\n    x = (s * b[0] - q * b[1]) / det\n    y = (-r * b[0] + p * b[1]) / det\n    return [x, y]\n",
"brute": null
},
"kcomp": {
"code": "def components_for_variance(eigenvalues, threshold):\n    total = sum(eigenvalues)\n    if total == 0:\n        return 0\n    kept, k = 0.0, 0\n    for lam in sorted(eigenvalues, reverse=True):   # biggest spread first\n        if kept / total >= threshold - 1e-12:       # already enough (tolerance for float noise)\n            break\n        kept += lam\n        k += 1\n    return k\n",
"brute": null
},
"search": {
"code": "import math\n\ndef semantic_search(query, docs, threshold):\n    def unit(v):\n        n = math.sqrt(sum(x * x for x in v))\n        return [x / n for x in v] if n else [0.0] * len(v)\n    q = unit(query)\n    hits = []\n    for i, d in enumerate(docs):\n        s = sum(a * b for a, b in zip(q, unit(d)))   # cosine = dot of unit vectors\n        if s >= threshold - 1e-9:\n            hits.append((round(s, 9), i))\n    hits.sort(key=lambda t: (-t[0], t[1]))           # best first, ties by index\n    return [i for _, i in hits]\n",
"brute": null
},
"rank": {
"code": "def matrix_rank(M):\n    A = [list(map(float, row)) for row in M]   # work on a copy\n    rows, cols = len(A), len(A[0])\n    rank, r = 0, 0\n    for c in range(cols):\n        if r == rows:\n            break\n        # pick the biggest pivot in this column at or below row r\n        p = max(range(r, rows), key=lambda i: abs(A[i][c]))\n        if abs(A[p][c]) < 1e-9:\n            continue                 # nothing to eliminate with in this column\n        A[r], A[p] = A[p], A[r]\n        for i in range(r + 1, rows):\n            f = A[i][c] / A[r][c]\n            for j in range(c, cols):\n                A[i][j] -= f * A[r][j]\n        r += 1\n        rank += 1                    # every pivot = one independent direction\n    return rank\n",
"brute": null
},
"pca": {
"code": "import math\n\ndef pca_top_ratio(points):\n    n, d = len(points), len(points[0])\n    # 1) centre the data: subtract the mean of every column\n    mean = [sum(p[j] for p in points) / n for j in range(d)]\n    X = [[p[j] - mean[j] for j in range(d)] for p in points]\n    # 2) covariance matrix C = X^T X / (n - 1)   (d x d, symmetric)\n    C = [[sum(X[i][a] * X[i][b] for i in range(n)) / (n - 1) for b in range(d)] for a in range(d)]\n    total = sum(C[j][j] for j in range(d))      # trace = total variance = sum of eigenvalues\n    if total == 0:\n        return 0.0\n    # 3) power iteration for the top eigenvalue (start vector not all-equal on purpose)\n    v = [1.0 + 0.1 * j for j in range(d)]\n    for _ in range(500):\n        w = [sum(C[a][b] * v[b] for b in range(d)) for a in range(d)]\n        length = math.sqrt(sum(x * x for x in w))\n        if length == 0:\n            return 0.0\n        v = [x / length for x in w]\n    lam = sum(v[a] * sum(C[a][b] * v[b] for b in range(d)) for a in range(d))\n    # 4) explained variance ratio of the first principal component\n    return lam / total\n",
"brute": null
},
"attention": {
"code": "import math\n\ndef attention_output(q, K, V):\n    d = len(q)\n    # 1) score every key: dot product, scaled by sqrt(d) so softmax does not saturate\n    scores = [sum(a * b for a, b in zip(q, k)) / math.sqrt(d) for k in K]\n    # 2) softmax: subtract the max first (numerically safe), exponentiate, normalise\n    m = max(scores)\n    ex = [math.exp(s - m) for s in scores]\n    total = sum(ex)\n    weights = [e / total for e in ex]\n    # 3) weighted average of the value vectors (a 1 x n row times an n x d_v matrix)\n    dv = len(V[0])\n    return [sum(weights[i] * V[i][j] for i in range(len(V))) for j in range(dv)]\n",
"brute": null
},
"inverse": {
"code": "def inverse(M):\n    n = len(M)\n    # Gauss-Jordan: write [M | I] and row-reduce the left half into I; the right half becomes M^-1\n    A = [list(map(float, M[i])) + [1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]\n    for col in range(n):\n        p = max(range(col, n), key=lambda r: abs(A[r][col]))   # partial pivoting\n        if abs(A[p][col]) < 1e-12:\n            return []                                           # singular: no inverse\n        A[col], A[p] = A[p], A[col]\n        piv = A[col][col]\n        A[col] = [x / piv for x in A[col]]                      # make the pivot exactly 1\n        for r in range(n):\n            if r != col and A[r][col] != 0:\n                f = A[r][col]\n                A[r] = [x - f * y for x, y in zip(A[r], A[col])]  # zero out above AND below\n    return [row[n:] for row in A]\n",
"brute": null
}
};
  var TESTS = {"normalize": {"sig": "double[] -> double[]", "fn": "normalize", "cmp": "float", "cases": [[[[3, 4]], [0.6, 0.8]], [[[0, 5]], [0, 1]], [[[0, 0]], [0, 0]], [[[1, 2, 2]], [0.3333333333, 0.6666666667, 0.6666666667]], [[[-6, 8]], [-0.6, 0.8]], [[[2]], [1]], [[[1, 1, 1, 1]], [0.5, 0.5, 0.5, 0.5]]]}, "cosine": {"sig": "double[] double[] -> double", "fn": "cosine_similarity", "cmp": "float", "cases": [[[[1, 0], [0, 1]], 0], [[[1, 2], [2, 4]], 1], [[[1, 2], [-1, -2]], -1], [[[2, 1, 3], [4, 0, 5]], 0.9600014518], [[[1, 2, 2], [2, 1, 2]], 0.8888888889], [[[0, 0], [3, 4]], 0], [[[3, 4], [4, 3]], 0.96]]}, "transform": {"sig": "double[][] double[][] -> double[][]", "fn": "apply_transform", "cmp": "float", "cases": [[[[[0, -1], [1, 0]], [[1, 0], [0, 1], [2, 1]]], [[0, 1], [-1, 0], [-1, 2]]], [[[[2, 0], [0, 2]], [[1, 1], [-3, 2]]], [[2, 2], [-6, 4]]], [[[[1, 0], [0, 1]], [[5, -7]]], [[5, -7]]], [[[[1, 1], [0, 1]], [[0, 1], [1, 1]]], [[1, 1], [2, 1]]], [[[[1, 0], [0, -1]], [[3, 4]]], [[3, -4]]], [[[[0, 0], [0, 0]], [[1, 2], [3, 4]]], [[0, 0], [0, 0]]], [[[[2, 0], [0, 3]], []], []]]}, "matmul": {"sig": "double[][] double[][] -> double[][]", "fn": "matmul", "cmp": "float", "cases": [[[[[1, 2], [3, 4]], [[5, 6], [7, 8]]], [[19, 22], [43, 50]]], [[[[1, 2, 3], [4, 5, 6]], [[7, 8], [9, 10], [11, 12]]], [[58, 64], [139, 154]]], [[[[1, 2, 3]], [[4], [5], [6]]], [[32]]], [[[[4], [5], [6]], [[1, 2, 3]]], [[4, 8, 12], [5, 10, 15], [6, 12, 18]]], [[[[1, 2], [3, 4]], [[1, 2, 3]]], []], [[[[1, 0], [0, 1]], [[9, -2], [0.5, 3]]], [[9, -2], [0.5, 3]]], [[[[0, 1], [1, 0]], [[1, 2], [3, 4]]], [[3, 4], [1, 2]]]]}, "inverse2": {"sig": "double[][] -> double[][]", "fn": "inverse_2x2", "cmp": "float", "cases": [[[[[2, 1], [1, 1]]], [[1, -1], [-1, 2]]], [[[[4, 7], [2, 6]]], [[0.6, -0.7], [-0.2, 0.4]]], [[[[1, 0], [0, 1]]], [[1, 0], [0, 1]]], [[[[1, 2], [2, 4]]], []], [[[[0, -1], [1, 0]]], [[0, 1], [-1, 0]]], [[[[2, 0], [0, 4]]], [[0.5, 0], [0, 0.25]]], [[[[0, 0], [0, 0]]], []]]}, "solve": {"sig": "double[][] double[] -> double[]", "fn": "solve_linear_system", "cmp": "float", "cases": [[[[[2, 1, -1], [-3, -1, 2], [-2, 1, 2]], [8, -11, -3]], [2, 3, -1]], [[[[1, 1], [1, -1]], [10, 2]], [6, 4]], [[[[2, 3], [4, 6]], [5, 10]], []], [[[[0, 1], [1, 0]], [3, 7]], [7, 3]], [[[[1, 2, 3], [0, 1, 4], [5, 6, 0]], [14, 14, 17]], [1, 2, 3]], [[[[4]], [10]], [2.5]], [[[[1, 1, 1], [1, 2, 3], [1, 3, 6]], [3, 6, 10]], [1, 1, 1]]]}, "power": {"sig": "double[][] int -> double", "fn": "power_iteration", "cmp": "float", "cases": [[[[[2, 1], [1, 2]], 100], 3], [[[[2, 0], [0, 1]], 100], 2], [[[[4, 1], [2, 3]], 100], 5], [[[[3, 0, 0], [0, 1, 0], [0, 0, 2]], 200], 3], [[[[1, 2], [2, 1]], 100], 3], [[[[5]], 10], 5], [[[[2, 1, 0], [1, 2, 1], [0, 1, 2]], 200], 3.4142135624]]}, "explained": {"sig": "double[] int -> double", "fn": "explained_variance", "cmp": "float", "cases": [[[[4, 1], 1], 0.8], [[[5, 3, 1.5, 0.5], 2], 0.8], [[[0.5, 5, 1.5, 3], 2], 0.8], [[[2, 2, 2, 2], 3], 0.75], [[[9, 1], 2], 1], [[[0, 0], 1], 0], [[[10, 6, 3, 1], 0], 0]]}, "nearest": {"sig": "double[] double[][] int -> int[]", "fn": "nearest_neighbours", "cmp": "exact", "cases": [[[[1, 0], [[0, 1], [1, 0.1], [-1, 0], [0.7, 0.7]], 2], [1, 3]], [[[1, 1], [[2, 2], [1, 0], [0, 1], [-1, -1]], 3], [0, 1, 2]], [[[0.9, 0.1, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0.8, 0.2, 0.1]], 1], [0]], [[[1, 0], [[3, 0], [1, 0], [5, 0]], 2], [0, 1]], [[[0, 1], [[1, 0]], 5], [0]], [[[1, 2], [[2, 4], [-1, -2], [2, 1], [1, 2.1]], 4], [0, 3, 2, 1]], [[[1, 0], [[1, 0], [0, 1]], 0], []]]}, "distance": {"sig": "double[] double[] -> double", "fn": "euclidean_distance", "cmp": "float", "cases": [[[[0, 0], [3, 4]], 5], [[[1, 1], [1, 1]], 0], [[[1, 2, 3], [4, 6, 3]], 5], [[[-1, -1], [2, 3]], 5], [[[0], [7]], 7], [[[1, 0, 0], [0, 1, 0]], 1.4142135624]]}, "transpose": {"sig": "double[][] -> double[][]", "fn": "transpose", "cmp": "float", "cases": [[[[[1, 2, 3], [4, 5, 6]]], [[1, 4], [2, 5], [3, 6]]], [[[[1, 2], [3, 4]]], [[1, 3], [2, 4]]], [[[[7]]], [[7]]], [[[[1, 2, 3]]], [[1], [2], [3]]], [[[[1], [2], [3]]], [[1, 2, 3]]], [[[[1, 2], [2, 5]]], [[1, 2], [2, 5]]]]}, "matvec": {"sig": "double[][] double[] -> double[]", "fn": "mat_vec", "cmp": "float", "cases": [[[[[1, 2], [3, 4]], [1, 1]], [3, 7]], [[[[2, 0], [0, 3]], [4, 5]], [8, 15]], [[[[1, 0, 2], [0, 1, -1]], [3, 4, 5]], [13, -1]], [[[[1, 2, 3]], [1, 0, -1]], [-2]], [[[[1, 2], [3, 4]], [1, 2, 3]], []], [[[[0, -1], [1, 0]], [2, 1]], [-1, 2]]]}, "det2": {"sig": "double[][] -> double", "fn": "det_2x2", "cmp": "float", "cases": [[[[[2, 0], [0, 3]]], 6], [[[[1, 2], [2, 4]]], 0], [[[[0, -1], [1, 0]]], 1], [[[[0, 1], [1, 0]]], -1], [[[[3, 1], [2, 4]]], 10], [[[[1, 1], [0, 1]]], 1]]}, "project": {"sig": "double[] double[] -> double[]", "fn": "project_onto_line", "cmp": "float", "cases": [[[[2, 3], [1, 0]], [2, 0]], [[[1, 3], [1, 1]], [2, 2]], [[[3, 4], [2, 0]], [3, 0]], [[[0, 5], [1, 0]], [0, 0]], [[[1, 2, 3], [0, 0, 2]], [0, 0, 3]], [[[4, 2], [0, 0]], [0, 0]], [[[-2, 1], [2, 1]], [-1.2, -0.6]]]}, "cosmatrix": {"sig": "double[][] -> double[][]", "fn": "cosine_matrix", "cmp": "float", "cases": [[[[[1, 0], [0, 1]]], [[1, 0], [0, 1]]], [[[[1, 0], [1, 1], [0, 2]]], [[1, 0.7071067812, 0], [0.7071067812, 1, 0.7071067812], [0, 0.7071067812, 1]]], [[[[3, 4]]], [[1]]], [[[[1, 2], [-1, -2]]], [[1, -1], [-1, 1]]], [[[[0, 0], [1, 0]]], [[0, 0], [0, 1]]], [[[[1, 2, 2], [2, 1, 2]]], [[1, 0.8888888889], [0.8888888889, 1]]]]}, "compose": {"sig": "double[][][] -> double[][]", "fn": "compose_transforms", "cmp": "float", "cases": [[[[[[0, -1], [1, 0]], [[0, -1], [1, 0]]]], [[-1, 0], [0, -1]]], [[[[[2, 0], [0, 1]], [[0, -1], [1, 0]]]], [[0, -1], [2, 0]]], [[[[[0, -1], [1, 0]], [[2, 0], [0, 1]]]], [[0, -2], [1, 0]]], [[[[[1, 2], [3, 4]]]], [[1, 2], [3, 4]]], [[[[[1, 1], [0, 1]], [[1, 1], [0, 1]], [[1, 1], [0, 1]]]], [[1, 3], [0, 1]]], [[[[[2, 0], [0, 2]], [[0.5, 0], [0, 0.5]]]], [[1, 0], [0, 1]]]]}, "solve2": {"sig": "double[][] double[] -> double[]", "fn": "solve_2x2", "cmp": "float", "cases": [[[[[2, 1], [1, 1]], [5, 3]], [2, 1]], [[[[1, 1], [1, -1]], [10, 2]], [6, 4]], [[[[1, 2], [2, 4]], [3, 6]], []], [[[[3, 0], [0, 4]], [6, 2]], [2, 0.5]], [[[[1, 2], [3, 4]], [5, 6]], [-4, 4.5]], [[[[0, 1], [1, 0]], [7, 9]], [9, 7]]]}, "kcomp": {"sig": "double[] double -> int", "fn": "components_for_variance", "cmp": "exact", "cases": [[[[5, 3, 1.5, 0.5], 0.8], 2], [[[5, 3, 1.5, 0.5], 0.9], 3], [[[5, 3, 1.5, 0.5], 0.95], 3], [[[5, 3, 1.5, 0.5], 1], 4], [[[1, 1, 1, 1], 0.5], 2], [[[10, 0, 0], 0.99], 1], [[[2, 8], 0], 0]]}, "search": {"sig": "double[] double[][] double -> int[]", "fn": "semantic_search", "cmp": "exact", "cases": [[[[1, 0], [[1, 0], [0, 1], [1, 1], [-1, 0]], 0.7], [0, 2]], [[[1, 0], [[1, 0], [0, 1], [1, 1], [-1, 0]], 0], [0, 2, 1]], [[[1, 0], [[1, 0], [0, 1], [1, 1], [-1, 0]], -1], [0, 2, 1, 3]], [[[0, 1], [[1, 0]], 0.5], []], [[[3, 4], [[6, 8], [4, 3]], 0.9], [0, 1]], [[[1, 1, 0], [[1, 1, 0], [2, 2, 0], [0, 0, 1]], 0.99], [0, 1]]]}, "rank": {"sig": "double[][] -> int", "fn": "matrix_rank", "cmp": "exact", "cases": [[[[[1, 2], [2, 4]]], 1], [[[[1, 0], [0, 1]]], 2], [[[[0, 0], [0, 0]]], 0], [[[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], 2], [[[[1, 2, 3], [2, 4, 6]]], 1], [[[[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1]]], 3], [[[[2, 1, -1], [-3, -1, 2], [-2, 1, 2]]], 3]]}, "pca": {"sig": "double[][] -> double", "fn": "pca_top_ratio", "cmp": "float", "cases": [[[[[1, 1], [2, 2], [3, 3]]], 1], [[[[0, 0], [2, 0], [0, 1], [2, 1]]], 0.8], [[[[1, 0], [-1, 0], [0, 1], [0, -1]]], 0.5], [[[[2, 1], [3, 2], [4, 3], [5, 5], [6, 5]]], 0.9863479395], [[[[0, 0, 0], [3, 0, 0], [0, 1, 0], [3, 1, 0]]], 0.9], [[[[1, 2], [1, 2]]], 0], [[[[0, 0], [4, 0], [0, 2], [4, 2], [2, 1]]], 0.8]]}, "attention": {"sig": "double[] double[][] double[][] -> double[]", "fn": "attention_output", "cmp": "float", "cases": [[[[0, 0], [[1, 0], [0, 1]], [[10, 0], [0, 10]]], [5, 5]], [[[1, 0], [[1, 0], [1, 0]], [[2, 4], [4, 8]]], [3, 6]], [[[100, 0], [[1, 0], [0, 1]], [[1, 2], [3, 4]]], [1, 2]], [[[1, 1], [[1, 1]], [[7, -3, 2]]], [7, -3, 2]], [[[1.5536723984, 0], [[1, 0], [0, 0]], [[1, 0], [0, 1]]], [0.75, 0.25]], [[[2, 0, 0, 0], [[1, 0, 0, 0], [0, 0, 0, 0], [-1, 0, 0, 0]], [[1], [0], [-1]]], [0.5752103826]]]}, "inverse": {"sig": "double[][] -> double[][]", "fn": "inverse", "cmp": "float", "cases": [[[[[2, 1], [1, 1]]], [[1, -1], [-1, 2]]], [[[[1, 2, 3], [0, 1, 4], [5, 6, 0]]], [[-24, 18, 5], [20, -15, -4], [-5, 4, 1]]], [[[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], []], [[[[2, 0, 0], [0, 4, 0], [0, 0, 0.5]]], [[0.5, 0, 0], [0, 0.25, 0], [0, 0, 2]]], [[[[0, 1], [1, 0]]], [[0, 1], [1, 0]]], [[[[4]]], [[0.25]]], [[[[1, 1, 1], [1, 2, 3], [1, 3, 6]]], [[3, -3, 1], [-3, 5, -2], [1, -2, 1]]]]}};

  // ===================== TOPIC 1: VECTORS =====================
  topics.push({
    title: 'Vectors: Arrows, Lists, Adding, Scaling and Length',
    analogy: `<p>Think of directions to a friend's house: "walk <b>3 blocks east</b>, then <b>1 block north</b>". That pair <code>[3, 1]</code> is a <b>vector</b>. You can draw it as an arrow on a map, or write it as a list of numbers. Both are the same thing. Doing two trips one after the other is <b>adding</b> vectors. Doing the same trip twice as far is <b>scaling</b>. How far you are from home as the crow flies is the <b>length</b>.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> A <b>vector</b> is an ordered list of numbers. Each slot is one measurement. The number of slots is the <b>dimension</b>. A 2-D vector fits on paper, so we can draw it as an arrow from the origin <code>O = (0, 0)</code> to the point it names.</p>
      ${H.arr([3, 1], { label: 'a = [3, 1]  →  3 right, 1 up' })}
      ${H.arr([1, 2], { label: 'b = [1, 2]  →  1 right, 2 up' })}
      <p>In machine learning a vector usually describes <i>a thing</i>: a house as <code>[bedrooms, size, age]</code>, a song as <code>[energy, mood, tempo]</code>, a word as 768 numbers. We cannot draw 768 dimensions, but every rule below works the same in any dimension. We learn it in 2-D because we can <i>see</i> it.</p>
      <h4>1. Adding vectors: slot by slot</h4>
      <p><code>a + b = [3 + 1, 1 + 2] = [4, 3]</code>. Picture: walk along <code>a</code>, then from its tip walk along <code>b</code> ("tip to tail"). You end at <code>[4, 3]</code>.</p>
      ${H.table(['slot', 'a', 'b', 'a + b'], [['x', '3', '1', '<span class="c-g">4</span>'], ['y', '1', '2', '<span class="c-g">3</span>']])}
      <h4>2. Scaling a vector: multiply every slot</h4>
      <p>A plain number is called a <b>scalar</b> because it <i>scales</i>. <code>2 × a = [6, 2]</code>: same direction, twice as long. <code>−1 × a = [−3, −1]</code>: same length, flipped round. <code>0.5 × a = [1.5, 0.5]</code>: half as long.</p>
      <h4>3. Length (the norm): Pythagoras</h4>
      <p>The arrow <code>[3, 4]</code> is the long side of a right triangle with sides 3 and 4. So its length is <code>√(3² + 4²) = √25 = 5</code>. In any dimension: square each slot, add, take the square root. We write it <code>‖a‖</code>.</p>
      ${H.table(['vector', 'squares', 'sum', 'length ‖v‖'], [['[3, 4]', '9, 16', '25', '5'], ['[3, 1]', '9, 1', '10', '√10 ≈ 3.162'], ['[1, 2, 2]', '1, 4, 4', '9', '3']])}
      <h4>4. Unit vectors: length exactly 1</h4>
      <p>Divide every slot by the length: <code>[3, 4] / 5 = [0.6, 0.8]</code>. Now the length is 1 but the direction is unchanged. This is called <b>normalising</b>. A unit vector is "pure direction". Embedding databases normalise every vector so that comparing directions is cheap (next topic).</p>
      <h4>5. Distance between two points</h4>
      <p>Subtract, then take the length: distance from <code>[1, 1]</code> to <code>[4, 5]</code> is <code>‖[3, 4]‖ = 5</code>. This is the <b>Euclidean distance</b> used by k-nearest-neighbours and by many vector indexes.</p>`,
    clues: [
      '"represent each item as a list of numbers / feature vector" → vectors, one slot per feature',
      '"how far apart are two points" → Euclidean distance = length of the difference',
      '"normalise to unit length", "L2-normalise the embeddings" → divide by the norm',
      '"magnitude", "‖x‖", "L2 norm" → square, add, square root',
      '"d = 384 / 768 / 1536 dimensions" → still just a list; every operation is a loop over d slots, O(d)',
      '"average of several vectors" (a centroid) → add them slot by slot, then scale by 1/n'
    ],
    code: [
      { lang: 'python', title: 'Vectors with plain Python lists (runnable)', run: true, code: `import math

def add(a, b):
    # slot-by-slot sum: walk along a, then along b
    return [x + y for x, y in zip(a, b)]

def scale(k, a):
    # multiply every slot by the scalar k
    return [k * x for x in a]

def norm(a):
    # length of the arrow (Pythagoras in any dimension)
    return math.sqrt(sum(x * x for x in a))

def unit(a):
    n = norm(a)
    return [x / n for x in a] if n else a   # a zero vector has no direction

a, b = [3, 1], [1, 2]
print("a + b       =", add(a, b))                # [4, 3]
print("2 * a       =", scale(2, a))              # [6, 2]
print("-1 * a      =", scale(-1, a))             # [-3, -1]
print("|[3, 4]|    =", norm([3, 4]))             # 5.0
print("unit([3,4]) =", unit([3, 4]))             # [0.6, 0.8]
print("length check:", round(norm(unit([3, 4])), 6))   # 1.0

# distance between two points = length of their difference
p, q = [1, 1], [4, 5]
print("distance p-q =", norm(add(q, scale(-1, p))))   # 5.0

# centroid (average) of three "song" vectors [energy, mood]
songs = [[8, 2], [6, 4], [7, 3]]
total = [0, 0]
for s in songs:
    total = add(total, s)
print("centroid     =", scale(1 / len(songs), total))   # [7.0, 3.0]
` },
      { lang: 'python', title: 'The same with NumPy (shown, not run here)', code: `import numpy as np

a = np.array([3.0, 1.0])
b = np.array([1.0, 2.0])
print(a + b)                  # [4. 3.]   element-wise add
print(2 * a)                  # [6. 2.]   scaling
print(np.linalg.norm([3, 4])) # 5.0       length
v = np.array([3.0, 4.0])
print(v / np.linalg.norm(v))  # [0.6 0.8] unit vector
songs = np.array([[8, 2], [6, 4], [7, 3]])
print(songs.mean(axis=0))     # [7. 3.]   centroid: average down the rows
` }
    ],
    codeTitle: ['Pure Python', 'NumPy version'],
    viz: {
      title: 'Adding, scaling and measuring 2-D vectors',
      input: '3 1 | 1 2 | 2',
      inputLabel: 'a | b | k  (two 2-D vectors and a scale factor)',
      gen: function (input) {
        var p = splitBar(input, 3, '3 1 | 1 2 | 2');
        var a = parseVec(p[0], 'a'), b = parseVec(p[1], 'b'), k = Number(p[2]);
        if (a.length !== 2 || b.length !== 2) throw new Error('This picture needs 2-D vectors: two numbers each');
        if (isNaN(k) || Math.abs(k) > 5) throw new Error('k must be a number between -5 and 5');
        if ([a[0], a[1], b[0], b[1]].some(function (x) { return Math.abs(x) > 10; })) throw new Error('Keep entries between -10 and 10 so the picture fits');
        var s = [a[0] + b[0], a[1] + b[1]], ka = [k * a[0], k * a[1]], F = [];
        var lenA = normv(a), lenS = normv(s);
        var sc = Math.max(Math.abs(s[0]), Math.abs(s[1]), Math.abs(ka[0]), Math.abs(ka[1]), 1);
        F.push({ narr: 'Vector <b>a = ' + vs(a) + '</b> is an arrow from the origin O: ' + a[0] + ' steps along x, ' + a[1] + ' steps along y. The list and the arrow are the same thing.', parts: [
          plane('a drawn as an arrow', [{ id: 'a', name: 'a', x: a[0], y: a[1], cls: 'cur' }], { scale: sc }),
          { type: 'array', label: 'a as a list', values: a.slice(), idxLabels: ['x', 'y'] }] });
        F.push({ narr: 'Vector <b>b = ' + vs(b) + '</b> is another arrow. Each vector is a trip: how far to move in x and in y.', parts: [
          plane('a and b', [{ id: 'a', name: 'a', x: a[0], y: a[1] }, { id: 'b', name: 'b', x: b[0], y: b[1], cls: 'cur' }], { scale: sc }),
          { type: 'array', label: 'b as a list', values: b.slice(), idxLabels: ['x', 'y'] }] });
        F.push({ narr: '<b>Adding</b>: walk along a, then from a\'s tip walk along b ("tip to tail"). The green arrow from O to the end point is a + b.', parts: [
          plane('tip to tail: a, then b', [{ id: 'a', name: 'a', x: a[0], y: a[1], cls: 'cur' }, { id: 'ab', name: 'end', x: s[0], y: s[1], from: 'a', cls: 'cur', tag: '+' + vs(b) }], { scale: sc }),
          { type: 'table', label: 'slot by slot', columns: ['slot', 'a', 'b', 'a + b'], rows: [['x', a[0], b[0], r3(s[0])], ['y', a[1], b[1], r3(s[1])]], hl: { 0: 'cur', 1: 'cur' } }] });
        F.push({ narr: 'The sum is <b>a + b = ' + vs(s) + '</b>. Order does not matter: b then a lands on the same point.', parts: [
          plane('a + b', [{ id: 'a', name: 'a', x: a[0], y: a[1], cls: 'done' }, { id: 'b', name: 'b', x: b[0], y: b[1], cls: 'done' }, { id: 's', name: 'a+b', x: s[0], y: s[1], cls: 'ok' }], { scale: sc }),
          { type: 'vars', vals: { 'a + b': vs(s) }, hl: { 'a + b': 'ok' } }] });
        F.push({ narr: '<b>Scaling</b> by k = ' + k + ' multiplies every slot: k·a = ' + vs(ka) + '. ' + (k < 0 ? 'A negative k flips the arrow to point the other way.' : k === 0 ? 'k = 0 shrinks the arrow to nothing.' : Math.abs(k) < 1 ? 'k between 0 and 1 shrinks it.' : 'Same direction, ' + k + ' times as long.'), parts: [
          plane('a and k·a', [{ id: 'a', name: 'a', x: a[0], y: a[1], cls: 'done' }, { id: 'ka', name: 'k·a', x: ka[0], y: ka[1], cls: 'sel' }], { scale: sc }),
          { type: 'table', label: 'k × each slot', columns: ['slot', 'a', 'k', 'k·a'], rows: [['x', a[0], k, r3(ka[0])], ['y', a[1], k, r3(ka[1])]] }] });
        F.push({ narr: '<b>Length</b> of a by Pythagoras: √(' + a[0] + '² + ' + a[1] + '²) = √' + r3(a[0] * a[0] + a[1] * a[1]) + ' ≈ <b>' + r3(lenA) + '</b>. The arrow is the long side of a right triangle.', parts: [
          plane('a with its x-part and y-part', [{ id: 'ax', name: 'x', x: a[0], y: 0, cls: 'win', tag: a[0] + ' along x' }, { id: 'a', name: 'a', x: a[0], y: a[1], from: 'ax', cls: 'win', tag: a[1] + ' up' }, { id: 'h', name: '‖a‖', x: a[0], y: a[1], cls: 'ok', noArrow: true, tag: '' }], { scale: sc }),
          { type: 'vars', vals: { 'x²': r3(a[0] * a[0]), 'y²': r3(a[1] * a[1]), 'sum': r3(a[0] * a[0] + a[1] * a[1]), '‖a‖': r3(lenA) }, hl: { '‖a‖': 'ok' } }] });
        var u = lenA ? [a[0] / lenA, a[1] / lenA] : [0, 0];
        F.push({ narr: lenA ? '<b>Unit vector</b>: divide each slot by the length ' + r3(lenA) + '. û = ' + vs(u) + '. Same direction as a, but length exactly 1: pure direction.' : 'a is the zero vector, so it has no direction and cannot be normalised.', parts: [
          plane('a and its unit vector û', [{ id: 'a', name: 'a', x: a[0], y: a[1], cls: 'done' }, { id: 'u', name: 'û', x: u[0], y: u[1], cls: 'sel' }], { scale: sc }),
          { type: 'vars', vals: { 'û': vs(u), '‖û‖': r3(normv(u)) }, hl: { '‖û‖': 'sel' } }] });
        F.push({ narr: 'Summary: add = slot by slot, scale = multiply every slot, length = √(sum of squares), unit = divide by length. The same four rules work for a 768-number embedding.', parts: [
          { type: 'table', label: 'what we computed', columns: ['operation', 'result'], rows: [['a + b', vs(s)], [k + ' · a', vs(ka)], ['‖a‖', r3(lenA)], ['‖a + b‖', r3(lenS)], ['unit(a)', vs(u)]] }] });
        return F;
      }
    },
    examples: [
      { title: 'Adding two trips', html: `<p>Trip 1: <code>[2, 5]</code>. Trip 2: <code>[−4, 1]</code>. Total trip: <code>[2 + (−4), 5 + 1] = [−2, 6]</code>. You end 2 blocks west and 6 north of home. Adding is always slot by slot; you can only add vectors of the <b>same dimension</b>.</p>` },
      { title: 'Length in 3-D', html: `<p><code>v = [2, 3, 6]</code>. Squares: 4, 9, 36. Sum 49. Length <code>√49 = 7</code>. Unit vector: <code>[2/7, 3/7, 6/7] ≈ [0.286, 0.429, 0.857]</code>. Check: 0.082 + 0.184 + 0.735 ≈ 1.</p>`, code: { lang: 'python', run: true, code: `import math
v = [2, 3, 6]
length = math.sqrt(sum(x * x for x in v))
print("length:", length)                         # 7.0
u = [x / length for x in v]
print("unit:", [round(x, 3) for x in u])
print("unit length:", round(math.sqrt(sum(x * x for x in u)), 6))   # 1.0
` } },
      { title: 'A house as a vector, and why scale matters', html: `<p>House A = <code>[3 bedrooms, 120 m²]</code>, house B = <code>[4, 90]</code>. Distance = √(1² + 30²) ≈ 30.02. The size slot swamps the bedroom slot because its numbers are bigger. That is why ML pipelines <b>standardise features</b> (subtract the mean, divide by the spread) before measuring distances.</p>` },
      { title: 'Centroid of a cluster', html: `<p>Three user vectors <code>[1, 4]</code>, <code>[3, 2]</code>, <code>[2, 3]</code>. Sum <code>[6, 9]</code>. Scale by 1/3: centroid <code>[2, 3]</code>. k-means clustering repeats exactly this: assign points to the nearest centroid, then recompute each centroid as an average.</p>` }
    ],
    deepDive: `<p><b>🟣 What makes something a "vector space".</b> Mathematicians call any collection a vector space if you can add its members and scale them, and a few common-sense rules hold (order of adding does not matter, there is a zero vector, every vector has an opposite). Lists of numbers are the everyday example, but functions and polynomials obey the same rules, which is why the same tools reach so far.</p>
      <p><b>Other lengths (norms).</b> The Pythagoras length is the <b>L2 norm</b>. The <b>L1 norm</b> adds absolute values: ‖[3, −4]‖<sub>1</sub> = 7 ("taxicab" distance along city blocks). The <b>L∞ norm</b> is the largest absolute slot: 4. L2 is smooth and rotation-friendly, so it dominates in ML; L1 appears in Lasso regularisation because it pushes weights to exactly zero.</p>
      <p><b>Numerical care.</b> Squaring huge numbers can overflow, and squaring tiny ones can underflow to 0. Libraries such as <code>math.hypot</code> and <code>numpy.linalg.norm</code> rescale internally. Also never normalise a zero vector: dividing by 0 gives NaN, which then silently poisons every later similarity score. Production code checks for length 0 (or adds a tiny epsilon).</p>
      <p><b>High dimensions feel strange.</b> In 1,000 dimensions, random vectors are almost all nearly the same distance apart and almost at right angles to each other. This "curse of dimensionality" is why raw distances get less informative as d grows, and why learned embeddings (which pack meaning into a few useful directions) work much better than random features.</p>`,
    aiEra: `<p><b>🤖 Where you meet this in AI work.</b> Every embedding API returns a vector: a plain list of 384, 768, 1,024 or 3,072 floats. Before you store them in a vector database you usually <b>L2-normalise</b> them so that a dot product equals cosine similarity. A centroid of many embeddings is a cheap "topic vector" for a cluster of documents. A difference of two embeddings (for example "king − man") is a direction that sometimes carries meaning.</p>
      <p><b>Working with AI assistants.</b> When an assistant writes vector code, check three things: that vectors being added have the <b>same length</b> (Python's <code>zip</code> silently drops extra slots!), that normalisation guards against <b>zero length</b>, and that features on very different scales were <b>standardised</b>. Ask it to add <code>assert len(a) == len(b)</code> and a unit-length check in tests. These are the bugs that pass a quick glance but quietly ruin search quality.</p>`,
    problems: [
      PR('normalize', {
        title: 'Normalise a Vector to Unit Length', level: 'Easy', tags: ['vectors', 'norm'], companies: ['Pinecone', 'OpenAI'],
        statement: `<p>Write <code>normalize(v)</code> that returns a new list pointing the same way as <code>v</code> but with length exactly 1. If <code>v</code> is all zeros, return a list of zeros of the same size (a zero vector has no direction).</p>`,
        constraints: `<p>1 ≤ len(v) ≤ 4096. Entries are floats between −10<sup>6</sup> and 10<sup>6</sup>. Answers are compared with a small tolerance.</p>`,
        example: `<p>Input <code>[3, 4]</code> → output <code class="c-g">[0.6, 0.8]</code>. Why: the length is √(9 + 16) = 5, and 3/5 = 0.6, 4/5 = 0.8. Check: 0.36 + 0.64 = 1.</p>
          <p>Input <code>[0, 0]</code> → <code class="c-y">[0.0, 0.0]</code> (no direction to keep).</p>`,
        bruteWhy: `<p>The naive version recomputes the length inside the loop, once per slot. The answer is right, but for a 1,536-number embedding that is 1,536 × 1,536 ≈ 2.4 million multiplications instead of about 3,000. Compute the length once, then divide.</p>`,
        mcq: { q: `What is the length of <code>[0.6, 0.8]</code>?`, options: ['1.4', '1', '0.48', '0.2'], answer: 1, explain: `√(0.36 + 0.64) = √1 = 1. Adding the slots (1.4) is not the length; length uses squares and a square root.` },
        hints: [
          `Hint 1: Normalising means "divide by the length". So you need the length first, and only once.`,
          `Hint 2: Length = math.sqrt(sum of x*x over all slots). Then build a new list with x / length for each slot.`,
          `Hint 3: Edge case: if the length is 0, dividing would crash (ZeroDivisionError) or give NaN. Return zeros instead. Recipe: length → guard zero → divide each slot.`
        ],
        approach: `<p>Two passes over the list. Pass 1 adds up the squares and takes the square root to get the length. Pass 2 divides every slot by that length. A zero-length vector is returned as zeros because it has no direction.</p>`,
        dry: { head: ['step', 'value'], rows: [['v', '[3, 4]'], ['squares', '9, 16'], ['length', '√25 = 5'], ['divide', '[3/5, 4/5] = [0.6, 0.8]']] },
        complexity: `<p>O(d) time for d slots (two passes), O(d) extra space for the new list.</p>`,
        followUps: ['How would you normalise a whole matrix of embeddings row by row?', 'Why does a vector database ask whether your vectors are normalised?']
      })
    ]
  });

  // ===================== TOPIC 2: DOT PRODUCT, COSINE, PROJECTION =====================
  topics.push({
    title: 'Dot Product, Angles, Cosine Similarity and Projection',
    analogy: `<p>Two friends rate five films from −2 (hate) to +2 (love). If they love and hate the <i>same</i> films, multiplying their ratings film by film gives mostly positive numbers, and the total is big. If their tastes clash, the products are negative. That total is the <b>dot product</b>: an agreement score. <b>Cosine similarity</b> is the same score after removing "how strongly" each person rates, so a calm rater and a loud rater with the same taste still match perfectly.</p>`,
    explain: `<p><b>🟢 The dot product.</b> Multiply matching slots, then add. For <code>a = [4, 1]</code> and <code>b = [2, 3]</code>:</p>
      ${H.table(['slot', 'a', 'b', 'a × b'], [['x', '4', '2', '8'], ['y', '1', '3', '3'], ['<b>sum</b>', '', '', '<span class="c-g">a · b = 11</span>']])}
      <p>The answer is <b>one number</b>, not a vector. Written with the sum sign: <code>a · b = Σ<sub>i</sub> a<sub>i</sub> × b<sub>i</sub></code>.</p>
      <h4>The angle hiding inside</h4>
      <p>There is a second formula for the same number: <code>a · b = ‖a‖ × ‖b‖ × cos θ</code>, where θ (theta) is the angle between the arrows. Rearranged, this gives <b>cosine similarity</b>:</p>
      <p style="text-align:center"><code>cos θ = (a · b) / (‖a‖ × ‖b‖)</code></p>
      <p>Worked: ‖a‖ = √17 ≈ 4.123, ‖b‖ = √13 ≈ 3.606. cos θ = 11 / (4.123 × 3.606) = 11 / 14.866 ≈ <b>0.740</b>. The angle is about 42°.</p>
      ${H.table(['cosine', 'angle', 'meaning in search'], [['+1', '0°', 'same direction: same meaning'], ['≈ 0.7', '≈ 45°', 'related'], ['0', '90°', 'unrelated ("orthogonal")'], ['−1', '180°', 'opposite']])}
      <p><b>Why divide by the lengths?</b> Take <code>[1, 2]</code> and <code>[10, 20]</code>. Same direction, so same "meaning", but the dot product with any third vector is ten times bigger for the long one. Cosine ignores length and looks only at direction. For text embeddings this is usually what we want: a long document should not win just for being long.</p>
      <h4>Projection: the shadow of one arrow on another</h4>
      <p>Shine a torch straight down onto the line through <code>a</code>. The shadow of <code>b</code> on that line is its <b>projection</b>:</p>
      <p style="text-align:center"><code>proj<sub>a</sub>(b) = (a · b / a · a) × a</code></p>
      <p>Worked: a · b = 11, a · a = 17, so proj = (11/17) × [4, 1] ≈ <b>[2.588, 0.647]</b>. The leftover <code>b − proj = [−0.588, 2.353]</code> is at right angles to <code>a</code> (check: 4 × (−0.588) + 1 × 2.353 ≈ 0). Projection is how PCA squeezes points onto their most important direction, and how a linear model "reads" an input along its weight vector.</p>`,
    clues: [
      '"how similar are two sentences / users / products" → cosine similarity of their vectors',
      '"semantic search", "top-k most similar", "retrieve relevant chunks" → dot product or cosine against every stored vector',
      '"vectors are normalised" → dot product IS cosine; no division needed',
      '"orthogonal", "perpendicular", "independent features" → dot product is 0',
      '"closest point on a line", "component along a direction", "shadow" → projection (a·b / a·a) a',
      '"weighted sum of inputs" → a dot product with the weight vector (one neuron)'
    ],
    code: [
      { lang: 'python', title: 'Dot, cosine, angle and projection (runnable)', run: true, code: `import math

def dot(a, b):
    assert len(a) == len(b), "same dimension needed"
    return sum(x * y for x, y in zip(a, b))

def norm(a):
    return math.sqrt(dot(a, a))

def cosine(a, b):
    na, nb = norm(a), norm(b)
    return 0.0 if na == 0 or nb == 0 else dot(a, b) / (na * nb)

def project(b, a):
    # shadow of b on the line through a
    t = dot(a, b) / dot(a, a)
    return [t * x for x in a]

a, b = [4, 1], [2, 3]
print("a . b      =", dot(a, b))                              # 11
print("cosine     =", round(cosine(a, b), 3))                 # 0.74
print("angle (deg)=", round(math.degrees(math.acos(cosine(a, b))), 1))   # ~42.3
p = project(b, a)
print("projection =", [round(x, 3) for x in p])               # [2.588, 0.647]
leftover = [x - y for x, y in zip(b, p)]
print("leftover . a =", round(dot(leftover, a), 9))           # 0.0 -> right angle

# length does not change cosine, but it changes the dot product
print("dot with [1,2] vs [10,20]:", dot(a, [1, 2]), dot(a, [10, 20]))
print("cos with [1,2] vs [10,20]:", round(cosine(a, [1, 2]), 3), round(cosine(a, [10, 20]), 3))
` },
      { lang: 'python', title: 'NumPy version (shown, not run here)', code: `import numpy as np

a = np.array([4.0, 1.0])
b = np.array([2.0, 3.0])
print(a @ b)                                           # 11.0  (same as np.dot(a, b))
cos = a @ b / (np.linalg.norm(a) * np.linalg.norm(b))
print(round(float(cos), 3))                            # 0.74
proj = (a @ b) / (a @ a) * a
print(proj)                                            # [2.588 0.647]
` }
    ],
    codeTitle: ['Pure Python', 'NumPy version'],
    viz: {
      title: 'Cosine similarity is an angle',
      input: '4 1 | 2 3',
      inputLabel: 'a | b  (two 2-D vectors)',
      gen: function (input) {
        var p = splitBar(input, 2, '4 1 | 2 3');
        var a = parseVec(p[0], 'a'), b = parseVec(p[1], 'b');
        if (a.length !== 2 || b.length !== 2) throw new Error('This picture needs 2-D vectors: two numbers each');
        if (normv(a) === 0 || normv(b) === 0) throw new Error('Neither vector may be all zeros (no direction)');
        if ([a[0], a[1], b[0], b[1]].some(function (x) { return Math.abs(x) > 10; })) throw new Error('Keep entries between -10 and 10');
        var F = [], d = dotv(a, b), na = normv(a), nb = normv(b), c = d / (na * nb);
        var deg = Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI;
        var sc = Math.max(na, nb);
        F.push({ narr: 'Two arrows: <b>a = ' + vs(a) + '</b> and <b>b = ' + vs(b) + '</b>. How much do they point the same way?', parts: [
          plane('a and b', [{ id: 'a', name: 'a', x: a[0], y: a[1], cls: 'win' }, { id: 'b', name: 'b', x: b[0], y: b[1], cls: 'cur' }], { scale: sc })] });
        F.push({ narr: 'Dot product, slot x: ' + a[0] + ' × ' + b[0] + ' = <b>' + r3(a[0] * b[0]) + '</b>.', parts: [
          { type: 'table', label: 'a · b, term by term', columns: ['slot', 'a', 'b', 'a × b'], rows: [['x', a[0], b[0], r3(a[0] * b[0])]], hl: { 0: 'cur' } }] });
        F.push({ narr: 'Slot y: ' + a[1] + ' × ' + b[1] + ' = <b>' + r3(a[1] * b[1]) + '</b>. Add the terms: <b>a · b = ' + r3(d) + '</b>. ' + (d > 0 ? 'Positive: they lean the same way.' : d < 0 ? 'Negative: they lean opposite ways.' : 'Zero: exactly at right angles.'), parts: [
          { type: 'table', label: 'a · b, term by term', columns: ['slot', 'a', 'b', 'a × b'], rows: [['x', a[0], b[0], r3(a[0] * b[0])], ['y', a[1], b[1], r3(a[1] * b[1])], ['sum', '', '', r3(d)]], hl: { 2: 'ok' } }] });
        F.push({ narr: 'Lengths by Pythagoras: ‖a‖ = ' + r3(na) + ', ‖b‖ = ' + r3(nb) + '. We divide by them so that only <i>direction</i> matters, not size.', parts: [
          { type: 'vars', vals: { 'a · b': r3(d), '‖a‖': r3(na), '‖b‖': r3(nb) } },
          { type: 'bars', label: 'lengths', values: [r3(na), r3(nb)], idxLabels: ['‖a‖', '‖b‖'] }] });
        F.push({ narr: 'cos θ = ' + r3(d) + ' / (' + r3(na) + ' × ' + r3(nb) + ') = <b>' + r3(c) + '</b>, so the angle θ ≈ <b>' + r3(deg) + '°</b>.', parts: [
          plane('angle between a and b ≈ ' + Math.round(deg) + '°', [{ id: 'a', name: 'a', x: a[0], y: a[1], cls: 'win' }, { id: 'b', name: 'b', x: b[0], y: b[1], cls: 'cur' }], { scale: sc }),
          { type: 'vars', vals: { 'cos θ': r3(c), 'θ (degrees)': r3(deg) }, hl: { 'cos θ': 'sel' } }] });
        var t = d / dotv(a, a), pr = [t * a[0], t * a[1]], lo = [b[0] - pr[0], b[1] - pr[1]];
        F.push({ narr: '<b>Projection</b>: the shadow of b on the line through a is (a·b / a·a) × a = (' + r3(d) + ' / ' + r3(dotv(a, a)) + ') × a = <b>' + vs(pr) + '</b>.', parts: [
          plane('shadow of b on a', [{ id: 'a', name: 'a', x: a[0], y: a[1], cls: 'done' }, { id: 'b', name: 'b', x: b[0], y: b[1], cls: 'done' }, { id: 'p', name: 'proj', x: pr[0], y: pr[1], cls: 'ok' }], { scale: sc }),
          { type: 'vars', vals: { 't = a·b / a·a': r3(t), proj: vs(pr) }, hl: { proj: 'ok' } }] });
        F.push({ narr: 'The leftover b − proj = ' + vs(lo) + ' meets a at a right angle: leftover · a = ' + r3(dotv(lo, a)) + '. The projection is the closest point to b on that line.', parts: [
          plane('b = proj + leftover', [{ id: 'a', name: 'a', x: a[0], y: a[1], cls: 'done' }, { id: 'p', name: 'proj', x: pr[0], y: pr[1], cls: 'ok' }, { id: 'b', name: 'b', x: b[0], y: b[1], from: 'p', cls: 'bad', tag: 'leftover ' + vs(lo) }], { scale: sc })] });
        // sweep: rotate b around and watch the cosine
        var angA = Math.atan2(a[1], a[0]), sweep = [0, 45, 90, 135, 180], vals = [];
        sweep.forEach(function (g, i) {
          var th = angA + g * Math.PI / 180, bb = [r3(nb * Math.cos(th)), r3(nb * Math.sin(th))];
          var cc = dotv(a, bb) / (na * nb); vals.push(r3(cc + 1));
          F.push({ narr: 'Turn b so it sits <b>' + g + '°</b> away from a: cosine = <b>' + r3(cc) + '</b>. ' + ['Same direction → +1.', 'Leaning together → about 0.71.', 'Right angle → 0: unrelated.', 'Leaning apart → about −0.71.', 'Opposite → −1.'][i], parts: [
            plane('b turned to ' + g + '°', [{ id: 'a', name: 'a', x: a[0], y: a[1], cls: 'win' }, { id: 'b', name: 'b', x: bb[0], y: bb[1], cls: g === 90 ? 'sel' : g > 90 ? 'bad' : 'ok' }], { scale: sc }),
            { type: 'bars', label: 'cosine + 1 (so bars stay positive)', values: vals.slice(), idxLabels: sweep.slice(0, i + 1).map(function (x) { return x + '°'; }), texts: vals.map(function (v) { return String(r3(v - 1)); }) }] });
        });
        return F;
      }
    },
    examples: [
      { title: 'Movie tastes', html: `<p>Ann = <code>[2, 1, −2]</code>, Ben = <code>[1, 2, −1]</code> (ratings for action, comedy, horror). Dot = 2 + 2 + 2 = 6. ‖Ann‖ = 3, ‖Ben‖ = √6 ≈ 2.449. Cosine = 6 / 7.348 ≈ <b>0.816</b>: similar tastes. Cara = <code>[−2, −1, 2]</code> is Ann flipped: cosine with Ann = −9/9 = <b>−1</b>.</p>` },
      { title: 'Unit vectors turn cosine into a plain dot', html: `<p>Normalise first: <code>[3, 4] → [0.6, 0.8]</code>, <code>[4, 3] → [0.8, 0.6]</code>. Dot = 0.48 + 0.48 = <b>0.96</b>, which equals the cosine. Vector databases normalise once at insert time, then use the cheaper dot product for every query.</p>`, code: { lang: 'python', run: true, code: `import math
def unit(v):
    n = math.sqrt(sum(x * x for x in v))
    return [x / n for x in v]
a, b = unit([3, 4]), unit([4, 3])
print("dot of unit vectors:", round(sum(x * y for x, y in zip(a, b)), 6))   # 0.96
raw = sum(x * y for x, y in zip([3, 4], [4, 3])) / (5 * 5)
print("cosine from raw    :", raw)                                          # 0.96
` } },
      { title: 'Orthogonal means "no overlap"', html: `<p><code>[1, 0, 0]</code> and <code>[0, 5, 0]</code>: dot = 0. Two features that are orthogonal carry completely separate information. One-hot word vectors are all orthogonal, which is exactly why they are bad at meaning: "cat" and "kitten" look as unrelated as "cat" and "carburettor". Learned embeddings fix this.</p>` },
      { title: 'Projection onto an axis', html: `<p>Project <code>p = [3, 5]</code> onto the x-axis direction <code>d = [1, 0]</code>: p·d = 3, d·d = 1, so the projection is <code>[3, 0]</code>. Projecting onto an axis just keeps that coordinate. Projecting onto a tilted direction like <code>[1, 1]</code> gives (8/2) × [1, 1] = <code>[4, 4]</code>.</p>` }
    ],
    deepDive: `<p><b>🟣 Why a · b = ‖a‖‖b‖cos θ.</b> Use the law of cosines on the triangle with sides a, b and a − b: ‖a − b‖² = ‖a‖² + ‖b‖² − 2‖a‖‖b‖cos θ. Expand the left side slot by slot: ‖a − b‖² = a·a − 2a·b + b·b. Compare the two and the a·a and b·b cancel, leaving a · b = ‖a‖‖b‖cos θ. So the slot-by-slot recipe and the angle picture are the same thing.</p>
      <p><b>Cauchy–Schwarz.</b> Because |cos θ| ≤ 1, we always have |a · b| ≤ ‖a‖‖b‖. That is why cosine is guaranteed to stay between −1 and +1 (floating-point rounding can push it to 1.0000001, so clamp before calling <code>acos</code>).</p>
      <p><b>Cosine vs dot vs Euclidean.</b> For <i>unit</i> vectors these three agree on the ranking: ‖a − b‖² = 2 − 2 cos θ. Without normalisation they differ: raw dot product rewards long vectors (useful when length means "confidence" or "popularity", as in some recommender systems); cosine ignores length. Some embedding models are trained for dot product and some for cosine, so read the model card.</p>
      <p><b>Cost.</b> One comparison costs d multiplications and d additions. Comparing a query with N stored vectors is O(N·d): 1 million × 768 ≈ 768 million multiply-adds, under a second on a CPU with vectorised code but too slow per request at scale. That is why approximate indexes (HNSW, IVF) exist.</p>`,
    aiEra: `<p><b>🤖 In AI systems.</b> Retrieval-augmented generation (RAG), semantic caching, duplicate detection, recommendation and "find similar images" all reduce to: embed, normalise, take dot products, keep the top k. Similarity thresholds such as "cosine ≥ 0.8 counts as the same question" are tuned on real data, because the scale of cosine values differs a lot between embedding models (some models rarely go below 0.6 even for unrelated text).</p>
      <p><b>Working with AI assistants.</b> Assistants often mix up "cosine distance" (1 − cosine, smaller is closer) and "cosine similarity" (bigger is closer), which flips your ranking. Ask which one a library returns (FAISS inner product, pgvector's <code>&lt;=&gt;</code> operator returns cosine <i>distance</i>), and write a tiny test with two hand-picked vectors whose answer you know. It takes one minute and catches a whole class of silent bugs.</p>`,
    problems: [
      PR('cosine', {
        title: 'Cosine Similarity of Two Embeddings', level: 'Easy', tags: ['vectors', 'cosine', 'embeddings'], companies: ['Google', 'Spotify', 'OpenAI'],
        statement: `<p>Write <code>cosine_similarity(a, b)</code> that returns the cosine of the angle between two vectors of the same length. If either vector is all zeros, return <code>0.0</code>.</p>`,
        constraints: `<p>1 ≤ len(a) = len(b) ≤ 4096. Entries are floats. Compared with a tolerance of about 10<sup>−5</sup>.</p>`,
        example: `<p><code>a = [2, 1, 3]</code>, <code>b = [4, 0, 5]</code> → <code class="c-g">≈ 0.960</code>. Why: a·b = 8 + 0 + 15 = 23, ‖a‖ = √14, ‖b‖ = √41, 23 / √574 ≈ 0.960.</p>
          <p><code>[1, 2]</code> vs <code>[−1, −2]</code> → <code class="c-r">−1.0</code> (opposite directions).</p>`,
        bruteWhy: `<p>A tempting shortcut is to measure each vector's angle with <code>atan2</code> and take the cosine of the difference. It works only in 2-D (an embedding has hundreds of slots), and the brute version shown even gives wrong answers for 3-D inputs. The dot-product formula works in every dimension.</p>`,
        mcq: { q: `Two embeddings have dot product 6, and lengths 2 and 5. What is their cosine similarity?`, options: ['0.6', '6', '0.3', '1.2'], answer: 0, explain: `cos = 6 / (2 × 5) = 0.6.` },
        hints: [
          `Hint 1: Cosine = (dot product) divided by (length of a × length of b). Three sums over the same slots.`,
          `Hint 2: dot = sum(x*y for x, y in zip(a, b)); each length = math.sqrt(sum(x*x ...)).`,
          `Hint 3: Guard the zero vector before dividing. Recipe: dot → two lengths → if either is 0 return 0.0 → divide.`
        ],
        approach: `<p>Compute the dot product and both lengths in one pass over the slots (or three short passes), then divide. Return 0.0 when either length is 0, because a zero vector has no direction and the division would fail.</p>`,
        dry: { head: ['slot', 'a', 'b', 'a×b', 'running dot', 'a²', 'b²'], rows: [['0', '2', '4', '8', '8', '4', '16'], ['1', '1', '0', '0', '8', '1', '0'], ['2', '3', '5', '15', '23', '9', '25'], ['end', '', '', '', '23', '√14', '√41 → 0.960']] },
        complexity: `<p>O(d) time, O(1) extra space.</p>`,
        followUps: ['How would you compute cosine for one query against a million stored vectors quickly?', 'When would you prefer the raw dot product to cosine?']
      })
    ]
  });

  // ===================== TOPIC 3: MATRICES AS TRANSFORMATIONS =====================
  topics.push({
    title: 'Matrices as Transformations: Rotate, Stretch, Shear, Flip',
    analogy: `<p>Imagine a photo-editing app. "Rotate 90°", "stretch twice as wide", "slant like italic text", "mirror". Each button is a rule that moves <i>every</i> point of the picture in a consistent way. A <b>matrix</b> is exactly such a rule written as a small table of numbers. And the surprise: you only need to know where the rule sends <b>two arrows</b>, "one step right" and "one step up", to know where it sends everything else.</p>`,
    explain: `<p><b>🟢 A matrix is a grid of numbers.</b> A 2×2 matrix has 2 rows and 2 columns:</p>
      ${H.table(['', 'col 1', 'col 2'], [['row 1', 'a', 'b'], ['row 2', 'c', 'd']])}
      <p><b>Matrix times vector.</b> To apply M to a point <code>v = [x, y]</code>, take the dot product of each <i>row</i> with v:</p>
      <p style="text-align:center"><code>M v = [a·x + b·y,  c·x + d·y]</code></p>
      <p><b>The column picture (the key idea).</b> The same answer can be read as <code>x × (column 1) + y × (column 2)</code>. Column 1 is where the arrow "one step right" <code>e<sub>1</sub> = [1, 0]</code> lands. Column 2 is where "one step up" <code>e<sub>2</sub> = [0, 1]</code> lands. Every point is "x steps right plus y steps up", so it lands at "x copies of column 1 plus y copies of column 2".</p>
      <p><b>Worked: rotate 90° anticlockwise.</b> "Right" <code>[1, 0]</code> should turn into "up" <code>[0, 1]</code>; "up" <code>[0, 1]</code> should turn into "left" <code>[−1, 0]</code>. Write those as the columns:</p>
      ${H.table(['', 'col 1 (where [1,0] goes)', 'col 2 (where [0,1] goes)'], [['row 1', '0', '−1'], ['row 2', '1', '0']])}
      <p>Apply it to <code>v = [2, 1]</code>: <code>2 × [0, 1] + 1 × [−1, 0] = [−1, 2]</code>. Row view gives the same: row 1 · v = 0×2 + (−1)×1 = −1; row 2 · v = 1×2 + 0×1 = 2. ✅</p>
      <h4>The gallery of 2×2 transformations</h4>
      ${H.table(['effect', 'matrix (rows)', '[2, 1] becomes'], [['do nothing (identity I)', '[1 0; 0 1]', '[2, 1]'], ['scale ×2', '[2 0; 0 2]', '[4, 2]'], ['stretch x only', '[3 0; 0 1]', '[6, 1]'], ['rotate 90°', '[0 −1; 1 0]', '[−1, 2]'], ['rotate by angle θ', '[cos θ −sin θ; sin θ cos θ]', '…'], ['mirror in x-axis', '[1 0; 0 −1]', '[2, −1]'], ['shear (slant)', '[1 1; 0 1]', '[3, 1]'], ['squash onto a line', '[1 2; 2 4]', '[4, 8]']])}
      <p><b>Why "linear"?</b> These rules keep the grid lines straight, evenly spaced and the origin fixed. In symbols: <code>M(u + v) = Mu + Mv</code> and <code>M(k·v) = k·Mv</code>. Anything with those two properties can be written as a matrix, and every matrix has them.</p>
      <p><b>Non-square matrices change dimension.</b> A 2×3 matrix takes a 3-D vector to a 2-D one (like a camera flattening the world into a photo). A neural-network layer with 768 inputs and 3,072 outputs is a 3,072×768 matrix taking a 768-slot vector to a 3,072-slot vector.</p>`,
    clues: [
      '"apply the same linear map to every point / every token" → one matrix, many matrix-vector products',
      '"rotate / scale / shear / reflect a shape" → a 2×2 (or 3×3) matrix; columns = images of the basis vectors',
      '"a dense / fully connected / linear layer" → y = W x + b, a matrix times a vector plus a bias',
      '"project 768-d embeddings down to 256-d" → a 256×768 matrix',
      '"(m×n) matrix applied to an n-vector" → result has m slots',
      '"does the map keep lines straight and the origin fixed?" → that is the definition of linear'
    ],
    code: [
      { lang: 'python', title: 'Matrix-vector product and a gallery of transforms (runnable)', run: true, code: `import math

def mat_vec(M, v):
    # each output slot = dot product of one row of M with v
    return [sum(m * x for m, x in zip(row, v)) for row in M]

def column_view(M, v):
    # same answer: x * column1 + y * column2 + ...
    out = [0.0] * len(M)
    for j, coeff in enumerate(v):
        for i in range(len(M)):
            out[i] += coeff * M[i][j]
    return out

def rotation(deg):
    t = math.radians(deg)
    return [[math.cos(t), -math.sin(t)], [math.sin(t), math.cos(t)]]

v = [2, 1]
gallery = {
    "identity": [[1, 0], [0, 1]],
    "scale x2": [[2, 0], [0, 2]],
    "rotate 90": [[0, -1], [1, 0]],
    "mirror x-axis": [[1, 0], [0, -1]],
    "shear": [[1, 1], [0, 1]],
    "squash to line": [[1, 2], [2, 4]],
}
for name, M in gallery.items():
    print(f"{name:15s} {v} -> {mat_vec(M, v)}   column view: {column_view(M, v)}")

R30 = rotation(30)
print("rotate [1, 0] by 30 deg:", [round(x, 3) for x in mat_vec(R30, [1, 0])])   # [0.866, 0.5]

# A non-square matrix: 2x3 squashes 3-D points to 2-D (drop depth, like a photo)
camera = [[1, 0, 0], [0, 1, 0]]
print("3-D [4, 5, 9] seen by camera:", mat_vec(camera, [4, 5, 9]))           # [4, 5]
` },
      { lang: 'python', title: 'NumPy version (shown, not run here)', code: `import numpy as np

M = np.array([[0.0, -1.0], [1.0, 0.0]])    # rotate 90 degrees
v = np.array([2.0, 1.0])
print(M @ v)                               # [-1.  2.]

points = np.array([[1, 0], [0, 1], [2, 1]], dtype=float)   # one point per row
print(points @ M.T)                        # transform all points at once
` }
    ],
    codeTitle: ['Pure Python', 'NumPy version'],
    viz: {
      title: 'Watch a matrix move the basis arrows and a point',
      input: '0 -1; 1 0 | 2 1',
      inputLabel: '2×2 matrix (rows separated by ;) | point x y. Try 2 0; 0 2 or 1 1; 0 1 or 1 0; 0 -1 or 1 2; 2 4',
      gen: function (input) {
        var p = splitBar(input, 2, '0 -1; 1 0 | 2 1');
        var M = parseMat(p[0], 'the matrix'), v = parseVec(p[1], 'the point');
        if (M.length !== 2 || M[0].length !== 2) throw new Error('Use a 2×2 matrix, e.g. 0 -1; 1 0');
        if (v.length !== 2) throw new Error('The point needs two numbers, e.g. 2 1');
        if (M[0].concat(M[1], v).some(function (x) { return Math.abs(x) > 6; })) throw new Error('Keep numbers between -6 and 6 so the picture fits');
        var c1 = [M[0][0], M[1][0]], c2 = [M[0][1], M[1][1]], Mv = mv(M, v), F = [];
        var det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
        var sc = Math.max(1, Math.abs(Mv[0]), Math.abs(Mv[1]), Math.abs(v[0]), Math.abs(v[1]), Math.abs(c1[0]), Math.abs(c1[1]), Math.abs(c2[0]), Math.abs(c2[1]));
        F.push({ narr: 'Start with the two basis arrows: <b>e₁ = (1, 0)</b> "one step right" and <b>e₂ = (0, 1)</b> "one step up". Every point is built from them.', parts: [
          plane('before: basis arrows', [{ id: 'e1', name: 'e₁', x: 1, y: 0, cls: 'win' }, { id: 'e2', name: 'e₂', x: 0, y: 1, cls: 'win' }], { scale: sc }),
          { type: 'grid', label: 'the matrix M', rows: mrows(M), colHead: ['col 1', 'col 2'], rowHead: ['row 1', 'row 2'] }] });
        F.push({ narr: 'Column 1 of M says where e₁ lands: <b>' + vs(c1) + '</b>.', parts: [
          plane('e₁ → column 1', [{ id: 'e1', name: 'e₁', x: 1, y: 0, cls: 'done' }, { id: 'c1', name: 'Me₁', x: c1[0], y: c1[1], cls: 'ok' }], { scale: sc }),
          { type: 'grid', label: 'the matrix M', rows: mrows(M), colHead: ['col 1', 'col 2'], rowHead: ['row 1', 'row 2'], hl: { '0,0': 'ok', '1,0': 'ok' } }] });
        F.push({ narr: 'Column 2 says where e₂ lands: <b>' + vs(c2) + '</b>. These two arrows are the whole story of M.', parts: [
          plane('e₂ → column 2', [{ id: 'c1', name: 'Me₁', x: c1[0], y: c1[1], cls: 'ok' }, { id: 'e2', name: 'e₂', x: 0, y: 1, cls: 'done' }, { id: 'c2', name: 'Me₂', x: c2[0], y: c2[1], cls: 'ok' }], { scale: sc }),
          { type: 'grid', label: 'the matrix M', rows: mrows(M), colHead: ['col 1', 'col 2'], rowHead: ['row 1', 'row 2'], hl: { '0,1': 'ok', '1,1': 'ok' } }] });
        F.push({ narr: 'The point <b>v = ' + vs(v) + '</b> means ' + v[0] + ' × e₁ + ' + v[1] + ' × e₂.', parts: [
          plane('v before', [{ id: 'vx', name: 'x', x: v[0], y: 0, cls: 'win', tag: v[0] + '·e₁' }, { id: 'v', name: 'v', x: v[0], y: v[1], from: 'vx', cls: 'cur', tag: '+' + v[1] + '·e₂ = ' + vs(v) }], { scale: sc })] });
        var part1 = [v[0] * c1[0], v[0] * c1[1]];
        F.push({ narr: 'So Mv = ' + v[0] + ' × (column 1) + ' + v[1] + ' × (column 2). First piece: ' + v[0] + ' × ' + vs(c1) + ' = ' + vs(part1) + '.', parts: [
          plane('walk x copies of column 1…', [{ id: 'p1', name: '1st', x: part1[0], y: part1[1], cls: 'cur', tag: vs(part1) }], { scale: sc }) ] });
        F.push({ narr: '…then add ' + v[1] + ' × ' + vs(c2) + '. We land at <b>Mv = ' + vs(Mv) + '</b>.', parts: [
          plane('…then y copies of column 2', [{ id: 'p1', name: '1st', x: part1[0], y: part1[1], cls: 'done', tag: '' }, { id: 'Mv', name: 'Mv', x: Mv[0], y: Mv[1], from: 'p1', cls: 'ok' }], { scale: sc }),
          { type: 'table', label: 'row view gives the same answer', columns: ['row', 'row · v', 'result'], rows: [['1', M[0][0] + '×' + v[0] + ' + ' + M[0][1] + '×' + v[1], r3(Mv[0])], ['2', M[1][0] + '×' + v[0] + ' + ' + M[1][1] + '×' + v[1], r3(Mv[1])]] }] });
        F.push({ narr: 'Before and after: v = ' + vs(v) + ' moved to Mv = ' + vs(Mv) + '. Every other point moves by the same rule.', parts: [
          plane('v and Mv', [{ id: 'v', name: 'v', x: v[0], y: v[1], cls: 'done' }, { id: 'Mv', name: 'Mv', x: Mv[0], y: Mv[1], cls: 'ok' }], { scale: sc })] });
        var sq = [[1, 0], [1, 1], [0, 1]].map(function (q) { return mv(M, q); });
        F.push({ narr: 'The unit square (corners (1,0), (1,1), (0,1)) becomes a parallelogram. Its area is multiplied by the <b>determinant</b> ad − bc = ' + r3(det) + '. ' + (det === 0 ? '<span class="c-r">Area 0: the whole plane is squashed onto a line, so information is lost.</span>' : det < 0 ? 'Negative: the picture is also mirrored.' : 'Positive: no mirroring.'), parts: [
          plane('unit square after M', [{ id: 'q1', name: 'A', x: sq[0][0], y: sq[0][1], cls: 'sel' }, { id: 'q2', name: 'B', x: sq[1][0], y: sq[1][1], from: 'q1', cls: 'sel' }, { id: 'q3', name: 'C', x: sq[2][0], y: sq[2][1], from: 'q2', cls: 'sel' }, { id: 'q4', name: '·', x: 0, y: 0, from: 'q3', cls: 'sel', noArrow: false, tag: '' }], { scale: sc }),
          { type: 'vars', vals: { 'det = ad − bc': r3(det), 'area scale': r3(Math.abs(det)) }, hl: { 'det = ad − bc': det === 0 ? 'bad' : 'sel' } }] });
        return F;
      }
    },
    examples: [
      { title: 'Read a matrix by its columns', html: `<p>M = <code>[[3, 0], [0, 1]]</code>. Column 1 is <code>[3, 0]</code>: "right" becomes "3 right". Column 2 is <code>[0, 1]</code>: "up" stays "up". So M stretches horizontally by 3. The point <code>[1, 2]</code> → <code>[3, 2]</code>.</p>` },
      { title: 'Rotation by 30°', html: `<p>cos 30° ≈ 0.866, sin 30° = 0.5. R = <code>[[0.866, −0.5], [0.5, 0.866]]</code>. R × <code>[2, 0]</code> = <code>[1.732, 1]</code>: still length 2 (√(3 + 1) = 2), now tilted up by 30°. Rotations never change lengths or angles.</p>` },
      { title: 'A tiny neural layer', html: `<p>Input <code>x = [1, 2, 3]</code> (3 features). Weights W (2×3) = <code>[[0.5, 0, −1], [1, 1, 1]]</code>, bias <code>b = [0, −1]</code>. Wx = [0.5 + 0 − 3, 1 + 2 + 3] = [−2.5, 6]. Add b: <code>[−2.5, 5]</code>. The layer turned 3 numbers into 2. Then an activation (like ReLU) bends it, which is what makes deep networks more than one big matrix.</p>`, code: { lang: 'python', run: true, code: `W = [[0.5, 0, -1], [1, 1, 1]]   # 2 x 3: 3 inputs -> 2 outputs
b = [0, -1]
x = [1, 2, 3]
z = [sum(w * xi for w, xi in zip(row, x)) + bi for row, bi in zip(W, b)]
print("W x + b =", z)                       # [-2.5, 5]
print("ReLU    =", [max(0, v) for v in z])  # [0, 5]
` } },
      { title: 'Squash: when a matrix loses information', html: `<p>M = <code>[[1, 2], [2, 4]]</code>. Column 2 = 2 × column 1, so both basis arrows land on the same line through <code>[1, 2]</code>. <code>[2, 0]</code> → <code>[2, 4]</code> and <code>[0, 1]</code> → <code>[2, 4]</code> too. Two different inputs, same output: you cannot undo this. Such a matrix is <b>singular</b> (determinant 1×4 − 2×2 = 0).</p>` }
    ],
    deepDive: `<p><b>🟣 Linear vs affine.</b> A matrix always keeps the origin fixed, so "shift everything 3 to the right" is not linear. Adding a bias (<code>Wx + b</code>) makes an <b>affine</b> map. Graphics and robotics hide the shift inside a bigger matrix by appending a 1 to every point ("homogeneous coordinates": 2-D points become <code>[x, y, 1]</code> and the 3×3 matrix's last column holds the shift).</p>
      <p><b>Determinant = area scale.</b> For 2×2, det = ad − bc is the signed area of the parallelogram made by the two columns. |det| = 2 means areas double; det &lt; 0 means mirrored; det = 0 means the plane is flattened onto a line (or a point). In 3-D it is a signed volume. Rotations have det = 1.</p>
      <p><b>Rank.</b> The number of independent directions the output can reach is the <b>rank</b>. The squash example has rank 1. A 4,096×4,096 weight matrix might in practice behave like rank 64, which is the observation behind LoRA fine-tuning: learn a low-rank update <code>B·A</code> (4,096×8 times 8×4,096) instead of 16.7 million separate numbers.</p>
      <p><b>Why stacking linear layers is pointless without activations.</b> Applying W<sub>1</sub> then W<sub>2</sub> equals applying the single matrix W<sub>2</sub>W<sub>1</sub>. Ten linear layers collapse into one. Non-linear activations (ReLU, GELU) between layers are what give depth its power.</p>`,
    aiEra: `<p><b>🤖 In AI systems.</b> Almost every parameter in a large language model sits inside a matrix that transforms vectors: the Q, K and V projections, the output projection and the two big feed-forward matrices of every block. "A 7B model" means about 7 billion numbers, mostly in such matrices. Quantisation (storing them in 8 or 4 bits) and LoRA (adding low-rank updates) are both ideas about these matrices.</p>
      <p><b>Working with AI assistants.</b> When an assistant writes <code>x @ W</code> vs <code>W @ x</code>, check the convention: PyTorch's <code>nn.Linear</code> stores W as (out, in) and computes <code>x @ W.T</code> with one example per row. A transposed weight with a square shape will run without error and give garbage. Ask for shape comments on every line, and test with a non-square example so mistakes crash loudly.</p>`,
    problems: [
      PR('transform', {
        title: 'Apply a 2×2 Transformation to a Set of Points', level: 'Easy', tags: ['matrices', 'transformations'], companies: ['Adobe', 'Unity'],
        statement: `<p>A shape is stored as a list of 2-D points <code>[[x, y], ...]</code>. Write <code>apply_transform(M, points)</code> that applies the 2×2 matrix <code>M</code> to every point and returns the new list of points in the same order.</p>`,
        constraints: `<p>0 ≤ number of points ≤ 10<sup>5</sup>. Entries are floats. Return an empty list for no points.</p>`,
        example: `<p><code>M = [[0, −1], [1, 0]]</code> (rotate 90°), points <code>[[1, 0], [0, 1], [2, 1]]</code> → <code class="c-g">[[0, 1], [−1, 0], [−1, 2]]</code>. Why: "right" turns into "up", "up" into "left", and [2, 1] = 2·up + 1·left = [−1, 2].</p>`,
        bruteWhy: `<p>A naive approach hard-codes special cases ("if rotate, swap and negate"). It breaks for any new matrix. The general rule is one line: new point = [a·x + b·y, c·x + d·y]. No special cases are needed.</p>`,
        mcq: { q: `M = [[2, 0], [0, 3]]. Where does [1, 1] go?`, options: ['[2, 3]', '[3, 2]', '[5, 5]', '[2, 0]'], answer: 0, explain: `Row 1: 2×1 + 0×1 = 2. Row 2: 0×1 + 3×1 = 3. So [2, 3]: x stretched by 2, y by 3.` },
        hints: [
          `Hint 1: For each point, the new x is (row 1 of M) · point and the new y is (row 2 of M) · point.`,
          `Hint 2: Unpack each point as x, y and build [M[0][0]*x + M[0][1]*y, M[1][0]*x + M[1][1]*y].`,
          `Hint 3: Keep the order of points. An empty list of points simply gives an empty list back. Recipe: loop over points → two dot products → append.`
        ],
        approach: `<p>Loop over the points. For each <code>[x, y]</code> compute the two row dot products and append the result. This is a matrix-vector product repeated for every point (or, equivalently, one matrix-matrix product with the points as columns).</p>`,
        dry: { head: ['point', 'row 1 · p', 'row 2 · p', 'new point'], rows: [['[1, 0]', '0·1 + (−1)·0 = 0', '1·1 + 0·0 = 1', '[0, 1]'], ['[0, 1]', '0·0 + (−1)·1 = −1', '1·0 + 0·1 = 0', '[−1, 0]'], ['[2, 1]', '0·2 + (−1)·1 = −1', '1·2 + 0·1 = 2', '[−1, 2]']] },
        complexity: `<p>O(n) for n points (4 multiplications each), O(n) space for the output.</p>`,
        followUps: ['How would you rotate the shape about its centre instead of the origin?', 'How would you apply three transforms in a row with only one pass over the points?']
      })
    ]
  });

  // ===================== TOPIC 4: MATRIX MULTIPLICATION =====================
  topics.push({
    title: 'Matrix Multiplication: Row-by-Column, Shapes and Composition',
    analogy: `<p>A café has a table of <b>orders</b> (rows = customers, columns = items) and a table of <b>prices and calories</b> per item (rows = items, columns = price, calories). Multiply them and you get each customer's total bill and total calories. To combine the tables, the "items" must line up: the <i>columns</i> of the first table must match the <i>rows</i> of the second. That matching rule is the whole secret of matrix shapes.</p>`,
    explain: `<p><b>🟢 The rule: row of A · column of B.</b> Cell (i, j) of <code>C = A · B</code> is the dot product of <b>row i of A</b> with <b>column j of B</b>.</p>
      <p><b>The café, worked.</b> Orders A (2 customers × 3 items: coffee, cake, juice) and item facts B (3 items × 2 facts: price, calories):</p>
      ${H.table(['A (orders)', 'coffee', 'cake', 'juice'], [['Ann', '2', '1', '0'], ['Bob', '1', '0', '3']])}
      ${H.table(['B (facts)', 'price £', 'calories'], [['coffee', '3', '5'], ['cake', '4', '300'], ['juice', '2', '110']])}
      ${H.table(['C = A·B', 'bill £', 'calories', 'how'], [['Ann', '<span class="c-g">10</span>', '<span class="c-g">310</span>', '2×3 + 1×4 + 0×2 = 10; 2×5 + 1×300 + 0×110 = 310'], ['Bob', '<span class="c-g">9</span>', '<span class="c-g">335</span>', '1×3 + 0×4 + 3×2 = 9; 1×5 + 0 + 3×110 = 335']])}
      <h4>The shape rule</h4>
      <p><code>(n × <b>k</b>) · (<b>k</b> × m) = (n × m)</code>. The inner numbers must match (both "items" = 3); the outer numbers give the answer's shape. Write shapes next to each other and cancel the middle: <code>(2×3)·(3×2) → 2×2</code>.</p>
      ${H.table(['A', 'B', 'A·B?'], [['2×3', '3×2', '✅ 2×2'], ['3×2', '2×3', '✅ 3×3 (different!)'], ['2×3', '2×3', '❌ inner 3 ≠ 2'], ['1×768', '768×1', '✅ 1×1: a dot product'], ['32×768', '768×3072', '✅ 32×3072: a whole batch through a layer']])}
      <h4>Order matters: A·B ≠ B·A</h4>
      <p>A = rotate 90°, B = stretch x by 2. "Stretch then rotate" is <code>A·B</code> (the right-hand matrix acts first, because it is nearest the vector in <code>A·B·v</code>). "Rotate then stretch" is <code>B·A</code>. Try it with <code>[1, 0]</code>: stretch → [2, 0] → rotate → <b>[0, 2]</b>. Rotate → [0, 1] → stretch → <b>[0, 1]</b>. Different results, so the products differ.</p>
      <p><b>Composition.</b> Multiplying matrices is how you <b>chain</b> transformations into one. Ten transforms in a row become one 2×2 matrix that you can apply to a million points at the cost of one.</p>
      <p><b>Cost.</b> Each of the n×m answer cells needs k multiplications, so the total is <code>n × k × m</code>. Two 1,000×1,000 matrices need a billion multiply-adds. GPUs exist largely to do this fast.</p>`,
    clues: [
      '"shapes (n×k) and (k×m)" or "shape mismatch error" → inner dimensions must match; result is n×m',
      '"apply transform B, then A" → the combined matrix is A·B (right-most acts first)',
      '"batch of inputs through a layer" → X (batch × in) · Wᵀ (in × out)',
      '"every pair of rows" / "all pairwise similarities" → A · Aᵀ',
      '"cost of multiplying matrices" → n·k·m multiply-adds, O(n³) for square',
      '"is AB = BA?" → generally no; matrix multiplication is not commutative'
    ],
    code: [
      { lang: 'python', title: 'Matrix multiply with a shape check (runnable)', run: true, code: `def shape(M):
    return (len(M), len(M[0]))

def matmul(A, B):
    n, k = shape(A)
    k2, m = shape(B)
    if k != k2:
        raise ValueError(f"shape mismatch: ({n}x{k}) . ({k2}x{m}) - inner sizes differ")
    C = [[0] * m for _ in range(n)]
    for i in range(n):          # row of A
        for j in range(m):      # column of B
            C[i][j] = sum(A[i][t] * B[t][j] for t in range(k))   # row . column
    return C

orders = [[2, 1, 0],            # Ann: 2 coffee, 1 cake, 0 juice
          [1, 0, 3]]            # Bob
facts = [[3, 5],                # coffee: price, calories
         [4, 300],              # cake
         [2, 110]]              # juice
print("bill & calories:", matmul(orders, facts))   # [[10, 310], [9, 335]]

R = [[0, -1], [1, 0]]           # rotate 90
S = [[2, 0], [0, 1]]            # stretch x by 2
print("R.S (stretch, then rotate):", matmul(R, S))   # [[0, -1], [2, 0]]
print("S.R (rotate, then stretch):", matmul(S, R))   # [[0, -2], [1, 0]]

try:
    matmul(orders, orders)      # (2x3).(2x3) -> invalid
except ValueError as e:
    print("caught:", e)

n, k, m = 32, 768, 3072
print("multiply-adds for a batch through one layer:", n * k * m)   # 75,497,472
` },
      { lang: 'python', title: 'NumPy version (shown, not run here)', code: `import numpy as np

A = np.array([[2, 1, 0], [1, 0, 3]])
B = np.array([[3, 5], [4, 300], [2, 110]])
print(A @ B)           # [[ 10 310] [  9 335]]
print((A @ B).shape)   # (2, 2)
# A @ A  -> ValueError: matmul: Input operand 1 has a mismatch in its core dimension 0
print(A * A)           # element-wise product, NOT matrix multiplication
` }
    ],
    codeTitle: ['Pure Python', 'NumPy version'],
    viz: {
      title: 'Filling A·B one cell at a time',
      input: '2 1 0; 1 0 3 | 3 5; 4 300; 2 110',
      inputLabel: 'matrix A | matrix B (rows separated by ;)',
      gen: function (input) {
        var p = splitBar(input, 2, '2 1 0; 1 0 3 | 3 5; 4 300; 2 110');
        var A = parseMat(p[0], 'A'), B = parseMat(p[1], 'B');
        var n = A.length, k = A[0].length, k2 = B.length, m = B[0].length, F = [];
        if (n * m > 16) throw new Error('Keep the answer to 16 cells or fewer so the animation stays short');
        F.push({ narr: 'A is <b>' + n + '×' + k + '</b>, B is <b>' + k2 + '×' + m + '</b>. Shape check: the inner numbers ' + k + ' and ' + k2 + (k === k2 ? ' match ✅, so A·B exists and will be <b>' + n + '×' + m + '</b>.' : ' differ ❌.'), parts: [
          { type: 'grid', label: 'A (' + n + '×' + k + ')', rows: mrows(A) },
          { type: 'grid', label: 'B (' + k2 + '×' + m + ')', rows: mrows(B) },
          { type: 'vars', vals: { 'A shape': n + '×' + k, 'B shape': k2 + '×' + m, 'result': k === k2 ? n + '×' + m : 'impossible' }, hl: { result: k === k2 ? 'ok' : 'bad' } }] });
        if (k !== k2) {
          F.push({ narr: '<span class="c-r">Stop.</span> Row i of A has ' + k + ' numbers but column j of B has ' + k2 + '. A dot product needs equal lengths, so there is nothing to compute.', parts: [{ type: 'text', html: '<p>(' + n + '×<b>' + k + '</b>) · (<b>' + k2 + '</b>×' + m + '): inner sizes must be equal.</p>' }] });
          F.push({ narr: 'Fix options: transpose one matrix (if that is what you meant), or check which axis holds the features.', parts: [{ type: 'text', html: '<p>Bᵀ has shape ' + m + '×' + k2 + '. A·Bᵀ works only if ' + k + ' = ' + m + '.</p>' }] });
          F.push({ narr: 'In NumPy this is the famous "mismatch in its core dimension" error. Shape bugs are the most common linear-algebra bug in ML code.', parts: [{ type: 'text', html: '<p>Rule: (n×k)·(k×m) → n×m.</p>' }] });
          return F;
        }
        var C = []; for (var i = 0; i < n; i++) { C.push([]); for (var j = 0; j < m; j++) C[i].push('?'); }
        F.push({ narr: 'The plan: the answer has ' + n + ' rows (one per row of A) and ' + m + ' columns (one per column of B). Each "?" will be one dot product of length ' + k + '.', parts: [
          { type: 'grid', label: 'C = A·B (empty)', rows: C.map(function (r) { return r.slice(); }) }] });
        for (i = 0; i < n; i++) for (j = 0; j < m; j++) {
          var s = 0, terms = [];
          for (var t = 0; t < k; t++) { s += A[i][t] * B[t][j]; terms.push(r3(A[i][t]) + '×' + r3(B[t][j])); }
          C[i][j] = r3(s);
          var hA = {}, hB = {}, hC = {};
          for (t = 0; t < k; t++) { hA[i + ',' + t] = 'cur'; hB[t + ',' + j] = 'win'; }
          hC[i + ',' + j] = 'ok';
          F.push({ narr: 'Cell (' + (i + 1) + ', ' + (j + 1) + ') = row ' + (i + 1) + ' of A · column ' + (j + 1) + ' of B = ' + terms.join(' + ') + ' = <b>' + r3(s) + '</b>.', parts: [
            { type: 'grid', label: 'A: row ' + (i + 1), rows: mrows(A), hl: hA },
            { type: 'grid', label: 'B: column ' + (j + 1), rows: mrows(B), hl: hB },
            { type: 'grid', label: 'C = A·B', rows: C.map(function (r) { return r.slice(); }), hl: hC }] });
        }
        F.push({ narr: 'Done. ' + n + '×' + m + ' cells, each needing ' + k + ' multiplications: <b>' + (n * m * k) + '</b> multiply-adds in total (n·k·m).', parts: [
          { type: 'grid', label: 'C = A·B (' + n + '×' + m + ')', rows: C.map(function (r) { return r.slice(); }) },
          { type: 'vars', vals: { 'n·k·m': n * k * m } }] });
        return F;
      }
    },
    examples: [
      { title: 'Shape bookkeeping through a tiny network', html: `<p>Batch X: 4 examples × 3 features (4×3). Layer 1 weights W<sub>1</sub>: 3×5 → hidden H = X·W<sub>1</sub> is 4×5. Layer 2 W<sub>2</sub>: 5×2 → output 4×2: two scores per example. Write the shapes in a chain: (4×3)(3×5)(5×2) → 4×2. If any neighbours do not match, the code will crash, which is good.</p>` },
      { title: 'Composition: rotate twice = rotate 180°', html: `<p>R = <code>[[0, −1], [1, 0]]</code>. R·R: cell (1,1) = 0×0 + (−1)×1 = −1; (1,2) = 0×(−1) + (−1)×0 = 0; (2,1) = 1×0 + 0×1 = 0; (2,2) = 1×(−1) + 0×0 = −1. R² = <code>[[−1, 0], [0, −1]]</code>: every point flipped through the origin, which is a 180° turn. ✅</p>`, code: { lang: 'python', run: true, code: `def matmul(A, B):
    return [[sum(A[i][t] * B[t][j] for t in range(len(B))) for j in range(len(B[0]))] for i in range(len(A))]
R = [[0, -1], [1, 0]]
R2 = matmul(R, R)
R4 = matmul(R2, R2)
print("R^2 =", R2)   # [[-1, 0], [0, -1]]  -> 180 degrees
print("R^4 =", R4)   # identity            -> 360 degrees
` } },
      { title: 'Element-wise is not matrix multiplication', html: `<p>For A = <code>[[1, 2], [3, 4]]</code>: the element-wise square (NumPy <code>A * A</code>) is <code>[[1, 4], [9, 16]]</code>. The matrix product (<code>A @ A</code>) is <code>[[7, 10], [15, 22]]</code>. Mixing up <code>*</code> and <code>@</code> is a classic bug; on square matrices both run without error.</p>` },
      { title: 'All pairwise dot products in one go', html: `<p>Stack 3 unit embeddings as rows of E (3×2). E·Eᵀ is 3×3 and cell (i, j) is the dot product of item i and item j: a full similarity table. This is the same trick attention uses with Q·Kᵀ.</p>` }
    ],
    deepDive: `<p><b>🟣 Four ways to see A·B.</b> (1) Each cell is row · column. (2) Each <i>column</i> of C is A times the matching column of B. (3) Each <i>row</i> of C is the matching row of A times B. (4) C is the sum over t of (column t of A) × (row t of B), a sum of k "outer products". View (4) explains low-rank tricks: a rank-r matrix is a sum of just r outer products.</p>
      <p><b>Rules that do hold.</b> Associative: (AB)C = A(BC), so you may choose the cheaper bracketing. With shapes (1000×10)(10×1000)(1000×1): left-first costs 10M + 1M multiply-adds; right-first costs 10k + 10k. Same answer, about 550× less work. Distributive: A(B + C) = AB + AC. The identity I: AI = IA = A. Transpose of a product reverses the order: (AB)ᵀ = BᵀAᵀ.</p>
      <p><b>Speed in practice.</b> The schoolbook triple loop is O(n³). Strassen's trick gets about O(n<sup>2.81</sup>), but real libraries (BLAS, cuBLAS) win mostly by reading memory in cache-friendly blocks and using SIMD and GPU tensor cores. Pure Python loops are about 100–1000× slower than NumPy for the same maths, so loops are for learning and NumPy is for work.</p>
      <p><b>Floating point.</b> Different summation orders give slightly different results (addition of floats is not exactly associative), so GPU and CPU answers can differ in the last digits. Compare with a tolerance, never with <code>==</code>.</p>`,
    aiEra: `<p><b>🤖 In AI systems.</b> Training and running a transformer is, by operation count, mostly matrix multiplication: the Q/K/V projections, Q·Kᵀ, attention weights times V, and the feed-forward layers. Hardware is rated in "FLOPs" largely because of this, and the rough rule "a forward pass costs about 2 × parameters FLOPs per token" comes straight from n·k·m counting.</p>
      <p><b>Working with AI assistants.</b> The fastest way to review AI-written tensor code is to annotate the shape of every variable and check each product with the (n×k)(k×m) rule. Ask the assistant to add <code>assert x.shape == (batch, d_model)</code> lines. Also watch for silent broadcasting: <code>A * B</code> with shapes (3, 1) and (1, 4) produces a 3×4 result instead of an error, which hides bugs.</p>`,
    problems: [
      PR('matmul', {
        title: 'Matrix Multiply with a Shape Check', level: 'Medium', tags: ['matrices', 'matmul', 'shapes'], companies: ['NVIDIA', 'Meta', 'Google'],
        statement: `<p>Write <code>matmul(A, B)</code> for matrices stored as lists of rows. If the shapes are incompatible (columns of A ≠ rows of B), return an empty list <code>[]</code> instead of crashing. Otherwise return the product C = A·B.</p>`,
        constraints: `<p>1 ≤ rows, columns ≤ 100. Entries are floats. Results are compared with a small tolerance.</p>`,
        example: `<p><code>A = [[1, 2, 3], [4, 5, 6]]</code> (2×3), <code>B = [[7, 8], [9, 10], [11, 12]]</code> (3×2) → <code class="c-g">[[58, 64], [139, 154]]</code>. Why: cell (1,1) = 1×7 + 2×9 + 3×11 = 58.</p>
          <p><code>[[1, 2], [3, 4]]</code> (2×2) times <code>[[1, 2, 3]]</code> (1×3) → <code class="c-r">[]</code>: inner sizes 2 and 1 differ.</p>`,
        bruteWhy: `<p>The brute version rebuilds the whole column of B as a new list for every single answer cell, so the same column is copied n times. It gives the right numbers but wastes memory and time. A plain triple loop that indexes B[t][j] directly avoids the copies (and NumPy avoids the loops altogether).</p>`,
        mcq: { q: `A is 4×5 and B is 5×2. What is the shape of A·B, and how many multiplications does it take?`, options: ['4×2, 40', '5×5, 50', '4×2, 20', '2×4, 40'], answer: 0, explain: `Outer sizes give 4×2. Each of the 8 cells needs 5 multiplications: 8 × 5 = 40 (that is n·k·m = 4·5·2).` },
        hints: [
          `Hint 1: Check the shapes first: len(A[0]) must equal len(B). If not, return [].`,
          `Hint 2: The result has len(A) rows and len(B[0]) columns. Cell (i, j) = sum over t of A[i][t] * B[t][j].`,
          `Hint 3: Use three nested loops: i over rows of A, j over columns of B, t over the shared size. Start each cell at 0.`
        ],
        approach: `<p>Read the shapes n×k and k2×m. If k ≠ k2, return []. Otherwise make an n×m grid of zeros and fill each cell with the dot product of row i of A and column j of B using an inner loop over t.</p>`,
        dry: { head: ['cell', 'row of A', 'column of B', 'products', 'value'], rows: [['(1,1)', '[1,2,3]', '[7,9,11]', '7 + 18 + 33', '58'], ['(1,2)', '[1,2,3]', '[8,10,12]', '8 + 20 + 36', '64'], ['(2,1)', '[4,5,6]', '[7,9,11]', '28 + 45 + 66', '139'], ['(2,2)', '[4,5,6]', '[8,10,12]', '32 + 50 + 72', '154']] },
        complexity: `<p>O(n·k·m) time (O(n³) for square matrices), O(n·m) space for the result.</p>`,
        followUps: ['Given three matrices, how would you choose the cheapest bracketing?', 'Why does a GPU multiply large matrices so much faster than Python loops?']
      })
    ]
  });

  // ===================== TOPIC 5: TRANSPOSE, IDENTITY, DETERMINANT, INVERSE =====================
  topics.push({
    title: 'Transpose, Identity, Determinant and the Inverse',
    analogy: `<p>The <b>transpose</b> is turning a spreadsheet on its side: rows become columns. The <b>identity</b> is a "do nothing" button. The <b>inverse</b> is the <b>undo</b> button: if a matrix rotates your photo 30° clockwise, its inverse rotates it 30° back. But some edits cannot be undone. If you flatten a 3-D sculpture into a shadow, no button brings the depth back. Those matrices have <b>no inverse</b>, and the <b>determinant</b> is the warning light that tells you so.</p>`,
    explain: `<p><b>🟢 Transpose (Aᵀ): flip across the diagonal.</b> Entry (i, j) moves to (j, i). A 2×3 matrix becomes 3×2.</p>
      ${H.table(['A (2×3)', 'c1', 'c2', 'c3'], [['r1', '1', '2', '3'], ['r2', '4', '5', '6']])}
      ${H.table(['Aᵀ (3×2)', 'c1', 'c2'], [['r1', '1', '4'], ['r2', '2', '5'], ['r3', '3', '6']])}
      <p>Why you care: data usually comes as one example per <i>row</i>, but formulas often want one per <i>column</i>. Also <code>a · b</code> can be written as <code>aᵀb</code> (a 1×d row times a d×1 column), and <code>X·Xᵀ</code> gives all pairwise dot products. A matrix equal to its own transpose (like a similarity table) is called <b>symmetric</b>.</p>
      <h4>Identity (I): the "do nothing" matrix</h4>
      <p>1s on the diagonal, 0s elsewhere: <code>I = [[1, 0], [0, 1]]</code>. For any A of matching size, <code>A·I = I·A = A</code>. It plays the role of the number 1.</p>
      <h4>Determinant: does the matrix squash space?</h4>
      <p>For <code>A = [[a, b], [c, d]]</code>, <code>det(A) = a·d − b·c</code>. It is the factor by which A scales <b>area</b>. If det = 0, A flattens the plane onto a line, information is destroyed, and there is no undo.</p>
      ${H.table(['A', 'det', 'meaning'], [['[[2, 1], [1, 1]]', '2·1 − 1·1 = 1', 'keeps area, invertible'], ['[[3, 0], [0, 2]]', '6', 'areas ×6, invertible'], ['[[1, 2], [2, 4]]', '4 − 4 = 0', '<span class="c-r">squashes to a line: singular</span>']])}
      <h4>The inverse A⁻¹: the undo button</h4>
      <p><code>A⁻¹</code> is the matrix with <code>A⁻¹·A = A·A⁻¹ = I</code>. For 2×2 there is a recipe: <b>swap</b> the diagonal, <b>negate</b> the off-diagonal, <b>divide</b> everything by the determinant.</p>
      <p style="text-align:center"><code>[[a, b], [c, d]]⁻¹ = (1 / (ad − bc)) × [[d, −b], [−c, a]]</code></p>
      <p><b>Worked:</b> A = <code>[[2, 1], [1, 1]]</code>, det = 1.</p>
      ${H.table(['step', 'result'], [['swap diagonal (2 ↔ 1)', '[[1, 1], [1, 2]]'], ['negate off-diagonal', '[[1, −1], [−1, 2]]'], ['divide by det = 1', '<span class="c-g">A⁻¹ = [[1, −1], [−1, 2]]</span>'], ['check A·A⁻¹', '[[2−1, −2+2], [1−1, −1+2]] = [[1, 0], [0, 1]] ✅']])}
      <p><b>Undo in action:</b> A sends <code>[3, 2]</code> to <code>[2·3 + 1·2, 1·3 + 1·2] = [8, 5]</code>. A⁻¹ sends <code>[8, 5]</code> back to <code>[8 − 5, −8 + 10] = [3, 2]</code>. ✅</p>`,
    clues: [
      '"rows are examples, but the formula wants columns" → transpose',
      '"undo the transformation", "recover the original input" → inverse (if det ≠ 0)',
      '"singular", "not invertible", "det = 0", "columns are linearly dependent" → no inverse; information lost',
      '"solve A x = b" → mathematically x = A⁻¹ b, but in code use a solver, not an explicit inverse',
      '"symmetric matrix", "covariance", "similarity matrix" → A = Aᵀ',
      '"ill-conditioned", "nearly singular", "huge numbers in the inverse" → det close to 0, results unstable'
    ],
    code: [
      { lang: 'python', title: 'Transpose, determinant, 2×2 inverse and undo (runnable)', run: true, code: `def transpose(M):
    return [[M[i][j] for i in range(len(M))] for j in range(len(M[0]))]

def det2(M):
    (a, b), (c, d) = M
    return a * d - b * c

def inverse2(M):
    (a, b), (c, d) = M
    det = det2(M)
    if abs(det) < 1e-12:
        raise ValueError("singular matrix: det = 0, no inverse")
    return [[d / det, -b / det], [-c / det, a / det]]   # swap, negate, divide

def mat_vec(M, v):
    return [sum(m * x for m, x in zip(row, v)) for row in M]

def matmul(A, B):
    return [[sum(A[i][t] * B[t][j] for t in range(len(B))) for j in range(len(B[0]))] for i in range(len(A))]

print("transpose:", transpose([[1, 2, 3], [4, 5, 6]]))    # [[1, 4], [2, 5], [3, 6]]
A = [[2, 1], [1, 1]]
Ainv = inverse2(A)
print("det(A) =", det2(A), " A^-1 =", Ainv)               # 1, [[1, -1], [-1, 2]]
print("A . A^-1 =", matmul(A, Ainv))                      # identity
moved = mat_vec(A, [3, 2])
print("A [3,2] =", moved, " undo ->", mat_vec(Ainv, moved))   # [8, 5] -> [3, 2]

B = [[4, 7], [2, 6]]
print("inverse of", B, "=", [[round(x, 3) for x in r] for r in inverse2(B)])   # [[0.6,-0.7],[-0.2,0.4]]

try:
    inverse2([[1, 2], [2, 4]])
except ValueError as e:
    print("caught:", e)
` },
      { lang: 'python', title: 'NumPy version (shown, not run here)', code: `import numpy as np

A = np.array([[2.0, 1.0], [1.0, 1.0]])
print(A.T)                       # transpose
print(np.linalg.det(A))          # 1.0 (up to rounding)
print(np.linalg.inv(A))          # [[ 1. -1.] [-1.  2.]]
print(np.eye(2))                 # identity
b = np.array([8.0, 5.0])
print(np.linalg.solve(A, b))     # [3. 2.]  preferred over inv(A) @ b
` }
    ],
    codeTitle: ['Pure Python', 'NumPy version'],
    viz: {
      title: 'Build the inverse, then use it to undo',
      input: '2 1; 1 1 | 3 2',
      inputLabel: '2×2 matrix A | a point v. Try 1 2; 2 4 to see a singular matrix',
      gen: function (input) {
        var p = splitBar(input, 2, '2 1; 1 1 | 3 2');
        var A = parseMat(p[0], 'A'), v = parseVec(p[1], 'v');
        if (A.length !== 2 || A[0].length !== 2) throw new Error('Use a 2×2 matrix, e.g. 2 1; 1 1');
        if (v.length !== 2) throw new Error('v needs two numbers');
        if (A[0].concat(A[1], v).some(function (x) { return Math.abs(x) > 6; })) throw new Error('Keep numbers between -6 and 6');
        var a = A[0][0], b = A[0][1], c = A[1][0], d = A[1][1], det = a * d - b * c, F = [];
        F.push({ narr: 'Start with A. First, the <b>transpose</b> Aᵀ: flip across the diagonal, so row 1 becomes column 1.', parts: [
          { type: 'grid', label: 'A', rows: mrows(A), hl: { '0,1': 'cur', '1,0': 'win' } },
          { type: 'grid', label: 'Aᵀ (b and c swap places)', rows: mrows([[a, c], [b, d]]), hl: { '0,1': 'win', '1,0': 'cur' } }] });
        F.push({ narr: '<b>Determinant</b> = a·d − b·c = ' + r3(a) + '×' + r3(d) + ' − ' + r3(b) + '×' + r3(c) + ' = <b>' + r3(det) + '</b>. ' + (Math.abs(det) < 1e-12 ? '<span class="c-r">Zero: A squashes the plane flat. No inverse exists.</span>' : 'Not zero, so an undo button exists.'), parts: [
          { type: 'grid', label: 'A', rows: mrows(A), hl: { '0,0': 'ok', '1,1': 'ok', '0,1': 'bad', '1,0': 'bad' } },
          { type: 'vars', vals: { 'a·d': r3(a * d), 'b·c': r3(b * c), det: r3(det) }, hl: { det: Math.abs(det) < 1e-12 ? 'bad' : 'ok' } }] });
        if (Math.abs(det) < 1e-12) {
          var p1 = mv(A, [1, 0]), p2 = mv(A, [0, 1]), Av = mv(A, v);
          var sc0 = Math.max(1, Math.abs(p1[0]), Math.abs(p1[1]), Math.abs(p2[0]), Math.abs(p2[1]), Math.abs(Av[0]), Math.abs(Av[1]));
          F.push({ narr: 'Both columns ' + vs(p1) + ' and ' + vs(p2) + ' lie on one line. Every point lands on that line.', parts: [
            plane('columns of A', [{ id: 'c1', name: 'c1', x: p1[0], y: p1[1], cls: 'bad' }, { id: 'c2', name: 'c2', x: p2[0], y: p2[1], cls: 'bad' }], { scale: sc0 })] });
          // a direction that A sends to zero (the "null space"): (b, -a), or (d, -c), or anything if A is all zeros
          var nul = (b !== 0 || a !== 0) ? [b, -a] : (d !== 0 || c !== 0) ? [d, -c] : [1, 0];
          var w = [v[0] + nul[0], v[1] + nul[1]], Aw = mv(A, w);
          F.push({ narr: 'Two different inputs, ' + vs(v) + ' and ' + vs(w) + ', land on the same output ' + vs(Av) + '. Given only the output, you cannot know which input it came from, so no undo can exist.', parts: [
            plane('two inputs, one output', [{ id: 'v', name: 'v', x: v[0], y: v[1], cls: 'cur' }, { id: 'w', name: 'w', x: w[0], y: w[1], cls: 'cur' }, { id: 'Av', name: 'Av', x: Av[0], y: Av[1], cls: 'bad', tag: 'Av = Aw = ' + vs(Aw) }], { scale: Math.max(sc0, Math.abs(w[0]), Math.abs(w[1])) })] });
          return F;
        }
        F.push({ narr: 'Recipe step 1: <b>swap</b> the diagonal entries a and d.', parts: [
          { type: 'grid', label: 'after swap', rows: mrows([[d, b], [c, a]]), hl: { '0,0': 'cur', '1,1': 'cur' } }] });
        F.push({ narr: 'Step 2: <b>negate</b> the off-diagonal entries b and c.', parts: [
          { type: 'grid', label: 'after negate', rows: mrows([[d, -b], [-c, a]]), hl: { '0,1': 'cur', '1,0': 'cur' } }] });
        var I = [[d / det, -b / det], [-c / det, a / det]];
        F.push({ narr: 'Step 3: <b>divide</b> everything by det = ' + r3(det) + '. That is A⁻¹.', parts: [
          { type: 'grid', label: 'A⁻¹', rows: mrows(I), hl: { '0,0': 'ok', '0,1': 'ok', '1,0': 'ok', '1,1': 'ok' } }] });
        var P = [[a * I[0][0] + b * I[1][0], a * I[0][1] + b * I[1][1]], [c * I[0][0] + d * I[1][0], c * I[0][1] + d * I[1][1]]];
        F.push({ narr: 'Check: A · A⁻¹ should be the identity I (1s on the diagonal, 0s elsewhere). It is.', parts: [
          { type: 'grid', label: 'A', rows: mrows(A) }, { type: 'grid', label: 'A⁻¹', rows: mrows(I) },
          { type: 'grid', label: 'A · A⁻¹', rows: mrows(P), hl: { '0,0': 'ok', '1,1': 'ok' } }] });
        var Av2 = mv(A, v), back = mv(I, Av2);
        var sc = Math.max(1, Math.abs(Av2[0]), Math.abs(Av2[1]), Math.abs(v[0]), Math.abs(v[1]));
        F.push({ narr: 'Use it. A moves v = ' + vs(v) + ' to Av = <b>' + vs(Av2) + '</b>.', parts: [
          plane('apply A', [{ id: 'v', name: 'v', x: v[0], y: v[1], cls: 'cur' }, { id: 'Av', name: 'Av', x: Av2[0], y: Av2[1], cls: 'win' }], { scale: sc })] });
        F.push({ narr: 'A⁻¹ brings it straight back: A⁻¹(Av) = <b>' + vs(back) + '</b> = v. Undo worked.', parts: [
          plane('apply A⁻¹ (undo)', [{ id: 'Av', name: 'Av', x: Av2[0], y: Av2[1], cls: 'done' }, { id: 'back', name: 'v', x: back[0], y: back[1], from: 'Av', cls: 'ok' }], { scale: sc }),
          { type: 'vars', vals: { v: vs(v), 'Av': vs(Av2), 'A⁻¹Av': vs(back) }, hl: { 'A⁻¹Av': 'ok' } }] });
        return F;
      }
    },
    examples: [
      { title: 'Inverse of a stretch', html: `<p>S = <code>[[2, 0], [0, 4]]</code> stretches x by 2 and y by 4. Undo should shrink by 1/2 and 1/4. Recipe: det = 8; swap → [[4, 0], [0, 2]]; negate zeros → same; divide by 8 → <code>[[0.5, 0], [0, 0.25]]</code>. ✅</p>` },
      { title: 'Inverse of a rotation is its transpose', html: `<p>R = <code>[[0, −1], [1, 0]]</code> (rotate 90°). Rᵀ = <code>[[0, 1], [−1, 0]]</code> (rotate −90°). R·Rᵀ = I. For every rotation (and every "orthogonal" matrix), the inverse is just the transpose: no division, perfectly stable. This is why PCA and SVD love orthogonal matrices.</p>` },
      { title: 'A non-integer inverse', html: `<p>A = <code>[[4, 7], [2, 6]]</code>. det = 24 − 14 = 10. Swap and negate: [[6, −7], [−2, 4]]. Divide by 10: <code>[[0.6, −0.7], [−0.2, 0.4]]</code>. Check row 1 of A · column 1: 4×0.6 + 7×(−0.2) = 2.4 − 1.4 = 1 ✅.</p>`, code: { lang: 'python', run: true, code: `A = [[4, 7], [2, 6]]
(a, b), (c, d) = A
det = a * d - b * c
inv = [[d / det, -b / det], [-c / det, a / det]]
print("det:", det, "inverse:", inv)
check = [[sum(A[i][t] * inv[t][j] for t in range(2)) for j in range(2)] for i in range(2)]
print("A . inv =", [[round(x, 9) for x in r] for r in check])   # identity
` } },
      { title: 'Nearly singular = dangerous', html: `<p>A = <code>[[1, 1], [1, 1.0001]]</code>. det = 0.0001. The inverse has entries around 10,000. A tiny measurement error of 0.001 in the input becomes an error of about 10 in the answer. Such matrices are called <b>ill-conditioned</b>; in ML they appear when two features are almost copies of each other (e.g. height in cm and height in inches).</p>` }
    ],
    deepDive: `<p><b>🟣 Bigger inverses.</b> For 3×3 and up there is no short recipe worth memorising. The practical method is <b>Gauss–Jordan elimination</b>: write <code>[A | I]</code> side by side and row-reduce until the left half becomes I; the right half is then A⁻¹ (practice problem later in this module). Cost: O(n³).</p>
      <p><b>Do not invert to solve.</b> To solve <code>A x = b</code>, call a solver (<code>numpy.linalg.solve</code>) instead of computing <code>inv(A) @ b</code>. The solver does one elimination (LU factorisation), is about 2–3× cheaper, and is more accurate. Explicit inverses are rarely needed in ML code.</p>
      <p><b>Rules worth knowing.</b> (AB)⁻¹ = B⁻¹A⁻¹ (undo the last step first, like taking off shoes before socks). (Aᵀ)⁻¹ = (A⁻¹)ᵀ. det(AB) = det(A)·det(B). A square matrix is invertible ⇔ det ≠ 0 ⇔ its columns are independent ⇔ full rank ⇔ A x = 0 only for x = 0. These are all the same fact seen from different sides.</p>
      <p><b>Condition number.</b> The ratio of the biggest to smallest stretch of a matrix (from its SVD) measures how much input errors get amplified. A condition number of 10<sup>8</sup> with 16-digit floats leaves about 8 trustworthy digits. Regularisation such as ridge regression (adding λI before inverting) improves the condition number, which is one reason it works so well.</p>`,
    aiEra: `<p><b>🤖 In AI systems.</b> The classic closed-form linear regression is <code>w = (XᵀX)⁻¹Xᵀy</code>: transpose, multiply and invert in one line. In practice libraries solve it with QR or SVD for stability, and ridge regression adds λI to keep XᵀX invertible when features are correlated. Transposes appear everywhere in transformer code (<code>K.transpose(-2, -1)</code> in Q·Kᵀ), and orthogonal matrices (inverse = transpose) underpin rotary position embeddings (RoPE), which rotate query and key vectors.</p>
      <p><b>Working with AI assistants.</b> If an assistant writes <code>np.linalg.inv(A) @ b</code>, ask it to use <code>np.linalg.solve(A, b)</code> or <code>lstsq</code>. If it reports "Singular matrix", the fix is usually in the data (duplicate or constant features), not in the maths code. Ask it to check the rank and the condition number (<code>np.linalg.cond</code>) before trusting any result.</p>`,
    problems: [
      PR('inverse2', {
        title: 'Inverse of a 2×2 Matrix (or Report Singular)', level: 'Easy', tags: ['matrices', 'inverse', 'determinant'], companies: ['Apple', 'Unity'],
        statement: `<p>Write <code>inverse_2x2(M)</code>. Return the inverse of the 2×2 matrix as a list of two rows. If the matrix is singular (determinant 0, within 10<sup>−12</sup>), return an empty list <code>[]</code>.</p>`,
        constraints: `<p>Entries are floats with |x| ≤ 10<sup>6</sup>. Compared with a small tolerance.</p>`,
        example: `<p><code>[[4, 7], [2, 6]]</code> → <code class="c-g">[[0.6, −0.7], [−0.2, 0.4]]</code>. Why: det = 24 − 14 = 10; swap the diagonal and negate the rest gives [[6, −7], [−2, 4]]; divide by 10.</p>
          <p><code>[[1, 2], [2, 4]]</code> → <code class="c-r">[]</code> because det = 4 − 4 = 0.</p>`,
        bruteWhy: `<p>The brute version solves M x = [1, 0] and M x = [0, 1] separately to build the two columns. It works, but it repeats the same determinant work twice and is easy to get wrong when placing the columns. The direct formula is shorter and clearer. It also checks det == 0 exactly, which misses nearly singular floats.</p>`,
        mcq: { q: `What is the determinant of [[3, 1], [6, 2]], and what does it tell you?`, options: ['0: singular, no inverse', '12: invertible', '6: area doubles', '−1: mirrored'], answer: 0, explain: `3×2 − 1×6 = 0. Column 2 is a third of column 1, so the matrix squashes the plane onto a line and cannot be undone.` },
        hints: [
          `Hint 1: Compute det = a·d − b·c first. If it is (almost) zero, stop and return [].`,
          `Hint 2: Otherwise: swap a and d, negate b and c, then divide all four entries by det.`,
          `Hint 3: Use abs(det) &lt; 1e-12 rather than det == 0 so floating-point noise does not slip through. Return [[d/det, −b/det], [−c/det, a/det]].`
        ],
        approach: `<p>Unpack the four entries, compute the determinant, return [] if it is effectively zero, otherwise apply the swap–negate–divide recipe. You can check the answer by multiplying it with M and seeing the identity.</p>`,
        dry: { head: ['step', 'value'], rows: [['a, b, c, d', '4, 7, 2, 6'], ['det', '4·6 − 7·2 = 10'], ['swap & negate', '[[6, −7], [−2, 4]]'], ['divide by 10', '[[0.6, −0.7], [−0.2, 0.4]]']] },
        complexity: `<p>O(1): a handful of multiplications and divisions.</p>`,
        followUps: ['How would you invert a 3×3 matrix?', 'Why do numerical libraries prefer solve() over inv()?']
      })
    ]
  });

  // ===================== TOPIC 6: LINEAR SYSTEMS & GAUSSIAN ELIMINATION =====================
  function lineGraph(label, lines, sol, H) {
    // draws each line a·x + b·y = c as a segment between two far-apart points, plus an optional solution point
    H = H || 64;
    var R = 1, nodes = [], edges = [], hl = {}, tags = {}, ehl = {};
    if (sol) R = Math.max(R, Math.abs(sol[0]), Math.abs(sol[1]));
    R = Math.ceil(R * 1.6 + 1);
    var k = (H / 2 - 6) / R, cx = 50, cy = H / 2;
    function P(x, y) { return [r3(cx + k * x), r3(cy - k * y)]; }
    nodes.push({ id: 'O', label: 'O', x: cx, y: cy }); hl.O = 'done';
    lines.forEach(function (L, i) {
      var a = L[0], b = L[1], c = L[2], p1, p2;
      if (Math.abs(b) >= Math.abs(a)) { p1 = [-R, (c + a * R) / b]; p2 = [R, (c - a * R) / b]; }
      else { p1 = [(c + b * R) / a, -R]; p2 = [(c - b * R) / a, R]; }
      var q1 = P(p1[0], p1[1]), q2 = P(p2[0], p2[1]);
      nodes.push({ id: 'L' + i + 'a', label: 'eq' + (i + 1), x: q1[0], y: q1[1] }, { id: 'L' + i + 'b', label: '', x: q2[0], y: q2[1] });
      edges.push(['L' + i + 'a', 'L' + i + 'b']);
      hl['L' + i + 'a'] = L[3] || 'win'; hl['L' + i + 'b'] = L[3] || 'win'; ehl['L' + i + 'a-L' + i + 'b'] = L[3] || 'win';
      tags['L' + i + 'a'] = r3(a) + 'x + ' + r3(b) + 'y = ' + r3(c);
    });
    if (sol) { var s = P(sol[0], sol[1]); nodes.push({ id: 'S', label: '★', x: s[0], y: s[1] }); hl.S = 'sel'; tags.S = vs(sol); }
    return { type: 'graph', label: label, directed: false, height: H, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags };
  }

  topics.push({
    title: 'Linear Systems and Gaussian Elimination',
    analogy: `<p>A puzzle: "2 coffees and 1 cake cost £10. 1 coffee and 1 cake cost £7. What does each cost?" You subtract the second order from the first: the cake cancels, so 1 coffee = £3, and then the cake is £4. That trick, <b>subtract a multiple of one equation from another to cancel an unknown</b>, is Gaussian elimination. With three or a thousand unknowns the trick is identical; you just repeat it in a tidy order.</p>`,
    explain: `<p><b>🟢 A linear system</b> is several equations in which unknowns are only multiplied by numbers and added (no squares, no x·y). In matrix form it is <code>A x = b</code>: A holds the coefficients, x the unknowns, b the right-hand sides.</p>
      <p><b>The picture (2 unknowns).</b> Each equation is a straight line. The solution is where the lines cross. Two lines can cross once (one answer), be parallel (no answer) or be the same line (infinitely many answers). Those three cases are all there is.</p>
      <h4>Worked: three equations, three unknowns</h4>
      ${H.table(['equation', 'x', 'y', 'z', '= b'], [['R1', '2', '1', '−1', '8'], ['R2', '−3', '−1', '2', '−11'], ['R3', '−2', '1', '2', '−3']])}
      <p>We write the numbers only, as an <b>augmented matrix</b> <code>[A | b]</code>, and use three legal moves that never change the answer: swap two rows, multiply a row by a non-zero number, add a multiple of one row to another.</p>
      <p><b>Step 1: clear x below row 1.</b> R2 ← R2 + 1.5·R1 and R3 ← R3 + 1·R1.</p>
      ${H.table(['row', 'x', 'y', 'z', 'b'], [['R1', '2', '1', '−1', '8'], ['R2', '<span class="c-g">0</span>', '0.5', '0.5', '1'], ['R3', '<span class="c-g">0</span>', '2', '1', '5']])}
      <p><b>Step 2: clear y below row 2.</b> R3 ← R3 − 4·R2.</p>
      ${H.table(['row', 'x', 'y', 'z', 'b'], [['R1', '2', '1', '−1', '8'], ['R2', '0', '0.5', '0.5', '1'], ['R3', '0', '<span class="c-g">0</span>', '−1', '1']])}
      <p>This staircase shape is called <b>upper triangular</b> (or row echelon form). The first non-zero number in each row is its <b>pivot</b>.</p>
      <p><b>Step 3: back substitution, bottom to top.</b> R3: −z = 1 → <b>z = −1</b>. R2: 0.5y + 0.5(−1) = 1 → <b>y = 3</b>. R1: 2x + 3 − (−1) = 8 → <b>x = 2</b>. Check in the original R2: −6 − 3 − 2 = −11 ✅.</p>
      <p><b>When it fails.</b> If you run out of non-zero pivots (a whole column below the diagonal is 0), the matrix is singular: either no solution or infinitely many. You will see a row like <code>0 0 0 | 5</code> (impossible: no solution) or <code>0 0 0 | 0</code> (always true: infinitely many).</p>
      <p><b>Partial pivoting.</b> Before clearing a column, swap up the row with the <i>biggest</i> absolute value in that column. It avoids dividing by zero and keeps rounding errors small. Every serious solver does it.</p>`,
    clues: [
      '"solve for the unknowns", "n equations in n unknowns", "A x = b" → Gaussian elimination (np.linalg.solve)',
      '"no unique solution", "parallel lines", "dependent equations" → a zero pivot; singular A',
      '"more equations than unknowns", "best fit", "noisy measurements" → least squares (np.linalg.lstsq), not exact solve',
      '"row echelon form", "pivot", "back substitution" → this algorithm by name',
      '"cost to solve a dense system" → O(n³) to eliminate, O(n²) per extra right-hand side if you keep the LU factors',
      '"rank of a matrix" → number of non-zero pivots after elimination'
    ],
    code: [
      { lang: 'python', title: 'Gaussian elimination with partial pivoting (runnable)', run: true, code: `def solve(A, b, show=False):
    n = len(A)
    M = [list(map(float, A[i])) + [float(b[i])] for i in range(n)]   # augmented [A | b]
    for col in range(n):
        piv = max(range(col, n), key=lambda r: abs(M[r][col]))       # partial pivoting
        if abs(M[piv][col]) < 1e-12:
            raise ValueError("singular system: no unique solution")
        M[col], M[piv] = M[piv], M[col]
        for r in range(col + 1, n):
            f = M[r][col] / M[col][col]
            M[r] = [x - f * y for x, y in zip(M[r], M[col])]          # R_r <- R_r - f * R_col
        if show:
            print(f"after column {col}:", [[round(x, 3) for x in row] for row in M])
    x = [0.0] * n
    for i in range(n - 1, -1, -1):                                    # back substitution
        x[i] = (M[i][n] - sum(M[i][j] * x[j] for j in range(i + 1, n))) / M[i][i]
    return x

A = [[2, 1, -1], [-3, -1, 2], [-2, 1, 2]]
b = [8, -11, -3]
x = solve(A, b, show=True)
print("x, y, z =", [round(v, 6) for v in x])                          # [2.0, 3.0, -1.0]
print("check A x =", [round(sum(a * v for a, v in zip(row, x)), 6) for row in A])   # equals b

print("coffee & cake:", solve([[2, 1], [1, 1]], [10, 7]))             # [3.0, 4.0]
try:
    solve([[1, 1], [2, 2]], [3, 7])                                   # parallel lines
except ValueError as e:
    print("caught:", e)
` },
      { lang: 'python', title: 'NumPy version (shown, not run here)', code: `import numpy as np

A = np.array([[2, 1, -1], [-3, -1, 2], [-2, 1, 2]], dtype=float)
b = np.array([8, -11, -3], dtype=float)
x = np.linalg.solve(A, b)          # LU factorisation with partial pivoting under the hood
print(x)                           # [ 2.  3. -1.]
print(np.allclose(A @ x, b))       # True

# More equations than unknowns (noisy data): least squares instead of an exact solve
X = np.array([[1, 1], [1, 2], [1, 3]], dtype=float)
y = np.array([2.1, 3.9, 6.2])
w, *_ = np.linalg.lstsq(X, y, rcond=None)
print(w)                           # intercept and slope of the best-fit line
` }
    ],
    codeTitle: ['Pure Python', 'NumPy version'],
    viz: [{
      title: 'Gaussian elimination on the augmented matrix',
      input: '2 1 -1 8; -3 -1 2 -11; -2 1 2 -3',
      inputLabel: 'rows of [A | b] separated by ; (last number of each row is b). Up to 4 unknowns',
      gen: function (input) {
        var M = parseMat(input, '[A | b]'), n = M.length, F = [], i, j;
        if (M[0].length !== n + 1) throw new Error('Each row needs ' + (n + 1) + ' numbers: ' + n + ' coefficients and the right-hand side');
        if (n > 4) throw new Error('Use at most 4 equations');
        var head = []; for (j = 0; j < n; j++) head.push('x' + (j + 1)); head.push('| b');
        var rh = M.map(function (_, r) { return 'R' + (r + 1); });
        function G(lbl, hl) { return { type: 'grid', label: lbl, rows: mrows(M), colHead: head, rowHead: rh.slice(), hl: hl || {} }; }
        F.push({ narr: 'Write the system as an augmented matrix [A | b]: one row per equation, one column per unknown, plus the right-hand side.', parts: [G('[A | b]')] });
        for (var col = 0; col < n; col++) {
          var piv = col;
          for (i = col + 1; i < n; i++) if (Math.abs(M[i][col]) > Math.abs(M[piv][col])) piv = i;
          var hp = {}; for (i = col; i < n; i++) hp[i + ',' + col] = i === piv ? 'sel' : 'win';
          if (Math.abs(M[piv][col]) < 1e-12) {
            F.push({ narr: '<span class="c-r">Column x' + (col + 1) + ' has only zeros from row ' + (col + 1) + ' down.</span> No pivot, so there is no unique solution (parallel planes / dependent equations).', parts: [G('no pivot available', hp)] });
            var last = M[n - 1], allZero = last.slice(0, n).every(function (x) { return Math.abs(x) < 1e-9; });
            F.push({ narr: allZero ? (Math.abs(last[n]) < 1e-9 ? 'A row reads 0 = 0: always true. Infinitely many solutions.' : 'A row reads 0 = ' + r3(last[n]) + ': impossible. No solution at all.') : 'The matrix is singular: either no solution or infinitely many.', parts: [{ type: 'text', html: '<p>Singular A: det(A) = 0, rank &lt; ' + n + '.</p>' }] });
            return F;
          }
          F.push({ narr: 'Column x' + (col + 1) + ': choose the pivot. The biggest absolute value at or below row ' + (col + 1) + ' is <b>' + r3(M[piv][col]) + '</b> in R' + (piv + 1) + ' (partial pivoting keeps rounding errors small).', parts: [G('pick the pivot', hp)] });
          if (piv !== col) {
            var t = M[col]; M[col] = M[piv]; M[piv] = t;
            var hs = {}; for (j = 0; j <= n; j++) { hs[col + ',' + j] = 'cur'; hs[piv + ',' + j] = 'cur'; }
            F.push({ narr: 'Swap R' + (col + 1) + ' and R' + (piv + 1) + ' so the pivot sits on the diagonal. Swapping equations never changes the answer.', parts: [G('after the swap', hs)] });
          }
          for (i = col + 1; i < n; i++) {
            var f = M[i][col] / M[col][col];
            if (Math.abs(f) < 1e-15) continue;
            for (j = col; j <= n; j++) M[i][j] -= f * M[col][j];
            M[i][col] = 0;
            var he = {}; for (j = 0; j <= n; j++) { he[col + ',' + j] = 'win'; he[i + ',' + j] = 'cur'; } he[i + ',' + col] = 'ok';
            F.push({ narr: 'R' + (i + 1) + ' ← R' + (i + 1) + ' − (' + r3(f) + ') × R' + (col + 1) + '. Factor = ' + r3(M[i][col] + f * M[col][col]) + ' / ' + r3(M[col][col]) + ', chosen so x' + (col + 1) + ' cancels to <b>0</b>.', parts: [G('eliminate below the pivot', he)] });
          }
        }
        F.push({ narr: 'Upper triangular: zeros below the diagonal. Now solve from the bottom row upwards (back substitution).', parts: [G('staircase form')] });
        var x = []; for (i = 0; i < n; i++) x.push(0);
        for (i = n - 1; i >= 0; i--) {
          var s = M[i][n], txt = r3(M[i][n]);
          for (j = i + 1; j < n; j++) { s -= M[i][j] * x[j]; if (Math.abs(M[i][j]) > 1e-12) txt += ' − ' + r3(M[i][j]) + '×' + r3(x[j]); }
          x[i] = s / M[i][i];
          var vals = {}; for (j = i; j < n; j++) vals['x' + (j + 1)] = r3(x[j]);
          var hr = {}; for (j = 0; j <= n; j++) hr[i + ',' + j] = 'cur';
          var hv = {}; hv['x' + (i + 1)] = 'ok';
          F.push({ narr: 'R' + (i + 1) + ': x' + (i + 1) + ' = (' + txt + ') / ' + r3(M[i][i]) + ' = <b>' + r3(x[i]) + '</b>.', parts: [G('back substitution', hr), { type: 'vars', vals: vals, hl: hv }] });
        }
        F.push({ narr: 'Solution: <b>' + x.map(function (v, k) { return 'x' + (k + 1) + ' = ' + r3(v); }).join(', ') + '</b>. Always check by putting it back into the original equations.', parts: [{ type: 'array', label: 'x', values: x.map(r3), idxLabels: x.map(function (_, k) { return 'x' + (k + 1); }) }] });
        return F;
      }
    }, {
      title: 'Two equations = two lines; elimination keeps the crossing point',
      input: '1 1 10; 1 -1 2',
      inputLabel: 'two equations a b c meaning a·x + b·y = c, separated by ;',
      gen: function (input) {
        var M = parseMat(input, 'the equations');
        if (M.length !== 2 || M[0].length !== 3) throw new Error('Two rows of three numbers, e.g. 1 1 10; 1 -1 2');
        if (M[0].concat(M[1]).some(function (x) { return Math.abs(x) > 50; })) throw new Error('Keep numbers between -50 and 50');
        var a = M[0], b = M[1], det = a[0] * b[1] - a[1] * b[0], F = [];
        if ((a[0] === 0 && a[1] === 0) || (b[0] === 0 && b[1] === 0)) throw new Error('Each equation needs a non-zero x or y coefficient');
        F.push({ narr: 'Equation 1, ' + r3(a[0]) + 'x + ' + r3(a[1]) + 'y = ' + r3(a[2]) + ', is a straight line: every point on it satisfies the equation.', parts: [lineGraph('equation 1', [[a[0], a[1], a[2], 'win']])] });
        if (Math.abs(det) < 1e-12) {
          F.push({ narr: 'Equation 2 has the same slope. The lines are <span class="c-r">parallel</span> (or identical), so there is no single crossing point.', parts: [lineGraph('parallel lines', [[a[0], a[1], a[2], 'win'], [b[0], b[1], b[2], 'bad']])] });
          F.push({ narr: 'Algebra agrees: the determinant ' + r3(a[0]) + '×' + r3(b[1]) + ' − ' + r3(a[1]) + '×' + r3(b[0]) + ' = 0.', parts: [{ type: 'vars', vals: { det: 0 }, hl: { det: 'bad' } }] });
          F.push({ narr: 'Elimination would produce a row 0x + 0y = something. If that something is 0, the lines are the same (infinitely many answers); otherwise there is no answer.', parts: [{ type: 'text', html: '<p>Singular system.</p>' }] });
          return F;
        }
        var sol = [(a[2] * b[1] - a[1] * b[2]) / det, (a[0] * b[2] - a[2] * b[0]) / det];
        F.push({ narr: 'Equation 2 is another line. The answer is the single point on <b>both</b> lines: where they cross.', parts: [lineGraph('two lines', [[a[0], a[1], a[2], 'win'], [b[0], b[1], b[2], 'cur']], sol)] });
        var useA = Math.abs(a[0]) > 1e-12, f, nb;
        if (useA) { f = b[0] / a[0]; nb = [0, b[1] - f * a[1], b[2] - f * a[2]]; }
        else { f = 0; nb = b.slice(); var tmp = a; a = b; b = tmp; nb = [0, b[1], b[2]]; }
        F.push({ narr: 'Elimination: equation 2 ← equation 2 − (' + r3(f) + ') × equation 1. x cancels: ' + r3(nb[1]) + 'y = ' + r3(nb[2]) + '. That is a <b>flat</b> line, but it still passes through the same crossing point.', parts: [lineGraph('after elimination', [[a[0], a[1], a[2], 'win'], [0, nb[1], nb[2], 'ok']], sol)] });
        F.push({ narr: 'Read off y = ' + r3(nb[2]) + ' / ' + r3(nb[1]) + ' = <b>' + r3(sol[1]) + '</b>. Then substitute into equation 1 to get x = <b>' + r3(sol[0]) + '</b>.', parts: [lineGraph('solution', [[a[0], a[1], a[2], 'done'], [0, nb[1], nb[2], 'done']], sol), { type: 'vars', vals: { x: r3(sol[0]), y: r3(sol[1]) }, hl: { x: 'sel', y: 'sel' } }] });
        return F;
      }
    }],
    examples: [
      { title: 'Two unknowns by elimination', html: `<p>x + y = 10 and x − y = 2. Subtract: (x + y) − (x − y) = 10 − 2 → 2y = 8 → y = 4, then x = 6. In the matrix picture: R2 ← R2 − R1 gives [0, −2 | −8].</p>` },
      { title: 'A row swap is needed', html: `<p>0x + y = 3 and x + 0y = 7. The first pivot is 0, so we cannot divide by it. Swap the rows: x = 7, y = 3. Partial pivoting does this automatically by picking the biggest entry in the column.</p>` },
      { title: 'No solution vs infinitely many', html: `<p>x + y = 3 and 2x + 2y = 7: R2 − 2·R1 gives 0 = 1, impossible (parallel lines). x + y = 3 and 2x + 2y = 6: R2 − 2·R1 gives 0 = 0 (same line, every point on it works). Both have det = 0.</p>` },
      { title: 'Fitting a line through two points', html: `<p>Find y = m·x + c through (1, 3) and (3, 7). Equations: m + c = 3 and 3m + c = 7. Subtract: 2m = 4, so m = 2 and c = 1. With 1,000 noisy points instead of 2, the system has no exact solution, and least squares finds the best compromise: that is linear regression.</p>`, code: { lang: 'python', run: true, code: `# y = m*x + c through (1, 3) and (3, 7): unknowns m, c
A = [[1, 1], [3, 1]]
b = [3, 7]
f = A[1][0] / A[0][0]                       # eliminate m from row 2
row2 = [A[1][j] - f * A[0][j] for j in range(2)]
b2 = b[1] - f * b[0]
c = b2 / row2[1]                            # back substitution
m = (b[0] - A[0][1] * c) / A[0][0]
print("m =", m, " c =", c)                  # 2.0, 1.0
` } }
    ],
    deepDive: `<p><b>🟣 LU factorisation.</b> Elimination secretly writes <code>A = L·U</code>: U is the staircase matrix you end with, and L stores the factors you used (with 1s on its diagonal). With pivoting it is <code>P·A = L·U</code>. Once you have L and U, solving for a new right-hand side b costs only O(n²): solve L y = b (forward), then U x = y (back). That is how libraries handle many b's quickly.</p>
      <p><b>Cost.</b> Eliminating an n×n system takes about ⅔·n³ operations. n = 1,000 is under a second; n = 100,000 dense is out of reach (and would need 80 GB just to store A). Large sparse systems (most entries 0) use iterative methods such as conjugate gradient instead.</p>
      <p><b>Why pivoting matters numerically.</b> Solve 0.0001x + y = 1, x + y = 2 without swapping: the factor is 10,000, which magnifies rounding errors and can give x ≈ 0 instead of the true x ≈ 1.0001 in low precision. Swapping so the 1 is the pivot fixes it. This is a classic exam and interview example.</p>
      <p><b>Over- and under-determined systems.</b> More equations than unknowns (tall A): usually no exact answer; least squares minimises ‖Ax − b‖² by solving the "normal equations" AᵀA x = Aᵀb (better: QR or SVD). Fewer equations than unknowns (wide A): infinitely many answers; the minimum-length one comes from the pseudo-inverse, again via SVD.</p>`,
    aiEra: `<p><b>🤖 In AI systems.</b> You will rarely hand-write elimination at work, but you will meet its results everywhere: linear regression and ridge regression are linear solves, Gaussian processes and Kalman filters solve systems at every step, and second-order optimisers approximate a solve with the Hessian. Knowing that "solve" is O(n³) explains why these methods do not scale to millions of parameters, and why deep learning uses gradient descent instead.</p>
      <p><b>Working with AI assistants.</b> Ask for <code>np.linalg.solve</code> or <code>scipy.linalg.lstsq</code> rather than explicit inverses. For a hand-written solver, test it on three systems you know the answer to: a unique solution, a row-swap case (zero first pivot) and a singular case. Assistants frequently forget partial pivoting or back-substitute in the wrong order, and these three tests catch both.</p>`,
    problems: [
      PR('solve', {
        title: 'Solve a Linear System with Gaussian Elimination', level: 'Medium', tags: ['linear systems', 'gaussian elimination'], companies: ['MathWorks', 'Bloomberg', 'Tesla'],
        statement: `<p>Write <code>solve_linear_system(A, b)</code> for a square n×n matrix A and a list b of length n. Return the list x with A·x = b. If the system has no unique solution (a pivot is effectively zero, below 10<sup>−12</sup>), return <code>[]</code>. Use Gaussian elimination with partial pivoting and back substitution.</p>`,
        constraints: `<p>1 ≤ n ≤ 50. Entries are floats with |x| ≤ 10<sup>4</sup>. Answers compared with tolerance about 10<sup>−5</sup>.</p>`,
        example: `<p>A = <code>[[2, 1, −1], [−3, −1, 2], [−2, 1, 2]]</code>, b = <code>[8, −11, −3]</code> → <code class="c-g">[2, 3, −1]</code>. Check row 1: 2·2 + 3 − (−1) = 8 ✅.</p>
          <p>A = <code>[[2, 3], [4, 6]]</code>, b = <code>[5, 10]</code> → <code class="c-r">[]</code>: row 2 is twice row 1, so the lines are the same and there is no unique answer.</p>`,
        bruteWhy: `<p>Guessing whole numbers from −10 to 10 for every unknown costs 21<sup>n</sup> checks (9,261 for n = 3, 10<sup>13</sup> for n = 10) and misses fractional answers entirely (it fails on [[4]]·x = [10], where x = 2.5). It even "solves" a singular system by returning just one of infinitely many answers. Elimination is O(n³) and exact up to rounding.</p>`,
        mcq: { q: `During elimination the remaining rows look like <code>[0, 0, 0 | 4]</code>. What does that mean?`, options: ['No solution: the equations contradict each other', 'Infinitely many solutions', 'x = 4', 'You made an arithmetic mistake, always'], answer: 0, explain: `The row says 0x + 0y + 0z = 4, i.e. 0 = 4. No values can satisfy that, so the system is inconsistent (think parallel lines). A row 0 = 0 would mean infinitely many solutions.` },
        hints: [
          `Hint 1: Work on a copy of the augmented matrix [A | b]: n rows, n + 1 columns. Clear each column below its diagonal, left to right.`,
          `Hint 2: For column c: pick the row r ≥ c with the largest |M[r][c]|, swap it to row c, then for every row below do row −= (row[c] / pivot) × pivot row.`,
          `Hint 3: If the best pivot is below 1e-12 return []. After the forward pass, go from the last row up: x[i] = (b_i − Σ M[i][j]·x[j] for j &gt; i) / M[i][i].`
        ],
        approach: `<p>Build the augmented matrix. For each column, choose the largest-magnitude pivot (partial pivoting), swap it up, and subtract multiples of the pivot row from every row below to create zeros. If no usable pivot exists, return []. Finish with back substitution from the bottom row to the top.</p>`,
        dry: { head: ['step', 'operation', 'key rows after'], rows: [['col 1 pivot', 'swap R1 ↔ R2 (|−3| is largest)', 'R1 = [−3, −1, 2 | −11]'], ['clear col 1', 'R2 −= (−2/3)R1, R3 −= (2/3)R1', 'R2 = [0, 1/3, 1/3 | 2/3], R3 = [0, 5/3, 2/3 | 13/3]'], ['col 2 pivot', 'swap R2 ↔ R3 (5/3 &gt; 1/3)', 'R2 = [0, 5/3, 2/3 | 13/3]'], ['clear col 2', 'R3 −= (1/5)R2', 'R3 = [0, 0, 0.2 | −0.2]'], ['back subst.', 'z = −1, y = 3, x = 2', 'x = [2, 3, −1]']] },
        complexity: `<p>O(n³) time for elimination (about ⅔n³ operations) plus O(n²) for back substitution; O(n²) space for the augmented copy.</p>`,
        followUps: ['How would you reuse the work to solve for many different b vectors?', 'What changes if there are more equations than unknowns?']
      })
    ]
  });

  // ===================== TOPIC 7: EIGENVECTORS & POWER ITERATION =====================
  topics.push({
    title: 'Eigenvectors and Eigenvalues: Directions That Only Stretch',
    analogy: `<p>Stretch a rubber sheet with a picture of arrows drawn on it. Most arrows get <b>turned</b> as well as stretched. But a few special arrows stay on their own line; they only get longer or shorter (or flip). Those special directions are the <b>eigenvectors</b> ("eigen" is German for "own": the matrix's own directions). How much each one stretches is its <b>eigenvalue</b>. Think of a stream flowing along a river: leaves dropped anywhere slowly line up with the main current. That current is the top eigenvector.</p>`,
    explain: `<p><b>🟢 The definition in one line.</b> v is an eigenvector of A with eigenvalue λ (lambda) if <code>A v = λ v</code>: applying A gives the same arrow, just scaled by λ.</p>
      <p><b>Worked: A = [[2, 1], [1, 2]].</b> Try three arrows:</p>
      ${H.table(['v', 'A v', 'same line as v?', 'λ'], [['[1, 0]', '[2, 1]', '<span class="c-r">no, it turned</span>', '–'], ['[1, 1]', '[3, 3]', '<span class="c-g">yes, 3 × v</span>', '3'], ['[1, −1]', '[1, −1]', '<span class="c-g">yes, 1 × v</span>', '1']])}
      <p>So A stretches the diagonal direction [1, 1] by 3 and leaves the direction [1, −1] alone. Every other arrow is a mix of these two, so A pulls it towards the [1, 1] line.</p>
      <h4>Finding them for 2×2 (by hand)</h4>
      <p>Eigenvalues solve <code>λ² − (trace)·λ + det = 0</code>, where trace = a + d (sum of the diagonal) and det = ad − bc. For our A: trace = 4, det = 3, so λ² − 4λ + 3 = 0 → (λ − 3)(λ − 1) = 0 → <b>λ = 3 or 1</b>. Useful checks: eigenvalues add up to the trace (3 + 1 = 4) and multiply to the determinant (3 × 1 = 3).</p>
      <h4>Power iteration: the "keep applying it" trick</h4>
      <p>Start with almost any vector, multiply by A, rescale to length 1, repeat. The direction with the biggest |λ| grows fastest, so it takes over:</p>
      ${H.table(['step', 'v (rescaled)', 'A v', 'estimate of λ'], [['0', '[1, 0]', '[2, 1]', '2.0'], ['1', '[0.894, 0.447]', '[2.236, 1.789]', '2.8'], ['2', '[0.781, 0.625]', '[2.186, 2.030]', '2.976'], ['3', '[0.733, 0.680]', '[2.146, 2.094]', '2.997'], ['…', '→ [0.707, 0.707]', '', '→ 3']])}
      <p>The estimate is the <b>Rayleigh quotient</b> <code>λ ≈ (v · A v) / (v · v)</code>. Each step shrinks the "wrong" part by the ratio of eigenvalues (here 1/3), so it converges fast when the top eigenvalue clearly beats the second.</p>
      <p><b>Not every matrix has real eigenvectors.</b> A 90° rotation turns <i>every</i> arrow, so no real direction stays put (its eigenvalues are the complex numbers ±i). Symmetric matrices (A = Aᵀ), such as covariance and similarity matrices, are the friendly case: real eigenvalues and eigenvectors at right angles to each other. Those are the ones ML uses most.</p>`,
    clues: [
      '"the main direction", "dominant mode", "most important pattern" → top eigenvector',
      '"A v = λ v", "directions that are only scaled" → eigenvectors by definition',
      '"repeatedly apply the matrix until it settles" → power iteration (PageRank, Markov chain steady state)',
      '"covariance matrix", "PCA", "spectral clustering" → eigenvectors of a symmetric matrix',
      '"will the repeated process blow up or die out?" → look at the largest |eigenvalue| (&gt; 1 grows, &lt; 1 shrinks)',
      '"trace", "determinant" → sum and product of eigenvalues'
    ],
    code: [
      { lang: 'python', title: 'Power iteration for the top eigenvector (runnable)', run: true, code: `import math

def mat_vec(M, v):
    return [sum(m * x for m, x in zip(row, v)) for row in M]

def power_iteration(M, iters=50, show=0):
    v = [1.0] + [0.0] * (len(M) - 1)            # any start that is not exactly orthogonal to the answer
    lam = 0.0
    for k in range(iters):
        w = mat_vec(M, v)
        lam = sum(a * b for a, b in zip(v, w))   # Rayleigh quotient (v has length 1)
        n = math.sqrt(sum(x * x for x in w))
        v = [x / n for x in w]                   # rescale so numbers do not explode
        if k < show:
            print(f"step {k}: lambda ~ {lam:.4f}  v = {[round(x, 3) for x in v]}")
    return lam, v

A = [[2, 1], [1, 2]]
lam, v = power_iteration(A, show=4)
print("top eigenvalue:", round(lam, 6), " eigenvector:", [round(x, 4) for x in v])   # 3, [0.7071, 0.7071]
print("check A v = lambda v:", [round(x, 6) for x in mat_vec(A, v)], [round(lam * x, 6) for x in v])

# closed form for 2x2: lambda^2 - trace*lambda + det = 0
(a, b), (c, d) = A
tr, det = a + d, a * d - b * c
disc = math.sqrt(tr * tr - 4 * det)
print("both eigenvalues:", (tr + disc) / 2, (tr - disc) / 2)                     # 3.0 1.0

# A 3x3 symmetric example (think: a tiny covariance matrix)
C = [[4, 2, 0], [2, 3, 1], [0, 1, 2]]
lam, v = power_iteration(C, iters=200)
print("3x3 top eigenvalue:", round(lam, 4), "direction:", [round(x, 3) for x in v])
` },
      { lang: 'python', title: 'NumPy version (shown, not run here)', code: `import numpy as np

A = np.array([[2.0, 1.0], [1.0, 2.0]])
vals, vecs = np.linalg.eigh(A)     # eigh: for symmetric matrices, sorted ascending
print(vals)                        # [1. 3.]
print(vecs[:, -1])                 # eigenvector for 3 (sign may be flipped): [0.707 0.707]
print(np.allclose(A @ vecs[:, -1], vals[-1] * vecs[:, -1]))   # True
# np.linalg.eig works for non-symmetric matrices too (may return complex numbers)
` }
    ],
    codeTitle: ['Pure Python', 'NumPy version'],
    viz: {
      title: 'Power iteration: any arrow swings onto the top eigenvector',
      input: '2 1; 1 2 | 1 0',
      inputLabel: '2×2 matrix | start vector. Try 3 0; 0 1 | 1 1 or 1 2; 2 1 | 1 0 or 0 -1; 1 0 | 1 0 (a rotation)',
      gen: function (input) {
        var p = splitBar(input, 2, '2 1; 1 2 | 1 0');
        var A = parseMat(p[0], 'the matrix'), v = parseVec(p[1], 'the start vector');
        if (A.length !== 2 || A[0].length !== 2) throw new Error('Use a 2×2 matrix');
        if (v.length !== 2 || normv(v) === 0) throw new Error('Start vector: two numbers, not both zero');
        if (A[0].concat(A[1]).some(function (x) { return Math.abs(x) > 10; })) throw new Error('Keep matrix entries between -10 and 10');
        var a = A[0][0], b = A[0][1], c = A[1][0], d = A[1][1], tr = a + d, det = a * d - b * c, disc = tr * tr - 4 * det, F = [];
        var real = disc >= -1e-12, l1, l2, e1 = null;
        if (real) {
          var sq = Math.sqrt(Math.max(0, disc)); l1 = (tr + sq) / 2; l2 = (tr - sq) / 2;
          if (Math.abs(l2) > Math.abs(l1)) { var t = l1; l1 = l2; l2 = t; }
          // eigenvector for l1: (b, l1 - a) or (l1 - d, c)
          e1 = Math.abs(b) > 1e-12 ? [b, l1 - a] : Math.abs(c) > 1e-12 ? [l1 - d, c] : (Math.abs(a - l1) < 1e-12 ? [1, 0] : [0, 1]);
          var ne = normv(e1); e1 = [e1[0] / ne, e1[1] / ne];
        }
        var tests = [[1, 0], [0, 1], [1, 1], [1, -1]].map(function (u) { var w = mv(A, u); return { u: u, w: w, cross: u[0] * w[1] - u[1] * w[0] }; });
        var sc = 1; tests.forEach(function (q) { sc = Math.max(sc, Math.abs(q.w[0]), Math.abs(q.w[1])); });
        F.push({ narr: 'Most arrows get <b>turned</b> by A. Here are four test arrows (blue) and where A sends them (green if they stayed on their own line, red if they turned).', parts: [
          plane('test arrows u and A·u', [].concat.apply([], tests.map(function (q, i) { var same = Math.abs(q.cross) < 1e-9; return [{ id: 'u' + i, name: 'u' + (i + 1), x: q.u[0], y: q.u[1], cls: 'win' }, { id: 'w' + i, name: 'Au' + (i + 1), x: q.w[0], y: q.w[1], cls: same ? 'ok' : 'bad' }]; })), { scale: sc, height: 70 }),
          { type: 'table', label: 'does A·u stay on u\'s line?', columns: ['u', 'A·u', 'same line?'], rows: tests.map(function (q) { return [vs(q.u), vs(q.w), Math.abs(q.cross) < 1e-9 ? 'yes: eigenvector' : 'no, turned']; }) }] });
        F.push({ narr: real ? 'For this A: trace = ' + r3(tr) + ', det = ' + r3(det) + '. Solving λ² − ' + r3(tr) + 'λ + ' + r3(det) + ' = 0 gives <b>λ₁ = ' + r3(l1) + '</b> and λ₂ = ' + r3(l2) + '. The top eigenvector points along ' + vs(e1) + '.' : '<span class="c-r">No real eigenvalues</span> (trace² − 4·det = ' + r3(disc) + ' &lt; 0): A rotates every arrow, so power iteration will keep spinning instead of settling.', parts: [
          { type: 'vars', vals: real ? { trace: r3(tr), det: r3(det), 'λ₁ (biggest |λ|)': r3(l1), 'λ₂': r3(l2) } : { trace: r3(tr), det: r3(det), 'trace² − 4det': r3(disc) }, hl: real ? { 'λ₁ (biggest |λ|)': 'sel' } : { 'trace² − 4det': 'bad' } }] });
        var n0 = normv(v); v = [v[0] / n0, v[1] / n0];
        var rows = [], est = [];
        for (var k = 0; k < 8; k++) {
          var w = mv(A, v), lam = dotv(v, w), nw = normv(w);
          if (nw === 0) { F.push({ narr: 'A sent the vector to zero, so we cannot continue (the start was an eigenvector with λ = 0).', parts: [{ type: 'vars', vals: { step: k, 'A·v': vs(w) }, hl: { 'A·v': 'bad' } }] }); break; }
          var nv = [w[0] / nw, w[1] / nw];
          rows.push([k, vs(v), vs(w), r3(lam)]); est.push(r3(Math.abs(lam)));
          var arr = [{ id: 'v', name: 'v', x: v[0] * 2, y: v[1] * 2, cls: 'cur', tag: 'v' + k }, { id: 'nv', name: 'next', x: nv[0] * 2, y: nv[1] * 2, cls: 'ok', tag: 'v' + (k + 1) }];
          if (real) arr.push({ id: 'e', name: 'e₁', x: e1[0] * 2.4, y: e1[1] * 2.4, cls: 'sel', tag: 'eigen-line' });
          var ang = real ? Math.acos(Math.min(1, Math.abs(dotv(nv, e1)))) * 180 / Math.PI : null;
          F.push({ narr: 'Step ' + k + ': A·v = ' + vs(w) + ', rescale to length 1 → ' + vs(nv) + '. Estimate λ ≈ v·Av = <b>' + r3(lam) + '</b>.' + (real ? ' Angle to the eigen-line: ' + r3(ang) + '°.' : ''), parts: [
            plane('v (amber) → rescaled A·v (green); purple = top eigenvector', arr, { scale: 2.5 }),
            { type: 'table', label: 'iterations', columns: ['step', 'v', 'A·v', 'λ estimate'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; h[rows.length - 1] = 'cur'; return h; })() }] });
          v = nv;
        }
        F.push({ narr: real ? 'The estimates settle at <b>λ ≈ ' + r3(rows.length ? rows[rows.length - 1][3] : 0) + '</b> (true value ' + r3(l1) + '). The ratio |λ₂/λ₁| = ' + (l1 === 0 ? 'not defined (λ₁ = 0)' : r3(Math.abs(l2 / l1))) + ' sets the speed: the smaller it is, the faster the wrong part dies out.' : 'With a rotation the arrow never settles: there is no real direction to settle on.', parts: [
          { type: 'bars', label: '|λ estimate| per step', values: est.length ? est : [0], idxLabels: est.map(function (_, i) { return 's' + i; }) }] });
        return F;
      }
    },
    examples: [
      { title: 'A diagonal matrix: eigenvectors are the axes', html: `<p>A = <code>[[3, 0], [0, 1]]</code> stretches x by 3 and leaves y. So [1, 0] has λ = 3 and [0, 1] has λ = 1. For diagonal matrices you can read eigenvalues straight off the diagonal. PCA's goal is exactly to find axes in which the covariance matrix becomes diagonal.</p>` },
      { title: 'Repeated application: a weather model', html: `<p>Sunny today → 80% sunny tomorrow; rainy today → 50% sunny tomorrow. Transition matrix P = <code>[[0.8, 0.5], [0.2, 0.5]]</code> (columns are "from"). Apply P to [1, 0] again and again: [0.8, 0.2] → [0.74, 0.26] → … → [5/7, 2/7] ≈ [0.714, 0.286]. That steady state is the eigenvector with λ = 1. PageRank is the same idea on the web's link graph.</p>`, code: { lang: 'python', run: true, code: `P = [[0.8, 0.5], [0.2, 0.5]]      # column j = probabilities of tomorrow given today = j
v = [1.0, 0.0]                    # start: sunny for sure
for day in range(1, 21):
    v = [P[0][0] * v[0] + P[0][1] * v[1], P[1][0] * v[0] + P[1][1] * v[1]]
    if day in (1, 2, 3, 20):
        print(f"day {day}: sunny={v[0]:.4f} rainy={v[1]:.4f}")
print("exact steady state:", 5 / 7, 2 / 7)   # eigenvector for eigenvalue 1
` } },
      { title: 'Trace and determinant checks', html: `<p>A = <code>[[4, 1], [2, 3]]</code>: trace 7, det 10. λ² − 7λ + 10 = 0 → λ = 5 and 2. Check: 5 + 2 = 7 ✅, 5 × 2 = 10 ✅. Eigenvector for 5: solve (A − 5I)v = 0 → [[−1, 1], [2, −2]]v = 0 → v = [1, 1]. Indeed A·[1, 1] = [5, 5]. ✅</p>` },
      { title: 'Growth or decay', html: `<p>A recurrent network multiplies its hidden state by W at every step. If W's largest |λ| is 1.1, after 50 steps a signal grows about 1.1<sup>50</sup> ≈ 117×; if it is 0.9, it shrinks to 0.9<sup>50</sup> ≈ 0.005. That is the "exploding / vanishing gradient" problem in one line, and why careful initialisation and LSTMs or transformers were needed.</p>` }
    ],
    deepDive: `<p><b>🟣 Eigendecomposition.</b> If an n×n matrix has n independent eigenvectors, put them as the columns of V and the eigenvalues on the diagonal of Λ: <code>A = V Λ V⁻¹</code>. In the eigenvector "coordinates", A is just a stretch along each axis. Powers become trivial: <code>A<sup>k</sup> = V Λ<sup>k</sup> V⁻¹</code>, which is why the biggest eigenvalue dominates long-run behaviour.</p>
      <p><b>Spectral theorem.</b> A real symmetric matrix always has real eigenvalues and an <i>orthonormal</i> set of eigenvectors (unit length, at right angles): <code>A = Q Λ Qᵀ</code>, with Q⁻¹ = Qᵀ. Covariance matrices, Gram matrices XᵀX and graph Laplacians are symmetric, so this is the workhorse case in ML. They are also positive semi-definite (all λ ≥ 0), because variance cannot be negative.</p>
      <p><b>Power iteration details.</b> Convergence rate is |λ₂/λ₁| per step; if the top two eigenvalues are close, it is slow. It fails if the start vector has exactly zero component along the top eigenvector (random starts avoid this) and oscillates if the two largest |λ| are equal with opposite signs. To get the next eigenvector, "deflate" (subtract λ₁v₁v₁ᵀ) or iterate on a block of vectors at once (subspace iteration). Production libraries use the QR algorithm (dense) or Lanczos/Arnoldi (large and sparse).</p>
      <p><b>Cost.</b> One power-iteration step is one matrix-vector product: O(n²) dense, O(number of non-zeros) sparse. That is why PageRank over billions of pages is feasible while a full O(n³) eigendecomposition is not.</p>`,
    aiEra: `<p><b>🤖 In AI systems.</b> Eigenvectors appear in PCA (top eigenvectors of the covariance matrix), spectral clustering (eigenvectors of a graph Laplacian), PageRank-style ranking, and stability analysis of training (the top eigenvalue of the loss Hessian, called "sharpness", relates to the largest learning rate that will not diverge). Interpretability research also studies the top singular and eigen directions of weight matrices to find features a model has learned.</p>
      <p><b>Working with AI assistants.</b> Common slips in generated code: using <code>np.linalg.eig</code> on a symmetric matrix instead of the faster, more stable <code>eigh</code>; forgetting that <code>eigh</code> sorts eigenvalues <i>ascending</i> (so the "top" one is the last); and reading eigenvectors from <i>rows</i> instead of <i>columns</i>. Also remember an eigenvector's sign is arbitrary: tests must compare up to ±1, or compare eigenvalues and A·v = λv instead.</p>`,
    problems: [
      PR('power', {
        title: 'Dominant Eigenvalue by Power Iteration', level: 'Medium', tags: ['eigenvalues', 'power iteration'], companies: ['Google', 'Two Sigma', 'Meta'],
        statement: `<p>Write <code>power_iteration(M, iters)</code> that estimates the eigenvalue of largest absolute value of a square matrix M. Start from the all-ones vector, repeat <code>iters</code> times "multiply by M and rescale to length 1", then return the Rayleigh quotient v·Mv (v has length 1). If M sends the vector to zero, return 0.0. The test matrices have a clearly dominant, positive eigenvalue and the all-ones start is not orthogonal to its eigenvector.</p>`,
        constraints: `<p>1 ≤ n ≤ 50, 1 ≤ iters ≤ 1000. Compared with tolerance about 10<sup>−5</sup>.</p>`,
        example: `<p>M = <code>[[2, 1], [1, 2]]</code>, iters = 100 → <code class="c-g">3.0</code>. Why: [1, 1] is already the top eigenvector, A·[1, 1] = [3, 3] = 3·[1, 1].</p>
          <p>M = <code>[[4, 1], [2, 3]]</code> → <code class="c-g">5.0</code> (eigenvalues 5 and 2).</p>`,
        bruteWhy: `<p>For 2×2 you could solve λ² − trace·λ + det = 0 with the quadratic formula, as the brute version does. But it only works for 2×2 (it crashes on 1×1 and 3×3 inputs), and for n×n the polynomial has degree n with no general formula beyond degree 4. Power iteration needs only matrix-vector products, so it scales to huge matrices.</p>`,
        mcq: { q: `Eigenvalues are 10 and 9. Power iteration converges…`, options: ['slowly: the wrong part shrinks only by 0.9 per step', 'in one step', 'fast: 10 is big', 'never'], answer: 0, explain: `The leftover component shrinks by |λ₂/λ₁| = 0.9 each step, so about 130 steps to gain 6 digits. With eigenvalues 10 and 1 it shrinks by 0.1 per step.` },
        hints: [
          `Hint 1: The direction with the biggest |λ| grows fastest each time you multiply, so after many multiplications the vector points along it.`,
          `Hint 2: Each step: w = M·v; length = √(Σ w²); v = w / length. Rescaling keeps numbers from overflowing.`,
          `Hint 3: At the end compute Mv once more and return Σ v[i]·(Mv)[i]. Guard length == 0 by returning 0.0.`
        ],
        approach: `<p>Start with v = [1, …, 1]. Repeat: multiply by M and divide by the length. After the loop, v is (very nearly) the top eigenvector, so v·Mv ≈ λ·(v·v) = λ. Return that Rayleigh quotient.</p>`,
        dry: { head: ['step', 'v', 'M·v', 'v·Mv'], rows: [['start', '[1, 1]', '', ''], ['1', '[0.707, 0.707]', '[2.121, 2.121]', '3.0'], ['2', '[0.707, 0.707]', '[2.121, 2.121]', '3.0'], ['end', 'unchanged: eigenvector', '', 'λ = 3']] },
        complexity: `<p>O(iters · n²) time (one matrix-vector product per step), O(n) extra space.</p>`,
        followUps: ['How would you find the second-largest eigenvalue?', 'What happens if the two largest eigenvalues are 3 and −3?']
      })
    ]
  });

  // ===================== TOPIC 8: SVD & PCA =====================
  // eigen-decomposition of a symmetric 2x2 [[p, q], [q, r]] -> {l1 >= l2, v1, v2} (unit vectors)
  function sym2eig(p, q, r) {
    var tr = p + r, det = p * r - q * q, sq = Math.sqrt(Math.max(0, tr * tr / 4 - det));
    var l1 = tr / 2 + sq, l2 = tr / 2 - sq, v1;
    if (Math.abs(q) > 1e-12) v1 = [q, l1 - p]; else v1 = p >= r ? [1, 0] : [0, 1];
    var n = normv(v1); v1 = [v1[0] / n, v1[1] / n];
    return { l1: l1, l2: l2, v1: v1, v2: [-v1[1], v1[0]] };
  }

  topics.push({
    title: 'SVD and PCA: Finding the Directions That Matter',
    analogy: `<p>Photograph a flock of birds flying along a river. From above you see a long thin cloud of dots. If you could keep only <b>one</b> number per bird, you would keep "how far along the river", because that is where the birds differ most; "how far across" barely changes. <b>PCA</b> finds that "along the river" direction automatically, in any number of dimensions. <b>SVD</b> is the general machine underneath: it says every matrix is just <i>rotate, stretch, rotate</i>.</p>`,
    explain: `<p><b>🟢 PCA (principal component analysis) in four steps.</b> Take five 2-D points:</p>
      ${H.table(['point', 'x', 'y'], [['p1', '2', '1'], ['p2', '3', '2'], ['p3', '4', '3'], ['p4', '5', '5'], ['p5', '6', '5']])}
      <p><b>1. Centre.</b> Subtract the mean (4, 3.2) from every point, so the cloud sits around the origin: x − 4 = [−2, −1, 0, 1, 2], y − 3.2 = [−2.2, −1.2, −0.2, 1.8, 1.8].</p>
      <p><b>2. Covariance matrix.</b> It records the spread in each direction and how x and y move together. Each entry is a sum of products divided by n − 1 = 4:</p>
      ${H.table(['entry', 'calculation', 'value'], [['var(x)', '(4 + 1 + 0 + 1 + 4) / 4', '2.5'], ['var(y)', '(4.84 + 1.44 + 0.04 + 3.24 + 3.24) / 4', '3.2'], ['cov(x, y)', '(4.4 + 1.2 + 0 + 1.8 + 3.6) / 4', '2.75']])}
      <p>So C = <code>[[2.5, 2.75], [2.75, 3.2]]</code>. A positive covariance means "when x is big, y tends to be big too".</p>
      <p><b>3. Eigenvectors of C.</b> trace = 5.7, det = 2.5 × 3.2 − 2.75² = 0.4375. λ² − 5.7λ + 0.4375 = 0 → <b>λ₁ ≈ 5.622</b>, λ₂ ≈ 0.078. The eigenvector for λ₁ is about <code>[0.661, 0.750]</code>: the "along the river" direction. It is the <b>first principal component</b> (PC1). The eigenvalue is the variance of the data along that direction.</p>
      <p><b>4. Project and keep the top k.</b> Each point's new single coordinate is its dot product with PC1. For centred p1 = (−2, −2.2): −2 × 0.661 + (−2.2) × 0.750 ≈ <b>−2.97</b>. Five 2-D points become five numbers.</p>
      <h4>Explained variance: how much did we keep?</h4>
      <p><code>explained ratio of PC k = λ<sub>k</sub> / (λ₁ + λ₂ + …)</code>. Here 5.622 / 5.7 ≈ <b>98.6%</b>. One number per point keeps 98.6% of the spread; we threw away only 1.4%. With 768-D embeddings you might find that 100 components keep 90%.</p>
      ${H.table(['component', 'eigenvalue', 'ratio', 'cumulative'], [['PC1', '5.622', '98.6%', '98.6%'], ['PC2', '0.078', '1.4%', '100%']])}
      <h4>SVD: rotate, stretch, rotate</h4>
      <p>The <b>singular value decomposition</b> writes <b>any</b> matrix (any shape) as <code>A = U Σ Vᵀ</code>: Vᵀ rotates, Σ stretches along the axes by the <b>singular values</b> σ₁ ≥ σ₂ ≥ … ≥ 0, and U rotates again. A circle of points becomes an ellipse whose axis lengths are the σ's. Link to PCA: if X is the centred data, the right singular vectors of X are the principal components and <code>λ<sub>k</sub> = σ<sub>k</sub>² / (n − 1)</code>. Libraries compute PCA through SVD because it is more accurate than forming the covariance matrix.</p>
      <p><b>Low-rank approximation.</b> Keep only the top k singular values and you get the best possible rank-k copy of A (the Eckart–Young theorem). This is image compression, recommender "matrix factorisation", and the idea behind LoRA.</p>`,
    clues: [
      '"reduce dimensions", "compress 768-d embeddings to 64-d", "visualise high-dimensional data in 2-D" → PCA',
      '"how many components keep 95% of the variance" → cumulative explained variance from sorted eigenvalues',
      '"directions of maximum variance", "decorrelate features" → eigenvectors of the covariance matrix',
      '"best low-rank approximation", "matrix factorisation", "latent factors" → truncated SVD',
      '"any rectangular matrix", "pseudo-inverse", "least squares that is stable" → SVD',
      '"centre the data first" → PCA requires subtracting the mean; forgetting it is a classic bug'
    ],
    code: [
      { lang: 'python', title: 'PCA from scratch on 2-D points (runnable)', run: true, code: `import math

pts = [[2, 1], [3, 2], [4, 3], [5, 5], [6, 5]]
n = len(pts)

# 1) centre
mean = [sum(p[j] for p in pts) / n for j in range(2)]
X = [[p[0] - mean[0], p[1] - mean[1]] for p in pts]
print("mean:", mean)

# 2) covariance matrix (divide by n - 1, the "sample" covariance)
def cov(a, b):
    return sum(r[a] * r[b] for r in X) / (n - 1)
C = [[cov(0, 0), cov(0, 1)], [cov(1, 0), cov(1, 1)]]
print("covariance:", [[round(x, 3) for x in row] for row in C])   # [[2.5, 2.75], [2.75, 3.2]]

# 3) eigenvalues of the symmetric 2x2 via trace and determinant
tr = C[0][0] + C[1][1]
det = C[0][0] * C[1][1] - C[0][1] * C[1][0]
disc = math.sqrt(tr * tr / 4 - det)
l1, l2 = tr / 2 + disc, tr / 2 - disc
v1 = [C[0][1], l1 - C[0][0]]                  # eigenvector for l1
norm = math.hypot(*v1)
v1 = [v1[0] / norm, v1[1] / norm]
print("eigenvalues:", round(l1, 3), round(l2, 3), " PC1:", [round(x, 3) for x in v1])

# 4) project every centred point onto PC1 -> one number per point
scores = [r[0] * v1[0] + r[1] * v1[1] for r in X]
print("1-D coordinates:", [round(s, 3) for s in scores])
print("explained variance ratio:", round(l1 / (l1 + l2), 4))       # 0.9863

# variance of the scores equals the eigenvalue
print("variance of scores:", round(sum(s * s for s in scores) / (n - 1), 3))   # 5.622

# reconstruct from 1 number per point: mean + score * PC1
recon = [[round(mean[0] + s * v1[0], 2), round(mean[1] + s * v1[1], 2)] for s in scores]
print("reconstructed:", recon)
` },
      { lang: 'python', title: 'NumPy / scikit-learn version (shown, not run here)', code: `import numpy as np

X = np.array([[2, 1], [3, 2], [4, 3], [5, 5], [6, 5]], dtype=float)
Xc = X - X.mean(axis=0)                       # centre
U, S, Vt = np.linalg.svd(Xc, full_matrices=False)
print(Vt[0])                                  # PC1 (sign may differ): [0.661 0.750]
eig = S ** 2 / (len(X) - 1)                   # eigenvalues of the covariance matrix
print(eig / eig.sum())                        # explained variance ratio [0.986 0.014]
scores = Xc @ Vt[0]                           # 1-D coordinates

# scikit-learn does the same:
# from sklearn.decomposition import PCA
# pca = PCA(n_components=1).fit(X); print(pca.explained_variance_ratio_)
` }
    ],
    codeTitle: ['Pure Python', 'NumPy version'],
    viz: [{
      title: 'PCA step by step on a small cloud of points',
      input: '2 1; 3 2; 4 3; 5 5; 6 5',
      inputLabel: '2-D points separated by ; (3 to 6 points)',
      gen: function (input) {
        var P = parseMat(input, 'the points'), n = P.length, F = [], i;
        if (P[0].length !== 2) throw new Error('Each point needs two numbers: x y');
        if (n < 3 || n > 6) throw new Error('Use between 3 and 6 points');
        if (P.some(function (p) { return Math.abs(p[0]) > 20 || Math.abs(p[1]) > 20; })) throw new Error('Keep coordinates between -20 and 20');
        var mean = [0, 0]; P.forEach(function (p) { mean[0] += p[0] / n; mean[1] += p[1] / n; });
        var X = P.map(function (p) { return [p[0] - mean[0], p[1] - mean[1]]; });
        var sc = 1; P.forEach(function (p) { sc = Math.max(sc, Math.abs(p[0]), Math.abs(p[1])); });
        function dots(list, cls, pre) { return list.map(function (p, k) { return { id: (pre || 'p') + k, name: 'p' + (k + 1), x: p[0], y: p[1], cls: cls, noArrow: true }; }); }
        F.push({ narr: 'Our data: ' + n + ' points. They look like a stretched cloud. Which single direction captures most of the spread?', parts: [plane('raw points', dots(P, 'win'), { scale: sc }), { type: 'table', label: 'data', columns: ['point', 'x', 'y'], rows: P.map(function (p, k) { return ['p' + (k + 1), p[0], p[1]]; }) }] });
        F.push({ narr: 'Step 1: the mean is <b>' + vs(mean) + '</b> (purple). PCA measures spread around this centre.', parts: [plane('mean of the points', dots(P, 'win').concat([{ id: 'm', name: 'μ', x: mean[0], y: mean[1], cls: 'sel', noArrow: true }]), { scale: sc })] });
        var sc2 = 1; X.forEach(function (p) { sc2 = Math.max(sc2, Math.abs(p[0]), Math.abs(p[1])); });
        F.push({ narr: 'Subtract the mean from every point. The cloud is now <b>centred</b> on the origin. (Forgetting this step is the most common PCA bug.)', parts: [plane('centred points', dots(X, 'cur'), { scale: sc2 }), { type: 'table', label: 'centred', columns: ['point', 'x − μx', 'y − μy'], rows: X.map(function (p, k) { return ['p' + (k + 1), r3(p[0]), r3(p[1])]; }) }] });
        var cxx = 0, cyy = 0, cxy = 0;
        X.forEach(function (p) { cxx += p[0] * p[0]; cyy += p[1] * p[1]; cxy += p[0] * p[1]; });
        cxx /= (n - 1); cyy /= (n - 1); cxy /= (n - 1);
        F.push({ narr: 'Step 2: covariance matrix. var(x) = Σx²/(n−1) = ' + r3(cxx) + ', var(y) = ' + r3(cyy) + ', cov(x,y) = Σxy/(n−1) = <b>' + r3(cxy) + '</b>' + (cxy > 0 ? ' (positive: x and y rise together).' : cxy < 0 ? ' (negative: when x rises, y falls).' : ' (zero: no linear link).'), parts: [
          { type: 'grid', label: 'covariance matrix C', rows: [[r3(cxx), r3(cxy)], [r3(cxy), r3(cyy)]], colHead: ['x', 'y'], rowHead: ['x', 'y'], hl: { '0,1': 'sel', '1,0': 'sel' } },
          { type: 'table', label: 'products per point', columns: ['point', 'x²', 'y²', 'x·y'], rows: X.map(function (p, k) { return ['p' + (k + 1), r3(p[0] * p[0]), r3(p[1] * p[1]), r3(p[0] * p[1])]; }) }] });
        var e = sym2eig(cxx, cxy, cyy), tot = e.l1 + e.l2;
        if (tot <= 1e-12) { F.push({ narr: 'All points are identical: there is no spread at all, so there is no direction to find.', parts: [{ type: 'vars', vals: { 'total variance': 0 }, hl: { 'total variance': 'bad' } }] }); return F; }
        var L = Math.max(sc2, 1);
        F.push({ narr: 'Step 3: eigenvalues of C are <b>λ₁ = ' + r3(e.l1) + '</b> and λ₂ = ' + r3(e.l2) + '. PC1 = ' + vs(e.v1) + ' (green) is the direction of greatest spread; PC2 = ' + vs(e.v2) + ' is at a right angle to it.', parts: [
          plane('principal directions over centred data', dots(X, 'done').concat([{ id: 'pc1', name: 'PC1', x: e.v1[0] * L, y: e.v1[1] * L, cls: 'ok', tag: 'λ₁=' + r3(e.l1) }, { id: 'pc2', name: 'PC2', x: e.v2[0] * L * 0.5, y: e.v2[1] * L * 0.5, cls: 'bad', tag: 'λ₂=' + r3(e.l2) }]), { scale: sc2 }),
          { type: 'vars', vals: { 'λ₁': r3(e.l1), 'λ₂': r3(e.l2), 'λ₁ + λ₂ = trace': r3(tot) }, hl: { 'λ₁': 'ok' } }] });
        var s = X.map(function (p) { return dotv(p, e.v1); });
        var pr = s.map(function (t) { return [t * e.v1[0], t * e.v1[1]]; });
        F.push({ narr: 'Step 4: project each centred point onto PC1 (its dot product with PC1). Each point is replaced by its shadow on the green line.', parts: [
          plane('shadows on PC1', dots(X, 'done').concat(dots(pr, 'ok', 'q')), { scale: sc2 }),
          { type: 'table', label: 'score = point · PC1', columns: ['point', 'centred', 'score'], rows: X.map(function (p, k) { return ['p' + (k + 1), vs(p), r3(s[k])]; }) }] });
        F.push({ narr: 'Result: ' + n + ' two-number points became ' + n + ' single numbers along PC1. The variance of these scores is ' + r3(s.reduce(function (a, t) { return a + t * t; }, 0) / (n - 1)) + ' = λ₁.', parts: [
          { type: 'array', label: '1-D coordinates (PC1 scores)', values: s.map(r3), idxLabels: s.map(function (_, k) { return 'p' + (k + 1); }) }] });
        F.push({ narr: 'Explained variance: PC1 keeps λ₁ / (λ₁ + λ₂) = <b>' + r3(100 * e.l1 / tot) + '%</b> of the spread; PC2 holds the remaining ' + r3(100 * e.l2 / tot) + '%.', parts: [
          { type: 'bars', label: 'explained variance (%)', values: [r3(100 * e.l1 / tot), r3(100 * e.l2 / tot)], idxLabels: ['PC1', 'PC2'], hl: { 0: 'ok' } }] });
        var rec = pr.map(function (q) { return [q[0] + mean[0], q[1] + mean[1]]; });
        var err = 0; P.forEach(function (p, k) { err += Math.pow(p[0] - rec[k][0], 2) + Math.pow(p[1] - rec[k][1], 2); });
        F.push({ narr: 'Reconstruct each point as mean + score × PC1 (green) and compare with the originals (blue). Total squared error = ' + r3(err) + ' = (n−1)·λ₂: exactly the variance we dropped.', parts: [
          plane('original (blue) vs 1-component reconstruction (green)', dots(P, 'win').concat(dots(rec, 'ok', 'r')), { scale: sc })] });
        return F;
      }
    }, {
      title: 'SVD: every matrix is rotate → stretch → rotate',
      input: '3 1; 1 2',
      inputLabel: 'a 2×2 matrix. Try 2 0; 0 1 or 1 1; 0 1 or 1 2; 2 4',
      gen: function (input) {
        var A = parseMat(input, 'the matrix');
        if (A.length !== 2 || A[0].length !== 2) throw new Error('Use a 2×2 matrix');
        if (A[0].concat(A[1]).some(function (x) { return Math.abs(x) > 6; })) throw new Error('Keep entries between -6 and 6');
        // AᵀA eigen -> V and σ; U = A v / σ
        var p = A[0][0] * A[0][0] + A[1][0] * A[1][0], q = A[0][0] * A[0][1] + A[1][0] * A[1][1], r = A[0][1] * A[0][1] + A[1][1] * A[1][1];
        var e = sym2eig(p, q, r), s1 = Math.sqrt(Math.max(0, e.l1)), s2 = Math.sqrt(Math.max(0, e.l2));
        var V = [e.v1, e.v2], F = [];
        var circle = []; for (var k = 0; k < 8; k++) { var t = k * Math.PI / 4; circle.push([Math.cos(t), Math.sin(t)]); }
        function pts(list, cls, pre) { return list.map(function (c, i) { return { id: pre + i, name: i === 0 ? '0' : i === 2 ? '2' : '·', x: c[0], y: c[1], cls: i === 0 || i === 2 ? 'sel' : cls, noArrow: i !== 0 && i !== 2, tag: '' }; }); }
        var sc = Math.max(1.2, s1 * 1.1);
        F.push({ narr: 'Start with 8 points on the unit circle (points 0 and 2 have arrows so you can follow them).', parts: [plane('unit circle', pts(circle, 'win', 'c'), { scale: sc })] });
        var rot1 = circle.map(function (c) { return [dotv(V[0], c), dotv(V[1], c)]; });
        F.push({ narr: '<b>Vᵀ</b> rotates (or mirrors) the circle so that the right singular vectors v₁ = ' + vs(V[0]) + ' and v₂ line up with the axes. A circle rotated is still the same circle.', parts: [plane('after Vᵀ (rotate)', pts(rot1, 'win', 'a'), { scale: sc })] });
        var str = rot1.map(function (c) { return [s1 * c[0], s2 * c[1]]; });
        F.push({ narr: '<b>Σ</b> stretches along the axes by the singular values σ₁ = <b>' + r3(s1) + '</b> and σ₂ = <b>' + r3(s2) + '</b>. The circle becomes an ellipse.' + (s2 < 1e-9 ? ' <span class="c-r">σ₂ = 0: the ellipse is flattened into a line, so A is singular (rank 1).</span>' : ''), parts: [plane('after Σ (stretch)', pts(str, 'cur', 'b'), { scale: sc }), { type: 'vars', vals: { 'σ₁': r3(s1), 'σ₂': r3(s2) }, hl: { 'σ₁': 'sel' } }] });
        var fin = circle.map(function (c) { return mv(A, c); });
        F.push({ narr: '<b>U</b> rotates the ellipse into its final place. The result is exactly A applied to every circle point. So A = U Σ Vᵀ.', parts: [plane('after U (rotate) = A × circle', pts(fin, 'ok', 'f'), { scale: sc })] });
        F.push({ narr: 'Reading the result: the longest stretch of A is σ₁ = ' + r3(s1) + ', the shortest is σ₂ = ' + r3(s2) + '. |det A| = σ₁·σ₂ = ' + r3(s1 * s2) + (s2 > 1e-9 ? ', and the condition number σ₁/σ₂ = ' + r3(s1 / s2) + ' says how much A can amplify errors.' : '.'), parts: [
          { type: 'table', label: 'singular values', columns: ['σ', 'value', 'σ²'], rows: [['σ₁', r3(s1), r3(s1 * s1)], ['σ₂', r3(s2), r3(s2 * s2)]] }] });
        return F;
      }
    }],
    examples: [
      { title: 'Explained variance and choosing k', html: `<p>Covariance eigenvalues (sorted): 5, 3, 1.5, 0.5. Total 10. Ratios: 50%, 30%, 15%, 5%. Cumulative: 50%, 80%, 95%, 100%. To keep at least 90% of the variance, keep <b>3</b> components. To keep 80%, keep 2. Plotting the cumulative curve (a "scree plot") and looking for the elbow is the standard way to choose k.</p>` },
      { title: 'Rank-1 approximation of a ratings table', html: `<p>Ratings (users × films) <code>[[5, 4], [4, 3], [1, 1]]</code> are nearly "a taste score × a film score". SVD's top singular value with its vectors reproduces the table almost exactly with 3 + 2 numbers instead of 6. Recommender systems do this with millions of users: each user and each film gets a short vector of "latent factors".</p>` },
      { title: 'Uncorrelated data has no favourite direction', html: `<p>Points (1, 0), (−1, 0), (0, 1), (0, −1): var(x) = var(y) = 2/3, cov = 0. C = (2/3)·I, both eigenvalues equal, so PC1 explains only 50%. PCA cannot compress data that is spread evenly in all directions; it only helps when features are correlated.</p>`, code: { lang: 'python', run: true, code: `def explained(eigs):
    total = sum(eigs)
    out, run = [], 0.0
    for lam in sorted(eigs, reverse=True):
        run += lam
        out.append((round(lam / total, 3), round(run / total, 3)))
    return out
print("ratio, cumulative:", explained([5, 3, 1.5, 0.5]))
print("round cloud:      ", explained([2 / 3, 2 / 3]))     # 50% each
` } },
      { title: 'Why scale features before PCA', html: `<p>Salary in pounds (spread ≈ 20,000) and age in years (spread ≈ 10). Without standardising, PC1 is basically "salary" because its variance is millions of times larger. Divide each feature by its standard deviation first, unless the units are genuinely comparable (like pixel intensities or embedding dimensions).</p>` }
    ],
    deepDive: `<p><b>🟣 Why the covariance eigenvector maximises variance.</b> The variance of the projections onto a unit direction u is <code>uᵀ C u</code>. Maximising it subject to ‖u‖ = 1 (with a Lagrange multiplier) gives <code>C u = λ u</code>, and the variance achieved is λ. So the best direction is the top eigenvector; the next best direction at a right angle is the second eigenvector, and so on.</p>
      <p><b>SVD facts.</b> For an m×n matrix A: U is m×m, Σ is m×n with σ's on the diagonal, V is n×n. The columns of V are eigenvectors of AᵀA, the columns of U are eigenvectors of AAᵀ, and σ<sub>i</sub>² are their shared eigenvalues. Rank = number of non-zero σ's. ‖A‖ (largest stretch) = σ₁. The pseudo-inverse A⁺ = V Σ⁺ Uᵀ (invert the non-zero σ's) gives least-squares solutions even for singular or rectangular A.</p>
      <p><b>Cost and scale.</b> A full SVD of an m×n matrix costs O(min(mn², m²n)). For a million embeddings × 768 dimensions that is heavy but doable; for bigger data use <b>randomised SVD</b> (project onto a few random directions first) or incremental PCA that streams batches. Only the top k components are usually needed, which is far cheaper.</p>
      <p><b>Limits of PCA.</b> It finds <i>linear</i> directions and is sensitive to outliers (one huge point can grab PC1). For visualising clusters in embeddings, non-linear methods (t-SNE, UMAP) often look better, but their distances are not trustworthy; PCA's are. Signs of components are arbitrary, so never compare raw components across runs without aligning signs.</p>`,
    aiEra: `<p><b>🤖 In AI systems.</b> PCA is used to shrink embeddings before storage (fewer dimensions → less memory and faster search), to visualise embedding spaces, and to find "concept directions" (for example, the top direction separating positive from negative reviews). SVD powers LoRA's core idea (weight updates are approximately low-rank), model-compression methods that factorise big weight matrices, latent semantic analysis (the 1990s ancestor of embeddings), and many recommender systems.</p>
      <p><b>Working with AI assistants.</b> When an assistant suggests PCA, check that it (1) fits PCA on training data only and then applies it to test data, (2) centres (and, if needed, scales) features, (3) reports cumulative explained variance before choosing k, and (4) does not treat component signs as meaningful. Also ask whether your embedding model offers native shorter dimensions (some models are trained so the first k slots are already a good summary), which can beat PCA.</p>`,
    problems: [
      PR('explained', {
        title: 'Explained Variance of the Top k Components', level: 'Easy', tags: ['pca', 'eigenvalues'], companies: ['Netflix', 'Amazon'],
        statement: `<p>You are given the eigenvalues of a covariance matrix (in any order) and a number k. Write <code>explained_variance(eigenvalues, k)</code> that returns the fraction of total variance kept by the k largest components. If the total is 0, return 0.0. k may be 0.</p>`,
        constraints: `<p>1 ≤ len(eigenvalues) ≤ 10<sup>5</sup>; all eigenvalues ≥ 0; 0 ≤ k ≤ len(eigenvalues).</p>`,
        example: `<p><code>[0.5, 5, 1.5, 3]</code>, k = 2 → <code class="c-g">0.8</code>. Why: sorted descending 5, 3, 1.5, 0.5; total 10; top two sum to 8; 8 / 10 = 0.8.</p>`,
        bruteWhy: `<p>A common slip is taking the <i>first</i> k eigenvalues in the order given. Libraries do not always sort them (NumPy's <code>eigh</code> returns them <b>ascending</b>, so the first k are the <i>smallest</i>). You must sort descending first; a fully manual "find the max, remove it, repeat k times" also works but costs O(n·k).</p>`,
        mcq: { q: `Eigenvalues 6, 3, 1. What fraction do the top 2 components explain?`, options: ['0.9', '0.6', '0.3', '9'], answer: 0, explain: `(6 + 3) / (6 + 3 + 1) = 9 / 10 = 0.9.` },
        hints: [
          `Hint 1: Each eigenvalue is the variance along one principal direction; the total variance is their sum.`,
          `Hint 2: Sort in descending order, add the first k, divide by the total.`,
          `Hint 3: Guard total == 0 (all points identical). k = 0 keeps nothing, so the answer is 0.0.`
        ],
        approach: `<p>Total = sum of all eigenvalues. Sort descending, sum the first k, and divide. This is the explained-variance ratio that scikit-learn reports as <code>explained_variance_ratio_.cumsum()[k-1]</code>.</p>`,
        dry: { head: ['step', 'value'], rows: [['input', '[0.5, 5, 1.5, 3], k = 2'], ['sorted', '[5, 3, 1.5, 0.5]'], ['total', '10'], ['top 2', '5 + 3 = 8 → 0.8']] },
        complexity: `<p>O(n log n) for the sort (O(n) with a selection algorithm), O(n) space.</p>`,
        followUps: ['How would you find the smallest k that keeps at least 95%?', 'How do singular values of the centred data relate to these eigenvalues?']
      })
    ]
  });

  // ===================== TOPIC 9: EMBEDDINGS & ATTENTION =====================
  function parseNamed(s) {
    // "cat 1 0.1; dog 0.9 0.3" -> [{name, v}]
    return String(s).split(';').map(function (row) {
      var t = row.trim().split(/[\s,]+/);
      if (t.length < 2) throw new Error('Each item: a name followed by numbers, e.g. cat 1 0.1');
      var v = t.slice(1).map(Number);
      if (v.some(isNaN)) throw new Error('Numbers after each name, e.g. cat 1 0.1');
      return { name: t[0].slice(0, 6), v: v };
    });
  }
  function softmax(xs) { var m = Math.max.apply(null, xs), e = xs.map(function (x) { return Math.exp(x - m); }), s = e.reduce(function (a, b) { return a + b; }, 0); return e.map(function (x) { return x / s; }); }

  topics.push({
    title: 'Linear Algebra Inside Embeddings, Vector Search and Attention',
    analogy: `<p>A library assistant keeps a card for every book with a few scores: "how much science", "how much romance", "how funny". Your question gets a card too. Finding books is <b>comparing cards</b> (dot products). Now picture a group discussion: each person asks a question (<b>query</b>), wears a name badge describing what they know (<b>key</b>), and has notes to share (<b>value</b>). Each person listens most to those whose badges match their question and blends their notes. That is <b>attention</b>, and it is nothing but the dot products and matrix multiplications you already know.</p>`,
    explain: `<p><b>🟢 1. An embedding table is a matrix.</b> A vocabulary of V tokens with d numbers each is a V×d matrix E. Looking up token i is the same as multiplying a <b>one-hot</b> row (all zeros, a single 1 at position i) by E: it picks out row i.</p>
      ${H.table(['token', 'one-hot', 'row of E (d = 2)'], [['the', '[1, 0, 0]', '[1.0, 0.0]'], ['cat', '[0, 1, 0]', '[0.9, 0.4]'], ['sat', '[0, 0, 1]', '[0.2, 1.0]']])}
      <p><b>2. Vector search is a matrix-vector product.</b> Stack N normalised document embeddings as the rows of D (N×d). For a normalised query q, <code>D · q</code> gives all N cosine scores at once. Sort and keep the top k. That is the heart of every RAG retriever.</p>
      <h4>3. Attention, step by step (one head)</h4>
      <p>Input X: one row per token (n×d). Learned matrices W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub> (d×d<sub>k</sub>) turn each token into a query, key and value: <code>Q = X W<sub>Q</sub></code>, <code>K = X W<sub>K</sub></code>, <code>V = X W<sub>V</sub></code>.</p>
      <p style="text-align:center"><code>Attention(Q, K, V) = softmax(Q · Kᵀ / √d<sub>k</sub>) · V</code></p>
      ${H.table(['step', 'linear algebra', 'shape (n = 3, d = 2)'], [['scores', 'Q · Kᵀ: every query · every key', '(3×2)(2×3) = 3×3'], ['scale', 'divide by √d<sub>k</sub> = √2 ≈ 1.414', '3×3'], ['weights', 'softmax of each row (rows add to 1)', '3×3'], ['output', 'weights · V: weighted average of values', '(3×3)(3×2) = 3×2']])}
      <p><b>Worked (W's = identity, so Q = K = V = X).</b> Row "cat" = [0.9, 0.4]. Scores against the, cat, sat: 0.9, 0.97, 0.58. Divide by 1.414: 0.636, 0.686, 0.410. Softmax: e<sup>x</sup> ≈ 1.889, 1.986, 1.507, sum 5.382 → weights <b>0.351, 0.369, 0.280</b>. Output = 0.351·[1, 0] + 0.369·[0.9, 0.4] + 0.280·[0.2, 1] ≈ <b>[0.739, 0.428]</b>: "cat" now carries a little of its neighbours' meaning.</p>
      <p><b>Why divide by √d?</b> A dot product of two random d-slot vectors grows like √d. With d = 128, raw scores of ±30 make softmax put almost all weight on one token (and gradients vanish). Dividing by √d keeps scores near ±1 to ±3, where softmax is soft.</p>
      <p><b>Multi-head.</b> Run several smaller attentions in parallel (each with its own W's), concatenate the outputs, and multiply by one more matrix W<sub>O</sub>. Still only matrix multiplications and softmaxes.</p>`,
    clues: [
      '"embedding lookup", "embedding layer", "nn.Embedding" → selecting a row of a V×d matrix (one-hot × E)',
      '"top-k most similar", "retrieve", "kNN over embeddings" → normalise, D·q, sort',
      '"Q Kᵀ", "attention scores", "n×n attention matrix" → all-pairs dot products; O(n²·d) cost',
      '"why scale by √d_k" → keep dot-product variance near 1 so softmax does not saturate',
      '"weighted sum of values", "attention output" → softmax weights times V',
      '"context length doubles, memory quadruples" → the n×n score matrix'
    ],
    code: [
      { lang: 'python', title: 'Embedding lookup, vector search and one attention head in plain Python (runnable)', run: true, code: `import math

def matmul(A, B):
    return [[sum(A[i][t] * B[t][j] for t in range(len(B))) for j in range(len(B[0]))] for i in range(len(A))]

def transpose(M):
    return [list(col) for col in zip(*M)]

def softmax(row):
    m = max(row)                                  # subtract the max for numerical safety
    e = [math.exp(x - m) for x in row]
    s = sum(e)
    return [x / s for x in e]

vocab = ["the", "cat", "sat"]
E = [[1.0, 0.0], [0.9, 0.4], [0.2, 1.0]]          # embedding matrix: 3 tokens x d=2

# 1) lookup = one-hot row times E
one_hot_cat = [[0, 1, 0]]
print("lookup 'cat':", matmul(one_hot_cat, E))    # [[0.9, 0.4]]

# 2) vector search: cosine of a query against every row
def unit(v):
    n = math.sqrt(sum(x * x for x in v))
    return [x / n for x in v]
D = [unit(r) for r in E]
q = unit([1.0, 0.3])
scores = [sum(a * b for a, b in zip(row, q)) for row in D]   # D . q
ranked = sorted(range(len(vocab)), key=lambda i: -scores[i])
print("search ranking:", [(vocab[i], round(scores[i], 3)) for i in ranked])

# 3) one attention head (W_Q = W_K = W_V = identity to keep the numbers small)
X = E
Q, K, V = X, X, X
d = len(Q[0])
S = matmul(Q, transpose(K))                       # 3x3 raw scores
S = [[s / math.sqrt(d) for s in row] for row in S]
W = [softmax(row) for row in S]                   # each row sums to 1
out = matmul(W, V)                                # 3x2
for tok, w, o in zip(vocab, W, out):
    print(f"{tok:4s} weights={[round(x, 3) for x in w]}  output={[round(x, 3) for x in o]}")
` },
      { lang: 'python', title: 'NumPy version (shown, not run here)', code: `import numpy as np

X = np.array([[1.0, 0.0], [0.9, 0.4], [0.2, 1.0]])   # n tokens x d
rng = np.random.default_rng(0)
d, dk = 2, 2
W_q, W_k, W_v = (rng.normal(size=(d, dk)) for _ in range(3))
Q, K, V = X @ W_q, X @ W_k, X @ W_v
S = Q @ K.T / np.sqrt(dk)                             # n x n
S = S - S.max(axis=1, keepdims=True)                  # numerical safety
W = np.exp(S) / np.exp(S).sum(axis=1, keepdims=True)  # row-wise softmax
out = W @ V                                           # n x dk
print(out.shape)                                      # (3, 2)

# causal mask: token i may only look at tokens 0..i
mask = np.triu(np.ones((3, 3), dtype=bool), k=1)
S_masked = np.where(mask, -np.inf, Q @ K.T / np.sqrt(dk))
` }
    ],
    codeTitle: ['Pure Python', 'NumPy version'],
    viz: [{
      title: 'One attention head as matrix operations',
      input: 'the 1 0; cat 0.9 0.4; sat 0.2 1',
      inputLabel: 'tokens with embeddings: name x y; … (2 to 4 tokens, same length vectors). W_Q = W_K = W_V = identity',
      gen: function (input) {
        var T = parseNamed(input), n = T.length, F = [], i, j;
        if (n < 2 || n > 4) throw new Error('Use 2 to 4 tokens');
        var d = T[0].v.length;
        if (d > 4 || T.some(function (t) { return t.v.length !== d; })) throw new Error('All embeddings need the same length (at most 4 numbers)');
        var names = T.map(function (t) { return t.name; }), X = T.map(function (t) { return t.v.slice(); });
        var oh = names.map(function (_, k) { return names.map(function (_, m) { return m === k ? 1 : 0; }); });
        F.push({ narr: 'Embedding matrix E: one row per token (' + n + '×' + d + '). Looking up "' + names[1] + '" = one-hot row ' + JSON.stringify(oh[1]) + ' × E, which simply selects row 2.', parts: [
          { type: 'grid', label: 'one-hot for "' + names[1] + '"', rows: [oh[1]], colHead: names },
          { type: 'grid', label: 'E (= X, the token vectors)', rows: mrows(X), rowHead: names, hl: (function () { var h = {}; for (var c = 0; c < d; c++) h['1,' + c] = 'ok'; return h; })() }] });
        F.push({ narr: 'Real models compute Q = X·W_Q, K = X·W_K, V = X·W_V with learned matrices. Here all three W\'s are the identity, so <b>Q = K = V = X</b> and the numbers stay readable.', parts: [
          { type: 'grid', label: 'Q = K = V', rows: mrows(X), rowHead: names }] });
        var S = [];
        for (i = 0; i < n; i++) { S.push([]); for (j = 0; j < n; j++) S[i].push('?'); }
        for (i = 0; i < n; i++) {
          for (j = 0; j < n; j++) S[i][j] = r3(dotv(X[i], X[j]));
          var h = {}; for (j = 0; j < n; j++) h[i + ',' + j] = 'cur';
          F.push({ narr: 'Row "' + names[i] + '" of Q·Kᵀ: its query · every key = ' + S[i].join(', ') + '. Bigger = better match.', parts: [
            { type: 'grid', label: 'scores Q·Kᵀ (' + n + '×' + n + ')', rows: S.map(function (r) { return r.slice(); }), rowHead: names, colHead: names, hl: h }] });
        }
        var sd = Math.sqrt(d), Ss = S.map(function (r) { return r.map(function (x) { return x / sd; }); });
        F.push({ narr: 'Divide every score by √d = √' + d + ' ≈ ' + r3(sd) + ' so that softmax stays soft (with d = 128 this matters a lot).', parts: [
          { type: 'grid', label: 'scaled scores', rows: mrows(Ss), rowHead: names, colHead: names }] });
        var W = Ss.map(softmax);
        for (i = 0; i < n; i++) {
          var hw = {}; for (j = 0; j < n; j++) hw[i + ',' + j] = 'ok';
          F.push({ narr: 'Softmax row "' + names[i] + '": e<sup>x</sup>, then divide by the row total. Weights ' + W[i].map(r3).join(', ') + ' (they add to 1).', parts: [
            { type: 'grid', label: 'attention weights', rows: W.map(function (r, k) { return k <= i ? r.map(r3) : r.map(function () { return '…'; }); }), rowHead: names, colHead: names, hl: hw },
            { type: 'bars', label: 'how much "' + names[i] + '" listens to each token', values: W[i].map(r3), idxLabels: names }] });
        }
        var O = W.map(function (w) { var o = []; for (var c = 0; c < d; c++) { var s = 0; for (var k = 0; k < n; k++) s += w[k] * X[k][c]; o.push(s); } return o; });
        F.push({ narr: 'Output row "' + names[1] + '" = Σ weight × value = ' + W[1].map(function (w, k) { return r3(w) + '·' + vs(X[k]); }).join(' + ') + ' = <b>' + vs(O[1]) + '</b>. A blend of the tokens it attended to.', parts: [
          { type: 'grid', label: 'output = weights · V (' + n + '×' + d + ')', rows: mrows(O), rowHead: names, hl: (function () { var h = {}; for (var c = 0; c < d; c++) h['1,' + c] = 'sel'; return h; })() }] });
        if (d === 2) {
          var vecs = [];
          X.forEach(function (x, k) { vecs.push({ id: 'x' + k, name: names[k].slice(0, 3), x: x[0], y: x[1], cls: 'done' }); });
          O.forEach(function (o, k) { vecs.push({ id: 'o' + k, name: names[k].slice(0, 2) + '′', x: o[0], y: o[1], cls: 'ok' }); });
          F.push({ narr: 'Picture: every output (green) is pulled towards the tokens its row attended to. Attention mixes information <i>between</i> positions; the feed-forward layer then transforms each position on its own.', parts: [plane('inputs (faded) and attention outputs (green)', vecs, { scale: 1.1 })] });
        }
        return F;
      }
    }, {
      title: 'Nearest-neighbour search over tiny embeddings',
      input: '1 0.2 | cat 1 0.1; dog 0.8 0.5; car 0.1 1; truck 0 0.9; kitten 0.95 0.2',
      inputLabel: 'query x y | name x y; name x y; … (2-D, up to 6 items)',
      gen: function (input) {
        var p = splitBar(input, 2, '1 0.2 | cat 1 0.1; dog 0.8 0.5');
        var q = parseVec(p[0], 'the query'), items = parseNamed(p[1]), F = [];
        if (q.length !== 2 || items.some(function (t) { return t.v.length !== 2; })) throw new Error('Use 2-D vectors for the picture');
        if (items.length > 6) throw new Error('At most 6 items');
        if (normv(q) === 0) throw new Error('The query cannot be all zeros');
        var sc = 1; items.forEach(function (t) { sc = Math.max(sc, Math.abs(t.v[0]), Math.abs(t.v[1])); });
        var all = items.map(function (t, k) { return { id: 'i' + k, name: t.name.slice(0, 3), x: t.v[0], y: t.v[1], cls: 'done', tag: t.name }; });
        F.push({ narr: 'Stored embeddings (one arrow per item) and the query (amber). Similar meaning = similar direction.', parts: [plane('stored items and the query', all.concat([{ id: 'q', name: 'q', x: q[0], y: q[1], cls: 'cur', tag: 'query' }]), { scale: sc })] });
        var nq = normv(q), qs = [q[0] / nq, q[1] / nq];
        var units = items.map(function (t) { var n0 = normv(t.v); return n0 ? [t.v[0] / n0, t.v[1] / n0] : [0, 0]; });
        F.push({ narr: 'Normalise everything to length 1 (done once, at insert time). Now a plain dot product equals cosine similarity.', parts: [plane('unit vectors', units.map(function (u, k) { return { id: 'u' + k, name: items[k].name.slice(0, 3), x: u[0], y: u[1], cls: 'done', tag: '' }; }).concat([{ id: 'q', name: 'q', x: qs[0], y: qs[1], cls: 'cur', tag: '' }]), { scale: 1 })] });
        var cos = units.map(function (u) { return dotv(u, qs); });
        var rows = [];
        items.forEach(function (t, k) {
          rows.push([t.name, vs(units[k]), r3(cos[k])]);
          var hh = {}; hh[k] = 'cur';
          F.push({ narr: 'Score "' + t.name + '": unit(' + t.name + ') · unit(q) = <b>' + r3(cos[k]) + '</b>.', parts: [
            { type: 'table', label: 'D · q, one row at a time', columns: ['item', 'unit vector', 'cosine'], rows: rows.map(function (r) { return r.slice(); }), hl: hh },
            { type: 'bars', label: 'cosine scores so far', values: cos.slice(0, k + 1).map(function (c) { return r3(Math.max(0, c)); }), idxLabels: items.slice(0, k + 1).map(function (x) { return x.name; }), texts: cos.slice(0, k + 1).map(function (c) { return String(r3(c)); }) }] });
        });
        var order = items.map(function (_, k) { return k; }).sort(function (a, b) { return cos[b] - cos[a] || a - b; });
        var top = order.slice(0, Math.min(2, order.length));
        var hl2 = {}; top.forEach(function (k) { hl2[k] = 'ok'; });
        F.push({ narr: 'Sort by score and keep the top k = ' + top.length + ': <b>' + top.map(function (k) { return items[k].name; }).join(', ') + '</b>. A vector database does exactly this, but with an index (HNSW, IVF) so it does not have to score every item.', parts: [
          plane('top-k results (green)', items.map(function (t, k) { return { id: 'i' + k, name: t.name.slice(0, 3), x: t.v[0], y: t.v[1], cls: top.indexOf(k) >= 0 ? 'ok' : 'done', tag: t.name }; }).concat([{ id: 'q', name: 'q', x: q[0], y: q[1], cls: 'cur', tag: 'query' }]), { scale: sc }),
          { type: 'table', label: 'ranking', columns: ['rank', 'item', 'cosine'], rows: order.map(function (k, r) { return [r + 1, items[k].name, r3(cos[k])]; }), hl: (function () { var h = {}; for (var r = 0; r < top.length; r++) h[r] = 'ok'; return h; })() }] });
        return F;
      }
    }],
    examples: [
      { title: 'Shapes through one attention head', html: `<p>n = 1,000 tokens, d<sub>model</sub> = 512, d<sub>k</sub> = 64. X: 1000×512. W<sub>Q</sub>: 512×64 → Q: 1000×64 (same for K, V). Q·Kᵀ: (1000×64)(64×1000) = 1000×1000 = one million scores. Weights · V: (1000×1000)(1000×64) = 1000×64. The n×n matrix is why long contexts are expensive: double n and that matrix gets 4× bigger.</p>` },
      { title: 'Causal mask', html: `<p>When generating text, token i must not peek at later tokens. Before the softmax, set every score above the diagonal to −∞. Row 1 then has only one real score (weight 1 on itself), row 2 spreads over tokens 1–2, and so on. In matrix terms it is an element-wise mask on Q·Kᵀ, with the same shapes as before.</p>` },
      { title: 'Search as one matrix-vector product', html: `<p>Four unit document vectors as rows of D (4×2): [1, 0], [0.6, 0.8], [0, 1], [−1, 0]. Query q = [0.8, 0.6]. D·q = [0.8, 0.96, 0.6, −0.8]. Top-2: document 2 (0.96), then document 1 (0.8). In NumPy: <code>np.argsort(-(D @ q))[:2]</code>.</p>`, code: { lang: 'python', run: true, code: `D = [[1, 0], [0.6, 0.8], [0, 1], [-1, 0]]    # unit document vectors (rows)
q = [0.8, 0.6]                                # unit query
scores = [sum(a * b for a, b in zip(row, q)) for row in D]   # D . q
top2 = sorted(range(len(D)), key=lambda i: (-scores[i], i))[:2]
print("scores:", [round(s, 3) for s in scores])   # [0.8, 0.96, 0.6, -0.8]
print("top-2 documents:", top2)                    # [1, 0]
` } },
      { title: 'king − man + woman', html: `<p>With good word embeddings, the vector difference "woman − man" points in a roughly "gender" direction. Adding it to "king" lands near "queen". It is plain vector addition and subtraction followed by a nearest-neighbour search (excluding the input words). It works only approximately, and only for some relations, but it shows that directions in embedding space can carry meaning.</p>` }
    ],
    deepDive: `<p><b>🟣 Why attention needs both Q and K.</b> Using Q = K would make the score matrix symmetric ("A attends to B exactly as much as B attends to A"). Separate W<sub>Q</sub> and W<sub>K</sub> let "it" look for a noun while the noun advertises being a noun. The score matrix Q·Kᵀ = X W<sub>Q</sub> W<sub>K</sub>ᵀ Xᵀ has rank at most d<sub>k</sub>, a low-rank bilinear form; this is one reason heads are cheap.</p>
      <p><b>Why √d<sub>k</sub> exactly.</b> If the entries of q and k are independent with mean 0 and variance 1, then q·k is a sum of d<sub>k</sub> terms each with variance 1, so its variance is d<sub>k</sub> and its spread is √d<sub>k</sub>. Dividing by √d<sub>k</sub> brings the variance back to 1, whatever the head size.</p>
      <p><b>Costs.</b> Attention costs O(n²·d) time and O(n²) memory for the weights. FlashAttention computes the same result in tiles without storing the full n×n matrix (exact, just smarter memory use). The KV cache stores K and V rows of past tokens so each new token costs O(n·d) instead of recomputing everything.</p>
      <p><b>Exact vs approximate search.</b> Brute-force search is one D·q product: O(N·d), perfect recall. HNSW (a graph of shortcuts) and IVF (clustering with k-means, then scanning a few clusters) trade a little recall for 10–1000× speed. Product quantisation compresses vectors into short codes, shrinking memory by 10–30×. All of these are judged by recall@k against the exact brute-force answer.</p>`,
    aiEra: `<p><b>🤖 In AI systems.</b> Every "chat with your docs" product runs the search half of this topic on each question, and every LLM runs the attention half at every layer for every token. Practical knobs you will tune are linear-algebra knobs: embedding dimension (memory vs quality), normalisation (dot vs cosine), top-k, similarity threshold, PCA or quantisation to shrink vectors, and context length (the n² cost).</p>
      <p><b>Working with AI assistants.</b> To check generated attention code, run it on a 3-token example where you can compute the answer by hand (like the one above), assert that each softmax row sums to 1, check that the causal mask leaves row 0 with a single non-zero weight, and print shapes at each step. For retrieval code, compare the approximate index against brute-force <code>D @ q</code> on a sample of queries to measure recall before shipping.</p>`,
    problems: [
      PR('nearest', {
        title: 'Top-k Nearest Neighbours by Cosine Similarity', level: 'Medium', tags: ['embeddings', 'cosine', 'vector search'], companies: ['Pinecone', 'Microsoft', 'Spotify'],
        statement: `<p>Write <code>nearest_neighbours(query, embeddings, k)</code>. Return the indices of the k stored embeddings most similar to <code>query</code> by cosine similarity, best first. Break ties by smaller index. If k is larger than the number of embeddings, return all of them. A zero vector has similarity 0 with everything.</p>`,
        constraints: `<p>0 ≤ k; 1 ≤ N ≤ 10<sup>4</sup> embeddings; 1 ≤ d ≤ 1,536; all vectors have the same length.</p>`,
        example: `<p>query <code>[1, 0]</code>, embeddings <code>[[0, 1], [1, 0.1], [−1, 0], [0.7, 0.7]]</code>, k = 2 → <code class="c-g">[1, 3]</code>. Why: cosines are 0, 0.995, −1, 0.707. The best is index 1, then index 3.</p>
          <p><code>[1, 0]</code> vs <code>[[3, 0], [1, 0], [5, 0]]</code>, k = 2 → <code class="c-y">[0, 1]</code>: all three tie at cosine 1, so smaller indices win.</p>`,
        bruteWhy: `<p>The brute version finds the single best item, removes it, and repeats k times. Each round rescans all N items and recomputes cosine, so the cost is O(k·N·d). Scoring every item once (O(N·d)) and sorting (O(N log N)), or using a size-k heap (O(N log k)), is much cheaper for large k.</p>`,
        mcq: { q: `Your embeddings are all already unit length. What is the cheapest correct way to score a unit query against N of them?`, options: ['One dot product per item (D · q)', 'Euclidean distance with square roots', 'Recompute every norm each query', 'Sort the raw vectors'], answer: 0, explain: `For unit vectors the dot product is the cosine, so D·q gives every score with no division. Euclidean distance would rank identically for unit vectors, but costs a little more.` },
        hints: [
          `Hint 1: Compute a cosine score for every stored vector. Then this is just "sort by score, take k".`,
          `Hint 2: Store pairs (score, index) and sort with key (−score, index) so ties go to the smaller index.`,
          `Hint 3: Round scores (e.g. to 9 decimals) before comparing so floating-point noise does not break ties. Slice the first k; Python slicing already handles k &gt; N and k = 0.`
        ],
        approach: `<p>Score every embedding with cosine similarity against the query (guarding zero vectors), sort by descending score with index as the tie-breaker, and return the first k indices. In production you would normalise once at insert time, use a matrix-vector product, and a heap or an ANN index instead of a full sort.</p>`,
        dry: { head: ['index', 'vector', 'cosine with [1, 0]', 'rank'], rows: [['0', '[0, 1]', '0', '3'], ['1', '[1, 0.1]', '0.995', '1 ✅'], ['2', '[−1, 0]', '−1', '4'], ['3', '[0.7, 0.7]', '0.707', '2 ✅']] },
        complexity: `<p>O(N·d) to score plus O(N log N) to sort (O(N log k) with a heap); O(N) extra space.</p>`,
        followUps: ['How would you change this to return results above a similarity threshold instead of a fixed k?', 'How do HNSW and IVF avoid scoring every vector?']
      })
    ]
  });

  // ===================== PRACTICE =====================
  practice.push(PR('distance', {
    title: 'Euclidean Distance Between Two Points', level: 'Easy', tags: ['vectors', 'distance'], companies: ['Uber', 'Amazon'],
    statement: `<p>Write <code>euclidean_distance(a, b)</code> returning the straight-line distance between two points of the same dimension.</p>`,
    constraints: `<p>1 ≤ d ≤ 4096. Entries are floats. Compared with a small tolerance.</p>`,
    example: `<p><code>[1, 2, 3]</code> and <code>[4, 6, 3]</code> → <code class="c-g">5.0</code>. Why: differences 3, 4, 0; squares 9, 16, 0; √25 = 5.</p>`,
    bruteWhy: `<p>Some people add the absolute differences (|3| + |4| = 7). That is the L1 "taxicab" distance, a different measure. Euclidean distance squares the differences and takes a square root, which is Pythagoras in d dimensions.</p>`,
    mcq: { q: `Distance from (0, 0) to (6, 8)?`, options: ['10', '14', '48', '100'], answer: 0, explain: `√(36 + 64) = √100 = 10.` },
    hints: [
      `Hint 1: Distance between two points = length of the vector that joins them, b − a.`,
      `Hint 2: Subtract slot by slot, square each difference, add them up, then take math.sqrt.`,
      `Hint 3: One line: math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b))). Identical points give 0.`
    ],
    approach: `<p>Sum the squared slot differences and take the square root. For unit vectors, squared distance = 2 − 2·cosine, so ranking by distance or by cosine gives the same order.</p>`,
    complexity: `<p>O(d) time, O(1) extra space.</p>`,
    followUps: ['Why do many vector databases skip the square root when ranking?', 'When is L1 distance a better choice?']
  }));

  practice.push(PR('transpose', {
    title: 'Transpose a Matrix', level: 'Easy', tags: ['matrices', 'transpose'], companies: ['Google'],
    statement: `<p>Write <code>transpose(M)</code> that returns Mᵀ: entry (i, j) moves to (j, i), so an r×c matrix becomes c×r.</p>`,
    constraints: `<p>1 ≤ r, c ≤ 1000. M is rectangular (all rows the same length).</p>`,
    example: `<p><code>[[1, 2, 3], [4, 5, 6]]</code> → <code class="c-g">[[1, 4], [2, 5], [3, 6]]</code>. Row 1 [1, 2, 3] became column 1.</p>`,
    bruteWhy: `<p>Swapping M[i][j] with M[j][i] in place only works for square matrices, and doing it for every (i, j) pair swaps each pair twice, undoing the work. Build a new c×r matrix instead.</p>`,
    mcq: { q: `A is 3×5. What shape is Aᵀ, and what shape is A·Aᵀ?`, options: ['5×3 and 3×3', '3×5 and 5×5', '5×3 and 5×5', '3×3 and 3×3'], answer: 0, explain: `Transposing swaps the shape to 5×3. (3×5)(5×3) = 3×3, a table of every row's dot product with every row.` },
    hints: [
      `Hint 1: The new matrix has as many rows as M has columns, and as many columns as M has rows.`,
      `Hint 2: New row j = [M[0][j], M[1][j], ..., M[r-1][j]]: column j of M read top to bottom.`,
      `Hint 3: A nested comprehension does it: [[M[i][j] for i in range(r)] for j in range(c)]. Or list(map(list, zip(*M))).`
    ],
    approach: `<p>Create a c×r result where row j is column j of M. In Python, <code>zip(*M)</code> walks the columns directly.</p>`,
    complexity: `<p>O(r·c) time and space.</p>`,
    followUps: ['What does (A·B)ᵀ equal?', 'Why does NumPy transpose in O(1)?']
  }));

  practice.push(PR('matvec', {
    title: 'Matrix-Vector Product with a Shape Check', level: 'Easy', tags: ['matrices', 'shapes'], companies: ['Meta'],
    statement: `<p>Write <code>mat_vec(M, v)</code> that returns M·v. If any row of M has a different length from v, return <code>[]</code>.</p>`,
    constraints: `<p>1 ≤ rows ≤ 1000, 1 ≤ len(v) ≤ 1000.</p>`,
    example: `<p><code>M = [[1, 0, 2], [0, 1, −1]]</code>, <code>v = [3, 4, 5]</code> → <code class="c-g">[13, −1]</code>. Row 1: 3 + 0 + 10 = 13. Row 2: 0 + 4 − 5 = −1.</p>`,
    bruteWhy: `<p>Using Python's <code>zip</code> without checking lengths silently ignores extra numbers, so a 2×2 matrix times a 3-vector "works" and returns a wrong answer. Always check shapes first. Silent truncation is one of the nastiest bugs in hand-written vector code.</p>`,
    mcq: { q: `M is 4×3. Which vector lengths can it multiply?`, options: ['Only length 3', 'Only length 4', 'Any length', 'Length 12'], answer: 0, explain: `The number of columns (3) must equal the length of v. The output has length 4.` },
    hints: [
      `Hint 1: Each output slot is one row of M dotted with v, so there is one output per row.`,
      `Hint 2: Check that every row has len(v) entries before computing anything; otherwise return [].`,
      `Hint 3: [sum(m * x for m, x in zip(row, v)) for row in M] gives the answer once the shapes are known to match.`
    ],
    approach: `<p>Validate shapes, then compute one dot product per row. This is exactly what a neural layer does for one input (before adding the bias).</p>`,
    complexity: `<p>O(rows × cols) time, O(rows) space.</p>`,
    followUps: ['How does this become a matrix-matrix product for a batch?', 'What does the column view of M·v say?']
  }));

  practice.push(PR('det2', {
    title: 'Determinant of a 2×2 (Signed Area)', level: 'Easy', tags: ['determinant', 'matrices'], companies: ['Unity', 'Apple'],
    statement: `<p>Write <code>det_2x2(M)</code> returning a·d − b·c for <code>M = [[a, b], [c, d]]</code>. (Its absolute value is how much M scales areas; the sign says whether it mirrors.)</p>`,
    constraints: `<p>Entries are floats with |x| ≤ 10<sup>6</sup>.</p>`,
    example: `<p><code>[[3, 1], [2, 4]]</code> → <code class="c-g">10</code>: 12 − 2. <code>[[0, 1], [1, 0]]</code> → <code class="c-r">−1</code>: swapping x and y is a mirror.</p>`,
    bruteWhy: `<p>Mixing up the diagonals (b·c − a·d, or a·b − c·d) is the usual mistake: the first flips the sign, the second is meaningless. Remember "main diagonal minus the other diagonal".</p>`,
    mcq: { q: `det = 0 means…`, options: ['the matrix squashes the plane onto a line or point, so it has no inverse', 'the matrix is the identity', 'the matrix rotates by 90°', 'all entries are 0'], answer: 0, explain: `Area scale 0 means a dimension is lost. [[1, 2], [2, 4]] has det 0 without any zero entries.` },
    hints: [
      `Hint 1: Unpack the four numbers: (a, b), (c, d) = M. The formula needs nothing else.`,
      `Hint 2: Main diagonal product minus anti-diagonal product: a*d − b*c.`,
      `Hint 3: Check with known cases: identity gives 1, a scale by 2 in both directions gives 4, a rotation gives 1, a mirror gives −1.`
    ],
    approach: `<p>Return a·d − b·c. Use it to test invertibility (non-zero), orientation (sign), and area scaling (absolute value).</p>`,
    complexity: `<p>O(1): a fixed handful of multiplications.</p>`,
    followUps: ['How is the 3×3 determinant computed?', 'Why is det(A·B) = det(A)·det(B)?']
  }));

  practice.push(PR('project', {
    title: 'Project a Point onto a Line Through the Origin', level: 'Medium', tags: ['projection', 'dot product'], companies: ['Tesla', 'Waymo'],
    statement: `<p>A line passes through the origin in direction <code>d</code>. Write <code>project_onto_line(p, d)</code> returning the point on that line closest to <code>p</code> (the orthogonal projection). If d is the zero vector, return the origin.</p>`,
    constraints: `<p>2 ≤ dimension ≤ 1000. d need not be unit length.</p>`,
    example: `<p><code>p = [1, 3]</code>, <code>d = [1, 1]</code> → <code class="c-g">[2, 2]</code>. Why: p·d = 4, d·d = 2, t = 2, so 2·[1, 1]. The leftover [−1, 1] is at right angles to d (dot = 0).</p>`,
    bruteWhy: `<p>The brute version walks along the line in steps of 0.001 between −20 and 20 and keeps the closest point: 40,001 tries, only approximately right, and wrong if the answer lies beyond ±20 steps. The formula (p·d / d·d)·d is exact and instant.</p>`,
    mcq: { q: `Project [3, 4] onto direction [2, 0]. Result?`, options: ['[3, 0]', '[6, 0]', '[2, 0]', '[0, 4]'], answer: 0, explain: `p·d = 6, d·d = 4, t = 1.5, so 1.5·[2, 0] = [3, 0]. The length of d does not matter; only its direction.` },
    hints: [
      `Hint 1: The closest point is where the leftover (p − projection) is perpendicular to d, i.e. its dot product with d is 0.`,
      `Hint 2: Solving (p − t·d)·d = 0 gives t = (p·d) / (d·d). The answer is t·d.`,
      `Hint 3: Dividing by d·d (not by |d|) means d need not be unit length. If d·d = 0, return zeros.`
    ],
    approach: `<p>Compute t = (p·d)/(d·d) and return t·d. This is one step of PCA (projecting onto a component), of Gram–Schmidt and of least squares.</p>`,
    dry: { head: ['step', 'value'], rows: [['p·d', '1·1 + 3·1 = 4'], ['d·d', '2'], ['t', '2'], ['t·d', '[2, 2]']] },
    complexity: `<p>O(d) time, O(d) space for the result.</p>`,
    followUps: ['How would you project onto a plane spanned by two directions?', 'What is the distance from p to the line?']
  }));

  practice.push(PR('cosmatrix', {
    title: 'All-Pairs Cosine Similarity Matrix', level: 'Medium', tags: ['cosine', 'matrices', 'embeddings'], companies: ['Google', 'Pinterest'],
    statement: `<p>Given N vectors, write <code>cosine_matrix(vectors)</code> returning the N×N matrix S with S[i][j] = cosine similarity of vectors i and j. Treat a zero vector's similarity with anything (including itself) as 0.</p>`,
    constraints: `<p>1 ≤ N ≤ 500, 1 ≤ d ≤ 1536.</p>`,
    example: `<p><code>[[1, 0], [1, 1], [0, 2]]</code> → <code class="c-g">[[1, 0.707, 0], [0.707, 1, 0.707], [0, 0.707, 1]]</code>. The diagonal is 1 (every vector matches itself) and the matrix is symmetric.</p>`,
    bruteWhy: `<p>Calling a full cosine function for each of the N² pairs recomputes every vector's norm N times and computes both (i, j) and (j, i). Normalising each vector once (U) and then taking U·Uᵀ, filling only the upper triangle, does about half the work with no repeated norms.</p>`,
    mcq: { q: `With rows normalised into U (N×d), the similarity matrix is…`, options: ['U · Uᵀ', 'Uᵀ · U', 'U · U', 'U + Uᵀ'], answer: 0, explain: `(N×d)(d×N) = N×N, and cell (i, j) = row i · row j. Uᵀ·U would be d×d, the (uncentred) covariance-like matrix of the features.` },
    hints: [
      `Hint 1: Normalise every vector to unit length once. Then cosine of a pair is a plain dot product.`,
      `Hint 2: S[i][j] = S[j][i], so loop j from i to N − 1 and fill both cells.`,
      `Hint 3: A zero vector stays all zeros after "normalising", which automatically makes its row and column 0.`
    ],
    approach: `<p>Build U with unit rows, then compute the upper triangle of U·Uᵀ and mirror it. This is the "Gram matrix" used for deduplication, clustering and attention-score intuition.</p>`,
    complexity: `<p>O(N²·d) time, O(N²) space for the output.</p>`,
    followUps: ['How would you find near-duplicate pairs among 10 million vectors?', 'Why is this matrix always positive semi-definite?']
  }));

  practice.push(PR('compose', {
    title: 'Compose a Sequence of Transformations into One Matrix', level: 'Medium', tags: ['matrix multiplication', 'transformations'], companies: ['Adobe', 'Nvidia'],
    statement: `<p>A list of square matrices <code>steps</code> is applied to points in order: steps[0] first, then steps[1], and so on. Write <code>compose_transforms(steps)</code> returning the single matrix T that does the same thing in one go.</p>`,
    constraints: `<p>1 ≤ len(steps) ≤ 100; all matrices are n×n with n ≤ 10.</p>`,
    example: `<p>steps = [stretch x by 2 <code>[[2, 0], [0, 1]]</code>, rotate 90° <code>[[0, −1], [1, 0]]</code>] → <code class="c-g">[[0, −1], [2, 0]]</code>. Check with [1, 0]: stretch → [2, 0], rotate → [0, 2]; and T·[1, 0] = [0, 2] ✅.</p>`,
    bruteWhy: `<p>Multiplying in list order (steps[0]·steps[1]·…) gives the transforms applied in <i>reverse</i>. With the example it returns [[0, −2], [1, 0]], which rotates first and then stretches. The newest step must go on the left: T = S<sub>k</sub>·…·S<sub>1</sub>·S<sub>0</sub>.</p>`,
    mcq: { q: `You apply A then B to a vector v. Which product is the combined matrix?`, options: ['B·A', 'A·B', 'A + B', 'Aᵀ·B'], answer: 0, explain: `First A·v, then B·(A·v) = (B·A)·v. The matrix nearest the vector acts first.` },
    hints: [
      `Hint 1: Start from the identity matrix, which means "do nothing yet".`,
      `Hint 2: For each step S in order, update T = S · T (new step on the left).`,
      `Hint 3: Test with two transforms that do not commute (stretch and rotate) to make sure the order is right.`
    ],
    approach: `<p>T = I; for each S in steps: T = S·T. Matrix multiplication is associative, so one combined matrix replaces many per-point steps.</p>`,
    complexity: `<p>O(k·n³) for k steps of n×n matrices; O(n²) space.</p>`,
    followUps: ['How would you apply the same rotation 10⁹ times quickly? (repeated squaring)', 'Why does composition stay linear?']
  }));

  practice.push(PR('solve2', {
    title: 'Solve a 2×2 System (Where Two Lines Cross)', level: 'Medium', tags: ['linear systems', 'inverse'], companies: ['Bloomberg'],
    statement: `<p>Write <code>solve_2x2(A, b)</code> for a 2×2 matrix A and length-2 b, returning [x, y] with A·[x, y] = b. If the determinant is (almost) zero, return <code>[]</code>.</p>`,
    constraints: `<p>Entries are floats with |x| ≤ 10<sup>6</sup>; use 10<sup>−12</sup> as the singular threshold.</p>`,
    example: `<p>A = <code>[[1, 2], [3, 4]]</code>, b = <code>[5, 6]</code> → <code class="c-g">[−4, 4.5]</code>. Check: −4 + 9 = 5 ✅ and −12 + 18 = 6 ✅.</p>`,
    bruteWhy: `<p>Searching a grid of (x, y) values is slow and only finds answers on the grid. Elimination or the 2×2 inverse formula gives the exact crossing point in a handful of operations.</p>`,
    mcq: { q: `x + y = 2 and 2x + 2y = 5. How many solutions?`, options: ['None: parallel lines', 'Exactly one', 'Infinitely many', 'Two'], answer: 0, explain: `The second line is the first doubled on the left but not on the right (4 ≠ 5). Same slope, different offset: parallel, never crossing. det = 1·2 − 1·2 = 0.` },
    hints: [
      `Hint 1: The inverse formula for 2×2 gives x = (s·b₀ − q·b₁)/det and y = (−r·b₀ + p·b₁)/det for A = [[p, q], [r, s]].`,
      `Hint 2: This is the same as Cramer's rule: replace one column of A by b, take its determinant, divide by det(A).`,
      `Hint 3: Check abs(det) &lt; 1e-12 first and return []. Always verify by substituting the answer back.`
    ],
    approach: `<p>Compute det = p·s − q·r; if zero return []; otherwise apply x = A⁻¹·b using the swap–negate–divide inverse. For bigger systems, use elimination instead.</p>`,
    complexity: `<p>O(1): a fixed handful of multiplications.</p>`,
    followUps: ['How does this generalise to n×n?', 'What changes if the measurements in b are noisy?']
  }));

  practice.push(PR('kcomp', {
    title: 'How Many PCA Components Keep the Variance?', level: 'Medium', tags: ['pca', 'explained variance'], companies: ['Netflix', 'Spotify'],
    statement: `<p>Given the eigenvalues of a covariance matrix (any order) and a threshold between 0 and 1, write <code>components_for_variance(eigenvalues, threshold)</code> returning the smallest k such that the top k components explain at least <code>threshold</code> of the total variance. Return 0 if the total is 0 or the threshold is 0.</p>`,
    constraints: `<p>1 ≤ n ≤ 10<sup>5</sup>; eigenvalues ≥ 0; 0 ≤ threshold ≤ 1. Use a tiny tolerance (10<sup>−12</sup>) when comparing fractions.</p>`,
    example: `<p><code>[5, 3, 1.5, 0.5]</code>, threshold 0.9 → <code class="c-g">3</code>. Cumulative: 0.5, 0.8, 0.95 ≥ 0.9 at k = 3. With threshold 0.8 → 2 (exactly 0.8 counts).</p>`,
    bruteWhy: `<p>Trying every k from 1 to n and recomputing the sum each time is O(n²). Sort once, then walk down the list with a running total and stop as soon as the fraction reaches the threshold: O(n log n).</p>`,
    mcq: { q: `Cumulative explained variance is 62%, 81%, 90%, 96%, 100%. Smallest k for 95%?`, options: ['4', '3', '5', '2'], answer: 0, explain: `90% (k = 3) is not enough; 96% (k = 4) is the first value ≥ 95%.` },
    hints: [
      `Hint 1: Sort the eigenvalues from largest to smallest, because PCA keeps the biggest directions first.`,
      `Hint 2: Keep a running sum. Before adding the next eigenvalue, check whether running / total already reaches the threshold.`,
      `Hint 3: Floating-point fractions like 8/10 can be 0.7999999; compare with threshold − 1e-12. Handle total = 0 by returning 0.`
    ],
    approach: `<p>Sort descending; walk with a running total; return the count at the moment the fraction first reaches the threshold. This is the standard way to pick the number of components in practice.</p>`,
    complexity: `<p>O(n log n) time, O(n) space.</p>`,
    followUps: ['What is a scree plot and where is its "elbow"?', 'Why might you still keep fewer components than this rule says?']
  }));

  practice.push(PR('search', {
    title: 'Semantic Search with a Similarity Threshold', level: 'Medium', tags: ['embeddings', 'cosine', 'retrieval'], companies: ['Elastic', 'OpenAI'],
    statement: `<p>Write <code>semantic_search(query, docs, threshold)</code> that returns the indices of all documents whose cosine similarity with the query is at least <code>threshold</code>, best first, ties broken by smaller index. Zero vectors score 0.</p>`,
    constraints: `<p>1 ≤ N ≤ 10<sup>5</sup>, 1 ≤ d ≤ 1536, −1 ≤ threshold ≤ 1. Use a small tolerance (10<sup>−9</sup>) for the threshold check.</p>`,
    example: `<p>query <code>[1, 0]</code>, docs <code>[[1, 0], [0, 1], [1, 1], [−1, 0]]</code>, threshold 0.7 → <code class="c-g">[0, 2]</code>. Cosines are 1, 0, 0.707, −1; only the first and third pass.</p>`,
    bruteWhy: `<p>Returning a fixed top-k always returns k results, even when nothing is relevant (a RAG system then stuffs junk into the prompt). A threshold returns nothing when nothing is close enough. The two are often combined: top-k, then drop anything under the threshold.</p>`,
    mcq: { q: `Why might the same 0.8 threshold work for one embedding model and fail for another?`, options: ['Different models spread cosine scores over different ranges', 'Cosine depends on the document length', 'Thresholds only work with Euclidean distance', 'It never works'], answer: 0, explain: `Some models put unrelated texts at 0.1 and others at 0.7. Thresholds must be tuned per model on labelled examples.` },
    hints: [
      `Hint 1: Normalise the query once, normalise each document, and use dot products as cosine scores.`,
      `Hint 2: Keep (score, index) for documents with score ≥ threshold − 1e-9, then sort by (−score, index).`,
      `Hint 3: Round scores before sorting so values like 0.70710678 and 0.70710679 tie properly. Return just the indices.`
    ],
    approach: `<p>Filter by cosine ≥ threshold, then sort the survivors best first. In production the document vectors are normalised at ingest and scored with one matrix-vector product or an ANN index.</p>`,
    complexity: `<p>O(N·d) to score plus O(m log m) to sort the m matches; O(N) space.</p>`,
    followUps: ['How would you choose the threshold from labelled data?', 'How would you combine this with keyword (BM25) search?']
  }));

  practice.push(PR('rank', {
    title: 'Rank of a Matrix by Elimination', level: 'Hard', tags: ['rank', 'gaussian elimination'], companies: ['MathWorks', 'Jane Street'],
    statement: `<p>Write <code>matrix_rank(M)</code> for any r×c matrix: the number of independent directions (independent rows), found by Gaussian elimination with partial pivoting. Treat absolute values below 10<sup>−9</sup> as zero.</p>`,
    constraints: `<p>1 ≤ r, c ≤ 100. Entries are floats with moderate size.</p>`,
    example: `<p><code>[[1, 2, 3], [4, 5, 6], [7, 8, 9]]</code> → <code class="c-g">2</code>. Why: row 3 = 2·row 2 − row 1, so only two rows are independent. Elimination leaves a zero row.</p>`,
    bruteWhy: `<p>Checking every subset of rows for independence is exponential (2<sup>r</sup> subsets). Checking only whether rows are exact multiples of each other misses combinations like row 3 = 2·row 2 − row 1. Elimination finds the answer in O(r·c·min(r, c)).</p>`,
    mcq: { q: `A 4×3 matrix can have rank at most…`, options: ['3', '4', '12', '7'], answer: 0, explain: `Rank ≤ min(rows, columns). Three columns can span at most 3 directions.` },
    hints: [
      `Hint 1: Every non-zero pivot you find during elimination is one independent direction. Count them.`,
      `Hint 2: Walk across columns with a current row pointer r. In each column choose the largest |value| at or below r; if it is ~0, skip the column (r stays); otherwise swap it up, clear below, and advance r.`,
      `Hint 3: Stop when r reaches the number of rows. Work on a float copy and use a tolerance like 1e-9 rather than == 0.`
    ],
    approach: `<p>Row-reduce to echelon form while counting pivots. Columns without a usable pivot are skipped (they depend on earlier columns). The pivot count is the rank. In practice, numerical rank is computed from the SVD by counting singular values above a tolerance.</p>`,
    dry: { head: ['column', 'pivot', 'after clearing', 'rank so far'], rows: [['1', '7 (swap R3 up)', 'R2, R3 get 0 in col 1', '1'], ['2', '≈ 0.857', 'R3 becomes [0, 0, 0]', '2'], ['3', 'none (≈ 0)', '-', '2']] },
    complexity: `<p>O(r·c·min(r, c)) time, O(r·c) space for the copy.</p>`,
    followUps: ['How does rank relate to the number of non-zero singular values?', 'Why is "numerical rank" tolerance-dependent?']
  }));

  practice.push(PR('pca', {
    title: 'PCA from Scratch: First Component\'s Explained Variance', level: 'Hard', tags: ['pca', 'covariance', 'power iteration'], companies: ['Amazon', 'Two Sigma'],
    statement: `<p>Given n data points of dimension d, write <code>pca_top_ratio(points)</code> returning the fraction of total variance explained by the first principal component. Steps: centre the data, build the covariance matrix (divide by n − 1), find its top eigenvalue (power iteration is fine), divide by the trace. Return 0.0 if all points are identical.</p>`,
    constraints: `<p>2 ≤ n ≤ 1000, 1 ≤ d ≤ 20. If the top eigenvalue is repeated (e.g. points spread evenly in every direction), the ratio is still well defined: power iteration still returns that eigenvalue.</p>`,
    example: `<p>Points <code>[[0, 0], [2, 0], [0, 1], [2, 1]]</code> → <code class="c-g">0.8</code>. Why: var(x) = 4/3, var(y) = 1/3, cov = 0; eigenvalues are 4/3 and 1/3; 4/3 ÷ 5/3 = 0.8.</p>`,
    bruteWhy: `<p>Trying many directions (say every 1°) and measuring the spread of the projections works in 2-D but needs an impossible number of directions in 20-D, and only gets close to the answer. The covariance eigenvector is the exact best direction.</p>`,
    mcq: { q: `Why must you centre the data before computing PCA?`, options: ['Otherwise PC1 points towards the mean instead of along the spread', 'To make the numbers positive', 'Because eigenvalues must be integers', 'It is optional and never changes the result'], answer: 0, explain: `Without centring, XᵀX is dominated by the mean's position, so the "top direction" is roughly "from the origin to the data", not the direction of variation.` },
    hints: [
      `Hint 1: Compute each column's mean and subtract it. Then C[a][b] = Σ_i X[i][a]·X[i][b] / (n − 1).`,
      `Hint 2: The trace (sum of the diagonal of C) equals the sum of all eigenvalues = total variance. If it is 0, return 0.0.`,
      `Hint 3: Power iteration on C (multiply, normalise, repeat ~500 times from a non-uniform start like [1, 1.1, 1.2, …]); λ = v·Cv. Answer = λ / trace.`
    ],
    approach: `<p>Centre → covariance → top eigenvalue by power iteration → divide by trace. The ratio says how well a single number per point summarises the data. Libraries do the same via SVD of the centred data.</p>`,
    complexity: `<p>O(n·d²) to build C plus O(iters·d²) for power iteration; O(n·d + d²) space.</p>`,
    followUps: ['How would you get the second component?', 'How does SVD of the centred data give the same answer more accurately?']
  }));

  practice.push(PR('attention', {
    title: 'One Attention Step for a Single Query', level: 'Hard', tags: ['attention', 'softmax', 'transformers'], companies: ['Anthropic', 'OpenAI', 'Google DeepMind'],
    statement: `<p>Write <code>attention_output(q, K, V)</code>. q is one query vector (length d), K is a list of n key vectors (length d) and V a list of n value vectors (length d<sub>v</sub>). Return softmax(K·q / √d) · V: the weighted average of the value vectors. Use the numerically safe softmax (subtract the max).</p>`,
    constraints: `<p>1 ≤ n ≤ 4096, 1 ≤ d, d<sub>v</sub> ≤ 256. Scores may be large (up to ±1000), so the safe softmax is required.</p>`,
    example: `<p>q = <code>[0, 0]</code>, K = <code>[[1, 0], [0, 1]]</code>, V = <code>[[10, 0], [0, 10]]</code> → <code class="c-g">[5, 5]</code>. Why: both scores are 0, softmax gives 0.5 and 0.5, and the output is the average of the two values.</p>
      <p>q = <code>[100, 0]</code>: scores 70.7 and 0, so nearly all weight goes to key 1 and the output ≈ <code>[1, 2]</code> = V[0].</p>`,
    bruteWhy: `<p>The naive softmax computes exp(score) directly. With a score of 1000, exp overflows to infinity and the result becomes NaN. Subtracting the maximum score first gives exactly the same weights (the common factor cancels) without overflow.</p>`,
    mcq: { q: `Scores after scaling are [2, 2, 2]. What are the attention weights?`, options: ['[1/3, 1/3, 1/3]', '[2/6, 2/6, 2/6] only if the scores are positive', '[1, 0, 0]', '[e², e², e²]'], answer: 0, explain: `Softmax of equal scores is uniform, whatever the value: e²/(3e²) = 1/3 each.` },
    hints: [
      `Hint 1: Score each key: s_i = (q · k_i) / √d. This is one row of Q·Kᵀ, scaled.`,
      `Hint 2: Safe softmax: m = max(s); e_i = exp(s_i − m); w_i = e_i / Σ e.`,
      `Hint 3: Output slot j = Σ_i w_i · V[i][j]. Check that the weights sum to 1 and the output has length d_v.`
    ],
    approach: `<p>Dot products with √d scaling, a stable softmax, then a weighted sum of value rows. Stack many queries as the rows of Q and this becomes the full matrix formula softmax(QKᵀ/√d)·V.</p>`,
    complexity: `<p>O(n·(d + d<sub>v</sub>)) time for one query, O(n) space for the weights. For all n queries: O(n²·d).</p>`,
    followUps: ['How would a causal mask change this for the i-th query?', 'Why does the KV cache make generating each new token O(n·d)?']
  }));

  practice.push(PR('inverse', {
    title: 'Inverse of an n×n Matrix with Gauss–Jordan', level: 'Hard', tags: ['inverse', 'gauss-jordan'], companies: ['MathWorks', 'Citadel'],
    statement: `<p>Write <code>inverse(M)</code> for a square n×n matrix. Return M⁻¹ as a list of rows, or <code>[]</code> if M is singular (no pivot above 10<sup>−12</sup> in some column). Use Gauss–Jordan elimination on [M | I] with partial pivoting.</p>`,
    constraints: `<p>1 ≤ n ≤ 50. Compared with tolerance about 10<sup>−5</sup>.</p>`,
    example: `<p><code>[[1, 2, 3], [0, 1, 4], [5, 6, 0]]</code> → <code class="c-g">[[−24, 18, 5], [20, −15, −4], [−5, 4, 1]]</code>. Check row 1 · column 1: −24 + 0 + 25 = 1 ✅.</p>
      <p><code>[[1, 2, 3], [4, 5, 6], [7, 8, 9]]</code> → <code class="c-r">[]</code> (rank 2).</p>`,
    bruteWhy: `<p>The textbook "adjugate over determinant" formula needs n² cofactors, each a determinant of size n − 1. Done recursively that is O(n!) work: hopeless beyond n ≈ 10, and numerically poor. Gauss–Jordan is O(n³).</p>`,
    mcq: { q: `In Gauss–Jordan on [M | I], when the left half has become I, the right half is…`, options: ['M⁻¹', 'Mᵀ', 'M', 'det(M)·I'], answer: 0, explain: `Each row operation is multiplication by some matrix E. If E·M = I then E = M⁻¹, and the same operations turned I into E·I = M⁻¹.` },
    hints: [
      `Hint 1: Build the n×2n augmented matrix: each row of M followed by the matching row of the identity.`,
      `Hint 2: For each column: pick the largest pivot at or below the diagonal, swap it up, divide its row by the pivot to make it 1, then subtract multiples of it from EVERY other row (above and below).`,
      `Hint 3: If a column has no pivot above 1e-12, return []. At the end the right half of each row is the inverse: [row[n:] for row in A].`
    ],
    approach: `<p>Gauss–Jordan: unlike plain elimination, it clears entries above the pivots too and scales each pivot to 1, so the left half becomes the identity and the right half becomes the inverse. Partial pivoting keeps it stable. (In real code prefer solve() over an explicit inverse.)</p>`,
    complexity: `<p>O(n³) time, O(n²) space.</p>`,
    followUps: ['Why is computing inv(A) and then inv(A)·b worse than solve(A, b)?', 'How would you detect an ill-conditioned matrix?']
  }));

  // ===================== QUIZ =====================
  quiz.push({ q: `What is the dot product of <code>[2, −1, 3]</code> and <code>[4, 5, 1]</code>?`, options: ['6', '8', '12', '[8, −5, 3]'], answer: 0, explain: `2×4 + (−1)×5 + 3×1 = 8 − 5 + 3 = 6. A dot product is a single number, not a vector.` });
  quiz.push({ q: `Cosine similarity of <code>[1, 2]</code> and <code>[3, 6]</code>?`, options: ['1', '0.5', '15', '0'], answer: 0, explain: `[3, 6] = 3 × [1, 2]: same direction, so the angle is 0° and cosine = 1. Length does not affect cosine.` });
  quiz.push({ q: `The matrix <code>[[0, −1], [1, 0]]</code> applied to <code>[1, 0]</code> gives…`, options: ['[0, 1]: a 90° anticlockwise turn', '[0, −1]', '[−1, 0]', '[1, 0]'], answer: 0, explain: `Column 1 of the matrix, [0, 1], is where [1, 0] lands. "Right" became "up".` });
  quiz.push({ q: `A is 3×4 and B is 4×2. Which is true?`, options: ['A·B is 3×2 and B·A is impossible', 'A·B is 4×4', 'Both A·B and B·A are 3×2', 'A·B is impossible'], answer: 0, explain: `(3×4)(4×2) → 3×2. (4×2)(3×4): inner sizes 2 and 3 differ, so B·A does not exist.` });
  quiz.push({ q: `For square matrices A and B, A·B = B·A…`, options: ['is not true in general', 'is always true', 'is true only if both are symmetric', 'is never true'], answer: 0, explain: `Rotate-then-stretch differs from stretch-then-rotate. Some pairs commute (e.g. A with the identity, or two diagonal matrices), but in general they do not.` });
  quiz.push({ q: `What is the inverse of <code>[[2, 0], [0, 5]]</code>?`, options: ['[[0.5, 0], [0, 0.2]]', '[[−2, 0], [0, −5]]', '[[5, 0], [0, 2]]', 'It has no inverse'], answer: 0, explain: `It stretches x by 2 and y by 5; undo by shrinking by 1/2 and 1/5. Formula: det = 10, swap → [[5, 0], [0, 2]], divide by 10.` });
  quiz.push({ q: `Which matrix has no inverse?`, options: ['[[2, 4], [1, 2]]', '[[1, 0], [0, 1]]', '[[0, 1], [1, 0]]', '[[3, 1], [1, 3]]'], answer: 0, explain: `det = 2×2 − 4×1 = 0. Column 2 is twice column 1, so the plane is squashed onto a line.` });
  quiz.push({ q: `During elimination you get the row <code>[0, 0 | 0]</code> in a 2×2 system. This means…`, options: ['infinitely many solutions (the equations are the same line)', 'no solution', 'x = 0 and y = 0', 'you must divide by zero'], answer: 0, explain: `0 = 0 is always true, so one equation was redundant. The solutions form a whole line. A row [0, 0 | 3] would mean no solution.` });
  quiz.push({ q: `v is an eigenvector of A with eigenvalue 3. What is A·(2v)?`, options: ['6v', '3v', '2v', '5v'], answer: 0, explain: `A(2v) = 2(Av) = 2(3v) = 6v. Any non-zero multiple of an eigenvector is also an eigenvector with the same eigenvalue.` });
  quiz.push({ q: `Covariance eigenvalues are 6, 2, 1, 1. How much variance do the top 2 components explain?`, options: ['80%', '60%', '20%', '8%'], answer: 0, explain: `(6 + 2) / (6 + 2 + 1 + 1) = 8 / 10 = 80%.` });
  quiz.push({ q: `In attention, why are scores divided by √d<sub>k</sub>?`, options: ['Dot products grow with dimension; scaling keeps softmax from becoming nearly one-hot', 'To make the scores positive', 'To normalise the value vectors', 'To make Q·Kᵀ symmetric'], answer: 0, explain: `The spread of a dot product of random d-dimensional vectors grows like √d. Dividing restores scores near unit scale, so softmax stays smooth and gradients flow.` });
  quiz.push({ q: `An embedding lookup for token 7 is equivalent to…`, options: ['multiplying a one-hot row (1 at position 7) by the embedding matrix', 'taking column 7 of the identity matrix', 'computing the cosine of token 7 with every token', 'inverting the embedding matrix'], answer: 0, explain: `The one-hot row picks out row 7 of E. Frameworks skip the multiplication and index the row directly, but the maths is the same.` });
  quiz.push({ q: `PCA is fitted on 768-D embeddings and you keep 128 components. The shape of the projection matrix applied to each embedding is…`, options: ['768 → 128: a 768×128 matrix (or its transpose)', '128×128', '768×768', '1×128'], answer: 0, explain: `Each centred 768-slot vector is multiplied by the 768×128 matrix of the top components (as columns), giving 128 numbers.` });

  // ===================== INTERVIEW =====================
  interview.push({ q: `Explain the dot product and cosine similarity to a non-technical colleague. When would you pick one over the other?`, level: 'B',
    a: `<p>The dot product multiplies matching numbers of two lists and adds them up: a single "agreement" score. It grows when the vectors point the same way <i>and</i> when they are long. Cosine similarity divides by both lengths, so it measures only direction: +1 same direction, 0 unrelated, −1 opposite. For text embeddings I default to cosine (or normalise once and use the dot product, which is then identical and cheaper), because document length should not decide relevance. I use the raw dot product when the model was trained for it or when magnitude carries meaning, such as popularity or confidence in some recommender models. I always check what the embedding model's documentation recommends.</p>`,
    followUps: ['What is cosine distance?', 'How does Euclidean distance relate to cosine for unit vectors?'] });
  interview.push({ q: `What does it mean that "a matrix is a transformation"? Give an example.`, level: 'B',
    a: `<p>A matrix is a rule that moves every vector in a consistent, linear way: it keeps the origin fixed and keeps lines straight and evenly spaced. You can read it from its columns: column 1 is where the first basis vector [1, 0] lands, column 2 is where [0, 1] lands, and any other vector x·[1, 0] + y·[0, 1] lands at x·(column 1) + y·(column 2). Example: [[0, −1], [1, 0]] sends right to up and up to left, so it rotates by 90°; [[2, 0], [0, 1]] stretches x by 2. In ML, a dense layer W turns a 768-number input into, say, 3,072 numbers in exactly this way, and then a non-linearity bends the result.</p>`,
    followUps: ['What does the determinant tell you about the transformation?', 'Why are non-linear activations needed between layers?'] });
  interview.push({ q: `How do you multiply two matrices, and how do you know whether you can?`, level: 'B',
    a: `<p>Cell (i, j) of A·B is the dot product of row i of A and column j of B. That requires the rows of A and the columns of B to have the same length, so the shapes must be (n×k)·(k×m); the result is n×m. I write the shapes side by side and cancel the inner k. The cost is n·k·m multiply-adds, so two 1,000×1,000 matrices take a billion. Order matters: A·B is usually not B·A, and in A·B·v the right-most matrix acts first. In NumPy I use <code>@</code> for matrix multiplication; <code>*</code> is element-wise, and mixing them up is a common silent bug on square matrices.</p>`,
    followUps: ['How would you choose the bracketing for A·B·C?', 'Why are GPUs good at this?'] });
  interview.push({ q: `What is the inverse of a matrix, when does it not exist, and should you compute it to solve A x = b?`, level: 'I',
    a: `<p>The inverse A⁻¹ undoes A: A⁻¹A = AA⁻¹ = I. It exists only for square matrices with non-zero determinant, i.e. when A does not squash space into fewer dimensions (columns independent, full rank). For 2×2 it is (1/det)·[[d, −b], [−c, a]]. To solve A x = b I would not form the inverse: a solver such as <code>np.linalg.solve</code> uses LU factorisation with pivoting, which is cheaper (about a third of the work) and more accurate. If A is nearly singular (large condition number), both approaches amplify noise; I would then look at the data (duplicate or collinear features), regularise (ridge adds λI), or use least squares via SVD.</p>`,
    followUps: ['What is the condition number?', 'What is the pseudo-inverse?'] });
  interview.push({ q: `Walk me through Gaussian elimination. Why does partial pivoting matter?`, level: 'I',
    a: `<p>Write the augmented matrix [A | b]. For each column from left to right, choose a pivot row, swap it onto the diagonal, and subtract multiples of it from the rows below so that the column becomes zero under the pivot. The result is upper triangular; then back-substitute from the bottom row up. If a column has no non-zero pivot, the system has no unique solution: a row reading 0 = c ≠ 0 means none, 0 = 0 means infinitely many. Partial pivoting picks the entry with the largest absolute value as the pivot. It avoids dividing by zero and, more subtly, avoids huge multipliers that magnify rounding errors; the classic example is 0.0001x + y = 1, x + y = 2, which goes badly wrong in low precision without a swap. Cost is about ⅔n³.</p>`,
    followUps: ['What is LU factorisation and why reuse it?', 'How do you compute the rank with elimination?'] });
  interview.push({ q: `Explain eigenvectors and eigenvalues intuitively, and describe power iteration.`, level: 'I',
    a: `<p>Most vectors get turned when a matrix is applied; eigenvectors are the special directions that only get scaled: A v = λ v, where λ is the stretch factor (negative means flipped). For [[2, 1], [1, 2]], [1, 1] is stretched by 3 and [1, −1] by 1. Power iteration finds the eigenvector with the largest |λ|: start from a random vector, repeatedly multiply by A and rescale to length 1. Each step multiplies the component along eigenvector i by λ<sub>i</sub>, so the dominant direction takes over at a rate set by |λ₂/λ₁|. The eigenvalue estimate is the Rayleigh quotient v·Av / v·v. It needs only matrix-vector products, which is why it scales to PageRank on huge sparse graphs, but it is slow if the top two eigenvalues are close.</p>`,
    followUps: ['How would you find the second eigenvector?', 'Why are eigenvalues of a covariance matrix never negative?'] });
  interview.push({ q: `Explain PCA step by step. How do you choose the number of components?`, level: 'I',
    a: `<p>(1) Centre each feature by subtracting its mean, and standardise if the units differ. (2) Compute the covariance matrix C = XᵀX/(n − 1). (3) Find its eigenvectors and eigenvalues; the eigenvectors are the principal directions (at right angles to each other), and each eigenvalue is the variance along its direction. (4) Sort by eigenvalue and project the data onto the top k directions. To choose k, compute the cumulative explained variance (λ₁ + … + λ<sub>k</sub>) / Σλ and pick the smallest k reaching a target such as 90–95%, or look for the elbow in a scree plot; then sanity-check on the downstream task, since the target that matters is accuracy or recall, not variance. In practice libraries compute PCA through the SVD of the centred data, which is more accurate, and PCA must be fitted on training data only.</p>`,
    followUps: ['What happens if you forget to centre?', 'When would PCA hurt a model?'] });
  interview.push({ q: `What is the SVD, and how is it related to PCA and low-rank approximation?`, level: 'A',
    a: `<p>The singular value decomposition writes any m×n matrix as A = U Σ Vᵀ, where U and V are orthogonal (rotations or reflections) and Σ is diagonal with non-negative singular values σ₁ ≥ σ₂ ≥ … So every linear map is rotate, stretch along axes, rotate. For centred data X, the columns of V are the principal components and the covariance eigenvalues are σ<sub>i</sub>²/(n − 1). Keeping only the top k singular values and vectors gives the best rank-k approximation in the least-squares sense (Eckart–Young), which underlies compression, matrix-factorisation recommenders, latent semantic analysis and the low-rank idea behind LoRA. The number of non-zero σ's is the rank, σ₁/σ<sub>min</sub> is the condition number, and the pseudo-inverse V Σ⁺ Uᵀ gives stable least-squares solutions.</p>`,
    followUps: ['How does randomised SVD speed things up?', 'Why is SVD preferred over forming XᵀX?'] });
  interview.push({ q: `Describe self-attention entirely in terms of linear algebra, including shapes.`, level: 'A',
    a: `<p>Input X is n×d (one row per token). Three learned matrices give Q = X W<sub>Q</sub>, K = X W<sub>K</sub>, V = X W<sub>V</sub>, each n×d<sub>k</sub>. Scores S = Q Kᵀ / √d<sub>k</sub> form an n×n matrix of every query dotted with every key. For decoder models, a causal mask sets entries above the diagonal to −∞. A row-wise softmax turns each row into weights that sum to 1, and the output is weights · V, n×d<sub>k</sub>: each token's new vector is a weighted average of value vectors. Multi-head attention runs h such heads with d<sub>k</sub> = d/h, concatenates them back to n×d, and multiplies by W<sub>O</sub>. The cost is O(n²·d) time and O(n²) memory for the weights, which is why context length is expensive; FlashAttention computes the same thing in tiles without storing the full matrix.</p>`,
    followUps: ['Why scale by √d_k specifically?', 'What does the KV cache store?'] });
  interview.push({ q: `You must search 10 million 768-dimensional embeddings under 50 ms. What linear algebra and engineering choices matter?`, level: 'A',
    a: `<p>Exact search is one matrix-vector product D·q: 10M × 768 ≈ 7.7 billion multiply-adds per query, too slow on a CPU for a 50 ms budget at any real load, and 30 GB in float32. Choices: (1) normalise at insert time so the dot product is cosine; (2) shrink vectors, with PCA (say 768 → 256, checking recall), native shorter embeddings, or quantisation (int8 or product quantisation, 4–30× smaller); (3) use an ANN index such as HNSW (graph of shortcuts, high recall, more memory) or IVF (k-means clusters, scan only a few lists), possibly IVF-PQ; (4) shard across machines and merge top-k results; (5) re-rank the top 100 with exact cosine or a cross-encoder. I would measure recall@10 against brute-force on a sample of queries and tune index parameters to balance recall, latency and memory.</p>`,
    followUps: ['How does HNSW work at a high level?', 'How would you handle frequent inserts and deletes?'] });
  interview.push({ q: `Why are symmetric matrices so common in ML, and what special properties do they have?`, level: 'A',
    a: `<p>Covariance matrices, Gram/similarity matrices XXᵀ, kernel matrices, Hessians of smooth losses and graph Laplacians are all symmetric because the quantity between i and j equals that between j and i. The spectral theorem guarantees that a real symmetric matrix has real eigenvalues and an orthonormal set of eigenvectors, so A = Q Λ Qᵀ with Q⁻¹ = Qᵀ. Covariance and Gram matrices are also positive semi-definite (all eigenvalues ≥ 0), because variance and squared lengths cannot be negative. Practically, this means stable, cheaper algorithms (<code>np.linalg.eigh</code>, Cholesky factorisation) and clean interpretations: in PCA the eigenvectors are perpendicular directions of variance. If a "covariance" matrix shows a negative eigenvalue, that is a bug or numerical noise worth investigating.</p>`,
    followUps: ['What is Cholesky factorisation used for?', 'What does a negative Hessian eigenvalue mean during training?'] });
  interview.push({ q: `How do you review AI-generated linear algebra or tensor code, and how do you test it?`, level: 'E',
    a: `<p>I annotate the shape of every tensor and check every product against the (n×k)(k×m) rule, looking for the usual mistakes: <code>*</code> instead of <code>@</code>, a transposed weight (PyTorch's Linear stores out×in), the wrong softmax axis, silent broadcasting, forgetting to centre before PCA, reading eigenvectors from rows instead of columns, assuming <code>eigh</code> sorts descending (it is ascending), and inverting a matrix instead of solving. Tests: a tiny hand-computed example (a 2×2 inverse, a 3-token attention), invariants (softmax rows sum to 1, A·A⁻¹ ≈ I, Av ≈ λv, explained variance sums to 1, unit vectors have length 1), non-square shapes so that transposition errors crash, comparison against a slow pure-Python reference, and float comparisons with a tolerance. The assistant speeds up typing; correctness remains my job.</p>`,
    followUps: ['Which invariant catches a wrong softmax axis?', 'How do you test sign-ambiguous outputs such as eigenvectors?'] });

  registerModule({
    id: 'ai18',
    title: 'Linear Algebra for Machine Learning',
    lang: 'python',
    langExplain: `<p>All code in this module is Python because the AI track uses Python. The runnable demos use <b>plain Python lists only</b> (no NumPy) so you can see every multiplication and addition; each topic also shows the NumPy one-liner you would use at work.</p>`,
    intro: `<p>Machine learning runs on <b>linear algebra</b>: the maths of lists of numbers (<b>vectors</b>) and tables of numbers (<b>matrices</b>). An embedding is a vector. A neural-network layer is a matrix. "Find similar documents" is a dot product. Attention in a transformer is two matrix multiplications and a softmax. This module teaches all of it from school maths, one small step at a time.</p>
      <p>Every idea comes with an everyday analogy, a worked example with small numbers and a table, a picture you can play with (vectors being added, rotated, stretched and squashed), a runnable demo in <b>plain Python lists</b>, and the NumPy version you will use at work. You will build, by hand: cosine similarity, matrix multiplication with shape checks, a 2×2 inverse, Gaussian elimination, power iteration for eigenvectors, PCA with explained variance, nearest-neighbour search over tiny embeddings, and one attention step.</p>
      <p><b>What this unlocks.</b> After this module, these later AI modules will read easily: <i>Machine Learning Foundations</i> (features as vectors, linear models), <i>Neural Networks &amp; Deep Learning Basics</i> (layers as matrices), <i>How LLMs Work</i> (embeddings and self-attention), <i>Embeddings &amp; Vector Databases</i> (cosine search, normalisation, PCA), <i>Transformer Internals Deep Dive</i> (Q·Kᵀ, scaling, low-rank tricks) and the next maths module, <i>Calculus &amp; Optimization for Machine Learning</i> (gradients are vectors too).</p>`,
    goals: [
      'Add, scale, measure and normalise vectors, and compute dot products and cosine similarity by hand and in plain Python',
      'Read a 2×2 matrix as a transformation (rotate, stretch, shear, flip) by looking at where its columns send the basis arrows',
      'Multiply matrices cell by cell, check shapes before multiplying, and explain why A·B ≠ B·A',
      'Compute a transpose, a determinant and a 2×2 inverse, and recognise a singular matrix',
      'Solve 2×2 and 3×3 linear systems with Gaussian elimination and back substitution',
      'Explain eigenvectors as "directions that only stretch", and find the top one with power iteration',
      'Explain SVD and PCA in plain words, and choose how many components to keep from explained variance',
      'Trace the linear algebra inside embeddings search and one attention step (Q·Kᵀ, √d scaling, softmax, weighted sum)'
    ],
    prereqs: `<p><b>Needed:</b> <i>Math &amp; Python for AI</i> (AI track, module 3) for a first look at vectors, dot products and matrices. <b>Helpful:</b> Python <i>Control Flow, Functions &amp; Core Collections</i> (loops, lists, functions, <code>zip</code>). School maths is enough: arithmetic, squares and square roots, Pythagoras, and solving two equations at once. If you want more maths practice, the DSA track's <i>Math Foundations &amp; Time/Space Complexity</i> helps with O(n³) reasoning, and <i>Advanced Mathematics for Algorithms</i> uses matrix multiplication for fast Fibonacci.</p>`,
    hours: 10,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
