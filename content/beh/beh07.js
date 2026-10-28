(function () {
var topics = [], practice = [], quiz = [], interview = [];

// helper: build a behavioral practice problem (weak answer = brute, strong model answer = solution.approach)
function bp(title, level, tags, companies, prompt, weak, weakWhy, strong, rubric, hints, mcq) {
  return {
    title: title, level: level, tags: tags, companies: companies,
    statement: '<p>Interviewer asks: <b>"' + prompt + '"</b></p><p>Draft your own answer first (about 2 minutes spoken), tailored to the company named in the tags, then compare with the model below.</p>',
    constraints: 'Use a real story from your own life. Names here are fictional. Aim for about 2 minutes. Use "I" for your actions. Company formats change; treat format details as commonly reported, and confirm them with your recruiter.',
    example: '<p><b>Weak opening:</b> ' + weak + '</p><p>' + H.c('r', weakWhy) + '</p>',
    brute: { why: '<p>' + weak + '</p><p>' + H.c('r', 'Why it fails: ') + weakWhy + '</p>', code: { lang: 'text', code: weak, check: false } },
    mcq: mcq,
    hints: hints,
    solution: {
      approach: strong + '<h5>Rubric (what the interviewer listens for)</h5><ul>' + rubric.map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ul>',
      complexity: '<p>Length: about 2 minutes, then expect 2-3 layers of follow-up. Keep 60% of the time on what <i>you</i> did and why.</p>',
      followUps: ['What would you do differently?', 'Which company value does this story show best, and why?']
    }
  };
}
function mq(q, o, a, e) { return { q: q, options: o, answer: a, explain: e }; }

// helper: a visualizer that builds a table one row at a time from "name: value; name: value" input,
// then shows a verdict computed by finalFn(rows) -> { narr, html }.
function rowsViz(title, inputLabel, input, cols, startNarr, rowNarr, finalFn) {
  return {
    title: title, input: input, inputLabel: inputLabel,
    gen: function (inp) {
      var items = String(inp || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
      if (items.length < 2 || items.length > 8) throw new Error('Give 2-8 items like "' + input.split(';').slice(0, 2).join(';') + '"');
      var rows = items.map(function (s) {
        var k = s.indexOf(':');
        if (k < 1) throw new Error('Each item needs "name: value", e.g. ' + input.split(';')[0]);
        return [s.slice(0, k).trim().slice(0, 40), s.slice(k + 1).trim().slice(0, 120)];
      });
      var frames = [{ narr: startNarr, parts: [{ type: 'table', label: title, columns: cols, rows: [], hl: {} }] }];
      for (var i = 0; i < rows.length; i++) {
        var hl = {}; hl[i] = 'cur';
        frames.push({ narr: rowNarr(rows[i], i), parts: [{ type: 'table', label: title, columns: cols, rows: rows.slice(0, i + 1).map(function (r) { return r.slice(); }), hl: hl }] });
      }
      var f = finalFn(rows), hl2 = {};
      (f.hl || []).forEach(function (i) { hl2[i] = 'bad'; });
      (f.ok || []).forEach(function (i) { hl2[i] = 'ok'; });
      frames.push({ narr: f.narr, parts: [{ type: 'table', label: title, columns: cols, rows: rows.map(function (r) { return r.slice(); }), hl: hl2 }, { type: 'text', label: 'Verdict', html: f.html }] });
      return frames;
    }
  };
}
function has(text, words) { var t = text.toLowerCase(); return words.some(function (w) { return t.indexOf(w) >= 0; }); }

// ---------- TOPIC 1: Amazon ----------
topics.push({
  title: 'Amazon: 16 Leadership Principles, the Loop and the Bar Raiser',
  analogy: `<p>An Amazon loop is like a panel of judges at a cooking contest where each judge has been told to taste only two or three things: one checks the sauce, one the seasoning, one the plating. A special head judge from another kitchen (the bar raiser) tastes everything and can say "not good enough" even if the others liked it. You win by bringing a dish that is strong on <i>every</i> plate, not one amazing sauce.</p>`,
  explain: `<p><b>The plain idea:</b> Amazon publishes <b>16 Leadership Principles (LPs)</b>: the original 14 (Customer Obsession, Ownership, Invent and Simplify, Are Right A Lot, Learn and Be Curious, Hire and Develop the Best, Insist on the Highest Standards, Think Big, Bias for Action, Frugality, Earn Trust, Dive Deep, Have Backbone; Disagree and Commit, Deliver Results) plus two added in 2021: <b>Strive to be Earth's Best Employer</b> and <b>Success and Scale Bring Broad Responsibility</b>. beh03 already taught you to tag stories to them; here we focus on <b>how the loop uses them</b>.</p>` +
    H.table(['Stage (commonly reported)', 'What happens', 'Behavioral weight'], [
      ['Online assessment (SDE)', 'Coding problems plus a work-style survey and sometimes a work simulation', 'The survey asks you to pick between LP-flavoured statements'],
      ['Phone screen', 'One interviewer, often a coding problem plus 1-2 LP questions', 'Short LP story expected'],
      ['Loop (often 4-5 interviews)', 'Coding / system design / role interviews; each interviewer owns ~2 LPs', 'Almost every round starts with 1-2 LP questions (often 15-25 minutes)'],
      ['Bar raiser', 'A trained interviewer, usually from outside the hiring team', 'Probes LPs deeply; strong voice in the debrief'],
      ['Debrief', 'Interviewers share written feedback and vote', 'LP evidence is quoted from your answers']]) +
    `<p><b>What this means for you:</b> (1) you need roughly <b>two stories per LP</b> for the ones that come up most (Customer Obsession, Ownership, Dive Deep, Deliver Results, Bias for Action, Earn Trust, Have Backbone), because different interviewers may ask about the same LP; (2) do not reuse one story for every round, since interviewers compare notes; (3) expect follow-ups like "what data did you look at?" and "what would you do differently?" until the story runs out of detail.</p>` +
    `<p><b>The bar raiser:</b> the idea, as Amazon describes it publicly, is that every hire should raise the average of the team. The bar raiser is not a trick interviewer; they ask normal LP questions but dig further and care about long-term fit, not this quarter's headcount. Treat every interviewer as if they might be the bar raiser.</p>`,
  clues: ['"Tell me about a time when..." in every round, including coding', 'The recruiter sends you the Leadership Principles page', 'Interviewer says "I am going to focus on a couple of principles"', 'Follow-ups: "What data?", "What was your specific role?", "What would you do differently?"', 'Online assessment includes a work-style survey', 'Job post mentions "raising the bar"'],
  viz: rowsViz('Amazon loop: who owns which LPs', 'Interviewer: the LPs they probe; ... (2-8 items)',
    'Phone screen: Customer Obsession, Dive Deep; Coding 1: Ownership, Deliver Results; Coding 2: Bias for Action, Earn Trust; Design: Think Big, Invent and Simplify; Bar raiser: Have Backbone, Learn and Be Curious, Ownership',
    ['Round', 'LPs probed (commonly ~2 per round)'],
    'An Amazon loop splits the principles between interviewers. Watch how many <b>different</b> stories you will need.',
    function (r) { return '<b>' + H.esc(r[0]) + '</b> will ask about ' + H.esc(r[1]) + '. Pick stories you have <b>not</b> used in earlier rounds.'; },
    function (rows) {
      var seen = {}, dup = [];
      rows.forEach(function (r, i) { r[1].split(',').map(function (s) { return s.trim().toLowerCase(); }).forEach(function (lp) { if (seen[lp] !== undefined) dup.push(i); else seen[lp] = i; }); });
      var n = Object.keys(seen).length;
      return { hl: dup, narr: 'This loop touches <b>' + n + '</b> principles' + (dup.length ? ', and some are probed twice (red): you need a <b>second story</b> for those.' : '. No repeats, but keep a backup story per LP anyway.'), html: '<p>Rule of thumb: about ' + Math.max(n, 6) + ' to ' + (n + 3) + ' distinct stories, each tagged with 2-3 LPs, so no interviewer hears a story twice.</p>' };
    }),
  examples: [
    { title: 'Example: the same LP twice', html: `<p>Both the phone screen and a loop interviewer ask about <b>Dive Deep</b>. Story A (tracing a billing bug through logs) goes to the screen; story B (questioning a dashboard metric that turned out to be miscounted) goes to the loop. Same LP, two different, fully detailed stories.</p>` },
    { title: 'Example: answering the newer LPs', html: `<p><b>Earth's Best Employer</b>: a time you made your team's work life better (fixing an on-call rota that burned people out, mentoring someone through a tough review). <b>Broad Responsibility</b>: a time you thought about effects beyond the immediate goal (accessibility, privacy, security, energy cost), and acted on it.</p>` },
    { title: 'Example: bar-raiser style probing', html: `<p>You say "we cut latency by 40%". Bar raiser: "What exactly did <i>you</i> change? How did you measure? What did you try that failed? What would you do with twice the time?" Strong candidates answer each layer with specifics; weak ones repeat the headline.</p>` }
  ],
  deepDive: `<p><b>Why the format looks like this:</b> Amazon has written publicly about its bar raiser programme and its hiring philosophy that a new hire should be better than half the people already in the role. Structured LP questions plus written feedback make debriefs about evidence, not vibes.</p>` +
    `<p><b>Data and mechanisms:</b> Amazon culture prizes "mechanisms" (a tool, a process and an owner) over good intentions. Ending a story with "and I added an alarm, a runbook and a weekly review" lands better than "and I told people to be careful".</p>` +
    `<p><b>Level calibration:</b> for SDE I, stories about your own code are fine; for SDE II and above, interviewers commonly expect scope across a team, trade-off reasoning and influencing others. The same LP question has a higher bar at higher levels.</p>` +
    `<p><b>Traps:</b> reciting LP names ("this shows my Customer Obsession"), using "we" throughout, picking stories with no measurable result, and claiming to have never failed. Also avoid criticising former employers; it reads as poor Earn Trust.</p>`,
  aiEra: `<p><b>What AI changes:</b> recruiters and interviewers know candidates rehearse LP answers with chatbots, so they lean harder on follow-ups and specifics. A polished but generic story collapses at the second "why?".</p>` +
    `<p><b>Good use:</b> paste your story and ask an assistant to play a bar raiser: "Ask me five follow-up questions on Dive Deep, one at a time, and tell me where my answer got vague." Use it to build your LP coverage grid and to spot repeats.</p>` +
    `<p><b>Bad use:</b> letting AI write the story or add numbers you cannot defend. Amazon's own guidance to candidates asks for real examples; invented detail is both risky and dishonest. Stories about adopting AI tools responsibly (catching an AI-generated bug, measuring whether a coding assistant actually helped) map well to Dive Deep and Insist on the Highest Standards.</p>`,
  problems: [bp('Two stories for one principle', 'Medium', ['amazon', 'dive deep'], ['Amazon'],
    'Tell me about a time you had to dig into the details to find the root cause of a problem.',
    '"There was a bug, I looked into it and fixed it. I am very detail oriented."',
    'No data, no steps, a self-label instead of evidence; fails the first bar-raiser follow-up.',
    `<p><b>S:</b> Refund requests in our payments service rose 18% in a month, but every dashboard was green. <b>T:</b> I was on-call and decided to find out why rather than close the ticket. <b>A:</b> I pulled a sample of 200 refund tickets and grouped them by error; 70% mentioned double charges. I traced request IDs through logs and found our retry logic resent payments when the bank answered slowly, because the idempotency key was generated per attempt, not per order. I wrote a reproduction test, fixed the key, and added a metric for duplicate charges with an alarm. <b>R:</b> Duplicate charges dropped to zero, refunds fell back to baseline within two weeks, and the new metric caught a similar issue in another service later. <b>L:</b> Green dashboards only measure what we thought to measure, so I now ask "what would a customer complain about that we do not track?"</p>`,
    ['Concrete data and steps (sampled tickets, traced logs)', 'Root cause stated precisely', 'Mechanism added (metric + alarm)', 'Number in the result', 'Ready for "what else did you rule out?"'],
    ['Hint 1: Start from a signal that looked wrong even though the usual dashboards said everything was fine.', 'Hint 2: Name each concrete step you took to narrow the cause: the sample, the query, the trace.', 'Hint 3: End with a mechanism such as a metric or alarm, so the fix outlives you.'],
    mq('In an Amazon loop, why prepare two stories for Dive Deep?', ['Amazon requires exactly two', 'Different interviewers may probe the same principle and compare notes', 'One story is always too short', 'Bar raisers only accept new stories'], 1, 'Interviewers own overlapping principles and share feedback in the debrief.'))]
});

// ---------- TOPIC 2: Google ----------
topics.push({
  title: 'Google: GCA, Role-Related Knowledge, Leadership and Googleyness',
  analogy: `<p>Google's process is like a report card with four subjects. Each teacher (interviewer) grades the subject they teach, and a separate panel that never met you reads the whole report card before deciding. So every answer must be clear enough on paper that a stranger reading the notes would be convinced.</p>`,
  explain: `<p><b>The plain idea:</b> Google has publicly described four attributes it looks for:</p>` +
    H.table(['Attribute', 'In simple words', 'Where it shows up'], [
      ['General Cognitive Ability (GCA)', 'How you think through new, messy problems: structure, trade-offs, learning on the fly', 'Coding and design rounds; also open "how would you approach..." questions'],
      ['Role-Related Knowledge (RRK)', 'Do you know the craft for this role (algorithms, systems, ML, front-end...)?', 'Technical rounds'],
      ['Leadership (often called emergent leadership)', 'Stepping up when needed and stepping back when someone else should lead', 'Behavioral questions, sometimes in a dedicated round'],
      ['Googleyness', 'Comfort with ambiguity, humility, collaboration, bias to action, caring about users and team, doing the right thing', 'A behavioral round commonly called "Googleyness and Leadership" (G&amp;L)']]) +
    `<p><b>How the process is commonly reported:</b> recruiter call → one or two technical screens → an onsite or virtual loop of about four to five interviews, typically including one behavioral (G&amp;L) round → written feedback reviewed by a <b>hiring committee</b> (exact review steps have reportedly changed over time and by level) → <b>team matching</b>, where you talk with managers of teams that have openings → offer review. Google also uses structured interviewing with shared rubrics, which it has written about publicly.</p>` +
    `<p><b>What this means for you:</b> Google behavioral questions are often <b>hypothetical</b> as well as past-tense: "What would you do if a teammate kept missing deadlines?" Answer hypotheticals by giving your approach and then grounding it with a real example. Show you <b>collaborate</b> rather than heroically solo, and that you can change your mind.</p>`,
  clues: ['"Tell me about a time you..." mixed with "What would you do if..."', 'Recruiter mentions a "Googleyness and Leadership" interview', 'Questions about working with people unlike you or across time zones', '"How did you handle not knowing the answer?"', 'Mention of hiring committee or team matching', 'Questions about user impact and doing the right thing'],
  viz: rowsViz('A Google packet: what each round contributes', 'Round: what the notes say; ... (2-8 items)',
    'Coding 1: clear structure, optimal solution, tested edge cases; Coding 2: needed hints, recovered well; Design: good trade-offs on storage; G&L: shared credit, changed mind after user data; G&L follow-up: handled ambiguity with a small experiment',
    ['Round', 'Interviewer notes (what a committee reads)'],
    'At Google, a group that may not have met you reads written notes. Each row is one interviewer\'s evidence.',
    function (r) {
      var a = has(r[1], ['ambigu', 'credit', 'mind', 'user', 'team', 'experiment']) ? 'Leadership / Googleyness' : has(r[1], ['trade', 'storage', 'design']) ? 'Role-related knowledge' : 'Cognitive ability';
      return '<b>' + H.esc(r[0]) + '</b>: this evidence mainly supports <b>' + a + '</b>.';
    },
    function (rows) {
      var weak = []; rows.forEach(function (r, i) { if (has(r[1], ['hint', 'unclear', 'struggled', 'vague'])) weak.push(i); });
      return { hl: weak, narr: 'The committee weighs the whole packet. Mixed signals (red) are normal; a consistent story of how you think and work matters more than one perfect round.', html: '<p>Make every answer easy to write down: a clear structure, specific actions, a measurable result and what you learned.</p>' };
    }),
  examples: [
    { title: 'Example: a hypothetical answered well', html: `<p>Q: "What would you do if your team disagreed on the tech stack for a new project?" A: "I would first get the goals written down (latency, hiring, cost), then have each option scored against them, and time-box a spike for the riskiest one. On my last team we did exactly this for queue choice; the spike showed the simpler option met our goals, and the person who proposed the other one led the rollout."</p>` },
    { title: 'Example: emergent leadership', html: `<p>During an outage nobody was coordinating. I took the incident commander role, assigned two people to investigate and one to customer comms, and handed command to the owning team's lead when she joined. Showing that you <b>hand over</b> leadership is as important as taking it.</p>` },
    { title: 'Example: Googleyness through humility', html: `<p>"I was sure our users wanted bulk export, but the support data showed they mostly wanted better filters. I said so in our planning doc, credited the support analyst, and we reprioritised." Changing your mind with data is a classic Googleyness signal.</p>` }
  ],
  deepDive: `<p><b>Structured interviewing:</b> Google's re:Work material describes using the same questions and scoring rubrics for a role so candidates are compared fairly. That is why your answer must be <b>scorable</b>: the interviewer writes down what you did, not how charming you were.</p>` +
    `<p><b>Hypothetical vs behavioral:</b> hypotheticals test judgment; past-behavior questions test evidence. The strongest answers do both: "Here is how I would approach it, and here is a time I did."</p>` +
    `<p><b>Team matching:</b> after the loop, commonly reported, you talk with potential managers. These are two-way conversations; prepare questions about the team's roadmap and on-call, and a short pitch of what you want to work on. This phase can take weeks.</p>` +
    `<p><b>Traps:</b> arrogance ("I was the only one who understood the system"), long monologues, dismissing users, and treating Googleyness as "being fun". Also avoid over-claiming leadership; Google values knowing when to follow.</p>`,
  aiEra: `<p><b>What AI changes:</b> Google interviewers expect candidates to be fluent with AI tools in daily work, and questions like "how have you used AI to be more effective, and where did it fail you?" are increasingly common across companies. Prepare an honest answer with a concrete example.</p>` +
    `<p><b>Practice with AI:</b> ask an assistant for ten Googleyness-style hypotheticals, answer out loud, then ask it to check whether you gave both an approach and a real example. Ask it to write your answer as interviewer notes; if the notes are vague, so was your answer.</p>` +
    `<p><b>Keep it real:</b> do not paste AI-generated "Googley" phrases. Interviewers hear the same buzzwords all day. Concrete detail and honest learning are what make a note-taker write "strong hire".</p>`,
  problems: [bp('Hypothetical plus evidence', 'Medium', ['google', 'googleyness'], ['Google'],
    'What would you do if you joined a team and found that nobody agreed on what the project was supposed to achieve?',
    '"I would escalate to the manager and ask them to decide."',
    'Passive; no approach, no collaboration, no example; shows no emergent leadership.',
    `<p><b>Approach:</b> I would first talk one-on-one with the key people to hear what success means to each of them, then write a one-page doc listing the goals, where they conflict, and two or three options with trade-offs, and bring it to a short meeting where the decision-maker chooses. I would propose a small experiment if the disagreement was about user behaviour. <b>Evidence:</b> On my last team, a search-improvement project had three different goals across product, ranking and infra. I interviewed each lead, wrote the doc, and suggested we optimise for "time to first useful result" because all three could measure it. The PM chose it, we ran an A/B test for two weeks, and the winning change improved the metric by 9%. <b>Learning:</b> Writing the disagreement down turned arguments into a decision; I now do this in the first week on any new project.</p>`,
    ['Clear approach for the hypothetical', 'Grounded with a real example', 'Collaborative, not heroic', 'User or data focus', 'Knows who decides'],
    ['Hint 1: Give a short, step-by-step approach first, as if the situation were happening tomorrow.', 'Hint 2: Then prove it with a real time you did something similar, including a result.', 'Hint 3: Show you involve others and know who should make the final call.'],
    mq('How should you answer a Google hypothetical behavioral question?', ['Only describe a past story', 'Only describe what you would do', 'Give your approach, then ground it with a real example', 'Ask to skip it'], 2, 'Approach shows judgment; the example shows evidence.'))]
});

// ---------- TOPIC 3: Meta ----------
topics.push({
  title: 'Meta: The Behavioral ("Jedi") Round, Signals and Core Values',
  analogy: `<p>Meta's behavioral round is like a fitness test where the coach is not only checking whether you can run, but how far and with how many others you run. The same "tell me about a conflict" question is scored differently for someone leading a squad than for someone running alone; your level is partly decided by the size of the field your stories cover.</p>`,
  explain: `<p><b>The plain idea:</b> Meta's software engineering loop is commonly described as coding rounds (nicknamed "ninja"), a system or product design round ("pirate", for more experienced levels) and one behavioral round, nicknamed "<b>jedi</b>". The behavioral round is usually 45 minutes with a few deep stories rather than many short ones.</p>` +
    H.table(['Signal (commonly reported)', 'What they listen for'], [
      ['Driving results / impact', 'Big, measurable outcomes and how you prioritised to get them'],
      ['Resolving conflict', 'Disagreements handled directly and respectfully, ending in a better outcome'],
      ['Embracing ambiguity', 'Making progress when goals or owners were unclear'],
      ['Growing continuously', 'Seeking feedback, learning from failure, changing your behaviour'],
      ['Communication', 'Clear, direct, adapts to the audience'],
      ['Perseverance / ownership', 'Pushing through setbacks; owning the whole problem']]) +
    `<p><b>Meta's published values</b> (as of the 2022 refresh): Move Fast; Focus on Long-Term Impact; Build Awesome Things; Live in the Future; Be Direct and Respect Your Colleagues; Meta, Metamates, Me. You do not need to quote them, but stories with speed, directness and visible impact fit naturally.</p>` +
    `<p><b>Why the jedi round matters for level:</b> commonly reported, the behavioral round strongly influences whether you are hired at the level you applied for (for example E4 vs E5 vs E6). At senior levels interviewers look for impact beyond your own team, influencing roadmaps, and growing others. A great E4 story can sound like an under-level E6 story.</p>` +
    `<p><b>Process outline (commonly reported):</b> recruiter screen → technical screen → loop → a hiring committee-style review → for many engineering roles, team selection after the offer decision.</p>`,
  clues: ['Recruiter mentions a "behavioral" or "jedi" interview', 'Questions start with "Tell me about the project you are proudest of"', '"What was the most difficult conflict you have had?"', '"How did you grow from feedback?"', 'Repeated "what was the impact?" and "how did you measure it?"', 'Level discussion (E4/E5/E6) during recruiter calls'],
  viz: rowsViz('Meta jedi round: signal checklist for your answer', 'Signal: evidence from your story; ... (2-8 items)',
    'Impact: cut checkout time 30% for 2M users; Conflict: disagreed with PM on scope, ran a test; Ambiguity: no spec, wrote a one-pager; Growth: feedback said I over-explain, now lead with summary; Scope: my team only',
    ['Signal', 'Evidence in your story'],
    'A Meta behavioral answer is scored on several signals. Fill in what your story proves for each.',
    function (r) { return 'Signal <b>' + H.esc(r[0]) + '</b>: ' + (has(r[1], ['%', 'users', 'million', 'm users', 'cut', 'saved', 'teams', 'org']) ? H.c('g', 'measurable or broad evidence') : 'evidence present; can you add a number or wider scope?'); },
    function (rows) {
      var weak = []; rows.forEach(function (r, i) { if (has(r[1], ['my team only', 'just me', 'none', 'n/a', 'not sure'])) weak.push(i); });
      return { hl: weak, narr: weak.length ? 'Red rows are weak for a senior level: scope stops at your own team. For E5 and up, find a story where your work changed other teams.' : 'Every signal has evidence. Now check that the scope matches the level you are applying for.', html: '<p>Meta interviewers commonly use the behavioral round to calibrate level: broader scope + clear impact + honest growth = higher level.</p>' };
    }),
  examples: [
    { title: 'Example: proudest project with impact', html: `<p>"I led the rewrite of our image upload path. Uploads failed for about 4% of Android users on slow networks. I proposed resumable uploads, got buy-in from the client and storage teams, and we shipped in six weeks. Failures dropped to 0.6% and daily posts rose 1.2%." Numbers, scope, and your role, in four sentences.</p>` },
    { title: 'Example: direct conflict', html: `<p>"I told my tech lead in our one-on-one that I thought the migration plan skipped load testing. I brought a graph of last year's incident. He agreed to a one-week load test, which found a connection-pool limit." Direct and respectful matches "Be Direct and Respect Your Colleagues".</p>` },
    { title: 'Example: growth', html: `<p>"My manager said my design docs were too long and people stopped reading. I started writing a five-line summary first and asked two reviewers to time how long it took them to understand. Review time fell from days to hours."</p>` }
  ],
  deepDive: `<p><b>Depth over breadth:</b> the jedi round often explores two or three stories in depth. Interviewers commonly ask "what would your manager say?", "what was the hardest part?" and "what would you do differently?". Prepare stories with several layers.</p>` +
    `<p><b>Level mismatch:</b> candidates are sometimes "down-levelled" when coding is strong but behavioral stories show narrower scope. If you are targeting senior, have at least two stories with cross-team impact and one about mentoring or raising engineering standards.</p>` +
    `<p><b>Speed with judgment:</b> "Move fast" does not mean reckless. Strong stories show shipping quickly behind experiments and feature flags, with metrics to know if it worked.</p>` +
    `<p><b>Traps:</b> vague impact ("it went well"), avoiding conflict stories ("I never have conflicts"), and blaming others. Also confirm format details with your recruiter; Meta has adjusted interview formats over time, and reports of new formats (such as AI-assisted coding rounds) vary by role.</p>`,
  aiEra: `<p><b>What AI changes:</b> Meta has publicly pushed AI across its products and engineering, and candidates are increasingly asked how they use AI tools. Be ready with a real example of AI speeding you up and one where you had to catch its mistake.</p>` +
    `<p><b>Practice:</b> ask an assistant to score your story on each signal (impact, conflict, ambiguity, growth, communication) and to say what level the scope sounds like. Then ask for three follow-up questions per signal.</p>` +
    `<p><b>Caution:</b> AI tends to inflate impact. If it suggests "led a 20-person effort" and you led three people, correct it. Level calibration is exactly where over-claiming is caught.</p>`,
  problems: [bp('Conflict story at the right level', 'Medium', ['meta', 'conflict'], ['Meta'],
    'Tell me about the most difficult disagreement you have had with a colleague.',
    '"I do not really have conflicts. I get along with everyone."',
    'Avoids the question; shows no directness, no resolution skills; reads as either inexperienced or evasive.',
    `<p><b>S:</b> Our team was launching a new notifications feature, and the PM, Lena, wanted to send push notifications to all users on day one. <b>T:</b> I owned the delivery service and believed a full blast risked spam complaints and unsubscribes. <b>A:</b> I asked Lena for 20 minutes and said directly that I disagreed and why, showing data from a past launch where unsubscribes tripled. I asked what she needed most; it was a strong launch-day number for leadership. We agreed to a 10% holdout experiment with an unsubscribe guardrail, and I built the guardrail in two days. <b>R:</b> The experiment showed a 22% engagement lift but unsubscribes rose for a low-activity segment; we excluded that segment, kept the lift and avoided about 40,000 unsubscribes in the first week. Lena presented the experiment design to her director as a template. <b>L:</b> Asking what the other person needs most turned a yes/no fight into a design problem.</p>`,
    ['Disagreement is real and meaningful', 'Direct and respectful', 'Found the other person\'s goal', 'Data-driven resolution', 'Measurable outcome and relationship intact'],
    ['Hint 1: Choose a disagreement with real stakes, not a minor style debate.', 'Hint 2: Show you spoke directly to the person first and found out what they needed most.', 'Hint 3: End with a measured outcome and how the relationship looked afterwards.'],
    mq('Which part of a Meta behavioral answer most affects level calibration?', ['Your tone of voice', 'The scope and impact of your stories', 'How many stories you tell', 'Quoting company values'], 1, 'Scope and measurable impact separate levels.'))]
});

// ---------- TOPIC 4: Microsoft and Apple ----------
topics.push({
  title: 'Microsoft and Apple: Growth Mindset, the Team-Led Loop and Craft',
  analogy: `<p>Microsoft and Apple are like two orchestras. At Microsoft, each musician you meet plays both the tune and asks how you practise (technical plus behavioral in the same round), and the conductor cares a lot about whether you keep learning. At Apple, each section hires its own player; the strings audition sounds nothing like the brass audition, and they all want someone obsessed with the tiny details of sound.</p>`,
  explain: `<p><b>Microsoft (commonly reported):</b> a recruiter screen, a technical screen, then a loop of about four to five interviews. Most rounds mix coding or design with behavioral questions. The final interviewer is often a senior person sometimes called the "<b>As Appropriate</b>" (AA) interviewer, who may only see you if earlier rounds went well. Microsoft's published culture centres on a <b>growth mindset</b> (learn-it-all rather than know-it-all), customer obsession, diversity and inclusion, "One Microsoft" (working across groups), and making a difference.</p>` +
    H.table(['', 'Microsoft', 'Apple'], [
      ['Who runs the process', 'Central recruiting plus the team', 'Very team-driven; hiring manager has strong influence'],
      ['Behavioral style', 'Growth mindset, learning from failure, collaboration across groups', 'Craft, attention to detail, collaboration, passion for products, discretion'],
      ['Format (commonly reported)', 'Loop of ~4-5, behavioral mixed into each', 'Varies a lot by team; may include a presentation or deep dive on past work'],
      ['Typical question', '"Tell me about a time you failed and what you learned."', '"Walk me through a project and every decision you made."'],
      ['Watch out for', 'Sounding like a know-it-all', 'Talking about confidential past work; ask for permission or stay high level']]) +
    `<p><b>Apple (commonly reported):</b> there is no single Apple loop. Teams design their own interviews, often with many interviewers including cross-functional partners (design, hardware, QA). Expect deep dives into your past projects ("why that data structure? what were the alternatives? what did users notice?") and questions on why Apple and why this team. Apple values secrecy, so do not ask about unannounced products, and show that you can keep a confidence by not oversharing past employers' secrets.</p>` +
    `<p><b>What this means for you:</b> for Microsoft, prepare at least two failure-and-learning stories and one cross-team story. For Apple, prepare one project you can explain to any depth, with the trade-offs and the user-visible details you cared about.</p>`,
  clues: ['Microsoft: "What did you learn from that?" after every story', 'Microsoft: final round with a senior leader (AA)', 'Apple: "Walk me through every decision on this project"', 'Apple: "Why Apple? Why this team?"', 'Interviewers from design, QA or hardware in the loop', 'Job post emphasises "attention to detail" or "learn-it-all"'],
  viz: rowsViz('Same story, two companies: what to emphasise', 'Story beat: what you did; ... (2-8 items)',
    'Situation: crash rate on our app rose after a release; Action 1: reproduced on old devices and found a memory spike; Action 2: asked the design team to simplify an animation; Mistake: I had skipped testing on old devices; Learning: added old devices to the CI matrix; Result: crashes fell 60%',
    ['Beat', 'What you did'],
    'One story, two audiences. Watch which beats you stretch for Microsoft and which for Apple.',
    function (r, i) {
      var tag = has(r[0] + r[1], ['mistake', 'learn', 'feedback']) ? 'Stretch this for <b>Microsoft</b> (growth mindset).' : has(r[1], ['design', 'device', 'detail', 'animation', 'memory']) ? 'Stretch this for <b>Apple</b> (craft and detail).' : 'Keep this short for both.';
      return 'Beat ' + (i + 1) + ': ' + H.esc(r[0]) + '. ' + tag;
    },
    function (rows) {
      var g = [], a = [];
      rows.forEach(function (r, i) { if (has(r[0] + r[1], ['mistake', 'learn'])) g.push(i); else if (has(r[1], ['design', 'device', 'detail', 'memory'])) a.push(i); });
      return { ok: a, hl: [], narr: 'Green rows are your Apple emphasis (craft). The learning rows are your Microsoft emphasis. Same facts, different spotlight.', html: '<p>Tailoring is choosing which true details to expand, never changing the facts.</p>' };
    }),
  examples: [
    { title: 'Example: Microsoft growth mindset answer', html: `<p>"I pushed a schema change without a backfill plan and broke reports for a day. I owned it in the incident review, wrote the backfill, and created a migration checklist the team now uses. The bigger lesson: I used to see reviews as a gate; now I ask reviewers early for the risks I cannot see."</p>` },
    { title: 'Example: Apple deep dive', html: `<p>Interviewer: "Why did you cache thumbnails on disk rather than in memory?" Strong answer: "Memory pressure on older phones killed our app in the background; I measured both, disk cache added 8 ms but cut background kills by 70%, and users noticed the app no longer reloaded." Specific, measured, user-visible.</p>` },
    { title: 'Example: Why this company', html: `<p>Microsoft: "I use VS Code and GitHub daily, and I want to work on developer tools at that scale; your team's work on X is why." Apple: "I care about the small details users feel; on my last project I fought for a 100 ms improvement in launch time because it made the app feel instant." Specific and personal beats generic praise.</p>` }
  ],
  deepDive: `<p><b>Microsoft's AA interviewer:</b> commonly reported as a senior engineer or manager who decides whether to continue. They often ask broader questions about career, learning and judgment. Treat it as a conversation with a future skip-level manager.</p>` +
    `<p><b>Microsoft culture evolution:</b> since 2014 Microsoft's leadership has spoken widely about moving from "know-it-all" to "learn-it-all". Answers that show curiosity, accepting feedback and working across product groups fit this.</p>` +
    `<p><b>Apple's team autonomy:</b> because teams run their own process, ask your recruiter what the rounds are and who you will meet. Some roles include presenting past work to a panel. Prepare visuals you are allowed to share.</p>` +
    `<p><b>Confidentiality:</b> at any company, but especially Apple, describe past work without revealing secrets: "a payments feature for a large retailer" instead of client names and unreleased plans. Interviewers read this as trustworthiness.</p>`,
  aiEra: `<p><b>Microsoft and AI:</b> Microsoft has put AI assistants across its products, and interviewers commonly ask how you use tools like coding assistants. A growth-mindset answer: what you tried, what you measured, what you changed when it did not help.</p>` +
    `<p><b>Apple and AI:</b> Apple emphasises privacy and on-device processing in its public messaging. If you discuss AI work, mention how you handled user data and privacy; it shows alignment.</p>` +
    `<p><b>Practice:</b> ask an assistant to play a deep-dive interviewer who asks "why?" five times on one design decision. If you run out of answers by the third "why", you are not ready for an Apple-style deep dive.</p>`,
  problems: [bp('Failure story for a growth-mindset culture', 'Easy', ['microsoft', 'growth mindset'], ['Microsoft'],
    'Tell me about a time you failed and what you learned.',
    '"I worked too hard and did not delegate enough. My weakness is that I care too much."',
    'A disguised boast, not a failure; no real learning; growth-mindset interviewers spot it instantly.',
    `<p><b>S:</b> I estimated a feature migration at two weeks without checking with the data team. <b>T:</b> It was my estimate and my commitment to our PM. <b>A:</b> In week two I found the data needed a backfill owned by another team, so we slipped by three weeks. I told the PM as soon as I knew, apologised for the bad estimate, and proposed shipping the part that did not depend on the backfill. I also asked the data team's lead what information they would have needed from me earlier. <b>R:</b> We shipped 70% of the value on the original date and the rest three weeks later. <b>L:</b> I now list every team a change touches and get a quick check from each before I give an estimate; my last four estimates were within 20%. I learned that asking early is faster than being clever alone.</p>`,
    ['A real failure with real cost', 'Owns it without excuses', 'Damage limited and communicated early', 'Concrete changed behaviour with evidence', 'Learning framed as growth'],
    ['Hint 1: Pick a real failure that had a cost to someone else, not a weakness dressed as a strength.', 'Hint 2: Show how quickly you told people and what you did to limit the damage.', 'Hint 3: Prove the learning with a behaviour you changed and evidence that it works.'],
    mq('Microsoft interviewers listening for growth mindset most want:', ['Proof you never fail', 'Evidence you learned and changed behaviour', 'A list of certifications', 'Blame placed fairly'], 1, 'Learn-it-all beats know-it-all.'))]
});

// ---------- TOPIC 5: Netflix, Indian product companies, startups ----------
topics.push({
  title: 'Netflix, Indian Product Companies and Startups',
  analogy: `<p>Joining Netflix, a fast-growing Indian product company, or a ten-person startup is like joining three different sports teams. Netflix is a professional team that keeps only star players and expects you to speak up in the huddle. The Indian product company is a fast league team with tough trials and a coach who wants to know you can play on day one. The startup is a pickup game where you play every position and the captain asks "will you show up every week?"</p>`,
  explain: `<p><b>Netflix:</b> its public culture memo stresses <b>freedom and responsibility</b>, <b>context, not control</b>, candour (giving and receiving direct feedback), and the "<b>keeper test</b>" (would your manager fight to keep you?). Interviews are commonly reported to include many conversations with team members and leaders, with heavy focus on judgment, independence and culture. Read the memo; interviewers expect you to have opinions about it, including which parts would challenge you.</p>` +
    H.table(['Company type', 'Common rounds (commonly reported)', 'Behavioral focus'], [
      ['Netflix', 'Recruiter, hiring manager, technical rounds, many culture conversations', 'Candour, judgment, independence, high performance'],
      ['Indian product companies (e.g. Flipkart, Swiggy, Razorpay, PhonePe, Zomato, CRED)', 'Online test or DSA rounds, often a machine-coding round, system design for experienced roles, a hiring manager round, sometimes a separate culture or bar-raiser-style round', 'Ownership, speed, handling scale and ambiguity, why you are switching'],
      ['Early startups', 'Founder or CTO chat, practical take-home or pairing, sometimes a paid trial project', 'Ownership across roles, comfort with chaos, motivation, mission fit']]) +
    `<p><b>Indian product companies:</b> the hiring manager (HM) round is where behavioral questions concentrate: "Why are you leaving?", "Tell me about a production issue you owned", "How do you handle a tight deadline?" Expect discussion of notice period, current compensation and expected compensation; know your numbers and be honest. Machine-coding rounds (building a small working system in about 90 minutes) also test how you structure work under time pressure.</p>` +
    `<p><b>Startups:</b> founders often care less about frameworks and more about whether you will own outcomes end-to-end, learn quickly and stay. Ask about runway, how decisions get made and what the first 90 days look like; good questions are themselves a behavioral signal.</p>`,
  clues: ['Netflix: "What do you think of our culture memo?"', 'Netflix: "Tell me about feedback you gave a peer"', 'HM round: "Why are you switching after only 18 months?"', '"What is your notice period and expected CTC?"', 'Startup: "What would you do in your first 30 days?"', 'Startup: "Have you ever done work outside your job title?"'],
  viz: rowsViz('Pick the story that fits the company', 'Company: the story you would lead with; ... (2-8 items)',
    'Netflix: told my director her launch plan had a gap, with data; Flipkart HM: owned a sale-day outage and fixed capacity planning; Startup: built billing, support tooling and analytics in 3 months; Netflix again: gave a peer hard feedback that improved our on-call',
    ['Company', 'Lead story'],
    'Different companies reward different stories. Match each company to the story that best shows its values.',
    function (r) {
      var why = has(r[0], ['netflix']) ? 'candour and judgment' : has(r[0], ['startup']) ? 'breadth and ownership' : 'ownership at scale';
      return 'For <b>' + H.esc(r[0]) + '</b>, this story should show <b>' + why + '</b>.';
    },
    function (rows) {
      var ok = [], bad = [];
      rows.forEach(function (r, i) {
        var fits = has(r[0], ['netflix']) ? has(r[1], ['feedback', 'told', 'disagree', 'candid']) : has(r[0], ['startup']) ? has(r[1], ['built', 'and', 'months']) : has(r[1], ['owned', 'outage', 'scale', 'sale']);
        (fits ? ok : bad).push(i);
      });
      return { ok: ok, hl: bad, narr: 'Green: the story shows what that company values. Red: consider a different story for that company.', html: '<p>Keep one story bank, but choose the opening story per company.</p>' };
    }),
  examples: [
    { title: 'Example: Netflix candour', html: `<p>"In a design review I told our director, in front of the team, that her rollout plan had no rollback path for the recommendations cache. I had numbers from a past incident. She asked me to own the rollback design; we added it and used it twice in the first month." Shows candour with context, not rudeness.</p>` },
    { title: 'Example: HM round "why are you switching?"', html: `<p>Weak: "My manager is bad and pay is low." Strong: "I have learned a lot building our payments reconciliation, but the team is moving to maintenance. I want to work on high-scale systems like your checkout, and the role's focus on reliability matches my last two years." Positive, specific, forward-looking.</p>` },
    { title: 'Example: startup breadth', html: `<p>"At my last company we had no on-call process. I wrote alerting, set a rota, and trained two non-engineers to triage support tickets. Incidents found by customers fell from 9 to 2 per month." Shows you will pick up work no one owns.</p>` }
  ],
  deepDive: `<p><b>Netflix nuance:</b> the culture memo has been revised over the years (including a major 2024 update). Read the current version on Netflix's jobs site rather than older summaries. A thoughtful answer mentions both what attracts you and what you would find hard (for example, very direct feedback).</p>` +
    `<p><b>Indian market specifics:</b> long notice periods (often 60-90 days) affect offers; companies may ask whether you can buy out or shorten notice. Background verification and offer negotiation are common topics. Never misstate current compensation; verification may reveal it.</p>` +
    `<p><b>Service to product switch:</b> candidates moving from IT services firms are often asked about ownership and depth. Choose stories where you made a decision, not only executed a ticket, and explain the business impact.</p>` +
    `<p><b>Startup risk questions:</b> founders may probe whether you can handle uncertainty and lower salary. Be honest about constraints; it is better to self-select out than to leave in three months.</p>`,
  aiEra: `<p><b>AI at startups:</b> many startups expect engineers to use AI coding tools heavily and may run take-homes that allow them. Ask what is allowed, and be ready to explain how you verified the AI's output.</p>` +
    `<p><b>Indian product companies:</b> machine-coding and DSA rounds are usually proctored and AI tools are commonly not allowed; behavioral rounds increasingly ask about AI productivity. Have a balanced, honest example.</p>` +
    `<p><b>Netflix-style candour with AI:</b> practise feedback conversations with an assistant role-playing a defensive peer. It helps you rehearse wording, but your real stories of feedback must be your own.</p>`,
  problems: [bp('Why are you switching? (HM round)', 'Easy', ['india', 'motivation'], ['Flipkart', 'Swiggy', 'Razorpay'],
    'Why do you want to leave your current company after only 18 months?',
    '"My manager does not value me and the pay is bad. I just want a better package."',
    'Negative about the current employer, purely money-driven, and gives no reason to pick this company.',
    `<p>"I joined my current company to build our order-tracking service from scratch, and in 18 months we took it from zero to about 2 million events a day. I owned the on-call and cut p99 latency by half. The service is now stable and the team is moving to maintenance, while I want to keep working on growth-stage, high-scale problems. Your team's work on real-time delivery tracking is very close to what I have built, and the role's focus on reliability is where I want to deepen. Compensation matters, of course, but the main reason is the kind of problems. My notice period is 60 days, and I can discuss shortening it if needed."</p>`,
    ['Positive about the current employer', 'Specific achievement with numbers', 'Clear pull toward this role', 'Honest about money without leading with it', 'Practical details (notice period) handled calmly'],
    ['Hint 1: Start with what you achieved where you are, so the move sounds like growth rather than escape.', 'Hint 2: Connect your experience to a specific thing this team works on.', 'Hint 3: Mention practical details such as notice period calmly and honestly at the end.'],
    mq('The best "why are you switching?" answer is:', ['Complaints about your manager', 'Pulled toward specific work, positive about the past', 'Only salary', 'I was bored'], 1, 'Pull factors and specifics sound mature and credible.'))]
});

// ---------- TOPIC 6: Research and mapping ----------
topics.push({
  title: 'Researching a Company and Team, and Mapping Your Stories to It',
  analogy: `<p>Preparing for a specific company is like packing for a trip. You own one wardrobe (your story bank), but you pack differently for a ski trip and a beach trip. Research tells you the weather; mapping tells you which clothes to pack and which to wear first.</p>`,
  explain: `<p><b>The plain idea:</b> spend 2-3 hours researching before any loop, then build a <b>company x story matrix</b>. Rows are your 8-10 stories (from your bank in beh02 and beh03); columns are the company's values or signals. Mark which story shows which value, and choose a lead story per likely question.</p>` +
    H.table(['Source', 'What you learn', 'Time'], [
      ['Official careers and values pages', 'The exact values list and how they describe their interview process', '20 min'],
      ['Recruiter prep email or call', 'Round names, number of interviews, what each focuses on', 'Ask directly'],
      ['Engineering blog, recent talks, product releases', 'What the team is building and its technical challenges', '45 min'],
      ['Annual report / shareholder letter (public companies)', 'Strategy and priorities in leaders\' own words', '20 min'],
      ['Current employees (LinkedIn, referrals)', 'Team culture and what good looks like there', '30 min'],
      ['Candidate reports (forums)', 'Commonly reported question themes; treat as unverified', '15 min']]) +
    `<p><b>Mapping recipe:</b> (1) Write the company's values as columns. (2) For each story, tick only values shown by <b>your actions</b>. (3) For each column, choose a lead story and a backup. (4) Look for gaps; if a value has no story, search your memory before stretching an existing one. (5) Plan an opening project ("tell me about yourself" or "proudest project") that hints at the company's top value.</p>` +
    `<p><b>Questions to ask them:</b> research also feeds your questions at the end: "Your blog post on migrating to X mentioned Y; how has that gone?" shows real interest and gives you data to decide.</p>`,
  clues: ['"Why this company?" or "Why this team?"', '"What do you know about what we do?"', '"Do you have any questions for me?"', 'The recruiter sends prep materials with values listed', 'Interviewer mentions a recent product launch or reorg', 'Several interviewers from the same team'],
  viz: rowsViz('Company x story matrix', 'Story: values it shows; ... (2-8 items)',
    'Duplicate charges: customer, deep dive, ownership; Notification experiment: conflict, impact, speed; Migration estimate miss: growth, ownership; On-call rota: team care, mechanism; Search goals doc: ambiguity, influence',
    ['Story', 'Values or signals it shows'],
    'Build the matrix: one row per story, ticking only values shown by your actions.',
    function (r) { var n = r[1].split(',').length; return '<b>' + H.esc(r[0]) + '</b> covers ' + n + ' value' + (n > 1 ? 's' : '') + '. ' + (n > 3 ? H.c('y', 'Covering many values may mean you are stretching it.') : 'A healthy 2-3 tags.'); },
    function (rows) {
      var count = {}; rows.forEach(function (r) { r[1].split(',').forEach(function (v) { v = v.trim().toLowerCase(); count[v] = (count[v] || 0) + 1; }); });
      var singles = Object.keys(count).filter(function (k) { return count[k] === 1; });
      return { hl: [], narr: 'Values with only one story: <b>' + H.esc(singles.join(', ') || 'none') + '</b>. Each needs a backup story in case two interviewers ask about it.', html: '<p>Target: every key value has a lead story and a backup, and no story is your lead for more than two values.</p>' };
    }),
  examples: [
    { title: 'Example: one matrix, three companies', html: H.table(['Story', 'Amazon', 'Google', 'Meta'], [['Duplicate charges', 'Dive Deep, Customer Obsession', 'User focus', 'Impact'], ['Notification experiment', 'Have Backbone', 'Collaboration', 'Conflict, Move Fast'], ['Migration estimate miss', 'Ownership, Earn Trust', 'Humility', 'Growth']]) },
    { title: 'Example: research turned into a question', html: `<p>From the engineering blog you learn the team moved to a new streaming platform. At the end you ask: "What surprised the team most about the migration, and what is still hard?" You learn about on-call load, and the interviewer sees curiosity.</p>` },
    { title: 'Example: filling a gap honestly', html: `<p>Netflix values candour and you lack a "gave hard feedback" story. Before stretching another story, list every review, retro and one-on-one from the past year; most people find a real moment where they told someone a hard truth.</p>` }
  ],
  deepDive: `<p><b>Signal vs noise in candidate reports:</b> forums are useful for themes ("expect conflict questions") but unreliable for specifics, which change by team, level and year. Weight official sources and your recruiter above anonymous posts.</p>` +
    `<p><b>Team-level research matters more than company-level:</b> the same company can feel very different team to team. Ask the recruiter which team or org is hiring; search for that team's talks, papers or open-source work.</p>` +
    `<p><b>Mapping limits:</b> do not memorise a script per column. The matrix is a lookup table for your memory, so in the interview you can quickly recall "conflict → notification experiment".</p>` +
    `<p><b>Ethics:</b> never claim to have used a product deeply if you have not. Interviewers often ask follow-ups about features. "I have used it a little; here is what I noticed" is safer and honest.</p>`,
  aiEra: `<p><b>AI for research:</b> assistants can summarise a company's values page, recent blog posts and earnings calls quickly. Always open the source; AI summaries can be outdated or mix up companies.</p>` +
    `<p><b>AI for mapping:</b> give an assistant your story summaries and the company's values, and ask it to propose a matrix. Then correct it: AI tends to tag stories by keywords ("customer" appears, so Customer Obsession) instead of by your actions.</p>` +
    `<p><b>Keep notes private:</b> do not paste confidential details from current or past employers into public AI tools; summarise them at a level you would say aloud in the interview.</p>`,
  problems: [bp('Why this company, why this team', 'Easy', ['research', 'motivation'], ['Google', 'Meta', 'Amazon', 'Microsoft'],
    'Why do you want to join this team in particular?',
    '"It is a great company with smart people and good benefits."',
    'Generic; could be said about any company; shows no research and no fit.',
    `<p>"Three reasons. First, the work: your team builds the payments reliability platform, and I spent the last two years on reconciliation and idempotency problems; your blog post on exactly-once retries described a problem I solved in a smaller system, and I want to work on it at your scale. Second, how you work: the recruiter said the team writes design docs and runs blameless postmortems, which is how I like to work, and I introduced postmortems on my current team. Third, growth: I want to move from owning one service to influencing a platform used by many teams, and this role does that. One question I have is how the team balances new features with reliability work."</p>`,
    ['Specific to the team, not the company brand', 'Links to your own experience', 'Mentions research (blog, recruiter info)', 'Shows what you want to learn', 'Ends with a real question'],
    ['Hint 1: Name something specific the team builds or has written about, not the brand.', 'Hint 2: Connect it to a problem you have already worked on.', 'Hint 3: Add what you want to learn there and finish with a genuine question.'],
    mq('Which source is most reliable about your interview format?', ['Anonymous forum posts', 'Your recruiter and official pages', 'A friend from 2018', 'An AI chatbot guess'], 1, 'Formats change; the recruiter and official sources are current.'))]
});

// ---------- TOPIC 7: Tailoring without sounding rehearsed ----------
topics.push({
  title: 'Tailoring Answers Without Sounding Rehearsed',
  analogy: `<p>A good storyteller at a family dinner tells the same holiday story differently to grandparents and to cousins: more about the food for one, more about the mishaps for the other. The facts never change, and nobody can tell it was told before, because the teller remembers the story, not the sentences.</p>`,
  explain: `<p><b>The plain idea:</b> memorise <b>bullet points, not paragraphs</b>. For each story keep five to seven beats (the problem, your goal, two or three key actions, the number, the lesson). In the room, you choose which beats to expand for that company and question.</p>` +
    H.table(['Rehearsed (sounds scripted)', 'Tailored (sounds natural)'], [
      ['Same 3-minute speech for every question', 'Opens with a one-line headline that answers this exact question'],
      ['Quotes the value: "This shows my Customer Obsession"', 'Shows it: "I called three of the affected customers that afternoon"'],
      ['Perfect sentences, no pauses', 'Natural pauses, checks in: "Should I go deeper on the technical part?"'],
      ['Every story ends with a triumph', 'Includes what went wrong and what you would change'],
      ['Ignores the interviewer\'s follow-up and continues the script', 'Answers the follow-up directly, even if it skips your planned beats']]) +
    `<p><b>Tailoring dials:</b> (1) <b>Headline</b>: lead with the part this company values (Amazon: customer and data; Google: collaboration and approach; Meta: impact and scope; Microsoft: learning; Netflix: candour and judgment; startups: breadth). (2) <b>Depth</b>: expand the matching beat, shrink the rest. (3) <b>Vocabulary</b>: use the company's natural words lightly (Amazon "mechanism", Meta "impact"), never as buzzwords. (4) <b>Length</b>: two minutes, then let them steer.</p>` +
    `<p><b>Practice method:</b> tell each story out loud three times, each time from a different headline, and never write the sentences down. Record yourself; if two recordings sound identical word for word, you are reciting.</p>`,
  clues: ['Interviewer interrupts with a follow-up mid-story', '"Can you give me a different example?"', '"What was your specific role?" after a "we" heavy answer', '"Keep it brief, we have a few more questions"', 'Interviewer seems to be checking boxes against a rubric', 'Same question asked by two interviewers in one loop'],
  viz: rowsViz('One story, three headlines', 'Company: opening headline; ... (2-8 items)',
    'Amazon: I traced a refund spike to duplicate charges by sampling tickets and logs; Meta: I removed duplicate charges for 3% of orders and saved about 50k dollars a month; Microsoft: I learned that green dashboards hide problems and changed how I set alerts; Netflix: I told my lead our monitoring was missing a customer signal and proposed a fix',
    ['Company', 'Opening headline'],
    'The same duplicate-charges story, opened differently for each company. Facts stay identical; the spotlight moves.',
    function (r) { return 'For <b>' + H.esc(r[0]) + '</b>, the first sentence spotlights: ' + H.esc(r[1].slice(0, 60)) + '...'; },
    function (rows) {
      var bad = []; rows.forEach(function (r, i) { if (has(r[1], ['shows my', 'customer obsession', 'googleyness', 'growth mindset', 'leadership principle'])) bad.push(i); });
      return { hl: bad, narr: bad.length ? 'Red rows name a value instead of showing it. Replace the label with the action that proves it.' : 'All headlines show values through actions, not labels. That is what makes tailoring sound natural.', html: '<p>Test: if the headline would still be true after deleting the value name, it shows the value. If it collapses, it was only a label.</p>' };
    }),
  examples: [
    { title: 'Example: headline first', html: `<p>Q: "Tell me about a time you disagreed with your manager." Rehearsed start: "So, back in 2023 at my previous company, which is a mid-size fintech..." Tailored start: "I disagreed with my manager about skipping load tests before a launch; I brought data, we ran a one-week test, and it caught a capacity bug. Want the details?"</p>` },
    { title: 'Example: when asked for a different story', html: `<p>If an interviewer says "do you have another example?", it usually means the first did not show what they need. Briefly ask "Would one with a bigger scope, or one where it did not go well, be more useful?" then switch to your backup from the matrix.</p>` },
    { title: 'Example: handling "we"', html: `<p>Asked "what did <i>you</i> do?", answer with three "I" verbs: "I wrote the proposal, I ran the experiment, I presented the results to the director." Then credit the team: "Two teammates built the dashboard."</p>` }
  ],
  deepDive: `<p><b>Why scripts fail:</b> structured interviews are built around follow-ups, and a scripted answer has no depth beyond its last sentence. Interviewers are also trained to probe the parts you skip quickly.</p>` +
    `<p><b>Cognitive trick:</b> remember stories as a short timeline with numbers ("week 1: sample tickets; week 2: found key bug; result: 0 duplicates, refunds back to baseline"). Numbers and sequence are easy to recall and make your speech sound grounded.</p>` +
    `<p><b>Matching level and company together:</b> a senior Meta candidate leads with cross-team impact; a new-grad Amazon candidate can lead with personal ownership on a class or internship project. Tailoring is to company <i>and</i> level.</p>` +
    `<p><b>Honesty boundary:</b> tailoring chooses which true details to emphasise. Changing facts, inflating your role or borrowing someone else's story crosses the line, and reference checks or follow-ups often expose it.</p>`,
  aiEra: `<p><b>AI makes scripts easy, which makes them common.</b> Interviewers increasingly hear near-identical AI-polished stories, so natural, specific, slightly imperfect answers stand out positively.</p>` +
    `<p><b>Use AI to vary, not to script:</b> ask an assistant to interrupt you with follow-ups at random points, or to ask the same story from three company angles. Do not have it write paragraphs for you to memorise.</p>` +
    `<p><b>Virtual interviews:</b> reading AI-generated text from a second screen is usually noticeable (eye movement, unnatural pacing) and is against most companies' rules. Your bullet-point memory is both more ethical and more convincing.</p>`,
  problems: [bp('Same story, different company', 'Hard', ['tailoring'], ['Amazon', 'Meta', 'Netflix'],
    'Tell me about a project you are proud of. (Answer it for Amazon, then for Meta, then for Netflix.)',
    '"I am proud of the payments project. It was a big project, we did a lot of work, and it went really well. This shows my customer obsession and ownership."',
    'No specifics, names values instead of showing them, identical for every company.',
    `<p><b>Shared facts:</b> I led a three-person effort to remove duplicate charges caused by retries; I sampled tickets, traced logs, fixed idempotency keys, added a duplicate-charge alarm; duplicates went to zero and refunds dropped about 18% back to baseline. <b>Amazon opening:</b> "Customers were being charged twice and our dashboards were green, so I went into the tickets and logs to find out why." Expand the data dive and the alarm (Dive Deep, Customer Obsession, mechanism). <b>Meta opening:</b> "I eliminated duplicate charges affecting about 3% of orders, which saved roughly fifty thousand dollars a month and was adopted by two other teams." Expand impact, scope and speed (shipped in three weeks). <b>Netflix opening:</b> "I told my lead our monitoring ignored a signal customers cared about, and proposed owning the fix." Expand the candid conversation, the judgment call to prioritise it over roadmap work, and acting independently with context. <b>Same facts, three spotlights.</b></p>`,
    ['Facts identical across versions', 'Opening line tuned to company values', 'Values shown by actions, not named', 'Expanded beat matches company focus', 'Still around 2 minutes'],
    ['Hint 1: Write the shared facts once: problem, your actions, numbers, lesson.', 'Hint 2: For each company, pick which single beat to expand based on what they value.', 'Hint 3: Rewrite only the first sentence and the expanded beat; never change the facts.'],
    mq('What is the safest thing to memorise for a behavioral story?', ['The exact paragraphs', 'Key beats and numbers', 'The company values list only', 'Nothing at all'], 1, 'Beats and numbers give structure without sounding scripted.'))]
});

// ---------- PRACTICE ----------
practice.push(bp('Amazon: Customer Obsession beyond the spec', 'Easy', ['amazon', 'customer obsession'], ['Amazon'],
  'Tell me about a time you went beyond what was asked to help a customer.',
  '"I always put the customer first; once I answered a support ticket on a weekend."',
  'Self-label plus a tiny, unmeasured action; no insight into the customer need.',
  `<p><b>S:</b> Our B2B reporting tool had a feature request for "faster exports", assigned to me as a performance ticket. <b>T:</b> Make exports faster. <b>A:</b> Before coding, I asked support to set up calls with two customers who had raised it. Both actually exported data only to re-import it into spreadsheets for one weekly chart. I built the speed-up (40% faster) and also proposed a scheduled emailed report for that chart, which took three days. <b>R:</b> 60% of active accounts enabled the scheduled report within a month and export-related tickets fell by half. <b>L:</b> I now ask "what will you do with this?" before building any request.</p>`,
  ['Talked to real customers', 'Found the need behind the request', 'Delivered the ask and more', 'Measured adoption'],
  ['Hint 1: Choose a time when the request you got was not the real need.', 'Hint 2: Say how you found out what customers actually did, such as calls or data.', 'Hint 3: Measure the result with adoption or fewer complaints.'],
  mq('Customer Obsession is best shown by:', ['Saying yes to every request', 'Working backwards from the real need', 'Working weekends', 'Quoting the principle'], 1, 'Find the need behind the request.')));
practice.push(bp('Google: working with someone very different', 'Easy', ['google', 'collaboration'], ['Google'],
  'Tell me about a time you worked with someone whose working style was very different from yours.',
  '"There was a guy who was really slow, so I just did his part too."',
  'Disrespectful, no attempt to understand, no collaboration; poor Googleyness signal.',
  `<p><b>S:</b> I paired on a data pipeline with Arjun, a teammate in another time zone who preferred writing detailed docs before any code, while I like quick prototypes. <b>T:</b> Deliver the pipeline in four weeks without friction. <b>A:</b> I asked him in a call how he liked to work and shared my style. We agreed he would write a two-page design while I prototyped the riskiest piece (schema evolution) in parallel, and we would review both on day three. His doc caught a backfill problem my prototype missed; my prototype showed one of his assumptions about volume was off. <b>R:</b> We shipped a week early with no rollback. <b>L:</b> Different styles cover each other's blind spots if you agree on a handshake early.</p>`,
  ['Respectful description of the other person', 'Asked about their style', 'Agreed a way of working', 'Both styles added value', 'Result and learning'],
  ['Hint 1: Describe the difference neutrally, without calling the other style wrong.', 'Hint 2: Say what you agreed together about how to work.', 'Hint 3: Show how their style caught something yours would have missed.'],
  mq('A strong Googleyness signal in collaboration stories is:', ['Doing everything yourself', 'Valuing others\' strengths and adapting', 'Avoiding the person', 'Escalating early'], 1, 'Humility and collaboration are core to Googleyness.')));
practice.push(bp('Startup: why join an early-stage company?', 'Easy', ['startup', 'motivation'], ['Startups'],
  'Why do you want to join a 15-person startup instead of a big tech company?',
  '"I want stock options and I heard startups are more relaxed."',
  'Wrong expectations (startups are rarely relaxed), money-only, no mission or ownership.',
  `<p>"I do my best work when I own a problem end-to-end. At my current company I built our internal billing tool and also ended up doing the support tooling and dashboards because nobody owned them; that was the most fun year of my career. Your product solves inventory planning for small retailers, and my family runs a shop that still uses spreadsheets, so I feel the problem. I know the role means ambiguity, changing priorities and lower base pay; I have thought about that and I am comfortable with it. I would like to understand your runway and how the founders make product decisions."</p>`,
  ['Ownership and breadth evidence', 'Personal connection to the mission', 'Realistic about trade-offs', 'Thoughtful questions back'],
  ['Hint 1: Give a real example of you enjoying broad, unowned work.', 'Hint 2: Connect personally to the problem the startup solves.', 'Hint 3: Show you understand the trade-offs and ask a smart question about runway or decisions.'],
  mq('Founders most want to hear that you:', ['Expect a relaxed pace', 'Will own outcomes and understand the trade-offs', 'Want a big title', 'Only care about equity'], 1, 'Ownership and realism signal you will stay and deliver.')));
practice.push(bp('Amazon: Earth\'s Best Employer', 'Medium', ['amazon', 'team care'], ['Amazon'],
  'Tell me about a time you made your team a better place to work.',
  '"I organised a team lunch once and everyone enjoyed it."',
  'Nice but trivial; no problem, no lasting change, no measure.',
  `<p><b>S:</b> Our on-call rota had two people taking 70% of pages because they knew the legacy system. Both were showing burnout and one mentioned leaving. <b>T:</b> I was not the manager, but I was one of the two. <b>A:</b> I measured pages by person for a quarter and shared the data with my manager. I proposed pairing each newer engineer with an expert for two shifts, wrote runbooks for the ten most common alarms, and fixed the three noisiest alarms. <b>R:</b> Within two months pages were spread across six people, out-of-hours pages fell 40%, and both engineers stayed. <b>L:</b> Team health problems need data and mechanisms just like technical ones.</p>`,
  ['Real people problem', 'Data used', 'Mechanisms (runbooks, pairing)', 'Measured improvement', 'Acted without formal authority'],
  ['Hint 1: Choose a real problem that hurt people, such as on-call load or unclear onboarding.', 'Hint 2: Use data to show the problem to your manager.', 'Hint 3: Leave a mechanism like runbooks or a rota and measure the change.'],
  mq('Which ending best fits Earth\'s Best Employer?', ['We had a fun offsite', 'Pages were shared fairly and two people stayed', 'I got promoted', 'I worked extra hours'], 1, 'Lasting, measured improvement for people.')));
practice.push(bp('Meta: delivering impact under ambiguity', 'Medium', ['meta', 'ambiguity', 'impact'], ['Meta'],
  'Tell me about a time you had to deliver something important when the goal was unclear.',
  '"Nobody told us what to build, so we waited until product decided."',
  'Passive; fails "embracing ambiguity" and "driving results".',
  `<p><b>S:</b> Leadership asked our team to "improve creator retention" with no metric or plan. <b>T:</b> I volunteered to turn it into something we could build. <b>A:</b> I pulled data on creators who stopped posting and found 45% quit after their first three posts got under ten views. I wrote a one-pager proposing a "first posts boost" experiment, aligned the ranking team's lead in a 30-minute meeting, and built the experiment behind a flag in two weeks. <b>R:</b> 30-day creator retention rose 6 points in the test group; it launched to all new creators and the ranking team adopted the approach. <b>L:</b> Ambiguity is an invitation to define the metric yourself.</p>`,
  ['Turned vague goal into a metric', 'Data-led insight', 'Cross-team alignment', 'Shipped quickly with experiment', 'Clear impact number'],
  ['Hint 1: Start from a vague goal and show how you defined a measurable target.', 'Hint 2: Show the data that pointed to where to act.', 'Hint 3: End with the experiment result and who else adopted it.'],
  mq('"Embracing ambiguity" is best shown by:', ['Waiting for clarity', 'Defining a metric and testing quickly', 'Building everything', 'Asking for more people'], 1, 'Turning fog into a testable goal.')));
practice.push(bp('Microsoft: working across product groups', 'Medium', ['microsoft', 'one microsoft', 'collaboration'], ['Microsoft'],
  'Tell me about a time you needed help from a team with different priorities.',
  '"The other team kept ignoring us so I escalated to my director."',
  'Escalation first; no empathy for their priorities; no collaboration.',
  `<p><b>S:</b> My feature needed an API change from the identity team, which was busy with a security deadline. <b>T:</b> Get the change in time for our release without derailing them. <b>A:</b> I read their roadmap and found the change was close to a task they already planned. I offered to write the code myself with their review and wrote a short design note following their conventions. I joined their stand-up twice to answer questions. <b>R:</b> They merged my change in a week with two review rounds, and their lead later asked me to review a related change. <b>L:</b> Making it cheap for the other team to say yes works better than asking them to do work.</p>`,
  ['Understood the other team\'s priorities', 'Offered to do the work', 'Followed their conventions', 'Built a lasting relationship'],
  ['Hint 1: Show you learned what the other team was focused on before asking.', 'Hint 2: Make it cheap for them to help, for example by doing the work yourself.', 'Hint 3: End with the result and how the relationship improved.'],
  mq('Best first move when another team has different priorities?', ['Escalate', 'Understand their roadmap and make it easy to help', 'Wait', 'Build a workaround silently'], 1, 'Empathy and lowering their cost earns help.')));
practice.push(bp('Netflix: giving candid feedback', 'Medium', ['netflix', 'candour'], ['Netflix'],
  'Tell me about a time you gave difficult feedback to a peer.',
  '"I mentioned it to my manager so they could deal with it."',
  'Avoids direct feedback; the opposite of a candour culture.',
  `<p><b>S:</b> A peer, Sam, often merged large changes late on Fridays, and twice the on-call person had to roll back over the weekend. <b>T:</b> I wanted it to stop without damaging our relationship. <b>A:</b> I asked Sam for a quick chat, described the two incidents and their effect on the on-call engineer, and asked what was driving the timing. He said Friday was his only focus day. We agreed he would merge behind a feature flag and turn it on Monday morning. I also asked him for feedback on me; he said my code reviews were slow, so I set a 24-hour review goal. <b>R:</b> No more weekend rollbacks in the next quarter, and my review time dropped to under a day. <b>L:</b> Feedback works best as a two-way, specific conversation about effects.</p>`,
  ['Direct, private, timely', 'Specific behaviour and impact', 'Curious about the cause', 'Asked for feedback in return', 'Measured outcome'],
  ['Hint 1: Pick a time you went directly to the person, not around them.', 'Hint 2: Describe the specific behaviour and its effect, then ask what was behind it.', 'Hint 3: Show that you also asked for feedback and what changed afterwards.'],
  mq('Netflix-style candour means:', ['Being blunt in public', 'Direct, caring, specific feedback to the person', 'Telling the manager', 'Waiting for reviews'], 1, 'Direct and caring, aimed at helping.')));
practice.push(bp('Indian product company: owning a sale-day outage', 'Medium', ['india', 'ownership', 'incident'], ['Flipkart', 'Swiggy', 'PhonePe'],
  'Tell me about a production issue you owned end-to-end.',
  '"There was an outage during a sale; the infra team fixed it."',
  'No personal ownership, no actions, no learning.',
  `<p><b>S:</b> During a festive sale our cart service started timing out at 3x normal traffic. <b>T:</b> I owned the service and was on-call. <b>A:</b> I declared an incident, shed non-critical calls (recommendations) behind a flag within ten minutes, and scaled the database read replicas. Traces showed one query doing a full scan on a new column without an index. I added the index on a replica, verified, then rolled it out. Afterwards I ran a blameless postmortem and set up a pre-sale load test at 5x traffic as a release gate. <b>R:</b> Error rate dropped from 12% to under 0.5% in 35 minutes; the next sale ran at 4x traffic with no incident. <b>L:</b> Load-test the expected peak, not the average.</p>`,
  ['Fast mitigation first', 'Root cause found with data', 'Blameless postmortem', 'Preventive mechanism', 'Clear numbers'],
  ['Hint 1: Separate stopping the bleeding from finding the root cause.', 'Hint 2: Give the timeline in minutes and the numbers before and after.', 'Hint 3: End with the mechanism that kept the next sale safe.'],
  mq('In an incident story, what comes first?', ['Root cause analysis', 'Mitigation to stop customer impact', 'Blame', 'The postmortem'], 1, 'Stop the bleeding, then investigate.')));
practice.push(bp('Apple: deep dive on a design decision', 'Hard', ['apple', 'craft'], ['Apple'],
  'Walk me through a technical decision on your last project and why you made it.',
  '"We used a cache because caches make things fast."',
  'Shallow; no alternatives, no measurement, no user impact; fails a deep dive in one question.',
  `<p><b>Context:</b> Our photo app reloaded thumbnails when users switched back to it, and reviews mentioned it "feels slow". <b>Options:</b> in-memory cache (fastest, but the OS kills apps that use too much memory on older devices), disk cache (slightly slower, survives restarts), or server-side smaller images (less data, needs backend work). <b>Decision:</b> I measured on our three oldest supported devices: memory cache caused background termination 30% of the time; disk cache added about 8 ms per thumbnail but cut terminations by 70%. I chose a small memory cache for the visible screen plus a disk cache, with an eviction policy based on recent views. <b>Details I cared about:</b> decoding images off the main thread to avoid scroll jank, and fading thumbnails in over 150 ms so loading did not flash. <b>Result:</b> "slow" reviews dropped by about half over two releases. <b>What I would change:</b> I would test on old devices from day one; we found the issue late.</p>`,
  ['Alternatives with trade-offs', 'Measured on real devices', 'User-visible details', 'Honest about what you would change', 'Can go deeper on any point'],
  ['Hint 1: List at least two alternatives and what each costs.', 'Hint 2: Show the measurement that decided it, on real devices or real users.', 'Hint 3: Mention the small, user-visible details you cared about and what you would change.'],
  mq('An Apple-style deep dive mostly tests:', ['Memorised definitions', 'Reasoning, trade-offs and attention to detail', 'Speed of speech', 'Knowledge of Apple products'], 1, 'They follow "why?" until your reasoning ends.')));
practice.push(bp('Amazon bar raiser: a decision you got wrong', 'Hard', ['amazon', 'are right a lot', 'earn trust'], ['Amazon'],
  'Tell me about a time you made a decision that turned out to be wrong. How did you know, and what did you do?',
  '"I cannot think of one; my decisions are usually right because I research them."',
  'Implausible; refuses vulnerability; a bar raiser reads it as low self-awareness.',
  `<p><b>S:</b> I chose a NoSQL store for a new order-history feature because I expected huge write volume. <b>T:</b> It was my call as the feature lead. <b>A:</b> Two months after launch, the main use turned out to be complex queries by customer support, which our store handled badly; support built manual workarounds. I noticed when query latency tickets kept coming. I wrote a short doc admitting the original assumption was wrong, showing actual read/write patterns, and proposing moving to a relational store with a dual-write migration over four weeks. I presented it to my manager and the support lead. <b>R:</b> Migration finished in five weeks with no downtime; support query time fell from minutes to seconds. <b>L:</b> I now write down my key assumptions in design docs with a date to check them against real usage.</p>`,
  ['Real, consequential wrong decision', 'Says how they noticed', 'Owns it openly', 'Fixes with a plan and data', 'Changed process afterward'],
  ['Hint 1: Pick a decision you personally made with a real consequence.', 'Hint 2: Explain the signal that told you it was wrong and how fast you acted.', 'Hint 3: Show the fix, the result and the habit you changed.'],
  mq('Why do bar raisers ask about wrong decisions?', ['To reject you', 'To test self-awareness and how you correct course', 'To check your memory', 'It is a trick question'], 1, 'Being Right A Lot includes noticing and correcting mistakes.')));
practice.push(bp('Google: leading without being asked', 'Hard', ['google', 'emergent leadership'], ['Google'],
  'Tell me about a time you stepped up to lead when nobody had asked you to, and when you stepped back.',
  '"I took over the project because the lead was not doing a good job."',
  'Takes leadership by undermining someone; no stepping back; poor emergent leadership.',
  `<p><b>S:</b> Our team's flaky test suite was failing 1 in 5 CI runs and nobody owned it; each person re-ran and moved on. <b>T:</b> I decided to organise a fix. <b>A:</b> I spent a day tagging the top 30 flaky tests by cause, posted the data, and proposed a two-week "flake rotation" where each engineer fixed two tests. I set up a tracking dashboard. When Mei, who knew the test framework far better than me, suggested a framework-level retry with quarantine, I handed the technical lead to her and focused on coordination. <b>R:</b> Flaky failures fell from 20% to 2%, saving about 30 engineer-hours a week, and Mei's quarantine tool was adopted by two other teams. <b>L:</b> Leading means getting the problem solved, including handing it to the best person.</p>`,
  ['Saw an unowned problem', 'Used data to rally people', 'Shared the work', 'Stepped back to a better expert', 'Measured, lasting result'],
  ['Hint 1: Pick a problem nobody owned, so stepping up was helpful, not a takeover.', 'Hint 2: Use data to show the cost and get others to join you.', 'Hint 3: Show the moment you handed leadership to someone better suited.'],
  mq('Emergent leadership at Google includes:', ['Always being in charge', 'Stepping up and also stepping back when someone else is better suited', 'Avoiding leadership', 'Only leading with a title'], 1, 'Knowing when to lead and when to follow.')));
practice.push(bp('Meta senior: cross-team impact', 'Hard', ['meta', 'scope', 'senior'], ['Meta'],
  'Tell me about the most impactful thing you have done that went beyond your own team.',
  '"I improved my team\'s service a lot and my manager was happy."',
  'Scope stops at own team; for E5/E6 this signals a lower level.',
  `<p><b>S:</b> Five product teams each implemented their own rate limiting; two incidents in a quarter came from inconsistent limits. <b>T:</b> I proposed one shared rate-limiting library, without authority over the other teams. <b>A:</b> I collected incident data and each team's needs in one-on-ones, wrote an RFC with a migration plan and an opt-out path, and got two teams to pilot. I paired with an engineer from each pilot team, built dashboards showing limit hits, and presented results at the org review. I also mentored a junior engineer who became the library's co-owner. <b>R:</b> All five teams migrated in two quarters, rate-limit incidents went to zero for the next two quarters, and about 4,000 lines of duplicate code were removed. <b>L:</b> Pilots with visible data convince faster than RFC debates.</p>`,
  ['Multi-team scope', 'Influence without authority', 'Pilot and data', 'Grew someone else', 'Org-level measurable impact'],
  ['Hint 1: Choose work whose effect reached several teams, not only your own.', 'Hint 2: Show how you got others to adopt it without authority, such as pilots.', 'Hint 3: Include numbers at the org level and someone you helped grow.'],
  mq('For a senior Meta level, the strongest story shows:', ['Hard work on your own service', 'Measurable impact across several teams', 'Many hours', 'A new framework you liked'], 1, 'Scope beyond your team signals senior level.')));
practice.push(bp('Tailor one story for two companies', 'Hard', ['tailoring', 'amazon', 'google'], ['Amazon', 'Google'],
  'Tell me about a time you simplified something complex. (Give the Amazon and the Google versions.)',
  '"I simplified our deployment. This shows Invent and Simplify." (identical for both companies)',
  'Names the value, no specifics, no tailoring.',
  `<p><b>Shared facts:</b> deployments needed a 14-step manual checklist and took 2 hours; I built a pipeline with automated checks and one-click rollback; deploy time fell to 15 minutes and failed deploys from 1 in 10 to 1 in 50. <b>Amazon version:</b> lead with the customer and mechanism: "Failed deploys were causing customer-facing errors about twice a month, so I replaced our 14-step checklist with an automated pipeline." Expand the data on failures and the rollback mechanism (Invent and Simplify, Insist on the Highest Standards, Customer Obsession). <b>Google version:</b> lead with the approach and collaboration: "Our deploys were slow and risky, so I first interviewed the four people who deployed most to learn which steps actually caught problems." Expand how you involved the team, the trade-off of what to automate first, and how a teammate improved the design. <b>Both:</b> same numbers, same lesson.</p>`,
  ['Identical facts', 'Different opening per company', 'Values shown by actions', 'Clear before/after numbers'],
  ['Hint 1: Write down the facts and numbers once before thinking about companies.', 'Hint 2: For Amazon lead with the customer effect and mechanism; for Google lead with approach and collaboration.', 'Hint 3: Check that no fact differs between the two versions.'],
  mq('Tailoring an answer for a company means:', ['Changing facts to match values', 'Choosing which true details to emphasise', 'Using more buzzwords', 'Telling a different person\'s story'], 1, 'Facts stay fixed; emphasis moves.')));

// ---------- QUIZ ----------
function qz(q, o, a, e) { quiz.push({ q: q, options: o, answer: a, explain: e }); }
qz('How many Leadership Principles does Amazon currently publish?', ['10', '14', '16', '20'], 2, 'Fourteen original principles plus two added in 2021: Earth\'s Best Employer and Success and Scale Bring Broad Responsibility.');
qz('What is the main role of Amazon\'s bar raiser?', ['To ask only coding questions', 'To keep the hiring bar high, usually from outside the hiring team', 'To negotiate salary', 'To pick your team'], 1, 'A trained interviewer outside the team who protects long-term hiring quality.');
qz('Which is NOT one of Google\'s four publicly described hiring attributes?', ['General cognitive ability', 'Role-related knowledge', 'Googleyness', 'Years of experience'], 3, 'The four are GCA, role-related knowledge, leadership and Googleyness.');
qz('At Google, who commonly reviews the interview feedback before an offer?', ['Only your recruiter', 'A hiring committee or review group reading the written packet', 'The CEO', 'Nobody'], 1, 'Written feedback is reviewed by people who may not have met you.');
qz('Meta\'s behavioral interview is commonly nicknamed:', ['Ninja', 'Pirate', 'Jedi', 'Wizard'], 2, 'Ninja is coding, pirate is design, jedi is behavioral.');
qz('At Meta, the behavioral round strongly affects:', ['Your start date', 'The level you are hired at', 'Your office location', 'Your stock price'], 1, 'Scope and impact in stories help calibrate level.');
qz('Microsoft\'s culture language most emphasises:', ['Know-it-all expertise', 'A growth mindset (learn-it-all)', 'Working alone', 'Frugality'], 1, 'Microsoft speaks of moving from know-it-all to learn-it-all.');
qz('Apple\'s interview process is best described as:', ['Identical for every role', 'Largely team-driven, varying by team', 'Only take-home projects', 'Only behavioral'], 1, 'Teams design their own rounds.');
qz('Netflix\'s "keeper test" asks:', ['Can you keep a secret?', 'Would your manager fight to keep you?', 'Can you keep deadlines?', 'Do you keep notes?'], 1, 'It is about sustained high performance.');
qz('In many Indian product companies, behavioral questions concentrate in:', ['The online test', 'The hiring manager round', 'The machine-coding round', 'Background verification'], 1, 'The HM round covers motivation, ownership and fit.');
qz('What is the most reliable source for your interview format?', ['A 2019 forum post', 'Your recruiter and the company\'s official pages', 'A friend at another company', 'Social media rumours'], 1, 'Formats change; ask the recruiter.');
qz('Tailoring an answer for a company should change:', ['The facts', 'Your role in the story', 'Which true details you emphasise', 'The numbers'], 2, 'Facts stay; the spotlight moves.');
qz('Saying "this shows my Customer Obsession" in an answer is:', ['Required at Amazon', 'Weaker than showing it through actions', 'The best way to score', 'Forbidden by rules'], 1, 'Interviewers score actions, not labels.');
qz('A Google hypothetical behavioral question is best answered with:', ['Only a past story', 'Your approach plus a real example', 'A refusal', 'A joke'], 1, 'Approach shows judgment; the example shows evidence.');

// ---------- INTERVIEW ----------
function iv(q, lvl, a, f) { interview.push({ q: q, level: lvl, a: a, followUps: f }); }
iv('How would you prepare for an Amazon loop in two weeks?', 'I', '<p>I would read all 16 Leadership Principles, list 8-10 real stories, and tag each with the 2-3 principles its actions show. I would build a grid to make sure the common LPs (Customer Obsession, Ownership, Dive Deep, Deliver Results, Bias for Action, Earn Trust, Have Backbone) each have two stories. I would practise each story out loud in about two minutes and have a friend or an AI assistant ask bar-raiser follow-ups. I would also confirm the round structure with my recruiter.</p>', ['Which LPs are hardest to find stories for?', 'How do you avoid repeating stories across interviewers?']);
iv('What is Googleyness, in your own words?', 'B', '<p>To me it is how you work with others and with uncertainty: being humble enough to change your mind with data, comfortable making progress when things are unclear, collaborative rather than heroic, caring about users, and doing the right thing when nobody is watching. It is not about being fun or quirky. I would show it through stories, such as a time I credited a teammate whose idea beat mine.</p>', ['Give an example of changing your mind.', 'How is that different from leadership?']);
iv('What do you know about Meta\'s behavioral interview and how would you prepare?', 'I', '<p>It is commonly reported as a 45-minute round exploring a few stories deeply, looking at signals like driving impact, resolving conflict, handling ambiguity, growing from feedback and communication, and it helps decide your level. I would prepare stories with clear numbers and scope that matches the level I am targeting, including at least one cross-team story, one honest failure and one direct conflict. I would confirm the format with my recruiter since formats change.</p>', ['What separates an E4 story from an E5 story?', 'How do you show "Move Fast" responsibly?']);
iv('Why do you want to work here rather than at a competitor?', 'B', '<p>I would answer with specifics I researched: what this team builds, a blog post or product decision I admire, and how it connects to my experience. For example: "Your team runs reliability for payments at large scale; I spent two years on idempotency and reconciliation, and your post on retries described a problem I solved at smaller scale. I want to deepen that." I would avoid generic praise and finish with a genuine question.</p>', ['What would make you turn down our offer?', 'What did you learn from your research that surprised you?']);
iv('How do you answer "tell me about a time" questions without sounding rehearsed?', 'I', '<p>I remember stories as five to seven beats with numbers, not as paragraphs. I open with a one-line headline that answers the exact question, then expand the beat that matters most for this company and level, and check in with the interviewer. I let follow-ups steer me rather than finishing a script. I practise each story from different headlines so the wording changes every time while the facts stay the same.</p>', ['How long should an answer be?', 'What if the interviewer interrupts?']);
iv('What does the bar raiser do, and how does it change your preparation?', 'I', '<p>As Amazon describes it, the bar raiser is a trained interviewer, usually from outside the hiring team, whose job is to keep the hiring bar high for the long term; they ask normal LP questions but probe deeper and have a strong voice in the debrief. You usually do not know who it is. So I prepare every story to survive several layers of "why", "what data" and "what would you change", and I treat every interviewer as if they were the bar raiser.</p>', ['How do you handle a question you have no story for?', 'What makes an answer fail at the third follow-up?']);
iv('How would your preparation differ for Microsoft and Apple?', 'I', '<p>For Microsoft I would focus on growth mindset: honest failure stories with clear behaviour changes, working across product groups, and customer focus, knowing behavioral questions appear in most rounds and that a senior "as appropriate" interviewer may close the loop. For Apple I would ask the recruiter about the team-specific format and prepare one or two projects I can explain to any depth, with trade-offs, measurements and the user-visible details I cared about, while being careful about confidential information.</p>', ['How do you discuss confidential past work?', 'What is a growth-mindset failure story?']);
iv('What do you think of Netflix\'s culture memo?', 'A', '<p>I would show I have read the current version: I like "context, not control" because I work best when I understand the goal and can make decisions, and I value candour because direct feedback has helped me grow. I would also be honest about what would challenge me, for example the keeper test and very direct feedback, and how I have handled similar environments. Interviewers want a thoughtful opinion, not uncritical praise.</p>', ['Tell me about feedback you gave a peer.', 'When is freedom without process risky?']);
iv('How do you handle the "why are you switching?" question in an Indian product-company HM round?', 'B', '<p>I keep it positive and specific: what I achieved at my current company with a number, why the next step is not available there, and why this team\'s problems match what I want to learn. I avoid criticising my manager or leading with salary, though I am honest that compensation is part of it. I also state my notice period and current and expected compensation clearly and truthfully, since they will be verified.</p>', ['What if you switched jobs twice in two years?', 'How do you negotiate notice period?']);
iv('How would you evaluate whether a startup is right for you during the interview?', 'I', '<p>I would ask about runway and funding, how product decisions are made, what the first 90 days look like, who I would learn from, and how they handle on-call and working hours. I would look for honesty about risk and clarity about goals. I would also share my own constraints openly, because a mismatch discovered after three months hurts both sides. Good questions are themselves a signal of ownership.</p>', ['What red flags would make you decline?', 'How do you weigh equity against salary?']);
iv('How do you build a story bank that works across several companies?', 'I', '<p>I list 8-10 real stories covering conflict, failure, ambiguity, ownership, impact, influence and helping others, each with numbers and a lesson. Then I build a matrix per company: columns are its values or signals, and I tick only what my actions show. I pick a lead and backup story per column and look for gaps. One bank, different selections and openings per company.</p>', ['How many stories are enough?', 'How do you fill a gap honestly?']);
iv('Is it acceptable to use AI to prepare for behavioral interviews?', 'B', '<p>Yes, as a practice partner: generating follow-up questions, playing a bar raiser, checking whether I said "I" enough, summarising a company\'s public values. It is not acceptable to have it invent stories or numbers, or to read AI-written answers during a live interview, which most companies prohibit. Interviewers increasingly probe deeply because polished generic answers are common, so real detail matters more.</p>', ['How have you used AI tools at work?', 'What did AI get wrong when you used it?']);
iv('An interviewer says "Do you have a different example?" What is happening and what do you do?', 'A', '<p>It usually means my first story did not give the signal they need: maybe the scope was small, it did not show my personal action, or it did not match the value they own. I would briefly ask what would be most useful (bigger scope, a failure, a cross-team case) and switch to my backup from the matrix, opening with a headline. I would not defend the first story or repeat it.</p>', ['How do you choose backups?', 'What if you have no other example?']);
iv('How should a senior candidate\'s company-specific prep differ from a new grad\'s?', 'A', '<p>A new grad can use internship, class and personal projects and focus on learning, ownership of their own work and collaboration. A senior candidate must show scope matching the level: cross-team influence, technical strategy, mentoring and measurable org-level impact, because companies like Meta and Amazon use behavioral rounds to calibrate level. Both need honest failures, but seniors should show how they changed systems, not just their own habits.</p>', ['How do you avoid being down-levelled?', 'What counts as org-level impact?']);

registerModule({
  langExplain: `<p><b>About the code here.</b> This module has no programming code: behavioral rounds do not depend on a language. Practice problems use a weak answer as the "brute force" and a strong model answer as the solution, and the visualizers build tables you can edit with your own stories.</p>`,
  id: 'beh07',
  title: 'Company-Specific Prep: Amazon, Google, Meta & More',
  intro: `<p>Your story bank from earlier modules is the raw material; this module shows how each major company actually uses behavioral interviews and how to tailor the same true stories for each. You will learn Amazon's 16 Leadership Principles and the bar raiser, Google's four hiring attributes and the Googleyness and Leadership round, Meta's behavioral ("jedi") round and how it calibrates level, Microsoft's growth-mindset loop, Apple's team-driven deep dives, Netflix's culture memo, Indian product-company hiring manager rounds and startup founder chats. Formats change often, so details are phrased as commonly reported; always confirm with your recruiter.</p>`,
  goals: ['Explain how Amazon, Google, Meta, Microsoft, Apple and Netflix structure behavioral evaluation', 'Build a company x story matrix with a lead and backup story per value', 'Research a team in under three hours and turn it into a "why us" answer and good questions', 'Tailor one true story to different companies by changing the headline and the expanded beat', 'Match story scope to the level you are targeting so you are not down-levelled'],
  prereqs: `<p>Finish <b>beh02</b> (Behavioral Bank I) and <b>beh03</b> (Behavioral Bank II) first: you need a STAR story bank of 8-10 real stories. beh05 helps for senior and staff candidates.</p>`,
  hours: 7,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
