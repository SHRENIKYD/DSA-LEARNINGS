(function () { var topics = [], practice = [], quiz = [], interview = [];

// Runnable: competency coverage map for an EM / TL story bank.
var PY_COVER = "# Story-bank coverage map for an EM or TL loop.\n# Each story lists the competencies it proves and the metric that backs it.\nCOMPETENCIES = [\"people\", \"performance\", \"hiring\", \"execution\", \"cross-team\", \"technical\", \"failure\"]\n\nSTORIES = [\n    {\"name\": \"Grew Ana from L4 to L5\",        \"proves\": [\"people\"],                \"metric\": \"promoted in 3 cycles; led 2 designs\"},\n    {\"name\": \"PIP that ended in a good exit\",  \"proves\": [\"performance\", \"people\"], \"metric\": \"\"},\n    {\"name\": \"Rebuilt the hiring loop\",        \"proves\": [\"hiring\"],                \"metric\": \"offer accept 55% -> 78%; 6 hires in 2 qtrs\"},\n    {\"name\": \"Checkout replatform delivery\",   \"proves\": [\"execution\", \"technical\"],\"metric\": \"shipped 1 week late vs 6 forecast; 0 SEV-1\"},\n    {\"name\": \"Search vs Ads on-call fight\",    \"proves\": [\"cross-team\"],            \"metric\": \"pages per week 31 -> 9\"},\n]\n\ndef coverage(stories):\n    table = {c: [] for c in COMPETENCIES}\n    for s in stories:\n        for c in s[\"proves\"]:\n            table[c].append(s)\n    return table\n\ntable = coverage(STORIES)\nprint(\"%-12s %-6s %s\" % (\"competency\", \"count\", \"status\"))\nfor comp in COMPETENCIES:\n    stories = table[comp]\n    with_metric = [s for s in stories if s[\"metric\"]]\n    if not stories:\n        status = \"GAP: find a story\"\n    elif not with_metric:\n        status = \"WEAK: add a number\"\n    elif len(stories) == 1:\n        status = \"ok, but only one story (prepare a backup)\"\n    else:\n        status = \"strong\"\n    print(\"%-12s %-6d %s\" % (comp, len(stories), status))\n\nprint()\nfor s in STORIES:\n    if not s[\"metric\"]:\n        print(\"Add a metric to: \" + s[\"name\"])\n";

// Behavioral problem builder (same shape as other beh modules).
function P(o) {
  return {
    title: o.t, level: o.l, tags: o.tags, companies: o.co,
    statement: '<p>' + o.s + '</p>',
    constraints: o.c || 'Answer in 2 to 4 minutes. Use STAR+L. Say "I" for your own decisions, name the team size, and give at least one before/after metric.',
    example: o.ex,
    brute: { why: '<p><b>Weak answer:</b> <i>&ldquo;' + o.weak + '&rdquo;</i></p><p><b>Why it fails:</b> ' + o.why + '</p>' },
    mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
    hints: o.h,
    solution: { approach: o.a, complexity: o.cx, followUps: o.f }
  };
}
var HINTS = function (a, b, c) { return ['<p>Hint 1: ' + a + '</p>', '<p>Hint 2: ' + b + '</p>', '<p>Hint 3: ' + c + '</p>']; };
var RUB = function (tl, em, sr) { return '<p>Scoring rubric: <b>Tech Lead</b> = ' + tl + ' <b>Engineering Manager</b> = ' + em + ' <b>Senior EM / Director</b> = ' + sr + '</p>'; };

// Visualizer helper: build a table row by row, one narration per row, then a summary frame.
function rowViz(title, label, columns, rows, narrs, finalNarr, selRows) {
  return {
    title: title,
    gen: function () {
      var frames = [{ narr: narrs[0], parts: [{ type: 'table', label: label, columns: columns, rows: [] }] }];
      for (var i = 0; i < rows.length; i++) {
        var h = {}; h[i] = 'cur';
        frames.push({ narr: narrs[i + 1] || rows[i][0], parts: [{ type: 'table', label: label, columns: columns, rows: rows.slice(0, i + 1), hl: h }] });
      }
      var fh = {}; (selRows || []).forEach(function (r) { fh[r] = 'sel'; });
      frames.push({ narr: finalNarr, parts: [{ type: 'table', label: label, columns: columns, rows: rows.slice(), hl: fh }] });
      return frames;
    }
  };
}

// ---------- TOPIC 1 ----------
topics.push({
  title: 'What EM and TL Loops Really Assess',
  analogy: `<p>Think of a <b>restaurant</b>. The tech lead is the <b>head chef</b>: still cooking, setting the recipes, tasting every plate before it leaves. The engineering manager is the <b>restaurant manager</b>: hires and trains the cooks, handles the cook who keeps burning the sauce, plans the menu for the season with the owner, and makes sure the kitchen and the front of house stop fighting. Both care about great food, but you are judged on different things. Interviewers are checking which job you can actually do.</p>`,
  explain: `<p><b>The plain idea:</b> An EM or TL loop still has coding or design, but the behavioral rounds carry much more weight. They look for proof in five areas:</p>
    <ul>
      <li><b>People management</b> - one-on-ones, feedback, growth, and handling a performance problem. (Heavy for EM, lighter for TL.)</li>
      <li><b>Hiring and team building</b> - designing a loop, closing candidates, onboarding, team shape.</li>
      <li><b>Execution and delivery</b> - planning, prioritization, managing risk, hitting dates honestly.</li>
      <li><b>Cross-team influence and conflict</b> - getting other teams to move, settling fights between teams.</li>
      <li><b>Technical leadership</b> - architecture ownership, quality bar, tech debt, saying no to bad designs.</li>
    </ul>
    <p><b>EM vs TL, in one line each:</b> the EM is accountable for <i>the team</i> (people, hiring, health, delivery); the TL is accountable for <i>the technical outcome</i> (design, quality, technical risk) and leads through influence. Many companies blend them as "TLM" (tech lead manager).</p>
    <p><b>The biggest shift from senior IC interviews:</b> "I built it" is no longer the hero line. The hero line is <b>"I built the team or the system that built it"</b>, and you prove it with <b>team metrics</b>: retention, promotions, hiring numbers, delivery predictability, incident trends, engagement scores.</p>`,
  clues: ['"Tell me about a time you managed a low performer"', '"How do you run your one-on-ones?"', '"How do you decide what your team works on next quarter?"', '"What is your management philosophy?"', '"How hands-on are you technically?"', '"Tell me about a team you built" - signals EM scope', '"How do you balance tech debt and features?" - signals TL scope', 'Round names like "people management", "leadership & drive", "execution" or "bar raiser for managers"'],
  code: [{ lang: 'python', title: 'Story-bank coverage map (runnable)', run: true, code: PY_COVER }],
  codeTitle: ['Coverage map: which competencies your stories prove, and which lack a metric'],
  viz: [
    rowViz('EM loop: rounds, what they test, metrics that prove it', 'Typical EM / TL loop (2026, big tech and scale-ups)',
      ['Round', 'What they test', 'Metrics that prove it', 'Red flag they watch for'],
      [
        ['People management', 'One-on-ones, feedback, growth, low performer', 'Promotions, regretted attrition, engagement score', '"I just let HR handle it"'],
        ['Hiring / team building', 'Loop design, bar, closing, onboarding', 'Offer-accept rate, time-to-hire, 6-month ramp', '"I hire people like me"'],
        ['Execution', 'Planning, prioritization, risk', 'Say/do ratio, forecast error, lead time', '"We worked weekends to make it"'],
        ['Cross-team / conflict', 'Influence, escalation, shared goals', 'Dependency lead time, fewer escalations', '"The other team was the problem"'],
        ['Technical leadership / design', 'Architecture ownership, quality bar', 'Incident trend, change-fail rate, debt burned down', '"I let the team decide everything" or "I decide everything"'],
        ['Coding (often lighter for EM)', 'Still credible technically', 'Clean, tested solution', 'Cannot read or reason about code']
      ],
      ['A typical loop has five or six rounds. We fill in what each one measures and the <b>number</b> that would convince the interviewer.',
        '<b>People management</b>: the core EM round. They want proof that people <i>grew</i> under you, not that you held meetings.',
        '<b>Hiring</b>: managers build teams. Expect "design an interview loop" or "tell me about a bad hire".',
        '<b>Execution</b>: can you plan and deliver predictably? Heroics are a red flag, not a strength.',
        '<b>Cross-team</b>: most delays are between teams. They want calm, shared-goal problem solving.',
        '<b>Technical leadership</b>: both too much control and none at all are red flags.',
        '<b>Coding</b>: often lighter for EMs, but you must stay credible. TLs get the full bar.'],
      'Every round has a <b>metric that proves it</b> and a <b>red flag</b>. Build one story per row, each with a number.', [0, 2, 4])
  ],
  examples: [
    { title: 'Weak vs strong: "What is your management philosophy?"', html: `<p><span class="c-r">Weak:</span> "I am a servant leader. I believe in empowering people and removing blockers."</p><p><span class="c-g">Strong:</span> "Three things, each with a habit. <b>Clarity</b>: every engineer can say in one line what the team is doing this quarter and why; I check it in one-on-ones. <b>Growth</b>: everyone has a written growth goal we review monthly; last year two of my seven were promoted. <b>Honest feedback early</b>: I give feedback within a week, so nothing in a review is a surprise. Regretted attrition on my team was zero over 18 months."</p>` },
    { title: 'EM vs TL: same project, two answers', html: `${H.table(['Question', 'TL answer focus', 'EM answer focus'], [['How did the migration go?', 'Design choice, rollout plan, risk of data loss, the bug we caught in shadow mode', 'Staffing it, protecting the team from scope creep, keeping on-call healthy, growing a junior into the owner'], ['What went wrong?', 'We under-estimated the schema change', 'I staffed it with one person for too long and nearly burned her out'], ['Metric', 'p99 latency 800 → 250 ms, zero data loss', 'Shipped 1 week late on a 6-month plan, nobody left, owner promoted']])}` },
    { title: 'Metrics cheat sheet per competency', html: `${H.kv([['People', 'promotions, regretted attrition, engagement survey trend, time for new hire to first PR'], ['Hiring', 'offer-accept rate, pass-through per stage, time-to-fill, diversity of pipeline, 6-month performance of hires'], ['Execution', 'say/do ratio (committed vs delivered), forecast error, DORA: lead time, deploy frequency, change-fail rate, MTTR'], ['Cross-team', 'days blocked on dependencies, number of escalations, shared OKRs hit'], ['Technical', 'incident count/severity trend, % time on debt, design reviews held, on-call pages per week']], { label: 'Pick one or two you can defend' })}<p>Never use lines of code, hours worked, or story points as proof. Interviewers hear those as red flags.</p>` }
  ],
  deepDive: `<p><b>How EM loops are scored.</b> Most big companies use a competency rubric with levels (for example M1 manager of engineers, M2 manager of managers). Each interviewer owns two or three competencies and writes evidence. A hire needs <b>evidence across all of them</b>; one shining technical round cannot hide a weak people round. A common down-level: strong TL stories but no real people management (never handled a performance case, never built a loop), which places a candidate at TL or "first-line manager in training".</p>
    <p><b>The "hands-on" question is a trap both ways.</b> Saying "I still write 50% of the code" sounds like you are not managing. Saying "I have not looked at code in two years" sounds like you cannot judge technical risk. A calibrated answer: "I do not sit on the critical path. I review designs, read key PRs, pair once a week, and take on-call shadow shifts so I feel the pain." For TLs the reverse: you <i>should</i> code, but you should also show multiplying others.</p>
    <p><b>Manager-of-managers loops</b> add org design (when to split a team, span of control of 6 to 10), hiring managers, and running managers' calibration. If you target M2, your stories must include a manager you coached.</p>
    <p><b>Story honesty.</b> Managers are asked deep follow-ups: "What was the engagement score before and after?", "What did HR say?", "What did that person say about you?" Every number must survive two levels of "how do you know?".</p>`,
  aiEra: `<p><b>What AI changes for managers:</b> in 2026 interviewers often ask "How has your team adopted AI coding tools, and how did you measure it?" A weak answer is "we gave everyone Copilot". A strong one names a pilot, guardrails (review rules, no secrets in prompts, tests required), and outcome metrics like lead time and change-fail rate, plus watching that juniors still learn fundamentals.</p>
    <p><b>Team shape is changing:</b> with agents doing more routine work, managers are asked how they rethink team size, hiring profiles (more judgment, review and system skills) and career ladders. Have a view, but stay grounded in data from your own team.</p>
    <p><b>Prep with AI:</b> paste your story bank and ask <code>Map each story to people, hiring, execution, cross-team, technical. Which competency has no metric? Ask me the follow-up a skeptical director would ask.</code> Do not let it invent numbers; managers are probed hardest on numbers.</p>`,
  problems: [
    P({
      t: 'Answer "Why do you want to be a manager?" (or "Why stay a tech lead?")', l: 'Medium', tags: ['em-vs-tl', 'motivation'],
      s: 'The hiring manager asks: "Why do you want to manage people rather than stay an engineer?" Give an honest answer with evidence that you already enjoy and are good at the work of managing.',
      ex: `<p>Good shape: ${H.c('g', 'what energises you')} + ${H.c('b', 'evidence you already did some of it')} + ${H.c('y', 'what you will miss and how you handle it')} + ${H.c('p', 'a metric')}.</p>`,
      weak: 'Management is the natural next step in my career and I want more impact and a bigger salary. I have been coding for eight years so it is time.',
      why: 'Career ladder and money are not reasons that predict good management. No evidence of enjoying people work, no awareness of the trade-off, no proof.',
      q: ['Which reason is the strongest signal for an EM loop?', ['It is the next step on the ladder', 'I found I get more energy from my team growing than from my own code, and here is the proof', 'I want to stop doing on-call'], 1, 'Interviewers want intrinsic motivation backed by evidence that you already did management-like work.'],
      h: HINTS('Think of moments you were proudest of someone else\'s success rather than your own code.', 'Give evidence: mentees, onboarding, running a hiring loop, a team process you changed.', 'Name what you will give up (deep coding time) and how you will stay technical enough.'),
      a: `<p><b>Model answer.</b> "Over the last two years as tech lead I noticed my best weeks were not when I shipped something; they were when someone on the team did. I mentored two engineers; one went from struggling in code review to leading our payments retry design and was promoted. I also ran our hiring loop: I rewrote the rubric and our offer-accept rate went from 50% to 75%. I asked my manager to let me run one-on-ones for three engineers for six months as a trial, and the feedback from those three was the most useful I have ever received. <b>What I will miss</b> is long uninterrupted coding. I plan to stay technical by reviewing designs, reading key PRs and doing on-call shadowing, but I will stay off the critical path so I am not a bottleneck. I want to manage because the team's output is a bigger lever than mine."</p><p><b>Red flags avoided:</b> money, title, "control", or "I am tired of coding".</p>`,
      cx: RUB('says honestly why they lead through influence and code, with a mentee outcome.', 'shows intrinsic motivation plus a trial of real manager work and its results.', 'explains why they want to build managers and organisations, with evidence.'),
      f: ['What would make you go back to IC work?', 'What did you learn in the trial that surprised you?']
    })
  ]
});

// ---------- TOPIC 2 ----------
topics.push({
  title: 'One-on-Ones, Feedback and Growing People',
  analogy: `<p>A good <b>gardener</b> visits each plant every week, not only when it is dying. They check the soil, move a pot toward the sun, cut a bit back so it grows stronger. One-on-ones are the weekly visit; feedback is the pruning; a growth plan is deciding where the plant should be in a year and moving the pot a little every week.</p>`,
  explain: `<p><b>The plain idea:</b> interviewers ask "How do you run one-on-ones?", "Tell me about hard feedback you gave", and "How did you grow someone?" They want <b>a repeatable system</b>, not good intentions.</p>
    <ul>
      <li><b>One-on-ones:</b> weekly or biweekly, 30 minutes, <i>their</i> agenda first. Mix of topics: how they feel, blockers, career, feedback both ways. Keep a shared doc so follow-ups are tracked.</li>
      <li><b>Feedback:</b> specific and timely. Use <b>SBI</b>: Situation ("In Tuesday's design review"), Behavior ("you interrupted Lee three times"), Impact ("she stopped sharing ideas"). Then ask, do not lecture: "What was going on for you?"</li>
      <li><b>Praise publicly, correct privately</b>, and give positive feedback far more often than negative.</li>
      <li><b>Growth:</b> a written goal tied to the career ladder ("lead a cross-team design by Q3"), the stretch project that gives the chance, and monthly check-ins. Sponsor them: put their name forward.</li>
    </ul>
    <p><b>Metrics that prove it:</b> promotions on your team, regretted attrition, engagement or "my manager" survey scores over time, and stories where a person's growth changed the team's output.</p>`,
  clues: ['"How do you run your one-on-ones?"', '"Tell me about the hardest feedback you have given"', '"Tell me about someone you grew / promoted"', '"How do you handle a high performer who wants to be promoted too fast?"', '"How do you know your team is happy?"', '"Someone on your team is burning out"', '"Tell me about feedback you received from your reports"'],
  viz: [
    rowViz('Hard feedback, weak to strong (SBI + ask)', 'Building the feedback conversation',
      ['Step', 'What you say', 'Why it works'],
      [
        ['1. Prepare', '(private) facts only: 3 dates, what happened, impact', 'No vague "attitude" claims'],
        ['2. Situation', '"In Tuesday\'s design review..."', 'Concrete moment they can recall'],
        ['3. Behavior', '"...you interrupted Lee three times while she was presenting."', 'Observable, not a judgment of character'],
        ['4. Impact', '"She stopped sharing, and we lost her caching idea, which turned out right."', 'Connects to team outcome'],
        ['5. Ask', '"What was going on for you?"', 'Hear their side; maybe they were stressed'],
        ['6. Agree', '"Next review, can you let people finish and ask one question first?"', 'One clear change'],
        ['7. Follow up', 'Notice and praise it in two weeks', 'Reinforces the change']
      ],
      ['We build hard feedback step by step. Weak version: "You need to be more of a team player." That is vague and judges character.',
        'Prepare with facts. If you only have a feeling, gather examples first.',
        'Situation: name the moment, recently.',
        'Behavior: something a camera could record.',
        'Impact: why it matters for the team, not for you.',
        'Ask: feedback is a conversation. Often you learn a cause you can help with.',
        'Agree one change, small and observable.',
        'Follow up: most managers skip this. Praise when it improves.'],
      'Steps 2 to 4 are <b>SBI</b>. Steps 5 to 7 turn it from a lecture into change. Interviewers listen for the follow-up and the result.', [1, 2, 3, 6])
  ],
  examples: [
    { title: 'A one-on-one template that interviewers like', html: `<p>Shared doc, newest on top, 30 minutes weekly. Their topics come first; status updates stay in tickets.</p>`, code: { lang: 'text', code: '1:1 Ana <> Me   (Mon, 30 min)\n- Your topics first (Ana adds before the meeting)\n- How are you? energy 1-5 this week: 3 (why?)\n- Blockers I can remove\n- Growth goal: lead cache redesign by Q3 -> status: draft RFC 60%\n- Feedback both ways (one thing each)\n- Action items: owner + date\n(Monthly: career; quarterly: look at the ladder together)' } },
    { title: 'Growing a mid engineer to senior', html: `<p>S: Ravi was a strong coder but avoided design. T: help him reach senior within a year. A: we picked the ladder gap ("leads designs across team"), gave him our queue migration as owner with me as reviewer, practiced his design review the day before, and I stayed quiet in the real meeting. R: he led two designs, was promoted in 10 months, and now mentors the new hire. Metric: team design reviews led by people other than me went from 10% to 60%.</p>` },
    { title: 'Weak vs strong: "How do you know your team is happy?"', html: `<p><span class="c-r">Weak:</span> "I have an open-door policy and people would tell me."</p><p><span class="c-g">Strong:</span> "Three signals: the quarterly engagement survey (my team's 'would recommend' went from 62% to 85%), skip-levels my manager runs with my team, and leading indicators in one-on-ones like energy score dropping or people stopping to bring topics. When the survey showed low 'clarity', I started a 15-minute monthly roadmap walkthrough."</p>` }
  ],
  deepDive: `<p><b>Radical candour and its failure modes.</b> Kim Scott's frame: care personally and challenge directly. Failure modes interviewers probe: <i>ruinous empathy</i> (never giving hard feedback, so it shows up as a surprise at review), <i>obnoxious aggression</i> (direct but uncaring), and <i>manipulative insincerity</i>. A strong answer admits which one you drift to and what you do about it.</p>
    <p><b>No surprises at review time.</b> If a rating surprises someone, the manager failed during the year. Say you write notes in one-on-ones and give a mid-cycle check-in so the formal review is a summary.</p>
    <p><b>Burnout.</b> Signals: late-night commits, shorter answers, missed one-on-ones, cynicism. Actions: talk first, then change load (take something off, not just "take a day off"), and fix the system cause (on-call rota, unrealistic deadline). A metric could be pages per person per week, or out-of-hours commits.</p>
    <p><b>High performers</b> leave when they stop growing. Retaining them means a stretch scope and honest promotion timing ("here is the evidence gap, here is the project that closes it"). Never promise a promotion you do not control.</p>`,
  aiEra: `<p><b>AI in people management:</b> some managers use AI to summarise one-on-one notes or draft reviews. Say clearly in an interview that you would never paste private, sensitive people data into an unapproved tool, and that you write the judgment yourself; AI can help polish wording or find patterns across your own notes.</p>
    <p><b>Growth in the AI era:</b> juniors can ship faster with assistants but may skip learning. Strong managers add habits like "explain your diff without the tool", design-first tickets, and pairing. Expect "How do you grow juniors when AI writes much of the code?"</p>
    <p><b>Practice tip:</b> ask an AI to role-play an upset report receiving your feedback, so you practice staying calm and asking questions rather than arguing.</p>`,
  problems: [
    P({
      t: 'Tell me about the hardest feedback you have given', l: 'Medium', tags: ['feedback', 'people'],
      s: 'Interviewer: "Tell me about the hardest piece of feedback you have given to someone on your team. How did they react, and what changed?"',
      ex: `<p>Must include: ${H.c('g', 'specific behavior')}, ${H.c('b', 'impact on team')}, ${H.c('y', 'their reaction and your listening')}, ${H.c('p', 'measurable change')}.</p>`,
      weak: 'I told a developer his code quality was bad. He was upset but eventually he accepted it and improved.',
      why: 'No situation, vague behavior ("bad"), no impact, no listening, no proof of improvement. It sounds like a judgment delivered once.',
      q: ['Which feedback statement is best?', ['"You are not a team player"', '"In Tuesday\'s review you interrupted Lee three times, and she stopped sharing ideas"', '"Everyone thinks you are rude"'], 1, 'SBI: a specific situation, an observable behavior, and the impact. No character judgments, no "everyone thinks".'],
      h: HINTS('Pick a case where the person was good in some ways - feedback to a strong performer is often hardest.', 'Use Situation, Behavior, Impact, then show what you asked and heard.', 'End with what changed, measured, and what you learned about giving feedback.'),
      a: `<p><b>Model answer.</b> "Marco was my most productive senior engineer, but his code reviews were harsh: comments like 'this is wrong, redo'. Two juniors told me in one-on-ones they were avoiding asking him for review. That was the hard part: he was right technically and he was my top performer. I prepared three real review comments. In our one-on-one I said: 'On the retry PR last week (situation), you left eleven comments, most just saying wrong without why (behavior). Jun and Lisa are now routing reviews away from you, so they lose your expertise and you lose review load balance (impact).' Then I asked what was going on. He said he was overloaded and writing fast. We agreed two things: he explains the why in one sentence, and I reduced his review load by adding a rotation. He was defensive for a day, then thanked me. Within a month the juniors were requesting his reviews again; review turnaround on the team dropped from 2 days to 1. I learned to tie hard feedback to something the person cares about - here, his impact."</p>`,
      cx: RUB('gives peer feedback with SBI and shows a change.', 'delivers hard feedback to a strong performer, listens, fixes a system cause, measures the change.', 'coaches their managers to give hard feedback; shows a pattern across teams.'),
      f: ['What if he had refused to change?', 'How do you give feedback to your own manager?']
    })
  ]
});

// ---------- TOPIC 3 ----------
topics.push({
  title: 'Performance Problems: Handling an Underperformer',
  analogy: `<p>A football coach with a player who keeps missing passes does not bench them on day one, and does not pretend it is fine for a whole season. The coach watches the tape, tells the player exactly what is wrong, runs extra drills with them, sets a target for the next three games, and then decides. Fair, clear, and on a clock - that is handling an underperformer.</p>`,
  explain: `<p><b>The plain idea:</b> "Tell me about a time you managed a low performer" is asked in nearly every EM loop. They want to see that you are <b>fair, fast, documented and humane</b>. The arc interviewers expect:</p>
    <ol>
      <li><b>Diagnose before judging.</b> Is it skill, will, clarity, or a life event? Missed expectations are often unclear expectations.</li>
      <li><b>Name it early and specifically.</b> Written examples, the gap against the level's expectations.</li>
      <li><b>Support plan:</b> clear goals for 4 to 8 weeks, help (pairing, smaller scope, training), weekly check-ins with notes.</li>
      <li><b>Formal step if needed:</b> a performance improvement plan (PIP), with HR, measurable goals, and a real chance to succeed.</li>
      <li><b>Outcome:</b> they recover (best), move to a better-fit role, or exit with dignity. All three can be good outcomes.</li>
      <li><b>Protect the team</b> meanwhile: others should not silently carry the load.</li>
    </ol>
    <p><b>Metrics that prove it:</b> time from first signal to clear conversation (weeks, not quarters), the person's measurable output before and after (for example PRs merged that pass review first time, tickets closed on estimate), and team health (others' on-call load, engagement).</p>`,
  clues: ['"Tell me about a time you managed an underperformer"', '"Have you ever had to let someone go?"', '"A team member is not meeting expectations - what do you do?"', '"How do you handle a brilliant jerk?"', '"Someone was performing well and suddenly dropped"', '"Have you put someone on a PIP?"'],
  viz: [
    rowViz('Underperformer timeline: signal to outcome', 'Week-by-week plan',
      ['Week', 'Manager action', 'Evidence kept', 'Red flag if skipped'],
      [
        ['0', 'Notice: 3 missed estimates, 2 PRs reverted', 'Dated notes', 'Waiting a quarter "to be sure"'],
        ['1', 'Diagnose in 1:1: skill? clarity? personal?', 'Their own words', 'Assuming laziness'],
        ['2', 'Clear expectations in writing, tied to level', 'Shared doc of goals', 'Vague "step it up"'],
        ['2-8', 'Support: pairing, smaller scoped tasks, weekly check-in', 'Weekly progress notes', 'No help offered'],
        ['8', 'Review: met goals? If not, formal PIP with HR', 'Goals met / not met', 'Surprise PIP'],
        ['8-14', 'PIP period with real support', 'Weekly written check-ins', 'PIP as paperwork for a decided exit'],
        ['14', 'Outcome: recovered / role change / respectful exit', 'Final summary', 'Team never told how load is covered']
      ],
      ['We plan a fair underperformance process. The clock matters: weeks, not quarters.',
        'Week 0: you notice a pattern, not one bad week. Write down dates and facts.',
        'Week 1: diagnose. Many cases are a life event or unclear goals.',
        'Week 2: put expectations in writing, linked to the level ladder.',
        'Weeks 2 to 8: real support. This is where most people recover.',
        'Week 8: decide. If goals are not met, involve HR for a formal plan. It must not be a surprise.',
        'PIP: it must be achievable. If you have already decided, be honest instead.',
        'Outcome: any of the three can be a good result if handled with dignity.'],
      'Interviewers check <b>speed</b>, <b>fairness</b> (support offered, written goals), <b>no surprises</b>, and <b>team protection</b>.', [1, 3, 6])
  ],
  examples: [
    { title: 'Recovery story (best outcome)', html: `<p>S: Dana, mid-level, missed three sprint commitments in a row and her PRs needed 4+ review rounds. T: find out why and get her back on track. A: in a one-on-one I learned she had moved from frontend and was lost in our Go services, and was embarrassed to ask. We wrote three 6-week goals, paired her with a senior twice a week, and gave her smaller tickets. R: by week 6 review rounds per PR fell from 4.2 to 1.5 and she hit her last two sprint commitments. A year later she owned the service. <b>Learning:</b> I should have asked in week 1 instead of week 4.</p>` },
    { title: 'Exit story (handled with dignity)', html: `<p>Sam's output stayed far below level after 8 weeks of support and a 6-week PIP with clear goals (e.g. ship two medium features with at most two review rounds). He met none. With HR I ended employment, offered a generous transition and a reference for what he did well. I told the team only what was needed, and re-planned his work so nobody silently absorbed it. Team velocity recovered within a sprint; two engineers later said they had felt the drag for months - my learning was to act faster.</p>` },
    { title: 'The brilliant jerk', html: `<p>High output but makes others worse. Strong managers treat <b>behaviour as performance</b>: same process, examples, expectations ("explain the why in reviews, no public put-downs"). A red flag answer: "He was too valuable to lose so I let it go." That tells the interviewer the team pays the price.</p>` }
  ],
  deepDive: `<p><b>Skill vs will vs clarity.</b> A quick diagnostic: could they do it if their life depended on it? If no, it is skill: train or re-scope. If yes, it is will or clarity: are expectations written and understood? Is something outside work going on? Each needs a different response, and interviewers like to hear you distinguish them.</p>
    <p><b>Legal and HR reality.</b> In most companies you must involve HR before a formal plan, keep written records, and treat people consistently. In some countries (much of Europe) processes are longer and more formal. Saying "I partnered with HR and followed the process" is good; saying "HR handled it" is a red flag that you outsourced your job.</p>
    <p><b>Leave and protected situations.</b> If someone is on medical or parental leave, or reveals a health issue, performance steps change; you pause and get HR guidance. Mentioning this sensibly shows maturity.</p>
    <p><b>The team watches.</b> High performers notice when low performance is ignored, and it drives regretted attrition. Fast, fair action is also a retention move. But confidentiality matters: never discuss the details with others.</p>`,
  aiEra: `<p><b>AI and performance signals:</b> some tools now report PR counts, cycle time and AI-assist usage per engineer. Good managers use these only as prompts for a conversation, never as the verdict; metrics are easy to game and miss the glue work. Say this if asked about "productivity metrics".</p>
    <p><b>New failure mode:</b> an engineer who ships lots of AI-generated code that others have to fix. The output looks high, but review load and incidents shift onto teammates. Treat it like any performance issue: show the evidence (reverts, review rounds), set the expectation (you own and can explain every line), and support them.</p>
    <p><b>Do not</b> paste private performance details into public AI tools when drafting documents.</p>`,
  problems: [
    P({
      t: 'Handle an underperformer scenario', l: 'Hard', tags: ['performance', 'pip', 'people'], co: ['Amazon', 'Meta', 'Google'],
      s: 'Scenario: you just took over a team of 7. A senior engineer, Leo, has been "meets low" for two cycles. His previous manager never told him directly. Peers are quietly re-doing his work. Walk me through exactly what you do in your first 90 days.',
      ex: `${H.table(['Phase', 'Key move'], [['Days 1-14', 'Listen, gather facts, diagnose'], ['Days 15-30', 'Clear, written expectations'], ['Days 30-75', 'Support and weekly tracking'], ['Day 75+', 'Decide: recovered, re-scope, or formal plan']])}`,
      weak: 'I would put him on a PIP right away because two cycles of low performance is enough evidence. The team deserves better.',
      why: 'Leo was never told; a PIP now is a surprise and unfair. No diagnosis, no support, no HR, no plan for the team carrying the load.',
      q: ['What is your first move with a struggling engineer who was never given direct feedback?', ['Start a PIP immediately', 'Have a clear, specific conversation and diagnose the cause', 'Ignore it until the next review'], 1, 'Fairness first: he must hear the gap clearly and get a chance to fix it. A surprise PIP harms trust across the whole team.'],
      h: HINTS('He was never told directly - so the clock starts with your first clear conversation, not with his history.', 'Separate skill, will, clarity and personal factors; each needs a different plan.', 'Lay out phases with dates, written goals, support, HR involvement and how you protect the team.'),
      a: `<p><b>Model answer.</b> "<b>Days 1-14:</b> I meet everyone, including Leo, and ask open questions. I look at concrete evidence: reverted PRs, missed estimates, peer comments. I learn Leo was moved onto a new stack a year ago and was given no ramp-up, and his old manager left feedback only in ratings. <b>Day 15:</b> clear conversation. I say the gap plainly, with three examples, link it to the senior ladder, and acknowledge he was not told before - that is on the company, not him. I ask his view. <b>Day 20:</b> we write three goals for 8 weeks: own one medium feature end to end, PRs passing review in at most two rounds, lead one design review. Support: pairing twice a week with our strongest engineer on the new stack, a course, and I take him off the on-call rotation for a month. Weekly check-ins with written notes. I tell HR early so we are aligned. <b>Team:</b> I stop the silent rework - reviews go back to Leo, and I rebalance the plan so peers are not covering. <b>Day 75:</b> decide. If he met the goals, great - I say so in writing. If he improved but is not at senior, we discuss a level-appropriate role honestly. If no progress, a formal PIP with HR and the same support. In a similar real case, the engineer met two of three goals by week 8 and was solidly at level by the next cycle; peer rework dropped to zero."</p>`,
      cx: RUB('raises the issue with the manager and supports peers with pairing.', 'runs a fair, documented, time-boxed process with HR and protects the team.', 'also fixes the system that let feedback be skipped for two cycles (manager training, calibration).'),
      f: ['What if Leo says he is dealing with a family illness?', 'How do you tell the team without breaking confidentiality?', 'What if your director wants him gone now?']
    })
  ]
});

// ---------- TOPIC 4 ----------
topics.push({
  title: 'Hiring and Team Building',
  analogy: `<p>Building a team is like assembling a <b>band</b>. Ten great guitarists do not make a band; you need a drummer, a bass, a singer, and people who can play together. Before auditions you decide what the band needs, you give every candidate the same song, and you judge against a score sheet - not on whether they remind you of yourself.</p>`,
  explain: `<p><b>The plain idea:</b> managers are judged by the teams they build. Expect "Design an interview loop for a senior backend engineer", "Tell me about a bad hire", "How do you close a candidate?", and "How do you onboard?". Show a system:</p>
    <ul>
      <li><b>Define the role from team gaps:</b> what skills does the team lack for the next year? Write must-haves vs nice-to-haves.</li>
      <li><b>Structured loop:</b> each interviewer owns specific competencies, uses the same questions and a written rubric, and submits feedback <i>before</i> the debrief to avoid groupthink.</li>
      <li><b>Calibrated bar:</b> a debrief led by evidence, not votes ("strong yes because..."). One strong no with evidence matters.</li>
      <li><b>Closing:</b> know what the candidate cares about (growth, mission, flexibility, money), sell honestly, move fast.</li>
      <li><b>Onboarding:</b> a 30/60/90 plan, a buddy, first PR in week 1, first on-call shadow in month 1.</li>
      <li><b>Team building:</b> mix of seniority (avoid all-senior or all-junior), roles, backgrounds; clear team charter.</li>
    </ul>
    <p><b>Metrics that prove it:</b> offer-accept rate, time-to-fill, stage pass-through rates, interviewer calibration (do strong-yes hires actually perform?), time to first PR, 6-month performance and retention of hires, pipeline diversity.</p>`,
  clues: ['"Design an interview loop for..."', '"Tell me about a bad hire you made"', '"How do you raise the hiring bar?"', '"How do you build a diverse team?"', '"How do you onboard a new engineer?"', '"You need to grow the team from 4 to 12 in a year"', '"A candidate has two other offers - how do you close?"'],
  viz: [
    rowViz('Plan a hiring loop: senior backend engineer', 'Loop design (each interviewer owns competencies)',
      ['Stage', 'Owner', 'Competency', 'Pass signal'],
      [
        ['Recruiter screen (30m)', 'Recruiter', 'Logistics, motivation, level fit', 'Clear why-us, matches level'],
        ['Tech screen (60m)', 'Senior eng', 'Coding fluency, testing', 'Working, tested code; explains trade-offs'],
        ['System design (60m)', 'Staff eng', 'Design at scale, trade-offs', 'Drives design; handles failure modes'],
        ['Code review / debugging (45m)', 'Senior eng', 'Real-world code judgment', 'Finds key bug, kind and clear comments'],
        ['Behavioral (45m)', 'EM peer', 'Ownership, conflict, mentoring', 'STAR with metrics; mentors others'],
        ['Hiring manager (45m)', 'You', 'Team fit to gaps, growth, close', 'Fills a named team gap'],
        ['Debrief', 'You (chair)', 'Evidence-based decision', 'Written feedback before discussion']
      ],
      ['We design a structured loop. Start from the team gap: we need someone who can own the data pipeline and mentor two juniors.',
        'Recruiter screen filters for level and motivation, saving engineer time.',
        'Tech screen: same problem for all candidates, rubric written in advance.',
        'Design: a senior hire must drive a design, not follow one.',
        'Code review round: closer to the real job than puzzles, and tests mentoring tone.',
        'Behavioral: owned by a peer manager to reduce your bias.',
        'Hiring manager: is this the person for <i>our</i> gap, and what will make them say yes?',
        'Debrief: everyone writes feedback first, then discuss evidence. You decide, and record why.'],
      'Each competency is owned by exactly one round, every round has a rubric, and the debrief uses evidence. Track pass-through per stage to find a broken round.', [1, 2, 6])
  ],
  examples: [
    { title: 'Bad hire, owned well', html: `<p>"I hired a senior engineer who interviewed brilliantly on design but struggled to work with others. Looking back, our loop had no signal for collaboration - our behavioral round was unstructured. I handled the performance side (feedback, plan; he left after 5 months), and fixed the loop: added a code-review round and a structured behavioral rubric. In the next 8 hires, none had a collaboration issue in their first year." Red flag to avoid: blaming the recruiter or the candidate.</p>` },
    { title: 'Scaling from 4 to 12 in a year', html: `<p>Plan: hire 2 seniors first (they become interviewers and mentors), then a mix of mid and junior. Train 6 interviewers with shadow and reverse-shadow. Track funnel weekly. Result: 8 hires in 11 months, offer-accept 72%, every hire's first PR within 5 days, one regretted leaver. Watch out: hiring too fast dilutes culture and buries seniors in interviews - cap interviews at 3 per engineer per week.</p>`, code: { lang: 'text', code: 'Funnel (Q1-Q4)\napplied/sourced 640 -> recruiter screen 160 (25%)\n-> tech screen 70 (44%) -> onsite 26 (37%)\n-> offer 11 (42%) -> accepted 8 (72%)\nWeak stage? tech screen pass 44% vs target 30%: screen too easy,\nso onsite time was wasted. Fix: harder rubric -> onsite pass 55%' } },
    { title: 'Closing a candidate with competing offers', html: `<p>Find out early what matters to them. One candidate cared about growing into a TL: I described the exact project she would lead, introduced her to the engineer she would partner with, and gave a decision within 24 hours of the onsite. She picked us over a higher cash offer. Never pressure with fake deadlines or overpromise promotions.</p>` }
  ],
  deepDive: `<p><b>Structured interviews predict performance better</b> than unstructured chats: same questions, scoring anchors, independent written feedback. This is also the fairest approach and reduces bias ("culture fit" as "like me"). Prefer "culture add": what does this person bring the team lacks?</p>
    <p><b>Calibrating interviewers.</b> Track each interviewer's yes rate and how their hires perform. Someone who says yes to 80% is not filtering; someone at 5% may be blocking good candidates. Pair new interviewers with experienced ones (shadow, then reverse shadow).</p>
    <p><b>Headcount planning.</b> Managers argue for headcount with a business case: what will we not deliver without it, what is the cost of delay? Also consider alternatives: reduce scope, automate, borrow from another team.</p>
    <p><b>Team topology.</b> Healthy team size is usually 5 to 9 engineers. Past that, communication paths grow fast (n(n-1)/2: 8 people = 28 paths, 12 = 66) and you split into two teams with clear ownership. Seniority mix matters: too many juniors overloads seniors with mentoring; all seniors can mean nobody wants the routine work.</p>`,
  aiEra: `<p><b>AI in hiring (2026):</b> candidates use AI to prepare, and some try to use it live. Many companies moved to formats that are harder to fake: code review of real code, debugging, discussion of trade-offs, and onsite or proctored rounds. Some companies now <i>allow</i> AI tools in a coding round and grade how well the candidate directs and checks them. Have a view on which you would choose and why.</p>
    <p><b>Screening tools:</b> AI resume screeners can encode bias. A strong manager would audit pass-through by group and keep humans in the decision. Mention fairness and legal rules (for example, rules on automated hiring decisions in some places).</p>
    <p><b>Hiring profile shifts:</b> with AI assistants, managers are weighting judgment, review skill, system thinking and communication more than raw typing speed.</p>`,
  problems: [
    P({
      t: 'Plan a hiring loop for your first senior hire', l: 'Medium', tags: ['hiring', 'loop-design'],
      s: 'You have budget for one senior engineer. Your team of 5 has two juniors and no one who has run production databases. Design the hiring loop and say how you would know if it works.',
      ex: `<p>Start from the gap: ${H.c('g', 'database ownership')} + ${H.c('b', 'mentoring juniors')}. Each round owns one competency, each has a rubric, debrief uses written evidence.</p>`,
      weak: 'I would do a coding round, a system design round and a culture-fit chat with me, and hire the smartest person.',
      why: 'Not tied to the team gap (databases, mentoring). "Smartest" and "culture fit" invite bias. No rubric, no debrief process, no metric to check the loop.',
      q: ['What makes a hiring loop structured?', ['Interviewers chat freely and vote', 'Each round owns specific competencies with a rubric, and written feedback comes before the debrief', 'The manager decides alone'], 1, 'Structure means owned competencies, consistent questions, scoring anchors and independent feedback before discussion.'],
      h: HINTS('Write down the team gap first: what can nobody on the team do today?', 'Give each round one or two competencies and a rubric with what strong vs weak looks like.', 'Name the metrics you will track: pass-through per stage, offer-accept, how hires perform at 6 months.'),
      a: `<p><b>Model answer.</b> "The gap is production data ownership and mentoring, so the must-haves are: has owned a database in production (migrations, incidents), can design for data growth, and has mentored. Loop: <b>(1) recruiter screen</b> for level and motivation; <b>(2) technical screen</b> - a data-heavy coding problem with tests; <b>(3) system design</b> - design a ledger with migrations and backfill, owned by our staff engineer; <b>(4) incident deep-dive</b> - 'tell me about a database incident you ran', probing for ownership and postmortem; <b>(5) code review round</b> - they review a junior's PR, which tests mentoring tone; <b>(6) hiring manager</b> - growth, motivation, and closing. Each interviewer writes feedback against a rubric before the debrief. I chair the debrief and decide with evidence. I would train two team members as interviewers first. <b>How I know it works:</b> stage pass-through (if onsite pass rate is under 25%, the screen is too loose), offer-accept above 65%, time-to-fill under 8 weeks, and the hire's 6-month review plus whether juniors' review rounds drop. In my last loop redesign, offer-accept went from 55% to 78%."</p>`,
      cx: RUB('designs and calibrates one or two rounds, trains interviewers.', 'designs the whole loop from team gaps, runs the debrief, tracks funnel metrics.', 'designs hiring systems across teams, calibrates bars between managers.'),
      f: ['How would you reduce bias in the debrief?', 'The best candidate is weak in one round - hire or not?']
    })
  ]
});

// ---------- TOPIC 5 ----------
var JS_CAP = "// Quarter capacity planner: how much roadmap can the team really commit to?\nconst team = [\n  { name: 'Ana', weeks: 13, onCallWeeks: 2, leaveWeeks: 1 },\n  { name: 'Ravi', weeks: 13, onCallWeeks: 2, leaveWeeks: 2 },\n  { name: 'Dana', weeks: 13, onCallWeeks: 2, leaveWeeks: 0 },\n  { name: 'New hire', weeks: 8, onCallWeeks: 0, leaveWeeks: 0, rampFactor: 0.5 },\n];\nconst KTLO = 0.2;      // 20% keep-the-lights-on: bugs, upgrades, support\nconst BUFFER = 0.15;   // 15% for surprises; plans without buffer slip\n\nlet available = 0;\nfor (const p of team) {\n  const w = (p.weeks - p.onCallWeeks - p.leaveWeeks) * (p.rampFactor || 1);\n  available += w;\n  console.log(p.name.padEnd(9), 'focus weeks:', w.toFixed(1));\n}\nconst roadmap = available * (1 - KTLO) * (1 - BUFFER);\nconsole.log('Total focus weeks :', available.toFixed(1));\nconsole.log('After KTLO + buffer:', roadmap.toFixed(1), 'engineer-weeks for the roadmap');\n\nconst asks = [ ['Checkout v2', 18], ['Fraud rules', 10], ['Admin export', 6], ['Dark mode', 5] ];\nlet used = 0;\nfor (const [item, cost] of asks) {\n  const fits = used + cost <= roadmap;\n  if (fits) used += cost;\n  console.log((fits ? 'COMMIT ' : 'CUT    ') + item.padEnd(13) + cost + ' wks');\n}\nconsole.log('Committed', used, 'of', roadmap.toFixed(1), '- say no to the rest with a date when it could fit.');\n";

topics.push({
  title: 'Execution: Planning, Prioritization and Managing Risk',
  analogy: `<p>Planning a long <b>road trip</b> with a family: you know the car's real range, you add time for stops and traffic, you decide which sights are must-see and which you skip, and you check the map every few hours instead of only at the end. When a road closes, you tell everyone early and choose a new route. Execution is the same: honest capacity, clear priorities, early warnings.</p>`,
  explain: `<p><b>The plain idea:</b> execution questions ask whether your team delivers <b>predictably</b> and whether you make <b>hard choices</b> instead of making people work weekends. They sound like "Tell me about a project that was going to miss its date", "How do you plan a quarter?", "How do you prioritize between features, tech debt and bugs?".</p>
    <ul>
      <li><b>Capacity first:</b> real focus weeks after on-call, leave, ramp-up, keep-the-lights-on (often 15 to 30%) and a buffer.</li>
      <li><b>Prioritize openly:</b> rank by impact on a goal (OKR) vs cost; say what is <i>not</i> happening and when it might.</li>
      <li><b>Milestones and risk:</b> slice into demo-able milestones; keep a risk log with owner, likelihood, mitigation; attack the riskiest unknown first (spike, prototype).</li>
      <li><b>Track and communicate:</b> weekly status with green / yellow / red and what changed. Bad news early, with options (cut scope, add time, add people - rarely works late).</li>
    </ul>
    <p><b>Metrics that prove it:</b> say/do ratio (delivered vs committed), forecast error at milestones, DORA metrics (lead time, deploy frequency, change-fail rate, time to restore), and the share of time on planned vs unplanned work.</p>`,
  clues: ['"Tell me about a project that was at risk of missing its deadline"', '"How do you plan a quarter / run planning?"', '"How do you balance tech debt, bugs and features?"', '"Leadership wants a date tomorrow - what do you say?"', '"The scope keeps growing"', '"How do you measure your team\'s productivity?"', '"Prioritization exercise: here are 8 asks and capacity for 3"'],
  code: [{ lang: 'js', title: 'Quarter capacity planner (runnable)', run: true, code: JS_CAP }],
  codeTitle: ['Capacity planner: focus weeks minus KTLO and buffer, then commit or cut roadmap items'],
  viz: [
    {
      title: 'Capacity waterfall: why the team cannot do everything',
      input: '5,13,20,15',
      inputLabel: 'engineers, weeks in quarter, KTLO %, buffer % (comma separated)',
      gen: function (input) {
        var p = String(input || '').split(',').map(function (x) { return Number(x.trim()); });
        if (p.length !== 4 || p.some(function (x) { return !isFinite(x) || x < 0; })) throw new Error('Use four numbers like 5,13,20,15');
        var eng = Math.min(p[0], 50), wk = Math.min(p[1], 26), ktlo = Math.min(p[2], 90), buf = Math.min(p[3], 90);
        var raw = eng * wk;
        var oncall = Math.round(eng * 2);
        var leave = Math.round(eng * 1);
        var focus = raw - oncall - leave;
        var afterK = Math.round(focus * (1 - ktlo / 100));
        var road = Math.round(afterK * (1 - buf / 100));
        var labels = ['Raw', 'On-call', 'Leave', 'KTLO', 'Buffer', 'Roadmap'];
        var vals = [raw, raw - oncall, focus, afterK, road, road];
        var notes = [
          'Raw capacity: ' + eng + ' engineers x ' + wk + ' weeks = <b>' + raw + '</b> engineer-weeks. Naive plans stop here and overcommit.',
          'Minus on-call (~2 weeks each): ' + (raw - oncall) + '. On-call engineers rarely do roadmap work.',
          'Minus leave and holidays (~1 week each): ' + focus + '.',
          'Minus ' + ktlo + '% keep-the-lights-on (bugs, upgrades, support): ' + afterK + '.',
          'Minus ' + buf + '% buffer for surprises: <b>' + road + '</b>.',
          'Only <b>' + road + ' of ' + raw + '</b> engineer-weeks (' + Math.round(100 * road / Math.max(raw, 1)) + '%) can go to the roadmap. Commit to that, rank the rest and say no with a date.'
        ];
        var frames = [];
        for (var i = 0; i < labels.length; i++) {
          var h = {}; h[i] = i === labels.length - 1 ? 'sel' : 'cur';
          frames.push({ narr: notes[i], parts: [{ type: 'bars', label: 'Engineer-weeks left', values: vals.slice(0, i + 1), idxLabels: labels.slice(0, i + 1), texts: vals.slice(0, i + 1).map(String), hl: h }] });
        }
        return frames;
      }
    },
    rowViz('Project going red: weak vs strong response', 'Week 6 of 12: you are 3 weeks behind',
      ['Option', 'What happens', 'Verdict'],
      [
        ['Hide it, work weekends', 'Burnout, quality drops, still late, trust lost', 'Red flag'],
        ['Add 3 engineers now', 'Ramp-up slows the team (Brooks\'s law)', 'Rarely works late'],
        ['Cut scope', 'Ship core on date, rest in v1.1', 'Often best'],
        ['Move the date', 'Full scope, later; costs partners', 'OK if cost of delay is low'],
        ['Tell stakeholders today with options', 'They choose with you, trust grows', 'Always do this']
      ],
      ['You find the project 3 weeks behind at the halfway point. What do strong managers do?',
        'Hiding and heroics: the classic red flag answer.',
        'Adding people late usually makes it later because new people need help.',
        'Cutting scope keeps the date and delivers the most value first.',
        'Moving the date is honest when the full scope truly matters more.',
        'Whatever you choose, tell stakeholders now, with options and a recommendation.'],
      'The strong answer combines <b>early communication</b> with a <b>clear recommendation</b> (usually cut scope), backed by data.', [2, 4])
  ],
  examples: [
    { title: 'Missed-date story told well', html: `<p>S: 6-month payments migration; at month 3 our forecast showed 7 weeks late because a partner API was slower than expected. T: deliver with least harm. A: I told my director and the partner team that week with three options and a recommendation: ship the card flow on time, move bank transfers 5 weeks later. I added a weekly forecast to our status, and ran a spike on the riskiest remaining piece first. R: cards shipped on the original date (80% of volume), transfers 4 weeks later, no weekend work, no SEV-1. Forecast error after the reset stayed under 1 week.</p>` },
    { title: 'Prioritization exercise: 8 asks, capacity for 3', html: `${H.table(['Ask', 'Goal it serves', 'Impact', 'Cost (wks)', 'Decision'], [['Fix checkout timeouts', 'Revenue OKR', 'High', '3', 'Do now'], ['Fraud rules v2', 'Loss OKR', 'High', '6', 'Do now'], ['Upgrade DB (end of support in 4 months)', 'Risk', 'High (risk)', '4', 'Do now - deadline is real'], ['CEO\'s dashboard idea', 'None stated', 'Unclear', '5', 'Ask for the goal; next quarter'], ['Dark mode', 'NPS', 'Low', '5', 'No, revisit Q3'], ['Admin CSV export', 'Support cost', 'Medium', '1', 'Fold into KTLO'], ['New microservice rewrite', 'Dev speed', 'Unclear', '12', 'Write RFC first'], ['Partner API', 'Partnership', 'Medium', '6', 'Next quarter, tell partner date']])}<p>Say the "no" list out loud with dates. That is what interviewers listen for.</p>` },
    { title: 'Weak vs strong: "How do you measure productivity?"', html: `<p><span class="c-r">Weak:</span> "Story points per sprint and lines of code."</p><p><span class="c-g">Strong:</span> "Outcomes first (did the metric we targeted move?), then flow: DORA lead time and change-fail rate, say/do ratio per quarter, and the share of unplanned work. I never compare engineers by points. When unplanned work hit 40%, we fixed alert noise and it fell to 20%, which freed a person's worth of capacity."</p>` }
  ],
  deepDive: `<p><b>Estimation honesty.</b> Give ranges with confidence ("6 to 9 weeks, 80% confident") and narrow them as unknowns are retired. Plan to the riskiest unknown first: a two-day spike that kills a bad assumption is worth more than two weeks of easy tickets.</p>
    <p><b>The iron triangle.</b> Scope, time, resources (and quality, which should not flex). When something gives, make it a visible decision by the right person, not an accident. Brooks's law: adding people to a late project often makes it later because of ramp-up and communication cost.</p>
    <p><b>Tech debt allocation.</b> Common patterns: a fixed 15 to 25% each sprint, or debt items that are ranked against features using the same impact measure (incidents caused, hours lost, lead time). Interviewers like debt tied to a metric, not "engineers want to refactor".</p>
    <p><b>Frameworks to name, not worship:</b> OKRs for goals, RICE (reach, impact, confidence, effort) or cost of delay for ranking, RAID logs (risks, assumptions, issues, dependencies), pre-mortems ("it is 3 months later and we failed - why?"). Say how you used one and what it changed.</p>`,
  aiEra: `<p><b>AI and delivery:</b> AI assistants can speed up coding, but in many teams the bottleneck moves to review, testing and integration. Strong managers re-measure: did lead time actually drop, or just PR count? Did change-fail rate rise? Plan capacity with data from your own team, not vendor claims.</p>
    <p><b>Planning with AI:</b> it is useful for drafting risk lists, pre-mortems and status summaries from tickets. You still own the judgment: which risk is real, what to cut, what to tell the VP.</p>
    <p><b>Interview angle:</b> "Your CEO says AI should make the team 2x faster - commit to double the roadmap?" Strong answer: run a measured pilot, plan with observed gains, protect quality metrics.</p>`,
  problems: [
    P({
      t: 'Prioritization exercise: too many asks, one team', l: 'Hard', tags: ['prioritization', 'execution', 'planning'], co: ['Google', 'Stripe'],
      s: 'You lead a team of 6. For next quarter you have asks from Sales (enterprise SSO), Support (bulk export), your Director (migrate off a database whose support ends in 5 months), Product (new onboarding flow, tied to the activation OKR) and your engineers (pay down flaky tests that block deploys 3 times a week). Capacity covers about half. Walk me through how you decide and communicate.',
      ex: `<p>Recipe: ${H.c('g', 'capacity')} → ${H.c('b', 'rank by goal impact and cost of delay')} → ${H.c('y', 'hard deadlines first')} → ${H.c('p', 'say no with dates')}.</p>`,
      weak: 'I would try to fit everything in by asking the team to work extra hard and splitting people across all five projects.',
      why: 'No ranking, no capacity view, spreading people thin slows everything, and heroics burn people out. Stakeholders get surprised later.',
      q: ['With capacity for half the asks, which item usually goes first?', ['The loudest stakeholder\'s ask', 'Work with a hard external deadline or one that unblocks everything else', 'The most fun project'], 1, 'Hard deadlines (end of support) and force multipliers (flaky tests blocking deploys) often come first because their cost of delay is highest.'],
      h: HINTS('Start with real capacity, then look for hard deadlines and force multipliers.', 'Rank the rest by impact on company goals and cost of delay; ask Sales for the revenue number.', 'Communicate: one page, all stakeholders, what is in, what is out, and when the out items could happen.'),
      a: `<p><b>Model answer.</b> "<b>1. Capacity:</b> 6 people x 13 weeks = 78 engineer-weeks; minus on-call, leave, 20% KTLO and 15% buffer, about 40 weeks for the roadmap. <b>2. Hard deadline:</b> the database end of support is a real risk - 12 weeks, committed. <b>3. Force multiplier:</b> flaky tests blocking deploys three times a week cost roughly 2 engineer-days weekly; 3 weeks to fix pays back within the quarter - committed. <b>4. Rank the rest by goal and cost of delay:</b> onboarding flow ties to the activation OKR (estimate +3 points activation) - 16 weeks, committed. SSO: I ask Sales which deals depend on it; if it is one deal worth $400k this quarter, that changes things; if it is 'nice to have', it moves to next quarter. Bulk export: a 1-week CSV version folded into KTLO. <b>5. Communicate:</b> a one-page plan with in/out/when, reviewed with my director and each stakeholder before planning ends, so nobody is surprised. <b>6. Track:</b> monthly re-check, and I keep the 15% buffer honest. Outcome in a real version of this: we hit 4 of 4 commitments, deploy blocks fell from 3 a week to under 1, and Sales got SSO in the next quarter with a date they could promise the customer."</p>`,
      cx: RUB('ranks technical work and explains the trade-offs to the EM.', 'owns capacity, ranking and stakeholder communication with metrics.', 'aligns several teams\' plans to company goals and reallocates people.'),
      f: ['Sales escalates to the VP. What now?', 'The DB migration is going to take 16 weeks, not 12. What do you cut?']
    })
  ]
});

// ---------- TOPIC 6 ----------
topics.push({
  title: 'Cross-Team Conflict and Managing Up and Sideways',
  analogy: `<p>Two neighbours share a driveway. One parks across it every morning; the other keeps honking. Shouting does not work, and calling the landlord on day one makes things worse. What works: knock, find out why (an early shift?), agree a simple rule together, and only call the landlord if the rule keeps getting broken - and then call together, with the facts. Conflicts between teams are shared-driveway problems.</p>`,
  explain: `<p><b>The plain idea:</b> as a manager or TL you represent your team in fights over priorities, ownership, on-call, APIs and deadlines. Interviewers want to see you protect your team <i>without</i> creating an us-vs-them culture. A good pattern:</p>
    <ol>
      <li><b>Assume good intent and find their constraint.</b> The other team has its own goals and pressure.</li>
      <li><b>Make the shared goal and the facts visible</b> - data, not complaints (pages per week, days blocked, customer impact).</li>
      <li><b>Propose options</b> that work for both (shared on-call rules, API contract, joint milestone).</li>
      <li><b>Escalate together, not around.</b> If still stuck, write a short joint escalation: problem, options, each side's view, decision needed, by when. Escalation is a normal tool, not a failure.</li>
      <li><b>Disagree and commit</b> once decided, and tell your team the why so they commit too.</li>
    </ol>
    <p><b>Managing up:</b> no surprises for your manager, bring problems with options, share bad news early. <b>Managing sideways:</b> regular syncs with peer managers and product partners, especially your PM.</p>
    <p><b>Metrics that prove it:</b> days blocked on other teams, number of escalations, cross-team incidents or pages, delivery of joint milestones, partner team satisfaction.</p>`,
  clues: ['"Tell me about a conflict between your team and another team"', '"Another team keeps missing deliverables you depend on"', '"You disagree with your manager\'s / director\'s decision"', '"How do you work with your product manager?"', '"When do you escalate?"', '"Two of your senior engineers disagree strongly"', '"Disagree and commit"'],
  viz: [
    rowViz('Conflict between two teams: from blame to agreement', 'Search team vs Ads team over noisy alerts',
      ['Step', 'Move', 'Evidence / artifact'],
      [
        ['1. Notice', 'Ads changes keep paging Search on-call at night', 'Pages: 31/week, 60% traced to Ads deploys'],
        ['2. Talk 1:1', 'Coffee with Ads EM: what is their pressure?', 'They ship 10x/day to hit a revenue OKR'],
        ['3. Shared goal', 'Both want fewer incidents and fast deploys', 'One joint doc, both names on it'],
        ['4. Options', 'Canary + auto-rollback; contract tests; shared SLO', 'Cost and owner for each'],
        ['5. Decide', 'Contract tests in Ads CI + canary (2 sprints each team)', 'Signed by both EMs'],
        ['6. If stuck', 'Joint escalation to both directors (not around)', 'One page: problem, options, ask'],
        ['7. Result', 'Pages 31 → 9 per week, Ads deploy speed unchanged', 'Monthly joint review']
      ],
      ['A classic manager conflict. Weak version: "Their team was careless so I escalated to their director." That is blame and going around.',
        'Notice with data, not anger.',
        'Talk first, privately. Find their constraint.',
        'Name the shared goal so it is "us vs the problem".',
        'Bring options, each with a cost.',
        'Decide and write it down with both names.',
        'Escalation is fine when stuck: do it together, with a written ask.',
        'Close the loop with a metric and a follow-up ritual.'],
      'Strong conflict stories show <b>empathy for the other side</b>, <b>data</b>, a <b>joint decision</b> and a <b>metric</b>. No villains.', [2, 4, 6])
  ],
  examples: [
    { title: 'Disagreeing with your director', html: `<p>My director wanted to promise a launch in 6 weeks; my estimate was 10. I showed the plan, the three biggest risks, and two options (smaller scope in 6, full in 10). She chose 6 with smaller scope for a press deadline I had not known about. I committed, explained the reason to the team, and we shipped the smaller scope on time. <b>Lesson:</b> disagreement with data plus a real commit after the decision.</p>` },
    { title: 'Two senior engineers in a design fight', html: `<p>Two seniors argued for weeks over event-sourcing vs a simple CRUD service. I set a decision process: each wrote one page with criteria agreed up front (team skills, query needs, time to ship), a staff engineer from another team reviewed, and I set a date. CRUD won on the criteria; the event-sourcing proponent led the audit-log part. Both stayed engaged. Red flag answer: "I just picked one" or "I let them fight it out."</p>` },
    { title: 'Working with your PM', html: `<p>Strong EMs describe the PM as a partner, not a requester: weekly sync, shared roadmap doc, the PM owns <i>what and why</i>, the EM owns <i>how and when</i>, and both own outcomes. When a PM keeps adding scope, show the trade-off on the capacity plan rather than saying no in the abstract.</p>` }
  ],
  deepDive: `<p><b>Why conflict between teams happens:</b> misaligned goals (their OKR rewards speed, yours rewards stability), unclear ownership (two teams think the other owns a service), and invisible costs (their deploy causes your pages). Fix the structure, not only the incident: shared SLOs, ownership maps (a service catalog), and API contracts.</p>
    <p><b>Escalation done well.</b> Amazon's phrase "escalation is not a failure" is common. A good escalation is joint, short, written, includes each side's view fairly, and asks for a specific decision by a date. Going over a peer's head without telling them burns trust permanently.</p>
    <p><b>Disagree and commit.</b> After a decision, you support it publicly. You can keep a note of your concern and a metric that would trigger a review. Undermining a decision in front of your team ("leadership made us do this") is a major red flag.</p>
    <p><b>Protecting the team vs shielding it.</b> Protect from thrash (random asks, constant re-prioritization) but do not hide context; teams that never see business pressure make poor trade-offs. Share the why, filter the noise.</p>`,
  aiEra: `<p><b>New conflict sources in 2026:</b> teams disagree about AI tool policy (one team ships AI-generated code fast; the platform team owns the incidents), data access for AI features, and who owns shared AI services or model costs. The same pattern works: shared goal, data (incident rate, cost per call), options, joint decision.</p>
    <p><b>Using AI to prepare:</b> ask it to steelman the other team's position before a hard conversation: <code>I lead Search. Ads deploys page us at night. Write the strongest case from the Ads EM's point of view.</code> It helps you walk in curious instead of angry.</p>
    <p><b>Watch:</b> do not use AI-written messages for delicate conflict; tone matters and people can tell.</p>`,
  problems: [
    P({
      t: 'Resolve a conflict between two teams', l: 'Hard', tags: ['conflict', 'cross-team', 'escalation'], co: ['Amazon', 'Microsoft'],
      s: 'Your team depends on the Identity team for a new login API. They have slipped twice, and your launch is in 8 weeks. Your engineers are frustrated and one says in a meeting "Identity is incompetent". Their EM says your request was never on their roadmap. What do you do?',
      ex: `<p>Two jobs at once: ${H.c('g', 'solve the dependency')} and ${H.c('r', 'stop us-vs-them on your own team')}.</p>`,
      weak: 'I would escalate to their director immediately, since they keep slipping and are blocking our launch. My team is right to be frustrated.',
      why: 'Escalates around a peer before talking, accepts blaming language, ignores that the request may never have been agreed. No options, no data.',
      q: ['Their EM says your request was never on their roadmap. Best first step?', ['Escalate to their director', 'Meet their EM, find out how the request was lost, and build options together', 'Build the API yourself without telling them'], 1, 'Start with understanding: there was likely an alignment gap. Escalate jointly only if you cannot agree.'],
      h: HINTS('Two problems: the dependency, and your team\'s blame culture. Address both.', 'Find out why it was never on their roadmap - a planning gap on your side counts too.', 'Bring options (they build, you build with their review, reduced scope, move date) and escalate jointly only if stuck.'),
      a: `<p><b>Model answer.</b> "<b>My team first:</b> after the meeting I talked to the engineer privately: frustration is fair, but 'incompetent' is not how we talk about peers. In the next team meeting I owned my part: I had raised the need in a Slack thread, never in their planning. <b>Then their EM:</b> I asked how their quarter looked. They were committed to an SSO deadline for a large customer. Our ask had genuinely never been agreed. <b>Options:</b> (a) they build it next quarter - misses our launch; (b) one of my engineers builds the endpoint in their codebase with their review and they own it after; (c) we launch with the existing login and add the new flow in a fast follow. We picked (b) with a 2-week time box, plus their engineer spent 2 hours a week reviewing. I wrote it up and both directors saw it as an FYI, not an escalation. <b>Result:</b> the API was merged in 3 weeks, we launched on time, and we added a cross-team dependency review to quarterly planning. The next quarter we had zero surprise dependencies. <b>Learning:</b> dependencies must be agreed in planning, in writing, with dates."</p>`,
      cx: RUB('builds a technical option (e.g. contribute the API) and keeps engineers constructive.', 'resolves the dependency, owns their part, fixes their team\'s language, adds a planning mechanism.', 'fixes cross-org dependency planning so the class of problem disappears.'),
      f: ['What if their EM refuses all three options?', 'How do you rebuild trust between the two teams?']
    })
  ]
});

// ---------- TOPIC 7 ----------
topics.push({
  title: 'Technical Leadership and Architecture Ownership',
  analogy: `<p>A city <b>planner</b> does not lay every brick. They decide where the main roads go, set building codes so houses do not fall down, and approve or push back on big projects. Builders choose their own bricks. A tech lead is the city planner of a system: sets direction and standards, reviews the big decisions, and lets the team build.</p>`,
  explain: `<p><b>The plain idea:</b> TL interviews (and the technical part of EM interviews) ask how you <b>own architecture</b> without becoming a bottleneck. Expect "How do you make technical decisions on your team?", "Tell me about a time you pushed back on a design", "How do you manage tech debt?", "How do you keep quality high?".</p>
    <ul>
      <li><b>Decision system:</b> lightweight design docs for anything hard to reverse; decision records (ADRs) so the "why" survives; you decide when the team cannot converge, and say so.</li>
      <li><b>Delegate by reversibility:</b> two-way doors (easy to undo) go to the engineer; one-way doors (data models, public APIs, vendor lock-in) get a review.</li>
      <li><b>Quality bar:</b> code review norms, test and observability standards, SLOs, an on-call that people do not dread.</li>
      <li><b>Tech debt as a portfolio:</b> list it, tie each item to a cost (incidents, hours, lead time), and pay down a steady share.</li>
      <li><b>Grow designers:</b> rotate design ownership; you review rather than write every doc.</li>
    </ul>
    <p><b>Metrics that prove it:</b> incidents and severity trend, change-fail rate, time to restore, on-call pages per week, share of design docs authored by people other than you, debt items closed with their measured payoff.</p>`,
  clues: ['"How do you make architecture decisions on your team?"', '"Tell me about a time you pushed back on a design or a product request for technical reasons"', '"How do you handle tech debt?"', '"How technical are you as a manager?"', '"How do you set the quality bar?"', '"A junior wants to use a shiny new framework"', '"Tell me about a technical decision you regret"'],
  viz: [
    rowViz('Who decides? Delegation by reversibility', 'Decision triage for a tech lead',
      ['Decision', 'Reversible?', 'Who decides', 'Process'],
      [
        ['Name of an internal function', 'Yes, trivial', 'Engineer', 'Code review'],
        ['Library for date parsing', 'Yes, cheap', 'Engineer', 'PR note'],
        ['Caching strategy for one service', 'Mostly', 'Owner engineer, TL reviews', 'Short design doc'],
        ['Public API shape', 'No (clients depend on it)', 'TL + consumers', 'Design review + ADR'],
        ['Primary database choice', 'No, very costly', 'TL / EM, with staff review', 'RFC, options, ADR'],
        ['Vendor with 3-year contract', 'No', 'EM + director', 'Build-vs-buy doc']
      ],
      ['A TL who decides everything becomes the bottleneck; one who decides nothing gets a messy system. Triage by how hard it is to undo.',
        'Trivial and reversible: the engineer decides. You do not even comment.',
        'Cheap to change: engineer decides, mention it.',
        'Mostly reversible: engineer owns, you review the doc.',
        'Public API: clients depend on it, so get consumers in the review and record the decision.',
        'Database: very costly to reverse. Options, trade-offs, a record of why.',
        'Contracts: business decision too, so the EM and director sign.'],
      'Interviewers like this answer because it shows <b>delegation</b> (growth) and <b>control where it matters</b> (risk).', [3, 4])
  ],
  examples: [
    { title: 'Pushing back on a product request', html: `<p>Product wanted real-time analytics on the main database by end of month. I showed load tests: the queries would raise p99 checkout latency from 300 ms to 1.8 s at peak. I proposed a read replica plus 5-minute freshness, which covered every use case the PM listed, in the same time. We shipped it; checkout stayed fast. <b>Pattern:</b> say no to the <i>how</i>, yes to the <i>goal</i>, with data.</p>` },
    { title: 'Tech debt with a business case', html: `${H.table(['Debt item', 'Cost today', 'Fix cost', 'Payback'], [['Flaky integration tests', '3 blocked deploys/week, ~2 eng-days', '3 weeks', '< 1 quarter'], ['Manual DB failover', '45 min MTTR per incident, 4 per year', '4 weeks', 'Lower risk, SLO'], ['Old logging library', 'Annoying but stable', '2 weeks', 'Low - not now']])}<p>Debt that does not cost anything measurable waits. Debt with a clear payback goes into the plan.</p>` },
    { title: 'A decision you regret', html: `<p>"I approved splitting our monolith into 9 services for a team of 6. Ops cost exploded: 9 pipelines, 9 dashboards, distributed bugs. Lead time got worse, not better. After 6 months I proposed merging back into 3 services aligned to team ownership. Lead time fell from 5 days to 2. Learning: service count should follow team boundaries, not ambition." Owning a real regret with the fix is a strong signal.</p>` }
  ],
  deepDive: `<p><b>TL vs staff engineer vs EM on technical decisions.</b> A TL owns one team's system direction and is in the code. A staff engineer owns direction across teams (see the senior/staff module). An EM owns that good decisions get made and staffed, and must be able to tell a good design from a bad one, but should not be the default decider. In a TLM role you hold both - say how you avoid being both judge and author (another reviewer for your own designs).</p>
    <p><b>Architecture fitness.</b> Good TLs set guardrails measured automatically: dependency rules in CI, performance budgets, SLOs with error budgets that decide when to slow features and fix reliability. This turns quality from opinion into policy.</p>
    <p><b>Keeping the bus factor up.</b> If only you understand the system, you are a risk. Rotate on-call and design ownership, record decisions, and track how many people can deploy, debug and design each component.</p>
    <p><b>Being technical as an EM.</b> Credible EMs: read design docs closely, ask the hard question in review ("what happens when this queue backs up?"), know the incident history, and occasionally fix something off the critical path. They do not hold the team's most important code.</p>`,
  aiEra: `<p><b>AI and technical leadership (2026):</b> TLs now set rules for AI-assisted work: which repos allow agents to open PRs, required tests and human review, how to handle licence and security scanning, and when AI-generated designs need a human-written ADR. Expect "What review standards did you set for AI-generated code?"</p>
    <p><b>New debt:</b> fast AI-generated code can raise duplication and inconsistency. Good TLs track it (duplication, review rounds, change-fail rate) and invest in shared libraries and clear patterns so assistants copy good examples.</p>
    <p><b>Your edge:</b> judgment about trade-offs, reversibility and the team's ability to operate a system - things a model cannot own or be accountable for.</p>`,
  problems: [
    P({
      t: 'A junior wants to adopt a brand-new framework', l: 'Medium', tags: ['tech-lead', 'architecture', 'mentoring'],
      s: 'A motivated junior engineer proposes rewriting your team\'s frontend in a framework released six months ago. They have built a demo and are excited. How do you handle it as tech lead?',
      ex: `<p>Balance: ${H.c('g', 'keep their energy')} + ${H.c('b', 'judge with criteria')} + ${H.c('y', 'small reversible experiment')}.</p>`,
      weak: 'I would say no because new frameworks are risky and we do not have time for a rewrite.',
      why: 'Shuts down initiative without teaching anything. No criteria, no experiment, and the junior learns not to bring ideas.',
      q: ['What is the best tech-lead response to an exciting but risky proposal?', ['Approve it to keep morale high', 'Reject it to avoid risk', 'Agree on criteria and a small time-boxed experiment the junior owns'], 2, 'Criteria plus a small reversible experiment gives a real answer, grows the junior, and limits risk.'],
      h: HINTS('Separate the person (encourage) from the proposal (evaluate).', 'Agree on criteria together: maturity, hiring, migration cost, problem it solves.', 'Offer a time-boxed experiment on one low-risk page, with success measures written in advance.'),
      a: `<p><b>Model answer.</b> "First I thank them and ask what problem it solves for us - they said slow builds and painful state handling. Those are real. Then we agree criteria together, written down: does it solve our two pain points by a measurable amount, how mature is it (releases, maintainers, security fixes), can we hire for it, and what does a migration cost? I suggest a two-week experiment: rebuild one low-traffic settings page behind a flag, and measure build time and bundle size. They own it and present to the team. In my real case, build time improved but the ecosystem lacked an accessible form library we needed. We decided not to migrate now and wrote an ADR with a 'revisit when' condition. We did adopt their state-handling pattern in our current framework, which cut state bugs by about a third. The junior presented to the whole department and later led our build-speed project. <b>The skill:</b> a 'no' or 'not yet' that teaches and keeps the person's energy."</p>`,
      cx: RUB('runs the experiment with criteria and records the decision.', 'also uses it as a growth opportunity and keeps psychological safety on the team.', 'turns it into a lightweight technology-adoption process for several teams.'),
      f: ['What if the experiment results were great?', 'How would you handle it if a senior engineer proposed it instead?']
    })
  ]
});

// ---------- PRACTICE: EASY ----------
practice.push(P({
  t: 'Describe how you run one-on-ones', l: 'Easy', tags: ['one-on-ones', 'people'],
  s: 'Interviewer: "Walk me through how you run one-on-ones with your reports."',
  ex: `<p>Cover: ${H.c('g', 'cadence and length')}, ${H.c('b', 'whose agenda')}, ${H.c('y', 'topics and doc')}, ${H.c('p', 'a change it caused')}.</p>`,
  weak: 'I have weekly one-on-ones where people update me on their tasks.',
  why: 'Status updates belong in standup. No career, feedback or wellbeing, no doc, no evidence the meetings changed anything.',
  q: ['What should a one-on-one mostly NOT be?', ['A task status update', 'A career conversation', 'Two-way feedback'], 0, 'Status belongs in standup or tickets. One-on-ones are for the person: blockers, growth, feedback, wellbeing.'],
  h: HINTS('Say the cadence, length and who sets the agenda.', 'List the rotating topics: how they are, blockers, growth, feedback both ways.', 'End with one example where a one-on-one surfaced something you then fixed.'),
  a: '<p><b>Model answer.</b> "Weekly, 30 minutes, never cancelled - moved if needed. A shared doc where they add topics first; their topics come before mine. Every week: how are you (energy 1 to 5), blockers I can remove, one piece of feedback each way. Monthly: career and their growth goal. Quarterly: we look at the ladder together. Status lives in tickets, not here. Example: a quiet engineer rated energy 2 three weeks in a row; she was overwhelmed by on-call. We changed the rota from 1-in-4 to 1-in-6 by adding two people, and her energy and the team\'s pages-per-shift both improved."</p>',
  cx: RUB('runs mentoring 1:1s with peers.', 'has a consistent system with a doc and proof of impact.', 'coaches managers on their 1:1s and runs skip-levels.'),
  f: ['What do you do if someone never brings topics?', 'How do you run skip-levels?']
}));
practice.push(P({
  t: 'EM or TL: explain the difference in your own words', l: 'Easy', tags: ['em-vs-tl'],
  s: 'Interviewer: "What is the difference between an engineering manager and a tech lead, and which role suits you?"',
  ex: `<p>${H.c('g', 'EM = accountable for the team')}, ${H.c('b', 'TL = accountable for the technical outcome')}. Then a reason backed by evidence.</p>`,
  weak: 'The manager is the boss and the tech lead is the best coder.',
  why: 'Reduces both roles to status. Misses accountability (people vs technical outcome) and shows no self-awareness.',
  q: ['Which describes an EM best?', ['The best coder on the team', 'Accountable for team health, people growth, hiring and delivery', 'Writes all the design docs'], 1, 'An EM is accountable for the team and its delivery; technical direction is shared with or delegated to the TL.'],
  h: HINTS('Think "accountable for what": people and team, or the technical outcome.', 'Name how each role spends a typical week.', 'Pick one honestly with a story that proves it.'),
  a: '<p><b>Model answer.</b> "The EM is accountable for the team: people growth, hiring, health, and predictable delivery. The TL is accountable for the technical outcome: architecture, quality, technical risk, and leads through influence, usually still coding about half the time. They work as a pair: EM decides who and when; TL guides how. I want the EM role because my best results have come from people: two mentees promoted, and the hiring loop I rebuilt raised offer-accept from 55% to 78%. I stay technical by reviewing designs and doing on-call shadows."</p>',
  cx: RUB('names the split and fits themselves with evidence.', 'shows how they would partner with a TL.', 'describes how they set up EM/TL pairs across teams.'),
  f: ['What do you do when the EM and TL disagree?']
}));
practice.push(P({
  t: 'Give praise and recognition that matters', l: 'Easy', tags: ['feedback', 'recognition'],
  s: 'Interviewer: "How do you recognise good work on your team?" Give a concrete example.',
  ex: `<p>Specific, timely, linked to impact, and visible to the people who decide promotions.</p>`,
  weak: 'I say good job in standup and buy pizza when we ship.',
  why: 'Generic praise teaches nothing and does not help careers. No link to impact or to promotions.',
  q: ['Which praise is most useful?', ['"Great job everyone!"', '"Your load test caught the memory leak before launch; it saved us a likely SEV-1. I shared it with the director."', '"You are a rock star"'], 1, 'Specific, impact-linked praise that reaches decision makers both motivates and builds promotion evidence.'],
  h: HINTS('Use the same SBI frame as for critical feedback.', 'Make it visible where it helps the person\'s career.', 'Remember glue work: reviews, docs, onboarding.'),
  a: '<p><b>Model answer.</b> "I praise specifically and quickly, using SBI. I also make it visible: a short note in our weekly update and in the person\'s promotion doc. I pay special attention to glue work that is easy to miss. Example: Mei rewrote our onboarding guide; new hires\' time to first PR went from 9 days to 3. I credited her in the department update and in her review, and it became a key part of her promotion case. Recognition that changes careers is worth more than pizza."</p>',
  cx: RUB('recognises peers specifically.', 'connects recognition to impact and careers, including glue work.', 'builds recognition systems across teams.'),
  f: ['How do you recognise quiet people who dislike public praise?']
}));
practice.push(P({
  t: 'Name the metrics that prove you are a good manager', l: 'Easy', tags: ['metrics'],
  s: 'Interviewer: "How would I know you were a good manager in your last role? Give me numbers."',
  ex: `${H.kv([['People', 'promotions, attrition'], ['Delivery', 'say/do ratio'], ['Quality', 'incidents'], ['Hiring', 'offer-accept']])}`,
  weak: 'My team liked me and we shipped a lot of features.',
  why: 'No numbers, and "shipped a lot" is output not outcome. Interviewers need defensible metrics per competency.',
  q: ['Which is the weakest management metric?', ['Regretted attrition', 'Lines of code written by the team', 'Say/do ratio'], 1, 'Lines of code reward volume, not outcomes. The others reflect retention and predictability.'],
  h: HINTS('One metric per competency: people, hiring, delivery, quality.', 'Give before and after values and the time frame.', 'Be ready to say how you measured each one.'),
  a: '<p><b>Model answer.</b> "Four numbers over two years with a team of 8. People: three promotions and zero regretted attrition; engagement \'my manager\' score from 71% to 89%. Hiring: 5 hires, offer-accept 74%, all at or above bar at their 6-month review. Delivery: say/do ratio from 55% to 85% after we added capacity planning with a buffer. Quality: SEV-1 and SEV-2 incidents from 14 a year to 4 after on-call and testing changes. I can explain how each was measured."</p>',
  cx: RUB('quotes technical quality and delivery metrics.', 'covers people, hiring, delivery and quality with before/after.', 'covers org-level metrics and manager growth.'),
  f: ['Which metric would your reports say matters most?']
}));

// ---------- PRACTICE: MEDIUM ----------
practice.push(P({
  t: 'A high performer wants promotion now', l: 'Medium', tags: ['growth', 'promotion'],
  s: 'Your strongest engineer says: "I have been doing senior work for a year. If I am not promoted this cycle I will look elsewhere." You think they are about 6 months away. What do you do?',
  ex: `<p>Honesty about the gap + a concrete path + no promises you cannot keep.</p>`,
  weak: 'I would promise to push hard for their promotion so they do not leave.',
  why: 'A promise you may not control destroys trust if it fails. No honest gap analysis or plan.',
  q: ['What is the most trustworthy response?', ['Promise the promotion', 'Show the specific gap against the ladder and a plan with a timeline', 'Tell them to be patient'], 1, 'Specific evidence and a plan respect the person; promises outside your control backfire.'],
  h: HINTS('Thank them for being direct and take the risk seriously.', 'Compare their evidence to the ladder line by line together.', 'Give a stretch project that closes the gap and a check-in date; involve your manager as a sponsor.'),
  a: '<p><b>Model answer.</b> "I thank them for telling me and take it seriously. We open the ladder together and list evidence for each line. Their technical work is clearly senior; the gap is leading work across the team and mentoring. I offer the next quarter\'s search-relevance project as owner, with a junior to mentor, and say: if you land this, I will put you up next cycle and I will share the packet draft with you. I tell my director so they know the person and the risk. I do not promise the outcome because calibration is a group decision. In my real case the engineer led the project and was promoted 7 months later; they are still on the team."</p>',
  cx: RUB('mentors peers toward promotion.', 'gives an honest gap analysis, a stretch project and sponsorship.', 'fixes calibration consistency across teams.'),
  f: ['What if they get an outside offer next week?']
}));
practice.push(P({
  t: 'Onboard a new engineer in 30/60/90 days', l: 'Medium', tags: ['onboarding', 'team-building'],
  s: 'Describe how you onboard a new mid-level engineer so they are productive quickly, and how you know it worked.',
  ex: `${H.table(['Window', 'Goal'], [['Week 1', 'First PR merged'], ['Day 30', 'Owns a small feature'], ['Day 60', 'On-call shadow done'], ['Day 90', 'Owns a component']])}`,
  weak: 'I give them access to the wiki and assign tickets. They ask questions if they are stuck.',
  why: 'Puts all the burden on the new hire; many will not ask. No buddy, no milestones, no measurement.',
  q: ['Which onboarding metric is most useful?', ['Wiki pages read', 'Time to first merged PR and time to first on-call', 'Hours spent in meetings'], 1, 'Time to first PR and to independent on-call show real ramp-up.'],
  h: HINTS('Prepare before day 1: access, laptop, buddy, a starter ticket.', 'Set 30/60/90 goals written together.', 'Measure time to first PR and ask the new hire to fix one onboarding doc problem.'),
  a: '<p><b>Model answer.</b> "Before day 1: accounts ready, a buddy named, a starter ticket tagged. Week 1: environment set up, first PR merged by day 3, coffee with each teammate. Day 30: owns a small feature end to end; our first feedback chat both ways. Day 60: on-call shadow and reverse shadow. Day 90: owns a component and has a written growth goal. Every new hire updates the onboarding doc with whatever confused them. Metrics: time to first PR fell from 9 days to 3, time to independent on-call from 4 months to 2, and I ask at day 90 \'what would you change?\'"</p>',
  cx: RUB('acts as an excellent buddy and maintains the docs.', 'runs a measured onboarding system for the team.', 'standardises onboarding across teams.'),
  f: ['How does onboarding change for a remote hire?']
}));
practice.push(P({
  t: 'Your team is burning out', l: 'Medium', tags: ['wellbeing', 'execution'],
  s: 'After two hard launches, engagement scores dropped, two people mention exhaustion, and on-call pages are 25 a week. Leadership wants another big launch next quarter. What do you do?',
  ex: `<p>Fix the person-level load <i>and</i> the system cause, then negotiate the plan with data.</p>`,
  weak: 'I would order pizza, give everyone a day off and remind them how important the launch is.',
  why: 'Treats symptoms once and ignores causes (pages, scope). Then piles on more pressure.',
  q: ['Best response to team burnout?', ['A team party', 'Reduce load: fix the biggest sources of toil and negotiate scope with data', 'Ask people to push through'], 1, 'Burnout is a load problem. Remove toil, protect recovery, and adjust the plan.'],
  h: HINTS('Talk to people first, then look at the data: pages, after-hours work, scope.', 'Pick the biggest structural cause (on-call noise) and fix it.', 'Take a data-backed plan to leadership: what launch scope is realistic with recovery time.'),
  a: '<p><b>Model answer.</b> "I talk to each person first and hear what is worst. The data says on-call: 25 pages a week, 70% non-actionable. I make reliability the first 3 weeks of next quarter: delete or tune noisy alerts and fix the top two recurring causes. I protect recovery: no after-hours deploys, swap time for weekend pages. Then I bring leadership a plan: with 20% capacity going to reliability, we can deliver the launch\'s core in the quarter and the rest the quarter after, and I show the attrition risk of the alternative. Result in a real case: pages fell to 7 a week, engagement recovered from 58% to 79% the next survey, and the core launch shipped on time."</p>',
  cx: RUB('spots burnout and fixes on-call noise.', 'fixes load, protects recovery and renegotiates scope with leadership.', 'changes planning norms so launches include recovery.'),
  f: ['What if leadership refuses to change the scope?']
}));
practice.push(P({
  t: 'Tell me about a bad hire', l: 'Medium', tags: ['hiring', 'failure'],
  s: 'Interviewer: "Tell me about a hire that did not work out. What did you learn and what did you change?"',
  ex: `<p>Own the decision, handle the person well, fix the <b>loop</b> so it does not repeat.</p>`,
  weak: 'The recruiter sent us a weak candidate who lied in the interview. We let him go after three months.',
  why: 'Blames others, no ownership of the hiring decision, no humane handling, no system change.',
  q: ['What makes a bad-hire story strong?', ['Blaming the candidate', 'Owning the miss, finding the gap in the loop, and fixing it', 'Saying you have never made a bad hire'], 1, 'Every hiring manager has misses. The signal is ownership and a system fix.'],
  h: HINTS('Name what the loop failed to test.', 'Show how you handled the person fairly.', 'Name the loop change and evidence it worked.'),
  a: '<p><b>Model answer.</b> "I hired a senior engineer whose design round was excellent, but in practice she could not break work into shippable pieces; her projects stalled for weeks. I gave clear feedback in month 2 and paired her with our TL; she improved somewhat, but after 5 months we agreed it was not the right fit and I helped her find a role on a research team where she did well. My miss: our loop tested design ideas but never execution. I added a behavioral question on scoping and a code-review round. Over the next 7 hires, all reached \'meets\' or higher by 6 months."</p>',
  cx: RUB('gives honest interviewer feedback and spots the gap.', 'owns the hire, handles the person well and fixes the loop.', 'fixes hiring practice across teams.'),
  f: ['How did you tell the team?']
}));
practice.push(P({
  t: 'Keep a TL technical while leading', l: 'Medium', tags: ['tech-lead', 'time-management'],
  s: 'As a tech lead your calendar is 60% meetings and you are now the bottleneck on reviews. How do you fix it?',
  ex: `<p>Delegate by reversibility, grow other reviewers, guard focus time.</p>`,
  weak: 'I would work evenings to keep up with reviews and code.',
  why: 'Heroics do not scale and keep you as the bottleneck; nobody else grows.',
  q: ['First move when you are the review bottleneck?', ['Review faster at night', 'Grow more reviewers and delegate reversible decisions', 'Stop reviewing'], 1, 'Scale by spreading ownership; keep your review for one-way-door decisions.'],
  h: HINTS('Audit your calendar and review queue: what only you can do?', 'Delegate reversible decisions and train two more reviewers per area.', 'Protect focus blocks and measure review wait time.'),
  a: '<p><b>Model answer.</b> "I listed a week of meetings and reviews. Half the meetings did not need me; I sent a delegate with a short note. For reviews I created a CODEOWNERS map with two owners per area and trained them by co-reviewing for two weeks. I kept only one-way-door changes (schemas, public APIs). I blocked two 3-hour focus slots weekly. Result: median review wait dropped from 26 hours to 6, my meetings fell to 35%, and two engineers grew into area owners."</p>',
  cx: RUB('delegates reviews and protects focus time.', 'redesigns the team\'s decision rights to remove single points of failure.', 'sets this model for several teams.'),
  f: ['What do you still never delegate?']
}));

// ---------- PRACTICE: HARD ----------
practice.push(P({
  t: 'Inherit a struggling team', l: 'Hard', tags: ['turnaround', 'people', 'execution'], co: ['Amazon', 'Meta'],
  s: 'You become the manager of a team that missed its last three quarterly goals, has had two regretted departures, and that partner teams call "unreliable". What are your first 90 days?',
  ex: `${H.table(['Phase', 'Focus'], [['0-30', 'Listen and diagnose'], ['30-60', 'Quick wins + clear plan'], ['60-90', 'Systems and metrics']])}`,
  weak: 'I would bring in new processes from my old team and replace the weak people quickly.',
  why: 'Acts before understanding, imposes process, threatens people. Likely to cause more departures.',
  q: ['First 30 days in a struggling team should focus on...', ['Firing low performers', 'Listening, diagnosing root causes and a few quick wins', 'A full reorg'], 1, 'Diagnose before changing. Early credibility comes from listening and fixing obvious pain fast.'],
  h: HINTS('Talk to everyone: team, partners, PM, your manager. Write down themes.', 'Find root causes (too many priorities? on-call? unclear ownership?) and pick one quick win.', 'Set a small plan with metrics, then keep promises visibly.'),
  a: '<p><b>Model answer.</b> "<b>Days 0-30:</b> one-on-ones with all 8 engineers, the PM, three partner EMs and my director. Themes: 11 parallel projects for 8 people, on-call 30 pages a week, no one sure what \'done\' means. <b>Quick win:</b> I cut active projects to 4 with my director\'s backing and told partners which work moved. <b>Days 30-60:</b> a quarterly plan with capacity and a 20% reliability budget; a weekly status note to partners; each person with a growth goal. <b>Days 60-90:</b> metrics in a monthly review: say/do ratio, pages, partner satisfaction. Results by end of next quarter: 4 of 4 goals hit (say/do from 30% to 100%), pages from 30 to 10 a week, no departures, and a partner EM asked to co-own a project with us."</p>',
  cx: RUB('stabilises technical health in an inherited system.', 'turns around delivery, health and reputation with metrics.', 'turns around a multi-team org, including managers.'),
  f: ['What if one person is clearly the root cause?', 'How do you rebuild trust with partners?']
}));
practice.push(P({
  t: 'Grow the team from 5 to 15 in a year', l: 'Hard', tags: ['hiring', 'team-building', 'org-design'],
  s: 'Your product got funding. You must grow from 5 engineers to 15 in 12 months without breaking quality or culture. Walk through your plan.',
  ex: `<p>Order matters: ${H.c('g', 'seniors and interviewers first')}, ${H.c('b', 'onboarding system')}, ${H.c('y', 'split teams near 8')}, ${H.c('p', 'metrics')}.</p>`,
  weak: 'I would ask recruiting for lots of candidates and hire the best ones as fast as possible.',
  why: 'No sequencing, no interviewer capacity plan, no onboarding, no team split, no quality guardrails.',
  q: ['When growing fast, whom do you hire first?', ['All juniors to save money', 'Senior engineers who can interview, mentor and own areas', 'Whoever is available first'], 1, 'Early seniors multiply: they become interviewers, mentors and future TLs.'],
  h: HINTS('Work backwards: how many offers, onsites and screens per month does 10 hires need?', 'Sequence seniors first, then mix; train interviewers; cap interview load.', 'Plan the team split around 8 people and name future TLs and an extra manager.'),
  a: '<p><b>Model answer.</b> "Funnel math: 10 hires at ~70% offer-accept needs ~15 offers; at ~40% onsite-to-offer that is ~37 onsites, roughly 3 a month. Sequence: Q1 two seniors who can own areas and interview; Q2-Q3 mixed seniority; Q4 two juniors once mentors exist. Train 6 interviewers via shadowing, cap interviews at 3 a week per engineer. Onboarding: buddy, 30/60/90 plan, first PR in week 1. Around 8 to 9 people I split into two teams by product area with clear service ownership, promote a TL in each, and hire or grow a second manager. Guardrails tracked monthly: change-fail rate, incidents, time to first PR, engagement. In my last scale-up we went 4 to 13 in 11 months; change-fail rate stayed under 10% and we lost one person."</p>',
  cx: RUB('acts as interviewer lead and onboarding owner.', 'runs funnel math, sequencing, onboarding and a team split with guardrails.', 'designs an org of several teams with managers and calibrated hiring.'),
  f: ['How do you keep culture as you grow?', 'When would you hire a second manager instead of a TL?']
}));
practice.push(P({
  t: 'Layoffs or a reorg hits your team', l: 'Hard', tags: ['change-management', 'communication'],
  s: 'The company announces a reorg: your team loses 2 of 8 engineers to another org and takes over a legacy service nobody wants. Morale drops. How do you handle the next month?',
  ex: `<p>Honest communication, re-planning to real capacity, and finding meaning in the new scope.</p>`,
  weak: 'I would tell the team leadership decided it and we just have to accept it and keep shipping.',
  why: 'Blames leadership, offers no why, no re-plan, no support for people, and no ownership of the change.',
  q: ['Best message to the team after a hard reorg?', ['"Leadership made us do it"', 'Explain the why as you understand it, what changes, what does not, and the new plan', 'Say nothing until things settle'], 1, 'Clarity and honesty reduce anxiety; blaming leadership damages trust in everyone.'],
  h: HINTS('Talk to each person individually within days, especially those moving.', 'Re-plan to the new capacity and drop work explicitly with stakeholders.', 'Make the legacy service a real, owned mission with a measurable goal.'),
  a: '<p><b>Model answer.</b> "Day 1: I hear the why from my director so I can explain it honestly, and I say what I do not know. I meet the two moving engineers first, help their handover and their intro to the new manager. Then one-on-ones with the six remaining. Week 1: a re-plan at 6 people: I drop two roadmap items and tell stakeholders the new dates. For the legacy service I set a clear goal - halve its pages and write the runbooks in 6 weeks - with a rotation so it is not one person\'s burden. I disagreed with part of the reorg privately to my director, then committed. Results: pages on the legacy service fell from 18 to 6 a week, no one left the team, and the next survey showed \'clarity\' back to pre-reorg levels."</p>',
  cx: RUB('stabilises the legacy service technically.', 'leads people through change with honesty, re-planning and metrics.', 'designs and communicates the reorg itself.'),
  f: ['What if you are told not to share the reason?']
}));
practice.push(P({
  t: 'Balance a major incident with your people responsibilities', l: 'Hard', tags: ['incident', 'execution', 'people'],
  s: 'An engineer on your team pushed a change that caused a 2-hour outage for 30% of customers. The VP asks you "who did this?". The engineer is shaken. How do you handle the next 48 hours as the manager?',
  ex: `<p>Three audiences: ${H.c('g', 'the engineer')}, ${H.c('b', 'the VP')}, ${H.c('y', 'the system')}.</p>`,
  weak: 'I would tell the VP the engineer\'s name and make sure they get extra training so it does not happen again.',
  why: 'Blame on an individual, no systemic fix, and the whole team learns to hide mistakes.',
  q: ['The VP asks "who did this?" Best answer?', ['Give the name', 'Take accountability as the manager and explain the system gap and the fix', 'Blame the QA team'], 1, 'The manager owns the outcome; the useful answer is which safeguard failed and how it will be fixed.'],
  h: HINTS('Your answer to the VP sets the culture: accountability is yours, causes are in the system.', 'Support the engineer privately the same day.', 'Run a blameless postmortem and ship a guardrail with an owner and date.'),
  a: '<p><b>Model answer.</b> "To the VP: \'I am accountable. The change passed review and tests; our pipeline had no canary for this config type, so it hit all regions at once. I will bring the postmortem and fixes by Thursday.\' To the engineer, that same hour: it is not your fault alone, the system allowed it; I asked them to help write the timeline, which helps them own the learning without blame. To the team: the postmortem is blameless and we will focus on why the safeguards failed. Actions: canary for config changes (owner, 2 weeks), automatic rollback on error-rate spikes, and a config validation step. The VP got a clear one-page summary. Next quarter, change-fail rate fell from 12% to 5% and the engineer later led our deploy-safety work."</p>',
  cx: RUB('runs the technical postmortem and ships guardrails.', 'protects the person, takes accountability upward, and drives systemic fixes.', 'builds a blameless culture and reliability standards across the org.'),
  f: ['What if this is the same engineer\'s third incident?']
}));

// ---------- QUIZ ----------
[
  ['In one line, what is an engineering manager accountable for?', ['Writing the most code', 'The team: people growth, hiring, health and predictable delivery', 'Only the architecture'], 1, 'EMs are accountable for the team and its delivery; technical direction is usually shared with a TL.'],
  ['Which is the strongest proof of good people management?', ['Holding weekly meetings', 'Promotions, low regretted attrition and rising engagement over time', 'Being liked'], 1, 'Outcome metrics show people grew and stayed; meetings are only inputs.'],
  ['What does SBI stand for in feedback?', ['Situation, Behavior, Impact', 'Skill, Background, Intent', 'Status, Blockers, Issues'], 0, 'SBI keeps feedback specific and observable, linked to its impact.'],
  ['A struggling engineer was never told about their performance by the previous manager. Your first step?', ['Start a PIP', 'A clear, specific conversation and a diagnosis of the cause', 'Wait for the next review cycle'], 1, 'Fairness requires that they hear the gap clearly and get support before formal steps.'],
  ['Why should interviewers write feedback before the hiring debrief?', ['It is faster', 'To avoid groupthink and anchoring on the loudest voice', 'HR requires it everywhere'], 1, 'Independent written evidence leads to fairer, better hiring decisions.'],
  ['Your project is 3 weeks behind at the midpoint. What is usually the worst choice?', ['Cut scope', 'Tell stakeholders today with options', 'Quietly ask the team to work weekends'], 2, 'Hidden heroics burn people out, hurt quality and usually still miss.'],
  ['What does Brooks\'s law warn about?', ['Adding people to a late project often makes it later', 'Tests slow teams down', 'Small teams are always slower'], 0, 'New people need ramp-up and add communication paths, which slows a late project further.'],
  ['Which productivity metric should you NOT use to compare engineers?', ['Lead time for changes', 'Story points or lines of code per person', 'Change-fail rate'], 1, 'Points and lines of code are easy to game and ignore quality and glue work.'],
  ['Two teams keep clashing over a dependency. When should you escalate?', ['Immediately, to their director, without telling their EM', 'After trying to agree, jointly, with a short written ask', 'Never'], 1, 'Escalation is a normal tool when done together and in writing; going around a peer burns trust.'],
  ['What does "disagree and commit" mean?', ['Agree publicly, complain privately', 'Raise concerns, then fully support the decision once made', 'Commit only if you agree'], 1, 'You voice disagreement before the decision, then support it fully and explain the why to your team.'],
  ['Which decision should a tech lead most often delegate fully?', ['Public API shape', 'Primary database choice', 'A reversible library choice inside one service'], 2, 'Delegate two-way-door decisions; review the costly, hard-to-reverse ones.'],
  ['What is the best way to justify tech debt work to leadership?', ['Engineers want cleaner code', 'Tie each item to a measured cost such as incidents or blocked deploys, with payback', 'Hide it inside feature estimates'], 1, 'A business case with measured cost and payback earns time for debt work.'],
  ['When growing a team fast, whom do you usually hire first?', ['Juniors', 'Seniors who can interview, mentor and own areas', 'Contractors only'], 1, 'Seniors multiply hiring and onboarding capacity for everyone after them.'],
  ['The VP asks "who caused the outage?" Best answer as the manager?', ['Name the engineer', 'Take accountability and explain the system gap and the fix', 'Blame another team'], 1, 'Managers own outcomes; useful answers explain which safeguard failed and how it will be fixed.'],
  ['A typical healthy single-team size is about...', ['2 to 3 engineers', '5 to 9 engineers', '20 to 25 engineers'], 1, 'Around 5 to 9 keeps communication manageable; larger teams usually split.']
].forEach(function (x) { quiz.push({ q: x[0], options: x[1], answer: x[2], explain: x[3] }); });

// ---------- INTERVIEW ----------
[
  ['What is your management philosophy?', 'E', '<p>I keep it to three habits I can show evidence for. <b>Clarity:</b> everyone can say in one line what we are doing this quarter and why; I check it in one-on-ones. <b>Growth:</b> each person has a written growth goal tied to the ladder, reviewed monthly; two of my seven were promoted last year. <b>Early, honest feedback:</b> within a week, so reviews never surprise anyone. I measure myself by promotions, regretted attrition (zero over 18 months) and the engagement survey\'s manager score, which went from 71% to 89%.</p>', ['Which of the three do you find hardest?', 'What would your reports say you need to improve?']],
  ['How hands-on are you technically as a manager?', 'E', '<p>I stay off the critical path so I am never the bottleneck, but close enough to judge technical risk. Concretely: I read every design doc and ask the failure-mode questions, review a few key PRs a week, take on-call shadow shifts once a month to feel the pain, and occasionally fix small tooling issues. If I had the team\'s most important code, nobody else would grow and my people work would suffer. For a TL role I would code roughly half the time, but still focus on multiplying others.</p>', ['When did your technical judgment change a team decision?', 'How do you stay current?']],
  ['Tell me about a time you managed a low performer.', 'E', '<p>An engineer was missing commitments and needing four review rounds per PR. In week one I asked what was going on: she had moved stacks and was embarrassed to ask for help. We wrote three 6-week goals tied to the level, paired her with a senior twice a week and gave smaller tickets, with weekly written check-ins and HR informed. By week 6 review rounds fell to 1.5 and she hit her sprint goals; a year later she owned the service. In another case the plan did not work, so I ran a fair PIP with HR and the person exited with dignity. My learning: act within weeks, not quarters, and make sure the team is not silently carrying the load.</p>', ['How do you know when to move to a PIP?', 'How do you protect the team meanwhile?']],
  ['How do you run one-on-ones?', 'I', '<p>Weekly, 30 minutes, never cancelled, a shared doc where their topics go first. Weekly: how they are, blockers, one piece of feedback each way. Monthly: career goal progress. Quarterly: the ladder together. Status updates stay in tickets. The value shows in what they surface: one engineer\'s energy score dropped three weeks running; it was on-call load, so we enlarged the rota and pages per shift fell. I also ask my manager to run skip-levels so I hear what my reports might not tell me.</p>', ['What if someone never brings topics?', 'How do you handle a one-on-one where someone cries or is very upset?']],
  ['Design an interview loop for a senior engineer on your team.', 'E', '<p>I start from the team gap - say production data ownership and mentoring. Rounds: recruiter screen (level, motivation), technical screen with tests, system design owned by a staff engineer, an incident deep-dive, a code-review round reviewing a junior\'s PR (tests judgment and mentoring tone), and a hiring manager round. Each round owns one or two competencies with a written rubric, feedback is written before the debrief, and I decide based on evidence. I track pass-through per stage, offer-accept, time-to-fill and the hire\'s 6-month performance to calibrate.</p>', ['How do you reduce bias?', 'What do you do when interviewers split evenly?']],
  ['Tell me about a project that was going to miss its date.', 'E', '<p>Halfway through a 6-month payments migration, our forecast showed 7 weeks late because a partner API was slower than planned. The same week I told my director and the partner team, with three options and a recommendation: ship card payments on time and bank transfers 5 weeks later. We also moved the riskiest remaining work first. Cards shipped on the original date (80% of volume), transfers 4 weeks later, with no weekend work and no SEV-1. I added range forecasts to our weekly status, and forecast error stayed under one week afterwards.</p>', ['Why not add more engineers?', 'What would you do differently at planning time?']],
  ['How do you prioritize between features, tech debt and bugs?', 'I', '<p>I start with real capacity after on-call, leave and a buffer, and reserve a steady share (about 20%) for keep-the-lights-on and debt. Everything else is ranked by impact on our goals and cost of delay, using the same measure for debt as for features - for example, flaky tests blocking deploys three times a week cost about two engineer-days weekly, which beats many features. Hard deadlines like end-of-support go first. Then I publish the in/out list with dates for the out items, so stakeholders can argue with a plan rather than with me.</p>', ['What if the CEO adds an urgent item mid-quarter?', 'How do you decide the debt share?']],
  ['Tell me about a conflict between your team and another team.', 'E', '<p>Ads deploys were paging my Search on-call at night - 31 pages a week, 60% traced to them. I had coffee with the Ads EM first and learned they shipped ten times a day for a revenue goal. We wrote one doc with a shared goal (fewer incidents, same deploy speed) and three options; we chose contract tests in their CI plus canary releases, two sprints each team. Both EMs signed it, and we set a monthly joint review. Pages fell from 31 to 9 a week and their deploy speed was unchanged. If we had not agreed, I would have escalated jointly to both directors with a one-page ask.</p>', ['What if their EM had refused?', 'How did you handle your own team\'s frustration?']],
  ['Tell me about a time you disagreed with your manager.', 'I', '<p>My director wanted to commit to a 6-week launch; my estimate was 10. I brought the plan, top three risks and two options: reduced scope in 6 weeks or full scope in 10. She explained a press commitment I did not know about and chose the reduced scope. I committed fully, explained the why to my team so they did not feel overruled, and we shipped on time. The remaining scope shipped 4 weeks later. I learned to ask about hidden constraints earlier.</p>', ['What if you had believed it was unsafe?', 'How do you disagree in public vs private?']],
  ['How do you make technical decisions on your team without becoming a bottleneck?', 'E', '<p>By reversibility. Two-way doors - library choices, internal design inside a service - the owning engineer decides. One-way doors - public APIs, data models, vendors - get a short design doc, the right reviewers, and an ADR so the reasoning survives. When the team cannot converge, I set criteria up front and a date, and decide if needed, saying so openly. I track the share of design docs authored by people other than me; on my last team it rose from 10% to 60%, and median review wait fell from 26 to 6 hours after adding area owners.</p>', ['Tell me about a decision you regret.', 'How do you handle a senior who ignores the ADR?']],
  ['How do you grow engineers when AI writes much of the code?', 'A', '<p>I keep the learning loop alive. Juniors explain their diffs without the assistant in review, write a short design note before a non-trivial ticket, and pair with seniors on debugging, where understanding matters most. We use AI freely for boilerplate and tests, but every change has a human owner who can defend it. I watch metrics like review rounds and reverts per person, plus their growth goals. Seniors get stretch work in system design, review and mentoring, which is where the role is heading.</p>', ['What AI usage rules did you set?', 'How do you assess a junior who relies heavily on AI?']],
  ['Your team\'s engagement score dropped sharply. What do you do?', 'I', '<p>I treat it like an incident: find the cause before acting. I read the survey breakdown (which questions dropped), then ask in one-on-ones and a team retro with a safe format. In my case \'clarity\' and \'workload\' fell after two back-to-back launches with 25 pages a week of on-call. Actions: three weeks of reliability work to cut alert noise, a monthly roadmap walkthrough, and renegotiating the next launch\'s scope with my director. The next survey recovered from 58% to 79%, and pages fell to 7 a week. I share the results and actions with the team so they see the survey matters.</p>', ['What if the cause is you?', 'How do you get honest answers?']],
  ['Why should we hire you as a manager rather than promote someone internally?', 'E', '<p>I would ask what the team needs most in the next year and answer to that. For example, if you are scaling from 6 to 15, I have done it: grew a team from 4 to 13 in 11 months with 72% offer-accept and change-fail rate under 10%, split it into two teams and grew one of the engineers into a TL. I also bring an outside view of processes like capacity planning that raised my last team\'s say/do ratio from 55% to 85%. And I would actively sponsor internal candidates for leadership, because building future managers is part of the job.</p>', ['How will you earn trust with a team that wanted an internal promotion?', 'What would your first 30 days look like?']]
].forEach(function (x) { interview.push({ q: x[0], level: x[1], a: x[2], followUps: x[3] }); });

registerModule({
  id: 'beh09',
  title: 'Engineering Manager & Tech Lead Interviews',
  intro: `<p>Engineering manager (EM) and tech lead (TL) loops judge something different from IC interviews: not whether you can build it, but whether you can <b>build the team and the system that build it</b>. This module covers what these loops actually assess and how each competency is scored: <b>people management</b> (one-on-ones, feedback, growth, performance problems), <b>hiring and team building</b> (loop design, bar, closing, onboarding, scaling), <b>execution</b> (capacity, prioritization, risk, honest dates), <b>cross-team influence and conflict</b> (escalation, disagree and commit, managing up), and <b>technical leadership</b> (architecture ownership, delegation by reversibility, tech debt). Every topic gives model answers, the <b>metrics that prove the competency</b>, and the <b>red flags</b> interviewers listen for. It builds on the senior/staff module, which covers IC-level influence, strategy and incidents.</p>`,
  goals: [
    'Explain how EM and TL loops differ from IC loops and map a story bank to every competency with a metric',
    'Describe a one-on-one system and deliver hard feedback with SBI, showing measurable change',
    'Handle an underperformer scenario fairly: diagnose, written goals, support, PIP with HR, and protect the team',
    'Design a structured hiring loop from team gaps and plan scaling, onboarding and team splits',
    'Plan a quarter from real capacity, prioritize with cost of delay, and communicate risk early',
    'Resolve conflicts between teams and with your manager using shared goals, joint escalation and disagree-and-commit',
    'Own architecture as a TL by delegating reversible decisions and running tech debt as a measured portfolio'
  ],
  prereqs: `Senior & Staff-Level Interviews (beh05): scope signals, influence with RFCs, incidents and retrospectives. The STAR method and leadership bank from earlier behavioral modules. Some experience leading people or projects helps you draw real stories.`,
  hours: 9,
  topics: topics,
  practice: practice,
  quiz: quiz,
  interview: interview
});
})();
