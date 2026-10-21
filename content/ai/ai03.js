(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // helper: build a problem with less boilerplate
  function P(o) {
    function pad(h) { return h.replace(/<\/p>$/, ' Work it through on a tiny example first.</p>'); }
    o.hints = o.hints.map(function (h) { return h.replace(/<[^>]+>/g, '').length < 40 ? pad(h) : h; });
    if (o.complexity.replace(/<[^>]+>/g, '').length < 20) o.complexity = o.complexity.replace(/<\/p>$/, ' (k, d, N as defined in the statement).</p>').replace(/\.\s*\(k/, ' (k');
    var brute = { why: o.bruteWhy };
    if (o.bruteCode) brute.code = o.bruteCode;
    var sol = { approach: o.approach, complexity: o.complexity, followUps: o.followUps || [] };
    if (o.code) sol.code = o.code;
    if (o.dry) sol.dry = o.dry;
    if (o.alt) sol.alt = o.alt;
    return {
      title: o.title, level: o.level, tags: o.tags, companies: o.companies || [],
      statement: o.statement, constraints: o.constraints, example: o.example,
      brute: brute, mcq: o.mcq, hints: o.hints, solution: sol
    };
  }

  function parseVec(s) {
    var a = String(s).trim().split(/[\s,]+/).map(Number);
    if (!a.length || a.some(isNaN)) throw new Error('Enter numbers separated by spaces');
    return a;
  }

  // ===================== TOPIC 1: VECTORS & DOT PRODUCT =====================
  topics.push({
    title: 'Vectors, Dot Product & Cosine Similarity',
    analogy: `<p>A <b>vector</b> is just a list of numbers that describes something, like a row in a spreadsheet. Think of a song described by <code>[energy, danceability, sadness]</code> = <code>[8, 9, 1]</code>. Two songs with similar lists "feel" similar. The <b>dot product</b> is a score of how much two lists agree: multiply matching slots, add everything up. It is like two friends rating the same 3 films, then multiplying their ratings film by film. Big positive total means they like the same stuff.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> A vector is an ordered list of numbers. The number of slots is its <b>dimension</b>. In AI, almost everything becomes a vector: a word, a sentence, an image, a user. These are called <b>embeddings</b>.</p>
      ${H.arr([2, 1, 3], { label: 'a (3-dimensional)' })}
      ${H.arr([4, 0, 5], { label: 'b (3-dimensional)' })}
      <p><b>Dot product</b> = multiply slot by slot, then add: <code>a·b = 2×4 + 1×0 + 3×5 = 8 + 0 + 15 = 23</code>.</p>
      ${H.table(['slot', 'a', 'b', 'a × b'], [['0', '2', '4', '8'], ['1', '1', '0', '0'], ['2', '3', '5', '15'], ['<b>sum</b>', '', '', '<span class="c-g">23</span>']])}
      <p><b>Length (norm)</b> of a vector: <code>|a| = √(a·a)</code>. For a = [2,1,3]: √(4+1+9) = √14 ≈ 3.742.</p>
      <p><b>Cosine similarity</b> removes the effect of length and only looks at direction: <code>cos(a,b) = a·b / (|a| × |b|)</code>. It always lies between −1 and +1.</p>
      ${H.table(['cosine', 'meaning'], [['+1', 'same direction (very similar)'], ['0', 'at right angles (unrelated)'], ['−1', 'opposite direction']])}
      <p><b>By hand:</b> a=[2,1,3], b=[4,0,5]. a·b=23, |a|=√14≈3.742, |b|=√41≈6.403. cos = 23 / (3.742×6.403) = 23 / 23.96 ≈ <b>0.960</b>. Very similar direction.</p>
      <p><b>Why cosine and not just dot?</b> A long document and a short document on the same topic have different lengths, so a raw dot product favours the long one. Cosine divides lengths away.</p>`,
    clues: [
      '"how similar are two embeddings / sentences / users" → cosine similarity',
      '"semantic search", "nearest neighbour", "vector database" → dot product or cosine over vectors',
      '"normalise vectors to unit length so dot product equals cosine"',
      '"weighted sum of inputs" (a neuron!) → that is a dot product with the weights',
      '"distance between two points" → Euclidean norm of the difference',
      'N documents × d dimensions, d = 768 or 1536 → every comparison is O(d)'
    ],
    code: [
      { lang: 'python', title: 'Dot, norm, cosine in pure Python (runnable)', run: true, code: `import math

def dot(a, b):
    # multiply matching slots, then add everything up
    assert len(a) == len(b), "vectors must have the same length"
    return sum(x * y for x, y in zip(a, b))

def norm(a):
    # length of the arrow: square root of (a . a)
    return math.sqrt(dot(a, a))

def cosine(a, b):
    na, nb = norm(a), norm(b)
    if na == 0 or nb == 0:
        return 0.0          # a zero vector has no direction
    return dot(a, b) / (na * nb)

a = [2, 1, 3]
b = [4, 0, 5]
print("dot    =", dot(a, b))
print("|a|    =", round(norm(a), 3))
print("|b|    =", round(norm(b), 3))
print("cosine =", round(cosine(a, b), 3))

# tiny "semantic search": which document is closest to the query?
query = [1, 0, 1]
docs = {"cats": [1, 0.1, 0.9], "cars": [0, 1, 0.1], "pets": [0.8, 0.2, 0.7]}
ranked = sorted(docs, key=lambda k: cosine(query, docs[k]), reverse=True)
for name in ranked:
    print(name, round(cosine(query, docs[name]), 3))` },
      { lang: 'python', title: 'Same thing with NumPy (shown, not run)', check: false, code: `import numpy as np
a = np.array([2, 1, 3])
b = np.array([4, 0, 5])
print(a @ b)                                   # dot product -> 23
print(np.linalg.norm(a))                       # length -> 3.7416...
print(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))  # cosine ~ 0.960` }
    ],
    codeTitle: ['Pure Python', 'NumPy version'],
    viz: {
      title: 'Dot product, term by term',
      input: '2 1 3 | 4 0 5',
      inputLabel: 'Two vectors separated by | (numbers separated by spaces)',
      gen: function (input) {
        var halves = String(input).split('|');
        if (halves.length !== 2) throw new Error('Format: 2 1 3 | 4 0 5');
        var a = parseVec(halves[0]), b = parseVec(halves[1]);
        if (a.length !== b.length) throw new Error('Both vectors need the same number of entries');
        if (a.length > 8) throw new Error('Use at most 8 numbers per vector');
        var frames = [], rows = [], prods = [], run = 0, i;
        frames.push({ narr: 'Two vectors of length <b>' + a.length + '</b>. We will multiply matching slots, then add.', parts: [
          { type: 'array', label: 'a', values: a }, { type: 'array', label: 'b', values: b }] });
        for (i = 0; i < a.length; i++) {
          var p = a[i] * b[i]; run += p; prods.push(p);
          rows.push([i, a[i], b[i], p, Math.round(run * 1000) / 1000]);
          var ptr = {}; ptr[i] = 'i';
          var hl = {}; hl[i] = 'cur';
          frames.push({ narr: 'Slot <b>' + i + '</b>: ' + a[i] + ' × ' + b[i] + ' = <b>' + p + '</b>. Running total = <b>' + Math.round(run * 1000) / 1000 + '</b>.' + (p < 0 ? ' <span class="c-r">Negative term: these slots disagree.</span>' : ''), parts: [
            { type: 'array', label: 'a', values: a, ptr: ptr, hl: hl },
            { type: 'array', label: 'b', values: b, ptr: ptr, hl: hl },
            { type: 'table', label: 'terms so far', columns: ['slot', 'a', 'b', 'a×b', 'running sum'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; h[rows.length - 1] = 'cur'; return h; })() },
            { type: 'bars', label: 'each term a×b', values: prods.slice() }] });
        }
        var na = Math.sqrt(a.reduce(function (s, x) { return s + x * x; }, 0));
        var nb = Math.sqrt(b.reduce(function (s, x) { return s + x * x; }, 0));
        frames.push({ narr: 'Dot product = <b>' + Math.round(run * 1000) / 1000 + '</b>. Now the lengths: |a| = ' + na.toFixed(3) + ', |b| = ' + nb.toFixed(3) + '.', parts: [
          { type: 'vars', vals: { dot: Math.round(run * 1000) / 1000, '|a|': +na.toFixed(3), '|b|': +nb.toFixed(3) }, hl: { dot: 'ok' } },
          { type: 'bars', label: 'each term a×b', values: prods.slice() }] });
        var cos = (na === 0 || nb === 0) ? 0 : run / (na * nb);
        frames.push({ narr: 'cosine = dot / (|a|·|b|) = <b>' + cos.toFixed(3) + '</b>. ' + (cos > 0.8 ? 'Pointing nearly the same way.' : cos > 0.2 ? 'Loosely related.' : cos > -0.2 ? 'Roughly unrelated (near 90°).' : 'Pointing opposite ways.'), parts: [
          { type: 'vars', vals: { dot: Math.round(run * 1000) / 1000, cosine: +cos.toFixed(3) }, hl: { cosine: 'sel' } },
          { type: 'bars', label: 'cosine (−1 … 1) shifted by +1 so bars are positive', values: [+(cos + 1).toFixed(3)], texts: [cos.toFixed(3)] }] });
        return frames;
      }
    },
    examples: [
      { title: 'Worked: cosine by hand', html: `<p>a=[1,2,2], b=[2,1,2]. dot = 2+2+4 = 8. |a| = √9 = 3, |b| = √9 = 3. cosine = 8/9 ≈ <b>0.889</b>.</p>` },
      { title: 'Unit vectors make dot = cosine', html: `<p>Scale a vector to length 1: divide each entry by its norm. [3,4] has length 5 so the unit version is [0.6,0.8]. If every stored vector is unit length, a plain dot product IS the cosine, which is why vector databases normalise once at insert time.</p>` , code: { lang: 'python', run: true, code: `import math
v = [3, 4]
n = math.sqrt(sum(x * x for x in v))
u = [x / n for x in v]
print(u, "length =", math.sqrt(sum(x * x for x in u)))` } },
      { title: 'Opposite and orthogonal', html: `<p>[1,0] and [0,1] have dot 0 (right angle, cosine 0). [1,2] and [-1,-2] have dot −5, cosine −1 (exactly opposite). Negative dot products are normal, not bugs.</p>` },
      { title: 'A neuron is a dot product', html: `<p>Inputs x=[1,2], weights w=[0.5,-1], bias 0.3: output = x·w + b = 0.5 − 2 + 0.3 = −1.2. Every layer of every neural net is thousands of these.</p>` }
    ],
    deepDive: `<p><b>🟣 Under the hood.</b> Geometrically, <code>a·b = |a||b|cos θ</code>, where θ is the angle between the arrows. That is where the cosine formula comes from. The dot product is also the <b>projection</b> of one vector onto another, times a length.</p>
      <p><b>Cost.</b> One dot product of dimension d costs d multiplies and d−1 adds. Searching N vectors by brute force costs O(N·d); for 100M vectors of dimension 1024 that is 10<sup>11</sup> multiply-adds per query, which is why production systems use approximate nearest neighbour indexes (HNSW, IVF) instead.</p>
      <p><b>Curse of dimensionality.</b> In very high dimensions random vectors are almost always nearly orthogonal (cosine near 0), so "close" and "far" values bunch together. Good embeddings are learned precisely to avoid this.</p>
      <p><b>Floating-point traps.</b> Summing many terms of mixed size loses precision; sums of float16 can overflow. Libraries accumulate in float32 for this reason. Always guard against zero-length vectors before dividing. Cosine similarity is not a true distance (it breaks the triangle inequality); 1 − cos is a "cosine distance" but not a metric. Euclidean distance and cosine agree in ranking if all vectors are unit length, since |a−b|² = 2 − 2cos.</p>`,
    aiEra: `<p><b>🤖 What AI changes.</b> Embedding models turn text into 768-3072 dimensional vectors, and RAG search is just "cosine of query vs every chunk, take top-k". Understanding the dot product means you understand search, recommendations and attention scores (query·key).</p>
      <p><b>Use AI as a partner:</b> ask <code>Explain cosine similarity with a 2D example and give me 3 test vectors, including a zero vector</code>. Ask it to generate edge cases, then run them yourself.</p>
      <p><b>Where AI goes wrong:</b> it may call dot product and cosine "the same", forget to guard zero vectors, or mix up cosine similarity with cosine distance. It sometimes does arithmetic in its head and gets the number wrong, so run the code.</p>
      <p><b>What you must own:</b> choosing the metric (cosine vs dot vs Euclidean) to match how the embedding model was trained, and normalising consistently on both sides.</p>`,
    problems: [
      P({
        title: 'Most Similar Document', level: 'Easy', tags: ['vectors', 'cosine'],
        statement: `<p>You have a query vector and a list of document vectors. Return the index of the document with the highest cosine similarity to the query. If a vector has length 0, treat its similarity as 0.</p>`,
        constraints: `1 ≤ N ≤ 10<sup>4</sup>, 1 ≤ d ≤ 512`,
        example: `<p>query=[1,0], docs=[[0,1],[2,0.1],[-1,0]] → ${H.c('g', 'index 1')} (cosines 0, 0.998, −1).</p>`,
        bruteWhy: `<p>Computing the norm of the query again for every document wastes work; also comparing raw dot products picks the longest vector, not the closest in direction.</p>`,
        mcq: { q: 'Why not just pick the largest dot product?', options: ['It favours long vectors regardless of direction', 'It is always negative', 'It cannot be computed', 'It needs sorting'], answer: 0, explain: 'A long vector gives a big dot product even if it points a different way. Cosine divides the lengths out.' },
        hints: [`<p>Cosine = dot / (norm × norm).</p>`, `<p>Compute the query norm once, outside the loop.</p>`, `<p>Skip division when a norm is 0 (score 0). Track best score and index in one pass.</p>`],
        approach: `<p>One pass over the documents. Precompute the query norm. For each document compute the dot product and its own norm, divide, and keep the best score and its index. Zero-length vectors score 0 so nothing divides by zero. Time O(N·d), space O(1).</p>`,
        code: { lang: 'python', run: true, code: `import math

def best_doc(query, docs):
    nq = math.sqrt(sum(x * x for x in query))
    best_i, best_s = -1, -2.0
    for i, d in enumerate(docs):
        nd = math.sqrt(sum(x * x for x in d))
        if nq == 0 or nd == 0:
            s = 0.0
        else:
            s = sum(x * y for x, y in zip(query, d)) / (nq * nd)
        if s > best_s:
            best_i, best_s = i, s
    return best_i

print(best_doc([1, 0], [[0, 1], [2, 0.1], [-1, 0]]))` },
        complexity: `<p>O(N·d) time, O(1) extra space.</p>`
      })
    ]
  });

  // ===================== TOPIC 2: MATRICES & MATMUL =====================
  function parseMat(s) {
    var rows = String(s).trim().split(';').map(function (r) { return r.trim().split(/[\s,]+/).map(Number); });
    var w = rows[0].length;
    rows.forEach(function (r) { if (r.length !== w || r.some(isNaN)) throw new Error('Rows must have equal length and contain numbers. Format: 1 2 3; 4 5 6 | 7 8; 9 10; 11 12'); });
    return rows;
  }
  topics.push({
    title: 'Matrices & Matrix Multiplication',
    analogy: `<p>A <b>matrix</b> is a spreadsheet of numbers: rows and columns. Picture a smoothie shop. Table A says how many fruits each smoothie uses (rows = smoothies, columns = fruits). Table B says the price and calories of each fruit (rows = fruits, columns = price, calories). Multiplying A × B gives price and calories of each smoothie. Each answer cell = "walk along one smoothie row and one property column, multiply, add". That "row meets column" move is the whole of matrix multiplication.</p>`,
    explain: `<p><b>🟢 Shapes first.</b> A matrix with 2 rows and 3 columns is "2×3". To multiply A (m×n) by B (n×p) the <b>inner numbers must match</b> (n and n). The answer is m×p.</p>
      ${H.table(['A', 'B', 'A×B shape'], [['2×3', '3×2', '<span class="c-g">2×2</span>'], ['2×3', '2×3', '<span class="c-r">not allowed (3 ≠ 2)</span>'], ['1×4', '4×1', '1×1 (a dot product!)']])}
      <p><b>Rule:</b> cell (i, j) of the answer = dot product of row i of A with column j of B.</p>
      <p><b>Worked example, 2×3 times 3×2.</b></p>
      ${H.table(['', 'col 0', 'col 1', 'col 2'], [['A row 0', '1', '2', '3'], ['A row 1', '4', '5', '6']])}
      ${H.table(['', 'B col 0', 'B col 1'], [['row 0', '7', '8'], ['row 1', '9', '10'], ['row 2', '11', '12']])}
      <p>C[0][0] = 1×7 + 2×9 + 3×11 = 7+18+33 = <b>58</b><br>C[0][1] = 1×8 + 2×10 + 3×12 = 8+20+36 = <b>64</b><br>C[1][0] = 4×7 + 5×9 + 6×11 = 28+45+66 = <b>139</b><br>C[1][1] = 4×8 + 5×10 + 6×12 = 32+50+72 = <b>154</b></p>
      ${H.table(['C = A×B', 'col 0', 'col 1'], [['row 0', '58', '64'], ['row 1', '139', '154']])}
      <p><b>Intuition:</b> a matrix is a machine that turns one vector into another. Multiplying matrices means "do machine B, then machine A". Order matters: A×B is usually not B×A (and may not even be defined). Matrix multiplication is <b>not commutative</b> but it is associative.</p>
      <p><b>Transpose</b> flips rows and columns: a 2×3 becomes 3×2. You will see Aᵀ constantly (e.g. Q·Kᵀ in attention).</p>`,
    clues: [
      '"2×3 times 3×2" → check inner dims, answer is outer dims',
      '"batch of inputs times weight matrix" → one matmul does all examples at once',
      '"fully connected layer", "linear layer", "y = Wx + b"',
      '"attention scores = Q Kᵀ"',
      '"shapes do not match / dimension mismatch error" → transpose or reshape',
      'complexity question: multiplying n×n matrices naively → O(n³)'
    ],
    code: [
      { lang: 'python', title: 'Matrix multiply with plain lists (runnable)', run: true, code: `def matmul(A, B):
    m, n = len(A), len(A[0])
    n2, p = len(B), len(B[0])
    if n != n2:
        raise ValueError("inner dimensions differ: %d vs %d" % (n, n2))
    C = [[0] * p for _ in range(m)]
    for i in range(m):              # each row of A
        for j in range(p):          # each column of B
            total = 0
            for k in range(n):      # walk along the row and the column
                total += A[i][k] * B[k][j]
            C[i][j] = total
    return C

def transpose(M):
    return [list(col) for col in zip(*M)]

A = [[1, 2, 3], [4, 5, 6]]
B = [[7, 8], [9, 10], [11, 12]]
print("A x B =", matmul(A, B))
print("B x A =", matmul(B, A))        # 3x3: different shape, different numbers
print("A^T   =", transpose(A))
try:
    matmul(A, A)                      # 2x3 times 2x3
except ValueError as e:
    print("error:", e)` },
      { lang: 'python', title: 'NumPy (shown, not run)', check: false, code: `import numpy as np
A = np.array([[1, 2, 3], [4, 5, 6]])    # shape (2, 3)
B = np.array([[7, 8], [9, 10], [11, 12]])  # shape (3, 2)
print(A @ B)        # [[ 58  64] [139 154]]
print(A.T.shape)    # (3, 2)` }
    ],
    codeTitle: ['Triple loop', 'NumPy'],
    viz: {
      title: 'Matrix multiplication, one cell at a time',
      input: '1 2 3; 4 5 6 | 7 8; 9 10; 11 12',
      inputLabel: 'A | B (rows separated by ;)',
      gen: function (input) {
        var parts = String(input).split('|');
        if (parts.length !== 2) throw new Error('Format: 1 2 3; 4 5 6 | 7 8; 9 10; 11 12');
        var A = parseMat(parts[0]), B = parseMat(parts[1]);
        var m = A.length, n = A[0].length, p = B[0].length;
        if (B.length !== n) throw new Error('Inner dimensions must match: A has ' + n + ' columns but B has ' + B.length + ' rows');
        if (m > 3 || n > 4 || p > 3) throw new Error('Keep it small: A up to 3x4, B up to 4x3');
        var C = [], i, j, k;
        for (i = 0; i < m; i++) { C.push([]); for (j = 0; j < p; j++) C[i].push(''); }
        var frames = [{ narr: 'A is <b>' + m + '×' + n + '</b>, B is <b>' + n + '×' + p + '</b>. Inner sizes match (' + n + '), so C is <b>' + m + '×' + p + '</b>.', parts: [
          { type: 'grid', label: 'A', rows: A }, { type: 'grid', label: 'B', rows: B }, { type: 'grid', label: 'C (empty)', rows: C }] }];
        for (i = 0; i < m; i++) for (j = 0; j < p; j++) {
          var terms = [], sum = 0, ha = {}, hb = {}, hc = {};
          for (k = 0; k < n; k++) { terms.push(A[i][k] + '×' + B[k][j]); sum += A[i][k] * B[k][j]; ha[i + ',' + k] = 'cur'; hb[k + ',' + j] = 'cur'; }
          C[i][j] = sum; hc[i + ',' + j] = 'cur';
          var Cs = C.map(function (r) { return r.slice(); });
          frames.push({ narr: 'C[' + i + '][' + j + '] = row ' + i + ' of A · column ' + j + ' of B = ' + terms.join(' + ') + ' = <b>' + sum + '</b>.', parts: [
            { type: 'grid', label: 'A (current row amber)', rows: A, hl: ha },
            { type: 'grid', label: 'B (current column amber)', rows: B, hl: hb },
            { type: 'grid', label: 'C (filled so far)', rows: Cs, hl: hc }] });
        }
        var all = {}; for (i = 0; i < m; i++) for (j = 0; j < p; j++) all[i + ',' + j] = 'ok';
        frames.push({ narr: 'Done: every cell of C used one row and one column. Total multiplications = m·n·p = <b>' + (m * n * p) + '</b>.', parts: [{ type: 'grid', label: 'C = A × B', rows: C, hl: all }] });
        return frames;
      }
    },
    examples: [
      { title: 'Shape check practice', html: `<p>(4×5)·(5×2) → 4×2 ✅. (4×5)·(4×5) → ❌. (4×5)·(4×5)ᵀ = (4×5)·(5×4) → 4×4 ✅ (this is how you get a "every row vs every row" similarity table).</p>` },
      { title: 'Identity matrix', html: `<p>The identity I has 1s on the diagonal. A·I = A. Check [[1,2],[3,4]]·[[1,0],[0,1]]: row 0 · col 0 = 1×1+2×0 = 1; row 0 · col 1 = 0+2 = 2. Unchanged.</p>` },
      { title: 'Order matters', html: `<p>A=[[1,2],[3,4]], B=[[0,1],[1,0]]. A·B = [[2,1],[4,3]] (swaps columns). B·A = [[3,4],[1,2]] (swaps rows). Different!</p>`, code: { lang: 'python', run: true, code: `A = [[1, 2], [3, 4]]
B = [[0, 1], [1, 0]]
def mm(X, Y):
    return [[sum(X[i][k] * Y[k][j] for k in range(len(Y))) for j in range(len(Y[0]))] for i in range(len(X))]
print("AB =", mm(A, B))
print("BA =", mm(B, A))` } },
      { title: 'A neural layer in one line', html: `<p>Batch X of 32 examples with 10 features (32×10) times weights W (10×4) gives 32×4: each example now has 4 outputs. Add bias b (length 4) by broadcasting.</p>` }
    ],
    deepDive: `<p><b>🟣 Internals.</b> The naive algorithm costs m·n·p multiplications, O(n³) for square matrices. Strassen gets about O(n<sup>2.81</sup>) and research bounds are near O(n<sup>2.37</sup>), but real libraries use the cubic algorithm made extremely fast: blocking for CPU cache, SIMD vector instructions, and on GPUs thousands of cores each computing one output tile. Matmul is the single most optimised operation in computing (BLAS, cuBLAS).</p>
      <p><b>Memory layout.</b> Row-major (C, NumPy default) vs column-major (Fortran). Walking along rows is cache-friendly in row-major, which is why the naive i-j-k loop is slow and the i-k-j order is faster in pure code.</p>
      <p><b>Why GPUs.</b> Each output cell is independent, so matmul is "embarrassingly parallel". LLM training is essentially trillions of matmuls. Mixed precision (bf16/fp8 inputs, fp32 accumulation) trades range and precision for speed.</p>
      <p><b>Edge cases.</b> 1-D arrays (shape (n,)) behave as vectors in NumPy's <code>@</code>; shape (n,1) is a column. Mixing them is a classic bug. Matmul is associative so (AB)C = A(BC) but cost differs: with shapes (10×1000)(1000×10)(10×1000), do the small product first.</p>`,
    aiEra: `<p><b>🤖 What AI changes.</b> A transformer is mostly matmuls: embeddings × weights, Q·Kᵀ, attention × V, feed-forward layers. Model size (parameters) = sum of matrix entries. Knowing shapes lets you compute memory and FLOPs: a layer with weights 4096×4096 holds 16.8M numbers (about 33 MB in fp16).</p>
      <p><b>Use AI as a partner:</b> paste a shape error and ask <code>Explain this shape mismatch and show the shapes after each line</code>. Ask it to add shape comments to your code.</p>
      <p><b>Where AI goes wrong:</b> generated code often transposes the wrong operand or silently relies on broadcasting, producing the right shape with the wrong meaning. It may also quote complexity for the wrong algorithm.</p>
      <p><b>What you must own:</b> tracking shapes through every line and verifying with a tiny example by hand.</p>`,
    problems: [
      P({
        title: 'Multiply 2×3 by 3×2', level: 'Easy', tags: ['matrix', 'matmul'],
        statement: `<p>Compute A×B for A=[[2,0,1],[1,3,2]] and B=[[1,2],[0,1],[4,0]] by hand, then write a function that checks shapes before multiplying.</p>`,
        constraints: `Inner dimensions must match`,
        example: `<p>C[0][0]=2×1+0×0+1×4=${H.c('g', '6')}; C[0][1]=2×2+0×1+1×0=${H.c('g', '4')}; C[1][0]=1+0+8=${H.c('g', '9')}; C[1][1]=2+3+0=${H.c('g', '5')}. C=[[6,4],[9,5]].</p>`,
        bruteWhy: `<p>Not really a brute-force issue: the common mistake is multiplying cell by cell (element-wise) instead of row-by-column.</p>`,
        mcq: { q: 'Which expression gives C[1][0]?', options: ['row 1 of A dotted with column 0 of B', 'A[1][0]×B[1][0]', 'column 1 of A dotted with row 0 of B', 'sum of all of A'], answer: 0, explain: 'Cell (i,j) uses row i of A and column j of B.' },
        hints: [`<p>Write the shapes: (2×3)(3×2) → 2×2.</p>`, `<p>Each answer cell is a dot product of length 3.</p>`, `<p>Raise an error if len(A[0]) != len(B).</p>`],
        approach: `<p>Check that A's column count equals B's row count, allocate an m×p zero matrix, and for each (i,j) sum A[i][k]*B[k][j] over k. For the given matrices the result is [[6,4],[9,5]]. The element-wise product would be a different, wrong operation (and impossible here as shapes differ).</p>`,
        code: { lang: 'python', run: true, code: `A = [[2, 0, 1], [1, 3, 2]]
B = [[1, 2], [0, 1], [4, 0]]
C = [[sum(A[i][k] * B[k][j] for k in range(3)) for j in range(2)] for i in range(2)]
print(C)` },
        complexity: `<p>O(m·n·p).</p>`
      })
    ]
  });

  // ===================== TOPIC 3: PROBABILITY =====================
  topics.push({
    title: 'Probability, Distributions, Expected Value & Bayes',
    analogy: `<p>Probability is a <b>weather forecast for any uncertain thing</b>: a number from 0 (never) to 1 (always). A <b>distribution</b> is the whole forecast chart: "here is how likely each outcome is". <b>Expected value</b> is the long-run average, like your average daily steps over a year. <b>Bayes' rule</b> is how a detective updates suspicion: you start with a hunch (prior), see a clue, and shift your belief (posterior) in proportion to how well the clue fits each suspect.</p>`,
    explain: `<p><b>🟢 Basics.</b> Probabilities of all outcomes add to 1. A fair die: each face 1/6 ≈ 0.167.</p>
      ${H.table(['face', '1', '2', '3', '4', '5', '6'], [['P', '1/6', '1/6', '1/6', '1/6', '1/6', '1/6']])}
      <p><b>Expected value (mean)</b> = ∑ outcome × probability. For the die: (1+2+3+4+5+6)/6 = <b>3.5</b>. You never roll 3.5, it is the long-run average.</p>
      <p><b>Variance</b> = average of (outcome − mean)². It measures spread. Die: ((−2.5)²+(−1.5)²+(−0.5)²+0.5²+1.5²+2.5²)/6 = 17.5/6 ≈ 2.917. <b>Standard deviation</b> = √variance ≈ 1.708.</p>
      <p><b>Discrete vs continuous.</b> A die is discrete (countable outcomes, "bars"). Height is continuous (a smooth curve; probability lives in areas). The famous <b>normal (bell curve)</b> distribution is set by a mean μ and std σ: about 68% of values fall within 1σ, 95% within 2σ.</p>
      <p><b>Conditional probability:</b> P(A|B) = P(A and B) / P(B), "chance of A given we know B".</p>
      <p><b>Bayes' rule:</b> <code>P(spam | word) = P(word | spam) × P(spam) / P(word)</code>.</p>
      <p><b>Spam filter worked example.</b> 20% of mail is spam. The word "free" appears in 60% of spam and 5% of normal mail (ham). An email contains "free". How likely is spam?</p>
      ${H.table(['step', 'calculation', 'value'], [['P(spam)', 'prior', '0.20'], ['P(ham)', '1 − 0.20', '0.80'], ['P(free and spam)', '0.60 × 0.20', '0.12'], ['P(free and ham)', '0.05 × 0.80', '0.04'], ['P(free)', '0.12 + 0.04', '0.16'], ['<b>P(spam | free)</b>', '0.12 / 0.16', '<span class="c-g">0.75</span>']])}
      <p>One word moved our belief from 20% to 75%. See a second independent clue and you repeat the update with 0.75 as the new prior. That repeated update is exactly the Naive Bayes classifier.</p>`,
    clues: [
      '"given that…", "probability of A knowing B" → conditional probability / Bayes',
      '"rare disease, test is 99% accurate, what is the chance I am sick?" → base-rate trap, use Bayes',
      '"average payoff", "fair price of a bet" → expected value',
      '"how spread out" → variance / standard deviation',
      '"model outputs a probability for each class" → a distribution that sums to 1',
      '"sample from a distribution", "random noise" → random.gauss / sampling'
    ],
    code: [
      { lang: 'python', title: 'Mean, variance, sampling a normal (runnable)', run: true, code: `import random, statistics, math

# Expected value and variance of a fair die, by definition
faces = [1, 2, 3, 4, 5, 6]
p = 1 / 6
mean = sum(x * p for x in faces)
var = sum((x - mean) ** 2 * p for x in faces)
print("die mean =", round(mean, 3), " variance =", round(var, 3), " std =", round(math.sqrt(var), 3))

# Simulate: the average of many rolls approaches the expected value
random.seed(42)                      # fixed seed so output is repeatable
rolls = [random.choice(faces) for _ in range(10000)]
print("simulated mean of 10000 rolls =", round(statistics.mean(rolls), 3))

# Sample a normal distribution (mean 170, std 10) like heights in cm
random.seed(1)
heights = [random.gauss(170, 10) for _ in range(5000)]
m = statistics.mean(heights)
s = statistics.pstdev(heights)
within1 = sum(1 for h in heights if abs(h - m) <= s) / len(heights)
within2 = sum(1 for h in heights if abs(h - m) <= 2 * s) / len(heights)
print("sample mean ~", round(m, 1), " std ~", round(s, 1))
print("share within 1 std:", round(within1, 2), " within 2 std:", round(within2, 2))` },
      { lang: 'python', title: 'Bayes update for a spam filter (runnable)', run: true, code: `def bayes(prior_spam, p_word_given_spam, p_word_given_ham):
    # posterior = P(spam | word)
    prior_ham = 1 - prior_spam
    num = p_word_given_spam * prior_spam
    evidence = num + p_word_given_ham * prior_ham     # P(word)
    return num / evidence

belief = 0.20                                         # start: 20% of mail is spam
print("start            :", round(belief, 3))
# each tuple: (word, P(word|spam), P(word|ham))
clues = [("free", 0.60, 0.05), ("winner", 0.30, 0.01), ("meeting", 0.02, 0.20)]
for word, ps, ph in clues:
    belief = bayes(belief, ps, ph)                    # yesterday's posterior is today's prior
    print("after '%s' : %.3f" % (word, belief))

# the base-rate trap: rare disease (1 in 1000), test 99% sensitive, 5% false positives
print("P(sick | positive) =", round(bayes(0.001, 0.99, 0.05), 4))` },
      { lang: 'python', title: 'NumPy sampling (shown, not run)', check: false, code: `import numpy as np
rng = np.random.default_rng(0)
x = rng.normal(loc=170, scale=10, size=5000)
print(x.mean(), x.std())` }
    ],
    codeTitle: ['Stats and sampling', 'Bayes spam update', 'NumPy'],
    viz: {
      title: 'Building a distribution: sum of dice',
      input: '2d6',
      inputLabel: 'Dice as NdS (N dice 1-4, S sides 2-8), e.g. 2d6',
      gen: function (input) {
        var m = /^\s*(\d+)\s*d\s*(\d+)\s*$/i.exec(String(input));
        if (!m) throw new Error('Format like 2d6');
        var n = +m[1], s = +m[2];
        if (n < 1 || n > 4 || s < 2 || s > 8) throw new Error('Use 1-4 dice with 2-8 sides');
        var frames = [], dist = {0: 1}, k, key, d;
        frames.push({ narr: 'Zero dice rolled: the sum is 0 with certainty (probability 1).', parts: [{ type: 'bars', label: 'probability %', values: [100], idxLabels: ['0'], texts: ['100%'] }] });
        for (k = 1; k <= n; k++) {
          var nd = {};
          for (key in dist) for (d = 1; d <= s; d++) { var t = (+key) + d; nd[t] = (nd[t] || 0) + dist[key]; }
          dist = nd;
          var keys = Object.keys(dist).map(Number).sort(function (a, b) { return a - b; });
          var tot = Math.pow(s, k);
          var vals = keys.map(function (x) { return +(100 * dist[x] / tot).toFixed(1); });
          var hl = {}; var best = 0;
          vals.forEach(function (v, i) { if (v > vals[best]) best = i; });
          hl[best] = 'sel';
          frames.push({ narr: 'Roll die #' + k + ': ' + tot + ' equally likely combinations. Counts per sum: ' + keys.map(function (x) { return x + '→' + dist[x]; }).join(', ') + '. Tallest bar (most likely sum) is <b>' + keys[best] + '</b>.', parts: [
            { type: 'bars', label: 'probability % of each sum', values: vals, idxLabels: keys.map(String), texts: vals.map(function (v) { return v + '%'; }), hl: hl }] });
        }
        var mean = n * (s + 1) / 2, variance = n * (s * s - 1) / 12;
        frames.push({ narr: 'Expected value = n·(s+1)/2 = <b>' + mean + '</b>. This is the balance point of the bars.', parts: [
          { type: 'vars', vals: { mean: mean, dice: n, sides: s }, hl: { mean: 'ok' } }] });
        frames.push({ narr: 'Variance = n·(s²−1)/12 = <b>' + variance.toFixed(3) + '</b>, std = <b>' + Math.sqrt(variance).toFixed(3) + '</b>. More dice make the shape more bell-like (the central limit theorem).', parts: [
          { type: 'vars', vals: { variance: +variance.toFixed(3), std: +Math.sqrt(variance).toFixed(3) }, hl: { std: 'sel' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Expected value of a bet', html: `<p>Pay ₹10 to play. Win ₹50 with probability 0.15, else nothing. EV = 0.15×50 − 10 = 7.5 − 10 = <b>−2.5</b>. On average you lose ₹2.50 per play. The same idea scores a classifier's expected cost.</p>` },
      { title: 'Rare disease trap', html: `<p>1 in 1000 people sick. Test catches 99% of sick people but also flags 5% of healthy people. Positive result → P(sick) = 0.99×0.001 / (0.99×0.001 + 0.05×0.999) = 0.00099 / 0.05094 ≈ <b>1.9%</b>. Humans guess ~99%. Rare events dominate.</p>` },
      { title: 'Two independent events', html: `<p>If clues are independent, probabilities multiply: P(rain Monday AND Tuesday) = 0.3 × 0.3 = 0.09. Naive Bayes assumes words are independent given the class, "naive" but surprisingly effective.</p>` },
      { title: 'Normal rule of thumb', html: `<p>Exam scores mean 70, std 10. About 68% score 60-80, 95% score 50-90, 99.7% score 40-100. A score of 95 is 2.5 std above the mean: rare.</p>` }
    ],
    deepDive: `<p><b>🟣 Going deeper.</b> <b>Law of large numbers:</b> sample averages converge to the expected value. <b>Central limit theorem:</b> sums/averages of many independent variables look normal regardless of the original shape, which is why the bell curve is everywhere (and why random weight initialisation often uses it).</p>
      <p><b>Variance estimate.</b> For a sample use n−1 in the denominator (Bessel's correction, <code>statistics.stdev</code>) because a sample's own mean is closer to its points than the true mean is. Population formula uses n (<code>pstdev</code>).</p>
      <p><b>Bayes in log space.</b> Multiplying many small probabilities underflows to 0. Real Naive Bayes sums <b>log probabilities</b> instead. Also apply Laplace smoothing (add 1 to counts) so an unseen word does not zero out everything.</p>
      <p><b>Sampling.</b> A seeded pseudo-random generator is deterministic, vital for reproducible experiments. <b>Frequentist vs Bayesian</b> views: frequency of events vs degree of belief. ML losses connect to probability: cross-entropy is the negative log-likelihood of the correct label; mean squared error corresponds to assuming normal noise.</p>
      <p><b>Calibration.</b> A model saying "90%" should be right 90% of the time. LLM probabilities are often overconfident.</p>`,
    aiEra: `<p><b>🤖 What AI changes.</b> A language model outputs a <b>probability distribution over the next token</b>. "Generating text" means sampling from that distribution. Temperature, top-p and top-k reshape it. Evaluation, A/B tests of prompts, and confidence thresholds all lean on probability.</p>
      <p><b>Use AI as a partner:</b> ask <code>Give me three Bayes word problems with answers, then I will solve before looking</code>; ask it to check your base-rate reasoning.</p>
      <p><b>Where AI goes wrong:</b> chatbots often fall for the base-rate fallacy themselves, confuse P(A|B) with P(B|A), or treat events as independent when they are not. A model's "I am 95% sure" is not a calibrated probability.</p>
      <p><b>What you must own:</b> checking whether assumptions (independence, representative sample) are true, and sanity checking numbers with a quick simulation.</p>`,
    problems: [
      P({
        title: 'Spam Posterior After Two Words', level: 'Medium', tags: ['bayes', 'probability'],
        statement: `<p>Prior spam rate is 0.3. Word A appears in 50% of spam and 10% of ham; word B in 40% of spam and 20% of ham. An email contains both (treat words as independent given the class). What is P(spam)?</p>`,
        constraints: `Use the independence assumption`,
        example: `<p>Spam score = 0.3×0.5×0.4 = 0.06. Ham score = 0.7×0.1×0.2 = 0.014. P(spam) = 0.06/0.074 = ${H.c('g', '0.811')}.</p>`,
        bruteWhy: `<p>Computing the full joint distribution of all word combinations explodes exponentially; independence reduces it to a product.</p>`,
        mcq: { q: 'What do you divide by at the end?', options: ['spam score + ham score', 'the prior', 'number of words', '1'], answer: 0, explain: 'The evidence P(words) is the sum of both class scores, which makes the posteriors add to 1.' },
        hints: [`<p>Score each class = prior × product of word likelihoods.</p>`, `<p>Normalise by the total of the scores.</p>`, `<p>Use logs for many words; add smoothing for unseen ones.</p>`],
        approach: `<p>Compute an unnormalised score for each class by multiplying its prior with the likelihood of every observed word, assuming the words are independent given the class. Then divide the spam score by the sum of both scores. This gives 0.06 / 0.074 ≈ 0.811. For long emails sum logs instead of multiplying to avoid underflow.</p>`,
        code: { lang: 'python', run: true, code: `spam = 0.3 * 0.5 * 0.4
ham = 0.7 * 0.1 * 0.2
print(round(spam / (spam + ham), 3))` },
        complexity: `<p>O(number of words).</p>`
      })
    ]
  });

  // ===================== TOPIC 4: SOFTMAX =====================
  function softmax(z, T) {
    var mx = Math.max.apply(null, z), e = z.map(function (x) { return Math.exp((x - mx) / T); });
    var s = e.reduce(function (a, b) { return a + b; }, 0);
    return e.map(function (x) { return x / s; });
  }
  topics.push({
    title: 'Softmax, Temperature & Numerical Stability',
    analogy: `<p>Imagine a talent show where judges give raw <b>scores</b> (they can be negative or huge). You want to turn scores into <b>vote shares</b> that add to 100%. Softmax does this: it first makes every score positive by taking <code>e<sup>score</sup></code>, which also makes bigger scores win by a lot, then divides by the total. <b>Temperature</b> is the crowd's mood: cold (low T) means everyone piles on the leader; hot (high T) means the votes spread out evenly.</p>`,
    explain: `<p><b>🟢 Why we need it.</b> A neural network ends with raw numbers called <b>logits</b>, for example <code>[2.0, 1.0, 0.1]</code> for cat, dog, bird. We want probabilities that are positive and sum to 1.</p>
      <p><b>Formula:</b> <code>softmax(z)<sub>i</sub> = e<sup>z<sub>i</sub>/T</sup> / ∑ e<sup>z<sub>j</sub>/T</sup></code></p>
      <p><b>By hand, T=1, z=[2, 1, 0.1].</b></p>
      ${H.table(['class', 'logit', 'e^logit', 'share'], [['cat', '2.0', '7.389', '7.389/11.212 = <span class="c-g">0.659</span>'], ['dog', '1.0', '2.718', '2.718/11.212 = 0.242'], ['bird', '0.1', '1.105', '1.105/11.212 = 0.099'], ['<b>total</b>', '', '11.212', '1.000']])}
      <p><b>Temperature T.</b> Divide logits by T first. Same logits, different T:</p>
      ${H.table(['T', 'cat', 'dog', 'bird', 'feel'], [['0.2', '0.99+', '0.01', '0.00', 'almost always cat (greedy)'], ['1.0', '0.66', '0.24', '0.10', 'normal'], ['5.0', '0.40', '0.33', '0.27', 'nearly uniform (random)']])}
      <p><b>Numerical stability (the subtract-max trick).</b> e<sup>1000</sup> overflows to infinity, giving inf/inf = NaN. But softmax does not change if you subtract the same number from every logit (the factor cancels top and bottom). So subtract the maximum first: the biggest becomes 0, so e<sup>0</sup> = 1 and nothing explodes.</p>
      ${H.table(['logits', 'minus max', 'e^', 'softmax'], [['1000, 1001, 1002', '−2, −1, 0', '0.135, 0.368, 1', '0.090, 0.245, 0.665']])}
      <p><b>Properties:</b> order is preserved (biggest logit = biggest probability); adding a constant to all logits changes nothing; probabilities are never exactly 0 or 1.</p>`,
    clues: [
      '"convert scores/logits to probabilities" → softmax',
      '"multi-class classification output layer"',
      '"overflow / NaN / inf in softmax" → subtract the max',
      '"make the model more creative / more deterministic" → temperature',
      '"temperature 0" → greedy (argmax), "temperature 1" → raw model distribution',
      '"attention weights sum to 1 over the keys" → softmax over scores'
    ],
    code: [
      { lang: 'python', title: 'Stable softmax with temperature (runnable)', run: true, code: `import math

def softmax(logits, temperature=1.0):
    if temperature <= 0:
        raise ValueError("temperature must be > 0 (use argmax for T -> 0)")
    scaled = [z / temperature for z in logits]
    m = max(scaled)                          # subtract the max for stability
    exps = [math.exp(z - m) for z in scaled]
    total = sum(exps)
    return [e / total for e in exps]

def naive_softmax(logits):
    exps = [math.exp(z) for z in logits]     # can overflow
    total = sum(exps)
    return [e / total for e in exps]

logits = [2.0, 1.0, 0.1]
for T in (0.2, 1.0, 5.0):
    probs = softmax(logits, T)
    print("T=%.1f" % T, [round(p, 3) for p in probs], "sum =", round(sum(probs), 3))

big = [1000, 1001, 1002]
try:
    print("naive :", naive_softmax(big))
except OverflowError as e:
    print("naive : OverflowError ->", e)
print("stable:", [round(p, 3) for p in softmax(big)])

# sampling a next token from the distribution
import random
random.seed(7)
tokens = ["cat", "dog", "bird"]
counts = {t: 0 for t in tokens}
for _ in range(1000):
    counts[random.choices(tokens, weights=softmax(logits, 1.0))[0]] += 1
print("1000 samples at T=1:", counts)` },
      { lang: 'python', title: 'NumPy (shown, not run)', check: false, code: `import numpy as np
def softmax(z, T=1.0, axis=-1):
    z = z / T
    z = z - z.max(axis=axis, keepdims=True)   # stability
    e = np.exp(z)
    return e / e.sum(axis=axis, keepdims=True)` }
    ],
    codeTitle: ['Pure Python', 'NumPy batch version'],
    viz: {
      title: 'Softmax: logits to probabilities as temperature changes',
      input: '2 1 0.1',
      inputLabel: 'Logits (2 to 6 numbers)',
      gen: function (input) {
        var z = parseVec(input);
        if (z.length < 2 || z.length > 6) throw new Error('Use 2 to 6 logits');
        var frames = [], mx = Math.max.apply(null, z);
        var idx = z.map(function (_, i) { return 'c' + i; });
        frames.push({ narr: 'Raw logits can be any size, even negative. They are <b>not</b> probabilities yet.', parts: [{ type: 'bars', label: 'logits', values: z.map(function (x) { return x - Math.min.apply(null, z) + 0.1; }), idxLabels: idx, texts: z.map(String) }] });
        frames.push({ narr: 'Stability step: subtract the max (<b>' + mx + '</b>) from every logit. The ranking is unchanged, the biggest becomes 0 so exp can never overflow.', parts: [
          { type: 'array', label: 'logits', values: z }, { type: 'array', label: 'logits − max', values: z.map(function (x) { return +(x - mx).toFixed(4); }), hl: z.reduce(function (h, x, i) { if (x === mx) h[i] = 'sel'; return h; }, {}) }] });
        [0.25, 0.5, 1, 2, 5].forEach(function (T) {
          var p = softmax(z, T), best = 0;
          p.forEach(function (v, i) { if (v > p[best]) best = i; });
          var hl = {}; hl[best] = 'sel';
          var note = T < 1 ? 'Cold: the leader takes almost everything (less random).' : T === 1 ? 'Normal temperature: the model\'s own opinion.' : 'Hot: probabilities flatten, so unlikely options get picked more (more random).';
          frames.push({ narr: '<b>T = ' + T + '</b>. ' + note + ' Top share = <b>' + (100 * p[best]).toFixed(1) + '%</b>.', parts: [
            { type: 'bars', label: 'probability % at T=' + T, values: p.map(function (v) { return +(100 * v).toFixed(1); }), idxLabels: idx, texts: p.map(function (v) { return (100 * v).toFixed(1) + '%'; }), hl: hl },
            { type: 'vars', vals: { temperature: T, sum: +p.reduce(function (a, b) { return a + b; }, 0).toFixed(3) }, hl: { sum: 'ok' } }] });
        });
        return frames;
      }
    },
    examples: [
      { title: 'Constant shift changes nothing', html: `<p>softmax([1,2,3]) = softmax([101,102,103]) = [0.090, 0.245, 0.665]. This is the proof-by-example that subtracting the max is safe.</p>` },
      { title: 'Temperature → 0 means argmax', html: `<p>logits [2,1,0.1], T=0.1: scaled = [20,10,1]. e<sup>20</sup> dwarfs e<sup>10</sup> (22026 × bigger), so cat ≈ 0.99995. This is "greedy decoding". T→∞ gives 1/3 each.</p>` },
      { title: 'Softmax vs sigmoid', html: `<p>Sigmoid squashes one score into 0-1 (yes/no). Softmax handles many classes that compete. With two classes softmax equals a sigmoid of the logit difference. Use sigmoid for "multi-label" (several tags can be true), softmax for "exactly one class".</p>` },
      { title: 'Log-sum-exp', html: `<p>log(∑e<sup>z</sup>) = max + log(∑e<sup>z−max</sup>). This same trick is used inside the cross-entropy loss so training never sees NaN.</p>`, code: { lang: 'python', run: true, code: `import math
z = [1000, 1001, 1002]
m = max(z)
lse = m + math.log(sum(math.exp(x - m) for x in z))
print("log-sum-exp =", round(lse, 4))` } }
    ],
    deepDive: `<p><b>🟣 Internals.</b> Softmax is the gradient-friendly cousin of argmax ("soft" argmax). Its derivative is neat: ∂p<sub>i</sub>/∂z<sub>j</sub> = p<sub>i</sub>(δ<sub>ij</sub> − p<sub>j</sub>). Combined with cross-entropy loss the gradient simplifies to <code>p − y</code> (prediction minus one-hot label), which is why frameworks fuse them (<code>CrossEntropyLoss</code> takes raw logits, never feed it softmax output twice).</p>
      <p><b>Saturation.</b> If one logit is much bigger, p≈1 and gradients for the others vanish; large logits make training unstable. Attention divides by √d before softmax for exactly this reason.</p>
      <p><b>Precision.</b> In float16 exp overflows at about z>11, so always subtract max and often compute in float32. <b>Top-k / top-p (nucleus) sampling</b> truncate the distribution before renormalising: keep the k most likely tokens, or the smallest set whose cumulative probability ≥ p.</p>
      <p><b>Temperature is not accuracy.</b> It rescales confidence; it does not add knowledge. A separate "temperature scaling" step is also used after training to calibrate a model's confidence. Softmax over a vocabulary of 100k+ costs O(V) per token; techniques like sampled softmax speed training.</p>`,
    aiEra: `<p><b>🤖 What AI changes.</b> Every LLM API exposes <code>temperature</code>, <code>top_p</code> and sometimes <code>top_k</code>. These directly control softmax over the vocabulary. Low (0-0.3) for code, extraction and factual answers; higher (0.7-1) for brainstorming and stories. Even at T=0 outputs can vary slightly because of parallel floating-point arithmetic.</p>
      <p><b>Use AI as a partner:</b> ask <code>Show softmax for logits [3,1,0.2] at T=0.5, 1, 2 and explain the pattern</code>, then verify with the code above.</p>
      <p><b>Where AI goes wrong:</b> it often writes the naive softmax without max-subtraction, applies softmax over the wrong axis (across the batch instead of across classes), or applies softmax twice before a loss that already includes it.</p>
      <p><b>What you must own:</b> the axis, the stability trick, and choosing temperature to fit the task.</p>`,
    problems: [
      P({
        title: 'Temperature Softmax by Hand', level: 'Easy', tags: ['softmax', 'temperature'],
        statement: `<p>Logits are [1, 2]. Compute the probabilities at T=1 and at T=0.5, by hand.</p>`,
        constraints: `Round to 3 decimals`,
        example: `<p>T=1: e=[2.718, 7.389], sum 10.107 → [${H.c('g', '0.269')}, ${H.c('g', '0.731')}]. T=0.5: scaled [2,4] → e=[7.389, 54.598], sum 61.987 → [0.119, 0.881].</p>`,
        bruteWhy: `<p>Forgetting to divide by T first, or dividing the final probabilities by T (which breaks the sum-to-1).</p>`,
        mcq: { q: 'Lower temperature makes the output…', options: ['more peaked on the top choice', 'more uniform', 'negative', 'unchanged'], answer: 0, explain: 'Dividing logits by a small T widens the gaps, so the leader dominates.' },
        hints: [`<p>Divide logits by T first.</p>`, `<p>Subtract the max, exponentiate, divide by the sum.</p>`, `<p>Check the answer sums to 1.</p>`],
        approach: `<p>Scale logits by 1/T, subtract the maximum for stability, exponentiate and divide by the total. At T=1 the gap is 1 so the ratio is e = 2.718, giving 0.269/0.731. At T=0.5 the gap becomes 2 so the ratio is e<sup>2</sup> = 7.389, giving 0.119/0.881. Lower temperature increases the leader's share.</p>`,
        code: { lang: 'python', run: true, code: `import math
def sm(z, T):
    s = [x / T for x in z]; m = max(s)
    e = [math.exp(x - m) for x in s]
    return [round(x / sum(e), 3) for x in e]
print(sm([1, 2], 1), sm([1, 2], 0.5))` },
        complexity: `<p>O(k) for k classes.</p>`
      })
    ]
  });

  // ===================== TOPIC 5: NUMPY & BROADCASTING =====================
  topics.push({
    title: 'NumPy Basics, Broadcasting & Feature Normalisation',
    analogy: `<p>A Python list is a <b>shopping basket</b> of mixed items you handle one at a time. A NumPy array is a <b>tray of identical muffins</b>: same type, packed tightly, and you can say "add a cherry to every muffin" in one sentence instead of looping. <b>Broadcasting</b> is the rule that lets a small tray be "stretched" (virtually, no copying) to match a big tray, like handing a single price list to every row of orders.</p>`,
    explain: `<p><b>🟢 NumPy in one minute.</b> <code>np.array([1,2,3])</code> makes an array with a <b>shape</b> (its size in each direction) and a <b>dtype</b> (number type). Maths applies to every element at once ("vectorised"), which is 10-100× faster than a Python loop.</p>
      ${H.table(['Task', 'NumPy', 'Result'], [['make', 'a = np.array([[1,2,3],[4,5,6]])', 'shape (2, 3)'], ['elementwise', 'a * 10', 'every cell × 10'], ['matmul', 'a @ a.T', 'shape (2, 2)'], ['sum by column', 'a.sum(axis=0)', '[5, 7, 9]'], ['sum by row', 'a.sum(axis=1)', '[6, 15]'], ['reshape', 'a.reshape(3, 2)', 'same data, new shape'], ['slice', 'a[:, 1]', '[2, 5] (column 1)'], ['filter', 'a[a > 3]', '[4, 5, 6]']])}
      <p><b>Axis memory trick:</b> <code>axis=0</code> means "collapse the rows, go down"; you get one number per column. <code>axis=1</code> collapses across columns; one number per row.</p>
      <p><b>Broadcasting rules.</b> To combine two arrays: (1) line up their shapes from the <b>right</b>; (2) for each pair of sizes they are compatible if they are <b>equal</b> or <b>one of them is 1</b>; (3) a size 1 is stretched to match; missing leading dimensions count as 1.</p>
      ${H.table(['A shape', 'B shape', 'Result', 'Why'], [['(3, 4)', '(4,)', '<span class="c-g">(3, 4)</span>', '4=4; B gets a leading 1 then stretched to 3 rows'], ['(3, 1)', '(1, 4)', '<span class="c-g">(3, 4)</span>', 'each 1 stretched: a 3×4 grid (outer sum)'], ['(3, 4)', '(3,)', '<span class="c-r">error</span>', 'right-most 4 vs 3: not equal, neither is 1'], ['(2, 3, 4)', '(3, 1)', '<span class="c-g">(2, 3, 4)</span>', '4 vs 1 ok; 3=3; leading 2 vs missing ok']])}
      <p><b>Normalising features.</b> Features on very different scales (age 0-100 vs salary 0-1,000,000) confuse many models. Two common fixes per column:</p>
      <p><b>Min-max:</b> (x − min)/(max − min) → squeezes to 0-1.<br><b>Z-score (standardise):</b> (x − mean)/std → mean 0, std 1.</p>
      <p>Heights [150,160,170,180,190]: mean 170, std √200 ≈ 14.14. z = [−1.41, −0.71, 0, 0.71, 1.41]. Min-max = [0, 0.25, 0.5, 0.75, 1].</p>
      <p>With a data matrix X of shape (n_samples, n_features), the z-score is one line thanks to broadcasting: <code>(X − X.mean(axis=0)) / X.std(axis=0)</code>. The mean has shape (n_features,), broadcast across all rows.</p>`,
    clues: [
      '"vectorise this loop", "no for-loops over rows"',
      '"shapes (3,4) and (4,) / (3,1)", "can these be added?" → broadcasting rule',
      '"ValueError: operands could not be broadcast together"',
      '"features on different scales", "standardise", "zero mean unit variance"',
      '"subtract the mean of each column / each row" → axis=0 / axis=1',
      '"outer product / pairwise differences without loops" → (n,1) with (1,m)'
    ],
    code: [
      { lang: 'python', title: 'Normalise features and simulate broadcasting with plain lists (runnable)', run: true, code: `import math

# Data: 4 people, 2 features (age, salary). Rows = samples, columns = features.
X = [[25, 40000], [32, 52000], [47, 90000], [51, 78000]]

def col_stats(X):
    cols = list(zip(*X))                       # transpose: one tuple per feature
    means = [sum(c) / len(c) for c in cols]
    stds = [math.sqrt(sum((v - m) ** 2 for v in c) / len(c)) for c, m in zip(cols, means)]
    return means, stds

means, stds = col_stats(X)
print("means:", [round(m, 1) for m in means])
print("stds :", [round(s, 1) for s in stds])

# z-score: the (n_features,) mean is "broadcast" over every row
Z = [[(v - m) / s for v, m, s in zip(row, means, stds)] for row in X]
for row in Z:
    print([round(v, 2) for v in row])

# min-max scaling
cols = list(zip(*X))
M = [[(v - min(c)) / (max(c) - min(c)) for v, c in zip(row, cols)] for row in X]
print("min-max first row:", [round(v, 2) for v in M[0]])

# broadcasting rule (3,1) + (1,4) -> (3,4), done by hand
a = [[1], [2], [3]]
b = [[10, 20, 30, 40]]
out = [[a[i][0] + b[0][j] for j in range(4)] for i in range(3)]
print("outer sum:", out)

# the shape rule as a function
def broadcast_shape(s1, s2):
    s1, s2 = list(s1), list(s2)
    while len(s1) < len(s2): s1.insert(0, 1)
    while len(s2) < len(s1): s2.insert(0, 1)
    res = []
    for x, y in zip(s1, s2):
        if x == y or y == 1: res.append(x)
        elif x == 1: res.append(y)
        else: raise ValueError("cannot broadcast %s with %s" % (s1, s2))
    return tuple(res)

print(broadcast_shape((3, 1), (1, 4)), broadcast_shape((3, 4), (4,)))
try:
    broadcast_shape((3, 4), (3,))
except ValueError as e:
    print("error:", e)` },
      { lang: 'python', title: 'The same with NumPy (shown, not run)', check: false, code: `import numpy as np
X = np.array([[25, 40000], [32, 52000], [47, 90000], [51, 78000]], dtype=float)
Z = (X - X.mean(axis=0)) / X.std(axis=0)         # z-score each column
M = (X - X.min(axis=0)) / (X.max(axis=0) - X.min(axis=0))
a = np.array([[1], [2], [3]])                     # (3, 1)
b = np.array([[10, 20, 30, 40]])                  # (1, 4)
print((a + b).shape)                              # (3, 4)
print(Z.mean(axis=0), Z.std(axis=0))              # ~[0, 0] and [1, 1]` }
    ],
    codeTitle: ['Pure-Python equivalent', 'NumPy'],
    viz: {
      title: 'Broadcasting: stretch the small array, then add',
      input: '3x1 + 1x4',
      inputLabel: 'Two 2-D shapes, e.g. 3x1 + 1x4 or 3x4 + 1x4 (each size 1-4)',
      gen: function (input) {
        var m = /^\s*(\d+)\s*x\s*(\d+)\s*\+\s*(\d+)\s*x\s*(\d+)\s*$/i.exec(String(input));
        if (!m) throw new Error('Format like 3x1 + 1x4');
        var r1 = +m[1], c1 = +m[2], r2 = +m[3], c2 = +m[4], i, j;
        [r1, c1, r2, c2].forEach(function (v) { if (v < 1 || v > 4) throw new Error('Each size must be 1 to 4'); });
        var okR = r1 === r2 || r1 === 1 || r2 === 1, okC = c1 === c2 || c1 === 1 || c2 === 1;
        var shapeTable = { type: 'table', label: 'compare sizes from the right', columns: ['axis', 'A', 'B', 'compatible?'], rows: [['columns (last)', c1, c2, okC ? 'yes' : 'NO'], ['rows (first)', r1, r2, okR ? 'yes' : 'NO']] };
        var A = [], B = [];
        for (i = 0; i < r1; i++) { A.push([]); for (j = 0; j < c1; j++) A[i].push(i * c1 + j + 1); }
        for (i = 0; i < r2; i++) { B.push([]); for (j = 0; j < c2; j++) B[i].push(10 * (i * c2 + j + 1)); }
        var frames = [{ narr: 'A has shape <b>(' + r1 + ', ' + c1 + ')</b>, B has shape <b>(' + r2 + ', ' + c2 + ')</b>. Rule: line up from the right; each pair must be equal or contain a 1.', parts: [
          { type: 'grid', label: 'A (' + r1 + 'x' + c1 + ')', rows: A }, { type: 'grid', label: 'B (' + r2 + 'x' + c2 + ')', rows: B }] }];
        frames.push({ narr: 'Checking each axis.', parts: [shapeTable] });
        if (!okR || !okC) {
          frames.push({ narr: '<span class="c-r">Incompatible</span>: on the ' + (!okC ? 'last' : 'first') + ' axis the sizes differ and neither is 1, so NumPy raises <code>ValueError: operands could not be broadcast together</code>.', parts: [shapeTable] });
          frames.push({ narr: 'Fix: reshape one array (e.g. add an axis so a size becomes 1) or transpose it, so that every axis is equal or 1.', parts: [{ type: 'text', html: 'Try <code>3x1 + 1x4</code> or <code>3x4 + 1x4</code>.' }] });
          return frames;
        }
        var R = Math.max(r1, r2), C = Math.max(c1, c2), SA = [], SB = [];
        for (i = 0; i < R; i++) { SA.push([]); SB.push([]); for (j = 0; j < C; j++) { SA[i].push(A[r1 === 1 ? 0 : i][c1 === 1 ? 0 : j]); SB[i].push(B[r2 === 1 ? 0 : i][c2 === 1 ? 0 : j]); } }
        frames.push({ narr: 'Result shape = bigger of each pair = <b>(' + R + ', ' + C + ')</b>. A is virtually stretched (no data is copied in real NumPy).', parts: [
          { type: 'grid', label: 'A stretched to ' + R + 'x' + C, rows: SA }, { type: 'grid', label: 'B', rows: B }] });
        frames.push({ narr: 'B is stretched the same way.', parts: [{ type: 'grid', label: 'A stretched', rows: SA }, { type: 'grid', label: 'B stretched to ' + R + 'x' + C, rows: SB }] });
        var Res = []; for (i = 0; i < R; i++) { Res.push([]); for (j = 0; j < C; j++) Res[i].push(''); }
        for (i = 0; i < R; i++) for (j = 0; j < C; j++) {
          Res[i][j] = SA[i][j] + SB[i][j];
          var h = {}; h[i + ',' + j] = 'cur';
          frames.push({ narr: 'Result[' + i + '][' + j + '] = ' + SA[i][j] + ' + ' + SB[i][j] + ' = <b>' + Res[i][j] + '</b>.', parts: [
            { type: 'grid', label: 'A stretched', rows: SA, hl: h }, { type: 'grid', label: 'B stretched', rows: SB, hl: h },
            { type: 'grid', label: 'A + B', rows: Res.map(function (r) { return r.slice(); }), hl: h }] });
        }
        return frames;
      }
    },
    examples: [
      { title: 'Subtract each column mean', html: `<p>X shape (4,2), mean(axis=0) shape (2,). Right-aligned: 2 vs 2 equal, then a missing leading axis counts as 1 and stretches to 4. Result (4,2). If you wrongly took mean(axis=1) you would get shape (4,): 2 vs 4 fails, which is the error message that teaches you the axis was wrong.</p>` },
      { title: 'Pairwise differences without loops', html: `<p>x of shape (5,) → x[:, None] is (5,1) and x[None, :] is (1,5). Their difference is a 5×5 table of every pair's gap.</p>`, code: { lang: 'python', run: true, code: `x = [1, 4, 9]
diffs = [[a - b for b in x] for a in x]    # what x[:,None] - x[None,:] produces
for row in diffs:
    print(row)` } },
      { title: 'Silent bug: (n,) minus (n,1)', html: `<p>y_pred of shape (100,) and y_true of shape (100,1): subtraction does NOT error. It broadcasts to (100,100), computing 10,000 wrong differences, and your "loss" is garbage but looks valid. Always print shapes.</p>` },
      { title: 'Z-score properties', html: `<p>After standardising, every column has mean ≈ 0 and std ≈ 1. Compute the mean and std on the <b>training set only</b> and reuse them for validation/test data, otherwise information leaks from the test set.</p>` }
    ],
    deepDive: `<p><b>🟣 How it works.</b> A NumPy array is a block of raw memory plus <b>strides</b> (how many bytes to step along each axis). Broadcasting sets the stride of a stretched axis to 0, so the same memory is re-read: no copy. Transpose and basic slices return <b>views</b> that share memory (<code>reshape</code> does too when it can); boolean masks and fancy indexing return <b>copies</b>. Modifying a view changes the original; a classic source of bugs.</p>
      <p><b>dtype matters.</b> Integer arrays do integer division surprises and overflow silently (int8 wraps at 127). float32 is half the memory of float64 and what GPUs prefer; float16/bfloat16 are common for LLMs. <b>Why it is fast:</b> a compiled C loop over contiguous memory with SIMD instructions, no Python object per number.</p>
      <p><b>std details.</b> NumPy <code>std</code> defaults to the population formula (ddof=0); pandas <code>std</code> defaults to the sample formula (ddof=1). The same data gives different numbers; a favourite interview trap. Guard against std=0 (constant column) to avoid dividing by zero. Min-max is sensitive to outliers; robust scaling uses median and IQR.</p>
      <p><b>Memory cost of accidental broadcast.</b> (100000,1) − (1,100000) allocates 10<sup>10</sup> numbers = 80 GB in float64. Large pairwise computations are done in chunks.</p>`,
    aiEra: `<p><b>🤖 What AI changes.</b> Every tensor library for deep learning (PyTorch, JAX, TensorFlow) copies NumPy's shape and broadcasting rules. If you can reason about shapes in NumPy you can read model code. LLM-written data code is nearly always NumPy/pandas.</p>
      <p><b>Use AI as a partner:</b> ask <code>Rewrite this loop as vectorised NumPy and add a comment with the shape after each line</code>; then compare outputs on a small input.</p>
      <p><b>Where AI goes wrong:</b> wrong <code>axis</code>, silently broadcasting (n,) with (n,1), standardising before splitting data (leakage), using population vs sample std inconsistently, and creating huge intermediate arrays.</p>
      <p><b>What you must own:</b> asserting shapes (<code>assert X.shape == (n, d)</code>) and testing vectorised code against a slow loop on a toy example.</p>`,
    problems: [
      P({
        title: 'Will These Shapes Broadcast?', level: 'Easy', tags: ['numpy', 'broadcasting'],
        statement: `<p>For each pair decide whether broadcasting works and give the result shape: (5,3)&(3,), (5,3)&(5,), (5,1)&(1,3), (2,1,4)&(3,1).</p>`,
        constraints: `Apply the right-aligned rule`,
        example: `<p>(5,3)&(3,) → ${H.c('g', '(5,3)')}; (5,3)&(5,) → ${H.c('r', 'error (3 vs 5)')}; (5,1)&(1,3) → (5,3); (2,1,4)&(3,1) → (2,3,4).</p>`,
        bruteWhy: `<p>Memorising cases fails; guessing left-aligned instead of right-aligned is the usual slip.</p>`,
        mcq: { q: 'Which side do shapes line up on?', options: ['The right (last axis)', 'The left', 'The biggest', 'Neither'], answer: 0, explain: 'Trailing dimensions are compared first.' },
        hints: [`<p>Write shapes one under the other, right-aligned.</p>`, `<p>Pad the shorter one with 1s on the left.</p>`, `<p>Each column of sizes: equal, or one is 1; the result takes the larger.</p>`],
        approach: `<p>Right-align the two shapes and pad the shorter with leading 1s. Check each column of sizes: they must be equal or one must be 1; the result takes the larger. (5,3)&(3,) pads to (1,3) so the result is (5,3). (5,3)&(5,): 3 vs 5 fails. (5,1)&(1,3) gives (5,3). (2,1,4)&(3,1): pad to (1,3,1), compare 4 vs 1, 1 vs 3, 2 vs 1, giving (2,3,4).</p>`,
        code: { lang: 'python', run: true, code: `def bs(a, b):
    a, b = list(a), list(b)
    n = max(len(a), len(b))
    a = [1] * (n - len(a)) + a
    b = [1] * (n - len(b)) + b
    out = []
    for x, y in zip(a, b):
        if x != y and 1 not in (x, y):
            return "error"
        out.append(max(x, y))
    return tuple(out)
print(bs((5, 3), (3,)), bs((5, 3), (5,)), bs((5, 1), (1, 3)), bs((2, 1, 4), (3, 1)))` },
        complexity: `<p>O(number of dimensions).</p>`
      })
    ]
  });

  // ===================== TOPIC 6: PANDAS =====================
  var EMP = [
    ['Asha', 'Eng', 'Pune', 90], ['Ben', 'Eng', 'Delhi', 70], ['Chen', 'Ops', 'Pune', 50],
    ['Dev', 'Ops', 'Delhi', 60], ['Esha', 'Eng', 'Pune', 80], ['Farah', 'HR', 'Delhi', 55]
  ];
  topics.push({
    title: 'Data Handling with pandas: DataFrames, Cleaning & Group-By',
    analogy: `<p>A pandas <b>DataFrame</b> is an Excel sheet you can program: named columns, labelled rows. <b>Group-by</b> is the pivot-table move: "sort the receipts into piles by shop, then total each pile". Three steps: <b>split</b> into piles, <b>apply</b> a calculation to each pile, <b>combine</b> the answers into a new table.</p>`,
    explain: `<p><b>🟢 The basics.</b> A DataFrame is a table; each column is a <b>Series</b> (a labelled 1-D array). Real data is messy: missing values, wrong types, duplicates. Most AI work is 80% cleaning data.</p>
      ${H.table(['name', 'dept', 'city', 'salary'], EMP.map(function (r) { return r.map(String); }))}
      ${H.table(['Task', 'pandas'], [['load', 'df = pd.read_csv("file.csv")'], ['peek', 'df.head(), df.info(), df.describe()'], ['pick column', 'df["salary"]'], ['filter rows', 'df[df["salary"] > 60]'], ['new column', 'df["bonus"] = df["salary"] * 0.1'], ['missing values', 'df.isna().sum(), df.fillna(0), df.dropna()'], ['duplicates', 'df.drop_duplicates()'], ['sort', 'df.sort_values("salary", ascending=False)'], ['group-by', 'df.groupby("dept")["salary"].mean()'], ['join', 'df.merge(other, on="dept", how="left")']])}
      <p><b>Group-by worked example</b> (average salary per dept):</p>
      ${H.table(['dept', 'salaries in the pile', 'mean'], [['Eng', '90, 70, 80', '<b>80.0</b>'], ['Ops', '50, 60', '<b>55.0</b>'], ['HR', '55', '<b>55.0</b>']])}
      <p><b>Same job in pure Python:</b> loop the rows, use a dict mapping key → list of values (or running totals), then reduce each list. pandas does exactly this but in fast compiled code with nicer syntax. Know both: interviews ask you to do it by hand.</p>
      <p><b>Cleaning checklist:</b> (1) check types, (2) count missing values, (3) decide: drop, fill with mean/median/constant, or flag, (4) remove duplicates, (5) fix outliers/typos, (6) split train/test <i>before</i> computing any fill values from the data.</p>`,
    clues: [
      '"total / average / count per category" → group-by',
      '"for each customer/user/day find…" → group-by key',
      '"top N per group" → sort + groupby().head(N)',
      '"missing values", "NaN", "dirty data" → isna, fillna, dropna',
      '"combine two tables on a key" → merge (SQL JOIN)',
      '"pivot table", "crosstab" → pivot_table / groupby with two keys'
    ],
    code: [
      { lang: 'python', title: 'Pure-Python group-by (runnable)', run: true, code: `# rows: (name, dept, city, salary)
rows = [("Asha", "Eng", "Pune", 90), ("Ben", "Eng", "Delhi", 70), ("Chen", "Ops", "Pune", 50),
        ("Dev", "Ops", "Delhi", 60), ("Esha", "Eng", "Pune", 80), ("Farah", "HR", "Delhi", 55)]

def group_by(rows, key_idx, val_idx, agg):
    piles = {}                                  # split: key -> list of values
    for r in rows:
        piles.setdefault(r[key_idx], []).append(r[val_idx])
    funcs = {"sum": sum, "count": len, "mean": lambda v: sum(v) / len(v),
             "max": max, "min": min}
    f = funcs[agg]                              # apply: reduce each pile
    return {k: f(v) for k, v in piles.items()}  # combine: dict of results

print("mean salary by dept:", group_by(rows, 1, 3, "mean"))
print("headcount by city  :", group_by(rows, 2, 3, "count"))
print("max salary by dept :", group_by(rows, 1, 3, "max"))

# two keys: (dept, city)
two = {}
for name, dept, city, sal in rows:
    two.setdefault((dept, city), []).append(sal)
for k in sorted(two):
    print(k, "total =", sum(two[k]))

# cleaning: fill missing salary (None) with the median of the known ones
vals = [90, None, 50, 60, None, 55]
known = sorted(v for v in vals if v is not None)
median = (known[len(known) // 2 - 1] + known[len(known) // 2]) / 2 if len(known) % 2 == 0 else known[len(known) // 2]
print("filled:", [v if v is not None else median for v in vals])` },
      { lang: 'python', title: 'pandas version (shown, not run)', check: false, code: `import pandas as pd
df = pd.DataFrame(
    [("Asha", "Eng", "Pune", 90), ("Ben", "Eng", "Delhi", 70), ("Chen", "Ops", "Pune", 50),
     ("Dev", "Ops", "Delhi", 60), ("Esha", "Eng", "Pune", 80), ("Farah", "HR", "Delhi", 55)],
    columns=["name", "dept", "city", "salary"])

print(df.groupby("dept")["salary"].mean())                 # Eng 80, HR 55, Ops 55
print(df.groupby("city")["salary"].count())
print(df.groupby(["dept", "city"])["salary"].sum())        # two keys
print(df.groupby("dept").agg(avg=("salary", "mean"), n=("name", "count")))

df.loc[1, "salary"] = None                                  # make a gap
df["salary"] = df["salary"].fillna(df["salary"].median())  # fill with the median` }
    ],
    codeTitle: ['Pure Python group-by', 'pandas'],
    viz: {
      title: 'DataFrame group-by: split, apply, combine',
      input: 'dept mean',
      inputLabel: 'group column (dept or city) and function (sum, mean, count, max, min)',
      gen: function (input) {
        var p = String(input).trim().split(/\s+/);
        if (p.length !== 2) throw new Error('Format: dept mean');
        var col = p[0].toLowerCase(), fn = p[1].toLowerCase();
        var ci = { dept: 1, city: 2 }[col];
        if (!ci) throw new Error('Group column must be dept or city');
        var F = { sum: function (v) { return v.reduce(function (a, b) { return a + b; }, 0); }, count: function (v) { return v.length; }, mean: function (v) { return v.reduce(function (a, b) { return a + b; }, 0) / v.length; }, max: function (v) { return Math.max.apply(null, v); }, min: function (v) { return Math.min.apply(null, v); } }[fn];
        if (!F) throw new Error('Function must be sum, mean, count, max or min');
        var frames = [], keys = [], piles = {};
        frames.push({ narr: 'Our DataFrame: 6 employees. Goal: <b>' + fn + '(salary)</b> for each <b>' + col + '</b>.', parts: [
          { type: 'table', label: 'df', columns: ['name', 'dept', 'city', 'salary'], rows: EMP.map(function (r) { return r.slice(); }) }] });
        EMP.forEach(function (r) { if (!piles[r[ci]]) { piles[r[ci]] = []; keys.push(r[ci]); } });
        keys.forEach(function (k, ki) {
          var rowsIn = [], hl = {}, k2;
          EMP.forEach(function (r, idx) { if (r[ci] === k) { hl[idx] = 'cur'; piles[k].push(r[3]); } });
          frames.push({ narr: '<b>Split</b>: collect all rows where ' + col + ' = <b>' + k + '</b>. Pile: [' + piles[k].join(', ') + '].', parts: [
            { type: 'table', label: 'df (rows in this pile highlighted)', columns: ['name', 'dept', 'city', 'salary'], rows: EMP.map(function (r) { return r.slice(); }), hl: hl },
            { type: 'map', label: 'piles so far', entries: keys.slice(0, ki + 1).map(function (kk) { return [kk, '[' + piles[kk].join(', ') + ']']; }), hl: (function () { var h = {}; h[k] = 'cur'; return h; })() }] });
        });
        var res = [];
        keys.forEach(function (k, ki) {
          var v = F(piles[k]); v = Math.round(v * 100) / 100;
          res.push([k, v]);
          frames.push({ narr: '<b>Apply</b>: ' + fn + '([' + piles[k].join(', ') + ']) = <b>' + v + '</b> for ' + k + '.', parts: [
            { type: 'table', label: 'result so far', columns: [col, fn + '_salary'], rows: res.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; h[ki] = 'ok'; return h; })() }] });
        });
        frames.push({ narr: '<b>Combine</b>: the per-pile answers form a new, smaller table, one row per group. In pandas: <code>df.groupby("' + col + '")["salary"].' + fn + '()</code>.', parts: [
          { type: 'table', label: 'final result', columns: [col, fn + '_salary'], rows: res.map(function (r) { return r.slice(); }) }] });
        return frames;
      }
    },
    examples: [
      { title: 'Count per group vs size', html: `<p><code>count()</code> ignores missing values, <code>size()</code> counts rows. If a salary is NaN, count is one lower. Know which you want.</p>` },
      { title: 'Two keys', html: `<p>Group by (dept, city): Eng/Pune has Asha 90 and Esha 80 → sum 170; Eng/Delhi → Ben 70; Ops/Pune → 50; Ops/Delhi → 60; HR/Delhi → 55. Five groups from six rows.</p>` },
      { title: 'Filter then aggregate', html: `<p>Average salary of Pune employees only: filter first (<code>df[df.city == "Pune"]</code>) → [90, 50, 80] → mean 73.3. Order matters: filter-then-group is not the same as group-then-filter (the latter uses <code>HAVING</code>-like logic).</p>`, code: { lang: 'python', run: true, code: `pune = [90, 50, 80]
print(round(sum(pune) / len(pune), 1))` } },
      { title: 'Missing values strategy', html: `<p>Salary column [90, ?, 50, 60, ?, 55]. Mean fill = 63.75; median fill = 57.5. Median is safer when outliers exist. Adding a flag column "was_missing" can itself be a useful feature.</p>` }
    ],
    deepDive: `<p><b>🟣 Internals.</b> pandas stores each column as a NumPy array (or Arrow-backed array in newer versions), so column operations are vectorised. Group-by builds an index of row positions per key (hash or sort based) then runs the reduction in compiled loops: O(n) for hash, O(n log n) with sorting. Row-by-row loops (<code>iterrows</code>, <code>apply(axis=1)</code>) are 100× slower, so avoid them.</p>
      <p><b>Gotchas.</b> <code>SettingWithCopyWarning</code> (modifying a slice that may be a copy: use <code>.loc</code>); chained indexing; object dtype columns holding mixed types; merging on keys with duplicates multiplies rows; time zones; <code>groupby</code> drops NaN keys by default (<code>dropna=False</code> keeps them); mean of an empty group is NaN.</p>
      <p><b>Scale.</b> pandas needs the data in memory (roughly 2-5× the file size). Beyond that: read in chunks, use Polars or DuckDB (SQL on files), or Spark. <b>Group-by equals SQL:</b> <code>SELECT dept, AVG(salary) FROM t GROUP BY dept</code>; the same logical plan, so interviewers move freely between the two.</p>
      <p><b>Leakage.</b> Fill values and scaling statistics must be computed from training data only. Also beware of target leakage: columns that secretly contain the answer.</p>`,
    aiEra: `<p><b>🤖 What AI changes.</b> Assistants can write a pandas pipeline from a plain description, and "chat with your CSV" tools run generated code for you. LLM apps also need data prep: cleaning text, deduplicating, building evaluation sets and labels. Data quality beats model size for most real projects.</p>
      <p><b>Use AI as a partner:</b> paste the output of <code>df.head()</code> and <code>df.dtypes</code> (never real private rows) and ask <code>Suggest a cleaning plan and the pandas code</code>. Then ask it for a pure-Python check on 5 rows.</p>
      <p><b>Where AI goes wrong:</b> invents column names, uses <code>inplace</code> or chained assignment wrongly, ignores NaN keys, joins on non-unique keys causing row explosions, and fills missing values using the whole dataset (leakage).</p>
      <p><b>What you must own:</b> row counts before/after each step, privacy of the data you share, and sanity-checking aggregates against a hand calculation.</p>`,
    problems: [
      P({
        title: 'Group-By Average Without pandas', level: 'Medium', tags: ['groupby', 'dict'],
        statement: `<p>Given rows of (category, amount), return a dict with the average amount per category, rounded to 2 decimals, in pure Python.</p>`,
        constraints: `1 ≤ N ≤ 10<sup>6</sup>`,
        example: `<p>[("a",10),("b",4),("a",20)] → ${H.c('g', '{"a": 15.0, "b": 4.0}')}</p>`,
        bruteWhy: `<p>For each distinct category scanning all rows again is O(N·K). A dict of running totals does it in one pass.</p>`,
        mcq: { q: 'What do you store per key to get the mean in one pass?', options: ['(sum, count)', 'only the last value', 'a sorted list', 'nothing'], answer: 0, explain: 'Keep a running sum and count, divide at the end.' },
        hints: [`<p>One dictionary keyed by category.</p>`, `<p>Store [total, count] per key.</p>`, `<p>Divide only after the loop. Mention empty input.</p>`],
        approach: `<p>Walk the rows once, keeping a dict mapping category to a [total, count] pair. After the loop divide total by count for each key and round. This is the split-apply-combine pattern done manually: the dict is the split, the division is the apply, and the output dict is the combine. Time O(N), space O(K) for K categories, much better than rescanning for each category.</p>`,
        code: { lang: 'python', run: true, code: `def avg_by(rows):
    acc = {}
    for cat, amt in rows:
        t = acc.setdefault(cat, [0, 0])
        t[0] += amt
        t[1] += 1
    return {k: round(s / c, 2) for k, (s, c) in acc.items()}

print(avg_by([("a", 10), ("b", 4), ("a", 20)]))` },
        complexity: `<p>O(N) time, O(K) space.</p>`
      })
    ]
  });

  // ===================== PRACTICE =====================
  practice.push(P({
    title: 'Dot Product by Hand', level: 'Easy', tags: ['vectors', 'dot'],
    statement: `<p>Compute the dot product of a=[3,-1,2] and b=[1,4,-2] and say whether the vectors point mostly the same way.</p>`,
    constraints: `Same length vectors`,
    example: `<p>3×1 + (−1)×4 + 2×(−2) = 3 − 4 − 4 = ${H.c('r', '−5')}. Negative, so they point somewhat opposite.</p>`,
    bruteWhy: `<p>No heavy brute force here; the slip is adding the vectors instead of multiplying slot by slot.</p>`,
    mcq: { q: 'A negative dot product means…', options: ['the angle is more than 90°', 'a bug', 'the vectors are equal', 'zero length'], answer: 0, explain: 'dot = |a||b|cos θ; negative cosine means θ > 90°.' },
    hints: [`<p>Multiply matching slots.</p>`, `<p>Add the three products.</p>`, `<p>Sign tells direction agreement.</p>`],
    approach: `<p>Multiply slot by slot: 3×1=3, (−1)×4=−4, 2×(−2)=−4. Sum = −5. Because the sum is negative the cosine is negative, so the angle is above 90 degrees: the vectors disagree more than they agree. The magnitude alone does not say how similar they are; divide by the lengths to get cosine: |a|=√14, |b|=√21, so cos ≈ −0.29.</p>`,
    code: { lang: 'python', run: true, code: `a, b = [3, -1, 2], [1, 4, -2]
print(sum(x * y for x, y in zip(a, b)))` },
    complexity: `<p>O(d).</p>`
  }));
  practice.push(P({
    title: 'Cosine Similarity of Two Sentences', level: 'Easy', tags: ['cosine', 'bag-of-words'],
    statement: `<p>Represent two sentences as word-count vectors over a shared vocabulary and compute their cosine similarity. "the cat sat" vs "the cat ran".</p>`,
    constraints: `Lowercase, split on spaces`,
    example: `<p>Vocab [the, cat, sat, ran]: v1=[1,1,1,0], v2=[1,1,0,1]. dot=2, norms √3 each → cos = 2/3 = ${H.c('g', '0.667')}.</p>`,
    bruteWhy: `<p>Comparing words pairwise in nested loops works but is slower and does not generalise to a vector formula.</p>`,
    mcq: { q: 'What goes in each vector slot?', options: ['count of that vocabulary word', 'the word length', 'the sentence length', 'a random number'], answer: 0, explain: 'One slot per vocabulary word holds how many times it appears.' },
    hints: [`<p>Build the vocabulary from both sentences.</p>`, `<p>Count words with a dict.</p>`, `<p>Then dot / (norm × norm).</p>`],
    approach: `<p>Collect the sorted union of words as the vocabulary. For each sentence build a count vector with one slot per vocabulary word. Then apply cosine = dot / (|a||b|). For the example, the vectors share 2 words out of 3 each, so the result is 2/3. This bag-of-words approach ignores order but is the stepping stone to learned embeddings.</p>`,
    code: { lang: 'python', run: true, code: `import math
def vec(s, vocab):
    words = s.lower().split()
    return [words.count(w) for w in vocab]
s1, s2 = "the cat sat", "the cat ran"
vocab = sorted(set(s1.split()) | set(s2.split()))
a, b = vec(s1, vocab), vec(s2, vocab)
dot = sum(x * y for x, y in zip(a, b))
print(vocab, a, b, round(dot / (math.sqrt(sum(x*x for x in a)) * math.sqrt(sum(x*x for x in b))), 3))` },
    complexity: `<p>O(V·L) for vocabulary size V and sentence length L (can be O(L) with dicts).</p>`
  }));
  practice.push(P({
    title: 'Expected Value of a Game', level: 'Easy', tags: ['expected value'],
    statement: `<p>Roll a fair die. Win ₹10 if you roll 6, win ₹3 if you roll 4 or 5, otherwise lose ₹2. What is the expected win per play?</p>`,
    constraints: `Fair die`,
    example: `<p>(1/6)(10) + (2/6)(3) + (3/6)(−2) = 1.667 + 1 − 1 = ${H.c('g', '+1.667')}.</p>`,
    bruteWhy: `<p>Simulating a million rolls gives an approximate answer; the formula gives it exactly instantly.</p>`,
    mcq: { q: 'Expected value is…', options: ['sum of outcome × probability', 'the most likely outcome', 'the largest outcome', 'the median'], answer: 0, explain: 'It is the probability-weighted average.' },
    hints: [`<p>List each outcome's payoff.</p>`, `<p>Multiply each payoff by its probability.</p>`, `<p>Add. A positive EV means a favourable game.</p>`],
    approach: `<p>Group the six faces by payoff: face 6 pays 10 with probability 1/6, faces 4 and 5 pay 3 with probability 2/6, faces 1-3 pay −2 with probability 3/6. Multiply and add: 10/6 + 6/6 − 6/6 = 1.667. You gain about ₹1.67 per play on average, even though any single play can lose money. A simulation of many plays should converge to this number.</p>`,
    code: { lang: 'python', run: true, code: `import random
random.seed(3)
pay = {1: -2, 2: -2, 3: -2, 4: 3, 5: 3, 6: 10}
print("exact:", round(sum(v / 6 for v in pay.values()), 3))
print("simulated:", round(sum(pay[random.randint(1, 6)] for _ in range(100000)) / 100000, 3))` },
    complexity: `<p>O(outcomes).</p>`
  }));
  practice.push(P({
    title: 'Softmax Sanity Check', level: 'Easy', tags: ['softmax'],
    statement: `<p>Without computing exponentials, say which of softmax([5,3,1]) and softmax([105,103,101]) has the larger top probability, and why.</p>`,
    constraints: `Reason, then verify`,
    example: `<p>They are ${H.c('g', 'identical')}: adding 100 to every logit cancels in the ratio.</p>`,
    bruteWhy: `<p>Computing e<sup>105</sup> directly is huge (about 10<sup>45</sup>) and risks overflow in smaller number types.</p>`,
    mcq: { q: 'Adding a constant to all logits…', options: ['does not change softmax', 'doubles the top probability', 'makes them sum to 2', 'makes them negative'], answer: 0, explain: 'The factor e^c appears top and bottom and cancels.' },
    hints: [`<p>Write e^(z+c) = e^z × e^c.</p>`, `<p>The e^c factors cancel in numerator and denominator.</p>`, `<p>That is exactly why subtracting the max is safe.</p>`],
    approach: `<p>Because e<sup>z+c</sup> = e<sup>z</sup>·e<sup>c</sup>, the common factor e<sup>c</sup> divides out of numerator and denominator, so softmax is shift-invariant. Both inputs give the same probabilities (about 0.867, 0.117, 0.016). This invariance is the reason implementations subtract the maximum logit: it keeps numbers small without altering the answer.</p>`,
    code: { lang: 'python', run: true, code: `import math
def sm(z):
    m = max(z); e = [math.exp(x - m) for x in z]; s = sum(e)
    return [round(x / s, 3) for x in e]
print(sm([5, 3, 1]), sm([105, 103, 101]))` },
    complexity: `<p>O(k).</p>`
  }));

  practice.push(P({
    title: 'Matrix-Vector Product and Shape Tracking', level: 'Medium', tags: ['matmul', 'shapes'],
    statement: `<p>A layer has weights W of shape (4,3), inputs X of shape (10,4) and a bias b of shape (3,). Write the expression and the shape after each step. Then compute Wᵀ·x for the single input x=[1,0,2,1] using a smaller weight matrix W of shape (4,2): W=[[1,0],[2,1],[0,3],[1,1]].</p>`,
    constraints: `Show shapes at each step`,
    example: `<p>X@W → (10,3); + b broadcasts (3,) → (10,3). Wᵀx with Wᵀ=[[1,2,0,1],[0,1,3,1]]: [1+0+0+1, 0+0+6+1] = ${H.c('g', '[2, 7]')}.</p>`,
    bruteWhy: `<p>Looping over each example and each output neuron is O(10·4·3) Python steps; one matmul does it in optimised native code.</p>`,
    mcq: { q: 'Shape of X @ W with X (10,4) and W (4,3)?', options: ['(10, 3)', '(4, 4)', '(3, 10)', 'error'], answer: 0, explain: 'Inner 4 = 4 cancels; outer sizes remain.' },
    hints: [`<p>Inner dimensions must match, then drop them.</p>`, `<p>Bias (3,) aligns with the last axis, so it broadcasts over the 10 rows.</p>`, `<p>For Wᵀx, rows of Wᵀ are columns of W.</p>`],
    approach: `<p>X (10,4) times W (4,3): the inner 4s match and the result is (10,3), one row of 3 outputs per example. Adding bias b of shape (3,) right-aligns with the last axis and broadcasts over the 10 rows, giving (10,3) again. For the small computation, each output equals the dot product of x with a column of W: column 0 is [1,2,0,1] giving 1+0+0+1=2, and column 1 is [0,1,3,1] giving 0+0+6+1=7. So the result is [2,7].</p>`,
    code: { lang: 'python', run: true, code: `W = [[1, 0], [2, 1], [0, 3], [1, 1]]
x = [1, 0, 2, 1]
out = [sum(x[k] * W[k][j] for k in range(4)) for j in range(2)]
print(out)` },
    complexity: `<p>O(batch × in × out).</p>`
  }));
  practice.push(P({
    title: 'Implement Stable Softmax with Temperature', level: 'Medium', tags: ['softmax', 'implementation'],
    statement: `<p>Write <code>softmax(logits, T)</code> that never overflows, raises on T ≤ 0, and returns a list that sums to 1. Test on [1000, 1001, 1002] and [-1000, 0].</p>`,
    constraints: `Pure Python, 1 ≤ k ≤ 10<sup>5</sup>`,
    example: `<p>[1000,1001,1002], T=1 → ${H.c('g', '[0.090, 0.245, 0.665]')}. [-1000, 0] → [0.0, 1.0].</p>`,
    bruteWhy: `<p>Naive <code>math.exp(1000)</code> raises OverflowError (or returns inf in NumPy) and the result is NaN.</p>`,
    bruteCode: `import math\ndef naive(z):\n    e = [math.exp(x) for x in z]\n    return [x / sum(e) for x in e]`,
    mcq: { q: 'Where do you apply T?', options: ['divide logits by T before exponentiating', 'divide probabilities by T', 'multiply the sum by T', 'add T to the max'], answer: 0, explain: 'Temperature rescales logits; dividing probabilities would break the sum.' },
    hints: [`<p>Scale then subtract max.</p>`, `<p>Compute the sum once, not inside the list comprehension (that would be O(k²)).</p>`, `<p>Validate T first; keep the result float.</p>`],
    approach: `<p>Validate that T is positive. Divide each logit by T, find the maximum and subtract it, exponentiate (largest term becomes exactly 1 so no overflow), compute the total once, and divide. Terms that underflow to 0 for very negative inputs are harmless. Make sure the sum is computed once outside the comprehension, otherwise the function silently becomes quadratic.</p>`,
    code: { lang: 'python', run: true, code: `import math
def softmax(z, T=1.0):
    if T <= 0:
        raise ValueError("T must be positive")
    s = [x / T for x in z]
    m = max(s)
    e = [math.exp(x - m) for x in s]
    tot = sum(e)
    return [x / tot for x in e]
print([round(p, 3) for p in softmax([1000, 1001, 1002])])
print(softmax([-1000, 0]))` },
    complexity: `<p>O(k) time, O(k) space.</p>`,
    followUps: ['Return log-softmax stably', 'Apply it row-wise to a batch']
  }));
  practice.push(P({
    title: 'Z-Score a Column Safely', level: 'Medium', tags: ['normalisation', 'edge cases'],
    statement: `<p>Write a function that standardises a list of numbers (mean 0, std 1, population std). If all values are equal, return zeros instead of dividing by zero. Then explain how to apply the same transform to test data.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>6</sup>`,
    example: `<p>[150,160,170,180,190] → ${H.c('g', '[-1.414,-0.707,0,0.707,1.414]')}. [5,5,5] → [0,0,0].</p>`,
    bruteWhy: `<p>Recomputing the mean inside the std loop for each element is O(N²); compute stats once.</p>`,
    mcq: { q: 'Which data should supply the mean and std for the test set?', options: ['the training set', 'the test set itself', 'both combined', 'a random sample'], answer: 0, explain: 'Using test statistics leaks information and is unavailable at prediction time.' },
    hints: [`<p>Two passes: mean, then variance.</p>`, `<p>Guard std == 0.</p>`, `<p>Return (mean, std) so the same numbers can be reused on new data.</p>`],
    approach: `<p>Compute the mean in one pass and the population variance in a second pass, take the square root, and if std is 0 return zeros. Return the fitted mean and std alongside the result, because test data and live predictions must be scaled with the training set's numbers, never with their own. Fitting on the full data before splitting is a leakage bug that inflates scores.</p>`,
    code: { lang: 'python', run: true, code: `import math
def fit(x):
    m = sum(x) / len(x)
    s = math.sqrt(sum((v - m) ** 2 for v in x) / len(x))
    return m, s
def transform(x, m, s):
    return [0.0 if s == 0 else (v - m) / s for v in x]
m, s = fit([150, 160, 170, 180, 190])
print([round(v, 3) for v in transform([150, 160, 170, 180, 190], m, s)])
print(transform([5, 5, 5], *fit([5, 5, 5])))
print(round(transform([200], m, s)[0], 3))   # a new test value uses the TRAIN stats` },
    complexity: `<p>O(N).</p>`
  }));
  practice.push(P({
    title: 'Spam Filter Posterior with Smoothing', level: 'Medium', tags: ['bayes', 'naive bayes'],
    statement: `<p>Given counts of words in spam and ham emails, compute P(spam | words) for a new message using Naive Bayes with add-one smoothing. Spam: total 100 words, "free" 20, "meeting" 1. Ham: total 200 words, "free" 2, "meeting" 30. Vocabulary size 50. Prior spam = 0.4. Message: "free free meeting".</p>`,
    constraints: `Use logs or plain products`,
    example: `<p>P(w|spam)=(count+1)/(100+50): free=21/150=0.14, meeting=2/150=0.0133. Ham: free=3/250=0.012, meeting=31/250=0.124. Spam score=0.4×0.14²×0.0133=1.05e-4. Ham score=0.6×0.012²×0.124=1.07e-5. P(spam)≈${H.c('g', '0.907')}.</p>`,
    bruteWhy: `<p>Estimating the joint probability of whole messages requires seeing each exact message before; independence plus smoothing makes the unseen possible.</p>`,
    mcq: { q: 'Why add 1 to every count?', options: ['so unseen words do not make the probability 0', 'to speed up the code', 'to make the prior 0.5', 'to remove stop words'], answer: 0, explain: 'A zero would wipe out the whole product.' },
    hints: [`<p>Per-word likelihood = (count+1)/(class total + vocab size).</p>`, `<p>Multiply likelihoods for each word occurrence, times the prior.</p>`, `<p>Normalise the two scores; for long messages sum logs.</p>`],
    approach: `<p>For each class compute smoothed word likelihoods (count+1)/(total+V). Score each class as prior times the product of the likelihoods of every word occurrence in the message ("free" counts twice). Normalise the spam score by the sum of both scores. The numbers give a spam score near 1.05e-4 versus 1.07e-5, so about 0.907. In production sum log-probabilities to avoid underflow.</p>`,
    code: { lang: 'python', run: true, code: `import math
V = 50
spam = {"total": 100, "free": 20, "meeting": 1}
ham = {"total": 200, "free": 2, "meeting": 30}
def logscore(prior, cls, words):
    s = math.log(prior)
    for w in words:
        s += math.log((cls.get(w, 0) + 1) / (cls["total"] + V))
    return s
msg = ["free", "free", "meeting"]
a, b = logscore(0.4, spam, msg), logscore(0.6, ham, msg)
m = max(a, b)
pa = math.exp(a - m) / (math.exp(a - m) + math.exp(b - m))   # softmax of two log-scores!
print(round(pa, 3))` },
    complexity: `<p>O(words in message).</p>`
  }));
  practice.push(P({
    title: 'Pairwise Cosine Matrix', level: 'Medium', tags: ['matmul', 'cosine'],
    statement: `<p>Given N vectors, return the N×N matrix of cosine similarities. Explain how to get it with one matrix multiplication.</p>`,
    constraints: `N ≤ 500, d ≤ 64`,
    example: `<p>[[1,0],[0,1],[1,1]] → diagonal 1s; cos(v0,v2)=cos(v1,v2)=${H.c('g', '0.707')}; cos(v0,v1)=0.</p>`,
    bruteWhy: `<p>Recomputing both norms for each of N² pairs is wasteful; normalise each vector once.</p>`,
    mcq: { q: 'After normalising rows to length 1, similarities equal…', options: ['U @ U.T', 'U + U.T', 'U * U', 'U.sum()'], answer: 0, explain: 'Entry (i,j) is the dot of unit rows i and j: the cosine.' },
    hints: [`<p>Normalise each row once.</p>`, `<p>The Gram matrix U Uᵀ holds all dot products.</p>`, `<p>The result is symmetric with ones on the diagonal.</p>`],
    approach: `<p>Divide each vector by its norm to make unit rows U (skip zero vectors). Then the similarity matrix is U times U-transpose, because entry (i,j) is the dot product of two unit vectors, which is their cosine. This reduces O(N²) norm computations to N, leaving N² dot products which a BLAS matmul executes very fast. The result is symmetric with ones on the diagonal.</p>`,
    code: { lang: 'python', run: true, code: `import math
V = [[1, 0], [0, 1], [1, 1]]
U = []
for v in V:
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    U.append([x / n for x in v])
S = [[round(sum(a * b for a, b in zip(u, w)), 3) for w in U] for u in U]
for row in S:
    print(row)` },
    complexity: `<p>O(N²·d).</p>`
  }));
  practice.push(P({
    title: 'Top Earner per Department', level: 'Medium', tags: ['groupby', 'pandas'],
    statement: `<p>From rows (name, dept, salary) return the highest-paid name for each department, in pure Python, and show the pandas equivalent. Ties: keep the first seen.</p>`,
    constraints: `N ≤ 10<sup>6</sup>`,
    example: `<p>[("Asha","Eng",90),("Ben","Eng",70),("Chen","Ops",50)] → ${H.c('g', '{"Eng": "Asha", "Ops": "Chen"}')}</p>`,
    bruteWhy: `<p>Sorting all rows and then scanning per department is O(N log N); a single pass tracking the best per key is O(N).</p>`,
    mcq: { q: 'Single pass state per key?', options: ['best (salary, name) so far', 'the full list of rows', 'only the count', 'a sorted copy'], answer: 0, explain: 'Compare each row with the current best for its dept.' },
    hints: [`<p>Dict from dept to current best.</p>`, `<p>Replace only if strictly greater (keeps first on ties).</p>`, `<p>pandas: <code>df.loc[df.groupby("dept")["salary"].idxmax()]</code>.</p>`],
    approach: `<p>Keep one dict mapping department to the best (salary, name) seen so far. For each row compare with the stored best and replace it only when the new salary is strictly greater, which keeps the first row on ties. After one pass output names. In pandas, groupby plus idxmax gives the index of the best row per group, and .loc selects those rows. Time is O(N) versus O(N log N) for sort-based approaches.</p>`,
    code: { lang: 'python', run: true, code: `rows = [("Asha", "Eng", 90), ("Ben", "Eng", 70), ("Chen", "Ops", 50), ("Dev", "Ops", 60)]
best = {}
for name, dept, sal in rows:
    if dept not in best or sal > best[dept][0]:
        best[dept] = (sal, name)
print({d: v[1] for d, v in best.items()})` },
    alt: undefined,
    complexity: `<p>O(N).</p>`
  }));

  practice.push(P({
    title: 'Vectorised Distance Matrix via Broadcasting', level: 'Hard', tags: ['broadcasting', 'numpy', 'distance'],
    statement: `<p>Given points X (n,d) and centres C (k,d), compute the (n,k) matrix of squared Euclidean distances without Python loops over points, using broadcasting. State the intermediate shapes and the memory cost, and give a lower-memory alternative.</p>`,
    constraints: `n up to 10<sup>5</sup>, k ≤ 100, d ≤ 128`,
    example: `<p>X=[[0,0],[3,4]], C=[[0,0]] → ${H.c('g', '[[0],[25]]')}.</p>`,
    bruteWhy: `<p>Python loops over n·k pairs are ~10<sup>7</sup> iterations of slow bytecode; also easy to get the axes wrong.</p>`,
    mcq: { q: 'Shape of X[:,None,:] - C[None,:,:]?', options: ['(n, k, d)', '(n, d)', '(k, d)', '(n, k)'], answer: 0, explain: '(n,1,d) with (1,k,d) broadcasts to (n,k,d).' },
    hints: [`<p>Insert axes so X is (n,1,d) and C is (1,k,d).</p>`, `<p>Subtract, square, sum over the last axis.</p>`, `<p>Memory n·k·d is big; use |x|² − 2x·c + |c|² with one matmul instead.</p>`],
    approach: `<p>Reshape X to (n,1,d) and C to (1,k,d); their difference broadcasts to (n,k,d). Square it and sum over axis 2 to get the (n,k) squared distances. The cost is n·k·d floats for the intermediate (10<sup>5</sup>×100×128 floats is about 10 GB in float64, too large). The lower-memory alternative expands the square: |x−c|² = |x|² − 2 x·c + |c|², so compute X @ C.T (n,k), add row norms (n,1) and column norms (1,k) by broadcasting. Clip tiny negatives caused by rounding to zero. Below is a stdlib version plus the NumPy idea.</p>`,
    code: { lang: 'python', run: true, code: `X = [[0, 0], [3, 4]]
C = [[0, 0], [1, 1]]
D = [[sum((a - b) ** 2 for a, b in zip(x, c)) for c in C] for x in X]
print(D)
# expanded form: |x|^2 - 2 x.c + |c|^2 gives the same numbers
xn = [sum(a * a for a in x) for x in X]
cn = [sum(b * b for b in c) for c in C]
D2 = [[xn[i] - 2 * sum(a * b for a, b in zip(X[i], C[j])) + cn[j] for j in range(len(C))] for i in range(len(X))]
print(D2)` },
    alt: [{ lang: 'python', check: false, code: `import numpy as np
def sqdist(X, C):
    # |x|^2 (n,1) - 2 X C^T (n,k) + |c|^2 (1,k); no (n,k,d) tensor
    D = (X ** 2).sum(1)[:, None] - 2 * X @ C.T + (C ** 2).sum(1)[None, :]
    return np.maximum(D, 0)          # clip rounding noise` }],
    complexity: `<p>O(n·k·d) time; memory O(n·k) with the expanded form.</p>`,
    followUps: ['Assign each point to its nearest centre (k-means step) with argmin(axis=1)', 'Chunk n to bound memory']
  }));
  practice.push(P({
    title: 'Sample Mean Converges: Law of Large Numbers', level: 'Hard', tags: ['probability', 'simulation'],
    statement: `<p>Simulate rolling a die n times for n in 10, 100, 1000, 10000 and print the error |sample mean − 3.5|. Explain how the typical error shrinks with n and why quadrupling samples only halves it.</p>`,
    constraints: `Use random.seed for repeatability`,
    example: `<p>Errors fall roughly like 1.708/√n: n=10 → 0.54, n=10000 → ${H.c('g', '0.017')} typical.</p>`,
    bruteWhy: `<p>Looking at a single run proves nothing; the error is itself random, so average several trials.</p>`,
    mcq: { q: 'Standard error of a mean scales as…', options: ['σ/√n', 'σ/n', 'σ·n', 'σ²'], answer: 0, explain: 'Four times the data halves the error.' },
    hints: [`<p>The std of one roll is 1.708.</p>`, `<p>Std of the mean = std / √n.</p>`, `<p>Repeat each n many times and average the absolute error.</p>`],
    approach: `<p>For each n run many independent trials, compute the sample mean of n rolls, and average |mean − 3.5| across trials. Theory says the standard deviation of the sample mean is σ/√n with σ ≈ 1.708, so the typical error is about 1.708/√n times 0.8 for the average absolute error. Hence n=100 gives 0.17 and n=10000 gives 0.017: 100 times more data buys only 10 times less error. That diminishing return explains why evaluation sets and A/B tests need sizeable samples.</p>`,
    code: { lang: 'python', run: true, code: `import random, math
random.seed(11)
for n in (10, 100, 1000, 10000):
    errs = []
    for _ in range(200):
        mean = sum(random.randint(1, 6) for _ in range(n)) / n
        errs.append(abs(mean - 3.5))
    print(n, round(sum(errs) / len(errs), 4), "theory ~", round(0.8 * 1.708 / math.sqrt(n), 4))` },
    complexity: `<p>O(trials × Σn).</p>`
  }));
  practice.push(P({
    title: 'Pure-Python Group-By Engine with Multiple Aggregates', level: 'Hard', tags: ['groupby', 'design'],
    statement: `<p>Build <code>group_agg(rows, keys, aggs)</code> where rows are dicts, keys is a list of column names, and aggs maps output name to (column, function name). Support sum, count, mean, max, min, and sort the output by key. Mimic <code>df.groupby(keys).agg(...)</code>.</p>`,
    constraints: `N ≤ 10<sup>6</sup>, any number of keys`,
    example: `<p>keys=["dept"], aggs={"total": ("salary","sum"), "n": ("salary","count")} → ${H.c('g', '[{"dept":"Eng","total":240,"n":3}, ...]')}.</p>`,
    bruteWhy: `<p>Filtering the whole list once per distinct key is O(N·K).</p>`,
    mcq: { q: 'What should the dict key be for multi-column grouping?', options: ['a tuple of the key values', 'a list of the key values', 'a string of the first key', 'the row index'], answer: 0, explain: 'Tuples are hashable; lists are not.' },
    hints: [`<p>Key = tuple(row[k] for k in keys).</p>`, `<p>Collect values per output column per group, reduce at the end.</p>`, `<p>Sort groups; handle empty input and unknown function names with a clear error.</p>`],
    approach: `<p>One pass builds a dict from the tuple of key values to a list of rows (or to per-aggregate value lists). A function table maps names such as sum, count, mean, max and min to Python callables, and unknown names raise a clear error. After the pass, loop over the groups in sorted key order and apply each aggregate to its column values, producing one output dict per group that contains the key columns and aggregate outputs. Time O(N + G log G) for G groups.</p>`,
    code: { lang: 'python', run: true, code: `FUNCS = {"sum": sum, "count": len, "max": max, "min": min,
         "mean": lambda v: sum(v) / len(v)}

def group_agg(rows, keys, aggs):
    groups = {}
    for r in rows:
        groups.setdefault(tuple(r[k] for k in keys), []).append(r)
    out = []
    for gk in sorted(groups):
        rec = dict(zip(keys, gk))
        for name, (col, fn) in aggs.items():
            if fn not in FUNCS:
                raise ValueError("unknown aggregate: " + fn)
            rec[name] = FUNCS[fn]([r[col] for r in groups[gk]])
        out.append(rec)
    return out

rows = [{"dept": "Eng", "salary": 90}, {"dept": "Eng", "salary": 70},
        {"dept": "Ops", "salary": 50}, {"dept": "Eng", "salary": 80}]
for rec in group_agg(rows, ["dept"], {"total": ("salary", "sum"), "avg": ("salary", "mean"), "n": ("salary", "count")}):
    print(rec)` },
    complexity: `<p>O(N + G log G + N·A) for A aggregates.</p>`,
    followUps: ['Add a median aggregate', 'Stream the data in chunks and merge partial results']
  }));
  practice.push(P({
    title: 'Design a Safe Preprocessing Pipeline', level: 'Hard', tags: ['pipeline', 'leakage', 'pandas'],
    statement: `<p>You get a CSV with columns age, salary (some missing), city (text), and a label. Describe, step by step with justification, how you would clean, split, impute, scale and encode it, and how you would stop leakage. Give code for the core of it in pure Python.</p>`,
    constraints: `Written design plus a small code sample`,
    example: `<p>Split 80/20 first, fit median and mean/std on the ${H.c('g', 'train part only')}, apply them to both.</p>`,
    bruteWhy: `<p>Weak: "fill NaNs with the dataset mean, standardise everything, then split". The statistics include test rows, so the test score is optimistically biased.</p>`,
    mcq: { q: 'When should the train/test split happen?', options: ['before computing fill values and scaling stats', 'after scaling', 'after encoding labels', 'it does not matter'], answer: 0, explain: 'Anything learned from data must be learned from the training part only.' },
    hints: [`<p>Split first, with a fixed seed.</p>`, `<p>Fit imputer and scaler on train, apply to test.</p>`, `<p>Handle categories unseen in train; save the fitted parameters for production.</p>`],
    approach: `<p>1) Inspect: dtypes, missing counts, duplicates, label balance. 2) Remove exact duplicates and obvious errors (negative age). 3) Split into train and test with a fixed random seed (stratify on the label if classes are imbalanced, split by time for time-series). 4) On the train set only, learn the median of age and salary, the mean and std for scaling, and the list of known cities. 5) Apply those learned values to train and test: fill missing numbers (optionally add a was_missing flag), z-score numbers, one-hot encode city with an "unknown" bucket. 6) Persist the fitted parameters so serving applies exactly the same transform. 7) Check shapes and row counts after each step. Doing the fit on all data first would leak test information and inflate scores.</p>`,
    code: { lang: 'python', run: true, code: `import math, random
random.seed(0)
rows = [{"age": a, "salary": s} for a, s in [(25, 40), (30, None), (35, 60), (40, 80), (None, 90), (50, 100)]]
random.shuffle(rows)
cut = int(len(rows) * 0.67)
train, test = rows[:cut], rows[cut:]

def fit(rows, col):
    vals = sorted(r[col] for r in rows if r[col] is not None)
    mid = len(vals) // 2
    med = vals[mid] if len(vals) % 2 else (vals[mid - 1] + vals[mid]) / 2
    filled = [r[col] if r[col] is not None else med for r in rows]
    mean = sum(filled) / len(filled)
    std = math.sqrt(sum((v - mean) ** 2 for v in filled) / len(filled)) or 1.0
    return med, mean, std

params = {c: fit(train, c) for c in ("age", "salary")}      # learned from TRAIN only

def transform(rows):
    out = []
    for r in rows:
        rec = {}
        for c, (med, mean, std) in params.items():
            v = r[c] if r[c] is not None else med
            rec[c] = round((v - mean) / std, 3)
        out.append(rec)
    return out

print("train:", transform(train))
print("test :", transform(test))` },
    complexity: `<p>O(N) per pass.</p>`,
    followUps: ['What changes for time-series data?', 'How would you do this inside a scikit-learn Pipeline?']
  }));
  practice.push(P({
    title: 'Attention Scores: Shapes and Softmax', level: 'Hard', tags: ['attention', 'matmul', 'softmax'],
    statement: `<p>Given Q (3,2) and K (3,2), compute the scores S = Q Kᵀ / √d, apply softmax row-wise and explain the shapes. Show why dividing by √d helps.</p>`,
    constraints: `d = 2`,
    example: `<p>Q=K=[[1,0],[0,1],[1,1]] → scores before scaling [[1,0,1],[0,1,1],[1,1,2]]; each row of the weights sums to ${H.c('g', '1')}.</p>`,
    bruteWhy: `<p>Looping token pair by token pair computing each dot product separately repeats Python overhead n² times; and skipping the scaling makes softmax too peaked as d grows.</p>`,
    mcq: { q: 'Why divide by √d?', options: ['dot products grow with d and saturate softmax', 'to make the matrix square', 'to avoid division by zero', 'to sort the scores'], answer: 0, explain: 'Variance of a dot product grows with d, so scaling keeps logits moderate.' },
    hints: [`<p>Q Kᵀ is (3,2)(2,3) = (3,3).</p>`, `<p>Softmax over the last axis (keys), per row.</p>`, `<p>With random unit-variance entries the dot product has variance d.</p>`],
    approach: `<p>Q (3,2) times Kᵀ (2,3) gives a 3×3 score matrix: entry (i,j) is how much query token i matches key token j. Divide by √d (here √2) so the typical size stays near 1 independent of d, because the variance of a dot product of d unit-variance numbers is d. Apply a stable softmax along each row so each query's weights over the keys sum to 1. Those weights then mix the value vectors. The code below does it with lists.</p>`,
    code: { lang: 'python', run: true, code: `import math
Q = K = [[1, 0], [0, 1], [1, 1]]
d = 2
S = [[sum(q[t] * k[t] for t in range(d)) / math.sqrt(d) for k in K] for q in Q]
def sm(z):
    m = max(z); e = [math.exp(x - m) for x in z]; s = sum(e)
    return [round(x / s, 3) for x in e]
W = [sm(row) for row in S]
for row in W:
    print(row, "sum =", round(sum(row), 3))` },
    complexity: `<p>O(n²·d) time and O(n²) memory: the reason long contexts are expensive.</p>`,
    followUps: ['Add a causal mask by setting future scores to -inf before softmax', 'Why does memory grow quadratically with context length?']
  }));

  // ===================== QUIZ =====================
  quiz.push({ q: 'What is the dot product of [1,2,3] and [4,5,6]?', options: ['32', '15', '21', '6'], answer: 0, explain: '1×4 + 2×5 + 3×6 = 4 + 10 + 18 = 32.' });
  quiz.push({ q: 'Cosine similarity of two vectors that point in exactly opposite directions is…', options: ['−1', '0', '1', '0.5'], answer: 0, explain: 'cos 180° = −1, exactly opposite directions.' });
  quiz.push({ q: 'Can you multiply a 2×3 matrix by another 2×3 matrix?', options: ['No, inner dimensions 3 and 2 differ', 'Yes, result 2×3', 'Yes, result 3×3', 'Yes, result 2×2'], answer: 0, explain: 'The number of columns of A must equal the rows of B.' });
  quiz.push({ q: 'Shape of (2×3) times (3×2)?', options: ['2×2', '3×3', '2×3', '6×1'], answer: 0, explain: 'Outer dimensions remain.' });
  quiz.push({ q: 'Expected value of a fair six-sided die?', options: ['3.5', '3', '4', '6'], answer: 0, explain: 'Average of 1 to 6: (1+2+3+4+5+6)/6 = 3.5.' });
  quiz.push({ q: 'Why subtract the maximum logit before exponentiating in softmax?', options: ['To avoid overflow without changing the result', 'To make probabilities negative', 'To sort the logits', 'To change the ranking'], answer: 0, explain: 'The shift cancels in the ratio and keeps exp arguments ≤ 0.' });
  quiz.push({ q: 'Raising the softmax temperature makes the distribution…', options: ['flatter (more random)', 'more peaked', 'unchanged', 'negative'], answer: 0, explain: 'Dividing logits by a larger T shrinks the gaps.' });
  quiz.push({ q: 'Shapes (3,1) and (1,4) in a NumPy addition give…', options: ['(3,4)', '(3,1)', '(1,4)', 'an error'], answer: 0, explain: 'Each size-1 axis is stretched to match the other.' });
  quiz.push({ q: 'Shapes (3,4) and (3,) in NumPy:', options: ['error: 4 vs 3', 'result (3,4)', 'result (3,)', 'result (4,3)'], answer: 0, explain: 'Right alignment compares 4 with 3: not equal, neither is 1.' });
  quiz.push({ q: 'For a data matrix X (samples × features), which centres each feature?', options: ['X − X.mean(axis=0)', 'X − X.mean(axis=1)', 'X − X.mean()', 'X.mean(axis=0)'], answer: 0, explain: 'axis=0 gives one mean per column (feature).' });
  quiz.push({ q: '20% of mail is spam; "free" is in 60% of spam and 5% of ham. P(spam | free)?', options: ['0.75', '0.60', '0.20', '0.12'], answer: 0, explain: '0.12 / (0.12 + 0.04) = 0.75.' });
  quiz.push({ q: 'Which pandas call gives average salary per department?', options: ['df.groupby("dept")["salary"].mean()', 'df["salary"].mean("dept")', 'df.mean("dept")', 'df.sort("dept")'], answer: 0, explain: 'Split by dept, then apply mean to salary.' });
  quiz.push({ q: 'You should compute the scaling mean and std from…', options: ['the training data only', 'the test data', 'all data before splitting', 'random numbers'], answer: 0, explain: 'Otherwise information leaks from the test set.' });
  quiz.push({ q: 'axis=0 in a sum over a 2-D array collapses…', options: ['the rows, giving one value per column', 'the columns, one per row', 'nothing', 'the whole array'], answer: 0, explain: 'axis=0 runs down the rows.' });

  // ===================== INTERVIEW =====================
  interview.push({ q: `Explain the dot product and cosine similarity to a non-technical person. When would you pick cosine over Euclidean distance?`, level: 'B',
    a: `<p>The dot product multiplies matching entries of two lists and adds them: it is large when both lists are big in the same places. Cosine similarity divides by both lengths, so it measures only the <b>angle</b>, how aligned the directions are, between −1 and 1. I pick cosine for text and embeddings, where the direction carries meaning and the length mostly reflects things like document size or word frequency. Euclidean distance is better when absolute magnitude matters, such as comparing coordinates or sensor readings. If vectors are normalised to unit length the two rank neighbours identically since |a−b|² = 2 − 2cos. I would also check how the embedding model was trained and use the metric it recommends.</p>`,
    followUps: ['What if one vector is all zeros?', 'Is cosine distance a true metric?', 'Why do vector databases normalise on insert?'] });
  interview.push({ q: `Multiply a 2×3 by a 3×2 matrix by hand and tell me the complexity of the general case.`, level: 'B',
    a: `<p>Each output cell (i,j) is the dot product of row i of A with column j of B. With A=[[1,2,3],[4,5,6]] and B=[[7,8],[9,10],[11,12]] the result is [[58,64],[139,154]]: 1×7+2×9+3×11=58, and so on. The inner dimensions (3 and 3) must match and the result takes the outer dimensions (2×2). The naive algorithm does m·n·p multiplications, O(n³) for square matrices. Asymptotically faster algorithms exist (Strassen about n<sup>2.81</sup>) but practical libraries use tuned cubic algorithms with cache blocking, SIMD and GPU parallelism since every output cell is independent.</p>`,
    followUps: ['Is matrix multiplication commutative?', 'Why is a GPU good at this?', 'What is the shape of Q·Kᵀ in attention?'] });
  interview.push({ q: `Write softmax and explain why a naive version can fail.`, level: 'B',
    a: `<p>softmax(z)_i = exp(z_i) / sum_j exp(z_j). The naive version overflows: exp(1000) is infinity in floating point, so the ratio becomes inf/inf = NaN. Because softmax is invariant to adding a constant to all logits, I subtract the maximum first. The largest exponent is then 0, giving exp(0)=1, so the sum is at least 1 and never overflows; very negative entries underflow harmlessly to 0. With temperature T, divide logits by T before the max subtraction. I would also mention using the log-sum-exp trick when I need log-probabilities for a loss, and checking the axis for batched input.</p>`,
    followUps: ['What happens as T goes to 0 and to infinity?', 'What is the gradient of softmax with cross-entropy?', 'Softmax vs sigmoid?'] });
  interview.push({ q: `A medical test is 99% sensitive with 5% false positives, and the disease affects 1 in 1000. You test positive. What is the chance you are sick?`, level: 'I',
    a: `<p>Use Bayes. P(sick|+) = P(+|sick)P(sick) / [P(+|sick)P(sick) + P(+|healthy)P(healthy)] = 0.99×0.001 / (0.99×0.001 + 0.05×0.999) = 0.00099 / 0.05094 ≈ 1.9%. The base rate is so low that false positives from the huge healthy population outnumber true positives roughly 50 to 1. A good way to explain it is with natural frequencies: of 100,000 people, 100 are sick and 99 test positive, while 99,900 are healthy and about 4,995 test positive; so about 99 of 5,094 positives are truly sick. The same reasoning matters for fraud detection and other rare-event classifiers: accuracy and precision depend on the base rate.</p>`,
    followUps: ['How would a second independent test change it?', 'How does this relate to precision and recall?', 'What if the test errors are correlated?'] });
  interview.push({ q: `What is broadcasting in NumPy? Give the rule and a bug it can cause.`, level: 'I',
    a: `<p>Broadcasting lets arrays of different shapes be combined elementwise. Align shapes from the right; each pair of sizes must be equal or one must be 1; missing leading axes count as 1; size-1 axes are stretched virtually (stride 0, no copy). Example: (3,4) + (4,) works and (3,1) + (1,4) gives (3,4). A classic bug: y_pred of shape (100,) minus y_true of shape (100,1) silently broadcasts to (100,100), so the loss is computed over 10,000 meaningless pairs with no error. I protect against it by asserting shapes, using explicit reshape or keepdims, and testing against a small loop version.</p>`,
    followUps: ['How much memory can an accidental broadcast use?', 'What does keepdims do?', 'How do you compute all pairwise distances with broadcasting?'] });
  interview.push({ q: `Why do we normalise features, and which statistics should you use on the test set?`, level: 'I',
    a: `<p>Features on different scales (age 0-100, salary in lakhs) distort distance-based models such as k-NN and k-means, slow gradient descent because the loss surface becomes elongated, and make regularisation unfair across features. Tree models mostly do not care. Common choices are z-score ((x−mean)/std) and min-max. The statistics must be learned on the training set only and then applied unchanged to validation, test and production data. Computing them on the whole dataset before splitting leaks test information and inflates metrics. I also guard against zero std and consider robust scaling (median and IQR) if there are outliers.</p>`,
    followUps: ['Do decision trees need scaling?', 'What about new categories at inference time?', 'Population vs sample std?'] });
  interview.push({ q: `Implement a group-by average in pure Python and relate it to pandas and SQL.`, level: 'B',
    a: `<p>One pass with a dict from key to [sum, count], then divide: acc.setdefault(k, [0,0]) then add and count; the result is {k: s/c}. It is the split-apply-combine pattern. pandas does the same with <code>df.groupby("k")["v"].mean()</code> and SQL with <code>SELECT k, AVG(v) FROM t GROUP BY k</code>. Complexity is O(N) time and O(K) space for K groups. Points to mention: NaN handling (pandas skips NaN in mean; count vs size), grouping by multiple keys using tuples, and that dropping the dict approach in favour of rescanning per key would be O(N·K).</p>`,
    followUps: ['How would you do top-N per group?', 'What if the data does not fit in memory?', 'How does HAVING differ from WHERE?'] });
  interview.push({ q: `What does temperature do when sampling from an LLM, and how do you choose it?`, level: 'I',
    a: `<p>The model outputs logits over the vocabulary; temperature divides them before softmax. T below 1 sharpens the distribution (more deterministic, repeating the likeliest token), T near 0 is greedy decoding, T above 1 flattens it (more diverse but more errors and nonsense). I use low values (0-0.3) for code generation, extraction, classification and factual Q&A, and moderate values (0.7-1.0) for creative writing or brainstorming. It is usually combined with top-p or top-k to cut off the unreliable long tail. Temperature does not make a model more or less knowledgeable; it only changes how it samples from its beliefs. Even T=0 can be slightly non-deterministic on GPUs.</p>`,
    followUps: ['Explain top-p versus top-k.', 'Why would you still set a seed?', 'How can temperature affect hallucinations?'] });
  interview.push({ q: `Explain expected value and variance, and why the average of many samples converges.`, level: 'B',
    a: `<p>Expected value is the probability-weighted average of outcomes, the long-run mean; variance is the expected squared distance from that mean and the standard deviation is its square root, in the original units. The law of large numbers says the sample mean approaches the expected value as the sample grows, and the standard error shrinks as σ/√n, so 4× the data halves the error. The central limit theorem adds that sample means are approximately normal. For a die, the mean is 3.5 and the variance 35/12 ≈ 2.92. This is why you need enough test examples before trusting an accuracy figure: a 100-example test has roughly a 5 percentage point standard error.</p>`,
    followUps: ['Why n−1 for sample variance?', 'What if the distribution has infinite variance?', 'How big should an evaluation set be?'] });
  interview.push({ q: `Walk through shapes in a linear layer and in attention scoring.`, level: 'I',
    a: `<p>Linear layer: input X (batch, d_in) times W (d_in, d_out) plus bias (d_out,) gives (batch, d_out); the bias broadcasts across the batch. Attention: Q (n, d), K (n, d); scores = Q Kᵀ gives (n, n), entry (i,j) is the match between query i and key j. Divide by √d to keep the scale stable, apply softmax over the last axis so each row sums to 1, optionally add a causal mask first, then multiply by V (n, d_v) to get (n, d_v). The n×n matrix is why compute and memory grow quadratically with context length. In practice I annotate shapes in comments and assert them during debugging.</p>`,
    followUps: ['What does the causal mask do?', 'How do multiple heads change the shapes?', 'How does FlashAttention avoid storing the n×n matrix?'] });
  interview.push({ q: `How do you handle missing values, and what are the pitfalls?`, level: 'I',
    a: `<p>First understand why data is missing (random, systematic, or meaningful). Options: drop rows or columns when few are affected; fill with a constant, mean (sensitive to outliers) or median; use group-wise fills (median per category); model-based imputation; and add an indicator column "was_missing" because missingness can be predictive. Pitfalls: computing fill values on the full dataset before splitting (leakage), filling the target label, hiding that a large fraction is missing, and treating sentinel values like -1 or 9999 as real numbers. In pandas I check <code>df.isna().mean()</code> and keep fitted fill values to reuse at inference.</p>`,
    followUps: ['What is MCAR/MAR/MNAR?', 'When is dropping better than filling?', 'How does XGBoost treat missing values?'] });
  interview.push({ q: `How would you use an AI assistant to help with NumPy/pandas code, and how do you check its output?`, level: 'E',
    a: `<p>I give it a clear spec: input shapes and dtypes, a tiny sample, the expected output, and constraints such as "no loops, no chained assignment". I ask for shape comments on each line and edge cases (empty input, NaN, constant column, duplicate keys). I then verify rather than trust: run it on the tiny example, compare against a slow pure-Python reference implementation, assert shapes and row counts, check that aggregates match a hand calculation, and look for typical AI mistakes such as the wrong axis, silent broadcasting, population-versus-sample std, leakage from fitting on all data, and invented column names or API arguments. I never paste private data, only schemas or synthetic rows, and follow company policy. The assistant speeds up the typing; I remain responsible for correctness.</p>`,
    followUps: ['What tests would you add?', 'What data is unsafe to share with an AI tool?', 'When would you refuse to use generated code?'] });

  registerModule({
    id: 'ai03',
    title: 'Math & Python for AI',
    lang: 'python',
    intro: `<p>Every AI system, from a spam filter to a large language model, is built from a few simple maths ideas run on lots of data: <b>lists of numbers (vectors)</b>, <b>tables of numbers (matrices)</b>, <b>chance (probability)</b>, and a way to turn scores into chances (<b>softmax</b>). You will meet each idea with an everyday analogy, calculate it by hand, then run it in plain Python, then see the NumPy and pandas versions that professionals use. By the end you can read model code without fear and spot the shape and axis mistakes that AI assistants love to make.</p>`,
    goals: [
      'Compute dot products, norms and cosine similarity by hand and in code, and explain why embeddings use them',
      'Multiply matrices cell by cell, check shapes, and trace shapes through a neural layer and attention',
      'Compute expected value, variance and a Bayes update (spam filter) and sample from a normal distribution',
      'Write a numerically stable softmax with temperature and explain its effect on LLM sampling',
      'Apply NumPy broadcasting rules and normalise features without leaking test data',
      'Clean data and do split-apply-combine group-by in both pandas and pure Python'
    ],
    prereqs: `Basic Python (variables, loops, lists, dicts, functions) and school arithmetic. Helpful: AI module 1 (AI, ML, Deep Learning & GenAI in Plain English).`,
    hours: 12,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
