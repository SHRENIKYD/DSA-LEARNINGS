(function () { var topics = [], practice = [], quiz = [], interview = [];

topics.push({
  title: 'What Embeddings Capture (and the king − man + woman Trick)',
  analogy: `<p>Imagine a huge <b>map of meaning</b>. Every word, sentence or picture gets a pin on that map. "Dog" and "puppy" sit on neighbouring streets. "Dog" and "mortgage" live in different cities. An <b>embedding</b> is just the pin's address: a list of numbers (coordinates). Nearby pins mean similar things.</p>`,
  explain: `<p>🟢 <b>The plain idea.</b> A computer cannot "feel" that <i>cat</i> and <i>kitten</i> are close. But if we turn each into a list of numbers, e.g. <code>[0.8, 0.1, 0.3, ...]</code>, then "close in meaning" becomes "close in space", and computers are great at measuring distance.</p>
<p>A real embedding model (a neural network trained on billions of sentences) outputs a vector of <b>384, 768, 1024, 1536 or 3072 numbers</b>. We cannot draw 1536 dimensions, so we squash them to 2D in our heads: <i>x</i> = "how male vs female", <i>y</i> = "how royal".</p>
${H.table(['word', 'x (male → female)', 'y (royalty)', 'where it lands'], [['man', '0.2', '0.2', 'left, low'], ['woman', '0.6', '0.2', 'right, low'], ['king', '0.2', '0.8', 'left, high'], ['queen', '0.6', '0.8', 'right, high'], ['apple', '0.9', '0.1', 'far away: a fruit']])}
<p><b>What do embeddings capture?</b> Meaning, topic, tone, relationships (<i>capital-of</i>, <i>plural-of</i>), and even style. They do <b>not</b> capture exact spelling, exact numbers, or facts the model never saw. "Order 4471" and "Order 4472" can look almost identical to an embedding, which is why keyword search is still needed.</p>
<p><b>The famous trick: king − man + woman ≈ queen.</b> Take the arrow that goes from <i>man</i> to <i>woman</i> (the "gender direction"). Walk that same arrow starting from <i>king</i>. You land next to <i>queen</i>. Directions in the space carry meaning. This works well in older word-vector models (word2vec, GloVe) and roughly in modern ones; it is a teaching demo, not a guarantee.</p>
<p><b>Embeddings are learned, not hand-designed.</b> The model is trained so that texts that appear in similar contexts (or are labelled as paraphrases/answers to each other) end up close. Nobody tells it "dimension 17 means royalty"; meaning is spread across many dimensions at once.</p>`,
  clues: ['"find similar items / documents / images / users" with no exact keyword match', '"semantic search", "search by meaning", "recommend something like this"', '"vector", "embedding", "nearest neighbour", "cosine similarity"', '"user typed <i>cheap flights</i> but the page says <i>low-cost airfare</i>"', '"deduplicate near-identical text", "cluster support tickets", "RAG retrieval"'],
  code: [{ lang: 'python', run: true, title: 'Word-vector arithmetic with hand-made 2D vectors (stdlib only)', code: `import math

# Toy "embedding table": x = male->female, y = royalty. Real models use 768+ dims.
vec = {
    "man":    (0.2, 0.2),
    "woman":  (0.6, 0.2),
    "king":   (0.2, 0.8),
    "queen":  (0.62, 0.78),
    "prince": (0.25, 0.65),
    "apple":  (0.9, 0.1),
    "banana": (0.95, 0.3),
}

def sub(a, b): return (a[0] - b[0], a[1] - b[1])
def add(a, b): return (a[0] + b[0], a[1] + b[1])
def dist(a, b): return math.hypot(a[0] - b[0], a[1] - b[1])

# king - man + woman
target = add(sub(vec["king"], vec["man"]), vec["woman"])
print("target point:", tuple(round(t, 2) for t in target))

# Rank every word (except the three we used) by distance to the target
used = {"king", "man", "woman"}
ranked = sorted((w for w in vec if w not in used), key=lambda w: dist(vec[w], target))
for w in ranked:
    print(f"{w:7s} distance = {dist(vec[w], target):.3f}")
print("answer:", ranked[0])` }],
  codeTitle: ['king − man + woman by hand'],
  viz: {
    title: 'The map of meaning: king − man + woman',
    input: 'king man woman',
    inputLabel: 'A B C  (computes A − B + C; try: king man woman, queen woman man, prince man woman)',
    gen: function (input) {
      var P = { man: [20, 42], woman: [58, 42], king: [20, 12], queen: [60, 14], prince: [28, 22], apple: [88, 46], banana: [92, 30] };
      var w = String(input).trim().toLowerCase().split(/[\s,]+/);
      if (w.length !== 3 || !P[w[0]] || !P[w[1]] || !P[w[2]]) throw new Error('Type three words from: ' + Object.keys(P).join(', '));
      var A = P[w[0]], B = P[w[1]], C = P[w[2]];
      function nodes(extra) {
        var n = Object.keys(P).map(function (k) { return { id: k, label: k, x: P[k][0], y: P[k][1] }; });
        return extra ? n.concat(extra) : n;
      }
      var frames = [];
      frames.push({ narr: 'Every word is a <b>pin on a map</b>. Left-right = male to female, up-down = more royal. Fruits sit far away because they mean something else.', parts: [{ type: 'graph', label: '2D slice of an embedding space', height: 56, nodes: nodes(), edges: [], hl: {} }] });
      var hl1 = {}; hl1[w[1]] = 'cur'; hl1[w[2]] = 'cur';
      var e1 = {}; e1[w[1] + '-' + w[2]] = 'ok';
      frames.push({ narr: 'Step 1: find the arrow from <b>' + w[1] + '</b> to <b>' + w[2] + '</b>. That arrow is the "direction of meaning" we want to apply.', parts: [{ type: 'graph', label: 'direction = ' + w[2] + ' − ' + w[1], directed: true, height: 56, nodes: nodes(), edges: [[w[1], w[2], 'direction']], hl: hl1, ehl: e1 }] });
      var T = [A[0] + (C[0] - B[0]), A[1] + (C[1] - B[1])];
      var hl2 = {}; hl2[w[0]] = 'cur';
      frames.push({ narr: 'Step 2: stand on <b>' + w[0] + '</b> and walk the same arrow. We land at the red-dashed target spot (' + T[0].toFixed(0) + ', ' + T[1].toFixed(0) + ').', parts: [{ type: 'graph', label: 'walk the arrow from ' + w[0], directed: true, height: 56, nodes: nodes([{ id: 'T', label: 'target', x: Math.max(2, Math.min(98, T[0])), y: Math.max(2, Math.min(54, T[1])), shape: 'box' }]), edges: [[w[0], 'T', 'same arrow']], hl: Object.assign(hl2, { T: 'bad' }), ehl: { [w[0] + '-T']: 'ok' } }] });
      var ds = Object.keys(P).filter(function (k) { return k !== w[0] && k !== w[1] && k !== w[2]; }).map(function (k) { return { k: k, d: Math.hypot(P[k][0] - T[0], P[k][1] - T[1]) }; }).sort(function (a, b) { return a.d - b.d; });
      frames.push({ narr: 'Step 3: measure the distance from the target to every other word. Closest wins: <b>' + ds[0].k + '</b> (distance ' + ds[0].d.toFixed(1) + ').', parts: [{ type: 'bars', label: 'distance to target (smaller = closer)', values: ds.map(function (x) { return +x.d.toFixed(1); }), idxLabels: ds.map(function (x) { return x.k; }), hl: { 0: 'ok' } }] });
      var hl3 = {}; hl3[ds[0].k] = 'sel'; hl3[w[0]] = 'done'; hl3[w[1]] = 'done'; hl3[w[2]] = 'done';
      frames.push({ narr: 'Answer: <b>' + w[0] + ' − ' + w[1] + ' + ' + w[2] + ' ≈ ' + ds[0].k + '</b>. Directions carry meaning. (Real models do this only roughly, and we exclude the input words from the answer list.)', parts: [{ type: 'graph', label: 'result', height: 56, nodes: nodes([{ id: 'T', label: 'target', x: Math.max(2, Math.min(98, T[0])), y: Math.max(2, Math.min(54, T[1])), shape: 'box' }]), edges: [['T', ds[0].k]], hl: Object.assign(hl3, { T: 'bad' }), ehl: { ['T-' + ds[0].k]: 'ok' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Synonyms land together', html: `<p>"How do I reset my password?" and "I forgot my login credentials" share almost no words, yet their embeddings are very close. That is why <b>semantic search</b> finds the right help article while keyword search returns nothing.</p>` },
    { title: 'Same word, different meaning', html: `<p>Modern (contextual) models give <i>bank</i> in "river bank" and "bank loan" <b>different</b> vectors, because the vector depends on the whole sentence. Old word2vec gave one fixed vector per word, so it blended both meanings.</p>` },
    { title: 'Beyond text', html: `<p>Images, audio, code, products and even users can be embedded. Multi-modal models (CLIP-style) place a photo of a dog and the sentence "a happy dog" near each other, so you can search photos with words.</p>` },
    { title: 'What embeddings miss', html: `<p>Compare "iPhone 15" and "iPhone 16": semantically almost the same, but the user may want exactly 16. Embeddings are great at <i>topic</i> and weak at <i>exact identifiers</i>, negation ("not allergic") and numbers.</p>` }
  ],
  deepDive: `<p>🟣 <b>How the vectors are made.</b> Text goes through a transformer; the output token vectors are pooled (mean or a special [CLS]/last token) into one vector, then usually <b>L2-normalised</b> to length 1. Training uses <b>contrastive learning</b>: pull the vectors of a (question, good answer) pair together and push random other texts apart (in-batch negatives, hard negatives). That is why the same model must embed both the query and the documents.</p>
<p><b>Dimensions and cost.</b> Storage = N × d × 4 bytes (float32). 10M vectors × 1536 dims ≈ 61 GB. Tricks: <b>Matryoshka embeddings</b> let you truncate to the first 256 dims with little quality loss; <b>quantization</b> (float16, int8, binary) cuts memory 2–32×; dimension choice is a quality/cost dial.</p>
<p><b>Anisotropy and "hubness".</b> In high dimensions, some vectors become the nearest neighbour of many others (hubs) and all cosine scores can cluster in a narrow band like 0.7–0.9. So an absolute threshold like "similarity &gt; 0.8 means relevant" is model-specific; always calibrate on your own data.</p>
<p><b>Do not mix models.</b> Vectors from two different models (or two versions of one model) live in different spaces; comparing them is meaningless. Store the model name and version with every vector, and re-embed everything when you upgrade. Also note that king − man + woman is a linear-analogy property that holds approximately; "queen" often comes out only after you exclude the three input words.</p>`,
  aiEra: `<p><b>What AI changes:</b> embeddings are now the backbone of RAG, semantic caches, recommendations and agent memory. You rarely train them; you call an embedding API (OpenAI text-embedding-3, Cohere embed, Voyage, Gemini embeddings) or run an open model (BGE, E5, GTE, Nomic) yourself.</p>
<p><b>Use AI as a partner:</b> ask <code>Give me 20 pairs of sentences that are semantically similar but share no words, and 20 that share words but mean different things</code> to build a test set for your retrieval. Ask it to explain MTEB leaderboard columns.</p>
<p><b>Where AI goes wrong:</b> an assistant will happily say "similarity 0.82 means they match" or mix vectors from two models. It also invents embedding-model dimensions. Check the model card.</p>
<p><b>What you must still own:</b> choosing the model for your language and domain, measuring retrieval quality on your own queries, and knowing that embeddings fuzz exact matches.</p>`,
  problems: [{
    title: 'Explain king − man + woman',
    level: 'Easy', tags: ['embeddings', 'intuition'], companies: ['OpenAI', 'Google'],
    statement: `<p>An interviewer asks: "In word2vec, <code>king − man + woman</code> is close to <code>queen</code>. Why does arithmetic on words work, and when does it fail?"</p>`,
    constraints: `Answer in plain words; mention direction vectors and one limitation.`,
    example: `<p>${H.c('g', 'king')} − ${H.c('b', 'man')} + ${H.c('p', 'woman')} → nearest word is ${H.c('g', 'queen')}.</p>`,
    brute: { why: `<p>Weak answer: "It is magic, the neural network just knows." It names no mechanism and cannot predict failures.</p>` },
    mcq: { q: 'What does subtracting "man" from "king" isolate?', options: ['A direction roughly meaning "royalty without maleness"', 'The length of the word king', 'The spelling difference', 'Nothing meaningful'], answer: 0, explain: 'Shared parts cancel; what remains is the part of king not explained by man, and adding woman swaps in the female direction.' },
    hints: [`<p>Think of each word as a point; subtracting two points gives an arrow.</p>`, `<p>Training makes consistent relationships (male to female) correspond to a similar arrow across many word pairs.</p>`, `<p>Recipe: define vectors, show arrow arithmetic, say the answer is the nearest neighbour excluding the inputs, then give a limitation (bias, rare words, only approximately linear).</p>`],
    solution: {
      approach: `<p>Word embeddings are trained so words used in similar contexts get similar vectors. Because relationships like male-to-female show up the same way for many pairs (man/woman, king/queen, actor/actress), the model learns one roughly constant offset vector for them. So king − man removes the "male person" part and leaves "royalty"; adding woman puts the "female" part in. The result is a point; we return the nearest vocabulary word by cosine similarity, excluding the three input words (otherwise "king" itself is often the nearest). It is approximate and linear only locally. It fails for rare words, for relations that are not consistent, and it also reproduces social bias from the training text (for example doctor − man + woman may return nurse). It is a good demo of structure in the space, not a reliable reasoning tool.</p>`,
      complexity: `<p>One vector subtraction/addition O(d), then a nearest-neighbour search over V words: O(V·d) exact.</p>`,
      followUps: ['How would you measure whether an analogy set works on a new model?', 'What bias risks does this reveal?']
    }
  }]
});

topics.push({
  title: 'Similarity: Cosine vs Dot Product vs Euclidean, and Semantic Search',
  analogy: `<p>Two friends point in a direction. <b>Cosine</b> asks "are you pointing the same way?" (ignores how far each walked). <b>Dot product</b> asks "same way AND how strongly?" <b>Euclidean</b> asks "how far apart are your feet right now?" Pick the question that matches what "similar" means for you.</p>`,
  explain: `<p>🟢 <b>Three ways to score "how alike are vectors a and b".</b></p>
${H.table(['metric', 'formula (words)', 'range', 'bigger = more similar?'], [['dot product', 'multiply matching numbers, add up', '−∞ … +∞', 'yes'], ['cosine similarity', 'dot product ÷ (length of a × length of b)', '−1 … +1', 'yes'], ['euclidean distance', 'straight-line distance √Σ(aᵢ−bᵢ)²', '0 … +∞', 'NO: smaller = closer']])}
<p><b>Worked example.</b> a = [3, 4], b = [6, 8] (same direction, b is twice as long). Dot = 3·6 + 4·8 = 50. |a| = 5, |b| = 10, so cosine = 50 / (5·10) = <b>1.0</b> (identical direction). Euclidean = √(3² + 4²) = <b>5</b> (they are not at the same spot). So cosine says "twins", euclidean says "5 apart".</p>
${H.arr([3, 4], { label: 'a' })} ${H.arr([6, 8], { label: 'b = 2a' })}
<p><b>Which should I use?</b> Text embedding models are trained for a specific metric; the model card tells you. Most are trained for <b>cosine</b>. The big shortcut: if you <b>normalise every vector to length 1</b>, then cosine = dot product, and euclidean distance² = 2 − 2·cosine. All three give the <i>same ranking</i>. So the practical rule is: normalise once, store, and use the cheapest (dot product).</p>
<p><b>Semantic search in 4 steps.</b> (1) Embed every document once, store the vectors. (2) At query time embed the query with the <i>same</i> model. (3) Score the query against every vector. (4) Return the top-k. That is the entire algorithm; the rest of this module is about doing step 3 fast.</p>`,
  clues: ['"how do you measure similarity between two embeddings?"', '"magnitude should not matter" → cosine', '"vectors already normalised" → dot product is enough', '"recommendation where popularity (vector length) matters" → dot product', '"return the top-k most similar" → k-nearest neighbours', '"smaller score is better" → a distance, not a similarity'],
  code: [{ lang: 'python', run: true, title: 'Hashed bag-of-words embeddings + cosine ranking (stdlib only)', code: `import math, re, zlib

DIM = 64  # tiny on purpose; real models use 768+

STOP = {"the", "a", "an", "is", "to", "of", "and", "in", "on", "for", "i", "my", "how", "do", "can"}

def tokens(text):
    return [t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in STOP]

def embed(text):
    """Hashing trick: each word adds +1 to bucket hash(word) % DIM, then L2-normalise."""
    v = [0.0] * DIM
    for t in tokens(text):
        v[zlib.crc32(t.encode()) % DIM] += 1.0
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / n for x in v]

def dot(a, b): return sum(x * y for x, y in zip(a, b))
def cosine(a, b):
    na = math.sqrt(dot(a, a)); nb = math.sqrt(dot(b, b))
    return dot(a, b) / (na * nb) if na and nb else 0.0

docs = [
    "Reset your password from the account settings page",
    "Our refund policy allows returns within 30 days",
    "Track your order status and delivery date",
    "Change the password and enable two factor login",
    "Pricing plans for teams and enterprise",
]
vecs = [embed(d) for d in docs]

query = "how do I change my password"
q = embed(query)
scored = sorted(((cosine(q, v), d) for v, d in zip(vecs, docs)), reverse=True)
print("query:", query)
for s, d in scored:
    print(f"{s:6.3f}  {d}")` },
  { lang: 'python', run: true, title: 'Cosine vs dot vs euclidean: when rankings agree', code: `import math, random

random.seed(7)
def dot(a, b): return sum(x * y for x, y in zip(a, b))
def norm(a): return math.sqrt(dot(a, a))
def unit(a):
    n = norm(a)
    return [x / n for x in a]
def cos(a, b): return dot(a, b) / (norm(a) * norm(b))
def euc(a, b): return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))

# Raw vectors with very different lengths
raw = [[random.gauss(0, 1) * random.choice([1, 1, 5]) for _ in range(6)] for _ in range(8)]
q = [random.gauss(0, 1) for _ in range(6)]

def top3(score, vecs, reverse):
    order = sorted(range(len(vecs)), key=lambda i: score(q, vecs[i]), reverse=reverse)
    return order[:3]

print("RAW vectors (different lengths)")
print(" cosine   top3:", top3(cos, raw, True))
print(" dot      top3:", top3(dot, raw, True))
print(" euclid   top3:", top3(euc, raw, False))

# After normalising everything to length 1 all three agree
nraw = [unit(v) for v in raw]
q = unit(q)
print("NORMALISED vectors")
print(" cosine   top3:", top3(cos, nraw, True))
print(" dot      top3:", top3(dot, nraw, True))
print(" euclid   top3:", top3(euc, nraw, False))
a, b = nraw[0], nraw[1]
print("check euclid^2 == 2 - 2*cos:", round(euc(a, b) ** 2, 6), round(2 - 2 * cos(a, b), 6))` }],
  codeTitle: ['Semantic search from scratch', 'Metric choice experiment'],
  viz: {
    title: 'Ranking documents by cosine similarity',
    input: 'how do I change my password',
    inputLabel: 'Your query',
    gen: function (input) {
      var STOP = { the: 1, a: 1, an: 1, is: 1, to: 1, of: 1, and: 1, in: 1, on: 1, for: 1, i: 1, my: 1, how: 1, do: 1, can: 1, your: 1, from: 1, our: 1 };
      function toks(s) { return (String(s).toLowerCase().match(/[a-z0-9]+/g) || []).filter(function (t) { return !STOP[t]; }); }
      var docs = ['Reset your password from account settings', 'Refund policy allows returns within 30 days', 'Track your order status and delivery date', 'Change password and enable two factor login', 'Pricing plans for teams and enterprise'];
      var q = toks(input);
      if (!q.length) throw new Error('Type a few words, e.g. "change my password"');
      var vocab = [];
      docs.map(toks).concat([q]).forEach(function (t) { t.forEach(function (w) { if (vocab.indexOf(w) < 0) vocab.push(w); }); });
      function vec(t) { var v = vocab.map(function () { return 0; }); t.forEach(function (w) { v[vocab.indexOf(w)]++; }); return v; }
      function dot(a, b) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
      function cos(a, b) { var d = Math.sqrt(dot(a, a)) * Math.sqrt(dot(b, b)); return d ? dot(a, b) / d : 0; }
      var qv = vec(q), dv = docs.map(function (d) { return vec(toks(d)); });
      var sc = dv.map(function (v) { return cos(qv, v); });
      var frames = [];
      frames.push({ narr: 'Query words after dropping filler: <b>' + q.join(', ') + '</b>. Each text becomes a vector with one slot per vocabulary word (a tiny bag-of-words "embedding").', parts: [{ type: 'table', label: 'Documents', columns: ['#', 'text'], rows: docs.map(function (d, i) { return [i, d]; }) }, { type: 'text', html: 'Vocabulary size: <b>' + vocab.length + '</b> slots.' }] });
      var shown = [], labels = [];
      for (var i = 0; i < docs.length; i++) {
        shown.push(+sc[i].toFixed(3)); labels.push('doc ' + i);
        var hl = {}; hl[i] = 'cur';
        frames.push({ narr: 'Score doc ' + i + ': dot(query, doc) ÷ (|query| · |doc|) = <b>' + sc[i].toFixed(3) + '</b>. ' + (sc[i] === 0 ? 'No shared words, so zero.' : 'Shared words push it up.'), parts: [{ type: 'bars', label: 'cosine score so far', values: shown.slice(), idxLabels: labels.slice(), hl: hl, texts: shown.map(function (s) { return s.toFixed(2); }) }] });
      }
      var order = sc.map(function (s, i) { return i; }).sort(function (a, b) { return sc[b] - sc[a]; });
      var hl2 = {}; hl2[0] = 'sel'; if (order.length > 1) hl2[1] = 'ok';
      frames.push({ narr: 'Sort high to low. Top-1 is <b>doc ' + order[0] + '</b>: "' + docs[order[0]] + '". Notice "Reset password" and "Change password" both rank high even if words differ; real embedding models go further and match synonyms.', parts: [{ type: 'bars', label: 'ranked (best first)', values: order.map(function (i) { return +sc[i].toFixed(3); }), idxLabels: order.map(function (i) { return 'doc ' + i; }), hl: hl2 }, { type: 'text', html: 'Real models add synonyms ("change" ≈ "reset"); this toy only counts shared words.' }] });
      return frames;
    }
  },
  examples: [
    { title: 'Same direction, different length', html: `<p>a = [1, 2], b = [10, 20]: cosine = 1.0, dot = 50, euclid ≈ 20.1. If b is "a very long document" and a is "a short query", cosine ignores the length difference. Dot product would reward the long one.</p>` },
    { title: 'Orthogonal means unrelated', html: `<p>a = [1, 0], b = [0, 1]: dot = 0, cosine = 0. Opposite directions give cosine = −1, but for text embeddings negative values are rare; typical unrelated pairs land near 0.0–0.3.</p>` },
    { title: 'Normalise once and speed up', html: `<p>Store unit-length vectors. Then cosine(q, v) = dot(q, v): no square roots at query time. A matrix multiply (all docs at once) is the fastest path on CPU/GPU.</p>`, code: { lang: 'python', code: `# unit vectors => cosine == dot\nscores = doc_matrix @ query_vec   # NumPy: one matrix-vector multiply\ntop_k = scores.argsort()[::-1][:5]`, check: false } },
    { title: 'Recommendation systems like dot product', html: `<p>In matrix-factorisation recommenders a longer item vector can mean "more popular/higher quality", and the dot product bakes that in. That is the one case where you deliberately keep the length.</p>` }
  ],
  deepDive: `<p>🟣 <b>Relationships between metrics.</b> For unit vectors: ‖a−b‖² = 2 − 2·cos(a,b). So euclidean-nearest = cosine-nearest = dot-largest. Without normalisation they diverge. Databases offer them as separate operators (pgvector: <code>&lt;=&gt;</code> cosine distance, <code>&lt;#&gt;</code> negative inner product, <code>&lt;-&gt;</code> L2; FAISS: <code>IndexFlatIP</code> vs <code>IndexFlatL2</code>). Note pgvector returns a <i>distance</i>: cosine distance = 1 − cosine similarity, and <code>&lt;#&gt;</code> returns the <i>negative</i> dot product so that "smaller is better" works everywhere.</p>
<p><b>Index must match metric.</b> An HNSW index built for cosine cannot answer a euclidean query; the planner will silently fall back to a slow scan. Choose the metric when you create the index.</p>
<p><b>Curse of dimensionality.</b> In very high dimensions distances concentrate: nearest and farthest neighbours look similar in distance. That is why ANN is hard and why score thresholds are fragile. Embeddings work because real data lies on a much lower-dimensional manifold.</p>
<p><b>Other metrics.</b> Manhattan (L1), Hamming (binary embeddings: XOR + popcount, 32× smaller and very fast), Jaccard for sets. Maximum inner product search (MIPS) can be converted to nearest-neighbour search by adding one extra dimension, which is how some libraries support un-normalised dot product indexes.</p>
<p><b>Score calibration.</b> A cosine of 0.78 from one model may be "excellent" and from another "mediocre". Use ranking, relative gaps, or a reranker, not hard-coded absolute thresholds.</p>`,
  aiEra: `<p><b>What AI changes:</b> the metric is mostly decided for you by the embedding model, and vector databases normalise on request. The new job is evaluating retrieval: recall@k on your own labelled queries.</p>
<p><b>Use AI as a partner:</b> paste your model card and ask <code>Which distance metric was this model trained with, and should I normalise?</code> then verify against the card. Ask for a script that computes recall@10 from a list of (query, expected_doc).</p>
<p><b>Where AI goes wrong:</b> it confidently writes cosine with a missing zero-vector guard, or builds an L2 index with cosine-trained embeddings. It also forgets that pgvector <code>&lt;=&gt;</code> returns a distance (so "higher is better" ordering is reversed).</p>
<p><b>What you must still own:</b> metric-index consistency, normalisation policy, and an evaluation set that tells you whether your search actually works.</p>`,
  problems: [{
    title: 'Rank documents by cosine similarity',
    level: 'Easy', tags: ['cosine', 'semantic search'], companies: ['Microsoft', 'Amazon'],
    statement: `<p>Given a query vector and a list of document vectors, return the indices of the top-k most similar documents by cosine similarity. Handle zero vectors safely.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, dimension ≤ 1536, k ≤ N.`,
    example: `<p>q = [1, 0], docs = [[2, 0], [0, 3], [1, 1]], k = 2 → <b>[0, 2]</b> (cosines 1.0, 0.0, 0.71).</p>`,
    brute: { why: `<p>Recomputing the document norm on every query wastes work; precompute and store unit vectors once.</p>`, code: { lang: 'python', code: `import math\n\ndef top_k_slow(q, docs, k):\n    def cos(a, b):\n        na = math.sqrt(sum(x*x for x in a)); nb = math.sqrt(sum(x*x for x in b))\n        return sum(x*y for x, y in zip(a, b)) / (na * nb) if na and nb else 0.0\n    return sorted(range(len(docs)), key=lambda i: -cos(q, docs[i]))[:k]` } },
    mcq: { q: 'If all vectors are unit length, which is equivalent to cosine ranking?', options: ['Dot product ranking', 'Sum of components', 'Vector length', 'Hamming distance'], answer: 0, explain: 'With length 1, cosine = dot product.' },
    hints: [`<p>Remember the definition: cosine = dot product divided by (length of a times length of b).</p>`, `<p>Normalise documents once; at query time only the query norm is a constant, so ranking needs just dot products.</p>`, `<p>Guard zero norms; use heapq.nlargest(k) for large N.</p>`],
    solution: {
      approach: `<p>Normalise each document once at ingestion. At query time, normalise the query, compute one dot product per document, and take the top k using a size-k min-heap.</p>`,
      code: { lang: 'python', run: true, code: `import heapq, math\n\ndef unit(v):\n    n = math.sqrt(sum(x * x for x in v))\n    return [x / n for x in v] if n else v\n\ndef top_k(q, docs, k):\n    q = unit(q)\n    docs = [unit(d) for d in docs]  # in production: done once at ingestion\n    scores = ((sum(a * b for a, b in zip(q, d)), i) for i, d in enumerate(docs))\n    return [i for _, i in heapq.nlargest(k, scores)]\n\nprint(top_k([1, 0], [[2, 0], [0, 3], [1, 1]], 2))` },
      complexity: `<p>O(N·d) for scoring plus O(N log k) for the heap; space O(N·d).</p>`,
      followUps: ['How would you make this faster for N = 100M?', 'What if two documents tie?']
    }
  }]
});

topics.push({
  title: 'Exact kNN vs ANN, and HNSW (Layered Graph Search)',
  analogy: `<p>Finding the closest coffee shop. <b>Exact kNN</b>: visit every shop in the country and measure. Always right, painfully slow. <b>HNSW</b> is like flying to the right country, taking a train to the right city, then walking the streets: coarse jumps first, fine steps last. You may miss the absolute closest shop once in a while, but you finish in milliseconds.</p>`,
  explain: `<p>🟢 <b>Exact (brute-force) kNN.</b> Compare the query to all N vectors, keep the best k. Cost per query: N × d multiplications. For 1 million vectors × 768 dims that is ~768 million operations per query: fine for a nightly job, too slow for a web request serving 1000 users per second.</p>
<p><b>Approximate nearest neighbour (ANN).</b> Build a smart index once so a query touches only a tiny fraction of the data. You pay a small <b>recall</b> loss (maybe 1–5 true neighbours out of 100 are missed) for a 10–1000× speed-up. <b>Recall@k</b> = (true top-k found) ÷ k.</p>
${H.table(['', 'exact (flat)', 'ANN (HNSW / IVF)'], [['query time', 'O(N·d)', '≈ O(log N · d)'], ['recall', '100%', '90–99% (tunable)'], ['build time', 'none', 'minutes to hours'], ['memory', 'vectors only', 'vectors + graph / centroids'], ['best for', '&lt; ~100k vectors, ground truth', '1M+ vectors, low latency']])}
<p><b>HNSW = Hierarchical Navigable Small World.</b> It stores vectors as nodes in a graph; each node links to a few close neighbours. On top is a stack of thinner graphs: the top layer has very few nodes with long jumps, the bottom layer (layer 0) has <i>all</i> nodes with short links.</p>
<p><b>Search:</b> (1) start at a fixed entry point on the top layer; (2) <b>greedy walk</b>: hop to whichever neighbour is closer to the query, until no neighbour is closer; (3) drop down one layer from that spot and repeat; (4) at layer 0 keep a candidate list of size <b>efSearch</b> instead of just one, and return the best k.</p>
<p><b>Two knobs you must know:</b></p>
<ul><li><b>M</b>: links per node. Bigger M = better recall and higher memory, slower build. Typical 16–48.</li><li><b>efConstruction</b>: candidate list size while building. Bigger = better graph, slower build (typical 100–400).</li><li><b>efSearch</b> (pgvector: <code>hnsw.ef_search</code>): candidate list at query time. Bigger = higher recall, slower query. This is your live dial.</li></ul>`,
  clues: ['"10M+ vectors, p99 under 50 ms" → ANN, not brute force', '"trade a little accuracy for speed" → approximate NN', '"recall@10", "recall vs latency curve"', '"index builds slowly but queries fast; uses lots of RAM" → HNSW', '"layered skip-list style graph" → HNSW', '"tune efSearch / M / efConstruction"'],
  code: [{ lang: 'python', run: true, title: 'Brute-force kNN vs a graph index: recall and work (stdlib only)', code: `import heapq, random, math

random.seed(3)
N, D, M = 500, 6, 8
data = [[random.gauss(0, 1) for _ in range(D)] for _ in range(N)]

def d2(a, b): return sum((x - y) ** 2 for x, y in zip(a, b))

def brute(q, k):
    return [i for _, i in heapq.nsmallest(k, ((d2(q, v), i) for i, v in enumerate(data)))]

# Build a simple proximity graph: link each node to its M nearest (symmetric)
graph = [set() for _ in range(N)]
for i in range(N):
    near = heapq.nsmallest(M, ((d2(data[i], data[j]), j) for j in range(N) if j != i))
    for _, j in near:
        graph[i].add(j); graph[j].add(i)

def graph_search(q, k, ef, entry=0):
    """Best-first beam search, the same loop HNSW uses on layer 0."""
    visited = {entry}
    dist_calls = 1
    d0 = d2(q, data[entry])
    cand = [(d0, entry)]          # min-heap: next node to expand
    best = [(-d0, entry)]         # max-heap (negated): ef best found so far
    while cand:
        dc, c = heapq.heappop(cand)
        if dc > -best[0][0] and len(best) >= ef:
            break                  # nothing left can improve the beam
        for nb in graph[c]:
            if nb in visited: continue
            visited.add(nb)
            dn = d2(q, data[nb]); dist_calls += 1
            if len(best) < ef or dn < -best[0][0]:
                heapq.heappush(cand, (dn, nb))
                heapq.heappush(best, (-dn, nb))
                if len(best) > ef: heapq.heappop(best)
    top = sorted((-nd, i) for nd, i in best)[:k]
    return [i for _, i in top], dist_calls

queries = [[random.gauss(0, 1) for _ in range(D)] for _ in range(40)]
K = 5
print(f"brute force touches {N} vectors per query")
for ef in (5, 10, 20, 50, 100):
    hit = work = 0
    for q in queries:
        truth = set(brute(q, K))
        found, calls = graph_search(q, K, ef, entry=random.randrange(N))
        hit += len(truth & set(found)); work += calls
    print(f"efSearch={ef:3d}  recall@{K}={hit / (K * len(queries)):.2f}  avg distance calls={work / len(queries):6.1f}")` },
  { lang: 'sql', check: false, title: 'pgvector: create an HNSW index and tune it (Postgres)', code: `-- needs: CREATE EXTENSION vector;
CREATE TABLE docs (id bigserial PRIMARY KEY, body text, embedding vector(768));

-- M = links per node, ef_construction = build-time candidate list
CREATE INDEX docs_hnsw ON docs USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 200);

-- Query-time recall/speed dial (default 40)
SET hnsw.ef_search = 100;

-- <=> is cosine DISTANCE (0 = identical). $1 is the query embedding.
SELECT id, body, 1 - (embedding <=> $1) AS cosine_similarity
FROM docs
ORDER BY embedding <=> $1
LIMIT 10;` }],
  codeTitle: ['Brute force vs graph beam search', 'HNSW in pgvector'],
  viz: {
    title: 'HNSW greedy search through the layers',
    input: '78 36',
    inputLabel: 'Query point "x y" (x 0-100, y 0-54)',
    gen: function (input) {
      var q = String(input).trim().split(/[\s,]+/).map(Number);
      if (q.length !== 2 || q.some(isNaN)) throw new Error('Enter two numbers, e.g. 78 36');
      q = [Math.max(0, Math.min(100, q[0])), Math.max(0, Math.min(54, q[1]))];
      var P = { A: [8, 10], B: [22, 28], C: [35, 8], D: [40, 30], E: [55, 14], F: [60, 40], G: [72, 24], H: [85, 10], I: [90, 38], J: [15, 48], K: [48, 50], L: [32, 48] };
      var layers = [{ name: 'Layer 2 (few nodes, long jumps)', members: ['B', 'G'], m: 1 }, { name: 'Layer 1 (more nodes)', members: ['B', 'D', 'G', 'I', 'K'], m: 2 }, { name: 'Layer 0 (every vector, short links)', members: Object.keys(P), m: 3 }];
      function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
      function edgesOf(L) {
        var seen = {}, out = [];
        L.members.forEach(function (u) {
          L.members.filter(function (v) { return v !== u; }).sort(function (a, b) { return dist(P[u], P[a]) - dist(P[u], P[b]); }).slice(0, L.m).forEach(function (v) {
            var key = u < v ? u + '-' + v : v + '-' + u;
            if (!seen[key]) { seen[key] = 1; out.push([u < v ? u : v, u < v ? v : u]); }
          });
        });
        return out;
      }
      function nodesOf(L) {
        var n = L.members.map(function (id) { return { id: id, label: id, x: P[id][0], y: P[id][1] }; });
        n.push({ id: 'Q', label: 'Q', x: q[0], y: q[1], shape: 'box' });
        return n;
      }
      var frames = [], cur = 'B', path = [];
      frames.push({ narr: 'We want the nearest neighbour of the query <b>Q</b>. Instead of checking all ' + Object.keys(P).length + ' points, enter at the top layer from a fixed entry point (<b>B</b>).', parts: [{ type: 'graph', label: layers[0].name, height: 56, nodes: nodesOf(layers[0]), edges: edgesOf(layers[0]), hl: { Q: 'sel', B: 'cur' } }] });
      layers.forEach(function (L, li) {
        var E = edgesOf(L), visited = [cur], steps = 0;
        var nb = function (u) { var r = []; E.forEach(function (e) { if (e[0] === u) r.push(e[1]); if (e[1] === u) r.push(e[0]); }); return r; };
        if (li > 0) {
          var h = { Q: 'sel' }; h[cur] = 'cur';
          frames.push({ narr: 'Drop down to <b>' + L.name + '</b>, keeping the position <b>' + cur + '</b> (distance to Q = ' + dist(P[cur], q).toFixed(1) + '). More nodes appear, so finer steps are possible.', parts: [{ type: 'graph', label: L.name, height: 56, nodes: nodesOf(L), edges: E, hl: h }] });
        }
        while (steps++ < 12) {
          var ns = nb(cur), best = cur, bd = dist(P[cur], q);
          ns.forEach(function (n) { if (dist(P[n], q) < bd) { bd = dist(P[n], q); best = n; } });
          if (best === cur) {
            var h2 = { Q: 'sel' }; visited.forEach(function (v) { h2[v] = 'cur'; }); h2[cur] = 'ok';
            frames.push({ narr: 'No neighbour of <b>' + cur + '</b> is closer to Q than it is (' + dist(P[cur], q).toFixed(1) + '). Greedy stops on this layer' + (li < 2 ? ' and we descend.' : '. <b>' + cur + '</b> is returned as the nearest neighbour.'), parts: [{ type: 'graph', label: L.name, height: 56, nodes: nodesOf(L), edges: E, hl: h2 }] });
            break;
          }
          var eh = {}; eh[cur + '-' + best] = 'ok'; eh[best + '-' + cur] = 'ok';
          visited.push(best);
          var h3 = { Q: 'sel' }; visited.forEach(function (v) { h3[v] = 'cur'; });
          frames.push({ narr: 'Hop <b>' + cur + ' → ' + best + '</b>: neighbour ' + best + ' is closer (' + dist(P[best], q).toFixed(1) + ' vs ' + dist(P[cur], q).toFixed(1) + '). Amber nodes are the visited path.', parts: [{ type: 'graph', label: L.name, height: 56, nodes: nodesOf(L), edges: E, hl: h3, ehl: eh }] });
          cur = best;
        }
        path = path.concat(visited);
      });
      var all = Object.keys(P).sort(function (a, b) { return dist(P[a], q) - dist(P[b], q); })[0];
      frames.push({ narr: 'Result: <b>' + cur + '</b>. True nearest by brute force is <b>' + all + '</b>' + (all === cur ? ' (same: a hit).' : ' (different: a recall miss! A larger efSearch keeps several candidates alive at layer 0 and fixes this).') + ' We touched ' + path.filter(function (v, i, a) { return a.indexOf(v) === i; }).length + ' distinct nodes instead of ' + Object.keys(P).length + '.', parts: [{ type: 'vars', vals: { returned: cur, exact_nearest: all, nodes_visited: path.filter(function (v, i, a) { return a.indexOf(v) === i; }).length }, hl: { returned: all === cur ? 'ok' : 'bad' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Why layers make it fast', html: `<p>Layer 2 might hold 1% of nodes, layer 1 maybe 6%, layer 0 all. Each node's top layer is picked randomly (exponential decay), like a skip list. A search does a few hops per layer, so total work grows roughly with log N, not N.</p>` },
    { title: 'Tuning for recall', html: `<p>Start with M = 16, efConstruction = 200, efSearch = 40. Measure recall@10 against a brute-force ground truth on 1000 real queries. If recall is 0.93 and you need 0.98: raise efSearch to 100 first (free, no rebuild). Only if that is not enough, rebuild with larger M or efConstruction.</p>`, code: { lang: 'python', check: false, code: `# FAISS HNSW (needs: pip install faiss-cpu numpy)\nimport faiss, numpy as np\nd = 768\nindex = faiss.IndexHNSWFlat(d, 32)      # M = 32\nindex.hnsw.efConstruction = 200\nindex.add(vectors)                       # float32 array (N, d)\nindex.hnsw.efSearch = 128                # query-time dial\nD, I = index.search(queries, 10)         # distances, ids` } },
    { title: 'Memory budget', html: `<p>10M vectors × 768 dims × 4 bytes ≈ 30.7 GB for the vectors. HNSW links cost about M × 2 × 4 bytes per vector; with M = 16 that is ~128 B × 10M ≈ 1.3 GB. The vectors dominate and the graph is comparatively small, but HNSW wants all of it in RAM for speed.</p>` },
    { title: 'Brute force is fine at small scale', html: `<p>With 50,000 vectors × 384 dims, a single NumPy matrix multiply takes ~5 ms. Do not add an ANN index (and its recall loss) until measurements say you need one.</p>` }
  ],
  deepDive: `<p>🟣 <b>Why small-world graphs work.</b> A graph where most links are local but a few are long has short paths between any two nodes ("six degrees"). Greedy routing works if the graph is <i>navigable</i>. HNSW's layers create the long links automatically. Insertion: draw a random top level l = ⌊−ln(U)·mL⌋, greedy-descend to l, then at each lower layer find efConstruction candidates and link to M of them (using a diversity heuristic that avoids linking to neighbours that are already close to each other).</p>
<p><b>Failure modes.</b> (1) <b>Local minima</b>: greedy gets stuck in a pocket; beam width efSearch rescues it. (2) <b>Deletes</b>: removing nodes breaks navigation; most libraries mark-deleted and rebuild later (pgvector needs <code>REINDEX</code>/vacuum care; hnswlib has mark_deleted). (3) <b>Filtered search</b>: if the filter keeps 1% of nodes, the walk may hit mostly excluded nodes and return fewer than k results (see the metadata filtering topic). (4) <b>Memory-bound</b>: graph hops are random memory reads, so latency tracks cache/RAM speed. Disk-based alternatives: DiskANN/Vamana, SPANN, and quantised HNSW.</p>
<p><b>Recall measurement.</b> Compute ground truth with exact search on a sample, then recall@k = |ANN ∩ exact| / k averaged over queries. Plot recall vs QPS at several efSearch values; pick the knee. Report the latency percentile (p95/p99), not only the mean. ANN-Benchmarks is the standard public comparison.</p>
<p><b>Build cost.</b> Roughly O(N · efConstruction · log N). Building 100M vectors can take hours and tens of GB; parallel builds exist. Incremental inserts are supported, which is a big advantage over IVF.</p>`,
  aiEra: `<p><b>What AI changes:</b> every RAG app needs ANN, and vector search is now a managed feature in Postgres, OpenSearch, MongoDB, Elasticsearch and Redis, so you often tune a dial rather than build an index. Quantisation (int8, binary, product quantisation) combined with HNSW is how teams fit billions of vectors affordably.</p>
<p><b>Use AI as a partner:</b> ask <code>Write a benchmark script that measures recall@10 and p95 latency for efSearch in [20, 40, 80, 160]</code>, then read and run it yourself. Ask it to explain a graph-index paper (HNSW, DiskANN) section by section.</p>
<p><b>Where AI goes wrong:</b> it recommends "just use HNSW with defaults" without sizing memory, claims ANN is "99.9% accurate" with no dataset, and mixes up M (links) with efSearch (beam width).</p>
<p><b>What you must still own:</b> the recall target, the memory/latency budget, and testing on your real queries rather than benchmark data.</p>`,
  problems: [{
    title: 'Tune HNSW for a recall target',
    level: 'Medium', tags: ['HNSW', 'ANN', 'tuning'], companies: ['Pinecone', 'Google', 'Meta'],
    statement: `<p>Your semantic search over 20M vectors uses HNSW (M = 16, efSearch = 40) with recall@10 = 0.91 and p95 latency 18 ms. Product wants recall ≥ 0.97 with p95 ≤ 40 ms. Describe exactly what you change, in what order, and how you verify.</p>`,
    constraints: `RAM is limited; rebuilding the index takes about 6 hours.`,
    example: `<p>${H.table(['efSearch', 'recall@10', 'p95 ms'], [['40', '0.91', '18'], ['100', '0.96', '30'], ['160', '0.975', '42']])}</p>`,
    brute: { why: `<p>Switching to exact search gives recall 1.0 but needs 20M × d operations per query (hundreds of ms to seconds) and would blow the latency budget.</p>` },
    mcq: { q: 'Which change needs NO index rebuild?', options: ['Raise efSearch', 'Raise M', 'Raise efConstruction', 'Change the distance metric'], answer: 0, explain: 'efSearch is a query-time parameter; the others change the graph itself.' },
    hints: [`<p>Separate query-time knobs from build-time knobs.</p>`, `<p>Raise efSearch first and plot recall vs latency.</p>`, `<p>If efSearch alone cannot reach 0.97 inside 40 ms, rebuild with larger M and efConstruction, and consider an exact rerank of the top 100 with full-precision vectors.</p>`],
    solution: {
      approach: `<p>Step 1: build a ground-truth set by running exact search on about 1000 representative queries. Step 2: sweep efSearch (40, 80, 120, 160, 200) with the existing index and record recall@10 and p95 latency per setting, at realistic concurrency. This costs nothing and needs no rebuild. Step 3: if a setting meets both targets (for example efSearch ≈ 140), ship it as the new default and monitor. Step 4: if recall plateaus below 0.97 or latency exceeds 40 ms first, the graph quality is the limit: rebuild offline in a shadow index with M = 32 and efConstruction = 300 (more memory: roughly +16 links per node, a few GB), then repeat the sweep, and swap with an alias cutover. Step 5: other levers are quantisation with a full-precision rerank of the top 100, sharding to cut per-shard N, and more replicas for latency under load. Always measure on real query logs, because synthetic benchmarks hide hard queries.</p>`,
      complexity: `<p>Query cost grows about linearly with efSearch; memory grows linearly with M.</p>`,
      followUps: ['How does metadata filtering change the recall curve?', 'When is IVF-PQ a better choice than HNSW?']
    }
  }]
});

topics.push({
  title: 'IVF Indexes: Clusters, nprobe and Recall vs Speed',
  analogy: `<p>A huge library sorted into <b>sections</b> (cooking, travel, history...). You do not walk every shelf. You decide which sections are likely to hold your book and search only those. If you search just 1 section you are fast but may miss the book that is shelved next door. Search 3 sections: slower, safer. That count is <b>nprobe</b>.</p>`,
  explain: `<p>🟢 <b>IVF = Inverted File index.</b> Two phases:</p>
<ol><li><b>Training / build:</b> run <b>k-means</b> on (a sample of) the vectors to find <code>nlist</code> cluster centres (centroids). Assign every vector to its nearest centroid. Each centroid owns a "bucket" (an inverted list).</li><li><b>Query:</b> compare the query only to the <code>nlist</code> centroids (cheap), pick the <code>nprobe</code> closest buckets, and scan <i>only the vectors inside those buckets</i> exactly.</li></ol>
<p><b>The numbers.</b> N = 1,000,000, nlist = 1000 → about 1000 vectors per bucket. With nprobe = 10 you compute 1000 centroid distances + ~10,000 vector distances = 11,000 instead of 1,000,000: ~90× less work.</p>
${H.table(['nprobe', 'vectors scanned (≈)', 'speed', 'recall (typical)'], [['1', '1,000', 'fastest', '~60-70%'], ['10', '10,000', 'fast', '~90-95%'], ['50', '50,000', 'medium', '~98-99%'], ['1000 (= nlist)', '1,000,000', 'same as brute force', '100%']])}
<p><b>Why do we miss neighbours?</b> The true nearest neighbour sometimes sits just across a cluster border. Its centroid is not among the few we probed, so we never look at it. More probes = more borders covered = higher recall = slower.</p>
<p><b>Rules of thumb:</b> nlist ≈ √N to 4·√N; train on at least 30-50 × nlist vectors; nprobe is the live dial, usually 1-10% of nlist. IVF is compact and easy to build, and it combines naturally with <b>product quantization</b> (<code>IVF-PQ</code>) to squeeze vectors to 8-64 bytes each.</p>`,
  clues: ['"billions of vectors, memory is the limit" → IVF-PQ', '"cluster the vectors first, search only the nearest clusters"', '"nlist", "nprobe", "centroids", "inverted lists"', '"recall drops when nprobe is small"', '"index needs a training step"', '"data drifts, centroids go stale → retrain"'],
  code: [{ lang: 'python', run: true, title: 'IVF from scratch: k-means + nprobe vs recall (stdlib only)', code: `import random, math, heapq

random.seed(11)
N, D, NLIST = 1500, 8, 16
# Make clustered data: 12 hidden blobs
blobs = [[random.uniform(-6, 6) for _ in range(D)] for _ in range(12)]
data = []
for i in range(N):
    c = random.choice(blobs)
    data.append([x + random.gauss(0, 1.2) for x in c])

def d2(a, b): return sum((x - y) ** 2 for x, y in zip(a, b))

# ---- build phase: k-means ----
cents = random.sample(data, NLIST)
for _ in range(6):
    buckets = [[] for _ in range(NLIST)]
    for v in data:
        j = min(range(NLIST), key=lambda c: d2(v, cents[c]))
        buckets[j].append(v)
    for j, b in enumerate(buckets):
        if b:
            cents[j] = [sum(col) / len(b) for col in zip(*b)]

# inverted lists hold ids (index into data)
lists = [[] for _ in range(NLIST)]
for i, v in enumerate(data):
    lists[min(range(NLIST), key=lambda c: d2(v, cents[c]))].append(i)
print("bucket sizes:", sorted(len(l) for l in lists))

def exact(q, k):
    return {i for _, i in heapq.nsmallest(k, ((d2(q, v), i) for i, v in enumerate(data)))}

def ivf(q, k, nprobe):
    order = sorted(range(NLIST), key=lambda c: d2(q, cents[c]))[:nprobe]
    scanned = 0
    cand = []
    for c in order:
        for i in lists[c]:
            cand.append((d2(q, data[i]), i)); scanned += 1
    return {i for _, i in heapq.nsmallest(k, cand)}, scanned + NLIST

queries = [[x + random.gauss(0, 1.2) for x in random.choice(blobs)] for _ in range(60)]
K = 10
print(f"brute force scans {N} vectors")
for nprobe in (1, 2, 4, 8, 16):
    hit = work = 0
    for q in queries:
        truth = exact(q, K)
        found, scanned = ivf(q, K, nprobe)
        hit += len(truth & found); work += scanned
    print(f"nprobe={nprobe:2d}  recall@{K}={hit / (K * len(queries)):.2f}  avg vectors touched={work / len(queries):7.1f}")` },
  { lang: 'python', check: false, title: 'FAISS: IVF-Flat and IVF-PQ (needs faiss-cpu, numpy)', code: `import faiss, numpy as np

d, nlist = 768, 4096
xb = np.random.rand(2_000_000, d).astype("float32")      # your embeddings
faiss.normalize_L2(xb)                                    # cosine via inner product

quantizer = faiss.IndexFlatIP(d)                          # searches the centroids
index = faiss.IndexIVFFlat(quantizer, d, nlist, faiss.METRIC_INNER_PRODUCT)
index.train(xb[:200_000])                                 # k-means on a sample
index.add(xb)
index.nprobe = 32                                         # the live recall/speed dial

# Compressed version: 64 bytes per vector instead of 3072
m, nbits = 64, 8
ivfpq = faiss.IndexIVFPQ(quantizer, d, nlist, m, nbits)
ivfpq.train(xb[:200_000]); ivfpq.add(xb); ivfpq.nprobe = 32

D, I = index.search(xb[:5], 10)                          # distances, ids` }],
  codeTitle: ['Build and probe an IVF index', 'IVF in FAISS'],
  viz: {
    title: 'IVF: probing the nearest cells',
    input: '55 40 2',
    inputLabel: 'Query "x y nprobe" (x,y 0-100; nprobe 1-9)',
    gen: function (input) {
      var a = String(input).trim().split(/[\s,]+/).map(Number);
      if (a.length !== 3 || a.some(isNaN)) throw new Error('Enter: x y nprobe, e.g. 55 40 2');
      var q = [Math.max(0, Math.min(100, a[0])), Math.max(0, Math.min(100, a[1]))], np = Math.max(1, Math.min(9, Math.round(a[2])));
      var cents = []; for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) cents.push([17 + c * 33, 17 + r * 33]);
      var seed = 7; function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
      var pts = []; for (var i = 0; i < 90; i++) pts.push([Math.max(0, Math.min(100, rnd() * 100)), Math.max(0, Math.min(100, rnd() * 100))]);
      function d(p, r2) { return Math.hypot(p[0] - r2[0], p[1] - r2[1]); }
      var cell = pts.map(function (p) { var b = 0; cents.forEach(function (cc, j) { if (d(p, cc) < d(p, cents[b])) b = j; }); return b; });
      var counts = cents.map(function (_, j) { return cell.filter(function (x) { return x === j; }).length; });
      var truth = pts.map(function (p, i) { return i; }).sort(function (x, y) { return d(pts[x], q) - d(pts[y], q); }).slice(0, 5);
      var order = cents.map(function (_, j) { return j; }).sort(function (x, y) { return d(cents[x], q) - d(cents[y], q); });
      function gridRows(probed, showTruth) {
        var rows = [], hl = {};
        for (var r = 0; r < 3; r++) { var row = []; for (var c = 0; c < 3; c++) { var j = r * 3 + c; var nt = truth.filter(function (t) { return cell[t] === j; }).length; row.push('cell ' + j + ': ' + counts[j] + ' vecs' + (showTruth && nt ? ' (★' + nt + ')' : '')); if (probed.indexOf(j) >= 0) hl[r + ',' + c] = nt && showTruth ? 'ok' : 'sel'; else if (showTruth && nt) hl[r + ',' + c] = 'bad'; } rows.push(row); }
        return { rows: rows, hl: hl };
      }
      var frames = [], g = gridRows([], false);
      frames.push({ narr: 'Training finished: the space is split into <b>9 cells</b> (nlist = 9), each owning the vectors nearest its centroid. Numbers show how many vectors live in each cell (90 total).', parts: [{ type: 'grid', label: 'IVF cells (centroid buckets)', rows: g.rows, rowHead: ['top', 'mid', 'bottom'], colHead: ['left', 'centre', 'right'], hl: {} }] });
      var qc = order[0], qr = Math.floor(qc / 3), qcol = qc % 3, h0 = {}; h0[qr + ',' + qcol] = 'cur';
      frames.push({ narr: 'Query at (' + q[0] + ', ' + q[1] + '). Step 1: compare it to just the 9 centroids. Nearest centroid is <b>cell ' + qc + '</b>. Cheap: 9 distance computations instead of 90.', parts: [{ type: 'grid', label: 'query lands near cell ' + qc, rows: g.rows, rowHead: ['top', 'mid', 'bottom'], colHead: ['left', 'centre', 'right'], hl: h0 }] });
      var probed = [], scanned = 0;
      for (var s = 0; s < np; s++) {
        probed.push(order[s]); scanned += counts[order[s]];
        var gg = gridRows(probed, false);
        frames.push({ narr: 'Probe #' + (s + 1) + ': scan every vector inside <b>cell ' + order[s] + '</b> (' + counts[order[s]] + ' vectors). Purple cells are probed; the rest are never touched. Scanned so far: <b>' + scanned + '</b> of 90.', parts: [{ type: 'grid', label: 'nprobe = ' + np + ' (probing)', rows: gg.rows, rowHead: ['top', 'mid', 'bottom'], colHead: ['left', 'centre', 'right'], hl: gg.hl }] });
      }
      var fin = gridRows(probed, true), found = truth.filter(function (t) { return probed.indexOf(cell[t]) >= 0; }).length;
      frames.push({ narr: 'Reveal the true 5 nearest neighbours (★). Green cells = probed and contain a true neighbour, <b>red cells = a true neighbour hides there but we did not probe it</b>. Recall@5 = <b>' + found + '/5</b>, work = ' + (scanned + 9) + ' of 90 distance computations. Try nprobe 1 vs 4 vs 9.', parts: [{ type: 'grid', label: 'ground truth vs probed cells', rows: fin.rows, rowHead: ['top', 'mid', 'bottom'], colHead: ['left', 'centre', 'right'], hl: fin.hl }, { type: 'vars', vals: { nprobe: np, recall_at_5: found + '/5', distance_computations: scanned + 9 }, hl: { recall_at_5: found === 5 ? 'ok' : 'bad' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Border effect', html: `<p>Query sits exactly on the line between cell A and cell B. Its nearest neighbour may be in B while the closest centroid is A. With nprobe = 1 you probe only A and miss it. With nprobe = 2 both sides are scanned. This is the main source of IVF recall loss.</p>` },
    { title: 'Choosing nlist and nprobe', html: `<p>N = 4M → nlist ≈ 4·√N = 8000. Train on ~300k sampled vectors. Start with nprobe = 1% of nlist = 80; sweep 16, 32, 64, 128 and plot recall vs latency like we did for HNSW.</p>` },
    { title: 'IVF-PQ saves memory', html: `<p>Product quantization splits a 768-d vector into 96 sub-vectors of 8 dims, replaces each with the id of its nearest of 256 learned codewords (1 byte). A 3072-byte vector becomes 96 bytes (32× smaller). Distances are computed from lookup tables. Recall drops a bit, so rerank the top 100 with the original vectors.</p>` },
    { title: 'IVF vs HNSW at a glance', html: `${H.table(['', 'IVF-Flat', 'HNSW'], [['build', 'fast (k-means)', 'slow'], ['memory', 'low (plus PQ even lower)', 'higher (graph in RAM)'], ['incremental inserts', 'ok until clusters drift', 'great'], ['recall at same speed', 'a bit lower', 'higher'], ['GPU support', 'excellent (FAISS)', 'limited']])}` }
  ],
  deepDive: `<p>🟣 <b>Training matters.</b> Poorly trained centroids (too few training points, unrepresentative sample) create lopsided buckets: one giant bucket kills speed. Check the bucket-size histogram. If your data drifts (new topics, a new embedding model), retrain; mixing old centroids with new data silently lowers recall.</p>
<p><b>Cost model.</b> Per query ≈ nlist·d (centroid scan) + nprobe·(N/nlist)·d (bucket scan). Minimised around nlist ≈ √N. For huge N use two-level or HNSW-over-centroids ("IVF_HNSW") so the centroid scan itself is fast.</p>
<p><b>Residual encoding & PQ.</b> IVF-PQ usually encodes the <i>residual</i> (vector − its centroid), which has smaller magnitude and quantises better. ADC (asymmetric distance computation) keeps the query in full precision and only the database side compressed. OPQ rotates the space first to balance information across sub-vectors. ScaNN's anisotropic quantisation weights error along the query direction.</p>
<p><b>Distributed.</b> Billion-scale systems shard by cluster: each machine owns some inverted lists; a query is routed to the machines owning its nprobe cells. Disk variants (IVF on SSD, SPANN) keep only centroids in RAM.</p>
<p><b>Metadata filters</b> pair well with IVF: pre-filter inside each probed bucket (cheap scan) rather than risk HNSW's disconnected-graph problem. That is one reason IVF still thrives in 2026 even though HNSW is the default.</p>`,
  aiEra: `<p><b>What AI changes:</b> corpora explode (every document, chat, code file gets embedded), so memory cost matters more than ever. IVF-PQ, binary quantisation and Matryoshka truncation are how billion-vector RAG and recommendation systems stay affordable. GPU indexes (FAISS GPU, cuVS CAGRA) build in minutes.</p>
<p><b>Use AI as a partner:</b> ask it to generate a parameter-sweep script for nlist/nprobe and to explain the memory formula for IVF-PQ; ask <code>What breaks if my embedding model changes?</code> (answer: everything must be re-embedded and re-trained).</p>
<p><b>Where AI goes wrong:</b> it picks nlist randomly (e.g. 100 for 100M vectors), forgets the training step, or confuses nprobe with k. It may also claim IVF is "always faster than HNSW"; it depends on recall target and filters.</p>
<p><b>What you must still own:</b> the recall/latency/memory triangle, retraining policy, and verifying with exact ground truth.</p>`,
  problems: [{
    title: 'IVF recall vs nprobe',
    level: 'Medium', tags: ['IVF', 'recall', 'nprobe'], companies: ['Meta', 'Spotify'],
    statement: `<p>An IVF index has nlist = 1024 over 2M vectors. At nprobe = 8 you measure recall@10 = 0.82 and 3 ms per query. Estimate how many vectors are scanned at nprobe = 8 and 64, explain why recall rises, and say what you would pick if recall must be ≥ 0.97 with a 15 ms budget.</p>`,
    constraints: `Assume balanced buckets and a 3 ms cost of about 16,000 vector distance computations.`,
    example: `<p>Bucket size ≈ 2,000,000 / 1024 ≈ 1953. nprobe = 8 → ≈ 15,600 + 1024 centroid checks. nprobe = 64 → ≈ 125,000 + 1024.</p>`,
    brute: { why: `<p>Brute force scans 2,000,000 vectors (≈ 125× more than nprobe = 8, around 375 ms at the same speed), which misses the budget.</p>` },
    mcq: { q: 'Raising nprobe from 8 to 64 mainly...', options: ['Raises recall and latency', 'Lowers recall, lowers latency', 'Changes the centroids', 'Needs retraining'], answer: 0, explain: 'More buckets are scanned, so more neighbours across borders are found, at a proportional cost.' },
    hints: [`<p>Work per query is roughly nprobe times the average bucket size, plus the centroid scan.</p>`, `<p>Latency scales roughly linearly with vectors scanned: 125k / 16k ≈ 8× → ~24 ms.</p>`, `<p>Find the smallest nprobe reaching 0.97 (measure), then if too slow add PQ + rerank, or shrink buckets with larger nlist.</p>`],
    solution: {
      approach: `<p>Scanning cost is about nprobe × (N / nlist) plus the nlist centroid comparisons. At nprobe = 8 that is roughly 15,600 + 1,024 distance computations, matching the 3 ms measurement. At nprobe = 64 it is roughly 125,000 + 1,024, about 8 times more work, so around 24 ms: this misses the 15 ms budget. Recall rises because more neighbouring cells are covered, so true neighbours lying across cluster borders are no longer skipped. Practical plan: measure recall on ground truth for nprobe = 16, 24, 32, 48. Recall typically reaches 0.97 near 4–6% of nlist, so maybe nprobe ≈ 48 (≈ 94k scans, ~18 ms), slightly over budget. Fixes: raise nlist to 4096 (buckets of ~490, finer cells, so you can probe 4× more cells for the same scan cost with better recall), use PQ codes so each distance is cheaper, run searches in parallel across shards, and exact-rerank only the top 100 candidates. Re-sweep after each change.</p>`,
      complexity: `<p>Query ≈ nlist·d + nprobe·(N/nlist)·d; memory N·d·4 bytes (Flat) or N·m bytes (PQ).</p>`,
      followUps: ['What if the buckets are very unbalanced?', 'How do you detect centroid drift?']
    }
  }]
});

topics.push({
  title: 'Vector Databases (pgvector, Pinecone, FAISS) and Metadata Filtering',
  analogy: `<p>A vector index (FAISS) is like a <b>fast card catalogue</b>: great at "find books like this", but it does not run the library. A vector database is the <b>whole library</b>: catalogue plus shelves, librarians, borrowing records, backups, opening hours and the ability to say "only books published after 2020 in the French section".</p>`,
  explain: `<p>🟢 <b>What a vector database adds on top of an ANN index:</b> persistence (survives restarts), CRUD (insert/update/delete without a full rebuild), <b>metadata</b> stored beside each vector, <b>filtering</b>, replication, sharding, access control, and an API.</p>
${H.table(['option', 'what it is', 'sweet spot', 'watch out'], [['<b>FAISS</b>', 'a C++/Python <i>library</i> of indexes (Flat, IVF, HNSW, PQ, GPU)', 'research, batch jobs, embedded in your own service, billion-scale with GPUs', 'no server, no CRUD story, no metadata or auth: you build around it'], ['<b>pgvector</b>', 'Postgres extension: <code>vector</code> column + HNSW/IVFFlat indexes', 'you already run Postgres; up to ~10-50M vectors; joins, transactions, SQL filters', 'index RAM pressure; very large scale needs sharding'], ['<b>Pinecone</b>', 'fully managed, serverless vector DB', 'no ops, spiky traffic, namespaces per tenant, fast to production', 'vendor lock-in, cost at scale, less control'], ['Qdrant / Weaviate / Milvus', 'open-source vector DBs (self-host or cloud)', 'rich filtering, hybrid search, big scale, on-prem', 'you operate them (unless cloud)'], ['Elasticsearch / OpenSearch / MongoDB Atlas / Redis', 'search/NoSQL engines with vector support', 'you already use them; combine BM25 + vectors in one place', 'vector features can lag dedicated engines']])}
<p><b>Metadata filtering.</b> Real queries are "similar documents <i>where</i> tenant = acme <i>and</i> year ≥ 2023". Three strategies:</p>
<ul><li><b>Post-filter:</b> ANN returns top-k first, then drop non-matching rows. Simple but dangerous: if the filter keeps only 2% of data, 10 candidates leave you with ~0 results.</li><li><b>Pre-filter:</b> find matching ids first, then search only those. Correct, but a graph index may be disconnected for the subset; engines fall back to a scan when the filter is very selective.</li><li><b>Integrated (filtered) ANN:</b> the index walk checks the filter while traversing (Qdrant, Weaviate, Pinecone, pgvector 0.8 iterative scans). Best default.</li></ul>
<p><b>Multi-tenancy.</b> Separate namespace/partition/index per tenant avoids cross-customer leakage and makes the filter free.</p>`,
  clues: ['"we already use Postgres, only a few million vectors" → pgvector', '"no ops team, spiky traffic" → managed (Pinecone, Qdrant Cloud)', '"billion vectors, GPU, batch" → FAISS / Milvus', '"only return documents the user is allowed to see" → metadata filter / ACL', '"multi-tenant SaaS" → namespace or partition per tenant', '"why do I get fewer than k results?" → post-filtering'],
  code: [{ lang: 'python', run: true, title: 'Why post-filtering returns too few results (stdlib only)', code: `import random, math

random.seed(5)
N, D = 3000, 8
data = [[random.gauss(0, 1) for _ in range(D)] for _ in range(N)]
tenant = [random.choice(["acme"] * 1 + ["other"] * 49) for _ in range(N)]   # acme = 2% of rows

def d2(a, b): return sum((x - y) ** 2 for x, y in zip(a, b))
q = [random.gauss(0, 1) for _ in range(D)]
K = 10

# Rank everything once (stands in for the ANN index)
ranked = sorted(range(N), key=lambda i: d2(q, data[i]))

# 1) POST-filter: take top-K first, then drop other tenants
post = [i for i in ranked[:K] if tenant[i] == "acme"]
print("post-filter (top-10 then filter) returned:", len(post), "results")

# 2) Post-filter with over-fetch: take top-200 then filter then cut to K
over = [i for i in ranked[:200] if tenant[i] == "acme"][:K]
print("post-filter with over-fetch 200 returned:", len(over), "results")

# 3) PRE-filter: search only inside the allowed rows
allowed = [i for i in range(N) if tenant[i] == "acme"]
pre = sorted(allowed, key=lambda i: d2(q, data[i]))[:K]
print("pre-filter returned:", len(pre), "results out of", len(allowed), "acme rows")
print("pre-filter is exact within the allowed rows; best id:", pre[0])` },
  { lang: 'sql', check: false, title: 'pgvector: vectors + SQL filters + joins', code: `CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
  id        bigserial PRIMARY KEY,
  tenant_id int        NOT NULL,
  doc_id    int        NOT NULL,
  year      int,
  body      text,
  embedding vector(1536)
);

-- ANN index for cosine + a normal B-tree for the filter column
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON chunks (tenant_id, year);

-- pgvector 0.8+: keep scanning the index until enough rows pass the WHERE filter
SET hnsw.iterative_scan = relaxed_order;

SELECT c.id, c.body, d.title, c.embedding <=> $1 AS distance
FROM chunks c
JOIN documents d ON d.id = c.doc_id          -- joins are a big pgvector advantage
WHERE c.tenant_id = 42 AND c.year >= 2023
ORDER BY c.embedding <=> $1
LIMIT 10;` },
  { lang: 'python', check: false, title: 'Pinecone: upsert with metadata and a filtered query', code: `import os
from pinecone import Pinecone

pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])      # never hard-code keys
index = pc.Index("support-articles")

index.upsert(
    vectors=[{"id": "doc42-chunk3", "values": embedding,    # list[float] from your model
              "metadata": {"tenant": "acme", "year": 2024, "lang": "en"}}],
    namespace="acme",                                        # one namespace per tenant
)

res = index.query(
    vector=query_embedding, top_k=10, namespace="acme",
    filter={"year": {"$gte": 2023}, "lang": {"$eq": "en"}},
    include_metadata=True,
)
for m in res.matches:
    print(m.id, round(m.score, 3), m.metadata)` }],
  codeTitle: ['Pre vs post filtering', 'pgvector with filters', 'Pinecone filtered query'],
  viz: {
    title: 'A vector search request, and why filters bite',
    input: '10 2',
    inputLabel: 'Corpus size in millions, then % of rows matching your filter (e.g. "10 2")',
    gen: function (input) {
      var a = String(input).trim().split(/[\s,]+/).map(Number);
      if (a.length !== 2 || a.some(isNaN) || a[0] <= 0 || a[1] <= 0 || a[1] > 100) throw new Error('Enter: millions percentMatching, e.g. 10 2');
      var M = a[0], pct = a[1], K = 10, overfetch = 50;
      var nodes = [{ id: 'U', label: 'User query', x: 8, y: 22, shape: 'box' }, { id: 'E', label: 'Embedding model', x: 32, y: 22, shape: 'box' }, { id: 'V', label: 'Vector DB (ANN + filter)', x: 62, y: 22, shape: 'box', w: 26 }, { id: 'R', label: 'Top-k chunks', x: 90, y: 10, shape: 'box' }, { id: 'L', label: 'LLM / app', x: 90, y: 36, shape: 'box' }];
      var edges = [['U', 'E', 'text'], ['E', 'V', 'query vector'], ['V', 'R', 'ids + metadata'], ['R', 'L', 'context']];
      var frames = [], steps = [['U', 'U-E'], ['E', 'E-V'], ['V', 'V-R'], ['R', 'R-L']];
      frames.push({ narr: 'The request path: your text is turned into a vector, the vector DB finds nearest neighbours (applying filters), and the matching chunks go to your app or LLM.', parts: [{ type: 'graph', directed: true, height: 48, nodes: nodes, edges: edges, hl: {} }] });
      var hl = {}, eh = {};
      steps.forEach(function (s, i) {
        hl[s[0]] = 'done'; eh[s[1]] = 'ok';
        var cur = {}; Object.keys(hl).forEach(function (k) { cur[k] = hl[k]; }); cur[['E', 'V', 'R', 'L'][i]] = 'cur';
        var txt = ['Embed the question with the <b>same model</b> used at ingestion.', 'Send the vector to the DB together with the filter, e.g. tenant = acme.', 'The DB walks its HNSW/IVF index and returns ids, scores and metadata.', 'Chunks flow to the LLM prompt or the UI.'][i];
        frames.push({ narr: txt, parts: [{ type: 'graph', directed: true, height: 48, nodes: nodes, edges: edges, hl: cur, ehl: Object.assign({}, eh) }] });
      });
      var survive = Math.round(overfetch * pct / 100 * 10) / 10;
      frames.push({ narr: 'Now the filter. Your corpus has <b>' + M + 'M</b> vectors and the filter keeps <b>' + pct + '%</b> (' + (M * pct / 100).toFixed(2) + 'M rows). With <b>post-filtering</b> and an over-fetch of ' + overfetch + ', only about <b>' + survive + '</b> of the ' + overfetch + ' candidates survive. ' + (survive >= K ? 'Enough for k = ' + K + '.' : '<span class="c-r">Fewer than k = ' + K + ' results!</span>'), parts: [{ type: 'bars', label: 'candidates fetched vs survivors vs k wanted', values: [overfetch, survive, K], idxLabels: ['fetched', 'survive filter', 'k wanted'], hl: { 1: survive >= K ? 'ok' : 'bad', 2: 'sel' } }] });
      var rec;
      if (M <= 0.1) rec = ['FAISS flat or NumPy', 'Tiny: brute force is exact, fast, no infrastructure.'];
      else if (M <= 5) rec = ['pgvector (HNSW)', 'Fits in one Postgres, SQL filters and joins, transactions with your other data.'];
      else if (M <= 100) rec = ['Managed (Pinecone / Qdrant Cloud) or pgvector + partitioning', 'Tens of millions: managed removes ops; pgvector still works with enough RAM.'];
      else rec = ['Sharded Milvus / Qdrant / FAISS-IVFPQ on GPUs', 'Hundreds of millions to billions: compress (PQ), shard, and budget carefully.'];
      var filt = pct < 5 ? 'Very selective filter: use pre-filter / namespaces / partitioning, or integrated filtered search.' : 'Mild filter: integrated filtering or small over-fetch is fine.';
      frames.push({ narr: 'Choosing for <b>' + M + 'M</b> vectors: <b>' + rec[0] + '</b>. ' + rec[1], parts: [{ type: 'table', label: 'Recommendation', columns: ['scale', 'suggested store', 'filter plan'], rows: [[M + 'M vectors', rec[0], filt]], hl: { 0: 'sel' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Startup with 800k chunks', html: `<p>Already on Postgres. Add <code>vector(1536)</code>, an HNSW index, and a <code>tenant_id</code> filter. One database to back up, transactions between your app rows and embeddings, zero new vendors. Done in an afternoon.</p>` },
    { title: 'Spiky consumer app, 40M vectors, 3-person team', html: `<p>A managed vector DB (Pinecone serverless or Qdrant Cloud) with a namespace per user group. You pay for what you use, no index tuning at 3 a.m. Check the egress/read-unit pricing before launch.</p>` },
    { title: 'Image similarity, 2B vectors, offline', html: `<p>FAISS IVF-PQ on GPUs or Milvus. Memory is the bottleneck, so quantise to 32-64 bytes/vector. A rerank stage on the original vectors recovers accuracy.</p>` },
    { title: 'Permission filtering (security)', html: `<p>RAG over company docs must only return what the asking user may read. Store <code>acl_groups</code> as metadata and filter on it inside the DB. Filtering after the LLM has seen the text is too late.</p>` }
  ],
  deepDive: `<p>🟣 <b>Storage and cost.</b> RAM is the main cost. float32 = 4·d bytes per vector; float16 halves it; int8 quarters it; binary quantisation is 32× smaller (Hamming search + rerank). pgvector supports <code>halfvec</code> and <code>bit</code>. Many engines keep vectors on SSD and only the graph/centroids in RAM (DiskANN style).</p>
<p><b>pgvector details.</b> Two index types: <b>HNSW</b> (better recall/speed, slower build, more RAM) and <b>IVFFlat</b> (fast build, needs data before creating, tune <code>lists</code> and <code>ivfflat.probes</code>). Build with enough <code>maintenance_work_mem</code>. Version 0.8 added iterative index scans so filtered queries keep scanning until k rows pass. Always check the plan with <code>EXPLAIN</code>; if the planner picks a sequential scan or a different B-tree index, a very selective filter may be winning (that can be fine and exact).</p>
<p><b>Consistency and freshness.</b> Managed engines are often eventually consistent: a just-upserted vector may take seconds to appear. Postgres gives transactional visibility instantly. Deletes in graph indexes are lazy; compaction/reindexing is needed.</p>
<p><b>Hybrid and sparse-dense.</b> Many engines now accept sparse vectors (BM25/SPLADE) alongside dense ones and fuse server-side. See the hybrid search topic.</p>
<p><b>Operational checklist:</b> store embedding model + version per row; plan for re-embedding (blue/green index, alias swap); backups; per-tenant isolation; monitor recall (golden queries), p95 latency, index size, and write throughput.</p>`,
  aiEra: `<p><b>What AI changes:</b> every vendor now markets "vector search", but the real choice is rarely the ANN algorithm; it is operations, filtering, cost, and where your other data lives. "Just use Postgres" is a legitimate answer for most teams, while specialised engines win at extreme scale or with complex filters.</p>
<p><b>Use AI as a partner:</b> have it draft a comparison matrix for your constraints (scale, QPS, team size, compliance), then ask it for the questions it could not answer without your data. Ask for a migration plan from pgvector to a dedicated DB with a dual-write phase.</p>
<p><b>Where AI goes wrong:</b> it recites stale pricing and limits, invents SDK method names, and forgets multi-tenant security. Verify against current docs, and never paste real API keys into a chat.</p>
<p><b>What you must still own:</b> access control on retrieval, cost estimates (vectors x dims x bytes), and a rollback plan when you change embedding models.</p>`,
  problems: [{
    title: 'Choose a vector DB for a given scale',
    level: 'Medium', tags: ['vector DB', 'system design', 'pgvector'], companies: ['Notion', 'Stripe', 'Atlassian'],
    statement: `<p>A B2B SaaS has 2,000 tenants, 30M document chunks (1536-d embeddings), 200 queries per second at peak, a 4-person platform team and an existing Postgres cluster. Every query must filter by tenant. Recommend a vector store, justify the sizing and call out risks.</p>`,
    constraints: `p95 latency under 100 ms; data of one tenant must never leak to another; budget conscious.`,
    example: `<p>Memory for vectors: 30M × 1536 × 4 B = <b>184 GB</b> in float32 (92 GB as halfvec).</p>`,
    brute: { why: `<p>Brute force over 30M x 1536 floats per query is ~46 billion multiply-adds: seconds per query, impossible at 200 QPS. Also, a single-tenant query only needs that tenant's ~15k rows, which a flat index could scan.</p>` },
    mcq: { q: 'Every query filters on tenant and tenants average 15k rows each. Best approach?', options: ['Partition/namespace by tenant so search runs inside a small set', 'Post-filter the global top-10', 'Drop the filter and trust the LLM', 'Use euclidean instead of cosine'], answer: 0, explain: 'Isolating tenants gives correctness, security and tiny per-query search sets.' },
    hints: [`<p>Compute memory first: number of vectors x dimensions x bytes per number.</p>`, `<p>The filter is very selective (about 0.05% of rows), which hurts global HNSW with post-filtering.</p>`, `<p>Compare: pgvector with partitioning vs a managed namespace-per-tenant service; mention ops burden and cost.</p>`],
    solution: {
      approach: `<p>Sizing: 30M vectors x 1536 dims x 4 bytes is about 184 GB as float32, about 92 GB as halfvec, about 46 GB with int8. Each tenant averages only 15k chunks (0.05% of the data), so the filter is extremely selective. A single global HNSW with post-filtering would return too few results, so isolate by tenant. Option A (preferred when the team is small and Postgres exists): pgvector with the table partitioned by tenant (or hash partitions grouped by tenant), a B-tree on tenant_id, an HNSW index per partition with halfvec, iterative scans enabled, and read replicas for the 200 QPS. Tenants with under about 20k rows can even use exact scans which are 100% recall. Row-level security guarantees one tenant never reads another's rows. Option B: a managed service such as Pinecone with one namespace per tenant, which removes index tuning and scales reads automatically at a higher unit cost and with vendor lock-in. Recommendation: start with A, because it keeps transactions and permissions next to the data, costs less, and the team already knows Postgres. Risks: RAM for HNSW (budget about 100-150 GB across replicas), re-embedding when the model changes (dual-index blue/green), noisy-neighbour tenants, and index build time. Mitigate with monitoring on recall using golden queries, p95 latency and index size, plus a documented migration path to a dedicated engine if growth passes ~200M vectors.</p>`,
      complexity: `<p>Per query: search within a tenant partition, about O(log n_tenant) for HNSW or O(n_tenant · d) for exact scans on small tenants.</p>`,
      followUps: ['A single whale tenant has 10M chunks. What changes?', 'How do you re-embed everything without downtime?']
    }
  }]
});

topics.push({
  title: 'Hybrid Search: BM25 + Vectors with Reciprocal Rank Fusion',
  analogy: `<p>Two judges score a talent show. One (<b>BM25</b>) is strict about exact words: "did you say the song title?". The other (<b>vector search</b>) listens for the meaning: "this feels like what the audience asked for". Neither is perfect alone. Instead of averaging their very different score sheets, you ask each for a <b>ranking</b> and give points for high places. That is <b>reciprocal rank fusion</b>.</p>`,
  explain: `<p>🟢 <b>BM25 (keyword search).</b> It scores a document by how often the query words appear in it, but smartly: (1) a rare word (like "pgvector") counts for more than a common word ("the") — this is <b>IDF</b>; (2) repeating a word helps only up to a point (<b>term-frequency saturation</b>); (3) long documents are penalised a bit (<b>length normalisation</b>). It is the engine inside Elasticsearch, OpenSearch, Lucene and Postgres full-text-style ranking.</p>
<p><b>Where each one wins:</b></p>
${H.table(['query', 'BM25 (keywords)', 'vectors (meaning)'], [['"error code E4471"', '<span class="c-g">finds the exact code</span>', '<span class="c-r">fuzzy, may return other error pages</span>'], ['"cheap car repair"', '<span class="c-r">misses "affordable automobile servicing"</span>', '<span class="c-g">understands synonyms</span>'], ['"iPhone 16 battery"', '<span class="c-g">exact model number</span>', '<span class="c-r">mixes 15 and 16</span>'], ['"how to get my money back"', '<span class="c-r">no word "refund"</span>', '<span class="c-g">finds the refund policy</span>']])}
<p><b>Hybrid search</b> runs both and merges the lists. The scores cannot be added directly (BM25 might be 14.2, cosine 0.83: different scales), so the popular fix is <b>Reciprocal Rank Fusion</b>:</p>
<p style="text-align:center"><b>RRF(doc) = Σ over lists of 1 / (k + rank(doc))</b>, with k ≈ 60.</p>
<p>Worked example (k = 60): doc X is rank 1 in BM25 and rank 3 in vectors → 1/61 + 1/63 = 0.01639 + 0.01587 = <b>0.03226</b>. Doc Y is rank 2 in only one list → 1/62 = 0.01613. X wins: being good in <i>both</i> beats being great in one. Missing from a list simply adds 0.</p>
<p>Typical pipeline: BM25 top-50 + vector top-50 → RRF → top-20 → optional <b>cross-encoder reranker</b> → top-5 into the prompt.</p>`,
  clues: ['"users search by product IDs, error codes AND natural-language questions" → hybrid', '"semantic search misses exact keywords / names / acronyms"', '"keyword search misses synonyms"', '"combine two ranked lists with incomparable scores" → RRF', '"improve RAG retrieval recall cheaply"', '"BM25 parameters k1 and b"'],
  code: [{ lang: 'python', run: true, title: 'BM25 scorer from scratch (stdlib only)', code: `import math, re
from collections import Counter

docs = [
    "how to repair an automobile engine at home",
    "affordable vehicle servicing near you",
    "cheap flights to paris",
    "car repair cost guide what mechanics charge",
    "budget notebook computers under 500",
    "fix your bike low cost tips",
]
STOP = {"to", "an", "at", "you", "your", "what", "how", "the", "a"}
def toks(s): return [t for t in re.findall(r"[a-z0-9]+", s.lower()) if t not in STOP]

tokd = [toks(d) for d in docs]
N = len(docs)
avgdl = sum(len(t) for t in tokd) / N
df = Counter(w for t in tokd for w in set(t))
K1, B = 1.5, 0.75

def idf(w):
    n = df.get(w, 0)
    return math.log(1 + (N - n + 0.5) / (n + 0.5))   # always >= 0

def bm25(query, i):
    tf = Counter(tokd[i])
    dl = len(tokd[i])
    score = 0.0
    for w in toks(query):
        f = tf.get(w, 0)
        if f == 0: continue
        score += idf(w) * f * (K1 + 1) / (f + K1 * (1 - B + B * dl / avgdl))
    return score

query = "cheap car repair"
ranked = sorted(range(N), key=lambda i: -bm25(query, i))
print("query:", query)
for r, i in enumerate(ranked, 1):
    print(f"rank {r}  score {bm25(query, i):5.2f}  {docs[i]}")` },
  { lang: 'python', run: true, title: 'Hybrid search: BM25 + concept vectors fused with RRF', code: `import math, re
from collections import Counter

docs = [
    "how to repair an automobile engine at home",
    "affordable vehicle servicing near you",
    "cheap flights to paris",
    "car repair cost guide what mechanics charge",
    "budget notebook computers under 500",
    "fix your bike low cost tips",
]
# Pretend embedding model: words with the same meaning share one concept id
CONCEPT = {"car": "VEHICLE", "automobile": "VEHICLE", "vehicle": "VEHICLE", "bike": "VEHICLE",
           "cheap": "LOWCOST", "affordable": "LOWCOST", "budget": "LOWCOST", "low": "LOWCOST", "cost": "LOWCOST",
           "repair": "FIX", "fix": "FIX", "servicing": "FIX", "mechanics": "FIX"}
STOP = {"to", "an", "at", "you", "your", "what", "how", "the", "a", "near", "home"}
def toks(s): return [t for t in re.findall(r"[a-z0-9]+", s.lower()) if t not in STOP]

def vec(text):
    return Counter(CONCEPT.get(t, t) for t in toks(text))
def cosine(a, b):
    dot = sum(a[k] * b.get(k, 0) for k in a)
    na = math.sqrt(sum(v * v for v in a.values())); nb = math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0

# --- BM25 ---
tokd = [toks(d) for d in docs]; N = len(docs); avgdl = sum(map(len, tokd)) / N
df = Counter(w for t in tokd for w in set(t))
def bm25(q, i, k1=1.5, b=0.75):
    tf = Counter(tokd[i]); s = 0.0
    for w in toks(q):
        if w in tf:
            idf = math.log(1 + (N - df[w] + 0.5) / (df[w] + 0.5))
            s += idf * tf[w] * (k1 + 1) / (tf[w] + k1 * (1 - b + b * len(tokd[i]) / avgdl))
    return s

def rrf(rankings, k=60):
    """rankings: list of lists of doc ids, best first. Returns fused list of (id, score)."""
    score = Counter()
    for lst in rankings:
        for pos, d in enumerate(lst, start=1):
            score[d] += 1.0 / (k + pos)
    return sorted(score.items(), key=lambda x: -x[1])

q = "cheap car repair"
bm_rank = sorted(range(N), key=lambda i: -bm25(q, i))
vq = vec(q)
vec_rank = sorted(range(N), key=lambda i: -cosine(vq, vec(docs[i])))
bm_rank = [i for i in bm_rank if bm25(q, i) > 0]            # drop docs with no keyword match
vec_rank = [i for i in vec_rank if cosine(vq, vec(docs[i])) > 0]

print("BM25   :", bm_rank)
print("vectors:", vec_rank)
for doc, s in rrf([bm_rank, vec_rank])[:4]:
    print(f"fused  doc {doc}  rrf={s:.5f}  {docs[doc]}")` }],
  codeTitle: ['BM25 scorer', 'Hybrid with RRF'],
  viz: {
    title: 'BM25 vs vector vs fused ranking',
    input: 'cheap car repair | 60',
    inputLabel: 'Query | RRF k  (try: "cheap car repair | 60", "affordable vehicle | 5", "paris flights | 60")',
    gen: function (input) {
      var parts = String(input).split('|'), query = parts[0].trim(), K = parts.length > 1 ? Number(parts[1]) : 60;
      if (!query || isNaN(K) || K < 0 || K > 1000) throw new Error('Format: query | k   e.g. cheap car repair | 60');
      var docs = ['how to repair an automobile engine at home', 'affordable vehicle servicing near you', 'cheap flights to paris', 'car repair cost guide what mechanics charge', 'budget notebook computers under 500', 'fix your bike low cost tips'];
      var CON = { car: 'VEHICLE', automobile: 'VEHICLE', vehicle: 'VEHICLE', bike: 'VEHICLE', cheap: 'LOWCOST', affordable: 'LOWCOST', budget: 'LOWCOST', low: 'LOWCOST', cost: 'LOWCOST', repair: 'FIX', fix: 'FIX', servicing: 'FIX', mechanics: 'FIX' };
      var STOP = { to: 1, an: 1, at: 1, you: 1, your: 1, what: 1, how: 1, the: 1, a: 1, near: 1, home: 1 };
      function toks(s) { return (String(s).toLowerCase().match(/[a-z0-9]+/g) || []).filter(function (t) { return !STOP[t]; }); }
      var td = docs.map(toks), N = docs.length, avg = td.reduce(function (s, t) { return s + t.length; }, 0) / N, df = {};
      td.forEach(function (t) { var u = {}; t.forEach(function (w) { u[w] = 1; }); Object.keys(u).forEach(function (w) { df[w] = (df[w] || 0) + 1; }); });
      var qt = toks(query); if (!qt.length) throw new Error('Use at least one non-filler word');
      function bm(i) { var tf = {}; td[i].forEach(function (w) { tf[w] = (tf[w] || 0) + 1; }); var s = 0; qt.forEach(function (w) { if (tf[w]) { var idf = Math.log(1 + (N - df[w] + 0.5) / (df[w] + 0.5)); s += idf * tf[w] * 2.5 / (tf[w] + 1.5 * (0.25 + 0.75 * td[i].length / avg)); } }); return s; }
      function cv(t) { var v = {}; t.forEach(function (w) { var c = CON[w] || w; v[c] = (v[c] || 0) + 1; }); return v; }
      function cosine(a, b) { var d = 0, na = 0, nb = 0; Object.keys(a).forEach(function (k) { d += a[k] * (b[k] || 0); na += a[k] * a[k]; }); Object.keys(b).forEach(function (k) { nb += b[k] * b[k]; }); return na && nb ? d / Math.sqrt(na * nb) : 0; }
      var qv = cv(qt), ids = docs.map(function (_, i) { return i; });
      var bmS = ids.map(bm), veS = ids.map(function (i) { return cosine(qv, cv(td[i])); });
      var bmR = ids.filter(function (i) { return bmS[i] > 0; }).sort(function (a, b) { return bmS[b] - bmS[a]; });
      var veR = ids.filter(function (i) { return veS[i] > 0; }).sort(function (a, b) { return veS[b] - veS[a]; });
      var fused = {}; [bmR, veR].forEach(function (l) { l.forEach(function (d, p) { fused[d] = (fused[d] || 0) + 1 / (K + p + 1); }); });
      var fR = Object.keys(fused).map(Number).sort(function (a, b) { return fused[b] - fused[a]; });
      function short(i) { return docs[i].length > 44 ? docs[i].slice(0, 42) + '…' : docs[i]; }
      var frames = [];
      frames.push({ narr: 'Query: <b>' + qt.join(' ') + '</b>. Six documents. We run two searchers and then merge their <b>rankings</b> (not their scores, which live on different scales).', parts: [{ type: 'table', label: 'Documents', columns: ['id', 'text'], rows: docs.map(function (d, i) { return [i, d]; }) }] });
      frames.push({ narr: '<b>BM25</b> counts exact word matches, weighting rare words more. Docs without any query word are dropped. ' + (bmR.length ? 'Top: doc ' + bmR[0] + '.' : 'No keyword hits at all!'), parts: [{ type: 'table', label: 'BM25 ranking', columns: ['rank', 'doc', 'score', 'text'], rows: bmR.map(function (d, r) { return [r + 1, d, bmS[d].toFixed(2), short(d)]; }), hl: bmR.length ? { 0: 'cur' } : {} }] });
      frames.push({ narr: '<b>Vector search</b> compares meaning: "cheap" ≈ "affordable" ≈ "budget", "car" ≈ "automobile" ≈ "vehicle". It finds docs BM25 missed (like doc 1: no shared word with a query such as "cheap car repair").', parts: [{ type: 'table', label: 'Vector (concept) ranking', columns: ['rank', 'doc', 'cosine', 'text'], rows: veR.map(function (d, r) { return [r + 1, d, veS[d].toFixed(2), short(d)]; }), hl: veR.length ? { 0: 'cur' } : {} }] });
      var rows = fR.map(function (d, r) { var rb = bmR.indexOf(d), rv = veR.indexOf(d); return [r + 1, d, rb < 0 ? '–' : rb + 1, rv < 0 ? '–' : rv + 1, (rb < 0 ? '0' : '1/' + (K + rb + 1)) + ' + ' + (rv < 0 ? '0' : '1/' + (K + rv + 1)), fused[d].toFixed(5)]; });
      frames.push({ narr: '<b>RRF</b> with k = ' + K + ': each list gives a doc 1/(k + rank). Add them up. Docs that appear in <b>both</b> lists rise to the top. ' + (K < 10 ? 'A small k makes the top ranks count much more.' : 'A big k flattens the gaps between ranks.'), parts: [{ type: 'table', label: 'Fused ranking (RRF)', columns: ['rank', 'doc', 'BM25 rank', 'vector rank', 'points', 'RRF score'], rows: rows, hl: rows.length ? { 0: 'sel' } : {} }] });
      frames.push({ narr: 'Final top result: <b>' + (fR.length ? 'doc ' + fR[0] + ' — "' + docs[fR[0]] + '"' : 'none') + '</b>. Hybrid keeps exact matches AND meaning matches. Next step in production: send the top 20 to a cross-encoder reranker.', parts: [{ type: 'bars', label: 'RRF scores', values: fR.map(function (d) { return +fused[d].toFixed(5); }), idxLabels: fR.map(function (d) { return 'doc ' + d; }), hl: { 0: 'sel' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'BM25 saturation & length normalisation', html: `<p>With k1 = 1.5, a word appearing 10 times scores only ~2× a word appearing once, not 10×. With b = 0.75, a 2000-word page that mentions "refund" once scores lower than a 50-word FAQ that mentions it once.</p>` },
    { title: 'Alpha-weighted blending alternative', html: `<p>Instead of RRF you can min-max normalise each score list and compute <code>alpha·vector + (1−alpha)·bm25</code> (alpha ≈ 0.5-0.7). It is tunable but needs normalisation and breaks when score distributions shift. RRF needs no tuning, which is why it is the default in Elasticsearch, OpenSearch, Qdrant, Weaviate and Azure AI Search.</p>` },
    { title: 'Hybrid in Postgres (full-text + pgvector)', html: `<p>Run both queries and fuse in SQL with <code>ROW_NUMBER()</code> for ranks.</p>`, code: { lang: 'sql', check: false, code: `WITH kw AS (\n  SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank_cd(tsv, q) DESC) AS r\n  FROM chunks, plainto_tsquery('english', $1) q\n  WHERE tsv @@ q ORDER BY r LIMIT 50\n), vec AS (\n  SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> $2) AS r\n  FROM chunks ORDER BY embedding <=> $2 LIMIT 50\n)\nSELECT COALESCE(kw.id, vec.id) AS id,\n       COALESCE(1.0/(60+kw.r), 0) + COALESCE(1.0/(60+vec.r), 0) AS rrf\nFROM kw FULL OUTER JOIN vec ON kw.id = vec.id\nORDER BY rrf DESC LIMIT 10;` } },
    { title: 'Learned sparse vectors', html: `<p>SPLADE-style models produce "sparse" vectors: keyword-like weights that also include expansion terms ("automobile" gets weight under "car"). They bring semantics to an inverted index and can replace plain BM25 in hybrid setups.</p>` }
  ],
  deepDive: `<p>🟣 <b>BM25 formula.</b> score(q, d) = Σ<sub>t∈q</sub> IDF(t) · f(t,d)·(k1+1) / ( f(t,d) + k1·(1 − b + b·|d|/avgdl) ), with IDF(t) = ln(1 + (N − n<sub>t</sub> + 0.5) / (n<sub>t</sub> + 0.5)). k1 ∈ [1.2, 2.0] controls saturation, b ∈ [0,1] controls length normalisation. It is a probabilistic-retrieval descendant of TF-IDF and is computed from an inverted index (term → postings list), so it is very cheap even for billions of documents.</p>
<p><b>Why RRF works.</b> It is rank-based, so it is robust to wildly different score scales and outliers; k dampens the dominance of rank 1 (k = 60 comes from the original paper's experiments). Weakness: it throws away score magnitude. If vector similarity is 0.95 vs 0.40 that gap is lost. Weighted RRF (multiply each list's contribution by a weight) lets you favour one retriever.</p>
<p><b>Pipeline design.</b> Retrieve wide (50-200 per retriever), fuse, then <b>rerank</b> the top 20-50 with a cross-encoder or an LLM, which reads query and document together and is much more precise but too slow for the full corpus. This "retrieve then rerank" funnel is the standard recipe. Measure each stage: recall@50 for retrieval, nDCG@10 / MRR for the final list.</p>
<p><b>Pitfalls.</b> Tokenisation mismatch (BM25 on stemmed text, different analyzers per language), duplicated chunks flooding the fused list, query rewriting for the keyword side (strip chatty words), and high-latency because you run two searches (run them in parallel). Also check how a vector hit with tiny similarity is treated: add a minimum score or the fused list will include noise.</p>`,
  aiEra: `<p><b>What AI changes:</b> RAG made hybrid search mainstream, because LLM answers are only as good as the retrieved context, and pure vector retrieval silently drops IDs, names and rare terms. Many engines now offer hybrid in a single API call (plus built-in rerankers). Agents also generate several query variants (multi-query, HyDE) and fuse all results with RRF.</p>
<p><b>Use AI as a partner:</b> ask it to generate a labelled evaluation set of 50 queries where keywords fail and 50 where semantics fail; run BM25-only, vector-only and hybrid on it and compare recall@10. Have it explain nDCG with a tiny example.</p>
<p><b>Where AI goes wrong:</b> it adds raw BM25 and cosine scores together, uses k = 1 in RRF by default, or suggests hybrid when your data is only short exact IDs (plain keyword or a database lookup is enough).</p>
<p><b>What you must still own:</b> the evaluation data, the analyzer/tokenizer choices, and the decision of whether a reranker's extra latency and cost are worth it.</p>`,
  problems: [{
    title: 'Fuse two ranked lists with RRF',
    level: 'Easy', tags: ['RRF', 'hybrid search'], companies: ['Elastic', 'Microsoft'],
    statement: `<p>BM25 returns docs [A, B, C, D] (best first). The vector search returns [C, A, E, B]. Using RRF with k = 60, what is the fused order? Show your work.</p>`,
    constraints: `Ranks start at 1; a doc missing from a list contributes 0.`,
    example: `<p>${H.table(['doc', 'BM25 rank', 'vector rank', 'RRF'], [['A', '1', '2', '1/61 + 1/62 = 0.03252'], ['C', '3', '1', '1/63 + 1/61 = 0.03226'], ['B', '2', '4', '1/62 + 1/64 = 0.03175'], ['E', '–', '3', '1/63 = 0.01587'], ['D', '4', '–', '1/64 = 0.01563']])}</p>`,
    brute: { why: `<p>Weak answer: "add the scores". BM25 values (e.g. 12.4) and cosine values (e.g. 0.81) live on different scales, so the sum is dominated by BM25 and is meaningless.</p>` },
    mcq: { q: 'Why does RRF use ranks instead of raw scores?', options: ['Scores from different retrievers are not comparable', 'Ranks are faster to store', 'Scores are always negative', 'It removes duplicates'], answer: 0, explain: 'Rank positions are comparable across systems; raw score scales are not.' },
    hints: [`<p>Each list a document appears in contributes 1/(k + rank) points to it.</p>`, `<p>Compute for every doc that appears in either list.</p>`, `<p>Sort descending: A (0.03252) > C (0.03226) > B (0.03175) > E (0.01587) > D (0.01563).</p>`],
    solution: {
      approach: `<p>For each document add 1/(60 + rank) over each list in which it appears. A: rank 1 in BM25 and rank 2 in vectors gives 1/61 + 1/62 = 0.01639 + 0.01613 = 0.03252. C: rank 3 and rank 1 gives 1/63 + 1/61 = 0.01587 + 0.01639 = 0.03226. B: rank 2 and rank 4 gives 1/62 + 1/64 = 0.01613 + 0.01563 = 0.03175. E appears only in vectors at rank 3 so 1/63 = 0.01587. D appears only in BM25 at rank 4 so 1/64 = 0.01563. The fused order is A, C, B, E, D. Documents that both retrievers like (A, C, B) beat documents liked by only one, which is the whole point of fusion: agreement is a strong relevance signal and no score normalisation is required.</p>`,
      code: { lang: 'python', run: true, code: `def rrf(lists, k=60):\n    score = {}\n    for lst in lists:\n        for pos, doc in enumerate(lst, start=1):\n            score[doc] = score.get(doc, 0.0) + 1.0 / (k + pos)\n    return sorted(score.items(), key=lambda x: -x[1])\n\nfor doc, s in rrf([["A", "B", "C", "D"], ["C", "A", "E", "B"]]):\n    print(doc, round(s, 5))` },
      complexity: `<p>O(total list length) to accumulate, plus O(U log U) to sort U unique docs.</p>`,
      followUps: ['What does a small k like 5 change?', 'How would you give vector search twice the weight?']
    }
  }]
});

practice.push({
  title: 'Cosine Similarity by Hand', level: 'Easy', tags: ['cosine', 'math'], companies: ['Amazon', 'Google'],
  statement: `<p>Compute the cosine similarity of a = [1, 2, 3] and b = [4, 5, 6]. Is the answer closer to 0, 1 or −1, and what does that mean?</p>`,
  constraints: `Use dot product and vector lengths; no libraries required.`,
  example: `<p>dot = 1·4 + 2·5 + 3·6 = <b>32</b>. |a| = √14 ≈ 3.742, |b| = √77 ≈ 8.775. cosine = 32 / (3.742 · 8.775) ≈ <b>0.975</b>: nearly the same direction.</p>`,
  brute: { why: `<p>Eyeballing numbers ("both increase, so similar") gives no measurable answer and cannot rank thousands of vectors.</p>` },
  mcq: { q: 'Cosine similarity of 0.975 means...', options: ['The vectors point almost the same way', 'They are 97.5% identical in every number', 'They are almost opposite', 'They have the same length'], answer: 0, explain: 'Cosine measures the angle only, not the length.' },
  hints: [`<p>Start with the dot product: multiply matching components and add them up.</p>`, `<p>Divide by the product of the two lengths.</p>`, `<p>Recipe: dot = 32; lengths √14 and √77; 32 / √1078 = 32 / 32.83 = 0.975.</p>`],
  solution: {
    approach: `<p>Multiply matching components and add: 4 + 10 + 18 = 32. Compute each length: |a| = √(1+4+9) = √14 and |b| = √(16+25+36) = √77. Their product is √1078 ≈ 32.83. Cosine = 32 / 32.83 ≈ 0.975. A value near 1 means the vectors point in almost the same direction, so as embeddings the two items would be judged very similar. A value near 0 would mean unrelated, and near −1 opposite. Note that the length of the vectors does not matter: [2, 4, 6] against b would give the same 0.975.</p>`,
    code: { lang: 'python', run: true, code: `import math\na, b = [1, 2, 3], [4, 5, 6]\ndot = sum(x * y for x, y in zip(a, b))\nprint(dot, round(dot / (math.hypot(*a) * math.hypot(*b)), 3))` },
    complexity: `<p>O(d) time, O(1) extra space.</p>`, followUps: ['What if one vector is all zeros?']
  }
});

practice.push({
  title: 'Normalise Once: Cosine = Dot = Euclidean Ranking', level: 'Easy', tags: ['normalisation', 'metrics'], companies: ['Pinecone', 'OpenAI'],
  statement: `<p>Two unit-length vectors have cosine similarity 0.8. What is their dot product and their Euclidean distance? Why can a database use the cheapest metric?</p>`,
  constraints: `Both vectors have length exactly 1.`,
  example: `<p>dot = 0.8. Euclidean² = 2 − 2·0.8 = 0.4, so distance = √0.4 ≈ <b>0.632</b>.</p>`,
  brute: { why: `<p>Computing three different metrics and three different indexes for the same data wastes memory and time when they rank identically.</p>` },
  mcq: { q: 'For unit vectors, ranking by smallest Euclidean distance equals ranking by...', options: ['Largest dot product', 'Smallest dot product', 'Longest vector', 'Alphabetical id'], answer: 0, explain: '‖a−b‖² = 2 − 2·dot, so smaller distance means larger dot.' },
  hints: [`<p>Expand the square: ‖a−b‖² = ‖a‖² + ‖b‖² − 2a·b, using the dot product.</p>`, `<p>When both lengths are exactly 1 this simplifies to 2 − 2·(a·b), a function of the dot product only.</p>`, `<p>Dot equals cosine for unit vectors, so all three are monotonic transformations of each other.</p>`],
  solution: {
    approach: `<p>For unit vectors the norms are 1, so cosine = dot = 0.8. Expanding the squared distance gives ‖a−b‖² = 1 + 1 − 2(0.8) = 0.4, hence distance ≈ 0.632. Because distance² = 2 − 2·dot is a strictly decreasing function of dot, sorting by smallest distance gives exactly the same order as sorting by largest dot product or largest cosine. So the practical engineering rule is: normalise vectors once at ingestion and query time, then use the inner product (a single fused multiply-add loop, no square roots), which is also what GPU matrix multiplications are best at.</p>`,
    complexity: `<p>Dot product O(d); normalisation is one-time O(d) per vector.</p>`, followUps: ['When would you NOT normalise?']
  }
});

practice.push({
  title: 'Compute Recall@k', level: 'Easy', tags: ['recall', 'evaluation', 'ANN'], companies: ['Spotify', 'Meta'],
  statement: `<p>The exact top-5 neighbours of a query are ids {1, 2, 3, 4, 5}. Your ANN index returned [1, 2, 9, 4, 8]. What is recall@5? Write a function that averages recall over many queries.</p>`,
  constraints: `Use sets; ignore order inside the top-k.`,
  example: `<p>Overlap = {1, 2, 4} → 3 of 5 → recall@5 = <b>0.6</b>.</p>`,
  brute: { why: `<p>Checking only whether top-1 matches hides how much of the rest of the list is wrong.</p>` },
  mcq: { q: 'Recall@k in ANN search is...', options: ['Fraction of the true top-k that the index returned', 'Queries per second', 'Memory per vector', 'Fraction of results that are duplicates'], answer: 0, explain: 'It compares the ANN answer with exact ground truth.' },
  hints: [`<p>Count how many returned ids are also in the exact top-k, then divide that count by k.</p>`, `<p>Ground truth comes from brute-force search on a sample of queries.</p>`, `<p>Average across queries (macro average) and report with the latency at that setting.</p>`],
  solution: {
    approach: `<p>Recall@k = |ANN top-k ∩ exact top-k| / k. Here the overlap is {1, 2, 4}, so 3/5 = 0.6. To evaluate an index, take a few hundred to a thousand real queries, compute exact neighbours with a brute-force pass once (this is your ground truth, cache it), run the ANN search at each parameter setting, and average the per-query recall. Always report recall together with latency or QPS at that setting, since any index can reach recall 1.0 by scanning everything.</p>`,
    code: { lang: 'python', run: true, code: `def recall_at_k(truth, found, k):\n    return len(set(truth[:k]) & set(found[:k])) / k\n\ndef mean_recall(truths, founds, k):\n    return sum(recall_at_k(t, f, k) for t, f in zip(truths, founds)) / len(truths)\n\nprint(recall_at_k([1, 2, 3, 4, 5], [1, 2, 9, 4, 8], 5))\nprint(mean_recall([[1, 2], [3, 4]], [[1, 2], [3, 9]], 2))` },
    complexity: `<p>O(k) time per query using set intersection; O(Q·k) for Q queries.</p>`, followUps: ['Why is recall of the top-1 a poor summary?']
  }
});

practice.push({
  title: 'Brute Force or ANN? Pick for 200k Vectors', level: 'Medium', tags: ['kNN', 'ANN', 'trade-offs'], companies: ['Shopify', 'Airbnb'],
  statement: `<p>A help-centre has 200,000 chunks (384-d float32 embeddings) and gets 20 queries per second. A teammate wants to set up HNSW. Argue for or against, with numbers.</p>`,
  constraints: `A server core does about 10 GFLOP/s of matrix multiplication; latency budget 100 ms.`,
  example: `<p>Work per query: 200,000 × 384 ≈ 77M multiply-adds ≈ <b>8 ms</b>. At 20 QPS: 1.5 GFLOP/s, about 15% of one core.</p>`,
  brute: { why: `<p>Adding HNSW here adds an index to build, tune and keep updated, and loses a little recall, for a latency win nobody needs.</p>` },
  mcq: { q: 'Best first step?', options: ['Exact search with a matrix multiply, measure latency', 'Set up IVF-PQ on GPUs', 'Shard into 16 nodes', 'Use euclidean instead'], answer: 0, explain: 'At this size exact search is fast, simple and 100% recall.' },
  hints: [`<p>Count the multiply-adds per query: vectors times dimensions, then compare to the budget.</p>`, `<p>Compare with the latency budget and the QPS.</p>`, `<p>State when you would revisit: growth to ~5-10M vectors or QPS over a few hundred.</p>`],
  solution: {
    approach: `<p>Argue against ANN for now. Memory: 200k × 384 × 4 B ≈ 307 MB, trivial. Exact search costs 77M multiply-adds per query, about 8 ms on one core with a vectorised matrix-vector product, and 20 QPS needs under one core. It returns 100% recall, has no tuning, no build step, supports instant inserts, and metadata filters are trivial (mask first, then multiply). An HNSW index would add engineering and operations work, a recall loss, extra RAM and a build/refresh cycle for no needed speed-up. Decision rule: stay exact until measurements show p95 latency or CPU is a problem, which typically happens around several million vectors or hundreds of QPS. Keep a brute-force path anyway, because it provides ground truth to evaluate any later ANN index.</p>`,
    complexity: `<p>Exact: O(N·d) per query.</p>`, followUps: ['At what N would you switch, and to what?']
  }
});

practice.push({
  title: 'Size the Memory for a 50M-Vector HNSW Index', level: 'Medium', tags: ['HNSW', 'capacity planning'], companies: ['Amazon', 'Pinecone'],
  statement: `<p>You must index 50M embeddings of 1024 dimensions with HNSW (M = 32). Estimate RAM for float32, float16 and int8 vectors, plus the graph. Which would you choose?</p>`,
  constraints: `Layer-0 links: 2·M neighbours × 4 bytes each; ignore upper layers (small).`,
  example: `<p>float32: 50M × 1024 × 4 = <b>204.8 GB</b>. Graph: 50M × 64 × 4 = <b>12.8 GB</b>.</p>`,
  brute: { why: `<p>Forgetting that vectors dominate memory and sizing only the graph leads to a surprise out-of-memory crash.</p>` },
  mcq: { q: 'What dominates HNSW memory?', options: ['The raw vectors', 'The graph links', 'The metadata', 'The query cache'], answer: 0, explain: 'Vectors take d × bytes each; links are a small fixed cost per node.' },
  hints: [`<p>vectors × dimensions × bytes per number.</p>`, `<p>Add 2·M·4 bytes per vector for the layer-0 links on top of the raw vectors.</p>`, `<p>Consider quantisation + rerank to cut RAM by 2-4×.</p>`],
  solution: {
    approach: `<p>float32: 50M × 1024 × 4 B = 204.8 GB; float16 = 102.4 GB; int8 = 51.2 GB. Graph at layer 0: 50M × (2×32 links) × 4 B = 12.8 GB, with upper layers adding a few percent. Totals: about 218 GB (float32), 115 GB (float16), 64 GB (int8). I would pick float16 or int8 scalar quantisation inside the index and keep full-precision vectors on SSD for reranking the top 100 candidates, which usually recovers nearly all recall. Then split across shards so each fits comfortably in RAM with headroom (about 30-40% free for OS cache, build time and growth), for example 4 shards of 64 GB nodes, and replicate for availability. Also consider Matryoshka truncation to 512 dimensions if the embedding model supports it, which halves everything again.</p>`,
    complexity: `<p>Memory ≈ N·(d·b + 2M·4) bytes.</p>`, followUps: ['How does adding replicas change cost?']
  }
});

practice.push({
  title: 'Why Do Filtered Queries Return Fewer Than k Results?', level: 'Medium', tags: ['metadata filtering', 'debugging'], companies: ['Notion', 'Slack'],
  statement: `<p>A RAG service asks for top-10 chunks with <code>WHERE tenant_id = 7</code>. For small tenants it often returns 0-3 rows although the tenant has hundreds. The query uses an HNSW index. Explain the cause and give three fixes.</p>`,
  constraints: `The index is global across all tenants.`,
  example: `<p>Global ANN candidate list = 40 items; tenant 7 owns 0.1% of data → expected survivors = 0.04. Result: empty.</p>`,
  brute: { why: `<p>Raising LIMIT to 1000 and filtering afterwards wastes work and still fails for very selective filters.</p>` },
  mcq: { q: 'The core issue is...', options: ['Filter applied after the ANN walk returned its candidates', 'Wrong distance metric', 'Embedding dimension too large', 'Too many replicas'], answer: 0, explain: 'Post-filtering discards most of the candidates.' },
  hints: [`<p>What does the index walk know about tenant_id?</p>`, `<p>Think pre-filter vs post-filter vs integrated filter.</p>`, `<p>Partition by tenant, use iterative scans, or raise efSearch as a stop-gap.</p>`],
  solution: {
    approach: `<p>The HNSW walk explores nodes near the query regardless of tenant and returns its ef_search best candidates (say 40); the WHERE clause is then applied to those candidates. If tenant 7 owns 0.1% of rows, almost none of the 40 belong to it, so few or no rows survive. Fixes: (1) Isolate tenants: partition the table or use a namespace or index per tenant, so the search space only holds allowed rows (best for security and correctness). (2) Use an engine or setting that filters during traversal, e.g. pgvector 0.8 iterative scan (hnsw.iterative_scan) or Qdrant, Weaviate and Pinecone integrated filtering, so the walk continues until k valid rows are found. (3) For very selective filters, let the planner use the B-tree on tenant_id and do an exact scan over those few hundred rows, which is cheap and has perfect recall. A stop-gap is raising hnsw.ef_search, but it only works for mild filters. Test with golden queries per tenant size.</p>`,
    complexity: `<p>Exact scan on a tenant: O(n_tenant · d). Integrated filtered ANN: roughly O(log N / selectivity) worst case.</p>`, followUps: ['How would you detect this problem in monitoring?']
  }
});

practice.push({
  title: 'BM25 Intuition: IDF and Saturation Numbers', level: 'Medium', tags: ['BM25', 'keyword search'], companies: ['Elastic', 'Walmart'],
  statement: `<p>A corpus has N = 1000 documents. The word "pgvector" appears in 10 documents and "the" in 500. Compute IDF for each using idf = ln(1 + (N − n + 0.5)/(n + 0.5)). Then, with k1 = 1.5 and a document of average length, compare the term-frequency factor for f = 1 and f = 10.</p>`,
  constraints: `Use natural log; TF factor = f·(k1+1) / (f + k1) when dl = avgdl.`,
  example: `<p>idf(pgvector) = ln(1 + 990.5/10.5) = ln 95.3 ≈ <b>4.56</b>. idf(the) = ln(1 + 500.5/500.5) = ln 2 ≈ <b>0.69</b>. TF factor: f=1 → 1.0; f=10 → 25/11.5 ≈ <b>2.17</b>.</p>`,
  brute: { why: `<p>Plain term counting lets a page repeating "the" 50 times outrank a page mentioning "pgvector" once.</p>` },
  mcq: { q: 'Saturation in BM25 means...', options: ['Repeating a term helps less and less', 'Long documents always win', 'Rare words are ignored', 'Scores are capped at 1'], answer: 0, explain: 'The f/(f+k1) shape levels off.' },
  hints: [`<p>Plug n = 10 and n = 500 into the IDF formula carefully with N = 1000.</p>`, `<p>f·2.5 / (f+1.5): compute for 1 and for 10.</p>`, `<p>Note a 10x increase in repetition only gives ~2x the score.</p>`],
  solution: {
    approach: `<p>IDF: pgvector appears in 10 of 1000 docs, so idf = ln(1 + 990.5 / 10.5) = ln(95.33) ≈ 4.56. The word "the" appears in 500 docs, so idf = ln(1 + 500.5 / 500.5) = ln 2 ≈ 0.69. A rare word is therefore worth about 6.6 times more than a common one, which is why the query "the pgvector index" is driven by "pgvector". Term-frequency factor for an average-length document with k1 = 1.5: f = 1 gives 1 × 2.5 / 2.5 = 1.0; f = 10 gives 10 × 2.5 / 11.5 ≈ 2.17. Ten times more occurrences yield only about 2.2 times the score: saturation, which stops keyword stuffing from dominating. Length normalisation (b = 0.75) additionally lowers the score of unusually long documents.</p>`,
    code: { lang: 'python', run: true, code: `import math\nN = 1000\nfor w, n in (("pgvector", 10), ("the", 500)):\n    print(w, round(math.log(1 + (N - n + 0.5) / (n + 0.5)), 2))\nk1 = 1.5\nfor f in (1, 10):\n    print("tf factor", f, round(f * (k1 + 1) / (f + k1), 2))` },
    complexity: `<p>IDF is precomputed per term; scoring is a sum over query terms and postings.</p>`, followUps: ['What does b = 0 do?']
  }
});

practice.push({
  title: 'Weighted RRF and Choosing k', level: 'Medium', tags: ['RRF', 'hybrid search', 'tuning'], companies: ['Elastic', 'Databricks'],
  statement: `<p>Your hybrid search fuses BM25 and vector lists with plain RRF (k = 60). Evaluation shows vector search is much better on your data (nDCG 0.71 vs 0.52). How can you bias the fusion, and what happens when k is 5 vs 200?</p>`,
  constraints: `Keep the method rank-based and cheap.`,
  example: `<p>Weighted: score = 1.0·1/(60+r<sub>vec</sub>) + 0.5·1/(60+r<sub>bm25</sub>).</p>`,
  brute: { why: `<p>Adding normalised scores needs per-query normalisation and breaks when a list has an outlier at the top.</p>` },
  mcq: { q: 'A very small k (like 1) makes RRF...', options: ['Dominated by rank-1 hits of each list', 'Ignore all ranks', 'Equal for all docs', 'Use raw scores'], answer: 0, explain: '1/(1+rank) falls quickly, so top ranks matter far more.' },
  hints: [`<p>Multiply each list's contribution by a weight.</p>`, `<p>Larger k flattens differences between ranks.</p>`, `<p>Tune weights and k on a labelled set, optimising nDCG@10 or MRR.</p>`],
  solution: {
    approach: `<p>Use weighted RRF: fused(d) = Σ w_i / (k + rank_i(d)), with the vector list weighted higher, for example 1.0 versus 0.5 for BM25, found by grid search on a labelled query set that maximises nDCG@10 (or MRR). The constant k controls how quickly the contribution decays with rank: with k = 5, rank 1 gives 1/6 = 0.167 and rank 10 gives 1/15 = 0.067 (a 2.5x gap), so each list's top hits dominate and agreement matters less; with k = 200, rank 1 gives 0.00498 and rank 10 gives 0.00476 (almost equal), so lists are treated as nearly flat and a document appearing in both lists wins by simple presence. The default k = 60 is a robust middle. Also fetch enough candidates per list (50-100) and add a minimum-similarity cutoff on the vector side so low-quality hits do not add noise. If weighting is still not enough, add a cross-encoder reranker on the fused top 30.</p>`,
    complexity: `<p>O(total candidates) plus the sort.</p>`, followUps: ['What would a learned-to-rank alternative need?']
  }
});

practice.push({
  title: 'Size an IVF-PQ Index for 100M Vectors', level: 'Medium', tags: ['IVF', 'PQ', 'capacity planning'], companies: ['Meta', 'Pinterest'],
  statement: `<p>100M image embeddings (512-d float32). You need an IVF-PQ index on a few machines. Propose nlist, training sample size, PQ settings and how you will choose nprobe, with memory numbers.</p>`,
  constraints: `Target recall@10 ≥ 0.9 after reranking; memory per node 128 GB.`,
  example: `<p>Raw: 100M × 512 × 4 = <b>204.8 GB</b>. PQ with m = 64 bytes per vector: 100M × 64 = <b>6.4 GB</b>.</p>`,
  brute: { why: `<p>Flat storage needs 205 GB and a brute-force query touches 100M vectors: too much RAM and too slow.</p>` },
  mcq: { q: 'A common rule for nlist is about...', options: ['4·√N to 16·√N for large N', 'N / 2', '10', 'The embedding dimension'], answer: 0, explain: '√N balances centroid scan cost against bucket scan cost.' },
  hints: [`<p>First compute the square root of 100M, which is 10,000, then scale it by about 4 to 8.</p>`, `<p>PQ with m sub-vectors and 8 bits each costs m bytes per vector.</p>`, `<p>Sweep nprobe for recall; rerank with originals from SSD.</p>`],
  solution: {
    approach: `<p>With N = 100M, √N = 10,000, so choose nlist around 65,536 (4·√N rounded to a power of two), giving about 1,500 vectors per bucket. Train k-means on a random sample of 2-5M vectors (at least 30-100 per centroid), ideally on a GPU, and check the bucket-size histogram for hot spots. Use PQ with m = 64 sub-quantisers of 8 bits each (8 dims per sub-vector), costing 64 bytes per vector: 6.4 GB for codes plus about 0.1 GB of ids and centroids, easily one node; optionally OPQ rotation first to preserve accuracy. Choose nprobe empirically: build a 1000-query ground-truth set with exact search on a sample, sweep nprobe 16, 32, 64, 128, 256, and pick the knee of recall versus latency, likely 64-128 (about 100-200k codes scanned, a few ms with SIMD lookup tables). PQ loses precision, so rerank the top 100-200 candidates by reading the original float vectors from SSD or object storage; this typically lifts recall@10 above 0.9. Plan retraining when the data distribution drifts.</p>`,
    complexity: `<p>Query ≈ nlist·d + nprobe·(N/nlist)·m table lookups.</p>`, followUps: ['How do you shard this across machines?']
  }
});

practice.push({
  title: 'Design Semantic + Keyword Search for 100M Products', level: 'Hard', tags: ['system design', 'hybrid search', 'e-commerce'], companies: ['Amazon', 'Etsy', 'Walmart'],
  statement: `<p>Design the product search for a marketplace with 100M listings, 3,000 QPS peak, p95 under 150 ms. Queries are a mix of SKUs ("MX-4471 filter"), brand names and vague text ("gift for a hiker"). Filters: category, price, in-stock, seller region. Describe the architecture, indexes, fusion and evaluation.</p>`,
  constraints: `Inventory changes constantly (price and stock update every minute); embeddings are refreshed daily.`,
  example: `<p>"MX-4471 filter" must hit the exact SKU; "gift for a hiker" needs semantic matching on titles and descriptions.</p>`,
  brute: { why: `<p>Vector-only search drops SKUs and brand names; keyword-only search misses vague intents; brute force over 100M × 768 floats cannot meet 150 ms at 3,000 QPS.</p>` },
  mcq: { q: 'Where should price and stock live?', options: ['As filterable metadata updated in place, not baked into embeddings', 'Inside the embedding text', 'Only in the LLM prompt', 'In a separate model'], answer: 0, explain: 'Frequently changing facts are attributes; embeddings are for stable meaning.' },
  hints: [`<p>Two retrievers (lexical and dense) plus fusion, then rerank.</p>`, `<p>Use metadata filters integrated in the engine and shard by category or hash.</p>`, `<p>Evaluate with click logs and judged queries; run A/B tests.</p>`],
  solution: {
    approach: `<p>Architecture: query understanding first (spell fix, SKU/brand detection, optional LLM rewrite for vague queries). Then run two retrievers in parallel against a sharded search cluster (OpenSearch/Elasticsearch or Vespa, which hold both BM25 inverted indexes and HNSW vectors on the same documents): lexical top-100 using BM25 over title, brand, SKU and attributes with field boosts, and dense top-100 using HNSW on a product-text embedding (quantised to int8, 100M × 768 ≈ 77 GB). Filters (category, price range, in-stock, region) are applied inside both retrievers as integrated filters, never after. Fuse with RRF (k ≈ 60, vector weight tuned), send the top 100 to a light cross-encoder reranker (plus business signals: popularity, margin, availability) and return 20 results. Exact SKU or ID queries short-circuit to the lexical path with a high boost. Scale: 24-48 shards with 2-3 replicas, in-memory HNSW per shard, each shard returning its local top-100 that a coordinator merges; queries run in parallel to meet 150 ms. Updates: price/stock are partial document updates (no re-embedding); embeddings re-computed daily in a pipeline and swapped via blue/green index aliases, versioned by model id. Evaluation: judged query set with nDCG@10 and recall@100 per retriever, query-class dashboards (SKU, brand, vague), online A/B on click-through and conversion, monitoring of zero-result rate and latency percentiles. Risks: filter-heavy queries hurting recall (monitor), embedding drift after a model upgrade, and cost of the reranker (cache and limit to top 50).</p>`,
    complexity: `<p>Per shard: BM25 postings traversal plus O(log n) HNSW; coordinator merge O(shards · 100).</p>`, followUps: ['How would you add personalisation?', 'How do you handle new listings that have no embedding yet?']
  }
});

practice.push({
  title: 'Migrate to a New Embedding Model Without Downtime', level: 'Hard', tags: ['migration', 'operations', 'embeddings'], companies: ['Stripe', 'Atlassian'],
  statement: `<p>Your RAG product embeds 40M chunks with model A. Model B is 8 points better on your eval set but has different dimensions (1024 vs 1536). Plan a zero-downtime migration including cost, validation and rollback.</p>`,
  constraints: `Traffic cannot pause; embedding API budget is limited; queries must always use the same model as the index they hit.`,
  example: `<p>Never compare a model-B query vector against model-A document vectors: meaningless scores.</p>`,
  brute: { why: `<p>Overwriting vectors in place makes the index a mix of two spaces during the job, giving garbage results and no rollback.</p>` },
  mcq: { q: 'During migration a query embedded with model B must hit...', options: ['The index built with model B', 'The old index', 'Either one', 'A mixed index'], answer: 0, explain: 'Query and document vectors must come from the same model.' },
  hints: [`<p>Build a second, parallel index (blue/green).</p>`, `<p>Backfill in batches, then shadow-test before switching.</p>`, `<p>Keep the old index until the new one is proven; use an alias for atomic cutover.</p>`],
  solution: {
    approach: `<p>Blue/green plan. 1) Create a new collection/index with the new dimension (1024) and store model id and version on every row. 2) Dual-write: new and updated chunks are embedded with both models from now on. 3) Backfill the 40M existing chunks with model B in rate-limited batches (idempotent jobs keyed by chunk id and content hash, so retries are safe); estimate cost as tokens × price (40M × 400 tokens = 16B tokens), and prioritise the hottest documents first. 4) Build the ANN index after bulk loading (faster than incremental) and compare memory (1024 vs 1536 dims saves one third). 5) Validate offline: run the golden query set and compare recall@10 and nDCG against model A with the same chunking; check score distributions because thresholds will differ. 6) Shadow traffic: send real queries to both stacks, compare results and latency without serving B. 7) Canary 1% then 10% via a flag, with metrics on answer quality, click-through, thumbs-up and latency. 8) Atomic cutover by switching an alias; keep the old index and dual-write for one to two weeks as rollback. 9) Decommission model A afterwards and update runbooks. Pitfalls: re-tuning similarity thresholds, query-time embedding service capacity, and cache invalidation of semantic caches keyed by the old model.</p>`,
    complexity: `<p>One-time cost proportional to total tokens; steady-state cost doubles during dual-write.</p>`, followUps: ['How do you handle a model whose API is deprecated?']
  }
});

practice.push({
  title: 'Debug: Recall Dropped After a Reindex', level: 'Hard', tags: ['debugging', 'ANN', 'operations'], companies: ['Google', 'Pinecone'],
  statement: `<p>After a nightly rebuild, search quality drops: users report that obvious documents vanish. Golden-query recall@10 fell from 0.96 to 0.78. Latency improved by 40%. List the likely causes in order and how you would confirm each.</p>`,
  constraints: `You have access to configs, build logs and an exact-search tool.`,
  example: `<p>A faster and less accurate index is the signature of lower ef or nprobe, stale centroids, or a changed metric.</p>`,
  brute: { why: `<p>Blindly raising efSearch hides the root cause (e.g. mixed embedding models) and costs latency.</p>` },
  mcq: { q: 'Latency dropped and recall dropped together. Most suspicious?', options: ['Search or build parameters were lowered or reset to defaults', 'More replicas were added', 'The index got larger', 'The tokens per query rose'], answer: 0, explain: 'Less work per query is faster and less accurate.' },
  hints: [`<p>Diff the old and new index configuration.</p>`, `<p>Check that all vectors share the model and that normalisation is consistent.</p>`, `<p>Compare ANN against exact search on the golden queries to separate index error from embedding error.</p>`],
  solution: {
    approach: `<p>Method: first separate index error from embedding error by running exact (brute-force) search on the same vectors for the golden queries. If exact search is also bad, the vectors are wrong: check for a changed or partially migrated embedding model (mixed spaces), chunking or preprocessing changes, missing normalisation, a switched metric, or truncated dimensions. If exact search is good but ANN is bad, the index is at fault: diff build and search parameters (M, efConstruction, efSearch, nlist, nprobe) against the previous night, since a config reset to defaults or lowered ef gives exactly the signature of "faster but worse". Check for IVF centroids trained on too small or stale a sample (look at the bucket-size histogram for one giant bucket), index built before all data loaded, PQ settings or quantisation silently enabled, a different metric on the index than in the query operator (e.g. L2 index with a cosine query falls back to scanning or returns poor order), deletes or tombstones not compacted, and filters now applied after the search. Confirm each hypothesis with a controlled experiment on a copy: change one factor and measure recall@10 on the golden set. Fix by restoring parameters, adding a recall gate to the build pipeline (the new index must pass the golden set before the alias swaps), and keeping the previous index for rollback.</p>`,
    complexity: `<p>Debugging cost is dominated by exact-search ground truth on a query sample.</p>`, followUps: ['How would you automate this check?']
  }
});

practice.push({
  title: 'Build a Retrieval Evaluation Harness', level: 'Hard', tags: ['evaluation', 'search quality', 'MRR', 'nDCG'], companies: ['OpenAI', 'Anthropic', 'Cohere'],
  statement: `<p>Design a harness that tells you whether a change (new model, new chunking, hybrid on/off, different efSearch) improves search. Define the dataset, metrics, procedure and guardrails. Implement MRR and recall@k.</p>`,
  constraints: `Labelled data is expensive; you have 5,000 user queries and click logs.`,
  example: `<p>Query "reset 2FA" with relevant chunk X: if X is at rank 3, reciprocal rank = 1/3.</p>`,
  brute: { why: `<p>Eyeballing five queries after each change misses regressions in other query classes and is not reproducible.</p>` },
  mcq: { q: 'MRR (mean reciprocal rank) rewards...', options: ['Putting the first relevant result near the top', 'Returning many results', 'Low latency', 'Short documents'], answer: 0, explain: 'It averages 1/rank of the first relevant hit.' },
  hints: [`<p>Build a golden set from sampled queries plus judged results.</p>`, `<p>Use recall@k for retrieval, nDCG/MRR for ranking, and slice by query type.</p>`, `<p>Add a regression gate in CI and online A/B tests.</p>`],
  solution: {
    approach: `<p>Dataset: sample 300-1000 queries stratified by type (IDs, short keywords, natural-language questions, long queries, different tenants/languages) from the 5,000 logs; for each, create relevance labels from a mix of click data (noisy), human judges on a pooled top-20 from several systems, and LLM-as-judge for scale (calibrated against a human-labelled subset of 100). Freeze the corpus snapshot so runs are reproducible. Metrics: retrieval stage recall@50/100 (did the right chunk make it into the candidate pool), ranking stage MRR and nDCG@10, plus p50/p95 latency and cost per query; report each by query slice, with bootstrap confidence intervals so noise is not mistaken for improvement. Procedure: a script takes a config (model, chunker, index parameters, fusion), builds or loads the index, runs all queries, writes metrics and a per-query diff against the baseline highlighting wins and losses. Guardrails: a CI gate fails the build if any slice's recall@50 drops by more than 2 points or latency rises past budget; ANN recall is checked separately against exact search so index error and model error are not confused. Online: A/B test with click-through, reformulation rate and thumbs-up before a full rollout.</p>`,
    code: { lang: 'python', run: true, code: `def mrr(ranked_lists, relevant_sets):\n    total = 0.0\n    for ranked, rel in zip(ranked_lists, relevant_sets):\n        for pos, doc in enumerate(ranked, start=1):\n            if doc in rel:\n                total += 1.0 / pos\n                break\n    return total / len(ranked_lists)\n\ndef recall_at_k(ranked_lists, relevant_sets, k):\n    hits = sum(len(set(r[:k]) & rel) / len(rel) for r, rel in zip(ranked_lists, relevant_sets))\n    return hits / len(ranked_lists)\n\nruns = [["a", "x", "b"], ["y", "z", "c"]]\nrels = [{"a"}, {"c", "q"}]\nprint("MRR", mrr(runs, rels))\nprint("recall@3", recall_at_k(runs, rels, 3))` },
    complexity: `<p>O(Q · k) to score plus the cost of running the retrieval for Q queries.</p>`, followUps: ['How do you stop overfitting to the golden set?']
  }
});

function Q(q, options, answer, explain) { quiz.push({ q: q, options: options, answer: answer, explain: explain }); }
Q('What does an embedding represent?', ['A list of numbers placing an item on a "map of meaning"', 'The compressed file size of a document', 'A hash used for security', 'The number of words in a text'], 0, 'Embeddings are learned vectors where nearby points have similar meaning.');
Q('Vectors a = [3, 4] and b = [6, 8]. Their cosine similarity is...', ['1.0', '0.5', '0', '2.0'], 0, 'They point in the same direction; cosine ignores length.');
Q('If all vectors are normalised to length 1, which statement is true?', ['Cosine ranking = dot-product ranking = Euclidean ranking', 'Dot product and cosine always differ', 'Euclidean distance becomes meaningless', 'Only cosine works'], 0, 'For unit vectors, distance² = 2 − 2·cosine, so the rankings agree.');
Q('pgvector operator <=> returns...', ['Cosine distance (smaller is more similar)', 'Cosine similarity (larger is better)', 'Euclidean distance', 'Number of matching words'], 0, '<=> is cosine distance; <-> is L2 and <#> is negative inner product.');
Q('What is recall@10 for an ANN index?', ['Fraction of the true top-10 neighbours it returned', 'Queries answered per second', 'Fraction of memory used', 'Percentage of duplicates'], 0, 'It compares the ANN result with exact search.');
Q('In HNSW, which parameter can you change at query time without rebuilding?', ['efSearch', 'M', 'efConstruction', 'Vector dimension'], 0, 'efSearch is the beam width at search time; M and efConstruction shape the graph.');
Q('In an IVF index, increasing nprobe will usually...', ['Raise recall and latency', 'Lower recall and latency', 'Shrink memory', 'Change the embeddings'], 0, 'More buckets are scanned.');
Q('The main source of IVF recall loss is...', ['True neighbours sitting in a bucket you did not probe', 'Using floats', 'Too many dimensions', 'Cosine similarity'], 0, 'Neighbours near cluster borders can be in a neighbouring cell.');
Q('Which is the best fit for 1.5M vectors, an existing Postgres and a small team?', ['pgvector with HNSW', 'A custom GPU FAISS cluster', 'Sharded Milvus on 20 nodes', 'Brute force over CSV files'], 0, 'It adds no new infrastructure and supports SQL filters and joins.');
Q('Post-filtering a global top-10 by tenant often returns...', ['Fewer than 10 results', 'Exactly 10 always', 'Duplicate results', 'Encrypted results'], 0, 'Most candidates belong to other tenants and are discarded.');
Q('Why use Reciprocal Rank Fusion?', ['Ranks from different retrievers are comparable even if scores are not', 'It is the only way to use BM25', 'It removes the need for embeddings', 'It makes search deterministic'], 0, 'BM25 and cosine scores have different scales; ranks do not.');
Q('Which query benefits most from keyword (BM25) search?', ['"error code E4471"', '"a gift idea for someone who loves hiking"', '"how to get my money back"', '"similar paintings to this one"'], 0, 'Exact identifiers are matched literally by BM25 but are fuzzy for embeddings.');
Q('Switching to a new embedding model requires...', ['Re-embedding everything and a new index', 'Nothing, vectors are compatible', 'Only changing the query model', 'Renaming the table'], 0, 'Vectors from different models live in different spaces.');
Q('Brute-force search is often the right choice when...', ['The collection is small (e.g. under ~100k vectors) and recall must be perfect', 'You have billions of vectors', 'Latency must be under 1 ms at 100k QPS', 'You use product quantisation'], 0, 'Exact search is simple and fast enough at small scale.');

interview.push({ q: 'Explain what an embedding is to a non-technical person, then to an engineer.', level: 'B', a: `<p><b>Non-technical:</b> an embedding is an address on a map of meaning. Texts that mean similar things get addresses close together, so a computer can find "things like this" by looking for neighbours.</p><p><b>Engineer:</b> a fixed-length dense vector (typically 384-3072 floats) produced by a neural encoder trained with a contrastive objective so that semantically related inputs have high cosine similarity. It is typically L2-normalised, and query and documents must come from the same model. Embeddings capture topic and relationships but are weak on exact identifiers, numbers and negation.</p>`, followUps: ['What does king − man + woman show?', 'What are the limits of embeddings?'] });
interview.push({ q: 'Cosine vs dot product vs Euclidean: which would you use and why?', level: 'B', a: `<p>Use what the embedding model was trained with, which for most text models is cosine. If vectors are normalised to unit length, all three give the same ranking (cosine = dot, distance² = 2 − 2·cosine), so I store normalised vectors and use inner product because it is the cheapest and maps to a matrix multiply. I would use raw dot product only when vector length carries meaning (for instance popularity in a recommender) and Euclidean mainly for clustering or when the model card says L2. The index must be created with the same metric as the query operator.</p>`, followUps: ['What happens if you query an L2 index with a cosine operator?', 'How does pgvector represent inner product?'] });
interview.push({ q: 'How does semantic search work end to end?', level: 'B', a: `<p>Ingestion: split content into chunks, embed each chunk with a model, store the vector with metadata (and the text or its id) in a vector store, and build an ANN index. Query: embed the user query with the same model, apply metadata filters, search the index for the nearest k vectors, and return those chunks, usually after an optional rerank. Quality depends on chunking, the model, the metric/normalisation, and evaluation on real queries. For production add hybrid keyword search, access control, monitoring and a re-embedding plan.</p>`, followUps: ['What breaks if the query uses a different model?', 'How do you keep the index fresh?'] });
interview.push({ q: 'Why not always use brute-force kNN? Why not always use ANN?', level: 'I', a: `<p>Brute force is exact but costs O(N·d) per query: fine for tens of thousands of vectors or batch jobs, too slow and too CPU-hungry for tens of millions at interactive latency. ANN indexes (HNSW, IVF) reach sub-linear query time by examining a small part of the data at the price of recall below 100%, memory for the index, build time, and tuning. At small scale ANN adds complexity and error for no benefit. I decide with measurements: latency budget, QPS, data size, and the recall target on real queries, keeping brute force as the ground-truth baseline.</p>`, followUps: ['At what scale would you switch?', 'How do you compute ground truth for billions of vectors?'] });
interview.push({ q: 'Explain how HNSW works and what M, efConstruction and efSearch do.', level: 'I', a: `<p>HNSW is a multi-layer proximity graph. Each vector lives in layer 0 and, with exponentially decreasing probability, in higher layers, like a skip list. Search starts at the top layer's entry point, greedily moves to the neighbour closest to the query until none is closer, then descends a layer and repeats; at layer 0 it keeps a beam of efSearch candidates and returns the best k. M is the number of links per node (recall and memory up, build slower). efConstruction is the candidate-list size while inserting (better graph quality, slower build). efSearch is the beam width at query time: the live recall-versus-latency dial that needs no rebuild.</p>`, followUps: ['Why is HNSW memory-hungry?', 'What happens on deletes?'] });
interview.push({ q: 'Explain IVF and the role of nlist and nprobe.', level: 'I', a: `<p>IVF clusters the vectors with k-means into nlist cells and stores each vector in the list of its nearest centroid. At query time we compare the query to the nlist centroids, pick the nprobe nearest cells and scan only the vectors in them. Work per query is about nlist·d + nprobe·(N/nlist)·d. Larger nprobe increases recall (fewer border misses) and latency; nlist is typically ~√N to 4·√N and fixed at build time after a training step. IVF has a fast build, a small memory footprint and combines with product quantisation (IVF-PQ) for billion-scale; centroids may need retraining as the data drifts.</p>`, followUps: ['What is product quantisation?', 'How would you pick nprobe?'] });
interview.push({ q: 'HNSW or IVF: how do you choose?', level: 'I', a: `<p>HNSW usually gives better recall at a given latency and supports incremental inserts well, but it needs the graph and vectors in RAM, builds slowly and handles deletes and heavy filters less gracefully. IVF (especially IVF-PQ) builds fast, is compact, and is the natural choice when memory is the limit or at billion scale, when GPUs are available, or when strong metadata filters are applied inside buckets. For up to tens of millions of vectors with enough RAM I default to HNSW; I switch to IVF-PQ or a disk-based graph (DiskANN) when memory cost dominates. The final answer comes from a benchmark of recall versus QPS on my data.</p>`, followUps: ['What about quantised HNSW?', 'How do filters change the choice?'] });
interview.push({ q: 'How do you handle metadata filtering in vector search? Why is it hard?', level: 'I', a: `<p>Filters conflict with ANN structure: a graph or cluster index is built over all vectors, so a selective filter can leave few valid candidates on the search path. Post-filtering returns fewer than k results, and pre-filtering can disconnect the graph. Practical solutions: integrated filtered search (the traversal checks the predicate and continues until k valid rows, e.g. pgvector iterative scans, Qdrant, Weaviate, Pinecone), partitioning or namespaces for high-cardinality keys such as tenant, switching to an exact scan when the filter matches few rows, and over-fetching as a stop-gap. For access control, enforce the filter inside the database and test with the smallest tenants.</p>`, followUps: ['How would you shard a multi-tenant index?', 'What does the planner do for very selective filters?'] });
interview.push({ q: 'When would you pick pgvector, Pinecone or FAISS?', level: 'I', a: `<p>pgvector when I already run Postgres, have up to roughly 10-50M vectors, and want SQL filters, joins and transactions with one system to operate. Pinecone (or another managed service) when I want minimal operations, variable load, namespaces per tenant and fast time to production, accepting cost and lock-in. FAISS when I need a library for batch or research workloads, GPU acceleration, custom index types like IVF-PQ at billion scale, or embedding search inside my own service, knowing I must build persistence, metadata, replication and serving around it. Others such as Qdrant, Weaviate, Milvus and OpenSearch fit when I need richer filtering, hybrid search or self-hosting.</p>`, followUps: ['How would you migrate off pgvector later?', 'What would make you reject a managed service?'] });
interview.push({ q: 'What is hybrid search and how does reciprocal rank fusion work?', level: 'I', a: `<p>Hybrid search combines lexical retrieval (BM25 over an inverted index) with dense vector retrieval, because keywords handle exact tokens such as IDs, names and rare terms while vectors handle synonyms and paraphrase. RRF merges the two ranked lists without needing comparable scores: each document gets Σ 1/(k + rank) over the lists in which it appears, with k about 60; documents liked by both retrievers rise. Typically retrieve 50-100 from each, fuse, then rerank the top 20-50 with a cross-encoder. Weighted RRF or score blending can bias toward the stronger retriever, tuned on a labelled set.</p>`, followUps: ['Why not just add the scores?', 'What does k control?'] });
interview.push({ q: 'Walk me through BM25 and why it still matters in the age of embeddings.', level: 'A', a: `<p>BM25 scores a document by summing, over query terms, IDF(term) times a saturating term-frequency factor f·(k1+1)/(f + k1·(1 − b + b·|d|/avgdl)). Rare words weigh more, repeated words give diminishing returns, and long documents are normalised. It runs on an inverted index in milliseconds over billions of documents, is explainable, needs no model or GPU, is exact on identifiers, and cannot go stale when embedding models change. It still loses on paraphrase and vocabulary mismatch, which is why modern systems fuse it with vectors rather than replacing it.</p>`, followUps: ['What do k1 and b do?', 'How does SPLADE relate to BM25?'] });
interview.push({ q: 'You must move 40M chunks to a new embedding model with no downtime. How?', level: 'A', a: `<p>Blue/green: create a new index for the new model (dimension may differ) and record model id and version per row. Dual-write new and updated chunks to both. Backfill historical chunks in idempotent, rate-limited batches, estimating cost from total tokens. Build the ANN index after bulk loading, then validate offline against a golden query set (recall@k, nDCG) and recalibrate any score thresholds. Shadow real traffic, canary a small percentage, then cut over atomically with an alias, keeping the old index and dual writes for a rollback window. Queries must always be embedded with the model matching the index they hit, and semantic caches must be invalidated.</p>`, followUps: ['How do you test a rollback?', 'What if the embedding provider deprecates the old model first?'] });
interview.push({ q: 'Design retrieval for a RAG assistant over 500M chunks that must respect per-user permissions.', level: 'E', a: `<p>Ingest with chunking and metadata including tenant, ACL groups, source and timestamps. Store embeddings (int8 or float16, optionally Matryoshka-truncated) in a sharded engine partitioned by tenant, with HNSW or IVF-PQ plus a BM25 index in the same engine. Query path: authenticate, expand the user's groups into a filter enforced inside the engine, run BM25 and vector retrieval in parallel with the filter, fuse with RRF, rerank with a cross-encoder, then pass the top chunks with citations to the LLM. Never filter after retrieval, and never let the LLM see unauthorised text. Quantise and rerank to control memory, replicate for QPS, version indexes by embedding model for blue/green upgrades, and monitor recall on golden queries per tenant size, latency percentiles and zero-result rates. Evaluate the whole pipeline for faithfulness and context recall.</p>`, followUps: ['How do you handle permission changes quickly?', 'How do you test for cross-tenant leakage?'] });
interview.push({ q: 'How would you measure and improve retrieval quality over time?', level: 'E', a: `<p>Create a golden set of real queries stratified by type with relevance labels (human, click-derived, calibrated LLM judge). Track recall@k for the retrieval stage and nDCG or MRR for the final ranking, plus latency and cost, always sliced by query type and tenant size with confidence intervals. Separate index error (ANN versus exact search on the same vectors) from model error (exact search quality). Gate every change (model, chunking, parameters, hybrid weights) in CI against the baseline, then A/B test online using click-through, reformulation and satisfaction. Improvements in order of payoff: better chunking and metadata, hybrid search, a reranker, query rewriting, a domain-tuned embedding model, and index parameter tuning.</p>`, followUps: ['How do you stop overfitting the golden set?', 'What would you log in production?'] });

registerModule({
  id: 'ai08',
  title: 'Embeddings & Vector Databases',
  intro: `<p>Almost every modern AI product (RAG chatbots, semantic search, recommendations, duplicate detection) rests on one idea: turn things into lists of numbers so that <b>similar meaning means nearby numbers</b>. This module teaches what embeddings capture, how to measure similarity (cosine, dot, Euclidean), how to search millions of vectors fast with HNSW and IVF indexes, how pgvector, Pinecone and FAISS differ, and how to combine keyword (BM25) and vector search with reciprocal rank fusion. You will run toy versions in the browser and finish able to choose and defend a design in an interview.</p>`,
  goals: ['Explain what an embedding captures and why king − man + woman ≈ queen works (and its limits)', 'Choose between cosine, dot product and Euclidean, and know when they give identical rankings', 'Explain exact kNN versus ANN, tune HNSW (M, efConstruction, efSearch) and IVF (nlist, nprobe) for a recall/latency target', 'Pick between pgvector, Pinecone, FAISS and others for a given scale, and handle metadata filtering correctly', 'Build hybrid search: BM25 plus vectors fused with RRF, and evaluate it with recall@k and nDCG'],
  prereqs: `AI module 3 (Math &amp; Python for AI: vectors and dot product), AI module 5 (embeddings in neural networks) and AI module 6 (How LLMs Work). Next up: AI module 9 (RAG End to End).`,
  hours: 9,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
