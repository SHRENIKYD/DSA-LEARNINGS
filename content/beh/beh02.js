(function () {
var topics = [], practice = [], quiz = [], interview = [];

var DIMS = ['Situation clarity', 'Personal action (I, not we)', 'Measurable result', 'Reflection'];

function li(a) { return '<ul>' + a.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; }

// ---------- visualizer builders (all data driven) ----------
function mkCompare(T) {
  return {
    title: 'Weak vs strong side by side: ' + T.short,
    gen: function () {
      var c = T.compare, frames = [];
      frames.push({ narr: 'Same question, two answers. On the left are phrases from the <b>weak</b> answer (red). On the right is the fix (green). We go one pair at a time.', parts: [{ type: 'text', html: '<b>Question:</b> ' + T.question }] });
      for (var i = 0; i < c.length; i++) {
        var weakRows = [], fixRows = [], hw = {}, hf = {};
        for (var j = 0; j <= i; j++) { weakRows.push([c[j][0], c[j][1]]); fixRows.push([c[j][2]]); hw[j] = 'bad'; hf[j] = 'ok'; }
        frames.push({
          narr: 'Pair ' + (i + 1) + ' of ' + c.length + ': the phrase <b>"' + c[i][0] + '"</b> hurts because ' + c[i][1].toLowerCase() + ' The fix is shown in green.',
          parts: [
            { type: 'table', label: 'WEAK answer: problem phrases', columns: ['Phrase said', 'Why it hurts'], rows: weakRows, hl: hw },
            { type: 'table', label: 'STRONG answer: the fix', columns: ['Say this instead'], rows: fixRows, hl: hf }
          ]
        });
      }
      frames.push({ narr: 'Pattern: the weak answer is vague, says "we", has no number and no lesson. The strong answer is specific, says "I", has a number and ends with what changed.', parts: [{ type: 'text', html: '<span class="c-r">Vague</span> + <span class="c-r">we</span> + <span class="c-r">no number</span> + <span class="c-r">no lesson</span> = forgettable.<br><span class="c-g">Specific</span> + <span class="c-g">I</span> + <span class="c-g">number</span> + <span class="c-g">lesson</span> = memorable.' }] });
      return frames;
    }
  };
}

function mkStar(T) {
  return {
    title: 'Build the strong answer step by step: ' + T.short,
    gen: function () {
      var L = T.labels || ['Situation', 'Task', 'Action', 'Result', 'Reflection'];
      var S = T.strong, keys = ['S', 'T', 'A', 'R', 'L'], frames = [], rows = [], words = 0;
      for (var k = 0; k < 5; k++) {
        rows.push([L[k], S[keys[k]], T.ann[keys[k]]]);
        words += S[keys[k]].split(/\s+/).length;
        var hl = {};
        for (var j = 0; j < k; j++) hl[j] = 'done';
        hl[k] = 'sel';
        frames.push({
          narr: 'Step ' + (k + 1) + ': <b>' + L[k] + '</b>. ' + T.ann[keys[k]],
          parts: [
            { type: 'queue', label: 'Answer sections', items: L.slice(), frontLabel: 'start', backLabel: 'end', hl: (function () { var h = {}; h[k] = 'cur'; return h; })() },
            { type: 'table', label: 'Strong answer so far', columns: ['Part', 'What you say', 'What the listener hears'], rows: rows.slice(), hl: hl }
          ]
        });
      }
      frames.push({ narr: 'Whole answer is about <b>' + words + ' words</b>, which is roughly <b>' + Math.round(words / 150 * 60) + ' seconds</b> at 150 words per minute. That is the sweet spot.', parts: [{ type: 'vars', label: 'Timing', vals: { words: words, seconds: Math.round(words / 150 * 60), target: '60-120 s' }, hl: { seconds: 'ok' } }] });
      return frames;
    }
  };
}

function mkRubric(T) {
  return {
    title: 'Rubric scores: weak vs strong (' + T.short + ')',
    gen: function () {
      var w = T.weakScores, s = T.strongScores, frames = [];
      frames.push({ narr: 'Scoring rubric: each dimension 0 to 5. Weak answer first.', parts: [{ type: 'bars', label: 'WEAK answer scores', values: w, texts: w.map(String), idxLabels: ['Sit', 'Act', 'Res', 'Ref'] }] });
      frames.push({ narr: 'Now the strong answer. Notice how the biggest jumps are in <b>personal action</b> and <b>measurable result</b>.', parts: [{ type: 'bars', label: 'STRONG answer scores', values: s, texts: s.map(String), idxLabels: ['Sit', 'Act', 'Res', 'Ref'], hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok' } }] });
      for (var i = 0; i < 4; i++) {
        var h = {}; h[i] = 'cur';
        frames.push({ narr: '<b>' + DIMS[i] + '</b>: weak ' + w[i] + ' vs strong ' + s[i] + '. ' + T.rubricNotes[i], parts: [{ type: 'bars', label: 'Weak then strong for ' + DIMS[i], values: [w[i], s[i]], texts: [String(w[i]), String(s[i])], idxLabels: ['weak', 'strong'], hl: { 0: 'bad', 1: 'ok' } }, { type: 'bars', label: 'Strong answer, all dimensions', values: s, hl: h, idxLabels: ['Sit', 'Act', 'Res', 'Ref'] }] });
      }
      var tw = w.reduce(function (a, b) { return a + b; }, 0), ts = s.reduce(function (a, b) { return a + b; }, 0);
      frames.push({ narr: 'Totals: weak <b>' + tw + '/20</b>, strong <b>' + ts + '/20</b>. Most companies want 15+ for a "hire" signal.', parts: [{ type: 'vars', vals: { weak_total: tw + '/20', strong_total: ts + '/20' }, hl: { strong_total: 'ok', weak_total: 'bad' } }] });
      return frames;
    }
  };
}

function mkConvo(T) {
  return {
    title: 'The conversation with follow-ups: ' + T.short,
    gen: function () {
      var f = T.follow, items = [], frames = [];
      items.push('Q: ' + T.question);
      frames.push({ narr: 'The interviewer asks the main question.', parts: [{ type: 'queue', label: 'Conversation', items: items.slice(), frontLabel: 'first', backLabel: 'latest', hl: { 0: 'cur' } }] });
      items.push('A: (your 90-second STAR answer)');
      frames.push({ narr: 'You give the structured answer. Then the interviewer <b>digs</b>, which is where most people get caught.', parts: [{ type: 'queue', label: 'Conversation', items: items.slice(), frontLabel: 'first', backLabel: 'latest', hl: { 1: 'ok' } }] });
      for (var i = 0; i < f.length; i++) {
        items.push('Q: ' + f[i][0]);
        var h1 = {}; h1[items.length - 1] = 'cur';
        frames.push({ narr: 'Follow-up ' + (i + 1) + ': <b>' + f[i][0] + '</b><br>They are testing: ' + f[i][2], parts: [{ type: 'queue', label: 'Conversation', items: items.slice(), frontLabel: 'first', backLabel: 'latest', hl: h1 }] });
        items.push('A: ' + f[i][1]);
        var h2 = {}; h2[items.length - 1] = 'ok';
        frames.push({ narr: 'A good reply: ' + f[i][1], parts: [{ type: 'queue', label: 'Conversation', items: items.slice(), frontLabel: 'first', backLabel: 'latest', hl: h2 }] });
      }
      return frames;
    }
  };
}

function mkSteps(T) {
  return {
    title: T.stepsTitle,
    gen: function () {
      var st = T.steps, n = st.length, nodes = [], edges = [], frames = [];
      var xs = [12, 50, 88, 88, 50, 12];
      var ys = [12, 12, 12, 46, 46, 46];
      for (var i = 0; i < n; i++) nodes.push({ id: 'n' + i, label: st[i][0], x: xs[i], y: ys[i], shape: 'box', w: 24 });
      for (var j = 0; j < n - 1; j++) edges.push(['n' + j, 'n' + (j + 1)]);
      for (var k = 0; k < n; k++) {
        var hl = {}, ehl = {};
        for (var a = 0; a < k; a++) { hl['n' + a] = 'done'; if (a < k) ehl['n' + a + '-n' + (a + 1)] = 'ok'; }
        hl['n' + k] = 'cur';
        frames.push({ narr: 'Step ' + (k + 1) + ': <b>' + st[k][0] + '</b>. ' + st[k][1], parts: [{ type: 'graph', label: T.stepsLabel, directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl }] });
      }
      frames.push({ narr: 'Done. ' + T.stepsEnd, parts: [{ type: 'text', html: T.stepsEnd }] });
      return frames;
    }
  };
}

function build(T) {
  var L = T.labels || ['Situation', 'Task', 'Action', 'Result', 'Reflection'];
  var ann = ['S', 'T', 'A', 'R', 'L'].map(function (k, i) { return [L[i], T.strong[k], T.ann[k]]; });
  var cmp = T.compare.map(function (r) { return ['<span class="c-r">' + r[0] + '</span>', r[1], '<span class="c-g">' + r[2] + '</span>']; });
  var explain = T.explain +
    '<h4>What interviewers are really testing</h4>' + li(T.testing) +
    '<h4>Red flags</h4>' + li(T.red) +
    '<h4>WEAK sample answer</h4><blockquote>' + T.weak + '</blockquote><p><b>Why it fails:</b></p>' + li(T.weakWhy) +
    '<h4>STRONG sample answer, with annotations</h4>' + H.table(['Part', 'What you say', 'Annotation'], ann) +
    '<h4>Weak phrase to fix, side by side</h4>' + H.table(['Weak phrase', 'Why it hurts', 'Fix'], cmp) +
    '<h4>Follow-up questions interviewers ask</h4>' + li(T.follow.map(function (f) { return '<b>' + f[0] + '</b> (they test: ' + f[2] + ')'; }));
  var t = {
    title: T.title, analogy: T.analogy, explain: explain, clues: T.clues,
    viz: [mkCompare(T), mkStar(T), mkRubric(T), mkConvo(T), mkSteps(T)],
    examples: T.examples, deepDive: T.deepDive, aiEra: T.aiEra, problems: T.problems
  };
  if (T.code) { t.code = T.code; t.codeTitle = T.codeTitle; }
  return t;
}

// compact problem builder for behavioral prompts
function pr(o) {
  return {
    title: o.title, level: o.level, tags: o.tags, companies: o.companies || ['Fernwood Labs', 'Brightcart'],
    statement: '<p>The interviewer says: <b>"' + o.q + '"</b></p><p>' + o.ctx + '</p>',
    constraints: 'Speak for 90 to 120 seconds. Use STAR. Say "I" for your own actions. Include one number. End with one lesson. Use a real story of your own: the sample uses fictional people.',
    example: '<p><b>Listen for:</b> ' + o.listen + '</p>',
    brute: { why: '<p><b>Weak answer:</b> ' + o.weak + '</p><p><b>Why it fails:</b> ' + o.why + '</p>' },
    mcq: o.mcq,
    hints: o.hints.map(function (h) { return h.length < 70 ? h + ' Keep it short, specific and honest, and say it aloud once to test it.' : h; }),
    solution: {
      approach: '<p>' + o.strong + '</p>',
      complexity: '<p>Aim for about ' + (o.secs || 100) + ' seconds (' + Math.round((o.secs || 100) * 2.5) + ' words). Score it on the 4-part rubric: situation clarity, personal action, measurable result, reflection.</p>',
      followUps: o.follow
    }
  };
}
// ===================== TOPIC 1: Tell me about yourself =====================
topics.push(build({
  short: 'Tell me about yourself',
  title: 'Tell Me About Yourself: Present, Past, Future in 90 Seconds',
  question: 'Tell me about yourself.',
  labels: ['Present (who I am now)', 'Past (how I got here)', 'Proof (one highlight)', 'Future (why this role)', 'Hook (what to ask next)'],
  analogy: '<p>Think of the trailer for a movie. A good trailer does not retell the whole film. It shows who the hero is, a taste of the best scene, and why you should buy a ticket. "Tell me about yourself" is <b>your trailer</b>: 90 seconds, the best parts only, ending with "come and see the rest".</p>',
  explain: '<p>This is almost always the <b>first</b> question, so it sets the mood for the whole interview. Most people ramble through their life story (school, first job, second job...) or recite the resume. Both bore the listener.</p><p>Use the <b>Present, Past, Future</b> shape:</p><ol><li><b>Present:</b> who you are today (role, years, what you own). 20 seconds.</li><li><b>Past:</b> 1 or 2 steps that explain how you got here, plus one proof point with a number. 40 seconds.</li><li><b>Future:</b> what you want next and why <i>this</i> company or role fits. 20 seconds.</li></ol>' + H.table(['Block', 'Seconds', 'Words (150 wpm)', 'Content'], [['Present', '20', '~50', 'Title, years, domain, what you own'], ['Past', '40', '~100', 'Path + one result with a number'], ['Future', '20', '~50', 'What you want + why here'], ['Total', '80-90', '~200-225', 'Ends with a hook']]) + '<p>The <b>hook</b> is a last sentence that makes them curious, like "the migration is a story I am happy to go deeper on".</p>',
  testing: ['Can you communicate clearly and briefly? (This is your first communication sample.)', 'Do you know what is important about your own career? (Self-awareness and focus.)', 'Is there a believable story that leads to this role? (Motivation and fit.)', 'Where should they dig next? (You are steering the interview with a hook.)'],
  red: ['Starting from childhood or high school.', 'Reading the resume line by line.', 'Going over 3 minutes, or under 20 seconds.', 'Zero numbers or concrete results.', 'Complaining about the old job or boss.', 'Not mentioning the company or role at all.'],
  weak: 'Um, so I was born in a small town and I always liked computers. Then I did my B.Tech, then I joined a company where we worked on different things like Java and some SQL and also some front-end. After that I moved to another company, we did a lot of projects. I like learning new things and I am a team player and hard working. So yeah, that is me. I am looking for a good opportunity to grow.',
  weakWhy: ['Starts too early (childhood), so the best part never arrives.', 'No role, no years, no result: "different things" and "a lot of projects" are fog.', 'Clich&eacute;s ("team player", "hard working") say nothing a listener can check.', 'No reason for <i>this</i> job. "A good opportunity to grow" fits any company.', 'Ends with "So yeah", no hook, so the interviewer has nothing to ask.'],
  strong: {
    S: 'I am a backend engineer with four years of experience, currently on the payments team at Fernwood Labs, where I own the refund service that handles about 40,000 refunds a day.',
    T: 'I started in a small startup building mobile APIs, which taught me to ship fast. Then I moved to payments because I wanted to work where correctness matters more than speed.',
    A: 'Last year I led the redesign of our refund retry logic. I replaced a cron job with an event queue, and failed refunds dropped from 3.1% to 0.4%, which saved the support team about 60 hours a month.',
    R: 'Now I want a role with more design ownership and a bigger scale, which is why this platform team interests me: you run payments for many merchants, not just one.',
    L: 'The retry redesign had some tricky trade-offs around ordering, so I would be glad to go deeper on that.'
  },
  ann: {
    S: 'Present: title, years, team and one scale number in one sentence. The listener now has a mental picture.',
    T: 'Past: only two steps, each with a reason. A reason turns a list into a story.',
    A: 'Proof: one result with a number (3.1% to 0.4%). "I led" tells them your part. Pick the story closest to the role.',
    R: 'Future: connects what you want to what THIS company does. Shows you read about them.',
    L: 'Hook: plants a topic you are strong in. Interviewers often follow it, so you choose the next question.'
  },
  compare: [
    ['I was born in a small town', 'Starts too early and wastes your best 20 seconds.', 'I am a backend engineer with four years of experience on a payments team.'],
    ['different things like Java and some SQL', 'Vague list; nothing to remember.', 'I own the refund service, about 40,000 refunds a day.'],
    ['we did a lot of projects', 'No number, no personal ownership.', 'I led the retry redesign; failures dropped from 3.1% to 0.4%.'],
    ['I am a team player and hard working', 'Clich&eacute;. Anyone can say it.', 'Show it: I paired with two junior engineers to ship it in six weeks.'],
    ['a good opportunity to grow', 'Fits any company; shows no research.', 'I want to work on payments for many merchants, which is what your platform team does.'],
    ['So yeah, that is me', 'No hook; the interviewer has no next question.', 'I would be glad to go deeper on the ordering trade-offs.']
  ],
  weakScores: [1, 1, 0, 1], strongScores: [5, 4, 5, 4],
  rubricNotes: ['Weak never says role or years; strong gives both in one sentence.', 'Weak says "we did"; strong says "I led" and "I replaced".', 'Weak has zero numbers; strong has 40,000 refunds, 3.1% to 0.4%, 60 hours.', 'Weak has no lesson; strong shows a motive for each move and a goal for the next one.'],
  follow: [
    ['Why did you leave your first job?', 'Say it positively: "I had learned what a small team could teach me and I wanted to work where correctness matters." Never blame the boss.', 'professionalism and motivation'],
    ['Tell me more about the retry redesign.', 'Move into a STAR: problem (cron missed retries), my part (event queue design), result (0.4%).', 'whether the hook was real and you really did it'],
    ['Why are you looking now?', 'Name a pull, not a push: "I have outgrown the scope I can own and your platform has the scale I want."', 'motivation and commitment'],
    ['Where do you see yourself in five years?', 'A direction, not a title: "Owning the design of a core service and mentoring others."', 'ambition and realism']
  ],
  stepsTitle: 'The Present, Past, Future flow',
  stepsLabel: 'Pitch flow',
  steps: [['Present', 'Role, years, one scale number. 20 s.'], ['Past', 'How you got here: two steps with reasons. 25 s.'], ['Proof', 'One result with a number. 20 s.'], ['Future', 'What you want and why this company. 15 s.'], ['Hook', 'One teaser line so they ask the next question. 5 s.']],
  stepsEnd: 'Five moves, about 85 seconds. Stop talking after the hook and smile.',
  clues: ['"Tell me about yourself" / "Walk me through your resume" / "Introduce yourself"', '"Start from wherever you like" (they want a focused story, not an autobiography)', 'It is the very first question: the first 30 seconds set their opinion of your communication', '"Why are you here today?" is the same question in disguise', 'A recruiter screen of 20 minutes means the answer must be under 90 seconds'],
  examples: [
    { title: 'New grad version (no job yet)', html: '<p>"I just finished my CS degree at Hillcrest University. For my final project I built a bus-tracker app with a team of four; I wrote the backend and cut API response time from 900 ms to 220 ms. I also interned at a small logistics firm. I am looking for my first full-time role where I can learn from strong engineers on a product used by real people, which is why your team stood out."</p><p>Notice: project and internship replace years of experience. The shape is the same.</p>' },
    { title: 'Career changer version', html: '<p>"I spent five years as a mechanical engineer at Brightbridge, where I wrote scripts to analyse test data. I enjoyed the scripts more than the tests, so I built a tool the whole team adopted and then moved into software full time two years ago. Now I am a backend engineer who understands hardware constraints, which suits your IoT platform."</p><p>The "past" part turns an odd path into a strength.</p>' },
    { title: 'Senior engineer version (tailored to a 30-minute chat with a hiring manager)', html: '<p>"I am a staff-level engineer, eight years in, now leading a team of six on search at Orchard Cloud. Over the last two years we took p95 query latency from 800 ms to 180 ms while traffic tripled, mostly by redesigning the index sharding. Before that I was an individual contributor in ads. I am looking for a role where I can set technical direction across several teams, which your platform reorg describes. Happy to go deeper on the sharding decisions."</p><p>Seniors should include scope (team size, traffic) and influence, not just tasks.</p>' }
  ],
  deepDive: '<p><b>What senior interviewers listen for:</b> (1) <i>Selection</i>: you chose what to leave out. Cutting is a leadership skill. (2) <i>A thread</i>: each move has a "because" that links to the next, so the career looks intentional. (3) <i>Scope growth</i>: team of one, then a service, then several teams. (4) <i>Fit with the job description</i>: you read it and echo two or three of its needs. (5) <i>Calibrated confidence</i>: facts with numbers, no bragging adjectives.</p><p><b>Tailor in 10 minutes:</b> highlight 3 lines from the job post, then choose the one past project that matches them best. Keep a 30-second, 90-second and 3-minute version. Use the 30-second one for a busy recruiter and the 3-minute one when they say "take your time".</p><p><b>Delivery:</b> speak at 130 to 150 words per minute. Pause at the end of each block. Do not memorise word-for-word. Memorise the five beats and the numbers.</p><p><b>Remote interviews:</b> look at the camera on the hook line. It makes the last sentence land.</p>',
  aiEra: '<p><b>What AI changes:</b> Interviewers now hear many answers that sound smooth and generic, polished by a chatbot. A perfect but empty pitch is easier to spot than a rough but real one. Specific numbers and small odd details are your proof that it is yours.</p><p><b>Use AI as a partner:</b> Paste the job post and your resume and ask: <code>Ask me "tell me about yourself" as a tough recruiter. Do not write my answer. After I answer, tell me my word count, whether I included a number, and what you would ask next.</code> Repeat five times with a different style each time (friendly, rushed, skeptical).</p><p><b>Do not sound scripted:</b> Record yourself, then practise from <i>five bullet beats</i>, not a script. If you notice the same sentence twice in a row, change it. Ask the AI interviewer to interrupt you mid-answer, because real people do.</p><p><b>What you must still own:</b> the true story, the number you can defend, and the hook you can deliver without notes.</p>',
  problems: [pr({
    title: 'Tell me about yourself (mid-level engineer)', level: 'Easy', tags: ['intro', 'present-past-future'],
    q: 'Tell me about yourself.', ctx: 'This is minute one of a 45-minute loop with a hiring manager. The role is a backend engineer on a payments platform.',
    listen: 'Role and years in the first sentence, one number, a reason for the job change, a link to the target role, and a hook.',
    weak: 'I did my degree, joined a company, worked on many projects, and now I want a new challenge.',
    why: 'No role, no numbers, no reason, and "new challenge" fits every company.',
    strong: 'I am a backend engineer with four years of experience, on the payments team at Fernwood Labs, where I own the refund service handling about 40,000 refunds a day. Before that I worked at a small startup on mobile APIs, which taught me to ship fast, and I moved to payments because I wanted correctness to matter more than speed. Last year I redesigned our refund retry logic using an event queue, and failed refunds dropped from 3.1 percent to 0.4 percent. Now I want to work on payments for many merchants, which is exactly what your platform team does. The retry redesign had interesting ordering trade-offs, so I would be happy to go deeper on it.',
    hints: ['Hint 1: Three blocks only: present, past, future.', 'Hint 2: Put one metric in the middle block and one company-specific reason in the last.', 'Hint 3: Write five bullets, time yourself at 150 words per minute, and end on a hook sentence.'],
    mcq: { q: 'What is the best ending for "tell me about yourself"?', options: ['"So yeah, that is me."', 'A link to this role plus a hook to a story you can tell', 'A list of your hobbies', 'Asking them to read your resume'], answer: 1, explain: 'A link to the role shows fit; a hook steers the next question to your strongest ground.' },
    follow: ['Make a 30-second version for a busy recruiter.', 'What do you drop when the role is more front-end?'], secs: 85
  })]
}));

// ===================== TOPIC 2: Conflict with a teammate =====================
topics.push(build({
  short: 'Conflict with a teammate',
  title: 'Conflict With a Teammate: Calm, Curious, Concrete',
  question: 'Tell me about a time you had a conflict with a teammate.',
  analogy: '<p>Two cooks share one kitchen and want different ways to make the sauce. The bad outcome is a shouting match, or one cook quietly walking off. The good outcome is both cooks tasting both sauces and agreeing on what the <b>customer</b> will like. Conflict stories are about showing you can share the kitchen.</p>',
  explain: '<p>Interviewers do not want a story where there was no conflict ("I never fight with anyone"). That sounds untrue. They want a <b>real disagreement</b> that you handled like an adult.</p><p>A good conflict story moves through five calm steps: <b>notice the feeling, pause, talk privately, listen first, agree on the shared goal</b>. Then you pick the option with evidence, and follow up so it stays fixed.</p>' + H.table(['Step', 'Plain words', 'Sample line'], [['1. Notice', 'Spot your own anger early', '"I felt annoyed after the third rejected review."'], ['2. Pause', 'Do not reply while heated', '"I waited until the next morning."'], ['3. Private talk', 'Never in front of the team', '"I asked for 20 minutes, just us."'], ['4. Listen', 'Ask, then repeat what you heard', '"So your worry is the deadline, not the design?"'], ['5. Shared goal', 'Find the thing you both want', '"We both want a safe launch on the 12th."'], ['6. Decide + follow up', 'Pick with evidence; check in later', '"We tried both for a day and measured."']]) + '<p>Pick a conflict that is <b>medium-sized</b>: real enough to matter, not a scandal. Make the teammate sound like a reasonable person with a different priority, never a villain.</p>',
  testing: ['Emotional maturity: do you stay calm and curious?', 'Do you go to the person directly instead of complaining to others?', 'Can you see the other side and name it fairly?', 'Did the outcome improve the work or the relationship, with evidence?', 'Would you be pleasant to work with when things get tense?'],
  red: ['Painting the teammate as lazy, stupid or evil.', '"I went to my manager right away" without trying to talk first.', '"I won" with no sign of listening.', 'A story where you gave in and resent it.', '"I have never had a conflict."', 'Using "we" so the interviewer cannot see your role.'],
  weak: 'There was this guy on my team, Marcus, who was very lazy and did not follow the coding standards. He kept pushing messy code. I told my manager he was a problem and she talked to him. After that he was better. So I think the lesson is that you must tell the manager early when people do not do their job.',
  weakWhy: ['Blames and labels ("lazy") with no evidence.', 'Skips the direct conversation, which is what the question is testing.', 'No numbers: how messy? What changed?', 'The lesson ("tell the manager early") shows poor ownership.', 'No empathy: we never learn why Marcus acted that way.'],
  strong: {
    S: 'At Fernwood Labs I was building a search filter with Marcus Hale, a teammate. Three of my code reviews on his pull requests went back and forth for a week, and the release was in ten days.',
    T: 'I needed us to agree on one review standard without hurting the relationship, because we would work together for months.',
    A: 'I noticed I was getting irritated, so I did not reply in the thread. I asked Marcus for 20 minutes in private. I listened first and learned he thought my comments were nit-picks that blocked him, while I thought his missing tests were risky. We agreed our shared goal was a safe release. I proposed that I mark comments "must fix" or "optional", and he added tests for payment paths only. I wrote the rule in our team doc.',
    R: 'Review time dropped from 3.2 days to 1.1 days, we shipped on time, and Marcus later asked me to review his design doc.',
    L: 'I learned that most conflicts are two different fears, not two different people. Now I ask "what are you worried about?" before I argue.'
  },
  ann: {
    S: 'Names the person without blame and states the stakes (ten days). Short and neutral.',
    T: 'Shows the goal is the relationship AND the work. Interviewers like both.',
    A: 'The core: pause, private talk, listen, shared goal, specific proposal. Every verb is "I" yet fair to Marcus.',
    R: 'Two numbers (3.2 to 1.1 days) plus a relationship signal (he asked me to review).',
    L: 'A transferable habit. Not "I was right", but "I now ask about worries first".'
  },
  compare: [
    ['very lazy', 'A label with no evidence; sounds like blaming.', 'He was under deadline pressure and skipped tests on some PRs.'],
    ['I told my manager he was a problem', 'You skipped the direct conversation.', 'I asked Marcus for 20 minutes in private first.'],
    ['After that he was better', 'No measurable result.', 'Review time fell from 3.2 days to 1.1 days.'],
    ['We argued about it a lot', '"We" hides what you did.', 'I paused, then listened and repeated back his concern.'],
    ['The lesson is to tell the manager early', 'Shows no ownership and avoids the person.', 'The lesson: ask "what are you worried about?" before arguing.']
  ],
  weakScores: [2, 1, 0, 1], strongScores: [4, 5, 5, 4],
  rubricNotes: ['Weak gives a character label; strong gives dates, stakes and facts.', 'Weak action is "told the manager"; strong shows pause, private talk and a proposal.', 'Weak "he was better" cannot be checked; strong gives days saved.', 'Weak lesson avoids people; strong lesson improves how I handle people.'],
  follow: [
    ['What if he had refused to talk?', 'I would write a short, kind note with the facts and offer two time slots, and only involve the manager if the work was at risk, telling him first.', 'whether escalation is a last step, not a first one'],
    ['Did you ever feel he was right?', 'Yes: our old reviews were slow, and his point about nit-picks was fair. I changed my own habits too.', 'humility and balance'],
    ['What would you do differently?', 'Talk after the first rejected review, not the third. Waiting made both of us more annoyed.', 'real reflection'],
    ['How do you handle a conflict with someone senior?', 'Same steps, but I come with data and ask questions: "help me understand the trade-off".', 'respect for hierarchy without fear']
  ],
  stepsTitle: 'Emotion to action: de-escalation steps',
  stepsLabel: 'Conflict de-escalation',
  steps: [['Feel the heat', 'Notice irritation early. Name it to yourself.'], ['Pause', 'Do not reply while angry. Sleep on it or walk.'], ['Private talk', 'Ask for 20 minutes, one on one.'], ['Listen first', 'Ask what worries them. Repeat it back.'], ['Shared goal', 'Say the goal you both want out loud.'], ['Decide + follow up', 'Test options with evidence. Check in after a week.']],
  stepsEnd: 'Emotion goes in, a written agreement comes out. Pausing is the step most people skip.',
  clues: ['"Tell me about a time you disagreed with a coworker"', '"How do you deal with difficult people?"', '"Describe a time you had to work with someone you did not get along with"', '"A time you had to influence someone who did not report to you"', 'Follow-up "what did the other person say?" means they want both sides', 'Words like "difficult", "tension", "clash", "friction" all mean this bucket'],
  examples: [
    { title: 'Conflict about priorities', html: '<p>A designer, Mei, wanted a polish sprint; I wanted to fix a slow API. I asked her to show me the user complaint data, I showed my latency graph, and we agreed to split the sprint 60/40. Both of us had a fair share.</p><p>Why it works: data from both sides; a shared user goal.</p>' },
    { title: 'Conflict about credit', html: '<p>A teammate presented my idea at demo day without naming me. I did not fire off a message. I asked for a coffee, said "I would like us to share credit in demos going forward", and he apologised; he had been nervous and rushed.</p><p>Why it works: private, factual, non-accusing, with a forward-looking ask.</p>' },
    { title: 'A conflict you handled badly, then repaired', html: '<p>I once snapped at Omar in a stand-up. That night I felt bad, so the next day I said "I was sharp yesterday, sorry; the real issue is the deploy delays, can we talk about that?" We fixed the delays in a week.</p><p>Why it works: a flaw shown honestly plus a repair. Interviewers value this more than a spotless story.</p>' }
  ],
  deepDive: '<p><b>What senior interviewers listen for:</b> <i>how you treat the other person in the story</i>. If they are "an idiot" in your telling, they imagine your future teammates being described that way. They also listen for <i>separating the person from the problem</i> ("his tests" vs "his attitude"), for <i>interests behind positions</i> (the deadline fear behind "no tests"), and for <i>a durable fix</i> (a doc, a rule, a template) instead of a one-time truce.</p><p><b>Frameworks you may mention in one line:</b> "Seek first to understand" and "interests, not positions" from negotiation. Do not lecture; show it in your actions.</p><p><b>When escalation IS right:</b> safety, ethics, harassment, or repeated refusal that blocks delivery. Say "I told them first that I would raise it" to stay honest. Escalating with a calm summary is not weak; it is mature.</p><p><b>Pitfall:</b> picking a conflict where you were 100% right. Choose one where you changed something about yourself.</p>',
  aiEra: '<p><b>What AI changes:</b> Many conflicts now start in chat threads and AI-assisted code reviews where tone is flat or harsh. Interviewers may ask about conflicts with a teammate who "ships AI-generated code without reading it". Prepare one calm story about that: you asked for tests and an explanation, not for the tool to be banned.</p><p><b>Use AI as a partner:</b> Ask it to play the teammate: <code>Play Marcus, a busy engineer who feels my review comments are nit-picks. Stay in character. After 6 turns, give me feedback on whether I listened before proposing.</code> Practise the pause: read your message draft aloud, and ask AI only "does this sound blaming?"</p><p><b>Do not sound scripted:</b> Do not let AI write the dialogue. Keep one real quote from the real conversation. Real quotes cannot be faked.</p><p><b>What you must still own:</b> the timing of the talk, the empathy, and the follow-up that makes a fix last.</p>',
  problems: [pr({
    title: 'Conflict with a teammate over code reviews', level: 'Medium', tags: ['conflict', 'teamwork'],
    q: 'Tell me about a time you had a conflict with a teammate.', ctx: 'Panel interview for a platform team. They will ask "what did the other person think?" next.',
    listen: 'Private conversation, listening, shared goal, a measurable result, balance toward the teammate.',
    weak: 'My teammate was lazy and wrote messy code, so I told our manager and she fixed it.',
    why: 'Blames, skips the direct talk, no measurable result, and lacks reflection.',
    strong: 'At Fernwood Labs, my teammate Marcus and I were stuck in a week of back-and-forth code reviews, ten days before a release. I wanted a shared standard without damaging our relationship. I noticed I was irritated, so I waited a day and asked Marcus for 20 minutes in private. I listened first and learned he felt my comments were nit-picks that blocked him, while I worried about missing tests. We agreed our shared goal was a safe release on the 12th. I proposed labelling comments as must-fix or optional, and he added tests for payment paths. I wrote the rule in our team doc. Review time dropped from 3.2 days to 1.1 days, we shipped on time, and Marcus later asked me to review his design doc. I learned most conflicts are two worries, so I now ask what someone is worried about before I argue.',
    hints: ['Hint 1: Pick a medium conflict where the other person had a fair point.', 'Hint 2: Show the order: pause, private talk, listen, shared goal, specific change.', 'Hint 3: End with a number AND a changed habit of yours.'],
    mcq: { q: 'Which is the best FIRST action when a teammate keeps rejecting your pull requests?', options: ['Complain in the team channel', 'Tell the manager immediately', 'Ask for a private chat and listen to their concern', 'Stop asking for reviews'], answer: 2, explain: 'Direct, private, curious is the pattern interviewers want. Escalation comes later if talking fails.' },
    follow: ['What if the manager had to be involved?', 'What would you change in your own approach?'], secs: 105
  })]
}));
// ===================== TOPIC 3: Disagreement with manager =====================
topics.push(build({
  short: 'Disagreement with your manager',
  title: 'Disagreeing With Your Manager: Disagree and Commit',
  question: 'Tell me about a time you disagreed with your manager.',
  analogy: '<p>A ship has a captain, and a good navigator. If the navigator sees rocks ahead, they speak up clearly, with the chart in hand. But once the captain picks the route, the navigator sails it as if it were their own, and watches the rocks. That is <b>disagree and commit</b>: speak up loudly before the decision, pull together after it.</p>',
  explain: '<p>Interviewers ask this to learn two things at once: <b>do you have a spine</b> (will you say something is wrong?) and <b>are you easy to work with</b> (will you still follow a decision you lost?). The sweet spot is in the middle: respectful courage.</p><p>The pattern in four moves:</p><ol><li><b>Prepare:</b> bring data or a clear risk, not just a feeling.</li><li><b>Raise it privately:</b> "Can I share a concern about the plan?" Offer an alternative.</li><li><b>Let them decide:</b> they may have context you lack (budget, politics, customers).</li><li><b>Commit fully:</b> if the decision stands, support it with energy, and set a check-point to review the facts later.</li></ol>' + H.table(['Style', 'What it looks like', 'Interview verdict'], [['Silent yes-person', 'Agrees, then complains behind the back', '<span class="c-r">No courage</span>'], ['Loud fighter', 'Argues in public, keeps pushing after the decision', '<span class="c-r">Hard to manage</span>'], ['Disagree and commit', 'Data, private, decide, then full support', '<span class="c-g">Strong hire signal</span>']]) + '<p>"Disagree and commit" is a phrase well known from Amazon; use it naturally, but show it in the story rather than just naming it.</p>',
  testing: ['Do you give honest input, even upward, with respect?', 'Do you use data and customer impact rather than ego?', 'After losing the argument, do you truly commit?', 'Do you understand the manager has context you may not?', 'Could you be coached?'],
  red: ['"My manager was wrong and I proved it."', 'Going over the manager\'s head without telling them.', 'Quietly slowing the work after you lost.', 'A story with no real disagreement (just "I always agree").', 'Disrespect: "my boss does not understand tech".', 'Never checking later if the decision was right.'],
  weak: 'My manager wanted to use a new database for a project and I thought it was a bad idea. I told him in the meeting that it was a mistake and he did not listen. So I just did the work the way he said, and later it had problems and I told him I told you so. He did not like that, but I was right.',
  weakWhy: ['Public objection ("in the meeting") with no preparation.', 'No data and no alternative: just "bad idea".', '"I told you so" is the opposite of commitment.', 'No result for the team or customer; the story is about being right.', 'No reflection about what the interviewer would hire you for.'],
  strong: {
    S: 'On the checkout team at Brightcart, my manager Dana Ruiz decided to launch a new coupon feature in two weeks, skipping load testing to hit a sales event.',
    T: 'I was the engineer owning the coupon service, and I was worried a slow coupon call could stall checkout for every user.',
    A: 'I did not argue in the planning meeting. I ran a quick 2-hour test on staging and found p95 latency jumped from 120 ms to 900 ms at 5x traffic. I booked 15 minutes with Dana, showed the graph, and proposed a lighter option: cache the coupon rules and add a 200 ms timeout, which cost only two extra days. She listened, but chose to keep the date because the event could not move, and asked for the timeout only. I said I disagreed on the risk, but I would commit, and then I added the timeout, alerts and a rollback switch on my own.',
    R: 'On sale day, traffic hit 4x, the timeout fired for 0.6% of coupon calls, checkout stayed up, and we fixed the cache the following week. Dana later asked me to review risk on every launch.',
    L: 'I learned to bring data plus a cheaper alternative, and that committing fully, with safeguards, builds more trust than winning.'
  },
  ann: {
    S: 'Neutral facts: the manager\'s decision and the constraint (a sales event). It shows the manager was not foolish.',
    T: 'Your ownership and your specific worry: checkout stalls.',
    A: 'Private, data-driven, with an alternative. Notes the manager decided, then "I commit" and protects the launch.',
    R: 'Shows commitment worked: numbers (900 ms, 0.6%), plus higher trust from the manager.',
    L: 'Two takeaways: data plus alternative, and commit with safeguards. No "I was right".'
  },
  compare: [
    ['I told him in the meeting that it was a mistake', 'Public, unprepared challenge.', 'I raised it privately with a graph and an alternative.'],
    ['he did not listen', 'Blames the manager.', 'She listened and chose the date because the event could not move.'],
    ['So I just did the work', 'Passive; sounds resentful.', 'I said I disagree and commit, then added a timeout, alerts and a rollback switch.'],
    ['I told you so', 'Opposite of commitment.', 'We fixed the cache next week and I shared the results as a team win.'],
    ['I was right', 'Ego, not outcome.', 'Checkout stayed up with 4x traffic; the manager asked me to review risk on future launches.']
  ],
  weakScores: [2, 1, 0, 0], strongScores: [4, 5, 5, 4],
  rubricNotes: ['Weak does not say the stakes; strong says the sales event and checkout risk.', 'Weak argues in public; strong tests, shows data, proposes an alternative, then commits.', 'Weak has nothing measurable; strong has 120 to 900 ms and 0.6% timeouts.', 'Weak boasts; strong learns to bring options and commit with safeguards.'],
  follow: [
    ['What if your manager had been clearly wrong and the harm was serious?', 'If it were a safety, legal or major customer harm, I would escalate after telling my manager I planned to, with the evidence. For normal trade-offs I commit.', 'judgement about when commit is wrong'],
    ['Would you do anything differently?', 'Run the test a week earlier so the conversation was not so rushed, and invite Dana to the test.', 'reflection and timing'],
    ['How did the relationship change?', 'Better: she knew I would speak up with data and then deliver. She started asking for my view before decisions.', 'whether disagreement built trust'],
    ['Have you ever been wrong in such a disagreement?', 'Yes: I once opposed a rewrite that actually saved us a month. I said so openly and thanked the manager.', 'humility']
  ],
  stepsTitle: 'Disagree and commit: steps',
  stepsLabel: 'Disagree and commit',
  steps: [['Spot the risk', 'Something in the plan worries you.'], ['Get data', 'Run a quick test or find customer facts.'], ['Raise privately', 'Ask for 15 minutes. Offer an alternative.'], ['Manager decides', 'They may know things you do not.'], ['Commit fully', 'Support the decision with energy. Add safeguards.'], ['Review facts', 'Check results; share credit.']],
  stepsEnd: 'Voice before the decision, loyalty after it, a review at the end.',
  clues: ['"Tell me about a time you disagreed with your boss / lead / manager"', '"Have you ever pushed back on a decision?"', '"What do you do when you think leadership is wrong?"', '"Disagree and commit" (Amazon Leadership Principle: Have Backbone)', '"A time you had to follow a decision you did not agree with"', '"Tell me about a time you challenged the status quo"'],
  examples: [
    { title: 'Disagreement about scope', html: '<p>My manager wanted to add five features to a release. I laid out the team\'s capacity (6 engineers, 30 days) and proposed three features plus a stabilisation week. She cut it to four. I committed, and we shipped with only one small bug.</p><p>Why it works: capacity facts, a counter-offer, and a middle path she chose.</p>' },
    { title: 'Disagreement where you lost, and the manager was right', html: '<p>I opposed using a third-party login service because of vendor lock-in. My manager chose it to save two months. It worked well, and the lock-in never mattered. I told her she had made the right call.</p><p>Why it works: honest humility. Interviewers love "I was wrong".</p>' },
    { title: 'Disagreement that required escalation', html: '<p>A manager asked me to log customer emails in plain text for debugging. I said it broke our privacy policy, showed the policy page, and offered masked logs. When he still insisted, I told him I would ask the security lead, and I did. Masked logs were adopted.</p><p>Why it works: a clear ethical line, told to the manager first, escalated calmly.</p>' }
  ],
  deepDive: '<p><b>What senior interviewers listen for:</b> <i>do you understand decision rights?</i> Seniors know the manager (or tech lead) owns the call, and their job is to make it a well-informed call. They listen for <i>pre-wiring</i> (talking in 1:1s, not ambushing in meetings), for <i>reversible vs irreversible</i> decisions (you can commit faster on reversible ones), and for <i>tripwires</i> ("if p95 passes 500 ms we revisit"). That last one is a gem: it turns commit into a safe, measurable bet.</p><p><b>Language to borrow:</b> "Here is what worries me", "Here is what I would suggest", "I may be missing context", "If we go this way, I will make it work and here is what I will watch".</p><p><b>Level difference:</b> a junior shows courage to ask a question; a mid-level engineer brings data; a senior brings an alternative and a plan to de-risk; a staff engineer brings the org-level view (cost, team capacity, other teams).</p><p><b>Trap:</b> do not choose a disagreement about taste (tabs vs spaces). Choose one with customer, cost, risk or time at stake.</p>',
  aiEra: '<p><b>What AI changes:</b> Managers now push for AI-assisted speed ("let the assistant write it, ship by Friday"). A modern disagreement story might be: you worried about unreviewed AI code in a payment path, brought a small defect count, proposed a review gate, and committed to the faster plan on low-risk screens. That shows both backbone and flexibility.</p><p><b>Use AI as a partner:</b> <code>Play my manager who wants to skip load testing for a deadline. Push back with business reasons. Grade whether I used data, offered an alternative, and committed at the end.</code> Run it twice: once where you win, once where you lose, and practise the commit sentence both times.</p><p><b>Do not sound scripted:</b> Skip the polished phrase "I disagreed and committed" if it feels like a slogan. Say what you did: "I told her I still disagreed, and that I would make it work."</p><p><b>What you must still own:</b> the judgement of when to stop arguing, and the courage to say it kindly.</p>',
  problems: [pr({
    title: 'Disagree and commit with your manager', level: 'Medium', tags: ['manager', 'disagree-and-commit'],
    q: 'Tell me about a time you disagreed with your manager.', ctx: 'A hiring manager at a growth-stage company asks this. They will follow up with "and then what?".',
    listen: 'Private, data-led disagreement; manager decides; you commit with safeguards; result and learning.',
    weak: 'My manager chose a bad plan. I said so in the meeting. Later it failed and I told him I was right.',
    why: 'Public, no data, no alternative, no commitment, and "I told you so" damages trust.',
    strong: 'At Brightcart my manager Dana decided to launch coupons in two weeks without load testing, for a sales event. I owned the coupon service and feared checkout would stall. I did not argue in the meeting. I ran a two-hour staging test and found p95 latency rose from 120 ms to 900 ms at five times traffic. I booked 15 minutes with Dana, showed the graph, and proposed caching the rules plus a 200 ms timeout for two extra days. She kept the date but agreed to the timeout. I said I still disagreed on the risk but would commit, and I added alerts and a rollback switch. On sale day traffic hit 4x, the timeout fired for 0.6 percent of calls, and checkout stayed up. I learned to bring data and a cheaper alternative, and to commit fully.',
    hints: ['Hint 1: Choose a disagreement with real stakes: customer, cost, risk or time.', 'Hint 2: Show you went in private with data and an alternative.', 'Hint 3: Say the commit sentence out loud and what you did to make the decision succeed.'],
    mcq: { q: 'After your manager makes a final decision you disagree with, what should you do?', options: ['Slow-walk it to prove a point', 'Commit fully and add safeguards, keep an eye on the facts', 'Go to the director', 'Say "I told you so" if it fails'], answer: 1, explain: 'Disagree and commit means full effort after the decision. Escalation is only for serious harm.' },
    follow: ['What if the decision was unethical?', 'How do you disagree in a public meeting?'], secs: 110
  })]
}));

// ===================== TOPIC 4: Biggest failure =====================
topics.push(build({
  short: 'Biggest failure or mistake',
  title: 'Your Biggest Failure or Mistake: Ownership Plus Learning',
  question: 'Tell me about your biggest failure or a time you made a mistake.',
  analogy: '<p>Think of a pilot after a rough landing. The best pilots do not say "it was the wind". They say "I came in too fast, here is what I checked, here is the new checklist". Passengers (interviewers) trust the pilot who <b>owns the landing</b> and shows the checklist, not the one who says they never crash.</p>',
  explain: '<p>This question frightens people, but it is a gift. The interviewer already knows you have failed; everyone has. They are checking <b>how you behave when things go wrong</b>.</p><p>Use this shape: <b>real mistake, your part, how you fixed it, what changed afterwards.</b> Spend 25% on the failure and 75% on the fix and the learning.</p>' + H.table(['Type of answer', 'Example', 'Verdict'], [['Fake weakness', '"I work too hard and care too much."', '<span class="c-r">Humble-brag; eye roll</span>'], ['Blame shift', '"The requirements kept changing."', '<span class="c-r">No ownership</span>'], ['Disaster with no lesson', 'Deleted the database, shrug.', '<span class="c-r">Unsafe</span>'], ['Real, owned, fixed, prevented', 'Missed a bug, fixed it in 3 hours, added a test + checklist', '<span class="c-g">Strong</span>']]) + '<p>Pick a <b>real mistake with real cost</b> (a delay, a bug, an outage) but not a scandal or anything illegal. Choose one from 1 to 4 years ago so you have had time to learn and show growth.</p>',
  testing: ['Self-awareness: can you see your own part clearly?', 'Ownership: "I" statements about the mistake, no blame.', 'Recovery: how fast and calmly did you contain damage?', 'Learning: did you change a habit or a system?', 'Honesty: is this a real failure, not a disguised success?'],
  red: ['The humble-brag ("I care too much").', 'Blaming people, tools or deadlines.', 'A trivial failure ("I once typed a wrong variable name").', 'A failure so severe it raises safety fears, with no fix.', 'No lesson, or a lesson with no changed behaviour.', 'Dragging the story out for 4 minutes of excuses.'],
  weak: 'My biggest weakness is I take on too much work. Once there was a project where the requirements kept changing and the team did not communicate, so we missed the deadline. It was not really my fault, but I learned that communication is important and I try to work on it now.',
  weakWhy: ['Humble-brag opening ("I take on too much").', 'Blames requirements and the team: "not really my fault".', 'No specific mistake, no numbers, no cost.', 'The lesson ("communication is important") is a slogan, not a changed behaviour.', 'No repair steps are described.'],
  strong: {
    S: 'Two years ago at Fernwood Labs I deployed a database migration on a Friday afternoon without running it on a copy of production data.',
    T: 'I was the engineer responsible for the release, so the fix and the follow-up were mine.',
    A: 'The migration locked the orders table for 11 minutes and checkout errors spiked. I immediately told my manager and the on-call channel, rolled back within 14 minutes, and posted a clear status for support. The next day I wrote a blameless review: I had skipped the dry run to save time. I added a staging dry-run step to our deploy checklist, a rule of no schema changes after 2 pm Friday, and a script to estimate lock time.',
    R: 'About 300 orders were delayed and all were reprocessed by evening. Since then, 25 migrations have gone out with no lock incidents, and two teammates copied the checklist.',
    L: 'I learned that feeling confident is not a test. Now when I am in a hurry, I ask "what would I check if this were someone else\'s change?".'
  },
  ann: {
    S: 'Specific, dated and honest about the cause: "without running it". No excuse words.',
    T: 'Claims ownership in one sentence. No hiding behind the team.',
    A: 'Contain (rollback), communicate (manager, support), review (blameless), prevent (checklist, rule, script). Four layers, all "I".',
    R: 'Shows the cost honestly (300 delayed orders) then the improvement (25 clean migrations, others adopted it).',
    L: 'A personal habit change, not a slogan. Humble but not self-pitying.'
  },
  compare: [
    ['I take on too much work', 'A humble-brag, not a failure.', 'I deployed a migration without a dry run.'],
    ['requirements kept changing', 'Blames others.', 'I skipped the dry run to save time. That was my decision.'],
    ['it was not really my fault', 'Zero ownership.', 'I was responsible for the release, so the fix was mine.'],
    ['we missed the deadline', 'No cost or number.', 'The table locked 11 minutes; about 300 orders were delayed.'],
    ['communication is important', 'A slogan, not a changed behaviour.', 'I added a staging dry-run to the checklist and a no-Friday-schema rule.']
  ],
  weakScores: [1, 0, 0, 1], strongScores: [5, 5, 4, 5],
  rubricNotes: ['Weak names no event; strong names the migration, the Friday and the cause.', 'Weak says "we" and blames others; strong has contain, communicate, review, prevent, all "I".', 'Weak has no impact; strong has 11 minutes, 300 orders, 25 clean migrations.', 'Weak lesson is a slogan; strong lesson is a personal checklist habit.'],
  follow: [
    ['Why did you skip the dry run?', 'Honest answer: I felt pressed for time and was overconfident because the change looked small. That feeling is now my warning sign.', 'honesty about root cause'],
    ['What did your manager say?', 'He thanked me for telling him in the first minutes and asked me to present the checklist to the team.', 'whether you disclose fast'],
    ['Is there a bigger failure?', 'Be ready: a second, different example, maybe a project that failed because I did not ask about the customer. Same shape.', 'depth beyond one rehearsed story'],
    ['How do you make sure it does not happen again?', 'Systems over willpower: checklist, automation and a rule, plus a teammate review for risky deploys.', 'systems thinking']
  ],
  stepsTitle: 'From mistake to prevention',
  stepsLabel: 'Failure recovery',
  steps: [['Mistake', 'Name it plainly. No excuses.'], ['Own it', 'Say "I" and tell the people affected fast.'], ['Contain', 'Stop the damage: rollback, workaround.'], ['Fix', 'Repair the root cause, not only the symptom.'], ['Learn', 'Write a blameless review.'], ['Prevent', 'Checklist, test or rule so it cannot repeat.']],
  stepsEnd: 'The story is not the mistake. The story is the loop from mistake to prevention.',
  clues: ['"Tell me about your biggest failure"', '"A time you made a mistake / missed a deadline / let someone down"', '"What is your biggest weakness?" (a cousin question)', '"Tell me about a project that did not go well"', '"What would you do differently?"', '"A time you were wrong"'],
  examples: [
    { title: 'Technical mistake', html: '<p>I added a cache without an expiry and users saw stale prices for two hours. I fixed it in 30 minutes, added a time limit, and wrote a test that fails when a cache has no expiry.</p><p>Why it works: small, real, with a systemic fix (the test).</p>' },
    { title: 'A people mistake', html: '<p>I assumed a junior engineer, Leo, understood a task and did not check in. He was stuck for four days. Now I ask him to explain the plan back to me on day one and book a 10-minute check-in on day two.</p><p>Why it works: failure is about communication, which is real and common, with a concrete new habit.</p>' },
    { title: 'A project that failed', html: '<p>I spent six weeks building an analytics page nobody used because I never asked customers. I got the data: 3 of 200 users opened it. I now run a 1-week prototype test before any big feature.</p><p>Why it works: honest about a product failure, and the learning is a process change.</p>' }
  ],
  deepDive: '<p><b>What senior interviewers listen for:</b> <i>blast radius and detection</i>. How quickly did you find out, and did you tell people before they asked? They also listen for <i>root cause versus trigger</i> ("the trigger was the migration; the root cause was we had no dry-run step"), for <i>systems fixes over resolutions</i> ("I will be more careful" is weak; "I added a check that blocks the deploy" is strong), and for <i>blamelessness</i>: you describe failures of process, including your own, without naming and shaming others.</p><p><b>How big a failure?</b> Big enough to hurt (hours of downtime, a lost week, a missed date) and small enough to be recoverable. Failures with a customer data leak or safety risk need extra care: only use them if the fix and the new safeguards are strong.</p><p><b>Pair it with the weakness question:</b> choose a real, non-fatal weakness (for example, "I used to avoid asking for help") and show the habit you built (a 30-minute stuck rule).</p><p><b>Tone:</b> calm, matter-of-fact. Do not perform shame, and do not laugh it off.</p>',
  aiEra: '<p><b>What AI changes:</b> A new kind of mistake is common: trusting AI-generated code or a summary without checking. Interviewers are curious how you handle it. A good story: you accepted a generated SQL query, it dropped an index, you caught it in staging, and now you read, test and run every generated change like a junior\'s pull request.</p><p><b>Use AI as a partner:</b> <code>Act as a skeptical interviewer. Ask me about my biggest failure. If I blame anyone or use a vague lesson, interrupt and ask "what exactly did you change?". After my answer, tell me the ratio of failure to fix in seconds.</code> Aim for roughly 25 percent mistake, 75 percent recovery.</p><p><b>Do not sound scripted:</b> A story smoothed by AI often loses its edge: the awkward moment where you called your manager. Put that moment back; it is what makes it believable.</p><p><b>What you must still own:</b> the honest root cause and the habit you can actually show in your daily work.</p>',
  problems: [pr({
    title: 'Biggest failure with ownership and learning', level: 'Medium', tags: ['failure', 'ownership'],
    q: 'Tell me about the biggest mistake you have made at work.', ctx: 'Final-round interview. The interviewer watches for blame, humble-brag and for a fix that lasts.',
    listen: '"I" language about the mistake, quick disclosure, repair steps, prevention that is a system, a real number.',
    weak: 'My biggest failure is that I am a perfectionist. Once a project was late because the requirements changed.',
    why: 'Humble-brag plus blame, no event, no cost, no lesson.',
    strong: 'Two years ago at Fernwood Labs I deployed a database migration on a Friday without running it on a copy of production data. I was responsible for the release. The migration locked the orders table for 11 minutes. I told my manager and the on-call channel straight away, rolled back in 14 minutes, and gave support a clear status. The next day I wrote a blameless review and admitted I had skipped the dry run to save time. I added a staging dry-run step to the deploy checklist, a no-schema-change-after-2pm-Friday rule, and a script to estimate lock time. About 300 orders were delayed and all were reprocessed that evening. Since then 25 migrations have shipped without lock incidents. I learned that feeling confident is not a test.',
    hints: ['Hint 1: Choose a real mistake you caused, not luck or a teammate.', 'Hint 2: Spend a quarter of the time on the mistake and three quarters on fix and prevention.', 'Hint 3: The lesson must be a system or habit you can show, like a checklist.'],
    mcq: { q: 'Which lesson sounds strongest?', options: ['"I will try harder next time."', '"Communication is important."', '"I added a deploy check that blocks schema changes without a dry run."', '"It was not really my fault."'], answer: 2, explain: 'A system change that prevents repeats beats any promise to be more careful.' },
    follow: ['What if the failure was a teammate\'s?', 'Give a second failure from a different area.'], secs: 105
  })]
}));
// ===================== TOPIC 5: Handling critical feedback =====================
topics.push(build({
  short: 'Handling critical feedback',
  title: 'Handling Critical Feedback: Hear, Thank, Act, Close the Loop',
  question: 'Tell me about a time you received critical feedback. What did you do?',
  analogy: '<p>Feedback is like a mirror in the gym. It shows you the bent back you cannot see yourself. Nobody enjoys it, but the lifter who turns away from the mirror gets hurt. The lifter who looks, adjusts the form, and checks again next week gets strong.</p>',
  explain: '<p>The interviewer wants to see that you are <b>coachable</b>. Skill matters, but a skilled person who cannot take feedback becomes a drag on the team. So tell a story where feedback <b>stung</b>, you <b>listened</b>, you <b>changed something specific</b>, and the change <b>showed up in results</b>.</p><p>The loop in five steps:</p><ol><li><b>Hear:</b> do not defend. Take notes.</li><li><b>Thank and clarify:</b> "Can you give me an example?"</li><li><b>Reflect:</b> is it true? Even partly?</li><li><b>Act:</b> pick one or two small, visible changes.</li><li><b>Close the loop:</b> go back and say what you changed. Ask if it is better.</li></ol>' + H.table(['Reaction', 'What it sounds like', 'Verdict'], [['Defend', '"That is not fair, I had no time."', '<span class="c-r">Not coachable</span>'], ['Collapse', '"I felt terrible and lost confidence."', '<span class="c-y">Fragile</span>'], ['Fake', '"I got feedback that I am too perfect."', '<span class="c-r">Humble-brag</span>'], ['Learn', '"I asked for examples, changed X, checked back."', '<span class="c-g">Coachable</span>']]) + '<p>Choose feedback that was <b>true and useful</b>, about a behaviour (not your personality), and from someone you respect.</p>',
  testing: ['Are you coachable, or do you get defensive?', 'Do you seek feedback or only receive it when forced?', 'Can you turn feedback into a specific change?', 'Do you handle emotion maturely?', 'Do you close the loop, going back to ask if it improved?'],
  red: ['"I have never received critical feedback."', 'A fake weakness ("too detail-oriented").', 'Arguing with or discounting the person who gave it.', 'A change that is vague ("I try harder").', 'Feedback so extreme it hints at a character problem.', 'Feeling hurt for months with no action.'],
  weak: 'My manager once said my code reviews were too harsh. I thought it was unfair because I was just trying to keep quality high. But I did try to be nicer after that. I think people are just sensitive these days, but I learned to adapt.',
  weakWhy: ['Defensive tone: "unfair", "sensitive".', 'No clarifying question or example from the manager.', '"Be nicer" is vague. What did you change?', 'No result, nobody confirmed it got better.', 'Blames the audience, so the learning is fake.'],
  strong: {
    S: 'In my annual review at Fernwood Labs, my manager Priya Nair told me that my code review comments were blunt, and two junior engineers had stopped asking me for reviews.',
    T: 'I wanted to keep high quality but make my feedback something people could use, and win those two engineers back.',
    A: 'My first reaction was to defend myself, but I stopped and asked Priya for two examples. Reading them, I could see she was right: "this is wrong" with no reason. I changed three things: I added a short why to every comment, I started with one thing that was good, and I marked comments as must-fix or optional. After a month I asked both juniors directly if the reviews felt more useful, and asked Priya to check a sample.',
    R: 'Both juniors went back to requesting my reviews, average review rounds per pull request dropped from 3.1 to 2.0, and Priya noted the change in my mid-year review.',
    L: 'I learned that being right is not the same as being useful. Now I ask for feedback every quarter and I write down one change to test.'
  },
  ann: {
    S: 'Who said it, what they said, and the visible consequence (juniors stopped asking). Honest and specific.',
    T: 'The goal is balanced: keep quality AND improve delivery. That signals judgement.',
    A: 'Shows the pause ("my first reaction"), a clarifying ask, three concrete changes, and a loop-closing check with the people affected.',
    R: 'Both a relationship result and a number (3.1 to 2.0 rounds), plus the manager noticed.',
    L: 'A reusable principle and a habit: quarterly feedback, one change to test.'
  },
  compare: [
    ['it was unfair', 'Defensive reaction.', 'My first reaction was to defend myself, so I paused and asked for examples.'],
    ['people are just sensitive these days', 'Dismisses the giver.', 'Reading the examples, I could see she was right.'],
    ['I tried to be nicer', 'Vague change.', 'I added a why to every comment and marked must-fix vs optional.'],
    ['I learned to adapt', 'No evidence it improved.', 'Review rounds dropped from 3.1 to 2.0; two juniors came back.'],
    ['(no follow-up)', 'The loop was never closed.', 'After a month I asked the juniors and Priya if it was better.']
  ],
  weakScores: [2, 1, 0, 1], strongScores: [4, 5, 5, 5],
  rubricNotes: ['Weak does not say who or when; strong says annual review, manager, juniors who stopped asking.', 'Weak "tried to be nicer"; strong lists three changes and a check-in.', 'Weak has no result; strong has 3.1 to 2.0 and returning juniors.', 'Weak says people are sensitive; strong says right is not the same as useful.'],
  follow: [
    ['Did you agree with the feedback?', 'Mostly yes. One part (that I was unfriendly) was not how I saw myself, but the examples showed how it landed, and the impact matters more than my intent.', 'honest processing'],
    ['How do you ask for feedback?', 'Specific questions: "What is one thing I could do better in design reviews?" and I ask every quarter, not only at review time.', 'proactivity'],
    ['What if the feedback was wrong?', 'I would ask for examples, look for a kernel of truth, thank them, and explain my view calmly. I would still check with a second person.', 'balance: not a pushover'],
    ['How do you give hard feedback to others?', 'Private, specific, kind: situation, behaviour, impact, then ask for their view and offer help.', 'two-way skill']
  ],
  stepsTitle: 'The feedback loop',
  stepsLabel: 'Feedback loop',
  steps: [['Hear', 'Do not defend. Take notes.'], ['Thank + clarify', 'Ask for one or two examples.'], ['Reflect', 'Is any of it true? Sleep on it.'], ['Pick a change', 'One to three small, visible changes.'], ['Practise', 'Do it for 2 to 4 weeks.'], ['Close the loop', 'Ask: is it better now?']],
  stepsEnd: 'Feedback only counts when it travels all the way back to the person who gave it.',
  clues: ['"Tell me about a time you got critical feedback"', '"How do you handle criticism?"', '"What was the hardest feedback you ever received?"', '"What do your peers say you should improve?"', '"Tell me about a time you were told you were wrong"', '"Do you seek feedback?"'],
  examples: [
    { title: 'Feedback on communication', html: '<p>My lead said my standup updates were too long and technical. I asked what "good" looked like; she said 3 sentences with a blocker. I wrote my updates in that format for a month. Standup went from 20 to 12 minutes with the team.</p><p>Why it works: a clear before and after.</p>' },
    { title: 'Feedback on a technical habit', html: '<p>A senior engineer pointed out I never wrote tests for error paths. I started with one test per error branch, then wrote a checklist. Bugs from my features fell from 6 a quarter to 2.</p><p>Why it works: a measurable defect rate.</p>' },
    { title: 'Feedback you partly disagreed with', html: '<p>A peer said I was too quiet in meetings. I knew I was thinking, not absent, but I accepted that others could not tell. I started to share one view in each meeting. A month later he said he valued my input more.</p><p>Why it works: you don\'t have to agree fully; you can act on the impact.</p>' }
  ],
  deepDive: '<p><b>What senior interviewers listen for:</b> <i>the time between sting and action.</i> Great answers show a short, honest gap ("I was annoyed for a day") followed by deliberate steps. They also listen for <i>separating intent from impact</i>: "I meant to keep quality high; the impact was people avoiding me". And for <i>feedback-seeking</i>, not just receiving. Seniors request it ("What should I stop, start, continue?").</p><p><b>Types of feedback:</b> appreciation (thanks), coaching (how to get better), and evaluation (where you stand). Know which you are getting. If it is evaluation (rating), ask what would raise it next time.</p><p><b>Useful frame (SBI):</b> Situation, Behaviour, Impact. If someone gives vague feedback ("be more strategic"), ask for an SBI example.</p><p><b>Delivery:</b> avoid "I took it very well", because it sounds like boasting. Show the behaviour instead.</p>',
  aiEra: '<p><b>What AI changes:</b> Feedback now also comes from tools: AI code reviewers, linters and auto-summaries of your pull requests. Interviewers may ask how you treat such feedback. A grown-up answer: you take it as a first pass, check it, disagree when it is wrong, and still ask humans for judgement and context.</p><p><b>Use AI as a partner:</b> Ask your AI mock interviewer to give you critical feedback on your answer, then reply to that feedback as you would to a manager: <code>Give me three blunt criticisms of my answer. I will respond as if you were my manager; judge whether I defend, collapse or learn.</code> It is safe practice for staying calm.</p><p><b>Do not sound scripted:</b> If AI polished away the awkward feeling in your story, put it back: one honest line such as "my first reaction was to argue". Interviewers trust that line.</p><p><b>What you must still own:</b> choosing which feedback to act on, and going back to the person to close the loop.</p>',
  problems: [pr({
    title: 'Handling critical feedback', level: 'Medium', tags: ['feedback', 'coachable'],
    q: 'Tell me about the most critical feedback you ever received and what you did with it.', ctx: 'The interviewer is a senior engineer. They will ask "did you agree with it?".',
    listen: 'A pause before reacting, clarifying questions, specific changes, loop-closing, evidence of improvement.',
    weak: 'My manager said I was too harsh. I thought it was unfair, but I tried to be nicer.',
    why: 'Defensive, vague change, no proof of improvement.',
    strong: 'In my annual review at Fernwood Labs, my manager Priya told me my code review comments were blunt and two junior engineers had stopped asking me for reviews. I wanted to keep quality high but make my feedback usable. My first reaction was to defend myself, but I paused and asked her for two examples. Reading them, I could see she was right: I wrote this is wrong without a reason. I made three changes: I added a short why to every comment, started with one good thing, and marked comments must-fix or optional. After a month I asked both juniors and Priya if reviews were more useful. Both juniors went back to requesting my reviews, review rounds per pull request fell from 3.1 to 2.0, and Priya noted it at mid-year. I learned that being right is not the same as being useful.',
    hints: ['Hint 1: Pick feedback that was true and about a behaviour.', 'Hint 2: Show the first reaction honestly, then the pause and the clarifying ask.', 'Hint 3: Close the loop: say who you went back to and what they said.'],
    mcq: { q: 'What shows an interviewer you are coachable?', options: ['Saying you never get criticism', 'Arguing your side first', 'Asking for examples, changing a behaviour, and checking back', 'Saying you take feedback very well'], answer: 2, explain: 'Specific actions and loop-closing prove coachability; claims do not.' },
    follow: ['What feedback did you disagree with?', 'How do you ask for feedback?'], secs: 100
  })]
}));

// ===================== TOPIC 6: Working in a team / helping a struggling teammate =====================
topics.push(build({
  short: 'Teamwork and helping a teammate',
  title: 'Working in a Team and Helping a Struggling Teammate',
  question: 'Tell me about a time you helped a teammate who was struggling.',
  analogy: '<p>A relay team passes the baton. The team is only as fast as the slowest hand-off. A good runner does not just sprint their own leg; they notice a teammate slowing down and help before the baton drops. Team stories are about <b>noticing</b> and <b>passing the baton cleanly</b>.</p>',
  explain: '<p>Interviewers want a teammate who makes the whole team faster, not just themselves. Two common forms: "Tell me about a time you worked well in a team" and "Tell me about a time you helped a struggling teammate."</p><p>For the helping story, use this ladder:</p><ol><li><b>Notice:</b> a missed standup, a pull request stuck for days, short answers.</li><li><b>Ask kindly and privately:</b> "How is it going? Anything blocking you?"</li><li><b>Help in the right size:</b> pair for an hour, share a doc, split the task; do not take the work over.</li><li><b>Fade out:</b> step back so they own it. Build their skills, not dependency.</li><li><b>Celebrate:</b> give them the credit in public.</li></ol>' + H.table(['Helping style', 'Example', 'Verdict'], [['Ignore', '"It was not my job."', '<span class="c-r">Not a team player</span>'], ['Take over', 'I finished it myself.', '<span class="c-y">Fast but nobody learned</span>'], ['Gossip', 'Told others he was slow.', '<span class="c-r">Harmful</span>'], ['Coach', 'Paired, then handed back, gave credit.', '<span class="c-g">Strong</span>']]) + '<p>For the general teamwork version, show <b>one specific thing you did</b> for the team (not the team\'s achievement), such as unblocking, documenting, or taking the boring task.</p>',
  testing: ['Do you notice others, or only your own tasks?', 'Is your help respectful and sized right (no taking over, no condescension)?', 'Do you grow people, creating independence?', 'Do you share credit?', 'Does the team do better because you were there?'],
  red: ['"I am a lone wolf who works best alone."', 'Taking over the teammate\'s task and finishing it yourself.', 'Complaining about the teammate\'s skill.', 'Using only "we" so your role is unknown.', 'Helping only people who help you back.', 'Stealing the credit ("I saved the project").'],
  weak: 'We had a teammate who was behind on his work. So our team worked extra hours and we finished his part for him. We delivered the project on time. I think teamwork is very important and we all worked hard together.',
  weakWhy: ['"We" everywhere, so we cannot see what the speaker did.', 'Took over the work: the teammate learned nothing.', 'Talks about him, not with him; no empathy shown.', 'No numbers and no learning.', 'Ends with a cliché about teamwork.'],
  strong: {
    S: 'At Brightcart, a new teammate, Leo Park, was assigned a notification feature, and after two weeks his pull request was still blocked and he had stopped speaking in standups.',
    T: 'I was his assigned buddy, so I wanted to help him ship without doing it for him, because the feature was due in six days.',
    A: 'I messaged him privately: "Want to pair for an hour? I got stuck on this module too when I joined." In our session I found he was struggling with our event system, not the feature itself. I drew the flow on a whiteboard, wrote a half-page guide, and had him drive the keyboard while I asked questions. Then I stepped back, checked in for ten minutes each morning, and when we demoed, I made sure Leo presented it.',
    R: 'Leo shipped one day early. His next pull request needed one review round instead of five, and he later taught the guide to the next new hire.',
    L: 'I learned that quiet usually means stuck, not lazy. Now I write down onboarding gaps right after I help someone, so the next person starts ahead.'
  },
  ann: {
    S: 'Shows the signals you noticed (stuck PR, quiet in standup) and the deadline.',
    T: 'Defines the right-sized job: help, do not take over. The buddy role explains why it was yours.',
    A: 'Private, kind opener; diagnosed the real gap; drew, wrote, and let him drive; then faded out and gave him the spotlight.',
    R: 'Outcome for the teammate (early, 1 review round vs 5) and for the team (guide reused).',
    L: 'A changed habit: quiet means stuck; capture the gap for the next person.'
  },
  compare: [
    ['a teammate who was behind', 'Judges rather than diagnoses.', 'Leo was stuck on our event system, not on the feature.'],
    ['we worked extra hours', 'Hides your role in "we".', 'I messaged him privately and offered to pair for an hour.'],
    ['we finished his part for him', 'Took over; he learned nothing.', 'He drove the keyboard while I asked questions.'],
    ['we delivered on time', 'No evidence of growth.', 'He shipped a day early; his next PR needed one review round instead of five.'],
    ['teamwork is very important', 'A cliché.', 'Quiet usually means stuck. I now document onboarding gaps right after helping.']
  ],
  weakScores: [2, 0, 1, 0], strongScores: [4, 5, 5, 4],
  rubricNotes: ['Weak says "behind on his work"; strong names the signals, the deadline and the real gap.', 'Weak is all "we"; strong uses I for the message, the diagram, the guide and the fade-out.', 'Weak says "on time"; strong has a day early and 5 review rounds down to 1.', 'Weak ends with a cliché; strong keeps a new habit for the team.'],
  follow: [
    ['What if he had not wanted help?', 'I would respect that, tell him the door is open, and ask my lead if there was a better fit for support. Pushing too hard can feel like criticism.', 'respect for autonomy'],
    ['How did you balance this with your own work?', 'I timeboxed it to 1 hour, then 10-minute daily check-ins. I told my manager and moved one of my small tasks.', 'prioritisation and transparency'],
    ['Did you tell the manager?', 'I told Priya the plan, not the shortcomings. It was a support plan, not a complaint.', 'discretion'],
    ['Tell me about a time you worked in a team that was not working well.', 'Same ladder: notice, ask, propose one concrete team change (like a short retro) and measure it.', 'systems thinking in teams']
  ],
  stepsTitle: 'Helping a struggling teammate',
  stepsLabel: 'Team help ladder',
  steps: [['Notice', 'Quiet standups, stuck PRs.'], ['Ask privately', 'Kind, no blame: "how is it going?"'], ['Diagnose', 'Find the real gap, not the symptom.'], ['Right-size help', 'Pair, share a guide. Do not take over.'], ['Fade out', 'Step back so they own it.'], ['Share credit', 'Let them present it.']],
  stepsEnd: 'Great teammates raise the whole team, and everyone knows who did the work.',
  clues: ['"Tell me about a time you helped a teammate"', '"Describe a time you worked in a team"', '"How do you handle a team member who is not pulling their weight?"', '"Tell me about a time you went above and beyond for a colleague"', '"How do you onboard or mentor others?"', '"What role do you take in a team?"'],
  examples: [
    { title: 'Teamwork on a tight deadline', html: '<p>Our four-person team had five days to launch. I proposed a daily 15-minute sync and took the tedious integration tests. We launched on day four with zero P1 bugs.</p><p>Why it works: one personal contribution that helped the group.</p>' },
    { title: 'Not pulling their weight', html: '<p>A teammate kept missing deadlines. I asked privately; he was juggling a family issue. We split his task into smaller pieces with my lead\'s approval, and he delivered the rest. I never mentioned the family issue to the others.</p><p>Why it works: empathy, discretion, structure.</p>' },
    { title: 'Helping across teams', html: '<p>The mobile team was blocked on an API I owned. I shipped a mock endpoint in half a day, so they could build in parallel. Release slipped zero days.</p><p>Why it works: small, quick, unblocking action that helps people outside your team.</p>' }
  ],
  deepDive: '<p><b>What senior interviewers listen for:</b> <i>multiplier behaviour.</i> A strong engineer makes the people around them better: docs, templates, pairing, good reviews, kind unblocking. Seniors want to hear about <i>leverage</i>: one hour of your time saved ten hours across the team (a guide used by the next hire). They also listen for <i>respect in sizing the help</i>: coaching versus rescuing, and for <i>boundaries</i>: you can help without burning out or neglecting your own commitments.</p><p><b>Psychological safety:</b> teams where juniors can say "I am stuck" are faster. If you mention you share your own stuck moments ("I got stuck too"), you are describing how to create that safety.</p><p><b>Conflict with "not pulling their weight":</b> start with curiosity, not a verdict. Maybe it is a skill gap, a personal issue, unclear expectations or an overloaded person. Only after trying support, with the lead informed, does it become a performance matter.</p><p><b>Credit:</b> mention others by first name; it signals generosity.</p>',
  aiEra: '<p><b>What AI changes:</b> New joiners now use AI to unblock themselves, and some struggle silently behind plausible-looking generated code. Strong teammates notice when someone cannot explain what they have shipped and offer to review the reasoning together, not to catch them out. In stories about helping, mention teaching someone to <i>verify</i> an AI answer, because that is a modern mentoring skill.</p><p><b>Use AI as a partner:</b> Ask it to play a struggling junior: <code>Play Leo, a new engineer who is stuck but embarrassed. Answer shortly. I will try to help without taking over. Afterwards tell me if I asked more than I told.</code> You will see how easy it is to slip into lecturing.</p><p><b>Do not sound scripted:</b> Keep one real, slightly awkward detail, such as the exact first message you sent. People remember specifics, and AI-flavoured stories tend to lose them.</p><p><b>What you must still own:</b> noticing the human signals that a chatbot cannot see, and deciding how much help is the right amount.</p>',
  problems: [pr({
    title: 'Helping a struggling teammate', level: 'Easy', tags: ['teamwork', 'mentoring'],
    q: 'Tell me about a time you helped a teammate who was struggling.', ctx: 'Early-career interview. The interviewer wants to see you notice, help, and let go.',
    listen: 'How you noticed, a private and kind approach, right-sized help, a result for them and the team, shared credit.',
    weak: 'My teammate was slow, so we all finished his work. We delivered on time.',
    why: 'Judgemental, all "we", took over the work, no growth for anyone.',
    strong: 'At Brightcart a new teammate, Leo, was assigned a notification feature, and after two weeks his pull request was still blocked and he had gone quiet in standups. As his buddy, I wanted him to ship without me doing it for him, with six days left. I messaged him privately and offered to pair for an hour, saying I had been stuck there too. I found he was struggling with our event system, not the feature, so I drew the flow, wrote a half-page guide, and let him drive the keyboard. Then I stepped back, checked in ten minutes each morning, and made sure he presented the demo. Leo shipped a day early, his next pull request needed one review round instead of five, and he later taught the guide to a new hire. I learned that quiet usually means stuck.',
    hints: ['Hint 1: Start with what you noticed, not with a judgement.', 'Hint 2: Show the help was the right size: pair, guide, fade out.', 'Hint 3: Give the teammate the credit and end with a habit.'],
    mcq: { q: 'Your teammate is behind. What is the best move?', options: ['Finish his work and say nothing', 'Tell others he is slow', 'Ask privately, find the real gap, help in a right-sized way, then step back', 'Wait until the manager notices'], answer: 2, explain: 'Coaching builds independence; taking over and gossip do not.' },
    follow: ['What if he refuses help?', 'How did you balance your own work?'], secs: 100
  })]
}));
// ===================== TOPIC 7: Practice lab =====================
var ANALYZER = "import re\n\n# Keyword clues for each STAR section (lowercase). Edit and extend them!\nSTAR_KEYWORDS = {\n    \"Situation\": [\"when\", \"last year\", \"at \", \"team\", \"project\", \"release\", \"deadline\", \"was working\", \"ago\"],\n    \"Task\": [\"responsible\", \"my job\", \"i needed\", \"goal\", \"owned\", \"asked me\", \"had to\", \"my role\"],\n    \"Action\": [\"i decided\", \"i asked\", \"i wrote\", \"i built\", \"i created\", \"i proposed\", \"i listened\", \"i added\", \"i led\", \"i set up\"],\n    \"Result\": [\"result\", \"reduced\", \"increased\", \"dropped\", \"saved\", \"shipped\", \"improved\", \"so that\", \"from \"],\n    \"Reflection\": [\"learned\", \"lesson\", \"next time\", \"now i\", \"since then\", \"differently\", \"habit\"],\n}\nWORDS_PER_MIN = 150\n\ndef analyze(text):\n    low = text.lower()\n    words = re.findall(r\"[A-Za-z0-9']+\", text)\n    # Count first person singular vs plural pronouns\n    i_count = sum(1 for w in words if w.lower() in (\"i\", \"i'm\", \"i've\", \"i'd\", \"i'll\", \"my\", \"me\"))\n    we_count = sum(1 for w in words if w.lower() in (\"we\", \"we're\", \"we've\", \"we'd\", \"our\", \"us\"))\n    # A metric is a number with a unit, a percent sign, or a before/after like \"from 3 to 1\"\n    metrics = re.findall(r\"\\d+(?:\\.\\d+)?\\s?(?:%|percent|ms|s|x|hours?|days?|weeks?|minutes?|users?|orders?|tickets?|rounds?)\", low)\n    has_metric = len(metrics) > 0 or bool(re.search(r\"\\d\", text))\n    sections = {}\n    for name, keys in STAR_KEYWORDS.items():\n        sections[name] = [k.strip() for k in keys if k in low]\n    seconds = round(len(words) / WORDS_PER_MIN * 60)\n    return {\"words\": len(words), \"I\": i_count, \"we\": we_count, \"metrics\": metrics,\n            \"has_metric\": has_metric, \"sections\": sections, \"seconds\": seconds}\n\ndef score(r):\n    pts = {}\n    pts[\"Situation clarity\"] = 5 if r[\"sections\"][\"Situation\"] and r[\"sections\"][\"Task\"] else 2 if r[\"sections\"][\"Situation\"] else 0\n    ratio = r[\"I\"] / (r[\"I\"] + r[\"we\"]) if (r[\"I\"] + r[\"we\"]) else 0\n    pts[\"Personal action (I)\"] = round(5 * ratio) if r[\"sections\"][\"Action\"] else round(2 * ratio)\n    pts[\"Measurable result\"] = 5 if len(r[\"metrics\"]) >= 2 else 3 if r[\"has_metric\"] else 0\n    pts[\"Reflection\"] = 5 if len(r[\"sections\"][\"Reflection\"]) >= 2 else 3 if r[\"sections\"][\"Reflection\"] else 0\n    return pts\n\ndef report(title, text):\n    r = analyze(text)\n    pts = score(r)\n    print(\"=\" * 60)\n    print(title)\n    print(\"words:\", r[\"words\"], \"| speaking time ~\", r[\"seconds\"], \"s at\", WORDS_PER_MIN, \"wpm\")\n    print(\"I-words:\", r[\"I\"], \"| we-words:\", r[\"we\"])\n    print(\"metric found:\", r[\"has_metric\"], r[\"metrics\"][:4])\n    for name, found in r[\"sections\"].items():\n        mark = \"OK  \" if found else \"MISS\"\n        print(\"  [%s] %-10s %s\" % (mark, name, found[:4]))\n    total = sum(pts.values())\n    for k, v in pts.items():\n        print(\"  score %-22s %d/5\" % (k, v))\n    print(\"TOTAL: %d/20\" % total, \"-> hire signal\" if total >= 15 else \"-> keep practising\")\n    tips = []\n    if r[\"we\"] > r[\"I\"]:\n        tips.append(\"Say 'I' for your own actions: you used 'we' more than 'I'.\")\n    if not r[\"has_metric\"]:\n        tips.append(\"Add one number (percent, time saved, users, money).\")\n    for name, found in r[\"sections\"].items():\n        if not found:\n            tips.append(\"Add a clear %s part.\" % name.lower())\n    if r[\"seconds\"] > 130:\n        tips.append(\"Too long: trim to 120 seconds or less.\")\n    if r[\"seconds\"] < 45:\n        tips.append(\"Too short: add detail to the action.\")\n    print(\"Tips:\", tips if tips else \"Looks balanced!\")\n\nWEAK = (\"We had a teammate who was behind. So we worked extra hours and we finished his part for him. \"\n        \"We delivered on time. Teamwork is very important and our team worked hard.\")\nSTRONG = (\"At Brightcart a new teammate, Leo, was stuck and his pull request was blocked with six days left. \"\n          \"As his buddy, my job was to help him ship without doing it for him. I asked him privately to pair, \"\n          \"I drew the event flow, I wrote a half-page guide, and I let him drive the keyboard. \"\n          \"As a result Leo shipped a day early and his next review dropped from 5 rounds to 1. \"\n          \"I learned that quiet usually means stuck, and now I write down onboarding gaps right after I help.\")\n\nreport(\"WEAK answer\", WEAK)\nreport(\"STRONG answer\", STRONG)\n";
topics.push(build({
  short: 'Practice lab: rubric and analyzer',
  title: 'Practice Lab: Scoring Your Answers and Mock Interviews With AI',
  question: 'Tell me about a time you helped a teammate who was struggling. (Use this to test the analyzer.)',
  analogy: '<p>A musician does not get better by just playing the song once; they record it, listen back, and mark the wrong notes. Your answers are the same. <b>Record, count, score, repeat.</b> The analyzer below is your metronome.</p>',
  explain: '<p>You now have six story shapes. This lab shows how to <b>measure</b> an answer so practice is not guesswork. We use a 4-part rubric, each scored 0 to 5, for a total of 20:</p>' + H.table(['Dimension', '0 means', '5 means'], [['Situation clarity', 'Listener cannot tell who, when, what was at stake', 'One or two clear sentences with stakes and deadline'], ['Personal action ("I")', 'All "we"; cannot tell your part', 'Specific verbs: I asked, I wrote, I built'], ['Measurable result', 'No outcome', 'Two numbers or a clear before and after'], ['Reflection', 'No lesson or a cliché', 'A changed habit you can show']]) + '<p>Rules of thumb: <b>15+ out of 20</b> is a hire signal at most companies. Time target: <b>90 to 120 seconds</b> (about 225 to 300 words at 150 words per minute). Under 45 seconds feels thin, over 150 seconds loses people.</p><p>The Python program below is a simple answer analyzer. It counts "I" versus "we" words, detects a number, checks the STAR sections by keywords, estimates speaking time, and gives a score. It is crude on purpose: it checks the <i>shape</i>, and you judge the <i>truth</i>. Press Run, then paste your own answer into the WEAK and STRONG strings if you work locally.</p>',
  testing: ['Consistency: can you tell good stories under pressure, not only once?', 'Self-correction: you improve between rounds using feedback.', 'Preparation: you have 6 to 8 stories that flex across many questions.', 'Natural delivery: you sound like a person, not a recording.'],
  red: ['Memorising word for word, so one interruption breaks you.', 'Using one story for every question.', 'Practising only silently in your head.', 'Letting AI write the whole answer.', 'Never timing yourself.', 'Practising with only friendly listeners.'],
  weak: 'We had a teammate who was behind. So we worked extra hours and we finished his part for him. We delivered on time. Teamwork is very important and our team worked hard.',
  weakWhy: ['Analyzer: 0 "I" words versus 5 "we" words.', 'No metric detected.', 'Missing Task, Action, Result and Reflection keywords.', 'Only 13 seconds: far too short.'],
  strong: {
    S: 'At Brightcart a new teammate, Leo, was stuck and his pull request was blocked with six days left.',
    T: 'As his buddy, my job was to help him ship without doing it for him.',
    A: 'I asked him privately to pair, I drew the event flow, I wrote a half-page guide, and I let him drive the keyboard.',
    R: 'As a result Leo shipped a day early and his next review dropped from 5 rounds to 1.',
    L: 'I learned that quiet usually means stuck, and now I write down onboarding gaps right after I help.'
  },
  ann: {
    S: 'Analyzer: Situation keywords found (at, team). Stakes (six days) named.',
    T: 'Analyzer: "my job" detected, so the Task section passes.',
    A: 'Analyzer: 8 "I" words and 0 "we" words. Four verbs in a row.',
    R: 'Analyzer: metric found, plus result words (result, dropped, shipped, from).',
    L: 'Analyzer: reflection words (learned, now I). Total 18/20.'
  },
  compare: [
    ['We worked extra hours', 'Analyzer counts we, not I.', 'I asked him to pair, I drew the flow'],
    ['We delivered on time', 'No number detected.', 'Leo shipped a day early; reviews dropped from 5 rounds to 1'],
    ['(no task sentence)', 'Task keywords missing.', 'My job was to help him ship without doing it for him'],
    ['(no lesson)', 'Reflection keywords missing.', 'I learned that quiet usually means stuck'],
    ['13 seconds total', 'Too short to show judgement.', 'About 90 to 120 seconds with all five parts']
  ],
  weakScores: [2, 0, 0, 0], strongScores: [5, 5, 3, 5],
  rubricNotes: ['Analyzer rewards a situation plus a task: both found in the strong version.', 'Analyzer computes the share of I versus we: 0 percent vs 100 percent.', 'Strong has one before/after number; two numbers would reach 5.', 'Reflection words present twice: learned, now I.'],
  follow: [
    ['Can you give me a different example of the same skill?', 'Keep a second story ready for each theme. Reuse the skeleton, change the facts.', 'depth of your story bank'],
    ['That sounded rehearsed. Was it real?', 'Smile and add a real detail: "the first message I sent him was just: want to pair?"', 'authenticity'],
    ['What was the hardest part?', 'Have one honest struggle line prepared in every story.', 'honest reflection'],
    ['Walk me through the numbers.', 'Know how you measured: where the 5 rounds to 1 came from (the review tool history).', 'metric integrity']
  ],
  stepsTitle: 'The practice loop',
  stepsLabel: 'Practice loop',
  steps: [['Draft beats', 'Write 5 bullets per story, not a script.'], ['Say it aloud', 'Record voice or video, time it.'], ['Analyze', 'Count I vs we, find the number, check STAR.'], ['Score', 'Use the 4-part rubric, 0 to 5.'], ['Fix one thing', 'Change only the weakest score.'], ['Repeat live', 'Do a mock with a human or AI.']],
  stepsEnd: 'One fix per round. Five rounds beat one marathon session.',
  code: { lang: 'python', code: ANALYZER, run: true, title: 'Answer analyzer (runnable): I vs we, metric, STAR, time' },
  codeTitle: 'Answer analyzer',
  clues: ['You answer the same question differently each time (inconsistent)', 'Your answers run over 3 minutes (needs timing)', 'You hear "can you be more specific?" from mock interviewers', 'You say "we" more than "I"', 'You have only one or two stories for 10 question types', 'You sound memorised and fall apart when interrupted'],
  examples: [
    { title: 'Read the analyzer output', html: '<p>If it prints <code>I-words: 1 | we-words: 7</code>, circle every "we" in your text and ask "what did <i>I</i> do in that sentence?". Rewrite those lines with a verb: "I proposed", "I wrote".</p>' },
    { title: 'Build a story bank', html: '<p>Make a grid: rows are 6 stories (a conflict, a failure, a feedback, a team help, a launch, a hard decision); columns are the questions each can answer. One story usually fits 3 to 4 questions with a different emphasis.</p>' + H.table(['Story', 'Fits questions'], [['Migration outage', 'Failure, ownership, pressure, process improvement'], ['Review conflict with Marcus', 'Conflict, feedback, communication'], ['Coupon launch', 'Disagree and commit, risk, deadline'], ['Leo onboarding', 'Teamwork, mentoring, empathy']]) },
    { title: 'A 20-minute daily routine', html: '<p>Minutes 0 to 5: pick a random question. Minutes 5 to 8: answer aloud, recorded. Minutes 8 to 12: run the analyzer and rubric. Minutes 12 to 20: fix the weakest score, re-record. Do this for 10 days: you will have 10 recorded improvements.</p>' }
  ],
  deepDive: '<p><b>What senior interviewers listen for in a practised candidate:</b> flexibility. Can the story bend if they interrupt, ask for a different angle, or push on a number? A rehearsed script collapses; a rehearsed <i>skeleton</i> flexes. They also listen for <i>calibration</i>: do you know the strength of your own evidence ("I believe the fix saved about 60 hours, based on ticket counts")?</p><p><b>Limits of the analyzer:</b> keyword checks can be fooled, and a story full of "I" can still be arrogant. It cannot judge honesty, tone or structure. Use it as a smoke detector, not a judge. Real human feedback is always better.</p><p><b>Extending it:</b> add filler-word counts (um, like, you know), detect long sentences, and check that the result sentence contains a number. Keep it stdlib only so it runs anywhere.</p><p><b>Mock interview hygiene:</b> do at least two with real people, one with a stranger. Ask them to note your first 20 seconds, your longest ramble, and any claim they doubted.</p>',
  aiEra: '<p><b>What AI changes:</b> AI mock interviewers are available any hour, never get tired, and can role-play a skeptical manager. They also make everyone sound alike if you let them write your answers. The edge goes to people who use AI to <i>practise</i>, not to <i>script</i>.</p><p><b>Use AI as a partner:</b> A strong prompt: <code>You are a tough but fair engineering manager at a payments company. Ask me one behavioral question at a time. After each answer, ask one hard follow-up that digs into my personal role or a number. Do not give feedback until I type DONE; then score me 0 to 5 on situation, my actions (I vs we), result, reflection, and quote one sentence of mine that was vague.</code></p><p><b>Without sounding scripted:</b> (1) Practise from five bullets, never a full text. (2) Tell the same story to the AI three times and change the opening each time. (3) Ask it to interrupt. (4) Keep the quirks: a real name, a real number, a real feeling. (5) Always finish with a human mock. (6) Never paste company-confidential details into any tool.</p><p><b>What you must still own:</b> the true stories, and the judgement to know which one fits the question.</p>',
  problems: [pr({
    title: 'Score your own answer with the rubric', level: 'Easy', tags: ['practice', 'rubric'],
    q: 'Tell me about a time you helped a teammate who was struggling. (Then score yourself.)', ctx: 'Record yourself, run a word count, then give each of the four dimensions a score from 0 to 5.',
    listen: 'I versus we counts, one real number, five clear STAR parts, a reflection that changed a habit, and 90 to 120 seconds.',
    weak: 'We worked extra hours and finished the work. It was good teamwork.',
    why: 'Zero "I", zero metric, no task, no lesson, and only a few seconds long.',
    strong: 'At Brightcart a new teammate, Leo, was stuck and his pull request was blocked with six days left. As his buddy, my job was to help him ship without doing it for him. I asked him privately to pair, I drew the event flow, I wrote a half-page guide, and I let him drive the keyboard. As a result Leo shipped a day early and his next review dropped from five rounds to one. I learned that quiet usually means stuck, and now I write down onboarding gaps right after I help. Self-score: situation 5, my actions 5, result 4, reflection 5, total 19 of 20. Next improvement: add a second number, such as hours saved for the next new hire.',
    hints: ['Hint 1: Count your "I" and "we" words honestly.', 'Hint 2: Score each rubric line, then fix only the lowest one.', 'Hint 3: Time yourself: 225 to 300 words is about 90 to 120 seconds.'],
    mcq: { q: 'At 150 words per minute, about how long is a 300-word answer?', options: ['60 seconds', '120 seconds', '180 seconds', '300 seconds'], answer: 1, explain: '300 words / 150 words per minute = 2 minutes = 120 seconds.' },
    follow: ['Which rubric line is usually weakest for you?', 'How would you test the answer with a human?'], secs: 100
  })]
}));
// ===================== PRACTICE =====================
var MC = function (q, o, a, e) { return { q: q, options: o, answer: a, explain: e }; };

practice.push(pr({
  title: '30-second introduction for a recruiter', level: 'Easy', tags: ['intro'],
  q: 'Give me a quick introduction. I only have a few minutes.', ctx: 'Recruiter phone screen. Short version of present, past, future.',
  listen: 'Role, years, one result, what you want next, in 30 seconds or less.',
  weak: 'I am a software engineer and I have worked on many technologies and I am looking for new opportunities.',
  why: 'No scale, no result, no reason for this company.',
  strong: 'I am a backend engineer with four years of experience, now on the payments team at Fernwood Labs, where I own a refund service that handles about 40,000 refunds a day. Last year I cut failed refunds from 3.1 percent to 0.4 percent by redesigning retries. I am looking for a role with more design ownership on a larger platform, which is why your merchant payments team caught my eye.',
  hints: ['Hint 1: Role, years, one number.', 'Hint 2: One link to the target company.', 'Hint 3: 75 words is about 30 seconds.'],
  mcq: MC('How many words fit in 30 seconds at 150 wpm?', ['About 25', 'About 75', 'About 150', 'About 300'], 1, '150 wpm is 2.5 words per second, so 30 seconds is 75 words.'),
  follow: ['Now stretch it to 90 seconds.'], secs: 30
}));
practice.push(pr({
  title: 'Why are you leaving your current job?', level: 'Easy', tags: ['intro', 'motivation'],
  q: 'Why are you leaving your current company?', ctx: 'A cousin of "tell me about yourself". Never criticise the old team.',
  listen: 'A pull toward something, gratitude for the past, no blame, a link to the new role.',
  weak: 'My manager does not listen and the pay is bad and the work is boring.',
  why: 'All push and blame. Future managers imagine you saying it about them.',
  strong: 'I have learned a lot at Fernwood Labs, especially about payments correctness, and I am proud of the refund redesign. I have reached the point where the next level of scope I want, designing services across teams, is not available on the current roadmap. Your platform team has that scope, with merchants at much larger scale. So I am leaving for something I want, not away from something I dislike. I have told my manager and I will make sure the handover is clean.',
  hints: ['Hint 1: Pull, not push.', 'Hint 2: Thank the old place honestly.', 'Hint 3: Tie the pull to the new role.'],
  mcq: MC('Which reason is safest to give?', ['My boss is terrible', 'I want larger scope that your team offers', 'The pay is bad', 'I was bored'], 1, 'A pull toward growth fits the new role and blames nobody.'),
  follow: ['What if you were laid off?'], secs: 60
}));
practice.push(pr({
  title: 'A time you worked well in a team', level: 'Easy', tags: ['teamwork'],
  q: 'Tell me about a time you worked well in a team.', ctx: 'The risk is saying "we" the whole time. Pull out your own part.',
  listen: 'One personal contribution that lifted the whole team, and a result.',
  weak: 'Our team worked very well together on a big project and we all helped each other.',
  why: 'No specifics, no personal role, no outcome.',
  strong: 'Our four-person team at Brightcart had five days to launch a gift-card feature. I noticed we kept losing time in unplanned discussions, so I proposed a daily 15-minute sync with a written list of blockers. I also took on the tedious integration tests nobody wanted. We launched on day four with zero severe bugs, and the sync stayed as a team habit. I learned that a small routine is often the best help you can give a team.',
  hints: ['Hint 1: One thing you did for the group.', 'Hint 2: Pick the dull task you took.', 'Hint 3: Give a number for the result.'],
  mcq: MC('In a team story, what must you make clear?', ['What the team did', 'What you personally did', 'How friendly everyone was', 'How long it took'], 1, 'Interviewers hire you, so your own actions are the evidence.'),
  follow: ['What was hardest about the team?'], secs: 80
}));
practice.push(pr({
  title: 'What is your biggest weakness?', level: 'Easy', tags: ['failure', 'self-awareness'],
  q: 'What is your biggest weakness?', ctx: 'Choose a real, non-fatal weakness and show the system you built.',
  listen: 'Honesty, a real example, and a habit that keeps it under control.',
  weak: 'I am a perfectionist and I work too hard.',
  why: 'A humble-brag that tells them nothing.',
  strong: 'I used to wait too long before asking for help. Two years ago I lost three days on a build problem a teammate could have solved in ten minutes. Since then I use a 30-minute rule: if I am stuck for half an hour, I write down what I tried and ask. Last quarter this saved me about a day on a deployment issue. It is still a habit I have to watch when I am busy, so I ask my buddy to nudge me.',
  hints: ['Hint 1: Choose a real but non-critical weakness.', 'Hint 2: Give one example with a cost.', 'Hint 3: Show a rule you built.'],
  mcq: MC('Which weakness answer is strongest?', ['I care too much', 'I wait too long to ask for help, so I use a 30-minute rule', 'I have no weaknesses', 'I am bad at coding'], 1, 'It is real, small, and has a system as the fix.'),
  follow: ['How do you know the habit is working?'], secs: 60
}));
practice.push(pr({
  title: 'A teammate not pulling their weight', level: 'Medium', tags: ['conflict', 'teamwork'],
  q: 'Tell me about a time a teammate was not pulling their weight.', ctx: 'The trap is judging the person. Show curiosity first.',
  listen: 'Private talk, finding the cause, structured support, discretion, outcome.',
  weak: 'He was lazy so I reported him to the manager and he was removed.',
  why: 'Judgement, skipped conversation, no learning.',
  strong: 'On a four-person project at Brightcart, Omar missed two deadlines in a row, putting our release at risk. I wanted the work delivered and Omar treated fairly. I asked him for a private coffee and said I had noticed the delays and wanted to help. He told me he was handling a family emergency. I told my lead only that Omar needed a lighter load, not why. We split his tasks into smaller pieces and I took two of them. We shipped on time and Omar delivered the rest. A month later he thanked me. I learned to ask what is going on before deciding what is wrong.',
  hints: ['Hint 1: Start from curiosity, not blame.', 'Hint 2: Protect privacy.', 'Hint 3: Show a structured plan with sizes.'],
  mcq: MC('First step with a teammate who keeps missing deadlines?', ['Report them', 'Ask privately what is going on', 'Do their work silently', 'Ignore it'], 1, 'Understanding the cause comes before any escalation.'),
  follow: ['What if the problem had continued?'], secs: 105
}));
practice.push(pr({
  title: 'Disagreement with a tech lead about design', level: 'Medium', tags: ['disagreement', 'design'],
  q: 'Tell me about a time you disagreed with your tech lead on a design.', ctx: 'Show evidence, respect and a clean resolution.',
  listen: 'Prototype or data, alternative proposal, shared criteria, final decision handled well.',
  weak: 'My lead wanted microservices and I thought it was dumb, so I told him so and we used a monolith.',
  why: 'Insulting, no data, no criteria, and winning is the story.',
  strong: 'At Fernwood Labs, my tech lead Sam wanted to split our small search feature into three microservices. I worried about the extra operational work for a team of four. I asked Sam for a design review slot and brought a one-page comparison: three services meant three deploy pipelines and about 6 extra hours of maintenance a week by our estimate. I proposed a modular monolith with clean boundaries that we could split later. Sam added one criterion I had missed: independent scaling of indexing. We agreed on a monolith with the indexer as a separate worker. Deploy time stayed at 8 minutes, and the split was easy 6 months later. I learned to ask what criteria matter before I propose a solution.',
  hints: ['Hint 1: Use shared criteria like cost, risk, speed.', 'Hint 2: Show the lead added something good.', 'Hint 3: End with a result and a lesson.'],
  mcq: MC('Best way to settle a design disagreement?', ['Vote loudly', 'Write down shared criteria and compare options against them', 'Escalate immediately', 'Give up'], 1, 'Criteria move the argument from people to trade-offs.'),
  follow: ['What if your lead had insisted on microservices?'], secs: 115
}));
practice.push(pr({
  title: 'A missed deadline', level: 'Medium', tags: ['failure', 'ownership'],
  q: 'Tell me about a time you missed a deadline.', ctx: 'The key is early warning, a re-plan, and a prevention step.',
  listen: 'When you spotted the slip, who you told, the options you gave, and what you changed after.',
  weak: 'The deadline was unrealistic and others did not deliver, so we were late.',
  why: 'Blames others and has no ownership or learning.',
  strong: 'At Brightcart I estimated a reporting feature at three weeks, but halfway through I found the data export was far messier than I had assumed. I knew on day eight that I would be about a week late. I told my manager that same day with three options: cut the PDF export, add one engineer, or move the date by a week. We cut the PDF export and shipped the core report on time, with the PDF one week later. Afterwards I started adding a two-day spike to any estimate that touches an unfamiliar data source. My last four estimates were all within two days.',
  hints: ['Hint 1: Tell them when you noticed.', 'Hint 2: Offer options, not excuses.', 'Hint 3: Prevention should be an estimating habit.'],
  mcq: MC('When you see a deadline will slip, you should...', ['Wait and hope', 'Warn early with options', 'Work secretly overnight and say nothing', 'Blame the plan'], 1, 'Early warning with options keeps trust.'),
  follow: ['How do you estimate now?'], secs: 100
}));
practice.push(pr({
  title: 'Harsh feedback received in public', level: 'Medium', tags: ['feedback', 'composure'],
  q: 'Tell me about a time you received critical feedback in front of others.', ctx: 'Show composure, then private follow-up.',
  listen: 'How you stayed calm, what you said in the moment, and what you did later.',
  weak: 'He criticised my design in front of everyone and I got upset, but I let it go.',
  why: 'No action, no learning, and "let it go" hides the real story.',
  strong: 'In a design review at Fernwood Labs, a senior engineer, Nadia, said in front of ten people that my caching plan ignored cache invalidation. It stung, but I took a breath, said "good catch, can you say more?" and wrote down her points. That afternoon I thanked her privately and asked for 20 minutes. She was right: I had no plan for stale data. I added a time-to-live and an invalidation event, and sent the revised design the next morning. The design shipped with no stale-data bugs in the first quarter. I also told Nadia I would prefer to hear such points a day earlier, and she agreed to comment on drafts. I learned to separate the sting from the substance.',
  hints: ['Hint 1: Show a calm immediate reaction.', 'Hint 2: Follow up in private.', 'Hint 3: Ask for earlier feedback politely.'],
  mcq: MC('What is a good immediate response to sharp public feedback?', ['Argue back', 'Say thanks, ask a clarifying question, take notes', 'Leave the meeting', 'Stay silent and sulk'], 1, 'Staying curious in the moment lets you evaluate it later.'),
  follow: ['What if the feedback was unfair?'], secs: 110
}));
practice.push(pr({
  title: 'Conflict with a peer on another team', level: 'Medium', tags: ['conflict', 'cross-team'],
  q: 'Tell me about a conflict with someone outside your team.', ctx: 'No shared manager means influence, not authority.',
  listen: 'Understanding their incentives, a shared metric, a written agreement.',
  weak: 'The other team would not prioritise my request, so I escalated to the director.',
  why: 'Escalation as the first move and no empathy for their priorities.',
  strong: 'My team at Brightcart needed an API change from the identity team, who kept pushing it back. Instead of escalating, I asked their lead, Rosa, what her team was measured on. She told me they were focused on a security audit in 3 weeks. I offered to write the change myself under her team review, and to add tests for the audit area as a thank-you. She agreed. The change merged in 4 days instead of the 6 weeks they had quoted, and the audit tests helped them pass. I learned to find the other side\'s goal first and bring something that helps them too.',
  hints: ['Hint 1: Ask what the other team is measured on.', 'Hint 2: Offer value in both directions.', 'Hint 3: Escalation is a last step.'],
  mcq: MC('When you need something from another team, first...', ['Escalate to a director', 'Learn their priorities and offer help', 'Wait', 'Do it quietly yourself'], 1, 'Aligning with their goals makes the yes easy.'),
  follow: ['What if Rosa had said no?'], secs: 110
}));
practice.push(pr({
  title: 'A decision you disagreed with that turned out wrong', level: 'Hard', tags: ['disagree-and-commit', 'judgement'],
  q: 'Tell me about a time you disagreed with a decision, committed, and it went badly anyway.', ctx: 'The trap is "I told you so". The skill is helping fix it without blame.',
  listen: 'Commitment, no gloating, quick adaptation, a lesson on how you raise concerns.',
  weak: 'My manager chose the wrong vendor and it failed. I had warned him, so it was his fault.',
  why: 'Gloating, blame and no contribution to the fix.',
  strong: 'At Fernwood Labs, my manager Priya chose a third-party email vendor for a launch; I preferred our in-house sender because the vendor had a low sending limit. I raised it with a comparison of limits, Priya weighed the cost and still chose the vendor, and I committed. Two weeks after launch, the vendor throttled us and 8 percent of password-reset emails were delayed by up to 20 minutes. I did not say I told you so. I wrote a fallback that switched to our in-house sender when the queue passed 500, and shipped it in a day. Delays fell to under 1 minute. In the retrospective I owned that my first message could have shown the numbers more clearly. I learned that commitment includes helping repair the decision.',
  hints: ['Hint 1: Never gloat.', 'Hint 2: Show your fix, quickly.', 'Hint 3: Reflect on how you raised the concern.'],
  mcq: MC('The decision you opposed fails. What do you do?', ['Say I told you so', 'Help fix it and review how you voiced the concern', 'Ask to take over', 'Stay quiet'], 1, 'Adaptation without blame builds the most trust.'),
  follow: ['Would you push harder next time?'], secs: 115
}));
practice.push(pr({
  title: 'A failure that affected customers or money', level: 'Hard', tags: ['failure', 'incident'],
  q: 'Tell me about a failure that had a real cost to the business.', ctx: 'They want accountability at scale and systemic fixes. No excuses and no drama.',
  listen: 'Blast radius, time to detect, honest cause, communication, structural prevention.',
  weak: 'There was a bug in production but it was caused by a rushed deadline. We fixed it fast.',
  why: 'Shifts blame to the deadline, hides cost, no systemic fix.',
  strong: 'At Brightcart, I changed our discount rounding logic and merged it with a test only for the happy path. For six hours, some customers were charged up to 2 percent too much; about 1,900 orders were affected. A support agent spotted it first, which told me my alerts were weak. I owned it in the incident channel, rolled back in 25 minutes once confirmed, and refunded every affected order by the next day. In the blameless review I named my gap: I did not test boundary values. I added property-based tests for money code, a rule that any change to pricing needs a second reviewer, and an alert comparing charged versus expected totals. In the following year there were zero pricing incidents. I learned that money code deserves its own test bar.',
  hints: ['Hint 1: State the cost honestly with numbers.', 'Hint 2: Show detection weakness, not just the bug.', 'Hint 3: Give three layers of prevention.'],
  mcq: MC('What makes a failure story senior-level?', ['A dramatic outage', 'Systemic fixes and honest root cause', 'Blaming the process', 'A tiny bug'], 1, 'Seniors fix the system that let the failure through.'),
  follow: ['How did you rebuild trust?'], secs: 120
}));
practice.push(pr({
  title: 'Giving hard feedback that was badly received', level: 'Hard', tags: ['feedback', 'conflict', 'leadership'],
  q: 'Tell me about a time you gave critical feedback to a peer and they reacted badly.', ctx: 'Tests your skill in both giving feedback and repairing.',
  listen: 'Prepared specifics (situation, behaviour, impact), staying calm, repair, follow-up.',
  weak: 'I told a coworker his code was bad and he got angry, so I stopped giving feedback.',
  why: 'Vague feedback, gave up, and no repair.',
  strong: 'At Fernwood Labs, I told a peer, Jonas, in a message that his pull requests lacked tests, and he replied angrily that I was nit-picking. I realised my message was blunt and public. I called him the next day, said "I think I put that badly; I want to help us avoid weekend pages", and shared a specific example: last month a missing test caused a 40-minute outage. He admitted he had been under pressure. We agreed on a two-line test checklist and I offered to pair on the first two. His next five pull requests had tests, and incident count from his area dropped to zero for the quarter. I learned to give feedback privately, with a specific example and an offer to help.',
  hints: ['Hint 1: Own your part of the bad reaction.', 'Hint 2: Use situation, behaviour, impact.', 'Hint 3: Offer help, not only criticism.'],
  mcq: MC('Best structure for hard feedback?', ['Vague hint', 'Situation, behaviour, impact, then ask their view', 'Public call-out', 'Email the manager'], 1, 'SBI keeps it factual and open to dialogue.'),
  follow: ['What if he had continued to react badly?'], secs: 115
}));
practice.push(pr({
  title: 'Introduce yourself after a career gap or layoff', level: 'Hard', tags: ['intro', 'career-gap'],
  q: 'Tell me about yourself. I see a gap on your resume.', ctx: 'Be honest and forward-looking. Do not apologise or over-explain.',
  listen: 'Calm facts, what you did or learned during the gap, a clear direction.',
  weak: 'I was laid off and it was very hard and I could not find anything for a while, so I am just looking for any job.',
  why: 'Apologetic, desperate tone, no direction, no evidence of growth.',
  strong: 'I am a backend engineer with five years of experience, most recently on a logistics platform at Orchard Cloud, where I led the move of our routing service to an event-driven design that cut delivery-estimate errors by 35 percent. In March my team was affected by a company-wide layoff of 20 percent of staff. Since then I have used the time well: I completed a distributed-systems course, contributed two fixes to an open-source queue library, and built a small project that processes 5,000 events a second. I want to return to a team that works on large event-driven systems, which is exactly what your logistics platform does. I would be happy to go deeper on the routing migration.',
  hints: ['Hint 1: State the layoff in one calm sentence.', 'Hint 2: Show what you did since.', 'Hint 3: Go back to the future and fit.'],
  mcq: MC('How should you describe a layoff?', ['Apologise at length', 'One calm factual sentence, then move to what you did and want', 'Blame the company', 'Skip it'], 1, 'Layoffs are common; confident, brief and forward-looking works best.'),
  follow: ['Why did it take five months?'], secs: 100
}));
// ===================== QUIZ =====================
quiz.push(MC('What is the best structure for "Tell me about yourself"?', ['Birth to today in order', 'Present, past, future with a hook', 'Read the resume', 'Hobbies first'], 1, 'Present-past-future keeps it focused on the role and ends with a hook.'));
quiz.push(MC('Roughly how long should the intro answer be?', ['10 seconds', '60 to 90 seconds', '5 minutes', '10 minutes'], 1, 'About 90 seconds is about 225 words at 150 wpm.'));
quiz.push(MC('A conflict story where the teammate is "lazy and stupid" mostly shows...', ['Strong leadership', 'You judge people and lack empathy', 'Good technical depth', 'Honesty'], 1, 'Labels signal low empathy and make the interviewer wonder how you describe them.'));
quiz.push(MC('In a conflict, what is the step most people skip?', ['Pausing before replying', 'Sending an email', 'Winning the argument', 'Copying the manager'], 0, 'Pausing prevents heated replies and gives you time to listen.'));
quiz.push(MC('"Disagree and commit" means...', ['Argue forever', 'Voice concerns before a decision, support it fully after', 'Pretend to agree', 'Escalate every decision'], 1, 'You speak up early, then put full effort behind the decision.'));
quiz.push(MC('When is escalating over your manager\'s head most appropriate?', ['Any disagreement', 'Safety, legal or serious ethical harm, after telling them', 'When you are bored', 'Never'], 1, 'Serious harm justifies escalation; tell the manager first.'));
quiz.push(MC('Which is a humble-brag failure answer?', ['I deployed without a dry run', 'I work too hard and care too much', 'I missed a deadline by a week', 'I trusted a bad estimate'], 1, 'Fake weaknesses are obvious and tell the interviewer nothing.'));
quiz.push(MC('What share of a failure story should be about the fix and learning?', ['About 10%', 'About 25%', 'About 75%', '100% about the failure'], 2, 'Spend most of the time on recovery and prevention.'));
quiz.push(MC('The strongest "lesson" is...', ['I will try harder', 'Communication is important', 'I added a deploy check that blocks risky changes', 'It was not my fault'], 2, 'A system or habit change is concrete and testable.'));
quiz.push(MC('You get harsh feedback. What shows you are coachable?', ['Defending quickly', 'Asking for an example, making a change, and checking back', 'Saying you take feedback well', 'Ignoring it'], 1, 'Actions and closing the loop prove it.'));
quiz.push(MC('Helping a struggling teammate, what is the right size of help?', ['Do it for them', 'Pair, share a guide, then step back', 'Tell the team they are slow', 'Wait for the manager'], 1, 'Coach, then fade out, so they grow.'));
quiz.push(MC('Which rubric dimension does "we" language mostly hurt?', ['Reflection', 'Personal action', 'Timing', 'Hook'], 1, 'Interviewers cannot see your contribution behind "we".'));
quiz.push(MC('A result with no number is best fixed by...', ['Making up a large number', 'Using a defensible before and after or a count', 'Removing the result', 'Adding adjectives'], 1, 'Use a number you can explain how you measured.'));
quiz.push(MC('How do you keep AI-practised answers from sounding scripted?', ['Memorise the AI text', 'Practise from five bullet beats and keep real details', 'Use the same words every time', 'Avoid practising aloud'], 1, 'Skeletons flex; scripts break when interrupted.'));
quiz.push(MC('What is a "hook" at the end of an intro?', ['A joke', 'A teaser line pointing to a story you can tell', 'A question about salary', 'A thank-you'], 1, 'It steers the next question to your strong ground.'));

// ===================== INTERVIEW =====================
interview.push({ q: 'How do you structure your answer to "Tell me about yourself"?', level: 'B', a: '<p>I use Present, Past, Future in about 90 seconds. Present: my role, years and what I own, with one scale number. Past: one or two steps that explain how I got here, plus a single result with a number. Future: what I want next and why this company fits. I end with a hook, a short line pointing to a story I can go deeper on. I tailor the proof point to the job description and keep three lengths ready: 30 seconds, 90 seconds and 3 minutes.</p>', followUps: ['What would you cut for a 30-second version?', 'How do you tailor it to a front-end role?'] });
interview.push({ q: 'What do interviewers want from a conflict story?', level: 'B', a: '<p>They want to see emotional maturity and a real, fairly told disagreement. I show that I noticed my own frustration, paused, spoke privately, listened first, and found a shared goal. I describe the other person as reasonable with a different priority. I end with a measurable result and a habit I changed. I avoid stories where I just won, or where I ran to the manager first. Escalation only appears if talking failed or the stakes were serious.</p>', followUps: ['What if the other person refused to talk?', 'Give an example where you were partly wrong.'] });
interview.push({ q: 'Walk me through how you de-escalate a tense disagreement.', level: 'B', a: '<p>First I notice the emotion in myself and do not reply while heated. Then I ask for a short private conversation. I begin by asking what they are worried about and repeat it back so they feel heard. Then I name the goal we share, for example a safe release. After that we compare options against shared criteria, ideally with a quick test or data. We write down the decision and I follow up after a week to check that it is working.</p>', followUps: ['What do you do when the conflict is over text?', 'What if they escalate emotionally?'] });
interview.push({ q: 'Tell me what "disagree and commit" means to you and when it should NOT apply.', level: 'I', a: '<p>It means I give my honest view, with data, before a decision is made, and once the decision is made by the person who owns it, I support it with full effort rather than slow-walking. It should not apply to ethics, safety or legal issues, where I would raise it with my manager first and then escalate calmly if needed. It also should not mean silence: if the facts change, I bring them back respectfully. I like to add a tripwire, a measurable signal that would make us revisit.</p>', followUps: ['Give an example of a tripwire you used.', 'How is this different from just obeying?'] });
interview.push({ q: 'How do you disagree with someone more senior than you?', level: 'I', a: '<p>I do it privately, early and with evidence, framed as a question or a risk rather than a verdict: "Here is what worries me, and here is an option". I acknowledge they may have context I lack, like budget or customers. I make it easy to say yes to my alternative by showing cost and time. If they decide otherwise, I commit and add safeguards. I never undermine the decision afterwards, and I follow up with results, win or lose.</p>', followUps: ['What if the senior person gets defensive?', 'When would you go above them?'] });
interview.push({ q: 'What is your approach to a failure story, and what do you avoid?', level: 'B', a: '<p>I choose a real mistake I caused, with real cost but recoverable, from a year or two ago. I spend a quarter of the answer on the mistake and three quarters on containing it, telling people fast, fixing root cause and preventing a repeat with a system such as a checklist or automated check. I avoid humble-brags like perfectionism, blaming others, trivial mistakes, and vague lessons such as "communicate more". I give numbers for impact and for improvement.</p>', followUps: ['Give me a second, different failure.', 'How did you find out about the mistake?'] });
interview.push({ q: 'How do you handle critical feedback in the moment?', level: 'B', a: '<p>I stay quiet and take notes first, then thank the person and ask for a specific example so I understand the behaviour and impact. I do not defend or explain in the moment. I take time, often a day, to decide what is true, pick one to three small changes, practise for a few weeks, and then go back to the person to ask whether it improved. If I disagree with part of it, I say so calmly after reflecting, and I still act on the impact my behaviour had.</p>', followUps: ['Give an example of feedback you disagreed with.', 'How do you ask for feedback?'] });
interview.push({ q: 'How do you give difficult feedback to a peer?', level: 'I', a: '<p>I do it in private, soon after the event, using situation, behaviour and impact: what happened, what I saw, and what effect it had. I stay about the behaviour, not the person, and I ask for their view before suggesting changes. I offer concrete help, such as pairing on the next piece. If the reaction is bad, I stay calm, acknowledge any clumsy phrasing of mine and follow up later. I check in after a couple of weeks to see whether it has improved.</p>', followUps: ['What if they reacted angrily?', 'How is it different for a more senior peer?'] });
interview.push({ q: 'Tell me how you support a struggling teammate without taking over.', level: 'B', a: '<p>I notice signals first, like silence in standups or a stuck pull request. I ask privately and kindly, sharing my own stuck moments to make it safe. I try to find the real gap rather than the symptom, then help in a right-sized way: a one-hour pairing, a short guide or a split task, and let them drive. I check in briefly for a few days and then step back. I give them public credit and note the learning for the next person so the team gets leverage.</p>', followUps: ['What if they do not want help?', 'How do you balance this with your own deadlines?'] });
interview.push({ q: 'What are the most common mistakes candidates make in behavioral rounds?', level: 'I', a: '<p>The top ones are saying "we" instead of "I", giving stories with no numbers, choosing safe stories with no real conflict, blaming others, humble-brag weaknesses, and ending without reflection. Also rambling past three minutes, memorising scripts that break on interruption, and using one story for every question. A good fix is a story bank of six to eight stories with five-bullet skeletons, practised aloud with a timer and a rubric.</p>', followUps: ['How many stories should you prepare?', 'How do you reuse one story for several questions?'] });
interview.push({ q: 'How do you use AI to practise behavioral interviews without sounding scripted?', level: 'I', a: '<p>I use AI as a hard interviewer, not a ghostwriter. I give it the job post and ask it to ask one question at a time, interrupt, and dig into my personal role and numbers, withholding feedback until the end. I practise from five-bullet skeletons, not full text, and change my opening each time. I keep real details such as names, numbers and a feeling. I also do human mocks, because AI cannot judge my tone, and I never paste confidential company data into it.</p>', followUps: ['What would an interviewer notice in an AI-polished answer?', 'What should you never ask AI to do?'] });
interview.push({ q: 'A senior interviewer pushes back: "Was that really you, or the team?" How do you respond?', level: 'A', a: '<p>I answer concretely: "The team did the delivery; here are the parts I personally did", then list two or three actions with specifics, like what I wrote, decided or proposed, and what I asked others to do. I name teammates for their contributions, which shows honesty. I can describe the decision I made at a fork and why. If some credit is shared, I say so. The goal is to make my part verifiable without erasing the team.</p>', followUps: ['How would your teammate describe your contribution?', 'What would have happened if you had not been there?'] });
interview.push({ q: 'How do you choose which story to tell for a given behavioral question?', level: 'A', a: '<p>I keep a story bank mapped to themes: conflict, failure, feedback, teamwork, disagreement, ambiguity, ownership. When a question arrives, I listen for the underlying skill being tested, not the exact words, pick the story with the strongest evidence for that skill, and angle the emphasis. For the company, I choose the story closest to their values or the role level. I avoid repeating a story within the same loop unless asked, and I always keep a backup for follow-ups like "give me another example".</p>', followUps: ['How do you handle a question you have no story for?', 'How do you avoid repeating yourself across rounds?'] });

registerModule({
  id: 'beh02',
  title: 'Behavioral Bank I: Teamwork, Conflict & Failure',
  intro: '<p>Most candidates prepare hard for coding rounds and then improvise the behavioral ones. That is a mistake: these rounds often decide the final offer. This module gives you a <b>bank of answers for the six classic questions</b>: tell me about yourself, conflict with a teammate, disagreement with your manager, your biggest failure, handling critical feedback, and helping a struggling teammate. For each one you get what interviewers really test, red flags, a weak and a strong sample answer in STAR form with annotations, and the follow-ups that catch people out. A final lab gives you a rubric and a runnable answer analyzer so you can score your own stories, and shows how to practise with AI interviewers without sounding scripted.</p>',
  goals: ['Deliver a 90-second "Tell me about yourself" using present, past and future with a hook', 'Tell a conflict story that shows calm, curiosity and a measurable result', 'Explain and show "disagree and commit" with data, an alternative and full commitment', 'Own a failure honestly and show a system-level prevention, not a humble-brag', 'Turn critical feedback into a visible change and close the loop', 'Score your own answers with a 4-part rubric and an analyzer, and practise with AI without sounding scripted'],
  prereqs: 'Behavioral Module 1 (Interview Loops, Resume &amp; the STAR Method). You should know what STAR stands for (Situation, Task, Action, Result). No coding is required.',
  hours: 8,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
