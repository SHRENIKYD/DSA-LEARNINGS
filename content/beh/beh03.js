(function () {
var topics = [], practice = [], quiz = [], interview = [];

// helper: build a behavioral practice problem (weak answer = brute, strong STAR = solution.approach)
function bp(title, level, tags, prompt, weak, weakWhy, strong, rubric, hints, mcq) {
  return {
    title: title, level: level, tags: tags, companies: ['Amazon', 'Google', 'Microsoft'],
    statement: '<p>Interviewer asks: <b>"' + prompt + '"</b></p><p>Draft your own STAR answer first (about 2 minutes spoken), then compare with the model below.</p>',
    constraints: 'Use a real story from your own life. Names here are fictional. Aim for 2 minutes, about 300 spoken words. Use "I" for your actions and "we" only for team results.',
    example: '<p><b>Weak opening:</b> ' + weak + '</p><p>' + H.c('r', weakWhy) + '</p>',
    brute: { why: '<p>' + weak + '</p><p>' + H.c('r', 'Why it fails: ') + weakWhy + '</p>', code: { lang: 'text', code: weak, check: false } },
    mcq: mcq,
    hints: hints,
    solution: {
      approach: strong + '<h5>Rubric (what the interviewer scores)</h5><ul>' + rubric.map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ul>',
      complexity: '<p>Length: about 2 minutes. Split roughly: Situation 15%, Task 10%, Action 50%, Result 20%, Learning 5%.</p>',
      followUps: ['What would you do differently?', 'What was the hardest moment and how did you handle it?']
    }
  };
}

// ---------- TOPIC 1: Leadership without authority ----------
topics.push({
  title: 'Leadership Without Authority (Influence)',
  analogy: '<p>Think of being the person on a group trip who says "let us take the train, it is cheaper and faster" - and you are not the trip organizer. Nobody has to listen to you. The trip changes only if you bring facts, listen to worries, and make the train feel like <i>their</i> idea. That is leadership without a title.</p>',
  explain: '<p><b>The plain idea:</b> You have no power to order anyone. You still got a result that needed many people to change what they do. Interviewers want to see that you can move people with <b>facts, trust and small wins</b> instead of rank.</p>' +
    '<p>A simple recipe you can reuse:</p><ol><li><b>Find the pain</b> - what does each person lose if nothing changes?</li><li><b>Map the people</b> - who decides, who is affected, who will block you?</li><li><b>Make it cheap to say yes</b> - a small pilot, a one-page doc, a demo.</li><li><b>Build proof</b> - show numbers from the pilot.</li><li><b>Give credit away</b> - so others own the win.</li></ol>' +
    H.table(['Move', 'Weak version', 'Strong version'], [
      ['Start', '"I told the team to do it."', '"I asked 3 people what hurt most."'],
      ['Convince', '"I escalated to my boss."', '"I ran a 1-week pilot and shared numbers."'],
      ['Block', '"They were just stubborn."', '"I found out their real fear was on-call load."'],
      ['End', '"Everyone agreed."', '"Defects fell 30%; two other teams copied it."']]) +
    '<p>Remember: influence is <b>earned before you need it</b>. Helping people on small things builds the trust you spend later.</p>',
  clues: ['"Tell me about a time you led without being the manager"', '"Influenced a team that did not report to you"', '"Convinced someone to change their mind / adopt your idea"', '"Got buy-in from multiple stakeholders"', '"Drove a cross-team initiative"', 'Seniority hint: SDE II and above are expected to show this'],
  viz: {
    title: 'Influence map: you, peers, stakeholders',
    input: 'Adopt a shared release checklist',
    inputLabel: 'Your proposal (short phrase)',
    gen: function (input) {
      var goal = String(input || '').trim();
      if (!goal) throw new Error('Type a short proposal, e.g. "Adopt a shared release checklist"');
      goal = H.esc(goal.slice(0, 40));
      var nodes = [
        { id: 'you', label: 'You', x: 8, y: 30, shape: 'box', w: 12 },
        { id: 'p1', label: 'Peer: Dev Mia', x: 34, y: 10, shape: 'box', w: 20 },
        { id: 'p2', label: 'Peer: QA Raj', x: 34, y: 30, shape: 'box', w: 20 },
        { id: 'sk', label: 'Skeptic: Ops Lee', x: 34, y: 50, shape: 'box', w: 22 },
        { id: 'pm', label: 'Stakeholder: PM Ana', x: 64, y: 20, shape: 'box', w: 24 },
        { id: 'sp', label: 'Sponsor: Director', x: 64, y: 45, shape: 'box', w: 24 },
        { id: 'dec', label: 'Team adopts it', x: 90, y: 30, shape: 'box', w: 16 }
      ];
      var edges = [['you', 'p1'], ['you', 'p2'], ['you', 'sk'], ['p1', 'pm'], ['p2', 'pm'], ['sk', 'sp'], ['pm', 'dec'], ['sp', 'dec']];
      function f(narr, hl, ehl, tags) { return { narr: narr, parts: [{ type: 'graph', label: 'Influence map for: ' + goal, directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }] }; }
      return [
        f('Goal: <b>' + goal + '</b>. You are the dot on the left with <b>no authority</b>. Everyone on the map can say no.', { you: 'cur' }),
        f('Step 1 - <b>listen to peers first</b>. Ask Mia and Raj what hurts today. You gain allies and real pain points.', { you: 'cur', p1: 'ok', p2: 'ok' }, { 'you-p1': 'ok', 'you-p2': 'ok' }, { p1: 'ally', p2: 'ally' }),
        f('Step 2 - <b>meet the skeptic</b>. Ops Lee fears extra on-call work. Ask, do not argue. Their fear becomes a requirement in your plan.', { you: 'cur', p1: 'ok', p2: 'ok', sk: 'bad' }, { 'you-sk': 'cur' }, { sk: 'worried about on-call' }),
        f('Step 3 - <b>run a small pilot</b> with your allies for one week. A cheap yes is easier than a big yes.', { p1: 'win', p2: 'win', you: 'cur' }, { 'you-p1': 'ok', 'you-p2': 'ok' }, { you: 'pilot' }),
        f('Step 4 - <b>bring numbers</b> to the PM through the peers who saw it work: "3 fewer rollbacks this week".', { p1: 'ok', p2: 'ok', pm: 'cur' }, { 'p1-pm': 'ok', 'p2-pm': 'ok' }, { pm: 'sees data' }),
        f('Step 5 - <b>turn the skeptic</b>: their on-call fear was addressed in the checklist, so they now tell the Director it is fine.', { sk: 'ok', sp: 'cur' }, { 'sk-sp': 'ok' }, { sk: 'converted', sp: 'hears it from Lee' }),
        f('Result - PM and Director both support it, the team adopts it. <b>Give credit away</b>: Mia presents it, you stay in the background. Nobody was ordered.', { pm: 'sel', sp: 'sel', dec: 'sel' }, { 'pm-dec': 'ok', 'sp-dec': 'ok' }, { dec: 'adopted' })
      ];
    }
  },
  examples: [
    { title: 'Example: shared checklist across three teams', html: '<p><b>S/T:</b> Releases from three teams kept breaking each other, and I was a mid-level dev with no authority. <b>A:</b> I interviewed 6 people, drafted a one-page checklist, piloted with two friendly teams for a week, and tracked rollbacks. I addressed the Ops team on-call fear by adding an automatic rollback step. <b>R:</b> Rollbacks dropped from 9 to 3 per month and the Director made it standard.</p>' },
    { title: 'Example: convincing a senior engineer', html: '<p>Senior engineer Priya preferred her own logging tool. I did not argue. I wrote a tiny script that showed both tools answering the same incident. She saw the time difference herself and asked <i>me</i> to roll it out. <b>Lesson:</b> let evidence change minds, not volume.</p>' },
    { title: 'Example: a story that fails', html: '<p>"I noticed the team had no tests, so I sent an email to everyone saying we must write tests. Some did." There is no listening, no pilot, no number. It sounds like complaining, not leading.</p>' }
  ],
  deepDive: '<p><b>Sources of influence (use several):</b> expertise (people trust what you know), relationships (you helped them before), data (hard to argue with), shared goals (you link to <i>their</i> metric), and sponsorship (a senior person backs you). Rank alone is the weakest source, which is why this question exists.</p>' +
    '<p><b>Stakeholder types:</b> champion (wants it), neutral, skeptic (will block unless heard), and decider (signs off). Strong stories name at least one skeptic and show what you did about them. Skipping the skeptic is a common reason answers sound too easy.</p>' +
    '<p><b>Common traps:</b> using escalation as the first step (it burns trust), claiming "everyone agreed" without proof, and taking all the credit. Also watch for the opposite - stories where you only "supported" and never led. The interviewer must see <b>you</b> starting the movement.</p>' +
    '<p><b>Senior levels:</b> at staff level and above the scope grows - influencing other orgs, setting technical direction, and creating mechanisms (a template, a review process) that keep working after you leave.</p>',
  aiEra: '<p><b>What AI changes:</b> Anyone can now draft a persuasive doc in minutes, so a polished doc is no longer proof of influence. What counts is that real people changed behaviour.</p>' +
    '<p><b>Use AI as a partner:</b> Ask it to play the skeptic: <code>Act as an Ops lead worried about on-call load. Poke holes in my release checklist proposal.</code> Use it to prepare data summaries and a one-page brief.</p>' +
    '<p><b>Where AI goes wrong:</b> It invents tidy numbers and writes stories where everyone agrees quickly. Real stories have friction. Interviewers also smell scripted answers.</p>' +
    '<p><b>What you must still own:</b> the relationships, the honest listening, and the true facts. New angle for 2026: stories about getting a team to adopt an AI coding tool safely (guardrails, review rules) are popular and fresh.</p>',
  problems: [bp('Influenced without authority: shared checklist', 'Medium', ['influence', 'peers'],
    'Tell me about a time you influenced a team that did not report to you.',
    '"I told the other teams they should use my checklist and my manager backed me up, so they did."',
    'Uses rank, no listening, no skeptic, no numbers.',
    '<p><b>S:</b> Three teams shipped to one platform and kept breaking each other, about 9 rollbacks a month. <b>T:</b> I owned none of those teams, but I wanted fewer rollbacks. <b>A:</b> I interviewed six engineers to learn their pain, drafted a one-page checklist, and piloted it with two friendly teams for a week. The Ops lead worried about extra on-call work, so I added an automatic rollback step he asked for. I shared pilot numbers with the PM. <b>R:</b> Rollbacks fell to 3 a month, the Director made it standard, and two teams asked to co-own it. <b>L:</b> People support what they helped shape.</p>',
    ['Names a real skeptic and what you did about them', 'Starts with listening, not telling', 'Small pilot and a number', 'Credit shared, scope clear (I vs we)'],
    ['Hint 1: Pick a story where you had no power to order anyone, so influence is the only tool you used.', 'Hint 2: include one person who resisted and how you learned their real worry.', 'Hint 3: End with a number such as rollbacks per month, and say what continued after you moved on.'],
    { q: 'Best first step when you need buy-in from a team you do not manage?', options: ['Escalate to your manager', 'Ask what hurts them today', 'Send a company-wide email', 'Wait for a mandate'], answer: 1, explain: 'Listening first finds shared pain and builds allies.' })]
});

// ---------- TOPIC 2: Ownership ----------
topics.push({
  title: 'Ownership: Going Beyond Your Role',
  analogy: '<p>Picture a guest at a friend\'s party who sees a spilled drink and wipes it up without being asked, instead of walking around it. Not their house, not their job - but the party gets better. Ownership means treating the whole outcome as yours, not just your assigned corner.</p>',
  explain: '<p><b>The plain idea:</b> Owners care about the <b>result</b>, not just their task list. They fix what is broken even when it is not theirs, follow a problem to the end, and never say "not my job".</p>' +
    '<p><b>Two kinds of ownership stories:</b></p><ul><li><b>Fixing what is not yours</b> - a broken build, a missing runbook, a flaky dashboard everyone ignores.</li><li><b>Following through</b> - you shipped, then watched the metrics, then fixed the follow-up bug.</li></ul>' +
    '<p><b>Do not confuse ownership with heroics.</b> Working all night alone is not ownership - fixing the cause so nobody needs to work all night is. Also owners tell the real owner: "I fixed it and wrote down what happened."</p>' +
    H.table(['Signal', 'Owner says', 'Non-owner says'], [
      ['Bug in another team\'s code', '"I made a small fix and opened a PR for them."', '"I filed a ticket and moved on."'],
      ['Launch done', '"I watched error rates for 2 weeks."', '"Shipped, so I am done."'],
      ['Mistake', '"My change caused it. Here is the fix."', '"The spec was unclear."'],
      ['Gap', '"Nobody owns on-call docs, so I wrote them."', '"That is not in my scope."']]) +
    '<p>Good stories end with a <b>lasting fix</b> (an alert, a test, a doc) so the problem does not return.</p>',
  clues: ['"Tell me about a time you went above and beyond"', '"Took on something outside your job description"', '"Saw a problem nobody was solving"', '"Took responsibility for a mistake or a failure"', '"Fixed something that was not yours"', '"Long-term thinking vs quick fix"'],
  viz: {
    title: 'Weak vs strong ownership answer',
    input: 'Nightly report kept failing',
    inputLabel: 'The problem you noticed',
    gen: function (input) {
      var p = String(input || '').trim();
      if (!p) throw new Error('Type the problem you noticed, e.g. "Nightly report kept failing"');
      p = H.esc(p.slice(0, 50));
      var cols = ['Part', 'Weak answer', 'Strong answer'];
      var all = [
        ['Situation', 'I noticed: ' + p + '. It was the data team\'s job.', 'I noticed: ' + p + '. Sales used it every morning and nobody owned it.'],
        ['Task', '(missing)', 'I decided to find the root cause, although it was not my team\'s system.'],
        ['Action', 'I filed a ticket and waited.', 'I read the logs, found a timeout, told the data team, fixed it with their review, added an alert.'],
        ['Result', 'Still failing weeks later.', 'Zero failures in 3 months; 20 min saved daily for sales.'],
        ['Learning', '(missing)', 'I now write a runbook with every fix.']
      ];
      var frames = [], rows = [], hl;
      frames.push({ narr: 'Same starting problem: <b>' + p + '</b>. Two possible answers. We build both side by side.', parts: [{ type: 'table', label: 'STAR comparison', columns: cols, rows: [], hl: {} }] });
      for (var i = 0; i < all.length; i++) {
        rows.push(all[i]); hl = {};
        var msg = i === 0 ? 'Situation: the strong one names <b>who is hurt</b> by the problem.' : i === 1 ? 'Task: the weak answer skips it. The strong one says <b>why you chose to own it</b>.' : i === 2 ? 'Action - the heart of the answer. Strong = <b>specific steps in "I" voice</b> plus telling the real owner.' : i === 3 ? 'Result: the strong one has numbers and a lasting effect.' : 'Learning: shows growth and a lasting mechanism.';
        hl[i] = (i === 0 ? 'ok' : 'ok');
        frames.push({ narr: msg, parts: [{ type: 'table', label: 'STAR comparison', columns: cols, rows: rows.map(function (r) { return r.slice(); }), hl: hl }] });
      }
      var bad = {}; bad[1] = 'bad'; bad[2] = 'bad'; bad[3] = 'bad';
      frames.push({ narr: 'Weak rows highlighted red: <span class="c-r">no task, no action by you, no result</span>. The strong version wins on all three.', parts: [{ type: 'table', label: 'Where the weak answer breaks', columns: cols, rows: all, hl: bad }] });
      return frames;
    }
  },
  examples: [
    { title: 'Example: fixing a broken dashboard', html: '<p>Our team\'s deploy dashboard showed wrong numbers for months and everyone shrugged. I traced it to a timezone bug in another team\'s service, sent them a tested fix, and added a test. Leadership now trusts the numbers when deciding on releases.</p>' },
    { title: 'Example: owning a mistake', html: '<p>My migration script deleted 400 test accounts that sales was using. I told my manager within ten minutes, restored from backup in an hour, wrote a post-incident note, and added a dry-run flag to every script. The key: <b>fast honesty + permanent fix</b>.</p>' },
    { title: 'Example: ownership that goes too far', html: '<p>Rewriting another team\'s service over a weekend without telling them is not ownership; it is a risk. Strong owners <b>tell the real owner</b>, keep changes small, and get review.</p>' }
  ],
  deepDive: '<p><b>The ownership ladder:</b> (1) do your task, (2) make sure it works in production, (3) fix adjacent problems, (4) prevent the whole class of problem, (5) teach others to do the same. Senior stories sit on rungs 4-5.</p>' +
    '<p><b>Short-term vs long-term:</b> A common follow-up is "did you take a shortcut?" Strong answers say when a quick patch was right (outage) and that you scheduled the real fix.</p>' +
    '<p><b>Boundaries:</b> Interviewers also test whether you respect other owners. Mention asking permission, pairing with the owner, or handing the fix back. Silent takeovers are a red flag in many teams.</p>' +
    '<p><b>Blameless culture:</b> Owning a mistake does not mean self-punishment. State facts, impact, fix, prevention. Never blame a person or a vague "process".</p>' +
    '<p><b>Red flags:</b> "that was not my area", only heroics with no prevention, hiding a mistake until it was found, and a result without any metric.</p>',
  aiEra: '<p><b>What AI changes:</b> Small ownership tasks (writing a runbook, adding a test, drafting a migration script) are now cheap. So "I wrote docs" alone is a weak story; "I fixed the root cause" stays strong.</p>' +
    '<p><b>Use AI as a partner:</b> Have it draft post-incident notes from your timeline, generate test cases for the bug, and review your fix for side effects. <code>Here is my incident timeline. Write a blameless summary with root cause and prevention.</code></p>' +
    '<p><b>Where AI goes wrong:</b> If you ship AI-written code you do not understand, ownership is hollow. When it breaks, you still own it. Owning also includes checking AI output for security and licence issues.</p>' +
    '<p><b>What you must still own:</b> the decision to care, the honest message to stakeholders, and the follow-through. A fresh 2026 story type: you noticed an AI feature giving wrong answers and built an evaluation set and alert nobody asked for.</p>',
  problems: [bp('Fixed something that was not yours', 'Easy', ['ownership'],
    'Tell me about a time you took ownership of something outside your job.',
    '"Our reports were slow so I rewrote the whole data service on a weekend."',
    'No consent from the owner, no result, risky solo heroics.',
    '<p><b>S:</b> Sales relied on a nightly report that failed about twice a week; the data team was swamped. <b>T:</b> It was not my system, but I did not want sales to start the day blind. <b>A:</b> I read the logs, found a timeout, and messaged the data team lead with my finding. With their agreement I opened a small PR raising the timeout and adding a retry, then an alert. <b>R:</b> Zero failures in the next three months; sales saved about 20 minutes a day. <b>L:</b> I wrote a short runbook so anyone can handle the next failure.</p>',
    ['Cares about outcome, not job title', 'Tells and involves the real owner', 'Lasting prevention (alert, test, doc)', 'Measured result'],
    ['Hint 1: pick a problem people complained about but nobody fixed.', 'Hint 2: Show how you involved the real owner, by asking permission or handing the fix over for review.', 'Hint 3: Close with prevention: what you changed so the problem does not return for the next person.'],
    { q: 'Which is the strongest sign of ownership?', options: ['Working all night alone', 'Fixing the root cause and preventing a repeat', 'Filing a ticket quickly', 'Doing exactly your task list'], answer: 1, explain: 'Owners remove the problem class, not just the symptom.' })]
});

// ---------- TOPIC 3: Ambiguity ----------
topics.push({
  title: 'Dealing with Ambiguity: Progress with Incomplete Info',
  analogy: '<p>Driving at night in fog: you cannot see the whole road, but you do not stop. You go slowly, watch the nearest lines, and adjust. Ambiguity means moving with the light you have and checking often, not waiting for perfect sight.</p>',
  explain: '<p><b>The plain idea:</b> Requirements were vague or changing. The weak move is to wait or to guess in silence. The strong move is a loop: <b>name the unknowns -> write assumptions -> run cheap experiments -> decide -> tell people -> revisit</b>.</p>' +
    H.table(['Step', 'What you do', 'Example'], [
      ['1. Name unknowns', 'List what you do not know', '"Who is the user? How many?"'],
      ['2. Assume', 'Write a best guess for each', '"About 10k users, mostly mobile"'],
      ['3. Experiment', 'Cheapest test to check the riskiest guess', '"Ask 5 users, or build a 2-day prototype"'],
      ['4. Decide', 'Pick a reversible path; set a checkpoint', '"Ship v1 in 2 weeks, review metrics"'],
      ['5. Communicate', 'Share assumptions so people can correct you', '"Here is what I am assuming - shout if wrong"']]) +
    '<p><b>Reversible vs one-way doors:</b> if a decision is easy to undo, decide fast with about 70% of the info. If it is hard to undo, collect more.</p>' +
    '<p>Strong answers show <b>comfort</b>, not panic: you asked good questions, did not wait for permission, and wrote things down.</p>',
  clues: ['"Tell me about a time requirements were unclear"', '"You had incomplete information and had to decide"', '"Handled a rapidly changing situation"', '"Worked on a project with no clear direction"', '"How do you make decisions with 70% of the data?"', 'Start-up or new-product team context'],
  viz: {
    title: 'Ambiguity -> assumptions -> experiments -> decision',
    input: 'Users unknown, Scale unknown, Deadline unclear',
    inputLabel: 'Unknowns (comma separated, up to 5)',
    gen: function (input) {
      var u = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      if (!u.length) throw new Error('Enter 1-5 unknowns separated by commas');
      u = u.slice(0, 5);
      var a = u.map(function (x) { return 'Assume: ' + x.replace(/unknown|unclear/i, 'X').slice(0, 24); });
      var e = u.map(function (x, i) { return 'Test #' + (i + 1) + ' (cheap)'; });
      function q(label, items, hl) { return { type: 'queue', label: label, items: items, hl: hl || {}, frontLabel: 'first', backLabel: 'last' }; }
      var frames = [];
      frames.push({ narr: 'The brief is foggy. These are the <b>unknowns</b> on the table. Waiting for all of them to disappear would take forever.', parts: [q('1. Unknowns', u, { 0: 'cur' })] });
      frames.push({ narr: 'Turn each unknown into a written <b>assumption</b>. A guess you can see is a guess you can test.', parts: [q('1. Unknowns', u, {}), q('2. Assumptions', a, { 0: 'win' })] });
      var rh = {}; rh[0] = 'bad';
      frames.push({ narr: 'Rank by risk: the assumption that would hurt most if wrong (marked red) is tested first.', parts: [q('2. Assumptions', a, rh)] });
      frames.push({ narr: 'Design the <b>cheapest experiment</b> for each: 5 user calls, a 2-day prototype, a quick log query.', parts: [q('2. Assumptions', a, rh), q('3. Experiments', e, { 0: 'cur' })] });
      var done = {}; e.forEach(function (_, i) { done[i] = 'ok'; });
      frames.push({ narr: 'Results come back in days, not weeks. Assumptions are confirmed or fixed. Everyone sees the notes.', parts: [q('3. Experiments', e, done)] });
      frames.push({ narr: 'Decide on a <b>reversible</b> first version and set a checkpoint date. Tell stakeholders the assumptions so they can object early.', parts: [q('4. Decision', ['Ship v1 small', 'Checkpoint in 2 weeks', 'Share assumptions doc'], { 0: 'sel', 1: 'sel', 2: 'sel' })] });
      return frames;
    }
  },
  examples: [
    { title: 'Example: vague "make search better"', html: '<p>The PM said only "search feels bad". I listed unknowns (what is bad? for whom?), pulled the last 2,000 queries, and found 18% returned zero results. I assumed spelling was the cause, ran a one-day typo-tolerance test, and zero-results fell to 7%. We shipped and set a review in two weeks.</p>' },
    { title: 'Example: new team, no spec', html: '<p>I joined a team with no docs. In week one I wrote a "what I think this system does" page and asked three people to correct it. Within days the page became the team\'s first overview and exposed two wrong assumptions.</p>' },
    { title: 'Example: wrong way to handle it', html: '<p>"The requirements were unclear so I waited until the PM finished the spec." Result: three lost weeks. Waiting is the clearest red flag for this question.</p>' }
  ],
  deepDive: '<p><b>Cynefin in plain words:</b> some problems are clear (follow the recipe), some complicated (experts can analyse), some complex (you must probe and learn), and some chaotic (act first). Ambiguity stories are usually complex: probe, sense, respond.</p>' +
    '<p><b>Reversibility test:</b> ask "if I am wrong, how costly and how fast can I undo it?" Cheap and fast: decide now. Costly and slow: invest in more data. Interviewers love hearing you apply this out loud.</p>' +
    '<p><b>Value of information:</b> before gathering data, ask if any answer would change your decision. If not, skip it. Analysis paralysis is a real failure mode; so is shipping on gut with no checkpoint.</p>' +
    '<p><b>Communication:</b> write the assumptions and send them. Silent assumptions become surprises. Also define success metrics early so you know when the guess was wrong.</p>' +
    '<p><b>Red flags:</b> waiting for orders, asking nobody, over-planning, pretending certainty, or never revisiting the decision.</p>',
  aiEra: '<p><b>What AI changes:</b> Cheap experiments got cheaper. A prototype or data query that took days can take an hour with an AI assistant, so interviewers expect faster loops.</p>' +
    '<p><b>Use AI as a partner:</b> Ask it to list missing questions in a vague brief: <code>Here is a one-line requirement. List 10 unknowns and which are riskiest.</code> Use it to summarise user feedback and propose test plans.</p>' +
    '<p><b>Where AI goes wrong:</b> It will confidently fill gaps with made-up facts. Treat its guesses as <i>assumptions to test</i>, never as findings. It also cannot tell you which stakeholder cares most.</p>' +
    '<p><b>What you must still own:</b> judging risk, choosing what to test, and being honest about uncertainty. In 2026, products with AI features are themselves ambiguous (model quality varies), so stories about setting evaluation metrics with fuzzy goals stand out.</p>',
  problems: [bp('Delivered with unclear requirements', 'Medium', ['ambiguity', 'decision-making'],
    'Tell me about a time you had to deliver with unclear or changing requirements.',
    '"The spec was vague so I waited for the PM to clarify, then built it."',
    'Passive, slow, and no sign of judgment.',
    '<p><b>S:</b> The PM asked me to "make search better" with a six-week window and no details. <b>T:</b> I needed a useful first release without a full spec. <b>A:</b> I listed unknowns, pulled 2,000 recent queries, and learned that 18% returned nothing. I wrote my assumption that typos were the cause and shared it with the PM for correction. A one-day prototype with typo tolerance dropped zero-result queries to 7%. I proposed a reversible v1 and a checkpoint in two weeks. <b>R:</b> We shipped on time, click-through rose 9%, and the PM adopted my assumptions doc for later features. <b>L:</b> Write assumptions down and test the riskiest first.</p>',
    ['Names unknowns and writes assumptions', 'Cheap experiment, not endless analysis', 'Reversible decision with a checkpoint', 'Communicates assumptions to stakeholders'],
    ['Hint 1: Choose a story with real vagueness, where nobody could tell you what done looked like.', 'Hint 2: Show the loop: name the unknowns, state assumptions, test the riskiest one, then decide.', 'Hint 3: Give a number for the outcome and one lesson about how you handle ambiguity now.'],
    { q: 'When a decision is easy to undo you should usually:', options: ['Wait for full data', 'Decide fast with partial info', 'Ask for a committee', 'Skip communicating'], answer: 1, explain: 'Reversible decisions favour speed.' })]
});

// ---------- TOPIC 4: Prioritization ----------
topics.push({
  title: 'Prioritization Under Competing Deadlines (and Saying No)',
  analogy: '<p>A waiter with five tables calling at once does not run randomly. They check: who is in trouble (the spilled soup), who is quick to help (a refill), who can wait (the dessert menu). Then they tell the waiting tables "I will be right with you". That is prioritizing and communicating.</p>',
  explain: '<p><b>The plain idea:</b> You cannot do everything. Show how you <b>choose</b>, how you <b>tell people</b>, and how you <b>say no kindly</b> with an alternative.</p>' +
    '<p><b>Impact / effort quadrant</b> (a simple 2x2):</p>' +
    H.table(['', 'Low effort', 'High effort'], [['<b>High impact</b>', '<span class="c-g">Do now (quick wins)</span>', '<span class="c-b">Plan it (big bets)</span>'], ['<b>Low impact</b>', '<span class="c-m">Fit in if free</span>', '<span class="c-r">Say no / drop</span>']]) +
    '<p><b>How to say no well:</b></p><ol><li>Show you understood the ask and why it matters to them.</li><li>Show the trade-off: "if we add this, X slips by 2 weeks".</li><li>Offer options: later, smaller version, or swap with something else.</li><li>Let them decide with the facts - or escalate the trade-off, not the conflict.</li></ol>' +
    '<p>Strong stories mention the <b>criteria</b> (customer impact, deadlines with real cost, risk, dependencies) and a number showing what you gained by focusing.</p>',
  clues: ['"Multiple deadlines at once - how did you prioritize?"', '"Tell me about a time you said no to a stakeholder"', '"Too much to do and not enough time"', '"Conflicting requests from two managers"', '"How do you decide what not to build?"', '"Trade-off between speed and quality"'],
  code: { lang: 'python', title: 'Impact / effort prioritizer (runnable)', run: true, code:
`# A tiny prioritizer: score = impact / effort, then sort into quadrants.
# Items are (name, impact 1-10, effort 1-10, hard_deadline_days or None)
items = [
    ("Fix checkout crash", 9, 2, 1),
    ("Dark mode", 4, 5, None),
    ("Rewrite billing service", 9, 9, 60),
    ("Rename internal variables", 2, 3, None),
    ("Add export to CSV for big customer", 7, 3, 10),
    ("New onboarding tour", 5, 7, None),
]

def quadrant(impact, effort):
    hi_i = impact >= 6
    lo_e = effort <= 4
    if hi_i and lo_e:
        return "DO NOW"
    if hi_i and not lo_e:
        return "PLAN"
    if not hi_i and lo_e:
        return "FILL-IN"
    return "SAY NO"

def urgency_bonus(deadline):
    # a real deadline within 14 days adds a bonus
    if deadline is not None and deadline <= 14:
        return 1.5
    return 0.0

rows = []
for name, impact, effort, deadline in items:
    score = impact / effort + urgency_bonus(deadline)
    rows.append((score, name, quadrant(impact, effort), deadline))

rows.sort(reverse=True)
print("Rank  Score  Quadrant  Item")
for rank, (score, name, quad, dl) in enumerate(rows, 1):
    note = "  (deadline in %d days)" % dl if dl is not None else ""
    print("%-5d %-6.2f %-9s %s%s" % (rank, score, quad, name, note))

print()
print("Say-no list:", [r[1] for r in rows if r[2] == "SAY NO"])
print("Script: 'I can do the CSV export by Friday if we pause the tour. Which matters more?'")
` },
  viz: {
    title: 'Impact / effort quadrant',
    input: 'Fix checkout crash:9:2, CSV export:7:3, Billing rewrite:9:9, Dark mode:4:5, Rename vars:2:3',
    inputLabel: 'name:impact:effort (1-10), comma separated',
    gen: function (input) {
      var items = String(input || '').split(',').map(function (s) {
        var p = s.trim().split(':'); return { n: (p[0] || '').trim(), i: Number(p[1]), e: Number(p[2]) };
      }).filter(function (x) { return x.n; });
      if (!items.length || items.length > 8 || items.some(function (x) { return !(x.i >= 1 && x.i <= 10 && x.e >= 1 && x.e <= 10); })) throw new Error('Format: name:impact:effort (numbers 1-10), up to 8 items');
      var cells = [['', ''], ['', '']];
      function pos(x) { return [x.i >= 6 ? 0 : 1, x.e <= 4 ? 0 : 1]; }
      function render(hl) {
        return { type: 'grid', label: 'Rows: impact. Columns: effort', rowHead: ['High impact', 'Low impact'], colHead: ['Low effort', 'High effort'], rows: cells.map(function (r) { return r.slice(); }), hl: hl || {} };
      }
      var frames = [{ narr: 'Empty 2x2. Every task goes in by <b>impact</b> (rows) and <b>effort</b> (columns). A list of ' + items.length + ' tasks is waiting.', parts: [render()] }];
      items.forEach(function (x) {
        var p = pos(x); var c = cells[p[0]][p[1]];
        cells[p[0]][p[1]] = c ? c + ' | ' + x.n : x.n;
        var h = {}; h[p[0] + ',' + p[1]] = 'cur';
        frames.push({ narr: 'Place <b>' + H.esc(x.n) + '</b> (impact ' + x.i + ', effort ' + x.e + ') into <b>' + (p[0] ? 'low' : 'high') + ' impact / ' + (p[1] ? 'high' : 'low') + ' effort</b>.', parts: [render(h)] });
      });
      var h2 = {}; h2['0,0'] = 'sel'; h2['0,1'] = 'ok'; h2['1,1'] = 'bad';
      frames.push({ narr: 'Decide: <span class="c-p">purple = do now</span>, green = plan with a date, <span class="c-r">red = say no or drop</span>. Low-impact/low-effort items fill spare time.', parts: [render(h2)] });
      frames.push({ narr: 'Communicate: tell owners of the red items <b>what you are not doing, why, and what would change your mind</b>. Saying no with a reason keeps trust.', parts: [render(h2), { type: 'text', html: '<b>Script:</b> "I can ship the first item by Friday if we pause the red ones. Which matters more to you?"' }] });
      return frames;
    }
  },
  examples: [
    { title: 'Example: two managers, two urgent asks', html: '<p>Maya (my manager) and Tom (a lead) each wanted a feature by the same Friday. I wrote both asks, effort, and customer impact on one page and invited them together. They agreed one could slip a week. I did not pick a side; I made the trade-off visible.</p>' },
    { title: 'Example: saying no to a stakeholder', html: '<p>Sales wanted a custom report for one prospect that would take three weeks. I showed it would delay a feature used by 4,000 customers. I offered a 2-day CSV export instead. They accepted, and we kept the roadmap.</p>' },
    { title: 'Example: wrong way', html: '<p>"I worked nights and did everything." That is not prioritization; it shows no choice and risks burnout. Interviewers want to hear what you <b>did not</b> do.</p>' }
  ],
  deepDive: '<p><b>Frameworks in one line:</b> RICE (reach x impact x confidence / effort), MoSCoW (must/should/could/won\'t), Eisenhower (urgent vs important), cost of delay (how much money or trust is lost per week of waiting). Pick one and explain <i>why</i> it fit.</p>' +
    '<p><b>Urgent is not important:</b> a loud request is not automatically valuable. Strong answers separate real deadlines (a contract date, a legal rule) from imagined ones.</p>' +
    '<p><b>Dependencies and risk:</b> sometimes a low-impact item goes first because it unblocks three teams. Mention critical path.</p>' +
    '<p><b>Saying no at senior levels:</b> you say no to <i>work</i>, not to <i>people</i>. "Not now, because X. Here is when/how we could." Escalate with options, not complaints.</p>' +
    '<p><b>Red flags:</b> yes to everything, burnout as a badge of honour, hiding slipping deadlines until the last day, and using only your own opinion without involving the owners of the work.</p>',
  aiEra: '<p><b>What AI changes:</b> Building is faster, so stakeholders ask for more. Prioritization matters more, not less: cheap code still has review, test and maintenance cost.</p>' +
    '<p><b>Use AI as a partner:</b> Paste your backlog and ask for RICE scores with stated assumptions, then <i>edit</i> them. Ask it to draft a polite no with options.</p>' +
    '<p><b>Where AI goes wrong:</b> It ranks by the numbers you give, and those are often wrong. It does not know office politics, hidden dependencies, or customer relationships.</p>' +
    '<p><b>What you must still own:</b> choosing criteria, owning the trade-off, and having the conversation. A 2026 twist: "AI can build it in a day" is not a reason to build it - the real cost is support and maintenance.</p>',
  problems: [bp('Had to say no to a stakeholder', 'Medium', ['prioritization', 'stakeholders'],
    'Tell me about a time you had to say no to a stakeholder.',
    '"My manager gave me too much so I told sales I was busy and could not do it."',
    'A bare no with no reason, no option, no impact.',
    '<p><b>S:</b> Sales asked for a custom report for one prospect, about three weeks of work, while we were finishing a feature used by 4,000 customers. <b>T:</b> Protect the roadmap without hurting the deal. <b>A:</b> I wrote down the effort and what would slip, met the sales lead, and said I understood the deal was important. I offered a two-day CSV export covering 80% of what the prospect needed, and a date for a proper report if the deal closed. <b>R:</b> Sales accepted, the prospect signed, the feature shipped on time, and the full report was scheduled next quarter. <b>L:</b> Say no to the task, offer a yes to the need.</p>',
    ['Understands the stakeholder\'s goal', 'Shows the trade-off with facts', 'Offers an alternative', 'Relationship intact afterwards'],
    ['Hint 1: Pick a no that was right for the product or customer, not a no that was just lazy.', 'Hint 2: Include the alternative you offered, such as a smaller scope, a later date or another route.', 'Hint 3: Say how the relationship with the stakeholder was afterwards, and what they did next.'],
    { q: 'A good "no" includes:', options: ['An apology only', 'The trade-off and an alternative', 'Silence', 'Blaming your manager'], answer: 1, explain: 'Trade-off plus an option keeps trust.' })]
});

// ---------- TOPIC 5: Customer obsession ----------
topics.push({
  title: 'Customer Obsession',
  analogy: '<p>A great neighbourhood baker notices that a regular customer buys a loaf every morning but skipped it today, and asks if everything is okay. They start from the customer\'s day, not from the oven. Customer obsession means working backwards from what the person needs, even when they never ask.</p>',
  explain: '<p><b>The plain idea:</b> You make decisions by starting from the <b>customer\'s need</b> and working backwards to the solution. "Customer" can be an external user, or an internal team that uses your work.</p>' +
    '<p><b>Four habits to show:</b></p><ul><li><b>Listen</b> - support tickets, calls, reviews, usage data.</li><li><b>Understand the real problem</b> - the stated ask is often not the need.</li><li><b>Act when it costs you</b> - choose the customer\'s long-term trust over a short-term metric.</li><li><b>Close the loop</b> - tell the customer what you did; measure that their life got better.</li></ul>' +
    H.table(['Weak', 'Strong'], [['"Customers asked, so we built it."', '"Customers asked for X, but watching them showed the real problem was Y."'], ['"Satisfaction went up."', '"Support tickets fell 35% and renewals rose."'], ['"I followed the process."', '"The process would have delayed the fix for a customer, so I got an exception and fixed the process later."']]) +
    '<p>Careful: obsession is not "the customer is always right". Sometimes the customer asks for the wrong thing; you listen, then solve the <b>need</b>.</p>',
  clues: ['"Tell me about a time you went above and beyond for a customer"', '"A time you used customer feedback to change something"', '"Customer wanted something you could not give"', '"Put the customer first even when it was hard"', '"How do you know what customers want?"', 'Internal customers count: other teams, support, finance'],
  viz: {
    title: 'Working backwards from the customer',
    input: 'Customers cannot find invoices',
    inputLabel: 'Customer problem',
    gen: function (input) {
      var pr = String(input || '').trim();
      if (!pr) throw new Error('Type a customer problem, e.g. "Customers cannot find invoices"');
      pr = H.esc(pr.slice(0, 40));
      var nodes = [
        { id: 'c', label: 'Customer voice', x: 10, y: 30, shape: 'box', w: 18 },
        { id: 'i', label: 'Real need', x: 36, y: 30, shape: 'box', w: 16 },
        { id: 'o', label: 'Options', x: 60, y: 30, shape: 'box', w: 14 },
        { id: 'f', label: 'Fix shipped', x: 82, y: 12, shape: 'box', w: 16 },
        { id: 'm', label: 'Measure + tell customer', x: 82, y: 48, shape: 'box', w: 26 }
      ];
      var edges = [['c', 'i'], ['i', 'o'], ['o', 'f'], ['f', 'm'], ['m', 'c']];
      function f(n, hl, ehl, tags) { return { narr: n, parts: [{ type: 'graph', label: 'Problem: ' + pr, directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }] }; }
      return [
        f('Start from the customer, not from your backlog: <b>' + pr + '</b>.', { c: 'cur' }, {}, { c: 'tickets + calls' }),
        f('Dig for the <b>real need</b> - ask "what are you trying to do?" The stated ask is often only a symptom.', { c: 'ok', i: 'cur' }, { 'c-i': 'cur' }, { i: 'what they are trying to do' }),
        f('List <b>options</b> including the small, fast ones. Pick what solves the need soonest.', { i: 'ok', o: 'cur' }, { 'i-o': 'cur' }),
        f('Ship the fix. Customer obsession often means doing it <b>even when it costs you</b> (extra work, a refund, a delay).', { o: 'ok', f: 'sel' }, { 'o-f': 'ok' }),
        f('Measure outcomes (tickets, renewals, time saved) and <b>tell the customer</b> what changed.', { f: 'ok', m: 'sel' }, { 'f-m': 'ok' }),
        f('The loop closes: the customer sees you listened, and gives better feedback next time.', { m: 'ok', c: 'cur' }, { 'm-c': 'ok' }, { c: 'trust grows' })
      ];
    }
  },
  examples: [
    { title: 'Example: the invoice problem', html: '<p>Customers wrote "please send invoices by email". Watching three sessions showed they could not find the download button. I moved the button, then emailed the three customers. Tickets about invoices fell 60% with no new email feature.</p>' },
    { title: 'Example: choosing trust over a metric', html: '<p>A promo would have raised sign-ups, but the fine print would confuse older users. I argued to simplify the terms. Sign-ups were 5% lower that week, but refunds and complaints dropped by half.</p>' },
    { title: 'Example: internal customer', html: '<p>The support team was my customer. I sat with them for a day, saw they copied data between three tools, and built a one-page view. Handling time dropped from 9 to 6 minutes.</p>' }
  ],
  deepDive: '<p><b>Working backwards:</b> a popular habit is to write the press release and FAQ for the finished feature <i>before</i> building it. If the customer benefit cannot be stated in plain words, the idea is not ready.</p>' +
    '<p><b>Voice of customer vs behaviour:</b> what customers say and what they do differ. Mix interviews with usage data and support tickets. Strong answers use two sources.</p>' +
    '<p><b>Short-term vs long-term:</b> obsession is about long-term trust. A story where you gave up a small quick win for trust is gold.</p>' +
    '<p><b>Bounds:</b> You are not required to say yes to everything. Show how you sorted a customer request into "need", "want" and "noise". Also respect fairness: do not break rules or privacy for one customer.</p>' +
    '<p><b>Red flags:</b> "customer" never appears as a real person, no data about the effect, stories where you bypassed security or promised things you could not deliver, and heroics with no fix of the root cause.</p>',
  aiEra: '<p><b>What AI changes:</b> Customers now meet AI features and expect fast, correct, personal help. You can analyse thousands of reviews and tickets in minutes.</p>' +
    '<p><b>Use AI as a partner:</b> Cluster support tickets into themes, summarise call transcripts, and draft customer replies. <code>Group these 300 tickets into top 5 problems and give two quotes each.</code></p>' +
    '<p><b>Where AI goes wrong:</b> Summaries flatten the pain and may hallucinate quotes. Automated replies can feel cold or wrong at a sensitive moment. Privacy matters - do not paste customer data into tools that are not approved.</p>' +
    '<p><b>What you must still own:</b> talking to real customers, noticing the unspoken need, and choosing trust over a quick metric. A fresh 2026 story: you added a "talk to a human" path or a correction feature when an AI assistant gave wrong answers.</p>',
  problems: [bp('Went above and beyond for a customer', 'Easy', ['customer', 'ownership'],
    'Tell me about a time you went above and beyond for a customer.',
    '"A customer was angry, so I stayed late and answered all their emails."',
    'Effort without insight; no root cause; no measurable effect.',
    '<p><b>S:</b> A small business customer could not find their invoices and had written three times. <b>T:</b> Help them now and stop it happening to others. <b>A:</b> I called them, shared my screen, and saw they could not find the download button. I sent that day\'s invoices by hand, then moved the button and added a short label. I emailed them when it shipped. <b>R:</b> Invoice tickets fell 60% over two months, and the customer renewed for three years. <b>L:</b> Watch how people actually use the product.</p>',
    ['Real customer need discovered', 'Action cost something extra', 'Fixed root cause for many customers', 'Measured result and closed the loop'],
    ['Hint 1: Pick a real person with a real problem, and name what they were stuck on.', 'Hint 2: Show what you learned by watching or asking them, before you decided what to build or fix.', 'Hint 3: Say how many other customers benefited from your fix, not only the first one.'],
    { q: 'Customer obsession means:', options: ['Always saying yes', 'Working backwards from the customer need', 'Following the process strictly', 'Maximizing short-term metrics'], answer: 1, explain: 'Start from the need and work backwards.' })]
});

// ---------- TOPIC 6: Amazon LPs mapping ----------
topics.push({
  title: 'Mapping Stories to Amazon\'s Leadership Principles',
  analogy: '<p>Think of your stories as tools in a toolbox and the leadership principles as the jobs on a checklist. You do not want fifteen tools for one job. You want a small set of strong tools, each able to do two or three jobs, so you never walk in with an empty hand.</p>',
  explain: '<p><b>Why this matters:</b> Amazon interviews assign each interviewer a few principles to probe. You need stories that cover all of them without repeating the same one. Other big companies use similar value lists, so this skill transfers.</p>' +
    '<p><b>The principles in plain words (paraphrased, not official wording):</b></p>' + H.table(['Idea', 'In simple words'], [
      ['Customer Obsession', 'Start from what the customer needs and keep earning their trust'],
      ['Ownership', 'Act for the long term; never say "not my job"'],
      ['Invent and Simplify', 'Find new, simpler ways; do not copy blindly'],
      ['Are Right, A Lot', 'Good judgment, seek other views, change your mind when wrong'],
      ['Learn and Be Curious', 'Keep learning; explore new things'],
      ['Hire and Develop the Best', 'Raise the bar; coach others'],
      ['Insist on High Standards', 'Keep quality high even when it is uncomfortable'],
      ['Think Big', 'Aim for bold goals, not small tweaks'],
      ['Bias for Action', 'Speed matters; take calculated risks on reversible calls'],
      ['Frugality', 'Do more with less; limits spark creativity'],
      ['Earn Trust', 'Listen, be honest, admit mistakes'],
      ['Dive Deep', 'Know the details and question the numbers'],
      ['Have Backbone; Disagree and Commit', 'Challenge respectfully, then fully support the decision'],
      ['Deliver Results', 'Hit goals despite obstacles'],
      ['Earth\'s Best Employer; Broad Responsibility (two principles)', 'Treat people well and think about the wider effects of your work on society and the planet']]) +
    '<p><b>Method:</b> (1) Prepare 6-8 stories. (2) Tag each with 2-3 principles it shows best. (3) Check the grid for gaps. (4) Prepare one story per gap. Most stories hit Ownership, Deliver Results, and one more. Tag by the <b>action you took</b>, not the topic.</p>',
  clues: ['The interviewer mentions "leadership principles" or "bar raiser"', '"Tell me about a time you disagreed and then committed"', '"A time you simplified something"', '"A time you were wrong"', '"A time you took a calculated risk"', '"A time you dove deep into data"', 'Company values list in the job posting'],
  code: { lang: 'python', title: 'Story-to-principle mapper (runnable)', run: true, code:
`# Keyword scorer: which leadership principles does a story show?
# Replace the sample story with your own text to practise.
PRINCIPLES = {
    "Customer Obsession": ["customer", "user", "client", "support", "feedback", "complaint", "need"],
    "Ownership": ["owned", "responsib", "not my job", "follow", "end to end", "fixed", "long-term", "mistake"],
    "Invent and Simplify": ["simplif", "invent", "new way", "automat", "prototype", "redesign", "streamlin"],
    "Bias for Action": ["quick", "days", "pilot", "decided", "shipped", "risk", "fast", "without waiting"],
    "Dive Deep": ["root cause", "logs", "data", "analy", "metric", "investigat", "trace", "query"],
    "Earn Trust": ["honest", "admitted", "transparent", "listened", "credit", "apolog", "shared"],
    "Have Backbone": ["disagree", "pushed back", "challenged", "committed", "objection", "concern"],
    "Deliver Results": ["delivered", "reduced", "increased", "launched", "percent", "%", "deadline", "saved"],
    "Insist on High Standards": ["quality", "standard", "test", "review", "bar", "rigor", "checklist"],
    "Learn and Be Curious": ["learned", "curious", "new skill", "studied", "experiment", "explored"],
}

def score_story(text):
    t = text.lower()
    scores = {}
    for name, words in PRINCIPLES.items():
        hits = sum(t.count(w) for w in words)
        if hits:
            scores[name] = hits
    return sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))

story = """
Customers kept writing support tickets about missing invoices. I investigated the logs and found a
timezone bug in another team's service, so I fixed it with their review and added an alert and a test.
Tickets fell 60 percent and I shared the credit with the data team. I was honest that my first fix
missed a case, and I owned the follow-up end to end.
"""

top = score_story(story)[:4]
print("Top principles for this story:")
for name, hits in top:
    print("  %-26s keyword hits: %d" % (name, hits))

# Coverage check across several stories
stories = {
    "Invoice fix": ["Customer Obsession", "Ownership", "Dive Deep"],
    "Checklist influence": ["Earn Trust", "Deliver Results"],
    "Vague search brief": ["Bias for Action", "Dive Deep"],
}
covered = set()
for tags in stories.values():
    covered.update(tags)
gaps = [p for p in PRINCIPLES if p not in covered]
print()
print("Principles with no story yet:", gaps)
` },
  viz: {
    title: 'Story x principle coverage grid',
    input: 'Invoice fix: own, cust, deep; Checklist: trust, result; Search brief: action, deep, simple',
    inputLabel: 'story: tags (own, cust, simple, action, deep, trust, back, result) separated by ; ',
    gen: function (input) {
      var cols = ['Ownership', 'Customer', 'Simplify', 'Action', 'Deep dive', 'Trust', 'Backbone', 'Results'];
      var keys = ['own', 'cust', 'simple', 'action', 'deep', 'trust', 'back', 'result'];
      var lines = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
      if (!lines.length || lines.length > 6) throw new Error('Give 1-6 stories like: Invoice fix: own, cust, deep; Checklist: trust, result');
      var stories = lines.map(function (l) {
        var p = l.split(':'); var tags = (p[1] || '').split(',').map(function (t) { return t.trim().toLowerCase(); }).filter(Boolean);
        return { name: (p[0] || 'story').trim().slice(0, 18), tags: tags };
      });
      function build(n) {
        var rows = [], hl = {};
        for (var r = 0; r < n; r++) {
          rows.push(keys.map(function (k, c) { var on = stories[r].tags.some(function (t) { return k.indexOf(t) === 0 || t.indexOf(k) === 0; }); if (on) hl[r + ',' + c] = 'ok'; return on ? 'X' : ''; }));
        }
        return { rows: rows, hl: hl };
      }
      var frames = [], rowHead = [];
      frames.push({ narr: 'Empty grid. Columns are principles, rows are your stories. Goal: <b>every column has at least one X</b>.', parts: [{ type: 'grid', label: 'Coverage', rowHead: [], colHead: cols, rows: [], hl: {} }] });
      for (var i = 0; i < stories.length; i++) {
        rowHead.push(stories[i].name);
        var b = build(i + 1);
        frames.push({ narr: 'Add story <b>' + H.esc(stories[i].name) + '</b> and mark the principles shown by its <b>actions</b>.', parts: [{ type: 'grid', label: 'Coverage', rowHead: rowHead.slice(), colHead: cols, rows: b.rows, hl: b.hl }] });
      }
      var fb = build(stories.length), hl2 = {}, gaps = [];
      Object.keys(fb.hl).forEach(function (k) { hl2[k] = 'ok'; });
      cols.forEach(function (c, ci) {
        var any = fb.rows.some(function (row) { return row[ci] === 'X'; });
        if (!any) { gaps.push(c); fb.rows.forEach(function (_, ri) { hl2[ri + ',' + ci] = 'bad'; }); }
      });
      frames.push({ narr: gaps.length ? 'Gaps (red columns): <b>' + gaps.join(', ') + '</b>. Prepare one new story for each gap, or stretch an existing story honestly.' : 'No gaps - every principle has a story. Now check that no single story carries too many.', parts: [{ type: 'grid', label: 'Coverage with gaps', rowHead: rowHead.slice(), colHead: cols, rows: fb.rows, hl: hl2 }] });
      return frames;
    }
  },
  examples: [
    { title: 'Example: one story, three principles', html: '<p>The invoice story shows Customer Obsession (the person), Dive Deep (the logs), and Ownership (fixing another team\'s bug). In the interview, emphasise a <b>different slice</b> depending on the question asked.</p>' },
    { title: 'Example: disagree and commit', html: '<p>I preferred a queue-based design; my lead chose a simple cron job. I presented numbers once, listened, and when the decision stood I built the cron job well and set a metric to revisit it. Later, the cron job was enough. Shows Backbone first, then commitment.</p>' },
    { title: 'Example: a gap story', html: '<p>No story for "Invent and Simplify"? Look for a time you removed steps from a process, automated a chore, or replaced a tool with something smaller. Simplification stories are everywhere in daily work.</p>' }
  ],
  deepDive: '<p><b>How loops use principles:</b> in a typical onsite each interviewer gets two or three principles and writes feedback against them. A "bar raiser" checks consistency and depth. Repeating a story across interviewers is risky because they compare notes; vary your stories, or use a different angle.</p>' +
    '<p><b>Depth beats breadth:</b> expect 2-3 layers of follow-up ("why that option?", "what data?", "what would you change?"). Know every number in your story.</p>' +
    '<p><b>Principles that feel opposed:</b> Bias for Action vs Insist on High Standards, Frugality vs Think Big. Good stories show the trade-off and which side you chose and why.</p>' +
    '<p><b>Level matters:</b> junior stories show personal execution; senior stories show scope across teams, mechanisms, and growing others. Ask yourself "what happened because of me that would not have otherwise?"</p>' +
    '<p><b>Red flags:</b> reciting the principle names, forcing a story onto a principle it does not fit, all stories from one project, and a "we" story with no "I".</p>',
  aiEra: '<p><b>What AI changes:</b> Candidates can use AI to rehearse, but interviewers more often ask deep follow-ups to test real experience. Scripted, generic answers stand out for the wrong reason.</p>' +
    '<p><b>Use AI as a partner:</b> Paste a story and ask it to play the interviewer: <code>Ask me 5 hard follow-up questions on this story, one at a time.</code> Use it to find gaps in your grid, to trim to two minutes, and to check you used "I" enough.</p>' +
    '<p><b>Where AI goes wrong:</b> It will invent flattering details, polish away the honest mess, and match keywords instead of meaning. Do not memorise AI-written stories; you will be caught on the follow-ups.</p>' +
    '<p><b>What you must still own:</b> the truth, the numbers, and the lessons. Add one or two AI-era stories (adopting AI tools responsibly, catching an AI mistake) - they map well to Dive Deep, Ownership and Learn and Be Curious.</p>',
  problems: [bp('Story mapped to several principles', 'Medium', ['amazon', 'principles'],
    'Tell me about a time you took a calculated risk.',
    '"We were behind so I just pushed the release without testing and it worked out."',
    'Reckless, not calculated; no data, no safety net, no reasoning.',
    '<p><b>S:</b> Our launch was in ten days but a new payment library was untested at scale. <b>T:</b> Decide whether to adopt it or keep the slower old one. <b>A:</b> I listed the risks, load-tested it for two days, and found it handled our peak with 30% less latency. I put it behind a feature flag with a one-click rollback and rolled out to 5% first. I told my manager the plan and the stop conditions. <b>R:</b> Launch hit its date, checkout time fell 25%, and we never needed the rollback. <b>L:</b> A calculated risk is a reversible bet with a data check and an exit.</p>',
    ['Risk is real but bounded', 'Evidence before the decision', 'Safety net (flag, rollback, stop rule)', 'Honest about what could have gone wrong'],
    ['Hint 1: Choose a bet with a real downside, so the risk is genuine and not a sure thing.', 'Hint 2: Show the data you collected, such as a small test, that made the risk calculated.', 'Hint 3: Name the exit plan: the signal that would make you stop and how you would undo it.'],
    { q: 'Best way to map a story to principles?', options: ['By the project topic', 'By the actions you took', 'By the company name', 'Randomly'], answer: 1, explain: 'Principles are shown by actions, not by subject matter.' })]
});

// ---------- PRACTICE ----------
function mq(q, o, a, e) { return { q: q, options: o, answer: a, explain: e }; }
practice.push(bp('Made a customer\'s day', 'Easy', ['customer'], 'Tell me about a time you helped an unhappy customer.',
  '"They shouted at me, so I gave them a refund to calm them down."', 'Refund only; no listening, no learning, no prevention.',
  '<p><b>S:</b> A customer, Mr. Okafor, lost two days of orders after a sync bug. <b>T:</b> Restore his data and his trust. <b>A:</b> I called within the hour, listened without defending, restored the orders from backups, and checked each one with him. I traced the bug to one edge case and added a fix and a test. I followed up a week later. <b>R:</b> He stayed a customer, wrote a positive review, and the bug never returned for 800 other accounts. <b>L:</b> Fix the person first, then the cause.</p>',
  ['Listens first', 'Fixes cause for others', 'Follow-up call', 'Has a number or clear outcome'],
  ['Hint 1: Stay with one real, named customer and describe their problem, not a general group.', 'Hint 2: Say what you learned by listening before you offered any fix or refund.', 'Hint 3: Explain how you stopped the same problem for other customers, such as a fix and a test.'],
  mq('Best opening in an unhappy-customer story?', ['Defend the product', 'Listen and restate the problem', 'Offer a discount', 'Escalate'], 1, 'Listening shows respect and finds the real problem.')));
practice.push(bp('Took on work outside your role', 'Easy', ['ownership'], 'Tell me about a time you did something that was not your job.',
  '"Nobody else wanted to, so I did it. It was a lot of work."', 'No why, no result, sounds like a complaint.',
  '<p><b>S:</b> Our team had no onboarding guide, and new hires needed two weeks to ship. <b>T:</b> Nobody owned it, but I remembered my own slow start. <b>A:</b> I asked three recent hires what confused them, wrote a 6-page guide with a setup script, and asked my manager to review it. I made it a living page and put a reminder in each sprint to update it. <b>R:</b> Time to first PR fell from 10 days to 4, and two teams copied the guide. <b>L:</b> Small docs and scripts have a huge multiplier.</p>',
  ['Saw a gap', 'Asked users (new hires)', 'Kept it alive', 'Result measured'],
  ['Hint 1: Say why nobody owned the work, so it is a gap and not a complaint about your team.', 'Hint 2: Explain how you checked with the people affected that you were solving the right thing.', 'Hint 3: Say how the result will last, such as a handover, documentation or an owner who took it on.'],
  mq('Strongest ending for an ownership story?', ['I worked very hard', 'A lasting mechanism and a metric', 'My manager thanked me', 'I got a promotion'], 1, 'Owners leave behind mechanisms and measurable results.')));
practice.push(bp('Simplified a process', 'Easy', ['simplify', 'bias for action'], 'Tell me about a time you made something simpler.',
  '"I cleaned up a script. It looked better afterwards."', 'No before/after, no impact, vague.',
  '<p><b>S:</b> Weekly reporting took four people three hours, copying numbers across spreadsheets. <b>T:</b> Cut the effort without losing accuracy. <b>A:</b> I mapped each step, found 70% was copying, and wrote a script that pulled the data and built the report; the team kept a manual check on two key numbers. I demoed to the team and trained a teammate to maintain it. <b>R:</b> The job fell from 12 person-hours to 1, errors dropped to zero in six months. <b>L:</b> Map the steps before automating.</p>',
  ['Before/after numbers', 'Kept quality check', 'Shared ownership of the tool', 'Clear why-this-approach'],
  ['Hint 1: Pick a boring but costly process, such as a manual step repeated every week.', 'Hint 2: Give before and after numbers, like minutes per run or steps removed.', 'Hint 3: Say who maintains the simpler version now, so the gain does not disappear.'],
  mq('What makes a simplification story strong?', ['Fancy tools', 'Before/after numbers', 'Long explanation', 'A new framework'], 1, 'Numbers show the real value.')));
practice.push(bp('Influenced a senior person', 'Medium', ['influence'], 'Tell me about a time you changed the mind of someone more senior than you.',
  '"I explained why I was right and eventually he gave in."', 'Win-lose framing; no evidence, no empathy.',
  '<p><b>S:</b> Senior engineer Priya wanted to keep a homegrown logging tool that cost us hours each incident. <b>T:</b> Get her to consider switching without a fight. <b>A:</b> I asked what she valued (full control and low cost), then replayed a past incident in both tools and timed it: 40 minutes vs 9. I offered to do the migration for one service first and keep her tool as a fallback. <b>R:</b> She chose to migrate all services and presented it herself. Incident time fell 55%. <b>L:</b> Let the evidence persuade and respect what they care about.</p>',
  ['Understands their goals', 'Evidence, not opinion', 'Low-risk first step', 'Gives credit'],
  ['Hint 1: Show respect for their view by stating what was right about their position first.', 'Hint 2: Use a demo or a number instead of opinion to show why your option was better.', 'Hint 3: Make it easy for them to say yes, for example with a small pilot they can stop.'],
  mq('To persuade a senior engineer, first:', ['Escalate', 'Learn what they value', 'Send a long email', 'Wait'], 1, 'Understanding their goals shapes a persuasive case.')));
practice.push(bp('Unclear requirements, tight deadline', 'Medium', ['ambiguity'], 'Tell me about a time you had to build something with unclear requirements.',
  '"I guessed what they wanted and built it. They changed their mind later."', 'No checking, no communication, wasted work.',
  '<p><b>S:</b> A partner team needed an "export feature" in three weeks with no details. <b>T:</b> Ship something useful, avoid rework. <b>A:</b> I met two partner users, listed six unknowns, wrote assumptions (file type, size, frequency), and shared them in a one-page doc. A 2-day prototype of the CSV export confirmed the main one; the rest we marked as later. I set a checkpoint after week one. <b>R:</b> We shipped on day 17 and only one assumption changed. <b>L:</b> Assumptions on paper are cheap to fix.</p>',
  ['Unknowns named', 'Assumptions shared', 'Cheap experiment', 'Checkpoint'],
  ['Hint 1: Say who you asked for clarity, and what you asked them, before building anything.', 'Hint 2: Name the riskiest guess you made and how you tested it early.', 'Hint 3: Say what changed after the checkpoint with the stakeholder, and how you adapted.'],
  mq('Best response to a vague requirement?', ['Wait for clarity', 'Write assumptions and test the riskiest', 'Build everything', 'Refuse'], 1, 'Assumptions plus tests produce progress and learning.')));
practice.push(bp('Competing deadlines', 'Medium', ['prioritization'], 'Tell me about a time you had several urgent deadlines at once.',
  '"I worked long hours and got everything done somehow."', 'No choices shown, burnout risk, not repeatable.',
  '<p><b>S:</b> In one week I had a customer bug fix, a security patch due Friday, and a demo for a VP. <b>T:</b> Decide order and tell people. <b>A:</b> I ranked by customer impact and real dates: the bug (hurting customers now) first, the security patch (hard deadline) second, the demo third and trimmed. I messaged the VP\'s assistant that the demo would show two features not four, and asked a teammate to review my patch early. <b>R:</b> All three landed; the VP liked the focused demo; no customers affected. <b>L:</b> Say what you are cutting before it surprises anyone.</p>',
  ['Clear criteria', 'Communicated trade-off', 'Got help', 'Honest cut'],
  ['Hint 1: List the criteria you used to rank the deadlines, such as customer impact and cost of delay.', 'Hint 2: Say what you chose to cut or delay, since prioritising means dropping something.', 'Hint 3: Say who you told about the trade-off, and when, so nobody was surprised.'],
  mq('What do interviewers listen for in prioritization?', ['Hours worked', 'Criteria and communication', 'Calendar tools', 'Luck'], 1, 'Criteria and communication show judgment.')));
practice.push(bp('Said no to scope creep', 'Medium', ['prioritization', 'stakeholders'], 'Tell me about a time you pushed back on scope.',
  '"I said it was impossible and walked away."', 'Blocks without options.',
  '<p><b>S:</b> Two weeks before launch, the PM asked to add three new reports. <b>T:</b> Protect the date and quality while still helping. <b>A:</b> I estimated each report (2, 4, and 8 days) and showed the launch would slip by a week. I offered: ship the 2-day report now, put the others in a fast follow, or move the date. The PM chose the first and a follow-up in two weeks. <b>R:</b> Launch on time with zero severity-1 bugs, and the follow-up shipped as promised. <b>L:</b> Options beat objections.</p>',
  ['Estimates shown', 'Options not ultimatums', 'Stakeholder decides with facts', 'Kept the promise'],
  ['Hint 1: Show effort numbers for the extra request, such as days of work, so the no is based on facts.', 'Hint 2: Give three options, such as do it later, do a smaller version, or swap it for other work.', 'Hint 3: Keep the follow-up promise you made, and say how you showed it to the stakeholder.'],
  mq('Best way to push back on scope?', ['Refuse', 'Show cost and offer options', 'Quietly do it', 'Ignore it'], 1, 'Facts and options turn conflict into a decision.')));
practice.push(bp('Decision with incomplete data', 'Medium', ['ambiguity', 'judgment'], 'Tell me about a time you made an important decision without all the data.',
  '"I went with my gut. It worked."', 'No reasoning, no safety net.',
  '<p><b>S:</b> Our traffic was growing and the database was near its limit, with a vendor upgrade decision due in two days. <b>T:</b> Choose between buying a bigger plan or sharding. <b>A:</b> I looked at the 90-day trend, asked a teammate for a second opinion, and judged the bigger plan reversible (monthly contract) while sharding was not. I chose the bigger plan and set an alert at 70% to revisit. <b>R:</b> The bigger plan bought us four months, then we sharded with real data. <b>L:</b> Prefer reversible choices when data is thin.</p>',
  ['Reversibility reasoning', 'Second opinion', 'Checkpoint or alert', 'Honest about uncertainty'],
  ['Hint 1: Say exactly what you did not know and why you could not wait to find out.', 'Hint 2: Explain why the option was reversible, or how you limited the damage if you were wrong.', 'Hint 3: Name the trigger that told you to revisit the decision, such as a metric or a date.'],
  mq('A decision that is easy to undo should be:', ['Delayed', 'Made faster with partial info', 'Ignored', 'Voted on'], 1, 'Cheap-to-reverse choices reward speed.')));
practice.push(bp('Disagreed with leadership, then committed', 'Hard', ['backbone', 'trust'], 'Tell me about a time you disagreed with your manager\'s boss and what happened.',
  '"I thought they were wrong, but I said nothing and did what they said."', 'No backbone shown; silent compliance.',
  '<p><b>S:</b> A director wanted to rewrite our service from scratch in six months. <b>T:</b> Voice my concern with evidence and respect. <b>A:</b> I asked my manager how to raise it, then wrote a short doc comparing a rewrite to an incremental plan, with a risk list and two similar past projects that ran over. I presented it once, asked questions, and offered to be wrong. The director kept the rewrite but added a staged migration. I committed: I built the first stage carefully and tracked agreed milestones. <b>R:</b> Stage one shipped on time; the director later credited the staging for avoiding a late surprise. <b>L:</b> Disagree clearly, decide together, then commit fully.</p>',
  ['Evidence-based disagreement', 'Respectful channel', 'Full commitment afterwards', 'No sulking or sabotage'],
  ['Hint 1: Show how you raised the disagreement, with whom, and what evidence you brought.', 'Hint 2: Say what you did after the decision was made, to help it work in practice.', 'Hint 3: You do not need to have won; show that you committed fully and kept the relationship.'],
  mq('After the decision goes against you, you should:', ['Quietly resist', 'Commit and support it', 'Keep arguing', 'Leave'], 1, 'Disagree first, then commit fully.')));
practice.push(bp('Led a cross-team initiative', 'Hard', ['influence', 'scope'], 'Tell me about the largest cross-team effort you led without formal authority.',
  '"I organized a lot of meetings and kept everyone updated."', 'Process without outcome; no ownership of results.',
  '<p><b>S:</b> Four teams each built their own auth code, causing security gaps and duplicated work. <b>T:</b> Create one shared library with agreement from all four. <b>A:</b> I interviewed the leads for their needs and fears, drafted a design with an explicit opt-out path, and recruited one engineer from each team as owners. I ran a 3-week pilot with the friendliest team and published results monthly. The most resistant lead got a veto on one design point. <b>R:</b> All four teams migrated in two quarters, audit findings fell by 80%, and the library got a permanent owner. <b>L:</b> Share ownership and make adoption easy.</p>',
  ['Multi-team scope', 'Skeptic engaged', 'Mechanism that outlasts you', 'Measured outcome'],
  ['Hint 1: Name the main skeptic by role and say what they were worried about.', 'Hint 2: Explain how you shared ownership with the other teams so it was not only your project.', 'Hint 3: Say what keeps the result alive after you leave, such as an owner, a process or a dashboard.'],
  mq('Strongest sign of cross-team influence?', ['Many meetings', 'Teams adopting it and keeping it alive', 'A long doc', 'Big title'], 1, 'Adoption and lasting ownership show real influence.')));
practice.push(bp('Changed course after being wrong', 'Hard', ['judgment', 'trust'], 'Tell me about a time you realised you had prioritized the wrong thing.',
  '"I was not really wrong; the requirements changed."', 'Defensive, no learning.',
  '<p><b>S:</b> I spent a month on a faster reporting engine because I assumed customers hated slow reports. <b>T:</b> Reassess when usage looked flat. <b>A:</b> I checked usage and talked to ten customers; the real complaint was confusing filters, not speed. I told my manager the same day, stopped the work with 20% left, and shifted to a filter redesign. I wrote down what I should have tested first. <b>R:</b> Filter redesign cut support tickets by 35%; I now test the assumption before large builds. <b>L:</b> Be quick to admit and cheap to pivot.</p>',
  ['Honest admission', 'Quick pivot', 'Told stakeholders early', 'Concrete learning'],
  ['Hint 1: Own the mistake in the first sentence, before any context about requirements or others.', 'Hint 2: Say how fast you acted once you saw you were wrong, and who you told first.', 'Hint 3: Say what changed in your habits, such as a check you now do before choosing priorities.'],
  mq('When you discover you were wrong you should:', ['Hide it', 'Say so early and pivot', 'Blame the spec', 'Finish anyway'], 1, 'Early honesty protects trust and saves time.')));
practice.push(bp('Customer need vs business metric', 'Hard', ['customer', 'integrity'], 'Tell me about a time you chose the customer over a short-term business goal.',
  '"I did what my manager said because the number mattered more."', 'Ignores customer; no judgment shown.',
  '<p><b>S:</b> A promotion boosted sign-ups, but the terms were confusing and older users were being charged unexpectedly. <b>T:</b> Protect customers without sinking the target. <b>A:</b> I showed complaint data and refund rates to my manager and product lead, proposed clearer terms and an auto-reminder before charge, and estimated a 5% sign-up dip. They agreed after reading three real customer emails. <b>R:</b> Sign-ups dipped 5% for a week, refunds fell 50%, and net revenue was higher in the quarter. <b>L:</b> Long-term trust beats short-term lift, and data helps you say it.</p>',
  ['Customer harm identified with data', 'Trade-off quantified', 'Constructive proposal', 'Long-term result'],
  ['Hint 1: Quantify the short-term cost of choosing the customer, such as revenue or a missed target.', 'Hint 2: Use real customer evidence, like tickets, calls or churn, not just your opinion.', 'Hint 3: Show the longer-term win, such as retention or trust, and how you told your manager.'],
  mq('When customer trust and a metric conflict, strong candidates:', ['Pick the metric', 'Quantify both and propose a path', 'Stay silent', 'Resign'], 1, 'Data and a proposal turn it into a business argument.')));
practice.push(bp('Owned a failure that was not only yours', 'Hard', ['ownership', 'trust'], 'Tell me about a failure where several people were involved.',
  '"The failure was mostly the other team\'s fault; I did my part."', 'Blame shifting, no ownership.',
  '<p><b>S:</b> A launch missed its date after integration bugs surfaced late; two teams had assumed the other would test. <b>T:</b> Recover and fix how we work. <b>A:</b> I said in the retro that I had not asked for an integration test date, which was my part. I proposed a shared checklist and a joint test day two weeks before every launch, and volunteered to run the first. I wrote a blameless summary and sent it to both teams. <b>R:</b> The next three launches had no late integration bugs. <b>L:</b> Own your slice first; fix the system, not the person.</p>',
  ['Owns own share first', 'Blameless tone', 'Systemic fix', 'Result across launches'],
  ['Hint 1: Start with your own part in the failure, stated plainly before you mention anyone else.', 'Hint 2: Do not name anyone as the cause; describe what happened to the work, not who was at fault.', 'Hint 3: Finish by fixing the process, such as a checklist or handoff step that prevents a repeat.'],
  mq('Best tone for shared failure?', ['Blame the other team', 'Own your part, fix the system', 'Say nothing', 'Blame the spec'], 1, 'Ownership plus system fixes builds trust.')));

// ---------- QUIZ ----------
function qz(q, o, a, e) { quiz.push({ q: q, options: o, answer: a, explain: e }); }
qz('In a leadership-without-authority story, what is usually the weakest first move?', ['Interview the people affected', 'Run a small pilot', 'Escalate to your manager', 'Find the skeptic'], 2, 'Escalation first burns trust; listening and pilots build it.');
qz('A strong STAR answer spends the most time on:', ['Situation', 'Action', 'Task', 'Result'], 1, 'Action (what <i>you</i> did) is the heart, about half the answer.');
qz('Ambiguity story: what is the best first thing to do?', ['Wait for the spec', 'Write down unknowns and assumptions', 'Build everything', 'Ask for a deadline extension'], 1, 'Named assumptions turn fog into testable items.');
qz('A reversible decision should generally be made:', ['Slowly with full data', 'Quickly with partial data', 'By committee only', 'Never'], 1, 'Cheap-to-undo calls reward speed.');
qz('In an impact/effort grid, high impact + low effort means:', ['Say no', 'Do now', 'Plan for later', 'Ignore'], 1, 'Quick wins go first.');
qz('A good "no" to a stakeholder includes:', ['A short refusal', 'A trade-off and an alternative', 'Blame', 'Silence'], 1, 'Trade-off plus options keeps the relationship.');
qz('Customer obsession is best shown by:', ['Doing whatever customers ask', 'Working backwards from the real customer need', 'Following the process', 'Raising prices'], 1, 'Start from the need, not the stated ask.');
qz('Which story is stronger on Ownership?', ['I filed a ticket for a bug I found', 'I fixed it with the owner\'s review and added an alert', 'I worked late', 'I told my manager'], 1, 'Fix plus prevention shows ownership.');
qz('How should you map stories to leadership principles?', ['By project name', 'By the actions you took', 'By company', 'At random'], 1, 'Principles are shown through actions.');
qz('If your coverage grid has a column with no story, you should:', ['Ignore it', 'Prepare a story for that gap', 'Reuse any story', 'Make one up'], 1, 'Fill gaps with real stories; never invent.');
qz('"Disagree and commit" means:', ['Argue until you win', 'Voice disagreement, then fully support the decision', 'Stay silent', 'Leave the team'], 1, 'Challenge respectfully, then commit.');
qz('Biggest risk of using AI to write your stories?', ['They are too short', 'Invented details and failure on follow-ups', 'Too many numbers', 'Wrong grammar'], 1, 'Interviewers probe deeply; fake or polished details collapse.');

// ---------- INTERVIEW ----------
function iv(q, lvl, a, f) { interview.push({ q: q, level: lvl, a: a, followUps: f }); }
iv('How do you influence people who do not report to you?', 'I', '<p>I start by listening to each group to learn what hurts them. Then I map who decides, who is affected and who may block. I propose a small pilot that is cheap to agree to, gather numbers, and share them through the people who saw it work. I pay special attention to skeptics because their fear usually points to a real requirement. At the end I give credit away so others own it. Authority is not needed if the facts and trust are strong.</p>', ['What did you do when someone still said no?', 'How do you decide when to escalate?']);
iv('Describe your approach to ambiguous projects.', 'I', '<p>I write down the unknowns, turn each into an assumption, and rank them by risk. I run the cheapest experiment on the riskiest one: a user call, a log query, or a two-day prototype. Then I choose a reversible first version, set a checkpoint, and share my assumptions so others can correct me. I avoid waiting for perfect clarity because the fog rarely lifts without action.</p>', ['How do you know when you have enough information?', 'Tell me about an assumption that turned out wrong.']);
iv('Give an example of ownership beyond your role.', 'B', '<p>A good example: a nightly report that sales relied on kept failing and the data team was busy. I read the logs, found a timeout, told the owners, and opened a small reviewed PR with a retry and an alert, then wrote a short runbook. The failures stopped for months. I stress involving the real owner and leaving a mechanism so it does not rely on me.</p>', ['What if the owner had said no?', 'How do you avoid overstepping?']);
iv('How do you prioritize when everything is urgent?', 'B', '<p>I separate real deadlines (contract, legal, customer harm) from loud requests. I use impact versus effort and cost of delay to rank. Then I tell stakeholders clearly what will slip and why, and offer options. If two leaders disagree, I show them the trade-off together rather than picking a side silently.</p>', ['What framework do you use and why?', 'Tell me about a priority call you got wrong.']);
iv('How do you say no to a senior stakeholder?', 'I', '<p>I first confirm I understand their goal. Then I show the cost: what this would delay and what it would put at risk. I offer options: a smaller version, a later date, or a swap. I let them decide with the facts. The no is for the task, not for the person, and I follow through on the alternative I offered.</p>', ['What if they insist?', 'Describe a time they were right and you were wrong.']);
iv('What does customer obsession mean to you?', 'B', '<p>It means working backwards from what the customer is truly trying to do, using their feedback and behaviour data. It means doing the right thing for their long-term trust even when it costs us in the short term, and closing the loop by telling them what changed. It does not mean saying yes to every request.</p>', ['How do you gather customer insight?', 'Tell me about a customer request you declined.']);
iv('How do you prepare for Amazon-style leadership principle interviews?', 'B', '<p>I prepare six to eight real stories with numbers and tag each by the actions it shows. I build a coverage grid and fill gaps. I practise two-minute versions, and I know every detail for the follow-ups. I vary stories across interviewers. I do not recite principle names; I let the actions show them.</p>', ['How many stories do you need?', 'How do you handle a question for which you have no story?']);
iv('Tell me about a time you took a calculated risk.', 'I', '<p>I describe a reversible bet: I identified the risk, collected evidence like a load test, put the change behind a feature flag with a rollback, rolled out to 5% first, and defined stop conditions. The result was measurable and I explain what I would have done if it had failed. A calculated risk has data and an exit.</p>', ['What would have made you stop?', 'Was there anything you missed?']);
iv('How do you handle disagreement with a decision you must still execute?', 'I', '<p>I state my view once with evidence in the right forum, listen to the reasons, and if the decision stands, I commit fully: build it well, track agreed metrics, and revisit only if data says so. I do not sabotage, reopen the debate daily, or sulk.</p>', ['When would you escalate?', 'Give a time the decision proved you right.']);
iv('How do you decide whether to fix a problem that is not yours?', 'I', '<p>I weigh the impact, how easy it is to help, and whether the owner can act soon. I tell the owner first, offer a small reviewed fix, and avoid silent rewrites. If it is serious, I raise it clearly and help. Afterwards I add a test or doc so it does not return.</p>', ['What if the owner is unresponsive?', 'How do you avoid being seen as pushy?']);
iv('How would you coach a junior to improve their behavioral answers?', 'A', '<p>I ask them to tell a story and note where they say "we" instead of "I", skip the result, or give no numbers. We rewrite once, then rehearse with follow-up questions. I stress honesty: pick real stories and own mistakes. I also help them build a coverage grid so they are not repeating one project.</p>', ['How do you handle someone who over-claims?', 'What would you do for a candidate with no work history?']);
iv('How do you use AI tools to prepare for interviews without hurting yourself?', 'A', '<p>I use AI as a mock interviewer for follow-up questions, to trim stories to two minutes, and to find gaps in my coverage. I do not let it invent details or polish out the honest mess. I keep the facts, numbers and lessons my own so I can handle deep follow-ups, and I never present AI-written experience as mine.</p>', ['Where does AI help least?', 'How would you spot a scripted AI answer as an interviewer?']);
iv('Describe a time your priorities changed mid-project.', 'I', '<p>I explain how I noticed (a customer signal or data), told stakeholders early, stopped low-value work, and reset the plan with a new checkpoint. I stress that I shared what we would not do, preserved team morale by explaining why, and documented the lesson.</p>', ['How did the team react?', 'What signal told you to change?']);

registerModule({
  langExplain: `<p><b>About the code here.</b> The few samples are optional Python helpers you can run in the page, such as an impact/effort prioritizer and a story-to-principle mapper. Nothing in the behavioural rounds depends on a programming language, so skip them if you like.</p>`,
  id: 'beh03',
  title: 'Behavioral Bank II: Leadership, Ownership & Ambiguity',
  intro: '<p>This module covers the "senior" half of behavioral interviews: leading when you have no title, acting like an owner, moving forward in fog, choosing what to do first (and what to refuse), obsessing over the customer, and mapping your stories to the Amazon-style leadership principles. Everything uses simple language, real analogies, weak-versus-strong answers, and runnable Python tools to practise.</p>',
  goals: ['Tell a 2-minute STAR story that proves influence without authority', 'Show ownership by fixing root causes and leaving lasting mechanisms', 'Handle ambiguity with a clear loop of unknowns, assumptions, experiments and decisions', 'Prioritize with impact/effort and say a kind, clear no with options', 'Build a coverage grid of 6-8 stories across leadership principles with no gaps'],
  prereqs: 'Behavioral Bank I (Teamwork, Conflict & Failure) and a basic STAR structure.',
  hours: 8,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
