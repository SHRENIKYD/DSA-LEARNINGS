(function () {
var topics = [], practice = [], quiz = [], interview = [];
function nums(s, max) {
  var a = String(s).trim().split(/[\s,]+/).filter(function (t) { return t !== ''; }).map(Number);
  if (!a.length || a.some(isNaN)) throw new Error('Enter numbers separated by spaces');
  if (a.length > (max || 20)) throw new Error('Use at most ' + (max || 20) + ' numbers');
  return a;
}
function r2(x) { return Math.round(x * 100) / 100; }
function r3(x) { return Math.round(x * 1000) / 1000; }

// ---------------- TOPIC 1: linear and logistic regression in practice ----------------
topics.push({
  title: 'Linear and Logistic Regression in Practice',
  analogy: `<p>A linear model is a <b>recipe card with weights</b>: "price = 50k + 120 per square foot + 8k per bedrooms - 1k per year of age". Logistic regression is the same recipe card, but the total is squeezed through a dial that turns any number into a probability between 0 and 1. Interviewers love these models because you can read the recipe card out loud and explain every number.</p>`,
  explain: `<p>You met the bare ideas in ML Foundations. Here we look at what you actually do with them at work.</p>
  <ul><li><b>Linear regression</b> predicts a number: <code>y = b + w<sub>1</sub>x<sub>1</sub> + ... + w<sub>k</sub>x<sub>k</sub></code>. Each weight says "how much y moves when this feature goes up by 1, <i>holding the others fixed</i>".</li>
  <li><b>Logistic regression</b> predicts a probability: <code>p = sigmoid(b + w·x)</code>. Each weight is a change in <b>log-odds</b>. <code>e<sup>w</sup></code> is the <b>odds ratio</b>: w = 0.69 means "each extra unit doubles the odds".</li></ul>
  <p><b>The practical checklist</b> before you trust the weights:</p>
  ${H.table(['step', 'why'], [['Scale numeric features (standardize)', 'needed so L1/L2 penalties treat features fairly and gradient descent converges'], ['One-hot encode categories (drop one or regularize)', 'a city is not a number; all-dummies + intercept is perfectly collinear'], ['Add a penalty (L2 by default, L1 to select features)', 'stops huge, unstable weights when features are correlated'], ['Check residuals / calibration', 'linear model assumes a straight-line effect; bend it with log, splines or interactions'], ['Compare to a dumb baseline', 'mean prediction or majority class'] ])}
  <p><b>Why they still win in 2026:</b> fast to train on millions of rows, tiny to serve, well calibrated (logistic), easy to explain to a regulator. A strong logistic regression with good features is the baseline every tree model must beat.</p>
  <p><b>Main weaknesses:</b> they cannot learn interactions ("young AND high income") or curves unless you build those features yourself, and correlated features (multicollinearity) make individual weights meaningless even when predictions are fine.</p>`,
  clues: ['"Explain the coefficients to a business stakeholder" → linear / logistic regression', '"We need calibrated probabilities and an explainable model" (credit, insurance, healthcare) → logistic regression', '"Millions of sparse features, low latency" (ads CTR, text bag-of-words) → logistic regression with L1/L2', '"Two features are highly correlated and a weight flipped sign" → multicollinearity, use L2 or drop one', '"What does a coefficient of 0.7 mean in logistic regression?" → log-odds, odds ratio e<sup>0.7</sup> ≈ 2', '"Strong baseline first" → linear model before boosting'],
  code: [{ lang: 'python', run: true, title: 'Logistic regression with L2 from scratch (stdlib only)', code: `import math, random
random.seed(0)

# Toy credit data: (income in 10k, debt ratio) -> default (1) or not (0)
data = [((3, 0.9), 1), ((4, 0.8), 1), ((5, 0.7), 1), ((2, 0.6), 1), ((6, 0.5), 0),
        ((8, 0.4), 0), ((7, 0.2), 0), ((9, 0.3), 0), ((4, 0.4), 0), ((5, 0.9), 1)]

# 1) standardize features using TRAIN statistics only
cols = list(zip(*[x for x, _ in data]))
mean = [sum(c) / len(c) for c in cols]
std = [math.sqrt(sum((v - m) ** 2 for v in c) / len(c)) for c, m in zip(cols, mean)]
X = [[(v - m) / s for v, m, s in zip(x, mean, std)] for x, _ in data]
y = [t for _, t in data]

def sigmoid(z):
    return 1 / (1 + math.exp(-z))

# 2) gradient descent on log loss + L2 penalty (lam/2 * ||w||^2), bias not penalized
w, b, lr, lam = [0.0, 0.0], 0.0, 0.5, 0.1
for epoch in range(300):
    gw, gb = [0.0, 0.0], 0.0
    for xi, yi in zip(X, y):
        err = sigmoid(sum(a * c for a, c in zip(w, xi)) + b) - yi   # dLoss/dz = p - y
        gw = [g + err * v / len(X) for g, v in zip(gw, xi)]
        gb += err / len(X)
    w = [wi - lr * (g + lam * wi) for wi, g in zip(w, gw)]
    b -= lr * gb

print("weights (standardized):", [round(v, 3) for v in w], "bias:", round(b, 3))
for name, wi in zip(["income", "debt_ratio"], w):
    print(f"{name}: odds multiply by {math.exp(wi):.2f} per +1 std")
new = [(v - m) / s for v, m, s in zip((4.5, 0.75), mean, std)]
print("P(default | income=45k, debt=0.75) =", round(sigmoid(sum(a * c for a, c in zip(w, new)) + b), 3))` }, { lang: 'python', check: false, title: 'Same thing at work with scikit-learn (needs the library)', code: `from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

# C is the INVERSE of regularization strength: smaller C = stronger L2 penalty
model = make_pipeline(StandardScaler(), LogisticRegression(C=1.0, penalty="l2", max_iter=1000))
model.fit(X_train, y_train)
proba = model.predict_proba(X_valid)[:, 1]
coefs = model.named_steps["logisticregression"].coef_[0]` }],
  viz: [{
    title: 'Logistic regression learning a boundary step by step',
    input: '0.5',
    inputLabel: 'Learning rate (try 0.1, 0.5, 2)',
    gen: function (input) {
      var lr = Number(String(input).trim());
      if (isNaN(lr) || lr <= 0 || lr > 5) throw new Error('Enter a learning rate between 0 and 5, e.g. 0.5');
      var xs = [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2], ys = [0, 0, 0, 1, 0, 1, 1, 1], w = 0, b = 0, frames = [];
      function sg(z) { return 1 / (1 + Math.exp(-z)); }
      for (var e = 0; e <= 10; e++) {
        var ps = xs.map(function (x) { return sg(w * x + b); });
        var loss = 0; ps.forEach(function (p, i) { loss -= ys[i] ? Math.log(p) : Math.log(1 - p); }); loss /= xs.length;
        var hl = {}; ps.forEach(function (p, i) { hl[i] = (p >= 0.5) === (ys[i] === 1) ? 'ok' : 'bad'; });
        frames.push({ narr: e === 0 ? 'All weights start at 0, so every row gets p = 0.5 and log loss = ln 2 ≈ 0.693. Bars show the predicted probability for x = -2 ... 2 (labels: 0 0 0 1 0 1 1 1). Green = correct side of 0.5, red = wrong.' : 'Epoch ' + e + ': each weight moved by -lr × average(p - y)·x. w = <b>' + r3(w) + '</b>, b = <b>' + r3(b) + '</b>, log loss = <b>' + r3(loss) + '</b>. Boundary (p = 0.5) sits at x = -b/w = <b>' + (w ? r2(-b / w) : 'n/a') + '</b>. The two noisy rows (x = -0.5 labelled 1, x = 0.5 labelled 0) can never both be right with one straight boundary.', parts: [{ type: 'bars', label: 'p(y=1) per row', values: ps.map(r2), hl: hl, idxLabels: xs.map(String) }, { type: 'vars', vals: { epoch: e, w: r3(w), b: r3(b), logloss: r3(loss) } }] });
        var gw = 0, gb = 0; ps.forEach(function (p, i) { gw += (p - ys[i]) * xs[i] / xs.length; gb += (p - ys[i]) / xs.length; });
        w -= lr * gw; b -= lr * gb;
      }
      return frames;
    }
  }],
  examples: [
    { title: 'Reading a logistic coefficient', html: `<p>Churn model, standardized feature <code>support_calls</code> has w = 0.69. e<sup>0.69</sup> ≈ <b>2.0</b>: each extra standard deviation of support calls <b>doubles the odds</b> of churn (odds, not probability). From p = 0.20 (odds 0.25) the odds go to 0.5, so p becomes 0.5/1.5 = <b>0.33</b>.</p>` },
    { title: 'Multicollinearity flips a sign', html: `<p>House model with <code>sqft</code> and <code>rooms</code> (correlation 0.95). Alone, rooms has w = +20k. Together, rooms gets w = -3k because sqft already carries the information, and the split between the two is unstable. Predictions are fine; the story "more rooms lowers price" is nonsense. Fix: L2 (ridge), drop one, or combine (sqft per room). Check with VIF (variance inflation factor) > 5-10.</p>` },
    { title: 'Adding a curve to a straight line', html: `<p>Salary vs years of experience rises fast then flattens. A plain linear fit underestimates juniors and overestimates seniors. Adding <code>log(years + 1)</code> as a feature lets the linear model bend while staying explainable.</p>${H.table(['years', 'raw feature', 'log(years+1)'], [['0', '0', '0'], ['3', '3', '1.39'], ['10', '10', '2.40'], ['30', '30', '3.43']])}` },
    { title: 'Interaction feature', html: `<p>Ad CTR depends on <i>device × hour</i>: mobile at night clicks more, desktop at night clicks less. A linear model with separate device and hour weights cannot express this. Add the crossed feature <code>is_mobile × is_night</code> (this "feature crossing" is how giant ad models were built before deep learning).</p>` }
  ],
  deepDive: `<p><b>Closed form vs iterative.</b> Ordinary least squares has a closed form <code>w = (XᵀX)<sup>-1</sup>Xᵀy</code>; it costs O(n·k² + k³) and breaks when XᵀX is singular (collinear features). Ridge adds λI, which makes it always invertible: that is the algebraic reason L2 cures multicollinearity. Logistic regression has no closed form; libraries use L-BFGS, Newton (IRLS) or SGD for huge data.</p>
  <p><b>L1 vs L2 vs Elastic Net.</b> L1 (lasso) pushes weights exactly to zero (feature selection) but picks one feature arbitrarily from a correlated group; L2 shrinks all smoothly; Elastic Net mixes them and keeps correlated groups together. Regularization strength is tuned by cross-validation; in scikit-learn note <code>C = 1/λ</code>.</p>
  <p><b>Assumptions that matter in practice:</b> linearity in the features (fix with transforms), independent errors (time series violates it), constant variance (heteroscedasticity: log-transform the target, e.g. prices), no extreme leverage points. Normality of residuals only matters for p-values and confidence intervals, not for prediction.</p>
  <p><b>Separable data</b> makes un-regularized logistic weights grow to infinity (the loss keeps falling as w grows). A small L2 penalty fixes it, which is why libraries regularize by default.</p>
  <p><b>Calibration:</b> logistic regression trained on log loss is usually well calibrated, unlike trees and boosted models, which often need Platt or isotonic calibration.</p>`,
  aiEra: `<p><b>What AI changes:</b> linear models are still everywhere in GenAI systems: the "linear probe" that tests whether an LLM's hidden states encode some concept is a logistic regression; reward models end in a linear head; routing classifiers that decide "cheap model or expensive model" are often logistic regression on embeddings.</p>
  <p><b>Use AI as a partner:</b> ask <code>Explain these coefficients for a non-technical audience and flag any that look suspicious</code> while pasting the coefficient table. It is good at turning log-odds into plain stories.</p>
  <p><b>Where AI goes wrong:</b> it happily explains coefficients of unscaled or collinear features as if they were causal, and forgets that "holding others fixed" may be impossible in the real data. It also mixes up C and λ in scikit-learn.</p>
  <p><b>What you must still own:</b> deciding whether a weight is a stable, causal-sounding story or just a correlation artifact, and checking calibration before probabilities drive money decisions.</p>`,
  problems: [{
    title: 'Interpret a churn logistic regression',
    level: 'Easy', tags: ['logistic regression', 'odds ratio'],
    statement: `<p>A standardized logistic churn model has bias b = -1.4 and weights: tenure_months -0.9, support_calls +0.7, monthly_bill +0.2. (1) What is the baseline churn probability for an "average" customer (all features 0)? (2) What happens to the odds for +1 std of support calls? (3) A teammate says "monthly bill barely matters". Is that safe to conclude?</p>`,
    constraints: `Use sigmoid(z) = 1/(1+e<sup>-z</sup>). Round to 2 decimals.`,
    example: `<p>(1) sigmoid(-1.4) = ${H.c('g', '0.20')}. (2) odds × e<sup>0.7</sup> = ${H.c('g', '×2.01')}. (3) ${H.c('y', 'Not safe')} without checking correlation with other features and the regularization path.</p>`,
    brute: { why: `<p>Weak answer: "bill has a small weight so it is unimportant, and support calls cause churn". It ignores scaling, collinearity and the difference between correlation and causation.</p>` },
    mcq: { q: 'A standardized logistic weight is 0.7. Which statement is right?', options: ['Probability rises by 0.7 per std', 'Odds multiply by about 2 per std', 'The feature explains 70% of churn', 'The feature causes churn'], answer: 1, explain: 'Logistic weights live on the log-odds scale: e^0.7 ≈ 2.01 is an odds ratio. The probability change depends on where you start.' },
    hints: [`<p>The bias alone is the log-odds of the average customer because standardized features are 0 at the mean.</p>`, `<p>A weight w multiplies the odds by e<sup>w</sup>. Odds = p/(1-p).</p>`, `<p>For (3), think about what happens to one weight when a strongly correlated feature (tenure? plan type?) is also in the model, and about the L1/L2 penalty shrinking it.</p>`],
    solution: {
      approach: `<p>(1) For the average customer every standardized feature is 0, so z = b = -1.4 and p = 1/(1+e<sup>1.4</sup>) = 1/(1+4.06) ≈ <b>0.20</b>. (2) +1 std of support calls adds 0.7 to the log-odds, multiplying the odds by e<sup>0.7</sup> ≈ <b>2.01</b>. Starting from odds 0.25 (p = 0.20) the odds become 0.50, so p rises to 0.33. (3) A small weight does not prove irrelevance: monthly_bill may be correlated with plan type or tenure that already carries its signal, and the penalty may have shrunk it. Check its importance alone, its correlation with other features, the coefficient path across regularization strengths, and a permutation-importance drop. Also none of this is causal: support calls may be a symptom of a bad experience, not its cause.</p>`,
      dry: { head: ['quantity', 'value'], rows: [['z (average customer)', '-1.4'], ['p', '0.20'], ['odds', '0.25'], ['odds after +1 std calls', '0.25 × 2.01 = 0.50'], ['new p', '0.33']] },
      complexity: `<p>O(1) arithmetic per question.</p>`,
      followUps: ['How would you report a 95% confidence interval for an odds ratio?', 'Why must features be standardized before comparing weight sizes?']
    }
  }]
});

// ---------------- TOPIC 2: decision trees ----------------
topics.push({
  title: 'Decision Trees: Gini, Entropy and Choosing Splits',
  analogy: `<p>A decision tree is the game <b>20 Questions</b>. "Is income above 50k?" "Has the customer called support more than 3 times?" Each yes/no question splits the crowd into two smaller groups, and a good question is one that leaves each group as <i>pure</i> as possible - mostly churners on one side, mostly loyal customers on the other.</p>`,
  explain: `<p>A <b>decision tree</b> learns a flowchart of yes/no questions on features. To grow it, at each node the algorithm (CART) tries <b>every feature and every threshold</b> and keeps the split that makes the children purest. A leaf predicts the majority class (classification) or the mean value (regression).</p>
  <p><b>Measuring impurity</b> for a node with class fractions p<sub>i</sub>:</p>
  <ul><li><b>Gini</b> = 1 - ∑ p<sub>i</sub><sup>2</sup>. Pure node: 0. 50/50 node: 0.5.</li>
  <li><b>Entropy</b> = -∑ p<sub>i</sub> log₂ p<sub>i</sub>. Pure: 0. 50/50: 1 bit.</li>
  <li>For regression trees: <b>variance</b> (MSE) of the values in the node.</li></ul>
  <p><b>Gain</b> of a split = parent impurity - weighted average of children impurity (weights = share of rows going to each child). Pick the split with the largest gain.</p>
  ${H.table(['node', 'rows (yes/no)', 'Gini'], [['parent', '5 / 5', '0.5'], ['left: income &lt; 40k', '4 / 1', '1 - 0.64 - 0.04 = 0.32'], ['right: income ≥ 40k', '1 / 4', '0.32'], ['weighted children', '', '0.5·0.32 + 0.5·0.32 = 0.32'], ['<b>gain</b>', '', '<span class="c-g">0.18</span>']])}
  <p><b>Why trees are popular:</b> no scaling needed, they handle mixed numeric/categorical data, capture interactions and non-linear thresholds automatically, and a shallow tree is readable. <b>Why a single tree is rarely shipped:</b> deep trees overfit badly (high variance: change a few rows and the whole tree changes) and their predictions are step functions. That is why forests and boosting (next topic) exist.</p>
  <p><b>Controlling overfitting:</b> <code>max_depth</code>, <code>min_samples_leaf</code>, <code>min_samples_split</code>, <code>max_leaf_nodes</code>, and cost-complexity pruning (<code>ccp_alpha</code>).</p>`,
  clues: ['"Explainable rules a business person can follow" → shallow decision tree', '"Mixed numeric and categorical features, no time to scale" → tree-based model', '"Compute Gini / information gain for this split" → impurity arithmetic by hand', '"Model is 100% on train, 70% on test" with a deep tree → limit depth / min_samples_leaf / prune', '"Non-linear thresholds like age &gt; 65" → trees find cut-points automatically', '"Implement a decision stump" → loop features × thresholds, keep best gain'],
  code: [{ lang: 'python', run: true, title: 'Find the best split with Gini and entropy (stdlib only)', code: `import math

def gini(labels):
    n = len(labels)
    if n == 0:
        return 0.0
    return 1.0 - sum((labels.count(c) / n) ** 2 for c in set(labels))

def entropy(labels):
    n = len(labels)
    return -sum((labels.count(c) / n) * math.log2(labels.count(c) / n) for c in set(labels)) if n else 0.0

def best_split(rows, labels, impurity=gini):
    """Try every feature and every midpoint threshold; return (gain, feature, threshold)."""
    parent = impurity(labels)
    best = (0.0, None, None)
    for f in range(len(rows[0])):
        values = sorted(set(r[f] for r in rows))
        for lo, hi in zip(values, values[1:]):
            t = (lo + hi) / 2                       # midpoint between two seen values
            left = [l for r, l in zip(rows, labels) if r[f] <= t]
            right = [l for r, l in zip(rows, labels) if r[f] > t]
            child = (len(left) * impurity(left) + len(right) * impurity(right)) / len(labels)
            if parent - child > best[0]:
                best = (parent - child, f, t)
    return best

# features: (age, monthly_support_calls); label: churned?
rows = [(25, 0), (32, 1), (47, 5), (51, 4), (23, 6), (60, 0), (38, 7), (44, 1)]
labels = ["stay", "stay", "churn", "churn", "churn", "stay", "churn", "stay"]
for name, fn in (("gini", gini), ("entropy", entropy)):
    gain, f, t = best_split(rows, labels, fn)
    print(f"{name}: best feature={['age', 'calls'][f]} threshold={t} gain={gain:.3f}")
print("parent gini =", gini(labels), "parent entropy =", entropy(labels))` }],
  viz: [{
    title: 'Scan every threshold on one feature and score it with Gini',
    input: '1 2 3 4 5 6 7 8 | 0 0 1 0 1 1 1 1',
    inputLabel: 'Feature values | labels 0/1 (same length, ≤ 12)',
    gen: function (input) {
      var parts = String(input).split('|');
      if (parts.length !== 2) throw new Error('Use: values | labels, e.g. 1 2 3 | 0 1 1');
      var xs = nums(parts[0], 12), ys = nums(parts[1], 12);
      if (xs.length !== ys.length || xs.length < 3) throw new Error('Need the same number (≥ 3) of values and labels');
      if (ys.some(function (v) { return v !== 0 && v !== 1; })) throw new Error('Labels must be 0 or 1');
      var idx = xs.map(function (_, i) { return i; }).sort(function (a, b) { return xs[a] - xs[b]; });
      var sx = idx.map(function (i) { return xs[i]; }), sy = idx.map(function (i) { return ys[i]; });
      function g(arr) { if (!arr.length) return 0; var p = arr.reduce(function (a, b) { return a + b; }, 0) / arr.length; return 1 - p * p - (1 - p) * (1 - p); }
      var parent = g(sy), frames = [], best = { gain: -1 };
      frames.push({ narr: 'Rows sorted by the feature. Parent Gini = <b>' + r3(parent) + '</b>. We will try a cut between every pair of neighbouring values and measure how pure the two sides become.', parts: [{ type: 'array', label: 'feature (sorted)', values: sx.slice() }, { type: 'array', label: 'label', values: sy.slice(), hl: sy.reduce(function (h, v, i) { h[i] = v ? 'sel' : 'win'; return h; }, {}) }] });
      for (var k = 1; k < sx.length; k++) {
        if (sx[k] === sx[k - 1]) continue;
        var L = sy.slice(0, k), R = sy.slice(k), child = (L.length * g(L) + R.length * g(R)) / sy.length, gain = parent - child, t = (sx[k - 1] + sx[k]) / 2;
        var isBest = gain > best.gain + 1e-12; if (isBest) best = { gain: gain, t: t, k: k };
        var hl = {}; for (var i = 0; i < sx.length; i++) hl[i] = i < k ? 'win' : 'cur';
        frames.push({ narr: 'Cut at <b>' + t + '</b>: left ' + JSON.stringify(L) + ' Gini ' + r3(g(L)) + ', right ' + JSON.stringify(R) + ' Gini ' + r3(g(R)) + '. Weighted child Gini = ' + r3(child) + ', gain = <b>' + r3(gain) + '</b>' + (isBest ? ' <span class="c-g">new best!</span>' : '.'), parts: [{ type: 'array', label: 'labels split at ' + t, values: sy.slice(), hl: hl }, { type: 'vars', vals: { threshold: t, gain: r3(gain), best_threshold: best.t, best_gain: r3(best.gain) }, hl: { gain: isBest ? 'ok' : 'cur' } }] });
      }
      if (best.gain < 0) throw new Error('All values are equal, so no split is possible');
      frames.push({ narr: 'Done. The best single question is <b>x ≤ ' + best.t + '</b> with gain ' + r3(best.gain) + '. A tree repeats this search inside each child until a stopping rule (max depth, min leaf size, zero gain) fires.', parts: [{ type: 'array', label: 'final split', values: sy.slice(), hl: sy.reduce(function (h, v, i) { h[i] = i < best.k ? 'ok' : 'sel'; return h; }, {}) }] });
      return frames;
    }
  }],
  examples: [
    { title: 'Gini vs entropy for a 3:1 node', html: `<p>Node with 3 churn, 1 stay. Gini = 1 - (0.75² + 0.25²) = 1 - 0.625 = <b>0.375</b>. Entropy = -(0.75 log₂0.75 + 0.25 log₂0.25) = 0.311 + 0.5 = <b>0.811</b> bits. They differ in scale but almost always pick the same split; Gini is the scikit-learn default because it avoids a logarithm.</p>` },
    { title: 'Regression tree leaf', html: `<p>Houses in the leaf "sqft ≤ 900 and age &gt; 30" cost 110k, 120k, 130k. The leaf predicts their mean, <b>120k</b>. The split was chosen to minimise the weighted variance of the children. Predictions are flat steps: the tree can never predict above the largest training price (no extrapolation).</p>` },
    { title: 'Overfitting in numbers', html: `${H.table(['max_depth', 'train acc', 'valid acc'], [['2', '0.78', '0.77'], ['5', '0.86', '0.83'], ['10', '0.95', '0.80'], ['None', '<span class="c-r">1.00</span>', '<span class="c-r">0.72</span>']])}<p>An unlimited tree memorises every row (one leaf per row). Pick depth 5 using validation.</p>` },
    { title: 'Trees ignore monotone rescaling', html: `<p>Splitting on <code>income ≤ 40k</code> or on <code>log(income) ≤ 10.6</code> sends the same rows left. So trees do not need standardization or log transforms of features (but the target transform still matters for regression).</p>` }
  ],
  deepDive: `<p><b>Cost of growing.</b> Sorting each feature once and sweeping thresholds gives O(k · n log n) per level. Histogram methods (LightGBM, XGBoost <code>hist</code>) bucket each feature into ~256 bins, making a split search O(k · bins) after one pass - the key trick that makes boosting on 100M rows feasible.</p>
  <p><b>Greedy and unstable.</b> CART picks the locally best split; it never reconsiders. Finding the optimal tree is NP-hard. Small data changes can change the root split and therefore the whole tree, which is high variance: perfect for averaging (bagging).</p>
  <p><b>Categorical features.</b> With one-hot, a tree needs many splits to group categories. LightGBM and CatBoost split categories natively (sorting categories by mean target in the node) - fast but can overfit high-cardinality columns.</p>
  <p><b>Impurity importance is biased</b> toward high-cardinality and continuous features (more candidate thresholds = more chance of a lucky gain). Prefer permutation importance on validation data, or SHAP values.</p>
  <p><b>Missing values:</b> CART in scikit-learn (since 1.3) and XGBoost/LightGBM learn a default direction for missing values at each split.</p>`,
  aiEra: `<p><b>What AI changes:</b> trees are the default for <b>tabular</b> data even in the deep-learning era; benchmarks still show gradient-boosted trees matching or beating neural nets on most business tables. LLM features (embedding similarity, an LLM-extracted "intent" field) are often fed <i>into</i> a tree model as extra columns.</p>
  <p><b>Use AI as a partner:</b> ask an assistant to turn a fitted shallow tree into plain-English rules for the business, or to write unit tests for your hand-written split function using tiny hand-checked cases like the 5/5 example above.</p>
  <p><b>Where AI goes wrong:</b> generated notebooks often train an unlimited-depth tree and report training accuracy, or quote impurity-based feature importance as if it were causal. Some confuse information gain with Gini values.</p>
  <p><b>What you must still own:</b> choosing stopping rules from validation curves, and checking that the "rules" a tree learned are not leaks (a split on <code>refund_issued</code> is a red flag).</p>`,
  problems: [{
    title: 'Pick the root split by hand',
    level: 'Medium', tags: ['decision tree', 'gini', 'information gain'],
    statement: `<p>10 loan applicants, 5 default (D) and 5 repay (R). Split A (<code>income &lt; 40k</code>): left 4D 1R, right 1D 4R. Split B (<code>has_mortgage</code>): left 3D 3R, right 2D 2R. Split C (<code>late_payments ≥ 2</code>): left 3D 0R, right 2D 5R. Which split does CART choose with Gini?</p>`,
    constraints: `Show parent Gini, each child Gini, weighted average and gain.`,
    example: `<p>Split A gain = 0.5 - 0.32 = ${H.c('g', '0.18')}. Split B gain = ${H.c('r', '0')}. Split C gain = 0.5 - 0.7·0.408 = ${H.c('g', '0.214')} → choose C.</p>`,
    brute: { why: `<p>Picking the split that "looks" balanced or has the most intuitive feature. Split A looks symmetric and nice, but C isolates a perfectly pure group and wins on weighted impurity.</p>` },
    mcq: { q: 'A split leaves both children with the same class mix as the parent. Its Gini gain is...', options: ['Maximum', 'Zero', 'Negative', 'Equal to the parent Gini'], answer: 1, explain: 'If each child has the parent mix, each child Gini equals the parent Gini, so the weighted average equals the parent and the gain is 0.' },
    hints: [`<p>Parent: 5/5 → Gini 0.5. Compute each child with 1 - p² - (1-p)².</p>`, `<p>Weight each child by its share of the 10 rows before averaging.</p>`, `<p>C: left 3/0 is pure (0); right 2/5 has Gini 1 - (2/7)² - (5/7)² ≈ 0.408, weight 0.7.</p>`],
    solution: {
      approach: `<p>Parent Gini = 1 - 0.5² - 0.5² = 0.5. <b>Split A:</b> each child 4:1 has Gini 1 - 0.64 - 0.04 = 0.32; weighted 0.32; gain 0.18. <b>Split B:</b> children 3:3 and 2:2 are both 50/50 → Gini 0.5; gain 0 - the feature tells us nothing. <b>Split C:</b> left 3:0 is pure (Gini 0, weight 0.3); right 2:5 has Gini 1 - 0.0816 - 0.5102 = 0.408 (weight 0.7); weighted 0.286; gain 0.214. CART picks <b>C</b>. Note how a split that creates one perfectly pure leaf can beat a symmetric one. With entropy you get A: 1 - 0.722 = 0.278, C: 1 - 0.7·0.863 = 0.396, so the same choice.</p>`,
      dry: { head: ['split', 'children Gini', 'weighted', 'gain'], rows: [['A', '0.32, 0.32', '0.32', '0.18'], ['B', '0.5, 0.5', '0.5', '0'], ['C', '0, 0.408', '0.286', '<b>0.214</b>']] },
      complexity: `<p>O(children) per split by hand; a program does O(features × thresholds × n), or O(features × n log n) with sorting.</p>`,
      followUps: ['Why might you still prefer split A for a business rule?', 'How does a regression tree score splits?']
    }
  }]
});

// ---------------- TOPIC 3: random forests and gradient boosting ----------------
topics.push({
  title: 'Random Forests and Gradient Boosting (XGBoost, LightGBM)',
  analogy: `<p><b>Random forest</b> = asking 500 independent friends, each of whom saw a slightly different slice of the facts, and taking a vote: individual mistakes cancel out. <b>Gradient boosting</b> = a relay of tutors: the first gives a rough answer, the second studies only what the first got wrong, the third fixes what is still wrong, and so on. Forests reduce <i>variance</i>; boosting reduces <i>bias</i> step by step.</p>`,
  explain: `<p><b>Bagging and random forests.</b> Train many deep trees, each on a <b>bootstrap sample</b> (n rows drawn with replacement) and, at each split, only a random subset of features (<code>max_features</code>, e.g. √k for classification). Average (regression) or vote (classification). Deep trees have low bias but high variance; averaging many <i>de-correlated</i> trees keeps the low bias and cuts the variance. Bonus: each tree leaves out ~37% of rows (<b>out-of-bag</b>), which gives a free validation score.</p>
  <p><b>Gradient boosting.</b> Build trees <b>sequentially</b>. Start with a constant (mean, or log-odds of the base rate). Each new <b>shallow</b> tree is fit to the <b>negative gradient of the loss</b> - for squared error that is simply the residuals <code>y - prediction</code>. Add it with a small <b>learning rate</b> (shrinkage, e.g. 0.05). Repeat hundreds or thousands of times, stopping when validation loss stops improving (<b>early stopping</b>).</p>
  ${H.table(['', 'Random forest', 'Gradient boosting'], [['trees', 'deep, independent, parallel', 'shallow (depth 3-8), sequential'], ['reduces', 'variance', 'bias (and variance via shrinkage)'], ['tuning effort', 'low - works out of the box', 'higher - lr, n_trees, depth, regularization'], ['overfits with more trees?', 'no (just plateaus)', 'yes - needs early stopping'], ['typical accuracy on tabular data', 'good', 'usually best']])}
  <p><b>The big three libraries:</b> <b>XGBoost</b> (second-order gradients, L1/L2 on leaf weights, very robust), <b>LightGBM</b> (histogram bins, leaf-wise growth, very fast on big data, native categoricals), <b>CatBoost</b> (ordered target statistics for categoricals, strong defaults). scikit-learn's <code>HistGradientBoosting</code> is the LightGBM-style built-in.</p>
  <p><b>Key boosting knobs:</b> <code>learning_rate</code> × <code>n_estimators</code> (lower lr needs more trees), <code>max_depth</code> / <code>num_leaves</code>, <code>min_child_weight</code> / <code>min_data_in_leaf</code>, <code>subsample</code> and <code>colsample_bytree</code> (row/column sampling like a forest), <code>reg_lambda</code>/<code>reg_alpha</code>, <code>scale_pos_weight</code> for imbalance.</p>`,
  clues: ['"Tabular data, best accuracy, Kaggle-style" → gradient boosting (XGBoost / LightGBM / CatBoost)', '"Strong model with minimal tuning" → random forest', '"Validation loss rises as we add trees" → boosting overfit, use early stopping / lower lr', '"Bagging vs boosting" → variance vs bias, parallel vs sequential', '"Free validation without a holdout" → out-of-bag score', '"100M rows, many categorical features, fast training" → LightGBM histograms / native categoricals'],
  code: [{ lang: 'python', run: true, title: 'Gradient boosting with decision stumps on residuals (stdlib only)', code: `# Boosting for regression with squared error: each stump fits the residuals.
xs = [1, 2, 3, 4, 5, 6, 7, 8]
ys = [5.0, 6.0, 7.5, 8.0, 15.0, 16.5, 17.0, 18.0]

def fit_stump(xs, targets):
    """Best single threshold split minimising squared error; returns (t, left_mean, right_mean)."""
    best = None
    for t in [(a + b) / 2 for a, b in zip(xs, xs[1:])]:
        left = [r for x, r in zip(xs, targets) if x <= t]
        right = [r for x, r in zip(xs, targets) if x > t]
        lm, rm = sum(left) / len(left), sum(right) / len(right)
        sse = sum((r - lm) ** 2 for r in left) + sum((r - rm) ** 2 for r in right)
        if best is None or sse < best[0]:
            best = (sse, t, lm, rm)
    return best[1:]

lr = 0.5
pred = [sum(ys) / len(ys)] * len(ys)          # stage 0: predict the mean
for stage in range(1, 6):
    residuals = [y - p for y, p in zip(ys, pred)]   # negative gradient of 0.5*(y-p)^2
    t, lm, rm = fit_stump(xs, residuals)
    pred = [p + lr * (lm if x <= t else rm) for x, p in zip(xs, pred)]
    mse = sum((y - p) ** 2 for y, p in zip(ys, pred)) / len(ys)
    print(f"stage {stage}: stump split x<={t}, train MSE = {mse:.3f}")
print("final predictions:", [round(p, 2) for p in pred])` }, { lang: 'python', check: false, title: 'LightGBM with early stopping (needs the library)', code: `import lightgbm as lgb

model = lgb.LGBMClassifier(
    n_estimators=5000,        # upper bound; early stopping picks the real number
    learning_rate=0.03,
    num_leaves=31, min_child_samples=50,
    subsample=0.8, subsample_freq=1, colsample_bytree=0.8,
    reg_lambda=1.0,
)
model.fit(X_train, y_train,
          eval_set=[(X_valid, y_valid)], eval_metric="auc",
          callbacks=[lgb.early_stopping(200)])
print(model.best_iteration_)` }],
  viz: [{
    title: 'Boosting stages: each stump fixes what is left',
    input: '5 6 7.5 8 15 16.5 17 18',
    inputLabel: 'Target values y for x = 1, 2, 3 ... (4-10 numbers)',
    gen: function (input) {
      var ys = nums(input, 10);
      if (ys.length < 4) throw new Error('Enter at least 4 numbers');
      var n = ys.length, xs = ys.map(function (_, i) { return i + 1; }), lr = 0.5, mean = ys.reduce(function (a, b) { return a + b; }, 0) / n;
      var pred = ys.map(function () { return mean; }), frames = [];
      function mse() { var s = 0; for (var i = 0; i < n; i++) s += (ys[i] - pred[i]) * (ys[i] - pred[i]); return s / n; }
      frames.push({ narr: 'Stage 0: predict the mean <b>' + r2(mean) + '</b> for everyone. Bars are the residuals y - prediction: what is still unexplained. Train MSE = ' + r2(mse()) + '.', parts: [{ type: 'bars', label: 'residuals', values: ys.map(function (y, i) { return r2(y - pred[i]); }), idxLabels: xs.map(String) }, { type: 'vars', vals: { stage: 0, mse: r2(mse()), lr: lr } }] });
      for (var s = 1; s <= 6; s++) {
        var res = ys.map(function (y, i) { return y - pred[i]; }), best = null;
        for (var k = 1; k < n; k++) {
          var L = res.slice(0, k), R = res.slice(k), lm = L.reduce(function (a, b) { return a + b; }, 0) / L.length, rm = R.reduce(function (a, b) { return a + b; }, 0) / R.length, sse = 0;
          L.forEach(function (v) { sse += (v - lm) * (v - lm); }); R.forEach(function (v) { sse += (v - rm) * (v - rm); });
          if (!best || sse < best.sse) best = { sse: sse, k: k, lm: lm, rm: rm };
        }
        for (var i = 0; i < n; i++) pred[i] += lr * (i < best.k ? best.lm : best.rm);
        var hl = {}; for (i = 0; i < n; i++) hl[i] = i < best.k ? 'win' : 'cur';
        frames.push({ narr: 'Stage ' + s + ': a stump splits at x ≤ ' + (best.k + 0.5) + ' and predicts the average residual on each side (' + r2(best.lm) + ' / ' + r2(best.rm) + '). We add only <b>lr = 0.5</b> of it, so residuals shrink gradually. Train MSE = <b>' + r2(mse()) + '</b>.', parts: [{ type: 'bars', label: 'residuals after stage ' + s, values: ys.map(function (y, i) { return r2(y - pred[i]); }), hl: hl, idxLabels: xs.map(String) }, { type: 'vars', vals: { stage: s, split: 'x ≤ ' + (best.k + 0.5), mse: r2(mse()) }, hl: { mse: 'ok' } }] });
      }
      frames.push({ narr: 'Training error keeps falling with every stage - that is exactly why boosting can overfit. In practice you watch <b>validation</b> loss and stop when it stops improving (early stopping).', parts: [{ type: 'bars', label: 'final predictions', values: pred.map(r2), idxLabels: xs.map(String) }, { type: 'bars', label: 'targets', values: ys.slice(), idxLabels: xs.map(String) }] });
      return frames;
    }
  }],
  examples: [
    { title: 'Why bootstrap leaves out 37%', html: `<p>Chance a given row is never picked in n draws with replacement = (1 - 1/n)<sup>n</sup> → e<sup>-1</sup> ≈ <b>0.368</b>. So each tree has ~37% of rows it never saw, and averaging the predictions of only those trees for each row gives the OOB score.</p>` },
    { title: 'Averaging reduces variance', html: `<p>If B trees each have variance σ² and pairwise correlation ρ, the average has variance <code>ρσ² + (1-ρ)σ²/B</code>. More trees kill the second term; only de-correlation (random feature subsets) attacks the first. With ρ = 0.3 and σ² = 1, 500 trees give ≈ 0.30 instead of 1.</p>` },
    { title: 'learning rate × trees trade-off', html: `${H.table(['learning_rate', 'best #trees (early stop)', 'valid AUC'], [['0.3', '120', '0.861'], ['0.1', '380', '0.868'], ['0.03', '1,250', '<b>0.871</b>'], ['0.01', '3,900', '0.871']])}<p>Smaller steps generalise a bit better but cost more trees; 0.03-0.1 is a common sweet spot.</p>` },
    { title: 'Boosting for classification', html: `<p>For log loss the model works in log-odds. Stage 0 = log(p/(1-p)) of the base rate. Each tree fits the gradient <code>y - p</code> (residual in probability space) and XGBoost also uses the second derivative <code>p(1-p)</code> to size leaf values (a Newton step).</p>` }
  ],
  deepDive: `<p><b>XGBoost's objective.</b> For each tree it minimises a second-order Taylor approximation: ∑[g<sub>i</sub>f(x<sub>i</sub>) + ½h<sub>i</sub>f(x<sub>i</sub>)²] + γT + ½λ∑w<sub>j</sub>². The optimal leaf weight is <code>w* = -G/(H + λ)</code> and split gain is ½[G<sub>L</sub>²/(H<sub>L</sub>+λ) + G<sub>R</sub>²/(H<sub>R</sub>+λ) - G²/(H+λ)] - γ. That is where <code>reg_lambda</code>, <code>gamma</code> and <code>min_child_weight</code> (minimum ∑h in a leaf) come from.</p>
  <p><b>Level-wise vs leaf-wise.</b> XGBoost (default) grows level by level; LightGBM grows the leaf with the largest gain, which reaches lower loss with fewer leaves but can overfit small data - control it with <code>num_leaves</code> and <code>min_data_in_leaf</code>. LightGBM also uses GOSS (keep large-gradient rows, sample small ones) and EFB (bundle mutually exclusive sparse features).</p>
  <p><b>Feature importance</b>: split counts and gain importances are biased; use permutation importance or TreeSHAP (exact Shapley values for trees in polynomial time) for explanations.</p>
  <p><b>Serving:</b> prediction cost is O(trees × depth); 2,000 trees of depth 6 is ~12k comparisons per row - fine on CPU, but watch p99 latency. Models compile to C or ONNX (e.g. treelite) for speed. Trees cannot extrapolate beyond training targets, so a trend (prices rising over time) needs a detrended target or a linear component.</p>
  <p><b>Monotonic constraints</b> (supported by XGBoost/LightGBM) force "higher income never increases default risk" - often required in credit for regulatory explainability.</p>`,
  aiEra: `<p><b>What AI changes:</b> for tabular problems, gradient boosting remains the production workhorse in 2026; tabular foundation models (e.g. TabPFN-style models) are competitive on small datasets but boosting still dominates large ones. Many "AI" products are an LLM extracting structured fields followed by a LightGBM model that makes the actual decision.</p>
  <p><b>Use AI as a partner:</b> let an assistant scaffold the training script, an Optuna search space and SHAP plots. Ask it <code>Which of these hyper-parameters most likely causes overfitting given train AUC 0.99 and valid 0.84?</code></p>
  <p><b>Where AI goes wrong:</b> it often sets <code>n_estimators=1000</code> with no early stopping, tunes on the test set, or copies Kaggle parameter blobs (huge <code>num_leaves</code>) onto 5,000-row datasets.</p>
  <p><b>What you must still own:</b> a leak-free validation scheme, early stopping on validation (not test), and the judgement of whether +0.003 AUC is worth a 10× bigger model.</p>`,
  problems: [{
    title: 'Diagnose a boosting run',
    level: 'Medium', tags: ['gradient boosting', 'early stopping', 'overfitting'],
    statement: `<p>LightGBM, learning_rate 0.3, num_leaves 255, 2,000 trees, no early stopping, 20k rows. Train AUC 0.999, validation AUC peaked at 0.86 around tree 90 and is now 0.83. What happened and what four changes would you make?</p>`,
    constraints: `Give the diagnosis and concrete parameter values.`,
    example: `<p>${H.c('r', 'Overfitting')}: too many trees at a high lr with very complex trees on a small dataset. Fix: early stopping, lr 0.05, num_leaves 31, min_data_in_leaf 50, subsample/colsample 0.8.</p>`,
    brute: { why: `<p>Keeping all 2,000 trees because "more trees = better", or picking the best tree count by looking at the test set. Both give an optimistic, unrepeatable number.</p>` },
    mcq: { q: 'Validation loss starts rising after tree 90 while train loss keeps falling. The best single action is...', options: ['Add more trees', 'Use early stopping on a validation set', 'Raise the learning rate', 'Remove the validation set'], answer: 1, explain: 'Boosting keeps fitting training noise. Early stopping keeps the model from the iteration with the best validation score.' },
    hints: [`<p>Compare train and validation AUC: a big gap means variance, not bias.</p>`, `<p>Which knobs make each tree simpler and each step smaller? Which add randomness?</p>`, `<p>Recipe: lr down, early stopping on, leaves down, minimum leaf size up, row/column subsampling, maybe L2 on leaves; then check validation with CV.</p>`],
    solution: {
      approach: `<p>The model is <b>overfitting</b>: 255-leaf trees on 20k rows can isolate tiny groups, a learning rate of 0.3 takes big steps, and with no early stopping the 1,910 trees after the optimum only memorise noise (train 0.999 vs valid 0.83). Changes: (1) turn on <b>early stopping</b> (e.g. 100-200 rounds patience) on a validation fold and set n_estimators high; (2) lower <b>learning_rate</b> to 0.03-0.05; (3) reduce <b>num_leaves</b> to 15-63 and raise <b>min_data_in_leaf</b> to 50-200; (4) add <b>subsample=0.8, colsample_bytree=0.8</b> and <b>reg_lambda=1-10</b>. Then tune with 5-fold CV (stratified) and confirm once on the held-out test. Also check for leakage: 0.999 train AUC is suspicious if even shallow trees give 0.99.</p>`,
      dry: { head: ['setting', 'before', 'after'], rows: [['learning_rate', '0.3', '0.05'], ['num_leaves', '255', '31'], ['min_data_in_leaf', '20 (default)', '100'], ['subsample / colsample', '1.0 / 1.0', '0.8 / 0.8'], ['trees', '2000 fixed', 'early stopping (≈ 600)']] },
      complexity: `<p>Training is roughly O(trees × rows × features / bins); lower lr increases trees, so budget time accordingly.</p>`,
      followUps: ['When would a random forest be the better choice here?', 'How do you pick the final number of trees when retraining on all data?']
    }
  }]
});

// ---------------- TOPIC 4: feature engineering and missing values ----------------
topics.push({
  title: 'Feature Engineering and Missing Values',
  analogy: `<p>A chef does not throw whole potatoes, peel and all, into the pot. They wash, peel, cut and season first. <b>Feature engineering</b> is that kitchen prep for data: turning raw columns into ingredients the model can digest. <b>Missing values</b> are ingredients that never arrived - you can substitute, note that they are missing, or change the recipe, but you cannot pretend they are there.</p>`,
  explain: `<p>On tabular problems, better features beat fancier models. The common moves:</p>
  ${H.table(['raw data', 'engineered feature', 'why it helps'], [['timestamp', 'hour, day_of_week, is_holiday, days_since_signup', 'models cannot read dates'], ['price (skewed)', 'log(price)', 'tames long tails for linear models'], ['city (50 values)', 'one-hot', 'nominal categories for linear models'], ['merchant_id (1M values)', 'target / frequency encoding, or embeddings', 'one-hot would be huge and sparse'], ['transactions table', 'count / sum / mean over last 7 and 30 days', 'aggregates capture behaviour'], ['two columns', 'ratio (debt / income), difference, product', 'expresses interactions explicitly']])}
  <p><b>Encoding categories:</b> one-hot for low cardinality; <b>ordinal</b> only when there is a true order (S &lt; M &lt; L); <b>target encoding</b> (replace a category with the mean label) for high cardinality - but compute it <b>out-of-fold</b> with smoothing, otherwise it leaks the label; <b>frequency encoding</b> (how common the category is) is leak-free and cheap.</p>
  <p><b>Missing values - first ask WHY they are missing:</b></p>
  <ul><li><b>MCAR</b> (missing completely at random, e.g. a sensor glitch): simple imputation is fine.</li>
  <li><b>MAR</b> (depends on other observed columns): impute using those columns (KNN, iterative / model-based imputation).</li>
  <li><b>MNAR</b> (missingness depends on the value itself, e.g. high earners skip "income"): the fact it is missing is a <i>signal</i> - add an <code>is_missing</code> indicator column.</li></ul>
  <p><b>Practical defaults:</b> median for numeric (robust to outliers) + missing indicator; a separate "Missing" category for categoricals; let XGBoost/LightGBM handle NaN natively. Always <b>fit imputers and encoders on training data only</b>, inside a pipeline, and apply the same transform at serving time.</p>`,
  clues: ['"High-cardinality categorical (user_id, zip, merchant)" → target/frequency encoding or embeddings, not one-hot', '"30% of income is missing" → ask why (MCAR/MAR/MNAR), add missing indicator', '"Skewed amounts, long tail" → log transform (for linear models)', '"Model great offline, bad in production" → train/serve skew in feature pipelines', '"Point-in-time correct features" → aggregates must only use data before the prediction moment', '"Target encoding gave 0.99 AUC" → leakage, use out-of-fold encoding'],
  code: [{ lang: 'python', run: true, title: 'Median imputation + missing flag, and out-of-fold target encoding', code: `import statistics

# --- 1) Numeric imputation fitted on TRAIN only ---
train_income = [42, None, 55, 61, None, 38, 120, 47]
valid_income = [None, 50]
median = statistics.median([v for v in train_income if v is not None])   # learned from train
def impute(col):
    return [(median if v is None else v, 1 if v is None else 0) for v in col]
print("train median:", median)
print("valid (value, is_missing):", impute(valid_income))

# --- 2) Out-of-fold target encoding with smoothing ---
cities = ["pune", "pune", "goa", "delhi", "goa", "pune", "delhi", "goa", "pune", "delhi"]
label  = [1, 0, 1, 0, 1, 1, 0, 0, 1, 0]
K, m = 2, 2.0                         # 2 folds, smoothing strength m
prior = sum(label) / len(label)
folds = [i % K for i in range(len(label))]
encoded = [None] * len(label)
for k in range(K):
    stats = {}
    for c, y, f in zip(cities, label, folds):
        if f != k:                    # statistics from the OTHER folds only
            s = stats.setdefault(c, [0, 0]); s[0] += y; s[1] += 1
    for i, (c, f) in enumerate(zip(cities, folds)):
        if f == k:
            tot, cnt = stats.get(c, [0, 0])
            encoded[i] = round((tot + m * prior) / (cnt + m), 3)   # shrink toward prior
print("prior:", prior)
for c, y, e in zip(cities, label, encoded):
    print(f"{c:6s} label={y} encoded={e}")` }, { lang: 'python', check: false, title: 'scikit-learn ColumnTransformer (needs the library)', code: `from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler, TargetEncoder

pre = ColumnTransformer([
    ("num", Pipeline([("imp", SimpleImputer(strategy="median", add_indicator=True)),
                      ("sc", StandardScaler())]), num_cols),
    ("cat", OneHotEncoder(handle_unknown="ignore", min_frequency=20), low_card_cols),
    ("te", TargetEncoder(smooth="auto"), high_card_cols),   # cross-fitted internally
])
model = Pipeline([("pre", pre), ("clf", LogisticRegression(max_iter=2000))])` }],
  viz: [{
    title: 'Imputation choices on one column',
    input: '42 0 55 61 0 38 120 47',
    inputLabel: 'Income values, use 0 for missing (≤ 12 numbers)',
    gen: function (input) {
      var raw = nums(input, 12), present = raw.filter(function (v) { return v !== 0; });
      if (present.length < 2) throw new Error('Need at least 2 non-missing (non-zero) values');
      var sorted = present.slice().sort(function (a, b) { return a - b; }), mid = Math.floor(sorted.length / 2);
      var median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2, mean = present.reduce(function (a, b) { return a + b; }, 0) / present.length;
      var miss = {}; raw.forEach(function (v, i) { if (v === 0) miss[i] = 'bad'; });
      var labels = raw.map(function (v) { return v === 0 ? 'NaN' : String(v); });
      var frames = [];
      frames.push({ narr: 'Raw column. Red = missing. Before choosing a fix, ask <b>why</b> it is missing: a glitch (MCAR), explained by other columns (MAR), or because of the value itself (MNAR, e.g. rich people skip the question).', parts: [{ type: 'array', label: 'income', values: labels, hl: miss }] });
      frames.push({ narr: 'Statistics from the observed (training) values only: mean = <b>' + r2(mean) + '</b>, median = <b>' + median + '</b>. The mean is dragged up by the largest value; the median is robust to it.', parts: [{ type: 'array', label: 'observed values (sorted)', values: sorted, hl: (function () { var h = {}; h[mid] = 'sel'; return h; })() }, { type: 'vars', vals: { mean: r2(mean), median: median } }] });
      frames.push({ narr: 'Option 1 - <b>mean imputation</b>: fills holes with ' + r2(mean) + '. Simple, but shrinks variance and is pulled by outliers.', parts: [{ type: 'array', label: 'mean-imputed', values: raw.map(function (v) { return v === 0 ? r2(mean) : v; }), hl: Object.keys(miss).reduce(function (h, k) { h[k] = 'cur'; return h; }, {}) }] });
      frames.push({ narr: 'Option 2 - <b>median imputation</b>: fills with ' + median + '. The usual default for skewed numeric columns.', parts: [{ type: 'array', label: 'median-imputed', values: raw.map(function (v) { return v === 0 ? median : v; }), hl: Object.keys(miss).reduce(function (h, k) { h[k] = 'ok'; return h; }, {}) }] });
      frames.push({ narr: 'Option 3 - median <b>plus an is_missing flag</b>. If missingness itself predicts the label (MNAR), the model can now learn it. Tree libraries like XGBoost/LightGBM do something similar natively by learning a default branch for NaN.', parts: [{ type: 'array', label: 'income (imputed)', values: raw.map(function (v) { return v === 0 ? median : v; }) }, { type: 'array', label: 'is_missing', values: raw.map(function (v) { return v === 0 ? 1 : 0; }), hl: miss }] });
      return frames;
    }
  }],
  examples: [
    { title: 'Target encoding leak in numbers', html: `<p>Category "merchant_8812" appears once, with label fraud = 1. Naive target encoding gives it 1.0 - the model sees the answer. With out-of-fold encoding its own row is excluded, so it gets the prior (e.g. 0.02); with smoothing m = 10 a category seen 3 times with mean 0.67 becomes (2 + 10·0.02)/(3 + 10) = <b>0.17</b>.</p>` },
    { title: 'Missingness as a signal', html: `${H.table(['income provided?', 'default rate'], [['yes', '4%'], ['<span class="c-r">no</span>', '<span class="c-r">11%</span>']])}<p>Imputing the median and throwing away the fact it was missing hides an almost 3× risk difference. Keep an <code>income_missing</code> flag.</p>` },
    { title: 'Point-in-time aggregates', html: `<p>Feature: "number of chargebacks in the last 30 days". For a training row dated 1 March it must count only chargebacks before 1 March. Computing it from today's table (which includes chargebacks filed in April) leaks the future. Feature stores solve this with point-in-time joins.</p>` },
    { title: 'Train/serve skew', html: `<p>Offline, <code>age</code> was computed in Python with integer division; online, a Java service rounds. Offline age 29, online 30 for the same person - the model silently degrades. Share one feature definition between training and serving and log online features to compare distributions.</p>` }
  ],
  deepDive: `<p><b>Imputation methods.</b> Simple (mean/median/mode/constant) is fast and fine for trees. KNN imputation uses similar rows. Iterative imputation (MICE) models each column from the others in rounds - better for MAR data, costlier, and must still be fitted on training folds. For inference you need the <i>same</i> fitted imputer, so persist it with the model.</p>
  <p><b>Scaling.</b> Linear models, SVMs, KNN and neural nets need scaled features (standardization, or robust scaling with median/IQR when outliers exist). Trees do not. Log or Box-Cox/Yeo-Johnson transforms reduce skew for linear models.</p>
  <p><b>High cardinality.</b> Options: hashing trick (fixed number of buckets, collisions accepted), frequency encoding, out-of-fold target encoding (scikit-learn TargetEncoder cross-fits internally), CatBoost ordered statistics, or learned embeddings. Rare categories should be grouped into "Other" to avoid overfitting.</p>
  <p><b>Feature selection:</b> drop leaks and near-constant columns first; then use L1, permutation importance on validation, or recursive elimination. Selecting features using the full dataset before CV is itself leakage - selection belongs inside the CV loop.</p>
  <p><b>Outliers:</b> decide if they are errors (fix/drop) or real rare events (keep - in fraud they ARE the signal). Clipping at the 1st/99th percentile (winsorizing) is a common middle ground for linear models.</p>`,
  aiEra: `<p><b>What AI changes:</b> LLMs are now a feature-engineering tool: embed free-text fields (support tickets, product descriptions) and feed the embedding or a cluster id to the model, or ask an LLM to extract structured attributes ("complaint type", "urgency") from text at scale. Embedding columns are high-dimensional, so reduce them (PCA) or let boosting handle them.</p>
  <p><b>Use AI as a partner:</b> describe your tables and prediction moment and ask <code>Brainstorm 30 candidate features and mark which could leak future information.</code> Assistants are good at brainstorming aggregates and date features quickly.</p>
  <p><b>Where AI goes wrong:</b> it computes target encodings or scalers on the full dataset, uses <code>df.fillna(df.mean())</code> before the split, and generates features from columns that only exist after the outcome.</p>
  <p><b>What you must still own:</b> the point-in-time correctness of every feature, the missing-data story (why is it missing?), and keeping offline and online feature code identical.</p>`,
  problems: [{
    title: 'Design features for a food-delivery ETA model',
    level: 'Medium', tags: ['feature engineering', 'missing values', 'leakage'],
    statement: `<p>Predict delivery time at the moment an order is placed. Raw data: order timestamp, restaurant_id (40k values), customer lat/long, restaurant lat/long, basket items, courier GPS pings during the trip, actual pickup time, weather (missing for 15% of orders because a weather API was down). Propose features, encodings and missing-value handling, and name any leaks.</p>`,
    constraints: `Group your answer into: time, location, categorical, aggregates, missing data, leaks.`,
    example: `<p>${H.c('g', 'Good')}: haversine distance, hour × weekday, restaurant's median prep time over the last 7 days. ${H.c('r', 'Leak')}: courier GPS pings during the trip and actual pickup time - not known at order time.</p>`,
    brute: { why: `<p>Dumping every raw column into the model: one-hot of 40k restaurant ids, raw lat/long, and the trip GPS data. The model looks amazing offline because of the leaked trip data and collapses in production.</p>` },
    mcq: { q: 'The weather API was down for 15% of orders at random times. A good default is...', options: ['Drop those orders', 'Impute (e.g. median / last known value) and add a weather_missing flag', 'Fill with 0', 'Ignore weather entirely'], answer: 1, explain: 'An outage is close to MCAR, so imputation is reasonable; the flag lets the model learn if missingness matters. Dropping rows loses data and biases if outages cluster at certain times.' },
    hints: [`<p>Start from the prediction moment: order placed. Anything recorded after it is off-limits.</p>`, `<p>40k restaurant ids: think target encoding (out-of-fold) or rolling restaurant statistics instead of one-hot.</p>`, `<p>Recipe: time features, distance, restaurant/area rolling aggregates up to the order time, basket size, weather + missing flag; drop trip GPS and pickup time.</p>`],
    solution: {
      approach: `<p><b>Time:</b> hour of day, day of week, is_holiday, minutes since lunch/dinner peak. <b>Location:</b> haversine distance restaurant→customer, origin and destination zone ids, a rough road-distance estimate. <b>Categorical:</b> restaurant_id via out-of-fold target encoding with smoothing, or better, rolling statistics: the restaurant's median prep time and number of open orders in the last 30 minutes (computed point-in-time). <b>Basket:</b> item count, has_slow_items (pizza vs drinks). <b>Aggregates:</b> active couriers in the zone, orders per courier now. <b>Missing data:</b> weather down for 15% at random → impute with last known value for the zone (or median) and add <code>weather_missing</code>; tree models can also take NaN directly. <b>Leaks:</b> courier GPS pings during the trip and actual pickup time happen after the prediction moment - excluded (they could feed a second, in-trip ETA model). Validate with a time-based split, because traffic and menus drift.</p>`,
      dry: { head: ['raw', 'feature', 'status'], rows: [['timestamps', 'hour, weekday, peak flag', 'ok'], ['lat/long × 2', 'haversine km', 'ok'], ['restaurant_id', 'rolling median prep time', 'ok (point-in-time)'], ['weather', 'value + missing flag', 'ok'], ['GPS during trip', '-', '<span class="c-r">leak, drop</span>'], ['actual pickup time', '-', '<span class="c-r">leak, drop</span>']] },
      complexity: `<p>Rolling aggregates need a streaming or windowed store; computing them per request must stay within the latency budget (e.g. &lt; 20 ms).</p>`,
      followUps: ['How would you build a second ETA model that updates during the trip?', 'How do you detect train/serve skew for these features?']
    }
  }]
});

// ---------------- TOPIC 5: imbalanced data ----------------
topics.push({
  title: 'Imbalanced Data: Class Weights, Resampling and Thresholds',
  analogy: `<p>Airport security sees one dangerous bag in a million. A guard who waves everyone through is "99.9999% accurate" and completely useless. To train a good guard you show them more dangerous bags than reality (resampling), punish missed threats harder than false alarms (class weights), and set how suspicious they must be before opening a bag (threshold).</p>`,
  explain: `<p><b>Imbalanced data</b> means one class is rare: fraud (0.1-1%), churn (5%), disease (1%), click (2%). Problems: accuracy is meaningless, the model can ignore the minority class and still look good, and the few positives make validation scores noisy.</p>
  <p><b>The toolbox, in the order I would try it:</b></p>
  ${H.table(['technique', 'what it does', 'notes'], [['Right metric', 'PR-AUC, recall at fixed precision, cost', 'do this first - always'], ['Stratified splits', 'same positive rate in every fold', 'otherwise some folds have ~0 positives'], ['Threshold tuning', 'move the 0.5 cut-off using validation data', 'often the single biggest win, zero retraining'], ['Class weights', 'loss counts each positive w times', '<code>class_weight="balanced"</code>, <code>scale_pos_weight = neg/pos</code>'], ['Undersample majority', 'drop many negatives', 'fast training; probabilities need correcting'], ['Oversample / SMOTE', 'duplicate or synthesise positives', 'only on training folds; SMOTE helps less than people think with boosting'], ['More positive data / anomaly detection', 'collect labels, or model "normal" only', 'when positives are extremely rare']])}
  <p><b>Key idea:</b> weights and resampling change the model's <i>scores</i> (they effectively shift the prior), while threshold tuning changes only the <i>decision</i>. For a model that already ranks well, choosing a better threshold often gives the same benefit as reweighting.</p>
  <p><b>Golden rule:</b> resample <b>only the training data</b>, inside each CV fold. Validation and test must keep the real-world class ratio or your metrics lie.</p>
  <p><b>Probabilities after resampling:</b> if you trained on a 1:1 sample but reality is 1:99, raw probabilities are far too high. Correct them (prior correction or recalibrate on untouched validation data) before using them as risk scores.</p>`,
  clues: ['"Fraud is 0.2% of transactions" / "rare disease" → imbalanced classification', '"99% accuracy but catches no fraud" → accuracy paradox, use PR-AUC / recall', '"Should we use SMOTE?" → resample only training folds; try class weights + threshold first', '"Cost of a missed fraud is 50× a false alarm" → cost-based threshold', '"Probabilities too high after undersampling" → prior correction / recalibration', '"scale_pos_weight" / "class_weight=balanced" → loss reweighting'],
  code: [{ lang: 'python', run: true, title: 'Choose a threshold by expected cost (stdlib only)', code: `# Validation scores and true labels (1 = fraud). Real-world ratio kept.
scores = [0.95, 0.90, 0.80, 0.72, 0.65, 0.60, 0.40, 0.35, 0.30, 0.22, 0.15, 0.10, 0.08, 0.05, 0.02]
labels = [1,    1,    0,    1,    0,    0,    1,    0,    0,    0,    0,    0,    0,    0,    0   ]
COST_FN, COST_FP = 50, 1          # a missed fraud costs 50x a false alarm

def confusion(th):
    tp = sum(1 for s, y in zip(scores, labels) if s >= th and y == 1)
    fp = sum(1 for s, y in zip(scores, labels) if s >= th and y == 0)
    fn = sum(1 for s, y in zip(scores, labels) if s < th and y == 1)
    return tp, fp, fn

best = None
for th in sorted(set(scores), reverse=True) + [0.0]:
    tp, fp, fn = confusion(th)
    cost = COST_FN * fn + COST_FP * fp
    prec = tp / (tp + fp) if tp + fp else 1.0
    rec = tp / (tp + fn)
    print(f"th={th:.2f}  TP={tp} FP={fp} FN={fn}  precision={prec:.2f} recall={rec:.2f}  cost={cost}")
    if best is None or cost < best[0]:
        best = (cost, th)
print("cheapest threshold:", best[1], "with cost", best[0])
print("theory for calibrated p: predict fraud when p >", round(COST_FP / (COST_FP + COST_FN), 3))` }, { lang: 'python', run: true, title: 'Correct probabilities after undersampling', code: `# Trained on a sample where negatives were kept with rate beta (e.g. 1 in 50).
def correct(p_sampled, beta):
    """Map a probability from the undersampled world back to the real world."""
    return beta * p_sampled / (beta * p_sampled - p_sampled + 1)

beta = 1 / 50
for p in (0.5, 0.8, 0.95):
    print(f"model says {p:.2f} on the balanced sample -> real-world p = {correct(p, beta):.3f}")` }],
  viz: [{
    title: 'Sliding the threshold on an imbalanced validation set',
    input: '50',
    inputLabel: 'Cost of a missed positive relative to a false alarm (1-200)',
    gen: function (input) {
      var cfn = Number(String(input).trim());
      if (isNaN(cfn) || cfn < 1 || cfn > 200) throw new Error('Enter a number between 1 and 200');
      var s = [0.95, 0.9, 0.8, 0.72, 0.65, 0.6, 0.4, 0.35, 0.3, 0.22, 0.15, 0.1], y = [1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0];
      var ths = [0.99, 0.85, 0.7, 0.5, 0.38, 0.2, 0.05], frames = [], best = null;
      ths.forEach(function (t) {
        var tp = 0, fp = 0, fn = 0, hl = {};
        s.forEach(function (v, i) { var p = v >= t; if (p && y[i]) { tp++; hl[i] = 'ok'; } else if (p) { fp++; hl[i] = 'bad'; } else if (y[i]) { fn++; hl[i] = 'cur'; } else hl[i] = 'done'; });
        var cost = cfn * fn + fp, prec = tp + fp ? tp / (tp + fp) : 1, rec = tp / 4;
        var isBest = !best || cost < best.cost; if (isBest) best = { cost: cost, t: t };
        frames.push({ narr: 'Threshold <b>' + t + '</b>: everything with score ≥ ' + t + ' is flagged. Green = caught positive, red = false alarm, amber = missed positive. Precision ' + r2(prec) + ', recall ' + r2(rec) + ', cost = ' + cfn + '×' + fn + ' + ' + fp + ' = <b>' + cost + '</b>' + (isBest ? ' <span class="c-g">(cheapest so far)</span>' : '') + '.', parts: [{ type: 'bars', label: 'scores (4 positives at 0.95, 0.90, 0.72, 0.40)', values: s, hl: hl }, { type: 'vars', vals: { threshold: t, TP: tp, FP: fp, FN: fn, precision: r2(prec), recall: r2(rec), cost: cost }, hl: { cost: isBest ? 'ok' : 'cur' } }] });
      });
      frames.push({ narr: 'Best threshold for cost ratio ' + cfn + ':1 is <b>' + best.t + '</b>. The more a miss costs, the lower the threshold goes - you accept more false alarms to catch more positives. Default 0.5 is almost never right for imbalanced problems.', parts: [{ type: 'vars', vals: { cost_ratio: cfn + ':1', best_threshold: best.t, best_cost: best.cost }, hl: { best_threshold: 'sel' } }] });
      return frames;
    }
  }],
  examples: [
    { title: 'scale_pos_weight', html: `<p>Training set: 99,000 negatives, 1,000 positives. XGBoost <code>scale_pos_weight = 99000/1000 = 99</code>: each positive's gradient counts 99 times, so both classes contribute equally to the loss. Good for ranking (AUC), but predicted probabilities are inflated - recalibrate if you need real probabilities.</p>` },
    { title: 'Resampling before the split (a classic bug)', html: `<p>Team runs SMOTE on all data, then splits. Synthetic points created from a test positive's neighbours land in training: the model has seen near-copies of test rows. Reported recall 0.92; production 0.55. Correct order: split → resample training fold only → evaluate on untouched data.</p>` },
    { title: 'Prior correction', html: `<p>Kept 1 in 50 negatives (β = 0.02). Model says p<sub>s</sub> = 0.8. Real-world p = βp<sub>s</sub>/(βp<sub>s</sub> - p<sub>s</sub> + 1) = 0.016/(0.016 - 0.8 + 1) = 0.016/0.216 ≈ <b>0.074</b>. The "80% fraud" was really 7%.</p>` },
    { title: 'Noisy metrics with few positives', html: `<p>Validation has 40 fraud cases. Catching 30 vs 32 changes recall from 0.75 to 0.80 - just 2 cases. Report confidence intervals (bootstrap), use repeated stratified CV, and do not chase 0.01 improvements.</p>` }
  ],
  deepDive: `<p><b>Why reweighting and thresholding are related.</b> Weighting positives by w during training is (for a well-specified model) equivalent to multiplying the predicted odds by w. So for a model that ranks well, the same decisions can be reached by moving the threshold; reweighting helps more when model capacity is limited and the minority region would otherwise be under-fit.</p>
  <p><b>SMOTE</b> creates synthetic positives by interpolating between a positive and one of its k nearest positive neighbours. It assumes the space between positives is also positive (bad for fraud rings or categorical data), and studies show little gain over class weights for strong learners like gradient boosting. Variants: Borderline-SMOTE, SMOTE-NC for categoricals.</p>
  <p><b>Focal loss</b> (from object detection) down-weights easy examples: <code>-(1-p)<sup>γ</sup> log p</code>; useful when the many easy negatives dominate the gradient.</p>
  <p><b>Extreme imbalance</b> (1 in 10<sup>6</sup>): treat as anomaly detection (isolation forest, autoencoders) or use rules + a model on a pre-filtered candidate set (two-stage systems). <b>Label delay</b>: chargebacks arrive weeks later, so recent data has "not yet fraud" labels - exclude the most recent weeks from training labels.</p>
  <p><b>Evaluation:</b> stratified k-fold, PR-AUC, recall at fixed precision, and expected cost; bootstrap CIs for all of them.</p>`,
  aiEra: `<p><b>What AI changes:</b> LLMs can generate synthetic minority examples for <i>text</i> problems (rare intents, rare complaint types) far better than SMOTE ever could; teams also use LLMs as zero-shot labelers to find more candidate positives that humans then confirm.</p>
  <p><b>Use AI as a partner:</b> give the assistant your costs and ask it to write the threshold-sweep code and a bootstrap confidence interval for recall. Ask it to review your notebook specifically for "resampling before split".</p>
  <p><b>Where AI goes wrong:</b> it reflexively adds SMOTE to every imbalanced problem, applies it before the split, and evaluates on the resampled data. Synthetic LLM text can also be too clean, so the model learns style, not substance.</p>
  <p><b>What you must still own:</b> the cost ratio (a business decision), keeping evaluation data at the real class ratio, and correcting probabilities before anyone treats them as real risk.</p>`,
  problems: [{
    title: 'Fix a fraud model pipeline',
    level: 'Medium', tags: ['imbalanced', 'resampling', 'threshold'],
    statement: `<p>A colleague's fraud pipeline: (1) oversample frauds with SMOTE on the full dataset to 50/50, (2) random 80/20 split, (3) train XGBoost, (4) report accuracy 96% and use threshold 0.5 in production, (5) send the predicted probability to the risk team as "chance of fraud". Fraud is 0.3% in reality. List every problem and a corrected pipeline.</p>`,
    constraints: `At least four problems, each with a fix.`,
    example: `<p>${H.c('r', 'Problem')}: SMOTE before split leaks. ${H.c('g', 'Fix')}: split by time first, resample only training folds (or use scale_pos_weight).</p>`,
    brute: { why: `<p>Only fixing the metric (switching to F1) while keeping the leaky resampling and 50/50 test set: the numbers are still from a world that does not exist.</p>` },
    mcq: { q: 'Where should resampling happen?', options: ['On the full dataset before splitting', 'Only on the training part of each fold', 'Only on the test set', 'On validation and test'], answer: 1, explain: 'Evaluation data must reflect reality and must not contain synthetic neighbours of training rows; resample only inside training folds.' },
    hints: [`<p>Walk through the steps and ask: does the evaluation data still look like production?</p>`, `<p>Think about leakage from SMOTE, the metric, the threshold and what probabilities mean after a 50/50 resample.</p>`, `<p>Corrected: time split → train with class weights (or resample train only) → PR-AUC / recall at precision → cost-based threshold on validation → calibrate on untouched data.</p>`],
    solution: {
      approach: `<p>Problems: (1) <b>SMOTE before the split</b> puts synthetic near-copies of test frauds into training - leakage. (2) A <b>50/50 test set</b> does not reflect the 0.3% reality, so every metric is wrong; a random split also ignores time drift. (3) <b>Accuracy</b> is meaningless at 0.3% (always-legit gets 99.7%). (4) <b>Threshold 0.5</b> was never chosen for the real cost ratio. (5) Probabilities from a 50/50-trained model are hugely <b>inflated</b> - not a "chance of fraud". Corrected pipeline: split by time (train on older months, validate on the next, test on the latest); train XGBoost with <code>scale_pos_weight</code> (or resample the training fold only); evaluate with PR-AUC and recall at the precision the ops team can handle; choose the threshold on validation by expected cost; calibrate probabilities (isotonic/Platt) on untouched validation data or apply prior correction; report the test result once with bootstrap confidence intervals.</p>`,
      dry: { head: ['step', 'before', 'after'], rows: [['resample', 'SMOTE on all data', 'class weights / train fold only'], ['split', 'random 80/20', 'time-based'], ['metric', 'accuracy', 'PR-AUC, recall@precision, cost'], ['threshold', '0.5', 'cost-optimal on validation'], ['probabilities', 'raw', 'calibrated / prior-corrected']] },
      complexity: `<p>Threshold sweep is O(n log n) (sort scores once); calibration is O(n log n) for isotonic.</p>`,
      followUps: ['How would you handle labels that arrive 60 days late?', 'When would you treat this as anomaly detection instead?']
    }
  }]
});

// ---------------- TOPIC 6: metrics beyond accuracy ----------------
topics.push({
  title: 'Metrics in Depth: ROC-AUC, PR-AUC, Calibration and Multi-class',
  analogy: `<p>Judging a model by one number is like judging a restaurant only by its average star rating. <b>ROC-AUC</b> asks "if I pick one good and one bad dish, how often does the chef rank the good one higher?". <b>PR-AUC</b> asks "of the dishes the chef recommends, how many are actually good, as they recommend more and more?". <b>Calibration</b> asks "when the menu says 80% of people love this, do 80% actually love it?".</p>`,
  explain: `<p>ML Foundations covered the confusion matrix, precision, recall, F1 and the ROC idea. Here is what interviewers probe next.</p>
  <p><b>ROC-AUC</b> = probability that a random positive gets a higher score than a random negative (ties count half). 0.5 = random, 1.0 = perfect ranking. It is <b>insensitive to class imbalance</b> because both TPR and FPR are computed within their own class - which is good for comparing rankers, but it can look great (0.95) while precision at any useful threshold is terrible, because FPR = 0.01 of a million negatives is still 10,000 false alarms.</p>
  <p><b>PR-AUC / Average Precision (AP)</b> = area under precision vs recall. Its baseline is the <b>positive rate</b> (0.01 for 1% fraud), not 0.5. It focuses on the positive class and on the top of the ranking, so it is the usual headline metric for rare-event problems.</p>
  ${H.table(['situation', 'prefer'], [['balanced classes, compare ranking quality', 'ROC-AUC'], ['rare positives, you care about alerts', 'PR-AUC / AP, precision@k, recall@precision'], ['probabilities drive money (pricing, risk)', 'log loss, Brier score, calibration curve'], ['fixed review capacity (100 cases/day)', 'precision@100']])}
  <p><b>Calibration:</b> a model is calibrated if, among rows scored 0.8, about 80% are positive. Check with a <b>reliability diagram</b> (bin scores, plot mean score vs actual rate) and the Brier score. Fix with <b>Platt scaling</b> (a logistic fit on the scores) or <b>isotonic regression</b> (a monotone step function), trained on held-out data.</p>
  <p><b>Multi-class:</b> <b>macro</b> average = mean of per-class metrics (every class equal - highlights rare classes); <b>micro</b> = pool all TP/FP/FN (dominated by big classes; equals accuracy for single-label problems); <b>weighted</b> = macro weighted by class size. Always look at the per-class report and the confusion matrix.</p>
  <p><b>Regression metrics:</b> RMSE (penalises big errors), MAE (robust, in units), MAPE (relative, explodes near zero), R² (share of variance explained; can be negative on test data).</p>`,
  clues: ['"Rare positives, which AUC?" → PR-AUC / average precision', '"ROC-AUC is 0.97 but the ops team drowns in false alarms" → low precision at the operating point', '"Probability that a random positive ranks above a random negative" → ROC-AUC definition', '"Does 0.8 really mean 80%?" → calibration, reliability diagram, Platt / isotonic', '"Macro vs micro F1" → equal weight per class vs pooled counts', '"We can only review 200 cases per day" → precision@k'],
  code: [{ lang: 'python', run: true, title: 'ROC-AUC by pair counting and by ranks, plus average precision', code: `scores = [0.9, 0.8, 0.7, 0.6, 0.55, 0.5, 0.4, 0.3, 0.2, 0.1]
labels = [1,   1,   0,   1,   0,    0,   1,   0,   0,   0  ]

# 1) Definition: fraction of (positive, negative) pairs ranked correctly; ties count 0.5
pos = [s for s, y in zip(scores, labels) if y == 1]
neg = [s for s, y in zip(scores, labels) if y == 0]
pairs = sum(1.0 if p > n else 0.5 if p == n else 0.0 for p in pos for n in neg)
print("ROC-AUC (pairs):", round(pairs / (len(pos) * len(neg)), 4))

# 2) Same thing in O(n log n) with ranks (Mann-Whitney U); average ranks for ties
order = sorted(range(len(scores)), key=lambda i: scores[i])
ranks = [0.0] * len(scores)
i = 0
while i < len(order):
    j = i
    while j + 1 < len(order) and scores[order[j + 1]] == scores[order[i]]:
        j += 1
    for k in range(i, j + 1):
        ranks[order[k]] = (i + j) / 2 + 1      # average 1-based rank
    i = j + 1
rank_sum = sum(r for r, y in zip(ranks, labels) if y == 1)
P, N = len(pos), len(neg)
print("ROC-AUC (ranks):", round((rank_sum - P * (P + 1) / 2) / (P * N), 4))

# 3) Average precision = mean of precision at the rank of each positive
ranked = sorted(zip(scores, labels), reverse=True)
tp, ap = 0, 0.0
for k, (s, y) in enumerate(ranked, start=1):
    if y == 1:
        tp += 1
        ap += tp / k
print("Average precision (PR-AUC):", round(ap / P, 4), "| baseline =", P / len(labels))` }, { lang: 'python', run: true, title: 'Reliability check and Brier score', code: `scores = [0.9, 0.85, 0.8, 0.75, 0.7, 0.3, 0.25, 0.2, 0.15, 0.1]
labels = [1,   0,    0,   1,    0,   0,   1,    0,   0,    0  ]
brier = sum((s - y) ** 2 for s, y in zip(scores, labels)) / len(scores)
print("Brier score:", round(brier, 3))
for lo, hi in ((0.0, 0.5), (0.5, 1.01)):
    b = [(s, y) for s, y in zip(scores, labels) if lo <= s < hi]
    mean_s = sum(s for s, _ in b) / len(b)
    rate = sum(y for _, y in b) / len(b)
    print(f"bin [{lo}, {min(hi, 1.0)}): mean score {mean_s:.2f} vs actual rate {rate:.2f}")
print("High bin is over-confident -> calibrate with Platt or isotonic on held-out data")` }],
  viz: [{
    title: 'Build the ROC curve one threshold at a time',
    input: '0.9 0.8 0.7 0.6 0.55 0.5 0.4 0.3 | 1 1 0 1 0 0 1 0',
    inputLabel: 'Scores | labels 0/1 (same length, ≤ 12, both classes present)',
    gen: function (input) {
      var p = String(input).split('|');
      if (p.length !== 2) throw new Error('Use: scores | labels');
      var s = nums(p[0], 12), y = nums(p[1], 12);
      if (s.length !== y.length) throw new Error('Same number of scores and labels please');
      var P = y.filter(function (v) { return v === 1; }).length, N = y.length - P;
      if (!P || !N || y.some(function (v) { return v !== 0 && v !== 1; })) throw new Error('Labels must be 0/1 and include both classes');
      var idx = s.map(function (_, i) { return i; }).sort(function (a, b) { return s[b] - s[a]; });
      var tp = 0, fp = 0, pts = [['0', '0']], area = 0, prevF = 0, prevT = 0, frames = [];
      frames.push({ narr: 'Sort rows by score, highest first. Start with threshold above every score: nothing flagged, TPR = FPR = 0. P = ' + P + ' positives, N = ' + N + ' negatives.', parts: [{ type: 'array', label: 'labels in score order', values: idx.map(function (i) { return y[i]; }) }, { type: 'table', label: 'ROC points (FPR, TPR)', columns: ['FPR', 'TPR'], rows: pts.slice() }] });
      idx.forEach(function (i, k) {
        if (y[i]) tp++; else fp++;
        var F = fp / N, T = tp / P; area += (F - prevF) * (T + prevT) / 2; prevF = F; prevT = T;
        pts.push([String(r2(F)), String(r2(T))]);
        var hl = {}; for (var j = 0; j <= k; j++) hl[j] = y[idx[j]] ? 'ok' : 'bad';
        frames.push({ narr: 'Lower the threshold to ' + s[i] + ': this row is a ' + (y[i] ? '<span class="c-g">positive → TPR goes up (curve moves up)</span>' : '<span class="c-r">negative → FPR goes up (curve moves right)</span>') + '. Area so far (trapezoids) = <b>' + r3(area) + '</b>.', parts: [{ type: 'array', label: 'flagged rows (score order)', values: idx.map(function (q) { return y[q]; }), hl: hl }, { type: 'table', label: 'ROC points (FPR, TPR)', columns: ['FPR', 'TPR'], rows: pts.slice(), hl: (function () { var h = {}; h[pts.length - 1] = 'ok'; return h; })() }] });
      });
      frames.push({ narr: 'Final ROC-AUC = <b>' + r3(area) + '</b>. Equivalently, it is the share of (positive, negative) pairs where the positive has the higher score. Every positive that appears before a negative in the sorted list earns credit.', parts: [{ type: 'vars', vals: { 'ROC-AUC': r3(area), P: P, N: N }, hl: { 'ROC-AUC': 'sel' } }] });
      return frames;
    }
  }],
  examples: [
    { title: 'ROC looks great, PR tells the truth', html: `${H.table(['', 'value'], [['negatives', '1,000,000'], ['positives', '1,000'], ['operating point', 'TPR 0.80, FPR 0.01'], ['false alarms', '10,000'], ['precision', '800 / 10,800 = <span class="c-r">0.074</span>']])}<p>The ROC point (0.01, 0.80) looks superb; the ops team sees 13 false alarms for every real fraud.</p>` },
    { title: 'Macro vs micro F1', html: `<p>Three classes: A (900 rows, F1 0.95), B (90 rows, F1 0.60), C (10 rows, F1 0.10). Macro F1 = (0.95 + 0.60 + 0.10)/3 = <b>0.55</b>. Weighted F1 = 0.9·0.95 + 0.09·0.60 + 0.01·0.10 = <b>0.91</b>. If class C matters (a rare defect), macro exposes the problem; weighted hides it.</p>` },
    { title: 'Brier score by hand', html: `<p>Predictions 0.9, 0.2, 0.6 with truths 1, 0, 0. Brier = ((0.1)² + (0.2)² + (0.6)²)/3 = (0.01 + 0.04 + 0.36)/3 = <b>0.137</b>. Lower is better; always predicting the base rate gives the reference score.</p>` },
    { title: 'Calibration after boosting', html: `<p>A boosted model trained with scale_pos_weight scores 0.9 for rows that are fraud 30% of the time. Rank order is fine (AUC unchanged), but pricing uses the number directly. Fit isotonic regression on a held-out fold: 0.9 → 0.30. Calibration never changes ROC-AUC (Platt is monotone; isotonic can only create ties).</p>` }
  ],
  deepDive: `<p><b>AUC = Mann-Whitney U / (P·N).</b> Sort once and use ranks: O(n log n), versus O(P·N) for naive pairs. ROC-AUC is a ranking metric only: multiply every score by 0.1 and nothing changes. That is also why it says nothing about calibration.</p>
  <p><b>AP vs trapezoidal PR-AUC.</b> Linear interpolation between PR points is optimistic (precision is not linear in recall). scikit-learn's <code>average_precision_score</code> uses the step-wise sum ∑(R<sub>k</sub> - R<sub>k-1</sub>)P<sub>k</sub>, which is the recommended estimate.</p>
  <p><b>Partial AUC / fixed-FPR metrics</b> concentrate on the region you operate in (FPR &lt; 1%). In ranking/recommendation, use precision@k, recall@k, MAP and NDCG.</p>
  <p><b>Calibration methods.</b> Platt (sigmoid) needs little data and assumes a sigmoid-shaped distortion; isotonic is flexible but overfits with &lt; ~1,000 calibration rows. Expected Calibration Error (ECE) summarises a reliability diagram but depends on binning. Calibrate on data not used for training (CalibratedClassifierCV does cross-fitting).</p>
  <p><b>Statistical comparison.</b> Two models with AUC 0.842 and 0.848 on 2,000 rows may be indistinguishable; use paired bootstrap on the same test rows or DeLong's test for ROC-AUC.</p>
  <p><b>Metric choice must match the decision:</b> threshold-free metrics for model selection, threshold metrics (precision/recall at the chosen cut) and expected cost for the launch decision.</p>`,
  aiEra: `<p><b>What AI changes:</b> LLM-based classifiers (routing, moderation, intent) usually output a label or a verbalised confidence that is poorly calibrated. Teams extract token log-probabilities or use self-consistency votes as scores, then compute the same ROC/PR curves and calibrate them like any other model. LLM-as-judge evaluations are scored with precision/recall against human labels.</p>
  <p><b>Use AI as a partner:</b> ask an assistant to produce a complete evaluation report: per-class precision/recall, PR curve, reliability diagram, bootstrap CIs. Then check the code computes metrics on the right split.</p>
  <p><b>Where AI goes wrong:</b> it reports ROC-AUC for a 0.1%-positive problem as "excellent", averages F1 the wrong way for the question, or calibrates on the training set.</p>
  <p><b>What you must still own:</b> choosing the metric that matches the decision and cost, and refusing to celebrate a 0.006 AUC gain without a confidence interval.</p>`,
  problems: [{
    title: 'Compute ROC-AUC and AP for a tiny ranking',
    level: 'Medium', tags: ['ROC-AUC', 'PR-AUC', 'average precision'],
    statement: `<p>Scores sorted high to low with labels: 0.9(1), 0.8(0), 0.7(1), 0.6(0), 0.5(0), 0.4(1). Compute ROC-AUC by counting pairs, and average precision. Then say which would change more if 1,000 extra easy negatives with score 0.01 were added.</p>`,
    constraints: `Show the pair count and the precision at each positive.`,
    example: `<p>Correct pairs: positive 0.9 beats all 3 negatives (3), 0.7 beats 2 (2), 0.4 beats 0 → 5/9 = ${H.c('g', '0.556')}. AP = (1/1 + 2/3 + 3/6)/3 = ${H.c('g', '0.722')}.</p>`,
    brute: { why: `<p>Plotting the curve by eye and guessing the area, or computing accuracy at 0.5. Pair counting is exact and fast for small data; ranks make it O(n log n) for big data.</p>` },
    mcq: { q: 'Adding 1,000 easy negatives scored below every positive will...', options: ['Lower ROC-AUC a lot', 'Raise ROC-AUC; leave AP unchanged', 'Leave both unchanged', 'Lower AP a lot'], answer: 1, explain: 'Each new negative is beaten by all 3 positives, so the pair fraction rises toward 1. AP only looks at precision where positives appear, and those ranks are unchanged.' },
    hints: [`<p>3 positives × 3 negatives = 9 pairs. For each positive, count negatives with a lower score.</p>`, `<p>AP: walk down the list; at each positive record precision = positives so far / rows so far; average those.</p>`, `<p>New negatives at 0.01 sit at the bottom: they add 3,000 correctly ranked pairs but never appear above a positive.</p>`],
    solution: {
      approach: `<p><b>ROC-AUC:</b> P = 3, N = 3, 9 pairs. Positive 0.9 is above negatives 0.8, 0.6, 0.5 → 3. Positive 0.7 is above 0.6 and 0.5 → 2. Positive 0.4 is above none → 0. AUC = 5/9 ≈ <b>0.556</b>. <b>AP:</b> positives at ranks 1, 3, 6 with precision 1/1, 2/3, 3/6 → (1 + 0.667 + 0.5)/3 = <b>0.722</b>. <b>Adding 1,000 easy negatives:</b> pairs become 3 × 1,003 = 3,009, correct pairs 5 + 3,000 = 3,005 → ROC-AUC ≈ <b>0.999</b>, while AP stays 0.722 because no new negative ranks above a positive. This is why ROC-AUC can be inflated by easy negatives in imbalanced data and why PR-based metrics are preferred there.</p>`,
      dry: { head: ['rank', 'score', 'label', 'TP so far', 'precision at positive'], rows: [['1', '0.9', '1', '1', '1.00'], ['2', '0.8', '0', '1', '-'], ['3', '0.7', '1', '2', '0.67'], ['4', '0.6', '0', '2', '-'], ['5', '0.5', '0', '2', '-'], ['6', '0.4', '1', '3', '0.50']] },
      complexity: `<p>Pairs: O(P·N). Ranks: O(n log n). AP: O(n log n) for the sort plus O(n).</p>`,
      followUps: ['Why is the AP baseline equal to the positive rate?', 'How would you put a confidence interval on AUC?']
    }
  }]
});

// ---------------- TOPIC 7: cross-validation, tuning, overfitting ----------------
topics.push({
  title: 'Cross-Validation, Hyper-parameter Tuning and Fighting Overfitting',
  analogy: `<p>A coach picking a team does not judge players on one match - a lucky or unlucky day would mislead them. They watch several matches against different opponents and average. <b>Cross-validation</b> is watching several matches. <b>Nested cross-validation</b> is having a separate referee judge the coach's own selection process, so the coach cannot fool themselves.</p>`,
  explain: `<p><b>k-fold CV</b>: split the training data into k folds; train on k-1, score on the remaining one; rotate; report mean ± standard deviation. Typical k = 5 or 10. The <b>split must mimic production</b>, so pick the right flavour:</p>
  ${H.table(['data', 'CV scheme', 'why'], [['iid rows, balanced', 'KFold (shuffled)', 'default'], ['rare positives', '<b>StratifiedKFold</b>', 'each fold keeps the class ratio'], ['many rows per user/patient/store', '<b>GroupKFold</b>', 'the same entity never in train and validation'], ['time-ordered (forecasting, fraud, churn)', '<b>TimeSeriesSplit</b> / forward chaining (+ gap)', 'never train on the future'], ['small data, need stable estimate', 'Repeated stratified k-fold', 'averages out split luck']])}
  <p><b>Tuning hyper-parameters:</b> grid search (small spaces), random search (better than grid when only a few parameters matter), and <b>Bayesian optimisation</b> (Optuna, Hyperopt) which uses previous trials to choose the next. Use early stopping inside each fold for boosting. Tune the most impactful knobs first: for boosting, learning rate + tree complexity + min leaf size; for linear models, regularization strength.</p>
  <p><b>Selection bias:</b> if you try 500 configurations and report the best CV score, that score is optimistic - you partly selected for luck. Fixes: a final untouched <b>test set</b>, or <b>nested CV</b> (outer loop estimates performance, inner loop tunes).</p>
  <p><b>Overfitting checklist for classical models:</b></p>
  <ul><li>Compare train vs validation score (gap = variance).</li><li>Learning curves: does validation improve with more data?</li><li>Regularize: L1/L2 for linear models; depth, min leaf size, subsampling, shrinkage, early stopping for trees.</li><li>Simplify features; remove leaks (a "too good" score is more often a leak than genius).</li><li>Ensembles average away variance.</li></ul>
  <p><b>Interview framing:</b> when asked "how would you build model X", walk through: problem + metric → baseline → data split matching production → features → model (logistic baseline, then boosting) → CV + tuning → threshold + calibration → monitoring. That structure alone signals seniority.</p>`,
  clues: ['"Only 800 rows, how to estimate performance?" → (repeated) stratified k-fold CV', '"Several rows per customer" → GroupKFold', '"Predict next month" → time-series split, never shuffle', '"Tried 300 configs, best CV is 0.91 - is that the real score?" → selection bias, nested CV / held-out test', '"Grid search is too slow" → random search or Bayesian optimisation (Optuna)', '"Walk me through building a churn model" → structured end-to-end answer'],
  code: [{ lang: 'python', run: true, title: 'Stratified k-fold and time-series splits from scratch', code: `import random
random.seed(7)

labels = [1] * 6 + [0] * 24          # 20% positives, 30 rows
idx = list(range(len(labels)))
random.shuffle(idx)

def stratified_kfold(labels, idx, k):
    """Deal each class round-robin into k folds so every fold keeps the class ratio."""
    folds = [[] for _ in range(k)]
    for cls in sorted(set(labels)):
        members = [i for i in idx if labels[i] == cls]
        for n, i in enumerate(members):
            folds[n % k].append(i)
    return folds

k = 3
for f, val in enumerate(stratified_kfold(labels, idx, k)):
    train = [i for i in idx if i not in set(val)]
    pos = sum(labels[i] for i in val)
    print(f"fold {f}: train={len(train)} val={len(val)} positives in val={pos} ({pos / len(val):.0%})")

# Forward-chaining split for time-ordered rows 0..11 with a gap of 1 period
n, test_size, gap = 12, 2, 1
for start in range(6, n - test_size + 1, test_size):
    train = list(range(0, start - gap))
    test = list(range(start, start + test_size))
    print(f"train {train[0]}..{train[-1]}  (gap)  test {test}")` }, { lang: 'python', run: true, title: 'Random search with CV on a tiny ridge model', code: `import random
random.seed(1)
# y = 3x + noise; tune ridge strength lam with 5-fold CV (closed form for 1 feature, no intercept)
xs = [i / 10 for i in range(40)]
ys = [3 * x + random.gauss(0, 1.0) for x in xs]
folds = [list(range(f, 40, 5)) for f in range(5)]

def cv_mse(lam):
    total = 0.0
    for val in folds:
        tr = [i for i in range(40) if i not in val]
        w = sum(xs[i] * ys[i] for i in tr) / (sum(xs[i] ** 2 for i in tr) + lam)
        total += sum((ys[i] - w * xs[i]) ** 2 for i in val) / len(val)
    return total / len(folds)

trials = sorted(10 ** random.uniform(-3, 3) for _ in range(8))   # log-uniform search
for lam in trials:
    print(f"lambda={lam:9.3f}  CV MSE={cv_mse(lam):.3f}")
best = min(trials, key=cv_mse)
print("best lambda:", round(best, 3))` }, { lang: 'python', check: false, title: 'Nested CV with scikit-learn (needs the library)', code: `from sklearn.model_selection import StratifiedKFold, RandomizedSearchCV, cross_val_score
from sklearn.ensemble import HistGradientBoostingClassifier
from scipy.stats import loguniform, randint

inner = StratifiedKFold(5, shuffle=True, random_state=0)
outer = StratifiedKFold(5, shuffle=True, random_state=1)
search = RandomizedSearchCV(
    HistGradientBoostingClassifier(early_stopping=True),
    {"learning_rate": loguniform(0.01, 0.3), "max_leaf_nodes": randint(8, 64),
     "min_samples_leaf": randint(10, 200), "l2_regularization": loguniform(1e-3, 10)},
    n_iter=40, scoring="average_precision", cv=inner, random_state=0)
scores = cross_val_score(search, X, y, cv=outer, scoring="average_precision")
print(scores.mean(), scores.std())` }],
  viz: [{
    title: 'k-fold rotation: who is validation in each round',
    input: '10 5',
    inputLabel: 'Rows and k (rows ≤ 16, 2 ≤ k ≤ rows)',
    gen: function (input) {
      var a = nums(input, 2);
      if (a.length !== 2) throw new Error('Enter rows and k, e.g. 10 5');
      var n = Math.floor(a[0]), k = Math.floor(a[1]);
      if (n < 2 || n > 16 || k < 2 || k > n) throw new Error('Need 2 ≤ k ≤ rows ≤ 16');
      var rows = []; for (var i = 0; i < n; i++) rows.push('r' + i);
      var fold = rows.map(function (_, i) { return i % k; }), frames = [], scores = [];
      frames.push({ narr: n + ' rows dealt into <b>' + k + '</b> folds (the number under each row is its fold). Each row will be used for validation exactly once and for training ' + (k - 1) + ' times.', parts: [{ type: 'array', label: 'rows', values: rows.slice(), idxLabels: fold.map(function (f) { return 'f' + f; }) }] });
      for (var f = 0; f < k; f++) {
        var hl = {}; fold.forEach(function (x, i) { hl[i] = x === f ? 'sel' : 'win'; });
        var sc = r2(0.8 + 0.04 * Math.sin(f * 2.3 + n));
        scores.push(sc);
        frames.push({ narr: 'Round ' + (f + 1) + ': fold ' + f + ' (purple) is validation, the blue rows train the model. Pretend validation score = <b>' + sc + '</b>.', parts: [{ type: 'array', label: 'round ' + (f + 1), values: rows.slice(), hl: hl, idxLabels: fold.map(function (x) { return 'f' + x; }) }, { type: 'bars', label: 'fold scores so far', values: scores.slice() }] });
      }
      var mean = scores.reduce(function (x, y) { return x + y; }, 0) / k, sd = Math.sqrt(scores.reduce(function (x, y) { return x + (y - mean) * (y - mean); }, 0) / k);
      frames.push({ narr: 'Report <b>' + r3(mean) + ' ± ' + r3(sd) + '</b> (mean ± std across folds). The spread tells you how much a single split could have fooled you. For time-ordered data you would NOT rotate like this - validation must always come after training in time.', parts: [{ type: 'vars', vals: { k: k, mean: r3(mean), std: r3(sd) }, hl: { mean: 'sel' } }] });
      return frames;
    }
  }],
  examples: [
    { title: 'Group leakage in CV', html: `<p>Retail demand: 200 stores × 52 weeks. Random KFold puts week 10 of store A in training and week 11 of store A in validation - the model memorises store A's level. CV MAPE 8%; new stores in production 19%. GroupKFold by store gives an honest 18%.</p>` },
    { title: 'Why random search beats grid', html: `<p>Two hyper-parameters, but only one matters. A 3×3 grid tries just <b>3</b> distinct values of the important one; 9 random trials try <b>9</b> distinct values. Bergstra and Bengio (2012) showed random search finds good settings with far fewer trials.</p>` },
    { title: 'Selection bias in numbers', html: `${H.table(['', 'score'], [['best of 300 configs, inner CV', '0.912'], ['nested CV estimate', '0.897'], ['held-out test, once', '0.895']])}<p>The 0.912 was partly luck. Quote the nested or test number.</p>` },
    { title: 'Learning curve diagnosis', html: `${H.table(['train rows', 'train AUC', 'valid AUC'], [['1k', '0.99', '0.78'], ['5k', '0.97', '0.83'], ['20k', '0.95', '0.87']])}<p>Large gap that shrinks with data → high variance; collecting more data (or regularizing) will help. If both curves were flat and low, more data would not help - you would need better features or a more flexible model.</p>` }
  ],
  deepDive: `<p><b>Bias of the CV estimate.</b> Each fold model trains on (k-1)/k of the data, so CV is slightly pessimistic for the final model trained on everything; larger k reduces that bias but costs more compute and gives correlated fold estimates. Leave-one-out has low bias but high variance and is costly except for models with closed-form shortcuts (ridge).</p>
  <p><b>Everything fitted must be inside the fold:</b> scaling, imputation, target encoding, feature selection, resampling and even "drop columns with low correlation to the target". Use pipelines so <code>cross_val_score</code> refits them per fold.</p>
  <p><b>Time series details:</b> add a <b>gap</b> (embargo) between train and test when features use rolling windows or labels take time to mature (fraud chargebacks), otherwise information bleeds across the boundary. Use expanding or sliding windows depending on whether old data is still relevant.</p>
  <p><b>Final model:</b> after choosing hyper-parameters, retrain on train + validation (for boosting, scale the early-stopped tree count by the data increase, or keep a small validation slice), then evaluate once on test.</p>
  <p><b>Bayesian optimisation</b> (TPE in Optuna) models which regions of the search space look promising; with pruning (stop bad trials early, e.g. Hyperband/ASHA) it finds good settings in tens of trials. Fix random seeds and report variance across seeds - boosting with subsampling has seed noise of ±0.002 AUC or more.</p>`,
  aiEra: `<p><b>What AI changes:</b> AutoML tools and coding agents can now run an entire tuning campaign overnight. The bottleneck has moved from "running experiments" to "designing a trustworthy validation scheme" - which agents get wrong surprisingly often (shuffling time series, tuning on the test set).</p>
  <p><b>Use AI as a partner:</b> ask an agent to set up Optuna with nested CV and pipelines, then ask it to <i>explain which split strategy it used and why</i>. Make it print fold sizes and date ranges per fold.</p>
  <p><b>Where AI goes wrong:</b> it uses <code>KFold(shuffle=True)</code> on time-ordered data, fits preprocessing outside the CV loop, reports the best inner-CV score as the final score, and keeps tuning until the test score looks good.</p>
  <p><b>What you must still own:</b> the split design that matches deployment, a test set nobody touches until the end, and honest reporting of variance - not just the best number.</p>`,
  problems: [{
    title: 'Pick the validation scheme',
    level: 'Easy', tags: ['cross-validation', 'splits'],
    statement: `<p>Choose a CV scheme for each: (a) 600 medical images from 120 patients, predict disease; (b) daily sales for 3 years, forecast next month; (c) 2M credit-card transactions, 0.2% fraud, labels mature after 45 days; (d) 5,000 balanced survey rows.</p>`,
    constraints: `Name the splitter and one sentence of reasoning each.`,
    example: `<p>(a) ${H.c('g', 'GroupKFold by patient')} (stratified by diagnosis if possible). (b) ${H.c('g', 'forward-chaining time split')}. (c) ${H.c('g', 'time split with a 45-day gap')}, stratification irrelevant. (d) ${H.c('g', 'plain 5-fold')}.</p>`,
    brute: { why: `<p>Using shuffled KFold everywhere. It leaks patients across folds in (a), the future into the past in (b) and (c), and gives a result that collapses in production.</p>` },
    mcq: { q: 'Several images per patient. Which splitter?', options: ['KFold shuffled', 'GroupKFold by patient', 'Leave-one-image-out', 'No CV needed'], answer: 1, explain: 'Images from the same patient are correlated; GroupKFold keeps each patient entirely in train or validation.' },
    hints: [`<p>Ask for each dataset: are rows independent? Is there time order? Is a class rare?</p>`, `<p>Correlated rows → groups. Time order → forward chaining. Late labels → add a gap.</p>`, `<p>Only (d) has nothing special: plain or stratified 5-fold is fine.</p>`],
    solution: {
      approach: `<p>(a) <b>StratifiedGroupKFold / GroupKFold by patient</b>: images from one patient share anatomy and scanner settings; mixing them across folds lets the model recognise patients instead of disease. (b) <b>Forward-chaining (TimeSeriesSplit)</b>: train on earlier periods, validate on the following month, roll forward; never shuffle, because the model would learn from the future and seasonality would be misjudged. (c) <b>Time-based split with a 45-day embargo</b>: recent transactions do not yet have final labels, and rolling features overlap the boundary; keep validation months after training months and report PR-AUC with bootstrap CIs (stratification is less important with 4,000 positives per million rows, but be sure each period has enough positives). (d) <b>Plain (stratified) 5-fold</b>: rows are independent and balanced, so standard CV gives a good estimate. In all cases keep a final untouched test set that follows the same logic.</p>`,
      dry: { head: ['case', 'risk', 'splitter'], rows: [['a', 'patient leakage', 'GroupKFold'], ['b', 'future leakage', 'TimeSeriesSplit'], ['c', 'future + immature labels', 'time split + 45-day gap'], ['d', 'none', 'KFold / StratifiedKFold']] },
      complexity: `<p>k-fold costs k trainings; nested CV costs k<sub>outer</sub> × k<sub>inner</sub> × trials.</p>`,
      followUps: ['How would you combine group and time constraints?', 'When is a single holdout enough?']
    }
  }]
});

// ---------------- PRACTICE ----------------
function mk(title, level, tags, statement, example, bruteWhy, mcq, hints, approach, complexity, followUps, companies) {
  return { title: title, level: level, tags: tags, companies: companies, statement: statement, constraints: 'Answer in plain words with numbers where asked; show your reasoning.', example: example, brute: { why: bruteWhy }, mcq: mcq, hints: hints, solution: { approach: approach, complexity: complexity, followUps: followUps } };
}
practice.push(mk('Logistic regression or gradient boosting?', 'Easy', ['model choice', 'logistic regression', 'boosting'],
  `<p>For each case pick logistic regression or gradient boosting and justify: (a) a bank credit-limit model that regulators must audit, 25 features; (b) a marketplace conversion model, 400 mixed features, lots of interactions, 50M rows; (c) a first model built in one afternoon to see if the problem is learnable.</p>`,
  `<p>(a) ${H.c('g', 'logistic')} (or monotone-constrained boosting). (b) ${H.c('g', 'boosting')}. (c) ${H.c('g', 'logistic baseline first')}, then boosting.</p>`,
  `<p>"Always use XGBoost because it wins Kaggle." It ignores explainability, calibration, serving cost and the value of a baseline.</p>`,
  { q: 'Which is a strong reason to prefer logistic regression?', options: ['It captures interactions automatically', 'Coefficients are directly explainable and probabilities are usually calibrated', 'It never needs feature scaling', 'It always has higher AUC'], answer: 1, explain: 'Explainability and calibration are the classic advantages; interactions are the trees\' strength.' },
  [`<p>List what each situation values most: explainability, raw accuracy, speed of iteration.</p>`, `<p>Trees capture interactions and non-linearity without manual features; linear models need them engineered.</p>`, `<p>A baseline tells you whether a complex model is worth it; regulators often accept boosting only with monotone constraints and SHAP.</p>`],
  `<p>(a) <b>Logistic regression</b> with carefully engineered, monotone features (or scorecard binning): each coefficient can be explained, adverse-action reasons can be generated, and probabilities are well calibrated. Monotone-constrained gradient boosting with SHAP explanations is an accepted alternative in many banks today, but it needs more governance. (b) <b>Gradient boosting</b> (LightGBM/XGBoost): hundreds of heterogeneous features with interactions, abundant data, and accuracy translates directly into revenue; histogram methods scale to 50M rows. (c) <b>Logistic regression baseline</b>: minutes to train, shows whether signal exists, sets the bar; then try boosting and keep it only if it beats the baseline by a margin that justifies the extra complexity.</p>`,
  `<p>Logistic: O(n·k) per epoch. Boosting: O(trees · n · k) with histograms.</p>`, ['How would you explain a single boosted prediction to a customer?'], ['Capital One', 'Amazon']));
practice.push(mk('Gini of a node and of a split', 'Easy', ['decision tree', 'gini'],
  `<p>A node has 8 rows: 6 spam, 2 ham. (1) Its Gini and entropy. (2) A split sends 4 spam + 0 ham left and 2 spam + 2 ham right. What is the Gini gain?</p>`,
  `<p>Parent Gini = 1 - 0.5625 - 0.0625 = ${H.c('g', '0.375')}. Children: 0 and 0.5, weighted 0.25. Gain = ${H.c('g', '0.125')}.</p>`,
  `<p>Averaging the children's Gini without weights: (0 + 0.5)/2 = 0.25 happens to match here only because both children have 4 rows; with unequal sizes it is wrong.</p>`,
  { q: 'Gini of a 50/50 binary node is...', options: ['0', '0.25', '0.5', '1'], answer: 2, explain: '1 - 0.5² - 0.5² = 0.5, the maximum for two classes.' },
  [`<p>Gini = 1 - ∑p² over the class fractions; here the fractions are 0.75 and 0.25.</p>`, `<p>Entropy = -∑p log₂p: 0.75·0.415 + 0.25·2.</p>`, `<p>Weighted child impurity = (4/8)·0 + (4/8)·0.5. Gain = parent - weighted.</p>`],
  `<p>(1) p(spam) = 0.75, p(ham) = 0.25. Gini = 1 - 0.5625 - 0.0625 = <b>0.375</b>. Entropy = -(0.75 log₂ 0.75 + 0.25 log₂ 0.25) = 0.311 + 0.5 = <b>0.811 bits</b>. (2) Left child (4 spam) is pure: Gini 0. Right child (2/2) has Gini 0.5. Each child holds 4 of 8 rows, so weighted impurity = 0.5·0 + 0.5·0.5 = 0.25 and the gain = 0.375 - 0.25 = <b>0.125</b>. The equivalent entropy gain is 0.811 - 0.5·1 = 0.311 bits. A tree would compare this gain against every other candidate split and keep the largest.</p>`,
  `<p>O(classes) per node.</p>`, ['Why do Gini and entropy almost always choose the same split?'], ['Google']));
practice.push(mk('Why is the 99% accuracy useless?', 'Easy', ['imbalanced', 'metrics'],
  `<p>A churn model on 20,000 customers (1% churn) reports 99.1% accuracy, ROC-AUC 0.93. Product says "ship it". Which three numbers do you ask for before agreeing, and why?</p>`,
  `<p>${H.c('y', 'Precision and recall at the planned threshold')}, ${H.c('y', 'PR-AUC vs the 0.01 baseline')}, and ${H.c('y', 'the always-stay baseline accuracy (99.0%)')}.</p>`,
  `<p>Accepting accuracy: always predicting "stays" scores 99.0%, so 99.1% means the model adds almost nothing at its current threshold.</p>`,
  { q: 'What is the PR-AUC of a random model when positives are 1%?', options: ['0.5', 'About 0.01', '0', '0.99'], answer: 1, explain: 'A random ranker has precision equal to the positive rate at every recall, so its PR-AUC ≈ 0.01.' },
  [`<p>Compute the dumb baseline accuracy first.</p>`, `<p>ROC-AUC says ranking is decent; it does not say how many alerts are true at your threshold.</p>`, `<p>Ask for precision/recall at the threshold the retention team will use, PR-AUC, and expected cost or lift in the top decile.</p>`],
  `<p>With 1% churn the trivial model gets 99.0% accuracy, so 99.1% shows almost no added value at the 0.5 threshold. ROC-AUC 0.93 shows the model ranks reasonably, which is promising, but the retention team acts on a list. Ask for: (1) <b>precision and recall at the chosen threshold</b> (or precision@k for the number of customers the team can contact), (2) <b>PR-AUC</b> compared to the 0.01 baseline, and (3) <b>lift</b> in the top decile or expected business value (saved revenue minus offer cost). Also ask how the split was made (time-based?) and whether the threshold was chosen on validation, not test.</p>`,
  `<p>O(n log n) to compute all three from scores.</p>`, ['How would you choose k for precision@k?'], ['Spotify', 'Netflix']));
practice.push(mk('Implement best_split for a stump', 'Medium', ['decision tree', 'coding'],
  `<p>Write <code>best_split(xs, ys)</code> for one numeric feature and binary labels that returns the threshold minimising weighted Gini. Make it O(n log n), not O(n²).</p>`,
  `<p>xs = [3, 1, 4, 2], ys = [1, 0, 1, 0] → sorted labels 0 0 1 1 → best threshold ${H.c('g', '2.5')} with weighted Gini 0.</p>`,
  `<p>For every threshold, re-count both sides: O(n) per threshold × n thresholds = O(n²).</p>`,
  { q: 'What makes the sweep O(n log n)?', options: ['Hashing labels', 'Sorting once and updating running class counts as the cut moves', 'Using recursion', 'Random sampling'], answer: 1, explain: 'After sorting, moving the cut one row right moves exactly one label from right to left: O(1) to update counts.' },
  [`<p>Sort the rows by x once, so the labels appear in feature order.</p>`, `<p>Keep counts of positives on the left and right; moving the cut moves one row.</p>`, `<p>Only evaluate cuts between different x values (skip ties); threshold = midpoint; return None if all x are equal.</p>`],
  `<p>Sort pairs by x (O(n log n)). Initialise left counts to 0 and right counts to the totals. Sweep i from 0 to n-2: move row i from right to left (update positive counts), skip if x[i] equals x[i+1] (cannot cut between ties), compute Gini of each side from counts in O(1), and the weighted impurity (nL·gL + nR·gR)/n. Track the minimum and return the midpoint threshold. Edge cases: all x equal → no valid split; one class only → any split has gain 0. This is exactly how CART and histogram boosting (with bins instead of sorted rows) search splits.</p>`,
  `<p>O(n log n) sort + O(n) sweep; O(n) memory.</p>`, ['How does histogram binning change this to O(n + bins)?'], ['Meta', 'Airbnb']));
practice.push(mk('Target encoding without leaking', 'Medium', ['feature engineering', 'target encoding', 'leakage'],
  `<p>You have <code>merchant_id</code> with 300k values. A teammate replaced each id with its mean fraud rate computed on the whole training set, and validation AUC jumped from 0.84 to 0.97. Explain and fix.</p>`,
  `<p>${H.c('r', 'Leak')}: each row's own label is inside its encoding; rare merchants get 0 or 1 exactly. ${H.c('g', 'Fix')}: out-of-fold encoding with smoothing toward the global rate.</p>`,
  `<p>Keeping the encoding because "validation went up" - validation was encoded with the same full-data statistics too.</p>`,
  { q: 'A merchant seen once, with a fraud label. Naive target encoding gives...', options: ['The global rate', '1.0 - the label itself', '0.5', 'Missing'], answer: 1, explain: 'Its only row is fraud, so its mean is 1.0: the feature equals the label.' },
  [`<p>What does the encoding equal for a merchant with one or two rows?</p>`, `<p>Compute each row's encoding without that row's own label (out-of-fold).</p>`, `<p>Add smoothing: (sum + m·prior)/(count + m); encode validation/test using statistics from all training rows only.</p>`],
  `<p>The encoding includes each row's own label, so for rare merchants it essentially <i>is</i> the label (a merchant seen once with fraud gets 1.0). The model learns "encoding ≈ label", which is not available for new transactions - classic target leakage, and validation was contaminated the same way. Fix: (1) <b>out-of-fold</b> encoding on training data - split into K folds and encode each fold with statistics from the other folds; (2) <b>smoothing</b> - (sum + m·prior)/(count + m) so rare merchants shrink to the global rate; (3) encode validation/test with statistics from the full training set only; (4) for time-ordered data, use only past transactions (expanding mean) to stay point-in-time. Alternatives: frequency encoding, CatBoost ordered statistics, or scikit-learn TargetEncoder which cross-fits automatically. Expect validation AUC to return to a believable level (around 0.85-0.87).</p>`,
  `<p>O(n) per fold to compute group sums.</p>`, ['How would you handle a merchant that appears only in the test period?'], ['Stripe', 'Adyen']));
practice.push(mk('Random forest vs boosting under noise', 'Medium', ['random forest', 'boosting', 'bias-variance'],
  `<p>On a noisy dataset (labels ~15% wrong, 5k rows) a random forest gets valid AUC 0.81 and default XGBoost 0.78. On a clean 2M-row dataset boosting wins by 0.02. Explain both results.</p>`,
  `<p>Small noisy data: ${H.c('g', 'averaging')} of the forest is robust; boosting chases the mislabelled rows. Big clean data: boosting's ${H.c('g', 'bias reduction')} pays off.</p>`,
  `<p>"Boosting is always better" or "the library default is broken". The explanation is how each method treats hard (possibly mislabelled) rows.</p>`,
  { q: 'Why is boosting sensitive to label noise?', options: ['It ignores residuals', 'Each new tree focuses on rows still predicted badly, which includes mislabelled ones', 'It uses bootstrap samples', 'It cannot use deep trees'], answer: 1, explain: 'Boosting fits gradients/residuals; mislabelled rows keep large residuals, so later trees keep trying to fit them.' },
  [`<p>Think about what each new boosting tree is trained on.</p>`, `<p>Forest trees are independent and averaged - noise in one tree is diluted.</p>`, `<p>Fixes for boosting on noisy data: lower lr, shallower trees, larger min leaf, subsampling, early stopping, robust loss.</p>`],
  `<p>Boosting reduces bias by repeatedly fitting what is still wrong. With 15% wrong labels, the "still wrong" rows are often the mislabelled ones, so later trees memorise noise unless strongly regularized; with 5k rows default parameters overfit. The random forest trains deep trees independently on bootstrap samples and averages them, which cuts variance and dilutes the influence of individual noisy rows, so it is robust out of the box. On 2M clean rows, variance is less of a problem and the remaining error is bias: boosting's sequential correction captures subtle interactions better, giving the edge. To make boosting competitive on the noisy set: lower learning rate, shallower trees, larger min_child_weight, subsample 0.7-0.8, early stopping, or a robust loss; also consider cleaning labels.</p>`,
  `<p>Forest: O(trees · n log n · √k) parallel. Boosting: sequential trees.</p>`, ['How would you detect mislabelled rows?'], ['Uber']));
practice.push(mk('Choose the threshold from costs', 'Medium', ['threshold', 'cost', 'imbalanced'],
  `<p>A calibrated insurance-claim fraud model. Investigating a claim costs $40; paying a fraudulent claim costs $2,000 on average. (1) What probability threshold minimises expected cost in theory? (2) Investigators can only handle 300 claims a day and the model flags 900 at that threshold. What now?</p>`,
  `<p>(1) p &gt; 40/(40+2000) ≈ ${H.c('g', '0.0196')}. (2) Capacity binds: ${H.c('y', 'take the top 300 by score')} (precision@300), and report the cost of unhandled alerts to argue for more staff.</p>`,
  `<p>Using 0.5 because it is the default. That ignores a 50:1 cost asymmetry and lets many frauds through.</p>`,
  { q: 'Calibrated p; cost of FP = c_FP, cost of FN = c_FN. Predict positive when p exceeds...', options: ['0.5', 'c_FN / (c_FP + c_FN)', 'c_FP / (c_FP + c_FN)', 'c_FP / c_FN'], answer: 2, explain: 'Flag when expected loss of not flagging (p·c_FN) exceeds that of flagging ((1-p)·c_FP): p > c_FP/(c_FP+c_FN).' },
  [`<p>Compare expected costs of flag vs not flag for one claim with probability p.</p>`, `<p>Flag when p·2000 &gt; (1-p)·40; solve this inequality for p.</p>`, `<p>With a hard capacity, rank by expected saving p·2000 - 40 and take the top 300.</p>`],
  `<p>(1) Flag a claim if the expected cost of not investigating, p·$2,000, exceeds the expected cost of investigating a legitimate claim, (1-p)·$40. Solving gives p &gt; 40/2,040 ≈ <b>0.0196</b> - only valid because the model is calibrated. (2) Capacity is now the binding constraint: rank claims by expected saving (p·2,000 - 40) and investigate the top 300 per day - effectively choosing precision@300. Quantify the value lost on the 600 un-reviewed but cost-positive claims; that number is the business case for more investigators or for automation (e.g. auto-hold claims above p = 0.6). Revisit when costs or capacity change; monitor calibration so the threshold stays meaningful.</p>`,
  `<p>Sorting scores: O(n log n) per day.</p>`, ['What if the model is not calibrated?'], ['Lemonade', 'Allstate']));
practice.push(mk('Explain a sudden drop in validation score after a "small" pipeline change', 'Medium', ['pipelines', 'leakage', 'cross-validation'],
  `<p>A churn pipeline: impute + scale + select top 20 features by correlation with the label, then 5-fold CV logistic regression: AUC 0.88. A teammate moved feature selection inside the CV pipeline and AUC dropped to 0.79. Which number is right and why?</p>`,
  `<p>${H.c('g', '0.79')} is honest. Selecting features using all labels, before CV, leaked validation labels into the feature choice.</p>`,
  `<p>Reverting the change because the number got worse. A higher number from a leaky procedure is not an improvement.</p>`,
  { q: 'Feature selection by correlation with the label must be done...', options: ['Once on all data before CV', 'Inside each training fold', 'Only on the test set', 'It never leaks'], answer: 1, explain: 'Selection uses labels, so it is part of training and must only see training-fold labels.' },
  [`<p>Which steps use the label? Those are part of "training".</p>`, `<p>With many candidate features, some correlate with the label by chance across the whole data, including validation rows.</p>`, `<p>Put every fitted step (impute, scale, select) in a pipeline that CV refits per fold.</p>`],
  `<p>The 0.79 is the honest estimate. Selecting the 20 features most correlated with the label on all rows uses validation labels: with many candidate features some look predictive purely by chance in the full data, including the validation folds, so CV then rewards that luck. This is a well-known trap (Ambroise and McLachlan showed near-perfect "accuracy" on random data this way). Imputation and scaling leak less (no labels) but should also be inside the pipeline. Fix: use a Pipeline (imputer → scaler → SelectKBest → model) inside cross_val_score, tune k inside nested CV, and keep a held-out test set.</p>`,
  `<p>k folds × (selection + training).</p>`, ['What other steps commonly leak this way?'], ['Microsoft']));
practice.push(mk('Debug: great offline AUC, poor production', 'Medium', ['train/serve skew', 'drift', 'monitoring'],
  `<p>A LightGBM lead-scoring model has 0.91 AUC on a time-based test set. Two weeks after launch, sales says high-scored leads convert no better than others. List a systematic debugging plan.</p>`,
  `<p>Compare ${H.c('y', 'online feature values vs offline')} for the same leads; check ${H.c('y', 'missing rates')}, ${H.c('y', 'score distribution')}, label definition and delay.</p>`,
  `<p>Retraining immediately with fresh data. If the cause is a pipeline bug, the new model inherits it.</p>`,
  { q: 'Most common first culprit when offline is great but online is poor?', options: ['Wrong learning rate', 'Train/serve skew or leakage in offline features', 'Too few trees', 'Random seed'], answer: 1, explain: 'Feature values that differ between training and serving, or leaked features unavailable online, are the usual cause.' },
  [`<p>Log the exact features the model saw online and recompute them offline for the same entities.</p>`, `<p>Compare distributions: missing rates, means, categories never seen in training.</p>`, `<p>Also check: label definition/delay, sample selection (sales only calls some leads), and whether scores are even used as intended.</p>`],
  `<p>(1) <b>Features</b>: join logged online feature vectors with offline recomputation for the same leads; any mismatch (units, time zones, default values, a column that is NaN online) is train/serve skew. (2) <b>Leakage</b>: check top features by SHAP - is any of them updated after conversion (e.g. "last_contacted")? (3) <b>Distributions</b>: population stability index (PSI) per feature and of scores; unseen categories. (4) <b>Labels</b>: does "converted" mean the same thing, and are conversions still pending (label delay - two weeks may be too early)? (5) <b>Feedback/selection</b>: sales may have changed behaviour (calling only high scores) so outcomes are confounded. (6) <b>Measurement</b>: compute online AUC on matured labels with confidence intervals before concluding. Fix the root cause, then add monitoring for skew and drift.</p>`,
  `<p>Mostly data-pipeline work; PSI is O(n) per feature.</p>`, ['How would you set up an A/B test for the model?'], ['Salesforce', 'HubSpot']));
practice.push(mk('Design the churn model end to end', 'Hard', ['end-to-end', 'interview', 'churn'],
  `<p>"Design a model to predict which subscribers will cancel in the next 30 days so the retention team can call the top 2% each week." Give the full design: label, prediction moment, splits, features, models, metrics, threshold, calibration, monitoring.</p>`,
  `<p>Label: cancelled within 30 days after snapshot date D. Split by D. Baseline logistic → LightGBM. Metric: precision@2%, PR-AUC; uplift later.</p>`,
  `<p>"Train XGBoost on all columns and report accuracy." No prediction moment, leaky features, wrong metric, no link to the retention action.</p>`,
  { q: 'Retention can contact the top 2% weekly. Best primary offline metric?', options: ['Accuracy', 'Precision (or recall) in the top 2%', 'R²', 'Log loss only'], answer: 1, explain: 'The decision is "who are the top 2%", so measure quality at that cut-off.' },
  [`<p>Start with the business action: who is called, how many, how often.</p>`, `<p>Build weekly snapshots: features as of D, label = churn in (D, D+30]. Split by snapshot date.</p>`, `<p>Baseline logistic, then boosting; metric = precision@2% / PR-AUC; calibrate; monitor drift; consider uplift modelling because calling a customer changes the outcome.</p>`],
  `<p><b>Label & moment:</b> weekly snapshot date D; label = subscription cancelled in (D, D+30]; exclude already-cancelled users. <b>Splits:</b> train on snapshots from older months, validate on later ones, test on the most recent - with a 30-day gap so labels mature; group by user to avoid one user dominating. <b>Features (as of D):</b> tenure, plan, price changes, usage trend (last 7 vs previous 28 days), support tickets, payment failures, discounts, engagement drop flags; missing indicators. <b>Models:</b> logistic baseline, then LightGBM with early stopping and class weights. <b>Metrics:</b> precision@2% and recall@2% (the action), PR-AUC for model selection, calibration (Brier) if expected revenue at risk is computed. <b>Threshold:</b> fixed by capacity - top 2% by score (or by expected lost revenue = p × value). <b>Beyond prediction:</b> those most likely to churn are not necessarily those who can be saved; run an A/B test and move toward <b>uplift modelling</b>. <b>Monitoring:</b> feature drift (PSI), score distribution, realised precision once labels mature, retrain monthly.</p>`,
  `<p>Weekly batch scoring over all subscribers: O(users · trees · depth).</p>`, ['How does uplift modelling differ from churn prediction?', 'How would you avoid the model learning the effect of past retention calls?'], ['Netflix', 'Spotify', 'Disney']));
practice.push(mk('Explain why ROC-AUC improved but the business got worse', 'Hard', ['ROC-AUC', 'PR-AUC', 'metrics'],
  `<p>Model B replaced model A: ROC-AUC 0.90 → 0.92, but the fraud team reports more false alarms in their daily top-500 queue. Positives are 0.3%. How is this possible, and what should have been compared?</p>`,
  `<p>AUC is an average over all thresholds; B may rank ${H.c('g', 'the bulk')} better but ${H.c('r', 'the top of the list')} worse. Compare precision@500 and PR-AUC.</p>`,
  `<p>Arguing the team is wrong because AUC went up.</p>`,
  { q: 'Which metric directly matches a daily queue of 500 reviews?', options: ['ROC-AUC', 'Precision@500', 'Accuracy', 'R²'], answer: 1, explain: 'The queue only contains the top 500 scores, so precision there is what the team experiences.' },
  [`<p>ROC-AUC counts all positive-negative pairs equally - including ones deep in the list nobody reviews.</p>`, `<p>With 0.3% positives most pairs involve easy negatives at the bottom.</p>`, `<p>Compare precision@500, recall at the operating precision and PR-AUC with bootstrap CIs on the same test window.</p>`],
  `<p>ROC-AUC is the probability a random positive outranks a random negative, averaged across the entire ranking. With 0.3% positives, the overwhelming majority of pairs involve negatives far below any review cut-off, so B can win AUC by ordering the long tail better while ranking slightly worse at the very top, where the 500-case queue lives. ROC also hides false-alarm volume: FPR 0.005 on a million negatives is 5,000 alerts. The comparison should have used metrics that match the decision: <b>precision@500</b> (or recall at the precision the team can tolerate), <b>PR-AUC/average precision</b>, partial AUC at low FPR, and expected cost - on the same time-based test window, with paired bootstrap confidence intervals. Shadow-deploy B and compare queues before switching.</p>`,
  `<p>Metric computation O(n log n).</p>`, ['What is partial AUC and when would you use it?'], ['PayPal', 'Visa']));
practice.push(mk('Fix overconfident probabilities for pricing', 'Hard', ['calibration', 'boosting', 'platt', 'isotonic'],
  `<p>An insurer prices policies from predicted claim probability. A boosted model trained with <code>scale_pos_weight=20</code> shows: among policies scored 0.6-0.7, the actual claim rate is 0.12. Explain why, how to fix it, and how to verify.</p>`,
  `<p>Reweighting inflated the odds (~20×). Fix with ${H.c('g', 'isotonic or Platt calibration on held-out data')} (or retrain without weights), verify with reliability diagram + Brier.</p>`,
  `<p>Dividing all scores by 5 by eye. Miscalibration is rarely a constant factor across the range.</p>`,
  { q: 'Calibrating a model with isotonic regression changes its ROC-AUC how?', options: ['Always increases it', 'Leaves the ranking (essentially) unchanged', 'Always decreases it a lot', 'Makes it 0.5'], answer: 1, explain: 'Isotonic/Platt maps are monotone, so order is preserved (isotonic may create ties).' },
  [`<p>What does weighting positives 20× do to the odds the model learns?</p>`, `<p>Odds correction: true odds ≈ model odds / 20. Check 0.65 → odds 1.86 / 20 ≈ 0.093 → p ≈ 0.085.</p>`, `<p>Fit Platt or isotonic on a calibration fold that the model never trained on, then check a reliability diagram, Brier score and ECE on a separate test set.</p>`],
  `<p>Weighting positives 20× tells the model positives are 20× more common, so its predicted odds are inflated by roughly that factor: a score of 0.65 (odds 1.86) corresponds to true odds ≈ 0.093, p ≈ 0.085 - close to the observed 0.12 (boosting adds its own distortion). For pricing we need true probabilities. Options: (1) retrain without class weights - boosting with log loss is usually fine for ranking even with imbalance; (2) apply an odds correction (divide odds by the weight); (3) best practice, <b>calibrate</b> on held-out data: Platt scaling (few rows, sigmoid-shaped distortion) or isotonic regression (≥ a few thousand rows, any monotone shape), e.g. CalibratedClassifierCV with cross-fitting. <b>Verify</b> on a separate test set: reliability diagram per decile, Brier score, ECE, and per-segment calibration (by region, product) since pricing fairness depends on it. Monitor calibration over time.</p>`,
  `<p>Isotonic fit: O(n log n); applying it: O(log bins) per prediction.</p>`, ['Why does calibration matter less for a pure ranking task?'], ['Progressive', 'Root']));
practice.push(mk('Nested CV and the honest score', 'Hard', ['cross-validation', 'tuning', 'selection bias'],
  `<p>On 3,000 rows you ran 400 Optuna trials with 5-fold CV and report the best mean AUC 0.874. A reviewer asks for an unbiased estimate. Describe nested CV, its cost, and an alternative if compute is limited.</p>`,
  `<p>Outer 5 folds × (inner 5-fold tuning) → 5 honest outer scores, e.g. ${H.c('g', '0.861 ± 0.012')}. Cheaper: one untouched test split.</p>`,
  `<p>Reporting 0.874 as the expected production AUC - it is the maximum of 400 noisy estimates.</p>`,
  { q: 'Why is the best of 400 CV scores optimistic?', options: ['CV is always biased upward', 'Selecting the max of many noisy estimates picks up favourable noise', 'Because Optuna leaks labels', 'It is not optimistic'], answer: 1, explain: 'Each CV score has noise; the maximum across many configs is biased upward (winner\'s curse).' },
  [`<p>Think "winner's curse": the max of many noisy numbers.</p>`, `<p>Nested CV: outer folds only evaluate; tuning happens entirely inside each outer-training part.</p>`, `<p>Cost ≈ outer_k × trials × inner_k fits; alternative is a fixed held-out test set used once, or fewer trials with pruning.</p>`],
  `<p>Each 5-fold CV score is a noisy estimate (std maybe ±0.01 here); choosing the maximum of 400 such estimates selects favourable noise, so 0.874 is optimistic (winner's curse). <b>Nested CV:</b> split data into 5 outer folds. For each outer fold, run the whole tuning procedure (Optuna + inner 5-fold CV) on the other 4 outer folds only, refit the best config on them, and score once on the held-out outer fold. The mean of the 5 outer scores (e.g. 0.861 ± 0.012) estimates the performance of <i>the procedure</i>, including tuning. <b>Cost:</b> 5 × 400 × 5 = 10,000 fits instead of 2,000. <b>Cheaper alternatives:</b> keep a stratified 20% test set aside from the start and evaluate the final model once; use fewer trials with pruning (most gains come in the first ~50); or repeated CV for the top few configs only. Then train the final model on all data with the chosen config.</p>`,
  `<p>Nested: O(k_outer · trials · k_inner) model fits.</p>`, ['Does nested CV give you a final model?'], ['Google', 'DeepMind']));

// ---------------- QUIZ ----------------
quiz.push({ q: 'A standardized logistic regression weight is 1.1. Each +1 std of that feature...', options: ['Adds 1.1 to the probability', 'Multiplies the odds by about 3', 'Multiplies the probability by 1.1', 'Has no interpretable effect'], answer: 1, explain: 'Weights are in log-odds; e^1.1 ≈ 3.0 is the odds ratio.' });
quiz.push({ q: 'Two features have correlation 0.97 and one weight flipped sign. Best first fix?', options: ['Remove the intercept', 'Add L2 regularization or drop/combine one feature', 'Increase the learning rate', 'Use accuracy instead of AUC'], answer: 1, explain: 'Multicollinearity makes individual weights unstable; ridge shrinks them and stabilises, or remove the redundancy.' });
quiz.push({ q: 'Gini impurity of a node with 9 positives and 1 negative is...', options: ['0.09', '0.18', '0.5', '0.9'], answer: 1, explain: '1 - 0.81 - 0.01 = 0.18.' });
quiz.push({ q: 'Which models generally do NOT need feature scaling?', options: ['Logistic regression with L2', 'k-nearest neighbours', 'Decision trees and tree ensembles', 'SVM with RBF kernel'], answer: 2, explain: 'Tree splits depend only on the order of values, so monotone rescaling does not change them.' });
quiz.push({ q: 'Random forests mainly reduce ___ by averaging de-correlated deep trees.', options: ['Bias', 'Variance', 'Label noise', 'Training time'], answer: 1, explain: 'Deep trees have low bias and high variance; averaging cuts variance, random feature subsets lower correlation.' });
quiz.push({ q: 'In gradient boosting with squared error, each new tree is fit to...', options: ['The original labels', 'The residuals of the current ensemble', 'A bootstrap sample of labels', 'Random noise'], answer: 1, explain: 'The negative gradient of squared error is the residual y - prediction.' });
quiz.push({ q: 'Validation loss rises after 300 boosting rounds while train loss keeps dropping. What do you use?', options: ['More rounds', 'Early stopping on a validation set', 'A larger learning rate', 'Fewer features only'], answer: 1, explain: 'Early stopping keeps the iteration with the best validation score; lower learning rate also helps.' });
quiz.push({ q: 'Naive target encoding of a high-cardinality ID on the full training set mainly risks...', options: ['Underfitting', 'Target leakage', 'Slower inference', 'Integer overflow'], answer: 1, explain: 'Each row\'s own label enters its encoding; use out-of-fold encoding with smoothing.' });
quiz.push({ q: 'High earners often leave "income" blank. This missingness is...', options: ['MCAR', 'MAR', 'MNAR - add a missing indicator', 'Irrelevant'], answer: 2, explain: 'Missingness depends on the unobserved value itself: missing not at random. The fact it is missing is informative.' });
quiz.push({ q: 'Where should SMOTE or undersampling be applied?', options: ['Whole dataset before splitting', 'Only to training data inside each fold', 'Test set only', 'Validation and test sets'], answer: 1, explain: 'Evaluation data must keep the real class ratio and must not contain synthetic copies of training neighbours.' });
quiz.push({ q: 'With 0.5% positives, a random classifier has PR-AUC of roughly...', options: ['0.5', '0.005', '1.0', '0.25'], answer: 1, explain: 'Random ranking gives precision ≈ the positive rate at every recall.' });
quiz.push({ q: 'Missed fraud costs $500, a false alarm $5, probabilities are calibrated. Flag when p exceeds...', options: ['0.5', 'about 0.0099', 'about 0.99', '0.1'], answer: 1, explain: 'p > c_FP/(c_FP + c_FN) = 5/505 ≈ 0.0099.' });
quiz.push({ q: 'Macro-averaged F1 differs from weighted F1 because macro...', options: ['Pools all TP/FP/FN', 'Gives every class equal weight, exposing poor rare-class performance', 'Ignores precision', 'Equals accuracy'], answer: 1, explain: 'Macro averages per-class scores equally; weighted multiplies by class size; micro pools counts.' });
quiz.push({ q: 'Several rows per patient. Which CV splitter avoids leakage?', options: ['KFold shuffled', 'GroupKFold by patient', 'LeaveOneOut', 'TimeSeriesSplit always'], answer: 1, explain: 'Grouping keeps all rows of a patient in the same fold.' });
quiz.push({ q: 'You report the best of 300 tuning trials as your final CV score. The problem is...', options: ['No problem', 'Selection bias: the max of noisy estimates is optimistic', 'CV is always pessimistic', 'Tuning reduces variance'], answer: 1, explain: 'Use nested CV or an untouched test set for the honest number.' });
quiz.push({ q: 'Calibrating a classifier with Platt scaling changes ROC-AUC by...', options: ['A large increase', 'Nothing - it is a monotone transform', 'Always a decrease', 'It sets AUC to 0.5'], answer: 1, explain: 'Platt applies a monotone sigmoid to scores, so the ranking and therefore AUC stay the same.' });

// ---------------- INTERVIEW ----------------
interview.push({ q: 'When would you choose logistic regression over gradient boosting for a classification problem?', level: 'B', a: `<p>When explainability, calibration, speed or data size matter more than the last points of accuracy. Logistic regression gives one coefficient per feature (an odds ratio after exponentiating), which regulators and stakeholders can audit; its probabilities are usually well calibrated because it is trained directly on log loss; it trains in seconds on millions of sparse features (ads, text) and serves in microseconds; and with little data it overfits less. It is also the baseline I always build first. Gradient boosting wins when there are many heterogeneous features with non-linear effects and interactions and enough data, which is most tabular business problems. If I need both, monotone-constrained boosting plus SHAP is a middle ground.</p>`, followUps: ['How do you add non-linearity to a logistic model?', 'How do you explain a boosted prediction?'] });
interview.push({ q: 'How does a decision tree choose a split? Compare Gini and entropy.', level: 'B', a: `<p>At each node CART tries every feature and every candidate threshold (midpoints between sorted unique values, or histogram bin edges) and computes the impurity of the two children, weighted by their row counts. It picks the split with the largest decrease from the parent impurity (the gain). Gini = 1 - ∑p²; entropy = -∑p log₂p; both are 0 for a pure node and maximal for a uniform mix. They choose the same split in the vast majority of cases; Gini is slightly cheaper (no log), entropy is slightly more sensitive to small probability changes. For regression the impurity is variance (MSE). Growth stops at max_depth, min_samples_leaf, or zero gain, and pruning (ccp_alpha) removes branches that do not pay for their complexity.</p>`, followUps: ['Why are impurity-based importances biased?', 'How do trees handle missing values?'] });
interview.push({ q: 'Explain bagging vs boosting and when each is the better choice.', level: 'I', a: `<p>Bagging trains many models independently on bootstrap samples and averages them; random forests add random feature subsets at each split to de-correlate the trees. It reduces variance, so it suits high-variance learners like deep trees, needs little tuning, does not overfit as trees are added, parallelises, and is robust to label noise. Boosting trains shallow models sequentially, each fitting the negative gradient (residuals) of the current ensemble, scaled by a learning rate; it reduces bias and usually reaches higher accuracy on tabular data, but needs tuning (learning rate, depth, regularization) and early stopping, is sequential per tree, and is more sensitive to noisy labels and outliers. I start with a forest when I want a quick robust model and boosting when I need the best accuracy and can afford tuning.</p>`, followUps: ['What is the out-of-bag score?', 'Why do forests use random feature subsets?'] });
interview.push({ q: 'Walk me through the main XGBoost / LightGBM hyper-parameters and how you tune them.', level: 'I', a: `<p>I set a high n_estimators with early stopping on a validation fold, so the number of trees is chosen automatically. Then: learning_rate (0.03-0.1; lower needs more trees and usually generalises slightly better); tree complexity - max_depth (XGBoost, 4-8) or num_leaves (LightGBM, 15-255) - and min_child_weight / min_data_in_leaf to stop tiny leaves; randomness - subsample and colsample_bytree around 0.7-0.9 to de-correlate trees; regularization - reg_lambda (L2 on leaf weights), reg_alpha, gamma (minimum gain to split). For imbalance, scale_pos_weight or leave weights off and tune the threshold. I tune with random or Bayesian search (Optuna) inside stratified or time-based CV, most important knobs first, and confirm on an untouched test set. I also consider monotone constraints and categorical handling.</p>`, followUps: ['What does min_child_weight mean in terms of the Hessian?', 'Leaf-wise vs level-wise growth?'] });
interview.push({ q: 'How do you handle missing values? Walk through your decision process.', level: 'I', a: `<p>First I understand why values are missing: MCAR (random glitch), MAR (explained by other observed columns) or MNAR (depends on the value itself, like high earners hiding income). I measure missing rates and check if missingness correlates with the label. Then: for tree boosting I often leave NaN in place, since XGBoost and LightGBM learn a default direction per split. For other models I impute numeric columns with the median (robust) and add an is_missing indicator so MNAR signal is kept; categoricals get an explicit "Missing" category; for MAR data with strong relationships I consider KNN or iterative imputation. All imputers are fitted on training folds only, inside a pipeline, and persisted for serving. Columns that are mostly missing and uninformative get dropped. Finally I check that the serving path produces NaN in the same way.</p>`, followUps: ['Why is mean imputation before splitting a leak?', 'When would you drop rows instead?'] });
interview.push({ q: 'How do you encode a categorical feature with 500,000 distinct values?', level: 'I', a: `<p>One-hot is impractical: half a million sparse columns, most categories rare. Options: frequency or count encoding (leak-free, cheap); target encoding - replace the category with a smoothed mean label - computed out-of-fold so each row's own label is excluded, shrinking rare categories toward the global prior; hashing into a fixed number of buckets (accept collisions); grouping rare categories into "Other"; native categorical handling in LightGBM or CatBoost (CatBoost's ordered target statistics avoid leakage); or learned embeddings in a neural model. For time-ordered data, target statistics must be computed from the past only. I validate the choice with CV and watch for suspiciously large jumps, which usually mean leakage.</p>`, followUps: ['How does smoothing work in target encoding?', 'What happens with unseen categories at serving time?'] });
interview.push({ q: 'You have a dataset with 0.1% positives. How do you approach it?', level: 'I', a: `<p>First the evaluation: stratified (or time-based) splits that keep the real ratio, and metrics that respect imbalance - PR-AUC, recall at a required precision, precision@k for a review queue, expected cost - never accuracy. Then a baseline model with class weights (class_weight or scale_pos_weight), because reweighting is simple and usually as good as resampling. Undersampling negatives speeds up training on huge data; oversampling or SMOTE are applied only to training folds and often add little for boosting. The biggest practical lever is choosing the threshold on validation from business costs or capacity. If probabilities are used directly, I correct or recalibrate them, since weights and resampling inflate them. With very few positives I report bootstrap confidence intervals, consider anomaly-detection or two-stage systems, and invest in getting more labels.</p>`, followUps: ['How do you correct probabilities after undersampling?', 'When does SMOTE hurt?'] });
interview.push({ q: 'ROC-AUC vs PR-AUC: what is the difference and when do you use each?', level: 'I', a: `<p>ROC plots TPR against FPR across thresholds; its AUC equals the probability that a random positive is scored above a random negative. Because TPR and FPR are computed within each class, it ignores the class ratio - good for comparing rankers, but on heavily imbalanced data a tiny FPR can still mean thousands of false alarms, so ROC-AUC looks great while precision is poor. PR plots precision against recall; its area (average precision) has a baseline equal to the positive rate and focuses on how clean the top of the ranking is. I use PR-AUC (or precision@k / recall at fixed precision) for rare-event problems like fraud and search, and ROC-AUC for balanced problems or when both error types matter similarly. Neither measures calibration; for that I use log loss, Brier and reliability diagrams.</p>`, followUps: ['How would you compute ROC-AUC in O(n log n)?', 'Why is linear interpolation of PR curves optimistic?'] });
interview.push({ q: 'What is calibration, how do you check it and how do you fix it?', level: 'A', a: `<p>A model is calibrated when its predicted probabilities match observed frequencies: among cases scored 0.7, about 70% are positive. It matters whenever the number itself drives decisions - pricing, expected-cost thresholds, risk scores combined with other systems. Check it with a reliability diagram (bin predictions, compare mean prediction to observed rate per bin), the Brier score, log loss and expected calibration error, overall and per segment. Logistic regression is usually calibrated; boosted trees, random forests, SVMs, class-weighted and resampled models often are not. Fix it with Platt scaling (fit a logistic on the scores; works with little data) or isotonic regression (monotone step function; needs more data), trained on held-out data or by cross-fitting (CalibratedClassifierCV). Both are monotone so ranking metrics are unchanged. Monitor calibration over time because drift breaks it first.</p>`, followUps: ['Why do random forests produce under-confident probabilities near 0 and 1?', 'What is temperature scaling?'] });
interview.push({ q: 'How do you choose a cross-validation strategy?', level: 'I', a: `<p>The split must mimic how the model will be used. For independent rows, k-fold with k = 5 or 10; stratified when classes are imbalanced so every fold has positives. When rows are correlated by an entity - several images per patient, many transactions per user, weeks per store - GroupKFold so an entity never appears in both training and validation. For time-dependent problems, forward-chaining time splits (train on the past, validate on the next period), often with a gap when labels mature slowly or features use rolling windows. Combine them when needed, for example grouped time splits. Every fitted step - imputation, scaling, encoding, feature selection, resampling - goes inside the fold via a pipeline. I report mean and standard deviation across folds and keep a final untouched test set; for small data, repeated CV; for an unbiased tuned estimate, nested CV.</p>`, followUps: ['What is nested CV for?', 'Why add a gap in time-series CV?'] });
interview.push({ q: 'Your model has 0.99 training AUC and 0.80 validation AUC. What do you do?', level: 'B', a: `<p>A big train/validation gap means high variance (overfitting), but first I rule out a broken split or leakage that behaves differently in train and validation. Then I reduce variance: for trees and boosting - limit depth or leaves, raise minimum samples per leaf, add row/column subsampling, lower the learning rate and use early stopping, add L1/L2 on leaves; for linear models - stronger L1/L2 and fewer engineered features; in general - remove noisy or high-cardinality features that allow memorisation, gather more data or augment, and use ensembling. I plot learning curves: if validation keeps improving with more data, data is the best investment. I compare against a simple baseline to confirm the complex model adds value, and verify any final improvement with CV rather than one split.</p>`, followUps: ['How does a learning curve look for high bias?', 'Can a model overfit the validation set?'] });
interview.push({ q: 'Explain how gradient boosting works for binary classification, mathematically but simply.', level: 'A', a: `<p>The model is an additive function F(x) in log-odds, with p = sigmoid(F). Start with F₀ = log(base-rate odds). At step m compute, for every row, the gradient of the log loss with respect to F, which is p - y (and for XGBoost also the Hessian p(1 - p)). Fit a regression tree to the negative gradients y - p, so the tree learns where the current model under- or over-predicts. Set each leaf's value by a Newton step, roughly sum(y - p)/(sum p(1-p) + λ). Add the tree scaled by a learning rate η: F_m = F_{m-1} + η·tree. Repeat, stopping when validation loss stops improving. Regularization comes from shrinkage η, tree size limits, minimum Hessian per leaf, L1/L2 on leaf values, gamma for minimum split gain and row/column subsampling.</p>`, followUps: ['Why use the second derivative?', 'Why can boosted probabilities be miscalibrated?'] });
interview.push({ q: 'Feature importance says "account_age" is the top driver. Is it causal? How do you explain the model to stakeholders?', level: 'A', a: `<p>No: importance measures how much the model relies on a feature for prediction, not cause and effect. Impurity-based (gain) importance is also biased toward high-cardinality and continuous features and computed on training data. I prefer permutation importance on validation data (drop in metric when a feature is shuffled) and SHAP values, which give per-prediction additive contributions and consistent global summaries; for correlated features I group them because permutation can mislead. For stakeholders I show SHAP summary and dependence plots ("risk rises sharply for accounts younger than 30 days"), a few individual explanations, and partial dependence with caveats. For causal questions, such as whether changing a feature would change the outcome, I would design an experiment or use causal inference methods, because observational correlations can be confounded.</p>`, followUps: ['How does permutation importance behave with correlated features?', 'What are SHAP interaction values?'] });

registerModule({
  id: 'ai21',
  title: 'Classical Machine Learning in Practice',
  intro: `<p>Most production machine learning on business data is still <b>classical ML</b>: logistic regression, decision trees, random forests and gradient boosting (XGBoost, LightGBM, CatBoost) on tables of features. This module goes past the ML Foundations ideas into what you actually do at work and what interviewers probe: reading coefficients and odds ratios, computing Gini splits by hand, why bagging cuts variance and boosting cuts bias, which boosting knobs matter, feature engineering and target encoding without leakage, missing values (MCAR/MAR/MNAR), imbalanced data with class weights and cost-based thresholds, ROC-AUC vs PR-AUC and calibration, and cross-validation schemes (stratified, grouped, time-based, nested) with honest tuning. Every runnable demo is pure Python so you can see each number appear, and each topic shows the scikit-learn or LightGBM code you would write in real life.</p>`,
  goals: ['Interpret linear and logistic regression coefficients (odds ratios) and fix multicollinearity with regularization', 'Compute Gini/entropy gains by hand and implement an O(n log n) best-split search', 'Explain bagging vs boosting, tune XGBoost/LightGBM with early stopping, and diagnose overfitting', 'Engineer features, encode high-cardinality categories with out-of-fold target encoding, and handle missing values by mechanism', 'Handle imbalanced data with class weights, correct resampling and cost-based thresholds', 'Compute ROC-AUC, average precision and calibration metrics and choose the metric that matches the decision', 'Design leak-free cross-validation (stratified, group, time, nested) and answer end-to-end "build a model for X" interview questions'],
  prereqs: `<p>Required: <b>ai04 Machine Learning Foundations</b> (features/labels, splits and leakage, loss, gradient descent, overfitting, regularization, precision/recall/ROC) and <b>ai19</b> (the probability and statistics behind sampling, distributions and estimates). Comfort reading basic Python.</p>`,
  hours: 11,
  langExplain: `<p>All code in this module is Python because the AI track uses Python. The runnable demos use <b>only the standard library</b> (Gini split search, boosting with stumps, target encoding, threshold sweeps, ROC-AUC and k-fold splitting written by hand) so you can see every step and run them in the browser. Snippets marked as needing a library show the scikit-learn, LightGBM or XGBoost version you would use at work; those are for reading, not running here.</p>`,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
