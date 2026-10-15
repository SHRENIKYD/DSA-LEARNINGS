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

// ---------------- TOPIC 1: features and labels ----------------
topics.push({
  title: 'Features and Labels: What the Model Sees and What It Must Guess',
  analogy: `<p>Think of a doctor looking at a patient. The <b>features</b> are everything the doctor can measure: age, temperature, blood pressure, cough or no cough. The <b>label</b> is the answer the doctor must name: "flu" or "not flu". A machine learning model is a very patient apprentice doctor who studies thousands of old files (features + the final diagnosis) until it can guess the diagnosis for a new patient from the measurements alone.</p>`,
  explain: `<p><b>Machine learning (ML)</b> means: instead of writing the rules by hand, you show a program many examples and let it find the rules itself. Every example is one <b>row</b> in a table.</p>
  <ul><li><b>Features</b> (also called inputs, columns, or <code>X</code>) are the facts you know at prediction time: size of a house, number of bedrooms, age.</li>
  <li><b>Label</b> (also called target, answer, or <code>y</code>) is the thing you want to predict: the sale price, or "spam / not spam".</li></ul>
  ${H.table(['size (sq ft)', 'bedrooms', 'age (yrs)', '<span class="c-g">price (label)</span>'], [['800', '2', '30', '<span class="c-g">150k</span>'], ['1200', '3', '12', '<span class="c-g">240k</span>'], ['1500', '3', '5', '<span class="c-g">310k</span>'], ['950', '2', '20', '<span class="c-g">?</span>']])}
  <p>The first three rows are <b>training data</b> (label known). The last row is a new house: the model sees only the features and must fill in the <code>?</code>.</p>
  <p>Two big families of tasks, depending on the label:</p>
  <ul><li><b>Regression</b>: label is a number (price, temperature, delivery minutes).</li>
  <li><b>Classification</b>: label is a category (spam / not spam, cat / dog / bird). Two categories = <i>binary</i> classification.</li></ul>
  <p><b>Supervised learning</b> = you have labels. <b>Unsupervised learning</b> = no labels, the model finds groups on its own (e.g. customer clusters). This module is about supervised learning, which powers most real products.</p>
  <p>Features must be <b>numbers</b> in the end. Text, categories and images get converted: "city = Pune" becomes one-hot columns (<code>is_pune=1, is_delhi=0</code>), a sentence becomes a vector of numbers (an embedding). Good features usually matter more than a fancier model.</p>`,
  clues: ['"predict X from Y" - Y are the features, X is the label', '"we have historical data with outcomes" - supervised learning (labels exist)', '"the label is a number" - regression; "the label is one of K classes" - classification', '"no labelled data, group similar users" - unsupervised (clustering)', '"which columns should we use?" - feature selection / feature engineering question', '"available at prediction time?" - a feature that is only known later is a leak (see topic 2)'],
  code: [{ lang: 'python', run: true, title: 'Features (X) and label (y) in plain Python', code: `# Each row = one example. X holds features, y holds the label.
rows = [
    {"size": 800, "bedrooms": 2, "age": 30, "price": 150},
    {"size": 1200, "bedrooms": 3, "age": 12, "price": 240},
    {"size": 1500, "bedrooms": 3, "age": 5, "price": 310},
]
feature_names = ["size", "bedrooms", "age"]
label_name = "price"

X = [[r[f] for f in feature_names] for r in rows]   # list of feature vectors
y = [r[label_name] for r in rows]                   # list of answers
print("X =", X)
print("y =", y)

# Turn a category into numbers (one-hot encoding)
cities = ["Pune", "Delhi", "Pune", "Goa"]
vocab = sorted(set(cities))
one_hot = [[1 if c == v else 0 for v in vocab] for c in cities]
print(vocab)
for c, v in zip(cities, one_hot):
    print(c, "->", v)` }, { lang: 'python', check: false, title: 'Same idea with scikit-learn (needs the library)', code: `import numpy as np
from sklearn.linear_model import LinearRegression

X = np.array([[800, 2, 30], [1200, 3, 12], [1500, 3, 5]])   # features
y = np.array([150, 240, 310])                                # label
model = LinearRegression().fit(X, y)                         # learn from examples
print(model.predict([[950, 2, 20]]))                         # guess the "?" row` }],
  codeTitle: ['Features, label, one-hot (runs here)', 'scikit-learn version'],
  viz: {
    title: 'Split a table into features (X) and label (y)',
    input: 'price',
    inputLabel: 'Which column is the label? (size, bedrooms, age, or price)',
    gen: function (input) {
      var cols = ['size', 'bedrooms', 'age', 'price'];
      var lab = String(input).trim().toLowerCase();
      if (cols.indexOf(lab) < 0) throw new Error('Type one of: size, bedrooms, age, price');
      var data = [[800, 2, 30, 150], [1200, 3, 12, 240], [1500, 3, 5, 310], [950, 2, 20, 190]];
      var li = cols.indexOf(lab);
      var fcols = cols.filter(function (c) { return c !== lab; });
      var frames = [];
      frames.push({ narr: 'Here is our raw table: 4 houses, 4 columns. Every row is one <b>example</b>.', parts: [{ type: 'table', label: 'raw data', columns: cols, rows: data }] });
      frames.push({ narr: 'We want to predict <b>' + lab + '</b>, so that column is the <span class="c-g">label (y)</span>. Everything else is a <span class="c-b">feature (X)</span>.', parts: [{ type: 'table', label: 'raw data (label column = ' + lab + ')', columns: cols.map(function (c) { return c === lab ? c + ' (y)' : c + ' (X)'; }), rows: data }] });
      var X = data.map(function (r) { return r.filter(function (_, i) { return i !== li; }); });
      var y = data.map(function (r) { return r[li]; });
      frames.push({ narr: 'We split it into two pieces: the feature matrix <b>X</b> (what the model is allowed to see)...', parts: [{ type: 'table', label: 'X: features', columns: fcols, rows: X, hl: { 0: 'win', 1: 'win', 2: 'win', 3: 'win' } }] });
      frames.push({ narr: '...and the label vector <b>y</b> (the answers it learns from). Row i of X pairs with row i of y.', parts: [{ type: 'table', label: 'X: features', columns: fcols, rows: X }, { type: 'array', label: 'y: label = ' + lab, values: y, hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok' }, showIdx: true }] });
      var nf = X[3].slice();
      frames.push({ narr: 'At prediction time a new house arrives with only features. The label is unknown: the model must fill in the <b>?</b>.', parts: [{ type: 'table', label: 'new example', columns: fcols.concat([lab]), rows: [nf.concat(['?'])], hl: { 0: 'cur' } }] });
      frames.push({ narr: lab === 'price' ? 'Task type: the label is a number, so this is <b>regression</b>.' : 'Careful: <b>' + lab + '</b> is a number too, so this is still regression - but is it a sensible thing to predict from the others? Always ask what the business needs.', parts: [{ type: 'vars', vals: { rows: data.length, features: fcols.length, task: 'regression' }, hl: { task: 'sel' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Spam filter: features and label', html: `<p>Each email is one row. Features: number of links, has the word "free", sender in contacts?, length. Label: <code>spam = 1</code> or <code>0</code>. Because the label is a category, this is <b>classification</b>.</p>${H.table(['links', '"free"?', 'known sender', 'label'], [['7', '1', '0', '<span class="c-r">spam</span>'], ['0', '0', '1', '<span class="c-g">not spam</span>']])}` },
    { title: 'Turning a category into numbers', html: `<p>A model cannot multiply the word "Pune". One-hot encoding makes one 0/1 column per city. Never encode cities as 1, 2, 3: the model would think Goa (3) is "bigger" than Pune (1).</p>${H.table(['city', 'is_pune', 'is_delhi', 'is_goa'], [['Pune', '1', '0', '0'], ['Delhi', '0', '1', '0'], ['Goa', '0', '0', '1']])}` },
    { title: 'Picking the label is a business decision', html: `<p>A bank says "predict who will leave us". Label options: "closed account within 30 days" or "closed within 12 months"? Different labels give different models. A vague label creates a model that is accurate at the wrong thing.</p>` },
    { title: 'Feature engineering: make the signal obvious', html: `<p>Raw columns: <code>order_time</code>, <code>delivery_time</code>. Engineered feature: <code>delivery_minutes = delivery_time - order_time</code>. One clear number beats two timestamps the model has to subtract by itself.</p>`, code: { lang: 'python', run: true, code: `from datetime import datetime
order = datetime(2026, 3, 1, 12, 5)
delivery = datetime(2026, 3, 1, 12, 47)
delivery_minutes = (delivery - order).total_seconds() / 60
print("delivery_minutes =", delivery_minutes)` } }
  ],
  deepDive: `<p><b>Shape conventions.</b> With <code>n</code> examples and <code>d</code> features, X is an <code>n x d</code> matrix and y has length <code>n</code>. A "wide" dataset (d larger than n) is easy to overfit, which is why regularization exists.</p>
  <p><b>Scale matters.</b> Gradient-based models (linear/logistic regression, neural nets) learn faster when features are on similar scales; people standardize each column to mean 0 and standard deviation 1. Tree models do not care. Crucially, the mean and standard deviation must be computed on <i>training data only</i> (leakage, next topic).</p>
  <p><b>Missing values</b> need a plan: drop the row, fill with median, or add an "is_missing" flag column - often the fact that a value is missing is itself a useful feature.</p>
  <p><b>Label quality.</b> Real labels are noisy: humans disagree, logs are wrong. Noisy labels cap your best possible accuracy ("irreducible error"). Surprisingly, a model's mistakes on training data are a great way to find mislabeled rows.</p>
  <p><b>Proxy labels.</b> Often the true thing (is this loan good?) is only known years later, so teams train on a proxy (did they pay the first 3 installments?). Model quality is then limited by how well the proxy matches reality.</p>`,
  aiEra: `<p><b>What AI changes:</b> With LLMs and embeddings, "features" are often learned for you: a sentence becomes a 768 or 1536 number vector without hand-made columns. For tabular business data (rows and columns) hand-crafted features plus gradient boosting still win very often, and are cheaper to run.</p>
  <p><b>Use AI as a partner:</b> ask <code>Here are my 12 columns and the goal "predict churn". Which could be unavailable at prediction time?</code> or ask it to propose engineered features, then test each one yourself.</p>
  <p><b>Where AI goes wrong:</b> it happily suggests a feature like "days since account closed" for a churn model - a perfect predictor that does not exist in real life. It also writes code that one-hot encodes before the train/test split.</p>
  <p><b>What you must still own:</b> deciding the label, checking each feature is known at prediction time, and checking the labels are trustworthy. LLM-as-a-labeler can also create labels cheaply - but you must audit a sample by hand.</p>`
});

// ---------------- TOPIC 2: split & leakage ----------------
topics.push({
  title: 'Train / Validation / Test Split and Data Leakage',
  analogy: `<p>A student prepares for an exam. <b>Textbook questions</b> = training data (they study from it). <b>Weekly quizzes</b> = validation data (they check progress and adjust how they study). The <b>final exam</b> = test data: seen exactly once, at the end, to give an honest grade. If the student sees the final exam questions in advance, the grade means nothing - that is <b>data leakage</b>.</p>`,
  explain: `<p>A model can simply <i>memorize</i> its training rows. So we must measure it on rows it has never seen. We cut the data into three parts:</p>
  <ul><li><b class="c-g">Train</b> (about 60-80%): the model learns from this.</li>
  <li><b class="c-y">Validation</b> (about 10-20%): you use it again and again to compare models and settings (called hyper-parameters, like the learning rate).</li>
  <li><b class="c-p">Test</b> (about 10-20%): locked in a drawer. Use it <b>once</b>, at the very end, to report the honest score.</li></ul>
  <p>Why two held-out sets? Every time you look at the validation score and change something, you slowly fit the validation set too (like a student who tweaks answers after peeking). The test set stays clean to expose that.</p>
  ${H.arr([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], { label: '10 rows: 6 train | 2 val | 2 test', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g', 4: 'g', 5: 'g', 6: 'y', 7: 'y', 8: 'p', 9: 'p' } })}
  <p><b>Data leakage</b> = information from outside the training set sneaks into training, so your score looks great but production performance collapses. Common leaks:</p>
  <ul><li><b>Target leakage</b>: a feature that is a consequence of the label (e.g. "refund_issued" in a fraud model; "treatment_given" in a disease model).</li>
  <li><b>Preprocessing leakage</b>: computing mean/std, filling missing values, or selecting features on the <i>whole</i> dataset before splitting.</li>
  <li><b>Duplicate / near-duplicate rows</b> landing in both train and test (same customer, same image, same document twice).</li>
  <li><b>Time leakage</b>: random split of time-series data, so the model "sees the future" during training. Split by date instead.</li>
  <li><b>Group leakage</b>: several rows from one patient / user spread over train and test. Split by group.</li></ul>
  <p><b>Rule of thumb:</b> if your score looks too good to be true, it probably is. Hunt for a leak first.</p>`,
  clues: ['"accuracy 99% in the notebook, bad in production" - leakage or train/test mismatch', '"fit the scaler / imputer / PCA" - fit on train only, then transform val/test', '"time series / predict next month" - split by time, never random', '"multiple rows per user / patient / session" - group split', '"which feature is available only after the event?" - target leakage', '"hyper-parameter tuning" - needs a validation set (or cross-validation), not the test set'],
  code: [{ lang: 'python', run: true, title: 'Shuffle + split, and the scaler leakage trap', code: `import random

data = list(range(1, 21))            # 20 pretend rows
random.seed(42)                      # fixed seed = reproducible split
random.shuffle(data)

n = len(data)
n_train, n_val = int(0.6 * n), int(0.2 * n)
train = data[:n_train]
val = data[n_train:n_train + n_val]
test = data[n_train + n_val:]
print("train", len(train), "val", len(val), "test", len(test))
assert not (set(train) & set(val)) and not (set(train) & set(test))

def mean_std(xs):
    m = sum(xs) / len(xs)
    return m, (sum((x - m) ** 2 for x in xs) / len(xs)) ** 0.5

# WRONG: statistics from ALL data (test info leaks into training)
m_all, s_all = mean_std(data)
# RIGHT: statistics from the TRAIN rows only
m_tr, s_tr = mean_std(train)
print("leaky mean/std :", round(m_all, 2), round(s_all, 2))
print("honest mean/std:", round(m_tr, 2), round(s_tr, 2))
scaled_test = [(x - m_tr) / s_tr for x in test]   # reuse TRAIN numbers on test
print("scaled test sample:", [round(v, 2) for v in scaled_test[:4]])` }, { lang: 'python', run: true, title: 'Time-based split (no peeking at the future)', code: `# Rows are already ordered by date. Train on the past, test on the future.
days = list(range(1, 31))                      # day 1 ... day 30
cut1, cut2 = 21, 26
train, val, test = days[:cut1], days[cut1:cut2], days[cut2:]
print("train days", train[0], "-", train[-1])
print("val days  ", val[0], "-", val[-1])
print("test days ", test[0], "-", test[-1])
assert max(train) < min(val) < min(test)       # strictly past -> future
print("OK: no future data in training")` }, { lang: 'python', check: false, title: 'scikit-learn pipeline that cannot leak', code: `from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y)   # stratify keeps class ratio

# The pipeline fits the scaler on training folds only, even inside cross-validation
model = make_pipeline(StandardScaler(), LogisticRegression())
model.fit(X_train, y_train)
print(model.score(X_test, y_test))` }],
  codeTitle: ['Random split + scaler leakage', 'Time-based split', 'sklearn Pipeline'],
  viz: {
    title: 'Splitting 20 rows - then a leak',
    input: '60 20 20',
    inputLabel: 'Train / val / test percentages (sum to 100)',
    gen: function (input) {
      var p = nums(input, 3);
      if (p.length !== 3 || Math.abs(p[0] + p[1] + p[2] - 100) > 0.001 || p.some(function (x) { return x < 0; })) throw new Error('Give three percentages that sum to 100, e.g. 60 20 20');
      var n = 20, vals = [], i;
      for (i = 1; i <= n; i++) vals.push(i);
      var seed = 7, order = vals.slice();
      for (i = n - 1; i > 0; i--) { seed = (seed * 1103515245 + 12345) % 2147483648; var j = seed % (i + 1); var t = order[i]; order[i] = order[j]; order[j] = t; }
      var nt = Math.round(p[0] * n / 100), nv = Math.round(p[1] * n / 100);
      var hl = {}, k;
      var frames = [];
      frames.push({ narr: 'We have <b>20 labelled rows</b>, in the order they were collected.', parts: [{ type: 'array', label: 'dataset (row ids)', values: vals, showIdx: false }] });
      frames.push({ narr: '<b>Shuffle</b> first (unless it is time-ordered data!) so each part is a fair mix.', parts: [{ type: 'array', label: 'shuffled', values: order }] });
      for (k = 0; k < nt; k++) hl[k] = 'ok';
      frames.push({ narr: '<span class="c-g">Train</span>: the first <b>' + nt + '</b> rows. The model learns from these only.', parts: [{ type: 'array', label: 'train = green', values: order, hl: JSON.parse(JSON.stringify(hl)), range: nt > 0 ? [0, nt - 1] : undefined }] });
      for (k = nt; k < nt + nv; k++) hl[k] = 'cur';
      frames.push({ narr: '<span class="c-y">Validation</span>: the next <b>' + nv + '</b> rows. Used to compare models and tune settings.', parts: [{ type: 'array', label: 'validation = amber', values: order, hl: JSON.parse(JSON.stringify(hl)), range: nv > 0 ? [nt, nt + nv - 1] : undefined }] });
      for (k = nt + nv; k < n; k++) hl[k] = 'sel';
      frames.push({ narr: '<span class="c-p">Test</span>: the remaining <b>' + (n - nt - nv) + '</b> rows. Locked away until the very end - used once.', parts: [{ type: 'array', label: 'train | val | test', values: order, hl: JSON.parse(JSON.stringify(hl)) }, { type: 'vars', vals: { train: nt, val: nv, test: n - nt - nv } }] });
      var leak = {};
      for (k = 0; k < n; k++) leak[k] = k < nt ? 'ok' : 'bad';
      frames.push({ narr: '<span class="c-r">LEAK!</span> Someone computed the scaler mean over <b>all 20 rows</b>. Now validation and test numbers influenced training. The score will look better than reality.', parts: [{ type: 'array', label: 'scaler fitted on every row (red rows should not be used)', values: order, hl: leak }] });
      frames.push({ narr: 'Fix: compute mean/std on the green rows only, then <b>reuse those numbers</b> to transform validation and test. Same rule for imputers, PCA, feature selection and vocabularies.', parts: [{ type: 'array', label: 'scaler fitted on train rows only', values: order, hl: hl }] });
      return frames;
    }
  },
  examples: [
    { title: 'Spot the leak: fraud model', html: `<p>Features: amount, country, hour, <code>chargeback_filed</code>. Accuracy 99.8%. The <code>chargeback_filed</code> column only exists after the customer disputes the charge - which is how the fraud label was created. It is a <span class="c-r">target leak</span>; in production it is always empty, and the model collapses.</p>` },
    { title: 'Spot the leak: normalize first, split later', html: `<p>Code: <code>X = (X - X.mean()) / X.std()</code> then <code>train_test_split</code>. The mean and std were computed with the test rows included. The effect is small for the mean but real for outlier-heavy features and for target encoding. Fix: split first, fit on train.</p>` },
    { title: 'Spot the leak: same patient in train and test', html: `<p>A hospital dataset has 10 scans per patient. A random row split puts scan 1 of patient A in train and scan 2 of patient A in test. The model recognizes the patient, not the disease. Use a <b>group split</b> by patient id.</p>` },
    { title: 'Small data? Use cross-validation', html: `<p>With only 200 rows a single 20% validation set is noisy. <b>k-fold cross-validation</b> rotates which fold is validation: with k=5 you train 5 models and average the 5 scores. The test set is still held out separately.</p>${H.table(['fold', 'validation part', 'train parts'], [['1', 'rows 1-40', '41-200'], ['2', 'rows 41-80', '1-40, 81-200'], ['...', '...', '...']])}` }
  ],
  deepDive: `<p><b>Why validation scores are optimistic.</b> If you try 200 hyper-parameter settings and pick the best validation score, that best score is partly luck (the winner's curse). The test score of the winner is usually lower. This is why the test set must be touched <i>once</i>. If you peek and then change the model, the test set becomes a second validation set and you need a fresh one.</p>
  <p><b>Stratified splits.</b> With 2% positives, a random 10% test set may contain 0 or 40 positives. Stratified splitting keeps the class ratio equal in every part.</p>
  <p><b>Leakage in modern pipelines.</b> Target encoding (replace a category by the average label) must be computed out-of-fold. Feature selection by "keep the 20 columns most correlated with y" on the full data leaks heavily on wide data. Duplicated or near-duplicated text (scraped web pages) inflates scores for LLM fine-tuning too.</p>
  <p><b>Train/serve skew</b> is a cousin: the feature is computed one way in the notebook and another way in production (different time window, different null handling). It looks like leakage in the opposite direction: great offline, bad online. Fix with one shared feature code path.</p>
  <p><b>Temporal splits</b> mimic reality: train on months 1-8, validate on 9, test on 10. Walk-forward validation repeats this and slides forward.</p>`,
  aiEra: `<p><b>What AI changes:</b> For LLMs the same idea appears as <b>benchmark contamination</b>: if test questions leaked into the pretraining web data, the model "knows" the answers and the benchmark score is meaningless. Your private evaluation set for an LLM app must never be pasted into prompts, few-shot examples or fine-tuning data.</p>
  <p><b>Use AI as a partner:</b> paste your preprocessing code and ask <code>List every place information from the test set could reach the model. Be paranoid.</code> It is a good leak-detector for a code review.</p>
  <p><b>Where AI goes wrong:</b> generated notebooks very often call <code>fit_transform</code> on the full dataframe, or shuffle time-ordered data, or tune on the test set because the example "needs a score". Always read the order of operations.</p>
  <p><b>What you must still own:</b> knowing the data's story (is it time-ordered? grouped?), choosing the right split, and being suspicious of results that are too good.</p>`,
  problems: [{
    title: 'Which of these pipelines leaks?',
    level: 'Easy', tags: ['leakage', 'split'],
    statement: `<p>Three teams describe their pipeline. For each, say if it leaks and why:</p><ol><li>Fill missing ages with the median age of the full dataset, then split.</li><li>Split, then fit a <code>StandardScaler</code> on train and apply it to val/test.</li><li>Predict tomorrow's sales: shuffle all days at random, then 80/20 split.</li></ol>`,
    constraints: `Answer in one sentence each.`,
    example: `<p>Pipeline 1 uses the median from <b>all</b> rows - ${H.c('r', 'leaks')} (test rows influence the fill value). Pipeline 2 ${H.c('g', 'is correct')}. Pipeline 3 ${H.c('r', 'leaks time')} (training on days after the test days).</p>`,
    brute: { why: `<p>A weak answer says "all three look fine, they all split the data". That ignores <i>when</i> the split happens relative to preprocessing, and ignores that time-ordered data needs a time split.</p>` },
    mcq: { q: 'You compute mean and std on the training set. What do you use to scale the test set?', options: ['The test set\'s own mean and std', 'The training mean and std', 'The mean and std of train + test', 'No scaling'], answer: 1, explain: 'The model only ever knows training statistics; at serving time you also will not know future data\'s statistics. Reuse the training numbers.' },
    hints: [`<p>Ask for every step: "which rows were used to compute this number?" If the answer includes validation or test rows, it leaks.</p>`, `<p>Preprocessing that learns something from data (median, mean, vocabulary, PCA) is part of the model. Fit it on train only.</p>`, `<p>For time-ordered targets, a random split lets the model see the future. Use past-for-train, future-for-test. So: 1 leaks, 2 fine, 3 leaks.</p>`],
    solution: {
      approach: `<p><b>Pipeline 1 leaks:</b> the median uses test rows. Split first, compute the median on train, then reuse it for val and test. <b>Pipeline 2 is correct:</b> statistics learned on train only and applied unchanged to the other parts. <b>Pipeline 3 leaks time:</b> a random split puts later days in training and earlier days in test, so the model learns from the future; the score is optimistic. Use a chronological split or walk-forward validation. The general rule: anything that "learns" from data must be fitted after the split and only on training rows.</p>`,
      complexity: `<p>Not an algorithm - the check is a code review of the order of operations: O(number of pipeline steps).</p>`,
      followUps: ['What if you have only 300 rows and cannot afford a separate validation set?']
    }
  }]
});

// ---------------- TOPIC 3: loss functions ----------------
topics.push({
  title: 'Loss Functions: MSE and Cross-Entropy',
  analogy: `<p>A loss function is a <b>strict teacher with a red pen</b>. After each guess the teacher gives a penalty score: 0 for a perfect answer, bigger when the answer is worse. Training is just "change the model a little so the teacher's total penalty goes down". Different subjects need different teachers: for guessing a number, penalize the distance; for guessing a probability, penalize being <i>confidently wrong</i> most of all.</p>`,
  explain: `<p>The model makes a prediction. The <b>loss</b> is one number saying how bad it was. The training goal: make the average loss over the training data as small as possible.</p>
  <p><b>1. MSE - Mean Squared Error (for regression)</b></p>
  <p>Take each error (prediction - truth), square it, average them. Squaring does two things: makes errors positive, and punishes big mistakes much more than small ones.</p>
  ${H.table(['truth', 'prediction', 'error', 'squared'], [['10', '9', '-1', '1'], ['10', '12', '2', '4'], ['10', '4', '-6', '<span class="c-r">36</span>']])}
  <p>MSE = (1 + 4 + 36) / 3 = <b>13.67</b>. The one big miss (error 6) is 36 of the total 41. If outliers are noise you do not want to chase, use <b>MAE</b> (mean absolute error, no squaring) or Huber loss.</p>
  <p><b>2. Cross-entropy / log loss (for classification)</b></p>
  <p>For a yes/no label the model outputs a <i>probability</i> p that the answer is yes. Loss for one example:</p>
  <p><code>loss = -log(p)</code> if the truth is 1, and <code>loss = -log(1 - p)</code> if the truth is 0. In words: <b>"how surprised were you by what really happened?"</b></p>
  ${H.table(['truth', 'model said P(yes)', 'loss', 'feeling'], [['1', '0.99', '0.01', '<span class="c-g">confident and right</span>'], ['1', '0.60', '0.51', 'unsure but right'], ['1', '0.10', '2.30', '<span class="c-y">mostly wrong</span>'], ['1', '0.01', '<span class="c-r">4.61</span>', '<span class="c-r">confidently wrong - huge penalty</span>']])}
  <p>Cross-entropy goes towards infinity as a confident prediction gets it wrong. That is exactly the behaviour we want: it forces honest probabilities. With more than 2 classes it generalizes to <i>categorical cross-entropy</i> with a softmax output (one probability per class, adding to 1).</p>
  <p><b>Why not use MSE for classification?</b> It works poorly with a sigmoid output: when the model is confidently wrong, the gradient (the learning signal) becomes tiny, so learning stalls. Cross-entropy keeps a strong signal precisely when you are most wrong.</p>
  <p><b>Quick picker:</b> number out -> MSE/MAE. Yes/no probability -> binary cross-entropy. One of many classes -> softmax + categorical cross-entropy. LLM next-token training -> cross-entropy over the vocabulary.</p>`,
  clues: ['"predict a price / temperature / duration" - regression -> MSE or MAE', '"outliers should not dominate" - MAE or Huber, not MSE', '"output a probability" - cross-entropy (log loss)', '"multi-class, exactly one correct class" - softmax + categorical cross-entropy', '"penalize confident wrong answers" - log loss', '"loss is NaN / infinity" - log(0): clip probabilities to [1e-12, 1 - 1e-12]'],
  code: [{ lang: 'python', run: true, title: 'MSE, MAE and log loss by hand', code: `import math

def mse(y, p):
    return sum((a - b) ** 2 for a, b in zip(y, p)) / len(y)

def mae(y, p):
    return sum(abs(a - b) for a, b in zip(y, p)) / len(y)

def log_loss(y, p, eps=1e-12):
    # p = predicted probability that label is 1; clip so log(0) never happens
    total = 0.0
    for t, q in zip(y, p):
        q = min(max(q, eps), 1 - eps)
        total += -(t * math.log(q) + (1 - t) * math.log(1 - q))
    return total / len(y)

truth = [10, 10, 10]
pred = [9, 12, 4]
print("MSE =", round(mse(truth, pred), 2), " MAE =", round(mae(truth, pred), 2))

labels = [1, 1, 1, 0]
probs = [0.99, 0.60, 0.10, 0.20]
print("log loss =", round(log_loss(labels, probs), 3))
for t, q in zip(labels, probs):
    print("truth", t, "p", q, "loss", round(log_loss([t], [q]), 3))
print("confidently wrong (p=0.01 for truth 1):", round(log_loss([1], [0.01]), 2))` }],
  codeTitle: ['Loss functions from scratch'],
  viz: {
    title: 'Per-example loss: squared error vs cross-entropy',
    input: '1:0.95 1:0.60 1:0.10 0:0.20 0:0.97',
    inputLabel: 'truth:P(yes) pairs, e.g. 1:0.9 0:0.3',
    gen: function (input) {
      var items = String(input).trim().split(/\s+/).map(function (t) { var s = t.split(':'); return [Number(s[0]), Number(s[1])]; });
      if (!items.length || items.length > 10 || items.some(function (x) { return (x[0] !== 0 && x[0] !== 1) || isNaN(x[1]) || x[1] <= 0 || x[1] >= 1; })) throw new Error('Use pairs like 1:0.9 0:0.3 (truth is 0 or 1, probability strictly between 0 and 1)');
      var rows = [], ce = [], sq = [], frames = [], i;
      frames.push({ narr: 'Each example has a true label (0/1) and the model\'s probability of "yes". We will score every one with two teachers.', parts: [{ type: 'table', label: 'examples', columns: ['truth', 'P(yes)'], rows: items.map(function (x) { return [x[0], x[1]]; }) }] });
      for (i = 0; i < items.length; i++) {
        var t = items[i][0], p = items[i][1];
        var s = (t - p) * (t - p), c = -(t === 1 ? Math.log(p) : Math.log(1 - p));
        sq.push(r3(s)); ce.push(r3(c));
        rows.push([t, p, r3(s), r3(c)]);
        var hl = {}; hl[rows.length - 1] = c > 1.5 ? 'bad' : 'ok';
        frames.push({ narr: 'Example ' + (i + 1) + ': truth ' + t + ', P(yes) ' + p + '. Squared error = ' + r3(s) + ', cross-entropy = <b>' + r3(c) + '</b>.' + (c > 1.5 ? ' <span class="c-r">Confidently wrong - cross-entropy is much harsher than squared error.</span>' : ''), parts: [{ type: 'table', label: 'loss per example', columns: ['truth', 'P(yes)', 'squared error', 'cross-entropy'], rows: rows.slice(), hl: hl }, { type: 'bars', label: 'cross-entropy so far', values: ce.slice(), texts: ce.map(String) }] });
      }
      var mS = sq.reduce(function (a, b) { return a + b; }, 0) / sq.length, mC = ce.reduce(function (a, b) { return a + b; }, 0) / ce.length;
      frames.push({ narr: 'Average over all examples: <b>MSE-style loss ' + r3(mS) + '</b> vs <b>log loss ' + r3(mC) + '</b>. Training moves the model weights to push this single average down.', parts: [{ type: 'bars', label: 'cross-entropy per example', values: ce, texts: ce.map(String) }, { type: 'vars', vals: { mean_squared_error: r3(mS), mean_cross_entropy: r3(mC) }, hl: { mean_cross_entropy: 'sel' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'MSE vs MAE with one outlier', html: `<p>Errors: 1, 1, 1, 1, 20. MAE = 24/5 = <b>4.8</b>. MSE = (1+1+1+1+400)/5 = <b>80.8</b>. One bad row makes MSE 17x bigger than the typical error suggests. MSE says "fix that one row"; MAE says "ignore it, it is probably noise".</p>` },
    { title: 'Binary cross-entropy for one row', html: `<p>Truth = 1, model says 0.8. Loss = -ln(0.8) = <b>0.223</b>. Truth = 0, model says 0.8: loss = -ln(1 - 0.8) = -ln(0.2) = <b>1.609</b>. Being wrong costs seven times more.</p>` },
    { title: 'Perplexity: cross-entropy in LLM clothes', html: `<p>Language models are trained to minimise cross-entropy of the next word. <b>Perplexity = e<sup>cross-entropy</sup></b>. A loss of 2.0 means perplexity about 7.4: the model is as unsure as if it were choosing between 7 equally likely words each time.</p>` },
    { title: 'Loss is not the same as the business metric', html: `<p>You train with log loss (smooth, easy to optimise) but report F1 or revenue saved (what the business cares about). They usually move together, but not always - always check both.</p>` }
  ],
  deepDive: `<p><b>Where do these come from?</b> MSE is the maximum-likelihood loss if you assume the noise in the label is a bell curve (Gaussian). Cross-entropy is the maximum-likelihood loss for Bernoulli/categorical labels. "Choose the loss that matches how your data is noisy" is the principled version of the rule of thumb.</p>
  <p><b>Gradient behaviour.</b> For a sigmoid output p with cross-entropy, the gradient with respect to the pre-activation score z is simply <code>p - y</code>: big when wrong, zero when right. With squared error it is <code>(p - y) * p * (1 - p)</code>, and the extra <code>p(1-p)</code> factor goes to 0 when p saturates near 0 or 1 - the "stalled learning" problem.</p>
  <p><b>Numerical stability.</b> Real libraries never compute <code>log(sigmoid(z))</code> in two steps; they use a fused "binary cross-entropy with logits" using the log-sum-exp trick so that big |z| does not overflow.</p>
  <p><b>Class weights and focal loss.</b> For rare positives you can multiply the loss of positive rows by a weight, or use focal loss which down-weights easy examples so the model focuses on hard ones.</p>
  <p><b>Other losses:</b> hinge loss (SVMs), Huber (MSE for small errors, MAE for large), quantile / pinball loss (predict the 90th percentile of delivery time), contrastive / triplet losses (embeddings: pull similar items close, push different ones apart).</p>`,
  aiEra: `<p><b>What AI changes:</b> LLM pre-training is just cross-entropy on the next token, repeated trillions of times. Fine-tuning for chat adds preference losses (like DPO) that compare "better answer vs worse answer". Evaluation of generated text, however, cannot use a simple loss - teams use rubric-based or LLM-as-judge scoring.</p>
  <p><b>Use AI as a partner:</b> ask <code>My label is delivery time with a long right tail. Compare MSE, MAE, Huber and quantile loss for it and tell me what each optimises.</code> Then verify on your data.</p>
  <p><b>Where AI goes wrong:</b> it may suggest MSE on a 0/1 label "because it is simpler", forget to clip probabilities, or mix up logits (raw scores) with probabilities when calling a library loss function - a classic silent bug.</p>
  <p><b>What you must still own:</b> mapping the business cost of errors to a loss: is over-predicting as bad as under-predicting? If not, a symmetric loss like MSE is the wrong teacher.</p>`
});

// ---------------- TOPIC 4: gradient descent ----------------
topics.push({
  title: 'Gradient Descent and the Learning Rate',
  analogy: `<p>You are on a foggy hill and want to reach the valley. You cannot see far, but you can feel the slope under your feet. So you take a step <b>downhill</b>, feel again, step again. That is gradient descent. The <b>learning rate</b> is your step size: tiny steps take forever; giant leaps overshoot the valley and land on the opposite hill, higher than where you started.</p>`,
  explain: `<p>Training a model = finding the settings (<b>weights</b>) that make the loss small. Picture the loss as height of a landscape and the weights as your position.</p>
  <p>Each round (one pass is called an <b>epoch</b> when the whole dataset is used once):</p>
  <ol><li>Compute the loss with the current weights.</li><li>Compute the <b>gradient</b> = the slope of the loss with respect to each weight (which way is uphill, and how steep).</li><li>Move each weight a little in the opposite direction: <code>w = w - lr * gradient</code>.</li></ol>
  <p>Worked example with a toy loss <code>L(w) = (w - 3)<sup>2</sup></code> (best weight is 3). The slope is <code>2(w - 3)</code>. Start at w = 0 with <code>lr = 0.25</code>:</p>
  ${H.table(['step', 'w', 'slope 2(w-3)', 'new w = w - 0.25*slope', 'loss'], [['0', '0', '-6', '1.5', '9'], ['1', '1.5', '-3', '2.25', '2.25'], ['2', '2.25', '-1.5', '2.625', '0.56'], ['3', '2.625', '-0.75', '2.81', '0.14']])}
  <p>Steps shrink automatically because the slope shrinks near the bottom. Now the <b>learning rate</b>, the most important setting you will ever tune:</p>
  <ul><li><span class="c-y">Too small</span> (0.001): loss falls very slowly, you run out of time.</li>
  <li><span class="c-g">Good</span> (0.1-0.5 here): loss drops quickly and smoothly then flattens.</li>
  <li><span class="c-r">Too large</span> (1.1 here): each step overshoots by more than before - the loss <b>zig-zags upward and explodes to infinity or NaN</b>.</li></ul>
  <p><b>Reading a loss curve (loss vs epoch):</b> smooth steady fall = fine. Falling but painfully slowly = raise lr. Jumping up and down wildly or rising = lower lr (try dividing by 3 or 10). Flat from epoch 1 = lr is far too small or the gradient vanished.</p>
  <p><b>Variants:</b> <i>Batch</i> GD uses all rows per step (exact but slow). <i>Stochastic</i> GD uses 1 row (noisy, fast). <i>Mini-batch</i> (32-512 rows) is what everyone uses. <b>Adam</b> is a smarter optimizer that adapts the step for each weight; it is the default for deep learning.</p>`,
  clues: ['"loss goes up / NaN after a few steps" - learning rate too high', '"loss decreases but very slowly" - learning rate too low (or unscaled features)', '"loss curve zig-zags but trends down" - mini-batch noise or lr slightly high', '"stuck on a plateau" - lr schedule, momentum / Adam, or a better initialisation', '"batch size 32" - mini-batch gradient descent', '"how to pick the step size" - learning-rate sweep on a log scale (1e-4, 1e-3, 1e-2, ...)'],
  code: [{ lang: 'python', run: true, title: 'Gradient descent on linear regression (prints loss per epoch)', code: `# Learn y = w*x + b from 5 points. True rule: y = 2x + 1.
xs = [1, 2, 3, 4, 5]
ys = [3, 5, 7, 9, 11]
w, b = 0.0, 0.0
lr = 0.02                      # learning rate = step size
n = len(xs)
for epoch in range(1, 41):
    preds = [w * x + b for x in xs]
    loss = sum((p - y) ** 2 for p, y in zip(preds, ys)) / n   # MSE
    # gradients = slope of the loss with respect to w and b
    dw = sum(2 * (p - y) * x for p, y, x in zip(preds, ys, xs)) / n
    db = sum(2 * (p - y) for p, y in zip(preds, ys)) / n
    if epoch <= 5 or epoch % 10 == 0:
        print(f"epoch {epoch:2d}  loss={loss:9.4f}  w={w:.3f}  b={b:.3f}")
    w -= lr * dw               # step DOWNHILL (minus the slope)
    b -= lr * db
print("learned rule: y = %.2f*x + %.2f" % (w, b))
print("prediction for x=6:", round(w * 6 + b, 2))` }, { lang: 'python', run: true, title: 'Same code, three learning rates', code: `def train(lr, epochs=8):
    xs = [1, 2, 3, 4, 5]
    ys = [3, 5, 7, 9, 11]
    w = b = 0.0
    losses = []
    for _ in range(epochs):
        preds = [w * x + b for x in xs]
        losses.append(sum((p - y) ** 2 for p, y in zip(preds, ys)) / len(xs))
        dw = sum(2 * (p - y) * x for p, y, x in zip(preds, ys, xs)) / len(xs)
        db = sum(2 * (p - y) for p, y in zip(preds, ys)) / len(xs)
        w -= lr * dw
        b -= lr * db
    return losses

for lr in (0.001, 0.02, 0.2):
    print("lr =", lr)
    print("   ", [round(l, 2) if l < 1e6 else "huge" for l in train(lr)])
print("0.001 crawls, 0.02 converges, 0.2 explodes")` }],
  codeTitle: ['Linear regression by gradient descent', 'Learning-rate comparison'],
  viz: [{
    title: 'Walking down the loss curve L(w) = (w-3)^2',
    input: '0.25',
    inputLabel: 'Learning rate (try 0.05, 0.25, 0.9, 1.1)',
    gen: function (input) {
      var lr = Number(String(input).trim());
      if (isNaN(lr) || lr <= 0 || lr > 3) throw new Error('Enter a learning rate between 0 and 3, e.g. 0.25');
      var grid = [], vals = [], g;
      for (g = 0; g <= 6; g += 0.5) { grid.push(g); vals.push(r2((g - 3) * (g - 3))); }
      function idx(w) { return Math.max(0, Math.min(grid.length - 1, Math.round(w / 0.5))); }
      var w = 0, frames = [], prev = null, step;
      var ptr0 = {}; ptr0[idx(w)] = 'w';
      frames.push({ narr: 'The bars are the loss at each weight value: a bowl with the lowest point at <b>w = 3</b>. We start at w = 0 with learning rate <b>' + lr + '</b>.', parts: [{ type: 'bars', label: 'loss at w = 0, 0.5, ... 6', values: vals, ptr: ptr0, idxLabels: grid.map(String) }, { type: 'vars', vals: { w: 0, lr: lr, loss: 9 } }] });
      for (step = 1; step <= 10; step++) {
        var slope = 2 * (w - 3), nw = w - lr * slope, loss0 = (w - 3) * (w - 3), loss1 = (nw - 3) * (nw - 3);
        var worse = loss1 > loss0 + 1e-9, out = nw < 0 || nw > 6;
        var ptr = {}; ptr[idx(nw)] = 'w';
        var hl = {}; hl[idx(nw)] = worse ? 'bad' : 'ok';
        var msg = 'Step ' + step + ': slope = 2(w-3) = <b>' + r3(slope) + '</b>. New w = ' + r3(w) + ' - ' + lr + ' x ' + r3(slope) + ' = <b>' + r3(nw) + '</b>. Loss ' + r3(loss0) + ' -> <b>' + r3(loss1) + '</b>.';
        if (worse) msg += ' <span class="c-r">The loss went UP: the step overshot the valley.</span>';
        if (out) msg += ' <span class="c-r">w left the chart - it is diverging.</span>';
        frames.push({ narr: msg, parts: [{ type: 'bars', label: 'loss curve (pointer = current w' + (out ? ', off-chart' : '') + ')', values: vals, ptr: ptr, hl: hl, idxLabels: grid.map(String) }, { type: 'vars', vals: { step: step, w: r3(nw), slope: r3(slope), loss: loss1 > 1e9 ? 'huge' : r3(loss1) }, hl: { loss: worse ? 'bad' : 'ok' } }] });
        w = nw;
        if (Math.abs(w) > 1e6) break;
      }
      return frames;
    }
  }, {
    title: 'Diagnose a loss-vs-epoch curve',
    input: '0.1',
    inputLabel: 'Learning rate for linear regression (try 0.001, 0.02, 0.09, 0.2)',
    gen: function (input) {
      var lr = Number(String(input).trim());
      if (isNaN(lr) || lr <= 0 || lr > 1) throw new Error('Enter a learning rate between 0 and 1, e.g. 0.02');
      var xs = [1, 2, 3, 4, 5], ys = [3, 5, 7, 9, 11], w = 0, b = 0, losses = [], frames = [], e;
      for (e = 1; e <= 12; e++) {
        var dw = 0, db = 0, loss = 0;
        for (var i = 0; i < 5; i++) { var p = w * xs[i] + b, er = p - ys[i]; loss += er * er / 5; dw += 2 * er * xs[i] / 5; db += 2 * er / 5; }
        losses.push(Math.min(loss, 1e6));
        var verdict, cls;
        if (loss > 1e6 || (e > 3 && loss > losses[0] * 2)) { verdict = 'EXPLODING - lower the learning rate'; cls = 'bad'; }
        else if (e >= 4 && losses[e - 1] > 0.9 * losses[e - 2] && loss > 1) { verdict = 'barely moving - raise the learning rate'; cls = 'cur'; }
        else if (e >= 3 && loss < 1) { verdict = 'converging nicely'; cls = 'ok'; }
        else { verdict = 'too early to tell'; cls = 'cur'; }
        var hl = {}; hl[e - 1] = cls;
        frames.push({ narr: 'Epoch ' + e + ': loss = <b>' + (loss > 1e6 ? 'huge' : r3(loss)) + '</b>. Verdict so far: <b>' + verdict + '</b>.', parts: [{ type: 'bars', label: 'loss per epoch (capped at 1,000,000)', values: losses.slice(), hl: hl, texts: losses.map(function (l) { return l >= 1e6 ? 'huge' : String(r2(l)); }) }, { type: 'vars', vals: { lr: lr, epoch: e, loss: loss > 1e6 ? 'huge' : r3(loss), verdict: verdict }, hl: { verdict: cls } }] });
        w -= lr * dw; b -= lr * db;
      }
      return frames;
    }
  }],
  examples: [
    { title: 'One step by hand', html: `<p>Loss <code>L(w) = (w-3)<sup>2</sup></code>, w = 0, lr = 0.25. Slope = 2(0-3) = -6 (negative: loss falls as w increases). New w = 0 - 0.25 x (-6) = <b>1.5</b>. Moving left of the minimum, the slope is negative, so subtracting it moves us <i>right</i> - towards the valley.</p>` },
    { title: 'Why too big a rate diverges', html: `<p>With lr = 1.1 and the same loss: w = 0 -> 0 - 1.1 x (-6) = <b>6.6</b>. Slope there is 2(3.6) = 7.2, so the next w = 6.6 - 7.92 = <b>-1.32</b>. Each hop lands further from 3 than the last (distance 3, 3.6, 4.32...). Distance grows by a factor of 1.2 every step.</p>${H.table(['step', 'w', 'distance from 3'], [['0', '0', '3'], ['1', '6.6', '3.6'], ['2', '-1.32', '4.32'], ['3', '7.78', '4.78 (growing)']])}` },
    { title: 'Mini-batch noise', html: `<p>With batch size 32 each gradient is computed from a small random sample, so the loss curve is jagged but trends down. It is noise, not a bug. A smooth, boringly perfect curve with a huge batch can be slower per unit of compute.</p>` },
    { title: 'Standardize features to help descent', html: `<p>If one feature is in thousands (square feet) and another in single digits (bedrooms), the loss landscape is a long thin canyon: the same lr is too big for one direction and too small for the other. Standardizing features makes the bowl round, so a single lr works for all weights.</p>` }
  ],
  deepDive: `<p><b>Stability limit.</b> For a quadratic bowl with curvature <code>c</code> (here L = (w-3)<sup>2</sup> has c = 2), gradient descent converges only if <code>lr &lt; 2 / c</code>; the best fast rate is <code>1 / c</code>. In real nets, the largest curvature direction sets the maximum safe lr - that is why one huge-curvature direction ruins training for everyone.</p>
  <p><b>Local minima, saddles, plateaus.</b> Linear and logistic regression have one global valley (convex). Neural nets have a messy landscape, but in practice the main enemies are plateaus and saddle points, not bad local minima. Momentum and Adam help to roll through them.</p>
  <p><b>Schedules and warm-up.</b> Typical recipe for transformers: warm up the lr linearly for the first few thousand steps (early gradients are unreliable), then decay with a cosine curve. Large-batch training scales lr with batch size.</p>
  <p><b>Gradient clipping</b> caps the gradient length so one bad batch cannot cause a giant step. <b>Exploding gradients</b> -> clip. <b>Vanishing gradients</b> (deep nets with sigmoid/tanh) -> ReLU, residual connections, normalisation layers.</p>
  <p><b>Convergence criterion.</b> Stop when the validation loss stops improving (early stopping), not when the training loss hits zero.</p>`,
  aiEra: `<p><b>What AI changes:</b> Training frontier LLMs is the same loop on a gigantic scale, and the learning-rate schedule is one of the most guarded hyper-parameters. Most developers now <i>fine-tune</i> with small learning rates (around 1e-5 for full fine-tuning, 1e-4 for LoRA adapters) because big rates cause "catastrophic forgetting" of what the base model already knew.</p>
  <p><b>Use AI as a partner:</b> paste your loss numbers per epoch and ask <code>Diagnose this loss curve and suggest the next learning rate to try.</code> It is good at pattern-matching curve shapes. Ask for a learning-rate sweep script too.</p>
  <p><b>Where AI goes wrong:</b> it copies "lr=0.001" from a tutorial for every problem. It also forgets that the right lr depends on batch size and optimizer (Adam wants a ~100x smaller rate than plain SGD).</p>
  <p><b>What you must still own:</b> looking at the actual curves (train and validation, on a log axis for lr sweeps) and knowing a dropping training loss does not mean the model is good.</p>`,
  problems: [{
    title: 'Tune the learning rate from the loss curve',
    level: 'Easy', tags: ['gradient descent', 'learning rate'],
    statement: `<p>You train three runs of the same model. Training loss for the first 5 epochs:</p>${H.table(['run', 'lr', 'e1', 'e2', 'e3', 'e4', 'e5'], [['A', '0.0001', '5.00', '4.99', '4.98', '4.97', '4.96'], ['B', '0.5', '5.0', '12.4', '55.0', '310', 'NaN'], ['C', '0.01', '5.0', '2.6', '1.4', '0.9', '0.7']])}<p>Diagnose each run and say what you would do next.</p>`,
    constraints: `Answer with a diagnosis and a concrete next lr for A and B.`,
    example: `<p>Run A: ${H.c('y', 'falls extremely slowly')} -> lr too small, try 10x (0.001 or 0.003). Run B: ${H.c('r', 'rises then NaN')} -> diverging, lr too big, try 0.05 (divide by 10). Run C: ${H.c('g', 'smooth fast fall')} -> keep it.</p>`,
    brute: { why: `<p>Lazy approach: "change the rate randomly until it works". Each training run may cost minutes to days, so random guessing wastes compute. The curve shape tells you the direction to move.</p>` },
    mcq: { q: 'Loss goes 5, 12, 55, 310, NaN. What is the most likely cause?', options: ['Learning rate too small', 'Learning rate too large', 'Too much training data', 'Test set leak'], answer: 1, explain: 'A loss that grows, usually exponentially, then NaN means each step overshoots further than the last: the learning rate is above the stability limit.' },
    hints: [`<p>Look at the <i>direction and speed</i> of each curve: does it fall, crawl or rise?</p>`, `<p>Crawl = steps too small. Rise/explode = steps too big. Smooth fall = just right.</p>`, `<p>Move the learning rate by factors of 3 or 10 (log scale), not by +0.001. After the change, compare the new curve to the old one on the same axes.</p>`],
    solution: {
      approach: `<p><b>Run A</b> loses only 0.01 per epoch: the steps are far too small, so at this speed it needs thousands of epochs. Multiply the lr by 10 (to 0.001) and re-check; repeat until the curve is steep but still smooth. <b>Run B</b> explodes: every step overshoots the valley by more than the previous one, so the loss grows exponentially and finally overflows to NaN. Divide the lr by 10 (0.05), and if it still jumps, by 3 again; also consider gradient clipping. <b>Run C</b> falls quickly and smoothly, with shrinking steps as it nears the bottom, so keep lr = 0.01 and let it run until the validation loss stops improving. In practice you run a short sweep on a log scale (1e-4, 3e-4, 1e-3, 3e-3, 1e-2) for a few epochs each and pick the largest rate that is still stable.</p>`,
      dry: { head: ['run', 'shape', 'diagnosis', 'next lr'], rows: [['A', 'falls 0.01 per epoch', 'too small', '0.001'], ['B', 'rises then NaN', 'too big', '0.05'], ['C', 'smooth fast fall', 'good', '0.01 (keep)']] },
      complexity: `<p>A log-scale sweep of k values costs k short runs: O(k x epochs_short) - far cheaper than a random walk over lr values.</p>`,
      followUps: ['Why do many teams use a warm-up followed by decay instead of a constant learning rate?']
    }
  }]
});

// ---------------- TOPIC 5: overfitting / underfitting ----------------
topics.push({
  title: 'Overfitting, Underfitting and the Bias-Variance Trade-off',
  analogy: `<p>Three students prepare for an exam. <b>Student A</b> reads only the chapter titles - fails both practice tests and the real exam (<b>underfitting</b>: too simple). <b>Student B</b> memorizes the practice papers word by word - gets 100% on practice, fails the real exam because the questions are phrased differently (<b>overfitting</b>: memorized the noise). <b>Student C</b> understands the ideas - does well on both (<b>good fit</b>).</p>`,
  explain: `<p>You diagnose a model by comparing two numbers: the error on <b>training</b> data and the error on <b>validation</b> data.</p>
  ${H.table(['train error', 'validation error', 'diagnosis', 'what to do'], [['<span class="c-r">high</span>', '<span class="c-r">high</span> (similar)', '<b>Underfitting</b> (high bias)', 'bigger/more flexible model, better features, train longer, less regularization'], ['<span class="c-g">low</span>', '<span class="c-r">much higher</span>', '<b>Overfitting</b> (high variance)', 'more data, simpler model, regularization, dropout, early stopping, fewer features'], ['<span class="c-g">low</span>', '<span class="c-g">low</span> (close)', '<b>Good fit</b>', 'ship it - then monitor']])}
  <p><b>Bias and variance in plain words:</b></p>
  <ul><li><b>Bias</b> = the model is too stubborn/simple to capture the real pattern (a straight line through a curve). It is wrong in the same way every time, whatever data you give it.</li>
  <li><b>Variance</b> = the model is too jumpy: change a few training rows and the learned curve changes wildly, because it chases random noise.</li></ul>
  <p>Total error is roughly <code>bias<sup>2</sup> + variance + noise</code>. Making the model more complex lowers bias but raises variance. The sweet spot is in the middle: <b>that is the bias-variance trade-off</b>.</p>
  <p>Typical picture as model complexity grows (polynomial degree 1, 2, 3, ...): training error <b>always keeps falling</b>, validation error falls then <b>turns upward</b>. The bottom of the validation curve is where to stop. The gap between the two curves is your overfitting meter.</p>
  <p><b>Learning curves</b> (error vs number of training rows) help too: if both curves plateau high -> underfit, more data will not help. If there is a big gap that shrinks with more data -> overfit, more data will help.</p>
  <p><b>Fixes for overfitting, in order of how I would try them:</b> get more (or augment) data, simplify the model, add regularization (next topic), stop training earlier, drop noisy features, use ensembles (averaging many models reduces variance).</p>`,
  clues: ['"99% train accuracy, 70% validation accuracy" - overfitting', '"train and validation both poor" - underfitting / high bias', '"validation loss starts rising while training loss keeps falling" - overfitting began at that epoch', '"model has far more parameters than data rows" - overfitting risk', '"adding more data stopped helping" - high bias, need a richer model', '"unstable predictions when training data changes slightly" - high variance'],
  code: [{ lang: 'python', run: true, title: 'Polynomial fit: train vs validation error (stdlib only)', code: `# Polynomial fit: train error vs validation error as degree grows (pure stdlib)
import random, math
random.seed(3)
def make(n):
    pts = []
    for _ in range(n):
        x = random.uniform(-1, 1)
        pts.append((x, math.sin(2.5 * x) + random.gauss(0, 0.25)))
    return pts
train, val = make(12), make(60)

def solve(A, b):                     # Gaussian elimination with pivoting
    n = len(b)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        for r in range(c + 1, n):
            f = M[r][c] / M[c][c]
            for k in range(c, n + 1):
                M[r][k] -= f * M[c][k]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = (M[i][n] - sum(M[i][j] * x[j] for j in range(i + 1, n))) / M[i][i]
    return x

def fit(pts, deg, lam=1e-9):         # least squares via normal equations
    m = deg + 1
    A = [[sum(x ** (i + j) for x, _ in pts) + (lam if i == j else 0) for j in range(m)] for i in range(m)]
    b = [sum(y * x ** i for x, y in pts) for i in range(m)]
    return solve(A, b)

def mse(coef, pts):
    return sum((sum(c * x ** k for k, c in enumerate(coef)) - y) ** 2 for x, y in pts) / len(pts)

print("degree  train_mse  val_mse")
for d in (0, 1, 3, 5, 8, 10):
    c = fit(train, d)
    print(f"{d:6d}  {mse(c, train):9.4f}  {mse(c, val):8.4f}")
print("train error keeps falling; validation error turns around -> overfitting")
` }, { lang: 'python', check: false, title: 'Same experiment with NumPy', code: `import numpy as np
rng = np.random.default_rng(3)
x = rng.uniform(-1, 1, 12); y = np.sin(2.5 * x) + rng.normal(0, 0.25, 12)
xv = rng.uniform(-1, 1, 60); yv = np.sin(2.5 * xv) + rng.normal(0, 0.25, 60)
for d in (1, 3, 8):
    coef = np.polyfit(x, y, d)
    print(d, np.mean((np.polyval(coef, x) - y) ** 2), np.mean((np.polyval(coef, xv) - yv) ** 2))` }],
  codeTitle: ['Train vs validation error by degree (runs here)', 'NumPy version'],
  viz: {
    title: 'Train vs validation error as the model gets more complex',
    input: '15',
    inputLabel: 'Number of training rows (try 8, 15, 100): more data tames overfitting',
    gen: function (input) {
      var n = Number(String(input).trim());
      if (isNaN(n) || n < 5 || n > 1000) throw new Error('Enter a number of training rows between 5 and 1000');
      var tr = [], va = [], d, frames = [];
      var labels = [];
      frames.push({ narr: 'We fit models of growing complexity (degree 1 to 8) on <b>' + n + '</b> training rows. Bars show error: lower is better. A tidy model of the toy data has a floor of noise error about 0.1.', parts: [{ type: 'bars', label: 'train error', values: [0], texts: ['-'] }] });
      for (d = 1; d <= 8; d++) {
        var bias = 3.0 / (d * d);
        var variance = 0.012 * d * d * d / (n / 10);
        var t = 0.1 + bias * 0.9 + variance * 0.15 * Math.max(0, 1 - d / 9) * 0;
        t = Math.max(0.05, 0.1 + bias - 0.02 * d * (n < 20 ? 3 : 1) * 0 - variance * 0.6);
        var v = 0.1 + bias + variance;
        tr.push(r2(t)); va.push(r2(v)); labels.push('d' + d);
        var best = va.indexOf(Math.min.apply(null, va));
        var gap = v - t, verdict, cls;
        if (t > 0.9 * v && t > 0.6) { verdict = 'UNDERFIT: both errors high'; cls = 'cur'; }
        else if (gap > 0.35) { verdict = 'OVERFIT: big gap between train and validation'; cls = 'bad'; }
        else { verdict = 'reasonable fit'; cls = 'ok'; }
        var hlv = {}; hlv[best] = 'ok'; if (cls === 'bad') hlv[d - 1] = 'bad';
        frames.push({ narr: 'Degree <b>' + d + '</b>: train error ' + r2(t) + ', validation error ' + r2(v) + ', gap ' + r2(gap) + '. <b>' + verdict + '</b>.' + (best === d - 1 ? ' Best validation so far.' : ''), parts: [{ type: 'bars', label: 'train error', values: tr.slice(), idxLabels: labels.slice(), texts: tr.map(String) }, { type: 'bars', label: 'validation error (green = best so far, red = overfit)', values: va.slice(), hl: hlv, idxLabels: labels.slice(), texts: va.map(String) }, { type: 'vars', vals: { degree: d, train: r2(t), validation: r2(v), diagnosis: verdict }, hl: { diagnosis: cls } }] });
      }
      var bd = va.indexOf(Math.min.apply(null, va)) + 1;
      frames.push({ narr: 'Pick the degree where <b>validation</b> error is lowest: <b>degree ' + bd + '</b>. Training error alone would have chosen degree 8 - the most overfit model. With more data (try 100) the sweet spot moves right.', parts: [{ type: 'bars', label: 'train error', values: tr, idxLabels: labels, texts: tr.map(String) }, { type: 'bars', label: 'validation error', values: va, hl: (function () { var h = {}; h[bd - 1] = 'sel'; return h; })(), idxLabels: labels, texts: va.map(String) }] });
      return frames;
    }
  },
  examples: [
    { title: 'Diagnose from numbers', html: `<p>Model X: train accuracy 62%, validation 60%. Model Y: train 99%, validation 71%. Model Z: train 91%, validation 89%.</p>${H.table(['model', 'diagnosis'], [['X', '<span class="c-y">underfit</span> - both low and close'], ['Y', '<span class="c-r">overfit</span> - 28 point gap'], ['Z', '<span class="c-g">good fit</span>']])}` },
    { title: 'Reading epoch curves', html: `<p>Epoch 1-5: train loss 1.2 -> 0.6, val loss 1.3 -> 0.7 (both falling: learning). Epoch 6-12: train loss 0.5 -> 0.1, val loss 0.7 -> 0.9 (val rising: memorizing). The best model is the one saved around epoch 5-6.</p>` },
    { title: 'Why a deep net with 1 million parameters on 500 rows overfits', html: `<p>It can assign each training row its own private "explanation". Training error can reach zero while it learned nothing general. This is also why the first reflex is: <b>get more data or regularize</b>.</p>` },
    { title: 'Ensembles reduce variance', html: `<p>Train 100 jumpy decision trees on random subsets and average them (random forest). Each tree overfits differently; the average cancels the noise. Variance drops, bias stays about the same.</p>` }
  ],
  deepDive: `<p><b>Double descent.</b> Classical theory says "more parameters than data = disaster". Modern deep nets show <i>double descent</i>: validation error rises near the point where the model can barely interpolate the data, then falls again as the model gets even bigger. That is why huge over-parameterised networks still generalise - helped by implicit regularization from SGD.</p>
  <p><b>Formal decomposition.</b> For squared error at a point x: <code>E[(y - f(x))<sup>2</sup>] = Bias<sup>2</sup> + Variance + Irreducible noise</code>. Noise cannot be reduced by any model - that is the floor.</p>
  <p><b>Validation overfitting.</b> If you try thousands of models you overfit the validation set itself. Keep a separate test set and prefer simple models when scores tie (one-standard-error rule).</p>
  <p><b>Distribution shift</b> looks like overfitting but is different: validation (drawn from the same time/source as training) is fine, but production data has changed. Monitor live metrics.</p>
  <p><b>Practical checklist:</b> plot train and validation curves every time; check the gap; try the cheapest fix first (more data, regularization, early stopping); only then change the architecture.</p>`,
  aiEra: `<p><b>What AI changes:</b> LLMs are trained on so much data that a single pass rarely overfits, but <b>fine-tuning on a few hundred examples</b> overfits easily: the model parrots your training phrases and loses general skill. For prompts, "overfitting" is tuning a prompt on 5 favourite examples until it passes them but fails on real users.</p>
  <p><b>Use AI as a partner:</b> give it your train/val numbers and ask <code>Which of overfitting, underfitting or distribution shift fits this, and what is the cheapest experiment to confirm?</code></p>
  <p><b>Where AI goes wrong:</b> it recommends a bigger model as the cure for everything, and may "fix" overfitting by quietly tuning against the test set. It also loves reporting training accuracy as if it were the result.</p>
  <p><b>What you must still own:</b> always reporting held-out numbers, building a prompt/eval set that is separate from the examples you used while developing, and watching live data for drift.</p>`,
  problems: [{
    title: 'Diagnose over/underfitting from train vs validation',
    level: 'Medium', tags: ['bias-variance', 'diagnosis'],
    statement: `<p>Four experiments, each with (train accuracy, validation accuracy): <b>P</b> (71%, 69%), <b>Q</b> (100%, 64%), <b>R</b> (93%, 91%), <b>S</b> (55%, 56%) on a task where humans reach 95%. For each: diagnose, then pick one fix from: more data, add regularization, bigger model, more features, early stopping.</p>`,
    constraints: `Use the human level of 95% as a hint for what "good" looks like.`,
    example: `<p>P: both far below 95% and close together -> ${H.c('y', 'underfit (high bias)')}, bigger model / more features. Q: huge gap -> ${H.c('r', 'overfit (high variance)')}, regularization or more data. R: near human, tiny gap -> ${H.c('g', 'good')}. S: very low everywhere -> ${H.c('y', 'severe underfit')} (maybe a bug).</p>`,
    brute: { why: `<p>Weak habit: judge only by the training accuracy ("Q is 100%, best!") or only by validation. You need both numbers <i>and</i> a target level to separate bias from variance.</p>` },
    mcq: { q: 'Training accuracy 99%, validation accuracy 70%. Which change is MOST likely to help?', options: ['Train for many more epochs', 'Make the model bigger', 'Add regularization or more data', 'Remove the validation set'], answer: 2, explain: 'A large gap is high variance (overfitting). Regularization, more data, or a simpler model reduce the gap. More epochs or a bigger model usually make it worse.' },
    hints: [`<p>Compute the gap = train - validation, and the distance from the target = 95 - train.</p>`, `<p>Large distance from target on TRAIN -> bias problem. Large gap between train and val -> variance problem.</p>`, `<p>P and S: bias (S is so low it may also be a bug - check the data and labels). Q: variance. R: fine. Pick the cheapest matching fix.</p>`],
    solution: {
      approach: `<p><b>P (71/69):</b> the model cannot even fit its own training data well and the gap is tiny, so it is underfitting with high bias: use a bigger or more flexible model, add informative features, train longer, reduce regularization. <b>Q (100/64):</b> memorized training data, a 36-point gap means high variance: add regularization, get or augment data, simplify the model or stop earlier. <b>R (93/91):</b> within two points of human level on train and a small gap, so this is a good fit; ship it and monitor. <b>S (55/56):</b> extremely low on both; first suspect a bug (wrong labels, features not aligned with labels, learning rate too small) before blaming the model size. The method: compare train error to the target for bias and train-vs-validation for variance, then spend effort on the larger problem.</p>`,
      dry: { head: ['run', 'train', 'val', 'gap', 'diagnosis', 'first fix'], rows: [['P', '71', '69', '2', 'underfit', 'bigger model / features'], ['Q', '100', '64', '36', 'overfit', 'regularize / more data'], ['R', '93', '91', '2', 'good', 'ship + monitor'], ['S', '55', '56', '1', 'severe underfit or bug', 'check data pipeline first']] },
      complexity: `<p>Diagnosis is O(1) arithmetic per run; the cost is in running the follow-up experiment.</p>`,
      followUps: ['Draw the learning curve you would expect for Q as the training set grows.']
    }
  }]
});

// ---------------- TOPIC 6: regularization ----------------
topics.push({
  title: 'Regularization: L1, L2 and Early Stopping',
  analogy: `<p>A student who is allowed to write unlimited notes will copy the whole textbook onto a cheat sheet. Give the same student a <b>one-page limit</b> and they must keep only the ideas that matter. Regularization is that page limit for a model: a cost for using large, complicated weights, so the model keeps only what really helps. <b>Early stopping</b> is the invigilator ringing the bell before the student starts memorizing.</p>`,
  explain: `<p>Regularization = deliberately make the model a bit <i>less able to memorize</i>, so it generalizes better. The classic way is to add a <b>penalty for big weights</b> to the loss:</p>
  <p><code>total loss = data loss + lambda x penalty(weights)</code></p>
  <p><code>lambda</code> (also called alpha, or C = 1/lambda in some libraries) is the strength: 0 = no regularization (risk of overfit), huge = weights squashed to zero (underfit). You choose it with the validation set.</p>
  <ul><li><b>L2 (Ridge, "weight decay")</b>: penalty = sum of <i>squares</i> of weights. Shrinks every weight smoothly towards 0 but rarely exactly to 0. Good default. It dislikes one giant weight, so it spreads the credit over correlated features.</li>
  <li><b>L1 (Lasso)</b>: penalty = sum of <i>absolute values</i>. It pushes many weights to <b>exactly zero</b>, which means automatic feature selection. Useful when you believe only a few features matter or want a sparse, explainable model.</li>
  <li><b>Elastic Net</b>: a mix of both.</li>
  <li><b>Early stopping</b>: watch validation loss each epoch; when it has not improved for <b>patience</b> epochs, stop and keep the best weights. Costs nothing and works on any model trained by gradient descent.</li>
  <li><b>Others you will meet</b>: dropout (randomly switch off neurons during training), data augmentation, smaller models, ensembling.</li></ul>
  ${H.table(['weight w', 'lambda = 0', 'L2 (lambda=1)', 'L1 (lambda=1)'], [['4.0', '4.0', '2.0', '3.0'], ['1.0', '1.0', '0.5', '<span class="c-r">0</span>'], ['0.4', '0.4', '0.2', '<span class="c-r">0</span>']])}
  <p>(Toy shrinkage: L2 divides by 1 + lambda; L1 subtracts lambda from the weight size and snaps to 0 if it would cross zero.) Notice L1 kills small weights outright, L2 only shrinks them.</p>
  <p><b>Important:</b> standardize features before using L1/L2, otherwise a feature measured in big units gets unfairly small weights and an unfair pass from the penalty. Never penalize the bias/intercept term.</p>`,
  clues: ['"too many features, want automatic feature selection" - L1 / Lasso', '"correlated features, want stable weights" - L2 / Ridge', '"validation loss rises while train loss falls" - early stopping or more regularization', '"weight decay" - L2 in neural-net language', '"randomly drop units during training" - dropout', '"model has huge coefficients" - sign of overfitting; add L2'],
  code: [{ lang: 'python', run: true, title: 'L2 regularized gradient descent and early stopping (stdlib)', code: `import random
random.seed(1)
# Few noisy points of y = 2x, but we give the model many wiggly features.
def feats(x):
    return [x, x ** 2, x ** 3, x ** 4, x ** 5]

def make(n):
    pts = []
    for _ in range(n):
        x = random.uniform(-1, 1)
        pts.append((feats(x), 2 * x + random.gauss(0, 0.3)))
    return pts

train, val = make(8), make(50)

def predict(w, f):
    return sum(a * b for a, b in zip(w, f))

def mse(w, data):
    return sum((predict(w, f) - y) ** 2 for f, y in data) / len(data)

def fit(lam, epochs=3000, lr=0.05, patience=None):
    w = [0.0] * 5
    best, best_w, bad = 1e9, w[:], 0
    for ep in range(epochs):
        grad = [0.0] * 5
        for f, y in train:
            err = predict(w, f) - y
            for j in range(5):
                grad[j] += 2 * err * f[j] / len(train)
        for j in range(5):
            grad[j] += 2 * lam * w[j]          # L2 penalty gradient (weight decay)
            w[j] -= lr * grad[j]
        v = mse(w, val)
        if patience is not None:
            if v < best - 1e-6:
                best, best_w, bad = v, w[:], 0
            else:
                bad += 1
                if bad >= patience:
                    return best_w, ep
    return w, epochs

for lam in (0.0, 0.01, 0.1, 1.0):
    w, _ = fit(lam)
    print(f"lambda={lam:5}  train={mse(w, train):.3f}  val={mse(w, val):.3f}  max|w|={max(abs(a) for a in w):.2f}")
w, stopped = fit(0.0, patience=30)
print(f"early stopping (no L2) stopped at epoch {stopped}: val={mse(w, val):.3f}")` }, { lang: 'python', run: true, title: 'L1 vs L2: the soft-threshold vs shrink rule', code: `def l2_shrink(w, lam):
    return w / (1 + lam)               # smooth shrink, never exactly zero

def l1_shrink(w, lam):
    # soft-thresholding: subtract lam, snap to zero if it crosses zero
    if w > lam:
        return w - lam
    if w < -lam:
        return w + lam
    return 0.0

weights = [4.0, 1.0, 0.4, -0.3, -2.5]
for lam in (0.5, 1.0):
    print("lambda =", lam)
    print("  original:", weights)
    print("  L2      :", [round(l2_shrink(w, lam), 2) for w in weights])
    print("  L1      :", [round(l1_shrink(w, lam), 2) for w in weights])
print("L1 zeroed the small weights - that is feature selection")` }, { lang: 'python', check: false, title: 'scikit-learn Ridge / Lasso', code: `from sklearn.linear_model import Ridge, Lasso, ElasticNet
ridge = Ridge(alpha=1.0).fit(X_train, y_train)      # L2
lasso = Lasso(alpha=0.1).fit(X_train, y_train)      # L1
print((lasso.coef_ == 0).sum(), "features removed")` }],
  codeTitle: ['L2 + early stopping (runs here)', 'L1 vs L2 shrinkage', 'scikit-learn'],
  viz: [{
    title: 'Early stopping: watch validation loss, keep the best epoch',
    input: '2',
    inputLabel: 'Patience (epochs to wait for an improvement): 1 - 5',
    gen: function (input) {
      var pat = Number(String(input).trim());
      if (isNaN(pat) || pat < 1 || pat > 5 || Math.floor(pat) !== pat) throw new Error('Patience must be a whole number from 1 to 5');
      var train = [1.0, 0.7, 0.5, 0.38, 0.28, 0.2, 0.14, 0.1, 0.07, 0.05];
      var val = [1.05, 0.78, 0.6, 0.52, 0.5, 0.53, 0.51, 0.58, 0.66, 0.75];
      var best = 1e9, bestEp = 0, bad = 0, frames = [], tr = [], va = [], e, stopped = false;
      frames.push({ narr: 'We train for up to 10 epochs. Each epoch we compute training and validation loss. We only keep the weights from the <b>best validation epoch</b>. Patience = <b>' + pat + '</b>.', parts: [{ type: 'bars', label: 'validation loss', values: [0], texts: ['-'] }, { type: 'vars', vals: { patience: pat, best_val: '-', waited: 0 } }] });
      for (e = 0; e < 10 && !stopped; e++) {
        tr.push(train[e]); va.push(val[e]);
        var improved = val[e] < best - 1e-9;
        if (improved) { best = val[e]; bestEp = e + 1; bad = 0; } else bad++;
        var hl = {}; hl[bestEp - 1] = 'ok'; if (!improved) hl[e] = 'bad';
        var msg = 'Epoch ' + (e + 1) + ': train ' + train[e] + ', validation ' + val[e] + '. ';
        if (improved) msg += '<span class="c-g">New best - save these weights.</span>';
        else msg += '<span class="c-r">No improvement (' + bad + '/' + pat + ').</span>';
        if (bad >= pat) { msg += ' <b>Stop!</b> Restore the weights from epoch ' + bestEp + '.'; stopped = true; }
        frames.push({ narr: msg, parts: [{ type: 'bars', label: 'training loss (keeps falling)', values: tr.slice(), texts: tr.map(String) }, { type: 'bars', label: 'validation loss (green = best epoch)', values: va.slice(), hl: hl, texts: va.map(String) }, { type: 'vars', vals: { best_epoch: bestEp, best_val: best, waited: bad }, hl: { waited: bad >= pat ? 'bad' : 'cur' } }] });
      }
      if (!stopped) frames.push({ narr: 'Training ended at the epoch limit. Best epoch was ' + bestEp + '.', parts: [{ type: 'vars', vals: { best_epoch: bestEp, best_val: best } }] });
      return frames;
    }
  }, {
    title: 'L1 vs L2 shrinking the same weights',
    input: '1',
    inputLabel: 'Regularization strength lambda (0.2 - 3)',
    gen: function (input) {
      var lam = Number(String(input).trim());
      if (isNaN(lam) || lam < 0.2 || lam > 3) throw new Error('Enter lambda between 0.2 and 3');
      var w = [4, 2.5, 1, 0.4, -0.3, -2];
      var l2 = w.map(function (x) { return r2(x / (1 + lam)); });
      var l1 = w.map(function (x) { return x > lam ? r2(x - lam) : x < -lam ? r2(x + lam) : 0; });
      var zeros = l1.filter(function (x) { return x === 0; }).length;
      var hz = {}; l1.forEach(function (x, i) { if (x === 0) hz[i] = 'bad'; });
      return [
        { narr: 'Six learned weights before regularization. Think of each as "how much the model relies on feature i".', parts: [{ type: 'array', label: 'original weights', values: w, showIdx: true }] },
        { narr: '<b>L2</b> with lambda = ' + lam + ' divides every weight by (1 + lambda): all shrink, none vanish.', parts: [{ type: 'array', label: 'original', values: w }, { type: 'array', label: 'after L2', values: l2, hl: { 0: 'win', 1: 'win', 2: 'win', 3: 'win', 4: 'win', 5: 'win' } }] },
        { narr: '<b>L1</b> subtracts lambda from each weight\'s size and snaps to <b>zero</b> if it would cross zero. ' + zeros + ' weight(s) became exactly 0 (red): those features are switched off.', parts: [{ type: 'array', label: 'original', values: w }, { type: 'array', label: 'after L1 (red = removed feature)', values: l1, hl: hz }] },
        { narr: 'Compare: L1 gives a <b>sparse</b> model (' + zeros + ' features dropped), L2 gives a <b>smooth</b> model using everything a little. Pick with validation error.', parts: [{ type: 'array', label: 'L2', values: l2 }, { type: 'array', label: 'L1', values: l1, hl: hz }, { type: 'vars', vals: { lambda: lam, features_dropped_by_L1: zeros, features_dropped_by_L2: 0 }, hl: { features_dropped_by_L1: 'sel' } }] }
      ];
    }
  }],
  examples: [
    { title: 'Choosing lambda with validation', html: `<p>Try lambda in 0, 0.001, 0.01, 0.1, 1, 10 (log scale). Train error rises with lambda; validation error falls then rises again (a U shape). Pick the lambda at the bottom of the U.</p>${H.table(['lambda', 'train err', 'val err'], [['0', '0.02', '0.80'], ['0.01', '0.05', '0.30'], ['0.1', '0.12', '<span class="c-g">0.22</span>'], ['10', '0.70', '0.72']])}` },
    { title: 'Lasso as feature selection', html: `<p>You have 500 gene measurements for 80 patients. Lasso keeps 12 non-zero weights. The doctors now have a short list of genes to study. A pure L2 model would keep all 500 with small weights - harder to explain.</p>` },
    { title: 'Dropout in one picture', html: `<p>During each training step, every hidden unit is switched off with probability 0.5. The network cannot rely on any single unit, so it learns redundant, robust features. At test time all units are on, scaled appropriately.</p>` },
    { title: 'Early stopping is regularization too', html: `<p>Weights start near zero and grow as training continues. Stopping early keeps them small - mathematically similar to L2 for linear models. Zero extra compute, but needs a validation set.</p>` }
  ],
  deepDive: `<p><b>Bayesian view.</b> L2 equals assuming each weight starts as a bell curve around zero (Gaussian prior); L1 equals a pointy Laplace prior that puts lots of probability at exactly zero. That is why L1 produces zeros.</p>
  <p><b>Geometry.</b> The L1 constraint region is a diamond with corners on the axes; the loss contours usually touch a corner, where some weights are zero. The L2 region is a circle with no corners, so weights are small but non-zero.</p>
  <p><b>AdamW.</b> In Adam, naive L2 interacts badly with the adaptive step sizes. AdamW "decouples" weight decay from the gradient update and is the default for training transformers (typical weight decay 0.01-0.1).</p>
  <p><b>Interactions.</b> More data, smaller models, dropout, augmentation and early stopping all substitute for each other: do not stack all of them at maximum strength or you underfit. Always re-check the train/validation gap after each change.</p>
  <p><b>Lasso caveat:</b> with strongly correlated features, Lasso arbitrarily picks one and drops the rest, and the selection can flip with a different sample. Elastic Net is more stable. Also, shrinkage biases the remaining weights downward - a deliberate bias-for-variance trade.</p>`,
  aiEra: `<p><b>What AI changes:</b> Fine-tuning LLMs with LoRA is itself a regularizer: you train only a tiny set of low-rank adapter weights, leaving the base model frozen, which limits how far the model can drift and overfit. Large pretraining runs use weight decay, dropout (sometimes none), and fresh data every step (so no epoch is repeated much).</p>
  <p><b>Use AI as a partner:</b> ask <code>I have 2,000 rows and 300 features, validation error is 3x training error. Propose a regularization plan ordered by cheapest first, with the hyper-parameter ranges to sweep.</code></p>
  <p><b>Where AI goes wrong:</b> it recommends Lasso/Ridge without standardizing features, tunes lambda on the test set, or confuses the library's <code>C</code> (inverse strength) with <code>alpha</code> (direct strength) - cranking it the wrong way.</p>
  <p><b>What you must still own:</b> knowing which direction of the knob underfits vs overfits, and verifying with a train/validation curve rather than trusting a default.</p>`
});

// ---------------- TOPIC 7: confusion matrix and metrics ----------------
topics.push({
  title: 'Confusion Matrix, Accuracy, Precision, Recall, F1 and Class Imbalance',
  analogy: `<p>A smoke alarm. <b>Precision</b> asks: "when it rings, is there really a fire?" (a precise alarm rarely cries wolf). <b>Recall</b> asks: "of all real fires, how many did it catch?" (a sensitive alarm never misses one). An alarm that rings all day has perfect recall and terrible precision. One that never rings has no false alarms but zero recall. <b>Accuracy</b> alone hides this: in a town where fires happen 1 day in 1000, "never ring" is 99.9% accurate and totally useless.</p>`,
  explain: `<p>For a yes/no (binary) classifier call "yes" the <b>positive</b> class (fraud, spam, disease). Every prediction lands in one of four boxes, the <b>confusion matrix</b>:</p>
  ${H.table(['', 'predicted YES', 'predicted NO'], [['<b>actually YES</b>', '<span class="c-g">TP</span> true positive (caught it)', '<span class="c-r">FN</span> false negative (missed it)'], ['<b>actually NO</b>', '<span class="c-r">FP</span> false positive (false alarm)', '<span class="c-g">TN</span> true negative (correctly ignored)']])}
  <p>The four metrics, with a worked example: TP = 3, FP = 2, FN = 1, TN = 14 (20 rows):</p>
  <ul><li><b>Accuracy</b> = (TP + TN) / all = 17/20 = <b>0.85</b>. "How often right overall".</li>
  <li><b>Precision</b> = TP / (TP + FP) = 3/5 = <b>0.60</b>. "Of the ones I flagged, how many were real".</li>
  <li><b>Recall</b> (sensitivity, true positive rate) = TP / (TP + FN) = 3/4 = <b>0.75</b>. "Of the real ones, how many did I catch".</li>
  <li><b>F1</b> = 2PR / (P + R) = 2 x 0.6 x 0.75 / 1.35 = <b>0.667</b>. The harmonic mean: it is low unless <i>both</i> precision and recall are decent, so you cannot cheat by maximizing one.</li></ul>
  <p><b>Class imbalance:</b> if only 1-5% of rows are positive (fraud, rare disease, ad clicks), accuracy is nearly useless. In the example above, a lazy model that always says NO scores 16/20 = 80% accuracy with recall 0. Always compare to the <b>majority-class baseline</b> and look at precision, recall and F1 (or PR-AUC).</p>
  <p><b>Ways to handle imbalance:</b> use proper metrics; give positive rows a bigger weight in the loss (<code>class_weight</code>); oversample positives or undersample negatives (only on the training set!); collect more positives; move the decision threshold (next topics). Keep the validation/test sets at the <i>real</i> class ratio so the numbers are honest.</p>
  <p><b>Other forms:</b> multi-class problems use macro-average (average the per-class F1, treats rare classes equally) or micro-average (pool counts). F-beta generalizes F1: F2 weights recall more, F0.5 weights precision more.</p>`,
  clues: ['"99% of transactions are legitimate" - class imbalance: accuracy misleads', '"missing a positive is very costly" - maximize recall', '"false alarms are expensive / annoy users" - maximize precision', '"need one number balancing precision and recall" - F1', '"model always predicts the majority class" - check recall / confusion matrix', '"macro vs micro averaging" - rare classes matter equally (macro) or not (micro)'],
  code: [{ lang: 'python', run: true, title: 'Confusion matrix + metrics calculator', code: `y_true = [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
y_pred = [1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

def confusion(y_true, y_pred):
    tp = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 1)
    fp = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 1)
    fn = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 0)
    tn = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 0)
    return tp, fp, fn, tn

def safe_div(a, b):
    return a / b if b else 0.0       # avoid dividing by zero

def metrics(tp, fp, fn, tn):
    accuracy = (tp + tn) / (tp + fp + fn + tn)
    precision = safe_div(tp, tp + fp)
    recall = safe_div(tp, tp + fn)
    f1 = safe_div(2 * precision * recall, precision + recall)
    return accuracy, precision, recall, f1

tp, fp, fn, tn = confusion(y_true, y_pred)
print("            pred=1  pred=0")
print(f"actual=1    TP={tp:<3}   FN={fn}")
print(f"actual=0    FP={fp:<3}   TN={tn}")
a, p, r, f = metrics(tp, fp, fn, tn)
print(f"accuracy={a:.3f} precision={p:.3f} recall={r:.3f} f1={f:.3f}")

# The lazy baseline: always predict 0
lazy = [0] * len(y_true)
a, p, r, f = metrics(*confusion(y_true, lazy))
print(f"always-NO model: accuracy={a:.3f} precision={p:.3f} recall={r:.3f} f1={f:.3f}")` }, { lang: 'python', check: false, title: 'scikit-learn equivalents', code: `from sklearn.metrics import confusion_matrix, classification_report
print(confusion_matrix(y_true, y_pred))
print(classification_report(y_true, y_pred, digits=3))` }],
  codeTitle: ['Metrics from scratch (runs here)', 'scikit-learn'],
  viz: {
    title: 'Confusion matrix to accuracy, precision, recall, F1',
    input: '3 2 1 14',
    inputLabel: 'TP FP FN TN (counts), e.g. 3 2 1 14',
    gen: function (input) {
      var a = nums(input, 4);
      if (a.length !== 4 || a.some(function (x) { return x < 0 || Math.floor(x) !== x; })) throw new Error('Give four whole numbers: TP FP FN TN');
      var tp = a[0], fp = a[1], fn = a[2], tn = a[3], tot = tp + fp + fn + tn;
      if (tot === 0) throw new Error('Counts cannot all be zero');
      function sd(x, y) { return y ? x / y : 0; }
      var acc = sd(tp + tn, tot), pre = sd(tp, tp + fp), rec = sd(tp, tp + fn), f1 = sd(2 * pre * rec, pre + rec);
      var rows = [[tp, fn], [fp, tn]], rh = ['actual YES', 'actual NO'], ch = ['predicted YES', 'predicted NO'];
      var frames = [];
      frames.push({ narr: 'The 2x2 confusion matrix: <b>' + tot + '</b> predictions sorted by what the model said and what was true.', parts: [{ type: 'grid', label: 'confusion matrix', rows: rows, rowHead: rh, colHead: ch }] });
      frames.push({ narr: '<b>Accuracy</b> = (TP + TN) / total = (' + tp + ' + ' + tn + ') / ' + tot + ' = <b>' + r3(acc) + '</b>. The two green diagonal cells are the correct ones.', parts: [{ type: 'grid', label: 'diagonal = correct', rows: rows, rowHead: rh, colHead: ch, hl: { '0,0': 'ok', '1,1': 'ok' } }, { type: 'vars', vals: { accuracy: r3(acc) } }] });
      frames.push({ narr: '<b>Precision</b> = TP / (TP + FP) = ' + tp + ' / ' + (tp + fp) + ' = <b>' + r3(pre) + '</b>. Look down the "predicted YES" column: of everything flagged, this fraction was real.', parts: [{ type: 'grid', label: 'predicted-YES column', rows: rows, rowHead: rh, colHead: ch, hl: { '0,0': 'ok', '1,0': 'bad' } }, { type: 'vars', vals: { accuracy: r3(acc), precision: r3(pre) }, hl: { precision: 'sel' } }] });
      frames.push({ narr: '<b>Recall</b> = TP / (TP + FN) = ' + tp + ' / ' + (tp + fn) + ' = <b>' + r3(rec) + '</b>. Look along the "actual YES" row: of all the real positives, this fraction was caught.', parts: [{ type: 'grid', label: 'actual-YES row', rows: rows, rowHead: rh, colHead: ch, hl: { '0,0': 'ok', '0,1': 'bad' } }, { type: 'vars', vals: { accuracy: r3(acc), precision: r3(pre), recall: r3(rec) }, hl: { recall: 'sel' } }] });
      frames.push({ narr: '<b>F1</b> = 2 x P x R / (P + R) = <b>' + r3(f1) + '</b>. It sits closer to the weaker of precision and recall.', parts: [{ type: 'bars', label: 'accuracy, precision, recall, F1', values: [r3(acc), r3(pre), r3(rec), r3(f1)], idxLabels: ['acc', 'prec', 'rec', 'F1'], texts: [r3(acc), r3(pre), r3(rec), r3(f1)].map(String), hl: { 3: 'sel' } }] });
      var base = sd(tn + fp, tot);
      frames.push({ narr: 'Imbalance check: a model that <b>always says NO</b> would get accuracy ' + r3(base) + ' with recall 0. ' + (acc <= base + 0.001 ? '<span class="c-r">Your model is no better than the lazy baseline on accuracy!</span>' : 'Your accuracy beats that baseline, but also check precision and recall.'), parts: [{ type: 'vars', vals: { your_accuracy: r3(acc), always_NO_accuracy: r3(base), your_recall: r3(rec), always_NO_recall: 0 }, hl: { always_NO_accuracy: acc <= base + 0.001 ? 'bad' : 'cur' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Compute from a confusion matrix', html: `<p>A spam filter on 100 emails: TP 40, FP 10, FN 20, TN 30.</p>${H.table(['metric', 'work', 'value'], [['accuracy', '(40+30)/100', '0.70'], ['precision', '40/(40+10)', '0.80'], ['recall', '40/(40+20)', '0.667'], ['F1', '2x0.8x0.667/1.467', '0.727']])}` },
    { title: 'The fraud trap', html: `<p>1,000,000 transactions, 1,000 fraudulent (0.1%). A model that says "legit" for everything: accuracy <b>99.9%</b>, recall <b>0%</b>. It catches no fraud. A real model with 90% recall and 20% precision has "worse" accuracy but is the only one worth shipping.</p>` },
    { title: 'Why F1 uses the harmonic mean', html: `<p>Precision 1.0, recall 0.02 (flags one email, always right). Plain average = 0.51 - looks fine! F1 = 2 x 1 x 0.02 / 1.02 = <b>0.039</b>. The harmonic mean punishes a lopsided pair.</p>` },
    { title: 'Fixing imbalance: class weights', html: `<p>With 1% positives, tell the loss "a missed positive costs 99x a missed negative".</p>`, code: { lang: 'python', run: true, code: `import math
# weighted binary cross-entropy for one positive and one negative row
def wbce(t, p, w_pos):
    return -(w_pos * t * math.log(p) + (1 - t) * math.log(1 - p))

for w in (1, 99):
    print("weight on positives =", w,
          "| loss if we miss a positive (p=0.1):", round(wbce(1, 0.1, w), 2),
          "| loss for a false alarm (p=0.9):", round(wbce(0, 0.9, w), 2))` } }
  ],
  deepDive: `<p><b>Metrics depend on the threshold.</b> A classifier really outputs a score or probability; "predicted YES" means score >= threshold (default 0.5). Lower the threshold: more flagged, recall up, precision down. Raise it: the opposite. So precision/recall/F1 describe one chosen operating point (next topic shows the whole sweep).</p>
  <p><b>Base-rate fallacy.</b> A disease test with 99% sensitivity and 99% specificity on a disease affecting 1 in 1000: among 100,000 people, 100 are sick (99 caught) and 99,900 healthy (999 false alarms). Precision = 99 / 1098 = <b>9%</b>. A positive test means a 9% chance of disease, not 99%! Precision depends on prevalence; recall and specificity do not.</p>
  <p><b>Specificity</b> = TN / (TN + FP) = true negative rate = 1 - false positive rate (FPR). <b>Sensitivity</b> = recall. Medicine says sensitivity/specificity; ML says recall/precision.</p>
  <p><b>Calibration.</b> If the model says 0.8, do 80% of such cases turn out positive? Cross-entropy-trained models are often roughly calibrated; boosted trees and deep nets often are not. Fix with Platt scaling or isotonic regression on validation data.</p>
  <p><b>Resampling pitfalls.</b> Oversampling (e.g. SMOTE) must happen <i>after</i> the split and on the training set only; oversampling before the split copies positives into the test set - leakage again. Never rebalance the test set.</p>
  <p><b>Confidence intervals.</b> With only 20 positives in the test set, recall 0.75 has a huge error bar (roughly 0.5 to 0.9). Report counts, not just percentages.</p>`,
  aiEra: `<p><b>What AI changes:</b> The same four boxes now evaluate LLM systems: a content-moderation LLM that flags toxic text, a RAG retriever that must fetch the relevant document (recall@k), a hallucination detector. For free-text generation you still reduce quality to labelled pass/fail judgments on a test set and then count TP/FP/FN - often with an LLM-as-judge whose own precision/recall you must measure against human labels.</p>
  <p><b>Use AI as a partner:</b> have it generate a labelled evaluation set of tricky edge cases, write the metrics code, and explain a confusion matrix in plain words for a non-technical stakeholder. Then spot-check labels by hand.</p>
  <p><b>Where AI goes wrong:</b> it reports accuracy on imbalanced data, averages F1 across classes without saying macro or micro, or treats a single run on 30 examples as proof. LLM judges are also biased towards longer, more confident answers.</p>
  <p><b>What you must still own:</b> choosing which error is worse for the business, insisting on the baseline comparison, and reporting the confusion matrix, not just one number.</p>`,
  problems: [{
    title: 'Compute precision, recall and F1 from a confusion matrix',
    level: 'Easy', tags: ['metrics', 'confusion matrix'],
    statement: `<p>A cancer-screening model is tested on 1,000 patients. It flags 90 patients as "cancer". Of those, 60 truly have cancer. In total, 80 patients truly have cancer. Fill in the confusion matrix and compute accuracy, precision, recall and F1. Then comment on the accuracy.</p>`,
    constraints: `Show TP, FP, FN, TN first.`,
    example: `${H.table(['', 'pred cancer', 'pred healthy'], [['actual cancer', '60 (TP)', '20 (FN)'], ['actual healthy', '30 (FP)', '890 (TN)']])}<p>Precision 60/90 = <b>0.667</b>, recall 60/80 = <b>0.75</b>, F1 = <b>0.706</b>, accuracy 950/1000 = <b>0.95</b>.</p>`,
    brute: { why: `<p>Many people answer "95% accurate, great!" A model that predicts "healthy" for all 1,000 patients would be 92% accurate (920/1000) and find zero cancers. The accuracy number alone says nothing about the 20 missed cancers.</p>` },
    mcq: { q: 'In this problem, which count is the missed cancers?', options: ['TP = 60', 'FP = 30', 'FN = 20', 'TN = 890'], answer: 2, explain: 'Missed cancers are real positives predicted as negative: false negatives. 80 real cancers minus 60 caught = 20.' },
    hints: [`<p>TP = flagged and truly cancer = 60. Flagged total = 90, so FP = 90 - 60.</p>`, `<p>Total real cancers = 80 = TP + FN, so FN = 80 - 60. TN = 1000 - TP - FP - FN.</p>`, `<p>Precision = TP/(TP+FP), recall = TP/(TP+FN), F1 = 2PR/(P+R), accuracy = (TP+TN)/1000. Then compare accuracy with the always-healthy baseline of 92%.</p>`],
    solution: {
      approach: `<p>TP = 60 (flagged and sick). FP = 90 - 60 = 30. FN = 80 - 60 = 20. TN = 1000 - 60 - 30 - 20 = 890. Accuracy = (60 + 890)/1000 = 0.95. Precision = 60/90 = 0.667: about one third of the alarms are false. Recall = 60/80 = 0.75: one in four cancers is missed. F1 = 2 x 0.667 x 0.75 / (0.667 + 0.75) = 0.706. The 95% accuracy is only 3 points above the 92% of a model that always says "healthy", because the disease is rare (8% prevalence), so accuracy is a poor judge here. For screening, the 25% miss rate is the number to attack, typically by lowering the threshold, accepting more false alarms that a follow-up test can clear.</p>`,
      dry: { head: ['quantity', 'formula', 'value'], rows: [['TP', 'flagged and sick', '60'], ['FP', '90 - 60', '30'], ['FN', '80 - 60', '20'], ['TN', '1000 - 60 - 30 - 20', '890'], ['precision', '60/90', '0.667'], ['recall', '60/80', '0.75'], ['F1', '2PR/(P+R)', '0.706']] },
      complexity: `<p>O(1) arithmetic; computing the matrix from n predictions is O(n).</p>`,
      followUps: ['What happens to precision and recall if you lower the decision threshold?']
    }
  }]
});

// ---------------- TOPIC 8: ROC / AUC ----------------
topics.push({
  title: 'Thresholds, ROC Curve and AUC',
  analogy: `<p>A bouncer at a club decides who looks "suspicious" using a score from 0 to 10. If he stops everyone with a score of 1 or more, he catches every troublemaker but also harasses hundreds of innocent guests. If he only stops a 9 or 10, nobody innocent is bothered, but most troublemakers walk in. The <b>ROC curve</b> is the whole menu: for every possible "stop above this score" rule, how many troublemakers are caught vs how many innocents are bothered. <b>AUC</b> is one number for how good the bouncer's scoring is, whatever rule you finally choose.</p>`,
  explain: `<p>Most classifiers output a <b>score</b> (a probability). To get a yes/no decision you pick a <b>threshold</b>: score >= threshold means YES. Moving the threshold changes TP, FP, FN, TN - so it changes every metric from the last topic.</p>
  <p>Two rates, both between 0 and 1:</p>
  <ul><li><b>TPR</b> (true positive rate = recall) = TP / (TP + FN): share of real positives caught. <i>Higher is better.</i></li>
  <li><b>FPR</b> (false positive rate) = FP / (FP + TN): share of real negatives wrongly flagged. <i>Lower is better.</i></li></ul>
  <p><b>ROC curve</b> = plot (FPR, TPR) for every threshold, from "flag nothing" (0, 0) to "flag everything" (1, 1). A perfect model hugs the top-left corner (catches all positives with no false alarms). A random guesser lies on the diagonal.</p>
  <p><b>AUC</b> (area under the ROC curve): 0.5 = coin flip, 1.0 = perfect, below 0.5 = worse than random (flip your predictions). A neat meaning: <b>AUC = the probability that a randomly chosen positive gets a higher score than a randomly chosen negative.</b></p>
  ${H.table(['threshold', 'TP', 'FP', 'TPR', 'FPR'], [['1.01 (flag none)', '0', '0', '0.0', '0.0'], ['0.80', '3', '0', '0.6', '0.0'], ['0.50', '4', '2', '0.8', '0.4'], ['0.00 (flag all)', '5', '5', '1.0', '1.0']])}
  <p><b>Computing it by hand:</b> sort examples by score from high to low, lower the threshold one example at a time, and after each step count TP and FP. Each step moves the curve <i>up</i> (if a positive was added) or <i>right</i> (if a negative was added). Then add up trapezoid areas between consecutive points.</p>
  <p><b>ROC-AUC vs class imbalance:</b> ROC-AUC does not depend on the class ratio, which is a strength but also a trap: with 0.1% positives, a model can have AUC 0.95 and still have terrible precision, because even a small FPR on a huge pile of negatives produces many false alarms. For heavy imbalance also look at the <b>precision-recall curve</b> and PR-AUC.</p>
  <p><b>Choosing the threshold</b> is a business decision: pick the point on the curve where the cost of FN vs FP is best balanced (e.g. "catch 95% of fraud, tolerate 2% false alarms"). The default 0.5 is rarely optimal.</p>`,
  clues: ['"works regardless of threshold" - ROC-AUC', '"probability that a random positive ranks above a random negative" - AUC definition', '"catch 95% of positives, what false positive rate do we pay" - read a point on the ROC curve', '"extremely imbalanced, care about positives" - PR curve / PR-AUC', '"AUC = 0.5" - no better than random; "AUC &lt; 0.5" - predictions inverted', '"set the cut-off / operating point" - threshold selection'],
  code: [{ lang: 'python', run: true, title: 'ROC points at every threshold + AUC by the trapezoid rule', code: `y = [1, 1, 1, 0, 1, 0, 0, 0, 1, 0]                       # true labels
s = [0.95, 0.90, 0.80, 0.75, 0.60, 0.50, 0.40, 0.30, 0.20, 0.10]   # model scores
P = sum(y)                  # number of real positives
N = len(y) - P              # number of real negatives

points = []
thresholds = [1.01] + sorted(set(s), reverse=True)     # 1.01 = flag nobody
for th in thresholds:
    tp = sum(1 for t, sc in zip(y, s) if t == 1 and sc >= th)
    fp = sum(1 for t, sc in zip(y, s) if t == 0 and sc >= th)
    tpr, fpr = tp / P, fp / N
    points.append((fpr, tpr))
    print(f"threshold>={th:.2f}  TP={tp} FP={fp}  TPR={tpr:.2f}  FPR={fpr:.2f}")

auc = 0.0
for (x1, y1), (x2, y2) in zip(points, points[1:]):
    auc += (x2 - x1) * (y1 + y2) / 2        # trapezoid between two ROC points
print(f"AUC (trapezoid) = {auc:.3f}")

# Cross-check with the pair-ranking definition of AUC
wins = ties = 0
for sp, tp_ in zip(s, y):
    if tp_ != 1:
        continue
    for sn, tn_ in zip(s, y):
        if tn_ == 0:
            wins += sp > sn
            ties += sp == sn
print(f"AUC (pair ranking) = {(wins + 0.5 * ties) / (P * N):.3f}")` }, { lang: 'python', run: true, title: 'Logistic regression on a tiny dataset (cross-entropy + gradient descent)', code: `import math
# hours studied -> pass (1) or fail (0)
data = [(1, 0), (2, 0), (3, 0), (4, 1), (5, 1), (6, 1)]
w, b, lr = 0.0, 0.0, 0.5

def sigmoid(z):
    return 1 / (1 + math.exp(-z))      # squashes any number into (0, 1)

for epoch in range(1, 301):
    dw = db = loss = 0.0
    for x, y in data:
        p = sigmoid(w * x + b)
        loss += -(y * math.log(p) + (1 - y) * math.log(1 - p))   # cross-entropy
        dw += (p - y) * x              # gradient of cross-entropy w.r.t. w
        db += (p - y)
    n = len(data)
    w -= lr * dw / n
    b -= lr * db / n
    if epoch in (1, 10, 50, 100, 300):
        print(f"epoch {epoch:3d}  loss={loss / n:.4f}  w={w:.3f}  b={b:.3f}")

for hours in (1, 3, 3.5, 4, 6):
    print(f"hours={hours}: P(pass) = {sigmoid(w * hours + b):.3f}")
print("decision boundary (P=0.5) at hours =", round(-b / w, 2))` }, { lang: 'python', check: false, title: 'scikit-learn', code: `from sklearn.metrics import roc_curve, roc_auc_score, precision_recall_curve
fpr, tpr, thresholds = roc_curve(y_true, scores)
print(roc_auc_score(y_true, scores))` }],
  codeTitle: ['ROC points and AUC (runs here)', 'Logistic regression from scratch (runs here)', 'scikit-learn'],
  viz: {
    title: 'Sweep the threshold: build the ROC table point by point',
    input: '0.95:1 0.90:1 0.80:1 0.75:0 0.60:1 0.50:0 0.40:0 0.30:0 0.20:1 0.10:0',
    inputLabel: 'score:label pairs (label 1 = real positive)',
    gen: function (input) {
      var items = String(input).trim().split(/\s+/).map(function (t) { var s = t.split(':'); return [Number(s[0]), Number(s[1])]; });
      if (items.length < 3 || items.length > 14 || items.some(function (x) { return isNaN(x[0]) || (x[1] !== 0 && x[1] !== 1); })) throw new Error('Use 3-14 pairs like 0.9:1 0.4:0');
      var P = items.filter(function (x) { return x[1] === 1; }).length, N = items.length - P;
      if (!P || !N) throw new Error('Need at least one positive (1) and one negative (0)');
      var ths = [], i;
      items.forEach(function (x) { if (ths.indexOf(x[0]) < 0) ths.push(x[0]); });
      ths.sort(function (a, b) { return b - a; });
      var rows = [['none (> max)', 0, 0, 0, 0]], pts = [[0, 0]], frames = [];
      frames.push({ narr: '<b>' + P + '</b> real positives and <b>' + N + '</b> real negatives. We start with a threshold above every score: nothing is flagged, so TPR = 0 and FPR = 0.', parts: [{ type: 'table', label: 'ROC table', columns: ['threshold', 'TP', 'FP', 'TPR', 'FPR'], rows: rows.slice(), hl: { 0: 'cur' } }] });
      for (i = 0; i < ths.length; i++) {
        var th = ths[i], tp = 0, fp = 0;
        items.forEach(function (x) { if (x[0] >= th) { if (x[1] === 1) tp++; else fp++; } });
        var tpr = r2(tp / P), fpr = r2(fp / N);
        var prev = rows[rows.length - 1];
        var kind = tp > prev[1] && fp === prev[2] ? 'a positive entered: curve goes <span class="c-g">UP</span>' : fp > prev[2] && tp === prev[1] ? 'a negative entered: curve goes <span class="c-r">RIGHT</span>' : 'both kinds entered: diagonal step';
        rows.push([th, tp, fp, tpr, fpr]); pts.push([fp / N, tp / P]);
        var hl = {}; hl[rows.length - 1] = 'ok';
        frames.push({ narr: 'Threshold <b>' + th + '</b>: flag everything with score >= ' + th + '. TP = ' + tp + ', FP = ' + fp + ' -> TPR = ' + tpr + ', FPR = ' + fpr + '. ' + kind + '.', parts: [{ type: 'table', label: 'ROC table', columns: ['threshold', 'TP', 'FP', 'TPR', 'FPR'], rows: rows.slice(), hl: hl }, { type: 'bars', label: 'TPR at each threshold step', values: rows.map(function (r) { return r[3]; }), texts: rows.map(function (r) { return String(r[3]); }) }] });
      }
      var auc = 0;
      for (i = 1; i < pts.length; i++) auc += (pts[i][0] - pts[i - 1][0]) * (pts[i][1] + pts[i - 1][1]) / 2;
      frames.push({ narr: 'Add up trapezoids between consecutive (FPR, TPR) points: each is width x average height. <b>AUC = ' + r3(auc) + '</b>. ' + (auc > 0.9 ? 'Excellent ranking.' : auc > 0.7 ? 'Decent ranking, room to improve.' : auc > 0.5 ? 'Weak, barely better than random.' : 'At or below random: check for inverted scores.'), parts: [{ type: 'table', label: 'ROC points', columns: ['threshold', 'TP', 'FP', 'TPR', 'FPR'], rows: rows, hl: {} }, { type: 'vars', vals: { positives: P, negatives: N, AUC: r3(auc) }, hl: { AUC: 'sel' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'A four-example ROC by hand', html: `<p>Scores/labels: 0.9 (pos), 0.8 (neg), 0.7 (pos), 0.3 (neg). P = 2, N = 2. Points: start (0,0) -> 0.9: TP1 -> (0, 0.5) -> 0.8: FP1 -> (0.5, 0.5) -> 0.7: TP2 -> (0.5, 1) -> 0.3: FP2 -> (1, 1). Trapezoids: 0 + 0.25 + 0 + 0.5 = <b>AUC 0.75</b>. Check by pairs: positives beat negatives in 3 of 4 pairs = 0.75. Same number.</p>` },
    { title: 'AUC high, precision still bad', html: `<p>1 positive per 1,000 rows, AUC 0.95. At FPR = 5%, you flag 50 of the 999 negatives plus ~90% of positives: about 50 false alarms for each real hit. Precision about 2%. ROC hides this; the PR curve shows it.</p>` },
    { title: 'Picking an operating point', html: `<p>A bank can manually review 500 transactions a day and each missed fraud costs 50 times a wasted review. Walk the ROC table, convert FPR to daily review counts, and choose the threshold where reviews fit the 500 limit while TPR is as high as possible.</p>` },
    { title: 'AUC below 0.5', html: `<p>If AUC = 0.2 the model ranks positives <i>below</i> negatives. The model is not useless: invert the scores and you get AUC 0.8. Usually it is a label-direction bug (1 and 0 swapped).</p>` }
  ],
  deepDive: `<p><b>Equivalence with the Mann-Whitney U test.</b> AUC is the normalized Mann-Whitney statistic: count the (positive, negative) pairs where the positive scores higher (ties count half), and divide by P x N. So AUC only cares about <i>ranking</i>, not the actual probability values - a model with terrible calibration can have a great AUC.</p>
  <p><b>Ties.</b> If many examples share a score, move the threshold past all of them at once (as the code does with <code>set(s)</code>); the curve then moves diagonally.</p>
  <p><b>Computation.</b> Sorting gives O(n log n); a single sweep is O(n). Libraries compute exactly the trapezoid sum you wrote.</p>
  <p><b>ROC vs PR.</b> ROC's x-axis divides by N (huge), so it flatters models on imbalanced data. PR plots precision vs recall; the no-skill baseline is a horizontal line at the positive rate. Average precision (area under PR) is the standard summary for rare-event problems.</p>
  <p><b>Beyond binary.</b> Multi-class: one-vs-rest ROC curves per class, macro-averaged. Also, AUC can hide fairness gaps: compute it per subgroup (language, region, age bands). Finally, an AUC measured on last year's data says nothing about a drifted distribution - track it online.</p>`,
  aiEra: `<p><b>What AI changes:</b> Many LLM products are really classifiers behind the scenes: a moderation model returns a score, a router decides "is this a coding question", an LLM-as-judge returns a 1-10 rating. Each needs a threshold chosen from a ROC/PR table on a labelled set, not a gut feeling. Retrieval quality uses the same logic with recall@k and precision@k.</p>
  <p><b>Use AI as a partner:</b> ask it to write the threshold-sweep code, to simulate score distributions for two classes and see how AUC changes with overlap, or to explain what an operating point means to a product manager. Ask it for the cost-based threshold formula and check the maths.</p>
  <p><b>Where AI goes wrong:</b> LLM "confidence" numbers in text (like "I am 90% sure") are not calibrated probabilities; do not threshold them blindly. Generated code also often forgets that <code>roc_auc_score</code> needs scores, not hard 0/1 predictions, which silently collapses the curve to a single point.</p>
  <p><b>What you must still own:</b> picking the operating point from business costs, validating on the right slice of data, and re-checking it when the data drifts.</p>`,
  problems: [{
    title: 'Compute ROC points and AUC',
    level: 'Medium', tags: ['ROC', 'AUC', 'threshold'],
    statement: `<p>A model scores six emails. (score, true label; 1 = spam): (0.9, 1), (0.8, 1), (0.7, 0), (0.6, 1), (0.4, 0), (0.2, 0). Compute the ROC points for thresholds 0.9, 0.8, 0.7, 0.6, 0.4, 0.2 and the AUC with the trapezoid rule.</p>`,
    constraints: `P = 3 positives, N = 3 negatives. Include the starting point (0, 0).`,
    example: `${H.table(['threshold', 'TP', 'FP', 'TPR', 'FPR'], [['0.9', '1', '0', '0.33', '0.00'], ['0.8', '2', '0', '0.67', '0.00'], ['0.7', '2', '1', '0.67', '0.33'], ['0.6', '3', '1', '1.00', '0.33'], ['0.4', '3', '2', '1.00', '0.67'], ['0.2', '3', '3', '1.00', '1.00']])}<p>AUC = <b>0.889</b> (8 of the 9 positive-negative pairs are ranked correctly).</p>`,
    brute: { why: `<p>Re-computing TP and FP from scratch for every threshold by scanning all emails works but costs O(n) per threshold, O(n<sup>2</sup>) in total. Sorting once and sweeping down the list updates the counts incrementally in O(n log n).</p>` },
    mcq: { q: 'Lowering the threshold from 0.7 to 0.6 added a real spam email. What happens on the ROC plot?', options: ['The point moves right', 'The point moves up', 'The point moves down', 'It does not move'], answer: 1, explain: 'A new true positive raises TP so TPR rises while FP (and FPR) stays the same: the point moves straight up.' },
    hints: [`<p>For each threshold count emails with score >= threshold, split by true label into TP and FP. TPR = TP/3, FPR = FP/3.</p>`, `<p>Going down the sorted list: a positive moves the point up by 1/3, a negative moves it right by 1/3.</p>`, `<p>Trapezoid: add (x2 - x1) x (y1 + y2)/2 for consecutive points starting at (0,0). Vertical moves add 0 area; each right move adds width times the current height.</p>`],
    solution: {
      approach: `<p>Sort by score (already sorted). Sweep: (0,0) start. Threshold 0.9 admits a spam: (0, 0.33). 0.8 admits a spam: (0, 0.67). 0.7 admits a non-spam: (0.33, 0.67). 0.6 admits a spam: (0.33, 1). 0.4 admits a non-spam: (0.67, 1). 0.2 admits a non-spam: (1, 1). Area: the first two moves are vertical so they add 0; the move from (0, 0.67) to (0.33, 0.67) adds 0.33 x 0.67 = 0.222; vertical to (0.33, 1) adds 0; then two right moves at height 1 add 0.33 + 0.33 = 0.667. Total AUC = 0.222 + 0.667 = 0.889. Cross-check by pairs: spam scores 0.9, 0.8, 0.6 against non-spam scores 0.7, 0.4, 0.2: the pair (0.6 vs 0.7) is the only wrong one, so 8/9 = 0.889. The result means a random spam outranks a random non-spam 89% of the time.</p>`,
      dry: { head: ['threshold', 'TP', 'FP', 'TPR', 'FPR', 'area added'], rows: [['start', '0', '0', '0.00', '0.00', '0'], ['0.9', '1', '0', '0.33', '0.00', '0'], ['0.8', '2', '0', '0.67', '0.00', '0'], ['0.7', '2', '1', '0.67', '0.33', '0.222'], ['0.6', '3', '1', '1.00', '0.33', '0'], ['0.4', '3', '2', '1.00', '0.67', '0.333'], ['0.2', '3', '3', '1.00', '1.00', '0.333']] },
      complexity: `<p>Sort O(n log n) then one sweep O(n); memory O(n) for the points.</p>`,
      followUps: ['Which threshold would you choose if a missed spam is cheap but a false alarm (real mail in spam) is very costly?']
    }
  }]
});

// ---------------- TOPIC 9: choose the metric ----------------
topics.push({
  title: 'Choosing the Right Metric: Fraud vs Spam vs Cancer Screening',
  analogy: `<p>Choosing a metric is choosing which mistake you can live with. A <b>goalkeeper</b> must not let goals in (missing is the disaster), so she dives at everything - lots of false alarms are fine. A <b>judge</b> must not jail the innocent, so he demands strong proof - letting some guilty people go is the accepted price. Same maths, opposite priorities.</p>`,
  explain: `<p>There is no best metric in general. Ask three questions: <b>1)</b> Which error is more costly - false negative (FN) or false positive (FP)? <b>2)</b> Is the data heavily imbalanced? <b>3)</b> Do I need a threshold-free view (AUC) or one chosen operating point (precision/recall at a threshold)?</p>
  ${H.table(['scenario', 'worse error', 'metric to optimise', 'why'], [['<b>Cancer screening</b>', '<span class="c-r">FN</span>: a missed cancer can be fatal; a false alarm just means another test', '<b>Recall</b> (sensitivity), with precision kept acceptable', 'catch nearly every case; a second, more precise test filters the false alarms'], ['<b>Spam filter</b>', '<span class="c-r">FP</span>: a real email (job offer, invoice) lost in spam; a missed spam is a mild annoyance', '<b>Precision</b> (of the spam bucket)', 'never hide a legitimate email'], ['<b>Credit-card fraud</b>', 'FN costs the money; FP costs a blocked customer. Only 0.1% fraud.', '<b>PR-AUC / recall at a fixed precision</b>, never accuracy', 'extreme imbalance; set the threshold using cost per case'], ['<b>Search / recommendations</b>', 'balanced', 'precision@k, recall@k, NDCG', 'only the top results are seen'], ['<b>House price</b>', 'big misses hurt', 'RMSE or MAE', 'regression, not classification'], ['<b>Balanced, both errors equal</b>', 'neither', 'Accuracy or F1', 'safe when classes are ~50/50']])}
  <p><b>Rule of thumb:</b> FN expensive -> push recall (lower the threshold). FP expensive -> push precision (raise the threshold). Both matter and data is imbalanced -> F1 or PR-AUC. Need a threshold-free ranking quality -> ROC-AUC (or PR-AUC when rare).</p>
  <p><b>Use cost, not slogans.</b> With cost per FN = c<sub>FN</sub> and per FP = c<sub>FP</sub>, total cost = c<sub>FN</sub> x FN + c<sub>FP</sub> x FP. Evaluate this at each threshold in your ROC table and pick the minimum. If a missed fraud costs 200 and a false block costs 5, the best threshold flags a transaction when P(fraud) is above 5/(200+5) = 2.4% - far below 0.5.</p>
  <p><b>Business metric first:</b> the model metric is a stand-in. Fraud teams ultimately care about dollars saved, spam teams about user complaints, doctors about lives and follow-up burden. Pick the offline metric that best predicts the business one, then confirm with an online A/B test.</p>`,
  clues: ['"it is unacceptable to miss a positive" - recall', '"do not annoy users / legitimate items must not be blocked" - precision', '"0.1% positives, 99.9% accuracy already" - ignore accuracy; PR-AUC / recall @ precision', '"cost of a miss is 100x a false alarm" - cost-weighted threshold', '"rank results, user reads top 10" - precision@k, NDCG', '"balanced classes, equal costs" - accuracy or F1 is fine'],
  code: [{ lang: 'python', run: true, title: 'Pick the threshold that minimises business cost', code: `# scores and true labels (1 = fraud)
y = [1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0]
s = [0.95, 0.90, 0.85, 0.70, 0.55, 0.45, 0.40, 0.35, 0.30, 0.20, 0.10, 0.05]
COST_FN, COST_FP = 200, 5          # a missed fraud is 40x worse than a false block

best = None
for th in [0.9, 0.7, 0.5, 0.3, 0.1]:
    tp = sum(1 for t, sc in zip(y, s) if t == 1 and sc >= th)
    fp = sum(1 for t, sc in zip(y, s) if t == 0 and sc >= th)
    fn = sum(1 for t, sc in zip(y, s) if t == 1 and sc < th)
    cost = COST_FN * fn + COST_FP * fp
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn)
    print(f"threshold {th}: TP={tp} FP={fp} FN={fn} precision={prec:.2f} recall={rec:.2f} cost={cost}")
    if best is None or cost < best[1]:
        best = (th, cost)
print("cheapest threshold:", best[0], "with cost", best[1])` }],
  codeTitle: ['Cost-based threshold choice'],
  viz: {
    title: 'Which metric for which problem?',
    input: 'cancer',
    inputLabel: 'Scenario: cancer, spam or fraud',
    gen: function (input) {
      var k = String(input).trim().toLowerCase();
      var S = {
        cancer: { name: 'Cancer screening', fn: 'VERY HIGH (missed cancer)', fp: 'low (extra test)', imb: 'rare (about 1%)', metric: 'Recall (sensitivity)', move: 'LOWER the threshold: flag more' },
        spam: { name: 'Spam filter', fn: 'low (one spam gets through)', fp: 'VERY HIGH (real mail lost)', imb: 'moderate (30-60% spam)', metric: 'Precision of the spam bucket', move: 'RAISE the threshold: flag only when sure' },
        fraud: { name: 'Card fraud', fn: 'HIGH (lost money)', fp: 'medium (blocked customer)', imb: 'extreme (0.1%)', metric: 'PR-AUC and recall at a fixed precision', move: 'Set threshold from cost: FN cost / FP cost' }
      };
      if (!S[k]) throw new Error('Type one of: cancer, spam, fraud');
      var s = S[k], frames = [];
      var rows = [];
      frames.push({ narr: 'Scenario: <b>' + s.name + '</b>. Step 1: who gets hurt by each kind of mistake?', parts: [{ type: 'table', label: 'cost analysis', columns: ['question', 'answer'], rows: [['Cost of a false negative (miss)', '?'], ['Cost of a false positive (false alarm)', '?']] }] });
      rows = [['Cost of a false negative (miss)', s.fn], ['Cost of a false positive (false alarm)', s.fp]];
      frames.push({ narr: 'Filled in: a miss is <b>' + s.fn + '</b>, a false alarm is <b>' + s.fp + '</b>.', parts: [{ type: 'table', label: 'cost analysis', columns: ['question', 'answer'], rows: rows.slice(), hl: { 0: s.fn.indexOf('HIGH') >= 0 ? 'bad' : 'ok', 1: s.fp.indexOf('HIGH') >= 0 ? 'bad' : 'ok' } }] });
      rows.push(['How imbalanced are the classes?', s.imb]);
      frames.push({ narr: 'Step 2: class balance is <b>' + s.imb + '</b>. ' + (k === 'fraud' ? 'Accuracy is meaningless here.' : 'Check accuracy against the always-negative baseline before trusting it.'), parts: [{ type: 'table', label: 'cost analysis', columns: ['question', 'answer'], rows: rows.slice(), hl: { 2: 'cur' } }] });
      rows.push(['Metric to optimise', s.metric]);
      frames.push({ narr: 'Step 3: choose <b>' + s.metric + '</b>.', parts: [{ type: 'table', label: 'cost analysis', columns: ['question', 'answer'], rows: rows.slice(), hl: { 3: 'sel' } }] });
      rows.push(['Threshold direction', s.move]);
      frames.push({ narr: 'Step 4: threshold move - <b>' + s.move + '</b>. Then confirm the trade-off by reading the ROC / precision-recall table and re-checking on a held-out test set.', parts: [{ type: 'table', label: 'cost analysis', columns: ['question', 'answer'], rows: rows.slice(), hl: { 4: 'ok' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Airport security', html: `<p>Missing a threat is catastrophic, a false alarm costs a minute of a traveller's time. Result: high recall, low precision, and that is correct. Most bags flagged are harmless.</p>` },
    { title: 'Email priority inbox', html: `<p>If "important" mail is mislabelled as normal, you may miss a deadline (FN), but flooding the important tab with junk (FP) makes you stop trusting it. Here balanced F1 or precision@k is a better fit than recall alone.</p>` },
    { title: 'LLM content moderation', html: `<p>For a children's app block anything doubtful: high recall for harmful content. For a creative-writing app, over-blocking frustrates users: precision matters more. Same model, different threshold and metric.</p>` },
    { title: 'Metric gaming', html: `<p>A team is rewarded for F1 and reports the best F1 across 50 thresholds on the <i>test</i> set. That is tuning on the test set. Choose the threshold on validation, report on test.</p>` }
  ],
  deepDive: `<p><b>Optimal threshold from costs.</b> If the model's probabilities are calibrated, predict positive when <code>p &gt; c<sub>FP</sub> / (c<sub>FP</sub> + c<sub>FN</sub>)</code>. With c<sub>FN</sub> = 200 and c<sub>FP</sub> = 5 that is 5/205 = 2.4%. Calibration matters: with uncalibrated scores, find the threshold empirically on validation data.</p>
  <p><b>Metrics at a fixed constraint.</b> Regulators and ops teams phrase requirements as "recall at 95% precision" or "false alarms under 1 per 1,000". Read that off the PR/ROC table instead of using a summary like F1.</p>
  <p><b>Proper scoring rules.</b> Log loss and Brier score evaluate the probabilities themselves (calibration + sharpness) and are the right metrics when downstream decisions use the probability (pricing, ranking, risk scores).</p>
  <p><b>Multiple stakeholders.</b> Fairness metrics (equal recall across groups) can conflict with overall accuracy; document the trade-off. <b>Monitoring:</b> label delay means you often see precision weeks later; track proxy metrics (score distribution, alert rate) in between.</p>
  <p><b>Multi-metric dashboards</b> beat a single number: confusion matrix, PR curve, calibration plot, per-segment recall.</p>`,
  aiEra: `<p><b>What AI changes:</b> Generative systems often have no single "ground truth", so teams build rubrics and score outputs: faithfulness (is every claim supported by the source?), relevance, safety. Each rubric item becomes a binary check, and the old logic returns: which failure is worse - an unsupported claim passed (FN of a hallucination detector) or a good answer blocked (FP)?</p>
  <p><b>Use AI as a partner:</b> describe your product and ask <code>What are the costs of FP and FN here? Propose a primary metric, guardrail metrics and a threshold-selection plan.</code> Use the answer as a starting point for the stakeholder conversation, not the final word.</p>
  <p><b>Where AI goes wrong:</b> it defaults to accuracy or F1 for everything, ignores asymmetric costs, and may produce plausible but invented benchmark numbers. LLM judges disagree with humans more on exactly the borderline cases that matter.</p>
  <p><b>What you must still own:</b> the cost judgement. That is a product and ethics decision, which no metric library can make for you.</p>`
});

// ---------------- PRACTICE ----------------
function mk(title, level, tags, statement, example, bruteWhy, mcq, hints, approach, complexity, followUps, companies) {
  return { title: title, level: level, tags: tags, companies: companies, statement: statement, constraints: 'Answer in plain words with numbers where asked; show your reasoning.', example: example, brute: { why: bruteWhy }, mcq: mcq, hints: hints, solution: { approach: approach, complexity: complexity, followUps: followUps } };
}
practice.push(mk('Spot the data leak (churn model)', 'Easy', ['leakage', 'features'],
  `<p>A telecom churn model reports 98% accuracy. Its features are: monthly_bill, tenure_months, support_calls_last_90d, <code>cancellation_reason</code> (blank if the customer stayed), and <code>days_since_last_login</code> (measured at the time the data was exported, after the churn date). Which features leak and why?</p>`,
  `<p>${H.c('r', 'cancellation_reason')}: only filled <i>after</i> the customer leaves - it is the label in disguise. ${H.c('r', 'days_since_last_login')}: measured after churn, so churners show huge values. ${H.c('g', 'the other three')} are known before the decision date.</p>`,
  `<p>Trusting the 98% and shipping it. In production both leaky columns are empty or small for customers who have not left yet, so the live accuracy collapses to near the base rate.</p>`,
  { q: 'A feature is a leak if...', options: ['It is highly correlated with the label', 'It would not be available (or not have its value) at the time you must predict', 'It has missing values', 'It is categorical'], answer: 1, explain: 'High correlation alone is fine (that is a good feature). A leak is information from the future or from the label itself that is not there at prediction time.' },
  [`<p>Write down the exact moment the model will be used (e.g. the 1st of each month). For every feature ask: "do I know this value at that moment?"</p>`, `<p>Features that are filled in only after the outcome, or computed over a window that extends past the prediction date, leak.</p>`, `<p>Fix: rebuild features with a point-in-time snapshot (everything as of the prediction date), drop cancellation_reason, recompute last-login at the snapshot date, then re-measure on a time-based split. Expect accuracy to fall to a believable level.</p>`],
  `<p>Define the prediction moment first. cancellation_reason exists only for people who have already churned, so it directly encodes the label. days_since_last_login was exported after the churn date, so churners naturally have large values: it encodes the future. monthly_bill, tenure_months and support_calls_last_90d can be computed as of the snapshot date, so they are legitimate. Rebuild the dataset as point-in-time snapshots (features as of date D, label = churned within the next 30 days) and split by date. The honest accuracy will be much lower than 98%, and that lower number is the one to compare against the baseline of "nobody churns".</p>`,
  `<p>O(columns) review; the real cost is rebuilding the feature pipeline.</p>`, ['How would you automate leak detection in a feature store?'], ['Amazon', 'Netflix']));
practice.push(mk('Pick the loss function', 'Easy', ['loss', 'MSE', 'cross-entropy'],
  `<p>Pick a loss for each task and justify it in one line: (a) predict delivery time in minutes, (b) predict if a user will click an ad, (c) classify an image as one of 10 animals, (d) predict delivery time when a few orders are delayed by days for unrelated reasons (outliers).</p>`,
  `<p>(a) MSE. (b) binary cross-entropy. (c) softmax + categorical cross-entropy. (d) MAE or Huber, so the freak delays do not dominate.</p>`,
  `<p>Using MSE for everything, including 0/1 labels. With a sigmoid output MSE learns slowly when confidently wrong, and it does not match the probability model of the labels.</p>`,
  { q: 'Which loss punishes a confident wrong probability most severely?', options: ['MSE on probabilities', 'MAE', 'Cross-entropy', 'Accuracy'], answer: 2, explain: 'Cross-entropy goes to infinity as the predicted probability of the true class goes to 0. Squared error is capped at 1 for probabilities.' },
  [`<p>Look at the label type: number, yes/no, or one-of-many classes?</p>`, `<p>Number -> squared or absolute error. Probability of yes -> binary cross-entropy. One-of-many -> softmax + categorical cross-entropy.</p>`, `<p>For (d), squared error amplifies the huge delay errors (error 2000 gives 4,000,000), so a robust loss (MAE, Huber) lets the model focus on typical orders.</p>`],
  `<p>(a) Delivery time is a number, errors in both directions matter, so use MSE (or RMSE for reporting in minutes). (b) The label is click or no click and we want a calibrated probability: binary cross-entropy with a sigmoid output. (c) Exactly one of ten classes is correct: a softmax output giving ten probabilities that sum to one, trained with categorical cross-entropy. (d) A few orders delayed for unrelated reasons create enormous squared errors that pull the model away from the typical case, so switch to MAE or Huber loss, which grows linearly for large errors. If you instead care about the 90th percentile of delivery time for promises to customers, a quantile (pinball) loss is the right teacher.</p>`,
  `<p>All of these are O(n) per epoch to compute.</p>`, ['What is the loss when a 10-class model gives the true class probability 0.05?'], ['Uber', 'Google']));
practice.push(mk('Compute metrics from a confusion matrix', 'Easy', ['metrics', 'precision', 'recall'],
  `<p>A fraud model on 10,000 transactions gives TP = 40, FP = 60, FN = 10, TN = 9,890. Compute accuracy, precision, recall and F1. Is the accuracy impressive?</p>`,
  `<p>Accuracy 9930/10000 = <b>0.993</b>. Precision 40/100 = <b>0.40</b>. Recall 40/50 = <b>0.80</b>. F1 = 2x0.4x0.8/1.2 = <b>0.533</b>. Always-legit would give 9950/10000 = 99.5%: the model is below that baseline on accuracy!</p>`,
  `<p>Quoting 99.3% accuracy as success. The lazy "never fraud" model gets 99.5%.</p>`,
  { q: 'Fraud is 0.5% of data. A model reports 99% accuracy. What do you check next?', options: ['Nothing, 99% is great', 'Precision, recall and the confusion matrix', 'Only the training loss', 'The number of epochs'], answer: 1, explain: 'Under heavy imbalance accuracy is dominated by the majority class; the confusion matrix reveals how many positives were actually caught.' },
  [`<p>Accuracy = (TP + TN)/total. Precision = TP/(TP + FP). Recall = TP/(TP + FN).</p>`, `<p>F1 = 2PR/(P + R) with P = 0.4 and R = 0.8, so F1 is about 0.533.</p>`, `<p>Baseline: always predict "legit" gets TN + FP = 9,950 right, so 0.995 accuracy and 0 recall.</p>`],
  `<p>Total 10,000. Accuracy = (40 + 9,890)/10,000 = 0.993. Precision = 40/(40 + 60) = 0.40, meaning 6 of 10 alerts are false alarms. Recall = 40/(40 + 10) = 0.80, so 20% of frauds slip through. F1 = 2 x 0.4 x 0.8 / (0.4 + 0.8) = 0.533. The accuracy looks superb, but 9,950 of the 10,000 transactions are legitimate, so a model that always says legit gets 99.5%, and our 99.3% is actually lower. Accuracy tells us nothing here; precision, recall (or PR-AUC) and the cost of each error decide whether the model is useful.</p>`,
  `<p>O(1) arithmetic, nothing to optimise.</p>`, ['How would raising the threshold change precision and recall here?'], ['Stripe', 'PayPal']));
practice.push(mk('Learning-rate surgery: read three loss curves', 'Medium', ['learning rate', 'loss curve'],
  `<p>Mini-batch training logs (loss every 100 steps): <b>Run 1</b>: 2.3, 2.3, 2.29, 2.29, 2.28. <b>Run 2</b>: 2.3, 1.1, 0.7, 2.9, 0.6, 4.1, NaN. <b>Run 3</b>: 2.3, 1.2, 0.8, 0.65, 0.59, 0.57. <b>Run 4</b>: 2.3, 0.9, 0.5, 0.45, 0.46, 0.44 (jagged but falling). Diagnose and propose the next lr action for each.</p>`,
  `<p>Run 1 ${H.c('y', 'flat, lr too small or vanishing gradient')}. Run 2 ${H.c('r', 'wild swings then NaN: lr too large')}. Run 3 ${H.c('g', 'healthy, flattening')}. Run 4 ${H.c('g', 'noise from mini-batches, fine')}.</p>`,
  `<p>Changing the model architecture because "it does not learn". Run 1 may only need a 10x larger learning rate - a one-line change.</p>`,
  { q: 'Loss decreases then oscillates up and down wildly before NaN. First fix?', options: ['Increase the learning rate', 'Reduce the learning rate (and/or clip gradients)', 'Remove the validation set', 'Add more layers'], answer: 1, explain: 'Oscillation that grows is the signature of overshooting. Lower the learning rate by 3-10x and consider gradient clipping.' },
  [`<p>For each run describe the shape in 3 words: flat, wild, smooth fall, or jagged fall.</p>`, `<p>Flat -> raise lr. Wild/up then NaN -> lower lr. Smooth fall -> keep. Jagged but trending down -> batch noise, optionally decay lr later.</p>`, `<p>Also check data: a flat loss exactly at ln(10) = 2.30 on 10 classes means the model outputs uniform guesses - maybe labels are shuffled relative to inputs or the lr is tiny.</p>`],
  `<p>Run 1 sits at 2.30 = ln(10), the loss of guessing uniformly among 10 classes, and barely moves: either the learning rate is far too small or nothing is learning (check labels aligned with inputs, check gradients are not zero). Try a 10x larger rate first. Run 2 improves, then swings up to 2.9 and 4.1 and ends in NaN: classic divergence, so divide the lr by 10, add gradient clipping, and consider warm-up. Run 3 drops quickly then flattens, which is healthy; keep the lr and run until validation loss stops improving, optionally with a decay schedule. Run 4 is a falling but jagged curve, the normal noise of mini-batches; it can be smoothed with a larger batch or a decaying lr.</p>`,
  `<p>An lr sweep over k values costs k short runs, so O(k x steps).</p>`, ['Why does a warm-up phase help transformer training?'], ['OpenAI', 'Meta']));
practice.push(mk('Which regularizer?', 'Medium', ['regularization', 'L1', 'L2'],
  `<p>You have 100 rows and 5,000 features (genes) and want an <i>explainable</i> model that names the 20 or so genes that matter. Another team has 50 highly correlated sensor features and wants stable predictions. Pick L1, L2 or Elastic Net for each and add one other overfitting guard.</p>`,
  `<p>Team 1: ${H.c('b', 'L1 (Lasso)')} - sparse weights. Team 2: ${H.c('b', 'L2 (Ridge)')} or Elastic Net - spreads weight among correlated features. Both: choose lambda by cross-validation.</p>`,
  `<p>Fit an unregularized model with 5,000 features on 100 rows: it can fit the training data perfectly with nonsense weights and has no generalization.</p>`,
  { q: 'Which penalty can set weights exactly to zero?', options: ['L2', 'L1', 'Neither', 'Both equally'], answer: 1, explain: 'L1 has corners on the axes, so the optimum often lands where some weights are exactly zero (feature selection). L2 only shrinks.' },
  [`<p>Do they want a short list of features (sparse) or a smooth model that uses everything a bit?</p>`, `<p>Sparse + explainable -> L1. Many correlated features -> L2 (Lasso would pick one arbitrarily and drop its twins).</p>`, `<p>Add: standardize features first; choose lambda on a log grid with k-fold cross-validation; for small data use nested cross-validation for the final estimate.</p>`],
  `<p>Team 1 has far more features than rows, so overfitting is guaranteed without help, and the stakeholders want a short list of genes. L1 (Lasso) drives most of the 5,000 weights to exactly zero; the surviving 20 or so are the explainable answer. Standardize the features, pick lambda by cross-validation, and treat the selected genes as hypotheses (selection is unstable across resamples; check by bootstrapping). Team 2 has correlated sensors; L1 would keep one and drop the others arbitrarily, producing unstable models. L2 (Ridge) shares weight across the correlated group and gives stable predictions; Elastic Net is a good compromise if some sparsity is also wanted. An additional guard for both: early stopping or a held-out test set to confirm the generalization.</p>`,
  `<p>Lasso via coordinate descent is roughly O(n x d) per pass.</p>`, ['Why must features be standardized before applying L1 or L2?'], ['Spotify']));
practice.push(mk('Choose the metric: fraud vs spam vs cancer', 'Medium', ['metrics', 'cost'],
  `<p>For each system choose the primary metric and say whether to raise or lower the threshold: (1) cancer screening, (2) spam filter for a business inbox, (3) credit-card fraud with 0.1% fraud rate. Also state one metric you would NOT use and why.</p>`,
  `<p>(1) recall, lower threshold, avoid accuracy. (2) precision, raise threshold, avoid recall alone. (3) PR-AUC / recall at fixed precision with cost-based threshold, avoid accuracy.</p>`,
  `<p>Using accuracy or F1 everywhere. F1 treats FN and FP as equally bad, which is false in all three of these cases.</p>`,
  { q: 'Missing a positive is very expensive and false alarms are cheap. What do you push up?', options: ['Precision', 'Recall', 'Specificity', 'Threshold'], answer: 1, explain: 'Recall measures the share of real positives caught; lower the threshold to raise it.' },
  [`<p>Ask which is worse for each: a false negative or a false positive.</p>`, `<p>FN worse -> recall (lower threshold). FP worse -> precision (raise threshold). Rare positives -> PR-based metrics.</p>`, `<p>Back it with cost: threshold ≈ cost_FP / (cost_FP + cost_FN) for calibrated probabilities. For fraud with cost_FN = 200 and cost_FP = 5 that is about 2.4%.</p>`],
  `<p>Cancer screening: the worst error is a false negative, so the primary metric is recall (sensitivity) with precision kept tolerable because positives get a follow-up test; lower the threshold. Do not use accuracy, because the disease is rare. Spam filter for a business inbox: the worst error is a false positive (a client email lost), so track precision of the spam bucket and raise the threshold, accepting that some spam gets through; recall alone would reward over-filtering. Fraud at 0.1%: accuracy is meaningless (99.9% by saying nothing), so use PR-AUC and recall at a fixed precision (or minimal total cost), choosing the threshold from the cost ratio, around 2-3% probability if a miss costs 40x a false block. In every case confirm on a held-out set that respects the real class ratio.</p>`,
  `<p>Picking a threshold from the ROC table: O(n log n).</p>`, ['How does base rate change the precision of a positive test?'], ['Stripe', 'Gmail']));
practice.push(mk('Why does AUC look great but the alerts are useless?', 'Medium', ['ROC', 'imbalance', 'PR curve'],
  `<p>An anomaly detector has ROC-AUC 0.97 on a dataset with 10 positives per 100,000 rows. At a threshold giving 90% recall, the FPR is 3%. How many false alarms per true detection, and what metric would have warned you?</p>`,
  `<p>Per 100,000 rows: 10 positives -> 9 caught. Negatives 99,990 x 3% = ~3,000 false alarms. About <b>333 false alarms per catch</b>; precision ≈ 0.3%. PR-AUC would have exposed it.</p>`,
  `<p>Reading AUC 0.97 as "97% good". ROC's FPR divides by the huge negative count, hiding the flood of false positives.</p>`,
  { q: 'Which metric is more informative for a 0.01% positive rate?', options: ['ROC-AUC', 'Accuracy', 'Precision-recall curve', 'None'], answer: 2, explain: 'PR curves include precision, which depends on the number of false positives relative to the few positives; ROC divides by the huge negative count and hides the problem.' },
  [`<p>Count caught positives first: 90% of 10 = 9. Count false alarms: FPR x number of negatives.</p>`, `<p>False alarms = 0.03 x 99,990 ≈ 2,999. Precision = 9 / (9 + 2,999).</p>`, `<p>Remedy: raise the threshold to a lower-recall point, add a second-stage model on the flagged rows, or improve features. Report PR-AUC and alerts per day.</p>`],
  `<p>With 10 positives and 99,990 negatives, 90% recall catches 9 positives. A 3% false positive rate flags 0.03 x 99,990 ≈ 3,000 normal rows. So the system raises about 3,009 alerts of which 9 are real: precision ≈ 0.3%, roughly 333 false alarms per true detection. ROC-AUC is insensitive to this because FPR divides by the enormous negative count. The precision-recall curve (or average precision) would have shown precision collapsing at high recall. Operationally, choose the threshold from the review capacity (for example 50 alerts per day), add a cheap second-stage filter, and report precision at that capacity along with recall.</p>`,
  `<p>O(n log n) to compute either curve.</p>`, ['What is the no-skill baseline of a PR curve?'], ['Datadog', 'Google']));
practice.push(mk('Design the split for a time-series demand forecast', 'Medium', ['split', 'time series', 'leakage'],
  `<p>You have 3 years of daily sales for 500 stores and must forecast next 2 weeks. A teammate proposes a random 80/10/10 row split and fitting the scaler on everything. Design a correct evaluation scheme and name every leak in the proposal.</p>`,
  `<p>Leaks: random split lets the model train on days after the test days; scaler fitted on all rows; neighbouring days/stores are near-duplicates. Fix: chronological split with walk-forward validation, scaler on train only.</p>`,
  `<p>Random shuffle gives a flattering score: tomorrow's value is almost identical to the day before, which is in the training set. The score does not predict forecasting skill.</p>`,
  { q: 'Walk-forward validation means...', options: ['Shuffle and split', 'Train on the past, validate on the next block, then slide forward', 'Use only the latest day', 'Train on the future'], answer: 1, explain: 'It repeatedly trains on data up to time T and tests on the following window, mimicking real deployment.' },
  [`<p>Ask what the production situation is: at date T you forecast T+1...T+14 using only the past.</p>`, `<p>Mimic that: folds like train up to month 24 / validate months 25, then train to 25 / validate 26, and so on. Test = the last 2 weeks (or last months), touched once.</p>`, `<p>Also fit scalers, encoders and target statistics on the training window only; avoid features (like next-week promo outcomes) that are not known at forecast time; keep a gap equal to the forecast horizon between train and validation to avoid overlap.</p>`],
  `<p>The proposal leaks in three ways. First, a random row split mixes future days into the training set, so the model effectively interpolates between neighbouring known days; demand is strongly autocorrelated, so scores will be inflated. Second, the scaler fitted on all data uses statistics of the test period. Third, the same store's adjacent days are near-duplicates across the split. A correct design: hold out the final block (say the last 4 weeks) as the test set, use walk-forward validation on earlier data (train on up to month k, validate on the next 2 weeks, slide forward and average the scores), fit all preprocessing inside each training window, and keep a gap equal to the forecast horizon. Compare against a naive baseline (same day last week) to make sure the model adds value. Report error per store segment as well as overall.</p>`,
  `<p>Walk-forward with k folds trains k models: O(k x training cost).</p>`, ['How do you handle new stores that have no history?'], ['Walmart', 'Amazon']));
practice.push(mk('Gradient descent by hand on a toy loss', 'Medium', ['gradient descent', 'math'],
  `<p>Loss L(w) = (w - 5)<sup>2</sup>, start w = 1. Do 3 steps of gradient descent with lr = 0.3, and then with lr = 1.2. What happens in each case?</p>`,
  `<p>lr 0.3: w = 1 -> 3.4 -> 4.36 -> 4.744 (approaching 5, error shrinks by 0.4 each step). lr 1.2: w = 1 -> 10.6 -> -3.64 -> 15.73 (error grows by 1.4x each step: diverges).</p>`,
  `<p>Guessing "bigger lr is faster". Past the stability limit larger steps are slower: they never arrive.</p>`,
  { q: 'For L(w) = (w - 5)^2, what is the update factor on the error (w - 5) per step?', options: ['1 - lr', '1 - 2*lr', '1 + lr', '2*lr'], answer: 1, explain: 'w_new - 5 = (w - 5) - lr*2*(w - 5) = (1 - 2*lr)(w - 5). Converges when |1 - 2*lr| < 1, i.e. 0 < lr < 1.' },
  [`<p>Gradient = 2(w - 5). Update: w = w - lr x 2(w - 5).</p>`, `<p>Do the steps: lr 0.3: gradient at 1 = -8, new w = 1 + 2.4 = 3.4. Next gradient -3.2, new w = 3.4 + 0.96 = 4.36. Next -1.28, new w = 4.744.</p>`, `<p>The distance to 5 gets multiplied by (1 - 2 lr) each step: 0.4 for lr 0.3 (shrinks), -1.4 for lr 1.2 (flips sign and grows).</p>`],
  `<p>The gradient is 2(w - 5), so each step multiplies the distance to the minimum by (1 - 2 lr). With lr = 0.3 the factor is 0.4: distances 4, 1.6, 0.64, 0.256, so w goes 1, 3.4, 4.36, 4.744 and the loss falls 16, 2.56, 0.41, 0.066. With lr = 1.2 the factor is -1.4: distances 4, -5.6, 7.84, -10.98, so w goes 1, 10.6, -3.64, 15.73 and the loss grows 16, 31, 61, 115: divergence by overshooting. The stable range is 0 < lr < 1 (factor magnitude below 1), the fastest convergence is at lr = 0.5 (factor 0, lands exactly on 5 for this loss).</p>`,
  `<p>O(1) per step per weight; O(n) per epoch for n rows.</p>`, ['Why does the real loss surface need an lr smaller than 1/curvature?'], ['Nvidia']));
practice.push(mk('Interpret learning curves: should we collect more data?', 'Hard', ['learning curve', 'bias-variance'],
  `<p>You plot error against training set size (1k to 50k rows). Model A: train error 0.31 flat, validation 0.33 flat for all sizes. Model B: train 0.02 and validation 0.25 at 1k, validation falls to 0.12 at 50k, train rises to 0.06. For each, decide whether more data helps and what else to try. Human error is 0.05.</p>`,
  `<p>A: high bias, more data will not help, need a richer model/features. B: high variance, still improving, more data and regularization help.</p>`,
  `<p>"We will just label 100k more rows" for Model A burns budget and leaves the error at 0.33, because it is capped by model capacity, not by data.</p>`,
  { q: 'Both train and validation error are high and flat as data grows. The best next step is...', options: ['Collect 10x more data', 'Increase model capacity or improve features', 'Stop early', 'Increase dropout'], answer: 1, explain: 'High bias: the model cannot represent the pattern; more data and more regularization do not help.' },
  [`<p>Compare train error to the human level for bias, and the gap between train and validation for variance.</p>`, `<p>A: 0.31 vs 0.05 human = big bias, tiny gap. B: train 0.06 close to human, gap 0.06 and shrinking = variance, still decreasing with data.</p>`, `<p>Estimate payoff: extrapolate B's validation curve; if 50k gave 0.12 from 0.25 at 1k, doubling the data may give another point or two. Cheaper levers first: regularization, augmentation, ensembling.</p>`],
  `<p>Model A: train 0.31 and validation 0.33 are almost identical and flat as data grows, while humans reach 0.05. The model cannot even fit its own training data, so the problem is high bias (underfitting). More data cannot help; use a more expressive model, better features, longer training or less regularization, and look for label/feature bugs. Model B: train error 0.06 is near human level but validation 0.12 leaves a gap of 0.06 that has been shrinking as data grew (0.25 to 0.12), so this is variance and more data is still paying off. Also try regularization, dropout, data augmentation and ensembles; extrapolate the curve to estimate whether the extra labelling budget will reach the target before spending it. Re-plot the curves after each change.</p>`,
  `<p>Learning curves need k training runs at increasing sizes.</p>`, ['How would you build a learning curve cheaply for a very large dataset?'], ['Google', 'Microsoft']));
practice.push(mk('Bayes and the screening test (base-rate trap)', 'Hard', ['precision', 'base rate'],
  `<p>A disease affects 1 in 500 people. A test has 98% sensitivity and 95% specificity. You test 100,000 people. Build the confusion matrix, compute precision, and explain to a patient with a positive result what the chance of disease is.</p>`,
  `<p>Sick = 200, healthy = 99,800. TP = 196, FN = 4, FP = 0.05 x 99,800 = 4,990, TN = 94,810. Precision = 196 / 5,186 = <b>3.8%</b>.</p>`,
  `<p>Saying "the test is 98% accurate, so you almost certainly have it". Ignores that false alarms among the huge healthy group swamp the true cases.</p>`,
  { q: 'Which quantity changes when the disease prevalence changes (same test)?', options: ['Sensitivity', 'Specificity', 'Precision (positive predictive value)', 'All of them'], answer: 2, explain: 'Sensitivity and specificity are properties of the test. Precision depends on the mix of sick and healthy people tested.' },
  [`<p>Split the population: 100,000/500 = 200 sick, 99,800 healthy.</p>`, `<p>TP = 0.98 x 200 = 196, FN = 4. FP = (1 - 0.95) x 99,800 = 4,990, TN = 94,810.</p>`, `<p>Precision = TP/(TP + FP) = 196/5,186 ≈ 0.038. Explain: about 1 in 26 positives is truly sick, so a follow-up confirmatory test is needed.</p>`],
  `<p>Out of 100,000 people, 200 are sick and 99,800 are healthy. With 98% sensitivity the test finds TP = 196 and misses FN = 4. With 95% specificity 5% of healthy people test positive: FP = 4,990, and TN = 94,810. A positive result therefore comes from 196 + 4,990 = 5,186 people of whom only 196 are sick: precision (positive predictive value) = 3.8%. To the patient: a positive result means roughly a 4% chance of disease, much higher than the 0.2% before the test but far from certain, so a more specific confirmation test is advised. This is the base-rate effect: for rare conditions even good tests have low precision, so screening programs use cheap sensitive tests followed by precise ones.</p>`,
  `<p>O(1) arithmetic, nothing to optimise.</p>`, ['How would the precision change if the disease were 1 in 20?'], ['Google Health']));
practice.push(mk('Rebuild a flawed evaluation pipeline', 'Hard', ['leakage', 'pipeline', 'imbalance'],
  `<p>A junior's fraud notebook does: (1) one-hot encode and standardize the full dataset, (2) oversample fraud rows 20x with duplication, (3) random 80/20 split, (4) tune the threshold and hyper-parameters to maximize F1 on the 20% split and report that F1, (5) report accuracy as the headline. List every problem and write the corrected pipeline.</p>`,
  `<p>Problems: scaler leak, oversampling before split (duplicates in test), tuning and reporting on the same split, accuracy headline, random split for time-dependent fraud.</p>`,
  `<p>Keeping the pipeline and "just reporting F1 instead of accuracy". The score would still be inflated by duplicates of fraud rows sitting in both train and test.</p>`,
  { q: 'Oversampling the minority class should be done...', options: ['Before splitting', 'On the training set only, after the split', 'On the test set only', 'Never'], answer: 1, explain: 'Duplicated or synthetic rows must never reach validation or test; otherwise copies of training rows inflate the score.' },
  [`<p>Walk through in order and for each step ask which rows its statistics come from.</p>`, `<p>Correct order: time-based split first (train / validation / test), then fit encoder+scaler on train, then rebalance train only (or use class weights), then tune lambda, threshold and hyper-parameters on validation.</p>`, `<p>Report on the untouched test set with the real class ratio: precision, recall, PR-AUC, the confusion matrix and the money saved at the chosen threshold; compare with a baseline rule.</p>`],
  `<p>Problems: (1) preprocessing fitted on all data leaks test statistics; also unseen categories at test time are never handled. (2) Oversampling before the split puts exact copies of the same fraud row in train and test, so the model "recognizes" test frauds. (3) A random split ignores time: fraud patterns drift and the model sees the future. (4) Tuning the threshold and hyper-parameters on the same split that is reported makes the F1 optimistic (winner's curse). (5) Accuracy is dominated by legitimate transactions. Corrected pipeline: chronological split into train, validation, test; fit encoders and scalers on train only (pipeline object); handle imbalance on train only with class weights or oversampling; tune hyper-parameters and the threshold (from the cost ratio) on validation; evaluate once on test, reporting the confusion matrix, precision, recall, PR-AUC and expected cost; compare to a simple rules baseline; monitor drift after launch.</p>`,
  `<p>Pipeline objects keep each step O(n); tuning cost grows with the hyper-parameter grid.</p>`, ['How would you detect that you have duplicates across train and test?'], ['PayPal', 'Stripe']));
practice.push(mk('Threshold selection with costs and a review budget', 'Hard', ['threshold', 'cost', 'ROC'],
  `<p>Scores and labels (1 = fraud): (0.95,1) (0.9,0) (0.8,1) (0.7,0) (0.6,0) (0.5,1) (0.4,0) (0.3,0) (0.2,0) (0.1,0). A missed fraud costs 100; a false block costs 10; analysts can review at most 4 flagged items. Pick the threshold that minimizes total cost subject to the review limit.</p>`,
  `<p>Threshold 0.7 flags 4 items (0.95,0.9,0.8,0.7): TP 2, FP 2, FN 1 -> cost 100 + 20 = 120. Threshold 0.5 flags 6 (too many for the budget, cost 0+30... 3 TP, FP 3 = 30). Within budget, best is 0.7 (cost 120) vs 0.8 (flags 3: TP2 FP1 FN1 = 100 + 10 = 110).</p>`,
  `<p>Using the default 0.5 threshold because it is the default. It ignores both the cost asymmetry and the staffing limit.</p>`,
  { q: 'When a missed positive costs 10x a false alarm, the cost-optimal threshold on a calibrated probability is about...', options: ['0.5', '0.09', '0.9', '0.99'], answer: 1, explain: 'Flag if p > c_FP/(c_FP + c_FN) = 1/11 ≈ 0.09.' },
  [`<p>For each candidate threshold, count TP, FP, FN, then cost = 100 x FN + 10 x FP, and the number of flags = TP + FP.</p>`, `<p>Thresholds: 0.95 flags 1 (TP1 FP0 FN2 cost 200), 0.9 flags 2 (TP1 FP1 FN2 cost 210), 0.8 flags 3 (TP2 FP1 FN1 cost 110), 0.7 flags 4 (TP2 FP2 FN1 cost 120).</p>`, `<p>0.6 flags 5 and exceeds the budget. So the best within 4 flags is 0.8 at cost 110. Without the budget: 0.5 gives TP3 FP3 FN0 = 30, the global optimum, but unaffordable to review.</p>`],
  `<p>Sweep thresholds from high to low and keep running counts. Threshold 0.95: flags 1, TP 1, FP 0, FN 2, cost 200. 0.9: flags 2, TP 1, FP 1, FN 2, cost 210. 0.8: flags 3, TP 2, FP 1, FN 1, cost 110. 0.7: flags 4, TP 2, FP 2, FN 1, cost 120. 0.6: flags 5, TP 2, FP 3, FN 1, cost 130 (over budget). 0.5: flags 6, TP 3, FP 3, FN 0, cost 30 (over budget). Under the 4-flag review limit the best is threshold 0.8 with cost 110. The unconstrained optimum 0.5 costs only 30, so the staffing limit is costing 80 per batch: a clear argument for hiring analysts, adding an auto-approve second model, or reviewing in priority order. Present this trade-off table to the stakeholders rather than a single number.</p>`,
  `<p>Sort O(n log n), single sweep O(n).</p>`, ['How would the answer change if the model scores were not calibrated?'], ['Stripe', 'Square']));
practice.push(mk('Explain an overfit LLM fine-tune and design the eval', 'Hard', ['LLM', 'overfitting', 'evaluation'],
  `<p>You fine-tuned an LLM on 400 support tickets. Training loss reached 0.05 and demos on those tickets look perfect, but real users report odd, repetitive, sometimes wrong answers. Diagnose and design an evaluation and training plan that avoids this.</p>`,
  `<p>Overfitting: the model memorized 400 examples. Plan: held-out validation/test tickets (by customer / time), early stopping on validation loss, lower lr / fewer epochs / LoRA, a regression suite for general skills, human or rubric-judged evaluation.</p>`,
  `<p>Demoing on training tickets and declaring success. That measures memory, not skill.</p>`,
  { q: 'Fine-tune training loss falls to near zero while validation loss rises. Best immediate action?', options: ['Train longer', 'Stop at the validation-loss minimum and reduce epochs/lr or add data', 'Delete the validation set', 'Use a bigger lr'], answer: 1, explain: 'Rising validation loss is the overfitting signal; restore the best checkpoint and reduce capacity or training intensity.' },
  [`<p>Which tickets did you demo on? If they were in the training set, the demo proves nothing.</p>`, `<p>Split tickets by customer and date into train / validation / test; track validation loss each epoch and keep the best checkpoint.</p>`, `<p>Reduce the risk: fewer epochs (1-3), lower lr (1e-5 full / 1e-4 LoRA), LoRA with small rank, mix in general-instruction data, more diverse examples. Evaluate with a rubric (correct, grounded, tone) on the test tickets and a general-skills regression set.</p>`],
  `<p>Training loss of 0.05 on only 400 examples means the model memorised them. Demos on training tickets only show recall. Real users see new phrasing, so the model repeats trained phrases and degrades general abilities (forgetting). Plan: split the tickets by customer and date into train, validation and test, never reuse test tickets for prompt tinkering; monitor validation loss each epoch and early-stop at its minimum; fine-tune gently (1-3 epochs, small learning rate, LoRA with a small rank, optionally mixing in general instruction data); enlarge and diversify the data, perhaps with reviewed synthetic variants. Evaluate on the held-out test set using a rubric (correctness, groundedness to the knowledge base, tone, refusal behaviour) scored by humans or a calibrated LLM judge whose agreement with humans you have measured, plus a regression suite of general tasks to catch forgetting. Compare against the simplest baseline: prompt + retrieval with no fine-tuning.</p>`,
  `<p>Evaluation cost: O(test set size) model calls per candidate checkpoint.</p>`, ['When would you choose RAG over fine-tuning for this problem?'], ['Anthropic', 'OpenAI']));

// ---------------- QUIZ ----------------
quiz.push({ q: 'In supervised learning, what is the "label"?', options: ['A column the model uses as input', 'The answer we want the model to predict', 'The name of the model', 'A random ID'], answer: 1, explain: 'Features are inputs; the label (target, y) is the known answer in training data and the thing predicted for new rows.' });
quiz.push({ q: 'Which is the purpose of the validation set?', options: ['Final honest score, used once', 'Comparing models and tuning hyper-parameters', 'Training the weights', 'Storing backups'], answer: 1, explain: 'Validation is used repeatedly to pick models and settings; the test set is the single final check.' });
quiz.push({ q: 'You standardize all rows with one mean/std, THEN split. What went wrong?', options: ['Nothing', 'Preprocessing leakage', 'Underfitting', 'Class imbalance'], answer: 1, explain: 'Statistics were computed with test rows included. Split first, fit the scaler on training rows only.' });
quiz.push({ q: 'Which loss best fits a yes/no probability output?', options: ['Mean squared error on raw scores', 'Binary cross-entropy', 'Mean absolute error', 'Hinge on features'], answer: 1, explain: 'Binary cross-entropy is the matching loss for probabilities of a binary label and punishes confident mistakes strongly.' });
quiz.push({ q: 'Gradient descent update rule for a weight w is...', options: ['w = w + lr * gradient', 'w = w - lr * gradient', 'w = lr / gradient', 'w = gradient'], answer: 1, explain: 'The gradient points uphill; subtracting a small multiple of it moves downhill.' });
quiz.push({ q: 'Loss is 3, 9, 40, 800, NaN across epochs. Most likely fix?', options: ['Raise the learning rate', 'Lower the learning rate', 'Add more epochs', 'Use the test set'], answer: 1, explain: 'Growing loss is divergence from overshooting. Reduce the learning rate (and consider gradient clipping).' });
quiz.push({ q: 'Train accuracy 99%, validation accuracy 72%. This indicates...', options: ['Underfitting', 'Overfitting', 'A perfect model', 'Too small a learning rate'], answer: 1, explain: 'A large train-validation gap is high variance: the model memorized the training data.' });
quiz.push({ q: 'Which technique can push some weights exactly to zero?', options: ['L2 regularization', 'L1 regularization', 'Dropout', 'Bigger batch size'], answer: 1, explain: 'L1 (Lasso) creates sparse weights and acts as automatic feature selection.' });
quiz.push({ q: 'Early stopping stops training when...', options: ['Training loss reaches zero', 'Validation loss has not improved for a set number (patience) of epochs', 'The learning rate is large', 'The test set is used'], answer: 1, explain: 'It watches the validation curve and restores the best epoch to avoid memorization.' });
quiz.push({ q: 'TP = 30, FP = 10, FN = 20, TN = 940. What is recall?', options: ['0.75', '0.60', '0.97', '0.50'], answer: 1, explain: 'Recall = TP/(TP+FN) = 30/50 = 0.60. Precision would be 30/40 = 0.75.' });
quiz.push({ q: 'Fraud is 0.1% of transactions. Why is accuracy a poor metric?', options: ['It is hard to compute', 'Predicting "not fraud" always gives 99.9% accuracy', 'It ignores true negatives', 'It needs a threshold'], answer: 1, explain: 'The majority class dominates accuracy; precision/recall/PR-AUC show how well the rare class is handled.' });
quiz.push({ q: 'AUC = 0.5 means the model is...', options: ['Perfect', 'No better than random ranking', 'Always wrong', 'Calibrated'], answer: 1, explain: 'AUC is the chance a random positive outranks a random negative; 0.5 is a coin flip.' });
quiz.push({ q: 'A cancer-screening system should primarily maximize...', options: ['Precision', 'Recall', 'Accuracy', 'Training loss'], answer: 1, explain: 'A missed cancer (false negative) is the most costly error; a false alarm only triggers a follow-up test.' });
quiz.push({ q: 'Which is NOT a form of data leakage?', options: ['Duplicate rows in train and test', 'A feature recorded after the outcome', 'Fitting the imputer on training rows only', 'Random split of time-series data'], answer: 2, explain: 'Fitting preprocessing on training rows only is the correct way to avoid leakage.' });

// ---------------- INTERVIEW ----------------
interview.push({ q: 'Explain train, validation and test sets and why we need all three.', level: 'B', a: `<p>Train data is what the model learns from. Validation data is used repeatedly while building: to compare models, choose hyper-parameters such as learning rate or regularization strength, and decide when to stop. Because we look at it many times, our choices slowly fit it, so its score becomes slightly optimistic. The test set stays untouched until the end and is evaluated once to give an honest estimate of real-world performance. With small data, cross-validation replaces a fixed validation set, but the test set is still held out. The split should mimic deployment: random for iid data, chronological for forecasting, grouped by user/patient when rows are related, and stratified when classes are rare.</p>`, followUps: ['How would you split time-series data?', 'What if you only have 300 rows?'] });
interview.push({ q: 'What is data leakage? Give three concrete examples and how you would find them.', level: 'I', a: `<p>Leakage is when information that will not be available at prediction time influences training, making offline scores unrealistically high. Examples: (1) target leakage, such as a "refund_issued" column in a fraud model; (2) preprocessing leakage, such as scaling, imputing or selecting features on all data before splitting; (3) split leakage: duplicates, the same user or patient in both train and test, or random splitting of time-ordered data. To find it: define the prediction moment and audit each feature's availability; look at feature importances for suspiciously dominant columns; check scores that are too good to be true; rebuild the evaluation with a time-based or group split and watch the score drop; use pipeline objects so preprocessing is fitted inside each training fold.</p>`, followUps: ['What is train/serve skew and how does it differ from leakage?', 'How do you prevent leakage in a feature store?'] });
interview.push({ q: 'MSE or cross-entropy: how do you choose a loss function?', level: 'B', a: `<p>Match the loss to the label and to the cost of errors. Numeric label: MSE if large errors should hurt disproportionately and noise is roughly Gaussian; MAE or Huber if outliers are noise; quantile loss if you need a percentile. Categorical label: cross-entropy (binary with sigmoid, categorical with softmax), because it is the maximum-likelihood loss for class probabilities and gives strong gradients when the model is confidently wrong. Using MSE for classification with a sigmoid output yields weak gradients when saturated and slows learning. Finally the training loss is a proxy: report the business metric (F1, cost saved) too, and make sure the loss reflects asymmetric costs, for example with class weights.</p>`, followUps: ['Why is the gradient of cross-entropy with a sigmoid just p - y?', 'What is perplexity?'] });
interview.push({ q: 'Explain gradient descent and what happens if the learning rate is too high or too low.', level: 'B', a: `<p>Gradient descent minimizes the loss by repeatedly stepping opposite to the gradient: w = w - lr x dL/dw. The gradient says which way is uphill, so subtracting it goes downhill. If the learning rate is too low, progress is painfully slow and may stall on plateaus; if it is too high, steps overshoot the minimum, the loss oscillates or grows and can become NaN. For a quadratic bowl with curvature c, the process converges only for lr below 2/c. In practice we sweep lr on a log scale, use warm-up and decay schedules, adaptive optimizers like Adam, normalise features, and clip gradients. Mini-batches trade exactness for speed and add useful noise.</p>`, followUps: ['Why do we use mini-batches?', 'How do Adam and momentum differ from plain SGD?'] });
interview.push({ q: 'How do you diagnose overfitting vs underfitting?', level: 'B', a: `<p>Compare training and validation error against a target such as human-level or a simple baseline. Both high and close together means underfitting (high bias): use a bigger model, better features, less regularization, longer training. Low training error but much higher validation error is overfitting (high variance): get more data, regularize, simplify, use dropout or early stopping, or ensemble. Learning curves help: if both curves plateau at a high error, more data will not help; if a large gap remains but shrinks with data, more data will. Always plot the curves over epochs and over model size and confirm the fix by re-plotting.</p>`, followUps: ['Explain the bias-variance trade-off.', 'What is double descent?'] });
interview.push({ q: 'Compare L1 and L2 regularization. When would you choose each, and what is early stopping?', level: 'I', a: `<p>Both add a penalty on weight size to the loss, controlled by lambda. L2 penalizes squared weights: it shrinks all weights smoothly, handles correlated features gracefully and is the default (weight decay in deep learning). L1 penalizes absolute values: it drives many weights exactly to zero, so it gives a sparse, explainable model and feature selection, but is unstable with correlated features (Elastic Net mixes both). Early stopping monitors validation loss and stops once it has not improved for a patience window, restoring the best checkpoint; it acts like L2 because weights stay small. Choose lambda by cross-validation on a log grid and standardize features first.</p>`, followUps: ['Why does L1 produce sparsity geometrically?', 'What is the difference between L2 and weight decay in Adam?'] });
interview.push({ q: 'Define precision, recall and F1, and say when each matters.', level: 'B', a: `<p>Precision = TP/(TP+FP): of the items I flagged, what fraction was right. Recall = TP/(TP+FN): of the real positives, what fraction did I find. F1 is their harmonic mean, which is low unless both are decent. Precision matters when false alarms are costly (spam folder losing real mail, blocking legitimate customers). Recall matters when misses are costly (cancer screening, security threats). F1 is a quick single number for imbalanced problems when both matter roughly equally. The threshold moves you along the trade-off, so always say at which threshold the numbers were measured, and prefer cost-based selection when costs are known.</p>`, followUps: ['What is F-beta?', 'What is the difference between macro and micro averaging?'] });
interview.push({ q: 'Why is accuracy misleading on imbalanced data and what do you use instead?', level: 'B', a: `<p>If 99.9% of rows are negative, a model that always predicts negative has 99.9% accuracy but zero recall, so accuracy mostly measures the majority class. Use the confusion matrix, precision, recall, F1, and PR-AUC; compare to the majority baseline; consider class weights or resampling on the training set only; and keep validation and test sets at the real class ratio. Choose the operating threshold from business costs. For ranking systems use precision@k or recall@k.</p>`, followUps: ['How does SMOTE work and when can it hurt?', 'Why shouldn\'t you rebalance the test set?'] });
interview.push({ q: 'What do the ROC curve and AUC show? When is PR-AUC better?', level: 'I', a: `<p>The ROC curve plots true positive rate against false positive rate for every threshold; the diagonal is random guessing and the top-left corner is perfect. AUC is the area under it and equals the probability that a random positive gets a higher score than a random negative, so it measures ranking quality independent of threshold and of calibration. It is insensitive to class imbalance, which is a weakness when positives are very rare: a tiny FPR on a huge negative class can still mean many more false positives than true positives. In that case the precision-recall curve and average precision are more informative, because precision includes the false positive count relative to the few positives.</p>`, followUps: ['How do you compute AUC by hand?', 'What is the no-skill baseline in a PR curve?'] });
interview.push({ q: 'You have a fraud model. Walk me through choosing the metric and threshold.', level: 'A', a: `<p>First, quantify costs: a missed fraud (chargeback, lost goods, fees) versus a false decline (lost sale, annoyed customer, support cost) and the analyst capacity. With 0.1% fraud, reject accuracy; evaluate on a time-based test set with PR-AUC and recall at fixed precision, plus the expected cost curve. For calibrated probabilities the cost-optimal threshold is c_FP/(c_FP+c_FN); otherwise sweep thresholds on validation data and compute total cost under the review limit. Then check performance per segment (country, merchant), run shadow mode and an A/B test, set up monitoring of alert rate and drift, and plan periodic retraining as fraudsters adapt.</p>`, followUps: ['How would you handle delayed labels (chargebacks arrive after 60 days)?', 'What if the model is not calibrated?'] });
interview.push({ q: 'Your model scores 97% offline but performs badly in production. What do you investigate?', level: 'A', a: `<p>Suspects in order: (1) leakage in the offline set (target leak features, preprocessing before split, duplicates, random split of time data); (2) train/serve skew (features computed differently online, missing values, units, time windows); (3) distribution shift or concept drift (new users, seasons, adversaries); (4) a metric that hides the problem (accuracy on imbalanced data, threshold chosen on test); (5) label noise or proxy-label mismatch; (6) feedback loops where the model changes the data it later sees. Methods: log live features and compare their distributions against training, replay production data through the offline pipeline, rebuild evaluation with a strict time split, slice metrics by segment, and run a shadow deployment before trusting numbers.</p>`, followUps: ['How would you monitor drift without labels?', 'What is a feedback loop in recommendation systems?'] });
interview.push({ q: 'How do these ML fundamentals apply when evaluating or fine-tuning an LLM application?', level: 'A', a: `<p>The same principles carry over. Build a labelled evaluation set that is split from anything used in prompts, few-shot examples or fine-tuning (contamination is leakage); measure with task-specific rubrics, turning judgments into pass/fail so you can compute precision/recall and confusion matrices for things like hallucination or toxicity detectors; choose thresholds by cost; validate any LLM-as-judge against human labels; watch for overfitting when fine-tuning on small data (use validation loss, early stopping, small learning rates or LoRA, regression tests for general skills); and compare to cheap baselines such as better prompts and retrieval. Finally, monitor production quality, since prompts, models and user behaviour drift.</p>`, followUps: ['How would you measure the reliability of an LLM judge?', 'How do you prevent eval-set contamination over time?'] });
interview.push({ q: 'Explain the bias-variance trade-off and how regularization, data size and model size interact with it.', level: 'E', a: `<p>Expected squared error decomposes into bias squared (error from wrong assumptions or too little capacity), variance (sensitivity to the particular training sample) and irreducible noise. Increasing model capacity lowers bias and raises variance; regularization, early stopping, bagging and dropout reduce variance at the price of some bias; more data reduces variance without raising bias, which is why large data allows larger models. The U-shaped validation curve is the classical picture, but over-parameterised deep nets show double descent, where validation error falls again beyond the interpolation threshold, helped by implicit regularization of SGD. Diagnose with learning curves and choose the lever that addresses the dominant term.</p>`, followUps: ['How does bagging reduce variance mathematically?', 'Why can a huge neural net generalise despite memorising?'] });

registerModule({
  id: 'ai04',
  title: 'Machine Learning Foundations',
  intro: `<p>Before you can work well with modern AI, you need the handful of ideas that every model - from a tiny spam filter to a giant language model - is built on: what the model sees (<b>features and labels</b>), how we honestly test it (<b>train/validation/test and leakage</b>), how it is told it is wrong (<b>loss</b>), how it improves (<b>gradient descent</b>), how it fails (<b>overfitting and underfitting</b>), how we protect it (<b>regularization</b>) and how we judge it (<b>precision, recall, F1, ROC-AUC</b>). Everything is explained with small numbers you can check by hand, runnable Python that uses only the standard library, and step-by-step visualizers. Interview questions on these topics come up in every data, ML and AI-engineering loop, and they are exactly the skills you need to question AI-generated notebooks and evaluate LLM features.</p>`,
  goals: ['Split a table into features and label, and name the task as regression or classification', 'Build train/validation/test splits correctly and spot at least five kinds of data leakage', 'Choose between MSE, MAE and cross-entropy and compute each by hand', 'Run gradient descent by hand and tune the learning rate from a loss curve', 'Diagnose over- and underfitting from train vs validation numbers and pick the right fix (more data, L1/L2, early stopping)', 'Compute accuracy, precision, recall, F1 from a confusion matrix, and ROC points/AUC from scores', 'Pick the right metric and threshold for fraud, spam and cancer-screening style problems'],
  prereqs: `Basic Python and comfort with averages and simple algebra. Helpful: AI modules on how LLMs work (ai01-ai03). No calculus needed - gradients are explained with slopes.`,
  hours: 9,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
