(function () { var topics = [], practice = [], quiz = [], interview = [];
var PY_SCORER = "# Scope-signal scorer: reads a behavioral answer and estimates the level it sounds like.\nDIMENSIONS = {\n    \"scope\": [\"cross-team\", \"across teams\", \"multiple teams\", \"org-wide\", \"company-wide\",\n              \"organization\", \"every team\", \"all teams\", \"other teams\", \"platform\", \"directors\", \"vp\"],\n    \"impact\": [\"%\", \"revenue\", \"cost\", \"latency\", \"saved\", \"reduced\", \"increased\",\n               \"customers\", \"incidents\", \"hours\", \"million\", \"sla\", \"conversion\"],\n    \"ambiguity\": [\"unclear\", \"ambiguous\", \"no owner\", \"undefined\", \"nobody owned\", \"vague\",\n                  \"conflicting\", \"open-ended\", \"no spec\", \"no clear\", \"trade-off\", \"tradeoff\"],\n    \"influence\": [\"rfc\", \"design doc\", \"alignment\", \"consensus\", \"stakeholder\", \"pre-wire\",\n                  \"objection\", \"dissent\", \"convinced\", \"negotiated\", \"sponsor\", \"buy-in\", \"disagree\"],\n    \"horizon\": [\"quarter\", \"year\", \"multi-quarter\", \"long-term\", \"roadmap\", \"phased\", \"milestone\"],\n}\nCAP = 3  # each dimension counts at most 3 distinct phrases, so keyword stuffing cannot win\nLEVELS = [(15, \"Principal (L7)\"), (8, \"Staff (L6)\"), (4, \"Senior (L5)\"), (0, \"Mid (L4)\")]\n\ndef score(answer):\n    text = answer.lower()\n    result = {}\n    for dim, words in DIMENSIONS.items():\n        hits = [w for w in words if w in text]\n        result[dim] = (min(len(hits), CAP), hits)\n    return result\n\ndef words(text):\n    return [w.strip(\".,;:!?\") for w in text.lower().split()]\n\ndef estimate(answer):\n    res = score(answer)\n    total = sum(v[0] for v in res.values())\n    level = next(name for floor, name in LEVELS if total >= floor)\n    ws = words(answer)\n    i_count, we_count = ws.count(\"i\"), ws.count(\"we\")\n    flags = []\n    if we_count > 2 * max(i_count, 1):\n        flags.append(\"too many 'we': the interviewer cannot see YOUR part\")\n    if res[\"impact\"][0] == 0:\n        flags.append(\"no numbers: add a before/after metric\")\n    if res[\"influence\"][0] == 0:\n        flags.append(\"no influence move: how did you get others on board?\")\n    return total, level, res, flags\n\nSAMPLES = {\n    \"weak\": \"We moved the service to the new database. It went well and the team was happy. I fixed some bugs.\",\n    \"strong\": (\"Nobody owned checkout reliability and the requirements were conflicting, so I wrote an RFC \"\n               \"and did pre-wire chats with directors of five teams. After one objection I changed the \"\n               \"design and got buy-in. Over three quarters, phased by milestone, we cut cost by 30% and \"\n               \"reduced incidents from 12 to 2 a month across teams. I then set up the roadmap so other teams could reuse the platform.\"),\n}\n\nfor name, text in SAMPLES.items():\n    total, level, res, flags = estimate(text)\n    print(\"== \" + name.upper() + \" answer ==\")\n    for dim, (n, hits) in res.items():\n        print(\"  %-9s %d/%d  %s\" % (dim, n, CAP, \", \".join(hits) if hits else \"-\"))\n    print(\"  total %d/%d -> sounds like: %s\" % (total, CAP * len(DIMENSIONS), level))\n    for f in flags:\n        print(\"  FIX: \" + f)\n";
var PY_INC = "# Incident timeline formatter: turns raw events into a readable timeline plus key metrics.\nfrom datetime import datetime\n\nEVENTS = [\n    (\"14:02\", \"monitor\",   \"detect\",   \"Checkout error rate jumps from 0.2% to 18%\"),\n    (\"14:05\", \"on-call\",   \"ack\",      \"Priya acknowledges the page, starts looking at dashboards\"),\n    (\"14:11\", \"on-call\",   \"declare\",  \"SEV-1 declared. Priya becomes Incident Commander (IC)\"),\n    (\"14:13\", \"comms\",     \"comms\",    \"Status page updated: investigating checkout failures\"),\n    (\"14:24\", \"ops\",       \"mitigate\", \"Rollback of release 4.18 started (suspected cause)\"),\n    (\"14:31\", \"ops\",       \"mitigate\", \"Rollback finished, error rate falling\"),\n    (\"14:40\", \"ic\",        \"resolve\",  \"Error rate back under 0.3% for 10 minutes. Incident resolved\"),\n    (\"14:55\", \"ic\",        \"followup\", \"Blameless postmortem booked, owner: Sam\"),\n]\n\ndef minutes(hhmm):\n    t = datetime.strptime(hhmm, \"%H:%M\")\n    return t.hour * 60 + t.minute\n\ndef first(kind):\n    for e in EVENTS:\n        if e[2] == kind:\n            return minutes(e[0])\n    return None\n\ndef fmt(m):\n    return \"%dm\" % m\n\ndef show(events):\n    start = minutes(events[0][0])\n    print(\"TIMELINE (minutes since detection)\")\n    for when, who, kind, text in events:\n        print(\"  %s  +%-4s %-9s [%-8s] %s\" % (when, fmt(minutes(when) - start), kind.upper(), who, text))\n\nshow(EVENTS)\nd, a, dec = first(\"detect\"), first(\"ack\"), first(\"declare\")\nm, r = first(\"mitigate\"), first(\"resolve\")\nprint()\nprint(\"METRICS\")\nprint(\"  time to acknowledge : \" + fmt(a - d))\nprint(\"  time to declare     : \" + fmt(dec - d))\nprint(\"  time to mitigate    : \" + fmt(m - d) + \"  <- customers feel this one\")\nprint(\"  time to resolve     : \" + fmt(r - d))\ngap = dec - d\nprint(\"  note: %s\" % (\"declare was slow, add a rule: page = declare within 5m\" if gap > 5 else \"declare was fast\"))\n";

// Helper: build a behavioral problem. weak = a weak answer, why = why it fails, a = strong model answer (HTML)
function P(o) {
  return {
    title: o.t, level: o.l, tags: o.tags, companies: o.co,
    statement: '<p>' + o.s + '</p>',
    constraints: o.c || 'Speak for about 2 to 3 minutes. Use STAR+L (Situation, Task, Action, Result, Learning). Say "I" for your own moves, name real numbers, and name the scope (team, org or company).',
    example: o.ex,
    brute: { why: '<p><b>Weak answer:</b> <i>&ldquo;' + o.weak + '&rdquo;</i></p><p><b>Why it fails:</b> ' + o.why + '</p>' },
    mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
    hints: o.h,
    solution: { approach: o.a, complexity: o.cx, followUps: o.f }
  };
}

topics.push({
  title: 'Scope and Impact Signals: Team, Org, Company',
  analogy: `<p>Think of a <b>garden</b>. A mid-level engineer is great at growing one bed of tomatoes you hand them. A senior engineer plans the whole garden for the year. A staff engineer notices the whole street shares one water pipe, and fixes the pipe so ten gardens thrive. Interviewers are measuring <b>how big a garden you can look after</b>, not how hard you worked on one plant.</p>`,
  explain: `<p>At senior and staff level, nobody doubts you can code. The interviewer is asking: <b>how big was the problem you owned, and how much changed because of you?</b> They listen for four signals in every story:</p>
    <ul>
      <li><b>Scope</b>: team, then several teams (org), then the whole company. Bigger circle = higher level.</li>
      <li><b>Impact</b>: a number that moved (cost, latency, revenue, incidents, hours saved). Effort is not impact.</li>
      <li><b>Ambiguity</b>: was the problem handed to you with a spec, or did you <i>find</i> the problem and define it?</li>
      <li><b>Time horizon</b>: a sprint, a quarter, a year or more. Staff people plan in quarters and years.</li>
    </ul>
    ${H.table(['Signal', 'Mid (L4)', 'Senior (L5)', 'Staff (L6)'], [
      ['Scope', 'My tasks', 'My team\'s system', 'Several teams or the org'],
      ['Ambiguity', 'Given a ticket', 'Given a goal', 'Finds and frames the goal'],
      ['Horizon', 'Days to weeks', 'A quarter', 'Multiple quarters to years'],
      ['Impact words', '"I built / fixed"', '"We shipped, it cut X"', '"Teams now do Y, X dropped 40%"'],
      ['Others', 'Asks for help', 'Helps teammates', 'Changes how others work']
    ])}
    <p>Also watch the words <b>I</b> and <b>we</b>. Too many "we" and the interviewer cannot see your part. Too many "I" with no team and you sound like a lone hero. Strong answers say: "I wrote the proposal, <i>three teams</i> adopted it."</p>
    <p>The same story can sound mid-level or staff-level depending on how you tell it. Same migration, two tellings:</p>
    <p><span class="c-r">Mid:</span> "I moved our service to the new queue." <span class="c-g">Staff:</span> "Nobody owned message delivery across the company. I proposed a shared queue platform, got six teams to adopt it over three quarters, and cut paging incidents by 60%."</p>`,
  clues: [
    '"Tell me about the <b>biggest</b> / most <b>complex</b> project you led" (they want scope and ambiguity)',
    '"What was the impact?" or "How did you measure success?" (they want a number)',
    '"Beyond your own team..." or "Who else was affected?" (they want org-wide reach)',
    '"What was unclear at the start?" (they want ambiguity you resolved)',
    '"Where do you see this in a year?" (they want time horizon)',
    'The interviewer keeps asking "what did <b>you</b> do?" (your "we" is hiding your part)'
  ],
  code: [
    { lang: 'python', title: 'Scope-signal scorer (runnable)', run: true, code: PY_SCORER }
  ],
  codeTitle: ['Scope-signal scorer: keywords for scope, impact, ambiguity, influence, horizon give a level estimate'],
  viz: [
    {
      title: 'Scope ladder: what level does this answer sound like?',
      input: 'Nobody owned checkout reliability, so I wrote an RFC and did pre-wire chats with directors of five teams. After one objection I changed the design and got buy-in. Over three quarters we cut cost by 30% and reduced incidents across teams.',
      inputLabel: 'Type or paste a story (a few sentences)',
      gen: function (input) {
        var text = String(input || '').toLowerCase();
        if (text.trim().length < 10) throw new Error('Paste at least one sentence of your story');
        var D = [
          ['Scope', ['cross-team', 'across teams', 'multiple teams', 'org-wide', 'company-wide', 'organization', 'every team', 'all teams', 'other teams', 'platform', 'directors', 'vp']],
          ['Impact', ['%', 'revenue', 'cost', 'latency', 'saved', 'reduced', 'increased', 'customers', 'incidents', 'hours', 'million', 'sla', 'conversion']],
          ['Ambiguity', ['unclear', 'ambiguous', 'no owner', 'undefined', 'nobody owned', 'vague', 'conflicting', 'open-ended', 'no spec', 'no clear', 'trade-off', 'tradeoff']],
          ['Influence', ['rfc', 'design doc', 'alignment', 'consensus', 'stakeholder', 'pre-wire', 'objection', 'dissent', 'convinced', 'negotiated', 'sponsor', 'buy-in', 'disagree']],
          ['Horizon', ['quarter', 'year', 'multi-quarter', 'long-term', 'roadmap', 'phased', 'milestone']]
        ];
        var LV = ['Mid (L4)', 'Senior (L5)', 'Staff (L6)', 'Principal (L7)'];
        var frames = [], vals = [], names = [], texts = [];
        var ladder = function (cur) {
          var hl = {}; if (cur >= 0) hl[cur] = 'cur';
          return { type: 'bars', label: 'IC level ladder (taller = bigger scope)', values: [1, 2, 3, 4], idxLabels: LV, texts: ['task', 'team', 'org', 'company'], hl: hl };
        };
        frames.push({ narr: 'The ladder: each rung is a bigger <b>circle of ownership</b>. We scan your story for five signals and see which rung it sounds like.', parts: [ladder(-1)] });
        var total = 0;
        D.forEach(function (d) {
          var hits = d[1].filter(function (w) { return text.indexOf(w) >= 0; });
          var n = Math.min(hits.length, 3);
          total += n; vals.push(n); names.push(d[0]); texts.push(n + '/3');
          frames.push({
            narr: '<b>' + d[0] + '</b>: found ' + (hits.length ? '<span class="c-g">' + hits.join(', ') + '</span>' : '<span class="c-r">nothing</span>') + '. Score ' + n + ' of 3 (capped so keyword stuffing cannot win).' + (n === 0 ? ' Add a line about this.' : ''),
            parts: [{ type: 'bars', label: 'Signal scores so far', values: vals.slice(), idxLabels: names.slice(), texts: texts.slice(), hl: (function () { var h = {}; h[vals.length - 1] = n ? 'ok' : 'bad'; return h; })() }]
          });
        });
        var idx = total >= 15 ? 3 : total >= 8 ? 2 : total >= 4 ? 1 : 0;
        frames.push({ narr: 'Total <b>' + total + '/15</b> so this answer sounds like <b>' + LV[idx] + '</b>. The rung is highlighted. Raise it by adding the weakest signal, not by adding buzzwords.', parts: [ladder(idx), { type: 'vars', vals: { total: total + '/15', estimate: LV[idx] }, hl: { estimate: 'sel' } }] });
        return frames;
      }
    },
    {
      title: 'Same story, mid vs senior vs staff telling',
      input: 'queue migration',
      inputLabel: 'Project name (just a label)',
      gen: function (input) {
        var p = String(input || 'project').slice(0, 40);
        var rows = [
          ['Opening', 'I was asked to work on ' + p + '.', 'Our team owned ' + p + ' and it was slow.', 'Nobody owned ' + p + ' across teams.'],
          ['Action', 'I wrote the code and fixed bugs.', 'I designed it and led two engineers.', 'I wrote the RFC, aligned five teams, and set the plan.'],
          ['Result', 'It shipped on time.', 'Latency dropped 30% for our service.', 'Five teams adopted it; incidents fell 60%.'],
          ['Learning', 'I learned the new tool.', 'I learned to split work into milestones.', 'I learned to pre-wire people before the meeting.']
        ];
        var head = ['Part', 'Mid', 'Senior', 'Staff'], frames = [];
        frames.push({ narr: 'Same project ("' + H.esc(p) + '"), three tellings. We build the comparison one row at a time.', parts: [{ type: 'table', label: 'Mid vs Senior vs Staff', columns: head, rows: [] }] });
        for (var i = 0; i < rows.length; i++) {
          frames.push({ narr: '<b>' + rows[i][0] + '</b>: notice how the circle of ownership grows from left to right, and how the result moves from "done" to "changed how others work".', parts: [{ type: 'table', label: 'Mid vs Senior vs Staff', columns: head, rows: rows.slice(0, i + 1), hl: (function () { var h = {}; h[i] = 'cur'; return h; })() }] });
        }
        frames.push({ narr: 'All three are true stories of the same work. The staff version wins because it names <b>scope, numbers and influence</b>.', parts: [{ type: 'table', label: 'Mid vs Senior vs Staff', columns: head, rows: rows, hl: { 0: 'sel', 1: 'sel', 2: 'sel', 3: 'sel' } }] });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Weak vs strong opening (scope signals marked)', html: `<p><span class="c-r">Weak:</span> "We had a slow checkout, so I optimised some queries and it got faster."</p>
      <p><span class="c-g">Strong:</span> "Checkout latency was hurting <mark>conversion for the whole company</mark> [scope + impact]. <mark>Nobody owned it end to end</mark> across payments, cart and search [ambiguity]. I took it on, wrote a one-page plan, and <mark>got three teams to agree on a shared latency budget</mark> [influence]. Over two quarters [horizon] p95 fell from 2.4s to 0.9s and conversion rose 3% [impact]."</p>
      <p>Same engineer, same work. The second is annotated with the four signals. A listener can feel the circle grow.</p>` },
    { title: 'Turning effort into impact', html: `<p>Effort: "I worked nights for a month." Impact: "I cut the release from 4 hours to 20 minutes, so every team ships daily."</p>
      ${H.table(['Effort sentence', 'Impact sentence'], [['I wrote 40 tests', 'Test-caused rollbacks fell from 5 to 1 a month'], ['I refactored the module', 'New hires now ship their first change in 2 days, not 2 weeks'], ['I attended many meetings', 'Two teams agreed on one API, saving 3 months of duplicate work']])}` },
    { title: 'Finding your honest scope', html: `<p>You do not have to invent scope. Ask four questions about your story: <b>Who else depended on this? What would have happened if I did nothing? What was undefined at the start? How long did it matter?</b> Even a team-level story reaches senior level if you owned a vague problem and moved a number. Do not claim "company-wide" if only two teams used it; interviewers ask for names and numbers.</p>`, code: { lang: 'text', code: 'Scope check card\n1. Who depended on it?   -> 3 teams, ~40 engineers\n2. If I did nothing?     -> deploys stay at 4h, 2 incidents a month\n3. What was undefined?   -> no owner, two competing designs\n4. How long did it matter? -> 3 quarters, still used today' } }
  ],
  deepDive: `<p><b>How leveling really works.</b> Companies publish career ladders, but committees decide with a few recurring questions: Would this person's work have happened without them? Did they raise the ceiling for others? Do they operate at the next level <i>consistently</i>? That is why one story is not enough. Prepare 4 to 6 stories that cover different signals so your loop shows a pattern.</p>
    <p><b>Scope is not headcount.</b> Leading 20 people is management scope. For ICs, scope means the area whose technical direction you shape: a service, a domain, a platform, or a cross-cutting concern like reliability or security. A staff engineer on a team of 6 can still have org scope if the design they own is used by 15 teams.</p>
    <p><b>Down-leveling traps.</b> The usual reasons candidates are placed one level below their target: stories that are all delivery with no ambiguity, "we" language, results with no numbers, no disagreement or dissent, and no evidence of anyone else growing. <b>Up-leveling traps</b> are rare but real: claiming credit for what a manager or a bigger team did, or inflated numbers that collapse under a "how did you measure that?" follow-up.</p>
    <p><b>Calibrating numbers.</b> Prefer relative numbers you can defend (p95 2.4s to 0.9s) over big fuzzy ones ("saved millions"). If you do not know a number, say how you would estimate it. Interviewers value honesty and good estimation more than precision.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI tools make writing code cheaper, so "I shipped a lot of code" is a weaker signal than ever. Staff-level expectations shift to things AI cannot do alone: choosing <i>which</i> problem to solve, getting several teams to agree, setting guardrails for how AI-generated code is reviewed, and being accountable for the result. Expect questions like "how did your team adopt AI tools, and what went wrong?"</p>
    <p><b>Use AI as a partner:</b> paste your story and ask <code>Which of scope, impact, ambiguity, influence and horizon is weakest here? Ask me 3 follow-ups an L6 interviewer would ask. Do not rewrite my story.</code></p>
    <p><b>Where AI goes wrong:</b> it inflates scope ("organization-wide transformation") and invents tidy numbers. Interviewers can smell this in follow-ups. <b>What you must own:</b> every number, every name, every trade-off in the story must be something you can defend from memory.</p>`,
  problems: [
    P({
      t: 'Describe the biggest-scope project you have owned', l: 'Medium', tags: ['scope', 'impact', 'senior'],
      s: 'An interviewer says: "Tell me about the biggest-scope project you have owned." Give an answer that makes the size of the circle obvious without bragging.',
      ex: `<p>Good shape: ${H.c('g', 'one sentence of scope')} + ${H.c('b', 'the unclear part')} + ${H.c('y', 'what only you did')} + ${H.c('p', 'a number')}.</p>`,
      weak: 'We rebuilt our notification system. It was a big project with lots of moving parts and I worked really hard on it. It launched and everyone was happy.',
      why: 'No scope (how many teams or users?), no ambiguity, no number, and "we" hides your role. The listener cannot tell if this was a two-week task or a two-year program.',
      q: ['Which phrase best signals staff-level scope?', ['"I worked on a big project"', '"Six teams now publish through the platform I proposed"', '"I worked very late to finish it"'], 1, 'Scope is the number of people, teams or systems that changed because of your work. Effort and size words alone say nothing.'],
      h: ['<p>Hint 1: Start with the circle. Say how many teams, systems or customers depended on this before you describe any code.</p>', '<p>Hint 2: Name what was unclear at the start. Ambiguity is the second big level signal.</p>', '<p>Hint 3: Recipe: one line of scope, one line of ambiguity, two lines of your actions, one result with a number, one learning.</p>'],
      a: `<p><b>Model answer.</b> "At Lumen Retail, three product teams each sent their own emails, texts and push messages. <b>Nobody owned notifications as a whole</b>; users got duplicates and we had two outages a quarter [situation, ambiguity]. I took ownership of defining what a shared notification platform should be [task]. I interviewed the three teams, wrote a four-page proposal with two options and a migration plan, and ran the review with their tech leads. I built the first version with two engineers and onboarded one team per quarter [actions, horizon]. After three quarters all three teams used it, duplicate sends fell 80%, and notification incidents went from eight a year to one [result]. I learned that adoption is the real product: I should have started onboarding the second team a month earlier [learning]."</p><p>Signals landed: scope (three teams), ambiguity (no owner), influence (proposal, review), horizon (three quarters), impact (80%, 8 to 1).</p>`,
      cx: '<p>Rubric: Senior = owned a whole team system with numbers. Staff = also shaped other teams\' work and defined the problem. Principal = company-level direction, multi-year.</p>',
      f: ['What would you have done if the second team refused to migrate?', 'How did you measure the 80%?']
    })
  ]
});

topics.push({
  title: 'Influence Across Teams: RFCs, Alignment and Dissent',
  analogy: `<p>Imagine moving a <b>village market</b> to a new square. You cannot order the stall owners; you do not manage them. You walk around, ask what each fears (rent? foot traffic?), draw a map everyone can mark up, and hold a town meeting only once most people already nod. Influence is <b>earned by listening first and writing things down</b>, not by rank.</p>`,
  explain: `<p>Staff engineers rarely have authority over the people they need. Interviewers ask about influence because it is the main skill that separates senior from staff. A solid influence story has five moves:</p>
    <ol>
      <li><b>Map the people.</b> Who decides? Who is affected? Who can block? Who is a quiet expert?</li>
      <li><b>Write it down.</b> An alignment doc or RFC (Request For Comments): problem, goals, non-goals, options, recommendation, risks. Writing forces clarity and lets people comment without a meeting.</li>
      <li><b>Pre-wire.</b> Talk to key people one-on-one <i>before</i> the big review so there are no surprises.</li>
      <li><b>Handle dissent.</b> Invite objections, find the real concern, change the plan if they are right, and say clearly when you disagree and commit.</li>
      <li><b>Decide and record.</b> A named decision-maker, a date, and a written outcome.</li>
    </ol>
    ${H.table(['Situation', 'Weak move', 'Strong move'], [
      ['Another team resists', 'Escalate to a VP', 'Ask what they fear, adjust, then escalate only for a true conflict of goals'],
      ['Many opinions', 'Hold a long meeting', 'Write an RFC, collect comments, hold a short decision meeting'],
      ['A senior person disagrees', 'Give in or push through', 'Understand the concern, test it with data, record the decision either way'],
      ['No one reads the doc', 'Send a reminder', 'Shorten it, walk key people through it in 1:1s']
    ])}
    <p>The phrase to remember: <b>"disagree and commit"</b>. It means you argue honestly, then once a decision is made, you support it fully, even if you lost.</p>`,
  clues: [
    '"Tell me about a time you influenced <b>without authority</b>"',
    '"Describe a time you got <b>multiple teams</b> to agree"',
    '"How did you handle <b>disagreement</b> with a senior engineer / another team?"',
    '"A time a stakeholder <b>pushed back</b> on your proposal"',
    '"How do you drive <b>consensus</b> on a technical decision?"',
    '"Did you ever <b>change your mind</b> because of someone\'s feedback?"'
  ],
  viz: [
    {
      title: 'Stakeholder map: from RFC draft to a signed decision',
      input: 'Dana',
      inputLabel: 'Name of the skeptic (any first name)',
      gen: function (input) {
        var sk = String(input || 'Dana').replace(/[^A-Za-z ]/g, '').slice(0, 14) || 'Dana';
        var nodes = [
          { id: 'me', label: 'You (RFC author)', x: 14, y: 30, shape: 'box', w: 22 },
          { id: 'pay', label: 'Payments lead', x: 48, y: 8, shape: 'box', w: 22 },
          { id: 'sec', label: 'Security', x: 48, y: 30, shape: 'box', w: 22 },
          { id: 'sk', label: sk + ' (skeptic)', x: 48, y: 52, shape: 'box', w: 22 },
          { id: 'vp', label: 'VP Eng (decider)', x: 86, y: 30, shape: 'box', w: 22 }
        ];
        var E = [['me', 'pay'], ['me', 'sec'], ['me', 'sk'], ['pay', 'vp'], ['sec', 'vp'], ['sk', 'vp']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'Who needs to be on board', directed: true, height: 60, nodes: nodes, edges: E, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        return [
          { narr: '<b>Step 1: Map the people.</b> You need three teams plus the VP to agree. ' + H.esc(sk) + ' leads a team that will lose some control, so expect resistance.', parts: [g({ me: 'sel' }, {}, { vp: 'decides', sk: 'may block' })] },
          { narr: '<b>Step 2: Write the RFC.</b> One doc: problem, goals, non-goals, two options, recommendation, risks. Now everyone argues about the same page, not their memory.', parts: [g({ me: 'cur' }, {}, { me: 'RFC v1' }), { type: 'text', html: 'RFC sections: <b>Problem</b> &middot; <b>Goals / Non-goals</b> &middot; <b>Options</b> &middot; <b>Recommendation</b> &middot; <b>Risks</b>' }] },
          { narr: '<b>Step 3: Pre-wire.</b> Short 1:1s with Payments and Security first. They are friendly; their feedback improves the doc and their support builds momentum.', parts: [g({ me: 'cur', pay: 'ok', sec: 'ok' }, { 'me-pay': 'ok', 'me-sec': 'ok' }, { pay: 'supports', sec: 'supports' })] },
          { narr: '<b>Step 4: Meet the skeptic early.</b> ' + H.esc(sk) + ' says: "This forces my team to migrate in one quarter." That is a real concern, not an attack. You ask questions and listen.', parts: [g({ me: 'cur', sk: 'bad', pay: 'ok', sec: 'ok' }, { 'me-sk': 'bad' }, { sk: 'objects' })] },
          { narr: '<b>Step 5: Change the plan.</b> You add a phased rollout with a 2-quarter window and a migration helper. The objection was right, so the RFC gets better. Credit ' + H.esc(sk) + ' in the doc.', parts: [g({ me: 'cur', sk: 'ok', pay: 'ok', sec: 'ok' }, { 'me-sk': 'ok' }, { sk: 'agrees with changes', me: 'RFC v2' })] },
          { narr: '<b>Step 6: Short decision meeting.</b> Nothing new is discussed; the VP asks for risks and an owner, and signs the decision record.', parts: [g({ vp: 'cur', pay: 'ok', sec: 'ok', sk: 'ok' }, { 'pay-vp': 'ok', 'sec-vp': 'ok', 'sk-vp': 'ok' }, { vp: 'decided' })] },
          { narr: '<b>Outcome:</b> a written decision, named owners, a date. If someone still disagrees, they are heard, recorded, and they <b>disagree and commit</b>.', parts: [g({ me: 'sel', vp: 'sel', pay: 'sel', sec: 'sel', sk: 'sel' }, { 'me-pay': 'ok', 'me-sec': 'ok', 'me-sk': 'ok', 'pay-vp': 'ok', 'sec-vp': 'ok', 'sk-vp': 'ok' }, { vp: 'decision record' })] }
        ];
      }
    }
  ],
  examples: [
    { title: 'Weak vs strong: "Tell me about influencing without authority"', html: `<p><span class="c-r">Weak:</span> "Another team did not want to use my library, so I asked my manager to tell them to use it. They did."</p>
      <p>Why weak: authority borrowed from a manager, nothing learned about the other team\'s real concern, relationship damaged.</p>
      <p><span class="c-g">Strong:</span> "The Search team refused my caching library. Instead of escalating I asked what worried them: they feared a hidden single point of failure [listening]. I added a fallback mode and a load test they could run themselves, and shared the results in my RFC [action]. They became the first adopter and later the loudest advocate [result]. Two more teams followed within a quarter [scope]."</p>` },
    { title: 'What a good RFC outline looks like', html: `<p>Short is better. Aim for 2 to 4 pages that a busy director can read in ten minutes.</p>`, code: { lang: 'text', code: 'RFC-27: Shared Rate Limiter\nOwner: you   Decider: VP Eng   Review by: Oct 30\n1. Problem      Three teams each built their own limiter; 2 outages last quarter\n2. Goals        One limiter, 99.9% available, adopt in 2 quarters\n3. Non-goals    Per-customer billing, replacing the API gateway\n4. Options      A) extend gateway  B) shared library  C) buy a service\n5. Recommend    B, because ... (trade-offs listed)\n6. Risks        Migration effort for Search (mitigation: helper tool)\n7. Open questions / Decision log' } },
    { title: 'Handling a senior person who disagrees', html: `<p>A principal engineer says your design is over-engineered. Steps that read as staff-level: (1) <b>restate</b> their point so they feel heard, (2) ask <b>what evidence would change your mind</b> (both ways), (3) run a small test or look at past incidents, (4) agree on a decision rule, (5) record the outcome. If you still disagree and the decision goes against you, say: "I raised my concerns, the decision was made, and I committed fully. Here is how I made it work."</p>` }
  ],
  deepDive: `<p><b>Decision rights beat persuasion.</b> Before persuading anyone, clarify <i>who decides</i>. Many conflicts are really two people who each think they own the decision. Tools: a DACI/RACI table (Driver, Approver, Contributors, Informed), or just a line in the RFC: "Decider: Maya (VP Eng). Decision date: Oct 30."</p>
    <p><b>The real concern is rarely the stated one.</b> "This is too risky" often means "I will be on call for it", "I was not consulted", or "my team loses headcount". Ask "what would make this feel safe to you?" and listen for the second sentence.</p>
    <p><b>Healthy vs unhealthy dissent.</b> Healthy: specific, about the work, raised before the decision, recorded. Unhealthy: sniping after the decision, relitigating every sprint. A staff engineer protects the first and gently stops the second by pointing to the decision record.</p>
    <p><b>When to escalate.</b> Escalate for (a) a true conflict of company goals that neither side can resolve, (b) a deadline or safety risk, (c) a stuck decision with no owner. Do it openly ("I am going to ask Maya to decide; here is the one-page summary of both options") never behind someone's back.</p>
    <p><b>Scaling influence.</b> One-to-one persuasion does not scale. Staff engineers leave behind <i>artifacts</i>: a template RFC, a decision log, a design review ritual, a paved road. Mention these; they show you improved how the org decides, not just one decision.</p>`,
  aiEra: `<p><b>What AI changes:</b> Drafting an RFC is faster, so the bar moves to <i>judgment and alignment</i>. A polished doc no longer proves you thought hard. Reviewers also use AI to summarize your RFC, so write clear headings, explicit decisions, and a short "TL;DR" a summarizer cannot mangle. New decisions appear: which AI tools are approved, how AI-generated code is reviewed, what data may be sent to a model. These need cross-team agreement, which is exactly staff work.</p>
    <p><b>Use AI as a partner:</b> <code>Here is my RFC. Play a skeptical owner of the Search team. List the 5 strongest objections and what each person really fears.</code> Then talk to the real human.</p>
    <p><b>Where AI goes wrong:</b> it writes confident prose that hides open questions, and it cannot read a room. <b>What you must own:</b> the 1:1 conversations, the trust, and the final recommendation.</p>`,
  problems: [
    P({
      t: 'Get three teams to agree on one API', l: 'Medium', tags: ['influence', 'rfc', 'consensus'],
      s: 'Tell me about a time you needed several teams to agree on a shared technical approach, and one of them did not want to.',
      ex: `<p>Look for the sequence: ${H.c('b', 'map people')} → ${H.c('g', 'write RFC')} → ${H.c('y', 'pre-wire')} → ${H.c('r', 'meet the objector')} → ${H.c('p', 'decision record')}.</p>`,
      weak: 'Three teams had different APIs. I set up a meeting, presented my design, and when one team disagreed I asked my director to make them follow it.',
      why: 'The meeting was the first time people saw the idea (no pre-wiring), the objection was not understood, and the win came from rank, not influence. The result will not last.',
      q: ['What is the main benefit of pre-wiring before a review meeting?', ['It lets you avoid hearing objections', 'It removes surprises and improves the proposal before the public discussion', 'It makes the meeting longer'], 1, 'Pre-wiring brings concerns out in private, where people feel safe, so the group meeting is a confirmation, not a fight.'],
      h: ['<p>Hint 1: Start by naming the stakeholders and what each cared about, in one sentence each.</p>', '<p>Hint 2: Show a written artifact (RFC or alignment doc) and the order in which you talked to people.</p>', '<p>Hint 3: Include a moment where the objection changed your plan, then the decision record and the result in numbers.</p>'],
      a: `<p><b>Model answer.</b> "At Brightloop, Orders, Billing and Returns each exposed a different money format, and finance reports kept breaking [situation]. Nobody owned the contract, so I volunteered to drive a shared API [task, ambiguity]. I listed the three tech leads and what each cared about: Orders wanted no rewrite, Billing wanted precision, Returns wanted a short timeline. I wrote a three-page RFC with two options and met each lead one-on-one before the review [actions]. Returns objected that a one-quarter migration was impossible. That was fair, so I added a compatibility adapter and a two-quarter window, and credited them in the doc. At the 30-minute review there were no surprises; the VP signed the decision record [influence]. Both teams migrated on schedule, finance report failures went from weekly to none, and the adapter became the template two later migrations reused [result]. I learned to ask 'what would make this safe for you?' in the very first conversation [learning]."</p>`,
      cx: '<p>Rubric: Senior = persuaded peers on own team. Staff = aligned multiple teams using writing and listening. Principal = set the decision process itself for the org.</p>',
      f: ['What if Returns still said no?', 'How did you decide who to talk to first?']
    })
  ]
});

topics.push({
  title: 'Technical Strategy Stories: Roadmaps, Build vs Buy, Migrations',
  analogy: `<p>Strategy is <b>planning a road trip with 10 friends</b>, not driving the car. You pick the destination, decide the route with toll roads and detours, book rest stops, and agree what to do if the bridge is closed. A tactical engineer asks "how do I fix this tyre?" A strategic one asks "where are we going this year, and what must be true on the way?"</p>`,
  explain: `<p>A technical strategy story shows you can look <b>beyond the current sprint</b>. Interviewers want to hear four things: the <b>diagnosis</b> (what is really wrong), the <b>guiding policy</b> (the approach and what you will not do), <b>coherent actions</b> (a sequenced plan over quarters), and <b>how you handled the trade-offs and surprises</b>.</p>
    ${H.table(['Strategy part', 'Plain question', 'Example'], [
      ['Diagnosis', 'What is the real problem?', 'Our monolith deploy takes 4 hours; teams block each other'],
      ['Guiding policy', 'What approach, what NOT to do?', 'Carve out services only along team lines; no rewrite from scratch'],
      ['Actions', 'What happens in which quarter?', 'Q1 pilot, Q2 two teams, Q3 majority, Q4 shut the old path'],
      ['Checks', 'How will we know it works / stop?', 'Deploy time, incident count; stop rule if error rate rises 2x']
    ])}
    <h5>Build vs buy in plain words</h5>
    <p>Ask: <b>Is this what makes our company special?</b> If not (payments fraud scoring, email delivery, search infra for a small team), lean buy. If yes (your core ranking, your core data), lean build. Then check the hidden costs: integration work, vendor lock-in, security review, the exit plan, and the cost of owning it at 3 a.m.</p>
    <h5>Migrations and deprecations</h5>
    <p>The hard part is never the new system; it is the <b>last 20% of users on the old one</b>. Good plans have: a pilot with a friendly team, a compatibility layer, a measurable adoption dashboard, a deadline with a named owner, and a clear end ("old system turned off on March 1"). A migration that never ends is a failure even if the new thing is great.</p>
    <p>Say out loud what you <b>chose not to do</b> and why. "We did not rewrite; we strangled the old system piece by piece" shows judgment.</p>`,
  clues: [
    '"Tell me about a <b>multi-quarter</b> / <b>long-term</b> technical project you drove"',
    '"How did you decide whether to <b>build or buy</b>?"',
    '"Describe a <b>migration</b> you led. What went wrong?"',
    '"How did you <b>deprecate</b> a system that people still used?"',
    '"How do you balance <b>tech debt</b> against feature work?"',
    '"What was your <b>technical vision</b> for the team, and how did you sell it?"'
  ],
  viz: [
    {
      title: 'Migration roadmap over four quarters',
      input: '10 40 80 100',
      inputLabel: 'Percent of traffic migrated at end of Q1 Q2 Q3 Q4 (4 numbers)',
      gen: function (input) {
        var v = String(input || '').trim().split(/[\s,]+/).map(Number);
        if (v.length !== 4 || v.some(function (x) { return isNaN(x) || x < 0 || x > 100; })) throw new Error('Enter 4 numbers from 0 to 100, like: 10 40 80 100');
        var Q = ['Q1', 'Q2', 'Q3', 'Q4'];
        var plan = [
          ['Pilot with one friendly team; build compat layer', 'Dashboard for adoption'],
          ['Two more teams; fix gaps found in pilot', 'Weekly office hours'],
          ['Majority of teams; freeze new features on old system', 'Stop rule: error rate 2x'],
          ['Last stragglers; turn old system off', 'Decommission date announced']
        ];
        var frames = [], rows = [];
        frames.push({ narr: 'A migration roadmap is a table over time: <b>what we do</b> and <b>how we check</b> each quarter. We fill it quarter by quarter and watch the percentage grow.', parts: [{ type: 'table', label: 'Roadmap', columns: ['Quarter', 'Actions', 'Check', '% migrated'], rows: [] }] });
        for (var i = 0; i < 4; i++) {
          rows.push([Q[i], plan[i][0], plan[i][1], v[i] + '%']);
          var last = v[i] < 100 && i === 3;
          frames.push({
            narr: '<b>' + Q[i] + '</b>: ' + plan[i][0] + '. ' + (i === 3 ? (last ? '<span class="c-r">Only ' + v[i] + '% migrated at the end: the long tail is the real risk. Plan an extension and a hard deadline.</span>' : '<span class="c-g">100%: the old system can be switched off.</span>') : 'Now at <b>' + v[i] + '%</b>.'),
            parts: [
              { type: 'table', label: 'Roadmap', columns: ['Quarter', 'Actions', 'Check', '% migrated'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; h[i] = 'cur'; return h; })() },
              { type: 'bars', label: '% migrated by quarter', values: v.slice(0, i + 1), idxLabels: Q.slice(0, i + 1), texts: v.slice(0, i + 1).map(function (x) { return x + '%'; }), hl: (function () { var h = {}; h[i] = 'cur'; return h; })() }
            ]
          });
        }
        frames.push({ narr: 'Finished roadmap. A good story also names the <b>surprise</b> (what slipped) and the <b>decision rule</b> you used when it did.', parts: [{ type: 'array', label: '% migrated at quarter end', values: v.slice(), idxLabels: Q, hl: { 3: v[3] === 100 ? 'ok' : 'bad' } }] });
        return frames;
      }
    },
    {
      title: 'Build vs buy decision table',
      input: '3 2 4 2',
      inputLabel: 'Score 1-5 for: core to our business, time pressure, vendor risk, team capacity',
      gen: function (input) {
        var v = String(input || '').trim().split(/[\s,]+/).map(Number);
        if (v.length !== 4 || v.some(function (x) { return isNaN(x) || x < 1 || x > 5; })) throw new Error('Enter 4 scores from 1 to 5, like: 3 2 4 2');
        var names = ['Core to our business', 'Time pressure', 'Vendor risk', 'Team capacity'];
        var lean = [v[0] >= 4 ? 'build' : 'buy', v[1] >= 4 ? 'buy' : 'neutral', v[2] >= 4 ? 'build' : 'neutral', v[3] <= 2 ? 'buy' : 'neutral'];
        var frames = [], rows = [];
        frames.push({ narr: 'We score four questions from 1 (low) to 5 (high). Each one nudges you toward <b>build</b> or <b>buy</b>. It is a thinking tool, not a calculator.', parts: [{ type: 'table', label: 'Build vs buy', columns: ['Question', 'Score', 'Nudge'], rows: [] }] });
        var b = 0, y = 0;
        for (var i = 0; i < 4; i++) {
          rows.push([names[i], v[i], lean[i]]);
          if (lean[i] === 'build') b++; if (lean[i] === 'buy') y++;
          frames.push({ narr: '<b>' + names[i] + '</b> = ' + v[i] + ' so the nudge is <b>' + lean[i] + '</b>. Tally: build ' + b + ', buy ' + y + '.', parts: [{ type: 'table', label: 'Build vs buy', columns: ['Question', 'Score', 'Nudge'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; h[i] = 'cur'; return h; })() }, { type: 'vars', vals: { build: b, buy: y } }] });
        }
        var verdict = b > y ? 'lean BUILD' : y > b ? 'lean BUY' : 'TIE: run a 2-week spike on both';
        frames.push({ narr: 'Verdict: <b>' + verdict + '</b>. In the interview, say the verdict AND the two things you checked next (exit plan, total cost of ownership).', parts: [{ type: 'vars', vals: { build: b, buy: y, verdict: verdict }, hl: { verdict: 'sel' } }] });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Weak vs strong: "Tell me about a migration you led"', html: `<p><span class="c-r">Weak:</span> "We migrated from the old database to the new one. There were some issues but we fixed them and it was done by the deadline."</p>
      <p><span class="c-g">Strong:</span> "Our order database was at 85% of capacity with no headroom for Black Friday [diagnosis]. I proposed moving in phases rather than a big-bang cutover, with a shadow-write mode so we could compare results [guiding policy]. Q1 pilot on the returns service, Q2 two more services, Q3 the rest, Q4 turn off [horizon]. In Q2 we found a rounding difference that would have misbilled 0.2% of orders; shadow mode caught it before customers did [surprise]. We finished one month late, with zero customer-visible incidents, and cut database cost 35% [result]."</p>` },
    { title: 'Deprecating something people love', html: `<p>You must retire the old reporting tool. Steps: (1) find real usage (logs, not opinions), (2) build or point to a replacement that covers the top 3 use cases, (3) announce a date 2 quarters out, (4) help the top 10 users personally, (5) brown-out the old tool for a day to find hidden users, (6) turn off on the date, keep a read-only archive. Stories that include a <b>brown-out</b> or a <b>usage dashboard</b> sound experienced.</p>` },
    { title: 'Balancing tech debt with features', html: `<p>Say how you made debt visible and priced: "I tagged debt tickets by the incidents they caused. Three items caused 70% of pages. I asked product for 20% of two quarters, showed the fix would pay back in 6 weeks of saved on-call time, and we did it." The strong move is turning vague debt into <b>cost per month</b> and agreeing a fixed budget.</p>`, code: { lang: 'text', code: 'Debt pricing card\nItem: flaky deploy script\nPain:  3 failed deploys/week x 40 min = 2 h/week (= ~8 h/month)\nRisk:  one bad deploy caused SEV-2 in March\nFix:   3 engineer-days\nPays back in: ~1.5 months' } }
  ],
  deepDive: `<p><b>Rumelt\'s kernel.</b> The best short model for strategy is diagnosis, guiding policy, coherent actions. Weak "strategies" are just goal lists ("be faster, be more reliable"). A real strategy says <i>what you will not do</i>. In interviews, volunteering a deliberate "no" is the clearest staff signal.</p>
    <p><b>Migration patterns.</b> Strangler fig (grow the new system around the old, route traffic piece by piece), dual write plus shadow read (compare old and new), feature-flagged rollout by percent, and expand/contract schema changes (add new, write both, move readers, remove old). Know which one you used and why a big-bang was too risky.</p>
    <p><b>Build vs buy beyond cost.</b> Total cost of ownership includes on-call, upgrades, hiring people who know it, and the exit cost. Buying also changes your risk: vendor outage, price change, data residency, and security review. Ask "what happens if this vendor doubles the price or disappears?" and have a one-sentence answer.</p>
    <p><b>Roadmaps are bets, not promises.</b> Show confidence by horizon: next quarter firm, two quarters likely, a year directional. Revisit quarterly and write down what changed. Interviewers like hearing "I changed the plan in Q2 because of X", not "everything went to plan".</p>
    <p><b>Measuring strategy.</b> Pick 2 or 3 leading indicators (adoption %, deploy time) and 1 lagging outcome (incidents, cost). Share them in a dashboard anyone can open.</p>`,
  aiEra: `<p><b>What AI changes:</b> strategy now includes AI decisions: build on a hosted model API or run your own? Which workflows deserve AI features and which are demos? How do you budget unpredictable token costs and handle model deprecations (models are retired on a schedule, so migrations are permanent)? "Build vs buy" now often means <i>prompt and glue vs fine-tune vs buy a product</i>.</p>
    <p><b>Use AI as a partner:</b> <code>Here is my migration plan by quarter. List what could go wrong in each quarter and what early warning signal I should watch. Do not choose for me.</code> It is a fast pre-mortem partner.</p>
    <p><b>Where AI goes wrong:</b> it produces generic plans that ignore your team\'s real capacity and politics, and it loves big rewrites. <b>What you must own:</b> the diagnosis, the "no" list, the stop rule, and the honest estimate of what your org can absorb.</p>`,
  problems: [
    P({
      t: 'A migration that ran into the long tail', l: 'Hard', tags: ['migration', 'strategy', 'deprecation'],
      s: 'Tell me about a migration or deprecation you led where the last few users were hard to move. How did you finish it?',
      ex: `<p>Signal words: ${H.c('g', 'phased')}, ${H.c('b', 'adoption dashboard')}, ${H.c('y', 'brown-out')}, ${H.c('p', 'deadline + owner')}, ${H.c('r', 'stop rule')}.</p>`,
      weak: 'We moved to the new platform. Most teams moved quickly. A few teams were slow so we kept supporting the old one for a while.',
      why: '"For a while" has no end date. No plan for the long tail, no data, no owner, and no sign of how the answerer moved people. Interviewers hear a migration that never ended.',
      q: ['What is the best way to find hidden users of a system you want to retire?', ['Ask everyone in a big meeting', 'Run a planned brown-out and watch who complains', 'Turn it off without warning'], 1, 'A short announced outage reveals real dependencies safely, which logs and opinions often miss.'],
      h: ['<p>Hint 1: Describe the old and new system in one sentence, and why moving was worth it (a number).</p>', '<p>Hint 2: Show tools: adoption dashboard, compatibility layer, office hours, brown-out, hard date.</p>', '<p>Hint 3: Name the stragglers by type (not people), what each needed, and the moment you decided to set a hard date.</p>'],
      a: `<p><b>Model answer.</b> "Lumen Retail ran an in-house job scheduler that three teams maintained badly; it caused six incidents a year [situation]. I was asked to retire it within a year but no one owned the migration [task, ambiguity]. I wrote a plan: move to the managed scheduler, build a small compatibility wrapper so teams changed one import, and publish an adoption dashboard by team [actions]. Eight of eleven teams moved in two quarters. The last three had odd needs: one used a private feature, one was understaffed, one simply ignored email. I ran office hours, personally migrated the understaffed team's two jobs with them, and replaced the private feature with a documented option. Then I announced a hard date, ran a one-hour brown-out two weeks before, which exposed a forgotten finance job, and turned the old scheduler off on the day [influence, long tail]. Incidents went from six a year to one and we saved about two engineer-months a year [result]. Next time I would set the hard date on day one, because the dashboard alone did not create urgency [learning]."</p>`,
      cx: '<p>Rubric: Senior = finished a migration for own team. Staff = finished it across teams with a deadline and owner. Principal = shaped the platform strategy that prevents the next long tail.</p>',
      f: ['What would you have done if the finance team refused to move?', 'How did you decide on a hard date versus extending?']
    })
  ]
});

topics.push({
  title: 'Mentoring and Raising the Bar',
  analogy: `<p>A great coach does not score the goals. They make the <b>whole team better</b>: they spot that one player is weak on the left foot, design a drill, then step back and cheer. Mentoring is <b>growing someone else's skills on purpose</b>. Raising the bar is the same idea for the whole team: better reviews, better hiring, better habits.</p>`,
  explain: `<p>At senior and staff level, your output is measured partly by <b>other people's growth</b>. Interviewers ask: who did you grow, how, and what proof? A good answer includes a starting point, a plan, how you gave feedback, how you stepped back, and the outcome (promotion, ownership, a skill they now have).</p>
    ${H.table(['Style', 'What it looks like', 'When it fits'], [
      ['Teaching', 'You show how, step by step', 'New skill, early career'],
      ['Coaching', 'You ask questions; they find the answer', 'Capable person, stuck on judgment'],
      ['Sponsoring', 'You put their name forward for a visible task', 'Ready for the next level, needs visibility'],
      ['Delegating', 'You hand over a whole problem', 'Proven; you want them to own it']
    ])}
    <h5>A simple growth plan</h5>
    <ol>
      <li><b>Find the gap</b> against the next level (design, ownership, communication, influence).</li>
      <li><b>Pick one or two skills</b>, not five.</li>
      <li><b>Give a stretch task</b> with a safety net, such as owning a small design doc.</li>
      <li><b>Give feedback</b> fast and specific: situation, behaviour, effect, what to try next.</li>
      <li><b>Step back</b> each quarter: you do less, they do more.</li>
    </ol>
    <h5>Raising the bar</h5>
    <p>Examples: a code review checklist that catches the three most common bugs, a design review template, interview calibration with clear rubrics, a written onboarding path, a rule that every incident ends with a documented fix. The question is: <b>what keeps working after I leave the room?</b></p>`,
  clues: [
    '"Tell me about a time you <b>mentored</b> someone / helped someone <b>get promoted</b>"',
    '"How do you give <b>difficult feedback</b>?"',
    '"How have you <b>raised the bar</b> on your team?"',
    '"Describe someone you <b>helped become more independent</b>"',
    '"How do you work with an underperformer?"',
    '"What is your approach to <b>hiring</b> and interview calibration?"'
  ],
  viz: [
    {
      title: 'Growth plan grid: from today to the next level',
      input: '2 1 2 1',
      inputLabel: 'Current skill level 1-4 for: Design, Ownership, Communication, Influence',
      gen: function (input) {
        var v = String(input || '').trim().split(/[\s,]+/).map(Number);
        if (v.length !== 4 || v.some(function (x) { return isNaN(x) || x < 1 || x > 4; })) throw new Error('Enter 4 levels from 1 to 4, like: 2 1 2 1');
        var skills = ['Design', 'Ownership', 'Communication', 'Influence'];
        var target = 3;
        var cols = ['Now', 'Month 3', 'Month 6', 'Month 12'];
        var cur = v.slice();
        // gap = target - level; focus on the two biggest gaps first
        var order = [0, 1, 2, 3].sort(function (a, b) { return (v[b] === v[a]) ? a - b : v[a] - v[b]; });
        var focus = order.slice(0, 2);
        var stretch = ['Own a small design doc', 'Run the on-call handover', 'Present at the team review', 'Lead a cross-team RFC'];
        var snaps = [cur.slice()];
        var s = cur.slice();
        for (var m = 1; m < 4; m++) {
          focus.forEach(function (f) { if (s[f] < target) s[f] += 1; });
          snaps.push(s.slice());
        }
        function grid(upTo, hlc) {
          var rows = skills.map(function (_, r) { var row = []; for (var c = 0; c < 4; c++) row.push(c <= upTo ? snaps[c][r] : ''); return row; });
          var hl = {};
          for (var r2 = 0; r2 < 4; r2++) for (var c2 = 0; c2 <= upTo; c2++) {
            if (focus.indexOf(r2) >= 0 && c2 > 0) hl[r2 + ',' + c2] = c2 === upTo ? 'cur' : 'ok';
            if (c2 === 0) hl[r2 + ',0'] = 'win';
          }
          return { type: 'grid', label: 'Skill level by month (target: ' + target + ')', rowHead: skills, colHead: cols, rows: rows, hl: hl };
        }
        var frames = [];
        frames.push({ narr: '<b>Step 1: Find the gap.</b> Rate each skill 1 to 4. The next level needs about <b>' + target + '</b> on each. Blue cells are today.', parts: [grid(0)] });
        frames.push({ narr: '<b>Step 2: Pick one or two skills.</b> The biggest gaps are <b>' + focus.map(function (f) { return skills[f]; }).join(' and ') + '</b>. Do not try to fix everything; focus speeds growth.', parts: [grid(0), { type: 'vars', vals: { focus: focus.map(function (f) { return skills[f]; }).join(' + '), stretch: stretch[focus[0]] }, hl: { focus: 'sel' } }] });
        for (var c = 1; c < 4; c++) {
          frames.push({ narr: '<b>' + cols[c] + ':</b> give a stretch task (<i>' + stretch[focus[c % 2]] + '</i>), then fast specific feedback. Cells that improved are green; the newest is amber. Your help gets smaller each time.', parts: [grid(c), { type: 'vars', vals: { 'your help': ['high', 'medium', 'low'][c - 1], stretch: stretch[focus[c % 2]] }, hl: { 'your help': c === 3 ? 'ok' : 'cur' } }] });
        }
        frames.push({ narr: '<b>Outcome:</b> evidence for the interview: "By month 12 they led an RFC alone and were promoted." Always state the proof, not just the effort.', parts: [grid(3)] });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Weak vs strong: "Tell me about someone you mentored"', html: `<p><span class="c-r">Weak:</span> "I mentored a junior engineer. We met weekly and I answered their questions. They did well."</p>
      <p><span class="c-g">Strong:</span> "Ravi was a solid coder but never owned a design, which blocked his promotion to senior [gap]. We picked two goals: write design docs and run a review [focus]. I gave him a small but real design (a retry policy for the payments client) and only reviewed it, not wrote it [stretch task]. When he presented, he skipped trade-offs. I gave feedback within the hour: 'The reviewers asked three questions you had no answer for; next time add an options table' [feedback]. Over two quarters I stopped attending his reviews. He led an RFC used by four teams and was promoted [outcome]. I learned to ask him to teach the next person, which locked in his own learning."</p>` },
    { title: 'Giving hard feedback (SBI+)', html: `<p>Use <b>Situation, Behaviour, Impact, Next step</b>. <i>"In yesterday's design review [S], you interrupted Mia three times [B]. She stopped sharing, and we missed a risk she knew about [I]. Next review, can you try asking one question before giving your view? [N]"</i> Say it privately, soon, and with a real example.</p>` },
    { title: 'A bar-raising move that outlasts you', html: `<p>Story: "Reviews varied wildly by reviewer. I analysed 40 past bugs, found that 60% were missing error handling, null checks or tests. I wrote a 10-line review checklist, added it to the PR template, and ran one session. Escaped bugs from review fell by a third in two quarters and new hires used the checklist on day one."</p>`, code: { lang: 'text', code: 'PR checklist (10 lines)\n[ ] Error paths handled and tested\n[ ] No new unbounded loops or queries\n[ ] Logs have request id, no secrets\n[ ] Backward compatible API change\n[ ] Rollback plan stated for risky changes' } }
  ],
  deepDive: `<p><b>Sponsorship vs mentorship.</b> A mentor gives advice; a sponsor spends their own credibility. Staff engineers do both: they recommend someone for a high-visibility project, speak up for them in calibration, and share credit publicly. Interviewers love "I gave the talk slot to Priya" more than "I helped Priya".</p>
    <p><b>Calibrating the stretch.</b> Too easy = no growth. Too hard with no net = panic. A good stretch is roughly 20% beyond comfort, with a clear check-in point and a rule like "ask me after 2 hours of being stuck, not 2 days".</p>
    <p><b>When mentoring fails.</b> Mentee does not apply feedback? Make the expectation explicit, write it down, check progress on a fixed date, and involve the manager. Mismatch of motivation? Not every engineer wants the next level; respect that, and still define what great looks like at their level. Be honest in the interview about a case that did not work and what you learned; it shows maturity.</p>
    <p><b>Hiring as bar-raising.</b> Contribute to interview rubrics, calibrate scoring ("what does a 3 vs a 4 look like for this question?"), shadow and be shadowed, and write clear feedback. Say how you protected the bar when under pressure to fill a role.</p>
    <p><b>Scale it.</b> Move from one-to-one to one-to-many: guilds, written guides, office hours, a brown-bag series, templates. Numbers help: "7 engineers attended, 3 used the template within a month".</p>`,
  aiEra: `<p><b>What AI changes:</b> Juniors can now get an answer from an AI assistant in seconds, so the mentor's value shifts from "how do I do X" to <b>judgment</b>: when to distrust the output, how to read a diff, how to debug something you did not write. Raising the bar now includes review practices for AI-generated code (tests required, small diffs, a human owner for every line) and teaching people to explain code they shipped. A real risk: skills atrophy if people stop reasoning. Good mentors make juniors <i>predict before they ask</i>.</p>
    <p><b>Use AI as a partner:</b> <code>Here is my 1:1 note about an engineer who is strong in code but weak at design. Draft three stretch tasks of rising difficulty and what good looks like for each. I will adjust.</code></p>
    <p><b>Where AI goes wrong:</b> feedback written by AI reads generic and people can tell; it also cannot know the person\'s context. <b>What you must own:</b> the relationship, honesty, and the call on when someone is ready.</p>`,
  problems: [
    P({
      t: 'Grow an engineer to the next level', l: 'Medium', tags: ['mentoring', 'growth', 'feedback'],
      s: 'Tell me about an engineer you helped grow to the next level. What was the gap, what did you do, and how do you know it worked?',
      ex: `<p>Include: ${H.c('b', 'gap vs next level')}, ${H.c('g', 'one or two focus skills')}, ${H.c('y', 'stretch task')}, ${H.c('p', 'you stepping back')}, ${H.c('r', 'proof')}.</p>`,
      weak: 'I mentored a junior on my team. We had weekly one-on-ones and I helped him with his code. He improved a lot and everyone was happy.',
      why: 'No named gap, no plan, no stretch task, no step back, and "improved a lot" is not proof. It sounds like friendly chatting rather than deliberate growth.',
      q: ['Which is the strongest evidence that mentoring worked?', ['They said thank you', 'They independently led a cross-team design that others adopted', 'We met every week'], 1, 'Proof is a change in what the person can do alone. Meetings and thanks measure effort and feelings, not growth.'],
      h: ['<p>Hint 1: Name the exact gap compared with the next level (for example, owns tasks but not designs).</p>', '<p>Hint 2: Describe one stretch task with a safety net and one piece of specific feedback you gave.</p>', '<p>Hint 3: Show how your involvement shrank over time and the final proof (promotion, ownership, adoption).</p>'],
      a: `<p><b>Model answer.</b> "Priya was a strong coder at L4 but always waited for tasks, which kept her from senior [gap]. I agreed two goals with her and her manager: own a design end to end and run a project plan [plan]. I gave her a real, bounded problem, a rate-limit change for our public API, with me as reviewer only. In her first review she skipped failure cases, so I gave feedback within the hour using a short note: what reviewers asked, what she missed, what to try [feedback]. In month three I stopped joining her design reviews. By month six she led a cross-team RFC that two other teams adopted and ran the rollout herself [outcome]. She was promoted the next cycle; her manager cited the RFC and the rollout as evidence. I also asked her to mentor a new hire, which made her own habits stronger [multiplier]. One mistake: for the first month I fixed her docs myself instead of asking questions, so she learned less [learning]."</p>`,
      cx: '<p>Rubric: Senior = helps teammates on tasks. Staff = grows people deliberately with a plan and proof. Principal = builds programs (guilds, rubrics) that grow many people.</p>',
      f: ['What if she had not wanted the next level?', 'How did you decide when to step back?']
    })
  ]
});

topics.push({
  title: 'Handling Production Incidents: IC Role, Comms, Blameless Postmortems',
  analogy: `<p>A production incident is a <b>kitchen fire during dinner rush</b>. Cooks do not all grab hoses and shout. One person (the head chef) says who does what; one person talks to the dining room; one person writes down what happened; and later, with the fire out, the team asks "how do we stop this from happening again?" without blaming the new cook who was holding the pan.</p>`,
  explain: `<p>Incident stories test calm, structure, communication and learning. Interviewers listen for <b>roles</b>, <b>customer impact first</b>, <b>mitigate before you root-cause</b>, <b>clear updates</b>, and a <b>blameless postmortem that leads to systemic fixes</b>.</p>
    ${H.table(['Role', 'Job in one line'], [
      ['Incident Commander (IC)', 'Runs the response; decides; does NOT debug'],
      ['Ops / Tech lead', 'Investigates and applies the fix'],
      ['Communications lead', 'Updates status page, support and leaders on a schedule'],
      ['Scribe', 'Writes a timestamped log as things happen']
    ])}
    <h5>The order that matters</h5>
    <ol>
      <li><b>Detect and acknowledge.</b> Someone owns the page.</li>
      <li><b>Declare</b> and name an IC. Severity (SEV-1 = customers broadly hurt) decides who joins.</li>
      <li><b>Mitigate first</b>: roll back, flip a flag, fail over. Restore service, then find the root cause.</li>
      <li><b>Communicate</b> on a clock: "next update in 20 minutes", even if the update is "no news".</li>
      <li><b>Resolve</b> and watch the metrics for a while.</li>
      <li><b>Blameless postmortem</b> within days: timeline, contributing factors, what went well, action items with owners and dates.</li>
    </ol>
    <p><b>Blameless</b> does not mean "no accountability". It means we assume smart people made reasonable choices with the information they had, and we fix the <i>system</i> (missing guardrail, confusing dashboard, risky deploy) instead of punishing a person.</p>
    <p>Bad: "Sam pushed a bad config." Good: "Our deploy pipeline allowed a config change with no canary and no validation."</p>`,
  clues: [
    '"Tell me about a <b>production incident</b> / <b>outage</b> you handled"',
    '"Have you ever <b>led</b> a SEV-1 / been the <b>incident commander</b>?"',
    '"How did you <b>communicate</b> with customers or executives during it?"',
    '"What did you change <b>afterward</b> so it would not happen again?"',
    '"A time you made a <b>mistake</b> that caused an outage"',
    '"How do you run a <b>blameless postmortem</b>?"'
  ],
  code: [
    { lang: 'python', title: 'Incident timeline formatter (runnable)', run: true, code: PY_INC }
  ],
  codeTitle: ['Incident timeline formatter: turns raw events into a readable timeline plus time-to-acknowledge / declare / mitigate / resolve'],
  viz: [
    {
      title: 'Incident response timeline: events and roles',
      input: 'Checkout errors',
      inputLabel: 'Incident name (a short label)',
      gen: function (input) {
        var name = String(input || 'Checkout errors').slice(0, 40);
        var ev = [
          ['14:02', 'DETECT: error rate 0.2% to 18%'],
          ['14:05', 'ACK: on-call acknowledges the page'],
          ['14:11', 'DECLARE: SEV-1, IC named'],
          ['14:13', 'COMMS: status page posted'],
          ['14:24', 'MITIGATE: rollback started'],
          ['14:31', 'MITIGATE: rollback done'],
          ['14:40', 'RESOLVE: metrics healthy 10 min'],
          ['14:55', 'FOLLOW-UP: postmortem booked']
        ];
        var roles = [
          { IC: '-', Ops: 'on-call', Comms: '-', Scribe: '-' },
          { IC: '-', Ops: 'Priya', Comms: '-', Scribe: '-' },
          { IC: 'Priya', Ops: 'Marco', Comms: '-', Scribe: '-' },
          { IC: 'Priya', Ops: 'Marco', Comms: 'Aiko', Scribe: 'Sam' },
          { IC: 'Priya', Ops: 'Marco', Comms: 'Aiko', Scribe: 'Sam' },
          { IC: 'Priya', Ops: 'Marco', Comms: 'Aiko', Scribe: 'Sam' },
          { IC: 'Priya', Ops: 'Marco', Comms: 'Aiko', Scribe: 'Sam' },
          { IC: 'Priya', Ops: 'Marco', Comms: 'Aiko', Scribe: 'Sam' }
        ];
        var why = [
          'The monitor fires first. Detection time is the clock\'s start; good alerts catch issues before customers write in.',
          'A human owns the page. Slow acknowledgement is a process problem, not a person problem.',
          'Declaring early gets the right people in. The IC <b>coordinates and decides; they do not debug</b>.',
          'Roles fill in: Comms posts updates on a schedule, the Scribe keeps the timeline. Customers now hear from us.',
          'Mitigate before root-causing. A rollback is faster and safer than a clever live fix.',
          'Rollback done. The error rate falls, but we are not finished until metrics stay healthy.',
          'Resolved only after the metric stays good for a set time. Announce the end clearly.',
          'Postmortem scheduled and owned. Blameless, with action items; this is where the learning happens.'
        ];
        var frames = [], q = [];
        for (var i = 0; i < ev.length; i++) {
          q.push(ev[i][0] + ' ' + ev[i][1]);
          var hl = {}; hl[q.length - 1] = i === 6 ? 'ok' : 'cur';
          if (i === 4 || i === 5) hl[q.length - 1] = 'sel';
          frames.push({ narr: '<b>' + H.esc(name) + ' &middot; ' + ev[i][0] + ':</b> ' + why[i], parts: [
            { type: 'queue', label: 'Timeline (oldest first)', items: q.slice(), hl: hl, frontLabel: 'first event', backLabel: 'latest' },
            { type: 'vars', label: 'Who holds which role', vals: roles[i], hl: i >= 2 ? { IC: 'sel' } : {} }
          ] });
        }
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Weak vs strong: "Tell me about a SEV-1 you led"', html: `<p><span class="c-r">Weak:</span> "The site went down and I jumped in to debug. I found a bad query, fixed it, and we recovered. We talked about it afterwards."</p>
      <p>Why weak: the answerer was the debugger, not the commander. No roles, no comms, no systemic fix, no number.</p>
      <p><span class="c-g">Strong:</span> "Checkout errors hit 18% at 14:02 [impact first]. I declared a SEV-1 within 9 minutes and took the IC role, so Marco could debug while Aiko handled the status page and Sam kept the timeline [roles]. We suspected the 4.18 release, rolled back at 14:24 rather than hunting a root cause live [mitigate first], and updated customers every 20 minutes. Resolved at 14:40, 38 minutes total. In the blameless postmortem we found the release had no canary stage and the alert lagged by 6 minutes. We added automatic canaries and a faster alert; the next bad release was caught at 2% traffic [systemic fix]."</p>` },
    { title: 'A status update template that works', html: `<p>Keep updates short, factual and on a clock. Say what you know, what you do not, what is next, and when you will speak again.</p>`, code: { lang: 'text', code: '[14:13] Investigating - Some customers cannot complete checkout.\n        We are looking at a recent release. Next update by 14:35.\n[14:35] Identified - A faulty release is the likely cause.\n        We are rolling it back. Next update by 14:55.\n[14:42] Resolved - Checkout is healthy. Postmortem will be shared in 3 days.' } },
    { title: 'Blameless postmortem: reword the blame', html: `${H.table(['Blame wording', 'Blameless wording'], [['Sam pushed a bad config', 'The pipeline allowed an unvalidated config to reach production'], ['Ops was too slow to notice', 'The alert threshold fired 6 minutes after impact began'], ['Priya forgot the runbook', 'The runbook was out of date and hard to find'], ['Dev did not test enough', 'We had no staging check that exercised the checkout path']])}<p>Each blameless wording points to a fix you can ship.</p>` }
  ],
  deepDive: `<p><b>Why IC does not debug.</b> The debugger is deep in logs and loses sight of the whole. The IC watches the clock, asks "what is our current hypothesis? what is the cheapest mitigation? who else do we need?", and protects the debugger from interruptions. Separating the roles is the single biggest improvement most teams can make.</p>
    <p><b>Severity and pacing.</b> Define severity by customer impact, not by how scary the cause looks. Set update cadence by severity (SEV-1 every 20 to 30 minutes). Rotate the IC on long incidents; tired humans make mistakes after about 4 hours.</p>
    <p><b>Good postmortems.</b> Timeline from the log, contributing factors (not one "root cause"; real incidents have many), detection and response gaps, what went well, and action items with <b>owner, priority and due date</b>. Review action items later; unfinished ones are the real failure. Remove the word "human error" from the doc; it stops thinking. Ask "why did that action make sense at the time?"</p>
    <p><b>Systemic fixes ladder.</b> Strongest to weakest: remove the hazard (make the bad action impossible), add automated guardrails (canary, validation), improve detection, improve docs and training, "be more careful" (weakest, avoid). Interviewers notice when your fixes are at the strong end.</p>
    <p><b>Metrics.</b> Time to detect, acknowledge, mitigate and resolve; plus recurrence. Optimise mitigate time: customers feel that one. Also mention error budgets and SLOs when relevant.</p>
    <p><b>If you caused it.</b> Own it plainly, show what you learned, and what changed in the system. Hiding it or blaming tools is a red flag.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI can summarize alerts, suggest likely causes from logs, draft status updates and write the first version of a postmortem timeline. That speeds the <i>information</i> part, but the IC role remains human: deciding to roll back, deciding when to wake an executive, and being accountable. New incident types also appear: model provider outages, a prompt change that quietly degrades answers, an AI agent with too many permissions deleting data, and cost spikes from runaway token use. Expect "how would you run an incident for an AI feature?" Answer: define quality SLOs (not just uptime), keep a fast rollback for prompts and model versions, and require human approval for destructive agent actions.</p>
    <p><b>Use AI as a partner:</b> <code>Here is my raw incident log. Draft a timeline and list gaps in the data. Do not guess a root cause.</code></p>
    <p><b>Where AI goes wrong:</b> confidently invents causes and smooths over uncertainty. <b>What you must own:</b> the decisions during the incident and the honesty of the postmortem.</p>`,
  problems: [
    P({
      t: 'Lead a SEV-1 as incident commander', l: 'Hard', tags: ['incident', 'communication', 'postmortem'],
      s: 'Tell me about a SEV-1 you led. What was your role, how did you communicate, and what changed afterwards?',
      ex: `<p>Look for: ${H.c('r', 'customer impact')} first, ${H.c('b', 'IC separate from debugger')}, ${H.c('y', 'mitigate before root cause')}, ${H.c('g', 'update cadence')}, ${H.c('p', 'systemic fix')}.</p>`,
      weak: 'Our database went down one night. I dug into the logs, found the problem, and restarted it. Afterwards we promised to be more careful.',
      why: 'The story is about heroic debugging, not leadership. No roles, no communication, no customer impact, and the fix ("be more careful") is the weakest kind.',
      q: ['What should an incident commander do first once an incident is declared?', ['Find the root cause in the code', 'Assign roles and agree the cheapest way to restore service', 'Write the postmortem'], 1, 'The IC coordinates. Roles and a mitigation plan (like a rollback) come before deep investigation.'],
      h: ['<p>Hint 1: Start with the customer impact and the time it began, with numbers.</p>', '<p>Hint 2: Name the roles you set up (IC, ops, comms, scribe) and the update schedule you kept.</p>', '<p>Hint 3: End with the postmortem findings and one strong systemic fix that you can show reduced risk.</p>'],
      a: `<p><b>Model answer.</b> "At 02:10 on a Saturday our payments API started timing out for about 30% of customers, and support tickets spiked [situation, impact]. I was on call, acknowledged in 3 minutes, and declared a SEV-1 at minute 8, naming myself incident commander because I had the clearest picture [task]. I paged a database engineer to investigate, asked a teammate to run the status page and set a 20-minute update clock, and asked another to keep the timeline [roles]. The hypothesis was a runaway query after a deploy; instead of proving it, I chose the cheapest mitigation and rolled back the release, then killed the long-running queries [mitigate first]. Service recovered at 02:52, 42 minutes in. I kept the call open another 20 minutes to confirm graphs were stable, then told customers and executives it was resolved [communicate]. In a blameless postmortem we found the query lacked an index and review did not check query plans; no one was blamed, the flow was. We added a query-plan check in CI, a canary with automatic rollback, and a runbook; similar bad releases were caught at 5% traffic twice that quarter [systemic fix, result]. Personal learning: I should have declared sooner; we added a rule that any customer-facing page above 5% errors is declared within 5 minutes [learning]."</p>`,
      cx: '<p>Rubric: Senior = fixes the incident well. Staff = leads response with roles and clear comms. Principal = changes the org\'s incident process and reliability culture.</p>',
      f: ['What if the rollback had not worked?', 'How did you decide when to wake an executive?']
    })
  ]
});

topics.push({
  title: 'Project Retrospectives: What You Would Do Differently',
  analogy: `<p>After a long hike, good hikers sit down and look at the map: <b>where did we lose time? which turn was wrong? what would we pack differently?</b> They do not pretend the hike was perfect, and they do not beat themselves up either. The retrospective question in an interview is the same: "show me you can look at your own work honestly and get better."</p>`,
  explain: `<p>"What would you do differently?" and "tell me about a decision you would reverse" are favourites for senior roles. They measure <b>self-awareness, judgment and growth</b>. A weak answer says "nothing, it went great" (not credible) or names a trivial thing ("I would start earlier"). A strong answer names a <b>real decision</b>, the <b>information you had then</b>, what you <b>learned later</b>, and a <b>concrete change</b> you now make.</p>
    ${H.table(['Part', 'What to say', 'Example'], [
      ['The decision', 'One specific choice', 'We chose a custom workflow engine'],
      ['Context then', 'Why it made sense with what we knew', 'No vendor fit our needs; the team was confident'],
      ['What we learned', 'The signal we missed or got later', 'Maintenance cost grew 3x; a vendor product matured'],
      ['The change', 'What you do now, in practice', 'I run a 2-week spike and a buy-vs-build review before committing'],
      ['The proof', 'Where you applied it since', 'On the next project we bought, saved ~2 quarters']
    ])}
    <p>Also be ready to talk about <b>what went well</b>, so the retro is balanced, and about <b>who else shaped the outcome</b>. Retros that only list your own errors sound performative; retros that only list team errors sound like blame.</p>
    <p>Pick decisions with real stakes: a technology choice, a scope call, a hiring or team-structure choice, a sequencing decision. "I would write more tests" is too small for a staff conversation.</p>`,
  clues: [
    '"What would you do <b>differently</b>?"',
    '"A technical <b>decision you would reverse</b>"',
    '"Tell me about a project that <b>did not go as planned</b>"',
    '"What did you <b>learn</b> from your biggest mistake?"',
    '"How do you know the project was <b>successful</b>?"',
    '"What would you do if you started this project <b>again today</b>?"'
  ],
  viz: [
    {
      title: 'Weak vs strong retrospective answer, step by step',
      input: 'workflow engine',
      inputLabel: 'Decision you would reverse (a short label)',
      gen: function (input) {
        var d = String(input || 'a technical decision').slice(0, 40);
        var rows = [
          ['The decision', 'Nothing really. It went fine.', 'We chose to build our own ' + d + '.'],
          ['Context then', '(skipped)', 'No product fit; the team was confident; deadline was tight.'],
          ['What we learned', 'I would start earlier.', 'Upkeep cost 3x our estimate, and a vendor option matured a year later.'],
          ['The change', 'I will try harder next time.', 'I now run a 2-week spike and buy-vs-build review before committing.'],
          ['The proof', '(none)', 'On the next project we bought; it saved about two quarters.']
        ];
        var cols = ['Part', 'Weak answer', 'Strong answer'], frames = [], shown = [];
        frames.push({ narr: 'Retro answers fail in predictable ways. We compare a weak and a strong answer to <b>' + H.esc(d) + '</b>, one part at a time.', parts: [{ type: 'table', label: 'Weak vs strong', columns: cols, rows: [] }] });
        var why = [
          'Weak denies any mistake: not credible. Strong names a real, specific decision.',
          'A strong answer shows the choice was reasonable with the information then; this keeps it honest without being defensive.',
          'The learning is concrete and measured (3x), and shows what changed outside your control.',
          'Weak resolves to "try harder", which is not a change. Strong describes a new habit anyone could follow.',
          'Strong shows the habit already working. Proof of growth beats a promise.'
        ];
        for (var i = 0; i < rows.length; i++) {
          shown.push(rows[i]);
          var hl = {}; hl[i] = 'cur';
          frames.push({ narr: '<b>' + rows[i][0] + ':</b> ' + why[i], parts: [{ type: 'table', label: 'Weak vs strong', columns: cols, rows: shown.map(function (r) { return r.slice(); }), hl: hl }] });
        }
        frames.push({ narr: 'The strong answer takes about 90 seconds and ends on <b>growth with evidence</b>. That is the shape to practise.', parts: [{ type: 'table', label: 'Weak vs strong', columns: cols, rows: rows, hl: { 0: 'sel', 1: 'sel', 2: 'sel', 3: 'sel', 4: 'sel' } }] });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Weak vs strong: "A technical decision you would reverse"', html: `<p><span class="c-r">Weak:</span> "I cannot think of one; we always planned carefully. Maybe I would test more."</p>
      <p><span class="c-g">Strong:</span> "Two years ago I pushed us to adopt a microservice per feature. With 8 engineers, we spent a third of our time on deployment and cross-service debugging [what happened]. At the time, three big companies had good results and I did not weigh our team size [context]. I now merge services that always change together and use the question 'which team owns each service?' as a gate [change]. On the next project I kept a modular monolith for a year and shipped twice as fast [proof]."</p>` },
    { title: 'What went well AND what to change', html: `<p>A balanced retro uses two columns. <b>Keep:</b> weekly demos kept stakeholders calm; a small pilot found two design flaws early. <b>Change:</b> we estimated migration effort without asking the teams; we found the largest dependency in month 5. Staff-level add: <b>"the systemic reason"</b>: our planning process had no dependency review, so I added one to the RFC template.</p>` },
    { title: 'A retro template you can reuse', html: `<p>Write after every major project, 20 minutes, and keep the notes. They become your story bank.</p>`, code: { lang: 'text', code: 'Project retro\nGoal & result:      what we wanted vs what happened (numbers)\nBest decision:      and why it worked\nWorst decision:     what I knew then, what I know now\nSurprises:          3 things nobody predicted\nSystemic fix:       what changes in process/tooling so others benefit\nNext time I will:   one concrete habit' } }
  ],
  deepDive: `<p><b>Hindsight bias.</b> Looking back, the right choice seems obvious. Good retrospectives separate <i>decision quality</i> from <i>outcome quality</i>: a good decision can have a bad outcome (luck) and a bad decision can work out. Say which one you are discussing: "Given what we knew, I would make the same call; but I would add a checkpoint at month two."</p>
    <p><b>Reversible vs irreversible decisions.</b> Choose speed for two-way doors (easy to undo) and care for one-way doors (data models, public APIs, vendor contracts). A mature answer says which kind your decision was and what you would change in how you made it.</p>
    <p><b>Leading indicators.</b> Ask: what early signal could have told us sooner? Often it was visible: slipping estimates, one team always blocked, a rising on-call load. Naming the signal, plus where you now watch for it, shows systems thinking.</p>
    <p><b>Credit and ownership.</b> Own your part, share credit, avoid blaming a person. "I underestimated the integration effort" lands better than "the other team was slow".</p>
    <p><b>Pitfalls.</b> Fake weaknesses ("I work too hard"), tragic stories that ended in blaming others, learnings that are vague ("communication"), and stories with no change in behaviour. Close the loop with an example from <i>after</i> the project where you used the lesson.</p>
    <p><b>Staff-level move.</b> Convert the lesson into a team asset: a template, a checklist, a design-review question. Then the learning outlives your memory.</p>`,
  aiEra: `<p><b>What AI changes:</b> Retros now include questions about AI use: where did AI speed us up, where did it create rework or hidden bugs, did it change our estimates? Interviewers may ask "what would you do differently about AI tooling on that project?" Honest answers show maturity: "We let the assistant draft migrations without enough review; two had subtle data bugs, so now generated migrations need a dry-run on production-like data."</p>
    <p><b>Use AI as a partner:</b> <code>Here are my raw notes from the project. Ask me 10 hard questions about the decisions, then tell me which of my answers sound defensive or vague.</code> It is a safe sparring partner.</p>
    <p><b>Where AI goes wrong:</b> it polishes a retro into a tidy story with false balance, hiding real regrets. <b>What you must own:</b> the honest account and the habit change that follows.</p>`,
  problems: [
    P({
      t: 'A technical decision you would reverse', l: 'Hard', tags: ['retrospective', 'self-awareness', 'judgment'],
      s: 'Tell me about a technical decision you made that you would reverse today. What did you learn and what do you do differently now?',
      ex: `<p>Shape: ${H.c('b', 'decision')} → ${H.c('y', 'context then')} → ${H.c('r', 'what you learned')} → ${H.c('g', 'new habit')} → ${H.c('p', 'proof of using it')}.</p>`,
      weak: 'I do not think I have made many bad decisions. Once we picked a library that was a bit slow, but we switched and it was fine. I would just research more next time.',
      why: 'The decision is tiny, there is no stakes or trade-off, and "research more" is not a change in behaviour. It reads as hiding or lacking depth.',
      q: ['What makes a retrospective answer credible?', ['Claiming the project was perfect', 'A real decision, honest context, and a concrete changed habit', 'Blaming the vendor'], 1, 'Credibility comes from specificity and from showing the lesson changed what you do.'],
      h: ['<p>Hint 1: Pick a decision with real cost, such as a tech choice or a team-structure choice.</p>', '<p>Hint 2: Explain why it was reasonable at the time, then what you learned and when.</p>', '<p>Hint 3: End with a habit you now follow and a later example showing you used it.</p>'],
      a: `<p><b>Model answer.</b> "Two years ago I championed building our own feature-flag service because no product matched our rules, and I was confident [decision, context]. We had a team of eight. Six months in, the service needed audit logs, per-region rollouts and a dashboard, and maintenance took roughly a third of one engineer's time. A year later, two vendors offered what we needed for less than that engineer's salary [what I learned]. I raised it in a review, wrote a short migration plan, and we moved over two quarters, saving about 0.5 FTE [action, result]. If I decided again I would make the same call with the information I had in 2022, but I would have changed the process: a two-week spike on a vendor, a written estimate of the 'ownership cost' for three years, and a review checkpoint at month six. I now include an 'ownership cost' section in every build-vs-buy RFC, and on the next decision, a log analytics platform, that section led us to buy, saving about two quarters of work [new habit, proof]."</p>`,
      cx: '<p>Rubric: Senior = honest about a team-level mistake. Staff = names a systemic cause and changes a process. Principal = changes how the org makes that class of decisions.</p>',
      f: ['How did you decide to raise it in the review?', 'What would have made you change course earlier?']
    })
  ]
});

var RUB = function (s, st, p) { return '<p>Leveling rubric: <b>Senior (L5)</b> = ' + s + ' <b>Staff (L6)</b> = ' + st + ' <b>Principal (L7)</b> = ' + p + '</p>'; };
var HINTS = function (a, b, c) { return ['<p>Hint 1: ' + a + '</p>', '<p>Hint 2: ' + b + '</p>', '<p>Hint 3: ' + c + '</p>']; };

// ---------- EASY ----------
practice.push(P({
  t: 'Describe your last project\'s scope in one sentence', l: 'Easy', tags: ['scope', 'warm-up'],
  s: 'Warm-up. In one sentence, describe the scope of your most important recent project so that a stranger can tell whether it was team-level, org-level or company-level.',
  ex: `<p>${H.c('r', '"I worked on the payments service."')} (no scope) vs ${H.c('g', '"I led the move of payments for 4 teams and 2M customers to a new provider over two quarters."')}</p>`,
  weak: 'I worked on the payments team and helped with a big migration.',
  why: 'No numbers, no count of teams or users, no time frame, and no hint of your role. The listener learns nothing about size.',
  q: ['Which sentence best shows scope?', ['"It was a big, important project"', '"Four teams and 2M customers depended on it, over two quarters"', '"I worked hard on it"'], 1, 'Scope is who and what depended on the work, plus how long it lasted.'],
  h: HINTS('Count the teams, systems or customers that depended on your project.', 'Add the time frame (weeks, quarters) and your role in a few words.', 'Format: "I [verb] [what] for [who/how many] over [how long]."'),
  a: '<p><b>Model answer.</b> "I led the move of our payment processing from a legacy provider to a new one, affecting four product teams and about two million customers, over two quarters." This sentence has a verb that shows ownership (led), a size (four teams, two million customers), and a time frame (two quarters). Say it, then add one number for impact: "it cut failed payments from 3% to 1%." In the interview, open your story with exactly this kind of sentence so the interviewer places you on the ladder immediately.</p>',
  cx: RUB('owns a service.', 'shapes several teams.', 'sets company direction.'),
  f: ['What would you say if the project was smaller?']
}));
practice.push(P({
  t: 'Turn an effort sentence into an impact sentence', l: 'Easy', tags: ['impact', 'numbers'],
  s: 'Rewrite this effort line so it shows impact: "I spent two months improving our build system and wrote a lot of scripts."',
  ex: `<p>${H.c('r', 'Effort')}: scripts, two months. ${H.c('g', 'Impact')}: build time 40 min → 8 min, 60 engineers save ~1 hour a week each.</p>`,
  weak: 'I spent two months improving the build system and wrote a lot of scripts. It was hard work.',
  why: 'It reports time and effort, not change. Interviewers cannot tell whether anything got better, for whom, or by how much.',
  q: ['What is the best measure to add to a build-system story?', ['Lines of code written', 'Build time before and after, and how many engineers benefit', 'Hours worked'], 1, 'Impact is a change in a metric people care about, ideally with the number of people affected.'],
  h: HINTS('Ask: what got faster, cheaper, safer or more reliable?', 'Find a before and after number, or estimate honestly (say "about").', 'Multiply by the number of people or runs to show the total effect.'),
  a: '<p><b>Model answer.</b> "Builds took 40 minutes and blocked 60 engineers many times a day. I redesigned caching and parallelised the slowest steps, cutting builds to 8 minutes. That saved roughly an hour a week per engineer, about 60 hours a week across the org, and CI cost dropped 25%." Notice the structure: problem with a number, your action in one clause, result with a number, and the reach (60 engineers). If you do not have exact figures, say how you estimated: "I sampled one week of CI logs." Honest estimates beat missing numbers.</p>',
  cx: RUB('measures impact on own team.', 'measures impact across teams.', 'ties impact to company goals or cost.'),
  f: ['How would you estimate the impact if you had no data?']
}));
practice.push(P({
  t: 'Explain "disagree and commit" with an example', l: 'Easy', tags: ['influence', 'dissent'],
  s: 'Explain what "disagree and commit" means and give a short example of when you did it.',
  ex: `<p>${H.c('b', 'Disagree')}: say your view with reasons before the decision. ${H.c('g', 'Commit')}: once decided, support it fully.</p>`,
  weak: 'It means you do what the boss says. I disagreed once but I just did what they wanted.',
  why: 'It confuses commitment with obedience. It shows no honest argument beforehand and no effort to make the decision succeed.',
  q: ['What does "commit" mean after the decision is made?', ['Quietly do the minimum', 'Support it fully and make it work', 'Keep arguing in every meeting'], 1, 'Commit means real effort. Quiet resistance or relitigating the decision is not commitment.'],
  h: HINTS('Define it in one plain sentence: argue first, support after.', 'Pick a real decision where you lost but the stakes were real.', 'Show what you did to make it succeed and what happened.'),
  a: '<p><b>Model answer.</b> "It means I argue honestly while the decision is open, and once it is made I support it as if it were my own idea. On our caching redesign I wanted Redis; the group chose a database-backed approach for simplicity. I wrote my concerns in the RFC with data on peak load, they were recorded, and the decision stood. After that I helped build it, added monitoring for the exact risk I had raised, and when it ran fine for two quarters I said so in the retro. The monitoring was valuable either way. The key is that my disagreement was specific, early and recorded, and my commitment was real work, not quiet resistance."</p>',
  cx: RUB('commits after losing.', 'creates the process that makes dissent safe.', 'models it so the org does it.'),
  f: ['When would you not commit?']
}));

// ---------- MEDIUM ----------
practice.push(P({
  t: 'Say no to a VP request', l: 'Medium', tags: ['influence', 'prioritization', 'stakeholders'],
  s: 'Tell me about a time you said no, or "not yet", to a request from a vice president or other senior leader. How did you do it and what happened?',
  ex: `<p>Shape: ${H.c('g', 'respect the goal')}, ${H.c('b', 'show the trade-off')}, ${H.c('y', 'offer an alternative')}, ${H.c('p', 'let them decide with facts')}.</p>`,
  weak: 'A VP asked me to add a feature in two weeks. I said it was impossible and we were too busy. In the end we did it anyway and I felt it was not fair.',
  why: 'A flat "impossible" with no data, no alternative and no understanding of the goal. It blocks rather than helps, and shows no influence skill.',
  q: ['What is the best way to say no to a senior leader?', ['"That is impossible"', 'Show what the request would cost and offer options that serve the same goal', 'Say yes and miss the deadline'], 1, 'Leaders want to reach a goal. Trade-offs and alternatives help them decide; a bare no does not.'],
  h: HINTS('Start by saying what the VP was trying to achieve. The goal is rarely the exact request.', 'Show the cost in their language: what would slip, what risk rises.', 'Offer two options and let the leader decide, then record the decision.'),
  a: '<p><b>Model answer.</b> "Our VP of Sales asked us to build a custom reporting feature for one large customer in two weeks, to close a deal [situation]. I first asked what the customer really needed; it was a monthly export, not a dashboard [goal]. Building the dashboard would have delayed a reliability fix for the checkout path that had caused two incidents. I wrote a one-page note with three options: a manual export now (2 days), a lightweight scheduled export (2 weeks), or the full dashboard (a quarter) with its cost to the roadmap. I walked the VP through it in person before sending it. She chose the export and we closed the deal; the reliability fix shipped on time and incidents on that path stopped [result]. She later asked me to join planning early. I learned that no is easier to accept as 'here are your options'." Signals: respect for the goal, trade-offs, options, relationship.</p>',
  cx: RUB('pushes back on own manager.', 'pushes back on senior leaders with options and data.', 'shapes the org\'s priorities with leaders.'),
  f: ['What if she had insisted on the full dashboard?', 'How did you keep the relationship strong?']
}));
practice.push(P({
  t: 'Make progress on a vague, owner-less problem', l: 'Medium', tags: ['ambiguity', 'ownership', 'scope'],
  s: 'Tell me about a time you found a problem nobody owned and no one had defined. How did you turn it into work?',
  ex: `<p>Look for the steps: ${H.c('b', 'notice')}, ${H.c('y', 'frame it with data')}, ${H.c('g', 'propose')}, ${H.c('p', 'find an owner or become one')}.</p>`,
  weak: 'Our onboarding was messy. I told my manager and she said to look into it. I made a document and shared it.',
  why: 'It waits for permission, defines nothing, shows no data, and ends with a document instead of a changed outcome.',
  q: ['What is the best first step on an undefined problem?', ['Wait for a clear ticket', 'Gather a few facts and write a one-page problem statement', 'Start coding a solution'], 1, 'Framing the problem with evidence turns ambiguity into something others can agree on.'],
  h: HINTS('Show how you noticed it and the evidence: tickets, times, complaints.', 'Describe how you narrowed the problem to something you could finish.', 'Show how you got an owner, a metric and a first small win.'),
  a: '<p><b>Model answer.</b> "New engineers at Brightloop took about four weeks to ship their first change, and every team blamed a different cause; no one owned onboarding [situation, ambiguity]. I pulled the last 12 hires\' first-PR dates and interviewed six of them. Three issues covered most of the delay: a broken local setup, unclear service ownership, and slow review turnaround [framing]. I wrote a one-page problem statement with a metric (days to first merged PR) and a target (10 days), and asked my director to name me the owner for one quarter [influence]. I fixed the setup script myself, created an ownership map, and got three teams to agree on a 1-day review SLA for new hires. Time to first PR dropped from 28 to 9 days, and new hires\' 3-month satisfaction rose [result]. I handed the dashboard to the platform team to keep it alive [sustainability]."</p>',
  cx: RUB('solves an ambiguous problem within own team.', 'defines the problem and mobilises several teams.', 'finds company-level problems others do not see.'),
  f: ['What if your director had said no?', 'How did you pick the metric?']
}));
practice.push(P({
  t: 'Change the mind of a more senior engineer', l: 'Medium', tags: ['influence', 'dissent', 'technical'],
  s: 'Describe a time a more senior engineer disagreed with your technical approach. What did you do and what was the outcome?',
  ex: `<p>Good sequence: ${H.c('b', 'restate their view')} → ${H.c('y', 'agree on evidence')} → ${H.c('g', 'test')} → ${H.c('p', 'decision + record')}.</p>`,
  weak: 'A principal engineer said my design was wrong. I thought he did not understand the problem so I kept going with my design and proved him wrong later.',
  why: 'It shows ego, no curiosity, and no agreed evidence. Even if the answerer was right, the story signals a poor collaborator.',
  q: ['What is a strong first response to a senior colleague\'s objection?', ['Defend the design immediately', 'Restate their concern and ask what evidence would change their mind', 'Ignore it until the review'], 1, 'Understanding the concern and agreeing on evidence turns a clash into a joint investigation.'],
  h: HINTS('Start by saying what you valued in the other person\'s point.', 'Describe how you agreed on a test, benchmark or past incident as evidence.', 'End with the decision, who made it, and how the relationship stayed strong.'),
  a: '<p><b>Model answer.</b> "A principal engineer, Omar, thought my proposed event-sourcing design was over-engineered for our order service [situation]. Instead of defending it, I restated his concern: operational complexity and a hard-to-hire skill. I asked what evidence would change his mind and we agreed on two tests: a prototype handling our peak load, and a list of the audit questions we could not answer with the current design [action]. The prototype met load but the operations cost was real; the audit gaps were also real. We settled on a simpler append-only audit table that solved the audit need with a tenth of the complexity [outcome]. I credited Omar in the RFC. I learned that my design was solving a problem we did not yet have, and that the best outcome was a third option neither of us started with. Omar later asked me to review his designs [relationship]."</p>',
  cx: RUB('holds a position with evidence.', 'seeks the best answer over winning, and records the decision.', 'builds a culture where senior people can be challenged safely.'),
  f: ['What if the test had favoured your design but he still disagreed?']
}));
practice.push(P({
  t: 'Raise the bar on hiring or reviews', l: 'Medium', tags: ['bar-raising', 'hiring', 'mentoring'],
  s: 'Give an example of how you raised the engineering bar on your team or org beyond your own work.',
  ex: `<p>Strong examples create something that lasts: ${H.c('g', 'a checklist')}, ${H.c('b', 'a rubric')}, ${H.c('y', 'a template')}, ${H.c('p', 'a training')} - with numbers.</p>`,
  weak: 'I always do thorough code reviews and I tell people when something is wrong. The code quality on my team is good.',
  why: 'It describes personal habit, not a system. Nothing remains when the person leaves, and there is no measure of a better bar.',
  q: ['What makes a bar-raising effort staff-level?', ['It depends on you being present', 'It becomes a habit others follow without you', 'It is announced loudly'], 1, 'Staff impact lasts without the author: a template, rubric or automated check that others use by default.'],
  h: HINTS('Look for a repeated problem, such as inconsistent reviews or unclear interview scoring.', 'Show the data you used (bug analysis, interview feedback variance) to pick the fix.', 'Describe the artifact you created and how you measured adoption and effect.'),
  a: '<p><b>Model answer.</b> "Our interview scores varied wildly: the same candidate could be a 4 from one interviewer and a 2 from another, and we had made two hires who struggled [situation]. I gathered the last 30 interview write-ups and found that interviewers used different standards for the same coding question [data]. I proposed a rubric with concrete examples of what a 2, 3 and 4 look like, ran two calibration sessions with sample answers, and made a rule that every write-up cites evidence from the rubric [actions]. Over the next two quarters score spread on the same question dropped by half, offer-accept feedback was more consistent, and the two later hires I helped assess were rated strong at six months [result]. Three other teams copied the rubric; I handed it to our hiring committee to own [sustainability]."</p>',
  cx: RUB('does excellent reviews and interviews.', 'creates rubrics and process the team follows.', 'sets the hiring or quality bar across the org.'),
  f: ['How did you protect the bar when under pressure to hire quickly?']
}));
practice.push(P({
  t: 'Help a struggling teammate', l: 'Medium', tags: ['mentoring', 'feedback'],
  s: 'Tell me about a time you helped an engineer who was struggling to meet expectations. What did you do and what happened?',
  ex: `<p>Good moves: ${H.c('g', 'clear expectations in writing')}, ${H.c('b', 'specific examples')}, ${H.c('y', 'support + deadline')}, ${H.c('p', 'honest outcome')}.</p>`,
  weak: 'One engineer on my team missed deadlines a lot. I tried helping a few times, but eventually I told my manager and he handled it.',
  why: 'It lacks a plan or specific feedback and hands the problem upward quickly. It shows no ownership of the outcome or learning.',
  q: ['What should come first when someone is struggling?', ['Tell your manager immediately', 'Understand the cause privately and set clear, specific expectations', 'Take over their work'], 1, 'A private, specific conversation finds the cause. Expectations in writing make progress measurable.'],
  h: HINTS('Describe the specific behaviour or output gap, with an example, not a label.', 'Show the support you gave and the checkpoints you agreed on.', 'Be honest about the result, even if it was not a success, and what you learned.'),
  a: '<p><b>Model answer.</b> "An engineer, Leo, repeatedly shipped late and his PRs came back with the same review comments [situation]. I asked him privately how things felt, and learned that he struggled to break big tasks down and did not like asking questions in public [cause]. We agreed in writing on two expectations for six weeks: split each task into pieces of at most two days, and post a short update daily. I paired with him on the first two breakdowns and gave quick, specific feedback on his plans [support]. By week four his tasks were landing on time and review comments dropped by half. His manager and I checked progress on the agreed date, and he stayed on track [outcome]. Not every case goes this well; with another engineer, the same approach did not work and the manager moved them to a role that fit better. What I learned is that clarity and early support are kindest, and honest escalation is part of care, not a failure."</p>',
  cx: RUB('supports teammates informally.', 'runs structured, kind improvement plans and partners with managers.', 'builds systems and norms for feedback across the org.'),
  f: ['When did you involve the manager and why then?']
}));

// ---------- HARD ----------
practice.push(P({
  t: 'Drive a cross-team migration', l: 'Hard', tags: ['migration', 'strategy', 'influence', 'multi-quarter'],
  s: 'Tell me about a cross-team migration you drove from proposal to completion. Include how you got teams to move and what you did when it slipped.',
  ex: `<p>Signals: ${H.c('b', 'diagnosis with numbers')}, ${H.c('g', 'phased plan by quarter')}, ${H.c('y', 'adoption dashboard')}, ${H.c('r', 'a slip handled with a rule')}, ${H.c('p', 'end date')}.</p>`,
  weak: 'We migrated all our services to a new platform. I coordinated with the teams and gave updates. A few teams were late but we got there in the end.',
  why: 'No diagnosis, no plan structure, no numbers, no sign of influence, and "in the end" hides a timeline slip. A coordinator story, not a leadership story.',
  q: ['What is the strongest sign a migration is truly finished?', ['Most teams migrated', 'The old system is turned off on a stated date', 'A celebration was held'], 1, 'A migration that leaves the old system running is half-done; shutdown is the finish line.'],
  h: HINTS('Open with the diagnosis: why was staying put costly? Use a number.', 'Show your structure: pilot, waves, tracking, support, hard date.', 'Include the slip: what went wrong, how you re-planned, and the rule you used.'),
  a: '<p><b>Model answer.</b> "Lumen Retail ran 23 services on a self-managed container platform with a 4-person team; upgrades caused two outages a year and cost us about 30% more than the managed option [diagnosis]. Nobody owned the move across teams, so I wrote an RFC, pre-wired the six biggest teams, and got a director to sponsor a two-quarter plan [influence]. Q1 pilot with one friendly team and a compatibility layer; Q2 waves of five teams each; Q3 stragglers and shutdown; adoption was tracked on a public dashboard [plan]. In Q2 we found two services depended on a node-level feature that did not exist in the new platform. I paused the wave, built a supported alternative in three weeks, and moved the date for those teams by a month, with a rule that a slip over one month goes to the sponsor [slip]. We finished one month late, turned off the old platform on a published date, cut cost 28%, and saw zero customer-facing migration incidents [result]. I would set the hard shutdown date at the start; the dashboard alone did not create urgency [learning]."</p>',
  cx: RUB('migrates own team\'s services.', 'drives a multi-team migration with a plan, dashboard and end date.', 'sets platform strategy across the company and prevents the next long tail.'),
  f: ['What was your stop rule?', 'How did you keep morale up during the slip?']
}));
practice.push(P({
  t: 'Build vs buy: a decision with long-term cost', l: 'Hard', tags: ['strategy', 'build vs buy', 'trade-offs'],
  s: 'Walk me through a significant build-versus-buy decision. How did you decide, who did you involve, and how did it turn out?',
  ex: `<p>Look for: ${H.c('b', 'core vs commodity')}, ${H.c('y', 'ownership cost')}, ${H.c('r', 'exit plan')}, ${H.c('g', 'spike or evidence')}, ${H.c('p', 'decision record')}.</p>`,
  weak: 'We needed a search system. I thought building it would be more fun and give us control, so we built our own. It worked well and the team learned a lot.',
  why: 'The reasons are enjoyment and control, with no cost, no alternative evaluated, no business value and no outcome numbers. Fun is not a strategy.',
  q: ['Which question best decides build vs buy?', ['What would be more fun to build?', 'Is this core to our differentiation and what is the 3-year ownership cost?', 'What does the loudest engineer prefer?'], 1, 'Differentiation and total ownership cost are the main drivers; the exit plan matters too.'],
  h: HINTS('State the need and why it matters to the business, with a number.', 'List options you compared and the cost items you included beyond licence or build time.', 'Share how you decided who decides, the stop rule, and what you would change.'),
  a: '<p><b>Model answer.</b> "Our support team needed search across millions of tickets; search was not our product, but the experience affected customer satisfaction [need]. Engineers wanted to build on an open-source engine. I framed three options in an RFC: build, run open-source ourselves, or buy a managed service. I included three-year costs: engineering time, on-call, upgrades, hiring, and an exit plan for each [analysis]. I ran a two-week spike on the managed service and a prototype on open source; the managed option met 90% of needs at roughly 40% of the three-year cost of running ourselves [evidence]. I got our staff engineers and finance partner to review, recorded the decision, and named the single missing feature as a risk with a workaround [alignment]. After a year, ticket search time fell from 8 to 1.5 seconds, we spent no engineer time on infrastructure, and the vendor later raised prices 15%, which we had planned for with a documented exit path [result]. I would add a quarterly check on vendor risk to the plan next time [learning]."</p>',
  cx: RUB('chooses well for a team service.', 'frames the decision with cost, risk and exit for several stakeholders.', 'sets the company\'s build/buy principles and platform direction.'),
  f: ['What would have made you build?', 'How did you handle the engineers who wanted to build?']
}));
practice.push(P({
  t: 'Handle an incident you helped cause', l: 'Hard', tags: ['incident', 'ownership', 'postmortem', 'blameless'],
  s: 'Tell me about a production incident that you or your change caused. How did you respond, communicate and what changed?',
  ex: `<p>Good shape: ${H.c('r', 'say it plainly')}, ${H.c('b', 'mitigate fast')}, ${H.c('g', 'blameless findings')}, ${H.c('p', 'systemic fix')}.</p>`,
  weak: 'A change I deployed caused some errors. It was a small mistake and it was fixed quickly. The monitoring should have caught it, so we asked ops to improve it.',
  why: 'It minimises the impact, shifts blame to monitoring and ops, and offers no learning. The listener hears defensiveness rather than ownership.',
  q: ['What is the best way to talk about an incident you caused?', ['Explain why it was not really your fault', 'Own it plainly, show the response, and show the system change', 'Avoid mentioning it'], 1, 'Ownership, a calm response and a fix to the system are what builds trust.'],
  h: HINTS('State what happened and your part in one clear sentence, with the impact.', 'Describe how you responded: you told people, mitigated fast, and did not hide.', 'Show a systemic fix that makes the same mistake impossible or caught early.'),
  a: '<p><b>Model answer.</b> "I once deployed a configuration change that set the wrong timeout, and for 14 minutes about 12% of checkout requests failed [ownership, impact]. I noticed the alert, said in the incident channel 'I think my change caused this, rolling back', and rolled back within 4 minutes of seeing the graph [response]. I then stayed on the call as a participant while a colleague took the incident commander role, because I was too close to it. In the blameless postmortem I wrote the first draft of the timeline myself. The findings were about the system: config changes had no validation, no canary and no automatic rollback, and the on-call runbook did not mention timeouts [findings]. We added schema validation for config, a 5% canary with automatic rollback, and a pre-deploy checklist. Three months later a similar bad config was stopped by validation before reaching production [result]. I learned that saying it out loud early speeds up everyone, and that fear of blame makes people hide things."</p>',
  cx: RUB('owns and fixes their own mistakes.', 'turns the mistake into a systemic safeguard for several teams.', 'changes the culture and tooling for safe change across the company.'),
  f: ['How would your team have reacted if you had hidden it?', 'Which fix had the most effect?']
}));
practice.push(P({
  t: 'Set an AI-assisted development policy across teams', l: 'Hard', tags: ['AI era', 'strategy', 'influence', 'risk'],
  s: 'AI coding tools are spreading quickly in your company. Tell me about how you led, or how you would lead, a policy for using them safely across several teams.',
  ex: `<p>Staff signals: ${H.c('b', 'listen to teams')}, ${H.c('g', 'pilot with data')}, ${H.c('y', 'guardrails')}, ${H.c('p', 'review standards')}, ${H.c('r', 'security')}, ${H.c('m', 'measure')}.</p>`,
  weak: 'I would just let everyone use whatever AI tools they like because they make people faster. If there are problems, we can fix them later.',
  why: 'No guardrails, no data privacy or security thinking, no measurement and no listening to teams. It treats a big organisational change as a free speed-up.',
  q: ['What is the best first step in an AI-tooling policy?', ['Ban all tools', 'Pilot with a few teams, measure outcomes, and set guardrails on data and review', 'Let each person decide with no rules'], 1, 'A measured pilot with clear guardrails gives evidence and builds trust, without blocking value or ignoring risk.'],
  h: HINTS('Start with the goals and risks: speed, quality, security, data privacy, cost.', 'Describe a pilot, success metrics and who participates.', 'List the rules: human owner for every line, tests required, no secrets in prompts, approved tools, review standards.'),
  a: '<p><b>Model answer.</b> "As assistants spread, three of our teams used different tools with no shared rules, and security flagged secrets pasted into prompts [situation]. Nobody owned the question, so I proposed a working group of four engineers, one security partner and one manager [ownership, ambiguity]. We ran an eight-week pilot with three teams, measuring cycle time, review rework, escaped bugs and developer sentiment. Results: cycle time fell about 15%, but review rework rose on large generated diffs [data]. Our policy was one page: approved tools and data rules (no secrets, no customer data), every change has a human owner who can explain it, generated changes must come with tests and stay small, migrations get a dry-run, and a sensitive-area list that needs extra review. I presented it to directors, took their objections about cost and speed, and published it with a quarterly review [influence]. Six months later escaped bugs were flat while cycle time stayed 12% better, and two other orgs adopted the policy [result]. I would still revisit it often, because the tools change every few months."</p>',
  cx: RUB('uses AI tools well and shares tips.', 'writes the guardrails and aligns teams with data.', 'sets company AI strategy balancing speed, security and cost.'),
  f: ['What would make you tighten the policy?', 'How do you know AI is not hurting skills growth?']
}));
practice.push(P({
  t: 'Self-assess a story against the leveling rubric', l: 'Hard', tags: ['rubric', 'calibration', 'senior'],
  s: 'Pick one of your own stories and assess it honestly on scope, impact, ambiguity, influence and horizon. Then explain what you would change to make it land at the level you want.',
  ex: `${H.table(['Dimension', 'Senior bar', 'Staff bar'], [['Scope', 'Team system', 'Several teams'], ['Impact', 'Metric moved for my team', 'Metric moved for org + others\' ways of working'], ['Ambiguity', 'Given goal', 'Defined the goal'], ['Influence', 'Led peers', 'Aligned teams without authority'], ['Horizon', 'Quarter', 'Multi-quarter or year']])}`,
  weak: 'My story is about a project I led. I think it was a big project and I did a good job, so it should count as staff-level.',
  why: 'No evidence against the dimensions, no gaps found, and confidence replaces analysis. It shows poor calibration, which is itself a downlevel signal.',
  q: ['What is the best way to improve a mid-sized story for a staff loop?', ['Exaggerate the scope', 'Find the true signals you left out: reach, ambiguity, influence, numbers', 'Add technical jargon'], 1, 'Most stories already contain staff signals that were not told. Surface them honestly; do not invent them.'],
  h: HINTS('Score each of the five dimensions from 0 to 3 for your story, with one piece of evidence each.', 'Find the weakest dimension and ask what true fact you could add.', 'Rehearse the revised version and ask a friend to play a skeptical interviewer.'),
  a: '<p><b>Model answer.</b> "My story: I rebuilt our team\'s deployment pipeline. Scoring: scope 1 (one team), impact 2 (deploy time 40 to 8 minutes), ambiguity 1 (the goal was given), influence 0 (no one else involved), horizon 1 (six weeks). It reads as strong senior, not staff. Missing truths I can honestly add: two other teams copied the pipeline after seeing it, which I helped by writing a how-to (scope and influence); the original ask was just \'make deploys faster\' with no design, so I defined the target and measured baseline (ambiguity); and a quarter later the pattern became the default template (horizon). Revised version: \'I defined what fast deploys meant, rebuilt our pipeline, and then helped two other teams adopt it; org-wide deploy time fell from 40 to 12 minutes within a quarter.\' I did not claim more than the facts allow. For a different gap, such as influence, I would choose a different story. I also keep a one-line scorecard for each story so I know which signal it carries when the interviewer\'s question comes."</p>',
  cx: RUB('has strong team-level evidence.', 'has cross-team evidence for most dimensions.', 'has company-level, multi-year evidence with durable change.'),
  f: ['Which dimension is hardest for you to evidence?', 'How many different stories do you have for each signal?']
}));

// ---------- QUIZ ----------
[
  ['Which signal most clearly separates a staff-level story from a senior-level one?', ['A longer story', 'Shaping the work of several teams and defining the problem', 'More technical detail'], 1, 'Staff stories show cross-team reach and ambiguity the candidate resolved. Length and technical detail do not change the level.'],
  ['An answer says "we" twenty times and "I" once. What is the main risk?', ['The interviewer cannot see your own contribution', 'It sounds too confident', 'It is too short'], 0, 'Interviewers score what you did. Say "we" for team results, but use "I" clearly for your decisions and actions.'],
  ['What does an RFC mainly help with?', ['Replacing all meetings', 'Giving everyone one written place to comment and aligning before a decision', 'Proving you are right'], 1, 'An RFC makes the problem, options and recommendation visible so people can respond asynchronously and the meeting can be short.'],
  ['What is "pre-wiring"?', ['Talking to key people privately before a group decision', 'Writing code in advance', 'Escalating to the VP'], 0, 'Pre-wiring removes surprises and lets you improve the proposal using honest feedback.'],
  ['A migration is 95% done and the last teams will not move. What is the best step?', ['Keep supporting both forever', 'Set a hard date, help the stragglers, and run a brown-out to find hidden users', 'Ignore them'], 1, 'The long tail needs a deadline, hands-on help and discovery of hidden dependencies; otherwise two systems run forever.'],
  ['What is the incident commander\'s main job?', ['Debug the code', 'Coordinate people, decide, and keep communication on a clock', 'Write the postmortem alone'], 1, 'The IC coordinates and decides while others investigate; mixing the roles slows the response.'],
  ['During a SEV-1 you suspect a bad release. What comes first?', ['Prove the root cause', 'Mitigate, for example by rolling back', 'Wait for management'], 1, 'Restore service first with the cheapest safe mitigation; investigate the cause once customers are no longer hurt.'],
  ['Which postmortem sentence is blameless?', ['Sam pushed a bad config', 'The pipeline allowed an unvalidated config to reach production', 'Ops was careless'], 1, 'Blameless wording describes the system gap, which you can fix, instead of the person.'],
  ['Which fix is strongest after an incident?', ['Tell everyone to be more careful', 'Add an automatic guardrail that blocks the bad action', 'Update the wiki'], 1, 'Removing hazards or adding automated guardrails beats reminders and documentation.'],
  ['Which is the best evidence that mentoring worked?', ['Weekly meetings happened', 'The person independently led a design adopted by other teams', 'They liked you'], 1, 'Growth shows as new independent capability, not as meetings or feelings.'],
  ['What makes "what would you do differently" answers credible?', ['Saying nothing needs to change', 'A real decision, the context then, and a concrete new habit', 'Blaming the tools'], 1, 'Specificity and a changed habit show honest self-awareness.'],
  ['Which build-vs-buy question matters most?', ['Which is more fun?', 'Is it core to our differentiation, and what is the 3-year ownership cost with an exit plan?', 'Which vendor has the best logo?'], 1, 'Differentiation, total cost of ownership and exit options drive a sound decision.'],
  ['How should you handle a more senior colleague\'s strong disagreement?', ['Win the argument in the meeting', 'Understand their concern, agree on evidence, then decide and record it', 'Avoid them'], 1, 'Turning a clash into a shared investigation is both effective and respectful.'],
  ['How do AI coding tools change staff-level expectations most?', ['Typing speed matters more', 'Judgment, alignment and review standards matter more', 'Design documents no longer matter'], 1, 'As code gets cheaper, picking the right problem, aligning teams and keeping quality high become the differentiators.']
].forEach(function (x) { quiz.push({ q: x[0], options: x[1], answer: x[2], explain: x[3] }); });

// ---------- INTERVIEW ----------
interview.push({
  q: 'What does "scope" mean for a senior or staff engineer, and how do you show it in a story?', level: 'A',
  a: '<p>Scope is the size of the area whose technical direction you shape: your task, your team\'s system, several teams, or the company. I show it in the first sentence of a story with concrete counts: "Four teams and about two million customers depended on this." Then I support it with ambiguity (what was undefined), influence (how others agreed) and a time horizon. I avoid inflating it; if only two teams used it, I say two teams, because interviewers will ask for names and numbers.</p>',
  followUps: ['How do you describe scope when the project was small?', 'How do you separate headcount from scope?']
});
interview.push({
  q: 'Tell me about a time you influenced a decision across teams without authority.', level: 'A',
  a: '<p>Model answer shape: three teams used different APIs for money, and finance reports broke weekly. Nobody owned the contract, so I mapped the stakeholders, wrote a three-page RFC with two options, and met each tech lead one-on-one before the review. One team objected to a one-quarter migration, I listened, added a compatibility adapter and a two-quarter window, and credited them in the doc. A short review confirmed the decision and the VP signed the record. Finance failures went from weekly to none. The lesson: ask "what would make this safe for you?" in the first conversation.</p>',
  followUps: ['What if the objecting team still said no?', 'How did you decide who to talk to first?', 'What did the RFC contain?']
});
interview.push({
  q: 'How do you write and run an RFC process that people actually use?', level: 'A',
  a: '<p>Short, with a fixed template: problem, goals and non-goals, options, recommendation, risks, open questions, decider and date. I keep it to two to four pages so a busy director reads it in ten minutes. I pre-wire key reviewers, set a comment window, and hold a short decision meeting that only covers unresolved points. Decisions get a written record. I also keep a public log of past RFCs so new people can learn why choices were made. If nobody reads RFCs, I shorten them and walk through them in 1:1s instead of sending reminders.</p>',
  followUps: ['How do you handle RFCs that stall?', 'When is an RFC overkill?']
});
interview.push({
  q: 'Describe a technical strategy you drove over several quarters.', level: 'A',
  a: '<p>I use diagnosis, guiding policy, actions. Example: deploys took four hours and teams blocked each other (diagnosis). My policy: split the monolith only along team lines, no big-bang rewrite, and every piece must be independently deployable (policy). The plan went by quarter: pilot with one team, then two more, then the majority, then shut the old path, with an adoption dashboard and a stop rule if error rates doubled. A rounding bug found in Q2 shadow mode shifted the plan by a month. We finished with deploys at 20 minutes and a 35% cost cut. I always say what we chose not to do.</p>',
  followUps: ['What was your stop rule and did you use it?', 'What would you do differently?']
});
interview.push({
  q: 'How do you decide between building and buying?', level: 'A',
  a: '<p>I ask whether the capability is core to our differentiation. Commodity things (email delivery, search infra for a small team) lean toward buy; things that make us special lean toward build. Then I compare total cost of ownership over three years: engineering time, on-call, upgrades, hiring, security review, and an exit plan. I run a short spike on the top two options so the decision uses evidence. I write the decision in an RFC with the risks and a review checkpoint. For example, we bought managed search at about 40% of the three-year cost of running it ourselves, and planned a vendor-exit path from the start.</p>',
  followUps: ['What would change your mind to build?', 'How do you handle vendor lock-in?']
});
interview.push({
  q: 'Tell me about a migration or deprecation that was harder than planned.', level: 'A',
  a: '<p>We retired an in-house scheduler used by eleven teams. Eight moved in two quarters with a compatibility wrapper. The last three had a private feature, no capacity, or ignored emails. I ran office hours, personally migrated the understaffed team\'s jobs with them, replaced the private feature with a supported option, announced a hard date, and ran a one-hour brown-out two weeks earlier that exposed a forgotten finance job. We turned it off on the date; incidents dropped from six a year to one. I learned to set the hard date on day one, because dashboards alone do not create urgency.</p>',
  followUps: ['How did you find hidden users?', 'What would you do if a team could not move for a legitimate reason?']
});
interview.push({
  q: 'How do you mentor engineers and know it worked?', level: 'A',
  a: '<p>I start by finding the gap versus the next level, pick one or two skills, and give a stretch task with a safety net. I give specific, quick feedback (situation, behaviour, impact, next step) and step back each quarter. Proof is independent capability: one engineer I mentored led a cross-team RFC and ran the rollout alone, then got promoted. I also sponsor, meaning I put people forward for visible work and credit them in public. If mentoring does not work, I make expectations explicit and involve the manager rather than carrying it silently.</p>',
  followUps: ['What if the person does not want the next level?', 'Tell me about mentoring that did not work.']
});
interview.push({
  q: 'How have you raised the bar for your team or org?', level: 'A',
  a: '<p>I look for repeated pain and fix it with an artifact that lasts. Example: interview scores varied widely for the same question, so I collected 30 write-ups, built a rubric with concrete 2, 3 and 4 examples, ran calibration sessions, and required evidence in every write-up. Score spread halved in two quarters, three other teams copied it, and I handed ownership to the hiring committee. I also use review checklists built from real bug analysis. The test is whether the improvement keeps working after I leave the room.</p>',
  followUps: ['How did you protect the bar under hiring pressure?', 'How do you measure bar-raising?']
});
interview.push({
  q: 'Walk me through a SEV-1 you led.', level: 'A',
  a: '<p>Impact first: checkout errors rose from 0.2% to 18% at 14:02. I declared a SEV-1 within 9 minutes and took the incident commander role so the on-call engineer could debug while a colleague ran the status page with a 20-minute update clock and another kept the timeline. We suspected the latest release and rolled back instead of proving the cause live; service recovered by 14:40. The blameless postmortem found no canary stage and a six-minute alert lag. We added automatic canaries and a faster alert; the next bad release stopped at 2% of traffic.</p>',
  followUps: ['What if the rollback had failed?', 'When do you rotate the IC?', 'How did you decide the severity?']
});
interview.push({
  q: 'How do you run a blameless postmortem, and does blameless mean no accountability?', level: 'A',
  a: '<p>Blameless means we assume reasonable people made reasonable choices with the information they had, and we fix the system. It does not mean no accountability: action items have owners, priorities and dates, and we track them. I write a timeline from logs, list contributing factors (there are usually many), what went well, and detection and response gaps. I replace "human error" with "why did that action make sense then?". Strong fixes remove the hazard or add automatic guardrails; weak fixes are reminders. Unfinished action items are the real failure, so I review them later.</p>',
  followUps: ['What if a person was clearly negligent?', 'How do you follow up on action items?']
});
interview.push({
  q: 'Tell me about a technical decision you would reverse.', level: 'A',
  a: '<p>I once championed building our own feature-flag service because nothing fit and I was confident. With eight engineers, maintenance took about a third of one person\'s time, and a year later two vendors offered what we needed for less. I raised it, wrote a migration plan, and we moved in two quarters. Given what I knew I would make a similar call, but I would change the process: a two-week spike on a vendor, a three-year ownership cost estimate and a six-month checkpoint. I now put an ownership-cost section in every build-vs-buy RFC and used it again on the next project, which saved about two quarters.</p>',
  followUps: ['How do you separate decision quality from outcome quality?', 'What early signal could have told you sooner?']
});
interview.push({
  q: 'Tell me about a time you said no to a senior leader.', level: 'A',
  a: '<p>A VP asked for a custom dashboard in two weeks to close a deal. I asked what the customer really needed: a monthly export. A dashboard would have delayed a reliability fix that had caused two incidents. I wrote a one-page note with three options and costs, walked her through it in person, and she picked the export. The deal closed and the fix shipped on time. I respected her goal, showed trade-offs and let her decide with facts. Afterwards she invited me into planning earlier.</p>',
  followUps: ['What if she insisted on the dashboard?', 'How do you keep the relationship strong after a no?']
});
interview.push({
  q: 'How is your approach different now that AI coding tools are common?', level: 'A',
  a: '<p>I spend less time on boilerplate and more on judgment: choosing the problem, framing options, review standards and alignment. For my team I helped set simple rules: a human owner for every change who can explain it, tests with generated code, small diffs, no secrets or customer data in prompts, and extra review in sensitive areas. We measured cycle time and escaped bugs in a pilot rather than trusting the hype. I also watch for skills atrophy and ask juniors to predict an outcome before asking the assistant. Accountability stays with the human.</p>',
  followUps: ['What would make you tighten the policy?', 'How do you review a large generated diff?']
});
interview.push({
  q: 'How do you move from senior to staff? What would you tell someone aiming for it?', level: 'A',
  a: '<p>Build a pattern of evidence, not one big project. Pick problems bigger than your team, and define them yourself. Get things done through others using writing and 1:1 conversations. Move metrics people care about and be able to prove it. Grow other engineers and leave artifacts (templates, rubrics, paved roads) that keep working without you. Align your work with company goals and talk to a sponsor about gaps. And be honest in calibration: map each story to scope, impact, ambiguity, influence and horizon and fill the weakest one deliberately.</p>',
  followUps: ['What if your team has no staff-level problems?', 'How do you find a sponsor?']
});

registerModule({
  id: 'beh05',
  title: 'Senior & Staff-Level Interviews',
  intro: `<p>At senior and staff level the interview changes. Nobody doubts you can code; they want to know <b>how big a problem you can own</b>, whether you can <b>get other teams to move with you</b>, whether you think in <b>quarters and years</b>, and whether you <b>make the people around you better</b>. This module teaches you to hear and tell stories in those terms: scope and impact signals, influence with RFCs and dissent, technical strategy (build vs buy, migrations, deprecations), mentoring and raising the bar, running production incidents with a blameless postmortem, and honest project retrospectives. It builds on the STAR stories from earlier behavioral modules and adds the leveling lens.</p>`,
  goals: [
    'Place any story on the scope ladder (team, org, company) and name the missing signal',
    'Tell influence stories with an RFC, pre-wiring, and honest handling of dissent',
    'Describe a multi-quarter technical strategy including build vs buy and a migration end date',
    'Show mentoring and bar-raising with a growth plan and proof of outcome',
    'Narrate an incident as commander: roles, mitigation first, communication cadence, blameless postmortem and systemic fix',
    'Answer "what would you do differently" credibly, including how AI changes staff-level expectations'
  ],
  prereqs: `Behavioral modules 1 to 3 (STAR method, teamwork/conflict bank, leadership/ownership bank) and module 4 (communication). Some real project experience to draw stories from.`,
  hours: 8,
  topics: topics,
  practice: practice,
  quiz: quiz,
  interview: interview
});
})();
