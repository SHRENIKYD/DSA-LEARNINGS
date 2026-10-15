(function () { var topics = [], practice = [], quiz = [], interview = [];

topics.push({
  title: 'The Perceptron: One Artificial Neuron (and the XOR Wall)',
  analogy: `<p>Think of a bouncer at a club door. He looks at a few facts about you (age? on the list? dress code?), gives each fact an <b>importance</b>, adds up the score, and if the total passes his personal bar he lets you in. A perceptron is exactly that bouncer: inputs, importance weights, a bar (the bias), and a yes/no decision. <b>Learning</b> means the manager corrects him every time he lets the wrong person in or turns the right one away.</p>`,
  explain: `<p>🟢 <b>The plain idea.</b> A perceptron takes numbers in, multiplies each by a <b>weight</b>, adds a <b>bias</b>, and outputs 1 if the total is above zero, otherwise 0:</p>
  <p><code>z = w1·x1 + w2·x2 + b</code> &nbsp;→&nbsp; <code>output = 1 if z &gt; 0 else 0</code></p>
  <p>The weights are the "knobs". Training means turning the knobs until the outputs match the answers we want. The learning rule is wonderfully simple: after each example, compute the <b>error</b> = target − output. Then nudge every weight by <code>lr × error × input</code> and the bias by <code>lr × error</code>. If the answer was right, error is 0 and nothing moves.</p>
  <p>Here is AND learned from scratch (lr = 1, all weights start at 0). Watch how only <i>wrong</i> answers change anything:</p>
  ${H.table(['x1', 'x2', 'target', 'w·x+b', 'out', 'error', 'new (w1, w2, b)'], [['0', '0', '0', '0', '0 (step(0)=0)', '0', '(0, 0, 0)'], ['0', '1', '0', '0', '0', '0', '(0, 0, 0)'], ['1', '0', '0', '0', '0', '0', '(0, 0, 0)'], ['1', '1', '1', '0', '0', '<span class="c-r">+1</span>', '<span class="c-g">(1, 1, 1)</span>']])}
  <p>Keep going for a few passes and the weights settle at something like <b>w = (2, 1), b = −2</b>: only when both inputs are 1 is the score positive.</p>
  <p>🔴 <b>The XOR wall.</b> A perceptron draws a <b>straight line</b> through the input space: one side says 1, the other says 0. AND and OR can be separated by a line. XOR ("1 if the inputs are different") cannot: the two 1-cases sit on opposite corners, and no single line puts both on one side with the two 0-cases on the other.</p>
  ${H.table(['x1', 'x2', 'AND', 'OR', 'XOR'], [['0', '0', '0', '0', '0'], ['0', '1', '0', '1', '<span class="c-r">1</span>'], ['1', '0', '0', '1', '<span class="c-r">1</span>'], ['1', '1', '1', '1', '0']])}
  <p>This failure (famously shown by Minsky and Papert in 1969) froze neural-network research for years. The fix, stacking neurons into <b>layers</b>, is the whole rest of this module.</p>`,
  clues: ['"linearly separable" → one neuron (or logistic regression) is enough', '"XOR", "parity", "not separable by a line" → you need a hidden layer', '"learning rule: w += lr × error × x" → perceptron update', '"binary decision from a weighted sum" → perceptron / single neuron', '"convergence guaranteed if data is separable" → perceptron convergence theorem'],
  code: [{ lang: 'python', title: 'Perceptron learning AND and OR (stdlib, runnable)', run: true, code: `def step(z):
    # The "bouncer": fire (1) only if the score is above zero.
    return 1 if z > 0 else 0

def train(data, lr=1, epochs=10):
    w1 = w2 = b = 0          # start with no opinions at all
    for epoch in range(1, epochs + 1):
        mistakes = 0
        for (x1, x2), target in data:
            out = step(w1 * x1 + w2 * x2 + b)
            err = target - out            # +1, 0 or -1
            if err != 0:
                mistakes += 1
                w1 += lr * err * x1       # nudge each weight by its input
                w2 += lr * err * x2
                b  += lr * err            # bias acts like an input fixed at 1
        if mistakes == 0:                 # a clean pass: learning finished
            return (w1, w2, b), epoch
    return (w1, w2, b), None              # never settled

AND = [((0, 0), 0), ((0, 1), 0), ((1, 0), 0), ((1, 1), 1)]
OR  = [((0, 0), 0), ((0, 1), 1), ((1, 0), 1), ((1, 1), 1)]
XOR = [((0, 0), 0), ((0, 1), 1), ((1, 0), 1), ((1, 1), 0)]

for name, data in [("AND", AND), ("OR", OR), ("XOR", XOR)]:
    (w1, w2, b), done = train(data)
    print(name, "weights:", (w1, w2), "bias:", b,
          "-> converged at epoch" if done else "-> NEVER converged in 10 epochs", done or "")
    print("   outputs:", [step(w1 * x1 + w2 * x2 + b) for (x1, x2), _ in data])` }],
  codeTitle: ['Perceptron learning AND and OR'],
  viz: {
    title: 'Perceptron weights updating sample by sample',
    input: 'AND',
    inputLabel: 'Gate to learn: AND, OR or XOR',
    gen: function (input) {
      var name = String(input).trim().toUpperCase();
      var T = { AND: [0, 0, 0, 1], OR: [0, 1, 1, 1], XOR: [0, 1, 1, 0] };
      if (!T[name]) throw new Error('Type AND, OR or XOR');
      var X = [[0, 0], [0, 1], [1, 0], [1, 1]];
      var w1 = 0, w2 = 0, b = 0, frames = [], rows = [], step = 0, maxEp = 6;
      frames.push({ narr: 'We teach a perceptron the <b>' + name + '</b> gate. All weights start at 0, so it has no opinion yet. Rule: if wrong, nudge each weight by <code>error × input</code>.', parts: [{ type: 'vars', label: 'weights', vals: { w1: 0, w2: 0, b: 0 } }, { type: 'table', label: 'Truth table to learn', columns: ['x1', 'x2', 'target'], rows: X.map(function (x, i) { return [x[0], x[1], T[name][i]]; }) }] });
      for (var ep = 1; ep <= maxEp; ep++) {
        var mistakes = 0;
        for (var i = 0; i < 4; i++) {
          var z = w1 * X[i][0] + w2 * X[i][1] + b, out = z > 0 ? 1 : 0, err = T[name][i] - out;
          step++;
          var narr = 'Epoch ' + ep + ', sample (' + X[i][0] + ',' + X[i][1] + '): score z = ' + z + ' → out ' + out + ', target ' + T[name][i] + '. ';
          if (err !== 0) { mistakes++; w1 += err * X[i][0]; w2 += err * X[i][1]; b += err; narr += '<span class="c-r">Wrong (error ' + err + ')</span> → weights become (' + w1 + ', ' + w2 + ', ' + b + ').'; }
          else narr += '<span class="c-g">Correct</span> → no change.';
          rows.push([ep, X[i][0] + ',' + X[i][1], T[name][i], out, err === 0 ? '-' : err, w1 + ', ' + w2 + ', ' + b]);
          var hl = {}; hl[rows.length - 1] = err === 0 ? 'ok' : 'bad';
          var vh = err === 0 ? {} : { w1: 'cur', w2: 'cur', b: 'cur' };
          frames.push({ narr: narr, parts: [{ type: 'vars', label: 'weights now', vals: { w1: w1, w2: w2, b: b, z_was: z }, hl: vh }, { type: 'table', label: 'Training log', columns: ['epoch', 'x1,x2', 'target', 'out', 'error', 'new w1,w2,b'], rows: rows.slice(-8), hl: (function () { var h = {}; h[Math.min(rows.length, 8) - 1] = err === 0 ? 'ok' : 'bad'; return h; })() }] });
        }
        if (mistakes === 0) { frames.push({ narr: '<span class="c-g">A full pass with zero mistakes: learned!</span> Final weights (' + w1 + ', ' + w2 + ') and bias ' + b + '.', parts: [{ type: 'vars', vals: { w1: w1, w2: w2, b: b, epochs: ep }, hl: { w1: 'ok', w2: 'ok', b: 'ok' } }] }); return frames; }
      }
      frames.push({ narr: '<span class="c-r">Still making mistakes after ' + maxEp + ' epochs.</span> The weights keep swinging back and forth: a single straight line cannot solve ' + name + '. This is the XOR wall.', parts: [{ type: 'vars', vals: { w1: w1, w2: w2, b: b, epochs: maxEp }, hl: { w1: 'bad', w2: 'bad', b: 'bad' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Hand-run OR for one pass', html: `<p>Start (0,0,0), lr = 1. Sample (0,0) target 0: z=0, out 0, fine. Sample (0,1) target 1: z=0 → out 0, error +1 → w2=1, b=1. Sample (1,0) target 1: z = 0+0+1 = 1 &gt; 0 → out 1, correct. Sample (1,1) target 1: z = 0+1+1 = 2 → correct. Next pass: (0,0): z = 1 → out 1 but target 0, error −1 → b = 0. Soon it settles on something like w=(1,1), b=0. Every update is tiny arithmetic, nothing mysterious.</p>` },
    { title: 'Why a line cannot do XOR (geometric proof sketch)', html: `<p>Suppose <code>w1·x1 + w2·x2 + b</code> works. For (0,0) we need b ≤ 0. For (0,1) we need w2 + b &gt; 0, for (1,0) w1 + b &gt; 0. Adding the last two: w1 + w2 + 2b &gt; 0. But (1,1) must be 0, so w1 + w2 + b ≤ 0, and since b ≤ 0 this gives w1 + w2 + 2b ≤ 0. <span class="c-r">Contradiction</span>: no weights exist.</p>` },
    { title: 'A perceptron as a hiring rule', html: `<p>Inputs: years of experience (x1), passed coding test (x2 ∈ {0,1}). Weights (0.5, 3), bias −3. A candidate with 2 years and a pass scores 1 + 3 − 3 = 1 &gt; 0 → hire. With 8 years and no pass: 4 − 3 = 1 → hire. With 2 years and no pass: 1 − 3 = −2 → reject. The weights literally encode "what we care about".</p>`, code: { lang: 'python', run: true, code: `w = (0.5, 3.0); b = -3.0
for years, passed in [(2, 1), (8, 0), (2, 0)]:
    z = w[0] * years + w[1] * passed + b
    print(years, passed, "score", z, "->", "hire" if z > 0 else "reject")` } }
  ],
  deepDive: `<p>🟣 <b>Internals.</b> The perceptron convergence theorem: if the data is linearly separable with margin γ and all inputs have norm at most R, the algorithm makes at most (R/γ)² mistakes, no matter how many samples there are. If the data is <i>not</i> separable it never converges and cycles forever (you saw this with XOR), which is why real training uses a smooth loss and gradient descent instead of a hard step.</p>
  <p>The step function has zero slope almost everywhere, so you cannot do calculus through it; the perceptron rule is a clever hack, not a gradient. Swap the step for a sigmoid and the same neuron becomes <b>logistic regression</b>, trained with real gradients. That is the bridge from 1958 to modern deep learning.</p>
  <p><b>Bias as a weight.</b> The bias is just a weight on an extra input that is always 1, which is why code often appends a 1 to every input vector. <b>Geometry:</b> the weights are the normal vector of the dividing line (a hyperplane in more dimensions); the bias shifts it away from the origin.</p>
  <p><b>Fixing XOR:</b> XOR = (x1 OR x2) AND NOT (x1 AND x2). Two perceptrons compute OR and AND, and a third combines them. Two layers solve it; that is the seed of the "universal approximation" idea.</p>`,
  aiEra: `<p><b>What AI changes:</b> nobody trains raw perceptrons for work, but every neuron inside a modern LLM is this same "weighted sum plus bias, then a nonlinearity" unit, repeated billions of times. Knowing the single neuron makes giant models feel less magical.</p>
  <p><b>Use AI as a partner:</b> ask <code>Generate 5 tiny 2D datasets, tell me which are linearly separable and why, without running code</code> and then check its claims by hand. Or ask for a visual explanation of the convergence theorem.</p>
  <p><b>Where AI goes wrong:</b> assistants often say "a single neuron can't learn XOR" without the nuance that it can if you add a feature like x1·x2, and sometimes confuse perceptron updates with true gradient descent. They also forget to include the bias update.</p>
  <p><b>What you must still own:</b> the geometric picture (a line splits the plane), why depth is needed, and being able to hand-compute an update in an interview.</p>`,
  problems: [{
    title: 'Hand-train a perceptron on NAND',
    level: 'Easy', tags: ['perceptron', 'learning rule'],
    statement: `<p>A perceptron has weights w1 = 0, w2 = 0, bias b = 0 and learning rate 1, using the step activation (output 1 if z &gt; 0 else 0). Train it on NAND (output 0 only for input (1,1)), visiting samples in the order (0,0), (0,1), (1,0), (1,1). Report the weights after the first pass and say whether it is learnable.</p>`,
    constraints: `Step activation, lr = 1, start at zeros, fixed sample order.`,
    example: `<p>Sample (0,0): z = 0 → out 0 but target <b>1</b> → error +1 → b = 1. Weights after this sample: <b>(0, 0, 1)</b>. ${H.c('g', 'NAND is linearly separable, so it will converge.')}</p>`,
    brute: { why: `<p>Guess weights by trial and error and re-check all four rows each time. It works for 2 inputs but gives no systematic method and explodes for real data.</p>`, code: { lang: 'python', check: true, code: `import itertools
# naive: try small integer weights until all four rows match NAND
for w1, w2, b in itertools.product(range(-3, 4), repeat=3):
    if all((1 if w1*x1 + w2*x2 + b > 0 else 0) == t for (x1, x2), t in [((0,0),1),((0,1),1),((1,0),1),((1,1),0)]):
        print(w1, w2, b); break` } },
    mcq: { q: 'After a correct prediction (error = 0), what does the perceptron rule do to the weights?', options: ['Leaves them unchanged', 'Increases all by lr', 'Resets them to zero'], answer: 0, explain: 'The update is lr × error × input; with error 0 the whole change is 0.' },
    hints: [`<p>Compute z = w1·x1 + w2·x2 + b for each sample, then error = target − out. Only nonzero errors change anything.</p>`, `<p>Update: w1 += error·x1, w2 += error·x2, b += error. Keep a small table of the weights after every sample.</p>`, `<p>Run it: (0,0) t=1 → b=1. (0,1) t=1: z=1 → ok. (1,0) t=1: z=1 → ok. (1,1) t=0: z=1 → out 1, error −1 → w1=−1, w2=−1, b=0. Next pass fixes (0,0) (z=0, target 1: b=1)... and it settles.</p>`],
    solution: {
      approach: `<p>Go sample by sample. (0,0): z=0, out 0, target 1, error +1 → (0,0,1). (0,1): z=1, out 1 ✓. (1,0): z=1 ✓. (1,1): z=1, out 1, target 0, error −1 → w1 = −1, w2 = −1, b = 0 → <b>(−1, −1, 0)</b> after the first pass. A second pass: (0,0): z=0 → out 0, target 1, error +1 → b=1; (0,1): z = −1+1 = 0 → out 0, target 1, error +1 → w2=0, b=2; (1,0): z = −1+2 = 1 ✓; (1,1): z = −1+0+2 = 1, target 0 → error −1 → (−2, −1, 1). Continue and it converges because NAND is linearly separable (NAND is the opposite of AND). Takeaway: separable gates always settle; XOR never does.</p>`,
      code: { lang: 'python', run: true, code: `data = [((0,0),1), ((0,1),1), ((1,0),1), ((1,1),0)]
w1 = w2 = b = 0
for epoch in range(1, 20):
    mistakes = 0
    for (x1, x2), t in data:
        out = 1 if w1*x1 + w2*x2 + b > 0 else 0
        e = t - out
        if e:
            mistakes += 1
            w1 += e*x1; w2 += e*x2; b += e
    print("epoch", epoch, "weights", (w1, w2, b), "mistakes", mistakes)
    if mistakes == 0:
        break` },
      dry: { head: ['sample', 'z', 'out', 'target', 'weights after'], rows: [['(0,0)', '0', '0', '1', '(0,0,1)'], ['(0,1)', '1', '1', '1', '(0,0,1)'], ['(1,0)', '1', '1', '1', '(0,0,1)'], ['(1,1)', '1', '1', '0', '(-1,-1,0)']] },
      complexity: `<p>Each update is O(inputs). Convergence on separable data is bounded by (R/γ)² mistakes.</p>`,
      followUps: ['How many mistakes can it make in the worst case?', 'What changes if you use lr = 0.1?']
    }
  }]
});

topics.push({
  title: 'Layers, Activations (ReLU, Sigmoid, Tanh) and the Forward Pass',
  analogy: `<p>Picture an assembly line of inspectors. The first row of inspectors each look at the raw product and write a short opinion ("looks round", "looks shiny"). The next row reads those opinions, not the product, and forms bigger opinions ("looks like a ball"). The last inspector reads those and gives the final verdict. Each inspector = a neuron, each row = a <b>layer</b>, and passing opinions forward row by row = the <b>forward pass</b>. The <b>activation function</b> is each inspector's "how loudly do I speak?" rule.</p>`,
  explain: `<p>🟢 <b>One neuron</b> = weighted sum + bias, then an <b>activation</b>: <code>a = f(w·x + b)</code>. <b>One layer</b> = many neurons that all read the same inputs. <b>A network</b> = layers feeding layers. The <b>forward pass</b> is just doing this arithmetic from the input to the output.</p>
  <p><b>Why activations?</b> Without them, two stacked layers collapse into one big weighted sum (a straight line again, and XOR fails). The activation bends the line, so stacking layers can draw curved shapes.</p>
  ${H.table(['Activation', 'Formula', 'Range', 'Good for', 'Watch out'], [['ReLU', 'max(0, z)', '0 to ∞', 'Default for hidden layers: fast, no squashing for positives', '"Dead" neurons if z is always negative'], ['Sigmoid', '1 / (1 + e<sup>−z</sup>)', '0 to 1', 'Output of a yes/no probability', 'Flat at both ends → vanishing gradients'], ['Tanh', '(e<sup>z</sup> − e<sup>−z</sup>) / (e<sup>z</sup> + e<sup>−z</sup>)', '−1 to 1', 'Centered hidden units, RNNs', 'Also flat at the ends'], ['Softmax', 'e<sup>zᵢ</sup> / ∑e<sup>zⱼ</sup>', '0 to 1, sums to 1', 'Output layer for many classes', 'Needs numerical-stability trick']])}
  <p><b>A 2-2-1 forward pass by hand.</b> Inputs x = (1, 2). Hidden: h1 = ReLU(0.5·1 + 0.2·2 + 0.1) = ReLU(1.0) = <b>1.0</b>; h2 = ReLU(−0.3·1 + 0.8·2 − 0.2) = ReLU(1.1) = <b>1.1</b>. Output: z = 1.0·1.0 + 2.0·1.1 − 0.5 = 2.7, y = sigmoid(2.7) ≈ <b>0.937</b>. "93.7% sure the answer is yes."</p>
  <p><b>In matrix words</b> (nice for code): <code>h = f(W1·x + b1)</code>, then <code>y = g(W2·h + b2)</code>. Each layer is one matrix multiply plus an activation, which is why GPUs (matrix machines) rule deep learning.</p>
  <p><b>Choosing an activation, the short rule:</b> hidden layers → ReLU (or GELU/SiLU in transformers). Binary output → sigmoid. Many-class output → softmax. Numeric output (like a price) → no activation (linear).</p>`,
  clues: ['"probability between 0 and 1" for one yes/no → sigmoid output', '"pick one of K classes" → softmax output', '"hidden layers of a modern net" → ReLU / GELU', '"output can be any real number (regression)" → linear output, no squash', '"forward pass", "inference" → just matrix multiplies plus activations', '"why not just stack linear layers?" → they collapse into one linear layer'],
  code: [{ lang: 'python', title: 'Activations and a 2-2-1 forward pass (stdlib, runnable)', run: true, code: `import math

def relu(z):    return max(0.0, z)
def sigmoid(z): return 1.0 / (1.0 + math.exp(-z))
def tanh(z):    return math.tanh(z)

# Compare the three activations on the same inputs
print("   z   relu  sigmoid  tanh")
for z in [-4, -2, -1, 0, 1, 2, 4]:
    print(f"{z:4d}  {relu(z):5.2f}  {sigmoid(z):6.3f}  {tanh(z):6.3f}")

# A 2-2-1 network: 2 inputs, 2 hidden ReLU neurons, 1 sigmoid output
W1 = [[0.5, 0.2],      # weights into hidden neuron 1
      [-0.3, 0.8]]     # weights into hidden neuron 2
b1 = [0.1, -0.2]
W2 = [1.0, 2.0]        # hidden -> output
b2 = -0.5

def forward(x):
    # layer 1: weighted sum + bias, then ReLU, one neuron at a time
    h = [relu(sum(W1[j][i] * x[i] for i in range(2)) + b1[j]) for j in range(2)]
    # layer 2: same recipe with a sigmoid on top
    z = sum(W2[j] * h[j] for j in range(2)) + b2
    return h, z, sigmoid(z)

h, z, y = forward([1, 2])
print("hidden:", h, " z:", round(z, 3), " output:", round(y, 3))` }],
  codeTitle: ['Activations + forward pass'],
  viz: [{
    title: 'Activation functions as bars',
    input: '-4 -2 -1 0 1 2 4',
    inputLabel: 'Input values z (space separated)',
    gen: function (input) {
      var zs = String(input).trim().split(/[\s,]+/).map(Number);
      if (!zs.length || zs.some(isNaN) || zs.length > 12) throw new Error('Enter up to 12 numbers like: -4 -2 0 2 4');
      var fs = [
        ['ReLU = max(0, z)', function (z) { return Math.max(0, z); }, 'Negative inputs are silenced; positives pass straight through.'],
        ['Sigmoid = 1/(1+e^-z)', function (z) { return 1 / (1 + Math.exp(-z)); }, 'Everything is squashed into 0..1 (a probability-like number). Far from zero the curve is flat.'],
        ['Tanh', function (z) { return Math.tanh(z); }, 'Like sigmoid but centered on 0, range -1..1.']
      ];
      var frames = [{ narr: 'Here are your inputs z as bars. Each activation function will transform them one by one.', parts: [{ type: 'bars', label: 'input z', values: zs, texts: zs.map(String), idxLabels: zs.map(String) }] }];
      fs.forEach(function (f) {
        var out = zs.map(function (z) { return f[1](z); });
        var hl = {};
        out.forEach(function (v, i) { hl[i] = v === 0 ? 'bad' : (Math.abs(v) > 0.95 ? 'sel' : 'ok'); });
        frames.push({ narr: '<b>' + f[0] + '</b>. ' + f[2], parts: [{ type: 'bars', label: 'input z', values: zs, idxLabels: zs.map(String) }, { type: 'bars', label: f[0] + ' output', values: out, texts: out.map(function (v) { return v.toFixed(2); }), idxLabels: zs.map(String), hl: hl }] });
      });
      frames.push({ narr: 'Compare: ReLU grows without limit, sigmoid and tanh flatten near their ends. Flat = tiny slope = slow learning (the root of "vanishing gradients").', parts: fs.map(function (f) { var o = zs.map(function (z) { return f[1](z); }); return { type: 'bars', label: f[0], values: o, texts: o.map(function (v) { return v.toFixed(2); }), idxLabels: zs.map(String) }; }) });
      return frames;
    }
  }, {
    title: 'Forward pass through a 2-2-1 network',
    input: '1 2',
    inputLabel: 'Inputs x1 x2',
    gen: function (input) {
      var x = String(input).trim().split(/[\s,]+/).map(Number);
      if (x.length !== 2 || x.some(isNaN)) throw new Error('Enter two numbers like: 1 2');
      var W1 = [[0.5, 0.2], [-0.3, 0.8]], b1 = [0.1, -0.2], W2 = [1.0, 2.0], b2 = -0.5;
      var relu = function (z) { return Math.max(0, z); }, sig = function (z) { return 1 / (1 + Math.exp(-z)); };
      var z1 = [0, 1].map(function (j) { return W1[j][0] * x[0] + W1[j][1] * x[1] + b1[j]; });
      var h = z1.map(relu);
      var z2 = W2[0] * h[0] + W2[1] * h[1] + b2, y = sig(z2);
      function r(v) { return Math.round(v * 1000) / 1000; }
      function g(hl, ehl, tags) {
        return { type: 'graph', label: 'Network: x → hidden (ReLU) → output (sigmoid)', directed: true, height: 50,
          nodes: [{ id: 'x1', label: 'x1', x: 10, y: 10 }, { id: 'x2', label: 'x2', x: 10, y: 40 }, { id: 'h1', label: 'h1', x: 50, y: 10 }, { id: 'h2', label: 'h2', x: 50, y: 40 }, { id: 'y', label: 'y', x: 88, y: 25 }],
          edges: [['x1', 'h1', W1[0][0]], ['x2', 'h1', W1[0][1]], ['x1', 'h2', W1[1][0]], ['x2', 'h2', W1[1][1]], ['h1', 'y', W2[0]], ['h2', 'y', W2[1]]], hl: hl, ehl: ehl, tags: tags };
      }
      var tg0 = { x1: String(x[0]), x2: String(x[1]) };
      var frames = [];
      frames.push({ narr: 'Inputs enter: x1 = <b>' + x[0] + '</b>, x2 = <b>' + x[1] + '</b>. Numbers on the edges are the weights; each neuron also has a bias (h1: 0.1, h2: -0.2, y: -0.5).', parts: [g({ x1: 'cur', x2: 'cur' }, {}, tg0)] });
      var t1 = Object.assign({}, tg0, { h1: 'z=' + r(z1[0]) });
      frames.push({ narr: 'Hidden neuron h1: z = 0.5·' + x[0] + ' + 0.2·' + x[1] + ' + 0.1 = <b>' + r(z1[0]) + '</b>.', parts: [g({ h1: 'cur' }, { 'x1-h1': 'cur', 'x2-h1': 'cur' }, t1)] });
      t1.h1 = 'ReLU → ' + r(h[0]);
      frames.push({ narr: 'ReLU(' + r(z1[0]) + ') = <b>' + r(h[0]) + '</b>' + (z1[0] <= 0 ? ' (negative → silenced to 0)' : '') + '. So h1 outputs ' + r(h[0]) + '.', parts: [g({ h1: 'ok' }, {}, t1)] });
      var t2 = Object.assign({}, t1, { h2: 'z=' + r(z1[1]) });
      frames.push({ narr: 'Hidden neuron h2: z = -0.3·' + x[0] + ' + 0.8·' + x[1] + ' - 0.2 = <b>' + r(z1[1]) + '</b>.', parts: [g({ h1: 'ok', h2: 'cur' }, { 'x1-h2': 'cur', 'x2-h2': 'cur' }, t2)] });
      t2.h2 = 'ReLU → ' + r(h[1]);
      frames.push({ narr: 'ReLU(' + r(z1[1]) + ') = <b>' + r(h[1]) + '</b>. The hidden layer is done: h = (' + r(h[0]) + ', ' + r(h[1]) + ').', parts: [g({ h1: 'ok', h2: 'ok' }, {}, t2)] });
      var t3 = Object.assign({}, t2, { y: 'z=' + r(z2) });
      frames.push({ narr: 'Output neuron: z = 1.0·' + r(h[0]) + ' + 2.0·' + r(h[1]) + ' - 0.5 = <b>' + r(z2) + '</b>.', parts: [g({ h1: 'ok', h2: 'ok', y: 'cur' }, { 'h1-y': 'cur', 'h2-y': 'cur' }, t3)] });
      t3.y = 'σ → ' + r(y);
      frames.push({ narr: 'Sigmoid(' + r(z2) + ') = <b>' + r(y) + '</b>. The network says "' + Math.round(y * 100) + '% yes". That is a complete forward pass: multiply, add, activate, repeat.', parts: [g({ y: 'sel' }, { 'h1-y': 'ok', 'h2-y': 'ok' }, t3), { type: 'vars', vals: { h1: r(h[0]), h2: r(h[1]), output: r(y) }, hl: { output: 'sel' } }] });
      return frames;
    }
  }],
  examples: [
    { title: 'Why no activation = no power', html: `<p>Layer 1: h = 2·x. Layer 2: y = 3·h. Together y = 6·x, still a straight line. Any number of linear layers is equal to one linear layer. Insert a ReLU between them and you can make a "hinge": <code>y = 3·max(0, 2x − 1)</code>. Adding hinges together builds any curve, which is the intuition behind universal approximation.</p>` },
    { title: 'Counting parameters', html: `<p>A layer with 784 inputs and 128 neurons has 784×128 weights + 128 biases = <b>100,480</b> parameters. A following 128→10 layer adds 128×10 + 10 = 1,290. Total 101,770 for a tiny digit classifier. GPT-style models have the same recipe at billions of parameters.</p>`, code: { lang: 'python', run: true, code: `def params(sizes):
    # sizes like [784, 128, 10]: each layer has in*out weights + out biases
    return sum(a * b + b for a, b in zip(sizes, sizes[1:]))
print(params([784, 128, 10]))
print(params([2, 2, 1]))` } },
    { title: 'Softmax for three classes', html: `<p>Raw scores (logits) 2.0, 1.0, 0.1. Exponentials: 7.39, 2.72, 1.11; sum 11.21. Probabilities: <b>0.66, 0.24, 0.10</b>. They add to 1 and keep the order of the scores. Subtract the max score before exponentiating so e<sup>z</sup> never overflows.</p>`, code: { lang: 'python', run: true, code: `import math
def softmax(zs):
    m = max(zs)                       # stability trick: subtract the max
    es = [math.exp(z - m) for z in zs]
    s = sum(es)
    return [e / s for e in es]
print([round(p, 3) for p in softmax([2.0, 1.0, 0.1])])` } }
  ],
  deepDive: `<p>🟣 <b>Expert layer.</b> <b>Universal approximation:</b> one hidden layer with enough neurons can approximate any reasonable function; depth just makes it <i>efficient</i> (deep nets reuse features compositionally instead of needing exponentially many neurons).</p>
  <p><b>Activation zoo in practice:</b> <b>Leaky ReLU</b> keeps a small slope for negatives to fix dying ReLUs. <b>GELU</b> and <b>SiLU/Swish</b> are smooth ReLU cousins used in BERT/GPT-class models; <b>SwiGLU</b> (a gated variant) is common in modern LLMs. Sigmoid and tanh survive inside gates (LSTM) and output heads.</p>
  <p><b>Initialisation matters.</b> If every weight starts at 0, every neuron in a layer computes the same thing and receives the same gradient, so they stay identical forever (symmetry problem). Use random starts scaled by layer size: <b>Xavier/Glorot</b> for tanh/sigmoid, <b>He/Kaiming</b> for ReLU, so activations neither explode nor shrink as depth grows.</p>
  <p><b>Batching:</b> real code pushes a whole batch of examples as a matrix (batch × features), so a forward pass is a few big matrix multiplies. <b>Normalisation layers</b> (BatchNorm, LayerNorm) re-centre activations between layers to keep training stable. <b>Numerics:</b> sigmoid/softmax overflow for large |z|; frameworks fuse "softmax + log + loss" into one stable operation.</p>`,
  aiEra: `<p><b>What AI changes:</b> you rarely write a forward pass from scratch; you declare layers in PyTorch/JAX and the framework runs it. But LLMs <i>are</i> forward passes: generating one token is one pass through every layer, which is why latency and cost scale with model size.</p>
  <p><b>Use AI as a partner:</b> ask <code>Write a tiny PyTorch MLP for 784-128-10, then show the tensor shape after every layer</code> and verify each shape yourself. Ask it to explain a shape-mismatch error from your own code.</p>
  <p><b>Where AI goes wrong:</b> it may recommend sigmoid for hidden layers by habit, put softmax before a loss that already includes it (a classic double-softmax bug), or give shape comments that are off by a transpose.</p>
  <p><b>What you must still own:</b> choosing the output activation to match the task, reading shapes (batch, features), and spotting when "the loss is NaN" means an overflow or a bad learning rate.</p>`,
  problems: [{
    title: 'Compute a 2-layer forward pass by hand',
    level: 'Easy', tags: ['forward pass', 'activation'],
    statement: `<p>A network has 2 inputs, 2 hidden ReLU neurons and 1 linear output. Hidden neuron 1 has weights (1, −1), bias 0; hidden neuron 2 has weights (0.5, 0.5), bias −1. The output has weights (2, 3) and bias 1. Compute the output for x = (3, 1).</p>`,
    constraints: `Hidden: ReLU. Output: no activation. Show every intermediate number.`,
    example: `<p>h1: z = 1·3 + (−1)·1 + 0 = 2 → ReLU 2. h2: z = 0.5·3 + 0.5·1 − 1 = 1 → ReLU 1. Output = 2·2 + 3·1 + 1 = <b>8</b>. ${H.c('g', 'Each layer: weighted sum, bias, activation.')}</p>`,
    brute: { why: `<p>Writing one giant formula without naming intermediate values invites arithmetic slips and cannot be reused for other inputs. Compute layer by layer instead.</p>`, code: { lang: 'python', code: `# naive: one long expression, easy to get wrong and impossible to debug
x1, x2 = 3, 1
y = 2 * max(0, 1*x1 - 1*x2) + 3 * max(0, 0.5*x1 + 0.5*x2 - 1) + 1
print(y)` } },
    mcq: { q: 'If a hidden neuron has z = −2 and uses ReLU, what does it pass to the next layer?', options: ['0', '−2', '2'], answer: 0, explain: 'ReLU(z) = max(0, z), so negative sums are silenced to 0.' },
    hints: [`<p>Do hidden layer first, one neuron at a time. Write z, then the activation result.</p>`, `<p>ReLU keeps positives and turns negatives into 0. The output layer here has no activation, so just compute the weighted sum plus bias.</p>`, `<p>Recipe: h1 = max(0, 3 − 1) = 2; h2 = max(0, 1.5 + 0.5 − 1) = 1; y = 2·2 + 3·1 + 1 = 8. Try x = (0, 1): h1 = max(0, −1) = 0, h2 = max(0, −0.5) = 0, y = 1.</p>`],
    solution: {
      approach: `<p>Hidden neuron 1: z1 = 1·3 + (−1)·1 + 0 = 2, ReLU gives 2. Hidden neuron 2: z2 = 0.5·3 + 0.5·1 − 1 = 1, ReLU gives 1. Output: y = 2·2 + 3·1 + 1 = 8. Writing the layers as a table keeps it tidy and lets you reuse the same steps for any input. For x = (0,1) both hidden neurons are silenced and the output is just the bias, 1, which shows how ReLU can "turn off" parts of the network for some inputs.</p>`,
      code: { lang: 'python', run: true, code: `def relu(z): return max(0.0, z)
def net(x1, x2):
    h1 = relu(1 * x1 + (-1) * x2 + 0)
    h2 = relu(0.5 * x1 + 0.5 * x2 - 1)
    return 2 * h1 + 3 * h2 + 1
print(net(3, 1), net(0, 1))` },
      dry: { head: ['step', 'computation', 'result'], rows: [['h1 sum', '1·3 − 1·1 + 0', '2'], ['h1 ReLU', 'max(0, 2)', '2'], ['h2 sum', '0.5·3 + 0.5·1 − 1', '1'], ['h2 ReLU', 'max(0, 1)', '1'], ['output', '2·2 + 3·1 + 1', '8']] },
      complexity: `<p>Cost = number of weights (multiply-adds): here 4 + 2 = 6.</p>`,
      followUps: ['Replace the output with sigmoid: what is the new output?', 'Write the same pass as matrix multiplications.']
    }
  }, {
    title: 'Pick the right activation',
    level: 'Easy', tags: ['activation', 'design'],
    statement: `<p>You are building three models: (A) spam or not spam, (B) predict a house price in dollars, (C) classify a photo as cat, dog or bird. For each, name the activation on the <b>output</b> layer and the usual activation for the hidden layers, and justify in one line each.</p>`,
    constraints: `Answer in words; no code needed.`,
    example: `<p>(A) sigmoid (one probability) · (B) none/linear (any real number) · (C) softmax (three probabilities summing to 1). Hidden layers: ReLU.</p>`,
    brute: { why: `<p>Using sigmoid everywhere "because it is classic". It works for tiny nets but makes gradients vanish in deep ones, and a sigmoid on a price output would cap it between 0 and 1.</p>` },
    mcq: { q: 'Which output activation fits "pick exactly one of 10 digits"?', options: ['Softmax', 'ReLU', 'Tanh'], answer: 0, explain: 'Softmax makes 10 positive numbers that sum to 1, readable as class probabilities.' },
    hints: [`<p>Ask: what shape and range must the output have? One probability? A free number? A probability per class?</p>`, `<p>Match the output range to the task; keep ReLU-style activations inside.</p>`, `<p>If a class can be both (multi-label, like "contains cat" and "contains dog"), use one sigmoid per label, not softmax.</p>`],
    solution: {
      approach: `<p>(A) Binary classification: one output neuron with sigmoid, giving P(spam) between 0 and 1, trained with binary cross-entropy. (B) Regression: a linear output (no activation) because a price can be any positive number; train with mean squared error (and maybe predict log-price so the scale is friendlier). (C) Multi-class with exactly one right answer: three output neurons with softmax so the probabilities sum to 1, trained with cross-entropy. For all three, hidden layers use ReLU (or GELU in transformers) because it is cheap and does not flatten for positive inputs, which keeps gradients alive. A trap: if an image can contain several animals at once, that is multi-label and needs independent sigmoids rather than softmax. In practice frameworks accept raw logits and apply the sigmoid or softmax inside a numerically stable loss function.</p>`,
      complexity: `<p>No computation, but the choice decides whether the loss is well behaved.</p>`,
      followUps: ['Why do frameworks want logits instead of probabilities in the loss?', 'What if the price must be positive?']
    }
  }]
});

topics.push({
  title: 'Backpropagation: Blame Passed Backwards (Chain Rule)',
  analogy: `<p>A restaurant serves a bad dish. The manager asks the chef "why?", the chef blames the sauce, the sauce cook blames the salt amount, the buyer blames the salt supplier. Each person only needs to know <i>how much they contributed to the person right after them</i>; blame flows backward and gets multiplied along the way. That is <b>backpropagation</b>: start with the error at the end, and pass "how much did you matter?" back through every step, multiplying local slopes (the <b>chain rule</b>).</p>`,
  explain: `<p>🟢 <b>The goal.</b> After a forward pass we have a loss L (how wrong we were). For every weight we want one number: <b>"if I nudge this weight up a little, does the loss go up or down, and by how much?"</b> That number is the <b>gradient</b> ∂L/∂w. Then gradient descent moves each weight a little in the direction that lowers the loss.</p>
  <p><b>Chain rule in one sentence:</b> if A affects B and B affects C, then (effect of A on C) = (effect of A on B) × (effect of B on C). A neural net is a long chain, so gradients are products of small local slopes.</p>
  <p><b>One weight, fully by hand.</b> Tiny chain: input x = 1 → a = w1·x → h = σ(a) → z = w2·h → y = σ(z) → loss L = ½(y − t)², with w1 = 0.5, w2 = 0.8, target t = 1.</p>
  ${H.table(['Forward', 'value'], [['a = 0.5·1', '0.5'], ['h = σ(0.5)', '0.6225'], ['z = 0.8·0.6225', '0.4980'], ['y = σ(0.498)', '0.6220'], ['L = ½(0.622 − 1)²', '0.0714']])}
  <p>Backward, one local slope at a time (each line reuses the line above):</p>
  ${H.table(['Step', 'Local rule', 'Value'], [['∂L/∂y', 'y − t', '−0.3780'], ['∂L/∂z', '× σ′(z) = y(1−y)', '−0.3780 × 0.2351 = −0.0889'], ['∂L/∂w2', '× h (since z = w2·h)', '−0.0889 × 0.6225 = <b>−0.0553</b>'], ['∂L/∂h', '× w2', '−0.0889 × 0.8 = −0.0711'], ['∂L/∂a', '× σ′(a) = h(1−h)', '−0.0711 × 0.2350 = −0.0167'], ['∂L/∂w1', '× x', '<b>−0.0167</b>']])}
  <p>Both gradients are negative: increasing either weight <i>lowers</i> the loss, so gradient descent will increase them. Notice ∂L/∂w1 is much smaller than ∂L/∂w2: the farther back, the more small factors (σ′ ≤ 0.25) were multiplied in. That is the seed of the <b>vanishing gradient</b> problem.</p>
  <p><b>Why it is efficient:</b> backprop reuses each intermediate result once, so computing <i>all</i> gradients costs about the same as two forward passes, not one pass per weight.</p>
  <p><b>Vanishing gradients, plainly.</b> With sigmoid, each layer multiplies the blame by at most 0.25. After 10 layers: 0.25<sup>10</sup> ≈ 10<sup>−6</sup>. Early layers hardly learn. ReLU has slope exactly 1 for positive inputs, so blame survives; residual connections add a "shortcut" path so it survives even better. The opposite disease is <b>exploding gradients</b> (factors &gt; 1), fixed by gradient clipping and good initialisation.</p>`,
  clues: ['"how does the network learn?" → backprop + gradient descent', '"chain rule", "compute ∂L/∂w" → multiply local derivatives backward', '"early layers don\'t learn", "gradients near zero in deep sigmoid net" → vanishing gradients', '"loss becomes NaN / weights blow up" → exploding gradients, lower lr, clip', '"autograd", "computational graph" → backprop automated', '"training uses about 2-3x the memory of inference" → activations stored for the backward pass'],
  code: [{ lang: 'python', title: 'XOR solved by a 2-2-1 MLP with manual backprop (stdlib, runnable)', run: true, code: `import math, random

def sigmoid(z):
    return 1.0 / (1.0 + math.exp(-z))

random.seed(3)
# 2-2-1 network: W1[j][i] = weight from input i to hidden j
W1 = [[random.uniform(-1, 1) for _ in range(2)] for _ in range(2)]
b1 = [0.0, 0.0]
W2 = [random.uniform(-1, 1) for _ in range(2)]   # hidden -> output
b2 = 0.0
data = [([0, 0], 0), ([0, 1], 1), ([1, 0], 1), ([1, 1], 0)]   # XOR
lr = 1.0

def forward(x):
    h = [sigmoid(W1[j][0] * x[0] + W1[j][1] * x[1] + b1[j]) for j in range(2)]
    y = sigmoid(W2[0] * h[0] + W2[1] * h[1] + b2)
    return h, y

for epoch in range(1, 5001):
    loss = 0.0
    for x, t in data:
        h, y = forward(x)
        loss += 0.5 * (y - t) ** 2
        # BACKWARD, output layer first (chain rule)
        d_out = (y - t) * y * (1 - y)                           # dL/dz_out
        d_h = [d_out * W2[j] * h[j] * (1 - h[j]) for j in range(2)]  # dL/dz_hidden
        # gradient descent step: weight -= lr * (blame * input to that weight)
        for j in range(2):
            W2[j] -= lr * d_out * h[j]
            for i in range(2):
                W1[j][i] -= lr * d_h[j] * x[i]
            b1[j] -= lr * d_h[j]
        b2 -= lr * d_out
    if epoch in (1, 500, 1000, 5000):
        print("epoch", epoch, "loss", round(loss, 4))

for x, t in data:
    print(x, "target", t, "output", round(forward(x)[1], 3))` },
  { lang: 'python', title: 'Check backprop against a numerical gradient (runnable)', run: true, code: `import math
def sig(z): return 1 / (1 + math.exp(-z))

def loss(w1, w2, x=1.0, t=1.0):
    h = sig(w1 * x)
    y = sig(w2 * h)
    return 0.5 * (y - t) ** 2

x, t, w1, w2 = 1.0, 1.0, 0.5, 0.8
# forward, remembering every intermediate value
a = w1 * x; h = sig(a); z = w2 * h; y = sig(z)
# backward by the chain rule
dy = y - t
dz = dy * y * (1 - y)
dw2 = dz * h
dh = dz * w2
da = dh * h * (1 - h)
dw1 = da * x
print("backprop  dw1 =", round(dw1, 5), " dw2 =", round(dw2, 5))

# numerical check: nudge the weight both ways and watch the loss
eps = 1e-6
num1 = (loss(w1 + eps, w2) - loss(w1 - eps, w2)) / (2 * eps)
num2 = (loss(w1, w2 + eps) - loss(w1, w2 - eps)) / (2 * eps)
print("numerical dw1 =", round(num1, 5), " dw2 =", round(num2, 5))` }],
  codeTitle: ['XOR with manual backprop', 'Gradient check'],
  viz: [{
    title: 'Forward pass, then backward pass (chain rule)',
    input: '1 0.5 0.8 1',
    inputLabel: 'x, w1, w2, target t',
    gen: function (input) {
      var p = String(input).trim().split(/[\s,]+/).map(Number);
      if (p.length !== 4 || p.some(isNaN)) throw new Error('Enter four numbers: x w1 w2 t  (e.g. 1 0.5 0.8 1)');
      var x = p[0], w1 = p[1], w2 = p[2], t = p[3];
      var sig = function (z) { return 1 / (1 + Math.exp(-z)); }, r = function (v) { return Math.round(v * 10000) / 10000; };
      var a = w1 * x, h = sig(a), z = w2 * h, y = sig(z), L = 0.5 * (y - t) * (y - t);
      var dy = y - t, dz = dy * y * (1 - y), dw2 = dz * h, dh = dz * w2, da = dh * h * (1 - h), dw1 = da * x;
      var ids = ['x', 'a', 'h', 'z', 'y', 'L'], xs = [6, 22, 40, 58, 76, 93];
      var nodes = ids.map(function (id, i) { return { id: id, label: id === 'L' ? 'Loss' : id, x: xs[i], y: 20, shape: 'box', w: 12 }; });
      var edges = [['x', 'a', 'w1=' + w1], ['a', 'h', 'σ'], ['h', 'z', 'w2=' + w2], ['z', 'y', 'σ'], ['y', 'L', '½(y-t)²']];
      function G(hl, ehl, tags) { return { type: 'graph', label: 'Computation graph (weights on edges)', directed: true, height: 40, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags }; }
      var tags = { x: String(x) }, frames = [];
      frames.push({ narr: 'Plan: go <b>forward</b> to get the loss, then go <b>backward</b>, multiplying one local slope per step, to get ∂L/∂w1 and ∂L/∂w2.', parts: [G({ x: 'cur' }, {}, tags)] });
      tags.a = r(a); frames.push({ narr: 'Forward: a = w1·x = ' + w1 + '·' + x + ' = <b>' + r(a) + '</b>.', parts: [G({ a: 'cur' }, { 'x-a': 'cur' }, tags)] });
      tags.h = r(h); frames.push({ narr: 'Forward: h = σ(a) = <b>' + r(h) + '</b>.', parts: [G({ h: 'cur' }, { 'a-h': 'cur' }, tags)] });
      tags.z = r(z); frames.push({ narr: 'Forward: z = w2·h = <b>' + r(z) + '</b>.', parts: [G({ z: 'cur' }, { 'h-z': 'cur' }, tags)] });
      tags.y = r(y); frames.push({ narr: 'Forward: y = σ(z) = <b>' + r(y) + '</b> (target ' + t + ').', parts: [G({ y: 'cur' }, { 'z-y': 'cur' }, tags)] });
      tags.L = r(L); frames.push({ narr: 'Forward done. Loss L = ½(y − t)² = <b>' + r(L) + '</b>. Now we walk backward.', parts: [G({ L: 'bad' }, { 'y-L': 'cur' }, tags), { type: 'vars', vals: { loss: r(L) }, hl: { loss: 'bad' } }] });
      var bt = {}; bt.y = 'dL/dy=' + r(dy);
      frames.push({ narr: 'Backward: ∂L/∂y = y − t = <b>' + r(dy) + '</b>. ' + (dy < 0 ? 'Negative means "output too low; pushing y up reduces the loss".' : 'Positive means "output too high".'), parts: [G({ y: 'sel', L: 'done' }, { 'y-L': 'ok' }, bt)] });
      bt.z = 'dL/dz=' + r(dz); frames.push({ narr: 'Through the output sigmoid: ∂L/∂z = ∂L/∂y × y(1−y) = ' + r(dy) + ' × ' + r(y * (1 - y)) + ' = <b>' + r(dz) + '</b>. The flat part of sigmoid shrinks the blame.', parts: [G({ z: 'sel' }, { 'z-y': 'ok' }, bt)] });
      bt.h = 'dL/dh=' + r(dh); frames.push({ narr: 'Across the weight w2: ∂L/∂w2 = ∂L/∂z × h = <b>' + r(dw2) + '</b> (gradient for w2!). And the blame passed on to h is ∂L/∂h = ∂L/∂z × w2 = <b>' + r(dh) + '</b>.', parts: [G({ h: 'sel', z: 'done' }, { 'h-z': 'ok' }, bt), { type: 'vars', vals: { 'dL/dw2': r(dw2) }, hl: { 'dL/dw2': 'ok' } }] });
      bt.a = 'dL/da=' + r(da); frames.push({ narr: 'Through the hidden sigmoid: ∂L/∂a = ∂L/∂h × h(1−h) = <b>' + r(da) + '</b>.', parts: [G({ a: 'sel' }, { 'a-h': 'ok' }, bt)] });
      frames.push({ narr: 'Across w1: ∂L/∂w1 = ∂L/∂a × x = <b>' + r(dw1) + '</b>. Every weight now has a gradient. Update: w ← w − lr × gradient (a small step downhill).', parts: [G({ x: 'sel' }, { 'x-a': 'ok' }, bt), { type: 'vars', vals: { 'dL/dw1': r(dw1), 'dL/dw2': r(dw2), 'w1 after lr=1': r(w1 - dw1), 'w2 after lr=1': r(w2 - dw2) }, hl: { 'dL/dw1': 'ok', 'dL/dw2': 'ok' } }] });
      return frames;
    }
  }, {
    title: 'Vanishing gradients: sigmoid vs ReLU going backward',
    input: '8',
    inputLabel: 'Number of layers (2-12)',
    gen: function (input) {
      var n = parseInt(String(input).trim(), 10);
      if (isNaN(n) || n < 2 || n > 12) throw new Error('Enter a number of layers between 2 and 12');
      var sg = [1], rl = [1], idx = ['out'], frames = [];
      function fmt(v) { return v >= 0.01 ? v.toFixed(2) : v.toExponential(0); }
      frames.push({ narr: 'The gradient at the output starts at 1. Going backward through each layer we multiply by that layer\'s local slope. Sigmoid slope is at most <b>0.25</b>; ReLU slope is <b>1</b> for positive inputs.', parts: [{ type: 'bars', label: 'gradient size (sigmoid net)', values: [1], texts: ['1'], idxLabels: ['out'] }] });
      for (var k = 1; k <= n; k++) {
        sg.push(sg[k - 1] * 0.25); rl.push(rl[k - 1] * 1); idx.push('L' + (n - k + 1));
        var hl = {}; hl[k] = k >= 4 ? 'bad' : 'cur';
        frames.push({ narr: 'Layer ' + (n - k + 1) + ' from the input side: sigmoid gradient = 0.25<sup>' + k + '</sup> = <b>' + fmt(sg[k]) + '</b>, ReLU gradient stays <b>' + rl[k] + '</b>.' + (k === n ? ' <span class="c-r">The first layer receives almost nothing, so it barely learns.</span>' : ''),
          parts: [{ type: 'bars', label: 'sigmoid net: gradient size', values: sg.map(function (v) { return Math.max(v, 0.001); }), texts: sg.map(fmt), idxLabels: idx.slice(), hl: hl }, { type: 'bars', label: 'ReLU net: gradient size', values: rl.slice(), texts: rl.map(fmt), idxLabels: idx.slice() }] });
      }
      return frames;
    }
  }],
  examples: [
    { title: 'One weight update, with numbers', html: `<p>From the table above, ∂L/∂w2 = −0.0553. With learning rate 1: w2 ← 0.8 − 1·(−0.0553) = <b>0.8553</b>. Larger w2 makes z and then y larger, which moves y toward the target 1. Check: the new loss is smaller than 0.0714. Learning is just this nudge repeated millions of times.</p>` },
    { title: 'Gradient check is how you debug backprop', html: `<p>Nudge a weight by ε = 10<sup>−6</sup> both ways and compute (L(w+ε) − L(w−ε)) / 2ε. If it matches your analytic gradient to ~5 digits, your backward code is right. Slow, so used only for testing. The second code box above does exactly this and prints matching numbers for both weights.</p>` },
    { title: 'Dead ReLU', html: `<p>If a ReLU neuron's z is negative for <i>every</i> example (for instance after a huge update), its slope is 0, so no blame ever reaches its weights and it can never recover: it is "dead". Fixes: smaller learning rate, Leaky ReLU, better initialisation. Symptom: a big fraction of activations are exactly 0.</p>` }
  ],
  deepDive: `<p>🟣 <b>Internals.</b> <b>Reverse-mode autodiff.</b> Frameworks record every operation in a <i>computational graph</i> during the forward pass and then walk it in reverse, applying each op's known local derivative. That is all <code>loss.backward()</code> does. Reverse mode is chosen because networks have millions of inputs (weights) but one scalar output (the loss): reverse mode gets all gradients in one sweep.</p>
  <p><b>Matrix form.</b> For a layer <code>z = W·a + b</code> with incoming gradient δ = ∂L/∂z: ∂L/∂W = δ·aᵀ, ∂L/∂b = δ, and the gradient sent back is Wᵀ·δ, all matrix multiplies. For softmax + cross-entropy, the output delta collapses to the lovely <code>y_pred − y_true</code>.</p>
  <p><b>Memory cost.</b> Backward needs the activations from the forward pass, so training memory grows with batch size × depth. <b>Gradient checkpointing</b> stores only some activations and recomputes the rest, trading ~30% more compute for far less memory. <b>Mixed precision</b> (bf16/fp16) cuts memory and time, with loss scaling to avoid tiny gradients underflowing.</p>
  <p><b>Fixing vanishing/exploding gradients:</b> ReLU-family activations, He/Xavier initialisation, normalisation layers, <b>residual connections</b> (y = x + F(x), gradient flows through the "+" untouched) and <b>gradient clipping</b> (cap the norm, typical 1.0). Residual links are why 100-layer ResNets and 100-layer transformers train at all. Vanishing gradients through <i>time</i> are the RNN's version of the same disease (next topics).</p>
  <p><b>Not everything is differentiable:</b> argmax, sampling and hard thresholds have zero or undefined gradient; tricks (straight-through estimators, REINFORCE, Gumbel-softmax) route around them.</p>`,
  aiEra: `<p><b>What AI changes:</b> nobody hand-derives gradients any more: PyTorch/JAX autograd does it, and AI assistants write training loops. But every LLM, image model and RL policy is trained by this same loop: forward, loss, backward, update.</p>
  <p><b>Use AI as a partner:</b> paste a training curve (loss flat, loss NaN, loss oscillating) and ask for a ranked list of likely causes and one experiment to test each. Ask it to write a gradient check for a custom layer. Ask it to quiz you on chain-rule steps.</p>
  <p><b>Where AI goes wrong:</b> it confidently "fixes" a NaN loss by changing three things at once, forgets <code>optimizer.zero_grad()</code> (gradients accumulate!), or calls <code>.detach()</code> in the wrong place and silently stops learning. Its hand-derived gradients often have sign or transpose slips.</p>
  <p><b>What you must still own:</b> the mental model that blame flows backward and multiplies, so you can diagnose "why are early layers not learning?" and know which fix (activation, init, residuals, clipping) matches which symptom.</p>`,
  problems: [{
    title: 'Backprop one weight by hand',
    level: 'Medium', tags: ['backprop', 'chain rule'],
    statement: `<p>A single sigmoid neuron: z = w·x + b, y = σ(z), loss L = ½(y − t)². Given x = 2, w = 0.5, b = −1, target t = 1, compute ∂L/∂w and ∂L/∂b, and the new w after one step with learning rate 0.5.</p>`,
    constraints: `σ′(z) = y(1 − y). Round to 4 decimals.`,
    example: `<p>z = 0.5·2 − 1 = 0, y = σ(0) = 0.5, ∂L/∂y = 0.5 − 1 = −0.5, ∂L/∂z = −0.5 × (0.5 × 0.5) = −0.125, ∂L/∂w = −0.125 × x = <b>−0.25</b>, ∂L/∂b = <b>−0.125</b>. New w = 0.5 − 0.5 × (−0.25) = <b>0.625</b>.</p>`,
    brute: { why: `<p>Numerically nudging every weight and re-running the full network costs one extra forward pass <i>per weight</i>. Fine for 2 weights, impossible for a billion. Backprop gets all gradients in one backward sweep.</p>`, code: { lang: 'python', code: `import math
def L(w, b, x=2.0, t=1.0):
    y = 1 / (1 + math.exp(-(w * x + b)))
    return 0.5 * (y - t) ** 2
eps = 1e-6
print((L(0.5 + eps, -1) - L(0.5 - eps, -1)) / (2 * eps))` } },
    mcq: { q: 'In the chain rule here, ∂L/∂w equals…', options: ['∂L/∂y × ∂y/∂z × ∂z/∂w', '∂L/∂y + ∂y/∂z + ∂z/∂w', '∂L/∂y × ∂z/∂b'], answer: 0, explain: 'Slopes along one path multiply: loss to output, output to pre-activation, pre-activation to weight (which is x).' },
    hints: [`<p>Forward first: z, then y. You need y for the derivative of sigmoid.</p>`, `<p>Break the path: L → y → z → w. Multiply the three local slopes: (y − t), y(1 − y), and x.</p>`, `<p>The bias has the same path but ∂z/∂b = 1, so ∂L/∂b = ∂L/∂z. Update rule: w ← w − lr × ∂L/∂w.</p>`],
    solution: {
      approach: `<p>Forward: z = 0.5·2 + (−1) = 0, y = σ(0) = 0.5. Backward: ∂L/∂y = y − t = −0.5. The sigmoid slope is y(1−y) = 0.25, so ∂L/∂z = −0.5 × 0.25 = −0.125. Because z = w·x + b, ∂z/∂w = x = 2 and ∂z/∂b = 1. Therefore ∂L/∂w = −0.125 × 2 = −0.25 and ∂L/∂b = −0.125. Gradient descent: w_new = 0.5 − 0.5 × (−0.25) = 0.625 and b_new = −1 − 0.5 × (−0.125) = −0.9375. Both move up, which raises z and pushes y toward the target 1, exactly what we want. Confirm numerically with the brute force code: it gives about −0.25.</p>`,
      code: { lang: 'python', run: true, code: `import math
x, w, b, t, lr = 2.0, 0.5, -1.0, 1.0, 0.5
z = w * x + b
y = 1 / (1 + math.exp(-z))
dz = (y - t) * y * (1 - y)      # chain: dL/dy * dy/dz
dw, db = dz * x, dz             # dz/dw = x, dz/db = 1
print("dw", round(dw, 4), "db", round(db, 4))
print("new w", round(w - lr * dw, 4), "new b", round(b - lr * db, 4))` },
      dry: { head: ['quantity', 'formula', 'value'], rows: [['z', 'w·x + b', '0'], ['y', 'σ(z)', '0.5'], ['dL/dy', 'y − t', '−0.5'], ['dL/dz', '× y(1−y)', '−0.125'], ['dL/dw', '× x', '−0.25'], ['new w', '0.5 − 0.5·(−0.25)', '0.625']] },
      complexity: `<p>One backward sweep costs about the same as one forward pass.</p>`,
      followUps: ['How does the gradient change if the activation is ReLU and z = 0?', 'What if the loss is cross-entropy instead of squared error?']
    }
  }, {
    title: 'Explain vanishing gradients and the fixes',
    level: 'Medium', tags: ['vanishing gradient', 'concepts'],
    statement: `<p>A teammate trains a 20-layer sigmoid network and reports that loss barely moves and the first layers' weights stay almost unchanged. Explain what is happening with numbers, then list the fixes in order of how likely you would try them.</p>`,
    constraints: `A clear written explanation; use the 0.25 sigmoid slope bound.`,
    example: `<p>Max slope of sigmoid = 0.25. Through 20 layers the blame shrinks by up to 0.25<sup>20</sup> ≈ 9×10<sup>−13</sup>. First-layer gradients are essentially zero.</p>`,
    brute: { why: `<p>"Just raise the learning rate." That scales every gradient, including the last layers' healthy ones, so late layers explode while early layers still barely move. It treats the symptom, not the shrinking product.</p>` },
    mcq: { q: 'Which change most directly keeps gradients alive in a deep network?', options: ['Residual (skip) connections', 'A bigger batch size', 'Using sigmoid everywhere'], answer: 0, explain: 'A skip connection adds an identity path with slope 1, so the gradient can bypass layers that would shrink it.' },
    hints: [`<p>Backprop multiplies one slope per layer. What is the largest value sigmoid's slope can have?</p>`, `<p>Products of many numbers below 1 collapse toward 0. Which activation has slope 1 over half its range?</p>`, `<p>Fix list: ReLU/GELU, proper init (He/Xavier), normalisation, residual connections, shorter nets; for exploding side: clipping.</p>`],
    solution: {
      approach: `<p>This is the vanishing gradient problem. Backprop multiplies one local slope per layer, and sigmoid's slope is at most 0.25 (reached only at z = 0; it is far smaller where the curve is flat). Twenty layers multiply to something like 0.25<sup>20</sup> ≈ 10<sup>−12</sup>, so the first layers receive almost no signal and their weights barely change, while the last layers learn normally. Weights multiply in too, so with small weights it is even worse. Fixes, in the order I would try: (1) switch hidden activations to ReLU or GELU, whose slope is 1 for positive inputs; (2) use He/Xavier initialisation so activations start in a healthy range; (3) add normalisation layers (BatchNorm/LayerNorm); (4) add residual connections so gradient flows through an identity path; (5) reduce depth if the task does not need it. For the opposite problem, exploding gradients, use gradient clipping and a smaller learning rate. Verify by logging per-layer gradient norms before and after the change.</p>`,
      complexity: `<p>Diagnostic cost: one extra logging hook per layer.</p>`,
      followUps: ['Why do LSTMs help with vanishing gradients through time?', 'Why does Adam not fully solve this?']
    }
  }]
});

topics.push({
  title: 'Optimizers: SGD, Momentum and Adam',
  analogy: `<p>You are blindfolded on a hilly field and want the lowest point. <b>SGD</b> = feel the slope under your feet, take one step downhill, repeat. <b>Momentum</b> = you are on a rolling ball: you keep some speed from earlier steps, so you glide through bumps and speed up on long slopes (but may overshoot the bottom). <b>Adam</b> = a smart hiker with a notebook: remembers the average slope (like momentum) <i>and</i> how bumpy each direction has been, taking cautious steps where it is bumpy and bold steps where it is smooth.</p>`,
  explain: `<p>🟢 <b>Gradient descent</b> says: <code>w ← w − lr × gradient</code>. The <b>learning rate (lr)</b> is the step size: too small = painfully slow, too big = you jump past the valley and bounce or explode.</p>
  <p><b>SGD (stochastic gradient descent).</b> Computing the gradient over all data is expensive, so use a random <b>mini-batch</b> (32-4096 examples) each step. The gradient is noisy but cheap and, on average, points the right way. The noise even helps escape shallow bad spots.</p>
  <p><b>Momentum.</b> Keep a "velocity": <code>v ← β·v + g</code>, then <code>w ← w − lr × v</code> with β ≈ 0.9. Consistent slopes build up speed; zig-zag slopes cancel out. Result: faster along valleys, smoother paths.</p>
  <p><b>Adam</b> (the default for most deep learning). It keeps two running averages per weight: <code>m</code> (average gradient, the "direction") and <code>s</code> (average squared gradient, the "bumpiness"). Step = <code>lr × m / (√s + ε)</code>. Weights with big noisy gradients take small steps; weights with small steady gradients take bigger ones. Defaults: lr 1e-3, β1 0.9, β2 0.999, ε 1e-8.</p>
  <p>Test function f(x) = 0.1·x², gradient 0.2·x, start at x = 10, lr = 0.5:</p>
  ${H.table(['step', 'SGD x', 'Momentum x (β=.9)', 'Adam x'], [['1', '9.00', '9.00', '9.50'], ['3', '7.29', '4.86', '8.50'], ['5', '5.91', '<span class="c-r">−0.29 (passed the bottom)</span>', '7.52'], ['9', '3.87', '<span class="c-r">−6.04 (overshoot)</span>', '5.59'], ['15', '2.06', '<span class="c-g">0.52 (settling)</span>', '2.94']])}
  <p>SGD is slow on this gentle slope (it shrinks by 10% per step), momentum is much faster but overshoots and swings back, and Adam moves at a steady pace ≈ lr per step. No optimizer is best everywhere: that is why learning-rate tuning and schedules matter.</p>
  <p><b>Learning-rate schedules</b>: warm-up (start small), then cosine or linear decay, are standard in transformer training.</p>`,
  clues: ['"learning rate too high → loss oscillates or NaN"', '"mini-batch", "stochastic" → SGD family', '"adaptive learning rate per parameter" → Adam / RMSprop / Adagrad', '"AdamW", "weight decay decoupled" → modern transformer default', '"loss plateau", "zig-zag across a narrow valley" → momentum helps', '"warm-up then cosine decay" → standard LLM schedule'],
  code: [{ lang: 'python', title: 'SGD vs momentum vs Adam on a 1D function (stdlib, runnable)', run: true, code: `import math

def grad(x):            # f(x) = 0.1 * x^2  ->  f'(x) = 0.2 * x
    return 0.2 * x

def run(steps=15, lr=0.5, beta=0.9, start=10.0):
    xs = xm = xa = start
    v = 0.0                          # momentum "velocity"
    m = s = 0.0                      # Adam's two running averages
    b1, b2, eps = 0.9, 0.999, 1e-8
    print("step   SGD     momentum   Adam")
    for t in range(1, steps + 1):
        xs -= lr * grad(xs)                       # plain SGD
        v = beta * v + grad(xm)                   # remember past slopes
        xm -= lr * v                              # momentum step
        g = grad(xa)
        m = b1 * m + (1 - b1) * g                 # average of gradients
        s = b2 * s + (1 - b2) * g * g             # average of squared gradients
        mh, sh = m / (1 - b1 ** t), s / (1 - b2 ** t)   # bias correction
        xa -= lr * mh / (math.sqrt(sh) + eps)     # normalised step
        print(f"{t:4d}  {xs:7.3f}  {xm:8.3f}  {xa:7.3f}")

run()` }],
  codeTitle: ['Three optimizers side by side'],
  viz: {
    title: 'SGD vs Momentum vs Adam, step by step',
    input: '0.5 0.9 12',
    inputLabel: 'learning rate, momentum beta, steps (max 25)',
    gen: function (input) {
      var p = String(input).trim().split(/[\s,]+/).map(Number);
      if (p.length !== 3 || p.some(isNaN) || p[0] <= 0 || p[0] > 5 || p[1] < 0 || p[1] >= 1 || p[2] < 3 || p[2] > 25) throw new Error('Enter: lr (0-5), beta (0 to <1), steps (3-25), e.g. 0.5 0.9 12');
      var lr = p[0], beta = p[1], N = Math.floor(p[2]);
      var g = function (x) { return 0.2 * x; };
      var xs = 10, xm = 10, xa = 10, v = 0, m = 0, s = 0, b1 = 0.9, b2 = 0.999, rows = [], frames = [];
      var r = function (n) { return Math.round(n * 100) / 100; };
      frames.push({ narr: 'Minimise f(x) = 0.1·x² (a gentle bowl, bottom at x = 0). All three start at x = <b>10</b>. The bars show the distance from the bottom: shorter is better.', parts: [{ type: 'bars', label: 'distance from the minimum', values: [10, 10, 10], texts: ['10', '10', '10'], idxLabels: ['SGD', 'Momentum', 'Adam'] }] });
      for (var t = 1; t <= N; t++) {
        xs -= lr * g(xs);
        v = beta * v + g(xm); xm -= lr * v;
        var ga = g(xa); m = b1 * m + (1 - b1) * ga; s = b2 * s + (1 - b2) * ga * ga;
        var mh = m / (1 - Math.pow(b1, t)), sh = s / (1 - Math.pow(b2, t));
        xa -= lr * mh / (Math.sqrt(sh) + 1e-8);
        rows.push([t, r(xs), r(xm), r(xa)]);
        var hl = {}; hl[1] = (xm < 0) ? 'bad' : 'ok'; hl[0] = 'ok'; hl[2] = 'ok';
        var best = Math.abs(xs) <= Math.abs(xm) && Math.abs(xs) <= Math.abs(xa) ? 0 : (Math.abs(xm) <= Math.abs(xa) ? 1 : 2);
        hl[best] = 'sel';
        var note = xm < 0 ? ' <span class="c-r">Momentum has shot past the bottom (x &lt; 0): it carries speed from earlier steps.</span>' : '';
        frames.push({ narr: 'Step ' + t + ': SGD x = <b>' + r(xs) + '</b>, momentum x = <b>' + r(xm) + '</b>, Adam x = <b>' + r(xa) + '</b>.' + note,
          parts: [{ type: 'bars', label: 'distance from the minimum |x|', values: [Math.abs(xs), Math.abs(xm), Math.abs(xa)], texts: [r(xs) + '', r(xm) + '', r(xa) + ''], idxLabels: ['SGD', 'Momentum', 'Adam'], hl: hl },
            { type: 'table', label: 'Positions so far (last 6 steps)', columns: ['step', 'SGD', 'Momentum', 'Adam'], rows: rows.slice(-6) }] });
      }
      frames.push({ narr: 'Takeaway: SGD is steady but slow here, momentum is fast but can overshoot, Adam takes roughly lr-sized steps regardless of the gradient scale. Try lr 1.0 or beta 0.5 and compare.', parts: [{ type: 'vars', vals: { sgd: r(xs), momentum: r(xm), adam: r(xa) } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Learning rate too big', html: `<p>On f(x) = x² the gradient is 2x. With lr = 1.1, x ← x − 1.1·2x = −1.2x: each step flips the sign and <b>grows</b> by 20%. Loss explodes. With lr = 0.5 it lands on 0 in one step; with 0.1 it shrinks 20% per step. Rule of thumb: for a quadratic with curvature c, lr must stay below 2/c.</p>`, code: { lang: 'python', run: true, code: `for lr in (0.1, 0.5, 1.1):
    x = 5.0
    path = []
    for _ in range(5):
        x -= lr * 2 * x      # gradient of x^2 is 2x
        path.append(round(x, 2))
    print("lr", lr, path)` } },
    { title: 'Why the mini-batch gradient is noisy but fine', html: `<p>Imagine the true gradient for one weight is +1.0 (average over all data), but each example alone gives +3, −1, +2, −0.5... Averaging a batch of 64 gives something like 1.0 ± 0.3. Steps wiggle, yet on average go the right way. Bigger batch = less noise but costlier steps; a common trick is to scale lr up with the batch size.</p>` },
    { title: 'Typical settings that work', html: `<ul><li><b>Image models (CNN):</b> SGD + momentum 0.9, lr 0.1 with step/cosine decay.</li><li><b>Transformers/LLMs:</b> AdamW, lr ≈ 1e-4 to 3e-4 (pre-training) or 1e-5 to 5e-5 (fine-tuning), warm-up, cosine decay, weight decay 0.1.</li><li><b>Quick experiment:</b> Adam lr 1e-3 is a safe first try.</li></ul>` }
  ],
  deepDive: `<p>🟣 <b>Internals.</b> <b>Why Adam divides by √s:</b> it approximates a per-parameter diagonal preconditioner, so the step size becomes scale-free: if a gradient is 1000× larger, √s is 1000× larger and the step is unchanged. Early in training m and s start at 0 and are biased low, hence the <b>bias correction</b> 1/(1 − β<sup>t</sup>).</p>
  <p><b>AdamW</b> fixes a subtle bug: classic L2 regularisation inside Adam gets rescaled by the adaptive denominator. AdamW applies <i>decoupled weight decay</i> directly to the weights, and is the default for transformers. Memory: Adam stores 2 extra numbers per parameter (m and s), so optimizer state is ~2× the model size (in fp32): a major cost when training LLMs, which is why Adafactor, 8-bit optimizers and ZeRO sharding exist.</p>
  <p><b>Generalisation:</b> SGD + momentum often generalises slightly better on vision tasks; Adam trains faster and is more forgiving on transformers. <b>Sharp vs flat minima:</b> noisy small-batch SGD tends to land in flat valleys, which generalise better. <b>Large batches</b> need lr scaling and warm-up (linear scaling rule), else they converge to worse minima.</p>
  <p><b>Other tools:</b> Nesterov momentum (look ahead before computing the gradient), RMSprop (Adam without m), learning-rate finders, gradient clipping, EMA of weights, and second-order ideas (Shampoo, Muon, Lion) that are active in 2025-26 frontier training.</p>`,
  aiEra: `<p><b>What AI changes:</b> optimizer choice is now mostly a solved default (AdamW + warm-up + cosine) for transformers. The hard parts are scale: sharding optimizer state across thousands of GPUs, stable training of huge models, and cheap fine-tuning (LoRA trains only a tiny set of weights, so optimizer memory is small).</p>
  <p><b>Use AI as a partner:</b> describe your loss curve and setup and ask for a short, ordered debugging checklist; ask it to write a learning-rate range test. Ask it to explain the effect of each hyperparameter with a toy numeric example.</p>
  <p><b>Where AI goes wrong:</b> it recites "use Adam lr=3e-4" as universal truth, forgets that fine-tuning needs a much lower lr, and often applies weight decay to biases and LayerNorm parameters, which you usually exclude.</p>
  <p><b>What you must still own:</b> reading loss curves (too high lr, too low, overfitting), knowing what batch size and lr trade off, and explaining the difference between SGD, momentum and Adam in one minute.</p>`,
  problems: [{
    title: 'Two optimizer steps by hand: SGD vs momentum',
    level: 'Medium', tags: ['optimizer', 'momentum'],
    statement: `<p>Minimise f(x) = x² starting at x = 4. Use lr = 0.25. Compute x after 2 steps with (a) plain SGD and (b) momentum with β = 0.5 (v ← β·v + g, then x ← x − lr·v, with v starting at 0).</p>`,
    constraints: `Gradient of f is 2x. Show both steps for both methods.`,
    example: `<p>SGD: g = 8 → x = 4 − 0.25·8 = 2; g = 4 → x = 2 − 1 = <b>1</b>. Momentum: step1 v = 8 → x = 2; step2 g = 4, v = 0.5·8 + 4 = 8 → x = 2 − 2 = <b>0</b>. ${H.c('g', 'Momentum is ahead after 2 steps.')}</p>`,
    brute: { why: `<p>Re-deriving each step by running the full loop without tracking v gives wrong results for momentum, since v carries the history. Keep a state table.</p>`, code: { lang: 'python', code: `x = 4.0
for _ in range(2):
    x -= 0.25 * 2 * x      # plain SGD only
print(x)` } },
    mcq: { q: 'What does momentum keep between steps?', options: ['A running velocity of past gradients', 'A copy of the whole dataset', 'The previous loss only'], answer: 0, explain: 'v is an exponentially decaying sum of past gradients, so consistent directions build up speed.' },
    hints: [`<p>For f = x² the gradient is 2x. Compute it at the current x each step.</p>`, `<p>SGD needs only x. Momentum needs a table with columns x, g, v.</p>`, `<p>Step 1 for momentum: v = 0.5·0 + 8 = 8, x = 4 − 2 = 2. Step 2: g = 4, v = 0.5·8 + 4 = 8, x = 2 − 2 = 0.</p>`],
    solution: {
      approach: `<p>SGD: step 1 gradient is 2·4 = 8, so x = 4 − 0.25·8 = 2. Step 2 gradient is 4, so x = 2 − 0.25·4 = 1. Momentum: step 1 has v = 0.5·0 + 8 = 8, x = 4 − 0.25·8 = 2 (same as SGD because there is no history yet). Step 2 gradient is 4, v = 0.5·8 + 4 = 8, x = 2 − 0.25·8 = 0. So momentum lands exactly on the minimum while SGD is still at 1. The extra push comes from the remembered velocity. If we kept going, momentum would overshoot to negative x and swing back, a characteristic wobble; with a larger β the overshoot grows, which is why β is usually 0.9 only with a small enough learning rate.</p>`,
      code: { lang: 'python', run: true, code: `def sgd(x, lr, steps):
    for _ in range(steps):
        x -= lr * 2 * x
    return x

def momentum(x, lr, beta, steps):
    v = 0.0
    for _ in range(steps):
        v = beta * v + 2 * x     # v remembers past gradients
        x -= lr * v
    return x

print("SGD      :", sgd(4.0, 0.25, 2))
print("Momentum :", momentum(4.0, 0.25, 0.5, 2))` },
      dry: { head: ['step', 'SGD x', 'g (momentum)', 'v', 'Momentum x'], rows: [['0', '4', '-', '0', '4'], ['1', '2', '8', '8', '2'], ['2', '1', '4', '8', '0']] },
      complexity: `<p>O(parameters) per step; momentum stores one extra number per parameter.</p>`,
      followUps: ['What happens on step 3 for momentum?', 'Add Nesterov look-ahead: how does step 1 change?']
    }
  }]
});

topics.push({
  title: 'Embeddings: Turning Words into Meaningful Numbers',
  analogy: `<p>Imagine a giant map where every word lives at a coordinate, and <b>words with similar meaning live close together</b>: "dog" next to "puppy", "king" near "queen", "banana" far from "mortgage". An embedding is a word's (or token's, image's, user's) address on that map. The neat part: nobody draws the map by hand. The network <i>learns</i> the addresses during training, because putting similar things close makes its job easier.</p>`,
  explain: `<p>🟢 <b>Problem:</b> networks only eat numbers, and giving each word an ID like dog = 4021, cat = 87 is meaningless (4021 is not "bigger" than 87 in any useful way). One-hot vectors (a 1 in position 4021 of a 50,000-long list of zeros) are huge and treat every word as equally different from every other.</p>
  <p><b>Solution:</b> an <b>embedding table</b>, a matrix with one row per word. A word's embedding is just its row: a short list of, say, 256 to 4096 real numbers. Looking up a row = multiplying a one-hot vector by the matrix (the table is simply a layer whose weights get trained like any other).</p>
  <p><b>Meaning = direction.</b> After training, each direction in the space tends to capture an idea (gender, royalty, plural, topic...). Similarity is measured by the angle between vectors using <b>cosine similarity</b>:</p>
  <p><code>cos(a, b) = (a · b) / (|a| × |b|)</code> → 1 same direction, 0 unrelated, −1 opposite.</p>
  <p>Toy 3-number embeddings: (royalty, maleness, fruitiness).</p>
  ${H.table(['word', 'royalty', 'maleness', 'fruitiness'], [['king', '0.9', '0.8', '0.0'], ['queen', '0.85', '−0.75', '0.05'], ['man', '0.1', '0.8', '0.0'], ['woman', '0.1', '−0.8', '0.0'], ['apple', '0.0', '0.0', '0.9']])}
  <p><b>The famous analogy:</b> king − man + woman = (0.9, −0.8, 0.0), whose nearest neighbour by cosine is <b>queen</b> (0.999). "Take king, remove man-ness, add woman-ness." Real embeddings show this only roughly, but it proves the numbers carry structure.</p>
  <p><b>Where embeddings appear:</b> every LLM starts by turning tokens into embeddings; search engines embed queries and documents to find matches by meaning (the heart of RAG and vector databases); recommenders embed users and items; image and audio models embed pictures and sounds into the same kind of space.</p>`,
  clues: ['"semantic search", "find similar by meaning" → embeddings + cosine similarity', '"one-hot is too sparse / huge vocabulary" → embedding table', '"nearest neighbour in vector space" → vector DB / ANN index', '"king − man + woman" → vector arithmetic analogy', '"pre-trained word vectors" → word2vec / GloVe / fastText', '"contextual embeddings" → the same word gets different vectors in different sentences (BERT, LLMs)'],
  code: [{ lang: 'python', title: 'Embeddings, cosine similarity and the king-queen analogy (stdlib, runnable)', run: true, code: `import math

# Toy embedding table: (royalty, maleness, fruitiness)
E = {
    'king':     [0.9,  0.8, 0.0],
    'queen':    [0.85, -0.75, 0.05],
    'man':      [0.1,  0.8, 0.0],
    'woman':    [0.1, -0.8, 0.0],
    'prince':   [0.5,  0.8, 0.0],
    'princess': [0.5, -0.8, 0.0],
    'apple':    [0.0,  0.0, 0.9],
    'banana':   [0.05, 0.05, 0.85],
}

def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb)

print("apple ~ banana :", round(cosine(E['apple'], E['banana']), 3))
print("king  ~ queen  :", round(cosine(E['king'], E['queen']), 3))
print("king  ~ apple  :", round(cosine(E['king'], E['apple']), 3))

# analogy: king - man + woman
q = [k - m + w for k, m, w in zip(E['king'], E['man'], E['woman'])]
# search every word EXCEPT the three we used
scores = {w: cosine(q, v) for w, v in E.items() if w not in ('king', 'man', 'woman')}
for w, s in sorted(scores.items(), key=lambda kv: -kv[1]):
    print(f"  {w:9s} {s:6.3f}")

# an embedding lookup is a one-hot vector times the table
words = list(E)
one_hot = [1 if w == 'apple' else 0 for w in words]
row = [sum(one_hot[i] * E[words[i]][d] for i in range(len(words))) for d in range(3)]
print("one-hot x table =", row)` }],
  codeTitle: ['Cosine similarity and analogies'],
  viz: {
    title: 'Embedding space: king − man + woman',
    input: 'king man woman',
    inputLabel: 'A B C  (computes A − B + C; words: king queen man woman prince princess apple banana)',
    gen: function (input) {
      var E = { king: [0.9, 0.8, 0], queen: [0.85, -0.75, 0.05], man: [0.1, 0.8, 0], woman: [0.1, -0.8, 0], prince: [0.5, 0.8, 0], princess: [0.5, -0.8, 0], apple: [0, 0, 0.9], banana: [0.05, 0.05, 0.85] };
      var w = String(input).trim().toLowerCase().split(/[\s,]+/);
      if (w.length !== 3 || w.some(function (x) { return !E[x]; })) throw new Error('Enter three words from: king queen man woman prince princess apple banana');
      var names = Object.keys(E), r = function (v) { return Math.round(v * 100) / 100; };
      var cos = function (a, b) { var d = 0, na = 0, nb = 0; for (var i = 0; i < 3; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return (na && nb) ? d / Math.sqrt(na * nb) : 0; };
      var nodes = names.map(function (n) { return { id: n, label: n, x: 8 + Math.max(0, E[n][0]) * 80 + (E[n][2] > 0.5 ? 0 : 0), y: Math.max(4, Math.min(46, 25 - E[n][1] * 20 + (E[n][2] > 0.5 ? (n === 'apple' ? -6 : 6) : 0))) }; });
      function G(hl, tags, edges, ehl) { return { type: 'graph', label: 'Map of words (right = more royal, up = more male, bottom-left = fruit)', height: 50, nodes: nodes, edges: edges || [], hl: hl || {}, tags: tags || {}, ehl: ehl || {} }; }
      var A = E[w[0]], B = E[w[1]], C = E[w[2]];
      var q = [0, 1, 2].map(function (i) { return A[i] - B[i] + C[i]; });
      var frames = [];
      frames.push({ narr: 'Every word is a point; close points mean similar meaning. Left-right is "royalty", up-down is "maleness"; fruit words sit apart.', parts: [G({}, {})] });
      var h1 = {}; h1[w[0]] = 'cur';
      frames.push({ narr: 'Start at <b>' + w[0] + '</b> = (' + A.join(', ') + ').', parts: [G(h1, {}), { type: 'vars', vals: { A: '(' + A.join(', ') + ')' } }] });
      var h2 = {}; h2[w[0]] = 'done'; h2[w[1]] = 'bad';
      frames.push({ narr: 'Subtract <b>' + w[1] + '</b> = (' + B.join(', ') + '): take away that meaning.', parts: [G(h2, {}, [[w[0], w[1], 'minus']], {}), { type: 'vars', vals: { 'A - B': '(' + [0, 1, 2].map(function (i) { return r(A[i] - B[i]); }).join(', ') + ')' } }] });
      var h3 = {}; h3[w[0]] = 'done'; h3[w[1]] = 'done'; h3[w[2]] = 'ok';
      frames.push({ narr: 'Add <b>' + w[2] + '</b> = (' + C.join(', ') + '). The result vector is <b>(' + q.map(r).join(', ') + ')</b>.', parts: [G(h3, {}), { type: 'vars', vals: { 'A - B + C': '(' + q.map(r).join(', ') + ')' }, hl: { 'A - B + C': 'cur' } }] });
      var cand = names.filter(function (n) { return w.indexOf(n) < 0; });
      var sc = cand.map(function (n) { return cos(q, E[n]); });
      var bi = 0; sc.forEach(function (s, i) { if (s > sc[bi]) bi = i; });
      var hb = {}; hb[1 * bi] = 'sel';
      frames.push({ narr: 'Measure the angle (cosine similarity) between the result and every other word. Higher bar = closer in direction.', parts: [{ type: 'bars', label: 'cosine similarity to result', values: sc.map(function (s) { return Math.max(0, s); }), texts: sc.map(function (s) { return s.toFixed(2); }), idxLabels: cand, hl: hb }] });
      var hn = {}; hn[cand[bi]] = 'sel'; hn[w[0]] = 'done'; hn[w[1]] = 'done'; hn[w[2]] = 'done';
      var edgeKey = {}; edgeKey['res-' + cand[bi]] = 'ok';
      frames.push({ narr: 'Nearest word (excluding the three inputs): <b>' + cand[bi] + '</b> with cosine ' + sc[bi].toFixed(3) + '. That is how "king − man + woman = queen" works: meaning moves as arithmetic.', parts: [G(hn, {}, [[w[0], cand[bi], 'analogy']], {}), { type: 'vars', vals: { answer: cand[bi], cosine: sc[bi].toFixed(3) }, hl: { answer: 'sel' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Cosine vs plain distance', html: `<p>Vectors a = (1, 1) and b = (10, 10) point the same way: cosine = <b>1</b>, even though they are far apart in distance. For text, direction (topic) matters more than length (how many times words repeat), so cosine is the standard. If vectors are normalised to length 1, cosine equals the dot product, which is what vector databases compute.</p>`, code: { lang: 'python', run: true, code: `import math
def cos(a, b):
    return sum(x*y for x, y in zip(a, b)) / (math.hypot(*a) * math.hypot(*b))
print(cos((1, 1), (10, 10)), cos((1, 0), (0, 1)), cos((1, 0), (-1, 0)))` } },
    { title: 'Embedding lookup is just row selection', html: `<p>Vocabulary of 4 words, embedding size 2: table = [[0.1,0.9],[0.8,0.2],[0.5,0.5],[0.0,1.0]]. Word id 2 → row 2 = (0.5, 0.5). In PyTorch this is <code>nn.Embedding(4, 2)(torch.tensor([2]))</code>. Training nudges only the rows of words that appeared in the batch, using the same backprop gradient as any layer.</p>` },
    { title: 'Same word, different meaning (contextual)', html: `<p>"I deposited cash at the <b>bank</b>" vs "we sat on the river <b>bank</b>". Old static embeddings (word2vec) give one vector for "bank", a blend of both. Modern models (BERT, GPT) compute the vector <i>after</i> reading the surrounding words, so the two "bank"s end up in different places. That is the leap from word2vec to transformers.</p>` }
  ],
  deepDive: `<p>🟣 <b>How embeddings are learned.</b> <b>word2vec (2013)</b>: slide a window over text and train a tiny network to predict neighbours (skip-gram) or the centre word (CBOW). Words used in the same contexts get pushed to similar vectors ("you shall know a word by the company it keeps"). Training tricks: negative sampling. <b>GloVe</b> factorises word co-occurrence counts. <b>fastText</b> adds sub-word pieces, so unseen or misspelled words still get vectors. In LLMs, token embeddings are just the first layer, trained end to end for next-token prediction; the same table is often reused (<i>tied</i>) as the output layer.</p>
  <p><b>Dimensions:</b> 100-300 for classic word vectors, 768-4096+ in modern models; text-embedding models output 384-3072 and some support <i>Matryoshka</i> truncation (use only the first 256 numbers with graceful quality loss). More dimensions = more nuance but more memory and slower search.</p>
  <p><b>Limits:</b> embeddings inherit <b>bias</b> from the training text (analogies like man:doctor, woman:nurse), the space has "hubness" and anisotropy quirks, and similarity is not truth: "the film is great" and "the film is not great" are very close vectors. Distances are only meaningful within one model: never compare vectors from two different embedding models.</p>
  <p><b>At scale:</b> comparing a query against millions of vectors uses approximate nearest-neighbour indexes (HNSW, IVF) instead of exact search, covered in the vector-database module. <b>Multimodal embeddings</b> (CLIP-style) place images and captions in one shared space.</p>`,
  aiEra: `<p><b>What AI changes:</b> embeddings are now an API call (embedding models from OpenAI, Cohere, open-source families) powering search, RAG, deduplication, clustering and recommendation. They are the bridge between "fuzzy human meaning" and "exact database lookup".</p>
  <p><b>Use AI as a partner:</b> ask <code>Give me 10 sentence pairs where a naive embedding similarity would be misleading (negation, numbers, names)</code>, then test your own embedding model on them. Ask it to explain a PCA/UMAP plot of your vectors.</p>
  <p><b>Where AI goes wrong:</b> it may suggest mixing embeddings from two models, forget to normalise before a dot product, or claim "the analogy works perfectly" (it does not for most pairs). It also underestimates how much domain jargon needs a domain-tuned or hybrid (keyword + vector) approach.</p>
  <p><b>What you must still own:</b> choosing the embedding model and dimension, evaluating retrieval quality on your own data, re-embedding when you switch models, and knowing cosine similarity well enough to compute it by hand.</p>`,
  problems: [{
    title: 'Which word is closest? Cosine by hand',
    level: 'Medium', tags: ['embeddings', 'cosine similarity'],
    statement: `<p>Embeddings in 2D: cat = (1, 0.2), dog = (0.9, 0.3), car = (0.1, 1.0). A query vector is q = (1, 0.25). Compute the cosine similarity of q with each word and name the nearest one. Then say whether Euclidean distance would pick the same word here.</p>`,
    constraints: `Use cos(a,b) = a·b / (|a||b|). Round to 3 decimals.`,
    example: `<p>|q| = √(1 + 0.0625) = 1.0308. cat: dot = 1 + 0.05 = 1.05, |cat| = 1.0198 → cos = 1.05 / (1.0308 × 1.0198) = <b>0.999</b>. dog: dot = 0.9 + 0.075 = 0.975, |dog| = 0.9487 → <b>0.997</b>. car: dot = 0.1 + 0.25 = 0.35, |car| = 1.005 → <b>0.338</b>. Nearest: <b>cat</b>.</p>`,
    brute: { why: `<p>Comparing raw dot products favours long vectors regardless of direction; comparing against all words one by one is fine for 3 words but O(N·d) per query, which is why big collections need ANN indexes.</p>`, code: { lang: 'python', code: `q = (1, 0.25)
words = {'cat': (1, 0.2), 'dog': (0.9, 0.3), 'car': (0.1, 1.0)}
# naive: raw dot product (ignores vector length)
print(max(words, key=lambda w: q[0]*words[w][0] + q[1]*words[w][1]))` } },
    mcq: { q: 'Cosine similarity of 1 means the two vectors…', options: ['Point in the same direction', 'Have equal length', 'Are perpendicular'], answer: 0, explain: 'Cosine measures the angle only; 1 is angle 0, 0 is perpendicular, −1 is opposite.' },
    hints: [`<p>Compute the dot product of q with each word first.</p>`, `<p>Divide by the product of the two lengths; length is the square root of the sum of squares.</p>`, `<p>Do the same arithmetic for each word, then pick the largest value. For Euclidean distance take the smallest distance: cat is (0, 0.05) away from q, dog (0.1, 0.05) away, so cat wins again.</p>`],
    solution: {
      approach: `<p>Compute |q| = 1.0308. For cat: dot = 1·1 + 0.2·0.25 = 1.05, |cat| = 1.0198, cosine = 1.05 / (1.0308·1.0198) ≈ 0.999. For dog: dot = 0.975, |dog| = 0.9487, cosine ≈ 0.997. For car: dot = 0.35, |car| = 1.005, cosine ≈ 0.338. So cat is nearest, dog is a very close second, and car is far. Euclidean distance gives the same winner here (cat 0.05, dog 0.112, car 1.13) because the vectors have similar lengths; in general the two metrics can disagree when lengths differ a lot, and cosine is preferred for text because direction encodes topic while length often reflects frequency. When vectors are pre-normalised to length 1, cosine is simply the dot product, and ranking by cosine, dot product and Euclidean distance all coincide.</p>`,
      code: { lang: 'python', run: true, code: `import math
q = (1, 0.25)
words = {'cat': (1, 0.2), 'dog': (0.9, 0.3), 'car': (0.1, 1.0)}
def cos(a, b):
    return (a[0]*b[0] + a[1]*b[1]) / (math.hypot(*a) * math.hypot(*b))
for w, v in words.items():
    print(w, round(cos(q, v), 3))
print("nearest:", max(words, key=lambda w: cos(q, words[w])))` },
      dry: { head: ['word', 'dot with q', 'length', 'cosine'], rows: [['cat', '1.050', '1.020', '0.999'], ['dog', '0.975', '0.949', '0.997'], ['car', '0.350', '1.005', '0.338']] },
      complexity: `<p>O(N·d) for N candidates of dimension d; ANN indexes cut this to about O(log N).</p>`,
      followUps: ['When would Euclidean and cosine rankings disagree?', 'How would you search 100M vectors?']
    }
  }]
});

topics.push({
  title: 'CNNs at a Glance: Sliding a Small Detector Over an Image',
  analogy: `<p>You look for a face in a crowd photo using a small magnifying glass with a pattern printed on it, say "a vertical edge". You slide the glass across the photo, one position at a time, and at every spot note how well the picture under the glass matches the pattern. The notes make a new image: a <b>feature map</b>. The same glass is reused everywhere (a Where's Waldo search uses one idea of Waldo at every location). That sliding, reusable detector is a <b>convolution</b>.</p>`,
  explain: `<p>🟢 <b>Why not a normal network on images?</b> A 224×224 colour photo has 150,528 numbers. A fully connected first layer with 1,000 neurons would need 150 million weights, and it would learn "cat at top-left" separately from "cat at bottom-right". Two ideas fix that:</p>
  <ul><li><b>Local:</b> a pixel mostly relates to its neighbours, so look at small patches (3×3, 5×5).</li><li><b>Shared:</b> the same small detector (a <b>kernel</b> or filter) is slid over every position, so the weights are reused and "a cat anywhere" is learned once.</li></ul>
  <p><b>The convolution step:</b> place the 3×3 kernel on a 3×3 patch, multiply matching cells, add everything up. That one number goes into the output at that position. Slide by one (the <b>stride</b>), repeat. A 5×5 image with a 3×3 kernel gives a <b>3×3</b> output: size = (5 − 3)/1 + 1 = 3.</p>
  <p>Example: a vertical-edge kernel on an image whose left part is 1 and right part is 0:</p>
  ${H.table(['kernel row (all 3 rows alike)', '1', '0', '−1'], [['patch on flat area (1 1 1)', '1', '1', '1'], ['sum = 1 − 1', '', '', '<span class="c-m">0 → nothing here</span>'], ['patch on the edge (1 1 0)', '1', '1', '0'], ['sum per row = 1, three rows = 3', '', '', '<span class="c-g">3 → edge found!</span>']])}
  <p><b>A CNN stacks this:</b> conv layer (many kernels, each finds a different pattern) → ReLU → <b>pooling</b> (shrink the map by keeping the max of each 2×2 block, giving some shift tolerance) → more conv layers → flatten → a normal classifier. Early layers find edges and colours, middle layers find textures and parts (eyes, wheels), deep layers find whole objects. Nobody designs the kernels: <b>they are learned by backprop</b>.</p>
  <p><b>Parameter saving:</b> a 3×3 kernel on a colour image has 3×3×3 + 1 = 28 weights, no matter how big the image is.</p>`,
  clues: ['"image", "grid-like data with local patterns" → convolution', '"translation invariance / same pattern anywhere"', '"parameter sharing", "receptive field" → CNN vocabulary', '"output size (n − k + 2p)/s + 1" → conv shape question', '"downsample the feature map" → pooling or stride 2', '"too many parameters in a dense layer on pixels" → why CNNs exist'],
  code: [{ lang: 'python', title: '2D convolution on nested lists (stdlib, runnable)', run: true, code: `def conv2d(image, kernel, stride=1):
    """Valid convolution (really cross-correlation, as in deep learning)."""
    n, k = len(image), len(kernel)
    out_n = (n - k) // stride + 1
    out = [[0] * out_n for _ in range(out_n)]
    for r in range(out_n):
        for c in range(out_n):
            total = 0
            for i in range(k):               # walk over the kernel cells
                for j in range(k):
                    total += image[r * stride + i][c * stride + j] * kernel[i][j]
            out[r][c] = total                # one number per window position
    return out

def max_pool(fmap, size=2):
    n = len(fmap) // size * size
    return [[max(fmap[r + i][c + j] for i in range(size) for j in range(size))
             for c in range(0, n, size)] for r in range(0, n, size)]

image = [[1, 1, 1, 0, 0],
         [1, 1, 1, 0, 0],
         [1, 1, 1, 0, 0],
         [1, 1, 1, 0, 0],
         [1, 1, 1, 0, 0]]
vertical_edge = [[1, 0, -1],
                 [1, 0, -1],
                 [1, 0, -1]]
out = conv2d(image, vertical_edge)
for row in out:
    print(row)
print("5x5 image, 3x3 kernel -> output", len(out), "x", len(out[0]))
print("max-pool of a 4x4 map:", max_pool([[1, 3, 2, 0], [4, 2, 1, 1], [0, 0, 5, 6], [1, 2, 7, 8]]))` }],
  codeTitle: ['Convolution and pooling'],
  viz: {
    title: 'Sliding a 3x3 kernel over a 5x5 image',
    input: 'vertical',
    inputLabel: 'Kernel: vertical, horizontal, blur or sharpen',
    gen: function (input) {
      var name = String(input).trim().toLowerCase();
      var K = { vertical: [[1, 0, -1], [1, 0, -1], [1, 0, -1]], horizontal: [[1, 1, 1], [0, 0, 0], [-1, -1, -1]], blur: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], sharpen: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]] };
      if (!K[name]) throw new Error('Type vertical, horizontal, blur or sharpen');
      var img = [[1, 1, 1, 0, 0], [1, 1, 1, 0, 0], [1, 1, 1, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
      var k = K[name], out = [[null, null, null], [null, null, null], [null, null, null]], frames = [];
      var show = function () { return out.map(function (r) { return r.map(function (v) { return v === null ? '·' : v; }); }); };
      var head = ['0', '1', '2', '3', '4'];
      frames.push({ narr: 'A 5×5 image (bright block in the top-left) and a 3×3 <b>' + name + '</b> kernel. We slide the kernel over every 3×3 window: multiply cell by cell, add up, write one number to the output.', parts: [{ type: 'grid', label: 'Image 5×5', rows: img, colHead: head, rowHead: head }, { type: 'grid', label: 'Kernel 3×3', rows: k }] });
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) {
        var tot = 0, terms = [], hl = {};
        for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) { tot += img[r + i][c + j] * k[i][j]; hl[(r + i) + ',' + (c + j)] = 'cur'; if (img[r + i][c + j] !== 0 && k[i][j] !== 0) terms.push(img[r + i][c + j] + '×' + (k[i][j] < 0 ? '(' + k[i][j] + ')' : k[i][j])); }
        out[r][c] = tot;
        var oh = {}; oh[r + ',' + c] = tot !== 0 ? 'ok' : 'done';
        frames.push({ narr: 'Window at row ' + r + ', col ' + c + ': ' + (terms.length ? terms.join(' + ') : 'every product is 0') + ' = <b>' + tot + '</b>.' + (tot > 0 && name !== 'blur' ? ' <span class="c-g">A response: the pattern matches here.</span>' : ''), parts: [{ type: 'grid', label: 'Image (window = amber)', rows: img, colHead: head, rowHead: head, hl: hl }, { type: 'grid', label: 'Kernel', rows: k }, { type: 'grid', label: 'Output feature map 3×3', rows: show(), hl: oh }] });
      }
      frames.push({ narr: 'Done. A 5×5 image convolved with a 3×3 kernel (stride 1, no padding) gives a (5−3)+1 = <b>3×3</b> feature map. Big numbers mark where the pattern was found.', parts: [{ type: 'grid', label: 'Final feature map', rows: out }] });
      return frames;
    }
  },
  examples: [
    { title: 'Hand-compute one window', html: `<p>Window <code>[[1,1,0],[1,1,0],[1,1,0]]</code> with the vertical-edge kernel <code>[[1,0,-1],[1,0,-1],[1,0,-1]]</code>: row sums are 1·1 + 1·0 + 0·(−1) = 1 for each row, total <b>3</b>. On a flat window <code>[[1,1,1],…]</code> each row gives 1 − 1 = 0, total 0.</p>` },
    { title: 'Output size formula', html: `<p><code>out = ⌊(n − k + 2p) / s⌋ + 1</code>. A 32×32 image, 5×5 kernel, no padding, stride 1 → 28. With padding p = 2 → 32 ("same" size). With stride 2 and p = 0 on a 7×7 image with a 3×3 kernel → ⌊(7−3)/2⌋ + 1 = 3.</p>`, code: { lang: 'python', run: true, code: `def out_size(n, k, p=0, s=1):
    return (n - k + 2 * p) // s + 1
print(out_size(32, 5), out_size(32, 5, p=2), out_size(7, 3, s=2))` } },
    { title: 'Parameters: conv vs dense', html: `<p>Dense layer from a 224×224×3 image to 1,000 neurons: 150,528 × 1,000 ≈ <b>150 million</b> weights. A conv layer with 64 kernels of 3×3×3: 64 × (27 + 1) = <b>1,792</b> weights, reused at every position. This ~100,000× saving is the whole reason CNNs worked on images.</p>` }
  ],
  deepDive: `<p>🟣 <b>Internals.</b> Deep-learning "convolution" is actually <i>cross-correlation</i> (the kernel is not flipped); since the kernel is learned, it does not matter. Real tensors are (batch, channels, height, width): a kernel spans <i>all</i> input channels, and each output channel has its own kernel and bias. The <b>receptive field</b> grows with depth: two stacked 3×3 convs see 5×5, three see 7×7, with fewer parameters than one 7×7 (the VGG insight). Frameworks implement conv as a big matrix multiply (im2col) or via FFT/Winograd, and run it on GPUs.</p>
  <p><b>Landmarks:</b> LeNet (1998, digits) → AlexNet (2012, ImageNet breakthrough on GPUs) → VGG (stacked 3×3) → ResNet (2015, residual connections allow 100+ layers) → EfficientNet/ConvNeXt. 1×1 convs mix channels cheaply; depthwise-separable convs power mobile models; dilated convs widen the view; transposed convs upsample (segmentation, GANs).</p>
  <p><b>Built-in assumptions (inductive bias):</b> locality and translation equivariance. That makes CNNs data-efficient on images, but weak at global relationships ("is the left eye consistent with the right?"). <b>Vision Transformers (ViT)</b> cut an image into patches and use attention; with enough data and compute they match or beat CNNs, but CNNs are still common on edge devices and in medical/industrial vision. 1D convs also work for audio and time series.</p>
  <p><b>Practical:</b> data augmentation (flips, crops), transfer learning (reuse ImageNet-trained early layers), and BatchNorm are standard.</p>`,
  aiEra: `<p><b>What AI changes:</b> you rarely train a CNN from scratch now: you start from a pre-trained backbone and fine-tune, or call a multimodal LLM that "sees" images through a vision encoder (a ViT or CNN turning the picture into embedding vectors). Understanding convolution still explains why those encoders work and fail.</p>
  <p><b>Use AI as a partner:</b> ask for a table of layer-by-layer tensor shapes for a small CNN and verify with the output-size formula. Ask it to design augmentation for your dataset. Ask it to explain a Grad-CAM heat map.</p>
  <p><b>Where AI goes wrong:</b> frequent off-by-one shape errors with padding and stride, forgetting channel counts in parameter math, and recommending architectures far larger than your data justifies. It may also say "CNNs are obsolete", which is not true for small data or edge devices.</p>
  <p><b>What you must still own:</b> computing shapes and parameter counts by hand, picking transfer learning over scratch training, and checking for data leakage and bias in image datasets.</p>`,
  problems: [{
    title: 'Convolve a 3x3 kernel over a 5x5 image',
    level: 'Easy', tags: ['CNN', 'convolution'],
    statement: `<p>Image (5×5): rows <code>[1,2,0,1,3]</code>, <code>[0,1,2,3,1]</code>, <code>[1,0,1,2,0]</code>, <code>[2,1,0,1,1]</code>, <code>[0,3,1,0,2]</code>. Kernel (3×3): <code>[[1,0,1],[0,1,0],[1,0,1]]</code>. Using stride 1 and no padding, compute the full output feature map and give its size.</p>`,
    constraints: `Output must be 3×3; show the top-left and bottom-right calculations.`,
    example: `<p>Top-left window <code>[[1,2,0],[0,1,2],[1,0,1]]</code>: only the four corners (1, 0, 1, 1) and the centre (1) count: 1+0+1+1+1 = <b>4</b>. Output size (5−3)/1+1 = <b>3×3</b>.</p>`,
    brute: { why: `<p>Re-deriving each window by hand without a systematic loop is error-prone. The naive code below is fine, but build the sum from the four corners and centre because the kernel's other cells are 0.</p>`, code: { lang: 'python', code: `img = [[1,2,0,1,3],[0,1,2,3,1],[1,0,1,2,0],[2,1,0,1,1],[0,3,1,0,2]]
# naive: hard-coded top-left window only
w = [row[0:3] for row in img[0:3]]
print(w[0][0] + w[0][2] + w[1][1] + w[2][0] + w[2][2])` } },
    mcq: { q: 'A 7×7 image, 3×3 kernel, stride 1, no padding gives an output of…', options: ['5×5', '7×7', '3×3'], answer: 0, explain: 'Use (7 − 3)/1 + 1 = 5, so the map is 5×5.' },
    hints: [`<p>The kernel only has ones at the four corners and the centre; everything else is 0, so only five pixels of each window matter.</p>`, `<p>For window starting at (r, c) the result is img[r][c] + img[r][c+2] + img[r+1][c+1] + img[r+2][c] + img[r+2][c+2].</p>`, `<p>Loop r and c over 0..2 and compute that sum; the result is a 3×3 grid.</p>`],
    solution: {
      approach: `<p>The kernel is a "plus-shaped corners and centre" pattern: it adds the four window corners and the centre pixel. For each of the 9 window positions (r, c) with r, c in 0..2, compute img[r][c] + img[r][c+2] + img[r+1][c+1] + img[r+2][c] + img[r+2][c+2]. The output is 3×3 because (5 − 3)/1 + 1 = 3. Row 0: window (0,0): 1+0+1+1+1 = 4; (0,1): img[0][1]=2, img[0][3]=1, img[1][2]=2, img[2][1]=0, img[2][3]=2 → 2+1+2+0+2 = 7; (0,2): img[0][2]=0, img[0][4]=3, img[1][3]=3, img[2][2]=1, img[2][4]=0 → 7. The complete map is [[4,7,7],[4,7,6],[4,5,5]]; run the code below to confirm it; remember each output cell depends on only a 3×3 patch, which is the receptive field of that output cell.</p>`,
      code: { lang: 'python', run: true, code: `img = [[1,2,0,1,3],[0,1,2,3,1],[1,0,1,2,0],[2,1,0,1,1],[0,3,1,0,2]]
k = [[1,0,1],[0,1,0],[1,0,1]]
out = [[sum(img[r+i][c+j] * k[i][j] for i in range(3) for j in range(3))
        for c in range(3)] for r in range(3)]
for row in out:
    print(row)` },
      dry: { head: ['window (r,c)', 'cells added', 'result'], rows: [['(0,0)', '1+0+1+1+1', '4'], ['(0,1)', '2+1+2+0+2', '7'], ['(0,2)', '0+3+3+1+0', '7']] },
      complexity: `<p>Time O(out² · k²) = 9 × 9 multiplies here; space O(out²).</p>`,
      followUps: ['What is the output with padding 1?', 'What changes with stride 2?']
    }
  }]
});

topics.push({
  title: 'RNNs, Long Sequences and Why Transformers Won',
  analogy: `<p>An <b>RNN</b> is like passing a secret down a line of people by whispering: person 1 whispers to person 2, who whispers to person 3... By person 50 the message is distorted or gone, and you cannot start whispering to person 20 until person 19 has finished. A <b>transformer</b> is like a meeting room where everyone can look at everyone else's notes at once: the last speaker can glance straight at person 1's note, and everybody reads in parallel.</p>`,
  explain: `<p>🟢 <b>The sequence problem.</b> Sentences, audio and stock prices come in order, and length varies. A normal network has a fixed number of inputs and no memory.</p>
  <p><b>RNN (recurrent neural network).</b> Read one item at a time and keep a <b>hidden state</b> h, a short summary of everything so far:</p>
  <p><code>h<sub>t</sub> = tanh(W·h<sub>t−1</sub> + U·x<sub>t</sub> + b)</code></p>
  <p>The <i>same</i> weights are reused at every step ("unrolled" over time, it looks like a deep network with shared layers). The last state (or every state) feeds a classifier or a next-word predictor.</p>
  <p><b>Why RNNs struggle with long sequences:</b></p>
  <ul><li><b>Vanishing gradients through time.</b> To learn "word 1 matters for word 50" the gradient must travel back through 49 steps, each multiplying by a number usually below 1. Toy run: influence of word 1 on the final state is 0.43 at length 2, 8×10<sup>−3</sup> at length 5, 7×10<sup>−6</sup> at length 10, 6×10<sup>−12</sup> at length 20. The network simply cannot learn long-range links.</li><li><b>Squeezed memory.</b> One small vector must carry the whole past; new words overwrite old ones.</li><li><b>No parallelism.</b> Step t needs step t−1, so a GPU cannot process the sequence at once. Training is slow.</li></ul>
  <p><b>LSTM and GRU</b> (1997, 2014) add <b>gates</b>, learned valves that decide what to keep, write and forget. A mostly-additive "cell state" lets gradients flow much farther (hundreds of steps). They powered translation and speech for years, but still read word by word.</p>
  <p><b>Attention</b> (2014-15, translation) lets the model look back at <i>every</i> earlier word and weigh them. <b>The Transformer</b> (2017, "Attention Is All You Need") dropped recurrence entirely and used only attention:</p>
  ${H.table(['', 'RNN / LSTM', 'Transformer'], [['Path from word 1 to word 50', '49 sequential hops', '<span class="c-g">1 hop (direct attention)</span>'], ['Parallel over positions in training', '<span class="c-r">No</span>', '<span class="c-g">Yes, whole sequence at once</span>'], ['Memory of past', 'One fixed-size state', 'All previous tokens are visible (KV cache)'], ['Cost per layer', 'O(n)', 'O(n²) in sequence length'], ['Scales with more data/GPUs', 'Poorly', '<span class="c-g">Very well (scaling laws)</span>']])}
  <p>Self-attention in one picture: for the current word, compute a score with every other word (dot product of "query" and "key"), turn scores into weights with softmax, and take the weighted average of the words' "values". "The cat that chased mice <b>was</b>..." can attend straight to "cat" to get the verb agreement right, no matter how many words sit between them.</p>`,
  clues: ['"sequence", "time series", "text" with order → RNN / transformer', '"long-range dependency" → attention beats RNN', '"vanishing gradient through time" → RNN limitation; LSTM/GRU gates help', '"train in parallel across tokens on GPUs" → transformer', '"O(n²) attention cost, context length limit" → transformer trade-off', '"hidden state", "unrolled over time", "BPTT" → RNN vocabulary'],
  code: [{ lang: 'python', title: 'RNN forgetting vs attention looking back (stdlib, runnable)', run: true, code: `import math

def rnn_influence(T, w=0.9, u=1.0):
    """How much does the FIRST input still change the LAST hidden state?
    We multiply the local slope of every step on the way back (BPTT)."""
    h, grad = 0.0, 1.0
    for t in range(T):
        h = math.tanh(w * h + u * 0.5)       # one RNN step with a constant input
        if t > 0:
            grad *= w * (1 - h * h)          # chain rule: d h_t / d h_(t-1)
    return grad

for T in (2, 5, 10, 20, 50):
    print("sequence length", T, "-> influence of word 1 on final state:", f"{rnn_influence(T):.2e}")

# Attention: the last word scores EVERY earlier word directly
def softmax(zs):
    m = max(zs)
    es = [math.exp(z - m) for z in zs]
    s = sum(es)
    return [e / s for e in es]

tokens = ["the", "cat", "that", "chased", "mice", "was"]
vecs = [[1.0, 0.0], [0.1, 3.0], [0.0, 0.1], [0.3, 0.6], [0.1, 0.5], [0.1, 1.1]]
q = vecs[-1]                                  # query = the word "was"
scores = [sum(a * b for a, b in zip(q, k)) / math.sqrt(2) for k in vecs]
weights = softmax(scores)
print("\\nattention from 'was' to each word:")
for t, w in zip(tokens, weights):
    print(f"  {t:7s} {w:.2f}")` }],
  codeTitle: ['Vanishing influence vs direct attention'],
  viz: {
    title: 'RNN unrolled over time vs attention connections',
    input: 'the cat that chased mice was',
    inputLabel: 'Sentence (3-8 words)',
    gen: function (input) {
      var w = String(input).trim().split(/\s+/);
      if (w.length < 3 || w.length > 8) throw new Error('Enter between 3 and 8 words');
      var n = w.length, frames = [], pct = function (v) { return (v * 100 >= 1 ? Math.round(v * 100) : (v * 100).toFixed(1)) + '%'; };
      var xs = function (i) { return 8 + i * (84 / (n - 1)); };
      var xn = w.map(function (t, i) { return { id: 'x' + i, label: t, x: xs(i), y: 42 }; });
      var hn = w.map(function (t, i) { return { id: 'h' + i, label: 'h' + (i + 1), x: xs(i), y: 20, shape: 'box', w: 8 }; });
      var edges = [];
      for (var i = 0; i < n; i++) edges.push(['x' + i, 'h' + i]);
      for (i = 0; i < n - 1; i++) edges.push(['h' + i, 'h' + (i + 1), 'hand-off']);
      function R(hl, ehl, tags, lab) { return { type: 'graph', label: lab || 'RNN unrolled over time (same box reused each step)', directed: true, height: 50, nodes: xn.concat(hn), edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
      frames.push({ narr: 'An RNN reads <b>one word at a time</b>. Each box h is the memory after reading that word; it receives the new word and the previous memory.', parts: [R({}, {}, {})] });
      var tags = {}, hl = {}, ehl = {};
      for (i = 0; i < n; i++) {
        var s = Math.pow(0.5, i);
        tags['h' + i] = i === 0 ? 'word 1: 100%' : 'word 1: ' + pct(s);
        hl['h' + i] = i === n - 1 ? 'bad' : 'cur';
        if (i > 0) ehl['h' + (i - 1) + '-h' + i] = 'cur';
        var cp = {}; Object.keys(tags).forEach(function (k) { cp[k] = tags[k]; });
        var ch = {}; ch['h' + i] = 'cur'; for (var q = 0; q < i; q++) ch['h' + q] = 'done';
        var ce = {}; Object.keys(ehl).forEach(function (k) { ce[k] = ehl[k]; });
        frames.push({ narr: i === 0 ? 'Step 1: after reading "<b>' + w[0] + '</b>" the memory holds it fully (100%).' : 'Step ' + (i + 1) + ': each hand-off keeps only part of the older signal (illustrated here as half per step). Word 1\'s influence on h' + (i + 1) + ' is about <b>' + pct(s) + '</b>.' + (i === n - 1 ? ' <span class="c-r">Almost nothing left after ' + (n - 1) + ' hand-offs, and the gradient to learn it shrinks the same way.</span>' : ''), parts: [R(ch, ce, cp)] });
      }
      // attention
      var an = w.map(function (t, i) { return { id: 'a' + i, label: t, x: xs(i), y: 36, shape: 'box', w: 10 }; });
      var sc = w.map(function (t) { var s = 0; for (var k = 0; k < t.length; k++) s += t.charCodeAt(k); return (s % 7) / 3; });
      var mx = Math.max.apply(null, sc), ex = sc.map(function (v) { return Math.exp(v - mx); }), tot = ex.reduce(function (a, b) { return a + b; }, 0), wt = ex.map(function (v) { return v / tot; });
      var ae = [], aeh = {};
      frames.push({ narr: 'Now <b>attention</b>: no chain of hand-offs. Words sit side by side, and the last word <b>' + w[n - 1] + '</b> will look at every earlier word directly.', parts: [{ type: 'graph', label: 'Self-attention: last word looks at all words', directed: true, height: 50, nodes: an, edges: [], hl: (function () { var o = {}; o['a' + (n - 1)] = 'cur'; return o; })(), tags: {} }] });
      var tg = {};
      for (i = 0; i < n - 1; i++) { ae.push(['a' + (n - 1), 'a' + i, wt[i].toFixed(2)]); aeh['a' + (n - 1) + '-a' + i] = 'ok'; tg['a' + i] = pct(wt[i]); }
      var best = 0; for (i = 0; i < n - 1; i++) if (wt[i] > wt[best]) best = i;
      var hh = {}; hh['a' + (n - 1)] = 'cur'; hh['a' + best] = 'sel';
      frames.push({ narr: 'One hop to <i>every</i> word. The numbers on the arrows are attention weights (illustrative scores through a softmax). The strongest link goes to "<b>' + w[best] + '</b>", wherever it sits in the sentence.', parts: [{ type: 'graph', label: 'Self-attention: last word looks at all words', directed: true, height: 50, nodes: an, edges: ae, hl: hh, ehl: aeh, tags: tg }] });
      frames.push({ narr: 'Compare. RNN: word 1 reaches the end through <b>' + (n - 1) + '</b> sequential hand-offs and must be processed in order. Transformer: <b>1</b> hop, and all positions are computed at the same time on the GPU. The price: every word attends to every word, O(n²) work.', parts: [{ type: 'table', label: 'Path length from word 1 to the last word', columns: ['model', 'hops', 'parallel in training?'], rows: [['RNN / LSTM', n - 1, 'no'], ['Transformer', 1, 'yes']], hl: { 1: 'ok', 0: 'bad' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Hand-run a tiny RNN step', html: `<p>Scalar RNN with w = 1, u = 1, h<sub>0</sub> = 0, inputs x = [1, 0, 0]. h<sub>1</sub> = tanh(0 + 1) = 0.762. h<sub>2</sub> = tanh(0.762 + 0) = 0.642. h<sub>3</sub> = tanh(0.642) = 0.566. The memory of the "1" fades even though nothing new arrived, and the slope factor 1 − h² (0.42, 0.59, ...) multiplies into every gradient too.</p>`, code: { lang: 'python', run: true, code: `import math
h = 0.0
for t, x in enumerate([1, 0, 0, 0, 0], start=1):
    h = math.tanh(1 * h + 1 * x)
    print("t", t, "x", x, "h", round(h, 3))` } },
    { title: 'Why LSTM gates help', html: `<p>An LSTM carries a cell state c<sub>t</sub> = f<sub>t</sub>·c<sub>t−1</sub> + i<sub>t</sub>·g<sub>t</sub>. If the forget gate f ≈ 1, the old memory is copied forward almost untouched, so its gradient is multiplied by ≈ 1 instead of 0.5: information and gradients survive for hundreds of steps. It is the same idea as a residual connection, years earlier.</p>` },
    { title: 'Cost of attention vs context length', html: `<p>Attention compares every token with every other: n tokens means n² scores. 1,000 tokens → 1 million scores per head per layer; 100,000 tokens → 10 <b>billion</b>. That is why long context is expensive and why tricks (FlashAttention, sliding windows, KV caching, sparse or linear attention) exist. RNN cost grows only as n but cannot use the GPU in parallel.</p>`, code: { lang: 'python', run: true, code: `for n in (1_000, 10_000, 100_000):
    print(n, "tokens ->", f"{n * n:,}", "attention scores per head per layer")` } }
  ],
  deepDive: `<p>🟣 <b>Internals.</b> <b>BPTT</b> (backprop through time) unrolls the RNN and runs ordinary backprop; the gradient to step k is a product of Jacobians ∏ W·diag(tanh′). If the largest singular value of W is below 1 it vanishes; above 1 it explodes (cured by clipping, but vanishing needs architecture changes: LSTM/GRU gates, orthogonal init, skip connections). <b>Truncated BPTT</b> cuts the unroll to a window for memory.</p>
  <p><b>Why transformers won, in four reasons.</b> (1) <i>Parallelism</i>: all positions train simultaneously, which makes use of GPUs/TPUs and lets training scale to trillions of tokens. (2) <i>Short gradient paths</i>: any two tokens interact in one layer, so long-range dependencies are learnable. (3) <i>Scaling laws</i>: loss falls predictably as parameters, data and compute grow, which justified huge investments. (4) <i>Generality</i>: the same block works for text, images (ViT), audio, proteins and code, and transfers well via pre-training then fine-tuning.</p>
  <p><b>Trade-offs and the comeback of recurrence.</b> Transformers pay O(n²) compute and an O(n) KV cache per generated token. State-space models and linear-recurrent models (Mamba, RWKV, RetNet, xLSTM) revisit "compress the past into a state" with better math (parallel scan training, O(1) memory per token) and appear in hybrids with attention (2024-26 research and some production models). Transformers remain the default for frontier LLMs.</p>
  <p><b>Other ideas to know:</b> encoder-decoder (translation) vs decoder-only (GPT-style); causal masking so a token cannot see the future; positional encodings give order information since attention itself is order-blind; multi-head attention lets different heads track different relations. Details come in the next modules (How LLMs Work, Transformer Internals).</p>`,
  aiEra: `<p><b>What AI changes:</b> the whole generative-AI wave is built on the transformer. Understanding "RNN forgets, attention looks back, but costs n²" explains almost every product trade-off you will meet: context window size, price per token, why long chats cost more and why caching matters.</p>
  <p><b>Use AI as a partner:</b> ask <code>Explain self-attention with a 4-token example and numbers, then quiz me with 3 questions</code>. Ask it to compare LSTM vs transformer for a given dataset size. Have it draw tensor-shape tables for attention.</p>
  <p><b>Where AI goes wrong:</b> it often says "RNNs are dead" (they and their descendants still matter for streaming, tiny devices and new SSM hybrids), mixes up "attention weights" with "explanations" of the model, and gives the O(n²) cost without mentioning memory vs compute or FlashAttention.</p>
  <p><b>What you must still own:</b> the three RNN weaknesses (vanishing gradients, squeezed state, sequential compute), how attention fixes each, and the price you pay (quadratic cost). In interviews, give that comparison crisply and with numbers.</p>`,
  problems: [{
    title: 'Why do RNNs struggle with long sequences?',
    level: 'Medium', tags: ['RNN', 'vanishing gradient', 'transformers'],
    statement: `<p>An interviewer asks: "We tried an LSTM to summarise 5,000-word contracts and it ignores clauses from the start. Why, and what would you change?" Give a structured answer with numbers where possible.</p>`,
    constraints: `Cover gradient flow, memory capacity and speed; propose at least two remedies with trade-offs.`,
    example: `<p>Toy influence of word 1 on the final state: 0.43 (length 2) → 8×10<sup>−3</sup> (5) → 7×10<sup>−6</sup> (10) → 6×10<sup>−12</sup> (20). Long input means the model cannot connect early text to late text.</p>`,
    brute: { why: `<p>"Make the LSTM bigger / train longer." A larger hidden state helps capacity a little, but the signal from clause 1 still has to survive thousands of sequential hand-offs, and training stays serial, so cost grows with no guarantee.</p>` },
    mcq: { q: 'What is the main reason transformers handle long-range links better than RNNs?', options: ['Any two tokens connect in one attention hop', 'They have fewer parameters', 'They process text right to left'], answer: 0, explain: 'Attention gives a direct path between any two positions, while an RNN needs a chain of sequential hand-offs.' },
    hints: [`<p>Think about what happens to the training signal (gradient) when it travels back through thousands of steps.</p>`, `<p>Also think about how much one hidden vector can store, and whether a GPU can process step 500 before step 499.</p>`, `<p>Remedies: attention/transformer (with long-context tricks), hierarchical or chunked summarisation, retrieval of relevant clauses, state-space/hybrid models.</p>`],
    solution: {
      approach: `<p>Three connected causes. (1) Vanishing gradients through time: backprop multiplies one Jacobian per step; with typical factors below 1 the training signal from step 1 to step 5,000 is effectively zero (toy: 10<sup>−12</sup> after only 20 steps), so the model never learns to use early clauses. LSTM gates ease this but do not remove it at thousands of steps. (2) Bounded memory: the whole past must be squeezed into a fixed hidden vector, so details are overwritten. (3) Sequential compute: step t waits for step t−1, so training on long documents is slow and cannot exploit GPU parallelism. What I would change: switch to a transformer-based model with a long enough context window, accepting O(n²) attention cost (mitigated by FlashAttention, sliding-window or sparse attention, and KV caching); or keep inputs short by chunking the contract and summarising hierarchically (map-reduce); or use retrieval to pull only clauses relevant to the question (RAG); or evaluate a state-space/hybrid model if streaming and constant memory matter. I would validate by building a small test set where the answer depends on an early clause and measuring recall versus position.</p>`,
      complexity: `<p>RNN: O(n) time, strictly sequential. Transformer: O(n²) time and parallel; memory O(n) with FlashAttention.</p>`,
      followUps: ['How do residual connections relate to the LSTM cell state?', 'When would you still pick an RNN or SSM?']
    }
  }]
});

practice.push({
  title: 'Find perceptron weights for OR by hand', level: 'Easy', tags: ['perceptron'], companies: ['Google', 'Microsoft'],
  statement: `<p>Choose weights w1, w2 and bias b for a step-activation perceptron (output 1 if w1·x1 + w2·x2 + b &gt; 0) that computes OR on binary inputs. Verify all four rows, then say whether the same single neuron can compute XOR.</p>`,
  constraints: `Binary inputs; step activation; answer must be verified on all 4 rows.`,
  example: `<p>Try w = (1, 1), b = −0.5. Rows: (0,0) → −0.5 → 0 ✓; (0,1) → 0.5 → 1 ✓; (1,0) → 1 ✓; (1,1) → 1.5 → 1 ✓. ${H.c('g', 'OR works.')} XOR: impossible with one neuron.</p>`,
  brute: { why: `<p>Searching all weight combinations blindly works for OR but tells you nothing about why; it is also hopeless for XOR because no combination exists.</p>`, code: { lang: 'python', code: `import itertools
rows = [((0,0),0), ((0,1),1), ((1,0),1), ((1,1),1)]
vals = [x / 2 for x in range(-4, 5)]
for w1, w2, b in itertools.product(vals, repeat=3):
    if all((w1*a + w2*c + b > 0) == bool(t) for (a, c), t in rows):
        print(w1, w2, b)
        break` } },
  mcq: { q: 'Which bias makes w = (1, 1) compute OR?', options: ['−0.5', '−1.5', '+1.5'], answer: 0, explain: 'We need (0,0) to give a negative score and any single 1 to give a positive score: −0.5 does both; −1.5 would turn it into AND.' },
  hints: [`<p>Think of the bias as the "bar to clear". For OR, one active input should be enough to clear it.</p>`, `<p>With w = (1,1), the score is x1 + x2 + b. Choose b so that 0 + b ≤ 0 but 1 + b &gt; 0.</p>`, `<p>b must be in (−1, 0]. Pick −0.5. For XOR, see the contradiction proof: (0,1) and (1,0) need w2 + b &gt; 0 and w1 + b &gt; 0, but (1,1) needs w1 + w2 + b ≤ 0, impossible when b ≤ 0.</p>`],
  solution: {
    approach: `<p>Use w = (1, 1) and b = −0.5. Check: (0,0) gives −0.5 so output 0; (0,1) gives 0.5 so 1; (1,0) gives 0.5 so 1; (1,1) gives 1.5 so 1. The geometric picture: the line x1 + x2 = 0.5 separates the origin from the other three corners. Any b in (−1, 0] works with these weights, and many other weight pairs too. XOR cannot be done by one neuron: the two positive corners (0,1) and (1,0) sit diagonally from each other, and any line that has both on one side also puts either (0,0) or (1,1) on that side, so a single linear threshold fails. XOR needs a hidden layer, for example XOR = AND(OR(x1,x2), NAND(x1,x2)).</p>`,
    code: { lang: 'python', run: true, code: `def neuron(w1, w2, b, x1, x2):
    return 1 if w1 * x1 + w2 * x2 + b > 0 else 0
for x1 in (0, 1):
    for x2 in (0, 1):
        print(x1, x2, "->", neuron(1, 1, -0.5, x1, x2))` },
    complexity: `<p>Constant: verifying 4 rows.</p>`, followUps: ['Find weights for NAND.', 'Build XOR from three neurons.']
  }
});

practice.push({
  title: 'Count the parameters of an MLP', level: 'Easy', tags: ['layers', 'parameters'], companies: ['Amazon', 'NVIDIA'],
  statement: `<p>A fully connected network has layer sizes 784 → 256 → 128 → 10 (every layer has a bias). Count its trainable parameters, and estimate the memory in MB if each is stored as a 32-bit float.</p>`,
  constraints: `A layer from a inputs to b outputs has a·b weights + b biases.`,
  example: `<p>784·256 + 256 = 200,960; 256·128 + 128 = 32,896; 128·10 + 10 = 1,290. Total <b>235,146</b> parameters ≈ 0.94 MB (×4 bytes).</p>`,
  brute: { why: `<p>Instantiating a framework model just to count wastes time and hides the formula; interviews want the arithmetic.</p>`, code: { lang: 'python', code: `# naive: count by looping over every single weight explicitly
sizes = [784, 256, 128, 10]
count = 0
for a, b in zip(sizes, sizes[1:]):
    for _ in range(a):
        for _ in range(b):
            count += 1      # one weight
    count += b              # biases
print(count)` } },
  mcq: { q: 'A layer with 100 inputs and 50 neurons (with bias) has…', options: ['5,050 parameters', '5,000 parameters', '150 parameters'], answer: 0, explain: '100·50 weights plus 50 biases = 5,050.' },
  hints: [`<p>Handle layer by layer; each connection between consecutive layers is one weight.</p>`, `<p>Per layer: inputs × outputs for the weights, plus one bias per output neuron.</p>`, `<p>Add the three layers. Memory = parameters × 4 bytes for float32 (training with Adam needs about 4× that: weights, gradients and two moment buffers).</p>`],
  solution: {
    approach: `<p>Use params = Σ (a·b + b) over consecutive layer pairs. Layer 1: 784·256 = 200,704 weights plus 256 biases = 200,960. Layer 2: 256·128 = 32,768 plus 128 = 32,896. Layer 3: 128·10 = 1,280 plus 10 = 1,290. The total is 235,146 parameters, which at 4 bytes each is about 940 KB, under 1 MB. Notice that the first layer holds 85% of all parameters because the input is wide; this is exactly why CNNs share weights for images. For training with Adam the memory is about four times larger (weights, gradients, and two optimizer buffers), plus the activations stored for the backward pass.</p>`,
    code: { lang: 'python', run: true, code: `sizes = [784, 256, 128, 10]
total = sum(a * b + b for a, b in zip(sizes, sizes[1:]))
print("parameters:", total, " float32 MB:", round(total * 4 / 1e6, 2))` },
    complexity: `<p>O(number of layers) arithmetic.</p>`, followUps: ['How many multiply-adds does one forward pass cost?', 'Count parameters of a 3×3 conv with 64 in and 128 out channels.']
  }
});

practice.push({
  title: 'Softmax and cross-entropy by hand', level: 'Easy', tags: ['softmax', 'loss'], companies: ['Meta', 'Google'],
  statement: `<p>A 3-class classifier outputs logits (2.0, 1.0, 0.1). The true class is class 0. Compute the softmax probabilities and the cross-entropy loss −ln(p<sub>true</sub>). Then say what the loss would be if the logits were (0.1, 1.0, 2.0).</p>`,
  constraints: `Round to 3 decimals; use natural log.`,
  example: `<p>e<sup>2</sup>=7.389, e<sup>1</sup>=2.718, e<sup>0.1</sup>=1.105, sum 11.212. p = (0.659, 0.242, 0.099). Loss = −ln 0.659 = <b>0.417</b>. With reversed logits p<sub>true</sub> = 0.099, loss = <b>2.317</b>.</p>`,
  brute: { why: `<p>Computing e<sup>z</sup> directly overflows for big logits (e<sup>1000</sup> = inf). Always subtract the max logit first.</p>`, code: { lang: 'python', code: `import math
def softmax_naive(zs):
    es = [math.exp(z) for z in zs]      # can overflow for large z
    s = sum(es)
    return [e / s for e in es]
print(softmax_naive([2.0, 1.0, 0.1]))` } },
  mcq: { q: 'Why subtract the maximum logit before exponentiating?', options: ['To avoid overflow without changing the result', 'To make probabilities sum to 2', 'To speed up training'], answer: 0, explain: 'softmax(z) = softmax(z − c) for any constant c; using c = max keeps exponents ≤ 0 so e^z never overflows.' },
  hints: [`<p>Exponentiate every logit, add them up, then divide each by the sum.</p>`, `<p>Cross-entropy only looks at the probability given to the correct class.</p>`, `<p>Loss = −ln(p<sub>true</sub>). Confident and right → near 0; confident and wrong → large. Subtract max(z) first for stability.</p>`],
  solution: {
    approach: `<p>Exponentials of (2.0, 1.0, 0.1) are (7.389, 2.718, 1.105) with sum 11.212, giving probabilities (0.659, 0.242, 0.099) that sum to 1. The true class is 0, so the loss is −ln(0.659) = 0.417. With reversed logits the true class gets probability 0.099, so the loss is −ln(0.099) = 2.317: the more probability mass lands on the wrong classes, the higher the penalty. In real code, subtract max(z) before exponentiating to avoid overflow, and use the fused log-softmax formulation (log-sum-exp) so that the loss does not compute log of a tiny number. A handy fact: the gradient of this loss with respect to the logits is simply p − y (probabilities minus one-hot), which is why softmax with cross-entropy is the default for classification.</p>`,
    code: { lang: 'python', run: true, code: `import math
def softmax(zs):
    m = max(zs)
    es = [math.exp(z - m) for z in zs]
    s = sum(es)
    return [e / s for e in es]
for logits in ([2.0, 1.0, 0.1], [0.1, 1.0, 2.0]):
    p = softmax(logits)
    print([round(x, 3) for x in p], "loss", round(-math.log(p[0]), 3))` },
    complexity: `<p>O(K) time for K classes, O(K) space.</p>`, followUps: ['What is the gradient with respect to the logits?', 'Why use log-sum-exp?']
  }
});

practice.push({
  title: 'Output size and parameters of a conv layer', level: 'Easy', tags: ['CNN', 'shapes'], companies: ['Apple', 'Tesla'],
  statement: `<p>An input image is 32×32 with 3 colour channels. A conv layer uses 16 kernels of size 5×5, stride 1, no padding. Give the output shape and the number of trainable parameters. Then apply 2×2 max pooling (stride 2) and give the new shape.</p>`,
  constraints: `Output size = ⌊(n − k + 2p)/s⌋ + 1.`,
  example: `<p>(32 − 5)/1 + 1 = 28 → <b>28×28×16</b>. Params: each kernel is 5·5·3 = 75 weights + 1 bias = 76; 16 × 76 = <b>1,216</b>. After pooling: <b>14×14×16</b>.</p>`,
  brute: { why: `<p>Treating the layer like a dense one (3072 inputs to 28·28·16 outputs) would need about 38 million weights and would not share patterns across positions.</p>`, code: { lang: 'python', code: `dense_params = (32 * 32 * 3) * (28 * 28 * 16) + 28 * 28 * 16
print(dense_params)   # roughly 38.5 million` } },
  mcq: { q: 'What does each kernel span in the channel dimension?', options: ['All input channels', 'One input channel', 'Only the first channel'], answer: 0, explain: 'A 5×5 kernel on an RGB image is really 5×5×3: it combines all channels into one output channel.' },
  hints: [`<p>Spatial size first with the formula; the number of output channels equals the number of kernels.</p>`, `<p>Each kernel has k·k·C<sub>in</sub> weights plus one bias.</p>`, `<p>Pooling 2×2 stride 2 halves height and width and keeps the channels; it has no parameters.</p>`],
  solution: {
    approach: `<p>Spatial size: (32 − 5 + 0)/1 + 1 = 28, so the conv output is 28×28 with 16 channels (one per kernel). Parameters: each kernel has 5·5·3 = 75 weights plus one bias, 76 numbers; with 16 kernels that is 1,216 trainable parameters, independent of image size thanks to weight sharing. Max pooling with a 2×2 window and stride 2 halves each spatial dimension to 14×14 and keeps all 16 channels; pooling has no parameters. Compare to a dense layer producing the same number of outputs: about 38 million weights. That 30,000-fold saving, together with translation equivariance, is why CNNs dominated vision for a decade. The compute cost (multiply-adds) is 28·28·16·75 ≈ 941k, still tiny.</p>`,
    code: { lang: 'python', run: true, code: `n, k, c_in, c_out = 32, 5, 3, 16
out = (n - k) // 1 + 1
params = c_out * (k * k * c_in + 1)
print("conv output:", out, "x", out, "x", c_out, " params:", params)
print("after 2x2 pool:", out // 2, "x", out // 2, "x", c_out)` },
    complexity: `<p>Compute: out² · c_out · k² · c_in multiply-adds.</p>`, followUps: ['What padding keeps the size at 32×32?', 'What if the stride were 2?']
  }
});

practice.push({
  title: 'Build XOR from step neurons (hidden layer by hand)', level: 'Medium', tags: ['XOR', 'hidden layer'], companies: ['Google', 'DeepMind'],
  statement: `<p>Design a 2-2-1 network with step activations (output 1 if the sum &gt; 0) that computes XOR exactly. Give all weights and biases, and verify the four rows. Explain why the hidden layer is the key.</p>`,
  constraints: `Hidden neurons compute OR and NAND; the output neuron computes AND. Step activations everywhere.`,
  example: `<p>h1 = step(x1 + x2 − 0.5) [OR]; h2 = step(−x1 − x2 + 1.5) [NAND]; y = step(h1 + h2 − 1.5) [AND]. For (1,1): h1 = 1, h2 = 0 → y = step(−0.5) = 0 ✓.</p>`,
  brute: { why: `<p>Trying random weights for the whole 9-number network is a huge search with no guidance. Decomposing XOR into logic gates the neurons already know gives the answer directly.</p>`, code: { lang: 'python', code: `import itertools
vals = [-1.5, -0.5, 0.5, 1.5, 1.0, -1.0]
step = lambda z: 1 if z > 0 else 0
found = None
for w in itertools.product(vals, repeat=9):
    a, b, c, d, e, f, g, h, i = w
    if all(step(g*step(a*x+b*y+c) + h*step(d*x+e*y+f) + i) == (x ^ y) for x in (0,1) for y in (0,1)):
        found = w; break
print(found)` } },
  mcq: { q: 'Why can a 2-layer network solve XOR when one neuron cannot?', options: ['The hidden layer re-maps the inputs into a space where a line separates them', 'It uses more training data', 'Step functions are non-linear only in hidden layers'], answer: 0, explain: 'Hidden neurons create new features (OR, NAND); in that feature space the XOR classes are linearly separable.' },
  hints: [`<p>XOR means "one or the other but not both". Which two simple gates combine to say that?</p>`, `<p>XOR(a, b) = AND(OR(a, b), NAND(a, b)). Each gate is one step neuron.</p>`, `<p>OR: weights (1,1) bias −0.5. NAND: weights (−1,−1) bias +1.5. AND of two bits: weights (1,1) bias −1.5. Verify the four rows.</p>`],
  solution: {
    approach: `<p>Decompose XOR into gates a single neuron can compute: OR (is at least one input on?) and NAND (is at least one input off?). XOR is true exactly when both are true. Hidden neuron h1: weights (1,1), bias −0.5 (OR). Hidden neuron h2: weights (−1,−1), bias 1.5 (NAND). Output neuron: weights (1,1), bias −1.5 (AND). Verify: (0,0): h1=0, h2=1 → y=step(−0.5)=0 ✓. (0,1): h1=1, h2=1 → y=step(0.5)=1 ✓. (1,0): same, 1 ✓. (1,1): h1=1, h2=0 → step(−0.5)=0 ✓. The geometric reading: the hidden layer maps the four inputs to new points (h1,h2) = (0,1), (1,1), (1,1), (1,0); in this new space the two XOR=1 points are merged at (1,1) and can be cut off from the others by a line. The nonlinearity of the step is essential: without it the two layers collapse into one linear function.</p>`,
    code: { lang: 'python', run: true, code: `step = lambda z: 1 if z > 0 else 0
def xor_net(x1, x2):
    h1 = step(x1 + x2 - 0.5)       # OR
    h2 = step(-x1 - x2 + 1.5)      # NAND
    return step(h1 + h2 - 1.5)     # AND
print([(a, b, xor_net(a, b)) for a in (0, 1) for b in (0, 1)])` },
    complexity: `<p>Constant: 9 weights.</p>`, followUps: ['Why does a trained sigmoid net find a different solution?', 'Build 3-input parity with this idea.']
  }
});

practice.push({
  title: 'Gradients of a ReLU neuron', level: 'Medium', tags: ['backprop', 'ReLU'], companies: ['Amazon', 'Meta'],
  statement: `<p>Network: z = w1·x1 + w2·x2 + b, h = ReLU(z), y = v·h + c, loss L = ½(y − t)². Given x = (2, −1), w = (0.5, 1), b = 0.5, v = 3, c = 1, target t = 2, compute y, L and the gradients ∂L/∂w1, ∂L/∂w2, ∂L/∂b.</p>`,
  constraints: `ReLU′(z) = 1 if z &gt; 0 else 0.`,
  example: `<p>z = 1 − 1 + 0.5 = 0.5, h = 0.5, y = 3·0.5 + 1 = 2.5, L = ½(0.5)² = 0.125. ∂L/∂y = 0.5; ∂L/∂h = 0.5 × 3 = 1.5; ∂L/∂z = 1.5 × 1 = 1.5; ∂L/∂w1 = 1.5 × 2 = <b>3</b>; ∂L/∂w2 = 1.5 × (−1) = <b>−1.5</b>; ∂L/∂b = <b>1.5</b>.</p>`,
  brute: { why: `<p>Finite differences need an extra forward pass per weight, here 3 extra passes and in a real model billions. Fine to verify, impractical to train with.</p>`, code: { lang: 'python', code: `def L(w1, w2, b):
    z = w1 * 2 + w2 * -1 + b
    y = 3 * max(0, z) + 1
    return 0.5 * (y - 2) ** 2
eps = 1e-6
print((L(0.5 + eps, 1, 0.5) - L(0.5 - eps, 1, 0.5)) / (2 * eps))` } },
  mcq: { q: 'If z were −0.3 instead, ∂L/∂w1 would be…', options: ['0, because ReLU blocks the gradient', '3', '−3'], answer: 0, explain: 'ReLU′(z) = 0 for z < 0, so no blame flows to w1, w2, or b: a "dead" neuron for this input.' },
  hints: [`<p>Do a forward pass first and store z, h, y.</p>`, `<p>Backward chain: ∂L/∂y → ∂L/∂h (× v) → ∂L/∂z (× ReLU′) → ∂L/∂w (× input).</p>`, `<p>Because z = 0.5 &gt; 0, ReLU′ = 1. The weight gradients are ∂L/∂z times the matching inputs: 2 and −1; the bias gradient equals ∂L/∂z.</p>`],
  solution: {
    approach: `<p>Forward: z = 0.5·2 + 1·(−1) + 0.5 = 0.5, so h = 0.5 and y = 3·0.5 + 1 = 2.5; the loss is 0.125. Backward: ∂L/∂y = y − t = 0.5. Through the output layer, ∂L/∂h = 0.5·v = 1.5 (and ∂L/∂v = 0.5·h = 0.25, ∂L/∂c = 0.5). Through ReLU with z &gt; 0 the slope is 1, so ∂L/∂z = 1.5. Then ∂L/∂w1 = 1.5·x1 = 3, ∂L/∂w2 = 1.5·x2 = −1.5, ∂L/∂b = 1.5. Interpretation: raising w1 increases z (since x1 &gt; 0) and so increases y, which is already above the target, so the gradient is positive and descent will lower w1. For w2 the input is negative, so the sign flips. If z had been negative the whole branch would be silenced and all three gradients would be exactly 0, which is the dying-ReLU problem.</p>`,
    code: { lang: 'python', run: true, code: `x1, x2 = 2.0, -1.0
w1, w2, b, v, c, t = 0.5, 1.0, 0.5, 3.0, 1.0, 2.0
z = w1 * x1 + w2 * x2 + b
h = max(0.0, z)
y = v * h + c
dy = y - t
dh = dy * v
dz = dh * (1.0 if z > 0 else 0.0)
print("y", y, "loss", 0.5 * dy ** 2)
print("dw1", dz * x1, "dw2", dz * x2, "db", dz)` },
    complexity: `<p>One forward plus one backward sweep.</p>`, followUps: ['Compute ∂L/∂v and ∂L/∂c.', 'What does Leaky ReLU change?']
  }
});

practice.push({
  title: 'One Adam step by hand', level: 'Medium', tags: ['Adam', 'optimizer'], companies: ['OpenAI', 'NVIDIA'],
  statement: `<p>Minimise f(w) = w² starting at w = 2 with Adam: lr = 0.1, β1 = 0.9, β2 = 0.999, ε = 10<sup>−8</sup>, m = s = 0 initially. Compute the first update (t = 1), including bias correction. Then explain why the first step is almost exactly lr in size.</p>`,
  constraints: `Gradient is 2w. Show m, s, bias-corrected values and the new w.`,
  example: `<p>g = 4. m = 0.1·4 = 0.4; s = 0.001·16 = 0.016. m̂ = 0.4/(1−0.9) = 4; ŝ = 0.016/(1−0.999) = 16. Step = 0.1 · 4/(√16 + ε) ≈ <b>0.1</b>. New w = <b>1.9</b>.</p>`,
  brute: { why: `<p>Plain SGD with lr 0.1 would move by 0.1 × 4 = 0.4, depending entirely on the gradient scale; a rescaled loss changes the step size and forces retuning. Adam's normalisation removes that dependency.</p>`, code: { lang: 'python', code: `w, lr = 2.0, 0.1
w -= lr * 2 * w          # plain SGD
print(w)                 # 1.6` } },
  mcq: { q: 'Why does Adam apply bias correction early on?', options: ['m and s start at 0, so early averages are biased toward 0', 'To make the gradient larger', 'To add momentum'], answer: 0, explain: 'With zero-initialised exponential averages, the first estimates are too small; dividing by (1 − β^t) fixes that.' },
  hints: [`<p>Update m and s using the gradient, then correct them by 1/(1 − β<sup>t</sup>).</p>`, `<p>m̂ = m/(1 − β1), ŝ = s/(1 − β2); step = lr·m̂/(√ŝ + ε).</p>`, `<p>At t = 1 bias-corrected m̂ = g and √ŝ = |g|, so the step is lr·g/|g| = lr·sign(g).</p>`],
  solution: {
    approach: `<p>Gradient at w = 2 is g = 4. First moment: m = 0.9·0 + 0.1·4 = 0.4. Second moment: s = 0.999·0 + 0.001·16 = 0.016. Bias corrections at t = 1: 1 − 0.9 = 0.1 and 1 − 0.999 = 0.001, giving m̂ = 4 and ŝ = 16. The step is lr·m̂/(√ŝ + ε) = 0.1·4/(4 + 10<sup>−8</sup>) ≈ 0.1, so w becomes 1.9. The first Adam step always equals about lr·sign(g) regardless of how large the gradient is: a gradient of 4 or 4000 gives the same move. That scale-invariance is the main reason Adam is forgiving about loss scaling and per-parameter gradient magnitudes. Later steps vary: consistent gradients keep the step near lr, noisy gradients average out in m and give smaller steps. Compare plain SGD, which would move 0.4 here and would change if you multiplied the loss by 10.</p>`,
    code: { lang: 'python', run: true, code: `import math
w, lr, b1, b2, eps = 2.0, 0.1, 0.9, 0.999, 1e-8
g = 2 * w
m = (1 - b1) * g
s = (1 - b2) * g * g
mh, sh = m / (1 - b1), s / (1 - b2)
step = lr * mh / (math.sqrt(sh) + eps)
print("m", m, "s", s, "mhat", mh, "shat", sh, "step", round(step, 4), "new w", round(w - step, 4))` },
    complexity: `<p>O(1) per parameter; two extra state values per parameter.</p>`, followUps: ['What is the second step?', 'Why AdamW instead of Adam with L2?']
  }
});

practice.push({
  title: 'Diagnose a training run: loss goes to NaN', level: 'Medium', tags: ['debugging', 'training'], companies: ['Anthropic', 'Meta'],
  statement: `<p>You train a small network and the loss is 0.69, 0.71, 1.9, 40, then NaN within 200 steps. Give a prioritised debugging plan: what you check first, which fixes you try, and how you confirm each one.</p>`,
  constraints: `A written plan of at least five concrete checks, ordered by likelihood and cost.`,
  example: `<p>Typical culprit: learning rate far too high, so each step overshoots, the weights grow, activations overflow, and the loss becomes inf then NaN. The loss rising smoothly before NaN is the signature.</p>`,
  brute: { why: `<p>Changing five things at once (lr, optimizer, batch size, architecture, data) makes it impossible to know what fixed it, and may hide a real data bug that comes back later.</p>` },
  mcq: { q: 'What is the first thing to try when loss diverges to NaN after a rising trend?', options: ['Lower the learning rate (and add gradient clipping)', 'Add more layers', 'Train on more epochs'], answer: 0, explain: 'A loss that climbs before NaN is the classic sign of too-large steps; reduce lr and clip gradient norms.' },
  hints: [`<p>Start with the cheapest, most likely cause. What controls step size?</p>`, `<p>Check the data too: NaN or inf in inputs, unnormalised features, labels out of range, log(0) in a hand-written loss.</p>`, `<p>Then numerical issues (softmax overflow, fp16 without loss scaling), initialisation, and bugs such as missing zero_grad.</p>`],
  solution: {
    approach: `<p>Plan, in order. (1) Reproduce on a tiny batch and overfit it: if a 16-example batch cannot reach near-zero loss, the bug is in the code, not in tuning. (2) Learning rate: the smooth rise before NaN suggests divergence; cut lr by 10x and add gradient-norm clipping (e.g. 1.0); add warm-up for transformers. (3) Inputs and labels: assert no NaN/inf, standardise features, make sure labels are within the class range and shapes match (a broadcasting bug can silently give wrong losses). (4) Numerics: use the framework's fused cross-entropy on logits instead of softmax then log, avoid log(0) with epsilon, and when using fp16 enable loss scaling or switch to bf16. (5) Initialisation and normalisation: He/Xavier init, LayerNorm/BatchNorm. (6) Training-loop bugs: call zero_grad each step, no double softmax, no stale gradients. (7) Monitor: log gradient norms per layer and the fraction of dead ReLUs. After each change re-run the same seed to confirm that exactly one change moved the behaviour; commit the fix with a note on the cause.</p>`,
    complexity: `<p>Each check is a short experiment; the tiny-batch overfit test costs seconds.</p>`, followUps: ['How do you detect exploding gradients automatically?', 'When is NaN caused by data rather than lr?']
  }
});

practice.push({
  title: 'Mini-batch SGD for logistic regression (stdlib)', level: 'Medium', tags: ['SGD', 'implementation'], companies: ['Microsoft', 'Uber'],
  statement: `<p>Implement mini-batch SGD for a single sigmoid neuron (logistic regression) in pure Python on 2D data of two blobs. Use batch size 8, learning rate 0.5, 20 epochs, shuffle each epoch, and report accuracy.</p>`,
  constraints: `Standard library only; gradient for a sample is (p − t)·x for weights and (p − t) for bias, averaged over the batch.`,
  example: `<p>Blob A around (−1,−1) labelled 0, blob B around (1,1) labelled 1. After training, w ≈ (2.9, 3.0), b ≈ 0 and accuracy 100%.</p>`,
  brute: { why: `<p>Full-batch gradient descent over all samples each step works on tiny data but costs O(N) per update; mini-batches give far more updates per pass over the data and scale to millions of examples.</p>`, code: { lang: 'python', code: `import math
def sig(z): return 1 / (1 + math.exp(-z))
def full_batch_step(data, w, b, lr):
    gw, gb = [0.0, 0.0], 0.0
    for x, t in data:                     # all samples every step
        e = sig(w[0]*x[0] + w[1]*x[1] + b) - t
        gw[0] += e * x[0]; gw[1] += e * x[1]; gb += e
    n = len(data)
    return [w[0] - lr*gw[0]/n, w[1] - lr*gw[1]/n], b - lr*gb/n` } },
  mcq: { q: 'Why shuffle the data every epoch?', options: ['So batches are not identical every pass and gradients are less biased', 'To make the code shorter', 'To increase the batch size'], answer: 0, explain: 'Without shuffling the model may see data in a fixed, possibly ordered pattern, causing biased and oscillating updates.' },
  hints: [`<p>The per-sample error for sigmoid with cross-entropy loss is simply p − t.</p>`, `<p>Loop over epochs; shuffle; slice the data into chunks of 8; accumulate the gradient over the chunk and divide by its size.</p>`, `<p>Update w -= lr × avg gradient. After training, accuracy = fraction where (p &gt; 0.5) equals the label.</p>`],
  solution: {
    approach: `<p>Generate two Gaussian blobs. Initialise w = (0, 0), b = 0. For each epoch shuffle the list, walk through it in slices of 8, and for each sample compute p = sigmoid(w·x + b) and error e = p − t. Accumulate e·x into the weight gradient and e into the bias gradient; after the batch, divide by the batch size and subtract lr times the average. This is exactly the update from backprop on a one-neuron network with cross-entropy loss, where the sigmoid derivative cancels with the loss derivative. After 20 epochs on well-separated blobs the accuracy reaches 100%. Compare against full-batch descent: mini-batches make 10 updates per epoch here instead of 1, and the noise is harmless. For larger problems you would vectorise with NumPy or PyTorch, but the loop structure stays the same.</p>`,
    code: { lang: 'python', run: true, code: `import math, random
random.seed(1)
data = [([random.gauss(-1, 0.5), random.gauss(-1, 0.5)], 0) for _ in range(40)] + \\
       [([random.gauss(1, 0.5), random.gauss(1, 0.5)], 1) for _ in range(40)]
w, b, lr = [0.0, 0.0], 0.0, 0.5
sig = lambda z: 1 / (1 + math.exp(-z))
for epoch in range(20):
    random.shuffle(data)
    for s in range(0, len(data), 8):
        batch = data[s:s + 8]
        gw, gb = [0.0, 0.0], 0.0
        for x, t in batch:
            e = sig(w[0] * x[0] + w[1] * x[1] + b) - t   # p - t
            gw[0] += e * x[0]; gw[1] += e * x[1]; gb += e
        n = len(batch)
        w[0] -= lr * gw[0] / n; w[1] -= lr * gw[1] / n; b -= lr * gb / n
acc = sum((sig(w[0] * x[0] + w[1] * x[1] + b) > 0.5) == (t == 1) for x, t in data) / len(data)
print("weights", [round(v, 2) for v in w], "bias", round(b, 2), "accuracy", acc)` },
    complexity: `<p>O(epochs × N × d) time; O(d) extra memory.</p>`, followUps: ['Add momentum.', 'Add L2 regularisation and explain its effect on the weights.']
  }
});

practice.push({
  title: 'Backprop for a 2-layer network with a gradient check', level: 'Hard', tags: ['backprop', 'implementation', 'gradient check'], companies: ['OpenAI', 'DeepMind', 'NVIDIA'],
  statement: `<p>Implement, in pure Python, the gradient of the average binary cross-entropy loss for a network with 2 inputs, 3 tanh hidden units and 1 sigmoid output over a small batch. Verify every gradient against central finite differences. Report the maximum absolute difference.</p>`,
  constraints: `Standard library only; test on at least 3 samples; epsilon around 1e-5.`,
  example: `<p>For tanh hidden units: ∂L/∂z_out = y − t; ∂L/∂W2[j] = (y − t)·h[j]; ∂L/∂z_hidden[j] = (y − t)·W2[j]·(1 − h[j]²); ∂L/∂W1[j][i] = that × x[i]. The check should report a difference near 10<sup>−11</sup>.</p>`,
  brute: { why: `<p>Numeric differentiation alone gives correct gradients but needs two full forward passes per parameter, which is hopeless beyond toy sizes; backprop computes all gradients in one sweep, and the numeric version is kept only as a test.</p>`, code: { lang: 'python', code: `def numeric_grad(loss_fn, params, idx, eps=1e-5):
    old = params[idx]
    params[idx] = old + eps
    up = loss_fn()
    params[idx] = old - eps
    down = loss_fn()
    params[idx] = old
    return (up - down) / (2 * eps)` } },
  mcq: { q: 'In the output delta for sigmoid + binary cross-entropy, what is ∂L/∂z_out?', options: ['y − t', '(y − t)·y(1 − y)', 't − y squared'], answer: 0, explain: 'The sigmoid derivative y(1−y) cancels against the 1/(y(1−y)) from the cross-entropy, leaving y − t.' },
  hints: [`<p>Work out the output delta first, then push it back through W2 and the tanh derivative (1 − h²).</p>`, `<p>Weight gradients are always delta × the input that weight multiplied. Average over the batch.</p>`, `<p>For the check, loop over every parameter: add ε, compute loss, subtract 2ε, compute loss, restore, and compare (L⁺ − L⁻)/2ε with the analytic number.</p>`],
  solution: {
    approach: `<p>Forward per sample: hidden h_j = tanh(Σ_i W1[j][i]·x_i + b1[j]), output y = sigmoid(Σ_j W2[j]·h_j + b2), loss = −(t·ln y + (1−t)·ln(1−y)). Backward: delta_out = y − t; gradient for W2[j] is delta_out·h_j and for b2 is delta_out. The blame at hidden unit j is delta_out·W2[j], multiplied by the tanh slope (1 − h_j²), giving delta_hidden_j; gradients for W1[j][i] are delta_hidden_j·x_i and for b1[j] delta_hidden_j. Average everything over the batch. Verification: for each parameter compute the central difference (L(p+ε) − L(p−ε))/2ε and compare; with ε = 10<sup>−5</sup> in double precision the maximum difference should be around 10<sup>−10</sup> or smaller. If a gradient is wrong by a factor like 2 or has a flipped sign, the mismatch will be large, which is why gradient checking is the first tool to trust when writing custom layers. Use non-trivial parameter values (not all zeros) so that every path contributes.</p>`,
    code: { lang: 'python', run: true, code: `import math, random
random.seed(0)
def sig(z): return 1 / (1 + math.exp(-z))
H = 3
W1 = [[random.uniform(-1, 1) for _ in range(2)] for _ in range(H)]
b1 = [0.1] * H
W2 = [random.uniform(-1, 1) for _ in range(H)]
b2 = 0.2
data = [([0.5, -1.0], 1), ([1.5, 0.3], 0), ([-0.7, 0.8], 1)]

def forward(x):
    h = [math.tanh(sum(W1[j][i] * x[i] for i in range(2)) + b1[j]) for j in range(H)]
    return h, sig(sum(W2[j] * h[j] for j in range(H)) + b2)

def loss_fn():
    total = 0.0
    for x, t in data:
        _, y = forward(x)
        total += -(t * math.log(y) + (1 - t) * math.log(1 - y))
    return total / len(data)

def grads():
    gW1 = [[0.0] * 2 for _ in range(H)]
    gW2 = [0.0] * H
    for x, t in data:
        h, y = forward(x)
        d_out = y - t                                    # sigmoid + cross-entropy
        for j in range(H):
            gW2[j] += d_out * h[j]
            d_h = d_out * W2[j] * (1 - h[j] ** 2)        # through tanh
            for i in range(2):
                gW1[j][i] += d_h * x[i]
    n = len(data)
    return [[g / n for g in row] for row in gW1], [g / n for g in gW2]

gW1, gW2 = grads()
eps, worst = 1e-5, 0.0
for j in range(H):
    for i in range(2):
        W1[j][i] += eps; up = loss_fn()
        W1[j][i] -= 2 * eps; down = loss_fn()
        W1[j][i] += eps
        worst = max(worst, abs((up - down) / (2 * eps) - gW1[j][i]))
    W2[j] += eps; up = loss_fn()
    W2[j] -= 2 * eps; down = loss_fn()
    W2[j] += eps
    worst = max(worst, abs((up - down) / (2 * eps) - gW2[j]))
print("max |numeric - analytic| =", worst)` },
    complexity: `<p>Backprop: O(parameters) per sample. Numeric check: O(parameters × forward cost); use only for testing.</p>`, followUps: ['Why does the check fail for ReLU at exactly z = 0?', 'Vectorise it with matrices.']
  }
});

practice.push({
  title: 'Receptive field of a stack of conv layers', level: 'Hard', tags: ['CNN', 'receptive field'], companies: ['Tesla', 'Google'],
  statement: `<p>A CNN has three 3×3 conv layers. (a) All have stride 1. (b) The first has stride 2, the other two stride 1. (c) All have stride 1 but dilations 1, 2, 4. Compute the receptive field (the input patch size that influences one output cell) for each.</p>`,
  constraints: `Recurrence: r += (k_eff − 1)·j, where j is the product of previous strides and k_eff = d·(k − 1) + 1.`,
  example: `<p>(a) 1 → 3 → 5 → 7. (b) 1 → 3 (j becomes 2) → 3 + 2·2 = 7 → 7 + 2·2 = 11. (c) 1 → 3 → 3 + 2·2 = 7 → 7 + 4·2 = 15. Answers <b>7, 11, 15</b>.</p>`,
  brute: { why: `<p>Tracing the influence of every input pixel by hand through every layer is slow and error-prone; the recurrence tracks just two numbers per layer (receptive field r and jump j).</p>`, code: { lang: 'python', code: `# naive: simulate which input indices touch output cell 0 in 1D
def reach(layers):
    lo, hi = 0, 0
    jump = 1
    for k, s in layers:
        lo, hi = lo * 1, hi + (k - 1) * jump
        jump *= s
    return hi - lo + 1
print(reach([(3, 1), (3, 1), (3, 1)]))` } },
  mcq: { q: 'Two stacked 3×3 stride-1 convs see an input patch of…', options: ['5×5', '6×6', '9×9'], answer: 0, explain: 'Each extra 3×3 layer adds 2 to the receptive field: 3, then 5.' },
  hints: [`<p>Track two values: the receptive field r and the jump j (input pixels between neighbouring outputs). Start r = 1, j = 1.</p>`, `<p>For layer with kernel k, stride s, dilation d: r += (d(k−1)) · j, then j *= s.</p>`, `<p>Do (a) trivially; in (b) the stride of the first layer doubles the jump for the following layers; in (c) dilation widens each kernel to 3, 5, 9 effective cells.</p>`],
  solution: {
    approach: `<p>Use the recurrence r_new = r + (k_eff − 1)·j and j_new = j·s where k_eff = d·(k − 1) + 1. (a) Three 3×3 stride-1 layers: r goes 1 → 3 → 5 → 7, so 7×7; this is why three stacked 3×3 convs replace one 7×7 conv with fewer parameters (27C² vs 49C²). (b) Layer 1 has stride 2: r = 1 + 2·1 = 3 and j becomes 2. Layer 2: r = 3 + 2·2 = 7. Layer 3: r = 7 + 2·2 = 11, so 11×11: strides make later layers cover more input per step, at the cost of resolution. (c) Dilations 1, 2, 4 give effective kernel sizes 3, 5 and 9: r = 1 + 2 = 3, then 3 + 4 = 7, then 7 + 8 = 15, so 15×15 with only 3×3 weights per layer and no loss of resolution: exponential growth of receptive field with depth, the idea behind WaveNet and segmentation models. In practice the effective receptive field is smaller and Gaussian-shaped, which is one motivation for attention-based vision models.</p>`,
    code: { lang: 'python', run: true, code: `def receptive_field(layers):
    r, j = 1, 1
    for k, s, d in layers:                 # kernel, stride, dilation
        k_eff = d * (k - 1) + 1
        r += (k_eff - 1) * j
        j *= s
    return r
print(receptive_field([(3, 1, 1)] * 3))
print(receptive_field([(3, 2, 1), (3, 1, 1), (3, 1, 1)]))
print(receptive_field([(3, 1, 1), (3, 1, 2), (3, 1, 4)]))` },
    complexity: `<p>O(layers) time and O(1) extra space.</p>`, followUps: ['How many 3×3 layers are needed to cover 224 pixels?', 'Why is the effective receptive field smaller than the theoretical one?']
  }
});

practice.push({
  title: 'Choose CNN, RNN or Transformer for three products', level: 'Hard', tags: ['architecture', 'trade-offs'], companies: ['Google', 'Amazon', 'Apple'],
  statement: `<p>For each product pick an architecture family and defend it with data size, latency, memory and context needs: (A) a phone camera app that detects defects on a factory line at 60 FPS on a small chip; (B) always-on keyword detection on a smartwatch (2 MB model, streaming audio); (C) a legal assistant summarising 200-page contracts with cross-references.</p>`,
  constraints: `Give a primary choice, one alternative, and the main risk for each.`,
  example: `<p>(A) small CNN (MobileNet-style) · (B) streaming conv or small RNN/state-space model · (C) transformer with long context plus retrieval. Rationale follows from locality, streaming state, and global dependencies.</p>`,
  brute: { why: `<p>"Use a giant transformer for everything" ignores latency, power and cost: a 7B-parameter model cannot run at 60 FPS on a wearable chip, and quadratic attention over 200 pages is wasteful if retrieval can narrow it.</p>` },
  mcq: { q: 'Which constraint most favours a recurrent or state-space model?', options: ['Streaming input with tiny constant memory per step', 'Need for the largest possible pre-trained model', 'Images with local patterns'], answer: 0, explain: 'Recurrent and state-space models keep a fixed-size state and process each new item in O(1), ideal for always-on streaming on tiny devices.' },
  hints: [`<p>List the constraints for each product: input type, hardware, latency, memory, how far apart related information can be.</p>`, `<p>Local patterns on grids → convolutions. Constant-memory streams → recurrence/SSM. Global relationships and rich pre-training → attention.</p>`, `<p>Do not forget hybrid answers: CNN backbone + small transformer head; transformer + retrieval; distillation and quantisation to shrink big models.</p>`],
  solution: {
    approach: `<p>(A) Factory camera: inputs are images with strong local structure, the chip is small and the budget is about 16 ms per frame. Choose a compact CNN (MobileNet/EfficientNet-style depthwise-separable convs), quantised to int8, with data augmentation and a pre-trained backbone; alternative is a tiny ViT, risky on small data and slower on edge. Main risk: domain shift (lighting, new defect types), so monitor and retrain. (B) Smartwatch keyword spotting: audio streams forever, memory is 2 MB, latency must be tiny. Choose a small streaming model: depthwise 1D convolutions or a GRU/state-space model with fixed state, quantised, perhaps with a wake-word stage that gates a bigger model. Transformers would need a growing cache. Main risk: false accepts and battery. (C) Legal summaries: cross-references hundreds of pages apart need direct long-range links, so use a long-context transformer LLM; since attention cost is quadratic and recall in the middle of very long inputs degrades, combine with chunking and retrieval so the model sees the relevant clauses, and ask for citations that you verify. Main risk: hallucinated or missed clauses, so keep a human reviewer and an evaluation set. General lesson: match the inductive bias (locality, streaming state, global attention) to the data and hardware.</p>`,
    complexity: `<p>Design reasoning; costs differ: CNN O(pixels·k²), RNN/SSM O(n), attention O(n²).</p>`, followUps: ['How would you compress model A further?', 'What evaluation set would you build for C?']
  }
});

practice.push({
  title: 'Attention cost and KV-cache memory at 128k tokens', level: 'Hard', tags: ['transformers', 'memory', 'scaling'], companies: ['OpenAI', 'Anthropic', 'Google'],
  statement: `<p>A transformer has 32 layers, 32 query heads, 8 key/value heads (grouped-query attention), head dimension 128, fp16 (2 bytes). (a) How large is the KV cache for one 128,000-token sequence? (b) How many entries are in one naive attention score matrix for one head and one layer at 128k tokens, and what would that cost in memory at fp16? (c) Which tricks avoid these costs?</p>`,
  constraints: `KV cache per token = layers × kv_heads × head_dim × 2 (K and V) × bytes.`,
  example: `<p>Per token: 32·8·128·2·2 = 131,072 bytes (128 KiB). Times 128,000 tokens ≈ 16.8 GB. One score matrix: 128,000² ≈ 1.64×10<sup>10</sup> entries ≈ 32.8 GB at fp16.</p>`,
  brute: { why: `<p>Materialising the full n×n score matrix for every head and layer is impossible at this length (32.8 GB for a single head), and using full multi-head KV (32 heads) would multiply the cache by 4.</p>`, code: { lang: 'python', code: `n = 128_000
scores = n * n * 2                      # bytes for ONE head, ONE layer
print(scores / 1e9, "GB")
full_mha_kv = 32 * 32 * 128 * 2 * 2 * n  # 32 kv heads instead of 8
print(full_mha_kv / 1e9, "GB")` } },
  mcq: { q: 'What does grouped-query attention reduce?', options: ['KV-cache size, by sharing K and V across several query heads', 'The number of layers', 'The vocabulary size'], answer: 0, explain: 'Several query heads share one key/value head, cutting the cache (and memory bandwidth) by the group factor while keeping most of the quality.' },
  hints: [`<p>Count bytes per token first: layers × kv-heads × head-dim × 2 (K and V) × 2 bytes.</p>`, `<p>The naive score matrix is n × n per head per layer; at fp16 multiply by 2 bytes.</p>`, `<p>Remedies: FlashAttention (tiles, never stores n×n), GQA/MQA, KV quantisation, sliding-window or sparse attention, paged KV cache, prompt caching, retrieval to shorten context.</p>`],
  solution: {
    approach: `<p>(a) Per token the cache stores K and V for every layer and KV head: 32 layers × 8 heads × 128 dims × 2 tensors × 2 bytes = 131,072 bytes. For 128,000 tokens that is about 16.8 GB, for a single sequence: a major reason serving long contexts limits how many users fit on a GPU. With full multi-head attention (32 KV heads) it would be 67 GB. (b) One head in one layer would need 128,000² ≈ 1.64×10<sup>10</sup> scores, about 32.8 GB at fp16, and there are 32 heads in 32 layers, so a naive implementation is out of the question. (c) FlashAttention computes attention in tiles on-chip and never writes the n×n matrix, so memory stays linear; compute is still quadratic. GQA/MQA shrinks the KV cache; KV-cache quantisation (int8/fp8) halves it again; sliding-window or sparse patterns reduce compute for local tasks; paged KV caches avoid fragmentation across many requests; prompt caching reuses shared prefixes; retrieval keeps prompts short in the first place. The takeaway for system design: context length costs memory per user and quadratic compute, so budget it deliberately.</p>`,
    code: { lang: 'python', run: true, code: `layers, kv_heads, head_dim, bytes_per = 32, 8, 128, 2
per_token = layers * kv_heads * head_dim * 2 * bytes_per
n = 128_000
print("KV bytes per token:", per_token, "(", per_token // 1024, "KiB )")
print("KV cache for 128k tokens: %.1f GB" % (per_token * n / 1e9))
print("one naive score matrix: %.1f GB" % (n * n * bytes_per / 1e9))` },
    complexity: `<p>KV cache O(n); naive attention memory O(n²); FlashAttention memory O(n), compute O(n²).</p>`, followUps: ['How many concurrent 128k sessions fit in an 80 GB GPU with a 14 GB model?', 'What does MQA change versus GQA?']
  }
});

practice.push({
  title: 'Why residual connections fix vanishing gradients', level: 'Hard', tags: ['residual', 'gradients', 'theory'], companies: ['Meta', 'DeepMind'],
  statement: `<p>A block computes y = x + F(x). For a stack of L such blocks, derive the gradient of the final output with respect to the input and explain, using this derivation, why very deep residual networks (ResNets, transformers) train while equally deep plain networks do not. Include what can still go wrong.</p>`,
  constraints: `Treat everything as scalars for the derivation; mention the matrix version briefly.`,
  example: `<p>One block: dy/dx = 1 + F′(x). Two blocks: (1 + F₂′)(1 + F₁′) = 1 + F₁′ + F₂′ + F₂′F₁′. The "1" survives every product.</p>`,
  brute: { why: `<p>Plain stack x → F₂(F₁(x)): the gradient is the pure product F₂′·F₁′. If each factor is 0.25, 20 layers give 10<sup>−12</sup>. There is no alternative path, so the signal has to survive every multiplication.</p>`, code: { lang: 'python', code: `plain = 1.0
resid = 1.0
for _ in range(20):
    plain *= 0.25            # product of small slopes
    resid *= (1 + 0.25 * 0)  # identity path keeps the factor at 1
print(plain, resid)` } },
  mcq: { q: 'In y = x + F(x), the derivative dy/dx equals…', options: ['1 + F′(x)', 'F′(x)', '1 × F′(x)'], answer: 0, explain: 'The identity branch contributes 1 and the residual branch contributes F′(x); they add.' },
  hints: [`<p>Differentiate y = x + F(x) with respect to x. The identity branch gives a constant.</p>`, `<p>For L blocks the total derivative is the product of (1 + F_i′). Expand the product and look at the terms.</p>`, `<p>The expansion always contains a term equal to 1 (the pure skip path) plus sums of products of F′, so the gradient cannot vanish from the skip path alone. What if F′ is large? Normalisation and initialisation scale F small.</p>`],
  solution: {
    approach: `<p>For one block y = x + F(x), so dy/dx = 1 + F′(x). For L blocks the chain rule gives ∏(1 + F_i′). Expanding the product yields 1 + ΣF_i′ + Σ F_i′F_j′ + ...: the constant 1 corresponds to the path that skips every F entirely. In a plain network the gradient is just ∏F_i′, and if the slopes are below 1 it collapses exponentially; in the residual network the skip path guarantees a gradient of at least order 1 flowing straight from the loss to the earliest layer (like a gradient highway), while the residual branches add refinements. In matrix form the Jacobian is I + J_F, and I keeps singular values near 1. That is why 100-layer ResNets and 100-layer transformers (where each sub-layer is wrapped as x + Sublayer(x)) train with ordinary optimisers. Risks: the "1 + ..." products can also blow up if the F′ terms are large, so networks use careful initialisation (scale the residual branch small, zero-init the last layer of each block), normalisation (pre-LN transformers) and gradient clipping. Residual connections also make the network behave like an ensemble of shallower paths.</p>`,
    code: { lang: 'python', run: true, code: `def depth_gradient(layers, slope, residual):
    g = 1.0
    for _ in range(layers):
        g *= (1 + slope) if residual else slope
    return g
for L in (5, 20, 50):
    print(L, "plain: %.2e" % depth_gradient(L, 0.25, False),
          " residual (F'=0.0): %.2e" % depth_gradient(L, 0.0, True),
          " residual (F'=0.02): %.2e" % depth_gradient(L, 0.02, True))` },
    complexity: `<p>Adds zero parameters; one addition per block.</p>`, followUps: ['What does pre-LN vs post-LN change for gradient flow?', 'Why zero-init the last layer in each residual branch?']
  }
});

function Q(q, options, answer, explain) { quiz.push({ q: q, options: options, answer: answer, explain: explain }); }
Q('A single perceptron with a step activation cannot learn XOR because…', ['XOR is not linearly separable', 'XOR needs more than two inputs', 'The learning rate is too high'], 0, 'One neuron draws a single straight line. XOR has its two 1-cases on opposite corners, so no line separates them from the 0-cases.');
Q('What is the main purpose of a non-linear activation function between layers?', ['It lets stacked layers represent more than one linear function', 'It reduces the number of parameters', 'It makes the forward pass faster'], 0, 'Without activations, any number of linear layers collapse into a single linear layer. The non-linearity gives depth its power.');
Q('Which output activation suits "choose exactly one of 10 classes"?', ['Softmax', 'ReLU', 'Tanh', 'Linear'], 0, 'Softmax produces 10 positive numbers that sum to 1, readable as class probabilities.');
Q('ReLU(−3) equals…', ['0', '−3', '3', '0.05'], 0, 'ReLU(z) = max(0, z), so every negative input becomes 0.');
Q('In backpropagation, the gradient of the loss with respect to an early weight is computed by…', ['Multiplying local derivatives along the path back from the loss (chain rule)', 'Re-running training for each weight', 'Averaging all weights'], 0, 'Backprop multiplies one local derivative per step, reusing intermediate results, so all gradients come from a single backward sweep.');
Q('Why do deep sigmoid networks suffer from vanishing gradients?', ['The sigmoid slope is at most 0.25, so repeated multiplication shrinks the gradient', 'Sigmoid outputs are negative', 'Sigmoid cannot be differentiated'], 0, 'Each layer multiplies the gradient by a slope of at most 0.25, so after many layers the early layers get almost nothing.');
Q('What does momentum add to plain SGD?', ['A running velocity of past gradients', 'A bigger batch size', 'A second loss function'], 0, 'v = β·v + g accumulates consistent directions and smooths zig-zags, giving faster progress along valleys.');
Q('Adam keeps which two running statistics per parameter?', ['Mean of gradients and mean of squared gradients', 'The largest weight and the smallest weight', 'Loss and accuracy'], 0, 'm (first moment) gives the direction and s (second moment) scales the step per parameter.');
Q('Cosine similarity of two embedding vectors equals 0. This means they are…', ['Perpendicular (unrelated direction)', 'Identical', 'Opposite'], 0, 'Cosine is 1 for the same direction, 0 for perpendicular, −1 for opposite.');
Q('A 5×5 image convolved with a 3×3 kernel (stride 1, no padding) gives an output of size…', ['3×3', '5×5', '7×7', '2×2'], 0, 'Use (5 − 3)/1 + 1 = 3, giving a 3×3 map.');
Q('What main advantage does a convolution layer have over a dense layer on images?', ['Weight sharing and local connectivity give far fewer parameters', 'It ignores pixel positions entirely', 'It needs no training'], 0, 'The same small kernel is reused at every position, so the parameter count does not grow with image size, and patterns are learned once.');
Q('Which is NOT a reason RNNs struggle with long sequences?', ['They use too many attention heads', 'Gradients vanish through many time steps', 'Computation must happen step by step'], 0, 'RNNs have no attention heads. Their problems are vanishing gradients through time, a squeezed fixed-size state, and sequential computation.');
Q('Why could transformers be trained at much larger scale than RNNs?', ['All positions are processed in parallel on GPUs', 'They use fewer layers', 'They need no data'], 0, 'Self-attention does not depend on a previous time step\'s output, so the whole sequence is processed at once, which uses accelerators well.');
Q('Self-attention compute grows with sequence length n roughly as…', ['n squared', 'n', 'log n'], 0, 'Every token is compared with every other token, giving n² scores per head per layer.');

function IV(q, level, a, f) { interview.push({ q: q, level: level, a: a, followUps: f }); }
IV('Explain a perceptron and why it fails on XOR.', 'B', `<p>A perceptron is one artificial neuron: it multiplies inputs by weights, adds a bias, and fires 1 if the total is above zero. Learning nudges the weights by <code>lr × error × input</code> when a prediction is wrong. Geometrically it draws a single straight line (a hyperplane) through the input space. AND and OR are separable by a line, so it learns them. XOR is not: its two positive points are on opposite corners, so any line that captures both also captures a negative point. The fix is a hidden layer with a non-linear activation, which builds new features (OR, NAND) in which XOR is separable.</p>`, ['Prove XOR is not separable with inequalities.', 'How would a 2-layer net solve it?']);
IV('Walk me through a forward pass in a small neural network.', 'B', `<p>For each layer: take the previous layer's output vector, multiply by the weight matrix, add the bias vector, and apply the activation. For a 2-2-1 net with ReLU hidden units and a sigmoid output: h = ReLU(W1·x + b1), then y = sigmoid(W2·h + b2). In practice the input is a whole batch, so each layer is a single matrix multiply, which GPUs do very fast. I would also mention the shapes: (batch, in) × (in, out) → (batch, out), and that the activations are stored for the backward pass during training.</p>`, ['What changes between training and inference?', 'Why is the output activation chosen by task?']);
IV('Which activation function would you pick for hidden and output layers, and why?', 'B', `<p>Hidden layers: ReLU by default because it is cheap, does not saturate for positive inputs and keeps gradients healthy; GELU or SwiGLU in transformers. Output layer depends on the task: sigmoid for binary probability, softmax for exactly-one-of-K, linear for regression, and independent sigmoids for multi-label. I avoid sigmoid or tanh in deep hidden stacks because their flat tails cause vanishing gradients. In code I usually output raw logits and let a fused loss apply the sigmoid or softmax stably.</p>`, ['What is a dead ReLU and how do you fix it?', 'Why pass logits to the loss?']);
IV('Explain backpropagation intuitively and with the chain rule.', 'I', `<p>After the forward pass we know the loss. Backprop answers: how much did each weight contribute to that loss? Using the chain rule, the effect of a weight on the loss is the product of local effects along the path from the weight to the loss. We compute them from the output backward, reusing each intermediate gradient, so one backward sweep gives every gradient at roughly the cost of a forward pass. Example: for z = w·x, y = σ(z), L = ½(y − t)², ∂L/∂w = (y − t) · y(1 − y) · x. Then gradient descent updates w ← w − lr·∂L/∂w.</p>`, ['Why is reverse-mode autodiff used rather than forward mode?', 'How do you check your gradients?']);
IV('What are vanishing and exploding gradients and how do you fix them?', 'I', `<p>Backprop multiplies a local slope per layer or time step. If the factors are mostly below 1, the gradient shrinks exponentially and early layers do not learn (vanishing); if above 1 it grows (exploding) and the loss blows up. Sigmoid and tanh saturate and have slopes below 1, deep RNNs repeat the same weight matrix. Fixes: ReLU-family activations, He/Xavier initialisation, normalisation layers, residual connections, gated architectures (LSTM/GRU), gradient clipping for explosion, and a sensible learning rate. I diagnose by logging per-layer gradient norms.</p>`, ['Why do residual connections help?', 'How does LSTM mitigate it through time?']);
IV('Compare SGD, momentum and Adam. When would you use each?', 'I', `<p>SGD updates with the current mini-batch gradient; simple, low memory, often generalises well with a tuned schedule. Momentum adds a velocity that accumulates past gradients, speeding progress along consistent directions and damping oscillation. Adam additionally keeps a running average of squared gradients to scale the step per parameter, so it is robust to gradient scale and needs little tuning; AdamW with decoupled weight decay is the default for transformers. I use SGD with momentum for vision models where final accuracy matters and Adam/AdamW for transformers and quick experiments, always with warm-up and a decaying schedule.</p>`, ['What does the learning rate do and how do you choose it?', 'Why does Adam need bias correction?']);
IV('What is an embedding and how is it learned?', 'I', `<p>An embedding maps a discrete item (token, user, product) to a dense vector so that similar items sit close together. It is implemented as a lookup table whose rows are ordinary trainable parameters. They are learned end to end by backprop: items that appear in similar contexts or help predict similar outputs get pushed to similar vectors. word2vec learned them by predicting neighbouring words; LLMs learn them as the first layer for next-token prediction. Similarity is measured by cosine similarity or dot product. Caveats: embeddings from different models are not comparable, and they carry biases from training data.</p>`, ['Static vs contextual embeddings?', 'How would you search a million embeddings quickly?']);
IV('Explain how a convolutional layer works and why it suits images.', 'I', `<p>A small kernel (like 3×3) is slid over the image; at each position you multiply overlapping values and sum them, producing one value of a feature map. The same kernel weights are reused everywhere (weight sharing) and each output sees only a local patch (local connectivity). That makes parameter count independent of image size and builds in translation equivariance: a pattern is detected wherever it appears. Stacked layers with ReLU and pooling build from edges to textures to objects. Output size is ⌊(n − k + 2p)/s⌋ + 1, and parameters per layer are c_out × (k·k·c_in + 1).</p>`, ['What do padding, stride and pooling do?', 'What is the receptive field?']);
IV('Why do RNNs struggle with long sequences?', 'I', `<p>Three reasons. First, vanishing gradients through time: the gradient from step T back to step 1 is a product of T Jacobians, typically shrinking exponentially, so long-range dependencies are not learned. Second, the entire past is squeezed into one fixed-size hidden state, so details get overwritten. Third, computation is sequential, so training cannot be parallelised across positions. LSTM and GRU gates ease the first two by letting information pass additively, but they still struggle at thousands of steps and remain slow to train. Attention addresses all three by giving a direct path between any two positions.</p>`, ['How do LSTM gates work?', 'What is truncated BPTT?']);
IV('Why did transformers replace RNNs and CNNs for language?', 'A', `<p>Transformers connect every token to every other token in a single attention layer, so long-range links need one hop instead of hundreds. Training parallelises across all positions, which exploits GPUs/TPUs and enabled scaling to trillions of tokens, and scaling laws showed predictable gains from more data, parameters and compute. The same block also generalises to images, audio and code and supports transfer via pre-training. The cost is O(n²) attention compute and a KV cache that grows with context, which is mitigated by FlashAttention, grouped-query attention, windowing and retrieval. State-space models are an active alternative for constant-memory streaming.</p>`, ['When might you still choose a CNN or SSM?', 'What does the KV cache store?']);
IV('Your model\'s training loss is stuck at the same value from step 1. How do you debug?', 'A', `<p>I first overfit a tiny batch: if it cannot, the bug is in code rather than tuning. Then check the usual suspects: learning rate too small or zero, missing optimizer.step or zero_grad misuse, frozen parameters or accidental .detach(), labels shuffled relative to inputs, wrong loss for the output activation (double softmax), dead ReLUs from a huge early update or bad initialisation, and unnormalised inputs. I log gradient norms per layer and activation statistics, and compare with a numerical gradient on a small case. I change one thing at a time with a fixed seed.</p>`, ['How do you detect dead ReLUs?', 'What would loss plateauing at ln(K) tell you?']);
IV('How do residual connections and normalisation make very deep networks trainable?', 'A', `<p>A residual block computes y = x + F(x), so dy/dx = 1 + F′(x): the identity path guarantees a gradient highway from the loss to early layers, avoiding exponential shrinkage. Normalisation (BatchNorm in CNNs, LayerNorm/RMSNorm in transformers) keeps activations at a stable scale, which keeps slopes and gradients in a healthy range and makes training less sensitive to learning rate and initialisation. In transformers pre-LN placement plus small-scale initialisation of residual branches stabilises very deep stacks. Together with ReLU/GELU activations and warm-up they are why 100+ layer models train.</p>`, ['Pre-LN versus post-LN?', 'Why zero-initialise the last layer of a residual branch?']);
IV('Estimate the memory and compute cost of training versus inference for a neural network.', 'A', `<p>Parameters P at 4 bytes (fp32) or 2 bytes (bf16). Inference needs the weights plus activations of one pass (and a KV cache for transformers). Training additionally stores gradients (another P), optimizer state (Adam adds 2P), and activations for every layer for the backward pass, which scale with batch size and depth. Rough rule: Adam mixed-precision training takes about 16 bytes per parameter before activations. Compute: forward is about 2P FLOPs per token for a dense transformer, backward about twice that, so training is ~6P FLOPs per token. Tricks: gradient checkpointing, mixed precision, sharding (ZeRO/FSDP), LoRA.</p>`, ['What does gradient checkpointing trade?', 'How does LoRA cut optimizer memory?']);

registerModule({
  id: 'ai05',
  title: 'Neural Networks & Deep Learning Basics',
  intro: `<p>This module opens the black box. You will build a neuron from scratch, stack neurons into layers, run a forward pass by hand, and see how <b>backpropagation</b> passes blame backward with the chain rule so the weights can learn. You will compare optimizers (SGD, momentum, Adam), meet <b>embeddings</b> (words as points on a meaning map), peek at CNNs and RNNs, and finally understand <b>why transformers won</b>. Everything is explained with analogies first, tiny numbers you can check on paper, and runnable standard-library Python (an XOR network trained with hand-written backprop, a convolution, SGD vs momentum). It prepares you for the LLM modules that follow.</p>`,
  goals: [
    'Explain a perceptron, train it on AND and OR, and show why it fails on XOR',
    'Compute a 2-layer forward pass by hand and choose ReLU, sigmoid, tanh or softmax correctly',
    'Backpropagate the gradient of a single weight with the chain rule and explain vanishing gradients',
    'Compare SGD, momentum and Adam and spot a bad learning rate from a loss curve',
    'Describe embeddings and cosine similarity, convolve a 3x3 kernel over a 5x5 image, and explain why RNNs struggle with long sequences and why transformers replaced them'
  ],
  prereqs: `Module "Machine Learning Foundations" (loss, gradient descent, overfitting) and "Math &amp; Python for AI" (vectors, matrix multiplication, softmax).`,
  hours: 10,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
