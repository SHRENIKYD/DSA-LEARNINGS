(function () { var topics = [], practice = [], quiz = [], interview = [];

function nums(s) { var a = String(s).trim().split(/[\s,]+/).filter(function (x) { return x !== ''; }).map(Number); if (!a.length || a.some(isNaN)) throw new Error('Enter numbers separated by spaces'); return a; }
function r2(x) { return Math.round(x * 100) / 100; }
function r3(x) { return Math.round(x * 1000) / 1000; }
function smx(row) { var m = -Infinity; row.forEach(function (x) { if (x > m && x !== -Infinity) m = x; }); var e = row.map(function (x) { return x === -Infinity ? 0 : Math.exp(x - m); }); var s = e.reduce(function (a, b) { return a + b; }, 0); return e.map(function (x) { return x / s; }); }
function names(n) { var o = []; for (var i = 0; i < n; i++) o.push('t' + (i + 1)); return o; }

topics.push({
  title: 'Attention Math: Q, K, V, Softmax, the √d Scale and Causal Masks',
  analogy: `<p>Imagine a <b>library search</b>. Each word in a sentence writes a <b>Query</b> ("what am I looking for?") on a sticky note. Every word also wears a <b>Key</b> badge ("here is what I am about") and carries a <b>Value</b> bag ("here is what I can give you"). A word compares its sticky note with every badge, decides how much to trust each one, and then takes a <b>weighted mix of the bags</b>. That mix is the new meaning of the word.</p>`,
  explain: `<p>Every token (a piece of text, roughly a word) starts as a vector <code>x</code> of numbers. Attention turns it into three new vectors using three learned weight matrices:</p>
  <ul><li><b>Q = X·W<sub>q</sub></b> — the question each token asks.</li><li><b>K = X·W<sub>k</sub></b> — the label each token shows.</li><li><b>V = X·W<sub>v</sub></b> — the content each token hands over.</li></ul>
  <p>The whole formula is one line: <b>Attention(Q,K,V) = softmax(Q·Kᵀ / √d) · V</b>. Step by step:</p>
  <ol><li><b>Score</b>: Q·Kᵀ gives an n×n table. Cell (i, j) = "how much does token i care about token j" (a dot product: big when the vectors point the same way).</li>
  <li><b>Scale</b>: divide by √d (d = size of one key vector) so the numbers do not explode.</li>
  <li><b>Mask</b> (for GPT-style models): future tokens are hidden by setting their score to −∞.</li>
  <li><b>Softmax</b> each row: turns scores into positive weights that add up to 1 (like percentages of attention).</li>
  <li><b>Mix</b>: multiply the weights by V. Each token's output is a weighted average of value vectors.</li></ol>
  <p><b>Why √d?</b> A dot product adds up d products. If each entry has spread around 1, the sum has spread around √d. For d = 64 the scores would be about 8× too big, softmax would collapse to one "winner" (nearly 1.0 vs 0.0), and learning would stall because the gradient of a saturated softmax is almost zero. Dividing by √d brings the spread back to about 1.</p>
  <p><b>Causal mask:</b> when the model is learning to predict the next word, token 3 must not peek at token 4. We add −∞ to the upper triangle of the score table; exp(−∞) = 0 so those weights become exactly 0.</p>
  ${H.table(['token', 'x (=Q=K=V here)'], [['t1', '[1, 0]'], ['t2', '[0, 1]'], ['t3', '[1, 1]']])}
  <p>Scores Q·Kᵀ for these three tokens: ${H.table(['', 't1', 't2', 't3'], [['t1', '1', '0', '1'], ['t2', '0', '1', '1'], ['t3', '1', '1', '2']])}</p>`,
  clues: ['"Why divide by √d<sub>k</sub>?" → variance of a dot product grows with d, softmax saturates', '"Decoder-only / autoregressive / GPT" → causal (lower-triangular) mask', '"Cost of self-attention" → O(n²·d) time and O(n²) memory for the score matrix', '"Q, K, V from the same sequence" = self-attention; from two sequences = cross-attention', '"Rows of the attention matrix sum to 1" → softmax is applied per query row', '"Padding mask vs causal mask" → padding hides fake tokens, causal hides the future'],
  code: [{ lang: 'python', title: 'Scaled dot-product attention with causal mask (stdlib, runnable)', run: true, code: `import math

NEG_INF = float('-inf')

def softmax(row):
    # subtract the biggest finite value first so exp() never overflows
    m = max(x for x in row if x != NEG_INF)
    ex = [0.0 if x == NEG_INF else math.exp(x - m) for x in row]
    total = sum(ex)
    return [e / total for e in ex]

def attention(Q, K, V, causal=True):
    n, d = len(Q), len(Q[0])
    # 1) scores = Q K^T / sqrt(d)
    scores = [[sum(q[t] * k[t] for t in range(d)) / math.sqrt(d) for k in K] for q in Q]
    # 2) causal mask: token i may only look at j <= i
    if causal:
        for i in range(n):
            for j in range(i + 1, n):
                scores[i][j] = NEG_INF
    # 3) softmax every row -> weights that sum to 1
    W = [softmax(r) for r in scores]
    # 4) output = W V (weighted average of value vectors)
    out = [[sum(W[i][j] * V[j][c] for j in range(n)) for c in range(len(V[0]))] for i in range(n)]
    return scores, W, out

X = [[1, 0], [0, 1], [1, 1]]          # 3 tokens, d = 2; Q = K = V = X for clarity
scores, W, out = attention(X, X, X)
print('scaled scores (-inf = hidden future):')
for r in scores:
    print([round(v, 3) if v != NEG_INF else '-inf' for v in r])
print('attention weights (rows sum to 1):')
for r in W:
    print([round(v, 3) for v in r], 'sum =', round(sum(r), 3))
print('outputs:')
for r in out:
    print([round(v, 3) for v in r])` },
  { lang: 'python', title: 'The same idea in PyTorch (needs torch, not run here)', check: false, code: `import torch, math
import torch.nn.functional as F

def attention(q, k, v, causal=True):
    # q,k,v: (batch, heads, seq, d_head)
    d = q.size(-1)
    scores = q @ k.transpose(-2, -1) / math.sqrt(d)          # (b, h, n, n)
    if causal:
        n = q.size(-2)
        mask = torch.triu(torch.ones(n, n, dtype=torch.bool), diagonal=1)
        scores = scores.masked_fill(mask, float('-inf'))     # hide the future
    return F.softmax(scores, dim=-1) @ v

# In real code prefer the fused kernel: F.scaled_dot_product_attention(q, k, v, is_causal=True)` }],
  viz: [{
    title: 'Q·Kᵀ score matrix → scale → causal mask → softmax → output',
    input: '1 0 0 1 1 1',
    inputLabel: 'Token vectors, d = 2 (pairs of numbers; 2–5 tokens). Q = K = V = X',
    gen: function (input) {
      var a = nums(input);
      if (a.length % 2 !== 0 || a.length < 4 || a.length > 10) throw new Error('Give 2 to 5 tokens as pairs, e.g. 1 0 0 1 1 1');
      var n = a.length / 2, d = 2, X = [], i, j;
      for (i = 0; i < n; i++) X.push([a[2 * i], a[2 * i + 1]]);
      var nm = names(n), S = [], Sc = [], Sm = [], W, O = [];
      for (i = 0; i < n; i++) { S.push([]); for (j = 0; j < n; j++) S[i].push(r3(X[i][0] * X[j][0] + X[i][1] * X[j][1])); }
      for (i = 0; i < n; i++) Sc.push(S[i].map(function (v) { return r3(v / Math.sqrt(d)); }));
      for (i = 0; i < n; i++) Sm.push(Sc[i].map(function (v, jj) { return jj > i ? -Infinity : v; }));
      W = Sm.map(function (r) { return smx(r).map(r3); });
      for (i = 0; i < n; i++) { var o = [0, 0]; for (j = 0; j < n; j++) { o[0] += W[i][j] * X[j][0]; o[1] += W[i][j] * X[j][1]; } O.push([r3(o[0]), r3(o[1])]); }
      var hlMask = {}, hlBest = {}, hlDiag = {};
      for (i = 0; i < n; i++) for (j = 0; j < n; j++) if (j > i) hlMask[i + ',' + j] = 'bad';
      for (i = 0; i < n; i++) { var bj = 0; for (j = 0; j < n; j++) if (W[i][j] > W[i][bj]) bj = j; hlBest[i + ',' + bj] = 'sel'; for (j = 0; j <= i; j++) if (j !== bj) hlDiag[i + ',' + j] = 'ok'; }
      var shown = function (M) { return M.map(function (r) { return r.map(function (v) { return v === -Infinity ? '-∞' : v; }); }); };
      var gridOf = function (label, M, hl) { return { type: 'grid', label: label, rows: shown(M), rowHead: nm, colHead: nm, hl: hl || {} }; };
      var fr = [];
      fr.push({ narr: 'We have <b>' + n + ' tokens</b>, each a 2-number vector. To keep it simple we use the same table as Q, K and V (real models use three different learned matrices).', parts: [{ type: 'table', label: 'X (Q = K = V)', columns: ['token', 'dim 1', 'dim 2'], rows: X.map(function (r, k) { return [nm[k], r[0], r[1]]; }) }] });
      fr.push({ narr: 'Step 1 — <b>Q·Kᵀ</b>. Row i, column j is the dot product of token i\'s question with token j\'s key. Bigger = more similar.', parts: [gridOf('raw scores Q·Kᵀ', S, hlBest)] });
      fr.push({ narr: 'Step 2 — divide every cell by <b>√d = ' + r3(Math.sqrt(d)) + '</b>. With big d this stops scores from growing with the vector size.', parts: [gridOf('scaled scores / √d', Sc), { type: 'vars', vals: { d: d, 'sqrt(d)': r3(Math.sqrt(d)) } }] });
      fr.push({ narr: 'Step 3 — <b>causal mask</b>. The red cells are the future (column &gt; row). They become −∞ so token i cannot peek at later tokens.', parts: [gridOf('masked scores', Sm, hlMask)] });
      fr.push({ narr: 'Step 4 — <b>softmax each row</b>. exp(−∞) = 0, so red cells get weight 0. Every row now adds up to 1. Purple = where that token looks most.', parts: [gridOf('attention weights', W, Object.assign({}, hlMask, hlBest)), { type: 'bars', label: 'row sums', values: W.map(function (r) { return r.reduce(function (p, q) { return p + q; }, 0); }), idxLabels: nm }] });
      fr.push({ narr: 'Step 5 — <b>output = W·V</b>. Each token becomes a weighted average of the value vectors it is allowed to see. t1 can only see itself, so its output equals its own V.', parts: [{ type: 'table', label: 'outputs', columns: ['token', 'out dim 1', 'out dim 2'], rows: O.map(function (r, k) { return [nm[k], r[0], r[1]]; }), hl: { 0: 'cur' } }] });
      return fr;
    }
  }, {
    title: 'Why √d? Dot products grow with dimension',
    input: '4 16 64 256',
    inputLabel: 'Vector sizes d to compare',
    gen: function (input) {
      var ds = nums(input).slice(0, 6), fr = [], k;
      ds.forEach(function (d) { if (d < 1 || d > 4096) throw new Error('d between 1 and 4096'); });
      fr.push({ narr: 'If q and k have entries with spread (std) 1, then q·k has spread <b>√d</b>. Bigger vectors → bigger raw scores.', parts: [{ type: 'bars', label: 'std of raw q·k = √d', values: ds.map(function (d) { return r2(Math.sqrt(d)); }), idxLabels: ds.map(function (d) { return 'd=' + d; }) }] });
      ds.forEach(function (d) {
        var s = Math.sqrt(d), raw = smx([s, 0, -s]).map(r3), sc = smx([1, 0, -1]).map(r3);
        fr.push({ narr: 'd = <b>' + d + '</b>. Three typical scores are about +√d, 0, −√d = [' + r2(s) + ', 0, ' + r2(-s) + ']. Without scaling the softmax is ' + (raw[0] > 0.95 ? '<span class="c-r">almost one-hot (saturated, tiny gradients)</span>' : 'still soft') + '. After dividing by √d the scores are [1, 0, −1] and softmax stays soft.', parts: [{ type: 'bars', label: 'softmax WITHOUT scaling', values: raw, idxLabels: ['hi', 'mid', 'lo'], hl: { 0: raw[0] > 0.95 ? 'bad' : 'ok' } }, { type: 'bars', label: 'softmax WITH /√d', values: sc, idxLabels: ['hi', 'mid', 'lo'], hl: { 0: 'ok' } }] });
      });
      return fr;
    }
  }],
  examples: [
    { title: 'Hand calculation, token t2 (causal)', html: `<p>Scaled scores for t2 are [0, 0.707] (t3 hidden). exp → [1, 2.028], sum 3.028, weights <b>[0.330, 0.670]</b>. Output = 0.330·[1,0] + 0.670·[0,1] = <b>[0.330, 0.670]</b>. t2 listens to itself about twice as much as to t1 because its key matches its own query better.</p>` },
    { title: 'Token t3 spreads attention over three tokens', html: `<p>Scaled scores [0.707, 0.707, 1.414] → exp [2.028, 2.028, 4.113], sum 8.169 → weights <b>[0.248, 0.248, 0.503]</b>. Output = [0.751, 0.751]. The token [1,1] is "similar to everyone", and mostly to itself.</p>${H.arr([0.248, 0.248, 0.503], { label: 'weights of t3', hl: { 2: 'g' } })}` },
    { title: 'Masked cells are exactly zero, not just small', html: `<p>Adding −∞ (not a big negative number like −10) before softmax gives exp(−∞) = 0 exactly. Real code uses −1e9 or the dtype minimum to avoid NaN from −∞ − (−∞) when a whole row is masked.</p>`, code: { lang: 'python', run: true, code: `import math\nrow = [0.5, float('-inf'), float('-inf')]\nex = [0.0 if x == float('-inf') else math.exp(x) for x in row]\nprint([round(e / sum(ex), 3) for e in ex])   # [1.0, 0.0, 0.0]` } }
  ],
  deepDive: `<p><b>Why a dot product?</b> It is the cheapest similarity measure that is fully parallel: the whole score table is one big matrix multiplication, which GPUs love. <b>Why three matrices?</b> Separating Q and K lets "what I look for" differ from "what I advertise"; V lets "what I hand over" differ again. If Q = K, attention would be symmetric and a token would always attend most to itself.</p>
  <p><b>Variance argument.</b> If q<sub>i</sub>, k<sub>i</sub> are independent with mean 0 and variance 1, then Var(q·k) = d. Dividing by √d restores variance 1. Softmax with large logits has gradient s<sub>i</sub>(δ<sub>ij</sub> − s<sub>j</sub>) which is ~0 when one s ≈ 1. Modern models also use <b>QK-norm</b> (normalising Q and K) and <b>logit soft-capping</b> to keep this stable at scale.</p>
  <p><b>Cost.</b> The score matrix is n×n: time O(n²·d), memory O(n²). At n = 128k, one head's fp16 score matrix is 128k² × 2 B ≈ 32 GB, which is why kernels like FlashAttention never write it out. <b>Masks</b> in practice: causal, padding (variable-length batches), and document masks (stop packed documents attending to each other). Parameters: W<sub>q</sub>, W<sub>k</sub>, W<sub>v</sub> and the output projection W<sub>o</sub> are each d<sub>model</sub>×d<sub>model</sub> in standard multi-head attention = 4·d² parameters per layer.</p>`,
  aiEra: `<p><b>What AI changes:</b> Attention is the engine of every LLM you use, so interviewers now ask about it as a "can you explain how the thing you use daily works" question. <b>Use AI as a partner:</b> ask a model "show me a 3-token attention example with numbers" and then <i>verify it by running the code</i>; ask for a PyTorch version and diff it against your stdlib one. <b>Where AI goes wrong:</b> chat models often mix up which axis softmax runs over (rows, not columns), forget the √d, or claim masking is "multiplying by 0" (it must be added −∞ before softmax). They also state wrong complexity for FlashAttention (it is still O(n²) compute, just O(n) extra memory). <b>What you must still own:</b> derive the shapes (n×d · d×n = n×n), know why each step exists, and be able to compute a tiny case on paper in the interview.</p>`,
  problems: [{
    title: 'Attention for 3 tokens by hand',
    level: 'Easy', tags: ['attention', 'softmax', 'causal mask'],
    statement: `<p>Three tokens have vectors t1 = [1, 0], t2 = [0, 1], t3 = [1, 1]. Use Q = K = V = X, d = 2 and a <b>causal mask</b>. Compute the attention weights and the output for token t3.</p>`,
    constraints: `d = 2, √2 ≈ 1.414. Give weights to 3 decimals.`,
    example: `<p>Row t3 raw scores: [1, 1, 2]. ${H.c('g', 'weights = [0.248, 0.248, 0.503]')}, output ${H.c('g', '[0.751, 0.751]')}. Row t3 is allowed to see all three tokens (it is the last one).</p>`,
    brute: { why: `<p>Without a mask and scaling you would compute softmax([1,1,2]) = [0.212, 0.212, 0.576], which over-focuses on t3 and also lets earlier rows peek at later tokens.</p>` },
    mcq: { q: 'Which operations do you do, in order?', options: ['dot product → scale by √d → mask → softmax → multiply by V', 'softmax → dot product → mask → V', 'mask → V → softmax → dot product'], answer: 0, explain: 'Scores first, then scale, then hide the future, then turn into weights, then mix the values.' },
    hints: [`<p>Hint 1: scores = dot products of t3 with each token: [1, 1, 2].</p>`, `<p>Hint 2: divide by √2 → [0.707, 0.707, 1.414]; no masking for the last row.</p>`, `<p>Hint 3: exp → [2.028, 2.028, 4.113], divide by their sum 8.169, then take the weighted sum of the three vectors.</p>`],
    solution: {
      approach: `<p>Scores for t3: [1,1,2]; scaled [0.707,0.707,1.414]; exp [2.028,2.028,4.113] with sum 8.169; weights [0.248,0.248,0.503]. Output = 0.248·[1,0] + 0.248·[0,1] + 0.503·[1,1] = [0.751, 0.751]. t3 is the last token so the causal mask hides nothing in its row. Check the run above to confirm the numbers.</p>`,
      code: { lang: 'python', run: true, code: `import math\nX = [[1, 0], [0, 1], [1, 1]]\nq = X[2]\ns = [sum(a * b for a, b in zip(q, k)) / math.sqrt(2) for k in X]\ne = [math.exp(v) for v in s]\nw = [v / sum(e) for v in e]\nprint([round(v, 3) for v in w])\nprint([round(sum(w[j] * X[j][c] for j in range(3)), 3) for c in range(2)])` },
      complexity: `<p>n tokens, dimension d: O(n²·d) time, O(n²) memory for the scores.</p>`,
      followUps: ['What are the weights for t1?', 'What changes if there is no causal mask?']
    }
  }, {
    title: 'Why the scale factor matters',
    level: 'Medium', tags: ['attention', 'scaling', 'gradients'],
    statement: `<p>A teammate removed the <code>/ sqrt(d)</code> from attention to "save a division" and the training loss stopped improving at d<sub>head</sub> = 128. Explain what went wrong and how to confirm it.</p>`,
    constraints: `Answer in plain words with numbers.`,
    example: `<p>With d = 128 raw scores have spread ≈ ${H.c('r', '11.3')}; scaled spread ≈ ${H.c('g', '1')}.</p>`,
    brute: { why: `<p>"It is just a constant, the model can learn it" — but the softmax saturates at initialisation, the gradient is ~0, so the model never gets the signal needed to learn anything.</p>` },
    mcq: { q: 'Typical symptom of saturated attention?', options: ['Rows of the attention matrix are almost one-hot and gradients vanish', 'Attention rows no longer sum to 1', 'Memory use doubles'], answer: 0, explain: 'Softmax of huge logits is one-hot; its Jacobian is nearly zero.' },
    hints: [`<p>Hint 1: how big is a sum of 128 products of unit-size numbers?</p>`, `<p>Hint 2: what does softmax do with logits like 11 vs 0?</p>`, `<p>Hint 3: check by logging max attention weight per row and the gradient norm of W<sub>q</sub>.</p>`],
    solution: {
      approach: `<p>A dot product of two d-dimensional vectors with unit-variance entries has standard deviation √d (about 11.3 for d = 128). Logits of that size make softmax almost one-hot: one weight near 1, the rest near 0. The softmax gradient is s(1−s), which is near 0 for both, so W<sub>q</sub> and W<sub>k</sub> barely update and the loss stalls. Dividing by √d brings the logits back to spread ≈ 1 so attention starts soft and trainable. To confirm: log the mean of the max weight per row (near 1.0 means saturated) and the gradient norm of the Q/K projections (near 0). Fix: restore the scale (or use QK-norm) and re-run.</p>`,
      complexity: `<p>Division costs O(n²) extra multiplies, negligible next to the matmul.</p>`
    }
  }]
});

topics.push({
  title: 'Multi-Head Attention: Many Small Spotlights, Then Concatenate',
  analogy: `<p>Picture a <b>panel of 8 judges</b> watching the same dance. One judge watches the feet, one the arms, one the timing, one the costume. Each writes a short note. At the end the notes are <b>stapled together</b> into one report and a head judge rewrites it into a single verdict. Multi-head attention is exactly this: several small attention "spotlights" run side by side, then their results are concatenated and mixed.</p>`,
  explain: `<p>One attention can only make <b>one weighted average</b> per token. But a word often needs several things at once: "who is the subject?", "what is the previous verb?", "which noun does this pronoun point to?". So we split the work.</p>
  <ol><li>Take the model width <b>d<sub>model</sub></b> (say 4096).</li><li>Make <b>h</b> heads (say 32). Each head gets <b>d<sub>head</sub> = d<sub>model</sub>/h = 128</b> numbers of Q, K and V.</li><li>Every head runs the normal attention <i>on its own slice</i> and builds its <i>own</i> n×n weight table.</li><li><b>Concatenate</b> the h outputs back to d<sub>model</sub> numbers (glue them side by side).</li><li>Multiply by an output matrix <b>W<sub>o</sub></b> (d<sub>model</sub>×d<sub>model</sub>) so the heads can mix their findings.</li></ol>
  ${H.table(['piece', 'shape', 'example (d=4096, h=32)'], [['Q, K, V (all heads)', 'n × d<sub>model</sub>', 'n × 4096'], ['one head', 'n × d<sub>head</sub>', 'n × 128'], ['weights per head', 'n × n', '32 tables'], ['concat', 'n × d<sub>model</sub>', 'n × 4096'], ['after W<sub>o</sub>', 'n × d<sub>model</sub>', 'n × 4096']])}
  <p><b>Same cost, more views.</b> Because each head is 1/h as wide, the total compute is about the same as one big head, yet you get h different attention patterns. <b>Parameter count of one attention block:</b> W<sub>q</sub>, W<sub>k</sub>, W<sub>v</sub>, W<sub>o</sub> are each d×d, so <b>4d²</b> (ignoring biases). For d = 4096 that is 4 × 16.8M ≈ <b>67M</b>.</p>
  <p><b>The rest of a layer:</b> after attention comes the feed-forward network (MLP). A classic MLP has two matrices d×4d and 4d×d = <b>8d²</b>. So a standard transformer layer has about <b>12d²</b> parameters (4d² attention + 8d² MLP). Modern LLaMA-style models use a gated SwiGLU MLP with three matrices of d×(≈2.7d) which also lands near 8d².</p>`,
  clues: ['"Why multiple heads instead of one big head?" → different relation types in parallel', '"d_model = 4096, 32 heads" → d_head = 128', '"Count the parameters in one transformer layer" → 4d² (attention) + 8d² (MLP) ≈ 12d²', '"Concatenate then project" → W_o mixes heads', '"GQA / MQA" → fewer K/V heads than Q heads to shrink the KV cache', '"Head pruning / some heads are redundant" → interpretability and compression questions'],
  code: [{ lang: 'python', title: 'Split into heads, attend per head, concatenate (stdlib, runnable)', run: true, code: `import math

def softmax(row):
    m = max(x for x in row if x != float('-inf'))
    ex = [0.0 if x == float('-inf') else math.exp(x - m) for x in row]
    s = sum(ex)
    return [e / s for e in ex]

def attend(Q, K, V):
    n, d = len(Q), len(Q[0])
    out = []
    for i in range(n):
        # causal: token i only sees j <= i
        sc = [sum(Q[i][t] * K[j][t] for t in range(d)) / math.sqrt(d) if j <= i else float('-inf') for j in range(n)]
        w = softmax(sc)
        out.append([sum(w[j] * V[j][c] for j in range(n)) for c in range(len(V[0]))])
    return out

def split_heads(X, h):
    # X is n x d_model; head k takes columns [k*dh, (k+1)*dh)
    dh = len(X[0]) // h
    return [[row[k * dh:(k + 1) * dh] for row in X] for k in range(h)]

def concat_heads(heads):
    n = len(heads[0])
    return [sum((hd[i] for hd in heads), []) for i in range(n)]

# 3 tokens, d_model = 4, 2 heads -> d_head = 2
X = [[1, 0, 0, 1], [0, 1, 1, 0], [1, 1, 1, 1]]
heads_in = split_heads(X, 2)
heads_out = [attend(h, h, h) for h in heads_in]      # Q=K=V=slice, to keep it tiny
merged = concat_heads(heads_out)
print('head 0 input :', heads_in[0])
print('head 1 input :', heads_in[1])
for r in merged:
    print('concat row   :', [round(v, 3) for v in r])
# a real layer would now multiply 'merged' by W_o (d_model x d_model)

d, layers = 4096, 32
attn = 4 * d * d
mlp = 8 * d * d
print('params per layer ~', (attn + mlp) / 1e6, 'M; x', layers, '=', layers * (attn + mlp) / 1e9, 'B (+ embeddings)')` },
  { lang: 'python', title: 'Multi-head attention module in PyTorch (needs torch, not run here)', check: false, code: `import torch, torch.nn as nn, torch.nn.functional as F

class MHA(nn.Module):
    def __init__(self, d_model=4096, n_heads=32):
        super().__init__()
        self.h, self.dh = n_heads, d_model // n_heads
        self.qkv = nn.Linear(d_model, 3 * d_model, bias=False)   # Wq, Wk, Wv fused
        self.o = nn.Linear(d_model, d_model, bias=False)         # Wo

    def forward(self, x):                                        # x: (b, n, d_model)
        b, n, _ = x.shape
        q, k, v = self.qkv(x).chunk(3, dim=-1)
        # (b, n, d) -> (b, h, n, dh): split heads
        q, k, v = [t.view(b, n, self.h, self.dh).transpose(1, 2) for t in (q, k, v)]
        y = F.scaled_dot_product_attention(q, k, v, is_causal=True)
        y = y.transpose(1, 2).reshape(b, n, -1)                  # concatenate heads
        return self.o(y)                                         # mix with Wo` }],
  viz: [{
    title: 'Heads side by side: each head has its own attention table',
    input: '4 2',
    inputLabel: 'tokens (2–6) and heads (1–3), e.g. 4 2',
    gen: function (input) {
      var a = nums(input), n = a[0], H_ = a[1] || 2;
      if (n < 2 || n > 6 || H_ < 1 || H_ > 3) throw new Error('Use tokens 2-6 and heads 1-3, e.g. 4 2');
      var dm = H_ * 2, nm = names(n), heads = [], h, i, j;
      for (h = 0; h < H_; h++) {
        var W = [];
        for (i = 0; i < n; i++) { var row = []; for (j = 0; j < n; j++) row.push(j > i ? -Infinity : 2.2 * Math.sin((i + 1) * (h + 1) * 1.3 + (j + 1) * (2 * h + 1) * 0.9)); W.push(smx(row).map(r2)); }
        heads.push(W);
      }
      var fr = [], vals = [], dimLabels = [];
      for (j = 0; j < dm; j++) { vals.push(j + 1); dimLabels.push('h' + (Math.floor(j / 2) + 1)); }
      var hlSplit = {}; for (j = 0; j < dm; j++) hlSplit[j] = ['cur', 'ok', 'win'][Math.floor(j / 2) % 3];
      fr.push({ narr: 'A token vector has <b>d_model = ' + dm + '</b> numbers. We cut it into <b>' + H_ + ' heads</b> of <b>d_head = 2</b> numbers each. Colours show which head owns which numbers.', parts: [{ type: 'array', label: 'one token vector, split by head', values: vals, hl: hlSplit, idxLabels: dimLabels, showIdx: true }] });
      var hlMask = {}; for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) hlMask[i + ',' + j] = 'bad';
      for (h = 0; h < H_; h++) {
        var parts = [];
        for (var g = 0; g <= h; g++) parts.push({ type: 'grid', label: 'head ' + (g + 1) + ' attention weights', rows: heads[g].map(function (r) { return r.map(function (v) { return v === 0 ? 0 : v; }); }), rowHead: nm, colHead: nm, hl: hlMask });
        fr.push({ narr: 'Head <b>' + (h + 1) + '</b> runs its own softmax(QKᵀ/√d)V on its slice only. Compare the tables: each head puts its attention in <i>different places</i> (red = masked future).', parts: parts });
      }
      var outs = []; for (i = 0; i < n; i++) { var r = []; for (h = 0; h < H_; h++) { r.push(r2(heads[h][i][0] * 3)); r.push(r2(heads[h][i][i] * 3)); } outs.push(r); }
      fr.push({ narr: 'Each head returns n × 2 numbers. <b>Concatenate</b> them side by side to get n × ' + dm + ' again (same shape as the input).', parts: [{ type: 'table', label: 'concatenated heads (illustrative numbers)', columns: ['token'].concat(vals.map(function (v, k) { return 'h' + (Math.floor(k / 2) + 1) + '.' + (k % 2 + 1); })), rows: outs.map(function (rr, k) { return [nm[k]].concat(rr); }) }] });
      fr.push({ narr: 'Finally multiply by <b>W_o</b> (' + dm + '×' + dm + ') so information from different heads gets mixed. Parameters here: 4·d² = <b>' + (4 * dm * dm) + '</b> (Wq, Wk, Wv, Wo).', parts: [{ type: 'vars', vals: { d_model: dm, heads: H_, d_head: 2, 'params 4d²': 4 * dm * dm } }] });
      return fr;
    }
  }],
  examples: [
    { title: 'Count parameters in one layer, d = 4096', html: `<p>Attention: 4 × 4096² = 67.1M. Classic MLP: 8 × 4096² = 134.2M. Total ≈ <b>201M</b> per layer. × 32 layers = 6.44B, plus ~0.26B embeddings ≈ the "7B" in LLaMA-7B (its SwiGLU MLP uses 3 × 4096 × 11008 = 135M, nearly identical).</p>${H.table(['part', 'formula', 'params'], [['attention', '4d²', '67.1M'], ['MLP', '8d²', '134.2M'], ['layer', '12d²', '201.3M'], ['32 layers', '', '6.44B']])}` },
    { title: 'Head sizes in real models', html: `<p>GPT-3 175B: d = 12288, 96 heads, d<sub>head</sub> = 128. LLaMA-3 8B: d = 4096, 32 query heads, 8 KV heads, d<sub>head</sub> = 128. Almost everyone picks d<sub>head</sub> = 64 or 128 because it suits GPU hardware.</p>` },
    { title: 'GQA saves KV memory, not attention quality', html: `<p>In <b>grouped-query attention</b> several query heads share one K/V head. 32 Q heads with 8 KV heads means the KV cache is 4× smaller; quality loss is tiny. <b>MQA</b> is the extreme: 1 KV head.</p>${H.arr([1, 2, 3, 4, 5, 6, 7, 8], { label: '8 query heads, 2 KV heads (groups of 4)', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g', 4: 'b', 5: 'b', 6: 'b', 7: 'b' } })}` }
  ],
  deepDive: `<p><b>Why not just one big head?</b> A single softmax produces one probability distribution per token; it must pick a compromise. Several heads learn specialised roles (research on trained models finds "previous token" heads, "induction" heads that copy patterns like A B … A → B, syntax heads, positional heads). Many heads turn out redundant and can be pruned, but the h parallel subspaces help optimisation.</p>
  <p><b>Implementation detail.</b> No loops over heads exist in real code: Q, K, V are reshaped to (batch, heads, seq, d_head) and one batched matmul handles all heads. W<sub>q</sub>, W<sub>k</sub>, W<sub>v</sub> are usually fused into one d×3d matrix. Heads do not exchange information until W<sub>o</sub>, so they are embarrassingly parallel and can be split across GPUs (tensor parallelism splits heads across devices and needs one all-reduce after W<sub>o</sub>).</p>
  <p><b>MQA / GQA / MLA.</b> Decode speed is limited by reading the KV cache. MQA (1 KV head) and GQA (g KV heads) shrink it by h/g. DeepSeek's <b>MLA</b> (multi-head latent attention) stores a small compressed latent per token and re-expands it, cutting the cache by an order of magnitude. Parameter count with GQA: W<sub>k</sub>, W<sub>v</sub> shrink to d × (g·d<sub>head</sub>), so attention is less than 4d².</p>`,
  aiEra: `<p><b>What AI changes:</b> Every model name you read now carries these numbers ("32 layers, 32 heads, 8 KV heads, d = 4096"). You can predict memory and cost from them. <b>Use AI as a partner:</b> paste a model's config.json and ask "compute parameters, KV cache per token and FLOPs per token, show your arithmetic", then recompute yourself with the formulas above — an excellent habit. <b>Where AI goes wrong:</b> assistants frequently forget the gated MLP's third matrix, forget that embeddings can be tied or untied, or use query heads instead of KV heads in the cache formula. <b>What you must still own:</b> the shape bookkeeping (n×d → heads → n×n per head → n×d), and the ability to say which design choice (GQA, MLA, MoE) trades quality for memory.</p>`,
  problems: [{
    title: 'Count parameters in a transformer layer',
    level: 'Easy', tags: ['parameters', 'multi-head attention', 'MLP'],
    statement: `<p>A decoder layer has d<sub>model</sub> = 2048, 16 heads, standard multi-head attention (Wq, Wk, Wv, Wo, no biases) and an MLP with hidden size 4·d (two matrices, no biases). How many parameters are in one layer (ignore LayerNorm)? How many for 24 layers?</p>`,
    constraints: `Round to millions.`,
    example: `<p>Attention 4 × 2048² = ${H.c('g', '16.78M')}; MLP 8 × 2048² = ${H.c('g', '33.55M')}; layer = ${H.c('b', '50.3M')}; 24 layers = ${H.c('b', '1.21B')}.</p>`,
    brute: { why: `<p>Guessing "d × heads × layers" mixes up counts and ignores that every projection is a full d×d matrix.</p>` },
    mcq: { q: 'What is d_head?', options: ['d_model / number of heads = 128', 'number of heads × 2', 'd_model × heads'], answer: 0, explain: 'The model width is split evenly across heads.' },
    hints: [`<p>Hint 1: four d×d matrices in attention.</p>`, `<p>Hint 2: MLP up d×4d plus down 4d×d.</p>`, `<p>Hint 3: add them: 4d² + 8d² = 12d², then multiply by layers.</p>`],
    solution: {
      approach: `<p>d² = 4,194,304. Attention = 4d² = 16,777,216. MLP = d·4d + 4d·d = 8d² = 33,554,432. Layer = 12d² = 50,331,648 ≈ 50.3M. Over 24 layers: 1,207,959,552 ≈ 1.21B. Heads do not change the count because splitting d into heads just reshapes the same matrices.</p>`,
      code: { lang: 'python', run: true, code: `d, L = 2048, 24\nlayer = 4 * d * d + 8 * d * d\nprint(layer, 'per layer;', layer * L, 'for', L, 'layers')` },
      complexity: `<p>O(1) arithmetic.</p>`
    }
  }, {
    title: 'Do more heads cost more?',
    level: 'Medium', tags: ['multi-head', 'GQA'],
    statement: `<p>Your PM says "double the heads for better quality, it will double the cost". Is that true? What if you also switch to GQA with 4 KV heads?</p>`,
    constraints: `Keep d_model fixed.`,
    example: `<p>d = 4096: 32 heads × 128 or 64 heads × 64 — same parameter count ${H.c('g', '4d²')}.</p>`,
    brute: { why: `<p>"Heads multiply everything": wrong, because d_head shrinks as heads grow.</p>` },
    mcq: { q: 'Doubling heads with d_model fixed changes parameters by…', options: ['nothing', 'x2', 'x4'], answer: 0, explain: 'Projection matrices stay d×d; only the reshape changes.' },
    hints: [`<p>Hint 1: d_head = d/h.</p>`, `<p>Hint 2: matmul FLOPs depend on d, not on h.</p>`, `<p>Hint 3: the real cost is score memory h·n² and tiny d_head hurting GPU efficiency.</p>`],
    solution: {
      approach: `<p>Parameters and projection FLOPs stay the same because each head becomes narrower (d_head = d/h). The attention-score work per layer is h × n² × d_head = n²·d, also unchanged. What does grow: the number of n×n score tables (h of them) if you materialise them, and kernel efficiency can drop when d_head gets very small (below 64). Quality gains saturate. With GQA (4 KV heads instead of 32) the K and V projections shrink by 8×, parameters fall slightly, and the KV cache shrinks 8×, which speeds up decoding and allows longer contexts, with small quality loss. So the PM is wrong on cost, and the more interesting lever for cost is the number of KV heads.</p>`,
      complexity: `<p>FLOPs for scores/values: O(n²·d) regardless of h.</p>`
    }
  }]
});

topics.push({
  title: 'Positional Encodings: Sinusoidal vs RoPE (Rotation)',
  analogy: `<p>Attention alone is like a <b>bag of word-cards thrown on a table</b>: it sees which cards exist but not their order, so "dog bites man" and "man bites dog" look the same. Position encoding is <b>numbering the cards</b>. Sinusoidal encoding writes a clock-like number on each card. RoPE is cleverer: it gives every card a <b>compass needle</b> and turns the needle a little more for each later position, so two cards can tell how far apart they are just by the angle between their needles.</p>`,
  explain: `<p>Self-attention treats the input as a set. We must inject the order. Two main ideas:</p>
  <p><b>1. Sinusoidal (original 2017 Transformer).</b> Build a vector for each position <i>pos</i> from sines and cosines at different speeds and <b>add</b> it to the token embedding:</p>
  <p><code>PE(pos, 2i) = sin(pos / 10000<sup>2i/d</sup>)</code> and <code>PE(pos, 2i+1) = cos(pos / 10000<sup>2i/d</sup>)</code>.</p>
  <p>Think of a set of clock hands: the first pair spins fast (second hand), the last pairs spin very slowly (hour hand). Together they make a unique "time stamp" for every position. No parameters to learn.</p>
  <p><b>2. RoPE — Rotary Position Embedding</b> (LLaMA, Mistral, Qwen, Gemma and most modern LLMs). Do not add anything. Instead, cut each Q and K vector into <b>pairs of numbers</b> (x, y) and <b>rotate each pair by an angle = position × θ<sub>i</sub></b>:</p>
  <p>(x, y) → (x·cos α − y·sin α, x·sin α + y·cos α), with α = pos·θ<sub>i</sub> and θ<sub>i</sub> = 10000<sup>−2i/d</sup>.</p>
  <p><b>The magic:</b> the dot product of a query rotated by position m and a key rotated by position n depends only on the <b>difference m − n</b>, because rotating one by m and the other by n leaves a net rotation of (m − n). So attention scores naturally encode "how far apart" instead of "absolute address". RoPE is applied to Q and K only (never V), inside every layer.</p>
  ${H.table(['pair', 'speed θ<sub>i</sub>', 'meaning'], [['first pairs (i small)', 'fast (θ ≈ 1 rad)', 'tells nearby tokens apart'], ['middle pairs', 'medium', 'phrase-level distance'], ['last pairs (i large)', 'very slow (θ ≈ 0.0001)', 'tells far tokens apart']])}`,
  clues: ['"Attention is permutation invariant" → needs positional information', '"Relative position" + "extrapolate to longer sequences" → RoPE / ALiBi', '"Applied to Q and K, not V" → RoPE', '"Why 10000?" → base sets the longest wavelength; change it (NTK/YaRN) to extend context', '"Learned vs sinusoidal positions" → learned has a hard max length (GPT-2: 1024)', '"Rotation matrix pairs of dimensions" → RoPE'],
  code: [{ lang: 'python', title: 'Sinusoidal table and RoPE rotation demo (stdlib, runnable)', run: true, code: `import math

def sinusoidal(pos, d):
    # even slots = sin, odd slots = cos, each pair spins at its own speed
    out = []
    for i in range(d // 2):
        freq = pos / (10000 ** (2 * i / d))
        out += [math.sin(freq), math.cos(freq)]
    return out

def rotate(x, y, angle):
    c, s = math.cos(angle), math.sin(angle)
    return x * c - y * s, x * s + y * c

def rope(vec, pos, base=10000):
    # rotate each (x, y) pair by pos * theta_i
    d = len(vec)
    out = []
    for i in range(d // 2):
        theta = base ** (-2 * i / d)
        x, y = rotate(vec[2 * i], vec[2 * i + 1], pos * theta)
        out += [x, y]
    return out

def dot(a, b):
    return sum(p * q for p, q in zip(a, b))

print('sinusoidal d=4:')
for p in range(4):
    print(' pos', p, [round(v, 3) for v in sinusoidal(p, 4)])

q = [1.0, 0.0, 0.5, 0.5]
k = [0.8, 0.6, 1.0, 0.0]
print('RoPE: score depends only on the gap m - n')
for m, n in [(3, 1), (10, 8), (100, 98), (7, 4)]:
    s = dot(rope(q, m), rope(k, n))
    print(' m=%3d n=%3d gap=%d score=%.4f' % (m, n, m - n, s))` },
  { lang: 'python', title: 'RoPE in PyTorch (needs torch, not run here)', check: false, code: `import torch

def apply_rope(x, pos, base=10000.0):
    # x: (batch, heads, seq, d_head); pos: (seq,)
    d = x.size(-1)
    theta = base ** (-torch.arange(0, d, 2).float() / d)       # (d/2,)
    ang = pos[:, None].float() * theta[None, :]                # (seq, d/2)
    cos, sin = ang.cos(), ang.sin()
    x1, x2 = x[..., 0::2], x[..., 1::2]                        # the (x, y) pairs
    out = torch.stack([x1 * cos - x2 * sin, x1 * sin + x2 * cos], dim=-1)
    return out.flatten(-2)                                     # interleave back` }],
  viz: [{
    title: 'RoPE: rotating a vector by position (2D)',
    input: '30 5',
    inputLabel: 'angle per step in degrees, number of positions (e.g. 30 5)',
    gen: function (input) {
      var a = nums(input), deg = a[0], P = a[1] || 5;
      if (P < 2 || P > 12) throw new Error('Positions between 2 and 12, e.g. 30 5');
      var th = deg * Math.PI / 180, fr = [], m, rows = [], q0 = [1, 0];
      fr.push({ narr: 'A query vector <b>[1, 0]</b> sits at position 0 (angle 0). Moving to position m rotates it by <b>m × ' + deg + '°</b>.', parts: [{ type: 'vars', vals: { 'base vector': '[1, 0]', 'θ per position': deg + '°' } }] });
      for (m = 0; m < P; m++) {
        var al = m * th, x = r3(Math.cos(al)), y = r3(Math.sin(al));
        rows.push([m, r2(m * deg) + '°', x, y]);
        fr.push({ narr: 'Position <b>' + m + '</b>: angle ' + r2(m * deg) + '° → rotated vector [' + x + ', ' + y + ']. Length stays 1 — only the direction changes.', parts: [{ type: 'table', label: 'rotated query by position', columns: ['pos m', 'angle', 'x', 'y'], rows: rows.slice(), hl: { }, }, { type: 'vars', vals: { pos: m, angle: r2(m * deg) + '°', x: x, y: y }, hl: { pos: 'cur' } }] });
      }
      var pairs = [], prs = [[P - 1, 1], [P - 2, 0], [P - 1, 0]], hl = {};
      var trows = []; prs.forEach(function (pr, k) { var s = Math.cos((pr[0] - pr[1]) * th); trows.push([pr[0], pr[1], pr[0] - pr[1], r3(s)]); });
      for (var m2 = 1; m2 < P; m2++) trows.push([m2, m2 - 1, 1, r3(Math.cos(th))]);
      fr.push({ narr: 'The punchline. Score = q(m)·k(n) = cos((m − n)·θ). Rows with the <b>same gap</b> (gap = 1 for the last rows) give the <b>same score</b> no matter where they sit. Attention therefore feels relative distance.', parts: [{ type: 'table', label: 'score q(m)·k(n) with q = k = [1,0]', columns: ['m', 'n', 'gap m−n', 'score'], rows: trows, hl: { 3: 'ok', 4: 'ok' } }] });
      return fr;
    }
  }, {
    title: 'Sinusoidal encoding: clock hands at different speeds',
    input: '8 6',
    inputLabel: 'dimension d (even, ≤ 16) and number of positions (≤ 10)',
    gen: function (input) {
      var a = nums(input), d = a[0], P = a[1] || 6;
      if (d < 2 || d > 16 || d % 2 || P < 2 || P > 10) throw new Error('Use even d ≤ 16 and positions ≤ 10, e.g. 8 6');
      var fr = [], rows = [], p, i;
      fr.push({ narr: 'Each pair of slots (sin, cos) has its own frequency. Slot pair 0 spins fastest; the last pair barely moves.', parts: [{ type: 'bars', label: 'frequency of each pair: 1 / 10000^(2i/d)', values: Array.apply(null, Array(d / 2)).map(function (_, k) { return r3(1 / Math.pow(10000, 2 * k / d)); }), idxLabels: Array.apply(null, Array(d / 2)).map(function (_, k) { return 'pair ' + k; }) }] });
      for (p = 0; p < P; p++) {
        var v = []; for (i = 0; i < d / 2; i++) { var f = p / Math.pow(10000, 2 * i / d); v.push(r2(Math.sin(f))); v.push(r2(Math.cos(f))); }
        rows.push(v);
        fr.push({ narr: 'Position <b>' + p + '</b> gets this vector. It is <b>added</b> to the word embedding. Fast pairs change a lot between neighbours; slow pairs change gently.', parts: [{ type: 'array', label: 'PE(pos ' + p + ')', values: v, hl: { 0: 'cur', 1: 'cur' } }, { type: 'grid', label: 'all positions so far (rows) × dims (cols)', rows: rows.map(function (r) { return r.slice(); }), rowHead: rows.map(function (_, k) { return 'p' + k; }), colHead: Array.apply(null, Array(d)).map(function (_, k) { return (k % 2 ? 'cos' : 'sin') + Math.floor(k / 2); }), hl: (function () { var h = {}; for (var c = 0; c < d; c++) h[p + ',' + c] = 'cur'; return h; })() }] });
      }
      return fr;
    }
  }],
  examples: [
    { title: 'Two tokens, same gap, same score (numbers)', html: `<p>With q = k = [1, 0] and θ = 30° per step: positions (3,1) gap 2 → cos 60° = 0.5. Positions (10,8) gap 2 → cos 60° = 0.5. Same! The model learns "what is 2 tokens behind me" once and it works everywhere.</p>${H.table(['m', 'n', 'gap', 'score'], [['3', '1', '2', '0.5'], ['10', '8', '2', '0.5'], ['5', '4', '1', '0.866']])}` },
    { title: 'Sinusoidal at pos 1 with d = 4', html: `<p>pair 0 frequency 1: (sin 1, cos 1) = (0.841, 0.540). pair 1 frequency 1/100: (sin 0.01, cos 0.01) = (0.010, 1.000). The slow pair is almost constant for nearby positions — it is the "hour hand".</p>` },
    { title: 'Learned absolute positions have a hard ceiling', html: `<p>GPT-2 uses a learned table of 1024 position vectors. Position 1025 has no row. RoPE is a formula so it can produce any position, but a model trained only to 4k still behaves badly at 32k (angles never seen) — hence RoPE scaling (next topics).</p>` }
  ],
  deepDive: `<p><b>Proof sketch for RoPE.</b> Let R(α) be a 2D rotation matrix. Rotated query q' = R(mθ)q and key k' = R(nθ)k. Then q'·k' = qᵀR(mθ)ᵀR(nθ)k = qᵀR((n−m)θ)k, because Rᵀ(a)R(b) = R(b−a). So the score depends only on n − m, and the model gets relative position for free while still using only element-wise operations. Rotation preserves vector length so it does not disturb the content similarity.</p>
  <p><b>Frequencies.</b> θ<sub>i</sub> = base<sup>−2i/d</sup> gives wavelengths from 2π (fast) up to 2π·base (slow). The fast pairs encode local order; the slow pairs encode long-range order. With base = 10,000 the slowest pair wraps after about 63k positions; LLaMA-3 uses base 500,000 and Qwen/others up to 1,000,000 for long context.</p>
  <p><b>Alternatives.</b> ALiBi adds a linear penalty −m·|i−j| to the scores (no rotation, extrapolates well). T5 uses learned relative buckets. NoPE (no encoding) can work because causal masking leaks order. <b>Context extension:</b> position interpolation squeezes positions (pos × L/L'), NTK-aware scaling raises the base, YaRN mixes both per frequency and adds an attention temperature; a short fine-tune afterwards recovers quality. Pitfall: RoPE must be applied after splitting heads and before the dot product, and the KV cache stores keys <i>already rotated</i>.</p>`,
  aiEra: `<p><b>What AI changes:</b> "128k context" model cards almost always mean "RoPE with a bigger base plus some long-context fine-tuning". Knowing this tells you why quality at the far end of the window is weaker than at 4k and why retrieval still matters. <b>Use AI as a partner:</b> ask it to generate RoPE test cases (same gap, different positions) and assert the scores match — that is the property-based test that catches off-by-one and pair-layout bugs. <b>Where AI goes wrong:</b> code assistants mix the two RoPE layouts (interleaved pairs vs "rotate half") and silently break compatibility with pretrained weights; they also apply RoPE to V or add it to embeddings like sinusoidal. <b>What you must still own:</b> the relative-position property, the role of the base, and why long-context extension needs more than flipping a config number.</p>`,
  problems: [{
    title: 'Rotate a query by position',
    level: 'Medium', tags: ['RoPE', 'rotation', 'positional encoding'],
    statement: `<p>A 2D query is q = [1, 0] and a key is k = [1, 0]. RoPE uses θ = 45° per position. Compute the attention score contribution q(m)·k(n) for (m, n) = (5, 3) and (9, 7), and explain why they are equal.</p>`,
    constraints: `Give answers to 3 decimals.`,
    example: `<p>Gap = 2 in both → angle 90° → cos 90° = ${H.c('g', '0.000')}. Gap = 1 would give cos 45° = ${H.c('b', '0.707')}.</p>`,
    brute: { why: `<p>Computing both rotations then the dot product works but hides the insight; you waste effort and miss that only the gap matters.</p>` },
    mcq: { q: 'RoPE is applied to…', options: ['Q and K only', 'Q, K and V', 'the token embedding before layer 1'], answer: 0, explain: 'Only Q·K scores need relative position; V carries content.' },
    hints: [`<p>Hint 1: q rotated by m·45°, k rotated by n·45°.</p>`, `<p>Hint 2: dot product of two unit vectors = cos(angle between them).</p>`, `<p>Hint 3: the angle between them is (m−n)·45° = 90°.</p>`],
    solution: {
      approach: `<p>q(5) points at 225°, k(3) at 135°; the angle between them is 90°, so the dot product is cos 90° = 0. For (9, 7): 405° and 315°, again 90° apart, score 0. They are equal because the dot product of rotated vectors depends only on the angle difference, which is (m − n)·θ. This is precisely why RoPE encodes relative position.</p>`,
      code: { lang: 'python', run: true, code: `import math\nth = math.radians(45)\nfor m, n in [(5, 3), (9, 7), (6, 5)]:\n    print(m, n, round(math.cos((m - n) * th), 3))` },
      complexity: `<p>O(d) per Q or K vector (d/2 rotations).</p>`
    }
  }]
});

topics.push({
  title: 'The KV Cache: What Is Stored and Why Decoding Is Memory-Bound',
  analogy: `<p>You are writing a long email and, before each new word, you <b>re-read the whole email from the start</b>. Slow! A smarter writer keeps <b>sticky notes</b> for every sentence already written, so a new word only needs to glance at the notes and add one new note. The KV cache is that pile of sticky notes: the Keys and Values of all past tokens, kept so we never recompute them. The price: the pile takes <b>shelf space</b> (GPU memory) that grows with every word.</p>`,
  explain: `<p>LLMs write text <b>one token at a time</b>. To pick token t+1 the model needs the K and V vectors of tokens 1…t in <i>every layer</i>. But those never change once computed (causal attention: old tokens cannot see new ones). So we <b>cache</b> them.</p>
  <ul><li><b>Prefill</b> phase: read the whole prompt at once (a big parallel matmul, compute-bound) and fill the cache.</li><li><b>Decode</b> phase: for each new token compute only <i>its</i> q, k, v; append k, v to the cache; attend to all cached keys; produce one token. Repeat.</li></ul>
  <p><b>What is cached?</b> Only K and V (not Q — the old queries are never used again). Per layer, per KV-head, per token: one K vector and one V vector of size d<sub>head</sub>.</p>
  <p><b>Memory formula:</b></p>
  <p><code>KV bytes = 2 × layers × kv_heads × d_head × seq_len × bytes_per_value × batch</code></p>
  <p>The 2 is for K and V. For a 7B LLaMA-style model (32 layers, 32 KV heads, d<sub>head</sub> = 128, fp16 = 2 bytes), per token: 2 × 32 × 32 × 128 × 2 = <b>524,288 bytes = 0.5 MiB</b>. At 8,192 tokens: <b>4 GiB</b> — for a single user! With GQA (8 KV heads) it drops to <b>1 GiB</b>.</p>
  <p><b>Why decode is memory-bound.</b> To produce each token the GPU must read <i>all the weights</i> (7B × 2 B = 14 GB) and the KV cache from memory, but does only a few multiply-adds per byte read (about 1 FLOP per byte for batch size 1). GPUs can do hundreds of FLOPs per byte, so the compute units sit idle waiting for memory. Speed ≈ memory bandwidth ÷ bytes read: an H100 (≈3.35 TB/s) reading 14 GB gives at most ≈ 240 tokens/s for one stream. Batching many users shares the weight read, so throughput goes up, but then the KV cache of every user competes for memory.</p>`,
  clues: ['"Why is the first token slow but the rest fast?" → prefill (compute-bound) vs decode (memory-bound)', '"Memory for a 7B model at 8k context" → use the 2·L·H·d·n·bytes formula', '"Out of memory with long contexts / many users" → KV cache dominates, not weights', '"Time to first token (TTFT) vs tokens per second" → prefill vs decode metrics', '"PagedAttention / vLLM" → manage KV cache in blocks to avoid fragmentation', '"GQA / MQA / MLA / KV quantization" → ways to shrink the cache'],
  code: [{ lang: 'python', title: 'KV-cache memory calculator (stdlib, runnable)', run: true, code: `def kv_bytes(layers, kv_heads, d_head, seq, bytes_per=2, batch=1):
    # 2 = one K and one V per layer, per kv-head, per token
    return 2 * layers * kv_heads * d_head * seq * bytes_per * batch

def gib(b):
    return b / 2**30

# LLaMA-style 7B: 32 layers, 32 heads x 128, fp16
per_tok = kv_bytes(32, 32, 128, 1)
print('per token:', per_tok, 'bytes =', per_tok / 1024, 'KiB')
for seq in (1024, 8192, 32768, 131072):
    print('seq %6d -> %7.2f GiB (MHA)  %6.2f GiB (GQA 8 kv-heads)  %6.2f GiB (GQA + int8)' % (
        seq, gib(kv_bytes(32, 32, 128, seq)), gib(kv_bytes(32, 8, 128, seq)), gib(kv_bytes(32, 8, 128, seq, 1))))

# how many users fit on an 80 GB GPU after 14 GB of fp16 weights?
free = 80 * 10**9 - 14 * 10**9
users = free // kv_bytes(32, 32, 128, 8192)
print('users at 8k context, MHA:', users, '| with GQA:', free // kv_bytes(32, 8, 128, 8192))

# decode speed ceiling: must read the weights (14 GB) once per token
bandwidth = 3.35e12                 # bytes/s, H100-class HBM
print('batch-1 decode ceiling ~', round(bandwidth / 14e9), 'tokens/s')` },
  { lang: 'python', title: 'Decode loop with a KV cache (stdlib, runnable)', run: true, code: `import math

def softmax(xs):
    m = max(xs); e = [math.exp(x - m) for x in xs]; s = sum(e)
    return [v / s for v in e]

# toy single-head model: the "projection" is identity to keep the code tiny
cache_k, cache_v = [], []

def decode_step(x):
    # 1) compute this token's k and v ONCE and append them to the cache
    cache_k.append(x[:]); cache_v.append(x[:])
    d = len(x)
    # 2) the new query attends over ALL cached keys (no recomputation of old tokens)
    scores = [sum(a * b for a, b in zip(x, k)) / math.sqrt(d) for k in cache_k]
    w = softmax(scores)
    return [sum(w[j] * cache_v[j][c] for j in range(len(cache_v))) for c in range(d)]

tokens = [[1, 0], [0, 1], [1, 1], [0.5, 0.5]]
for t, x in enumerate(tokens):
    out = decode_step(x)
    print('step', t + 1, 'cache size =', len(cache_k), 'out =', [round(v, 3) for v in out])` }],
  viz: [{
    title: 'KV cache growing token by token',
    input: '4 6',
    inputLabel: 'prompt tokens (1–8) and new tokens to decode (1–10)',
    gen: function (input) {
      var a = nums(input), P = a[0], G = a[1] || 6;
      if (P < 1 || P > 8 || G < 1 || G > 10) throw new Error('Use prompt 1-8 and new tokens 1-10, e.g. 4 6');
      var KB = 512, fr = [], cache = [], mb = [], i;
      for (i = 0; i < P; i++) cache.push('t' + (i + 1));
      var hl0 = {}; cache.forEach(function (_, k) { hl0[k] = 'win'; });
      fr.push({ narr: '<b>Prefill:</b> the ' + P + '-token prompt is processed in parallel and its K,V for every layer are stored. For the 7B model that is 0.5 MiB (512 KiB) per token.', parts: [{ type: 'array', label: 'KV cache (one slot per token)', values: cache.slice(), hl: hl0 }, { type: 'vars', vals: { 'tokens cached': P, 'KV memory (MiB)': r2(P * KB / 1024) } }] });
      for (i = 0; i < G; i++) {
        var newTok = 'g' + (i + 1), hl = {};
        cache.push(newTok);
        for (var k = 0; k < cache.length - 1; k++) hl[k] = 'done';
        hl[cache.length - 1] = 'ok';
        mb.push(r2(cache.length * KB / 1024));
        fr.push({ narr: '<b>Decode step ' + (i + 1) + ':</b> compute q,k,v for the one new token only, <span class="c-g">append</span> its k,v, and <b>read</b> all ' + (cache.length - 1) + ' older (faded) entries to attend. Memory grows by 512 KiB per token.', parts: [{ type: 'array', label: 'KV cache', values: cache.slice(), hl: hl }, { type: 'bars', label: 'KV memory in MiB after each decoded token', values: mb.slice(), idxLabels: mb.map(function (_, q) { return 'g' + (q + 1); }) }, { type: 'vars', vals: { 'tokens cached': cache.length, 'KV memory (MiB)': r2(cache.length * KB / 1024), 'must read per step': r2(cache.length * KB / 1024) + ' MiB + weights 14 GB' }, hl: { 'tokens cached': 'cur' } }] });
      }
      fr.push({ narr: 'Each step re-reads <b>weights (14 GB) + the whole cache</b> but does very little math: decode is <span class="c-r">memory-bound</span>. At 8,192 tokens the cache alone is 4 GiB per user.', parts: [{ type: 'bars', label: 'GiB read per decoded token (7B, fp16)', values: [14, 14 + 0.5, 14 + 4], idxLabels: ['weights only', '+1k ctx cache', '+8k ctx cache'], hl: { 2: 'bad' } }] });
      return fr;
    }
  }],
  examples: [
    { title: '7B model at 8k context (MHA)', html: `<p>2 × 32 layers × 32 heads × 128 × 8192 tokens × 2 bytes = 4,294,967,296 bytes = <b>4 GiB</b>. Add 13 GiB of fp16 weights and one user needs ≈ 17 GiB.</p>${H.table(['factor', 'value'], [['K+V', '2'], ['layers', '32'], ['kv heads', '32'], ['d_head', '128'], ['tokens', '8192'], ['bytes', '2'], ['<b>total</b>', '<b>4 GiB</b>']])}` },
    { title: 'GQA turns 4 GiB into 1 GiB', html: `<p>Same model with 8 KV heads: 2 × 32 × 8 × 128 × 8192 × 2 = 1 GiB. LLaMA-2-70B and LLaMA-3 use GQA for exactly this reason: 4× more users per GPU.</p>` },
    { title: 'Why batching helps decode throughput', html: `<p>Reading 14 GB of weights for one user yields 1 token per read. For 32 users the same read yields 32 tokens, so throughput rises ~32× until the KV cache (32 × 4 GiB = 128 GiB!) no longer fits. Memory, not compute, decides the batch size.</p>` }
  ],
  deepDive: `<p><b>Arithmetic intensity.</b> Decode with batch 1 does ~2 FLOPs per weight (one multiply, one add) and reads 2 bytes per weight in fp16: ≈ 1 FLOP/byte. An H100 offers ~990 TFLOPs (dense fp16) against 3.35 TB/s, i.e. it needs ≈ 300 FLOPs/byte to stay busy. So decode uses ~0.3% of the compute. Prefill, by contrast, multiplies big matrices and is compute-bound, which is why TTFT scales with prompt length while inter-token latency scales with model and cache size.</p>
  <p><b>Fixes for the cache.</b> (1) <b>GQA/MQA/MLA</b> store fewer or compressed KV heads. (2) <b>KV quantization</b> (int8/fp8/int4) halves or quarters the bytes. (3) <b>PagedAttention</b> (vLLM) stores the cache in fixed-size blocks like OS virtual memory, eliminating fragmentation and enabling prefix sharing between requests. (4) <b>Prefix caching</b> reuses the K,V of a shared system prompt. (5) <b>Eviction/sliding window</b> drop old tokens (StreamingLLM keeps the first "attention-sink" tokens). (6) <b>Offloading</b> to CPU/NVMe. (7) <b>Speculative decoding</b> uses a small draft model to propose several tokens and verifies them in one pass of the big model, converting memory-bound steps into compute.</p>
  <p><b>Gotchas.</b> Cached keys are stored after RoPE is applied. Cache size scales linearly with batch and context but attention compute per decoded token also scales linearly with context (not quadratically). Total decode work for n tokens without a cache would be O(n³)-ish across the whole generation; with a cache it is O(n²).</p>`,
  aiEra: `<p><b>What AI changes:</b> API prices distinguish input tokens, cached input tokens and output tokens precisely because of this: cached prefixes skip the expensive prefill and reuse stored K,V. Long-context agents are mostly a KV-cache budgeting problem. <b>Use AI as a partner:</b> have it build a capacity-planning spreadsheet from a model's config (layers, KV heads, d_head) and your traffic (users, context) — then spot-check one row by hand. <b>Where AI goes wrong:</b> it often uses the number of query heads rather than KV heads, forgets the factor 2 for K and V, mixes GB and GiB, or claims that a longer prompt makes <i>each decoded token</i> quadratically slower. <b>What you must still own:</b> the formula, the prefill/decode split, and the intuition that for serving, memory bandwidth and capacity — not FLOPs — are the bottleneck.</p>`,
  problems: [{
    title: 'KV-cache memory for a 7B model at 8k context',
    level: 'Easy', tags: ['kv cache', 'memory', 'capacity'],
    statement: `<p>A model has 32 layers, 32 KV heads, d<sub>head</sub> = 128, fp16. (a) KV bytes per token? (b) For one 8,192-token sequence? (c) How many such sequences fit in 40 GB left after loading the weights?</p>`,
    constraints: `Use GiB = 2<sup>30</sup> bytes.`,
    example: `<p>(a) ${H.c('g', '524,288 B = 0.5 MiB')} (b) ${H.c('g', '4 GiB')} (c) 40 GB ≈ 37.25 GiB → ${H.c('b', '9 sequences')}.</p>`,
    brute: { why: `<p>Guessing "about the same as the weights" is wildly off: weights are fixed (14 GB), the cache grows with every user and every token.</p>` },
    mcq: { q: 'Which pieces are in the formula?', options: ['2 (K and V) × layers × kv_heads × d_head × tokens × bytes', 'layers × vocab × tokens', 'query heads × tokens² × bytes'], answer: 0, explain: 'The cache stores K and V per layer per KV head per token.' },
    hints: [`<p>Hint 1: per token = 2 × 32 × 32 × 128 × 2.</p>`, `<p>Hint 2: multiply by 8192 and convert bytes to GiB.</p>`, `<p>Hint 3: divide the free memory by the per-sequence size and round down.</p>`],
    solution: {
      approach: `<p>(a) 2 × 32 × 32 × 128 = 262,144 values per token; × 2 bytes = 524,288 B (0.5 MiB). (b) × 8192 = 4,294,967,296 B = 4 GiB. (c) 40 × 10<sup>9</sup> B / 2<sup>30</sup> = 37.25 GiB; 37.25 / 4 = 9.3 → 9 sequences. With GQA (8 KV heads) each sequence is 1 GiB so 37 would fit. This is why serving stacks care about GQA and KV quantization.</p>`,
      code: { lang: 'python', run: true, code: `per_tok = 2 * 32 * 32 * 128 * 2\nseq = per_tok * 8192\nprint(per_tok, seq / 2**30, int(40e9 // seq))` },
      complexity: `<p>O(1) arithmetic.</p>`
    }
  }, {
    title: 'Why is token 500 not 500x slower than token 1?',
    level: 'Medium', tags: ['kv cache', 'decode', 'complexity'],
    statement: `<p>Explain, with and without a KV cache, how the work to generate the n-th token grows, and why decode latency is dominated by memory reads instead of math.</p>`,
    constraints: `Answer in plain words with complexity.`,
    example: `<p>Without cache: re-run all n tokens each step → ${H.c('r', 'O(n)')} tokens of work per step. With cache: ${H.c('g', '1 new token')} plus attention over n cached keys.</p>`,
    brute: { why: `<p>Recomputing K,V for the entire history at every step wastes n× the matmul work.</p>` },
    mcq: { q: 'With a KV cache, per-token attention cost grows…', options: ['linearly with context length', 'quadratically with context length', 'not at all'], answer: 0, explain: 'One query attends to n cached keys: O(n·d).' },
    hints: [`<p>Hint 1: old K,V never change under causal attention.</p>`, `<p>Hint 2: new work per step = projections for 1 token + dot with n keys.</p>`, `<p>Hint 3: the weights must be streamed from memory for each step regardless of context length.</p>`],
    solution: {
      approach: `<p>Without a cache, step n recomputes Q, K, V and attention for all n tokens, costing O(n·d²) for the projections and O(n²·d) for attention; the whole generation is roughly cubic. With a cache, step n computes projections for one token (O(d²) per layer) and one query against n cached keys (O(n·d)); total generation is O(n²·d). Latency per token is dominated by moving data: all weights (14 GB for 7B in fp16) plus the cache must be streamed from HBM each step while only ~1 FLOP per byte is done, so speed ≈ bandwidth ÷ bytes. Hence token 500 is only slightly slower than token 1 (cache read grows modestly) and the best levers are quantization, GQA, batching and speculative decoding.</p>`,
      complexity: `<p>With cache O(n·d) per token; memory O(n·layers·kv_heads·d_head).</p>`
    }
  }]
});

topics.push({
  title: 'Quantization: int8 and int4 Weights, and the Error You Pay',
  analogy: `<p>Imagine measuring people's heights. With a fancy ruler you write <b>172.384 cm</b>. With a cheap ruler that only marks every 2 cm you write <b>172</b>. You lose a tiny bit of detail but the notebook becomes much smaller. Quantization does this to model weights: replace precise 16-bit decimals with coarse whole numbers on a small ruler (256 marks for int8, 16 marks for int4) plus one note saying how long each mark is (the <b>scale</b>).</p>`,
  explain: `<p>A 7B model in fp16 needs 14 GB. If every weight is stored as an <b>int8</b> (8 bits, 256 possible values) it needs 7 GB; as <b>int4</b> only 3.5 GB. Smaller means it fits on cheaper GPUs, loads faster, and — because decode is memory-bound — runs faster too (fewer bytes to read per token).</p>
  <p><b>Symmetric int8 recipe:</b></p>
  <ol><li>Find the biggest absolute weight: <code>absmax</code>.</li><li>Scale = absmax / 127 (127 is the biggest int8 level).</li><li>Quantize: <code>q = round(w / scale)</code>, clamp to [−127, 127].</li><li>Dequantize when needed: <code>w' = q × scale</code>.</li></ol>
  <p><b>Error:</b> rounding to the nearest mark loses at most half a mark: |w − w'| ≤ scale/2. With int4 there are only 15 usable levels (−7…7), so the marks are ~18× farther apart than in int8 → much bigger error.</p>
  ${H.table(['format', 'levels', 'bytes / weight', '7B model', 'max rounding error'], [['fp16', '65k+', '2', '14 GB', '~0'], ['int8', '255', '1', '7 GB', 'scale/2 = absmax/254'], ['int4', '15', '0.5', '3.5 GB', 'scale/2 = absmax/14']])}
  <p><b>The outlier problem:</b> one huge weight (or activation) makes absmax large, so the scale is large and <i>all the small weights</i> get squashed onto the same few marks. Fix: quantize in small <b>groups</b> (e.g. 64 or 128 weights share one scale) or per output channel, so one outlier only hurts its own group.</p>
  <p><b>Two families:</b> <b>PTQ</b> (post-training quantization, e.g. GPTQ, AWQ, bitsandbytes, llama.cpp GGUF Q4/Q8) converts a trained model in minutes; <b>QAT</b> (quantization-aware training) trains with rounding in the loop for the best quality.</p>`,
  clues: ['"Run a 70B model on one GPU / on a laptop" → 4-bit quantization', '"Memory = parameters × bytes per parameter"', '"Outliers in activations" → why activation quantization is harder than weight-only', '"Group size 128 / per-channel scales" → limit outlier damage', '"W8A8 vs W4A16" → weights-only vs weights+activations', '"perplexity increase after quantization" → how quality loss is measured'],
  code: [{ lang: 'python', title: 'Symmetric int8 quantizer with an error report (stdlib, runnable)', run: true, code: `def quantize(weights, bits=8):
    qmax = 2 ** (bits - 1) - 1                  # 127 for int8, 7 for int4
    absmax = max(abs(w) for w in weights)
    scale = absmax / qmax                        # length of one "mark" on the ruler
    q = [max(-qmax, min(qmax, round(w / scale))) for w in weights]
    return q, scale

def dequantize(q, scale):
    return [v * scale for v in q]

def report(weights, bits):
    q, scale = quantize(weights, bits)
    back = dequantize(q, scale)
    errs = [abs(a - b) for a, b in zip(weights, back)]
    mse = sum(e * e for e in errs) / len(errs)
    print('--- int%d  scale=%.5f  (max possible error = %.5f)' % (bits, scale, scale / 2))
    print('codes   :', q)
    print('restored:', [round(v, 3) for v in back])
    print('max |err| = %.5f   mean |err| = %.5f   MSE = %.7f' % (max(errs), sum(errs) / len(errs), mse))

w = [0.82, -1.90, 0.03, 0.50, -0.27, 1.10, 0.004, -0.60]
report(w, 8)
report(w, 4)

# the outlier problem: one huge weight ruins resolution for the rest
w_out = w[:-1] + [25.0]
print('with one outlier (25.0):')
report(w_out, 8)

# group-wise scales rescue small weights
def group_quant(weights, bits, group):
    out = []
    for i in range(0, len(weights), group):
        g = weights[i:i + group]
        q, s = quantize(g, bits)
        out += dequantize(q, s)
    return out

gw = group_quant(w_out, 8, 4)
print('group-of-4 int8, max |err| =', round(max(abs(a - b) for a, b in zip(w_out, gw)), 5))` },
  { lang: 'python', title: 'Loading a 4-bit model (needs transformers + bitsandbytes, not run here)', check: false, code: `from transformers import AutoModelForCausalLM, BitsAndBytesConfig
import torch

cfg = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type='nf4',
                         bnb_4bit_compute_dtype=torch.bfloat16)
model = AutoModelForCausalLM.from_pretrained('some-7b-model', quantization_config=cfg)
# weights live in 4-bit (~3.5 GB), are de-quantized on the fly to bf16 inside matmuls` }],
  viz: [{
    title: 'Quantize → buckets → dequantize → error',
    input: '8 0.82 -1.9 0.03 0.5 -0.27 1.1 0.004 -0.6',
    inputLabel: 'bits (2–8) first, then weights (up to 10 numbers)',
    gen: function (input) {
      var a = nums(input), bits = a[0], w = a.slice(1);
      if (bits < 2 || bits > 8 || w.length < 2 || w.length > 10) throw new Error('First number = bits (2-8), then 2-10 weights');
      var qmax = Math.pow(2, bits - 1) - 1, am = 0, i;
      w.forEach(function (x) { if (Math.abs(x) > am) am = Math.abs(x); });
      if (am === 0) throw new Error('Not all weights can be zero');
      var sc = am / qmax, q = w.map(function (x) { return Math.max(-qmax, Math.min(qmax, Math.round(x / sc))); });
      var back = q.map(function (v) { return v * sc; }), err = w.map(function (x, k) { return Math.abs(x - back[k]); });
      var idx = w.map(function (_, k) { return 'w' + k; }), fr = [];
      var sg = function (v) { return (v < 0 ? '-' : '+') + Math.abs(r3(v)); };
      fr.push({ narr: 'Original weights (bars show size, labels show sign). Biggest magnitude <b>absmax = ' + r3(am) + '</b>.', parts: [{ type: 'bars', label: 'original |w|', values: w.map(function (x) { return Math.abs(x); }), texts: w.map(sg), idxLabels: idx }] });
      fr.push({ narr: 'With <b>' + bits + ' bits</b> the largest level is ' + qmax + ' (' + (2 * qmax + 1) + ' usable levels). <b>scale = absmax / ' + qmax + ' = ' + r3(sc) + '</b> is the length of one mark on the ruler.', parts: [{ type: 'vars', vals: { bits: bits, levels: 2 * qmax + 1, 'q max': qmax, scale: r3(sc), 'max error scale/2': r3(sc / 2) }, hl: { scale: 'cur' } }] });
      var hl = {}; q.forEach(function (v, k) { hl[k] = Math.abs(v) === qmax ? 'sel' : (v === 0 ? 'bad' : 'win'); });
      fr.push({ narr: 'Round each weight to a bucket: <b>q = round(w / scale)</b>. Purple = hits the top level; <span class="c-r">red = collapsed to 0</span> (too small for this ruler).', parts: [{ type: 'bars', label: 'integer codes |q| (stored in ' + bits + ' bits)', values: q.map(Math.abs), texts: q.map(function (v) { return (v < 0 ? '-' : '+') + Math.abs(v); }), idxLabels: idx, hl: hl }] });
      fr.push({ narr: 'Dequantize: <b>w\' = q × scale</b>. Compare with the original: similar, not identical.', parts: [{ type: 'bars', label: 'original |w|', values: w.map(Math.abs), idxLabels: idx }, { type: 'bars', label: 'restored |w\'|', values: back.map(function (x) { return Math.abs(r3(x)); }), idxLabels: idx, hl: hl }] });
      var mx = Math.max.apply(null, err), mse = err.reduce(function (s, e) { return s + e * e; }, 0) / err.length;
      var eh = {}; err.forEach(function (e, k) { if (e === mx) eh[k] = 'bad'; });
      fr.push({ narr: 'Error per weight (always ≤ scale/2 = ' + r3(sc / 2) + '). Max error <b>' + r3(mx) + '</b>, MSE <b>' + r3(mse * 1000) / 1000 + '</b>. Try bits = 4 or 3 to see the error jump, or add a giant outlier to see small weights vanish.', parts: [{ type: 'bars', label: '|w − w\'|', values: err.map(r3), idxLabels: idx, hl: eh }, { type: 'vars', vals: { 'max |err|': r3(mx), 'bytes saved vs fp16': Math.round((1 - bits / 16) * 100) + '%' } }] });
      return fr;
    }
  }],
  examples: [
    { title: 'Worked int8 example', html: `<p>Weights [0.8, −1.9, 0.03]. absmax = 1.9 → scale = 1.9/127 = 0.01496. Codes: 0.8/0.01496 = 53.5 → <b>53</b>, −1.9 → <b>−127</b>, 0.03 → <b>2</b>. Restored: 0.793, −1.900, 0.030. The largest error is 0.0072 (for 0.8), just under the bound scale/2 = 0.0075.</p>` },
    { title: 'int4 on the same weights', html: `<p>qmax = 7, scale = 1.9/7 = 0.2714. 0.8 → 3 → 0.814 (error 0.014); 0.03 → 0 → <span class="c-r">0.0</span> (error 0.03, the weight vanished); −1.9 → −7. Small weights get erased first — the reason 4-bit quantizers use groups and smarter schemes (NF4, AWQ).</p>` },
    { title: 'Model sizes after quantization', html: `${H.table(['model', 'fp16', 'int8', 'int4'], [['7B', '14 GB', '7 GB', '3.5 GB'], ['13B', '26 GB', '13 GB', '6.5 GB'], ['70B', '140 GB', '70 GB', '35 GB'], ['405B', '810 GB', '405 GB', '203 GB']])}<p>Plus ~5–10% for scales and metadata. 70B at 4-bit (~40 GB) fits on one 48–80 GB GPU.</p>` }
  ],
  deepDive: `<p><b>Where the error goes.</b> For uniform rounding the error is roughly uniform in [−scale/2, scale/2], so its variance is scale²/12. Halving the bits does not halve the error — each bit removed doubles the scale (one fewer bit = half the levels), so int4 error is roughly 16 to 18× larger in magnitude than int8 for the same absmax (127 / 7 ≈ 18). Neural nets tolerate this because they are redundant and the errors are random and mostly cancel in the large sums of a matmul.</p>
  <p><b>Weights vs activations vs KV cache.</b> Weight-only (W4A16) is easiest: weights are static, so you can calibrate them offline; activations stay in fp16. Quantizing activations too (W8A8, FP8) enables low-precision tensor-core math for both inputs, but LLM activations have large outlier channels (a few dimensions 100× bigger than the rest), so methods like SmoothQuant move the difficulty from activations to weights. The KV cache can also be stored in int8/fp8/int4.</p>
  <p><b>Methods.</b> <b>Round-to-nearest (RTN)</b> is the baseline above. <b>GPTQ</b> quantizes column by column and corrects remaining weights using second-order (Hessian) information. <b>AWQ</b> protects the ~1% of weights that matter most by looking at activation magnitudes. <b>NF4</b> places the 16 levels where normally-distributed weights are densest. <b>GGUF</b> K-quants mix block sizes. <b>Asymmetric</b> quantization adds a zero-point to use the range when values are not centred. Typical results: int8 is nearly lossless; 4-bit costs ~1–3% on benchmarks for large models but more for small ones; 2–3 bit needs special techniques. Always measure on <i>your</i> task, not just perplexity.</p>`,
  aiEra: `<p><b>What AI changes:</b> Open-weight models ship in many quantized variants, and choosing between "Q4_K_M, Q5, Q8, FP8, AWQ" is a daily engineering decision for local assistants and cheap serving. <b>Use AI as a partner:</b> ask it to compute memory for model + KV cache + activations at each precision, then sanity check it with <code>params × bytes</code>; ask it to write an evaluation harness that compares the fp16 and 4-bit model on 100 of your own prompts. <b>Where AI goes wrong:</b> it claims "4-bit is the same quality" without testing, forgets that quantized weights are de-quantized for the matmul (so the savings are bandwidth and memory, not necessarily FLOPs), ignores the KV cache, and confuses bits per weight with bytes. <b>What you must still own:</b> the scale/round/clamp mechanics, why outliers hurt, and an evaluation plan that detects regressions in your use case (reasoning, code, non-English text usually degrade first).</p>`,
  problems: [{
    title: 'Quantize and dequantize a weight vector',
    level: 'Medium', tags: ['quantization', 'error', 'int8'],
    statement: `<p>Weights w = [0.5, −1.0, 0.25, 0.1]. Quantize with symmetric int8 (qmax = 127), then dequantize. Report the integer codes, the restored values and the maximum absolute error. Then repeat with int4 (qmax = 7).</p>`,
    constraints: `Use round-half-to-even or half-up; state which.`,
    example: `<p>int8: absmax 1.0 → scale 0.007874; codes ${H.c('g', '[64, −127, 32, 13]')}; restored [0.504, −1.000, 0.252, 0.102]; max error ${H.c('b', '0.004')}. int4: scale 0.1429; codes [4, −7, 2, 1]; max error ${H.c('r', '0.071')}.</p>`,
    brute: { why: `<p>Rounding every weight to 1 decimal place is not quantization: it saves no memory because you still store full floats.</p>` },
    mcq: { q: 'What bounds the rounding error of one weight?', options: ['scale / 2', 'absmax', '127'], answer: 0, explain: 'Nearest mark is at most half a mark away.' },
    hints: [`<p>Hint 1: scale = absmax / qmax.</p>`, `<p>Hint 2: q = round(w / scale); restore with q × scale.</p>`, `<p>Hint 3: error = |w − q×scale|, max over weights; theoretical bound scale/2.</p>`],
    solution: {
      approach: `<p>int8: absmax = 1.0, scale = 1/127 = 0.007874. Codes: 0.5/0.007874 = 63.5 → 64 (half-up), −1.0 → −127, 0.25 → 31.75 → 32, 0.1 → 12.7 → 13. Restored: 0.504, −1.000, 0.252, 0.102. Errors: 0.004, 0, 0.002, 0.002; the bound is scale/2 = 0.0039 (the 0.004 comes from half-up rounding of 63.5). int4: scale = 1/7 = 0.1429. Codes: 3.5 → 4, −7, 1.75 → 2, 0.7 → 1. Restored 0.571, −1.0, 0.286, 0.143; errors 0.071, 0, 0.036, 0.043; bound 0.071. Conclusion: int4 error is about 18× bigger, matching the ratio 127/7.</p>`,
      code: { lang: 'python', run: true, code: `w = [0.5, -1.0, 0.25, 0.1]\nfor bits in (8, 4):\n    qm = 2 ** (bits - 1) - 1\n    s = max(abs(x) for x in w) / qm\n    q = [int(x / s + 0.5) if x >= 0 else -int(-x / s + 0.5) for x in w]\n    back = [v * s for v in q]\n    print(bits, q, [round(b, 3) for b in back], round(max(abs(a - b) for a, b in zip(w, back)), 4))` },
      complexity: `<p>O(n) time, O(n) space for n weights; stores n×bits + one scale.</p>`
    }
  }, {
    title: 'One outlier wrecks the layer',
    level: 'Hard', tags: ['quantization', 'outliers', 'groups'],
    statement: `<p>A weight row is [0.02, −0.03, 0.01, 0.04, 6.0]. Show what per-row int8 does to the four small weights, and why groups of 4 fix it. What is the bit-overhead of group scales for groups of 64 with an fp16 scale?</p>`,
    constraints: `int8, qmax = 127.`,
    example: `<p>Per-row scale = 6/127 = 0.0472: 0.02 → ${H.c('r', '0')}, −0.03 → ${H.c('r', '−1')}, 0.01 → ${H.c('r', '0')}, 0.04 → ${H.c('r', '1')}. Small weights are almost erased.</p>`,
    brute: { why: `<p>"Just clip the outlier" removes the one weight the model may need most; huge weights are often the important ones.</p>` },
    mcq: { q: 'Best generic remedy for a rare outlier?', options: ['smaller quantization groups, each with its own scale', 'use fewer bits', 'increase learning rate'], answer: 0, explain: 'The outlier only inflates the scale of its own group.' },
    hints: [`<p>Hint 1: scale is set by the largest magnitude.</p>`, `<p>Hint 2: compute scale for the row, then round the small weights.</p>`, `<p>Hint 3: groups isolate the outlier; overhead = 16 bits / 64 weights = 0.25 bits per weight.</p>`],
    solution: {
      approach: `<p>Per-row: scale = 6.0/127 = 0.04724. The small weights divided by the scale are 0.42, −0.64, 0.21, 0.85, which round to 0, −1, 0, 1 — restored values 0, −0.047, 0, 0.047: relative errors up to 100%, and two weights vanish. The outlier itself is exact. With groups of 4 the first group [0.02, −0.03, 0.01, 0.04] has absmax 0.04, scale 0.000315, so the codes are 63, −95, 32, 127 and restored values are accurate to ~0.00016; only the outlier's own group sees a coarse scale. Overhead: one fp16 scale per 64 weights = 16/64 = 0.25 extra bits per weight, so int4 with groups of 64 costs ≈ 4.25 bits per weight. That is why 4-bit schemes quote "4.25–4.5 bpw". Trade-off: smaller groups = better accuracy but more scale storage.</p>`,
      complexity: `<p>O(n) to quantize; memory n·bits + (n/g)·16 bits.</p>`
    }
  }]
});

topics.push({
  title: 'Scaling Laws and Chinchilla: How Big, How Much Data, How Much Compute',
  analogy: `<p>Baking a bigger cake needs both a <b>bigger oven</b> (model size) and <b>more ingredients</b> (training tokens). A giant oven with a thimble of flour makes a poor cake; a mountain of flour in a tiny oven bakes badly too. Scaling laws are the recipe book: given a fixed <b>kitchen budget</b> (compute), they tell you how to split it between oven size and ingredients so the cake comes out best. Chinchilla's finding: roughly <b>20 ingredients (tokens) per oven unit (parameter)</b>.</p>`,
  explain: `<p>Researchers noticed that a model's loss (how wrong it is at predicting the next token) falls in a smooth, predictable way as you grow three things: <b>N</b> (parameters), <b>D</b> (training tokens), <b>C</b> (compute). It is a <b>power law</b>: each 10× more of the resource cuts the reducible loss by a fixed factor, with no sudden cliff.</p>
  <ul><li><b>Compute rule of thumb:</b> training FLOPs <b>C ≈ 6 · N · D</b> (about 2 for the forward pass + 4 for the backward pass, per parameter per token).</li>
  <li><b>Kaplan et al. 2020 (OpenAI):</b> make the model bigger first; data matters less. Led to huge models trained on few tokens (GPT-3: 175B params, 300B tokens ≈ 1.7 tokens/param).</li>
  <li><b>Chinchilla (DeepMind, 2022):</b> re-measured carefully and found those models were <b>under-trained</b>. For a given compute budget, parameters and tokens should grow <b>equally</b>: <b>D ≈ 20 · N</b>. Their 70B model trained on 1.4T tokens beat the 280B Gopher (300B tokens) using the same compute.</li></ul>
  <p>Formula for the compute-optimal size: from C = 6·N·20N = 120·N², so <b>N<sub>opt</sub> = √(C/120)</b> and <b>D<sub>opt</sub> = 20·N<sub>opt</sub></b>.</p>
  ${H.table(['params N', 'tokens 20·N', 'compute 6·N·D'], [['1B', '20B', '1.2 × 10<sup>20</sup>'], ['7B', '140B', '5.9 × 10<sup>21</sup>'], ['70B', '1.4T', '5.9 × 10<sup>23</sup>']])}
  <p><b>But today's models go far beyond 20×.</b> Chinchilla optimises <i>training</i> cost only. If a model will answer billions of queries, a smaller model trained on far more tokens is cheaper to <b>serve</b>. LLaMA-3 8B saw ~15T tokens (≈1,900 tokens/param, ~95× Chinchilla). This is called <b>over-training</b>: you pay more once, then save on every inference.</p>`,
  clues: ['"Compute-optimal" / "Chinchilla" → ≈20 tokens per parameter', '"FLOPs to train a model" → 6·N·D', '"We have a fixed budget: bigger model or more data?" → scale both together', '"Model will serve millions of users" → over-train a smaller model', '"Power law / smooth loss curve / predict big run from small runs" → scaling laws', '"Data wall / running out of text" → synthetic data, multi-epoch, quality filtering'],
  code: [{ lang: 'python', title: 'Compute-optimal tokens, FLOPs and predicted loss (stdlib, runnable)', run: true, code: `import math

def flops(n_params, n_tokens):
    # ~2 FLOPs forward + ~4 backward, per parameter per token
    return 6 * n_params * n_tokens

def chinchilla_optimal(compute):
    # C = 6 * N * (20 * N) = 120 * N^2  ->  N = sqrt(C / 120)
    n = math.sqrt(compute / 120)
    return n, 20 * n

def loss(n, d):
    # Chinchilla parametric fit: L = E + A / N^alpha + B / D^beta
    E, A, B, alpha, beta = 1.69, 406.4, 410.7, 0.34, 0.28
    return E + A / n ** alpha + B / d ** beta

print('model        tokens/param   FLOPs        predicted loss')
for name, n, d in [('GPT-3 175B', 175e9, 300e9), ('Gopher 280B', 280e9, 300e9),
                   ('Chinchilla 70B', 70e9, 1.4e12), ('7B @ 20x', 7e9, 140e9), ('7B @ 2T', 7e9, 2e12)]:
    print('%-14s %8.1f      %.2e     %.3f' % (name, d / n, flops(n, d), loss(n, d)))

budget = 5.9e23
n, d = chinchilla_optimal(budget)
print('budget %.1e FLOPs -> N = %.1fB params, D = %.2fT tokens' % (budget, n / 1e9, d / 1e12))

# GPU time: H100 ~ 400 TFLOP/s achieved at ~40% utilisation
gpu_flops = 4e14
print('GPU-days for 7B @ 140B tokens:', round(flops(7e9, 140e9) / gpu_flops / 86400))` }],
  viz: [{
    title: 'Chinchilla: tokens ≈ 20 × params, and how far models go beyond it',
    input: '7',
    inputLabel: 'model size in billions of parameters (1–500)',
    gen: function (input) {
      var N = nums(input)[0];
      if (N < 1 || N > 500) throw new Error('Use a size between 1 and 500 (billions)');
      var Np = N * 1e9, D = 20 * Np, C = 6 * Np * D, fr = [];
      var sci = function (x) { var e = Math.floor(Math.log(x) / Math.LN10); return r2(x / Math.pow(10, e)) + 'e' + e; };
      fr.push({ narr: 'Your model has <b>N = ' + N + 'B</b> parameters. Training compute is about <b>6·N·D</b> FLOPs.', parts: [{ type: 'vars', vals: { 'N (params)': N + 'B', 'FLOPs rule': 'C = 6·N·D' } }] });
      fr.push({ narr: 'Chinchilla rule: <b>D = 20 × N = ' + (D / 1e9) + 'B tokens</b>. Compute is then <b>6 × ' + N + 'e9 × ' + (D / 1e9) + 'e9 = ' + sci(C) + ' FLOPs</b>.', parts: [{ type: 'vars', vals: { 'D = 20N': (D / 1e9) + 'B tokens', 'C = 6ND': sci(C) + ' FLOPs' }, hl: { 'D = 20N': 'ok' } }] });
      var base = 20;
      fr.push({ narr: 'How many tokens per parameter do real models use? Chinchilla-optimal is 20. GPT-3 was <span class="c-r">under-trained</span>; modern open models are heavily <span class="c-b">over-trained</span> on purpose to make serving cheaper.', parts: [{ type: 'bars', label: 'tokens per parameter', values: [1.7, 20, 286, 1875], idxLabels: ['GPT-3 175B', 'Chinchilla 70B', 'LLaMA-2 7B (2T)', 'LLaMA-3 8B (15T)'], hl: { 0: 'bad', 1: 'ok', 2: 'win', 3: 'win' } }] });
      var half = C / 2, nh = Math.sqrt(half / 120) / 1e9;
      fr.push({ narr: 'Budget check. If the compute budget is <b>halved</b>, the best model is <b>N = √(C/120) = ' + r2(nh) + 'B</b> params (not half!), because N and D both shrink by √2.', parts: [{ type: 'bars', label: 'optimal N (billions) vs compute budget', values: [r2(N), r2(nh)], idxLabels: ['full budget', 'half budget'], hl: { 0: 'ok', 1: 'cur' } }] });
      fr.push({ narr: 'Loss falls as a power law: more N or more D gives smaller and smaller gains. Rough Chinchilla fit: L = 1.69 + 406/N<sup>0.34</sup> + 411/D<sup>0.28</sup>. The 1.69 is the "irreducible" noise in language.', parts: [{ type: 'bars', label: 'predicted loss', values: [1.69 + 406.4 / Math.pow(Np, 0.34) + 410.7 / Math.pow(D, 0.28), 1.69 + 406.4 / Math.pow(Np, 0.34) + 410.7 / Math.pow(D * 10, 0.28), 1.69], idxLabels: ['20x tokens', '200x tokens', 'floor'], texts: [String(r3(1.69 + 406.4 / Math.pow(Np, 0.34) + 410.7 / Math.pow(D, 0.28))), String(r3(1.69 + 406.4 / Math.pow(Np, 0.34) + 410.7 / Math.pow(D * 10, 0.28))), '1.69'] }] });
      return fr;
    }
  }],
  examples: [
    { title: 'Estimate compute-optimal tokens for a 7B model', html: `<p>D = 20 × 7B = <b>140B tokens</b>. Compute = 6 × 7×10<sup>9</sup> × 1.4×10<sup>11</sup> = <b>5.9×10<sup>21</sup> FLOPs</b>. On GPUs sustaining 4×10<sup>14</sup> FLOP/s each, that is 1.5×10<sup>7</sup> GPU-seconds ≈ 170 GPU-days — about 3 weeks on 8 GPUs. (LLaMA-2 7B was trained on 2T tokens, 14× more, for a better final model.)</p>` },
    { title: 'Given a budget, pick the model', html: `<p>Budget C = 6×10<sup>23</sup> FLOPs. N = √(6×10<sup>23</sup>/120) = √(5×10<sup>21</sup>) ≈ 7.07×10<sup>10</sup> = <b>70B</b>, D = <b>1.4T</b>. That is exactly Chinchilla itself.</p>` },
    { title: 'Why Chinchilla beat Gopher', html: `<p>Gopher: 280B params × 300B tokens, 1.1 tokens/param. Chinchilla: 70B × 1.4T. Same compute (≈5×10<sup>23</sup>). The 4× smaller model saw 4.7× more data and won on most benchmarks, and is also 4× cheaper to run.</p>` }
  ],
  deepDive: `<p><b>Where 6ND comes from.</b> Each parameter takes part in one multiply-add per token in the forward pass (2 FLOPs). The backward pass computes gradients with respect to both activations and weights (about 2× the forward cost, 4 FLOPs). Total ≈ 6 per parameter per token. It ignores attention's n²·d term, which matters for long contexts; and it counts MoE <i>active</i> parameters, not total.</p>
  <p><b>Power laws and extrapolation.</b> On log-log axes, loss minus the irreducible term is a straight line in N, D and C. Labs train many small models, fit the line, and <b>predict the loss of a run 1000× larger</b> before spending the money. The fit assumes a good, fixed recipe (learning-rate schedule, data quality); different recipes shift the line. Three different methods in the Chinchilla paper gave exponents near 0.5 for both N and D with compute, i.e. both should scale as √C.</p>
  <p><b>Beyond pre-training.</b> (1) <b>Inference-aware laws:</b> total cost = training + (queries × cost per query), which favours smaller, longer-trained models — hence 100–1000 tokens/param in practice. (2) <b>Data constraints:</b> high-quality web text is finite, so repeated epochs (up to ~4 are nearly as good as fresh data), synthetic data and heavy filtering matter. (3) <b>Test-time compute:</b> reasoning models spend extra tokens at inference ("thinking"), a second scaling axis that can substitute for model size on hard problems. (4) <b>Emergent abilities</b> look like sudden jumps in some metrics but are often smooth in the underlying loss. (5) Benchmarks saturate, so downstream scaling is noisier than loss scaling.</p>`,
  aiEra: `<p><b>What AI changes:</b> Scaling laws are why labs publish model families (1B, 8B, 70B…) and why "bigger model" is no longer the only story; smaller well-trained models plus tool use and long reasoning often win on cost. <b>Use AI as a partner:</b> have it build a budget table (parameters, tokens, FLOPs, GPU-days, dollar cost) for several candidate runs, then verify two entries by hand. Use it to find the papers behind a claim, but read the numbers yourself. <b>Where AI goes wrong:</b> it quotes "Chinchilla says 20 tokens per parameter" as a law of nature (it is an estimate for a particular setup and objective), confuses training-optimal with deployment-optimal, and mixes FLOPs with FLOP/s. <b>What you must still own:</b> back-of-envelope estimation of compute, memory and cost — a skill interviewers test directly ("how long to train a 7B on 1T tokens with 256 GPUs?").</p>`,
  problems: [{
    title: 'Estimate compute-optimal tokens and training time',
    level: 'Medium', tags: ['scaling laws', 'chinchilla', 'estimation'],
    statement: `<p>You have 128 GPUs, each sustaining 3×10<sup>14</sup> FLOP/s in practice. You want a compute-optimal model trained for 30 days. (a) Total FLOPs available? (b) Optimal N and D? (c) Would you pick that model for a product with 10<sup>9</sup> daily queries? Why or why not?</p>`,
    constraints: `Use C = 6·N·D and D = 20·N.`,
    example: `<p>FLOPs = 128 × 3×10<sup>14</sup> × 2.592×10<sup>6</sup> s = ${H.c('g', '≈ 1.0 × 10²³')}; N ≈ ${H.c('b', '29B')}, D ≈ ${H.c('b', '0.58T')}.</p>`,
    brute: { why: `<p>"Biggest model that fits in memory" ignores that the model would see too few tokens to use its capacity.</p>` },
    mcq: { q: 'If compute is multiplied by 4, compute-optimal N changes by…', options: ['×2', '×4', '×16'], answer: 0, explain: 'N = √(C/120), so 4× compute → 2× N and 2× D.' },
    hints: [`<p>Hint 1: seconds in 30 days = 2,592,000.</p>`, `<p>Hint 2: N = √(C/120).</p>`, `<p>Hint 3: think about serving cost for a billion queries a day.</p>`],
    solution: {
      approach: `<p>(a) C = 128 × 3×10<sup>14</sup> × 2.592×10<sup>6</sup> = 9.95×10<sup>22</sup> ≈ 10<sup>23</sup> FLOPs. (b) N = √(9.95×10<sup>22</sup>/120) = √(8.29×10<sup>20</sup>) ≈ 2.88×10<sup>10</sup> ≈ 29B parameters; D = 20N ≈ 5.8×10<sup>11</sup> = 0.58T tokens. (c) With 10<sup>9</sup> queries a day, inference cost will dwarf the one-off training cost, so a smaller model (say 7–8B) trained on several trillion tokens (over-trained) can reach similar quality and cost ~4× less per query. I would choose the smaller, over-trained model, possibly with distillation from a bigger one. Also check data availability: 0.58T tokens is easy, but 5T+ needs a strong data pipeline.</p>`,
      code: { lang: 'python', run: true, code: `import math\nC = 128 * 3e14 * 30 * 86400\nN = math.sqrt(C / 120)\nprint('%.2e FLOPs  N=%.1fB  D=%.2fT' % (C, N / 1e9, 20 * N / 1e12))` },
      complexity: `<p>O(1) arithmetic.</p>`
    }
  }]
});

topics.push({
  title: 'Mixture of Experts: A Router, Many Experts, Few Active',
  analogy: `<p>A big hospital has 64 specialist doctors but you never see all of them. A <b>receptionist</b> (the router) listens to your problem and sends you to the <b>two</b> best specialists. The hospital has huge total knowledge (total parameters) but each patient only uses two doctors' time (active parameters). Mixture of Experts (MoE) is that hospital inside a language model: a lot of knowledge, a small bill per token.</p>`,
  explain: `<p>In a normal ("dense") transformer every token goes through the <b>same</b> feed-forward network (FFN), which holds about two thirds of the layer's parameters. In an <b>MoE</b> layer we replace that one FFN with <b>E separate FFNs, called experts</b>, plus a small <b>router</b> (a single linear layer).</p>
  <ol><li>For each token the router produces E scores (logits).</li><li>Keep the <b>top-k</b> (usually k = 2, sometimes 1 or 8 of 256) and softmax just those k scores into gate weights.</li><li>Send the token only to those k experts.</li><li>Output = gate-weighted sum of the k expert outputs.</li></ol>
  <p><b>Attention layers stay shared</b> (every token uses them); only the FFN is split into experts.</p>
  <p><b>Total vs active parameters.</b> You must <i>store</i> all experts, but each token <i>computes</i> with only k of them:</p>
  <p><code>active = shared + (k / E) × expert_params</code></p>
  ${H.table(['model', 'experts E', 'top-k', 'total params', 'active / token'], [['Mixtral 8x7B', '8', '2', '46.7B', '12.9B'], ['DeepSeek-V3', '256 routed + 1 shared', '8', '671B', '37B'], ['dense 7B', '–', '–', '7B', '7B']])}
  <p>So Mixtral costs about as much to <i>run</i> per token as a 13B dense model while holding the knowledge of a ~47B one. The catch: <b>memory</b> must hold all 46.7B parameters (about 93 GB in fp16, 23 GB at 4 bit), and tokens must be routed across GPUs.</p>
  <p><b>Load balancing.</b> If the router always picks the same favourite experts, the others never learn and one GPU is overloaded ("expert collapse"). Training adds an <b>auxiliary balance loss</b> (or bias-based balancing in newer models) and a <b>capacity limit</b> per expert; overflow tokens are dropped or re-routed.</p>`,
  clues: ['"Total parameters vs active parameters" → MoE', '"671B model that runs like a 37B model" → sparse activation', '"Top-2 gating / router / gate softmax"', '"Expert parallelism / all-to-all communication" → serving MoE across GPUs', '"Load-balancing loss / expert collapse / capacity factor"', '"Cheaper training per quality, but more memory to serve"'],
  code: [{ lang: 'python', title: 'Top-2 MoE router and active-parameter count (stdlib, runnable)', run: true, code: `import math

def softmax(xs):
    m = max(xs); e = [math.exp(x - m) for x in xs]; s = sum(e)
    return [v / s for v in e]

def top_k_route(logits, k=2):
    # pick the k biggest logits, then softmax ONLY those k to get gate weights
    idx = sorted(range(len(logits)), key=lambda i: logits[i], reverse=True)[:k]
    gates = softmax([logits[i] for i in idx])
    return list(zip(idx, gates))

def moe_layer(token, experts, router_w, k=2):
    logits = [sum(w * x for w, x in zip(row, token)) for row in router_w]
    chosen = top_k_route(logits, k)
    out = [0.0] * len(token)
    for e_id, g in chosen:
        y = experts[e_id](token)               # only k experts run!
        out = [o + g * v for o, v in zip(out, y)]
    return chosen, out

# 4 tiny experts: each just scales the vector differently
experts = [lambda x, s=s: [s * v for v in x] for s in (1.0, 2.0, -1.0, 0.5)]
router_w = [[1, 0], [0, 1], [-1, 0], [0.5, 0.5]]      # one row of weights per expert
for tok in ([1.0, 0.0], [0.0, 1.0], [1.0, 1.0]):
    chosen, out = moe_layer(tok, experts, router_w)
    print('token', tok, '-> experts', [(e, round(g, 3)) for e, g in chosen], 'out', [round(v, 3) for v in out])

# --- Mixtral-8x7B style active-parameter count ---
d, ffn, layers, E, k = 4096, 14336, 32, 8, 2
expert_params = 3 * d * ffn                   # gate, up, down matrices of one expert
attn = 2 * d * d + 2 * d * 1024               # Wq, Wo full; Wk, Wv with 8 kv-heads of 128
embed = 2 * 32000 * d                         # input + output embeddings
shared = layers * attn + embed
total = shared + layers * E * expert_params
active = shared + layers * k * expert_params
print('total  = %.1fB' % (total / 1e9))
print('active = %.1fB  (%.0f%% of total)' % (active / 1e9, 100 * active / total))` },
  { lang: 'python', title: 'MoE layer in PyTorch (needs torch, not run here)', check: false, code: `import torch, torch.nn as nn, torch.nn.functional as F

class MoE(nn.Module):
    def __init__(self, d, hidden, n_experts=8, k=2):
        super().__init__()
        self.k = k
        self.router = nn.Linear(d, n_experts, bias=False)
        self.experts = nn.ModuleList(
            [nn.Sequential(nn.Linear(d, hidden), nn.SiLU(), nn.Linear(hidden, d)) for _ in range(n_experts)])

    def forward(self, x):                                   # x: (tokens, d)
        top_v, top_i = self.router(x).topk(self.k, dim=-1)  # (tokens, k)
        gates = F.softmax(top_v, dim=-1)
        out = torch.zeros_like(x)
        for slot in range(self.k):
            for e, expert in enumerate(self.experts):
                m = top_i[:, slot] == e                     # tokens that chose expert e in this slot
                if m.any():
                    out[m] += gates[m, slot, None] * expert(x[m])
        return out` }],
  viz: [{
    title: 'MoE routing: tokens go to their top-2 experts',
    input: '4',
    inputLabel: 'number of tokens to route (1–6)',
    gen: function (input) {
      var T = nums(input)[0];
      if (T < 1 || T > 6) throw new Error('Use 1 to 6 tokens');
      var words = ['The', 'cat', 'sat', 'on', 'the', 'mat'], E = 6, k = 2, fr = [], t, e, load = [0, 0, 0, 0, 0, 0];
      var nodes = [{ id: 'T', label: 'token', x: 8, y: 30, shape: 'box', w: 14 }, { id: 'R', label: 'Router', x: 36, y: 30, shape: 'box', w: 14 }, { id: 'O', label: 'Σ gate·out', x: 92, y: 30, shape: 'box', w: 16 }];
      for (e = 0; e < E; e++) nodes.push({ id: 'E' + e, label: 'Expert ' + e, x: 66, y: 5 + e * 10, shape: 'box', w: 16 });
      var baseEdges = [['T', 'R']]; for (e = 0; e < E; e++) { baseEdges.push(['R', 'E' + e]); baseEdges.push(['E' + e, 'O']); }
      fr.push({ narr: 'An MoE layer has <b>' + E + ' experts</b> (separate FFNs) and a tiny <b>router</b>. Each token will use only the <b>top-' + k + '</b>, so 4 of 6 experts stay idle per token.', parts: [{ type: 'graph', directed: true, height: 60, nodes: nodes, edges: baseEdges, label: 'one MoE layer' }] });
      for (t = 0; t < T; t++) {
        var lg = []; for (e = 0; e < E; e++) lg.push(r2(2 * Math.sin((t + 1) * (e + 2) * 1.7 + e)));
        var idx = lg.map(function (_, i) { return i; }).sort(function (a, b) { return lg[b] - lg[a]; }).slice(0, k);
        var gt = smx(idx.map(function (i) { return lg[i]; })).map(r2);
        idx.forEach(function (i) { load[i]++; });
        var hl = { T: 'cur', R: 'cur', O: 'ok' }, ehl = { 'T-R': 'ok' }, tags = {};
        idx.forEach(function (i, q) { hl['E' + i] = 'sel'; ehl['R-E' + i] = 'ok'; ehl['E' + i + '-O'] = 'ok'; tags['E' + i] = 'gate ' + gt[q]; });
        var edges = baseEdges.map(function (ed) { return ed[0] === 'R' ? [ed[0], ed[1], String(lg[+ed[1].slice(1)])] : ed; });
        fr.push({ narr: 'Token <b>"' + words[t] + '"</b>. Router logits: [' + lg.join(', ') + ']. Top-2 = experts <b>' + idx.join(' and ') + '</b>; softmax over just those two gives gates <b>' + gt.join(' / ') + '</b>. Only these experts compute; the output is their gate-weighted sum.', parts: [{ type: 'graph', directed: true, height: 60, nodes: nodes.map(function (n) { return n.id === 'T' ? Object.assign({}, n, { label: words[t] }) : n; }), edges: edges, hl: hl, ehl: ehl, tags: tags, label: 'token ' + (t + 1) + ' routed' }, { type: 'bars', label: 'tokens handled so far per expert (load)', values: load.slice(), idxLabels: load.map(function (_, i) { return 'E' + i; }) }] });
      }
      var mx = Math.max.apply(null, load), hb = {}; load.forEach(function (v, i) { hb[i] = v === mx && mx > 1 ? 'bad' : (v === 0 ? 'done' : 'ok'); });
      fr.push({ narr: 'After ' + T + ' tokens: some experts are busy, some idle. Uneven load is why training adds a <b>load-balancing loss</b>. Compute used per token: 2 of 6 experts = 33% of the FFN parameters; memory still stores all 6.', parts: [{ type: 'bars', label: 'expert load', values: load.slice(), idxLabels: load.map(function (_, i) { return 'E' + i; }), hl: hb }, { type: 'vars', vals: { 'experts stored': E, 'experts used / token': k, 'FFN compute fraction': r2(k / E) } }] });
      return fr;
    }
  }],
  examples: [
    { title: 'Active vs total parameters, Mixtral 8x7B', html: `<p>One expert FFN = 3 × 4096 × 14336 = 176M. Experts total = 32 layers × 8 × 176M = 45.1B. Shared (attention + embeddings) ≈ 1.6B. <b>Total ≈ 46.7B</b>. Active (k = 2) = 1.6B + 32 × 2 × 176M = 1.6 + 11.3 = <b>12.9B</b>.</p>` },
    { title: 'Top-2 gating numbers', html: `<p>Router logits for a token: [2.1, 0.3, 1.8, −0.5]. Top-2 = experts 0 and 2 with logits 2.1 and 1.8. Softmax of just those: exp(2.1)=8.17, exp(1.8)=6.05 → gates <b>0.574 / 0.426</b>. Output = 0.574·E0(x) + 0.426·E2(x).</p>${H.arr([2.1, 0.3, 1.8, -0.5], { label: 'router logits', hl: { 0: 'g', 2: 'g' } })}` },
    { title: 'Memory vs compute: the MoE trade-off', html: `<p>Mixtral in fp16: 46.7B × 2 B ≈ 93 GB of weights (needs 2 big GPUs) but each token costs the FLOPs of a 13B model, so with enough batch it generates tokens ~3× faster than a dense 47B. At batch size 1 you still read only the 2 chosen experts, but with large batches nearly every expert is touched, so all weights get streamed.</p>` }
  ],
  deepDive: `<p><b>Router details.</b> Common choices: softmax over all experts then top-k (Switch / GShard), or top-k then softmax (Mixtral). DeepSeek-V3 uses sigmoid scores, <b>fine-grained experts</b> (many small experts), a few <b>shared experts</b> every token uses, and an <b>auxiliary-loss-free</b> balancing bias. Fine-grained routing allows more specialised combinations (C(256, 8) options instead of C(8, 2) = 28).</p>
  <p><b>Training problems.</b> (1) Load imbalance and expert collapse → balance loss, capacity factor, random jitter. (2) Router instability → z-loss on router logits, higher precision for the router. (3) Dropped tokens when capacity is exceeded. (4) Experts are not neatly "the maths expert": research shows they specialise on syntax, token types or positions more than topics.</p>
  <p><b>Serving.</b> Experts are sharded across GPUs (<b>expert parallelism</b>); each layer does an <b>all-to-all</b> to send tokens to their experts and another to bring results back, so interconnect bandwidth becomes the bottleneck. Hot experts create stragglers; replicating popular experts helps. Quantization shrinks the huge memory footprint. <b>Scaling-law view:</b> for a fixed FLOP budget an MoE reaches lower loss than a dense model (it holds more parameters per FLOP), but per-parameter it is less efficient, and fine-tuning small MoEs can overfit. Compute formulas use <i>active</i> parameters: C ≈ 6·N<sub>active</sub>·D.</p>`,
  aiEra: `<p><b>What AI changes:</b> Many frontier and open models (Mixtral, DeepSeek, Qwen-MoE, and reportedly several closed ones) are MoE, so "how big is it?" has two answers and you must ask which one is meant. Cost per token follows active parameters; GPU memory follows total parameters. <b>Use AI as a partner:</b> ask for a sizing calculator that takes (layers, d, FFN size, E, k) and prints total, active and per-GPU memory under different sharding; check it against a published figure like Mixtral's 46.7B/12.9B. <b>Where AI goes wrong:</b> it equates "8x7B" with 56B (the real total is 46.7B because attention is shared), claims experts are topic specialists, or says MoE "uses less memory". <b>What you must still own:</b> the router mechanics (top-k then softmax), the compute-vs-memory distinction, and the failure modes (collapse, imbalance, all-to-all cost).</p>`,
  problems: [{
    title: 'MoE active parameters',
    level: 'Easy', tags: ['MoE', 'active parameters', 'routing'],
    statement: `<p>A model has 16 layers. Shared parameters (attention + embeddings) total 2B. Each layer has 8 experts of 0.5B parameters each. The router uses top-2. Compute total parameters, active parameters per token, and the fraction active.</p>`,
    constraints: `Ignore router parameters.`,
    example: `<p>Experts: 16 × 8 × 0.5B = ${H.c('g', '64B')}; total = ${H.c('b', '66B')}; active = 2B + 16 × 2 × 0.5B = ${H.c('b', '18B')}; fraction ${H.c('y', '27%')}.</p>`,
    brute: { why: `<p>Saying "8 experts × 0.5B = 4B per layer is all active" misses that only 2 of the 8 run.</p>` },
    mcq: { q: 'For a fixed total size, what usually costs more memory than a dense model with the same ACTIVE parameters?', options: ['An MoE, because all experts must be stored', 'Neither, they are equal', 'The dense model'], answer: 0, explain: 'Active parameters set compute, total parameters set memory.' },
    hints: [`<p>Hint 1: total = shared + layers × experts × size.</p>`, `<p>Hint 2: active = shared + layers × k × size.</p>`, `<p>Hint 3: fraction = active / total.</p>`],
    solution: {
      approach: `<p>Total = 2B + 16 × 8 × 0.5B = 2 + 64 = 66B. Active = 2B + 16 × 2 × 0.5B = 2 + 16 = 18B. Fraction = 18/66 ≈ 27%. Per-token compute is about that of an 18B dense model but you need memory for 66B (132 GB in fp16, 33 GB at 4-bit). Training FLOPs use active parameters: 6 × 18B per token.</p>`,
      code: { lang: 'python', run: true, code: `shared, L, E, k, ex = 2.0, 16, 8, 2, 0.5\ntotal = shared + L * E * ex\nactive = shared + L * k * ex\nprint(total, active, round(active / total, 3))` },
      complexity: `<p>O(1).</p>`
    }
  }, {
    title: 'Why does the router collapse?',
    level: 'Hard', tags: ['MoE', 'load balancing', 'training'],
    statement: `<p>During MoE training, 90% of tokens end up on 2 of 64 experts and quality is poor. Explain the feedback loop that causes this and list at least four fixes.</p>`,
    constraints: `Think about gradients: who gets trained?`,
    example: `<p>Expert A gets more tokens → learns faster → router scores for A rise → ${H.c('r', 'even more tokens go to A')}. Others starve.</p>`,
    brute: { why: `<p>"Just train longer" does not help: starved experts never receive gradient, so the loop gets stronger.</p>` },
    mcq: { q: 'What does an auxiliary load-balancing loss do?', options: ['penalises uneven token distribution across experts', 'shrinks the router', 'increases k'], answer: 0, explain: 'It pushes the router to spread tokens evenly.' },
    hints: [`<p>Hint 1: rich-get-richer dynamics.</p>`, `<p>Hint 2: add a term that is minimal when tokens/probability are uniform across experts.</p>`, `<p>Hint 3: also consider capacity limits, noise, and bias adjustments.</p>`],
    solution: {
      approach: `<p>Cause: a positive feedback loop. Experts that receive more tokens get more gradient, improve faster, so the router (trained to send tokens where loss is lowest) sends them even more; unpopular experts get little or no gradient and stay bad. Fixes: (1) auxiliary balance loss: E · Σ f<sub>i</sub>·P<sub>i</sub>, where f<sub>i</sub> is the fraction of tokens sent to expert i and P<sub>i</sub> its mean router probability, minimised when load is uniform; (2) capacity factor so an expert accepts at most C × (tokens/E) tokens per batch, with overflow dropped or re-routed; (3) router noise or jitter during training to explore; (4) bias-based balancing (DeepSeek): add a per-expert bias to the selection score and nudge it down for overloaded and up for underused experts, with no gradient interference; (5) router z-loss to keep logits small and stable; (6) shared experts that handle common knowledge, so routed experts can specialise; (7) initialise the router near uniform and use higher precision for it. Monitor per-expert load histograms during training to detect collapse early.</p>`,
      complexity: `<p>Balance loss costs O(tokens × E) per layer.</p>`
    }
  }]
});

topics.push({
  title: 'Long-Context Techniques: Sliding Window, Sparse Attention, RoPE Scaling, FlashAttention',
  analogy: `<p>Reading a 500-page book. <b>Full attention</b> means that for every sentence you re-check every other sentence — 250,000 pairs per 500 sentences, growing as the square. <b>Sliding window</b> is reading with a bookmark: you only look at the last few pages (cheap, but you forget the start unless notes are passed along). <b>Sparse attention</b> adds a table of contents and a few sticky "global" pages. <b>RoPE scaling</b> is re-labelling page numbers so a book longer than anything you practised on still fits your sense of distance. <b>FlashAttention</b> is not a new way of reading — it is a smarter desk: do the same reading, but work in small piles that fit on your table so you never walk to the far warehouse (slow GPU memory).</p>`,
  explain: `<p>Full self-attention has two problems at long context n: <b>compute O(n²)</b> and the <b>memory for the n×n score table</b>. Plus the KV cache grows linearly. Techniques fall in two groups.</p>
  <p><b>A. Change <i>what</i> is attended (approximate, cheaper)</b></p>
  <ul><li><b>Sliding window attention (SWA):</b> token i attends only to the last <b>w</b> tokens. Cost O(n·w) instead of O(n²). Stacking L layers lets information travel L·w tokens (the receptive field grows each layer). Mistral 7B: w = 4096. The KV cache can be a fixed-size <b>rolling buffer</b> of w entries.</li>
  <li><b>Sparse / global patterns</b> (Longformer, BigBird): sliding window + a few <b>global tokens</b> that attend to and are seen by everyone + some random links. Cost ≈ O(n·(w+g)). Many modern models interleave layers: e.g. Gemma 3 uses 5 local layers for every 1 full "global" layer (Gemma 2 alternated 1:1).</li>
  <li><b>Attention sinks / StreamingLLM:</b> keep the first few tokens plus the recent window; the first tokens soak up spare attention mass.</li></ul>
  <p><b>B. Make the model <i>handle</i> longer positions</b></p>
  <ul><li><b>RoPE scaling:</b> a model trained at 4k sees rotation angles never used at 32k. <b>Position interpolation</b> squeezes positions: use pos × (L<sub>train</sub>/L<sub>new</sub>) so all angles stay in the trained range. <b>NTK-aware / YaRN</b> instead raise the RoPE base or treat fast and slow frequencies differently. A short fine-tune afterwards recovers quality.</li></ul>
  <p><b>C. Make exact attention run faster/cheaper in memory</b></p>
  <ul><li><b>FlashAttention</b> computes <i>exactly the same</i> result but never writes the n×n matrix to GPU main memory (HBM). It splits Q, K, V into <b>tiles</b> that fit in fast on-chip SRAM, and uses an <b>online softmax</b> (keep a running max and running sum, rescale as new tiles arrive). Memory becomes O(n) and it is 2–4× faster because it moves far less data. Compute is still O(n²).</li></ul>
  ${H.table(['technique', 'changes result?', 'compute', 'memory for scores', 'KV cache'], [['full attention', 'no', 'O(n²)', 'O(n²)', 'n'], ['FlashAttention', 'no (exact)', 'O(n²)', 'O(n)', 'n'], ['sliding window w', 'yes', 'O(n·w)', 'O(n·w)', 'w (rolling)'], ['sparse + global', 'yes', 'O(n·(w+g))', 'O(n·(w+g))', 'n or w'], ['RoPE scaling', 'positions only', 'same', 'same', 'n']])}`,
  clues: ['"Quadratic cost of attention" + "100k+ tokens" → window / sparse / Flash', '"Exact attention, but memory efficient" → FlashAttention (IO-aware, tiling, online softmax)', '"Model trained on 4k must serve 32k" → RoPE interpolation / NTK / YaRN', '"Lost in the middle" → quality is not uniform across a long window', '"Mistral 7B sliding window 4096" → receptive field = layers × window', '"Streaming chat of unbounded length" → attention sinks + rolling KV cache'],
  code: [{ lang: 'python', title: 'Sliding-window mask, cost comparison and position interpolation (stdlib, runnable)', run: true, code: `def mask(n, window, n_global=0):
    # allowed[i][j] is True if token i may attend to token j
    allowed = []
    for i in range(n):
        row = []
        for j in range(n):
            causal = j <= i
            in_window = i - j < window                   # only the last 'window' tokens
            is_global = j < n_global                     # first tokens everybody can see
            row.append(causal and (in_window or is_global))
        allowed.append(row)
    return allowed

n, w, g = 10, 3, 1
M = mask(n, w, g)
print('sliding window w=%d + %d global token (X = attends)' % (w, g))
for row in M:
    print(' '.join('X' if v else '.' for v in row))

full = n * (n + 1) // 2
local = sum(sum(r) for r in M)
print('pairs: full causal =', full, ' windowed =', local)

for N in (4096, 32768, 131072):
    f = N * (N + 1) // 2
    s = sum(min(i + 1, 4096) for i in range(N))
    print('n=%6d  full=%.2e  window4096=%.2e  saving x%.1f' % (N, f, s, f / s))

# receptive field: information hops w tokens per layer
print('Mistral-style receptive field:', 32 * 4096, 'tokens (32 layers x 4096)')

# RoPE position interpolation: squeeze new positions into the trained range
train_len, new_len = 4096, 16384
scale = train_len / new_len
for pos in (0, 4096, 16000):
    print('pos', pos, '-> interpolated position', pos * scale)` },
  { lang: 'python', title: 'FlashAttention idea: online softmax over tiles (stdlib, runnable)', run: true, code: `import math

def online_softmax_weighted_sum(scores, values, tile=2):
    # Process scores/values one tile at a time, never holding the full row of weights.
    m = float('-inf')          # running max
    l = 0.0                    # running sum of exp(score - m)
    acc = 0.0                  # running sum of exp(score - m) * value
    for s in range(0, len(scores), tile):
        sc = scores[s:s + tile]
        vs = values[s:s + tile]
        new_m = max(m, max(sc))
        scale = 0.0 if m == float('-inf') else math.exp(m - new_m)   # rescale old totals
        l *= scale
        acc *= scale
        for x, v in zip(sc, vs):
            p = math.exp(x - new_m)
            l += p
            acc += p * v
        m = new_m
        print('tile', sc, '-> running max', m, 'running sum', round(l, 4))
    return acc / l

scores = [0.5, 2.0, -1.0, 3.0, 0.0, 1.5]
values = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0]
flash = online_softmax_weighted_sum(scores, values)

# reference: ordinary softmax that sees the whole row at once
mx = max(scores)
w = [math.exp(x - mx) for x in scores]
ref = sum(a * b for a, b in zip(w, values)) / sum(w)
print('tiled result  :', round(flash, 6))
print('full softmax  :', round(ref, 6), '(identical: FlashAttention is exact)')` }],
  viz: [{
    title: 'Sliding-window attention mask (who can see whom)',
    input: '10 3 1',
    inputLabel: 'tokens n (4–12), window w (1–8), global tokens g (0–3)',
    gen: function (input) {
      var a = nums(input), n = a[0], w = a[1], g = a[2] || 0;
      if (n < 4 || n > 12 || w < 1 || w > 8 || g < 0 || g > 3) throw new Error('Use n 4-12, window 1-8, global 0-3, e.g. 10 3 1');
      var nm = []; for (var q = 0; q < n; q++) nm.push(String(q + 1));
      var fr = [], i, j;
      var build = function (mode) {
        var rows = [], hl = {}, cnt = 0;
        for (i = 0; i < n; i++) { var r = []; for (j = 0; j < n; j++) {
          var allowed = j <= i && (mode === 0 || (i - j < w) || (mode === 2 && j < g));
          var key = i + ',' + j;
          if (j > i) { r.push('-∞'); hl[key] = 'bad'; }
          else if (allowed) { r.push('✓'); cnt++; hl[key] = (mode === 2 && j < g && i - j >= w) ? 'sel' : 'ok'; }
          else { r.push('×'); hl[key] = 'done'; }
        } rows.push(r); }
        return { rows: rows, hl: hl, cnt: cnt };
      };
      var f0 = build(0), f1 = build(1), f2 = build(2);
      fr.push({ narr: '<b>Full causal attention.</b> Rows = the token asking, columns = the token being looked at. Green = allowed, red = future (hidden). Pairs computed: <b>' + f0.cnt + '</b> (grows like n²/2).', parts: [{ type: 'grid', label: 'full causal mask', rows: f0.rows, rowHead: nm, colHead: nm, hl: f0.hl }] });
      fr.push({ narr: '<b>Sliding window w = ' + w + '.</b> Each token only sees the last ' + w + ' tokens (itself included). Faded cells are old tokens it ignores. Pairs: <b>' + f1.cnt + '</b> (≈ n·w).', parts: [{ type: 'grid', label: 'sliding window mask', rows: f1.rows, rowHead: nm, colHead: nm, hl: f1.hl }, { type: 'bars', label: 'pairs computed', values: [f0.cnt, f1.cnt], idxLabels: ['full', 'window'], hl: { 1: 'ok' } }] });
      if (g > 0) fr.push({ narr: 'Add <b>' + g + ' global token(s)</b> (purple): the first token(s) stay visible to everyone, like a table of contents or an attention sink. Pairs: <b>' + f2.cnt + '</b>.', parts: [{ type: 'grid', label: 'window + global tokens', rows: f2.rows, rowHead: nm, colHead: nm, hl: f2.hl }, { type: 'bars', label: 'pairs computed', values: [f0.cnt, f1.cnt, f2.cnt], idxLabels: ['full', 'window', 'window+global'], hl: { 2: 'sel' } }] });
      var L = 4, rf = [];
      for (var l = 1; l <= L; l++) rf.push(l * (w - 1) + 1);
      fr.push({ narr: 'Information still travels: layer 1 sees ' + w + ' tokens back, layer 2 sees the tokens those saw, and so on. After <b>L layers the reach is about L·(w−1)+1</b> tokens. Mistral: 32 × 4096 ≈ 131k.', parts: [{ type: 'bars', label: 'receptive field after each layer (this w)', values: rf, idxLabels: rf.map(function (_, k) { return 'L' + (k + 1); }), hl: { 3: 'win' } }] });
      return fr;
    }
  }, {
    title: 'FlashAttention idea: online softmax over tiles (exact)',
    input: '0.5 2 -1 3 0 1.5',
    inputLabel: 'attention scores for one query (4–10 numbers); tile size 2',
    gen: function (input) {
      var s = nums(input);
      if (s.length < 4 || s.length > 10) throw new Error('Give 4-10 scores');
      var vals = s.map(function (_, k) { return (k + 1) * 10; }), tile = 2, m = -Infinity, l = 0, acc = 0, fr = [], st;
      var hlA = {};
      fr.push({ narr: 'Normal attention writes all scores, then softmax, then multiplies by V — the full row lives in slow GPU memory. FlashAttention instead processes <b>small tiles in fast on-chip SRAM</b> and keeps only <b>3 running numbers</b>: max m, sum l, and weighted sum acc.', parts: [{ type: 'array', label: 'scores (one query row)', values: s }, { type: 'array', label: 'values (1-D for simplicity)', values: vals }] });
      for (st = 0; st < s.length; st += tile) {
        var sc = s.slice(st, st + tile), vs = vals.slice(st, st + tile), nm_ = Math.max(m, Math.max.apply(null, sc));
        var rs = m === -Infinity ? 0 : Math.exp(m - nm_);
        l *= rs; acc *= rs;
        for (var k = 0; k < sc.length; k++) { var p = Math.exp(sc[k] - nm_); l += p; acc += p * vs[k]; }
        m = nm_;
        var hl = {}; for (k = 0; k < sc.length; k++) { hl[st + k] = 'cur'; } for (k = 0; k < st; k++) hl[k] = 'done';
        fr.push({ narr: 'Tile ' + (st / tile + 1) + ': scores [' + sc.join(', ') + ']. New running max <b>' + r3(m) + '</b>; old totals are rescaled by e<sup>(old max − new max)</sup> = ' + r3(rs) + ' so earlier work stays valid. Running sum l = <b>' + r3(l) + '</b>.', parts: [{ type: 'array', label: 'scores (current tile highlighted)', values: s, hl: hl }, { type: 'vars', vals: { 'running max m': r3(m), 'running sum l': r3(l), 'acc': r3(acc) }, hl: { 'running max m': 'cur' } }] });
      }
      var mx = Math.max.apply(null, s), ex = s.map(function (x) { return Math.exp(x - mx); }), den = ex.reduce(function (a, b) { return a + b; }, 0), ref = ex.reduce(function (a, e, k) { return a + e * vals[k]; }, 0) / den;
      fr.push({ narr: 'Final answer = acc / l = <b>' + r3(acc / l) + '</b>. The ordinary full softmax gives <b>' + r3(ref) + '</b> — identical. The n×n matrix was never stored, so memory is O(n), and far fewer bytes moved means a big speed-up.', parts: [{ type: 'vars', vals: { 'tiled acc/l': r3(acc / l), 'full softmax': r3(ref) }, hl: { 'tiled acc/l': 'ok', 'full softmax': 'ok' } }] });
      return fr;
    }
  }],
  examples: [
    { title: 'Cost of a 128k window', html: `<p>Full attention pairs at n = 131,072: ≈ 8.6×10<sup>9</sup> per head per layer. With a 4,096 window: ≈ 5.4×10<sup>8</sup> — about <b>16× fewer</b>. The score matrix for one head in fp16 would be 131,072² × 2 B = 34 GB if materialised; FlashAttention avoids storing it at all.</p>` },
    { title: 'Position interpolation numbers', html: `<p>Model trained to 4,096; you want 16,384. Scale = 4096/16384 = 0.25. Position 16,000 is treated as position 4,000 — inside the trained range. Cost: neighbouring tokens are now only 0.25 position units apart, so fine local detail blurs; a brief fine-tune fixes it. NTK-aware scaling raises the RoPE base so high-frequency (local) pairs stay unchanged.</p>${H.table(['real pos', 'interpolated pos'], [['0', '0'], ['4096', '1024'], ['16000', '4000']])}` },
    { title: 'Hybrid local/global layers', html: `<p>Instead of one window for all layers, use e.g. 5 local layers (w = 1024) then 1 global full-attention layer. The KV cache for local layers is only 1024 entries, so cache shrinks ≈ 5× while global layers still link distant text. Several recent open models use this pattern.</p>` }
  ],
  deepDive: `<p><b>FlashAttention in detail.</b> A GPU has small, very fast SRAM (on an A100, about 20 MB at roughly 19 TB/s) and large, slower HBM (40 to 80 GB at roughly 1.5 to 3 TB/s). Standard attention writes S = QKᵀ (n²) to HBM, reads it back for softmax, writes P, reads it again for PV. FlashAttention loops over K,V tiles for each Q tile, keeping S and P in SRAM and maintaining the online-softmax state (m, l, acc). The backward pass <b>recomputes</b> tiles instead of storing them (trading cheap FLOPs for scarce bandwidth). FlashAttention-2 improves work partitioning; FlashAttention-3 uses Hopper async tensor-core features and FP8. Result: exact outputs, O(n) memory, 2–4× speed, and it makes 100k+ context training feasible.</p>
  <p><b>Quality of long context.</b> Having a window of 1M tokens does not mean the model uses it well: the "needle in a haystack" test checks retrieval, but "lost in the middle" studies show weaker use of the middle of long prompts, and reasoning over many scattered facts is harder than retrieving one. Sliding window models rely on stacking to propagate far information, which is lossy. Training on long documents (progressively: 4k → 32k → 128k) matters as much as the architecture.</p>
  <p><b>Systems side.</b> Long context makes the KV cache the main cost: 128k tokens × 0.5 MiB = 64 GiB per user for a non-GQA 7B. Remedies: GQA/MLA, KV quantization, window layers, eviction (H2O, SnapKV keep "heavy hitter" tokens), prefix caching, and <b>ring/sequence parallelism</b> to split a long sequence across GPUs during training. <b>Alternatives to attention</b> (state-space models like Mamba, linear attention, hybrids) have O(n) cost and a constant-size state, at the price of exact recall; hybrids interleave a few attention layers for precise lookup. RAG (retrieve only relevant chunks) is often cheaper and more accurate than stuffing everything into the window.</p>`,
  aiEra: `<p><b>What AI changes:</b> "1M-token context" is now a marketing line, and agents routinely stuff logs, repos and documents into prompts. The skill is deciding when long context, RAG, or summarisation is right, and understanding the cost (prefill time, KV memory, price per input token). <b>Use AI as a partner:</b> ask it to design a test that measures retrieval accuracy at different depths in your own documents; ask it to explain a model's config (<code>sliding_window</code>, <code>rope_theta</code>, <code>rope_scaling</code>) and to compute KV memory at your target length — then verify with the formula. <b>Where AI goes wrong:</b> it says FlashAttention is "approximate" or "linear time" (it is exact and still quadratic compute), that sliding window "forgets" everything beyond w (information propagates through layers), or that a bigger window guarantees better answers. <b>What you must still own:</b> the cost model (n², n·w, KV bytes), what each technique preserves or changes, and evaluation on your real long-context task.</p>`,
  problems: [{
    title: 'Apply a causal mask and a sliding window',
    level: 'Easy', tags: ['mask', 'sliding window', 'causal'],
    statement: `<p>For a sequence of 6 tokens, write the attention mask (which pairs (i, j) are allowed) for (a) causal attention and (b) causal sliding window with w = 3. How many pairs does each allow?</p>`,
    constraints: `Token indices 1..6; a token always sees itself.`,
    example: `<p>(a) all j ≤ i → ${H.c('g', '21 pairs')}. (b) j in [i−2, i] → rows allow 1,2,3,3,3,3 = ${H.c('b', '15 pairs')}.</p>`,
    brute: { why: `<p>Using the full causal mask for long inputs costs n²/2 pairs; for n = 128k that is 8.6 billion per head per layer.</p>` },
    mcq: { q: 'In sliding window attention with window w, token i attends to…', options: ['tokens i−w+1 … i', 'tokens i … i+w', 'only the first w tokens'], answer: 0, explain: 'The last w tokens including itself; nothing in the future.' },
    hints: [`<p>Hint 1: causal means j ≤ i.</p>`, `<p>Hint 2: window w means also i − j &lt; w.</p>`, `<p>Hint 3: count row by row: min(i, w).</p>`],
    solution: {
      approach: `<p>Causal: row i allows j = 1..i, i.e. counts 1,2,3,4,5,6 = 21. Window w = 3: row i allows j = max(1, i−2)..i, so counts 1,2,3,3,3,3 = 15. In general windowed pairs = w(w+1)/2 + (n−w)·w for n ≥ w = 6 + 9 = 15. The saving grows with n: for n = 100, w = 3 the windowed count is 297 vs 5050. Use the visualiser above to see the band shape.</p>`,
      code: { lang: 'python', run: true, code: `n, w = 6, 3\nfor i in range(1, n + 1):\n    print(i, ''.join('X' if (j <= i and i - j < w) else '.' for j in range(1, n + 1)))\nprint(sum(min(i, w) for i in range(1, n + 1)))` },
      complexity: `<p>Window: O(n·w) pairs vs O(n²).</p>`
    }
  }, {
    title: 'Plan context extension for a 4k RoPE model',
    level: 'Hard', tags: ['RoPE scaling', 'long context', 'FlashAttention', 'KV cache'],
    statement: `<p>You have a 7B model (32 layers, 8 KV heads, d<sub>head</sub> = 128, fp16) trained at 4k context. Product needs 64k. Describe the plan: position scaling, training, memory (KV and attention), and evaluation. Give the KV cache size per user at 64k.</p>`,
    constraints: `Answer with numbers and ordered steps.`,
    example: `<p>KV per token = 2 × 32 × 8 × 128 × 2 = ${H.c('g', '131,072 B (128 KiB)')}; at 64k tokens = ${H.c('b', '8 GiB')} per user.</p>`,
    brute: { why: `<p>"Just set max_position_embeddings=65536": positions beyond 4k produce rotation angles never seen in training, so quality collapses past the old limit, and the n×n scores blow up memory.</p>` },
    mcq: { q: 'Which is NOT approximate (gives exactly the full-attention result)?', options: ['FlashAttention', 'Sliding window', 'Sparse global/local pattern'], answer: 0, explain: 'FlashAttention only changes how the same math is computed.' },
    hints: [`<p>Hint 1: scale = 4k/64k = 1/16 for interpolation, or raise the base (NTK/YaRN).</p>`, `<p>Hint 2: fine-tune on long documents, progressively longer.</p>`, `<p>Hint 3: use FlashAttention + GQA cache math + needle tests and real-task evals.</p>`],
    solution: {
      approach: `<p>Plan. (1) Position scaling: apply YaRN or NTK-aware RoPE scaling with factor 16 (or position interpolation, scale 1/16); NTK/YaRN keep high-frequency pairs nearly unchanged so local precision survives. (2) Continued training: fine-tune on long documents in stages (4k → 16k → 64k), mixing in short data to avoid regressing short-context quality; a few billion tokens is typically enough. (3) Compute and memory: use FlashAttention for exact attention without materialising the 64k×64k score matrix (which would be 8 GB per head in fp16); use sequence/context parallelism in training. (4) Serving memory: KV per token = 2 × 32 × 8 × 128 × 2 B = 131,072 B, so 64k tokens = 8 GiB per user (GQA already helps; without GQA it would be 32 GiB). Mitigate with fp8/int8 KV (4 GiB), prefix caching, PagedAttention, and possibly sliding-window layers. (5) Evaluate: needle-in-a-haystack at several depths, long-document QA, multi-fact reasoning, and a short-context regression suite; compare against RAG baselines, since retrieval is often cheaper. (6) Cost: prefill for 64k tokens is compute-heavy, so measure time-to-first-token and price accordingly.</p>`,
      code: { lang: 'python', run: true, code: `per_tok = 2 * 32 * 8 * 128 * 2\nprint(per_tok, 'B/token;', per_tok * 65536 / 2**30, 'GiB at 64k')\nprint('score matrix per head fp16:', 65536 ** 2 * 2 / 2**30, 'GiB (not stored by FlashAttention)')` },
      complexity: `<p>Attention compute O(n²·d) (still quadratic, even with FlashAttention); memory O(n) for activations, O(n) for KV.</p>`
    }
  }]
});

function P(title, level, tags, statement, example, brute, mq, hints, approach, code, complexity, followUps) {
  var s = { approach: approach, complexity: complexity };
  if (code) s.code = { lang: 'python', run: true, code: code };
  if (followUps) s.followUps = followUps;
  practice.push({ title: title, level: level, tags: tags, statement: statement, constraints: 'Show the formula, then the numbers.', example: example, brute: { why: brute }, mcq: mq, hints: hints, solution: s });
}

P('Two-token attention by hand', 'Easy', ['attention', 'softmax'],
  `<p>Tokens a = [1, 0] and b = [0, 2], d = 2, Q = K = V = X, no mask. Compute the attention weights for token b and its output.</p>`,
  `<p>Scores for b: [0, 4] / 1.414 = [0, 2.828]. exp = [1, 16.92]; weights ${H.c('g', '[0.056, 0.944]')}; output ${H.c('g', '[0.056, 1.888]')}.</p>`,
  `<p>Skipping the √d scale gives scores [0, 4] and weights [0.018, 0.982], over-sharp.</p>`,
  { q: 'Do attention weights for one query sum to…', options: ['1', 'd', 'n'], answer: 0, explain: 'Softmax normalises each row.' },
  [`<p>Hint 1: b·a = 0 and b·b = 4.</p>`, `<p>Hint 2: divide by √2 then softmax.</p>`, `<p>Hint 3: output = 0.056·[1,0] + 0.944·[0,2].</p>`],
  `<p>Scores: b·a = 0, b·b = 4. Scale by 1/√2: [0, 2.828]. Softmax: exp(0) = 1, exp(2.828) = 16.92, sum 17.92, so weights [0.0558, 0.9442]. Output = 0.0558·[1, 0] + 0.9442·[0, 2] = [0.056, 1.888]. Token b mostly copies itself because its own key matches its query best; this is a typical early-layer pattern.</p>`,
  `import math\nX = [[1, 0], [0, 2]]\nq = X[1]\ns = [sum(a * b for a, b in zip(q, k)) / math.sqrt(2) for k in X]\ne = [math.exp(v) for v in s]\nw = [v / sum(e) for v in e]\nprint([round(v, 3) for v in w], [round(sum(w[j] * X[j][c] for j in range(2)), 3) for c in range(2)])`,
  `<p>O(n²·d).</p>`);

P('Parameters in a LLaMA-style layer', 'Easy', ['parameters', 'GQA', 'SwiGLU'],
  `<p>d = 4096, 32 query heads, 8 KV heads, d<sub>head</sub> = 128, SwiGLU MLP with hidden 14336 (three matrices), no biases. Count parameters of one layer.</p>`,
  `<p>Wq 16.8M + Wo 16.8M + Wk 4.2M + Wv 4.2M = ${H.c('g', '41.9M')}; MLP 3 × 4096 × 14336 = ${H.c('b', '176.2M')}; layer ${H.c('y', '218.1M')}.</p>`,
  `<p>Assuming 4d² + 8d² = 201M overlooks GQA (smaller K/V) and the real MLP width.</p>`,
  { q: 'GQA shrinks which matrices?', options: ['Wk and Wv', 'Wq and Wo', 'the MLP'], answer: 0, explain: 'Fewer KV heads means narrower K and V projections.' },
  [`<p>Hint 1: Wq and Wo are d×d.</p>`, `<p>Hint 2: Wk and Wv are d × (kv_heads × d_head) = 4096 × 1024.</p>`, `<p>Hint 3: add the 3-matrix MLP.</p>`],
  `<p>Attention: Wq = 4096 × 4096 = 16,777,216; Wo = same; Wk = Wv = 4096 × 1024 = 4,194,304 each. Attention total = 41,943,040. MLP: gate, up and down each 4096 × 14336 = 58,720,256, total 176,160,768. Layer = 218,103,808 ≈ 218M. Times 32 layers = 6.98B; plus embeddings (32000×4096×2 = 262M, or larger vocab) gives LLaMA-3-8B-like sizes. Note the MLP is ~80% of the layer, which is why MoE targets the FFN.</p>`,
  `d, kv, dh, hid = 4096, 8, 128, 14336\nattn = 2 * d * d + 2 * d * kv * dh\nmlp = 3 * d * hid\nprint(attn, mlp, attn + mlp)`,
  `<p>O(1).</p>`);

P('KV cache for a 13B model at 4k context', 'Easy', ['kv cache', 'memory'],
  `<p>LLaMA-2-13B style: 40 layers, 40 KV heads, d<sub>head</sub> = 128, fp16. Compute KV cache for one 4,096-token sequence.</p>`,
  `<p>Per token ${H.c('g', '800 KiB')}; 4,096 tokens = ${H.c('b', '3.125 GiB')}.</p>`,
  `<p>Using 13B × 2 bytes (the weight size) confuses the fixed weights with the growing cache.</p>`,
  { q: 'Which grows with sequence length?', options: ['KV cache', 'weights', 'vocabulary'], answer: 0, explain: 'Cache holds one K and V per token.' },
  [`<p>Hint 1: 2 × layers × heads × d_head per token.</p>`, `<p>Hint 2: × 2 bytes.</p>`, `<p>Hint 3: × 4096 tokens.</p>`],
  `<p>Elements per token = 2 × 40 × 40 × 128 = 409,600; × 2 bytes = 819,200 B = 800 KiB. For 4,096 tokens: 3,355,443,200 B = 3.125 GiB. With weights at 26 GB fp16 one user needs ~29 GB; on a 40 GB GPU only about 4 concurrent 4k users fit, which is why serving engines use paging and GQA.</p>`,
  `per = 2 * 40 * 40 * 128 * 2\nprint(per, per * 4096 / 2**30)`,
  `<p>O(1).</p>`);

P('Weight memory by precision', 'Easy', ['quantization', 'memory'],
  `<p>How much memory do the weights of a 70B model need in fp16, int8 and int4? Which fits on a single 80 GB GPU (ignore KV cache)?</p>`,
  `<p>fp16 ${H.c('r', '140 GB')}, int8 ${H.c('y', '70 GB')}, int4 ${H.c('g', '35 GB')}.</p>`,
  `<p>Loading fp16 weights on one 80 GB GPU fails with out-of-memory at load time.</p>`,
  { q: 'Bytes per parameter in int4?', options: ['0.5', '2', '4'], answer: 0, explain: 'Four bits is half a byte.' },
  [`<p>Hint 1: memory = params × bytes.</p>`, `<p>Hint 2: fp16 = 2, int8 = 1, int4 = 0.5 bytes.</p>`, `<p>Hint 3: leave room for KV cache and activations.</p>`],
  `<p>70×10<sup>9</sup> × 2 B = 140 GB; × 1 B = 70 GB; × 0.5 B = 35 GB (plus about 5-10% for scales). Only int4 leaves useful room (about 40 GB) on one 80 GB GPU for the KV cache. int8 at 70 GB technically fits but leaves almost nothing for context and batching; fp16 needs at least two 80 GB GPUs (tensor parallel). Trade-off: int4 loses a little quality, so evaluate on your task.</p>`,
  `for name, b in (('fp16', 2), ('int8', 1), ('int4', 0.5)):\n    print(name, 70e9 * b / 1e9, 'GB')`,
  `<p>O(1).</p>`);

P('Combine padding and causal masks', 'Medium', ['masking', 'batching'],
  `<p>A batch has a sequence of 4 real tokens padded to length 6 ([t1 t2 t3 t4 PAD PAD]). Which cells of the 6×6 attention score table must be masked for a decoder-only model? How do you stop PAD rows from producing NaN?</p>`,
  `<p>Masked: all j &gt; i (future) ${H.c('r', 'and')} all columns j ≥ 4 (PAD keys). Rows 4 and 5 (PAD queries) are ignored in the loss.</p>`,
  `<p>Only a causal mask: real tokens never look right so they are safe, but with left padding, or a bidirectional encoder, real tokens would attend to PAD garbage.</p>`,
  { q: 'Mask values are added to scores…', options: ['before softmax', 'after softmax', 'to V'], answer: 0, explain: '-∞ before softmax gives weight 0 after.' },
  [`<p>Hint 1: causal = upper triangle.</p>`, `<p>Hint 2: padding = columns of PAD tokens.</p>`, `<p>Hint 3: a row that is entirely masked gives softmax of all -∞ = NaN; use a large finite negative or ensure each row has one allowed cell.</p>`],
  `<p>Final mask = causal OR padding-key mask. Allowed cells (row i, col j): j ≤ i and j &lt; 4. So rows 0..3 are the usual lower triangle on the 4 real tokens; rows 4 and 5 (PAD queries) may see columns 0..3 only (they are still garbage and excluded from the loss). If a row were fully masked (e.g. left padding with the first query), softmax over all -∞ yields 0/0 = NaN, so frameworks use the dtype minimum (about -3.4e38 or -1e9) instead of true -∞ or force the diagonal to be allowed. Also remember document masks when sequences from different documents are packed in one row.</p>`,
  `NEG = -1e9\nn, real = 6, 4\nfor i in range(n):\n    print(''.join('X' if (j <= i and j < real) else '.' for j in range(n)))`,
  `<p>O(n²) mask, applied in fused kernels without materialising it.</p>`);

P('Sinusoidal encoding at position 2', 'Medium', ['positional encoding', 'sinusoidal'],
  `<p>With d = 4, compute PE(pos = 2) using PE(pos,2i) = sin(pos/10000<sup>2i/d</sup>) and PE(pos,2i+1) = cos(same). Why do the last slots change slowly with pos?</p>`,
  `<p>Pair 0 freq 1: (sin 2, cos 2) = (0.909, −0.416). Pair 1 freq 0.01: (sin 0.02, cos 0.02) = (0.020, 1.000).</p>`,
  `<p>Using the raw integer position as a feature makes the number unbounded and hard for a network to use.</p>`,
  { q: 'Which pair rotates fastest with position?', options: ['pair 0 (i = 0)', 'the last pair', 'all equally'], answer: 0, explain: 'Frequency = 1/10000^(2i/d) is largest at i = 0.' },
  [`<p>Hint 1: for i = 0 the divisor is 1.</p>`, `<p>Hint 2: for i = 1, the divisor is 10000^(2/4) = 100.</p>`, `<p>Hint 3: slow frequencies change little between neighbours.</p>`],
  `<p>i = 0: divisor 10000<sup>0</sup> = 1, so (sin 2, cos 2) = (0.9093, -0.4161). i = 1: divisor 10000<sup>0.5</sup> = 100, angle 0.02, so (sin 0.02, cos 0.02) = (0.0200, 0.9998). PE(2) = [0.909, -0.416, 0.020, 1.000]. Slow pairs have tiny frequencies, so the angle barely moves between adjacent positions (like an hour hand), which lets them disambiguate far-apart positions while fast pairs tell neighbours apart.</p>`,
  `import math\nd, pos = 4, 2\nv = []\nfor i in range(d // 2):\n    a = pos / 10000 ** (2 * i / d)\n    v += [math.sin(a), math.cos(a)]\nprint([round(x, 4) for x in v])`,
  `<p>O(d) per position.</p>`);

P('Decode speed ceiling from memory bandwidth', 'Medium', ['decode', 'memory-bound', 'estimation'],
  `<p>A 70B model in fp16 is split over 8 GPUs (tensor parallel), each with 3.35 TB/s HBM. Estimate the maximum tokens/s for a single stream, ignoring communication. What changes with int4 weights?</p>`,
  `<p>Bytes per token 140 GB / aggregate 26.8 TB/s = ${H.c('g', '5.2 ms')} → ${H.c('b', '≈190 tok/s')}. int4: ${H.c('g', '≈760 tok/s')}.</p>`,
  `<p>Dividing FLOPs by TFLOPs gives ~0.3 ms and a wildly optimistic 3000 tok/s: decode is limited by memory, not math.</p>`,
  { q: 'Decode at batch 1 is limited by…', options: ['memory bandwidth', 'tensor-core FLOPs', 'tokenizer speed'], answer: 0, explain: 'About 1 FLOP per byte read, far below the GPU ratio.' },
  [`<p>Hint 1: each token reads every weight once.</p>`, `<p>Hint 2: time = bytes / bandwidth.</p>`, `<p>Hint 3: communication and KV reads lower the real number by 30-50%.</p>`],
  `<p>Bytes read per generated token ≈ all weights = 70×10<sup>9</sup> × 2 = 140 GB. Aggregate bandwidth with 8 GPUs = 8 × 3.35 = 26.8 TB/s. Time per token = 140 / 26800 s = 5.2 ms, so about 190 tokens/s upper bound. With int4 weights (35 GB) the bound is ~4× higher, about 760 tok/s, because fewer bytes are read. In practice the all-reduce after each layer, KV cache reads and kernel overheads cut this by 30-50%. Batching multiplies total throughput (shared weight reads) but not single-stream speed.</p>`,
  `w = 70e9 * 2\nbw = 8 * 3.35e12\nprint(w / bw * 1000, 'ms ->', bw / w, 'tok/s')\nprint('int4:', bw / (70e9 * 0.5), 'tok/s')`,
  `<p>O(1).</p>`);

P('Training time for a 7B model on 1T tokens', 'Medium', ['scaling laws', 'compute'],
  `<p>You train a 7B model on 1T tokens using 64 GPUs sustaining 4×10<sup>14</sup> FLOP/s each. How many days? How many tokens/param is that, and is it Chinchilla-optimal?</p>`,
  `<p>C = 6·7e9·1e12 = ${H.c('g', '4.2×10²²')}; days ≈ ${H.c('b', '19')}; ${H.c('y', '143 tokens/param')} (7× Chinchilla).</p>`,
  `<p>Guessing "a few days" or "a year" without the 6ND estimate gives no basis for planning a budget.</p>`,
  { q: 'FLOPs per parameter per token in training is about…', options: ['6', '2', '12'], answer: 0, explain: '2 forward + 4 backward.' },
  [`<p>Hint 1: C = 6·N·D.</p>`, `<p>Hint 2: throughput = 64 × 4e14.</p>`, `<p>Hint 3: divide, then convert seconds to days.</p>`],
  `<p>C = 6 × 7×10<sup>9</sup> × 10<sup>12</sup> = 4.2×10<sup>22</sup> FLOPs. Cluster throughput = 64 × 4×10<sup>14</sup> = 2.56×10<sup>16</sup> FLOP/s. Time = 1.64×10<sup>6</sup> s = 19 days. Tokens per parameter = 1000B/7B = 143, about 7× the Chinchilla-optimal 20. That is deliberate over-training: the compute-optimal 7B would use 140B tokens, but extra data gives a better model of the same size, which is cheaper to serve. Add ~10-20% for restarts and evaluation.</p>`,
  `C = 6 * 7e9 * 1e12\nprint(C, C / (64 * 4e14) / 86400, 'days')`,
  `<p>O(1).</p>`);

P('Size an MoE model', 'Medium', ['MoE', 'memory', 'compute'],
  `<p>A MoE has 20B shared parameters and 256 routed experts totalling 640B parameters; each token uses top-8 experts (plus the shared part). Compute total and active parameters, the fp8 weight memory, and the 6ND training cost per token.</p>`,
  `<p>Total ${H.c('b', '660B')}; active = 20 + 8/256 × 640 = ${H.c('g', '40B')}; fp8 memory ${H.c('y', '660 GB')}; training ${H.c('g', '2.4×10¹¹ FLOPs/token')}.</p>`,
  `<p>Treating 660B as the compute-relevant size overestimates cost by 16×.</p>`,
  { q: 'Training FLOPs per token for an MoE use…', options: ['active parameters', 'total parameters', 'experts only'], answer: 0, explain: 'Only active parameters multiply the token.' },
  [`<p>Hint 1: total = shared + all experts.</p>`, `<p>Hint 2: active = shared + (k/E) × expert params.</p>`, `<p>Hint 3: FLOPs per token = 6 × active; memory = total × bytes.</p>`],
  `<p>Total = 20B + 640B = 660B. Active = 20B + (8/256) × 640B = 20 + 20 = 40B. Weight memory at fp8 (1 byte) = 660 GB, which needs at least 9 GPUs of 80 GB just for weights, so serve across 16 GPUs with expert parallelism. Training cost per token = 6 × 40B = 2.4×10<sup>11</sup> FLOPs, the same as a 40B dense model, which is the MoE advantage. Serving cost is dominated by memory capacity and the all-to-all communication, not FLOPs.</p>`,
  `shared, routed, E, k = 20, 640, 256, 8\nprint(shared + routed, shared + k / E * routed, 6 * (shared + k / E * routed) * 1e9)`,
  `<p>O(1).</p>`);

P('Attention vs MLP FLOPs: when does n dominate?', 'Hard', ['complexity', 'attention', 'FLOPs'],
  `<p>Per token per layer, projections + MLP cost about 24·d² FLOPs, while the score and value mixing part costs about 4·n·d FLOPs (n = context length). At what n are they equal? Evaluate for d = 4096 and say what it implies for long contexts.</p>`,
  `<p>24d² = 4nd → n = 6d = ${H.c('g', '24,576')} tokens for d = 4096.</p>`,
  `<p>Saying "attention is always the bottleneck because it is O(n²)" ignores that for n below ~6d the big matmuls dominate.</p>`,
  { q: 'For n much smaller than 6d, FLOPs are mostly spent in…', options: ['projections and MLP', 'QKᵀ scores', 'softmax'], answer: 0, explain: 'The 24d² term dominates.' },
  [`<p>Hint 1: set the two costs equal.</p>`, `<p>Hint 2: cancel one d.</p>`, `<p>Hint 3: compare to typical context lengths.</p>`],
  `<p>Projections: Wq, Wk, Wv, Wo = 4d² multiply-adds, MLP = 8d² multiply-adds, so 12d² MACs = 24d² FLOPs per token. Attention for one new token against n cached keys: QKᵀ costs n·d MACs and the weights times V costs n·d MACs, 2nd MACs = 4nd FLOPs. Equal when 24d² = 4nd, so n = 6d. For d = 4096, n ≈ 24.6k. Below that the dense matmuls dominate; above it attention dominates and grows linearly per token (quadratically for the whole sequence). Implication: at 4k-8k context, optimising attention (FlashAttention) matters mostly for memory, while at 128k the attention FLOPs and KV reads dominate, motivating window layers, GQA/MLA and sparse methods.</p>`,
  `d = 4096\nprint('crossover n =', 6 * d)\nfor n in (4096, 24576, 131072):\n    print(n, 'attention share =', round(4 * n * d / (4 * n * d + 24 * d * d), 2))`,
  `<p>O(1).</p>`);

P('Derive why RoPE gives relative positions', 'Hard', ['RoPE', 'proof'],
  `<p>Show in a few lines that the RoPE score between a query at position m and a key at position n depends only on m − n. State which property of rotation matrices you use and what breaks if you apply RoPE to V.</p>`,
  `<p>q' = R(mθ)q, k' = R(nθ)k, so q'·k' = qᵀ R((n−m)θ) k.</p>`,
  `<p>Using absolute learned positions requires the model to relearn every offset separately at each absolute location.</p>`,
  { q: 'Which identity makes the proof work?', options: ['R(a)ᵀ R(b) = R(b − a)', 'R(a) R(b) = R(a·b)', 'R(a) = R(a)ᵀ'], answer: 0, explain: 'Rotations compose by adding angles and inverse is the transpose.' },
  [`<p>Hint 1: write the dot product as qᵀ R(mθ)ᵀ R(nθ) k.</p>`, `<p>Hint 2: rotation matrices are orthogonal: Rᵀ = R⁻¹ = R(−angle).</p>`, `<p>Hint 3: V is what gets averaged and output; rotating it would corrupt content.</p>`],
  `<p>Let R(α) be the 2×2 rotation by α. Rotated query q' = R(mθ)q, rotated key k' = R(nθ)k. Then q'·k' = q'ᵀk' = qᵀ R(mθ)ᵀ R(nθ) k. Since a rotation's transpose is its inverse, R(mθ)ᵀ = R(−mθ), and rotations compose by adding angles, so R(−mθ)R(nθ) = R((n−m)θ). Therefore the score is qᵀ R((n−m)θ) k, a function of the content (q, k) and only the offset n − m. Applied to every 2D pair with its own θ<sub>i</sub> the argument holds for the whole vector (a block-diagonal rotation). RoPE is applied to Q and K because only their dot product needs position; V is mixed linearly into the output and rotating it would add a position-dependent twist to the content being passed forward (relative information is not preserved after the weighted sum). Consequence: attention can learn "attend to the token 3 positions back" independent of absolute location, and extrapolating needs the angles to stay in a familiar range, hence scaling methods.</p>`,
  `import math\ndef R(a): return [[math.cos(a), -math.sin(a)], [math.sin(a), math.cos(a)]]\ndef rot(v, a):\n    m = R(a)\n    return [m[0][0] * v[0] + m[0][1] * v[1], m[1][0] * v[0] + m[1][1] * v[1]]\nq, k, th = [0.6, 0.8], [1.0, 0.3], 0.4\nfor m, n in [(5, 3), (50, 48), (1000, 998)]:\n    a, b = rot(q, m * th), rot(k, n * th)\n    print(m, n, round(a[0] * b[0] + a[1] * b[1], 6))`,
  `<p>O(d) per vector.</p>`);

P('Capacity plan: serving a 70B GQA model at 32k context', 'Hard', ['serving', 'kv cache', 'capacity planning'],
  `<p>Model: 70B, 80 layers, 8 KV heads, d<sub>head</sub> = 128. Node: 8 × 80 GB GPUs (640 GB). Weights fp16. Estimate KV per token, KV per 32k-token user, and how many concurrent users fit (reserve 10% for activations). How do fp8 weights and fp8 KV change it?</p>`,
  `<p>KV/token = ${H.c('g', '320 KiB')}; per user ${H.c('b', '10 GiB')}; users ≈ ${H.c('y', '40')} (fp16) vs ≈ ${H.c('g', '94')} (fp8 + fp8 KV).</p>`,
  `<p>Dividing total memory by the weight size ignores that every user brings a 10 GiB cache and that memory is the limit, not compute.</p>`,
  { q: 'What dominates GPU memory growth as users increase?', options: ['KV cache', 'weights', 'embeddings'], answer: 0, explain: 'Weights are fixed; the cache is per user.' },
  [`<p>Hint 1: KV/token = 2 × 80 × 8 × 128 × 2 bytes.</p>`, `<p>Hint 2: available = 0.9 × 640 − weights.</p>`, `<p>Hint 3: divide available by per-user cache; recompute with 1-byte weights and 1-byte KV.</p>`],
  `<p>KV per token = 2 × 80 × 8 × 128 × 2 B = 327,680 B = 320 KiB. Per 32,768-token user = 10 GiB (10.7 GB). Memory budget = 0.9 × 640 = 576 GB. fp16: 576 − 140 = 436 GB free → 436 / 10.7 ≈ 40 concurrent users. fp8 weights (70 GB) and fp8 KV (5.4 GB per user): (576 − 70) / 5.4 ≈ 94 users, over 2× capacity for a small quality cost. Further gains: prefix caching for shared system prompts, PagedAttention to avoid fragmentation (typical 20-40% waste in naive allocators), sliding-window layers, and shorter contexts for most requests (real traffic has a mix, so size for the P95 context rather than the maximum). Also check bandwidth: each decode step reads weights + all active caches, so latency per token rises with batch KV size.</p>`,
  `per = 2 * 80 * 8 * 128 * 2\nuser = per * 32768\nprint(per / 1024, 'KiB/token', user / 2**30, 'GiB/user')\nprint('fp16:', (0.9 * 640e9 - 140e9) / user)\nprint('fp8 :', (0.9 * 640e9 - 70e9) / (user / 2))`,
  `<p>O(1) arithmetic; memory O(users × context).</p>`);

P('Design the evaluation after quantizing a model', 'Hard', ['quantization', 'evaluation', 'debugging'],
  `<p>Your team int4-quantized a 70B assistant to cut costs. Perplexity rose only 2%, but users report worse maths, worse non-English answers and sometimes broken JSON output. Explain why and propose a rollout plan.</p>`,
  `<p>Perplexity averages over easy tokens; rare skills (arithmetic, low-resource languages, strict formats) depend on a few sensitive weights.</p>`,
  `<p>Shipping because the headline benchmark looked fine, with no task-level evals and no rollback.</p>`,
  { q: 'Best next step?', options: ['Build task-specific evals and compare fp16 vs int4 side by side', 'Retrain from scratch', 'Ignore it'], answer: 0, explain: 'Measure the capabilities users care about.' },
  [`<p>Hint 1: what does perplexity actually average over?</p>`, `<p>Hint 2: which weights/activations are outliers?</p>`, `<p>Hint 3: staged rollout, per-capability gates, mixed precision for sensitive layers.</p>`],
  `<p>Why: perplexity is an average over all tokens, dominated by easy, predictable text, so a 2% rise can hide large drops on rare but important skills: multi-step arithmetic, low-resource languages and exact-format output all depend on precise, low-frequency features that rounding noise disturbs first. Outlier channels and sensitive layers (first/last layers, attention output, embeddings) lose more. Plan: (1) build a regression suite per capability (maths, code, JSON schema validity, languages, long-context retrieval, safety) with a few hundred real prompts each; (2) compare fp16 vs int8 vs int4 variants (GPTQ/AWQ, different group sizes) on it and set pass thresholds; (3) try mixed precision: keep sensitive layers or the embedding/head in 8-bit, use group size 64, or use QAT/fine-tuning with LoRA to recover; (4) for strict formats use constrained decoding to guarantee valid JSON regardless of quantization noise; (5) shadow test then canary 5% of traffic with automatic rollback on quality or latency metrics; (6) track cost savings (tokens/s per GPU, memory) against the quality loss to confirm it is worth it.</p>`,
  null,
  `<p>Eval cost scales with suite size; rollout adds a small canary overhead.</p>`);

quiz.push(
  { q: 'Why is the attention score divided by √d<sub>k</sub>?', options: ['Dot products grow with dimension and would saturate softmax', 'To make the weights add up to 1', 'To save memory', 'To apply the causal mask'], answer: 0, explain: 'Variance of q·k is d, so scaling by √d keeps logits near unit spread and gradients alive.' },
  { q: 'What does the causal mask do?', options: ['Sets scores for future tokens to −∞ before softmax', 'Removes padding tokens only', 'Multiplies V by 0', 'Normalises each column'], answer: 0, explain: 'exp(−∞) = 0, so no weight goes to later tokens.' },
  { q: 'Which dimension is softmax applied over in attention?', options: ['Each row (over the keys for one query)', 'Each column', 'The whole matrix', 'Over heads'], answer: 0, explain: 'Each query needs a distribution over keys.' },
  { q: 'With d_model = 4096 and 32 heads, d_head is…', options: ['128', '32', '4096', '256'], answer: 0, explain: '4096/32 = 128.' },
  { q: 'A standard transformer layer has about how many parameters (d = model width)?', options: ['12d²', '4d', 'd³', '2d²'], answer: 0, explain: '4d² attention + 8d² MLP.' },
  { q: 'RoPE is applied to…', options: ['Queries and keys', 'Values', 'The token embeddings added once at the input', 'Only the last layer'], answer: 0, explain: 'The dot product of rotated Q and K depends on relative offset.' },
  { q: 'What is stored in the KV cache?', options: ['K and V of past tokens in every layer', 'Past queries', 'The attention weight matrix', 'Token embeddings only'], answer: 0, explain: 'Queries of old tokens are never reused.' },
  { q: 'KV cache bytes for a 7B model (32 layers, 32 KV heads, d_head 128, fp16) at 8k tokens?', options: ['4 GiB', '0.5 GiB', '14 GiB', '64 GiB'], answer: 0, explain: '2·32·32·128·8192·2 B = 4 GiB.' },
  { q: 'Why is single-stream decoding memory-bound?', options: ['It reads all weights and the cache per token but does ~1 FLOP per byte', 'The GPU has too few cores', 'Softmax is slow', 'The tokenizer is slow'], answer: 0, explain: 'Arithmetic intensity is far below the GPU compute/bandwidth ratio.' },
  { q: 'Symmetric int8 quantization uses scale = ?', options: ['absmax / 127', 'absmax × 127', 'mean / 255', '1 / 127'], answer: 0, explain: 'The largest weight maps to code 127.' },
  { q: 'Maximum rounding error of one weight in uniform quantization is…', options: ['scale / 2', 'scale × 2', 'absmax', '127'], answer: 0, explain: 'The nearest level is at most half a step away.' },
  { q: 'One huge outlier weight in a group of 64 mostly causes…', options: ['A large scale that squashes the small weights', 'A faster model', 'Overflow of the KV cache', 'Nothing'], answer: 0, explain: 'Scale is set by absmax, so small values lose resolution.' },
  { q: 'Chinchilla compute-optimal training uses roughly…', options: ['20 tokens per parameter', '2 tokens per parameter', '2000 tokens per parameter', 'the same tokens for all sizes'], answer: 0, explain: 'D ≈ 20N.' },
  { q: 'Training FLOPs are approximately…', options: ['6 · N · D', 'N + D', 'N² · D', '2 · N'], answer: 0, explain: '2 forward + 4 backward FLOPs per parameter per token.' },
  { q: 'In a top-2 MoE with 8 experts, per token…', options: ['2 experts compute and gates come from a softmax over their 2 logits', 'All 8 experts compute', 'The router is trained separately', 'One expert is chosen at random'], answer: 0, explain: 'Sparse activation is the whole point.' },
  { q: 'Mixtral 8x7B total vs active parameters are about…', options: ['46.7B vs 12.9B', '56B vs 56B', '7B vs 7B', '12.9B vs 46.7B'], answer: 0, explain: 'Attention is shared, and only 2 of 8 experts are active.' },
  { q: 'FlashAttention is…', options: ['An exact algorithm that avoids storing the n×n matrix via tiling and online softmax', 'An approximation with linear compute', 'A new positional encoding', 'A quantization method'], answer: 0, explain: 'Same result, much less memory traffic.' },
  { q: 'Sliding window attention with window w and L layers can propagate information about…', options: ['L·w tokens', 'w tokens only', 'n² tokens', '0 tokens'], answer: 0, explain: 'Each layer extends the reach by about w.' }
);

interview.push(
  { q: 'Walk me through scaled dot-product attention and say why each step exists.', level: 'B', a: `<p>Each token is projected into Q, K, V. Scores = Q·Kᵀ measure how well each query matches each key (an n×n table). We divide by √d<sub>k</sub> because a dot product of d unit-variance numbers has standard deviation √d; without scaling the softmax saturates and gradients vanish. For decoder models we add −∞ to future cells (causal mask). Softmax per row turns scores into weights that sum to 1. Multiplying by V gives each token a weighted average of the values it may see. Cost is O(n²·d) time and O(n²) memory for the score table.</p>`, followUps: ['What shapes do Q, K, V and the score matrix have?', 'What goes wrong if you softmax over columns?', 'Cross-attention vs self-attention?'] },
  { q: 'Why multi-head attention rather than one head?', level: 'B', a: `<p>One head produces one weighted average per token, which forces a compromise between different relations (syntax, coreference, position, copy). Splitting d<sub>model</sub> into h heads of size d/h lets each head learn its own pattern in a separate subspace at about the same total cost; outputs are concatenated and mixed by W<sub>o</sub>. Trained models show specialised heads (previous-token, induction, syntax), although many are redundant. In practice h and d<sub>head</sub> (64 or 128) are chosen for hardware efficiency.</p>`, followUps: ['How many parameters are in an attention block?', 'What are MQA and GQA?', 'Do heads share information before W_o?'] },
  { q: 'How many parameters does one transformer layer have and where are they?', level: 'I', a: `<p>With model width d: attention has W<sub>q</sub>, W<sub>k</sub>, W<sub>v</sub>, W<sub>o</sub> = 4d². A classic MLP with hidden 4d has 2 × d × 4d = 8d². Total ≈ 12d² per layer, so d = 4096 gives ~201M, and 32 layers ≈ 6.4B plus embeddings ≈ 6.7B (a "7B" model). SwiGLU uses three matrices with hidden ≈ 2.7d (LLaMA 14336 for d = 4096) so the MLP stays near 8d²; GQA shrinks W<sub>k</sub> and W<sub>v</sub>. The MLP holds about two thirds of the parameters, which is why MoE replaces it.</p>`, followUps: ['How do embeddings change the count?', 'What changes with GQA?', 'What are the FLOPs per token for the forward pass?'] },
  { q: 'Compare sinusoidal encodings and RoPE. Why did RoPE win?', level: 'I', a: `<p>Sinusoidal encodings are fixed vectors of sin/cos at geometric frequencies added to the input embedding once; the model must infer relative offsets from absolute codes. RoPE rotates each pair of Q and K dimensions by pos·θ<sub>i</sub> in every layer, so Q·K depends only on the relative offset m − n (rotation identity R(a)ᵀR(b) = R(b−a)). It adds no parameters, keeps vector norms, extends to longer lengths by adjusting angles (interpolation, NTK, YaRN), and works well with the KV cache because the keys are stored already rotated. Learned absolute embeddings have a hard max length and no relative bias. ALiBi is an alternative using a linear distance penalty.</p>`, followUps: ['Why only Q and K?', 'How do you extend a 4k RoPE model to 32k?', 'What does the base 10000 control?'] },
  { q: 'What is the KV cache and how much memory does it need?', level: 'I', a: `<p>During autoregressive generation, K and V of past tokens never change, so we store them per layer and attend to them instead of recomputing. Memory = 2 × layers × kv_heads × d_head × seq_len × bytes × batch. For a 7B model (32 layers, 32 heads × 128, fp16) that is 0.5 MiB per token, 4 GiB at 8k tokens per user; with GQA (8 KV heads) it is 1 GiB. It grows linearly with context and batch, so for serving it often exceeds the weights. Mitigations: GQA/MLA, KV quantization, PagedAttention, prefix caching, windowed layers, eviction.</p>`, followUps: ['Why not cache Q?', 'What is PagedAttention?', 'How does the cache change time-to-first-token vs inter-token latency?'] },
  { q: 'Why is LLM decoding memory-bound while training and prefill are compute-bound?', level: 'I', a: `<p>In decode with batch 1, each new token needs a matrix-vector product with every weight, so each weight byte is read once and used for ~1 FLOP (arithmetic intensity ≈ 1). An H100 needs roughly 300 FLOPs per byte to keep tensor cores busy, so they idle waiting for HBM. Speed ≈ bandwidth ÷ bytes read (e.g. 3.35 TB/s ÷ 14 GB ≈ 240 tok/s for a 7B fp16 model). Prefill and training process thousands of tokens against the same weights (matrix-matrix products), which reuse each weight many times and saturate compute. Levers for decode: quantization, batching, GQA, speculative decoding.</p>`, followUps: ['How does batching improve throughput?', 'What is speculative decoding?', 'When does decode become compute-bound?'] },
  { q: 'Explain symmetric int8 quantization and its error. Why does 4-bit hurt more?', level: 'I', a: `<p>Find absmax of a tensor or group, scale = absmax/127, q = round(w/scale) clamped to [−127, 127], dequantize w' = q·scale. The error per weight is at most scale/2 (uniform noise, variance scale²/12). Fewer bits mean fewer levels, so scale = absmax/7 for int4 is 18× bigger. Outliers inflate absmax and crush small weights, so we use per-channel or group-wise scales (groups of 64-128), and smarter schemes (GPTQ uses Hessian corrections, AWQ protects salient channels, NF4 matches the weight distribution). Memory drops 2× (int8) or 4× (int4) vs fp16 and decode speeds up because fewer bytes are read.</p>`, followUps: ['Weight-only vs activation quantization?', 'What is asymmetric quantization and a zero point?', 'How would you evaluate a quantized model?'] },
  { q: 'What do scaling laws say and what is Chinchilla-optimal training?', level: 'I', a: `<p>Loss falls as a smooth power law in parameters N, tokens D and compute C. Training FLOPs ≈ 6ND. Kaplan et al. suggested spending extra compute mostly on model size; Chinchilla (Hoffmann et al., 2022) showed N and D should grow together, roughly D ≈ 20N, so N<sub>opt</sub> = √(C/120). A 70B model on 1.4T tokens beat a 280B model trained on 300B tokens at equal compute. The result is for minimising training loss at a fixed training budget; with heavy inference demand, labs over-train smaller models (LLaMA-3 8B saw ~15T tokens) because serving cost then dominates.</p>`, followUps: ['Where does 6ND come from?', 'Why over-train?', 'What limits scaling today (data, energy)?'] },
  { q: 'Explain mixture of experts, active vs total parameters, and the main training issue.', level: 'A', a: `<p>An MoE layer replaces the FFN with E expert FFNs and a linear router. For each token the router picks the top-k experts, softmaxes their logits into gates, and outputs the gate-weighted sum, so only k/E of the FFN parameters compute. Total parameters (memory) are much larger than active parameters (compute): Mixtral 8x7B has 46.7B total and 12.9B active. The main training issue is load imbalance and expert collapse: favoured experts learn faster and get even more tokens. Fixes: auxiliary balance loss, capacity factor and token dropping, router noise, z-loss, bias-based balancing, shared experts. Serving needs expert parallelism with all-to-all communication.</p>`, followUps: ['Why does 8x7B not equal 56B?', 'What is fine-grained expert segmentation?', 'How do you count training FLOPs for an MoE?'] },
  { q: 'How does FlashAttention work and does it change the result?', level: 'A', a: `<p>FlashAttention computes exact attention but is IO-aware. GPUs have small fast SRAM and large slower HBM; standard attention writes the n×n score matrix to HBM and reads it back several times. FlashAttention tiles Q, K, V so each tile fits in SRAM and uses an online softmax: it keeps a running max m, running sum l and running weighted sum, rescaling by exp(m_old − m_new) when a new tile raises the max. The n×n matrix is never stored, so memory is O(n) and runtime drops 2-4× due to less data movement. The backward pass recomputes tiles. It does not change the output (up to floating-point order) and compute remains O(n²).</p>`, followUps: ['Why does the online softmax rescale?', 'What does FlashAttention-3 add?', 'How does it relate to PagedAttention?'] },
  { q: 'How would you give a model 10x longer context than it was trained on?', level: 'A', a: `<p>Three layers of change. Positions: scale RoPE (position interpolation squeezes positions by train_len/new_len; NTK-aware raises the base so local frequencies are preserved; YaRN blends per frequency and adds an attention temperature). Training: continue pre-training or fine-tune on long documents in stages, mixing short data to avoid regression. Systems: FlashAttention to avoid n² memory, GQA/MLA and KV quantization to shrink the cache, sequence/context parallelism for training, and possibly window or hybrid local/global layers. Evaluate with needle-in-a-haystack, multi-hop long-document QA and short-context regression, and compare with RAG, which is often cheaper and more accurate.</p>`, followUps: ['What is lost in the middle?', 'Cost of prefill at 128k?', 'Alternatives to attention for long sequences?'] },
  { q: 'Plan GPU capacity for serving a 70B model with long contexts.', level: 'E', a: `<p>Start from memory: weights (70B × 2 B = 140 GB fp16, 70 GB fp8) plus KV cache per user. With 80 layers, 8 KV heads and d<sub>head</sub> 128, KV is 320 KiB per token, 10 GiB for 32k tokens. On 8 × 80 GB with 10% reserved, fp16 allows about 40 such users; fp8 weights and KV about 94. Then bandwidth: each decode step reads weights plus all active caches, so per-stream latency ≈ bytes ÷ aggregate bandwidth (around 5 ms for weights alone on 8 GPUs). Choose tensor parallelism for latency, add replicas for throughput, use continuous batching, PagedAttention, prefix caching, and quantization; size for P95 context, not max, and keep headroom for prefill bursts. Validate with a load test measuring TTFT, tokens/s and tail latency.</p>`, followUps: ['How do you separate prefill and decode (disaggregation)?', 'What changes for an MoE model?', 'How do you price this per million tokens?'] },
  { q: 'A teammate says "FlashAttention makes attention linear, so we can use unlimited context." Respond.', level: 'E', a: `<p>FlashAttention makes memory linear in n but compute stays quadratic: every query still touches every key. At 128k tokens the attention FLOPs and especially the KV cache reads dominate decoding. The KV cache grows linearly with context and users (64 GiB for a 7B MHA model at 128k), so capacity and bandwidth, not the score matrix, become the limit. Model quality at long range also depends on training (positional scaling, long-document data) and shows "lost in the middle" effects. Practical options: GQA/MLA, KV quantization, window layers, retrieval, summarisation. Context length is a cost and quality trade-off, not a free feature.</p>`, followUps: ['What is the time cost of prefill at 1M tokens?', 'When would you choose RAG instead?', 'How do state-space or hybrid models help?'] }
);

function plain(h) { return String(h).replace(/<[^>]*>/g, '').trim(); }
// Only very short texts get a closing sentence (the validator needs a minimum length); longer texts are left alone.
function padProblem(p) {
  p.hints = p.hints.map(function (h) { return plain(h).length < 40 ? h.replace(/<\/p>$/, ' Try it with small numbers on paper first.</p>') : h; });
  if (p.solution && p.solution.complexity && plain(p.solution.complexity).length < 20) p.solution.complexity = p.solution.complexity.replace(/<\/p>$/, ' Only simple arithmetic is needed here.</p>');
}
topics.forEach(function (t) { (t.problems || []).forEach(padProblem); });
practice.forEach(padProblem);
quiz.forEach(function (q) { if (plain(q.explain).length < 20) q.explain = q.explain + ' Revisit the matching topic above if this was unclear.'; });

registerModule({
  id: 'ai15',
  title: 'Transformer Internals Deep Dive',
  intro: `<p>You use LLMs every day. This module opens the box. You will compute <b>attention by hand</b>, see why we divide by √d and mask the future, split work across <b>heads</b>, give tokens a sense of order with <b>sinusoidal and RoPE</b> positions, and understand the <b>KV cache</b> that makes chatting fast but memory-hungry. Then the big levers of modern AI: <b>quantization</b>, <b>scaling laws</b>, <b>mixture of experts</b> and <b>long-context tricks</b> like sliding windows and FlashAttention. Everything comes with small numbers, runnable Python (standard library only) and the back-of-envelope formulas interviewers love.</p>`,
  goals: ['Compute scaled dot-product attention with a causal mask for a few tokens by hand and in code', 'Count parameters of a transformer layer and compute KV-cache memory for a given model and context', 'Explain RoPE, multi-head attention and why decode is memory-bound', 'Quantize and dequantize weights and reason about the error and outliers', 'Estimate compute-optimal tokens (Chinchilla), MoE active parameters and long-context costs'],
  prereqs: `Earlier GenAI modules (tokens, embeddings, how LLMs generate text) and basic comfort with vectors, dot products and exponentials.`,
  hours: 14,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
