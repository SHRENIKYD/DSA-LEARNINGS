(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // Small seeded random generator (mulberry32) so every visualizer is deterministic.
  function makeRng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function r4(x) { return Math.round(x * 10000) / 10000; }
  function nums(s, what) {
    var a = String(s).trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (!a.length || a.some(function (x) { return isNaN(x); })) throw new Error('Enter ' + what + ' as numbers separated by spaces');
    return a;
  }
  // Standard normal CDF (Abramowitz-Stegun style erf approximation, accurate to ~1e-7).
  function phi(z) {
    var t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z / 2);
    return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
  }
  function comb(n, k) {
    if (k < 0 || k > n) return 0;
    var r = 1;
    for (var i = 1; i <= k; i++) r = r * (n - k + i) / i;
    return Math.round(r);
  }

  /* =====================================================================
     TOPIC 1 — Random variables, events and the law of large numbers
     ===================================================================== */
  topics.push({
    title: 'Probability Basics, Random Variables & the Law of Large Numbers',
    analogy: `<p>Think of a <b>weather forecaster</b> who says "70% chance of rain". She is not saying it will rain 70% of the day. She means: on many days that look like today, it rained on about 7 out of 10 of them. Probability is a <b>long-run fraction</b>. One day can surprise you; a thousand days rarely do.</p>`,
    explain: `<p><b>Probability</b> is a number from 0 to 1 that says how often something happens if you repeat the same situation many times. 0 means never. 1 means always. 0.5 means half the time.</p>
      <p>A few words you will hear in every interview:</p>
      <ul>
        <li><b>Experiment</b>: something with an uncertain result, like flipping a coin or showing an ad to a user.</li>
        <li><b>Sample space</b>: the list of every possible result. For one die it is {1, 2, 3, 4, 5, 6}.</li>
        <li><b>Event</b>: a group of results you care about, like "the die shows an even number" = {2, 4, 6}.</li>
        <li><b>Random variable</b>: a rule that turns each result into a number. "Number of heads in 3 flips" is a random variable. It can be 0, 1, 2 or 3.</li>
      </ul>
      <p>When all results are equally likely, P(event) = (results in the event) ÷ (all results). For an even die roll: 3 ÷ 6 = 0.5.</p>
      ${H.table(['rule', 'in words', 'worked example'], [
        ['P(not A) = 1 − P(A)', 'the <b>complement</b> rule', 'P(not a six) = 1 − 1/6 = 5/6 ≈ 0.833'],
        ['P(A and B) = P(A) · P(B)', 'only if A and B are <b>independent</b>', 'two heads in a row = 0.5 · 0.5 = 0.25'],
        ['P(A or B) = P(A) + P(B) − P(A and B)', 'do not count the overlap twice', 'king or heart = 4/52 + 13/52 − 1/52 = 16/52 ≈ 0.308'],
        ['P(at least one) = 1 − P(none)', 'the most useful trick in interviews', 'at least one six in 4 rolls = 1 − (5/6)<sup>4</sup> ≈ 0.518']
      ])}
      <p><b>Discrete vs continuous.</b> A discrete random variable takes separate values you can list (0, 1, 2 heads). A continuous one can take any value in a range (a person's height, a model's latency in ms). For continuous variables we talk about the probability of a <i>range</i>, like "latency between 100 and 200 ms", because any single exact value has probability 0.</p>
      <p><b>The law of large numbers</b> says: if you repeat an experiment many times, the fraction of times an event happens gets closer and closer to its true probability. Flip a fair coin 10 times and you might see 7 heads (70%). Flip it 10,000 times and you will almost surely see between 49% and 51%. This is why we trust averages over big datasets, and why we distrust results from tiny ones.</p>
      ${H.table(['flips', 'typical heads fraction', 'typical distance from 0.5'], [['10', '0.3 to 0.7', '± 0.16'], ['100', '0.45 to 0.55', '± 0.05'], ['10,000', '0.495 to 0.505', '± 0.005']])}
      <p>Notice the pattern: 100 times more flips gives only 10 times less error. The error shrinks like 1 ÷ √n. You will see this √n again in confidence intervals and A/B tests.</p>`,
    clues: [
      '"at least one" → compute 1 − P(none)',
      '"independent events" or "with replacement" → multiply probabilities',
      '"in the long run", "on average over many trials" → law of large numbers',
      '"simulate", "Monte Carlo", "estimate the probability" → repeat with a seeded random generator and count',
      '"mutually exclusive" → add probabilities (no overlap to subtract)',
      '"probability of exactly one value" for a continuous variable → it is 0; ask for a range instead'
    ],
    code: [
      { lang: 'python', run: true, title: 'Law of large numbers: flip a coin many times (runnable)', code: `import random

random.seed(7)          # fixed seed: you get the same "random" flips every run
p_heads = 0.5           # a fair coin
heads = 0

checkpoints = [10, 100, 1000, 10000, 100000]
flips = 0
for target in checkpoints:
    while flips < target:
        flips += 1
        if random.random() < p_heads:   # random() gives a float in [0, 1)
            heads += 1
    frac = heads / flips
    print(f"after {flips:>6} flips: heads fraction = {frac:.4f}, error = {abs(frac - p_heads):.4f}")

# Complement trick: chance of at least one six in 4 rolls
exact = 1 - (5 / 6) ** 4
sims = 100000
hits = sum(1 for _ in range(sims) if any(random.randint(1, 6) == 6 for _ in range(4)))
print(f"at least one six in 4 rolls: exact {exact:.4f}, simulated {hits / sims:.4f}")` },
      { lang: 'python', check: false, title: 'Same idea with NumPy (not run here)', code: `import numpy as np

rng = np.random.default_rng(7)
flips = rng.random(100_000) < 0.5          # array of True/False
running = np.cumsum(flips) / np.arange(1, flips.size + 1)
print(running[[9, 99, 999, 9_999, 99_999]])` }
    ],
    viz: {
      title: 'Law of large numbers: watch the heads fraction settle',
      input: '0.5 2000 7',
      inputLabel: 'p(heads), number of flips (≤ 5000), seed',
      gen: function (input) {
        var a = nums(input, 'p, flips and seed');
        var p = a[0], n = Math.floor(a[1] || 1000), seed = Math.floor(a[2] || 1);
        if (!(p >= 0 && p <= 1)) throw new Error('p must be between 0 and 1, e.g. "0.5 2000 7"');
        if (n < 10 || n > 5000) throw new Error('Use between 10 and 5000 flips');
        var rnd = makeRng(seed), heads = 0, frames = [], seq = [], marks = [], fr = [];
        var cps = [1, 2, 3, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].filter(function (c) { return c <= n; });
        if (cps[cps.length - 1] !== n) cps.push(n);
        frames.push({ narr: 'We will flip a coin with P(heads) = <b>' + p + '</b> up to <b>' + n + '</b> times and track the <b>fraction of heads</b>. The law of large numbers says this fraction should drift toward ' + p + '.', parts: [
          { type: 'vars', label: 'setup', vals: { 'P(heads)': p, flips: 0, heads: 0 } },
          { type: 'text', html: 'Each flip: draw a random number in [0, 1). If it is below p, call it heads.' }
        ] });
        var done = 0;
        cps.forEach(function (c) {
          while (done < c) { done++; var h = rnd() < p; if (h) heads++; if (seq.length < 20) seq.push(h ? 'H' : 'T'); }
          var f = heads / done; fr.push(r4(f)); marks.push(String(c));
          var err = Math.abs(f - p);
          frames.push({ narr: 'After <b>' + c + '</b> flips: ' + heads + ' heads, fraction = <b>' + r4(f) + '</b>. Distance from the true ' + p + ' is <b>' + r4(err) + '</b>' + (c <= 10 ? ' — with so few flips, big swings are normal.' : c >= 1000 ? ' — now the fraction barely moves. Typical error is about √(p(1−p)/n) = ' + r4(Math.sqrt(p * (1 - p) / c)) + '.' : '.'), parts: [
            { type: 'array', label: 'first flips', values: seq.slice() },
            { type: 'bars', label: 'heads fraction at each checkpoint', values: fr.slice(), idxLabels: marks.slice(), hl: (function () { var o = {}; o[fr.length - 1] = err < 0.02 ? 'ok' : 'cur'; return o; })() },
            { type: 'vars', vals: { flips: c, heads: heads, fraction: r4(f), error: r4(err) }, hl: { fraction: 'cur' } }
          ] });
        });
        frames.push({ narr: 'Summary: early fractions jump around, later ones hug ' + p + '. Error shrinks like <b>1/√n</b>: 100× more flips → about 10× smaller error. This is why small samples mislead and big samples convince.', parts: [
          { type: 'bars', label: 'heads fraction', values: fr.slice(), idxLabels: marks.slice() },
          { type: 'table', label: 'expected typical error √(p(1−p)/n)', columns: ['n', 'typical error'], rows: [[10, r4(Math.sqrt(p * (1 - p) / 10))], [100, r4(Math.sqrt(p * (1 - p) / 100))], [1000, r4(Math.sqrt(p * (1 - p) / 1000))]] }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Even number on a die', html: `<p>Sample space {1,2,3,4,5,6}, event {2,4,6}. All 6 results are equally likely, so P(even) = 3/6 = <b>0.5</b>. P(not even) = 1 − 0.5 = 0.5.</p>` },
      { title: 'At least one defect in a batch', html: `<p>Each chip is faulty with probability 0.02, independently. In a batch of 50, P(no faulty chip) = 0.98<sup>50</sup> ≈ 0.364. So P(at least one faulty) = 1 − 0.364 ≈ <b>0.636</b>.</p>${H.table(['batch size n', '0.98<sup>n</sup>', 'P(at least one)'], [['1', '0.980', '0.020'], ['10', '0.817', '0.183'], ['50', '0.364', '0.636'], ['100', '0.133', '0.867']])}`, code: { lang: 'python', code: `print(1 - 0.98 ** 50)  # 0.6358...` } },
      { title: 'A random variable from coin flips', html: `<p>Flip 2 fair coins. Let X = number of heads. The 4 equal results are HH, HT, TH, TT.</p>${H.table(['X', 'results', 'P(X)'], [['0', 'TT', '1/4'], ['1', 'HT, TH', '2/4'], ['2', 'HH', '1/4']])}<p>The probabilities add up to 1, as they always must. This table is called the <b>distribution</b> of X.</p>` },
      { title: 'Why "independent" matters', html: `<p>Two servers in the same rack each fail 1% of a day. If failures were independent, both fail with probability 0.01 · 0.01 = 0.0001. But they share a power supply, so when one fails the other often does too. The real joint failure rate might be 0.005, which is 50× higher. <b>Multiplying only works for independent events.</b></p>` }
    ],
    deepDive: `<p><b>Formal footing.</b> Probability rests on three axioms (Kolmogorov): P(A) ≥ 0, P(whole sample space) = 1, and for events that cannot happen together, P(A or B) = P(A) + P(B). Everything else (complement, inclusion–exclusion, Bayes) follows from these.</p>
      <p><b>Two laws of large numbers.</b> The <i>weak</i> law says the sample average is very likely close to the true mean for large n. The <i>strong</i> law says the sample average converges to the mean with probability 1. Both need the mean to exist. A Cauchy distribution has no mean, so its running average never settles. Heavy-tailed data (latencies, revenue per user) can converge painfully slowly in practice.</p>
      <p><b>Monte Carlo error.</b> If you estimate a probability p by simulation with n trials, the standard error is √(p(1−p)/n). To get ±0.001 accuracy on p ≈ 0.5 you need about 250,000 trials. Rare events (p = 10<sup>−6</sup>) need importance sampling or exact maths instead.</p>
      <p><b>Pseudo-random generators.</b> <code>random</code> in Python is a Mersenne Twister: fast and reproducible, but <i>not</i> safe for passwords or tokens. Use <code>secrets</code> for security. Always set a seed in experiments so results are reproducible; in ML you also need to seed NumPy, PyTorch and the data loader workers.</p>`,
    aiEra: `<p><b>What AI changes:</b> an LLM can write a Monte Carlo simulation for any probability puzzle in seconds. That makes checking your maths cheap, so do it. <b>Use AI as a partner:</b> ask <code>Simulate this with a fixed seed and 1e6 trials, then show the exact formula</code> and compare the two numbers. If they disagree, one of you is wrong, and finding out who teaches you a lot.</p>
      <p><b>Where AI goes wrong:</b> it multiplies probabilities that are not independent, forgets the complement trick and adds probabilities that overlap, or reports a simulated number with false precision. <b>What you must still own:</b> knowing when events are independent, explaining why a small sample is not evidence, and spotting when a claimed "90% accuracy" came from 10 examples. LLMs themselves are probabilistic: every token is sampled from a distribution, so understanding probability is understanding how they behave.</p>`,
    problems: [{
      title: 'Probability of At Least One Success', level: 'Easy', tags: ['complement', 'independence'], companies: ['Google', 'Meta'],
      statement: `<p>An ad is clicked with probability <code>p</code> each time it is shown, independently. It is shown <code>n</code> times. Return the probability that it is clicked <b>at least once</b>.</p>`,
      constraints: `0 ≤ p ≤ 1, 0 ≤ n ≤ 10<sup>6</sup>. Answers are compared to 1e-5.`,
      example: `<p>p = 1/6, n = 4 → <b>0.5177</b>. P(no click in one showing) = 5/6. P(no click in all 4) = (5/6)<sup>4</sup> ≈ 0.4823. So P(at least one) = 1 − 0.4823 = ${H.c('g', '0.5177')}.</p>`,
      brute: { why: `<p>List every one of the 2<sup>n</sup> click/no-click patterns and add up the ones with at least one click. Correct, but 2<sup>n</sup> patterns is hopeless beyond n ≈ 25. All that work just counts the single pattern we can describe directly: "no clicks at all".</p>`, code: `from itertools import product

def p_at_least_one_brute(p, n):
    total = 0.0
    for pattern in product([0, 1], repeat=n):      # 2**n patterns
        if any(pattern):
            prob = 1.0
            for c in pattern:
                prob *= p if c else (1 - p)
            total += prob
    return total

print(p_at_least_one_brute(1 / 6, 4))` },
      mcq: { q: 'What is the fastest way to get P(at least one click)?', options: ['Add p n times', '1 − (1 − p)<sup>n</sup>', 'p<sup>n</sup>', 'n · p · (1 − p)'], answer: 1, explain: 'Adding p n times can go above 1 — it double counts overlaps. The complement "no clicks at all" is one simple event with probability (1 − p)<sup>n</sup>.' },
      hints: [`<p>"At least one" has many ways to happen, but its opposite, "none at all", has exactly one way.</p>`, `<p>Independent showings means you can multiply: P(no click in all n) = (1 − p)<sup>n</sup>.</p>`, `<p>Edge cases: n = 0 gives 0 (no chances), p = 0 gives 0, p = 1 and n ≥ 1 gives 1. Recipe: return 1 − (1 − p) ** n.</p>`],
      solution: {
        approach: `<p>Use the complement. The only way to fail "at least one" is to miss every time, which has probability (1 − p)<sup>n</sup> because showings are independent. Subtract from 1.</p>`,
        code: `def p_at_least_one(p, n):
    # P(no success in one try) = 1 - p; independent tries multiply.
    p_none = (1 - p) ** n
    # Everything that is not "none" is "at least one".
    return 1 - p_none`,
        dry: { head: ['n', '(1 − p)<sup>n</sup> for p = 1/6', '1 − that'], rows: [['1', '0.8333', '0.1667'], ['2', '0.6944', '0.3056'], ['4', '0.4823', '<span class="c-g">0.5177</span>']] },
        complexity: `<p>O(log n) for the power (or O(1) with floating point pow), O(1) space.</p>`,
        followUps: ['How many showings are needed for a 95% chance of at least one click? (Solve 1 − (1 − p)<sup>n</sup> ≥ 0.95 → n ≥ log(0.05)/log(1 − p).)', 'What if each showing has its own p<sub>i</sub>? (Multiply the (1 − p<sub>i</sub>) terms.)']
      },
      tests: { sig: 'double int -> double', fn: 'p_at_least_one', cmp: 'float', cases: [[[0.5, 1], 0.5], [[0.5, 3], 0.875], [[0.16666666666666666, 4], 0.5177469135802468], [[0.01, 100], 0.6339676587267709], [[0.0, 10], 0.0], [[1.0, 1], 1.0], [[0.2, 0], 0.0], [[0.05, 20], 0.6415140775914581]] }
    }]
  });

  /* =====================================================================
     TOPIC 2 — Bernoulli and binomial distributions
     ===================================================================== */
  topics.push({
    title: 'Distributions I: Bernoulli & Binomial',
    analogy: `<p>A <b>basketball player</b> takes one free throw: it goes in or it does not. That single yes/no shot is a <b>Bernoulli</b> trial. Now she takes 10 free throws and you count how many go in. That count, 0 to 10, follows a <b>binomial</b> distribution. Same player, same skill, just counted over many tries.</p>`,
    explain: `<p>A <b>distribution</b> is a table (or formula) that tells you every value a random variable can take and how likely each one is. The probabilities always add up to 1.</p>
      <p><b>Bernoulli(p)</b> is the simplest distribution in the world. One trial, two outcomes: 1 ("success") with probability p, 0 ("failure") with probability 1 − p. A user clicks or not. An email is spam or not. A model's prediction is right or not.</p>
      ${H.table(['x', 'P(X = x)', 'example with p = 0.3'], [['1', 'p', '0.3'], ['0', '1 − p', '0.7']])}
      <p>Its mean (average value) is <b>p</b> and its variance (spread) is <b>p(1 − p)</b>. Variance is largest at p = 0.5, where the outcome is hardest to predict.</p>
      <p><b>Binomial(n, p)</b> counts the successes in <b>n independent</b> Bernoulli(p) trials. The chance of exactly k successes is:</p>
      <p style="text-align:center"><b>P(X = k) = C(n, k) · p<sup>k</sup> · (1 − p)<sup>n − k</sup></b></p>
      <p>Read it as three pieces. p<sup>k</sup> is the chance that k chosen trials succeed. (1 − p)<sup>n − k</sup> is the chance the others fail. <b>C(n, k)</b> ("n choose k") counts how many ways you can choose which k trials are the successes. In Python it is <code>math.comb(n, k)</code>.</p>
      <p><b>Worked example.</b> A coin with p = 0.5 is flipped n = 4 times. What is P(exactly 2 heads)? C(4, 2) = 6 (HHTT, HTHT, HTTH, THHT, THTH, TTHH). Each order has probability 0.5<sup>2</sup> · 0.5<sup>2</sup> = 0.0625. So P = 6 · 0.0625 = <b>0.375</b>.</p>
      ${H.table(['k', 'C(4, k)', 'p<sup>k</sup>(1−p)<sup>4−k</sup>', 'P(X = k)'], [['0', '1', '0.0625', '0.0625'], ['1', '4', '0.0625', '0.25'], ['2', '6', '0.0625', '<span class="c-g">0.375</span>'], ['3', '4', '0.0625', '0.25'], ['4', '1', '0.0625', '0.0625'], ['sum', '16', '', '1.0']])}
      <p><b>Shortcuts worth memorising:</b> mean of a binomial = <b>n · p</b>, variance = <b>n · p · (1 − p)</b>, standard deviation = √(n p (1 − p)). For 100 fair flips: mean 50, SD = √25 = 5. So 40 to 60 heads is normal; 75 heads is very suspicious.</p>
      <p><b>Where you meet it in ML:</b> a classifier's accuracy on a test set of n examples is (binomial count) ÷ n. If the true accuracy is 90% and you test on 100 examples, the number correct is Binomial(100, 0.9), with SD = 3. Seeing 87% or 93% is just noise.</p>`,
    clues: [
      '"exactly k successes out of n independent trials" → binomial pmf C(n,k) p<sup>k</sup>(1−p)<sup>n−k</sup>',
      '"at least k" or "at most k" → sum the pmf over a range, or use the complement',
      '"yes/no outcome", "click or not", "correct or not" → Bernoulli',
      '"expected number of successes" → n · p (no pmf needed)',
      '"trials until the first success" → geometric, not binomial (mean 1/p)',
      '"sampling without replacement from a small population" → hypergeometric, not binomial'
    ],
    code: [
      { lang: 'python', run: true, title: 'Binomial pmf with math.comb, checked by simulation (runnable)', code: `import math
import random

def binom_pmf(n, k, p):
    """P(exactly k successes in n independent trials with success chance p)."""
    return math.comb(n, k) * p ** k * (1 - p) ** (n - k)

n, p = 10, 0.3
print(" k   exact    simulated")
random.seed(42)
sims = 50000
counts = [0] * (n + 1)
for _ in range(sims):
    k = sum(1 for _ in range(n) if random.random() < p)   # one binomial draw
    counts[k] += 1
for k in range(n + 1):
    print(f"{k:2d}  {binom_pmf(n, k, p):.4f}   {counts[k] / sims:.4f}")

mean = sum(k * binom_pmf(n, k, p) for k in range(n + 1))
var = sum((k - mean) ** 2 * binom_pmf(n, k, p) for k in range(n + 1))
print("mean from pmf:", round(mean, 4), " n*p =", n * p)
print("variance from pmf:", round(var, 4), " n*p*(1-p) =", round(n * p * (1 - p), 4))
print("P(at least 5) =", round(sum(binom_pmf(n, k, p) for k in range(5, n + 1)), 4))` },
      { lang: 'python', check: false, title: 'SciPy equivalent (not run here)', code: `from scipy.stats import binom

print(binom.pmf(3, 10, 0.3))     # P(X = 3)
print(binom.sf(4, 10, 0.3))      # P(X >= 5)  (sf = 1 - cdf)
print(binom.mean(10, 0.3), binom.var(10, 0.3))` }
    ],
    viz: {
      title: 'Build a binomial distribution one bar at a time',
      input: '10 0.3',
      inputLabel: 'n (1–20) and p',
      gen: function (input) {
        var a = nums(input, 'n and p');
        var n = Math.floor(a[0]), p = a[1];
        if (!(n >= 1 && n <= 20)) throw new Error('n must be 1 to 20, e.g. "10 0.3"');
        if (!(p >= 0 && p <= 1)) throw new Error('p must be between 0 and 1');
        var frames = [], bars = [], labels = [], rows = [], cum = 0;
        for (var i = 0; i <= n; i++) labels.push(String(i));
        frames.push({ narr: 'Binomial(n = ' + n + ', p = ' + p + '): count successes in ' + n + ' independent tries. We will compute P(X = k) for every k using <b>C(n,k) · p<sup>k</sup> · (1−p)<sup>n−k</sup></b>.', parts: [
          { type: 'vars', vals: { n: n, p: p, 'mean n·p': r4(n * p), 'variance n·p·(1−p)': r4(n * p * (1 - p)) } },
          { type: 'code', lang: 'python', code: 'math.comb(n, k) * p**k * (1-p)**(n-k)', hl: {} }
        ] });
        var best = 0;
        for (var k = 0; k <= n; k++) {
          var c = comb(n, k), pr = c * Math.pow(p, k) * Math.pow(1 - p, n - k);
          bars.push(r4(pr)); cum += pr;
          if (pr > bars[best]) best = k;
          rows.push([k, c, r4(Math.pow(p, k) * Math.pow(1 - p, n - k)), r4(pr), r4(cum)]);
          var hl = {}; hl[k] = 'cur';
          frames.push({ narr: 'k = <b>' + k + '</b>: there are C(' + n + ',' + k + ') = <b>' + c + '</b> ways to pick which tries succeed. Each way has probability ' + p + '<sup>' + k + '</sup> · ' + r4(1 - p) + '<sup>' + (n - k) + '</sup> = ' + r4(Math.pow(p, k) * Math.pow(1 - p, n - k)) + '. Total P(X = ' + k + ') = <b>' + r4(pr) + '</b>.', parts: [
            { type: 'bars', label: 'P(X = k)', values: bars.concat(new Array(n - k).fill(0)), idxLabels: labels, hl: hl },
            { type: 'table', label: 'pmf table so far', columns: ['k', 'C(n,k)', 'one order', 'P(X=k)', 'P(X≤k)'], rows: rows.slice(-6), hl: (function () { var o = {}; o[Math.min(rows.length, 6) - 1] = 'cur'; return o; })() }
          ] });
        }
        var hb = {}; hb[best] = 'sel';
        frames.push({ narr: 'Done. The bars add up to <b>' + r4(cum) + '</b>. The tallest bar is at k = <b>' + best + '</b>, close to the mean n·p = ' + r4(n * p) + '. Spread (SD) = √(n·p·(1−p)) = ' + r4(Math.sqrt(n * p * (1 - p))) + '.', parts: [
          { type: 'bars', label: 'Binomial(' + n + ', ' + p + ') pmf', values: bars, idxLabels: labels, hl: hb },
          { type: 'vars', vals: { 'sum of bars': r4(cum), mode: best, mean: r4(n * p), SD: r4(Math.sqrt(n * p * (1 - p))) }, hl: { mode: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Exactly 3 clicks out of 10', html: `<p>Click rate p = 0.3, n = 10 showings. P(X = 3) = C(10,3) · 0.3<sup>3</sup> · 0.7<sup>7</sup> = 120 · 0.027 · 0.08235 ≈ <b>0.2668</b>. It is the single most likely count, and it matches the mean n·p = 3.</p>`, code: { lang: 'python', code: `import math\nprint(math.comb(10, 3) * 0.3**3 * 0.7**7)  # 0.2668...` } },
      { title: 'Is a model at 90% accuracy, or just lucky?', html: `<p>On 50 test questions a model scores 47 (94%). If its true accuracy were 90%, P(47 or more) = Σ<sub>k=47..50</sub> C(50,k) 0.9<sup>k</sup> 0.1<sup>50−k</sup> ≈ 0.25. A 1-in-4 chance: <b>not</b> strong evidence it beats 90%.</p>${H.table(['k', 'P(X = k)'], [['47', '0.1386'], ['48', '0.0779'], ['49', '0.0286'], ['50', '0.0052'], ['sum', '0.2503']])}` },
      { title: 'Mean and SD without the pmf', html: `<p>1,000 users each convert with p = 0.04. Expected conversions = n·p = <b>40</b>. SD = √(1000 · 0.04 · 0.96) = √38.4 ≈ <b>6.2</b>. So a day with 30 or 50 conversions is within about 1.6 SD: ordinary noise, not a trend.</p>` },
      { title: 'When binomial does NOT apply', html: `<p>You draw 5 cards from a deck and count hearts. The draws are <b>not independent</b>: after a heart, fewer hearts remain. That count is hypergeometric. Binomial is only a good approximation when the population is much bigger than the sample (say 20× or more).</p>` }
    ],
    deepDive: `<p><b>Why C(n, k) works.</b> Every specific sequence with k successes has the same probability p<sup>k</sup>(1−p)<sup>n−k</sup>, because multiplication does not care about order. So the total is (number of sequences) × (probability of one). C(n,k) = n! / (k!(n−k)!) counts the sequences.</p>
      <p><b>Numerical care.</b> For large n, p<sup>k</sup> underflows to 0.0 and C(n,k) overflows a float. Work in logs: log P = log C(n,k) + k log p + (n−k) log(1−p), using <code>math.lgamma</code> for log factorials. Libraries like SciPy do this for you. Python's <code>math.comb</code> uses exact big integers, so it never overflows, but mixing it with floats can still produce <code>OverflowError</code> when converting huge integers.</p>
      <p><b>Relatives.</b> Geometric (trials until the first success, mean 1/p), negative binomial (trials until the r-th success, also used for over-dispersed count data), Poisson (counts of rare events, the limit of binomial as n → ∞ with n·p fixed), categorical/multinomial (more than two outcomes, the distribution behind softmax outputs and LLM tokens).</p>
      <p><b>Production reality.</b> Real users are not identical coins. Some click a lot, some never. Counts then have more variance than n·p(1−p) (over-dispersion), which makes naive binomial confidence intervals too narrow. Analysts handle this by bucketing per user, using the beta-binomial, or bootstrapping by user.</p>`,
    aiEra: `<p><b>What AI changes:</b> every LLM eval is a set of Bernoulli trials: each test case passes or fails. "Model B scored 82% vs 79% on 100 questions" is two binomial counts, and the gap is well within noise (SD ≈ 4 points). <b>Use AI as a partner:</b> ask <code>Given 82/100 vs 79/100, is this difference meaningful? Show the binomial SD.</code> and check the arithmetic yourself.</p>
      <p><b>Where AI goes wrong:</b> it happily reports leaderboard differences of 0.5% on a few hundred items as "better", ignores that test items are reused across runs, and treats correlated items (ten paraphrases of the same question) as independent trials. <b>What you must still own:</b> sizing your eval set so the binomial SD is smaller than the gap you care about, and knowing that √(p(1−p)/n) is the noise floor of any accuracy number.</p>`,
    problems: [{
      title: 'Binomial Probability of Exactly k', level: 'Easy', tags: ['binomial', 'combinatorics'], companies: ['Amazon', 'Two Sigma'],
      statement: `<p>Each of <code>n</code> independent test cases passes with probability <code>p</code>. Return the probability that <b>exactly</b> <code>k</code> of them pass. Return 0 if k is outside 0..n.</p>`,
      constraints: `0 ≤ n ≤ 1000, any integer k, 0 ≤ p ≤ 1. Compared to 1e-5.`,
      example: `<p>n = 10, k = 3, p = 0.5 → C(10,3) = 120, 0.5<sup>10</sup> = 1/1024, so P = 120/1024 = ${H.c('g', '0.1171875')}.</p>`,
      brute: { why: `<p>Enumerate all 2<sup>n</sup> pass/fail patterns, keep those with exactly k passes and add their probabilities. Exponential: at n = 30 that is a billion patterns, while all of them with k passes have the <i>same</i> probability. We only need to count them.</p>`, code: `from itertools import product

def binomial_prob_brute(n, k, p):
    total = 0.0
    for pat in product([0, 1], repeat=n):
        if sum(pat) == k:
            total += p ** k * (1 - p) ** (n - k)
    return total

print(binomial_prob_brute(10, 3, 0.5))` },
      mcq: { q: 'Why multiply by C(n, k)?', options: ['To make the answer bigger than p', 'Because there are C(n, k) different orders with exactly k passes, all equally likely', 'To convert from percent to probability', 'It corrects for dependence'], answer: 1, explain: 'One particular order (say the first k pass) has probability p<sup>k</sup>(1−p)<sup>n−k</sup>. Every other order with k passes has the same probability, and there are C(n,k) of them.' },
      hints: [`<p>Any single sequence with k passes and n − k fails has probability p<sup>k</sup> · (1 − p)<sup>n − k</sup>, whatever the order.</p>`, `<p>Count the sequences with <code>math.comb(n, k)</code>, which picks which k positions are passes.</p>`, `<p>Guard k &lt; 0 or k &gt; n → return 0.0. Note 0 ** 0 is 1 in Python, so n = 0, k = 0 correctly gives 1. Recipe: comb · p**k · (1−p)**(n−k).</p>`],
      solution: {
        approach: `<p>Apply the binomial pmf directly: count the arrangements with <code>math.comb</code> and multiply by the probability of one arrangement. Handle k out of range first.</p>`,
        code: `import math

def binomial_prob(n, k, p):
    if k < 0 or k > n:
        return 0.0                       # impossible count
    ways = math.comb(n, k)               # which k of the n trials succeed
    one_order = p ** k * (1 - p) ** (n - k)
    return ways * one_order`,
        dry: { head: ['n, k, p', 'C(n,k)', 'one order', 'answer'], rows: [['10, 3, 0.5', '120', '0.000977', '<span class="c-g">0.1172</span>'], ['5, 0, 0.2', '1', '0.32768', '0.3277'], ['6, 7, 0.5', '—', '—', '0 (k &gt; n)']] },
        complexity: `<p>O(k) for <code>math.comb</code> on small numbers, O(1) extra space.</p>`,
        followUps: ['Compute P(X ≥ k) without summing many terms when n is huge (normal approximation, practice set).', 'Make it stable for n = 10<sup>6</sup> using <code>math.lgamma</code> and logs.']
      },
      tests: { sig: 'int int double -> double', fn: 'binomial_prob', cmp: 'float', cases: [[[10, 3, 0.5], 0.1171875], [[5, 0, 0.2], 0.32768], [[5, 5, 0.2], 0.00032], [[20, 10, 0.5], 0.17619705200195312], [[1, 1, 0.3], 0.3], [[6, 7, 0.5], 0.0], [[12, 2, 0.1], 0.2301277704660001], [[0, 0, 0.4], 1.0]] }
    }]
  });

  /* =====================================================================
     TOPIC 3 — Expectation and variance
     ===================================================================== */
  topics.push({
    title: 'Expectation & Variance (and Sample vs Population)',
    analogy: `<p>Two pizza shops both deliver in <b>30 minutes on average</b>. Shop A is always 28 to 32 minutes. Shop B is sometimes 10, sometimes 50. Same <b>expectation</b> (average), very different <b>variance</b> (spread). When you are hungry, you care about both numbers.</p>`,
    explain: `<p>The <b>expected value</b> E[X] is the long-run average of a random variable. Multiply each value by its probability and add them up:</p>
      <p style="text-align:center"><b>E[X] = Σ x · P(X = x)</b></p>
      <p><b>Worked example: a dice game.</b> You pay ₹4 to roll a die and win the number shown in rupees. E[winnings] = (1+2+3+4+5+6) · 1/6 = 21/6 = 3.5. Your expected profit is 3.5 − 4 = <b>−₹0.50 per game</b>. Play 1,000 times and expect to lose about ₹500.</p>
      ${H.table(['x', 'P(x)', 'x · P(x)', 'x − 3.5', '(x − 3.5)<sup>2</sup> · P(x)'], [['1', '1/6', '0.167', '−2.5', '1.042'], ['2', '1/6', '0.333', '−1.5', '0.375'], ['3', '1/6', '0.500', '−0.5', '0.042'], ['4', '1/6', '0.667', '0.5', '0.042'], ['5', '1/6', '0.833', '1.5', '0.375'], ['6', '1/6', '1.000', '2.5', '1.042'], ['sum', '1', '<span class="c-g">3.5 = E[X]</span>', '', '<span class="c-b">2.917 = Var(X)</span>']])}
      <p>The <b>variance</b> measures spread: the average squared distance from the mean.</p>
      <p style="text-align:center"><b>Var(X) = E[(X − μ)<sup>2</sup>] = E[X<sup>2</sup>] − (E[X])<sup>2</sup></b></p>
      <p>We square so that distances above and below the mean do not cancel. The <b>standard deviation</b> SD = √Var brings the units back to normal (rupees, not rupees²). For the die: SD = √2.917 ≈ 1.71.</p>
      <p><b>Rules that save time:</b></p>
      ${H.table(['rule', 'example'], [
        ['E[aX + b] = a · E[X] + b', 'double the prize and add ₹1: E = 2 · 3.5 + 1 = 8'],
        ['E[X + Y] = E[X] + E[Y] (always, even if dependent)', 'two dice: 3.5 + 3.5 = 7'],
        ['Var(aX + b) = a<sup>2</sup> · Var(X)', 'double the prize: variance × 4; adding ₹1 changes nothing'],
        ['Var(X + Y) = Var(X) + Var(Y) <b>if independent</b>', 'two dice: 2.917 + 2.917 = 5.833'],
        ['Var(X + Y) = Var(X) + Var(Y) + 2 Cov(X, Y) in general', 'correlated stocks: spread is bigger than the sum']
      ])}
      <p><b>Sample vs population variance (classic trap).</b> If you have the <i>whole population</i>, divide by <b>n</b>. If you have a <i>sample</i> and want to estimate the population's variance, divide by <b>n − 1</b> (Bessel's correction). The sample mean is fitted to the same data, so deviations from it are a little too small; dividing by n − 1 fixes that bias. In Python: <code>statistics.pvariance</code> divides by n, <code>statistics.variance</code> divides by n − 1. NumPy's <code>np.var</code> divides by n by default (<code>ddof=0</code>), pandas' <code>.var()</code> divides by n − 1. Same data, different answers!</p>
      ${H.table(['data 2, 4, 4, 4, 5, 5, 7, 9', 'value'], [['mean', '5'], ['sum of squared deviations', '32'], ['population variance (÷ 8)', '4.0, SD 2.0'], ['sample variance (÷ 7)', '4.571, SD 2.138']])}`,
    clues: [
      '"expected value", "on average", "long-run profit" → Σ x · P(x)',
      '"fair game" → expected profit is exactly 0',
      '"expected number of ..." with many parts → linearity of expectation: add expectations of indicator variables',
      '"variance of a sum" → add variances only if independent; otherwise include 2·Cov',
      '"unbiased estimate of the variance from a sample" → divide by n − 1',
      '"ddof", "np.var vs pandas var" → population vs sample convention'
    ],
    code: [
      { lang: 'python', run: true, title: 'Expectation, variance and n vs n − 1 (runnable)', code: `import random
import statistics

# 1) Expected value and variance of a fair die, straight from the definition
values = [1, 2, 3, 4, 5, 6]
probs = [1 / 6] * 6
ev = sum(x * p for x, p in zip(values, probs))
var = sum((x - ev) ** 2 * p for x, p in zip(values, probs))
print("E[die] =", round(ev, 4), " Var =", round(var, 4), " SD =", round(var ** 0.5, 4))

# 2) Variance of a sum of two independent dice = sum of variances
random.seed(1)
rolls = [random.randint(1, 6) + random.randint(1, 6) for _ in range(100000)]
print("simulated Var(two dice):", round(statistics.pvariance(rolls), 3), " theory:", round(2 * var, 3))

# 3) Sample vs population variance
data = [2, 4, 4, 4, 5, 5, 7, 9]
print("pvariance (divide by n):    ", statistics.pvariance(data))
print("variance  (divide by n - 1):", round(statistics.variance(data), 4))

# 4) Why n - 1? Average many small-sample estimates of a known variance.
true_var = var                  # die variance 2.9167
est_n, est_n1 = [], []
for _ in range(20000):
    s = [random.randint(1, 6) for _ in range(5)]
    est_n.append(statistics.pvariance(s))
    est_n1.append(statistics.variance(s))
print("true:", round(true_var, 3), " avg of /n:", round(statistics.mean(est_n), 3),
      " avg of /(n-1):", round(statistics.mean(est_n1), 3))` },
      { lang: 'python', check: false, title: 'NumPy / pandas defaults (not run here)', code: `import numpy as np
import pandas as pd

x = np.array([2, 4, 4, 4, 5, 5, 7, 9])
print(np.var(x))            # 4.0     (ddof=0, population)
print(np.var(x, ddof=1))    # 4.571   (sample)
print(pd.Series(x).var())   # 4.571   (pandas default ddof=1)` }
    ],
    viz: {
      title: 'Mean, deviations and variance step by step',
      input: '2 4 4 4 5 5 7 9',
      inputLabel: 'Data values (2–14 numbers)',
      gen: function (input) {
        var a = nums(input, 'data values');
        if (a.length < 2 || a.length > 14) throw new Error('Use 2 to 14 numbers');
        var n = a.length, frames = [], sum = 0, i;
        for (i = 0; i < n; i++) {
          sum += a[i];
          var h = {}; h[i] = 'cur';
          frames.push({ narr: 'Add value ' + (i + 1) + ' of ' + n + ': running sum = <b>' + r4(sum) + '</b>.', parts: [
            { type: 'array', label: 'data', values: a, hl: h },
            { type: 'vars', vals: { 'running sum': r4(sum), count: i + 1 } }
          ] });
        }
        var mean = sum / n;
        frames.push({ narr: 'Mean μ = sum ÷ n = ' + r4(sum) + ' ÷ ' + n + ' = <b>' + r4(mean) + '</b>. This is the expected value if every data point is equally likely.', parts: [
          { type: 'array', label: 'data', values: a },
          { type: 'vars', vals: { sum: r4(sum), n: n, 'mean μ': r4(mean) }, hl: { 'mean μ': 'sel' } }
        ] });
        var dev = a.map(function (x) { return r4(x - mean); });
        frames.push({ narr: 'Deviations x − μ. Some are negative, some positive, and they always add up to 0. That is why we cannot just average them.', parts: [
          { type: 'bars', label: 'deviation x − μ', values: dev, texts: dev.map(String) },
          { type: 'vars', vals: { 'sum of deviations': r4(dev.reduce(function (s, d) { return s + d; }, 0)) }, hl: { 'sum of deviations': 'bad' } }
        ] });
        var sq = a.map(function (x) { return r4((x - mean) * (x - mean)); });
        var ss = sq.reduce(function (s, d) { return s + d; }, 0);
        frames.push({ narr: 'Square each deviation so nothing cancels. Far-away points count a lot more (a deviation of 4 becomes 16).', parts: [
          { type: 'bars', label: '(x − μ)²', values: sq, texts: sq.map(String) },
          { type: 'vars', vals: { 'sum of squares SS': r4(ss) }, hl: { 'sum of squares SS': 'cur' } }
        ] });
        frames.push({ narr: '<b>Population</b> variance: SS ÷ n = ' + r4(ss) + ' ÷ ' + n + ' = <b>' + r4(ss / n) + '</b> (SD ' + r4(Math.sqrt(ss / n)) + '). Use this when the data IS the whole population.', parts: [
          { type: 'table', columns: ['quantity', 'formula', 'value'], rows: [['population variance σ²', 'SS / n', r4(ss / n)], ['population SD σ', '√(SS / n)', r4(Math.sqrt(ss / n))]], hl: { 0: 'ok' } }
        ] });
        frames.push({ narr: '<b>Sample</b> variance: SS ÷ (n − 1) = ' + r4(ss) + ' ÷ ' + (n - 1) + ' = <b>' + r4(ss / (n - 1)) + '</b>. Use this when the data is a sample and you want to estimate the bigger population. The mean was fitted to these same points, so SS is slightly too small; n − 1 corrects it.', parts: [
          { type: 'table', columns: ['quantity', 'Python', 'value'], rows: [['divide by n', 'statistics.pvariance / np.var', r4(ss / n)], ['divide by n − 1', 'statistics.variance / pandas .var()', r4(ss / (n - 1))]], hl: { 1: 'sel' } },
          { type: 'text', html: 'Gap between them: ' + r4(ss / (n - 1) - ss / n) + '. It shrinks as n grows, so it matters most for small samples.' }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Is this lottery worth it?', html: `<p>Ticket costs ₹100. Win ₹10,000 with probability 0.005, ₹500 with probability 0.05, else nothing. E[prize] = 10000·0.005 + 500·0.05 = 50 + 25 = ₹75. Expected profit = 75 − 100 = <b>−₹25</b> per ticket.</p>` },
      { title: 'Linearity: expected fixed points', html: `<p>Shuffle 10 name tags and hand them out at random. Expected number of people who get their own tag? Let I<sub>i</sub> = 1 if person i gets their own tag; E[I<sub>i</sub>] = 1/10. By linearity E[total] = 10 · 1/10 = <b>1</b>. The I<sub>i</sub> are dependent, but linearity does not care.</p>` },
      { title: 'Variance of an ensemble', html: `<p>Three independent models each have error variance 9. You average them: Var((X+Y+Z)/3) = (9+9+9)/9 = <b>3</b>. Averaging k independent noisy guesses divides variance by k. If the models are correlated (trained on the same data), the drop is smaller, which is why ensembles want diverse members.</p>${H.table(['models averaged', 'variance if independent'], [['1', '9'], ['3', '3'], ['9', '1']])}` },
      { title: 'np.var vs df.var surprise', html: `<p>A teammate reports variance 4.0, you report 4.571 for the same column. Nobody is wrong: one divided by n (NumPy default), one by n − 1 (pandas default). Always say which one you mean.</p>`, code: { lang: 'python', code: `import statistics\nd = [2, 4, 4, 4, 5, 5, 7, 9]\nprint(statistics.pvariance(d), statistics.variance(d))` } }
    ],
    deepDive: `<p><b>Why n − 1, exactly.</b> E[Σ(x<sub>i</sub> − x̄)<sup>2</sup>] = (n − 1)σ<sup>2</sup>, because x̄ uses up one "degree of freedom": once you know the mean and n − 1 deviations, the last deviation is fixed. Note the n − 1 version is unbiased for the <i>variance</i>, but its square root is still slightly biased for the SD. With large n the difference is negligible.</p>
      <p><b>Covariance and correlation.</b> Cov(X,Y) = E[(X − μ<sub>X</sub>)(Y − μ<sub>Y</sub>)]. Correlation ρ = Cov / (σ<sub>X</sub> σ<sub>Y</sub>) lies in [−1, 1] and only measures <i>linear</i> association. ρ = 0 does not mean independent (Y = X<sup>2</sup> with symmetric X has ρ = 0). For k variables, Var(Σ w<sub>i</sub>X<sub>i</sub>) = w<sup>T</sup> Σ w where Σ is the covariance matrix, which is where linear algebra meets statistics.</p>
      <p><b>Numerical stability.</b> The "E[X<sup>2</sup>] − (E[X])<sup>2</sup>" formula suffers catastrophic cancellation when values are large and close together (timestamps, prices). Use two passes, or Welford's online algorithm, which updates mean and SS one value at a time and is what streaming metrics systems use.</p>
      <p><b>Expectation is not "typical".</b> Heavy-tailed quantities (revenue per user, request latency) have means dominated by a few huge values. Report medians and percentiles (p50, p95, p99) alongside means. Some distributions have infinite variance, which breaks the √n rules you rely on later.</p>`,
    aiEra: `<p><b>What AI changes:</b> metric dashboards and AI analysts compute means and variances for you, but they pick conventions silently. <b>Use AI as a partner:</b> ask <code>Which variance convention (ddof) did you use and why?</code> and <code>Is this metric heavy-tailed? Show p50/p95 too.</code></p>
      <p><b>Where AI goes wrong:</b> mixing n and n − 1 between steps, adding variances of correlated quantities (daily metrics from the same users, multiple samples from one LLM on the same prompt), and claiming "E[X·Y] = E[X]·E[Y]" without independence. <b>What you must still own:</b> knowing that LLM eval scores averaged over repeated samples of the <i>same</i> prompt are correlated, so the variance of the mean does not shrink like 1/n. Expected value thinking also drives cost planning: expected tokens per request × price × requests per day is the bill you will actually get.</p>`,
    problems: [{
      title: 'Expected Value of a Game', level: 'Easy', tags: ['expectation'], companies: ['Jane Street', 'Citadel'],
      statement: `<p>A game pays <code>values[i]</code> with probability <code>probs[i]</code> (values can be negative, meaning you lose money). The probabilities add up to 1. Return the expected payout.</p>`,
      constraints: `1 ≤ len ≤ 10<sup>5</sup>, same length lists, probs sum to 1. Compared to 1e-5.`,
      example: `<p>values = [10, −1], probs = [0.1, 0.9] → 10·0.1 + (−1)·0.9 = 1 − 0.9 = ${H.c('g', '0.1')}. On average you win 10 paise per play.</p>`,
      brute: { why: `<p>Simulate a million plays and average the payout. It converges slowly (error ∝ 1/√n), depends on the seed, and still is not exact. The exact answer is one weighted sum.</p>`, code: `import random

def expected_value_sim(values, probs, n=200000, seed=0):
    rng = random.Random(seed)
    total = 0.0
    for _ in range(n):
        total += rng.choices(values, weights=probs)[0]
    return total / n

print(expected_value_sim([10, -1], [0.1, 0.9]))` },
      mcq: { q: 'A fair game is one where...', options: ['You win half the time', 'Expected profit is 0', 'Variance is 0', 'The biggest prize equals the cost'], answer: 1, explain: 'Winning half the time is not enough: a game where you win ₹1 half the time and lose ₹10 half the time has E = −4.5. Fair means E[profit] = 0.' },
      hints: [`<p>The expected value is a probability-weighted average, not a plain average of the values.</p>`, `<p>Pair each value with its probability using <code>zip</code> and add up value × probability.</p>`, `<p>Negative values just reduce the total. No special cases needed if the inputs are valid. Recipe: sum(v * p for v, p in zip(values, probs)).</p>`],
      solution: {
        approach: `<p>Use the definition E[X] = Σ x · P(x): one pass multiplying each payout by its probability.</p>`,
        code: `def expected_value(values, probs):
    total = 0.0
    for v, p in zip(values, probs):
        total += v * p          # each outcome contributes value x chance
    return total`,
        dry: { head: ['value', 'prob', 'v · p', 'running total'], rows: [['100', '0.2', '20', '20'], ['0', '0.5', '0', '20'], ['−50', '0.3', '−15', '<span class="c-g">5</span>']] },
        complexity: `<p>O(n) time, O(1) space.</p>`,
        followUps: ['Return the variance of the payout too: Σ p · (v − E)<sup>2</sup>.', 'What entry fee makes the game fair? (fee = E[payout])']
      },
      tests: { sig: 'double[] double[] -> double', fn: 'expected_value', cmp: 'float', cases: [[[[1, 2, 3, 4, 5, 6], [0.16666666666666666, 0.16666666666666666, 0.16666666666666666, 0.16666666666666666, 0.16666666666666666, 0.16666666666666666]], 3.5], [[[10, -1], [0.1, 0.9]], 0.1], [[[0], [1.0]], 0.0], [[[100, 0, -50], [0.2, 0.5, 0.3]], 5.0], [[[5, 5], [0.5, 0.5]], 5.0], [[[-2, 3], [0.4, 0.6]], 1.0]] }
    }]
  });

  /* =====================================================================
     TOPIC 4 — Normal distribution, z-scores, central limit theorem
     ===================================================================== */
  topics.push({
    title: 'Distributions II: The Normal Curve, z-Scores & the Central Limit Theorem',
    analogy: `<p>Pour a bag of sand through a funnel onto a table. Each grain bounces left or right a bit at random. The pile that forms is a smooth <b>hill</b>: tallest in the middle, thinning out on both sides. Many small random pushes added together always make this same hill shape. That hill is the <b>normal</b> (bell) curve.</p>`,
    explain: `<p>The <b>normal distribution</b> N(μ, σ) is a continuous, symmetric bell curve. Two numbers describe it completely: the <b>mean μ</b> (where the peak is) and the <b>standard deviation σ</b> (how wide it is). Heights, measurement errors, test scores and the average of many random things are all close to normal.</p>
      <p><b>The 68–95–99.7 rule</b> is the one thing to memorise:</p>
      ${H.table(['range', 'share of values inside', 'example: IQ, μ = 100, σ = 15'], [['μ ± 1σ', '≈ 68%', '85 to 115'], ['μ ± 2σ', '≈ 95%', '70 to 130'], ['μ ± 3σ', '≈ 99.7%', '55 to 145']])}
      <p><b>z-score.</b> To compare values from different normal curves, measure "how many SDs from the mean":</p>
      <p style="text-align:center"><b>z = (x − μ) / σ</b></p>
      <p>An IQ of 130 has z = (130 − 100)/15 = <b>2</b>. The <b>percentile</b> is the share of the curve to the left of x, written Φ(z) (the standard normal CDF). Φ(2) ≈ 0.977, so 130 beats about 97.7% of people. In Python: <code>statistics.NormalDist().cdf(2)</code>.</p>
      ${H.table(['z', 'Φ(z) = percentile', 'meaning'], [['−2', '0.023', 'bottom 2.3%'], ['−1', '0.159', ''], ['0', '0.500', 'exactly average'], ['1', '0.841', ''], ['1.645', '0.950', 'one-sided 5% cut-off'], ['1.96', '0.975', 'two-sided 5% cut-off (95% CI)'], ['2.576', '0.995', 'two-sided 1% cut-off']])}
      <p><b>Central limit theorem (CLT).</b> Take the <b>average</b> of n independent draws from <i>almost any</i> distribution (dice, clicks, latencies). As n grows, the distribution of that average becomes normal, centred on the true mean μ, with SD <b>σ/√n</b>. This SD of an average is called the <b>standard error (SE)</b>. The CLT is why confidence intervals and A/B tests can use the normal curve even when single data points look nothing like a bell.</p>
      <p><b>Normal approximation to the binomial.</b> A binomial count is a sum of n Bernoulli trials, so for large n it is roughly N(np, √(np(1−p))). Rule of thumb: works when np ≥ 10 and n(1−p) ≥ 10. Add a <b>continuity correction</b> of 0.5 because you are covering whole numbers with a smooth curve: P(X ≥ 60) ≈ P(Normal &gt; 59.5).</p>
      <p><b>Worked example.</b> 100 fair coin flips: μ = 50, σ = 5. P(X ≥ 60) ≈ 1 − Φ((59.5 − 50)/5) = 1 − Φ(1.9) ≈ 0.0287. The exact binomial answer is 0.0284. Very close.</p>`,
    clues: [
      '"how unusual is this value", "standard deviations away" → z-score',
      '"percentile", "what fraction scored below" → Φ(z) = NormalDist().cdf',
      '"average of many independent things" → CLT, SE = σ/√n',
      '"binomial with large n" → normal approximation with continuity correction',
      '"top 5% cut-off" → inverse CDF, NormalDist().inv_cdf(0.95) ≈ 1.645',
      '"outlier detection with 3 sigma" → |z| &gt; 3 (only sensible if roughly normal)'
    ],
    code: [
      { lang: 'python', run: true, title: 'z-scores, percentiles, CLT and a normal approximation (runnable)', code: `import math
import random
import statistics
from statistics import NormalDist

std = NormalDist()                 # mean 0, SD 1
iq = NormalDist(mu=100, sigma=15)

# z-score and percentile
x = 130
z = (x - iq.mean) / iq.stdev
print("z for IQ 130:", z, " percentile:", round(std.cdf(z), 4), "=", round(iq.cdf(130), 4))
print("cut-off for top 5%:", round(iq.inv_cdf(0.95), 2))

# 68-95-99.7 rule
for k in (1, 2, 3):
    print(f"within +/-{k} SD: {std.cdf(k) - std.cdf(-k):.4f}")

# Central limit theorem: averages of 30 dice look normal with SD sigma/sqrt(n)
random.seed(3)
n = 30
means = [statistics.mean(random.randint(1, 6) for _ in range(n)) for _ in range(5000)]
sigma_die = math.sqrt(35 / 12)
print("SD of sample means:", round(statistics.stdev(means), 4), " theory sigma/sqrt(n):", round(sigma_die / math.sqrt(n), 4))

# Normal approximation to Binomial(100, 0.5): P(X >= 60)
n, p, k = 100, 0.5, 60
exact = sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(k, n + 1))
approx = 1 - NormalDist(n * p, math.sqrt(n * p * (1 - p))).cdf(k - 0.5)   # continuity correction
print("exact:", round(exact, 5), " normal approx:", round(approx, 5))` },
      { lang: 'python', check: false, title: 'SciPy equivalent (not run here)', code: `from scipy.stats import norm, binom

print(norm.cdf(2))              # 0.9772
print(norm.ppf(0.975))          # 1.95996  (inverse CDF)
print(norm(100, 15).sf(130))    # P(IQ > 130)
print(binom.sf(59, 100, 0.5))   # exact P(X >= 60)` }
    ],
    viz: [{
      title: 'Bell curve: the 68–95–99.7 rule and your percentile',
      input: '100 15 130',
      inputLabel: 'mean μ, SD σ, value x',
      gen: function (input) {
        var a = nums(input, 'μ, σ and x');
        var mu = a[0], sd = a[1], x = a[2];
        if (!(sd > 0)) throw new Error('σ must be positive, e.g. "100 15 130"');
        if (isNaN(x)) throw new Error('Give three numbers: μ σ x');
        var B = 29, lo = mu - 3.5 * sd, w = 7 * sd / B, vals = [], labs = [];
        for (var i = 0; i < B; i++) { var c = lo + (i + 0.5) * w, zz = (c - mu) / sd; vals.push(r4(Math.exp(-zz * zz / 2) / (sd * Math.sqrt(2 * Math.PI)) * w * 100)); labs.push(i % 4 === 2 ? String(Math.round(c * 10) / 10) : ''); }
        function band(k, cls) { var o = {}; for (var i = 0; i < B; i++) { var c = lo + (i + 0.5) * w; if (Math.abs(c - mu) <= k * sd) o[i] = cls; } return o; }
        var frames = [];
        frames.push({ narr: 'N(μ = ' + mu + ', σ = ' + sd + '). Each bar is the % of values in a small slice. The peak sits at the mean; the curve is symmetric.', parts: [{ type: 'bars', label: '% of values per slice', values: vals, idxLabels: labs }, { type: 'vars', vals: { 'μ': mu, 'σ': sd } }] });
        frames.push({ narr: 'Within <b>μ ± 1σ</b> (' + r4(mu - sd) + ' to ' + r4(mu + sd) + ') lies about <b>68%</b> of all values.', parts: [{ type: 'bars', label: '±1σ', values: vals, idxLabels: labs, hl: band(1, 'win') }, { type: 'vars', vals: { share: r4(phi(1) - phi(-1)) } }] });
        frames.push({ narr: 'Within <b>μ ± 2σ</b> (' + r4(mu - 2 * sd) + ' to ' + r4(mu + 2 * sd) + ') lies about <b>95%</b>. Exactly 95% needs ±1.96σ, the number behind every 95% confidence interval.', parts: [{ type: 'bars', label: '±2σ', values: vals, idxLabels: labs, hl: band(2, 'win') }, { type: 'vars', vals: { share: r4(phi(2) - phi(-2)) } }] });
        frames.push({ narr: 'Within <b>μ ± 3σ</b> lies <b>99.7%</b>. Values beyond 3σ happen about 3 times in 1,000 — rare for a true normal, common for heavy-tailed real data.', parts: [{ type: 'bars', label: '±3σ', values: vals, idxLabels: labs, hl: band(3, 'win') }, { type: 'vars', vals: { share: r4(phi(3) - phi(-3)) } }] });
        var z = (x - mu) / sd, pct = phi(z), left = {};
        for (var j = 0; j < B; j++) { if (lo + (j + 0.5) * w <= x) left[j] = 'ok'; }
        frames.push({ narr: 'Your value x = <b>' + x + '</b>. z = (x − μ)/σ = (' + x + ' − ' + mu + ')/' + sd + ' = <b>' + r4(z) + '</b>: it sits ' + r4(Math.abs(z)) + ' SDs ' + (z >= 0 ? 'above' : 'below') + ' the mean.', parts: [{ type: 'bars', label: 'curve', values: vals, idxLabels: labs }, { type: 'vars', vals: { x: x, z: r4(z) }, hl: { z: 'cur' } }] });
        frames.push({ narr: 'Percentile = area to the left of x = Φ(' + r4(z) + ') = <b>' + r4(pct) + '</b>. So x beats about ' + r4(pct * 100) + '% of values; ' + r4((1 - pct) * 100) + '% are higher.' + (Math.abs(z) > 3 ? ' <span class="c-r">|z| &gt; 3: a classic outlier flag.</span>' : ''), parts: [{ type: 'bars', label: 'shaded = below x', values: vals, idxLabels: labs, hl: left }, { type: 'vars', vals: { z: r4(z), 'Φ(z)': r4(pct), 'P(X > x)': r4(1 - pct) }, hl: { 'Φ(z)': 'sel' } }, { type: 'code', lang: 'python', code: 'from statistics import NormalDist\nz = (x - mu) / sigma\npct = NormalDist().cdf(z)', hl: { 2: 'cur', 3: 'ok' } }] });
        return frames;
      }
    }, {
      title: 'Central limit theorem: averages of dice become a bell',
      input: '7',
      inputLabel: 'seed',
      gen: function (input) {
        var seed = Math.floor(Number(String(input).trim() || 7));
        if (isNaN(seed)) throw new Error('Enter an integer seed, e.g. 7');
        var rnd = makeRng(seed), frames = [], sizes = [1, 2, 5, 10, 30];
        frames.push({ narr: 'A single die is <b>flat</b>, not bell-shaped: each face has probability 1/6. Mean 3.5, SD 1.708. Now we average n dice, 2,000 times, for growing n.', parts: [{ type: 'bars', label: 'one die: P(face)', values: [16.7, 16.7, 16.7, 16.7, 16.7, 16.7], idxLabels: ['1', '2', '3', '4', '5', '6'] }] });
        sizes.forEach(function (n) {
          var bins = new Array(11).fill(0), all = [];
          for (var s = 0; s < 2000; s++) { var t = 0; for (var k = 0; k < n; k++) t += 1 + Math.floor(rnd() * 6); var m = t / n; all.push(m); var b = Math.min(10, Math.max(0, Math.round((m - 1) * 2))); bins[b]++; }
          var mean = all.reduce(function (x, y) { return x + y; }, 0) / all.length;
          var sdv = Math.sqrt(all.reduce(function (x, y) { return x + (y - mean) * (y - mean); }, 0) / (all.length - 1));
          frames.push({ narr: 'Average of <b>n = ' + n + '</b> dice: the histogram ' + (n === 1 ? 'is still flat.' : n < 10 ? 'already bulges in the middle.' : 'is a clear bell centred at 3.5.') + ' Measured SD of averages = <b>' + r4(sdv) + '</b>; theory σ/√n = 1.708/√' + n + ' = <b>' + r4(1.7078 / Math.sqrt(n)) + '</b>.', parts: [
            { type: 'bars', label: 'count of averages (bins of 0.5)', values: bins, idxLabels: ['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5.5', '6'], hl: { 5: 'sel' } },
            { type: 'vars', vals: { n: n, 'mean of averages': r4(mean), 'SD measured': r4(sdv), 'σ/√n': r4(1.7078 / Math.sqrt(n)) } }
          ] });
        });
        return frames;
      }
    }],
    examples: [
      { title: 'Compare two exam scores', html: `<p>Asha scored 85 in maths (class μ = 70, σ = 10). Ben scored 80 in physics (μ = 60, σ = 8). z<sub>Asha</sub> = 1.5, z<sub>Ben</sub> = 2.5. Ben did relatively better: percentile 99.4% vs 93.3%.</p>${H.table(['student', 'z', 'percentile Φ(z)'], [['Asha', '1.5', '0.933'], ['Ben', '2.5', '0.994']])}` },
      { title: 'Latency SLO with a normal model', html: `<p>Latency ≈ N(120 ms, 20 ms). What fraction of requests exceed 160 ms? z = 2, so 1 − Φ(2) ≈ <b>2.3%</b>. Warning: real latency has a long right tail, so the true share is usually higher. Check real percentiles.</p>`, code: { lang: 'python', code: `from statistics import NormalDist\nprint(1 - NormalDist(120, 20).cdf(160))  # 0.0228` } },
      { title: 'Standard error of an average', html: `<p>Session length has σ = 12 minutes. With n = 144 users, the SE of the average is 12/√144 = <b>1 minute</b>. With 4× more users (576), SE halves to 0.5. Precision costs a square: to halve the error, quadruple the data.</p>` },
      { title: 'Normal approximation check', html: `<p>Binomial(50, 0.5), P(X ≥ 30). Exact = 0.1013. Normal with continuity correction: 1 − Φ((29.5 − 25)/3.536) = 1 − Φ(1.273) = 0.1015. Without correction, 1 − Φ(1.414) = 0.0786, a big miss. The 0.5 matters.</p>` }
    ],
    deepDive: `<p><b>The formula.</b> The normal density is f(x) = (1/(σ√(2π))) · e<sup>−(x−μ)<sup>2</sup>/(2σ<sup>2</sup>)</sup>. Φ has no closed form; libraries compute it from the error function: Φ(z) = ½(1 + erf(z/√2)). Python has <code>math.erf</code> and <code>statistics.NormalDist</code> (since 3.8) with <code>cdf</code>, <code>inv_cdf</code>, <code>pdf</code> and even <code>overlap</code>.</p>
      <p><b>CLT conditions.</b> Needs independent draws with finite variance. Convergence is fast for symmetric data (n ≈ 10–30 is enough for dice) and slow for skewed data (revenue, with many zeros and a few whales, can need thousands). Berry–Esseen bounds the error by a constant × skewness/√n. Without finite variance (Cauchy, some power laws), averages never become normal.</p>
      <p><b>Why normal appears in ML.</b> Weight initialisation (Xavier/He use normal or uniform with variance 1/fan-in or 2/fan-in so activations neither explode nor vanish), Gaussian noise in diffusion models, L2 regularisation (it equals a Gaussian prior on weights), MSE loss (it equals maximum likelihood with Gaussian errors), and the reparameterisation trick in VAEs (z = μ + σ·ε, ε ~ N(0,1)).</p>
      <p><b>Multivariate normal.</b> In d dimensions it is described by a mean vector and a covariance matrix Σ. Its contours are ellipses whose axes are the eigenvectors of Σ, which is exactly what PCA finds.</p>`,
    aiEra: `<p><b>What AI changes:</b> z-scores are the first tool for anomaly detection on LLM metrics: token usage per request, latency, refusal rate. An assistant can set up "alert when |z| &gt; 3" in minutes. <b>Use AI as a partner:</b> ask it to plot the real distribution first, then <code>Is a normal model reasonable here, or should I use percentiles?</code></p>
      <p><b>Where AI goes wrong:</b> it applies 3-sigma rules to heavy-tailed data (latency, cost per request), so alerts fire constantly or never; it forgets that z uses the SD of the <i>population</i> of values, not the SE of the mean; it skips the continuity correction. <b>What you must still own:</b> knowing that the CLT is about <b>averages</b>, not individual values, which is why A/B tests on averages work while single-request alerts need percentiles.</p>`,
    problems: [{
      title: 'z-Score and Percentile', level: 'Easy', tags: ['normal', 'z-score'], companies: ['Microsoft', 'Uber'],
      statement: `<p>A metric is normally distributed with mean <code>mu</code> and SD <code>sigma</code>. For a value <code>x</code>, return a list <code>[z, percentile]</code> where z = (x − mu)/sigma and percentile = P(X ≤ x) as a fraction (0 to 1). Use <code>statistics.NormalDist</code>.</p>`,
      constraints: `sigma &gt; 0. Compared to 1e-5.`,
      example: `<p>x = 130, mu = 100, sigma = 15 → z = 30/15 = 2, Φ(2) = ${H.c('g', '0.97725')}. Output <b>[2.0, 0.97725]</b>.</p>`,
      brute: { why: `<p>Approximate the area under the bell curve by adding thin rectangles from far left up to z. It works, but you must choose a step size and a left limit, and accuracy costs many steps. <code>NormalDist().cdf</code> computes it exactly via the error function.</p>`, code: `import math

def z_percentile_brute(x, mu, sigma, steps=200000):
    z = (x - mu) / sigma
    lo = -10.0
    h = (z - lo) / steps
    area = 0.0
    for i in range(steps):
        t = lo + (i + 0.5) * h
        area += math.exp(-t * t / 2) / math.sqrt(2 * math.pi) * h
    return [z, area]

print(z_percentile_brute(130, 100, 15))` },
      mcq: { q: 'A value has z = −1. Roughly what percentile is it?', options: ['16%', '34%', '50%', '84%'], answer: 0, explain: '68% lie within ±1 SD, so 32% lie outside, split equally: 16% below −1. Φ(−1) ≈ 0.159.' },
      hints: [`<p>The z-score just re-measures x in units of SD away from the mean.</p>`, `<p><code>statistics.NormalDist()</code> is the standard normal; its <code>.cdf(z)</code> is the share of values at or below z.</p>`, `<p>Return a list of two floats. Same result as <code>NormalDist(mu, sigma).cdf(x)</code>. Recipe: z = (x − mu)/sigma; return [z, NormalDist().cdf(z)].</p>`],
      solution: {
        approach: `<p>Standardise, then look up the standard normal CDF. NormalDist's <code>cdf</code> uses the error function internally, so it is accurate to about 1e-15.</p>`,
        code: `from statistics import NormalDist

def z_percentile(x, mu, sigma):
    z = (x - mu) / sigma                 # how many SDs from the mean
    percentile = NormalDist().cdf(z)     # area to the left of z
    return [z, percentile]`,
        dry: { head: ['x, μ, σ', 'z', 'Φ(z)'], rows: [['130, 100, 15', '2', '<span class="c-g">0.9772</span>'], ['70, 100, 15', '−2', '0.0228'], ['85, 70, 10', '1.5', '0.9332']] },
        complexity: `<p>O(1) time and space.</p>`,
        followUps: ['Return the value at a given percentile instead (use <code>inv_cdf</code>).', 'What is P(a ≤ X ≤ b)? (cdf(b) − cdf(a))']
      },
      tests: { sig: 'double double double -> double[]', fn: 'z_percentile', cmp: 'float', cases: [[[130, 100, 15], [2.0, 0.9772498680518208]], [[100, 100, 15], [0.0, 0.5]], [[70, 100, 15], [-2.0, 0.02275013194817921]], [[1.96, 0, 1], [1.96, 0.9750021048517796]], [[85, 70, 10], [1.5, 0.9331927987311419]], [[50, 60, 5], [-2.0, 0.02275013194817921]], [[0, 0, 2], [0.0, 0.5]]] }
    }]
  });

  /* =====================================================================
     TOPIC 5 — Conditional probability and Bayes' rule
     ===================================================================== */
  topics.push({
    title: 'Conditional Probability & Bayes’ Rule (and the Base-Rate Fallacy)',
    analogy: `<p>A smoke alarm beeps. Is your house on fire? Almost certainly not: alarms beep for burnt toast hundreds of times for every real fire. The alarm is <b>evidence</b>, but you must weigh it against how <b>rare</b> fires are to begin with. Bayes' rule is just that common sense written as arithmetic.</p>`,
    explain: `<p><b>Conditional probability</b> P(A | B) means "the probability of A, <i>given that</i> we know B happened". The bar | reads as "given". Knowing B shrinks the world to only the cases where B is true:</p>
      <p style="text-align:center"><b>P(A | B) = P(A and B) / P(B)</b></p>
      <p><b>Example.</b> Of 100 emails, 30 are spam. 20 emails contain the word "free", and 15 of those are spam. P(spam | "free") = 15/20 = 0.75. But P("free" | spam) = 15/30 = 0.5. <b>P(A | B) and P(B | A) are different numbers.</b> Mixing them up is the most common probability mistake in the world.</p>
      <p><b>Bayes' rule</b> flips a conditional around:</p>
      <p style="text-align:center"><b>P(H | E) = P(E | H) · P(H) / P(E)</b></p>
      <ul>
        <li><b>P(H)</b> = <b>prior</b>: how likely the hypothesis was before the evidence (how common the disease is).</li>
        <li><b>P(E | H)</b> = <b>likelihood</b>: how likely the evidence is if the hypothesis is true (the test's sensitivity).</li>
        <li><b>P(E)</b> = total chance of seeing the evidence at all = P(E | H)P(H) + P(E | not H)P(not H). This is the <b>law of total probability</b>.</li>
        <li><b>P(H | E)</b> = <b>posterior</b>: the updated belief.</li>
      </ul>
      <p><b>The medical test (asked in almost every interview).</b> A disease affects 1% of people. The test catches 99% of sick people (sensitivity) and wrongly flags 5% of healthy people (false-positive rate). You test positive. Chance you are sick? Most people say 99%. Count 10,000 people instead:</p>
      ${H.table(['', 'test positive', 'test negative', 'total'], [['sick (1%)', '<span class="c-g">99</span>', '1', '100'], ['healthy (99%)', '<span class="c-r">495</span>', '9,405', '9,900'], ['total', '594', '9,406', '10,000']])}
      <p>P(sick | positive) = 99 / 594 ≈ <b>0.167</b>. Only about <b>1 in 6</b>! The 495 false alarms from the huge healthy group swamp the 99 true cases. Ignoring how rare the condition is (the prior) is called the <b>base-rate fallacy</b>.</p>
      <p><b>Independence, precisely:</b> A and B are independent when P(A | B) = P(A): knowing B tells you nothing about A.</p>
      <p><b>Where you meet it in ML:</b> naive Bayes spam filters, the precision of a fraud model (precision = P(fraud | flagged), which collapses when fraud is rare), calibration of classifier scores, and "a guardrail that flags 5% of safe prompts" producing mostly false alarms.</p>`,
    clues: [
      '"given that", "conditional on", "among those who ..." → P(A | B) = P(A and B)/P(B)',
      '"tests positive, what is the chance they have it" → Bayes with the base rate',
      '"rare event", "1 in 1000", "fraud", "disease" → watch for the base-rate fallacy',
      '"sensitivity / specificity / false-positive rate" → likelihoods P(E | H) and P(E | not H)',
      '"update the belief after new evidence", "posterior" → Bayes repeatedly, posterior becomes the next prior',
      '"naive Bayes", "spam filter" → multiply word likelihoods assuming independence given the class'
    ],
    code: [
      { lang: 'python', run: true, title: 'Bayes medical test: formula, counts and simulation (runnable)', code: `import random

prior = 0.01          # 1% of people are sick
sensitivity = 0.99    # P(positive | sick)
fpr = 0.05            # P(positive | healthy)  = 1 - specificity

# 1) Bayes formula
p_pos = sensitivity * prior + fpr * (1 - prior)          # law of total probability
posterior = sensitivity * prior / p_pos
print("P(positive) =", round(p_pos, 4))
print("P(sick | positive) =", round(posterior, 4))

# 2) Natural frequencies: imagine 10,000 people
people = 10000
sick = people * prior
true_pos = sick * sensitivity
false_pos = (people - sick) * fpr
print(f"true positives {true_pos:.0f}, false positives {false_pos:.0f}, share sick {true_pos / (true_pos + false_pos):.4f}")

# 3) Simulation with a fixed seed
random.seed(0)
pos = sick_and_pos = 0
for _ in range(200000):
    is_sick = random.random() < prior
    positive = random.random() < (sensitivity if is_sick else fpr)
    if positive:
        pos += 1
        sick_and_pos += is_sick
print("simulated P(sick | positive) =", round(sick_and_pos / pos, 4))

# 4) A second positive test: yesterday's posterior is today's prior
p2 = sensitivity * posterior / (sensitivity * posterior + fpr * (1 - posterior))
print("after two positive tests:", round(p2, 4))` },
      { lang: 'python', check: false, title: 'Naive Bayes in scikit-learn (not run here)', code: `from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB

texts = ["win free money now", "meeting at noon", "free prize click", "lunch tomorrow?"]
labels = [1, 0, 1, 0]                       # 1 = spam
vec = CountVectorizer()
X = vec.fit_transform(texts)
clf = MultinomialNB().fit(X, labels)
print(clf.predict_proba(vec.transform(["free lunch"])))   # [P(ham), P(spam)]` }
    ],
    viz: {
      title: 'Bayes with 10,000 people: where do the positives come from?',
      input: '0.01 0.99 0.05',
      inputLabel: 'prior, sensitivity, false-positive rate',
      gen: function (input) {
        var a = nums(input, 'prior, sensitivity and false-positive rate');
        var pr = a[0], se = a[1], fp = a[2];
        if ([pr, se, fp].some(function (v) { return !(v >= 0 && v <= 1); })) throw new Error('All three must be between 0 and 1, e.g. "0.01 0.99 0.05"');
        var N = 10000, S = N * pr, Hh = N - S, TP = S * se, FN = S - TP, FP = Hh * fp, TN = Hh - FP, post = TP + FP > 0 ? TP / (TP + FP) : 0;
        function g(hl, ehl, tags) {
          return { type: 'graph', directed: true, height: 62, nodes: [
            { id: 'A', label: '10,000 people', x: 50, y: 6, shape: 'box' },
            { id: 'S', label: 'sick ' + r4(S), x: 25, y: 26, shape: 'box' }, { id: 'H', label: 'healthy ' + r4(Hh), x: 75, y: 26, shape: 'box' },
            { id: 'TP', label: 'test + ' + r4(TP), x: 10, y: 52, shape: 'box' }, { id: 'FN', label: 'test − ' + r4(FN), x: 37, y: 52, shape: 'box' },
            { id: 'FP', label: 'test + ' + r4(FP), x: 63, y: 52, shape: 'box' }, { id: 'TN', label: 'test − ' + r4(TN), x: 90, y: 52, shape: 'box' }
          ], edges: [['A', 'S', r4(pr)], ['A', 'H', r4(1 - pr)], ['S', 'TP', r4(se)], ['S', 'FN', r4(1 - se)], ['H', 'FP', r4(fp)], ['H', 'TN', r4(1 - fp)]], hl: hl, ehl: ehl, tags: tags || {} };
        }
        return [
          { narr: 'Start with <b>10,000</b> imaginary people. Counting people is much easier than juggling conditional probabilities.', parts: [g({ A: 'cur' }, {})] },
          { narr: 'Prior: ' + r4(pr * 100) + '% are sick → <b>' + r4(S) + '</b> sick and <b>' + r4(Hh) + '</b> healthy. The healthy group is ' + (S > 0 ? r4(Hh / S) + '×' : 'far') + ' bigger. Remember that.', parts: [g({ S: 'bad', H: 'ok' }, { 'A-S': 'cur', 'A-H': 'cur' })] },
          { narr: 'Sensitivity ' + se + ': of the ' + r4(S) + ' sick, <b>' + r4(TP) + '</b> test positive (true positives) and ' + r4(FN) + ' are missed.', parts: [g({ TP: 'ok', FN: 'done' }, { 'S-TP': 'cur', 'S-FN': 'cur' })] },
          { narr: 'False-positive rate ' + fp + ': of the ' + r4(Hh) + ' healthy, <b>' + r4(FP) + '</b> still test positive (false alarms). A small rate times a huge group is a big number.', parts: [g({ FP: 'bad', TN: 'done' }, { 'H-FP': 'cur', 'H-TN': 'cur' })] },
          { narr: 'You tested positive, so you are one of the <b>' + r4(TP + FP) + '</b> positive people. Only ' + r4(TP) + ' of them are sick.', parts: [g({ TP: 'sel', FP: 'sel' }, {}, { TP: 'sick', FP: 'healthy' }), { type: 'bars', label: 'who are the positives?', values: [r4(TP), r4(FP)], idxLabels: ['truly sick', 'false alarm'], hl: { 0: 'ok', 1: 'bad' } }] },
          { narr: 'Posterior P(sick | +) = ' + r4(TP) + ' ÷ (' + r4(TP) + ' + ' + r4(FP) + ') = <b>' + r4(post) + '</b>. ' + (post < 0.5 ? '<span class="c-r">Most positives are false alarms — the base-rate fallacy is believing ' + se + ' here.</span>' : 'Here the prior is high enough that a positive is convincing.'), parts: [
            { type: 'table', columns: ['piece', 'value'], rows: [['prior P(sick)', r4(pr)], ['likelihood P(+ | sick)', se], ['P(+ | healthy)', fp], ['P(+) total', r4((TP + FP) / N)], ['posterior P(sick | +)', r4(post)]], hl: { 4: 'sel' } },
            { type: 'code', lang: 'python', code: 'p_pos = sens*prior + fpr*(1-prior)\nposterior = sens*prior / p_pos', hl: { 1: 'ok', 2: 'sel' } }
          ] },
          { narr: 'Test again and get a second positive? Use ' + r4(post) + ' as the new prior: P = ' + r4(se * post / (se * post + fp * (1 - post))) + '. Evidence adds up; one test rarely settles a rare question.', parts: [
            { type: 'bars', label: 'belief after each positive test', values: [r4(pr), r4(post), r4(se * post / (se * post + fp * (1 - post)))], idxLabels: ['prior', 'after 1', 'after 2'], hl: { 2: 'sel' } }
          ] }
        ];
      }
    },
    examples: [
      { title: 'Spam word, both directions', html: `<p>P(spam) = 0.3, P("free" | spam) = 0.5, P("free" | ham) = 0.0714. P("free") = 0.5·0.3 + 0.0714·0.7 = 0.2. P(spam | "free") = 0.15/0.2 = <b>0.75</b>. Same data, very different from P("free" | spam) = 0.5.</p>` },
      { title: 'Fraud model precision', html: `<p>Fraud rate 0.1%. Model catches 90% of fraud and flags 1% of normal transactions. Per 1,000,000: TP = 900, FP = 9,990. Precision = 900/10,890 ≈ <b>8.3%</b>. The model is "99% specific" yet 92% of its alerts are wrong.</p>${H.table(['', 'flagged', 'not flagged'], [['fraud (1,000)', '900', '100'], ['normal (999,000)', '9,990', '989,010']])}` },
      { title: 'Two children puzzle', html: `<p>A family has two children and at least one is a girl. P(both girls)? Equal outcomes GG, GB, BG, BB; "at least one girl" keeps GG, GB, BG. P = <b>1/3</b>, not 1/2. Conditioning removes outcomes; count what is left.</p>` },
      { title: 'Sequential updates', html: `<p>Prior 1%, test sensitivity 0.99, false-positive rate 0.05. After 1 positive: 16.7%. After 2 positives: 79.8%. After a positive then a negative: 0.2%. Each result multiplies the odds by its likelihood ratio (19.8 for a positive, about 0.0105 for a negative).</p>`, code: { lang: 'python', code: `p = 0.01\nfor res in [1, 1]:\n    like_h, like_not = (0.99, 0.05) if res else (0.01, 0.95)\n    p = like_h * p / (like_h * p + like_not * (1 - p))\n    print(round(p, 4))` } }
    ],
    deepDive: `<p><b>Odds form.</b> Bayes is cleanest in odds: posterior odds = prior odds × likelihood ratio, where LR = P(E | H)/P(E | not H). For the test: prior odds 1:99, LR = 0.99/0.05 = 19.8, posterior odds 19.8:99 → probability 19.8/118.8 = 0.167. In logs, each new piece of evidence <i>adds</i> log LR. Logistic regression is exactly this: a sum of weighted evidence in log-odds space, squashed by the sigmoid.</p>
      <p><b>Naive Bayes</b> assumes features (words) are independent given the class, so P(words | spam) = Π P(word | spam). The assumption is false, but the classifier ranks well because errors partly cancel. Use log probabilities to avoid underflow and Laplace (add-one) smoothing so an unseen word does not zero out the product.</p>
      <p><b>Bayesian vs frequentist.</b> Frequentists treat parameters as fixed and data as random (p-values, confidence intervals). Bayesians put a prior on the parameter and report a posterior (credible intervals: "95% probability the true rate is in here", which is what people wrongly think a confidence interval says). A Beta(a, b) prior with binomial data gives a Beta(a + successes, b + failures) posterior: the conjugate trick behind Bayesian A/B tests and Thompson sampling bandits.</p>
      <p><b>Simpson's paradox.</b> A treatment can be better in every subgroup and worse overall if group sizes differ. Conditioning on the right variable changes the story, which leads straight to causal reasoning.</p>`,
    aiEra: `<p><b>What AI changes:</b> guardrails, toxicity classifiers and AI-content detectors are all diagnostic tests applied to mostly-innocent traffic. A detector that is "95% accurate" on balanced data can be wrong on most flags when real misuse is 1 in 1,000. <b>Use AI as a partner:</b> ask <code>Given base rate 0.1%, recall 90% and FPR 2%, what is precision? Show the 2×2 table.</code></p>
      <p><b>Where AI goes wrong:</b> LLMs sometimes fall for the base-rate fallacy in word problems, swap P(A | B) with P(B | A), or ignore the law of total probability. <b>What you must still own:</b> asking "what is the base rate?" before trusting any alert, and knowing that an LLM's next-token probabilities are conditional: P(token | all previous tokens). Prompting is literally choosing what to condition on.</p>`,
    problems: [{
      title: 'Bayes Posterior for a Positive Test', level: 'Medium', tags: ['bayes', 'conditional probability'], companies: ['Google', 'Meta', 'Stripe'],
      statement: `<p>A condition has prevalence <code>prior</code>. A test detects it with probability <code>sensitivity</code> and gives a false positive on healthy people with probability <code>false_positive_rate</code>. Return P(condition | positive test).</p>`,
      constraints: `All inputs in [0, 1]; the chance of a positive test is &gt; 0. Compared to 1e-5.`,
      example: `<p>prior 0.01, sensitivity 0.99, FPR 0.05 → TP mass 0.0099, FP mass 0.0495, posterior = 0.0099/0.0594 = ${H.c('g', '0.1667')}. Not 0.99!</p>`,
      brute: { why: `<p>Simulate a million people with a seeded generator and count the sick among positives. It works but is noisy (±0.004 here) and slow, and for very rare conditions you need far more people to see enough positives.</p>`, code: `import random

def bayes_posterior_sim(prior, sens, fpr, n=1000000, seed=0):
    rng = random.Random(seed)
    pos = sick_pos = 0
    for _ in range(n):
        sick = rng.random() < prior
        if rng.random() < (sens if sick else fpr):
            pos += 1
            sick_pos += sick
    return sick_pos / pos

print(bayes_posterior_sim(0.01, 0.99, 0.05))` },
      mcq: { q: 'Prevalence 1%, sensitivity 99%, FPR 5%. Which change raises P(sick | +) the most?', options: ['Sensitivity 99% → 99.9%', 'FPR 5% → 0.5%', 'Test twice as fast', 'Report the answer as a percentage'], answer: 1, explain: 'False positives dominate (495 vs 99 per 10,000). Cutting FPR tenfold cuts them to 49.5, giving posterior ≈ 0.67. Raising sensitivity barely moves 99.' },
      hints: [`<p>Split everyone into sick and healthy first; positives come from both groups.</p>`, `<p>True-positive mass = prior · sensitivity. False-positive mass = (1 − prior) · FPR. Their sum is P(positive).</p>`, `<p>Posterior = TP mass / (TP mass + FP mass). If FPR = 0, every positive is real and the answer is 1. Recipe: tp = prior*sens; fp = (1-prior)*fpr; return tp/(tp+fp).</p>`],
      solution: {
        approach: `<p>Bayes' rule with the law of total probability in the denominator. Thinking in "masses" (fractions of the whole population) keeps it simple: posterior is the share of all positives that are true positives.</p>`,
        code: `def bayes_posterior(prior, sensitivity, false_positive_rate):
    tp = prior * sensitivity                    # sick and positive
    fp = (1 - prior) * false_positive_rate      # healthy but positive
    return tp / (tp + fp)                       # share of positives who are sick`,
        dry: { head: ['prior', 'tp mass', 'fp mass', 'posterior'], rows: [['0.01', '0.0099', '0.0495', '<span class="c-g">0.1667</span>'], ['0.5', '0.45', '0.05', '0.9'], ['0.001', '0.00099', '0.00999', '0.0902']] },
        complexity: `<p>O(1) time and space.</p>`,
        followUps: ['Return P(sick | negative) too (uses 1 − sensitivity and specificity).', 'Apply several test results in a row (practice set: sequential Bayes).']
      },
      tests: { sig: 'double double double -> double', fn: 'bayes_posterior', cmp: 'float', cases: [[[0.01, 0.99, 0.05], 0.16666666666666669], [[0.5, 0.9, 0.1], 0.9], [[0.001, 0.99, 0.01], 0.09016393442622951], [[0.1, 1.0, 0.0], 1.0], [[0.2, 0.8, 0.2], 0.5], [[0.3, 0.95, 0.02], 0.9531772575250835], [[0.01, 0.9, 0.09], 0.09174311926605506]] }
    }]
  });

  /* =====================================================================
     TOPIC 6 — Sampling, standard error, confidence intervals, bootstrap
     ===================================================================== */
  topics.push({
    title: 'Sampling, Confidence Intervals & the Bootstrap',
    analogy: `<p>A cook tastes <b>one spoonful</b> of soup to judge the whole pot. If she stirred well, one spoon is enough. If she only skims the top, she tastes oil, not soup. Sampling is the spoon, stirring is <b>random</b> sampling, and a confidence interval is her honest answer: "salty, somewhere between a bit and very".</p>`,
    explain: `<p>The <b>population</b> is everything you care about (all users, all future prompts). A <b>sample</b> is the part you actually measure. A <b>statistic</b> (like the sample mean x̄) estimates a population <b>parameter</b> (the true mean μ).</p>
      <p><b>Good sampling is random sampling.</b> Every member must have a fair chance to be picked. Common ways it goes wrong:</p>
      ${H.table(['bias', 'what happens', 'example'], [['selection bias', 'who gets in the sample depends on the answer', 'surveying only users who opened the app today'], ['survivorship bias', 'failures disappear from the data', 'studying only startups that still exist'], ['non-response bias', 'some groups ignore the survey', 'unhappy users skip the feedback form'], ['leakage', 'test data is not separate from training data', 'duplicated rows across train/test splits']])}
      <p><b>Stratified sampling</b> samples each group (country, device) in proportion so small groups are not missed. <b>With replacement</b> means an item can be picked twice; <b>without replacement</b> means it cannot.</p>
      <p><b>Standard error (SE).</b> Different samples give different x̄ values. The SD of x̄ across samples is SE = σ/√n, estimated by s/√n using the sample SD s. For a proportion p̂: SE = √(p̂(1 − p̂)/n).</p>
      <p><b>Confidence interval (CI).</b> A range that is built so that, over many repeated samples, 95% of such ranges contain the true value:</p>
      <p style="text-align:center"><b>95% CI = estimate ± 1.96 · SE</b></p>
      <p><b>Worked example.</b> 400 users tried a feature, 120 liked it. p̂ = 0.30. SE = √(0.3 · 0.7/400) = 0.0229. 95% CI = 0.30 ± 1.96 · 0.0229 = 0.30 ± 0.045 → <b>[0.255, 0.345]</b>.</p>
      ${H.table(['confidence', 'z multiplier', 'CI for the example'], [['90%', '1.645', '[0.262, 0.338]'], ['95%', '1.960', '[0.255, 0.345]'], ['99%', '2.576', '[0.241, 0.359]']])}
      <p>Higher confidence → wider interval. More data → narrower interval (4× the data halves the width).</p>
      <p><b>Interpretation trap.</b> "There is a 95% probability the true value is in [0.255, 0.345]" is <i>not</i> what a frequentist CI means. The true value is fixed; the interval is what is random. The correct reading: "this procedure captures the truth 95% of the time." For small samples of means, use the <b>t-distribution</b> (multiplier slightly above 1.96, e.g. 2.26 for n = 10).</p>
      <p><b>The bootstrap</b> builds a CI without any formula. Treat your sample as a mini-population. Resample it <b>with replacement</b> to the same size, compute the statistic, repeat 1,000+ times. The middle 95% of those statistics is the CI. It works for medians, p95 latency, F1 scores and other metrics that have no simple SE formula.</p>`,
    clues: [
      '"how confident are you in this estimate", "error bars", "margin of error" → CI = estimate ± z · SE',
      '"median", "F1", "p95", any metric without an easy formula → bootstrap',
      '"resample with replacement" → bootstrap; set a seed so it is reproducible',
      '"small sample of means", "n &lt; 30" → t-distribution instead of z',
      '"survey of users who ...", "only successful ..." → selection or survivorship bias',
      '"how many samples do I need for ±2%" → solve 1.96 · √(p(1−p)/n) = 0.02 for n'
    ],
    code: [
      { lang: 'python', run: true, title: 'CI by formula and by seeded bootstrap (runnable)', code: `import math
import random
import statistics
from statistics import NormalDist

random.seed(2024)
# A sample of 40 response times (ms), skewed like real latency
data = [round(random.expovariate(1 / 120) + 40, 1) for _ in range(40)]
n = len(data)
mean = statistics.mean(data)
s = statistics.stdev(data)                 # sample SD (n - 1)
se = s / math.sqrt(n)
z = NormalDist().inv_cdf(0.975)            # 1.95996...
print(f"mean {mean:.1f} ms, SE {se:.1f}, 95% CI by formula: [{mean - z * se:.1f}, {mean + z * se:.1f}]")

# Bootstrap: resample WITH replacement, recompute the statistic, take the middle 95%
def bootstrap(stat, data, B=2000, seed=0):
    rng = random.Random(seed)
    vals = sorted(stat([data[rng.randrange(len(data))] for _ in range(len(data))]) for _ in range(B))
    return vals[int(0.025 * B)], vals[int(0.975 * B) - 1]

lo, hi = bootstrap(statistics.mean, data)
print(f"bootstrap 95% CI for the mean:   [{lo:.1f}, {hi:.1f}]")
lo, hi = bootstrap(statistics.median, data)
print(f"bootstrap 95% CI for the median: [{lo:.1f}, {hi:.1f}]")

# CI for a proportion (Wald)
liked, users = 120, 400
p = liked / users
half = z * math.sqrt(p * (1 - p) / users)
print(f"proportion {p:.3f}, 95% CI [{p - half:.3f}, {p + half:.3f}]")

# What "95% confidence" means: repeat the study 1000 times, count how often the CI covers the truth
true_p, covered = 0.3, 0
for _ in range(1000):
    k = sum(random.random() < true_p for _ in range(users))
    ph = k / users
    h = z * math.sqrt(ph * (1 - ph) / users)
    covered += (ph - h) <= true_p <= (ph + h)
print("coverage over 1000 repeated studies:", covered / 1000)` },
      { lang: 'python', check: false, title: 'SciPy / statsmodels equivalents (not run here)', code: `import numpy as np
from scipy import stats
from statsmodels.stats.proportion import proportion_confint

x = np.array([120.5, 98.2, 143.0, 110.7, 87.9])
print(stats.t.interval(0.95, df=len(x) - 1, loc=x.mean(), scale=stats.sem(x)))
res = stats.bootstrap((x,), np.median, confidence_level=0.95, random_state=0)
print(res.confidence_interval)
print(proportion_confint(120, 400, method="wilson"))` }
    ],
    viz: {
      title: 'Bootstrap: resample with replacement, collect the means',
      input: '3 7 8 5 12 6 9 4 | 300 | 5',
      inputLabel: 'data | number of resamples (≤ 2000) | seed',
      gen: function (input) {
        var parts = String(input).split('|');
        var data = nums(parts[0], 'data values');
        var B = Math.floor(Number((parts[1] || '300').trim())), seed = Math.floor(Number((parts[2] || '1').trim()));
        if (data.length < 2 || data.length > 12) throw new Error('Use 2 to 12 data values, then | resamples | seed');
        if (!(B >= 20 && B <= 2000)) throw new Error('Resamples must be 20 to 2000');
        if (isNaN(seed)) throw new Error('Seed must be an integer');
        var rnd = makeRng(seed), n = data.length, frames = [], means = [];
        var m0 = data.reduce(function (s, x) { return s + x; }, 0) / n;
        frames.push({ narr: 'Original sample of n = ' + n + ', mean <b>' + r4(m0) + '</b>. We pretend this sample IS the population and draw new samples of size ' + n + ' from it, <b>with replacement</b>.', parts: [{ type: 'array', label: 'original sample', values: data }, { type: 'vars', vals: { n: n, mean: r4(m0), resamples: B } }] });
        for (var b = 0; b < B; b++) {
          var idx = [], s = 0;
          for (var i = 0; i < n; i++) { var j = Math.floor(rnd() * n); idx.push(j); s += data[j]; }
          means.push(s / n);
          if (b < 5) {
            var cnt = {}, hl = {}; idx.forEach(function (j) { cnt[j] = (cnt[j] || 0) + 1; });
            Object.keys(cnt).forEach(function (j) { hl[j] = cnt[j] > 1 ? 'cur' : 'ok'; });
            var missing = n - Object.keys(cnt).length;
            frames.push({ narr: 'Resample #' + (b + 1) + ': picked indexes [' + idx.join(', ') + ']. Amber = picked more than once, unhighlighted = left out (' + missing + ' this time). Its mean = <b>' + r4(s / n) + '</b>.', parts: [
              { type: 'array', label: 'original (how often each is picked)', values: data, hl: hl, showIdx: true },
              { type: 'array', label: 'resample', values: idx.map(function (j) { return data[j]; }) },
              { type: 'bars', label: 'bootstrap means so far', values: means.map(r4) }
            ] });
          }
        }
        var sorted = means.slice().sort(function (x, y) { return x - y; });
        var lo = sorted[Math.floor(0.025 * B)], hi = sorted[Math.floor(0.975 * B) - 1];
        var mn = sorted[0], mx = sorted[B - 1], bins = new Array(12).fill(0), labs = [], hlb = {};
        sorted.forEach(function (v) { var k = mx > mn ? Math.min(11, Math.floor((v - mn) / (mx - mn) * 12)) : 0; bins[k]++; });
        for (var k = 0; k < 12; k++) { var c = mn + (k + 0.5) * (mx - mn) / 12; labs.push(String(Math.round(c * 10) / 10)); if (c >= lo && c <= hi) hlb[k] = 'win'; }
        frames.push({ narr: 'After all <b>' + B + '</b> resamples, the bootstrap means form a histogram centred near the sample mean ' + r4(m0) + '. Its spread estimates the standard error.', parts: [{ type: 'bars', label: 'histogram of bootstrap means', values: bins, idxLabels: labs }] });
        var sdB = Math.sqrt(means.reduce(function (s, v) { var d = v - m0; return s + d * d; }, 0) / (B - 1));
        frames.push({ narr: 'Sort the ' + B + ' means. The 2.5th percentile (index ' + Math.floor(0.025 * B) + ') and 97.5th percentile (index ' + (Math.floor(0.975 * B) - 1) + ') give the <b>95% bootstrap CI [' + r4(lo) + ', ' + r4(hi) + ']</b>.', parts: [
          { type: 'bars', label: 'blue = inside the 95% CI', values: bins, idxLabels: labs, hl: hlb },
          { type: 'vars', vals: { 'CI low': r4(lo), 'CI high': r4(hi), 'bootstrap SE': r4(sdB) }, hl: { 'CI low': 'sel', 'CI high': 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Margin of error for a poll', html: `<p>Poll of 1,000 people, 52% say yes. SE = √(0.52 · 0.48/1000) = 0.0158. Margin = 1.96 · 0.0158 ≈ <b>±3.1 points</b>. "52% vs 48%" is barely outside noise; "51% vs 49%" is not.</p>` },
      { title: 'How many labels do I need?', html: `<p>You want an accuracy estimate within ±2 points at 95%. Worst case p = 0.5: n = (1.96/0.02)<sup>2</sup> · 0.25 ≈ <b>2,401</b> labelled examples. For ±5 points, only 385.</p>${H.table(['margin', 'n needed (p = 0.5)'], [['±10%', '97'], ['±5%', '385'], ['±2%', '2,401'], ['±1%', '9,604']])}`, code: { lang: 'python', code: `import math\nfor m in (0.1, 0.05, 0.02, 0.01):\n    print(m, math.ceil((1.96 / m) ** 2 * 0.25))` } },
      { title: 'Bootstrap a median latency', html: `<p>Latencies [120, 95, 300, 110, 105, 98, 1200, 115]. The median is 112.5 ms, and there is no simple SE formula for it. Resample with replacement 2,000 times, take the median each time, and read the 2.5% and 97.5% points. The single 1,200 ms outlier moves the <i>mean</i> a lot but the median barely.</p>` },
      { title: 'The Wald interval breaks at the edges', html: `<p>1 success in 10 tries: p̂ = 0.1, Wald 95% CI = 0.1 ± 0.186 = [−0.086, 0.286]. A negative probability! For small n or p near 0/1, use the Wilson interval or the bootstrap, both of which stay inside [0, 1].</p>` }
    ],
    deepDive: `<p><b>Why the bootstrap works.</b> The sample's empirical distribution is the best estimate of the population, so sampling from it mimics drawing new samples. It fails when the statistic depends on extremes (the max, very high percentiles with small n) or when data is <b>not independent</b>. For time series use a block bootstrap; for per-user data resample <b>users</b>, not events (a cluster bootstrap), or intervals come out far too narrow.</p>
      <p><b>Percentile vs BCa.</b> The plain percentile method (take the 2.5% and 97.5% points) is simple and usually fine. BCa (bias-corrected and accelerated) adjusts for bias and skew and is SciPy's default. Use at least 1,000 resamples for SEs and 5,000–10,000 for tail percentiles.</p>
      <p><b>Formula intervals.</b> For a mean with unknown σ, x̄ ± t<sub>n−1</sub> · s/√n. For a proportion, the Wilson score interval has much better coverage than Wald for small n. For a difference of two proportions, SE = √(p<sub>1</sub>q<sub>1</sub>/n<sub>1</sub> + p<sub>2</sub>q<sub>2</sub>/n<sub>2</sub>), which leads straight into A/B tests.</p>
      <p><b>Sampling in production ML.</b> Training data is rarely a random sample of deployment traffic (distribution shift). Importance weighting, stratified eval sets and regular re-sampling of fresh traffic keep estimates honest. Reservoir sampling picks a uniform random sample of k items from a stream of unknown length in one pass.</p>`,
    aiEra: `<p><b>What AI changes:</b> when you compare two prompts or models on an eval set, the honest report is a score <b>with a CI</b>, and a bootstrap over eval items takes ten lines. <b>Use AI as a partner:</b> <code>Bootstrap a 95% CI for the difference in pass rate between these two runs, resampling items (paired), seed 0</code>. Paired resampling (same items for both models) gives much tighter intervals than comparing two independent CIs.</p>
      <p><b>Where AI goes wrong:</b> it resamples individual LLM samples instead of prompts (fake precision), forgets the seed, reports a CI that spills below 0, or describes a CI as "95% probability the truth is inside". <b>What you must still own:</b> choosing the unit of resampling (user, prompt, conversation), spotting selection bias in how eval data was collected, and knowing an LLM-generated synthetic eval set is a sample of the LLM's view of the world, not your users'.</p>`,
    problems: [{
      title: 'Deterministic Bootstrap CI for a Mean', level: 'Medium', tags: ['bootstrap', 'confidence interval', 'simulation'], companies: ['Netflix', 'Airbnb'],
      statement: `<p>Return a 95% percentile-bootstrap CI <code>[lo, hi]</code> for the mean of <code>data</code>. Use exactly this procedure so results are reproducible: <code>rng = random.Random(seed)</code>; repeat <code>n_boot</code> times: build a resample of <code>len(data)</code> items where each index is <code>int(rng.random() * n)</code>, and record its mean. Sort the means. lo = means[int(0.025 · n_boot)], hi = means[int(0.975 · n_boot) − 1].</p>`,
      constraints: `1 ≤ len(data) ≤ 1000, 40 ≤ n_boot ≤ 10<sup>4</sup>. Compared to 1e-5.`,
      example: `<p>data [5, 5, 5], any seed → every resample has mean 5, so ${H.c('g', '[5.0, 5.0]')}. For [1, 2, 3, 4, 5], 200 resamples, seed 42 → <b>[2.0, 4.2]</b>, around the sample mean 3.</p>`,
      brute: { why: `<p>The "exact" bootstrap enumerates all n<sup>n</sup> possible resamples and weights them equally. For n = 10 that is 10 billion resamples. Random resampling with a fixed seed gives an accurate, reproducible approximation with a few thousand.</p>`, code: `from itertools import product

def exact_bootstrap_ci(data):
    n = len(data)
    means = sorted(sum(data[i] for i in idx) / n for idx in product(range(n), repeat=n))
    m = len(means)
    return [means[int(0.025 * m)], means[int(0.975 * m) - 1]]

print(exact_bootstrap_ci([1, 2, 3, 4, 5]))   # 3125 resamples; impossible for big n` },
      mcq: { q: 'Why must bootstrap resampling be WITH replacement?', options: ['Without replacement every resample is just a shuffle of the same data, so all means are identical', 'It is faster', 'It removes outliers', 'It makes the CI narrower'], answer: 0, explain: 'Sampling n items from n without replacement always gives the original set, so the mean never varies. Replacement creates the variation that mimics fresh samples.' },
      hints: [`<p>Each resample is the same size as the data, built by picking random positions; some items repeat and some are left out.</p>`, `<p>Use your own <code>random.Random(seed)</code> object and the exact index rule <code>int(rng.random() * n)</code>, so your sequence of picks matches the reference.</p>`, `<p>Collect n_boot means, sort them, then index at int(0.025·B) and int(0.975·B) − 1. Do not use statistics.quantiles here: its interpolation differs. Recipe: loop B times → mean of picks → sort → two indexes.</p>`],
      solution: {
        approach: `<p>Plain percentile bootstrap. The seeded generator makes it deterministic; following the exact index rule makes it match the tests. The middle 95% of bootstrap means is the interval.</p>`,
        code: `import random

def bootstrap_ci(data, n_boot, seed):
    rng = random.Random(seed)          # private, seeded generator
    n = len(data)
    means = []
    for _ in range(n_boot):
        total = 0.0
        for _ in range(n):
            total += data[int(rng.random() * n)]   # pick with replacement
        means.append(total / n)
    means.sort()
    return [means[int(0.025 * n_boot)], means[int(0.975 * n_boot) - 1]]`,
        dry: { head: ['step', 'what happens', 'example (data 1..5)'], rows: [['1', 'resample 5 indexes', 'e.g. [3, 0, 3, 1, 4] → values 4,1,4,2,5'], ['2', 'mean of that resample', '3.2'], ['3', 'repeat 200×, sort', '1.8 … 4.4'], ['4', 'index 5 and 194', '<span class="c-g">[2.0, 4.2]</span>']] },
        complexity: `<p>O(n_boot · n) time for resampling plus O(n_boot log n_boot) to sort; O(n_boot) space.</p>`,
        followUps: ['Bootstrap the median or p95 instead (swap the statistic).', 'Bootstrap the difference between two groups for an A/B test.']
      },
      tests: { sig: 'double[] int int -> double[]', fn: 'bootstrap_ci', cmp: 'float', cases: [[[[1, 2, 3, 4, 5], 200, 42], [2.0, 4.2]], [[[10, 12, 9, 11, 13, 8], 500, 0], [9.166666666666666, 11.833333333333334]], [[[5, 5, 5], 100, 1], [5.0, 5.0]], [[[2.5, 3.5, 1.0, 4.0], 300, 7], [1.75, 3.75]], [[[1, 100], 100, 3], [1.0, 100.0]], [[[0, 1, 0, 1, 1, 0, 1, 1], 400, 11], [0.25, 1.0]]] }
    }]
  });

  /* =====================================================================
     TOPIC 7 — Hypothesis tests and A/B tests
     ===================================================================== */
  topics.push({
    title: 'Hypothesis Tests & A/B Tests (p-values, Power, Peeking, Causation)',
    analogy: `<p>A courtroom starts with "<b>innocent until proven guilty</b>". The prosecutor must show evidence so strong that it would be very surprising if the person were innocent. A hypothesis test works the same way: assume "<b>no effect</b>" and only reject that if the data would be very surprising under it. Not enough evidence means "not proven", never "proven innocent".</p>`,
    explain: `<p><b>The recipe.</b></p>
      <ol>
        <li><b>Null hypothesis H<sub>0</sub></b>: nothing changed (new button converts the same as the old one).</li>
        <li><b>Alternative H<sub>1</sub></b>: there is a difference.</li>
        <li>Pick a <b>significance level α</b> before looking at data, usually 0.05.</li>
        <li>Compute a <b>test statistic</b> (like a z-score) that measures how far the data is from what H<sub>0</sub> predicts, in SE units.</li>
        <li>The <b>p-value</b> = probability of seeing a result at least this extreme <i>if H<sub>0</sub> were true</i>. If p &lt; α, reject H<sub>0</sub>.</li>
      </ol>
      <p><b>The p-value is NOT the probability that H<sub>0</sub> is true</b>, and 1 − p is not the probability your change works. It only says how surprising the data is under "no effect".</p>
      <p><b>A/B test with a two-proportion z-test.</b> Group A (old page): 100 of 1,000 converted (10%). Group B (new page): 130 of 1,000 (13%). Is the 3-point lift real?</p>
      ${H.table(['step', 'formula', 'value'], [
        ['rates', 'p<sub>A</sub> = 100/1000, p<sub>B</sub> = 130/1000', '0.10, 0.13'],
        ['pooled rate (H<sub>0</sub>: same rate)', '(100 + 130)/(1000 + 1000)', '0.115'],
        ['standard error', '√(0.115 · 0.885 · (1/1000 + 1/1000))', '0.01427'],
        ['z', '(0.13 − 0.10) / 0.01427', '2.10'],
        ['two-sided p-value', '2 · (1 − Φ(2.10))', '<span class="c-g">0.035</span>'],
        ['decision at α = 0.05', 'p &lt; 0.05', 'reject H<sub>0</sub>: likely a real lift']
      ])}
      <p><b>Two kinds of mistakes:</b></p>
      ${H.table(['', 'H<sub>0</sub> true (no effect)', 'H<sub>1</sub> true (real effect)'], [['reject H<sub>0</sub>', '<span class="c-r">Type I error (false positive), rate α</span>', '<span class="c-g">correct: power = 1 − β</span>'], ['keep H<sub>0</sub>', '<span class="c-g">correct</span>', '<span class="c-r">Type II error (false negative), rate β</span>']])}
      <p><b>Power</b> is the chance of detecting a real effect. Teams aim for 80%. Power grows with sample size and effect size. Before an A/B test, compute the <b>required sample size</b> per group: n ≈ (z<sub>α/2</sub>√(2p̄q̄) + z<sub>β</sub>√(p<sub>1</sub>q<sub>1</sub> + p<sub>2</sub>q<sub>2</sub>))<sup>2</sup> / (p<sub>2</sub> − p<sub>1</sub>)<sup>2</sup>. To detect 10% → 12% with α = 0.05 and 80% power you need about <b>3,841 users per arm</b>.</p>
      <p><b>Interview traps (memorise these):</b></p>
      <ul>
        <li><b>Peeking.</b> Checking the p-value every day and stopping the first time it dips below 0.05 inflates false positives from 5% to 20–30%. Fix the sample size in advance, or use sequential tests built for peeking.</li>
        <li><b>p-hacking / multiple comparisons.</b> Test 20 metrics or 20 segments and about one will be "significant" by luck (1 − 0.95<sup>20</sup> ≈ 64% chance of at least one). Pre-register one primary metric; correct with Bonferroni (α/k) or control the false discovery rate.</li>
        <li><b>Correlation is not causation.</b> Users who use dark mode churn less, but dark mode may not <i>cause</i> it (power users like dark mode). Only <b>randomised</b> assignment, as in an A/B test, lets you claim cause.</li>
        <li><b>Statistically significant ≠ important.</b> With 10 million users, a 0.01% lift can be "significant" and worthless. Report the effect size and its CI.</li>
      </ul>`,
    clues: [
      '"is the difference significant", "A/B test", "conversion rate" → two-proportion z-test',
      '"how many users do we need", "how long to run the test" → power analysis / sample size',
      '"we checked results daily and stopped when it was significant" → peeking: inflated false positives',
      '"we tested 15 metrics and one moved" → multiple comparisons, p-hacking',
      '"users who do X have better Y" → correlation; ask about randomisation and confounders',
      '"group sizes are 50.8% / 49.2% when split was 50/50" → sample ratio mismatch; check assignment'
    ],
    code: [
      { lang: 'python', run: true, title: 'Two-proportion z-test, sample size and the peeking problem (runnable)', code: `import math
import random
from statistics import NormalDist

N01 = NormalDist()

def two_prop_ztest(conv_a, n_a, conv_b, n_b):
    pa, pb = conv_a / n_a, conv_b / n_b
    pool = (conv_a + conv_b) / (n_a + n_b)            # rate if H0 (no difference) is true
    se = math.sqrt(pool * (1 - pool) * (1 / n_a + 1 / n_b))
    z = (pb - pa) / se
    p = 2 * (1 - N01.cdf(abs(z)))                      # two-sided p-value
    return z, p

z, p = two_prop_ztest(100, 1000, 130, 1000)
print(f"z = {z:.3f}, p = {p:.4f} ->", "significant" if p < 0.05 else "not significant")

# 95% CI for the lift (unpooled SE)
pa, pb = 0.10, 0.13
se = math.sqrt(pa * (1 - pa) / 1000 + pb * (1 - pb) / 1000)
print(f"lift {pb - pa:.3f}, 95% CI [{pb - pa - 1.96 * se:.3f}, {pb - pa + 1.96 * se:.3f}]")

def sample_size(p1, p2, alpha=0.05, power=0.8):
    za, zb = N01.inv_cdf(1 - alpha / 2), N01.inv_cdf(power)
    pbar = (p1 + p2) / 2
    num = (za * math.sqrt(2 * pbar * (1 - pbar)) + zb * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2
    return math.ceil(num / (p2 - p1) ** 2)

print("users per arm for 10% -> 12%:", sample_size(0.10, 0.12))

# Peeking: an A/A test (no real difference). Check 20 times; stop at the first p < 0.05.
random.seed(5)
sims, n, looks = 400, 2000, 20
fixed_fp = peek_fp = 0
for _ in range(sims):
    ca = cb = 0
    stopped = False
    for i in range(1, n + 1):
        ca += random.random() < 0.1
        cb += random.random() < 0.1
        if i % (n // looks) == 0 and ca + cb > 0:
            _, pv = two_prop_ztest(ca, i, cb, i)
            if pv < 0.05 and not stopped:
                stopped = True
    _, pv_final = two_prop_ztest(ca, n, cb, n)
    fixed_fp += pv_final < 0.05
    peek_fp += stopped
print("false-positive rate, one look at the end:", fixed_fp / sims)
print("false-positive rate with 20 peeks:     ", peek_fp / sims)
print("chance of >= 1 false hit among 20 metrics:", round(1 - 0.95 ** 20, 3))` },
      { lang: 'python', check: false, title: 'statsmodels equivalents (not run here)', code: `from statsmodels.stats.proportion import proportions_ztest
from statsmodels.stats.power import NormalIndPower
from statsmodels.stats.proportion import proportion_effectsize

z, p = proportions_ztest(count=[130, 100], nobs=[1000, 1000])
print(z, p)
h = proportion_effectsize(0.12, 0.10)          # Cohen's h
print(NormalIndPower().solve_power(effect_size=h, alpha=0.05, power=0.8))` }
    ],
    viz: [{
      title: 'Run an A/B test: from counts to a decision',
      input: '100 1000 130 1000',
      inputLabel: 'conversions A, users A, conversions B, users B',
      gen: function (input) {
        var a = nums(input, 'four counts');
        if (a.length < 4) throw new Error('Give 4 numbers: convA nA convB nB, e.g. "100 1000 130 1000"');
        var ca = a[0], na = a[1], cb = a[2], nb = a[3];
        if (!(na > 0 && nb > 0) || ca < 0 || cb < 0 || ca > na || cb > nb) throw new Error('Conversions must be between 0 and the number of users');
        var pa = ca / na, pb = cb / nb, pool = (ca + cb) / (na + nb), se = Math.sqrt(pool * (1 - pool) * (1 / na + 1 / nb));
        if (!(se > 0)) throw new Error('Need some conversions and some non-conversions');
        var z = (pb - pa) / se, p = 2 * (1 - phi(Math.abs(z))), B = 33, vals = [], labs = [], tail = {};
        for (var i = 0; i < B; i++) { var x = -4 + (i + 0.5) * 8 / B; vals.push(r4(Math.exp(-x * x / 2) * 40)); labs.push(i % 4 === 0 ? String(Math.round(x * 10) / 10) : ''); if (Math.abs(x) >= Math.abs(z)) tail[i] = 'bad'; }
        var crit = {}; for (var j = 0; j < B; j++) { var xx = -4 + (j + 0.5) * 8 / B; if (Math.abs(xx) >= 1.96) crit[j] = 'cur'; }
        var zpos = Math.max(0, Math.min(B - 1, Math.floor((z + 4) / 8 * B))), zp = {}; zp[zpos] = 'z';
        return [
          { narr: 'Two groups, randomly assigned. A: ' + ca + '/' + na + ' converted. B: ' + cb + '/' + nb + '.', parts: [{ type: 'bars', label: 'conversion rate', values: [r4(pa), r4(pb)], idxLabels: ['A (control)', 'B (variant)'], hl: { 1: pb > pa ? 'ok' : 'bad' } }, { type: 'vars', vals: { 'p_A': r4(pa), 'p_B': r4(pb), 'observed lift': r4(pb - pa) } }] },
          { narr: 'Assume H<sub>0</sub>: both groups share one true rate. Our best guess for it is the <b>pooled</b> rate (' + (ca + cb) + ' ÷ ' + (na + nb) + ') = <b>' + r4(pool) + '</b>.', parts: [{ type: 'vars', vals: { pooled: r4(pool) }, hl: { pooled: 'cur' } }, { type: 'code', lang: 'python', code: 'pool = (conv_a + conv_b) / (n_a + n_b)', hl: { 1: 'cur' } }] },
          { narr: 'If H<sub>0</sub> is true, the gap p<sub>B</sub> − p<sub>A</sub> would wobble around 0 with SE = √(pool·(1−pool)·(1/n<sub>A</sub> + 1/n<sub>B</sub>)) = <b>' + r4(se) + '</b>.', parts: [{ type: 'vars', vals: { SE: r4(se) }, hl: { SE: 'cur' } }, { type: 'code', lang: 'python', code: 'se = sqrt(pool*(1-pool)*(1/n_a + 1/n_b))', hl: { 1: 'cur' } }] },
          { narr: 'z = observed gap ÷ SE = ' + r4(pb - pa) + ' ÷ ' + r4(se) + ' = <b>' + r4(z) + '</b>. Under H<sub>0</sub>, z follows the standard bell curve. Amber tails beyond ±1.96 hold 5% of the area: the rejection zone for α = 0.05.', parts: [{ type: 'bars', label: 'null distribution of z', values: vals, idxLabels: labs, hl: crit, ptr: zp }] },
          { narr: 'p-value = area in both tails beyond |z| = ' + r4(Math.abs(z)) + ': <b>' + r4(p) + '</b>. That is how often pure chance would produce a gap at least this big.', parts: [{ type: 'bars', label: 'red = as or more extreme than our result', values: vals, idxLabels: labs, hl: tail, ptr: zp }, { type: 'vars', vals: { z: r4(z), 'p-value': r4(p) }, hl: { 'p-value': p < 0.05 ? 'ok' : 'bad' } }] },
          { narr: (p < 0.05 ? '<span class="c-g">p &lt; 0.05: reject H<sub>0</sub>.</span> The lift is unlikely to be chance.' : '<span class="c-r">p ≥ 0.05: do not reject H<sub>0</sub>.</span> Not proven — the effect may exist but this test cannot see it (maybe too few users).') + ' Report the lift with a CI, not just the p-value, and only trust it if the sample size was fixed in advance (no peeking).', parts: [{ type: 'table', columns: ['quantity', 'value'], rows: [['lift', r4(pb - pa)], ['z', r4(z)], ['p-value', r4(p)], ['decision (α = 0.05)', p < 0.05 ? 'reject H0' : 'keep H0']], hl: { 3: p < 0.05 ? 'ok' : 'bad' } }] }
        ];
      }
    }, {
      title: 'Why peeking breaks A/B tests (A/A simulation)',
      input: '11',
      inputLabel: 'seed',
      gen: function (input) {
        var seed = Math.floor(Number(String(input).trim() || 11));
        if (isNaN(seed)) throw new Error('Enter an integer seed');
        var rnd = makeRng(seed), frames = [], zs = [], labs = [], ca = 0, cb = 0, n = 0, first = -1;
        frames.push({ narr: 'An <b>A/A test</b>: both groups get the SAME page with a 10% conversion rate. Any "significant" result is a false positive. We peek after every 100 users per arm.', parts: [{ type: 'vars', vals: { 'true rate A': 0.1, 'true rate B': 0.1, 'peeks': 20 } }] });
        for (var look = 1; look <= 20; look++) {
          for (var k = 0; k < 100; k++) { n++; if (rnd() < 0.1) ca++; if (rnd() < 0.1) cb++; }
          var pool = (ca + cb) / (2 * n), se = Math.sqrt(pool * (1 - pool) * 2 / n), z = se > 0 ? (cb - ca) / n / se : 0;
          zs.push(r4(Math.abs(z))); labs.push(String(n));
          if (Math.abs(z) > 1.96 && first < 0) first = look;
          if (look % 4 === 0 || (first === look)) {
            var hl = {}; zs.forEach(function (v, i) { hl[i] = v > 1.96 ? 'bad' : 'ok'; });
            frames.push({ narr: 'After ' + n + ' users per arm: |z| = <b>' + r4(Math.abs(z)) + '</b>. ' + (first === look ? '<span class="c-r">|z| crossed 1.96! A peeking team would stop now and ship a "winner" that is pure noise.</span>' : first > 0 ? 'It already crossed once at peek ' + first + ', even though nothing is different.' : 'Still below 1.96.'), parts: [{ type: 'bars', label: '|z| at each peek (red = looked significant)', values: zs.slice(), idxLabels: labs.slice(), hl: hl }] });
          }
        }
        frames.push({ narr: 'With 1 look at a fixed end point, false positives are 5%. With 20 peeks and "stop at first p &lt; 0.05", simulations show roughly <b>20–30%</b>. Fix: decide n in advance, or use sequential methods (alpha spending, always-valid p-values, Bayesian with a decision rule).', parts: [{ type: 'table', columns: ['strategy', 'false-positive rate'], rows: [['one look at planned n', '≈ 5%'], ['peek 5 times, stop when p &lt; 0.05', '≈ 14%'], ['peek 20 times, stop when p &lt; 0.05', '≈ 25%']], hl: { 0: 'ok', 2: 'bad' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'A tie that is not a tie', html: `<p>A: 50/500 (10%), B: 60/500 (12%). z ≈ 1.01, p ≈ 0.31. Not significant. But the 95% CI for the lift is about [−1.9, +5.9] points: a real 4-point gain is entirely possible. The test was too small (underpowered), not proof of "no effect".</p>` },
      { title: 'Sample size before you start', html: `<p>Baseline 5%, you want to detect 5% → 6% (a 20% relative lift) at α = 0.05, power 0.8: about <b>8,158 users per arm</b>. With 1,000 users a day per arm, that is 8+ days. Run full weeks to cover weekday/weekend behaviour.</p>${H.table(['p1 → p2', 'users per arm'], [['10% → 12%', '3,841'], ['5% → 6%', '8,158'], ['10% → 15%', '686'], ['20% → 25% (power 0.9)', '1,464']])}` },
      { title: 'Correlation vs causation', html: `<p>Data: users who receive more push notifications retain better. A naive team triples notifications and retention <i>drops</i>. The confounder: engaged users trigger more notifications. Only a randomised test ("random half get more notifications") measures the causal effect.</p>` },
      { title: 'Bonferroni for many metrics', html: `<p>You check 10 metrics. To keep the overall false-positive chance near 5%, require p &lt; 0.05/10 = <b>0.005</b> for each. Without correction, P(at least one false hit) = 1 − 0.95<sup>10</sup> ≈ 40%.</p>`, code: { lang: 'python', code: `for k in (1, 5, 10, 20):\n    print(k, round(1 - 0.95 ** k, 3), "per-test alpha:", 0.05 / k)` } }
    ],
    deepDive: `<p><b>Pooled vs unpooled SE.</b> The test statistic uses the pooled rate because it is computed <i>assuming</i> H<sub>0</sub>. The CI for the lift uses the unpooled SE √(p<sub>A</sub>q<sub>A</sub>/n<sub>A</sub> + p<sub>B</sub>q<sub>B</sub>/n<sub>B</sub>) because it does not assume H<sub>0</sub>. For continuous metrics (revenue, time spent) use Welch's t-test; for heavy tails, consider trimming, log transforms or a bootstrap/permutation test.</p>
      <p><b>Variance reduction.</b> CUPED uses each user's pre-experiment metric as a covariate: Y' = Y − θ(X − X̄), θ = Cov(X,Y)/Var(X). It can cut required sample size by 30–50%. Stratified randomisation also reduces variance.</p>
      <p><b>Validity checks.</b> <i>Sample ratio mismatch</i> (a chi-square test on group sizes) catches broken assignment. <i>A/A tests</i> confirm the pipeline gives ~5% false positives. Watch for novelty effects, network effects (users in A talk to users in B), and the unit of randomisation: if you randomise by user but analyse by page view, events within a user are correlated and naive SEs are too small (use the delta method or a cluster bootstrap).</p>
      <p><b>Sequential and Bayesian testing.</b> Group-sequential designs (O'Brien–Fleming boundaries) and always-valid p-values (mSPRT) let you look early without inflating α. Bayesian A/B tests report P(B &gt; A), which is what stakeholders want, but they still need a stopping rule decided in advance. Multi-armed bandits (Thompson sampling) trade measurement accuracy for less regret during the test.</p>`,
    aiEra: `<p><b>What AI changes:</b> teams now A/B test prompts, models, retrieval settings and agent policies, often on LLM-judged metrics. The same statistics apply, plus new noise: LLM outputs vary run to run, and judges disagree with themselves. <b>Use AI as a partner:</b> <code>Compute required sample size for detecting a 3-point win-rate change at 80% power, then write the analysis plan before we launch.</code></p>
      <p><b>Where AI goes wrong:</b> AI analysts eagerly slice results into dozens of segments and report the one that is significant (automated p-hacking), declare winners from dashboards checked hourly, and describe correlations in logs as causes. <b>What you must still own:</b> the pre-registered primary metric, the fixed sample size, the decision rule, and the discipline to say "inconclusive". For offline LLM evals, use paired tests (McNemar or a paired bootstrap) because both models answer the same questions.</p>`,
    problems: [{
      title: 'Two-Proportion z-Test for an A/B Test', level: 'Medium', tags: ['hypothesis test', 'a/b test', 'normal'], companies: ['Booking.com', 'Microsoft', 'Meta'],
      statement: `<p>Group A had <code>conv_a</code> conversions out of <code>n_a</code> users; group B had <code>conv_b</code> out of <code>n_b</code>. Return <code>[z, p]</code>: the pooled two-proportion z statistic (B minus A) and the two-sided p-value, using <code>statistics.NormalDist</code>.</p>`,
      constraints: `n_a, n_b ≥ 1; the pooled rate is strictly between 0 and 1. Compared to 1e-5.`,
      example: `<p>100/1000 vs 130/1000 → pooled 0.115, SE 0.01427, z = 0.03/0.01427 = 2.1027, p = 2(1 − Φ(2.1027)) = ${H.c('g', '0.0355')}. Output <b>[2.1027, 0.0355]</b>.</p>`,
      brute: { why: `<p>A permutation simulation: pool all users, randomly re-split them many times and count how often the shuffled gap is as large as the real one. It needs no normal approximation but costs thousands of passes over all users and is noisy. The z-test gives the answer in O(1) once n is large.</p>`, code: `import random

def ab_permutation_p(conv_a, n_a, conv_b, n_b, iters=2000, seed=0):
    rng = random.Random(seed)
    users = [1] * (conv_a + conv_b) + [0] * (n_a + n_b - conv_a - conv_b)
    obs = abs(conv_b / n_b - conv_a / n_a)
    hits = 0
    for _ in range(iters):
        rng.shuffle(users)
        a, b = users[:n_a], users[n_a:]
        hits += abs(sum(b) / n_b - sum(a) / n_a) >= obs - 1e-12
    return hits / iters

print(ab_permutation_p(100, 1000, 130, 1000))` },
      mcq: { q: 'Why is the pooled rate used in the SE for the test statistic?', options: ['Because the test assumes H<sub>0</sub>: both groups have the same rate', 'It always gives a smaller p-value', 'Because group B is bigger', 'It is required for one-sided tests only'], answer: 0, explain: 'The p-value is computed under H<sub>0</sub>. Under H<sub>0</sub> there is one shared rate, and the pooled rate is the best estimate of it.' },
      hints: [`<p>Under "no difference" both groups have one shared rate; estimate it from all users combined.</p>`, `<p>SE = √(pool · (1 − pool) · (1/n_a + 1/n_b)); z = (p_b − p_a)/SE.</p>`, `<p>Two-sided p = 2 · (1 − Φ(|z|)) with <code>NormalDist().cdf</code>. Identical rates give z = 0 and p = 1. Recipe: rates → pool → SE → z → p.</p>`],
      solution: {
        approach: `<p>Standard pooled two-proportion z-test. The CLT makes each sample proportion approximately normal, so their difference divided by its SE under H<sub>0</sub> is approximately standard normal.</p>`,
        code: `import math
from statistics import NormalDist

def two_proportion_z(conv_a, n_a, conv_b, n_b):
    pa, pb = conv_a / n_a, conv_b / n_b
    pool = (conv_a + conv_b) / (n_a + n_b)                    # shared rate under H0
    se = math.sqrt(pool * (1 - pool) * (1 / n_a + 1 / n_b))
    z = (pb - pa) / se
    p = 2 * (1 - NormalDist().cdf(abs(z)))                    # both tails
    return [z, p]`,
        dry: { head: ['input', 'pool', 'SE', 'z', 'p'], rows: [['100/1000 vs 130/1000', '0.115', '0.01427', '2.103', '<span class="c-g">0.0355</span>'], ['50/500 vs 50/500', '0.1', '0.019', '0', '1.0'], ['200/1000 vs 150/1000', '0.175', '0.01699', '−2.942', '0.0033']] },
        complexity: `<p>O(1) time and space.</p>`,
        followUps: ['Return a 95% CI for the lift using the unpooled SE.', 'How would you change this for a one-sided test? (p = 1 − Φ(z))']
      },
      tests: { sig: 'int int int int -> double[]', fn: 'two_proportion_z', cmp: 'float', cases: [[[100, 1000, 130, 1000], [2.102740605622114, 0.03548845046647475]], [[50, 500, 50, 500], [0.0, 1.0]], [[200, 1000, 150, 1000], [-2.9424494316825, 0.0032562696284119674]], [[30, 100, 45, 100], [2.1908902300206647, 0.02845973691631043]], [[1200, 10000, 1300, 10000], [2.138089935299397, 0.032509444645719476]], [[10, 50, 20, 50], [2.182178902359924, 0.029096331741252257]]] }
    }]
  });

  /* =====================================================================
     TOPIC 8 — Entropy, cross-entropy, KL and softmax with temperature
     ===================================================================== */
  topics.push({
    title: 'Entropy, Cross-Entropy, KL Divergence & Softmax with Temperature',
    analogy: `<p>Play "guess the word" with a friend. If the answer is one of 2 equally likely words, you need 1 yes/no question. If it is one of 8, you need 3. If your friend almost always picks "cat", you barely need to ask. <b>Entropy</b> is the average number of yes/no questions: a measure of <b>surprise</b>. <b>Cross-entropy</b> is how many questions you need when you guess using the <i>wrong</i> idea of how your friend picks.</p>`,
    explain: `<p><b>Surprise of one outcome</b> with probability p is −log<sub>2</sub>(p) bits. A sure thing (p = 1) has surprise 0. A 1-in-8 event has surprise 3 bits. Rare events are more surprising.</p>
      <p><b>Entropy</b> is the expected surprise of a distribution P:</p>
      <p style="text-align:center"><b>H(P) = −Σ p<sub>i</sub> · log<sub>2</sub> p<sub>i</sub></b></p>
      ${H.table(['distribution', 'entropy (bits)', 'meaning'], [['[1.0]', '0', 'no uncertainty at all'], ['[0.9, 0.1]', '0.469', 'mostly predictable'], ['[0.5, 0.5]', '1', 'fair coin'], ['[0.5, 0.25, 0.25]', '1.5', ''], ['[0.25, 0.25, 0.25, 0.25]', '2', 'uniform over 4 = log<sub>2</sub> 4'], ['8 equal outcomes', '3', 'max for 8 outcomes']])}
      <p><b>Worked example:</b> H([0.5, 0.25, 0.25]) = −(0.5·log<sub>2</sub>0.5 + 0.25·log<sub>2</sub>0.25 + 0.25·log<sub>2</sub>0.25) = −(0.5·(−1) + 0.25·(−2) + 0.25·(−2)) = 0.5 + 0.5 + 0.5 = <b>1.5 bits</b>. Entropy is highest when all outcomes are equally likely.</p>
      <p><b>Cross-entropy</b> measures how well a predicted distribution Q matches the true distribution P:</p>
      <p style="text-align:center"><b>H(P, Q) = −Σ p<sub>i</sub> · log q<sub>i</sub></b></p>
      <p>In classification the true label is one-hot (P = 1 for the correct class, 0 elsewhere), so cross-entropy collapses to <b>−log(q<sub>correct</sub>)</b>: minus the log of the probability the model gave to the right answer. That is the <b>cross-entropy loss</b> (also called log loss or negative log-likelihood) used to train almost every classifier and every LLM. ML code uses the natural log (units: <i>nats</i>).</p>
      ${H.table(['model’s probability for the correct class', 'loss −ln(q)', 'verdict'], [['0.99', '0.010', 'confident and right'], ['0.9', '0.105', 'good'], ['0.5', '0.693', 'unsure'], ['0.1', '2.303', 'bad'], ['0.01', '4.605', 'confident and wrong: punished hard']])}
      <p><b>KL divergence</b> D<sub>KL</sub>(P‖Q) = Σ p<sub>i</sub> log(p<sub>i</sub>/q<sub>i</sub>) = H(P, Q) − H(P). It is the <i>extra</i> surprise from using Q instead of the truth P. It is ≥ 0, equals 0 only when Q = P, and is <b>not symmetric</b>. It appears in RLHF (keep the tuned model close to the original), distillation and VAEs.</p>
      <p><b>Softmax</b> turns any list of scores (logits) z into probabilities: softmax(z)<sub>i</sub> = e<sup>z<sub>i</sub></sup> / Σ<sub>j</sub> e<sup>z<sub>j</sub></sup>. All outputs are positive and add to 1. <b>Temperature T</b> divides the logits first: softmax(z/T).</p>
      ${H.table(['logits [2, 1, 0]', 'probabilities', 'entropy (bits)'], [['T = 0.5 (sharper)', '[0.867, 0.117, 0.016]', '0.63'], ['T = 1', '[0.665, 0.245, 0.090]', '1.2'], ['T = 2 (flatter)', '[0.506, 0.307, 0.186]', '1.47']])}
      <p>Low T → nearly always picks the top token (more deterministic, less creative). High T → more random. T → 0 becomes greedy argmax. This is the temperature knob in every LLM API.</p>`,
    clues: [
      '"how uncertain is this distribution", "information content", "bits" → entropy',
      '"log loss", "negative log-likelihood", "classification loss" → cross-entropy −log q<sub>correct</sub>',
      '"how different are two distributions", "keep the policy close to the reference" → KL divergence',
      '"turn scores/logits into probabilities" → softmax (subtract the max first for stability)',
      '"temperature", "make outputs more/less random" → softmax(z / T)',
      '"model is overconfident and wrong" → cross-entropy explodes; check calibration'
    ],
    code: [
      { lang: 'python', run: true, title: 'Entropy, cross-entropy, KL and softmax with temperature (runnable)', code: `import math
import random

def entropy(p, base=2):
    return -sum(x * math.log(x, base) for x in p if x > 0)

def cross_entropy(p, q):                       # natural log, as in ML losses
    return -sum(pi * math.log(qi) for pi, qi in zip(p, q) if pi > 0)

def kl(p, q):
    return sum(pi * math.log(pi / qi) for pi, qi in zip(p, q) if pi > 0)

def softmax(logits, t=1.0):
    scaled = [z / t for z in logits]
    m = max(scaled)                           # subtract max: avoids overflow in exp
    exps = [math.exp(z - m) for z in scaled]
    s = sum(exps)
    return [e / s for e in exps]

for dist in ([1.0], [0.9, 0.1], [0.5, 0.5], [0.5, 0.25, 0.25], [0.25] * 4):
    print("H", dist, "=", round(entropy(dist), 4), "bits")

truth = [0, 1, 0]                              # correct class is index 1
for q in ([0.1, 0.8, 0.1], [0.3, 0.4, 0.3], [0.7, 0.2, 0.1]):
    print("prediction", q, "cross-entropy loss =", round(cross_entropy(truth, q), 4))

p, q = [0.5, 0.5], [0.9, 0.1]
print("KL(p||q) =", round(kl(p, q), 4), " KL(q||p) =", round(kl(q, p), 4), " (not symmetric)")

logits = [2.0, 1.0, 0.0]
for t in (0.25, 0.5, 1.0, 2.0, 5.0):
    probs = softmax(logits, t)
    print(f"T={t:<4} probs={[round(x, 3) for x in probs]} entropy={entropy(probs):.3f} bits")

# Sampling tokens at two temperatures (seeded)
random.seed(0)
vocab = ["the", "a", "banana"]
for t in (0.5, 2.0):
    picks = random.choices(vocab, weights=softmax(logits, t), k=1000)
    print("T =", t, {w: picks.count(w) for w in vocab})

print("softmax is stable for huge logits:", softmax([1000.0, 1001.0]))` },
      { lang: 'python', check: false, title: 'PyTorch / SciPy equivalents (not run here)', code: `import torch
import torch.nn.functional as F
from scipy.stats import entropy

logits = torch.tensor([[2.0, 1.0, 0.0]])
target = torch.tensor([1])
print(F.cross_entropy(logits, target))          # applies log-softmax internally
print(F.softmax(logits / 0.5, dim=-1))          # temperature 0.5
print(entropy([0.5, 0.25, 0.25], base=2))       # 1.5
print(entropy([0.5, 0.5], [0.9, 0.1]))          # KL divergence when q is given` }
    ],
    viz: {
      title: 'Softmax with temperature, then cross-entropy loss',
      input: '2 1 0 | 1 | 0',
      inputLabel: 'logits | temperature T | index of the correct class',
      gen: function (input) {
        var parts = String(input).split('|');
        var z = nums(parts[0], 'logits');
        var T = Number((parts[1] || '1').trim()), y = Math.floor(Number((parts[2] || '0').trim()));
        if (z.length < 2 || z.length > 8) throw new Error('Use 2 to 8 logits, e.g. "2 1 0 | 1 | 0"');
        if (!(T > 0) || T > 100) throw new Error('Temperature must be > 0 and ≤ 100');
        if (!(y >= 0 && y < z.length)) throw new Error('Correct class index must be 0..' + (z.length - 1));
        var labs = z.map(function (_, i) { return 'class ' + i; });
        function sm(t) { var s = z.map(function (v) { return v / t; }), m = Math.max.apply(null, s), e = s.map(function (v) { return Math.exp(v - m); }), tot = e.reduce(function (a, b) { return a + b; }, 0); return e.map(function (v) { return v / tot; }); }
        function ent(p) { return -p.reduce(function (a, v) { return a + (v > 0 ? v * Math.log2(v) : 0); }, 0); }
        var scaled = z.map(function (v) { return r4(v / T); }), m = Math.max.apply(null, scaled);
        var shifted = scaled.map(function (v) { return r4(v - m); }), ex = shifted.map(function (v) { return r4(Math.exp(v)); });
        var tot = ex.reduce(function (a, b) { return a + b; }, 0), p = sm(T), yh = {}; yh[y] = 'sel';
        var frames = [
          { narr: 'Raw scores (logits) from a model. They can be any real numbers, even negative, and do not add up to 1. The correct class is <b>class ' + y + '</b>.', parts: [{ type: 'bars', label: 'logits z', values: z, idxLabels: labs, hl: yh }] },
          { narr: 'Divide by temperature T = <b>' + T + '</b>. ' + (T < 1 ? 'T &lt; 1 stretches the gaps → sharper probabilities.' : T > 1 ? 'T &gt; 1 shrinks the gaps → flatter probabilities.' : 'T = 1 leaves them unchanged.'), parts: [{ type: 'bars', label: 'z / T', values: scaled, idxLabels: labs }, { type: 'code', lang: 'python', code: 'scaled = [v / T for v in z]', hl: { 1: 'cur' } }] },
          { narr: 'Subtract the max (' + m + ') so the biggest becomes 0. This does not change the result (it cancels in the division) but stops e<sup>1000</sup> from overflowing.', parts: [{ type: 'bars', label: 'z/T − max', values: shifted, idxLabels: labs }, { type: 'code', lang: 'python', code: 'm = max(scaled)\nshifted = [v - m for v in scaled]', hl: { 2: 'cur' } }] },
          { narr: 'Exponentiate: every value becomes positive; bigger logits win by a multiplicative factor. Sum = <b>' + r4(tot) + '</b>.', parts: [{ type: 'bars', label: 'e^(shifted)', values: ex, idxLabels: labs }, { type: 'vars', vals: { sum: r4(tot) } }] },
          { narr: 'Divide by the sum → <b>probabilities</b> that add up to 1. Entropy = <b>' + r4(ent(p)) + ' bits</b> (max possible ' + r4(Math.log2(z.length)) + ').', parts: [{ type: 'bars', label: 'softmax probabilities', values: p.map(r4), idxLabels: labs, hl: yh }, { type: 'vars', vals: { 'sum': r4(p.reduce(function (a, b) { return a + b; }, 0)), 'entropy (bits)': r4(ent(p)) } }] },
          { narr: 'Cross-entropy loss = −ln(p[correct]) = −ln(' + r4(p[y]) + ') = <b>' + r4(-Math.log(p[y])) + '</b> nats. ' + (p[y] > 0.5 ? 'The model leans the right way; loss is small.' : '<span class="c-r">The model gives the right class little probability, so the loss is big.</span>'), parts: [{ type: 'bars', label: 'probabilities (purple = correct class)', values: p.map(r4), idxLabels: labs, hl: yh }, { type: 'vars', vals: { 'p[correct]': r4(p[y]), 'loss −ln p': r4(-Math.log(p[y])) }, hl: { 'loss −ln p': p[y] > 0.5 ? 'ok' : 'bad' } }] }
        ];
        var temps = [0.25, 0.5, 1, 2, 5], rows = temps.map(function (t) { var q = sm(t); return [t, q.map(function (v) { return Math.round(v * 1000) / 1000; }).join(', '), r4(ent(q)), r4(-Math.log(q[y]))]; });
        frames.push({ narr: 'Temperature sweep on the same logits: low T is nearly greedy (low entropy), high T is nearly uniform (high entropy). In LLMs this is exactly the creativity vs reliability knob.', parts: [{ type: 'table', columns: ['T', 'probabilities', 'entropy (bits)', 'loss for class ' + y], rows: rows, hl: { 0: 'cur', 4: 'win' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Entropy of a loaded die', html: `<p>P = [0.5, 0.1, 0.1, 0.1, 0.1, 0.1]. H = −(0.5·log<sub>2</sub>0.5 + 5·0.1·log<sub>2</sub>0.1) = 0.5 + 1.661 = <b>2.161 bits</b>, less than a fair die's log<sub>2</sub>6 = 2.585. More predictable → less entropy.</p>`, code: { lang: 'python', code: `import math\np = [0.5] + [0.1] * 5\nprint(-sum(x * math.log2(x) for x in p))  # 2.161` } },
      { title: 'Cross-entropy loss over a batch', html: `<p>Three examples; the model gives the correct class probabilities 0.7, 0.8 and 0.4. Loss = (−ln 0.7 − ln 0.8 − ln 0.4)/3 = (0.357 + 0.223 + 0.916)/3 = <b>0.499</b>. The one poor prediction contributes most of the loss.</p>${H.table(['example', 'q<sub>correct</sub>', '−ln q'], [['1', '0.7', '0.357'], ['2', '0.8', '0.223'], ['3', '0.4', '0.916'], ['mean', '', '0.499']])}` },
      { title: 'Perplexity of a language model', html: `<p>An LLM's average cross-entropy on some text is 2.0 nats per token. Its <b>perplexity</b> is e<sup>2.0</sup> ≈ 7.39: on average it is as unsure as if choosing uniformly among about 7.4 tokens. Lower perplexity = better next-token prediction.</p>` },
      { title: 'KL is not symmetric', html: `<p>P = [0.5, 0.5], Q = [0.9, 0.1]. D<sub>KL</sub>(P‖Q) = 0.5 ln(0.5/0.9) + 0.5 ln(0.5/0.1) = 0.511 nats. D<sub>KL</sub>(Q‖P) = 0.9 ln 1.8 + 0.1 ln 0.2 = 0.368 nats. Different numbers, so which direction you use is a modelling choice.</p>` }
    ],
    deepDive: `<p><b>Cross-entropy = maximum likelihood.</b> If the model gives probability q(y<sub>i</sub> | x<sub>i</sub>) to each correct label, the likelihood of the dataset is Π q(y<sub>i</sub> | x<sub>i</sub>). Taking −log and averaging gives the mean cross-entropy. So minimising cross-entropy is the same as maximising likelihood. For binary labels it becomes −[y log q + (1 − y) log(1 − q)], binary cross-entropy. Its gradient with respect to the logits is simply (softmax − one-hot), which is why softmax and cross-entropy are always fused in code (<code>F.cross_entropy</code> takes logits, not probabilities).</p>
      <p><b>Numerical stability.</b> Use log-sum-exp: log Σ e<sup>z<sub>j</sub></sup> = m + log Σ e<sup>z<sub>j</sub> − m</sup>. Never compute log(softmax(z)) in two steps; use log_softmax. Clip probabilities (e.g. 1e-12) if you must take logs of predicted probabilities, or a single 0 gives an infinite loss.</p>
      <p><b>Sampling beyond temperature.</b> Top-k keeps only the k most likely tokens; top-p (nucleus) keeps the smallest set whose probabilities sum to p; min-p drops tokens below a fraction of the top probability. Temperature reshapes, top-k/p truncate, then you renormalise and sample. Label smoothing (target 0.9 instead of 1.0) and temperature scaling (fitting one T on validation data) are standard fixes for over-confident, badly calibrated classifiers.</p>
      <p><b>Information theory links.</b> Shannon's source coding theorem: no lossless code can use fewer than H(P) bits per symbol on average; cross-entropy is the cost when your code is built for Q. Mutual information I(X;Y) = H(X) − H(X | Y) drives decision-tree splits (information gain) and feature selection.</p>`,
    aiEra: `<p><b>What AI changes:</b> every LLM is trained by minimising cross-entropy on the next token, evaluated by perplexity, decoded with temperature/top-p, and aligned with a KL penalty that keeps it close to its base model (RLHF, PPO, DPO). Token log-probabilities from the API (<code>logprobs</code>) let you measure the model's confidence, detect uncertain answers and build classifiers. <b>Use AI as a partner:</b> ask it to compute the entropy of the top-20 logprobs to flag answers where the model is guessing.</p>
      <p><b>Where AI goes wrong:</b> confusing log bases (bits vs nats), passing probabilities to a loss that expects logits (double softmax), computing softmax without subtracting the max, and claiming T = 0 is "deterministic" (ties and batched floating-point maths still cause variation). <b>What you must still own:</b> choosing temperature per task (low for extraction and code, higher for brainstorming), and knowing that low loss on training data with high loss on validation data is overfitting.</p>`,
    problems: [{
      title: 'Entropy of a Distribution in Bits', level: 'Easy', tags: ['entropy', 'information theory'], companies: ['Google DeepMind', 'OpenAI'],
      statement: `<p>Given a probability distribution <code>p</code> (non-negative, sums to 1), return its Shannon entropy in <b>bits</b>: −Σ p<sub>i</sub> log<sub>2</sub> p<sub>i</sub>. Terms with p<sub>i</sub> = 0 contribute 0.</p>`,
      constraints: `1 ≤ len(p) ≤ 10<sup>5</sup>. Compared to 1e-5.`,
      example: `<p>p = [0.5, 0.25, 0.25] → 0.5·1 + 0.25·2 + 0.25·2 = ${H.c('g', '1.5')} bits.</p>`,
      brute: { why: `<p>Estimate entropy by sampling: draw many outcomes from p and average the surprise −log<sub>2</sub> p of each draw. It converges to the right answer but is noisy and slow. Entropy is an exact expectation, so compute it directly.</p>`, code: `import math
import random

def entropy_sampled(p, n=200000, seed=0):
    rng = random.Random(seed)
    idx = rng.choices(range(len(p)), weights=p, k=n)
    return sum(-math.log2(p[i]) for i in idx) / n

print(entropy_sampled([0.5, 0.25, 0.25]))` },
      mcq: { q: 'Which distribution over 4 outcomes has the highest entropy?', options: ['[1, 0, 0, 0]', '[0.7, 0.1, 0.1, 0.1]', '[0.25, 0.25, 0.25, 0.25]', '[0.5, 0.5, 0, 0]'], answer: 2, explain: 'Entropy is maximised by the uniform distribution: log<sub>2</sub>4 = 2 bits. [0.5, 0.5, 0, 0] has 1 bit, [1, 0, 0, 0] has 0.' },
      hints: [`<p>Entropy is the expected value of the surprise −log<sub>2</sub> p<sub>i</sub>, weighted by p<sub>i</sub>.</p>`, `<p>Use <code>math.log2</code>; skip zero probabilities because 0 · log 0 is defined as 0 (and log 0 would crash).</p>`, `<p>[1.0] → 0 bits; uniform over n → log<sub>2</sub> n. Recipe: sum(-x * log2(x) for x in p if x &gt; 0).</p>`],
      solution: {
        approach: `<p>Direct formula, one pass, skipping zeros. The result is the minimum average number of yes/no questions needed to identify an outcome.</p>`,
        code: `import math

def entropy_bits(p):
    h = 0.0
    for x in p:
        if x > 0:                     # 0 * log(0) counts as 0
            h -= x * math.log2(x)     # add this outcome's weighted surprise
    return h`,
        dry: { head: ['p<sub>i</sub>', '−log<sub>2</sub> p<sub>i</sub>', 'p<sub>i</sub> · surprise', 'running H'], rows: [['0.5', '1', '0.5', '0.5'], ['0.25', '2', '0.5', '1.0'], ['0.25', '2', '0.5', '<span class="c-g">1.5</span>']] },
        complexity: `<p>O(n) time, O(1) space.</p>`,
        followUps: ['Return it in nats (use math.log).', 'Compute cross-entropy H(P, Q) and KL(P‖Q) for a second distribution Q.']
      },
      tests: { sig: 'double[] -> double', fn: 'entropy_bits', cmp: 'float', cases: [[[[0.5, 0.5]], 1.0], [[[1.0]], 0.0], [[[0.25, 0.25, 0.25, 0.25]], 2.0], [[[0.9, 0.1]], 0.4689955935892812], [[[0.5, 0.25, 0.25]], 1.5], [[[0.7, 0.2, 0.1, 0.0]], 1.1567796494470395], [[[0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125]], 3.0]] }
    }]
  });

  /* Test cases for the practice set (expected values computed with the reference solutions). */
  var PT = {
    dice_sum_prob: { sig: 'int -> double', fn: 'dice_sum_prob', cmp: 'float', cases: [[[2], 0.027777777777777776], [[7], 0.16666666666666666], [[12], 0.027777777777777776], [[1], 0.0], [[13], 0.0], [[8], 0.1388888888888889], [[4], 0.08333333333333333]] },
    sample_variance: { sig: 'double[] -> double', fn: 'sample_variance', cmp: 'float', cases: [[[[2, 4, 4, 4, 5, 5, 7, 9]], 4.571428571428571], [[[1, 2, 3]], 1.0], [[[5]], 0.0], [[[10, 10, 10]], 0.0], [[[1.5, 2.5]], 0.5], [[[-1, 1, -1, 1]], 1.3333333333333333]] },
    var_weighted_sum: { sig: 'double[] double[] -> double', fn: 'var_weighted_sum', cmp: 'float', cases: [[[[4, 9], [1, 1]], 13], [[[4, 9], [1, -1]], 13], [[[1, 1, 1], [0.5, 0.5, 0.5]], 0.75], [[[2], [3]], 18], [[[0, 5], [10, 2]], 20], [[[1, 2, 3, 4], [1, 1, 1, 1]], 10]] },
    cross_entropy_loss: { sig: 'double[][] int[] -> double', fn: 'cross_entropy_loss', cmp: 'float', cases: [[[[[0.9, 0.1], [0.2, 0.8]], [0, 1]], 0.164252033486018], [[[[0.5, 0.5]], [0]], 0.6931471805599453], [[[[0.7, 0.2, 0.1], [0.1, 0.1, 0.8], [0.3, 0.4, 0.3]], [0, 2, 1]], 0.49870307570903244], [[[[1.0, 0.0]], [0]], 0.0], [[[[0.25, 0.25, 0.25, 0.25]], [3]], 1.3862943611198906], [[[[0.01, 0.99]], [0]], 4.605170185988091]] },
    prob_at_least: { sig: 'int int double -> double', fn: 'prob_at_least', cmp: 'float', cases: [[[10, 8, 0.5], 0.0546875], [[5, 0, 0.3], 0.9999999999999998], [[5, 6, 0.3], 0], [[20, 15, 0.6], 0.12559897272303744], [[3, 1, 0.5], 0.875], [[100, 60, 0.5], 0.028443966820490395], [[8, 2, 0.1], 0.18689527000000003]] },
    reroll_ev: { sig: 'int -> double', fn: 'reroll_ev', cmp: 'float', cases: [[[6], 4.25], [[2], 1.75], [[1], 1.0], [[4], 3.0], [[10], 6.75], [[20], 13.0], [[3], 2.3333333333333335]] },
    softmax_t: { sig: 'double[] double -> double[]', fn: 'softmax_t', cmp: 'float', cases: [[[[2, 1, 0], 1.0], [0.6652409557748218, 0.24472847105479764, 0.09003057317038046]], [[[2, 1, 0], 0.5], [0.8668133321973349, 0.11731042782619838, 0.015876239976466765]], [[[2, 1, 0], 2.0], [0.506480391055654, 0.3071958857184984, 0.1863237232258476]], [[[1, 1, 1], 1.0], [0.3333333333333333, 0.3333333333333333, 0.3333333333333333]], [[[1000, 1001], 1.0], [0.2689414213699951, 0.7310585786300049]], [[[3], 0.7], [1.0]], [[[0, 5], 10.0], [0.37754066879814546, 0.6224593312018546]]] },
    proportion_ci: { sig: 'int int double -> double[]', fn: 'proportion_ci', cmp: 'float', cases: [[[50, 100, 0.95], [0.4020018007729973, 0.5979981992270027]], [[120, 400, 0.95], [0.2550915834072897, 0.34490841659271027]], [[30, 100, 0.9], [0.22462333747372226, 0.3753766625262777]], [[500, 1000, 0.99], [0.4592725626849012, 0.5407274373150988]], [[1, 10, 0.95], [-0.08593850969136843, 0.28593850969136847]], [[90, 100, 0.95], [0.8412010804637984, 0.9587989195362017]]] },
    birthday_prob: { sig: 'int -> double', fn: 'birthday_prob', cmp: 'float', cases: [[[1], 0.0], [[2], 0.002739726027397249], [[23], 0.5072972343239857], [[50], 0.9703735795779884], [[10], 0.11694817771107768], [[70], 0.9991595759651571], [[366], 1.0]] },
    class_posteriors: { sig: 'double[] double[] -> double[]', fn: 'class_posteriors', cmp: 'float', cases: [[[[0.5, 0.5], [0.8, 0.2]], [0.8, 0.2]], [[[0.7, 0.2, 0.1], [0.1, 0.5, 0.9]], [0.2692307692307692, 0.38461538461538464, 0.3461538461538462]], [[[0.3333333333333333, 0.3333333333333333, 0.3333333333333333], [0.2, 0.2, 0.6]], [0.2, 0.2, 0.6]], [[[0.99, 0.01], [0.05, 0.9]], [0.8461538461538461, 0.15384615384615385]], [[[0.6, 0.4], [1.0, 1.0]], [0.6, 0.4]], [[[0.2, 0.3, 0.5], [0.0, 0.5, 0.1]], [0.0, 0.7499999999999999, 0.25]]] },
    binomial_exact_vs_normal: { sig: 'int int double -> double[]', fn: 'binomial_exact_vs_normal', cmp: 'float', cases: [[[100, 60, 0.5], [0.028443966820490395, 0.02871655981600174]], [[50, 30, 0.5], [0.10131937553227033, 0.10154589378858403]], [[200, 30, 0.1], [0.01632656593176653, 0.012572380586678644]], [[1000, 520, 0.5], [0.10872414660207047, 0.10873411307177117]], [[40, 10, 0.2], [0.26822288570851643, 0.2766149833285353]], [[30, 20, 0.6], [0.29147186122349666, 0.28807506101528946]]] },
    ab_sample_size: { sig: 'double double double double -> int', fn: 'ab_sample_size', cases: [[[0.1, 0.12, 0.05, 0.8], 3841], [[0.05, 0.06, 0.05, 0.8], 8158], [[0.2, 0.25, 0.05, 0.9], 1464], [[0.5, 0.55, 0.01, 0.8], 2329], [[0.1, 0.15, 0.05, 0.8], 686], [[0.3, 0.2, 0.05, 0.8], 294]] },
    sequential_bayes: { sig: 'double double double int[] -> double', fn: 'sequential_bayes', cmp: 'float', cases: [[[0.01, 0.99, 0.95, [1]], 0.16666666666666655], [[0.01, 0.99, 0.95, [1, 1]], 0.7983870967741933], [[0.01, 0.99, 0.95, [1, 0]], 0.0021008403361344537], [[0.5, 0.8, 0.8, []], 0.5], [[0.2, 0.9, 0.9, [0, 0, 1]], 0.027027027027027018], [[0.001, 0.95, 0.99, [1, 1, 1]], 0.9988361716454599]] },
    peeking_false_positive_rate: { sig: 'int int int int -> double', fn: 'peeking_false_positive_rate', cmp: 'float', cases: [[[200, 500, 1, 1], 0.075], [[200, 500, 10, 1], 0.195], [[200, 1000, 20, 2], 0.28], [[100, 400, 4, 3], 0.15], [[300, 200, 2, 5], 0.07666666666666666], [[150, 600, 30, 9], 0.23333333333333334]] },
    permutation_test: { sig: 'double[] double[] int int -> double', fn: 'permutation_test', cmp: 'float', cases: [[[[1, 2, 3], [4, 5, 6], 999, 0], 0.077], [[[1, 2, 3, 4], [1, 2, 3, 4], 500, 1], 1.0], [[[10, 12, 11, 13], [20, 19, 21, 22], 999, 2], 0.034], [[[5, 6, 7, 8, 9], [6, 7, 8, 9, 10], 999, 3], 0.411], [[[0, 0, 1], [1, 1, 1], 200, 4], 0.3781094527363184], [[[3.2, 2.9, 3.5], [3.0, 3.1, 3.6], 400, 5], 1.0]] }
  };

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Probability of a Dice Sum', level: 'Easy', tags: ['counting', 'sample space'], companies: ['Jane Street', 'Optiver'],
    statement: `<p>Two fair six-sided dice are rolled. Return the probability that their sum equals <code>target</code>. Return 0 for impossible sums.</p>`,
    constraints: `target is any integer. Compared to 1e-5.`,
    example: `<p>target = 7 → the 6 pairs (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) out of 36 → ${H.c('g', '6/36 = 0.1667')}. 7 is the most likely sum.</p>${H.table(['sum', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'], [['ways', '1', '2', '3', '4', '5', '6', '5', '4', '3', '2', '1']])}`,
    brute: { why: `<p>Roll the dice 100,000 times with a seeded generator and count. It gives about 0.166 with noise, never the exact 1/6. There are only 36 equally likely outcomes, so just count them.</p>`, code: `import random

def dice_sum_sim(target, n=100000, seed=0):
    rng = random.Random(seed)
    hits = sum(1 for _ in range(n) if rng.randint(1, 6) + rng.randint(1, 6) == target)
    return hits / n

print(dice_sum_sim(7))` },
    mcq: { q: 'Why is (3, 4) counted separately from (4, 3)?', options: ['The dice are different objects, so these are two distinct equally likely outcomes', 'To make the total 36', 'Because order matters only for 7', 'It should not be'], answer: 0, explain: 'Think of a red and a blue die. Red 3 + blue 4 and red 4 + blue 3 are different outcomes, each with probability 1/36. Counting unordered pairs gives 21 outcomes that are NOT equally likely.' },
    hints: [`<p>The sample space is all 36 ordered pairs (a, b), each with probability 1/36.</p>`, `<p>Two nested loops over 1..6, count pairs with a + b == target.</p>`, `<p>Targets below 2 or above 12 give 0 automatically. Recipe: ways / 36.</p>`],
    solution: {
      approach: `<p>Equally likely outcomes → probability = favourable ÷ total. Enumerate the 36 ordered pairs and count the matches. (Closed form: (6 − |target − 7|)/36 for 2 ≤ target ≤ 12.)</p>`,
      code: `def dice_sum_prob(target):
    ways = 0
    for a in range(1, 7):          # red die
        for b in range(1, 7):      # blue die
            if a + b == target:
                ways += 1
    return ways / 36`,
      complexity: `<p>O(36) = O(1) time and space.</p>`,
      followUps: ['Generalise to k dice with s sides (dynamic programming over sums).', 'What is the expected sum? (7, by linearity: 3.5 + 3.5)']
    },
    tests: PT.dice_sum_prob
  });

  practice.push({
    title: 'Sample Variance with Bessel’s Correction', level: 'Easy', tags: ['variance', 'statistics'], companies: ['Amazon', 'Two Sigma'],
    statement: `<p>Return the <b>sample</b> variance of <code>data</code>: Σ(x − x̄)<sup>2</sup> / (n − 1). Return 0.0 when there are fewer than 2 values. Do not use the <code>statistics</code> module; write the loop.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>. Compared to 1e-5.`,
    example: `<p>[2, 4, 4, 4, 5, 5, 7, 9]: mean 5, squared deviations sum to 32, so 32/7 = ${H.c('g', '4.5714')}. The population variance would be 32/8 = 4.0.</p>`,
    brute: { why: `<p>The one-pass shortcut (Σx<sup>2</sup> − n·x̄<sup>2</sup>)/(n − 1) looks clever but suffers catastrophic cancellation: for values like 10<sup>9</sup> + small noise, two huge, almost equal numbers are subtracted and the answer can even come out negative. The two-pass method is stable.</p>`, code: `def sample_variance_naive(data):
    n = len(data)
    if n < 2:
        return 0.0
    s = sum(data)
    s2 = sum(x * x for x in data)
    return (s2 - s * s / n) / (n - 1)      # unstable for large, close values

print(sample_variance_naive([1e9 + 1, 1e9 + 2, 1e9 + 3]))` },
    mcq: { q: 'You have the heights of every employee in a 40-person company and want the variance of that group. Which divisor?', options: ['n (it is the whole population)', 'n − 1', 'n + 1', 'n − 2'], answer: 0, explain: 'If you have the whole population you are not estimating anything, so divide by n. Use n − 1 only when the data is a sample used to estimate a bigger population.' },
    hints: [`<p>First pass: compute the mean. Second pass: add up squared distances from that mean.</p>`, `<p>Divide by n − 1, not n, because the mean was estimated from these same values.</p>`, `<p>Guard n &lt; 2 (one value has no spread to estimate; return 0.0). Recipe: mean → SS → SS/(n−1).</p>`],
    solution: {
      approach: `<p>Two-pass algorithm: mean first, then the sum of squared deviations, divided by n − 1 (Bessel's correction makes it an unbiased estimate of the population variance).</p>`,
      code: `def sample_variance(data):
    n = len(data)
    if n < 2:
        return 0.0
    mean = sum(data) / n
    ss = 0.0
    for x in data:
        ss += (x - mean) ** 2        # squared distance from the mean
    return ss / (n - 1)              # n - 1: sample, not population`,
      complexity: `<p>O(n) time, O(1) extra space.</p>`,
      followUps: ['Write Welford’s one-pass online version for streaming data.', 'Return both pvariance and variance and explain when they differ most (small n).']
    },
    tests: PT.sample_variance
  });

  practice.push({
    title: 'Variance of a Weighted Sum of Independent Variables', level: 'Easy', tags: ['variance', 'independence'], companies: ['Citadel', 'Goldman Sachs'],
    statement: `<p>Independent random variables X<sub>i</sub> have variances <code>variances[i]</code>. Return Var(Σ w<sub>i</sub> X<sub>i</sub>) for the given <code>weights</code>.</p>`,
    constraints: `Same-length lists, 1 ≤ n ≤ 10<sup>5</sup>, weights may be negative. Compared to 1e-5.`,
    example: `<p>Var(X) = 4, Var(Y) = 9. Var(X + Y) = 13 and also Var(X − Y) = ${H.c('g', '13')}: subtracting an independent variable <b>adds</b> its variance, because (−1)<sup>2</sup> = 1.</p>${H.table(['combination', 'variance'], [['X + Y', '4 + 9 = 13'], ['X − Y', '4 + 9 = 13'], ['3X', '9 · 4 = 36'], ['(X + Y)/2', '13/4 = 3.25']])}`,
    brute: { why: `<p>Simulate: draw each X<sub>i</sub> from some distribution with the right variance, form the weighted sum many times and take the sample variance. Noisy, slow and it needs you to invent distributions. The rule Var(aX) = a<sup>2</sup>Var(X) plus additivity for independent variables gives the exact answer.</p>`, code: `import random
import statistics

def var_weighted_sum_sim(variances, weights, n=100000, seed=0):
    rng = random.Random(seed)
    sums = [sum(w * rng.gauss(0, v ** 0.5) for v, w in zip(variances, weights)) for _ in range(n)]
    return statistics.variance(sums)

print(var_weighted_sum_sim([4, 9], [1, -1]))` },
    mcq: { q: 'Two independent measurements each have variance 9. What is the variance of their average?', options: ['9', '4.5', '18', '3'], answer: 1, explain: 'Var((X + Y)/2) = (1/4)(9 + 9) = 4.5. Averaging n independent copies divides variance by n.' },
    hints: [`<p>Scaling a variable by w multiplies its variance by w<sup>2</sup> (the sign disappears).</p>`, `<p>For independent variables, variances of the scaled pieces simply add; covariance terms are all 0.</p>`, `<p>Return Σ w<sub>i</sub><sup>2</sup> · Var<sub>i</sub>. If the variables were correlated, you would add 2 Σ w<sub>i</sub>w<sub>j</sub>Cov<sub>ij</sub>.</p>`],
    solution: {
      approach: `<p>Var(Σ w<sub>i</sub>X<sub>i</sub>) = Σ w<sub>i</sub><sup>2</sup> Var(X<sub>i</sub>) when the X<sub>i</sub> are independent. One pass.</p>`,
      code: `def var_weighted_sum(variances, weights):
    total = 0.0
    for v, w in zip(variances, weights):
        total += w * w * v           # Var(wX) = w^2 Var(X); independent -> add
    return total`,
      complexity: `<p>O(n) time, O(1) space.</p>`,
      followUps: ['Extend to correlated variables with a covariance matrix: w<sup>T</sup> Σ w.', 'How does the variance of an average of n i.i.d. variables scale with n?']
    },
    tests: PT.var_weighted_sum
  });

  practice.push({
    title: 'Cross-Entropy Loss for a Batch of Predictions', level: 'Easy', tags: ['cross-entropy', 'loss', 'classification'], companies: ['Meta', 'NVIDIA'],
    statement: `<p><code>probs[i]</code> is a model's predicted probability distribution over classes for example i, and <code>labels[i]</code> is the correct class index. Return the mean cross-entropy loss −(1/n) Σ ln(probs[i][labels[i]]), using natural log. Clip each probability below at 1e-12 so a 0 does not give infinity.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>4</sup>, each row sums to 1. Compared to 1e-5.`,
    example: `<p>probs = [[0.9, 0.1], [0.2, 0.8]], labels = [0, 1] → (−ln 0.9 − ln 0.8)/2 = (0.1054 + 0.2231)/2 = ${H.c('g', '0.1643')}.</p>`,
    brute: { why: `<p>Computing the full cross-entropy −Σ<sub>c</sub> p<sub>c</sub> ln q<sub>c</sub> with a one-hot target loops over every class, but all terms except the correct class are multiplied by 0. With 50,000 classes (an LLM vocabulary) that is 49,999 wasted multiplications per example.</p>`, code: `import math

def ce_full(probs, labels):
    total = 0.0
    for row, y in zip(probs, labels):
        target = [1.0 if c == y else 0.0 for c in range(len(row))]   # one-hot
        total += -sum(t * math.log(max(q, 1e-12)) for t, q in zip(target, row))
    return total / len(labels)

print(ce_full([[0.9, 0.1], [0.2, 0.8]], [0, 1]))` },
    mcq: { q: 'A model gives the correct class probability 0.01. What is the loss for that example?', options: ['0.01', 'about 0.99', 'about 4.6', 'infinity'], answer: 2, explain: '−ln(0.01) = 4.605. Confident wrong answers are punished heavily, which is exactly what pushes models to be calibrated.' },
    hints: [`<p>With a one-hot target, cross-entropy reduces to −ln of the probability given to the correct class.</p>`, `<p>Index each row with its label: <code>row[y]</code>. Use <code>max(q, 1e-12)</code> before the log.</p>`, `<p>Average over the batch. A perfect prediction (q = 1) contributes 0. Recipe: mean of −ln(max(row[y], 1e-12)).</p>`],
    solution: {
      approach: `<p>Pick out the probability of the correct class for each example, take −ln, average. This is exactly what <code>torch.nn.functional.nll_loss</code> does on log-probabilities.</p>`,
      code: `import math

def cross_entropy_loss(probs, labels):
    eps = 1e-12                          # avoid log(0)
    total = 0.0
    for row, y in zip(probs, labels):
        total += -math.log(max(row[y], eps))
    return total / len(labels)`,
      complexity: `<p>O(n) time (one lookup per example), O(1) space.</p>`,
      followUps: ['Take raw logits instead and fuse log-softmax for stability (log-sum-exp).', 'Add label smoothing with ε = 0.1.']
    },
    tests: PT.cross_entropy_loss
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Binomial Tail: At Least k Successes', level: 'Medium', tags: ['binomial', 'tail probability'], companies: ['Google', 'Amazon'],
    statement: `<p>Each of <code>n</code> independent requests succeeds with probability <code>p</code>. Return P(at least <code>k</code> succeed). k may be ≤ 0 (answer 1) or &gt; n (answer 0).</p>`,
    constraints: `0 ≤ n ≤ 1000, 0 ≤ p ≤ 1. Compared to 1e-5.`,
    example: `<p>n = 10, k = 8, p = 0.5 → (C(10,8) + C(10,9) + C(10,10))/1024 = (45 + 10 + 1)/1024 = ${H.c('g', '0.0547')}.</p>${H.table(['k', 'P(X = k)'], [['8', '0.0439'], ['9', '0.0098'], ['10', '0.0010'], ['P(X ≥ 8)', '0.0547']])}`,
    brute: { why: `<p>Enumerate all 2<sup>n</sup> outcome patterns and keep those with ≥ k successes. Exponential. The pmf already groups patterns by their count, so summing n − k + 1 pmf terms is enough.</p>`, code: `from itertools import product

def prob_at_least_brute(n, k, p):
    total = 0.0
    for pat in product([0, 1], repeat=n):
        s = sum(pat)
        if s >= k:
            total += p ** s * (1 - p) ** (n - s)
    return total

print(prob_at_least_brute(10, 8, 0.5))` },
    mcq: { q: 'P(at least 1 of 5) is easiest to compute as...', options: ['sum of pmf from 1 to 5', '1 − P(X = 0)', 'P(X = 1) · 5', '5p'], answer: 1, explain: 'One term instead of five: 1 − (1 − p)<sup>5</sup>. In general sum whichever side of the tail has fewer terms.' },
    hints: [`<p>"At least k" = P(X = k) + P(X = k + 1) + ... + P(X = n).</p>`, `<p>Use <code>math.comb</code> inside a loop from max(k, 0) to n. If k is small, the complement 1 − P(X ≤ k − 1) has fewer terms.</p>`, `<p>k &gt; n → empty sum = 0. k ≤ 0 → whole distribution = 1. Recipe: sum pmf over range(max(k,0), n+1).</p>`],
    solution: {
      approach: `<p>Sum the binomial pmf over the tail. For very large n you would switch to logs (<code>math.lgamma</code>) or the normal approximation from the Hard set.</p>`,
      code: `import math

def prob_at_least(n, k, p):
    total = 0.0
    for i in range(max(k, 0), n + 1):
        total += math.comb(n, i) * p ** i * (1 - p) ** (n - i)
    return total`,
      complexity: `<p>O(n) pmf terms, each O(n) for comb in the worst case; O(1) space. Fine for n ≤ 1000.</p>`,
      followUps: ['Find the smallest k with P(X ≥ k) ≤ 0.05 (a one-sided critical value).', 'Compare with the normal approximation with continuity correction.']
    },
    tests: PT.prob_at_least
  });

  practice.push({
    title: 'Expected Value of a Dice Game with One Re-roll', level: 'Medium', tags: ['expectation', 'optimal stopping'], companies: ['Jane Street', 'SIG', 'Hudson River Trading'],
    statement: `<p>You roll a fair die with <code>sides</code> faces (1..sides) and win the face value. After the first roll you may re-roll <b>once</b> and must keep the second result. Playing optimally, what is your expected winnings?</p>`,
    constraints: `1 ≤ sides ≤ 10<sup>6</sup>. Compared to 1e-5.`,
    example: `<p>sides = 6: a re-roll is worth 3.5 on average, so keep 4, 5, 6 and re-roll 1, 2, 3. EV = (3.5 + 3.5 + 3.5 + 4 + 5 + 6)/6 = ${H.c('g', '4.25')}, up from 3.5.</p>${H.table(['first roll', 'keep or re-roll', 'value'], [['1, 2, 3', 're-roll (3.5 &gt; face)', '3.5 each'], ['4, 5, 6', 'keep', '4, 5, 6']])}`,
    brute: { why: `<p>Try every threshold t ("re-roll if the face is below t") and simulate or compute the EV of each, then take the best. It works but it searches for something you can reason out: re-roll exactly when the face is below the EV of a fresh roll.</p>`, code: `def reroll_ev_brute(sides):
    best = 0.0
    fresh = (sides + 1) / 2
    for t in range(1, sides + 2):            # re-roll faces < t
        ev = sum(fresh if f < t else f for f in range(1, sides + 1)) / sides
        best = max(best, ev)
    return best

print(reroll_ev_brute(6))` },
    mcq: { q: 'With two optional re-rolls on a 6-sided die, what threshold applies to the FIRST roll?', options: ['Keep 4 or more', 'Keep 5 or more (the value of continuing is 4.25)', 'Always re-roll', 'Keep 6 only'], answer: 1, explain: 'Continuing gives you the one-re-roll game, worth 4.25. So keep only faces above 4.25: 5 and 6. Work backwards from the last decision.' },
    hints: [`<p>After the first roll, compare what you hold with the value of a fresh roll, (sides + 1)/2.</p>`, `<p>Optimal play takes max(face, fresh EV) for every face; average that over all faces.</p>`, `<p>sides = 1 → always 1. Recipe: fresh = (s+1)/2; return mean of max(f, fresh) for f in 1..s. This is backward induction.</p>`],
    solution: {
      approach: `<p>Backward induction: the last decision is worth (sides + 1)/2. At the first roll, keep the face if it beats that, otherwise re-roll. EV = average of max(face, fresh EV).</p>`,
      code: `def reroll_ev(sides):
    fresh = (sides + 1) / 2                  # EV of a roll you must keep
    total = 0.0
    for face in range(1, sides + 1):
        total += max(face, fresh)            # keep if better than re-rolling
    return total / sides`,
      complexity: `<p>O(sides) time, O(1) space (an O(1) closed form exists by summing the two ranges).</p>`,
      followUps: ['Generalise to r re-rolls (iterate the recursion r times).', 'What if each re-roll costs ₹c?']
    },
    tests: PT.reroll_ev
  });

  practice.push({
    title: 'Softmax with Temperature', level: 'Medium', tags: ['softmax', 'temperature', 'llm sampling'], companies: ['OpenAI', 'Anthropic', 'Google'],
    statement: `<p>Return softmax(<code>logits</code> / <code>t</code>) as a list of probabilities. It must not overflow for logits like [1000, 1001].</p>`,
    constraints: `1 ≤ len ≤ 10<sup>5</sup>, t &gt; 0. Compared to 1e-5.`,
    example: `<p>logits [2, 1, 0], t = 0.5 → scaled [4, 2, 0] → e<sup>0</sup>, e<sup>−2</sup>, e<sup>−4</sup> after subtracting 4 → ${H.c('g', '[0.8668, 0.1173, 0.0159]')}. At t = 2 it flattens to [0.506, 0.307, 0.186].</p>`,
    brute: { why: `<p>The textbook formula e<sup>z<sub>i</sub>/t</sup> / Σ e<sup>z<sub>j</sub>/t</sup> overflows: e<sup>1000</sup> is <code>OverflowError</code> in Python and <code>inf</code> in NumPy, giving inf/inf = nan. Small t makes it worse because it multiplies the logits.</p>`, code: `import math

def softmax_naive(logits, t):
    e = [math.exp(z / t) for z in logits]     # overflows for big z / t
    s = sum(e)
    return [x / s for x in e]

print(softmax_naive([2, 1, 0], 0.5))` },
    mcq: { q: 'Why does subtracting max(z) not change the softmax output?', options: ['e<sup>z−m</sup> = e<sup>z</sup>/e<sup>m</sup>, and the common factor e<sup>m</sup> cancels between top and bottom', 'Because max(z) is usually 0', 'It does change it slightly', 'Because softmax is linear'], answer: 0, explain: 'Every term is divided by the same e<sup>m</sup>, so the ratio is unchanged, but now the largest exponent is e<sup>0</sup> = 1 and nothing overflows.' },
    hints: [`<p>Divide by t first; temperature acts on the logits, not on the probabilities.</p>`, `<p>Subtract the maximum scaled logit before calling <code>math.exp</code>. The largest term becomes exactly 1.</p>`, `<p>Normalise by the sum. One logit → [1.0]. Equal logits → uniform. Recipe: s = z/t; m = max(s); e = exp(s − m); return e / sum(e).</p>`],
    solution: {
      approach: `<p>Scale by 1/t, shift by the max for numerical stability, exponentiate, normalise. This is the exact computation an LLM sampler does before drawing a token.</p>`,
      code: `import math

def softmax_t(logits, t):
    scaled = [z / t for z in logits]
    m = max(scaled)                              # stability shift
    exps = [math.exp(z - m) for z in scaled]
    total = sum(exps)
    return [e / total for e in exps]`,
      complexity: `<p>O(n) time, O(n) space for the output.</p>`,
      followUps: ['Add top-k: keep only the k largest probabilities and renormalise.', 'Add top-p (nucleus) sampling with a seeded random.choices.']
    },
    tests: PT.softmax_t
  });

  practice.push({
    title: 'Confidence Interval for a Proportion', level: 'Medium', tags: ['confidence interval', 'normal'], companies: ['Airbnb', 'Spotify'],
    statement: `<p>An eval had <code>successes</code> passes out of <code>n</code> cases. Return the Wald confidence interval <code>[lo, hi]</code> = p̂ ± z·√(p̂(1 − p̂)/n) at confidence level <code>conf</code> (e.g. 0.95), where z = NormalDist().inv_cdf(1 − (1 − conf)/2). Do <b>not</b> clip to [0, 1].</p>`,
    constraints: `1 ≤ n ≤ 10<sup>9</sup>, 0 &lt; conf &lt; 1. Compared to 1e-5.`,
    example: `<p>50/100 at 95%: p̂ = 0.5, SE = 0.05, z = 1.96 → ${H.c('g', '[0.402, 0.598]')}. 500/1000 at 99% (z = 2.576) gives [0.459, 0.541]: ten times more data narrows the interval even at a higher confidence level.</p>`,
    brute: { why: `<p>Simulate: draw many Binomial(n, p̂) counts with a seed, convert to proportions and take the 2.5% and 97.5% points (a parametric bootstrap). That costs n random draws per repetition, while the CLT gives the interval in O(1).</p>`, code: `import random

def proportion_ci_sim(successes, n, reps=2000, seed=0):
    rng = random.Random(seed)
    p = successes / n
    sims = sorted(sum(rng.random() < p for _ in range(n)) / n for _ in range(reps))
    return [sims[int(0.025 * reps)], sims[int(0.975 * reps) - 1]]

print(proportion_ci_sim(50, 100))` },
    mcq: { q: 'You need half the width of a 95% CI. How much more data?', options: ['2×', '4×', '√2×', '1.96×'], answer: 1, explain: 'Width ∝ 1/√n. Halving the width needs √n to double, so n must quadruple.' },
    hints: [`<p>The z multiplier comes from the two-sided confidence: for 95%, the upper 2.5% cut-off, inv_cdf(0.975) ≈ 1.96.</p>`, `<p>SE of a proportion = √(p̂(1 − p̂)/n). Half-width = z · SE.</p>`, `<p>p̂ near 0 or 1 with small n can give a negative lower bound — that is the known weakness of Wald (use Wilson in practice). Recipe: p̂ ± z·SE.</p>`],
    solution: {
      approach: `<p>By the CLT, p̂ is roughly normal with SD √(p(1 − p)/n). Plug in p̂ and take z standard errors either side.</p>`,
      code: `import math
from statistics import NormalDist

def proportion_ci(successes, n, conf):
    p = successes / n
    z = NormalDist().inv_cdf(1 - (1 - conf) / 2)     # 1.96 for 95%
    half = z * math.sqrt(p * (1 - p) / n)
    return [p - half, p + half]`,
      complexity: `<p>O(1) time and space.</p>`,
      followUps: ['Implement the Wilson score interval and compare at 1/10.', 'Solve for the n that gives a half-width of 0.02.']
    },
    tests: PT.proportion_ci
  });

  practice.push({
    title: 'Birthday Paradox: Chance of a Shared Birthday', level: 'Medium', tags: ['complement', 'counting', 'hash collisions'], companies: ['Google', 'Microsoft'],
    statement: `<p>Among <code>k</code> people with birthdays uniform over 365 days (ignore leap years), return P(at least two share a birthday).</p>`,
    constraints: `1 ≤ k ≤ 10<sup>4</sup>. Compared to 1e-5.`,
    example: `<p>k = 23 → P(all different) = (365/365)(364/365)…(343/365) ≈ 0.4927, so ${H.c('g', '0.5073')}: better than a coin flip with just 23 people.</p>${H.table(['k', 'P(shared)'], [['10', '0.117'], ['23', '0.507'], ['50', '0.970'], ['70', '0.9992']])}`,
    brute: { why: `<p>Simulate rooms of k people with a seeded generator and check for duplicates with a set. It works but gives only ~2 correct digits per 10,000 rooms. The complement "all birthdays different" has a simple product formula.</p>`, code: `import random

def birthday_sim(k, rooms=20000, seed=0):
    rng = random.Random(seed)
    hits = 0
    for _ in range(rooms):
        days = [rng.randrange(365) for _ in range(k)]
        hits += len(set(days)) < k
    return hits / rooms

print(birthday_sim(23))` },
    mcq: { q: 'Why is a shared birthday likely with only 23 people?', options: ['There are 253 pairs of people, and each pair can match', 'Birthdays cluster in summer', 'Because 23 is prime', 'It is not likely'], answer: 0, explain: 'C(23, 2) = 253 pairs, each matching with probability 1/365. The number of pairs grows like k<sup>2</sup>, which is why hash collisions appear after about √N items.' },
    hints: [`<p>"At least two share" is messy; its complement "all k birthdays are different" is a clean product.</p>`, `<p>Person i (0-based) must avoid the i days already taken: multiply (365 − i)/365 for i = 0..k−1.</p>`, `<p>If k &gt; 365 the answer is 1 (pigeonhole). Recipe: q = Π(365 − i)/365; return 1 − q.</p>`],
    solution: {
      approach: `<p>Complement rule plus sequential counting. The same maths sets the collision risk for random IDs and hashes: with N possible values, collisions become likely after about 1.18√N items.</p>`,
      code: `def birthday_prob(k):
    if k > 365:
        return 1.0                       # pigeonhole: must share
    all_different = 1.0
    for i in range(k):
        all_different *= (365 - i) / 365  # person i avoids i taken days
    return 1 - all_different`,
      complexity: `<p>O(min(k, 365)) time, O(1) space.</p>`,
      followUps: ['Smallest k for P ≥ 0.5? (23)', 'Approximate with 1 − e<sup>−k(k−1)/(2·365)</sup> and apply it to 64-bit hash collisions.']
    },
    tests: PT.birthday_prob
  });

  practice.push({
    title: 'Posterior over Several Classes (Naive Bayes Step)', level: 'Medium', tags: ['bayes', 'total probability', 'classification'], companies: ['Amazon', 'LinkedIn'],
    statement: `<p>A document belongs to one of several classes with <code>priors[c]</code>. The likelihood of the observed words under class c is <code>likelihoods[c]</code>. Return the posterior P(class c | words) for every class.</p>`,
    constraints: `1 ≤ classes ≤ 10<sup>4</sup>, priors sum to 1, Σ prior · likelihood &gt; 0. Compared to 1e-5.`,
    example: `<p>priors [0.7, 0.2, 0.1] (news, sport, spam), likelihoods [0.1, 0.5, 0.9]. Joint = [0.07, 0.10, 0.09], total 0.26, posterior ${H.c('g', '[0.269, 0.385, 0.346]')}. "news" was most likely before, "sport" after.</p>`,
    brute: { why: `<p>Simulate documents: pick a class by prior, then "generate the words" with its likelihood, and count classes among the documents that produced these words. Noisy and wasteful: Bayes' rule normalises the joint probabilities directly.</p>`, code: `import random

def class_posteriors_sim(priors, likes, n=200000, seed=0):
    rng = random.Random(seed)
    counts = [0] * len(priors)
    for _ in range(n):
        c = rng.choices(range(len(priors)), weights=priors)[0]
        if rng.random() < likes[c]:          # these words were observed
            counts[c] += 1
    s = sum(counts)
    return [x / s for x in counts]

print(class_posteriors_sim([0.7, 0.2, 0.1], [0.1, 0.5, 0.9]))` },
    mcq: { q: 'All likelihoods are equal. What is the posterior?', options: ['Uniform', 'Equal to the priors', 'Equal to the likelihoods', 'Undefined'], answer: 1, explain: 'Evidence that is equally likely under every class carries no information, so the posterior equals the prior.' },
    hints: [`<p>Numerator of Bayes for each class: prior × likelihood (the joint probability).</p>`, `<p>The denominator P(words) is the sum of all the joints (law of total probability).</p>`, `<p>Divide each joint by the total. A class with likelihood 0 gets posterior 0. In real naive Bayes, do this in log space and subtract the max before exp (it is a softmax!).</p>`],
    solution: {
      approach: `<p>Posterior ∝ prior × likelihood; normalise so the posteriors sum to 1. In log space this is exactly softmax(log prior + log likelihood).</p>`,
      code: `def class_posteriors(priors, likelihoods):
    joint = [pr * lk for pr, lk in zip(priors, likelihoods)]   # P(c and words)
    total = sum(joint)                                         # P(words)
    return [j / total for j in joint]`,
      complexity: `<p>O(C) time and space for C classes.</p>`,
      followUps: ['Compute it in log space from per-word log-likelihoods with log-sum-exp.', 'Return the arg-max class and its posterior (MAP prediction).']
    },
    tests: PT.class_posteriors
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Exact Binomial Tail vs Normal Approximation', level: 'Hard', tags: ['binomial', 'normal approximation', 'continuity correction'], companies: ['Two Sigma', 'Microsoft'],
    statement: `<p>For X ~ Binomial(n, p), return <code>[exact, approx]</code> where exact = P(X ≥ k) summed from the pmf, and approx = 1 − Φ((k − 0.5 − np)/√(np(1 − p))) using <code>NormalDist(np, √(np(1−p)))</code> with the continuity correction.</p>`,
    constraints: `1 ≤ n ≤ 2000, 0 &lt; p &lt; 1, 0 ≤ k ≤ n. Compared to 1e-5.`,
    example: `<p>n = 100, k = 60, p = 0.5 → exact 0.02844, approx 1 − Φ(1.9) = ${H.c('g', '0.02872')}. Close, because np = 50 ≥ 10. For n = 200, p = 0.1, k = 30 the skewed distribution makes the approximation worse: 0.0163 vs 0.0126.</p>`,
    brute: { why: `<p>Simulating many binomial draws estimates the tail but with Monte Carlo noise around ±0.001, larger than the approximation error we want to measure. The exact sum and the closed-form normal CDF are both cheap.</p>`, code: `import random

def tail_sim(n, k, p, reps=20000, seed=0):
    rng = random.Random(seed)
    hits = sum(1 for _ in range(reps) if sum(rng.random() < p for _ in range(n)) >= k)
    return hits / reps

print(tail_sim(100, 60, 0.5))` },
    mcq: { q: 'Why use k − 0.5 rather than k in the normal approximation of P(X ≥ k)?', options: ['The bar for the integer k covers [k − 0.5, k + 0.5], so the area must start at k − 0.5', 'To make the answer smaller', 'Because the normal is symmetric', 'It is only needed for p = 0.5'], answer: 0, explain: 'A discrete count is drawn as unit-width bars. Approximating with a smooth curve, the bar for k starts at k − 0.5. Without it you would cut off half of the k bar.' },
    hints: [`<p>Exact: sum <code>math.comb(n, i) p^i (1 − p)^(n − i)</code> for i from k to n.</p>`, `<p>Approx: mean np, SD √(np(1 − p)); area to the right of k − 0.5 is <code>1 − NormalDist(mu, sd).cdf(k − 0.5)</code>.</p>`, `<p>Check rule of thumb np ≥ 10 and n(1 − p) ≥ 10; outside it, expect a visible gap (skew). Recipe: return [exact_sum, 1 − cdf(k − 0.5)].</p>`],
    solution: {
      approach: `<p>Compute both side by side. The exact sum is the ground truth; the CLT-based normal curve with a continuity correction is what you would use mentally or for huge n. Comparing them teaches when the approximation is safe.</p>`,
      code: `import math
from statistics import NormalDist

def binomial_exact_vs_normal(n, k, p):
    exact = 0.0
    for i in range(k, n + 1):
        exact += math.comb(n, i) * p ** i * (1 - p) ** (n - i)
    mu = n * p
    sd = math.sqrt(n * p * (1 - p))
    approx = 1 - NormalDist(mu, sd).cdf(k - 0.5)     # continuity correction
    return [exact, approx]`,
      complexity: `<p>O(n) pmf terms (each with an O(n) comb) for the exact part; O(1) for the approximation.</p>`,
      followUps: ['Make the exact part stable for n = 10<sup>6</sup> using logs.', 'Add the Poisson approximation for small p and compare all three.']
    },
    tests: PT.binomial_exact_vs_normal
  });

  practice.push({
    title: 'Required Sample Size for an A/B Test', level: 'Hard', tags: ['power analysis', 'a/b test', 'hypothesis test'], companies: ['Booking.com', 'Netflix', 'Uber'],
    statement: `<p>Return the users needed <b>per arm</b> to detect a change in conversion from <code>p1</code> to <code>p2</code> with a two-sided test at level <code>alpha</code> and the given <code>power</code>:</p><p>n = ⌈(z<sub>1−α/2</sub>·√(2p̄(1 − p̄)) + z<sub>power</sub>·√(p<sub>1</sub>(1 − p<sub>1</sub>) + p<sub>2</sub>(1 − p<sub>2</sub>)))<sup>2</sup> / (p<sub>2</sub> − p<sub>1</sub>)<sup>2</sup>⌉, with p̄ = (p<sub>1</sub> + p<sub>2</sub>)/2 and z from <code>NormalDist().inv_cdf</code>.</p>`,
    constraints: `0 &lt; p1, p2 &lt; 1, p1 ≠ p2, 0 &lt; alpha &lt; 1, 0 &lt; power &lt; 1. Exact integer answer.`,
    example: `<p>10% → 12%, α = 0.05, power 0.8: z<sub>α/2</sub> = 1.95996, z<sub>power</sub> = 0.84162. First term 1.95996 · √(2 · 0.11 · 0.89) = 0.86727; second term 0.84162 · √(0.09 + 0.1056) = 0.37222. (0.86727 + 0.37222)<sup>2</sup> = 1.53634, divided by 0.02<sup>2</sup> = 0.0004 gives 3840.8 → round up to ${H.c('g', '3841')} users per arm.</p>${H.table(['p1 → p2', 'α', 'power', 'n per arm'], [['0.10 → 0.12', '0.05', '0.8', '3841'], ['0.10 → 0.15', '0.05', '0.8', '686'], ['0.05 → 0.06', '0.05', '0.8', '8158'], ['0.50 → 0.55', '0.01', '0.8', '2329']])}`,
    brute: { why: `<p>Search n = 100, 200, ... and for each one simulate thousands of A/B tests with true rates p1 and p2, measuring the share that reach p &lt; α. Stop when that share reaches the target power. Each step costs millions of random draws and the answer is noisy; the closed-form formula is instant.</p>`, code: `import math
import random
from statistics import NormalDist

def power_sim(p1, p2, n, alpha=0.05, reps=300, seed=0):
    rng = random.Random(seed)
    zc = NormalDist().inv_cdf(1 - alpha / 2)
    wins = 0
    for _ in range(reps):
        a = sum(rng.random() < p1 for _ in range(n))
        b = sum(rng.random() < p2 for _ in range(n))
        pool = (a + b) / (2 * n)
        se = math.sqrt(pool * (1 - pool) * 2 / n)
        wins += se > 0 and abs(b - a) / n / se > zc
    return wins / reps

print(power_sim(0.10, 0.12, 3841))     # close to 0.8` },
    mcq: { q: 'You halve the effect you want to detect (2 points → 1 point). Roughly how does n change?', options: ['Doubles', 'Quadruples', 'Halves', 'Stays the same'], answer: 1, explain: 'n ∝ 1/(p2 − p1)<sup>2</sup>. Halving the difference multiplies n by about 4. Tiny effects need huge tests.' },
    hints: [`<p>Two z values: z<sub>1−α/2</sub> controls false positives (two-sided), z<sub>power</sub> controls false negatives.</p>`, `<p>The first SD uses the pooled p̄ (the world under H<sub>0</sub>); the second uses the two separate rates (the world under H<sub>1</sub>).</p>`, `<p>Round up with <code>math.ceil</code> because you cannot run a fractional user and rounding down loses power. Direction of change does not matter (it is squared). Recipe: compute the bracket, square, divide by diff², ceil.</p>`],
    solution: {
      approach: `<p>The classic two-proportion power formula. The test rejects when the observed z exceeds z<sub>1−α/2</sub>; under the alternative the observed difference is centred at p2 − p1, and we need it to clear that threshold with probability = power. Solving for n gives the formula.</p>`,
      code: `import math
from statistics import NormalDist

def ab_sample_size(p1, p2, alpha, power):
    nd = NormalDist()
    z_alpha = nd.inv_cdf(1 - alpha / 2)          # e.g. 1.96
    z_beta = nd.inv_cdf(power)                   # e.g. 0.84
    pbar = (p1 + p2) / 2
    a = z_alpha * math.sqrt(2 * pbar * (1 - pbar))
    b = z_beta * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))
    return math.ceil((a + b) ** 2 / (p2 - p1) ** 2)`,
      complexity: `<p>O(1) time and space.</p>`,
      followUps: ['Turn users per arm into test duration given daily traffic, rounded up to whole weeks.', 'How does CUPED variance reduction change the required n?']
    },
    tests: PT.ab_sample_size
  });

  practice.push({
    title: 'Sequential Bayesian Updating over Test Results', level: 'Hard', tags: ['bayes', 'sequential', 'likelihood ratio'], companies: ['Google', 'Palantir'],
    statement: `<p>Start with prior P(condition) = <code>prior</code>. Apply each test result in <code>results</code> in order (1 = positive, 0 = negative), assuming results are independent given the true state. The test has <code>sensitivity</code> = P(+ | condition) and <code>specificity</code> = P(− | no condition). Return the final posterior.</p>`,
    constraints: `0 ≤ len(results) ≤ 10<sup>4</sup>; 0 &lt; prior &lt; 1; sensitivity, specificity in (0, 1). Compared to 1e-5.`,
    example: `<p>prior 0.01, sensitivity 0.99, specificity 0.95, results [1, 1] → 0.1667 after the first, ${H.c('g', '0.7984')} after the second. [1, 0] → 0.0021: a negative wipes out the positive.</p>${H.table(['after', 'P(condition)'], [['start', '0.0100'], ['+', '0.1667'], ['+ +', '0.7984'], ['+ −', '0.0021']])}`,
    brute: { why: `<p>Build the full joint table over the true state and every possible results sequence (2 · 2<sup>m</sup> rows) and condition on the observed sequence. Correct but exponential in the number of tests. Because results are conditionally independent, you can update one result at a time.</p>`, code: `from itertools import product

def sequential_bayes_brute(prior, sens, spec, results):
    m = len(results)
    num = den = 0.0
    for state in (1, 0):
        for seq in product([0, 1], repeat=m):
            p = prior if state else 1 - prior
            for r in seq:
                if state:
                    p *= sens if r else 1 - sens
                else:
                    p *= 1 - spec if r else spec
            if list(seq) == list(results):
                den += p
                num += p if state else 0
    return num / den

print(sequential_bayes_brute(0.01, 0.99, 0.95, [1, 1]))` },
    mcq: { q: 'Why does the order of independent results not change the final posterior?', options: ['Each result multiplies the odds by its likelihood ratio, and multiplication is commutative', 'Because the prior is small', 'It does change it', 'Only positives matter'], answer: 0, explain: 'Posterior odds = prior odds × LR<sub>1</sub> × LR<sub>2</sub> × ...; reordering the factors does not change the product.' },
    hints: [`<p>Yesterday's posterior is today's prior: loop over results, updating p each time.</p>`, `<p>For a positive: p ← p·sens / (p·sens + (1 − p)(1 − spec)). For a negative: p ← p(1 − sens) / (p(1 − sens) + (1 − p)·spec).</p>`, `<p>Empty results → return the prior. For thousands of tests, work in log-odds to avoid underflow: add log LR per result. Recipe: loop, apply the right update.</p>`],
    solution: {
      approach: `<p>Apply Bayes once per result. Conditional independence lets each update use only the current belief and that result's likelihoods. Equivalent closed form: log-odds = log-odds(prior) + Σ log LR<sub>i</sub>.</p>`,
      code: `def sequential_bayes(prior, sensitivity, specificity, results):
    p = prior
    for r in results:
        if r == 1:                                   # positive result
            num = p * sensitivity
            den = num + (1 - p) * (1 - specificity)
        else:                                        # negative result
            num = p * (1 - sensitivity)
            den = num + (1 - p) * specificity
        p = num / den                                # posterior -> next prior
    return p`,
      complexity: `<p>O(m) time for m results, O(1) space.</p>`,
      followUps: ['Rewrite in log-odds and explain why it is numerically safer.', 'How would correlated test errors (same lab, same day) change the answer?']
    },
    tests: PT.sequential_bayes
  });

  practice.push({
    title: 'Simulate the Peeking Problem in A/A Tests', level: 'Hard', tags: ['simulation', 'a/b test', 'p-hacking', 'seeded random'], companies: ['Optimizely', 'Microsoft', 'Airbnb'],
    statement: `<p>Simulate <code>n_sims</code> A/A tests where both arms convert at 0.5. Use <code>rng = random.Random(seed)</code>. For each test, for i = 1..<code>n_per_arm</code>: add <code>rng.random() &lt; 0.5</code> to arm A, then <code>rng.random() &lt; 0.5</code> to arm B. Every <code>step = n_per_arm // checks</code> users (when i % step == 0), compute the pooled two-proportion z; if |z| &gt; NormalDist().inv_cdf(0.975) (and SE &gt; 0) flag the test as "significant" (keep simulating; it stays flagged). Return the share of tests flagged.</p>`,
    constraints: `n_sims · n_per_arm ≤ 10<sup>6</sup>, 1 ≤ checks ≤ n_per_arm. Compared to 1e-5 (deterministic given the seed).`,
    example: `<p>200 tests, 500 users per arm, seed 1: with 1 check → ${H.c('g', '0.075')} (near the nominal 5%, plus Monte Carlo noise); with 10 checks → ${H.c('r', '0.195')}. Same data, 2.6 times the false positives (and almost 4 times the nominal 5%), just from looking more often.</p>`,
    brute: { why: `<p>Recomputing conversion counts from scratch at each check (summing all past outcomes) makes each check O(n) and the test O(n · checks). Keeping running counts makes each check O(1). The real "brute" mistake, though, is the analysis: stopping at the first significant peek.</p>`, code: `import math
import random
from statistics import NormalDist

def peeking_slow(n_sims, n_per_arm, checks, seed):
    rng = random.Random(seed)
    zc = NormalDist().inv_cdf(0.975)
    step = n_per_arm // checks
    hits = 0
    for _ in range(n_sims):
        a, b, flagged = [], [], False
        for i in range(1, n_per_arm + 1):
            a.append(rng.random() < 0.5)
            b.append(rng.random() < 0.5)
            if i % step == 0 and not flagged:
                ca, cb = sum(a), sum(b)               # O(i) recount every check
                pool = (ca + cb) / (2 * i)
                se = math.sqrt(pool * (1 - pool) * 2 / i)
                flagged = se > 0 and abs(cb - ca) / i / se > zc
        hits += flagged
    return hits / n_sims

print(peeking_slow(200, 500, 10, 1))` },
    mcq: { q: 'Which change keeps peeking without inflating false positives?', options: ['Use a stricter per-look threshold from an alpha-spending plan (e.g. O’Brien–Fleming)', 'Peek only on weekends', 'Use a one-sided test', 'Stop as soon as p &lt; 0.05'], answer: 0, explain: 'Group-sequential designs spend the 5% budget across looks, using much stricter thresholds early. The overall false-positive rate stays at 5%.' },
    hints: [`<p>Keep two running counts; at each check, compute the pooled z exactly as in the two-proportion z-test.</p>`, `<p>Follow the random-call order exactly (A then B for each i) and use one private <code>random.Random(seed)</code> so results match.</p>`, `<p>Once a test is flagged it stays flagged; you may skip further z computations but must still draw the random numbers to keep the sequence aligned. Recipe: loop sims → loop users → check every step → count flagged.</p>`],
    solution: {
      approach: `<p>Direct simulation with running counts. Under H<sub>0</sub> each single look has a 5% false-positive chance, but the z-path wanders, and checking it many times gives it many chances to cross 1.96. The flagged share grows with the number of checks.</p>`,
      code: `import math
import random
from statistics import NormalDist

def peeking_false_positive_rate(n_sims, n_per_arm, checks, seed):
    rng = random.Random(seed)
    zc = NormalDist().inv_cdf(0.975)            # 1.96
    step = n_per_arm // checks
    hits = 0
    for _ in range(n_sims):
        ca = cb = 0
        flagged = False
        for i in range(1, n_per_arm + 1):
            ca += rng.random() < 0.5            # arm A user
            cb += rng.random() < 0.5            # arm B user
            if i % step == 0 and not flagged:   # a peek
                pool = (ca + cb) / (2 * i)
                se = math.sqrt(pool * (1 - pool) * 2 / i)
                if se > 0 and abs(cb / i - ca / i) / se > zc:
                    flagged = True              # a team would stop and ship here
        hits += flagged
    return hits / n_sims`,
      complexity: `<p>O(n_sims · n_per_arm) time, O(1) space.</p>`,
      followUps: ['Plot the flagged share for checks = 1, 2, 5, 10, 20, 50.', 'Implement a Bonferroni-style per-look threshold (α/checks) and re-measure.']
    },
    tests: PT.peeking_false_positive_rate
  });

  practice.push({
    title: 'Seeded Permutation Test for a Difference in Means', level: 'Hard', tags: ['hypothesis test', 'permutation', 'seeded random'], companies: ['Meta', 'Spotify'],
    statement: `<p>Test whether groups <code>a</code> and <code>b</code> differ in mean without assuming normality. Observed statistic = |mean(b) − mean(a)|. Use <code>rng = random.Random(seed)</code>; pool = a + b (list concatenation). Repeat <code>n_perm</code> times: <code>rng.shuffle(pool)</code> (shuffle the same list in place each time), treat the first len(a) items as group a and the rest as b, and count shuffles whose |mean difference| ≥ observed − 1e-12. Return (count + 1)/(n_perm + 1).</p>`,
    constraints: `1 ≤ len(a), len(b) ≤ 1000, 100 ≤ n_perm ≤ 10<sup>4</sup>. Compared to 1e-5.`,
    example: `<p>a = [1, 2, 3], b = [4, 5, 6], 999 shuffles, seed 0 → ${H.c('g', '0.077')}. Only 2 of the 20 possible splits are this extreme (≈ 0.1), so with 6 points even a perfect separation cannot reach p &lt; 0.05.</p>`,
    brute: { why: `<p>The exact permutation test enumerates all C(n<sub>a</sub> + n<sub>b</sub>, n<sub>a</sub>) splits. For 20 + 20 values that is 1.4 · 10<sup>11</sup> splits. Random shuffles estimate the same p-value with controllable error.</p>`, code: `from itertools import combinations

def permutation_exact(a, b):
    pool = list(a) + list(b)
    na, n = len(a), len(pool)
    obs = abs(sum(b) / len(b) - sum(a) / na)
    total = hits = 0
    for idx in combinations(range(n), na):
        ga = [pool[i] for i in idx]
        gb = [pool[i] for i in range(n) if i not in idx]
        total += 1
        hits += abs(sum(gb) / len(gb) - sum(ga) / na) >= obs - 1e-12
    return hits / total

print(permutation_exact([1, 2, 3], [4, 5, 6]))   # 0.1` },
    mcq: { q: 'Why add 1 to both the count and n_perm?', options: ['The observed split is itself one valid permutation, so the p-value can never be exactly 0', 'To make the answer bigger', 'To avoid division by zero only', 'It is a Bonferroni correction'], answer: 0, explain: 'Counting the real data as one of the permutations gives a valid (slightly conservative) p-value and avoids claiming p = 0 from a finite simulation.' },
    hints: [`<p>Under H<sub>0</sub> the group labels are meaningless, so shuffling them shows what differences chance alone produces.</p>`, `<p>Keep one pooled list and shuffle it in place with the seeded rng each iteration; split by position.</p>`, `<p>Use ≥ observed − 1e-12 so floating-point rounding does not drop ties. Recipe: obs → loop shuffle/split/compare → (count + 1)/(n_perm + 1).</p>`],
    solution: {
      approach: `<p>Monte Carlo permutation test. It makes no normality assumption, works for any statistic (median, F1, AUC), and is the gold standard for small or skewed samples. The seed makes it reproducible.</p>`,
      code: `import random

def permutation_test(a, b, n_perm, seed):
    rng = random.Random(seed)
    obs = abs(sum(b) / len(b) - sum(a) / len(a))
    pool = list(a) + list(b)
    na = len(a)
    count = 0
    for _ in range(n_perm):
        rng.shuffle(pool)                                   # relabel at random
        diff = abs(sum(pool[na:]) / (len(pool) - na) - sum(pool[:na]) / na)
        if diff >= obs - 1e-12:
            count += 1
    return (count + 1) / (n_perm + 1)`,
      complexity: `<p>O(n_perm · (n<sub>a</sub> + n<sub>b</sub>)) time, O(n<sub>a</sub> + n<sub>b</sub>) space.</p>`,
      followUps: ['Make it a paired test for two models on the same eval items (flip signs of per-item differences).', 'Swap the statistic for a difference in medians.']
    },
    tests: PT.permutation_test
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push(
    { q: 'A test has a 2% false-positive rate and the condition affects 1 in 1,000 people. Roughly what share of positives are real (assume the test catches every case)?', options: ['About 98%', 'About 50%', 'About 5%', 'About 0.1%'], answer: 2, explain: 'Per 100,000 people: 100 true positives, about 2,000 false positives. 100/2,100 ≈ 4.8%. This is the base-rate fallacy: a rare condition plus a modest false-positive rate gives mostly false alarms.' },
    { q: 'What does P(A | B) mean?', options: ['P(A) divided by P(B)', 'The probability of A, given that B happened', 'The probability of A or B', 'The probability that A causes B'], answer: 1, explain: 'The bar reads "given". P(A | B) = P(A and B)/P(B): we restrict attention to the cases where B is true.' },
    { q: 'You flip a fair coin 4 times. What is P(exactly 2 heads)?', options: ['0.25', '0.375', '0.5', '0.0625'], answer: 1, explain: 'C(4,2) · 0.5<sup>4</sup> = 6/16 = 0.375. There are 6 orders with two heads, each with probability 1/16.' },
    { q: 'Data [2, 4, 4, 4, 5, 5, 7, 9]. Which statement is correct?', options: ['statistics.variance gives 4.0', 'statistics.pvariance gives 4.0 and statistics.variance gives about 4.571', 'Both give 4.571', 'np.var gives 4.571 by default'], answer: 1, explain: 'pvariance divides by n (32/8 = 4.0); variance divides by n − 1 (32/7 ≈ 4.571). NumPy defaults to ddof = 0, so np.var also gives 4.0.' },
    { q: 'X and Y are independent with Var(X) = 4 and Var(Y) = 9. What is Var(X − Y)?', options: ['−5', '5', '13', '36'], answer: 2, explain: 'Var(X − Y) = Var(X) + (−1)<sup>2</sup>Var(Y) = 4 + 9 = 13. Subtracting an independent variable still adds its variance.' },
    { q: 'An IQ test has mean 100 and SD 15. Roughly what percentile is a score of 115?', options: ['50th', '68th', '84th', '97.5th'], answer: 2, explain: 'z = 1, and Φ(1) ≈ 0.841. Half the curve lies below the mean plus half of the central 68%: 50% + 34% = 84%.' },
    { q: 'The central limit theorem says that...', options: ['All data is normally distributed', 'The average of many independent draws is approximately normal, with SD σ/√n', 'Large samples have no variance', 'The median equals the mean'], answer: 1, explain: 'It is about averages (and sums), not individual values. The spread of the average shrinks like σ/√n.' },
    { q: 'What is the correct reading of a 95% confidence interval [0.25, 0.35]?', options: ['There is a 95% probability the true value is in [0.25, 0.35]', '95% of the data lies in [0.25, 0.35]', 'The procedure that built it captures the true value in 95% of repeated samples', 'The result is 95% likely to be significant'], answer: 2, explain: 'In frequentist statistics the true value is fixed and the interval is random. "95%" describes the long-run success rate of the procedure. The first option describes a Bayesian credible interval.' },
    { q: 'A team checks its A/B test every morning and stops the first day p &lt; 0.05. What happens?', options: ['False positives stay at 5%', 'The false-positive rate rises well above 5%', 'Power drops to zero', 'The p-value becomes more accurate'], answer: 1, explain: 'Every look is another chance for noise to cross the threshold. With 20 looks the false-positive rate is roughly 25%. Fix the sample size in advance or use a sequential design.' },
    { q: 'You test 20 independent metrics at α = 0.05 and none truly changed. P(at least one looks significant)?', options: ['5%', 'About 36%', 'About 64%', '100%'], answer: 2, explain: '1 − 0.95<sup>20</sup> ≈ 0.64. That is p-hacking by accident. Use one primary metric or correct with Bonferroni (α/20 = 0.0025).' },
    { q: 'What is the entropy of [0.5, 0.25, 0.25] in bits?', options: ['1', '1.5', '2', '0.75'], answer: 1, explain: '0.5 · 1 + 0.25 · 2 + 0.25 · 2 = 1.5 bits.' },
    { q: 'A classifier gives probability 0.1 to the correct class. The cross-entropy loss (natural log) is about...', options: ['0.1', '0.9', '2.30', '10'], answer: 2, explain: '−ln(0.1) ≈ 2.303. Compare −ln(0.9) ≈ 0.105: low probability on the truth costs a lot.' },
    { q: 'Lowering the softmax temperature from 1.0 to 0.2 makes an LLM’s output...', options: ['More random', 'More deterministic (probability concentrates on the top token)', 'Longer', 'Unchanged, since softmax always sums to 1'], answer: 1, explain: 'Dividing logits by a small T stretches the gaps, so the top token takes almost all the probability. Entropy falls; output is closer to greedy decoding.' },
    { q: 'Users who use feature X have 20% higher retention. What can you conclude?', options: ['X causes 20% higher retention', 'Removing X will reduce retention by 20%', 'X and retention are correlated; a randomised test is needed to claim causation', 'Nothing at all'], answer: 2, explain: 'Engaged users may both use X and retain better (a confounder). Only random assignment rules out confounders and measures the causal effect.' }
  );

  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push(
    { q: 'Explain the base-rate fallacy with a concrete example.', level: 'B', a: `<p>The base-rate fallacy is ignoring how common something is <i>before</i> the evidence. Example: a disease affects 1% of people, the test catches 99% of cases and has a 5% false-positive rate. Out of 10,000 people, 100 are sick and 99 test positive; 9,900 are healthy and 495 test positive. So P(sick | positive) = 99/594 ≈ 17%, not 99%. The same thing happens with fraud models, intrusion detection and AI-content detectors: when the thing you hunt is rare, even a small false-positive rate produces mostly false alarms. That is why precision collapses on imbalanced data and why you always ask "what is the base rate?"</p>`, followUps: ['How would you raise the posterior? (lower FPR, a second independent test, or test a higher-risk group)', 'Relate this to precision and recall.'] },
    { q: 'What is the difference between sample variance and population variance, and why does the sample version divide by n − 1?', level: 'B', a: `<p>Population variance divides the sum of squared deviations by n and is used when the data is the whole population. Sample variance divides by n − 1 and is used to estimate the population variance from a sample. The reason: deviations are measured from the sample mean, which is fitted to the same data, so they are systematically a bit too small. Dividing by n − 1 (Bessel's correction) makes the estimate unbiased; one degree of freedom was spent estimating the mean. In Python, <code>statistics.pvariance</code> uses n and <code>statistics.variance</code> uses n − 1; NumPy's <code>np.var</code> defaults to n (ddof = 0) while pandas' <code>.var()</code> defaults to n − 1, a classic source of mismatched numbers.</p>`, followUps: ['Is the sample SD (with n − 1) unbiased for σ?', 'When does the difference matter in practice?'] },
    { q: 'What is a p-value, and what is it not?', level: 'B', a: `<p>A p-value is the probability of seeing data at least as extreme as what you observed, <i>assuming the null hypothesis is true</i>. A small p-value says "this would be surprising if nothing were going on". It is <b>not</b> the probability that the null hypothesis is true, not the probability the result is a fluke, and 1 − p is not the probability your change works. It also says nothing about effect size: with millions of users a trivial 0.01% lift can have p &lt; 0.001. Good practice is to report the effect size with a confidence interval, fix α and the sample size before the test, and treat p &lt; 0.05 as evidence, not proof.</p>`, followUps: ['Explain type I and type II errors.', 'How does a Bayesian A/B test report results differently?'] },
    { q: 'Walk me through analysing an A/B test on conversion rate.', level: 'I', a: `<p>Before launch: choose one primary metric, a minimum detectable effect, α (0.05) and power (0.8), then compute the required users per arm (e.g. about 3,841 per arm to detect 10% → 12%). Randomise by user and run for full weeks. During: check the sample ratio (a 50/50 split should give about equal groups; a mismatch means broken assignment) and guardrail metrics, but do not stop early on the primary metric. After: compute rates, the pooled rate, SE = √(p̄(1 − p̄)(1/n<sub>A</sub> + 1/n<sub>B</sub>)), z = (p<sub>B</sub> − p<sub>A</sub>)/SE and a two-sided p-value. Report the lift with a CI using the unpooled SE, check segments only as exploration (with multiple-comparison correction), and think about novelty effects before shipping.</p>`, followUps: ['What would you do if the sample ratio was 52/48?', 'How would CUPED help?'] },
    { q: 'Why is peeking at an A/B test a problem, and how do teams fix it?', level: 'I', a: `<p>The 5% false-positive guarantee holds for one look at a pre-planned sample size. If you look repeatedly and stop the first time p &lt; 0.05, you give random noise many chances to cross the threshold. Under a true null the z-statistic wanders like a random walk; with 20 looks the false-positive rate is roughly 25%. Fixes: (1) commit to a fixed sample size and only analyse at the end; (2) group-sequential designs with alpha-spending functions such as O'Brien–Fleming, which use very strict thresholds early; (3) always-valid inference (mSPRT, confidence sequences) used by many experimentation platforms; (4) Bayesian methods with a pre-declared decision rule. A/A tests verify the platform's real false-positive rate.</p>`, followUps: ['Simulate the inflation in Python with a fixed seed.', 'Is peeking at guardrail metrics also a problem?'] },
    { q: 'Correlation vs causation: how would you establish that a feature causes higher retention?', level: 'I', a: `<p>An observed correlation can come from a confounder (engaged users both use the feature and stay longer), reverse causation (people who plan to stay explore more features) or selection bias. The cleanest way to establish causation is a randomised controlled experiment: randomly give the feature to half the users so that, on average, the groups differ only in the feature; then a difference in retention is causal. When you cannot randomise, use quasi-experimental methods: difference-in-differences around a staged rollout, regression discontinuity, instrumental variables, or propensity score matching. Each needs assumptions you must state and check. Also be careful of Simpson's paradox when aggregating across segments.</p>`, followUps: ['Give an example of Simpson’s paradox.', 'What is a holdout group and why keep one long-term?'] },
    { q: 'What do the binomial and normal distributions have to do with each other?', level: 'B', a: `<p>A binomial count is the sum of n independent Bernoulli trials, so by the central limit theorem it becomes approximately normal for large n, with mean np and SD √(np(1 − p)). The rule of thumb is np ≥ 10 and n(1 − p) ≥ 10. Because you are approximating whole-number bars with a smooth curve, add a continuity correction: P(X ≥ k) ≈ 1 − Φ((k − 0.5 − np)/σ). Example: 100 fair flips, P(X ≥ 60) ≈ 1 − Φ(1.9) = 0.0287 vs exact 0.0284. This is the basis for the z-test for proportions and for quick mental checks like "accuracy on 100 test items has a noise SD of about 3 points at 90%".</p>`, followUps: ['When would you use a Poisson approximation instead?', 'Why does skew hurt the approximation?'] },
    { q: 'How would you put error bars on a model’s F1 score?', level: 'I', a: `<p>F1 has no simple standard-error formula, so I would bootstrap. Resample the evaluation examples with replacement to the same size, recompute F1 on each resample, repeat 1,000–10,000 times with a fixed seed, and take the 2.5th and 97.5th percentiles as a 95% interval. Important details: resample the right unit (users, documents or conversations, not individual tokens or duplicated items) so correlated examples move together; for comparing two models on the same set, use a <b>paired</b> bootstrap of the difference, which is far tighter than comparing two separate intervals; and for small samples consider BCa intervals. If the interval for the difference contains 0, I would not claim one model is better.</p>`, followUps: ['Why is a paired bootstrap tighter?', 'When does the bootstrap fail?'] },
    { q: 'Explain entropy, cross-entropy and KL divergence and how they relate.', level: 'I', a: `<p>Entropy H(P) = −Σ p log p is the average surprise of outcomes drawn from P: 0 for a certain outcome, maximal for a uniform distribution (1 bit for a fair coin). Cross-entropy H(P, Q) = −Σ p log q is the average surprise when outcomes come from P but you score them with your model Q. KL divergence D<sub>KL</sub>(P‖Q) = Σ p log(p/q) = H(P, Q) − H(P) is the extra cost of using Q instead of the truth; it is ≥ 0, zero only when Q = P, and not symmetric. Since H(P) is fixed by the data, minimising cross-entropy is the same as minimising KL to the data distribution, which is the same as maximum likelihood. With one-hot labels, cross-entropy is −log q<sub>correct</sub>.</p>`, followUps: ['Why is KL used as a penalty in RLHF?', 'What is perplexity?'] },
    { q: 'What does temperature do in LLM sampling, mathematically and practically?', level: 'I', a: `<p>The model outputs logits z for every token. Sampling uses softmax(z/T). With T &lt; 1 the gaps between logits are stretched, probability concentrates on the top tokens and entropy falls; T → 0 approaches greedy argmax. With T &gt; 1 the gaps shrink and the distribution flattens toward uniform, giving more diverse but more error-prone text. Example: logits [2, 1, 0] give [0.67, 0.24, 0.09] at T = 1, [0.87, 0.12, 0.02] at T = 0.5 and [0.51, 0.31, 0.19] at T = 2. Practically: low T (0–0.3) for extraction, classification and code; higher T for brainstorming. Temperature is usually combined with top-p or top-k truncation, and implementations subtract the max logit for numerical stability.</p>`, followUps: ['Is T = 0 fully deterministic in practice?', 'How does top-p differ from top-k?'] },
    { q: 'Why is softmax paired with cross-entropy loss, and why must you subtract the max logit?', level: 'A', a: `<p>Softmax turns logits into a valid probability distribution, and cross-entropy is the negative log-likelihood of the correct class under that distribution, so together they implement maximum likelihood for classification. The gradient of the combined loss with respect to the logits is simply softmax(z) − onehot(y), which is clean and well scaled; that is why frameworks fuse them (<code>F.cross_entropy</code> takes raw logits). Numerically, e<sup>z</sup> overflows for z around 710 in float64 and much sooner in float16, so we compute log-softmax with the log-sum-exp trick: log Σ e<sup>z<sub>j</sub></sup> = m + log Σ e<sup>z<sub>j</sub> − m</sup> with m = max(z). Subtracting m cancels in the ratio, so the result is unchanged but every exponent is ≤ 0.</p>`, followUps: ['What goes wrong if you apply softmax twice?', 'How does label smoothing change the target?'] },
    { q: 'How many labelled examples do you need to estimate a model’s accuracy within ±2 points?', level: 'B', a: `<p>Accuracy on n independent examples is a binomial proportion with SE = √(p(1 − p)/n). For a 95% interval the half-width is 1.96 · SE. Setting 1.96 · √(p(1 − p)/n) = 0.02 and using the worst case p = 0.5 gives n = (1.96/0.02)<sup>2</sup> · 0.25 ≈ 2,401 examples. If you expect accuracy near 90%, p(1 − p) = 0.09 and n ≈ 865. For ±5 points, about 385 at worst. The same logic tells you that a 1-point difference between two models on a 500-item benchmark is noise, and that items must be independent (not paraphrases of each other) for the formula to hold.</p>`, followUps: ['How does pairing two models on the same items change things?', 'What if items are clustered by topic?'] },
    { q: 'Expected value vs variance: a game pays ₹1,000 with probability 0.01 and costs ₹8. Should you play, and what else matters?', level: 'B', a: `<p>Expected payout = 1000 · 0.01 = ₹10, so expected profit = 10 − 8 = <b>+₹2</b> per play: positive, so a risk-neutral player with many plays should play. But variance matters: Var(payout) = E[X<sup>2</sup>] − E[X]<sup>2</sup> = 10,000 − 100 = 9,900, SD ≈ ₹99.5 per play, so in 100 plays you would usually win zero or a few times and could easily be down. You need enough bankroll to survive the swings. This is the same reasoning used for LLM cost planning (expected tokens per request plus tail usage) and for model risk (expected error plus worst-case behaviour).</p>`, followUps: ['How many plays until the total profit is very likely positive?', 'What is the Kelly criterion?'] },
    { q: 'What are type I and type II errors, and how do sample size and α trade off?', level: 'I', a: `<p>A type I error is rejecting a true null (a false positive: shipping a change that does nothing); its rate is α. A type II error is failing to reject a false null (a false negative: missing a real win); its rate is β, and power = 1 − β. For a fixed sample size, lowering α (being stricter) raises β. The only way to lower both is more data or a larger true effect, or less noise (variance reduction such as CUPED or stratification). Sample size scales with (z<sub>1−α/2</sub> + z<sub>power</sub>)<sup>2</sup> and with 1/effect<sup>2</sup>, so detecting half the effect needs four times the users. Underpowered tests are dangerous: they miss real effects, and the "wins" they do find tend to exaggerate the effect size.</p>`, followUps: ['What is the winner’s curse in experiments?', 'When would you choose α = 0.01?'] }
  );

  registerModule({
    id: 'ai19',
    title: 'Probability & Statistics for Machine Learning',
    lang: 'python',
    langExplain: `<p>All code in this module is Python because the AI track uses Python. Every runnable demo uses <b>only the standard library</b> (<code>random</code> with a fixed seed, <code>math</code> and <code>statistics</code>) so you can see each step and it runs in your browser. Where a library makes the job a one-liner at work, a separate snippet shows the NumPy or SciPy version.</p>`,
    intro: `<p>Machine learning is mostly <b>guessing well under uncertainty</b>. A spam filter outputs "93% spam". An LLM picks its next word by sampling from a probability distribution. A product team ships a new prompt only if an A/B test says the win is real. All of this is probability and statistics, and this module teaches it from school maths up, in plain English, with a small worked example, a table and an animation for every formula.</p>
      <p>You will learn to think in <b>random variables and distributions</b> (Bernoulli, binomial, normal), compute <b>expectation and variance</b>, use <b>conditional probability and Bayes' rule</b> without falling for the base-rate trap, reason about <b>samples, confidence intervals and the bootstrap</b>, run and read <b>hypothesis tests and A/B tests</b> (and avoid peeking and p-hacking), and finish with <b>entropy, cross-entropy and softmax</b>: the exact maths inside every classifier's loss and every LLM's temperature knob.</p>
      <p><b>What this unlocks:</b> <i>Machine Learning Foundations</i> (evaluation metrics, loss functions and classification), <i>Neural Networks &amp; Deep Learning Basics</i> (softmax outputs and cross-entropy loss), <i>How LLMs Work</i> (temperature and top-p sampling), <i>Evaluation, Guardrails &amp; AI Security</i> (is an eval improvement real or noise?), <i>LLM System Design &amp; LLMOps</i> (A/B testing prompts and models) and <i>Calculus &amp; Optimization for Machine Learning</i> (why minimising cross-entropy is maximum likelihood).</p>`,
    goals: [
      'Compute probabilities with the complement, product and sum rules, and explain the law of large numbers with a simulation',
      'Use Bernoulli, binomial and normal distributions: pmf with <code>math.comb</code>, z-scores, percentiles and the normal approximation',
      'Calculate expectation and variance by hand and in code, including the variance of a sum and sample (n − 1) vs population (n) variance',
      'Apply conditional probability and Bayes’ rule to a medical-test or spam problem and explain the base-rate fallacy',
      'Build confidence intervals with a formula and with a seeded bootstrap, and say what a 95% interval does and does not mean',
      'Run a two-proportion z-test for an A/B test, size an experiment, and spot peeking, p-hacking and correlation-vs-causation traps',
      'Compute entropy, cross-entropy, KL divergence and softmax with temperature, and connect them to classifier loss and LLM sampling'
    ],
    prereqs: `<p><b>Needed:</b> <i>Math &amp; Python for AI</i> (AI track, module 3) for a first look at probability, distributions and softmax. <b>Helpful:</b> <i>Linear Algebra for Machine Learning</i> (vectors and dot products appear when we write expectations as weighted sums) and Python <i>Control Flow, Functions &amp; Core Collections</i> (loops, lists, functions). School maths is enough: fractions, percentages, powers, square roots and logarithms.</p>`,
    hours: 10,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
