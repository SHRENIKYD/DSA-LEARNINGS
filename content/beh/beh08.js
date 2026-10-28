(function () {
var topics = [], practice = [], quiz = [], interview = [];

// Compact builder for scenario problems (behavioral: brute = weak answer, solution.approach = strong model answer)
function P(o) {
  var pad = function (t, n, add) { return t.replace(/<[^>]*>/g, '').length >= n ? t : t + ' ' + add; };
  o.h = o.h.map(function (x) { return pad(x, 45, 'Say it out loud as you practise.'); });
  o.bw = pad(o.bw, 45, 'The interviewer gets no evidence of depth or ownership.');
  o.mq[3] = pad(o.mq[3], 25, 'Show your reasoning aloud.');
  return {
    title: o.t, level: o.lv, tags: o.tags, companies: o.co || ['Google', 'Amazon', 'Meta'],
    statement: o.st, constraints: o.cons || '<p>Time to answer: 1-3 minutes out loud unless stated. Simple words, numbers where you have them, "I" for your work.</p>',
    example: o.ex,
    brute: { why: o.bw, code: { lang: 'text', code: o.bc } },
    mcq: { q: o.mq[0], options: o.mq[1], answer: o.mq[2], explain: o.mq[3] },
    hints: o.h,
    solution: { approach: o.ap, code: o.sc ? { lang: 'text', code: o.sc } : undefined, complexity: o.cx || '<p>Cost: a few minutes of prep per story. Benefit: the panel sees depth, ownership and judgment instead of a vague tour of a codebase.</p>', followUps: o.fu }
  };
}
// Viz builder: a table that grows row by row (weak or strong telling), then a verdict
function buildViz(title, columns, scripts, defaultKey) {
  return {
    title: title, input: defaultKey, inputLabel: 'Pick a version: ' + Object.keys(scripts).join(' / '),
    gen: function (input) {
      var k = String(input).trim().toLowerCase();
      if (!scripts[k]) throw new Error('Type one of: ' + Object.keys(scripts).join(', '));
      var s = scripts[k], frames = [], rows = [];
      frames.push({ narr: '<b>' + s.intro + '</b> Each step adds one row of the answer.', parts: [{ type: 'table', label: 'Answer so far', columns: columns, rows: [] }] });
      for (var i = 0; i < s.rows.length; i++) {
        rows.push(s.rows[i].slice(0, columns.length));
        var hl = {}; hl[rows.length - 1] = s.rows[i][columns.length] === 'g' ? 'ok' : (s.rows[i][columns.length] === 'r' ? 'bad' : 'cur');
        frames.push({ narr: s.rows[i][columns.length + 1], parts: [{ type: 'table', label: 'Answer so far', columns: columns, rows: rows.map(function (r) { return r.slice(); }), hl: hl }] });
      }
      frames.push({ narr: s.verdict, parts: [{ type: 'text', html: s.verdict }] });
      return frames;
    }
  };
}

var PY_PICK = "# Project picker: score candidate projects for a deep-dive interview.\n# Each criterion is 0-3. Weights reflect what panels probe most.\nWEIGHTS = {\n    'my_ownership': 3,     # did I make the key decisions?\n    'technical_depth': 3,  # real trade-offs, not CRUD glue\n    'measurable_result': 2,# numbers I can defend\n    'recency': 1,          # within ~3 years, I remember details\n    'scope': 2,            # matches target level (team/org)\n    'story_has_conflict': 1,  # something went wrong or was debated\n}\n\nPROJECTS = {\n    'Checkout latency rewrite': dict(my_ownership=3, technical_depth=3, measurable_result=3, recency=3, scope=2, story_has_conflict=2),\n    'Team-wide React upgrade':  dict(my_ownership=2, technical_depth=1, measurable_result=1, recency=3, scope=2, story_has_conflict=1),\n    'Search ranking (I helped)': dict(my_ownership=1, technical_depth=3, measurable_result=3, recency=2, scope=3, story_has_conflict=1),\n    'Hackathon chatbot':        dict(my_ownership=3, technical_depth=1, measurable_result=0, recency=3, scope=0, story_has_conflict=0),\n}\n\nmax_score = sum(w * 3 for w in WEIGHTS.values())\nranked = []\nfor name, s in PROJECTS.items():\n    score = sum(WEIGHTS[k] * s[k] for k in WEIGHTS)\n    weakest = min(WEIGHTS, key=lambda k: s[k])\n    ranked.append((score, name, weakest))\n\nranked.sort(reverse=True)\nfor score, name, weakest in ranked:\n    pct = round(100 * score / max_score)\n    print(f'{name:28s} {score:2d}/{max_score} ({pct:3d}%)  weakest: {weakest}')\nprint()\nprint('Pick:', ranked[0][1])\n# Red flag check: never pick a project where you cannot own the decisions\nfor score, name, weakest in ranked:\n    if PROJECTS[name]['my_ownership'] <= 1:\n        print('Warning:', name, '- low ownership, drill-downs will expose it')\n";

var PY_TIME = "# Deep-dive time budget: split a project walkthrough across sections.\n# Change TOTAL to 5, 10, 20 or 45 minutes.\nTOTAL = 10\nSECTIONS = [\n    ('Context + goal', 0.12),\n    ('My role', 0.08),\n    ('Architecture (diagram)', 0.22),\n    ('Key decisions + trade-offs', 0.25),\n    ('Results with numbers', 0.13),\n    ('What went wrong / lessons', 0.12),\n    ('Buffer for questions', 0.08),\n]\nassert abs(sum(p for _, p in SECTIONS) - 1.0) < 1e-9, 'shares must add to 100%'\nclock = 0.0\nfor name, share in SECTIONS:\n    mins = TOTAL * share\n    start = clock\n    clock += mins\n    print(f'{start:5.1f} -> {clock:5.1f} min  {name:28s} ({mins:.1f} min)')\nprint(f'Total: {clock:.1f} min')\n";

var PY_VAGUE = "# Vague-claim detector: flags results with no numbers and 'we' without 'I'.\nimport re\nANSWER = '''We built a new caching layer and it made things much faster.\nI designed the cache key scheme and the invalidation on writes.\nP95 latency dropped from 820 ms to 210 ms and DB load fell 60 percent.\nWe also improved reliability a lot.'''\nVAGUE = ['much faster', 'a lot', 'significantly', 'improved', 'better', 'huge']\nfor n, line in enumerate(ANSWER.splitlines(), 1):\n    has_num = bool(re.search(r'\\d', line))\n    vague = [w for w in VAGUE if w in line.lower()]\n    we_only = ' we ' in f' {line.lower()} ' and ' i ' not in f' {line.lower()} '\n    flags = []\n    if vague and not has_num:\n        flags.append('vague claim, add a number: ' + ', '.join(vague))\n    if we_only:\n        flags.append('only \"we\" - what was YOUR part?')\n    print(f'Line {n}:', 'OK' if not flags else '; '.join(flags))\n";

/* ===================== TOPIC 1 ===================== */
topics.push({
  title: 'Choosing the Right Project to Present',
  analogy: `<p>A chef entering a cooking contest does not cook the dish she has made most often. She picks the one that shows <b>her skill</b>, that she can explain ingredient by ingredient, and that has a story ("the sauce split once, here is how I saved it"). Your deep-dive project is that signature dish.</p>`,
  explain: `<p>"Walk me through your most complex project" sounds like a memory question. It is really a <b>selection test</b>. The project you choose tells the interviewer what you think "complex" and "impressive" mean. A wrong choice can sink a strong engineer before the first drill-down.</p>
  <p>Score each candidate project on six things:</p>
  <ul>
  <li><b>Ownership:</b> did <i>you</i> make the key decisions? If the tech lead decided everything, the drill-downs will expose you.</li>
  <li><b>Technical depth:</b> real trade-offs (consistency vs latency, build vs buy, data model choices), not just wiring APIs together.</li>
  <li><b>Measurable result:</b> a before/after number you can defend: latency, cost, error rate, revenue, hours saved.</li>
  <li><b>Recency:</b> ideally within 2-3 years, so you remember details like table schemas and QPS.</li>
  <li><b>Scope fit:</b> for a senior role, team-level or wider; for staff, cross-team.</li>
  <li><b>Tension:</b> something went wrong, was debated, or was cut. Smooth stories have no learning.</li>
  </ul>
  ${H.table(['Project', 'Good pick?', 'Why'], [['Rewrote checkout path, you designed it, p95 820 to 210 ms', H.c('g', 'Yes'), 'Ownership + depth + number'], ['Big famous ML system, you wrote one ETL job', H.c('r', 'Risky'), 'Impressive name, thin ownership'], ['Hackathon toy, fully yours', H.c('y', 'Only for juniors'), 'No scale, no result'], ['Migration that half-failed, you led the rollback', H.c('g', 'Yes'), 'Tension + ownership + lessons']])}
  <p>Prepare <b>two</b> projects: a primary and a backup with a different flavour (for example one systems-heavy, one people/cross-team heavy). Interviewers sometimes say "pick another one".</p>`,
  clues: ['"Walk me through the most complex project you have worked on"', '"Tell me about a project you are proud of"', '"Pick a project and we will go deep on it for 30 minutes"', '"Choose something where you made the key technical decisions"', 'Staff loop: "a project with the largest scope you drove"', 'Recruiter prep note mentions a "project deep dive" or "past project" round'],
  code: [{ lang: 'python', title: 'Project picker: score candidates (runnable)', run: true, code: PY_PICK }],
  codeTitle: ['Project picker (runnable)'],
  viz: buildViz('Choosing a project: weak vs strong selection', ['Candidate thinks', 'Check'], {
    weak: { intro: 'Weak selection: picks the most famous system.', rows: [
      ['"Search ranking is our biggest system, I will talk about that."', 'Fame', 'r', 'The candidate picks by brand, not by ownership.'],
      ['"I built the feature-logging job for it."', 'Ownership 1/3', 'r', 'Their real part is small. The interviewer will ask "why that model?" and they cannot answer.'],
      ['"I am not sure of the QPS or model details."', 'Depth gap', 'r', 'Drill-downs expose the gap within five minutes.'],
      ['"Results? Ranking got better, I think."', 'No number', 'r', 'No defendable result.']
    ], verdict: '<p><span class="c-r">Verdict:</span> a big name with thin ownership reads as "passenger". The panel scores the candidate, not the system.</p>' },
    strong: { intro: 'Strong selection: scores candidates honestly.', rows: [
      ['List 4 projects from the last 3 years', 'Candidates', 'c', 'Start broad, then filter.'],
      ['Score ownership, depth, result, recency, scope, tension', 'Rubric', 'c', 'Use the same six criteria for each.'],
      ['Checkout rewrite scores highest: I designed it, p95 820 to 210 ms', 'Primary', 'g', 'High ownership and a hard number.'],
      ['Backup: led a cross-team migration that needed a rollback', 'Backup', 'g', 'Different flavour: people + recovery.'],
      ['Drop "search ranking" to a one-line mention', 'Avoid', 'g', 'Mention it, but do not stake the round on it.']
    ], verdict: '<p><span class="c-g">Verdict:</span> the chosen project lets the candidate answer every "why" from memory, with numbers.</p>' }
  }, 'strong'),
  examples: [
    { title: 'Weak vs strong opener', html: `<p><span class="c-r">Weak:</span> "I worked on Payments Platform, which processes billions of dollars." (Platform size, not your contribution.)</p><p><span class="c-g">Strong:</span> "I'll talk about the idempotency layer I designed for our payments API. Duplicate charges were 0.4 percent of disputes; I led the design and built the core, three engineers helped. It cut duplicates to near zero. I picked it because it had real trade-offs around storage and retries."</p>` },
    { title: 'When all your projects feel small', html: `<p>Depth beats size. A small project with a clear hard decision ("I chose a write-through cache and here is the race condition I found") is better than a big one you watched. Look for: a bug hunt that needed real investigation, an internal tool with real users, a performance fix with numbers.</p>` },
    { title: 'Confidential project', html: `<p>Say so up front and abstract it: "This is under NDA, so I'll describe it as a recommendation service for a large retailer, about 20K QPS. Numbers are rounded." Panels accept this. Never leak secrets to look impressive - it is a judgment red flag.</p>` },
    { title: 'Matching project to level', html: `${H.table(['Target level', 'Ideal project shape'], [['Mid (L4)', 'A feature or component you built end to end'], ['Senior (L5)', 'A system or project you led for a team, with design choices'], ['Staff (L6+)', 'Cross-team initiative, ambiguous start, you set direction']])}` }
  ],
  deepDive: `<p><b>Why interviewers ask you to choose.</b> Choosing reveals judgment and self-awareness. A candidate who picks a project they cannot defend shows weak self-assessment. One who picks something modest but explains it brilliantly shows the opposite.</p>
  <p><b>The "passenger" signal.</b> The most common failure in project rounds is not a bad project, it is a candidate who was a passenger: they know what the system does but not why it is built that way. Interviewers test this with "why not X?" questions; passengers answer with "the team decided".</p>
  <p><b>Old vs recent.</b> A project from five years ago is fine if it is clearly your best work and you re-learn the details, but expect "what would you do differently today?" and know what changed in the ecosystem.</p>
  <p><b>Team-of-one projects.</b> Side projects can work for early-career candidates, especially with real users. Be honest about scale; do not inflate "10 users" into "a platform".</p>`,
  aiEra: `<p><b>What AI changes:</b> many 2026 projects involve LLM features or AI-assisted coding. That is fine to present, but panels now probe harder: "what did you design versus what did the model or the assistant generate?" Pick a project where your judgment is visible: evaluation design, guardrails, cost and latency trade-offs.</p>
  <p><b>Use AI to prepare:</b> paste your bullet notes (scrubbed of secrets) and ask: <code>Act as a staff engineer. Ask me 15 drill-down questions on this project, hardest first.</code> The gaps you cannot answer show which project to drop.</p>
  <p><b>What you must still own:</b> the facts. Never let an assistant "improve" numbers or invent architecture details. A panel will find the seam in one follow-up.</p>`,
  problems: [
    P({ t: 'Pick Your Project From Four Candidates', lv: 'Easy', tags: ['selection'],
      st: `<p>You have four candidates: (A) a famous ML system where you wrote one data pipeline; (B) a checkout latency rewrite you designed; (C) a hackathon chatbot; (D) a migration that partly failed and you led the rollback. Senior role. Which do you present and which is your backup?</p>`,
      ex: `<p>Good shape: "Primary B, backup D, mention A in one line."</p>`,
      bw: `<p>Picking A because it is famous. The panel will ask about model choices and serving; you can only talk about one pipeline.</p>`,
      bc: `"I'll talk about our ranking system, it serves 100M users."`,
      mq: ['What matters most when picking a deep-dive project?', ['The fame of the system', 'Your ownership of key decisions', 'How many people worked on it', 'How new the tech stack is'], 1, 'Drill-downs test whether you made and understand the decisions.'],
      h: ['<p>Hint 1: Score each on ownership first - who made the key calls?</p>', '<p>Hint 2: Look for a hard number and a moment of tension in each.</p>', '<p>Hint 3: Primary = highest ownership + depth; backup = a different flavour.</p>'],
      ap: `<p>Model answer: "I would present B, the checkout rewrite, as my primary: I wrote the design doc, chose the caching and async approach, and can defend p95 going from 820 ms to 210 ms. My backup is D, the migration rollback, because it shows a different side - leading under pressure and owning a partial failure. I would mention A only as context ('I also contributed a feature pipeline to ranking') because my ownership there is thin and a deep dive would expose it. C is fun but has no scale or result for a senior role."</p>`,
      fu: ['What if the interviewer insists on project A?', 'How do you handle a project under NDA?'] })
  ]
});

/* ===================== TOPIC 2 ===================== */
topics.push({
  title: 'The Structure: Context, Goal, Role, Architecture, Decisions, Results, Lessons',
  analogy: `<p>A good museum tour has a <b>route</b>: entrance, map, the main hall, two masterpieces up close, the gift shop. Visitors never feel lost. A project walkthrough needs the same route, or the listener wanders through your codebase with no map.</p>`,
  explain: `<p>Use a fixed seven-part skeleton. Remember it as <b>C-G-R-A-D-R-L</b>:</p>
  <ol>
  <li><b>Context</b> (2-3 sentences): the business, the users, the problem in plain words. "Checkout was slow; every 100 ms cost about 1 percent of conversions."</li>
  <li><b>Goal</b>: the target, ideally with a number and a deadline. "p95 under 300 ms before Black Friday."</li>
  <li><b>Role</b>: your exact part, team size. "I was tech lead of 4, I wrote the design and built the cache layer."</li>
  <li><b>Architecture</b>: one simple diagram, 4-7 boxes, data flow.</li>
  <li><b>Decisions and trade-offs</b>: 2-3 key choices, the options you rejected and why.</li>
  <li><b>Results</b>: numbers, before vs after, how you measured.</li>
  <li><b>Lessons</b>: what went wrong, what you would change.</li>
  </ol>
  ${H.table(['Part', 'Share of a 10-min walkthrough', 'Common mistake'], [['Context + goal', '~1.2 min', 'Five minutes of company history'], ['Role', '~0.8 min', 'Skipped, so "we" hides you'], ['Architecture', '~2.2 min', 'Every microservice drawn'], ['Decisions', '~2.5 min', 'Listing tech, no "why"'], ['Results', '~1.3 min', '"It was much faster"'], ['Lessons', '~1.2 min', '"Nothing went wrong"'], ['Buffer', '~0.8 min', 'No time left for questions']])}
  <p>Give a <b>roadmap sentence</b> first: "I'll give context, my role, the architecture, two key decisions, results, and what I'd change. Stop me anywhere." This lets the interviewer steer and signals structure.</p>`,
  clues: ['"Walk me through it from the start"', '"Give me the high level first, then we will go deep"', '"You have about 10 minutes, then questions"', '"What was the goal?" asked early = your context ran long', '"Where did you fit in?" = you skipped your role'],
  code: [{ lang: 'python', title: 'Time budget for a walkthrough (runnable)', run: true, code: PY_TIME },
    `PROJECT ONE-PAGER (fill before every loop)
Title: Checkout latency rewrite (2025)
Context: checkout p95 820 ms; ~1% conversion per 100 ms
Goal: p95 < 300 ms before Black Friday (10 weeks)
Role: tech lead, team of 4; I wrote design + cache layer
Architecture: client -> API gateway -> checkout svc -> (price cache, inventory svc, payments) ; async order events
Decision 1: read-through cache for prices (rejected: precompute all carts)
Decision 2: move fraud scoring async (rejected: faster model)
Decision 3: feature flag + 1%/10%/50% rollout
Results: p95 820 -> 210 ms, conversion +1.8%, DB reads -60%
Measured by: tracing p95/p99 per step, A/B on conversion 2 weeks
Went wrong: stale prices after promo change -> added event-based invalidation
Would change: build load tests before design, not after
Numbers to remember: 20K QPS peak, 5 min TTL, 98% hit rate`],
  codeTitle: ['Time budget (runnable)', 'Project one-pager template'],
  viz: buildViz('Building a walkthrough with C-G-R-A-D-R-L', ['Part', 'What you say'], {
    strong: { intro: 'Strong walkthrough of the checkout rewrite.', rows: [
      ['Roadmap', '"Context, my role, architecture, two decisions, results, lessons. Stop me anytime."', 'c', 'One sentence that hands the interviewer the map.'],
      ['Context', '"Checkout p95 was 820 ms; we lose about 1% conversion per 100 ms."', 'g', 'Business pain in plain words, with a number.'],
      ['Goal', '"Under 300 ms p95 before Black Friday, 10 weeks."', 'g', 'Target + deadline make every later decision make sense.'],
      ['Role', '"Tech lead of 4. I wrote the design and built the price cache."', 'g', 'Your part is explicit before any "we".'],
      ['Architecture', '"Gateway, checkout service, price cache, inventory, payments, async events." (draws 6 boxes)', 'g', 'Small diagram, data flow first.'],
      ['Decisions', '"Read-through cache over precompute; fraud check made async. Here is why..."', 'g', 'Options rejected are named.'],
      ['Results', '"p95 820 to 210 ms; conversion +1.8% in a 2-week A/B."', 'g', 'Before/after plus method.'],
      ['Lessons', '"Stale prices after a promo bug; I added event invalidation. Next time load tests first."', 'g', 'Owned mistake, concrete change.']
    ], verdict: '<p><span class="c-g">Verdict:</span> in about 10 minutes the panel has a map, your role, your judgment and proof. Every drill-down has a hook.</p>' },
    weak: { intro: 'Weak walkthrough: chronological ramble.', rows: [
      ['Start', '"So in 2023 I joined and the team was reorganised twice..."', 'r', 'History, not problem.'],
      ['Tech list', '"We used Kafka, Redis, gRPC, Kubernetes, Go..."', 'r', 'A list of tools is not a decision.'],
      ['Detail dump', '"The PriceResolverV2 class calls..."', 'r', 'Code-level detail before any big picture.'],
      ['Results', '"It got a lot faster and everyone was happy."', 'r', 'No number, no method.']
    ], verdict: '<p><span class="c-r">Verdict:</span> after 10 minutes the interviewer still does not know the goal or your part. They will take control and the drill-downs will feel like an interrogation.</p>' }
  }, 'strong'),
  examples: [
    { title: 'The 60-second version', html: `<p>Always have a one-minute version: "Checkout was slow - 820 ms p95 - costing conversions. I led a team of 4 to rebuild the hot path with a price cache and async fraud scoring. p95 dropped to 210 ms and conversion rose 1.8 percent. The hardest part was cache invalidation during promotions." Many interviewers ask for this first, then pick where to dig.</p>` },
    { title: 'Weak vs strong "Role" line', html: `<p><span class="c-r">Weak:</span> "I was on the team that did it."</p><p><span class="c-g">Strong:</span> "Four engineers. I was tech lead: I wrote the design doc, built the cache layer and the rollout plan. Priya owned the async fraud path; I reviewed it."</p>` },
    { title: 'Ending cleanly', html: `<p>End with a hand-off, not a fade: "That's the overview. I'm happy to go deeper on the cache invalidation, the rollout, or how we measured conversion." Offering 2-3 doors invites drill-downs where you are strongest.</p>` },
    { title: 'Long-format (45 min) version', html: `<p>Same skeleton, more depth per part: add a second diagram (data model or sequence), a slide on alternatives considered, and a timeline. Keep the roadmap sentence and reserve at least a third of the time for questions.</p>` }
  ],
  deepDive: `<p><b>Why a fixed structure works.</b> Interviewers fill a rubric: problem understanding, technical depth, ownership, impact, reflection. C-G-R-A-D-R-L maps one part to each rubric box, so you never leave a box empty.</p>
  <p><b>STAR vs this skeleton.</b> STAR (Situation, Task, Action, Result) fits 2-minute stories. A project deep dive is longer and more technical, so it splits Action into Architecture and Decisions, and adds Lessons. If the interviewer asks a pure behavioural question during the deep dive, switch back to STAR.</p>
  <p><b>Depth calibration.</b> Watch the interviewer. Nodding and writing = continue. Leaning in on one box = offer to go deep there. Glancing at the clock = jump to results. The structure is a map; you do not have to walk every road.</p>
  <p><b>The one-pager.</b> Write each project as a one-page cheat sheet (see code tab) with the numbers you must remember: QPS, data size, latency, cost, team size, timeline. Re-read it the morning of the interview.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants are good at turning messy notes into a C-G-R-A-D-R-L one-pager. Prompt: <code>Turn these notes into context, goal, role, architecture, decisions with rejected options, results with numbers, lessons. Mark any claim without a number as [NEEDS NUMBER].</code></p>
  <p><b>Where AI goes wrong:</b> it writes polished prose that sounds memorised and it fills gaps with plausible but fake numbers. Keep the one-pager as bullets, speak it in your own words, and verify every number against dashboards or docs.</p>
  <p><b>What you must still own:</b> the order and emphasis. Only you know which decision was truly hard.</p>`,
  problems: [
    P({ t: 'Build a Project One-Pager', lv: 'Medium', tags: ['structure', 'one-pager'],
      st: `<p>Your notes: "Moved notifications from cron jobs to a queue. Fewer missed emails. I did most of the worker code. Kafka. Took a quarter." Turn this into a C-G-R-A-D-R-L one-pager, adding the facts a panel will ask for.</p>`,
      ex: `<p>Each line should have a number or a named option, for example "missed sends 2.1% to 0.05%".</p>`,
      bw: `<p>Keeping the notes as they are: no goal, no measured result, no decisions, "most of the worker code" is vague.</p>`,
      bc: `"We moved notifications to Kafka and it was more reliable."`,
      mq: ['Which line is most missing from the notes?', ['The programming language', 'A measured before/after result', 'The office location', 'The sprint names'], 1, 'Results with numbers are what panels remember and probe.'],
      h: ['<p>Hint 1: Write the goal as a number with a deadline.</p>', '<p>Hint 2: Name 2 decisions and the option you rejected for each.</p>', '<p>Hint 3: Add how you measured, and one thing that went wrong.</p>'],
      ap: `<p>Model one-pager: <b>Context:</b> nightly cron sent 3M notifications; 2.1 percent were missed when a job crashed, causing support tickets. <b>Goal:</b> under 0.1 percent missed and sends within 5 minutes of the trigger, in one quarter. <b>Role:</b> one of 3 engineers; I designed and built the worker service and retry logic; a teammate did the producer side. <b>Architecture:</b> app events to a Kafka topic, partitioned by user id, consumer workers, provider API, dead-letter topic. <b>Decision 1:</b> Kafka over the existing SQS because we needed replay for audits; trade-off: more ops work. <b>Decision 2:</b> at-least-once delivery with an idempotency key per message, rather than exactly-once, because duplicates are cheaper to filter than lost sends. <b>Results:</b> missed sends 2.1 to 0.05 percent, median delay 6 hours to 40 seconds, tickets down 70 percent (support dashboard, 4 weeks before vs after). <b>Went wrong:</b> a provider rate limit caused a retry storm; I added exponential backoff with jitter. <b>Would change:</b> add the dead-letter dashboard on day one.</p>`,
      fu: ['Why at-least-once and not exactly-once?', 'How did you know the 0.05 percent was real?'] })
  ]
});

/* ===================== TOPIC 3 ===================== */
topics.push({
  title: 'Diagrams: Drawing Your Architecture in Two Minutes',
  analogy: `<p>A subway map is not to scale and leaves out every street. That is why everyone can read it in seconds. Your project diagram should be a <b>subway map</b>, not a satellite photo: few stations, clear lines, the route that matters highlighted.</p>`,
  explain: `<p>Most project rounds include a whiteboard, a shared doc, or a virtual drawing tool. A clear diagram does half your explaining. Rules:</p>
  <ul>
  <li><b>4-7 boxes</b> for the overview. Group services ("payment stack") instead of drawing every microservice.</li>
  <li><b>Draw the request path left to right</b>: client, entry point, your service, data stores, external systems.</li>
  <li><b>Mark your part</b> - colour, a star, or a dashed outline. "Everything inside the box is what I built."</li>
  <li><b>Label arrows</b> with what flows and the scale: "20K QPS", "events, async", "nightly batch".</li>
  <li><b>Narrate while drawing</b> - never draw in silence for a minute.</li>
  <li><b>Zoom levels:</b> overview first, then a second diagram for the hard part (data model, sequence diagram, state machine) only when asked or when it carries a key decision.</li>
  </ul>
  ${H.table(['Diagram type', 'Use it for', 'Example'], [['Box-and-arrow', 'Overview, data flow', 'Gateway, checkout, cache, DB'], ['Sequence', 'Ordering, retries, races', 'Write, invalidate, read race'], ['Data model', 'Schema decisions', 'orders, order_items, idempotency_keys'], ['Before/after', 'Migrations, rewrites', 'Cron jobs vs queue + workers']])}
  <p>Practise drawing your main project in <b>under two minutes</b> from memory, then explaining the request path in 60 seconds.</p>`,
  clues: ['"Can you draw it for me?"', '"Where does the data live?"', '"Which part did you build?" - mark it on the diagram', '"What happens when a request comes in?" - trace the path', '"Show me the before and after"', 'Virtual onsite: "feel free to share your screen or use the whiteboard tool"'],
  viz: [{
    title: 'Drawing the checkout architecture while talking',
    input: 'go',
    inputLabel: 'Type anything to replay the drawing',
    gen: function () {
      var nodes = [
        { id: 'c', label: 'Client', x: 6, y: 30, shape: 'box' },
        { id: 'g', label: 'API gateway', x: 24, y: 30, shape: 'box' },
        { id: 'k', label: 'Checkout svc (mine)', x: 46, y: 30, shape: 'box', w: 20 },
        { id: 'p', label: 'Price cache (mine)', x: 72, y: 10, shape: 'box', w: 18 },
        { id: 'i', label: 'Inventory', x: 72, y: 30, shape: 'box' },
        { id: 'y', label: 'Payments', x: 72, y: 50, shape: 'box' },
        { id: 'q', label: 'Order events', x: 92, y: 30, shape: 'box' }
      ];
      var steps = [
        [['c', 'g'], 'Start with the request path: "Client calls our API gateway."'],
        [['g', 'k'], '"The gateway routes to the checkout service - the dashed box is what I owned."'],
        [['k', 'p'], '"Prices come from a read-through cache I built: 98% hit rate, 5-minute TTL plus event invalidation."'],
        [['k', 'i'], '"Inventory is a synchronous check - it must be correct, so no cache here."'],
        [['k', 'y'], '"Payments is external; we call it with an idempotency key."'],
        [['k', 'q'], '"Order events go async to a queue, so fraud scoring and emails left the hot path. That alone saved about 300 ms."']
      ];
      var frames = [], edges = [], shown = {};
      frames.push({ narr: '<b>Roadmap first:</b> "Let me draw the request path, then mark my parts."', parts: [{ type: 'graph', directed: true, nodes: nodes.slice(0, 1), edges: [] }] });
      shown.c = true;
      for (var i = 0; i < steps.length; i++) {
        var e = steps[i][0]; shown[e[0]] = true; shown[e[1]] = true;
        edges.push(e.slice());
        var hl = {}; hl[e[1]] = (e[1] === 'k' || e[1] === 'p') ? 'sel' : 'cur';
        var ehl = {}; ehl[e[0] + '-' + e[1]] = 'cur';
        frames.push({ narr: steps[i][1], parts: [{ type: 'graph', directed: true, nodes: nodes.filter(function (n) { return shown[n.id]; }), edges: edges.map(function (x) { return x.slice(); }), hl: hl, ehl: ehl }] });
      }
      frames.push({ narr: '<b>Done in under two minutes:</b> 7 boxes, labelled arrows, owned parts highlighted. Now offer: "Want to go deeper on the cache or the async path?"', parts: [{ type: 'graph', directed: true, nodes: nodes, edges: edges.map(function (x) { return x.slice(); }), hl: { k: 'sel', p: 'sel' } }] });
      return frames;
    }
  }],
  examples: [
    { title: 'Too much vs just right', html: `<p><span class="c-r">Too much:</span> 23 boxes including logging sidecars, config service and three Kubernetes clusters. The interviewer cannot see the decision.</p><p><span class="c-g">Just right:</span> 6 boxes, one highlighted path, one label with scale. "Sidecars and observability exist; I am leaving them out unless you want them."</p>` },
    { title: 'Sequence diagram for the hard part', html: `<p>When asked "how did invalidation work?", switch zoom level:</p>${H.table(['Step', 'Actor', 'Action'], [['1', 'Admin tool', 'Updates promo price in DB'], ['2', 'DB CDC', 'Emits price_changed event'], ['3', 'Cache', 'Deletes key price:sku'], ['4', 'Checkout', 'Next read misses, loads fresh price']])}<p>"The race we hit: a read between step 1 and 3 could re-fill the stale value. I fixed it with a version number on the key."</p>` },
    { title: 'Remote round without a whiteboard', html: `<p>Use text boxes in a shared doc:</p><pre>Client -> Gateway -> Checkout* -> PriceCache* -> PriceDB
                           \\-> Inventory
                           \\-> Payments (ext)
                           \\-> OrderEvents (async)
* = built by me</pre><p>Ugly is fine; clear is what counts.</p>` },
    { title: 'Before/after diagram for a migration', html: `<p>Two small diagrams side by side - "before: cron reads DB, calls provider, crashes lose state; after: events into a queue, workers with retries and a dead-letter topic." The contrast tells the story in one glance.</p>` }
  ],
  deepDive: `<p><b>What the diagram is checked for.</b> Interviewers look for: do you know where data lives, which calls are synchronous, where the bottleneck was, and which parts were yours. Each box invites "why this?", so do not draw boxes you cannot explain.</p>
  <p><b>Failure modes on the drawing.</b> Be ready for "what if this box dies?" on every box you draw. For each dependency know: timeout, retry policy, fallback (serve stale, fail open, fail closed). Writing a tiny "timeout 200 ms, fallback stale" label next to an arrow signals production experience.</p>
  <p><b>Scale labels.</b> Put one or two real numbers on the diagram: peak QPS, data size, p99. They anchor the conversation and make estimates later easier.</p>
  <p><b>Tools.</b> In virtual loops (Excalidraw-style boards, Google Drawings, plain docs) practise beforehand. Fumbling with tools wastes minutes and looks unprepared.</p>`,
  aiEra: `<p><b>What AI changes:</b> diagram-as-code tools and assistants can turn a text description into a Mermaid or similar diagram in seconds. Use them to prepare a clean reference diagram for presentation rounds that allow slides.</p>
  <p><b>Where AI goes wrong:</b> generated diagrams tend to add generic boxes ("load balancer", "monitoring") that were not in your system. Every extra box is a question you cannot answer.</p>
  <p><b>What you must still own:</b> drawing it live from memory. Many rounds forbid pre-made material, and the live drawing is where your understanding shows.</p>`,
  problems: [
    P({ t: 'Draw Your Project in Two Minutes', lv: 'Easy', tags: ['diagram'],
      st: `<p>The interviewer says "Can you sketch the architecture?" Describe exactly what you draw, in order, and what you say while drawing, for a notification queue project.</p>`,
      ex: `<p>Good: 5-6 boxes, left-to-right request path, your parts marked, one scale number.</p>`,
      bw: `<p>Drawing silently for three minutes, every service included, no indication of which part was yours.</p>`,
      bc: `[draws 18 boxes silently, then] "So yeah, that's it."`,
      mq: ['How many boxes for an overview diagram?', ['1-2', '4-7', '15-20', 'As many as exist'], 1, 'Enough to show the flow, few enough to read at a glance.'],
      h: ['<p>Hint 1: Start where the request or event enters the system.</p>', '<p>Hint 2: Narrate each arrow: what flows, sync or async, how much.</p>', '<p>Hint 3: Mark your part and end by offering where to zoom in.</p>'],
      ap: `<p>Model answer, spoken while drawing: "Events start in the app services on the left - order placed, password reset. They publish to a Kafka topic, partitioned by user id, about 2K events per second at peak. On the right, the worker pool I built consumes them, renders templates and calls the email and push providers. Failed sends retry with backoff; after five tries they go to a dead-letter topic, which an on-call dashboard watches. The dashed box - workers, retry logic and dead-letter handling - is what I designed and built. A teammate owned the producer library. Want me to zoom into the retry logic or the partitioning?"</p>`,
      fu: ['What happens if the provider is down for an hour?', 'Why partition by user id?'] })
  ]
});

/* ===================== TOPIC 4 ===================== */
topics.push({
  title: 'Decisions, Trade-offs and Results With Numbers',
  analogy: `<p>A judge does not just announce "guilty". She writes a <b>ruling</b>: the options, the evidence, why one side won. Your design decisions need the same: options considered, criteria, choice, and what it cost you. And like a court record, your result needs evidence - numbers and how they were collected.</p>`,
  explain: `<p>Panels care less about what you built than about <b>why</b>. For each key decision use the <b>O-C-C-C</b> pattern:</p>
  <ul>
  <li><b>Options:</b> the 2-3 real alternatives.</li>
  <li><b>Criteria:</b> what mattered - latency, cost, team skills, time to ship, correctness.</li>
  <li><b>Choice:</b> what you picked and the deciding reason.</li>
  <li><b>Cost:</b> the downside you accepted and how you contained it.</li>
  </ul>
  <p>Example: "For prices we could precompute every cart, cache prices read-through, or speed up the DB. Criteria were freshness under promotions and 10 weeks to ship. I chose a read-through cache with a 5-minute TTL. The cost was staleness, which we contained with event-based invalidation."</p>
  <p><b>Results need numbers and a method.</b> Say the metric, before, after, and how you measured:</p>
  ${H.table(['Weak', 'Strong'], [['"Much faster"', '"p95 820 to 210 ms, from tracing, 7-day windows before and after"'], ['"Saved money"', '"Compute cost down $38K per month, from the cloud bill"'], ['"Users loved it"', '"Support tickets on this flow down 70%, NPS comment volume halved"'], ['"More reliable"', '"Availability 99.5% to 99.95%; pages per week 9 to 1"']])}
  <p>If you lack exact numbers, give a <b>defensible estimate</b> and say so: "Roughly 30 percent; I don't have the exact figure, but the dashboard showed about 1,000 down to 700 per day."</p>`,
  clues: ['"Why did you choose X?"', '"What alternatives did you consider?"', '"How did you measure that?"', '"How do you know it was your change and not something else?"', '"What did that decision cost you?"', '"Was it worth it?"'],
  code: [{ lang: 'python', title: 'Vague-claim detector (runnable)', run: true, code: PY_VAGUE }],
  codeTitle: ['Vague-claim detector'],
  viz: buildViz('Decision explained: tool list vs O-C-C-C', ['Step', 'Candidate says'], {
    strong: { intro: 'Strong: options, criteria, choice, cost.', rows: [
      ['Options', '"Precompute carts, read-through cache, or a bigger DB."', 'g', 'Real alternatives show you thought about it.'],
      ['Criteria', '"Freshness during promos and 10 weeks to ship mattered most."', 'g', 'Criteria make the choice judgeable.'],
      ['Choice', '"Read-through cache, 5-min TTL - simplest path to the latency goal."', 'g', 'The deciding reason is explicit.'],
      ['Cost', '"Staleness risk. Contained with event invalidation and a version check."', 'g', 'Owning the downside is a senior signal.'],
      ['Result', '"98% hit rate, DB reads -60%, p95 820 to 210 ms measured in tracing."', 'g', 'Evidence closes the loop.']
    ], verdict: '<p><span class="c-g">Verdict:</span> the panel can agree or disagree with the reasoning - that is exactly what they want to evaluate.</p>' },
    weak: { intro: 'Weak: a tool list.', rows: [
      ['Tool', '"We used Redis."', 'r', 'No alternative, no reason.'],
      ['Reason', '"Because Redis is fast and industry standard."', 'r', 'Generic reason; true for any project.'],
      ['Result', '"Things got way faster."', 'r', 'No number, no method.'],
      ['Pushback', '"Why not precompute?" ... "Uh, we did not think about it."', 'r', 'The drill-down exposes the gap.']
    ], verdict: '<p><span class="c-r">Verdict:</span> sounds like the candidate followed a tutorial, not made a decision.</p>' }
  }, 'strong'),
  examples: [
    { title: 'Attributing the result honestly', html: `<p>"Conversion went up 1.8 percent. That was an A/B test over two weeks with 50/50 traffic, so I'm fairly confident it was the latency change. There was a marketing campaign that month, but it hit both groups equally."</p>` },
    { title: 'A decision that was a compromise', html: `<p>"I wanted exactly-once processing, but the team had no Kafka transactions experience and 6 weeks. We chose at-least-once plus idempotency keys. It was the right call for the deadline; it cost us a dedupe table with about 50M rows we have to expire."</p>` },
    { title: 'When the result was disappointing', html: `<p>"Goal was 300 ms; we hit 340 ms. The remaining time was the payment provider, which we could not change. I'm presenting it because the decision process was sound and because we learned to measure third-party latency before setting targets."</p>` },
    { title: 'Business and engineering numbers together', html: `${H.table(['Layer', 'Metric'], [['User', 'Checkout p95 820 to 210 ms'], ['Business', 'Conversion +1.8% (A/B)'], ['System', 'DB reads -60%, cache hit 98%'], ['Team', 'On-call pages 9 to 1 per week']])}<p>Pick the two most relevant to the audience - business for a director, system for a staff engineer.</p>` }
  ],
  deepDive: `<p><b>Reversible vs irreversible decisions.</b> Mentioning this distinction is a strong signal: "The cache was a two-way door, so I chose fast and simple. The data model was a one-way door, so I wrote a design doc and got review from the data team."</p>
  <p><b>Causality.</b> "How do you know it was your change?" is a classic drill-down. Good answers: A/B test, feature flag on/off comparison, staged rollout showing the metric move with each stage, or a controlled before/after with no other big changes. Admit confounders.</p>
  <p><b>Percentages vs absolutes.</b> "Reduced errors by 90 percent" from 10 to 1 per day is less impressive than it sounds; give both. Interviewers trust candidates who volunteer the base number.</p>
  <p><b>Second-order effects.</b> Strong candidates mention what the decision affected beyond the goal: on-call load, cost, the next team's onboarding. That shows system thinking.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI-assisted analysis makes it easy to slice metrics, and panels know it. Expect "how did you validate the numbers?" more often. Be ready to describe the query or dashboard, not just the figure.</p>
  <p><b>For AI projects</b>, results include evaluation metrics: accuracy on a labelled set, hallucination rate, cost per 1K requests, latency p95. Explain how the eval set was built - that is the decision most often probed.</p>
  <p><b>What you must still own:</b> the trade-off reasoning. An assistant can list options, but the criteria and why they mattered to <i>your</i> users are yours.</p>`,
  problems: [
    P({ t: 'Rewrite a Weak Results Answer', lv: 'Medium', tags: ['results', 'metrics'],
      st: `<p>Weak answer: "We added a search index and search became way faster and users were much happier. It was a big success." Rewrite it with numbers, method and honest attribution. Invent realistic numbers and say they are examples.</p>`,
      ex: `<p>Target shape: metric, before, after, how measured, confidence, side effects.</p>`,
      bw: `<p>"Way faster", "much happier" and "big success" are claims with no evidence. The interviewer will ask "how much?" and "how do you know?".</p>`,
      bc: `"Search became way faster and users were much happier."`,
      mq: ['Which result statement is strongest?', ['"Search was way faster"', '"p95 search 2.4 s to 180 ms over 30 days, from APM traces"', '"Everyone was happy"', '"It was a big success"'], 1, 'Metric, before, after and source are all present.'],
      h: ['<p>Hint 1: Name the metric and give before and after values.</p>', '<p>Hint 2: Say where the number came from and the time window.</p>', '<p>Hint 3: Add a user or business number and one honest caveat.</p>'],
      ap: `<p>Model answer: "Search p95 latency went from 2.4 seconds to 180 ms. I measured it with our APM traces over 30 days before and after launch. Because we rolled out behind a flag to 10 percent first, I could compare the two groups directly - the gap held at every stage. On the user side, search-to-click rate rose from 31 to 38 percent and search-related support tickets dropped by about half. One caveat: index storage added about $2K a month, which we judged worth it. If I had more time I would have measured the effect on retention, which we never isolated."</p>`,
      fu: ['How did you choose p95 over average?', 'What if the 10 percent group was not representative?'] })
  ]
});

/* ===================== TOPIC 5 ===================== */
topics.push({
  title: 'Handling Drill-Down Questions',
  analogy: `<p>A doctor examining you presses on different spots: "does it hurt here? here?" Drill-down questions are the interviewer pressing on your project to find where your knowledge <b>stops</b>. Everyone has an edge; the goal is to show it is deep and to be honest when you reach it.</p>`,
  explain: `<p>After the overview, the interviewer will dig. The same few questions appear in almost every loop. Prepare an answer for each about your project:</p>
  ${H.table(['Drill-down', 'What they test', 'Answer shape'], [['Why this design?', 'Judgment', 'Options, criteria, choice, cost'], ['What would you change?', 'Reflection', 'One concrete change + why it was not done then'], ['How did you measure?', 'Rigour', 'Metric, tool, window, attribution'], ['What went wrong?', 'Honesty, recovery', 'Incident, your response, prevention'], ['What was your part?', 'Ownership', 'Specific decisions and code you owned'], ['How would it scale 10x?', 'Depth', 'First bottleneck + fix'], ['What if X fails?', 'Production sense', 'Timeout, retry, fallback']])}
  <p><b>Answer pattern:</b> short direct answer first, then the reason, then stop. "We used Postgres, not DynamoDB. Main reason: we needed multi-row transactions for orders and the team knew Postgres. Want the numbers on write load?"</p>
  <p><b>When you do not know:</b> say so, then reason. "I don't know the exact replication lag; that was owned by the DB team. I'd expect seconds, and I'd check the replica lag metric. Our design tolerated that because reads after writes went to the primary." Bluffing is the fastest way to fail a deep dive; a clear "I don't know, here is how I'd find out" is neutral or positive.</p>`,
  clues: ['"Why not just use X?"', '"Walk me through what happens when..."', '"What would you change if you did it again?"', '"How did you measure that?"', '"What was the hardest bug?"', '"What if traffic grew 10x?"', '"Who decided that?"'],
  viz: buildViz('A drill-down chain: how deep can you go?', ['Interviewer asks', 'Candidate answers'], {
    strong: { intro: 'Strong: direct answers that go three levels deep.', rows: [
      ['"Why a cache and not a faster DB?"', '"Price reads were 70% of DB load and rarely changed. Cache was cheaper and quicker to ship."', 'g', 'Level 1: the decision and the reason.'],
      ['"How did you keep it fresh?"', '"5-min TTL plus delete on a price_changed event from CDC."', 'g', 'Level 2: mechanism.'],
      ['"Any race there?"', '"Yes: a read between DB write and delete could refill stale data. I added a version number and compare on set."', 'g', 'Level 3: a real edge case they found and fixed.'],
      ['"How did you find that race?"', '"A promo showed old prices for 4 minutes. Logs showed set-after-delete ordering."', 'g', 'Story of a real bug - very credible.'],
      ['"What would you change?"', '"Start with versioned keys from day one; I would also load test invalidation, not just reads."', 'g', 'Reflection with a concrete change.']
    ], verdict: '<p><span class="c-g">Verdict:</span> five questions deep without a bluff. This is what "strong technical depth" in feedback means.</p>' },
    weak: { intro: 'Weak: knowledge stops at level 1, then bluffs.', rows: [
      ['"Why a cache?"', '"Caches are fast."', 'r', 'Generic answer.'],
      ['"How did you keep it fresh?"', '"It just expired, I think the TTL was... short."', 'r', 'Unsure of own system.'],
      ['"Any race there?"', '"No, Redis is atomic so there are no races."', 'r', 'Confident and wrong - a bluff.'],
      ['"Who designed it?"', '"The team."', 'r', 'Ownership unclear.']
    ], verdict: '<p><span class="c-r">Verdict:</span> the bluff on level 3 costs more than "I am not sure" would have. Feedback: "surface-level understanding".</p>' }
  }, 'strong'),
  examples: [
    { title: '"Why not just use X?" without getting defensive', html: `<p>"Why not just use DynamoDB?" - "Fair option. We looked at it. Two things pushed us to Postgres: multi-row transactions for orders and team experience. At 20x our scale DynamoDB would look better, and I'd revisit then." Acknowledge, give reasons, name when the answer would change.</p>` },
    { title: '"What would you change?" - avoid the two traps', html: `<p>Trap 1: "Nothing" (no reflection). Trap 2: "Everything, it was a mess" (trashes the team). Good: "Two things: build load tests before the design, not after, and put the dead-letter dashboard in the first release. Both came from things that hurt us."</p>` },
    { title: 'Reaching the edge of your knowledge', html: `<p>"How did the payment provider handle idempotency on their side?" - "I don't know their internals. From the API contract, a repeated key within 24 hours returns the first result. We relied on that and tested it in sandbox with forced retries."</p>` },
    { title: 'Scaling question', html: `<p>"What breaks at 10x?" - "First the single Postgres primary for orders: we were at 35 percent write capacity, so 10x means sharding by merchant id or moving order writes to a queue. Second the cache memory, which is easy - add nodes."</p>` }
  ],
  deepDive: `<p><b>Why interviewers drill until you break.</b> They are not trying to humiliate you; they need to locate the edge of your knowledge to calibrate your level. Expect to hit "I don't know" at some point. How you behave there is part of the score.</p>
  <p><b>The 3-level rule.</b> For every box in your diagram and every decision, be able to answer three "why" or "how" levels deep. Practise with a friend asking "why?" repeatedly.</p>
  <p><b>Steering.</b> You can guide drill-downs by the doors you open: "the interesting part was invalidation" invites a question where you are strong. Do not dodge, though - if asked about a weak area, answer it honestly.</p>
  <p><b>Hypotheticals.</b> "What if requirements changed to X?" tests adaptability. Treat it as a mini design question: restate, name what breaks, propose a change, note the trade-off.</p>
  <p><b>Consistency checks.</b> Interviewers cross-check numbers: if you said 20K QPS and a 98 percent hit rate, they may ask the DB QPS. Know the arithmetic (about 400 QPS of misses).</p>`,
  aiEra: `<p><b>What AI changes:</b> AI-generated prep can make your overview polished, which leads interviewers to dig <i>harder</i> to check it is real. Expect more "how exactly?" questions in 2026 loops.</p>
  <p><b>Practise with AI:</b> <code>You are a skeptical staff engineer. I will describe my project. Ask one drill-down at a time, always "why" or "how", and go at least 4 levels deep. Tell me when I bluffed.</code></p>
  <p><b>What you must still own:</b> the honest edge. If you used an assistant to write part of the code, be ready to explain it line by line, or say plainly which part you did not design.</p>`,
  problems: [
    P({ t: 'Handle a Drill-Down: "Why Not Just Use X?"', lv: 'Medium', tags: ['drill-down'],
      st: `<p>You built a job queue on top of Postgres (a jobs table with SKIP LOCKED). The interviewer asks: "Why didn't you just use Kafka or SQS?" Answer in under 60 seconds, then handle the follow-up "What breaks first at 10x?"</p>`,
      ex: `<p>Strong shape: acknowledge, reasons (criteria), cost accepted, when you would switch.</p>`,
      bw: `<p>Getting defensive ("Kafka is overkill") or caving ("yeah, Kafka would have been better") without reasons. Both show no decision process.</p>`,
      bc: `"Kafka is overkill for us." / "Yeah, we probably should have."`,
      mq: ['Best first move when asked "why not X?"', ['Defend your choice firmly', 'Acknowledge X as valid, then give your criteria', 'Agree X is better', 'Change the subject'], 1, 'Acknowledging the option and showing criteria shows judgment, not ego.'],
      h: ['<p>Hint 1: Start with "fair option" - show you considered it.</p>', '<p>Hint 2: Give 2 criteria: scale, ops cost, transactions, team skills.</p>', '<p>Hint 3: Say what number would make you switch, and what breaks first.</p>'],
      ap: `<p>Model answer: "Fair question - we considered SQS. Three reasons we stayed on Postgres: volume was about 50 jobs per second, far below what Postgres handles; we needed to enqueue jobs in the same transaction as the business write, so no lost or phantom jobs; and it added zero new infrastructure for a team of three. The cost was polling load and that Postgres is not built for huge fan-out. I set a rule in the design doc: revisit at 500 jobs per second or if we need multiple consumers per event. At 10x, the first thing to break is vacuum and index bloat on the jobs table from constant inserts and deletes - we'd see it as rising dequeue latency. Short term, partition the table by day and drop old partitions; long term, move to SQS with an outbox table so we keep the transactional guarantee."</p>`,
      fu: ['What is the outbox pattern?', 'How would you migrate without losing jobs?'] })
  ]
});

/* ===================== TOPIC 6 ===================== */
topics.push({
  title: '"I" vs "We" and Owning Mistakes',
  analogy: `<p>In a football highlight reel, the commentator says the team won - but a scout watching is only interested in <b>one player</b>: where she ran, which passes she made, the one she missed. The interviewer is that scout. "We" tells them the team did well; only "I" tells them about you.</p>`,
  explain: `<p>Two things decide whether a panel trusts your project story: can they <b>see your part</b>, and do you <b>own what went wrong</b>.</p>
  <p><b>Separating your work from the team's.</b></p>
  <ul>
  <li>State the team and split early: "Team of 5. I owned the data model and the migration; two others built the UI; our TL set the deadline."</li>
  <li>Use "I" for your decisions and actions, "we" for joint outcomes. "<i>I</i> proposed dual writes; <i>we</i> agreed after a review; <i>I</i> built the backfill."</li>
  <li>Credit others by name or role. It sounds confident, not weak, and makes your own claims more believable.</li>
  <li>Influence counts as your work: "I convinced the team to drop the custom ORM" is yours even if others typed the code.</li>
  </ul>
  <p><b>Owning mistakes:</b> use <b>M-I-F-P</b> - <b>Mistake</b> (plainly, first person), <b>Impact</b> (with numbers), <b>Fix</b> (what you did right away), <b>Prevention</b> (what changed so it cannot repeat).</p>
  ${H.table(['Blaming / vague', 'Owning'], [['"QA missed the bug"', '"I shipped without a test for the promo path"'], ['"There were some issues at launch"', '"Stale prices for 4 minutes hit about 600 orders"'], ['"It got fixed"', '"I rolled back via the flag in 6 minutes and refunded the difference"'], ['"Lesson: be careful"', '"I added versioned keys and a promo test to CI"']])}`,
  clues: ['"What exactly was your contribution?"', '"You keep saying we - what did you do?"', '"What went wrong?"', '"What is a mistake you made on this project?"', '"Who made that decision?"', '"How did your teammates contribute?"'],
  viz: buildViz('Same project, "we" story vs "I" story', ['Moment', 'Candidate says'], {
    strong: { intro: 'Clear ownership and an owned mistake.', rows: [
      ['Team split', '"Team of 5. I owned the data model and the migration."', 'g', 'The scout knows where to look.'],
      ['Decision', '"I proposed dual writes over a big-bang cutover, wrote the doc, the TL approved."', 'g', 'Your decision, honest approval chain.'],
      ['Credit', '"Ana built the reconciliation dashboard - it caught our first bug."', 'g', 'Crediting others makes you more believable.'],
      ['Mistake', '"I under-estimated the backfill: it took 3 days, not 6 hours, and slowed the primary."', 'g', 'Plain, first person, with impact.'],
      ['Fix + prevention', '"I throttled it to 500 rows/s, and now every backfill gets a dry run on a snapshot."', 'g', 'Recovery and a lasting change.']
    ], verdict: '<p><span class="c-g">Verdict:</span> ownership is clear, the mistake makes the story more credible, not less.</p>' },
    weak: { intro: 'All "we", no mistakes.', rows: [
      ['Team', '"We migrated the orders DB."', 'r', 'Who is "we"?'],
      ['Decision', '"We decided dual writes were best."', 'r', 'No sign of your judgment.'],
      ['Problems', '"It went pretty smoothly overall."', 'r', 'No tension, no learning; sounds rehearsed or hidden.'],
      ['Pushed', '"Well, there was a slowdown, but the DBA team should have warned us."', 'r', 'Blame when finally pressed.']
    ], verdict: '<p><span class="c-r">Verdict:</span> the panel cannot score your contribution and now doubts your honesty.</p>' }
  }, 'strong'),
  examples: [
    { title: 'Weak vs strong contribution answer', html: `<p><span class="c-r">Weak:</span> "I was involved in all parts of it."</p><p><span class="c-g">Strong:</span> "Three things were mine: the event schema, the consumer service, and the rollout plan. I reviewed but did not write the producer library. I also ran the incident review after launch."</p>` },
    { title: 'You were a junior member', html: `<p>Narrow and deep: "I was the most junior of six. My part was the retry and dead-letter handling. Here is how it worked and the bug I found in it." A small, owned slice explained well beats claiming the whole system.</p>` },
    { title: 'Mistake answer with M-I-F-P', html: `<p>"<b>Mistake:</b> I set the cache TTL by guess. <b>Impact:</b> during a promo, 4 minutes of stale prices, ~600 orders, about $3K refunded. <b>Fix:</b> I disabled the cache via flag in 6 minutes and wrote the refund script. <b>Prevention:</b> event invalidation with versioned keys, and a promo scenario in the load tests."</p>` },
    { title: 'When the project failed overall', html: `<p>"We cancelled it after 4 months. My part in that: I did not push hard enough early for a user test; when we ran one in month 3, the core assumption was wrong. Now I insist on a cheap user test before committing a team for a quarter." Failed projects are fine to present if your reflection is sharp.</p>` }
  ],
  deepDive: `<p><b>Why "we" is risky.</b> Many interviewers write "unclear individual contribution" in feedback, and some rubrics cannot give a hire signal without clear ownership. Culturally, some candidates were taught that "I" sounds arrogant; in interviews, it is simply information.</p>
  <p><b>Over-claiming is worse.</b> If you claim the whole system, drill-downs will find parts you do not know. Reference checks and back-channel information also exist. Precise, honest scope wins.</p>
  <p><b>Blameless but owned.</b> Blameless culture means not blaming individuals for system failures; it does not mean not owning your own part. Say "I missed X; the process also allowed X; here is what I changed in both."</p>
  <p><b>Mistake size.</b> Pick a real mistake with real impact, not a humble-brag ("I worked too hard"). Avoid ones that show an ethics problem (ignoring security review on purpose).</p>`,
  aiEra: `<p><b>What AI changes:</b> "what was your part?" now includes "what did you write versus the AI assistant?" Answer the same way: "I designed the module boundaries and test plan; Copilot-style tools generated much of the boilerplate; I reviewed every line and rewrote the concurrency part."</p>
  <p><b>Mistakes in AI-assisted work:</b> a good, current mistake story is "I trusted generated code that silently swallowed an exception; now I require tests on error paths for generated code". It shows modern judgment.</p>
  <p><b>What you must still own:</b> accountability. "The AI wrote it" is never an acceptable answer for a bug you shipped.</p>`,
  problems: [
    P({ t: 'Turn a "We" Story Into a Clear "I" Story', lv: 'Easy', tags: ['ownership'],
      st: `<p>Rewrite: "We built a new reporting pipeline. We chose Spark and we moved off the old cron scripts. We had some delays but we shipped it." Make your contribution and one mistake clear (invent realistic details).</p>`,
      ex: `<p>Good: team size, your 2-3 owned pieces, one credited teammate, one owned mistake with M-I-F-P.</p>`,
      bw: `<p>Every sentence is "we", "some delays" hides the story, and nothing tells the interviewer what you would bring to their team.</p>`,
      bc: `"We built it, we chose Spark, we shipped it."`,
      mq: ['Where should "I" appear?', ['Never - it sounds arrogant', 'For decisions and actions you personally took', 'In every sentence', 'Only in the results'], 1, 'Use "I" for your own decisions and work, "we" for shared outcomes.'],
      h: ['<p>Hint 1: Start with team size and the 2-3 pieces you owned.</p>', '<p>Hint 2: Credit one teammate specifically.</p>', '<p>Hint 3: Turn "some delays" into a mistake with impact, fix and prevention.</p>'],
      ap: `<p>Model answer: "Team of four. I owned the job design and the migration plan; Sam built the dashboard layer; our manager handled stakeholder sign-off. I proposed Spark over extending the cron scripts because data was growing 15 percent a month and the scripts already took 5 hours. The delay was mine: I estimated the migration at 3 weeks and it took 7, because I did not check how many reports had hidden logic in SQL views - 40 of 120. I caught it at week 2, re-planned with the stakeholders, and we migrated the top 30 reports first. Now I always do a discovery spike to count unknowns before giving an estimate. End result: nightly run from 5 hours to 35 minutes, and the cron server was shut down."</p>`,
      fu: ['How did you tell stakeholders about the delay?', 'Who decided to migrate the top 30 first?'] })
  ]
});

/* ===================== TOPIC 7 ===================== */
topics.push({
  title: 'Presenting to Senior and Staff-Level Panels',
  analogy: `<p>Explaining a house to the buyer and to the structural engineer are different talks. The buyer wants to know if it fits their life; the engineer wants to see the foundations. A senior or staff panel is <b>both at once</b>: they want the business "why" and then they will check the foundations.</p>`,
  explain: `<p>Some loops have a formal <b>project presentation</b> round: 30-60 minutes, often with slides, in front of 2-4 senior or staff engineers and sometimes a manager. It differs from a casual deep dive:</p>
  <ul>
  <li><b>Lead with the problem and impact</b>, not the stack. Senior panels judge whether the project mattered and whether you saw the bigger picture.</li>
  <li><b>Show scope and ambiguity:</b> for staff level, show how the problem was unclear and how you shaped it: who you aligned, which options you killed, what you said no to.</li>
  <li><b>Slides:</b> 8-12 slides for 30 minutes. Title, problem, goal and constraints, your role, architecture, 2-3 decision slides, results, what went wrong, lessons, appendix (data model, extra numbers).</li>
  <li><b>Time:</b> present for at most half the slot; the rest is questions. Rehearse with a timer.</li>
  <li><b>Multiple listeners:</b> include the quiet person - "does that answer your question too?" - and handle interruptions as gifts.</li>
  <li><b>Disagreement:</b> if a panelist challenges a decision, do not fold or fight; discuss: "Good point. Under constraint X, I'd agree. We had Y; here's how that changed it."</li>
  </ul>
  ${H.table(['Level', 'What the panel looks for in your project'], [['Senior', 'Strong design choices, owned execution, measured results'], ['Staff', 'Ambiguity shaped into direction, cross-team influence, long-term trade-offs'], ['Principal', 'Org-wide or company-wide strategy, multi-year bets, technical vision']])}`,
  clues: ['"Prepare a 30-minute presentation on a past project"', '"The panel will include staff engineers from other teams"', '"Slides are optional"', 'Several interviewers interrupt with different questions', '"How did this fit the company strategy?"', '"Who disagreed with this approach?"'],
  viz: [{
    title: 'Planning a 45-minute presentation slot',
    input: '45',
    inputLabel: 'Total slot in minutes (20-60)',
    gen: function (input) {
      var t = parseInt(input, 10);
      if (isNaN(t) || t < 20 || t > 60) throw new Error('Enter a number of minutes between 20 and 60');
      var parts = [['Intro + roadmap', 0.05], ['Problem + goal', 0.1], ['Role + scope', 0.05], ['Architecture', 0.1], ['Decisions', 0.12], ['Results + lessons', 0.08], ['Questions', 0.5]];
      var frames = [], vals = [], labels = [], used = 0;
      frames.push({ narr: 'A ' + t + '-minute slot. Rule: talk for about half, keep half for questions - that is where the panel scores depth.', parts: [{ type: 'vars', label: 'Slot', vals: { total_min: t, talk_min: Math.round(t * 0.5), questions_min: Math.round(t * 0.5) } }] });
      for (var i = 0; i < parts.length; i++) {
        var m = Math.round(t * parts[i][1] * 10) / 10; used += m;
        vals.push(m); labels.push(parts[i][0]);
        var hl = {}; hl[i] = i === parts.length - 1 ? 'ok' : 'cur';
        frames.push({ narr: '<b>' + parts[i][0] + ':</b> ' + m + ' min. Running total ' + Math.round(used * 10) / 10 + ' min.', parts: [{ type: 'bars', label: 'Minutes per section', values: vals.slice(), idxLabels: labels.slice(), hl: hl }] });
      }
      frames.push({ narr: 'Done. If a panelist interrupts early, that is fine - take time from Architecture or Results, never from Questions.', parts: [{ type: 'bars', label: 'Final plan', values: vals.slice(), idxLabels: labels.slice(), hl: { 6: 'sel' } }] });
      return frames;
    }
  }],
  examples: [
    { title: 'Staff-level framing vs senior framing', html: `<p><span class="c-y">Senior framing:</span> "I designed and built the new event pipeline that cut data delay from 6 hours to 2 minutes."</p><p><span class="c-g">Staff framing:</span> "Four teams each had their own batch exports, and the analytics team couldn't trust any of them. I proposed one event platform, got three teams to commit, said no to a fourth use case that would have doubled scope, and set the schema rules. The pipeline was the means; the outcome was one trusted source and 3 retired systems."</p>` },
    { title: 'Slide outline for 30 minutes', html: `${H.table(['#', 'Slide'], [['1', 'Title + one-line impact'], ['2', 'Problem and why it mattered ($, users)'], ['3', 'Goal + constraints'], ['4', 'My role + team map'], ['5', 'Architecture'], ['6-7', 'Two key decisions (options, criteria, choice)'], ['8', 'Results'], ['9', 'What went wrong + lessons'], ['10', 'What I would do next'], ['A1-A3', 'Appendix: data model, numbers, timeline']])}` },
    { title: 'Handling a challenge from a panelist', html: `<p>Panelist: "That seems over-engineered for 500 QPS." You: "Reasonable challenge. Today it's 500, but the contract was to onboard two more regions within the year, about 5K. I chose the design that held at 5K without a rewrite; the cost was about two extra weeks. If that growth had been uncertain, I'd have built the simpler version first."</p>` },
    { title: 'Business context for a technical panel', html: `<p>One sentence of business context per decision is enough: "We had a hard deadline because the old vendor contract ended in June - that's why we bought the search engine instead of building it." Senior panels want to see you connect engineering to the business.</p>` }
  ],
  deepDive: `<p><b>How panels debrief.</b> Each panelist scores independently, then they compare. Typical dimensions: technical depth, scope and impact, decision quality, communication, ownership, and self-reflection. A great presentation with weak Q and A rarely passes; the Q and A carries most of the depth signal.</p>
  <p><b>Rehearsal.</b> Do at least two dry runs with a timer, one with a friend who interrupts. Prepare the appendix slides for likely deep questions so you can jump to them.</p>
  <p><b>Confidentiality.</b> Strip company-internal names and exact revenue; use rounded or relative numbers ("about 3x") and say so. Never show internal documents or code.</p>
  <p><b>Cross-functional listeners.</b> If a product manager or director is on the panel, add a sentence on user impact and cost for each part. If all are engineers, spend more on trade-offs and failure modes.</p>
  <p><b>Link to scope modules.</b> For staff framing techniques (influence, strategy, alignment) see the Senior and Staff-Level module; this round is where those signals must show up in one concrete project.</p>`,
  aiEra: `<p><b>What AI changes:</b> slide tools can draft a deck from your one-pager in minutes. Use that to save time on layout, then cut text hard - panels dislike dense AI-style bullet slides read aloud.</p>
  <p><b>Rehearse with AI:</b> ask it to role-play three panelists with different focus (staff backend, director, security) and to interrupt every few minutes.</p>
  <p><b>Where AI goes wrong:</b> it will inflate your scope language ("spearheaded an org-wide transformation"). Senior panels discount buzzwords instantly. Keep plain verbs: proposed, designed, built, measured, cut.</p>`,
  problems: [
    P({ t: 'Reframe a Project for a Staff Panel', lv: 'Hard', tags: ['staff', 'presentation'],
      st: `<p>Your senior-level pitch: "I built a feature-flag service that lets teams ship safely." Reframe the opening two minutes for a staff-level panel, showing ambiguity, cross-team scope, and a trade-off you made at the org level.</p>`,
      ex: `<p>Staff shape: messy starting situation, how you shaped it, who you aligned, what you said no to, org-level outcome.</p>`,
      bw: `<p>It describes a tool, not a problem or an organisational change. A staff panel cannot see influence, ambiguity or strategy in it.</p>`,
      bc: `"I built a feature-flag service. It has an SDK and a UI."`,
      mq: ['What most distinguishes a staff-level project story?', ['More lines of code', 'Shaping an ambiguous, cross-team problem into a direction others adopted', 'Using newer tech', 'Working longer hours'], 1, 'Staff scope is about direction and influence across teams.'],
      h: ['<p>Hint 1: Start with the org problem - incidents, duplicated tools, slow releases.</p>', '<p>Hint 2: Show the options and the alignment work, including a "no".</p>', '<p>Hint 3: End with org-level numbers: adoption, incidents, retired systems.</p>'],
      ap: `<p>Model opening: "Two years ago, about a third of our SEV-2 incidents came from releases, and eight teams had built five different flag systems, two of them config files. Nobody owned the problem. I started by measuring it - I tagged six months of incidents - and wrote a two-page proposal: one flag platform, with build vs buy compared. I recommended building a thin service on our config store rather than buying, because of data-residency rules, and I was explicit that we would not support experimentation analytics in v1, which disappointed the growth team; I agreed with them to revisit in two quarters. I got four teams to pilot, ran migration office hours, and wrote the rollout rules that became the release standard. Within three quarters, 31 of 34 services used it, release-caused incidents dropped about 60 percent, and three home-grown systems were retired. I'll go into the build vs buy decision and the migration, which was harder than the code."</p>`,
      fu: ['How did you get the first teams to adopt it?', 'What happened with the growth team later?'] })
  ]
});

/* ===================== PRACTICE ===================== */
practice.push(P({ t: 'The 60-Second Project Summary', lv: 'Easy', tags: ['structure'],
  st: `<p>The interviewer says: "Give me the one-minute version of your most complex project." Deliver it.</p>`,
  ex: `<p>Must include: problem with a number, your role, the core approach, the result, and the hardest part.</p>`,
  bw: `<p>Starts with company history and runs out of time before the result.</p>`,
  bc: `"So when I joined, the team was being reorganised and..."`,
  mq: ['What must a 60-second summary end with?', ['The tech stack', 'Result plus a hook for going deeper', 'Company history', 'A question about salary'], 1, 'Result proves value; a hook invites the drill-down you want.'],
  h: ['<p>Hint 1: One sentence each: problem, role, approach, result, hardest part.</p>', '<p>Hint 2: Put a number in the problem and in the result.</p>', '<p>Hint 3: End with "happy to go deeper on X".</p>'],
  ap: `<p>Model: "Our nightly billing job took 9 hours and failed about once a week, delaying invoices for 40K customers. I was the lead engineer of three; I redesigned it as an incremental pipeline that processes only changed accounts, with checkpoints so failures resume instead of restarting. Run time dropped to 50 minutes and failed runs went from weekly to zero in six months. The hardest part was proving the new totals matched the old ones to the cent - I can go deeper on the reconciliation approach if useful."</p>`,
  fu: ['How did you verify totals matched?', 'What did the other two engineers do?'] }));

practice.push(P({ t: 'Answer "What Was Your Part?"', lv: 'Easy', tags: ['ownership'],
  st: `<p>Mid-walkthrough the interviewer interrupts: "Sorry, you keep saying we. What specifically did you do?" Answer it.</p>`,
  ex: `<p>Good: concrete items you owned, one you influenced, one you did not do.</p>`,
  bw: `<p>"I was involved in everything" or "it was really a team effort" - both dodge the question and sound evasive.</p>`,
  bc: `"Honestly it was a team effort, we all did a bit of everything."`,
  mq: ['Best reaction to "what did you do?"', ['Repeat that it was a team effort', 'List specific decisions and pieces you owned, and what others owned', 'Claim everything', 'Get defensive'], 1, 'Specific, bounded ownership is credible.'],
  h: ['<p>Hint 1: Thank them and switch to "I" immediately.</p>', '<p>Hint 2: Name 2-3 things you owned, plus one decision you drove.</p>', '<p>Hint 3: Name what others owned, so your claim has clear edges.</p>'],
  ap: `<p>Model: "Good catch, let me be precise. I owned three things: the schema design for the new events table, the consumer service including retry logic, and the cut-over plan with the rollback switch. I also drove the decision to use at-least-once delivery - I wrote that section of the design doc and defended it in review. I didn't build the producer SDK; Lee did, and I reviewed it. And our manager handled the comms with the finance team. From here on I'll say I when it was mine."</p>`,
  fu: ['Which of those was hardest?', 'What feedback did you get in the design review?'] }));

practice.push(P({ t: 'Answer "How Did You Measure That?"', lv: 'Easy', tags: ['metrics'],
  st: `<p>You said "we reduced page load time by 40 percent". The interviewer asks "How did you measure that?" Answer.</p>`,
  ex: `<p>Good: metric definition, tool, window, segment, and attribution.</p>`,
  bw: `<p>"From the dashboard" is not a method. It does not say which metric, which users, or whether something else caused it.</p>`,
  bc: `"It was on the dashboard."`,
  mq: ['Which detail best shows the 40% is real?', ['The dashboard colour', 'Same metric, same segment, controlled window, or an A/B comparison', 'Your manager agreed', 'It felt faster'], 1, 'A defined metric plus controlled comparison supports causality.'],
  h: ['<p>Hint 1: Define the metric precisely, for example LCP p75 on mobile.</p>', '<p>Hint 2: Name the source - real user monitoring vs lab tests.</p>', '<p>Hint 3: Explain how you ruled out other causes.</p>'],
  ap: `<p>Model: "The metric was Largest Contentful Paint at p75 from real-user monitoring, mobile only, since that was 70 percent of traffic. Two weeks before launch it was 3.5 seconds; two weeks after, 2.1 seconds - that's the 40 percent. We shipped behind a flag to half of users first, and the flagged group showed the same gap, so I'm confident it was our change and not, say, a CDN update. Lab tests in Lighthouse agreed in direction but I quote the field numbers because they reflect real devices."</p>`,
  fu: ['Why p75 and not average?', 'What if desktop got slower?'] }));

practice.push(P({ t: 'Pick a Backup Project', lv: 'Easy', tags: ['selection'],
  st: `<p>After 5 minutes the interviewer says: "Thanks - can you pick a different project, maybe one with more cross-team work?" You prepared a backup. How do you switch smoothly?</p>`,
  ex: `<p>Good: no fluster, a one-line bridge, then the 60-second summary of the backup.</p>`,
  bw: `<p>Panicking or arguing for the first project. Or picking something unprepared and rambling.</p>`,
  bc: `"Oh... um, I guess there was this other thing, let me think..."`,
  mq: ['Why prepare two projects?', ['To show off', 'Interviewers may ask for a different flavour or have heard enough of one', 'Rules require it', 'To fill time'], 1, 'A backup with a different flavour handles a redirect calmly.'],
  h: ['<p>Hint 1: Accept the redirect positively in one sentence.</p>', '<p>Hint 2: Make the backup a different flavour - cross-team, people, recovery.</p>', '<p>Hint 3: Restart with the same C-G-R-A-D-R-L skeleton.</p>'],
  ap: `<p>Model: "Sure, good idea. A more cross-team one is our shared login migration. Context: five product teams each ran their own session handling, and security found inconsistent token expiry. Goal: one auth service in two quarters with no forced logouts. My role: I led the technical plan and coordinated with the five teams; I personally built the token-exchange bridge so old and new sessions worked side by side. Result: all five teams migrated in 5 months, zero forced logouts, and two security findings closed. The hard part was sequencing teams with different release cycles - happy to go into that."</p>`,
  fu: ['Which team resisted most?', 'How did the bridge work?'] }));

practice.push(P({ t: 'Answer "What Would You Change?"', lv: 'Medium', tags: ['reflection', 'drill-down'],
  st: `<p>At the end of your deep dive: "If you did this project again, what would you change?" Your project went well overall. Answer without saying "nothing" and without trashing it.</p>`,
  ex: `<p>Good: 1-2 concrete changes, why they were not done then, and what you do differently now.</p>`,
  bw: `<p>"Nothing, it went great" shows no reflection. "Honestly the whole design was wrong" undermines everything you just said.</p>`,
  bc: `"Not much, honestly. It went really well."`,
  mq: ['Strongest kind of "change" to mention?', ['Change of tech for its own sake', 'A process or design change tied to a real pain you hit', 'Blame on another team', 'Nothing'], 1, 'Concrete change tied to real pain shows learning.'],
  h: ['<p>Hint 1: Think of what cost you the most time or caused the biggest surprise.</p>', '<p>Hint 2: Explain why it seemed right at the time - constraints.</p>', '<p>Hint 3: Show the habit you have now because of it.</p>'],
  ap: `<p>Model: "Two things. First, I'd build the load test before finalising the design. We designed for 5K QPS from estimates, then found in week 8 that one endpoint fanned out to 12 downstream calls; we had to add a batch API late. At the time, we skipped it because the test environment didn't exist yet - now I budget for it in week one. Second, I'd involve the support team earlier: our error messages confused users for the first two weeks. The core design - the cache and the async path - I'd keep; the numbers held up for a year after."</p>`,
  fu: ['Why did you not have a test environment?', 'How did you fix the error messages?'] }));

practice.push(P({ t: 'Answer "What Went Wrong?" With M-I-F-P', lv: 'Medium', tags: ['mistakes'],
  st: `<p>"Tell me about something that went wrong on this project." Use a real-sounding mistake you personally made, with impact, fix and prevention.</p>`,
  ex: `<p>Shape: Mistake (I...), Impact (numbers), Fix (fast), Prevention (lasting).</p>`,
  bw: `<p>Blaming another team, picking a fake flaw, or describing the problem without saying what you did.</p>`,
  bc: `"The infra team gave us bad config, so the launch was delayed."`,
  mq: ['What makes a mistake answer strong?', ['It blames process only', 'It owns your part, quantifies impact, and shows lasting prevention', 'It is very small', 'It is a humble-brag'], 1, 'Ownership plus prevention is the key signal.'],
  h: ['<p>Hint 1: Start the sentence with "I".</p>', '<p>Hint 2: Give the impact in users, money, or time.</p>', '<p>Hint 3: Separate the immediate fix from the long-term prevention.</p>'],
  ap: `<p>Model: "I ran a schema migration that added a NOT NULL column with a default on a 200M-row table during business hours. On our Postgres version it rewrote the table and locked it - checkout writes failed for 11 minutes, roughly 1,800 failed orders. I killed the migration, confirmed recovery, and with support we emailed affected customers a discount code. For prevention, I wrote a migration checklist - add nullable, backfill in batches, then add the constraint - and added a CI check that flags risky DDL on large tables. That check has caught three similar migrations since."</p>`,
  fu: ['Why did you not test it on a copy?', 'How did you communicate during the 11 minutes?'] }));

practice.push(P({ t: 'Handle "How Would It Scale 10x?"', lv: 'Medium', tags: ['drill-down', 'scaling'],
  st: `<p>Your project: an image-thumbnail service, 300 uploads per second, workers resize and store to object storage, metadata in one Postgres table. "What breaks at 10x?"</p>`,
  ex: `<p>Good: first bottleneck with a reason, then the next, each with a fix and trade-off.</p>`,
  bw: `<p>"We'd add more servers" - generic and ignores which part is actually stateful.</p>`,
  bc: `"We'd just scale horizontally with Kubernetes."`,
  mq: ['What should you identify first?', ['The cheapest cloud provider', 'The first component to saturate and why', 'A new language', 'More meetings'], 1, 'Name the actual bottleneck with numbers.'],
  h: ['<p>Hint 1: Stateless workers scale easily - look at the stateful parts.</p>', '<p>Hint 2: Do arithmetic: 3K uploads/s means how many DB writes?</p>', '<p>Hint 3: Give fix + trade-off for each bottleneck in order.</p>'],
  ap: `<p>Model: "Workers are stateless, so I'd scale them out from the queue depth - not my first worry. First to break is the metadata DB: at 3K uploads per second with about 3 writes each (create, status, sizes) that's ~9K writes per second on one primary, and we were at 40 percent at today's load, so it saturates well before 10x. Fix: batch the status updates, then partition by upload date or shard by user id; trade-off is cross-shard queries for admin tools. Second is the queue: fine at 3K messages per second on our managed queue, but I'd check the per-partition limit. Third, cost: resizing is CPU-bound, so at 10x I'd generate only two sizes eagerly and the rest lazily on first request with a CDN in front."</p>`,
  fu: ['How would you migrate to the sharded DB?', 'What about hot users uploading a lot?'] }));

practice.push(P({ t: 'You Do Not Know the Answer', lv: 'Medium', tags: ['drill-down', 'honesty'],
  st: `<p>The interviewer asks: "What consistency level did your Cassandra cluster use for writes, and why?" A platform team ran Cassandra; you only used the client. Answer honestly and usefully.</p>`,
  ex: `<p>Good: admit the boundary, say what you do know, reason about it, say how you'd check.</p>`,
  bw: `<p>Guessing confidently ("QUORUM, because that's the best") invites a second question that reveals the guess.</p>`,
  bc: `"It was QUORUM, that's always the right choice."`,
  mq: ['Best response at the edge of your knowledge?', ['Bluff confidently', 'Admit it, reason from what you know, say how you would check', 'Say "no idea" and stop', 'Change topic'], 1, 'Honest reasoning shows maturity and still shows knowledge.'],
  h: ['<p>Hint 1: Name who owned it, without sounding like you are blaming.</p>', '<p>Hint 2: Explain how your service behaved and what that implies.</p>', '<p>Hint 3: Say where you would look to confirm.</p>'],
  ap: `<p>Model: "Honestly, I don't know for sure - the platform team owned the cluster config and we used their client wrapper. What I can reason about: our service wrote user activity events and read them back on a different page a few seconds later, and we never saw missing reads, so I'd guess LOCAL_QUORUM for both reads and writes, which gives read-your-writes within a datacenter when replication factor is 3. If writes had been ONE, we'd have expected occasional missing items. To confirm I'd check the wrapper's default settings or ask the platform team. In hindsight I should have known it, since our correctness depended on it."</p>`,
  fu: ['What does LOCAL_QUORUM mean with RF=3?', 'What would ONE plus ONE risk?'] }));

practice.push(P({ t: 'Defend a Decision a Panelist Thinks Was Wrong', lv: 'Medium', tags: ['pushback'],
  st: `<p>A panelist says: "Microservices for a team of four sounds like a mistake." You split a monolith into three services. Respond without folding or fighting.</p>`,
  ex: `<p>Good: acknowledge the valid concern, give your context, admit the cost, say when you would choose differently.</p>`,
  bw: `<p>"No, microservices are best practice" (defensive) or "Yeah, you're probably right" (folds with no reasoning).</p>`,
  bc: `"Microservices are industry best practice, so it was the right call."`,
  mq: ['When a panelist challenges a decision, you should:', ['Agree immediately', 'Acknowledge, explain your constraints, admit costs, name when you would choose differently', 'Argue until they agree', 'Say the manager decided'], 1, 'A balanced discussion shows judgment and openness.'],
  h: ['<p>Hint 1: Agree with the general principle first.</p>', '<p>Hint 2: Explain the specific constraint that made your choice reasonable.</p>', '<p>Hint 3: Admit what it cost and what you would do with hindsight.</p>'],
  ap: `<p>Model: "That's a fair default - for most teams of four I'd keep a monolith. Our case had one specific driver: the PDF rendering part needed 8 GB of memory and crashed the whole app under load, and it had a totally different scaling pattern. So we split out only that, plus the public API which had a separate on-call rotation with partners - three services, not twenty. The cost was real: two extra deploy pipelines and distributed tracing we had to set up, about three weeks. With hindsight, I'd have split only the renderer and kept the API in the monolith; the second split bought us little."</p>`,
  fu: ['How did you split the data?', 'Would a worker queue have solved the renderer problem?'] }));

practice.push(P({ t: 'Explain a Technical Decision to a Non-Technical Panelist', lv: 'Medium', tags: ['communication', 'presentation'],
  st: `<p>A director on the panel asks: "Why did you spend a month on an event-driven redesign instead of shipping features?" Answer for a business listener in under a minute.</p>`,
  ex: `<p>Good: business cost of the old way, what changed for users or the company, numbers, no jargon.</p>`,
  bw: `<p>Explaining Kafka partitions and consumer groups to someone who asked about business value.</p>`,
  bc: `"Well, Kafka gives us partitioned, replayable logs with consumer groups..."`,
  mq: ['What does a director mostly need?', ['Library versions', 'Business cost, benefit and risk in plain words', 'A code walkthrough', 'The partition count'], 1, 'Translate the trade-off into money, time, risk and users.'],
  h: ['<p>Hint 1: Start with the cost of not doing it.</p>', '<p>Hint 2: Translate the tech into one plain sentence.</p>', '<p>Hint 3: Close with a business number and the feature speed after.</p>'],
  ap: `<p>Model: "Before the redesign, every new feature that needed order data meant changing the checkout code, and checkout was our riskiest system - two of our last three outages came from feature changes there. The redesign means checkout now just announces 'an order happened', and other features listen without touching checkout. It cost one month for two engineers. Since then, three features shipped without any checkout change, each about a week faster, and we've had zero checkout outages from feature work in six months. So it was a month spent to make the next year faster and safer."</p>`,
  fu: ['How did you get the month approved?', 'What if it had taken three months?'] }));

practice.push(P({ t: 'Present a Project That Partly Failed', lv: 'Hard', tags: ['mistakes', 'reflection'],
  st: `<p>Your most complex project was a recommendation engine that was shut down after 6 months because it didn't move engagement. Present it in 3 minutes so that it is a strong signal, not a weak one.</p>`,
  ex: `<p>Good: honest outcome, what was technically strong, why it failed, your part in that, what you do differently now.</p>`,
  bw: `<p>Hiding the failure, or presenting it as someone else's fault (product chose the wrong goal).</p>`,
  bc: `"It was technically great, but product cancelled it for political reasons."`,
  mq: ['Can a failed project be a good deep-dive choice?', ['Never', 'Yes, if your ownership and reflection are strong and specific', 'Only for junior roles', 'Only if you blame others'], 1, 'Failure with sharp lessons is often more credible than smooth success.'],
  h: ['<p>Hint 1: State the outcome in the first 30 seconds - do not make it a twist.</p>', '<p>Hint 2: Show the strong engineering and the measured result honestly.</p>', '<p>Hint 3: Own your part in the failure and the habit it gave you.</p>'],
  ap: `<p>Model: "Up front: this project was shut down, and I think it's my best learning story. Goal: raise session length 5 percent with personalised recommendations. I led the backend of three engineers - feature store, candidate generation, ranking API at 40 ms p99. Technically it worked: the system was stable and the model beat the baseline offline by 12 percent. But the A/B test showed +0.4 percent session length, within noise, after 6 weeks. Why: our offline metric, click-through on recommended items, didn't predict session length - users clicked but didn't stay longer. My part: I accepted the offline metric without pushing for a small online test early; a two-week test in month one with a simple heuristic would have shown the gap. We shut it down and reused the feature store for search, which did improve. Since then I insist on an online proxy test before building heavy infrastructure, and I applied that on my next project, where it saved us a quarter."</p>`,
  fu: ['Why did the team trust the offline metric?', 'How did you decide to shut it down?'] }));

practice.push(P({ t: 'Drill-Down Chain on Your Architecture', lv: 'Hard', tags: ['drill-down', 'depth'],
  st: `<p>Your project: a rate limiter for a public API using a token bucket in Redis. Answer this chain in order, each in 2-3 sentences: (1) Why token bucket? (2) How is it atomic across gateway nodes? (3) What happens if Redis is down? (4) How did you pick the limits? (5) What would you change?</p>`,
  ex: `<p>Each answer should be specific to your system with at least one number or mechanism.</p>`,
  bw: `<p>Generic textbook answers ("token bucket allows bursts") with nothing about your system, and a bluff on failure handling.</p>`,
  bc: `"Token bucket is the standard algorithm. Redis is reliable so it wasn't down."`,
  mq: ['What does a drill-down chain test most?', ['Memorised definitions', 'Whether your understanding of your own system goes several levels deep', 'Speed of talking', 'Slide design'], 1, 'Each level checks you were close to the real decisions.'],
  h: ['<p>Hint 1: For each answer, tie the concept to your traffic or your incident.</p>', '<p>Hint 2: Atomicity needs a mechanism - script, transaction, or single-key op.</p>', '<p>Hint 3: Failure handling is a policy choice: fail open or closed, and why.</p>'],
  ap: `<p>Model: (1) "Our partners send bursts after batch jobs; token bucket allows a burst of 100 then 20 per second sustained, which matched their pattern better than a fixed window that caused edge spikes." (2) "Each check runs a small Lua script in Redis that refills from the elapsed time and decrements in one step, so two gateway nodes cannot both take the last token; keys are per API key, sharded by key across a Redis cluster." (3) "We fail open with a local in-memory limiter per node set to a conservative share of the limit, because blocking all partners during a Redis outage was worse than letting some excess through; we alert after 30 seconds." (4) "From 30 days of logs: the limit was set at the 99.5th percentile of each tier's per-second usage, then reviewed with the partner team; 3 partners needed exceptions." (5) "I'd return clearer retry-after headers from day one - we had a partner retrying in a tight loop - and I'd add per-endpoint costs, because one expensive search call counted the same as a cheap read."</p>`,
  fu: ['Why Lua rather than MULTI/EXEC?', 'How did you test the fail-open path?'] }));

practice.push(P({ t: 'Staff Panel: Show Scope Without Inflating', lv: 'Hard', tags: ['staff', 'ownership'],
  st: `<p>You led a cross-team migration from a self-hosted queue to a managed one: 14 services, 6 teams. Some teams did the work themselves. A staff panel asks: "What did YOU do, given the teams did their own migrations?" Answer.</p>`,
  ex: `<p>Good: your leverage work (plan, tooling, standards, unblocking), concrete artefacts, numbers, what you did NOT do.</p>`,
  bw: `<p>Either claiming you migrated everything (not true, easy to expose) or only listing meetings with no artefacts.</p>`,
  bc: `"I migrated all 14 services to the new queue."`,
  mq: ['At staff level, "your work" includes:', ['Only code you typed', 'Leverage: plans, tools, standards and decisions that let many teams succeed', 'Meetings attended', 'Team headcount'], 1, 'Staff impact is often multiplied through others.'],
  h: ['<p>Hint 1: List artefacts: design doc, tooling, runbook, tracking board.</p>', '<p>Hint 2: Show a decision that only you could make or drive.</p>', '<p>Hint 3: Be explicit that teams did their own migrations, and how you helped.</p>'],
  ap: `<p>Model: "Right - the six teams migrated their own services, and I want to be clear about that. My work was the leverage around it. First, the plan: I wrote the migration design, including the decision to run dual-publish for two weeks per service rather than a hard cut, and I got it approved by the six tech leads. Second, tooling: I built a shim library so most services changed one import and a config line, which cut the per-service effort from an estimated 2 weeks to about 3 days. Third, I personally migrated the two hardest services, the billing consumer and the audit log, because they had ordering guarantees nobody else understood. Fourth, I ran a weekly tracker and unblocked teams - twice I traded our team's time to help a team behind schedule. Outcome: 14 services in 4 months against a 6-month plan, zero message loss, about $90K a year in infra and on-call savings, and the shim became the standard client."</p>`,
  fu: ['Which team was hardest to get on board?', 'How did you verify zero message loss?'] }));

/* ===================== QUIZ ===================== */
var Q = function (q, o, a, e) { quiz.push({ q: q, options: o, answer: a, explain: e }); };
Q('What should matter most when choosing a project for a deep dive?', ['How famous the system is', 'Your ownership of key decisions', 'How many teams used it', 'How new the stack is'], 1, 'Drill-downs test whether you made and understand the decisions.');
Q('What does the C-G-R-A-D-R-L skeleton stand for?', ['Code, Git, Review, Agile, Deploy, Release, Launch', 'Context, Goal, Role, Architecture, Decisions, Results, Lessons', 'Clarify, Guess, Run, Analyse, Debug, Repeat, Learn', 'Cost, Growth, Revenue, Adoption, Delivery, Reach, Loyalty'], 1, 'The seven parts map to what panels score: understanding, ownership, depth, impact and reflection.');
Q('How many boxes suit an overview architecture diagram?', ['1-2', '4-7', '15-25', 'Every service'], 1, 'Enough to show the data flow, few enough to read at a glance; zoom in later.');
Q('Which results statement is strongest?', ['"It was much faster"', '"p95 latency 820 to 210 ms, from tracing over 7-day windows, confirmed by a flagged rollout"', '"Users were happier"', '"It was a big success"'], 1, 'Metric, before, after, source and attribution are all present.');
Q('The interviewer asks "why not use X?" What is the best first move?', ['Insist your choice was right', 'Acknowledge X as reasonable, then give your criteria and costs', 'Agree X was better', 'Say the tech lead chose'], 1, 'Acknowledging the alternative and explaining criteria shows judgment, not ego.');
Q('You reach the edge of your knowledge in a drill-down. Best response?', ['Bluff confidently', 'Say you do not know, reason from what you do know, and say how you would check', 'Say "no idea" and stop', 'Move to another topic'], 1, 'Honest reasoning is neutral or positive; a caught bluff is strongly negative.');
Q('What is M-I-F-P for owning a mistake?', ['Mistake, Impact, Fix, Prevention', 'Meeting, Idea, Feature, Plan', 'Metric, Input, Format, Print', 'Manager, Issue, Feedback, Promotion'], 0, 'State the mistake plainly, quantify impact, describe the fix, and what changed for good.');
Q('In a project story, when should you use "I"?', ['Never, it sounds arrogant', 'For decisions and actions you personally took', 'In every sentence including team results', 'Only when asked'], 1, 'Use "I" for your work and "we" for shared outcomes, so the panel can score you.');
Q('In a 45-minute presentation round, roughly how much time should go to questions?', ['None', 'About 10 percent', 'About half', 'All of it'], 2, 'Q and A carries most of the depth signal, so present for about half.');
Q('Which best distinguishes a staff-level project story from a senior one?', ['More code written', 'Shaping an ambiguous cross-team problem into a direction others adopted', 'A newer framework', 'Longer slides'], 1, 'Staff scope is about direction, alignment and leverage across teams.');
Q('"How do you know the improvement came from your change?" Which answer is best?', ['"The dashboard went up"', '"We used a flagged rollout / A/B test and the gap held between groups"', '"My manager said so"', '"It is obvious"'], 1, 'A controlled comparison supports causality; mention confounders honestly.');
Q('What is the best answer shape for "What would you change?"', ['"Nothing, it went perfectly"', '"Everything, it was a mess"', 'One or two concrete changes tied to real pain, and the habit you have now', 'A list of newer technologies'], 2, 'Specific changes tied to real problems show reflection without trashing your work.');
Q('Your project is under NDA. What should you do?', ['Share internal docs to prove it', 'Refuse to discuss any project', 'Abstract names, round numbers, and say you are doing so', 'Invent a different project'], 2, 'Panels accept abstraction; leaking secrets is a judgment red flag.');

/* ===================== INTERVIEW ===================== */
var IV = function (q, a, level, f) { interview.push({ q: q, a: a, level: level, followUps: f }); };
IV('Walk me through the most complex project you have worked on.', '<p>I give a roadmap sentence, then context, goal, role, architecture, decisions, results and lessons. Example: "Checkout p95 was 820 ms, costing about 1 percent conversion per 100 ms. Goal: under 300 ms before Black Friday. I was tech lead of four and built the price cache. Architecture: gateway, checkout service, price cache, inventory, payments, async order events. Two decisions: a read-through cache instead of precomputing carts, and moving fraud scoring off the hot path. p95 fell to 210 ms and conversion rose 1.8 percent in an A/B test. A promo caused stale prices once; I added versioned invalidation. Happy to go deeper anywhere."</p>', 'I', ['Why did you pick this project?', 'Which part was hardest?']);
IV('Why did you choose this design over the alternatives?', '<p>I name the real options, the criteria, the choice and the cost. "We could precompute cart prices, add a read-through cache, or scale the database. The criteria were freshness under promotions and a 10-week deadline. Precompute was fast but stale on every promo; scaling the DB cost more and did not fix fan-out. I chose the cache with a short TTL plus event invalidation. The cost was the complexity of invalidation, which caused our one incident, and I would make the same choice again with versioned keys from day one."</p>', 'I', ['What would make you choose differently?', 'Who disagreed?']);
IV('What exactly was your contribution, versus the team\'s?', '<p>I state the team and split up front, then use "I" for my decisions. "Team of four. I wrote the design doc, built the cache layer and the rollout plan with flags at 1, 10 and 50 percent. Priya built the async fraud path and I reviewed it. Our manager handled stakeholder comms. The decision to move fraud scoring async was mine - I proposed it after tracing showed it took 300 ms." Clear edges make my claims credible and show I value others\' work.</p>', 'B', ['What did you learn from Priya\'s part?', 'What decision did you lose?']);
IV('How did you measure success?', '<p>I give the metric, before and after, source, window, and attribution. "Primary metric was checkout p95 from distributed tracing, comparing 7-day windows; 820 to 210 ms. Business metric was conversion in a two-week 50/50 A/B test, +1.8 percent. Because we also ran a marketing campaign that month, the A/B design mattered - both groups saw the campaign. Secondary: DB reads down 60 percent from database metrics. I also tracked an anti-goal: price-mismatch complaints, which stayed flat apart from the one incident."</p>', 'I', ['Why p95 and not p99?', 'What was the sample size?']);
IV('What went wrong on this project?', '<p>I pick a real mistake I made and use mistake, impact, fix, prevention. "I set cache TTL by guess and didn\'t test promotional price changes. During a promo, about 600 orders saw stale prices for four minutes, roughly $3K refunded. I turned the cache off via flag in six minutes and wrote the refund script with support. Then I added event-driven invalidation with versioned keys and a promo scenario to our load tests. The lasting lesson: test the write path of a cache as hard as the read path."</p>', 'I', ['Why was there no test for it?', 'How did you tell stakeholders?']);
IV('If you did this project again, what would you change?', '<p>I give one or two concrete changes tied to real pain, avoid "nothing", and avoid trashing the work. "First, I\'d build load tests before finalising the design; we found a 12-call fan-out in week 8 and had to add a batch API late. Second, I\'d design invalidation with versions from day one. I\'d keep the core architecture - it held for a year after launch with traffic doubling. Now I budget week one for a test environment on any performance project."</p>', 'I', ['Why was load testing late?', 'What would you cut to make time?']);
IV('What would break first if traffic grew 10x?', '<p>I find the first stateful bottleneck using numbers. "Checkout service and cache scale out easily. The first issue is the inventory service: it does a synchronous DB read per item, about 3 per order, and was at 45 percent CPU at peak, so it saturates around 2x. I\'d add a short-lived reservation cache or move to batch checks. Second, payments has a contract rate limit; at 10x we\'d need a higher tier or queueing with user-facing waiting. Cache memory is third and simply needs more nodes."</p>', 'A', ['How would you test that prediction?', 'What would you monitor?']);
IV('How do you handle a drill-down question you cannot answer?', '<p>I say I don\'t know, show what I do know, reason toward a likely answer, and say how I would confirm. "The platform team owned the replication settings, so I don\'t know the exact value. Our service never saw stale reads after writes, which suggests reads went to the primary or used quorum. I\'d confirm in the client config." I never bluff: interviewers drill until they find the edge, and how I behave there is part of the score. If I should have known, I say that too.</p>', 'B', ['Has a bluff ever backfired for you?', 'How do you prepare to avoid gaps?']);
IV('How would you choose which project to present in a deep-dive round?', '<p>I score candidates on ownership, technical depth, a measurable result, recency, scope fit for the level, and tension - something debated or gone wrong. I pick the project where I made the key decisions and can answer three levels of "why" from memory, and prepare a backup with a different flavour, such as cross-team or recovery work. I avoid big famous systems where my part was small, because drill-downs expose thin ownership fast.</p>', 'B', ['What if your best project is under NDA?', 'Is a side project acceptable?']);
IV('How do you adapt a project presentation for a staff-level panel?', '<p>I lead with the organisational problem and ambiguity, not the stack. I show how I shaped the problem: measured it, wrote the proposal, compared options including build vs buy, aligned several teams, and what I said no to. I describe leverage - tooling, standards, unblocking - and say plainly which work other teams did. Results are org-level: adoption, incidents, retired systems, cost. I still keep one or two decisions deep enough to survive technical drill-downs, and leave half the time for questions.</p>', 'A', ['How do you show influence without authority?', 'What if the panel only wants technical depth?']);
IV('A panelist says your design was over-engineered. How do you respond?', '<p>I neither fold nor fight. I acknowledge the principle, give my specific constraints, admit the cost and say when I would choose differently. "Fair - for 500 QPS it looks heavy. The contract required onboarding two regions within a year, about 5K QPS, so I chose a design that wouldn\'t need a rewrite. It cost about two extra weeks. If that growth had been uncertain, I\'d have shipped the simpler version and planned the migration." This shows judgment and openness.</p>', 'I', ['What if they still disagree?', 'Did the growth happen?']);
IV('Can you draw the architecture and show the request path?', '<p>I draw four to seven boxes left to right while narrating: client, gateway, my service, its data stores, external dependencies and async paths. I label arrows with sync or async and scale, like 20K QPS, mark the parts I built, and mention timeouts and fallbacks on critical arrows. I leave out sidecars and monitoring unless asked. Then I offer two places to zoom in, such as cache invalidation with a sequence diagram, or the data model.</p>', 'B', ['What happens if the cache is down?', 'Where is the bottleneck?']);
IV('Tell me about a project that failed. Why present it?', '<p>A failed project can be my strongest story if my reflection is sharp. I state the outcome early, show what was technically strong, explain the root cause, and own my part. "Our recommendation engine worked technically, but the A/B test showed no engagement lift because our offline metric didn\'t predict session length. My part: I didn\'t push for a cheap online test early. We reused the feature store for search, which helped. Now I insist on an online proxy test before heavy infrastructure."</p>', 'A', ['How did you decide to stop?', 'How did the team react?']);
IV('How much of your project was written with AI assistants, and how do you own it?', '<p>I am specific and honest. "I designed the module boundaries, data model and failure handling. An assistant generated much of the boilerplate and some tests. I reviewed every line, rewrote the concurrency code where it missed a race, and added error-path tests it didn\'t suggest." Ownership means I can explain and defend any line in a drill-down, and I am accountable for bugs whoever typed the code. If a part was mostly generated and I cannot explain it deeply, I say so instead of overclaiming.</p>', 'I', ['What did the assistant get wrong?', 'How do you review generated code?']);

/* ===================== REGISTER ===================== */
registerModule({
  langExplain: `<p><b>About the code here.</b> The few samples are optional Python helpers you can run in the page: a project picker, a walkthrough time budget and a vague-claim detector. Nothing in a project deep dive depends on a programming language, so skip them if you like.</p>`,
  id: 'beh08',
  title: 'Project Deep-Dive & Past-Project Presentation',
  intro: `<p>"Walk me through your most complex project" appears in almost every senior loop, and some companies give it a whole round. It looks easy because you know the project, but many candidates fail it: they pick a famous system they barely owned, ramble through history, list tools instead of decisions, say "we" for everything, give no numbers, and bluff when the interviewer drills down. This module gives you a repeatable method: choose the right project, structure it as Context, Goal, Role, Architecture, Decisions, Results, Lessons, draw it in two minutes, defend trade-offs with numbers, survive drill-downs honestly, own your mistakes, separate your work from the team's, and present to senior and staff panels.</p>`,
  goals: ['Choose a primary and backup project using ownership, depth, results, recency, scope and tension', 'Deliver a project walkthrough in 1, 10 and 30 minutes using C-G-R-A-D-R-L', 'Draw your architecture in under two minutes with your parts marked and scale labelled', 'Explain decisions as options, criteria, choice and cost, and results as measured before/after numbers', 'Answer the standard drill-downs (why this design, what would you change, how measured, what went wrong, what was your part) without bluffing', 'Present a project to a senior or staff panel with the right framing and timing'],
  prereqs: `Communication in Coding & Design Rounds (beh04) helps with thinking aloud and driving a conversation. Senior & Staff-Level Interviews (beh05) is useful background for scope signals. You need at least one real project you can describe.`,
  hours: 8,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
