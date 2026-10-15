(function () {
var topics = [], practice = [], quiz = [], interview = [];
// ---- tiny helpers ----
function bx(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 18 }; }
function tx(html) { return { type: 'text', html: html }; }
function pairs(input, max) {
  var out = String(input).split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
    var i = s.lastIndexOf(':'); if (i < 0) throw new Error('Use name:number pairs, e.g. coding:8, design:5');
    var n = Number(s.slice(i + 1)); if (isNaN(n)) throw new Error('After the colon put a number');
    return [s.slice(0, i).trim(), n];
  });
  if (!out.length) throw new Error('Enter at least one name:number pair');
  if (out.length > (max || 10)) throw new Error('Use at most ' + (max || 10) + ' items');
  return out;
}

topics.push({
  title: 'What Gets Automated, What Gets Augmented, What Gains Value',
  analogy: `<p>When <b>spreadsheets</b> arrived, accountants did not disappear. The hand-adding of long columns vanished, but the job of <i>deciding what the numbers mean</i> grew. Work moved up a floor. AI is a much bigger lift than a spreadsheet, but the shape of the change is similar: the <b>typing-heavy, well-specified</b> parts get cheap, and the <b>judgment-heavy, unclear</b> parts get more valuable.</p>`,
  explain: `<p>Nobody can predict the future of software jobs exactly. What we can do is look at <b>each task</b>, not each job. A job is a bundle of tasks. AI changes the bundle unevenly.</p>
  <p>A simple way to think about any task is three buckets:</p>
  <ul>
  <li>${H.c('r', '<b>Mostly automated</b>')} - clear input, clear output, easy to check: boilerplate code, format conversion, first-draft docs, simple unit tests, translating code between languages.</li>
  <li>${H.c('y', '<b>Augmented</b>')} - AI drafts, you steer and verify: refactoring, code review prep, debugging with logs, SQL writing, design brainstorming.</li>
  <li>${H.c('g', '<b>Human-led</b>')} - the answer depends on context, people, risk or trust: deciding <i>what</i> to build, debugging a strange production incident, trade-offs between teams, explaining a bad outcome to a customer.</li>
  </ul>
  <p>Questions that help you place a task: <b>Is the goal written down clearly? Is the result cheap to check? What does a mistake cost? Does it need context that lives in people's heads?</b> Clear goal + cheap check + low cost of error = high automation exposure.</p>
  ${H.table(['Task', 'Goal clear?', 'Cheap to check?', 'Cost of mistake', 'Likely bucket'], [['Write a CRUD endpoint', 'yes', 'yes (tests)', 'low', H.c('r', 'automate')], ['Refactor a module', 'mostly', 'tests help', 'medium', H.c('y', 'augment')], ['Find why checkout is slow only on Fridays', 'no', 'hard', 'high', H.c('g', 'human-led')], ['Decide which feature to cut', 'no', 'no', 'high', H.c('g', 'human-led')]])}
  <p>Important: "exposed" does not mean "gone". Cheaper tasks often mean <b>more of them get done</b> (more software gets built), which can raise demand. Economists argue about this, and the honest answer is: <i>uncertain</i>. Plan for several futures, not one.</p>`,
  clues: ['"Which tasks will AI replace?" - answer with task buckets, not job titles', '"Will developers still be needed?" - balanced answer: tasks shift, uncertainty is real', '"What skills are future-proof?" - judgment, framing, debugging, communication, but say why', '"How do you decide what to delegate to AI?" - clear goal, cheap check, low cost of error', '"Is junior hiring dying?" - discuss the learning-ladder problem, avoid fake statistics'],
  code: [{ lang: 'python', title: 'Automation-exposure scorer from a rubric (runnable)', run: true, code: `# Score a task from 0 to 10 using a simple, explainable rubric.
# Each answer is a number from 0 (no) to 1 (yes). Weights are illustrative, not science.
RUBRIC = {
    "goal_is_written_clearly": 3.0,   # can you describe the finished result in a sentence?
    "result_is_cheap_to_check": 3.0,  # tests, a compiler, a quick look
    "needs_little_hidden_context": 2.0,
    "mistake_is_cheap": 2.0,
}

def exposure(answers):
    total = sum(RUBRIC.values())
    score = sum(RUBRIC[k] * answers[k] for k in RUBRIC)
    return round(10 * score / total, 1)

def bucket(score):
    if score >= 7:
        return "automate (AI first, human skims)"
    if score >= 4:
        return "augment (AI drafts, human owns)"
    return "human-led (AI assists at the edges)"

tasks = {
    "write boilerplate CRUD endpoint": dict(goal_is_written_clearly=1, result_is_cheap_to_check=1, needs_little_hidden_context=0.9, mistake_is_cheap=0.8),
    "refactor payment module": dict(goal_is_written_clearly=0.7, result_is_cheap_to_check=0.6, needs_little_hidden_context=0.4, mistake_is_cheap=0.2),
    "debug Friday-only checkout slowness": dict(goal_is_written_clearly=0.3, result_is_cheap_to_check=0.3, needs_little_hidden_context=0.1, mistake_is_cheap=0.3),
    "decide which feature to cut": dict(goal_is_written_clearly=0.1, result_is_cheap_to_check=0.0, needs_little_hidden_context=0.0, mistake_is_cheap=0.2),
}

for name, ans in sorted(tasks.items(), key=lambda kv: -exposure(kv[1])):
    s = exposure(ans)
    print(f"{s:>4}  {name:<38} -> {bucket(s)}")` }],
  codeTitle: ['Rubric scorer'],
  viz: {
    title: 'Task spectrum: automate - augment - human-led',
    input: 'boilerplate CRUD:9, unit test drafts:8, refactor module:6, code review prep:5, prod incident debug:3, problem framing:2, stakeholder talk:1',
    inputLabel: 'task:exposure (0-10), comma separated',
    gen: function (input) {
      var p = pairs(input, 9), frames = [], rows = [], vals = [], hl = {};
      frames.push({ narr: 'We place each task on a <b>0-10 exposure scale</b>: 7+ automate, 4-6 augment, below 4 human-led. These numbers are <i>illustrative guesses</i>, not measurements.', parts: [{ type: 'table', label: 'Tasks', columns: ['task', 'exposure', 'bucket'], rows: [] }] });
      p.forEach(function (t, i) {
        var s = Math.max(0, Math.min(10, t[1])), b = s >= 7 ? 'automate' : s >= 4 ? 'augment' : 'human-led';
        rows.push([t[0], s, b]); vals.push(s); hl = {}; hl[i] = 'cur';
        var bh = {}; bh[i] = s >= 7 ? 'bad' : s >= 4 ? 'cur' : 'ok';
        frames.push({ narr: '<b>' + H.esc(t[0]) + '</b> scores ' + s + ' so it is <b>' + b + '</b>. ' + (s >= 7 ? 'Clear goal and easy to check: AI does the first pass.' : s >= 4 ? 'AI drafts, you steer and verify.' : 'Needs context, trust and judgment: you lead.'), parts: [{ type: 'table', label: 'Tasks', columns: ['task', 'exposure', 'bucket'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }, { type: 'bars', label: 'exposure (taller = more automatable)', values: vals.slice(), hl: bh, texts: vals.map(String), idxLabels: rows.map(function (r) { return r[0].slice(0, 8); }) }] });
      });
      frames.push({ narr: 'Pattern: the <span class="c-g">human-led</span> tasks are the ones with fuzzy goals and costly mistakes. Tasks drift left over time as tools improve, so re-score every year.', parts: [{ type: 'bars', label: 'final spectrum', values: vals.slice(), texts: vals.map(String) }] });
      return frames;
    }
  },
  examples: [
    { title: 'Example 1 - A week of a backend engineer', html: `<p>Mon: write a new endpoint (${H.c('r', 'automate')}). Tue: review a teammate's PR with AI summary (${H.c('y', 'augment')}). Wed: figure out why one customer sees double charges (${H.c('g', 'human-led')}). Thu: argue with product about scope (${H.c('g', 'human-led')}). Fri: write docs (${H.c('r', 'automate')}). Notice the week is a <i>mix</i>, and the human-led part is where careers are built.</p>` },
    { title: 'Example 2 - Same title, different tasks', html: `<p>Two "frontend developers": one mostly slices Figma into components (high exposure), the other owns performance, accessibility and design-system decisions (lower exposure). The title tells you little; the task mix tells you a lot.</p>` },
    { title: 'Example 3 - Cheaper work can mean more work', html: `<p>If building an internal tool drops from 3 weeks to 3 days, teams may build <b>ten</b> tools instead of one. Whether total demand for engineers goes up or down depends on this kind of effect, and nobody knows the net result for sure. Treat any confident prediction with suspicion.</p>`, code: { lang: 'python', code: `# Toy model: cost per tool falls, number of tools rises. Net engineer-days are NOT obvious.
for cost_days, tools in [(15, 1), (3, 3), (3, 8)]:
    print(cost_days, "days each x", tools, "tools =", cost_days * tools, "engineer-days")`, run: true, title: 'Toy cost vs volume' } }
  ],
  deepDive: `<p><b>Task-based thinking.</b> Labour economists study automation by tasks (routine vs non-routine, cognitive vs manual). Software work has a twist: the tool that automates is also the tool you use, so the boundary moves faster than in most fields.</p>
  <p><b>Verification is the real bottleneck.</b> Generating code is cheap; knowing it is right is not. Anything with a strong automatic check (tests, types, compilers, a reference implementation) is easier to hand off. Anything where "correct" depends on taste or on a business rule nobody wrote down stays human. So <i>invest in making things checkable</i>: tests, specs, observability.</p>
  <p><b>The ladder problem.</b> Juniors used to learn by doing the easy, high-exposure tasks. If those vanish, how do people reach senior judgment? Good teams answer by deliberately giving juniors review, debugging and small ownership early. This is an open organisational problem, not a solved one.</p>
  <p><b>Hidden limits.</b> Real systems have years of undocumented decisions, flaky infrastructure, compliance rules and people. These "context costs" slow down automation of real work compared to demos. Also beware both extremes: "AI will replace everyone" and "AI is just autocomplete" are both claims that need evidence.</p>
  <p><b>Rule of thumb for yourself:</b> re-score your own task list every quarter. Move your time toward tasks that are fuzzy-goal, high-stakes or people-heavy, and learn to use AI on the rest so you are fast, not stubborn.</p>`,
  aiEra: `<p><b>What AI changes:</b> The unit of value shifts from "lines I typed" to "outcomes I can stand behind". Output is cheap, so being the person who frames the right problem and verifies the result becomes the scarce part.</p>
  <p><b>Use AI as a partner:</b> <code>Here is my task list for the week. For each, tell me what you could draft and what I must decide myself.</code> Then disagree with it - it is a good way to find where your judgment really sits.</p>
  <p><b>Where AI goes wrong:</b> it sounds equally confident on easy and hard tasks, so it will not tell you a task is above its level. It also cannot see unwritten context (who is angry, what was promised last quarter).</p>
  <p><b>What you must still own:</b> choosing the task, defining "done", checking the result, and answering for the consequences.</p>`,
  problems: [{
    title: 'Classify Your Own Week by Automation Exposure', level: 'Easy', tags: ['planning', 'reflection'],
    statement: `<p>List 8 tasks from a typical week of your current or target role. Put each in <b>automate / augment / human-led</b> and give a one-line reason using the rubric (clear goal, cheap check, hidden context, cost of mistake).</p>`,
    constraints: `Use at least 2 tasks in each bucket. No percentages from the internet - use your own 0-10 judgment.`,
    example: `<p>"Write unit tests for a pure function" -> ${H.c('r', 'automate')}: goal clear, test result runs in seconds. "Decide whether to rewrite the billing service" -> ${H.c('g', 'human-led')}: goal fuzzy, mistake very costly.</p>`,
    brute: { why: `<p>Weak approach: classify by job title ("testers are doomed, architects are safe"). Titles hide the real task mix and lead to false comfort or panic.</p>` },
    mcq: { q: 'Which single feature most raises a task\'s automation exposure?', options: ['The result is cheap to check automatically', 'The task is boring', 'The task is done by juniors', 'The task takes many hours'], answer: 0, explain: 'Cheap, automatic checking lets you trust and iterate on generated output. Boredom, seniority and duration are weak signals.' },
    hints: ['Hint 1: Think tasks, not titles. Write the week as a list of verbs.', 'Hint 2: Ask the four rubric questions for each task.', 'Hint 3: For each human-led task write what AI could still help with (summaries, options, drafts) so you do not ignore AI where it helps.'],
    solution: {
      approach: `<p>Model answer for a backend engineer: <b>Automate</b> - boilerplate endpoints, DTO mapping, first-draft unit tests (clear goal, tests check them). <b>Augment</b> - refactoring a legacy class, reviewing a PR, writing a migration (AI drafts, I verify against schema and rollout risk). <b>Human-led</b> - clarifying a vague requirement with product, debugging a rare production incident, deciding on a caching strategy, telling a customer-facing team why a fix will take two days.</p><p>Then I note my plan: use AI first on automate tasks to save about a day a week, and spend the saved time on the human-led tasks and on adding tests that make more of my work checkable. I also write a "revisit in 3 months" date, because the buckets move as tools improve.</p>`,
      complexity: `<p>Effort: 20 minutes. Output: a table plus one decision about where to re-invest saved time.</p>`,
      followUps: ['Which of your human-led tasks could become augment in 2 years, and why?']
    }
  }]
});

topics.push({
  title: 'T-Shaped Skills: Depth Plus Breadth',
  analogy: `<p>Picture the letter <b>T</b>. The tall stem is one area where you go very deep - like a doctor who is a heart specialist. The flat top is a wide, shallower layer across many areas - the same doctor knows enough about nutrition, nursing and insurance to work well with those people. Together they make you useful alone <i>and</i> easy to team up with.</p>`,
  explain: `<p>A <b>T-shaped</b> engineer has <b>one deep specialty</b> (say, backend data systems) and <b>working knowledge across neighbouring areas</b> (frontend basics, cloud, product, security, data, communication).</p>
  <p>Why it matters more with AI: AI is like a very fast generalist with shallow-to-medium depth in everything. If you are <i>only</i> broad and shallow, the tool matches you. If you have <b>real depth</b> somewhere, you can spot what the tool gets wrong there, and you can use it in nearby areas with decent judgment. Some people now talk about a <b>comb or "pi-shaped"</b> profile: two or three deep areas. That is fine - the idea is the same.</p>
  ${H.table(['Layer', 'What it looks like', 'Example'], [['Stem (depth)', 'You can debug it at 3 a.m. and teach it', 'Database performance'], ['Top bar (breadth)', 'You can read, review and ask good questions', 'Frontend, cloud, security basics'], ['Glue', 'Communication, writing, estimation, empathy', 'Explaining a trade-off to a non-engineer'], ['AI fluency', 'Prompting, verifying, building with LLMs', 'Using agents safely, knowing eval basics']])}
  <p>How to build one: pick the stem based on <b>interest + demand + your unfair advantage</b>, go deep via real projects (not only tutorials), then widen one neighbour at a time, spending roughly 70% on the stem and 30% on breadth. Re-check every six months.</p>`,
  clues: ['"What is your specialty?" - answer with a stem plus how breadth supports it', '"How do you stay relevant with AI?" - depth where you can judge AI, breadth to collaborate', '"Generalist or specialist?" - T-shape is the balanced answer, but give a concrete example', '"Tell me about a time you worked outside your area" - evidence of the top bar', '"Where do you want to grow?" - a deliberate next breadth item'],
  code: [{ lang: 'python', title: 'Skills-gap radar from self-ratings (runnable)', run: true, code: `# Compare self-ratings (0-5) with a target profile for the role you want.
# Prints a text radar, the biggest gaps, and whether the shape is T-like.
target = {"coding": 4, "system design": 4, "debugging prod": 4, "product sense": 3,
          "communication": 4, "security basics": 3, "data/ML basics": 3, "AI fluency": 4}
mine = {"coding": 4, "system design": 2, "debugging prod": 3, "product sense": 2,
        "communication": 3, "security basics": 2, "data/ML basics": 1, "AI fluency": 3}

print("skill".ljust(16), "me  target  radar")
for skill in target:
    m, t = mine[skill], target[skill]
    bar = "#" * m + "." * (t - m) if m <= t else "#" * t + "+" * (m - t)
    print(skill.ljust(16), str(m).rjust(2), str(t).rjust(5), "  ", bar)

gaps = sorted(((target[s] - mine[s], s) for s in target), reverse=True)
print()
print("Top 3 gaps:", [(s, g) for g, s in gaps[:3] if g > 0])

# T-shape test: one clear peak (>=4) and most others at least 2
peak = max(mine.values())
others = [v for v in mine.values() if v != peak]
is_t = peak >= 4 and sum(1 for v in others if v >= 2) >= len(others) - 2
print("T-shaped?", "yes: depth + breadth" if is_t else "not yet: deepen one area or widen the base")` }],
  codeTitle: ['Skills-gap radar'],
  viz: {
    title: 'Your T-shape as a skill profile',
    input: 'backend depth:9, databases:6, frontend:3, cloud:4, security:3, product sense:4, communication:5, AI fluency:5',
    inputLabel: 'skill:level (0-10), comma separated',
    gen: function (input) {
      var p = pairs(input, 10), frames = [], vals = [], labels = [], mx = 0, mi = 0;
      p.forEach(function (t, i) { var v = Math.max(0, Math.min(10, t[1])); if (v > mx) { mx = v; mi = i; } });
      frames.push({ narr: 'A T-shape is just a bar chart with <b>one tall bar</b> and a decent floor of other bars. Let us add your skills one by one.', parts: [{ type: 'bars', label: 'skills', values: [0], texts: ['-'] }] });
      p.forEach(function (t, i) {
        var v = Math.max(0, Math.min(10, t[1])); vals.push(v); labels.push(t[0].slice(0, 8));
        var hl = {}; hl[i] = 'cur';
        frames.push({ narr: 'Add <b>' + H.esc(t[0]) + '</b> at level ' + v + '. ' + (v >= 7 ? 'This is deep - could be the stem.' : v >= 4 ? 'Working knowledge - part of the top bar.' : 'Shallow - fine if it is not central to your role.'), parts: [{ type: 'bars', label: 'skill profile', values: vals.slice(), hl: hl, texts: vals.map(String), idxLabels: labels.slice() }] });
      });
      var h2 = {}; h2[mi] = 'sel';
      var low = vals.filter(function (v) { return v <= 2; }).length;
      frames.push({ narr: 'Your stem is <b>' + H.esc(p[mi][0]) + '</b> (' + mx + '). ' + (low ? '<span class="c-y">' + low + ' skill(s) at 2 or below</span> - pick the one your team leans on and lift it to 4.' : 'Your floor is solid. Next: deepen a second area or grow AI fluency.'), parts: [{ type: 'bars', label: 'final T-shape', values: vals.slice(), hl: h2, texts: vals.map(String), idxLabels: labels.slice() }] });
      return frames;
    }
  },
  examples: [
    { title: 'Example 1 - Backend stem', html: `<p>Stem: distributed data systems. Top bar: React basics, Kubernetes, security hygiene, writing design docs. When AI proposes a schema, this person spots the missing index and the migration risk; when a frontend bug appears, they can still read the code.</p>` },
    { title: 'Example 2 - The all-shallow trap', html: `<p>Someone who has touched ten frameworks but can debug none of them deeply. AI can already produce the same surface-level output, so the person offers little extra. Fix: choose one area and ship something hard in it.</p>` },
    { title: 'Example 3 - A planned widening', html: `<p>Quarter 1: add observability (traces, SLOs). Quarter 2: add basic ML evaluation so you can test LLM features. Quarter 3: product analytics. Each step connects to the stem, so it compounds instead of scattering.</p>` }
  ],
  deepDive: `<p><b>Why depth still matters:</b> Evaluation needs expertise. To judge whether an AI-written query plan, lock strategy or security fix is right, you need a mental model deeper than the one the tool displays. Depth is what lets you say "this looks fine but it will fail under retries".</p>
  <p><b>Breadth as risk management:</b> Industries shift. A broad base lets you move your stem if your area shrinks (many people moved from desktop to web to mobile to cloud to ML). Breadth is cheaper than a full restart.</p>
  <p><b>Glue skills are not soft:</b> Writing clear design docs, running a meeting, giving feedback and negotiating scope decide who gets the interesting work. They also transfer across every stem.</p>
  <p><b>Measuring honestly:</b> Self-ratings are biased (beginners overrate, experts underrate). Anchor each level with evidence: "4 = I led a project in this area and a peer would agree". Ask a mentor or manager to rate you on the same scale and compare. The gap between self and others is itself useful information.</p>
  <p><b>Limits of the model:</b> T-shape is a metaphor, not a law. Some great engineers are pure specialists in rare areas; some roles reward pure generalism (early-stage startups). Use it as a planning aid, not an identity.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI lowers the price of breadth - it can explain Kubernetes basics or write a first React component in minutes. That makes the top bar easier to build and the stem (verified depth) relatively more distinctive. A new thin layer appears: <b>AI fluency</b> - knowing how to prompt, review, test and bound AI tools.</p>
  <p><b>Use AI as a partner:</b> <code>I am strong in backend, weak in security. Give me a 6-week plan with one small build per week and a way to check I really learned it.</code></p>
  <p><b>Where AI goes wrong:</b> it flatters. Asked "am I ready?" it tends to encourage. Ask it to quiz you or to find holes instead.</p>
  <p><b>What you must still own:</b> choosing the stem, doing the hard reps, and honest assessment of where you really are.</p>`,
  problems: [{
    title: 'Design Your Own T-Shape', level: 'Medium', tags: ['planning', 'career'],
    statement: `<p>Choose your stem and 4 breadth areas. Rate yourself 0-5 on each, define a target for your next role, and name the top 2 gaps with one concrete project that closes each.</p>`,
    constraints: `Each gap must have a project whose result someone else could check. No "read a book" as the only action.`,
    example: `<p>Stem: backend (4 -> 5). Breadth: security (2 -> 3), frontend (2 -> 3), cloud (3), AI fluency (2 -> 4). Top gaps: AI fluency and security. Projects: ship a small RAG feature with an eval set; run a threat-model session on my service and fix 3 findings.</p>`,
    brute: { why: `<p>Weak answer: "I will learn everything about AI and cloud this year." No stem, no measurable outcome, no order - it ends in burnout and shallow knowledge.</p>` },
    mcq: { q: 'You have limited hours. Best split for a T-shape?', options: ['Mostly the stem, steady slice on breadth', 'All breadth, no depth', 'All depth, ignore neighbours', 'Equal time on ten topics'], answer: 0, explain: 'Depth compounds and is hard to copy; a steady slice of breadth keeps you collaborative and adaptable.' },
    hints: ['Hint 1: Pick the stem where interest, demand and your experience overlap.', 'Hint 2: Choose breadth areas that touch your stem daily (your service\'s database, your deploy pipeline).', 'Hint 3: For each gap define "evidence of done" before starting.'],
    solution: {
      approach: `<p>Model answer. <b>Stem:</b> backend data systems (self 3.5, target 4.5 for senior). <b>Breadth:</b> security basics (2 to 3), frontend (2 to 3), cloud/infra (3 to 3.5), AI fluency (2 to 4), communication (3 to 4). I rank gaps by how often they block me and by what my target role requires: AI fluency and communication come first because they are used daily and are cheap to improve.</p><p>Projects: (1) Build a small retrieval feature with a 30-question evaluation set and write down what failed - evidence: a README with numbers and failure cases. (2) Write one design doc for my team's next change and get two reviewers - evidence: review comments resolved. (3) Quarter 2: threat-model my service. Time split: about 70% on the stem through real work tickets, 30% on the gaps. I re-rate every six months with a manager and compare with my own ratings.</p>`,
      complexity: `<p>Output: a one-page profile and a three-project plan.</p>`,
      followUps: ['What would make you change your stem?', 'How do you tell shallow breadth from useful breadth?']
    }
  }]
});

topics.push({
  title: 'System Thinking and Product Sense',
  analogy: `<p>A <b>city traffic planner</b> does not just widen one road. They know a wider road invites more cars, which moves the jam to the next junction. A <b>product-minded</b> engineer is like a shop owner as well: before building a new counter, they ask who is in the queue and what they actually came to buy. System thinking sees the connections; product sense sees the human need.</p>`,
  explain: `<p><b>System thinking</b> means looking at how parts affect each other over time: feedback loops, bottlenecks, side effects, second-order effects. Example: a retry on failure feels safe, but if every client retries, the extra load can knock the server over (a "retry storm").</p>
  <p><b>Product sense</b> means having good instincts about <i>what is worth building</i> and <i>how you would know it worked</i>. A simple, repeatable way to answer any product question:</p>
  <ol>
  <li><b>User</b> - who exactly is this for?</li>
  <li><b>Problem</b> - what pain do they have today? What do they do now?</li>
  <li><b>Options</b> - two or three ways to help, including "do nothing" and "no code".</li>
  <li><b>Metric</b> - how will we know it worked? One main metric plus a guardrail.</li>
  <li><b>Risks</b> - what could go wrong (technical, user, legal, cost)?</li>
  <li><b>Decision</b> - pick one, say why, say what would change your mind.</li>
  </ol>
  ${H.table(['Weak answer', 'Strong answer'], [['"Add an AI chatbot, everyone has one."', '"Support agents spend most time finding past answers. A draft-reply helper for agents, measured by handle time and customer-rated quality, with human approval."'], ['"We should rewrite in Rust."', '"p99 latency hurts checkout conversion; profile first, then compare targeted fixes vs rewrite cost."']])}
  <p>In AI features especially, ask: <b>What happens when the model is wrong?</b> If the answer is "nobody notices and money moves", redesign with a human check or a smaller scope.</p>`,
  clues: ['"Design a product for X" or "Improve product Y" - run the user -> problem -> options -> metric ladder', '"How would you measure success?" - one primary metric plus a guardrail metric', '"Should we build or buy?" - total cost, differentiation, risk, time to value', '"Where would you add AI to this app?" - start from a user pain, not from the technology', '"What could go wrong?" - second-order effects, abuse, cost, wrong answers'],
  code: [],
  viz: {
    title: 'Product-sense reasoning steps',
    input: 'AI summaries for support tickets',
    inputLabel: 'A product idea to reason about',
    gen: function (input) {
      var idea = String(input).trim().slice(0, 60) || 'AI feature';
      var steps = ['1 User: who is it for?', '2 Problem: what hurts today?', '3 Options: 2-3 ways (incl. no code)', '4 Metric: success + guardrail', '5 Risks: wrong answers, cost, privacy', '6 Decision: pick, justify, revisit trigger'];
      var why = ['Name a real person: for "' + H.esc(idea) + '", maybe a support agent handling 60 tickets a day. "Everyone" is not a user.', 'What do they do today and what does it cost them? Look for the painful moment, not the feature.', 'List a manual fix, a cheap rule-based fix and an AI fix. Compare effort vs benefit.', 'Pick one main metric (time to resolve) and one guardrail (customer satisfaction must not fall).', 'Ask what happens when the model is wrong, and who is harmed. Add a human check if the cost is high.', 'Choose the smallest version that tests the idea, and say what result would make you stop or expand.'];
      var frames = [{ narr: 'We will reason about <b>' + H.esc(idea) + '</b> in six steps. Each step becomes a block in the queue.', parts: [{ type: 'queue', label: 'Reasoning steps', items: [], frontLabel: 'first', backLabel: 'last' }] }];
      for (var i = 0; i < steps.length; i++) {
        var hl = {}; hl[i] = 'cur';
        frames.push({ narr: '<b>Step ' + steps[i] + '</b><br>' + why[i], parts: [{ type: 'queue', label: 'Reasoning steps', items: steps.slice(0, i + 1), hl: hl, frontLabel: 'first', backLabel: 'now' }] });
      }
      frames.push({ narr: 'A clear answer touches all six steps in order, in about two minutes. Skipping to the solution is the most common weak answer.', parts: [{ type: 'queue', label: 'Complete answer', items: steps, hl: { 5: 'sel' }, frontLabel: 'first', backLabel: 'last' }] });
      return frames;
    }
  },
  examples: [
    { title: 'Example 1 - "Add AI search to our docs"', html: `<p><b>User:</b> new engineers. <b>Problem:</b> they cannot find answers and interrupt seniors. <b>Options:</b> better navigation, a curated FAQ, AI search with citations. <b>Metric:</b> questions asked in chat per new hire; guardrail: wrong-answer reports. <b>Risk:</b> stale docs produce confident wrong answers. <b>Decision:</b> pilot AI search with citations on one team.</p>` },
    { title: 'Example 2 - System thinking: the retry storm', html: `<p>A service slows down. Clients time out and retry, tripling the load. The service slows more. Fix: exponential backoff with jitter, retry budgets, circuit breakers. This is a <i>feedback loop</i> - you only see it when you look at the whole system.</p>`, code: { lang: 'python', run: true, title: 'Retry storm toy model', code: `# Load grows when clients retry after timeouts; capacity stays fixed.
capacity, base_load = 100, 80
load = base_load
for minute in range(1, 6):
    overload = max(0, load - capacity)
    retries = overload * 2          # each failed request is retried twice
    load = base_load + retries
    print("minute", minute, "load", load, "capacity", capacity)
# With backoff + a retry budget the extra load is capped, so the system recovers.` } },
    { title: 'Example 3 - Metric with a guardrail', html: `<p>Feature: auto-reply drafts. Primary: median handle time. Guardrail: customer satisfaction and "reply edited by agent" rate. If handle time falls but satisfaction drops, you optimised the wrong thing.</p>` }
  ],
  deepDive: `<p><b>Second-order effects.</b> Ask "and then what?" three times. AI code assistants make code cheap to produce, so reviews, tests and ownership become the bottleneck - the constraint moves, it does not vanish (a classic "theory of constraints" idea).</p>
  <p><b>Local vs global optimisation.</b> Making one team 30% faster at writing code is useless if deploys are blocked by a manual approval step. Map the whole flow (idea to production to feedback) and find the real bottleneck before optimising.</p>
  <p><b>Metrics pitfalls.</b> Goodhart's law: when a measure becomes a target, it stops being a good measure. Counting "lines generated by AI" or "tickets closed" invites gaming. Prefer outcome metrics plus guardrails, and pair numbers with qualitative checks (talk to users).</p>
  <p><b>Build, buy, or skip.</b> With generation costs falling, the cost of <i>owning</i> software (maintenance, security, on-call) matters more than the cost of writing it. A good product-minded engineer asks about lifetime cost, not first-draft cost.</p>
  <p><b>AI product specifics.</b> Plan for non-determinism, evaluation sets, cost per request, latency, fallbacks when the model is down, and user trust (show sources, allow undo). Define "good enough" quality before building, otherwise there is no way to say done.</p>`,
  aiEra: `<p><b>What AI changes:</b> Prototypes are cheap, so the question shifts from "can we build it?" to "should we, and for whom?". Product sense and system thinking become a bigger share of engineering value. Engineers who can build a working prototype <i>and</i> frame its metric are rare and useful.</p>
  <p><b>Use AI as a partner:</b> <code>Play a sceptical product manager. Here is my idea and metric. Give me five hard questions and two ways this could fail.</code> Also ask it for second-order effects and abuse cases.</p>
  <p><b>Where AI goes wrong:</b> it produces generic, plausible product advice ("improve onboarding, add personalisation") with no knowledge of your users. It cannot talk to customers or see your data unless you provide it.</p>
  <p><b>What you must still own:</b> talking to real users, choosing the metric, deciding what not to build.</p>`,
  problems: [{
    title: 'Write a Product-Sense Answer: AI Reply Drafts for Support', level: 'Medium', tags: ['product sense', 'metrics'],
    statement: `<p>Your support team handles 2,000 tickets a week. A manager says "let's use AI to answer tickets." In under two minutes of speaking, write your answer using the six-step ladder: user, problem, options, metric (with guardrail), risks, decision.</p>`,
    constraints: `Include one non-AI option, one guardrail metric, one failure mode and a stop/expand rule.`,
    example: `<p>Good shape: "For agents (not customers first)... the pain is searching old tickets... options are macros, a better knowledge base, AI drafts with agent approval... success is handle time with satisfaction as guardrail... risk is confident wrong refunds policy... pilot on one queue for 4 weeks."</p>`,
    brute: { why: `<p>Weak answer: "Yes, a chatbot will cut costs; we should integrate an LLM." No user, no metric, no risk plan - it cannot be tested and may harm customers.</p>` },
    mcq: { q: 'Which is the best guardrail for a "faster replies" metric?', options: ['Customer satisfaction and escalation rate', 'Number of replies sent', 'Lines of code written', 'Model size'], answer: 0, explain: 'Speed can be gamed by worse replies; satisfaction and escalations catch that.' },
    hints: ['Hint 1: Decide who the first user is - agents, not customers, is safer.', 'Hint 2: Always list a cheaper non-AI option for comparison.', 'Hint 3: End with a decision and a number or event that would make you stop.'],
    solution: {
      approach: `<p><b>User:</b> support agents on the billing queue, who handle most repetitive tickets. <b>Problem:</b> they spend a large part of each ticket finding the right policy and old answers; new agents are slow and inconsistent. <b>Options:</b> (a) tidy the knowledge base and add macros - cheap, no model risk; (b) AI drafts a reply with citations and the agent edits and sends; (c) fully automatic customer chatbot - highest risk. <b>Metric:</b> median time to first useful reply; guardrails: customer satisfaction, reopen rate, and the percentage of drafts agents rewrite heavily. <b>Risks:</b> wrong refund promises, privacy of customer data in prompts, stale policy docs, cost per ticket, agents over-trusting drafts. Mitigations: citations, human approval, redaction, an evaluation set of 100 real past tickets. <b>Decision:</b> do (a) now, pilot (b) on one queue for four weeks; expand if handle time drops without satisfaction falling, stop if the heavy-rewrite rate stays high.</p>`,
      complexity: `<p>Speaking length: about 2 minutes. Structure matters more than detail.</p>`,
      followUps: ['What data would you want before piloting?', 'When would you allow fully automatic replies?']
    }
  }]
});

topics.push({
  title: 'Ethics, Regulation, Privacy, IP and Accountability',
  analogy: `<p>Building AI features is like running a <b>restaurant kitchen</b>. Customers cannot see the kitchen, so they rely on rules: food safety inspections (regulation), keeping allergy lists private (privacy), knowing where ingredients came from (IP and licensing), and a named head chef who answers when someone gets sick (accountability). Good cooks follow these rules not only because inspectors exist, but because people will eat the food.</p>`,
  explain: `<p>Four themes matter for engineers. This is a conceptual overview, <b>not legal advice</b> - always involve your legal and security teams.</p>
  <p><b>1. Regulation by risk tier (EU AI Act, conceptual).</b> The EU AI Act takes a "more risk, more rules" approach. Roughly four levels:</p>
  ${H.table(['Tier', 'Idea', 'Typical examples'], [['Unacceptable', 'Banned practices that threaten rights', 'Social scoring by authorities, certain manipulative systems'], ['High-risk', 'Allowed with strict duties: risk management, data quality, logging, documentation, human oversight', 'AI in hiring, credit, education, critical infrastructure'], ['Limited risk', 'Transparency duties: tell people they talk to AI or see AI-generated content', 'Chatbots, synthetic media'], ['Minimal risk', 'Mostly free use, voluntary good practice', 'Spam filters, game AI']])}
  <p>Rules phase in over several years and details are still being clarified, so check current guidance. Other regions (US states, UK, India, China and others) take different approaches; expect a patchwork.</p>
  <p><b>2. Privacy.</b> Do not paste customer data, secrets or personal data into tools your company has not approved. Principles: collect less (data minimisation), say why (purpose limitation), keep it safe, delete when done. Laws like GDPR give people rights over their data.</p>
  <p><b>3. IP and licensing.</b> Open questions: Can AI output be copyrighted? Did training use licensed data? Rules vary by country and are being tested in courts, so treat claims of certainty with caution. Practical habits: check your tool's terms and indemnity, run licence scanning on generated code, keep human authorship and review notes, never paste proprietary code into unapproved tools.</p>
  <p><b>4. Accountability.</b> A model cannot be blamed. The person or team that ships the feature is responsible. Keep an audit trail: who approved what, which model version, what tests were run.</p>`,
  clues: ['"AI feature that decides about people (hiring, loans, health)" - high-risk thinking: oversight, bias tests, documentation', '"Can we send customer data to the model?" - privacy, data processing agreement, minimisation', '"Who owns the AI-generated code?" - uncertain; licence scan, policy, human review', '"The model gave a wrong answer and a customer lost money" - accountability, logs, incident process', '"Are we compliant?" - ask which jurisdiction and risk tier first'],
  code: [{ lang: 'python', title: 'Simple ethics triage helper (runnable)', run: true, code: `# A tiny, illustrative triage: NOT legal advice, just a checklist that forces good questions.
def triage(sensitive_domain, personal_data, human_can_override, users_told_it_is_ai):
    actions = []
    tier = "minimal"
    if sensitive_domain:                       # hiring, credit, health, education, safety
        tier = "high-risk-like"
        actions += ["risk assessment", "bias/fairness tests", "decision logs", "documentation"]
        if not human_can_override:
            actions.append("BLOCKER: add human oversight and an appeal path")
    elif users_told_it_is_ai is False:
        tier = "limited (transparency needed)"
        actions.append("disclose AI use to users")
    if personal_data:
        actions += ["data minimisation", "approved vendor + data agreement", "retention limit"]
    return tier, actions

cases = [
    ("CV screening helper", True, True, False, True),
    ("Internal code search", False, False, True, True),
    ("Customer chatbot", False, True, True, False),
]
for name, s, p, h, t in cases:
    tier, acts = triage(s, p, h, t)
    print(name, "->", tier)
    for a in acts:
        print("   -", a)` }],
  codeTitle: ['Ethics triage checklist'],
  viz: {
    title: 'Ethics decision tree',
    input: 'y n',
    inputLabel: 'Q1 sensitive domain? Q2 personal data? (y/n y/n)',
    gen: function (input) {
      var a = String(input).trim().toLowerCase().split(/[\s,]+/);
      if (a.length < 2 || !/^[yn]/.test(a[0]) || !/^[yn]/.test(a[1])) throw new Error('Enter two answers like: y n');
      var q1 = a[0][0] === 'y', q2 = a[1][0] === 'y';
      var arr = ['Sensitive domain?', 'Personal data?', 'Personal data?', 'High-risk + PII: oversight, DPIA, bias tests', 'High-risk: oversight, logs, tests', 'Limited: minimise data, consent, disclose', 'Minimal: ship + monitor'];
      var idxQ2 = q1 ? 1 : 2, leaf = q1 ? (q2 ? 3 : 4) : (q2 ? 5 : 6);
      var h0 = {}; h0[0] = 'cur';
      var h1 = {}; h1[0] = 'done'; h1[idxQ2] = 'cur';
      var h2 = {}; h2[0] = 'done'; h2[idxQ2] = 'done'; h2[leaf] = 'sel';
      return [
        { narr: 'Start with the scenario: does the AI influence <b>decisions about people\'s rights or opportunities</b> (hiring, credit, health, education, safety)?', parts: [{ type: 'tree', label: 'Ethics triage tree (left = yes, right = no)', arr: arr, hl: h0 }] },
        { narr: 'Answer 1 = <b>' + (q1 ? 'yes' : 'no') + '</b>. ' + (q1 ? 'We move to the high-risk side, where duties are heavier.' : 'We move to the lighter side, but privacy and transparency still apply.'), parts: [{ type: 'tree', label: 'Ethics triage tree', arr: arr, hl: h1 }] },
        { narr: 'Next: does it use <b>personal data</b>? Answer 2 = <b>' + (q2 ? 'yes' : 'no') + '</b>. Personal data adds consent, minimisation, vendor and retention duties.', parts: [{ type: 'tree', label: 'Ethics triage tree', arr: arr, hl: h1 }] },
        { narr: 'Outcome: <b>' + arr[leaf] + '</b>. Always add: a named owner, logs, a way to report problems, and a plan for when the model is wrong.', parts: [{ type: 'tree', label: 'Ethics triage tree', arr: arr, hl: h2 }, { type: 'table', label: 'Your answers', columns: ['question', 'answer'], rows: [['Sensitive domain?', q1 ? 'yes' : 'no'], ['Personal data?', q2 ? 'yes' : 'no']] }] }
      ];
    }
  },
  examples: [
    { title: 'Example 1 - Resume screening tool', html: `<p>Hiring is a high-risk area. Needs: tests for unfair patterns across groups, a human making the final decision, a way for candidates to ask for review, documentation of data and limits. "The model scored them low" is never a sufficient explanation.</p>` },
    { title: 'Example 2 - Pasting production data into a chatbot', html: `<p>An engineer pastes a customer database export into a public AI tool to debug a query. That may breach privacy law and company policy. Better: use an approved tool, or create masked/synthetic sample data. Habit: ask "would I be comfortable if this text appeared in a news story?"</p>` },
    { title: 'Example 3 - AI-written code with an unknown licence', html: `<p>An assistant produces a function nearly identical to a GPL-licensed project. Risk: licence obligations. Mitigations: tools with referencing/filters, licence scanning in CI, code review, and a clear company policy on AI use.</p>` }
  ],
  deepDive: `<p><b>Risk tiers in practice.</b> Teams often start with an inventory: list every AI use, tag its tier, assign an owner. For high-risk uses the duties typically include risk management over the lifecycle, data governance, technical documentation, record-keeping, transparency to deployers, human oversight, accuracy and robustness. General-purpose model providers have their own separate obligations. Timelines and detailed standards keep evolving, so always read current official sources.</p>
  <p><b>Privacy engineering.</b> Techniques: redact before sending, use zero-retention API terms, separate identifiers from content, regional processing, access controls, deletion workflows (hard when data was used to train). Prompt injection can leak private context, so security and privacy overlap.</p>
  <p><b>Bias and fairness.</b> A model can be accurate overall and unfair to a subgroup. Measure per-group error rates, review training data sources, keep humans in the loop for consequential decisions. There are several fairness definitions that cannot all hold at once - a policy choice, not just a math one.</p>
  <p><b>IP uncertainty.</b> Courts and regulators are still deciding questions on training data, output ownership and attribution. Practical engineering stance: assume uncertainty, document provenance, prefer vendors with clear terms, avoid reproducing large verbatim chunks, and involve counsel for products where IP is central.</p>
  <p><b>Accountability and incidents.</b> Define roles (owner, reviewer, approver), keep model/version/prompt logs, run blameless postmortems for AI incidents, and have a kill switch. "Human in the loop" fails if the human only rubber-stamps; design the review to be meaningful (show evidence, give time, measure override rate).</p>`,
  aiEra: `<p><b>What AI changes:</b> Ethics moves from a poster on the wall to a design requirement. Because anyone can wire up a model in an afternoon, the people with the most power to cause harm are now ordinary engineers.</p>
  <p><b>Use AI as a partner:</b> <code>Act as a privacy reviewer. Here is our data flow. List what personal data goes where and what I should redact. Do not give legal conclusions.</code> It is good for generating checklists and questions for your legal team.</p>
  <p><b>Where AI goes wrong:</b> it may state legal rules confidently and incorrectly, miss recent changes, or invent citations. It also cannot take responsibility.</p>
  <p><b>What you must still own:</b> raising concerns early, checking with legal and security, documenting decisions, and being willing to say "we should not ship this yet".</p>`,
  problems: [{
    title: 'Handle an Ethics Scenario: A Hiring-Screen Model Looks Biased', level: 'Hard', tags: ['ethics', 'accountability', 'regulation'],
    statement: `<p>Your team shipped an AI tool that ranks job applicants for recruiters. A data analyst notices candidates from two universities are ranked lower even when their skills match. Your manager says "the launch is Friday, we'll fix it later." What do you do, in order?</p>`,
    constraints: `Cover: immediate action, investigation, who to involve, user impact, documentation, long-term fix. Avoid legal certainty claims.`,
    example: `<p>Good shape: pause or limit the feature, measure the disparity, involve legal and the affected stakeholders, add human review, fix data/features, document, then relaunch with monitoring.</p>`,
    brute: { why: `<p>Weak answer: "Ship anyway and patch later" or "quietly tweak the model and tell nobody." The first harms candidates and creates legal exposure; the second hides the issue and breaks accountability.</p>` },
    mcq: { q: 'Best first step on discovering a possible bias issue before launch?', options: ['Pause the launch decision, verify the evidence and escalate', 'Ignore it, it is only one analyst', 'Remove the university field and ship', 'Ask the model to explain itself and trust it'], answer: 0, explain: 'Verify and escalate first. Removing one field does not remove proxies, and model self-explanations are not reliable evidence.' },
    hints: ['Hint 1: Hiring is a high-risk use; the cost of a wrong ranking lands on real people.', 'Hint 2: Evidence first - reproduce the disparity with a clear measurement.', 'Hint 3: Escalate in writing, propose options with a trade-off (delay, limited pilot with human review) instead of just saying no.'],
    solution: {
      approach: `<p><b>1. Stop and verify.</b> Reproduce the analyst's finding: compare selection and ranking rates across the two groups after controlling for skills; check sample sizes so I do not overclaim. <b>2. Escalate in writing</b> to my manager, the product owner, and legal/compliance, with the evidence and a clear statement of risk: hiring is a sensitive domain, candidates could be harmed, and the company could face legal exposure. <b>3. Offer options, not just objections:</b> delay launch; launch only as a decision-support tool where recruiters see all candidates and the ranking is not the sole filter; or restrict the pilot to a lower-risk stage. <b>4. Investigate causes:</b> training data history, proxy features (school correlated with past hiring patterns), label quality. <b>5. Fix and test:</b> rebalance or remove proxies, add per-group evaluation, set thresholds for acceptable disparity agreed with legal, add a candidate appeal path. <b>6. Document and monitor:</b> model card, decisions made, who approved, ongoing audits. If leadership still insists on shipping unchanged, I document my objection and use the company's escalation channel; I do not hide it.</p>`,
      complexity: `<p>Not an algorithm - evaluate on order of actions, evidence-mindedness and accountability.</p>`,
      followUps: ['What if the analyst\'s sample is small?', 'How would you monitor fairness after launch?']
    }
  }]
});

topics.push({
  title: 'Building a Learning Habit: Spaced Repetition, Deliberate Practice, Learning in Public',
  analogy: `<p>Learning is like <b>watering a plant</b>. One huge bucket of water on Sunday floods the pot and most runs out. A little water at growing gaps - tomorrow, in three days, in a week, in a month - keeps the roots strong. <b>Spaced repetition</b> is that schedule; <b>deliberate practice</b> is working on the exact weak branch; <b>learning in public</b> is putting the plant on the windowsill where friends can tell you what is wrong with it.</p>`,
  explain: `<p>Tools change every few months; the ability to learn is the skill that does not expire. Three habits do most of the work.</p>
  <p><b>1. Spaced repetition.</b> We forget fast right after learning and slower each time we successfully recall. So review just before you would forget, and stretch the gap every time you succeed: for example 1 day, 3 days, 7 days, 16 days, 40 days. If you fail, the interval resets. Use flashcards, or write your own "explain it without notes" questions.</p>
  ${H.table(['Review #', 'Gap after a good recall', 'Why'], [['1', '1 day', 'memory is fragile'], ['2', '~3-6 days', 'a little stronger'], ['3', '~2 weeks', 'getting stable'], ['4', '~1 month+', 'long-term']])}
  <p><b>2. Deliberate practice.</b> Not "more hours", but <b>focused effort on a skill just beyond your comfort</b>, with fast feedback. Example: instead of reading about system design again, design a rate limiter from a blank page in 30 minutes, then compare to a good solution and note exactly what you missed. Loop: <i>pick a weak spot -> attempt without help -> get feedback -> fix -> repeat</i>.</p>
  <p><b>3. Learning in public.</b> Write short notes, post a small project, answer a question in a forum, give a team talk. Teaching forces clarity, and others correct your mistakes. You do not need to be an expert; "here is what I learned and what I am unsure about" is valuable.</p>
  <p><b>A realistic habit:</b> 30-45 minutes on most days beats a 6-hour weekend. Tie it to an existing routine (after morning coffee), keep a visible streak, and plan for bad weeks by having a 10-minute minimum version.</p>`,
  clues: ['"How do you keep up with AI?" - a system: sources, spaced review, build small things, share', '"Tell me about something you taught yourself" - show method, feedback and result', '"How do you retain what you read?" - active recall and spacing, not rereading', '"How do you handle fast-changing tech?" - learn principles first, tools second', '"What did you learn recently?" - have a specific, honest answer with a gap you still have'],
  code: [{ lang: 'python', title: 'SM-2 style spaced-repetition scheduler (runnable)', run: true, code: `# SM-2 style scheduling: grade each review 0-5 (5 = perfect, <3 = forgot).
# interval grows ~ x ease after successes; a failure resets it.
def review(state, quality):
    reps, interval, ease = state
    if quality < 3:                       # forgot -> start over, tomorrow
        return (0, 1, max(1.3, ease - 0.2))
    ease = max(1.3, ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    reps += 1
    if reps == 1:
        interval = 1
    elif reps == 2:
        interval = 6
    else:
        interval = round(interval * ease)
    return (reps, interval, ease)

state = (0, 0, 2.5)                       # reps, interval(days), ease factor
day = 0
history = [5, 4, 5, 5, 2, 4, 5, 5]        # your grades over time
print("review  grade  next-gap(days)  due-on-day  ease")
for i, q in enumerate(history, 1):
    state = review(state, q)
    day += state[1]
    print(f"{i:>6}  {q:>5}  {state[1]:>14}  {day:>10}  {state[2]:.2f}")` },
    { lang: 'python', title: 'Weekly learning-plan generator (runnable)', run: true, code: `# Build a 7-day plan from hours available and a list of focus areas.
# Rule: deliberate practice first, review small and daily, one public share per week.
def weekly_plan(hours_per_week, focus):
    minutes = int(hours_per_week * 60)
    review_min = 10                                  # daily spaced-repetition slot
    left = minutes - 7 * review_min
    share_min = min(60, max(20, left // 6))          # one share/write-up session
    left -= share_min
    per_focus = left // len(focus)
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    plan = {d: [("review flashcards", review_min)] for d in days}
    # spread focus blocks over Mon-Fri, one topic per day, rotating
    for i, d in enumerate(days[:5]):
        topic = focus[i % len(focus)]
        plan[d].append(("deliberate practice: " + topic, per_focus * len(focus) // 5))
    plan["Sat"].append(("write-up / share what I learned", share_min))
    plan["Sun"].append(("rest + plan next week (10 min)", 10))
    return plan

for day, blocks in weekly_plan(5, ["system design", "LLM evals", "debugging"]).items():
    total = sum(m for _, m in blocks)
    print(day, f"({total} min)")
    for name, m in blocks:
        print("   ", m, "min -", name)` }],
  codeTitle: ['SM-2 scheduler', 'Weekly plan generator'],
  viz: {
    title: 'Spaced-repetition intervals growing',
    input: '5 4 5 5 2 4 5 5',
    inputLabel: 'Your recall grades (0-5), space separated',
    gen: function (input) {
      var g = String(input).trim().split(/[\s,]+/).map(Number);
      if (!g.length || g.some(function (x) { return isNaN(x) || x < 0 || x > 5; })) throw new Error('Enter grades from 0 to 5, e.g. 5 4 5 3');
      if (g.length > 14) throw new Error('Use at most 14 reviews');
      var reps = 0, iv = 0, ease = 2.5, ivs = [], frames = [];
      frames.push({ narr: 'Each bar is the <b>gap in days</b> before the next review. Good recalls stretch the gap; a failed recall (below 3) resets it to 1 day.', parts: [{ type: 'bars', label: 'interval (days)', values: [0], texts: ['start'] }] });
      g.forEach(function (q, i) {
        if (q < 3) { reps = 0; iv = 1; ease = Math.max(1.3, ease - 0.2); }
        else {
          ease = Math.max(1.3, ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)); reps++;
          iv = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(iv * ease);
        }
        ivs.push(iv); var hl = {}; hl[i] = q < 3 ? 'bad' : 'ok';
        frames.push({ narr: 'Review ' + (i + 1) + ': grade <b>' + q + '</b>. ' + (q < 3 ? '<span class="c-r">Forgot - interval resets to 1 day.</span>' : 'Recalled - next gap <b>' + iv + ' days</b> (ease ' + ease.toFixed(2) + ').'), parts: [{ type: 'bars', label: 'interval (days)', values: ivs.slice(), hl: hl, texts: ivs.map(String), idxLabels: ivs.map(function (_, k) { return 'R' + (k + 1); }) }] });
      });
      frames.push({ narr: 'Notice the shape: slow start, then fast growth. After a handful of reviews you spend minutes per month on a fact instead of hours.', parts: [{ type: 'bars', label: 'final schedule (days)', values: ivs.slice(), texts: ivs.map(String) }] });
      return frames;
    }
  },
  examples: [
    { title: 'Example 1 - Learning "consistent hashing" with spacing', html: `<p>Day 0: learn and write a 5-line summary. Day 1: explain it aloud with no notes. Day 4: draw the ring from memory. Day 11: answer "what happens when a node leaves?". Each step costs about 5 minutes and the idea is still there months later.</p>` },
    { title: 'Example 2 - Deliberate practice vs passive reading', html: `<p>Passive: watch three videos on rate limiters. Deliberate: close the video, design a token-bucket limiter, list failure cases, then compare with a reference and note two gaps. The second feels harder - that difficulty is the learning.</p>` },
    { title: 'Example 3 - Learning in public, safely', html: `<p>Post "I built a tiny RAG app over my notes; here is the evaluation set and the 4 failures I found." Share no employer secrets or private data. Invite corrections. Over a year this becomes a portfolio and a network.</p>` }
  ],
  deepDive: `<p><b>Why spacing works.</b> Retrieval strengthens memory more than rereading (the "testing effect"), and effort at the edge of forgetting strengthens it more ("desirable difficulty"). Research on this is solid in lab studies and in classrooms; how much transfers to complex engineering skills is less settled, so combine it with building real things.</p>
  <p><b>SM-2 details.</b> The classic algorithm tracks an <i>ease factor</i> per card (start 2.5, floor 1.3). Quality 5 raises ease, 3 lowers it, below 3 resets repetitions. Modern schedulers (FSRS and others) model forgetting more precisely but follow the same idea. You do not need the exact algorithm; consistency matters more than the scheduler.</p>
  <p><b>Good cards.</b> Make cards atomic (one idea), written as questions that need reasoning ("Why does a cache stampede happen?"), and include your own examples. Avoid copying entire paragraphs. Card creation is itself a learning step.</p>
  <p><b>Deliberate practice needs feedback.</b> Sources: tests, a mentor, code review, evaluation sets, comparing to reference solutions. Without feedback, repetition can lock in mistakes. Keep a "mistake log": what went wrong, why, the rule you will use next time.</p>
  <p><b>Tool-assisted learning and the illusion of competence.</b> If AI writes the answer, you may feel you understood it. Test yourself with a blank page. Also protect time: a habit that depends on motivation fails; one that depends on a calendar slot survives.</p>
  <p><b>Burnout and breadth.</b> You cannot keep up with every release. Use a filter: follow a small number of trusted sources, learn ideas that survive across tools (evaluation, retrieval, systems trade-offs), and skip hype cycles until something is useful in your work.</p>`,
  aiEra: `<p><b>What AI changes:</b> It is the best patient tutor you have had, available at 2 a.m. But it also makes it tempting to skip the struggle, and struggle is where memory forms. The new risk is <b>fluent ignorance</b>: reading a perfect explanation and believing you own it.</p>
  <p><b>Use AI as a partner:</b> <code>Quiz me on consistent hashing, one question at a time. Wait for my answer. Grade it 0-5 and tell me what I missed. Then give me a card for each gap.</code> You can also ask it to generate practice problems at a level just above yours and to review your learning notes for errors.</p>
  <p><b>Where AI goes wrong:</b> confident wrong explanations, invented references, and answers that match what you hinted at. Cross-check important facts with official docs or a second source.</p>
  <p><b>What you must still own:</b> the recall attempt, the schedule, and the honesty of your self-grading.</p>`,
  problems: [{
    title: 'Build a 90-Day Learning Plan', level: 'Medium', tags: ['learning', 'planning'],
    statement: `<p>You work full time and have about 5 hours per week. Build a 90-day plan to become comfortable building and evaluating an LLM-powered feature. Include weekly rhythm, three milestones with evidence, a spaced-repetition routine, a learning-in-public output, and what you do on a bad week.</p>`,
    constraints: `Realistic hours only. Each milestone needs checkable evidence. Include one review checkpoint at day 45.`,
    example: `<p>Milestone 1 (day 30): a working prompt + retrieval prototype with 20 test questions. Milestone 2 (day 60): an evaluation set with measured failures and one improvement. Milestone 3 (day 90): a short write-up and a demo to colleagues.</p>`,
    brute: { why: `<p>Weak plan: "Study AI for 3 hours every evening and finish three courses." Unrealistic with a job, no evidence of learning, no review, collapses by week 3.</p>` },
    mcq: { q: 'Which is the best "bad week" rule?', options: ['A 10-minute minimum so the streak and the card reviews survive', 'Skip and double up next week', 'Quit the plan', 'Only learn on weekends'], answer: 0, explain: 'A tiny floor keeps the habit alive; doubling up rarely happens and causes guilt.' },
    hints: ['Hint 1: Work backwards from a visible result at day 90.', 'Hint 2: Fixed weekly rhythm: 4 short practice sessions, 1 build session, daily 10-minute review.', 'Hint 3: Add a day-45 checkpoint to cut or change what is not working.'],
    solution: {
      approach: `<p><b>Rhythm (5 h/week):</b> daily 10-minute spaced-repetition review (about 70 min), three 60-minute practice sessions on weekdays, one 90-minute build/write session on the weekend. <b>Days 1-30 (foundations + prototype):</b> learn tokens, context windows, prompting and retrieval basics; build a small question-answering app over my own notes. Evidence: 20 test questions with pass/fail results. <b>Days 31-60 (evaluation):</b> make a golden set of 50 questions, measure accuracy and failure types, fix chunking or prompts, re-measure. Evidence: a before/after table. <b>Day 45 checkpoint:</b> review the mistake log; drop topics that do not feed the project, add one gap. <b>Days 61-90 (reliability + sharing):</b> add logging, cost estimate, privacy review, a fallback when the model is wrong; write a 600-word post and demo to colleagues for feedback. <b>Spaced repetition:</b> every concept I get wrong goes to a card. <b>Bad week rule:</b> do the 10-minute review and write one sentence in the mistake log; do not make up hours. At day 90 I rate myself against the original goals with a colleague's view.</p>`,
      complexity: `<p>Planning effort: about 1 hour. The plan is judged on realism, evidence and feedback loops.</p>`,
      followUps: ['What do you cut if you only have 2 hours a week?']
    }
  }]
});

topics.push({
  title: 'A 5-Year Career Roadmap: Junior to Senior to Staff with AI Fluency',
  analogy: `<p>A career is like <b>learning to drive in stages</b>. First you follow instructions in a quiet car park (junior). Then you drive alone on normal roads (mid). Then you plan routes and teach others (senior). Finally you help design the roads and traffic rules for the whole city (staff). In each stage you still need earlier skills, but the <i>size of what you are responsible for</i> grows. AI is a new, powerful car - it helps at every stage, but you must still know where you are going.</p>`,
  explain: `<p>Titles differ between companies and the timeline varies a lot, so treat the following as a <b>sketch, not a rule</b>. Many people take longer, and some stop at senior happily - that is a fine outcome.</p>
  ${H.table(['Stage', 'Typical span', 'Scope', 'How you are judged', 'AI fluency looks like'], [['Junior', 'years 0-2', 'a task or small feature', 'learns fast, writes correct, tested code, asks good questions', 'use assistants for drafts, but explain every line you submit'], ['Mid', 'years 2-4', 'a feature or component, owned end to end', 'delivers reliably, debugs well, reviews others', 'delegate routine work, write tests and specs for AI, review output critically'], ['Senior', 'years 4-7', 'a system or a team\'s technical direction', 'sound design, mentoring, handling ambiguity, risk', 'set team norms for AI use, design with evals, guard quality'], ['Staff', 'years 7+', 'several teams, long-term strategy', 'multiplies others, sets direction, resolves hard cross-team problems', 'shape org-wide AI policy, platforms, build/buy choices, ethics']])}
  <p><b>The 5-year view</b> (illustrative):</p>
  <ul>
  <li><b>Year 1:</b> master your tools; fundamentals (data structures, testing, Git, debugging); build the habit of verifying AI output.</li>
  <li><b>Year 2:</b> own a feature end to end; learn the stack below you; pick a stem.</li>
  <li><b>Years 3-4:</b> lead a project; write design docs; mentor interns; build one LLM-powered feature with evaluation.</li>
  <li><b>Year 5:</b> senior scope: drive a system's roadmap, handle incidents, influence other teams; decide where AI belongs in your area.</li>
  <li><b>Beyond:</b> either staff (broad technical leadership) or management (people leadership) - different paths, try each before choosing.</li>
  </ul>
  <p>Each year ask: <b>Is my scope bigger? Is my judgment better? Do others do better because of me?</b></p>`,
  clues: ['"Where do you see yourself in 5 years?" - stage-by-stage scope growth, not just a title', '"What does senior mean to you?" - ownership of ambiguity, mentoring, risk judgment', '"How do you differ as staff vs senior?" - scope across teams, influence without authority', '"How will AI change your career?" - concrete plan to adapt, with humility about uncertainty', '"IC or manager?" - explain trade-offs, mention trying both'],
  code: [],
  viz: {
    title: 'Career roadmap stages',
    input: 'Mid',
    inputLabel: 'Your current stage (Junior, Mid, Senior, Staff)',
    gen: function (input) {
      var names = ['Junior', 'Mid', 'Senior', 'Staff'];
      var s = String(input).trim().toLowerCase(), cur = -1;
      names.forEach(function (n, i) { if (n.toLowerCase() === s) cur = i; });
      if (cur < 0) throw new Error('Type one of: Junior, Mid, Senior, Staff');
      var scope = ['task', 'feature', 'system', 'several teams'];
      var ai = ['AI drafts, I explain', 'AI for routine, I review', 'Team AI norms + evals', 'Org AI strategy'];
      var xs = [12, 37, 63, 88];
      function nodes() {
        var ns = names.map(function (n, i) { return { id: n, label: n, x: xs[i], y: 14, shape: 'box', w: 18 }; });
        ns.push({ id: 'AI', label: 'AI fluency (every stage)', x: 50, y: 42, shape: 'box', w: 40 });
        return ns;
      }
      var edges = [['Junior', 'Mid'], ['Mid', 'Senior'], ['Senior', 'Staff']];
      var frames = [];
      frames.push({ narr: 'Four stages, each with a bigger <b>scope</b>. AI fluency runs underneath all of them. You are at <b>' + names[cur] + '</b> (highlighted).', parts: [{ type: 'graph', label: 'Roadmap', directed: true, height: 50, nodes: nodes(), edges: edges.concat([['AI', 'Mid']]), hl: { [names[cur]]: 'cur' } }] });
      for (var i = 0; i < 4; i++) {
        var hl = {}; hl[names[i]] = i === cur ? 'cur' : (i < cur ? 'done' : 'win');
        var tg = {}; tg[names[i]] = scope[i];
        frames.push({ narr: '<b>' + names[i] + '</b>: scope is a <b>' + scope[i] + '</b>. AI fluency here: ' + ai[i] + '.' + (i === cur ? ' <span class="c-y">You are here.</span>' : i < cur ? ' <span class="c-m">Behind you - keep these skills sharp.</span>' : ' <span class="c-b">Ahead - start practicing pieces now.</span>'), parts: [{ type: 'graph', label: 'Roadmap', directed: true, height: 50, nodes: nodes(), edges: edges, hl: hl, ehl: {}, tags: tg }] });
      }
      var next = cur < 3 ? names[cur + 1] : null;
      var h2 = {}; h2[names[cur]] = 'cur'; if (next) h2[next] = 'sel';
      frames.push({ narr: next ? 'Your next move: grow from <b>' + scope[cur] + '</b> to <b>' + scope[cur + 1] + '</b>. Do next-stage work before you are given the title: lead a small design, mentor one person, own an incident follow-up.' : 'At staff level the work is multiplying others and choosing what matters. Many strong engineers stay here for a long time.', parts: [{ type: 'graph', label: 'Next step', directed: true, height: 50, nodes: nodes(), edges: edges, hl: h2, ehl: next ? { [names[cur] + '-' + next]: 'ok' } : {} }] });
      return frames;
    }
  },
  examples: [
    { title: 'Example 1 - Junior with AI', html: `<p>Priya uses an assistant to draft a function, then writes the tests herself and explains each line to her reviewer. When asked "why a dict here?", she can answer. Her seniors trust her faster because she shows she can verify, not just generate.</p>` },
    { title: 'Example 2 - Mid to senior jump', html: `<p>Arjun owns the search feature. To step up he writes a design doc for a re-index, gets feedback from two teams, runs the migration, and writes the postmortem when it goes wrong. Scope grew from "my code" to "a system and its risks". The title followed 8 months later.</p>` },
    { title: 'Example 3 - Staff-level AI move', html: `<p>Instead of every team buying its own AI tool, a staff engineer proposes a shared gateway with logging, redaction, cost limits and an evaluation harness, then gets three teams to adopt it. Impact comes from multiplying others and reducing risk.</p>` }
  ],
  deepDive: `<p><b>Promotion is evidence of scope.</b> Companies promote people already doing the next level's work. Keep a "brag document": decisions you led, incidents you resolved, people you grew, measurable outcomes. Review it quarterly.</p>
  <p><b>IC vs management.</b> Staff and principal engineers stay technical with wide influence; managers grow people and teams. Neither is a promotion above the other. Try tech-lead work to test your appetite before choosing.</p>
  <p><b>Sponsorship and visibility.</b> Good work does not speak for itself. Mentors give advice; <i>sponsors</i> speak for you in rooms you are not in. Build them by being useful and clear in writing.</p>
  <p><b>Changing market.</b> Hiring cycles, company size and geography change opportunities. Keep an emergency fund, a current CV, and a network built when you did not need it. Avoid planning on a single employer or single technology.</p>
  <p><b>Uncertain AI scenarios.</b> Plan for at least three: (1) AI makes engineers much more productive and demand grows; (2) productivity rises but hiring shrinks; (3) progress stalls and the world looks like today. A good plan - deep stem, strong judgment, communication, learning habit - holds up in all three. That robustness matters more than guessing right.</p>
  <p><b>Trap to avoid:</b> chasing every new tool title ("prompt engineer", "agent builder") as an identity. Roles named after tools often fade; skills named after problems (reliability, evaluation, data, security, product) last.</p>`,
  aiEra: `<p><b>What AI changes:</b> The bottom rungs get harder to see (less routine work to learn on) and the top rungs reward judgment, evaluation and cross-team clarity even more. AI fluency becomes baseline, like knowing Git: not a differentiator by itself, but a gap if missing.</p>
  <p><b>Use AI as a partner:</b> <code>Here is my brag document and my target level's expectations. Where is the evidence weak? Suggest three projects that would show next-level scope.</code> Also use it to rehearse promotion conversations and design-review questions.</p>
  <p><b>Where AI goes wrong:</b> generic advice, outdated market claims, flattering assessments. It does not know your company's culture or ladder.</p>
  <p><b>What you must still own:</b> choosing the direction, building relationships, taking responsibility for outcomes, and revisiting the plan every year.</p>`,
  problems: [{
    title: 'Draft Your 5-Year Roadmap With Checkpoints', level: 'Hard', tags: ['career', 'planning'],
    statement: `<p>Pick your current stage and write a year-by-year plan for five years: scope target, skills to add, AI-fluency milestone, evidence you will collect, and one risk with a backup plan. Mark which parts depend on your employer and which you control.</p>`,
    constraints: `Make it robust to three AI futures (growth, shrinking hiring, stall). Avoid unverifiable numbers about salaries or job counts.`,
    example: `<p>Year 1: ship 3 features with tests (evidence: PRs + review feedback). Year 2: own the notifications service. Year 3: lead a project with 2 engineers. Year 4: write the team's AI-use guide and an eval harness. Year 5: senior scope across two teams.</p>`,
    brute: { why: `<p>Weak plan: "In 5 years I will be a staff engineer making X." It names a title and number, ignores what must be learned or shown, and breaks if the market moves.</p>` },
    mcq: { q: 'Which makes a career plan most robust to uncertain AI futures?', options: ['Deep judgment skills, communication and a learning habit', 'Betting on one new tool', 'Avoiding AI completely', 'Only chasing job titles'], answer: 0, explain: 'These skills hold value across growth, shrinkage and stall scenarios; tool bets and avoidance are fragile.' },
    hints: ['Hint 1: Define scope per year (task -> feature -> system -> multiple teams).', 'Hint 2: For every goal write the evidence a peer could check.', 'Hint 3: Add a scenario table: what do I do if hiring shrinks / if my team is cut / if AI moves faster than expected?'],
    solution: {
      approach: `<p>Starting stage: mid-level backend engineer. <b>Year 1:</b> scope - own a service; skills - observability, on-call; AI - use an assistant daily and write tests/specs before generating code; evidence - zero repeat incidents on my service, 5 reviewed designs. <b>Year 2:</b> scope - lead a cross-team feature; skills - design docs, estimation; AI - build one LLM feature with a 50-question evaluation set; evidence - launch + eval report. <b>Year 3:</b> senior scope - drive a roadmap for a system, mentor two engineers; AI - team guidelines for review of AI-written code. <b>Year 4:</b> influence across teams, lead an incident review program; AI - cost and privacy gateway proposal. <b>Year 5:</b> staff-track evidence - a decision that changed how several teams work. <b>Controllable vs not:</b> I control learning, visibility and documentation; promotion timing, reorgs and budgets depend on the employer, so I keep a network and market-ready CV. <b>Scenarios:</b> growth - I move faster to broader scope; shrinking hiring - my deep stem and incident/reliability record is my edge and I keep a savings buffer; stall - the plan still works. <b>Review:</b> every January compare plan vs reality with a mentor and update.</p>`,
      complexity: `<p>One-page plan; reviewed yearly.</p>`,
      followUps: ['What would make you choose management instead?', 'What if your company has no staff ladder?']
    }
  }]
});

// ---------- practice ----------
function P(title, level, tags, statement, constraints, example, bruteWhy, mcq, hints, approach, complexity, followUps) {
  practice.push({ title: title, level: level, tags: tags, statement: statement, constraints: constraints, example: example,
    brute: { why: bruteWhy }, mcq: mcq, hints: hints, solution: { approach: approach, complexity: complexity, followUps: followUps } });
}
function M(q, options, answer, explain) { return { q: q, options: options, answer: answer, explain: explain }; }

P('Task or Job? Rewrite a Headline', 'Easy', ['reasoning', 'automation'],
  `<p>A headline says "AI will replace software testers." Rewrite it as a task-level statement and name two testing tasks that are more exposed and two that are less exposed.</p>`,
  `Use the rubric: clear goal, cheap check, hidden context, cost of mistake.`,
  `<p>More exposed: generating basic unit-test cases for a pure function; converting manual steps to a script. Less exposed: deciding what risks matter for a new payment flow; exploratory testing of a confusing UI.</p>`,
  `<p>Weak answer: accept or reject the headline whole ("true" / "false"). Jobs are bundles of tasks, so a yes/no hides the real change.</p>`,
  M('Why is task-level analysis better than job-level?', ['A job contains tasks with very different exposure', 'Tasks are easier to count', 'Jobs never change', 'It avoids all uncertainty'], 0, 'Different tasks inside one job face very different automation pressure.'),
  ['Hint 1: List what a tester actually does in a week.', 'Hint 2: Ask "is correctness easy to check?" for each task.', 'Hint 3: Add what time freed by automation could be used for.'],
  `<p>Rewrite: "AI tools can already draft many routine test cases and scripts, which shifts tester time toward risk analysis, exploratory testing, test strategy and quality advocacy - the outcome for hiring is uncertain." Exposed tasks: writing simple unit and API tests from a clear spec (goal clear, runs automatically); updating tests after a rename; summarising a long failure log. Less exposed: deciding which risks justify more testing for a launch (requires business context); finding unexpected behavior by exploring (needs curiosity and product understanding); negotiating with developers about severity. A balanced conclusion is that the tester's value moves toward judgment and test design, and that people who learn to direct and verify AI tools are likely to do better, while admitting that nobody knows the exact employment effect.</p>`,
  `<p>Short writing exercise, 10 minutes.</p>`, ['What evidence would change your mind?']);

P('Spot the Weak Spot: Automate, Augment or Lead?', 'Easy', ['classification'],
  `<p>Classify each: (a) convert a JSON file to CSV, (b) design the data model for a new product, (c) summarise a pull request, (d) calm a customer during an outage, (e) write a regex for emails. Give one-line reasons.</p>`,
  `Each must land in exactly one bucket; defend borderline ones.`,
  `<p>(a) automate, (b) human-led with AI options, (c) augment, (d) human-led, (e) augment (easy to write, easy to get subtly wrong).</p>`,
  `<p>Weak: label all five "AI can do it". Ignores trust, context and cost of mistakes.</p>`,
  M('Which has the highest cost of a hidden mistake?', ['Regex used for validation in a payment flow', 'JSON to CSV for a local test', 'Summary of a draft PR', 'Meeting notes'], 0, 'Validation errors can let bad data through; the others are easy to spot or low impact.'),
  ['Hint 1: Is the goal fully written down, or fuzzy?', 'Hint 2: Who would notice an error and how fast?', 'Hint 3: Borderline cases usually go to augment.'],
  `<p>(a) Automate: the format is fixed and a diff or small test confirms it. (b) Human-led: it depends on how the business will change; AI can propose alternatives, but a person must choose and own the trade-offs. (c) Augment: AI drafts the summary, the reviewer reads the actual code before approving. (d) Human-led: needs empathy, authority and context; AI can help draft a status message that a human edits. (e) Augment: AI can write it in seconds, but you must test edge cases (plus signs, long domains) because mistakes are subtle. Notice that classification came from the four rubric questions, not from how "technical" the task sounds.</p>`,
  `<p>Five short justifications.</p>`, ['Which would you re-score in two years?']);

P('Compute a Simple Exposure Score by Hand', 'Easy', ['rubric', 'calculation'],
  `<p>Using weights goal clarity 3, cheap check 3, low hidden context 2, cheap mistake 2 (total 10) and answers on a 0-1 scale, score "write a SQL report query" with answers 0.8, 0.9, 0.7, 0.6.</p>`,
  `Show the arithmetic. Interpret using 7+ / 4-6 / below 4.`,
  `<p>3(0.8)+3(0.9)+2(0.7)+2(0.6) = 2.4+2.7+1.4+1.2 = 7.7 out of 10 -> automate-leaning.</p>`,
  `<p>Weak: just say "high". Without arithmetic the score cannot be challenged or compared.</p>`,
  M('If "cheap mistake" drops to 0.1, the score is about?', ['6.7', '7.7', '3.4', '9'], 0, '2.4+2.7+1.4+0.2 = 6.7, which is augment territory.'),
  ['Hint 1: Multiply each weight by its answer.', 'Hint 2: Sum and divide by total weight (10).', 'Hint 3: Re-run with a changed answer to see sensitivity.'],
  `<p>Score = (3x0.8 + 3x0.9 + 2x0.7 + 2x0.6) / 10 x 10 = 7.7. That lands in "automate-leaning": AI writes the first query, a human skims and runs it on sample data. Sensitivity check: if the schema is poorly documented and hidden context is high (0.2 instead of 0.7), the score drops by 1.0 to 6.7, moving to augment - which shows the rubric responds to context as it should. Note the score is a conversation tool, not a measurement; two reasonable people may differ by a point or two and that is fine as long as they explain why.</p>`,
  `<p>Constant time; the value is in the discussion.</p>`, ['Which weight would you change for a medical company, and why?']);

P('What Do You Tell a New Hire About Pasting Code Into AI?', 'Easy', ['privacy', 'policy'],
  `<p>Write a 5-bullet guide for new hires on what they may and may not put into AI tools at work.</p>`,
  `Be practical; mention approved tools, secrets, customer data, licences, and verification.`,
  `<p>Example bullet: "Never paste API keys, passwords or customer data into any tool not approved by security."</p>`,
  `<p>Weak: "Be careful." Vague guidance changes no behaviour.</p>`,
  M('Which item is safest to paste into an unapproved public chatbot?', ['A public open-source function you want explained', 'A production database dump', 'An API key', 'A customer email'], 0, 'Public material carries no confidentiality risk, but check the policy anyway.'),
  ['Hint 1: Think secrets, personal data, proprietary code.', 'Hint 2: Name an approved alternative tool for each rule.', 'Hint 3: End with a "when unsure, ask" rule and who to ask.'],
  `<p>1) Use only company-approved AI tools for work code; the list lives in the security wiki. 2) Never paste secrets (keys, tokens, passwords) or personal data of customers or staff; mask or use synthetic data. 3) Proprietary code and designs stay in approved tools with agreed data terms. 4) You own what you ship: read, test and understand AI-written code, and run the licence scanner. 5) If unsure, ask the security or legal contact before pasting, and report mistakes early without fear - an early report is cheaper than a late discovery. Add a short reason to each rule so people remember them.</p>`,
  `<p>A one-page policy snippet.</p>`, ['How do you enforce this without slowing people down?']);

P('Radar Chart Interpretation: Where Do You Invest First?', 'Medium', ['skills', 'planning'],
  `<p>Self-ratings (0-5) vs role target: coding 4/4, system design 2/4, debugging prod 3/4, communication 3/4, AI fluency 3/4, security 2/3. Choose the top two investments and justify using gap size, frequency of use and cost to close.</p>`,
  `Do not simply pick the largest gaps; consider leverage.`,
  `<p>Gaps: system design 2, security 1, debugging 1, communication 1, AI fluency 1. Likely picks: system design (largest and central) and communication (cheap, used daily, multiplies the rest).</p>`,
  `<p>Weak: "fix everything at once." Spreading effort across five gaps means nothing improves visibly.</p>`,
  M('Which factor is most important beyond gap size?', ['How often the skill is needed and how cheaply it can be improved', 'How fashionable it is', 'How hard it is', 'What friends choose'], 0, 'Leverage = frequency of use x cheapness of improvement, on top of gap size.'),
  ['Hint 1: Compute gaps first (target minus current).', 'Hint 2: Score frequency (1-3) and cost to close (1-3).', 'Hint 3: Pick two; schedule the rest later.'],
  `<p>Gaps: design 2, security 1, debugging 1, communication 1, AI 1, coding 0. System design has the largest gap and is central to progression, so it is pick one; practice with one design doc per month reviewed by a senior, plus timed blank-page design exercises. For the second pick, communication has a gap of 1 but is used every day and improves with quick feedback loops (writing short design summaries, asking for review), so its leverage is high and its cost low. AI fluency is close behind; I fold it into daily work rather than a separate project. Security and debugging go into the next quarter. Re-rate in six months with a manager to correct my own bias.</p>`,
  `<p>Planning exercise, about 15 minutes.</p>`, ['How would you check your self-ratings are fair?']);

P('Draft a Learning-in-Public Post That Is Safe', 'Medium', ['writing', 'privacy'],
  `<p>You built an internal tool that uses an LLM to classify support tickets. Draft a public post (about 150 words) about what you learned without leaking confidential details.</p>`,
  `No company names of customers, no data samples, no internal metrics. Include one mistake.`,
  `<p>Good shape: general lesson ("our first prompt over-labelled 'billing'"), how you evaluated, one failure, one question to readers.</p>`,
  `<p>Weak: paste screenshots of real tickets and boast about internal numbers. Breaks confidentiality and teaches nothing portable.</p>`,
  M('What makes public learning posts valuable?', ['Honest process, failure cases and open questions', 'Only success stories', 'Many buzzwords', 'Posting daily regardless of content'], 0, 'Readers learn from process and honest failure, and you get corrections.'),
  ['Hint 1: Generalise - remove names, data and numbers that identify your company.', 'Hint 2: Show your method (eval set, comparison).', 'Hint 3: End with a question to invite feedback.'],
  `<p>Sample: "I spent a month building an LLM-based classifier for support-style messages. Three lessons. 1) My first prompt looked great on five examples and failed on a larger set, so I made a 60-example test set with tricky cases before changing anything. 2) The biggest error type was the model guessing a category when the message was vague; adding an 'unclear' option and asking for a short reason cut those errors a lot in my tests (small sample, so take it lightly). 3) I still read a random sample of outputs every week. What I am unsure about: how large an evaluation set is enough? How do you keep it fresh? Would love to hear how others do this." Check before posting: no customer data, no internal names or figures, manager approval if policy requires.</p>`,
  `<p>150 words; review checklist.</p>`, ['How do you handle being publicly wrong?']);

P('Design a Spaced-Repetition Schedule by Hand (SM-2 Style)', 'Medium', ['spaced repetition', 'calculation'],
  `<p>Start with ease 2.5. Grades: 5, 5, 5, then 2, then 4. Compute the intervals using: rep1=1 day, rep2=6 days, later = previous x ease (rounded); failure resets to 1 day. Ease changes can be ignored for this exercise.</p>`,
  `Show the schedule and total days to the fifth review.`,
  `<p>Intervals: 1, 6, 15 (6 x 2.5), reset to 1, then 1 (rep1 after reset). Total days elapsed: 1+6+15+1+1 = 24.</p>`,
  `<p>Weak: review everything daily forever. Time cost explodes and the memory does not strengthen as well as with spacing.</p>`,
  M('Why does the interval reset after a failed recall?', ['The memory is weak again and needs frequent reinforcement', 'To punish the learner', 'Because 6 days is the maximum', 'It does not reset in SM-2'], 0, 'A failure shows the memory is fragile, so the schedule restarts with short gaps.'),
  ['Hint 1: Write reps and intervals in a table.', 'Hint 2: After a failed grade reps returns to 0.', 'Hint 3: Sum the intervals for elapsed days.'],
  `<p>Review 1 (grade 5): reps=1, next gap 1 day. Review 2 (grade 5): reps=2, gap 6 days. Review 3 (grade 5): reps=3, gap = round(6 x 2.5) = 15 days. Review 4 (grade 2): failure, reps=0, gap 1 day. Review 5 (grade 4): reps=1, gap 1 day. Elapsed days to the point of the fifth review's scheduling: 1+6+15+1+1 = 24. Lesson: success makes gaps grow geometrically (1, 6, 15, then ~37 if the next one succeeds), so a well-learned fact costs only a few minutes per year; a failure is cheap because the item returns tomorrow. With real SM-2 the ease would also drop a little after the failure, making later gaps shorter.</p>`,
  `<p>O(n) in the number of reviews.</p>`, ['How would you adapt this for concepts rather than facts?']);

P('Answer: "How Do You Use AI at Work?" (Interview Version)', 'Medium', ['interview', 'communication'],
  `<p>An interviewer asks, "How do you use AI in your daily work?" Write a 90-second model answer that shows judgment, not just enthusiasm.</p>`,
  `Include: what you delegate, how you verify, one limit you respect, one example outcome, and your privacy habit.`,
  `<p>Good structure: use -> verify -> limits -> example -> learning.</p>`,
  `<p>Weak: "I use it for everything, it makes me 10x faster." No verification, no limits, unverifiable claim, signals risk to the employer.</p>`,
  M('Which phrase signals the strongest answer?', ['"I draft with AI, then verify with tests and own the result."', '"AI writes all my code."', '"I never use AI."', '"AI is always right."'], 0, 'It shows both fluency and accountability.'),
  ['Hint 1: Start with two or three concrete uses.', 'Hint 2: Describe your verification, e.g. tests, reading diffs, running code.', 'Hint 3: Mention data rules and a time AI was wrong.'],
  `<p>"I use AI as a fast first-draft partner. For example, I ask an assistant to scaffold boilerplate, draft unit tests for a clear spec, and summarise unfamiliar code or long logs. I never paste secrets or customer data, and I use the company-approved tools. For anything that matters I verify: I read the diff, run the tests, and for logic-heavy code I write the tests first so the AI has something to satisfy. A recent example: it suggested a retry loop without backoff for a flaky API client; I caught it in review, added jitter and a cap, and wrote a test that simulates failures. I do not use it to decide product direction or to debug a production incident I do not understand yet - there I use it as a rubber duck for hypotheses, but I check the evidence myself. I also use it to learn: I ask it to quiz me on topics I'm weak on. Overall it saves me time on routine work, and I spend that time on design and review." Keep it under 90 seconds and offer to go deeper.</p>`,
  `<p>Rehearse aloud twice.</p>`, ['What is a task you deliberately do not give to AI?', 'How do you review AI-written code differently from human-written code?']);

P('Ethics Scenario: Customer Data and a Third-Party Model', 'Hard', ['ethics', 'privacy', 'vendor'],
  `<p>Your product manager wants to send full customer chat transcripts to a third-party model API to power summaries. Legal has not reviewed the vendor. Launch is in two weeks. Respond with a plan.</p>`,
  `Cover data minimisation, vendor terms, user transparency, security, fallback, accountability. No legal conclusions.`,
  `<p>Good shape: pause sending raw data; map data flow; redact; check vendor terms (retention, training use, region); disclose to users; test; log; named owner.</p>`,
  `<p>Weak: "Just send it, everyone does." Ignores consent, contracts and breach risk.</p>`,
  M('Which is the strongest first mitigation?', ['Minimise and redact data before sending, and confirm vendor terms', 'Send everything and encrypt later', 'Ask the model to ignore private details', 'Hide the feature from users'], 0, 'Reduce what leaves your boundary and confirm contractual limits; models cannot be trusted to ignore data.'),
  ['Hint 1: Draw the data flow first, field by field.', 'Hint 2: Ask what is truly needed for a summary.', 'Hint 3: Offer a path to launch (smaller scope), not just "no".'],
  `<p><b>1) Map the flow:</b> what fields are in the transcripts (names, emails, payment mentions, health info?), where they are sent, how long they are retained. <b>2) Minimise:</b> remove identifiers and sensitive fields before sending (redaction), send only the last N messages if enough. <b>3) Vendor review with legal and security:</b> data-processing terms, no training on our data, retention and deletion, region, subprocessors, breach notification. <b>4) Transparency and rights:</b> update privacy notice, tell users that AI summaries are generated, support deletion and access requests. <b>5) Security:</b> keys in a secrets manager, access control, logging that does not store raw content unnecessarily. <b>6) Quality and fallback:</b> an evaluation set that includes sensitive-looking cases, a human-visible summary label, and a switch to disable the feature. <b>7) Accountability:</b> a named owner, a documented decision record. <b>Path to launch:</b> in two weeks, ship to internal agents on redacted data with an approved vendor path, and postpone customer-facing exposure until review completes. This gives the PM a win without taking the risk.</p>`,
  `<p>Judged on completeness and a constructive path.</p>`, ['What if the vendor refuses to sign terms?']);

P('Roadmap Under Uncertainty: Three AI Futures', 'Hard', ['career', 'scenario planning'],
  `<p>Create a career plan that holds up across three futures: (A) AI boosts demand for engineers, (B) AI raises productivity but entry-level hiring shrinks, (C) progress slows. Identify "no-regret moves" and "scenario-specific moves".</p>`,
  `No numeric predictions. At least 3 no-regret and 1 specific move per scenario.`,
  `<p>No-regret: deep stem, verification habit, communication, savings buffer, network. Specific: A - take on broader scope sooner; B - target roles with more ownership and reliability; C - keep deepening and leverage tools modestly.</p>`,
  `<p>Weak: pick one future and bet everything. If wrong, the plan collapses.</p>`,
  M('What is a "no-regret move"?', ['An action that pays off in all plausible futures', 'A very cheap action', 'A risky bet', 'A past decision'], 0, 'No-regret moves are robust choices that help whichever way the future goes.'),
  ['Hint 1: List actions, then test each against all three futures.', 'Hint 2: Keep the ones valuable in all three.', 'Hint 3: Add trigger signals that tell you which future is arriving.'],
  `<p><b>No-regret moves:</b> (1) develop a deep stem where you can judge AI output; (2) build verification skills - tests, specs, evals, debugging; (3) practise clear writing and stakeholder communication; (4) keep a weekly learning habit with spaced review; (5) maintain a finance buffer and an active network; (6) document wins in a brag document. <b>Scenario A (more demand):</b> raise scope faster, volunteer for new product lines, mentor, prepare for leadership. <b>Scenario B (entry hiring shrinks):</b> seek roles with real ownership, strengthen reliability and operations skills that are hard to automate, build public evidence of skill (projects, write-ups), consider adjacent roles (data, security, product engineering). <b>Scenario C (slower progress):</b> keep using tools sensibly, deepen the stem, avoid over-rotating on hype. <b>Triggers:</b> watch your own team's hiring, what tasks you actually delegate successfully, and quarterly check-ins; revisit the plan each quarter and say aloud which future you currently think is most likely and why.</p>`,
  `<p>One-page scenario matrix.</p>`, ['What signal would make you switch employers?']);

P('System Thinking: Predict the Side Effects of an AI Rollout', 'Hard', ['system thinking', 'risk'],
  `<p>A company gives every engineer an AI coding assistant. Predict at least five second-order effects across code review, testing, onboarding, security and morale, and propose a mitigation for each.</p>`,
  `Balanced: include positives as well as risks. Mark each as likely / possible.`,
  `<p>Example: more code produced -> review queue grows (likely) -> add smaller PRs, AI-assisted pre-review, and review-time metrics.</p>`,
  `<p>Weak: "productivity goes up." One-sided and ignores that bottlenecks move.</p>`,
  M('Typical bottleneck shift when code generation becomes cheap?', ['Review, testing and integration', 'Typing speed', 'Keyboard quality', 'None'], 0, 'The constraint moves from writing to verifying and integrating.'),
  ['Hint 1: Follow the flow idea -> code -> review -> test -> deploy -> operate.', 'Hint 2: Ask "and then what?" at each step.', 'Hint 3: Pair each risk with a measurable guardrail.'],
  `<p>1) <b>Review queue grows</b> (likely): more and larger PRs. Mitigation: size limits, review rotas, AI-assisted pre-review as a first pass but human final approval. 2) <b>Subtle bugs and duplicated code</b> (likely): generated code looks plausible. Mitigation: stronger tests, static analysis, ownership of modules, periodic cleanup. 3) <b>Security and licence risks</b> (possible): secrets in prompts, vulnerable patterns. Mitigation: approved tools, scanners in CI, training. 4) <b>Onboarding changes</b> (possible, mixed): newcomers ramp faster on syntax but may skip understanding. Mitigation: "explain it back" reviews and pairing. 5) <b>Skill atrophy and morale</b> (possible): some enjoy the speed, some feel deskilled or anxious about jobs. Mitigation: open discussion, clear policy, learning time. 6) <b>Positive effect</b> (possible): faster prototypes and test writing free time for design. Measure the rollout with outcomes (cycle time, change failure rate, incident count, developer survey), not "lines generated", and run it as a pilot with comparison.</p>`,
  `<p>Qualitative; judged on breadth and mitigations.</p>`, ['How would you measure success without Goodhart effects?']);

P('Mock Staff-Level Question: Set AI Policy for 200 Engineers', 'Hard', ['leadership', 'policy', 'ethics'],
  `<p>You are asked to propose an AI-use policy and enablement plan for 200 engineers across five teams. Outline principles, tooling, guardrails, training, measurement, and how you handle disagreement.</p>`,
  `Include decision rights and a review date. Avoid blanket bans and blanket permission.`,
  `<p>Good shape: principles (human accountability, privacy first), approved tools, tiered risk rules, training, metrics, feedback channel, quarterly review.</p>`,
  `<p>Weak: a 30-page rulebook nobody reads, or "use whatever you like." Either extreme fails in practice.</p>`,
  M('Best way to roll out a new policy?', ['Short principles, tiered rules, pilot, feedback and scheduled review', 'A ban', 'No guidance', 'A long PDF'], 0, 'Short, risk-based and adaptive policies are followed and kept current.'),
  ['Hint 1: Start from principles, then risk tiers.', 'Hint 2: Provide approved paths so people do not go around the rules.', 'Hint 3: Include measurement and a review date.'],
  `<p><b>Principles:</b> humans are accountable for what ships; protect customer and company data; transparency about AI use; keep learning. <b>Risk tiers:</b> green (public code, docs, tests): free use of approved tools; amber (proprietary code): approved tools with data terms and review; red (customer data, regulated or high-impact decisions): need security/legal sign-off, evaluation and human oversight. <b>Tooling:</b> one or two approved assistants, a gateway with logging, redaction and cost limits, a secure sandbox for agents. <b>Guardrails in CI:</b> secret scanning, licence scanning, tests required for AI-assisted changes, code ownership. <b>Training:</b> two-hour workshop on verification, prompt basics, privacy, plus office hours. <b>Measurement:</b> cycle time, change failure rate, incidents, developer survey; compare pilot and control teams. <b>Governance:</b> a small group (engineering, security, legal) decides exceptions in a few days; policy reviewed quarterly because tools change fast. <b>Disagreement:</b> publish rationale, collect objections openly, and change the policy when evidence supports it. Success is safe adoption people actually follow.</p>`,
  `<p>A two-page proposal; assessed on realism and balance.</p>`, ['How do you handle a team that wants an unapproved tool?']);

quiz.push(
  { q: 'The most useful way to estimate AI\'s effect on your work is to analyse...', options: ['Individual tasks within your job', 'Your job title only', 'Headlines', 'Company size'], answer: 0, explain: 'Jobs are bundles of tasks with different exposure.' },
  { q: 'Which task is generally LEAST exposed to automation?', options: ['Debugging a rare production incident with unclear symptoms', 'Writing boilerplate getters', 'Converting date formats', 'Generating simple docs'], answer: 0, explain: 'Fuzzy goals, hidden context and high stakes keep it human-led.' },
  { q: 'A T-shaped engineer has...', options: ['One deep area and working breadth elsewhere', 'Shallow knowledge of everything', 'Knowledge of only one language', 'No specialty'], answer: 0, explain: 'Depth in one area plus breadth elsewhere.' },
  { q: 'In a product-sense answer, a guardrail metric is...', options: ['A measure that must not get worse while you improve the main metric', 'The main goal', 'A budget', 'A legal document'], answer: 0, explain: 'It prevents optimising one thing at the expense of another.' },
  { q: 'Under the EU AI Act\'s risk-tier idea, which gets the heaviest obligations (while still allowed)?', options: ['High-risk systems such as hiring or credit decisions', 'Spam filters', 'Video game AI', 'A calculator'], answer: 0, explain: 'High-risk systems carry duties like oversight, documentation and risk management. Unacceptable-risk practices are banned outright.' },
  { q: 'Who is accountable for harm caused by an AI feature you ship?', options: ['The people and organisation that built and deployed it', 'The model itself', 'No one', 'Only the vendor'], answer: 0, explain: 'A model cannot be held accountable; people and organisations are.' },
  { q: 'Spaced repetition works best when you...', options: ['Review just before forgetting and widen the gap after success', 'Reread daily', 'Cram once', 'Avoid testing yourself'], answer: 0, explain: 'Retrieval at increasing gaps strengthens memory efficiently.' },
  { q: 'Deliberate practice differs from plain repetition because it...', options: ['Targets weak spots at the edge of ability with feedback', 'Is longer', 'Is easier', 'Needs no feedback'], answer: 0, explain: 'Focused effort plus feedback is the key.' },
  { q: 'Which statement about the future of software careers is best supported?', options: ['It is uncertain; plan for several scenarios', 'Developers will all be replaced next year', 'Nothing will change', 'Only juniors are affected'], answer: 0, explain: 'Evidence-minded answers admit uncertainty and rely on robust skills.' },
  { q: 'What is a "no-regret move" in career planning?', options: ['An action that helps in every plausible future', 'A cheap course', 'A job change', 'An investment'], answer: 0, explain: 'Deep skills, communication and a learning habit help across scenarios.' },
  { q: 'Which habit best reduces the "illusion of competence" when learning with AI?', options: ['Try to answer from a blank page before reading the AI\'s answer', 'Copy the AI answer into notes', 'Ask for longer answers', 'Read faster'], answer: 0, explain: 'Active recall exposes gaps that fluent explanations hide.' },
  { q: 'At staff level, the main change in scope compared to senior is...', options: ['Influence across several teams and long-term direction', 'Typing more code', 'Fewer meetings', 'Working only on one function'], answer: 0, explain: 'Staff scope is broader and about multiplying others.' }
);

interview.push(
  { q: 'Which parts of software work do you think AI will change the most, and which least?', level: 'I', a: `<p>I think about tasks rather than jobs. Tasks with a clear written goal, cheap automatic checking and low cost of error - boilerplate, routine tests, format conversions, first-draft docs - are the most exposed. Tasks with fuzzy goals, hidden context and high stakes - choosing what to build, system design trade-offs, debugging odd production incidents, aligning stakeholders - change less and probably gain value, because cheap code makes judgment the scarce part. I would add that this is a prediction under uncertainty: cheaper software can also mean more software, so the net effect on jobs is hard to know. So I plan for several futures and invest in skills that hold up in all of them.</p>`, followUps: ['What evidence would change your view?', 'What about junior roles?'] },
  { q: 'How do you use AI in your daily work?', level: 'I', a: `<p>I use it as a fast first-draft partner and a tutor. Day to day: scaffolding code, drafting tests from a clear spec, summarising unfamiliar code or logs, and brainstorming alternatives. I use approved tools only and never paste secrets or customer data. I verify everything that matters: read the diff, run tests, and for logic-heavy code write tests first. I do not delegate decisions I cannot evaluate. For example, it once suggested a retry without backoff; I caught that in review. The time saved goes to design, review and learning. I also use it to quiz me on topics I am weak in, but I try to answer from memory first.</p>`, followUps: ['Tell me about a time AI was wrong.', 'What would you never delegate?'] },
  { q: 'What does it mean to be T-shaped, and what is your shape?', level: 'B', a: `<p>T-shaped means deep expertise in one area plus working knowledge across related areas, with communication as the glue. My stem is backend data systems, where I can debug and teach. My breadth includes cloud basics, security hygiene, a little frontend and AI fluency. I choose breadth that touches my stem, so it compounds. With AI, depth matters even more because it lets me judge generated output, while breadth lets me use AI safely in adjacent areas. My next gap to close is evaluation of LLM features, and I plan a small project with a test set to show it.</p>`, followUps: ['How do you decide what to deepen next?', 'When would being a pure specialist be better?'] },
  { q: 'Walk me through how you would decide whether to add an AI feature to our product.', level: 'A', a: `<p>I start with the user and the pain, not the technology: who struggles today and what do they do instead? Then I list options including a non-AI one. I define one main metric with a guardrail (for example time saved without a drop in satisfaction), and a quality bar measured on a representative evaluation set. I think about what happens when the model is wrong - who is harmed and whether a human check is needed - plus privacy, cost per request, latency and fallbacks. I would pilot the smallest version with a stop or expand rule. Only then do I decide, and I document why.</p>`, followUps: ['What if stakeholders insist on shipping without evaluation?', 'How do you estimate cost?'] },
  { q: 'Explain the EU AI Act risk tiers at a high level.', level: 'A', a: `<p>Conceptually it is risk-based: more risk to people's rights or safety means more obligations. Unacceptable-risk practices are prohibited. High-risk systems (for example in hiring, credit, education, critical infrastructure) are allowed but must meet requirements such as risk management, data governance, documentation, logging, human oversight, accuracy and robustness. Limited-risk systems mostly have transparency duties - telling people they are interacting with AI or seeing generated content. Minimal-risk uses are largely unregulated. General-purpose model providers have their own obligations. Timelines phase in and details are still evolving, so I would check current official guidance and involve legal. I treat this as a conceptual map, not legal advice.</p>`, followUps: ['How would it affect your team design?', 'What other regions matter?'] },
  { q: 'An AI-generated function might copy licensed code. What do you do?', level: 'I', a: `<p>I treat IP rules around AI output as unsettled and vary by jurisdiction, so I take practical precautions. I use tools whose terms and indemnity our legal team has reviewed, enable duplicate-detection or referencing features if available, run licence scanning in CI, and review generated code for suspicious verbatim blocks. For anything central to the product I rewrite or at least understand and own it, keep notes of human review, and ask legal when unsure. I also avoid pasting proprietary code into unapproved tools. The principle is accountability: I cannot say "the AI wrote it" if there is a problem.</p>`, followUps: ['Who owns AI-generated code?', 'How do you handle open-source licences?'] },
  { q: 'Describe a time you had to raise an ethical concern. If none, how would you?', level: 'I', a: `<p>My approach is: verify with evidence first, then escalate early and in writing, with options. For instance, if I saw an unfair pattern in a ranking model, I would reproduce it with a clear measurement, share it with my manager, product and legal/compliance, explain who could be harmed, and propose choices such as delaying, adding human review or limiting scope. I would document the decision and my input. If leadership overruled me on a serious issue, I would record my objection and use the company's escalation channel. The goal is to be constructive, not just say no.</p>`, followUps: ['What if your manager disagrees?', 'When is whistleblowing appropriate?'] },
  { q: 'How do you keep your skills current when everything changes so fast?', level: 'B', a: `<p>I use a system rather than willpower. I follow a small set of trusted sources, learn principles that outlast tools (evaluation, retrieval, systems trade-offs), and build small projects to test ideas. I use spaced repetition for concepts I get wrong, deliberate practice on weak spots with feedback, and I share what I learn in notes or team talks, which forces clarity and invites correction. I budget about 30 to 45 minutes most days with a 10-minute minimum for bad weeks. I deliberately skip hype until something helps my work.</p>`, followUps: ['What did you learn recently?', 'How do you avoid burnout?'] },
  { q: 'What is the role of a junior engineer in an AI-heavy team?', level: 'B', a: `<p>The job is still to learn and to deliver trustworthy work. A junior can use AI to draft and to explain, but must be able to explain every line submitted, write tests, and ask good questions. The risk is skipping the struggle that builds judgment, so I would deliberately practise debugging without AI, read code, and take review feedback seriously. Teams also have a responsibility to give juniors real ownership and review exposure, because routine tasks that used to teach them are shrinking. How the junior market evolves is uncertain, so building visible evidence of skills matters.</p>`, followUps: ['How would you mentor a junior who over-relies on AI?', 'How do you measure their growth?'] },
  { q: 'Senior versus staff: how do they differ?', level: 'A', a: `<p>A senior engineer owns a system or a team's technical direction, handles ambiguity, designs well, mentors and manages risk. A staff engineer extends this across several teams and over longer time horizons: setting technical strategy, resolving cross-team problems, creating leverage through platforms, standards and people, and influencing without direct authority. Staff impact is judged by how much others succeed because of you. With AI, senior sets team norms and evals for AI-assisted work; staff shapes org-wide approaches such as gateways, policy, build-versus-buy and ethics. Titles vary between companies, so I focus on scope and evidence.</p>`, followUps: ['How do you show staff-level impact?', 'Staff or manager - how would you choose?'] },
  { q: 'How would you plan a 5-year career with so much uncertainty?', level: 'A', a: `<p>I would plan for several scenarios and favour no-regret moves: a deep stem, verification and debugging skills, clear communication, a learning habit, a financial buffer and a network. Then I add scenario-specific moves and triggers that tell me which way things are going. Each year I set a scope goal (task, feature, system, multiple teams), the evidence I will collect, and an AI-fluency milestone like building and evaluating an LLM feature. I review the plan with a mentor every January. I do not rely on one employer or tool, and I avoid numbers I cannot support.</p>`, followUps: ['What are your triggers to change course?', 'What would you do if your area shrank?'] },
  { q: 'How do you judge whether an AI-assisted change is safe to ship?', level: 'E', a: `<p>I apply the same bar as for any change, with extra suspicion where the author did not fully reason through the code. I ask for a clear spec or tests that define done, read the diff for unexpected files and patterns, run static analysis, secret and licence scans, and add or review tests that include edge cases and failure paths. For risky areas such as auth, money and data migrations, I want a human who truly understands it, plus staged rollout, monitoring and an easy rollback. I measure the practice with outcomes like change-failure rate and incidents. The accountable owner is the human who approved the change.</p>`, followUps: ['How would you measure whether AI use is hurting quality?', 'What is your rollback plan?'] }
);

registerModule({
  id: 'ai17',
  title: 'The Future of Software Careers with AI',
  intro: `<p>Nobody can predict exactly how AI will change software work, and this module does not pretend to. Instead it gives you a <b>thinking toolkit</b>: how to look at tasks (not job titles), what skills stay valuable, how to reason about products, how to handle ethics, privacy, IP and regulation, how to build a learning habit that survives hype, and how to plan a career from junior to senior to staff with solid AI fluency. Everything is framed as planning under uncertainty, with reflective exercises and small runnable Python tools you can adapt for yourself.</p>`,
  goals: [
    'Classify real tasks as automate, augment or human-led using an explainable rubric',
    'Design your own T-shaped skill profile and find your top gaps',
    'Give a structured product-sense answer with a metric, a guardrail and risks',
    'Handle an AI ethics scenario: privacy, IP, risk tier, accountability',
    'Build a spaced-repetition and deliberate-practice routine and a 90-day learning plan',
    'Plan a 5-year junior-to-staff roadmap that holds up under several AI futures',
    'Answer "How do you use AI at work?" with judgment, not hype'
  ],
  prereqs: `Helpful: AI modules on using AI tools effectively and AI-augmented software engineering. No new math or coding is required.`,
  hours: 8,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
