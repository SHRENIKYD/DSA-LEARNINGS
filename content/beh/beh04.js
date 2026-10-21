(function () {
var topics = [], practice = [], quiz = [], interview = [];

// Compact builder for scenario problems (behavioral: brute = weak answer, solution.approach = strong model answer)
function P(o) {
  var pad = function (t, n, add) { return t.replace(/<[^>]*>/g, '').length >= n ? t : t + ' ' + add; };
  o.h = o.h.map(function (x) { return pad(x, 45, 'Say it out loud as you think it through.'); });
  o.bw = pad(o.bw, 45, 'The interviewer gets no evidence of structured thinking.');
  o.mq[3] = pad(o.mq[3], 25, 'Show your reasoning aloud.');
  return {
    title: o.t, level: o.lv, tags: o.tags, companies: o.co || ['Google', 'Amazon', 'Meta'],
    statement: o.st, constraints: o.cons || '<p>Time to answer: about 30-60 seconds out loud. Use simple words, one idea per sentence.</p>',
    example: o.ex,
    brute: { why: o.bw, code: { lang: 'text', code: o.bc } },
    mcq: { q: o.mq[0], options: o.mq[1], answer: o.mq[2], explain: o.mq[3] },
    hints: o.h,
    solution: { approach: o.ap, code: o.sc ? { lang: 'text', code: o.sc } : undefined, complexity: o.cx || '<p>Cost of the answer: about 45 seconds of speaking. Benefit: the interviewer sees a calm, structured, coachable engineer.</p>', followUps: o.fu }
  };
}
// Reusable viz builder: queue of dialogue lines, revealed one at a time
function dialogueViz(title, scripts, defaultKey) {
  return {
    title: title, input: defaultKey, inputLabel: 'Pick a script: ' + Object.keys(scripts).join(' / '),
    gen: function (input) {
      var k = String(input).trim().toLowerCase();
      if (!scripts[k]) throw new Error('Type one of: ' + Object.keys(scripts).join(', '));
      var s = scripts[k], frames = [], items = [], hl = {};
      frames.push({ narr: '<b>' + s.intro + '</b> Watch each line get added to the conversation (front = first said).', parts: [{ type: 'queue', label: 'Conversation', items: ['(start)'], frontLabel: 'first', backLabel: 'latest' }] });
      for (var i = 0; i < s.lines.length; i++) {
        items.push(s.lines[i][0]); hl = {}; hl[items.length - 1] = s.lines[i][1] === 'g' ? 'ok' : (s.lines[i][1] === 'r' ? 'bad' : 'cur');
        frames.push({ narr: s.lines[i][2], parts: [{ type: 'queue', label: 'Conversation', items: items.slice(), hl: hl, frontLabel: 'first', backLabel: 'latest' }] });
      }
      frames.push({ narr: s.verdict, parts: [{ type: 'text', html: s.verdict }] });
      return frames;
    }
  };
}
topics.push({
  title: 'Clarifying Questions: Inputs, Constraints, Edge Cases, Output',
  analogy: `<p>A taxi driver asks <b>"Where to?"</b> before moving. A bad driver speeds off and says "I thought you meant the airport." Clarifying questions are your "Where to?" — one minute of asking saves twenty minutes of driving the wrong way.</p>`,
  explain: `<p>Interviewers <b>deliberately</b> give short, fuzzy problems. They want to see if you can turn a fuzzy ask into a clear one — that is half of real engineering. So the first 3-5 minutes are for <b>questions</b>, not code.</p>
  <p>Use a simple checklist, remembered as <b>I-C-E-O</b>:</p>
  <ul>
  <li><b>I - Inputs:</b> What type? Integers or strings? Sorted? Can it have duplicates? Can it be empty or null?</li>
  <li><b>C - Constraints:</b> How big can N be? (10 items vs 10 million changes the whole answer.) Memory limits? Is speed or simplicity more important?</li>
  <li><b>E - Edge cases:</b> Empty input, one element, all same, negative numbers, overflow, no answer exists.</li>
  <li><b>O - Output:</b> Return values or indexes? One answer or all answers? What if there are many valid answers? What to return if none?</li>
  </ul>
  <p>Then <b>repeat the problem back in your own words</b> with one tiny example. "So for [2,7,11,15] and target 9, I return indexes [0,1]. Right?" This one sentence catches many misunderstandings early.</p>
  ${H.table(['Question you ask', 'Why it matters', 'Answer changes your plan how?'], [['Is the array sorted?', 'Sorted lets you use two pointers', 'O(1) space instead of a hash map'], ['How large is N?', 'Sets the allowed complexity', 'N=10<sup>5</sup> kills O(N<sup>2</sup>)'], ['Duplicates allowed?', 'Same value twice?', 'Map overwrite bug risk'], ['Exactly one answer?', 'Can I stop at the first match?', 'Return early vs collect all']])}
  <p><span class="c-r">Do not</span> ask 15 questions like an interrogation. Ask the 4-6 that change your design, and <b>say why</b>: "I ask because if it's sorted I can avoid extra memory."</p>`,
  clues: ['Problem statement is one or two lines long - ambiguity is intentional', '"Design a ..." with no numbers - ask for scale (users, QPS, data size)', 'The statement says "array" but not sorted or not - ask', '"Return the answer" - ask index vs value, one vs all, what if none', 'Interviewer says "whatever you think is reasonable" - state your assumption out loud and move on', 'Input sizes missing - the first clue to the target complexity'],
  code: [`CLARIFY CHECKLIST (say it, do not read it)
1. Repeat the problem in my words + one tiny example
2. Input: type? sorted? duplicates? empty/null? negatives?
3. Size: how big is N? (decides O(N^2) vs O(N log N) vs O(N))
4. Output: index or value? one or all? what if no answer?
5. Assumption: "I will assume X; tell me if that is wrong."
6. Confirm: "Great, so the plan is..." then move on`],
  codeTitle: ['Clarifying checklist (spoken)'],
  viz: {
    title: 'Clarifying-question checklist: asked (green) vs missed (red)',
    input: '1 2 4 5',
    inputLabel: 'Which questions did the candidate ask? (numbers 1-8, space separated)',
    gen: function (input) {
      var qs = [
        ['1', 'What type is the input (ints? strings?)', 'Input'],
        ['2', 'How large can N be?', 'Constraints'],
        ['3', 'Duplicates or negatives allowed?', 'Input'],
        ['4', 'Empty or single-element input?', 'Edge case'],
        ['5', 'Return index or value? One answer or all?', 'Output'],
        ['6', 'What if no answer exists?', 'Edge case'],
        ['7', 'Is the input sorted? Can I modify it?', 'Input'],
        ['8', 'Is speed or memory more important?', 'Constraints']
      ];
      var asked = String(input).trim().split(/[\s,]+/).filter(function (x) { return x !== ''; });
      for (var a = 0; a < asked.length; a++) { var n = Number(asked[a]); if (!(n >= 1 && n <= 8)) throw new Error('Use numbers 1 to 8, e.g. 1 2 4 5'); }
      var frames = [], rows = [], hl = {};
      frames.push({ narr: 'Problem: <b>"Given numbers and a target, find two that add up to the target."</b> Eight smart questions exist. Let us see which ones got asked.', parts: [{ type: 'table', label: 'Questions we could ask', columns: ['#', 'Question', 'Category', 'Status'], rows: qs.map(function (q) { return [q[0], q[1], q[2], '?']; }) }] });
      var okCount = 0;
      for (var i = 0; i < qs.length; i++) {
        var was = asked.indexOf(qs[i][0]) >= 0;
        if (was) okCount++;
        rows.push([qs[i][0], qs[i][1], qs[i][2], was ? 'ASKED' : 'MISSED']);
        hl[i] = was ? 'ok' : 'bad';
        var full = rows.concat(qs.slice(i + 1).map(function (q) { return [q[0], q[1], q[2], '?']; }));
        frames.push({ narr: was ? 'Question ' + qs[i][0] + ' was asked - <span class="c-g">good</span>. It tells you about the <b>' + qs[i][2].toLowerCase() + '</b>.' : 'Question ' + qs[i][0] + ' was <span class="c-r">missed</span>. Risk: you may build the wrong thing for the <b>' + qs[i][2].toLowerCase() + '</b>.', parts: [{ type: 'table', label: 'Checklist', columns: ['#', 'Question', 'Category', 'Status'], rows: full, hl: JSON.parse(JSON.stringify(hl)) }, { type: 'vars', vals: { asked: okCount, missed: (i + 1) - okCount }, hl: { asked: 'ok', missed: 'bad' } }] });
      }
      frames.push({ narr: okCount >= 5 ? '<span class="c-g">Strong:</span> ' + okCount + ' of 8 covered - a clear picture before coding.' : okCount >= 3 ? '<span class="c-y">Okay:</span> ' + okCount + ' of 8. Add the output and edge-case questions next time.' : '<span class="c-r">Weak:</span> only ' + okCount + ' of 8. You are coding on guesses.', parts: [{ type: 'table', label: 'Final', columns: ['#', 'Question', 'Category', 'Status'], rows: rows, hl: hl }] });
      return frames;
    }
  },
  examples: [
    { title: 'Good: 60 seconds of clarifying (Top-K Frequent)', html: `<p>Prompt: "Return the k most frequent elements."</p>${H.table(['You say', 'Interviewer', 'What you learned'], [['"Are the elements integers? Can they be negative?"', 'Integers, yes negatives too.', 'Cannot use value as array index'], ['"How big is the array?"', 'Up to 10<sup>5</sup>.', 'Need better than O(N<sup>2</sup>)'], ['"If two elements tie, any order is fine?"', 'Yes.', 'No tie-break code needed'], ['"Is k always valid, 1 to number of distinct?"', 'Yes.', 'Skip error handling']])}<p>Four questions, 45 seconds, and the design is half-decided.</p>` },
    { title: 'Poor: zero questions', html: `<p>Prompt: "Return the k most frequent elements." Candidate: "Okay!" and starts writing a sort. At minute 12 the interviewer says "the data is a stream of 10 million items." Sorting needs all of it in memory, so the plan fails and the candidate must restart with 33 minutes left.</p><p><span class="c-r">Interviewer feedback:</span> "Dove into code without understanding constraints. Did not ask about scale."</p>` },
    { title: 'Poor: interrogation', html: `<p>Candidate asks 14 questions in a row, including "what language is the interviewer's favorite?" and "is it Java 17?" Ten minutes gone, no plan. Questions must <b>change your design</b>; otherwise state an assumption and move on.</p><p>Fix: "I'll assume integers and N up to 10<sup>5</sup> - tell me if that's wrong."</p>` },
    { title: 'Assumption instead of a question', html: `<p>Interviewer shrugs: "Up to you." Say: <b>"I'll assume the input fits in memory, duplicates are possible, and I return any valid answer. I'll flag these in comments so they're easy to change."</b> Stating assumptions is a positive signal, not a weakness.</p>`, code: `Assumptions I'm making (stated aloud):\n- input fits in memory\n- duplicates possible\n- any valid answer accepted\n- return [] when no answer` }
  ],
  deepDive: `<p><b>What the interviewer writes in feedback.</b> Typical lines: "Clarified requirements before coding" (positive), "Jumped straight to implementation" (negative), "Asked rote questions that did not influence the solution" (neutral-negative). The scoring bucket is usually called <i>problem solving</i> or <i>communication</i>, and clarifying questions feed both.</p>
  <p><b>Questions that change the algorithm</b> beat questions that change nothing. Sortedness -> two pointers or binary search. Small value range -> counting array. Streaming input -> cannot sort, need heap or sketch. Many queries on the same data -> pre-compute once. Memorise those five "design switches" and your questions will always be useful.</p>
  <p><b>Signalling you are done asking.</b> Close the loop: "That's all I need. To summarise: integers, N up to 10<sup>5</sup>, return indexes, exactly one answer. I'll start with the simple approach." It gives the interviewer a chance to correct you and marks a clean phase change.</p>
  <p><b>Adversarial interviewers.</b> Some answer "you tell me" to everything. That is a test of judgment. Pick the most reasonable option, say it, and carry on. Some interviewers add a constraint <i>later</i> on purpose ("now it doesn't fit in memory"); that is a follow-up, not proof your early questions failed.</p>`,
  aiEra: `<p><b>What AI changes:</b> In AI-assisted formats (e.g. rounds where an assistant is available in the editor) the prompt may be even more vague on purpose, because the assistant can already write boilerplate. Clarifying becomes <i>more</i> valuable: the human who frames the problem correctly gets better output from the AI too.</p>
  <p><b>Use AI as a practice partner:</b> <code>Act as an interviewer. Give me a one-line coding problem. Do not answer my questions until I ask them. Score me on I-C-E-O.</code></p>
  <p><b>Where AI goes wrong:</b> if you paste a vague prompt into an assistant it silently picks assumptions (usually "small sorted array") and writes confident code. <b>What you must still own:</b> the habit of saying assumptions out loud. In any round that allows AI, ask the interviewer first what is allowed, then still do your clarifying questions before prompting.</p>`,
  problems: [
    P({ t: 'Clarify a Vague Prompt: "Design a Rate Limiter" (spoken)', lv: 'Easy', tags: ['clarifying', 'design'],
      st: `<p>The interviewer says only: <b>"Design a rate limiter."</b> You have 90 seconds. What do you say before drawing anything?</p>`,
      ex: `<p>Good opener sounds like: "Who is limited - users, IPs, API keys? Per-second or per-minute? One server or distributed? Hard reject or soft throttle?"</p>`,
      bw: `<p>It starts drawing boxes with no scope. Rate limiters vary a lot (client-side vs gateway, fixed window vs token bucket), so the interviewer cannot tell if you chose well or got lucky.</p>`,
      bc: `"Sure. I'll use Redis and a token bucket." [starts drawing]`,
      mq: ['Best first move for a vague design prompt?', ['Pick Redis and start drawing', 'Ask 4-5 scope questions and state assumptions', 'Ask 20 questions', 'Say it is too vague'], 1, 'A few scope questions that change the design, plus stated assumptions, show structure without stalling.'],
      h: ['<p>Hint 1: Ask WHO and WHAT is limited, and HOW STRICT.</p>', '<p>Hint 2: Ask for scale: requests per second, number of users, one region or many.</p>', '<p>Hint 3: Close with "I will assume ..., correct me" and restate the goal in one line.</p>'],
      ap: `<p>Model answer: "Before I design, let me narrow the scope. First, what are we limiting - requests per user, per IP, or per API key? Second, what is the rough scale - say 1 million users and 50K requests per second at peak? Third, is it okay to be approximate under a few percent, or must it be exact? Fourth, should rejected calls get a clear 429 with a retry-after header? Fifth, one region or multi-region? I will assume per API key, 50K QPS, exact within 1-2 percent, 429 with retry-after, single region first and multi-region as a deep dive. So the goal in one line: protect backend services from any single client sending too much traffic, with low added latency. Does that match what you had in mind?" This takes under a minute, defines scope, and ends with a checkpoint.</p>`,
      fu: ['What if the interviewer says "you decide"?', 'Which question would you drop if short on time?'] })
  ]
});
topics.push({
  title: 'Thinking Aloud Without Rambling & Brute Force First, Then Optimize',
  analogy: `<p>Think of a GPS. It says <b>"In 200 metres, turn left"</b> - short, timely, useful. It does not read the whole map out loud, and it never goes silent for ten minutes. Your voice in an interview should be like a GPS: a short update at every turn, never silence, never a flood.</p>`,
  explain: `<p>An interviewer cannot read your mind. If you sit silently for 4 minutes they only see "stuck". If you speak every random thought they see "lost". The target is <b>structured thinking out loud</b>.</p>
  <p>The simple pattern is <b>"state - because - next"</b>:</p>
  <ul><li><b>State</b> what you are doing: "I'm looking at the brute force first."</li><li><b>Because</b>: "since it's the easiest to prove correct."</li><li><b>Next</b>: "then I'll look for repeated work to remove."</li></ul>
  <p>Keep each chunk to <b>one or two sentences</b>, then pause for 2 seconds. Pauses are fine; the interviewer can jump in.</p>
  <p><b>Brute force first, always.</b> It shows you can solve the problem, gives you a correct baseline, and gives you something to improve. The 4-step ladder:</p>
  ${H.table(['Step', 'You say', 'Time'], [['1. Brute force', '"The simple way is to try every pair. That is O(N<sup>2</sup>) time, O(1) space."', '1 min'], ['2. Find the waste', '"For each number I rescan the array to find its partner - repeated work."', '1 min'], ['3. Better idea', '"If I remember numbers I have seen, the lookup is O(1)."', '1 min'], ['4. Confirm + cost', '"One pass with a hash map: O(N) time, O(N) space. Shall I code it?"', '30 sec']])}
  <p>Do <b>not</b> code the brute force fully unless asked. Describe it, give its cost, and ask: "Should I code this, or move to the optimized one?" Many interviewers say go optimize.</p>
  <p><span class="c-r">Rambling signs:</span> saying "um, so, like, basically" repeatedly, restarting the same idea three times, explaining things the interviewer clearly knows. <span class="c-g">Fix:</span> write 2-3 bullet notes on the shared editor and speak from them.</p>`,
  clues: ['"Can you do better?" - they are asking for the optimized step, so you should already have stated the brute force', 'Interviewer goes quiet while you are silent - they are waiting for a signal; say what you are thinking', '"Walk me through your thinking" - give state-because-next, not a monologue', 'Your first idea is O(N<sup>2</sup>) and N is 10<sup>5</sup> - name the cost, then look for repeated work', 'You see nested loops - ask "what am I recomputing?"'],
  code: [`# Spoken template (copy this rhythm)
1. "Let me restate: ..."                    (10 s)
2. "Brute force: ... O(?) time, O(?) space." (30 s)
3. "The waste is ..."                         (20 s)
4. "Better idea: ... because ..."            (30 s)
5. "Complexity now: ... Trade-off: ..."       (20 s)
6. "Does this approach sound good before I code?"`],
  codeTitle: ['Think-aloud template'],
  viz: [{
    title: 'Brute force to optimal: how many steps are saved?',
    input: '2 7 11 15 3 18 | 21',
    inputLabel: 'Numbers, then | and the target',
    gen: function (input) {
      var parts = String(input).split('|');
      if (parts.length !== 2) throw new Error('Format: numbers | target, e.g. 2 7 11 15 | 9');
      var a = parts[0].trim().split(/\s+/).map(Number), t = Number(parts[1]);
      if (!a.length || a.some(isNaN) || isNaN(t)) throw new Error('Use integers only');
      if (a.length > 12) throw new Error('At most 12 numbers');
      var brute = 0, bi = -1, bj = -1, i, j;
      outer: for (i = 0; i < a.length; i++) for (j = i + 1; j < a.length; j++) { brute++; if (a[i] + a[j] === t) { bi = i; bj = j; break outer; } }
      var seen = {}, hashSteps = 0, hi = -1, hj = -1;
      for (i = 0; i < a.length; i++) { hashSteps++; if (seen[t - a[i]] !== undefined) { hi = seen[t - a[i]]; hj = i; break; } seen[a[i]] = i; }
      var steps = ['1. Say brute force', '2. Cost O(N^2)', '3. Spot the waste', '4. Idea: remember seen', '5. Hash map O(N)', '6. State trade-off'];
      var narrs = [
        'Step 1 - <b>state the brute force</b>: "Check every pair." Simple and obviously correct.',
        'Step 2 - <b>say its cost</b>: O(N<sup>2</sup>) time, O(1) space. With ' + a.length + ' numbers this run used <b>' + brute + '</b> pair checks.',
        'Step 3 - <b>find the waste</b>: for each number we re-scan the rest of the array just to find its partner (target - x).',
        'Step 4 - <b>better idea</b>: store numbers already seen; then asking "have I seen target - x?" is a single lookup.',
        'Step 5 - <b>new cost</b>: one pass, the same input needed only <b>' + hashSteps + '</b> lookups. O(N) time.',
        'Step 6 - <b>trade-off</b>: we paid O(N) extra memory to save time. Say it before they ask.'
      ];
      var frames = [];
      for (var s = 0; s < steps.length; s++) {
        var hl = {}; for (var k = 0; k < s; k++) hl[k] = 'done'; hl[s] = 'cur';
        var parts2 = [{ type: 'queue', label: 'What you say, in order', items: steps, hl: hl, frontLabel: 'first', backLabel: 'last' }];
        if (s >= 1) parts2.push({ type: 'bars', label: 'Work done on this input (brute vs hash)', values: [brute, hashSteps], texts: [String(brute), String(hashSteps)], idxLabels: ['brute', 'hash map'], hl: { 0: s >= 4 ? 'bad' : 'cur', 1: s >= 4 ? 'ok' : '' } });
        frames.push({ narr: narrs[s], parts: parts2 });
      }
      return frames;
    }
  }, dialogueViz('Rambling vs structured thinking aloud', {
    poor: { intro: 'Poor: rambling and silence.', lines: [['"Um... so... hmm"', 'r', '<span class="c-r">Filler words</span> with no content. The interviewer learns nothing.'], ['(4 min silence)', 'r', 'Long silence: the interviewer cannot tell stuck from thinking.'], ['"Maybe sort? or tree? or DP?"', 'r', 'Listing techniques at random shows guessing, not reasoning.'], ['"Okay I will just code something"', 'r', 'Starting code without an agreed plan.']], verdict: '<b>Feedback:</b> "Hard to follow the thought process. Needed repeated prompting."' },
    good: { intro: 'Good: structured thinking aloud.', lines: [['"Restating: find two numbers = target"', 'g', 'One-line restatement, checks understanding.'], ['"Brute: all pairs, O(N^2)"', 'g', 'Baseline with its cost.'], ['"Waste: rescanning for partner"', 'g', 'Names the exact inefficiency.'], ['"Idea: hash map of seen, O(N)"', 'g', 'Improvement tied to the waste.'], ['"OK to code this?"', 'g', 'Checkpoint before coding.']], verdict: '<b>Feedback:</b> "Clear communicator, reached the optimal on their own, easy to follow."' }
  }, 'good')],
  examples: [
    { title: 'Brute -> optimal on Top-K Frequent (spoken)', html: `<p>"Simple way: count each value, sort all distinct values by count, take first k. Counting is O(N), sort is O(D log D) where D is distinct values. That's fine, but <b>we sort everything just to keep k</b> - wasted work. Better: bucket by frequency. A value can appear at most N times, so make N+1 buckets; walk from the highest bucket down until I have k. That's O(N) time, O(N) space. Alternative: min-heap of size k gives O(N log k) with less memory - I'll mention it as a trade-off."</p>` },
    { title: 'Narrating while stuck (what to say)', html: `<p>Bad: silence. Good: <b>"I'm trying to avoid the second loop. I know I need to find 'target minus x' quickly. I'm thinking about what structure gives fast lookup... a set or map. Let me test that idea on the example."</b> You show direction even without the answer.</p>` },
    { title: 'Cut the rambling with the 30-second rule', html: `<p>If you have been talking for 30 seconds without the interviewer able to reply, stop and ask: <b>"Does that make sense so far?"</b> Rambling is usually a monologue with no checkpoint.</p>${H.table(['Instead of', 'Say'], [['"So, um, basically what I am thinking is, like, maybe, we could..."', '"Option A is X, option B is Y. I prefer A because Z."'], ['(explains for 3 minutes)', '(2 sentences) "Want me to go deeper or code it?"'], ['"I do not know"', '"I do not know this one directly, but here is how I would approach it..."']])}` }
  ],
  deepDive: `<p><b>Why brute force first scores points.</b> Many rubrics reward <i>approach evolution</i>, not just "found optimal immediately": can the candidate reason from naive to efficient, naming the bottleneck? Jumping straight to the optimal can look memorised, and the interviewer then asks "why does this work?" and you cannot explain. Starting from brute force gives you the story that proves understanding.</p>
  <p><b>Knowing when to skip.</b> If the brute force is obvious and silly (e.g. try all subsets of 40 items), mention it in one sentence and move on. If the problem is a classic and you get the optimal instantly, still say "naively this is O(N<sup>2</sup>), but..." in a sentence. Never present a memorised solution as new discovery - interviewers can tell, and honesty ("I've seen this pattern before") is rated well.</p>
  <p><b>A rule of thumb for speech.</b> Say more about why (because, so) than about what the code does. Narrating "now I write a for loop" adds nothing - say why the loop is shaped that way.</p>
  <p><b>Written notes help.</b> In virtual rounds, type 3-line comments at the top of the editor: the approach, complexity, and edge cases. They keep you on track and double as evidence of structure.</p>`,
  aiEra: `<p><b>What AI changes:</b> Candidates now arrive with polished, AI-generated solutions memorised. Interviewers respond by asking "why?" more and by watching for reasoning that evolves naturally. Thinking aloud is the best evidence that the ideas are yours.</p>
  <p><b>Use AI as a partner:</b> <code>Listen to my explanation of Top-K Frequent below. Mark each sentence as clear, vague, or rambling. Suggest a 30-second version.</code> Record yourself, transcribe, and paste.</p>
  <p><b>In AI-allowed rounds</b> the narration changes: say what you are asking the AI and why ("I'll ask it for a test generator, not the solution"), then <b>read and challenge its output out loud</b>. Silent copy-paste is the new "silence". <b>What you must still own:</b> the plan, the complexity claim, and the explanation of every line you keep.</p>`,
  problems: [
    P({ t: 'Explain Brute Force to Optimal for Top-K Frequent in 60 Seconds', lv: 'Medium', tags: ['brute force', 'think aloud', 'top-k'],
      st: `<p>You are given: "Return the k most frequent elements of an integer array." Deliver the spoken walk from brute force to optimized in about 60 seconds, including costs and one trade-off.</p>`,
      ex: `<p>Input [1,1,1,2,2,3], k = 2 -> [1, 2]. Say why the optimization is possible, not just what it is.</p>`,
      bw: `<p>Memorised answer: "Use a heap." No baseline, no reason, no cost. The interviewer cannot tell whether you understand why.</p>`,
      bc: `"I would use a heap. Heap of size k. Done."`,
      mq: ['Why mention the sort-based approach first?', ['To waste time', 'It is a correct baseline and exposes the wasted work (sorting everything to keep k)', 'Heaps are banned', 'Interviewers require three solutions'], 1, 'Baseline plus named waste shows reasoning from naive to better.'],
      h: ['<p>Hint 1: Start with count + sort. Say its cost.</p>', '<p>Hint 2: Name the waste: sorting all D distinct values when you only need the top k.</p>', '<p>Hint 3: Offer heap O(N log k) and bucket O(N); compare memory and simplicity.</p>'],
      ap: `<p>Model answer: "First, the simple approach: count frequencies in a hash map, that's O(N). Then sort the distinct values by count and take the first k. Sorting costs O(D log D), where D is the number of distinct values, so total O(N + D log D), space O(D). It's correct, but we sort everything just to keep k items, which is the wasted work. Option one: a min-heap of size k. Push each (count, value), pop when size exceeds k. That's O(D log k), and it uses O(k) extra beyond the map, which is great when k is small. Option two: bucket sort by frequency. A count can't exceed N, so I make N+1 buckets, drop each value into buckets[count], and read from the top bucket down until I have k values. That's O(N) time and O(N) space, no log factor. I'd pick buckets if I want the best time, heap if memory or streaming matters. Which direction would you like me to code?" Total about 55 seconds, ends with a checkpoint.</p>`,
      fu: ['What if elements arrive in a stream?', 'How would you break ties deterministically?'] })
  ]
});
topics.push({
  title: 'Trade-offs and Testing Your Own Code (Dry Run + Edge Cases)',
  analogy: `<p>A pilot never takes off without a <b>pre-flight checklist</b>, even after flying 1000 times. A dry run is your pre-flight check: walk the code with a tiny example, line by line, <i>before</i> the interviewer has to find the bug for you.</p>`,
  explain: `<p><b>Trade-offs.</b> Almost every choice costs something. Say it first: "This uses O(N) extra memory to get O(N) time." The three axes interviewers care about:</p>
  ${H.table(['Axis', 'Question to answer', 'Example sentence'], [['Time', 'How does it grow with N?', '"One pass, so O(N)."'], ['Space', 'What extra memory do I use?', '"A hash map, O(N) in the worst case."'], ['Readability / maintenance', 'Could a teammate understand it in 2 minutes?', '"A bit clever; I would name the helper and add a comment."']])}
  <p>Also say <b>when the other option wins</b>: "If the array is already sorted, two pointers uses O(1) space and I'd prefer that."</p>
  <p><b>Testing your own code - the 4 steps</b> (do this after the last line, <span class="c-r">before</span> saying "I'm done"):</p>
  <ol><li><b>Read it once</b>, top to bottom, hunting typos and off-by-one.</li><li><b>Dry run</b> the sample from the problem. Track variables in a small table on the side.</li><li><b>Edge cases:</b> empty, one element, duplicates, negatives, no answer, max size.</li><li><b>State the complexity</b> of what you actually wrote.</li></ol>
  <p>When you find a bug: <span class="c-g">celebrate quietly</span> - "Good, found it - this index should be i, not i+1." Fixing your own bug is a good sign. It looks better than code that was never verified.</p>
  <p>The runnable code below is the Two Sum / Top-K code <b>with the self-tests you would dry run aloud</b>. Press Run to see them pass.</p>`,
  clues: ['"Can you test it?" / "Walk me through an example" - they want a dry run, not a re-read', 'Interviewer asks "what is the space complexity?" - state both time and space, with the dominant term', '"Is there a downside?" - they want a trade-off, not "no"', 'You just wrote the last line - STOP and test before asking "done?"', '"What if the input is empty?" - you should have said this before they asked'],
  code: [{ lang: 'python', run: true, title: 'Two Sum + Top-K Frequent with self-tests (what you dry run aloud)', code: `from collections import Counter

def two_sum(nums, target):
    """One pass. seen maps value -> index of numbers already visited."""
    seen = {}
    for i, x in enumerate(nums):
        need = target - x            # the partner we are hoping to find
        if need in seen:             # check BEFORE storing x, so we never reuse the same element
            return [seen[need], i]
        seen[x] = i
    return []                        # clarified earlier: empty list when no answer

def two_sum_brute(nums, target):
    """Baseline we state first: try every pair, O(N^2). Also used to cross-check."""
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []

def top_k_frequent(nums, k):
    """Bucket sort by frequency: O(N) time, O(N) space."""
    counts = Counter(nums)
    buckets = [[] for _ in range(len(nums) + 1)]   # buckets[c] = values that appear c times
    for value, c in counts.items():
        buckets[c].append(value)
    out = []
    for c in range(len(buckets) - 1, 0, -1):       # highest frequency first
        for value in buckets[c]:
            out.append(value)
            if len(out) == k:
                return out
    return out

# ---- tests you would narrate: sample, then edge cases ----
print("sample:", two_sum([2, 7, 11, 15], 9))
assert two_sum([2, 7, 11, 15], 9) == [0, 1]
print("duplicates:", two_sum([3, 3], 6))
assert two_sum([3, 3], 6) == [0, 1]              # same value twice, different indexes
print("same element not reused:", two_sum([3, 2, 4], 6))
assert two_sum([3, 2, 4], 6) == [1, 2]           # 3 + 3 would be wrong
print("negatives:", two_sum([-1, -2, -3, -4, -5], -8))
assert two_sum([-1, -2, -3, -4, -5], -8) == [2, 4]
print("no answer:", two_sum([1, 2], 10))
assert two_sum([1, 2], 10) == []
print("empty:", two_sum([], 5))
assert two_sum([], 5) == []

# cross-check optimized vs brute on many small inputs
import random
random.seed(1)
for _ in range(300):
    arr = [random.randint(-5, 5) for _ in range(random.randint(0, 8))]
    t = random.randint(-8, 8)
    a, b = two_sum(arr, t), two_sum_brute(arr, t)
    assert (a == []) == (b == []), (arr, t)       # both find an answer or neither does
    if a:
        assert arr[a[0]] + arr[a[1]] == t and a[0] != a[1]
print("300 random cross-checks vs brute force: OK")

print("top-k:", sorted(top_k_frequent([1, 1, 1, 2, 2, 3], 2)))
assert sorted(top_k_frequent([1, 1, 1, 2, 2, 3], 2)) == [1, 2]
assert top_k_frequent([5], 1) == [5]
assert sorted(top_k_frequent([4, 4, 5, 5, 6], 2)) == [4, 5]
print("all tests passed")
` }],
  codeTitle: ['Self-tested solutions'],
  viz: [{
    title: 'Dry run of two_sum, line by line',
    input: '2 7 11 15 | 9',
    inputLabel: 'Numbers | target',
    gen: function (input) {
      var p = String(input).split('|');
      if (p.length !== 2) throw new Error('Format: numbers | target, e.g. 2 7 11 15 | 9');
      var a = p[0].trim().split(/\s+/).map(Number), t = Number(p[1]);
      if (!a.length || a.some(isNaN) || isNaN(t)) throw new Error('Use integers only');
      if (a.length > 8) throw new Error('At most 8 numbers');
      var code = 'def two_sum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        need = target - x\n        if need in seen:\n            return [seen[need], i]\n        seen[x] = i\n    return []';
      var frames = [], seen = [];
      function entries() { return seen.map(function (e) { return [String(e[0]), e[1]]; }); }
      frames.push({ narr: 'Dry run starts. Say aloud: "I will test with nums = [' + a.join(', ') + '], target = ' + t + '."', parts: [{ type: 'array', label: 'nums', values: a }, { type: 'code', label: 'Code', lang: 'python', code: code, hl: { 1: 'cur' } }, { type: 'vars', vals: { target: t } }] });
      frames.push({ narr: 'Line 2: <code>seen = {}</code> - an empty map; no numbers visited yet.', parts: [{ type: 'array', label: 'nums', values: a }, { type: 'code', label: 'Code', lang: 'python', code: code, hl: { 2: 'cur' } }, { type: 'map', label: 'seen', entries: [] }] });
      for (var i = 0; i < a.length; i++) {
        var x = a[i], need = t - x, found = false, j = -1;
        for (var q = 0; q < seen.length; q++) if (seen[q][0] === need) { found = true; j = seen[q][1]; }
        var ptr = {}; ptr[i] = 'i'; var ah = {}; ah[i] = 'cur';
        frames.push({ narr: 'Line 4: <code>need = target - x</code> = ' + t + ' - ' + x + ' = <b>' + need + '</b>. "What partner do I need for ' + x + '?"', parts: [{ type: 'array', label: 'nums', values: a, ptr: ptr, hl: ah }, { type: 'code', label: 'Code', lang: 'python', code: code, hl: { 4: 'cur' } }, { type: 'vars', vals: { i: i, x: x, need: need }, hl: { need: 'cur' } }, { type: 'map', label: 'seen', entries: entries() }] });
        if (found) {
          var h = {}; h[String(need)] = 'ok'; ah = {}; ah[i] = 'sel'; ah[j] = 'sel';
          frames.push({ narr: 'Line 5-6: <b>' + need + '</b> is in seen (index ' + j + ') <span class="c-g">found!</span> Return [' + j + ', ' + i + '].', parts: [{ type: 'array', label: 'nums', values: a, ptr: ptr, hl: ah }, { type: 'code', label: 'Code', lang: 'python', code: code, hl: { 5: 'ok', 6: 'ok' } }, { type: 'map', label: 'seen', entries: entries(), hl: h }, { type: 'vars', vals: { result: '[' + j + ', ' + i + ']' }, hl: { result: 'ok' } }] });
          return frames;
        }
        seen.push([x, i]); var h2 = {}; h2[String(x)] = 'ok';
        frames.push({ narr: 'Line 5 false, so line 7: <code>seen[' + x + '] = ' + i + '</code>. Remember it for later numbers.', parts: [{ type: 'array', label: 'nums', values: a, ptr: ptr, hl: ah }, { type: 'code', label: 'Code', lang: 'python', code: code, hl: { 7: 'cur' } }, { type: 'map', label: 'seen', entries: entries(), hl: h2 }] });
      }
      frames.push({ narr: 'Loop ended with no pair: line 8 returns <b>[]</b>. Say: "no answer case works."', parts: [{ type: 'code', label: 'Code', lang: 'python', code: code, hl: { 8: 'bad' } }, { type: 'vars', vals: { result: '[]' }, hl: { result: 'bad' } }] });
      return frames;
    }
  }, {
    title: 'Trade-off table: which option wins when?',
    input: 'sorted',
    inputLabel: 'Situation: sorted / unsorted / memory-tight / streaming',
    gen: function (input) {
      var s = String(input).trim().toLowerCase();
      var rows = [['Brute force pairs', 'O(N^2)', 'O(1)', 'Very easy'], ['Hash map', 'O(N)', 'O(N)', 'Easy'], ['Sort + two pointers', 'O(N log N)', 'O(1)*', 'Medium'], ['Two pointers on sorted input', 'O(N)', 'O(1)', 'Easy']];
      var win = { sorted: 3, unsorted: 1, 'memory-tight': 2, streaming: 1 };
      if (win[s] === undefined) throw new Error('Type: sorted, unsorted, memory-tight or streaming');
      var why = { sorted: 'Already sorted: two pointers give O(N) time and O(1) space - cheapest on both axes.', unsorted: 'Unsorted and speed matters: hash map is O(N) and still simple.', 'memory-tight': 'Memory is tight: sort in place then two pointers. Slower (N log N) but no extra map. Note: indices are lost when sorting - ask if indexes are needed!', streaming: 'Streaming: you cannot sort the future. Hash set of values seen so far works one item at a time.' };
      var frames = [];
      frames.push({ narr: 'Situation: <b>' + s + '</b>. Four options, each with a cost. *sort is in place.', parts: [{ type: 'table', label: 'Options', columns: ['Option', 'Time', 'Space', 'Readability'], rows: rows }] });
      for (var i = 0; i < rows.length; i++) { var h = {}; h[i] = 'cur'; frames.push({ narr: 'Option ' + (i + 1) + ': <b>' + rows[i][0] + '</b> - time ' + rows[i][1] + ', space ' + rows[i][2] + '.', parts: [{ type: 'table', label: 'Options', columns: ['Option', 'Time', 'Space', 'Readability'], rows: rows, hl: h }] }); }
      var w = {}; w[win[s]] = 'sel';
      frames.push({ narr: '<b>Pick:</b> ' + why[s], parts: [{ type: 'table', label: 'Best for: ' + s, columns: ['Option', 'Time', 'Space', 'Readability'], rows: rows, hl: w }] });
      return frames;
    }
  }],
  examples: [
    { title: 'A dry run that catches a bug', html: `<p>Candidate wrote the map insert <i>before</i> the lookup. Dry run on [3,2,4], target 6: at i=0 the code stores 3, then looks for 6-3=3 and finds the 3 it just stored, so it returns [0,0]. On the dry run the candidate says: <b>"Wait - 3 is pairing with itself, so I'd return the same index twice. I need to check before inserting."</b> Swap two lines. Interviewer note: "Self-corrected via testing."</p>`, code: `# buggy order\nseen[x] = i\nif target - x in seen: return [seen[target - x], i]   # finds itself!\n# fixed order: lookup first, then store` },
    { title: 'Edge-case list you can say in 10 seconds', html: `<p>"I'll check: empty array, single element, two equal numbers, negatives, no answer, and a large input for overflow." Then pick two and actually run them - listing six without running any is weak.</p>${H.table(['Edge case', 'Input', 'Expected'], [['empty', '[], 5', '[]'], ['one element', '[5], 5', '[]'], ['duplicates', '[3,3], 6', '[0,1]'], ['no answer', '[1,2], 10', '[]'], ['negatives', '[-1,-2,-3,-4,-5], -8', '[2,4]']])}` },
    { title: 'Stating a trade-off before being asked', html: `<p>"I chose the hash map: <b>time O(N), space O(N)</b>. The brute force has O(1) space, so if memory were the limit I'd sort and use two pointers, accepting O(N log N). For readability, I kept the map name <code>seen</code> so each line reads like a sentence." Three sentences, all three axes.</p>` },
    { title: 'Complexity of what you wrote, not what you intended', html: `<p>If you wrote <code>if need in my_list</code> (a list, not a set), the "O(N)" claim is false: it's O(N<sup>2</sup>). Dry running slowly and re-reading each line's cost catches this. Always ask: <b>"what does this single line cost?"</b></p>` }
  ],
  deepDive: `<p><b>What the interviewer writes.</b> Common lines: "Tested own code proactively and found a bug" (strong), "Needed prompting to test" (average), "Declared done with an untested off-by-one" (weak), "Trade-off discussion was thoughtful - mentioned memory vs time unprompted" (strong). Many rubrics have an explicit row called <i>verification</i>.</p>
  <p><b>How to dry run well.</b> Use the <i>smallest</i> example that still exercises the logic (3-4 elements). Keep a mini table beside the code with columns for every changing variable. Move your cursor to the line you speak about. Do not re-read the code - narrate the <i>values</i>: "need is 9 minus 2 equals 7; 7 is not in seen; store 2 at index 0."</p>
  <p><b>Test selection.</b> One "happy path", one tricky (duplicates / negative), one boundary (empty / one element), one failure (no answer). Four tests beat ten shallow ones. For loops, test the first iteration, one middle iteration, and the exit condition - most off-by-ones hide there.</p>
  <p><b>Cross-checking with brute force.</b> In real work you test the clever solution against the simple one on random small inputs (as the code above does). In an interview mention it: "Normally I'd fuzz this against the O(N<sup>2</sup>) version." That signals engineering maturity even if you do not run it.</p>
  <p><b>Readability trade-offs</b> are about the next engineer: meaningful names, one idea per function, comments for "why", not "what". A 3-line trick that saves 4 lines but needs a paragraph to explain is usually a bad trade outside competitive programming.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI can write tests in seconds, so "I'd write tests" is no longer impressive - <i>choosing the right tests and noticing what the AI missed</i> is. In AI-enabled rounds you are expected to verify the assistant's code like a code reviewer.</p>
  <p><b>Use AI as a partner:</b> <code>Here is my function. Give me 8 edge-case inputs with expected outputs. Do NOT fix my code.</code> Then run them by hand. Also: <code>Review my complexity claim line by line.</code></p>
  <p><b>Where AI goes wrong:</b> generated tests often only cover the happy path, and expected values can be wrong (the AI "computes" in its head). Always recompute the expected value yourself on the small cases. <b>What you must still own:</b> the dry run narration - interviewers can see whether you understand the data flow, which a pasted test suite cannot prove.</p>`,
  problems: [
    P({ t: 'You Think You Are Done: What Do You Say?', lv: 'Easy', tags: ['testing', 'dry run'],
      st: `<p>You typed the last line of your solution with 12 minutes left. The interviewer is waiting. What exactly do you say and do next?</p>`,
      ex: `<p>Good: "Let me test it with the example, then a couple of edge cases." Then you actually trace values.</p>`,
      bw: `<p>Saying "Done!" immediately hands your bug-hunting job to the interviewer, which looks like you do not verify your work.</p>`,
      bc: `"I think that's it. Done."`,
      mq: ['After typing the last line you should', ['Say "done" and wait', 'Dry run a small example, then edge cases, then state complexity', 'Rewrite it in another language', 'Start explaining the history of the problem'], 1, 'Verify first - tests plus complexity - then invite review.'],
      h: ['<p>Hint 1: Say what you will do, so they follow along.</p>', '<p>Hint 2: Use the problem example first, tracking variables in a table.</p>', '<p>Hint 3: Then pick 2-3 edge cases and finish with time/space.</p>'],
      ap: `<p>Model answer: "I'll verify this before calling it done. First, a dry run with the example nums = [2,7,11,15], target 9. At i = 0, x = 2, need = 7, seen is empty so I store 2 at index 0. At i = 1, x = 7, need = 2, and 2 is in seen at index 0, so I return [0, 1], which matches the expected output. Now edge cases: an empty array never enters the loop and returns the empty list, as we agreed. Two equal numbers like [3, 3] with target 6: at i = 1, need is 3, and 3 was stored at index 0, so I return [0, 1]. A single element can't pair, so it returns empty. One last case: [3, 2, 4] with target 6 - I look up before I store, so 3 can't pair with itself and the answer is [1, 2]. Complexity: one pass, O(N) time; the map holds up to N entries, O(N) space. I'm fairly confident - anything you'd like me to probe further?"</p>`,
      fu: ['What if you found a bug at this point?', 'How many tests are enough?'] })
  ]
});
topics.push({
  title: 'Handling Hints, Getting Stuck and Changing Course Gracefully',
  analogy: `<p>Imagine hiking with a guide. At a fork you say "I think left?" and the guide says "look at the river." A good hiker says "Ah, the river bends right, so right." A bad hiker argues, or stands frozen. A <b>hint is a gift</b>, not a penalty - the guide wants you to reach the top.</p>`,
  explain: `<p>Interviewers give hints for two reasons: they want to see you <b>reach a solution</b>, and they want to see <b>how you work with a teammate</b>. Many candidates get at least one hint. What matters is how you receive it.</p>
  <p>The <b>4-step hint response</b>:</p>
  <ol><li><b>Acknowledge:</b> "Thanks, that's helpful."</li><li><b>Think out loud for 10-20 seconds:</b> "So if it's about X, that suggests Y..."</li><li><b>Test the hint on your example</b> quickly, so you show you used it.</li><li><b>Re-state the new plan</b> and continue.</li></ol>
  ${H.table(['Interviewer says', 'Weak reaction', 'Strong reaction'], [['"What if the array were sorted?"', '"It is not sorted."', '"If sorted, I could use two pointers... so can I trade sorting cost for lower memory?"'], ['"Think about what you recompute."', '(silence)', '"I recompute the partner search each time - so I should remember it. A hash map."'], ['"Is that correct for negatives?"', '"Yes, I think so."', '"Let me check [-1, -2]... good catch, it breaks. I need to change the condition."']])}
  <p><b>When you are stuck (the 3-minute rule).</b> After about 3 minutes with no progress, speak: "I'm stuck on how to avoid the nested loop. Here is what I've tried and what I know." Then go through a <b>stuck ladder</b>:</p>
  <ol><li>Re-read the problem and the example.</li><li>Solve a tiny case by hand and watch what <i>you</i> do.</li><li>Try a known pattern: hash map, two pointers, sort, heap, BFS/DFS, DP.</li><li>Ask: "Can I get a nudge on the direction?"</li></ol>
  <p><b>If your approach is wrong</b> (you realise at minute 30): say it immediately. <span class="c-g">"I see a flaw - this fails when X. I have 15 minutes. I'll switch to Y, which I can finish in time, and mention what I'd improve."</span> Do not silently keep coding a wrong idea.</p>`,
  clues: ['"Have you considered ...?" - a hint; acknowledge and test it', '"What happens if the input is ...?" - they found a bug or a gap', '"That is one way. Is there something simpler?" - you are over-engineering', 'You are 3 minutes in silence - time to verbalise and use the stuck ladder', '"Take your time" - not a trap, but speak a thought every 30-60 seconds'],
  code: [`STUCK LADDER (say it aloud)
0:00  "Let me restate what I know..."
1:00  "Let me try a tiny example by hand: ..."
2:00  "Which pattern fits: hash / two pointers / sort / heap / graph / DP?"
3:00  "I'm stuck on X. I've tried A and B. Could I get a nudge?"

HINT REPLY TEMPLATE
"Thanks - [restate hint in my words]. So that means [consequence].
 Let me try it on [example]... it works / it breaks because...
 New plan: ..."`],
  codeTitle: ['Stuck ladder + hint reply'],
  viz: [dialogueViz('Hint handling dialogue: good vs poor', {
    good: { intro: 'Good hint handling.', lines: [['You: "I am stuck on the nested loop"', 'b', 'You name the exact blocker instead of going silent.'], ['Interviewer: "What do you recompute?"', 'b', 'A gentle hint, not the answer.'], ['You: "Thanks! I rescan for partner"', 'g', 'Acknowledge, and restate the hint in your words.'], ['You: "So remember them: hash map?"', 'g', 'You build on the hint yourself.'], ['You: "Test: [2,7], 9 -> works"', 'g', 'You immediately test the new idea.']], verdict: '<b>Feedback:</b> "Needed one nudge, then ran with it. Collaborative and coachable." This is a pass-level interaction.' },
    poor: { intro: 'Poor hint handling.', lines: [['Interviewer: "What if it were sorted?"', 'b', 'The hint is given.'], ['You: "It is not sorted."', 'r', 'You shut the hint down instead of exploring it.'], ['Interviewer: "Just suppose."', 'b', 'A second, bigger hint.'], ['You: "...okay. (silence)"', 'r', 'No thinking aloud, no use of the hint.'], ['You: "I do not get it"', 'r', 'Giving up. Interviewer now has to solve it for you.']], verdict: '<b>Feedback:</b> "Did not use hints. Defensive. Hard to collaborate with." That is a weak signal on communication.' },
    stuck: { intro: 'Stuck for 3 minutes, handled well.', lines: [['You: "Let me restate the problem"', 'g', 'First rung: restate.'], ['You: "Tiny example by hand: 2,7 -> 9"', 'g', 'Second rung: do it manually and watch yourself.'], ['You: "I look up the partner. Fast lookup?"', 'g', 'You notice your own manual process.'], ['You: "I am close, could I have a nudge?"', 'g', 'Asking for help calmly, with progress shown.']], verdict: '<b>Feedback:</b> "Stuck but systematic. Used a clear strategy to unblock." Being stuck is okay; being stuck <i>silently</i> is not.' }
  }, 'good'), {
    title: 'Stuck-ladder timer: where are you after 3 minutes?',
    input: '3',
    inputLabel: 'Minutes stuck (1-5)',
    gen: function (input) {
      var m = Number(input);
      if (!(m >= 1 && m <= 5)) throw new Error('Enter a number from 1 to 5');
      var rungs = ['Restate problem', 'Tiny example by hand', 'Try known patterns', 'Ask for a nudge', 'Switch to brute force'];
      var frames = [];
      for (var i = 0; i < m; i++) {
        var hl = {}; for (var k = 0; k < i; k++) hl[k] = 'done'; hl[i] = 'cur';
        frames.push({ narr: 'Minute ' + i + ' to ' + (i + 1) + ': <b>' + rungs[i] + '</b>. ' + ['Say the problem and example in your own words.', 'Solve by hand; notice what your brain does.', 'Run through hash / pointers / sort / heap / graph / DP aloud.', 'Say: "Here is what I tried... could I get a direction?"', 'If still nothing, deliver the brute force and discuss its cost.'][i], parts: [{ type: 'queue', label: 'Stuck ladder', items: rungs, hl: hl, frontLabel: 'first', backLabel: 'last resort' }, { type: 'bars', label: 'Minutes stuck', values: [i + 1], texts: [(i + 1) + ' min'], idxLabels: ['stuck'], hl: { 0: i >= 2 ? 'bad' : 'cur' } }] });
      }
      frames.push({ narr: 'Never stay silent past 3 minutes; speak at every rung.', parts: [{ type: 'text', html: '<b>Rule:</b> verbalise, climb the ladder, ask for a nudge by minute 3-4, and fall back to brute force by minute 5-6 so you still deliver something.' }] });
      return frames;
    }
  }],
  examples: [
    { title: 'Gracefully receiving a hint (transcript)', html: `<p><b>Interviewer:</b> "What if we thought about it from the other side - for each number, what do we need?"<br><b>You:</b> "Thanks. For each x I need target minus x. So instead of searching for pairs, I search for one specific value. That is a lookup... I could store numbers seen so far in a hash map. Let me try [2,7,11,15] with 9: at 2 I need 7, not seen, store 2; at 7 I need 2 - seen! That works."</p><p>Time from hint to plan: about 25 seconds.</p>` },
    { title: 'Realising at minute 30 that your approach is wrong', html: `<p><b>You:</b> "I just traced an input with duplicates and my greedy fails - it picks the wrong interval. I have about 15 minutes. Two options: patch the greedy with a sort by end time, which I think fixes it, or switch to DP which is safer but longer. I'll take the sort-by-end fix; it's a two-line change. If it doesn't hold I'll fall back to the O(N<sup>2</sup>) brute force and explain its cost."</p><p>Named the flaw, gave the options, chose by time, kept a fallback. Interviewers love this.</p>` },
    { title: 'Disagreeing with a hint politely', html: `<p>Interviewer hints a heap; you believe a counting array is better because values are small. Say: <b>"Good thought - a heap works. Because values are limited to 0-100, I think a counting array is simpler and O(N). Do you see a reason the heap would be better here?"</b> Respect, reason, invite.</p>` },
    { title: 'Using a hint you are not sure about', html: `<p>If a hint does not click: <b>"I'm not sure I see the connection yet. Could you say a bit more about X?"</b> Asking a specific follow-up is far better than nodding and pretending.</p>` }
  ],
  deepDive: `<p><b>How hints are scored.</b> Many companies record hints on a scale: none / small nudge / large hint / interviewer solved it. A small nudge that you convert into a full solution is usually still a hire. Needing the interviewer to hand over the key idea <i>and</i> then struggling to code it is the risky pattern. So when you take a hint, convert it fast and visibly.</p>
  <p><b>Defensive vs curious.</b> The most common failure is not lack of knowledge but defensiveness: "No, that won't work" without testing. Test first, argue second. If you test and the hint's idea really breaks, show the counter-example - that is a strong signal too.</p>
  <p><b>Time-box being stuck.</b> A 45-minute round has no room for a 10-minute freeze. Decide a hard rule: by minute 12 you must have a brute force on the table; by minute 20, an optimized plan or a request for a nudge. Delivering a working brute force plus a clear explanation of why it is slow can still earn a "lean hire".</p>
  <p><b>Emotion management.</b> Your voice may shake when stuck. Take one slow breath, say "Give me a moment to think", then actually think aloud. Interviewers have been stuck themselves; calm beats clever.</p>
  <p><b>Course-correction math.</b> At minute 30 with a broken approach and 15 minutes left, you cannot do a full redesign plus code plus test. Choose the smallest change that fixes correctness; defer optimisation to a spoken follow-up. Correct and slow beats fast and wrong.</p>`,
  aiEra: `<p><b>What AI changes:</b> Candidates now practise with AI that gives instant hints, so many freeze when a human gives a vague one. Practise <i>asking for the smallest hint</i>: <code>Give me only the next hint, one sentence, no code.</code> Increase hint size only when needed, like a real interviewer would.</p>
  <p><b>In AI-assisted rounds</b> the "hint" can come from the assistant. Treat its suggestion as you would a hint from a junior teammate: acknowledge, test it on an example, and keep or reject out loud. If the AI proposes a solution you do not understand, say so: "I don't follow why this works; let me trace it."</p>
  <p><b>Where AI goes wrong:</b> it never says "I'm not sure", and it will confidently suggest wrong code. <b>What you must still own:</b> the decision to adopt a hint, the test that validates it, and the sentence that explains it.</p>`,
  problems: [
    P({ t: 'The Interviewer Gives You a Small Hint', lv: 'Easy', tags: ['hints', 'collaboration'],
      st: `<p>You are working on Two Sum with nested loops. The interviewer says: <b>"What are you recomputing in the inner loop?"</b> What do you say in the next 20 seconds?</p>`,
      ex: `<p>Good: thank, restate, connect to a data structure, test on the example.</p>`,
      bw: `<p>It argues or stays silent. Either way the hint is wasted, and the interviewer must give a bigger one.</p>`,
      bc: `"Um, nothing really? It just checks pairs."`,
      mq: ['First thing to do after a hint?', ['Say it does not apply', 'Thank, restate it in your words, and think aloud with it', 'Ignore it and continue coding', 'Ask for the full solution'], 1, 'Acknowledge and build on it visibly.'],
      h: ['<p>Hint 1: Start with "Thanks".</p>', '<p>Hint 2: Name the repeated work in plain words.</p>', '<p>Hint 3: Offer the fix and test it on the sample.</p>'],
      ap: `<p>Model answer: "Thanks, that's a useful nudge. In the inner loop I search the rest of the array for target minus x, and I do that again for every x, so I rescan the same numbers many times. Instead, I could remember the numbers I have already seen so that finding the partner is one lookup. A hash map from value to index fits, since I also need the index. Let me check on [2, 7, 11, 15] with target 9: at 2, I need 7, which isn't stored, so I store 2 at index 0. At 7, I need 2, which is stored at index 0, so I return [0, 1]. That removes the inner loop, so time drops from O(N squared) to O(N), at the price of O(N) memory. I'll code that now unless you'd like me to compare alternatives first." About 30 seconds spoken, and it shows listening, reasoning and testing.</p>`,
      fu: ['What if the hint confuses you?', 'What if you already considered the hint?'] }),
    P({ t: 'Practise the Stuck Ladder', lv: 'Medium', tags: ['stuck', 'time management'],
      st: `<p>You have been silent for 3 minutes on "Longest substring without repeating characters". Say out loud what you do for the next two minutes.</p>`,
      ex: `<p>Example: climb restate -> tiny example -> pattern -> nudge request.</p>`,
      bw: `<p>Stays silent until the interviewer rescues them, wasting the clock and the chance to show reasoning.</p>`,
      bc: `(silence for 6 minutes, then) "I do not know."`,
      mq: ['Best move at 3 minutes stuck?', ['Keep silent', 'Verbalise what you tried and ask for direction while offering brute force', 'Switch problems', 'Apologise repeatedly'], 1, 'Share progress and fall back to the baseline.'],
      h: ['<p>Hint 1: Solve "abcabcbb" by hand and note what you do.</p>', '<p>Hint 2: You keep a window and need to know what is inside: set or map.</p>', '<p>Hint 3: Offer brute force O(N cubed) or O(N squared) first.</p>'],
      ap: `<p>Model answer: "Let me pause and say where I am. I'm looking for the longest stretch with no repeats. By hand on abcabcbb I take a, ab, abc, then the next a repeats, so I drop from the left until the a is gone, and keep going. That means I keep a window with a left edge and a right edge, and I need to know quickly whether a character is already inside, which suggests a set or a map of last-seen positions. The brute force is checking every substring, O(N squared) pairs with a set, maybe O(N cubed) naively. Instead of dropping characters one at a time, a map from character to its last index lets me jump the left edge directly. I think that's O(N). Let me test on abba, where the jump must not go backwards... I'll take the max of the old left and last-seen plus one." This demonstrates the ladder: restate, hand example, noticing, pattern, edge case.</p>`,
      fu: ['At what minute would you ask for a nudge?', 'How do you avoid sounding panicked?'] })
  ]
});
topics.push({
  title: 'Time Management Across a 45-Minute Round',
  analogy: `<p>A cooking show: the chef has 45 minutes to deliver a finished dish. She does not spend 30 minutes chopping onions. She knows at minute 10 the sauce must be started, at minute 35 plating begins. <b>A time budget turns a scary open clock into small, checkable steps.</b></p>`,
  explain: `<p>A "45-minute" coding round really gives you about <b>35-38 minutes</b> of work: 3-5 go to introductions and the last 3-5 to your questions. Plan for that.</p>
  ${H.table(['Phase', 'Minutes', 'Clock', 'Done when...'], [['Intro + problem', '3', '0-3', 'You heard the full problem'], ['Clarify + examples', '4', '3-7', 'Restated + assumptions confirmed'], ['Approach (brute -> optimal)', '7', '7-14', 'Interviewer agrees with the plan'], ['Code', '15', '14-29', 'Working code on screen'], ['Test + fix', '7', '29-36', 'Dry run + edge cases done'], ['Follow-ups / optimize', '5', '36-41', 'Complexity + one improvement'], ['Your questions', '4', '41-45', 'You asked 1-2 real questions']])}
  <p><b>Checkpoint rule:</b> if you pass a checkpoint late, <i>cut something</i>, never rush everything. Example: at minute 20 and still no code -> say "I'll code the simpler version and mention the optimization verbally."</p>
  <p><b>Danger zones:</b></p>
  <ul><li><span class="c-r">Minute 14 and no approach agreed</span> -> propose brute force now.</li><li><span class="c-r">Minute 30 and code not finished</span> -> finish skeleton, write remaining as comments/pseudocode.</li><li><span class="c-r">Minute 36 and no testing</span> -> one dry run, nothing else.</li></ul>
  <p>The runnable planner below builds a schedule for any round length, and tells you what to do when you are behind. Run it, then change the numbers. The planner rounds each phase to whole minutes, so its printed schedule (3, 4, 8, 15, 8, 4, 3) differs by a minute or so from the table above.</p>`,
  clues: ['"We have 45 minutes" - plan backwards from the end, reserve test time', 'You have used 10 minutes and still ask questions - cut to assumptions', 'Interviewer says "we have 5 minutes left" - stop coding new features, test and state complexity', 'Follow-up question appears - you ran out of time; keep the base solution short', 'Two-problem rounds (25 min each) - halve every phase'],
  code: [{ lang: 'python', run: true, title: '45-minute time-budget planner (runnable)', code: `# A tiny planner: turns a total round length into a schedule with checkpoints.
# Phase weights (percent of the WORKING time, after intro and Q&A are removed).
PHASES = [
    ("Clarify + examples",      10, "Restated problem, assumptions confirmed"),
    ("Approach brute->optimal", 20, "Interviewer agrees with plan"),
    ("Code",                    40, "Working code on screen"),
    ("Test + fix",              20, "Dry run + 2 edge cases"),
    ("Follow-up / complexity",  10, "Time+space stated"),
]

def plan(total=45, intro=3, qa=4):
    work = total - intro - qa            # minutes we truly control
    rows, clock = [("Intro", intro, 0, intro, "Heard whole problem")], intro
    for name, pct, done in PHASES:
        mins = round(work * pct / 100)
        rows.append((name, mins, clock, clock + mins, done))
        clock += mins
    rows.append(("Your questions", total - clock, clock, total, "Asked 1-2 real questions"))
    return rows

def advice(minute, phase_done, rows):
    """If you are at 'minute' and have finished phases up to index phase_done, what now?"""
    expected_end = rows[phase_done][3]
    late = minute - expected_end
    if late <= 0:
        return "On track. Keep going."
    if late <= 3:
        return "Slightly behind (%d min). Shorten the next phase; skip optional polish." % late
    return "Behind by %d min. CUT scope: code the simple version, explain the optimization verbally." % late

for total in (45, 60):
    print("=== %d-minute round ===" % total)
    rows = plan(total)
    for name, mins, start, end, done in rows:
        print("%-26s %2d min  [%2d-%2d]  done when: %s" % (name, mins, start, end, done))
    assert rows[-1][3] == total, "schedule must end exactly at the total"
    assert all(r[1] >= 0 for r in rows)
    print()

rows = plan(45)
# rows[0]=Intro, rows[1]=Clarify, rows[2]=Approach, rows[3]=Code
print("Minute 14, approach finished:", advice(14, 2, rows))
print("Minute 20, approach finished:", advice(20, 2, rows))
print("Minute 31, code finished:   ", advice(31, 3, rows))
assert advice(10, 2, rows).startswith("On track")
assert "CUT" in advice(25, 2, rows)
print("planner self-tests passed")
` }],
  codeTitle: ['Time-budget planner'],
  viz: [{
    title: '45-minute round timeline (bars = minutes per phase)',
    input: '3 4 7 15 7 5 4',
    inputLabel: 'Minutes per phase (7 numbers, sum up to 60)',
    gen: function (input) {
      var m = String(input).trim().split(/[\s,]+/).map(Number);
      if (m.length !== 7 || m.some(function (x) { return !(x >= 0); })) throw new Error('Enter exactly 7 non-negative numbers');
      var total = m.reduce(function (a, b) { return a + b; }, 0);
      if (total > 60) throw new Error('Sum must be 60 or less');
      var names = ['Intro', 'Clarify', 'Approach', 'Code', 'Test', 'Follow-up', 'Q&A'];
      var tips = ['Smile, listen to the whole problem.', 'Ask I-C-E-O questions; restate with an example.', 'Brute force, waste, optimal; get agreement.', 'Write clean code; narrate why, not what.', 'Dry run + edge cases; fix bugs calmly.', 'State complexity, trade-offs, one improvement.', 'Ask 1-2 real questions about the team.'];
      var frames = [], clock = 0;
      for (var i = 0; i < 7; i++) {
        var hl = {}; for (var k = 0; k < i; k++) hl[k] = 'done'; hl[i] = 'cur';
        frames.push({ narr: '<b>' + names[i] + '</b> (' + m[i] + ' min, clock ' + clock + '-' + (clock + m[i]) + '): ' + tips[i], parts: [{ type: 'bars', label: 'Phases (minutes)', values: m.slice(), hl: hl, idxLabels: names, texts: m.map(String) }, { type: 'vars', vals: { phase: names[i], clock: clock + ' min', 'time left': (total - clock) + ' min' }, hl: { phase: 'cur' } }] });
        clock += m[i];
      }
      var codeShare = Math.round(100 * m[3] / Math.max(total, 1));
      frames.push({ narr: 'Round over. Code took <b>' + codeShare + '%</b> of the time. ' + (m[4] < 5 ? '<span class="c-r">Testing got under 5 minutes - risky.</span>' : '<span class="c-g">Testing time is healthy.</span>') + ' ' + (m[1] + m[2] < 8 ? '<span class="c-r">Too little planning.</span>' : '<span class="c-g">Planning time is healthy.</span>'), parts: [{ type: 'bars', label: 'Whole round', values: m.slice(), idxLabels: names, texts: m.map(String), hl: { 3: 'win', 4: m[4] < 5 ? 'bad' : 'ok' } }] });
      return frames;
    }
  }, {
    title: 'Behind schedule? Cut scope, not quality',
    input: '25',
    inputLabel: 'Current minute (10-44)',
    gen: function (input) {
      var t = Number(input);
      if (!(t >= 10 && t <= 44)) throw new Error('Enter a minute from 10 to 44');
      var cps = [['14', 'Approach agreed'], ['29', 'Code finished'], ['36', 'Tested'], ['41', 'Complexity + follow-up']];
      var arr = Array.from({ length: 45 }, function (_, i) { return i + 1; });
      var hl = {}; for (var i = 0; i < 45; i++) if (i < t) hl[i] = 'done'; hl[t - 1] = 'cur';
      cps.forEach(function (c) { var idx = Number(c[0]) - 1; if (idx !== t - 1) hl[idx] = idx < t ? 'bad' : 'sel'; });
      var next = cps.filter(function (c) { return Number(c[0]) >= t; })[0] || cps[3];
      var frames = [];
      frames.push({ narr: 'You are at minute <b>' + t + '</b>. Purple cells are checkpoints still ahead; red are checkpoints already passed.', parts: [{ type: 'array', label: 'Minutes 1-45', values: arr, hl: hl }] });
      frames.push({ narr: 'Next checkpoint: <b>minute ' + next[0] + ' - ' + next[1] + '</b>. You have <b>' + (Number(next[0]) - t) + '</b> minutes.', parts: [{ type: 'vars', vals: { now: t, 'next checkpoint': next[0], goal: next[1] }, hl: { goal: 'sel' } }] });
      var advice = t < 14 ? 'You are in planning time: agree the approach by minute 14.' : t < 29 ? 'Coding zone: if you have not started coding by minute 20, announce a simpler version.' : t < 36 ? 'Wrap code now, start dry run by minute 31 at the latest.' : 'Stop adding features. Test, state complexity, and discuss the improvement verbally.';
      frames.push({ narr: advice, parts: [{ type: 'text', html: '<b>What to say:</b> "I have ' + (45 - t) + ' minutes left. I\'ll prioritise correctness: finish the core, test it, and describe the optimisation verbally."' }] });
      frames.push({ narr: 'Remember: cut <b>scope</b> (polish, optional branches), never the test step.', parts: [{ type: 'array', label: 'Minutes 1-45', values: arr, hl: hl }] });
      return frames;
    }
  }],
  examples: [
    { title: 'A round that ran perfectly', html: `<p>Min 0-3 intro. 3-7: three clarifying questions plus an example. 7-13: brute force, waste, hash-map plan; interviewer nods. 13-28: code, narrating. 28-35: dry run catches an off-by-one; fixes. 35-40: complexity and a space-saving variant. 40-45: asks about on-call and team roadmap. <b>Feedback: "Well-paced, left no loose ends."</b></p>` },
    { title: 'A round where time ran out', html: `<p>Candidate asked questions for 10 minutes, designed the optimal solution for 15 minutes, started coding at minute 28, never tested. At minute 43 the interviewer found a missing return. <b>Feedback: "Strong ideas but poor pacing; incomplete solution."</b> Fix: at minute 14 propose "Let me code the straightforward version and optimise if time permits."</p>` },
    { title: 'Two-problem round (25 + 20)', html: `<p>Budget: per problem, 2 min clarify, 3 min approach, 10 min code, 4 min test, 1 min complexity. If problem one overruns by 5 minutes, say: "I'll leave a note of the remaining optimisation so we have time for the second problem." Show you manage the clock.</p>` }
  ],
  deepDive: `<p><b>What the interviewer writes.</b> "Managed time well; got to a tested solution with time for follow-up" vs "Spent too long on the approach; no time to run the code". Interviewers also quietly note whether you <i>noticed</i> the clock. Saying "I'm conscious of time; let me start coding" is a plus.</p>
  <p><b>Build a clock habit.</b> Practise with a visible timer and spoken checkpoints. After ten mocks the proportions become instinct. Keep a note of your personal weakness: most people over-plan (spend 15+ minutes before code) or under-test (less than 3 minutes). Adjust your template, not your goals.</p>
  <p><b>When the interviewer controls pacing.</b> Some interviewers interrupt to steer you (e.g. "Let's code now"). Follow immediately. They are making sure you reach later signals. Do not insist on finishing your design monologue.</p>
  <p><b>Virtual rounds.</b> Time is eaten by tool friction: sharing the screen, typing slowly, syntax autocomplete missing. Practise in a plain editor without autocomplete. Keep a test-snippet ready: write tests as asserts first or at the end quickly.</p>
  <p><b>Longer rounds (60 min, system design 45-60).</b> Use the same percentages applied to working time, and always keep the last 5 minutes for wrap-up and your questions. The planner above is percentage-based so you can adapt it.</p>`,
  aiEra: `<p><b>What AI changes:</b> In AI-assisted coding rounds the clock shifts. Boilerplate is fast, so interviewers expect <i>more</i> time spent on understanding, reviewing, and testing the AI's output. A round might be 60 minutes on a bigger task (e.g. extend a small codebase) rather than a single puzzle.</p>
  <p><b>Use AI as a partner:</b> <code>Run a mock 45-minute round. Tell me when each checkpoint passes. Interrupt me at minute 14 if I have not agreed an approach.</code> Or ask for a timed feedback sheet after your session.</p>
  <p><b>Where AI goes wrong:</b> it can tempt you to prompt-loop (ask, regenerate, ask again) and burn 20 minutes. Set a rule: at most two prompts before you read, edit, and run. <b>What you must still own:</b> the plan, the checkpoints, and the decision to cut scope. Ask the interviewer up front what tools and what time split are expected.</p>`,
  problems: [
    P({ t: 'You Finish Early With 15 Minutes Left', lv: 'Easy', tags: ['time', 'follow-up'],
      st: `<p>You wrote and tested a correct solution at minute 30 of 45. The interviewer says "Great, we have some time." What do you do?</p>`,
      ex: `<p>Good: volunteer improvements: complexity, trade-offs, a different approach, tests, scalability.</p>`,
      bw: `<p>Sits in silence or says "That's it." The interviewer has to invent a follow-up and may conclude you lack curiosity.</p>`,
      bc: `"Yeah, I think that's all."`,
      mq: ['You finish early. Best move?', ['Say that is it', 'Offer improvements, deeper tests, and ask what they would like to explore', 'Start coding a second solution silently', 'End the interview'], 1, 'Use spare time to show depth and invite direction.'],
      h: ['<p>Hint 1: Restate complexity and one trade-off.</p>', '<p>Hint 2: Offer harder cases: huge input, streaming, concurrency.</p>', '<p>Hint 3: Ask which direction interests them.</p>'],
      ap: `<p>Model answer: "Thanks - I have a few minutes, so let me use them. First, one more edge case I didn't run: very large input. The map could take a lot of memory, so if memory were tight I would sort and use two pointers, trading time O(N log N) for O(1) extra space, though we lose original indexes unless we carry them along. Second, I'd like to clean up naming and add a short docstring. Third, if the data were streaming, the same map approach works one element at a time, but I'd need a policy to bound memory, such as a sliding window of recent items. Which of these would you like to dig into: scale, the streaming variant, or testing strategy?" That shows ownership, offers three directions, and hands the choice to the interviewer.</p>`,
      fu: ['What if the follow-up is something you do not know?', 'Should you start a second solution on your own?'] }),
    P({ t: 'Design Your Own 45-Minute Budget', lv: 'Medium', tags: ['planning', 'checkpoints'],
      st: `<p>Explain your personal time split for a 45-minute coding round and what you cut if you are 5 minutes behind at minute 20.</p>`,
      ex: `<p>Intro 3, clarify 4, approach 7, code 15, test 7, follow-up 5, Q&A 4. At minute 20 behind: cut polish and optional optimisation.</p>`,
      bw: `<p>Vague answer ("I just try to be quick") with no checkpoints and no cutting strategy.</p>`,
      bc: `"I try not to spend too long on anything."`,
      mq: ['Behind by 5 minutes at minute 20. What is cut first?', ['Testing', 'Optional polish and verbal-only optimisation', 'The Q&A phase', 'Clarifying questions after the fact'], 1, 'Protect correctness and testing; cut polish.'],
      h: ['<p>Hint 1: Work backwards from minute 45.</p>', '<p>Hint 2: Define a "done when" for each phase.</p>', '<p>Hint 3: Pick what you cut and what you never cut.</p>'],
      ap: `<p>Model answer: "I plan backwards. The last 4 minutes are for my questions, and the first 3 for the introduction, so I really control about 38 minutes. I spend about 4 on clarifying, 7 on approach, 15 on code, 7 on testing, and 5 on complexity and follow-ups. My checkpoints are minute 14 for an agreed approach and minute 29 for working code. If I am five minutes behind at minute 20, I do three things: I tell the interviewer that I am switching to the simpler version, I keep the structure clean so the optimisation can be described verbally, and I protect at least five minutes for a dry run. What I never cut is testing, because an untested solution has unknown correctness. What I cut first is polish, optional helper functions, and extra branches. I also say my plan aloud, which signals awareness of the clock." Short, specific, with numbers and a cut list.</p>`,
      fu: ['How would you adapt it to a 60-minute round?', 'What if the interviewer talks a lot and eats your time?'] })
  ]
});
topics.push({
  title: 'Design-Round Communication: Drive the Conversation',
  analogy: `<p>You are a <b>tour guide</b>, not a passenger. The interviewer bought a ticket for a 45-minute tour of "your thinking". A good guide says: "First we visit requirements, then numbers, then the API, then the big picture, then one place in depth. Any stop you want to skip or linger at?" A passive guide waits to be asked where to go next.</p>`,
  explain: `<p>In a system design round there is no single right answer. The interviewer is judging <b>how you structure an open-ended problem</b> and whether you can lead. The proven flow:</p>
  ${H.table(['#', 'Phase', 'Minutes', 'What you do', 'Checkpoint sentence'], [['1', 'Requirements', '5', 'Functional + non-functional, scope, what is out of scope', '"Does this scope match what you had in mind?"'], ['2', 'Estimates', '5', 'Users, QPS, storage, read/write ratio - round numbers', '"These numbers drive my choices; reasonable?"'], ['3', 'API', '5', '2-4 endpoints, request/response shape', '"Any call you want me to add?"'], ['4', 'High-level design', '10', 'Boxes: client, LB, service, DB, cache, queue', '"Shall I deep-dive here or somewhere else?"'], ['5', 'Deep dive', '12', 'One or two hardest parts: data model, scaling, consistency', '"I will go into X because it is the riskiest."'], ['6', 'Wrap-up', '8', 'Bottlenecks, failure modes, monitoring, next steps', '"What else would you like to explore?"']])}
  <p><b>Rules for driving:</b></p>
  <ul><li><b>Announce the plan</b> in the first minute ("I'll go: requirements, numbers, API, design, then a deep dive").</li><li><b>Checkpoint at every phase boundary</b> - one question, 5 seconds.</li><li><b>Think in trade-offs:</b> "SQL gives joins and transactions; NoSQL gives easy sharding. For this access pattern I choose ... because ..."</li><li><b>Draw while you talk.</b> Label every box; arrows show request direction.</li><li><b>Pick the deep dive yourself</b> - the hardest part of <i>this</i> problem - unless the interviewer redirects.</li></ul>
  <p><b>Handling pushback:</b> "Why not X?" is a question, not an accusation. Answer: "X is better for Y; I chose Z because of Q. If Q changes, I'd switch." Never become defensive; never flip instantly either.</p>`,
  clues: ['"Design a ..." with no numbers - run requirements and estimates first', '"At scale", "100M users", "millions of requests" - estimate QPS and storage', '"What would you do differently if ...?" - a trade-off question, not a flaw', 'Interviewer stays quiet and takes notes - keep driving with checkpoints', 'Interviewer says "let us go deeper on the database" - follow their lead and drop your own plan'],
  code: [`DESIGN ROUND SCRIPT (45 min)
0-5   REQUIREMENTS : "Let me clarify scope: functional..., non-functional..., out of scope..."
5-10  ESTIMATES    : "Assume 100M URLs/month => ~40 writes/s, 100:1 reads => ~4,000 reads/s ..."
10-15 API          : POST /shorten {url} -> {code}   GET /{code} -> 301 redirect
15-25 HIGH LEVEL   : client -> LB -> app servers -> cache -> DB ; ID generator
25-37 DEEP DIVE    : code generation (base62 counter vs hash), caching, sharding
37-45 WRAP-UP      : bottlenecks, failures, analytics, what I'd do with more time
EVERY BOUNDARY     : "Does that match your expectations, or should I adjust?"`],
  codeTitle: ['Design round script'],
  viz: [{
    title: 'Design-round phase flow with checkpoints',
    input: '4',
    inputLabel: 'Current phase (1 requirements ... 6 wrap-up)',
    gen: function (input) {
      var cur = Number(input);
      if (!(cur >= 1 && cur <= 6)) throw new Error('Enter a phase number from 1 to 6');
      var names = ['Requirements', 'Estimates', 'API', 'High-level', 'Deep dive', 'Wrap-up'];
      var says = ['Clarify scope: who, what, how big. State out-of-scope.', 'Round numbers: QPS, storage, read:write. Show your math.', 'Sketch 2-4 endpoints with request and response.', 'Draw boxes: client, LB, service, cache, DB, queue. Label arrows.', 'Pick the hardest part: data model, scaling, consistency. Compare options.', 'Name bottlenecks, failures, monitoring, and what you would do next.'];
      var frames = [];
      for (var f = 1; f <= cur; f++) {
        var nodes = names.map(function (n, i) { return { id: 'p' + i, label: (i + 1) + '. ' + n, x: 8 + (i % 3) * 42, y: i < 3 ? 10 : 38, shape: 'box', w: 30 }; });
        var edges = [['p0', 'p1'], ['p1', 'p2'], ['p2', 'p3'], ['p3', 'p4'], ['p4', 'p5']];
        var hl = {}, ehl = {};
        for (var i = 0; i < f - 1; i++) { hl['p' + i] = 'done'; ehl['p' + i + '-p' + (i + 1)] = 'ok'; }
        hl['p' + (f - 1)] = 'cur';
        frames.push({ narr: 'Phase ' + f + ': <b>' + names[f - 1] + '</b>. ' + says[f - 1] + ' <span class="c-b">Then checkpoint:</span> "Does this match what you expect?"', parts: [{ type: 'graph', label: 'Design round flow', directed: true, height: 52, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: { ['p' + (f - 1)]: 'you are here' } }, { type: 'vars', vals: { phase: names[f - 1], 'budget (min)': [5, 5, 5, 10, 12, 8][f - 1] } }] });
      }
      frames.push({ narr: 'Between every two boxes there is one <b>checkpoint question</b>. That is how you keep the interviewer in the loop and steerable.', parts: [{ type: 'text', html: 'Checkpoint phrases: <i>"Does that scope work?", "Are these numbers reasonable?", "Want me to deep-dive here or elsewhere?", "Anything I missed?"</i>' }] });
      return frames;
    }
  }, {
    title: 'URL shortener: architecture built while you talk',
    input: '5',
    inputLabel: 'How many components to reveal (1-6)',
    gen: function (input) {
      var n = Number(input);
      if (!(n >= 1 && n <= 6)) throw new Error('Enter 1 to 6');
      var all = [
        { id: 'C', label: 'Client', x: 6, y: 25, shape: 'box', w: 14 }, { id: 'LB', label: 'Load Balancer', x: 28, y: 25, shape: 'box', w: 20 },
        { id: 'APP', label: 'App Servers', x: 52, y: 25, shape: 'box', w: 20 }, { id: 'CA', label: 'Cache', x: 80, y: 8, shape: 'box', w: 16 },
        { id: 'DB', label: 'Database', x: 80, y: 42, shape: 'box', w: 16 }, { id: 'ID', label: 'ID Generator', x: 52, y: 52, shape: 'box', w: 20 }
      ];
      var allEdges = [['C', 'LB', 'HTTPS'], ['LB', 'APP'], ['APP', 'CA', 'read'], ['APP', 'DB', 'miss/write'], ['APP', 'ID', 'new code']];
      var says = ['Client sends <code>POST /shorten</code> or <code>GET /abc12</code>.', 'Load balancer spreads traffic. Say: "stateless servers so I can add more."', 'App servers: shorten and redirect logic. "Mostly reads, 100:1."', 'Cache hot codes: "20% of links get 80% of the traffic."', 'Database stores code -> long URL. "Key-value access pattern; easy to shard by code."', 'ID generator: base62 counter or ranges per server - no collisions.'];
      var frames = [];
      for (var f = 1; f <= n; f++) {
        var ids = all.slice(0, f).map(function (x) { return x.id; });
        var edges = allEdges.filter(function (e) { return ids.indexOf(e[0]) >= 0 && ids.indexOf(e[1]) >= 0; });
        var hl = {}; hl[ids[f - 1]] = 'cur';
        var ehl = {}; edges.forEach(function (e) { if (e[1] === ids[f - 1]) ehl[e[0] + '-' + e[1]] = 'ok'; });
        frames.push({ narr: '<b>Add ' + all[f - 1].label + ':</b> ' + says[f - 1], parts: [{ type: 'graph', label: 'URL shortener', directed: true, height: 62, nodes: all.slice(0, f), edges: edges, hl: hl, ehl: ehl }] });
      }
      return frames;
    }
  }],
  examples: [
    { title: 'Full annotated design transcript - GOOD (URL shortener, first 10 minutes)', html: `<p><b>Interviewer:</b> Design a URL shortener.</p>
<p><b>You:</b> "Happy to. I'll go through requirements, rough numbers, an API, a high-level design, then a deep dive on code generation, and finish with bottlenecks. <span class="c-m">[announces the plan - drives]</span> First, scope. Functional: create a short link from a long URL, redirect from short to long. Optional: custom aliases, expiry, click analytics. Which should I include?"</p>
<p><b>Interviewer:</b> "Core plus expiry. Skip analytics."</p>
<p><b>You:</b> "Got it. Non-functional: low latency on redirects, high availability, links should not collide. Is eventual consistency okay when a new link is created? <span class="c-m">[asks a trade-off question]</span>"</p>
<p><b>Interviewer:</b> "Yes, slight delay is fine."</p>
<p><b>You:</b> "Numbers: say 100 million new links per month. That's about 40 writes per second. If reads are 100 times writes, about 4,000 reads per second. Storage: 100M x 500 bytes = 50 GB per month, around 3 TB over five years. <span class="c-m">[shows the math, round numbers]</span> These are small enough for a sharded key-value store. Do those assumptions seem reasonable?"</p>
<p><b>Interviewer:</b> "Fine."</p>
<p><b>You:</b> "API: <code>POST /shorten {url, expiry}</code> returns <code>{code}</code>; <code>GET /{code}</code> returns a 301 or 302 redirect. I would use 302 if we want to count clicks later, 301 for fewer hits. <span class="c-m">[mentions a trade-off unprompted]</span> Anything to add before I draw?"</p>
<p class="c-g"><b>Annotations:</b> plan announced; scope narrowed; trade-off questions; numbers with math; checkpoints at each boundary. Elapsed: about 8 minutes.</p>` },
    { title: 'Full annotated design transcript - POOR (same problem)', html: `<p><b>Interviewer:</b> Design a URL shortener.</p>
<p><b>You:</b> "Okay so I'd use a hash of the URL, maybe MD5... and store it in MongoDB. Then Kafka for... analytics. And Redis. And Kubernetes."  <span class="c-r">[tool name dropping, no requirements]</span></p>
<p><b>Interviewer:</b> "How many users are we talking about?"</p>
<p><b>You:</b> "Uh, a lot? Maybe a billion?" <span class="c-r">[never asked, now guessing wildly]</span></p>
<p><b>Interviewer:</b> "Why MongoDB?"</p>
<p><b>You:</b> "It scales." <span class="c-r">[no reason, no trade-off]</span></p>
<p>(25 minutes of drawing boxes with no checkpoints; the interviewer never got a say.)</p>
<p class="c-r"><b>Feedback:</b> "Jumped to a solution. Buzzwords without justification. Did not drive or check in. Could not explain why MongoDB over alternatives."</p>` },
    { title: 'Handling pushback on a design choice', html: `<p><b>Interviewer:</b> "Why not just hash the long URL?"<br><b>You:</b> "Good question. A hash like MD5 truncated to 7 characters is stateless and easy, but different URLs can collide, so I would need a check against the database and a retry, and the same long URL always gets the same code - which can be a feature or a privacy problem. A counter-based base62 ID avoids collisions entirely at the cost of a coordinated ID service. At 40 writes per second even a single database sequence works, so I chose the counter. If we needed multi-region writes, I'd switch to ranges allocated per server or a snowflake-style ID. Does that cover it?"</p><p>Not defensive, not flipping: a reasoned comparison and a condition under which you would change your mind.</p>` },
    { title: 'Interviewer is quiet: you keep driving', html: `<p>Silence is not disapproval. Say: <b>"I'll assume this is fine and keep going; please interrupt anytime."</b> Then proceed. Short, regular checkpoints (about every 7-8 minutes) are enough.</p>` }
  ],
  deepDive: `<p><b>What the interviewer writes in feedback.</b> Typical design-round rubric rows: <i>requirements gathering</i>, <i>estimation</i>, <i>high-level design</i>, <i>depth</i>, <i>trade-off reasoning</i>, <i>communication / collaboration</i>. A common negative line: "Candidate needed heavy prompting to move between phases" - that is exactly the "passenger" behaviour. A common positive: "Led the conversation, checked in often, adapted when I steered."</p>
  <p><b>Estimation as communication.</b> Nobody checks your arithmetic to the digit. They check that you turn a vague scale into <i>design-relevant</i> numbers: "4,000 reads per second is easy for one cache cluster; 4 million is not." State what each number implies. Round aggressively (1 day is about 10<sup>5</sup> seconds).</p>
  <p><b>Choosing the deep dive.</b> Say why: "The riskiest part is ID generation because it must be collision-free and fast, so I'd like to spend time there." If the interviewer picks a different area, switch immediately and happily - they know what rubric they are filling.</p>
  <p><b>Whiteboard hygiene.</b> Number the flow (1 client request, 2 LB, 3 cache check...). Put numbers next to boxes. Leave space. Erase nothing without saying so. In virtual rounds use consistent shapes and short labels.</p>
  <p><b>Senior bar.</b> At senior level, add <i>why not</i> alternatives, failure modes (what if the cache dies?), capacity planning, rollout/migration, cost, and operability. Junior-to-mid is mostly about a coherent end-to-end design with sensible components.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI can produce a textbook URL-shortener design in 10 seconds, so interviewers now probe <i>judgment</i>: "which numbers would change your choice?", "what would you not build?", "how would you validate this under load?" Communication of trade-offs is the differentiator.</p>
  <p><b>Use AI as a partner:</b> <code>Be a design interviewer for "design a URL shortener". Interrupt me with pushback like a real one. After 40 minutes, give feedback per phase: requirements, estimates, API, high-level, deep dive, communication.</code></p>
  <p><b>Where AI goes wrong:</b> it recommends the "famous" stack (Kafka, Cassandra, Kubernetes) without matching the scale; at 40 writes per second that is over-engineering. <b>What you must still own:</b> sizing from the requirements and the reason behind each box. In AI-allowed design rounds, use the assistant for quick calculations or API drafts, say so out loud, and review them.</p>`,
  problems: [
    P({ t: 'Interviewer Pushes Back: "Why Did You Choose That Database?"', lv: 'Medium', tags: ['design', 'pushback', 'trade-offs'],
      st: `<p>In a URL shortener design you chose a key-value store. The interviewer asks: <b>"Why not PostgreSQL?"</b> You have 40 seconds.</p>`,
      ex: `<p>Good answer: acknowledge, compare on access pattern and scale, state when you would switch.</p>`,
      bw: `<p>"I just prefer NoSQL" or instantly "You are right, let me use PostgreSQL" - no reasoning either way.</p>`,
      bc: `"NoSQL scales better." (or) "Oh okay, PostgreSQL then."`,
      mq: ['Best reaction to "Why not X?"', ['Defend at all costs', 'Switch immediately', 'Compare using the requirements and say when you would switch', 'Say you do not know'], 2, 'Reasoned comparison tied to requirements, with a condition for change.'],
      h: ['<p>Hint 1: Anchor on the access pattern: look up by code.</p>', '<p>Hint 2: Use the numbers you estimated.</p>', '<p>Hint 3: Mention when PostgreSQL would be right.</p>'],
      ap: `<p>Model answer: "Fair question - PostgreSQL would work here, and honestly at 40 writes and 4,000 reads per second one well-indexed Postgres primary with a cache in front could carry us for a long time. I leaned toward a key-value store because our only access pattern is look up by short code, with no joins or multi-row transactions, and because it shards easily by code when we grow. The trade-off is that I give up flexible queries, which matters if we later add analytics or user dashboards. So here is how I'd decide: if the team already runs Postgres and the scale stays under about 10,000 requests per second, I would start with Postgres for operational simplicity, and keep the storage behind a small interface so we can move to a sharded key-value store if traffic grows tenfold. Do you want me to continue with the Postgres option or keep the key-value design?" Acknowledges, reasons from numbers, names the switching condition, and checks in.</p>`,
      fu: ['What if the interviewer still disagrees?', 'How do you show flexibility without looking indecisive?'] }),
    P({ t: 'You Are at Minute 40 and the Deep Dive Is Unfinished', lv: 'Hard', tags: ['design', 'time management'],
      st: `<p>In a 45-minute design round you are 10 minutes behind: the deep dive on sharding is half-done at minute 40. What do you say and do?</p>`,
      ex: `<p>Good: summarise what is decided, list what remains in 3 bullets, and ask which item the interviewer cares about most.</p>`,
      bw: `<p>Keeps going silently on the sharding detail and never reaches failure modes or wrap-up.</p>`,
      bc: `(keeps drawing shard boxes until time is called)`,
      mq: ['At minute 40 with a half-finished deep dive you should', ['Continue silently', 'Summarise, list the remaining items, and let the interviewer choose', 'Restart the design', 'Apologise and stop'], 1, 'Summarise and prioritise with the interviewer.'],
      h: ['<p>Hint 1: Say the time out loud.</p>', '<p>Hint 2: Summarise the decision made so far in one sentence.</p>', '<p>Hint 3: Offer 2-3 remaining items and ask for a priority.</p>'],
      ap: `<p>Model answer: "I notice we're at about 40 minutes, so let me make sure we cover what matters most to you. Quick summary of where we are: we shard the link table by short code using consistent hashing, so reads and writes spread evenly, and we replicate each shard three ways for availability. What I haven't covered yet is three things: first, what happens when a shard goes down, second, hot keys, such as a viral link overloading one shard, and third, monitoring and rollout. In the next five minutes I can do the hot-key problem in depth with a short mention of the others, or briefly cover all three. Which would you prefer?" Stating the time, summarising, listing the gaps, and letting the interviewer choose turns a pacing problem into a demonstration of leadership.</p>`,
      fu: ['How could you have avoided being behind?', 'What if the interviewer says "continue as you like"?'] })
  ]
});
topics.push({
  title: 'Full Mock Transcript: Coding Round (Two Sum / Top-K) - Good vs Poor',
  analogy: `<p>Watching a recorded football match teaches more than reading rules. Below are two recordings of the <b>same</b> problem: one played well, one badly. Spot the moments that decide the match.</p>`,
  explain: `<p>Problem: <b>"Given an array of integers and a target, return the indexes of two numbers that add up to the target."</b> Same knowledge in both runs; only the communication differs.</p>
  <p><b>GOOD run (annotated):</b></p>
  <blockquote><p><b>I:</b> Given nums and target, return indexes of two numbers that sum to target.<br>
  <b>You:</b> "Let me restate: pick two different positions whose values sum to target, return their indexes. Questions: can numbers be negative or repeat? Is there always exactly one answer? How large can the array be? <span class="c-m">[I-C-E-O, 3 questions]</span>"<br>
  <b>I:</b> "Negatives and repeats yes. Exactly one answer. Up to 10<sup>5</sup> items."<br>
  <b>You:</b> "So with [2,7,11,15] and 9, I return [0,1]. Brute force is checking every pair: O(N<sup>2</sup>) time, O(1) space. At 10<sup>5</sup> that's 5 billion checks - too slow. <span class="c-m">[brute force + cost + why it fails the constraint]</span> The waste is re-scanning for a partner. If I remember seen numbers in a hash map, the partner lookup is O(1): O(N) time, O(N) space. Shall I code that?" <span class="c-m">[checkpoint]</span><br>
  <b>I:</b> "Go ahead."<br>
  <b>You:</b> (codes, narrating) "I check for the partner before storing the current number so an element never pairs with itself."<br>
  <b>You:</b> "Test: [2,7,11,15], 9 - at 7 I need 2, found at index 0, return [0,1]. Edge: [3,3], 6 returns [0,1]. No-answer returns empty." <span class="c-m">[dry run + edges]</span>
  <br><b>I:</b> "What if the array is sorted and memory is tight?"<br>
  <b>You:</b> "Two pointers: O(N) time, O(1) space. I'd need to keep original indexes if the array was sorted by me."</p></blockquote>
  <p><b>POOR run (annotated):</b></p>
  <blockquote><p><b>I:</b> same problem.<br>
  <b>You:</b> "Okay." (types a nested loop immediately) <span class="c-r">[no questions, no plan]</span><br>
  <b>I:</b> "What's the complexity?"<br>
  <b>You:</b> "Uh... N squared? Maybe N log N." <span class="c-r">[unsure of own code]</span><br>
  <b>I:</b> "Can you do better?"<br>
  <b>You:</b> (long silence) <span class="c-r">[4 minutes]</span> "I think... sorting?"<br>
  <b>I:</b> "What do you recompute?"<br>
  <b>You:</b> "Nothing really." <span class="c-r">[dismisses hint]</span><br>
  <b>You:</b> "Done." <span class="c-r">[no test]</span><br>
  <b>I:</b> "What about [3,3] with 6?" -> bug found by the interviewer.</p></blockquote>`,
  clues: ['Same code can score "strong hire" or "no hire" - the story around it decides', 'The interviewer asks "what is the complexity?" - you should have said it already', 'The interviewer finds the bug, not you - testing was skipped', 'Phrases like "I think this works" without a trace - say what the values are', 'Interviewer says "can you do better?" - you needed the brute-force baseline stated earlier'],
  code: [{ lang: 'text', title: 'Interviewer score card for the two runs', code: `SIGNAL                     GOOD RUN              POOR RUN
Clarifying questions       3, changed design     0
Brute force stated         yes, with cost        no
Optimization journey       reasoned              guessed
Hint handling              n/a                   dismissed
Code narration             why, not what         silent
Testing                    sample + 3 edges      none
Complexity stated          unprompted            after prompting, unsure
Time used                  38 of 45              44 of 45, unfinished
Likely rating              Strong Hire           No Hire` }],
  codeTitle: ['Score card: good vs poor'],
  viz: [dialogueViz('Coding-round transcript: good vs poor', {
    good: { intro: 'Good run, line by line.', lines: [['You: restate + 3 questions', 'g', 'Minute 0-3. Restate and ask I-C-E-O questions. Interviewer answers: negatives, duplicates, one answer, N up to 100k.'], ['You: brute O(N^2), too slow at 100k', 'g', 'Minute 3-6. Baseline with cost, tied to the constraint.'], ['You: waste = rescanning; use hash map', 'g', 'Minute 6-9. Names the waste, proposes the fix, states O(N) time and space.'], ['You: "OK to code?" -> go ahead', 'g', 'Checkpoint before coding.'], ['You: code, narrate the why', 'g', 'Minute 9-22. Lookup before store, explained.'], ['You: dry run + 3 edge cases', 'g', 'Minute 22-30. Traces values; tests [3,3], none, empty.'], ['You: sorted/O(1) space follow-up', 'g', 'Minute 30-38. Offers two-pointer variant with trade-off.']], verdict: '<b>Interviewer notes:</b> "Clear communicator, optimal solution, tested own code, handled follow-up." <b>Strong Hire.</b>' },
    poor: { intro: 'Poor run, line by line.', lines: [['You: "Okay" -> nested loop', 'r', 'Minute 0-1. No questions, no plan. Coding begins immediately.'], ['I: "Complexity?" You: "N^2? N log N?"', 'r', 'Minute 8. Unsure of own code.'], ['I: "Better?" You: (4 min silence)', 'r', 'Minute 9-13. Silent; interviewer waits.'], ['I: hint -> You: "Nothing recomputed"', 'r', 'Minute 14. Hint dismissed.'], ['I: bigger hint -> You: code hash map', 'r', 'Minute 20. Gets there only after a large hint.'], ['You: "Done" (no test)', 'r', 'Minute 36. No testing.'], ['I finds [3,3] bug', 'r', 'Minute 40. The interviewer discovers the failure.']], verdict: '<b>Interviewer notes:</b> "Silent, needed large hints, did not test, bug found by me." <b>No Hire</b>, although the final idea was correct.' }
  }, 'good'), {
    title: 'Same problem, scored by signal',
    input: 'good',
    inputLabel: 'Type good or poor',
    gen: function (input) {
      var s = String(input).trim().toLowerCase();
      if (s !== 'good' && s !== 'poor') throw new Error('Type good or poor');
      var sig = [['Clarifying questions', 3, 0], ['Brute force + cost', 3, 0], ['Optimization reasoning', 3, 1], ['Hint handling', 3, 0], ['Code narration', 3, 1], ['Testing', 3, 0], ['Complexity', 3, 1]];
      var rows = [], frames = [], tot = 0, i;
      frames.push({ narr: 'Seven signals, each worth up to 3 points. Run: <b>' + s + '</b>.', parts: [{ type: 'table', label: 'Score card', columns: ['Signal', 'Points'], rows: sig.map(function (x) { return [x[0], '?']; }) }] });
      for (i = 0; i < sig.length; i++) {
        var pts = s === 'good' ? sig[i][1] : sig[i][2]; tot += pts; rows.push([sig[i][0], pts + ' / 3']);
        var hl = {}; hl[i] = pts >= 2 ? 'ok' : 'bad';
        frames.push({ narr: sig[i][0] + ': <b>' + pts + '</b> of 3. ' + (pts >= 2 ? '<span class="c-g">Strong signal.</span>' : '<span class="c-r">Weak signal.</span>'), parts: [{ type: 'table', label: 'Score card', columns: ['Signal', 'Points'], rows: rows.concat(sig.slice(i + 1).map(function (x) { return [x[0], '?']; })), hl: hl }, { type: 'vars', vals: { total: tot + ' / 21' }, hl: { total: pts >= 2 ? 'ok' : 'bad' } }] });
      }
      frames.push({ narr: 'Total ' + tot + ' / 21: ' + (tot >= 17 ? '<span class="c-g">Strong Hire</span>' : tot >= 12 ? '<span class="c-y">Lean Hire</span>' : '<span class="c-r">No Hire</span>') + '. The code was identical; the communication changed the score.', parts: [{ type: 'bars', label: 'Points per signal', values: sig.map(function (x) { return s === 'good' ? x[1] : x[2]; }), idxLabels: sig.map(function (x) { return x[0].split(' ')[0]; }), hl: { 0: 'sel' } }] });
      return frames;
    }
  }],
  examples: [
    { title: 'Top-K Frequent: opening 60 seconds (good)', html: `<p>"Restating: return the k values that appear most often. Questions: any negatives? how big is N? ties OK in any order? ... Brute force: count, sort by count, take k - O(D log D). We sort everything to keep k, so a bucket-by-frequency or heap of size k is better. I'll go with buckets for O(N), unless you'd prefer the heap."</p>` },
    { title: 'Coding narration that adds value', html: `${H.table(['Weak narration', 'Strong narration'], [['"Now I make a dictionary."', '"A counter, so each value maps to its frequency."'], ['"Then a for loop."', '"I walk the buckets from the highest count down, so the first k I meet are the most frequent."'], ['"Return the list."', '"Return early once I have k; remaining buckets are never touched."']])}` },
    { title: 'The 10-second recovery after a bug', html: `<p>You spot the bug in your own code: <b>"I see it - the loop bound should be len(nums) + 1, otherwise a value that appears in every position is lost. Fixing... re-running the sample... good."</b> Calm, specific, verified.</p>` },
    { title: 'Closing summary (15 seconds)', html: `<p>"To summarise: hash map one-pass, O(N) time, O(N) space; tested sample, duplicates, empty and no-answer. With more time I'd fuzz-test against the brute force and handle overflow in other languages."</p>` }
  ],
  deepDive: `<p><b>What the interviewer writes in feedback (real phrasing).</b> Strong: "Drove the problem end-to-end. Asked relevant questions, arrived at the optimal solution via brute force, tested thoroughly. Easy to work with." Mixed: "Reached the optimal solution but only after a hint; narration was thin during coding; testing was shallow." Weak: "Silent for long periods; I couldn't evaluate thought process; solution had a bug they didn't catch."</p>
  <p><b>The calibration trap.</b> Many candidates believe "I got the right answer, so I passed." In reality many companies score the <i>process</i> too: problem solving, coding fluency, verification, and communication are separate rows. A correct answer with a weak process often gets "lean no hire"; a near-correct answer with an excellent process often gets "lean hire".</p>
  <p><b>Practising with transcripts.</b> Record a mock round, transcribe it, and highlight each of your sentences as: question, plan, narration, test, filler. If filler or silence exceeds 25%, rehearse the template phrases until they are automatic. Reading your own transcript is humbling and very effective.</p>
  <p><b>Language of confidence.</b> Replace "I think this might work" with "This should work because X; let me verify." Replace "I'm not sure" with "I'd verify by testing Y." Hedge with a plan, not with a shrug.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI-written transcripts are now easy to memorise; interviewers push off-script with "why that data structure?" and "change one constraint". The good run above survives that, because every step has a reason.</p>
  <p><b>Use AI as a partner:</b> paste your transcript and ask <code>Label each of my sentences as question, plan, narration, test, or filler. List 3 places I should have checkpointed with the interviewer. Do not rewrite my code.</code></p>
  <p><b>Where AI goes wrong:</b> it writes "perfect" model dialogue that sounds unnatural and too long; copying it makes you sound scripted. <b>What you must still own:</b> your own voice - short sentences, real questions, honest uncertainty - and the ability to adapt when the interviewer changes the problem midway.</p>`,
  problems: [
    P({ t: 'Narrate the First 5 Minutes of Two Sum', lv: 'Easy', tags: ['mock', 'coding round'],
      st: `<p>The interviewer reads: "Given an array of integers and a target, return indexes of two numbers that add up to the target." Say your first 5 minutes out loud (questions, brute force, optimization, checkpoint).</p>`,
      ex: `<p>Aim: 3 questions, brute with cost, waste, optimized idea, checkpoint.</p>`,
      bw: `<p>Starts typing a nested loop silently; discusses the plan only when asked.</p>`,
      bc: `"Okay." [types two for loops]`,
      mq: ['Which opening is strongest?', ['Start coding immediately', 'Restate, ask 3 questions, state brute force and cost, propose the improvement, ask to proceed', 'Describe your career', 'Ask the interviewer for the solution'], 1, 'Structure plus checkpoint.'],
      h: ['<p>Hint 1: Restate with an example.</p>', '<p>Hint 2: Brute force with cost, then name the waste.</p>', '<p>Hint 3: Close with the optimized plan and ask permission to code.</p>'],
      ap: `<p>Model answer: "Let me restate: I get a list of integers and a target, and I return the positions of two different elements that add up to the target. A few questions: can there be negative numbers or duplicates? Is there always exactly one valid pair? And how large can the array be? ... Great, so up to a hundred thousand elements with exactly one answer. My example: numbers 2, 7, 11, 15 and target 9 gives positions 0 and 1. The simple approach checks every pair: that's O(N squared) time and constant space, and at a hundred thousand elements it's about five billion checks, which is too slow. The wasted work is that for each number I scan the rest of the array looking for its partner. If I store numbers I have already seen in a hash map from value to index, the partner check becomes one lookup. That gives O(N) time and O(N) space. I'll look up before inserting so an element can't pair with itself. Does this plan sound good, or should I discuss the sorted two-pointer alternative first?" About 70 seconds.</p>`,
      fu: ['Which part would you shorten if you had only 30 seconds?', 'What if the interviewer already knows the problem?'] }),
    P({ t: 'Interviewer Says "That Is Wrong" and You Think It Is Right', lv: 'Hard', tags: ['pushback', 'verification'],
      st: `<p>After your Top-K solution, the interviewer says "I think that returns the wrong result for ties." You believe tie order is allowed. What do you say?</p>`,
      ex: `<p>Good: verify with a concrete case, restate the requirement agreed earlier, concede if wrong, offer a tie-breaker if desired.</p>`,
      bw: `<p>Argues "No, it's correct" without testing, or caves instantly "Oh sorry, you're right" without checking.</p>`,
      bc: `"No, it's correct." (or) "Oh, you're right, sorry."`,
      mq: ['Interviewer says your code is wrong. First move?', ['Argue', 'Concede at once', 'Test a concrete case and compare with the agreed requirement', 'Rewrite everything'], 2, 'Evidence over ego or reflex.'],
      h: ['<p>Hint 1: Ask for the failing case or make one.</p>', '<p>Hint 2: Recall what was agreed about ties.</p>', '<p>Hint 3: Offer a deterministic tie-break as an option.</p>'],
      ap: `<p>Model answer: "Let me check that with a concrete case so we're on the same page. Take [4,4,5,5,6] with k equal to 2. Both 4 and 5 appear twice and 6 once, so the answer is 4 and 5 in some order. My code returns them from the same bucket in insertion order, which gives 4 then 5. Earlier we agreed that ties can be returned in any order, so I believe this is correct under that requirement. But if you need a deterministic order, for example the smaller value first, I can sort within each bucket, which costs an extra log factor on the bucket size but is still cheap. And if I'm missing a case where the set of values itself is wrong, not just the order, please show me and I'll trace it. Which interpretation did you have in mind?" This stays calm, tests, references the agreement, concedes nothing falsely, and stays open.</p>`,
      fu: ['What if you trace it and discover you are wrong?', 'How do you avoid sounding combative?'] })
  ]
});
topics.push({
  title: 'AI-Assisted Interview Formats: What Is Allowed and How to Communicate',
  analogy: `<p>Think of an open-book exam. Having the book does not mean the exam is easy - the questions get harder and the teacher watches <b>how well you use the book</b>. AI-assisted interviews are open-book: the grade is about your judgment with the tool.</p>`,
  explain: `<p>By 2026 interview formats fall into three buckets. <b>Always ask the recruiter or interviewer which one applies</b> - rules differ by company and role.</p>
  ${H.table(['Format', 'AI allowed?', 'What they measure', 'How to communicate'], [['Classic (no AI)', 'No - using it is cheating and gets you rejected', 'Raw problem solving, coding, clear speech', 'Everything in this module'], ['AI-assisted round', 'Yes - an assistant is built into the editor or provided', 'Judgment: prompting, reviewing, testing, fixing AI output', 'Narrate prompts and verification'], ['Take-home / project + review', 'Often yes, with disclosure', 'Ownership: you must explain every line afterwards', 'Keep notes of decisions; be ready to defend']])}
  <p><b>Golden rules:</b></p>
  <ol><li><b>Never use hidden AI</b> in a round that says no AI. Real-time hidden assistants and second screens are treated as fraud and can get you rejected.</li><li><b>Ask first:</b> "Is it okay to use an assistant? Which one? Should I narrate my prompts?"</li><li><b>Plan before you prompt.</b> Say the approach, then ask the AI for a small, specific piece.</li><li><b>Read everything it writes.</b> Say what you check: edge cases, complexity, naming, security.</li><li><b>Test it.</b> Run it. Write at least one test the AI did not suggest.</li><li><b>Own the final answer.</b> "I kept this, changed that, and rejected this suggestion because..."</li></ol>
  <p>A good narration in an AI-assisted round sounds like: <i>"I'll ask it to scaffold the parser, not the whole solution. ... It used a regex that fails on nested quotes. I'll fix that by hand and add a test."</i></p>`,
  clues: ['Invite says "you may use the provided AI assistant" - this is an AI-assisted format', 'Interviewer asks "walk me through what the AI generated" - they test comprehension', 'Take-home with "AI tools permitted, please disclose" - disclose and be ready for a deep follow-up', 'Prompt says "no external tools" - classic round; do not use any assistant', 'Larger task (extend a codebase, fix a failing test) instead of a puzzle - AI-enabled style round'],
  code: [{ lang: 'text', title: 'Narration cheat sheet for AI-assisted rounds', code: `BEFORE:  "Is AI allowed? Which tool? Any rules on prompts?"
PLAN:    "My plan is X. I will use the assistant for Y, not for the core logic."
PROMPT:  "Prompt: 'Write a function that ..., O(N), handle empty input.'"
REVIEW:  "Checking its output: loop bound OK, edge case empty is missing, complexity is O(N)."
TEST:    "Running sample... failing for duplicates. I'll fix the order of lookup/insert."
OWN:     "Final version: I kept A, changed B, rejected C because D."
NEVER:   silent copy-paste, hidden second screen, saying 'AI wrote it' as an excuse` }],
  codeTitle: ['AI-round narration'],
  viz: [dialogueViz('AI-assisted round: weak vs strong use of the assistant', {
    strong: { intro: 'Strong use of an AI assistant.', lines: [['You: "Plan: hash map. Ask AI for tests"', 'g', 'You state the plan first and limit the AI to a helper role.'], ['AI: generates 5 tests', 'b', 'The assistant produces tests quickly.'], ['You: "Test 4 expects wrong value"', 'g', 'You recompute by hand and catch an AI error.'], ['You: "Fixing the expected value"', 'g', 'You correct it and say why.'], ['You: "Added a test for duplicates"', 'g', 'You add what the AI missed.'], ['You: "Kept 4 of 5, wrote 1 myself"', 'g', 'Clear ownership of the final result.']], verdict: '<b>Feedback:</b> "Used the AI as a force multiplier, verified its output, and explained choices." Strong hire signal on judgment.' },
    weak: { intro: 'Weak use of an AI assistant.', lines: [['You: pastes the whole problem', 'r', 'No plan or clarifying questions.'], ['AI: generates full solution', 'b', 'The assistant answers confidently.'], ['You: pastes it in, silent', 'r', 'No reading, no narration.'], ['I: "Why does line 7 work?"', 'b', 'Interviewer probes comprehension.'], ['You: "The AI wrote it"', 'r', 'You cannot explain your own submission.']], verdict: '<b>Feedback:</b> "Could not explain or debug the code. No evidence of independent judgment." No hire, even though the code ran.' }
  }, 'strong'), {
    title: 'Which format is it? Decision flow',
    input: 'ask',
    inputLabel: 'What the invite says: ask / allowed / forbidden',
    gen: function (input) {
      var s = String(input).trim().toLowerCase();
      if (['ask', 'allowed', 'forbidden'].indexOf(s) < 0) throw new Error('Type ask, allowed or forbidden');
      var nodes = [{ id: 'R', label: 'Read the invite', x: 8, y: 25, shape: 'box', w: 22 }, { id: 'A', label: 'AI allowed', x: 50, y: 8, shape: 'box', w: 22 }, { id: 'F', label: 'AI forbidden', x: 50, y: 42, shape: 'box', w: 22 }, { id: 'Q', label: 'Ask recruiter', x: 50, y: 25, shape: 'box', w: 22 }, { id: 'D1', label: 'Plan, prompt, review, test', x: 86, y: 8, shape: 'box', w: 26 }, { id: 'D2', label: 'Classic habits only', x: 86, y: 42, shape: 'box', w: 26 }];
      var edges = [['R', 'A'], ['R', 'Q'], ['R', 'F'], ['Q', 'A'], ['Q', 'F'], ['A', 'D1'], ['F', 'D2']];
      var frames = [], hl = { R: 'cur' };
      frames.push({ narr: 'Start by reading the invitation carefully. Invite status: <b>' + s + '</b>.', parts: [{ type: 'graph', label: 'Format decision', directed: true, height: 52, nodes: nodes, edges: edges, hl: hl }] });
      var path = s === 'allowed' ? ['A', 'D1'] : s === 'forbidden' ? ['F', 'D2'] : ['Q', 'A', 'D1'];
      var tx = { A: 'AI is allowed. Plan first, prompt small, read, test, and explain.', F: 'AI is forbidden. Do not use any assistant or second screen.', Q: 'Not stated. <b>Ask</b> the recruiter before the round: tool, rules, narration.', D1: 'Narrate prompts and verification; own the result.', D2: 'Use clarify, think-aloud, dry-run habits from this module.' };
      path.forEach(function (id) { hl = { R: 'done' }; hl[id] = 'cur'; frames.push({ narr: tx[id], parts: [{ type: 'graph', label: 'Format decision', directed: true, height: 52, nodes: nodes, edges: edges, hl: hl }] }); });
      frames.push({ narr: 'Whatever the format, the winning habits are the same: <b>ask, plan, narrate, verify, own.</b>', parts: [{ type: 'text', html: '<b>Ask - Plan - Narrate - Verify - Own.</b>' }] });
      return frames;
    }
  }],
  examples: [
    { title: 'Opening an AI-assisted round', html: `<p>"Before I start: I can use the assistant, correct? Should I say my prompts aloud? ... Great. My plan: first I'll read the failing test and the module, then I'll ask the assistant to explain the suspicious function, and I'll write the fix myself."</p>` },
    { title: 'Catching an AI mistake out loud', html: `<p>"The assistant suggests sorting the list in place. That changes the input for the caller - a hidden side effect. I'll copy first, or use a key-based lookup instead. I'll tell it: 'do not mutate the input'."</p><p><b>Interviewer note:</b> "Reviewed AI output critically and caught a side-effect bug."</p>` },
    { title: 'Take-home with disclosure', html: `<p>In your README: "I used an AI assistant for boilerplate and test scaffolding. I wrote the core algorithm, reviewed every generated line, and replaced two suggestions (see notes). Decisions and trade-offs are listed below." Then be ready to explain each decision live.</p>` },
    { title: 'Things that cross the line', html: `${H.table(['Behaviour', 'Verdict'], [['Hidden real-time assistant in a no-AI round', '<span class="c-r">Cheating - rejection / ban</span>'], ['Using AI when allowed, silently', '<span class="c-y">Allowed but scored low on communication</span>'], ['Using AI when allowed, narrating and verifying', '<span class="c-g">Ideal</span>'], ['Having someone else take the round', '<span class="c-r">Fraud</span>']])}` }
  ],
  deepDive: `<p><b>What the interviewer writes.</b> Rubrics for AI-assisted rounds usually add rows such as <i>AI collaboration</i> (prompt quality, scoping), <i>code review of AI output</i> (found bugs, security, performance), and <i>ownership</i> (can explain and modify). Typical lines: "Scoped prompts well and verified output", "Accepted a subtly wrong solution without testing", "Could not explain generated code".</p>
  <p><b>Why companies run them.</b> Real work now involves assistants. Companies want to know if you stay accountable for what ships. Counter-intuitively, these tasks are often <i>harder</i>: bigger codebase, ambiguous requirements, and hidden bugs that assistants tend to miss.</p>
  <p><b>Prompt hygiene.</b> Good prompts state the goal, constraints (language, complexity, no mutation), and the output format; bad prompts paste the whole problem. Include "ask me clarifying questions if needed" when exploring. Keep prompts short so you can narrate them.</p>
  <p><b>Verification checklist for AI code:</b> Does it compile and run? Empty/one/duplicate inputs? Complexity as claimed? Off-by-one in loops? Mutation of inputs? Security (injection, secrets)? Hallucinated API (a method that does not exist)? Unused or duplicated code?</p>
  <p><b>Integrity and policy.</b> Rules change by company and year; follow the written instructions of each interview. If unclear, ask in writing. Honesty about what you used is never penalised as much as getting caught hiding it.</p>`,
  aiEra: `<p><b>What AI changes (summary):</b> Communication is now double: you talk to the interviewer <i>and</i> to the tool. The skills that separate candidates are scoping, verifying, and explaining, not typing speed.</p>
  <p><b>Practise like this:</b> <code>Act as a codebase with 2 hidden bugs. Let me ask you for hints in small steps. After I fix them, grade me on prompt quality, verification, and explanation.</code> Also practise a full round with the assistant off, so you do not become dependent.</p>
  <p><b>Where AI goes wrong:</b> hallucinated functions, confidently wrong complexity, silently mutated inputs, tests that mirror the bug. <b>What you must still own:</b> the question "how do I know this is right?" and a spoken answer to it.</p>`,
  problems: [
    P({ t: 'The AI Assistant Gives You Buggy Code in the Round', lv: 'Hard', tags: ['AI-assisted', 'verification'],
      st: `<p>In an AI-assisted round the assistant writes a Top-K function. On your dry run you find it fails on ties and mutates the input. The interviewer is watching. What do you say and do?</p>`,
      ex: `<p>Good: narrate the review, show the failing case, fix by hand or with a precise follow-up prompt, add a test.</p>`,
      bw: `<p>Pastes the code, runs the happy path only, says "looks good". The interviewer finds the bug.</p>`,
      bc: `"The AI wrote it, it seems fine. Done."`,
      mq: ['The assistant produced code that fails an edge case. Best response?', ['Hide it', 'Say what failed, fix it, and add a test', 'Blame the AI', 'Ask the interviewer to fix it'], 1, 'Show review judgment and ownership.'],
      h: ['<p>Hint 1: Review before running; read line by line.</p>', '<p>Hint 2: Show the failing input and expected output.</p>', '<p>Hint 3: Decide: fix by hand or re-prompt precisely; then add a regression test.</p>'],
      ap: `<p>Model answer: "Before I run this, I'll read it. The assistant sorted the input array in place, which mutates the caller's data - not acceptable for a utility function. I'll test with [4,4,5,5,6] and k = 2. It returns [4, 6], but 6 appears once, so the answer should be 4 and 5. The bug is that the values were not ordered by frequency before taking the first k. I'll fix this by hand: build the counts, put values into buckets by frequency, and read from the highest bucket. It's quicker than explaining it in a prompt, and I want to be sure of the logic. I'll also copy rather than mutate. Then I'll add a regression test for ties and one for the input not being modified, and rerun everything. For the notes: the assistant is good at scaffolding but was wrong on correctness, so I'd always require tests before merging generated code." This narrates the review, shows the failing input, fixes, tests, and generalises.</p>`,
      fu: ['When would you re-prompt instead of fixing by hand?', 'What would you tell a teammate who trusts AI output blindly?'] })
  ]
});
// ---------------- PRACTICE (13 scenarios) ----------------
practice.push(P({ t: 'Interviewer Gives a Hint: What Do You Say?', lv: 'Easy', tags: ['hints'],
  st: `<p>You are solving "Find the first non-repeating character". The interviewer says: <b>"Do you need to scan the string more than once?"</b> What do you say?</p>`,
  ex: `<p>Good: thank them, interpret the hint, propose two passes (count, then find), state O(N).</p>`,
  bw: `<p>Says "no" defensively or freezes. Wastes the hint.</p>`, bc: `"Hmm. I do not think so." (silence)`,
  mq: ['What does a hint like this usually mean?', ['You are wrong', 'A different structure can make a second pass cheap', 'Time is up', 'Skip the problem'], 1, 'Hints point to a direction; explore it.'],
  h: ['<p>Hint 1: Acknowledge.</p>', '<p>Hint 2: Count once, look up once.</p>', '<p>Hint 3: Test on "aabbc".</p>'],
  ap: `<p>Model answer: "Thanks, that's a good nudge. Right now I'm checking each character against the rest, which is a scan inside a scan. If I allow two simple passes instead, I can count how often each character appears in the first pass, using a hash map, and in the second pass walk the string in order and return the first character whose count is one. That's O(N) time and O(K) space, where K is the alphabet size. Let me test it on aabbc: counts a2 b2 c1; second pass skips a and b and returns c. It works, and it also handles the empty string by returning no answer. I'll code it now unless you'd like me to compare with a single-pass ordered-map version."</p>`,
  fu: ['What if the hint contradicts your idea?', 'How long should you think after a hint?'] }));

practice.push(P({ t: 'Stuck for 3 Minutes: Speak Up', lv: 'Easy', tags: ['stuck'],
  st: `<p>You have been silent for 3 minutes. The interviewer has said nothing. What do you say right now?</p>`,
  ex: `<p>Good: share the blocker, what you tried, and the next step.</p>`,
  bw: `<p>Keeps silent, hoping an idea arrives. The interviewer cannot help and cannot score your thinking.</p>`, bc: `(silence)`,
  mq: ['At 3 minutes stuck, you should', ['Wait another 3 minutes', 'State the blocker and what you have tried, then try a small example', 'Change the problem', 'Apologise only'], 1, 'Verbalise and move.'],
  h: ['<p>Hint 1: Start with "Let me share where I am".</p>', '<p>Hint 2: Name the blocker.</p>', '<p>Hint 3: Propose the next action.</p>'],
  ap: `<p>Model answer: "Let me share where I am so you can see my thinking. I have the brute force: check all pairs, which is O(N squared). I'm stuck on how to avoid re-scanning, because I can't see which information from earlier elements I'd need to keep. Let me try a small example by hand: [2, 7, 11, 15] with target 9. When I'm at 7, what do I wish I had known? That 2 appeared before. So I need a way to remember past values and ask 'have I seen 9 minus x?' quickly. That sounds like a hash set or map. Let me test that idea. If I get stuck again in a minute, I'll ask for a nudge." This breaks silence and shows a method.</p>`,
  fu: ['What if your idea fails the test?', 'When do you ask for a hint?'] }));

practice.push(P({ t: 'The Problem Statement Is One Vague Line', lv: 'Easy', tags: ['clarifying'],
  st: `<p>You hear: "Given a list of meetings, can a person attend all of them?" List the questions you ask in the first 60 seconds.</p>`,
  ex: `<p>Questions on format, boundaries (end equals start), size, and output.</p>`,
  bw: `<p>Starts coding without asking what a meeting looks like or whether touching times conflict.</p>`, bc: `"Okay" [types a loop]`,
  mq: ['Which question changes the code most?', ['Which language?', 'Can one meeting end exactly when another starts?', 'What colour is the calendar?', 'Who invented meetings?'], 1, 'Boundary rules change the comparison from strict to non-strict.'],
  h: ['<p>Hint 1: Ask for the data format.</p>', '<p>Hint 2: Ask about touching boundaries and sorting.</p>', '<p>Hint 3: Ask for output and N.</p>'],
  ap: `<p>Model answer: "Let me confirm the details. Each meeting is a pair of start and end times, as integers or timestamps? Are they sorted, or can they arrive in any order? If one meeting ends at 10 and the next begins at 10, is that a conflict? I'll assume it is not, since people can walk across. Are start times always before end times? How many meetings, roughly, since that tells me whether sorting is acceptable? And I return just true or false, not the conflicting pair? So my example: [[0,30],[5,10],[15,20]] returns false because 0-30 overlaps both others. Is that right? Then my plan is to sort by start and check neighbours." Six short questions, each with a reason, ending with an example.</p>`,
  fu: ['Which question would you ask first if time is short?', 'What if the interviewer says "assume anything"?'] }));

practice.push(P({ t: 'You Finish Early With 15 Minutes Left', lv: 'Easy', tags: ['time', 'follow-up'],
  st: `<p>You solved Valid Parentheses, tested it, and have 15 minutes left. The interviewer asks: "Anything else?"</p>`,
  ex: `<p>Good: offer variants, scale, complexity, and ask.</p>`,
  bw: `<p>"No, that's it." Silence follows.</p>`, bc: `"No, that's it."`,
  mq: ['Best use of spare time?', ['Nothing', 'Discuss variants, trade-offs, scale, then ask where to go', 'Rewrite from scratch', 'Ask to end early'], 1, 'Show depth and curiosity.'],
  h: ['<p>Hint 1: Recheck complexity.</p>', '<p>Hint 2: Offer a variant.</p>', '<p>Hint 3: Ask what they want to explore.</p>'],
  ap: `<p>Model answer: "Yes, I have a few thoughts. Complexity is O(N) time, and the stack is O(N) in the worst case, for example a string of only opening brackets. One improvement: if there is only one kind of bracket, a simple counter replaces the stack and uses O(1) space. A harder variant is the minimum number of removals to make the string valid, which I'd solve with a stack of indexes. For scale, if the string doesn't fit in memory, I'd process it in a stream, since the stack only needs the unmatched openers. Do you want me to go deeper on a variant, or on the streaming case?" Concrete, relevant, and hands the steering wheel back.</p>`,
  fu: ['What if you have no ideas for a follow-up?', 'Should you write new code unasked?'] }));

practice.push(P({ t: 'You Realise at Minute 30 Your Approach Is Wrong', lv: 'Medium', tags: ['course correction'],
  st: `<p>At minute 30 of 45, while dry running a greedy solution for "Merge intervals", you find it fails on nested intervals. What do you say?</p>`,
  ex: `<p>Good: announce, pinpoint, choose smallest fix, protect testing time.</p>`,
  bw: `<p>Hopes the interviewer will not notice and keeps coding, or panics and restarts from scratch.</p>`, bc: `(silently continues) or "Everything is wrong, I'll start over."`,
  mq: ['Approach is flawed at minute 30. Best move?', ['Ignore', 'Name the flaw, choose the smallest fix, keep time for tests', 'Restart completely without telling', 'Blame the problem'], 1, 'Transparent, time-aware fix.'],
  h: ['<p>Hint 1: Say it immediately.</p>', '<p>Hint 2: Show the failing input.</p>', '<p>Hint 3: Pick the smallest change and a fallback.</p>'],
  ap: `<p>Model answer: "I need to flag something. While tracing [[1,10],[2,3],[4,5]], my code outputs three intervals, but they should merge into one. My mistake: I'm taking each interval's end as the current end without using the maximum with the previous end, so nested intervals break it. I have about 15 minutes. The fix is small: after sorting by start, keep a running merged interval and update its end with max(end, next end). That's a two-line change, not a redesign. I'll make it, rerun the nested case and the sample, then add the touching-boundary case. If it doesn't hold, I'll fall back to describing the O(N squared) pairwise merge and why it's correct. Is that okay with you?" Calm, specific, time-aware, with a fallback.</p>`,
  fu: ['What if you only have 5 minutes left?', 'Is it better to patch or rewrite?'] }));

practice.push(P({ t: 'Interviewer Pushes Back on Your Cache Choice', lv: 'Medium', tags: ['design', 'pushback'],
  st: `<p>You proposed a write-through cache. The interviewer says: "That makes writes slow. Why not write-back?" Respond in 40 seconds.</p>`,
  ex: `<p>Good: concede the valid point, compare, decide with requirements.</p>`,
  bw: `<p>"Because it is safer" with no detail, or immediately switching without reasoning.</p>`, bc: `"Write-through is just better." (or) "Okay, write-back."`,
  mq: ['Biggest risk of write-back?', ['Slower reads', 'Data loss if the cache dies before flushing', 'Higher cost per read', 'None'], 1, 'Dirty data is lost on crash.'],
  h: ['<p>Hint 1: Name the trade-off both ways.</p>', '<p>Hint 2: Tie to requirements (durability vs write latency).</p>', '<p>Hint 3: State when you would switch.</p>'],
  ap: `<p>Model answer: "You're right that write-through adds latency, because every write waits for the database. I chose it because in this system a lost write means a lost payment record, so durability matters more than write speed. Write-back would cut write latency a lot and batch database writes, but if a cache node dies before flushing, we lose acknowledged data unless we add a durable log or replication of the dirty entries. If the data were less critical, such as view counters or a feed cache, I would use write-back with a short flush interval. For this payments flow, I'd keep write-through, and if latency becomes an issue, I'd first look at making the database write faster with batching and async acknowledgements through a durable queue. Does durability rank as high in your requirements as I assumed?" Concedes, compares, decides, asks.</p>`,
  fu: ['What if the interviewer insists on write-back?', 'How do you decide under uncertainty?'] }));

practice.push(P({ t: 'You Found a Bug During Your Own Dry Run', lv: 'Medium', tags: ['testing'],
  st: `<p>During a dry run of Binary Search you notice an infinite loop on [1, 2] searching for 2. How do you handle it aloud?</p>`,
  ex: `<p>Good: calm, specific, fix, re-verify.</p>`,
  bw: `<p>Embarrassed silence, or quickly changes a random line hoping it works.</p>`, bc: `"Oh no... uh... let me change this..." [random edit]`,
  mq: ['Finding a bug yourself during testing is', ['A failure', 'A positive signal if handled calmly', 'Something to hide', 'Proof you should stop'], 1, 'It shows verification discipline.'],
  h: ['<p>Hint 1: Narrate values at each iteration.</p>', '<p>Hint 2: Find which update does not shrink the range.</p>', '<p>Hint 3: Fix, then re-test the failing and the sample cases.</p>'],
  ap: `<p>Model answer: "Good, the dry run caught something. Searching [1, 2] for 2 with low 0 and high 1: mid is 0, nums[0] is 1, less than the target, so I set low to mid, which is still 0. Nothing changed, so it loops forever. The fix is low = mid + 1, because I already know mid isn't the answer. Let me re-trace: low 0, high 1, mid 0, 1 is less than 2, low becomes 1. Now mid is 1, nums[1] is 2, found, return 1. I'll also re-run my other cases: target 1 returns 0, target 3 returns -1 since low passes high, and the single-element array works. Complexity stays O(log N)." The bug is described by values, the fix is justified, and the regression cases are rerun.</p>`,
  fu: ['How do you avoid off-by-one errors?', 'Should you mention it if you fixed it quietly?'] }));

practice.push(P({ t: 'You Only Know the Brute Force', lv: 'Medium', tags: ['brute force', 'honesty'],
  st: `<p>You cannot see the optimal solution for "Longest increasing subsequence" in 10 minutes. How do you present what you have?</p>`,
  ex: `<p>Good: deliver brute force, then DP, state cost, ask for direction on optimal.</p>`,
  bw: `<p>Says "I don't know" and stops, or hides that it is slow.</p>`, bc: `"I only know the slow way. I give up."`,
  mq: ['You only have brute force. You should', ['Say you give up', 'Present it with its cost, improve what you can, and ask for a nudge', 'Pretend it is optimal', 'Skip coding'], 1, 'A correct baseline plus honesty beats nothing.'],
  h: ['<p>Hint 1: Describe brute force and cost.</p>', '<p>Hint 2: Improve to O(N squared) DP if you see it.</p>', '<p>Hint 3: Ask a specific question about the optimal.</p>'],
  ap: `<p>Model answer: "Here's what I have. The brute force tries every subsequence: 2 to the power N, far too slow. Looking at repeated work, the longest sequence ending at index i only depends on the best ones ending before i with a smaller value, so I can do DP: dp[i] equals 1 plus the max dp[j] for j before i with nums[j] smaller. That's O(N squared) time and O(N) space, fine for N up to a few thousand. I suspect there's an O(N log N) approach using a sorted structure of tails and binary search, but I don't remember how to reason it through. Could you give me a nudge on what to keep track of? Meanwhile I'll code the O(N squared) version so we have a correct solution." Honest, structured, shows progress and asks a precise question.</p>`,
  fu: ['How do you phrase "I have seen this before"?', 'What if the interviewer says O(N squared) is not enough?'] }));

practice.push(P({ t: 'The Interviewer Interrupts While You Code', lv: 'Medium', tags: ['interruptions'],
  st: `<p>Mid-function, the interviewer asks "Why a list here and not a set?" You are halfway through a line. What do you do?</p>`,
  ex: `<p>Good: pause typing, answer briefly, and resume with a recap.</p>`,
  bw: `<p>Keeps typing and mumbles, or loses the thread entirely.</p>`, bc: `(keeps typing) "Um, yeah, because..."`,
  mq: ['When interrupted while coding', ['Ignore it', 'Stop, answer in 2-3 sentences, then recap and continue', 'Delete your code', 'Answer at the end'], 1, 'Interruptions are collaboration, not attacks.'],
  h: ['<p>Hint 1: Hands off the keyboard.</p>', '<p>Hint 2: Answer with a reason and a trade-off.</p>', '<p>Hint 3: Recap where you were.</p>'],
  ap: `<p>Model answer: "Good question. (stops typing) I used a list because I need to preserve the order in which items arrive, and I index into it by position later. A set would give O(1) membership checks, but it would lose the order and not allow duplicates, which this problem requires. If I find I'm doing many membership checks, I can keep both: a list for order and a set for lookups, trading memory for speed. Does that answer it? ... Okay, back to the code: I was writing the loop that appends valid items to the result list, then I'll return it." The answer is short, reasoned, with a trade-off and a recap that restores the flow.</p>`,
  fu: ['What if the question reveals a real bug?', 'What if you lose your train of thought?'] }));

practice.push(P({ t: 'Design Round: The Interviewer Stays Silent', lv: 'Hard', tags: ['design', 'driving'],
  st: `<p>It is "Design a chat app". The interviewer gives the one-line prompt and then says nothing for the rest of your answer. How do you drive the first 10 minutes?</p>`,
  ex: `<p>Good: announce the plan, set scope, estimate, checkpoint often.</p>`,
  bw: `<p>Waits for guidance, or rambles through technologies.</p>`, bc: `"What do you want me to do?" (or) lists 12 technologies.`,
  mq: ['The interviewer is silent. You', ['Wait', 'Announce your plan and proceed with explicit assumptions and checkpoints', 'Ask them to design it', 'Stop'], 1, 'Silence is space to lead.'],
  h: ['<p>Hint 1: State the plan first.</p>', '<p>Hint 2: Assume scope and say so.</p>', '<p>Hint 3: Checkpoint at phase boundaries.</p>'],
  ap: `<p>Model answer: "I'll structure this as requirements, estimates, API, high-level design, then a deep dive, and I'll check in at each step. First scope; I'll assume one-to-one and small group chat, text and images, delivery status, persisted history, and mobile plus web. Out of scope for now: voice and video, and end-to-end encryption, which I can revisit. Non-functional: messages arrive within a second, no lost messages, and eventual consistency across devices is fine. Let me know if you want to change any of that. Numbers: 50 million daily users, 40 messages per user per day gives 2 billion messages a day, around 25,000 per second on average and maybe 100,000 at peak. At 200 bytes each, that is 400 GB a day, so storage needs sharding. Do those seem like a reasonable scale? I'll assume yes and move on to the API: send message, fetch history, and a WebSocket for delivery." The plan is announced, assumptions explicit, and checkpoints included even with a silent interviewer.</p>`,
  fu: ['How often should you check in with a silent interviewer?', 'What if they stay silent through the deep dive?'] }));

practice.push(P({ t: 'Interviewer Says "That Is Wrong" and You Think You Are Right', lv: 'Hard', tags: ['pushback', 'ego'],
  st: `<p>You claim your solution is O(N). The interviewer says "I think it is O(N squared) because of line 6." You believe you are right. Respond.</p>`,
  ex: `<p>Good: re-read the line, analyse cost precisely, accept if wrong.</p>`,
  bw: `<p>"No, it is O(N)" without checking the line's cost.</p>`, bc: `"No, I am sure it is O(N)."`,
  mq: ['Interviewer disputes your complexity claim. First step?', ['Insist', 'Re-analyse the specific line and cost out loud', 'Change the subject', 'Agree immediately'], 1, 'Evidence first.'],
  h: ['<p>Hint 1: Ask which line.</p>', '<p>Hint 2: Count operations for that line.</p>', '<p>Hint 3: Fix if needed, with a better structure.</p>'],
  ap: `<p>Model answer: "Let me look at line 6 carefully. It checks 'if x in result' where result is a list. A membership check on a list is O(N) per call, and it runs once per element in a loop of N, so overall that's O(N squared) in the worst case. You're right, and thank you for catching it - I assumed the check was O(1) because I was thinking of a set. The fix is to keep a set of seen items next to the result list, or to use the set alone if I don't need order. That makes each check O(1) on average, so the total is O(N), with O(N) space. I'll make that change and re-state the complexity. Good lesson: I should state the cost of each line when I claim a total." Concedes with evidence, fixes, and learns out loud.</p>`,
  fu: ['What if you were actually right?', 'How do you check a line\'s cost quickly?'] }));

practice.push(P({ t: 'Out of Time in a Design Round (Minute 40)', lv: 'Hard', tags: ['design', 'time management'],
  st: `<p>It is minute 40 of 45 and the interviewer has not seen failure handling or monitoring. How do you wrap up?</p>`,
  ex: `<p>Good: summarise design, list gaps by priority, cover the top one briefly.</p>`,
  bw: `<p>Keeps elaborating on the current component, then is cut off mid-sentence.</p>`, bc: `(continues deep dive until the interviewer ends the call)`,
  mq: ['At minute 40 with gaps left', ['Continue the deep dive', 'Summarise, prioritise gaps, and cover the most important briefly', 'Start again', 'Say nothing'], 1, 'Controlled landing.'],
  h: ['<p>Hint 1: Say the time.</p>', '<p>Hint 2: One-sentence summary.</p>', '<p>Hint 3: Name gaps and cover the top one.</p>'],
  ap: `<p>Model answer: "We're at about 40 minutes, so let me wrap up in a structured way. In summary: clients connect over WebSockets to a stateless gateway, messages go through a queue to a sharded message store, and a presence service tracks online users. Gaps I haven't covered: failure handling, monitoring, and the cost. Given our remaining time, I'll take failures first. If a gateway dies, clients reconnect to another and request messages after their last acknowledged ID, so nothing is lost since messages are persisted before acknowledgement. If a shard fails, replicas take over and writes queue until the leader is elected. For monitoring, I'd watch delivery latency percentiles, queue depth, and error rate, with alerts on the queue lag. With more time, I'd go into multi-region replication and cost. Is there something you'd prefer me to cover in the last minutes?" Lands the plane: summary, prioritised gaps, one covered properly, and an offer.</p>`,
  fu: ['How would you have saved 5 minutes earlier?', 'What if the interviewer says "take more time"?'] }));

practice.push(P({ t: 'Handle a Mid-Round Constraint Change', lv: 'Hard', tags: ['adaptability', 'follow-up'],
  st: `<p>You finished a hash-map Two Sum. The interviewer says: "Now the data is a stream of 10 billion numbers and you have 1 GB of memory." What do you say?</p>`,
  ex: `<p>Good: restate the new constraint, show what breaks, offer options with trade-offs.</p>`,
  bw: `<p>"That is impossible" or insists the old solution is fine.</p>`, bc: `"Then it can't be done."`,
  mq: ['A new constraint appears. First step?', ['Say impossible', 'Restate it and identify what in your solution breaks', 'Keep the old solution', 'Ask to end'], 1, 'Adapt calmly and analytically.'],
  h: ['<p>Hint 1: Compute the memory needed by the old approach.</p>', '<p>Hint 2: Ask whether approximate answers or multiple passes are allowed.</p>', '<p>Hint 3: Offer partitioning or external sort.</p>'],
  ap: `<p>Model answer: "Let me restate: 10 billion numbers, a stream, about 1 GB of memory. My hash map would need roughly 10 billion entries times at least 16 bytes, which is 160 GB, so it breaks. Let me ask two things: can I make multiple passes over the data, and is it okay to return any one pair, or must I find all? Assuming I can do a few passes and need one pair: I can partition by hash of the value. A number x and its partner target minus x need to land in the same bucket, so I hash on the smaller of the two canonical forms, or bucket by min(x, target minus x). Write those to disk in, say, 200 chunks of about 50 million numbers, and then solve each chunk in memory with the hash map. That is O(N) time overall with two passes of disk I/O. If only one pass is allowed and the stream can't be stored, I'd say exact answers aren't possible in 1 GB, and I'd discuss a probabilistic filter that yields candidates." Names the break, quantifies, asks clarifying questions, gives options.</p>`,
  fu: ['What if only one pass is allowed?', 'How would you test the partitioned version?'] }));

practice.push(P({ t: 'Mock Full Round: Summarise Your Behaviour in Three Sentences', lv: 'Hard', tags: ['self-review', 'practice plan'],
  st: `<p>After recording a mock round, you must tell a peer what went well, what to fix, and your plan for the next mock. Give the three-sentence summary and the practice plan.</p>`,
  ex: `<p>Good: specific evidence, one or two fixes, measurable next steps.</p>`,
  bw: `<p>"It went fine, I just need to practise more."</p>`, bc: `"Went okay. Will practise more."`,
  mq: ['Best way to improve communication', ['Practise more problems silently', 'Record mocks, review transcripts, and fix one habit at a time', 'Memorise answers', 'Avoid mocks'], 1, 'Targeted feedback loops work best.'],
  h: ['<p>Hint 1: Use evidence (timestamps, phrases).</p>', '<p>Hint 2: Choose one habit per mock.</p>', '<p>Hint 3: Set a measurable target.</p>'],
  ap: `<p>Model answer: "Went well: I asked four clarifying questions, which changed my design, and I stated the brute force and its cost before optimising. To fix: I was silent for 2 minutes 40 seconds around minute 12, and I skipped the dry run, so a bug in the loop bound was found by my peer. Next mock: I'll set a timer for every 90 seconds of silence, finish the code by minute 30 so there are at least 7 minutes for a dry run, and use the stuck ladder aloud. I'll record the round, transcribe it, and count my filler words; the target is under 5 per 10 minutes. After three mocks I'll compare the scores for the communication row." This is specific, evidence-based, and measurable; it shows how you coach yourself, a valuable engineering skill.</p>`,
  fu: ['What would you measure after 5 mocks?', 'How do you pick the habit to fix first?'] }));

// ---------------- QUIZ ----------------
var Q = function (q, o, a, e) { quiz.push({ q: q, options: o, answer: a, explain: e }); };
Q('What do the letters in I-C-E-O stand for?', ['Inputs, Constraints, Edge cases, Output', 'Ideas, Code, Execution, Optimisation', 'Intro, Clarify, Explain, Offer', 'Input, Complexity, Errors, Order'], 0, 'I-C-E-O is the clarifying checklist: Inputs, Constraints, Edge cases, Output.');
Q('Best reason to state the brute-force solution first?', ['It always passes', 'It is a correct baseline and exposes the wasted work you can remove', 'Interviewers forbid skipping it', 'It is shorter to code'], 1, 'It proves understanding and gives a path to the optimised solution.');
Q('How long should you stay silently stuck before speaking?', ['10 minutes', 'About 3 minutes at most; speak your blocker earlier if possible', 'Never speak', 'Until the interviewer leaves'], 1, 'Use the stuck ladder and verbalise by about minute 3.');
Q('The interviewer gives a hint. Your first action?', ['Say it does not apply', 'Thank, restate it, and test it on an example', 'Ignore it', 'Ask for the full solution'], 1, 'Acknowledge and use the hint visibly.');
Q('When should you dry run your code?', ['Never, the interviewer does it', 'After finishing, before saying you are done', 'Only if asked', 'Before reading the problem'], 1, 'Verification before declaring done is a key signal.');
Q('At minute 20 of 45 you have not started coding. Best response?', ['Keep planning', 'Announce a simpler version, code it, and describe the optimisation verbally', 'Quit', 'Ask for more time'], 1, 'Cut scope, not testing.');
Q('In a design round, what is a checkpoint?', ['A database snapshot', 'A short question to the interviewer at a phase boundary', 'A diagram box', 'A load balancer'], 1, 'E.g. "Does this scope match what you had in mind?"');
Q('Recommended order of a design round?', ['API, deep dive, requirements, estimates', 'Requirements, estimates, API, high-level design, deep dive, wrap-up', 'Database first, then everything else', 'Deep dive, then requirements'], 1, 'Requirements first so every later choice has a reason.');
Q('The interviewer asks "Why not X?" about your design. Best answer?', ['Defend at all costs', 'Switch immediately', 'Compare using requirements and say when you would switch', 'Say it is the standard'], 2, 'Reasoned trade-offs, not ego or reflex.');
Q('In a round that says no AI is allowed, you should', ['Use a hidden assistant quietly', 'Not use any AI tool at all', 'Use AI only for hard parts', 'Ask AI via a second device'], 1, 'Hidden assistance is cheating and gets candidates rejected.');
Q('In an AI-assisted round, what scores best?', ['Silently pasting the AI output', 'Planning first, prompting small, reviewing, testing, and explaining your choices', 'Never using the tool', 'Asking the AI to explain to the interviewer'], 1, 'Judgment and ownership are measured.');
Q('You realise at minute 30 your approach is wrong. Best move?', ['Hide it', 'Say so, choose the smallest fix, keep time for tests', 'Restart silently', 'Stop coding'], 1, 'Transparent, time-aware course correction.');

// ---------------- INTERVIEW ----------------
var IV = function (q, a, level, f) { interview.push({ q: q, a: a, level: level, followUps: f }); };
IV('Walk me through how you start a coding problem.', '<p>I do not code first. I restate the problem with a tiny example, then ask a few questions that change the design: input type and size, duplicates or negatives, edge cases like empty input, and output format. I state assumptions where the interviewer is vague. Then I describe a brute force with its cost, find the wasted work, propose an improvement, and ask "shall I code this?" before typing. This order shows I can turn a fuzzy ask into a clear plan and keeps the interviewer involved from the first minute.</p>', 'B', ['Which question matters most?', 'What if the interviewer says "you decide"?']);
IV('Why do you state brute force before the optimal solution?', '<p>It proves I understand the problem and gives a correct baseline to compare against. It also lets me name the exact wasted work, which leads to the optimisation in a way the interviewer can follow. If I jumped to the optimal answer, I would look memorised and could not explain why it works. I keep the brute force to about a minute, give its time and space cost, and unless asked I do not code it.</p>', 'B', ['When do you skip it?', 'What if the brute force is already optimal?']);
IV('What do you do when you are stuck?', '<p>I do not go silent. I follow a ladder: restate the problem, solve a tiny example by hand and watch what I do, try known patterns (hash map, two pointers, sort, heap, graph, DP), and by about three or four minutes I tell the interviewer what I tried and where I am blocked and ask for a nudge. If still stuck, I present the brute force with its cost so I deliver something correct. Being stuck is normal; being stuck silently hides my reasoning.</p>', 'B', ['What would you say exactly at minute 3?', 'How do you keep calm?']);
IV('How do you take a hint from the interviewer?', '<p>I thank them, restate the hint in my own words, think aloud for ten to twenty seconds about what it implies, then test it on my example and state the updated plan. I never dismiss a hint without testing it. If it does not make sense, I ask a specific follow-up question. If I believe my approach is better, I say why politely and invite their view. Interviewers score how quickly I convert a hint into progress, so I make that visible.</p>', 'I', ['What if you disagree with the hint?', 'What if you had already considered it?']);
IV('How do you test your code in an interview?', '<p>After the last line I read it once for typos and off-by-ones, then dry run the sample with a small table of variables, narrating values rather than rereading the code. Next I pick three or four edge cases: empty, single element, duplicates or negatives, no answer. I run them by hand and fix any bug calmly. Finally I state the time and space complexity of what I actually wrote, line by line if a data structure choice matters. Finding my own bug is a positive signal.</p>', 'I', ['How many tests are enough?', 'How do you test at scale?']);
IV('How do you manage time in a 45-minute coding round?', '<p>I plan backwards: about 3 minutes intro and 4 for my questions at the end, leaving around 38. Roughly 4 for clarifying, 7 for approach, 15 for code, 7 for testing, and 5 for complexity and follow-ups. I have checkpoints: approach agreed by minute 14, code finished by about 29. If I am behind I cut scope, such as polish or optional optimisation, never testing. I say my plan and any change aloud so the interviewer sees I am aware of the clock.</p>', 'I', ['What if the interviewer talks a lot?', 'How would you adapt to a 60-minute round?']);
IV('How do you handle an approach you realise is wrong halfway?', '<p>I say it immediately, pointing to the failing input, rather than hoping nobody notices. Then I weigh options by time left: the smallest change that restores correctness usually wins over a redesign. I state the choice, keep a fallback (for example the brute force), and protect time for a dry run. Interviewers see the ability to detect and correct errors as a core engineering skill, and silent persistence in a wrong approach as a red flag.</p>', 'I', ['What if there are only 5 minutes left?', 'Is a rewrite ever right?']);
IV('Describe how you lead a system design interview.', '<p>I announce the structure in the first minute: requirements, estimates, API, high-level design, deep dive, wrap-up. At each boundary I ask a short checkpoint question. I narrow scope with functional and non-functional requirements, estimate QPS and storage with round numbers, then sketch the API and a labelled diagram. I choose the deep dive on the riskiest component and explain trade-offs, not just choices. I stay flexible if the interviewer redirects, and I reserve the last five minutes for bottlenecks and failures.</p>', 'I', ['What if the interviewer is silent?', 'How do you pick the deep dive?']);
IV('The interviewer challenges a design choice. How do you respond?', '<p>I treat it as a question, not an attack. I acknowledge the valid part, compare both options against the stated requirements and numbers, explain why I chose mine, and state the condition under which I would switch. I do not defend by reflex or cave instantly, because both hide reasoning. If their point reveals a real flaw I say so and adjust. This shows I make decisions with reasons and can update them with new information.</p>', 'A', ['What if they keep pushing?', 'What if you have no good reason?']);
IV('What do interviewers write in feedback about communication?', '<p>Typical positives: asked relevant clarifying questions, explained trade-offs, tested own code, handled hints well, easy to work with, drove the conversation. Typical negatives: jumped into code, long silences, defensive about feedback, could not explain complexity, needed heavy prompting to move between phases, did not verify. Many rubrics treat communication as a separate scored row from correctness, so a correct solution with weak process can still be a lean no-hire.</p>', 'I', ['How would you gather evidence of your own habits?', 'Which negative is most fixable?']);
IV('How should candidates use AI in interviews that allow it?', '<p>First confirm the rules and which tool. Plan before prompting and use the assistant for scoped pieces such as scaffolding or test ideas. Narrate prompts, read every line it returns, check edge cases, complexity, mutation, and hallucinated APIs, run it, and add a test it did not suggest. Finish by explaining what I kept, changed, or rejected and why. The signal is judgment and ownership, not speed. In rounds that forbid AI, using any assistant is cheating.</p>', 'A', ['What would make you reject AI output?', 'How would you explain code you did not write?']);
IV('You finish early. What next?', '<p>I use the time to show depth, not to stop. I restate complexity, discuss one trade-off such as memory versus time, mention a variant or scale concern like streaming data or concurrency, and propose extra tests. Then I ask which direction the interviewer would like to explore. I do not start unasked new code or fill time with filler. This signals curiosity and ownership while leaving control to the interviewer.</p>', 'B', ['What if you have no ideas?', 'Should you ask to finish early?']);
IV('How do you recover from a mistake you made earlier in the interview?', '<p>I name it plainly, fix it, and move on without long apologies. For example: "I used a list here, so membership is O(N) and my complexity claim was wrong. Switching to a set makes it O(1)." I re-verify with a test and update any complexity claim I made. Interviewers remember how composed and honest I was more than the mistake itself, because on the job mistakes are normal and recovery matters.</p>', 'A', ['What if you only notice after the interview?', 'How do you prevent repeated mistakes?']);

// ---------------- REGISTER ----------------
registerModule({
  langExplain: `<p><b>About the code here.</b> The few samples are optional Python helpers you can run in the page, such as a Two Sum and Top-K self-test and a 45-minute time planner. Nothing in the behavioural rounds depends on a programming language, so skip them if you like.</p>`,
  id: 'beh04',
  title: 'Communication in Coding & Design Rounds',
  intro: `<p>Two candidates can write identical code and get opposite results. The difference is how they <b>communicate</b>: the questions they ask, the way they think aloud, whether they state a brute force first, how they handle hints, how they test, and how they use the clock. This module turns those habits into scripts and checklists, with full mock transcripts of a coding round (Two Sum / Top-K) and a design round (URL shortener) showing good versus poor communication, plus a runnable 45-minute planner and self-tested code you can dry run aloud.</p>`,
  goals: ['Run the I-C-E-O clarifying checklist in under 90 seconds and state assumptions out loud', 'Move from brute force to optimal while thinking aloud in short, structured sentences', 'Dry run code and test edge cases before saying "done"', 'Respond to hints, being stuck, a wrong approach, and pushback calmly and visibly', 'Budget a 45-minute round with checkpoints and know what to cut when behind', 'Lead a system-design round from requirements to deep dive with checkpoints', 'Work with (or without) an AI assistant honestly, with planning, review and ownership'],
  prereqs: `Behavioral Bank modules (beh01-beh03) help for story telling. For the coding-round examples, basic DSA (hash maps, sorting) is enough; for the design example, a rough idea of web services, caches and databases.`,
  hours: 9,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
