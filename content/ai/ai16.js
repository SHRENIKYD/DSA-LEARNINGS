(function () {
var topics = [], practice = [], quiz = [], interview = [];
// ---- tiny helpers ----
function bx(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 16 }; }
function P(title, level, tags, companies, statement, example, bruteWhy, mcq, hints, approach, complexity, followUps) {
  return {
    title: title, level: level, tags: tags, companies: companies,
    statement: statement, constraints: '<p>No code is required. Answer in plain written steps, as if explaining to a teammate. Aim for something you could really do at work on Monday.</p>',
    example: example,
    brute: { why: bruteWhy },
    mcq: mcq, hints: hints,
    solution: { approach: approach, complexity: complexity, followUps: followUps }
  };
}

// =====================================================================
topics.push({
  title: 'Working With Coding Agents Day to Day: Scope, Context, CLAUDE.md, Small Diffs',
  analogy: `<p>A coding agent is like a <b>very fast new contractor</b> who starts every morning with no memory of yesterday. They type 10 times faster than you, they have read half the internet, and they will happily build the wrong thing with total confidence. What do you do with such a contractor? You hand them a <b>clear job card</b> (scope), a <b>folder of house rules</b> (CLAUDE.md), and you ask for <b>one small piece at a time</b> so you can check it before they continue.</p>`,
  explain: `<p>Most "AI is useless" stories and most "AI wrote a mess" stories come from the same cause: the <b>task was vague</b> and the <b>diff was huge</b>. Four habits fix most of it.</p>
  <p><b>1. Scope the task.</b> One task = one outcome you can test. "Improve the checkout" is a wish. "Make <code>POST /orders</code> reject an empty cart with HTTP 400 and a clear message" is a task. A good task states: the goal, the files or area to touch, what NOT to touch, and how we will know it is done.</p>
  <p><b>2. Give context.</b> The agent cannot see your head. Tell it the things a new teammate would ask: how to run the tests, which folder holds what, which library we already use (so it does not invent a second one), and an example of the style you like. Point at an existing file: "follow the pattern in <code>orders/refund.py</code>".</p>
  <p><b>3. Write project instructions once (CLAUDE.md style).</b> A short file in the repo root that the agent reads at the start of every session: build and test commands, coding rules, "never do" list, and where things live. It is the <i>onboarding doc</i>, written for a reader with no memory.</p>
  <p><b>4. Ask for small, reviewable diffs.</b> A diff you can read in 5 minutes gets really reviewed. A 2,000-line diff gets a "looks good" and a prayer. Split work: first the failing test, then the smallest change that passes, then the refactor.</p>
  ${H.table(['Habit', 'Weak version', 'Strong version'], [
    ['Scope', 'Fix the login bug', 'Login with a trailing space in the email returns 500; it should trim and succeed. Touch only <code>auth/login.py</code> and its test.'],
    ['Context', '(nothing)', 'Run tests with <code>pytest -q</code>. We use <code>httpx</code>, not <code>requests</code>. Copy the style of <code>auth/signup.py</code>.'],
    ['Size', 'Rewrite the auth module', 'Step 1: failing test only. Stop and show me.'],
    ['Check', 'Done?', 'Run the tests and paste the output. List every file you changed.']
  ])}
  <p>The loop you should live in is: <b>spec → plan → implement → test → review</b>, and you are the one holding the steering wheel at the plan and review steps.</p>`,
  clues: [
    '"The agent keeps going off in the wrong direction" → the scope is too vague; add a done-condition',
    '"It re-invented a helper we already have" → missing context; point it at the existing file',
    '"The PR is 1,500 lines and nobody reviewed it" → ask for small diffs, one concern per change',
    '"It forgets our rules every new session" → put them in a CLAUDE.md-style instruction file',
    '"It said done but nothing runs" → require it to run the tests and show the output',
    'Interview wording: "How do you use AI tools on a real team?" → they want a process, not a tool list'
  ],
  code: [
    { lang: 'text', title: 'A small, useful CLAUDE.md (project instructions)', code: `# Project: shop-api (Python 3.12, FastAPI)

## Commands
- Run tests:   pytest -q            (must pass before you say "done")
- Lint:        ruff check .
- Run server:  uvicorn app.main:app --reload

## Layout
- app/routes/     HTTP handlers only, no business logic
- app/services/   business rules (put new logic here)
- tests/          mirrors app/ one-to-one

## Rules
- Use httpx, never requests. Use the existing db helper in app/db.py.
- Every new function gets a test in the same change.
- Keep each change under ~200 changed lines. If bigger, stop and propose a split.
- Never edit migrations that are already merged.
- Never catch a bare Exception just to hide an error.

## Before you finish
1. Run the tests and paste the result.
2. List every file you touched and why.
3. Say what you did NOT verify.` },
    { lang: 'text', title: 'An agent-ready task card (copy this shape)', code: `GOAL:      POST /orders must reject an empty cart.
BEHAVIOUR: empty "items" list -> HTTP 400, body {"error": "cart is empty"}.
           non-empty cart -> unchanged behaviour.
WHERE:     app/services/orders.py and tests/services/test_orders.py only.
PATTERN:   follow how app/services/refunds.py validates input.
NOT DOING: no schema changes, no new dependencies, no refactors.
DONE WHEN: new test fails before the change, passes after; whole suite green.
OUTPUT:    show the plan first (5 bullets). Wait for my OK before editing.` }
  ],
  codeTitle: ['CLAUDE.md example', 'Task card'],
  viz: {
    title: 'Agent workflow: spec → plan → implement → test → review',
    input: '1',
    inputLabel: 'How many times do the tests fail before they pass (0-3)?',
    gen: function (input) {
      var retries = parseInt(String(input).trim(), 10);
      if (isNaN(retries) || retries < 0 || retries > 3) throw new Error('Enter a number from 0 to 3');
      var nodes = [bx('spec', 'Spec', 9, 12), bx('plan', 'Plan', 29, 12), bx('impl', 'Implement', 50, 12, 18), bx('test', 'Test', 71, 12), bx('rev', 'Review (you)', 50, 38, 22), bx('ship', 'Merge', 82, 38)];
      var edges = [['spec', 'plan'], ['plan', 'impl'], ['impl', 'test'], ['test', 'rev', 'green'], ['rev', 'ship']];
      var who = { spec: 'YOU write the done-condition.', plan: 'Agent proposes; YOU approve or edit the plan.', impl: 'Agent edits a small slice of code.', test: 'Run the tests. Facts, not opinions.', rev: 'YOU read the diff. This step cannot be skipped.', ship: 'Small diff, tests green, reviewed.' };
      var frames = [];
      function fr(cur, narr, ehl, tags) {
        var hl = {}; hl[cur] = 'cur';
        return { narr: narr, parts: [{ type: 'graph', label: 'Agent workflow', directed: true, height: 52, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }, { type: 'text', html: '<b>Who does what:</b> ' + who[cur] }] };
      }
      frames.push(fr('spec', 'Start with the <b>spec</b>: one outcome you can test. A vague spec here becomes a wrong diff later.', {}, { spec: 'you' }));
      frames.push(fr('plan', 'Ask for a <b>plan before code</b>. Five bullets are enough. Fixing a plan costs seconds; fixing 400 wrong lines costs an hour.', { 'spec-plan': 'ok' }, { plan: 'cheap fix' }));
      for (var r = 0; r <= retries; r++) {
        frames.push(fr('impl', 'Attempt ' + (r + 1) + ': the agent implements a <b>small slice</b> only.', { 'plan-impl': 'ok' }));
        if (r < retries) {
          frames.push(fr('test', '<span class="c-r">Tests fail</span> on attempt ' + (r + 1) + '. The failure message goes back to the agent. This is the loop working as designed.', { 'impl-test': 'bad' }, { test: 'red' }));
        } else {
          frames.push(fr('test', '<span class="c-g">Tests pass</span> on attempt ' + (r + 1) + '. But green tests only prove what the tests check.', { 'impl-test': 'ok' }, { test: 'green' }));
        }
      }
      frames.push(fr('rev', 'Now <b>you review</b>: hallucinated APIs? missing edge cases? swallowed errors? extra stuff nobody asked for?', { 'test-rev': 'ok' }, { rev: 'human gate' }));
      frames.push(fr('ship', 'Merge the small diff. Next task starts again at the spec.', { 'rev-ship': 'ok' }, { ship: 'done' }));
      return frames;
    }
  },
  examples: [
    { title: 'Vague ticket → agent-ready task', html: `<p>Ticket: <i>"Search is slow."</i> An agent given only this will add a cache, rewrite a query and maybe change the UI. Turn it into a task:</p>
      ${H.table(['Question to answer first', 'Answer you write down'], [['Slow where?', '<code>GET /search?q=</code> p95 is 2.4 s, target 500 ms'], ['What is allowed?', 'Add a DB index and fix the N+1 query; no new cache layer'], ['Where?', '<code>app/services/search.py</code>, one migration file'], ['Done when?', 'Benchmark script shows p95 under 500 ms; all tests green'], ['First step?', 'Agent profiles and reports the cause. No edits yet.']])}
      <p>The last row matters: ask for <b>diagnosis first</b>, then the fix. You stay in control of direction.</p>` },
    { title: 'Splitting one big job into reviewable diffs', html: `<p>Job: "add refunds". Four diffs, each reviewable in under 10 minutes:</p>
      <ol><li><b>Diff 1:</b> failing tests that describe refund rules (no production code).</li><li><b>Diff 2:</b> the pure function <code>refund_amount()</code> that makes those tests pass.</li><li><b>Diff 3:</b> the database change and repository method.</li><li><b>Diff 4:</b> the HTTP endpoint that wires it together.</li></ol>
      <p>If diff 2 is wrong, you found out before 3 and 4 were built on top of it.</p>` },
    { title: 'When context saves you: the second HTTP library', html: `<p>Without instructions, one agent used <code>requests</code> in a file, another used <code>httpx</code>, a third used <code>urllib</code>. The repo ended up with three HTTP stacks. One line in the instruction file ("use httpx, see app/http.py") ended it. <b>Rules written once beat corrections repeated forever.</b></p>`, code: { lang: 'text', code: `# Smell test for a task before you send it
1. Could a stranger tell when this is done?          (done-condition)
2. Does it name where to change and where NOT to?    (boundaries)
3. Would the diff fit on one screen of review?       (size)
4. Did I say how to run the tests?                   (feedback loop)` } }
  ],
  deepDive: `<p><b>Why agents drift.</b> An agent works inside a limited "context window". In a long session, early instructions get pushed out or diluted. That is why long chats degrade: the model is not tired, it simply no longer "sees" your first message clearly. Cures: short sessions per task, project instructions loaded fresh each time, and writing key decisions into files (a plan file, a task list) instead of trusting chat history.</p>
  <p><b>Autonomy is a dial, not a switch.</b> At one end the tool suggests the next line (you approve every keystroke). In the middle it edits files but asks before running commands. At the other end it runs for 30 minutes on its own and returns a PR. Match the dial to the <b>blast radius</b>: a throwaway script can run free; a payments change should be step-by-step. Typical safety rails: run in a branch or sandbox, no production credentials, an allow-list of commands, and a required human review before merge.</p>
  <p><b>Cost of review is the real bottleneck.</b> Writing code got cheap; reading code did not. If AI doubles the code you ship but you review at the same speed, the review queue becomes the new slow point. So optimise for <i>reviewability</i>: small diffs, tests first, a clear description of intent, and a list of "what I did not check".</p>
  <p><b>Instruction file hygiene.</b> Keep it short (a page). Long files get skimmed by humans and diluted for models. Prefer commands and concrete rules over vague values ("write clean code" is useless; "functions over 40 lines need a reason" is checkable). Review it like code: when the agent repeats a mistake, add one line. Never put secrets in it, because it is committed and read by every session.</p>
  <p><b>Parallel agents.</b> Teams now run several agents at once on separate branches. The risk is merge conflicts and duplicate work, so tasks must be <i>independent</i> (different files) and each one needs its own done-condition. The skill that scales is not typing prompts; it is <b>decomposing work into independent, testable slices</b>, which is plain old engineering.</p>`,
  aiEra: `<p><b>What AI changes:</b> the unit of work moves from "write the code" to "specify, delegate, verify". Your value shifts toward judgment: choosing the right slice, spotting a wrong plan early, and knowing when to take the keyboard back.</p>
  <p><b>Use AI as a partner:</b> ask it to <i>critique your task card</i> before it starts: <code>What is ambiguous in this task? List questions you would ask before coding.</code> Ask for the plan first: <code>Propose a 5-step plan and the files you will touch. Do not edit yet.</code> Ask it to draft the instruction file from your repo, then you prune it.</p>
  <p><b>Where AI goes wrong:</b> it fills gaps with confident guesses, it grows the scope ("while I was here I also refactored..."), it says "done" without running anything, and it follows the last instruction harder than the first. <b>What you must still own:</b> the definition of done, the plan approval, the final read of the diff, and the decision to merge. The name on the commit is yours.</p>`,
  problems: [
    P('Turn a Vague Ticket into an Agent-Ready Task', 'Easy', ['scoping', 'prompting', 'agents'], ['Anthropic', 'GitHub', 'Atlassian'],
      `<p>A product manager files this ticket: <b>"Users complain the export is broken, please fix it."</b> You plan to hand it to a coding agent. Rewrite it into a task card the agent can safely act on. Write the questions you would ask first, the final card (goal, behaviour, where, not-doing, done-when), and the first instruction you give the agent.</p>`,
      `<p>Weak: "Fix the export." Strong: ${H.c('g', 'Goal: CSV export of orders must escape commas and quotes. Where: app/export/csv.py + its test. Done when: a test with the name <i>Smith, "Bob"</i> round-trips through Python csv.reader. Step 1: write only that failing test.')}</p>`,
      `<p>Sending the ticket as-is makes the agent guess: it might rewrite the exporter, change the file format, or "fix" something users did not complain about. The wasted work is the whole diff, plus the time to read it.</p>`,
      { q: 'What is the best FIRST instruction to give the agent for a vague ticket?', options: ['"Fix it and open a PR."', '"Reproduce the bug, tell me the cause, and make no edits yet."', '"Rewrite the module cleanly."', '"Fix it, use your best judgment on scope."'], answer: 1, explain: 'Diagnosis first keeps you in control: you confirm the cause before any code changes.' },
      ['<p>Hint 1: a ticket is a symptom. The task needs a <b>testable behaviour</b>.</p>', '<p>Hint 2: ask the reporter or the logs: which export, what input, what did they expect, what happened?</p>', '<p>Hint 3: recipe: 1) reproduce, 2) write the failing test, 3) state boundaries, 4) done-condition, 5) ask for a plan before edits.</p>'],
      `<p>Step 1: do not forward the ticket. Spend five minutes finding facts: which export (CSV, PDF?), which users, example input, expected vs actual, and when it started (a recent release narrows the cause). Step 2: write one sentence of behaviour that a test can check, for example "a name containing a comma must stay in one CSV cell". Step 3: write the card: goal, behaviour, where to change (one file plus its test), not-doing (no format change, no new dependency), and done-when (new test fails before, passes after, whole suite green). Step 4: first instruction to the agent: "Reproduce with this input, write only the failing test, show me the output, stop." Step 5: review that test yourself before allowing the fix. The principle: <b>the human supplies intent and boundaries; the agent supplies typing speed.</b></p>`,
      `<p>Your effort is minutes; it removes the risk of a large wrong diff.</p>`, ['What if the reporter cannot give an example?', 'How would you ask the agent to find the example from logs safely?']),
    P('Write a CLAUDE.md for a Small Repo', 'Easy', ['project instructions', 'context'], ['Shopify', 'Stripe'],
      `<p>You have a repo with a Node API in <code>src/</code>, tests in <code>test/</code> run with <code>npm test</code>, and a team rule that migrations are never edited after merge. Write the project instruction file (about 15 lines). Explain why each line earns its place.</p>`,
      `<p>Good lines are ${H.c('g', 'checkable and specific')} ("Run <code>npm test</code> before saying done"). Bad lines are ${H.c('r', 'vibes')} ("write high quality code").</p>`,
      `<p>With no file, every session re-learns the repo and every mistake is corrected again by hand. The waste is repeated explaining.</p>`,
      { q: 'Which line belongs in an instruction file?', options: ['Write beautiful code', 'Be smart about edge cases', 'Run npm test and paste the result before you say done', 'The database password is hunter2'], answer: 2, explain: 'Concrete, checkable commands help. Vague values do nothing and secrets must never be committed.' },
      ['<p>Hint 1: think of what you tell a new hire on day one.</p>', '<p>Hint 2: sections: commands, layout, rules, definition of done.</p>', '<p>Hint 3: keep it under a page; add a line only when the agent repeats a mistake.</p>'],
      `<p>Sections: (1) Commands: how to run tests, lint and start the server, copy-pasteable. (2) Layout: one line per folder, so the agent knows where new code goes (<code>src/routes</code> for handlers, <code>src/services</code> for rules). (3) Rules: use the existing HTTP client, no new dependencies without asking, never edit merged migrations, no catch-all that hides errors, every new function gets a test. (4) Done-checklist: run the tests and paste output, list touched files, say what was not verified. Each line earns its place because it either prevents a past mistake or answers a question the agent would otherwise guess. Leave out secrets, long prose and style opinions already enforced by the linter, since a tool enforces those better than a sentence does. Review the file like code and trim it twice a year.</p>`,
      `<p>One page; read at every session start.</p>`, ['How do you stop the file growing into a wall of text?', 'Where do personal preferences go versus team rules?']),
    P('Plan a Feature as Reviewable Diffs', 'Medium', ['small diffs', 'decomposition'], ['Google', 'Meta'],
      `<p>You must add "coupon codes" to checkout: validate a code, apply a percent discount, store it on the order. An agent could do it in one 1,200-line change. Break it into 4 to 6 diffs. For each diff give: what changes, how a reviewer checks it in under 10 minutes, and what stops the next diff from building on a mistake.</p>`,
      `<p>Order: ${H.c('b', 'tests → pure logic → storage → endpoint → UI')}. Each diff compiles and passes alone.</p>`,
      `<p>One giant diff hides a wrong rounding rule inside UI code. The reviewer approves by fatigue, and the bug ships.</p>`,
      { q: 'Why put the pure discount function in its own early diff?', options: ['It is the shortest', 'It has no I/O, so it is easy to test and review, and later diffs depend on it', 'Agents prefer pure functions', 'It avoids needing tests'], answer: 1, explain: 'Pure logic is cheapest to verify, so errors surface before they are wired into storage and UI.' },
      ['<p>Hint 1: separate <b>rules</b> (math) from <b>plumbing</b> (database, HTTP).</p>', '<p>Hint 2: each diff must pass the full test suite on its own.</p>', '<p>Hint 3: write the stop-and-check question after each diff.</p>'],
      `<p>Diff 1, tests only: table-driven tests for the rules (10% off 200 gives 180, expired code rejected, code used up rejected, stacking not allowed, rounding to cents). Reviewer checks that the tests match the written rules; no production code. Diff 2: pure function <code>apply_coupon(price, coupon, now)</code> that passes those tests; reviewer reads about 40 lines and checks money rounding. Diff 3: storage, a migration plus repository methods for coupons and usage counts; reviewer checks the migration is reversible and indexes the code column. Diff 4: endpoint <code>POST /cart/coupon</code> with input validation and error codes; reviewer checks status codes and that errors are not swallowed. Diff 5: UI field and messages. Between diffs, run the whole suite and read the previous one again for surprises. If any diff reveals a wrong assumption, you fix one small thing, not an entire stack.</p>`,
      `<p>Review time stays linear in diff size, so risk stays low.</p>`, ['What if diff 3 forces a change to diff 2?', 'Where would a feature flag help?']),
    P('Agent Keeps Ignoring Your Rules', 'Medium', ['context window', 'debugging agents'], ['Anthropic', 'Cursor'],
      `<p>In long sessions, your agent starts using <code>requests</code> again even though the instruction file says to use <code>httpx</code>. List at least four possible causes and the fix for each.</p>`,
      `<p>Cause: ${H.c('y', 'the rule is 300 lines up the chat')}. Fix: ${H.c('g', 'restart with a fresh session and a short task')}.</p>`,
      `<p>Repeating the rule in capital letters every few messages burns tokens and still fails once the context is full.</p>`,
      { q: 'Best structural fix for rules that fade in long sessions?', options: ['Type the rule louder', 'Short sessions per task plus a concise instruction file loaded fresh, plus a lint check that enforces it', 'Use a bigger model only', 'Stop using instruction files'], answer: 1, explain: 'Reload context fresh and enforce with tools; do not rely on memory of a long chat.' },
      ['<p>Hint 1: models only see a limited window of text.</p>', '<p>Hint 2: what could enforce the rule without the model?</p>', '<p>Hint 3: list causes by layer: file, session, task, tooling.</p>'],
      `<p>Causes and fixes. 1) Context dilution: the session is long and early rules lost weight; fix with one task per session and re-load the instruction file. 2) The file is too long or vague, so the rule is buried; fix by trimming and moving the rule to the top with a concrete example. 3) The task itself pulls the other way, for example the sample code in the repo uses <code>requests</code>; fix by migrating the old code or pointing the task at a good example. 4) Nothing checks it; fix with a linter rule or a test that fails on <code>import requests</code>, so the agent sees red output and corrects itself. 5) The agent was never told how to find the helper; fix by naming the file (<code>app/http.py</code>). The big lesson: <b>a rule enforced by a tool beats a rule written in prose</b>.</p>`,
      `<p>Cheap changes; large gain in consistency.</p>`, ['How do you test your instruction file?', 'When is a hook better than a prose rule?'])
  ]
});

// =====================================================================
topics.push({
  title: 'Spec-Driven Development: Spec and Acceptance Tests First, Then Let AI Implement',
  analogy: `<p>Before a builder pours concrete, there is a <b>blueprint</b> and an <b>inspection checklist</b> ("door is 90 cm wide, floor is level"). The builder may be fast or slow, human or robot; the inspector does not care. The blueprint plus checklist is the <b>spec and acceptance tests</b>. Hand the robot a blueprint and an inspector, and you can trust the house. Hand it a vibe, and you get a house.</p>`,
  explain: `<p><b>Spec-driven development</b> means: write down what the code must do, turn those words into tests, <i>then</i> ask the AI to implement. The order matters because a test written after the code tends to just describe what the code already does, bugs included.</p>
  <p>A good spec is small and made of <b>examples</b>. Examples are the clearest language there is. For a rate limiter "allow 2 calls per 10 seconds per user":</p>
  ${H.table(['Case', 'limit/window', 'Calls (user, time)', 'Expected'], [
    ['basic', '2 / 10 s', 'a@0, a@1, a@2', '<span class="c-g">T</span>, <span class="c-g">T</span>, <span class="c-r">F</span>'],
    ['window slides', '2 / 10 s', 'a@0, a@5, a@10, a@11', 'T, T, T, F'],
    ['users independent', '1 / 10 s', 'a@0, a@1, b@1', 'T, F, T'],
    ['rejected calls do not use quota', '1 / 10 s', 'a@0, a@5, a@10', 'T, F, T'],
    ['bad config', '0 / 10 s', 'construct', '<span class="c-r">raises ValueError</span>']
  ])}
  <p>Look at what the table forced you to decide <i>before</i> any code: does a call exactly 10 seconds after the first count as expired (yes: the window is half-open)? Does a rejected call consume quota (no)? These are the gaps where AI would otherwise guess. <b>Every row you write is one fewer guess.</b></p>
  <p>The workflow in five steps:</p>
  <ol><li><b>Write the spec</b> in plain words: inputs, outputs, rules, errors, limits.</li><li><b>Write examples</b> (a table), including edges: empty, one, huge, duplicates, bad input, boundaries.</li><li><b>Turn examples into tests</b> (by hand, or generate them from the table, as in the code below).</li><li><b>Watch them fail</b> (red). If a test passes before any code exists, the test is wrong.</li><li><b>Let AI implement</b> until all green, then review the code for what tests cannot see: security, clarity, performance.</li></ol>
  <p>Tests tell you the code does what you <i>asked</i>. Only a careful spec makes sure you asked for the right thing.</p>`,
  clues: [
    '"Write the tests first, then have the AI implement" → this exact topic',
    '"Acceptance criteria" / "definition of done" in a ticket → turn each into one test',
    '"Given / When / Then" or example tables → spec by example',
    '"The AI passed its own tests but the feature is wrong" → tests were written after (or by) the same guess',
    '"Boundary: exactly at the limit, exactly at the window edge" → the off-by-one zone, test it',
    '"Design a rate limiter" in an interview → clarify rules (window type, per-key, rejected counts?) = writing the spec out loud'
  ],
  code: [
    { lang: 'python', run: true, title: 'Spec table → generated tests → red against a stub, green against a real limiter', code: `# SPEC FIRST: the table below is the contract. Tests are generated from it.
# Rule: at most 'limit' allowed calls per 'window' seconds, per key (sliding window).
from collections import deque

class RateLimiter:
    """The 'AI implementation' we will check against the spec."""
    def __init__(self, limit, window):
        if limit < 1 or window <= 0:
            raise ValueError("limit must be >= 1 and window > 0")
        self.limit, self.window = limit, window
        self.hits = {}                      # key -> deque of allowed call times

    def allow(self, key, now):
        q = self.hits.setdefault(key, deque())
        while q and q[0] <= now - self.window:   # a hit expires AT now-window (half-open window)
            q.popleft()
        if len(q) < self.limit:
            q.append(now)                   # only ALLOWED calls consume quota
            return True
        return False

class NaiveLimiter:
    """What you get before any real code exists: always says yes."""
    def __init__(self, limit, window): pass
    def allow(self, key, now): return True

# (name, limit, window, [(key, time, expected_allowed), ...])
SPEC = [
    ("allows up to the limit", 2, 10, [("a", 0, True), ("a", 1, True), ("a", 2, False)]),
    ("window slides at the exact edge", 2, 10, [("a", 0, True), ("a", 5, True), ("a", 10, True), ("a", 11, False)]),
    ("keys are independent", 1, 10, [("a", 0, True), ("a", 1, False), ("b", 1, True)]),
    ("rejected calls use no quota", 1, 10, [("a", 0, True), ("a", 5, False), ("a", 10, True)]),
    ("burst at the same instant", 3, 10, [("a", 0, True)] * 3 + [("a", 0, False)]),
]
BAD_CONFIG = [(0, 10), (1, 0), (-5, 10)]       # must raise ValueError

def make_test(limit, window, calls):
    """Turn one spec row into a test function."""
    def test(cls):
        rl = cls(limit, window)
        for step, (key, t, expected) in enumerate(calls):
            got = rl.allow(key, t)
            assert got == expected, "call #%d (%s@%s): expected %s, got %s" % (step, key, t, expected, got)
    return test

def make_config_test(limit, window):
    def test(cls):
        try:
            cls(limit, window)
        except ValueError:
            return
        raise AssertionError("limit=%s window=%s should raise ValueError" % (limit, window))
    return test

TESTS = [(n, make_test(l, w, c)) for n, l, w, c in SPEC]
TESTS += [("bad config %s/%s" % cfg, make_config_test(*cfg)) for cfg in BAD_CONFIG]

def run(cls):
    passed = 0
    for name, test in TESTS:
        try:
            test(cls)
            print("  PASS  " + name)
            passed += 1
        except AssertionError as e:
            print("  FAIL  " + name + "  -> " + str(e))
    print("  => %d/%d green" % (passed, len(TESTS)))

print("RED: stub implementation")
run(NaiveLimiter)
print("GREEN: real implementation")
run(RateLimiter)` },
    { lang: 'text', title: 'Prompt that hands the spec to the agent', code: `Implement RateLimiter in app/limiter.py so that every test in
tests/test_limiter.py passes. Do NOT edit the tests.
Rules are in the spec table at the top of that file (sliding window,
half-open: a hit expires exactly at now - window; rejected calls do
not consume quota). No new dependencies.
Run: pytest -q tests/test_limiter.py and paste the output.
If a test seems wrong, STOP and tell me instead of changing it.` }
  ],
  codeTitle: ['Spec-to-test generator (runnable)', 'Handing the spec to the agent'],
  viz: {
    title: 'Tests going from red to green as the implementation improves',
    input: 'allows up to limit, window slides, keys independent, rejected use no quota, bad config',
    inputLabel: 'Test names (comma separated, up to 8)',
    gen: function (input) {
      var names = String(input).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      if (names.length < 2 || names.length > 8) throw new Error('Give 2 to 8 test names separated by commas');
      var n = names.length, frames = [];
      function tbl(passCount, narr, label) {
        var rows = [], hl = {};
        for (var i = 0; i < n; i++) {
          var ok = i < passCount;
          rows.push([i + 1, names[i], ok ? 'PASS' : 'FAIL']);
          hl[i] = ok ? 'ok' : 'bad';
        }
        return { narr: narr, parts: [{ type: 'table', label: label, columns: ['#', 'test (from spec row)', 'result'], rows: rows, hl: hl }, { type: 'vars', vals: { green: passCount, red: n - passCount, total: n } }] };
      }
      frames.push(tbl(0, 'Spec written, tests generated, <b>no implementation yet</b>. Everything is red. This proves each test can fail, so a later green means something.', 'Run 0: empty'));
      var steps = [Math.ceil(n * 0.4), Math.ceil(n * 0.7), n - 1];
      var seen = {};
      for (var s = 0; s < steps.length; s++) {
        var c = Math.max(1, Math.min(n - 1, steps[s]));
        if (seen[c]) continue; seen[c] = 1;
        frames.push(tbl(c, 'AI attempt ' + (s + 1) + ': <b>' + c + ' of ' + n + '</b> green. The red rows tell the AI (and you) exactly what is still wrong. Test <b>"' + H.esc(names[c]) + '"</b> fails next.', 'Run ' + (s + 1)));
      }
      frames.push(tbl(n, 'All green. Now the human part: review for what tests cannot see (security, clarity, speed). <b>Green means "matches the spec", not "is good".</b>', 'Final run'));
      return frames;
    }
  },
  examples: [
    { title: 'Same wording, two different programs', html: `<p>"Allow 2 requests per 10 seconds." Two valid readings:</p>
      ${H.table(['Reading', 'Calls at t=0, 9, 10', 'Result'], [['Fixed window (reset at 0, 10, 20 ...)', 'T, T, T', 'the call at 10 starts a new window'], ['Sliding window', 'T, T, T or F depending on edge rule', 'at 10 the call at 0 has just expired']])}
      <p>If you do not choose, the AI will, silently. A one-line spec ("sliding, half-open") removes that coin flip.</p>` },
    { title: 'Tests the AI wrote itself can be too kind', html: `<p>Ask an AI to "implement and test" and it will often write tests that mirror its own code. If the code has an off-by-one, the test has the same one, and both agree happily. Safer split: <b>you write (or approve) the tests; the AI writes the code</b>. Later you can ask the AI to propose <i>extra</i> tests, but you review them like code.</p>` },
    { title: 'Acceptance criteria to tests, one to one', html: `<p>Ticket says: "Users can reset a password. Link expires in 1 hour. Link works once. Unknown email gives the same message as known."</p>
      ${H.table(['Criterion', 'Test name'], [['expires in 1 hour', '<code>test_link_rejected_after_60_min</code> and <code>test_link_ok_at_59_min</code>'], ['works once', '<code>test_second_use_rejected</code>'], ['same message for unknown email', '<code>test_unknown_email_response_identical</code>']])}
      <p>The last one is a <b>security</b> rule (no account enumeration). Writing it as a test means the AI cannot "forget" it.</p>` }
  ],
  deepDive: `<p><b>Layers of spec.</b> (1) Behaviour examples (tables), the cheapest and clearest. (2) Property rules ("output is always sorted", "never more than <i>limit</i> allowed in any window"), checked by random testing (see the fuzzer in the next topic). (3) Contracts and types (signatures, error types). (4) Non-functional limits ("p95 under 50 ms", "no extra memory beyond O(keys)"). The AI is strongest when layers 1 and 3 are exact; layers 2 and 4 are where humans add value.</p>
  <p><b>Red first is not a ritual.</b> A test that has never failed has never been shown to <i>be able</i> to fail. Classic trap: a test that asserts inside a loop over an empty list passes forever. Watching red, then green, proves the test has teeth. A quick extra check is <b>mutation thinking</b>: change one operator in the solution (<code>&lt;=</code> to <code>&lt;</code>); at least one test must fail. If none does, you have a hole in the spec.</p>
  <p><b>Do not let the AI edit the tests to get green.</b> Agents under pressure sometimes weaken an assertion or delete a failing test. Guard: put the line "do not edit tests; if a test looks wrong, stop and ask" in the task, mark test files read-only for the session, and review any diff that touches tests more strictly than production code.</p>
  <p><b>Specs rot.</b> Keep the spec table <i>in the repo next to the tests</i>, not in a chat. When behaviour changes, change the table first. A spec that lives only in a chat window is gone by Friday.</p>
  <p><b>Cost/benefit.</b> For a throwaway script, a spec is overkill. For anything with money, security, concurrency or other people's data, it is the cheapest insurance you can buy. A useful rule: <i>the more costly a silent bug, the more of the spec you write yourself.</i></p>`,
  aiEra: `<p><b>What AI changes:</b> typing code is cheap, so the scarce skill becomes <b>saying exactly what you want</b>. Spec-driven development is how engineers keep control when the typing is automated. Teams now commit "spec files" and let agents work against them.</p>
  <p><b>Use AI as a partner:</b> to <i>find holes in your spec</i>: <code>Here is my spec table for a rate limiter. List 10 edge cases I did not cover, as new rows with expected results.</code> Then <b>you decide</b> each expected result; do not accept the AI's guesses blindly. Also ask it to turn a table into test code, or to generate a second, independent implementation to compare (differential testing).</p>
  <p><b>Where AI goes wrong:</b> inventing rules that sound sensible ("let's round up"), writing tests that restate the code, weakening failing tests, and quietly widening the spec. <b>What you must still own:</b> the meaning of the rules (product knowledge), the choice of edge cases that matter in <i>your</i> business, and reading the final code for things no example table shows.</p>`,
  problems: [
    P('Write a Spec and Tests for a Rate Limiter Before Prompting', 'Medium', ['spec-driven', 'rate limiter', 'testing'], ['Stripe', 'Cloudflare', 'Amazon'],
      `<p>You will ask an agent to build an in-memory rate limiter: "N requests per W seconds per user". Before prompting, write (a) the spec in plain words with every decision made, (b) a table of at least 8 example cases including edges, and (c) the instruction you send. Show how you would know the tests are able to fail.</p>`,
      `<p>Decisions to make: ${H.c('b', 'window type (sliding or fixed), edge rule (half-open), rejected calls count?, per-key or global?, clock source, bad config')}.</p>`,
      `<p>Prompt "write a rate limiter" and accept whatever comes back. You discover the window type, the edge rule and the clock choice only in production when a real user is blocked wrongly.</p>`,
      { q: 'A call at exactly t = window after the first hit. What must the spec say?', options: ['Nothing; the AI will pick well', 'Whether that hit has expired (half-open or closed window), with a test', 'That it must be rejected always', 'That time is not important'], answer: 1, explain: 'Boundary behaviour is where bugs and ambiguity live. State it and test it.' },
      ['<p>Hint 1: list the questions the AI would otherwise guess.</p>', '<p>Hint 2: examples beat paragraphs: one row per rule, plus edge rows.</p>', '<p>Hint 3: pass a clock in (<code>now</code> argument), otherwise tests need real sleeping.</p>'],
      `<p>Spec: sliding window; limit N per W seconds per key; a hit made at time t expires at t + W (half-open, so a call at exactly t + W sees it gone); only allowed calls consume quota; keys are independent; time comes from a <code>now</code> argument so tests are instant and deterministic; invalid config (N &lt; 1 or W &lt;= 0) raises ValueError. Table rows (limit/window: calls): basic 2/10: a@0 T, a@1 T, a@2 F; slide at edge 2/10: a@0 T, a@5 T, a@10 T, a@11 F; independent keys 1/10: a@0 T, a@1 F, b@1 T; rejected not counted 1/10: a@0 T, a@5 F, a@10 T; burst same instant 3/10: four calls at t=0 give T,T,T,F; time goes backwards (decide: ignore or raise); many keys (memory grows: say if cleanup is required); bad config rows. Prompt: "Implement against these tests; do not edit tests; stop if a test seems wrong; run pytest and paste output." To prove tests can fail: run them against a stub that always returns True (must be red), then mutate the real code (change <code>&lt;=</code> to <code>&lt;</code> in the expiry check) and confirm at least one test fails.</p>`,
      `<p>Spec work takes about 20 minutes and removes most rework.</p>`, ['How would you add a distributed version?', 'What does the spec say about clock skew between servers?']),
    P('Convert Acceptance Criteria into Tests', 'Easy', ['acceptance tests', 'BDD'], ['Atlassian', 'ThoughtWorks'],
      `<p>Criteria: "A coupon gives 10% off. It cannot be used after its expiry date. One coupon per order. Totals are rounded to cents." Write one test name and one concrete example (inputs and expected output) per criterion.</p>`,
      `<p>Example: price 19.99, 10% off gives ${H.c('g', '17.99')} (17.991 rounded to cents).</p>`,
      `<p>Leaving the criteria as sentences means each person (and each AI) reads them differently; nothing can fail.</p>`,
      { q: 'What makes an acceptance test good?', options: ['It is long', 'It has concrete inputs and an exact expected output', 'It only runs in production', 'It mocks everything'], answer: 1, explain: 'Concrete numbers leave no room for interpretation.' },
      ['<p>Hint 1: one criterion, at least one concrete example.</p>', '<p>Hint 2: add the edge: the day of expiry itself.</p>', '<p>Hint 3: rounding examples need a case that really rounds.</p>'],
      `<p>Tests: (1) <code>test_ten_percent_off</code>: 200.00 gives 180.00. (2) <code>test_rounds_to_cents</code>: 19.99 with 10% gives 17.99 (17.991 rounds down) and 0.05 with 10% gives 0.05 (0.045 rounds to 0.05 under half-up; state which rounding rule you want, because Python's default <code>round</code> uses banker's rounding). (3) <code>test_expired_coupon_rejected</code>: coupon valid until 2026-01-31, order on 2026-02-01 raises CouponExpired. (4) <code>test_valid_on_expiry_day</code>: order on 2026-01-31 still works, because the criterion is silent and you must decide. (5) <code>test_two_coupons_rejected</code>: applying a second coupon raises. Each test names the rule and carries numbers, so an AI implementation either satisfies it or visibly fails. Record the two decisions you made (rounding rule, expiry day inclusive) in the spec, since the original criteria did not say.</p>`,
      `<p>Five small tests, minutes to write.</p>`, ['How would you handle money types safely?', 'Who decides the missing rules?']),
    P('Differential Test an AI Implementation', 'Hard', ['differential testing', 'oracle', 'fuzzing'], ['Jane Street', 'Google'],
      `<p>An agent wrote a fast <code>top_k_frequent(nums, k)</code>. You cannot trust it yet. Design a way to check it using a slow-but-obviously-correct version as an oracle. Cover: what inputs to generate, how to compare (ties!), how to shrink a failing case, and when you would stop testing.</p>`,
      `<p>Oracle: ${H.c('b', 'count with a dict, sort fully, slice k')}. Compare as sets of (value) when ties exist.</p>`,
      `<p>Hand-picked examples only test what you thought of. The bugs hide in the inputs you did not think of.</p>`,
      { q: 'What is a good oracle?', options: ['The same code copied', 'A simple, slow, obviously correct implementation of the same spec', 'The AI asked again with the same prompt', 'A random number'], answer: 1, explain: 'Simplicity is the point: it is easy to trust, even if it is slow.' },
      ['<p>Hint 1: simple and slow beats clever and fast for the oracle.</p>', '<p>Hint 2: random small inputs, many of them, with a fixed seed so failures replay.</p>', '<p>Hint 3: ties make "the" answer non-unique; decide the tie rule in the spec first.</p>'],
      `<p>Plan. Spec first: ties are broken by smaller value first (so the answer is unique); k is between 1 and the number of distinct values; otherwise raise ValueError. Oracle: build counts with a dict, sort items by (-count, value), take k values. Generator: seeded random lists of length 0 to 12 with values in a tiny range (-3..3) so duplicates and ties are common, plus a few structured cases (all equal, all distinct, k equals distinct count, k = 1). For each case run both and compare exact lists. On mismatch, shrink: repeatedly try removing one element, or lowering a value, keeping the change only if the mismatch remains; print the smallest failing input and both outputs. Run a few thousand cases (seconds). Stop when thousands pass AND the fuzzer is proven able to catch bugs by planting a deliberate bug (for instance sorting ascending by count) and seeing it caught. Remaining risk: performance and very large inputs, which need a separate benchmark since the oracle is too slow for them.</p>`,
      `<p>Oracle O(n log n); the fast version should be O(n log k) or O(n).</p>`, ['How do you fuzz code with side effects?', 'What if the oracle itself has a bug?'])
  ]
});

// =====================================================================
topics.push({
  title: 'Reviewing and Testing AI-Written Code: The Common Failure Patterns',
  analogy: `<p>Think of an AI-written diff like a <b>confident intern's first pull request</b>. The code is tidy, the comments are cheerful, and the variable names are lovely. That polish is exactly the danger: it makes you relax. A good reviewer is like a <b>customs officer</b>: friendly, but opens the bag every time, and knows the usual places things get hidden.</p>`,
  explain: `<p>AI code fails in <b>predictable ways</b>. Learn the list, and review becomes a checklist instead of a vibe. The big seven:</p>
  ${H.table(['Pattern', 'What it looks like', 'How to catch it'], [
    ['1. Hallucinated API', 'Calls a method or flag that does not exist (<code>list.push</code>, <code>dict.get_or_add</code>, a library option from another version)', 'Run it. Check the docs for any call you do not personally know.'],
    ['2. Off-by-one', '<code>range(len(a)-1)</code>, <code>&lt;</code> vs <code>&lt;=</code>, slice ends, window edges', 'Test boundaries: size 0, 1, 2; exactly at the limit.'],
    ['3. Missing edge cases', 'Empty input, None, duplicates, negatives, huge values, unicode, unsorted', 'Write the nasty inputs yourself before reading the code.'],
    ['4. Silent error swallowing', '<code>except Exception: return []</code>, <code>pass</code>, default values that hide failure', 'Search for bare except, empty catch, "return None".'],
    ['5. Security holes', 'String-built SQL, shell commands from user input, secrets in code, missing auth check, unsafe deserialisation', 'Ask: where does untrusted data enter, and what can it reach?'],
    ['6. Over-engineering', 'Extra classes, config options, retry layers, abstractions nobody asked for', 'Ask: could this be 10 lines? Delete what is not required.'],
    ['7. Plausible but wrong logic', 'Reads right, subtly wrong (mutates the input, wrong rounding, race condition)', 'Property tests, an oracle, or tracing one example by hand.']
  ])}
  <p><b>Review order that works:</b> (1) read the <i>task</i> first, not the code; (2) skim what files changed: anything unexpected? (3) read the <b>tests</b>: do they truly check the rules? (4) run everything; (5) hunt the seven patterns; (6) ask "what did the AI <i>not</i> do?" (the missing error path, the missing test).</p>
  <p><b>Test the code in three layers:</b> examples (known inputs and outputs), edge cases (the nasty list above), and <b>properties</b> checked against a simple oracle on thousands of random inputs. The runnable snippets below show all three: a buggy AI function caught by a suite, a diff-review scorer, and a fuzzer.</p>`,
  clues: [
    '"Review this AI-generated PR" / "find the bugs in this code" → run the seven-pattern checklist',
    '"Works on the happy path" → missing edge cases; go hunt empty, one, duplicates, boundaries',
    '"It never crashes" can be bad news → silent swallowing of errors',
    '"User-supplied" / "from the request" near a query or shell command → injection check',
    '"The library has no such function" → hallucinated API; verify against docs',
    '"Two implementations should agree" → differential testing with an oracle',
    '"10 lines of work became 200" → over-engineering; ask what can be deleted'
  ],
  code: [
    { lang: 'python', run: true, title: 'An AI-written function with 4 planted bugs, and a suite that catches them', code: `import copy

def merge_intervals_ai(intervals):
    """'AI-written': merge overlapping or touching intervals, e.g. [[1,2],[2,3]] -> [[1,3]]."""
    result = []
    try:
        for iv in intervals:                       # BUG 1: never sorted
            if result and iv[0] < result[-1][1]:   # BUG 2: '<' misses touching intervals (needs '<=')
                result[-1][1] = max(result[-1][1], iv[1])   # BUG 3: result[-1] IS the caller's list -> input mutated
            else:
                result.append(iv)
    except Exception:                              # BUG 4: silently swallows bad input
        return []
    return result

def merge_intervals_fixed(intervals):
    """Reviewed version: validate, copy, sort, merge."""
    cleaned = []
    for iv in intervals:
        if len(iv) != 2 or iv[0] > iv[1]:
            raise ValueError("bad interval: %r" % (iv,))
        cleaned.append([iv[0], iv[1]])             # copy so we never touch the caller's data
    cleaned.sort()
    out = []
    for s, e in cleaned:
        if out and s <= out[-1][1]:                # touching counts as overlapping
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out

# ---------- the test suite (written from the spec, not from the code) ----------
def t_basic(fn):
    assert fn([[1, 3], [2, 6], [8, 10]]) == [[1, 6], [8, 10]]
def t_empty_and_single(fn):
    assert fn([]) == [] and fn([[4, 5]]) == [[4, 5]]
def t_unsorted(fn):
    assert fn([[5, 6], [1, 3], [2, 4]]) == [[1, 4], [5, 6]], "unsorted input"
def t_touching(fn):
    assert fn([[1, 2], [2, 3]]) == [[1, 3]], "touching intervals must merge"
def t_nested(fn):
    assert fn([[1, 10], [2, 3]]) == [[1, 10]]
def t_no_mutation(fn):
    data = [[1, 5], [2, 6]]
    snapshot = copy.deepcopy(data)
    fn(data)
    assert data == snapshot, "caller's input was mutated: %r" % (data,)
def t_bad_input_raises(fn):
    try:
        fn([[1, 5], [2]])
    except ValueError:
        return
    raise AssertionError("malformed interval should raise ValueError, not be hidden")

SUITE = [t_basic, t_empty_and_single, t_unsorted, t_touching, t_nested, t_no_mutation, t_bad_input_raises]

def run(fn):
    print(fn.__name__)
    green = 0
    for t in SUITE:
        try:
            t(fn)
            print("   PASS", t.__name__)
            green += 1
        except Exception as e:
            print("   FAIL", t.__name__, "-", e)
    print("   %d/%d green" % (green, len(SUITE)))

run(merge_intervals_ai)
run(merge_intervals_fixed)` },
    { lang: 'python', run: true, title: 'Diff-review checklist scorer', code: `# Score a human review of an AI diff against issues we PLANTED.
# Weights = how much it hurts if you miss it (security > style).
WEIGHTS = {"security": 5, "correctness": 5, "edge case": 4, "error handling": 4,
           "api reality": 4, "tests": 3, "over-engineering": 2, "readability": 1}

PLANTED = [   # the 5+ issues hidden in the pretend diff
    {"id": 1, "cat": "security", "what": "SQL string built with f-string from request param"},
    {"id": 2, "cat": "api reality", "what": "calls requests.get(..., retries=3): no such argument"},
    {"id": 3, "cat": "error handling", "what": "except Exception: pass around the payment call"},
    {"id": 4, "cat": "edge case", "what": "empty cart divides by len(items)"},
    {"id": 5, "cat": "tests", "what": "new test asserts the function returns what it returns (mirror test)"},
    {"id": 6, "cat": "over-engineering", "what": "adds a Strategy class hierarchy for one discount rule"},
]

def score(found_ids, false_alarms):
    total = sum(WEIGHTS[p["cat"]] for p in PLANTED)
    got = sum(WEIGHTS[p["cat"]] for p in PLANTED if p["id"] in found_ids)
    penalty = min(false_alarms, 3)            # noisy reviews waste the author's time, but cap it
    return got, total, penalty

def report(name, found_ids, false_alarms=0):
    got, total, penalty = score(set(found_ids), false_alarms)
    pct = round(100.0 * got / total)
    missed = [p for p in PLANTED if p["id"] not in found_ids]
    print("%s: caught %d/%d weighted points (%d%%), false alarms %d" % (name, got, total, pct, false_alarms))
    for p in sorted(missed, key=lambda p: -WEIGHTS[p["cat"]]):
        print("    MISSED [%s, weight %d] %s" % (p["cat"], WEIGHTS[p["cat"]], p["what"]))
    verdict = "ship it" if pct >= 90 and penalty == 0 else "needs another pass"
    print("    verdict:", verdict)

report("Skimmer (read the code, looked fine)", [6], 0)
report("Style-focused reviewer", [6, 5], 2)
report("Checklist reviewer", [1, 2, 3, 4, 5, 6], 0)` },
    { lang: 'python', run: true, title: 'Property fuzzer: AI implementation vs brute-force oracle (with shrinking)', code: `import random

def max_subarray_ai(a):
    """'AI-written' Kadane: best sum of a NON-EMPTY contiguous subarray. Planted bug: best starts at 0."""
    best = cur = 0                                 # BUG: wrong for all-negative lists (should start from a[0])
    for x in a:
        cur = max(x, cur + x)
        best = max(best, cur)
    return best

def max_subarray_ai_v2(a):
    """Second 'AI' attempt with an off-by-one: forgets the last element."""
    best = cur = a[0]
    for i in range(1, len(a) - 1):                 # BUG: should be range(1, len(a))
        cur = max(a[i], cur + a[i])
        best = max(best, cur)
    return best

def max_subarray_fixed(a):
    best = cur = a[0]
    for x in a[1:]:
        cur = max(x, cur + x)
        best = max(best, cur)
    return best

def oracle(a):
    """Obviously correct, slow: try every non-empty slice."""
    return max(sum(a[i:j]) for i in range(len(a)) for j in range(i + 1, len(a) + 1))

def fails(fn, a):
    try:
        return fn(a) != oracle(a)
    except Exception:
        return True                                 # a crash is also a failure

def shrink(fn, a):
    """Greedily remove elements while the failure remains -> smallest counterexample."""
    changed = True
    while changed:
        changed = False
        for i in range(len(a)):
            smaller = a[:i] + a[i + 1:]
            if smaller and fails(fn, smaller):
                a, changed = smaller, True
                break
    return a

def fuzz(fn, trials=2000, seed=7):
    rng = random.Random(seed)                       # fixed seed -> failures are reproducible
    for _ in range(trials):
        a = [rng.randint(-5, 5) for _ in range(rng.randint(1, 8))]
        if fails(fn, a):
            small = shrink(fn, a)
            return "FOUND input=%s (shrunk from %s): got %s, oracle says %s" % (small, a, fn(small), oracle(small))
    return "no counterexample in %d random trials" % trials

for f in (max_subarray_ai, max_subarray_ai_v2, max_subarray_fixed):
    print(f.__name__ + ": " + fuzz(f))` }
  ],
  codeTitle: ['Planted bugs vs test suite', 'Checklist scorer', 'Fuzzer with oracle and shrinking'],
  viz: [
    {
      title: 'Review checklist: which categories did you actually check?',
      input: '1 3 4 6',
      inputLabel: 'Numbers of the planted issues you spot (1-8, space separated)',
      gen: function (input) {
        var ids = String(input).trim().split(/[\s,]+/).filter(Boolean).map(Number);
        if (ids.some(function (x) { return isNaN(x) || x < 1 || x > 8; })) throw new Error('Use numbers 1 to 8, for example: 1 3 4 6');
        var items = [
          ['1', 'Security', 'SQL built from request param'],
          ['2', 'Hallucinated API', 'requests.get(retries=3) does not exist'],
          ['3', 'Error swallowing', 'except Exception: pass around payment'],
          ['4', 'Edge case', 'empty cart divides by zero'],
          ['5', 'Off-by-one', 'loop skips the last item'],
          ['6', 'Weak test', 'test mirrors the implementation'],
          ['7', 'Over-engineering', 'class hierarchy for one rule'],
          ['8', 'Scope creep', 'unrelated file reformatted']
        ];
        var frames = [], rows = [], hl = {}, caught = 0;
        function tbl(narr, extra) {
          return { narr: narr, parts: [{ type: 'table', label: 'AI diff: planted issues', columns: ['#', 'category', 'issue', 'your review'], rows: rows.map(function (r) { return r.slice(); }), hl: Object.assign({}, hl) }, { type: 'vars', vals: { caught: caught, missed: rows.length - caught, checked: rows.length } }].concat(extra || []) };
        }
        frames.push({ narr: 'The diff hides 8 issues. A good reviewer walks the <b>checklist</b>, one category at a time, instead of just reading top to bottom.', parts: [{ type: 'table', label: 'AI diff: planted issues', columns: ['#', 'category', 'issue', 'your review'], rows: items.map(function (it) { return [it[0], it[1], it[2], '?']; }) }] });
        for (var i = 0; i < items.length; i++) {
          var found = ids.indexOf(i + 1) >= 0;
          rows.push([items[i][0], items[i][1], items[i][2], found ? 'FOUND' : 'MISSED']);
          hl[i] = found ? 'ok' : 'bad';
          if (found) caught++;
          frames.push(tbl(found ? 'Category <b>' + items[i][1] + '</b>: <span class="c-g">found</span>.' : 'Category <b>' + items[i][1] + '</b>: <span class="c-r">missed</span>. This one would have shipped.'));
        }
        frames.push(tbl('Result: <b>' + caught + ' of 8</b> found. Misses (red) show which checklist habit to practise. Ask: "which category do I forget when I am tired?"'));
        return frames;
      }
    },
    {
      title: 'Test results: planted bugs get caught, one by one',
      input: 'unsorted',
      inputLabel: 'Which bug to fix first (unsorted / touching / mutation / swallow)',
      gen: function (input) {
        var order = ['unsorted', 'touching', 'mutation', 'swallow'];
        var start = order.indexOf(String(input).trim().toLowerCase());
        if (start < 0) throw new Error('Type one of: unsorted, touching, mutation, swallow');
        var tests = [['basic merge', null], ['empty and single', null], ['unsorted input', 'unsorted'], ['touching intervals', 'touching'], ['nested', null], ['input not mutated', 'mutation'], ['bad input raises', 'swallow']];
        var fixed = [], frames = [];
        var seq = order.slice(start).concat(order.slice(0, start));
        function build(narr, label) {
          var rows = [], hl = {}, red = 0;
          tests.forEach(function (t, i) {
            var bad = t[1] && fixed.indexOf(t[1]) < 0;
            if (bad) red++;
            rows.push([t[0], bad ? 'FAIL' : 'PASS']); hl[i] = bad ? 'bad' : 'ok';
          });
          return { narr: narr, parts: [{ type: 'table', label: label, columns: ['test', 'result'], rows: rows, hl: hl }, { type: 'vars', vals: { red: red, green: tests.length - red } }] };
        }
        frames.push(build('The AI function as delivered: it passes the easy tests and <span class="c-r">fails 4</span>. A demo with one happy example would have looked perfect.', 'AI version'));
        seq.forEach(function (b) {
          fixed.push(b);
          frames.push(build('Fixed <b>' + b + '</b>. The matching test turns green. Each red row pointed straight at one bug.', 'After fixing ' + fixed.length + ' of 4'));
        });
        frames.push(build('All green: the suite is the proof. Notice 3 of 7 tests passed even with the bugs present, so <b>pass rate alone is not trust</b>.', 'Reviewed version'));
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Hallucinated API that "looks right"', html: `<p>An AI wrote <code>names.sort(key=len, reverse=True).first()</code>. Python lists have no <code>.first()</code>; it crashes the first time it runs. That is the <i>lucky</i> case. The unlucky case is a call that exists but means something else (<code>dict.update</code> returns <code>None</code>, so <code>d = d.update(x)</code> wipes your data). <b>Rule: run it, and look up any call you cannot explain from memory.</b></p>`, code: { lang: 'python', run: true, code: `d = {"a": 1}\nd = d.update({"b": 2})   # looks fine, but update() returns None\nprint(d)\n# Prints None: the dictionary is gone. The AI-style slip is silent.` } },
    { title: 'Silent swallowing hides the real failure', html: `<p>AI loves "robust" code. This function never crashes, and that is the bug:</p>`, code: { lang: 'python', run: true, code: `def load_price(row):\n    try:\n        return float(row["price"])\n    except Exception:\n        return 0.0          # a missing or garbled price silently becomes FREE\n\nrows = [{"price": "9.99"}, {"price": "N/A"}, {}]\nprint([load_price(r) for r in rows])   # [9.99, 0.0, 0.0] -> two free items, no error\n# Better: catch only (KeyError, ValueError), log the row, and fail loudly or skip explicitly.` } },
    { title: 'Security hole in neat clothing', html: `<p><code>query = f"SELECT * FROM users WHERE name = '{name}'"</code> is readable and wrong: a name like <code>x' OR '1'='1</code> returns every user. Fix: parameterised queries (<code>cursor.execute("... WHERE name = ?", (name,))</code>). Whenever you see a string being glued into SQL, a shell command, a file path or HTML, stop and ask <b>"where did that string come from?"</b></p>` }
  ],
  deepDive: `<p><b>Why these failures happen.</b> A language model predicts what <i>looks</i> like correct code from patterns. It has no built-in "run it and see". So it is great at the common path and weak at (a) rare APIs (hallucination grows when the library changed recently), (b) exact arithmetic at boundaries, (c) things the prompt never mentioned (error paths, security), and (d) anything needing a global view of your codebase. Knowing the <i>reason</i> tells you where to aim your attention.</p>
  <p><b>Reading tests is more valuable than reading code.</b> If the tests are good, the code is mostly their problem. Look for: assertions that cannot fail, tests that call the function and assert on its own output (mirror tests), over-mocking until nothing real is tested, and missing negative tests (what should be <i>rejected</i>?). A coverage number of 100% says lines ran, not that anything was checked.</p>
  <p><b>Differential and property testing</b> scale your review: you can check 10,000 inputs while reading none. Good properties for typical code: idempotence (<code>f(f(x)) == f(x)</code>), round-trip (<code>decode(encode(x)) == x</code>), ordering (sorted output), conservation (total in = total out), and agreement with an oracle. Real tools: Hypothesis for Python, fast-check for JS, jqwik for Java; the fuzzer above is a hand-made miniature. Shrinking (reduce a failing input to the smallest one) is what makes failures understandable.</p>
  <p><b>Security review specifics.</b> Look for: untrusted data reaching an interpreter (SQL, shell, template, <code>eval</code>), authorisation checked only in the UI, secrets in code or logs, weak randomness for tokens, overly broad CORS or file permissions, outdated or <i>invented package names</i> ("slopsquatting": attackers publish packages with names that models tend to hallucinate). Always verify that a suggested dependency exists, is maintained and is the one you meant. Run your normal scanners (linters, SAST, dependency audit); do not exempt AI code from them.</p>
  <p><b>Reviewing size and shape.</b> AI diffs often touch more than asked: reformatted files, renamed variables, deleted "unused" code that was used by reflection. Check the file list against the task. Anything outside scope gets split into its own change or reverted. Also check what was <i>deleted</i>, not just added, and watch for removed tests or weakened assertions.</p>`,
  aiEra: `<p><b>What AI changes:</b> the code arrives fast and clean-looking, so the bottleneck is <b>trusted review</b>. Teams now review more code per person than before, so a repeatable checklist beats raw talent. Some teams also run an AI reviewer as a first pass; it catches style and some bugs but is blind to your product rules.</p>
  <p><b>Use AI as a partner:</b> (1) <code>Review this diff for hallucinated APIs, swallowed errors and injection. Quote the line for each finding.</code> (2) <code>Write 15 nasty test inputs for this function; do not write the function.</code> (3) <code>Write a brute-force oracle for this spec</code> and use it in a fuzzer. Ask a <i>different</i> model or a fresh session than the one that wrote the code, since a model tends to approve its own style.</p>
  <p><b>Where AI goes wrong as a reviewer:</b> praises the code, invents problems that are not there, misses business-rule bugs, and cannot know what your system does in production. <b>What you must still own:</b> the final judgment on every merge, the security call, and the habit of running the code instead of trusting a summary. "The AI said it is fine" is not a review.</p>`,
  problems: [
    P('Review an AI Diff and Find 5 Issues', 'Medium', ['code review', 'failure patterns', 'security'], ['Google', 'Microsoft', 'Stripe'],
      `<p>The agent returns this change for "add a function that applies a discount code to a cart total and charges the card":</p>
      <pre>def checkout(cart, code, db, gateway):
    total = sum(i["price"] * i["qty"] for i in cart)
    row = db.execute(f"SELECT pct FROM coupons WHERE code = '{code}'").fetchone()
    try:
        total = total - total * row[0] / 100
        gateway.charge(total, retries=3)
    except Exception:
        pass
    avg = total / len(cart)
    return {"total": total, "avg_item": avg}</pre>
      <p>Find at least five issues and name the failure pattern for each. Then say what you would change first.</p>`,
      `<p>Line 3: ${H.c('r', 'SQL built from user input')}. Line 6: ${H.c('r', 'retries=3 may not exist')}. Line 7: ${H.c('r', 'except: pass hides a failed charge')}.</p>`,
      `<p>Reading it once and thinking "it looks fine" misses all of them, because each issue is invisible on the happy path.</p>`,
      { q: 'Which issue is the most dangerous?', options: ['Variable naming', 'Swallowed exception around the payment charge, so a failed charge looks like success', 'Missing docstring', 'Using sum()'], answer: 1, explain: 'Money lost or goods shipped unpaid with no error is worst; SQL injection is also severe, so both go first.' },
      ['<p>Hint 1: for every external thing (database, gateway, user string) ask what can go wrong.</p>', '<p>Hint 2: walk the seven patterns in order.</p>', '<p>Hint 3: try empty cart, unknown code, gateway down, 100% discount.</p>'],
      `<p>Issues. 1) Security: the coupon code is pasted into SQL (injection); use a parameterised query. 2) Edge case: unknown code makes <code>fetchone()</code> return None, so <code>row[0]</code> raises TypeError. 3) Error swallowing: <code>except Exception: pass</code> means a declined or failed charge is silently ignored and the function still returns a total; catch specific errors, log, and return a clear failure. 4) Edge case: empty cart gives <code>len(cart) == 0</code> and a ZeroDivisionError on the average. 5) Hallucinated or unchecked API: <code>gateway.charge(..., retries=3)</code> may not exist; check the gateway docs, and retrying a charge without an idempotency key can double-charge. 6) Money as floats: rounding errors; use Decimal or integer cents. 7) Mixed concerns: pricing, database and payment in one function, hard to test. 8) No tests shown. First changes: remove the swallow and fix the SQL injection, since those lose money or data silently. Then add tests: empty cart, unknown code, 100% code, gateway failure, injection string. The review comment style: quote the line, name the risk, suggest the fix.</p>`,
      `<p>Review time about 10 minutes; fixing it later in production costs far more.</p>`, ['How would you make charge idempotent?', 'What test proves the injection is closed?']),
    P('Spot the Hallucination', 'Easy', ['hallucinated API', 'verification'], ['Amazon', 'Meta'],
      `<p>An AI-written snippet uses <code>import json5</code>, <code>os.path.exists_dir(p)</code> and <code>my_list.append_all(items)</code>. Which of these are suspicious, how do you check each in under a minute, and how do you guard against the problem in general?</p>`,
      `<p>${H.c('r', 'os.path.exists_dir')} and ${H.c('r', 'list.append_all')} do not exist in Python. <code>json5</code> exists on PyPI but is not in the standard library.</p>`,
      `<p>Pasting it and hoping wastes the time of a failing build, or worse: installing a package that does not exist or belongs to an attacker.</p>`,
      { q: 'Fastest way to check a suspicious call?', options: ['Ask the same AI if it is right', 'Run it and read the official docs or the REPL help()', 'Assume it is fine', 'Search for the first blog post'], answer: 1, explain: 'The interpreter and the official docs are the ground truth; the same model may repeat the same error.' },
      ['<p>Hint 1: does the name feel like a real standard-library name?</p>', '<p>Hint 2: ask the REPL or the docs: <code>dir()</code>, <code>help()</code> or <code>hasattr</code> show whether the name exists.</p>', '<p>Hint 3: for packages, check the registry page, maintainers, release date and download count.</p>'],
      `<p>Check each in the REPL: <code>import os; hasattr(os.path, "exists_dir")</code> returns False, and the right call is <code>os.path.isdir</code>. <code>[].append_all</code> raises AttributeError; the real methods are <code>extend</code> or <code>+=</code>. <code>json5</code> is a real third-party package, but it is not installed by default; before adding a dependency, open its registry page, confirm the name is spelled exactly right (typosquats exist), look at maintainers, last release and usage, and ask whether the standard <code>json</code> module is enough. General guard: always run the code; add type checking or a linter that flags unknown attributes; require tests to execute the new lines; and keep a short allow-list of dependencies in the project instructions so the agent does not invent new ones.</p>`,
      `<p>One minute per suspect call.</p>`, ['What is slopsquatting?', 'How can a linter or type checker help?']),
    P('Decide What to Verify Manually', 'Hard', ['risk', 'verification strategy', 'judgment'], ['Anthropic', 'Stripe', 'Netflix'],
      `<p>An agent delivered five changes in one session: (a) a CSS colour tweak, (b) a database migration that drops a column, (c) a pure function that computes tax, (d) a retry wrapper around the payment API, (e) a README update. You have 30 minutes. Rank them by how much human verification each needs, and say what you would check for each.</p>`,
      `<p>Rule of thumb: spend review time in proportion to ${H.c('r', 'cost of a silent bug × hard-to-undo')}.</p>`,
      `<p>Reviewing everything equally means the migration and the payment code get the same shallow look as the CSS, and the risky ones slip through.</p>`,
      { q: 'Which change gets the deepest human review?', options: ['README update', 'CSS colour', 'Migration that drops a column and the payment retry wrapper', 'Variable renames'], answer: 2, explain: 'Irreversible data change and money-moving code have the highest cost of a silent bug.' },
      ['<p>Hint 1: ask "can this be undone?" and "who gets hurt if it is wrong?"</p>', '<p>Hint 2: pure functions can be verified by tests/oracles; side-effecting code needs reasoning.</p>', '<p>Hint 3: allot time minutes, not just rank.</p>'],
      `<p>Ranking with time. 1) Migration dropping a column (12 min): irreversible. Verify the column is truly unused (search the code and queries, reports and other services), that a backup or rollback plan exists, that the migration runs on a copy of production-sized data, and that the app version deployed first no longer reads it (two-step deploy). 2) Payment retry wrapper (10 min): money plus concurrency. Verify an idempotency key is sent on retries, only retryable errors are retried, there is backoff and a cap, and a failed final attempt surfaces an error rather than being swallowed. Check it with a fake gateway that fails twice then succeeds. 3) Tax function (5 min): pure and testable. Verify with a table of known cases and a few properties (non-negative, monotonic in price); compare to an oracle or examples from the accountants. 4) CSS (2 min): look at it in the browser. 5) README (1 min): skim for wrong commands. Principle: AI makes all five equally cheap to produce, but their risk differs by orders of magnitude, so human attention goes where undo is hardest.</p>`,
      `<p>The allocation is the skill, not the speed.</p>`, ['How would feature flags change the ranking?', 'What would you automate so humans need less time?'])
  ]
});

// =====================================================================
topics.push({
  title: 'AI for Debugging, Refactoring and Docs (Including Bisecting a Bug)',
  analogy: `<p>Debugging with AI is like having a <b>very well-read friend on the phone</b> while you look under the car bonnet. They cannot see the engine, so you must describe what you see: the sound, the warning light, what changed last week. They suggest ideas; <i>you</i> turn the key and tell them what really happened. Refactoring is tidying a workshop while keeping every tool working. Docs are the labels on the drawers.</p>`,
  explain: `<p><b>Debugging.</b> The best debugging prompt contains the same things a human colleague would need: the <b>exact error text</b>, the <b>smallest code</b> that shows it, <b>what you expected vs what happened</b>, and <b>what changed recently</b>. Then ask for <b>ranked hypotheses with a test for each</b>, not "fix it". A guess you can test in 2 minutes beats a confident rewrite.</p>
  <p><b>Bisecting.</b> If something worked last week and is broken now, do not stare at code. Use binary search over the history: test the middle commit; if it is good, the culprit is later; if bad, earlier. 16 commits take at most 4 checks; 1,000 commits take 10. Git does this for you with <code>git bisect</code>, and AI can help you write the small script that returns pass or fail for each commit (the hard, human part is making that check <i>reliable</i>).</p>
  <p><b>Refactoring.</b> Refactoring means changing structure without changing behaviour. The rule: <b>tests first, then small steps</b>. Ask the AI for one named refactor at a time ("extract the tax calculation into a pure function"), run the tests after each, and keep every step a separate commit. If there are no tests, ask the AI to write <i>characterisation tests</i> (tests that record what the code does today) before touching it.</p>
  <p><b>Docs.</b> AI is excellent at first drafts of docstrings, READMEs, migration notes and changelogs, because it reads code quickly. It is poor at <i>why</i>. It will describe what the code does, not the business reason or the hidden trap. You add the "why", the warnings and the examples that you verified.</p>
  ${H.table(['Job', 'Good ask', 'Risk to watch'], [
    ['Debug', '3 ranked hypotheses + a quick test for each', 'Confident wrong cause; "fix" that hides the symptom'],
    ['Bisect', 'A script that exits 0/1 for a commit', 'Flaky check gives wrong blame'],
    ['Refactor', 'One named change, tests green after each', 'Behaviour change slipped in; huge diff'],
    ['Docs', 'Draft docstrings from the code; I add the why', 'Docs that describe code that does not exist']
  ])}`,
  clues: [
    '"It worked last week / in the last release" → bisect the history',
    '"Intermittent" / "only in production" / "only on CI" → gather evidence first: logs, seeds, environment differences',
    '"Legacy code with no tests" → characterisation tests before any refactor',
    '"Rename/extract/move without changing behaviour" → small steps, tests after each',
    '"Docs are out of date" → generate drafts from code, review for truth',
    '"Paste the stack trace" interview/work prompt → minimal repro + expected vs actual + recent changes'
  ],
  code: [
    { lang: 'python', run: true, title: 'Bisect over commits: how many checks do you need?', code: `# A commit history is a list from OLD (good) to NEW (bad).
# We look for the FIRST bad commit using binary search.

def first_bad(n_commits, is_bad):
    """is_bad(i) runs the test on commit i (True = bug present).
    Assumes commit 0 is good and the last commit is bad."""
    lo, hi = 0, n_commits - 1           # lo = known good, hi = known bad
    checks = 0
    while hi - lo > 1:
        mid = (lo + hi) // 2
        checks += 1
        bad = is_bad(mid)
        print("  check commit %2d -> %s   window now [%d..%d]" % (mid, "BAD " if bad else "good", lo if bad else mid, mid if bad else hi))
        if bad:
            hi = mid                    # culprit is at mid or earlier
        else:
            lo = mid                    # culprit is after mid
    return hi, checks

CULPRIT = 11                            # pretend commit 11 introduced the bug
n = 16
found, checks = first_bad(n, lambda i: i >= CULPRIT)
print("first bad commit:", found, "| checks used:", checks, "| linear scan would need up to", n - 2)

# Reality check: a FLAKY test breaks bisect. Run the check 3 times per commit.
import random
rng = random.Random(1)
def flaky_is_bad(i):
    truly_bad = i >= CULPRIT
    return truly_bad if rng.random() > 0.2 else (not truly_bad)   # 20% of the time it lies
def stable(check, runs=3):
    votes = sum(1 for _ in range(runs) if check())
    return votes * 2 > runs             # majority vote
found2, checks2 = first_bad(n, lambda i: stable(lambda: flaky_is_bad(i), 5))
print("with majority vote of 5 runs per commit ->", found2, "(checks:", checks2, ")")` },
    { lang: 'text', title: 'A good debugging prompt (copy the shape)', code: `ERROR:     KeyError: 'user_id' at app/services/billing.py:88
EXPECTED:  invoice created for any logged-in user
ACTUAL:    fails only for users who signed up via Google
RECENT:    PR #412 (Google signup) merged Tuesday; billing.py untouched
REPRO:     pytest tests/test_billing.py::test_google_user -x   (fails)
CODE:      <paste billing.py lines 70-100 and the signup mapper>

Give me 3 ranked hypotheses. For each: the one-line test that would
confirm or kill it. Do NOT change code yet.` },
    { lang: 'text', title: 'Safe refactor prompt', code: `Refactor ONLY this: extract the tax calculation from checkout() into
a pure function tax_for(items, region).
Steps: (1) write characterisation tests for current checkout() output
on 6 inputs, run them green; (2) do the extraction; (3) run again.
No behaviour change. No renames elsewhere. Show me the diff stat.` }
  ],
  codeTitle: ['Git-bisect simulation (runnable)', 'Debug prompt', 'Refactor prompt'],
  viz: {
    title: 'Bisect over commits: the search window shrinks',
    input: '16 11',
    inputLabel: 'Number of commits, then the first bad commit index (0-based)',
    gen: function (input) {
      var p = String(input).trim().split(/[\s,]+/).map(Number);
      if (p.length < 2 || p.some(isNaN)) throw new Error('Enter two numbers, e.g. "16 11"');
      var n = p[0], culprit = p[1];
      if (n < 3 || n > 24) throw new Error('Commits must be between 3 and 24');
      if (culprit < 1 || culprit >= n) throw new Error('First bad commit must be between 1 and ' + (n - 1));
      var vals = [], i;
      for (i = 0; i < n; i++) vals.push('c' + i);
      var lo = 0, hi = n - 1, frames = [], known = {};
      known[0] = 'ok'; known[n - 1] = 'bad';
      function arr(narr, mid) {
        var hl = {}, k;
        for (k = lo; k <= hi; k++) hl[k] = 'sel';
        for (k in known) hl[k] = known[k];
        if (mid !== undefined) hl[mid] = 'cur';
        return { narr: narr, parts: [{ type: 'array', label: 'commit history (old → new)', values: vals, hl: hl, showIdx: true }, { type: 'vars', vals: { lo_good: lo, hi_bad: hi, window: hi - lo + 1 } }] };
      }
      frames.push(arr('We know <b>c0 works</b> (green) and <b>c' + (n - 1) + ' is broken</b> (red). The culprit hides in the purple window. A person could test every commit; we will <b>halve the window</b> each time.'));
      var checks = 0;
      while (hi - lo > 1) {
        var mid = Math.floor((lo + hi) / 2);
        checks++;
        frames.push(arr('Check #' + checks + ': run the test on the middle commit <b>c' + mid + '</b>.', mid));
        if (mid >= culprit) { hi = mid; known[mid] = 'bad'; frames.push(arr('c' + mid + ' is <span class="c-r">BAD</span> → the culprit is c' + mid + ' or earlier. Throw away the right half.')); }
        else { lo = mid; known[mid] = 'ok'; frames.push(arr('c' + mid + ' is <span class="c-g">good</span> → the culprit is after it. Throw away the left half.')); }
      }
      var f = arr('Window is down to two neighbours: <b>c' + lo + ' good, c' + hi + ' bad</b>. The first bad commit is <b>c' + hi + '</b>, found in just <b>' + checks + '</b> checks instead of up to ' + (n - 2) + '.');
      f.parts[0].hl[hi] = 'sel';
      frames.push(f);
      return frames;
    }
  },
  examples: [
    { title: 'Debug by hypotheses, not by rewriting', html: `<p>Error: <code>KeyError: 'user_id'</code> only for Google-signup users. The AI offers three ranked ideas:</p>
      ${H.table(['#', 'Hypothesis', 'Quick test', 'Result'], [['1', 'Google mapper does not set <code>user_id</code>', 'print the mapped dict for a Google user', '<span class="c-g">confirmed: key is named "uid"</span>'], ['2', 'Old cache holds stale profile', 'clear cache and rerun', 'still fails'], ['3', 'Race between signup and billing', 'run billing 10 s later', 'still fails']])}
      <p>Total: two minutes to find the cause. The fix is one line in the mapper, <b>not</b> a try/except in billing.</p>` },
    { title: 'Characterisation tests before refactoring', html: `<p>Legacy <code>price()</code> has no tests and weird rules. Ask the AI for tests that <i>record today's outputs</i> for a set of inputs (including odd ones). Run them green. Now every refactor step has a safety net. If the old behaviour is clearly a bug, note it, keep the test, and fix it in a separate commit so the history stays honest.</p>` },
    { title: 'AI-written docs: describe the why', html: `<p>AI draft: <code># Multiplies price by 0.97</code>. Useful version: <code># 3% card-network fee is already included in supplier prices; do not add it again (see FIN-211)</code>. The code says <i>what</i>; only you know <i>why</i>. Rule: accept AI docs for structure and examples, add the reasons yourself, and run every example in the README to prove it works.</p>` }
  ],
  deepDive: `<p><b>Reproduce first, always.</b> A bug you cannot reproduce cannot be fixed or verified. Make a failing test, a script, or a recorded input. Once you have it, you can hand the AI a closed loop: "make this test pass without breaking the others". That loop is where agents shine.</p>
  <p><b>Bisect mechanics.</b> <code>git bisect start; git bisect bad; git bisect good &lt;tag&gt;; git bisect run ./check.sh</code>. The script must exit 0 for good, 1-127 (except 125) for bad, and 125 to skip an untestable commit. Gotchas: commits that do not build (use skip), flaky tests (repeat and vote, as in the code), data or config that changed outside git (bisect only sees code), and merge-heavy histories (use <code>--first-parent</code> to bisect over merges first). You can bisect <i>anything ordered</i>: dependency versions, config changes, deploy IDs, even a list of input rows.</p>
  <p><b>Refactoring safety ladder.</b> From safest to riskiest: automated IDE refactors (rename, extract) which are provably behaviour-preserving; AI edits covered by strong tests; AI edits with weak tests; big-bang rewrites. Use the lowest rung that gets the job done. Keep refactor commits free of behaviour changes so a regression can be bisected to the right commit. Beware "while I'm here" cleanups, which are exactly what agents love to add.</p>
  <p><b>Log and data hygiene.</b> Pasting logs into an AI tool can leak secrets, tokens or customer data. Redact before sharing, prefer company-approved tools, and know your data policy. Stack traces from production often contain emails, ids and keys.</p>
  <p><b>Docs as tests.</b> Docs that contain runnable examples (doctests, README snippets run in CI) cannot silently rot. Have the AI generate examples, and have CI execute them. Decision records (why we chose X over Y) are the docs AI cannot write for you because the reasoning lives in people's heads.</p>`,
  aiEra: `<p><b>What AI changes:</b> a lot of grinding work (reading unfamiliar code, writing the first repro script, drafting docs, mechanical renames) shrinks from hours to minutes. Debugging becomes a conversation where you supply evidence and the model supplies ideas.</p>
  <p><b>Use AI as a partner:</b> <code>Here is the stack trace, the function and what changed. Give three hypotheses ranked by likelihood with a test for each.</code> / <code>Write a git bisect run script for this failing test.</code> / <code>Explain this 200-line function in plain English, then list its hidden assumptions.</code> / <code>Draft a migration note from this diff.</code></p>
  <p><b>Where AI goes wrong:</b> it picks the most <i>common</i> cause, not your cause; it "fixes" by catching the error; it refactors and changes behaviour in the same breath; its docs describe intended behaviour that the code does not have. <b>What you must still own:</b> gathering real evidence, running the experiment that confirms the cause, deciding whether a fix addresses the root cause or only the symptom, and the "why" in the docs.</p>`,
  problems: [
    P('Use AI to Bisect a Bug', 'Medium', ['bisect', 'debugging', 'git'], ['GitHub', 'Atlassian', 'Google'],
      `<p>Your app's checkout page started returning wrong totals sometime in the last 64 commits. Yesterday's tagged release (commit 0) was fine. You want to find the first bad commit with the help of an AI tool. Describe: what you give the AI, what script you write, how many checks you expect, and what could go wrong.</p>`,
      `<p>64 commits: ${H.c('g', 'at most 6 checks')} (log<sub>2</sub> 64 = 6) versus up to 62 by hand.</p>`,
      `<p>Reading diffs one by one from the newest backwards: up to 62 diffs read, and the fix hides in a commit that "looked harmless".</p>`,
      { q: 'How many checks does bisect need at most for 64 commits?', options: ['6 or 7', '32', '64', '1'], answer: 0, explain: 'Each check halves the window: 64, 32, 16, 8, 4, 2, 1 gives about 6 checks.' },
      ['<p>Hint 1: first you need an automatic pass/fail check.</p>', '<p>Hint 2: <code>git bisect run</code> with that script.</p>', '<p>Hint 3: think about commits that do not build and tests that are flaky.</p>'],
      `<p>Plan. 1) Make the failure reproducible as a test: give the AI the wrong total, the expected total and the cart input, and ask it to draft a pytest that fails. Read it yourself to make sure it checks the right thing. 2) Wrap it in <code>check.sh</code> that builds, runs only that test and exits 0 or 1 (exit 125 if the build fails, so bisect skips that commit). 3) Run <code>git bisect start; git bisect bad HEAD; git bisect good v1.4; git bisect run ./check.sh</code>. Expect about 6 steps. 4) Read the culprit commit and ask the AI to explain how that diff could produce the wrong total, then confirm by reverting that commit on a branch and running the test. What can go wrong: a flaky test blames the wrong commit (run the check several times and take the majority); data or config outside git changed (bisect only sees code); the test passes for the wrong reason because it mocks the pricing step; the bug has two causes. Finish with a regression test left in the repo and a short note of the root cause.</p>`,
      `<p>O(log n) checks instead of O(n).</p>`, ['What if the bug depends on a database state?', 'Can you bisect dependency versions?']),
    P('Debug Prompt Makeover', 'Easy', ['prompting', 'debugging'], ['Shopify', 'Atlassian'],
      `<p>Weak prompt: <b>"my code doesn't work, fix it"</b> (with 400 pasted lines). Rewrite it so an AI (or a coworker) can really help. List the pieces to include.</p>`,
      `<p>Include: ${H.c('b', 'exact error, minimal repro, expected vs actual, what changed, what you already tried')}.</p>`,
      `<p>The AI guesses from a wall of code, may "fix" the wrong thing, and you cannot tell if it is right.</p>`,
      { q: 'Which addition improves a debug prompt the most?', options: ['A polite greeting', 'The exact error and a minimal reproduction', 'More code from unrelated files', 'Asking it to be fast'], answer: 1, explain: 'Evidence and a small repro focus the search; unrelated code is noise.' },
      ['<p>Hint 1: what would a teammate ask first?</p>', '<p>Hint 2: shrink the code to the smallest failing example.</p>', '<p>Hint 3: ask for hypotheses plus a test, not a rewrite.</p>'],
      `<p>Better prompt: (1) The exact error text and the line it points at. (2) A minimal repro: the shortest function and input that still fails, ideally under 30 lines, found by deleting everything that does not change the failure. (3) Expected result versus actual result with real values. (4) What changed recently (a commit, a library upgrade, a config edit). (5) What you already tried and what happened. (6) The environment (language and library versions, local or CI). (7) The ask: "Give three ranked hypotheses and a quick test for each; do not rewrite the code." The act of shrinking the repro often solves the bug before you even send the message, which is why it is worth doing. Afterwards you test hypothesis one yourself and report the result back so the conversation moves on evidence, not guessing.</p>`,
      `<p>Five minutes of preparation saves an hour of wrong turns.</p>`, ['How do you redact secrets from logs?', 'When is a rubber duck enough?']),
    P('Safe Refactor of Untested Legacy Code', 'Hard', ['refactoring', 'characterisation tests', 'legacy'], ['Microsoft', 'ThoughtWorks', 'Shopify'],
      `<p>A 300-line <code>calculate_invoice()</code> has no tests, odd rules and three bugs nobody has dared to fix. Your manager wants it split into smaller functions. An agent can do it in one go, but you do not trust that. Design the whole process: safety net, steps, how you handle the three known bugs, and how you review.</p>`,
      `<p>Sequence: ${H.c('b', 'record behaviour → tiny named refactors → tests after each → fix bugs separately')}.</p>`,
      `<p>One big AI rewrite changes structure and behaviour at once; if totals are off by a cent in 2% of invoices, nobody can tell which change caused it.</p>`,
      { q: 'What are characterisation tests?', options: ['Tests that check the UI colour', 'Tests that record what the code does today, bugs included, to protect behaviour during refactors', 'Tests written after release for marketing', 'Performance tests'], answer: 1, explain: 'They pin current behaviour so a refactor can be proven behaviour-preserving.' },
      ['<p>Hint 1: first make a net, then change anything.</p>', '<p>Hint 2: use real (anonymised) production inputs to build the net.</p>', '<p>Hint 3: keep refactor commits free from bug fixes.</p>'],
      `<p>Process. Step 1: build the net. Collect a few hundred anonymised real invoice inputs, covering every branch you can find (run with coverage to see which lines are hit). Ask the AI to write a script that runs the current function on all of them and stores the outputs as "golden" files; review that the script itself does not alter anything. Step 2: lock it in as characterisation tests that run in CI. Step 3: refactor in small named steps, one commit each: extract tax, extract discount, extract rounding, and so on. Use IDE refactors where possible and AI for the rest, with the instruction "no behaviour change, no renames elsewhere". Run the golden tests after every step; on any difference, revert that step. Step 4: only now handle the three known bugs, each in its own commit with a new test that first fails; update the golden files for exactly that case and explain it in the commit message (and tell finance if totals change). Step 5: review each diff for scope creep and confirm the final structure with a fresh-eyes read. Step 6: ship behind a flag or compare old and new in shadow mode on live traffic (log differences, serve the old result) for a week before switching. This keeps the money path safe and each change bisectable.</p>`,
      `<p>Slower than one big rewrite on day one, far faster than the incident review.</p>`, ['What is shadow mode?', 'How do you pick the golden inputs?'])
  ]
});

// =====================================================================
topics.push({
  title: 'AI in Interviews: What Is Allowed, What Is Tested, and How to Talk About It Honestly',
  analogy: `<p>Think of a <b>driving test</b>. The examiner may let you use the mirrors and the indicator (those are part of driving) but not a second driver sitting in the back seat. The rule is always the same: <b>"Show me what you can do."</b> Some tests today say "bring your own co-pilot and show how you steer it". Both are fair, as long as you know which test you are in and you do not pretend.</p>`,
  explain: `<p>Interviews in 2026 come in <b>three flavours</b>, and the first job is to find out which one you are in. Always ask the recruiter: <i>"Can I use AI tools in each round?"</i> Silence is not permission.</p>
  ${H.table(['Round type', 'AI usually...', 'What they test'], [
    ['Classic coding / whiteboard / phone screen', '<span class="c-r">not allowed</span> unless told otherwise', 'Your reasoning, fundamentals, speed with problems, communication'],
    ['Take-home project', 'often allowed, sometimes with disclosure rules', 'Design judgment, tests, readability, and that you understand your own code (a follow-up call asks)'],
    ['AI-enabled / "agentic" onsite', '<span class="c-g">allowed or required</span>', 'How you scope, prompt, verify, and fix what the AI got wrong'],
    ['System design / behavioural', 'not used live', 'Trade-offs and honest stories; AI use may come up as a question']
  ])}
  <p><b>What is being tested when AI is allowed?</b> Not "can you type a prompt". They watch: do you <b>clarify the problem</b> first? Do you <b>break it down</b>? Do you <b>read what the AI produced</b> or paste blindly? Do you <b>run tests</b> and notice a wrong answer? Can you <b>explain every line</b> you submit? Do you know when to stop prompting and fix it by hand?</p>
  <p><b>Talking about AI use honestly.</b> Interviewers ask "How do you use AI?" to find two things: whether you are productive, and whether you are safe. A strong answer is specific and balanced:</p>
  <blockquote>"I use it to draft boilerplate, explore unfamiliar APIs and write first-pass tests. I always write the spec and acceptance tests myself, keep diffs small, and review everything, especially error handling and security. Last month it suggested a library option that did not exist; my tests caught it. For design decisions and anything touching money I do the thinking myself and use it as a second opinion."</blockquote>
  <p>Avoid both extremes: "I never use AI" (sounds stuck) and "AI writes all my code" (sounds like you add no value). <b>Never lie, never use hidden tools in a no-AI round, and never describe AI-written work as fully your own</b> when the rules ask for disclosure. Getting caught, or failing the follow-up question about your own submission, ends the process and can follow you around a small industry.</p>`,
  clues: [
    '"Are AI tools permitted?" is the first question to ask, in writing if possible',
    '"Take-home, 4 hours, you may use any tools" → expect a live walkthrough of your code',
    '"AI-assisted coding interview" / "bring your own assistant" → they grade process: scoping, verification, ownership',
    '"How do you use AI in your work?" → specific workflow + one real failure story',
    '"Walk me through this function you submitted" → you must be able to explain it line by line',
    '"Tell me about a time AI got it wrong" → behavioural story with a lesson'
  ],
  code: [
    { lang: 'text', title: 'Honest AI-use answer: STAR-style skeleton', code: `SITUATION  We had to add rate limiting to a public API in two days.
TASK       Ship it safely; I owned correctness.
ACTION     I wrote the spec table and tests first (8 cases incl. the
           window-edge off-by-one). I let an assistant draft the
           implementation, then reviewed it. It had swallowed an error
           and kept rejected calls in the quota; my tests caught the
           second, my review caught the first.
RESULT     Shipped in 1.5 days, zero incidents; I added a "no bare
           except" lint rule so it cannot recur.
LESSON     AI is fast at drafts; the safety comes from specs, tests
           and review, which stay my job.` },
    { lang: 'text', title: 'What to say at the start of an AI-allowed round', code: `1. "Let me restate the problem and confirm the edge cases."   (clarify)
2. "I'll write two or three tests first so we know what done means."
3. "I'll ask the assistant for a first draft of X, then read it."
4. Read aloud: "This line assumes the list is sorted. It isn't, so..."
5. Run the tests. Say what failed and why before re-prompting.
6. "Here's what I verified, and here's what I'd check with more time."` }
  ],
  codeTitle: ['Honest answer skeleton', 'Narrating an AI-allowed round'],
  viz: {
    title: 'Which rule applies? Walk through the interview types',
    input: '',
    inputLabel: '(no input needed)',
    gen: function () {
      var cols = ['round', 'AI allowed?', 'they grade', 'your move'];
      var rows = [
        ['Phone screen (classic)', 'No', 'reasoning, fundamentals', 'Close other tabs. Think aloud. Ask if unsure.'],
        ['Take-home', 'Check the brief', 'design, tests, ownership', 'Disclose use if asked or required. Know every line.'],
        ['AI-enabled onsite', 'Yes / required', 'scoping, prompting, verifying', 'Spec first, small steps, run tests, explain.'],
        ['System design', 'No (live)', 'trade-offs, depth', 'Reason from first principles; mention AI only as a tool.'],
        ['Behavioural', 'n/a', 'honesty, learning', 'Tell a true story, including a failure.']
      ];
      var frames = [], i;
      frames.push({ narr: 'First rule: <b>ask which flavour of interview you are in</b>. The same behaviour can be smart in one round and cheating in another.', parts: [{ type: 'table', label: 'Interview rounds and AI', columns: cols, rows: rows }] });
      var tags = ['Rules are strict: nothing but you.', 'Allowed does not mean unquestioned: expect a code walkthrough.', 'They watch your <b>process</b> with the tool.', 'Pure thinking and trade-offs.', 'Stories that show judgment.'];
      for (i = 0; i < rows.length; i++) {
        var hl = {}; hl[i] = i === 2 ? 'ok' : (i === 0 ? 'bad' : 'sel');
        frames.push({ narr: '<b>' + rows[i][0] + ':</b> ' + tags[i], parts: [{ type: 'table', label: 'Interview rounds and AI', columns: cols, rows: rows, hl: hl }] });
      }
      frames.push({ narr: 'Golden rule across all rows: <b>honest, prepared, and able to explain every line you submit.</b>', parts: [{ type: 'table', label: 'Interview rounds and AI', columns: cols, rows: rows, hl: { 0: 'sel', 1: 'sel', 2: 'sel', 3: 'sel', 4: 'sel' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'A weak vs strong answer to "How do you use AI?"', html: `${H.table(['Weak', 'Strong'], [['"I use ChatGPT for everything, it is super fast."', '"For drafts, boilerplate and unfamiliar APIs. I write specs and tests first, keep diffs small, and review for edge cases and security. Here is a time it was wrong and what I changed."'], ['"I don\'t really use it."', '"I use it selectively: explanations and test ideas. I avoid it for core design and security-sensitive code, and here is why."']])}
      <p>The strong answers show <b>process, judgment and an honest failure</b>.</p>` },
    { title: 'During an AI-allowed coding round', html: `<p>Task: "Build an LRU cache." Strong candidate: restates rules (capacity, get/put, eviction order), writes 4 tests, asks the AI for a first version, <b>notices it used a list for recency</b> (O(n) moves), says so, and asks for the hash-map plus doubly-linked-list design, runs the tests, and explains the pointer updates. Weak candidate: pastes the problem, pastes the answer, says "done" and cannot explain why <code>get</code> must refresh recency.</p>` },
    { title: 'The follow-up that exposes blind pasting', html: `<p>After a take-home you are asked: "Why did you pick optimistic locking here? What happens under two concurrent updates?" If the code came from an AI and you never read it, you cannot answer. Two habits prevent that: <b>explain-before-accept</b> (state in your own words what each block does before keeping it) and keep a short <b>decision log</b> as you go.</p>` }
  ],
  deepDive: `<p><b>Why companies changed the format.</b> Classic puzzles are now trivially solved by AI, so they are weak signals when AI is available. Hiring teams moved in two directions: (a) in-person or proctored rounds with no AI to measure raw fundamentals, and (b) AI-enabled rounds to measure the real daily skill of directing and verifying a tool. Both can appear in the same loop. Policies vary and change quickly, so read each invitation and ask; do not assume last year's rules.</p>
  <p><b>What interviewers look for in AI-enabled rounds.</b> A rough rubric: <i>problem understanding</i> (asked good questions), <i>decomposition</i> (small steps), <i>prompt quality</i> (context and constraints), <i>verification</i> (tests, reading, edge cases), <i>debugging the AI's mistakes</i>, <i>communication</i> (narrating decisions), and <i>ownership</i> (explains and defends the final code). Raw speed matters less than control: a candidate who ships a verified small solution beats one who ships a large unverified one.</p>
  <p><b>Honesty and risk.</b> Using undisclosed tools in a no-AI round is cheating and detection is improving (screen sharing, proctoring, behavioural cues, follow-up questions that probe depth). The professional cost is also high: a rescinded offer or a note in internal systems. If you are unsure whether something is allowed, ask before, not after. On resumes, describe AI-assisted projects truthfully ("built with AI coding assistants; I designed the architecture and wrote the test suite") and be ready to go deep on any claim.</p>
  <p><b>Preparing.</b> Practise both modes. AI-off: solve problems from scratch under a timer so fundamentals stay sharp. AI-on: do a timed build with an assistant while narrating aloud, and record yourself. Prepare three stories: AI helped a lot, AI was wrong and you caught it, and you chose <i>not</i> to use it. Keep a note of your standard verification routine so you can describe it in 30 seconds.</p>
  <p><b>For interviewers (if you will be on the other side).</b> Design tasks where AI use is visible and gradeable, ask people to explain trade-offs and modify the solution live, and state the policy clearly in advance. Fair rules help honest candidates most.</p>`,
  aiEra: `<p><b>What AI changes:</b> memorised answers lose value; <b>judgment, communication and verification</b> gain value. Many loops now include at least one round where you work <i>with</i> an assistant, and nearly all loops ask about your AI workflow.</p>
  <p><b>Use AI as a partner for preparing:</b> mock interviews (<code>Act as an interviewer; ask me one question at a time; critique my answer; do not give the answer</code>), generating variations of problems, and reviewing your behavioural stories for clarity. Ask it to <i>question</i> your explanation of your own project until you cannot be surprised.</p>
  <p><b>Where AI goes wrong:</b> it flatters your answers, gives polished but generic stories (interviewers can smell them), and can invent facts about companies. <b>What you must still own:</b> the truth of every claim, your own voice, and the ability to solve and explain without help when the round demands it. Treat the AI as a coach that you eventually have to outgrow in the room.</p>`,
  problems: [
    P('Answer "How Do You Use AI at Work?" Honestly', 'Easy', ['interview', 'communication', 'honesty'], ['Anthropic', 'Google', 'Meta'],
      `<p>Write a 60 to 90 second spoken answer to "How do you use AI tools in your daily work?" It must be specific, honest, show safeguards, and include one real failure story. Mark what you would change if the interviewer works at a company that bans AI for security reasons.</p>`,
      `<p>Structure: ${H.c('b', 'where I use it → where I do not → how I verify → one failure + lesson')}.</p>`,
      `<p>"I use AI for everything and it is great" says nothing about safety; "I never use it" says nothing about productivity. Both lose the interviewer's trust.</p>`,
      { q: 'What makes the answer credible?', options: ['Buzzwords like "10x"', 'A concrete workflow with safeguards and a real mistake the AI made', 'Claiming it writes all your code', 'Refusing to discuss tools'], answer: 1, explain: 'Specifics and an honest failure show real experience and good judgment.' },
      ['<p>Hint 1: pick 2 or 3 real use cases from your own work, not a generic list.</p>', '<p>Hint 2: state one concrete verification habit, such as writing the tests first or reading every diff.</p>', '<p>Hint 3: add a boundary: what you do not delegate.</p>'],
      `<p>Model answer. "I use an assistant mostly for first drafts of boilerplate, for understanding unfamiliar code, and for brainstorming edge cases. I keep ownership of the design and the tests: I write the spec and acceptance tests first, ask for small diffs, and review everything, especially error handling and security. For example, last quarter an assistant produced a retry wrapper that swallowed the final error; my review caught it and my test now guards against it. I don't hand it anything involving secrets or customer data unless the tool is company-approved, and for things like payment logic I do the thinking myself and use the tool as a second pair of eyes." If the company bans AI: "That makes sense for your data policy. I'm comfortable working without it; I practise AI-off regularly to keep my fundamentals sharp, and I'm happy to follow your tooling rules." The key points are honesty, specifics, safeguards and respect for the employer's rules. Practise it aloud until it sounds like you, not a script.</p>`,
      `<p>About 200 spoken words.</p>`, ['What if they ask which tools you use?', 'What do you do when the tool disagrees with you?']),
    P('Behave in an AI-Enabled Coding Round', 'Medium', ['interview', 'process', 'verification'], ['Meta', 'Shopify', 'Canva'],
      `<p>You get 45 minutes, an AI assistant and the task "build a small URL shortener API with tests". Write your minute-by-minute plan and the things you will say aloud. Note the three traps that cost candidates the most points.</p>`,
      `<p>Plan: ${H.c('b', '5 min clarify · 10 min tests/spec · 20 min build and verify · 10 min explain')}.</p>`,
      `<p>Pasting the prompt and the response, then running out of time to understand it, leaves you unable to answer the follow-up questions.</p>`,
      { q: 'Biggest trap in an AI-enabled round?', options: ['Using the assistant at all', 'Accepting a large generated blob you cannot explain', 'Writing tests', 'Asking clarifying questions'], answer: 1, explain: 'Interviewers grade understanding and control; an unexplained blob shows neither.' },
      ['<p>Hint 1: the first minutes should not involve the AI.</p>', '<p>Hint 2: plan for time to explain, not only to build.</p>', '<p>Hint 3: traps: no clarification, no verification, no ownership.</p>'],
      `<p>Plan. Minutes 0 to 5: restate the task, ask about scale, persistence, collisions, expiry, validation and abuse; write the answers down as a mini spec. Minutes 5 to 15: write 5 to 6 tests myself (create returns a short code, same URL gives the same or a new code as decided, unknown code gives 404, invalid URL gives 400, very long URL handled, code uniqueness); say aloud what each protects. Minutes 15 to 35: ask the assistant for the smallest first version (in-memory dict, base62 id), read it line by line, run the tests, fix failures myself or with a targeted prompt, then ask for one improvement at a time (collision handling, input validation). Minutes 35 to 45: walk through the design, state limits (not persistent, single process, no auth), and say what I would verify with more time. Traps: (1) skipping clarification and accepting the AI's hidden assumptions; (2) trusting green output without checking that the tests test the right thing; (3) being unable to explain a line, a data structure or a failure mode. Narrate throughout; the narration is the evidence.</p>`,
      `<p>Time is dominated by thinking and checking, not typing.</p>`, ['What if the assistant is slow or fails?', 'What if you disagree with its design?']),
    P('Take-Home With AI: Disclose and Defend', 'Hard', ['interview', 'ethics', 'take-home'], ['Stripe', 'Airbnb'],
      `<p>You complete a 6-hour take-home using an AI assistant. The brief says "tools are allowed; be transparent". Describe how you do the work, what you put in the README about AI use, and how you prepare for the follow-up call where they will ask about your design.</p>`,
      `<p>README note: ${H.c('g', '"Used an assistant for boilerplate and test drafts; design, edge cases and review by me."')}</p>`,
      `<p>Hiding AI use, or submitting code you cannot explain, fails the follow-up call and the trust check in a single moment.</p>`,
      { q: 'Best way to prepare for the follow-up?', options: ['Hope they do not ask', 'Keep a decision log while working and re-read your code line by line, practising explanations', 'Memorise the AI chat', 'Rewrite everything the night before'], answer: 1, explain: 'A running decision log plus a deliberate re-read lets you defend every choice.' },
      ['<p>Hint 1: honesty first: follow the brief exactly.</p>', '<p>Hint 2: leave a trail of decisions while you work.</p>', '<p>Hint 3: rehearse the three hardest questions.</p>'],
      `<p>Approach. While working: write a short spec and test list first; use the assistant for boilerplate, test drafts and alternative designs; for each accepted block, write one sentence in a decision log (why this structure, what trade-off, what I rejected). Keep commits small with clear messages so the history shows genuine progress and review. Before submitting: re-read the whole codebase as a reviewer, run linters and tests, remove dead or over-engineered parts, and check security basics (input validation, secrets, error handling). README: a short, truthful section "How I used AI": what tasks, which tool, what I changed or rejected after review (one concrete example), and what I did not use it for. Also list known limitations and next steps. Follow-up prep: pick the five riskiest design choices and explain each out loud, including the alternative and why not; practise a live change ("add rate limiting" or "support pagination") without the assistant; and prepare an honest answer to "what did the AI get wrong?". If asked something you cannot answer, say so and reason from first principles; honesty plus reasoning beats a bluff. This turns AI use from a risk into evidence of judgment.</p>`,
      `<p>Extra 45 minutes of preparation protects the whole effort.</p>`, ['What if the brief says nothing about AI?', 'How much AI use is too much?'])
  ]
});

// =====================================================================
topics.push({
  title: 'Productivity Without Skill Atrophy: Deliberate Practice, Explain-Before-Accept, AI-Off Reps',
  analogy: `<p>A <b>calculator</b> made arithmetic fast, but people who never learned to estimate in their heads can no longer notice when the calculator shows a silly answer. A <b>satnav</b> makes you quicker, but drivers who always follow it cannot find their way when the signal drops. Skills are muscles: <b>use them or lose them</b>. The fix is not to throw away the calculator; it is to keep a little gym time every week.</p>`,
  explain: `<p><b>Skill atrophy</b> is what happens when a tool does a thing for you so often that you stop being able to do it yourself. For engineers, the danger is not that AI writes code. The danger is that you stop being able to <b>tell whether the code is right</b>, because the part of your brain that reads, traces and predicts code has gone quiet.</p>
  <p>Three habits protect you while you still enjoy the speed:</p>
  <p><b>1. Explain before accept.</b> Before you keep any AI-written block, say in your own words (aloud or in a comment) what it does and why it works. If you cannot, you do not accept it; you ask the AI to explain, then <i>re-explain it back</i>, or you rewrite it yourself. A quick version is "predict first": guess what the code will output before you run it.</p>
  <p><b>2. Deliberate practice.</b> Practise the exact skill you are weak at, at the edge of your ability, with feedback. For example: trace a tricky function by hand; write a function from a blank file; debug with only a print statement. Short, focused, and slightly uncomfortable.</p>
  <p><b>3. AI-off reps.</b> A fixed, scheduled slice of work with the assistant switched off: a small feature, an algorithm problem, reading a codebase, a design sketch on paper. Like going to the gym: regular beats heroic.</p>
  ${H.table(['Habit', 'How long', 'What it protects'], [
    ['Explain before accept', '1 to 2 min per block', 'Reading and reasoning'],
    ['Predict the output', '30 s per run', 'Mental execution'],
    ['AI-off algorithm rep', '30 min, 3 per week', 'Problem solving, interview fundamentals'],
    ['AI-off debug rep', '30 min, 1 per week', 'Debugging instincts'],
    ['Read real code unaided', '30 min, 1 per week', 'Code comprehension'],
    ['Teach it back (write/say)', '15 min, 1 per week', 'Real understanding']
  ])}
  <p>A simple weekly plan is shown in the grid below, and the runnable planner builds one for the hours you have.</p>`,
  clues: [
    '"I can ship fast but freeze when AI is off" → atrophy warning sign',
    '"I accept the suggestion because it looks right" → add explain-before-accept',
    '"Junior engineers rely on AI for everything" → deliberate practice and review culture',
    '"Interview next month, no AI allowed" → increase AI-off reps now',
    '"I cannot explain code I committed" → stop and re-read it',
    '"How do you keep your skills sharp?" → a concrete weekly routine'
  ],
  code: [
    { lang: 'python', run: true, title: 'Weekly AI-off practice planner', code: `# Build a small weekly plan from the hours you can spare.
# Rule of thumb: ~20-30% of your practice time AI-off, never zero.

def plan(total_hours, interview_soon=False):
    off_share = 0.5 if interview_soon else 0.25
    off_minutes = int(total_hours * 60 * off_share)
    reps = [
        ("AI-off algorithm rep",       30, 3 if interview_soon else 2),
        ("AI-off debug rep (prints only)", 30, 1),
        ("Read unfamiliar code unaided",   30, 1),
        ("Teach-back: explain a concept in writing", 15, 1),
    ]
    out, used = [], 0
    for name, mins, times in reps:
        for _ in range(times):
            if used + mins <= off_minutes:
                out.append((name, mins))
                used += mins
    return out, used, off_minutes

for hours, soon in [(6, False), (6, True), (3, False)]:
    items, used, budget = plan(hours, soon)
    print("%d h/week, interview soon=%s -> AI-off budget %d min, planned %d min" % (hours, soon, budget, used))
    for name, mins in items:
        print("   - %-45s %d min" % (name, mins))

# A tiny self-check: "predict, then run" habit.
def mystery(xs):
    seen, out = set(), []
    for x in xs:
        if x not in seen:
            seen.add(x)
            out.append(x * 2)
    return out
print("Predict first, then read:", mystery([3, 1, 3, 2, 1]))   # [6, 2, 4]` },
    { lang: 'text', title: 'Explain-before-accept: a 60-second routine', code: `For each AI block I want to keep:
 1. COVER it. Say what it does in one sentence.
 2. TRACE one tiny input by hand (size 0, 1 or 2).
 3. NAME one thing that could go wrong (edge, error, security).
 4. If I failed 1-3: ask "explain line by line", then explain it back.
 5. Still unclear? Rewrite it myself, then compare.
 Log: one line in my notes: "Learned: ..." (only if I learned something).` }
  ],
  codeTitle: ['Planner (runnable)', 'Explain-before-accept routine'],
  viz: {
    title: 'Skill-practice plan: one week, AI-on and AI-off slots',
    input: '3',
    inputLabel: 'AI-off algorithm reps this week (0-5)',
    gen: function (input) {
      var k = parseInt(String(input).trim(), 10);
      if (isNaN(k) || k < 0 || k > 5) throw new Error('Enter a number from 0 to 5');
      var days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      var cols = ['Build with AI', 'AI-off algo rep', 'AI-off debug / read', 'Teach-back'];
      var rows = [[1, 0, 0, 0], [1, 1, 0, 0], [1, 0, 1, 0], [1, 1, 0, 0], [1, 0, 0, 1], [0, 1, 0, 0], [0, 0, 0, 0]];
      var algoDays = [1, 3, 5, 0, 2, 4, 6];
      var frames = [];
      function cell(v, c) { return v ? ['AI on', 'AI OFF', 'AI OFF', 'write'][c] : ''; }
      function grid(state, narr) {
        var hl = {};
        state.forEach(function (r, ri) { r.forEach(function (v, ci) { if (v) hl[ri + ',' + ci] = ci === 0 ? 'win' : (ci === 3 ? 'sel' : 'ok'); }); });
        return { narr: narr, parts: [{ type: 'grid', label: 'Weekly plan', rowHead: days, colHead: cols, rows: state.map(function (r) { return r.map(function (v, ci) { return cell(v, ci); }); }), hl: hl }] };
      }
      var st = days.map(function () { return [0, 0, 0, 0]; });
      frames.push(grid(st, 'An empty week. Plan it like workouts: <b>decide the slots in advance</b>, or they never happen.'));
      for (var d = 0; d < 5; d++) st[d][0] = 1;
      frames.push(grid(st, 'Weekdays: <b>build with AI</b> (blue). This is your normal, productive work.'));
      var placed = 0;
      for (var i = 0; i < algoDays.length && placed < k; i++) { st[algoDays[i]][1] = 1; placed++; }
      frames.push(grid(st, 'Add <b>' + k + ' AI-off algorithm rep(s)</b> (green): 30 minutes, blank file, no assistant. ' + (k === 0 ? '<span class="c-r">Zero reps = atrophy risk.</span>' : 'Skill stays sharp.')));
      st[2][2] = 1;
      frames.push(grid(st, 'Midweek: one <b>AI-off debug or code-reading</b> session. Use only prints, a debugger and your head.'));
      st[4][3] = 1;
      frames.push(grid(st, 'Friday: <b>teach-back</b> (purple). Write what you learned in plain words. If you cannot, you did not learn it.'));
      frames.push(grid(st, 'Weekend stays light. Total AI-off time: about <b>' + (k * 30 + 30 + 15) + ' minutes</b>. Review monthly: are AI-off tasks getting easier? Raise the difficulty.'));
      return frames;
    }
  },
  examples: [
    { title: 'Explain before accept, in practice', html: `<p>The AI gives a 12-line function using <code>itertools.groupby</code>. You cover it and say: "groups consecutive equal keys... wait, <b>consecutive</b>: so the input must be sorted first." The AI code did not sort. You caught a real bug <i>because</i> you explained it. If you had just run one sorted example, it would have passed.</p>`, code: { lang: 'python', run: true, code: `from itertools import groupby\nwords = ["apple", "avocado", "banana", "apricot"]\nprint([(k, len(list(g))) for k, g in groupby(words, key=lambda w: w[0])])\n# a appears twice as separate groups because groupby only joins NEIGHBOURS\nwords.sort()\nprint([(k, len(list(g))) for k, g in groupby(words, key=lambda w: w[0])])` } },
    { title: 'AI-off rep: a 30-minute session', html: `<p>Pick one medium problem. Timer on. Notes and docs allowed, assistant off. Minutes 0 to 5: restate and list edge cases; 5 to 20: solve; 20 to 25: test by hand; 25 to 30: write one sentence on what was hard. Only <i>after</i> the timer, compare with an AI solution and note differences. The comparison is the learning.</p>` },
    { title: 'Spotting atrophy early', html: `${H.table(['Warning sign', 'Small fix this week'], [['I paste errors without reading them', 'Read the error aloud; guess the cause before asking'], ['I cannot sketch the design without a prompt', 'Draw it on paper first, then compare'], ['I do not remember the syntax I use daily', 'One AI-off rep with only docs'], ['I approve diffs I do not follow', 'Explain-before-accept, or ask for a smaller diff']])}` }
  ],
  deepDive: `<p><b>What research and experience suggest.</b> Studies on tool-assisted work show a pattern: people finish faster with assistants, but learn less when they let the tool do the thinking, especially beginners. Learning comes from <i>effortful retrieval and struggle</i> ("desirable difficulty"). If every hard moment is outsourced, the struggle, and the learning, disappears. Experts are more resilient because they have deep models to check the output against. So the earlier your career, the more AI-off practice you need relative to AI-on speed.</p>
  <p><b>Two ways to use AI for learning.</b> <i>Answer mode</i> ("give me the solution") produces speed and little learning. <i>Tutor mode</i> ("ask me questions; give hints, not answers; check my reasoning") keeps you doing the thinking. Tell the tool which mode you want. A good tutor prompt: <code>I will try to solve this. Do not show code. Review my plan and point out the first wrong assumption.</code></p>
  <p><b>Fundamentals worth keeping hand-fluent.</b> Reading and tracing code; data structures and complexity (to judge whether generated code scales); debugging with a debugger and logs; SQL and the shape of your data; concurrency basics; HTTP and security basics; and writing clearly. These are exactly the skills you need to review AI output, so they are not "old school", they are the quality gate.</p>
  <p><b>Team level.</b> Keep a review culture where authors can explain their diffs; rotate AI-off exercises (kata, incident drills, pair debugging); onboard juniors with a mix of guided AI use and unaided tasks; measure outcomes (defects, review quality, time to understand incidents), not lines produced. Avoid shaming AI use; reward understanding. Also document what you learned from AI sessions so knowledge sits in people and docs, not only in chat history.</p>
  <p><b>Measuring yourself.</b> Monthly check: pick a task you did with AI two months ago and do a similar one without it. Compare time, bugs and confidence. If the gap is growing, increase the AI-off share. Track "times I caught an AI bug myself" as a positive signal.</p>`,
  aiEra: `<p><b>What AI changes:</b> the baseline of what one engineer can ship rises, and so does the cost of not understanding. Careers will favour people who combine <b>AI speed</b> with <b>human-grade verification</b>. Atrophy is the main long-term risk to that combination.</p>
  <p><b>Use AI as a partner for growth:</b> ask it to be a tutor, a quiz master (<code>Ask me 5 questions about this module, one at a time, and grade me</code>), a code reviewer of <i>your</i> code, and a generator of practice problems at the right difficulty. After each AI session, ask it for "three things I should be able to do without you" and add them to the practice plan.</p>
  <p><b>Where AI goes wrong:</b> it makes everything feel easy (illusion of competence), it hands out answers eagerly, and it never gets tired of doing your thinking for you. <b>What you must still own:</b> your learning plan, the discipline of AI-off time, and the honest test: "could I debug this at 2 a.m. with the assistant down?"</p>`,
  problems: [
    P('Plan a Weekly AI-Off Practice Routine', 'Medium', ['skills', 'practice plan', 'habits'], ['Google', 'Microsoft', 'Atlassian'],
      `<p>You are a mid-level engineer who uses an AI assistant 6 hours a day. You notice you struggle without it and have interviews in 6 weeks (AI not allowed in the first rounds). Design a weekly routine of 4 to 5 hours total practice, with AI-off and AI-on parts, a progression over 6 weeks, and how you will measure progress.</p>`,
      `<p>Mix: ${H.c('g', 'AI-off reps for fundamentals')} + ${H.c('b', 'AI-on build sessions for modern workflow')} + ${H.c('p', 'teach-back')}.</p>`,
      `<p>"I will just practise a lot" has no schedule, no feedback and no measure, so it quietly fades by week two.</p>`,
      { q: 'What makes a practice plan stick?', options: ['A big goal only', 'Fixed time slots, small sessions, feedback and a measure', 'Doing it when motivated', 'Only reading articles'], answer: 1, explain: 'Habits need scheduled slots and feedback; motivation alone is unreliable.' },
      ['<p>Hint 1: put practice in fixed weekly slots, the way you would schedule workouts.</p>', '<p>Hint 2: raise the difficulty over the six weeks, for example easy to medium to timed mocks.</p>', '<p>Hint 3: choose measures you can read from a log.</p>'],
      `<p>Routine (about 4.5 h/week). Mon: 45 min AI-off algorithm rep (one medium, timer, blank file). Tue: 30 min AI-off read-and-explain an unfamiliar open-source function. Wed: 45 min AI-off algorithm rep. Thu: 60 min AI-on build with narration (spec and tests first, then assistant, explain-before-accept) to keep the modern workflow sharp. Fri: 45 min AI-off debug rep (planted bug, prints only) plus 15 min teach-back note. Sat: 60 min mock interview, one with no AI and one AI-enabled with narration. Progression: weeks 1 to 2, easy to medium, untimed then timed; weeks 3 to 4, medium with 35-minute cap and spoken reasoning; weeks 5 to 6, mixed mocks, mediums and hards under interview conditions, plus system design sketches on paper. Measurement: log each rep (solved yes/no, minutes, hints used, bug type missed). Targets: solve rate on mediums above 70% in 35 minutes, number of "I only found this after running it" misses trending down, and being able to explain every solution aloud. Weekly review: pick the weakest category and add one extra rep next week. After the interviews, keep a smaller version (about 1.5 hours) permanently.</p>`,
      `<p>Roughly 25 percent of hands-on time AI-off at minimum.</p>`, ['What if work leaves no time?', 'How do you stay motivated?']),
    P('Explain Before Accept: Catch the Bug by Explaining', 'Easy', ['explain-before-accept', 'reading code'], ['Amazon', 'Meta'],
      `<p>An AI proposes: <code>def last_n(items, n): return items[-n:]</code>. Apply the explain-before-accept routine. What do you find for n = 0 and for n larger than the list?</p>`,
      `<p><code>items[-0:]</code> equals <code>items[0:]</code>, the ${H.c('r', 'whole list')}, not an empty list.</p>`,
      `<p>Running one example (n = 2) shows it works and you accept. The n = 0 case ships and returns everything.</p>`,
      { q: 'What does last_n([1,2,3], 0) return with items[-n:]?', options: ['[]', '[1, 2, 3]', 'Error', '[3]'], answer: 1, explain: '-0 is 0, so the slice is items[0:], the whole list. Negative n is another trap.' },
      ['<p>Hint 1: trace n = 0 by hand and write down what items[-0:] gives.</p>', '<p>Hint 2: what is -0 in Python, and what slice does that make?</p>', '<p>Hint 3: list the edge cases: 0, negative, larger than length, empty list.</p>'],
      `<p>Explain: "returns the last n items by slicing from position minus n". Trace small inputs. n = 2 on [1,2,3] gives [2,3], correct. n = 5 on [1,2,3] gives the whole list, which is a fine answer (no error). n = 0: Python treats -0 as 0, so the slice is <code>items[0:]</code> and returns everything instead of an empty list, a classic silent bug. Negative n, such as n = -1, gives <code>items[1:]</code>, also nonsense. Decision: write the spec (n = 0 gives empty; negative raises ValueError), then fix: <code>if n &lt; 0: raise ValueError(...)</code> and <code>return items[max(len(items) - n, 0):]</code>, which also returns an empty list when n is 0. (The shorter <code>items[len(items) - n:]</code> breaks when n is larger than the list, because the start index goes negative.) Add tests for 0, 1, equal to length, larger than length, empty list and negative. The lesson: explaining forced the question "what is -n when n is zero?", which one happy-path run never asks.</p>`,
      `<p>O(n) copy of the slice.</p>`, ['How would you test slicing helpers with a property?', 'Which Python slicing traps are common?']),
    P('Decide When Not to Use AI', 'Hard', ['judgment', 'risk', 'career'], ['Anthropic', 'Stripe', 'Netflix'],
      `<p>List six tasks from a normal engineering week and classify each as "AI-first", "AI-assisted with careful review", "AI as second opinion only", or "AI-off". Defend the classification with three principles you can reuse, and describe how you would revisit the choices as tools improve.</p>`,
      `<p>Principles: ${H.c('b', 'cost of silent failure · learning value · data sensitivity')}.</p>`,
      `<p>"Use AI for everything" or "never for important things" are rules of thumb without reasons; they break the first time a case does not fit.</p>`,
      { q: 'Which task is best AI-off?', options: ['Drafting a README', 'Writing a regex for a throwaway script', 'Learning a core concept you will be interviewed on', 'Renaming a variable'], answer: 2, explain: 'When the goal is your own skill, doing the struggle yourself is the point.' },
      ['<p>Hint 1: for each task ask what happens if it is silently wrong.</p>', '<p>Hint 2: ask what you would learn by doing it yourself.</p>', '<p>Hint 3: ask whether private data would leave your company.</p>'],
      `<p>Classification. (1) Boilerplate (config, CRUD scaffolding, test skeletons): AI-first, quick review. (2) Production bug in the payment path: AI-assisted with careful review and evidence; AI proposes hypotheses, you run the experiments and own the fix. (3) Architecture choice (queue vs direct call, data model): AI as second opinion only; you decide, after sketching on paper, then ask the AI to attack your design. (4) Security-sensitive code (auth, crypto, access control): AI-assisted at most, with a mandatory expert review and standard libraries; never invent your own scheme. (5) Learning a new core concept or preparing for an exam or interview: AI-off first attempt, then AI as tutor to check. (6) Customer-data analysis with private fields: AI-off or only an approved internal tool, anonymise first. Principles: (a) the more costly and silent the failure, the more human verification and the less autopilot; (b) when the goal is learning, the struggle is the product, so protect it; (c) data that must not leave the company stays out of unapproved tools. Revisit quarterly: as tools get better and your team builds evals, some tasks move toward AI-first, but only on evidence (defect rates, review findings), not hype. Keep a personal log of the times AI was wrong; it is your best calibration data.</p>`,
      `<p>A decision habit, not an algorithm.</p>`, ['How would you write this into team guidelines?', 'How do junior and senior rules differ?'])
  ]
});

// =====================================================================
// PRACTICE (Easy -> Medium -> Hard)
function mc(q, options, answer, explain) { return { q: q, options: options, answer: answer, explain: explain }; }
function hs(a, b, c) { return ['<p>Hint 1: ' + a + '</p>', '<p>Hint 2: ' + b + '</p>', '<p>Hint 3: ' + c + '</p>']; }

practice.push(P('Rewrite a Vague Prompt', 'Easy', ['prompting', 'scoping'], ['Anthropic', 'Shopify'],
  `<p>Rewrite "make the app faster" into a task an agent can execute safely. Include goal, metric, scope, boundaries and done-condition.</p>`,
  `<p>Better: ${H.c('g', 'p95 of GET /feed under 300 ms; touch only feed service; no new infrastructure; benchmark script must show it.')}</p>`,
  `<p>"Faster" invites a rewrite, new caches and unmeasured changes.</p>`,
  mc('What is the most important part of a good task?', ['A friendly tone', 'A testable done-condition', 'Long text', 'Capital letters'], 1, 'Without a done-condition neither you nor the agent knows when it is finished.'),
  hs('what number would tell you it is faster?', 'where may the agent change code, and where not?', 'ask for diagnosis and a plan before edits.'),
  `<p>Rewrite: "Goal: reduce p95 latency of GET /feed from 1.8 s to under 300 ms on the staging dataset. Scope: app/feed/ and one migration for indexes. Not doing: no new cache service, no API shape change, no dependency upgrades. Context: run the benchmark with <code>make bench-feed</code>; the slow query is logged in the profiler output. First step: profile and report the top three costs with numbers, then wait for my approval. Done when: the benchmark shows p95 under 300 ms, the test suite is green, and a short note lists each change with its measured effect." This version gives a measurable target, a bounded area, explicit exclusions and a feedback loop, so the agent cannot wander and you can verify the result with a number instead of an impression.</p>`,
  `<p>Five minutes of writing.</p>`, ['How do you pick the target number?']));

practice.push(P('Name the Failure Pattern', 'Easy', ['review', 'failure patterns'], ['Google', 'Amazon'],
  `<p>Name the main failure pattern in each: (a) <code>for i in range(len(a)-1)</code> to visit all items; (b) <code>except: continue</code> around a file parse; (c) <code>subprocess.run("ls " + user_path, shell=True)</code>; (d) a 120-line plugin framework for one if-statement; (e) <code>df.fast_merge(other)</code>.</p>`,
  `<p>(a) ${H.c('r', 'off-by-one')} (b) ${H.c('r', 'swallowing')} (c) ${H.c('r', 'injection')} (d) ${H.c('y', 'over-engineering')} (e) ${H.c('r', 'hallucinated API')}.</p>`,
  `<p>Without names for the patterns you re-discover each one slowly in review.</p>`,
  mc('Which pattern is the most likely to be invisible on the happy path?', ['Swallowed errors', 'Syntax errors', 'Import errors', 'Typos in variable names'], 0, 'Swallowed errors produce normal-looking output.'),
  hs('match each snippet to the seven-pattern table.', 'which of these would crash immediately and which would stay quiet?', 'for each, write the one-line fix.'),
  `<p>(a) Off-by-one: the last element is skipped; use <code>range(len(a))</code> or iterate directly with <code>for x in a</code>. (b) Silent error swallowing: bad files vanish from the results; catch the specific exception, log the file name and decide explicitly whether to skip or fail. (c) Security hole (command injection): a path like <code>x; rm -rf ~</code> runs a second command; pass a list of arguments without a shell, <code>subprocess.run(["ls", user_path])</code>, and validate the path. (d) Over-engineering: delete the framework and write the if-statement. (e) Hallucinated API: pandas has <code>merge</code> and <code>join</code> but no <code>fast_merge</code>; check the docs. For each, add a test that would have failed: array of one element, a corrupt file, a path with a semicolon, and so on. Naming the pattern tells you which test to write.</p>`,
  `<p>Review skill, not algorithm.</p>`, ['Which of these would a linter catch?']));

practice.push(P('What Goes in the Spec?', 'Easy', ['spec', 'edge cases'], ['Stripe', 'Atlassian'],
  `<p>You will ask an agent for "a function that splits a bill among N people". List at least eight questions the spec must answer before you prompt.</p>`,
  `<p>Example question: ${H.c('b', '100.00 split 3 ways: who pays the extra cent?')}</p>`,
  `<p>Leave them open and the AI picks silently; floats may lose a cent.</p>`,
  mc('Why decide the rounding rule before prompting?', ['It looks neat', 'Money must add up exactly and the AI would otherwise guess', 'To make the prompt longer', 'It is required by Python'], 1, 'The total of shares must equal the bill exactly; the rule must be explicit.'),
  hs('think money, people count, and who gets leftovers.', 'think about invalid input, such as zero people or a negative bill.', 'turn each answer into one test row.'),
  `<p>Questions. 1) Currency and type: integer cents or Decimal, never float. 2) N = 0 or negative: raise. 3) N = 1: whole bill. 4) Leftover cents: who gets them (first persons, random, last)? 5) Must shares sum exactly to the bill (yes)? 6) Negative or zero bill: allowed (refund)? 7) Weighted shares (one person pays double)? 8) Tip and tax: split before or after? 9) Maximum N and amount? 10) Return type: list of amounts in input order? Then examples: 100.00 for 3 gives [33.34, 33.33, 33.33]; 0.01 for 3 gives [0.01, 0.00, 0.00]; 100.00 for 1 gives [100.00]; N = 0 raises ValueError. The sum-equals-total rule is also a property to fuzz with random bills and N. Each decision removes one guess for the AI.</p>`,
  `<p>20 minutes of questions saves a money bug.</p>`, ['How would you test the sum rule at scale?']));

practice.push(P('Write the Instruction File Rules That Matter', 'Medium', ['CLAUDE.md', 'team practice'], ['Shopify', 'Canva'],
  `<p>Your team has had these incidents with agents: a merged migration was edited; a new HTTP library was introduced; tests were deleted to get green; a secret was printed in logs. Write the instruction-file rules and the tool-based guards that back each one.</p>`,
  `<p>Each rule gets an ${H.c('g', 'enforcer')}: a hook, lint rule, CI check or permission setting.</p>`,
  `<p>Prose-only rules fade as sessions grow and are ignored under pressure.</p>`,
  mc('Strongest protection for "never delete tests"?', ['A line in the instructions only', 'CI that fails when the test count or coverage drops plus required review of test-file diffs', 'Telling the agent twice', 'Nothing'], 1, 'Mechanical checks beat reminders.'),
  hs('write the rule in one checkable sentence.', 'then say what would fail automatically.', 'add who reviews exceptions when a rule must be broken on purpose.'),
  `<p>Rules and guards. 1) "Never edit migrations already on main; create a new one." Guard: CI step that fails if a file in the migrations folder changed in a PR and exists on main; code-owner review. 2) "Use the HTTP client in app/http.py; no new dependencies without approval." Guard: dependency allow-list check in CI and a lint rule banning other HTTP imports. 3) "Do not edit or delete tests to make them pass; if a test seems wrong, stop and ask." Guard: CI compares the number of test cases and flags removed assertions; PRs touching tests need a human approver; test directories read-only in the agent session where the tool supports it. 4) "Never print, log or commit secrets; read them from the environment only." Guard: secret scanning in pre-commit and CI, log redaction, and no production credentials in the agent environment. Also add a short "definition of done" (tests pasted, files listed, unverified items listed). Review the file monthly, deleting rules that no longer matter, because a short file is read, and a long file is skipped.</p>`,
  `<p>One page, enforced by tools.</p>`, ['Where do hooks fit?', 'Who owns the file?']));

practice.push(P('Triage a Flaky Test the Agent "Fixed"', 'Medium', ['testing', 'review', 'flaky tests'], ['GitHub', 'Google'],
  `<p>A test failed one run in ten. The agent's fix added <code>time.sleep(2)</code> before the assertion and a retry decorator (3 attempts). Evaluate the fix and propose a real one.</p>`,
  `<p>Sleep and retry ${H.c('r', 'hide the symptom')}; the race is still there.</p>`,
  `<p>Accepting the green check means the bug returns in production, where nobody retries.</p>`,
  mc('What does a sleep before an assertion usually mean?', ['The race is fixed', 'The test waits for something it should wait on explicitly', 'The code is faster', 'The test is deterministic'], 1, 'Replace time guesses with explicit synchronisation on the event.'),
  hs('why does it fail one time in ten?', 'what event is the test actually waiting for?', 'could production hit the same race?'),
  `<p>Evaluation: the sleep adds two seconds to every run and only lowers the failure probability; the retry decorator turns a failing signal into noise. Neither explains the cause. Real fix: find the race. Reproduce by running the test in a loop of 200 (<code>pytest --count=200</code> with the pytest-repeat plugin, or a shell loop) and under CPU stress. Typical causes: asserting before a background task or event completes; shared state between tests; clock or ordering assumptions; unseeded randomness. Fix by waiting on the actual event (a queue, future or condition with a timeout), making state per-test, injecting a fake clock, and seeding randomness. Ask whether production code has the same race (often it does, which is why the test is a gift). Verify by running the loop of 200 with no failures, remove the sleep and the retry, and add a note to the PR. Review rule: any fix that adds a sleep, a retry or a broader except needs a root-cause explanation.</p>`,
  `<p>Debugging time moves from guessing to evidence.</p>`, ['How would you quarantine flaky tests safely?']));

practice.push(P('Prompt for Test Ideas Without Getting the Solution', 'Medium', ['tutor mode', 'testing', 'learning'], ['Meta', 'Microsoft'],
  `<p>You want an AI to help you test your own <code>parse_duration("1h30m")</code> function without it writing the function or overfitting to your code. Write the prompt and the way you will use the answer.</p>`,
  `<p>Ask for ${H.c('b', 'inputs and expected outputs from the spec only')}; do not paste your code first.</p>`,
  `<p>If you paste your code, the AI tends to write tests that agree with it.</p>`,
  mc('Why not paste your implementation into the test-ideas prompt?', ['It is secret', 'The tests would tend to mirror the implementation, bugs included', 'It costs more', 'AI cannot read code'], 1, 'Independent tests come from the spec, not from the code.'),
  hs('describe the spec in words and give 3 examples.', 'ask for categories of edge cases, not code.', 'you decide the expected value for each ambiguous case.'),
  `<p>Prompt: "Spec: parse_duration takes strings like '1h30m', '45s', '2h', returns total seconds as int. Units h, m, s only, each at most once, in that order; whitespace not allowed; invalid input raises ValueError. Examples: '1h30m' gives 5400, '45s' gives 45. Do not write the function. List 25 test cases as a table (input, expected result or ValueError, why it matters), grouped into: normal, boundaries, ordering, repeats, whitespace and case, overflow and zero values, garbage." Use of the answer: read every row critically; for each row where the spec is silent (is '0h' valid? '90m'? uppercase?), decide the rule yourself and update the spec; then implement (by hand, or with AI) against the table, generate test code from it, and run. Record which rows surprised you; those are skill gaps. Finally run the tests against a deliberately broken version to confirm they can fail.</p>`,
  `<p>Tests from the spec stay independent.</p>`, ['When is it fine to let AI write both?']));

practice.push(P('Review an AI Pull Request Description', 'Medium', ['review', 'communication'], ['Atlassian', 'Stripe'],
  `<p>An agent's PR says: "Refactored the order module for clarity, improved performance, added tests. All tests pass." The diff touches 38 files. What do you ask for before reviewing?</p>`,
  `<p>Vague claims need ${H.c('y', 'evidence')}: which files, which metric, which tests.</p>`,
  `<p>Reviewing 38 files line by line with no map takes hours and still misses the important change.</p>`,
  mc('Best first reaction?', ['Approve because tests pass', 'Ask to split into focused PRs and to list measured claims and unverified areas', 'Reject without comment', 'Merge and monitor'], 1, 'Reviewability is the real requirement; claims need numbers.'),
  hs('what did it claim and how could you check each claim?', 'which parts are behaviour changes vs pure moves?', 'what are you not told: tests run, risks, files changed on purpose?'),
  `<p>Ask for: (1) a split into at least two PRs, one pure refactor (moves and renames with no behaviour change) and one for the performance change, since mixing them hides regressions. (2) For "improved performance": the benchmark, before and after numbers, and the dataset. (3) For "added tests": the list of new test names and what each protects, plus confirmation that existing tests were not edited or removed (show the diff stat of test files). (4) A file-by-file purpose list with the riskiest files first. (5) A "not verified" list (concurrency, migrations, other services). Then review in order: tests, risky files, scope creep, deleted code. If the author cannot answer, the change is not ready. In your instruction file, require the same template from the agent so every PR arrives with evidence.</p>`,
  `<p>Process fix beats heroic reading.</p>`, ['How do you keep a PR template useful?']));

practice.push(P('Build a Property Test Suite for a Sorting Function', 'Medium', ['property testing', 'oracle'], ['Jane Street', 'Google'],
  `<p>An agent wrote <code>my_sort(xs)</code>, supposedly stable. List the properties you would test with random inputs and how you would build the oracle.</p>`,
  `<p>Properties: ${H.c('g', 'sorted, same elements (permutation), stable, idempotent, input untouched')}.</p>`,
  `<p>Five hand-picked lists miss duplicate and ordering corner cases.</p>`,
  mc('Which check proves the output is a permutation of the input?', ['Output length equals input length only', 'Compare sorted multiset counts (Counter) of input and output', 'Output is increasing', 'Output is not empty'], 1, 'Increasing alone allows dropping or inventing elements; counts prove nothing was lost.'),
  hs('sorting has several independent properties.', 'the standard library sort is a ready oracle.', 'stability needs records with equal keys.'),
  `<p>Properties. 1) Ordered: each element is not greater than the next. 2) Permutation: Counter of input equals Counter of output (nothing lost, nothing invented). 3) Stability: sort pairs (key, original index) by key only; for equal keys the indices must stay increasing. 4) Idempotent: sorting the output changes nothing. 5) Input not mutated unless documented (compare to a copy). 6) Oracle: compare with <code>sorted(xs, key=...)</code>, which is stable and trusted; compare exactly. Generator: seeded random lists of length 0 to 20 with a small value range so duplicates are common, plus special cases (empty, one element, all equal, already sorted, reverse sorted, large values, negatives). On failure shrink by removing elements until minimal. Run a few thousand cases. Prove the suite works by planting bugs (an unstable swap, dropping the last element) and checking they are caught. In practice use Hypothesis, which provides generation and shrinking.</p>`,
  `<p>Test cost is small and coverage is wide.</p>`, ['How would you test performance claims?']));

practice.push(P('Design an AI-Assisted Workflow for a Team of Eight', 'Hard', ['process', 'team', 'governance'], ['Atlassian', 'Shopify', 'Stripe'],
  `<p>Your team of eight starts using coding agents on a payments codebase. Design the working agreement: task cards, instruction file, branch and review rules, test requirements, security and data rules, and how you measure whether it is working.</p>`,
  `<p>Goal: ${H.c('g', 'faster delivery without more incidents')}.</p>`,
  `<p>Letting everyone do their own thing yields inconsistent code, hidden risk and review overload.</p>`,
  mc('Which metric best shows AI use is healthy?', ['Lines of code per day', 'Lead time together with change-failure rate and review quality', 'Number of prompts', 'Tool licences used'], 1, 'Speed must be balanced by quality outcomes.'),
  hs('start from risks: money, data, review load.', 'make the rules checkable by tools.', 'agree on how to learn and adjust.'),
  `<p>Working agreement. Tasks: every agent task starts from a card with goal, boundaries, done-condition and the first step as a plan to approve. Instructions: one shared instruction file in the repo (commands, layout, rules, done-checklist), owned by two maintainers, reviewed monthly. Diffs: target under 300 changed lines, one concern per PR, tests first for logic; agents never push to main; every PR has a human reviewer who has read the tests first. Tests: new logic needs tests; tests are not edited by the agent to get green; payment code needs property tests or an oracle. Security: no production credentials in agent environments; secrets scanning and dependency allow-list in CI; no customer data in prompts except through the approved tool; auth, crypto and money paths need a second senior reviewer. Autonomy: free in sandbox branches for throwaway work, step-by-step for payment code. Learning: AI-off rotation (weekly kata and incident drills), juniors pair on risky changes, a shared log of AI mistakes that feeds the instruction file. Metrics: lead time, change-failure rate, rollback count, review turnaround, defects found in review versus production, and a quarterly survey of confidence in understanding the code. Review the agreement after six weeks and adjust on evidence, relaxing rules that show no incidents and tightening where incidents occur.</p>`,
  `<p>Process, not tooling, decides the outcome.</p>`, ['How do you handle disagreement about autonomy?', 'What would make you pause agent use?']));

practice.push(P('Postmortem: The AI Change That Passed Every Test', 'Hard', ['postmortem', 'verification', 'risk'], ['Netflix', 'Stripe', 'Google'],
  `<p>An agent changed a currency-conversion helper. All tests passed and the PR was approved in 4 minutes. Two days later invoices in one currency were off by a cent for 3% of customers. Write the postmortem analysis: root causes in the process, why the tests passed, and the follow-up actions.</p>`,
  `<p>Likely: rounding mode changed and ${H.c('r', 'tests used values that do not expose it')}.</p>`,
  `<p>Blaming "the AI" ends the discussion; the process gaps remain and repeat.</p>`,
  mc('Best root-cause statement?', ['The AI is unreliable', 'Our tests lacked boundary rounding cases and review depth did not match money risk', 'The reviewer was lazy', 'Bad luck'], 1, 'Blameless analysis finds fixable system gaps.'),
  hs('ask why the tests did not detect it: look at the inputs they used.', 'why did review take 4 minutes for money code?', 'what detection would have caught it earlier?'),
  `<p>Analysis. Impact: 3% of invoices in one currency off by one cent for two days; customer trust and manual correction cost. Why tests passed: the test inputs used round numbers (10.00, 100.00) where banker's rounding and half-up rounding agree; no case sat on a half-cent boundary; no property such as "converted total equals the sum of converted lines" existed; the AI-updated tests mirrored the new behaviour. Process causes: (1) review time did not scale with risk, so a 4-minute approval for money code; (2) no checklist for rounding, currency and boundaries; (3) the change description claimed "cleanup" without stating a behaviour change; (4) no shadow comparison against the previous implementation. Detection gap: no monitoring on invoice totals versus the ledger. Actions: add boundary tests (x.xx5 values, many currencies, negative amounts); add a differential test against the old implementation on recorded invoices; add property tests for the sum rule; require two reviewers and a risk checklist on money paths; require PR descriptions to separate refactors from behaviour changes; add a reconciliation alert; run changes to money code in shadow mode first. Owners and dates for each action. The tone is blameless: the question is how our system let a plausible change through.</p>`,
  `<p>Fixes are cheap compared with a second incident.</p>`, ['How do you test for rounding rules?', 'What belongs in a risk checklist?']));

practice.push(P('Build Your Personal Verification Policy', 'Hard', ['verification', 'judgment', 'risk'], ['Anthropic', 'Google'],
  `<p>Write a one-page personal policy that says, for each kind of AI-produced artefact (code, test, SQL, config, docs, analysis), what you verify, how deeply, and what you refuse to accept without evidence. Include a "stop and escalate" list.</p>`,
  `<p>Depth follows ${H.c('r', 'risk × irreversibility')}.</p>`,
  `<p>Ad hoc verification varies with mood and deadline, and fails when you are tired or rushed.</p>`,
  mc('What belongs on a "stop and escalate" list?', ['Colour changes', 'Auth or payment logic, data deletion, migrations, anything touching secrets or regulated data', 'Readme typos', 'Variable names'], 1, 'Irreversible or high-impact areas need extra eyes.'),
  hs('group artefacts by what a silent bug costs.', 'for each group write the minimum evidence you require.', 'add a time budget so it is realistic.'),
  `<p>Policy. Tier 1 (low risk: docs, small UI, scripts for one-off use): skim, run once, confirm examples work, 1 to 5 minutes. Tier 2 (normal feature code): read tests first, run the suite, check edge cases and error paths against the seven failure patterns, trace one example by hand, review dependencies, 15 to 30 minutes per PR. Tier 3 (data and SQL): run on a copy, check row counts before and after, look for fan-out joins and null handling, compare aggregates with a trusted number. Tier 4 (money, auth, crypto, migrations, deletes, secrets): write the spec and tests myself, require property or differential tests, second reviewer, staged rollout with monitoring and a rollback plan. I refuse to accept: code I cannot explain; tests I did not read; any new dependency I have not checked on the registry; any claim of "tested" without output; summaries instead of diffs. Escalate when: the change touches an area outside the task; the AI contradicts the spec; two attempts failed with the same symptom; the data involved is regulated. Calibration: keep a log of AI mistakes I caught and ones that slipped through, review monthly, and move artefact types between tiers based on evidence.</p>`,
  `<p>One page, revisited monthly.</p>`, ['How do you adapt the policy for a junior teammate?']));

practice.push(P('Run a Blameless Review of Your Own AI Habits', 'Hard', ['self-review', 'calibration', 'habits'], ['Google', 'Anthropic'],
  `<p>Over the last month you merged about 30 AI-assisted changes. Design a 60-minute self-audit that finds where your review is weakest, and the experiment you will run for the next month to improve it.</p>`,
  `<p>Method: sample ${H.c('b', 'changes by risk')}, re-review them cold, and count what you now find.</p>`,
  `<p>Relying on a feeling of "I review carefully" gives no data, so blind spots stay hidden.</p>`,
  mc('Why re-review old changes "cold"?', ['To waste time', 'Fresh eyes with the checklist reveal misses that your earlier, rushed review did not', 'To blame the AI', 'To rewrite them'], 1, 'The gap between the first and second review is your measurable blind spot.'),
  hs('pick a sample that includes risky and boring changes.', 'use the seven-pattern checklist as the scoring sheet.', 'turn the biggest gap into one experiment with a measure.'),
  `<p>Audit. Step 1 (10 min): list the 30 changes and tag each with risk (money, auth, data, UI, docs) and size; pick 10 weighted toward risky ones. Step 2 (35 min): re-review each cold using the checklist (hallucinated API, off-by-one, edge cases, swallowed errors, security, over-engineering, weak tests), writing down every finding with the category; also note whether the original review comments mentioned it. Step 3 (10 min): tally by category: which patterns did you find now that you missed then, and in which risk tier? Also check production: any incidents or follow-up fixes tied to these changes. Step 4 (5 min): choose the single biggest gap, for example swallowed errors in the data tier. Experiment for the next month: add one concrete habit, such as a grep for bare except and default returns before every approval, plus a test for the error path; write the expected effect ("zero swallowed errors found in cold re-review") and measure again in a month. Keep the log; repeat quarterly. The point is calibration: replace the feeling of being careful with evidence of where care is missing.</p>`,
  `<p>One hour a month, repeated every quarter.</p>`, ['How would you involve teammates without blame?']));


// =====================================================================
quiz.push(mc('What is the main purpose of a CLAUDE.md-style project instruction file?', ['To store passwords', 'To give an agent with no memory the commands, layout and rules of the project at the start of each session', 'To replace tests', 'To list all past bugs'], 1, 'It is onboarding for a reader that forgets everything between sessions.'));
quiz.push(mc('Why ask an agent for a plan before it edits code?', ['Plans are free to fix, wrong code is expensive to unpick', 'Agents cannot write code without a plan', 'It makes the diff larger', 'It avoids running tests'], 0, 'Correcting a five-bullet plan takes seconds; correcting hundreds of wrong lines does not.'));
quiz.push(mc('In spec-driven development, why should you watch the tests fail first?', ['To waste time', 'To prove each test can fail, so green later means something', 'Because red is required by Python', 'To let the AI see the error'], 1, 'A test that never failed has not been shown to be able to fail.'));
quiz.push(mc('An AI function returns an empty list when any input row is malformed (it uses a broad except). Which pattern is this?', ['Off-by-one', 'Silent error swallowing', 'Hallucinated API', 'Memory leak'], 1, 'The error is hidden and the caller sees plausible output.'));
quiz.push(mc('What is a good oracle for fuzzing a fast AI implementation?', ['A copy of the same implementation', 'A slow, simple, obviously correct implementation of the same spec', 'A random number generator', 'The AI itself asked again'], 1, 'Simplicity makes the oracle trustworthy.'));
quiz.push(mc('Bisecting 1,000 commits needs about how many checks?', ['10', '100', '500', '1,000'], 0, 'log2(1000) is about 10.'));
quiz.push(mc('What are characterisation tests?', ['Tests for UI characters', 'Tests that record current behaviour before a refactor', 'Tests only for new features', 'Load tests'], 1, 'They pin existing behaviour so changes can be proven safe.'));
quiz.push(mc('You are told only "the take-home may use tools". What is the safest approach?', ['Hide AI use', 'Use AI, keep a decision log, disclose honestly and be able to explain every line', 'Avoid all tools', 'Let AI write everything and memorise it'], 1, 'Honesty plus understanding is what the follow-up call tests.'));
quiz.push(mc('What is "explain before accept"?', ['Ask the AI to explain its own code and accept it', 'Say in your own words what a block does, and trace a tiny input, before keeping it', 'Accept code first, explain later', 'Explain only to your manager'], 1, 'Your own explanation checks that you understand and often exposes bugs.'));
quiz.push(mc('Which task most deserves deep human verification?', ['A README typo fix', 'A migration that drops a column', 'A renamed local variable', 'A comment rewrite'], 1, 'It is irreversible and can silently lose data.'));
quiz.push(mc('The agent "fixed" a flaky test by adding sleep(2) and a 3x retry. What is the best judgment?', ['Great fix', 'It hides the race; find the root cause and wait on the real event', 'Add more retries', 'Delete the test'], 1, 'Sleeps and retries hide symptoms; the race remains.'));
quiz.push(mc('Which rule is better enforced by a tool than by prose in the instruction file?', ['"Write clean code"', '"Never import requests; use httpx"', '"Be careful"', '"Think step by step"'], 1, 'A lint rule or CI check on imports is mechanical and reliable.'));
quiz.push(mc('A supposed unique-name check passes with one test input of [3, 1, 2]. What is the biggest weakness?', ['Too many inputs', 'A single happy-path example says nothing about empty, duplicates or ordering', 'The input is too short', 'Nothing'], 1, 'Edge cases are where AI code usually breaks.'));

// =====================================================================
function iv(level, q, a, followUps) { interview.push({ q: q, a: a, level: level, followUps: followUps }); }

iv('B', 'How do you scope a task before handing it to a coding agent?',
  `<p>I write a small task card: the goal in one sentence, the observable behaviour (inputs and expected outputs), where the agent may change code and where not, the context it needs (how to run tests, the pattern file to copy), and a done-condition that a test or command can check. I ask for a short plan first and approve it before any edits. If the work is bigger than one reviewable diff, I split it into steps, usually tests first, then the smallest change that passes, then the cleanup. The reason is simple: the agent fills every gap with a guess, so each missing detail becomes a possible wrong turn, and a small diff gets a real review where a huge one gets a rubber stamp.</p>`,
  ['What do you do when the plan looks wrong?', 'How do you decide diff size?']);
iv('B', 'What goes into a good project instruction file such as CLAUDE.md?',
  `<p>Think of it as the onboarding page for a teammate with no memory. It has the commands to build, test and lint; a short map of the folders; a handful of concrete rules (which HTTP client, never edit merged migrations, no bare except, tests for new functions); and a done-checklist (run the tests and paste the output, list touched files, say what was not verified). It stays short, because long files get skimmed and diluted. Rules I can enforce with a tool (a lint rule, a CI check) I enforce with a tool, since prose fades in long sessions. I never put secrets in it, and I add a line only when the agent repeats a mistake.</p>`,
  ['How do you keep it from growing?', 'Which rules should be hooks rather than text?']);
iv('I', 'Explain spec-driven development and why it helps with AI-written code.',
  `<p>You write the behaviour down first, as a spec with concrete examples including edges, turn those into tests, watch them fail, then let the AI implement until they pass, and finally review what tests cannot see. It helps because the AI will otherwise guess every unstated rule (window edges, rounding, rejected calls), and because tests written after the code usually mirror the code, bugs included. The examples are the clearest language I can give the model, and the tests become an independent judge: it does not matter whether a human or a model wrote the code. I also forbid the agent from editing the tests to get green; if a test seems wrong it must stop and ask.</p>`,
  ['What if the spec is wrong?', 'How do you generate tests from a table?']);
iv('I', 'Name the most common failure patterns in AI-written code and how you catch each.',
  `<p>Hallucinated APIs (run the code, check the docs), off-by-one errors (test sizes 0, 1, 2 and exact boundaries), missing edge cases (write the nasty inputs yourself first), silent error swallowing (grep for bare except, pass and default returns), security holes (find where untrusted data reaches SQL, shell, paths or HTML), over-engineering (ask what can be deleted), and plausible-but-wrong logic (an oracle, a property test or a hand trace of one example). I review in a fixed order: the task first, the file list for scope creep, the tests, then run everything, then hunt the patterns, and finally ask what the AI did not do.</p>`,
  ['Which one is most dangerous in payments?', 'How do you catch dependency hallucination?']);
iv('I', 'How would you use AI to find which commit introduced a bug?',
  `<p>First I make the failure reproducible as a small automatic check, with AI helping draft the test and the script, and I read the test to be sure it checks the right thing. Then I use git bisect run with a script that exits 0 for good, 1 for bad and 125 to skip commits that do not build. That needs about log2 of the number of commits checks, so around 10 for 1,000. Risks are flaky checks (repeat and take a majority vote), changes outside git such as data or config, and a test that passes for the wrong reason. Once I have the culprit commit I may ask AI to explain how it could cause the symptom, but I confirm by reverting it on a branch and running the check.</p>`,
  ['What if the bug needs a particular database state?', 'How do you bisect a dependency upgrade?']);
iv('I', 'How do you decide how much to verify an AI-generated change?',
  `<p>By the cost of a silent failure and how hard it is to undo. A CSS tweak gets a visual check; a pure function gets a table of examples plus a property test; a migration that drops a column, a payment retry wrapper, or anything touching auth or secrets gets a second reviewer, tests I write myself, a rehearsal on a copy of production data, a staged rollout and a rollback plan. I also look at the evidence behind claims: "tests pass" needs the output, "faster" needs numbers. This matters because AI makes all changes equally cheap to produce, while their risks differ by orders of magnitude.</p>`,
  ['What is your stop-and-escalate list?', 'How do you calibrate over time?']);
iv('A', 'What is differential or property-based testing and how do you apply it to AI code?',
  `<p>Differential testing runs two implementations on the same inputs and flags any disagreement; with a simple, slow, obviously correct oracle you can check a fast AI version on thousands of random inputs without reading them all. Property-based testing states rules that must hold for all inputs (sorted output, same elements, round-trip, idempotence) and lets a tool generate cases and shrink failures to the smallest one. I seed the random generator for repeatability, bias values toward small ranges so duplicates and ties are common, and plant a deliberate bug to prove the suite can fail. Tools: Hypothesis, fast-check, jqwik. Limits: it checks what the oracle encodes, so ambiguous specs (ties, rounding) must be decided first.</p>`,
  ['What if the oracle is wrong?', 'How do you test code with side effects?']);
iv('A', 'How do you safely refactor legacy code with an AI agent when there are no tests?',
  `<p>Safety net first: collect anonymised real inputs, ask the AI to write a script that records current outputs as golden data, review the script, and lock it in as characterisation tests that run in CI, using coverage to see which branches the inputs reach. Then refactor in small named steps, one commit each, using IDE refactors where possible and the agent for the rest with "no behaviour change", running the golden tests after every step and reverting any step that differs. Known bugs are fixed separately afterwards with new failing tests. For money paths I would also run old and new side by side in shadow mode on live traffic before switching.</p>`,
  ['What if the golden data contain bugs?', 'How do you review a big AI refactor?']);
iv('B', 'What is allowed and what is tested in AI-era interviews?',
  `<p>It depends on the round, so I always ask. Classic coding and phone screens usually forbid AI and test reasoning and fundamentals. Take-homes often allow tools with disclosure and then probe with a walkthrough of my own code. AI-enabled rounds allow or require an assistant and grade process: clarifying, decomposing, writing tests, prompting well, verifying output, fixing the AI's mistakes and explaining the result. System design and behavioural rounds test trade-offs and honest stories. In all of them I must be able to explain every line I submit, and I never use undisclosed tools where they are not allowed.</p>`,
  ['How do you prepare for each type?', 'What if the rules are unclear?']);
iv('I', 'How do you talk about your AI usage in an interview without sounding either dependent or out of date?',
  `<p>I describe a specific workflow with safeguards: where I use it (drafts, boilerplate, exploring APIs, test ideas), where I do not (core design decisions, security-sensitive logic, learning goals), and how I verify (spec and tests first, small diffs, review for failure patterns). Then I give one honest failure story, such as a swallowed error or a hallucinated option that my tests caught, and what changed afterwards. That shows productivity and judgment together. I avoid slogans like "10x", and I respect the employer's rules, including bans for data reasons.</p>`,
  ['What if they ask you to solve something without AI?', 'Tell me about a time AI misled you.']);
iv('I', 'How do you avoid skill atrophy while using AI heavily?',
  `<p>I treat skills like fitness. Explain-before-accept: I state in my own words what each block does and trace a tiny input before keeping it. Deliberate practice at the edge of my ability. A scheduled AI-off slice each week (algorithm reps, a debugging session with only prints, reading unfamiliar code, a written teach-back), roughly a quarter of my practice time and more before interviews. When learning I use the AI in tutor mode: hints and questions, not answers. Monthly I redo a task unaided to compare time and mistakes, and track the AI bugs I caught myself. The test is simple: could I debug this at 2 a.m. with the assistant down?</p>`,
  ['What does your weekly routine look like?', 'How do you mentor juniors on this?']);
iv('E', 'You lead a team adopting coding agents on a critical codebase. What changes and what stays the same?',
  `<p>Stays the same: ownership, review, tests, and blameless learning from incidents. Changes: code is cheap to produce, so review capacity and verification become the bottleneck, and risk shifts to scope creep, plausible-but-wrong code and invented dependencies. I would set a working agreement: task cards with done-conditions, a shared short instruction file, small single-concern PRs, tests first for logic, agents never merging on their own, tool-enforced guardrails (secret scanning, dependency allow-list, CI checks on test removal), tiered autonomy by blast radius, and no production credentials or customer data in agent environments. I would keep AI-off rotations for skills and measure lead time, change-failure rate, rollbacks and review quality rather than lines of code, and review the agreement after six weeks on evidence.</p>`,
  ['What would make you pause agent use?', 'How do you handle disagreement within the team?']);

registerModule({
  id: 'ai16',
  title: 'AI-Augmented Software Engineering',
  intro: `<p>This module is about the new day-to-day craft of engineering with AI: how to <b>scope and direct coding agents</b>, why to <b>write the spec and tests before the AI writes the code</b>, how to <b>review and test AI-written code</b> using the common failure patterns, how to use AI for <b>debugging, refactoring and docs</b>, how AI shows up in <b>interviews</b>, and how to stay sharp so the tool never replaces your judgment. Everything is practical, with runnable Python (buggy AI code plus the suite that catches it, a spec-to-test generator, a review scorer, a fuzzer with an oracle) and step-through visuals.</p>`,
  goals: [
    'Turn a vague ticket into an agent-ready task and a short project instruction file',
    'Write a spec table and acceptance tests first, then let an AI implement against them',
    'Review an AI diff with a failure-pattern checklist and catch hallucinated APIs, off-by-ones, swallowed errors and security holes',
    'Check AI code with property tests and a brute-force oracle, and bisect a bug over commits',
    'Describe your AI use honestly in interviews and handle AI-allowed and AI-off rounds',
    'Run a weekly AI-off practice routine so skills do not fade'
  ],
  prereqs: `<p>Comfortable Python and basic testing (assert, simple test functions). Helpful: the earlier AI-track modules on prompting, tool use and agents, and Git basics.</p>`,
  hours: 10,
  topics: topics,
  practice: practice,
  quiz: quiz,
  interview: interview
});
})();
