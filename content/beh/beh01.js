(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // Helper to build a behavioral problem (brute = weak answer, solution.approach = model answer)
  function P(o) {
    return {
      title: o.title, level: o.level, tags: o.tags, companies: o.companies || [],
      statement: o.statement,
      constraints: o.constraints || '<p>Plain text answer. Be honest: use your own real facts. Aim for a spoken length of 2 minutes or less unless the task says otherwise.</p>',
      example: o.example,
      brute: { why: o.why ? o.why : '<p>Weak answer: ' + o.weak + '</p>' },
      mcq: o.mcq,
      hints: o.hints.map(function (h) { return h.length < 60 ? h + ' Try it on paper first, then check the next hint.' : h; }),
      solution: { approach: o.approach, complexity: o.complexity || '<p>Time cost: about 20-30 minutes of writing and 3 spoken practice rounds. The payoff is an answer you can reuse in many interviews.</p>', followUps: o.followUps }
    };
  }

  topics.push({
    title: 'How Product-Company Interview Loops Work',
    analogy: `<p>An interview loop is like a <b>driving test with several examiners</b>. One checks your paperwork (resume), one checks basic road rules (online test), one rides with you in traffic (coding), one watches how you plan a long trip (system design), and one asks how you treat other drivers (behavioral). At the end all examiners sit together and decide. No single examiner decides alone, and one bad ride rarely fails you if the others are strong.</p>`,
    explain: `<p>Most product companies (Google-style, Amazon-style, startup-style) run the same <b>pipeline</b>. Names change, the shape does not.</p>
${H.table(['Stage', 'What happens', 'What it measures'], [
  ['1. Resume screen', 'A recruiter (and often software) scans your resume for 6-15 seconds', 'Is there matching skill + visible impact?'],
  ['2. Online assessment (OA)', '60-120 min timed coding test, sometimes with a work-style quiz', 'Can you code correctly and fast? Basic problem solving'],
  ['3. Recruiter screen', '20-30 min call about your background, salary range, timeline', 'Communication, motivation, logistics, red flags'],
  ['4. Technical phone screen', '45-60 min live coding with one engineer in a shared editor', 'Problem solving, clean code, talking while thinking'],
  ['5. Onsite / virtual loop', '3-6 back-to-back rounds of 45-60 min', 'Coding x2, system design, behavioral, sometimes a bar-raiser'],
  ['6. Hiring committee / manager review', 'Written feedback from every round is read by people who did not meet you', 'Consistency of signals, level (junior/mid/senior), risk'],
  ['7. Offer + team match', 'Recruiter calls with the offer, you talk with managers', 'Fit, compensation, negotiation']
])}
<p><b>What interviewers write down.</b> Every interviewer fills a feedback form. It is not "I liked him". It is usually a list of <b>signals</b> with evidence:</p>
<ul>
<li><b>Problem solving</b> - did they clarify, break down, find a better approach after a hint?</li>
<li><b>Coding</b> - working, readable code, tested their own code?</li>
<li><b>Communication</b> - could I follow their thinking? Did they listen?</li>
<li><b>Ownership / impact</b> - what did <i>they</i> do, not "we"? How big was the result?</li>
<li><b>Collaboration + growth</b> - how do they handle conflict, feedback, failure?</li>
</ul>
<p>The decision words are typically <b>Strong Hire / Hire / Lean Hire / Lean No Hire / No Hire / Strong No Hire</b>. Your job in each round is to give the interviewer <i>quotable evidence</i> for the form.</p>
<p>The <b>bar-raiser</b> (Amazon-style) or cross-team interviewer is a trained person from another team. They have veto power in some companies, so they dig deeper on stories: "What exactly did you do? What would you change?"</p>
<p>The <b>hiring committee</b> never meets you. They read the papers. So a clear story told in plain words, with numbers, becomes a clear paragraph in the write-up. A rambling story becomes "unclear ownership".</p>`,
    clues: [
      'Recruiter email says "5 interviews: 2 coding, 1 system design, 1 behavioral, 1 hiring manager" - you are in a standard loop; prepare each lane separately',
      '"Bar-raiser" or "cross-functional interviewer" in the schedule - expect deep behavioral follow-ups and a stricter bar',
      '"Online assessment link valid for 7 days" - OA is auto-graded on hidden tests plus time; screens first, humans later',
      '"Hiring committee" or "team matching" - decision is by written packet, so every round must produce clear evidence',
      'Level in the job title (SDE I / II / Senior) - the same question is judged against a different bar: scope grows with level',
      'Interviewer asks "Tell me about a time..." - a behavioral signal round, even if it is inside a coding interview'
    ],
    viz: {
      title: 'The interview loop: where you are and what is measured',
      inputLabel: 'Stop at stage number (1-7, or 0 to play all)',
      input: '0',
      gen: function (input) {
        var stop = parseInt(String(input).trim(), 10);
        if (isNaN(stop) || stop < 0 || stop > 7) throw new Error('Enter a number from 0 to 7');
        var stages = [
          ['Resume', 'Resume screen', 'Skill match + impact in 6-15 seconds', 'Pass: bullets show numbers'],
          ['OA', 'Online assessment', 'Correct code under time pressure', 'Pass: hidden tests green'],
          ['Recruiter', 'Recruiter screen', 'Motivation, communication, logistics', 'Pass: clear 60-second pitch'],
          ['Phone', 'Technical phone screen', 'Problem solving + talking while coding', 'Pass: working code + clean talk'],
          ['Onsite', 'Onsite / virtual loop', 'Coding, design, behavioral, bar-raiser', 'Each round writes a signal sheet'],
          ['Committee', 'Hiring committee', 'Consistency of written signals + level', 'Decision from papers only'],
          ['Offer', 'Offer + team match', 'Fit, level, compensation', 'Negotiate with facts']
        ];
        var nodes = stages.map(function (s, i) {
          return { id: 'n' + i, label: s[0], x: 8 + (i % 4) * 28, y: i < 4 ? 12 : 40, shape: 'box', w: 20 };
        });
        var edges = [];
        for (var i = 0; i < 6; i++) edges.push(['n' + i, 'n' + (i + 1)]);
        var frames = [];
        var last = stop === 0 ? 7 : stop;
        var first = stop === 0 ? 1 : stop;
        for (var k = first; k <= last; k++) {
          var hl = {}, ehl = {}, tags = {};
          for (var j = 0; j < k - 1; j++) { hl['n' + j] = 'done'; if (j > 0) ehl['n' + (j - 1) + '-n' + j] = 'ok'; }
          hl['n' + (k - 1)] = 'cur';
          if (k > 1) ehl['n' + (k - 2) + '-n' + (k - 1)] = 'ok';
          tags['n' + (k - 1)] = 'you are here';
          var s = stages[k - 1];
          frames.push({
            narr: 'Stage <b>' + k + ' of 7: ' + s[1] + '</b>. It measures: <i>' + s[2] + '</i>. Tip: ' + s[3] + '.',
            parts: [
              { type: 'graph', label: 'Loop pipeline', directed: true, height: 52, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags },
              { type: 'vars', label: 'Current round', vals: { round: s[1], measures: s[2], 'how to win': s[3] }, hl: { round: 'cur' } },
              { type: 'queue', label: 'Rounds still ahead', items: stages.slice(k).map(function (x) { return x[0]; }), frontLabel: 'next', backLabel: 'last' }
            ]
          });
        }
        return frames;
      }
    },
    examples: [
      {
        title: 'A typical 5-round virtual loop for a mid-level engineer',
        html: `<p>Fictional candidate <b>Meera Iyer</b> applies to <b>BrightCart</b>, an imaginary e-commerce company. Her loop day:</p>
${H.table(['Time', 'Round', 'Interviewer', 'Main signal written down'], [
  ['10:00', 'Coding 1 (arrays/hash map)', 'Dev, SDE II', 'Problem solving, tests own code'],
  ['11:00', 'Coding 2 (graph/BFS)', 'Lena, Senior', 'Optimizes after hint, clean code'],
  ['12:30', 'System design (URL shortener)', 'Arun, Staff', 'Trade-offs, scale numbers'],
  ['13:30', 'Behavioral (stories)', 'Tara, EM', 'Ownership, conflict, growth'],
  ['14:30', 'Bar-raiser (mix)', 'Cross-team Principal', 'Raises or lowers the bar vs. other hires']
])}
<p>Notice that <b>2 of 5</b> rounds are about coding, but <b>2 of 5</b> are mostly about stories and judgement. Candidates who only grind coding problems lose the behavioral half.</p>`
      },
      {
        title: 'What a feedback form really looks like',
        html: `<p>Here is a made-up but realistic write-up for a behavioral round:</p>
<blockquote><b>Signal: Ownership - Strong.</b> Candidate led migration of the billing cron to a queue. Said "I wrote the design doc, I ran the rollout, I was on call for the first 2 weeks." Result: failed payments dropped from 3.1% to 0.4%. Could explain what they would do differently (add a canary earlier).<br><b>Signal: Conflict - Lean.</b> Story was fine but no clear resolution; candidate used "we" for every decision.<br><b>Recommendation: Hire.</b></blockquote>
<p>Every phrase there came from the candidate's words. If you never say "I wrote" and "from 3.1% to 0.4%", the interviewer cannot write them.</p>`
      },
      {
        title: 'The same story, three different rounds',
        html: `<p>Your "billing migration" project can appear in different rounds with a different focus:</p>
<ul><li><b>Recruiter screen</b> (30 sec): "I led a payments queue migration that cut failures by 87%."</li>
<li><b>Behavioral round</b> (2 min, STAR): focus on what you did, the conflict with the ops team, the result.</li>
<li><b>Design round</b>: the same project becomes evidence you know retries, idempotency and queues.</li></ul>
<p>One strong project, prepared at three zoom levels, is worth more than five half-remembered ones.</p>`
      }
    ],
    deepDive: `<p><b>Why companies built loops this way.</b> A single interviewer is noisy: mood, topic luck, bias. Several independent rounds plus a committee average out the noise. That is why one weak round is survivable if two others are strong, and why "being likable" in one round cannot rescue unclear evidence in the others.</p>
<p><b>Leveling.</b> The same answer is judged at different levels. For a new grad, "I fixed a bug in the team's service" can be Strong. For Senior, interviewers expect <i>scope</i>: several people or several teams, decisions with trade-offs, effects on the roadmap. If the interviewer thinks you are a level lower than the job, you may get "Hire, but at a lower level" - which is a real outcome, with lower pay.</p>
<p><b>Rubrics and calibration.</b> Many companies use written rubrics: for each signal there are examples of weak, solid and strong behaviour. Interviewers are trained to write observations, not judgements: "candidate asked 3 clarifying questions about input size" instead of "good communication". Help them by being concrete.</p>
<p><b>Online assessment reality.</b> OAs are graded by hidden tests and sometimes plagiarism detection and proctoring (camera, tab switching). Partial credit often still passes if the main cases work. Time-box: get a correct brute force first, then optimize.</p>
<p><b>Timelines.</b> Recruiter screen to offer commonly takes 3-8 weeks. Loops are often scheduled within 1-2 weeks of passing the phone screen; hiring committee takes a few days. Ask the recruiter openly: "What are the rounds and what does each one cover?" - it is a normal, expected question, and recruiters usually share the format and sometimes prep material.</p>
<p><b>Common failure patterns</b> in loops: (1) strong coder, no stories - behavioral round becomes the "No hire"; (2) stories full of "we" - ownership signal missing; (3) coding without testing - quality signal missing; (4) negative talk about previous employers - collaboration red flag; (5) no questions for the interviewer - motivation signal missing.</p>`,
    aiEra: `<p><b>What AI changes in the loop:</b> many companies now use AI to screen resumes, and some OAs have proctoring plus AI-detection signals. A few companies have started allowing or even testing AI-assisted coding rounds, where the signal moves from "can you type the solution" to "can you direct, verify and debug AI output". Always read the recruiter's instructions: <b>if it says no AI tools, using one is cheating and can end the process</b>, and interviewers can often tell from how you explain the code.</p>
<p><b>Use AI as a partner:</b> ask an AI to act as a skeptical interviewer: <code>Here are the 5 rounds of my loop at a mid-size e-commerce company. For each round, list the signals a typical rubric records and ask me 3 questions.</code> Use it to build a checklist, not to write your stories.</p>
<p><b>Where AI goes wrong:</b> it invents company-specific processes with confidence. Verify the format with your recruiter or recent candidate posts, not with a chatbot.</p>
<p><b>What you must still own:</b> real facts, real stories, honest numbers, and the ability to explain every line on your resume without notes.</p>`,
    problems: [
      P({
        title: 'Decode the recruiter email',
        level: 'Easy', tags: ['loop', 'planning'],
        statement: `<p>A recruiter sends: "Your loop has 4 rounds: (1) Coding - 45 min, (2) Coding - 45 min, (3) System Design - 60 min, (4) Behavioral with the hiring manager - 45 min. A bar-raiser may join." Write, in plain words, what each round measures and what <b>one thing</b> you will prepare for each. Then write 3 questions you will ask the recruiter.</p>`,
        example: `<p>Round 4 (behavioral): measures ownership, conflict handling, growth. Prepare: 2 stories per theme with numbers.</p>`,
        weak: '"I will just solve more LeetCode. Behavioral is just chatting." This ignores one of four rounds, and the one the hiring manager weighs most for team fit.',
        mcq: { q: 'Which is the best question to ask the recruiter?', options: ['Is there a trick to pass?', 'Which skills does each round cover and are there any prep materials?', 'Can I skip the behavioral round?'], answer: 1, explain: 'It is normal and gets you the format. The others signal a poor attitude.' },
        hints: ['Hint 1: Each round has its own signal - list them first.', 'Hint 2: Map prep tasks: coding = patterns + tests, design = scale numbers, behavioral = stories.', 'Hint 3: Questions for recruiter: format, tools allowed, timeline, level being hired for.'],
        approach: `<p><b>Model answer.</b> Round 1 and 2 (coding): measures problem solving, correct and clean code, and how I talk while I think. I will prepare by solving 2 timed problems per day and practising a fixed routine: clarify, brute force, optimize, code, test. Round 3 (system design): measures structured thinking and trade-offs with rough numbers. I will prepare one design template (requirements, API, data model, scale, bottlenecks) and practise 4 classic designs aloud. Round 4 (hiring manager behavioral): measures ownership, collaboration, how I handle conflict and failure, and whether the team would want me. I will prepare a story bank of 8 stories mapped to 12 common questions, each with a measurable result. The bar-raiser may mix all of these, so my stories must survive deep follow-ups ("what exactly did you do?").</p><p><b>Questions to the recruiter:</b> (1) Which level is the role hiring for? (2) Is the coding in a shared editor, and which languages are allowed? (3) Are AI tools allowed in any round, and how soon will I hear after the loop? These are normal questions and show I am organised.</p>`,
        followUps: ['What if the recruiter will not share the format?', 'How would you adjust prep if the role were Staff level?']
      })
    ]
  });

  topics.push({
    title: 'A Resume That Passes Screening (and LinkedIn Basics)',
    analogy: `<p>A resume is a <b>shop window</b>, not the whole shop. People walking by give it a few seconds. If the window shows "stuff", they walk on. If it shows one clear product with a price tag (a result with a number), they step inside. Your bullets are the price tags.</p>`,
    explain: `<p>A recruiter spends roughly <b>6-15 seconds</b> on the first pass. Software (an ATS - Applicant Tracking System) also reads your file first. So the resume must work for a tired human <i>and</i> a simple parser.</p>
<h4>The impact bullet formula</h4>
<p><b>"Did X, measured by Y, by doing Z."</b> Start with a strong action verb, say what changed (with a number), and name the how (tool or method).</p>
${H.table(['Weak bullet', 'Why weak', 'Impact bullet'], [
  ['Responsible for the search service', 'Duty, not result. No verb of action, no number', 'Cut p95 search latency from 820 ms to 310 ms by adding a Redis cache for hot queries'],
  ['Worked on improving tests', '"Worked on" hides what you did', 'Raised unit-test coverage from 41% to 78% by writing a shared mock library used by 6 services'],
  ['Helped migrate to the cloud', '"Helped" hides your part', 'Migrated 14 batch jobs to containers, saving $9K/month in server cost']
])}
<h4>Quantify even when you have no revenue number</h4>
<p>Numbers can be: <b>time</b> (minutes saved, latency), <b>scale</b> (users, requests per second, rows), <b>money</b>, <b>quality</b> (bugs, error rate, coverage), <b>people</b> (team size mentored), <b>speed</b> (release cycle days). If you do not know the exact number, give an honest estimate with "about" or "~", and make sure you can explain how you got it.</p>
<h4>ATS-friendly formatting</h4>
<ul>
<li>One column, normal fonts (Arial, Calibri, Helvetica), no text inside images, tables or text boxes.</li>
<li>Standard headings: Experience, Education, Skills, Projects.</li>
<li>Export as PDF unless the site asks for .docx. Keep the file text-selectable.</li>
<li>Skills spelled the way job posts spell them: "PostgreSQL", "JavaScript", "Kubernetes".</li>
<li>Dates in one style: "Jun 2023 - Present".</li>
</ul>
<h4>Length and order</h4>
<p><b>One page</b> if you have under 10 years of experience. Order: contact line, short summary (optional, 2 lines), Experience (newest first, 3-5 bullets for recent jobs, 2-3 for older), Projects, Skills, Education. Freshers can put Education and Projects first.</p>
<h4>LinkedIn basics</h4>
<ul>
<li><b>Headline</b>: not just "Software Engineer at X". Try "Backend engineer | Java, Kafka | payments reliability".</li>
<li><b>About</b>: 3-4 short lines - who you help, your strongest result, what you want next.</li>
<li><b>Experience</b>: same facts as the resume (mismatch looks suspicious).</li>
<li>Professional photo, custom URL, "Open to work" settings set to recruiters only if you want privacy.</li>
</ul>
<p>Try the runnable bullet checker below. It is a tiny stand-in for what a recruiter does in their head: check <b>verb</b>, <b>metric</b>, <b>length</b>.</p>`,
    clues: [
      'Job post says "must have experience with X" - mirror the exact keyword in a bullet that proves it, not just a skills list',
      '"Applications get 500+ resumes" - you have seconds; the top third of page one must show your best result',
      'Resume rejected without any reply - check for tables, columns, images, odd fonts or missing keywords (ATS)',
      '"Responsible for", "worked on", "helped with" at the start of a bullet - rewrite with a real verb and a result',
      'More than one page with less than 10 years experience - cut older or weaker bullets',
      'Interviewer says "I see on your resume that you reduced latency by 70% - tell me more" - every number is a future question; know its source'
    ],
    code: [
      {
        lang: 'python', run: true, title: 'Resume bullet checker (verb, metric, length)',
        code: `import re

# A small list of strong action verbs (extend it for your own field).
STRONG_VERBS = {
    "built", "led", "reduced", "improved", "designed", "migrated", "launched",
    "cut", "raised", "automated", "shipped", "created", "optimized", "mentored",
    "scaled", "fixed", "wrote", "implemented", "owned", "increased", "saved",
}
# Phrases that hide what YOU did.
WEAK_STARTS = ("responsible for", "worked on", "helped", "involved in",
               "assisted", "participated", "tasked with", "duties included")

def check_bullet(text):
    """Return (score out of 3, list of problems) for one bullet."""
    problems = []
    t = text.strip().rstrip(".")
    words = t.split()
    first = words[0].lower() if words else ""

    # 1) Action verb: starts with a strong verb, and is not a weak phrase
    has_verb = first in STRONG_VERBS and not t.lower().startswith(WEAK_STARTS)
    if not has_verb:
        problems.append("start with a strong action verb (Cut, Built, Led...)")

    # 2) Metric: any digit (47, 3.1%, $9K, 6x) counts as a number
    has_metric = bool(re.search(r"\\d", t))
    if not has_metric:
        problems.append("add a measurable result (%, time, money, users)")

    # 3) Length: 10-28 words reads in one breath on a resume
    good_len = 10 <= len(words) <= 28
    if not good_len:
        problems.append("length %d words; aim for 10-28" % len(words))

    return int(has_verb) + int(has_metric) + int(good_len), problems

bullets = [
    "Responsible for the search service",
    "Worked on improving tests",
    "Cut p95 search latency from 820 ms to 310 ms by adding a Redis cache for hot queries",
    "Helped migrate jobs to the cloud",
    "Built an internal tool",
    "Raised unit-test coverage from 41% to 78% by writing a shared mock library used by 6 services",
]

for b in bullets:
    score, probs = check_bullet(b)
    status = "STRONG" if score == 3 else "FIX"
    print("[%s %d/3] %s" % (status, score, b))
    for p in probs:
        print("      - " + p)
`
      },
      {
        lang: 'text', check: false, title: 'ATS-safe resume skeleton (plain text)',
        code: `MEERA IYER
Bengaluru, India | meera.iyer@example.com | linkedin.com/in/meera-iyer-example | github.com/meera-example

SUMMARY
Backend engineer, 4 years, payments and queues. Cut failed payments 87% at BrightCart.

EXPERIENCE
Software Engineer II, BrightCart (Jun 2022 - Present)
- Cut failed payments from 3.1% to 0.4% by moving billing cron to a retrying queue (Kafka, Java)
- Reduced p95 checkout latency from 820 ms to 310 ms by adding Redis cache for hot product reads
- Mentored 2 new joiners; both shipped their first feature in under 3 weeks

PROJECTS
Rate-limiter library (Java) - used by 5 internal services, 40K requests/sec in load test

SKILLS
Java, Python, SQL, PostgreSQL, Kafka, Redis, Docker, AWS

EDUCATION
B.Tech Computer Science, Example Institute of Technology (2018 - 2022)`
      }
    ],
    viz: {
      title: 'Weak bullet to impact bullet, step by step',
      inputLabel: 'Pick a bullet (1, 2 or 3)',
      input: '1',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        if (isNaN(n) || n < 1 || n > 3) throw new Error('Enter 1, 2 or 3');
        var sets = [
          ['Responsible for the search service', 'Owned the search service', 'Cut p95 search latency from 820 ms to 310 ms', 'Cut p95 search latency from 820 ms to 310 ms by adding a Redis cache for hot queries'],
          ['Worked on improving tests', 'Wrote tests for payment code', 'Raised unit-test coverage from 41% to 78%', 'Raised unit-test coverage from 41% to 78% by building a shared mock library used by 6 services'],
          ['Helped with cloud migration', 'Migrated batch jobs to containers', 'Migrated 14 batch jobs to containers, saving $9K/month', 'Migrated 14 batch jobs to containers, saving $9K/month, by writing reusable Helm charts']
        ][n - 1];
        var cols = ['Part', 'Current text check', 'Status'];
        function tbl(v, m, i, bullet, narr) {
          return {
            narr: narr,
            parts: [
              { type: 'text', label: 'Bullet now', html: '<b>' + bullet + '</b>' },
              { type: 'table', label: 'Checklist: verb, metric, impact/method', columns: cols, rows: [
                ['Action verb', v ? 'strong verb' : 'weak / missing', v ? 'ok' : 'needs fix'],
                ['Metric (number)', m ? 'has a number' : 'no number', m ? 'ok' : 'needs fix'],
                ['Impact + how', i ? 'says how it was done' : 'no method named', i ? 'ok' : 'needs fix']
              ], hl: Object.assign({}, v ? { 0: 'ok' } : { 0: 'bad' }, m ? { 1: 'ok' } : { 1: 'bad' }, i ? { 2: 'ok' } : { 2: 'bad' }) }
            ]
          };
        }
        return [
          tbl(false, false, false, sets[0], 'Start: a duty-style bullet. It tells the reader what your <i>job</i> was, not what <i>you changed</i>. All three checks fail.'),
          tbl(true, false, false, sets[1], 'Step 1: swap the weak opener for a <b>real action verb</b>. Now we know what you did, but not how well.'),
          tbl(true, true, false, sets[2], 'Step 2: add a <b>metric</b>. Numbers make the claim checkable and memorable - this is the line a recruiter remembers.'),
          tbl(true, true, true, sets[3], 'Step 3: name the <b>method</b> (tool or approach). Now it answers X, Y and Z, and invites a good follow-up question in the interview. All green.')
        ];
      }
    },
    examples: [
      {
        title: 'Rewrite 1: from duty to result (backend)',
        html: `<p><b>Before:</b> "Responsible for maintaining the order API."</p><p><b>After:</b> "Cut order-API error rate from 2.4% to 0.3% by adding idempotency keys and retries."</p><p>Notice: verb (Cut), metric (2.4% to 0.3%), method (idempotency keys, retries). Only 15 words.</p>`
      },
      {
        title: 'Rewrite 2: no revenue numbers? Use time and scale',
        html: `<p><b>Before:</b> "Created internal dashboard for the team."</p><p><b>After:</b> "Built a deploy dashboard used daily by 25 engineers, cutting release checks from 40 to 10 minutes."</p><p>Even internal tools have users and time saved.</p>`
      },
      {
        title: 'Rewrite 3: team work without "we" hiding you',
        html: `<p><b>Before:</b> "Was part of a team that moved the site to microservices."</p><p><b>After:</b> "Extracted the cart module into its own service (1 of 4 engineers), cutting its deploy time from 45 to 8 minutes."</p><p>It is honest about the team size and clear about your part.</p>`
      }
    ],
    deepDive: `<p><b>How ATS actually works.</b> An ATS stores your parsed fields (name, jobs, skills, dates) and lets the recruiter search and filter. Most do <i>not</i> auto-reject with a magic score; the real risk is a bad parse (a two-column layout reading in the wrong order, a header in an image) so your skills simply do not appear in search. Plain structure fixes that. Keyword stuffing (white text with 50 buzzwords) is detected and is a fast no.</p>
<p><b>Tailoring.</b> Read the job post, list the top 5 skills it names, and make sure the true ones appear in your bullets with proof. A "Skills" list says "I know Kafka"; a bullet "retrying queue on Kafka cut failures 87%" proves it. Tailor in 10 minutes per application, not by rewriting everything.</p>
<p><b>The truth test.</b> Every line is a possible interview question. Rule: <i>if you cannot explain it for 5 minutes, delete it.</i> Inflated numbers ("improved performance by 300%") are the top reason strong candidates get stuck in follow-ups. Background checks and reference calls may also verify titles and dates.</p>
<p><b>Common senior mistakes.</b> Listing 12 years of every job at equal weight; a skills block with 40 tools; no sign of scope (team size, systems owned, budget). Prefer 3 strong bullets per recent role.</p>
<p><b>Freshers.</b> Use projects with real details: users, data size, deploy link, tests, what you would change. A GitHub link with a readable README and a few commits is stronger than "Skills: everything". Internships and hackathons count - quantify them too.</p>
<p><b>Gaps and switches.</b> Career gaps: one honest line ("Career break - family care, upskilled in cloud") beats hiding it. Switching domains: put a 2-line summary that links your past to the new target role.</p>
<p><b>LinkedIn behaviour.</b> Recruiters search by title, skills, location, and recent activity. A complete profile ranks higher in recruiter search; posting is optional. Keep dates and titles identical to the resume; a mismatch triggers doubt. Connect with recruiters and engineers at target companies and send a short, specific note ("I read your team's post on payments retries - I work on similar problems").</p>`,
    aiEra: `<p><b>What AI changes:</b> companies increasingly use AI to rank resumes against the job description, and candidates use AI to write them. Result: generic, perfectly polished resumes look identical, and recruiters grow suspicious of them. <b>Specific, true, numbers-backed bullets stand out.</b></p>
<p><b>Use AI as a partner:</b> paste your honest draft and ask <code>Rewrite each bullet as "Did X, measured by Y, by doing Z". Keep every number and fact exactly as I give it. If a number is missing, ask me instead of inventing one.</code> Also ask: <code>Which keywords from this job post are missing from my resume that I can honestly claim?</code></p>
<p><b>Where AI goes wrong:</b> it invents metrics ("improved efficiency by 40%"), adds tools you never used, and makes everyone sound the same. It may also hide your real voice so you cannot explain the line in the interview.</p>
<p><b>What you must still own:</b> honesty. Fabricating experience is grounds for rejection or later termination. Polish wording with AI, but every fact, tool and number must come from you and be explainable in your own words. Also do not paste private company data (customer names, internal metrics under NDA) into public AI tools.</p>`,
    problems: [
      P({
        title: 'Rewrite six weak bullets into impact bullets',
        level: 'Medium', tags: ['resume', 'bullets'],
        statement: `<p>Rewrite each weak bullet as "Did X, measured by Y, by doing Z". Invent <b>clearly fictional</b> plausible numbers (marked as examples) so you practise the shape. Bullets:</p><ol><li>Responsible for the login service</li><li>Worked on reducing bugs</li><li>Helped the data team with pipelines</li><li>Did code reviews</li><li>Participated in on-call</li><li>Built a chatbot for support</li></ol>`,
        example: `<p>"Responsible for the login service" becomes "Cut login failures from 1.8% to 0.2% by adding token-refresh retries to the login service."</p>`,
        weak: 'Keeping the bullets as they are, or just adding adjectives: "Responsible for the very important login service". Adjectives are not results.',
        mcq: { q: 'You do not know the exact result of your work. What is the best move?', options: ['Make up a precise-looking number', 'Use an honest estimate (about / ~) and know how you got it', 'Leave out all numbers forever'], answer: 1, explain: 'Honest estimates are fine if you can defend them. Invented precision collapses in follow-ups.' },
        hints: ['Hint 1: Start with a verb: Cut, Built, Led, Raised.', 'Hint 2: Ask "so what changed?" - time, errors, users, money, speed.', 'Hint 3: Add the method last (tool, technique) and keep it under about 25 words.'],
        approach: `<p><b>Model rewrite (numbers are fictional examples; in real life use your own).</b></p><ol><li>Cut login failures from 1.8% to 0.2% by adding token-refresh retries and better error codes to the login service.</li><li>Reduced production bugs by about 35% over two quarters by adding contract tests to 5 shared APIs.</li><li>Built 3 data pipelines (Airflow, Python) that cut the analytics team's daily report time from 4 hours to 25 minutes.</li><li>Reviewed 150+ pull requests in a year, adding a checklist that reduced review rework by about 20% across a team of 8.</li><li>Handled 12 on-call shifts; wrote 4 runbooks that cut median incident resolution from 55 to 30 minutes.</li><li>Built a support chatbot (Python, retrieval) that answered 38% of tickets without an agent, saving about 120 agent-hours per month.</li></ol><p><b>Why this works:</b> every bullet starts with a verb, carries a number, and names how. Weak items like code reviews and on-call become strong once you ask "what got better because of me?". The recruiter now sees outcomes, and each line is a natural interview question ("tell me about the contract tests").</p>`,
        followUps: ['Which of these would a Staff engineer say differently?', 'How do you answer if the interviewer doubts the 35%?']
      })
    ]
  });

  topics.push({
    title: 'The STAR and CARL Frameworks',
    analogy: `<p>Telling a work story is like telling a <b>short news report</b>: one line of "what was happening", one line of "what was my job", the main body of "what I did", and a closing line of "how it ended and what I learned". A rambling story is like a news reporter who spends 4 minutes describing the weather and never reaches the event.</p>`,
    explain: `<p><b>STAR</b> = <b>S</b>ituation, <b>T</b>ask, <b>A</b>ction, <b>R</b>esult. It keeps you short and makes the interviewer's job easy.</p>
${H.table(['Letter', 'Answer this', 'Share of time', 'Example (fictional)'], [
  ['S - Situation', 'Where and when? What was going on? (1-2 sentences)', '~10%', 'At BrightCart, our checkout failed for 3% of payments during sales.'],
  ['T - Task', 'What was <b>your</b> responsibility or goal?', '~10%', 'I was asked to find the cause and fix it before the Diwali sale in 3 weeks.'],
  ['A - Action', 'What did <b>you</b> do, step by step? Use "I".', '~50%', 'I traced logs, found duplicate retries, designed an idempotency key, got the payments team to agree, rolled out with a 5% canary.'],
  ['R - Result', 'What changed? Number + what you learned', '~30%', 'Failures fell from 3.1% to 0.4%. Next time I would add the canary earlier.']
])}
<p><b>Rule of thumb:</b> a 2-minute answer is about 250-300 spoken words. S and T together should be <b>under 30 seconds</b>. <b>Action is the longest part</b>. Result must be measurable, and add one line of learning - it shows growth.</p>
<h4>CARL: STAR with a learning slot</h4>
<p><b>CARL</b> = <b>C</b>ontext, <b>A</b>ction, <b>R</b>esult, <b>L</b>earning. It merges Situation and Task into one "Context" and makes <b>Learning</b> a full step. It is good for failure and feedback questions, where "what did you learn and change?" is the whole point.</p>
<h4>Common mistakes</h4>
<ul>
<li><b>Too much setup</b>: 90 seconds explaining the system before any action.</li>
<li><b>"We" everywhere</b>: the interviewer cannot tell what you did.</li>
<li><b>No result</b>: story ends with "and then it was fine".</li>
<li><b>Hero story</b>: "I saved everyone". Credit teammates in one line; it signals maturity.</li>
<li><b>Blaming others</b>: even if true, the interviewer hears a future conflict.</li>
</ul>
<h4>Converting a rambling story into STAR</h4>
<p><b>Rambling:</b> "So we had this thing, the payments thing, it was a long time ago, and there were many people, and the manager was new, and there was a sale, and things kept failing, so we looked at stuff and eventually it worked better."</p>
<p><b>STAR:</b> <span class="c-b">S</span> "At BrightCart, 3% of payments failed during sales." <span class="c-b">T</span> "I owned finding the cause before the next sale in 3 weeks." <span class="c-b">A</span> "I read two days of logs, found duplicate retries causing double charges, proposed idempotency keys, aligned the payments team in a design review, and shipped behind a 5% canary." <span class="c-b">R</span> "Failures dropped from 3.1% to 0.4%, and refunds fell by 60%. I learned to bring ops in at design time."</p>
<p>Same facts, 4x clearer.</p>`,
    clues: [
      '"Tell me about a time..." / "Describe a situation where..." / "Give me an example of..." - classic STAR trigger',
      '"What was YOUR role?" or "What exactly did you do?" - Action section is too vague or full of "we"',
      '"What was the outcome?" / "How did you measure success?" - Result missing or has no number',
      '"What would you do differently?" - they want the Learning step (CARL), expect it as a follow-up',
      'Interviewer interrupts at 3 minutes or looks at the clock - setup too long; cut S/T to 2 sentences',
      '"Walk me through your resume" is NOT STAR - use a 60-90 second narrative instead'
    ],
    viz: {
      title: 'Where the time goes in a 2-minute STAR answer',
      inputLabel: 'Answer length in seconds (60-240)',
      input: '120',
      gen: function (input) {
        var total = parseInt(String(input).trim(), 10);
        if (isNaN(total) || total < 60 || total > 240) throw new Error('Enter seconds between 60 and 240');
        var parts = [['S', 'Situation', 10], ['T', 'Task', 10], ['A', 'Action', 50], ['R', 'Result + learning', 30]];
        var secs = parts.map(function (p) { return Math.round(total * p[2] / 100); });
        var labels = parts.map(function (p) { return p[0]; });
        var frames = [];
        var shown = [0, 0, 0, 0];
        var say = [
          'Context in one breath: "At BrightCart, 3% of payments failed during sales."',
          'My job: "I owned finding the cause before the next sale."',
          'The longest part: what <b>I</b> did - traced logs, designed idempotency keys, aligned payments team, rolled out with a 5% canary.',
          'Close with a number and a lesson: "Failures fell from 3.1% to 0.4%. I now involve ops at design time."'
        ];
        frames.push({ narr: 'We have <b>' + total + ' seconds</b>. Bars will show how long each part should take. Plan first, then talk.', parts: [
          { type: 'bars', label: 'Seconds per STAR part', values: shown.slice(), idxLabels: labels },
          { type: 'vars', vals: { total_seconds: total, spoken_words_approx: Math.round(total * 2.3) } }
        ] });
        for (var i = 0; i < 4; i++) {
          shown[i] = secs[i];
          var hl = {}; hl[i] = i === 2 ? 'sel' : 'cur';
          var texts = shown.map(function (v) { return v ? v + 's' : ''; });
          frames.push({ narr: '<b>' + parts[i][1] + '</b> (~' + parts[i][2] + '%, ' + secs[i] + ' s). ' + say[i], parts: [
            { type: 'bars', label: 'Seconds per STAR part', values: shown.slice(), hl: hl, texts: texts, idxLabels: labels },
            { type: 'vars', vals: { part: parts[i][1], seconds: secs[i], 'S+T so far': (shown[0] + shown[1]) + 's' }, hl: { part: 'cur' } }
          ] });
        }
        frames.push({ narr: 'Check: S + T = <b>' + (secs[0] + secs[1]) + ' s</b> (short), Action = <b>' + secs[2] + ' s</b> (longest), Result = <b>' + secs[3] + ' s</b>. If your Situation is longer than your Action, cut it.', parts: [
          { type: 'bars', label: 'Final time plan', values: secs.slice(), hl: { 0: 'ok', 1: 'ok', 2: 'sel', 3: 'ok' }, texts: secs.map(function (v) { return v + 's'; }), idxLabels: labels },
          { type: 'vars', vals: { total: secs.reduce(function (a, b) { return a + b; }, 0) + 's', rule: 'A is the longest' }, hl: { rule: 'ok' } }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Full STAR model (conflict with a teammate)',
        html: `<p><b>Question:</b> "Tell me about a time you disagreed with a teammate."</p>
<p><span class="c-b">S</span> At BrightCart, my teammate Dev and I disagreed on whether to rewrite or patch the coupon service two weeks before a sale.</p>
<p><span class="c-b">T</span> As the owner of coupons, I had to pick a plan we both could ship.</p>
<p><span class="c-b">A</span> I asked Dev to explain his rewrite fears first and listened without arguing. We listed risks on a doc: rewrite = 3 weeks, patch = 4 days but leaves tech debt. I proposed a split: patch now, schedule the rewrite as a ticket with an owner after the sale. I took the patch, Dev wrote the rewrite plan.</p>
<p><span class="c-b">R</span> We shipped on time with zero coupon incidents in the sale, and the rewrite started the next month. I learned to write both options and risks down before debating.</p>`
      },
      {
        title: 'CARL model (biggest failure)',
        html: `<p><b>Question:</b> "Tell me about a failure."</p>
<p><span class="c-b">C</span> Last year I shipped a database migration without a rollback plan; it locked a table for 11 minutes during peak.</p>
<p><span class="c-b">A</span> I rolled forward with a quick index fix, told my manager immediately, and wrote the incident review within a day.</p>
<p><span class="c-b">R</span> Service recovered in 11 minutes; about 900 orders were delayed, none lost.</p>
<p><span class="c-b">L</span> I made a migration checklist (backup, rollback, off-peak, canary) that the team now uses; the next 9 migrations had zero incidents.</p>`
      },
      {
        title: 'Spot the problem: three weak Results',
        html: `<ul><li>"...and it went well." - no evidence.</li><li>"...the manager was happy." - opinion, not measurable.</li><li>"...so latency dropped from 800 ms to 300 ms, saving about 120 support tickets a month." - measurable, strong.</li></ul><p>If you truly have no number, use an observable change: "the on-call page count for that service went from weekly to none in 3 months".</p>`
      }
    ],
    deepDive: `<p><b>Why this structure works for the listener.</b> The interviewer is typing notes while you talk. STAR gives them four labelled slots. If you skip the Result, their form stays empty and "no evidence" is written. Think of every answer as <i>dictation for their notes</i>.</p>
<p><b>Time budgeting.</b> Average speech is about 130-150 words a minute. Two minutes is about 270 words. Most interviews give 3-5 behavioral questions in 45 minutes, so about 8 minutes each including follow-ups. Aim for <b>2 minutes for the main answer</b>, leaving time for 2-3 follow-up questions. Practise with a timer and a voice recorder.</p>
<p><b>Follow-up depth.</b> After STAR, expect probes: "What was the hardest part?", "Who disagreed?", "What would you change?", "How did you measure the 0.4%?". Keep 2-3 extra details in reserve per story (a number, a name role, a trade-off). Never invent details when probed - say "I don't remember the exact figure, roughly...".</p>
<p><b>"I" vs "we".</b> Use "we" for team context and results, "I" for your decisions and actions. A good test: after you speak, could the interviewer write "Candidate personally did X"?</p>
<p><b>Variants.</b> <b>SOAR</b> (Situation, Obstacle, Action, Result), <b>PAR</b> (Problem, Action, Result), <b>CAR</b> (Context, Action, Result). They are the same idea: set the scene fast, spend time on your actions, land a result. Pick one and be consistent.</p>
<p><b>Failure stories.</b> Strong ones are real failures with real ownership, not "I work too hard". Structure: what happened (own it, no blame), what you did to fix it, what changed afterwards. Weak signal: small failure with no learning. Red flag: failure that was always someone else's fault.</p>
<p><b>Cultural differences.</b> In some cultures modesty is a virtue and "I" feels boastful. In US-style interviews it is the expected norm; practise saying "I decided" and "I wrote" out loud until it feels natural. Credit others in a single clause ("with Dev's help I...").</p>
<p><b>Listening to the question.</b> Answer the question asked. A conflict story used for a failure question looks evasive. When in doubt, pause 5 seconds, then pick the story with the best fit, not the story you like most.</p>`,
    aiEra: `<p><b>What AI changes:</b> practising behavioral answers is now easy. You can speak to an AI voice interviewer for free, any hour. But hiring managers also report more polished-yet-empty answers that sound like generic chatbot text: perfect structure, no real detail, no human memory in it.</p>
<p><b>Use AI as a partner:</b> record your answer, transcribe it, and ask <code>Here is my spoken answer. Mark each sentence as S, T, A or R. Tell me the percentage of time in each, point out every "we" that hides my role, and ask 3 follow-up questions an interviewer might ask. Do not rewrite my story.</code></p>
<p><b>Where AI goes wrong:</b> if you ask it to "write my STAR answer", it will invent plausible details and a flawless ending. If you memorize that, one follow-up question breaks you.</p>
<p><b>What you must still own:</b> the real memory. Your specific moments (the 2 a.m. log, the awkward meeting) are the proof that you were there. Keep AI for structure and rehearsal; keep the facts yours.</p>`,
    problems: [
      P({
        title: 'Convert a rambling story into STAR',
        level: 'Easy', tags: ['STAR', 'storytelling'],
        statement: `<p>Rewrite this answer in STAR with roughly 10/10/50/30 time shares, using "I" for actions and ending with a measurable result and a learning:</p><blockquote>"Yeah so there was this project, it was like a reporting thing, and the team was kind of stressed, and the deadline was close, and I helped out a lot, we stayed late, and in the end the client was fine with it, I think."</blockquote><p>Use fictional specifics: a report that took 6 hours to build, a deadline in 5 days.</p>`,
        example: `<p>Good: S/T are two short sentences; A lists 3 concrete steps; R has a time number.</p>`,
        weak: 'The original is the weak answer: no role, no actions, no result ("fine, I think"), and filler words. It gives the interviewer nothing to write down.',
        mcq: { q: 'Which part should take the MOST time in a STAR answer?', options: ['Situation', 'Action', 'Task'], answer: 1, explain: 'Action shows what you personally did; it is the evidence.' },
        hints: ['Hint 1: Find the one sentence that says what happened (S) and what you owned (T).', 'Hint 2: List 3 concrete actions with verbs: analysed, wrote, automated.', 'Hint 3: Add one number (hours, percent) and one lesson.'],
        approach: `<p><b>Model answer (about 2 minutes, fictional details).</b> "<b>Situation:</b> At BrightCart, the finance team's weekly sales report took 6 hours to build by hand, and a client review was 5 days away. <b>Task:</b> I owned delivering an accurate report on time and I wanted to stop it being manual. <b>Action:</b> First, I sat with the analyst for an hour to write down every step. Then I wrote a Python script that pulled the numbers from the database and filled the template, and I compared its output with last week's manual report to check for mismatches - I found one rounding bug and fixed it. I also asked a teammate to review the script and wrote a short README so others could run it. <b>Result:</b> The report went out on time and the build time dropped from 6 hours to 15 minutes, saving about 25 hours a month. The client signed off with no changes. I learned to start with the real user's workflow before writing code.</p><p>Why it is strong: the setup is two sentences, actions are specific and personal, the result has numbers, and it ends with a learning.</p>`,
        followUps: ['What if the interviewer asks what the rounding bug was?', 'How would you shorten this to 60 seconds?']
      }),
      P({
        title: 'Plan the time split for a 90-second answer',
        level: 'Easy', tags: ['STAR', 'timing'],
        statement: `<p>You have only 90 seconds. Compute seconds for S, T, A, R using 10/10/50/30, and write which sentence you would cut first if you ran out of time.</p>`,
        example: `<p>90 s: S 9 s, T 9 s, A 45 s, R 27 s.</p>`,
        weak: 'Spending 40 seconds on background "so you understand the context" and rushing the result in 5 seconds.',
        mcq: { q: 'At about 140 words per minute, 90 seconds of speech is roughly...', options: ['60 words', '210 words', '500 words'], answer: 1, explain: '1.5 minutes x 140 = 210 words.' },
        hints: ['Hint 1: multiply by the percentages.', 'Hint 2: S and T together should fit in about 18 seconds.', 'Hint 3: cut background detail, never the result.'],
        approach: `<p><b>Model answer.</b> With 90 seconds: Situation = 9 s (about 20 words), Task = 9 s (about 20 words), Action = 45 s (about 105 words, 3 steps), Result = 27 s (about 60 words, with a number and a lesson). Total about 210 words. If I ran out of time I would first cut extra background in the Situation (company history, team structure), then the third action step, but I would never cut the Result, because without a measurable outcome the answer has no evidence. I would practise this version with a timer three times and record it, then keep the 2-minute version ready in case the interviewer says "tell me more".</p>`,
        followUps: ['How do you keep it natural, not robotic?', 'What do you do if the interviewer cuts you off early?']
      })
    ]
  });

  topics.push({
    title: 'Building a Story Bank',
    analogy: `<p>A story bank is like a <b>toolbox</b> for a handyman. He does not buy a new tool for every job; he owns 8-10 good ones and knows which job each one fits. You will not prepare 40 answers for 40 questions. You prepare about 8 strong stories and learn which questions each one can answer.</p>`,
    explain: `<p>Behavioral questions look endless, but they repeat a few <b>themes</b>. About 12 themes cover most interviews:</p>
${H.chips(['Conflict', 'Failure', 'Leadership', 'Ownership', 'Disagree with manager', 'Tight deadline', 'Ambiguity', 'Customer focus', 'Mentoring', 'Learning fast', 'Feedback received', 'Proud achievement'], { label: '12 common themes' })}
<h4>How to build the bank (4 steps)</h4>
<ol>
<li><b>Brain-dump</b>: list 12-15 projects, incidents and moments from the last 3-4 years (work, internship, college, open source). Write one line each.</li>
<li><b>Pick 8</b> that had real stakes, your own actions and a result. Mix: 2 big wins, 2 failures or mistakes, 2 people stories (conflict, mentoring), 2 ambiguity or pressure stories.</li>
<li><b>Write each in STAR/CARL</b>: 6-8 bullet notes, not a script. Add the numbers, names (by role, e.g. "my manager"), dates.</li>
<li><b>Map to themes</b>: put a mark wherever a story could answer that theme with a small change of focus. Look for <b>gaps</b> (themes with no story) and for over-used stories.</li>
</ol>
<p>A story is "multi-theme": the billing migration can answer Ownership (I drove it), Deadline (3 weeks), Proud achievement (87% drop) and Leadership (I coordinated 3 teams). You change the <b>angle</b>, not the facts.</p>
<h4>Rules for a good bank</h4>
<ul>
<li>Every theme has <b>at least 2</b> candidate stories (so you do not repeat the same one in one loop).</li>
<li>Each story has a one-line <b>title</b> and a <b>headline result</b> ("Billing queue: failures 3.1% to 0.4%").</li>
<li>Use stories from several time periods and projects. Interviewers compare notes; the same story told to all five interviewers looks thin.</li>
<li>Recent beats old: prefer the last 2-3 years. Freshers can use internships, college projects, hackathons, part-time jobs.</li>
</ul>
<p>The runnable printer below shows a coverage matrix and flags themes with fewer than 2 stories.</p>`,
    clues: [
      '"Tell me about a time you..." - map it to a theme first (which of the 12?), then pick the story with the best fit',
      'Same interviewer asks two similar questions ("conflict" then "disagreement") - they want two different stories',
      'Question you did not prepare for - pause, find the closest theme, use a nearby story and shift the angle',
      'Amazon-style "Leadership Principles" listed in the prep email - map each principle to one of your themes and stories',
      '"What is your greatest strength / weakness?" - answer with a story-backed trait, not a list of adjectives',
      'A theme in the grid has an empty column - that is a gap; write a story for it this week'
    ],
    code: [
      {
        lang: 'python', run: true, title: 'Story bank coverage matrix printer',
        code: `# Story bank: story title -> set of themes it can answer.
THEMES = ["Conflict", "Failure", "Leadership", "Ownership", "DisagreeMgr",
          "Deadline", "Ambiguity", "Customer", "Mentoring", "Learning",
          "Feedback", "Proud"]

BANK = {
    "Billing queue":     {"Ownership", "Deadline", "Proud", "Leadership"},
    "Coupon rewrite":    {"Conflict", "Deadline"},
    "Migration outage":  {"Failure", "Ownership", "Learning"},
    "Mentoring Ravi":    {"Mentoring", "Leadership", "Feedback"},
    "Vague search task": {"Ambiguity", "Ownership", "Customer"},
}

def print_matrix(bank, themes):
    short = [t[:4] for t in themes]               # short column headers
    name_w = max(len(n) for n in bank) + 1
    print(" " * name_w + " ".join("%-4s" % s for s in short))
    for story, covered in bank.items():
        row = ["%-4s" % ("X" if t in covered else ".") for t in themes]
        print("%-*s" % (name_w, story) + " ".join(row))
    print()
    # Coverage per theme = how many stories can answer it
    counts = {t: sum(1 for s in bank.values() if t in s) for t in themes}
    gaps = [t for t in themes if counts[t] == 0]
    thin = [t for t in themes if counts[t] == 1]
    print("Gaps (0 stories):      ", gaps or "none")
    print("Thin (only 1 story):   ", thin or "none")
    # Over-used stories carry too much of the load
    heavy = [n for n, s in bank.items() if len(s) >= 4]
    print("Workhorse stories (4+):", heavy or "none")
    covered_pct = 100 * (len(themes) - len(gaps)) // len(themes)
    print("Theme coverage: %d%%" % covered_pct)

print_matrix(BANK, THEMES)
print()
print("Add 3 stories and re-run to close the gaps.")
`
      }
    ],
    viz: {
      title: 'Story bank by question themes: finding gaps',
      inputLabel: 'How many stories to include (1-8)',
      input: '5',
      gen: function (input) {
        var k = parseInt(String(input).trim(), 10);
        if (isNaN(k) || k < 1 || k > 8) throw new Error('Enter a number from 1 to 8');
        var themes = ['Confl', 'Fail', 'Lead', 'Own', 'MgrDis', 'Dead', 'Ambig', 'Cust', 'Mentor', 'Learn', 'Feed', 'Proud'];
        var stories = [
          ['Billing queue', [2, 3, 5, 11]],
          ['Coupon rewrite', [0, 5]],
          ['Migration outage', [1, 3, 9]],
          ['Mentoring Ravi', [2, 8, 10]],
          ['Vague search task', [3, 6, 7]],
          ['Learning Kafka', [5, 9]],
          ['Support dashboard', [7, 11]],
          ['Pushed back on date', [0, 4, 5]]
        ];
        var frames = [];
        var rows = [], rowHead = [], hl = {};
        var counts = themes.map(function () { return 0; });
        frames.push({ narr: 'Empty grid: <b>' + themes.length + ' themes</b> across the top, your stories down the side. Goal: no empty column.', parts: [
          { type: 'grid', label: 'Story x Theme', colHead: themes, rowHead: ['(no stories yet)'], rows: [themes.map(function () { return '.'; })] }
        ] });
        for (var s = 0; s < k; s++) {
          var row = themes.map(function (t, c) { return stories[s][1].indexOf(c) >= 0 ? 'X' : '.'; });
          stories[s][1].forEach(function (c) { hl[s + ',' + c] = 'ok'; counts[c]++; });
          rows.push(row); rowHead.push(stories[s][0]);
          frames.push({ narr: 'Add story <b>"' + stories[s][0] + '"</b>: it can answer ' + stories[s][1].length + ' themes (green). One story, many angles.', parts: [
            { type: 'grid', label: 'Story x Theme', colHead: themes, rowHead: rowHead.slice(), rows: rows.map(function (r) { return r.slice(); }), hl: Object.assign({}, hl) },
            { type: 'vars', vals: { stories: s + 1, themes_covered: counts.filter(function (x) { return x > 0; }).length + ' / 12' } }
          ] });
        }
        var cov = counts.map(function (x) { return x; });
        var hl2 = Object.assign({}, hl);
        var gaps = [], thin = [];
        cov.forEach(function (x, c) {
          hl2[k + ',' + c] = x === 0 ? 'bad' : (x === 1 ? 'cur' : 'ok');
          if (x === 0) gaps.push(themes[c]); else if (x === 1) thin.push(themes[c]);
        });
        var rows2 = rows.map(function (r) { return r.slice(); });
        rows2.push(cov.map(String));
        frames.push({ narr: 'Count per column (last row). <span class="c-r">Red = gap (0 stories)</span>, amber = thin (1 story), green = safe (2+). Gaps: <b>' + (gaps.join(', ') || 'none') + '</b>. Thin: <b>' + (thin.join(', ') || 'none') + '</b>.', parts: [
          { type: 'grid', label: 'Coverage (last row = stories per theme)', colHead: themes, rowHead: rowHead.concat(['COUNT']), rows: rows2, hl: hl2 },
          { type: 'vars', vals: { gaps: gaps.length ? gaps.join(', ') : 'none', thin: thin.length ? thin.join(', ') : 'none' }, hl: { gaps: gaps.length ? 'bad' : 'ok' } }
        ] });
        frames.push({ narr: gaps.length ? 'Action: write a story for each red column this week. Look at your brain-dump list; the story usually exists but was not picked.' : 'No gaps. Next: strengthen amber (thin) themes with a second story so you never repeat in one loop.', parts: [
          { type: 'text', html: gaps.length ? '<b class="c-r">Fill gaps:</b> ' + gaps.join(', ') : '<b class="c-g">All 12 themes covered.</b>' }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Map 8 stories to 12 questions (the full matrix)',
        html: `<p>Fictional candidate Meera. X means "this story can answer this theme".</p>
${H.table(['Story', 'Confl', 'Fail', 'Lead', 'Own', 'MgrDis', 'Dead', 'Ambig', 'Cust', 'Mentor', 'Learn', 'Feed', 'Proud'], [
  ['1 Billing queue', '', '', 'X', 'X', '', 'X', '', '', '', '', '', 'X'],
  ['2 Coupon rewrite', 'X', '', '', '', '', 'X', '', '', '', '', '', ''],
  ['3 Migration outage', '', 'X', '', 'X', '', '', '', '', '', 'X', '', ''],
  ['4 Mentoring Ravi', '', '', 'X', '', '', '', '', '', 'X', '', 'X', ''],
  ['5 Vague search task', '', '', '', 'X', '', '', 'X', 'X', '', '', '', ''],
  ['6 Learning Kafka', '', '', '', '', '', 'X', '', '', '', 'X', '', ''],
  ['7 Support dashboard', '', '', '', '', '', '', '', 'X', '', '', '', 'X'],
  ['8 Pushed back on date', 'X', '', '', '', 'X', 'X', '', '', '', '', '', '']
])}
<p>Every column has at least one X. Thin columns (one X): Failure, Manager disagreement, Ambiguity, Mentoring, Feedback - write backups for those.</p>`
      },
      {
        title: 'One story, three angles',
        html: `<p>Story: "Billing queue migration."</p><ul>
<li><b>Ownership question</b>: stress that you wrote the doc, ran the rollout and stayed on call.</li>
<li><b>Deadline question</b>: stress the 3-week limit, scope you cut, daily check-ins.</li>
<li><b>Leadership question</b>: stress that you aligned 3 teams without being their manager.</li></ul><p>Same facts; the Action section changes emphasis.</p>`
      },
      {
        title: 'How to answer a question you did not prepare for',
        html: `<p>Question: "Tell me about a time you had to learn something quickly under pressure."</p><p>Step 1 (5 seconds): breathe, say "good question, let me think". Step 2: map to theme "Learning fast". Step 3: choose "Learning Kafka" (story 6). Step 4: answer in STAR: S/T in 25 seconds, Action = how I learned (docs, a pairing session, a small prototype), Result = shipped in 2 weeks. Silence for a few seconds is fine; panic-talking is not.</p>`
      }
    ],
    deepDive: `<p><b>What makes a story "strong"?</b> A strong story has: (1) real stakes (money, users, time, a person), (2) a decision or obstacle where you could have failed, (3) your specific actions, (4) a measurable result, (5) a lesson or later change. A story about routine work ("I fixed 20 tickets") is weak because it has no obstacle.</p>
<p><b>Scope should match level.</b> Junior: own a feature, fix an incident, work with one teammate. Mid: own a service or project, influence a design decision. Senior: shape a plan across teams, make a trade-off with a business effect. Choose stories at or slightly above your current level, and never a hero story that is far above your honest role.</p>
<p><b>Story card format.</b> Keep each story on one index card or note: Title, Themes, S/T line, 3-5 action bullets, Result with numbers, Learning, "danger zones" (what an interviewer may probe), and 2 backup details. Do not write a word-for-word script: scripts sound robotic and break when interrupted.</p>
<p><b>Practising.</b> Say each story aloud 3 times with a timer. First version rambles (3-4 minutes), second is 2:30, third is 2:00. Record yourself once; the recording is humbling and fast learning. Do one mock with a friend who interrupts with follow-ups.</p>
<p><b>Negative stories.</b> Include 2 stories where things went wrong (failure, a mistake, a missed deadline). Interviewers distrust a candidate who has only successes. The recovery and the learning are the signal.</p>
<p><b>Freshers and career switchers.</b> No big work stories? Use: group projects, hackathons, open source PRs, student clubs, part-time jobs, teaching/tutoring, a self-learning project. The signals (ownership, conflict, learning) still show. Be honest about scale ("team of 4 students").</p>
<p><b>Cross-cultural care.</b> Avoid stories with private personal details, politics, or confidential company information. A "safe" story is professional, about decisions and outcomes, and respectful to others.</p>`,
    aiEra: `<p><b>What AI changes:</b> It can quickly help you <i>find</i> stories by asking good questions, and it can quiz you. It cannot know your life. Interviewers increasingly ask deeper follow-ups because they know polished answers can be generated.</p>
<p><b>Use AI as a partner:</b> brainstorm with <code>I will paste a list of projects I worked on. Ask me one question at a time to uncover stakes, my own actions and measurable results. Do not write the stories for me.</code> Then: <code>Here is my theme-by-story matrix. Which themes are weak and what common behavioral questions might I be missing?</code></p>
<p><b>Where AI goes wrong:</b> it fills memory gaps with plausible fiction, and it likes dramatic endings ("and the CEO thanked me"). It also gives every candidate the same shape of story.</p>
<p><b>What you must still own:</b> the facts, the numbers, and the memory. Rehearse until you can tell each story without notes, in your own words, with 2-3 details that a chatbot could not invent (the odd bug, the quote from a teammate, the tool name). That texture is what convinces a human interviewer.</p>`,
    problems: [
      P({
        title: 'Map 8 stories to 12 common questions',
        level: 'Medium', tags: ['story bank', 'mapping'],
        statement: `<p>Here are 8 story titles (fictional): (1) Billing queue migration, (2) Coupon rewrite debate, (3) Migration outage, (4) Mentoring a new joiner, (5) Vague "improve search" task, (6) Learning Kafka in 2 weeks, (7) Customer support dashboard, (8) Pushing back on an unrealistic date. Map each to the themes it can answer from the 12 themes in this topic. Find gaps and thin themes and say what new story you would write.</p>`,
        example: `<p>Story 1 can answer Leadership, Ownership, Deadline, Proud achievement.</p>`,
        weak: 'Saying "I have lots of experience, I can answer anything" and preparing no mapping. In the room, the candidate tells the same story 3 times.',
        mcq: { q: 'A theme column has only one story. What should you do?', options: ['Ignore it', 'Write a backup story so you can avoid repeating one in a loop', 'Use the same story for every theme'], answer: 1, explain: 'Different interviewers compare notes; you want two options per theme.' },
        hints: ['Hint 1: For each story ask "what would an interviewer note about me here?"', 'Hint 2: Mark every theme the story can honestly answer, not just the first.', 'Hint 3: Count per column; 0 = gap, 1 = thin.'],
        approach: `<p><b>Model answer.</b> Mapping: (1) Billing queue: Leadership, Ownership, Deadline, Proud. (2) Coupon rewrite: Conflict, Deadline. (3) Outage: Failure, Ownership, Learning. (4) Mentoring: Mentoring, Leadership, Feedback. (5) Vague search: Ambiguity, Ownership, Customer. (6) Kafka: Deadline, Learning. (7) Dashboard: Customer, Proud. (8) Pushback: Conflict, Manager disagreement, Deadline.</p><p><b>Column counts:</b> Conflict 2, Failure 1, Leadership 2, Ownership 3, Manager disagreement 1, Deadline 4, Ambiguity 1, Customer 2, Mentoring 1, Learning 2, Feedback 1, Proud 2. No empty columns, but five are thin (Failure, Manager disagreement, Ambiguity, Mentoring, Feedback) and Deadline is over-served.</p><p><b>Plan:</b> write a second failure story (a smaller mistake with a clear fix), a second ambiguity story, and a feedback story where I received hard feedback and changed something visible. Keep Deadline stories rotating so no two interviewers hear the same one. Use the brain-dump list to find these; the stories usually already exist in my last two years.</p>`,
        followUps: ['What if a theme has no real story from your career?', 'How do you avoid repeating one story in the same loop?']
      })
    ]
  });

  topics.push({
    title: 'The 6-Week Prep Plan, Resume Critique and Honest Use of AI',
    analogy: `<p>Preparing for a loop is like <b>training for a 10 km run</b>. You do not run 10 km every day, and you do not start the week before. You build a plan: easy runs, one long run, rest, then a light week before race day. Interviews reward the same steady rhythm: a little every day, with a mock test before the real one.</p>`,
    explain: `<p>A plan turns "I should prepare" into small checkable tasks. Here is a 6-week plan for a candidate with a job and about 10-12 hours a week.</p>
${H.table(['Week', 'Focus', 'Concrete output'], [
  ['1', 'Resume + LinkedIn + target list', 'One-page resume with 8+ impact bullets, LinkedIn matched, 15 target companies, 3 referral asks sent'],
  ['2', 'Story bank', 'Brain-dump of 15 projects, 8 stories in STAR, theme matrix with no empty column'],
  ['3', 'Coding patterns + stories out loud', '10 problems per pattern block, 3 stories practised aloud with a timer'],
  ['4', 'System design basics + more stories', '3 designs practised; 3 more stories rehearsed; first mock behavioral'],
  ['5', 'Mocks', '2 full mock loops (coding + design + behavioral) with a friend or peer platform; fix top 3 weak spots'],
  ['6', 'Polish + rest', 'Recruiter 60-second pitch, questions for interviewers, logistics, sleep; light review only']
])}
<h4>Daily rhythm (weekdays, about 90 minutes)</h4>
<ul><li>45 min coding (1-2 problems, explain aloud)</li><li>20 min stories or design</li><li>15 min review: what mistake did I repeat?</li><li>10 min applications / referrals / follow-ups</li></ul>
<h4>Resume critique: a 60-second checklist</h4>
${H.table(['Check', 'Pass looks like'], [
  ['Length', 'One page (under 10 years)'],
  ['Top third', 'Best result visible without scrolling'],
  ['Bullets', 'Start with verbs, 70%+ have a number'],
  ['Skills', 'Matches the job post, real, no 40-item dump'],
  ['Format', 'One column, standard headings, selectable text'],
  ['Truth', 'You can explain every line for 5 minutes'],
  ['Typos / dates', 'None; consistent style']
])}
<h4>Questions you will get from the recruiter</h4>
<p>"Tell me about yourself" (60-90 seconds: present, past, why this role), "Why this company?", "Why are you leaving?" (positive, forward-looking), "Salary expectations?" (give a range after you know the level, or ask for the band), "Notice period and other processes?" (be honest; it gives them timing).</p>
<h4>Honest AI use</h4>
<ul><li><b>Good:</b> proofreading, tightening bullets with your facts, mock questions, finding gaps, practising out loud.</li><li><b>Not ok:</b> invented numbers or tools, writing answers you memorise and cannot defend, using hidden AI help in a round that forbids it, pasting confidential data.</li></ul>`,
    clues: [
      'Interview in 6 weeks (or fewer) - schedule backwards from the date: mocks in the last 2 weeks, rest in the last 2 days',
      '"Walk me through your resume" - a time-boxed narrative (past, present, future) with one result per role',
      'Recruiter asks about salary early - know your range and the market band; do not name a number before you know the level',
      'Resume feedback says "too long / generic" - cut to one page and add numbers to every recent bullet',
      '"Are you using AI tools?" in an assessment policy - read the rule; assume no unless it says yes',
      'Many applications, no replies - fix resume keywords first, then ask for referrals; referrals convert far better than cold applies'
    ],
    viz: {
      title: 'Your 6-week prep timeline',
      inputLabel: 'Current week to highlight (0 = play all weeks)',
      input: '0',
      gen: function (input) {
        var w = parseInt(String(input).trim(), 10);
        if (isNaN(w) || w < 0 || w > 6) throw new Error('Enter a number from 0 to 6');
        var plan = [
          ['Resume', 'One page, 8+ impact bullets, LinkedIn matched, referral asks sent'],
          ['Stories', 'Brain-dump 15, write 8 in STAR, theme matrix has no gaps'],
          ['Code+Talk', 'Pattern blocks daily, 3 stories practised aloud with timer'],
          ['Design', '3 system designs, 3 more stories, first behavioral mock'],
          ['Mocks', '2 full mock loops, fix top 3 weaknesses'],
          ['Polish', 'Recruiter pitch, questions to ask, logistics, rest']
        ];
        var labels = plan.map(function (p, i) { return 'W' + (i + 1); });
        var vals = plan.map(function (p) { return p[0]; });
        var start = w === 0 ? 1 : w, end = w === 0 ? 6 : w;
        var frames = [];
        for (var k = start; k <= end; k++) {
          var hl = {}, ptr = {};
          for (var j = 0; j < k - 1; j++) hl[j] = 'done';
          hl[k - 1] = 'cur'; ptr[k - 1] = 'now';
          for (var m = k; m < 6; m++) hl[m] = '';
          frames.push({
            narr: '<b>Week ' + k + ': ' + plan[k - 1][0] + '.</b> ' + plan[k - 1][1] + '. ' + (k === 6 ? 'Taper: the work is done, protect your sleep.' : 'Faded weeks are finished; later weeks are still ahead.'),
            parts: [
              { type: 'array', label: '6-week timeline', values: vals, hl: hl, ptr: ptr, idxLabels: labels },
              { type: 'vars', label: 'This week', vals: { week: k, focus: plan[k - 1][0], hours: k === 6 ? 6 : 11, 'weeks left': 6 - k }, hl: { focus: 'cur' } }
            ]
          });
        }
        if (w === 0) frames.push({ narr: 'Plan complete. If a week slips, <b>drop breadth, not mocks</b>: mocks are the closest thing to the real interview.', parts: [
          { type: 'array', label: '6-week timeline', values: vals, hl: { 0: 'done', 1: 'done', 2: 'done', 3: 'done', 4: 'sel', 5: 'ok' }, idxLabels: labels }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Critique a resume (fictional "Arjun Rao")',
        html: `<blockquote>Arjun Rao - Software Developer<br>Objective: Seeking a challenging position in a reputed company.<br>- Responsible for backend development<br>- Worked on APIs and databases<br>- Team player with good communication<br>Skills: Java, C, C++, Python, HTML, CSS, JS, React, Angular, Vue, SQL, Mongo, AWS, Azure, GCP, Docker, K8s, Jenkins...(34 items)<br>Two pages, two-column layout, photo.</blockquote>
<p><b>Critique:</b></p><ol><li><b>Objective</b> is generic - replace with 2 lines of summary and one result.</li><li><b>All bullets are duties</b> - no verb of action, no number. Rewrite as "Did X, measured by Y, by doing Z".</li><li><b>Skills dump</b> of 34 - keep 10-12 he can defend; the rest invites tough questions.</li><li><b>Two columns + photo</b> - parse risk and, in some countries, bias risk; use one column, no photo.</li><li><b>Two pages</b> with under 10 years - cut to one.</li><li><b>"Team player"</b> - show it with a story, do not claim it.</li></ol>`
      },
      {
        title: '60-90 second "Tell me about yourself"',
        html: `<p>"I'm a backend engineer with four years at BrightCart, working on payments. Recently I led a queue migration that cut failed payments from 3.1% to 0.4%. Before that I built the coupon service and mentored two new joiners. I like problems where reliability matters, and I'm looking for a team where I can own a larger system. Your company's work on payment infrastructure fits that, which is why I applied."</p><p>Structure: present (role + headline result), past (1-2 earlier highlights), future (why this role). About 90 words, 40 seconds, easy to extend.</p>`
      },
      {
        title: 'Salary question, honest and calm',
        html: `<p><b>Recruiter:</b> "What are your salary expectations?"</p><p><b>Candidate:</b> "I'd like to learn more about the level and the total compensation range first. Based on my research for this kind of role in this city, I'm looking at roughly X to Y total. I'm flexible depending on the whole package. Can you share the band for this level?"</p><p>This avoids anchoring too low, stays honest, and keeps the conversation open. (Never lie about your current salary; say what you're targeting instead.)</p>`
      }
    ],
    deepDive: `<p><b>Why 6 weeks.</b> Skills such as pattern recognition and speaking structure need spaced repetition: learning a pattern on Monday and recalling it on Friday and next week beats cramming. Six weeks gives about 60-70 hours, which is enough for most mid-level candidates if they already work as engineers. Fresh graduates may need 8-12 weeks; people with a strong base may do it in 3-4.</p>
<p><b>Compression tips.</b> 2 weeks left? Drop new topics: do the resume (1 day), 6 stories (3 days), 15 repeats of known patterns, 2 mocks. 1 week left? Practice the 60-second pitch, 4 stories, and one hard mock; sleep.</p>
<p><b>Mocks matter most.</b> Real-time speaking while coding feels different from silent practice. Use peers, mentors or practice platforms. Ask the mock partner for specific notes: "Where did I go silent?" "Which sentence was unclear?" "What did you write down as my strongest signal?"</p>
<p><b>Parallel applications.</b> Put your first interviews with companies you care about less, so nerves are spent on practice rather than your dream job. Cluster loops within 2-3 weeks so offers arrive together (useful for negotiation, covered later in the track).</p>
<p><b>Referrals.</b> A referral skips the pile at many companies. Ask a former colleague with a short note: your resume, the job link, 2 lines on why you fit. Respect "no". Do not message strangers with a copy-paste request; mention something specific.</p>
<p><b>Rejections.</b> Most strong engineers get several. Ask for feedback politely (often not given), keep a log of questions you struggled with, and fix patterns. Rejection mostly reflects fit, level or noise.</p>
<p><b>Health.</b> Sleep, exercise and one free evening a week sustain the plan better than heroic weekends. Burnout hurts speech clarity and memory, the two things the behavioral round tests.</p>`,
    aiEra: `<p><b>What AI changes:</b> Recruiters use AI to summarise resumes and rank applicants, and many ATS tools now have AI search ("find candidates with payments experience"). Applications are far more numerous because anyone can auto-apply, so <b>referrals and clear specific resumes matter even more</b>. Some companies also run AI-led first screens; treat them like a real interview with a patient but fairly literal listener.</p>
<p><b>Use AI as a partner:</b> <code>Act as a recruiter for a backend role. Here is my resume and the job post. List the 5 strongest signals, 5 gaps, and any bullet where the claim sounds vague. Do not rewrite anything and do not invent facts.</code> Also: build your 6-week calendar, then adjust it weekly.</p>
<p><b>Where AI goes wrong:</b> it flatters (every resume is "strong"), invents achievements when asked to "improve" a bullet, and mixes up real company processes. Do not let it put numbers or tools in your resume that you did not provide.</p>
<p><b>What you must still own:</b> <b>honesty</b>. Interviewers verify claims through follow-up questions, references and sometimes background checks. If asked "did you use AI to prepare this?", the honest answer is a calm "yes, to proofread and practise; the stories and numbers are mine." That is fine and increasingly normal. Misrepresenting skills or using hidden AI in a closed-book round is not.</p>`,
    problems: [
      P({
        title: 'Plan your 6-week prep timeline',
        level: 'Medium', tags: ['planning', 'prep'],
        statement: `<p>You work full time and have 10 hours a week. Your first onsite loop is in 6 weeks at a mid-size product company. Write a week-by-week plan with specific outputs, a daily schedule, and what you would drop if you fall one week behind.</p>`,
        example: `<p>Week 1 output: one-page resume, LinkedIn updated, 3 referral requests sent.</p>`,
        weak: '"I will practise coding whenever I get time." No schedule, no stories, no mocks - the plan collapses by week 2.',
        mcq: { q: 'You fall one week behind. What do you drop first?', options: ['Mock interviews', 'Low-value breadth (extra topics), keeping mocks and stories', 'Sleep'], answer: 1, explain: 'Mocks and rehearsed stories raise your performance the most.' },
        hints: ['Hint 1: Work backwards from the date: mocks in weeks 5-6.', 'Hint 2: Each week needs a checkable output, not "study".', 'Hint 3: Reserve slack: plan 8 productive hours, not 10.'],
        approach: `<p><b>Model plan.</b> Week 1: resume (one page, 8 impact bullets), LinkedIn, list of 15 target companies, 3 referral requests. Output: PDF resume, tracker sheet. Week 2: story bank: brain-dump 15 projects, write 8 in STAR/CARL, build the theme matrix, fix gaps. Week 3: coding patterns (arrays/hash maps, two pointers, trees, graphs), 1-2 problems daily, practise 3 stories out loud. Week 4: system design basics (3 classic designs), 3 more stories, first behavioral mock. Week 5: two full mock loops with feedback; fix the top three weaknesses; rewrite weak stories. Week 6: polish: recruiter pitch, questions to ask, logistics (laptop, quiet room, internet test), light review, sleep.</p><p><b>Daily rhythm:</b> weekdays 60-90 minutes (coding 45, stories or design 20, review 15), one longer weekend block of 3 hours for a mock or a design.</p><p><b>If one week behind:</b> drop extra breadth topics and the second pass of easy problems; never drop mocks, the resume and the story bank. If two weeks behind, ask the recruiter to move the date by a week - that is a normal request.</p>`,
        followUps: ['How would this change for a fresh graduate?', 'What would you add if the role includes a take-home assignment?']
      }),
      P({
        title: 'Critique this resume',
        level: 'Medium', tags: ['resume', 'critique'],
        statement: `<p>Critique this resume in order of importance and give the fix for each: a 2-page resume for a candidate with 3 years of experience, two columns, photo, "Objective: seeking a challenging role", bullets "Responsible for...", "Worked on...", a skills section of 34 tools, no numbers, a gap of 14 months with no explanation, and an email address "coolboy_99@example.com".</p>`,
        example: `<p>Top fix: bullets (they are 80% of the signal). Second: length and layout.</p>`,
        weak: '"It looks fine, maybe change the font." Misses that no bullet shows any result.',
        mcq: { q: 'Which flaw hurts the most?', options: ['The font', 'Bullets with no verbs or results', 'The email address'], answer: 1, explain: 'Bullets carry the signal; the others are smaller polish.' },
        hints: ['Hint 1: Read as a recruiter: where does the eye land in 10 seconds?', 'Hint 2: Sort issues by effect on signal, not by how easy they are.', 'Hint 3: Give a concrete fix for each, not just "improve".'],
        approach: `<p><b>Critique, ranked by impact.</b> (1) <b>Bullets are duties without results:</b> rewrite each as verb + metric + method, aim for at least 70% with numbers. (2) <b>Two pages for 3 years:</b> cut to one page; drop weak older bullets, keep 3-4 for the latest role. (3) <b>Skills dump of 34 tools:</b> keep 10-12 the candidate can defend and that match the target job. (4) <b>Layout:</b> two columns and a photo can break ATS parsing and, in some regions, add bias; switch to one column, standard headings, no photo. (5) <b>Generic objective:</b> replace with a 2-line summary stating role, strength and headline result. (6) <b>14-month gap:</b> add one honest line (for example "Career break: family care, completed cloud certification") rather than hiding it. (7) <b>Unprofessional email:</b> use name-based address. (8) <b>Proof:</b> add GitHub or portfolio link only if the work is readable.</p><p>After fixes, run a truth test: for each bullet, can I explain it for five minutes, including the numbers? If not, remove or rewrite it honestly.</p>`,
        followUps: ['What would you ask the candidate before fixing it?', 'How would you handle a gap caused by a layoff?']
      })
    ]
  });

  // ---------------- PRACTICE ----------------
  practice.push(P({
    title: 'Name the stage', level: 'Easy', tags: ['loop'], companies: ['Amazon', 'Google'],
    statement: `<p>For each event name the loop stage and one signal measured: (a) a 90-minute auto-graded test link, (b) a 25-minute call about your motivation and salary range, (c) a stranger from another team asks deep follow-ups on your stories, (d) people who never met you read written feedback.</p>`,
    example: `<p>(a) Online assessment: correct code under time.</p>`,
    weak: 'Calling everything "the interview" and preparing the same way for all. Different stages measure different things.',
    mcq: { q: 'Who sees your interview feedback in the hiring committee stage?', options: ['Only your interviewer', 'People who read written packets and may not have met you', 'Nobody'], answer: 1, explain: 'The committee decides from papers.' },
    hints: ['Hint 1: match names to the 7 stages.', 'Hint 2: think "who evaluates" for each.', 'Hint 3: write signals as nouns: problem solving, motivation, ownership, consistency.'],
    approach: `<p><b>Model answer.</b> (a) <b>Online assessment</b>: measures correctness and speed of coding, basic problem solving, graded by hidden tests. (b) <b>Recruiter screen</b>: measures motivation, communication, logistics (salary range, notice period, location) and red flags. (c) <b>Bar-raiser round</b>: a trained cross-team interviewer who checks that you raise the bar; measures depth of ownership and honesty under follow-up. (d) <b>Hiring committee</b>: measures consistency of signals across rounds and the right level, using written feedback only. Knowing this changes my prep: for (a) timed practice, for (b) a 60-second pitch and a salary approach, for (c) stories with real detail, and for (d) giving each interviewer clear quotable evidence.</p>`
  }));
  practice.push(P({
    title: 'Is it an impact bullet?', level: 'Easy', tags: ['resume'],
    statement: `<p>Classify each as Strong or Weak and say which of verb / metric / method is missing: (1) "Led migration of 14 jobs to containers, saving $9K/month." (2) "Responsible for the payments module." (3) "Optimized queries." (4) "Cut p95 latency 820 ms to 310 ms with Redis caching."</p>`,
    example: `<p>(1) Strong: verb Led, metric $9K/month, method containers.</p>`,
    weak: 'Calling (3) "good enough" because it has an action verb; it has no result and no method.',
    mcq: { q: '"Optimized queries." is missing...', options: ['Nothing', 'A metric and a method', 'A longer length only'], answer: 1, explain: 'How much faster? By doing what?' },
    hints: ['Hint 1: check the three parts one by one.', 'Hint 2: a duty has a noun, an impact has a change.', 'Hint 3: write the missing part you would ask the candidate for.'],
    approach: `<p><b>Model answer.</b> (1) Strong: verb (Led), metric (14 jobs, $9K/month), method (containers). Possibly add how, but fine. (2) Weak: "Responsible for" is a duty phrase; no verb of action, no metric, no method; ask "what changed because of you?". (3) Weak: verb present but no metric (how much faster?) and no method (indexes? rewrite? cache?). Better: "Cut report query time from 40 s to 3 s by adding composite indexes and rewriting two joins." (4) Strong: verb Cut, metric 820 to 310 ms, method Redis caching.</p><p>General rule: a bullet answers three silent questions from the recruiter: what did you do, how much did it matter, and how did you do it. Missing any one is a gap that invites doubt or is skipped in a 10-second scan.</p>`
  }));
  practice.push(P({
    title: 'Write your 60-second pitch', level: 'Easy', tags: ['recruiter', 'pitch'],
    statement: `<p>Write a 60-second answer to "Tell me about yourself" for a fictional engineer with 3 years in e-commerce who wants to move to payments. Structure: present, past, future. Include one number.</p>`,
    example: `<p>"I'm a backend engineer... I recently cut checkout errors by 60%..."</p>`,
    weak: 'Reading the resume top to bottom for 4 minutes starting from school, with no focus on why this role.',
    mcq: { q: 'Best structure for "Tell me about yourself"?', options: ['Childhood to today', 'Present, past highlights, future/why this role', 'Only hobbies'], answer: 1, explain: 'Relevant and short wins.' },
    hints: ['Hint 1: start with your current role and the headline result.', 'Hint 2: add one earlier highlight that supports the target role.', 'Hint 3: end with why this company, in specific words.'],
    approach: `<p><b>Model answer (about 55 seconds, fictional).</b> "I'm a backend engineer with three years at an e-commerce company, mostly on checkout and orders. Recently I led a project that added retries and idempotency keys to the order API, and it cut checkout errors by about 60%. Before that I built the coupon service that handled 20,000 requests a minute during sales, and I mentored two new joiners. What I enjoy most is the reliability side - making money-moving code safe - so I'm looking to move into payments, and your team's work on settlement and refunds is exactly that kind of problem."</p><p>Why it works: it is about 110 words, has a number, shows direction, and ends on a clear reason for this role. It also invites follow-ups (idempotency, mentoring), which are stories I have prepared.</p>`
  }));
  practice.push(P({
    title: 'Rewrite six weak bullets (set 2)', level: 'Medium', tags: ['resume', 'bullets'],
    statement: `<p>Rewrite these into "Did X, measured by Y, by doing Z" with clearly fictional numbers: (1) Maintained the mobile app. (2) Helped with code reviews. (3) Worked on CI pipeline. (4) Wrote documentation. (5) Fixed bugs. (6) Part of the hackathon team.</p>`,
    example: `<p>(5) "Fixed 40 customer-reported bugs..." is still weak without a result; find the effect.</p>`,
    weak: 'Adding numbers with no meaning: "Fixed 50 bugs" says nothing about impact or how.',
    mcq: { q: 'Which rewrite of "Fixed bugs" is strongest?', options: ['Fixed many bugs', 'Cut app crash rate from 2.1% to 0.4% by fixing 3 memory leaks found with a profiler', 'Fixed 50 bugs'], answer: 1, explain: 'It has outcome and method.' },
    hints: ['Hint 1: ask "so what changed?"', 'Hint 2: pick the right number: time, errors, users.', 'Hint 3: keep to one line.'],
    approach: `<p><b>Model rewrite (fictional numbers).</b></p><ol><li>Cut mobile crash rate from 2.1% to 0.4% across 3 releases by fixing memory leaks found with a profiler.</li><li>Reviewed about 120 pull requests and introduced a review checklist that reduced rework by roughly 25% in a team of 7.</li><li>Reduced CI time from 28 to 11 minutes by parallelising tests and caching dependencies.</li><li>Wrote the API onboarding guide that cut new-joiner time-to-first-PR from 9 days to 4.</li><li>Fixed the top 3 crash causes, lifting app-store rating from 3.9 to 4.4.</li><li>Built a delivery-tracking prototype at a 36-hour hackathon (team of 4, I owned the backend); it placed in the top 3 of 40 teams.</li></ol><p>Notice how even "documentation" and "hackathon" become evidence once you measure the change. The key habit is asking "what got better because I did this?" and knowing the true answer.</p>`
  }));
  practice.push(P({
    title: 'Fix a "we" story', level: 'Medium', tags: ['STAR', 'ownership'],
    statement: `<p>Rewrite: "We had a problem with slow reports. We looked at the queries and we added indexes. We got it faster and the client was happy." Make your personal role clear without taking credit for the whole team. Add a number and a learning.</p>`,
    example: `<p>"I profiled the 5 slowest queries... my teammate Sam reviewed the schema change."</p>`,
    weak: 'The original: every verb is "we"; the interviewer cannot write down a single thing you did.',
    mcq: { q: 'What is the best way to use "we" and "I"?', options: ['Only "we", it is modest', 'Only "I", you are the hero', '"We" for team context and results, "I" for your decisions and actions'], answer: 2, explain: 'It shows ownership and teamwork.' },
    hints: ['Hint 1: list what you personally did.', 'Hint 2: credit others in one clause.', 'Hint 3: add the result number and a lesson.'],
    approach: `<p><b>Model answer.</b> "<b>Situation:</b> Our weekly sales report took 40 seconds to load, and the client threatened to stop using it. <b>Task:</b> I owned the fix for the reporting module. <b>Action:</b> I profiled the five slowest queries and found two missing indexes and one query joining a table twice. I wrote the index migration and rewrote that query, and my teammate Sam reviewed the schema change and helped me test it on a copy of production data. I also added a query-time alert so we would notice regressions. <b>Result:</b> Load time dropped from 40 seconds to 3, the client renewed its contract, and support tickets about reports fell to nearly zero. <b>Learning:</b> I now profile before guessing, and I add a monitor with every performance fix."</p><p>The team gets credit in one sentence, but every decision and action is clearly mine, which gives the interviewer evidence for the ownership signal.</p>`
  }));
  practice.push(P({
    title: 'Convert a rambling failure story to CARL', level: 'Medium', tags: ['CARL', 'failure'],
    statement: `<p>Turn this into CARL: "Once I deleted something in production, I think a table, it was a bad day, everyone was upset, but we got it back mostly, and I was more careful after."</p>`,
    example: `<p>Context: dropped a staging-named table in production. Learning: separate credentials.</p>`,
    weak: 'The original: vague, no numbers, no ownership of the fix, no concrete change.',
    mcq: { q: 'What makes a failure story strong?', options: ['It was not really a failure', 'You own the mistake, fix it, and change a process', 'You blame the tool'], answer: 1, explain: 'Ownership plus lasting change is the signal.' },
    hints: ['Hint 1: state the mistake plainly.', 'Hint 2: show the first 30 minutes of response.', 'Hint 3: the learning must be a visible change.'],
    approach: `<p><b>Model CARL answer (fictional).</b> "<b>Context:</b> Two years ago, while cleaning up test data, I ran a delete script against the production database instead of staging, because both shells looked alike. It removed about 1,200 customer notes. <b>Action:</b> I stopped immediately, told my manager within five minutes, and asked the DBA to restore from the last backup. While that ran, I listed which records were affected so support could warn customers. I wrote the incident review the same day without blaming anyone. <b>Result:</b> 1,150 of the notes were restored within 90 minutes; 50 newer ones I re-created from support logs. No customer left. <b>Learning:</b> I changed three things: production credentials now need a separate login, our shell prompt shows the environment in red, and destructive scripts require a dry-run flag. The team has had no similar incident since."</p><p>It is honest, quantified, shows fast escalation and ends with a process change that others benefit from.</p>`
  }));
  practice.push(P({
    title: 'Pick the story: 12 questions, 8 stories', level: 'Medium', tags: ['story bank'],
    statement: `<p>Given the 8 stories from the story bank topic, choose which one you would tell for: (1) a time you disagreed with your manager, (2) a time you learned fast, (3) a project you are proud of, (4) a time you handled unclear requirements, (5) a mistake you made. Give a second choice for each and explain the angle you would take.</p>`,
    example: `<p>(1) Story 8 (pushed back on date); backup: Story 2.</p>`,
    weak: 'Telling the Billing queue story for all five. The interviewer hears repetition and the angle never matches.',
    mcq: { q: 'Why have a second choice for each theme?', options: ['To tell both', 'To avoid repeating a story across interviewers in one loop', 'No reason'], answer: 1, explain: 'Interviewers compare notes.' },
    hints: ['Hint 1: match theme to the hero of each story.', 'Hint 2: pick the angle: what part of the story to stress.', 'Hint 3: rotate across the loop.'],
    approach: `<p><b>Model answer.</b> (1) <b>Manager disagreement</b>: Story 8 (pushed back on date); angle: I brought data (estimates, risks), proposed a reduced scope, and kept the relationship. Backup: Coupon rewrite (a peer, but similar skill). (2) <b>Learned fast</b>: Story 6 (Learning Kafka); angle: how I structured learning (docs, a prototype, asking a senior for 30 minutes). Backup: Story 3 (Migration outage), where I learned database locking afterwards. (3) <b>Proud</b>: Story 1 (Billing queue); angle: measurable result and teamwork. Backup: Story 7 (Support dashboard), user love. (4) <b>Ambiguity</b>: Story 5 (Vague search task); angle: how I asked questions, defined success metrics and shipped a first slice. Backup: none, so I would write a second ambiguity story this week. (5) <b>Mistake</b>: Story 3 (Migration outage) in CARL; backup: write a smaller mistake story.</p><p>Across a loop, I would assign stories so that no two interviewers hear the same one: for example Billing queue for the hiring manager, Pushback for the bar-raiser.</p>`
  }));
  practice.push(P({
    title: 'Answer the recruiter screen', level: 'Medium', tags: ['recruiter', 'communication'],
    statement: `<p>Write model answers for: (1) "Why are you looking to leave?" (2) "Why our company?" (3) "What are your salary expectations?" (4) "Do you have other offers or processes?" Keep each under 30 seconds and honest.</p>`,
    example: `<p>(1) Positive and forward-looking, never badmouth.</p>`,
    weak: '"My manager is terrible and the pay is low, I want more money." Negative, vague, no direction.',
    mcq: { q: 'Best answer to "Why are you leaving?"', options: ['My boss is bad', 'I have grown a lot here and want a larger scope in payments', 'I do not know'], answer: 1, explain: 'Pulled toward something, not pushed away.' },
    hints: ['Hint 1: pull factors, not push factors.', 'Hint 2: show you researched the company.', 'Hint 3: for salary, ask for the band and give a range.'],
    approach: `<p><b>Model answers.</b> (1) "I've learned a lot in my current team and shipped some things I'm proud of. I'm looking for a larger scope in payments systems, which my current company doesn't offer." (2) "Two reasons: your team's engineering blog on settlement reliability matched the problems I enjoy, and the role has ownership of a whole service, which is the next step for me." (3) "I'd like to understand the level and total compensation band first. Based on my research for this role and city I'm looking at X to Y total; I'm flexible for the right fit. Could you share the range?" (4) "I'm in early conversations with two other companies; one is at the technical stage. This role is high on my list, and I'm happy to share my timeline so you can plan."</p><p>Principles: no negativity, honest facts, show homework, never lie about current salary or offers, and do not reveal confidential information from your employer. Keep answers short; the recruiter is checking communication and fit.</p>`
  }));
  practice.push(P({
    title: 'Audit an AI-polished resume for honesty', level: 'Hard', tags: ['AI', 'honesty', 'resume'],
    statement: `<p>A candidate pasted their resume into an AI tool and got back bullets such as "Spearheaded cross-functional initiatives that drove 300% efficiency gains" and "Architected a scalable microservices platform serving millions". The candidate actually fixed bugs in one service used by about 5,000 people. Explain what is wrong, how an interviewer will discover it, and how to rewrite honestly with AI as a helper.</p>`,
    example: `<p>Fabricated number (300%), inflated scope (millions), vague verbs (spearheaded).</p>`,
    weak: 'Submitting the AI text as-is. In the first follow-up ("how did you measure 300%?") the candidate has no answer.',
    mcq: { q: 'What is the right instruction to give an AI tool?', options: ['Make my resume impressive', 'Rewrite using only the facts and numbers I give; ask me when something is missing', 'Add typical metrics for my role'], answer: 1, explain: 'Constrain it to your facts.' },
    hints: ['Hint 1: list every claim and its source.', 'Hint 2: interviewers probe numbers and scale.', 'Hint 3: ask AI for wording, not for facts.'],
    approach: `<p><b>What is wrong.</b> (1) The 300% figure and "millions" have no source; they were invented by the tool. (2) "Spearheaded cross-functional initiatives" and "architected" are inflated verbs that hide what the person did. (3) The result sounds like every other AI-written resume, so recruiters discount it. (4) It risks serious damage: failing follow-ups, rejection, or a later dismissal if misrepresentation is found in a background check.</p><p><b>How it is found.</b> Interviewers ask "how did you measure 300%?", "which services, how many requests per second?", "who were the other teams?". The candidate cannot answer, and the loop turns into a "No hire" for honesty.</p><p><b>Honest rewrite with AI help.</b> Give the AI only true facts: "I fixed bugs in the invoice service used by about 5,000 customers; error rate went from 1.8% to 0.6% after I added input validation and tests; I wrote 40 tests." Prompt: "Rewrite as one impact bullet. Use only these facts. Do not add numbers." Result: "Cut invoice-service error rate from 1.8% to 0.6% for ~5,000 customers by adding input validation and 40 automated tests." It is smaller, but defensible and specific. Final step: I read each bullet aloud and make sure I can explain it for five minutes.</p>`
  }));
  practice.push(P({
    title: 'Build a story bank from scratch', level: 'Hard', tags: ['story bank', 'planning'],
    statement: `<p>You are a fresh graduate with one internship and two college projects. Describe how you would build 8 stories covering 12 themes, which source each story would come from, and how you would handle themes with no work example.</p>`,
    example: `<p>Teamwork: final-year group project; Failure: a missed demo deadline.</p>`,
    weak: '"I have no experience so I have no stories." Ignores college, clubs, open source and part-time work.',
    mcq: { q: 'For a fresher, which is a valid story source?', options: ['Only full-time jobs', 'Internships, projects, hackathons, clubs, part-time jobs', 'None'], answer: 1, explain: 'Signals matter, not job title.' },
    hints: ['Hint 1: brain-dump everything where you had to decide or deliver.', 'Hint 2: add stakes: deadline, teammates, users.', 'Hint 3: be honest about scale.'],
    approach: `<p><b>Model answer.</b> <b>Step 1, brain-dump:</b> internship tasks, two college projects, a hackathon, the coding club, a part-time tutoring job, an open source pull request, a group assignment that went badly. <b>Step 2, choose 8 with stakes:</b> (1) internship bug fix that unblocked a release (ownership), (2) group project conflict over design (conflict), (3) missed demo deadline in a project (failure), (4) learning React in a week for the hackathon (learning fast), (5) vague capstone requirements from a professor (ambiguity), (6) tutoring juniors in DSA (mentoring), (7) feedback from internship mentor on code quality (feedback), (8) hackathon placement (proud). <b>Step 3, STAR notes</b> with numbers: team size, hours, users, grades, performance change. <b>Step 4, map</b> to the 12 themes; leadership and manager disagreement may be thin, so use the club lead role and a disagreement with the mentor about an approach.</p><p>For themes with no example, I say honestly "I haven't had that exact situation at work, but here is the closest, from my project". I never invent a scenario; interviewers value honesty and clear thinking over a perfect fit. Then I rehearse each story aloud to 2 minutes.</p>`
  }));
  practice.push(P({
    title: 'Survive a hostile follow-up', level: 'Hard', tags: ['follow-ups', 'pressure'],
    statement: `<p>You told a story about cutting failed payments from 3.1% to 0.4%. The interviewer says: "That sounds like your team's work. What exactly was YOUR contribution? And how do I know the drop was because of your change?" Write a calm answer that holds up.</p>`,
    example: `<p>Specific personal actions + evidence the change caused the effect.</p>`,
    weak: 'Getting defensive ("I already said that") or repeating "we" and offering no evidence.',
    mcq: { q: 'Best first response to a skeptical follow-up?', options: ['Get defensive', 'Welcome it, give personal specifics and evidence', 'Change the story'], answer: 1, explain: 'It is a normal depth check, not an attack.' },
    hints: ['Hint 1: acknowledge the fair question.', 'Hint 2: list your own actions and decisions.', 'Hint 3: give evidence of causation: before/after, canary, control.'],
    approach: `<p><b>Model answer.</b> "That's a fair question. Four of us worked on payments, so let me separate my part. I found the root cause: I traced two days of logs and saw duplicate retries from our cron job. I wrote the design for idempotency keys and presented it to the payments team, where I handled the objection about extra storage. I implemented the queue consumer and the key check, and I ran the rollout behind a 5% canary. A teammate, Sam, built the dashboard and reviewed my code.</p><p>On causation: we rolled the change out gradually. The canary group showed 0.3% failures while the control group stayed at 3% over the same week, so the drop followed the change and not the traffic. After 100% rollout, it stayed at about 0.4% for the next two months, including the biggest sale of the year."</p><p>It works because it is calm, specific, separates my work from the team's with one clause of credit, and gives evidence rather than assertions. If I did not have that evidence, I would say what I do know and what I would measure next time. Honest uncertainty beats a confident invention.</p>`
  }));
  practice.push(P({
    title: 'Design a complete 6-week plan with mocks and referrals', level: 'Hard', tags: ['planning', 'referrals', 'mocks'],
    statement: `<p>Design a full prep strategy for a candidate targeting 10 companies, with 3 referrals available, a loop date in 6 weeks at the top choice, and two practice companies. Include the order of interviews, mock schedule, tracking sheet columns, the burnout plan, and the response if the top-choice date moves earlier by two weeks.</p>`,
    example: `<p>Practice companies first, top choice last; tracker has stage, date, feedback, next action.</p>`,
    weak: 'Applying to the dream company first, with no mocks, and no tracker; one bad day ends the chance.',
    mcq: { q: 'Why interview at practice companies first?', options: ['To waste their time', 'To get real loop practice before the top choice', 'To get offers you will decline'], answer: 1, explain: 'Real loops build calm and reveal weak spots.' },
    hints: ['Hint 1: order interviews by importance, ascending.', 'Hint 2: mocks are fixed calendar events.', 'Hint 3: plan the compressed version in advance.'],
    approach: `<p><b>Model strategy.</b> <b>Order:</b> use the two practice companies for loops in weeks 3-4, mid-priority companies in weeks 4-5, and the top choice in week 6. Cluster loops within about three weeks so offers arrive together for negotiation. <b>Referrals:</b> send the 3 referral requests in week 1 (resume attached, short note), using them for the top choice and two mid-priority roles; for the other companies apply directly and follow up with a recruiter message. <b>Tracker (a simple sheet):</b> company, role, level, referral Y/N, stage, next date, interviewers, questions asked, what went well, what to fix, follow-up date, offer details. <b>Mocks:</b> week 3 one behavioral mock; week 5 two full loop mocks, each followed by a 20-minute review and a fix list. <b>Burnout plan:</b> one fully free evening and one lighter weekend day every week, sleep at least 7 hours, stop new learning in the last 48 hours. <b>If the top-choice date moves two weeks earlier:</b> compress to a 4-week plan: keep resume, stories (6 instead of 8), top three coding patterns, one design, and two mocks; ask whether the practice-company interviews can be moved up; and ask the recruiter if a one-week delay is possible. A reasonable request for more time is common and not penalised.</p>`
  }));

  // ---------------- QUIZ ----------------
  quiz.push({ q: 'Which round is most likely to have people read your feedback without ever meeting you?', options: ['Recruiter screen', 'Hiring committee', 'Technical phone screen', 'Online assessment'], answer: 1, explain: 'The committee decides from written feedback packets.' });
  quiz.push({ q: 'In a 2-minute STAR answer, which part should be the longest?', options: ['Situation', 'Task', 'Action', 'Result'], answer: 2, explain: 'Action (about 50%) shows what you personally did.' });
  quiz.push({ q: 'Which bullet is strongest?', options: ['Responsible for the API', 'Worked on performance', 'Cut p95 latency from 820 ms to 310 ms by adding a Redis cache', 'Helped the team improve things'], answer: 2, explain: 'Verb, metric and method are all present.' });
  quiz.push({ q: 'Recommended resume length for a candidate with under 10 years of experience?', options: ['One page', 'Three pages', 'As long as needed', 'Half a page'], answer: 0, explain: 'One page forces focus on the strongest evidence.' });
  quiz.push({ q: 'What does CARL add compared to STAR?', options: ['A separate Learning step', 'A salary step', 'A longer Situation', 'Nothing'], answer: 0, explain: 'Context, Action, Result, Learning; ideal for failure and feedback questions.' });
  quiz.push({ q: 'A story bank should have at least how many candidate stories per common theme?', options: ['0', '1', '2', '10'], answer: 2, explain: 'Two lets you avoid repeating one story across interviewers.' });
  quiz.push({ q: 'Which formatting is most ATS-safe?', options: ['Two columns with a photo', 'Text inside images', 'One column, standard headings, selectable text', 'Tables for the skills section'], answer: 2, explain: 'Plain structure parses reliably.' });
  quiz.push({ q: 'You do not remember the exact metric from a past project. What should you do?', options: ['Invent a precise number', 'Give an honest estimate and say it is approximate', 'Refuse the question', 'Change the project'], answer: 1, explain: 'Honest approximation is fine; invented precision collapses in follow-ups.' });
  quiz.push({ q: 'The best way to use AI on your resume is to...', options: ['Let it add typical metrics', 'Rewrite wording using only your real facts and ask you for missing numbers', 'Copy its full output without reading', 'Let it list skills you do not have'], answer: 1, explain: 'AI helps with wording; the facts must be yours.' });
  quiz.push({ q: 'A bar-raiser is typically...', options: ['Your future teammate', 'A trained interviewer from another team who protects the hiring bar', 'A recruiter', 'An automated tool'], answer: 1, explain: 'They bring independent judgement and may dig deep into stories.' });
  quiz.push({ q: 'Roughly how many words is a 2-minute spoken answer?', options: ['50', '100', '270', '800'], answer: 2, explain: 'About 130-150 words per minute.' });
  quiz.push({ q: 'Which is the best reason to interview at lower-priority companies first?', options: ['To collect offers to decline', 'To get real loop practice before the top choice', 'Because recruiters demand it', 'To avoid mocks'], answer: 1, explain: 'Real practice builds calm and reveals weaknesses.' });

  // ---------------- INTERVIEW ----------------
  interview.push({ q: 'Tell me about yourself.', level: 'B', a: `<p>Use present, past, future in 60-90 seconds. Example: "I'm a backend engineer with four years at BrightCart, working on payments. Recently I led a queue migration that cut failed payments from 3.1% to 0.4%. Before that I built the coupon service and mentored two new joiners. I enjoy reliability problems, and I'm looking for a team with larger ownership - your payment infrastructure work fits that." Do not recite the resume or start from school. Choose facts that match the job, include one number, and end by connecting to the role.</p>`, followUps: ['Which of those projects was hardest?', 'What do you want to do in the next two years?'] });
  interview.push({ q: 'Why do you want to leave your current job?', level: 'B', a: `<p>Speak about what you are moving <b>toward</b>, not away from. "I've learned a lot and shipped things I'm proud of. I'm now looking for larger scope in payments systems, and the growth path here is limited in that area." Stay positive about the current employer even if it is difficult; criticism sounds like a future problem for the new team. If you were laid off, say it plainly and briefly, then talk about what you did since and what you want next.</p>`, followUps: ['Have you talked to your manager about this?', 'What would make you stay?'] });
  interview.push({ q: 'Why do you want to work here?', level: 'B', a: `<p>Give two specific reasons that show homework: a product or technical problem you like (for example a public engineering blog post, a product feature you use), and a fit with your skills or growth. Example: "Your post on idempotent settlement matched what I did on retries, and the role owns a full service, which is my next step." Avoid generic lines such as "great culture" or "big brand" alone. End with what you hope to contribute in the first six months.</p>`, followUps: ['What does our product do badly?', 'What do you know about our team?'] });
  interview.push({ q: 'Walk me through your resume.', level: 'B', a: `<p>This is a time-boxed narrative, not a reading. Spend about 20% on early career (one sentence), 60% on the last two roles with a headline result each, and 20% on why this role. Example for a recent role: "At BrightCart I own order reliability; the biggest result was cutting checkout errors 60% with idempotency keys." Pause at natural points so the interviewer can pick a thread. The real purpose is to give them 2-3 hooks to ask about, so choose hooks you have strong stories for.</p>`, followUps: ['Why did you leave your first job so quickly?', 'Explain this gap in your resume.'] });
  interview.push({ q: 'Tell me about a time you failed.', level: 'I', a: `<p>Use CARL. Pick a real failure with real impact and ownership, not a fake weakness. "I ran a delete script on production instead of staging, removing 1,200 notes. I told my manager within five minutes, helped restore from backup in 90 minutes, and wrote a blameless review. Afterwards we added separate production credentials, a red prompt showing the environment, and dry-run flags; no similar incident since." Good signals: honesty, fast escalation, no blame, lasting change. Bad signals: no real stakes, blaming others, or no learning.</p>`, followUps: ['What would you have done to prevent it?', 'How did your manager react?'] });
  interview.push({ q: 'Describe a conflict with a teammate and how you resolved it.', level: 'I', a: `<p>Choose a professional disagreement about work, not a personality attack. STAR: Dev and I disagreed on rewrite versus patch before a sale. I listened first, wrote both options and risks in a shared doc, proposed patch now and a scheduled rewrite after, and split the work. Result: shipped on time with zero coupon incidents and the rewrite began next month. Learning: write options down before debating. Show empathy, data and a shared goal; do not paint the other person as the villain.</p>`, followUps: ['What if Dev had refused the compromise?', 'Would you handle it differently now?'] });
  interview.push({ q: 'What is your greatest strength and weakness?', level: 'B', a: `<p>Strength: a skill backed by evidence. "I'm good at finding root causes in messy systems; for example I traced duplicate retries in two days of logs and removed 87% of payment failures." Weakness: a real, non-fatal one, with the steps you are taking. "I used to take too long to ask for help; now I time-box to 30 minutes and ask, which cut my blocked time on tickets noticeably." Avoid "I work too hard", and avoid weaknesses that are core to the role (for a coder, "I can't debug").</p>`, followUps: ['How does your manager describe this weakness?', 'Give a recent example of improving it.'] });
  interview.push({ q: 'What are your salary expectations?', level: 'I', a: `<p>Learn the level and band first: "I'd like to understand the level and total compensation range for this role. From my research I'm looking at X to Y total, depending on the full package. Could you share the band?" Give a range based on market data, not your current pay, and never lie about your current salary. Mention total compensation (base, bonus, equity) because comparing only base can mislead. Stay calm and flexible; detailed negotiation happens after you have an offer.</p>`, followUps: ['What if the budget is below your range?', 'Would you take lower pay for equity?'] });
  interview.push({ q: 'How do you structure answers to behavioral questions?', level: 'I', a: `<p>I use STAR (Situation, Task, Action, Result), with about 10/10/50/30 time shares, adding a learning line to the Result; for failure or feedback I use CARL. I set the scene in two sentences, say what I personally owned, spend most time on specific actions with "I", and end with a measurable result and what I changed afterwards. I keep each story to roughly two minutes, leaving room for follow-ups. I prepare a bank of about eight stories mapped to common themes so I can adapt the angle quickly.</p>`, followUps: ['How do you avoid sounding rehearsed?', 'What do you do when you blank on a question?'] });
  interview.push({ q: 'How did you prepare for this interview?', level: 'I', a: `<p>Show a method, not just effort: "I read the job post and your engineering blog, rewrote my resume around impact, built a bank of eight stories mapped to common themes, practised coding patterns daily, and did two mock loops with peers. I also prepared questions for you." If asked about AI, be honest: "I used AI tools to proofread and to generate practice questions; the stories, numbers and code are my own." This signals self-awareness, planning and honesty - all signals interviewers want to see.</p>`, followUps: ['What was the hardest part of preparing?', 'What did the mocks teach you?'] });
  interview.push({ q: 'Do you have any questions for us?', level: 'B', a: `<p>Always ask 2-3 good questions; "no questions" reads as low interest. Examples: "What does success look like in the first six months?", "What is the biggest technical challenge the team faces right now?", "How do engineers get feedback and grow here?", "What did the last person who excelled in this role do differently?" Avoid questions answered on the careers page, and avoid asking about pay or leave with an engineer interviewer (save it for the recruiter). Listen to the answer and respond; it is a two-way conversation.</p>`, followUps: ['Which answer would make you decline?', 'Who would you work with day to day?'] });
  interview.push({ q: 'Is every number on your resume real? Walk me through one.', level: 'A', a: `<p>Yes, and I can explain the source of each. For example, "Cut p95 latency from 820 ms to 310 ms": I took the baseline from our dashboard over the week before the change, deployed a Redis cache for hot queries behind a flag, and measured again over the following week at similar traffic. I note the caveats: the 310 ms is the p95 for read endpoints, and other endpoints improved less. If I only had an estimate, I say so. The goal is to show that the number is traceable and that I understand how it was measured.</p>`, followUps: ['How did you make sure traffic was comparable?', 'What would you measure next?'] });
  interview.push({ q: 'How do you use AI tools in your work and in preparing for interviews?', level: 'A', a: `<p>I use AI as an assistant, not an author. In prep I use it to proofread, generate mock questions and critique structure; I give it real facts and tell it not to invent numbers. At work I use it for drafts, tests and exploring options, but I review and verify everything, and I do not paste confidential data into public tools. I follow each interview's rules: if AI is not allowed in a round, I do not use it. The key is accountability - I can explain every line I submit and every claim on my resume.</p>`, followUps: ['Give an example where AI was wrong and you caught it.', 'How do you decide what to trust?'] });

  registerModule({
  langExplain: `<p><b>About the code here.</b> The few samples are optional Python helpers you can run in the page, such as a resume-bullet checker or a story-bank matrix. Nothing in the behavioural rounds depends on a programming language, so skip them if you like.</p>`,
    id: 'beh01',
    title: 'Interview Loops, Resume & the STAR Method',
    intro: `<p>This is the foundation module of the Behavioral & Career track. You will learn <b>how a product-company interview loop actually works</b> (online assessment, recruiter screen, phone screen, onsite rounds, bar-raiser, hiring committee) and what each stage writes down about you. Then you will build the two tools that every later module depends on: a <b>resume</b> whose bullets show impact, and a <b>story bank</b> of about eight STAR/CARL stories mapped to the 12 most common questions. We finish with a 6-week prep plan and an honest way to use AI. Everything is in plain words, with fictional examples you can copy the <i>shape</i> of, and your own real facts to fill in.</p>`,
    goals: [
      'Describe each stage of a product-company loop and the signals interviewers record in it',
      'Rewrite weak resume bullets into "Did X, measured by Y, by doing Z" impact bullets and format a one-page ATS-friendly resume',
      'Tell a 2-minute STAR or CARL story with the right time split and a measurable result',
      'Build a story bank of 8 stories mapped to 12 common themes and find your gaps',
      'Plan a 6-week prep timeline and critique a resume like a recruiter',
      'Use AI to polish and practise without fabricating anything'
    ],
    prereqs: `<p>No technical prerequisite. Have your own resume (even a rough one) and a list of your recent projects ready. You will get the most from this module if you write real answers, out loud and on paper.</p>`,
    hours: 8,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
