(function () { var topics = [], practice = [], quiz = [], interview = [];
var PY = {};
PY.funnel = `# Back-of-envelope for a multi-stage ML funnel: QPS, items scored per second, latency budget.
DAU = 50_000_000            # daily active users
SESSIONS_PER_USER = 6       # feed opens per user per day
PEAK_FACTOR = 3             # peak QPS / average QPS

avg_qps = DAU * SESSIONS_PER_USER / 86_400
peak_qps = avg_qps * PEAK_FACTOR
print(f"average QPS = {avg_qps:,.0f}   peak QPS = {peak_qps:,.0f}")

# Each stage keeps fewer items but spends more compute per item.
stages = [  # (name, items in, cost per item in microseconds, latency budget ms)
    ("candidate generation (ANN)", 10_000_000, 0.0, 30),   # ANN cost is ~log(N), not per item
    ("light ranker (small model)", 2_000, 5.0, 40),
    ("heavy ranker (big model)", 500, 200.0, 80),
    ("re-rank + business rules", 100, 2.0, 20),
]
total_ms = 0
for name, items, us_per_item, budget in stages:
    cpu_ms = items * us_per_item / 1000            # single-core time if done serially
    scored_per_sec = 0 if us_per_item == 0 else items * peak_qps
    total_ms += budget
    print(f"{name:28s} items={items:>10,}  serial cpu={cpu_ms:7.1f} ms  budget={budget} ms  items/s={scored_per_sec:,.0f}")
print(f"end-to-end latency budget = {total_ms} ms (target p99 under 200 ms)")
# Lesson: the heavy ranker scores 500 items x peak QPS -> that number sizes your GPU/CPU fleet.
`;
PY.twotower = `# Two-tower retrieval on toy vectors: user tower and item tower meet at a dot product.
import math

def tower(features, weights):
    """A 'tower' here is one linear layer + L2 normalise. Real towers are MLPs over many features."""
    out = [sum(f * w for f, w in zip(features, col)) for col in weights]
    n = math.sqrt(sum(x * x for x in out)) or 1.0
    return [x / n for x in out]

# 3 raw features -> 2-d embedding (weights would be learned with in-batch negatives)
USER_W = [[1.0, 0.2, 0.0], [0.0, 0.3, 1.0]]
ITEM_W = [[0.9, 0.0, 0.1], [0.1, 0.2, 1.0]]

items = {   # item features: (sportiness, recency, cooking-ness)
    "football highlights": [0.9, 0.5, 0.0],
    "pasta recipe":        [0.0, 0.4, 0.9],
    "marathon training":   [0.8, 0.2, 0.1],
    "baking bread":        [0.1, 0.9, 0.8],
    "tennis final":        [0.7, 0.9, 0.0],
}
# Offline: embed every item once and store in an ANN index (here: a plain dict).
index = {name: tower(f, ITEM_W) for name, f in items.items()}

def retrieve(user_features, k=3):
    u = tower(user_features, USER_W)            # online: one user-tower call per request
    scored = [(sum(a * b for a, b in zip(u, v)), name) for name, v in index.items()]
    scored.sort(reverse=True)                   # ANN would do this approximately in ~log N
    return scored[:k]

for who, feats in [("sports fan", [1.0, 0.5, 0.0]), ("home cook", [0.0, 0.5, 1.0])]:
    print(who)
    for score, name in retrieve(feats):
        print(f"   {score:+.3f}  {name}")
`;
PY.blend = `# Re-ranker: blend several model heads into one value score, then apply diversity.
# score = w_click*p(click) + w_like*p(like) + w_watch*E[watch_sec]/60 - w_hide*p(hide)
W = {"click": 1.0, "like": 4.0, "watch": 2.0, "hide": 20.0}

candidates = [  # (id, author, p_click, p_like, expected_watch_seconds, p_hide)
    ("v1", "alice", 0.30, 0.05, 40, 0.010),
    ("v2", "alice", 0.28, 0.06, 45, 0.005),
    ("v3", "bob",   0.45, 0.01, 10, 0.040),   # clickbait: high click, high hide
    ("v4", "cara",  0.20, 0.08, 90, 0.002),
    ("v5", "alice", 0.25, 0.05, 38, 0.006),
    ("v6", "dan",   0.15, 0.03, 20, 0.003),
]

def value(c):
    _, _, pc, pl, watch, ph = c
    return W["click"] * pc + W["like"] * pl + W["watch"] * watch / 60 - W["hide"] * ph

ranked = sorted(candidates, key=value, reverse=True)
print("pure value order :", [(c[0], round(value(c), 3)) for c in ranked])

def diversify(ranked, penalty=0.5):
    """Greedy: each extra item from an author already shown is multiplied by penalty."""
    out, seen, pool = [], {}, list(ranked)
    while pool:
        best = max(pool, key=lambda c: value(c) * (penalty ** seen.get(c[1], 0)))
        pool.remove(best)
        out.append(best[0])
        seen[best[1]] = seen.get(best[1], 0) + 1
    return out

print("after diversity  :", diversify(ranked))
`;
PY.ndcg = `# Offline ranking metrics: recall@k, precision@k, MRR and NDCG@k.
import math

def recall_at_k(ranked, relevant, k):
    return len(set(ranked[:k]) & set(relevant)) / len(relevant)

def precision_at_k(ranked, relevant, k):
    return len(set(ranked[:k]) & set(relevant)) / k

def mrr(ranked, relevant):
    for i, d in enumerate(ranked, start=1):
        if d in relevant:
            return 1 / i
    return 0.0

def dcg(gains):
    # graded gain, log2 position discount: (2^g - 1) / log2(i + 1)
    return sum((2 ** g - 1) / math.log2(i + 1) for i, g in enumerate(gains, start=1))

def ndcg_at_k(ranked, grades, k):
    gains = [grades.get(d, 0) for d in ranked[:k]]
    ideal = sorted(grades.values(), reverse=True)[:k]
    best = dcg(ideal)
    return dcg(gains) / best if best else 0.0

grades = {"d1": 3, "d4": 2, "d7": 1}          # human labels: 3 perfect, 2 good, 1 fair
relevant = list(grades)
for name, ranked in [("model A", ["d4", "d1", "d2", "d7", "d5"]),
                     ("model B", ["d2", "d5", "d1", "d4", "d7"])]:
    print(name, ranked)
    print(f"   recall@3={recall_at_k(ranked, relevant, 3):.2f}  precision@3={precision_at_k(ranked, relevant, 3):.2f}"
          f"  MRR={mrr(ranked, relevant):.2f}  NDCG@5={ndcg_at_k(ranked, grades, 5):.3f}")
`;
PY.ctr = `# Ads: CTR model quality = ranking (AUC) AND calibration (log loss, predicted/observed ratio).
import math

preds  = [0.20, 0.50, 0.10, 0.80, 0.30, 0.15, 0.60, 0.05, 0.40, 0.25]   # a toy high-CTR segment
clicks = [0,     1,     0,     1,     0,     0,     0,     0,     1,     0]

def log_loss(p, y):
    eps = 1e-12
    return -sum(yi * math.log(pi + eps) + (1 - yi) * math.log(1 - pi + eps) for pi, yi in zip(p, y)) / len(y)

def auc(p, y):
    pos = [a for a, b in zip(p, y) if b == 1]
    neg = [a for a, b in zip(p, y) if b == 0]
    wins = sum(1.0 if a > b else 0.5 if a == b else 0.0 for a in pos for b in neg)
    return wins / (len(pos) * len(neg))

print(f"AUC={auc(preds, clicks):.3f}  logloss={log_loss(preds, clicks):.4f}"
      f"  calibration ratio={sum(preds) / sum(clicks):.3f}  (1.0 = perfect)")

# Negative downsampling: we kept only 10% of negatives while training. Correct the scores:
w = 0.10
def correct(p):          # q = p / (p + (1 - p) / w)
    return p / (p + (1 - p) / w)
print("raw model output 0.30 after 10% neg sampling -> true pCTR", round(correct(0.30), 4))

# Auction ranking: eCPM = bid x pCTR x 1000. Calibration errors change who wins.
ads = [("shoes", 2.00, 0.010), ("loans", 8.00, 0.002), ("games", 0.50, 0.050)]
for name, bid, p in sorted(ads, key=lambda a: a[1] * a[2], reverse=True):
    print(f"{name:6s} bid=$" + f"{bid:.2f} pCTR={p:.3f} eCPM=$" + f"{bid * p * 1000:.2f}")
`;
PY.fraud = `# Fraud: pick the score threshold that minimises expected dollar cost, not maximises accuracy.
# Each row: (model score, is_fraud, amount $)
txns = [(0.97, 1, 900), (0.91, 1, 1200), (0.88, 0, 40), (0.80, 1, 300), (0.72, 0, 75),
        (0.65, 0, 20), (0.60, 1, 150), (0.45, 0, 60), (0.30, 0, 35), (0.22, 1, 80),
        (0.15, 0, 25), (0.05, 0, 10)]
REVIEW_COST = 3.0          # analyst minutes or friction per blocked/challenged legit txn
FRICTION_LOSS = 0.10       # fraction of a legit txn's value lost as churn when we block it

def cost(threshold):
    total, tp, fp, fn = 0.0, 0, 0, 0
    for score, fraud, amount in txns:
        flagged = score >= threshold
        if fraud and not flagged:
            total += amount; fn += 1                         # missed fraud: we eat the chargeback
        elif not fraud and flagged:
            total += REVIEW_COST + FRICTION_LOSS * amount; fp += 1   # annoyed good customer
        elif fraud and flagged:
            tp += 1
    return total, tp, fp, fn

print("thr   cost$   TP FP FN  precision recall")
best = None
for thr in [0.1, 0.2, 0.3, 0.5, 0.6, 0.7, 0.85, 0.95]:
    c, tp, fp, fn = cost(thr)
    prec = tp / (tp + fp) if tp + fp else 0
    rec = tp / (tp + fn)
    print(f"{thr:4.2f} {c:7.1f}  {tp:2d} {fp:2d} {fn:2d}   {prec:5.2f}    {rec:5.2f}")
    if best is None or c < best[1]:
        best = (thr, c)
print("cheapest threshold:", best)
`;
PY.moder = `# Content moderation: route each item by classifier score into auto-remove / human review / allow,
# with per-policy thresholds and a reviewer capacity limit.
POLICY = {   # (auto_remove_at, review_at) - stricter for severe harms
    "csam":     (0.50, 0.05),
    "violence": (0.95, 0.60),
    "spam":     (0.90, 0.70),
}
REVIEW_CAPACITY = 3        # human reviews we can afford in this batch

items = [  # (id, policy, score, views_per_hour)
    ("p1", "spam", 0.97, 10), ("p2", "violence", 0.70, 5000), ("p3", "violence", 0.62, 20),
    ("p4", "spam", 0.75, 50), ("p5", "csam", 0.08, 3), ("p6", "violence", 0.98, 900),
    ("p7", "spam", 0.40, 100), ("p8", "violence", 0.66, 12000),
]
removed, queue, allowed = [], [], []
for pid, pol, s, views in items:
    remove_at, review_at = POLICY[pol]
    if s >= remove_at:
        removed.append(pid)
    elif s >= review_at:
        severity = 10 if pol == "csam" else 3 if pol == "violence" else 1
        queue.append((severity * s * views, pid))    # priority = harm x prob x reach
    else:
        allowed.append(pid)
queue.sort(reverse=True)
reviewed = [pid for _, pid in queue[:REVIEW_CAPACITY]]
backlog = [pid for _, pid in queue[REVIEW_CAPACITY:]]
print("auto-removed :", removed)
print("human review :", reviewed, " (highest harm x reach first)")
print("backlog      :", backlog, " (reduce distribution until reviewed)")
print("allowed      :", allowed)
`;

// Shared helper for box-and-arrow architecture diagrams.
function box(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 16 }; }
function flowFrames(label, nodes, edges, steps, height) {
  return steps.map(function (s) {
    return { narr: s[0], parts: [{ type: 'graph', label: label, directed: true, height: height || 60, nodes: nodes, edges: edges, hl: s[1] || {}, ehl: s[2] || {}, tags: s[3] || {} }].concat(s[4] || []) };
  });
}
function prob(o) { // compact practice entries (design answers; code optional on this track)
  return { title: o.t, level: o.l, tags: o.tags, companies: o.co || ['Any'], statement: o.s, constraints: o.c, example: o.ex,
    brute: { why: o.bw }, mcq: o.mcq, hints: o.h,
    solution: { approach: o.a, complexity: o.cx, followUps: o.fu } };
}
topics.push({
  title: 'A Framework for ML System Design Interviews',
  analogy: `<p>Think of a doctor's visit. A good doctor does not prescribe pills in the first ten seconds. She asks what hurts (<b>clarify</b>), decides what she is measuring (<b>objective</b>), runs tests (<b>data + features</b>), picks a treatment (<b>model</b>), checks it worked in the lab (<b>offline eval</b>) and on you (<b>online A/B</b>), then books a follow-up (<b>monitoring</b>). ML system design is the same checklist, said out loud, in order.</p>`,
  explain: `<p>🟢 <b>The big idea.</b> An ML design interview is not "which model?". It is "turn a fuzzy business goal into a measurable prediction problem, then build the data, model, serving and feedback machinery around it". Interviewers score <i>structure</i> and <i>trade-offs</i> far more than model names. Use the same eight steps every time:</p>
  ${H.table(['#', 'Step', 'What you say', 'Typical time'], [
    ['1', 'Clarify', 'Users, scale, latency, surfaces, what success means for the business', '3-5 min'],
    ['2', 'Frame as ML', 'Business metric -> ML objective -> label. "Maximise time well spent" -> predict p(click), p(like), E[watch]', '3-5 min'],
    ['3', 'Data + labels', 'Where labels come from (implicit clicks, explicit reports, human raters), delay, noise, imbalance, leakage', '5 min'],
    ['4', 'Features', 'User, item, context, cross features; real-time vs batch; feature store; training-serving skew', '5 min'],
    ['5', 'Model + stages', 'Baseline first; funnel of retrieval -> light rank -> heavy rank -> re-rank', '8-10 min'],
    ['6', 'Offline eval', 'AUC, log loss, recall@k, NDCG, precision at fixed recall; time-based split', '3-5 min'],
    ['7', 'Online eval', 'A/B test on the business metric, guardrail metrics, ramp-up', '3-5 min'],
    ['8', 'Serve, scale, monitor', 'Latency budget, caching, drift, retraining cadence, feedback loops', '5 min']])}
  <p><b>The funnel (multi-stage) pattern.</b> Almost every case study here (feed, search, ads) has the same shape because you cannot run a big model on 10 million items in 100 ms. Each stage keeps fewer items and spends more compute per item:</p>
  ${H.arr(['10M items', '2,000', '500', '50 shown'], { label: 'Candidates surviving each stage', hl: { 3: 'g' } })}
  <p><b>Three kinds of metric</b> - name all three: <b>offline ML metrics</b> (AUC, NDCG) tell you if the model learned; <b>online product metrics</b> (CTR, sessions, revenue, fraud loss) tell you if the business improved; <b>guardrails</b> (latency, report rate, creator diversity, complaints) tell you that you did not break something else.</p>`,
  clues: ['"Design a system that recommends / ranks / predicts ..." -> run the 8-step framework, start with clarifying questions', '"Millions of items, 100 ms latency" -> multi-stage funnel: candidate generation then ranking', '"What metric would you use?" -> give offline metric, online metric AND a guardrail', '"Labels are delayed / noisy / rare" -> talk about label source, delay, imbalance before the model', '"How would you know it works in production?" -> A/B test, ramp, monitoring, drift, feedback loops', '"Model performs well offline but not online" -> training-serving skew, leakage, feedback loop, metric mismatch'],
  code: [{ lang: 'python', code: PY.funnel, run: true, title: 'Funnel back-of-envelope: QPS and per-stage latency budget (runnable)' }],
  codeTitle: ['Funnel sizing'],
  viz: {
    title: 'The 8-step framework as an ML pipeline',
    input: 'feed',
    inputLabel: 'Product: feed, search, ads, fraud or moderation',
    gen: function (input) {
      var p = String(input).trim().toLowerCase();
      var M = {
        feed: ['time well spent', 'p(like), E[watch]', 'clicks, watch, hides', 'NDCG / AUC', 'sessions, retention'],
        search: ['successful searches', 'relevance grade', 'clicks + human ratings', 'NDCG@10', 'success rate, zero-result rate'],
        ads: ['revenue + advertiser ROI', 'p(click) calibrated', 'clicks on impressions', 'log loss, AUC', 'revenue, CTR, ad load'],
        fraud: ['fraud $ lost', 'p(fraud)', 'chargebacks (30-90 d late)', 'recall at fixed FPR', '$ loss, decline rate'],
        moderation: ['harmful views prevented', 'p(violates policy X)', 'reviewer decisions', 'precision/recall per policy', 'prevalence, appeals']
      };
      if (!M[p]) throw new Error('Type one of: feed, search, ads, fraud, moderation');
      var m = M[p];
      var nodes = [box('C', 'Clarify', 8, 10, 14), box('F', 'Frame', 30, 10, 14), box('D', 'Data+labels', 54, 10, 18), box('X', 'Features', 80, 10, 16),
        box('M', 'Model', 80, 45, 14), box('O', 'Offline eval', 54, 45, 18), box('A', 'Online A/B', 30, 45, 16), box('S', 'Monitor', 8, 45, 14)];
      var edges = [['C', 'F'], ['F', 'D'], ['D', 'X'], ['X', 'M'], ['M', 'O'], ['O', 'A'], ['A', 'S'], ['S', 'D', 'feedback']];
      return flowFrames('ML design loop for: ' + p, nodes, edges, [
        ['Eight boxes, one loop. We will walk them for <b>' + p + '</b>. Notice the last arrow goes back to data: production systems retrain on what they themselves caused.', {}, {}],
        ['<b>Clarify.</b> Ask scale, latency, surfaces and the business goal. Here the goal is: <b>' + m[0] + '</b>.', { C: 'cur' }, {}, { C: 'goal' }],
        ['<b>Frame.</b> Turn the goal into something a model can predict: <b>' + m[1] + '</b>. A good framing is measurable per item and correlates with the goal.', { C: 'done', F: 'cur' }, { 'C-F': 'ok' }, { F: m[1] }],
        ['<b>Data + labels.</b> Labels come from <b>' + m[2] + '</b>. Always ask: how delayed, how noisy, how imbalanced, and could it leak the future?', { F: 'done', D: 'cur' }, { 'F-D': 'ok' }, { D: 'labels' }],
        ['<b>Features.</b> User, item, context and cross features. Decide which must be fresh (seconds) and which can be daily batch.', { D: 'done', X: 'cur' }, { 'D-X': 'ok' }],
        ['<b>Model.</b> Baseline first (popularity, logistic regression, GBDT), then the funnel: retrieval -> ranking -> re-ranking.', { X: 'done', M: 'cur' }, { 'X-M': 'ok' }],
        ['<b>Offline eval.</b> On a <i>time-based</i> holdout, measure <b>' + m[3] + '</b>.', { M: 'done', O: 'cur' }, { 'M-O': 'ok' }, { O: m[3] }],
        ['<b>Online A/B.</b> Offline wins are only hypotheses. Ship to 1-5% of traffic and watch <b>' + m[4] + '</b> plus latency and guardrails.', { O: 'done', A: 'cur' }, { 'O-A': 'ok' }, { A: m[4] }],
        ['<b>Monitor + feedback.</b> Watch drift, data pipeline health and calibration. New interactions become new labels: the loop closes. Beware the model only learning from what it chose to show.', { A: 'done', S: 'sel', D: 'win' }, { 'A-S': 'ok', 'S-D': 'bad' }, { S: 'drift, retrain' }]
      ], 60);
    }
  },
  examples: [
    { title: 'Framing the objective: why not just "maximise clicks"?', html: `<p>Optimising pure CTR on a feed rewards clickbait: users click, feel cheated, and leave next week. Better: a <b>weighted multi-task objective</b> such as <code>1·p(click) + 4·p(like) + 2·E[watch min] − 20·p(hide)</code>, tuned with A/B tests against <b>long-term retention</b>. Say this out loud: it is the most common senior signal.</p>` },
    { title: 'Run the funnel numbers', html: `<p>Press ▶ above. 50M DAU × 6 sessions ≈ <b>3,500 QPS average, ~10,400 peak</b>. The heavy ranker scores 500 items per request -> about <b>5.2M model inferences per second</b> at peak. That single number is what sizes your GPU fleet and why the heavy stage is limited to hundreds, not thousands, of items.</p>` },
    { title: 'Time-based split vs random split', html: `${H.table(['Split', 'What happens', 'Verdict'], [['Random rows', 'Tomorrow\'s clicks leak into training for today\'s rows; features like "item total clicks" include the future', H.c('r', 'Inflated offline metrics')], ['Train on days 1-27, test on 28-30', 'Mimics production: train on past, predict future', H.c('g', 'Honest')]])}` },
    { title: 'Baselines you should always name', html: `<p>Feed: most-popular in your region. Search: BM25. Ads: historical CTR per ad smoothed with a prior. Fraud: hand rules ("new card + foreign IP + &gt; $500"). Moderation: hash-matching of known bad content. A fancy model must beat these, and the baseline is your fallback when the model service is down.</p>` }
  ],
  deepDive: `<p><b>Training-serving skew.</b> The #1 production bug: a feature is computed one way in the offline Spark job and another way in the online service (different time windows, timezone, default for missing). Fixes: a <b>feature store</b> that serves the same definitions online and offline, <b>point-in-time correct joins</b> (only feature values that existed at prediction time), and <b>logging features at serving time</b> so training uses exactly what the model saw.</p>
  <p><b>Label delay and attribution.</b> Clicks arrive in seconds, purchases in days, chargebacks in up to 90+ days. Decide an attribution window, and either wait (stale model) or train on partial labels with corrections. Streaming systems often train continuously on fast labels and periodically fix with late ones.</p>
  <p><b>Feedback loops.</b> The model chooses what users see, and users can only click what they see. Over time the data reflects the model, not the world (<b>exposure bias</b>, rich-get-richer popularity). Mitigations: reserve a little traffic for <b>exploration</b> (epsilon-greedy, Thompson sampling), log the <b>propensity</b> (probability the item was shown) and use inverse-propensity weighting, and add position as a training feature that is fixed at serving.</p>
  <p><b>Scale levers.</b> Precompute item embeddings, cache user embeddings for minutes, use ANN indexes (HNSW, IVF-PQ), distil a heavy ranker into a lighter one, quantise to int8, batch inference on GPUs, and cap stage sizes from the latency budget.</p>
  <p><b>Retraining cadence.</b> Ads and fraud drift in hours (new campaigns, new attacks) -> online/continuous training. Feed: daily retrain plus real-time features. Moderation: retrain when policy changes, with fresh human labels.</p>`,
  aiEra: `<p><b>What AI changes:</b> in 2026, LLMs appear inside these classic systems instead of replacing them: LLM-generated item descriptions and embeddings as features, LLM-as-rater to create relevance labels cheaply, generative retrieval experiments (semantic IDs), and LLM classifiers for moderation of long-tail policies. The funnel, the metrics and the feedback-loop thinking stay the same.</p>
  <p><b>Use AI as a partner:</b> ask it <code>List label sources, leakage risks and guardrail metrics for a fraud model</code>, or <code>Critique my offline/online metric choice</code>. It is good at checklists.</p>
  <p><b>Where AI goes wrong:</b> it jumps to "use a transformer" without a baseline, forgets latency budgets, suggests random splits, and ignores label delay. It rarely mentions calibration or exploration.</p>
  <p><b>What you must own:</b> the framing (what exactly is the label?), the numbers, and the trade-offs. Interviewers want to hear you choose and justify, not list.</p>`,
  problems: [{
    title: 'Frame "increase engagement on our video app" as an ML problem',
    level: 'Medium', tags: ['framework', 'framing'], companies: ['Meta', 'TikTok', 'YouTube'],
    statement: `<p>The PM says: "Use ML to increase engagement on the home feed." Turn this into an ML problem: objective, label(s), offline metric, online metric and two guardrails.</p>`,
    constraints: `200M DAU; feed must render in under 200 ms; creators complain about unfair exposure.`,
    example: `<p>A strong answer names a multi-task objective, a time-split offline metric (AUC per head, NDCG), an online metric (daily active minutes / 7-day retention) and guardrails (hide/report rate, creator coverage, p99 latency).</p>`,
    brute: { why: `<p>Weak framing: "predict clicks and sort by p(click)". It optimises clickbait, ignores dissatisfaction signals, has no long-term metric, and says nothing about creators or latency.</p>` },
    mcq: { q: 'Which is the best primary online metric for a feed ranking A/B test?', options: ['Long-term engagement such as 7-day retention or daily active minutes', 'Offline AUC', 'Number of items in the candidate pool', 'Model training loss'], answer: 0, explain: 'Offline metrics are proxies; the A/B test should measure the business outcome, with guardrails.' },
    hints: [`<p>Hint 1: "engagement" is vague - list concrete user actions you can log per item (click, like, watch time, share, hide).</p>`, `<p>Hint 2: predict several of them with one multi-task model and blend them with weights.</p>`, `<p>Hint 3: pair every offline metric with an online metric and add guardrails for the side effects you fear (clickbait, creator concentration, latency).</p>`],
    solution: {
      approach: `<p><b>Objective:</b> maximise long-term satisfying engagement. <b>Labels per (user, item) impression:</b> click, like, share, watch fraction/seconds, hide/report (negative). <b>Model:</b> multi-task ranker with one head per label; final score = weighted sum (weights tuned via online experiments against retention). <b>Offline:</b> per-head AUC/log loss on a time-split holdout; NDCG of the blended ranking on held-out sessions. <b>Online:</b> A/B test on daily active minutes and 7-day retention. <b>Guardrails:</b> hide/report rate, share of impressions to new or small creators, content diversity, p99 latency under 200 ms, integrity metrics. <b>Pitfalls:</b> feedback loops (reserve exploration traffic), position bias (position feature at training, fixed at serving), novelty effects in short tests (run 2+ weeks).</p>`,
      complexity: `<p>Online cost is dominated by the heavy ranker: items scored per request × QPS.</p>`,
      followUps: ['How would you choose the head weights?', 'How do you measure long-term effects in a 2-week test?']
    }
  }]
});
topics.push({
  title: 'Case Study: Recommendation Feed (Two-Tower Retrieval + Ranking)',
  analogy: `<p>A huge library with 10 million books and one librarian who has 0.2 seconds per visitor. First, assistants grab a few thousand books from the shelves that "people like you" read (<b>candidate generation</b>). A junior librarian skims them down to a few hundred (<b>light ranking</b>). The head librarian carefully orders the best few hundred (<b>heavy ranking</b>). Finally, she makes sure the top shelf is not ten books by the same author (<b>re-ranking</b>).</p>`,
  explain: `<p>🟢 <b>Goal:</b> show each user a personalised, ordered feed (videos, posts, products) from a catalogue of millions, in under ~200 ms.</p>
  <p><b>Stage 1 - candidate generation (recall matters).</b> Several cheap <i>sources</i> run in parallel and are merged: a <b>two-tower model</b> (embedding retrieval), "items similar to what you just engaged with" (item-to-item co-engagement), follow graph / subscriptions, trending in your region, and fresh items (so new content gets a chance). Each returns hundreds to a few thousand ids.</p>
  <p><b>The two-tower model.</b> A <b>user tower</b> turns user features (history, demographics, context) into a vector <i>u</i>; an <b>item tower</b> turns item features (id, text, creator, category) into a vector <i>v</i>. Score = <code>u · v</code>. Because the towers never look at each other, every item vector can be <b>precomputed</b> and put into an approximate-nearest-neighbour (ANN) index. Online you compute only one user vector and ask the index for the top-k: about log N work instead of N.</p>
  ${H.table(['Piece', 'Computed', 'Stored where'], [['Item embeddings', 'Batch, hourly/daily + on upload', 'ANN index (HNSW / IVF-PQ / ScaNN)'], ['User embedding', 'Online per request (or cached minutes)', 'Not stored, or short cache'], ['Score', 'u · v (dot product / cosine)', '-']])}
  <p><b>Training the towers:</b> positives = (user, item engaged). Negatives = other items in the same batch (<b>in-batch negatives</b>, with a correction for popular items appearing more often), plus some random or hard negatives. Loss = softmax over the batch.</p>
  <p><b>Stage 2-3 - ranking (precision matters).</b> Now only hundreds of items, so a richer model can use <b>cross features</b> the towers cannot see (user × item interactions, e.g. "user watched 3 videos from this creator today"). Typical: a deep multi-task network (DLRM / DCN / MMoE-style) predicting p(click), p(like), E[watch time], p(hide) at once.</p>
  <p><b>Stage 4 - re-ranking.</b> Blend heads into one value score, then apply business logic: diversity (no 5 in a row from one creator), freshness boosts, de-duplication, integrity filters, ad slots.</p>`,
  clues: ['"Recommend from millions of items in &lt; 200 ms" -> candidate generation (two-tower + ANN) then ranking', '"Cold-start new items / new users" -> content features in the item tower, fresh-item source, exploration', '"Users see too much of the same thing" -> re-ranking with diversity (MMR / author penalty)', '"Optimise engagement but avoid clickbait" -> multi-task heads incl. negative feedback (hide/report)', '"Why not one big model over everything?" -> latency: precompute item vectors, ANN is ~log N', '"Feed gets stale / popular items dominate" -> feedback loop, popularity bias correction, exploration'],
  code: [{ lang: 'python', code: PY.twotower, run: true, title: 'Two-tower dot-product retrieval over toy vectors (runnable)' },
    { lang: 'python', code: PY.blend, run: true, title: 'Re-ranker: multi-head value blend + author diversity (runnable)' }],
  codeTitle: ['Two-tower retrieval', 'Value blend + diversity'],
  viz: {
    title: 'One feed request through the funnel',
    input: '10000000',
    inputLabel: 'Catalogue size (items)',
    gen: function (input) {
      var n = parseInt(String(input).replace(/[,_ ]/g, ''), 10);
      if (!(n >= 1000 && n <= 1e10)) throw new Error('Enter a catalogue size between 1,000 and 10,000,000,000');
      var nodes = [box('U', 'App', 6, 30, 10), box('FS', 'Feature store', 28, 52, 18), box('UT', 'User tower', 28, 8, 16), box('ANN', 'ANN index', 52, 8, 16),
        box('SRC', 'Other sources', 52, 30, 18), box('LR', 'Light ranker', 76, 8, 16), box('HR', 'Heavy ranker', 76, 30, 16), box('RR', 'Re-rank', 76, 52, 14)];
      var edges = [['U', 'UT'], ['UT', 'ANN'], ['ANN', 'LR'], ['SRC', 'LR'], ['FS', 'HR'], ['LR', 'HR'], ['HR', 'RR'], ['RR', 'U', 'feed']];
      var lg = Math.round(Math.log2(n));
      function bars(v, hl) { return { type: 'bars', label: 'items alive after each stage', values: v, idxLabels: ['catalogue', 'retrieved', 'light', 'heavy', 'shown'], texts: v.map(function (x) { return x.toLocaleString(); }), hl: hl || {} }; }
      var shown = [n, 2000, 500, 100, 20];
      var vis = shown.map(function (x) { return Math.round(Math.log10(x) * 10); });
      return flowFrames('Feed funnel', nodes, edges, [
        ['The app opens the feed. Catalogue: <b>' + n.toLocaleString() + '</b> items. Bars show log-scale counts of items alive at each stage.', { U: 'cur' }, {}, {}, [bars(vis, { 0: 'cur' })]],
        ['<b>User tower</b> runs once: user history + context -> a 64-256 dim vector. This is the only per-request embedding work.', { U: 'done', UT: 'cur' }, { 'U-UT': 'ok' }, { UT: 'u vector' }, [bars(vis, { 0: 'cur' })]],
        ['<b>ANN search</b> over precomputed item vectors: HNSW visits roughly log2(N) ≈ <b>' + lg + '</b> layers/hops of neighbours instead of scanning ' + n.toLocaleString() + ' items. Returns ~1,000 ids.', { UT: 'done', ANN: 'cur' }, { 'UT-ANN': 'ok' }, { ANN: 'top 1k' }, [bars(vis, { 1: 'cur' })]],
        ['<b>Other sources</b> in parallel: follows, item-to-item, trending, fresh uploads. Merged and de-duplicated to ~2,000 candidates.', { ANN: 'done', SRC: 'cur' }, { 'SRC-LR': 'ok', 'ANN-LR': 'ok' }, { SRC: '+1k' }, [bars(vis, { 1: 'ok' })]],
        ['<b>Light ranker</b>: a small model (GBDT or tiny MLP, maybe a distilled copy of the heavy ranker) cuts 2,000 to 500 cheaply.', { SRC: 'done', LR: 'cur' }, { 'LR-HR': 'ok' }, { LR: '500' }, [bars(vis, { 2: 'cur' })]],
        ['<b>Heavy ranker</b>: multi-task deep net with cross features from the <b>feature store</b> (fresh counts, user-creator affinity). Predicts p(click), p(like), E[watch], p(hide).', { LR: 'done', HR: 'cur', FS: 'win' }, { 'FS-HR': 'ok' }, { HR: '4 heads' }, [bars(vis, { 3: 'cur' })]],
        ['<b>Re-rank</b>: blend heads into one value, apply diversity, freshness, integrity filters, insert ads. Keep top ~20 for the first screen.', { HR: 'done', RR: 'cur' }, { 'HR-RR': 'ok' }, { RR: 'top 20' }, [bars(vis, { 4: 'ok' })]],
        ['The feed is returned. Impressions, clicks, watch time and hides are <b>logged with the features used</b> -> tomorrow\'s training data. This is the feedback loop.', { RR: 'done', U: 'sel' }, { 'RR-U': 'ok' }, { U: 'logs events' }, [bars(vis, { 4: 'sel' })]]
      ], 62);
    }
  },
  examples: [
    { title: 'Run the two-tower demo', html: `<p>Press ▶ on the first snippet. The sports fan's vector points toward "football highlights", "marathon training" and "tennis final"; the home cook's toward "pasta recipe" and "baking bread". Notice the item vectors were built <b>once</b> - only the user vector is computed per request. That separation is the whole reason two-tower models scale.</p>` },
    { title: 'Run the re-ranker blend', html: `<p>Press ▶ on the second snippet. Clickbait <code>v3</code> has the highest p(click) (0.45) but its p(hide) 0.04 × weight 20 = −0.8 drags it to the bottom. Then the diversity pass stops alice from taking three of the top four slots.</p>${H.table(['Item', 'click', 'like×4', 'watch×2/60', '−hide×20', 'value'], [['v4', '0.20', '0.32', '3.00', '−0.04', H.c('g', '3.48')], ['v3', '0.45', '0.04', '0.33', '−0.80', H.c('r', '0.02')]])}` },
    { title: 'Cold start: brand-new video, zero clicks', html: `<p>An ID embedding for a new item is random noise. Fix: the item tower also uses <b>content features</b> (title text embedding, thumbnail embedding, creator, category) so a new video lands near similar ones immediately. Add a <b>fresh-content source</b> and a small exploration budget (e.g. guarantee 100-1,000 impressions) to collect first signals. New users: onboarding topic picks, location, device, and popular-in-region.</p>` },
    { title: 'Why the ranker beats the towers on the same pair', html: `<p>Two-tower: "user likes cooking" · "item is cooking" -> high score. But the user already watched this exact recipe yesterday, and it is 3 am (they watch short clips at night). Only a model that sees <b>user × item × context</b> features together (watched-before, hour × length) can catch this. That is why retrieval is cheap and approximate, ranking is expensive and precise.</p>` }
  ],
  deepDive: `<p><b>Negative sampling bias.</b> With in-batch negatives, popular items appear as negatives more often and get pushed down unfairly. Standard fix: <b>logQ correction</b> - subtract log(sampling probability of the item) from the logit during training. Mix in uniformly sampled negatives too.</p>
  <p><b>ANN trade-offs.</b> HNSW: high recall, fast, memory-heavy. IVF-PQ: compresses vectors (e.g. 256 floats -> 32 bytes), fits billions in RAM, small recall loss. Measure <b>ANN recall@k against exact search</b> on a sample; target 95%+. Re-index item vectors on a schedule and upsert new items in near-real time.</p>
  <p><b>Multi-task ranking.</b> Shared bottom layers + per-task heads; MMoE / PLE use gated experts so conflicting tasks (click vs long watch) do not hurt each other. Watch-time labels are skewed by video length - predict watch fraction or use weighted logistic regression.</p>
  <p><b>Position bias.</b> Items at the top get clicked partly because they are at the top. Add position as a feature during training (or a separate shallow "position tower") and set it to a fixed value at serving; or use randomised experiments to estimate propensities.</p>
  <p><b>Real-time features.</b> "Items watched in this session" changes within seconds and is often the strongest signal. Stream events (Kafka -> Flink) into the online feature store; keep the same definitions for training via logged features.</p>
  <p><b>Long-term objectives.</b> Engagement heads optimise the next click. Teams add satisfaction surveys, "would you like to see more" labels, and retention-correlated weights to avoid an addictive-but-unhappy feed.</p>`,
  aiEra: `<p><b>What AI changes:</b> 2024-2026 brought <b>generative recommenders</b> (sequence models over user action histories, e.g. Meta's HSTU-style work) and <b>semantic IDs</b> (items encoded as token sequences so a model can "generate" the next item). LLMs also write item summaries that feed the item tower, and help with cold start by understanding content on day zero. In most production stacks they still sit inside the funnel rather than replace it, because of cost per request.</p>
  <p><b>Use AI as a partner:</b> <code>Given these logged events, propose ranking heads and how to blend them</code>, or <code>What biases does in-batch negative sampling introduce?</code></p>
  <p><b>Where AI goes wrong:</b> it proposes running an LLM over every item for every user (impossible at 10k QPS), forgets position bias, and treats watch time without length normalisation.</p>
  <p><b>You own:</b> the latency budget per stage, the objective weights and the guardrails.</p>`,
  problems: [{
    title: 'Design the candidate generation layer for a short-video feed',
    level: 'Hard', tags: ['recommendation', 'two-tower', 'ANN'], companies: ['TikTok', 'YouTube', 'Instagram'],
    statement: `<p>500M videos, 1B users, 150k peak feed requests/s. Design candidate generation that returns ~2,000 diverse candidates within 40 ms, including for videos uploaded 5 minutes ago.</p>`,
    constraints: `40 ms p99 for retrieval; new videos must be retrievable within minutes; memory per index shard ≤ 256 GB.`,
    example: `<p>Expected: multiple sources (two-tower ANN, item-to-item, follows, trending, fresh), each with a quota, merged and deduped; item vectors compressed and sharded; near-real-time upsert for new uploads.</p>`,
    brute: { why: `<p>Naive: score all 500M videos with the ranking model per request. 500M × 150k/s = 7.5×10<sup>13</sup> inferences per second - impossible. Even a single-source two-tower retrieval would make the feed one-dimensional and miss fresh videos.</p>` },
    mcq: { q: 'Why can item embeddings be precomputed in a two-tower model?', options: ['The item tower does not depend on the user', 'Items never change', 'The ANN index requires it', 'Dot products are cheap'], answer: 0, explain: 'The towers interact only through the final dot product, so item vectors are independent of who is asking.' },
    hints: [`<p>Hint 1: do not rely on one source - think of 4-5 cheap generators with quotas, merged.</p>`, `<p>Hint 2: size the index: 500M × 128 floats × 4 B = 256 GB raw; compress (PQ/int8) and shard.</p>`, `<p>Hint 3: fresh videos: embed on upload with the item tower (content features), upsert into a small real-time index queried alongside the main one.</p>`],
    solution: {
      approach: `<p><b>Sources:</b> (1) two-tower ANN (≈800), (2) item-to-item from the last 10 engaged videos via precomputed co-engagement neighbours (≈500), (3) followed creators' recent uploads (≈300), (4) trending in region/language (≈200), (5) fresh/exploration pool (≈200). Run in parallel, union, dedupe, drop already-watched (Bloom filter per user), cap per creator. <b>Index sizing:</b> 500M × 128 dims × 4 bytes = 256 GB raw; product quantisation to 32 bytes/vector ≈ 16 GB, shard by item id across N shards with replicas for QPS; query fans out to shards and merges top-k (or use partitioned IVF where the query probes only nearest clusters). <b>Freshness:</b> upload event -> item tower on content features (title/audio/visual embeddings, creator) -> upsert into a small in-memory "fresh" HNSW index within minutes; nightly rebuild merges into the main index. <b>User vector:</b> computed per request from the online feature store (recent watches), cached ~1 min. <b>Quality:</b> offline recall@2000 of the items the user later engaged with, per source; online A/B on watch time and retention, guardrail on creator coverage. <b>Latency:</b> user tower 5 ms + ANN 10-15 ms + merges - fits 40 ms with tail-tolerant fan-out (hedged requests, partial results on timeout).</p>`,
      complexity: `<p>ANN query ≈ O(log N) per shard; memory O(N × bytes per compressed vector).</p>`,
      followUps: ['How do you evaluate each source\'s contribution?', 'How would you retrain the towers without re-embedding all 500M items daily?']
    }
  }]
});
topics.push({
  title: 'Case Study: Search Ranking (Retrieval, Learning to Rank, NDCG)',
  analogy: `<p>Asking a shop assistant "red running shoes size 9". A recommender guesses what you might like with no question asked; search has a <b>question</b>, so the first job is <b>understanding it</b> (red = colour, running = category, 9 = size), then fetching everything that might match, then ordering so the best match is <b>first</b> - because almost nobody looks at page 2.</p>`,
  explain: `<p>🟢 <b>Goal:</b> given a query (and the user), return a ranked list where the most relevant results are at the top. The difference from a feed: there is explicit <b>intent</b>, and <b>relevance</b> to the query dominates personalisation.</p>
  <p><b>Pipeline:</b></p>
  <ol><li><b>Query understanding</b> - spell correction, tokenisation, synonyms/expansion, entity and attribute extraction ("size 9"), intent classification (navigational vs exploratory), language.</li>
  <li><b>Retrieval (recall)</b> - <b>lexical</b> via an inverted index with BM25 (exact terms, part numbers, names) plus <b>semantic</b> via embeddings + ANN (paraphrases, "sneakers" = "trainers"). Union them = <b>hybrid retrieval</b>, ~1,000 docs.</li>
  <li><b>Ranking (precision)</b> - <b>learning to rank (LTR)</b>: a GBDT (LambdaMART) or neural ranker over features like BM25 score, embedding similarity, field matches (title vs body), document quality, freshness, popularity, personal signals. A <b>cross-encoder</b> (query and doc read together by a transformer) re-scores the top ~50-100 because it is accurate but slow.</li>
  <li><b>Re-rank / blend</b> - dedupe, diversify intents for ambiguous queries ("jaguar"), business rules, merge verticals (images, news).</li></ol>
  <p><b>Three LTR loss families:</b> <b>pointwise</b> (predict relevance of each doc alone - regression/classification), <b>pairwise</b> (learn doc A &gt; doc B - RankNet), <b>listwise</b> (optimise a list metric like NDCG directly - LambdaMART, softmax losses). Listwise/lambda methods usually win for ranking quality.</p>
  <p><b>Labels:</b> human relevance grades (0-3 or 0-4, expensive, high quality, the "gold set") plus <b>click logs</b> (cheap, huge, but biased by position and presentation). LLM-as-rater now fills the gap between the two, calibrated against human grades.</p>
  <p><b>Metrics:</b> offline - <b>NDCG@k</b> (graded, position-discounted), <b>MRR</b> (where is the first good result?), <b>recall@k</b> for the retrieval stage. Online - search success rate (click with long dwell, no reformulation), time to success, <b>zero-result rate</b>, abandonment, reformulation rate.</p>`,
  clues: ['"Design search for an e-commerce site / app store / docs" -> query understanding, hybrid retrieval, LTR, NDCG', '"Users search part numbers and exact names" -> keep lexical BM25 alongside embeddings', '"Synonyms / paraphrases fail" -> semantic (embedding) retrieval or query expansion', '"Evaluate ranking quality" -> NDCG@k with graded labels, MRR, recall@k for retrieval', '"Clicks are biased" -> position bias, click models, interleaving, human-graded gold set', '"Ambiguous query" -> intent diversification in re-ranking'],
  code: [{ lang: 'python', code: PY.ndcg, run: true, title: 'recall@k, precision@k, MRR and NDCG@k from scratch (runnable)' }],
  codeTitle: ['Ranking metrics'],
  viz: {
    title: 'Computing NDCG@k step by step',
    input: '3,0,2,1,0',
    inputLabel: 'Relevance grades of your ranked results, top first (0-3)',
    gen: function (input) {
      var g = String(input).split(/[\s,]+/).filter(Boolean).map(Number);
      if (!g.length || g.length > 10 || g.some(function (x) { return !(x >= 0 && x <= 4) || Math.floor(x) !== x; })) throw new Error('Enter 1-10 integer grades from 0 to 4, e.g. 3,0,2,1,0');
      var f = [], dcg = 0, rows = [];
      f.push({ narr: 'Your ranked list has grades <b>' + g.join(', ') + '</b> (3 = perfect, 0 = irrelevant). NDCG asks: how close is this order to the best possible order?', parts: [{ type: 'bars', label: 'grade by position', values: g, idxLabels: g.map(function (_, i) { return '#' + (i + 1); }) }] });
      g.forEach(function (x, i) {
        var gain = Math.pow(2, x) - 1, disc = Math.log2(i + 2), c = gain / disc;
        dcg += c;
        rows.push(['#' + (i + 1), String(x), String(gain), disc.toFixed(3), c.toFixed(3), dcg.toFixed(3)]);
        var hl = {}; hl[i] = 'cur';
        f.push({ narr: 'Position <b>' + (i + 1) + '</b>: gain = 2<sup>' + x + '</sup> − 1 = ' + gain + ', discount = log2(' + (i + 2) + ') = ' + disc.toFixed(2) + '. Lower positions are divided by bigger numbers, so a good doc at #1 is worth more than at #5.', parts: [{ type: 'bars', label: 'grade by position', values: g, hl: hl }, { type: 'table', label: 'DCG so far', columns: ['pos', 'grade', 'gain', 'discount', 'contrib', 'DCG'], rows: rows.slice() }] });
      });
      var ideal = g.slice().sort(function (a, b) { return b - a; }), idcg = 0;
      ideal.forEach(function (x, i) { idcg += (Math.pow(2, x) - 1) / Math.log2(i + 2); });
      f.push({ narr: 'The <b>ideal</b> order sorts the same grades descending: ' + ideal.join(', ') + '. Its DCG (IDCG) = <b>' + idcg.toFixed(3) + '</b>.', parts: [{ type: 'bars', label: 'ideal order', values: ideal, hl: { 0: 'ok' } }] });
      var nd = idcg ? dcg / idcg : 0;
      f.push({ narr: 'NDCG = DCG / IDCG = ' + dcg.toFixed(3) + ' / ' + idcg.toFixed(3) + ' = <b>' + nd.toFixed(3) + '</b>. 1.0 means perfectly ordered. Try moving the 3 to the end and watch it drop.', parts: [{ type: 'vars', label: 'result', vals: { DCG: dcg.toFixed(3), IDCG: idcg.toFixed(3), NDCG: nd.toFixed(3) }, hl: { NDCG: nd > 0.9 ? 'ok' : 'cur' } }] });
      return f;
    }
  },
  examples: [
    { title: 'Run the metrics', html: `<p>Press ▶. Model A puts d4 and d1 (grades 2 and 3) at the top: NDCG@5 ≈ 0.84, MRR = 1. Model B starts with two irrelevant docs: MRR drops to 0.33, recall@3 to 0.33 and NDCG@5 to ≈ 0.55, even though recall@5 is 1.0 for both. <b>Recall</b> says "did we find them?"; <b>NDCG</b> says "did we put them on top?". Use recall for retrieval, NDCG for ranking.</p>` },
    { title: 'Hybrid retrieval in one table', html: `${H.table(['Query', 'BM25 alone', 'Embeddings alone', 'Hybrid'], [['"SKU 88-1043B"', H.c('g', 'exact hit'), H.c('r', 'fuzzy neighbours'), H.c('g', 'hit')], ['"comfy shoes for standing all day"', H.c('r', 'needs exact words'), H.c('g', 'finds "cushioned work sneakers"'), H.c('g', 'hit')], ['"iphone 15 case"', 'ok', 'may return iphone 14 cases', H.c('g', 'best of both')]])}<p>Merge with reciprocal rank fusion or let the LTR model see both scores as features.</p>` },
    { title: 'Turning clicks into labels without fooling yourself', html: `<p>Raw rule "clicked = relevant" breaks: result #1 gets ~30% clicks, #5 ~5%, regardless of quality. Better signals: <b>long click</b> (dwell &gt; 30 s, or add-to-cart), <b>skip-above</b> (user skipped #1 and clicked #3 -> #3 &gt; #1 pairwise preference), and position-debiased click models. Keep a human-graded gold set to sanity-check.</p>` },
    { title: 'Interleaving for faster online tests', html: `<p>Instead of A/B splitting users, show each user one list that <b>interleaves</b> results from rankers A and B (team-draft). Whichever ranker's results get more clicks wins. Interleaving needs far less traffic (often 10-100× fewer queries) to detect a ranking difference, but it measures preference, not business metrics - confirm the winner with a normal A/B test.</p>` }
  ],
  deepDive: `<p><b>Cross-encoder vs bi-encoder.</b> A bi-encoder embeds query and doc separately (fast, precomputable, used for retrieval). A cross-encoder reads "[query] [SEP] [doc]" together, letting attention compare every word pair - far more accurate but O(docs) transformer calls per query, so only top 50-100. Distil the cross-encoder into the bi-encoder to improve retrieval.</p>
  <p><b>LambdaMART.</b> Gradient-boosted trees where each pair's gradient is scaled by how much swapping the two docs would change NDCG ("lambda"). Still a strong, cheap baseline in 2026 for feature-rich ranking, often combined with neural features.</p>
  <p><b>Query-dependent vs independent features.</b> Independent (doc quality, popularity, freshness) can be precomputed per doc; dependent (BM25, embedding similarity, field match) must be computed per query - keep them cheap or restrict to top candidates.</p>
  <p><b>Tail queries.</b> Most distinct queries are rare (long tail). No click history -> rely on semantic retrieval, query rewriting to head queries, and content features. Evaluate head and tail separately; averages hide tail failures.</p>
  <p><b>Index freshness and scale.</b> Inverted index sharded by document, replicated for QPS; near-real-time segments for new docs (Lucene-style). Price/stock changes go to a fast attribute store rather than re-indexing text.</p>
  <p><b>Zero results.</b> Track zero-result rate; fall back to relaxed matching (drop least important term), spell correction, or semantic retrieval.</p>`,
  aiEra: `<p><b>What AI changes:</b> search now often ends in a <b>generated answer</b> (RAG) on top of the ranked list - so retrieval quality (recall@k) directly caps answer quality. LLMs do query rewriting and expansion, act as relevance raters to produce graded labels at scale, and power cross-encoder re-rankers. Classic LTR + BM25 stays because it is cheap, explainable and handles exact matches.</p>
  <p><b>Use AI as a partner:</b> <code>Generate 200 realistic tail queries for a hardware store and grade these results 0-3</code> - then spot-check with humans and measure agreement.</p>
  <p><b>Where AI goes wrong:</b> LLM raters favour long, fluent docs and the first doc shown; they can be inconsistent across prompts. Embedding-only search misses SKUs and names.</p>
  <p><b>You own:</b> the metric choice, label quality audits, and the latency budget for heavy re-rankers.</p>`,
  problems: [{
    title: 'Design product search for an e-commerce marketplace',
    level: 'Hard', tags: ['search', 'learning to rank'], companies: ['Amazon', 'eBay', 'Shopify'],
    statement: `<p>100M products, 20k queries/s at peak, p99 300 ms. Many queries contain brand names and model numbers; many are vague ("gift for dad"). Design the ranking system and how you will evaluate it.</p>`,
    constraints: `Sellers update price/stock every minute; new products must be searchable within 10 minutes.`,
    example: `<p>Expected: query understanding, hybrid retrieval (BM25 + embeddings), LTR ranker with business features, cross-encoder on the top results, graded labels + click logs, NDCG offline, conversion-based online metrics.</p>`,
    brute: { why: `<p>Naive: sort BM25 matches by sales count. Fails vague queries (no term overlap), promotes best-sellers that do not match intent, ignores price/stock, and has no way to learn from clicks or purchases.</p>` },
    mcq: { q: 'Which offline metric best fits graded relevance where the top positions matter most?', options: ['NDCG@10', 'Accuracy', 'Recall@1000', 'Mean squared error of prices'], answer: 0, explain: 'NDCG handles graded labels and discounts lower positions.' },
    hints: [`<p>Hint 1: split query understanding, retrieval (recall) and ranking (precision) - each has its own metric.</p>`, `<p>Hint 2: use two retrieval sources because SKUs and vague intents need different tools.</p>`, `<p>Hint 3: for labels combine human grades with debiased purchase/click signals; evaluate head vs tail queries separately.</p>`],
    solution: {
      approach: `<p><b>Query understanding:</b> spell fix, attribute extraction (brand, size, colour, price), category classifier, query rewrite for vague queries. <b>Retrieval:</b> sharded inverted index (BM25 with field boosts on title/brand) + bi-encoder ANN over product embeddings; take top ~500 each, union with filters (in stock, ships to user). <b>Ranking:</b> LambdaMART or neural LTR with features: BM25 per field, embedding similarity, category match, price relative to query intent, rating, conversion rate (smoothed), freshness, seller quality, personal affinity; cross-encoder re-scores top 50. <b>Re-rank:</b> diversify brands for vague queries, dedupe variants, sponsored slots handled by the ads system. <b>Freshness:</b> price/stock in a fast attribute store joined at ranking time; new products via near-real-time index segments + on-upload embedding. <b>Labels:</b> human 0-3 grades on a stratified query sample (head/torso/tail) + purchases and long clicks with position debiasing. <b>Eval:</b> recall@500 for retrieval, NDCG@10 for ranking offline; online A/B on search conversion, revenue per search, zero-result rate, reformulation rate; interleaving for fast ranker comparison. Guardrails: latency p99, seller diversity.</p>`,
      complexity: `<p>Retrieval O(postings + log N ANN) per shard; ranking O(candidates × features); cross-encoder O(50 × transformer).</p>`,
      followUps: ['How would you handle a query in two languages?', 'How do you stop sellers from keyword-stuffing titles?']
    }
  }]
});
topics.push({
  title: 'Case Study: Ads Click-Through Rate (CTR) Prediction',
  analogy: `<p>A billboard owner auctions one slot every second. Advertiser A offers $5 per click, B offers $1 per click. Who should win? It depends on <b>how likely people are to actually click</b> each ad. If A's ad gets clicked 1 in 1,000 times and B's 1 in 50, B is worth more. The CTR model is the owner's crystal ball - and if the crystal ball is off by 2×, the owner charges the wrong price to everyone.</p>`,
  explain: `<p>🟢 <b>Goal:</b> for each (user, ad, context) predict <b>p(click)</b> (and often p(conversion | click)) so the ad auction can rank and price ads. Expected value per impression: <code>eCPM = bid × pCTR × 1000</code> (plus quality terms).</p>
  <p><b>Why ads differ from feed ranking:</b></p>
  <ul><li><b>Calibration matters, not just order.</b> The probability itself is multiplied by money. A model with great AUC but predictions 30% too high makes advertisers overpay, and the platform mis-prices auctions. Track <b>log loss</b> and <b>calibration ratio</b> (sum of predictions / actual clicks ≈ 1.0) per segment.</li>
  <li><b>Extreme imbalance.</b> CTRs are often 0.1-2%. Teams <b>downsample negatives</b> to train faster, then <b>re-calibrate</b>: <code>q = p / (p + (1 − p) / w)</code> where w is the negative sampling rate.</li>
  <li><b>Huge sparse features.</b> User id, ad id, advertiser, query, page, device, hour, plus <b>crosses</b> (user segment × ad category). Billions of sparse ids -> hashed embeddings.</li>
  <li><b>Fast drift.</b> New campaigns launch hourly; yesterday's model is stale -> <b>online / continuous training</b>.</li></ul>
  <p><b>Model progression to name:</b> logistic regression with hashed crosses (fast, calibrated, strong baseline) -> GBDT features + LR (Facebook 2014) -> factorisation machines / FFM (learn pairwise crosses) -> deep models: Wide & Deep, DeepFM, DCN-v2, DLRM-style (embeddings for sparse ids + MLP over interactions) -> sequence models over user behaviour (DIN-style attention over past clicks).</p>
  <p><b>Serving path:</b> ad request -> <b>targeting filter</b> (eligible ads: budget left, audience match, policy ok) -> candidate ads (thousands) -> light model -> CTR/CVR model -> <b>auction</b> (rank by eCPM, generalised second-price or first-price with pacing) -> serve -> log impression -> later join the click (attribution window) -> training stream.</p>`,
  clues: ['"Predict whether a user clicks an ad" -> binary classification, extreme imbalance, calibration', '"Auction / bid / eCPM" -> pCTR × bid; calibration errors move money', '"Billions of sparse features" -> hashed embeddings, FM/DeepFM/DCN, embedding tables', '"New campaigns every hour" -> online training, cold-start priors for new ads', '"We downsampled negatives" -> recalibrate predictions', '"Advertisers say they overpay" -> calibration per segment, not AUC'],
  code: [{ lang: 'python', code: PY.ctr, run: true, title: 'AUC vs log loss vs calibration, negative-sampling correction, eCPM ranking (runnable)' }],
  codeTitle: ['CTR metrics and auction'],
  viz: {
    title: 'An ad request: filter -> predict -> auction -> learn',
    input: '1.0',
    inputLabel: 'Calibration multiplier on the loans ad pCTR (1.0 = perfect, try 3)',
    gen: function (input) {
      var k = parseFloat(input);
      if (!(k > 0 && k <= 10)) throw new Error('Enter a multiplier between 0.1 and 10, e.g. 1.0 or 3');
      var ads = [['shoes', 2.0, 0.010], ['loans', 8.0, 0.002 * k], ['games', 0.5, 0.050]];
      var ranked = ads.slice().sort(function (a, b) { return b[1] * b[2] - a[1] * a[2]; });
      var rows = ranked.map(function (a) { return [a[0], '$' + a[1].toFixed(2), a[2].toFixed(4), '$' + (a[1] * a[2] * 1000).toFixed(2)]; });
      var nodes = [box('R', 'Ad request', 8, 30, 14), box('T', 'Targeting + budget', 32, 10, 20), box('M', 'CTR model', 32, 50, 16), box('FS', 'Features', 8, 55, 14),
        box('A', 'Auction', 58, 30, 14), box('L', 'Event log', 82, 10, 14), box('TR', 'Online trainer', 82, 50, 18)];
      var edges = [['R', 'T'], ['T', 'M'], ['FS', 'M'], ['M', 'A'], ['A', 'L', 'impression'], ['L', 'TR', 'join clicks'], ['TR', 'M', 'new weights']];
      var tbl = { type: 'table', label: 'Auction ranking by eCPM = bid × pCTR × 1000', columns: ['ad', 'bid', 'pCTR', 'eCPM'], rows: rows, hl: { 0: 'ok' } };
      return flowFrames('Ads CTR system', nodes, edges, [
        ['A page loads with an ad slot. The request carries user, page and device context.', { R: 'cur' }, {}],
        ['<b>Targeting</b> keeps only eligible ads: audience match, budget not exhausted (pacing), passes policy. Thousands of ads -> hundreds.', { R: 'done', T: 'cur' }, { 'R-T': 'ok' }, { T: 'eligible' }],
        ['<b>CTR model</b> scores each eligible ad with sparse id embeddings + crosses + user history. Output must be a <b>calibrated probability</b>.', { T: 'done', M: 'cur', FS: 'win' }, { 'T-M': 'ok', 'FS-M': 'ok' }, { M: 'pCTR' }],
        ['<b>Auction</b>: rank by eCPM. With loans pCTR multiplier <b>' + k + '</b>, winner = <b>' + ranked[0][0] + '</b>. ' + (ranked[0][0] === 'loans' && k > 1 ? '<span class="c-r">An over-predicted pCTR lets the loans ad win slots it does not deserve; the advertiser pays for clicks that never come.</span>' : 'With calibrated scores the truly most valuable ad wins.'), { M: 'done', A: 'cur' }, { 'M-A': 'ok' }, { A: ranked[0][0] }, [tbl]],
        ['The impression is <b>logged</b> with the exact features used. Clicks arrive seconds to minutes later.', { A: 'done', L: 'cur' }, { 'A-L': 'ok' }, {}, [tbl]],
        ['A streaming job <b>joins clicks to impressions</b> within an attribution window (e.g. 30 min for click, days for conversions) and trains the model continuously.', { L: 'done', TR: 'cur' }, { 'L-TR': 'ok' }, { TR: 'every few min' }],
        ['New weights are pushed to serving every few minutes or hours, so brand-new campaigns are learned quickly. Monitor calibration per advertiser and per slot after every push.', { TR: 'done', M: 'sel' }, { 'TR-M': 'ok' }, { M: 'fresh' }]
      ], 62);
    }
  },
  examples: [
    { title: 'Run the CTR snippet', html: `<p>Press ▶. The AUC (≈0.90) says the ordering is decent, but the calibration ratio of ≈1.12 says predictions sum to 12% more clicks than happened. In ads that is 12% mis-pricing. Then see the downsampling fix: a model trained with 10% of negatives outputs 0.30, but the true pCTR is only ≈0.041.</p>` },
    { title: 'eCPM ranking by hand', html: `${H.table(['Ad', 'Bid per click', 'pCTR', 'eCPM'], [['shoes', '$2.00', '1.0%', '$20'], ['loans', '$8.00', '0.2%', '$16'], ['games', '$0.50', '5.0%', H.c('g', '$25 (wins)')]])}<p>Cheap bid + high CTR beats expensive bid + low CTR. Doubling loans' pCTR by a calibration bug would make it $32 and steal the slot.</p>` },
    { title: 'Cold-start ad with zero history', html: `<p>Use a <b>hierarchical prior</b>: start from the advertiser's average CTR, then the category's, smoothed with Bayesian averaging <code>(clicks + α·prior) / (impressions + α)</code>. Content features (ad text and image embeddings) let the deep model generalise. Reserve a small exploration budget so new ads get impressions.</p>` },
    { title: 'Log loss vs AUC', html: `<p>Multiply every prediction by 2: AUC is <b>unchanged</b> (order is the same) but log loss gets worse and the auction mis-prices everything. That is why ads teams report <b>normalised entropy</b> / log loss and calibration, not just AUC.</p>` }
  ],
  deepDive: `<p><b>Embedding tables dominate.</b> Billions of sparse ids × 64 dims = terabytes. Techniques: hashing trick (collisions acceptable), frequency thresholds (rare ids share a bucket), mixed-dimension embeddings, sharded parameter servers or model-parallel embedding tables (DLRM/TorchRec style) with data-parallel MLPs.</p>
  <p><b>Delayed feedback.</b> A conversion may arrive days later. If you train immediately, recent impressions look like negatives that are actually future positives -> under-prediction. Fixes: wait window, importance weighting, or explicit delayed-feedback models; correct when the late label arrives.</p>
  <p><b>Calibration layer.</b> After the deep model, apply Platt scaling or isotonic regression per segment, retrained frequently; monitor predicted/observed ratio per advertiser, slot, country, device.</p>
  <p><b>Position and presentation bias.</b> The same ad in the top slot gets more clicks. Model position as a feature at training, set a fixed position at serving, and adjust auction by slot.</p>
  <p><b>Auction coupling.</b> pCTR feeds pricing (second-price: winner pays the minimum needed to beat the runner-up's eCPM). Model changes shift revenue and advertiser ROI; run budget-split A/B tests (split advertiser budgets too) to avoid interference between arms.</p>
  <p><b>Privacy shifts.</b> Third-party cookies and device ids are mostly gone; rely on first-party, contextual and aggregated/on-device signals.</p>`,
  aiEra: `<p><b>What AI changes:</b> LLMs and vision models generate ad creatives and summarise landing pages into content features; generative/sequence user models encode long behaviour histories; automated campaigns (advertiser sets a goal, the platform picks audiences and creatives) push more of the work into the platform's models. The core - calibrated pCTR inside an auction - is unchanged.</p>
  <p><b>Use AI as a partner:</b> <code>Explain why my AUC improved but revenue fell in the A/B test</code> - it will list calibration, auction dynamics, budget interference.</p>
  <p><b>Where AI goes wrong:</b> it proposes oversampling/SMOTE for CTR (distorts probabilities), forgets recalibration after downsampling, and evaluates with accuracy (99% by always predicting "no click").</p>
  <p><b>You own:</b> calibration monitoring, the attribution window, and the experiment design that respects the auction.</p>`,
  problems: [{
    title: 'Design CTR prediction for a social network ad system',
    level: 'Hard', tags: ['ads', 'CTR', 'calibration'], companies: ['Meta', 'Google', 'Pinterest'],
    statement: `<p>1M ad requests/s, ~500 eligible ads per request after targeting, 50 ms budget for scoring. Design the pCTR model, its training pipeline and evaluation.</p>`,
    constraints: `Average CTR 0.8%; 10B training impressions/day; thousands of new ads launch each hour.`,
    example: `<p>Expected: sparse+dense features, DLRM/DCN-style model, negative downsampling with recalibration, streaming impression-click join, continuous training, calibration monitoring, budget-split A/B.</p>`,
    brute: { why: `<p>Naive: train a deep model once a week on all 70B impressions and rank ads by bid. Bid-only ranking ignores relevance (users stop clicking, revenue falls); a weekly model misses new campaigns; training on all negatives is slow, and no one checks calibration.</p>` },
    mcq: { q: 'You keep 5% of negatives in training. The raw model outputs p = 0.2. What should you do before the auction?', options: ['Recalibrate: q = p / (p + (1 − p) / 0.05)', 'Use 0.2 directly', 'Multiply by 20', 'Retrain without the positives'], answer: 0, explain: 'Downsampling negatives inflates predictions; the closed-form correction (or a calibration layer) restores true probabilities (here ≈ 0.012).' },
    hints: [`<p>Hint 1: estimate scale first - 500 ads × 1M req/s = 500M predictions/s; that forces a two-stage scorer.</p>`, `<p>Hint 2: 10B impressions/day with 0.8% CTR -> keep all positives, downsample negatives, recalibrate.</p>`, `<p>Hint 3: clicks arrive late - describe the streaming join, the attribution window and continuous training with calibration checks.</p>`],
    solution: {
      approach: `<p><b>Scale:</b> 500 × 1M = 500M predictions/s -> light model (LR/small MLP with cached user embedding) trims 500 -> 50, heavy model scores 50 (50M/s on GPU inference servers with batching). <b>Features:</b> sparse ids (user, ad, advertiser, campaign, placement), hashed crosses, user behaviour sequence (recent clicks/categories), context (hour, device, surface), ad content embeddings, counters (ad CTR last 1 h / 24 h, smoothed). <b>Model:</b> DLRM/DCN-v2: embedding tables (sharded) + cross network + MLP; multi-task heads p(click), p(conversion | click). <b>Training:</b> impressions logged with features at serving; Flink joins clicks within a 30-min window (conversions later with delayed-feedback correction); keep all positives, sample ~10% negatives, recalibrate with q = p/(p + (1−p)/w) then isotonic per segment; continuous training with checkpoints every ~15 min, daily full retrain. <b>Cold start:</b> advertiser/category priors, content features, exploration budget. <b>Evaluation:</b> offline next-day holdout: normalised log loss, AUC, calibration ratio per segment; online budget-split A/B on revenue, advertiser ROI/conversions, CTR, ad hide rate; guardrails: latency, calibration drift alerts, auto-rollback.</p>`,
      complexity: `<p>Inference O(ads × (embedding lookups + MLP)); embedding memory O(#ids × dim).</p>`,
      followUps: ['How would you detect a calibration drift for one advertiser?', 'What changes for first-price auctions?']
    }
  }]
});
topics.push({
  title: 'Case Study: Payment Fraud Detection',
  analogy: `<p>A bouncer at a club door with three choices per guest: wave in, check ID, or refuse. Refusing a real guest loses a customer; letting in a troublemaker costs damage. The bouncer cannot take an hour per guest, the troublemakers <b>change their tricks</b> once they get caught, and he only learns weeks later who actually caused trouble. That is fraud detection.</p>`,
  explain: `<p>🟢 <b>Goal:</b> for each transaction (or signup, login, payout) decide <b>approve / challenge (3-D Secure, OTP) / review / block</b> within ~50-100 ms, minimising <b>total dollar cost</b> = fraud losses + cost of blocking good customers + review cost.</p>
  <p><b>What makes fraud special:</b></p>
  <ul><li><b>Severe imbalance:</b> often 0.1% or less is fraud. Accuracy is useless (99.9% by approving everything). Use <b>precision-recall curves</b>, <b>recall at a fixed false-positive rate</b>, and dollar-weighted metrics.</li>
  <li><b>Delayed, noisy labels:</b> chargebacks arrive 30-90+ days later; some fraud is never reported; "friendly fraud" (customer disputes a real purchase) adds noise. Blocked transactions have <b>no label at all</b> - you never learn if they were really fraud.</li>
  <li><b>Adversarial drift:</b> fraudsters probe the system and adapt within days. Models degrade fast; you need rules for instant response plus frequent retraining.</li>
  <li><b>Cost asymmetry:</b> missing a $2,000 fraud is far worse than one $3 review. Pick thresholds by <b>expected cost</b>, possibly different per amount, merchant or country.</li></ul>
  <p><b>Features that win:</b> <b>velocity</b> (cards per device in the last hour, transactions per card in 10 min), <b>deviation from the user's normal</b> (amount vs their median, new country, new device), <b>entity graph</b> (this device/IP/email/shipping address is linked to known fraud accounts), merchant risk, account age, behavioural biometrics (typing, paste of card number). Velocity and graph features need a real-time feature store.</p>
  <p><b>Architecture:</b> payment -> feature service (real-time aggregates from a stream) -> <b>rules engine</b> (hard blocks, sanctions lists, emergency patches) + <b>ML score</b> (usually GBDT - strong on tabular data, fast, explainable with SHAP) -> <b>decision policy</b> (thresholds by cost) -> action -> case management for analysts -> labels flow back.</p>`,
  clues: ['"Detect fraudulent transactions in real time" -> imbalance, delayed labels, rules + GBDT, cost-based threshold', '"Only 0.1% are fraud" -> PR-AUC / recall at fixed FPR, not accuracy; class weights', '"Chargebacks arrive weeks later" -> label delay, train on matured windows, proxy labels', '"Fraudsters adapt" -> adversarial drift, fast rules, frequent retraining, monitoring', '"Blocking good customers hurts" -> decision policy with challenge tier, dollar cost of false positives', '"Rings of accounts" -> graph features / graph models over shared devices, IPs, addresses'],
  code: [{ lang: 'python', code: PY.fraud, run: true, title: 'Threshold picker that minimises expected dollar cost (runnable)' }],
  codeTitle: ['Cost-based threshold'],
  viz: {
    title: 'Moving the threshold: missed fraud vs angry customers',
    input: '0.6',
    inputLabel: 'Block threshold between 0 and 1',
    gen: function (input) {
      var thr = parseFloat(input);
      if (!(thr >= 0 && thr <= 1)) throw new Error('Enter a threshold between 0 and 1, e.g. 0.6');
      var tx = [[0.97, 1, 900], [0.91, 1, 1200], [0.88, 0, 40], [0.80, 1, 300], [0.72, 0, 75], [0.65, 0, 20], [0.60, 1, 150], [0.45, 0, 60], [0.30, 0, 35], [0.22, 1, 80], [0.15, 0, 25], [0.05, 0, 10]];
      var f = [], hl = {}, cost = 0, tp = 0, fp = 0, fn = 0;
      var scores = tx.map(function (t) { return Math.round(t[0] * 100); });
      var texts = tx.map(function (t) { return (t[1] ? 'F $' : '$') + t[2]; });
      f.push({ narr: '12 transactions sorted by model score (bars). Labels F = fraud. Threshold = <b>' + thr + '</b>: everything at or above it is blocked/challenged.', parts: [{ type: 'bars', label: 'score × 100 (F = fraud)', values: scores, texts: texts }] });
      tx.forEach(function (t, i) {
        var flagged = t[0] >= thr, what;
        if (t[1] && flagged) { hl[i] = 'ok'; tp++; what = 'fraud caught (true positive), saves $' + t[2]; }
        else if (t[1]) { hl[i] = 'bad'; fn++; cost += t[2]; what = '<span class="c-r">fraud missed</span>: we pay the $' + t[2] + ' chargeback'; }
        else if (flagged) { hl[i] = 'cur'; fp++; var c = 3 + 0.1 * t[2]; cost += c; what = '<span class="c-y">good customer blocked</span>: review + churn cost $' + c.toFixed(1); }
        else { hl[i] = 'done'; what = 'good customer approved'; }
        if (i % 3 === 2 || i === tx.length - 1) {
          f.push({ narr: 'Up to txn ' + (i + 1) + ' (score ' + t[0] + '): ' + what + '. Running cost $' + cost.toFixed(1) + '.', parts: [{ type: 'bars', label: 'green = caught, red = missed, amber = false alarm', values: scores, texts: texts, hl: Object.assign({}, hl) }, { type: 'vars', label: 'confusion so far', vals: { TP: tp, FP: fp, FN: fn, 'cost $': cost.toFixed(1) } }] });
        }
      });
      var prec = tp + fp ? tp / (tp + fp) : 0, rec = tp / (tp + fn || 1);
      f.push({ narr: 'Final at threshold ' + thr + ': precision ' + prec.toFixed(2) + ', recall ' + rec.toFixed(2) + ', total cost <b>$' + cost.toFixed(1) + '</b>. Try 0.2 (cheapest here: big frauds are caught, false alarms are cheap) and 0.85 (few false alarms but expensive misses).', parts: [{ type: 'vars', label: 'result', vals: { threshold: thr, precision: prec.toFixed(2), recall: rec.toFixed(2), 'cost $': cost.toFixed(1) }, hl: { 'cost $': 'sel' } }] });
      return f;
    }
  },
  examples: [
    { title: 'Run the threshold picker', html: `<p>Press ▶. At threshold 0.95 precision is a perfect 1.00 but cost is <b>$1,730</b> because big frauds slip through. At 0.2 we annoy 5 good customers (~$38 total) but catch every fraud. The "best" threshold depends on the cost of each mistake, not on a pretty F1.</p>` },
    { title: 'Three-tier decision instead of yes/no', html: `${H.table(['Score', 'Action', 'Why'], [['≥ 0.9', H.c('r', 'Block'), 'Very likely fraud'], ['0.5 - 0.9', H.c('y', 'Challenge (3-D Secure / OTP)'), 'Cheap friction: real users pass, bots fail'], ['0.3 - 0.5 and amount &gt; $1,000', 'Manual review queue', 'Analyst time only where money is large'], ['otherwise', H.c('g', 'Approve'), 'Keep checkout smooth']])}` },
    { title: 'Velocity feature with real numbers', html: `<p>Card used 1 time in the last 24 h normally. Today: 7 attempts in 4 minutes across 3 merchants, 5 declined for wrong CVV -> classic <b>card testing</b>. Feature <code>declines_per_card_10min = 5</code> is far more predictive than any single-transaction field. This needs a streaming aggregator (sliding windows keyed by card, device, IP).</p>` },
    { title: 'Why blocked transactions poison labels', html: `<p>If the model blocks everything above 0.8, those transactions never complete and never get a chargeback label. Next training run sees "no fraud above 0.8" and learns the wrong thing. Fix: let a tiny random <b>holdout</b> (e.g. 0.5% of flagged, low-amount) through or challenge instead of block, and weight by inverse propensity.</p>` }
  ],
  deepDive: `<p><b>Label maturity.</b> Train on transactions old enough that most chargebacks have arrived (e.g. 60-90 days), and add <b>proxy labels</b> for recency (confirmed fraud reports, account takeovers, analyst decisions). Evaluate on a time-split window that is also matured, otherwise recent "negatives" are secretly positives.</p>
  <p><b>Why GBDT is the default.</b> Tabular, heterogeneous features, missing values, monotonic constraints, fast CPU inference (&lt; 5 ms), and SHAP explanations that analysts and regulators need ("declined because new device + 6× usual amount"). Deep sequence models over transaction history and GNNs over the entity graph are added for rings and account takeover.</p>
  <p><b>Rules still matter.</b> When a new attack starts at 2 am, a rule can be deployed in minutes; a model needs data and retraining. Keep rules versioned, back-tested on history, and retired when the model covers them.</p>
  <p><b>Threshold policy per segment.</b> The cost of a false positive differs: a $5 coffee vs a $3,000 laptop, a loyal 5-year customer vs a 1-hour-old account. Use expected-cost decisions: block if p × amount &gt; cost_of_friction.</p>
  <p><b>Monitoring.</b> Score distribution shift (PSI), approval rate, fraud rate by cohort once labels mature, analyst override rate, and attack-pattern dashboards. Sudden approval-rate drops usually mean a broken feature, not a fraud wave.</p>
  <p><b>Compliance.</b> Adverse-action explanations, fairness checks across protected groups, data retention rules (PCI DSS for card data).</p>`,
  aiEra: `<p><b>What AI changes:</b> fraudsters use generative AI for synthetic identities, deepfake KYC selfies and polished phishing, so identity checks need liveness detection and document forensics. Defenders use LLMs to summarise cases for analysts, generate candidate rules from attack clusters, and transformer/foundation models pre-trained on billions of transactions as feature extractors.</p>
  <p><b>Use AI as a partner:</b> <code>Given these 20 flagged transactions, describe the common pattern and propose a velocity rule</code> - then back-test the rule yourself.</p>
  <p><b>Where AI goes wrong:</b> it suggests random train/test splits (leaks future fraud patterns), optimises accuracy or F1 instead of dollars, and ignores that blocked transactions have no labels.</p>
  <p><b>You own:</b> the cost matrix, the label-maturity policy, and the human-in-the-loop design.</p>`,
  problems: [{
    title: 'Design real-time card fraud detection for a payment processor',
    level: 'Hard', tags: ['fraud', 'imbalance', 'real-time'], companies: ['Stripe', 'PayPal', 'Visa'],
    statement: `<p>10k transactions/s, decision within 100 ms, fraud rate 0.15%, chargebacks arrive up to 90 days later. Design features, model, decision policy, labels and monitoring.</p>`,
    constraints: `False declines cost merchants revenue; analysts can review 5,000 cases/day; must explain declines.`,
    example: `<p>Expected: streaming velocity + graph features, rules engine + GBDT, three-tier action policy tuned by cost, matured labels + proxy labels, exploration holdout, drift monitoring.</p>`,
    brute: { why: `<p>Naive: a logistic regression on single-transaction fields trained with random splits, block if p &gt; 0.5. At 0.15% fraud, almost nothing exceeds 0.5 (recall collapses), random splits leak future patterns, and no velocity/graph features means card testing and rings go unseen.</p>` },
    mcq: { q: 'Which metric is most informative for model selection here?', options: ['Recall (or $ caught) at a fixed false-positive rate', 'Accuracy', 'ROC-AUC alone on a random split', 'Training loss'], answer: 0, explain: 'With heavy imbalance and a fixed friction budget, compare models at the operating point you will actually use.' },
    hints: [`<p>Hint 1: the strongest signals are behavioural: velocity windows and links to known-bad entities.</p>`, `<p>Hint 2: separate the score (model) from the decision (cost-based thresholds with a challenge tier).</p>`, `<p>Hint 3: handle labels: maturity window, proxy labels, and a small exploration holdout so blocked traffic still teaches you.</p>`],
    solution: {
      approach: `<p><b>Flow:</b> auth request -> feature service (Flink sliding windows in Redis/online store: txns per card/device/IP in 1 min/1 h/24 h, declines, distinct merchants, amount vs user median, new device/country; graph features: hops to known-fraud entities, cluster size of shared devices/addresses) -> rules engine (sanctions, known-bad BINs, emergency rules) -> GBDT score (&lt;5 ms) -> policy: block if p ≥ t_block(segment), challenge if p ≥ t_challenge, queue for review if high amount and mid score within analyst capacity, else approve. Thresholds set by minimising expected cost (chargeback + fees vs friction and review cost) per amount band and merchant category. <b>Labels:</b> chargebacks + confirmed fraud reports + analyst decisions; train on data matured ≥ 60 days plus recent proxy labels; class weights rather than resampling to keep probabilities usable; calibrate. <b>Exploration:</b> small random challenge-instead-of-block holdout with logged propensities. <b>Eval:</b> time-split, recall and $ caught at fixed FPR, PR-AUC; online shadow mode then A/B on fraud bps and false-decline rate. <b>Ops:</b> SHAP reason codes, PSI drift alerts, approval-rate alerts, weekly retrain, rules for zero-day attacks.</p>`,
      complexity: `<p>Per transaction: O(#windows) feature reads + O(trees × depth) scoring; streaming state O(active entities).</p>`,
      followUps: ['How would you detect a fraud ring that uses fresh cards?', 'How do you A/B test when the outcome label takes 90 days?']
    }
  }]
});
topics.push({
  title: 'Case Study: Content Moderation at Scale',
  analogy: `<p>Airport security. Every bag goes through the X-ray (<b>automatic classifier</b>). Obvious weapons are confiscated on the spot (<b>auto-remove</b>), unclear shapes go to a human officer (<b>review queue</b>), the rest roll on. Known dangerous items are on a <b>photo list</b> (hash matching). Officers have limited time, so the biggest planes and the scariest shapes are checked first.</p>`,
  explain: `<p>🟢 <b>Goal:</b> find and act on content that violates policy (hate, violence, spam, nudity, CSAM, self-harm, scams, misinformation) across text, images, video and live streams, with the right <b>action</b> (remove, age-gate, reduce distribution, label, warn) - fast enough that harmful content gets few views, and accurate enough that legitimate speech is not taken down.</p>
  <p><b>Layers, cheapest first:</b></p>
  <ol><li><b>Hash matching</b> - perceptual hashes (PhotoDNA, PDQ, video hashes) against databases of known violating media. Near-zero false positives, catches re-uploads instantly.</li>
  <li><b>Per-policy classifiers</b> - multimodal models (text, image, video frames, audio transcript, plus account signals). One head per policy, because thresholds and costs differ per harm.</li>
  <li><b>Routing by score and severity</b> - high confidence -> auto-action; uncertain -> human review; low -> allow. Severe harms (CSAM, terrorism) use much lower review thresholds.</li>
  <li><b>Human review</b> - trained reviewers with policy guidelines; their decisions become training labels. Queue is <b>prioritised by expected harm</b>: severity × probability × expected views (reach).</li>
  <li><b>User reports and appeals</b> - reports are a signal (noisy, can be brigaded); appeals catch false positives and measure precision.</li></ol>
  <p><b>Metrics:</b> per-policy <b>precision and recall</b> (on a sampled, labelled set); <b>prevalence</b> - the fraction of all <i>views</i> that are of violating content (estimated by random sampling and labelling, the headline integrity metric); proactive rate (found by us before users reported); time-to-action / views-before-action; appeal overturn rate; reviewer agreement.</p>
  <p><b>When to check:</b> at upload (pre-publication, for high-risk accounts or severe categories), shortly after posting, and again when content starts going viral (re-score with a heavier model as reach grows).</p>`,
  clues: ['"Detect harmful content on a social platform" -> hash matching + per-policy classifiers + human review + appeals', '"Limited reviewers" -> prioritise queue by severity × probability × reach', '"Measure how much bad content users see" -> prevalence via random sampling of views', '"Policy changes often / new harm types" -> fast relabelling, LLM-based classifiers with policy prompts, few-shot', '"Adversaries evade with misspellings, overlaid text, edits" -> robust multimodal models, perceptual hashes, OCR', '"Avoid over-removal" -> per-policy thresholds, appeals, overturn-rate monitoring'],
  code: [{ lang: 'python', code: PY.moder, run: true, title: 'Per-policy routing: auto-remove, human review by harm × reach, allow (runnable)' }],
  codeTitle: ['Moderation routing'],
  viz: {
    title: 'A new post goes through the moderation pipeline',
    input: 'borderline',
    inputLabel: 'Post type: known, clear, borderline or benign',
    gen: function (input) {
      var t = String(input).trim().toLowerCase();
      if (['known', 'clear', 'borderline', 'benign'].indexOf(t) < 0) throw new Error('Type one of: known, clear, borderline, benign');
      var nodes = [box('UP', 'Upload', 8, 30, 12), box('HM', 'Hash match', 30, 8, 16), box('CL', 'Classifiers', 30, 52, 16), box('RT', 'Router', 54, 30, 12),
        box('RM', 'Remove', 80, 8, 12), box('Q', 'Review queue', 80, 30, 18), box('OK', 'Publish', 80, 52, 12)];
      var edges = [['UP', 'HM'], ['UP', 'CL'], ['HM', 'RM', 'match'], ['CL', 'RT'], ['RT', 'RM'], ['RT', 'Q'], ['RT', 'OK'], ['Q', 'CL', 'labels']];
      var s = [['Post uploaded (type: <b>' + t + '</b>). Text, image frames and audio transcript are extracted; account signals (age, past strikes) attached.', { UP: 'cur' }, {}]];
      if (t === 'known') {
        s.push(['<b>Hash match</b>: the perceptual hash is within a small distance of a known violating image in the shared database.', { UP: 'done', HM: 'bad' }, { 'UP-HM': 'ok' }, { HM: 'match!' }]);
        s.push(['Removed instantly, before anyone sees it. Account gets a strike; severe categories are reported to the legal authority as required.', { HM: 'done', RM: 'sel' }, { 'HM-RM': 'bad' }, { RM: '0 views' }]);
        s.push(['No classifier or reviewer time spent. Hash matching is the cheapest, most precise layer - but only catches <i>known</i> content.', { RM: 'done' }, {}]);
        return flowFrames('Moderation pipeline', nodes, edges, s, 62);
      }
      s.push(['Hash match: no match. Now the <b>per-policy classifiers</b> score it: violence, hate, spam, nudity...', { UP: 'done', HM: 'done', CL: 'cur' }, { 'UP-HM': 'done', 'UP-CL': 'ok' }, { HM: 'no match' }]);
      var score = t === 'clear' ? 0.98 : t === 'borderline' ? 0.71 : 0.04;
      s.push(['Highest policy score: <b>violence = ' + score + '</b>. Router thresholds for violence: remove ≥ 0.95, review ≥ 0.60.', { CL: 'done', RT: 'cur' }, { 'CL-RT': 'ok' }, { RT: 'p=' + score }]);
      if (t === 'clear') {
        s.push(['Score ≥ 0.95 -> <b>auto-remove</b>. User is notified and can appeal; a sample of auto-removals is audited to measure precision.', { RT: 'done', RM: 'sel' }, { 'RT-RM': 'bad' }, { RM: 'removed' }]);
      } else if (t === 'borderline') {
        s.push(['0.60 ≤ score &lt; 0.95 -> <b>human review</b>. Priority = severity × probability × predicted views. While waiting, distribution is <b>reduced</b> (not recommended) to limit harm.', { RT: 'done', Q: 'cur' }, { 'RT-Q': 'ok' }, { Q: 'priority high' }]);
        s.push(['Reviewer decides with the policy guideline. The decision is the action <b>and</b> a fresh training label that flows back to the classifiers.', { Q: 'sel', CL: 'win' }, { 'Q-CL': 'ok' }, { Q: 'decided' }]);
      } else {
        s.push(['Score &lt; 0.60 -> <b>publish</b>. If it later goes viral or gets reports, it is re-scored with a heavier model and may enter review.', { RT: 'done', OK: 'ok' }, { 'RT-OK': 'ok' }, { OK: 'live' }]);
      }
      s.push(['Metrics updated: proactive rate, time-to-action, and (via random sampling of views) prevalence.', { RT: 'done' }, {}]);
      return flowFrames('Moderation pipeline', nodes, edges, s, 62);
    }
  },
  examples: [
    { title: 'Run the routing demo', html: `<p>Press ▶. <code>p8</code> (violence 0.66, 12,000 views/h) is reviewed first even though <code>p3</code> has a similar score - because far more people would see it. <code>p5</code> scores only 0.08 but is in the CSAM policy, whose review threshold is 0.05, so it still enters the queue. Severity changes thresholds.</p>` },
    { title: 'Prevalence by sampling', html: `<p>Sample 10,000 random <b>views</b> (not posts) per day, label them carefully. 12 violate the hate policy -> prevalence ≈ <b>0.12%</b> (95% CI roughly 0.07-0.21%). Measuring views, not posts, weights by what users actually experience: one viral violating video matters more than 1,000 unseen ones.</p>` },
    { title: 'Precision vs recall trade by policy', html: `${H.table(['Policy', 'Auto-remove threshold', 'Why'], [['Spam', '0.90', 'High volume, low severity, appeals cheap'], ['Violence / gore', '0.95', 'Context matters (news, documentaries)'], ['CSAM', 'hash + very low review threshold', 'Missing one is unacceptable; every hit is human-confirmed'], ['Misinformation', 'no auto-remove; label/reduce', 'Hard to judge, high free-speech cost']])}` },
    { title: 'Adversarial evasion', html: `<p>Spammers write "fr33 cr¥pto" or put text inside images. Defences: character normalisation, OCR on images, multimodal models trained on augmented adversarial examples, account-level and network-level signals (100 new accounts posting the same link), and perceptual hashes robust to crops and colour shifts.</p>` }
  ],
  deepDive: `<p><b>Label quality.</b> Policies are subtle; reviewer agreement may be only 70-90% on borderline cases. Use gold-standard questions, multiple reviewers for training labels, adjudication, and clear guideline versions. When policy changes, old labels may become wrong - version labels with the policy.</p>
  <p><b>Multimodal context.</b> A harmless image + harmless caption can be hateful together (meme problem). Use joint image-text models and include context: comments, account history, the group it is posted in.</p>
  <p><b>Scale and cost.</b> Billions of items/day: run tiny cheap models on everything, heavier models only on uncertain or high-reach items (cascade). Video: sample keyframes and audio rather than every frame; live streams need rolling windows.</p>
  <p><b>Reviewer well-being and capacity.</b> Exposure limits, blurring, rotation; capacity planning ties directly to thresholds - lowering the review threshold by 0.05 may double queue volume.</p>
  <p><b>Feedback loop risks.</b> Classifiers learn only from what was reviewed (selection bias toward high scores). Add randomly sampled items to the review stream for unbiased recall estimates and training data.</p>
  <p><b>Regulation.</b> Laws like the EU Digital Services Act require notice-and-action processes, statements of reasons, appeals and transparency reports - design logging and explanations from day one.</p>`,
  aiEra: `<p><b>What AI changes:</b> LLMs and vision-language models can classify content <b>directly from a written policy</b> (zero/few-shot), so a new policy can be enforced in days instead of months of labelling. They also explain decisions to reviewers and users. Cost means the usual pattern is a cascade: small fast classifiers on everything, LLM on uncertain/high-reach items, humans on the hardest. Generative AI also raises the volume of synthetic spam, deepfakes and AI-generated CSAM, so provenance signals (C2PA content credentials, watermarks) become features.</p>
  <p><b>Use AI as a partner:</b> <code>Here is our policy; label these 50 edge cases and explain each</code> - then measure agreement with expert reviewers before trusting it.</p>
  <p><b>Where AI goes wrong:</b> LLM moderators can be inconsistent across phrasing, culturally biased, and jailbroken by content that contains instructions.</p>
  <p><b>You own:</b> thresholds per harm, the human-review loop, and measurement via prevalence.</p>`,
  problems: [{
    title: 'Design a moderation system for a video platform with limited reviewers',
    level: 'Hard', tags: ['moderation', 'human-in-the-loop'], companies: ['YouTube', 'TikTok', 'Meta'],
    statement: `<p>5M video uploads/day, 10,000 reviewer-hours/day (~6 min per video review). Design detection, routing and measurement so that harmful videos get as few views as possible.</p>`,
    constraints: `At most ~100k reviews/day; severe harms must never auto-publish when flagged; users can appeal.`,
    example: `<p>Expected: hash matching at upload, multimodal per-policy classifiers, cascade with heavier models for uncertain/viral items, review priority = severity × p × predicted reach, reduce distribution while pending, prevalence measurement, appeals.</p>`,
    brute: { why: `<p>Naive: human-review everything in upload order. 5M/day needs 500k reviewer-hours - 50× capacity; queue grows forever and the viral harmful video gets reviewed days after a million views.</p>` },
    mcq: { q: 'Which is the best ordering for the human review queue?', options: ['Severity × probability of violation × expected views', 'First in, first out', 'Highest classifier score only', 'Random'], answer: 0, explain: 'Expected harm prevented depends on how bad, how likely, and how many people would see it.' },
    hints: [`<p>Hint 1: compute capacity first - 100k reviews vs 5M uploads means ≤ 2% can be reviewed.</p>`, `<p>Hint 2: cheap layers first (hashes, small models), humans only where uncertainty and reach are high.</p>`, `<p>Hint 3: measure with prevalence on random view samples and with appeal overturn rates.</p>`],
    solution: {
      approach: `<p><b>Capacity:</b> 10,000 h × 10 reviews/h = 100k reviews/day = 2% of uploads, so automation must handle 98%. <b>Upload path:</b> perceptual video hash vs known-bad databases -> instant block. Then per-policy multimodal classifiers on keyframes, audio transcript, title/description, OCR text, plus uploader signals (account age, strikes). <b>Routing:</b> per policy: auto-action above a high-precision threshold (audited by sampling); review band below it; severe-harm policies hold the video unpublished pending review. <b>Priority:</b> severity weight × p(violation) × predicted views in next 24 h (from the recommender's own forecast); pending items get reduced distribution. <b>Re-scoring:</b> when views cross 10k/100k, re-run a heavier model (or an LLM-based policy classifier) - a reach-triggered cascade. <b>Reports</b> increase priority, weighted by reporter reliability. <b>Labels:</b> reviewer decisions with policy version, multi-review for training data, random sample reviews for unbiased recall. <b>Metrics:</b> prevalence (random view sampling), views-before-action, proactive rate, per-policy precision/recall, appeal overturn rate, reviewer agreement; A/B threshold changes against prevalence and overturns.</p>`,
      complexity: `<p>Compute scales with uploads × cheap models + small fraction × heavy models; review cost bounded by capacity.</p>`,
      followUps: ['How would you moderate live streams?', 'How do you launch a brand-new policy with no labels?']
    }
  }]
});
practice.push(prob({ t: 'Compute recall@5 and precision@5', l: 'Easy', tags: ['metrics', 'retrieval'],
  s: `<p>A retriever returns <code>[a, b, c, d, e, f, g]</code>. The relevant items are <code>{b, e, h, k}</code>. Compute recall@5 and precision@5. Which metric should you track for a candidate generation stage, and why?</p>`,
  c: `Use set overlap between the top-5 and the relevant set.`, ex: `<p>Top-5 = {a,b,c,d,e}; overlap = {b,e} = 2. Recall@5 = 2/4 = <b>0.5</b>; precision@5 = 2/5 = <b>0.4</b>.</p>`,
  bw: `<p>Reporting accuracy over all catalogue items: almost every item is irrelevant, so "predict nothing relevant" scores ~100% and tells you nothing.</p>`,
  mcq: { q: 'For candidate generation the most important metric is usually', options: ['Recall@k', 'Precision@1', 'Accuracy', 'Log loss of the ranker'], answer: 0, explain: 'Later stages can only rank what retrieval returns, so retrieval must not miss relevant items.' },
  h: [`<p>Hint 1: only the first 5 returned items count; ignore f and g.</p>`, `<p>Hint 2: recall divides by the number of relevant items; precision divides by k.</p>`, `<p>Hint 3: think about which stage can fix which mistake - can a ranker recover an item it never saw?</p>`],
  a: `<p>Top-5 is {a, b, c, d, e}. It contains b and e from the relevant set, so 2 hits. Recall@5 = hits / |relevant| = 2 / 4 = 0.5. Precision@5 = hits / k = 2 / 5 = 0.4. For candidate generation track <b>recall@k</b> (with k equal to the number of candidates passed on, e.g. recall@1000): the ranker can reorder but cannot recover an item retrieval missed. Precision matters for the final shown list, where NDCG or precision@k at the visible slots is the right measure.</p>`,
  cx: `<p>O(k) with a hash set of relevant items.</p>`, fu: ['How would you compute recall when you do not know all relevant items?'] }));
practice.push(prob({ t: 'Pick offline and online metrics for each case study', l: 'Easy', tags: ['metrics', 'framework'],
  s: `<p>For (a) feed ranking, (b) search ranking, (c) ads CTR, (d) fraud, (e) moderation, give one offline metric and one online metric.</p>`,
  c: `One line each; justify briefly.`, ex: `<p>(a) AUC per head / NDCG -> time spent, retention; (b) NDCG@10 -> search success rate; (c) log loss + calibration -> revenue, advertiser ROI; (d) recall at fixed FPR -> $ fraud loss, false-decline rate; (e) per-policy precision/recall -> prevalence.</p>`,
  bw: `<p>Using accuracy everywhere: imbalanced problems (fraud, moderation, CTR) look perfect while failing, and ranking problems are not single-label tasks at all.</p>`,
  mcq: { q: 'Why is log loss reported for ads but rarely for search ranking?', options: ['Ads multiply the probability by money, so calibration matters', 'Search has no labels', 'Log loss is faster to compute', 'Search uses regression'], answer: 0, explain: 'In ads the probability itself sets prices; in search only the order matters.' },
  h: [`<p>Hint 1: is the output an order (ranking) or a probability used in a decision?</p>`, `<p>Hint 2: imbalanced problems need precision/recall-style metrics.</p>`, `<p>Hint 3: the online metric is always the business outcome the product owner cares about.</p>`],
  a: `<p><b>Feed:</b> offline per-head AUC/log loss and NDCG of blended ranking on time-split sessions; online daily active minutes, retention, with hide/report guardrails. <b>Search:</b> offline NDCG@10 (graded labels) and recall@k for retrieval; online search success rate, reformulation and zero-result rate. <b>Ads:</b> offline normalised log loss, AUC and calibration ratio per segment; online revenue per mille, CTR, advertiser conversions/ROI. <b>Fraud:</b> offline recall or dollars caught at a fixed false-positive rate, PR-AUC on matured labels; online fraud loss in basis points and false-decline rate. <b>Moderation:</b> offline per-policy precision/recall on a sampled labelled set; online prevalence (random view sampling), views before action, appeal overturn rate.</p>`,
  cx: `<p>Each metric is O(n) or O(n log n) over the evaluation set.</p>`, fu: ['Which of these needs the longest A/B test and why?'] }));
practice.push(prob({ t: 'Correct predictions after negative downsampling', l: 'Easy', tags: ['ads', 'calibration'],
  s: `<p>A CTR model was trained keeping all clicks but only 2% of non-clicks. For one impression it outputs p = 0.25. What is the calibrated probability?</p>`,
  c: `Use q = p / (p + (1 − p) / w) with w = 0.02.`, ex: `<p>(1 − 0.25)/0.02 = 37.5; q = 0.25 / (0.25 + 37.5) = 0.25 / 37.75 ≈ <b>0.0066</b> (0.66%).</p>`,
  bw: `<p>Using 0.25 directly: the auction thinks the ad is ~38× more clickable than it is, overcharging advertisers and showing the wrong ads.</p>`,
  mcq: { q: 'Does negative downsampling change AUC?', options: ['No, the correction is monotonic so the order is unchanged', 'Yes, AUC always drops', 'Yes, AUC always rises', 'AUC is undefined after sampling'], answer: 0, explain: 'The correction is a monotonic transform; ordering metrics stay the same, calibration changes.' },
  h: [`<p>Hint 1: downsampling negatives makes positives look more common to the model.</p>`, `<p>Hint 2: each kept negative stands for 1/w real negatives.</p>`, `<p>Hint 3: plug into q = p / (p + (1 − p)/w) and sanity-check that q is much smaller than p.</p>`],
  a: `<p>Keeping only a fraction w of negatives inflates the odds of a click by 1/w. Undo it: odds_true = odds_model × w, i.e. q = p / (p + (1 − p)/w). With p = 0.25 and w = 0.02: (1 − 0.25)/0.02 = 37.5, q = 0.25 / 37.75 ≈ 0.0066. Sanity check: the original odds were 0.25/0.75 = 0.333; multiplying by 0.02 gives 0.00667, and 0.00667/(1 + 0.00667) ≈ 0.0066. Afterwards still check calibration per segment and add an isotonic/Platt layer if needed.</p>`,
  cx: `<p>O(1) arithmetic per prediction; can be fused into the model output layer.</p>`, fu: ['How would you verify calibration in production?'] }));
practice.push(prob({ t: 'Why the two-tower model cannot use cross features', l: 'Medium', tags: ['two-tower', 'recommendation'],
  s: `<p>A teammate wants to add "number of times this user watched this creator in the last 7 days" to the two-tower retrieval model. Explain why that is a problem and where the feature belongs.</p>`,
  c: `Keep retrieval under 20 ms over 100M items.`, ex: `<p>The feature depends on both user and item, so item embeddings could no longer be precomputed. It belongs in the ranker.</p>`,
  bw: `<p>Adding it anyway forces computing every item's vector per user - 100M tower calls per request - so ANN is impossible.</p>`,
  mcq: { q: 'Where do user × item cross features belong?', options: ['The ranking model', 'The item tower', 'The ANN index', 'Nowhere'], answer: 0, explain: 'Rankers score hundreds of candidates and can afford pairwise features.' },
  h: [`<p>Hint 1: what does each tower see as input?</p>`, `<p>Hint 2: precomputed item vectors must be identical for all users.</p>`, `<p>Hint 3: a cheaper approximation can live in the user tower (e.g. embedding of recently watched creators).</p>`],
  a: `<p>A two-tower model scales because the item tower's output depends only on item features, so all item vectors are precomputed and indexed; online we compute one user vector and do an ANN lookup. A user × creator watch count depends on both sides, so it cannot go into either tower without making item vectors user-specific - that would mean recomputing 100M item vectors per request. Put it in the <b>ranker</b>, which scores only a few hundred candidates and can join pairwise features from the feature store. To still capture the signal at retrieval, feed the user tower the user's recent creators (as a pooled embedding) - the dot product then naturally favours items from those creators - or add a separate "followed / recently watched creators" candidate source.</p>`,
  cx: `<p>Two-tower: O(1) user tower + O(log N) ANN. Ranker: O(candidates × features).</p>`, fu: ['What other features are only possible in the ranker?'] }));
practice.push(prob({ t: 'Debug: great offline AUC, flat A/B result', l: 'Medium', tags: ['debugging', 'experiments'],
  s: `<p>A new feed ranker improved offline AUC from 0.78 to 0.81, but the 2-week A/B test shows no change in engagement. List the likely causes and how to check each.</p>`,
  c: `You have training logs, serving logs and the experiment dashboard.`, ex: `<p>Causes: leakage, training-serving skew, metric mismatch, candidate-limited gains, feedback-loop data, under-powered test.</p>`,
  bw: `<p>Weak: "train longer" or "the A/B test is wrong". Neither diagnoses why offline and online disagree.</p>`,
  mcq: { q: 'Which check catches training-serving skew most directly?', options: ['Compare feature values logged at serving with the ones used in training for the same requests', 'Increase model size', 'Re-run the A/B test', 'Use a random split'], answer: 0, explain: 'Skew means the same feature has different values offline vs online; compare them for identical requests.' },
  h: [`<p>Hint 1: check whether the offline gain is real (leakage, random split).</p>`, `<p>Hint 2: check whether the model sees the same inputs online (skew, missing features, latency timeouts).</p>`, `<p>Hint 3: check whether AUC measures what the product metric rewards, and whether the test can detect the effect.</p>`],
  a: `<p>(1) <b>Leakage / bad split:</b> features computed with future data or a random split inflate AUC - re-evaluate on a strict time split with point-in-time features. (2) <b>Training-serving skew:</b> compare logged serving features vs training features on the same requests; look for defaults, stale caches, timezone bugs; check how often the new model times out and falls back. (3) <b>Metric mismatch:</b> AUC on clicks may not move watch time or retention; evaluate the blended ranking with NDCG on sessions and per-head metrics. (4) <b>Bottleneck elsewhere:</b> if candidates are poor, a better ranker reorders the same mediocre set - check recall of retrieval. (5) <b>Re-rank rules</b> may override most of the model's ordering. (6) <b>Power:</b> compute the minimum detectable effect; a 0.3% engagement change may need more traffic or time. (7) <b>Feedback loop</b>: offline data came from the old model's exposure; consider counterfactual evaluation.</p>`,
  cx: `<p>Diagnosis cost is a few offline re-evaluations plus log comparisons.</p>`, fu: ['How would you design an offline metric that correlates better with the online one?'] }));
practice.push(prob({ t: 'Design "people you may know"', l: 'Medium', tags: ['recommendation', 'graph'], co: ['LinkedIn', 'Meta'],
  s: `<p>Design friend/connection suggestions for a social network of 800M users. Cover candidates, features, model, labels and metrics.</p>`,
  c: `Suggestions refreshed daily; served in under 100 ms.`, ex: `<p>Candidates from friends-of-friends, shared schools/companies, contact import; ranker predicts p(request sent and accepted).</p>`,
  bw: `<p>Naive: rank all 800M users by mutual friend count per request - O(N) per user and ignores whether the request would be accepted.</p>`,
  mcq: { q: 'Which label best reflects success?', options: ['Request sent AND accepted', 'Suggestion impression', 'Profile view', 'Number of suggestions shown'], answer: 0, explain: 'A sent-but-ignored request is a bad experience for the receiver; acceptance captures mutual value.' },
  h: [`<p>Hint 1: the graph gives cheap candidates: 2-hop neighbours.</p>`, `<p>Hint 2: features: mutual friends, shared org/school, geography, interaction signals, recency of joining.</p>`, `<p>Hint 3: this can be precomputed offline daily and cached; label = sent × accepted.</p>`],
  a: `<p><b>Candidates (offline daily):</b> friends-of-friends (cap per user, sample high-degree nodes), shared school/company/group, contact-book matches, graph embedding neighbours (e.g. node2vec/GNN + ANN). ~1,000 per user. <b>Features:</b> mutual connection count and their strength, Adamic-Adar score, shared orgs, location distance, age of accounts, profile completeness, past suggestion impressions (fatigue), whether the candidate has many pending requests. <b>Model:</b> GBDT or multi-task net predicting p(send) and p(accept | send); score = product. <b>Serving:</b> precompute top-100 per user into a KV store; filter at request time (already connected, blocked, dismissed). <b>Labels:</b> impressions with send/accept outcomes; negative = shown and not sent. <b>Metrics:</b> offline AUC per head, recall of future connections; online accepted connections per user, downstream engagement; guardrails: request spam reports, dismiss rate, privacy complaints. Watch privacy: do not leak sensitive links (e.g. suggesting a therapist's other patients).</p>`,
  cx: `<p>Offline 2-hop expansion O(sum of degree²) with sampling; online O(1) KV lookup.</p>`, fu: ['How do you handle a brand-new user with no connections?'] }));
practice.push(prob({ t: 'Handle position bias in click training data', l: 'Medium', tags: ['bias', 'ranking'],
  s: `<p>Your search ranker trains on clicks. Position 1 gets 30% CTR and position 5 gets 5% for the same documents swapped in a test. Propose two ways to stop the model from just learning "whatever was on top was good".</p>`,
  c: `No budget for full human labelling.`, ex: `<p>Position as a training feature set to a constant at serving; inverse-propensity weighting with propensities estimated from randomisation.</p>`,
  bw: `<p>Ignoring it: the model reinforces the old ranking (a self-fulfilling loop) and good documents at low positions never rise.</p>`,
  mcq: { q: 'What value should the position feature take at serving time?', options: ['A fixed constant (e.g. position 1) for all candidates', 'The candidate\'s actual future position', 'Random', 'Remove the model'], answer: 0, explain: 'Position is unknown before ranking; fixing it removes its effect so scores compare relevance only.' },
  h: [`<p>Hint 1: clicks = relevance × probability the user examined that slot.</p>`, `<p>Hint 2: either model examination explicitly or reweight examples by 1/propensity.</p>`, `<p>Hint 3: you can estimate propensities cheaply by randomly swapping adjacent results for a small slice of traffic.</p>`],
  a: `<p>Clicks mix relevance with examination probability: users look at the top more. <b>Option 1: position-aware training.</b> Add position (and device/layout) as a feature, or a separate shallow "bias tower" whose output is added to the logit; at serving set position to a constant so ranking reflects relevance only. <b>Option 2: inverse propensity weighting.</b> Estimate p(examined | position) via result randomisation (swap pairs on a small traffic slice) or an EM click model; weight each clicked example by 1/propensity so clicks at low positions count more. Also use better labels: long clicks, skip-above pairwise preferences, and a small human-graded set to validate. Measure success by NDCG on the human set and by interleaving tests.</p>`,
  cx: `<p>Training cost unchanged; randomisation costs a small slice of user experience.</p>`, fu: ['How would you estimate propensities without randomisation?'] }));
practice.push(prob({ t: 'Design a "similar items" widget for a product page', l: 'Medium', tags: ['recommendation', 'embeddings'], co: ['Amazon', 'Etsy'],
  s: `<p>On each product page show 10 similar items. 50M products, 30% added in the last year. Describe candidates, ranking and evaluation.</p>`,
  c: `p99 under 50 ms; new products should get similar items on day one.`, ex: `<p>Item-to-item from co-views/co-purchases plus content embeddings via ANN; light ranker; precompute top lists per item.</p>`,
  bw: `<p>Naive: same category, sorted by sales. Ignores style/price similarity, shows the same best-sellers everywhere and does nothing for niche products.</p>`,
  mcq: { q: 'What helps brand-new products most?', options: ['Content embeddings from title, image and attributes', 'Co-purchase counts', 'Sales rank', 'User reviews'], answer: 0, explain: 'New items have no interaction history; content features place them near similar items immediately.' },
  h: [`<p>Hint 1: two signals: behavioural (co-views, co-buys) and content (text/image embeddings).</p>`, `<p>Hint 2: precompute per item offline, since the query is just an item id.</p>`, `<p>Hint 3: decide whether "similar" (substitutes) or "complementary" (bought together) is the goal - they need different labels.</p>`],
  a: `<p>Clarify intent: <b>substitutes</b> ("similar") vs <b>complements</b> ("goes with"). For similar: candidates from (1) co-view item-to-item similarity (normalised to avoid popular-item dominance, e.g. cosine on co-occurrence or Swing/ItemCF), (2) ANN over multimodal content embeddings (title text + image + attributes), so new products have neighbours on day one. Ranker (GBDT) with features: embedding similarity, co-view score, price ratio, same brand, rating, stock, margin; label = click on widget followed by add-to-cart. Precompute the top 50 per item nightly (and on product creation via content-only path), store in a KV store; at request time filter out-of-stock and re-rank lightly with user context. Evaluate offline with recall@10 of co-viewed items in held-out sessions and NDCG; online A/B on widget CTR, add-to-cart and revenue per page view; guardrail page latency.</p>`,
  cx: `<p>Offline O(N log N) ANN builds; online O(1) lookup + small re-rank.</p>`, fu: ['How would you add personalisation without losing the precomputation?'] }));
practice.push(prob({ t: 'Choose a fraud threshold under a review budget', l: 'Medium', tags: ['fraud', 'thresholds'],
  s: `<p>A fraud model scores 1M transactions/day. Analysts can review 2,000/day. At threshold 0.7, 1,500 are flagged with precision 0.40; at 0.5, 4,000 with precision 0.25; at 0.3, 12,000 with precision 0.10. Average fraud amount is $400, review costs $5. Which threshold, and how do you handle overflow?</p>`,
  c: `Assume unreviewed flagged transactions are approved.`, ex: `<p>0.7 fits capacity: 600 frauds caught. 0.5 flags 4,000 &gt; 2,000 capacity: review the top 2,000 by score × amount instead.</p>`,
  bw: `<p>Picking the threshold with the highest F1 ignores both the analyst capacity and the dollar amounts.</p>`,
  mcq: { q: 'When flags exceed capacity, which review order is best?', options: ['Highest expected loss: p(fraud) × amount', 'Oldest first', 'Lowest amount first', 'Alphabetical by merchant'], answer: 0, explain: 'Analyst time should go where expected dollars saved are largest.' },
  h: [`<p>Hint 1: compute frauds caught and review cost at each threshold.</p>`, `<p>Hint 2: capacity caps how many flags you can act on.</p>`, `<p>Hint 3: instead of a single threshold, rank by expected loss and take the top capacity; use automatic challenges for the rest.</p>`],
  a: `<p>Threshold 0.7: 1,500 flags × 0.40 = 600 frauds × $400 = $240k saved, review cost $7.5k, fits capacity (1,500 ≤ 2,000) leaving 500 slots idle. Threshold 0.5: 4,000 flags × 0.25 = 1,000 frauds, but only 2,000 reviewable. Better policy: rank flagged transactions by expected loss p × amount and review the top 2,000 - these include all 1,500 above 0.7 plus the 500 most valuable in the 0.5-0.7 band, catching more than 600 frauds at full utilisation. For the overflow, use an automatic <b>challenge</b> (3-D Secure/OTP) rather than approve, since friction is cheap and blocks most fraud. 0.3 is useless for review (10% precision, 6× capacity) but may be fine for challenge if friction cost is low.</p>`,
  cx: `<p>O(n log n) to sort by expected loss, or a heap of size capacity.</p>`, fu: ['How would the answer change if friction costs $2 per challenged good customer?'] }));
practice.push(prob({ t: 'Design a news feed ranker that avoids filter bubbles', l: 'Hard', tags: ['recommendation', 'diversity', 'feedback loops'],
  s: `<p>A news app's engagement-optimised ranker increasingly shows users only one topic and one viewpoint; editors and regulators are concerned. Redesign the ranking to keep engagement while improving diversity and long-term satisfaction.</p>`,
  c: `No more than 2% engagement loss; must be measurable.`, ex: `<p>Diversity-aware re-ranking (MMR / topic caps), exploration slots, long-term satisfaction labels, guardrail metrics on topic and source entropy.</p>`,
  bw: `<p>Hard-coding "one item per topic" randomly: hurts relevance, ignores user intent and cannot be tuned or measured.</p>`,
  mcq: { q: 'MMR (maximal marginal relevance) picks the next item by', options: ['Relevance minus similarity to items already chosen', 'Highest relevance only', 'Random sampling', 'Recency only'], answer: 0, explain: 'MMR = λ·relevance − (1 − λ)·max similarity to the selected set.' },
  h: [`<p>Hint 1: the problem is partly a feedback loop - the model only learns from what it already showed.</p>`, `<p>Hint 2: re-rank with a diversity term and reserve exploration slots.</p>`, `<p>Hint 3: define metrics: topic/source entropy per user per week, plus satisfaction surveys and retention, as guardrails.</p>`],
  a: `<p><b>Diagnose:</b> exposure bias and engagement-only objectives narrow content. <b>Objective:</b> add heads for satisfaction (survey "was this worth your time"), and long-term return; reduce weight on pure clicks. <b>Re-ranking:</b> MMR or determinantal point process over item embeddings with λ tuned per user (some want depth); caps per source and per topic per page; viewpoint/source diversity using a source-level label. <b>Exploration:</b> 5-10% slots for items from adjacent topics chosen by a bandit (Thompson sampling) with propensity logging so the model learns from them. <b>Training:</b> inverse-propensity weighting to reduce popularity and exposure bias. <b>Metrics:</b> online A/B with primary = 4-week retention and daily active days; guardrails = engagement (≤ 2% drop), intra-list diversity, weekly topic entropy per user, share of impressions from distinct sources, complaints. Run long tests (4+ weeks) or holdback groups because diversity effects are slow.</p>`,
  cx: `<p>Greedy MMR O(k × candidates) per request, fine for k ≈ 20 and a few hundred candidates.</p>`, fu: ['How do you avoid diversity being imposed on users who want depth?'] }));
practice.push(prob({ t: 'Design ETA prediction for a food delivery app', l: 'Hard', tags: ['regression', 'real-time features'], co: ['DoorDash', 'Uber'],
  s: `<p>Predict delivery time shown at checkout and updated live. 2M orders/day. Cover labels, features, model, loss, evaluation and how the prediction affects behaviour.</p>`,
  c: `Under-promising and over-promising have different costs; latency 50 ms.`, ex: `<p>Decompose into prep time + pickup wait + travel; quantile loss; real-time restaurant load and courier supply features.</p>`,
  bw: `<p>Naive: distance / average speed. Ignores kitchen load, courier availability, weather and the asymmetric cost of being late.</p>`,
  mcq: { q: 'Late deliveries anger users more than early ones. Which loss fits?', options: ['Quantile (pinball) loss at e.g. the 70th percentile', 'Plain MSE', 'Cross-entropy', 'Hinge loss'], answer: 0, explain: 'Quantile loss lets you predict a time you will beat most of the time, reflecting asymmetric cost.' },
  h: [`<p>Hint 1: break the journey into stages with separate models or heads.</p>`, `<p>Hint 2: the strongest features are real-time: open orders at the restaurant, available couriers nearby, traffic.</p>`, `<p>Hint 3: the shown ETA changes behaviour (conversion, courier dispatch) - evaluate both accuracy and business impact.</p>`],
  a: `<p><b>Label:</b> actual delivered_at − ordered_at, plus stage timestamps (accepted, ready, picked up). <b>Decomposition:</b> prep time model (restaurant, items, current open orders, time of day), courier assignment + travel to restaurant (supply density), travel to customer (route distance, live traffic, weather, building type). Either a multi-head GBDT/NN or a sum of stage models. <b>Loss:</b> quantile loss (e.g. P50 for internal dispatch, P70-80 for the customer-facing promise) since lateness costs more. <b>Features:</b> real-time from streams (restaurant queue, courier positions), historical aggregates per restaurant/hour, geospatial embeddings. <b>Serving:</b> 50 ms with precomputed aggregates; re-predict on each stage event for live updates. <b>Eval:</b> MAE, P90 error, % late versus promise, calibration of quantiles (does P70 cover 70%?), per city/restaurant; online A/B on conversion, late rate, cancellations, support contacts. <b>Feedback:</b> the ETA affects which couriers are dispatched and whether users order, so watch for loops when retraining.</p>`,
  cx: `<p>O(features) per prediction; stream processing for live aggregates.</p>`, fu: ['How do you handle a restaurant that just joined?'] }));
practice.push(prob({ t: 'Design harmful-comment detection for a new language market', l: 'Hard', tags: ['moderation', 'multilingual', 'cold start'],
  s: `<p>Your platform launches in a country with a language you have no labelled moderation data for. 3M comments/day expected. Design detection for harassment and hate in month one and the plan to improve by month six.</p>`,
  c: `20 native-speaker reviewers available from week two.`, ex: `<p>Month one: multilingual pre-trained classifier + LLM policy classifier on uncertain items + reports; month six: in-language labelled data, distilled model, calibrated thresholds.</p>`,
  bw: `<p>Machine-translating everything to English and running the English classifier: slang, slurs, code-switching and cultural context are lost; precision and recall both collapse silently.</p>`,
  mcq: { q: 'What is the best first source of labels for the new language?', options: ['Native-speaker reviewers labelling a sample prioritised by model uncertainty and reports', 'Random English comments', 'User likes', 'Translated English labels only'], answer: 0, explain: 'Active learning with native speakers produces the most useful labels per reviewer hour.' },
  h: [`<p>Hint 1: start with multilingual models and LLMs prompted with the written policy - zero-shot is better than nothing.</p>`, `<p>Hint 2: use reviewers for active learning: label the uncertain and high-reach items.</p>`, `<p>Hint 3: be conservative in month one: reduce distribution or label rather than auto-remove until precision is measured.</p>`],
  a: `<p><b>Month one:</b> run a multilingual pre-trained toxicity classifier (cross-lingual transfer) on everything; route uncertain and high-reach comments to an LLM classifier prompted with the written policy plus a local glossary of slurs and context built with native experts; user reports raise priority. Actions are conservative: hide behind a click or reduce visibility, not auto-remove, until precision is measured. <b>Labels:</b> 20 reviewers at ~60 labels/h ≈ 9,600/day; choose items by active learning (uncertainty, disagreement between models, reports) plus a random sample for unbiased metrics; double-label 10% for agreement. <b>Month 2-6:</b> fine-tune an in-language classifier on collected labels, distil the LLM's judgments to a small fast model, calibrate thresholds per policy against reviewer labels, add code-switching and transliteration handling, then enable auto-removal where precision ≥ target. <b>Metrics:</b> per-policy precision/recall on the random sample, prevalence on random views, appeal overturn rate, time-to-action; compare with mature markets.</p>`,
  cx: `<p>Cheap model on all 3M/day; LLM on a few percent; review capacity ~10k/day.</p>`, fu: ['How do you detect coordinated harassment campaigns?'] }));
practice.push(prob({ t: 'Design the end-to-end ML platform behind these systems', l: 'Hard', tags: ['MLOps', 'feature store', 'platform'],
  s: `<p>Your company runs feed, ads and fraud models built by separate teams, each with its own pipelines and frequent skew bugs. Design a shared platform: feature store, training, model registry, serving, monitoring.</p>`,
  c: `Must support both daily batch and second-level streaming features.`, ex: `<p>Feature store with one definition for offline and online, point-in-time joins, logged features, model registry with lineage, canary/shadow deploys, drift monitoring.</p>`,
  bw: `<p>Each team keeps writing its own Spark job and its own online service: duplicate features with different definitions, skew bugs, no lineage, no shared monitoring.</p>`,
  mcq: { q: 'What does a point-in-time correct join prevent?', options: ['Using feature values from after the label timestamp (leakage)', 'Slow queries', 'Model overfitting to rare classes', 'GPU memory errors'], answer: 0, explain: 'Training rows must only see feature values available at prediction time.' },
  h: [`<p>Hint 1: the main bug class is offline/online mismatch - one definition, two materialisations.</p>`, `<p>Hint 2: log features at serving time and train from logs where possible.</p>`, `<p>Hint 3: deployment: registry -> shadow -> canary -> A/B, with automatic rollback on metric alarms.</p>`],
  a: `<p><b>Feature store:</b> features declared once (source, transformation, window, entity key); materialised to an offline store (columnar, time-travel) for training with point-in-time joins, and an online store (Redis/Cassandra-like) for serving; streaming features via Flink with the same definitions. <b>Logging:</b> serving logs the exact feature vector per prediction - training can use logs to eliminate skew. <b>Training:</b> orchestrated pipelines (data validation, schema checks, time-split eval, fairness/slice metrics) producing artefacts into a <b>model registry</b> with lineage (data version, code, features, metrics). <b>Serving:</b> shared inference service (CPU for GBDT, GPU for deep rankers with dynamic batching), model versioning, shadow mode (score without acting), canary 1%, then A/B via the experimentation platform. <b>Monitoring:</b> feature freshness and null rates, input drift (PSI), prediction distribution, calibration once labels arrive, latency/cost per model; alerts and auto-rollback. <b>Governance:</b> access control on sensitive features, retention, model cards. Teams own models; the platform owns plumbing.</p>`,
  cx: `<p>Online feature read O(features) per request; offline joins scale with training rows.</p>`, fu: ['How would you support continuous (online) training for ads on this platform?'] }));
quiz.push({ q: 'Why do large recommenders use a multi-stage funnel (retrieval -> ranking -> re-ranking)?', options: ['A heavy model cannot score millions of items within the latency budget', 'Each stage uses a different programming language', 'Regulations require it', 'It removes the need for labels'], answer: 0, explain: 'Cheap stages cut millions to hundreds so the expensive model only scores a few hundred items.' });
quiz.push({ q: 'In a two-tower model, what makes ANN retrieval possible?', options: ['Item embeddings do not depend on the user, so they are precomputed and indexed', 'The user tower is skipped online', 'Items are sorted alphabetically', 'The towers share all weights'], answer: 0, explain: 'The towers interact only via a dot product, so item vectors are fixed and indexable.' });
quiz.push({ q: 'Which feature can a ranker use but a two-tower retriever cannot?', options: ['How many times this user watched this creator this week', 'The item\'s category', 'The user\'s country', 'The item\'s upload time'], answer: 0, explain: 'User × item cross features need both sides at once, which only the ranker sees.' });
quiz.push({ q: 'What is the main purpose of logQ correction with in-batch negatives?', options: ['Stop popular items being over-penalised because they appear as negatives more often', 'Speed up ANN search', 'Calibrate CTR for the auction', 'Remove duplicate users'], answer: 0, explain: 'Popular items are sampled as negatives more often; subtracting log of sampling probability corrects it.' });
quiz.push({ q: 'NDCG differs from recall@k because it', options: ['Uses graded relevance and rewards putting the best items higher', 'Ignores order', 'Only works with binary labels', 'Measures latency'], answer: 0, explain: 'NDCG discounts gains by log2(position + 1) and normalises by the ideal order.' });
quiz.push({ q: 'A query is "SKU 88-1043B". Which retrieval method is most reliable?', options: ['Lexical (BM25 / inverted index)', 'Pure embedding similarity', 'Collaborative filtering', 'Random sampling'], answer: 0, explain: 'Exact identifiers need exact term matching; embeddings blur them with near neighbours.' });
quiz.push({ q: 'Why do ads CTR models need calibration, not just high AUC?', options: ['pCTR is multiplied by the bid to rank and price ads', 'AUC cannot be computed for ads', 'Calibration makes training faster', 'Advertisers only see AUC'], answer: 0, explain: 'eCPM = bid × pCTR; a model that is 2× too high mis-prices every auction even if order is perfect.' });
quiz.push({ q: 'You keep 10% of negatives. The model outputs 0.30. The corrected probability is about', options: ['0.041', '0.30', '0.03', '0.75'], answer: 0, explain: 'q = 0.3 / (0.3 + 0.7 / 0.1) = 0.3 / 7.3 ≈ 0.041.' });
quiz.push({ q: 'For fraud with 0.1% positives, which metric is least useful?', options: ['Accuracy', 'Recall at a fixed false-positive rate', 'PR-AUC', 'Dollars of fraud caught'], answer: 0, explain: 'Approving everything gives 99.9% accuracy while catching nothing.' });
quiz.push({ q: 'Why do blocked transactions create a labelling problem?', options: ['They never complete, so we never learn whether they were really fraud', 'They are stored in another database', 'They are always fraud', 'They have no features'], answer: 0, explain: 'Selective labels: the model\'s own actions hide outcomes; a small exploration holdout helps.' });
quiz.push({ q: 'How should a moderation review queue usually be ordered?', options: ['By expected harm: severity × probability × expected reach', 'First come, first served', 'By uploader name', 'By file size'], answer: 0, explain: 'Limited reviewer time should go where it prevents the most harmful views.' });
quiz.push({ q: 'Moderation prevalence is measured by', options: ['Labelling a random sample of content views', 'Counting user reports', 'Counting removals', 'Classifier average score'], answer: 0, explain: 'Reports and removals depend on enforcement; random view sampling estimates what users actually see.' });
quiz.push({ q: 'Training-serving skew is best prevented by', options: ['One feature definition served online and offline, plus logging features at serving', 'Bigger models', 'Random train/test splits', 'Turning off monitoring'], answer: 0, explain: 'Skew comes from computing the same feature differently in two places.' });
quiz.push({ q: 'Why add position as a feature during training but fix it at serving?', options: ['To separate position bias from true relevance', 'To make the model larger', 'Because positions are secret', 'To reduce latency'], answer: 0, explain: 'The model attributes the "top slot" click boost to position, so scores at serving reflect relevance.' });

interview.push({ level: 'I', q: 'Walk me through how you would structure an ML system design interview answer.', a: `<p>Clarify the product, users, scale and latency, and what success means for the business. Frame it as an ML task: the business metric, the ML objective and the exact label. Discuss data and labels (source, delay, noise, imbalance, leakage). Features (user, item, context, cross; batch vs real-time; feature store). Model: baseline first, then the funnel of candidate generation, ranking and re-ranking. Offline evaluation with a time-based split and the right metric, then online A/B with a primary metric and guardrails. Finish with serving and scaling (latency budget, caching, ANN) and monitoring (drift, calibration, feedback loops, retraining cadence).</p>`, followUps: ['Which step do candidates most often skip?', 'How do you budget time across steps in 45 minutes?'] });
interview.push({ level: 'I', q: 'Explain the two-tower model and why it is used for candidate generation.', a: `<p>Two neural networks: a user tower maps user and context features to a vector, an item tower maps item features to a vector in the same space; score = dot product (or cosine). Because the towers only meet at the dot product, all item vectors can be precomputed and stored in an approximate nearest neighbour index (HNSW, IVF-PQ, ScaNN). Online you compute one user vector and retrieve the top-k in roughly logarithmic time over millions or billions of items. Training uses engaged pairs as positives and in-batch or sampled negatives with a softmax loss, plus a sampling-bias (logQ) correction. Its limitation: no user × item cross features, which is why a ranker follows.</p>`, followUps: ['How do you handle new items with no interactions?', 'How do you measure the ANN index quality?'] });
interview.push({ level: 'A', q: 'How would you design the ranking objective for a video feed?', a: `<p>Predict multiple user actions with a multi-task ranker: p(click), p(like), p(share), expected watch time or watch fraction, p(hide/report). Combine them in a value function such as a weighted sum where negative actions have large negative weights. The weights encode product values and are tuned with online experiments against long-term metrics like retention and satisfaction surveys, not just short-term clicks. Normalise watch time by video length to avoid favouring long videos, use MMoE/PLE-style architectures if tasks conflict, and add re-ranking for diversity, freshness and integrity.</p>`, followUps: ['How would you pick the weights?', 'What if creators start gaming one head?'] });
interview.push({ level: 'A', q: 'What is the difference between pointwise, pairwise and listwise learning to rank?', a: `<p>Pointwise treats each query-document pair independently and predicts a relevance score or class (regression/classification); simple but ignores that only relative order matters. Pairwise learns which of two documents should rank higher (RankNet, pairwise logistic loss), matching ranking better and working well with click preferences like skip-above. Listwise optimises a loss defined over the whole list, often approximating a ranking metric such as NDCG (LambdaRank/LambdaMART, softmax cross-entropy over the list). Listwise or lambda-based methods usually give the best NDCG; pointwise is often used when calibrated scores are needed downstream.</p>`, followUps: ['Why is NDCG hard to optimise directly?', 'When would you still choose pointwise?'] });
interview.push({ level: 'I', q: 'How do you evaluate a search ranking system offline and online?', a: `<p>Offline: build a query set stratified by head, torso and tail queries with human graded labels (0-3) and compute NDCG@10 and MRR for the ranker, and recall@k for retrieval (did we fetch the relevant docs at all). Supplement with debiased click labels. Online: A/B test on search success rate (a click with long dwell or purchase without reformulation), time to success, zero-result rate, abandonment, revenue per search for commerce. Interleaving gives fast, sensitive ranker comparisons before a full A/B test. Always report head and tail separately and include latency guardrails.</p>`, followUps: ['How do you get labels for tail queries?', 'Can an LLM replace human raters?'] });
interview.push({ level: 'A', q: 'Why does calibration matter in ads, and how do you maintain it?', a: `<p>The auction ranks and prices by bid × pCTR (eCPM), so the probability itself moves money: over-prediction makes advertisers overpay and lets weak ads win, under-prediction loses revenue. AUC is blind to this because it only measures order. Maintain calibration by correcting for negative downsampling (q = p/(p + (1−p)/w)), adding a calibration layer (isotonic or Platt) trained on recent data, and monitoring the predicted/observed click ratio per segment (advertiser, slot, country, device) with alerts. Continuous training keeps up with new campaigns; check calibration after every model push and roll back on drift.</p>`, followUps: ['How do delayed conversions bias calibration?', 'How do you A/B test a CTR model without budget interference?'] });
interview.push({ level: 'A', q: 'How do you handle extreme class imbalance in fraud detection?', a: `<p>First, choose metrics that are not fooled: precision-recall curves, recall or dollars caught at a fixed false-positive rate, and expected cost. For training, use class weights or downsample the majority class and recalibrate, rather than synthetic oversampling that distorts probabilities. Strong features (velocity, deviation from personal baseline, graph links to known fraud) matter more than the resampling trick. Choose the decision threshold by expected dollar cost per segment, and add a challenge tier so mid-risk cases get cheap friction instead of a hard decline.</p>`, followUps: ['Would you use SMOTE? Why or why not?', 'How does the threshold change for a $5 versus a $5,000 transaction?'] });
interview.push({ level: 'E', q: 'Fraud labels arrive 60-90 days late. How do you train and evaluate under that delay?', a: `<p>Train on a matured window (transactions old enough that most chargebacks arrived) and add faster proxy labels such as confirmed fraud reports, account takeover confirmations and analyst decisions for recent data. Evaluate on a time split that is also matured, otherwise recent negatives are secretly positives. Use leading indicators online: approval rate, challenge pass rate, early fraud reports, score distribution drift. For A/B tests, split traffic and wait for labels to mature on a fixed cohort, or use proxy metrics with a later confirmation. Keep rules for fast reaction because the model cannot learn a new attack until labels exist.</p>`, followUps: ['How would you detect a new attack before chargebacks arrive?', 'How do you handle friendly fraud labels?'] });
interview.push({ level: 'I', q: 'Design the layers of a content moderation system.', a: `<p>Cheapest and most precise first: perceptual hash matching against databases of known violating media. Then per-policy multimodal classifiers (text, image, video keyframes, audio, OCR, account signals), with thresholds per policy: auto-action at high confidence, human review in an uncertain band, allow below. Severe harms get lower thresholds and pre-publication holds. Human reviewers work a queue prioritised by severity × probability × reach, and their decisions become labels. User reports and appeals feed back. Re-score content as it gains reach. Measure prevalence by sampling random views, plus precision, recall, proactive rate and appeal overturns.</p>`, followUps: ['How would you moderate live video?', 'How do you protect reviewers?'] });
interview.push({ level: 'E', q: 'What feedback loops arise in recommender systems and how do you mitigate them?', a: `<p>The model decides what users see, and only shown items can be clicked, so training data reflects past model choices (exposure bias). Popular items get more exposure and more clicks (rich-get-richer), new items and niche creators starve, and content can narrow into filter bubbles. Position bias adds more distortion. Mitigations: exploration traffic (epsilon-greedy or bandits) with logged propensities, inverse-propensity weighting or counterfactual evaluation, popularity correction in training, fresh-content quotas and diversity re-ranking, position-aware training, and long holdout groups to measure long-term effects.</p>`, followUps: ['How would you evaluate a new policy offline using logged data?', 'How much traffic should exploration get?'] });
interview.push({ level: 'I', q: 'What is training-serving skew and how do you prevent it?', a: `<p>It is a mismatch between feature values the model trained on and those it receives in production, caused by separate code paths, different time windows, timezone or unit differences, stale caches, or different handling of missing values. It silently degrades online quality while offline metrics look good. Prevention: a feature store with one definition materialised offline and online, point-in-time correct joins, logging the exact features at serving and training from those logs, data validation (schema, ranges, null rates) on both paths, and comparing online/offline feature distributions for the same requests.</p>`, followUps: ['How would you detect skew after a launch?', 'What is a point-in-time join?'] });
interview.push({ level: 'E', q: 'How do you handle cold start for new users and new items?', a: `<p>New items: use content features (text, image, audio embeddings, creator, category) in the item tower so they are retrievable immediately, add a fresh-content candidate source, and give a guaranteed exploration budget to collect early signals; bandits can allocate impressions efficiently. New users: onboarding choices, context (location, device, language, time), popular-in-segment recommendations, and fast session-based models that adapt to the first few interactions in real time. For ads, use hierarchical priors from the advertiser and category with Bayesian smoothing.</p>`, followUps: ['How do you stop exploration from hurting engagement?', 'How quickly should a new item\'s embedding update?'] });
interview.push({ level: 'E', q: 'An offline model improvement does not show up in the A/B test. How do you debug it?', a: `<p>Check the offline gain is real: leakage, random splits, or features using future data inflate metrics. Check the model receives the same inputs online: training-serving skew, missing features, timeouts that trigger fallbacks, stale embeddings. Check the metric alignment: the offline metric (AUC on clicks) may not drive the online one (retention). Check the system: retrieval may be the bottleneck, or re-ranking rules override the ranker. Check the experiment: statistical power, novelty effects, interference between arms, and correct randomisation unit. Finally, consider feedback loops: offline data came from the old policy.</p>`, followUps: ['How do you compute minimum detectable effect?', 'What is an A/A test and when do you run one?'] });

registerModule({
  id: 'ai23',
  title: 'ML System Design Case Studies',
  intro: `<p>Classic ML system design interviews ask you to design a <b>recommendation feed</b>, <b>search ranking</b>, <b>ads click prediction</b>, <b>fraud detection</b> or <b>content moderation</b> system. They all share one skeleton: frame a business goal as a prediction problem, find labels, build features, run a multi-stage funnel of models, evaluate offline and online, and close the feedback loop. This module gives you a reusable 8-step framework and then walks through each case study with the specific twists interviewers probe: two-tower retrieval and ranking stages, learning to rank and NDCG, calibration in auctions, cost-based thresholds under delayed labels, and human-in-the-loop review prioritised by harm. Runnable Python demos make the metrics and trade-offs concrete.</p>`,
  goals: ['Run an 8-step ML system design framework: clarify, frame, data, features, model, offline eval, online eval, serve and monitor', 'Design a multi-stage recommender with two-tower candidate generation, multi-task ranking and diversity re-ranking', 'Design search ranking with hybrid retrieval, learning to rank and NDCG/MRR/recall@k evaluation', 'Explain why ads CTR models need calibration, negative-sampling correction and continuous training', 'Choose fraud thresholds by dollar cost under imbalance and delayed labels; design moderation pipelines with harm-prioritised review and prevalence metrics', 'Recognise and mitigate feedback loops, position bias and training-serving skew'],
  prereqs: `<p>Required: <b>ai21</b> (Classical Machine Learning in Practice), <b>ai22</b> (MLOps &amp; Model Deployment) and <b>hld06</b> (Caching) for the serving side. Helpful: embeddings and vector search from earlier GenAI modules, and <b>ai14</b> (LLM System Design) for the LLM-product side, which this module does not repeat.</p>`,
  hours: 12,
  langExplain: `<p>The ai track uses Python. Runnable snippets are pure Python (no numpy) so they run in the browser; production systems would use frameworks like PyTorch, TorchRec or XGBoost.</p>`,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
