(function () { var topics = [], practice = [], quiz = [], interview = [];

topics.push({
  title: 'AI, ML, Deep Learning and GenAI: The Nesting Dolls',
  analogy: `<p>Think of <b>Russian nesting dolls</b>. The biggest doll is <b>AI</b> (any machine doing something we call smart). Inside it sits <b>Machine Learning</b> (smart because it learned from examples). Inside that sits <b>Deep Learning</b> (learning with big layered neural networks). In the smallest doll sits <b>Generative AI</b> (deep learning that makes new text, images, code, audio).</p>`,
  explain: `<p>People throw these four words around as if they mean the same thing. They do not. Each one is a <b>smaller circle inside the previous one</b>.</p>
  <ul>
  <li>${H.c('b', '<b>AI (Artificial Intelligence)</b>')}: the big goal — make machines do tasks that normally need human thinking. A chess program that follows hand-written rules is AI. A spam filter that learned from emails is also AI.</li>
  <li>${H.c('g', '<b>ML (Machine Learning)</b>')}: a way to build AI where you do NOT write the rules. You show the computer many examples and it finds the rules itself.</li>
  <li>${H.c('p', '<b>DL (Deep Learning)</b>')}: ML that uses neural networks with many layers. Great at messy data like pictures, sound and language.</li>
  <li>${H.c('y', '<b>GenAI (Generative AI)</b>')}: deep-learning models that <i>produce</i> new content (a paragraph, a picture, a function) instead of only labelling things. ChatGPT, Claude, Gemini, Midjourney and Copilot are GenAI. An <b>LLM</b> (Large Language Model) is a GenAI model for text.</li>
  </ul>
  <p>Quick sort test: <i>is there a learning step from data?</i> No → plain AI (rules, search). Yes → ML. Is it a many-layered neural network? Yes → DL. Does it create new content? Yes → GenAI.</p>
  ${H.table(['System', 'AI?', 'ML?', 'DL?', 'GenAI?'], [
    ['Chess engine with hand-written rules + search', 'yes', 'no', 'no', 'no'],
    ['Spam filter (logistic regression on word counts)', 'yes', 'yes', 'no', 'no'],
    ['Face unlock on your phone (CNN)', 'yes', 'yes', 'yes', 'no'],
    ['ChatGPT / Claude writing an email', 'yes', 'yes', 'yes', 'yes']
  ])}
  <p>One more piece of vocabulary: the opposite of a <b>rule-based</b> system (a human writes <code>if/else</code>) is a <b>learned</b> system (data writes the rules). Most real products mix both.</p>`,
  clues: [
    '"What is the difference between AI, ML and deep learning?" — answer with nesting, not definitions in isolation',
    '"Is ChatGPT machine learning?" → yes: it is an LLM, which is deep learning, which is ML, which is AI',
    '"Rules vs learning" in a design question → ask whether the rules can be written down by a human',
    'Words like <i>generate, draft, summarize, create</i> point to GenAI; <i>classify, predict, detect, recommend</i> point to classic ML',
    '"Do we need AI for this?" → often a plain <code>if</code> statement or SQL query is the right answer'
  ],
  code: { lang: 'python', title: 'Rules vs learned: the same task two ways (runnable)', run: true, code: `# Task: decide if a message is spam.
# Way 1: RULES - a human writes the logic.
def rule_spam(msg):
    bad_words = ["winner", "free", "prize", "click"]
    return sum(w in msg.lower() for w in bad_words) >= 2

# Way 2: LEARNED - count which words show up more in spam than in normal mail.
train = [
    ("free prize click now", 1), ("you are a winner", 1),
    ("lunch at noon tomorrow", 0), ("project review notes attached", 0),
    ("claim your free gift", 1), ("meeting moved to friday", 0),
]
spam_counts, ham_counts = {}, {}
for text, label in train:
    bucket = spam_counts if label == 1 else ham_counts
    for w in text.split():
        bucket[w] = bucket.get(w, 0) + 1

def learned_spam(msg):
    # score = how spammy each known word is, added up
    score = 0
    for w in msg.lower().split():
        score += spam_counts.get(w, 0) - ham_counts.get(w, 0)
    return score > 0

for m in ["free gift winner", "notes for friday lunch", "click for a prize"]:
    print(m, "| rules:", rule_spam(m), "| learned:", learned_spam(m))
print("The learned version never had a bad_words list - the data wrote it.")` },
  viz: {
    title: 'AI ⊃ ML ⊃ DL ⊃ GenAI nesting',
    gen: function () {
      var arr = ['AI', 'ML', 'Rules / search AI', 'Deep Learning', 'Classic ML (trees, regression)', null, null, 'GenAI (LLMs, diffusion)', 'Vision / speech nets'];
      var steps = [
        [[0], 'Start with <b>AI</b>: the whole big field. Anything that makes a machine act smart counts.'],
        [[0, 2], 'One branch of AI is <b>hand-written rules and search</b> (chess engines, expert systems). No learning from data here.'],
        [[0, 1], 'The other branch is <b>Machine Learning</b>: the machine learns its rules from examples.'],
        [[1, 4], 'Inside ML, <b>classic ML</b> (linear regression, decision trees, k-means) works well on tables of numbers.'],
        [[1, 3], 'Inside ML sits <b>Deep Learning</b>: neural networks with many layers. Needs lots of data and compute.'],
        [[3, 8], 'Deep learning powers vision and speech models such as face unlock and voice assistants.'],
        [[3, 7], 'And the newest, smallest doll: <b>GenAI</b> — deep nets that <i>create</i> text, images and code. This is where ChatGPT and Claude live.']
      ];
      return steps.map(function (s) {
        var hl = {}; s[0].forEach(function (i, k) { hl[i] = k === s[0].length - 1 ? 'cur' : 'ok'; });
        return { narr: s[1], parts: [{ type: 'tree', label: 'Which circle are we in?', arr: arr, hl: hl }] };
      });
    }
  },
  examples: [
    { title: 'Classify: Netflix recommendations', html: `<p>Netflix learns from what millions of people watched, then predicts what you will like. Learning from data → <b>ML</b>. Modern versions use neural networks → <b>DL</b>. It picks from existing titles, it does not invent a show → <b>not GenAI</b>.</p>` },
    { title: 'Classify: a calculator and a thermostat', html: `<p>A calculator follows exact arithmetic — not even AI. A simple thermostat (<code>if temp &lt; 20: heat on</code>) is a rule, so at most "very basic AI" in the loosest sense. Nothing was learned. Do not call these ML.</p>` },
    { title: 'Classify: Copilot writing a function', html: `<p>It reads your comment and <b>generates</b> new code. It is an LLM → deep learning → ML → AI. All four dolls apply. That is why people say "it is just AI": true but too vague. Use the smallest accurate doll.</p>`, code: { lang: 'python', check: false, code: `# Pseudocode: GenAI call (key comes from the environment, never hardcode it)
import os
api_key = os.environ["LLM_API_KEY"]   # placeholder name, set it in your shell
# client = SomeLLMClient(api_key=api_key)
# reply = client.generate("Write a function that reverses a string")` } }
  ],
  deepDive: `<p><b>Why do the boundaries blur?</b> Terms are marketing as much as science. In the 1980s "AI" meant expert systems with thousands of <code>if</code> rules; when they flopped the field entered an "AI winter" and people avoided the word. "Machine learning" and later "deep learning" were partly rebrands that also happened to be accurate. Today "AI" is back as the umbrella term and often used for any LLM product.</p>
  <p><b>Narrow vs general.</b> Everything that exists today is <b>narrow AI</b>: good at tasks it was trained on. <b>AGI</b> (Artificial General Intelligence) means human-level skill across most tasks; no agreed test exists and experts disagree on when or whether it arrives. <b>Foundation model</b> means one big model trained on broad data and then adapted to many jobs — LLMs are the main example.</p>
  <p><b>Symbolic vs statistical.</b> Old AI manipulated symbols with logic (Prolog, expert systems): explainable but brittle. Statistical AI learns patterns from data: flexible but hard to explain. Modern systems are <i>hybrids</i>: an LLM decides, a normal program with strict rules checks and acts. Knowing which part should be which is a core engineering skill.</p>
  <p><b>Interview trap:</b> "Is every neural network deep learning?" A network with one hidden layer is technically a neural network but usually not called deep. "Deep" loosely means several or many layers.</p>`,
  aiEra: `<p><b>What AI changes:</b> as an engineer you will meet GenAI as a <i>component</i> in your system, the way you meet a database or a payment API. You do not need to build models to use them well, but you must know which doll you are holding, because that decides cost, speed, failure modes and how to test it.</p>
  <p><b>Use AI as a partner:</b> ask an assistant "Give me 10 products and make me label each as rules, classic ML, deep learning or GenAI, then check my labels". It is a quick way to train your ear.</p>
  <p><b>Where AI goes wrong:</b> assistants (and vendors) often call anything "AI-powered". A feature that is just a regex plus a marketing page is still labelled AI. Ask "what was learned, from what data?" to cut through it.</p>
  <p><b>What you must still own:</b> choosing whether a problem needs learning at all, and explaining that choice to non-technical colleagues in plain words.</p>`,
  problems: [{
    title: 'Which Doll Is It?', level: 'Easy', tags: ['definitions', 'classification'],
    statement: `<p>Label each system with the <b>smallest</b> circle that fits: Rules-AI, Classic ML, Deep Learning, or GenAI. (1) A bank rule: block any card payment over $5,000 from a new country. (2) A model that predicts house price from size and rooms using linear regression. (3) A phone app that turns a photo of your dog into a cartoon.</p>`,
    constraints: `Pick exactly one label per system and give one sentence of reasoning.`,
    example: `<p>${H.c('g', 'Example')}: "Gmail suggests the next few words as you type" → <b>GenAI</b> (a language model produces new text).</p>`,
    brute: { why: `<p>Weak answer: "all three are AI". True, but it does not show you understand the nesting, so it earns no marks.</p>` },
    mcq: { q: 'A tool learns from 1M labelled X-rays to flag pneumonia. Smallest fitting doll?', options: ['Rules-AI', 'Deep Learning', 'GenAI'], answer: 1, explain: 'It learns from data (ML), uses a neural network on images (deep learning), and only labels, not creates.' },
    hints: [`<p>Hint 1: ask "did a human write the logic, or did data?"</p>`, `<p>Hint 2: ask "does it output a label/number, or brand new content?"</p>`, `<p>Hint 3: (1) human-written threshold, (2) learned from numbers but simple, (3) creates a new image.</p>`],
    solution: {
      approach: `<p>(1) <b>Rules-AI</b>: a human wrote the threshold; nothing learned. (2) <b>Classic ML</b>: linear regression learns weights from past sales, but it is not a deep network. (3) <b>GenAI</b>: the app creates a new image, normally with a deep generative model. State the reasoning each time: "learned or written?" then "label or create?". That two-question test works on any product in an interview.</p>`,
      complexity: `<p>Not applicable - this is a classification of ideas.</p>`
    }
  }]
});

topics.push({
  title: 'A Short History of AI: Booms, Winters and the Transformer',
  analogy: `<p>AI history is like a <b>weather diary</b>: long sunny summers of big promises, then cold winters when money and interest dried up, then a new warm front once something finally worked. Each warm front arrived because of one ingredient: better ideas, more data, or faster hardware.</p>`,
  explain: `<p>You do not need dates for trivia night. You need the <b>story</b>, because it explains why today's AI looks the way it does.</p>
  ${H.table(['Year', 'Event', 'Why it mattered'], [
    ['1950', 'Alan Turing asks "Can machines think?" and proposes the Turing Test', 'Gave the field a goal'],
    ['1956', 'Dartmouth workshop: the term <b>Artificial Intelligence</b> is coined', 'AI becomes a named field'],
    ['1958', 'Rosenblatt\'s <b>Perceptron</b>: first trainable neuron', 'Seed of neural networks'],
    ['1970s-80s', 'Expert systems (hand-written rules); first <b>AI winter</b>', 'Rules were brittle, hype crashed'],
    ['1986', 'Backpropagation popularised', 'Made multi-layer nets trainable'],
    ['1997', 'IBM Deep Blue beats Kasparov at chess', 'Search plus rules, not learning'],
    ['2012', '<b>AlexNet</b> wins ImageNet using GPUs', 'Deep learning boom starts'],
    ['2016', 'AlphaGo beats Lee Sedol at Go', 'Deep learning plus reinforcement learning'],
    ['2017', 'Paper <i>Attention Is All You Need</i> introduces the <b>Transformer</b>', 'Architecture behind every modern LLM'],
    ['2020-22', 'GPT-3, DALL-E, Stable Diffusion, then ChatGPT (Nov 2022)', 'GenAI reaches the public'],
    ['2023-26', 'Multimodal models, long context, tool-using <b>agents</b>, open-weight models', 'AI becomes a daily engineering tool']
  ])}
  <p><b>The three ingredients</b> behind every boom: ${H.c('b', '<b>algorithms</b>')} (backprop, transformers), ${H.c('g', '<b>data</b>')} (the internet, labelled sets like ImageNet) and ${H.c('y', '<b>compute</b>')} (GPUs, TPUs). Take one away and progress stalls. Many "new" ideas existed for decades and only worked once data and chips caught up.</p>
  <p><b>Lesson for you:</b> hype cycles repeat. Learn the durable ideas (data, evaluation, system design) and you survive the next winter.</p>`,
  clues: [
    '"Why did deep learning take off in 2012?" → GPUs + big labelled data (ImageNet) + better training tricks',
    '"What is an AI winter?" → hype outran results, funding collapsed; rules-based expert systems were the trigger',
    '"What changed with transformers?" → they train in parallel on huge text and scale predictably with more data and compute',
    '"Deep Blue vs AlphaGo" → search + hand-tuned rules vs learned neural networks',
    'Any history question → mention the three ingredients: algorithms, data, compute'
  ],
  viz: {
    title: 'AI history timeline, one era at a time',
    gen: function () {
      var rows = [
        ['1950', 'Turing test proposed', 'idea'],
        ['1956', 'Term "AI" coined at Dartmouth', 'idea'],
        ['1958', 'Perceptron', 'neural nets'],
        ['1974-80', 'First AI winter', 'winter'],
        ['1986', 'Backpropagation popular', 'neural nets'],
        ['1987-93', 'Second AI winter', 'winter'],
        ['1997', 'Deep Blue beats Kasparov', 'rules + search'],
        ['2012', 'AlexNet and GPUs', 'deep learning'],
        ['2017', 'Transformer paper', 'GenAI path'],
        ['2022', 'ChatGPT goes mainstream', 'GenAI']
      ];
      var frames = [];
      for (var i = 0; i < rows.length; i++) {
        var hl = {}; hl[i] = rows[i][2] === 'winter' ? 'bad' : 'ok';
        frames.push({
          narr: '<b>' + rows[i][0] + '</b>: ' + rows[i][1] + (rows[i][2] === 'winter' ? ' - money and hype dry up.' : '. Category: ' + rows[i][2] + '.'),
          parts: [
            { type: 'table', label: 'Timeline so far', columns: ['Year', 'Event', 'Era'], rows: rows.slice(0, i + 1), hl: hl },
            { type: 'vars', vals: { winters: rows.slice(0, i + 1).filter(function (r) { return r[2] === 'winter'; }).length, events: i + 1 } }
          ]
        });
      }
      return frames;
    }
  },
  examples: [
    { title: 'Why Deep Blue was not "machine learning"', html: `<p>Deep Blue (1997) searched millions of chess positions per second and scored them with hand-tuned formulas written by experts. It was brute force plus human knowledge. AlphaGo (2016) <i>learned</i> board evaluation by playing itself. Same goal, opposite approach.</p>` },
    { title: 'Why 2012 and not 1986?', html: `<p>Backpropagation existed in 1986, but there was no huge labelled image set and no cheap parallel hardware. AlexNet in 2012 trained on ImageNet (1.2M images) with two GPUs and cut the error rate dramatically. Same idea, finally enough data and compute.</p>` },
    { title: 'Why the transformer won', html: `<p>Older language models (RNNs) read words one after another, so they trained slowly. Transformers look at all words at once, which maps perfectly onto GPUs. That let teams scale to trillions of words, and quality kept improving with scale.</p>` }
  ],
  deepDive: `<p><b>Scaling laws.</b> Around 2020 researchers showed model loss falls smoothly and predictably as you grow model size, data and compute. That turned AI progress into an engineering bet: spend more, get a better model. It also explains the huge data-centre spending of the 2020s. Since about 2024 more attention has moved to <b>inference-time compute</b> ("reasoning" models that think longer before answering) and to better data quality, because simply scaling pre-training has diminishing returns.</p>
  <p><b>The two AI winters.</b> Winter 1 (1970s): perceptrons shown to be limited (no XOR with one layer) and machine translation under-delivered. Winter 2 (late 1980s-90s): expert systems were costly to maintain. The lesson both times was the same: demos are easy, reliable products are hard.</p>
  <p><b>Open vs closed models.</b> Some labs release weights (Llama, Mistral, Qwen families) so anyone can run them; others offer only an API. Trade-off: control, privacy and cost vs convenience and frontier quality. Check current model names and prices before you design anything, because this changes every few months.</p>
  <p><b>Expert nuance:</b> "attention" itself pre-dates the 2017 paper (it was added to RNN translators in 2014-15); the 2017 contribution was removing the recurrence entirely.</p>`,
  aiEra: `<p><b>What AI changes:</b> the half-life of tool knowledge is short (new models every few months), but the half-life of fundamentals is long. Engineers who understand why things work adapt each time; those who memorised one product's menu start over.</p>
  <p><b>Use AI as a partner:</b> ask "explain the 2017 transformer paper like I am 15, then quiz me with 5 questions". Models are good at tutoring on well-documented history.</p>
  <p><b>Where AI goes wrong:</b> assistants can invent dates, paper titles and quotes, especially for lesser-known work. Always check a claim against the primary source (the paper, the lab blog).</p>
  <p><b>What you must still own:</b> a calm, historical perspective — you can tell your team "this is a real step change" or "this is the third time we have heard this promise", and back it with reasons.</p>`
});

topics.push({
  title: 'Three Ways Machines Learn: Supervised, Unsupervised, Reinforcement',
  analogy: `<p>Three ways to learn to cook. <b>Supervised</b>: a teacher shows you a photo of each dish with its name (examples with answers). <b>Unsupervised</b>: you get a pile of unlabelled recipes and sort them into groups yourself (soups, desserts, grills). <b>Reinforcement</b>: nobody tells you anything; you cook, taste, get a reward or a grimace, and slowly improve.</p>`,
  explain: `<p>Every ML system fits one of three styles. The difference is <b>what feedback the learner gets</b>.</p>
  ${H.table(['Style', 'Data looks like', 'Feedback', 'Typical job'], [
    ['Supervised', 'Inputs <b>with correct answers</b> (labels)', 'Direct: right or wrong per example', 'Spam or not, price prediction, image labels'],
    ['Unsupervised', 'Inputs only, no answers', 'None - find structure yourself', 'Customer groups, anomaly detection, topic discovery'],
    ['Reinforcement', 'An environment you act in', 'Reward after actions (often delayed)', 'Game play, robot control, ad/arm selection, tuning chat models with human feedback']
  ])}
  <h4>Supervised: learn from labelled examples</h4>
  <p>You have pairs (input, answer). The model guesses, we measure how wrong it was (the <b>loss</b>), and nudge its numbers to be less wrong. Two flavours: <b>classification</b> (pick a category: spam/not spam) and <b>regression</b> (predict a number: price, temperature). The line fit below is the smallest possible example: learn <code>y = w·x + b</code> from points.</p>
  ${H.table(['x (hours studied)', 'y (score)'], [['1', '3'], ['2', '5'], ['3', '7'], ['4', '9']])}
  <p>The hidden rule is <code>y = 2x + 1</code>. The model starts with w=0, b=0 and after a few <b>gradient steps</b> (small nudges downhill on the loss) it lands near w=2, b=1.</p>
  <h4>Unsupervised: find groups with no teacher</h4>
  <p><b>Clustering</b> (for example k-means) puts similar points together. You pick k, drop k centres, assign each point to the nearest centre, move each centre to the middle of its points, repeat until nothing moves.</p>
  <h4>Reinforcement: learn by trying</h4>
  <p>An <b>agent</b> takes an <b>action</b>, the <b>environment</b> returns a <b>reward</b>. The hardest part is the balance between <b>exploration</b> (try new things) and <b>exploitation</b> (repeat what works). The classic toy is the <b>multi-armed bandit</b>: several slot machines with unknown payout, and an <b>epsilon-greedy</b> player who picks the best-so-far machine most of the time but a random one with small probability ε.</p>
  <p><b>Bonus styles:</b> <b>self-supervised</b> learning creates its own labels from raw data (hide a word, predict it) — this is how LLMs are pre-trained. <b>Semi-supervised</b> mixes a few labels with lots of unlabelled data.</p>`,
  clues: [
    '"We have historical data with the correct outcome" → supervised',
    '"We have no labels / want to discover segments" → unsupervised (clustering, dimensionality reduction)',
    '"Agent", "reward", "policy", "environment", "maximize long-term return" → reinforcement learning',
    '"Predict a number" → regression; "pick a category" → classification',
    '"Labelling is too expensive" → self-supervised, semi-supervised, or weak labels',
    '"Explore vs exploit" → bandits / RL'
  ],
  code: [
    { lang: 'python', run: true, title: 'Supervised: fit y = w*x + b with gradient steps', code: `# Data follows y = 2x + 1. The model must discover w=2, b=1.
xs = [1.0, 2.0, 3.0, 4.0]
ys = [3.0, 5.0, 7.0, 9.0]

w, b = 0.0, 0.0      # the model's two knobs (its "parameters")
lr = 0.05            # learning rate: how big each nudge is

def loss(w, b):
    # mean squared error: average of (guess - truth)^2
    return sum((w * x + b - y) ** 2 for x, y in zip(xs, ys)) / len(xs)

print("step | w     b     | loss")
for step in range(0, 61):
    if step % 10 == 0:
        print(f"{step:4d} | {w:5.2f} {b:5.2f} | {loss(w, b):8.4f}")
    # gradient = which direction makes the loss grow; we move the opposite way
    dw = sum(2 * (w * x + b - y) * x for x, y in zip(xs, ys)) / len(xs)
    db = sum(2 * (w * x + b - y) for x, y in zip(xs, ys)) / len(xs)
    w -= lr * dw
    b -= lr * db

print("prediction for x=10:", round(w * 10 + b, 2), "(true answer 21)")` },
    { lang: 'python', run: true, title: 'Unsupervised: k-means on 2D points', code: `# Two obvious blobs; k-means has to discover them with no labels.
points = [(1, 1), (1.5, 2), (2, 1), (8, 8), (9, 9), (8.5, 9.5)]
centres = [(1, 1), (9, 9)]    # k=2, simple starting guesses

def dist2(p, q):
    return (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2

for it in range(1, 6):
    # step 1: assign every point to its nearest centre
    groups = [[] for _ in centres]
    for p in points:
        nearest = min(range(len(centres)), key=lambda i: dist2(p, centres[i]))
        groups[nearest].append(p)
    # step 2: move each centre to the average of its points
    new = []
    for g, c in zip(groups, centres):
        if g:
            new.append((sum(p[0] for p in g) / len(g), sum(p[1] for p in g) / len(g)))
        else:
            new.append(c)   # empty cluster: keep the old centre
    print("iter", it, "centres:", [(round(x, 2), round(y, 2)) for x, y in new])
    if new == centres:
        print("no change -> converged")
        break
    centres = new
print("cluster sizes:", [len(g) for g in groups])` },
    { lang: 'python', run: true, title: 'Reinforcement: epsilon-greedy bandit', code: `import random
random.seed(7)               # fixed seed so the output is repeatable

true_payout = [0.2, 0.5, 0.7]   # hidden chance each machine pays 1 coin
n = len(true_payout)
pulls = [0] * n                 # how often we tried each machine
value = [0.0] * n               # our running estimate of each machine
epsilon = 0.1                   # 10% of the time, explore randomly
total = 0

for t in range(1, 501):
    if random.random() < epsilon:
        arm = random.randrange(n)                          # explore
    else:
        arm = max(range(n), key=lambda i: value[i])        # exploit best guess
    reward = 1 if random.random() < true_payout[arm] else 0
    total += reward
    pulls[arm] += 1
    value[arm] += (reward - value[arm]) / pulls[arm]       # update the average
    if t in (10, 100, 500):
        print(f"t={t:3d} pulls={pulls} estimates={[round(v, 2) for v in value]}")

print("total reward:", total, "of 500 | best possible about", int(0.7 * 500))` }
  ],
  viz: [
    {
      title: 'Supervised: the fitted line improves every step',
      input: '0.05',
      inputLabel: 'Learning rate (try 0.01 to 0.1)',
      gen: function (input) {
        var lr = parseFloat(input);
        if (isNaN(lr) || lr <= 0 || lr > 0.12) throw new Error('Enter a learning rate between 0.001 and 0.12');
        var xs = [1, 2, 3, 4], ys = [3, 5, 7, 9], w = 0, b = 0, losses = [], frames = [];
        function L() { var s = 0; for (var i = 0; i < 4; i++) { var e = w * xs[i] + b - ys[i]; s += e * e; } return s / 4; }
        for (var step = 0; step <= 12; step++) {
          losses.push(Math.round(L() * 100) / 100);
          var preds = xs.map(function (x) { return Math.round((w * x + b) * 100) / 100; });
          frames.push({
            narr: step === 0 ? 'Start with a flat guess w=0, b=0. Predictions are all 0, the loss is large.' : 'Step ' + step + ': nudge w and b downhill. The loss drops to <b>' + losses[step] + '</b>.',
            parts: [
              { type: 'vars', label: 'Model knobs', vals: { step: step, w: Math.round(w * 100) / 100, b: Math.round(b * 100) / 100, loss: losses[step] }, hl: { loss: step === 12 ? 'ok' : 'cur' } },
              { type: 'array', label: 'predictions for x = 1,2,3,4 (truth is 3,5,7,9)', values: preds },
              { type: 'bars', label: 'loss after each step (smaller is better)', values: losses.slice() }
            ]
          });
          var dw = 0, db = 0;
          for (var j = 0; j < 4; j++) { var e2 = w * xs[j] + b - ys[j]; dw += 2 * e2 * xs[j] / 4; db += 2 * e2 / 4; }
          w -= lr * dw; b -= lr * db;
        }
        return frames;
      }
    },
    {
      title: 'Unsupervised: k-means iterations',
      input: '1,1 1.5,2 2,1 8,8 9,9 8.5,9.5',
      inputLabel: 'Points as x,y pairs separated by spaces (max 12)',
      gen: function (input) {
        var pts = String(input).trim().split(/\s+/).map(function (s) { var p = s.split(',').map(Number); return p; });
        if (pts.length < 3 || pts.length > 12 || pts.some(function (p) { return p.length !== 2 || isNaN(p[0]) || isNaN(p[1]); })) throw new Error('Enter 3 to 12 points like 1,1 2,3 8,9');
        var cs = [pts[0].slice(), pts[pts.length - 1].slice()], frames = [];
        function d2(p, q) { return (p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1]); }
        function r(v) { return Math.round(v * 100) / 100; }
        frames.push({ narr: 'Pick k=2 and drop two centres on the first and last point.', parts: [{ type: 'table', label: 'Centres', columns: ['cluster', 'x', 'y'], rows: cs.map(function (c, i) { return ['C' + i, r(c[0]), r(c[1])]; }) }] });
        for (var it = 1; it <= 5; it++) {
          var assign = pts.map(function (p) { return d2(p, cs[0]) <= d2(p, cs[1]) ? 0 : 1; });
          var rows = pts.map(function (p, i) { return [i, p[0] + ',' + p[1], 'C' + assign[i]]; });
          var hl = {}; assign.forEach(function (a, i) { hl[i] = a === 0 ? 'ok' : 'sel'; });
          frames.push({ narr: 'Iteration ' + it + ' - assign: each point joins its <b>nearest</b> centre (green = C0, purple = C1).', parts: [{ type: 'table', label: 'Assignments', columns: ['point #', 'x,y', 'cluster'], rows: rows, hl: hl }] });
          var moved = false, nc = cs.map(function (c, k) {
            var m = pts.filter(function (p, i) { return assign[i] === k; });
            if (!m.length) return c;
            var nx = m.reduce(function (s, p) { return s + p[0]; }, 0) / m.length, ny = m.reduce(function (s, p) { return s + p[1]; }, 0) / m.length;
            if (Math.abs(nx - c[0]) > 1e-9 || Math.abs(ny - c[1]) > 1e-9) moved = true;
            return [nx, ny];
          });
          cs = nc;
          frames.push({ narr: 'Iteration ' + it + ' - update: move each centre to the <b>average</b> of its points. ' + (moved ? 'Centres moved, go again.' : '<span class="c-g">Nothing moved: converged.</span>'), parts: [{ type: 'table', label: 'Centres', columns: ['cluster', 'x', 'y'], rows: cs.map(function (c, i) { return ['C' + i, r(c[0]), r(c[1])]; }) }] });
          if (!moved) break;
        }
        return frames;
      }
    },
    {
      title: 'Reinforcement: epsilon-greedy bandit estimates',
      input: '0.1',
      inputLabel: 'Epsilon (exploration chance 0 to 1)',
      gen: function (input) {
        var eps = parseFloat(input);
        if (isNaN(eps) || eps < 0 || eps > 1) throw new Error('Enter epsilon between 0 and 1');
        var truth = [0.2, 0.5, 0.7], val = [0, 0, 0], cnt = [0, 0, 0], seed = 12345, frames = [];
        function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
        for (var t = 1; t <= 40; t++) {
          var explore = rnd() < eps, arm;
          if (explore) arm = Math.floor(rnd() * 3); else { arm = 0; for (var i = 1; i < 3; i++) if (val[i] > val[arm]) arm = i; }
          var rw = rnd() < truth[arm] ? 1 : 0;
          cnt[arm]++; val[arm] += (rw - val[arm]) / cnt[arm];
          if (t <= 6 || t % 8 === 0) {
            var hl = {}; hl[arm] = rw ? 'ok' : 'bad';
            frames.push({ narr: 'Round ' + t + ': ' + (explore ? '<b>explore</b> (random pick)' : '<b>exploit</b> (best so far)') + ' machine ' + arm + ' and ' + (rw ? 'won 1 coin.' : 'won nothing.') + ' Its estimate is now ' + Math.round(val[arm] * 100) / 100 + '.', parts: [{ type: 'bars', label: 'estimated payout per machine (truth 0.2 / 0.5 / 0.7)', values: val.map(function (v) { return Math.round(v * 100) / 100; }), hl: hl, texts: cnt.map(function (c) { return c + ' pulls'; }) }] });
          }
        }
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Classify real products by learning type', html: `<ul><li><b>Gmail spam filter</b>: supervised (users marked mail as spam = labels).</li><li><b>Spotify "Discover Weekly" grouping similar listeners</b>: largely unsupervised (find similar users) plus supervised ranking.</li><li><b>AlphaGo / robot walking</b>: reinforcement learning (reward = win or stay upright).</li><li><b>Credit-card fraud with no known fraud labels</b>: unsupervised anomaly detection ("this purchase looks unlike the rest").</li><li><b>LLM pre-training</b>: self-supervised (predict the hidden next word). <b>Chat tuning with human ratings</b>: reinforcement-style (RLHF).</li></ul>` },
    { title: 'Supervised: classification or regression?', html: `<p>"Predict tomorrow's delivery time in minutes" → <b>regression</b> (a number). "Will this customer cancel? yes/no" → <b>classification</b>. "Which of 20 categories is this support ticket?" → <b>multi-class classification</b>. The output type decides the loss function and the metrics.</p>` },
    { title: 'Why exploration matters', html: `<p>If the bandit never explores (ε = 0) and machine 1 pays on the very first try, it may stick with machine 1 forever and never discover machine 2 is better. A tiny ε fixes that. Real use: a news site testing which headline works best, or a recommender showing something new now and then.</p>` }
  ],
  deepDive: `<p><b>Supervised learning in one sentence:</b> pick a model family, pick a loss, minimise the loss on training data with gradient descent. The gradient is just the slope of the loss for each parameter; subtracting a small multiple of it (learning rate) moves you downhill. Too large a learning rate overshoots and the loss explodes; too small is painfully slow.</p>
  <p><b>k-means details.</b> It always converges, but maybe to a poor local optimum depending on the starting centres, so real libraries run it many times (k-means++ initialisation). You must choose k (try the "elbow" method). It assumes round, similar-sized blobs; for odd shapes use DBSCAN or Gaussian mixtures. Scale your features first, or the biggest-number column dominates the distance.</p>
  <p><b>RL details.</b> Full RL has <i>states</i>, so today's action changes tomorrow's situation, and rewards can be delayed (you only know if you won the game at the end). This is called the credit assignment problem. A bandit is RL with no state. Algorithms: Q-learning, policy gradient, PPO. RL is data-hungry and unstable, which is why companies often prefer supervised learning when labels exist.</p>
  <p><b>Where the lines blur:</b> modern LLMs use all three: self-supervised pre-training, supervised fine-tuning on example chats, and reinforcement-style tuning from human or AI feedback. Recent "reasoning" models also use RL with verifiable rewards (does the code pass the tests?).</p>`,
  aiEra: `<p><b>What AI changes:</b> you rarely train from scratch now. For many problems you describe the task in a prompt (zero labels) or give a few examples (few-shot), which feels like supervised learning without a training run. You still need the vocabulary to reason about data, labels and feedback loops.</p>
  <p><b>Use AI as a partner:</b> paste your business problem and ask "which learning type fits, what would the labels be, and what is the cheapest baseline?" Then challenge the answer.</p>
  <p><b>Where AI goes wrong:</b> assistants jump to "train a neural network" when a simple threshold or logistic regression would do. They also happily suggest unsupervised clustering without checking whether the clusters mean anything.</p>
  <p><b>What you must still own:</b> getting the labels right. Bad or biased labels silently cap the quality of every model built on them.</p>`,
  problems: [{
    title: 'Pick the Learning Type', level: 'Easy', tags: ['supervised', 'unsupervised', 'RL'],
    statement: `<p>For each, name the learning type and the "label" or "reward": (1) Predict whether a loan will default, using 10 years of past loans with outcomes. (2) Group 50,000 shoppers into segments without any predefined groups. (3) Train a warehouse robot to stack boxes where it scores +1 per stable stack.</p>`,
    constraints: `One type per scenario plus one sentence on the feedback signal.`,
    example: `<p>"Detect cats in photos using 100k photos tagged cat/not cat" → ${H.c('g', 'supervised')}, label = the cat tag.</p>`,
    brute: { why: `<p>Weak answer: "use deep learning for all three". It ignores what feedback exists, which is the real question.</p>` },
    mcq: { q: 'You have lots of user clicks but no ground truth for "good" content. Which is the best first approach?', options: ['Supervised classification', 'Clustering or self-supervised learning', 'Do nothing'], answer: 1, explain: 'No labels means unsupervised or self-supervised methods; or create labels first.' },
    hints: [`<p>Hint 1: are there correct answers attached to the data?</p>`, `<p>Hint 2: is there an agent acting and receiving a score?</p>`, `<p>Hint 3: (1) labels exist, (2) none, (3) reward signal.</p>`],
    solution: {
      approach: `<p>(1) <b>Supervised classification</b>: label = defaulted yes/no, features = income, history and so on. (2) <b>Unsupervised clustering</b> (for example k-means): no labels, you inspect segments afterwards and name them. (3) <b>Reinforcement learning</b>: the robot is the agent, stacking is the action, +1 per stable stack is the reward; it must balance exploring new grips with exploiting known good ones. The question to ask in every case: what feedback does the learner get?</p>`,
      complexity: `<p>Not applicable - this is a reasoning answer, not an algorithm.</p>`
    }
  }]
});

topics.push({
  title: 'What a Model Is, Training vs Inference',
  analogy: `<p>A model is like a <b>recipe card with adjustable dials</b>. <b>Training</b> is the long kitchen session where a chef tastes thousands of dishes and turns the dials until the food is right. <b>Inference</b> is a busy evening service: the dials are frozen, and you just cook one order after another, fast. Training happens rarely and costs a lot; inference happens all day.</p>`,
  explain: `<p>A <b>model</b> is two things stuck together: a <b>shape</b> (the maths: for example <code>y = w·x + b</code>, or a transformer) and a pile of numbers called <b>parameters</b> (or <b>weights</b>: the w and b). The shape is chosen by engineers. The numbers are found by training. A modern LLM has billions of such numbers saved in a file.</p>
  <h4>Training (learning)</h4>
  <ol><li>Take a batch of examples.</li><li>Run the model to get guesses (the <b>forward pass</b>).</li><li>Compare to the right answers → a <b>loss</b> (a score of how wrong).</li><li>Work out which way to change each weight (<b>backpropagation</b> computes the gradients).</li><li>Nudge the weights (<b>optimizer</b> step). Repeat millions of times.</li></ol>
  <h4>Inference (using)</h4>
  <p>Weights are frozen. A new input goes in, one forward pass happens, an answer comes out. No loss, no learning. When you chat with an assistant, that is inference. The model is <b>not</b> learning from your chat in real time (it only reads it in its context window).</p>
  ${H.table(['', 'Training', 'Inference'], [
    ['Goal', 'Find good weights', 'Use the weights'],
    ['Data', 'Huge labelled or raw dataset', 'One user request'],
    ['Hardware', 'Many GPUs for days or months', 'One or a few GPUs, or even a phone'],
    ['Cost shape', 'Big one-off bill (millions of dollars for frontier LLMs)', 'Small per request, but multiplied by every user, forever'],
    ['Weights change?', '<span class="c-g">Yes</span>', '<span class="c-r">No</span>'],
    ['Speed target', 'Throughput (total hours)', 'Latency (milliseconds to seconds)']
  ])}
  <h4>A real pipeline</h4>
  <p>Data is collected and cleaned → split into train / validation / test → model trained → evaluated → saved as a file (<b>artifact</b>) → deployed behind an API → users call it (inference) → logs are monitored → new data triggers a re-train. Spotting which boxes are training and which are inference is a classic interview question.</p>
  <p><b>Test set:</b> data the model never saw during training, used at the end to check it really learned and did not just memorise.</p>`,
  clues: [
    '"The model is deployed / served / behind an endpoint" → inference',
    '"We retrain nightly / fine-tune / epochs / loss curve" → training',
    '"Latency, p95, tokens per second, cost per 1K tokens" → inference concerns',
    '"GPU cluster for weeks, checkpointing, distributed" → training concerns',
    '"Does the chatbot learn from my conversation?" → no, weights are frozen at inference',
    '"Model drift" → the world changed so the frozen model slowly gets worse; time to retrain'
  ],
  code: { lang: 'python', run: true, title: 'Train once, then infer many times', code: `import json

# ---------- TRAINING (slow, changes weights) ----------
def train(data, steps=200, lr=0.02):
    w, b = 0.0, 0.0
    n = len(data)
    for _ in range(steps):
        dw = sum(2 * (w * x + b - y) * x for x, y in data) / n
        db = sum(2 * (w * x + b - y) for x, y in data) / n
        w -= lr * dw
        b -= lr * db
    return {"w": w, "b": b}

history = [(1, 3), (2, 5), (3, 7), (4, 9)]
weights = train(history)
saved = json.dumps(weights)           # the "model file" you would ship
print("saved model file:", saved)

# ---------- INFERENCE (fast, weights frozen) ----------
loaded = json.loads(saved)            # in production: load once at startup
def predict(x):
    return loaded["w"] * x + loaded["b"]

for x in [5, 10, 100]:
    print("predict", x, "->", round(predict(x), 2))
print("note: predict() never changed w or b")` },
  viz: {
    title: 'Training pipeline vs inference pipeline',
    gen: function () {
      function box(id, label, x, y) { return { id: id, label: label, x: x, y: y, shape: 'box', w: 18 }; }
      var nodes = [
        box('D', 'Raw data', 8, 8), box('C', 'Clean + split', 30, 8), box('T', 'Train (GPUs)', 52, 8), box('E', 'Evaluate', 74, 8), box('M', 'Model file', 90, 8),
        box('U', 'User request', 8, 44), box('A', 'API server', 36, 44), box('P', 'Model (frozen)', 62, 44), box('R', 'Answer', 90, 44)
      ];
      var edges = [['D', 'C'], ['C', 'T'], ['T', 'E'], ['E', 'M'], ['M', 'P', 'load'], ['U', 'A'], ['A', 'P'], ['P', 'R']];
      function f(narr, hl, ehl) { return { narr: narr, parts: [{ type: 'graph', label: 'Top row: training (offline). Bottom row: inference (online).', directed: true, height: 56, nodes: nodes, edges: edges, hl: hl, ehl: ehl }] }; }
      return [
        f('<b>Training</b> starts with raw data: logs, documents, labelled examples.', { D: 'cur' }, {}),
        f('Clean it and split into <b>train / validation / test</b> sets.', { C: 'cur' }, { 'D-C': 'ok' }),
        f('Training loop: forward pass, loss, backprop, update weights. Slow and GPU-hungry. <span class="c-r">Weights change here.</span>', { T: 'cur' }, { 'C-T': 'ok' }),
        f('Evaluate on the held-out test set. If good enough, ship; if not, go back.', { E: 'cur' }, { 'T-E': 'ok' }),
        f('The result is just a <b>file of numbers</b> (weights). Training is now over.', { M: 'sel' }, { 'E-M': 'ok' }),
        f('Deployment: the serving process <b>loads</b> the file into memory.', { M: 'sel', P: 'cur' }, { 'M-P': 'ok' }),
        f('<b>Inference</b>: a user sends a request to the API.', { U: 'cur' }, {}),
        f('The API passes the input to the frozen model.', { A: 'cur', P: 'cur' }, { 'U-A': 'ok', 'A-P': 'ok' }),
        f('One forward pass later, an answer returns. <span class="c-g">Weights did not change.</span> Thousands of users repeat this path all day.', { P: 'ok', R: 'ok' }, { 'U-A': 'ok', 'A-P': 'ok', 'P-R': 'ok' })
      ];
    }
  },
  examples: [
    { title: 'Spot training vs inference', html: `<p>Pipeline: (a) nightly job reads yesterday's orders and updates the fraud model; (b) checkout calls <code>/score</code> and gets 0.93 risk in 20 ms; (c) dashboard watches how many scores are above 0.9. <b>(a) training</b>, <b>(b) inference</b>, <b>(c) monitoring</b>, which feeds the next training decision.</p>` },
    { title: 'Does ChatGPT learn from me?', html: `<p>During your chat it uses your earlier messages as <i>context</i> (temporary reading material in the prompt). Its weights stay frozen. Some providers may later use conversations to improve future versions if your settings allow, but that is a separate offline training step, not live learning.</p>` },
    { title: 'Parameters vs hyperparameters', html: `<p><b>Parameters</b> (weights) are learned by training. <b>Hyperparameters</b> (learning rate, number of layers, batch size) are set by you before training. Dials the model turns vs dials the engineer turns.</p>` },
    { title: 'Why inference cost dominates', html: `<p>Training a model might cost a few million dollars once. Serving 50 million users every day costs money every second. For many companies inference is the bigger bill, which is why they shrink, cache and quantise models.</p>` }
  ],
  deepDive: `<p><b>Memory maths.</b> A model with 7 billion parameters stored as 16-bit numbers needs about 7B × 2 bytes ≈ 14 GB just to hold the weights. Training needs far more (gradients, optimizer state and activations can add several times more), which is why training needs clusters but a quantised 7B model can run on a laptop.</p>
  <p><b>Batching and latency.</b> Inference engines batch many requests together on one GPU to use it fully, trading a little latency for much better throughput. LLM inference has two phases: <b>prefill</b> (read the whole prompt at once, compute-bound) and <b>decode</b> (generate one token at a time, memory-bound). Techniques such as KV-cache, speculative decoding and continuous batching target these.</p>
  <p><b>Overfitting.</b> If training runs too long on too little data, the model memorises it: great training score, poor test score. That is why you keep a separate validation set to stop early.</p>
  <p><b>Training-serving skew.</b> A classic production bug: features computed one way in training (a Python notebook) and another way in the live service (a Java service), so the model sees different inputs than it learned from. Fix with shared feature code or a feature store.</p>
  <p><b>Drift.</b> <i>Data drift</i> (inputs change: new product categories) and <i>concept drift</i> (the relationship changes: what counts as fraud) require monitoring and scheduled retraining.</p>`,
  aiEra: `<p><b>What AI changes:</b> with hosted LLMs, most teams only do inference — they call someone else's trained model. Your engineering work becomes everything around it: prompts, retrieval, caching, latency budgets, cost per request, logging and evaluation.</p>
  <p><b>Use AI as a partner:</b> ask an assistant to draw the training vs serving pipeline for your product and list what could go wrong in each stage (skew, drift, stale index). Then verify against how your system really works.</p>
  <p><b>Where AI goes wrong:</b> assistants may say "the model will learn from user feedback" when the design only stores feedback and nothing retrains. Check that a feedback loop actually exists in code.</p>
  <p><b>What you must still own:</b> cost and latency numbers, data privacy (what leaves your boundary at inference time), and the decision of when a model is good enough to ship.</p>`,
  problems: [{
    title: 'Label the Pipeline', level: 'Easy', tags: ['training', 'inference', 'MLOps'],
    statement: `<p>A food-delivery app predicts delivery time. Steps: (1) export last month's deliveries; (2) fit a regression model; (3) save it to storage; (4) the app calls the model when a customer opens the cart; (5) a dashboard compares predicted vs actual times; (6) when error grows, step 2 runs again. Mark each step as training, inference or monitoring.</p>`,
    constraints: `Say which steps change the weights.`,
    example: `<p>"Load model file and score one order" → ${H.c('g', 'inference')}, weights unchanged.</p>`,
    brute: { why: `<p>Weak answer: calling everything "the model". It hides that training and serving have very different cost, latency and hardware needs.</p>` },
    mcq: { q: 'Which statement about inference is true?', options: ['It updates weights using the new request', 'It uses frozen weights for one forward pass', 'It needs the full training set'], answer: 1, explain: 'Inference only runs the already-trained model forward.' },
    hints: [`<p>Hint 1: which step could be done offline overnight?</p>`, `<p>Hint 2: which step must answer in milliseconds?</p>`, `<p>Hint 3: only fitting changes weights; step 6 triggers training again.</p>`],
    solution: {
      approach: `<p>Steps 1, 2 and 3 are <b>training</b> (data prep, fitting, saving the artifact) and step 2 is the only one that changes the weights. Step 4 is <b>inference</b>: load the file, one forward pass per request, weights frozen, latency matters. Step 5 is <b>monitoring</b>, which watches for drift. Step 6 closes the loop by triggering retraining. Mention that skew between step 1's features and step 4's live features is the classic bug to guard against.</p>`,
      complexity: `<p>Not applicable - this is a reasoning answer, not an algorithm.</p>`
    }
  }]
});

topics.push({
  title: 'What Generative AI Does: Predict the Next Piece, Again and Again',
  analogy: `<p>Your phone keyboard suggests the next word. Now imagine that autocomplete was trained on a huge slice of the internet and you let it keep choosing the next word, then the next, until a whole essay appears. That is a <b>language model</b>. It does not look up a stored answer; it <b>builds one word at a time</b> from probabilities.</p>`,
  explain: `<p><b>Discriminative</b> AI answers "which label is this?" (spam or not). <b>Generative</b> AI answers "what would a plausible new example look like?" and then produces one.</p>
  <h4>How a text model generates</h4>
  <ol><li>Break text into small pieces called <b>tokens</b> (a word or part of a word).</li><li>Given the tokens so far, the model outputs a <b>probability for every possible next token</b>.</li><li><b>Sample</b> one token from those probabilities (not always the top one).</li><li>Append it and repeat until a stop token.</li></ol>
  <p>Example: after "The cat sat on the" the model might say: mat 55%, sofa 20%, floor 15%, roof 7%, moon 3%. Picking randomly in proportion gives variety: the same prompt can produce different answers.</p>
  ${H.table(['Next word', 'Probability'], [['mat', '0.55'], ['sofa', '0.20'], ['floor', '0.15'], ['roof', '0.07'], ['moon', '0.03']])}
  <h4>The temperature dial</h4>
  <p><b>Temperature</b> controls how adventurous the pick is. Low (near 0) → almost always the top word: safe, repetitive. High → flatter odds, more surprising, more mistakes. For code and facts use low; for brainstorming use higher.</p>
  <h4>Other kinds of GenAI</h4>
  <ul><li><b>Image / video / audio</b>: often <b>diffusion</b> models, which start from pure noise and remove noise step by step until a picture matching your text appears.</li><li><b>Multimodal</b> models accept and produce several kinds of data (text + image + audio).</li><li><b>Code models</b> are language models trained heavily on code.</li></ul>
  <p>The big surprise of the 2020s: if you make this simple next-token game big enough (data, compute, parameters), the model also learns grammar, facts, translation, reasoning patterns and coding. Those skills <b>emerge</b> because predicting text well requires modelling the world that produced the text.</p>
  <p>Below, a tiny <b>bigram</b> model (look only at the previous word) shows the same idea in 20 lines of Python.</p>`,
  clues: [
    '"Generate, draft, summarize, rewrite, translate, create an image" → generative model',
    '"Different answer each time" → sampling with temperature &gt; 0',
    '"Same input must give same output" → temperature 0 / greedy decoding (and still check provider guarantees)',
    '"Why does it write fluent text but get facts wrong?" → it predicts plausible words, not verified truth',
    '"Context window / max tokens" → the limit on how much text the model can read and write at once',
    '"Image from text, noise removed in steps" → diffusion model'
  ],
  code: { lang: 'python', run: true, title: 'A tiny generative model: bigram text generator', code: `import random
random.seed(3)    # fixed seed => repeatable demo

corpus = ("the cat sat on the mat . the cat ate the fish . "
          "the dog sat on the rug . the dog ate the bone .").split()

# TRAINING: count which word follows which word.
follow = {}
for a, b in zip(corpus, corpus[1:]):
    follow.setdefault(a, {})
    follow[a][b] = follow[a].get(b, 0) + 1

def probs(word):
    counts = follow[word]
    total = sum(counts.values())
    return {w: c / total for w, c in counts.items()}

print("after 'the':", {w: round(p, 2) for w, p in probs("the").items()})

# INFERENCE: sample the next word from those probabilities, again and again.
def generate(start, n=8, temperature=1.0):
    out = [start]
    for _ in range(n):
        p = probs(out[-1]) if out[-1] in follow else None
        if not p:
            break
        # temperature: raise probabilities to 1/T, then renormalise
        weights = [pr ** (1.0 / temperature) for pr in p.values()]
        out.append(random.choices(list(p.keys()), weights=weights)[0])
    return " ".join(out)

for t in (0.2, 1.0, 2.0):
    print("T =", t, "->", generate("the", temperature=t))
print("A real LLM does this with tokens, billions of weights and a long context instead of 1 previous word.")` },
  viz: {
    title: 'Next-word probabilities and sampling',
    input: 'the cat sat on the mat the cat ate the fish the dog sat on the rug the dog ate the bone',
    inputLabel: 'Training text (words separated by spaces, max 60 words)',
    gen: function (input) {
      var ws = String(input).trim().toLowerCase().split(/\s+/);
      if (ws.length < 4 || ws.length > 60) throw new Error('Enter between 4 and 60 words');
      var follow = {};
      for (var i = 0; i + 1 < ws.length; i++) { follow[ws[i]] = follow[ws[i]] || {}; follow[ws[i]][ws[i + 1]] = (follow[ws[i]][ws[i + 1]] || 0) + 1; }
      var seed = 42; function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
      var cur = ws[0], out = [cur], frames = [];
      frames.push({ narr: 'Training is just counting: for each word, how often does each other word come right after it? Start the story with <b>' + cur + '</b>.', parts: [{ type: 'array', label: 'Generated so far', values: out.slice() }] });
      for (var s = 0; s < 6; s++) {
        var f = follow[cur]; if (!f) { frames.push({ narr: '<b>' + cur + '</b> was never followed by anything in the training text, so generation stops.', parts: [{ type: 'array', label: 'Generated', values: out.slice() }] }); break; }
        var keys = Object.keys(f), tot = 0; keys.forEach(function (k) { tot += f[k]; });
        var probs = keys.map(function (k) { return Math.round(f[k] / tot * 100) / 100; });
        frames.push({ narr: 'The model looks at <b>' + cur + '</b> and lists every possible next word with its probability.', parts: [{ type: 'bars', label: 'P(next word | ' + cur + ')', values: probs, idxLabels: keys, texts: probs.map(String) }, { type: 'array', label: 'Generated so far', values: out.slice() }] });
        var r = rnd(), acc = 0, pick = keys[keys.length - 1], pi = keys.length - 1;
        for (var k = 0; k < keys.length; k++) { acc += f[keys[k]] / tot; if (r < acc) { pick = keys[k]; pi = k; break; } }
        var hl = {}; hl[pi] = 'ok';
        frames.push({ narr: 'Roll a dice (random number ' + Math.round(r * 100) / 100 + '). It lands on <b>' + pick + '</b>. Likely words win more often, but unlikely ones can still be picked - that is why answers vary.', parts: [{ type: 'bars', label: 'P(next word | ' + cur + ')', values: probs, idxLabels: keys, hl: hl, texts: probs.map(String) }] });
        out.push(pick); cur = pick;
      }
      frames.push({ narr: 'Final generated text: <b>' + out.join(' ') + '</b>. It is new, never copied as a whole, yet built only from learned counts.', parts: [{ type: 'array', label: 'Output', values: out.slice() }] });
      return frames;
    }
  },
  examples: [
    { title: 'Same prompt, different answers', html: `<p>Ask "Give me a name for a coffee shop" three times: with temperature 1 you get three different names, because each token was sampled. With temperature 0 you usually get the same one each time. Neither is "wrong"; they serve different goals.</p>` },
    { title: 'Why text models are bad at counting letters', html: `<p>The model sees tokens, not letters. "strawberry" may arrive as two or three chunks, so asking "how many r's?" asks about something it cannot directly see. Good products let the model call a tiny code tool for such tasks.</p>` },
    { title: 'What diffusion does', html: `<p>Training: take real photos, add noise little by little, teach a network to undo one noise step. Generating: start from pure random noise and apply the undo step 20 to 50 times, steered by your text prompt, until a clean image remains.</p>` }
  ],
  deepDive: `<p><b>Bigram to transformer.</b> The bigram table has one number per word pair and sees only 1 word of context. A transformer replaces the table with a neural network that can look at thousands of previous tokens at once (using <i>attention</i>) and compute the next-token distribution from a learned, compressed representation. The loop (predict, sample, append) is identical.</p>
  <p><b>Sampling knobs.</b> <i>Temperature</i> rescales probabilities. <i>Top-k</i> keeps only the k most likely tokens. <i>Top-p</i> (nucleus) keeps the smallest set whose probabilities add to p (like 0.9). <i>Greedy</i> always takes the top token. Even at temperature 0, large-scale serving can show tiny non-determinism (floating-point order, batching), so do not promise bit-exact repeatability.</p>
  <p><b>Three training stages for chat models.</b> (1) <i>Pre-training</i>: next-token prediction on huge text (self-supervised). (2) <i>Instruction tuning</i>: show examples of good question/answer pairs. (3) <i>Preference tuning</i> (RLHF, DPO and similar): humans or AI rank answers so the model prefers helpful, safe ones. Pre-training makes it knowledgeable; the later stages make it behave like an assistant.</p>
  <p><b>Cost of generation.</b> Output tokens are produced one at a time, so long answers are slow and cost more. Providers bill per input and output token. Design prompts and outputs to be as short as the task allows.</p>`,
  aiEra: `<p><b>What AI changes:</b> a model that continues text can be steered with plain-language instructions, so "programming" now includes writing clear instructions and examples. Many features that once needed a custom ML team become an API call plus good evaluation.</p>
  <p><b>Use AI as a partner:</b> try the same prompt at low and high temperature and compare. This is the fastest way to build real intuition for sampling.</p>
  <p><b>Where AI goes wrong:</b> because output is fluent, mistakes look confident. Also, models can mimic style without understanding: a polished explanation of a wrong idea is still wrong.</p>
  <p><b>What you must still own:</b> deciding which parts of a feature are allowed to be probabilistic. Money movement, permissions and legal text need deterministic code or a human check around the generator.</p>`,
  problems: [{
    title: 'Predict the Next Word Table', level: 'Medium', tags: ['generative', 'sampling', 'bigram'],
    statement: `<p>Training text: <code>I like tea . I like coffee . I like tea .</code> (words split by spaces, the dot is a word). (a) What are the probabilities of the word after <b>like</b>? (b) With greedy decoding starting from <b>I</b>, what does the model write for 4 more words? (c) What would raising the temperature change?</p>`,
    constraints: `Treat the dot as a normal word. Use only the previous word as context.`,
    example: `<p>Pairs after "like": tea ×2, coffee ×1 → ${H.c('g', 'P(tea)=0.67, P(coffee)=0.33')}.</p>`,
    brute: { why: `<p>Weak answer: "it knows I like tea". The model stores no opinions, only counts of what followed what.</p>` },
    mcq: { q: 'Raising the temperature makes the model…', options: ['More random and varied', 'More accurate', 'Faster'], answer: 0, explain: 'It flattens probabilities, so less-likely words get picked more often. It does not add accuracy.' },
    hints: [`<p>Hint 1: count the words that directly follow "like".</p>`, `<p>Hint 2: greedy = always take the largest probability.</p>`, `<p>Hint 3: after "tea" comes "." then "I" then "like"; track each step.</p>`],
    solution: {
      approach: `<p>(a) After "like": tea appears twice, coffee once, so P(tea)=2/3≈0.67 and P(coffee)=1/3≈0.33. (b) Greedy from "I": I → like (only choice) → tea (higher probability) → "." → I. Output: <code>I like tea . I</code>. (c) Higher temperature flattens the odds toward 50/50, so "coffee" would be chosen more often; lower temperature makes "tea" nearly certain. The same machinery in a real LLM produces varied, fluent text; the model stores statistics, not beliefs.</p>`,
      complexity: `<p>Counting is O(N) over the text; each generation step is O(vocabulary).</p>`
    }
  }]
});

topics.push({
  title: 'Limits, Hallucinations, Myths and When NOT to Use ML',
  analogy: `<p>A modern LLM is like a <b>brilliant, confident improv actor who has read half the internet</b>. Ask anything and they will give a smooth, convincing answer — and when they do not know, they keep improvising in the same smooth voice instead of saying "I am not sure". The skill is real; so is the risk.</p>`,
  explain: `<h4>Why LLMs hallucinate</h4>
  <p>A <b>hallucination</b> is a fluent answer that is false or made up (a fake citation, an API function that does not exist). It happens because:</p>
  <ol><li>The model is trained to produce the <b>most plausible next token</b>, not the most <i>true</i> one. Plausible and true often overlap, but not always.</li><li>It has <b>no built-in "I don't know" check</b>. Training data rarely contains honest admissions of ignorance, and style rewards confident answers.</li><li>Its knowledge is <b>compressed and frozen</b> at a cutoff date. Rare facts are blurry; new facts are missing.</li><li>Once it writes a wrong token, the next tokens are conditioned on that mistake and the error snowballs.</li><li>Vague or leading prompts push it to fill gaps.</li></ol>
  <p>Reduce it with: giving the model the facts (RAG, pasted docs), asking for citations then checking them, letting it use tools (calculator, search, code runner), lower temperature, and verification steps. You reduce it; you do not remove it.</p>
  <h4>Other real limits</h4>
  <ul><li><b>Bias</b>: models mirror their data, including its stereotypes.</li><li><b>Context window</b>: it can only read so much at once and may miss details buried in the middle of very long inputs.</li><li><b>Reasoning gaps</b>: strong at patterns, can fail on novel multi-step logic or exact arithmetic.</li><li><b>No true understanding of your world</b>: no memory between chats unless the product adds it; no access to your systems unless connected.</li><li><b>Cost, latency, privacy</b>: every call costs money and sends data somewhere.</li><li><b>Non-determinism</b>: hard to unit test the old way.</li></ul>
  <h4>Myths, debunked</h4>
  ${H.table(['Myth', 'Reality'], [
    ['"AI understands like a human."', 'It models statistical patterns in data. It can look like understanding, but it has no experiences or goals of its own.'],
    ['"AI is always objective."', 'Trained on human data, it inherits human bias. Garbage in, garbage out.'],
    ['"More data always fixes it."', 'Bad or biased data scales the problem. Quality and coverage matter more.'],
    ['"The model learns from my chat live."', 'Weights are frozen at inference; it only reads your context window.'],
    ['"If it sounds confident, it is right."', 'Confidence in tone is not calibrated to correctness.'],
    ['"AI will replace all programmers next year."', 'It automates tasks, not whole responsibilities. Demand shifts toward people who can specify, verify and own systems.'],
    ['"We should add AI to everything."', 'Many problems are solved better by simple rules, SQL or a lookup table.']
  ])}
  <h4>ML or rules? A quick decision guide</h4>
  <p>Use <b>plain rules</b> when the logic is clear, stable, must be exact and explainable (tax calculation, permissions, validation). Use <b>ML</b> when the pattern is too fuzzy or too big to write down but you have lots of example data (spam, image recognition, recommendations). Use <b>GenAI</b> when the output is open-ended language or content and a human or check can review it.</p>`,
  clues: [
    '"Must be 100% correct / auditable / legally exact" → rules or deterministic code, with AI only assisting',
    '"We have no data / only 50 examples" → rules or an LLM with few-shot prompts, not custom ML',
    '"Pattern too complex to write as if/else, lots of labelled history" → classic ML',
    '"The answer cites a paper that does not exist" → hallucination; add retrieval and verification',
    '"Users complain it sounds sure but is wrong" → calibration, grounding and "I don\'t know" behaviours',
    '"Same input should always give same output" → avoid sampling, or avoid LLMs for that step'
  ],
  code: { lang: 'python', run: true, title: 'Plausible is not the same as true', code: `# A toy "model" that scores answers by how often words co-occur in its
# training text. It has no idea what is TRUE, only what is COMMON.
training_text = [
    "sydney is the largest city in australia",
    "sydney is famous for its opera house",
    "melbourne is the second largest city in australia",
    "canberra is the capital of australia",
    "sydney sydney sydney harbour australia",
    "people often say the capital of australia is sydney",
]

def plausibility(answer):
    # how often does the answer word appear in the same sentence as 'australia'?
    return sum(answer in s.split() and "australia" in s.split() for s in training_text)

candidates = ["sydney", "melbourne", "canberra"]
for c in candidates:
    print(c, "plausibility score:", plausibility(c))

best = max(candidates, key=plausibility)
print("model's confident answer:", best)
print("true capital: canberra  -> the most COMMON answer is not the most CORRECT one")
print("Fix: ground the model with a trusted source (retrieval) and verify.")` },
  viz: [
    {
      title: 'Why a hallucination happens: plausible beats true',
      input: '0.45 0.35 0.15 0.05',
      inputLabel: 'Model probabilities for Sydney, Canberra, Melbourne, Perth',
      gen: function (input) {
        var p = String(input).trim().split(/[\s,]+/).map(Number);
        if (p.length !== 4 || p.some(function (v) { return isNaN(v) || v < 0; })) throw new Error('Enter 4 non-negative numbers');
        var tot = p.reduce(function (a, b) { return a + b; }, 0); if (tot <= 0) throw new Error('Numbers must add to more than 0');
        p = p.map(function (v) { return Math.round(v / tot * 100) / 100; });
        var names = ['Sydney', 'Canberra', 'Melbourne', 'Perth'];
        var top = p.indexOf(Math.max.apply(null, p));
        var hl0 = {}; hl0[top] = 'cur';
        var hl1 = {}; hl1[top] = top === 1 ? 'ok' : 'bad'; hl1[1] = 'sel';
        return [
          { narr: 'Prompt: <b>"The capital of Australia is ..."</b>. The model must pick a next token.', parts: [{ type: 'text', html: 'Fact check in the real world: the capital is <b>Canberra</b>.' }] },
          { narr: 'The model produces a probability for each candidate. These come from patterns in text, not from a fact database.', parts: [{ type: 'bars', label: 'P(next token)', values: p, idxLabels: names, texts: p.map(String) }] },
          { narr: 'Greedy decoding picks the highest bar: <b>' + names[top] + '</b>.', parts: [{ type: 'bars', label: 'P(next token)', values: p, idxLabels: names, hl: hl0, texts: p.map(String) }] },
          { narr: top === 1 ? '<span class="c-g">Here the most likely word is also true. Plausible and true overlapped.</span>' : '<span class="c-r">Hallucination: ' + names[top] + ' is the most <i>common</i> association (big, famous city), but the true answer, purple, has a lower probability.</span> Sampling at high temperature could also pick a wrong name by chance.', parts: [{ type: 'bars', label: 'Red = chosen, purple = true answer', values: p, idxLabels: names, hl: hl1, texts: p.map(String) }] },
          { narr: 'Fix: <b>ground</b> the model. Put a trusted sentence in the prompt ("Official source: capital = Canberra") and the right token becomes overwhelmingly likely. That is the idea of RAG.', parts: [{ type: 'bars', label: 'After grounding with a trusted source', values: [0.02, 0.96, 0.01, 0.01], idxLabels: names, hl: { 1: 'ok' }, texts: ['0.02', '0.96', '0.01', '0.01'] }] }
        ];
      }
    },
    {
      title: 'Rules, ML or GenAI? Decision walk-through',
      input: 'tax',
      inputLabel: 'Problem: tax, spam or email',
      gen: function (input) {
        var key = String(input).trim().toLowerCase();
        var cases = {
          tax: ['Calculate sales tax on an order', 'Yes - exact formula', 'Not needed', 'Not needed', 'RULES (plain code)'],
          spam: ['Detect spam mail', 'No - spammers keep changing', 'Yes - millions of labelled mails', 'Not needed', 'CLASSIC ML'],
          email: ['Draft a polite reply to a customer', 'No - open-ended language', 'No labels for "good reply"', 'Yes - generate, human reviews', 'GENAI + human review']
        };
        var c = cases[key]; if (!c) throw new Error('Type one of: tax, spam, email');
        var rows = [['Can a human write exact rules?', c[1]], ['Do we have lots of labelled data?', c[2]], ['Is the output open-ended content?', c[3]]];
        var frames = [{ narr: 'Problem: <b>' + c[0] + '</b>. Ask three questions in order.', parts: [{ type: 'table', label: 'Decision table', columns: ['Question', 'Answer'], rows: [] }] }];
        for (var i = 0; i < 3; i++) frames.push({ narr: 'Question ' + (i + 1) + ': ' + rows[i][0] + ' &rarr; <b>' + rows[i][1] + '</b>', parts: [{ type: 'table', label: 'Decision table', columns: ['Question', 'Answer'], rows: rows.slice(0, i + 1), hl: (function () { var h = {}; h[i] = 'cur'; return h; })() }] });
        frames.push({ narr: 'Decision: <b>' + c[4] + '</b>. Always start with the simplest tool that can do the job.', parts: [{ type: 'table', label: 'Decision table', columns: ['Question', 'Answer'], rows: rows, hl: { 0: 'done', 1: 'done', 2: 'done' } }, { type: 'vars', vals: { choice: c[4] }, hl: { choice: 'ok' } }] });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Debunk: "the AI looked it up"', html: `<p>A plain LLM has no internet or database unless the product connects one. When it quotes a "court case" it may be generating something that <i>looks</i> like a case citation. Real incidents have involved lawyers submitting fake AI-written citations. Rule: <b>verify anything that matters</b>.</p>` },
    { title: 'Pick ML vs rules: refund approval', html: `<p>"Refunds under $20 are auto-approved" is a clear business rule → <b>rules</b>. "Which refund requests look fraudulent?" is fuzzy with historical examples → <b>ML</b>. "Write the apology email" → <b>GenAI</b>. One feature, three different tools; good engineers combine them.</p>` },
    { title: 'Bias example', html: `<p>A hiring model trained on past hires from a mostly male team may learn "male-sounding names score higher". Nobody coded that; the data did. Fix: audit outcomes by group, rebalance data, remove proxy features, keep a human in the loop.</p>` }
  ],
  deepDive: `<p><b>Why "I don't know" is hard.</b> The training objective rewards matching text. Benchmarks that only score correct answers (not "abstained") also nudge models to guess. Newer training adds explicit rewards for abstaining when unsure, and calibration research tries to make stated confidence match accuracy, but no model is perfectly calibrated.</p>
  <p><b>Types of hallucination.</b> <i>Intrinsic</i>: contradicts the source you gave it (summary says the opposite of the document). <i>Extrinsic</i>: adds facts that are not in any source. Measuring them needs different tests: faithfulness checks against provided context vs factuality checks against the world.</p>
  <p><b>Mitigation stack, cheapest first:</b> clearer prompt and "answer only from the text below"; lower temperature; retrieval of trusted documents; structured output so you can validate it; tool use for maths, dates and lookups; a second model or code check; human review for high-stakes cases; and evals that track the hallucination rate over time.</p>
  <p><b>When classic ML or rules beat LLMs.</b> Latency under 10 ms, cost under a fraction of a cent per call, strict reproducibility, tabular data (gradient-boosted trees often beat neural nets here), or when the logic is simply known. A simple baseline also tells you whether the fancy model is worth it.</p>
  <p><b>Environmental and legal angle.</b> Large training runs use significant energy. Copyright, privacy law (GDPR) and emerging AI regulation (for example the EU AI Act) affect what data you may use and what you must disclose. Check your company policy and local law rather than assuming.</p>`,
  aiEra: `<p><b>What AI changes:</b> your job shifts from "write every line" toward "specify, supervise and verify". Knowing the limits tells you where to trust the assistant and where to slow down and check.</p>
  <p><b>Use AI as a partner:</b> ask it to <i>argue against its own answer</i>, to list assumptions, or to say what evidence would prove it wrong. Self-critique prompts catch some errors (not all).</p>
  <p><b>Where AI goes wrong:</b> invented libraries, wrong version numbers, plausible but off-by-one code, fake sources, and over-confident tone. It can also agree with a wrong claim in your question ("sycophancy").</p>
  <p><b>What you must still own:</b> accountability. If AI-written code or text ships and causes harm, the responsible party is the human or team that shipped it. Build habits: run the code, read the diff, check the source, and keep sensitive data out of tools your company has not approved.</p>`,
  problems: [{
    title: 'Explain a Hallucination to a Manager', level: 'Medium', tags: ['hallucination', 'communication'],
    statement: `<p>Your support chatbot told a customer that your company offers a "90-day price match" that does not exist. Your manager asks: "Why did it lie, and can we stop it for good?" Write a clear answer and a mitigation plan.</p>`,
    constraints: `Plain words, no jargon without explanation. Include what you cannot promise.`,
    example: `<p>${H.c('g', 'Good opening')}: "It did not lie on purpose; it predicted a likely-sounding sentence without checking our policy."</p>`,
    brute: { why: `<p>Weak answer: "the AI is buggy, we will fix it" or "we will tell it to never hallucinate". A prompt line cannot guarantee truth, and promising a full fix sets false expectations.</p>` },
    mcq: { q: 'Best first mitigation for company-policy questions?', options: ['Raise the temperature', 'Ground answers in the real policy documents and cite them', 'Make the model larger only'], answer: 1, explain: 'Retrieval of trusted documents gives the model facts to copy instead of guess.' },
    hints: [`<p>Hint 1: the model predicts plausible text, it does not look up truth.</p>`, `<p>Hint 2: give it your real policy at answer time.</p>`, `<p>Hint 3: add checks, a fallback to a human, and monitoring; be honest that risk drops but never reaches zero.</p>`],
    solution: {
      approach: `<p><b>Why:</b> the chatbot is a text predictor. Price-match promises are common in retail text, so a "90-day price match" sounded plausible and it had no check against our actual policy. It was not lying; it was improvising confidently. <b>Plan:</b> (1) ground it: retrieve the current policy pages and instruct it to answer only from them and cite the source; (2) when no source matches, answer "I don't know, let me connect you to a person"; (3) validate risky claims (prices, refunds, deadlines) with deterministic code or templates; (4) log conversations, sample-review them weekly and keep a test set of policy questions; (5) add a human handoff. <b>Honest limit:</b> this cuts the error rate sharply but cannot reach zero, so high-stakes answers need a rule or human step.</p>`,
      complexity: `<p>Not applicable - this is a reasoning answer, not an algorithm.</p>`
    }
  }]
});

function P(title, level, tags, statement, example, bruteWhy, mcq, hints, approach, extra) {
  var o = {
    title: title, level: level, tags: tags,
    statement: '<p>' + statement + '</p>',
    constraints: 'Answer in plain English. Show your reasoning, not just the label.',
    example: '<p>' + example + '</p>',
    brute: { why: '<p>' + bruteWhy + '</p>' },
    mcq: mcq,
    hints: hints.map(function (h, i) { return '<p>Hint ' + (i + 1) + ': ' + h + '</p>'; }),
    solution: { approach: '<p>' + approach + '</p>', complexity: '<p>Not applicable - this is a reasoning answer.</p>' }
  };
  if (extra && extra.code) { o.solution.code = extra.code; }
  practice.push(o);
}

P('Classify Five Real Products', 'Easy', ['learning types'],
  'Give the learning type (supervised, unsupervised, reinforcement, self-supervised) for: (1) Gmail spam filter, (2) grouping news articles by topic with no tags, (3) a robot dog learning to walk, (4) an LLM learning from raw web text, (5) predicting a used car price from past sales.',
  'Face unlock trained on photos labelled with identities = supervised.',
  'Weak: labelling everything "machine learning". That is true but skips the one thing an interviewer wants: what feedback does the learner get?',
  { q: 'Which has NO labels and finds structure by itself?', options: ['Regression', 'Clustering', 'Classification'], answer: 1, explain: 'Clustering is unsupervised.' },
  ['ask whether correct answers are attached to the data', 'rewards after actions mean reinforcement', 'self-supervised creates its own labels by hiding part of the data'],
  '(1) Supervised classification: users marked mail as spam, so labels exist. (2) Unsupervised clustering: no tags, the model groups similar articles. (3) Reinforcement learning: the robot acts, gets reward for moving forward and not falling. (4) Self-supervised: the label is the next word, taken from the text itself. (5) Supervised regression: the label is the sale price, a number. The method for any new example is to name the data, then the feedback signal, then whether the output is a category or a number.');

P('Training or Inference?', 'Easy', ['training', 'inference'],
  'For each event say training or inference: (a) a GPU cluster runs for 3 weeks reducing a loss curve; (b) a user asks a chatbot for a recipe; (c) loading a saved model file at server startup; (d) fine-tuning on 5,000 support tickets; (e) classifying a photo on your phone.',
  '"Phone unlocks with your face in 100 ms" is inference.',
  'Weak: "both are just running the model". They differ in goal, hardware, cost and whether weights change.',
  { q: 'Which step changes the model weights?', options: ['Inference', 'Training', 'Caching'], answer: 1, explain: 'Only training updates the weights.' },
  ['look for a loss, epochs or gradient: that is training', 'look for a single request and a fast response: inference', 'loading a file does not change numbers'],
  '(a) Training: long run, loss curve, weights change. (b) Inference: one request, frozen weights. (c) Neither strictly, but it is part of the serving path that leads to inference: loading just reads weights. (d) Training (fine-tuning is still training, only smaller). (e) Inference, on-device. Give the rule: if the weights change it is training; if the weights are only read to produce an answer it is inference. Mention cost: training is a big one-off bill, inference is a small cost repeated for every user.');

P('Spot the Myth', 'Easy', ['myths'],
  'Which statements are myths? Correct each one. (1) "ChatGPT learns from me during our chat." (2) "If an AI sounds sure, it is correct." (3) "AI, ML and deep learning are three separate things."',
  'Myth: "AI is always objective" - it inherits bias from its data.',
  'Weak: agreeing with all three because they sound reasonable. Each hides a specific misunderstanding.',
  { q: 'AI vs ML vs DL is best described as…', options: ['Three unrelated fields', 'Nested circles: DL inside ML inside AI', 'Synonyms'], answer: 1, explain: 'DL is a kind of ML, which is a kind of AI.' },
  ['think weights frozen at inference', 'tone of voice is not a measure of truth', 'draw circles inside circles and place each term in one'],
  'All three are myths. (1) The weights are frozen during a chat; the model only reads your messages as context, and any later training is a separate offline step. (2) Fluent confident tone is produced by the same next-word machinery whether the content is true or false, so verify important claims. (3) They are nested: deep learning is a type of machine learning, and machine learning is one way of doing AI. Giving the corrected version, not just saying false, shows real understanding.');

P('Draw the Nesting', 'Easy', ['definitions'],
  'Explain to a non-technical friend in under 100 words how AI, ML, deep learning and GenAI relate. Use one analogy.',
  'Nesting dolls: AI is the biggest doll, GenAI the smallest.',
  'Weak: reading four dictionary definitions in a row. A friend will not remember them and cannot see the relationship.',
  { q: 'An LLM is best described as…', options: ['Rule-based AI', 'A deep learning model that generates text', 'A database'], answer: 1, explain: 'LLMs are deep neural networks that predict the next token.' },
  ['pick an analogy first (dolls, circles)', 'order from biggest idea to smallest', 'end with one real product example'],
  'Model answer: "Think of nesting dolls. The biggest is AI: any machine doing something that seems smart. Inside it is machine learning: AI that learns its rules from examples instead of being programmed. Inside that is deep learning: machine learning using big many-layered neural networks. The smallest doll is generative AI, deep learning that creates new text, images or code, like ChatGPT or Claude." That is under 100 words, uses an analogy, moves from big to small and ends with real products.');

P('Rules or ML? Pick for Six Problems', 'Medium', ['decision making', 'ml vs rules'],
  'Choose rules, classic ML or GenAI and justify: (1) validate that a date is real, (2) predict next month demand for 5,000 products, (3) route support tickets into 12 categories with 200k labelled tickets, (4) summarize a 30-page contract for a lawyer, (5) enforce who can see payroll data, (6) recommend articles to readers.',
  '"Compute shipping cost from weight tables" = rules, because the formula is exact and known.',
  'Weak: "use AI for everything modern" - it adds cost, latency and unpredictability where a ten-line function would be exact.',
  { q: 'Access control (who can see payroll) should use…', options: ['An LLM deciding case by case', 'Deterministic rules', 'Clustering'], answer: 1, explain: 'Security decisions must be exact and auditable.' },
  ['ask whether a human can write the exact logic', 'ask whether labelled history exists', 'ask whether the output is open-ended text or a fixed answer'],
  '(1) Rules: calendars are exact. (2) Classic ML (time-series or gradient-boosted trees) because there is history and patterns. (3) Classic ML classification, perhaps a fine-tuned small model, or an LLM with few-shot examples; the 200k labels make a trained classifier cheap and fast. (4) GenAI with human review: open-ended language, and the lawyer verifies. (5) Rules: security must be exact and auditable. (6) ML (recommendation), learned from clicks. The pattern: exact and known → rules; fuzzy with data → ML; open-ended content → GenAI with a safety net.');

P('Hand-Run the Gradient Step', 'Medium', ['supervised', 'gradient descent'],
  'Single data point x=2, y=5. Model: y_hat = w*x with w=0 and learning rate 0.05. Loss = (y_hat - y)^2. Compute loss, the gradient of the loss with respect to w, and the new w after one step.',
  'If w=1 and x=3, y=3 then y_hat=3, loss=0 and the gradient is 0: nothing to learn.',
  'Weak: guessing w by trial and error. Gradient descent uses the slope to know both the direction and the size of the correction.',
  { q: 'If the gradient is positive, we should…', options: ['Increase w', 'Decrease w', 'Stop'], answer: 1, explain: 'A positive gradient means the loss rises as w rises, so move w down.' },
  ['y_hat = 0*2 = 0, so loss = (0-5)^2 = 25', 'gradient = 2*(y_hat - y)*x = 2*(0-5)*2', 'new w = w - lr * gradient, so subtract a negative number'],
  'Prediction y_hat = 0*2 = 0. Loss = (0 - 5)^2 = 25. Gradient d/dw of (w*x - y)^2 = 2*(w*x - y)*x = 2*(0-5)*2 = -20. New w = 0 - 0.05*(-20) = 1.0. The gradient is negative, meaning increasing w lowers the loss, and the update moves w up. After the step y_hat = 2 and the loss falls to (2-5)^2 = 9. Repeating converges toward w=2.5, where loss is 0. This is exactly what the runnable line-fit demo does for many points.');

P('Why Did the Chatbot Invent an API?', 'Medium', ['hallucination', 'debugging'],
  'A coding assistant suggested the method requests.fetch_json(url), which does not exist. Explain the cause and give three things a team can do to reduce this.',
  'The assistant saw many libraries with fetch-style helpers, so a similar name felt plausible.',
  'Weak: "the AI is broken". Nothing is broken; the model is doing what it was trained for, predicting plausible text.',
  { q: 'Most reliable defence against invented APIs?', options: ['Run the code and tests, and read docs', 'Ask the model if it is sure', 'Increase temperature'], answer: 0, explain: 'Execution and documentation are ground truth; the model asked about itself is not.' },
  ['plausible next token, not verified truth', 'ground it with real docs or let it run code', 'verification is cheap for code: run it'],
  'Cause: the model predicts the most plausible continuation. Many libraries have functions named like fetch_json, so the name fits the pattern even though this library lacks it; the model has no built-in check against the real library. Mitigation: (1) give it the actual documentation or type stubs in the prompt, or use a coding tool that can read your repo and installed packages; (2) run the code, linters and tests in CI so a missing method fails immediately; (3) review the diff and reject unverified imports; optionally let the agent run a quick import check. Asking the model "are you sure?" is weak because it may just agree.');

P('Cluster by Hand', 'Medium', ['k-means', 'unsupervised'],
  'Points: A(1,1), B(2,1), C(8,8), D(9,9). Start centres c1=(1,1), c2=(9,9), k=2. Do one full k-means iteration: assignments then new centres. Has it converged?',
  'Two obvious groups separated far apart converge in 1 or 2 rounds.',
  'Weak: eyeballing and declaring groups without the assign/update procedure. Interviewers want the algorithm, since real data is not obvious.',
  { q: 'What does the update step do?', options: ['Moves each centre to the mean of its points', 'Adds a new cluster', 'Labels the points'], answer: 0, explain: 'Centres become the average of their members.' },
  ['assign each point to the nearer centre', 'average the x and y values within each group', 'converged means no point changes group'],
  'Assignment: A and B are closest to c1=(1,1); C and D are closest to c2=(9,9). New centres: group 1 mean = ((1+2)/2, (1+1)/2) = (1.5, 1); group 2 mean = ((8+9)/2, (8+9)/2) = (8.5, 8.5). The centres moved, so run another round: assignments do not change (A,B still nearer to c1; C,D nearer to c2) and the means stay the same, so the algorithm has converged on the second pass. Note k-means needs k chosen up front and can depend on starting positions.');

P('Explore or Exploit?', 'Medium', ['reinforcement learning', 'bandit'],
  'A news app has 3 headline styles. After 55 tries: style A showed 40 clicks in 50 shows; style B 3 clicks in 5 shows; style C never shown. Using epsilon-greedy, what should the app do next and why? What risk does pure greedy have?',
  'ε=0.1 means about 1 in 10 shows is a random style.',
  'Weak: "always show A, it has the best rate". C or B might be better, and the data on them is too thin to know.',
  { q: 'Pure greedy (epsilon = 0) risks…', options: ['Never discovering a better option', 'Too much randomness', 'Slow responses'], answer: 0, explain: 'Without exploration it can lock onto a merely decent early winner.' },
  ['A has rate 0.80; B has 0.60 on tiny data; C unknown', 'a little randomness reveals hidden winners', 'you can also lower epsilon over time'],
  'Show A most of the time (exploit, 80% estimated click rate) but with probability epsilon (say 10%) pick a random style so B and C get tested. B has only 5 shows so its 60% is very uncertain, and C has no data at all; one of them might truly beat A. Pure greedy would lock onto A forever and never learn this. As data grows, reduce epsilon, or use smarter methods such as UCB or Thompson sampling that explore where uncertainty is highest. In production also watch for changing tastes by keeping a small exploration share.');

P('Bias in the Data', 'Medium', ['bias', 'responsible AI'],
  'A resume-screening model trained on 10 years of past hiring decisions rejects more candidates from one university. The team did not use university as a feature. How can that happen, and what would you do?',
  'A feature like postcode can act as a proxy for ethnicity or income.',
  'Weak: "just remove the sensitive column". Other features act as proxies, so bias persists.',
  { q: 'Why does removing the sensitive attribute often not remove bias?', options: ['Other features act as proxies', 'Models ignore column names', 'The data is too small'], answer: 0, explain: 'Correlated features reconstruct the same signal.' },
  ['the labels came from past human decisions', 'look for proxy features that correlate with the removed one', 'measure outcomes per group, not just overall accuracy'],
  'The labels were past hiring choices, which may carry human bias, so the model learns to imitate them. Even without a university column, features like clubs, location, or writing style can proxy for it. Actions: (1) audit outcomes by group with metrics such as selection rate and error rate per group; (2) inspect which features drive predictions; (3) rebalance or relabel data and drop proxy features; (4) keep a human decision-maker and give candidates a way to appeal; (5) get legal and ethics review, since hiring is a regulated area. Accuracy on the old decisions is the wrong target if the old decisions were unfair.');

P('Design a Spam Detector: Rules vs ML vs LLM', 'Hard', ['system choice', 'trade-offs'],
  'Your startup receives 2M messages per day, 20 percent spam, spammers adapt weekly. You have 3M labelled past messages. Compare rules, a classic ML classifier and an LLM for the first filter. Which would you choose, how would you combine them, and how do you measure success?',
  'Layered defence: cheap rules first, ML second, LLM only for the uncertain slice.',
  'Weak: "use the biggest LLM". At 2M messages per day, cost and latency explode, and results are harder to test and reproduce.',
  { q: 'Which gives the best cost and latency at 2M messages per day?', options: ['LLM on every message', 'A trained classifier plus rules', 'Manual review'], answer: 1, explain: 'A small model scores in microseconds at near-zero marginal cost.' },
  ['count messages per day x cost per call x latency', 'adaptive spammers need retraining, rules alone go stale', 'use the expensive tool only on the hard cases'],
  'Rules alone are cheap and exact but spammers adapt weekly, so the rule list rots. An LLM on all 2M messages is flexible but costly, slow and non-deterministic. With 3M labelled messages, a classic ML classifier (logistic regression or gradient-boosted trees on text features, or a small fine-tuned transformer) is best as the main filter: microsecond inference, cheap, testable. Layering: (1) rules for known-bad senders and exact patterns; (2) ML score for everything else; (3) send only the uncertain band (score 0.4 to 0.6) to an LLM or human review. Measure precision (don\'t block real mail), recall (catch spam), false-positive rate per user, latency and cost; monitor drift and retrain on fresh labels weekly, with a held-out recent test set.');

P('Training-Serving Skew Investigation', 'Hard', ['MLOps', 'debugging'],
  'A model scored 94 percent accuracy offline but only 78 percent in production. List the most likely causes in order of likelihood and how you would confirm each.',
  'Offline used a "days since signup" feature computed from a clean table; production computes it from a cache that is sometimes empty.',
  'Weak: "retrain with more data". Without finding the cause, more data will not fix a pipeline mismatch.',
  { q: 'Same model, same weights, different feature code offline and online is called…', options: ['Overfitting', 'Training-serving skew', 'Regularisation'], answer: 1, explain: 'The model sees inputs unlike those it trained on.' },
  ['compare feature distributions offline vs online', 'check for leakage in the offline test set', 'check drift since the training date, week by week'],
  'Likely causes: (1) Training-serving skew: features computed differently online (units, null handling, time zones, stale cache). Confirm by logging live feature vectors and comparing their distributions and a replay of the same raw record through both pipelines. (2) Data leakage offline: the test set contained information not available at prediction time (for example a future field), which inflates offline accuracy; confirm by auditing feature timestamps. (3) Data or concept drift: production traffic differs from the training period; confirm by comparing input distributions and accuracy by week. (4) Label differences: production labels arrive late or are noisy. (5) Overfitting to the validation set from repeated tuning. Fixes: share feature code or use a feature store, time-based splits, monitoring and automated alerts.');

P('Is This Worth Training Our Own Model?', 'Hard', ['build vs buy', 'cost'],
  'Your team wants to train a custom 7B-parameter LLM for support answers. You have 50k past tickets and a small team. Make the case for or against, with a cheaper alternative and the numbers or facts you would gather.',
  'A hosted LLM with retrieval over your help docs often reaches 90 percent of the benefit at 5 percent of the cost.',
  'Weak: "custom model means better quality". Training is expensive, slow to iterate, needs data quality work and ongoing maintenance, and often loses to a strong general model with good retrieval.',
  { q: 'Cheapest first step for support answers grounded in company docs?', options: ['Pre-train from scratch', 'RAG with an existing model', 'Buy 1000 GPUs'], answer: 1, explain: 'Retrieval grounds a ready-made model in your documents quickly and cheaply.' },
  ['list the cost of data, compute, talent and maintenance', 'compare to prompt plus retrieval', 'define the evaluation first so you can compare options'],
  'Argue against training from scratch. Pre-training a 7B model needs trillions of tokens and a large GPU budget, far beyond 50k tickets, which is a tiny dataset (maybe 20M tokens). A staged plan: (1) build an evaluation set from real tickets with graded answers; (2) baseline a hosted model with a good prompt and retrieval (RAG) over help docs; (3) if gaps remain, consider light fine-tuning (LoRA) of an existing open model for tone and format; (4) only then think about anything bigger. Gather: ticket volume, cost per ticket, accuracy needed, latency, privacy constraints (can data leave the company?), and total cost including people and maintenance. Decide by measured eval scores and cost per resolved ticket, not by prestige.');

P('Write the Honest Explainer', 'Hard', ['communication', 'limits'],
  'Write a 150-word note for new employees explaining what the company AI assistant is good at, what it is bad at, and three rules for safe use. Tone: friendly, no hype.',
  'A good note names concrete tasks (drafting, summarizing) and concrete failures (invented facts).',
  'Weak: a note that says "AI is amazing, use it everywhere" or "AI is dangerous, avoid it". Both give no guidance on what to actually do.',
  { q: 'Which rule belongs in a safe-use note?', options: ['Paste customer data to get better answers', 'Verify important facts and never paste confidential data into unapproved tools', 'Trust fluent answers'], answer: 1, explain: 'Verification and data protection are core rules.' },
  ['lead with strengths: drafting, summarizing, brainstorming, explaining code', 'then limits: invented facts, stale knowledge, bias, no memory of your systems', 'end with 3 clear rules a new hire can actually follow'],
  'Model note: "Our AI assistant is great at drafting, summarizing, brainstorming and explaining code. It works by predicting likely words, so it can sound sure while being wrong, it may not know recent events, and it can reflect bias. Three rules: 1) Treat it as a fast junior helper: check facts, numbers, links and code before using them. 2) Never paste customer data, secrets or confidential plans into tools the company has not approved. 3) You own the result: if you send it, you are responsible for it." This covers strengths, limits and actionable rules in roughly 100 words, and stays friendly without hype. Add examples and the policy link to reach 150.');

P('Explain Why the Transformer Mattered', 'Hard', ['history', 'architecture'],
  'In an interview you are asked, "Why did transformers replace RNNs for language, and why did that lead to ChatGPT?" Give a structured answer of about 5 sentences.',
  'RNNs read word by word; transformers read all words at once.',
  'Weak: "transformers use attention" with no explanation of why that mattered for training speed, scale or long-range context.',
  { q: 'Main practical advantage of transformers for training?', options: ['They process tokens in parallel on GPUs', 'They need no data', 'They never hallucinate'], answer: 0, explain: 'Parallelism let teams scale to enormous data and compute.' },
  ['RNN limit: sequential steps, forgets far-back words', 'attention lets every token look at every other token directly', 'scale plus next-token prediction plus tuning gives the chat assistant'],
  'RNNs process text one token at a time, which makes training slow and makes it hard to remember information from far earlier. Transformers use attention so each token can directly look at all other tokens, which captures long-range relationships and, crucially, lets all positions be computed in parallel on GPUs. That made it practical to train on trillions of words, and quality improved predictably with scale. Pre-training with next-token prediction gives a broadly knowledgeable model; instruction tuning and preference tuning (RLHF or similar) turn it into a helpful chat assistant, which is what ChatGPT launched in late 2022. Close by noting limits such as quadratic attention cost and hallucination, which shows depth.');

quiz.push({ q: 'Which is the correct nesting?', options: ['GenAI ⊃ DL ⊃ ML ⊃ AI', 'AI ⊃ ML ⊃ DL ⊃ GenAI', 'ML ⊃ AI ⊃ DL ⊃ GenAI', 'AI ⊃ GenAI ⊃ ML ⊃ DL'], answer: 1, explain: 'AI is the broadest; GenAI (deep generative models) is the narrowest.' });
quiz.push({ q: 'A system uses hand-written if/else rules to play chess well. Which label fits best?', options: ['Deep learning', 'Machine learning', 'AI (rule-based)', 'GenAI'], answer: 2, explain: 'Nothing is learned from data, so it is AI but not ML.' });
quiz.push({ q: 'Predicting tomorrow\'s temperature in degrees is…', options: ['Classification', 'Regression', 'Clustering', 'Reinforcement'], answer: 1, explain: 'The output is a continuous number: regression.' });
quiz.push({ q: 'Grouping customers with no predefined labels is…', options: ['Supervised', 'Unsupervised', 'Reinforcement', 'Overfitting'], answer: 1, explain: 'No labels, find structure: unsupervised.' });
quiz.push({ q: 'In reinforcement learning, what does the agent receive after an action?', options: ['The correct label', 'A reward', 'A new dataset', 'Nothing'], answer: 1, explain: 'Rewards (possibly delayed) are the feedback signal.' });
quiz.push({ q: 'What changes during inference?', options: ['The weights', 'The loss function', 'Nothing about the weights; they stay frozen', 'The architecture'], answer: 2, explain: 'Inference only runs a forward pass with trained weights.' });
quiz.push({ q: 'Why can an LLM state a false fact fluently?', options: ['It looks facts up and the database is wrong', 'It predicts plausible next tokens, not verified truth', 'It lies on purpose', 'Its temperature is always 0'], answer: 1, explain: 'Plausibility drives generation; there is no built-in truth check.' });
quiz.push({ q: 'Raising the sampling temperature usually…', options: ['Makes output more varied', 'Makes output more factual', 'Reduces cost', 'Shrinks the model'], answer: 0, explain: 'It flattens probabilities so lower-ranked tokens are picked more often.' });
quiz.push({ q: 'Epsilon in epsilon-greedy is the chance of…', options: ['Exploiting the best option', 'Exploring a random option', 'Stopping', 'Doubling the reward'], answer: 1, explain: 'With probability epsilon the agent explores randomly.' });
quiz.push({ q: 'Which problem is best solved by plain rules rather than ML?', options: ['Compute VAT from a fixed rate table', 'Recognise a face', 'Recommend movies', 'Detect new spam styles'], answer: 0, explain: 'Exact, known logic should be code.' });
quiz.push({ q: 'Which three ingredients drove the deep learning boom of 2012?', options: ['Larger monitors, SQL and Java', 'Algorithms, big data and GPU compute', 'Quantum chips, robots and 5G', 'Cloud storage only'], answer: 1, explain: 'AlexNet combined known ideas with ImageNet data and GPUs.' });
quiz.push({ q: 'Self-supervised pre-training of an LLM uses as its label…', options: ['Human ratings', 'The next token taken from the text itself', 'A clustering result', 'A reward from a game'], answer: 1, explain: 'The text supplies its own labels by hiding the next token.' });
quiz.push({ q: 'Model drift means…', options: ['The model file moved to another server', 'Real-world data changes so a frozen model slowly gets worse', 'The learning rate decays', 'The GPU overheats'], answer: 1, explain: 'Data or concept drift degrades a frozen model over time.' });

function Q(q, level, a, followUps) { interview.push({ q: q, level: level, a: '<p>' + a + '</p>', followUps: followUps }); }

Q('What is the difference between AI, machine learning and deep learning?', 'B',
  'AI is the broad goal of making machines do tasks that seem intelligent, including old rule-based systems. Machine learning is a subset where the system learns its rules from data instead of being programmed. Deep learning is a subset of ML that uses neural networks with many layers and is especially good for images, audio and language. Generative AI is a further subset: deep models that create new content such as text or images. A good way to say it is nested circles, with a concrete example at each level: a rule-based chess program, a spam filter, a face-unlock network and ChatGPT.',
  ['Is a decision tree machine learning or AI?', 'Is every neural network deep learning?']);
Q('Explain supervised, unsupervised and reinforcement learning with one example each.', 'B',
  'Supervised learning trains on inputs paired with correct answers, for example emails labelled spam or not spam, and predicts labels for new inputs. Unsupervised learning has no answers; it finds structure, such as clustering customers into segments. Reinforcement learning has an agent that acts in an environment and gets rewards, such as a game-playing system or a robot learning to walk. The key difference is the feedback: direct labels, none, or delayed rewards. Add that self-supervised learning, used for LLMs, creates its own labels from raw data.',
  ['Where does self-supervised learning fit?', 'Give a case where you would have to create labels first.']);
Q('What is the difference between training and inference?', 'B',
  'Training adjusts the model weights using lots of data and a loss function; it is slow, GPU-heavy and done rarely. Inference uses the finished, frozen weights to answer new requests, one forward pass at a time, and must be fast and cheap per request. Training is a big one-off cost; inference cost scales with the number of users. In production they are separate pipelines connected by a saved model artifact, and monitoring decides when to retrain.',
  ['Does a chatbot learn from your conversation?', 'What is training-serving skew?']);
Q('How does a language model generate text?', 'B',
  'It splits text into tokens, then repeatedly predicts a probability distribution over the next token given everything so far, samples one token from that distribution, appends it and repeats until a stop token. Temperature and top-p control how adventurous the sampling is. The model does not retrieve stored answers; it constructs them token by token, which explains both its fluency and why it can produce plausible but false statements.',
  ['What does temperature 0 do?', 'Why are long answers slower and more expensive?']);
Q('Why do LLMs hallucinate and how do you reduce it?', 'I',
  'LLMs are trained to predict plausible text, not verified truth, and they have no built-in sense of what they do not know. Knowledge is compressed and frozen at a cutoff, and an early wrong token biases the rest of the answer. To reduce hallucinations, ground the model with trusted documents (RAG), instruct it to answer only from the sources and cite them, let it use tools for maths and lookups, lower the temperature, validate structured outputs with code, and add human review for high-stakes cases. Track a hallucination rate with an evaluation set. It can be lowered but never fully eliminated.',
  ['How would you measure hallucination rate?', 'Does a bigger model always hallucinate less?']);
Q('When would you choose rules over ML?', 'B',
  'Choose rules when the logic is known, stable, must be exact and auditable, or when you have little data: tax calculation, permissions, input validation. They are cheap, fast, testable and explainable. ML is better when the pattern is too complex to write down and you have plenty of examples: spam, image recognition, recommendation. Many good systems combine them, with rules as guardrails around a model.',
  ['How do you decide with only 200 labelled examples?', 'What is a good baseline before building ML?']);
Q('What is overfitting and how do you detect it?', 'I',
  'Overfitting means the model memorises training data, including noise, and performs well on training but poorly on new data. Detect it by comparing training and validation metrics: a growing gap is the sign. Reduce it with more data, simpler models, regularisation, early stopping, dropout or data augmentation. Always keep a separate untouched test set for the final honest score, and use time-based splits when the data is a time series.',
  ['What is underfitting?', 'Why is a test set only used once?']);
Q('Explain exploration versus exploitation.', 'I',
  'Exploitation uses what you already believe is best; exploration tries other options to gain information. If you only exploit, you may lock onto a mediocre option; if you only explore, you waste reward. Epsilon-greedy explores randomly with small probability epsilon and often decays it over time. Better methods such as UCB and Thompson sampling explore where uncertainty is highest. It applies to A/B testing, recommendations and ad selection, not only robots.',
  ['How does a bandit differ from full RL?', 'How would you pick epsilon?']);
Q('What is a foundation model and how does it differ from a traditional ML model?', 'I',
  'A foundation model is a large model pre-trained on broad data that can be adapted to many tasks with prompting, retrieval or fine-tuning. A traditional ML model is trained for one narrow task on task-specific data. Foundation models cut the data and training effort needed per task, but bring higher inference cost, less predictability, and risks like hallucination and data privacy. Choosing between them is a build-versus-buy and cost-versus-control decision.',
  ['When would you still train a small custom model?', 'What is the difference between open-weight and API-only models?']);
Q('Why did transformers lead to the current GenAI wave?', 'I',
  'Transformers use attention to relate all tokens to each other and process them in parallel, which suits GPUs far better than sequential RNNs. That allowed training on enormous datasets, and performance improved smoothly with scale. Combined with next-token pre-training, instruction tuning and preference tuning, this gave general assistants. Data, compute and algorithms all had to align, which is the same pattern behind the 2012 deep learning boom.',
  ['What are the limits of attention at long context?', 'What is a scaling law?']);
Q('How would you explain the limits of AI to a non-technical executive?', 'A',
  'Use a short analogy: a very well-read assistant that writes fluently but may confidently say wrong things, has no knowledge of private company data unless connected, can reflect bias in its training data, and must be checked. Then focus on decisions: where AI saves time at low risk (drafting, summarising), where it needs human review (customer or legal content), and where it should not be used (exact calculations, access control). Give numbers when possible: error rates from an evaluation, cost per request, and what a failure would cost. Offer a pilot with measurable goals rather than a promise.',
  ['How do you set realistic expectations on accuracy?', 'What metrics would you report monthly?']);
Q('A team proposes adding an LLM to a feature. What questions do you ask first?', 'A',
  'Ask what user problem it solves and what happens when it is wrong (cost of errors). Could rules, search or SQL do it more reliably? What data does it need and is it allowed to leave our boundary? What are latency, cost per request and expected volume? How will we evaluate quality, with what test set and threshold? What is the fallback or human handoff? How will we monitor drift and abuse such as prompt injection? Who owns the outcome? Starting from evaluation and failure modes keeps the project honest.',
  ['How would you build the first evaluation set?', 'What would make you say no to the LLM?']);

registerModule({
  id: 'ai01',
  title: 'AI, ML, Deep Learning & GenAI in Plain English',
  intro: `<p>Everyone talks about AI, but few can say clearly what it is. In this module you learn the real meaning of AI, machine learning, deep learning and generative AI as <b>nested circles</b>, how machines learn (supervised, unsupervised, reinforcement), what a model actually is, the difference between <b>training and inference</b>, how generative AI builds text one word at a time, and where it fails. You will run tiny Python programs for each idea, so nothing stays magic. This is the foundation for every later module in the GenAI track.</p>`,
  goals: [
    'Explain AI, ML, deep learning and GenAI as nested ideas and classify real products correctly',
    'Name the three learning styles and pick the right one from a problem description',
    'Describe a model as shape plus weights and tell training from inference in any pipeline',
    'Explain next-token generation, temperature and sampling with a working example',
    'Explain why LLMs hallucinate, debunk common myths, and decide between rules, ML and GenAI'
  ],
  prereqs: `None. Basic Python reading ability helps for the runnable examples, but every idea is explained in everyday words first.`,
  hours: 6,
  topics: topics,
  quiz: quiz,
  interview: interview,
  practice: practice
});
})();
