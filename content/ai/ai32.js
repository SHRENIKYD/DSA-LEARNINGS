(function () {
var topics = [], practice = [], quiz = [], interview = [];
// ---- tiny helpers ----
function bx(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 16 }; }
function mc(q, options, answer, explain) { return { q: q, options: options, answer: answer, explain: explain }; }
function hs(a, b, c) { return ['<p>Hint 1: ' + a + '</p>', '<p>Hint 2: ' + b + '</p>', '<p>Hint 3: ' + c + '</p>']; }
// Written (no-code) scenario problem.
function P(title, level, tags, companies, statement, example, bruteWhy, mcq, hints, approach, complexity, followUps) {
  return {
    title: title, level: level, tags: tags, companies: companies,
    statement: statement, constraints: '<p>No code is required. Answer in plain written steps, as a short decision note you could share with your team. Do not rely on exact prices or limits: name the pricing model and say what you would check on the vendor page.</p>',
    example: example,
    brute: { why: bruteWhy },
    mcq: mcq, hints: hints,
    solution: { approach: approach, complexity: complexity, followUps: followUps }
  };
}
// Small tested Python model problem.
function PC(title, level, tags, companies, statement, constraints, example, bruteWhy, bruteCode, mcq, hints, approach, code, complexity, tests, alt, followUps) {
  return {
    title: title, level: level, tags: tags, companies: companies, lang: 'python',
    statement: statement, constraints: constraints, example: example,
    brute: { why: bruteWhy, code: { lang: 'python', code: bruteCode } },
    mcq: mcq, hints: hints,
    solution: { approach: approach, code: { lang: 'python', code: code }, alt: alt, complexity: complexity, followUps: followUps },
    tests: tests
  };
}

// =====================================================================
topics.push({
  title: 'The Landscape: Completions, Chat, Agents and Who Makes What',
  analogy: `<p>Think of a kitchen. A <b>completion</b> tool is a helper who hands you the next ingredient before you ask. A <b>chat</b> tool is a cook you can ask "how do I make this sauce?". An <b>agent</b> is a cook you give a whole recipe to, who uses the stove, tastes the food and comes back when the dish is done. A <b>cloud agent</b> is a catering service: you send the order, it cooks in its own kitchen, and a delivery (a pull request) arrives later. Most brands now sell all four, so you compare <i>how</i> they do it, not <i>whether</i>.</p>`,
  explain: `<p>In 2026 almost every coding assistant offers the same four <b>levels of help</b>. Learn the levels first; brand names change much faster.</p>
  ${H.table(['Level', 'What it does', 'You are...'], [
    ['1. Completion', 'Predicts the next lines as you type (ghost text, "next edit" suggestions).', 'typing; you accept with Tab'],
    ['2. Chat', 'Answers questions about code you select or open; proposes snippets.', 'asking; you copy or apply'],
    ['3. Local agent', 'Reads files, edits many files, runs commands and tests in your editor or terminal, in a loop.', 'supervising, often live'],
    ['4. Cloud / background agent', 'Runs in a remote sandbox from an issue or prompt and returns a branch or pull request.', 'delegating; you review later']
  ])}
  <p><b>The main products</b>, grouped by where they live (check each vendor page for current names and features, because they change monthly):</p>
  <ul>
  <li><b>GitHub Copilot</b>: completions and chat in many editors, <i>agent mode</i> in the editor, a Copilot CLI, code review on pull requests, and a <i>cloud coding agent</i> you assign an issue to and that opens a pull request. Its home advantage is GitHub itself: issues, pull requests, Actions.</li>
  <li><b>Cursor</b>: an AI-first editor (a fork of VS Code) with completions, chat, an in-editor agent and <i>cloud agents</i> that run remotely.</li>
  <li><b>Windsurf</b>: another AI-first editor built around an agent ("Cascade"); now owned by Cognition, the company behind the Devin agent. Check its site for the current product name and plans.</li>
  <li><b>JetBrains AI</b>: AI Assistant (completion and chat) plus <b>Junie</b>, JetBrains' coding agent, inside IntelliJ IDEA, PyCharm and the other JetBrains IDEs. Strong if your team already lives in those IDEs.</li>
  <li><b>Amazon</b>: <b>Kiro</b>, an agentic IDE with a spec-driven way of working, strongly tied to AWS services and accounts.</li>
  <li><b>Claude Code</b> (Anthropic), <b>Codex</b> (OpenAI) and <b>Gemini CLI</b> (Google): agents that started in the terminal and now reach into IDEs and the cloud. Google's <b>Jules</b> is an asynchronous cloud agent that works on a GitHub repo in a temporary virtual machine and returns changes for review. Note: according to the Gemini CLI README, free individual access and Google AI Pro / Ultra subscriptions moved to <b>Antigravity CLI</b> on 18 June 2026; Gemini CLI remains for other access, such as API keys and enterprise use. The earlier lessons in this section cover each of these in depth; here we only compare.</li>
  </ul>
  <p>The big shift: these tools are <b>converging</b>. IDE tools added terminals and cloud agents; terminal tools added IDE plug-ins and cloud runs. So the useful questions are no longer "which one has agents?" but <b>where does it run, who pays per what, where does my code go, which models can I pick, and does it fit our existing tools?</b></p>`,
  clues: [
    '"Which AI coding tool should we buy?" → first ask which level of help (completion, chat, agent, cloud agent) the team actually needs',
    '"We live in GitHub issues and PRs" → favour tools whose cloud agent starts from an issue and ends in a PR',
    '"Our team uses IntelliJ" → check the JetBrains-native option before asking people to switch editors',
    '"Heavy AWS shop" → Amazon\'s tools integrate with AWS accounts and services; weigh that against model choice',
    '"Comparing tools in an interview" → compare by surface, autonomy, cost model, data handling and ecosystem, not by brand loyalty',
    'Any feature list older than a few months → treat it as possibly stale and check the vendor page'
  ],
  code: { lang: 'text', title: 'A one-line map you can redraw from memory', code: `LEVEL            WHERE IT RUNS          EXAMPLES (check current names)
completion       editor                 Copilot, Cursor, Windsurf, JetBrains AI
chat             editor / web / CLI     all of the above, plus Claude, ChatGPT, Gemini apps
local agent      editor or terminal     Copilot agent mode, Cursor agent, Junie, Kiro,
                                        Claude Code, Codex CLI, Gemini CLI
cloud agent      vendor sandbox -> PR   Copilot coding agent, Cursor cloud agents,
                                        Codex cloud, Jules, Claude Code on the web` },
  codeTitle: 'Landscape map',
  viz: {
    title: 'Climbing the levels of help: who holds the keyboard?',
    input: '4',
    inputLabel: 'Highest level to show (1-4)',
    gen: function (input) {
      var n = parseInt(String(input).trim(), 10);
      if (isNaN(n) || n < 1 || n > 4) throw new Error('Enter a number from 1 to 4');
      var lv = [
        ['Completion', 'You type; it guesses the next lines.', 'every keystroke', 'seconds'],
        ['Chat', 'You ask; it explains or drafts a snippet.', 'every answer', 'a minute'],
        ['Local agent', 'It edits files and runs tests in a loop on your machine.', 'plan + diff', 'minutes'],
        ['Cloud agent', 'It works in a remote sandbox and opens a pull request.', 'the final PR', 'tens of minutes to hours']
      ];
      var frames = [], rows = [];
      frames.push({ narr: 'Every tool family sells several <b>levels of help</b>. Let us climb them one by one and watch what <i>you</i> still check.', parts: [{ type: 'table', label: 'Levels so far', columns: ['Level', 'What happens', 'You review', 'Typical wait'], rows: [] }] });
      for (var i = 0; i < n; i++) {
        rows.push([(i + 1) + '. ' + lv[i][0], lv[i][1], lv[i][2], lv[i][3]]);
        var hl = {}; hl[i] = 'cur';
        frames.push({ narr: 'Level ' + (i + 1) + ': <b>' + lv[i][0] + '</b>. ' + lv[i][1] + ' Your review moves to: <b>' + lv[i][2] + '</b>.', parts: [{ type: 'table', label: 'Levels so far', columns: ['Level', 'What happens', 'You review', 'Typical wait'], rows: rows.slice(), hl: hl }, { type: 'bars', label: 'How much the tool does alone (1-4)', values: rows.map(function (r, k) { return k + 1; }), hl: hl }] });
      }
      frames.push({ narr: 'Higher levels save typing but move your work to <b>planning and reviewing</b>. The right level depends on the task, not on the brand.', parts: [{ type: 'table', label: 'All levels shown', columns: ['Level', 'What happens', 'You review', 'Typical wait'], rows: rows.slice(), hl: { 0: 'done' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Same task, four levels', html: `<p>Task: add input validation to five API handlers. <b>Completion</b>: you write the first check, the tool suggests the rest as you open each file. <b>Chat</b>: you paste one handler and ask for the pattern. <b>Local agent</b>: "add the same validation to every handler in <code>api/</code>, run the tests" and you watch the diff. <b>Cloud agent</b>: you assign the issue and review a pull request after lunch. All four work; they differ in how much attention you spend and when.</p>` },
    { title: 'Reading a feature list critically', html: `<p>A comparison blog says "Tool X has no cloud agent". It is eight months old. Before you repeat it in a meeting, open the vendor's docs and changelog. In this market, a <b>stale</b> comparison is the most common kind of wrong comparison.</p>` },
    { title: 'Convergence in one picture', html: `${H.table(['Started as', 'Added later'], [['IDE completion tool', 'chat, agent mode, CLI, cloud agent, PR review'], ['Terminal agent', 'IDE plug-ins, desktop/web app, cloud runs, PR review'], ['AI-first editor', 'cloud agents, team admin, model menus']])}<p>So "IDE tool vs terminal tool" describes where a product <i>started</i>, not what it can do today.</p>` }
  ],
  deepDive: `<p><b>Harness vs model.</b> A coding tool is two things: the <i>model</i> (the LLM that writes text) and the <i>harness</i> (the program around it that collects context, calls tools, runs commands, applies edits and asks permission). Many tools let you choose models from several labs, so two products using the same model can still behave very differently because their harnesses differ: how they search the repo, how they summarise long sessions, how they sandbox commands. When you compare tools, compare <b>harness quality on your own repo</b>, not only the model name.</p>
  <p><b>Ecosystem gravity.</b> Each vendor is strongest close to its home: GitHub tools near issues, pull requests and Actions; JetBrains near its refactoring engine and inspections; Amazon near AWS accounts and services; Google near Gemini and Google Cloud; Anthropic and OpenAI near their own models and APIs. Gravity is real value (fewer integrations to build) and real risk (lock-in).</p>
  <p><b>Open standards reduce lock-in.</b> The Model Context Protocol (MCP) lets many tools use the same tool servers (issue trackers, databases, docs). Plain-text project instruction files (such as <code>AGENTS.md</code>, <code>CLAUDE.md</code> or a tool's own rules file) are readable by people and, often, by several agents. Keeping your team's knowledge in repo files and MCP servers, not inside one vendor's settings screen, makes switching cheaper.</p>
  <p><b>Retirements and renames happen.</b> Products get acquired, renamed or folded into others. A team policy should name capabilities ("an approved cloud agent with zero data retention") and keep the product list in one place that someone owns and reviews.</p>`,
  aiEra: `<p><b>What changed:</b> two years ago "AI coding tool" meant autocomplete. Now it means a menu of autonomy levels, and every engineer is expected to choose the right level for each task. The skill is not knowing every product; it is having a <b>stable comparison frame</b> (surface, autonomy, cost model, data handling, model choice, ecosystem) that survives the monthly churn.</p>
  <p><b>Use AI to help compare, carefully:</b> ask an assistant to draft a comparison table, then check every cell against official docs, because models are trained on older pages and confidently describe features that changed. Prompt: <code>List what you are unsure about or what may have changed since your training data.</code></p>
  <p><b>You still own:</b> the final choice, the trial on your own code, and the honesty to say "I have not verified that" in a meeting.</p>`,
  problems: [
    P('Place Six Tools on the Map', 'Easy', ['landscape', 'comparison'], ['GitHub', 'Atlassian'],
      `<p>Your manager asks for a one-slide summary: "Where do Copilot, Cursor, JetBrains AI (with Junie), Kiro, Claude Code and Jules sit?" Build a table with columns: main surface (IDE, terminal, cloud), highest autonomy level offered, and home ecosystem. Add one line on how you verified it.</p>`,
      `<p>Row example: ${H.c('b', 'Jules: cloud, asynchronous agent on a GitHub repo, Google / Gemini ecosystem')}.</p>`,
      `<p>Copying a blog table saves 10 minutes and risks presenting features that were removed or added months ago.</p>`,
      mc('What is the most reliable way to fill each cell?', ['A popular comparison blog', 'The vendor\'s current docs, pricing page and changelog', 'Asking an AI chatbot with no browsing', 'A colleague\'s memory'], 1, 'Products change monthly; official current pages are the source of truth.'),
      hs('separate where a product started from what it offers now.', 'use the four levels (completion, chat, local agent, cloud agent) as columns.', 'note the date you checked and link each source.'),
      `<p>Table. Copilot: IDE plus CLI plus cloud; offers all four levels including a cloud coding agent that turns an issue into a pull request; GitHub ecosystem. Cursor: its own IDE; all four levels including cloud agents; editor-centred, multi-model. JetBrains AI: JetBrains IDEs; completion, chat and the Junie agent; JetBrains ecosystem. Kiro: Amazon's agentic IDE with a spec-driven flow; AWS ecosystem. Claude Code: started in the terminal, now also IDE and web/cloud runs; Anthropic models. Jules: cloud-only asynchronous agent working on GitHub repos in a temporary VM; Google and Gemini ecosystem. Verification line: "Checked on the vendor docs and pricing pages on (date); features change monthly, re-check before purchase." Also mention that model choice and data handling differ by plan, which the next slide covers.</p>`,
      `<p>About 20 minutes with official docs.</p>`, ['How would you keep this slide current?', 'Which column matters most for your team?'])
  ]
});

// =====================================================================
topics.push({
  title: 'Terminal vs IDE vs Cloud Agents, and Synchronous vs Asynchronous Work',
  analogy: `<p>Fixing a car with a mechanic standing next to you is <b>synchronous</b>: fast feedback, but you cannot leave. Dropping the car at a garage and getting a call when it is done is <b>asynchronous</b>: you do other work, but you must describe the problem well at the counter, and you inspect the result when you collect it. Where the mechanic works (your driveway, a mobile van, the garage) is the <b>surface</b>: IDE, terminal or cloud.</p>`,
  explain: `<p>Two separate questions decide how you use an agent:</p>
  <p><b>1. Surface: where does it run?</b></p>
  ${H.table(['Surface', 'Strengths', 'Weaknesses'], [
    ['IDE (editor panel)', 'See diffs inline, jump to code, great for small and visual changes', 'Tied to one editor; harder to script'],
    ['Terminal (CLI)', 'Works with any editor, scriptable, easy to run in CI or over SSH, composes with git and shell tools', 'Less visual; you read diffs in git or a viewer'],
    ['Cloud / background', 'Runs while you do something else; many tasks in parallel; clean sandbox per task', 'Needs a clear spec; slower feedback; repo and secrets access must be set up carefully']
  ])}
  <p><b>2. Timing: are you in the loop live?</b> <b>Synchronous</b> means you watch and steer as it works (approve a plan, correct a wrong turn after 30 seconds). <b>Asynchronous</b> means you hand off a task and come back to a finished branch or pull request.</p>
  <p><b>Rule of thumb:</b> go async when the task is <b>well specified, checkable by tests, low in judgment and not urgent</b>: dependency bumps, adding tests to a module, a mechanical refactor, fixing a lint category, a small bug with a clear reproduction. Stay sync when the task is <b>exploratory, ambiguous, design-heavy or risky</b>: a new architecture, a tricky race condition, anything touching money or auth, or when you do not yet know what "done" looks like.</p>
  <p>Note that surface and timing are not the same thing. A terminal agent can run in the background (a separate worktree while you work elsewhere), and a cloud agent can be steered live through a web session. Pick the timing first from the task; then pick the surface you are comfortable reviewing on.</p>`,
  clues: [
    '"Can it run while I am in meetings?" → asynchronous / cloud agent, with a precise spec and tests',
    '"I am not sure what the design should be" → synchronous; explore with the agent live',
    '"We want the agent in CI" → terminal/CLI agents and headless modes compose with pipelines',
    '"Twenty similar dependency bumps" → fan out to background agents, one branch each',
    '"Flaky race condition in prod" → synchronous, human-led debugging; do not fire-and-forget',
    '"Agent PRs pile up unreviewed" → async output is limited by review capacity, not by agents'
  ],
  code: { lang: 'text', title: 'Sync or async? a 5-question check', code: `1. Can I write "done" as a test or a command?        no  -> SYNC
2. Is the change low-risk and easy to revert?         no  -> SYNC
3. Does it need design judgment or taste?             yes -> SYNC
4. Will I be away for 30+ minutes anyway?             yes -> async is worth it
5. Do I have review time for the PR when it lands?    no  -> do not start it yet
All good? -> ASYNC (cloud or background agent), one task per branch.` },
  codeTitle: 'Sync vs async check',
  viz: {
    title: 'A morning with one sync task and N async tasks',
    input: '3',
    inputLabel: 'How many async tasks to delegate (0-5)?',
    gen: function (input) {
      var n = parseInt(String(input).trim(), 10);
      if (isNaN(n) || n < 0 || n > 5) throw new Error('Enter a number from 0 to 5');
      var nodes = [bx('you', 'You', 10, 30, 12), bx('sync', 'Sync agent (IDE/CLI)', 40, 10, 24), bx('rev', 'Review queue', 80, 30, 18)];
      var edges = [['you', 'sync', 'steer'], ['sync', 'you', 'diff']];
      for (var i = 0; i < n; i++) { nodes.push(bx('a' + i, 'Cloud agent ' + (i + 1), 40, 24 + i * 9, 20)); edges.push(['you', 'a' + i, 'spec']); edges.push(['a' + i, 'rev', 'PR']); }
      var frames = [];
      function fr(narr, hl, ehl, review) {
        return { narr: narr, parts: [{ type: 'graph', label: 'Work in flight', directed: true, height: 72, nodes: nodes, edges: edges, hl: hl, ehl: ehl }, { type: 'vars', label: 'Your attention', vals: { 'live steering': hl.sync ? 'busy' : 'free', 'PRs waiting for you': review } }] };
      }
      frames.push(fr('You start a <b>synchronous</b> task: an unclear design change. You watch and steer it live.', { you: 'cur', sync: 'cur' }, { 'you-sync': 'cur' }, 0));
      if (n === 0) frames.push(fr('No async tasks today. All your attention goes to the sync task. That is fine for a hard, ambiguous problem.', { sync: 'ok' }, { 'sync-you': 'ok' }, 0));
      for (var k = 0; k < n; k++) { var h = { you: 'cur' }; h['a' + k] = 'cur'; var e = {}; e['you-a' + k] = 'ok'; frames.push(fr('Between steering steps you hand off task ' + (k + 1) + ' (clear spec, tests define done) to a <b>cloud agent</b>. It runs without you.', h, e, 0)); }
      for (var j = 0; j < n; j++) { var h2 = { rev: 'cur' }; h2['a' + j] = 'ok'; var e2 = {}; e2['a' + j + '-rev'] = 'ok'; frames.push(fr('Cloud agent ' + (j + 1) + ' finishes and opens a pull request. It joins your <b>review queue</b>.', h2, e2, j + 1)); }
      frames.push(fr(n > 3 ? '<span class="c-r">' + n + ' PRs are now waiting.</span> Agents scaled; your review time did not. Async only helps if review keeps up.' : 'Review queue: ' + n + ' PR(s). Manageable. Async saved you time because the tasks were clear and checkable.', { rev: n > 3 ? 'bad' : 'ok' }, {}, n));
      return frames;
    }
  },
  examples: [
    { title: 'Good async task', html: `<p>"Upgrade library <code>X</code> from v4 to v5 in <code>service-a</code>. Follow the official migration guide. Done when <code>make test</code> passes and no deprecation warnings remain in the test log. Do not change public APIs." It is mechanical, checkable and reversible: ideal for a cloud agent.</p>` },
    { title: 'Bad async task', html: `<p>"Make the checkout faster." There is no measure, no boundary and no done-condition. A background agent will guess (a cache? a query rewrite?) and you will spend longer reviewing its guess than doing a 20-minute live investigation with a profiler and a synchronous agent.</p>` },
    { title: 'Same tool, both modes', html: `${H.table(['Task', 'Mode', 'Surface'], [['Explore an unfamiliar module', 'sync', 'terminal or IDE chat'], ['Write characterisation tests for 6 files', 'async', 'cloud agent, one PR'], ['Fix a bug after a profiler shows the hot loop', 'sync', 'IDE agent with inline diffs'], ['Rename a field across 40 files', 'async or sync', 'IDE refactor tool first; agent for leftovers']])}<p>Mode follows the task. Many engineers use one vendor for both.</p>` }
  ],
  deepDive: `<p><b>Why async needs better specs.</b> In sync mode a misunderstanding costs one correction after a few seconds. In async mode it costs a whole run plus a review of the wrong result. So the clarity bar is higher: the task card must state goal, boundaries, done-condition and how to run tests, and the repo must have a working instruction file and a test command the sandbox can run.</p>
  <p><b>Sandbox setup is engineering work.</b> Cloud agents run in fresh environments. They need: dependency installation that works without your laptop's cache, test commands that do not require production secrets, and network rules (often an allow-list). Teams that invest an afternoon here get reliable background runs; teams that skip it get "agent could not run tests" pull requests.</p>
  <p><b>Parallelism and conflicts.</b> Running five agents at once is easy; merging their work is not. Give each a separate branch or worktree, keep tasks in different files, and merge one at a time with rebase and re-run tests. Two agents editing the same module will produce conflicts no one asked for.</p>
  <p><b>Permissions differ by mode.</b> Sync tools often ask before running commands. Async tools must be pre-authorised, so the safe pattern is a sandbox with no production credentials, scoped repo tokens, and pull requests that still go through normal branch protection and required review.</p>`,
  aiEra: `<p><b>What changed:</b> engineers now manage a small queue of agent tasks alongside their own focused work. The new skill is <b>triage</b>: deciding in seconds which tasks are async-safe and writing a card good enough to survive without you.</p>
  <p><b>Use AI as a partner:</b> before delegating, ask a chat model to critique the task card: <code>What would you have to guess to complete this? List the guesses.</code> Every guess is either a line to add to the card or a sign the task should stay synchronous.</p>
  <p><b>Watch out for:</b> the "slot machine" habit of firing off many async runs and picking the best. It can work for small tasks, but it multiplies review load and cost. You still own the decision to merge.</p>`,
  problems: [
    PC('Sync or Async? Encode the Rule', 'Easy', ['sync vs async', 'decision rule'], ['GitHub', 'Google'],
      `<p>Write <code>choose_mode(clarity, risk, minutes)</code> that returns <code>"async"</code> or <code>"sync"</code>. <code>clarity</code> (1-5) is how precisely "done" can be checked; <code>risk</code> (1-5) is the cost of a silent mistake; <code>minutes</code> is the estimated agent run time. Rule: return <code>"async"</code> only when clarity ≥ 4 <b>and</b> risk ≤ 2 <b>and</b> minutes ≥ 15 (shorter tasks are faster to just do live). Otherwise <code>"sync"</code>.</p>`,
      `<p>1 ≤ clarity, risk ≤ 5; 0 ≤ minutes ≤ 600.</p>`,
      `<p><code>choose_mode(5, 1, 40)</code> → ${H.c('g', '"async"')}: clear, low-risk, long enough to be worth delegating. <code>choose_mode(5, 4, 40)</code> → ${H.c('r', '"sync"')}: risky work stays supervised.</p>`,
      `<p>Delegating everything that is long ignores clarity and risk: long, vague, risky jobs are exactly the ones that go wrong unattended.</p>`,
      `def choose_mode(clarity, risk, minutes):
    # Naive: anything long goes to the background.
    return "async" if minutes >= 15 else "sync"`,
      mc('Which task fits async best?', ['Redesign the payment retry logic', 'Add missing unit tests for a pure date-utility module', 'Investigate a production memory leak', 'Decide a new API shape'], 1, 'Clear done-condition, low risk, mechanical.'),
      hs('all three conditions must hold at once.', 'use a single boolean expression with "and".', 'check boundaries: clarity exactly 4, risk exactly 2, minutes exactly 15 all count as async.'),
      `<p>Async is the exception that needs every safety condition; sync is the default. Combine the three tests with <code>and</code> and include the boundary values.</p>`,
      `def choose_mode(clarity, risk, minutes):
    """Return "async" only for clear, low-risk, long-enough tasks."""
    clear_enough = clarity >= 4      # done can be checked by tests or a command
    safe_enough = risk <= 2          # a silent mistake is cheap and easy to revert
    worth_it = minutes >= 15         # short tasks are quicker to do live
    return "async" if clear_enough and safe_enough and worth_it else "sync"`,
      `<p>O(1) time and O(1) extra space: a fixed number of comparisons.</p>`,
      { sig: 'int int int -> string', fn: 'chooseMode', cases: [
        [[5, 1, 40], 'async'], [[5, 4, 40], 'sync'], [[3, 1, 40], 'sync'], [[4, 2, 15], 'async'],
        [[4, 2, 14], 'sync'], [[4, 3, 100], 'sync'], [[1, 1, 0], 'sync'], [[5, 1, 600], 'async']
      ] },
      [
        { lang: 'java', code: `class Solution {
    public String chooseMode(int clarity, int risk, int minutes) {
        boolean clearEnough = clarity >= 4;   // done can be checked by tests or a command
        boolean safeEnough = risk <= 2;       // a silent mistake is cheap and easy to revert
        boolean worthIt = minutes >= 15;      // short tasks are quicker to do live
        return clearEnough && safeEnough && worthIt ? "async" : "sync";
    }
}` },
        { lang: 'js', code: `function chooseMode(clarity, risk, minutes) {
  const clearEnough = clarity >= 4;   // done can be checked by tests or a command
  const safeEnough = risk <= 2;       // a silent mistake is cheap and easy to revert
  const worthIt = minutes >= 15;      // short tasks are quicker to do live
  return clearEnough && safeEnough && worthIt ? "async" : "sync";
}` },
        { lang: 'cpp', code: `class Solution {
public:
    string chooseMode(int clarity, int risk, int minutes) {
        bool clearEnough = clarity >= 4;   // done can be checked by tests or a command
        bool safeEnough = risk <= 2;       // a silent mistake is cheap and easy to revert
        bool worthIt = minutes >= 15;      // short tasks are quicker to do live
        return clearEnough && safeEnough && worthIt ? "async" : "sync";
    }
};` },
        { lang: 'csharp', code: `public class Solution {
    public string ChooseMode(int clarity, int risk, int minutes) {
        bool clearEnough = clarity >= 4;   // done can be checked by tests or a command
        bool safeEnough = risk <= 2;       // a silent mistake is cheap and easy to revert
        bool worthIt = minutes >= 15;      // short tasks are quicker to do live
        return clearEnough && safeEnough && worthIt ? "async" : "sync";
    }
}` }
      ],
      ['How would you add "reviewer available today" to the rule?'])
  ]
});

// =====================================================================
topics.push({
  title: 'Cost Models: Seats, Included Usage, Credits and Overage',
  analogy: `<p>A phone plan can be a flat monthly fee with a data allowance, pure pay-as-you-go, or a fee plus extra charges when you go over. A light user is cheapest on pay-as-you-go; a heavy user on a big bundle. AI coding tools now sell the same shapes, and agents are the "video streaming" of usage: they burn through allowances much faster than autocomplete.</p>`,
  explain: `<p>Vendors change prices often, so learn the <b>shapes</b>, then read the current page.</p>
  ${H.table(['Model', 'How it works', 'Good for'], [
    ['Per-seat subscription', 'Fixed monthly fee per person; often unlimited completions', 'Predictable budgets, light-to-medium chat use'],
    ['Seat + included usage', 'Fee includes an allowance of model usage (requests, credits or dollars); more costs extra or is throttled', 'Most individual and team plans today'],
    ['Pure usage / API', 'Pay per token or per task at the model\'s API rate, often with your own key', 'Spiky or very heavy agent use; automation in CI'],
    ['Pooled team usage', 'An organisation shares one allowance across seats, with admin budgets', 'Teams where a few people use agents heavily']
  ])}
  <p><b>What counts as "usage" differs.</b> Plain completions are often unlimited or cheap; chat and especially <b>agent runs</b> (many model calls, long contexts, tool loops) consume the allowance. Bigger or "frontier" models usually cost more per call, so the same task can cost several times more on a premium model. Cloud agents are usually billed as model usage too, and some vendors also meter compute time; check.</p>
  <p>In 2026, several major vendors moved from simple "N premium requests per month" toward <b>credits or dollar-denominated usage billed at model rates</b>, with completions excluded and admin-set budgets for teams. The lesson: do not compare tools by sticker price. Compare <b>expected monthly cost for your usage pattern</b>, including overage.</p>
  <p><b>The break-even idea.</b> If a seat costs <i>S</i> per month and pay-as-you-go costs <i>p</i> per task, the seat is cheaper once you run more than <i>S ÷ p</i> tasks a month. With included usage and overage, cost is a piecewise line: flat until the allowance is used, then rising at the overage rate.</p>`,
  clues: [
    '"Budget is fixed per head" → per-seat plans with hard usage caps',
    '"Two power users, eight light users" → pooled usage or mixed plans beat giving everyone the top tier',
    '"Agent runs in CI on every PR" → usage-based API pricing; model the per-run cost',
    '"Our bill tripled after enabling agent mode" → agents consume far more than completions; set budgets and pick models per task',
    '"Which is cheaper?" → depends on usage volume: compute the break-even point',
    'Any exact price in an old slide → re-check the current pricing page'
  ],
  code: { lang: 'python', run: true, title: 'Seat vs usage: monthly cost curves and break-even', code: `# Illustrative numbers only. Plug in the current prices from the vendor pages.
SEAT_FEE = 40.0          # flat monthly fee per person (includes an allowance)
INCLUDED_TASKS = 100     # agent tasks covered by the fee
OVERAGE = 0.50           # cost per task above the allowance
PAYG = 0.60              # pay-as-you-go cost per agent task (no fee)

def seat_cost(tasks):
    extra = max(0, tasks - INCLUDED_TASKS)
    return SEAT_FEE + extra * OVERAGE

def payg_cost(tasks):
    return tasks * PAYG

print(f"{'tasks':>6} {'seat':>8} {'pay-go':>8}  cheaper")
for t in [0, 20, 50, 67, 100, 200, 400]:
    s, p = seat_cost(t), payg_cost(t)
    print(f"{t:>6} {s:>8.2f} {p:>8.2f}  {'seat' if s < p else 'pay-go' if p < s else 'tie'}")

# Break-even within the allowance: smallest t with payg_cost(t) >= SEAT_FEE
import math
print("break-even tasks/month:", math.ceil(SEAT_FEE / PAYG))` },
  codeTitle: 'Break-even calculator',
  viz: {
    title: 'Monthly cost as usage grows: seat plan vs pay-as-you-go',
    input: '40, 100, 0.5, 0.6',
    inputLabel: 'seat fee, included tasks, overage per task, pay-go per task',
    gen: function (input) {
      var a = String(input).split(',').map(function (x) { return parseFloat(x); });
      if (a.length !== 4 || a.some(function (x) { return isNaN(x) || x < 0; }) || a[1] > 10000) throw new Error('Format: fee, included, overage, paygo (e.g. 40, 100, 0.5, 0.6)');
      var fee = a[0], inc = a[1], over = a[2], pg = a[3];
      var steps = [0, 25, 50, 75, 100, 150, 200, 300];
      var frames = [], seat = [], pay = [], labels = [];
      frames.push({ narr: 'Seat plan: <b>' + fee + '</b>/month including ' + inc + ' tasks, then ' + over + ' per extra task. Pay-as-you-go: ' + pg + ' per task. Let us grow usage.', parts: [{ type: 'vars', label: 'Plans', vals: { 'seat fee': fee, included: inc, overage: over, 'pay-go': pg } }] });
      steps.forEach(function (t) {
        var s = fee + Math.max(0, t - inc) * over, p = t * pg;
        seat.push(Math.round(s)); pay.push(Math.round(p)); labels.push(String(t));
        var winner = s < p ? 'seat' : p < s ? 'pay-go' : 'tie';
        var hl = {}; hl[seat.length - 1] = 'cur';
        frames.push({ narr: t + ' tasks: seat costs <b>' + s.toFixed(2) + '</b>, pay-go costs <b>' + p.toFixed(2) + '</b>. Cheaper: <b>' + winner + '</b>.' + (t > inc ? ' Overage has started on the seat plan.' : ''), parts: [{ type: 'bars', label: 'Seat plan cost', values: seat.slice(), idxLabels: labels.slice(), hl: hl }, { type: 'bars', label: 'Pay-as-you-go cost', values: pay.slice(), idxLabels: labels.slice(), hl: hl }] });
      });
      var be = pg > 0 ? Math.ceil(fee / pg) : 'never';
      frames.push({ narr: 'Break-even (inside the allowance): about <b>' + be + '</b> tasks a month. Below that, pay-go wins; above it, the seat wins until overage changes the slope.', parts: [{ type: 'vars', label: 'Result', vals: { 'break-even tasks': be } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Light user vs power user', html: `${H.table(['Person', 'Agent tasks / month', 'Better shape'], [['Designer who asks a few questions', '10', 'free tier or pay-go'], ['Backend dev, daily agent use', '150', 'seat with large allowance'], ['Platform dev running agents in CI', '1,000+', 'usage-based API with budget alerts']])}<p>One plan for everyone overpays for some and throttles others.</p>` },
    { title: 'The premium-model multiplier', html: `<p>Same refactor, two models. The large model costs several times more per call and needs fewer retries; the small model is cheap but needs two extra rounds. Measure <b>cost per accepted PR</b>, not cost per call. Often the right answer is "small model for routine edits, large model for hard bugs".</p>` },
    { title: 'Budget guardrails', html: `<ul><li>Per-user monthly budget with alerts at 50% and 80%.</li><li>Cloud agents limited to approved repos.</li><li>Default model set by admins; premium models opt-in.</li><li>Monthly review of spend per merged PR.</li></ul>` }
  ],
  deepDive: `<p><b>Hidden cost drivers.</b> Long contexts (agents read many files), retries and loops (tests fail, agent tries again), large models, parallel async runs, and automatic PR review on every push. A single misconfigured CI job that runs an agent on every commit can cost more than the whole team's seats.</p>
  <p><b>Total cost of ownership.</b> Licence or usage is only part of it. Add: setup time (sandbox environments, instruction files, MCP servers), admin and security review, training, and, biggest of all, <b>review time</b> for generated code. A tool that is cheaper per seat but produces PRs that take twice as long to review is more expensive.</p>
  <p><b>Bring your own key (BYOK).</b> Some tools let you plug in your own API key or a cloud provider endpoint. That moves billing to your cloud account (useful for committed-spend discounts or data-residency rules) but also moves budgeting and rate-limit handling to you.</p>
  <p><b>Forecasting.</b> Run a two-to-four-week pilot, record usage per person and per task type, then fit the pricing models to that real data. Usage is very skewed (a few heavy users dominate), so model the distribution, not the average.</p>`,
  aiEra: `<p><b>What changed:</b> engineering managers now own a variable AI bill, like a cloud bill. Treat it like FinOps: tags (team, repo, task type), budgets, alerts and a monthly look at cost per useful outcome.</p>
  <p><b>Use AI as a partner:</b> paste your exported usage CSV and ask for spend by user and task type, then verify the totals with a quick script; models make arithmetic slips on long tables.</p>
  <p><b>Watch out for:</b> cost cuts that cost more, such as forcing the cheapest model on hard tasks so engineers burn hours on bad output. You still own the trade-off between money and engineer time.</p>`,
  problems: [
    PC('Seat or Usage? Cheaper Plan for a Given Month', 'Easy', ['cost model', 'break-even'], ['Microsoft', 'Amazon'],
      `<p>Write <code>cheaper_plan(fee, included, overage, payg, tasks)</code>. All money values are whole <b>cents</b>. Seat plan cost = <code>fee + max(0, tasks - included) * overage</code>. Pay-as-you-go cost = <code>tasks * payg</code>. Return <code>"seat"</code>, <code>"usage"</code> or <code>"tie"</code>.</p>`,
      `<p>0 ≤ all inputs ≤ 10<sup>6</sup>. Integers only (cents) so there are no rounding surprises.</p>`,
      `<p><code>cheaper_plan(4000, 100, 50, 60, 50)</code>: seat 4000, usage 3000 → ${H.c('g', '"usage"')}. With 200 tasks: seat 4000 + 100×50 = 9000, usage 12000 → ${H.c('g', '"seat"')}.</p>`,
      `<p>Comparing sticker prices (fee vs payg) ignores volume and overage entirely.</p>`,
      `def cheaper_plan(fee, included, overage, payg, tasks):
    # Wrong: compares the fee with ONE task's price.
    return "usage" if payg < fee else "seat"`,
      mc('Why use integer cents?', ['Faster', 'Avoids floating-point rounding making equal costs look unequal', 'Vendors bill in cents only', 'Python requires it'], 1, 'Exact ties should compare as ties.'),
      hs('compute both monthly costs for the given volume.', 'overage only applies above the allowance: use max(0, ...).', 'compare with less-than both ways; equal means tie.'),
      `<p>Compute both totals for the actual volume, applying overage only to tasks above the allowance, then compare.</p>`,
      `def cheaper_plan(fee, included, overage, payg, tasks):
    """All money in integer cents. Returns 'seat', 'usage' or 'tie'."""
    seat = fee + max(0, tasks - included) * overage   # flat, then overage
    usage = tasks * payg                              # linear from zero
    if seat < usage:
        return "seat"
    if usage < seat:
        return "usage"
    return "tie"`,
      `<p>O(1) time and O(1) extra space: a fixed number of comparisons.</p>`,
      { sig: 'int int int int int -> string', fn: 'cheaperPlan', cases: [
        [[4000, 100, 50, 60, 50], 'usage'], [[4000, 100, 50, 60, 200], 'seat'], [[4000, 100, 50, 60, 0], 'usage'],
        [[3000, 100, 50, 60, 50], 'tie'], [[0, 0, 0, 0, 10], 'tie'], [[1000, 50, 10, 100, 40], 'seat'],
        [[1000, 10, 200, 100, 20], 'usage'], [[1000, 0, 100, 100, 1000000], 'usage']
      ] },
      [
        { lang: 'java', code: `class Solution {
    public String cheaperPlan(int fee, int included, int overage, int payg, int tasks) {
        // All money in integer cents; long avoids overflow on big months.
        long seat = fee + (long) Math.max(0, tasks - included) * overage;   // flat, then overage
        long usage = (long) tasks * payg;                                  // linear from zero
        if (seat < usage) return "seat";
        if (usage < seat) return "usage";
        return "tie";
    }
}` },
        { lang: 'js', code: `function cheaperPlan(fee, included, overage, payg, tasks) {
  // All money in integer cents.
  const seat = fee + Math.max(0, tasks - included) * overage;   // flat, then overage
  const usage = tasks * payg;                                  // linear from zero
  if (seat < usage) return "seat";
  if (usage < seat) return "usage";
  return "tie";
}` },
        { lang: 'cpp', code: `class Solution {
public:
    string cheaperPlan(int fee, int included, int overage, int payg, int tasks) {
        // All money in integer cents; long long avoids overflow on big months.
        long long seat = fee + (long long)max(0, tasks - included) * overage;   // flat, then overage
        long long usage = (long long)tasks * payg;                             // linear from zero
        if (seat < usage) return "seat";
        if (usage < seat) return "usage";
        return "tie";
    }
};` },
        { lang: 'csharp', code: `public class Solution {
    public string CheaperPlan(int fee, int included, int overage, int payg, int tasks) {
        // All money in integer cents; long avoids overflow on big months.
        long seat = fee + (long)Math.Max(0, tasks - included) * overage;   // flat, then overage
        long usage = (long)tasks * payg;                                   // linear from zero
        if (seat < usage) return "seat";
        if (usage < seat) return "usage";
        return "tie";
    }
}` }
      ],
      ['How would you find the break-even volume exactly?', 'How would you model a team with pooled usage?'])
  ]
});

// =====================================================================
topics.push({
  title: 'Privacy, Data Retention, Enterprise Controls and Model Choice',
  analogy: `<p>Hiring a cleaning company for your office is not just about price. You ask: who gets a key, do they photocopy documents, how long do they keep notes, can you see a log of who came in, and can you pick which cleaner shows up? An AI coding tool gets a key to your code. Business plans exist mostly to answer those questions in writing.</p>`,
  explain: `<p>When code goes to an AI tool, ask five questions. The answers usually differ between <b>free/individual</b> and <b>business/enterprise</b> plans of the same product.</p>
  ${H.table(['Question', 'What to look for'], [
    ['1. Is my code used for training?', 'Business plans commonly promise no training on your code; individual plans may have a setting. Read the terms, not the marketing.'],
    ['2. How long is it kept (retention)?', 'Prompts and outputs may be stored for a period for abuse monitoring or features. Some vendors offer zero or reduced retention for business customers.'],
    ['3. Where does it go?', 'Which model providers (sub-processors) see it, which regions, and whether a cloud agent copies the repo into a vendor sandbox.'],
    ['4. What can admins control?', 'SSO/SAML, user provisioning, seat assignment, allowed models, feature toggles (e.g. cloud agent on/off), content exclusions for sensitive paths, usage budgets, audit logs.'],
    ['5. What legal cover?', 'Data processing agreement, security certifications, IP indemnity for generated code on some business plans.']
  ])}
  <p><b>Model choice</b> is part of this. Many tools let users pick models from several labs (Anthropic, OpenAI, Google and others) or plug in your own endpoint. Choice helps quality (best model per task) and resilience (an outage at one provider), but each provider is another data destination your policy must approve. Enterprise admins can usually restrict which models are allowed.</p>
  <p><b>Data classes drive the rules.</b> Classify what might be sent: public code, internal code, confidential code (e.g. fraud rules), regulated data (customer personal data, health, payment card data) and secrets (keys, passwords). Then map each class to approved tool tiers. Secrets should never go to any tool; regulated data usually needs the strictest tier or none.</p>`,
  clues: [
    '"Can we use the free version at work?" → usually no: check training, retention and admin control terms',
    '"Legal asks where our code goes" → list sub-processors, regions, retention and whether cloud sandboxes clone the repo',
    '"Keep the payments folder out of AI" → content exclusion settings plus repo structure plus policy',
    '"Regulated industry" → enterprise plan, data processing agreement, audit logs, possibly regional or self-hosted endpoints',
    '"Engineers want the newest model" → admin-approved model list; review each new provider before enabling',
    '"A key was pasted into chat" → rotate the key; secrets never go to any tool'
  ],
  code: { lang: 'text', title: 'Data-class → allowed tool tier (example policy)', code: `DATA CLASS            PERSONAL/FREE   BUSINESS PLAN   ENTERPRISE (no-train,     SELF-HOSTED/
                                                       reduced retention, audit) LOCAL MODEL
public / open source  yes             yes             yes                       yes
internal code         no              yes             yes                       yes
confidential code     no              no              yes (approved repos)      yes
regulated data (PII)  no              no              only if DPA + approved    case by case
secrets / keys        NEVER           NEVER           NEVER                     NEVER` },
  codeTitle: 'Example policy matrix',
  viz: {
    title: 'Where a prompt goes: tracing data through an AI coding tool',
    input: 'enterprise',
    inputLabel: 'Plan tier: personal, business or enterprise',
    gen: function (input) {
      var t = String(input).trim().toLowerCase();
      if (['personal', 'business', 'enterprise'].indexOf(t) < 0) throw new Error('Type personal, business or enterprise');
      var nodes = [bx('ide', 'Your editor/CLI', 10, 25, 18), bx('ctl', 'Admin policy', 40, 6, 18), bx('svc', 'Vendor service', 40, 30, 18), bx('mdl', 'Model provider', 75, 18, 18), bx('log', 'Logs / retention', 75, 44, 18)];
      var edges = [['ide', 'ctl', 'check'], ['ctl', 'svc', 'allowed?'], ['ide', 'svc', 'prompt+code'], ['svc', 'mdl', 'request'], ['svc', 'log', 'store?']];
      var info = {
        personal: { ctl: 'none: you decide alone', train: 'depends on your settings', ret: 'vendor default', audit: 'no' },
        business: { ctl: 'org seats, some toggles', train: 'commonly no training on your code', ret: 'per business terms', audit: 'basic usage data' },
        enterprise: { ctl: 'SSO, model allow-list, exclusions, budgets', train: 'no training (contractual)', ret: 'reduced or zero options may exist', audit: 'audit logs' }
      }[t];
      function fr(narr, hl, ehl) { return { narr: narr, parts: [{ type: 'graph', label: 'Data path (' + t + ')', directed: true, height: 56, nodes: nodes, edges: edges, hl: hl, ehl: ehl }, { type: 'vars', label: 'Answers for this tier (verify on vendor terms)', vals: info }] }; }
      var f = [];
      f.push(fr('You ask the agent to fix a bug. It gathers <b>code from your repo</b> as context.', { ide: 'cur' }, {}));
      f.push(fr(t === 'personal' ? 'No admin layer: <span class="c-r">nothing stops a sensitive file being sent</span> except your own care.' : 'Admin policy checks: is this user licensed, is this model allowed, is this path excluded?', { ctl: t === 'personal' ? 'bad' : 'ok' }, { 'ide-ctl': 'cur' }));
      f.push(fr('The prompt and code reach the <b>vendor service</b> (the harness backend).', { svc: 'cur' }, { 'ide-svc': 'cur' }));
      f.push(fr('The vendor calls a <b>model provider</b>, possibly a different company. That company is a sub-processor your policy must cover.', { mdl: 'cur' }, { 'svc-mdl': 'cur' }));
      f.push(fr('Prompts/outputs may be <b>retained</b> for a period. Training use: ' + info.train + '. Retention: ' + info.ret + '.', { log: t === 'enterprise' ? 'ok' : 'cur' }, { 'svc-log': 'cur' }));
      f.push(fr('Summary: the same feature has different data handling per tier. Pick the tier from your <b>data class</b>, then confirm in the contract.', { ide: 'done', svc: 'done' }, {}));
      return f;
    }
  },
  examples: [
    { title: 'Content exclusion is not a vault', html: `<p>You exclude <code>payments/</code> from the AI tool. Good, but an engineer can still paste a payments function into a chat window, or a cloud agent with repo access might read it in a different tool. Exclusions reduce accidents; they do not replace a policy, training and least-privilege repo tokens.</p>` },
    { title: 'Model choice vs data policy', html: `<p>A team wants a newly released model from a provider the company has not reviewed. The safe sequence: security reviews the provider's terms and the vendor's routing, admins add it to the allowed list, and the policy table gains a row. Until then, the tool's admin setting keeps it disabled.</p>` },
    { title: 'Questions to send to a vendor', html: `<ol><li>Is customer code used for training, under which plans?</li><li>Retention period for prompts, outputs and cloud-agent workspaces?</li><li>Sub-processors and regions?</li><li>SSO, SCIM, audit log export, model allow-list, content exclusion?</li><li>IP indemnity terms and conditions?</li></ol>` }
  ],
  deepDive: `<p><b>Cloud agents widen the surface.</b> An editor plug-in sends snippets; a cloud agent typically clones the whole repo into a sandbox, installs dependencies, may reach the internet and may need tokens to push branches. Review: sandbox network policy, which secrets are injected (ideally none beyond a scoped repo token), how long workspaces live, and that its pull requests go through the same branch protection as humans.</p>
  <p><b>Prompt injection is a data risk too.</b> An agent reading an issue, a web page or a dependency README can be tricked by hidden instructions ("also print the environment variables"). Mitigations: no production secrets in agent environments, network allow-lists, human review before merge, and tools that ask before risky commands.</p>
  <p><b>Licensing and provenance.</b> Some tools offer filters that block suggestions matching public code, and some business plans include IP indemnity with conditions (for example, such filters must be on). Legal teams care about this; engineers should know the setting exists.</p>
  <p><b>Local and self-hosted options.</b> Open-weight models run on your own hardware or private cloud keep data in-house, at the cost of model quality, GPU spend and operations work. Some teams mix: local models for confidential code, hosted frontier models for everything else.</p>`,
  aiEra: `<p><b>What changed:</b> "can I use AI?" became "which data may go to which tool?". Security teams now publish AI policies the same way they publish cloud and open-source policies, and engineers are expected to know the data classes.</p>
  <p><b>Use AI as a partner:</b> ask an assistant to summarise a vendor's data-handling page into the five questions, then read the source sections it cites yourself; summaries of legal text often drop conditions such as "only on business plans".</p>
  <p><b>You still own:</b> not pasting secrets, knowing your company's data classes, and reporting a leak quickly (rotate first, explain later).</p>`,
  problems: [
    PC('Policy Checker: Which Items May Go to This Tool?', 'Medium', ['privacy', 'policy', 'data classes'], ['Stripe', 'Amazon', 'Microsoft'],
      `<p>Your team policy maps data classes to the <b>minimum</b> tool tier allowed. Tiers in order: <code>"personal"</code> &lt; <code>"business"</code> &lt; <code>"enterprise"</code> &lt; <code>"local"</code>. Minimums: <code>public</code> → personal; <code>internal</code> → business; <code>confidential</code> → enterprise; <code>regulated</code> → local; <code>secret</code> → never allowed. Write <code>blocked_items(items, tier)</code> that takes a list like <code>["internal:api.py", "secret:.env"]</code> (class, colon, name) and returns the <b>names</b> that must NOT be sent, in input order. An unknown class is treated as secret (fail closed).</p>`,
      `<p>0 ≤ items ≤ 1000; tier is one of the four strings; names contain no colon.</p>`,
      `<p><code>blocked_items(["public:README.md", "internal:api.py", "secret:.env"], "business")</code> → ${H.c('r', '[".env"]')}. With tier <code>"personal"</code> → <code>["api.py", ".env"]</code>.</p>`,
      `<p>A list of allowed pairs written by hand grows to 20 cases and misses one; ordering tiers as numbers makes the rule one comparison.</p>`,
      `def blocked_items(items, tier):
    # Fragile: hand-written pairs; forgets 'enterprise' and unknown classes.
    out = []
    for it in items:
        cls, name = it.split(":", 1)
        if cls == "secret" or (cls == "internal" and tier == "personal"):
            out.append(name)
    return out`,
      mc('Why fail closed on an unknown class?', ['It is faster', 'A typo or new class should never accidentally allow sensitive data out', 'Python needs it', 'To annoy users'], 1, 'Security defaults deny when unsure.'),
      hs('turn tiers into numbers 0..3 so "allowed" is one comparison.', 'store the minimum tier per class; use infinity (or a big number) for never.', 'split on the first colon only; unknown class → treat as never.'),
      `<p>Rank tiers 0-3. Map each class to the minimum rank (secret and unknown = never). An item is blocked when its minimum rank is greater than the tool's rank.</p>`,
      `NEVER = 99
TIER_RANK = {"personal": 0, "business": 1, "enterprise": 2, "local": 3}
MIN_TIER = {"public": 0, "internal": 1, "confidential": 2, "regulated": 3, "secret": NEVER}

def blocked_items(items, tier):
    """Return names whose data class is not allowed on this tool tier."""
    rank = TIER_RANK[tier]
    blocked = []
    for item in items:
        cls, name = item.split(":", 1)
        need = MIN_TIER.get(cls, NEVER)   # unknown class: fail closed
        if need > rank:
            blocked.append(name)
    return blocked`,
      `<p>O(n) time for n items, O(n) space for the output list.</p>`,
      { sig: 'string[] string -> string[]', fn: 'blockedItems', cases: [
        [[['public:README.md', 'internal:api.py', 'secret:.env'], 'business'], ['.env']],
        [[['public:README.md', 'internal:api.py', 'secret:.env'], 'personal'], ['api.py', '.env']],
        [[[], 'local'], []],
        [[['confidential:fraud.py', 'regulated:users.csv'], 'enterprise'], ['users.csv']],
        [[['confidential:fraud.py', 'regulated:users.csv'], 'local'], []],
        [[['secret:key.pem'], 'local'], ['key.pem']],
        [[['intrenal:typo.py', 'public:a.md'], 'local'], ['typo.py']],
        [[['internal:a.py', 'internal:b.py'], 'business'], []]
      ] },
      [
        { lang: 'java', code: `class Solution {
    static final int NEVER = 99;
    static final Map<String, Integer> TIER_RANK = Map.of("personal", 0, "business", 1, "enterprise", 2, "local", 3);
    static final Map<String, Integer> MIN_TIER = Map.of("public", 0, "internal", 1, "confidential", 2, "regulated", 3, "secret", NEVER);

    public List<String> blockedItems(String[] items, String tier) {
        Integer rank = TIER_RANK.get(tier);
        if (rank == null) throw new IllegalArgumentException("unknown tier: " + tier);
        List<String> blocked = new ArrayList<>();
        for (String item : items) {
            int colon = item.indexOf(':');
            if (colon < 0) throw new IllegalArgumentException("expected class:name, got " + item);
            String cls = item.substring(0, colon), name = item.substring(colon + 1);
            int need = MIN_TIER.getOrDefault(cls, NEVER);   // unknown class: fail closed
            if (need > rank) blocked.add(name);
        }
        return blocked;
    }
}` },
        { lang: 'js', code: `const NEVER = 99;
const TIER_RANK = { personal: 0, business: 1, enterprise: 2, local: 3 };
const MIN_TIER = { public: 0, internal: 1, confidential: 2, regulated: 3, secret: NEVER };

function blockedItems(items, tier) {
  if (!Object.prototype.hasOwnProperty.call(TIER_RANK, tier)) throw new Error("unknown tier: " + tier);
  const rank = TIER_RANK[tier];
  const blocked = [];
  for (const item of items) {
    const colon = item.indexOf(":");
    if (colon < 0) throw new Error("expected class:name, got " + item);
    const cls = item.slice(0, colon), name = item.slice(colon + 1);
    const need = Object.prototype.hasOwnProperty.call(MIN_TIER, cls) ? MIN_TIER[cls] : NEVER;  // unknown class: fail closed
    if (need > rank) blocked.push(name);
  }
  return blocked;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<string> blockedItems(const vector<string>& items, const string& tier) {
        const int NEVER = 99;
        static const map<string, int> TIER_RANK = {{"personal", 0}, {"business", 1}, {"enterprise", 2}, {"local", 3}};
        static const map<string, int> MIN_TIER = {{"public", 0}, {"internal", 1}, {"confidential", 2}, {"regulated", 3}, {"secret", NEVER}};
        int rank = TIER_RANK.at(tier);                  // unknown tier throws, like a KeyError
        vector<string> blocked;
        for (const string& item : items) {
            size_t colon = item.find(':');
            if (colon == string::npos) throw invalid_argument("expected class:name, got " + item);
            string cls = item.substr(0, colon), name = item.substr(colon + 1);
            auto it = MIN_TIER.find(cls);
            int need = it == MIN_TIER.end() ? NEVER : it->second;   // unknown class: fail closed
            if (need > rank) blocked.push_back(name);
        }
        return blocked;
    }
};` },
        { lang: 'csharp', code: `public class Solution {
    const int Never = 99;
    static readonly Dictionary<string, int> TierRank = new Dictionary<string, int> {
        { "personal", 0 }, { "business", 1 }, { "enterprise", 2 }, { "local", 3 } };
    static readonly Dictionary<string, int> MinTier = new Dictionary<string, int> {
        { "public", 0 }, { "internal", 1 }, { "confidential", 2 }, { "regulated", 3 }, { "secret", Never } };

    public List<string> BlockedItems(string[] items, string tier) {
        int rank = TierRank[tier];                       // unknown tier throws, like a KeyError
        var blocked = new List<string>();
        foreach (string item in items) {
            int colon = item.IndexOf(':');
            if (colon < 0) throw new ArgumentException("expected class:name, got " + item);
            string cls = item.Substring(0, colon), name = item.Substring(colon + 1);
            int need;
            if (!MinTier.TryGetValue(cls, out need)) need = Never;   // unknown class: fail closed
            if (need > rank) blocked.Add(name);
        }
        return blocked;
    }
}` }
      ],
      ['How would you enforce this automatically before a prompt is sent?', 'What about data classes inside one file?'])
  ]
});

// =====================================================================
topics.push({
  title: 'Choosing a Tool for Yourself and for a Team: The Weighted Decision Matrix',
  analogy: `<p>Buying a family car: one person wants speed, one wants boot space, the accountant wants low running costs, and the law says it must have seat belts. You do not pick the shiniest one; you list what matters, weigh it, rule out anything without seat belts, test-drive the shortlist and decide. Choosing a coding tool for a team is the same, and the test drive is a pilot on your real code.</p>`,
  explain: `<p><b>For yourself</b>, the question is mostly fit: your editor, your languages, how you like to work (terminal or IDE, sync or async), and what your employer allows. Try two tools for a week each on real tasks and keep notes.</p>
  <p><b>For a team</b>, use a short, honest process:</p>
  <ol>
  <li><b>Must-haves (gates)</b>: things that rule a tool out. Examples: approved data handling for your data classes, SSO and audit logs, works with your editor(s), allowed in your region. A tool that fails a gate is out, no matter its score.</li>
  <li><b>Weighted criteria</b>: for example code quality on your repo (30), workflow fit and ecosystem (20), cost at your usage (15), admin controls (15), model choice (10), learning curve (10). Weights must add up and should be agreed before scoring, so nobody tunes them to a favourite.</li>
  <li><b>Score with evidence</b>: 1-5 per criterion from a pilot of 2-4 weeks on real tickets, not demos.</li>
  <li><b>Decide and revisit</b>: pick, write down why, and re-check every 6-12 months, because the market moves.</li>
  </ol>
  ${H.table(['Criterion (weight)', 'Tool A', 'Tool B', 'Tool C'], [
    ['Gate: data policy OK?', 'yes', 'yes', '<span class="c-r">no</span>'],
    ['Quality on our repo (30)', '4', '5', '5'],
    ['Workflow fit (20)', '5', '3', '4'],
    ['Cost at our usage (15)', '3', '4', '5'],
    ['Admin controls (15)', '4', '4', '2'],
    ['Model choice (10)', '4', '3', '3'],
    ['Learning curve (10)', '4', '3', '4'],
    ['Weighted total', '<b>405</b>', '390', '(excluded)']
  ])}
  <p>Tool C has the best raw quality but is excluded by the gate. Tool A wins on fit. Many teams also allow a <b>second, complementary</b> tool (for example an IDE assistant for everyone plus a terminal or cloud agent for heavy users) instead of forcing one tool to do everything.</p>`,
  clues: [
    '"Pick a tool for our 40-person team" → gates first, then weighted criteria, then a pilot',
    '"Everyone has a favourite" → agree weights before scoring',
    '"Benchmarks say X is best" → public benchmarks are not your repo; pilot on real tickets',
    '"Half the team uses JetBrains, half VS Code" → editor coverage is a gate or a heavy weight',
    '"Must not lock us in" → weight open standards (MCP, repo instruction files, model choice)',
    '"We chose last year" → schedule a re-evaluation; the market has moved'
  ],
  code: { lang: 'python', run: true, title: 'Weighted decision matrix with must-have gates', code: `weights = {"quality": 30, "fit": 20, "cost": 15, "admin": 15, "models": 10, "learning": 10}
tools = {
    "A": {"gate": True,  "quality": 4, "fit": 5, "cost": 3, "admin": 4, "models": 4, "learning": 4},
    "B": {"gate": True,  "quality": 5, "fit": 3, "cost": 4, "admin": 4, "models": 3, "learning": 3},
    "C": {"gate": False, "quality": 5, "fit": 4, "cost": 5, "admin": 2, "models": 3, "learning": 4},
}
assert sum(weights.values()) == 100, "weights should add to 100"

def total(scores):
    return sum(weights[k] * scores[k] for k in weights)

ranked = sorted(((total(s), name) for name, s in tools.items() if s["gate"]), reverse=True)
for score, name in ranked:
    print(f"{name}: {score}")
excluded = [n for n, s in tools.items() if not s["gate"]]
print("excluded by gates:", excluded)
# Sensitivity check: does the winner change if quality weight moves +/-10?
for dq in (-10, 10):
    w2 = dict(weights, quality=weights["quality"] + dq, fit=weights["fit"] - dq)
    best = max((sum(w2[k] * s[k] for k in w2), n) for n, s in tools.items() if s["gate"])
    print(f"quality weight {w2['quality']}: winner {best[1]}")` },
  codeTitle: 'Decision matrix',
  viz: {
    title: 'Scoring three tools: gates, then weights',
    input: '30,20,15,15,10,10',
    inputLabel: 'weights: quality, fit, cost, admin, models, learning (sum 100)',
    gen: function (input) {
      var w = String(input).split(',').map(function (x) { return parseInt(x, 10); });
      if (w.length !== 6 || w.some(function (x) { return isNaN(x) || x < 0; })) throw new Error('Enter 6 non-negative weights, e.g. 30,20,15,15,10,10');
      var sum = w.reduce(function (a, b) { return a + b; }, 0);
      if (sum !== 100) throw new Error('Weights must add up to 100 (yours add to ' + sum + ')');
      var crit = ['quality', 'fit', 'cost', 'admin', 'models', 'learning'];
      var tools = [['A', true, [4, 5, 3, 4, 4, 4]], ['B', true, [5, 3, 4, 4, 3, 3]], ['C', false, [5, 4, 5, 2, 3, 4]]];
      var totals = [0, 0, 0], frames = [];
      frames.push({ narr: 'Step 1: <b>gates</b>. Tool C fails the data-policy gate, so it is out before any scoring. A high score cannot buy back a failed must-have.', parts: [{ type: 'table', label: 'Gates', columns: ['Tool', 'Data policy OK?'], rows: tools.map(function (t) { return [t[0], t[1] ? 'yes' : 'NO']; }), hl: { 2: 'bad' } }] });
      for (var c = 0; c < 6; c++) {
        for (var i = 0; i < 3; i++) totals[i] += w[c] * tools[i][2][c];
        frames.push({ narr: 'Add <b>' + crit[c] + '</b> (weight ' + w[c] + '): A gets ' + w[c] * tools[0][2][c] + ', B gets ' + w[c] * tools[1][2][c] + '.', parts: [{ type: 'bars', label: 'Running weighted totals (C shown greyed: excluded)', values: totals.slice(), idxLabels: ['A', 'B', 'C (out)'], hl: { 0: 'cur', 1: 'cur', 2: 'done' } }] });
      }
      var win = totals[0] > totals[1] ? 'A' : totals[1] > totals[0] ? 'B' : 'tie';
      frames.push({ narr: 'Result among tools that passed the gates: <b>' + win + '</b> (A ' + totals[0] + ', B ' + totals[1] + '). Try other weights to see if the decision is <b>robust</b>; if a small change flips it, the pilot evidence matters more than the matrix.', parts: [{ type: 'vars', label: 'Final', vals: { A: totals[0], B: totals[1], 'C (excluded)': totals[2], winner: win } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Solo developer choice', html: `<p>You use Neovim and the terminal, work on side projects, and like to delegate chores. A terminal agent plus an occasional cloud agent fits you; an IDE-only tool would fight your workflow. If your employer standardises on another tool, use theirs at work: <b>policy beats preference</b>.</p>` },
    { title: 'Startup of 8 vs bank of 800', html: `${H.table(['', 'Startup (8)', 'Bank (800)'], [['Top gate', 'none beyond basic privacy', 'enterprise data terms, SSO, audit, region'], ['Top weight', 'quality and speed', 'admin controls and compliance'], ['Cost model', 'per-seat with included usage', 'pooled enterprise usage with budgets'], ['Pilot', '1 week, everyone', '4 weeks, 2 teams, security sign-off']])}` },
    { title: 'A good pilot design', html: `<ul><li>Two tools, two similar teams, 3-4 weeks, real tickets.</li><li>Measure lead time, review time, change-failure rate and a short survey (see the measuring topic).</li><li>Collect cost per person from usage exports.</li><li>Write a one-page decision with the matrix, the evidence and the re-evaluation date.</li></ul>` }
  ],
  deepDive: `<p><b>Sensitivity analysis.</b> A matrix gives false precision. Change each weight by ±10 and see whether the winner changes. If it flips easily, the tools are close and you should decide on secondary factors (contract terms, team preference, migration cost) or allow both.</p>
  <p><b>Ecosystem fit is often the deciding factor.</b> If your work starts in GitHub issues and ends in pull requests, a cloud agent that lives there removes glue work. If your team relies on JetBrains refactorings and inspections, a JetBrains-native agent uses them. If your infrastructure is all AWS, Amazon's tools' integrations matter. Count integration work you would otherwise build.</p>
  <p><b>Model choice as risk management.</b> Tools that allow several model providers let you switch when one model is better for a language or task, or during an outage, and give negotiating power. Single-model tools can be more polished. Weight it by how much your work varies.</p>
  <p><b>Avoid lock-in cheaply.</b> Keep instructions in repo files, tools in MCP servers, specs and tests in the repo, and workflows in CI. Then switching tools means re-pointing, not rebuilding.</p>`,
  aiEra: `<p><b>What changed:</b> tool choice used to be a one-time IDE decision. Now it is a recurring procurement and platform decision with security, cost and productivity angles, and senior engineers are often asked to lead it.</p>
  <p><b>Use AI as a partner:</b> have an assistant draft criteria and pilot questions, and check your matrix code; then fill the scores yourself from pilot evidence. Do not let a model score vendors from memory.</p>
  <p><b>You still own:</b> the gates, the weights and the honesty to record that a decision was close.</p>`,
  problems: [
    PC('Weighted Decision Matrix With Gates', 'Medium', ['decision matrix', 'tool selection'], ['Atlassian', 'Shopify'],
      `<p>Write <code>pick_tool(weights, scores, gates)</code>. <code>weights</code> is a list of k integers; <code>scores</code> is a list of n tools, each a list of k scores (1-5); <code>gates</code> is a list of n integers (1 = passes all must-haves, 0 = fails). Return the index of the passing tool with the highest weighted sum; break ties by the lower index. If no tool passes, return <code>-1</code>.</p>`,
      `<p>1 ≤ k ≤ 10; 0 ≤ n ≤ 50; weights 0-100.</p>`,
      `<p>weights [30, 20], scores [[4, 5], [5, 3], [5, 5]], gates [1, 1, 0]: totals A = 220, B = 210, C excluded → ${H.c('g', '0')}.</p>`,
      `<p>Taking the maximum score over all tools first and checking the gate afterwards returns -1 or a failing tool when the top scorer is gated out.</p>`,
      `def pick_tool(weights, scores, gates):
    # Bug: picks the best overall, ignoring gates during the search.
    totals = [sum(w * s for w, s in zip(weights, row)) for row in scores]
    best = totals.index(max(totals))
    return best if gates[best] else -1`,
      mc('Tool C scores highest but fails the data-policy gate. What happens?', ['It wins anyway', 'It is excluded; the best passing tool wins', 'Its score is halved', 'The gate is ignored for high scores'], 1, 'Gates are must-haves.'),
      hs('filter by gate before comparing.', 'compute each total as the dot product of weights and scores.', 'use strict greater-than so the earlier index keeps ties; handle n = 0.'),
      `<p>Scan tools in order, skip those that fail the gate, compute the dot product and keep the first strictly-best index.</p>`,
      `def pick_tool(weights, scores, gates):
    """Index of the best gate-passing tool (lowest index on ties), or -1."""
    best_idx, best_total = -1, None
    for i, row in enumerate(scores):
        if not gates[i]:
            continue                                   # must-have failed: out
        total = sum(w * s for w, s in zip(weights, row))
        if best_total is None or total > best_total:   # strict: keeps lower index on ties
            best_idx, best_total = i, total
    return best_idx`,
      `<p>O(n·k) time for n tools and k criteria, O(1) extra space.</p>`,
      { sig: 'int[] int[][] int[] -> int', fn: 'pickTool', cases: [
        [[[30, 20], [[4, 5], [5, 3], [5, 5]], [1, 1, 0]], 0],
        [[[30, 20], [[4, 5], [5, 3], [5, 5]], [1, 1, 1]], 2],
        [[[10], [[3], [3]], [1, 1]], 0],
        [[[10], [[3], [3]], [0, 0]], -1],
        [[[10, 10], [], []], -1],
        [[[0, 100], [[5, 1], [1, 2]], [1, 1]], 1],
        [[[50, 50], [[1, 1], [2, 2], [5, 5]], [0, 1, 0]], 1],
        [[[30, 20, 15, 15, 10, 10], [[4, 5, 3, 4, 4, 4], [5, 3, 4, 4, 3, 3], [5, 4, 5, 2, 3, 4]], [1, 1, 0]], 0]
      ] },
      [
        { lang: 'java', code: `class Solution {
    public int pickTool(int[] weights, int[][] scores, int[] gates) {
        int bestIdx = -1;
        long bestTotal = 0;
        for (int i = 0; i < scores.length; i++) {
            if (gates[i] == 0) continue;                         // must-have failed: out
            long total = 0;
            int n = Math.min(weights.length, scores[i].length);  // zip stops at the shorter list
            for (int k = 0; k < n; k++) total += (long) weights[k] * scores[i][k];
            if (bestIdx == -1 || total > bestTotal) {            // strict: keeps lower index on ties
                bestIdx = i;
                bestTotal = total;
            }
        }
        return bestIdx;
    }
}` },
        { lang: 'js', code: `function pickTool(weights, scores, gates) {
  let bestIdx = -1, bestTotal = null;
  scores.forEach((row, i) => {
    if (!gates[i]) return;                                   // must-have failed: out
    let total = 0;
    const n = Math.min(weights.length, row.length);          // zip stops at the shorter list
    for (let k = 0; k < n; k++) total += weights[k] * row[k];
    if (bestTotal === null || total > bestTotal) {           // strict: keeps lower index on ties
      bestIdx = i;
      bestTotal = total;
    }
  });
  return bestIdx;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int pickTool(const vector<int>& weights, const vector<vector<int>>& scores, const vector<int>& gates) {
        int bestIdx = -1;
        long long bestTotal = 0;
        for (int i = 0; i < (int)scores.size(); i++) {
            if (!gates.at(i)) continue;                              // must-have failed: out
            long long total = 0;
            size_t n = min(weights.size(), scores[i].size());       // zip stops at the shorter list
            for (size_t k = 0; k < n; k++) total += (long long)weights[k] * scores[i][k];
            if (bestIdx == -1 || total > bestTotal) {                // strict: keeps lower index on ties
                bestIdx = i;
                bestTotal = total;
            }
        }
        return bestIdx;
    }
};` },
        { lang: 'csharp', code: `public class Solution {
    public int PickTool(int[] weights, int[][] scores, int[] gates) {
        int bestIdx = -1;
        long bestTotal = 0;
        for (int i = 0; i < scores.Length; i++) {
            if (gates[i] == 0) continue;                             // must-have failed: out
            long total = 0;
            int n = Math.Min(weights.Length, scores[i].Length);      // zip stops at the shorter list
            for (int k = 0; k < n; k++) total += (long)weights[k] * scores[i][k];
            if (bestIdx == -1 || total > bestTotal) {                // strict: keeps lower index on ties
                bestIdx = i;
                bestTotal = total;
            }
        }
        return bestIdx;
    }
}` }
      ],
      ['How would you add a sensitivity check that reports if the winner flips?', 'Should cost be a score or a gate?'])
  ]
});

// =====================================================================
topics.push({
  title: 'A Daily Workflow From Spec to Merged PR, Across Tools',
  analogy: `<p>A restaurant does not use one tool for everything: knives for prep, the oven for slow cooking, a thermometer to check, and the head chef tastes before a plate leaves. A good AI workflow is the same: a chat tool to sharpen the spec, a live agent for the tricky part, a background agent for slow chores, CI and an AI reviewer as thermometers, and <b>you</b> as the head chef at the pass.</p>`,
  explain: `<p>ai16 taught the habits inside a task (task cards, small diffs, spec first, reviewing AI code). Here we wire <b>several tools</b> into one day. A practical shape:</p>
  ${H.table(['Stage', 'Typical tool level', 'Your job'], [
    ['1. Clarify the ticket into a spec', 'chat (any assistant)', 'Ask it to list ambiguities; decide them yourself'],
    ['2. Plan and split', 'local agent in plan mode', 'Approve the plan; split into independent tasks'],
    ['3a. Hard or ambiguous slice', 'synchronous agent (IDE or terminal)', 'Steer live; keep diffs small'],
    ['3b. Clear, mechanical slices', 'asynchronous cloud agents, one branch each', 'Write precise task cards with done-conditions'],
    ['4. Verify', 'tests and CI; optional AI pre-review', 'Run tests, read the diff, check the failure patterns'],
    ['5. Review and merge', 'pull request, human reviewer, AI review comments as hints', 'A human approves; branch protection applies'],
    ['6. Learn', 'repo instruction file, MCP servers', 'Turn repeated corrections into rules or checks']
  ])}
  <p><b>Glue that makes multi-tool work:</b> the spec and tests live in the repo (any tool can read them); one shared instruction file (or one per tool, kept in sync) holds commands and rules; MCP servers give every tool the same access to your issue tracker and docs; and everything converges on the <b>pull request</b>, where CI and humans apply the same rules no matter which tool wrote the code.</p>
  <p><b>A sample day.</b> 9:00 turn two tickets into specs with a chat assistant. 9:30 delegate a dependency bump and a test-backfill to cloud agents. 9:40 work synchronously with an agent on the tricky feature. 12:00 review the two agent PRs (one good, one needs a re-run with a clearer card). 14:00 open your feature PR; an AI reviewer flags a missed null check, a teammate approves. 16:30 add one line to the instruction file about the mistake the agent repeated.</p>`,
  clues: [
    '"Walk me through how you ship a feature with AI tools" → spec → plan → sync/async split → verify → human review → merge → learn',
    '"We use three different tools" → converge on repo files, MCP and the pull request as the common ground',
    '"AI reviewer approved it" → AI review is a hint, not an approval; a human approves',
    '"Agent PR needs many fixes" → re-run with a better card instead of patching by hand',
    '"The same mistake keeps happening" → move it into the instruction file or a lint/CI check',
    '"Where do agents fit in CI?" → headless agents for well-defined jobs, never bypassing branch protection'
  ],
  code: { lang: 'text', title: 'Pull request template that works for human and agent PRs', code: `## What and why
<one paragraph, link to ticket/spec>

## How it was made
- [ ] Written by hand   - [ ] Local agent (sync)   - [ ] Cloud agent (async)
Tool/model (optional, if team policy asks): ______

## Evidence
- Tests added/changed: <names>
- Command run + result: <paste>
- Not verified / risks: <list honestly>

## Reviewer checklist
- [ ] Scope matches the ticket (no drive-by changes)
- [ ] Failure patterns checked (APIs exist, edges, errors, security)
- [ ] I can explain every changed line` },
  codeTitle: 'PR template',
  viz: {
    title: 'One feature, many tools: following the work to a merged PR',
    input: '2',
    inputLabel: 'Number of async side tasks (0-3)',
    gen: function (input) {
      var n = parseInt(String(input).trim(), 10);
      if (isNaN(n) || n < 0 || n > 3) throw new Error('Enter 0 to 3');
      var nodes = [bx('tic', 'Ticket', 6, 26, 12), bx('spec', 'Spec + tests', 24, 26, 16), bx('plan', 'Plan', 42, 26, 12), bx('sync', 'Sync agent', 60, 12, 16), bx('ci', 'CI + AI hints', 78, 26, 16), bx('hr', 'Human review', 78, 48, 18), bx('merge', 'Merged', 96, 48, 12)];
      var edges = [['tic', 'spec'], ['spec', 'plan'], ['plan', 'sync'], ['sync', 'ci'], ['ci', 'hr'], ['hr', 'merge']];
      for (var i = 0; i < n; i++) { nodes.push(bx('c' + i, 'Cloud agent ' + (i + 1), 60, 34 + i * 8, 18)); edges.push(['plan', 'c' + i]); edges.push(['c' + i, 'ci']); }
      var f = [];
      function fr(narr, hl, ehl) { return { narr: narr, parts: [{ type: 'graph', label: 'Spec to merge', directed: true, height: 64, nodes: nodes, edges: edges, hl: hl, ehl: ehl }] }; }
      f.push(fr('A vague <b>ticket</b> arrives.', { tic: 'cur' }, {}));
      f.push(fr('A chat assistant lists ambiguities; <b>you</b> decide them and write the <b>spec and acceptance tests</b>.', { spec: 'cur' }, { 'tic-spec': 'ok' }));
      f.push(fr('A local agent proposes a <b>plan</b>; you split it into one hard slice and ' + n + ' mechanical slice(s).', { plan: 'cur' }, { 'spec-plan': 'ok' }));
      f.push(fr('You work the hard slice <b>synchronously</b>, steering every few minutes.', { sync: 'cur' }, { 'plan-sync': 'ok' }));
      for (var k = 0; k < n; k++) { var h = {}; h['c' + k] = 'cur'; var e = {}; e['plan-c' + k] = 'ok'; f.push(fr('Mechanical slice ' + (k + 1) + ' goes to a <b>cloud agent</b> with a precise task card. It runs while you work.', h, e)); }
      var ehl = { 'sync-ci': 'ok' }; for (var j = 0; j < n; j++) ehl['c' + j + '-ci'] = 'ok';
      f.push(fr('Every branch, whoever wrote it, hits the same <b>CI</b>: tests, lint, security scan, plus optional AI review comments.', { ci: 'cur' }, ehl));
      f.push(fr('A <b>human</b> reviews and approves. AI comments are hints; approval is a person.', { hr: 'cur' }, { 'ci-hr': 'ok' }));
      f.push(fr('<b>Merged.</b> Last step: one repeated agent mistake becomes a rule in the instruction file.', { merge: 'ok' }, { 'hr-merge': 'ok' }));
      return f;
    }
  },
  examples: [
    { title: 'Mixing vendors without chaos', html: `<p>A team uses an IDE assistant for completions, a terminal agent for refactors, and a cloud agent for chores. Chaos is avoided because: tests and specs are in the repo, the instruction file is shared (and linked from each tool's config), MCP servers provide the same issue-tracker access, and all work merges through the same protected branch.</p>` },
    { title: 'When an async PR comes back wrong', html: `<p>The cloud agent "fixed" a flaky test by adding retries. Instead of patching the PR by hand, close it, improve the card ("do not add retries or sleeps; find the race; done when 200 repeated runs pass"), and re-run. Fixing the <b>input</b> teaches you and the instruction file; patching output teaches nobody.</p>` },
    { title: 'AI review as a second pair of eyes', html: `<p>An AI code reviewer on the PR flags: unused import, a missing null check, and a "possible SQL injection" that is actually a parameterised query. Accept the first two, reply to the third with why it is safe. AI review catches cheap issues early; it also produces false alarms, and it does not own the approval.</p>` }
  ],
  deepDive: `<p><b>Worktrees and branches.</b> Running a sync agent and several async ones on the same repo needs isolation: git worktrees locally, separate branches for cloud runs, and merging in sequence with a rebase and a full test run each time.</p>
  <p><b>Instruction-file drift across tools.</b> Different tools look for different file names. Keep one source of truth (for example <code>AGENTS.md</code>) and point the others at it or generate them, so rules do not diverge.</p>
  <p><b>Headless agents in CI.</b> Terminal agents and some IDE vendors' CLIs can run non-interactively: triage new issues, propose fixes for lint failures, write release notes. Treat them like any automation: least-privilege tokens, outputs as PRs or comments (never direct pushes to main), budgets, and logs.</p>
  <p><b>Review capacity is the bottleneck.</b> If agent output grows faster than review, queue time grows and quality drops. Limit work in progress (e.g. at most two open agent PRs per person), prefer small PRs, and route risky areas to code owners.</p>`,
  aiEra: `<p><b>What changed:</b> a day used to be mostly typing; now much of it is specifying, delegating, reviewing and merging. The engineer acts as a small tech lead for a set of agents.</p>
  <p><b>Use AI as a partner:</b> at the end of the day ask an assistant to summarise which agent tasks needed rework and why, from your PR comments; use it to improve tomorrow's task cards.</p>
  <p><b>You still own:</b> the spec, the split, the merge decision and the learning loop. Do not let the number of open agent tasks exceed what you can honestly review.</p>`,
  problems: [
    P('Design Your Multi-Tool Day', 'Medium', ['workflow', 'sync vs async', 'review'], ['GitHub', 'Shopify', 'Atlassian'],
      `<p>You have one day and three tickets: (1) add CSV export to the reports page (clear spec), (2) upgrade the test framework across 30 test files (mechanical), (3) investigate why one customer sees duplicated invoices (unclear cause). You have an IDE assistant, a terminal agent and a cloud agent. Plan the day: which tool and mode per ticket, in what order, what you prepare before delegating, and where the human gates are.</p>`,
      `<p>Shape: ${H.c('b', 'delegate (2) early, work (3) live, (1) sync or async depending on spec quality')}.</p>`,
      `<p>Throwing all three at cloud agents at 9:00 gives you three PRs at 11:00, one of which (the invoice bug) is a guess, and a review pile-up.</p>`,
      mc('Which ticket should NOT be fire-and-forget?', ['The test-framework upgrade', 'The duplicated invoices investigation', 'The CSV export with a clear spec', 'None'], 1, 'Unknown cause plus money: investigate live.'),
      hs('rank tickets by clarity and risk.', 'start long async jobs first so they finish while you work.', 'put a human gate before every merge and note what evidence you need.'),
      `<p>Plan. 9:00 prepare ticket 2: check the test command runs in the sandbox, write a card ("migrate tests from framework A to B following the official guide; no behaviour change; done when the full suite passes and the count of tests is unchanged"), delegate to a cloud agent, ideally in two PRs of 15 files to keep review small. 9:20 ticket 1: write the spec and three acceptance tests (header row, comma and quote escaping, empty report), then either delegate to a second cloud agent or do it synchronously in the IDE if the UI part needs taste. 9:40 ticket 3, synchronous: reproduce with the customer's data in a safe environment, use the terminal agent to read logs and code paths, form hypotheses (retry without idempotency key, double webhook delivery), write a failing test, fix in a small diff. Money logic gets a second human reviewer. 13:00 review the agent PRs: check test counts did not drop, no assertions were weakened, the export escapes correctly. Re-run with a better card if needed instead of hand-patching. 16:00 merge in sequence with rebase and tests each time; add any repeated mistake to the instruction file. Gates: human approval on every PR; code owner on billing.</p>`,
      `<p>Three tickets, one engineer, two agents; review time is the constraint.</p>`, ['What if the cloud agent cannot run the tests?', 'How do you report this day in standup?'])
  ]
});

// =====================================================================
topics.push({
  title: 'Measuring Real Productivity, the Evidence, and What Is Allowed in Interviews',
  analogy: `<p>A runner with new shoes says "I feel faster". The stopwatch might disagree. And finishing the race fast does not count if you cut across the field. Measuring AI productivity needs a stopwatch (delivery metrics), a referee (quality and defects) and fair comparison (same course, before and after). Interviews are the same race with explicit rules about which shoes you may wear.</p>`,
  explain: `<p><b>Why feelings are not enough.</b> In a 2025 randomised study by METR, experienced open-source developers working on their own mature repositories expected AI tools to speed them up by about a quarter; measured, they took about 19% <i>longer</i> with the early-2025 tools, yet afterwards still believed they had been faster. METR's later follow-up work pointed to possible speed-ups with newer tools, but said the size was hard to measure reliably. Industry surveys such as Google's DORA research have reported that AI adoption raises individual output and satisfaction while team-level delivery stability can suffer if review and testing do not keep up. The honest summary: <b>gains are real for some tasks and people, smaller or negative for others, and you must measure your own case.</b></p>
  <p><b>What to measure</b> (team level, before vs after, ideally with a comparison group):</p>
  ${H.table(['Dimension', 'Metric', 'Trap'], [
    ['Speed', 'Lead time from first commit to production; PR cycle time; review wait time', 'Lines of code or number of PRs alone reward bloat'],
    ['Throughput', 'Merged PRs or completed tickets per engineer-week', 'Splitting work into tiny PRs inflates it'],
    ['Quality', 'Change-failure rate, reverts, escaped defects per merged PR, incidents', 'Ignoring quality turns speed into future rework'],
    ['Cost', 'Tool spend per merged PR; review hours per PR', 'Counting licences, not review time'],
    ['People', 'Short survey: flow, friction, learning, trust in output', 'Surveys alone measure feelings, not output']
  ])}
  <p>Never use "acceptance rate of suggestions" or "lines generated" as the headline: they measure tool activity, not value.</p>
  <p><b>Interviews: what is allowed.</b> Rules differ by company and round, and they change, so <b>ask the recruiter in writing</b>. Common patterns in 2026: live coding and phone screens often ban AI assistants; some companies run AI-enabled rounds where you are expected to use a provided tool and are graded on how you direct and verify it; take-homes vary and often require disclosure. Using a hidden assistant when it is not allowed is cheating and can end a candidacy or an offer. When a tool is allowed, use the one provided or approved, say what you are doing, and keep ownership: clarify, test, explain every line. (ai16 covers how to talk about your AI use; here the point is: <b>the tool rules are part of the interview spec</b>.)</p>`,
  clues: [
    '"Is AI making us faster?" → measure lead time and change-failure rate before vs after, not feelings or lines of code',
    '"Our acceptance rate is 40%" → activity metric; ask what happened to delivery and defects',
    '"Throughput up, bugs up" → net effect depends on rework cost; look at both together',
    '"Developers say they are 20% faster" → perception can differ from measurement (the METR result)',
    '"Can I use Copilot in the interview?" → ask the recruiter; rules differ per round',
    '"AI-enabled round" → graded on directing, verifying and explaining, not on typing speed'
  ],
  code: { lang: 'python', run: true, title: 'Before vs after: throughput AND defect rate together', code: `# Two 6-week periods for one team (made-up numbers for practice).
before = {"merged_prs": 120, "defects": 6, "lead_time_days": [3, 4, 2, 5, 3, 6, 2, 4]}
after  = {"merged_prs": 156, "defects": 13, "lead_time_days": [2, 3, 2, 4, 2, 3, 2, 3]}

def per_100(d):
    return 100 * d["defects"] / d["merged_prs"]

def median(xs):
    s = sorted(xs); n = len(s)
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2

for name, d in (("before", before), ("after", after)):
    print(f"{name:>6}: PRs={d['merged_prs']:>4}  defects/100 PRs={per_100(d):5.2f}  median lead time={median(d['lead_time_days'])} days")

change = (after["merged_prs"] - before["merged_prs"]) / before["merged_prs"]
print(f"throughput change: {change:+.0%}")
print("verdict: mixed - faster and more output, but defect rate rose; check review depth and tests")` },
  codeTitle: 'Productivity comparison',
  viz: {
    title: 'Throughput vs quality: reading a before/after pilot',
    input: '120,6,156,13',
    inputLabel: 'PRs before, defects before, PRs after, defects after',
    gen: function (input) {
      var a = String(input).split(',').map(function (x) { return parseInt(x, 10); });
      if (a.length !== 4 || a.some(function (x) { return isNaN(x) || x < 0; }) || a[0] === 0 || a[2] === 0) throw new Error('Format: PRs before, defects before, PRs after, defects after (PR counts > 0)');
      var rb = 100 * a[1] / a[0], ra = 100 * a[3] / a[2];
      var f = [];
      f.push({ narr: 'Before the tool: <b>' + a[0] + '</b> merged PRs and ' + a[1] + ' escaped defects.', parts: [{ type: 'bars', label: 'Merged PRs', values: [a[0]], idxLabels: ['before'], hl: { 0: 'cur' } }] });
      f.push({ narr: 'After: <b>' + a[2] + '</b> merged PRs. Throughput change ' + Math.round(100 * (a[2] - a[0]) / a[0]) + '%. Many reports stop here. Do not.', parts: [{ type: 'bars', label: 'Merged PRs', values: [a[0], a[2]], idxLabels: ['before', 'after'], hl: { 1: a[2] >= a[0] ? 'ok' : 'bad' } }] });
      f.push({ narr: 'Now quality: defects per 100 PRs went from <b>' + rb.toFixed(1) + '</b> to <b>' + ra.toFixed(1) + '</b>.', parts: [{ type: 'bars', label: 'Defects per 100 PRs', values: [Math.round(rb * 10) / 10, Math.round(ra * 10) / 10], idxLabels: ['before', 'after'], hl: { 1: ra <= rb ? 'ok' : 'bad' } }] });
      var up = a[2] > a[0], worse = ra > rb;
      var v = up && !worse ? 'better' : !up && worse ? 'worse' : (a[2] === a[0] && ra === rb) ? 'same' : 'mixed';
      f.push({ narr: 'Verdict: <b>' + v + '</b>. ' + (v === 'mixed' ? 'Speed and quality moved in different directions: estimate rework cost and fix review/testing before scaling.' : v === 'better' ? 'More output without a worse defect rate. Still check lead time and the survey.' : v === 'worse' ? 'Less output and worse quality: stop and investigate.' : 'No change: the tool may not suit this work, or the pilot is too short.'), parts: [{ type: 'vars', label: 'Summary', vals: { 'PRs before': a[0], 'PRs after': a[2], 'defects/100 before': rb.toFixed(1), 'defects/100 after': ra.toFixed(1), verdict: v } }] });
      f.push({ narr: 'Remember confounders: a holiday, a big launch or a new teammate can move these numbers too. Compare with a control team or a longer baseline when you can.', parts: [{ type: 'text', label: 'Checklist', html: 'Same team? Same kind of work? Same season? Enough weeks? Defects counted the same way?' }] });
      return f;
    }
  },
  examples: [
    { title: 'The vanity dashboard', html: `<p>A vendor dashboard shows "35% of code written by AI" and a high suggestion acceptance rate. Leadership asks if it is working. Better answer: "Lead time dropped from 4 to 3 days, change-failure rate stayed flat, review wait time rose, so we are adding reviewer capacity." Activity numbers are inputs; delivery and quality are outcomes.</p>` },
    { title: 'A fair pilot', html: `<ul><li>Baseline 6 weeks before rollout.</li><li>Two similar teams; one gets the tool first (or randomise by ticket).</li><li>Same metrics, same definitions.</li><li>Survey at start and end.</li><li>Report both speed and quality, plus cost per merged PR.</li></ul>` },
    { title: 'Interview rules table', html: `${H.table(['Round', 'Common rule (always confirm)', 'What they grade'], [['Phone screen / live coding', 'often no AI', 'reasoning, fundamentals, communication'], ['AI-enabled pairing round', 'provided tool expected', 'directing, verifying, explaining, catching AI mistakes'], ['Take-home', 'varies; disclosure often required', 'quality plus your walkthrough'], ['System design', 'usually no AI', 'trade-offs and depth']])}` }
  ],
  deepDive: `<p><b>Why studies disagree.</b> Results depend on task type (greenfield boilerplate vs mature, complex codebases), developer experience with the codebase and with the tools, tool generation (2024 vs 2026 agents), and what is measured (task time, PR count, delivery stability). Lab tasks favour AI; long-lived repos with high quality bars show smaller or negative effects. Read the setup before quoting a number.</p>
  <p><b>Goodhart's law.</b> Any metric that becomes a target gets gamed: PR counts rise by splitting PRs, "time to first commit" falls by committing earlier. Use a <b>balanced set</b> (speed, quality, people) and keep metrics at team level; individual leaderboards of AI usage damage trust and quality.</p>
  <p><b>Rework is the hidden tax.</b> If AI raises throughput by 30% but defects double, the net depends on the cost of a defect. A simple model: net value = PRs × value per PR − defects × cost per defect. Even rough numbers make the trade-off visible.</p>
  <p><b>Interview integrity in practice.</b> Some companies use proctoring or ask follow-up questions that reveal unearned answers. The safest strategy is also the honest one: follow the stated rules, ask when unclear, and practise both AI-off and AI-on so you are strong either way.</p>`,
  aiEra: `<p><b>What changed:</b> "AI productivity" is now a board-level question, and engineers are asked to justify tool spend with data. Being the person who can design a fair measurement is valuable.</p>
  <p><b>Use AI as a partner:</b> let an assistant write the SQL or script that pulls PR and incident data from your systems, then spot-check the numbers on a few PRs by hand before presenting.</p>
  <p><b>You still own:</b> metric definitions, honest reporting of mixed results, and following interview tool rules exactly.</p>`,
  problems: [
    PC('Before/After Verdict: Throughput and Defect Rate', 'Medium', ['productivity', 'metrics'], ['Google', 'Microsoft', 'Meta'],
      `<p>Write <code>verdict(prs_before, defects_before, prs_after, defects_after)</code>. Throughput = merged PRs; defect rate = defects ÷ PRs. Return <code>"better"</code> if PRs rose and the defect rate did not rise; <code>"worse"</code> if PRs did not rise and the defect rate rose; <code>"same"</code> if PRs and rate are both unchanged; otherwise <code>"mixed"</code>. Compare rates exactly using cross-multiplication (no floats).</p>`,
      `<p>1 ≤ PR counts ≤ 10<sup>6</sup>; 0 ≤ defects ≤ 10<sup>6</sup>.</p>`,
      `<p><code>verdict(120, 6, 156, 13)</code>: PRs up 30%, rate 5% → 8.3% ⇒ ${H.c('y', '"mixed"')}. <code>verdict(100, 5, 120, 6)</code>: rate 5% → 5% and PRs up ⇒ ${H.c('g', '"better"')}.</p>`,
      `<p>Looking only at PR counts calls (120, 6, 156, 13) a win and hides that defects more than doubled.</p>`,
      `def verdict(pb, db, pa, da):
    # Speed only: ignores quality entirely.
    return "better" if pa > pb else "worse"`,
      mc('Why cross-multiply instead of dividing?', ['It is shorter', 'Integer comparison is exact; float division can make equal rates differ slightly', 'Division is not allowed in Python', 'It changes the result'], 1, 'da/pa vs db/pb compares as da*pb vs db*pa for positive counts.'),
      hs('compute two booleans: did throughput rise, did the rate rise.', 'rate_after > rate_before ⟺ da × pb > db × pa.', 'check "same" (both unchanged) before falling through to "mixed".'),
      `<p>Compare throughput directly and rates by cross-multiplication. Then map the four combinations, handling the all-unchanged case explicitly.</p>`,
      `def verdict(pb, db, pa, da):
    """Classify a before/after pilot by throughput and defect rate."""
    prs_up = pa > pb
    # rate_after > rate_before  <=>  da/pa > db/pb  <=>  da*pb > db*pa  (counts > 0)
    rate_up = da * pb > db * pa
    rate_same = da * pb == db * pa
    if prs_up and not rate_up:
        return "better"
    if not prs_up and rate_up:
        return "worse"
    if pa == pb and rate_same:
        return "same"
    return "mixed"`,
      `<p>O(1) time and O(1) extra space: a fixed number of comparisons.</p>`,
      { sig: 'int int int int -> string', fn: 'verdict', cases: [
        [[120, 6, 156, 13], 'mixed'], [[100, 5, 120, 6], 'better'], [[100, 5, 90, 9], 'worse'], [[100, 5, 100, 5], 'same'],
        [[100, 5, 90, 2], 'mixed'], [[100, 5, 100, 8], 'worse'], [[100, 5, 100, 2], 'mixed'], [[1, 0, 2, 0], 'better']
      ] },
      [
        { lang: 'java', code: `class Solution {
    public String verdict(int pb, int db, int pa, int da) {
        boolean prsUp = pa > pb;
        // rate_after > rate_before  <=>  da*pb > db*pa  (counts > 0); long avoids overflow
        boolean rateUp = (long) da * pb > (long) db * pa;
        boolean rateSame = (long) da * pb == (long) db * pa;
        if (prsUp && !rateUp) return "better";
        if (!prsUp && rateUp) return "worse";
        if (pa == pb && rateSame) return "same";
        return "mixed";
    }
}` },
        { lang: 'js', code: `function verdict(pb, db, pa, da) {
  const prsUp = pa > pb;
  // rate_after > rate_before  <=>  da*pb > db*pa  (counts > 0)
  const rateUp = da * pb > db * pa;
  const rateSame = da * pb === db * pa;
  if (prsUp && !rateUp) return "better";
  if (!prsUp && rateUp) return "worse";
  if (pa === pb && rateSame) return "same";
  return "mixed";
}` },
        { lang: 'cpp', code: `class Solution {
public:
    string verdict(int pb, int db, int pa, int da) {
        bool prsUp = pa > pb;
        // rate_after > rate_before  <=>  da*pb > db*pa  (counts > 0); long long avoids overflow
        bool rateUp = (long long)da * pb > (long long)db * pa;
        bool rateSame = (long long)da * pb == (long long)db * pa;
        if (prsUp && !rateUp) return "better";
        if (!prsUp && rateUp) return "worse";
        if (pa == pb && rateSame) return "same";
        return "mixed";
    }
};` },
        { lang: 'csharp', code: `public class Solution {
    public string Verdict(int pb, int db, int pa, int da) {
        bool prsUp = pa > pb;
        // rate_after > rate_before  <=>  da*pb > db*pa  (counts > 0); long avoids overflow
        bool rateUp = (long)da * pb > (long)db * pa;
        bool rateSame = (long)da * pb == (long)db * pa;
        if (prsUp && !rateUp) return "better";
        if (!prsUp && rateUp) return "worse";
        if (pa == pb && rateSame) return "same";
        return "mixed";
    }
}` }
      ],
      ['How would you add lead time as a third signal?', 'What confounders would you control for?'])
  ]
});

// =====================================================================
// PRACTICE ARENA (Easy -> Medium -> Hard)
practice.push(PC('Break-Even Volume for a Seat', 'Easy', ['cost model', 'break-even'], ['Amazon', 'Microsoft'],
  `<p>A seat costs <code>fee</code> cents a month (assume its allowance covers your usage). Pay-as-you-go costs <code>payg</code> cents per task. Write <code>break_even_tasks(fee, payg)</code>: the smallest whole number of tasks t for which pay-as-you-go costs at least as much as the seat (<code>t * payg >= fee</code>). If <code>payg</code> is 0, pay-go is never more expensive: return <code>-1</code>.</p>`,
  `<p>0 ≤ fee ≤ 10<sup>7</sup>; 0 ≤ payg ≤ 10<sup>6</sup>. Integers.</p>`,
  `<p><code>break_even_tasks(4000, 60)</code> → ${H.c('g', '67')}: 66 × 60 = 3960 is below 4000, 67 × 60 = 4020 is not.</p>`,
  `<p>Looping t = 0, 1, 2, ... works but takes up to 10<sup>7</sup> steps; one ceiling division does it at once.</p>`,
  `def break_even_tasks(fee, payg):
    if payg == 0:
        return -1
    t = 0
    while t * payg < fee:     # slow linear search
        t += 1
    return t`,
  mc('What does 4000 / 60 = 66.67 tell you?', ['Answer is 66', 'Round up: you need 67 whole tasks', 'Round to nearest: 67 by luck only', 'It is meaningless'], 1, 'Whole tasks: take the ceiling.'),
  hs('you need the ceiling of fee ÷ payg.', 'integer ceiling without floats: (fee + payg - 1) // payg, or -(-fee // payg).', 'edge cases: fee 0 gives 0 tasks; payg 0 means it never catches up, so -1.'),
  `<p>Ceiling division in integers: <code>-(-fee // payg)</code>. Guard <code>payg == 0</code> first.</p>`,
  `def break_even_tasks(fee, payg):
    """Smallest t with t * payg >= fee, or -1 if pay-go never catches up."""
    if payg == 0:
        return -1
    return -(-fee // payg)     # integer ceiling, no float rounding`,
  `<p>O(1) time and O(1) extra space: a fixed number of comparisons.</p>`,
  { sig: 'int int -> int', fn: 'breakEvenTasks', cases: [
    [[4000, 60], 67], [[3000, 60], 50], [[0, 60], 0], [[100, 0], -1], [[1, 1000], 1], [[10000000, 1], 10000000], [[59, 60], 1], [[0, 0], -1]
  ] },
  [
    { lang: 'java', code: `class Solution {
    public int breakEvenTasks(int fee, int payg) {
        if (payg == 0) return -1;                  // pay-go never catches up
        return -Math.floorDiv(-fee, payg);         // integer ceiling, same as Python's -(-fee // payg)
    }
}` },
    { lang: 'js', code: `function breakEvenTasks(fee, payg) {
  if (payg === 0) return -1;                   // pay-go never catches up
  return -Math.floor(-fee / payg) || 0;        // integer ceiling; || 0 turns -0 into 0
}` },
    { lang: 'cpp', code: `class Solution {
public:
    int breakEvenTasks(int fee, int payg) {
        if (payg == 0) return -1;                  // pay-go never catches up
        // C++ / truncates toward zero; fix it up to Python's floor division, then negate for the ceiling.
        int q = -fee / payg;
        if ((-fee % payg != 0) && ((-fee < 0) != (payg < 0))) q--;
        return -q;
    }
};` },
    { lang: 'csharp', code: `public class Solution {
    public int BreakEvenTasks(int fee, int payg) {
        if (payg == 0) return -1;                  // pay-go never catches up
        // C# / truncates toward zero; fix it up to Python's floor division, then negate for the ceiling.
        int q = -fee / payg;
        if ((-fee % payg != 0) && ((-fee < 0) != (payg < 0))) q--;
        return -q;
    }
}` }
  ],
  ['How does overage above an allowance change the curve?']));

practice.push(P('Five Questions for a Vendor', 'Easy', ['privacy', 'procurement'], ['Stripe', 'Atlassian'],
  `<p>Security asks you to send one email to a coding-tool vendor before a pilot. Write the five questions you would ask about data handling and admin control, and for each, the answer that would make you comfortable.</p>`,
  `<p>Example: "Is our code used for training on the business plan?" Comfortable answer: ${H.c('g', 'No, contractually, documented in the DPA.')}</p>`,
  `<p>Asking "is it secure?" gets a marketing answer you cannot verify.</p>`,
  mc('Which question is most specific and checkable?', ['Is it secure?', 'What is the retention period for prompts, outputs and cloud-agent workspaces on the business plan, and where is it documented?', 'Do you care about privacy?', 'Is it enterprise-ready?'], 1, 'Specific, plan-scoped, with a document reference.'),
  hs('training, retention, location, control, legal.', 'scope each question to the plan you would buy.', 'ask where each answer is documented.'),
  `<p>1) Training: is customer code or prompts used to train models on the plan we would buy? Comfortable: no, stated in contract terms. 2) Retention: how long are prompts, outputs and cloud-agent workspaces kept, and are reduced or zero-retention options available? Comfortable: short, documented, configurable. 3) Location and sub-processors: which model providers and regions process our data? Comfortable: a published sub-processor list and region options matching our rules. 4) Admin controls: SSO, user provisioning, model allow-list, content exclusion for paths, feature toggles (e.g. cloud agent on or off), usage budgets and audit log export? Comfortable: all available on our tier. 5) Legal: data processing agreement, security certifications and IP indemnity terms with any conditions. Comfortable: signed DPA, current reports, clear indemnity conditions. Ask for documentation links for every answer.</p>`,
  `<p>One email, one week.</p>`, ['What would make you stop the pilot?']));

practice.push(P('Sort Six Tasks Into Sync and Async', 'Easy', ['sync vs async', 'triage'], ['GitHub', 'Google'],
  `<p>Classify each as synchronous or asynchronous and say why: (a) bump a logging library minor version, (b) design a new caching layer, (c) add docstrings to a utilities module, (d) debug intermittent 502s in production, (e) convert 40 test files to a new assertion style, (f) change how refunds are rounded.</p>`,
  `<p>${H.c('g', '(a) async')}: mechanical, tests decide done.</p>`,
  `<p>Delegating everything async produces a guess at the 502s and an unreviewed money change.</p>`,
  mc('Which of these must stay synchronous?', ['Docstrings', 'Refund rounding change', 'Minor version bump', 'Assertion style conversion'], 1, 'Money rules need human judgment and careful review.'),
  hs('ask first: can tests or a single command define done?', 'ask: what does a silent mistake cost?', 'ask: is judgment or exploration needed?'),
  `<p>(a) Async: mechanical, reversible, CI decides. (b) Sync: design needs judgment and discussion; use an agent to explore options live. (c) Async: low risk, easy to review; ask it to describe why, not just what. (d) Sync: unknown cause, production, needs hypotheses and live data; an agent can help read logs but you steer. (e) Async: mechanical, tests confirm behaviour unchanged; check test count does not drop. (f) Sync: money, policy decision, needs spec with examples and a second reviewer. The pattern: clear plus low-risk plus checkable goes async.</p>`,
  `<p>Five minutes of triage saves hours of rework.</p>`, ['How would you split (e) for review?']));

practice.push(P('Pick a Stack for a 12-Person Startup', 'Medium', ['tool selection', 'team'], ['Shopify', 'GitHub'],
  `<p>A 12-person startup: code on GitHub, mostly VS Code with two people on JetBrains IDEs, TypeScript and Python, no regulated data yet, tight budget, wants agents for chores. Recommend a tool stack, the cost model, the gates you checked, and how you will re-evaluate.</p>`,
  `<p>Typical answer shape: ${H.c('b', 'one main assistant for everyone + one agent surface for heavy users, chosen after a 2-week pilot')}.</p>`,
  `<p>Choosing by whichever tool the loudest engineer likes ignores the JetBrains users and cost.</p>`,
  mc('What is the first thing to check?', ['Which has the best logo', 'Gates: business-plan data terms and support for both editors', 'Benchmark leaderboard', 'Price only'], 1, 'Gates first, then scoring.'),
  hs('list gates: data terms, editors, GitHub integration.', 'pick a cost model that fits skewed usage.', 'pilot on real tickets and write a re-evaluation date.'),
  `<p>Gates: business-plan terms with no training on code; works in both VS Code and JetBrains IDEs; integrates with GitHub pull requests. Candidates: GitHub Copilot (editor coverage including JetBrains, cloud coding agent from issues to PRs, PR review, admin controls on business plans), Cursor (strong agentic editor, but JetBrains users would need to switch editors), and a terminal agent such as Claude Code, Codex or Gemini CLI for heavy users regardless of editor. Recommendation: pilot two options for two weeks on real tickets: (A) one assistant across both editors plus its cloud agent; (B) the same assistant plus a terminal agent for the 3-4 heaviest users. Cost: business seats with included usage and an org budget; pay-as-you-go or a higher tier only for heavy users. Measure lead time, review time, defects and spend per merged PR. Keep instructions in an AGENTS.md-style file and tools behind MCP so switching is cheap. Re-evaluate in six months or when a vendor changes pricing. Check current plan pages before buying; do not rely on remembered prices.</p>`,
  `<p>Two-week pilot, one-page decision.</p>`, ['What changes if they start handling health data?']));

practice.push(PC('Per-Seat vs Pooled Usage for a Team', 'Medium', ['cost model', 'team'], ['Microsoft', 'Atlassian'],
  `<p>Each person has a monthly usage in tasks (<code>usages</code>). Every seat costs <code>fee</code> cents and includes <code>inc</code> tasks; extra tasks cost <code>over</code> cents each. <b>Per-seat</b> billing applies the allowance per person. <b>Pooled</b> billing adds all allowances into one pool for the team. Write <code>team_costs(usages, inc, fee, over)</code> returning <code>[per_seat_total, pooled_total]</code>.</p>`,
  `<p>0 ≤ people ≤ 10<sup>4</sup>; all values are non-negative integers.</p>`,
  `<p>usages [10, 10, 300], inc 100, fee 1000, over 10: per-seat = 3000 + 200 × 10 = ${H.c('r', '5000')}; pooled = 3000 + max(0, 320 − 300) × 10 = ${H.c('g', '3200')}.</p>`,
  `<p>Charging overage on the team average hides the heavy user under per-seat billing and gets both totals wrong.</p>`,
  `def team_costs(usages, inc, fee, over):
    # Wrong: uses the average for both models.
    n = len(usages)
    avg = sum(usages) / n if n else 0
    each = fee + max(0, avg - inc) * over
    return [int(each * n), int(each * n)]`,
  mc('Why does pooling help skewed teams?', ['It is always cheaper per seat', 'Light users\' unused allowance covers heavy users\' extra', 'It removes the fee', 'It lowers model prices'], 1, 'Unused allowance is shared instead of wasted.'),
  hs('per-seat: sum each person\'s own fee plus overage.', 'pooled: one overage on total usage minus total allowance.', 'an empty team costs nothing, so it gives [0, 0].'),
  `<p>Per-seat: add <code>fee + max(0, u - inc) * over</code> for each person. Pooled: <code>n * fee + max(0, sum - n * inc) * over</code>. Pooled is never more than per-seat.</p>`,
  `def team_costs(usages, inc, fee, over):
    """[per-seat total, pooled total] in cents."""
    n = len(usages)
    per_seat = sum(fee + max(0, u - inc) * over for u in usages)
    pooled = n * fee + max(0, sum(usages) - n * inc) * over
    return [per_seat, pooled]`,
  `<p>O(n) time for n people, O(1) extra space.</p>`,
  { sig: 'int[] int int int -> int[]', fn: 'teamCosts', cases: [
    [[[10, 10, 300], 100, 1000, 10], [5000, 3200]], [[[], 100, 1000, 10], [0, 0]], [[[100, 100], 100, 1000, 10], [2000, 2000]],
    [[[0], 0, 1000, 10], [1000, 1000]], [[[150, 50], 100, 500, 2], [1100, 1000]], [[[500, 500], 100, 0, 1], [800, 800]],
    [[[0, 0, 0, 1000], 10, 100, 5], [5350, 5200]]
  ] },
  [
    { lang: 'java', code: `class Solution {
    public int[] teamCosts(int[] usages, int inc, int fee, int over) {
        int n = usages.length;
        long perSeat = 0, total = 0;
        for (int u : usages) {
            perSeat += fee + (long) Math.max(0, u - inc) * over;   // each seat pays its own overage
            total += u;
        }
        long pooled = (long) n * fee + Math.max(0L, total - (long) n * inc) * over;  // one shared allowance
        return new int[] {(int) perSeat, (int) pooled};
    }
}` },
    { lang: 'js', code: `function teamCosts(usages, inc, fee, over) {
  const n = usages.length;
  let perSeat = 0, total = 0;
  for (const u of usages) {
    perSeat += fee + Math.max(0, u - inc) * over;            // each seat pays its own overage
    total += u;
  }
  const pooled = n * fee + Math.max(0, total - n * inc) * over;  // one shared allowance
  return [perSeat, pooled];
}` },
    { lang: 'cpp', code: `class Solution {
public:
    vector<int> teamCosts(const vector<int>& usages, int inc, int fee, int over) {
        long long n = usages.size(), perSeat = 0, total = 0;
        for (int u : usages) {
            perSeat += fee + (long long)max(0, u - inc) * over;   // each seat pays its own overage
            total += u;
        }
        long long pooled = n * fee + max(0LL, total - n * inc) * over;  // one shared allowance
        return {(int)perSeat, (int)pooled};
    }
};` },
    { lang: 'csharp', code: `public class Solution {
    public int[] TeamCosts(int[] usages, int inc, int fee, int over) {
        long n = usages.Length, perSeat = 0, total = 0;
        foreach (int u in usages) {
            perSeat += fee + (long)Math.Max(0, u - inc) * over;   // each seat pays its own overage
            total += u;
        }
        long pooled = n * fee + Math.Max(0L, total - n * inc) * over;  // one shared allowance
        return new[] { (int)perSeat, (int)pooled };
    }
}` }
  ],
  ['How would budgets per person interact with pooling?']));

practice.push(PC('Rework-Adjusted Net Value of a Pilot', 'Medium', ['productivity', 'rework'], ['Google', 'Meta'],
  `<p>Model a period's net value as <code>prs × value - defects × cost</code>. Write <code>better_period(pb, db, pa, da, value, cost)</code> returning <code>"before"</code>, <code>"after"</code> or <code>"tie"</code> by which period has the higher net value.</p>`,
  `<p>All inputs are non-negative integers up to 10<sup>6</sup>.</p>`,
  `<p>(120, 6, 156, 13, 100, 500): before 12000 − 3000 = 9000, after 15600 − 6500 = 9100 → ${H.c('g', '"after"')}. With cost 600: 8400 vs 7800 → ${H.c('r', '"before"')}.</p>`,
  `<p>Comparing PR counts alone always says "after" when output rises, even if rework eats the gain.</p>`,
  `def better_period(pb, db, pa, da, value, cost):
    return "after" if pa > pb else "before" if pb > pa else "tie"`,
  mc('The verdict flips when defect cost rises from 500 to 600. What does that mean?', ['The model is broken', 'The decision is sensitive to defect cost; estimate it carefully', 'Ignore defects', 'Always choose after'], 1, 'Sensitivity tells you which input matters most.'),
  hs('compute net value for both periods.', 'compare with less-than and greater-than; equal values mean a tie.', 'use integers to keep ties exact.'),
  `<p>Compute both net values and compare. The point of the exercise is that quality cost can reverse a speed gain.</p>`,
  `def better_period(pb, db, pa, da, value, cost):
    """Which period has more value after subtracting defect rework cost."""
    net_before = pb * value - db * cost
    net_after = pa * value - da * cost
    if net_after > net_before:
        return "after"
    if net_before > net_after:
        return "before"
    return "tie"`,
  `<p>O(1) time and O(1) extra space: a fixed number of comparisons.</p>`,
  { sig: 'int int int int int int -> string', fn: 'betterPeriod', cases: [
    [[120, 6, 156, 13, 100, 500], 'after'], [[120, 6, 156, 13, 100, 600], 'before'], [[10, 0, 10, 0, 5, 5], 'tie'],
    [[100, 10, 100, 0, 1, 1], 'after'], [[0, 0, 0, 0, 1, 1], 'tie'], [[50, 1, 60, 3, 10, 50], 'tie'], [[10, 0, 5, 0, 1, 0], 'before']
  ] },
  [
    { lang: 'java', code: `class Solution {
    public String betterPeriod(int pb, int db, int pa, int da, int value, int cost) {
        long netBefore = (long) pb * value - (long) db * cost;   // value minus rework
        long netAfter = (long) pa * value - (long) da * cost;
        if (netAfter > netBefore) return "after";
        if (netBefore > netAfter) return "before";
        return "tie";
    }
}` },
    { lang: 'js', code: `function betterPeriod(pb, db, pa, da, value, cost) {
  const netBefore = pb * value - db * cost;   // value minus rework
  const netAfter = pa * value - da * cost;
  if (netAfter > netBefore) return "after";
  if (netBefore > netAfter) return "before";
  return "tie";
}` },
    { lang: 'cpp', code: `class Solution {
public:
    string betterPeriod(int pb, int db, int pa, int da, int value, int cost) {
        long long netBefore = (long long)pb * value - (long long)db * cost;   // value minus rework
        long long netAfter = (long long)pa * value - (long long)da * cost;
        if (netAfter > netBefore) return "after";
        if (netBefore > netAfter) return "before";
        return "tie";
    }
};` },
    { lang: 'csharp', code: `public class Solution {
    public string BetterPeriod(int pb, int db, int pa, int da, int value, int cost) {
        long netBefore = (long)pb * value - (long)db * cost;   // value minus rework
        long netAfter = (long)pa * value - (long)da * cost;
        if (netAfter > netBefore) return "after";
        if (netBefore > netAfter) return "before";
        return "tie";
    }
}` }
  ],
  ['How would you estimate cost per defect?']));

practice.push(P('Clarify the Interview Tool Rules', 'Medium', ['interviews', 'integrity'], ['Meta', 'Amazon', 'Shopify'],
  `<p>You have three rounds next week: a live coding screen, a take-home, and an "AI-enabled pairing" round. The invitation says nothing about tools except for the last one. Write the short message to the recruiter, and your plan for each round depending on the answers.</p>`,
  `<p>Key line: ${H.c('b', '"Which tools, if any, may I use in each round, and should I disclose usage?"')}</p>`,
  `<p>Assuming tools are fine because "everyone uses them" risks disqualification; assuming none are allowed in the AI-enabled round wastes the point of the round.</p>`,
  mc('The rules for the take-home are unclear and the recruiter has not replied. Safest choice?', ['Use any tool and say nothing', 'Follow a no-AI approach or disclose clearly what you used and how, and be ready to explain every line', 'Skip the take-home', 'Ask a friend'], 1, 'Transparency and understanding protect you either way.'),
  hs('ask about every round separately, and in writing.', 'ask whether to use your own tool or a provided one.', 'prepare for both outcomes with practice.'),
  `<p>Message: "Hi, thanks for the schedule. Could you confirm the tool rules for each round? 1) Live coding: may I use an AI assistant or only the editor? 2) Take-home: are AI tools allowed, and if so should I disclose how I used them? 3) AI-enabled pairing: will a tool be provided, or should I bring my own, and which ones are acceptable?" Plans. Live coding: if no AI, practise AI-off reps this week; think aloud, test by hand. Take-home: if allowed, keep a short decision log, write tests first, disclose tools in the README, be ready to explain every line; if not allowed, do it without. AI-enabled round: practise with the provided tool if known; plan to clarify, write tests, direct the tool in small steps, review and correct its output aloud, and explain. Never use a hidden assistant where tools are not allowed.</p>`,
  `<p>One message prevents the worst outcome.</p>`, ['What if the interviewer says something different from the recruiter?']));

practice.push(P('Set Up a Cloud Agent Sandbox Safely', 'Medium', ['cloud agents', 'security', 'setup'], ['GitHub', 'Google', 'Stripe'],
  `<p>Your team will let a cloud coding agent work on a backend repo from issues. Write the setup checklist: environment, secrets, network, permissions, review gates and budgets.</p>`,
  `<p>Core idea: ${H.c('g', 'the sandbox can build and test, but cannot touch production or merge on its own')}.</p>`,
  `<p>Giving the agent the same environment variables as production means one prompt injection away from a leak.</p>`,
  mc('What credentials should a cloud agent environment get?', ['Production database password', 'Only a scoped token for its own branch/PR, plus test-only fake secrets', 'Admin token', 'All developer tokens'], 1, 'Least privilege: give only what the task needs.'),
  hs('it must install dependencies and run tests unattended.', 'least privilege: what is the minimum it needs?', 'its output must go through the same gates as humans.'),
  `<p>Checklist. Environment: a setup script that installs dependencies from lockfiles; tests runnable with one command; test databases or containers instead of shared ones. Secrets: none from production; fake test credentials only; a repo token scoped to push branches and open PRs. Network: allow-list package registries and docs; block everything else by default to limit prompt-injection exfiltration. Permissions: cannot push to main; branch protection with required checks and human review; code owners on sensitive paths. Instructions: repo instruction file with commands and rules. Budgets: per-run and monthly limits, default model chosen by admin. Audit: keep run logs. Trial: start with low-risk issue labels (tests, docs, deps) and expand once PR quality is proven.</p>`,
  `<p>An afternoon of setup; reliable runs after.</p>`, ['How do you handle issues written by outside users?']));

practice.push(P('Write a Team AI Policy for a Regulated Fintech', 'Hard', ['policy', 'governance', 'privacy'], ['Stripe', 'JPMorgan', 'Revolut'],
  `<p>A 150-engineer fintech handles card data and personal data. Engineers already use various AI tools on personal accounts. Write the policy: data classes and allowed tool tiers, approved tools and how they get approved, enterprise controls, rules for cloud agents, code review requirements, incident handling, training and how the policy is updated.</p>`,
  `<p>Principle: ${H.c('b', 'approve capabilities and data paths, not brand names; enforce with settings, not only words')}.</p>`,
  `<p>A blanket ban drives use underground; a free-for-all leaks regulated data. Both fail.</p>`,
  mc('Engineers use personal accounts today. Best first move?', ['Ignore it', 'Provide an approved enterprise option quickly, then require it, with clear data rules', 'Fire them', 'Ban all AI forever'], 1, 'Give a safe path, then close the unsafe one.'),
  hs('start with data classes and their minimum tool tier.', 'list the controls you will turn on and who owns them.', 'add incident, training, and review-date sections.'),
  `<p>Policy. 1) Scope and purpose: safe, productive use of AI coding tools. 2) Data classes: public, internal, confidential (fraud rules, pricing), regulated (card data, personal data), secrets. Minimum tiers: internal needs an approved business plan; confidential needs the enterprise tier with no training, reduced retention and audit logs; regulated data never goes into prompts unless a specific approved, contractually covered setup exists (default: no); secrets never. 3) Approved tools: a short list maintained by a platform team after security and legal review (data terms, sub-processors, regions, DPA, SSO, audit export, model allow-list, content exclusion). Personal accounts are not allowed for company code once the approved tool is available. 4) Controls: SSO and provisioning; allowed models only; content exclusions for card-data services; cloud agent enabled only on approved repos; budgets. 5) Cloud agents: sandbox with no production secrets, network allow-list, scoped tokens, PRs only. 6) Review: all AI-assisted code follows normal review; code owners for payments and auth; tests required. 7) Incidents: leaked secret or data → rotate immediately, report within hours, blameless review. 8) Training: one-hour onboarding plus a yearly refresher. 9) Ownership and review: platform plus security own it; reviewed every six months or when a vendor changes terms. Product names live in an appendix that is updated monthly.</p>`,
  `<p>Two pages plus an appendix.</p>`, ['How do you measure compliance without spying on prompts?', 'What exceptions process do you allow?']));

practice.push(P('Design a Fair Productivity Pilot', 'Hard', ['measurement', 'experiment design'], ['Google', 'Microsoft', 'Meta'],
  `<p>Leadership wants to know whether a cloud coding agent is worth enterprise-wide spend. Design a 6-week evaluation: groups, metrics (speed, quality, cost, people), data sources, confounders, decision rule, and how you will report mixed results.</p>`,
  `<p>Decision rule example: ${H.c('g', 'adopt if lead time improves ≥ 10% with no rise in change-failure rate and cost per merged PR within budget')}.</p>`,
  `<p>Giving the tool to volunteers and asking how they feel measures enthusiasm, not productivity (perception can even point the wrong way).</p>`,
  mc('Why not use "percent of code written by AI" as the success metric?', ['It is hard to compute', 'It measures activity, not delivery or quality, and is easy to inflate', 'It is always 100%', 'It is illegal'], 1, 'Outcomes beat activity.'),
  hs('compare like with like: baseline plus a control group.', 'pick a balanced set of metrics with fixed definitions.', 'write the decision rule before you see the data.'),
  `<p>Design. Groups: four comparable teams; two get the agent at week 0, two at week 6 (staggered rollout gives a control and later fairness); or randomise eligible tickets within teams. Baseline: 6 weeks of history for every team. Metrics: speed (lead time first commit to production, PR cycle and review-wait time), throughput (merged PRs per engineer-week, tickets closed), quality (change-failure rate, reverts, escaped defects per 100 PRs), cost (tool spend per merged PR, reviewer hours per PR), people (short survey at weeks 0 and 6 on friction and trust). Data: git host API, CI, incident tracker, billing export. Confounders: launches, holidays, staffing changes, ticket mix; record them and compare ticket types. Decision rule set in advance. Reporting: show all metrics, including bad ones, with confidence caveats; if mixed (faster but more defects), recommend a fix (review capacity, test requirements) and a second phase rather than a yes/no. Share with engineers; never rank individuals.</p>`,
  `<p>Six weeks, four teams, one honest page.</p>`, ['How would you include async agent PRs that nobody reviewed yet?', 'How do you avoid the Hawthorne effect?']));

practice.push(P('Plan a Vendor Switch Without Lock-In Pain', 'Hard', ['lock-in', 'migration', 'standards'], ['Atlassian', 'Shopify'],
  `<p>Your company used one AI coding tool for a year. Pricing changed and a different vendor now fits better. Engineers have custom rules, prompts and integrations scattered in the old tool's settings. Plan the switch and the changes that make the next switch cheap.</p>`,
  `<p>Goal: ${H.c('b', 'move knowledge into the repo and open interfaces')}.</p>`,
  `<p>Cutting over on a Monday loses every rule and integration and causes a productivity dip that gets blamed on the new tool.</p>`,
  mc('Which asset survives a tool switch best?', ['Rules in the old tool\'s settings UI', 'Instruction files, specs and tests in the repo plus MCP servers', 'Chat history', 'Personal snippets'], 1, 'Repo files and open protocols are portable.'),
  hs('inventory where team knowledge lives today.', 'move it into repo files and MCP servers before switching.', 'run both tools in parallel for a short overlap, then cut over.'),
  `<p>Plan. 1) Inventory: rules files, custom instructions, prompt snippets, integrations (issue tracker, docs, CI hooks), admin settings (exclusions, models, budgets). 2) Normalise: one repo instruction file (for example AGENTS.md) with commands and rules; tool-specific files only point to it. Integrations as MCP servers usable by many tools. Specs and tests in the repo. 3) Pilot the new tool with two teams for 2-3 weeks using the same files; measure lead time, defects and spend against the baseline. 4) Configure enterprise controls before wide rollout: SSO, model allow-list, exclusions, budgets, audit export. 5) Overlap: both tools available for a month; office hours and a short guide. 6) Cut over: remove old licences, archive old settings, update the policy appendix. 7) Next time: a yearly review, contract exit terms checked, no critical workflow that only works in one vendor's UI.</p>`,
  `<p>One quarter end to end.</p>`, ['What if one team refuses to switch?']));

practice.push(P('Tool Strategy for a 200-Person AWS Shop With Mixed Editors', 'Hard', ['tool selection', 'enterprise', 'ecosystem'], ['Amazon', 'Netflix', 'Capital One'],
  `<p>200 engineers, infrastructure on AWS, code on GitHub, 55% VS Code, 40% JetBrains IDEs, 5% Vim/terminal. Some services handle personal data. Leadership wants "one AI tool". Write a recommendation: whether one tool is right, gates, candidate shortlist by category, pilot, cost model and governance.</p>`,
  `<p>Likely answer: ${H.c('y', 'one primary assistant for everyone, plus an approved agent surface for terminal users and heavy users, under one policy')}.</p>`,
  `<p>Forcing everyone into one editor-bound tool loses the JetBrains and terminal users, or forces an editor migration that costs months.</p>`,
  mc('Strongest argument against exactly one tool?', ['Tools are cheap', 'No single tool fits every editor and workflow equally; one policy can govern a small approved set', 'Vendors prefer it', 'It is illegal'], 1, 'Standardise the policy, not necessarily the tool.'),
  hs('gates: data terms for personal data, SSO, audit, editor coverage.', 'categories: IDE assistant, terminal agent, cloud agent; ecosystem: GitHub and AWS.', 'pilot by category with real tickets; pooled budgets.'),
  `<p>Recommendation: standardise on <b>one policy and a small approved set</b>, not one product. Gates: enterprise data terms (no training, retention options, DPA), SSO and provisioning, audit logs, model allow-list, content exclusion for personal-data services, support for VS Code and JetBrains. Shortlist by category: (1) primary IDE assistant covering both editors, with GitHub-native cloud agent and PR review (for example GitHub Copilot), versus JetBrains AI with Junie for the JetBrains-heavy teams; (2) AWS-centred option (Kiro) evaluated for infrastructure teams because of its AWS integration; (3) one terminal agent (Claude Code, Codex or Gemini CLI) for terminal users and CI automation. Pilot: 4-6 weeks, two teams per category, real tickets, measure lead time, change-failure rate, review time and spend per merged PR. Cost: enterprise seats with pooled usage and budgets; usage-based billing for CI agents. Governance: platform team owns the approved list and settings; security reviews providers; policy appendix lists products and is reviewed quarterly. Lock-in: shared AGENTS.md-style instructions and MCP servers. Check current vendor pages for features and pricing before final purchase.</p>`,
  `<p>One quarter to decide; yearly review.</p>`, ['How would you handle a team that wants a tool not on the list?', 'What would make you consolidate to one tool later?']));

// =====================================================================
quiz.push(mc('Which "level of help" opens a pull request from a remote sandbox while you do other work?', ['Inline completion', 'Chat', 'Cloud / background agent', 'Linter'], 2, 'Cloud agents run remotely and deliver a branch or PR.'));
quiz.push(mc('Which task is the best fit for an asynchronous agent?', ['Choosing a database for a new product', 'Upgrading a library across a service where the test suite defines done', 'Debugging an unexplained production outage', 'Deciding refund rounding rules'], 1, 'Clear, checkable, low-judgment work suits async.'));
quiz.push(mc('A seat costs 30 units a month; pay-as-you-go costs 0.5 per task. Within the allowance, from how many tasks is the seat no more expensive?', ['15', '30', '60', '600'], 2, '30 ÷ 0.5 = 60 tasks.'));
quiz.push(mc('Why did many teams\' AI bills jump after enabling agent features?', ['Completions became paid', 'Agent runs make many model calls with long contexts, consuming far more usage than completions', 'Seats doubled', 'Taxes'], 1, 'Agents loop: read files, call tools, retry.'));
quiz.push(mc('Which control does NOT mainly address data privacy?', ['No-training contract terms', 'Retention settings', 'Content exclusion for sensitive paths', 'A dark editor theme'], 3, 'The others limit where code goes and how long it is kept.'));
quiz.push(mc('In a weighted decision matrix, a tool fails a must-have gate but has the highest score. What should happen?', ['It wins', 'It is excluded', 'Its weight doubles', 'Re-run until it passes'], 1, 'Gates rule tools out regardless of score.'));
quiz.push(mc('Why agree on weights before scoring tools?', ['It is faster', 'So weights are not tuned afterwards to favour someone\'s preferred tool', 'Vendors require it', 'Weights do not matter'], 1, 'Pre-commitment protects the decision from bias.'));
quiz.push(mc('What best reduces lock-in to one AI coding vendor?', ['Store rules only in the vendor settings UI', 'Keep instructions, specs and tests in repo files and integrations behind MCP servers', 'Use only one model', 'Avoid tests'], 1, 'Portable files and open protocols survive switching.'));
quiz.push(mc('An AI reviewer comments "approved" on a PR. Under good practice, the PR is...', ['Ready to merge', 'Still waiting for a human approval under branch protection', 'Auto-merged', 'Closed'], 1, 'AI review is a hint; a person approves.'));
quiz.push(mc('In METR\'s 2025 randomised study of experienced open-source developers on their own repos, what happened with early-2025 AI tools?', ['They were about 50% faster', 'They took longer on average, while believing they were faster', 'No one used the tools', 'Defects fell to zero'], 1, 'The gap between perception and measurement is the lesson.'));
quiz.push(mc('Which is an outcome metric rather than an activity metric?', ['Suggestion acceptance rate', 'Lines of code generated', 'Change-failure rate', 'Number of prompts'], 2, 'It measures what happened in production.'));
quiz.push(mc('Throughput rose 30% but defects per 100 PRs nearly doubled. The honest verdict is...', ['Clear win', 'Mixed: estimate rework cost and fix review/testing before scaling', 'Clear loss', 'Not measurable'], 1, 'Speed and quality moved in opposite directions.'));
quiz.push(mc('The invitation for a live coding round says nothing about AI tools. What should you do?', ['Use one quietly', 'Ask the recruiter which tools are allowed in each round', 'Assume anything goes', 'Decline the interview'], 1, 'Rules differ per company and per round; ask in writing.'));

// =====================================================================
function iv(level, q, a, followUps) { interview.push({ q: q, a: a, level: level, followUps: followUps }); }
iv('B', 'How would you compare AI coding tools without just listing brands?',
  `<p>I compare them along a stable frame: the level of help (completion, chat, local agent, cloud agent), the surface (IDE, terminal, cloud), sync vs async support, the cost model (seat, included usage, credits or pure usage), data handling (training, retention, sub-processors), enterprise controls (SSO, audit logs, model allow-list, exclusions), model choice, and ecosystem fit (GitHub, JetBrains, AWS, Google). Then I test the shortlist on our own repo, because harness quality on real code matters more than a feature list, and I check current vendor pages because products change monthly.</p>`,
  ['Which dimension matters most for your current team?', 'How do you keep the comparison current?']);
iv('B', 'What is the difference between synchronous and asynchronous coding agents, and when do you use each?',
  `<p>Synchronous means I watch and steer as the agent works, in my editor or terminal; misunderstandings cost seconds. Asynchronous means I hand off a task to a background or cloud agent and review a branch or PR later; misunderstandings cost a whole run. So I use async for well-specified, test-checkable, low-risk, reversible work such as dependency bumps or test backfills, and sync for ambiguous, design-heavy, risky or exploratory work such as debugging production issues or money logic. Async only helps if I have review capacity when the PRs land.</p>`,
  ['How many async tasks do you run at once?', 'What makes a task card async-ready?']);
iv('I', 'Terminal agent, IDE agent or cloud agent: how do you choose the surface?',
  `<p>IDE agents are best when I want inline diffs, quick navigation and visual changes. Terminal agents work with any editor, compose with git and shell tools, script easily and run headless in CI or over SSH. Cloud agents run in a clean sandbox, scale to parallel tasks and do not tie up my machine, but they need a working environment setup, scoped credentials and precise specs. In practice I choose timing (sync vs async) from the task first, then the surface where I review most effectively; many vendors now offer all three.</p>`,
  ['What does a cloud agent need from your repo to work well?', 'How do you run agents in CI safely?']);
iv('I', 'Explain the pricing models for AI coding tools and how you would estimate a team\'s cost.',
  `<p>The shapes are per-seat subscriptions, seats with included usage plus overage or throttling, credits or usage billed at model rates, pure API usage (often bring-your-own-key), and pooled team usage with admin budgets. Completions are usually cheap or unlimited; chat and especially agent runs consume most usage, and premium models cost more per call. To estimate, I run a short pilot, export usage per person and task type, and fit each pricing model to that real, skewed distribution, including overage and CI automation. I compare cost per merged PR, not sticker price, and set budgets and alerts. I always check current pricing pages because they change.</p>`,
  ['How do you compute a break-even point?', 'When is pooling worth it?']);
iv('I', 'What would you check about privacy and data retention before your team adopts an AI coding tool?',
  `<p>Five things, on the exact plan we would buy: whether code and prompts are used for training; how long prompts, outputs and cloud-agent workspaces are retained and whether reduced or zero retention is available; which model providers and regions process the data (sub-processors); which admin controls exist (SSO, provisioning, model allow-list, content exclusions, feature toggles, budgets, audit logs); and legal cover (DPA, certifications, IP indemnity conditions). Then I map our data classes to allowed tiers: secrets never, regulated data only in specifically approved setups, confidential code only on enterprise terms.</p>`,
  ['How do cloud agents change the risk?', 'What do you do if someone pastes a secret?']);
iv('I', 'How would you run a tool selection for a team of 30 engineers?',
  `<p>First the gates: data terms that fit our data classes, SSO and audit if required, and support for the editors people use. Then agree weighted criteria before scoring: quality on our repo, workflow and ecosystem fit, cost at our usage, admin controls, model choice, learning curve. Run a 2-4 week pilot of two or three finalists on real tickets with similar teams, collecting lead time, review time, defects, spend and a short survey. Score with that evidence, do a sensitivity check on the weights, write a one-page decision with a re-evaluation date, and keep instructions in repo files and MCP servers so a future switch is cheap.</p>`,
  ['What if two tools tie?', 'Would you allow more than one tool?']);
iv('A', 'Walk me through your workflow from a vague ticket to a merged PR using several AI tools.',
  `<p>I use a chat assistant to list ambiguities in the ticket, decide them myself and write a spec with acceptance tests in the repo. A local agent proposes a plan; I split it into a hard slice and mechanical slices. I work the hard slice synchronously with small diffs, and send the mechanical slices to cloud agents with precise task cards, one branch each. Everything goes through the same CI and an optional AI reviewer whose comments I treat as hints. A human approves under branch protection and code owners. Finally, any mistake an agent repeated becomes a rule in the shared instruction file or a lint check. The common ground across tools is the repo and the pull request.</p>`,
  ['What do you do when an async PR comes back wrong?', 'How do you keep instruction files consistent across tools?']);
iv('A', 'How do you measure whether AI coding tools actually improve productivity?',
  `<p>I measure outcomes at team level with a baseline and, ideally, a comparison group: lead time and PR cycle time, throughput, quality (change-failure rate, reverts, escaped defects per merged PR), cost per merged PR including review hours, and a short developer survey. I fix definitions and the decision rule before looking at data, watch for confounders such as launches and holidays, and never use acceptance rate or lines generated as the headline. Evidence matters because perception can mislead: in METR's 2025 randomised study, experienced developers on their own repos were slower with early-2025 tools yet felt faster.</p>`,
  ['How do you report a mixed result?', 'Why not rank individuals by AI usage?']);
iv('I', 'What does the research say about AI and developer productivity?',
  `<p>It is mixed and depends on context. Controlled tasks and greenfield or boilerplate work often show speed-ups. METR's 2025 randomised trial with experienced open-source maintainers on mature repos found they took about 19% longer with early-2025 tools while believing they were faster; METR's later follow-up suggested newer tools may help but said the size was hard to measure. Industry research such as DORA's reports links AI adoption to higher individual output and satisfaction but warns that delivery stability can suffer without strong testing and review. My takeaway: read study setups, and measure your own team.</p>`,
  ['Why might experienced developers be slower?', 'What would you change in your team after reading this?']);
iv('B', 'What are the rules about using AI tools in interviews, and how do you handle them?',
  `<p>They vary by company and by round, and they change, so I ask the recruiter in writing for each round. Commonly, live coding and phone screens forbid assistants, take-homes vary and often require disclosure, and some companies run AI-enabled rounds where using a provided tool is expected and they grade how I clarify, direct, verify and explain. I never use a hidden assistant where it is not allowed; that is cheating and can cost the offer. When tools are allowed I narrate, test and can explain every line.</p>`,
  ['How do you prepare for an AI-enabled round?', 'What if rules differ between the recruiter and interviewer?']);
iv('A', 'Design an AI-tool policy for a company that handles regulated data.',
  `<p>I define data classes (public, internal, confidential, regulated, secrets) and map each to a minimum approved tool tier, with secrets never allowed and regulated data excluded unless a specifically approved setup exists. A platform team keeps a short approved-tool list after security and legal review of training terms, retention, sub-processors and controls. Enterprise settings enforce it: SSO, model allow-list, content exclusions, cloud agents only on approved repos with no production secrets and network allow-lists, budgets and audit logs. All AI-assisted code follows normal review with code owners. Incidents mean rotate first, report fast, blameless review. Training at onboarding, and a six-monthly policy review.</p>`,
  ['How do you stop use of personal accounts?', 'How do you handle a new model release?']);
iv('E', 'Leadership asks you to standardise the whole engineering org on one AI coding tool. How do you respond?',
  `<p>I would agree to standardise the <b>policy, controls and measurement</b>, and argue for a small approved set of tools rather than exactly one, unless one tool clearly covers all our editors, workflows and data requirements. I would run gated, weighted selection with pilots per category (IDE assistant, terminal agent, cloud agent), measure lead time, quality and cost per merged PR, and present the trade-offs: one tool simplifies procurement and support, while forcing editor migrations or losing terminal users costs productivity. To keep options open I would invest in portable assets: repo instruction files, MCP integrations, tests and specs, plus contract exit terms and a yearly review, because this market changes monthly.</p>`,
  ['What evidence would change your mind toward one tool?', 'How do you manage vendor risk?']);

registerModule({
  id: 'ai32',
  title: 'AI Tools: Coding Assistants Compared & Building Your Workflow',
  langExplain: `<p>The small models in this module (cost calculators, decision matrix, policy checker, productivity comparison) are about decisions, not language features. Tested solutions are available in Python, Java, JavaScript, C++ and C#; the explanations and examples use Python. Each is a few lines of arithmetic and comparisons that translate directly to any language.</p>`,
  intro: `<p>The last lesson of the AI Tools section steps back from individual products. You will compare <b>GitHub Copilot, Cursor, Windsurf, JetBrains AI (with Junie) and Amazon's Kiro</b> alongside <b>Claude Code, Codex and Gemini CLI / Jules</b> at the level that survives monthly product churn: <b>terminal vs IDE vs cloud agents</b>, <b>synchronous vs asynchronous</b> work, <b>cost models</b>, <b>privacy and enterprise controls</b>, <b>model choice and ecosystem</b>. Then you will build a gated, weighted decision for yourself and a team, wire several tools into one <b>spec-to-merged-PR</b> workflow, <b>measure</b> whether it actually helps (and read the evidence honestly), and learn how tool rules work in <b>interviews</b>. Products, plans and prices change monthly: every fact here is a starting point to check against the vendor's current pages.</p>`,
  goals: [
    'Place any AI coding product on a stable map: level of help, surface, sync/async, cost model, data handling, model choice, ecosystem',
    'Decide whether a task should run synchronously or be delegated to a background/cloud agent',
    'Compare seat, included-usage, credit and pay-as-you-go pricing with a break-even calculation',
    'Write a data-class policy and the vendor questions on training, retention and admin controls',
    'Run a gated, weighted tool selection with a pilot for yourself or a team',
    'Design a multi-tool daily workflow from spec to merged PR, measure productivity with outcome metrics, and follow interview tool rules'
  ],
  prereqs: `<p>Finish ai16 (AI-Augmented Software Engineering) and at least two of the tool lessons in this section (Claude Code, OpenAI Codex). Basic Python for the small calculators.</p>`,
  hours: 8,
  topics: topics,
  practice: practice,
  quiz: quiz,
  interview: interview
});
})();
