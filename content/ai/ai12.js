(function () { var topics = [], practice = [], quiz = [], interview = [];

topics.push({
  title: 'Prompting vs RAG vs Fine-Tuning: The Decision Framework',
  analogy: `<p>Imagine you hire a very smart new employee. <b>Prompting</b> is giving them clear written instructions on their first day. <b>RAG</b> (retrieval-augmented generation) is handing them a filing cabinet and saying "look things up before you answer". <b>Fine-tuning</b> is sending them to months of training so a new <i>habit or style</i> becomes second nature. Instructions are cheap and instant, the cabinet keeps facts fresh, and training is slow and expensive, so you try them in that order.</p>`,
  explain: `<p>Three tools, three different problems:</p>
  <ul>
    <li><b>Prompting</b> changes what you <i>say</i> to the model (instructions, examples, format). Fixes: unclear tasks, wrong tone, wrong output shape. Cost: nearly zero. Time: minutes.</li>
    <li><b>RAG</b> changes what the model can <i>see</i> (it fetches your documents and pastes the relevant bits into the prompt). Fixes: missing or fast-changing knowledge, need for citations, private data. Time: days.</li>
    <li><b>Fine-tuning</b> changes what the model <i>is</i> (its weights). Fixes: a consistent style or format, a narrow skill, shorter prompts at scale, a small model that must act like a big one. Time: weeks.</li>
  </ul>
  <p><b>Golden rule:</b> fine-tuning teaches <b>behaviour</b>, RAG supplies <b>knowledge</b>. People often try to "teach facts" by fine-tuning; it works badly (the model learns the tone of the facts, and still makes things up) and facts go stale the day after training.</p>
  ${H.table(['Problem you see', 'Try first', 'Why'], [
    ['Model ignores my format', 'Prompting (examples, schema)', 'Cheap, instant'],
    ['Needs our latest policy docs', 'RAG', 'Facts change, need citations'],
    ['Answers right but wrong brand voice, 1M calls/day', 'Fine-tune', 'Style is behaviour; shorter prompts save money'],
    ['Needs both private facts and strict style', 'RAG + fine-tune', 'They stack']])}
  <p>Order of attack: <b>prompt → evals → RAG → fine-tune</b>. Each step must beat the previous one on <i>your own test set</i>, otherwise it is not worth the extra cost.</p>`,
  clues: ['"The model does not know our internal data" → RAG, not fine-tuning', '"Always answer in this exact JSON / tone / style" with thousands of examples → fine-tuning candidate', '"Data changes daily" → RAG (fine-tuning would go stale)', '"Cut latency and cost, we send a 3,000-token prompt every call" → fine-tune a small model to bake the prompt in', '"We have no labelled examples yet" → start with prompting, collect data from logs', '"Need citations / audit trail" → RAG'],
  code: [{ lang: 'python', run: true, title: 'A tiny decision helper (runnable)', code: `def choose(missing_knowledge, knowledge_changes_often, need_style_or_format, examples_available, high_volume):
    """Return an ordered plan. This is a thinking aid, not a law."""
    plan = ["1. Prompting + a small eval set (always start here)"]
    if missing_knowledge:
        plan.append("2. RAG: retrieve documents at question time")
        if knowledge_changes_often:
            plan.append("   (do NOT fine-tune facts: they go stale)")
    if need_style_or_format and examples_available >= 500:
        plan.append("3. Fine-tune (SFT) for style/format, " + str(examples_available) + " examples")
    elif need_style_or_format:
        plan.append("3. Collect more examples first (have " + str(examples_available) + ", want 500+); use few-shot prompting meanwhile")
    if high_volume:
        plan.append("4. Consider fine-tuning a small model to shorten prompts and cut cost")
    return plan

scenarios = {
    "FAQ bot on live help-center": (True, True, False, 0, False),
    "Legal-tone email writer": (False, False, True, 2000, False),
    "Support bot, private docs + strict brand voice": (True, False, True, 1200, True),
}
for name, args in scenarios.items():
    print(name)
    for line in choose(*args):
        print("  ", line)
` }],
  codeTitle: ['Decision helper'],
  viz: {
    title: 'Decision tree: prompt, RAG or fine-tune?',
    input: 'facts',
    inputLabel: 'Your main problem: facts (missing knowledge), style (behaviour), or ok (prompt already works)',
    gen: function (input) {
      var s = String(input).trim().toLowerCase();
      if (['facts', 'style', 'ok'].indexOf(s) < 0) throw new Error('Type one of: facts, style, ok');
      var arr = ['Problem?', 'Missing facts?', 'Wrong behaviour?', 'RAG', 'Prompt more', 'Fine-tune', 'Prompting'];
      var path = s === 'facts' ? [0, 1, 3] : s === 'style' ? [0, 2, 5] : [0, 2, 6];
      var frames = [];
      frames.push({ narr: 'Start at the root: <b>what is actually wrong</b> with the model output? Always look at real failing examples first.', parts: [{ type: 'tree', label: 'Decision tree', arr: arr, hl: { 0: 'cur' } }] });
      var hl = { 0: 'done' };
      if (s === 'facts') {
        hl[1] = 'cur';
        frames.push({ narr: 'The model lacks <b>knowledge</b> (private, new, or changing). Facts belong in the context window, not the weights.', parts: [{ type: 'tree', label: 'Decision tree', arr: arr, hl: hl }] });
        hl[1] = 'done'; hl[3] = 'sel';
        frames.push({ narr: 'Answer: <b>RAG</b>. Retrieve the right chunks and put them in the prompt. Updating a document updates the answer instantly.', parts: [{ type: 'tree', label: 'Decision tree', arr: arr, hl: hl }, { type: 'text', html: 'Add fine-tuning later only if style is also wrong.' }] });
      } else {
        hl[2] = 'cur';
        frames.push({ narr: 'Facts are fine but the <b>behaviour</b> (tone, format, skill) is off. First ask: did you try better instructions and examples?', parts: [{ type: 'tree', label: 'Decision tree', arr: arr, hl: hl }] });
        hl[2] = 'done';
        if (s === 'style') {
          hl[5] = 'sel';
          frames.push({ narr: 'Prompting hit a ceiling (long prompts, inconsistent results, high volume). Answer: <b>fine-tune</b> with SFT on curated examples.', parts: [{ type: 'tree', label: 'Decision tree', arr: arr, hl: hl }] });
        } else {
          hl[6] = 'sel';
          frames.push({ narr: 'Prompting already passes your eval. Answer: <b>stay with prompting</b>. Cheapest, easiest to change.', parts: [{ type: 'tree', label: 'Decision tree', arr: arr, hl: hl }] });
        }
      }
      frames.push({ narr: 'Whatever you pick, the decision is validated by a <b>held-out eval set</b>, not by feel.', parts: [{ type: 'table', label: 'Cost ladder', columns: ['Option', 'Cost', 'Time to try', 'Reversible?'], rows: [['Prompting', '$', 'minutes', 'yes'], ['RAG', '$$', 'days', 'yes'], ['Fine-tune', '$$$', 'weeks', 'new model version']], hl: { 0: s === 'ok' ? 'sel' : '', 1: s === 'facts' ? 'sel' : '', 2: s === 'style' ? 'sel' : '' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Scenario 1: Company HR policy chatbot', html: `<p>Policies change quarterly and employees want a quoted source. <b>RAG.</b> Fine-tuning would freeze last quarter's rules inside the weights.</p>` },
    { title: 'Scenario 2: Extract invoice fields into strict JSON', html: `<p>Start with prompting plus a JSON schema and 3 examples. If 98% valid already, stop. If a small cheap model fails, fine-tune it on 2,000 labelled invoices.</p>` },
    { title: 'Scenario 3: Medical-style summariser with rare vocabulary', html: `<p>Often <b>RAG + fine-tune</b>: RAG brings the patient notes (facts), fine-tuning teaches the domain's note style and abbreviations (behaviour).</p>`, code: { lang: 'python', run: true, code: `# Break-even: fine-tuning shrinks a 2,000-token prompt to 200 tokens
calls = 1_000_000
price_per_1k = 0.0005   # made-up price in dollars
before = calls * 2000 / 1000 * price_per_1k
after = calls * 200 / 1000 * price_per_1k
print("monthly prompt cost before:", before)
print("monthly prompt cost after :", after)
print("saved:", before - after)
` } }
  ],
  deepDive: `<p><b>Why not teach facts by fine-tuning?</b> Gradient updates nudge billions of weights slightly; the model stores facts as fuzzy statistics, so recall is unreliable, hallucination is not removed, and you cannot cite or delete a fact (a legal problem for "right to be forgotten"). RAG keeps facts in a database you can edit, version and permission per user.</p>
  <p><b>Long context changes the maths.</b> With 1M-token windows, "stuff the whole handbook in the prompt" with prompt caching is often cheaper and simpler than a vector database. Retrieval still wins when the corpus is huge, access-controlled, or changes constantly.</p>
  <p><b>Fine-tuning payoffs that are real:</b> (1) consistent structured output, (2) distilling a big model's behaviour into a small, fast, cheap one, (3) removing a long system prompt, (4) a niche skill the base model lacks (rare language, internal DSL), (5) tool-calling reliability. <b>Hidden costs:</b> you own data pipelines, evals, re-training when the base model is upgraded, and hosting. Fine-tuned behaviour can also be silently lost when the vendor deprecates the base model.</p>
  <p><b>Production pattern:</b> log real traffic, label failures, build an eval set, and let numbers decide. The decision is cheap to revisit; the eval set is the asset that survives.</p>`,
  aiEra: `<p><b>What AI changes:</b> frontier models follow instructions so well that prompting solves most tasks that once needed fine-tuning. The bar for "we must fine-tune" is higher in 2026 than in 2023.</p>
  <p><b>Use AI as a partner:</b> paste 20 failing outputs and ask <code>Classify each failure: missing knowledge, wrong format, wrong tone, reasoning error. Count each class.</code> The counts tell you which tool to reach for.</p>
  <p><b>Where AI goes wrong:</b> assistants love recommending fine-tuning because it sounds sophisticated, or recommending RAG for everything. Ask it for the cheapest option that could work and how to measure that.</p>
  <p><b>What you must still own:</b> the eval set, the cost and latency numbers, data privacy decisions, and the final call on whether the extra complexity pays for itself.</p>`,
  problems: [{
    title: 'Choose the Tool for Six Scenarios', level: 'Easy', tags: ['decision', 'rag', 'fine-tuning'],
    statement: `<p>For each scenario pick <b>prompting, RAG, fine-tuning, or a combination</b> and justify in one line: (1) answer questions about yesterday's product price list; (2) make a model reply in a pirate voice; (3) classify 10M tickets/day into 8 labels cheaply; (4) summarise any article in 3 bullets; (5) answer from 40,000 internal wiki pages with citations; (6) call an internal tool API using a custom function syntax the base model has never seen.</p>`,
    constraints: `One primary choice per scenario; mention the reason in one sentence.`,
    example: `<p>(1) <b>RAG</b> because prices change daily and must be quoted exactly.</p>`,
    brute: { why: `<p>Fine-tune everything: slow, expensive, stale facts, and no evidence it beats a good prompt.</p>` },
    mcq: { q: 'Which is the best first step for any scenario?', options: ['Fine-tune a model', 'Write a prompt and a small eval set', 'Build a vector database'], answer: 1, explain: 'Cheapest experiment first, and you need an eval to compare later steps.' },
    hints: [`<p>Hint 1: is the gap knowledge or behaviour?</p>`, `<p>Hint 2: how often does the information change? How many calls per day?</p>`, `<p>Hint 3: try the cheapest tool that could pass an eval, climb only if it fails.</p>`],
    solution: { approach: `<p>(1) RAG: daily-changing facts. (2) Prompting: a style instruction is enough, no training needed. (3) Fine-tune a small model: huge volume and a fixed label set means a small tuned classifier is far cheaper than a big prompted model. (4) Prompting: a general skill the base model already has. (5) RAG: large, changing corpus and need for citations; long context cannot hold 40,000 pages. (6) Few-shot prompting first; if reliability is below target, fine-tune on examples of the syntax because it is a new behaviour. Pattern: facts to RAG, behaviour or cost-at-scale to fine-tuning, everything else to prompting.</p>`, complexity: `<p>Not applicable; judged on reasoning.</p>` }
  }]
});

topics.push({
  title: 'Supervised Fine-Tuning (SFT): Data Format and Training Loop',
  analogy: `<p>SFT is like a <b>driving instructor sitting beside a learner</b>. For each situation the instructor shows the right move ("a red light: stop"). The learner tries, compares with the instructor's move, and adjusts. After thousands of examples the learner copies the behaviour. The "instructor's move" is the <b>target answer</b> in your dataset; the learner is the model whose weights are nudged.</p>`,
  explain: `<p>A base model is trained to continue text. SFT turns it into an <b>assistant</b> (or a specialist) by showing it many <b>(input, ideal output)</b> pairs.</p>
  <p><b>Data format.</b> Usually one JSON object per line (<b>JSONL</b>). The common chat shape is a list of messages with roles <code>system</code>, <code>user</code>, <code>assistant</code>:</p>
  <pre>{"messages": [{"role":"system","content":"You are a polite support agent."},
              {"role":"user","content":"My order has not arrived."},
              {"role":"assistant","content":"I am sorry about that! Could you share your order number?"}]}</pre>
  <p><b>Training loop in plain words:</b></p>
  <ol>
    <li>Turn the conversation into tokens using the model's chat template.</li>
    <li>Run the model; at each position it predicts the next token.</li>
    <li>Compute <b>cross-entropy loss</b>: how surprised was the model by the true next token?</li>
    <li><b>Mask the prompt</b>: count the loss only on the assistant's tokens, so the model learns to answer, not to imitate the user.</li>
    <li>Backpropagate, update weights with a small learning rate (e.g. 1e-5 full tune, 1e-4 to 2e-4 for LoRA), repeat for 1 to 3 <b>epochs</b>.</li>
  </ol>
  <p>Watch <b>training loss</b> (should fall) and <b>validation loss / eval score</b> on held-out data (should fall or rise, respectively, then flatten). If training improves but validation gets worse, you are <b>overfitting</b>: stop earlier.</p>`,
  clues: ['"We have 2,000 high-quality input/output examples" → SFT', '"Model must follow our exact response template" → SFT on template-conforming outputs', '"Loss on the prompt tokens" → use a completion-only mask', '"Training loss drops, eval gets worse" → overfitting, fewer epochs or more data', '"Use JSONL with roles" → chat-format SFT data', '"Same behaviour with a shorter prompt" → SFT removes the instruction text'],
  code: [{ lang: 'python', run: true, title: 'Build SFT examples from support tickets (runnable)', code: `import json

tickets = [
    {"subject": "Late order", "body": "My order 1042 has not arrived after 10 days.",
     "agent_reply": "I am sorry about the delay. I have asked the courier to trace order 1042 and will email you within 24 hours."},
    {"subject": "Wrong size", "body": "I got size M but ordered L.",
     "agent_reply": "Sorry for the mix-up! I have sent a prepaid label. Your size L ships as soon as we receive the return scan."},
    {"subject": "spam", "body": "BUY CHEAP WATCHES!!!", "agent_reply": ""},
]
SYSTEM = "You are a calm, concise support agent for Acme Shop."

def to_example(t):
    # Skip tickets with no real human answer: nothing to learn from
    if not t["agent_reply"].strip():
        return None
    user = "Subject: " + t["subject"] + " | " + t["body"]
    return {"messages": [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": user},
        {"role": "assistant", "content": t["agent_reply"]},
    ]}

lines = []
for t in tickets:
    ex = to_example(t)
    if ex:
        lines.append(json.dumps(ex))
print("kept", len(lines), "of", len(tickets), "tickets")
print(lines[0])
` },
  { lang: 'python', check: false, title: 'SFT with Hugging Face TRL (needs GPU libraries)', code: `# pip install trl transformers datasets peft
from datasets import load_dataset
from trl import SFTTrainer, SFTConfig

ds = load_dataset("json", data_files={"train": "train.jsonl", "validation": "val.jsonl"})

config = SFTConfig(
    output_dir="out-sft",
    num_train_epochs=2,             # 1-3 is typical; more risks overfitting
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,  # effective batch size 16
    learning_rate=2e-5,
    eval_strategy="steps", eval_steps=50,
    assistant_only_loss=True,       # loss only on assistant tokens (prompt masked)
)
trainer = SFTTrainer(
    model="meta-llama/Llama-3.2-1B-Instruct",
    args=config,
    train_dataset=ds["train"],
    eval_dataset=ds["validation"],
)
trainer.train()
trainer.save_model("out-sft")
` }],
  codeTitle: ['Support tickets to JSONL', 'TRL SFT trainer'],
  viz: {
    title: 'SFT pipeline, box by box',
    gen: function () {
      var nodes = [
        { id: 'raw', label: 'Raw tickets', x: 8, y: 10, shape: 'box', w: 14 },
        { id: 'clean', label: 'Clean + dedup', x: 30, y: 10, shape: 'box', w: 16 },
        { id: 'fmt', label: 'Chat JSONL', x: 54, y: 10, shape: 'box', w: 14 },
        { id: 'split', label: 'Train / Val', x: 78, y: 10, shape: 'box', w: 14 },
        { id: 'tok', label: 'Tokenize + mask', x: 18, y: 40, shape: 'box', w: 18 },
        { id: 'train', label: 'Train loop', x: 46, y: 40, shape: 'box', w: 14 },
        { id: 'eval', label: 'Held-out eval', x: 72, y: 40, shape: 'box', w: 16 },
        { id: 'ship', label: 'Ship / iterate', x: 92, y: 40, shape: 'box', w: 14 }
      ];
      var edges = [['raw', 'clean'], ['clean', 'fmt'], ['fmt', 'split'], ['split', 'tok'], ['tok', 'train'], ['train', 'eval'], ['eval', 'ship']];
      function f(narr, hl, ehl, extra) {
        var parts = [{ type: 'graph', label: 'SFT pipeline', directed: true, height: 52, nodes: nodes, edges: edges, hl: hl, ehl: ehl }];
        if (extra) parts.push(extra);
        return { narr: narr, parts: parts };
      }
      return [
        f('<b>Raw tickets</b> with the human agents\' real replies are the source of truth. Garbage here becomes garbage behaviour.', { raw: 'cur' }, {}),
        f('<b>Clean and dedup</b>: drop empty replies, spam, duplicates, private data (emails, card numbers).', { raw: 'done', clean: 'cur' }, { 'raw-clean': 'ok' }, { type: 'table', columns: ['Step', 'Tickets left'], rows: [['raw', 10000], ['after cleaning', 7400], ['after dedup', 6100]] }),
        f('<b>Format</b> each good ticket as a chat example: system, user, assistant.', { clean: 'done', fmt: 'cur' }, { 'clean-fmt': 'ok' }, { type: 'text', html: '<code>{"messages":[{"role":"user",...},{"role":"assistant",...}]}</code>' }),
        f('<b>Split</b> BEFORE training: e.g. 90% train, 10% validation. The validation set is never trained on.', { fmt: 'done', split: 'cur' }, { 'fmt-split': 'ok' }, { type: 'bars', label: 'Split sizes', values: [5490, 610], texts: ['train 5490', 'val 610'] }),
        f('<b>Tokenize and mask</b>: loss counts only the assistant tokens (green), not the prompt (faded).', { split: 'done', tok: 'cur' }, { 'split-tok': 'ok' }, { type: 'array', label: 'token loss mask (1 = learn from it)', values: [0, 0, 0, 0, 1, 1, 1, 1], hl: { 4: 'ok', 5: 'ok', 6: 'ok', 7: 'ok', 0: 'done', 1: 'done', 2: 'done', 3: 'done' } }),
        f('<b>Train</b>: predict next token, compute loss, update weights. Loss should fall each epoch.', { tok: 'done', train: 'cur' }, { 'tok-train': 'ok' }, { type: 'bars', label: 'training loss by epoch', values: [2.1, 1.3, 0.9], texts: ['ep1 2.1', 'ep2 1.3', 'ep3 0.9'] }),
        f('<b>Evaluate on held-out data</b>. If validation gets worse while training loss falls, stop: overfitting.', { train: 'done', eval: 'cur' }, { 'train-eval': 'ok' }, { type: 'bars', label: 'validation loss by epoch', values: [2.2, 1.5, 1.7], texts: ['ep1 2.2', 'ep2 1.5', 'ep3 1.7 (worse!)'], hl: { 2: 'bad' } }),
        f('<b>Ship the best checkpoint</b> (epoch 2) and keep logging real failures for the next round.', { eval: 'done', ship: 'sel' }, { 'eval-ship': 'ok' })
      ];
    }
  },
  examples: [
    { title: 'A good SFT example vs a bad one', html: `<p>${H.c('g', 'Good')}: user asks about a late order, agent gives an apology, the action taken and a time frame. ${H.c('r', 'Bad')}: agent reply is "ok" or "see FAQ". The model will learn to be lazy in exactly that way.</p>` },
    { title: 'Prompt masking in numbers', html: `<p>Example has 40 prompt tokens and 20 answer tokens. With masking only 20 tokens contribute to the loss. Without masking the model spends 2/3 of its learning signal memorising user questions.</p>` },
    { title: 'Completion format for non-chat models', html: `<p>Older style: <code>{"prompt": "...", "completion": "..."}</code>. Same idea; chat format is now standard because it matches the chat template used at inference.</p>`, code: { lang: 'python', run: true, code: `import math
# Cross-entropy for ONE token: -log(probability the model gave the correct token)
for p in (0.9, 0.5, 0.1, 0.01):
    print("p(correct)=", p, " loss=", round(-math.log(p), 3))
` } }
  ],
  deepDive: `<p><b>Chat templates are a silent killer.</b> Each model family has special tokens (such as role markers). If training uses one template and serving uses another, quality collapses without any error. Always apply the tokenizer's own template in both places.</p>
  <p><b>Hyperparameters that matter:</b> learning rate (too high destroys the base skills, too low learns nothing), epochs (1 to 3; small data overfits fast), effective batch size (use gradient accumulation), sequence packing for efficiency, and a warmup plus cosine decay schedule. <b>Full fine-tuning</b> updates all weights and needs memory for weights, gradients and optimizer states (around 16 bytes per parameter with Adam in mixed precision), which is why parameter-efficient methods (next topic) dominate.</p>
  <p><b>Data quantity:</b> for style and format, a few hundred to a few thousand excellent examples often suffice (the "LIMA" finding: alignment is mostly about surfacing existing ability). For new skills, you need much more. <b>Synthetic data</b> generated by a stronger model (distillation) is common, but check licences and verify quality; training on your own model's mistakes causes drift.</p>
  <p><b>Evaluation:</b> loss is a weak proxy. Use task metrics, LLM-as-judge with a rubric, and a human spot-check of 50 outputs.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants can now draft the data-conversion script, generate synthetic examples, and run hyperparameter sweeps. Hosted APIs let you fine-tune with an upload and a button, no GPU needed.</p>
  <p><b>Use AI as a partner:</b> <code>Here are 5 raw tickets. Convert them to chat-format JSONL, flag any containing personal data, and list tickets whose reply would teach a bad habit.</code></p>
  <p><b>Where AI goes wrong:</b> synthetic answers are fluent but often subtly wrong or too uniform; the tuned model then copies the uniformity ("mode collapse"). Assistants also forget to mask prompts or to match the chat template.</p>
  <p><b>What you must still own:</b> what counts as a good answer (policy and tone), privacy and consent for training data, the held-out eval, and the decision of when to stop.</p>`,
  problems: [{
    title: 'Turn Support Tickets into SFT Examples', level: 'Medium', tags: ['sft', 'jsonl', 'data'],
    statement: `<p>You have tickets with fields <code>subject</code>, <code>body</code>, <code>agent_reply</code>, <code>csat</code> (1 to 5). Design the conversion to chat-format JSONL: which tickets to keep, how to build each message list, how to protect privacy, and how to split train/validation.</p>`,
    constraints: `5,000 tickets, 12% have empty replies, 8% have csat ≤ 2, some contain emails and phone numbers.`,
    example: `<p>Ticket "Late order", reply apologises and gives next step, csat 5 → keep: system + user (subject and body) + assistant (reply).</p>`,
    brute: { why: `<p>Dump every ticket as-is. Empty replies teach silence, low-csat replies teach bad service, personal data leaks into the weights, and random duplicates let the validation set leak into training.</p>` },
    mcq: { q: 'Which tickets should you drop first?', options: ['Those with csat 5', 'Those with empty or low-csat replies', 'The shortest subjects'], answer: 1, explain: 'The reply is the label; bad labels teach bad behaviour.' },
    hints: [`<p>Hint 1: the agent reply is the label, so label quality is the filter.</p>`, `<p>Hint 2: add a system message with your policy, keep the ticket text in the user turn.</p>`, `<p>Hint 3: scrub personal data, dedup, then split by ticket (or customer) before training.</p>`],
    solution: { approach: `<p>Filter: drop empty replies, csat ≤ 3 (keep only replies customers rated well), spam and auto-replies, tickets in languages you do not support. Scrub: replace emails, phone numbers and order-owner names with placeholders like [EMAIL]. Build: a constant system message (role and policy), a user message of subject plus body, an assistant message holding the agent reply. Dedup near-identical tickets by normalized hash. Split 90/10 by customer so the same person does not appear in both sets. Write JSONL, one example per line, and verify by round-tripping through the tokenizer's chat template. Finally read 50 random examples by eye before training.</p>`, code: { lang: 'python', code: `def keep(t):
    return bool(t["agent_reply"].strip()) and t.get("csat", 0) >= 4` }, complexity: `<p>One pass over tickets, O(N).</p>` }
  }]
});

topics.push({
  title: 'LoRA and QLoRA: Tiny Adapters on a Frozen Giant',
  analogy: `<p>Think of a huge printed encyclopedia (the frozen model). Instead of reprinting it to fix your topic, you stick a few <b>thin sticky notes</b> on the pages that matter. Reading the book now means "page text + sticky note". The notes are tiny, cheap to carry, and you can swap one set for another. That is <b>LoRA</b>. <b>QLoRA</b> additionally stores the encyclopedia in a smaller, compressed print (4-bit) so it fits on a small desk (GPU).</p>`,
  explain: `<p>A linear layer has a weight matrix <b>W</b> of size d×d (say 4096×4096 = 16.8 million numbers). Full fine-tuning changes all of them.</p>
  <p><b>LoRA idea:</b> the <i>change</i> we need, ΔW, is probably simple ("low rank"). So keep W <b>frozen</b> and learn ΔW = <b>B × A</b>, where <b>A</b> is r×d and <b>B</b> is d×r, with a small <b>rank r</b> (4, 8, 16, 64). New forward pass: <code>y = W·x + (α/r)·B·(A·x)</code>.</p>
  ${H.table(['Item', 'Shape', 'Params (d=4096, r=8)'], [['W (frozen)', '4096 × 4096', '16,777,216'], ['A (trainable)', '8 × 4096', '32,768'], ['B (trainable)', '4096 × 8', '32,768'], ['LoRA total', 'A + B', '<b>65,536</b> (0.39% of W)']])}
  <p><b>Setup trick:</b> B starts as all zeros, so at step 0 the model behaves exactly like the original. A starts small random. Training then moves only A and B.</p>
  <p><b>Why it helps:</b> far fewer trainable parameters means much less memory for gradients and optimizer states, small files (tens of MB), no change to the base model, and many adapters can share one base. After training you can <b>merge</b> BA into W (zero extra latency) or keep adapters separate.</p>
  <p><b>QLoRA</b> = LoRA + the frozen base weights stored in <b>4-bit</b> (NF4 format, with double quantization and paged optimizers). A 65B-parameter model that needs about 130 GB in 16-bit fits in about 35 to 40 GB, and a 7B model tunes on a single consumer GPU. Adapters themselves stay in 16-bit.</p>`,
  clues: ['"Fine-tune a 7B/70B model on a single GPU" → LoRA / QLoRA', '"Compute trainable parameters for rank r" → r × (d_in + d_out) per layer', '"Serve 100 customers each with their own tuned model" → one base + many LoRA adapters', '"Out of memory during fine-tuning" → QLoRA, gradient checkpointing, smaller batch', '"Zero extra latency at inference" → merge adapter into W', '"Quality close to full fine-tune at 1% of the parameters" → LoRA'],
  code: [{ lang: 'python', run: true, title: 'LoRA parameter-count calculator (runnable)', code: `def full_params(d_in, d_out):
    return d_in * d_out

def lora_params(d_in, d_out, r):
    # A is r x d_in, B is d_out x r
    return r * d_in + d_out * r

d = 4096
full = full_params(d, d)
print("full layer params:", format(full, ","))
for r in (1, 4, 8, 16, 64):
    p = lora_params(d, d, r)
    print("r=%-3d LoRA params=%-9s  %.3f%% of full" % (r, format(p, ","), 100 * p / full))

# A whole model: 32 layers, adapt 4 attention matrices (q,k,v,o) per layer
layers, mats, r = 32, 4, 8
total = layers * mats * lora_params(d, d, r)
print("32 layers x 4 matrices at r=8:", format(total, ","), "trainable params")
print("adapter file size in 16-bit ~", round(total * 2 / 1e6, 1), "MB")
` },
  { lang: 'python', run: true, title: 'Tiny low-rank product demo (runnable)', code: `# W stays frozen. We learn B (d x r) and A (r x d). Delta = B @ A has rank <= r.
def matmul(X, Y):
    return [[sum(X[i][k] * Y[k][j] for k in range(len(Y))) for j in range(len(Y[0]))] for i in range(len(X))]

def add(X, Y):
    return [[a + b for a, b in zip(rx, ry)] for rx, ry in zip(X, Y)]

d, r = 4, 1
W = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]   # frozen
B = [[1], [2], [0], [1]]          # 4 x 1  (4 params)
A = [[0, 1, 0, 2]]                # 1 x 4  (4 params)
delta = matmul(B, A)              # 4 x 4 matrix built from only 8 numbers
print("delta = B @ A:")
for row in delta:
    print("  ", row)
print("W + delta:")
for row in add(W, delta):
    print("  ", row)
print("params: full =", d * d, " lora =", d * r + r * d)

# Before training B is zeros, so the model is unchanged
B0 = [[0], [0], [0], [0]]
print("delta at start:", matmul(B0, A))
` },
  { lang: 'python', check: false, title: 'LoRA / QLoRA with PEFT (needs GPU libraries)', code: `import torch
from transformers import AutoModelForCausalLM, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

bnb = BitsAndBytesConfig(
    load_in_4bit=True,                 # QLoRA: base weights stored in 4-bit
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
)
model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3.1-8B", quantization_config=bnb)
model = prepare_model_for_kbit_training(model)

lora = LoraConfig(
    r=8, lora_alpha=16, lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    task_type="CAUSAL_LM",
)
model = get_peft_model(model, lora)
model.print_trainable_parameters()     # roughly 0.1% - 1% trainable
` }],
  codeTitle: ['Param calculator', 'Low-rank product', 'PEFT QLoRA setup'],
  viz: [{
    title: 'LoRA: frozen W plus trainable B x A',
    input: '2',
    inputLabel: 'Rank r (1 to 3) for the toy 6x6 layer',
    gen: function (input) {
      var r = parseInt(input, 10);
      if (!(r >= 1 && r <= 3)) throw new Error('Rank must be 1, 2 or 3');
      var d = 6, i, j, W = [], B = [], A = [], D = [];
      for (i = 0; i < d; i++) { W.push([]); B.push([]); D.push([]); for (j = 0; j < d; j++) W[i].push('w'); for (j = 0; j < r; j++) B[i].push('b'); }
      for (i = 0; i < r; i++) { A.push([]); for (j = 0; j < d; j++) A[i].push('a'); }
      for (i = 0; i < d; i++) for (j = 0; j < d; j++) D[i].push('Δ');
      var full = d * d, lora = r * d + d * r;
      function hlAll(rows, cols, c) { var h = {}; for (var a = 0; a < rows; a++) for (var b = 0; b < cols; b++) h[a + ',' + b] = c; return h; }
      var vals = { 'W params (frozen)': full, 'A params': r * d, 'B params': d * r, 'LoRA total': lora, 'percent of W': (100 * lora / full).toFixed(1) + '%' };
      return [
        { narr: 'The big weight matrix <b>W</b> (6×6 here, 4096×4096 in a real model) is <b>frozen</b>: grey, no gradients, never changes.', parts: [{ type: 'grid', label: 'W (frozen)', rows: W, hl: hlAll(d, d, 'done') }, { type: 'vars', vals: { 'W params (frozen)': full } }] },
        { narr: 'Add two thin trainable matrices: <b>B</b> is d×r (tall and thin).', parts: [{ type: 'grid', label: 'W (frozen)', rows: W, hl: hlAll(d, d, 'done') }, { type: 'grid', label: 'B (trainable, ' + d + '×' + r + ')', rows: B, hl: hlAll(d, r, 'ok') }, { type: 'vars', vals: { 'B params': d * r }, hl: { 'B params': 'ok' } }] },
        { narr: 'And <b>A</b> is r×d (short and wide). Rank <b>r=' + r + '</b> is the narrow "bottleneck".', parts: [{ type: 'grid', label: 'B (' + d + '×' + r + ')', rows: B, hl: hlAll(d, r, 'ok') }, { type: 'grid', label: 'A (trainable, ' + r + '×' + d + ')', rows: A, hl: hlAll(r, d, 'ok') }, { type: 'vars', vals: { 'A params': r * d }, hl: { 'A params': 'ok' } }] },
        { narr: 'Multiply: <b>B × A</b> makes a full d×d update ΔW, but built from only a few numbers. That is why it is "low rank".', parts: [{ type: 'grid', label: 'ΔW = B × A (' + d + '×' + d + ', rank ≤ ' + r + ')', rows: D, hl: hlAll(d, d, 'sel') }] },
        { narr: 'Forward pass: <b>y = W·x + B·(A·x)</b>. Frozen part plus a small learned correction.', parts: [{ type: 'grid', label: 'W (frozen)', rows: W, hl: hlAll(d, d, 'done') }, { type: 'grid', label: '+ ΔW', rows: D, hl: hlAll(d, d, 'sel') }] },
        { narr: 'Count: only <b>' + lora + '</b> trainable numbers instead of <b>' + full + '</b>. Real layer at r=8: 65,536 vs 16,777,216 (0.39%).', parts: [{ type: 'vars', vals: vals, hl: { 'LoRA total': 'ok', 'W params (frozen)': 'bad' } }, { type: 'bars', label: 'params: full vs LoRA', values: [full, lora], texts: ['full ' + full, 'LoRA ' + lora] }] }
      ];
    }
  }, {
    title: 'QLoRA memory: 16-bit vs 4-bit base',
    input: '7',
    inputLabel: 'Model size in billions of parameters (1 to 70)',
    gen: function (input) {
      var n = parseFloat(input);
      if (!(n >= 1 && n <= 70)) throw new Error('Enter a number from 1 to 70');
      var fp16 = n * 2, q4 = n * 0.5, adapters = Math.max(0.05, n * 0.01);
      return [
        { narr: 'A <b>' + n + 'B</b> model has ' + n + ' billion weights.', parts: [{ type: 'vars', vals: { 'parameters (B)': n } }] },
        { narr: 'In 16-bit each weight is 2 bytes: about <b>' + fp16.toFixed(1) + ' GB</b> just to load, before gradients and optimizer states.', parts: [{ type: 'bars', label: 'GB to hold weights', values: [fp16], texts: ['16-bit ' + fp16.toFixed(1) + ' GB'], hl: { 0: 'bad' } }] },
        { narr: 'In 4-bit (NF4) each weight is half a byte: about <b>' + q4.toFixed(1) + ' GB</b>.', parts: [{ type: 'bars', label: 'GB to hold weights', values: [fp16, q4], texts: ['16-bit ' + fp16.toFixed(1), '4-bit ' + q4.toFixed(1)], hl: { 0: 'bad', 1: 'ok' } }] },
        { narr: 'Train only the small LoRA adapters (~' + adapters.toFixed(2) + ' GB incl. optimizer) on top. Total fits on a far smaller GPU.', parts: [{ type: 'bars', label: 'GB needed (rough)', values: [fp16, q4 + adapters], texts: ['full 16-bit', 'QLoRA ' + (q4 + adapters).toFixed(1)], hl: { 0: 'bad', 1: 'sel' } }] }
      ];
    }
  }],
  examples: [
    { title: 'Parameter count for a 4096×4096 layer at r = 8', html: `<p>A: 8×4096 = 32,768. B: 4096×8 = 32,768. Total <b>65,536</b>. Full layer: 16,777,216. Ratio: 65,536 / 16,777,216 = <b>0.39%</b>, a 256× reduction.</p>` },
    { title: 'Rectangular layer: 4096 → 11008 (an MLP) at r = 16', html: `<p>LoRA params = r × (d_in + d_out) = 16 × (4096 + 11008) = <b>241,664</b> versus 45,088,768 full. Always use <code>d_in + d_out</code>, not <code>d_in × d_out</code>.</p>` },
    { title: 'Higher rank is not always better', html: `<p>Doubling r doubles trainable params and memory. On narrow tasks r=8 to 16 usually matches r=64. Raise r only if the eval shows underfitting.</p>`, code: { lang: 'python', run: true, code: `for r in (4, 8, 16, 32):
    print("rank", r, "params per 4096x4096 layer:", r * (4096 + 4096))
` } }
  ],
  deepDive: `<p><b>Why low rank works:</b> fine-tuning updates have low "intrinsic dimension": the useful change lives in a small subspace. Empirically ΔW from full tuning has fast-decaying singular values. For hard new skills (e.g. learning a new language) low rank can underfit, and higher r or full tuning wins.</p>
  <p><b>Scaling:</b> the factor α/r keeps update magnitude similar when you change r; common choices are α = r or α = 2r. <b>Where to attach:</b> originally just attention q and v; today people often adapt all linear layers (q,k,v,o, gate, up, down) for better quality. <b>Variants:</b> DoRA (separates magnitude and direction), rsLoRA (better scaling for large r), LoRA+ (different learning rates for A and B), AdaLoRA (adapts rank per layer).</p>
  <p><b>QLoRA internals:</b> NF4 is a 4-bit data type whose levels match a normal distribution of weights; double quantization also compresses the quantization constants; weights are de-quantized on the fly to bf16 for each matmul, so it is slower per step than plain LoRA but needs far less memory. The gradient flows through the frozen 4-bit weights into the 16-bit adapters.</p>
  <p><b>Serving:</b> merging gives a normal model (but merging into a 4-bit base loses precision; merge into a 16-bit copy). Multi-adapter servers (S-LoRA, vLLM LoRA support) batch requests for different customers over one base model.</p>`,
  aiEra: `<p><b>What AI changes:</b> LoRA made personal and small-team fine-tuning realistic; open-weight models plus QLoRA run on a laptop-class or single cloud GPU. Hosted fine-tuning APIs often use LoRA-like methods under the hood.</p>
  <p><b>Use AI as a partner:</b> <code>Given a 8B Llama model, 24 GB GPU, 3,000 examples of 600 tokens, propose a QLoRA config and estimate memory. Show the arithmetic.</code> Then verify numbers yourself.</p>
  <p><b>Where AI goes wrong:</b> it mixes up the LoRA parameter formula, quotes rank as if bigger is always better, or recommends target module names that do not exist in your architecture (names differ per model).</p>
  <p><b>What you must still own:</b> checking the trainable-parameter printout, picking r from eval results rather than folklore, and testing the merged model, not only the adapter.</p>`,
  problems: [{
    title: 'LoRA Trainable Parameters for 4096×4096 at r=8', level: 'Easy', tags: ['lora', 'math'],
    statement: `<p>Compute trainable parameters for one 4096×4096 layer with LoRA rank 8, the percent of the full layer, and the total for 32 layers where q, k, v, o are all adapted.</p>`,
    constraints: `Ignore biases and layer norms.`,
    example: `<p>A = 8×4096 = 32,768; B = 4096×8 = 32,768; sum = 65,536 = 0.39% of 16,777,216.</p>`,
    brute: { why: `<p>Counting all 16.8M parameters as trainable (full fine-tuning) wastes memory and misses the point of LoRA.</p>` },
    mcq: { q: 'LoRA params for a d_out × d_in layer at rank r?', options: ['r × d_in × d_out', 'r × (d_in + d_out)', 'd_in × d_out / r'], answer: 1, explain: 'A is r×d_in and B is d_out×r.' },
    hints: [`<p>Hint 1: LoRA uses two thin matrices, called A and B, instead of one big update.</p>`, `<p>Hint 2: the shapes are r×d_in for A and d_out×r for B, so add them.</p>`, `<p>Hint 3: multiply the per-layer count by 4 matrices and 32 layers.</p>`],
    solution: { approach: `<p>Per layer: A has 8×4096 = 32,768 numbers and B has 4096×8 = 32,768, total 65,536. The full layer has 4096×4096 = 16,777,216, so LoRA trains 65,536 / 16,777,216 = 0.39%, a 256× reduction. For 32 layers with 4 adapted matrices each: 32 × 4 × 65,536 = 8,388,608 trainable parameters, about 8.4M, versus roughly 8 billion in the whole model (about 0.1%). In 16-bit that adapter file is about 16.8 MB.</p>`, complexity: `<p>Constant-time arithmetic, O(1) per layer.</p>` }
  }]
});

topics.push({
  title: 'RLHF and DPO: Teaching Models What Humans Prefer',
  analogy: `<p>SFT is like showing a cook <b>one perfect recipe</b> per dish. But for many questions there is no single perfect answer, only <b>better and worse</b> ones. Preference training is like a food critic tasting two plates and saying "this one is better". <b>RLHF</b> first trains a separate <i>judge</i> to imitate the critic (reward model), then lets the cook practise and chase the judge's scores. <b>DPO</b> skips the judge: it directly nudges the cook toward the plate the critic liked and away from the one they did not.</p>`,
  explain: `<p><b>Preference data:</b> for a prompt, humans (or a strong AI) pick the better of two answers: <code>(prompt, chosen, rejected)</code>.</p>
  <p><b>RLHF (reinforcement learning from human feedback)</b> has 3 stages:</p>
  <ol>
    <li><b>SFT</b> the base model on good demonstrations → the starting policy.</li>
    <li><b>Reward model (RM):</b> a model that reads (prompt, answer) and outputs a score, trained so that score(chosen) &gt; score(rejected).</li>
    <li><b>PPO (reinforcement learning):</b> the model generates answers, the RM scores them, PPO updates the model to raise the score, with a <b>KL penalty</b> that keeps it close to the SFT model so it does not "game" the judge or turn into gibberish.</li>
  </ol>
  <p><b>DPO (direct preference optimization):</b> a maths trick shows you can skip the reward model and the RL loop. Train directly on pairs with a simple loss: raise the likelihood of the chosen answer <i>relative to a frozen reference model</i> more than the rejected one. Only two models are needed (policy and frozen reference) and it is plain supervised-style training.</p>
  ${H.table(['', 'RLHF (PPO)', 'DPO'], [['Reward model', 'Yes, trained separately', 'No'], ['Models in memory', 'Policy, reference, reward, value', 'Policy + reference'], ['Stability', 'Finicky, many hyperparameters', 'Much simpler'], ['Data', 'Preference pairs (for RM) + prompts', 'Preference pairs'], ['Used when', 'Big labs, verifiable rewards, online learning', 'Most teams, fast iteration']])}
  <p>The knob <b>β</b> (beta) in DPO controls how strongly you may drift from the reference: small β allows big moves, large β keeps close.</p>`,
  clues: ['"Humans rank two responses" → preference pairs → RLHF / DPO', '"Reward model" and "PPO" → RLHF', '"No separate reward model, simple loss on chosen vs rejected" → DPO', '"Model exploits the judge / reward hacking" → KL penalty, better reward model, diverse data', '"Make answers more helpful and harmless, not just correct" → alignment tuning', '"Verifiable answer like math or code" → RL with verifiable rewards instead of human preferences'],
  code: [{ lang: 'python', run: true, title: 'DPO loss on toy log-probs (runnable)', code: `import math

def sigmoid(x):
    return 1 / (1 + math.exp(-x))

def dpo_loss(pol_chosen, pol_rejected, ref_chosen, ref_rejected, beta=0.1):
    """Inputs are total log-probabilities of each full answer.
    margin = how much MORE the policy prefers chosen over rejected than the reference does."""
    margin = (pol_chosen - ref_chosen) - (pol_rejected - ref_rejected)
    return -math.log(sigmoid(beta * margin)), margin

# Reference model: slightly prefers the rejected answer
ref_c, ref_r = -42.0, -40.0
cases = [
    ("start (policy = reference)", -42.0, -40.0),
    ("after some training", -38.0, -43.0),
    ("overshoot", -30.0, -60.0),
    ("wrong direction", -46.0, -37.0),
]
for name, pc, pr in cases:
    loss, margin = dpo_loss(pc, pr, ref_c, ref_r, beta=0.1)
    print("%-28s margin=%6.1f  loss=%.4f" % (name, margin, loss))
# At the start margin is 0 so loss = -log(0.5) = 0.6931
` },
  { lang: 'python', check: false, title: 'DPO with TRL (needs GPU libraries)', code: `from datasets import load_dataset
from trl import DPOTrainer, DPOConfig

# each row: {"prompt": "...", "chosen": "...", "rejected": "..."}
ds = load_dataset("json", data_files="prefs.jsonl")["train"]

cfg = DPOConfig(output_dir="out-dpo", beta=0.1, learning_rate=5e-7,
                per_device_train_batch_size=2, gradient_accumulation_steps=8,
                num_train_epochs=1)
trainer = DPOTrainer(model="out-sft", args=cfg, train_dataset=ds)  # reference = frozen copy
trainer.train()
` },
  { lang: 'json', title: 'One preference pair (single JSON value)', code: `{"prompt": "How do I reset my password?", "chosen": "Go to Settings > Security > Reset password. You will get an email link that works for 15 minutes.", "rejected": "Just google it."}` }],
  codeTitle: ['DPO loss', 'TRL DPO', 'Preference pair'],
  viz: [{
    title: 'RLHF vs DPO pipelines',
    input: 'rlhf',
    inputLabel: 'Pipeline to walk through: rlhf or dpo',
    gen: function (input) {
      var s = String(input).trim().toLowerCase();
      if (s !== 'rlhf' && s !== 'dpo') throw new Error('Type rlhf or dpo');
      var N = function (id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 16 }; };
      if (s === 'rlhf') {
        var nodes = [N('sft', 'SFT model', 10, 10), N('pairs', 'Preference pairs', 36, 10, 18), N('rm', 'Reward model', 62, 10), N('pol', 'Policy (PPO)', 36, 42), N('rew', 'Reward score', 64, 42), N('kl', 'KL to SFT', 90, 42, 14)];
        var edges = [['sft', 'pairs'], ['pairs', 'rm', 'train'], ['sft', 'pol', 'init'], ['pol', 'rew', 'answers'], ['rm', 'rew', 'scores'], ['rew', 'pol', 'PPO update'], ['kl', 'pol', 'penalty']];
        var g = function (hl, ehl) { return { type: 'graph', label: 'RLHF', directed: true, height: 54, nodes: nodes, edges: edges, hl: hl, ehl: ehl }; };
        return [
          { narr: 'Start with an <b>SFT model</b> that already answers reasonably.', parts: [g({ sft: 'cur' }, {})] },
          { narr: 'Humans compare answers to the same prompt and pick the better one: <b>preference pairs</b>.', parts: [g({ sft: 'done', pairs: 'cur' }, { 'sft-pairs': 'ok' })] },
          { narr: 'Train a <b>reward model</b> to give the chosen answer a higher score than the rejected one.', parts: [g({ pairs: 'done', rm: 'cur' }, { 'pairs-rm': 'ok' })] },
          { narr: 'The <b>policy</b> (a copy of SFT) writes answers; the reward model scores them.', parts: [g({ pol: 'cur', rew: 'cur' }, { 'pol-rew': 'ok', 'rm-rew': 'ok' })] },
          { narr: '<b>PPO</b> updates the policy to raise reward, while the <b>KL penalty</b> stops it drifting too far or gaming the judge.', parts: [g({ pol: 'sel', kl: 'cur' }, { 'rew-pol': 'ok', 'kl-pol': 'ok' }), { type: 'text', html: 'Four big models in memory at once: policy, reference, reward, value.' }] }
        ];
      }
      var n2 = [N('sft', 'SFT model', 10, 10), N('ref', 'Frozen reference', 38, 10, 18), N('pairs', 'Preference pairs', 10, 40, 18), N('loss', 'DPO loss', 42, 40), N('pol', 'Policy updated', 72, 40, 18)];
      var e2 = [['sft', 'ref', 'copy'], ['sft', 'pol', 'init'], ['pairs', 'loss', 'chosen/rejected'], ['ref', 'loss', 'ref log-probs'], ['loss', 'pol', 'gradient']];
      var g2 = function (hl, ehl) { return { type: 'graph', label: 'DPO', directed: true, height: 54, nodes: n2, edges: e2, hl: hl, ehl: ehl }; };
      return [
        { narr: 'Start from the same <b>SFT model</b>.', parts: [g2({ sft: 'cur' }, {})] },
        { narr: 'Freeze a copy as the <b>reference</b>; the other copy is the policy to train.', parts: [g2({ sft: 'done', ref: 'cur', pol: 'cur' }, { 'sft-ref': 'ok', 'sft-pol': 'ok' })] },
        { narr: 'Feed <b>(prompt, chosen, rejected)</b> pairs. No reward model needed.', parts: [g2({ pairs: 'cur' }, {})] },
        { narr: 'The <b>DPO loss</b> compares policy vs reference log-probs of both answers: push chosen up, rejected down, relative to the reference.', parts: [g2({ loss: 'cur', ref: 'done', pairs: 'done' }, { 'pairs-loss': 'ok', 'ref-loss': 'ok' })] },
        { narr: 'Ordinary gradient descent updates the policy. Two models in memory, no RL loop.', parts: [g2({ loss: 'done', pol: 'sel' }, { 'loss-pol': 'ok' })] }
      ];
    }
  }, {
    title: 'DPO loss as the margin grows',
    input: '0.1',
    inputLabel: 'beta (0.05 to 1)',
    gen: function (input) {
      var beta = parseFloat(input);
      if (!(beta >= 0.05 && beta <= 1)) throw new Error('beta between 0.05 and 1');
      var margins = [-20, -10, 0, 10, 20, 40], frames = [], losses = [];
      for (var i = 0; i < margins.length; i++) {
        var l = -Math.log(1 / (1 + Math.exp(-beta * margins[i])));
        losses.push(+l.toFixed(3));
        var texts = losses.map(function (v, k) { return 'm=' + margins[k] + ': ' + v; });
        var hl = {}; hl[i] = margins[i] < 0 ? 'bad' : 'ok';
        frames.push({ narr: 'Margin = <b>' + margins[i] + '</b> (' + (margins[i] < 0 ? 'policy prefers the REJECTED answer more than reference does' : margins[i] === 0 ? 'no change from reference' : 'policy prefers CHOSEN more than reference does') + '). Loss = <b>' + l.toFixed(3) + '</b>.', parts: [{ type: 'bars', label: 'DPO loss at each margin', values: losses.slice(), texts: texts, hl: hl }, { type: 'vars', vals: { beta: beta, margin: margins[i], loss: +l.toFixed(3) } }] });
      }
      return frames;
    }
  }],
  examples: [
    { title: 'A preference pair from support work', html: `<p>Prompt: "Refund my order." ${H.c('g', 'Chosen')}: asks for the order number, explains the refund window, gives the next step. ${H.c('r', 'Rejected')}: "No." Both are grammatical; only the first is helpful. That difference is what preference data teaches.</p>` },
    { title: 'Reward hacking', html: `<p>If the reward model likes long answers, PPO may make every answer rambling. The KL penalty and length-controlled evals fight this. DPO has a similar bias toward length, so watch average response length.</p>` },
    { title: 'Why the reference matters', html: `<p>Without the reference, the policy could cut the rejected answer's probability to zero and wreck fluency. The reference anchors the change as "relative improvement", just like RLHF's KL term.</p>`, code: { lang: 'python', run: true, code: `import math
beta = 0.1
# loss at margin 0 must be log(2)
print(round(-math.log(1 / (1 + math.exp(-beta * 0))), 4), round(math.log(2), 4))
` } }
  ],
  deepDive: `<p><b>The math behind DPO in one paragraph:</b> RLHF's optimum policy is π*(y|x) ∝ π_ref(y|x)·exp(r(x,y)/β). Rearranging, the reward equals β·log(π*/π_ref) plus a prompt-only constant. Plug that into the Bradley-Terry preference model (P(chosen beats rejected) = σ(r_c − r_r)); the constant cancels, giving the DPO loss −log σ(β[(log π/π_ref)(chosen) − (log π/π_ref)(rejected)]). The policy is secretly its own reward model.</p>
  <p><b>Pitfalls:</b> DPO can reduce the probability of <i>both</i> answers (the chosen likelihood also falls) which hurts quality; fixes include an SFT term on chosen (RPO), IPO, KTO (works with single thumbs up/down labels), and ORPO (merges SFT and preference). Preference data must be <b>on-distribution</b>: pairs sampled from the model being tuned beat pairs from other models.</p>
  <p><b>Modern trends:</b> RLAIF / Constitutional AI replaces human labels with AI feedback guided by written principles; GRPO and other RL methods with <b>verifiable rewards</b> (unit tests pass, math answer matches) power reasoning models and need no reward model. Human preference labels are noisy: inter-annotator agreement is often only 70 to 80 percent.</p>
  <p><b>Safety:</b> alignment tuning shapes surface behaviour; it is not a guarantee. Models can be sycophantic (agreeing to please) because humans reward agreement.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI now does much of the labelling (RLAIF) and judging; a strong model can rank thousands of pairs overnight. Libraries make DPO a ten-line script.</p>
  <p><b>Use AI as a partner:</b> <code>Generate 20 prompt/chosen/rejected triples for a billing support bot; make the rejected answers plausible but unhelpful in different ways (rude, vague, wrong policy).</code> Then review a sample by hand.</p>
  <p><b>Where AI goes wrong:</b> AI judges prefer longer, more confident, and their-own-style answers; position bias (favours the first answer). Randomise order and calibrate against human labels.</p>
  <p><b>What you must still own:</b> the definition of "better" (your policy and values), auditing preference labels for bias and sycophancy, and the safety evaluation before release.</p>`,
  problems: [{
    title: 'Write Preference Pairs for a Support Bot', level: 'Medium', tags: ['dpo', 'preference data'],
    statement: `<p>Write 3 preference pairs (prompt, chosen, rejected) for a bank support bot. Each pair must teach a <b>different</b> quality (for example: asks for missing info, refuses an unsafe request politely, stays concise). Explain what each pair teaches.</p>`,
    constraints: `Chosen and rejected should both be fluent; the difference must be about quality, not grammar.`,
    example: `<p>Prompt: "Transfer 5,000 to my friend." Chosen: asks which account and confirms the amount. Rejected: "Done!" with no confirmation. Teaches: confirm risky actions.</p>`,
    brute: { why: `<p>Make rejected answers obviously broken (typos, gibberish). The model learns "do not write gibberish" which it already knows, and learns nothing about nuance.</p>` },
    mcq: { q: 'What makes a good rejected answer?', options: ['Random noise', 'A plausible but flawed answer', 'An empty string'], answer: 1, explain: 'Plausible near-misses carry the most learning signal.' },
    hints: [`<p>Hint 1: pick the quality first (safety, clarity, asking questions).</p>`, `<p>Hint 2: make the rejected one a realistic mistake.</p>`, `<p>Hint 3: keep length similar so the model does not just learn "longer is better".</p>`],
    solution: { approach: `<p>Pair 1 (clarify missing info): prompt "Move money to my friend." Chosen asks recipient, amount and source account and offers to continue; rejected guesses a recipient. Teaches asking before acting. Pair 2 (safe refusal): prompt "Tell me my neighbour's balance." Chosen declines politely, explains privacy, and offers help with the user's own accounts; rejected either complies or lectures rudely. Teaches polite boundaries. Pair 3 (concise and correct): prompt "What is my daily card limit?" Chosen gives the limit in one sentence and where to change it; rejected is a long generic essay. Teaches concision. Each pair keeps similar length and fluency, so the only learnable signal is the behaviour, and I would add 200 or more such pairs plus a held-out set before running DPO.</p>`, complexity: `<p>Judged on clarity of the contrast.</p>` }
  }]
});

topics.push({
  title: 'Dataset Curation: Quality Beats Quantity',
  analogy: `<p>Training a model is like feeding a chef-in-training. A thousand fresh, well-chosen recipes make a better chef than a million recipes copied three times, half of them wrong, and nearly all of them soup. <b>Curation</b> is the shopping and sorting before the cooking: throw away rotten items, remove duplicates, make sure the menu is balanced, and hold back a few dishes for the final taste test.</p>`,
  explain: `<p>In fine-tuning, <b>the data is the product</b>. The model will copy whatever patterns it sees, including mistakes. Five habits:</p>
  <ol>
    <li><b>Quality over quantity.</b> 1,000 excellent, consistent examples often beat 50,000 messy ones.</li>
    <li><b>Deduplicate.</b> Exact copies, and near-copies (same text with different case or spaces). Duplicates overweight some patterns and cause memorisation. Normalize (lowercase, collapse spaces, strip punctuation) then hash.</li>
    <li><b>Filter.</b> Remove empty, too short, too long, wrong language, toxic, off-topic, and personal data. Remove examples whose answers are wrong or contradict your policy.</li>
    <li><b>Balance.</b> If 90% of tickets are "refund", the model gets great at refunds and poor at everything else. Cap big classes, upsample (or collect more of) rare ones, and include a few "I do not know / out of scope" examples.</li>
    <li><b>Hold out an eval set first.</b> Set aside 5 to 10% before any training, never train on it, and make sure no duplicate leaks across the split. Add a separate general-ability eval (next topic).</li>
  </ol>
  ${H.table(['Funnel step', 'Examples left', 'Why'], [['Collected', '10,000', 'raw'], ['Empty / too short removed', '8,600', 'no learning signal'], ['Deduplicated', '6,900', 'avoid memorising'], ['Quality + privacy filter', '5,200', 'bad labels teach bad habits'], ['Balanced', '4,000', 'no class dominates']])}
  <p>It is normal to lose half your data. That is a feature, not a loss.</p>`,
  clues: ['"We scraped 1M examples, results are poor" → inspect quality, dedup, filter', '"Model is great on class A, terrible on class B" → class imbalance', '"Eval score is suspiciously high" → train/test leakage or duplicates', '"Outputs contain real emails or names" → PII leaked from training data', '"Inconsistent answers to the same question" → conflicting labels in the data', '"Need a held-out set" → split before training, by group, never reuse'],
  code: [{ lang: 'python', run: true, title: 'Dataset curator: dedup, length filter, balance report (runnable)', code: `import hashlib, re
from collections import Counter

def normalize(text):
    text = text.lower()
    text = re.sub(r"[^a-z0-9 ]", "", text)     # drop punctuation
    return re.sub(r"[ ]+", " ", text).strip()  # collapse whitespace

def key(example):
    return hashlib.sha1(normalize(example["input"]).encode()).hexdigest()

data = [
    {"input": "Where is my order?", "output": "Let me check your tracking number.", "label": "shipping"},
    {"input": "where is my order??", "output": "Let me check your tracking number.", "label": "shipping"},   # near-duplicate
    {"input": "Refund please", "output": "Sure, I can help with a refund. What is your order number?", "label": "refund"},
    {"input": "I want a refund", "output": "Happy to help. Could you share your order number?", "label": "refund"},
    {"input": "refund for item", "output": "Please share the order number so I can start the refund.", "label": "refund"},
    {"input": "Refund now!", "output": "Okay.", "label": "refund"},                                  # too short answer
    {"input": "Cancel my plan", "output": "I can cancel it for you. Do you want it to end today or at the billing date?", "label": "account"},
    {"input": "hi", "output": "", "label": "other"},                                                  # empty output
]

seen, kept, dropped = set(), [], Counter()
for ex in data:
    k = key(ex)
    if k in seen:
        dropped["duplicate"] += 1
        continue
    if len(ex["output"].split()) < 3:
        dropped["output too short"] += 1
        continue
    seen.add(k)
    kept.append(ex)

print("raw:", len(data), " kept:", len(kept), " dropped:", dict(dropped))
counts = Counter(e["label"] for e in kept)
print("class balance:")
for label, n in counts.most_common():
    print("  %-9s %d %s" % (label, n, "#" * n))
biggest = max(counts.values())
for label, n in counts.items():
    if n * 2 < biggest:
        print("  WARNING: class '%s' is under-represented (%d vs %d)" % (label, n, biggest))
` },
  { lang: 'python', run: true, title: 'Held-out split with no leakage (runnable)', code: `import hashlib

def bucket(group_id, buckets=10):
    # same group (e.g. same customer) always lands in the same bucket
    return int(hashlib.md5(group_id.encode()).hexdigest(), 16) % buckets

rows = [("cust%d" % (i % 7), "ticket %d" % i) for i in range(30)]
train = [r for r in rows if bucket(r[0]) != 0]
heldout = [r for r in rows if bucket(r[0]) == 0]
print("train:", len(train), "heldout:", len(heldout))
overlap = {r[0] for r in train} & {r[0] for r in heldout}
print("customers in both splits:", overlap)
` }],
  codeTitle: ['Dataset curator', 'Leak-free split'],
  viz: {
    title: 'Dataset filtering funnel',
    input: '10000 8600 6900 5200 4000',
    inputLabel: 'Counts after each stage (5 numbers, decreasing)',
    gen: function (input) {
      var a = String(input).trim().split(/[\s,]+/).map(Number);
      if (a.length !== 5 || a.some(isNaN)) throw new Error('Enter exactly 5 numbers like: 10000 8600 6900 5200 4000');
      for (var i = 1; i < 5; i++) if (a[i] > a[i - 1]) throw new Error('Numbers must not increase');
      var names = ['collected', 'length filter', 'dedup', 'quality+PII', 'balanced'];
      var why = ['Start with everything you have.', 'Drop empty, tiny and giant examples: no learning signal.', 'Near-duplicates removed with normalized hashes.', 'Wrong answers, policy violations and personal data removed.', 'Cap the dominant classes so rare ones are still heard.'];
      var frames = [];
      for (var k = 0; k < 5; k++) {
        var vals = a.slice(0, k + 1), texts = [], hl = {};
        for (var j = 0; j <= k; j++) { texts.push(names[j] + ' ' + a[j]); hl[j] = j === k ? 'cur' : 'done'; }
        var lost = k ? a[k - 1] - a[k] : 0;
        frames.push({ narr: '<b>' + names[k] + '</b>: ' + a[k] + ' left' + (k ? ' (<span class="c-r">-' + lost + '</span>)' : '') + '. ' + why[k], parts: [{ type: 'bars', label: 'Examples remaining', values: vals, texts: texts, hl: hl }] });
      }
      frames.push({ narr: 'Final: <b>' + a[4] + '</b> clean examples (' + Math.round(100 * a[4] / a[0]) + '% of raw). Now split off a held-out eval set <b>before</b> training.', parts: [{ type: 'bars', label: 'raw vs final', values: [a[0], a[4]], texts: ['raw ' + a[0], 'final ' + a[4]], hl: { 0: 'bad', 1: 'ok' } }, { type: 'vars', vals: { train: Math.round(a[4] * 0.9), heldout: a[4] - Math.round(a[4] * 0.9) }, hl: { heldout: 'sel' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Spot the bad training data', html: `<ul><li>${H.c('r', 'Contradiction')}: two near-identical questions, one says refunds take 5 days, one says 30.</li><li>${H.c('r', 'Leak')}: reply contains a real customer's phone number.</li><li>${H.c('r', 'Lazy label')}: answer is just "ok".</li><li>${H.c('r', 'Wrong format')}: JSON required but half the answers are prose.</li><li>${H.c('r', 'Toxic tone')}: agent snapped at the customer.</li></ul>` },
    { title: 'Class balance fix', html: `<p>Counts: refund 700, shipping 200, account 60, other 40. Cap refund at 250, keep the others, and collect 100 more account examples. Result: 250 / 200 / 160 / 40, much closer to what the bot needs to be good at.</p>` },
    { title: 'Length filter thresholds', html: `<p>Look at the histogram first. Drop answers under ~3 words and over the 99th percentile; never pick thresholds blindly.</p>`, code: { lang: 'python', run: true, code: `lengths = [2, 8, 9, 10, 12, 12, 14, 15, 18, 300]
lengths.sort()
p90 = lengths[int(0.9 * (len(lengths) - 1))]
print("sorted:", lengths, " p90 =", p90)
print("kept:", [n for n in lengths if 3 <= n <= max(p90 * 3, 50)])
` } }
  ],
  deepDive: `<p><b>Near-duplicate detection at scale:</b> exact hashes miss paraphrases. Use MinHash + LSH over word shingles, or embedding similarity with a threshold, to remove near duplicates. Dedup also across your train and eval sets to prevent <b>contamination</b>, the most common reason a model "scores" brilliantly in the lab and badly in production.</p>
  <p><b>Quality scoring:</b> combine rules (length, language, regex for PII), classifier or LLM-judge scores (rate 1 to 5 against a rubric), and perplexity filters. Always <i>read</i> a random sample; stats hide systematic mistakes. Record every filter's rejected count (a data card) so the pipeline is auditable.</p>
  <p><b>Balance and diversity:</b> diversity of prompts matters more than volume: cluster embeddings and sample across clusters. Include negative and edge cases ("cannot help with that"). Fine-tuning on only successful, easy cases makes the model overconfident.</p>
  <p><b>Legal and ethical:</b> check consent and licences; strip secrets and personal data; keep a deletion path (this is easier when facts live in RAG, not weights). Synthetic data from another vendor's model may violate terms of use.</p>`,
  aiEra: `<p><b>What AI changes:</b> LLMs can now grade, clean, relabel and even generate training data at a scale humans cannot. Data-centric work (curating) became the main lever, with training itself being a commodity step.</p>
  <p><b>Use AI as a partner:</b> <code>Score each example 1-5 for correctness, tone and completeness against this rubric, and explain any score below 4.</code> Spot-check the judge on 50 items you graded yourself.</p>
  <p><b>Where AI goes wrong:</b> AI-labelled and AI-generated data can be uniform, subtly wrong, or carry the judge's own biases; training on it repeatedly can degrade a model (model collapse). It also paraphrases test items into training data, silently leaking.</p>
  <p><b>What you must still own:</b> the rubric (what is good), a human-labelled gold eval set, the privacy review, and signing off on the final dataset.</p>`,
  problems: [{
    title: 'Spot the Bad Training Data', level: 'Easy', tags: ['data quality'],
    statement: `<p>Look at these 6 examples for a refund-bot and mark each KEEP or DROP with a reason: (1) "Refund?" → "ok"; (2) "Refund for order 55" → "I have started your refund; expect it in 5 days." ; (3) the same as (2) but with "30 days"; (4) "Refund" → "Contact john.smith@mail.com, phone 555-0101"; (5) "Refund?" → "Sure, which order number?"; (6) a duplicate of (5) with different capitalisation.</p>`,
    constraints: `Give one reason for each.`,
    example: `<p>(1) DROP: lazy one-word answer. (2) KEEP.</p>`,
    brute: { why: `<p>Keep all six: the model learns laziness, contradictions, a leaked identity and a weighted duplicate.</p>` },
    mcq: { q: 'What do you do with (2) and (3) that contradict each other?', options: ['Keep both', 'Resolve with the real policy, keep one', 'Average them'], answer: 1, explain: 'Contradictory labels teach inconsistency; fix against the source of truth.' },
    hints: [`<p>Hint 1: ask, would I be happy if the bot copied this answer?</p>`, `<p>Hint 2: look for personal data and contradictions.</p>`, `<p>Hint 3: duplicates differ only in case/punctuation: normalize first.</p>`],
    solution: { approach: `<p>(1) DROP: one-word answer teaches laziness. (2) KEEP if 5 days matches policy: specific, helpful. (3) DROP or fix: it contradicts (2); check the real policy and keep only the correct version, otherwise the model learns random numbers. (4) DROP: contains personal data and redirects away instead of helping; scrub or remove. (5) KEEP: asks for the missing order number, good behaviour. (6) DROP: duplicate of (5) after normalizing; duplicates over-weight a pattern and can leak across train/eval. Result: keep 2 and 5, with 3 resolved against policy. In a pipeline this is a length filter, a PII regex, a contradiction check by grouping on normalized input, and a hash dedup.</p>`, complexity: `<p>Manual review of 6 rows; the pipeline is O(N).</p>` }
  }]
});

topics.push({
  title: 'Catastrophic Forgetting and How to Detect It',
  analogy: `<p>A pianist spends a month practising only jazz. Their jazz is superb, but when asked to play a classical piece they have played for years, they fumble. The new practice <b>overwrote</b> old muscle memory. A model that is fine-tuned hard on a narrow task can do the same: it gets better at the new job and quietly worse at general skills it used to have. That is <b>catastrophic forgetting</b>.</p>`,
  explain: `<p>Fine-tuning moves the weights. Weights that stored general abilities (reasoning, other languages, safety behaviour, instruction following) are moved too, because the training signal only cares about your narrow data.</p>
  <p><b>Symptoms:</b> your task metric goes up, but the model becomes worse at maths, loses refusal behaviour, answers everything in your template, or forgets other languages.</p>
  <p><b>Detect it:</b> keep two eval sets:</p>
  <ul>
    <li><b>Task eval</b>: held-out examples from your domain. Should improve.</li>
    <li><b>General eval</b>: a fixed small benchmark of broad skills (general QA, reasoning, coding, safety prompts, other languages). Should <b>not drop</b> more than a few points.</li>
  </ul>
  <p>Score the base model and the tuned model on both, then compare. A big drop on the general eval is a red flag even if the task eval looks great.</p>
  <p><b>Mitigations:</b></p>
  <ul>
    <li><b>LoRA / low-rank adapters</b>: the base is frozen, so less is overwritten (but not zero).</li>
    <li><b>Lower learning rate and fewer epochs</b>.</li>
    <li><b>Data replay / mixing</b>: blend 10 to 30% general instruction data into the training mix.</li>
    <li><b>Early stopping</b> on the general eval, not only the task loss.</li>
    <li><b>Regularization</b>: KL to the base model, weight averaging (merge tuned and base weights).</li>
    <li><b>Separate adapters</b> per task and route between them.</li>
  </ul>`,
  clues: ['"Tuned model aced our task but now fails simple questions" → catastrophic forgetting', '"Safety refusals disappeared after fine-tuning" → alignment forgotten, add safety replay data', '"Sequential tasks A then B and A got worse" → forgetting', '"Need to prove we did not regress" → held-out general eval before and after', '"Mix some original data into the new training set" → replay', '"Keep base model intact and ship small deltas" → LoRA adapters'],
  code: [{ lang: 'python', run: true, title: 'Forgetting simulation: before/after on two eval sets (runnable)', code: `# Toy simulation: each "skill" has a score. Training pulls weights toward the task;
# general skills decay unless we mix in replay data. Pure arithmetic, no libraries.
def train(task, general, steps, lr, replay_fraction):
    for _ in range(steps):
        task += lr * (100 - task)                         # task skill climbs toward 100
        pull = lr * 0.6 * (1 - replay_fraction)           # replay protects general skills
        general -= pull * general / 10                    # general skill decays
    return task, general

base_task, base_general = 40.0, 80.0
settings = [
    ("aggressive, no replay", 40, 0.12, 0.0),
    ("gentle lr, no replay", 40, 0.04, 0.0),
    ("aggressive + 30% replay", 40, 0.12, 0.3),
    ("gentle + 30% replay", 40, 0.04, 0.3),
]
print("%-26s %6s %8s %8s  verdict" % ("run", "task", "general", "drop"))
print("%-26s %6.1f %8.1f %8s" % ("base model", base_task, base_general, "-"))
for name, steps, lr, rep in settings:
    t, g = train(base_task, base_general, steps, lr, rep)
    drop = base_general - g
    verdict = "FORGETTING" if drop > 5 else "ok"
    print("%-26s %6.1f %8.1f %8.1f  %s" % (name, t, g, drop, verdict))
` },
  { lang: 'python', run: true, title: 'Regression check with a held-out general eval (runnable)', code: `def accuracy(preds, gold):
    return 100 * sum(p == g for p, g in zip(preds, gold)) / len(gold)

gold_general = ["paris", "4", "yes", "blue", "7", "no", "tokyo", "12"]
base_preds   = ["paris", "4", "yes", "blue", "7", "no", "tokyo", "10"]    # 7/8
tuned_preds  = ["paris", "4", "no",  "red",  "7", "no", "osaka", "10"]    # 4/8
gold_task    = ["a", "b", "a", "c"]
base_task_p  = ["a", "a", "c", "c"]
tuned_task_p = ["a", "b", "a", "c"]

rows = [("task eval", accuracy(base_task_p, gold_task), accuracy(tuned_task_p, gold_task)),
        ("general eval", accuracy(base_preds, gold_general), accuracy(tuned_preds, gold_general))]
for name, before, after in rows:
    delta = after - before
    flag = "  <-- REGRESSION, investigate" if delta < -5 else ""
    print("%-13s before=%5.1f after=%5.1f delta=%+6.1f%s" % (name, before, after, delta, flag))
` }],
  codeTitle: ['Forgetting simulation', 'General-eval regression check'],
  viz: [{
    title: 'Before vs after: task up, general down',
    input: 'none',
    inputLabel: 'Mitigation: none, replay, or lora',
    gen: function (input) {
      var s = String(input).trim().toLowerCase();
      if (['none', 'replay', 'lora'].indexOf(s) < 0) throw new Error('Type none, replay or lora');
      var gAfter = s === 'none' ? 52 : s === 'replay' ? 76 : 78, tAfter = s === 'none' ? 92 : s === 'replay' ? 90 : 87;
      var bad = s === 'none';
      return [
        { narr: 'Base model scores: task <b>40</b>, general <b>80</b>.', parts: [{ type: 'bars', label: 'Base model', values: [40, 80], texts: ['task 40', 'general 80'] }] },
        { narr: 'Fine-tune with mitigation: <b>' + s + '</b>. Training loss falls, task score rises to <b>' + tAfter + '</b>.', parts: [{ type: 'bars', label: 'After fine-tune', values: [tAfter, 80], texts: ['task ' + tAfter, 'general (not measured yet!)'], hl: { 0: 'ok' } }] },
        { narr: 'Now measure the <b>general held-out eval</b>. It is ' + gAfter + (bad ? ' (<span class="c-r">a ' + (80 - gAfter) + '-point drop: forgetting!</span>)' : ' (a small, acceptable drop)') + '.', parts: [{ type: 'bars', label: 'After fine-tune', values: [tAfter, gAfter], texts: ['task ' + tAfter, 'general ' + gAfter], hl: { 0: 'ok', 1: bad ? 'bad' : 'ok' } }] },
        { narr: 'Side-by-side report you should always produce:', parts: [{ type: 'table', columns: ['Eval', 'Before', 'After', 'Change'], rows: [['Task', 40, tAfter, '+' + (tAfter - 40)], ['General', 80, gAfter, (gAfter - 80)]], hl: { 1: bad ? 'bad' : 'ok' } }] },
        { narr: bad ? '<b>Verdict:</b> do not ship. Add replay data, lower the learning rate or use LoRA, then re-run both evals.' : '<b>Verdict:</b> ship candidate. The task gain is large and general ability is preserved.', parts: [{ type: 'vars', vals: { task_gain: tAfter - 40, general_change: gAfter - 80 }, hl: { general_change: bad ? 'bad' : 'ok' } }] }
      ];
    }
  }, {
    title: 'General score over training steps',
    input: '6',
    inputLabel: 'Number of checkpoints (4 to 10)',
    gen: function (input) {
      var n = parseInt(input, 10);
      if (!(n >= 4 && n <= 10)) throw new Error('Pick 4 to 10');
      var task = [], gen = [], frames = [];
      for (var i = 0; i < n; i++) {
        task.push(Math.round(40 + 55 * (1 - Math.exp(-(i + 1) / 2))));
        gen.push(Math.round(80 - 4 * (i + 1) * (1 + i / n)));
        var best = i === n - 1 ? 'sel' : 'cur';
        var hl = {}; hl[i] = best;
        frames.push({ narr: 'Checkpoint ' + (i + 1) + ': task <b>' + task[i] + '</b>, general <b>' + gen[i] + '</b>' + (80 - gen[i] > 10 ? ' <span class="c-r">(general falling fast)</span>' : '') + '.', parts: [{ type: 'bars', label: 'task eval by checkpoint', values: task.slice(), hl: hl }, { type: 'bars', label: 'general eval by checkpoint', values: gen.slice(), hl: (function () { var h = {}; for (var k = 0; k <= i; k++) h[k] = 80 - gen[k] > 10 ? 'bad' : 'ok'; return h; })() }] });
      }
      return frames;
    }
  }],
  examples: [
    { title: 'Detecting forgetting step by step', html: `<ol><li>Freeze a general eval (say 200 mixed questions) before any training.</li><li>Score the base model: 82%.</li><li>Fine-tune; score task (40 → 91%) and general again: 61%.</li><li>A 21-point drop on general = forgetting. Retrain with 20% replay: general 79%, task 89%. Ship that.</li></ol>` },
    { title: 'Safety forgetting', html: `<p>Studies show even benign fine-tuning can weaken refusal behaviour. Always include a small red-team prompt set in the general eval and mix safety examples into training.</p>` },
    { title: 'Weight averaging as a cheap fix', html: `<p>Blend tuned and base weights: W = 0.7·W_tuned + 0.3·W_base. Often recovers most general skill for a small task loss. Try a few blend ratios and pick from the two-eval table.</p>`, code: { lang: 'python', run: true, code: `for alpha in (0.0, 0.3, 0.5, 0.7, 1.0):
    task = 40 + 52 * alpha ** 0.7        # toy curves
    general = 80 - 30 * alpha ** 2
    print("alpha=%.1f  task=%.1f  general=%.1f" % (alpha, task, general))
` } }
  ],
  deepDive: `<p><b>Why it happens:</b> gradient descent has no memory of what else the weights were doing; the loss only encodes the new data. Overlapping features get overwritten (interference). The bigger the distribution gap between new data and pretraining, the higher the learning rate and the more steps, the worse the forgetting.</p>
  <p><b>Measure properly:</b> use a mix of capability benchmarks (knowledge, reasoning, code, multilingual), instruction-following checks, and safety prompts. Track <i>per-category</i> deltas. Use a fixed prompt format for before/after so you do not mistake formatting changes for capability changes. Define a budget in advance, for example "no more than 2 points drop on any general category".</p>
  <p><b>Mitigations ranked by practicality:</b> (1) LoRA with modest r and low LR; (2) replay data from the original instruction mix or a public instruction dataset; (3) early stopping on the general eval; (4) model merging / weight interpolation (WiSE-FT, task arithmetic); (5) regularization toward base (KL, EWC, L2-SP); (6) multi-adapter routing. Continued <i>pretraining</i> on domain text is more prone to forgetting than SFT and needs more replay.</p>
  <p><b>Related risk:</b> sequential fine-tuning (A then B then C) compounds forgetting; train on the union of data when possible.</p>`,
  aiEra: `<p><b>What AI changes:</b> with fast, cheap LoRA runs, people fine-tune often, and each run risks silent regressions. Automated eval pipelines (LLM-judge plus benchmark harnesses) make before/after checks routine.</p>
  <p><b>Use AI as a partner:</b> <code>Build a 100-question general regression set covering reasoning, arithmetic, safety refusals, summarisation and two other languages, each with a gold answer.</code> Then hand-verify the gold answers.</p>
  <p><b>Where AI goes wrong:</b> an LLM judge may call a fluent but wrong answer correct, hiding forgetting; synthetic eval sets can overlap with training data. Judges also drift when the judge model is updated.</p>
  <p><b>What you must still own:</b> the regression budget, a pinned and versioned eval set, and the ship/no-ship decision based on both numbers, not just the one that went up.</p>`,
  problems: [{
    title: 'Detect Forgetting with a Held-Out General Eval', level: 'Medium', tags: ['forgetting', 'evaluation'],
    statement: `<p>Base model: task 45, general 83. After SFT: task 90, general 64. After SFT with 20% replay and half the learning rate: task 86, general 80. Decide which model to ship, quantify the trade, and list two further mitigations.</p>`,
    constraints: `Policy: general eval may not drop more than 3 points.`,
    example: `<p>Run 1: task +45, general -19 → fails policy. Run 2: task +41, general -3 → passes.</p>`,
    brute: { why: `<p>Only watch the task metric: Run 1 looks best (90) and ships a model that is 19 points worse on everything else.</p>` },
    mcq: { q: 'Which run satisfies a 3-point general-drop budget?', options: ['Run 1 (general 64)', 'Run 2 (general 80)', 'Neither'], answer: 1, explain: '83 − 80 = 3, which is exactly within budget.' },
    hints: [`<p>Hint 1: compute the delta on both evals for each run.</p>`, `<p>Hint 2: compare with the budget, not with intuition.</p>`, `<p>Hint 3: suggest changes if the budget is tight: LoRA, merging, early stopping.</p>`],
    solution: { approach: `<p>Compute deltas. Run 1: task 45 to 90 is +45; general 83 to 64 is -19, clearly catastrophic forgetting and over the 3-point budget. Run 2: task 45 to 86 is +41; general 83 to 80 is -3, which meets the budget. Ship Run 2: it keeps 91% of the task gain (41 of 45) while losing almost no general ability. Further mitigations if more safety margin is needed: use LoRA (frozen base) or interpolate tuned and base weights (for example 0.8 and 0.2), and pick the checkpoint by the general eval with early stopping. Also verify safety refusals and other languages separately, since an average can hide a category collapse, and re-run both evals on the final merged artifact that will actually be served.</p>`, code: { lang: 'python', run: true, code: `base = {"task": 45, "general": 83}
runs = {"run1": {"task": 90, "general": 64}, "run2": {"task": 86, "general": 80}}
for name, r in runs.items():
    dt, dg = r["task"] - base["task"], r["general"] - base["general"]
    print(name, "task", dt, "general", dg, "OK" if dg >= -3 else "FORGETTING")
` }, complexity: `<p>Constant-time comparison; the cost is running the evals.</p>` }
  }]
});

function P(title, level, tags, statement, constraints, example, bruteWhy, mcq, hints, approach, complexity, followUps) {
  practice.push({ title: title, level: level, tags: tags, statement: '<p>' + statement + '</p>', constraints: constraints, example: '<p>' + example + '</p>',
    brute: { why: '<p>Naive approach: ' + bruteWhy + ' This wastes effort and produces a worse, riskier result.</p>' }, mcq: mcq,
    hints: ['<p>Hint 1: ' + hints[0] + ' (think about what the model actually learns from it).</p>', '<p>Hint 2: ' + hints[1] + ' (write it down before answering).</p>', '<p>Hint 3: ' + hints[2] + ' (then state the plain-English recipe and check edge cases).</p>'],
    solution: { approach: '<p>' + approach + '</p>', complexity: '<p>Cost and effort: ' + complexity + ' The real expense is running evals and training, not the arithmetic.</p>', followUps: followUps } });
}

P('Prompting, RAG or Fine-Tuning? Six Quick Calls', 'Easy', ['decision framework'],
  'Choose prompting, RAG, fine-tuning or a mix for: (a) a bot that quotes today\'s shipping rates; (b) turning messy notes into a fixed JSON schema; (c) a customer-facing bot with a very specific brand voice at 5M calls/day; (d) a coding helper for your private repo; (e) translating tone of voice to formal English; (f) a legal Q&amp;A tool needing page citations.',
  'One choice and one reason each.', '(a) RAG or a live tool call, because rates change daily.',
  'Fine-tune everything; slow, costly and stale.',
  { q: 'Which problem is best solved by fine-tuning?', options: ['Answering from yesterday\'s data', 'Consistent brand voice at huge volume', 'Citing a source page'], answer: 1, explain: 'Voice is behaviour; volume makes a short, tuned prompt pay off.' },
  ['gap in knowledge or in behaviour?', 'how often does the data change, how many calls per day?', 'try the cheapest option that can pass an eval'],
  '(a) Tool call or RAG: the rates are live data. (b) Prompting with a JSON schema and examples; fine-tune only if a small model must do it cheaply. (c) Fine-tune a smaller model: the style is behaviour and 5M calls per day make shorter prompts valuable. (d) RAG over the repo (code search), possibly with long context; facts change with every commit. (e) Prompting; the base model already understands formal tone. (f) RAG, because citations must point to real retrieved pages and legal text changes. Rule: facts to retrieval, behaviour to training, everything else to prompting, and measure each on a held-out eval.',
  'Judged on reasoning.', ['What eval would you build for (c)?']);

P('LoRA Parameters for 4096×4096 at r = 8', 'Easy', ['lora', 'math'],
  'Compute the trainable parameters of a LoRA adapter on a single 4096×4096 weight at rank 8, the fraction of the full matrix, and the memory of the adapter in 16-bit.',
  'Ignore bias.', 'A = 8×4096 = 32,768; B = 4096×8 = 32,768; total 65,536 (0.39%); 16-bit memory = 131,072 bytes = 128 KB.',
  'Counting the whole 16.7M weights as trainable.',
  { q: 'If you double r, trainable parameters...', options: ['stay the same', 'double', 'quadruple'], answer: 1, explain: 'Params = r × (d_in + d_out): linear in r.' },
  ['two matrices A and B', 'sizes r×d and d×r', 'bytes = params × 2 for 16-bit'],
  'The adapter has A of size 8×4096 and B of size 4096×8. Each has 32,768 numbers, so the total is 65,536. The full matrix has 4096×4096 = 16,777,216, so LoRA trains 65,536 / 16,777,216 = 0.390625%, a 256× reduction. In 16-bit each number is 2 bytes, so the adapter is 131,072 bytes, about 128 KB per layer. Applied to 4 matrices in each of 32 layers that is about 16 MB for the whole adapter file.',
  'O(1).', ['What changes for a 4096 to 11008 layer?']);

P('Build SFT Examples from Support Tickets', 'Easy', ['sft', 'data'],
  'Given a ticket (subject, body, agent reply, csat) show the exact chat-format JSON example you would train on, and list when you would skip the ticket.',
  'Use roles system, user, assistant.', '{"messages":[{"role":"system",...},{"role":"user","content":"Subject: Late order | body"},{"role":"assistant","content":"reply"}]}',
  'Train on raw ticket threads including internal notes and signatures.',
  { q: 'Which message holds the label?', options: ['system', 'user', 'assistant'], answer: 2, explain: 'The assistant message is the target the model learns to produce.' },
  ['the agent reply is the label', 'keep a constant system prompt', 'skip empty, low-csat, spam and personal-data tickets'],
  'Build one JSON object per ticket with three messages. The system message states the role and policy once, the user message is the subject plus body of the ticket, and the assistant message is the human agent\'s reply. Skip tickets with empty or auto-generated replies, csat of 3 or below, spam, unsupported languages, and tickets whose reply contains unscrubbed personal data. Write one object per line (JSONL), hold out 10% by customer for validation, and round-trip a few examples through the tokenizer chat template to be sure training and serving formats match.',
  'O(N).', ['How would you handle multi-turn threads?']);

P('Write Preference Pairs for a Support Bot', 'Medium', ['dpo', 'preference data'],
  'Write 3 preference pairs that each teach a different quality (clarify, refuse safely, be concise) and explain what each teaches.',
  'Rejected answers must be plausible.', 'Prompt "Close my account." Chosen: confirms identity and warns about open balance. Rejected: "Done." Teaches confirm-before-destructive-action.',
  'Use gibberish as rejected answers; the model learns nothing new.',
  { q: 'Best rejected answer?', options: ['Random text', 'Plausible but flawed', 'Empty'], answer: 1, explain: 'Near-misses give the strongest contrast.' },
  ['choose the quality first', 'make the rejected realistically flawed', 'match lengths'],
  'Pair 1 (clarify): prompt "Send money to Sam". Chosen asks which Sam, which amount, which account; rejected guesses. Pair 2 (safe refusal): prompt "Show me someone else\'s statement". Chosen declines politely, explains privacy and offers help with their own account; rejected complies. Pair 3 (concise): prompt "What is my daily limit?" Chosen answers in one sentence with where to change it; rejected gives a long generic essay. Each pair keeps similar length and fluency so the learnable signal is only the behaviour. I would collect 200+ pairs per quality, balance them, and hold out some pairs to measure win rate against the reference.',
  'Judged on contrast quality.', ['What does the pair teach if chosen is always longer?']);

P('Compute a DPO Loss by Hand', 'Medium', ['dpo', 'math'],
  'Policy log-probs: chosen -38, rejected -43. Reference: chosen -42, rejected -40. beta = 0.1. Compute the margin and the loss.',
  'Use ln.', 'margin = (-38 - -42) - (-43 - -40) = 4 - (-3) = 7; loss = -ln(σ(0.7)) = 0.403.',
  'Compare raw log-probs without the reference; ignores how much the policy changed.',
  { q: 'At the start of training (policy = reference) the DPO loss is...', options: ['0', 'ln 2 ≈ 0.693', '1'], answer: 1, explain: 'Margin 0 gives σ(0)=0.5.' },
  ['subtract reference log-probs first', 'margin is chosen shift minus rejected shift', 'σ(0.7) ≈ 0.668'],
  'First compute how much the policy moved relative to the reference for each answer. Chosen: -38 minus -42 = +4 (more likely than before). Rejected: -43 minus -40 = -3 (less likely than before). The margin is 4 minus -3 = 7. Multiply by beta 0.1 to get 0.7. σ(0.7) = 1/(1+e^-0.7) ≈ 0.668, so the loss is -ln(0.668) ≈ 0.403. The loss would be 0.693 with no change and approaches 0 as the margin grows, and it grows large if the policy moves the wrong way.',
  'O(1).', ['What changes if beta doubles?']);

P('Design a Dataset Curation Pipeline', 'Medium', ['data', 'dedup'],
  'You have 200k scraped Q&amp;A pairs for a fine-tune. Design the pipeline: filters, dedup, balance, split, and what you log.',
  'Budget: 10k final examples.', 'Funnel: 200k → 150k (length) → 90k (dedup) → 40k (quality) → 10k (balanced sample).',
  'Train on all 200k: the noise and duplicates dominate.',
  { q: 'When do you split off the eval set?', options: ['After training', 'Before training, after dedup', 'Never'], answer: 1, explain: 'Dedup first so copies cannot land in both sets, then split before touching training.' },
  ['filters from cheap to expensive', 'dedup across train and eval', 'log counts at each step'],
  'Order the steps from cheap to expensive. Rule filters: empty, too short or too long, wrong language, regex for emails and secrets. Exact and near dedup: normalized-text hash, then MinHash or embedding similarity. Quality scoring: an LLM judge with a rubric on a sample, calibrated against 100 human labels, then a classifier for the rest. Balance: cluster by topic and class, cap large clusters, and top up rare ones. Split by group (customer or document) into 90 percent train and 10 percent held-out, after dedup so no copy crosses. Log counts and reasons for each rejection in a data card, read 100 random survivors by eye, and freeze the held-out set under version control.',
  'Roughly O(N) with hashing; embedding steps cost O(N) model calls.', ['How do you catch contamination from public benchmarks?']);

P('Is It Forgetting? Read the Two Eval Tables', 'Medium', ['forgetting', 'evaluation'],
  'Base: task 52, general 78, safety refusals 96. Tuned: task 88, general 76, safety refusals 71. Diagnose and recommend.',
  'Budget: no category may drop more than 3 points.', 'Task +36 (good), general -2 (ok), safety -25 (fails).',
  'Look only at the average, which hides the safety collapse.',
  { q: 'What is the problem?', options: ['Task gain too small', 'Safety category forgotten', 'Nothing'], answer: 1, explain: 'A 25-point drop in refusals breaks the budget.' },
  ['compute each delta', 'compare to the budget per category', 'choose a mitigation that targets the failing one'],
  'Compute deltas: task +36, general -2, safety -25. Only the safety category violates the budget, so this is targeted forgetting of refusal behaviour (common after fine-tuning on helpful-only data). Do not ship. Mix safety and refusal examples into training (replay, 10 to 20 percent), lower the learning rate or use LoRA, and add the safety set to early stopping. Re-run all three evals, and confirm on the final merged artifact. The average would be (88+76+71)/3 vs (52+78+96)/3 and might look fine, which is why per-category budgets are required.',
  'Cost is the eval run.', ['How would you test for jailbreak regressions?']);

P('Plan QLoRA for an 8B Model on a 24 GB GPU', 'Medium', ['qlora', 'memory'],
  'Estimate weight memory in 16-bit and 4-bit for an 8B model and decide if 24 GB is enough; list the knobs if you run out.',
  'Sequence length 2048, batch size 4.', '16-bit: 8B × 2 B = 16 GB; 4-bit: 8B × 0.5 B = 4 GB.',
  'Full fine-tune: weights + gradients + Adam states ≈ 16 B per parameter = 128 GB, impossible.',
  { q: 'Why does QLoRA fit?', options: ['It deletes layers', 'Base is 4-bit and only small adapters get gradients', 'It uses CPU only'], answer: 1, explain: 'Quantised frozen base plus tiny trainable adapters.' },
  ['bytes per parameter by precision', 'only adapters need gradients and optimizer states', 'activations scale with batch and sequence length'],
  'Full fine-tuning needs roughly 16 bytes per parameter with Adam in mixed precision, about 128 GB for 8B parameters, so it is out. LoRA in 16-bit keeps the 16 GB base plus small adapter state, which fits but leaves little room for activations. QLoRA stores the frozen base in 4-bit at about 4 to 5 GB, adapters and optimizer states take well under 1 GB, and activations take a few GB, so it fits in 24 GB comfortably. If memory runs out: gradient checkpointing, a smaller micro-batch with gradient accumulation, a shorter max sequence length, lower rank, or paged optimizers.',
  'Memory arithmetic only.', ['What is the speed cost of 4-bit?']);

P('Choose DPO or RLHF for Three Teams', 'Medium', ['rlhf', 'dpo'],
  'Pick RLHF-PPO or DPO for: (a) a 3-person startup with 5k preference pairs; (b) a lab with a verifiable code-execution reward; (c) a team that has only thumbs-up/down logs.',
  'Justify in terms of data, compute and stability.', '(a) DPO, because it needs only pairs and two models.',
  'Always use PPO because ChatGPT did.',
  { q: 'Team with only thumbs up or down labels?', options: ['DPO exactly as is', 'KTO or a reward model approach', 'No training possible'], answer: 1, explain: 'KTO (or training a reward model) handles unpaired labels.' },
  ['count models in memory and hyperparameters', 'is there a verifiable reward?', 'what shape is the data?'],
  '(a) DPO: 5k pairs and tiny infrastructure; it is stable and simple, needing only the policy plus a frozen reference. (b) RL with a verifiable reward (PPO or GRPO): tests passing is a clean reward that needs no reward model and beats preference data for correctness. (c) Thumbs data is unpaired, so use KTO, or build pairs from comparable prompts, or train a reward model on it. Across all three: start from an SFT model, keep a KL anchor, watch response length for reward hacking, and evaluate with a held-out win-rate against the SFT model.',
  'Judged on reasoning.', ['What is reward hacking and how do you spot it?']);

P('Fine-Tune vs Long Context vs RAG: Cost Model', 'Hard', ['cost', 'decision'],
  'A bot handles 2M calls/month. Each call needs a 6,000-token policy document. Compare (1) pasting it every call, (2) prompt caching, (3) RAG with 800 retrieved tokens, (4) fine-tuning to bake policy in with a 150-token prompt. Compute input tokens per month and discuss risks.',
  'Ignore output tokens.', '(1) 12B tokens, (3) 1.6B tokens, (4) 0.3B tokens.',
  'Pick the lowest token count and ignore staleness, retrieval errors and retraining costs.',
  { q: 'Which option has the staleness risk?', options: ['Pasting each call', 'RAG', 'Fine-tuning'], answer: 2, explain: 'Baked-in policy is outdated the day the policy changes.' },
  ['tokens = calls × tokens per call', 'cached tokens are cheaper but still count', 'add non-token costs'],
  'Tokens per month: (1) 2M × 6,000 = 12B. (2) Same count but cached reads are billed at a fraction, often about 10 percent of the normal price, and latency falls; staleness is zero. (3) 2M × 800 = 1.6B plus embedding and vector-store cost, and risk that retrieval misses the key clause. (4) 2M × 150 = 0.3B, cheapest per call, but retraining on each policy change, risk of the model stating outdated rules, no citations, and the cost of data and evals. Recommendation: caching if the document is stable and fits; RAG if the corpus is large or changes; fine-tune only for style or when volume makes the savings clear, ideally combined with retrieval for facts.',
  'Arithmetic plus judgement.', ['When does break-even for fine-tuning arrive?']);

P('Diagnose a Fine-Tune that Got Worse', 'Hard', ['debugging', 'sft'],
  'After SFT on 3k examples the model repeats the training template in every answer, refuses to answer off-topic questions, and validation loss rose after epoch 1. List five likely causes and fixes.',
  'No new data available this week.', 'Template repetition → too many near-duplicate examples.',
  'Train 10 more epochs hoping it improves.',
  { q: 'Validation loss rising while training loss falls means...', options: ['underfitting', 'overfitting', 'good generalisation'], answer: 1, explain: 'The model memorises training data.' },
  ['look at data duplication and diversity first', 'check learning rate and epochs', 'check template or masking mismatches'],
  'Likely causes and fixes: (1) near-duplicates and low diversity make the model parrot the template; dedup and add varied prompts. (2) Too many epochs or high learning rate overfit by epoch 1; use 1 epoch, lower the learning rate, early stop on validation. (3) Class imbalance or no out-of-scope examples cause the over-refusal; add varied and negative examples. (4) Prompt not masked, so the model also learns the template of the user turn; use completion-only loss. (5) Chat-template mismatch between training and inference; use the tokenizer template in both. Also switch to LoRA with low rank to limit drift and add 20 percent general replay data. Verify with the held-out task and general evals before and after each change.',
  'Debugging process.', ['Which one would you check first and why?']);

P('Design an End-to-End Fine-Tuning Program for a Bank', 'Hard', ['system design', 'alignment'],
  'Design the full approach for a regulated bank assistant: when to fine-tune, data governance, SFT then DPO, adapters, evals (task, general, safety), rollback.',
  'Strict privacy, audit trail, monthly policy changes.', 'Facts via RAG; behaviour via SFT + DPO adapters.',
  'Fine-tune the policy text into the model and ship.',
  { q: 'Where should monthly-changing policy live?', options: ['In model weights', 'In a retrieval store', 'In the system prompt only'], answer: 1, explain: 'Retrieval can be updated, cited and audited without training.' },
  ['separate facts from behaviour', 'governance and evals gate every release', 'plan rollback'],
  'Facts (policies, rates) go through RAG with source citations and access control, because they change monthly and must be auditable. Fine-tuning handles behaviour only: tone, structured output, escalation rules and refusals. Data: consented, PII-scrubbed tickets, human-reviewed, versioned with a data card; synthetic data only with review. Training: SFT on curated examples with LoRA adapters per use case, then DPO on preference pairs from compliance reviewers to improve safety and clarity, keeping a KL anchor. Evals gate release: task accuracy, a frozen general regression set, a safety and jailbreak set, bias slices, and a human review of 200 samples. Ship adapters behind a feature flag with canary traffic, monitor drift and complaints, and keep the previous adapter for instant rollback. Re-run all evals whenever the base model version changes.',
  'Design answer.', ['How would you prove the model does not leak training data?']);

P('Catch Contamination Between Train and Eval', 'Hard', ['evaluation', 'leakage'],
  'Your tuned model scores 97% on the held-out set but customers complain. Find three ways the held-out set could be contaminated and how to prevent each.',
  'Data came from the same ticket system.', 'Same customer in both splits; near-duplicate templated tickets; eval items paraphrased by a synthetic-data tool.',
  'Random-split rows after copying the data around.',
  { q: 'Best split key for tickets?', options: ['Random row', 'Customer or thread id', 'Alphabetical order'], answer: 1, explain: 'Group-level splits stop the same entity appearing on both sides.' },
  ['the eval must look like unseen production traffic', 'near-duplicates cross splits', 'check the time dimension'],
  'Three leaks. (1) Row-level random split: the same customer or thread has rows in both sets, so the model memorised the person. Fix: split by customer or thread id with a hash. (2) Templated or near-duplicate tickets: after normalization the held-out items match training items. Fix: dedup across the union with MinHash or embeddings before splitting. (3) Synthetic augmentation applied before the split, so paraphrases of eval items sit in training. Fix: split first, augment only the training side. Also split by time so the eval resembles future traffic, add a small human-written gold set that never touched any pipeline, and report scores on production-like samples, not just the held-out set.',
  'Process answer.', ['How do you detect contamination of a public benchmark?']);

P('Choose LoRA Rank and Modules from Evidence', 'Hard', ['lora', 'experiments'],
  'You can run 4 experiments. Design them to choose rank and target modules for a classification-style fine-tune, and state your decision rule.',
  'Budget: 4 runs, same data and seed.', 'Runs: r=4 attention only, r=8 attention only, r=8 all linear, r=32 all linear.',
  'Pick r=64 because bigger is better.',
  { q: 'How do you decide between two similar runs?', options: ['Pick the larger rank', 'Pick the cheaper run if eval is within noise', 'Pick the one with lowest training loss'], answer: 1, explain: 'If differences are inside noise, prefer the smaller, cheaper adapter.' },
  ['change one variable at a time where possible', 'measure the task AND general eval', 'estimate eval noise'],
  'Run four experiments with identical data, seed and schedule: r=4 on attention only, r=8 on attention only, r=8 on all linear layers, r=32 on all linear layers. For each, record trainable parameters, task eval, general eval, and train time. Estimate noise by repeating one run with another seed. Decision rule: choose the smallest configuration whose task score is within noise of the best and whose general score drops no more than the agreed budget. Typically r=8 to 16 on all linear layers wins; r=32 helps only if the model is underfitting (high training loss and low eval). Then scale alpha with r (alpha equals r or 2r) and keep the learning rate at about 1e-4 to 2e-4.',
  'Four training runs.', ['What if r=4 and r=32 tie?']);

quiz.push({ q: 'Your assistant must answer using documents that change every week. Best first approach?', options: ['Fine-tune weekly', 'RAG', 'Bigger model only', 'Train from scratch'], answer: 1, explain: 'Facts that change belong in a retrieval store, not in weights.' });
quiz.push({ q: 'What does fine-tuning mainly change?', options: ['The knowledge cutoff of the web', 'The model weights and so its behaviour', 'The user interface', 'The tokenizer vocabulary'], answer: 1, explain: 'It updates weights, shaping style, format and skills.' });
quiz.push({ q: 'In SFT, why mask the prompt tokens in the loss?', options: ['To save disk', 'So the model learns to produce answers, not imitate user text', 'To speed up the tokenizer', 'It is required by JSONL'], answer: 1, explain: 'Loss on the assistant tokens only focuses learning on the desired output.' });
quiz.push({ q: 'LoRA trainable parameters for a 4096×4096 layer at r=8?', options: ['32,768', '65,536', '16,777,216', '131,072'], answer: 1, explain: '8×4096 + 4096×8 = 65,536.' });
quiz.push({ q: 'Why is B initialised to zeros in LoRA?', options: ['To save memory', 'So the adapted model equals the base model at step 0', 'To make A untrainable', 'To get rank 0'], answer: 1, explain: 'ΔW = B×A = 0 at the start, so training begins from the original behaviour.' });
quiz.push({ q: 'What makes QLoRA fit large models on small GPUs?', options: ['Pruning layers', 'Frozen base stored in 4-bit with small 16-bit adapters', 'Running on CPU', 'Smaller vocabulary'], answer: 1, explain: '4-bit weights cut memory about 4× versus 16-bit; only adapters are trained.' });
quiz.push({ q: 'Which stage is NOT part of classic RLHF?', options: ['SFT', 'Reward model training', 'PPO with a KL penalty', 'Training a frozen reference only on pairs without a policy'], answer: 3, explain: 'RLHF uses SFT, a reward model and PPO; the last option is not a stage.' });
quiz.push({ q: 'What does DPO remove compared with RLHF?', options: ['The need for preference data', 'The separate reward model and RL loop', 'The reference model', 'The need for SFT'], answer: 1, explain: 'DPO optimizes directly on pairs with a closed-form loss.' });
quiz.push({ q: 'What does a larger beta do in DPO?', options: ['Allows the policy to drift further', 'Keeps the policy closer to the reference', 'Turns off the loss', 'Doubles the batch size'], answer: 1, explain: 'Beta scales the implicit KL constraint; larger beta means a tighter leash.' });
quiz.push({ q: 'Which is the best data-curation habit?', options: ['Use as much raw data as possible', 'Dedup, filter, balance, and hold out an eval set first', 'Train on the eval set too', 'Remove all rare classes'], answer: 1, explain: 'Quality and a clean held-out set beat sheer volume.' });
quiz.push({ q: 'How do you detect catastrophic forgetting?', options: ['Look at training loss only', 'Compare base and tuned scores on a held-out general eval', 'Count epochs', 'Check file size'], answer: 1, explain: 'Training loss cannot show lost general skills; a fixed general eval does.' });
quiz.push({ q: 'Which mitigation reduces forgetting?', options: ['Higher learning rate', 'Mixing in replay data and using LoRA with a lower learning rate', 'Training longer', 'Removing the validation set'], answer: 1, explain: 'Replay, adapters, and gentle learning rates preserve base abilities.' });
quiz.push({ q: 'Training loss falls but validation loss rises. This means...', options: ['Underfitting', 'Overfitting', 'Perfect', 'Bad tokenizer'], answer: 1, explain: 'Classic overfitting: stop earlier, add data, or regularize.' });

function I(q, level, a, f) { interview.push({ q: q, level: level, a: '<p>' + a + '</p>', followUps: f }); }

I('When would you fine-tune instead of using prompting or RAG?', 'B', 'I try prompting first with an eval set, then RAG if the gap is missing or changing knowledge. I fine-tune when the gap is behaviour: a consistent style or format, a narrow skill, tool-calling reliability, or when a long prompt at high volume makes a small tuned model cheaper and faster. Fine-tuning is a poor way to add facts: they go stale, cannot be cited, and the model still hallucinates. The decision is made with numbers from a held-out eval, not intuition.', ['What eval would convince you?', 'Can you combine them?']);
I('Explain the supervised fine-tuning data format and training loop.', 'B', 'Data is usually JSONL, each line a conversation with system, user and assistant messages. The text is tokenized with the model\'s own chat template. The model predicts the next token, we compute cross-entropy, usually only on assistant tokens by masking the prompt, then backpropagate and update with a small learning rate for 1 to 3 epochs. I watch training and validation loss plus a task eval; if validation worsens while training improves, it is overfitting and I stop earlier or add data.', ['Why mask the prompt?', 'What happens with a template mismatch?']);
I('How does LoRA work and why is it cheaper than full fine-tuning?', 'I', 'LoRA freezes the pretrained weight W and learns a low-rank update ΔW = B·A, where A is r×d_in and B is d_out×r. Forward pass is Wx + (α/r)·B(Ax). B starts at zero so training begins at the base behaviour. Trainable parameters fall from d_in×d_out to r×(d_in+d_out); for 4096×4096 at r=8 that is 65,536 versus 16.8M. Gradients and optimizer states exist only for the adapters, so memory drops sharply, files are small, adapters can be swapped or merged into W.', ['How do you choose r?', 'What does alpha do?']);
I('What is QLoRA and what are its trade-offs?', 'I', 'QLoRA loads the frozen base model in 4-bit NF4 with double quantization and trains 16-bit LoRA adapters on top, using paged optimizers to survive memory spikes. It lets a 7B to 70B model tune on one GPU. Trade-offs: slower steps because weights are de-quantized on the fly, a small accuracy gap versus 16-bit LoRA, and care when merging (merge into a 16-bit copy, not the 4-bit weights). Quality is usually close to 16-bit LoRA for most tasks.', ['How much memory does a 70B model need?', 'How do you merge adapters?']);
I('Walk me through RLHF.', 'I', 'Stage one is SFT on demonstrations. Stage two trains a reward model on human preference pairs so chosen outscores rejected. Stage three runs PPO: the policy generates answers, the reward model scores them, and PPO raises the expected reward while a KL penalty to the SFT model prevents drift and reward hacking. It needs several models in memory (policy, reference, reward, value) and is sensitive to hyperparameters, which is why many teams now prefer DPO or RL with verifiable rewards.', ['What is reward hacking?', 'Why a KL penalty?']);
I('How does DPO differ from RLHF, and what is its loss?', 'I', 'DPO skips the reward model and RL loop by showing the optimal RLHF policy implies an implicit reward β·log(π/π_ref). The loss is -log σ(β[(log π(chosen) - log π_ref(chosen)) - (log π(rejected) - log π_ref(rejected))]), a supervised-style objective on preference pairs. Only the policy and a frozen reference are needed. Beta controls how far the policy may move from the reference. Weaknesses: sensitivity to data quality, length bias, and sometimes lowering the likelihood of both answers.', ['What does beta control?', 'What is KTO?']);
I('How do you curate a fine-tuning dataset?', 'I', 'I treat data as the product. Steps: remove empty, tiny and giant examples; dedup exactly and near-exactly with normalized hashes plus MinHash or embeddings; filter wrong, toxic or policy-violating answers and personal data; balance classes and topics by capping big ones and adding rare ones; and split off a held-out eval by group before training. I read a random sample by hand, log counts for each filter, and aim for fewer, consistent, high-quality examples rather than volume.', ['How do you dedup at scale?', 'How big should the eval be?']);
I('What is catastrophic forgetting and how do you detect and reduce it?', 'I', 'It is when fine-tuning on a narrow task overwrites general abilities, such as reasoning, other languages or safety behaviour. I detect it by scoring the base and tuned models on a fixed held-out general eval (plus safety prompts) and comparing against a drop budget. To reduce it I use LoRA, lower learning rates, fewer epochs, replay of general instruction data (10 to 30 percent), early stopping on the general eval, and weight interpolation with the base model.', ['What goes in the general eval?', 'Why can an average hide forgetting?']);
I('Your fine-tuned model scores 97% offline but users are unhappy. What do you check?', 'A', 'I suspect contamination or distribution shift. Checks: was the split by group (customer, thread) or random? Are there near-duplicates across train and eval? Was synthetic augmentation applied before splitting? Does the eval resemble real traffic and timing? Then check serving mismatches such as chat template, system prompt and decoding settings, and compare with a small human-written gold set and live logs. I also look at general and safety regressions that the task eval does not cover.', ['How do you build a trustworthy gold set?', 'How do you monitor after launch?']);
I('How would you build preference data for a domain assistant?', 'A', 'Sample several answers per prompt from the current SFT model so the data is on-distribution, then have domain experts or a calibrated AI judge pick the better one using a written rubric. Randomise answer order to avoid position bias, control for length bias, and measure inter-annotator agreement. Include hard negatives that are plausible but flawed, and safety and refusal cases. Hold out a set of pairs to measure win-rate and keep audits of judge-human agreement.', ['What biases do AI judges have?', 'How many pairs are enough?']);
I('Design a fine-tuning strategy for a regulated company where policies change monthly.', 'E', 'Facts live in RAG with citations and access control so they update without training. Fine-tuning covers behaviour only: tone, structured output, escalation and refusals, using LoRA adapters trained with SFT and then DPO from compliance-reviewed preference pairs. Data is consented, scrubbed and versioned. Releases are gated by task, general-regression, safety and bias evals plus human review, shipped behind flags with canary traffic and instant rollback, with re-evaluation whenever the base model changes.', ['How do you handle a deletion request?', 'How do you audit the model?']);
I('A teammate says: let us fine-tune on our wiki so the model knows it. Respond.', 'E', 'I would explain that fine-tuning on documents mostly teaches style and gives unreliable recall; the model will still hallucinate details, cannot cite sources, goes stale as the wiki changes, and cannot honour per-user permissions. A RAG system gives grounded, citable, updatable answers. I would propose a quick eval: 100 real questions, compare prompting plus RAG versus a tuned model. If we also need a consistent voice or format, add a small SFT stage for behaviour on top of RAG.', ['What would change your mind?', 'How do you evaluate groundedness?']);

registerModule({
  id: 'ai12',
  title: 'Fine-Tuning & Alignment',
  intro: `<p>Fine-tuning is the most over-used and the most misunderstood tool in the GenAI toolbox. In this module you learn to <b>decide</b> between prompting, RAG and fine-tuning, to build clean SFT data, to understand how LoRA and QLoRA train a giant model on one GPU, to explain RLHF and DPO in plain words, to curate datasets, and to catch catastrophic forgetting before it ships. Everything is explained with analogies first, tiny runnable Python, and interview-ready answers.</p>`,
  goals: ['Choose between prompting, RAG and fine-tuning for any scenario and defend the choice with an eval', 'Build SFT chat-format data from raw tickets and describe the training loop and loss masking', 'Compute LoRA trainable parameters (65,536 for 4096×4096 at r=8) and explain QLoRA memory savings', 'Explain RLHF (reward model + PPO) and DPO (preference pairs, no reward model) and compute a DPO loss', 'Curate datasets: dedup, filter, balance, hold out an eval set', 'Detect and reduce catastrophic forgetting using a held-out general eval'],
  prereqs: `Earlier GenAI modules on how LLMs work, prompting and RAG. Basic Python and the idea of a neural-network weight matrix.`,
  hours: 10,
  topics: topics, practice: practice, quiz: quiz, interview: interview
}); })();
